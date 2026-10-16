const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../bomb-relay-deck.js');
const E = require('../bomb-relay-engine.js');

const seats = n => Array.from({ length: n }, (_, i) => ({ playerNum: i + 1, name: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'][i] || `P${i + 1}` }));
let serial = 0;
function game(options = {}) {
  let state = E.create(Object.assign({ id: 'game-1', roster: seats(4), now: 1000, seed: 7 }, options));
  const act = (actor, type, extra = {}) => {
    const id = `cmd-${++serial}`;
    state = E.apply(state, Object.assign({ id, type, actor, sessionId: state.sessionId, turnId: state.turnId, now: extra.now ?? state.lastChangeAt + 10, seed: 99 }, extra));
    return state.replies[actor]?.id === id ? state.replies[actor].error : 'ignored';
  };
  return { get state() { return state; }, set state(value) { state = value; }, act };
}

test('a new game prepares one shared prompt and waits for the starter', () => {
  const g = game({ cards: 10 });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 1, 'only the current bomb has been drawn');
  assert.equal(g.state.cards, 10);
  assert.equal(E.view(g.state, 1).bomb.cardsTotal, 10);
  assert.deepEqual(g.state.promptHistory.seenIds, g.state.order);
  for (const id of g.state.order) assert.ok(D.get(id));
  assert.ok([1, 2, 3, 4].includes(g.state.holder));
  assert.equal(g.state.starter, g.state.holder);
});

test('category limits each prepared prompt to the selected pack', () => {
  for (const category of ['everyday', 'playful']) {
    const g = game({ category, cards: 5 });
    for (let i = 0; i < 5; i++) {
      assert.equal(D.get(g.state.order[i]).pack, category);
      g.act(g.state.holder, 'light');
      g.act(0, 'tick', { now: g.state.explodeAt });
      g.act(0, 'tick', { now: g.state.phaseUntil });
      g.act(0, 'tick', { now: g.state.phaseUntil });
    }
    assert.equal(g.state.phase, 'finished');
    assert.equal(new Set(g.state.order).size, 5);
  }
});

test('invalid setups are rejected', () => {
  assert.throws(() => E.create({ id: 'x', roster: seats(1), now: 1, seed: 1 }), /invalid_roster/);
  assert.throws(() => E.create({ id: 'x', roster: seats(4), fuse: 'forever', now: 1, seed: 1 }), /invalid_options/);
  assert.throws(() => E.create({ id: 'x', roster: seats(4), cards: 7, now: 1, seed: 1 }), /invalid_options/);
  assert.throws(() => E.create({ id: 'x', roster: seats(4), category: 'nature', now: 1, seed: 1 }), /invalid_options/);
  assert.throws(() => E.create({ id: 'x', roster: seats(4), weights: { everyday: 0, playful: 0 }, now: 1, seed: 1 }), /invalid_options/);
  assert.throws(() => E.create({ id: 'x', roster: [{ playerNum: 1 }, { playerNum: 1 }], now: 1, seed: 1 }), /invalid_roster/);
});

test('only the holder (or the host) can light the fuse; new games use scaled Normal', () => {
  const g = game();
  const holder = g.state.holder, other = E.nextActive(g.state, holder);
  assert.equal(g.act(other, 'light'), 'not_available');
  assert.equal(g.act(holder, 'light', { now: 5000 }), '');
  assert.equal(g.state.phase, 'ticking');
  const fuse = g.state.explodeAt - 5000;
  assert.ok(fuse >= 70000 && fuse <= 110000, `fuse ${fuse}`);
});

test('passing moves the bomb clockwise and skips players who are sitting out', () => {
  const g = game({ roster: seats(4) });
  g.state.holder = 1; g.state.starter = 1;
  assert.equal(g.act(0, 'exclude', { playerNum: 2, active: false }), '');
  g.act(1, 'light', { now: 2000 });
  assert.equal(g.act(1, 'pass', { now: 2500 }), '');
  assert.equal(g.state.holder, 3);
  assert.equal(g.act(3, 'pass', { now: 3000 }), '');
  assert.equal(g.state.holder, 4);
  assert.equal(g.act(4, 'pass', { now: 3500 }), '');
  assert.equal(g.state.holder, 1);
  assert.equal(g.state.passes, 3);
});

test('a player who does not hold the bomb cannot pass it, and stale turns are rejected', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  assert.equal(g.act(2, 'pass', { now: 2100 }), 'not_available');
  const staleTurn = g.state.turnId;
  g.act(1, 'pass', { now: 2200 });
  assert.equal(g.act(2, 'pass', { now: 2300, turnId: staleTurn }), 'not_available');
  assert.equal(g.state.holder, 2);
});

test('a challenge sends the bomb back to the player whose answer did not count', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  g.act(1, 'pass', { now: 2500 });
  assert.equal(g.state.holder, 2);
  // The challenged player cannot challenge themselves.
  assert.equal(g.act(1, 'bounce', { now: 2600 }), 'not_available');
  assert.equal(g.act(3, 'bounce', { now: 2700 }), '');
  assert.equal(g.state.holder, 1);
  assert.equal(g.state.passes, 0);
  assert.deepEqual({ by: g.state.bounce.by, to: g.state.bounce.to }, { by: 3, to: 1 });
  // One challenge per answer: the same pass cannot bounce twice.
  assert.equal(g.act(4, 'bounce', { now: 2800 }), 'not_available');
  g.act(1, 'pass', { now: 2900 });
  assert.equal(g.state.holder, 2);
  assert.equal(g.state.bounce, null);
});

test('the bomb explodes on the holder at the secret time; a late pass cannot escape', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  const at = g.state.explodeAt;
  g.act(1, 'pass', { now: 2100 });
  assert.equal(g.act(2, 'pass', { now: at + 5 }), 'too_late');
  assert.equal(g.state.phase, 'boom');
  assert.equal(g.state.boom.loser, 2);
  assert.deepEqual(g.state.penalties[2], [g.state.order[0]]);
});

test('host ticks retain the old prompt through 45 seconds of discussion, then prepare an unlit next card', () => {
  const g = game({ cards: 5 });
  g.state.holder = 3; g.state.starter = 3;
  g.act(3, 'light', { now: 2000 });
  const at = g.state.explodeAt;
  // An early tick changes nothing at all (no write).
  const before = g.state;
  g.act(0, 'tick', { now: at - 1 });
  assert.equal(g.state, before);
  g.act(0, 'tick', { now: at });
  assert.equal(g.state.phase, 'boom');
  assert.equal(g.state.boom.loser, 3);
  const promptId = g.state.order[0], history = JSON.stringify(g.state.promptHistory);
  const boom = JSON.stringify(g.state.boom), score = JSON.stringify(g.state.penalties);
  assert.equal(g.state.phaseUntil, at + E.CONFIG.boomHoldMs);
  assert.equal(g.state.discussionUntil, at + E.CONFIG.boomHoldMs + 45000);
  g.act(0, 'tick', { now: at + E.CONFIG.boomHoldMs });
  assert.equal(g.state.phase, 'discussion');
  assert.equal(g.state.phaseUntil, at + E.CONFIG.boomHoldMs + 45000);
  assert.equal(g.state.order.length, 1);
  assert.equal(JSON.stringify(g.state.promptHistory), history);
  assert.equal(JSON.stringify(g.state.boom), boom);
  assert.equal(JSON.stringify(g.state.penalties), score);
  for (const actor of [0, 1, 2, 3, 4]) {
    const card = E.view(g.state, actor).bomb;
    assert.equal(card.phase, 'discussion');
    assert.equal(card.cardId, promptId);
    assert.equal(card.boom.loser, 3);
    assert.equal(card.canNext, true);
    assert.equal(card.canLight, false);
    assert.equal(card.canPass, false);
  }
  const waiting = g.state;
  g.act(0, 'tick', { now: g.state.phaseUntil - 1 });
  assert.equal(g.state, waiting, 'discussion does not end a millisecond early');
  g.act(0, 'tick', { now: g.state.phaseUntil });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.cardIndex, 1);
  assert.equal(g.state.holder, 3);
  assert.equal(g.state.lastBoom.loser, 3);
  assert.equal(g.state.phaseUntil, null);
  assert.equal(g.state.discussionUntil, null);
  assert.equal(g.state.explodeAt, null);
  assert.equal(g.state.roundFuse, null);
  const nextPrompt = g.state.order[1];
  assert.notEqual(nextPrompt, promptId);
  g.act(0, 'tick', { now: at + 1000000 });
  assert.equal(g.state.phase, 'ready', 'time passing cannot start the next fuse');
  assert.equal(g.state.order[1], nextPrompt);
  assert.equal(g.act(3, 'light', { now: at + 1000010 }), '');
  assert.equal(g.state.phase, 'ticking');
});

test('any active player can skip the explosion pause with next', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  g.act(0, 'tick', { now: g.state.explodeAt });
  assert.equal(g.act(2, 'next', { now: g.state.lastChangeAt + 100 }), '');
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.phaseUntil, null);
  assert.equal(g.state.discussionUntil, null);
  assert.equal(g.state.explodeAt, null);
});

test('the discussion deadline starts after the unchanged animation and survives a late animation tick', () => {
  const g = game();
  assert.equal(E.CONFIG.boomHoldMs, 4500);
  assert.equal(E.CONFIG.discussionMs, 45000);
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  const animationEnd = g.state.phaseUntil, discussionEnd = g.state.discussionUntil;
  g.act(0, 'tick', { now: animationEnd + 12345 });
  assert.equal(g.state.phase, 'discussion');
  assert.equal(g.state.phaseUntil, discussionEnd, 'late polling must not add a new 45-second wait');
  assert.equal(g.state.discussionUntil, discussionEnd);
  assert.equal(g.state.history.length, 1);
  assert.equal(g.state.order.length, 1);
  g.act(0, 'tick', { now: discussionEnd });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 2);
  assert.equal(g.state.history.length, 1);
});

test('one throttled tick after both post-explosion deadlines prepares exactly one unlit prompt', () => {
  const g = game();
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  const boom = g.state.boom, deadline = g.state.discussionUntil;
  g.act(0, 'tick', { now: deadline + 100000 });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.cardIndex, 1);
  assert.equal(g.state.order.length, 2);
  assert.equal(g.state.history.length, 1);
  assert.deepEqual(g.state.penalties[boom.loser], [boom.cardId]);
  assert.equal(g.state.explodeAt, null);
  assert.equal(g.state.roundFuse, null);
  assert.equal(g.state.phaseUntil, null);
  assert.equal(g.state.discussionUntil, null);
});

test('host and active players can advance during discussion; sitting-out players cannot', () => {
  for (const actor of [0, 1, 2, 3, 4]) {
    const g = game();
    g.act(g.state.holder, 'light');
    g.act(0, 'tick', { now: g.state.explodeAt });
    g.act(0, 'tick', { now: g.state.phaseUntil });
    assert.equal(g.state.phase, 'discussion');
    if (actor === 4) {
      g.act(0, 'exclude', { playerNum: 4, active: false });
      assert.equal(E.view(g.state, 4).bomb.canNext, false);
      assert.equal(g.act(4, 'next'), 'not_available');
      assert.equal(g.state.phase, 'discussion');
      continue;
    }
    assert.equal(g.act(actor, 'next'), '');
    assert.equal(g.state.phase, 'ready');
    assert.equal(g.state.cardIndex, 1);
    assert.equal(g.state.discussionUntil, null);
    assert.equal(g.state.explodeAt, null);
  }
});

test('manual next and an already queued discussion tick cannot skip or redraw the prepared prompt', () => {
  for (const tickFirst of [false, true]) {
    const g = game();
    g.act(g.state.holder, 'light');
    g.act(0, 'tick', { now: g.state.explodeAt });
    g.act(0, 'tick', { now: g.state.phaseUntil });
    const pendingTurn = g.state.turnId, deadline = g.state.phaseUntil;
    if (tickFirst) g.act(0, 'tick', { now: deadline, turnId: pendingTurn });
    else g.act(2, 'next', { now: deadline - 1, turnId: pendingTurn });
    const prompt = g.state.order[1], savedHistory = JSON.stringify(g.state.promptHistory);
    if (tickFirst) assert.equal(g.act(2, 'next', { now: deadline, turnId: pendingTurn }), 'not_available');
    else assert.equal(g.act(0, 'tick', { now: deadline, turnId: pendingTurn }), 'ignored');
    assert.equal(g.state.phase, 'ready');
    assert.equal(g.state.cardIndex, 1);
    assert.equal(g.state.order.length, 2);
    assert.equal(g.state.order[1], prompt);
    assert.equal(JSON.stringify(g.state.promptHistory), savedHistory);
    assert.equal(g.state.history.length, 1);
    assert.equal(g.state.explodeAt, null);
  }
});

test('duplicate next IDs remain idempotent after the prepared prompt is manually started', () => {
  const g = game();
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  g.act(0, 'tick', { now: g.state.phaseUntil });
  const input = { id: 'duplicate-discussion-next', type: 'next', actor: 2, sessionId: g.state.sessionId,
    turnId: g.state.turnId, now: g.state.phaseUntil - 1, seed: 4 };
  g.state = E.apply(g.state, input);
  const prompt = g.state.order[1];
  g.act(g.state.holder, 'light', { now: input.now + 10 });
  const before = g.state;
  g.state = E.apply(g.state, { ...input, turnId: g.state.turnId, now: input.now + 20 });
  assert.equal(g.state, before);
  assert.equal(g.state.phase, 'ticking');
  assert.equal(g.state.order[1], prompt);
  assert.equal(g.state.cardIndex, 1);
});

test('stop and restart cancel post-explosion deadlines and fence a pending old tick', () => {
  for (const phase of ['boom', 'discussion']) {
    for (const command of ['stop', 'restart']) {
      const g = game();
      g.act(g.state.holder, 'light');
      g.act(0, 'tick', { now: g.state.explodeAt });
      if (phase === 'discussion') g.act(0, 'tick', { now: g.state.phaseUntil });
      assert.equal(g.state.phase, phase);
      const oldTurn = g.state.turnId, deadline = g.state.discussionUntil, oldPrompt = g.state.order[0];
      g.act(0, command);
      assert.equal(g.state.phase, command === 'stop' ? 'finished' : 'ready');
      assert.equal(g.state.phaseUntil, null);
      assert.equal(g.state.discussionUntil, null);
      assert.ok(g.state.promptHistory.seenIds.includes(oldPrompt));
      const before = g.state;
      assert.equal(g.act(0, 'tick', { now: deadline + 1, turnId: oldTurn }), 'ignored');
      assert.equal(g.state, before);
    }
  }
});

test('a saved old boom derives its discussion end from the original animation end', () => {
  const g = game();
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  const animationEnd = g.state.phaseUntil, prompt = g.state.order[0];
  delete g.state.discussionUntil;
  g.state = JSON.parse(JSON.stringify(g.state));
  g.act(0, 'tick', { now: animationEnd + 12000 });
  assert.equal(g.state.phase, 'discussion');
  assert.equal(g.state.discussionUntil, animationEnd + 45000);
  assert.equal(g.state.phaseUntil, animationEnd + 45000);
  assert.equal(g.state.order[0], prompt);
  assert.equal(g.state.history.length, 1);
  g.act(0, 'tick', { now: animationEnd + 45000 });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 2);
});

test('a serialized discussion keeps its deadline, original result and prompt without restarting the wait', () => {
  const g = game();
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  g.act(0, 'tick', { now: g.state.phaseUntil });
  const saved = JSON.stringify(g.state);
  const deadline = g.state.phaseUntil, prompt = g.state.order[0], result = g.state.boom;
  g.state = JSON.parse(saved);
  g.act(0, 'tick', { now: deadline - 1 });
  assert.equal(JSON.stringify(g.state), saved);
  assert.equal(E.view(g.state, 1).bomb.cardId, prompt);
  assert.deepEqual(E.view(g.state, 1).bomb.boom, result);
  g.act(0, 'tick', { now: deadline });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 2);
  assert.equal(g.state.promptHistory.seenIds.length, 2);
});

test('next-round settings and participant edits do not extend a discussion or change its result', () => {
  const g = game();
  g.act(g.state.holder, 'light');
  g.act(0, 'tick', { now: g.state.explodeAt });
  g.act(0, 'tick', { now: g.state.phaseUntil });
  const deadline = g.state.phaseUntil, prompt = g.state.order[0], boom = JSON.stringify(g.state.boom);
  g.act(0, 'settings', { timing: { speedMode: 'chill', scaleWithPlayers: false }, now: deadline - 20000 });
  g.act(0, 'exclude', { playerNum: 4, active: false, now: deadline - 10000 });
  assert.equal(g.state.phaseUntil, deadline);
  assert.equal(g.state.discussionUntil, deadline);
  assert.equal(g.state.order[0], prompt);
  assert.equal(JSON.stringify(g.state.boom), boom);
  g.act(0, 'tick', { now: deadline });
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 2);
  assert.equal(g.state.explodeAt, null);
  g.act(g.state.holder, 'light', { now: deadline + 10000 });
  assert.equal(g.state.roundFuse.speedModeAtStart, 'chill');
  assert.equal(g.state.roundFuse.scaleWithPlayersAtStart, false);
  assert.equal(g.state.roundFuse.activePlayerCountAtStart, 3);
});

test('after the last card the game finishes and the fewest bomb cards lead', () => {
  const g = game({ cards: 5 });
  const losers = [1, 2, 2, 3, 2];
  for (const loser of losers) {
    g.state.holder = loser; g.state.starter = loser;
    g.act(loser, 'light', { now: g.state.lastChangeAt + 10 });
    g.act(0, 'tick', { now: g.state.explodeAt });
    g.act(0, 'tick', { now: g.state.phaseUntil });
    assert.equal(g.state.phase, 'discussion', 'the final card also gets its full discussion');
    g.act(0, 'tick', { now: g.state.phaseUntil });
  }
  assert.equal(g.state.phase, 'finished');
  const table = E.standings(g.state);
  assert.deepEqual(table.map(row => [row.playerNum, row.count, row.leading]), [[4, 0, true], [1, 1, false], [3, 1, false], [2, 3, false]]);
  assert.equal(g.state.history.length, 5);
});

test('pause hides and keeps the remaining fuse; resume continues it', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  const remaining = g.state.explodeAt - 3000;
  assert.equal(g.act(0, 'pause', { now: 3000 }), '');
  assert.equal(g.state.phase, 'paused');
  assert.equal(g.state.explodeAt, null);
  assert.equal(g.act(1, 'pass', { now: 3100 }), 'not_available');
  assert.equal(g.act(0, 'resume', { now: 90000 }), '');
  assert.equal(g.state.phase, 'ticking');
  assert.equal(g.state.explodeAt, 90000 + Math.max(E.CONFIG.resumeFloorMs, remaining));
  assert.equal(g.act(2, 'pause', { now: 90001 }), 'not_available');
});

test('sitting out the current holder moves the bomb on; at least two players stay in', () => {
  const g = game({ roster: seats(3) });
  g.state.holder = 2; g.state.starter = 2;
  g.act(2, 'light', { now: 2000 });
  assert.equal(g.act(0, 'exclude', { playerNum: 2, active: false, now: 2100 }), '');
  assert.equal(g.state.holder, 3);
  assert.equal(g.act(0, 'exclude', { playerNum: 3, active: false, now: 2200 }), 'not_enough_players');
  assert.equal(g.act(0, 'exclude', { playerNum: 2, active: true, now: 2300 }), '');
  assert.equal(g.act(2, 'exclude', { playerNum: 1, active: false, now: 2400 }), 'not_available');
});

test('restart resets scores and options while preserving activity prompt history', () => {
  const g = game({ cards: 5 });
  g.state.holder = 1; g.act(1, 'light', { now: 2000 });
  g.act(0, 'tick', { now: g.state.explodeAt });
  const first = g.state.order[0];
  assert.equal(g.act(0, 'restart', { cards: 15, fuse: 'quick', category: 'playful', now: g.state.lastChangeAt + 10 }), '');
  assert.equal(g.state.phase, 'ready');
  assert.equal(g.state.order.length, 1);
  assert.equal(E.view(g.state, 0).bomb.cardsTotal, 15);
  assert.ok(g.state.promptHistory.seenIds.includes(first));
  assert.notEqual(g.state.order[0], first);
  assert.equal(g.state.fuse, 'quick');
  assert.deepEqual(g.state.penalties, {});
  assert.equal(g.act(0, 'restart', { cards: 3 }), 'invalid_options');
});

test('stop finishes the game early', () => {
  const g = game();
  assert.equal(g.act(1, 'stop'), 'not_available');
  assert.equal(g.act(0, 'stop'), '');
  assert.equal(g.state.phase, 'finished');
  assert.equal(g.state.stopped, true);
});

test('duplicate command ids are ignored', () => {
  const g = game();
  g.state.holder = 1;
  const input = { id: 'same', type: 'light', actor: 1, sessionId: g.state.sessionId, turnId: g.state.turnId, now: 2000, seed: 1 };
  const once = E.apply(g.state, input);
  const twice = E.apply(once, Object.assign({}, input, { turnId: once.turnId }));
  assert.equal(twice, once);
});

test('the projection never reveals the secret fuse', () => {
  const g = game();
  g.state.holder = 1;
  g.act(1, 'light', { now: 2000 });
  const secret = String(g.state.explodeAt);
  for (const actor of [0, 1, 2, 3, 4]) {
    const json = JSON.stringify(E.view(g.state, actor));
    assert.ok(!json.includes('explodeAt') && !json.includes('remainingMs') && !json.includes(secret), `actor ${actor}`);
  }
  g.act(0, 'pause', { now: 3000 });
  const paused = JSON.stringify(E.view(g.state, 2));
  assert.ok(!paused.includes('remainingMs') && !paused.includes(String(g.state.remainingMs)));
});

test('the projection tells each card exactly what it may do', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  assert.equal(E.view(g.state, 1).bomb.canLight, true);
  assert.equal(E.view(g.state, 2).bomb.canLight, false);
  g.act(1, 'light', { now: 2000 });
  g.act(1, 'pass', { now: 2100 });
  const holder = E.view(g.state, 2).bomb, challenged = E.view(g.state, 1).bomb, other = E.view(g.state, 3).bomb;
  assert.equal(holder.canPass, true);
  assert.equal(holder.next, 3);
  assert.equal(challenged.canPass, false);
  assert.equal(challenged.canBounce, false);
  assert.equal(other.canBounce, true);
  assert.equal(holder.canBounce, true);
  assert.equal(E.view(g.state, 3).game, 'bombrelay');
  assert.equal(E.view(g.state, 3).name, 'Jason');
});

test('one prompt and one deadline survive passes, challenge and membership changes', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  const prompt = g.state.order[0], history = JSON.stringify(g.state.promptHistory);
  for (const actor of [0, 1, 2, 3, 4]) assert.equal(E.view(g.state, actor).bomb.cardId, prompt);
  g.act(1, 'light', { now: 2000 });
  const deadline = g.state.explodeAt;
  g.act(1, 'pass', { now: 2100 });
  g.act(3, 'bounce', { now: 2200 });
  g.act(1, 'pass', { now: 2300 });
  g.act(0, 'exclude', { playerNum: 2, active: false, now: 2400 });
  g.act(3, 'pass', { now: 2500 });
  assert.equal(g.state.explodeAt, deadline);
  assert.equal(JSON.stringify(g.state.promptHistory), history);
  assert.equal(g.state.order.length, 1);
  for (const actor of [0, 1, 2, 3, 4]) assert.equal(E.view(g.state, actor).bomb.cardId, prompt);
});

test('only the host can reroll a fresh reading preview; skipped prompts remain seen', () => {
  const g = game();
  const first = g.state.order[0], oldTurn = g.state.turnId;
  assert.equal(E.view(g.state, 0).bomb.canReroll, true);
  assert.equal(E.view(g.state, g.state.holder).bomb.canReroll, false);
  assert.equal(g.act(g.state.holder, 'reroll'), 'not_available');
  assert.equal(g.act(0, 'reroll'), '');
  const second = g.state.order[0];
  assert.notEqual(second, first);
  assert.ok(g.state.promptHistory.seenIds.includes(first));
  assert.ok(g.state.promptHistory.seenIds.includes(second));
  assert.equal(g.state.explodeAt, null);
  assert.equal(g.state.order.length, 1);
  assert.equal(g.act(0, 'reroll', { turnId: oldTurn }), 'not_available');
  g.act(g.state.holder, 'light');
  const deadline = g.state.explodeAt;
  assert.equal(g.act(0, 'reroll'), 'not_available');
  assert.equal(g.state.order[0], second);
  assert.equal(g.state.explodeAt, deadline);
});

test('history survives mode switches and a newly created session in the same room', () => {
  const g = game({ category: 'everyday' });
  const first = g.state.order[0];
  g.act(0, 'restart', { category: 'playful' });
  const second = g.state.order[0];
  g.act(0, 'restart', { category: 'everyday' });
  assert.notEqual(g.state.order[0], first);
  assert.ok(g.state.promptHistory.seenIds.includes(first));
  assert.ok(g.state.promptHistory.seenIds.includes(second));
  const savedHistory = JSON.parse(JSON.stringify(g.state.promptHistory));
  const next = game({ category: 'mixed', promptHistory: savedHistory });
  assert.equal(next.state.promptHistory.seenIds.length, savedHistory.seenIds.length + 1);
  assert.ok(savedHistory.seenIds.every(id => next.state.promptHistory.seenIds.includes(id)));
  assert.ok(!savedHistory.seenIds.includes(next.state.order[0]));
});

test('720 bombs across ordinary restarts exhaust the formal pool before repeating', () => {
  const g = game({ cards: 20 });
  const ids = [];
  for (let session = 0; session < 36; session++) {
    if (session) g.act(0, 'restart');
    for (let round = 0; round < 20; round++) {
      ids.push(g.state.order[g.state.cardIndex]);
      assert.equal(g.state.promptHistory.seenIds.length, ids.length);
      assert.equal(g.act(g.state.holder, 'light'), '');
      assert.equal(g.act(0, 'tick', { now: g.state.explodeAt }), '');
      assert.equal(g.act(0, 'tick', { now: g.state.phaseUntil }), '');
      assert.equal(g.act(0, 'tick', { now: g.state.phaseUntil }), '');
    }
    assert.equal(g.state.phase, 'finished');
    assert.equal(g.state.history.length, 20);
  }
  assert.equal(new Set(ids).size, 720);
  g.act(0, 'restart');
  assert.notEqual(g.state.order[0], ids.at(-1));
  assert.equal(g.state.promptHistory.seenIds.length, 1);
});

test('late exclusion scores the expired holder before changing membership', () => {
  const g = game();
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  const deadline = g.state.explodeAt;
  assert.equal(g.act(0, 'exclude', { playerNum: 1, active: false, now: deadline }), '');
  assert.equal(g.state.phase, 'boom');
  assert.equal(g.state.boom.loser, 1);
  assert.equal(g.state.penalties[1].length, 1);
  assert.equal(g.state.roster[0].active, false);
  g.act(0, 'tick', { now: deadline + 1 });
  assert.equal(g.state.penalties[1].length, 1, 'explosion only settles once');
});

test('old ticks cannot advance a new turn after restart', () => {
  const g = game();
  g.act(g.state.holder, 'light', { now: 2000 });
  const oldTurn = g.state.turnId;
  g.act(0, 'restart', { now: 2100 });
  g.act(g.state.holder, 'light', { now: 2200 });
  const before = g.state;
  assert.equal(g.act(0, 'tick', { now: g.state.explodeAt, turnId: oldTurn }), 'ignored');
  assert.equal(g.state, before);
  assert.equal(g.state.phase, 'ticking');
});

test('legacy live sessions retain their current card, secret fuse and actual round total', () => {
  const g = game({ cards: 20 });
  const legacy = D.legacyItems.filter(card => card.category === 'fantasy').map(card => card.id);
  g.state.order = legacy;
  g.state.category = 'fantasy';
  delete g.state.promptRotationVersion;
  delete g.state.promptHistory;
  delete g.state.promptWeights;
  delete g.state.familyWindow;
  g.state.holder = 1; g.state.starter = 1;
  g.act(1, 'light', { now: 2000 });
  const deadline = g.state.explodeAt;
  g.act(1, 'pass', { now: 2100 });
  assert.equal(g.state.order.length, 10, 'future old cards stay intact until the next preparation');
  assert.equal(E.view(g.state, 2).bomb.cardId, legacy[0]);
  assert.equal(E.view(g.state, 2).bomb.cardsTotal, 10, 'do not silently extend the old truncated deal to 20');
  assert.equal(g.state.explodeAt, deadline);
  g.act(0, 'tick', { now: deadline });
  assert.equal(g.state.boom.cardId, legacy[0]);
  g.act(0, 'tick', { now: g.state.phaseUntil });
  assert.equal(g.state.phase, 'discussion');
  assert.equal(g.state.order.length, 10, 'legacy deal is retained during discussion');
  g.act(0, 'tick', { now: g.state.phaseUntil });
  assert.equal(g.state.order.length, 2);
  assert.equal(g.state.order[0], legacy[0]);
  assert.match(g.state.order[1], /^tb-(everyday|playful)-/);
  assert.equal(g.state.category, 'mixed');
  assert.equal(g.state.promptHistory.seenIds.length, 1);
  assert.equal(g.state.roundCards, 10);
  assert.equal(g.state.cards, 20, 'configured setting remains valid for Restart');
});

test('a legacy 14-card nature deal retains its total and can restart through host create options', () => {
  const g = game({ cards: 20 });
  g.state.order = D.legacyItems.filter(card => card.category === 'nature').map(card => card.id);
  g.state.category = 'nature';
  delete g.state.promptRotationVersion;
  delete g.state.promptHistory;
  assert.equal(E.view(g.state, 0).bomb.cardsTotal, 14, 'correct even before the first migrated command');
  g.act(g.state.holder, 'light');
  assert.equal(g.state.cards, 20);
  assert.equal(g.state.roundCards, 14);
  const next = E.create({ id: 'legacy-host-restart', roster: g.state.roster, fuse: g.state.fuse,
    cards: g.state.cards, category: g.state.category, promptHistory: g.state.promptHistory, now: 100000, seed: 77 });
  assert.equal(E.view(next, 0).bomb.cardsTotal, 20);
  assert.equal(next.roundCards, null);
  assert.equal(g.act(0, 'restart'), '');
  assert.equal(E.view(g.state, 0).bomb.cardsTotal, 20);
  assert.equal(g.state.roundCards, null);
  assert.match(g.state.order[0], /^tb-/);
});

test('the engine restores Firebase omitted history arrays and honors configurable weights', () => {
  const g = game({ weights: { everyday: 0, playful: 1 }, promptHistory: { seenIds: [] } });
  assert.equal(D.get(g.state.order[0]).pack, 'playful');
  delete g.state.promptHistory.recentIds;
  delete g.state.promptHistory.recentFamilies;
  assert.equal(g.act(0, 'reroll'), '');
  assert.equal(D.get(g.state.order[0]).pack, 'playful');
  assert.equal(g.act(0, 'restart', { category: 'everyday' }), '');
  assert.equal(D.get(g.state.order[0]).pack, 'everyday', 'explicit pack overrides zero Mixed weight');
  assert.ok(g.state.promptHistory.seenIds.length >= 3);
});

test('GO samples two uniforms once using the current distinct eligible participant count', () => {
  for (const count of [2, 3, 6, 8, 9]) {
    for (const speedMode of E.CONFIG.speedModes) {
      for (const scaleWithPlayers of [false, true]) {
        const g = game({ roster: seats(count), timing: { speedMode, scaleWithPlayers } });
        assert.equal(g.state.roundFuse, null, 'reading does not start or sample a fuse');
        const range = E.getTimingRange({ activePlayerCount: count, settings: g.state.settingsTiming });
        g.act(g.state.holder, 'light', { now: 200000, seed: 1234 });
        const random = E.rng(1234);
        const expected = Math.round(range.minMs + (range.maxMs - range.minMs) * (random() + random()) / 2);
        assert.equal(g.state.roundFuse.durationMs, expected);
        assert.equal(g.state.roundFuse.activePlayerCountAtStart, count);
        assert.equal(g.state.roundFuse.minMsAtStart, range.minMs);
        assert.equal(g.state.roundFuse.maxMsAtStart, range.maxMs);
        assert.equal(g.state.explodeAt, 200000 + expected);
        assert.equal(g.state.roundId, g.state.roundFuse.roundId);
        const before = JSON.stringify(g.state.roundFuse);
        g.act(g.state.holder, 'pass', { now: 200001, seed: 999 });
        g.act(g.state.holder, 'light', { now: 200002 });
        assert.equal(JSON.stringify(g.state.roundFuse), before);
      }
    }
  }
});

test('timing and roster edits affect only the next GO; preferences survive ordinary restart', () => {
  const g = game({ roster: seats(6) });
  g.act(g.state.holder, 'light', { now: 2000 });
  const first = JSON.stringify(g.state.roundFuse), deadline = g.state.explodeAt, turn = g.state.turnId;
  const history = JSON.stringify(g.state.promptHistory), prompt = g.state.order[0];
  assert.equal(g.act(0, 'settings', { timing: { speedMode: 'fast', scaleWithPlayers: false }, now: 2001 }), '');
  assert.equal(g.state.turnId, turn, 'pending settings do not invalidate a valid in-flight pass');
  assert.equal(g.act(0, 'exclude', { playerNum: 6, active: false, now: 2002 }), '');
  assert.equal(g.state.explodeAt, deadline);
  assert.equal(JSON.stringify(g.state.roundFuse), first);
  assert.equal(JSON.stringify(g.state.promptHistory), history);
  assert.equal(g.state.order[0], prompt);
  g.act(0, 'tick', { now: deadline });
  g.act(0, 'next', { now: deadline + 1 });
  assert.equal(g.state.roundFuse, null);
  g.act(g.state.holder, 'light', { now: deadline + 1000000 });
  assert.equal(g.state.roundFuse.speedModeAtStart, 'fast');
  assert.equal(g.state.roundFuse.activePlayerCountAtStart, 5);
  assert.equal(g.state.roundFuse.scaleWithPlayersAtStart, false);
  assert.deepEqual([g.state.roundFuse.minMsAtStart, g.state.roundFuse.maxMsAtStart], [30000, 60000]);
  assert.notEqual(JSON.stringify(g.state.roundFuse), first);
  const pending = g.state.settingsTiming;
  g.act(0, 'restart', { now: g.state.lastChangeAt + 1 });
  assert.deepEqual(g.state.settingsTiming, pending);
  assert.ok(g.state.promptHistory.seenIds.includes(prompt));
});

test('timing settings require host authority and validated modes; exact-deadline settings settle once', () => {
  const g = game();
  const original = g.state.settingsTiming;
  assert.equal(g.act(1, 'settings', { timing: { speedMode: 'fast' } }), 'not_available');
  for (const timing of [{ speedMode: 'oops' }, { scaleWithPlayers: 'true' }, null]) {
    assert.equal(g.act(0, 'settings', { timing }), 'invalid_options');
    assert.deepEqual(g.state.settingsTiming, original);
  }
  g.act(g.state.holder, 'light');
  const loser = g.state.holder, at = g.state.explodeAt;
  g.act(0, 'settings', { timing: { speedMode: 'chill', scaleWithPlayers: true }, now: at });
  assert.equal(g.state.phase, 'boom');
  assert.equal(g.state.penalties[loser].length, 1);
  g.act(loser, 'pass', { now: at });
  assert.equal(g.state.penalties[loser].length, 1);
});

test('pre-v2 live and paused rooms retain exact deadlines and their explicit uniform preference', () => {
  for (const fuse of ['quick', 'classic', 'long']) {
    const g = game({ fuse });
    g.act(g.state.holder, 'light', { now: 2000, seed: 99 });
    const [min, max] = E.CONFIG.fuses[fuse];
    assert.equal(g.state.explodeAt, 2000 + Math.round((min + E.rng(99)() * (max - min)) * 1000));
    const deadline = g.state.explodeAt;
    delete g.state.settingsTiming; delete g.state.roundFuse; delete g.state.roundId;
    g.act(g.state.holder, 'pass', { now: 2001 });
    assert.equal(g.state.explodeAt, deadline, 'upgrade does not reroll an old live bomb');
    assert.equal(g.state.settingsTiming.legacyFuse, fuse);
    assert.equal(g.state.settingsTiming.scaleWithPlayers, false);
    g.act(0, 'pause', { now: deadline - 1 });
    const remaining = g.state.remainingMs;
    delete g.state.settingsTiming;
    g.act(0, 'resume', { now: deadline + 100000 });
    assert.equal(g.state.explodeAt, deadline + 100000 + remaining);
    g.act(0, 'restart');
    assert.equal(g.state.settingsTiming.legacyFuse, fuse);
    g.act(0, 'settings', { timing: { speedMode: 'normal', scaleWithPlayers: true } });
    assert.equal(g.state.settingsTiming.legacyFuse, undefined, 'explicit change adopts new policy');
  }
});

test('emergency pause moves only the effective deadline, keeping the original GO snapshot', () => {
  const g = game();
  g.act(g.state.holder, 'light', { now: 2000 });
  const snapshot = JSON.stringify(g.state.roundFuse), initial = g.state.explodeAt;
  g.act(0, 'pause', { now: initial - 1 });
  g.act(0, 'settings', { timing: { speedMode: 'fast', scaleWithPlayers: false }, now: initial + 1 });
  g.act(0, 'resume', { now: initial + 10000 });
  assert.equal(JSON.stringify(g.state.roundFuse), snapshot);
  assert.equal(g.state.explodeAt, initial + 10000 + E.CONFIG.resumeFloorMs);
  for (const actor of [0, 1, 2, 3, 4]) {
    const json = JSON.stringify(E.view(g.state, actor));
    for (const privateKey of ['roundFuse', 'roundId', 'startedAtMs', 'durationMs', 'explodeAtMs', 'activePlayerCountAtStart']) {
      assert.equal(json.includes(privateKey), false, privateKey);
    }
  }
});

test('fractional authority clock offsets are normalized once at GO', () => {
  const g = game();
  assert.equal(g.act(g.state.holder, 'light', { now: 1500.5 }), '');
  assert.equal(g.state.litAt, 1501);
  assert.equal(g.state.roundFuse.startedAtMs, 1501);
  assert.equal(g.state.explodeAt - g.state.litAt, g.state.roundFuse.durationMs);
});
