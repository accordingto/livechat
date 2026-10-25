'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../word-wolf-engine.js'), CONTENT = require('../word-wolf-content.js'), ART = require('../word-wolf-art.js');
const clone = value => JSON.parse(JSON.stringify(value));
function game(count = 4, seed = 3, options = {}) {
  let now = 1000, serial = 0;
  let state = E.create({ id: 'ww-test', roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) })), now, seed, ...options });
  return { get state() { return state; }, set state(next) { state = next; }, act(actor, type, extra = {}) {
    const input = { id: 'command-' + (++serial), type, actor, sessionId: state.sessionId, stage: state.stage, now: ++now, seed: serial * 883, ...extra };
    state = E.apply(state, input); return { state, input, error: state.replies?.[actor]?.error };
  }, view: actor => E.view(state, actor).ww };
}

test('restores all 80 original pairs once, bilingual names, and one local illustration mapping for every item', () => {
  assert.equal(CONTENT.PAIRS.length, 80);
  assert.equal(new Set(CONTENT.PAIRS.map(p => p.id)).size, 80);
  assert.equal(CONTENT.pool('objects').length, 21); assert.equal(CONTENT.pool('food').length, 9); assert.equal(CONTENT.pool('other').length, 50);
  assert.equal(ART.ids.length, 160);
  for (const pair of CONTENT.PAIRS) {
    for (const item of [pair.a, pair.b]) assert.ok(item.id && item.en && item.zh);
    assert.notEqual(pair.a.en, pair.b.en);
    for (const item of [pair.a, pair.b]) {
      assert.match(ART.item(item.id), /^<img /); assert.doesNotMatch(ART.item(item.id), /<script|onload|https:|data:/);
      assert.equal(ART.get(item.id).src, `assets/word-wolf/cards-v1/${item.id}.webp`);
    }
  }
  assert.equal(ART.item('__proto__'), '');
});

test('3–9 players receive exactly one different answer; no projection identifies the odd player before a reveal', () => {
  for (const count of [3, 4, 6, 9]) for (let seed = 1; seed <= 120; seed++) {
    const g = game(count, seed), s = g.state, pair = CONTENT.get(s.round.pairId);
    const items = s.round.seats.map(n => g.view(n).me.item.en), frequencies = Object.values(items.reduce((out, item) => (out[item] = (out[item] || 0) + 1, out), {})).sort((a, b) => a - b);
    assert.deepEqual(frequencies, [1, count - 1]);
    assert.equal(g.view(0).me.item, null);
    const shared = JSON.stringify(g.view(0));
    for (const word of [pair.a.en, pair.b.en]) assert.ok(!shared.includes(JSON.stringify(word)));
    for (const actor of s.round.seats) {
      const view = g.view(actor);
      assert.equal(view.result, null); assert.ok(!('odd' in view)); assert.ok(!('isWolf' in view.me)); assert.ok(!('pairId' in view));
      const other = view.me.item.en === pair.a.en ? pair.b : pair.a;
      assert.ok(!JSON.stringify(view).includes(JSON.stringify(other.en)));
    }
  }
});

test('random pick cycles cover every seat once and do not immediately repeat at the cycle boundary', () => {
  const g = game(9), picks = [];
  for (let i = 0; i < 27; i++) { assert.equal(g.act(0, 'pick').error, null); picks.push(g.state.round.picked); }
  for (let i = 0; i < 3; i++) assert.equal(new Set(picks.slice(i * 9, i * 9 + 9)).size, 9);
  assert.notEqual(picks[8], picks[9]); assert.notEqual(picks[17], picks[18]);
  assert.equal(g.state.deadline, null);
});

test('ballots stay private, can change before the last vote, and settle/reveal exactly once', () => {
  const g = game(4); g.act(2, 'vote');
  assert.equal(g.act(1, 'ballot', { target: 1 }).error, 'not_available');
  assert.equal(g.act(0, 'ballot', { target: 2 }).error, 'not_available');
  assert.equal(g.act(1, 'ballot', { target: 2 }).error, null);
  assert.equal(g.view(1).me.vote, 2); assert.equal(g.view(3).me.vote, null); assert.equal(g.view(0).me.vote, null);
  assert.equal(g.view(2).votesCast, 1); assert.ok(!('votes' in g.view(2)));
  g.act(1, 'ballot', { target: 3 }); assert.equal(g.view(1).me.vote, 3); assert.equal(g.view(1).votesCast, 1);
  g.act(2, 'ballot', { target: 3 }); g.act(3, 'ballot', { target: 1 });
  assert.equal(g.state.phase, 'vote');
  const final = g.act(4, 'ballot', { target: 3 });
  assert.equal(g.state.phase, 'result'); assert.equal(g.state.history.length, 1);
  assert.equal(g.view(0).result.cards.length, 4); assert.equal(Object.keys(g.view(0).result.votes).length, 4);
  assert.equal(E.apply(g.state, final.input), g.state, 'retry of last ballot cannot settle twice');
  g.act(4, 'ballot', { target: 1 }); assert.equal(g.state.history.length, 1);
});

test('the unique most-voted odd card is caught; a wrong suspect escapes; tied votes have no winner', () => {
  for (const [ballots, outcome] of [[[3, 3, 1], 'majority'], [[2, 1, 1], 'odd'], [[2, 3, 1], 'tie']]) {
    const g = game(3); g.state.round.odd = 3; g.act(0, 'vote');
    ballots.forEach((target, i) => g.act(i + 1, 'ballot', { target }));
    assert.equal(g.state.result.winner, outcome); assert.deepEqual(g.view(0).standings, []);
  }
});

test('next/restart keep room pair memory; categories affect only the next pair and recycle without a fixed fallback', () => {
  const g = game(3), originalPair = g.state.round.pairId;
  g.act(1, 'settings', { settings: { category: 'food' } });
  assert.equal(g.state.round.pairId, originalPair);
  const drawn = [];
  for (let i = 0; i < 9; i++) {
    g.act(0, 'restart'); drawn.push(g.state.round.pairId);
    assert.equal(CONTENT.get(g.state.round.pairId).category, 'food');
  }
  assert.equal(new Set(drawn).size, 9);
  assert.ok(g.state.usedPairs.includes(originalPair));
  g.act(0, 'restart'); assert.equal(CONTENT.get(g.state.round.pairId).category, 'food');
});

test('pause/reconnect preserve the deal and votes; stale stages and outsiders cannot advance it', () => {
  const g = game(4), pair = g.state.round.pairId, odd = g.state.round.odd;
  const picked = g.act(1, 'pick').input;
  assert.equal(g.act(2, 'vote', { stage: picked.stage }).error, 'stale_turn');
  g.act(1, 'vote'); g.act(2, 'ballot', { target: 1 }); g.act(0, 'pause');
  assert.equal(g.state.phase, 'paused'); const saved = clone(g.state);
  assert.equal(g.act(1, 'ballot', { target: 2 }).error, 'not_available');
  g.state = saved; assert.equal(g.state.round.pairId, pair); assert.equal(g.state.round.odd, odd); assert.equal(g.view(2).me.vote, 1);
  g.act(3, 'resume'); assert.equal(g.state.phase, 'vote'); assert.equal(g.state.round.votes[2], 1);
  const outsider = { id: 'outsider', type: 'stop', actor: 9, sessionId: g.state.sessionId, stage: g.state.stage, now: 9000 };
  assert.equal(E.apply(g.state, outsider), g.state); assert.equal(E.apply(g.state, { ...outsider, actor: 0, sessionId: 'other' }), g.state);
});

test('any seat leaving cancels consistently, self-return waits for the next deal, renames do not alter words', () => {
  for (const leaving of [1, 2, 3, 4]) {
    const g = game(4), pair = g.state.round.pairId;
    g.act(0, 'rename', { names: ['<Amy>', 'Kevin', 'Jason', 'Willy'] });
    assert.equal(g.state.round.pairId, pair); assert.equal(g.state.roster[0].name, 'Amy');
    g.act(0, 'rename', { names: [{ playerNum: 2, name: 'Kevin renamed' }, { playerNum: 1, name: 'Amy renamed' }] });
    assert.equal(g.state.roster[0].name, 'Amy renamed'); assert.equal(g.state.roster[1].name, 'Kevin renamed');
    assert.equal(g.state.roster[2].name, 'Jason'); assert.equal(g.state.round.pairId, pair);
    g.act(0, 'exclude', { playerNum: leaving, active: false });
    assert.equal(g.state.phase, 'result'); assert.equal(g.state.result.winner, 'cancelled'); assert.equal(g.view(leaving).me.item, null);
    assert.equal(g.act(leaving, 'exclude', { playerNum: leaving, active: true }).error, null);
    g.act(0, 'next'); assert.equal(g.state.phase, 'describe'); assert.equal(g.state.round.seats.length, 4);
    g.act(0, 'stop'); assert.equal(g.state.phase, 'finished'); assert.equal(g.view(0).result, null); assert.equal(g.view(leaving).me.item, null);
  }
});

test('invalid settings, rosters and unavailable restart do not silently start a partial game', () => {
  assert.throws(() => game(2), /invalid_roster/);
  assert.throws(() => E.parseSettings({ category: 'unknown' }), /invalid_options/);
  const g = game(3); g.act(0, 'exclude', { playerNum: 1, active: false });
  const prior = clone(g.state); assert.equal(g.act(0, 'restart').error, 'not_enough_players');
  assert.deepEqual(g.state.history, prior.history); assert.equal(g.state.roundNo, prior.roundNo);
});
