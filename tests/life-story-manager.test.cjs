'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const { webcrypto } = require('node:crypto');
function fixture({ capability = false, ready = true, storageRecords = {}, databaseNodes = {} } = {}) {
  const calls = [], starts = [];
  const storage = new Map(Object.entries(storageRecords)), reads = [];
  class Host {
    constructor() { this.doc = { state: null }; this.room = {}; }
    project() {} renew() {} change() {} command() {} status() {}
    async start(input) { starts.push(input); return 'original-start'; }
  }
  const context = vm.createContext({ DIXIT_SYNC: { Host }, crypto: webcrypto, Date, AbortSignal, Promise, Response, URL,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    firebase: { database: () => ({ ref: key => ({ once: async () => { reads.push(key); return { val: () => databaseNodes[key] || null }; } }) }) },
    document: { addEventListener() {} }, window: { addEventListener() {} }, setInterval() {},
    async fetch(url, input = {}) { calls.push({ url, method: input.method || 'GET' }); return new Response(JSON.stringify({ ready, version: 1 }), { headers: capability ? { 'X-Icebreak-Life-Story': '1' } : {} }); }
  });
  vm.runInContext(fs.readFileSync(require.resolve('../hub-executor.js'), 'utf8'), context);
  context.HUB_EXECUTOR.install();
  return { host: new Host(), executor: context.HUB_EXECUTOR, calls, starts, reads };
}
test('life mode refuses old or unconfigured service before releasing/replacing an existing Hub game', async () => {
  for (const setup of [{ capability: false, ready: true }, { capability: true, ready: false }]) {
    const f = fixture(setup);
    f.host.doc = { state: { sessionId: 'existing-original', mode: 'classic' }, executor: { v: 1, capsule: 'existing-ticket' } };
    const before = structuredClone(f.host.doc);
    await assert.rejects(f.host.start({ mode: 'life_story' }), /life_story_server_required/);
    assert.deepEqual(f.host.doc, before); assert.equal(f.starts.length, 0);
    assert(f.calls.every(call => call.method === 'GET'), 'no release, register or game mutation request');
  }
});
test('new service capability is explicit and original Dixit still opens without the new capability', async () => {
  const enabled = fixture({ capability: true }); assert.equal(await enabled.executor.lifeStoryReady(), true);
  const original = fixture(); assert.equal(await original.host.start({ mode: 'classic' }), 'original-start');
  assert.equal(original.starts.length, 1); assert.equal(original.calls.length, 0);
});
test('Life Hub membership discovery reads only the safe control header and never a private seat', async () => {
  const code = 'SAFE24', token = 'a'.repeat(32), names = ['A','B','C'], tokens = [1,2,3].map(n=>String(n).repeat(20));
  const setup = { dixitMode: 'life_story', dixitControlToken: token, playerCount: 3, tokens, names };
  const key = `rooms/${code}/players/${token}`;
  const f = fixture({ storageRecords: { ['room-session-' + code]: JSON.stringify(setup) }, databaseNodes: {
    [key]: { state: { mode: 'life_story', sessionId: 'safe-session', roster: names.map((name,i)=>({playerNum:i+1,name})) }, executor: { v:1, capsule:'sealed-capability' } }
  } });
  const result = await f.executor.syncRoster({ enabled: true, code, count:3, privateReads:false, playerRef() { throw Error('private seat read'); } });
  assert.equal(result.game, 'dixit'); assert.deepEqual(f.reads, [key]);
  assert.equal(f.calls.length, 0, 'unchanged membership makes no mutation');
});
