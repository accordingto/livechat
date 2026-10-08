// End-to-end server tests use the real party adapters and an in-memory Firebase
// REST/ETag boundary. No host browser, external account, network or live room.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createExecutor, GRACE_MS, unseal, keyFrom } = require('../runtime/hub-executor-core.cjs');
const { adapters } = require('../runtime/party-executor.cjs');
const CUT = require('../cut-engine.js');
const MIC = require('../open-mic-engine.js');
const secret = '12'.repeat(32);
const clone = value => value == null ? null : structuredClone(value);
class FirebaseHTTP {
  constructor({ stripEmpty = false } = {}) { this.stripEmpty = stripEmpty; this.nodes = new Map(); this.versions = new Map(); this.writes = []; this.conflicts = 0; this.afterPut = null; this.failPath = null; this.dropEtags = false; }
  set(path, value) { this.nodes.set(path, this.stripEmpty ? firebaseValue(value) : clone(value)); this.versions.set(path, (this.versions.get(path) || 0) + 1); }
  get(path) { return clone(this.nodes.get(path)); }
  async fetch(url, options = {}) {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    if (this.failPath === path) return { ok: false, status: 503, headers: new Headers(), json: async () => ({ error: 'private upstream data' }) };
    const etag = '"' + (this.versions.get(path) || 0) + '"';
    if (!options.method || options.method === 'GET') {
      const value = this.get(path);
      return { ok: true, status: 200, headers: new Headers(this.dropEtags ? {} : { etag }), json: async () => value };
    }
    assert.equal(options.method, 'PUT'); assert.ok(options.headers['If-Match'], 'every write is conditional');
    if (options.headers['If-Match'] !== etag) { this.conflicts++; return { ok: false, status: 412 }; }
    const next = JSON.parse(options.body); this.set(path, next); this.writes.push({ path, value: clone(next) });
    if (this.afterPut) await this.afterPut(path, next);
    return { ok: true, status: 200, json: async () => clone(next) };
  }
}
function firebaseValue(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, child]) => [key, firebaseValue(child)]).filter(([, child]) => child != null);
  if (!entries.length) return null;
  if (Array.isArray(value)) { const result = []; for (const [key, child] of entries) result[Number(key)] = child; return result; }
  return Object.fromEntries(entries);
}
function fixture(game = 'cut', options = {}) {
  const engine = game === 'cut' ? CUT : MIC, db = new FirebaseHTTP(options);
  const code = 'TESTROOM', controlToken = 'a'.repeat(32), seats = [1, 2, 3, 4].map(playerNum => ({ playerNum, token: String(playerNum).repeat(32) }));
  const canonicalPath = `rooms/${code}/players/${controlToken}`;
  const path = number => `rooms/${code}/players/${seats[number - 1].token}`;
  let clock = 1000;
  const original = engine.create({ id: 'server-session', roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Person ' + s.playerNum })), now: clock, seed: 753 });
  db.set(canonicalPath, { stateJson: JSON.stringify(original), revision: 1, owner: 'old-browser', leaseUntil: 15000 });
  for (const seat of seats) db.set(path(seat.playerNum), engine.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db), now: () => clock, games: adapters });
  const state = () => adapters[game].decode(db.get(canonicalPath));
  const card = number => db.get(path(number));
  const mailbox = (number, type, extra = {}) => {
    const current = state(), action = { id: `mailbox-${number}-${db.writes.length}-${type}`, sessionId: current.sessionId, turnId: current.turnId, type, ...extra };
    db.set(path(number), { ...card(number), [game === 'cut' ? 'cutAction' : 'openmicAction']: action }); return action;
  };
  const register = () => service.register({ game, code, controlToken, seats, sessionId: original.sessionId });
  const pulse = number => service.execute({ capsule: card(number).hubExecutor.capsule, token: seats[number - 1].token });
  return { game, db, code, controlToken, seats, canonicalPath, path, service, state, card, mailbox, register, pulse,
    clock: () => clock, advance(value) { clock = value; } };
}

test('CUT registration followed by player-only pulses completes timed turns with no Host executor', async () => {
  const f = fixture(), registered = await f.register();
  assert.equal(registered.game, 'cut'); assert.equal(f.state().sharedControls, true);
  const canonical = f.db.get(f.canonicalPath); assert.equal(canonical.owner, 'server');
  for (const seat of f.seats) {
    const data = f.card(seat.playerNum); assert.equal(data.hubExecutor.capsule, registered.capsule); assert.equal(data.cut.sharedControls, true);
    assert.doesNotMatch(JSON.stringify(data), new RegExp(f.controlToken));
    for (const other of f.seats.filter(s => s.playerNum !== seat.playerNum)) assert.doesNotMatch(JSON.stringify(data), new RegExp(other.token));
  }
  // All subsequent work uses an ordinary seat token, never the control token.
  const command = f.mailbox(2, 'begin'); await f.pulse(2); assert.equal(f.state().phase, 'countdown');
  assert.equal(f.card(2).cut.reply.id, command.id);
  f.advance(f.state().phaseUntil); await f.pulse(3); assert.equal(f.state().phase, 'speaking');
  f.advance(f.state().deadline); await f.pulse(4); assert.equal(f.state().phase, 'cut');
  assert.ok(f.card(1).cut.nextSpeaker); assert.equal(f.card(1).cut.deadline, undefined);
  const topic = f.state().topic.id;
  for (let turn = 0; turn < 12; turn++) {
    assert.equal(f.state().phase, 'cut'); assert.equal(f.state().cutEvent.final, false);
    assert.equal(f.state().topic.id, topic);
    f.mailbox(2, 'begin'); await f.pulse(2);
    f.advance(f.state().deadline); await f.pulse(2);
  }
  assert.equal(f.state().phase, 'cut'); assert.equal(f.state().topic.id, topic);
  f.mailbox(3, 'endTopic'); await f.pulse(3);
  assert.equal(f.state().phase, 'break'); const round = f.state().round;
  f.mailbox(3, 'next'); await f.pulse(3); assert.equal(f.state().round, round + 1); assert.equal(f.state().phase, 'ready');
});

test('Open Mic registration followed by player mailboxes judges and rotates without a host page', async () => {
  const f = fixture('openmic'); await f.register();
  const success = f.mailbox(3, 'success'); await f.pulse(3);
  assert.equal(f.state().teamScore, 2); assert.equal(f.card(3).openmic.reply.id, success.id);
  f.advance(100000); await f.pulse(2); assert.equal(f.state().spotlight, 1); assert.equal(f.state().teamScore, 2);
  f.mailbox(2, 'next'); await f.pulse(2); assert.equal(f.state().spotlight, 2); assert.equal(f.state().phase, 'challenge');
  f.mailbox(3, 'failed'); await f.pulse(3); assert.equal(f.state().phase, 'choice');
  f.mailbox(2, 'selectSong', { videoId: f.state().songLibrary[0].videoId }); await f.pulse(4);
  f.mailbox(2, 'startSinging'); await f.pulse(2); assert.equal(f.state().phase, 'singing');
  f.mailbox(2, 'finishSinging'); await f.pulse(2); assert.equal(f.state().teamScore, 3);
  await f.pulse(4); assert.equal(f.state().teamScore, 3, 'retained mailbox cannot score twice');
});

test('CAS conflicts retry simultaneous starts without starting a second turn or losing actor replies', async () => {
  const f = fixture(); await f.register();
  f.mailbox(2, 'begin'); f.mailbox(3, 'begin');
  await Promise.all([f.pulse(2), f.pulse(3), f.pulse(4)]);
  assert.equal(f.state().phase, 'countdown'); assert.equal(f.state().turnId, 2);
  assert.ok(f.db.conflicts > 0, 'the fake boundary really exercised ETag conflicts');
  assert.equal(f.card(2).cut.reply.error, ''); assert.equal(f.card(3).cut.reply.error, 'stale_turn');
  assert.equal(f.card(2).cut.turnId, f.card(4).cut.turnId);
});

test('authenticated seat context defeats mailbox actor and direct-command actor spoofing', async () => {
  const f = fixture(); await f.register();
  f.mailbox(2, 'stop', { actor: 0, now: 99999999, sharedControls: true }); await f.pulse(2);
  assert.equal(f.state().phase, 'ready'); assert.equal(f.card(2).cut.reply.error, 'not_available');
  const capsule = f.card(2).hubExecutor.capsule;
  await f.service.execute({ capsule, token: f.seats[1].token, command: { id: 'direct-spoof', type: 'settings', actor: 0, sessionId: f.state().sessionId, turnId: f.state().turnId } });
  assert.equal(f.state().phase, 'ready'); assert.equal(f.card(2).cut.reply.error, 'not_available');
  await assert.rejects(f.service.execute({ capsule, token: 'f'.repeat(32) }), e => e.code === 'wrong_player');
});

test('presence grace does not remove background seats; explicit recovery skips only seats past grace', async () => {
  for (const game of ['cut', 'openmic']) {
    const f = fixture(game); await f.register(); f.advance(1000 + GRACE_MS - 1);
    await f.pulse(2); assert.deepEqual(f.card(2).hubExecutor.absentNums, []); assert.ok(f.state().roster.every(p => p.active));
    f.advance(1000 + GRACE_MS + 1); await f.pulse(3);
    assert.deepEqual(f.card(3).hubExecutor.absentNums, [1, 4]); assert.ok(f.state().roster.every(p => p.active));
    const recover = f.mailbox(3, 'recover'); await f.pulse(3);
    assert.equal(f.card(3)[game].reply.id, recover.id); assert.equal(f.state().roster[0].active, false); assert.equal(f.state().roster[3].active, false);
    assert.equal(f.state().roster[1].active, true); assert.equal(f.state().roster[2].active, true);
    await f.pulse(1); f.mailbox(1, 'recover'); await f.pulse(1);
    assert.equal(f.state().roster[0].active, true); assert.equal(f.state().roster[3].active, false);
  }
});

test('sealed tickets reject tampering, expiry, stale epochs and accidental publication of canonical credentials', async () => {
  const f = fixture(); await f.register(); const capsule = f.card(2).hubExecutor.capsule;
  assert.equal(unseal(capsule, keyFrom(secret)).controlToken, f.controlToken);
  const middle = Math.floor(capsule.length / 2), altered = capsule.slice(0, middle) + (capsule[middle] === 'A' ? 'B' : 'A') + capsule.slice(middle + 1);
  await assert.rejects(f.service.execute({ capsule: altered, token: f.seats[1].token }), e => e.code === 'invalid_ticket');
  const saved = f.db.get(f.canonicalPath); f.db.set(f.canonicalPath, { ...saved, executor: { ...saved.executor, epoch: 'new-epoch' } });
  await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), e => e.code === 'stale_session');
  f.db.set(f.canonicalPath, saved); f.advance(1000 + 15 * 86400000);
  await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), e => e.code === 'invalid_ticket');
});

test('a player action written during publication survives and is processed by the next player pulse', async () => {
  const f = fixture('openmic'); await f.register();
  let fired = false;
  f.db.afterPut = path => {
    if (!fired && path === f.path(1)) { fired = true; f.mailbox(3, 'success'); }
  };
  f.advance(1001); await f.pulse(2); f.db.afterPut = null;
  assert.equal(fired, true, 'the concurrent action was injected during projection');
  const action = f.card(3).openmicAction; assert.equal(action.type, 'success');
  await f.pulse(4); assert.equal(f.state().teamScore, 2); assert.equal(f.card(3).openmic.reply.id, action.id);
});

test('a new game arriving between canonical commit and publication wins every player node', async () => {
  const f = fixture(); await f.register();
  let fired = false;
  f.db.afterPut = path => {
    if (!fired && path === f.canonicalPath) {
      fired = true; for (const seat of f.seats) f.db.set(f.path(seat.playerNum), { game: 'scene', playerNum: seat.playerNum, round: 77 });
    }
  };
  const capsule = f.card(2).hubExecutor.capsule; await f.pulse(2); f.db.afterPut = null;
  for (const seat of f.seats) assert.equal(f.card(seat.playerNum).game, 'scene');
  await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), e => e.code === 'game_switched');
});

test('registration rejects wrong roster and session; repeat registration reuses the current sealed session', async () => {
  const f = fixture();
  await assert.rejects(f.service.register({ game: 'cut', code: f.code, controlToken: f.controlToken, seats: f.seats.slice(0, 3) }), e => e.code === 'invalid_roster');
  await assert.rejects(f.service.register({ game: 'cut', code: f.code, controlToken: f.controlToken, seats: f.seats, sessionId: 'another-session' }), e => e.code === 'stale_session');
  const one = await f.register(), two = await f.register(); assert.equal(one.capsule, two.capsule);
});

test('missing ETags or storage failure never degrade to unconditional updates', async () => {
  const f = fixture(); f.db.dropEtags = true;
  await assert.rejects(f.register(), e => e.code === 'unsafe_storage'); assert.equal(f.db.writes.length, 0);
  f.db.dropEtags = false; f.db.failPath = f.path(2);
  await assert.rejects(f.register(), e => e.code === 'storage_unavailable'); assert.equal(f.db.writes.length, 0);
  assert.throws(() => createExecutor({ secret: 'bad', games: adapters }), e => e.code === 'executor_not_configured');
});


test('real Firebase empty-tree cleanup preserves registration, empty presence and player-only execution', async () => {
  for (const game of ['cut', 'openmic']) {
    const f = fixture(game, { stripEmpty: true });
    const registered = await f.register();
    assert.equal(registered.game, game); assert.equal(f.db.get(f.canonicalPath).executor.presence, undefined);
    assert.equal(f.state().sharedControls, true); assert.ok(Array.isArray(f.state().roster));
    f.mailbox(2, game === 'cut' ? 'begin' : 'success'); await f.pulse(2);
    assert.equal(f.db.get(f.canonicalPath).executor.presence[2], f.clock());
    assert.equal(f.card(2)[game].reply.error || '', '');
    assert.equal(f.state().phase, game === 'cut' ? 'countdown' : 'choice');
    // Unknown presence is a live grace period, not an empty room to kick out.
    assert.ok(f.state().roster.every(player => player.active));
  }
});

test('the real default server registry loads every game module without a host browser or network', async () => {
  const f = fixture();
  const service = createExecutor({ secret, databaseURL: 'http://localhost', fetchImpl: f.db.fetch.bind(f.db), now: f.clock });
  const result = await service.register({ game: 'cut', code: f.code, controlToken: f.controlToken, seats: f.seats });
  assert.equal(result.game, 'cut');
  for (const [file, keys] of [['../runtime/story-executor.cjs', ['dixit', 'onceupon', 'letstalk']],
    ['../runtime/party-executor.cjs', ['cut', 'openmic']], ['../runtime/bluff-executor.cjs', ['bluffking']]]) {
    const actual = require(file).adapters;
    for (const key of keys) for (const method of ['decode', 'encode', 'session', 'apply', 'pulse', 'project', 'command']) assert.equal(typeof actual[key][method], 'function', key + '.' + method);
  }
  const wolf = require('../runtime/wolf-executor.cjs').adapters.chatwolf;
  for (const method of ['decode', 'encode', 'session', 'customExecute']) assert.equal(typeof wolf[method], 'function', 'chatwolf.' + method);
  assert.equal(typeof require('../api/hub-executor.js'), 'function');
});


test('one recent player drives CUT clocks without revealing timing and another takes over after its driver stops pulsing', async () => {
  const f = fixture(); await f.register(); f.mailbox(2, 'begin');
  const first = await f.pulse(2); assert.equal(first.pollAfterMs, 500); assert.deepEqual(Object.keys(first).sort(), ['ok', 'pollAfterMs']);
  const standby = await f.pulse(3); assert.equal(standby.pollAfterMs, 5000);
  f.advance(11500); // previous driver is older than the 10-second driver grace
  const replacement = await f.pulse(3); assert.equal(replacement.pollAfterMs, 500);
  assert.equal(f.state().phase, 'speaking'); assert.equal(f.card(3).cut.deadline, undefined);
  const ordinary = await f.pulse(4); assert.equal(ordinary.pollAfterMs, 5000);
});

test('unchanged fast-clock pulses preserve card revisions and skip republishing while deadlines still advance once', async () => {
  const f = fixture(); await f.register(); f.mailbox(2, 'begin'); await f.pulse(2);
  const capsule = f.card(2).hubExecutor.capsule, token = f.seats[1].token;
  const cardWrites = () => f.db.writes.filter(entry => entry.path !== f.canonicalPath).length;
  const before = cardWrites(), revision = f.card(2).hubExecutor.revision;
  f.advance(1500); const idle = await f.service.execute({ capsule, token, clock: true });
  assert.equal(idle.pollAfterMs, 500); assert.equal(cardWrites(), before); assert.equal(f.card(2).hubExecutor.revision, revision);
  f.advance(f.state().phaseUntil); await f.service.execute({ capsule, token, clock: true });
  assert.equal(f.state().phase, 'speaking'); assert.ok(cardWrites() > before); assert.ok(f.card(2).hubExecutor.revision > revision);
  const speakingWrites = cardWrites(), speakingTurn = f.state().turnId;
  f.advance(f.state().lastChangeAt + 500); await f.service.execute({ capsule, token, clock: true });
  assert.equal(cardWrites(), speakingWrites); assert.equal(f.state().turnId, speakingTurn);
});


test('a fast driver retries a partially failed publication immediately instead of leaving its receipt stale for fifteen seconds', async () => {
  const f = fixture(); await f.register(); const capsule = f.card(2).hubExecutor.capsule, token = f.seats[1].token;
  f.mailbox(2, 'begin'); let failed = false;
  f.db.afterPut = path => { if (!failed && path === f.canonicalPath) { failed = true; f.db.failPath = f.path(2); } };
  await assert.rejects(f.pulse(2), e => e.code === 'storage_unavailable');
  f.db.afterPut = null; f.db.failPath = null;
  assert.equal(f.state().phase, 'countdown'); assert.equal(f.card(2).cut.phase, 'ready');
  assert.ok(f.card(2).hubExecutor.revision < f.db.get(f.canonicalPath).revision);
  f.advance(1500); await f.service.execute({ capsule, token, clock: true });
  assert.equal(f.card(2).cut.phase, 'countdown'); assert.equal(f.card(2).hubExecutor.revision, f.db.get(f.canonicalPath).revision);
  assert.equal(f.card(2).cut.reply.error, '');
});


test('CUT resumed prep uses fast checks while unlimited handoffs wait on the normal heartbeat', async () => {
  const f = fixture(); await f.register(); f.mailbox(2, 'begin'); await f.pulse(2);
  f.advance(f.state().phaseUntil); await f.pulse(2); f.mailbox(2, 'pause'); await f.pulse(2);
  assert.equal(f.state().phase, 'paused'); f.mailbox(3, 'resume'); await f.pulse(3);
  assert.equal(f.state().phase, 'handoff'); assert.equal((await f.pulse(2)).pollAfterMs, 500);
  f.advance(f.state().phaseUntil); await f.pulse(2);
  f.advance(f.state().deadline); const cut = await f.pulse(2);
  assert.equal(f.state().phase, 'cut'); assert.equal(f.state().cutEvent.final, false);
  assert.equal(cut.pollAfterMs, 5000, 'an indefinite CUT needs no rapid clock checks');
  const topic = f.state().topic.id;
  f.advance(f.clock() + 600000); await f.pulse(2);
  assert.equal(f.state().phase, 'cut'); assert.equal(f.state().topic.id, topic);
  f.mailbox(2, 'begin'); const began = await f.pulse(2);
  assert.equal(f.state().phase, 'speaking'); assert.equal(began.pollAfterMs, 500);
  f.mailbox(3, 'endTopic'); await f.pulse(3);
  assert.equal(f.state().phase, 'break'); assert.equal((await f.pulse(2)).pollAfterMs, 5000);
});


test('party executors reject inherited tickets on another game or a newer session', async () => {
  for (const game of ['cut', 'openmic']) {
    for (const sameGame of [false, true]) {
      const f = fixture(game); await f.register();
      const capsule = f.card(2).hubExecutor.capsule, old = f.card(1);
      const newer = sameGame ? { ...old, [game]: { ...old[game], sessionId: 'newer-party-session' } }
        : { ...old, game: 'scene', round: 38 };
      f.db.set(f.path(1), newer);
      await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), error => error.code === 'game_switched');
      assert.deepEqual(f.card(1), newer);
    }
  }
});
