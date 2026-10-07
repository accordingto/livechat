'use strict';
/* Real Firebase ETag transactions with the shipped CUT host module. Each card
 * reads its own original bearer node. Only newly allocated QA nodes are used. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { webcrypto, randomBytes, randomInt } = require('node:crypto');
const app = path.resolve(__dirname, '..');
const output = path.resolve(process.env.CUT_QA_OUTPUT || path.join(app, '../../outputs/cut-live-verification.json'));
const config = fs.readFileSync(path.join(app, 'firebase-config.js'), 'utf8');
const url = config.match(/databaseURL\s*:\s*["'](https:\/\/[^"']+)["']/)?.[1];
if (!url || !/^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)$/.test(url)) throw new Error('Missing public Firebase URL');
const report = { transport: 'Real Firebase REST ETag transactions; shipped CUT_SYNC and CUT_ENGINE; independent original-seat reads', checks: [], startedAt: new Date().toISOString(), cleanup: {}, limitations: ['Browser visuals and spoken conversation are checked separately. This verifies host authority and real Firebase synchronization.'] };
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snapshot = value => ({ val: () => clone(value) });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const allocated = new Set(), subscriptions = new Set(), extra = {};
let host, second, replacement, code, tokens;
function check(name, action) { action(); report.checks.push({ name, passed: true }); console.log('PASS ' + name); }
async function request(node, method = 'GET', data, headers = {}) {
  const response = await fetch(url + '/' + node + '.json', { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15000) });
  if (!response.ok && response.status !== 412) throw new Error('Firebase HTTP ' + response.status);
  return response;
}
function database() {
  const tails = new Map();
  return { ref(node) {
    return { on(event, callback, onError) {
      if (node.startsWith('.info/')) { queueMicrotask(() => callback(snapshot(node === '.info/connected' ? true : 0))); return; }
      let running = false, closed = false, last = null;
      const pump = async () => {
        if (running || closed) return; running = true;
        try { const value = await (await request(node)).json(), text = JSON.stringify(value); if (!closed && text !== last) { last = text; callback(snapshot(value)); } }
        catch (error) { if (!closed) onError?.(error); }
        finally { running = false; }
      };
      const timer = setInterval(pump, 200); const sub = { node, callback, close() { closed = true; clearInterval(timer); subscriptions.delete(sub); } };
      subscriptions.add(sub); pump();
    }, off(event, callback) { for (const sub of [...subscriptions]) if (sub.node === node && sub.callback === callback) sub.close(); },
    transaction(update) {
      const task = (tails.get(node) || Promise.resolve()).then(async () => {
        for (let retry = 0; retry < 12; retry++) {
          const read = await request(node, 'GET', undefined, { 'X-Firebase-ETag': 'true' }); const before = await read.json();
          const value = update(clone(before));
          if (value === undefined) return { committed: false, snapshot: snapshot(before) };
          const write = await request(node, 'PUT', value, { 'if-match': read.headers.get('etag') });
          if (write.status === 412) continue;
          return { committed: true, snapshot: snapshot(await write.json()) };
        }
        throw new Error('Too many concurrent retries');
      });
      tails.set(node, task.catch(() => {})); return task;
    } };
  } };
}
function device(db, room) {
  const context = vm.createContext({ crypto: webcrypto, Date, console, setInterval, clearInterval });
  for (const file of ['cut-config.js', 'cut-random.js', 'cut-topics.js', 'cut-engine.js', 'cut-sync.js']) vm.runInContext(fs.readFileSync(path.join(app, file), 'utf8'), context, { filename: file });
  const client = new context.CUT_SYNC.Host({ db, room, onChange: value => { client.state = clone(value); }, onStatus: value => { client.qaStatus = value; } });
  return client;
}
async function until(predicate, label, limit = 20000) {
  const end = Date.now() + limit;
  while (Date.now() < end) { if (await predicate()) return; await sleep(100); }
  throw new Error('Timed out: ' + label);
}
async function cards() { return Promise.all(tokens.map(token => request('rooms/' + code + '/players/' + token).then(response => response.json()))); }
async function projectReady() { await until(async () => { const values = await cards(); return values.every(value => value?.cut?.sessionId === host.state?.sessionId && value.cut.turnId === host.state.turnId && value.cut.phase === host.state.phase); }, 'all original cards match authority'); return cards(); }
async function hostCommand(type, extra = {}) {
  const next = await host.command(type, extra);
  await until(() => host.state?.turnId === next.turnId && host.state?.phase === next.phase, 'host listener confirms ' + type);
  return next;
}
async function playerAction(db, index, type, extra = {}) {
  const state = host.state;
  const action = { ...extra, id: randomBytes(16).toString('hex'), type, sessionId: state.sessionId, turnId: state.turnId };
  const result = await db.ref('rooms/' + code + '/players/' + tokens[index]).transaction(current => {
    if (current?.game !== 'cut' || current.cut?.sessionId !== action.sessionId || current.cut?.turnId !== action.turnId) return;
    return { ...current, cutAction: action };
  });
  assert.ok(result.committed, 'original player action uses the current session and turn');
  return action;
}
async function main() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  tokens = Array.from({ length: 3 }, () => randomBytes(10).toString('hex')); extra.cutControlToken = randomBytes(16).toString('hex');
  for (const token of [...tokens, extra.cutControlToken]) {
    const node = 'rooms/' + code + '/players/' + token;
    assert.equal(await (await request(node)).json(), null, 'QA node must be empty'); allocated.add(node);
  }
  const db = database(), room = { code, count: 3, answers: {}, name: i => ['Amy', 'Ben', 'Chris'][i], getExtra: key => extra[key], setExtra: (key, value) => { extra[key] = value; }, playerRef: i => db.ref('rooms/' + code + '/players/' + tokens[i]) };
  host = device(db, room); host.connect(); await until(() => host.own, 'host lease');
  await host.start({ speed: 'normal', category: 'mixed' }); let values = await projectReady();
  check('Three original player links receive a waiting topic, first speaker and Start button', () => { assert.equal(new Set(values.map(value => value.cut.topic.id)).size, 1); assert.equal(new Set(values.map(value => value.cut.speaker)).size, 1); for (const value of values) { assert.equal(value.cut.phase, 'ready'); assert.equal(value.cut.canBegin, true); assert.equal(value.cut.phaseUntil, undefined); } });
  second = device(database(), room); second.connect(); await until(() => second.qaStatus === 'other_host', 'second host rejected');
  check('A second host cannot draw another CUT or start a conflicting session', () => assert.equal(second.own, false)); second.close();
  const waitingTurn = host.state.turnId; await sleep(4200);
  check('Revealing a topic never starts the countdown automatically', () => { assert.equal(host.state.phase, 'ready'); assert.equal(host.state.turnId, waitingTurn); assert.equal(host.state.deadline, null); });
  await Promise.all([playerAction(db, 0, 'begin'), playerAction(db, 1, 'begin')]);
  await until(() => host.state?.phase === 'countdown', 'player starts countdown');
  check('Concurrent player Start requests begin one countdown', () => { assert.equal(host.state.turnId, waitingTurn + 1); assert.equal(host.state.cutsCompleted, 0); });
  await until(() => host.state?.phase === 'speaking', 'initial GO'); values = await projectReady();
  check('Speaking projections hide the CUT deadline, duration and next player', () => { for (const value of values) { assert.equal(value.cut.deadline, undefined); assert.equal(value.cut.duration, undefined); assert.equal(value.cut.phaseUntil, undefined); assert.ok(!value.cut.nextSpeaker); assert.ok(!JSON.stringify(value).includes(extra.cutControlToken)); } });
  const firstSpeaker = host.state.speaker;
  await until(() => host.state?.phase === 'cut', 'real normal CUT', 20000); values = await projectReady();
  check('Normal timer CUT reveals one different next player to all clients', () => { assert.equal(new Set(values.map(value => value.cut.nextSpeaker)).size, 1); assert.notEqual(values[0].cut.nextSpeaker, firstSpeaker); assert.ok(values[0].cut.cutEvent); });
  const waitingCut = clone(host.state);
  await sleep(5000); values = await projectReady();
  check('CUT and the revealed next speaker stay visible until someone presses Start', () => {
    assert.equal(host.state.phase, 'cut'); assert.equal(host.state.turnId, waitingCut.turnId);
    assert.equal(host.state.nextSpeaker, waitingCut.nextSpeaker); assert.equal(host.state.deadline, null);
    assert.deepEqual(host.state.stats, waitingCut.stats);
    for (const value of values) { assert.equal(value.cut.canBegin, true); assert.equal(value.cut.phaseUntil, undefined); assert.equal(value.cut.nextSpeaker, waitingCut.nextSpeaker); }
  });
  await hostCommand('pause'); await projectReady(); const paused = clone(host.state);
  await sleep(600); check('Pause stops automatic transitions', () => { assert.equal(host.state.phase, 'paused'); assert.equal(host.state.turnId, paused.turnId); });
  await hostCommand('resume'); await projectReady();
  check('Resuming a paused CUT returns to manual waiting with the same next speaker', () => { assert.equal(host.state.phase, 'cut'); assert.equal(host.state.nextSpeaker, waitingCut.nextSpeaker); assert.equal(host.state.deadline, null); });
  const cutSession = host.state.sessionId;
  host.close(); await host.serial; await host.outgoing;
  replacement = device(database(), room); host = replacement; host.connect();
  await until(() => host.own && host.state?.sessionId === cutSession, 'replacement host restores waiting CUT');
  await projectReady();
  check('Reloading the host keeps CUT waiting without a countdown or new speaker draw', () => { assert.equal(host.state.phase, 'cut'); assert.equal(host.state.nextSpeaker, waitingCut.nextSpeaker); assert.equal(host.state.cutEvent.id, waitingCut.cutEvent.id); });
  const handoffTurn = host.state.turnId;
  await Promise.all([playerAction(db, 0, 'begin'), playerAction(db, 1, 'begin')]);
  await until(() => host.state?.phase === 'speaking', 'manual player handoff GO'); values = await projectReady();
  check('Concurrent player handoff Starts go directly to one speaking turn without a countdown', () => {
    assert.equal(host.state.turnId, handoffTurn + 1); assert.equal(host.state.speaker, waitingCut.nextSpeaker);
    assert.equal(host.state.speakerSequence, waitingCut.speakerSequence + 1);
    assert.ok(host.state.deadline > host.state.lastChangeAt);
    for (const value of values) { assert.equal(value.cut.phase, 'speaking'); assert.equal(value.cut.phaseUntil, undefined); }
  });
  const topicBeforeSettings = host.state.topic.id, countsBeforeSettings = clone(host.state.stats);
  await hostCommand('settings'); values = await projectReady();
  check('Returning to settings freezes the round and disables every player Start button', () => { assert.equal(host.state.phase, 'setup'); assert.equal(host.state.deadline, null); assert.equal(host.state.phaseUntil, null); assert.equal(host.state.topic.id, topicBeforeSettings); for (const value of values) assert.equal(value.cut.canBegin, false); });
  const blockedBegin = await playerAction(db, 2, 'begin');
  await until(() => host.state?.replies?.[3]?.id === blockedBegin.id, 'player Start rejected while editing');
  check('Players cannot start while the host is adjusting the pace', () => { assert.equal(host.state.phase, 'setup'); assert.equal(host.state.replies[3].error, 'not_available'); });
  await hostCommand('configure', { speed: 'chaos', category: 'mixed' }); values = await projectReady();
  check('Saving a new pace preserves the topic and fairness, then waits for Start', () => { assert.equal(host.state.phase, 'ready'); assert.equal(host.state.speed, 'chaos'); assert.equal(host.state.topic.id, topicBeforeSettings); assert.deepEqual(host.state.stats, countsBeforeSettings); });
  await sleep(3400); check('Saving settings does not automatically restart the countdown', () => assert.equal(host.state.phase, 'ready'));
  const savedSession = host.state.sessionId; host.close(); await host.serial; await host.outgoing;
  replacement = device(database(), room); host = replacement; host.connect(); await until(() => host.own && host.state?.sessionId === savedSession, 'replacement host restores saved round');
  check('Host reload restores the waiting topic and selected pace without starting it', () => { assert.equal(host.state.sessionId, savedSession); assert.equal(host.state.phase, 'ready'); assert.equal(host.state.speed, 'chaos'); assert.equal(host.state.topic.id, topicBeforeSettings); });
  await hostCommand('begin'); await until(() => host.state?.phase === 'speaking', 'host starts resumed topic');
  await hostCommand('exclude', { playerNum: host.state.speaker, active: false }); values = await projectReady();
  check('A departing speaker is replaced and waits for manual Start', () => { assert.equal(host.state.phase, 'ready'); assert.equal(values[0].cut.roster.filter(player => player.active).length, 2); });
  await hostCommand('begin');
  await until(() => host.state?.phase === 'speaking', 'replacement speaker manually starts');
  for (let turn = 0; turn < 10 && host.state?.phase !== 'break'; turn++) {
    await until(() => ['cut', 'break'].includes(host.state?.phase), 'next CUT in real round', 20000);
    if (host.state.phase === 'break') break;
    if (host.state.cutEvent?.final) { await until(() => host.state.phase === 'break', 'final CUT closes topic'); break; }
    await projectReady();
    const seat = host.state.roster.find(player => player.active).playerNum;
    await playerAction(db, seat - 1, 'begin');
    await until(() => host.state?.phase === 'speaking', 'player manually starts next segment');
  }
  values = await projectReady();
  check('Manual handoffs finish at the final CUT without a score or story summary', () => { assert.equal(values[0].cut.phase, 'break'); assert.equal(values[0].cut.score, undefined); assert.equal(values[0].cut.summary, undefined); });
  const previousTopic = host.state.topic.id; await hostCommand('next'); values = await projectReady();
  check('Manual Next reveals a new topic and waits for host or player Start', () => { assert.notEqual(host.state.topic.id, previousTopic); assert.equal(new Set(values.map(value => value.cut.topic.id)).size, 1); assert.equal(host.state.phase, 'ready'); });
  const changed = 'rooms/' + code + '/players/' + tokens[0]; await request(changed, 'PUT', { game: 'cardcheck', name: 'Amy', word: 'QA switch' });
  await until(() => host.suspended, 'game switch suspension'); await sleep(400);
  const switchedCard = await (await request(changed)).json();
  check('Old host timers cannot overwrite cards after switching games', () => assert.equal(switchedCard.game, 'cardcheck'));
}
(async () => {
  try { await main(); report.passed = true; }
  catch (error) { report.passed = false; report.error = error.stack; console.error(error.stack); process.exitCode = 1; }
  finally {
    host?.close(); second?.close(); replacement?.close(); await Promise.allSettled([host?.serial, host?.outgoing]);
    for (const sub of [...subscriptions]) sub.close(); await sleep(300);
    for (const node of allocated) { try { await request(node, 'DELETE'); report.cleanup[node.split('/').at(-1)] = true; } catch (error) { report.cleanup[node.split('/').at(-1)] = error.message; process.exitCode = 1; } }
    report.finishedAt = new Date().toISOString(); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log('CUT live checks: ' + report.checks.length + ', passed: ' + report.passed);
  }
})();
