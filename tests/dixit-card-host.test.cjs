'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const E = require('../dixit-engine.js');
function fixture() {
  const code = 'DXTEST', tokens = ['a'.repeat(20), 'b'.repeat(20), 'c'.repeat(20)], control = 'd'.repeat(32), values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  storage.setItem('room-session-' + code, JSON.stringify({ tokens, playerCount: 3, dixitControlToken: control, otherSetting: true }));
  const callbacks = new Map(), readPaths = [], hosts = [];
  const db = { ref(path) { readPaths.push(path); return {
    on(event, listener) { callbacks.set(path, listener); }, off(event, listener) { if (callbacks.get(path) === listener) callbacks.delete(path); },
  }; } };
  class Host {
    constructor(options) { this.options = options; this.commands = []; hosts.push(this); }
    connect() { this.connected = true; }
    close() { this.closed = true; }
    setActive(active) { this.active = active; }
    receive(seat, data) { this.commands.push({ seat, data }); }
  }
  const context = vm.createContext({ DIXIT_ENGINE: E, DIXIT_SYNC: { Host, uid: () => 'e'.repeat(32) }, localStorage: storage, document: { hidden: false } });
  vm.runInContext(fs.readFileSync(require.resolve('../dixit-card-host.js'), 'utf8'), context);
  const bridge = new context.DIXIT_CARD_HOST.Bridge({ roomCode: code, playerToken: tokens[0], db, storage });
  const state = E.create({ id: 'bridge-test', seed: 7, now: 1000, hostPlayerNum: 1,
    roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'Seat ' + playerNum })) });
  return { bridge, state, storage, values, code, tokens, control, hosts, callbacks, readPaths };
}

test('only the designated host card with existing matching local room credentials starts an executor', () => {
  const f = fixture();
  for (const payload of [E.view(f.state, 2), E.view(f.state, 0), { ...E.view(f.state, 1), playerNum: 2 },
    { ...E.view(f.state, 1), game: 'onceupon' }]) {
    assert.equal(f.bridge.update(payload), false);
  }
  assert.equal(f.hosts.length, 0); assert.equal(f.readPaths.length, 0);
  const saved = f.storage.getItem('room-session-' + f.code);
  f.storage.setItem('room-session-' + f.code, JSON.stringify({ tokens: f.tokens, playerCount: 3 }));
  assert.equal(f.bridge.update(E.view(f.state, 1)), false);
  assert.equal(f.hosts.length, 0, 'a bearer card cannot create host credentials');
  f.storage.setItem('room-session-' + f.code, saved);
  f.bridge.token = f.tokens[1];
  assert.equal(f.bridge.update(E.view(f.state, 1)), false, 'wrong player link cannot gain host execution');
  f.bridge.token = f.tokens[0];
  assert.equal(f.bridge.update(E.view(f.state, 1)), true);
  assert.equal(f.hosts.length, 1); assert.equal(f.hosts[0].options.mode, 'private');
  assert.equal(f.hosts[0].connected, true);
});

test('private-host bridge uses existing private paths and listener seats; heartbeat and restart do not duplicate executors', () => {
  const f = fixture(), payload = E.view(f.state, 1);
  const before = JSON.stringify(payload);
  assert.equal(f.bridge.update(payload), true);
  assert.equal(JSON.stringify(payload), before, 'no control credential is added to a player payload');
  assert.equal(JSON.stringify(payload).includes(f.control), false);
  assert.equal(f.callbacks.size, 3);
  const host = f.hosts[0];
  assert.equal(host.options.room.getExtra('dixitControlToken'), f.control);
  f.callbacks.get('rooms/DXTEST/players/' + f.tokens[2])({ val: () => ({ dixitAction: { actor: 0 } }) });
  assert.equal(host.commands[0].seat, 3, 'the listener provides the actor, not the request');
  f.bridge.update({ ...payload, dixit: { ...payload.dixit, hostLiveUntil: 12000 } });
  f.bridge.update({ ...payload, dixit: { ...payload.dixit, sessionId: 'restarted' } });
  assert.equal(f.hosts.length, 1);
  f.bridge.setActive(false); assert.equal(host.active, false);
  f.bridge.setActive(true); assert.equal(host.active, true);
  f.bridge.update({ game: 'letstalk' });
  assert.equal(host.closed, true); assert.equal(f.callbacks.size, 0);
  assert.equal(JSON.parse(f.storage.getItem('room-session-' + f.code)).otherSetting, true);
});

test('missing or corrupted host storage never subscribes to other player paths', () => {
  const f = fixture();
  for (const saved of [null, '{bad', JSON.stringify({ tokens: f.tokens, dixitControlToken: 'invalid' }),
    JSON.stringify({ tokens: [f.tokens[0]], dixitControlToken: f.control })]) {
    if (saved === null) f.values.delete('room-session-' + f.code); else f.storage.setItem('room-session-' + f.code, saved);
    assert.equal(f.bridge.update(E.view(f.state, 1)), false);
  }
  assert.equal(f.hosts.length, 0); assert.equal(f.readPaths.length, 0);
});

test('the same tab keeps its refresh handoff group separate from saved room credentials', () => {
  const f = fixture(), values = new Map(), tabStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const saved = f.storage.getItem('room-session-' + f.code);
  f.bridge.tabStorage = tabStorage;
  f.bridge.update(E.view(f.state, 1));
  const first = f.hosts[0].options.resumeGroup;
  assert.match(first, /^[a-f0-9]{32}$/);
  f.bridge.close(); f.bridge.update(E.view(f.state, 1));
  assert.equal(f.hosts[1].options.resumeGroup, first);
  assert.equal(f.storage.getItem('room-session-' + f.code), saved);
  assert.equal(values.size, 1);
});
