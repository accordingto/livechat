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
              const before = await request(node), next = update(clone(before.value));
              if (next === undefined) return { committed: false, snapshot: snapshot(before.value) };
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
  await openTopic({ topic, gameMode: 'crazy', crazySeconds: 60 });
  await projected();
  await hostCommand('start');
  let values = await projected();
  check('Crazy mode uses original private card paths and keeps normal conversation controls', () => {
    assert.ok(values.every(value => value.game === 'letstalk' && value.talk.crazy.enabled));
    assert.equal(new Set(values.map(value => value.talk.speaker)).size, 1);
    assert.ok(values.every(value => !JSON.stringify(value).includes(controlToken)));
  });
  // Only the clock exposed to this synthetic host moves. Canonical state,
  // production scheduler, Firebase leases and ETag transactions stay real.
  testClock += 91000; await primary.renew();
  await until(() => primary.own && primary.doc.leaseUntil > testClock, 'renewed accelerated test lease');
  await primary.tickCrazy();
  await until(() => E.list(primary.doc?.state?.crazy?.prompts).length === 3, 'automatic scheduled dispatch');
  values = await projected();
  check('The actual host scheduler automatically dispatches a line to every seat', () => {
    assert.ok(values.every(value => value.talk.crazy.prompt?.status === 'pending'));
    assert.ok(E.list(primary.doc.state.crazy.sequence).every(value => value === 1));
  });
  check('Each original card receives only its own persisted funny line', () => {
    assert.ok(values.every(value => value.talk.crazy.prompt?.id && value.talk.crazy.prompt?.text));
    for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++) if (i !== j) {
      assert.ok(!JSON.stringify(values[i]).includes(values[j].talk.crazy.prompt.id));
      assert.ok(!JSON.stringify(values[i]).includes(tokens[j]));
    }
    const safeHost = E.view(primary.doc.state, 0, testClock).talk.crazy;
    assert.equal(safeHost.prompt, null); assert.equal(safeHost.prompts, undefined);
  });
  const firstPrompt = values[0].talk.crazy.prompt, oldTurn = values[0].talk.turnId;
  await hostCommand('end', { confirm: true }); await projected();
  const done = await playerAction(1, 'crazyDone', { promptId: firstPrompt.id, turnId: oldTurn, actor: 3 });
  await projected();
  check('Done follows prompt identity across turns and cannot spoof another participant', () => {
    assert.equal(done.reply.error, '');
    assert.equal(primary.doc.state.crazy.prompts[1].status, 'done');
    assert.equal(primary.doc.state.crazy.prompts[3].status, 'pending');
  });
  const mismatch = await playerAction(2, 'crazyDone', { promptId: firstPrompt.id });
  check('A player cannot acknowledge another private prompt', () => assert.equal(mismatch.reply.error, 'stale_prompt'));
  await playerAction(2, 'crazySkip', { promptId: (await card(2)).talk.crazy.prompt.id });
  await playerAction(3, 'crazyDone', { promptId: (await card(3)).talk.crazy.prompt.id });
  await projected();
  await hostCommand('crazySend'); values = await projected();
  check('Host Send now draws new prompts only after the old prompts are explicitly resolved', () => {
    assert.ok(values.every(value => value.talk.crazy.prompt.status === 'pending'));
    assert.notEqual(values[0].talk.crazy.prompt.id, firstPrompt.id);
  });
  await hostCommand('crazyPause', { paused: true }); values = await projected();
  const assignmentsBeforePause = JSON.stringify(primary.doc.state.crazy.prompts);
  testClock += 65000; await primary.renew();
  await until(() => primary.own && primary.doc.leaseUntil > testClock, 'paused host lease renewed');
  await primary.tickCrazy(); await projected();
  check('Pause preserves pending prompts and stops timed dispatch', () => {
    assert.equal(primary.doc.state.crazy.paused, true);
    assert.equal(JSON.stringify(primary.doc.state.crazy.prompts), assignmentsBeforePause);
  });
  await hostCommand('crazyPause', { paused: false }); await projected();
  const session = primary.doc.state.sessionId, prompts = clone(primary.doc.state.crazy.prompts);
  const contender = host(room); await until(() => contender.doc?.state, 'contending host restored state');
  check('Competing host cannot dispatch another set of lines', () => assert.equal(contender.own, false));
  await assert.rejects(contender.command('crazySend')); contender.close();
  primary.close(); await database.flush();
  primary = host(room); await until(() => primary.own && primary.doc?.state?.sessionId === session, 'replacement host lease');
  await projected();
  check('Host reload keeps current private assignments instead of drawing them again', () => assert.deepEqual(primary.doc.state.crazy.prompts, prompts));
  await openTopic({ topic: { ...topic, id: 'talk-live-normal' }, gameMode: 'normal' });
  values = await projected();
  check('Opening a new normal topic clears all old Crazy prompts', () => {
    assert.notEqual(primary.doc.state.sessionId, session);
    assert.ok(values.every(value => !value.talk.crazy?.enabled && !value.talk.crazy?.prompt));
    assert.ok(values.every(value => value.talkAction === undefined));
  });
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
    try {
      // Only nodes freshly verified and actually written by this invocation.
      for (const node of written) { assert.ok(allowed.has(node)); await request(node, 'PUT', null); }
      assert.ok((await Promise.all([...written].map(node => request(node)))).every(result => result.value === null));
      console.log('CLEANED ' + written.size + ' exact disposable private paths.');
    } catch (error) { console.error('Synthetic path cleanup failed: ' + error.message); process.exitCode = 1; }
  }
  console.log('Talk live checks: ' + checks.length + '; passed: ' + (process.exitCode !== 1));
});
