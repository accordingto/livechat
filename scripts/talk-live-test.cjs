'use strict';
// Opt-in maintenance test. It runs the shipped Talk host against real Firebase
// ETag transactions, with only fresh random private paths and synthetic seats.
// No room root is listed, overwritten or deleted. Never imported by the game.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomBytes } = require('node:crypto');
if (process.env.LETS_TALK_LIVE_TEST !== '1') throw new Error('Set LETS_TALK_LIVE_TEST=1 for a disposable real Firebase Talk test.');
const app = path.resolve(__dirname, '..');
const E = require('../talk-engine.js');
const config = fs.readFileSync(path.join(app, 'firebase-config.js'), 'utf8');
const baseURL = config.match(/databaseURL\s*:\s*["'](https:\/\/[^"']+)["']/)?.[1];
if (!baseURL || !/^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)$/.test(baseURL)) throw new Error('Missing public Firebase URL');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomCode = Array.from(randomBytes(8), byte => alphabet[byte % alphabet.length]).join('');
const controlToken = randomBytes(16).toString('hex');
const smokeMarker = randomBytes(16).toString('hex');
const tokens = Array.from({ length: 3 }, () => randomBytes(16).toString('hex'));
const paths = tokens.map(token => `rooms/${roomCode}/players/${token}`);
const controlPath = `rooms/${roomCode}/players/${controlToken}`;
const allowed = new Set([controlPath, ...paths]);
const written = new Set(), subscriptions = new Set(), hosts = [];
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snapshot = value => ({ val: () => clone(value) });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const checks = [];
let verifiedFresh = false, testClock = Date.now(), primary, database;
function check(label, fn) { fn(); checks.push(label); console.log('PASS ' + label); }
async function request(node, method = 'GET', body, etag) {
  if (!allowed.has(node)) throw new Error('Out-of-scope Firebase path');
  if (method !== 'GET' && !verifiedFresh) throw new Error('Fresh-node check required before writes');
  const headers = { 'Content-Type': 'application/json' };
  if (method === 'GET') headers['X-Firebase-ETag'] = 'true';
  if (etag) headers['if-match'] = etag;
  const response = await fetch(baseURL + '/' + node + '.json', { method, headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  if (response.status === 412) return { conflict: true };
  if (!response.ok) throw new Error('Firebase HTTP ' + response.status);
  if (method !== 'GET') written.add(node);
  const version = response.headers.get('etag');
  if (method === 'GET' && !version) throw new Error('Missing Firebase ETag');
  return { value: await response.json(), etag: version };
}
function makeDatabase() {
  const tails = new Map(), tasks = new Set();
  function tracked(work) { const promise = work(); tasks.add(promise); promise.finally(() => tasks.delete(promise)).catch(() => {}); return promise; }
  return { async flush() { while (tasks.size) await Promise.allSettled([...tasks]); },
    ref(node) {
      const info = node === '.info/connected' || node === '.info/serverTimeOffset';
      if (!info && !allowed.has(node)) throw new Error('Out-of-scope Firebase reference');
      return {
        on(event, callback, error) {
          assert.equal(event, 'value');
          if (info) { queueMicrotask(() => callback(snapshot(node === '.info/connected' ? true : 0))); return; }
          let closed = false, running = false, serialized;
          const pump = async () => {
            if (closed || running) return; running = true;
            try {
              const result = await request(node), text = JSON.stringify(result.value);
              if (!closed && text !== serialized) { serialized = text; callback(snapshot(result.value)); }
            } catch (failure) { if (!closed) error?.(failure); }
            finally { running = false; }
          };
          const timer = setInterval(() => tracked(pump), 200);
          const subscription = { node, callback, stop() { closed = true; clearInterval(timer); subscriptions.delete(subscription); } };
          subscriptions.add(subscription); tracked(pump);
        },
        off(event, callback) { for (const item of [...subscriptions]) if (item.node === node && item.callback === callback) item.stop(); },
        transaction(update) {
          if (info) return Promise.reject(new Error('Read-only Firebase info'));
          const task = (tails.get(node) || Promise.resolve()).then(() => tracked(async () => {
            for (let attempt = 0; attempt < 30; attempt++) {
              const before = await request(node);
              assert.ok(before.value === null && !written.has(node) || before.value?.qaSmoke?.marker === smokeMarker, 'Only this invocation owns the node');
              const updated = update(clone(before.value));
              if (updated === undefined) return { committed: false, snapshot: snapshot(before.value) };
              const next = updated == null ? null : { ...updated, qaSmoke: { marker: smokeMarker } };
              const write = await request(node, 'PUT', next, before.etag);
              if (write.conflict) { await delay(20); continue; }
              return { committed: true, snapshot: snapshot(write.value) };
            }
            throw new Error('Firebase transaction retry limit');
          }));
          tails.set(node, task.catch(() => {})); return task;
        },
      };
    },
  };
}
async function until(predicate, label, limit = 25000) {
  const deadline = Date.now() + limit;
  while (Date.now() < deadline) { if (await predicate()) return; await delay(100); }
  throw new Error('Timed out: ' + label);
}
async function card(seat) { return (await request(paths[seat - 1])).value; }
async function projected(host = primary) {
  await until(async () => {
    const values = await Promise.all([1, 2, 3].map(card));
    return values.every(value => value?.talk?.sessionId === host.doc?.state?.sessionId && value.talk.revision === host.doc.revision);
  }, 'all private projections match canonical revision');
  return Promise.all([1, 2, 3].map(card));
}
async function hostCommand(type, extra = {}) {
  const state = await primary.command(type, extra), replyId = state.replies?.[0]?.id;
  await until(() => primary.doc?.state?.replies?.[0]?.id === replyId, 'host listener confirms ' + type);
  return state;
}
async function openTopic(options) {
  const state = await primary.start(options);
  await until(() => primary.doc?.state?.sessionId === state.sessionId, 'host listener confirms new topic');
  return state;
}
async function playerAction(seat, type, extra = {}) {
  const data = await card(seat);
  const command = { ...extra, id: randomBytes(16).toString('hex'), type,
    sessionId: data.talk.sessionId, turnId: Object.hasOwn(extra, 'turnId') ? extra.turnId : data.talk.turnId };
  await database.ref(paths[seat - 1]).transaction(old => ({ ...old, talkAction: command }));
  await until(async () => (await card(seat))?.talk?.reply?.id === command.id, 'player action acknowledged');
  return { command, reply: (await card(seat)).talk.reply };
}
function host(room) {
  const context = vm.createContext({ crypto: webcrypto,
    Date: class extends Date { static now() { return testClock; } }, TALK_ENGINE: E, setInterval, clearInterval });
  vm.runInContext(fs.readFileSync(path.join(app, 'talk-sync.js'), 'utf8'), context, { filename: 'talk-sync.js' });
  const instance = new context.TALK_SYNC.Host({ room, db: database,
    onChange: value => { instance.latest = value; }, onStatus: value => { instance.lastStatus = value; } });
  hosts.push(instance); instance.connect(); return instance;
}
const topic = { id: 'talk-live-synthetic', title: 'Our small cafe', question: 'What would you sell in a small cafe?',
  followUps: [{ stage: 'custom', question: 'Who would be your first customer?' }] };
async function main() {
  const fresh = await Promise.all([...allowed].map(node => request(node)));
  assert.ok(fresh.every(result => result.value === null), 'Every exact synthetic path must be empty');
  verifiedFresh = true; database = makeDatabase();
  const extras = { letsTalkControlToken: controlToken };
  const room = { code: roomCode, count: 3, answers: {}, name: index => 'Talk QA ' + (index + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: index => database.ref(paths[index]) };
  paths.forEach((node, index) => database.ref(node).on('value', value => {
    room.answers[index + 1] = value.val(); hosts.forEach(instance => instance.receive(index + 1, value.val()));
  }));
  primary = host(room); await until(() => primary.own, 'first host lease');
  await openTopic({ topic, gameMode: 'crazy', gameSeconds: 900, crazyTaskSeconds: 30,
    crazyMinSeconds: 5, crazyMaxSeconds: 5, crazySource: 'system' });
  await projected(); await hostCommand('start');
  let values = await projected();
  check('Crazy mode keeps original private card paths and shared conversation state', () => {
    assert.ok(values.every(value => value.game === 'letstalk' && value.talk.crazy.enabled));
    assert.equal(new Set(values.map(value => value.talk.speaker)).size, 1);
    assert.ok(values.every(value => !JSON.stringify(value).includes(controlToken)));
  });
  const pendingCards = cards => cards.filter(value => value.talk.crazy?.prompt?.status === 'pending');
  async function advanceClock(milliseconds) {
    // Only this synthetic host clock advances; real Firebase ETags and leases
    // still arbitrate ownership. The actual shipped global timer runs below.
    testClock += milliseconds; await primary.renew();
    await until(() => primary.own && primary.doc.leaseUntil > testClock, 'renewed accelerated test lease');
    await primary.tickClock(); return projected();
  }
  values = await advanceClock(5000);
  await until(() => E.list(primary.doc?.state?.crazy?.prompts).filter(prompt => prompt.status === 'pending').length === 1, 'first global scheduled slot');
  values = await projected();
  check('One global scheduled slot delivers one private mission with a task deadline', () => {
    assert.equal(pendingCards(values).length, 1);
    const prompt = pendingCards(values)[0].talk.crazy.prompt;
    assert.equal(prompt.expiresAt - prompt.at, 30000);
    assert.ok(values.every(value => value.talk.crazy.nextAssignAt === testClock + 5000));
  });
  values = await advanceClock(5000);
  await until(() => E.list(primary.doc?.state?.crazy?.prompts).filter(prompt => prompt.status === 'pending').length === 2, 'second global scheduled slot');
  values = await projected();
  const activeBeforeCap = pendingCards(values).map(value => value.talk.crazy.prompt.id).sort();
  values = await advanceClock(5000);
  check('The global scheduler holds at two active missions', () => {
    assert.equal(pendingCards(values).length, 2);
    assert.deepEqual(pendingCards(values).map(value => value.talk.crazy.prompt.id).sort(), activeBeforeCap);
    assert.ok(values.every(value => E.list(value.talk.crazy.pendingPlayerNums).length === 2));
  });
  check('Every card contains only its own persisted funny mission', () => {
    const active = pendingCards(values);
    for (const value of values) for (const other of active) if (value.playerNum !== other.playerNum) {
      assert.ok(!JSON.stringify(value).includes(other.talk.crazy.prompt.id));
      assert.ok(!JSON.stringify(value).includes(tokens[other.playerNum - 1]));
    }
    const safeHost = E.view(primary.doc.state, 0, testClock).talk.crazy;
    assert.equal(safeHost.prompt, null); assert.equal(safeHost.prompts, undefined);
  });
  const firstCard = pendingCards(values)[0], otherCard = pendingCards(values)[1];
  const firstSeat = firstCard.playerNum, otherSeat = otherCard.playerNum;
  const firstPrompt = firstCard.talk.crazy.prompt, oldTurn = firstCard.talk.turnId;
  await hostCommand('end', { confirm: true }); await projected();
  const done = await playerAction(firstSeat, 'crazyDone', { promptId: firstPrompt.id, turnId: oldTurn, actor: firstSeat === 3 ? 1 : 3 });
  await projected();
  check('Done follows prompt identity across turns, binds the real seat and scores once', () => {
    assert.equal(done.reply.error, '');
    assert.equal(primary.doc.state.crazy.prompts[firstSeat].status, 'done');
    assert.equal(primary.doc.state.scores[firstSeat], 1);
  });
  const mismatch = await playerAction(otherSeat, 'crazyDone', { promptId: firstPrompt.id });
  check('A player cannot acknowledge another private prompt', () => assert.equal(mismatch.reply.error, 'stale_prompt'));
  const skip = await playerAction(otherSeat, 'crazySkip', { promptId: (await card(otherSeat)).talk.crazy.prompt.id });
  values = await projected();
  check('Skip immediately replaces the mission on another seat without awarding a point', () => {
    assert.equal(skip.reply.error, ''); assert.equal(primary.doc.state.scores[otherSeat], 0);
    assert.equal(primary.doc.state.crazy.prompts[otherSeat].status, 'skipped');
    assert.equal(pendingCards(values).length, 1);
    assert.notEqual(pendingCards(values)[0].playerNum, otherSeat);
  });
  const beforeLegacy = JSON.stringify(primary.doc.state.crazy.prompts);
  await hostCommand('crazySend'); values = await projected();
  check('Legacy Send never draws another immediate mission', () => assert.equal(JSON.stringify(primary.doc.state.crazy.prompts), beforeLegacy));
  values = await advanceClock(5000);
  check('The next timed slot fills the second available place', () => assert.equal(pendingCards(values).length, 2));
  await hostCommand('crazyPause', { paused: true }); values = await projected();
  const idsBeforePause = E.list(primary.doc.state.crazy.prompts).map(prompt => prompt.id).sort();
  values = await advanceClock(31000);
  check('Pause stops dispatch while task deadlines continue to expire', () => {
    assert.equal(primary.doc.state.crazy.paused, true);
    assert.equal(pendingCards(values).length, 0);
    assert.deepEqual(E.list(primary.doc.state.crazy.prompts).map(prompt => prompt.id).sort(), idsBeforePause);
    assert.ok(E.list(primary.doc.state.crazy.prompts).some(prompt => prompt.status === 'expired'));
    assert.equal(primary.doc.state.scores[firstSeat], 1);
  });
  await hostCommand('crazyPause', { paused: false }); await projected();
  const previousDeadline = primary.doc.state.gameDeadline;
  await hostCommand('addTime', { seconds: 60 });
  check('Adding one minute extends only the whole round deadline', () => assert.equal(primary.doc.state.gameDeadline, previousDeadline + 60000));
  const session = primary.doc.state.sessionId, prompts = clone(primary.doc.state.crazy.prompts);
  const contender = host(room); await until(() => contender.doc?.state, 'contending host restored state');
  check('Competing host cannot dispatch another set of lines', () => assert.equal(contender.own, false));
  await assert.rejects(contender.command('crazySend')); contender.close();
  primary.close(); await database.flush();
  primary = host(room); await until(() => primary.own && primary.doc?.state?.sessionId === session, 'replacement host lease');
  await projected();
  check('Host reload keeps current private assignments instead of drawing them again', () => assert.deepEqual(primary.doc.state.crazy.prompts, prompts));
  await openTopic({ topic: { ...topic, id: 'talk-live-normal' }, gameMode: 'normal', gameSeconds: 60 });
  values = await projected();
  check('Opening a new normal topic clears all old Crazy prompts', () => {
    assert.notEqual(primary.doc.state.sessionId, session);
    assert.ok(values.every(value => !value.talk.crazy?.enabled && !value.talk.crazy?.prompt));
    assert.ok(values.every(value => value.talkAction === undefined));
  });
  await hostCommand('start'); values = await advanceClock(60000);
  check('The actual host clock ends normal conversation after the whole round deadline', () => assert.ok(values.every(value => value.talk.phase === 'ended')));
  await database.ref(paths[0]).transaction(() => ({ game: 'cardcheck', name: 'Talk QA 1', word: 'Synthetic switch' }));
  await until(() => primary.suspended, 'old game suspended'); await primary.renew(); await delay(400);
  const switched = await card(1);
  check('Old Talk host cannot overwrite cards after another game takes over', () => assert.equal(switched.game, 'cardcheck'));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  hosts.forEach(instance => instance.close());
  for (const item of [...subscriptions]) item.stop();
  if (database) await database.flush();
  if (verifiedFresh) {
    let cleaned = 0, cleanupFailed = 0;
    // Check each exact node independently. A changed owner/version leaves
    // that node untouched while cleanup continues for the other owned nodes.
    for (const node of written) {
      try {
        assert.ok(allowed.has(node)); const old = await request(node);
        if (old.value === null) continue;
        assert.ok(old.value?.qaSmoke?.marker === smokeMarker, 'Cleanup ownership changed');
        const result = await request(node, 'DELETE', undefined, old.etag);
        assert.ok(!result.conflict, 'Cleanup ETag changed'); cleaned++;
      } catch (_) { cleanupFailed++; process.exitCode = 1; }
    }
    console.log('CLEANED ' + cleaned + ' exact disposable private paths.');
    if (cleanupFailed) console.error('Synthetic path cleanup left ' + cleanupFailed + ' changed or unavailable nodes untouched.');
  }
  console.log('Talk live checks: ' + checks.length + '; passed: ' + (process.exitCode !== 1));
});
