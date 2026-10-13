'use strict';
// Real executor/adapters and Firebase conditional writes, without external rooms.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createExecutor, keyFrom, GRACE_MS } = require('../runtime/hub-executor-core.cjs');
const { adapters } = require('../runtime/story-executor.cjs');
const { protectAdapter } = require('../runtime/life-story-state.cjs');
const DIXIT = require('../dixit-engine.js');
const LIFE = require('../life-story-engine.js');
const secret = '47'.repeat(32);
const copy = value => value == null ? null : structuredClone(value);

function firebaseValue(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, child]) => [key, firebaseValue(child)]).filter(([, child]) => child != null);
  if (!entries.length) return null;
  if (Array.isArray(value)) { const result = []; for (const [key, child] of entries) result[Number(key)] = child; return result; }
  return Object.fromEntries(entries);
}
class FirebaseHTTP {
  constructor() { this.nodes = new Map(); this.versions = new Map(); this.writes = []; this.conflicts = 0; }
  set(path, value) { this.nodes.set(path, firebaseValue(copy(value))); this.versions.set(path, (this.versions.get(path) || 0) + 1); }
  get(path) { return copy(this.nodes.get(path)); }
  async fetch(url, options = {}) {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    const etag = '"' + (this.versions.get(path) || 0) + '"';
    if (!options.method || options.method === 'GET') {
      const value = this.get(path);
      return { ok: true, status: 200, headers: new Headers({ etag }), json: async () => value };
    }
    assert.equal(options.method, 'PUT'); assert.ok(options.headers['If-Match'], 'writes must use Firebase ETags');
    if (options.headers['If-Match'] !== etag) { this.conflicts++; return { ok: false, status: 412 }; }
    const next = JSON.parse(options.body); this.set(path, next); this.writes.push({ path, value: copy(next) });
    return { ok: true, status: 200, json: async () => copy(next) };
  }
}
function fixture() {
  const db = new FirebaseHTTP(), code = 'LIFETEST', controlToken = 'a'.repeat(32);
  const seats = [1, 2, 3, 4].map(playerNum => ({ playerNum, token: String(playerNum).repeat(32) }));
  const roster = seats.map(s => ({ playerNum: s.playerNum, name: ['A', 'B', 'C', 'D'][s.playerNum - 1] }));
  const canonicalPath = `rooms/${code}/players/${controlToken}`;
  const path = number => `rooms/${code}/players/${seats[number - 1].token}`;
  let clock = 1000, serial = 0;
  const protectedAdapter = protectAdapter(adapters.dixit, keyFrom(secret));
  const initial = DIXIT.create({ mode: 'life_story', id: 'life-service-session', roster, hostPlayerNum: 1, seed: 673, now: clock });
  db.set(canonicalPath, { stateJson: JSON.stringify(initial), revision: 1, owner: 'old-browser', leaseUntil: 15000 });
  for (const seat of seats) db.set(path(seat.playerNum), DIXIT.view(initial, seat.playerNum, clock));
  const buildService = () => createExecutor({ secret, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db), now: () => clock, games: adapters });
  let service = buildService();
  const state = () => protectedAdapter.decode(db.get(canonicalPath));
  const card = number => db.get(path(number));
  const view = number => card(number).dixit;
  function command(number, type, extra = {}) {
    const current = view(number);
    return { id: `life-mailbox-${++serial}`, type, sessionId: current.sessionId, turnId: current.turnId,
      cycleId: current.cycleId ?? 0, expectedRevision: current.lifeRevision, ...extra };
  }
  function mailbox(number, type, extra = {}) {
    const action = typeof type === 'object' ? type : command(number, type, extra);
    db.set(path(number), { ...card(number), dixitAction: action }); return action;
  }
  const pulse = number => service.execute({ capsule: card(number).hubExecutor.capsule, token: seats[number - 1].token });
  async function act(number, type, extra = {}) {
    const action = mailbox(number, type, extra); await pulse(number);
    const reply = view(number).reply;
    assert.equal(reply?.id, action.id, 'published receipt belongs to the command');
    assert.equal(reply.error || '', '', `${type}: ${reply.error}`); return action;
  }
  const register = () => service.register({ game: 'dixit', code, controlToken, seats, sessionId: state().sessionId });
  function assertCanonicalPrivate() {
    const raw = db.get(canonicalPath), header = JSON.parse(raw.stateJson);
    assert.equal(typeof raw.lifeStateCipher, 'string'); assert.equal(typeof raw.lifeHistoryCipher, 'string');
    for (const key of ['lifeRoom', 'hands', 'deck', 'submissions', 'votes', 'answer']) assert.equal(Object.hasOwn(header, key), false, key);
    assert.equal(header.mode, 'life_story'); assert.equal(header.publicLifeView.playerNum, 0);
    assert.deepEqual(header.publicLifeView.hand || [], []); assert.deepEqual(header.publicLifeView.candidates || [], []);
    assert.equal(header.publicLifeView.storyCard ?? null, null);
    if (state().phase === 'VOTING') for (const card of header.publicLifeView.table) {
      assert.equal(Object.hasOwn(card, 'ownerPlayerNum'), false); assert.equal(Object.hasOwn(card, 'isAnswer'), false); assert.equal(Object.hasOwn(card, 'voterNums'), false);
    }
    LIFE.assertCardInvariant(state());
  }
  async function finishTurn(storyteller, { normal = true, beforeDiscussion = false } = {}) {
    const prep = view(storyteller); assert.equal(prep.phase, 'PREPARE');
    assert.equal((prep.candidates || []).length, normal ? 3 : 0);
    if (normal) await act(storyteller, 'choose_question', { questionId: prep.candidates[0].id });
    const answer = view(storyteller).hand[0];
    await act(storyteller, 'choose_story_card', { cardId: answer }); await act(storyteller, 'start_story');
    const others = seats.map(s => s.playerNum).filter(n => n !== storyteller);
    for (const n of others) {
      const mine = view(n); assert.equal(mine.storyCard ?? null, null); assert.deepEqual(mine.candidates || [], []);
      assert.ok(!mine.roster.some(p => Object.hasOwn(p, 'hand')));
      await act(n, 'submit_card', { cardId: mine.hand[0] });
    }
    assert.equal(state().phase, 'STORYTELLING', 'early submissions cannot advance the story');
    await act(others[0], 'withdraw_submission');
    await act(others[0], 'submit_card', { cardId: view(others[0]).hand[1] });
    await act(storyteller, 'finish_story'); assert.equal(state().phase, 'VOTING');
    const table = copy(view(others[0]).table), tableJson = JSON.stringify(table);
    assert.ok(table.every(c => !Object.hasOwn(c, 'ownerPlayerNum') && !Object.hasOwn(c, 'isAnswer') && !Object.hasOwn(c, 'voterNums')));
    assertCanonicalPrivate();
    service = buildService(); await pulse(others[0]);
    assert.equal(JSON.stringify(view(others[0]).table), tableJson, 'service restart/reconnect does not shuffle again');
    const correct = table.find(c => c.cardId === answer); assert.ok(correct);
    let finalVote;
    for (const n of others) finalVote = await act(n, 'cast_vote', { token: correct.token });
    assert.equal(state().phase, 'REVEAL_DISCUSS');
    for (const n of [1, 2, 3, 4]) assert.equal(view(n).deltas[n], 2, 'all-correct storyteller and guessers receive two');
    assert.ok(view(others[0]).table.some(c => c.isAnswer));
    assert.ok([1, 2, 3, 4].every(n => view(n).hand.length === 8));
    assert.ok([1, 2, 3, 4].every(n => !view(n).eligibleFollowUp));
    const scores = copy(state().scores), hands = copy(state().hands);
    mailbox(others.at(-1), finalVote); await pulse(others.at(-1)); await pulse(others[0]);
    assert.deepEqual(state().scores, scores); assert.deepEqual(state().hands, hands, 'vote replay cannot replenish twice');
    assertCanonicalPrivate();
    if (!beforeDiscussion) await act(1, 'finish_discussion');
  }
  return { db, code, controlToken, seats, roster, canonicalPath, path, state, card, view, command, mailbox, pulse, act, register,
    assertCanonicalPrivate, finishTurn, service: () => service, restartService() { service = buildService(); }, advance(now) { clock = now; } };
}

test('real sealed Hub/Firebase service completes A normal → C follow-up → B normal → D normal → cross-cycle', async () => {
  const f = fixture(); await f.register(); f.assertCanonicalPrivate();
  await f.act(1, 'configure', { locale: 'en', cardPackId: 'dixit_original' });
  await f.act(2, 'ready', { value: true });
  await f.act(1, 'deal');
  assert.equal(f.state().storyteller, 1); assert.equal(f.view(1).candidates.length, 3);
  await f.act(1, 'refresh_questions');
  await f.act(2, 'mulligan', { cardIds: f.view(2).hand.slice(0, 2) });
  await f.finishTurn(1); await f.act(3, 'claim_follow_up');
  assert.equal(f.state().storyteller, 3); assert.equal(f.state().lifeRoom.turn.source, 'follow_up');
  const displayed = f.state().lifeRoom.questionHistory.displayed.length;
  await f.finishTurn(3, { normal: false });
  assert.equal(f.state().lifeRoom.questionHistory.displayed.length, displayed, 'follow-up never requests questions');
  await f.act(1, 'next_in_order'); assert.equal(f.state().storyteller, 2);
  await f.finishTurn(2); await f.act(1, 'next_in_order'); assert.equal(f.state().storyteller, 4);
  await f.finishTurn(4);
  assert.equal(f.state().lifeRoom.cycle.number, 2);
  assert.equal(f.state().phase, 'FOLLOW_UP');
  assert.ok(Object.values(f.state().lifeRoom.cycle.opportunities).every(status => status === 'pending'));
  await f.act(4, 'claim_follow_up'); assert.equal(f.state().storyteller, 4);
  f.assertCanonicalPrivate();
});

test('real Firebase ETag retries accept exactly one simultaneous follow-up or host-next transition', async () => {
  for (const hostRace of [false, true]) {
    const f = fixture(); await f.register(); await f.act(1, 'deal'); await f.finishTurn(1);
    const turn = f.state().turnId, turnNumber = f.state().lifeRoom.turnNumber;
    const first = f.mailbox(3, 'claim_follow_up');
    const second = f.mailbox(hostRace ? 1 : 4, hostRace ? 'next_in_order' : 'claim_follow_up');
    await Promise.all([f.pulse(3), f.pulse(hostRace ? 1 : 4)]);
    assert.notEqual(f.state().turnId, turn); assert.equal(f.state().lifeRoom.turnNumber, turnNumber + 1);
    const replies = [f.view(3).reply, f.view(hostRace ? 1 : 4).reply];
    assert.ok(replies.some(r => r.id === first.id)); assert.ok(replies.some(r => r.id === second.id));
    assert.equal(replies.filter(r => !r.error).length, 1);
    assert.equal(Object.values(f.state().lifeRoom.cycle.opportunities).filter(s => s === 'in_progress').length, 1);
    assert.ok(f.db.conflicts > 0, 'concurrency actually crossed a Firebase ETag conflict');
    f.assertCanonicalPrivate();
  }
});

test('authenticated service binds actors, rejects missing/stale fences and forbids premature/self/storyteller votes', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'deal');
  const chosen = f.view(1).candidates[0].id;
  f.mailbox(2, 'choose_question', { actor: 1, questionId: chosen, serverAuthority: true }); await f.pulse(2);
  assert.equal(f.view(2).reply.error, 'storyteller_only'); assert.equal(f.state().lifeRoom.turn.question, null);
  const direct = f.command(2, 'choose_question', { actor: 0, questionId: chosen });
  await f.service().execute({ capsule: f.card(2).hubExecutor.capsule, token: f.seats[1].token, command: direct });
  assert.equal(f.view(2).reply.error, 'storyteller_only');
  await assert.rejects(f.service().execute({ capsule: f.card(2).hubExecutor.capsule, token: 'f'.repeat(32) }), e => e.code === 'wrong_player');
  for (const fence of ['sessionId', 'turnId', 'cycleId', 'expectedRevision']) {
    const bad = f.command(1, 'free_share'); delete bad[fence]; f.mailbox(1, bad); await f.pulse(1);
    assert.match(f.view(1).reply.error, /^stale_/); assert.equal(f.state().lifeRoom.turn.questionChosen, false);
  }
  await f.act(1, 'free_share'); await f.act(1, 'choose_story_card', { cardId: f.view(1).hand[0] }); await f.act(1, 'start_story');
  f.mailbox(3, 'claim_follow_up'); await f.pulse(3); assert.equal(f.view(3).reply.error, 'wrong_phase');
  for (const n of [2, 3, 4]) await f.act(n, 'submit_card', { cardId: f.view(n).hand[0] });
  await f.act(1, 'finish_story');
  const table = copy(f.view(2).table);
  f.mailbox(1, 'cast_vote', { token: table[0].token }); await f.pulse(1); assert.equal(f.view(1).reply.error, 'storyteller_cannot_vote');
  f.mailbox(2, 'cast_vote', { token: f.view(2).ownTableToken }); await f.pulse(2); assert.equal(f.view(2).reply.error, 'self_vote');
  f.mailbox(2, 'withdraw_submission'); await f.pulse(2); assert.equal(f.view(2).reply.error, 'wrong_phase');
  assert.deepEqual(f.view(3).table, table); f.assertCanonicalPrivate();
});

test('service restart and fresh same-room lobby preserve encrypted room question history', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'deal'); await f.finishTurn(1);
  const history = copy(f.state().lifeRoom.questionHistory), priorSession = f.state().sessionId;
  f.restartService(); await f.pulse(2); assert.deepEqual(f.state().lifeRoom.questionHistory, history);
  const old = f.db.get(f.canonicalPath);
  const fresh = DIXIT.create({ mode: 'life_story', id: 'same-room-reopened', roster: f.roster, hostPlayerNum: 1, seed: 837, now: 1100 });
  f.db.set(f.canonicalPath, { stateJson: JSON.stringify(fresh), revision: old.revision + 1, owner: '', leaseUntil: 0, lifeHistoryCipher: old.lifeHistoryCipher });
  for (const seat of f.seats) f.db.set(f.path(seat.playerNum), DIXIT.view(fresh, seat.playerNum, 1100));
  f.restartService(); await f.register(); assert.notEqual(f.state().sessionId, priorSession);
  assert.deepEqual(f.state().lifeRoom.questionHistory, history);
  await f.act(1, 'deal');
  assert.equal(f.state().lifeRoom.questionHistory.displayed.length, history.displayed.length + 3);
  const selected = new Set(history.selected.map(q => q.intentKey));
  assert.ok(f.view(1).candidates.every(q => !selected.has(q.intentKey)));
  f.assertCanonicalPrivate();
});

test('presence grace, host transfer, explicit recovery and cancellation preserve cards without issuing scores', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'deal');
  await f.act(1, 'free_share'); await f.act(1, 'choose_story_card', { cardId: f.view(1).hand[0] }); await f.act(1, 'start_story');
  const before = copy(f.state().hands);
  f.advance(1000 + GRACE_MS - 1); await f.pulse(2); assert.equal(f.state().hostPlayerNum, 1);
  f.advance(1000 + GRACE_MS + 1); await f.pulse(2); assert.equal(f.state().hostPlayerNum, 2);
  assert.equal(f.state().lifeRoom.players.find(p => p.id === '1').connected, false);
  await f.act(2, 'recover'); assert.equal(f.state().phase, 'FOLLOW_UP');
  assert.equal(f.state().lifeRoom.turn.cancelled, true); assert.deepEqual(f.state().hands, before);
  assert.ok(Object.values(f.state().scores).every(score => score === 0)); f.assertCanonicalPrivate();
});
