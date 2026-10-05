const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dixit-engine.js');
let serial = 0;
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) }));
const create = (count = 4, seed = 731) => E.create({ id: 'dixit-test', roster: roster(count), seed, now: 1000 });
const command = (s, type, actor = 0, extra = {}) => ({
  id: 'cmd-' + (++serial), sessionId: s.sessionId, turnId: s.turnId,
  seed: 3571 + serial, now: 2000 + serial, type, actor, ...extra,
});
const act = (s, type, actor = 0, extra = {}) => E.apply(s, command(s, type, actor, extra));
const started = (count = 4, first = 1) => act(create(count), 'deal', 0, { firstPlayerNum: first });
const clone = value => JSON.parse(JSON.stringify(value));
function gameplay(s) { const c = clone(s); delete c.seen; delete c.replies; delete c.revision; return c; }
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
function wire(value) {
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
  return entries.length ? Object.fromEntries(entries) : null;
}
function conservation(s) {
  if (s.phase === 'LOBBY') return;
  // Submissions hold the physical cards; table and result are ordered references.
  const physical = [...E.list(s.deck), ...E.list(s.discard),
    ...s.roster.flatMap(p => E.list(s.hands[p.playerNum])),
    ...s.roster.flatMap(p => E.list(s.submissions[p.playerNum]))];
  assert.equal(physical.length, 84);
  assert.equal(new Set(physical).size, 84);
  assert.deepEqual(physical.slice().sort(), Array.from({ length: 84 }, (_, i) => 'd' + String(i + 1).padStart(3, '0')));
}
function tableReady(s) {
  s = act(s, 'story', s.storyteller, { cardId: s.hands[s.storyteller][0], clue: 'A distant memory' });
  for (const player of s.roster.filter(p => p.playerNum !== s.storyteller)) {
    s = act(s, 'submit', player.playerNum, { cardIds: s.hands[player.playerNum].slice(0, s.roster.length === 3 ? 2 : 1) });
  }
  assert.equal(s.phase, 'VOTE'); conservation(s); return s;
}
function ballots(s, targets) {
  for (const seat of s.roster.filter(p => p.playerNum !== s.storyteller).map(p => p.playerNum)) {
    s = act(s, 'vote', seat, { cardId: s.submissions[targets[seat]][0] });
  }
  return s;
}
function scores(s) { return s.lastRound.rows.map(row => row.delta); }

test('setup accepts only unique positive 3–8 seat rosters', () => {
  for (const count of [3, 4, 8]) {
    const s = create(count);
    assert.equal(s.phase, 'LOBBY'); assert.equal(s.round, 0); assert.equal(s.storyteller, null);
    assert.deepEqual(s.roster, roster(count)); assert.deepEqual(s.hands, {});
    assert.equal(E.view(s, 0).dixit.actions.deal, true);
  }
  for (const count of [0, 1, 2, 9]) assert.throws(() => create(count), /invalid_setup/);
  assert.throws(() => E.create({ roster: roster(4) }), /invalid_setup/);
  for (const invalid of [[{ playerNum: 1 }, { playerNum: 1 }, { playerNum: 3 }],
    [{ playerNum: 0 }, { playerNum: 2 }, { playerNum: 3 }],
    [{ playerNum: 1 }, { playerNum: 2 }, { playerNum: '3' }]]) {
    assert.throws(() => E.create({ id: 'x', roster: invalid }), /invalid_roster/);
  }
});

test('optional readiness and host-controlled deals create correct private hand sizes', () => {
  for (const count of [3, 4, 8]) {
    let s = create(count);
    s = act(s, 'ready', 1, { value: true });
    assert.equal(E.view(s, 1).dixit.roster[0].ready, true);
    assert.equal(E.view(s, 0).dixit.actions.deal, true, 'readiness is optional');
    const denied = act(s, 'deal', 1);
    assert.equal(denied.phase, 'LOBBY'); assert.equal(denied.replies[1].error, 'not_available');
    s = act(s, 'deal', 0, { firstPlayerNum: 2 });
    assert.equal(s.phase, 'CLUE'); assert.equal(s.storyteller, 2); assert.equal(s.round, 1);
    for (const p of s.roster) {
      assert.equal(s.hands[p.playerNum].length, count === 3 ? 7 : 6);
      assert.deepEqual(E.view(s, p.playerNum).dixit.hand, s.hands[p.playerNum]);
    }
    assert.equal(s.deck.length, 84 - count * (count === 3 ? 7 : 6)); conservation(s);
  }
  let s = create(); s = act(s, 'deal', 0, { firstPlayerNum: 99 });
  assert.equal(s.phase, 'LOBBY'); assert.equal(s.replies[0].error, 'invalid_player');
  assert.equal(act(create(), 'ready', 0, { value: true }).replies[0].error, 'not_available');
});

test('random dealing, first teller, table shuffle, and repeated transactions are deterministic', () => {
  const s = create(), deal = command(s, 'deal');
  const a = E.apply(s, deal), b = E.apply(s, deal);
  assert.deepEqual(a, b); assert.ok(a.roster.some(p => p.playerNum === a.storyteller));
  assert.equal(E.apply(a, deal), a, 'duplicate successful request is ignored');
  assert.notDeepEqual(E.shuffle(a.deck, 1), E.shuffle(a.deck, 2));
  let ready = act(a, 'story', a.storyteller, { cardId: a.hands[a.storyteller][0], clue: 'Dream' });
  const others = ready.roster.filter(p => p.playerNum !== ready.storyteller);
  for (const p of others.slice(0, -1)) ready = act(ready, 'submit', p.playerNum, { cardIds: [ready.hands[p.playerNum][0]] });
  const last = others.at(-1).playerNum, submit = command(ready, 'submit', last, { cardIds: [ready.hands[last][0]] });
  assert.deepEqual(E.apply(ready, submit), E.apply(ready, submit));
  assert.equal(E.apply(E.apply(ready, submit), submit).phase, 'VOTE');
});

test('story requires the storyteller, a held card, and a nonempty clue of at most 180 characters', () => {
  const s = started(), cardId = s.hands[1][0];
  for (const [actor, extra, error] of [[0, { cardId, clue: 'x' }, 'not_available'],
    [2, { cardId, clue: 'x' }, 'not_available'], [1, { cardId: s.hands[2][0], clue: 'x' }, 'invalid_card'],
    [1, { cardId, clue: '  ' }, 'invalid_clue'], [1, { cardId, clue: null }, 'invalid_clue'],
    [1, { cardId, clue: 'x'.repeat(181) }, 'invalid_clue']]) {
    const next = act(s, 'story', actor, extra);
    assert.equal(next.replies[actor].error, error); assert.deepEqual(gameplay(next), gameplay(s));
  }
  const good = act(s, 'story', 1, { cardId, clue: '  🌙'.trim().repeat(180) + '  ' });
  assert.equal(good.phase, 'SUBMIT'); assert.equal(Array.from(good.clue).length, 180);
  assert.deepEqual(good.submissions[1], [cardId]); assert.equal(good.hands[1].includes(cardId), false); conservation(good);
});

test('3-player decoys require two distinct held cards and only the last submission reveals the table', () => {
  let s = started(3); s = act(s, 'story', 1, { cardId: s.hands[1][0], clue: 'A secret' });
  const ids = s.hands[2].slice(0, 2);
  for (const bad of [undefined, [], [ids[0]], [ids[0], ids[0]], [ids[0], s.hands[3][0]], [...ids, s.hands[2][2]]]) {
    const next = act(s, 'submit', 2, { cardIds: bad });
    assert.equal(next.replies[2].error, 'invalid_cards'); assert.deepEqual(gameplay(next), gameplay(s));
  }
  s = act(s, 'submit', 2, { cardIds: ids }); assert.equal(s.phase, 'SUBMIT'); assert.deepEqual(s.table, []);
  const second = act(s, 'submit', 2, { cardIds: s.hands[2].slice(0, 2) });
  assert.equal(second.replies[2].error, 'not_available'); assert.deepEqual(gameplay(second), gameplay(s));
  s = act(s, 'submit', 3, { cardIds: s.hands[3].slice(0, 2) });
  assert.equal(s.phase, 'VOTE'); assert.equal(s.table.length, 5); conservation(s);
});

test('vote rejects own decoys, foreign cards, repeat votes, and storyteller/host votes', () => {
  let s = tableReady(started(3));
  for (const cardId of s.submissions[2]) {
    const denied = act(s, 'vote', 2, { cardId });
    assert.equal(denied.replies[2].error, 'invalid_card'); assert.deepEqual(gameplay(denied), gameplay(s));
  }
  for (const actor of [0, 1]) assert.equal(act(s, 'vote', actor, { cardId: s.table[0] }).replies[actor].error, 'not_available');
  assert.equal(act(s, 'vote', 2, { cardId: s.deck[0] }).replies[2].error, 'invalid_card');
  s = act(s, 'vote', 2, { cardId: s.submissions[1][0] });
  assert.equal(act(s, 'vote', 2, { cardId: s.submissions[3][0] }).replies[2].error, 'not_available');
  assert.equal(E.view(s, 2).dixit.actions.vote, false);
});

test('host must wait for all votes and cannot score or reveal twice', () => {
  let s = tableReady(started());
  assert.equal(E.view(s, 0).dixit.actions.reveal, false);
  let denied = act(s, 'reveal'); assert.equal(denied.replies[0].error, 'not_available');
  assert.deepEqual(gameplay(denied), gameplay(s));
  s = ballots(s, { 2: 1, 3: 2, 4: 2 });
  assert.equal(s.phase, 'VOTE'); assert.equal(E.view(s, 0).dixit.actions.reveal, true);
  denied = act(s, 'reveal', 2); assert.equal(denied.replies[2].error, 'not_available');
  s = act(s, 'reveal'); assert.equal(s.phase, 'REVEAL');
  denied = act(s, 'reveal'); assert.deepEqual(gameplay(denied), gameplay(s));
  assert.equal(denied.replies[0].error, 'not_available');
});

test('current and classic base scoring vectors: some, all, and no correct guesses', () => {
  const examples = [[{ 2: 1, 3: 2, 4: 2 }, [3, 5, 0, 0], 'some'],
    [{ 2: 1, 3: 1, 4: 1 }, [0, 2, 2, 2], 'all'],
    [{ 2: 3, 3: 2, 4: 2 }, [0, 4, 3, 2], 'none']];
  for (const [targets, expected, outcome] of examples) {
    const s = act(ballots(tableReady(started()), targets), 'reveal');
    assert.deepEqual(scores(s), expected); assert.equal(s.lastRound.outcome, outcome);
    assert.equal(s.lastRound.answerCardId, s.submissions[1][0]); conservation(s);
  }
});

test('3-player base scoring includes bonuses from both decoys and replenishes 1/2/2 cards', () => {
  for (const [targets, expected] of [[{ 2: 1, 3: 1 }, [0, 2, 2]],
    [{ 2: 3, 3: 2 }, [0, 3, 3]], [{ 2: 1, 3: 2 }, [3, 4, 0]]]) {
    let s = tableReady(started(3));
    assert.deepEqual(s.roster.map(p => s.hands[p.playerNum].length), [6, 5, 5]);
    // Explicitly select the second decoy to exercise the two-card ownership map.
    for (const seat of [2, 3]) {
      const target = targets[seat], index = target === 1 ? 0 : 1;
      s = act(s, 'vote', seat, { cardId: s.submissions[target][index] });
    }
    s = act(s, 'reveal'); assert.deepEqual(scores(s), expected);
    const before = s.deck.length; s = act(s, 'nextRound');
    assert.deepEqual(s.roster.map(p => s.hands[p.playerNum].length), [7, 7, 7]);
    assert.equal(s.deck.length, before - 5); assert.equal(s.storyteller, 2); conservation(s);
  }
});

test('current 8-player basic rules have uncapped decoy bonuses, including when nobody is correct', () => {
  let s = tableReady(started(8));
  const targets = { 2: 3, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2 };
  s = act(ballots(s, targets), 'reveal');
  assert.deepEqual(scores(s), [0, 8, 3, 2, 2, 2, 2, 2]);
  assert.equal(s.lastRound.rows[1].bonus, 6, 'the Odyssey three-point cap does not apply'); conservation(s);
});

test('nextRound discards played cards, refills private hands, clears secrets, and rotates in roster order', () => {
  let s = started(); s.roster = [s.roster[0], s.roster[2], s.roster[1], s.roster[3]];
  s = act(ballots(tableReady(s), { 2: 1, 3: 2, 4: 2 }), 'reveal');
  const table = s.table.slice(), oldScores = clone(s.scores); s = act(s, 'nextRound');
  assert.equal(s.phase, 'CLUE'); assert.equal(s.storyteller, 3); assert.equal(s.round, 2);
  assert.deepEqual(s.discard.slice().sort(), table.slice().sort()); assert.deepEqual(s.scores, oldScores);
  assert.deepEqual(s.submissions, {}); assert.deepEqual(s.votes, {}); assert.deepEqual(s.table, []);
  assert.equal(s.lastRound, null); assert.equal(s.clue, '');
  for (const p of s.roster) assert.equal(s.hands[p.playerNum].length, 6); conservation(s);
});

test('draw-pile shortage reshuffles the remaining cards with discards, conserving all 84 cards', () => {
  for (const count of [3, 4, 8]) {
    let s = started(count), reshuffled = false;
    for (let i = 0; i < 25 && !reshuffled; i++) {
      s = tableReady(s);
      // No correct answers keeps the storyteller at zero; reset tallies to
      // exercise draw exhaustion independently of the 30-point finish rule.
      s.scores = {};
      const eligible = s.roster.filter(p => p.playerNum !== s.storyteller).map(p => p.playerNum);
      const targets = Object.fromEntries(eligible.map((seat, index) => [seat, eligible[(index + 1) % eligible.length]]));
      s = act(ballots(s, targets), 'reveal');
      const need = count === 3 ? 5 : count, shortage = s.deck.length < need;
      const cmd = command(s, 'nextRound'); assert.deepEqual(E.apply(s, cmd), E.apply(s, cmd));
      s = E.apply(s, cmd); conservation(s);
      if (shortage) { assert.deepEqual(s.discard, []); reshuffled = true; }
    }
    assert.equal(reshuffled, true, 'deck must eventually be replenished from discards');
    assert.equal(s.phase, 'CLUE', 'unlike old printings, empty draw pile never ends the current edition');
  }
});

test('round-end 30-point finish chooses the highest score and supports shared winners', () => {
  let s = tableReady(started()); s.scores = { 1: 27, 2: 25, 3: 0, 4: 0 };
  s = act(ballots(s, { 2: 1, 3: 2, 4: 2 }), 'reveal');
  assert.equal(s.phase, 'FINISHED'); assert.deepEqual(s.winners, [1, 2]);
  assert.deepEqual(E.view(s, 0).dixit.winners, [1, 2]);
  assert.equal(E.view(s, 0).dixit.actions.nextRound, false);
  assert.equal(act(s, 'nextRound').replies[0].error, 'not_available'); conservation(s);
  s = tableReady(started()); s.scores = { 1: 28, 2: 29, 3: 0, 4: 0 };
  s = act(ballots(s, { 2: 1, 3: 2, 4: 2 }), 'reveal');
  assert.deepEqual(s.winners, [2]); assert.equal(s.scores[2], 34);
});

test('phase transitions alone advance the turn; concurrent submissions and votes can share a turn', () => {
  let s = started(); s = act(s, 'story', 1, { cardId: s.hands[1][0], clue: 'Together' });
  const submitTurn = s.turnId;
  const pending = [2, 3, 4].map(actor => command(s, 'submit', actor, { cardIds: [s.hands[actor][0]] }));
  s = E.apply(s, pending[0]); assert.equal(s.turnId, submitTurn);
  s = E.apply(s, pending[1]); assert.equal(s.turnId, submitTurn);
  s = E.apply(s, pending[2]); assert.equal(s.turnId, submitTurn + 1);
  const voteTurn = s.turnId, answer = s.submissions[1][0];
  const votes = [2, 3, 4].map(actor => command(s, 'vote', actor, { cardId: answer }));
  for (const cmd of votes) s = E.apply(s, cmd);
  assert.equal(s.turnId, voteTurn); assert.equal(s.phase, 'VOTE');
  s = act(s, 'reveal'); assert.equal(s.turnId, voteTurn + 1);
});

test('known actors receive stale session/turn receipts; invalid identities and duplicate ids cannot act', () => {
  let s = started();
  for (const extra of [{ sessionId: 'old', error: 'stale_session' }, { turnId: s.turnId - 1, error: 'stale_turn' }]) {
    const cmd = command(s, 'story', 1, { cardId: s.hands[1][0], clue: 'x', ...extra });
    const denied = E.apply(s, cmd); assert.equal(denied.replies[1].error, extra.error);
    assert.deepEqual(gameplay(denied), gameplay(s)); assert.equal(E.apply(denied, cmd), denied);
  }
  for (const actor of [null, '', true, undefined, 99, -1, 1.5]) assert.equal(E.apply(s, command(s, 'cancel', 0, { actor })), s);
  assert.equal(E.apply(s, { ...command(s, 'cancel'), id: '' }), s);
  const id = 'same-per-seat'; s = act(s, 'pause', 0, { id });
  const denied = act(s, 'resume', 2, { id }); assert.equal(denied.replies[2].error, 'not_available');
});

test('pause/resume freezes actions, rejects in-flight commands, and leaves cards untouched', () => {
  let s = started(), cmd = command(s, 'story', 1, { cardId: s.hands[1][0], clue: 'Wait' });
  const oldCards = clone(s.hands); s = act(s, 'pause');
  assert.equal(s.paused, true); assert.equal(E.view(s, 1).dixit.actions.story, false);
  assert.equal(E.view(s, 0).dixit.actions.resume, true);
  assert.equal(E.apply(s, cmd).replies[1].error, 'stale_turn');
  assert.equal(act(s, 'story', 1, { cardId: oldCards[1][0], clue: 'Wait' }).replies[1].error, 'paused');
  const pausedTurn = s.turnId; s = act(s, 'resume');
  assert.equal(s.turnId, pausedTurn + 1); assert.equal(s.paused, false); assert.deepEqual(s.hands, oldCards); conservation(s);
});

test('cancel is host-only and restart resets gameplay, readiness, receipts, and the session', () => {
  let s = tableReady(started());
  assert.equal(act(s, 'cancel', 2).replies[2].error, 'not_available');
  s = act(s, 'cancel'); assert.equal(s.phase, 'CANCELLED');
  assert.deepEqual(E.view(s, 0).dixit.table, []); assert.equal(E.view(s, 0).dixit.result, null); conservation(s);
  const oldSession = s.sessionId, oldTurn = s.turnId, oldRoster = clone(s.roster);
  const cmd = command(s, 'restart'); s = E.apply(s, cmd);
  assert.equal(s.phase, 'LOBBY'); assert.equal(s.turnId, oldTurn + 1); assert.notEqual(s.sessionId, oldSession);
  assert.deepEqual(s.roster, oldRoster); assert.deepEqual(s.readiness, {}); assert.deepEqual(s.hands, {});
  assert.deepEqual(s.deck, []); assert.deepEqual(s.scores, {}); assert.equal(s.round, 0); assert.equal(s.lastRound, null);
  assert.deepEqual(Object.keys(s.replies), ['0']); assert.equal(E.apply(s, cmd), s);
  s = act(s, 'deal', 0, { firstPlayerNum: 1 }); assert.equal(s.phase, 'CLUE'); conservation(s);
});

test('views hide all other hands, card owners, answers, deck order, and ballots until reveal', () => {
  let s = started(); s = act(s, 'story', 1, { cardId: s.hands[1][0], clue: 'Hidden' });
  s = act(s, 'submit', 2, { cardIds: [s.hands[2][0]] });
  for (const actor of [0, 1, 2, 3, 4, 99]) {
    const v = E.view(s, actor).dixit;
    assert.deepEqual(v.table, []); assert.equal(v.result, null);
    for (const key of ['hands', 'submissions', 'votes', 'deck', 'discard', 'answerCardId', 'rngState', 'seen', 'lastRound']) assert.equal(key in v, false);
    if ([1, 2, 3, 4].includes(actor)) {
      assert.deepEqual(v.hand, s.hands[actor]); assert.deepEqual(v.ownSubmitted, E.list(s.submissions[actor]));
      const visible = JSON.stringify(v);
      for (const p of s.roster.filter(p => p.playerNum !== actor)) for (const card of s.hands[p.playerNum]) assert.equal(visible.includes(card), false);
      for (const p of s.roster.filter(p => p.playerNum !== actor)) for (const card of E.list(s.submissions[p.playerNum])) assert.equal(visible.includes(card), false);
    } else for (const key of ['hand', 'ownSubmitted', 'ownVote']) assert.equal(key in v, false);
  }
  for (const seat of [3, 4]) s = act(s, 'submit', seat, { cardIds: [s.hands[seat][0]] });
  s = act(s, 'vote', 2, { cardId: s.submissions[1][0] });
  const host = E.view(s, 0).dixit, other = E.view(s, 3).dixit, own = E.view(s, 2).dixit;
  assert.deepEqual(host.table, s.table); assert.equal(host.result, null); assert.equal(other.ownVote, null);
  assert.equal(own.ownVote, s.submissions[1][0]); assert.equal('votes' in host, false);
  s = act(s, 'vote', 3, { cardId: s.submissions[2][0] });
  s = act(s, 'vote', 4, { cardId: s.submissions[2][0] }); s = act(s, 'reveal');
  assert.deepEqual(E.view(s, 0).dixit.result, s.lastRound);
  s = act(s, 'nextRound'); assert.equal(E.view(s, 0).dixit.result, null); assert.deepEqual(E.view(s, 2).dixit.ownSubmitted, []);
});

test('Firebase omitted containers and numeric-key objects preserve rules, views, and private projection', () => {
  const lobby = create();
  assert.deepEqual(E.view(lobby, 0), E.view(wire(lobby), 0));
  assert.deepEqual(E.view(lobby, 2), E.view(wire(lobby), 2));
  let s = tableReady(started(3)); s = ballots(s, { 2: 1, 3: 2 });
  const cmd = command(s, 'reveal');
  assert.deepEqual(E.apply(s, cmd), E.apply(wire(s), cmd));
  s = E.apply(wire(s), cmd); assert.deepEqual(E.view(s, 0), E.view(wire(s), 0));
  assert.deepEqual(E.view(s, 2), E.view(wire(s), 2));
  const next = command(s, 'nextRound'); assert.deepEqual(E.apply(s, next), E.apply(wire(s), next)); conservation(E.apply(wire(s), next));
});

test('apply and view do not mutate input states or commands, and public results are isolated copies', () => {
  const s = freeze(started()), cmd = freeze(command(s, 'story', 1, { cardId: s.hands[1][0], clue: 'Pure' }));
  assert.equal(E.apply(s, cmd).phase, 'SUBMIT'); assert.equal(s.phase, 'CLUE');
  E.view(s, 1); assert.equal(s.phase, 'CLUE');
  const revealed = freeze(act(ballots(tableReady(started()), { 2: 1, 3: 2, 4: 2 }), 'reveal'));
  const v = E.view(revealed, 2); v.dixit.result.rows[0].cardIds.push('d999'); v.dixit.hand.push('d999');
  assert.equal(JSON.stringify(revealed).includes('d999'), false);
});
