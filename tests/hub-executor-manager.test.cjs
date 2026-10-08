// Real manager transports and the sealed service over disposable in-memory nodes.
// Closing a manager removes every browser executor; only player RPCs advance state.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), { webcrypto } = require('node:crypto');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const games = { ...require('../runtime/story-executor.cjs').adapters, ...require('../runtime/party-executor.cjs').adapters };
const clone = value => value == null ? null : structuredClone(value);
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
function fixture(t, game, { readiness = null } = {}) {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]), versions = new Map(), listeners = new Map();
  const snapshot = path => ({ val: () => clone(values.get(path)) });
  const put = (path, value) => {
    values.set(path, clone(value)); versions.set(path, (versions.get(path) || 0) + 1);
    for (const fn of listeners.get(path) || []) queueMicrotask(() => fn(snapshot(path)));
  };
  const db = { ref(path) { return { key: path.split('/').at(-1), once: async () => snapshot(path),
    on(event, fn) { if (!listeners.has(path)) listeners.set(path, new Set()); listeners.get(path).add(fn); queueMicrotask(() => fn(snapshot(path))); },
    off(event, fn) { listeners.get(path)?.delete(fn); },
    async transaction(update) { const next = update(clone(values.get(path))); if (next === undefined) return { committed: false, snapshot: snapshot(path) }; put(path, next); return { committed: true, snapshot: snapshot(path) }; }
  }; } };
  const databaseFetch = async (url, input = {}) => {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, ''), etag = '"' + (versions.get(path) || 0) + '"';
    if (!input.method || input.method === 'GET') return new Response(JSON.stringify(clone(values.get(path))), { headers: { etag } });
    assert.equal(input.method, 'PUT');
    const expected = new Headers(input.headers).get('if-match');
    if (expected && expected !== etag) return new Response('null', { status: 412 });
    const next = JSON.parse(input.body); put(path, next); return new Response(JSON.stringify(next));
  };
  const extras = {}, tokens = ['1'.repeat(20), '2'.repeat(20), '3'.repeat(20)], calls = [], statuses = [], managers = [];
  const room = { code: 'MGR234', count: 3, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref('rooms/MGR234/players/' + tokens[i]) };
  tokens.forEach((token, i) => { const path = 'rooms/MGR234/players/' + token; put(path, { game: 'scene', round: 1, playerNum: i + 1 }); db.ref(path).on('value', node => { room.answers[i + 1] = node.val(); }); });
  let clock = Date.now(), nextPulseFailure = null;
  class FixtureDate extends Date { static now() { return clock; } }
  const service = createExecutor({ secret: '56'.repeat(32), databaseURL: 'http://localhost', fetchImpl: databaseFetch, now: () => clock, games });
  const context = vm.createContext({ crypto: webcrypto, Date: FixtureDate, Promise, AbortSignal, URL, Response, TextEncoder, TextDecoder, Uint8Array, Uint32Array, btoa, atob, structuredClone,
    document: { hidden: false, documentElement: { lang: 'en' }, getElementById: () => null, addEventListener() {} },
    window: { addEventListener() {} }, setInterval: () => 1, clearInterval() {},
    async fetch(url, input = {}) {
      if (new URL(url).pathname !== '/api/hub-executor') return databaseFetch(url, input);
      if (!input.method) { if (readiness) await readiness; return new Response(JSON.stringify({ ready: true })); }
      const body = JSON.parse(input.body); calls.push(body);
      if (body.operation === 'execute' && !body.command && nextPulseFailure) {
        const code = nextPulseFailure; nextPulseFailure = null;
        return new Response(JSON.stringify({ error: code }), { status: code === 'game_switched' ? 409 : 503 });
      }
      try { return new Response(JSON.stringify(await service[body.operation](body))); }
      catch (error) { return new Response(JSON.stringify({ error: error.code || error.message }), { status: error.status || 500 }); }
    }
  });
  const scripts = game === 'letstalk' ? ['talk-crazy.js', 'talk-engine.js', 'talk-sync.js'] : ['cut-config.js', 'cut-random.js', 'cut-topics.js', 'cut-engine.js', 'cut-sync.js'];
  for (const file of [...scripts, 'hub-executor.js']) vm.runInContext(fs.readFileSync(require.resolve('../' + file), 'utf8'), context);
  context.HUB_EXECUTOR.install();
  const key = game === 'letstalk' ? 'talk' : 'cut', Host = context[game === 'letstalk' ? 'TALK_SYNC' : 'CUT_SYNC'].Host;
  const manager = () => { const host = new Host({ room, db, onChange() {}, onStatus: status => statuses.push(status) }); managers.push(host); host.connect(); return host; };
  const card = num => clone(values.get('rooms/MGR234/players/' + tokens[num - 1]));
  const playerCommand = async (num, type, extra = {}) => { const current = card(num); return service.execute({ capsule: current.hubExecutor.capsule, token: tokens[num - 1],
    command: { id: webcrypto.randomUUID(), type, sessionId: current[key].sessionId, turnId: current[key].turnId, ...extra } }); };
  const state = host => games[game].decode(values.get('rooms/MGR234/players/' + host.ref.key));
  const assertIndependent = host => {
    assert.equal(host.own, false); assert.equal(host.doc.executor.v, 1); assert.equal(statuses.at(-1), 'ready');
    for (let n = 1; n <= 3; n++) { const view = card(n); assert.equal(view[key].sharedControls, true); assert.equal(view.hubExecutor.capsule, host.doc.executor.capsule);
      assert.ok(!JSON.stringify(view).includes(JSON.stringify(host.ref.key)), 'private card must not receive the manager credential'); }
  };
  t.after(() => managers.forEach(host => host.close()));
  return { context, manager, service, calls, statuses, card, state, playerCommand, assertIndependent, game, now: () => clock, setClock: value => { clock = value; }, failNextPulse: code => { nextPulseFailure = code; } };
}

test('Talk manager schedules queued missions independently and players continue after it closes', async t => {
  const f = fixture(t, 'letstalk'), host = f.manager(); await flush(); assert.equal(host.own, true);
  await host.start({ topic: { id: 'manager-topic', question: 'What makes a welcoming place?', followUps: ['Who would visit?'] },
    mode: 'think', seconds: 120, showStarters: true, gameMode: 'crazy', crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 9 });
  await f.context.HUB_EXECUTOR.ensureHost(host, 'letstalk'); await flush(); f.assertIndependent(host);
  assert.equal(f.card(2).talk.crazy.minSeconds, 5); assert.equal(f.card(2).talk.crazy.maxSeconds, 9);
  await f.playerCommand(2, 'crazyAssign', { target: 3, text: 'Report the conversation like a weather presenter.', kind: 'task' });
  assert.equal(f.state(host).crazy.queue.length, 1); assert.equal(f.card(2).talk.crazy.myQueuedCount, 1);
  assert.equal(f.card(3).talk.crazy.prompt, null, 'submitting a mission queues it during preparation');
  await host.command('start'); assert.equal(f.state(host).phase, 'talking');
  assert.ok(Object.values(f.state(host).crazy.nextAt).every(at => at >= f.now() + 5000 && at <= f.now() + 9000));
  await host.command('crazySend');
  assert.equal(Object.keys(f.state(host).crazy.prompts).length, 0, 'legacy send redraws timers without bulk delivery');
  const publicView = f.context.TALK_ENGINE.view(f.state(host), 0, f.now()).talk;
  assert.equal(publicView.crazy.prompt, null); assert.equal(publicView.crazy.queue, undefined);
  assert.equal(publicView.actions.crazySend, false);
  await host.command('crazyPause', { paused: true });
  await f.playerCommand(2, 'crazyAssign', { text: 'Give a serious advertisement for an imaginary umbrella.', kind: 'task' });
  assert.equal(f.state(host).crazy.queue.length, 2, 'paused delivery still accepts player submissions');
  const session = f.state(host).sessionId, registerCount = f.calls.filter(call => call.operation === 'register').length;
  host.close();
  f.setClock(Math.max(...Object.values(f.state(host).crazy.nextAt)) + 1000);
  await f.playerCommand(2, 'starters', { show: false });
  assert.equal(f.card(3).talk.showStarters, false);
  assert.equal(f.card(3).talk.crazy.prompt, null, 'a paused clock does not deliver overdue missions');
  await f.playerCommand(2, 'crazyPause', { paused: false });
  f.setClock(f.state(host).crazy.nextAt[3] + 1);
  await f.playerCommand(2, 'starters', { show: false });
  assert.equal(f.card(3).talk.crazy.prompt.text, 'Report the conversation like a weather presenter.');
  assert.equal(f.card(3).talk.crazy.prompt.source, 'player');
  assert.equal(Object.values(f.state(host).crazy.prompts).filter(prompt => prompt.status === 'pending').length, 1);
  assert.equal(f.state(host).crazy.queue.length, 1);
  assert.equal(f.card(2).talk.crazy.myQueuedCount, 1);
  for (const num of [1, 2]) assert.ok(!JSON.stringify(f.card(num)).includes('Report the conversation like a weather presenter.'));
  const reopened = f.manager(); await flush(); f.assertIndependent(reopened); assert.equal(f.state(reopened).sessionId, session);
  await reopened.command('extend', { text: 'Which small detail would make people feel included?' });
  assert.equal(f.card(2).talk.topic.followUp, 'Which small detail would make people feel included?');
  assert.equal(f.calls.filter(call => call.operation === 'register').length, registerCount, 'reconnect keeps the existing server epoch');
  assert.equal(f.state(reopened).sharedControls, true); assert.equal(reopened.own, false);
});

test('CUT original manager can open and control a server-owned game, then resume player-paused play after reconnect', async t => {
  const f = fixture(t, 'cut'), host = f.manager(); await flush(); assert.equal(host.own, true);
  await host.start({ speed: 'custom', category: 'mixed', customMinSeconds: 5, customMaxSeconds: 5 });
  await f.context.HUB_EXECUTOR.ensureHost(host, 'cut'); await flush(); f.assertIndependent(host);
  await host.command('settings'); await host.command('configure', { speed: 'custom', category: 'mixed', customMinSeconds: 8, customMaxSeconds: 8 });
  await host.command('begin'); assert.equal(f.state(host).phase, 'countdown');
  const session = f.state(host).sessionId, registerCount = f.calls.filter(call => call.operation === 'register').length;
  host.close(); await f.playerCommand(3, 'pause'); assert.equal(f.card(2).cut.phase, 'paused');
  const reopened = f.manager(); await flush(); f.assertIndependent(reopened); assert.equal(f.state(reopened).sessionId, session);
  await reopened.command('resume'); assert.equal(f.card(3).cut.phase, 'countdown');
  await reopened.command('stop'); assert.equal(f.card(2).cut.phase, 'stopped'); assert.equal(f.card(2).cut.cutsCompleted, 0);
  await reopened.command('restart'); assert.equal(f.card(3).cut.phase, 'ready'); assert.equal(f.card(3).cut.cutsCompleted, 0);
  assert.equal(f.calls.filter(call => call.operation === 'register').length, registerCount); assert.equal(reopened.own, false);
});


test('the original manager start waits for available service registration before reporting the game open', async t => {
  let release; const readiness = new Promise(resolve => { release = resolve; });
  const f = fixture(t, 'cut', { readiness }), host = f.manager(); await flush();
  let finished = false; const starting = host.start({ speed: 'normal', category: 'mixed' }).then(value => { finished = true; return value; });
  try {
    await flush(); assert.equal(finished, false, 'the management page must not finish opening while independent execution is still pending');
    release(); await starting; await flush(); f.assertIndependent(host);
    assert.equal(f.calls.filter(call => call.operation === 'register').length, 1);
    host.close(); await f.playerCommand(2, 'begin'); assert.equal(f.card(3).cut.phase, 'countdown');
  } finally { release(); await starting; }
});


for (const game of ['letstalk', 'cut']) {
  test(game + ' reconnect marks ready only after a successful pulse and preserves switched status', async t => {
    const f = fixture(t, game), host = f.manager(); await flush();
    await host.start(game === 'letstalk'
      ? { topic: { id: 'reconnect-topic', question: 'What would you invent?' }, mode: 'think', seconds: 45 }
      : { speed: 'normal', category: 'mixed' });
    await f.context.HUB_EXECUTOR.ensureHost(host, game); await flush(); f.assertIndependent(host);
    host.close(); const priorStatuses = f.statuses.length;
    f.failNextPulse('executor_unavailable');
    const reopened = f.manager(); await flush();
    assert.ok(!f.statuses.slice(priorStatuses).includes('ready'), 'failed initial pulse cannot report readiness');
    assert.equal(reopened.suspended, false); assert.equal(reopened.own, false);
    await reopened.renew(); f.assertIndependent(reopened);
    f.failNextPulse('game_switched'); await reopened.renew();
    assert.equal(reopened.suspended, true); assert.equal(f.statuses.at(-1), 'switched');
    await reopened.renew();
    assert.equal(f.statuses.at(-1), 'switched', 'later successful pulses cannot reactivate a switched manager');
  });
}
