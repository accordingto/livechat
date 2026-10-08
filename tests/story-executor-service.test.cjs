// Real API core + real story engines over a synthetic Firebase REST/ETag
// boundary. No browser Host, external service, live room or real credentials.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createExecutor, GRACE_MS, seal, unseal, keyFrom } = require('../runtime/hub-executor-core.cjs');
const { adapters } = require('../runtime/story-executor.cjs');
const DX = require('../dixit-engine.js');
const ON = require('../once-upon-a-time-engine.js');
const TK = require('../talk-engine.js');
const clone = value => value == null ? null : structuredClone(value);
const secret = '63'.repeat(32);
const fields = { dixit: 'dixit', onceupon: 'once', letstalk: 'talk' };
const actionFields = { dixit: 'dixitAction', onceupon: 'onceAction', letstalk: 'talkAction' };
// RTDB removes empty trees. Dense numeric maps may return sparse arrays rather
// than objects, including hands, votes, scores, seen ids and actor receipts.
function firebaseWire(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const values = value.map(firebaseWire); while (values.length && values.at(-1) == null) values.pop();
    return values.length ? values : null;
  }
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, firebaseWire(v)]).filter(([, v]) => v != null);
  if (!entries.length) return null;
  if (entries.every(([k]) => /^\d+$/.test(k))) {
    const maximum = Math.max(...entries.map(([k]) => Number(k)));
    if (maximum < entries.length * 2) {
      const values = Array(maximum + 1).fill(null); for (const [k, v] of entries) values[Number(k)] = v; return values;
    }
  }
  return Object.fromEntries(entries);
}
class FirebaseHTTP {
  constructor() { this.nodes = new Map(); this.versions = new Map(); this.writes = []; this.conflicts = 0; this.putHook = null; this.failWrites = new Set(); this.beforePut = null; }
  set(path, value) { this.nodes.set(path, firebaseWire(clone(value))); this.versions.set(path, (this.versions.get(path) || 0) + 1); }
  get(path) { return clone(this.nodes.get(path)); }
  async fetch(url, options = {}) {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    const etag = '"' + (this.versions.get(path) || 0) + '"';
    if (!options.method || options.method === 'GET') {
      const value = this.get(path);
      return { ok: true, status: 200, headers: new Headers({ etag }), json: async () => clone(value) };
    }
    if (this.failWrites.has(path)) return { ok: false, status: 503, headers: new Headers(), json: async () => ({ error: 'synthetic unavailable storage' }) };
    assert.equal(options.method, 'PUT'); assert.ok(options.headers['If-Match'], 'every service write must use an ETag');
    const value = JSON.parse(options.body);
    if (this.beforePut) await this.beforePut(path, value);
    const latestEtag = '\"' + (this.versions.get(path) || 0) + '\"';
    if (options.headers['If-Match'] !== latestEtag) { this.conflicts++; return { ok: false, status: 412 }; }
    this.set(path, value); this.writes.push({ path, value: this.get(path) });
    if (this.putHook) await this.putHook(path, value);
    return { ok: true, status: 200, json: async () => this.get(path) };
  }
}
function fixture(game, { count = 3, existing = null, stateJson = false, games = adapters } = {}) {
  const engine = { dixit: DX, onceupon: ON, letstalk: TK }[game];
  const db = new FirebaseHTTP(), code = 'STORYTEST', controlToken = 'a'.repeat(32);
  const seats = Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, token: String(i + 1).repeat(20) }));
  const canonicalPath = 'rooms/' + code + '/players/' + controlToken;
  const path = number => 'rooms/' + code + '/players/' + seats[number - 1].token;
  let clock = 1000, sequence = 0;
  const original = existing || engine.create({ id: 'api-' + game, roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Person ' + s.playerNum })),
    topic: { id: 'topic', question: 'What would you create?', followUp: 'Who would join you?' }, now: clock, seed: 713, seconds: 15 });
  db.set(canonicalPath, { ...(stateJson ? { stateJson: JSON.stringify(original) } : { state: original }),
    revision: 1, owner: 'former-browser', leaseUntil: 15000, retained: { originalLinks: true } });
  for (const seat of seats) db.set(path(seat.playerNum), engine.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db), now: () => clock, games });
  const state = () => adapters[game].decode(db.get(canonicalPath));
  const card = number => db.get(path(number));
  const view = number => card(number)[fields[game]];
  const playerRequests = [];
  const pulse = async (number, command) => {
    const request = { capsule: card(number).hubExecutor.capsule, token: seats[number - 1].token, ...(command ? { command } : {}) };
    playerRequests.push(clone(request)); return service.execute(request);
  };
  const mailbox = (number, type, extra = {}) => {
    const s = state(), command = { id: 'request-' + ++sequence, sessionId: s.sessionId, turnId: s.turnId, type, ...extra };
    db.set(path(number), { ...card(number), [actionFields[game]]: command }); return command;
  };
  const perform = async (number, type, extra = {}) => {
    const command = mailbox(number, type, extra); await pulse(number);
    assert.equal(view(number).reply?.id, command.id); assert.equal(view(number).reply?.error, '', type + ' must be accepted');
    return command;
  };
  const register = () => service.register({ game, code, controlToken, seats, sessionId: original.sessionId });
  const publicView = () => adapters[game].project(state(), { playerNum: 0 }, { now: clock, revision: db.get(canonicalPath).revision });
  return { game, db, code, controlToken, seats, canonicalPath, path, service, original, register, state, card, view, mailbox, pulse, perform, publicView, playerRequests,
    clock: () => clock, advance(value) { clock = value; } };
}
function assertPlayerOnly(f) {
  assert.ok(f.playerRequests.length);
  assert.ok(f.playerRequests.every(body => body.token !== f.controlToken && !Object.hasOwn(body, 'controlToken')));
}
function assertCredentialsPrivate(f) {
  for (const seat of f.seats) {
    const data = JSON.stringify(f.card(seat.playerNum));
    assert.ok(!data.includes(f.controlToken));
    for (const other of f.seats.filter(s => s.playerNum !== seat.playerNum)) assert.ok(!data.includes(other.token));
  }
}
function assertDixitConserved(s) {
  const cards = [...DX.list(s.deck), ...DX.list(s.discard), ...s.roster.flatMap(p => DX.list(s.hands[p.playerNum])), ...s.roster.flatMap(p => DX.list(s.submissions?.[p.playerNum]))];
  assert.equal(cards.length, 84); assert.equal(new Set(cards).size, 84);
}
test('Dixit API registration and ordinary private cards complete a spoken three-player round and both timed reveals', async () => {
  const f = fixture('dixit'); await f.register();
  assert.equal(f.state().phase, 'LOBBY'); assert.equal(f.state().sharedControls, true);
  assert.equal(f.db.get(f.canonicalPath).owner, 'server'); assertCredentialsPrivate(f);
  await f.perform(2, 'deal', { firstPlayerNum: 1 });
  assert.equal(f.state().phase, 'CLUE'); assert.equal(f.view(2).hostControls, true);
  for (const n of [1, 2, 3]) assert.equal(f.view(n).hand.length, 7);
  const publicDealt = f.publicView(), publicJson = JSON.stringify(publicDealt);
  assert.equal(publicDealt.dixit.hand, undefined);
  for (const n of [1, 2, 3]) {
    for (const id of f.state().hands[n]) assert.ok(!publicJson.includes(JSON.stringify(id)));
    const mine = JSON.stringify(f.card(n));
    for (const other of [1, 2, 3].filter(other => other !== n))
      for (const id of f.state().hands[other]) assert.ok(!mine.includes(JSON.stringify(id)));
    assert.equal(f.card(n).state, undefined); assert.equal(f.card(n).stateJson, undefined);
  }
  await f.perform(1, 'story', { cardId: f.state().hands[1][0], clueMode: 'spoken' });
  for (const n of [2, 3]) await f.perform(n, 'submit', { cardIds: f.state().hands[n].slice(0, 2) });
  assert.equal(f.state().phase, 'VOTE'); assert.equal(f.view(2).table.length, 5);
  assert.equal(f.publicView().dixit.answerCardId, undefined); assert.equal(f.publicView().dixit.result, null);
  const answer = f.state().submissions[1][0], decoy = f.state().submissions[2][0];
  await f.perform(2, 'vote', { cardId: answer }); await f.perform(3, 'vote', { cardId: decoy });
  await f.perform(3, 'reveal'); assert.equal(f.state().phase, 'REVEALING');
  f.advance(f.state().revealAnswerAt - 1); await f.pulse(2);
  assert.equal(f.view(2).answerCardId, undefined); assert.equal(f.view(2).result ?? null, null);
  f.advance(f.state().revealAnswerAt); await f.pulse(3);
  assert.equal(f.state().revealStage, 'answer'); assert.equal(f.view(2).answerCardId, answer);
  assert.equal(f.view(2).result ?? null, null); assert.ok(f.view(2).roster.every(p => p.score === 0));
  f.advance(f.state().revealPopularAt); await f.pulse(2);
  assert.equal(f.state().phase, 'REVEAL'); assert.deepEqual(f.state().lastRound.rows.map(r => r.delta), [3, 4, 0]);
  assert.equal(f.view(3).result.answerCardId, answer); assertDixitConserved(f.state());
  await f.perform(2, 'nextRound');
  assert.equal(f.state().phase, 'CLUE'); assert.equal(f.state().storyteller, 2); assert.equal(f.state().round, 2);
  for (const n of [1, 2, 3]) assert.equal(f.view(n).hand.length, 7);
  assert.equal(f.publicView().dixit.hand, undefined); assertCredentialsPrivate(f); assertPlayerOnly(f); assertDixitConserved(f.state());
});
test('Dixit concurrent ETag submissions preserve both actors and retry retained mailboxes without consuming extra cards', async () => {
  const f = fixture('dixit'); await f.register(); await f.perform(2, 'deal', { firstPlayerNum: 1 });
  await f.perform(1, 'story', { cardId: f.state().hands[1][0], clueMode: 'spoken' });
  const two = f.mailbox(2, 'submit', { cardIds: f.state().hands[2].slice(0, 2), actor: 0 });
  const three = f.mailbox(3, 'submit', { cardIds: f.state().hands[3].slice(0, 2), actor: 2 });
  await Promise.all([f.pulse(2), f.pulse(3)]);
  assert.ok(f.db.conflicts > 0); assert.equal(f.state().phase, 'VOTE');
  assert.equal(f.view(2).reply.id, two.id); assert.equal(f.view(3).reply.id, three.id);
  assert.equal(f.view(2).hand.length, 5); assert.equal(f.view(3).hand.length, 5);
  const saved = clone(f.state().submissions); await f.pulse(2); await f.pulse(3);
  assert.deepEqual(f.state().submissions, saved); assertDixitConserved(f.state()); assertPlayerOnly(f);
});
test('Once original private links deal, choose, play and safely finish an absent player pass without a host executor', async () => {
  const f = fixture('onceupon'); await f.register();
  await f.perform(2, 'deal'); await f.perform(3, 'chooseFirst', { playerNum: 1 });
  const ending = f.view(1).ending.id, played = f.view(1).hand[0].id;
  assert.equal(f.publicView().once.hand, undefined); assert.equal(f.publicView().once.ending, undefined);
  await f.perform(1, 'play', { cardId: played }); assert.equal(f.view(2).history.at(-1).cardId, played);
  await f.perform(1, 'pass'); const handAfterDraw = f.view(1).hand.map(c => c.id);
  assert.equal(f.state().phase, 'PASS_DISCARD');
  f.advance(1000 + GRACE_MS + 1); await f.pulse(2); await f.pulse(3);
  assert.equal(f.db.get(f.canonicalPath).executor.presence[3], f.clock(), 'returning player is immediately present in authoritative context');
  assert.deepEqual(f.card(3).hubExecutor.absentNums, [1]); assert.equal(f.state().phase, 'PASS_DISCARD', 'presence alone cannot fabricate a pass choice');
  await f.perform(2, 'recover');
  assert.equal(f.state().phase, 'STORYTELLING'); assert.equal(f.state().storyteller, 2);
  assert.deepEqual(f.view(1).hand.map(c => c.id), handAfterDraw); assert.equal(f.view(1).ending.id, ending);
  await f.perform(2, 'play', { cardId: f.view(2).hand[0].id });
  assert.equal(f.state().storyteller, 2); assert.equal(f.publicView().once.ending, undefined);
  assertCredentialsPrivate(f); assertPlayerOnly(f);
});
test('Once registration migrates an existing dealt state without replacing its hands, endings or private URLs', async () => {
  let original = ON.create({ id: 'ongoing-once', roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'Person ' + playerNum })), now: 1000, seed: 95 });
  const legacy = (s, type, extra = {}) => ON.apply(s, { id: 'legacy-' + type, sessionId: s.sessionId, turnId: s.turnId, actor: 0, now: 1000, seed: 84, type, ...extra });
  original = legacy(original, 'deal'); original = legacy(original, 'chooseFirst', { playerNum: 1 });
  const f = fixture('onceupon', { existing: original, stateJson: true }); await f.register();
  assert.deepEqual(f.state().hands, original.hands); assert.deepEqual(f.state().endings, original.endings);
  assert.equal(f.state().sessionId, original.sessionId); assert.equal(f.state().turnId, original.turnId);
  assert.equal(f.db.get(f.canonicalPath).retained.originalLinks, true);
  for (const n of [1, 2, 3]) {
    assert.deepEqual(f.view(n).hand.map(c => c.id), original.hands[n]);
    assert.equal(f.view(n).ending.id, original.endings[n]);
  }
  f.advance(1000 + GRACE_MS + 1); await f.pulse(2); await f.pulse(3); await f.perform(2, 'recover');
  assert.equal(f.state().storyteller, 2); assert.equal(f.view(1).hand.length, original.hands[1].length + 1);
  assert.equal(f.view(1).ending.id, original.endings[1]); assertPlayerOnly(f);
});
test('Talk ordinary card pulse automatically starts at the original thinking deadline without a host page', async () => {
  const f = fixture('letstalk'); await f.register(); await f.perform(3, 'ready');
  const deadline = f.state().deadline; f.advance(deadline - 1); await f.pulse(2);
  assert.equal(f.state().phase, 'thinking');
  f.advance(deadline); await f.pulse(2);
  assert.equal(f.state().phase, 'talking'); assert.equal(f.state().speaker, 3);
  assert.equal(f.view(2).actions.end, true); assert.equal(f.view(3).hostControls, true);
  await f.perform(3, 'end'); assert.notEqual(f.state().speaker, 3);
  assertCredentialsPrivate(f); assertPlayerOnly(f);
});
test('authenticated main-page API commands keep actor zero and return public view zero without private cards', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = fixture(game); const registered = await f.register(), state = f.state();
    const id = 'main-page-deal-' + game;
    const result = await f.service.execute({ capsule: registered.capsule, token: f.controlToken,
      command: { id, type: 'deal', actor: 3, sessionId: state.sessionId, turnId: state.turnId, firstPlayerNum: 1 } });
    assert.equal(f.state().replies[0].id, id); assert.equal(f.state().replies[0].error, '');
    const publicView = result.payload[fields[game]];
    assert.equal(result.payload.playerNum, 0); assert.equal(publicView.hand, undefined); assert.equal(publicView.ending, undefined);
    const publicJson = JSON.stringify(result.payload);
    for (const n of [1, 2, 3]) for (const id of (game === 'dixit' ? DX : ON).list(f.state().hands[n])) assert.ok(!publicJson.includes(JSON.stringify(id)));
    if (game === 'onceupon') for (const id of Object.values(f.state().endings).filter(Boolean)) assert.ok(!publicJson.includes(JSON.stringify(id)));
    assert.ok(!JSON.stringify(result.payload).includes(f.controlToken)); assertCredentialsPrivate(f);
  }
});
test('Firebase omission and numeric-map arrays preserve real command receipts, seats and secrets across each service request', async () => {
  for (const game of ['dixit', 'onceupon', 'letstalk']) {
    const f = fixture(game); const before = f.db.get(f.canonicalPath);
    assert.equal(before.state.seen, undefined); assert.equal(before.state.replies, undefined);
    await f.register();
    await f.perform(1, 'ready', { value: true });
    if (game === 'letstalk') await f.perform(2, 'ready');
    else await f.perform(2, 'deal', { firstPlayerNum: 1 });
    const canonical = f.db.get(f.canonicalPath);
    assert.ok(Array.isArray(canonical.state.replies), 'RTDB returns the actor map as a sparse array');
    assert.equal(canonical.state.replies[0], null);
    const id = f.view(2).reply.id; await f.pulse(3); assert.equal(f.view(2).reply.id, id);
    assert.equal(f.state().roster.length, 3);
    if (game !== 'letstalk') {
      assert.ok(Array.isArray(canonical.state.hands)); assert.equal(canonical.state.hands[0], null);
      assert.equal(f.publicView()[fields[game]].hand, undefined);
      assert.deepEqual(f.view(2).hand.map(c => typeof c === 'string' ? c : c.id), f.state().hands[2]);
    }
    assertCredentialsPrivate(f); assertPlayerOnly(f);
  }
});


test('inherited service metadata cannot let an old story executor overwrite another game', async () => {
  for (const game of ['dixit', 'onceupon', 'letstalk']) {
    const f = fixture(game); await f.register();
    const capsule = f.card(2).hubExecutor.capsule;
    // Firebase update() retains fields it did not name, including the old ticket
    // and old nested game projection. The top-level game is the actual switch.
    const newer = { ...f.card(1), game: 'scene', round: 77 };
    f.db.set(f.path(1), newer);
    const canonical = f.db.get(f.canonicalPath);
    await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), error => error.code === 'game_switched');
    assert.deepEqual(f.card(1), newer);
    assert.deepEqual(f.db.get(f.canonicalPath), canonical, 'rejected old executor cannot change canonical state or presence');
  }
});

test('inherited service metadata cannot overwrite a newer session of the same story game', async () => {
  for (const game of ['dixit', 'onceupon', 'letstalk']) {
    const f = fixture(game); await f.register();
    const capsule = f.card(2).hubExecutor.capsule, field = fields[game];
    const newer = { ...f.card(1), [field]: { ...f.view(1), sessionId: 'newer-' + game } };
    f.db.set(f.path(1), newer);
    await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), error => error.code === 'game_switched');
    assert.deepEqual(f.card(1), newer);
  }
});

test('publication CAS protects a switch that inherits its old ticket after canonical commit', async () => {
  for (const game of ['dixit', 'onceupon', 'letstalk']) {
    for (const sameGame of [false, true]) {
      const f = fixture(game); await f.register();
      const capsule = f.card(2).hubExecutor.capsule, field = fields[game], newer = new Map();
      let switched = false;
      f.db.putHook = path => {
        if (switched || path !== f.canonicalPath) return;
        switched = true;
        for (const seat of f.seats) {
          const old = f.card(seat.playerNum);
          const data = sameGame ? { ...old, [field]: { ...old[field], sessionId: 'newer-' + game } }
            : { ...old, game: 'scene', round: 91 };
          f.db.set(f.path(seat.playerNum), data); newer.set(seat.playerNum, f.card(seat.playerNum));
        }
      };
      await f.pulse(2); f.db.putHook = null;
      assert.equal(switched, true, 'the switch really occurred between commit and publication');
      for (const seat of f.seats) assert.deepEqual(f.card(seat.playerNum), newer.get(seat.playerNum));
      await assert.rejects(f.service.execute({ capsule, token: f.seats[1].token }), error => error.code === 'game_switched');
    }
  }
});

test('exact opening baselines still allow explicit registration over a previous game and ticket', async () => {
  for (const game of ['dixit', 'onceupon', 'letstalk']) {
    const f = fixture(game);
    for (const seat of f.seats) f.db.set(f.path(seat.playerNum), {
      game: 'scene', playerNum: seat.playerNum, round: 7,
      hubExecutor: { v: 1, game: 'dixit', sessionId: 'former-game', capsule: 'former-service-ticket' }
    });
    const registered = await f.register();
    for (const seat of f.seats) {
      assert.equal(f.card(seat.playerNum).game, game);
      assert.equal(f.view(seat.playerNum).sessionId, f.original.sessionId);
      assert.equal(f.card(seat.playerNum).hubExecutor.capsule, registered.capsule);
    }
    await f.pulse(2);
    assert.equal(f.state().sharedControls, true);
  }
});


async function endedRoom(game, options) {
  const f = fixture(game, options); await f.register();
  await f.perform(2, 'deal', { firstPlayerNum: 1 });
  await f.perform(2, 'cancel');
  return f;
}
function failRestartPublication(f, numbers) {
  const oldSession = f.state().sessionId;
  let failed = false;
  f.db.putHook = path => {
    if (!failed && path === f.canonicalPath && f.state().sessionId !== oldSession) {
      failed = true; for (const number of numbers) f.db.failWrites.add(f.path(number));
    }
  };
  return () => { assert.equal(failed, true, 'storage failed only after the new canonical session committed'); f.db.putHook = null; f.db.failWrites.clear(); };
}

test('ordinary Dixit and Once restart rotate the sealed epoch and can deal again through the same private URLs', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), before = f.db.get(f.canonicalPath);
    const oldCapsule = before.executor.capsule;
    f.advance(1050); await f.perform(3, 'restart');
    const current = f.db.get(f.canonicalPath), capsule = current.executor.capsule;
    assert.notEqual(capsule, oldCapsule); assert.notEqual(current.executor.epoch, before.executor.epoch);
    assert.notEqual(f.state().sessionId, before.executor.sessionId);
    assert.equal(current.executor.sessionId, f.state().sessionId);
    assert.equal(f.state().phase, 'LOBBY'); assert.equal(f.state().sharedControls, true);
    assert.equal(current.executor.presence[2], before.executor.presence[2]); assert.equal(current.executor.presence[3], 1050);
    assert.equal(current.executor.previousCapsule, undefined, 'the bridge is retired after every card is published');
    for (const seat of f.seats) {
      assert.equal(f.card(seat.playerNum).hubExecutor.capsule, capsule);
      assert.equal(f.card(seat.playerNum).hubExecutor.sessionId, f.state().sessionId);
      assert.equal(f.view(seat.playerNum).sessionId, f.state().sessionId);
    }
    await assert.rejects(f.service.execute({ capsule: oldCapsule, token: f.seats[1].token }), error => error.code === 'stale_session');
    await f.perform(2, 'deal', { firstPlayerNum: 1 });
    assert.equal(f.state().phase, game === 'dixit' ? 'CLUE' : 'CHOOSING_FIRST');
    assertPlayerOnly(f); assertCredentialsPrivate(f);
  }
});

test('a new private card repairs a partial restart publication using the committed replacement epoch', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), oldCapsule = f.card(1).hubExecutor.capsule;
    const restore = failRestartPublication(f, [1]);
    f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
    await new Promise(resolve => setImmediate(resolve)); restore();
    const capsule = f.db.get(f.canonicalPath).executor.capsule;
    assert.notEqual(capsule, oldCapsule); assert.equal(f.card(1).hubExecutor.capsule, oldCapsule);
    assert.equal(f.card(2).hubExecutor.capsule, capsule);
    assert.equal(f.db.get(f.canonicalPath).executor.previousCapsule, oldCapsule);
    await f.pulse(2);
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, capsule);
    assert.equal(f.db.get(f.canonicalPath).executor.previousCapsule, undefined);
    await f.perform(2, 'deal', { firstPlayerNum: 1 });
  }
});

test('all failed restart projections are repaired by an old player pulse while old direct commands remain forbidden', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), oldCapsule = f.card(1).hubExecutor.capsule;
    const restore = failRestartPublication(f, [1, 2, 3]);
    f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
    await new Promise(resolve => setImmediate(resolve)); restore();
    const committed = f.db.get(f.canonicalPath), capsule = committed.executor.capsule;
    assert.notEqual(capsule, oldCapsule); assert.equal(committed.executor.previousCapsule, oldCapsule);
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, oldCapsule);
    // Even knowledge of the new session does not turn an old credential into
    // permission to issue a new command while its publication bridge is open.
    await assert.rejects(f.service.execute({ capsule: oldCapsule, token: f.seats[1].token,
      command: { id: 'old-credential-deal', type: 'deal', sessionId: f.state().sessionId, turnId: f.state().turnId } }), error => error.code === 'stale_session');
    assert.deepEqual(f.db.get(f.canonicalPath), committed);
    const pending = f.mailbox(2, 'deal', { firstPlayerNum: 1 });
    await f.pulse(3);
    assert.equal(f.state().phase, 'LOBBY', 'the old-ticket bridge repairs projections without processing a new-session mailbox');
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, capsule);
    assert.equal(f.db.get(f.canonicalPath).executor.previousCapsule, undefined);
    await assert.rejects(f.service.execute({ capsule: oldCapsule, token: f.seats[1].token }), error => error.code === 'stale_session');
    await f.pulse(2);
    assert.equal(f.view(2).reply.id, pending.id);
    assert.equal(f.state().phase, game === 'dixit' ? 'CLUE' : 'CHOOSING_FIRST'); assertPlayerOnly(f);
  }
});

test('simultaneous restart commands publish only the winning committed ticket after an ETag conflict', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), old = f.db.get(f.canonicalPath), state = f.state();
    const results = await Promise.allSettled([2, 3].map(number => f.service.execute({ capsule: old.executor.capsule,
      token: f.seats[number - 1].token, command: { id: 'racing-restart-' + number, type: 'restart', sessionId: state.sessionId, turnId: state.turnId } })));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'stale_session').length, 1);
    assert.ok(f.db.conflicts > 0, 'the ETag boundary really retried a conflicting restart');
    const current = f.db.get(f.canonicalPath);
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, current.executor.capsule);
    const ticket = unseal(current.executor.capsule, keyFrom(secret));
    assert.equal(ticket.sessionId, f.state().sessionId); assert.equal(ticket.epoch, current.executor.epoch);
    await f.perform(2, 'deal', { firstPlayerNum: 1 });
  }
});

test('a pending restart bridge cannot overwrite a game switch that inherited an old ticket', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), restore = failRestartPublication(f, [1, 2, 3]);
    f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
    await new Promise(resolve => setImmediate(resolve)); restore();
    const newer = { ...f.card(1), game: 'scene', round: 99 }; f.db.set(f.path(1), newer);
    const canonical = f.db.get(f.canonicalPath);
    await assert.rejects(f.pulse(3), error => error.code === 'game_switched');
    assert.deepEqual(f.card(1), newer); assert.deepEqual(f.db.get(f.canonicalPath), canonical);
  }
});

test('an old publication bridge never authorizes a replacement ticket with changed seat bindings', async () => {
  const f = await endedRoom('dixit'), restore = failRestartPublication(f, [1, 2, 3]);
  f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
  await new Promise(resolve => setImmediate(resolve)); restore();
  const current = f.db.get(f.canonicalPath), ticket = unseal(current.executor.capsule, keyFrom(secret));
  ticket.seats[0].token = '9'.repeat(20); ticket.seats[0].path = 'rooms/' + f.code + '/players/' + ticket.seats[0].token;
  current.executor.capsule = seal(ticket, keyFrom(secret)); f.db.set(f.canonicalPath, current);
  await assert.rejects(f.pulse(2), error => error.code === 'stale_session');
  assert.deepEqual(f.db.get(f.canonicalPath), current);
});


function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
test('an old epoch delayed before publication cannot write after restart, and an old card alone repairs total publication failure', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const reached = deferred(), release = deferred(), oldTime = 2000;
    const engineAdapter = adapters[game], games = { ...adapters, [game]: { ...engineAdapter,
      async project(state, seat, ctx) {
        if (ctx.now === oldTime && seat.playerNum > 0) { reached.resolve(); await release.promise; }
        return engineAdapter.project(state, seat, ctx);
      } } };
    const f = await endedRoom(game, { games }), oldCapsule = f.card(2).hubExecutor.capsule;
    f.advance(oldTime); const oldRequest = f.pulse(2); await reached.promise;
    f.advance(2500); const restore = failRestartPublication(f, [1, 2, 3]);
    f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
    await new Promise(resolve => setImmediate(resolve)); restore();
    const before = f.seats.map(seat => f.card(seat.playerNum));
    release.resolve(); await oldRequest;
    for (const seat of f.seats) assert.deepEqual(f.card(seat.playerNum), before[seat.playerNum - 1], 'fresh canonical epoch stops the delayed old publisher');
    assert.equal(f.card(2).hubExecutor.capsule, oldCapsule);
    await f.pulse(2);
    const current = f.db.get(f.canonicalPath);
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, current.executor.capsule);
    assert.equal(current.executor.previousCapsule, undefined);
    await f.perform(2, 'deal', { firstPlayerNum: 1 });
  }
});

test('the predecessor bridge repairs a late old-session write in the remaining cross-node epoch-read race', async () => {
  for (const game of ['dixit', 'onceupon']) {
    const f = await endedRoom(game), oldCapsule = f.card(1).hubExecutor.capsule, reached = deferred(), release = deferred();
    f.db.beforePut = async (path, value) => {
      if (path === f.path(1) && value.hubExecutor?.capsule === oldCapsule && value.hubExecutor.publishedAt === 2000) {
        reached.resolve(); await release.promise;
      }
    };
    f.advance(2000); const oldRequest = f.pulse(2); await reached.promise;
    f.advance(2500); const restore = failRestartPublication(f, [1, 2, 3]);
    f.mailbox(3, 'restart'); await assert.rejects(f.pulse(3), error => error.code === 'storage_unavailable');
    await new Promise(resolve => setImmediate(resolve)); restore();
    const before = f.card(1);
    release.resolve(); await oldRequest; f.db.beforePut = null;
    assert.equal(f.card(1).hubExecutor.capsule, oldCapsule);
    assert.equal(f.card(1).hubExecutor.publishedAt, 2000, 'the delayed PUT completed after its epoch check and the new canonical commit');
    assert.notDeepEqual(f.card(1), before, 'this really changed the restart snapshot fingerprint');
    await f.pulse(3);
    const current = f.db.get(f.canonicalPath);
    assert.equal(f.state().phase, 'LOBBY');
    for (const seat of f.seats) assert.equal(f.card(seat.playerNum).hubExecutor.capsule, current.executor.capsule);
    assert.equal(current.executor.previousCapsule, undefined);
    await assert.rejects(f.service.execute({ capsule: oldCapsule, token: f.seats[1].token }), error => error.code === 'stale_session');
    await f.perform(2, 'deal', { firstPlayerNum: 1 });
  }
});
