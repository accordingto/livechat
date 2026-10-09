// The real helper's Bluff import decision over a minimal, synthetic Client.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), { webcrypto } = require('node:crypto');
const source = fs.readFileSync(require.resolve('../hub-executor.js'), 'utf8');
const clone = value => value == null ? null : structuredClone(value);
function fixture({ readError = '', releaseError = false, connectError = null } = {}) {
  const code = 'ROOM', control = 'a'.repeat(64), trace = [], posts = [];
  const setup = { playerCount: 3, names: ['Amy', 'Amy', 'Bob'], tokens: ['1'.repeat(20), '2'.repeat(20), '3'.repeat(20)] };
  const prior = setup.tokens.map((originalToken, i) => ({ originalToken, name: setup.names[i], token: String(i + 4).repeat(64), identityId: String(i + 4).repeat(40), historyToken: String(i + 7).repeat(64) }));
  const state = { rooms: { ROOM: { phase: 'prepare', version: 12, members: prior.map(entry => ({ identityId: entry.identityId, name: entry.name })) } }, transport: { cardRoster: prior } };
  const originals = new Map(prior.map(entry => ['/rooms/ROOM/players/' + entry.originalToken, { game: 'bluffking', bluff: { version: 2, room: code, token: entry.token, identityId: entry.identityId, historyToken: entry.historyToken } }]));
  let raw = { data: JSON.stringify(state), executor: { v: 1, capsule: 'sealed-existing-epoch' } };
  const canonical = '/rooms/bluffking-ROOM/players/' + control;
  class Client {
    constructor() { this.storage = { getItem: key => key === 'icebreak.bluff.host.ROOM' ? control : null }; this.executorTicket = { capsule: raw.executor.capsule, token: control }; }
    async _request(path) { trace.push({ type: 'read', path }); if (readError === path) throw new Error('synthetic_read_failure'); return { data: path === canonical ? clone(raw) : clone(originals.get(path)) }; }
    async connect(room) { trace.push({ type: 'connect', room }); if (connectError) throw connectError; return { continued: true }; }
    async createFromCards(room, receivedSetup, options) { trace.push({ type: 'import', room, setup: receivedSetup, options, starting: this.executorStarting }); return { imported: true }; }
    async _hostRefresh() { return null; }
    async command() { return null; }
  }
  const context = vm.createContext({ crypto: webcrypto, Date, Promise, AbortSignal, structuredClone, BLUFF_SYNC: { Client },
    document: { hidden: false, documentElement: { lang: 'en' }, addEventListener() {}, getElementById: () => null },
    window: { addEventListener() {} }, setInterval: () => 1, clearInterval() {},
    async fetch(url, input = {}) { const body = input.body && JSON.parse(input.body); if (!body) return { ok: true, json: async () => ({ ready: true }) };
      posts.push(body); trace.push({ type: body.operation }); if (releaseError) return { ok: false, json: async () => ({ error: 'synthetic_release_failure' }) };
      if (body.operation === 'release') delete raw.executor; return { ok: true, json: async () => ({ ok: true, capsule: raw.executor?.capsule }) };
    }
  });
  vm.runInContext(source, context); context.HUB_EXECUTOR.install();
  const client = new Client(), save = () => { raw.data = JSON.stringify(state); };
  return { client, setup, state, prior, originals, posts, trace, save, canonical, raw: () => raw };
}
const imported = f => f.trace.find(item => item.type === 'import');
const released = f => f.posts.filter(item => item.operation === 'release');

test('the exact live roster and original private bindings reconnect without releasing the epoch or importing', async () => {
  const f = fixture(), before = clone(f.raw());
  const result = await f.client.createFromCards(' room ', f.setup, { restage: true });
  assert.equal(result.continued, true); assert.equal(imported(f), undefined); assert.equal(released(f).length, 0);
  assert.deepEqual(f.raw(), before); assert.deepEqual(f.trace.filter(item => item.type === 'connect'), [{ type: 'connect', room: 'ROOM' }]);
  assert.equal(f.client.executorStarting, false); assert.equal(f.client.executorTicket.capsule, before.executor.capsule);
});

test('changed names update the running membership without releasing or importing', async () => {
  for (const change of ['setup-name', 'entry-name', 'member-name']) {
    const f = fixture();
    if (change === 'setup-name') f.setup.names[1] = 'Changed';
    if (change === 'entry-name') { f.prior[1].name = 'Changed'; f.save(); }
    if (change === 'member-name') { f.state.rooms.ROOM.members[1].name = 'Changed'; f.save(); }
    await f.client.createFromCards('ROOM', f.setup);
    assert.equal(released(f).length, 0, change); assert.equal(imported(f), undefined, change); assert.equal(f.posts.filter(body => body.operation === 'updateRoster').length, 1); assert.equal(f.trace.some(item => item.type === 'connect'), true);
  }
});

test('appended count updates the live table; reordered or replacement seats keep the explicit switch path', async () => {
  for (const change of ['count', 'order', 'token']) {
    const f = fixture();
    if (change === 'count') { f.setup.playerCount = 4; f.setup.names.push('Fourth'); f.setup.tokens.push('9'.repeat(20)); }
    if (change === 'order') f.setup.tokens.reverse();
    if (change === 'token') f.setup.tokens[1] = '9'.repeat(20);
    await f.client.createFromCards('ROOM', f.setup);
    if (change === 'count') { assert.equal(released(f).length, 0); assert.equal(imported(f), undefined); assert.equal(f.posts[0].operation, 'updateRoster'); assert.equal(f.posts[0].roster.length, 4); assert.equal(f.posts[0].hubCount, 4); }
    else { assert.equal(released(f).length, 1, change); assert.ok(imported(f)); assert.ok(f.trace.findIndex(item => item.type === 'release') < f.trace.findIndex(item => item.type === 'import')); }
  }
});

test('all original private credential fields and the game marker must match before reconnect', async () => {
  for (const field of ['game', 'version', 'room', 'token', 'identityId', 'historyToken', 'missing']) {
    const f = fixture(), path = '/rooms/ROOM/players/' + f.setup.tokens[1], card = f.originals.get(path);
    if (field === 'game') card.game = 'cut';
    else if (field === 'missing') f.originals.delete(path);
    else card.bluff[field] = field === 'version' ? 1 : 'different-binding';
    await f.client.createFromCards('ROOM', f.setup);
    assert.equal(released(f).length, 1, field); assert.ok(imported(f), field);
  }
});

test('restaging forwards the exact setup and options objects after releasing the service once', async () => {
  const f = fixture(), options = { restage: true, deferPublish: true, expectedVersion: 12, marker: { keep: true } };
  f.setup.tokens[0] = '9'.repeat(20); await f.client.createFromCards(' room ', f.setup, options);
  const entry = imported(f); assert.strictEqual(entry.setup, f.setup); assert.strictEqual(entry.options, options); assert.equal(entry.room, ' room ');
  assert.equal(entry.starting, true); assert.equal(f.client.executorStarting, false); assert.equal(f.client.executorTicket, null);
  assert.deepEqual(released(f).map(body => body.operation), ['release']);
});

test('a failed canonical or original-card read never releases the service epoch or starts import', async () => {
  for (const readError of ['/rooms/bluffking-ROOM/players/' + 'a'.repeat(64), '/rooms/ROOM/players/' + '2'.repeat(20)]) {
    const f = fixture({ readError }), before = clone(f.raw());
    await assert.rejects(f.client.createFromCards('ROOM', f.setup), /synthetic_read_failure/);
    assert.equal(released(f).length, 0); assert.equal(imported(f), undefined); assert.deepEqual(f.raw(), before); assert.equal(f.client.executorStarting, false);
  }
});

test('a failed release blocks local import and retains the existing capability', async () => {
  const f = fixture({ releaseError: true }); f.setup.tokens[0] = '9'.repeat(20);
  await assert.rejects(f.client.createFromCards('ROOM', f.setup), /synthetic_release_failure/);
  assert.equal(released(f).length, 1); assert.equal(imported(f), undefined); assert.equal(f.raw().executor.capsule, 'sealed-existing-epoch');
  assert.equal(f.client.executorStarting, false);
});

test('an existing registration settles before any import decision reads or releases its epoch', async () => {
  const f = fixture(); let settle; f.client.executorPromise = new Promise(resolve => { settle = resolve; });
  const opening = f.client.createFromCards('ROOM', f.setup);
  await Promise.resolve(); await Promise.resolve(); assert.equal(f.trace.length, 0); assert.equal(f.client.executorStarting, true);
  settle(); await opening; assert.equal(released(f).length, 0); assert.equal(imported(f), undefined); assert.ok(f.trace.some(item => item.type === 'connect'));
});


test('only an explicit current-Hub reopen can repair a matching partial epoch; other connection errors never release it', async () => {
  for (const code of ['connection_error', 'stale_session', 'host_only', 'game_switched']) {
    for (const replaceActive of [false, true]) {
      const f = fixture({ connectError: Object.assign(new Error(code), { code }) });
      if (code === 'game_switched' && replaceActive) {
        await f.client.createFromCards('ROOM', f.setup, { replaceActive });
        assert.equal(released(f).length, 1); assert.ok(imported(f));
      } else {
        await assert.rejects(f.client.createFromCards('ROOM', f.setup, { replaceActive }), { code });
        assert.equal(released(f).length, 0); assert.equal(imported(f), undefined);
      }
    }
  }
});

test('a failed authoritative source reread aborts partial-epoch repair without releasing or importing', async () => {
  const f = fixture({ connectError: Object.assign(new Error('game_switched'), { code: 'game_switched' }) });
  const original = f.client._request.bind(f.client), path = '/rooms/ROOM/players/' + f.setup.tokens[0]; let reads = 0;
  f.client._request = async (...args) => { if (args[0] === path && ++reads === 2) throw new Error('repair_read_failed'); return original(...args); };
  await assert.rejects(f.client.createFromCards('ROOM', f.setup, { replaceActive: true }), /repair_read_failed/);
  assert.equal(released(f).length, 0); assert.equal(imported(f), undefined); assert.equal(f.client.executorStarting, false);
});

test('an unchanged table keeps its epoch when an explicitly away original card now belongs to another game', async () => {
  const f=fixture(); f.state.rooms.ROOM.members[1].active=false; f.save();
  const foreign={game:'scene',playerNum:2,round:100};f.originals.set('/rooms/ROOM/players/'+f.setup.tokens[1],foreign);
  const result=await f.client.createFromCards('ROOM',f.setup,{replaceActive:true});
  assert.equal(result.continued,true);assert.equal(released(f).length,0);assert.equal(imported(f),undefined);
  assert.deepEqual(f.originals.get('/rooms/ROOM/players/'+f.setup.tokens[1]),foreign);
});
