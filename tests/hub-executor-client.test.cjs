// The actual helper runs in a browser-shaped sandbox with synthetic transport.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const source = fs.readFileSync(require.resolve('../hub-executor.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function sandbox(options = {}) {
  let time = 100000, uid = 0;
  const timers = [], events = {}, calls = [], elements = new Map();
  const document = { hidden: false, documentElement: { lang: 'en' },
    getElementById: id => elements.get(id), addEventListener: (name, fn) => { events[name] = fn; },
    createElement() { return { style: {}, append(button) { this.firstChild = button; }, remove() { elements.delete(this.id); } }; },
    body: { append(element) { elements.set(element.id, element); } } };
  const context = vm.createContext({ AbortSignal, Promise, console, document, TextEncoder, TextDecoder, btoa, atob, structuredClone,
    Date: class extends Date { static now() { return time; } },
    crypto: { subtle: crypto.subtle, getRandomValues: value => crypto.getRandomValues(value), randomUUID: () => 'test-request-' + ++uid },
    setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; }, clearInterval() {},
    window: { addEventListener(name, fn) { events[name] = fn; } },
    async fetch(url, input = {}) {
      const call = { url, method: input.method || 'GET', input, body: input.body && JSON.parse(input.body) }; calls.push(call);
      if (options.respond) return options.respond(call, context);
      return { ok: true, json: async () => call.method === 'GET' ? { ready: true } : { ok: true, capsule: 'sealed-capsule', payload: { viewJson: JSON.stringify({ room: 'ROOM', version: 2, privateCard: null }) } } };
    } });
  vm.runInContext(source, context);
  return { context, H: context.HUB_EXECUTOR, document, elements, timers, events, calls, advance: value => { time = value; },
    post: () => calls.filter(call => call.method === 'POST') };
}
function hosts(f) {
  // Inheritance follows Talk -> Dixit/Once. Originals intentionally call dynamic
  // this.change/project, as the production adapters do during bootstrap.
  vm.runInContext(`
    class BaseHost {
      constructor(game = 'letstalk') {
        this.game = game; this.stopped = false; this.connected = true; this.own = true; this.outgoing = Promise.resolve();
        this.room = { code: 'ROOM', count: 2, playerRef(i) { return { key: String(i + 1).repeat(32) }; } };
        this.ref = { key: 'a'.repeat(32) }; this.doc = { state: { sessionId: game + '-session', turnId: 1 } };
        this.local = []; this.onStatus = value => this.local.push('status:' + value);
      }
      project() { this.local.push('project:' + this.game); }
      async renew() { this.local.push('renew:' + this.game); this.own = true; }
      async change(fn) { this.doc.state = fn(this.doc.state); this.local.push('change:' + this.game); return this.doc.state; }
      async command(type) { this.local.push('command:' + type); return this.doc.state; }
      async start() { const result = await this.change(() => ({ sessionId: this.game + '-new-session', turnId: 1 })); this.project(); return result; }
      status(value) { this.onStatus(value); }
    }
    class DixitHost extends BaseHost { constructor() { super('dixit'); } project() { this.local.push('dixit-project'); } async start() { const state = await this.change(() => ({ sessionId: this.game + '-new-session', turnId: 1 })); this.project(); return state; } }
    class OnceHost extends BaseHost { constructor() { super('onceupon'); } project() { this.local.push('once-project'); } async start() { const state = await this.change(() => ({ sessionId: this.game + '-new-session', turnId: 1 })); this.project(); return state; } }
    class CutHost extends BaseHost { constructor() { super('cut'); } }
    class MicHost extends BaseHost { constructor() { super('openmic'); } }
    globalThis.TALK_SYNC = { Host: BaseHost }; globalThis.DIXIT_SYNC = { Host: DixitHost };
    globalThis.ONCE_SYNC = { Host: OnceHost }; globalThis.CUT_SYNC = { Host: CutHost }; globalThis.OPEN_MIC_SYNC = { Host: MicHost };
  `, f.context);
  f.H.install();
  return Object.fromEntries([['talk','TALK_SYNC'],['dixit','DIXIT_SYNC'],['once','ONCE_SYNC'],['cut','CUT_SYNC'],['mic','OPEN_MIC_SYNC']].map(([name, key]) => [name, f.context[key].Host]));
}
function bluff(f) {
  vm.runInContext(`
    class BluffClient {
      constructor(raw) { this.raw = raw; this.code = 'ROOM'; this.hostToken = 'a'.repeat(32); this.local = []; this.storage = { getItem: () => this.hostToken }; }
      _roomPath(path) { return '/rooms/bluffking-ROOM/' + path; }
      async _request(path) { this.local.push('read:' + path); return { data: this.raw }; }
      async _hostRefresh() { this.local.push('legacy-refresh'); return { room: this.code, version: 1 }; }
      async command(input) { this.local.push('legacy-command:' + input.action); return { legacy: true }; }
      async createFromCards() { this.local.push('legacy-connect'); return { connected: true }; }
      _emit(view) { this.lastView = view; this.local.push('emit'); return view; }
      async refresh() { return this._hostRefresh(); }
    }
    globalThis.BLUFF_SYNC = { Client: BluffClient };
  `, f.context);
  f.H.install(); return f.context.BLUFF_SYNC.Client;
}

test('an unavailable or unconfigured service leaves host projection and bootstrap usable', async () => {
  for (const unavailable of [false, true]) {
    const f = sandbox({ respond: call => ({ ok: !unavailable, json: async () => ({ ready: false, error: 'executor_not_configured' }) }) });
    const Host = hosts(f).cut, host = new Host();
    const started = await host.start(); await flush();
    assert.equal(started.sessionId, 'cut-new-session'); assert.equal(host.executorRegistering, undefined);
    assert.ok(host.local.some(value => value.startsWith('project'))); assert.equal(f.post().length, 0);
    await host.command('begin'); assert.ok(host.local.includes('command:begin'));
  }
});

test('child and common host prototypes install once and register their own game after bootstrap', async () => {
  const f = sandbox(), classes = hosts(f); f.H.install();
  // This checks inherited patched methods as well as concrete own methods.
  for (const [name, expected] of [['dixit','dixit'],['once','onceupon'],['cut','cut'],['mic','openmic'],['talk','letstalk']]) {
    const host = new classes[name](); await host.start(); await flush();
    const registrations = f.post().filter(call => call.body.operation === 'register' && call.body.sessionId === expected + '-new-session');
    assert.equal(registrations.length, 1, name + ' is registered exactly once'); assert.equal(registrations[0].body.game, expected);
    assert.equal(host.executorRegistering, false); assert.equal(host.doc.state.sessionId, expected + '-new-session');
  }
});

test('server host commands route directly with current fences even when browser own is false', async () => {
  const f = sandbox(), Host = hosts(f).cut, host = new Host();
  host.own = false; host.doc.executor = { v: 1, capsule: 'server-ticket' }; host.doc.state.phaseId = 'phase-one';
  await host.command('pause', { sessionId: 'forged-session', turnId: -1, marker: 'keep-me' });
  const sent = f.post().at(-1).body;
  assert.equal(sent.operation, 'execute'); assert.equal(sent.capsule, 'server-ticket'); assert.equal(sent.token, host.ref.key);
  assert.equal(sent.command.type, 'pause'); assert.equal(sent.command.sessionId, 'cut-session'); assert.equal(sent.command.turnId, 1); assert.equal(sent.command.phaseId, 'phase-one');
  assert.equal(sent.command.marker, 'keep-me'); assert.ok(!host.local.some(value => value.startsWith('command:')));
  const count = f.calls.length; await host.renew(); host.project(); assert.equal(f.calls.length, count + 1);
  assert.equal(f.post().filter(call => call.body.command).length, 1); assert.equal(f.post().filter(call => !call.body.command).length, 1);
  assert.ok(!host.local.some(value => value.startsWith('renew:')), 'server heartbeat never reclaims a browser lease');
  await assert.rejects(host.change(() => null), /not_available/);
  host.status('other_host'); assert.ok(host.local.includes('status:ready'));
});

test('restarting a server room releases it before dynamic local bootstrap and seals the new session afterward', async () => {
  const f = sandbox(), Host = hosts(f).cut, host = new Host(); host.doc.executor = { v: 1, capsule: 'old-ticket' }; host.own = false;
  const result = await host.start(); await flush();
  assert.equal(result.sessionId, 'cut-new-session'); assert.equal(host.own, true);
  const operations = f.post().map(call => call.body.operation);
  assert.deepEqual(operations, ['release', 'register']); assert.ok(host.local.includes('change:cut'));
});

test('failed registration backs off without blocking subsequent legacy host operations', async () => {
  const f = sandbox({ respond: call => ({ ok: call.method === 'GET', json: async () => call.method === 'GET' ? { ready: true } : { error: 'storage_unavailable' } }) });
  const Host = hosts(f).mic, host = new Host(); await host.start(); await flush();
  assert.equal(host.executorRegistering, false); assert.equal(f.post().length, 1); await host.command('success');
  host.project(); await flush(); assert.equal(f.post().length, 1); assert.ok(host.local.includes('command:success'));
  f.advance(160001); host.project(); await flush(); assert.equal(f.post().length, 2);
});

test('player presence pulses coalesce and recovery binds the displayed session, turn, and own token', async () => {
  const f = sandbox(), payload = { game: 'onceupon', once: { turnId: 7, phaseId: 'vote-2' },
    hubExecutor: { v: 1, game: 'onceupon', capsule: 'private-capsule', sessionId: 'story-one', absentNums: [1] } };
  f.H.observe(payload, 'player-token'); await flush();
  assert.equal(f.post().length, 1); assert.equal(f.post()[0].body.token, 'player-token');
  f.H.observe(payload, 'player-token'); await flush(); assert.equal(f.post().length, 1);
  await f.H.recover(); const recovery = f.post().at(-1).body;
  assert.equal(recovery.command.type, 'recover'); assert.equal(recovery.command.sessionId, 'story-one'); assert.equal(recovery.command.turnId, 7); assert.equal(recovery.command.phaseId, 'vote-2');
  assert.equal(recovery.token, 'player-token'); assert.equal(recovery.capsule, 'private-capsule');
  assert.equal(f.elements.get('hub-absence-controls').firstChild.disabled, undefined);
  f.advance(106000); f.timers[0].fn(); await flush(); assert.equal(f.post().length, 3);
  f.H.observe({ game: 'scene' }, 'player-token'); f.advance(112000); f.timers[0].fn(); await flush();
  assert.equal(f.post().length, 3); assert.equal(f.elements.size, 0);
});

test('visibility and network recovery pulse only the current game ticket, and local disconnect feedback does not change the fence', async () => {
  const f = sandbox(), data = { cut: { turnId: 3 }, hubExecutor: { v: 1, game: 'cut', capsule: 'old-game', sessionId: 'old-session', absentNums: [] } };
  f.H.observe(data, 'seat-two'); await flush();
  f.H.observe({ dixit: { turnId: 22 }, hubExecutor: { ...data.hubExecutor, game: 'dixit', capsule: 'new-game', sessionId: 'new-session' } }, 'seat-two');
  f.events.online(); await flush(); assert.equal(f.post().at(-1).body.capsule, 'new-game'); assert.equal(f.post().at(-1).body.turnId, 22);
  f.document.hidden = true; const count = f.post().length; f.events.visibilitychange(); await flush(); assert.equal(f.post().length, count);
  f.document.hidden = false; f.events.visibilitychange(); await flush(); assert.equal(f.post().at(-1).body.sessionId, 'new-session');
});

test('Bluff host reload uses the sealed executor directly and never resumes the legacy canonical writer', async () => {
  const f = sandbox(), Client = bluff(f), client = new Client({ executor: { v: 1, capsule: 'bluff-ticket' } });
  const view = await client.refresh(); assert.equal(view.privateCard, null); assert.equal(client.executorTicket.capsule, 'bluff-ticket');
  assert.ok(!client.local.includes('legacy-refresh')); assert.equal(f.post()[0].body.operation, 'execute');
  await client.command({ action: 'next', commandId: 'fixed-command' });
  assert.equal(f.post().at(-1).body.command.commandId, 'fixed-command'); assert.ok(!client.local.includes('legacy-command:next'));
});

test('Bluff registration installs its ticket before the first post-registration host click', async () => {
  const f = sandbox(), Client = bluff(f), raw = { data: JSON.stringify({ transport: { cardRoster: [{ token: '1'.repeat(32) }, { token: '2'.repeat(32) }] } }) };
  const client = new Client(raw); await client.refresh();
  assert.equal(client.executorTicket.capsule, 'sealed-capsule'); assert.equal(f.post()[0].body.operation, 'register');
  await client.command({ action: 'start', commandId: 'immediate-click' });
  assert.equal(f.post().at(-1).body.operation, 'execute'); assert.ok(!client.local.includes('legacy-command:start'));
});

test('Bluff reconnect releases an existing sealed session before replacing original seat links', async () => {
  const f = sandbox(), Client = bluff(f), client = new Client({ executor: { v: 1, capsule: 'old-bluff-ticket' } });
  client.executorTicket = { capsule: 'old-bluff-ticket', token: client.hostToken };
  const result = await client.createFromCards('ROOM', {});
  assert.equal(result.connected, true); assert.equal(f.post()[0].body.operation, 'release'); assert.equal(client.executorTicket, null);
  assert.ok(client.local.includes('legacy-connect'));
});


test('the real dynamically loaded Bluff transport is installed before UI constructs its Client', async () => {
  const ui = fs.readFileSync(require.resolve('../bluff-king-ui.js'), 'utf8');
  const boot = ui.slice(ui.indexOf('async function boot()'));
  assert.ok(boot.indexOf("await loadScript('bluff-king-sync.js") >= 0);
  assert.ok(boot.indexOf('HUB_EXECUTOR.install()') > boot.indexOf("await loadScript('bluff-king-sync.js"));
  assert.ok(boot.indexOf('new BLUFF_SYNC.Client') > boot.indexOf('HUB_EXECUTOR.install()'));
  const f = sandbox();
  f.H.install(); // The helper may be installed before the dynamic transport exists.
  vm.runInContext(fs.readFileSync(require.resolve('../bluff-king-sync.js'), 'utf8'), f.context);
  assert.equal(typeof f.context.BLUFF_SYNC.Client.prototype.createFromCards, 'function');
  assert.equal(f.context.BLUFF_SYNC.Client.prototype.connectCardRoster, undefined);
  f.H.install();
  const storage = new Map(), client = new f.context.BLUFF_SYNC.Client({ databaseURL: 'https://example.firebaseio.com',
    storage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } });
  client.code = 'ROOM'; client.isHost = true; client.hostToken = 'a'.repeat(32);
  client._request = async () => ({ data: { executor: { v: 1, capsule: 'actual-bluff-ticket' } } });
  const view = await client.refresh();
  assert.equal(view.privateCard, null); assert.equal(client.executorTicket.capsule, 'actual-bluff-ticket');
  assert.equal(f.post().at(-1).body.operation, 'execute');
});


test('server host renew coalesces API heartbeats without running browser renew or a registration loop', async () => {
  let resolve;
  const f = sandbox({ respond: () => new Promise(done => { resolve = done; }) });
  const Host = hosts(f).cut, host = new Host(); host.own = false; host.doc.executor = { v: 1, capsule: 'server-ticket' };
  const one = host.renew(); await host.renew(); host.project();
  assert.equal(f.post().length, 1); assert.equal(f.post()[0].body.operation, 'execute'); assert.equal(f.post()[0].body.command, undefined);
  assert.equal(host.executorPulsing, true); assert.equal(host.own, false);
  resolve({ ok: true, json: async () => ({ ok: true }) }); await one;
  assert.equal(host.executorPulsing, false); assert.equal(host.doc.executor.capsule, 'server-ticket');
  assert.ok(!host.local.some(value => value.startsWith('renew:')));
  host.connected = false; await host.renew(); host.connected = true; host.stopped = true; await host.renew();
  assert.equal(f.post().length, 1);
});

test('an adaptive clock driver polls at 500ms and returns to ordinary polling when the service relinquishes its role', async () => {
  let responses = 0;
  const f = sandbox({ respond: () => ({ ok: true, json: async () => ({ ok: true, pollAfterMs: ++responses === 1 ? 500 : 5000 }) }) });
  const payload = { cut: { turnId: 4 }, hubExecutor: { v: 1, game: 'cut', capsule: 'clock-driver', sessionId: 'cut-one' } };
  f.H.observe(payload, 'seat-two'); await flush(); assert.equal(f.post().length, 1); assert.equal(f.post()[0].body.clock, false);
  f.advance(100499); f.timers[0].fn(); await flush(); assert.equal(f.post().length, 1);
  f.advance(100500); f.timers[0].fn(); await flush(); assert.equal(f.post().length, 2); assert.equal(f.post()[1].body.clock, true);
  f.advance(101500); f.timers[0].fn(); await flush(); assert.equal(f.post().length, 2);
  f.advance(105500); f.timers[0].fn(); await flush(); assert.equal(f.post().length, 3); assert.equal(f.post()[2].body.clock, false);
  assert.doesNotMatch(JSON.stringify(f.post()), /deadline|speakingDurationMs/);
});

test('a newly written mailbox wakes immediately after an in-flight presence pulse and unchanged IDs never cause a wake loop', async () => {
  let first;
  const f = sandbox({ respond: call => {
    if (!first) return new Promise(resolve => { first = resolve; });
    return { ok: true, json: async () => ({ ok: true, pollAfterMs: 5000 }) };
  } });
  const payload = { cut: { turnId: 1 }, hubExecutor: { v: 1, game: 'cut', capsule: 'mailbox-ticket', sessionId: 'cut-one' } };
  f.H.observe(payload, 'seat-two'); await flush(); assert.equal(f.post().length, 1);
  const withCommand = { ...payload, cutAction: { id: 'new-command', type: 'begin', sessionId: 'cut-one', turnId: 1 } };
  f.H.observe(withCommand, 'seat-two'); await flush(); assert.equal(f.post().length, 1, 'current pulse stays single');
  first({ ok: true, json: async () => ({ ok: true, pollAfterMs: 5000 }) }); await flush();
  assert.equal(f.post().length, 2); assert.equal(f.post()[1].body.actionId, 'new-command');
  f.H.observe(withCommand, 'seat-two'); await flush(); assert.equal(f.post().length, 2);
  f.H.observe({ ...withCommand, cutAction: { ...withCommand.cutAction, id: 'next-command' } }, 'seat-two'); await flush();
  assert.equal(f.post().length, 3); assert.equal(f.post()[2].body.actionId, 'next-command');
});


test('Chat Wolf migration binds its actual encrypted channel seats and uses an existing server epoch without legacy takeover', async () => {
  const f = sandbox(), client = { host: { code: 'WOLF12', control: 'a'.repeat(64) } };
  const data = { cardLinks: [{ playerNum: 2, token: '2'.repeat(64) }, { playerNum: 1, token: '1'.repeat(64) }] };
  assert.equal(await f.H.registerWolf(client, { data: JSON.stringify(data) }), true);
  const registered = f.post().at(-1).body; assert.equal(registered.game, 'chatwolf');
  assert.deepEqual(registered.seats.map(s => s.playerNum), [1, 2]); assert.equal(registered.controlToken, client.host.control);
  assert.equal(client.executorRegistering, false);
  assert.equal(await f.H.registerWolf(client, { executor: { v: 1, capsule: 'wolf-epoch-ticket' } }), true);
  const pulse = f.post().at(-1).body; assert.equal(pulse.operation, 'execute'); assert.equal(pulse.capsule, 'wolf-epoch-ticket'); assert.equal(pulse.token, client.host.control);
});


test('a game-switched response retires the old card ticket and allows a new game to connect', async () => {
  const f = sandbox({ respond: call => ({ ok: call.body.capsule !== 'retired-game',
    json: async () => call.body.capsule === 'retired-game' ? { error: 'game_switched' } : { ok: true } }) });
  const old = { hubExecutor: { v: 1, game: 'cut', capsule: 'retired-game', sessionId: 'old-session', absentNums: [1] } };
  f.H.observe(old, 'own-seat'); await flush();
  assert.equal(f.post().length, 1); assert.equal(f.elements.size, 0);
  f.advance(106000); f.timers[0].fn(); f.events.online(); f.H.observe(old, 'own-seat'); await flush();
  assert.equal(f.post().length, 1, 'stale card updates cannot revive the retired game');
  f.H.observe({ hubExecutor: { ...old.hubExecutor, capsule: 'new-game', sessionId: 'new-session', absentNums: [] } }, 'own-seat');
  await flush(); assert.equal(f.post().length, 2); assert.equal(f.post().at(-1).body.capsule, 'new-game');
});

test('background storage failure retains the current card for retry and explicit recovery reports failure', async () => {
  let failing = true;
  const f = sandbox({ respond: () => ({ ok: !failing, json: async () => failing ? { error: 'storage_unavailable' } : { ok: true } }) });
  const card = { hubExecutor: { v: 1, game: 'dixit', capsule: 'retry-game', sessionId: 'same-session', absentNums: [1] } };
  f.H.observe(card, 'own-seat'); await flush();
  await assert.rejects(f.H.recover(), error => error.code === 'storage_unavailable');
  assert.ok(f.elements.has('hub-absence-controls'));
  failing = false; f.advance(106000); f.timers[0].fn(); await flush();
  assert.equal(f.post().at(-1).body.capsule, 'retry-game'); assert.equal(f.post().length, 3);
});


test('a newly published clock phase wakes every card immediately so the next driver does not wait five seconds', async () => {
  const f = sandbox(), ticket = { v: 1, game: 'dixit', capsule: 'reveal-wake', sessionId: 'dixit-one' };
  f.H.observe({ hubExecutor: ticket, dixit: { turnId: 5, phase: 'VOTE' } }, 'own-seat'); await flush();
  f.advance(100100);
  const revealing = { hubExecutor: ticket, dixit: { turnId: 5, phase: 'REVEALING', revealStage: 'countdown' } };
  f.H.observe(revealing, 'own-seat'); await flush();
  assert.equal(f.post().length, 2, 'phase publication wakes without waiting for the ordinary polling interval');
  f.H.observe(revealing, 'own-seat'); await flush(); assert.equal(f.post().length, 2);
  f.H.observe({ ...revealing, dixit: { ...revealing.dixit, revealStage: 'answer' } }, 'own-seat'); await flush();
  assert.equal(f.post().length, 3, 'answer-to-popular transition can keep the reveal clock moving');
});
