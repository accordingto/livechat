'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dixit-engine.js');
const { adapters } = require('../runtime/story-executor.cjs');
let serial = 0;
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Expansion player ' + (i + 1) }));
const clone = value => JSON.parse(JSON.stringify(value));
function firebase(value) {
  if (value == null || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, firebase(item)]).filter(([, item]) => item != null);
  return entries.length ? Object.fromEntries(entries) : null;
}
const command = (s, type, actor = 0, extra = {}) => ({ id: 'expansion-' + ++serial, sessionId: s.sessionId, turnId: s.turnId, type, actor, seed: 173 + serial, now: 1000 + serial, ...extra });
function act(s, type, actor = 0, extra = {}) {
  const next = E.apply(s, command(s, type, actor, extra));
  assert.equal(next.replies[actor]?.error, '', type + ' should succeed');
  return next;
}
function lobby(count = 4, legacy = false, artworkVersion = 2) {
  const s = E.create({ id: 'expansion-game-' + ++serial, roster: roster(count), seed: 761, sharedControls: true, targetScore: 100 });
  if (legacy) { delete s.deckVersion; delete s.cardCount; if (artworkVersion === 1) delete s.artworkVersion; }
  return s;
}
const start = (count = 4, legacy = false, art = 2) => act(lobby(count, legacy, art), 'deal', 0, { firstPlayerNum: 1 });
const physical = s => [...E.list(s.deck), ...E.list(s.discard), ...Object.values(s.hands).flatMap(E.list), ...Object.values(s.submissions).flatMap(E.list)];
function conserved(s, count) {
  const ids = physical(s);
  assert.equal(ids.length, count); assert.equal(new Set(ids).size, count);
  assert.deepEqual(ids.slice().sort(), Array.from({ length: count }, (_, i) => 'd' + String(i + 1).padStart(3, '0')));
}
function finish(s) {
  s = act(s, 'story', s.storyteller, { cardId: s.hands[s.storyteller][0], clueMode: 'spoken' });
  for (const n of s.roundPlayerNums.filter(n => n !== s.storyteller)) s = act(s, 'submit', n, { cardIds: s.hands[n].slice(0, s.roundSubmissionCount) });
  for (const n of s.roundPlayerNums.filter(n => n !== s.storyteller)) s = act(s, 'vote', n, { cardId: s.submissions[s.storyteller][0] });
  s = act(s, 'reveal');
  return act(s, 'advanceReveal', 0, { now: s.revealPopularAt });
}
const members = (s, count, inactiveNums = []) => E.membership(s, { roster: roster(count), added: roster(count).slice(s.roster.length), inactiveNums }, { now: 10000, seed: 499 });

test('fresh sessions use all 126 cards with the existing private hand sizes and base artwork version', () => {
  for (const count of [3, 4, 8]) {
    const s = start(count);
    assert.equal(s.deckVersion, 3); assert.equal(s.cardCount, 126); assert.equal(s.artworkVersion, 2);
    assert.equal(s.deck.length, 126 - count * (count === 3 ? 7 : 6));
    for (const n of s.roundPlayerNums) assert.equal(s.hands[n].length, count === 3 ? 7 : 6);
    conserved(s, 126);
    const publicView = E.view(s, 0).dixit;
    assert.equal(publicView.cardCount, 126); assert.equal(publicView.deckVersion, 3);
    assert.equal(publicView.deckCount, s.deck.length); assert.equal(publicView.hand, undefined);
    assert.equal(publicView.deck, undefined);
  }
});

test('an already-created 84-card lobby remains base-only even if its caller supplies expansion counts', () => {
  for (const art of [1, 2]) {
    const old = lobby(4, true, art); old.cardCount = 126;
    assert.equal(E.view(old, 0).dixit.cardCount, 84, 'only the session deck marker chooses its pool');
    const s = act(old, 'deal', 0, { firstPlayerNum: 1, deckVersion: 3, cardCount: 126 });
    assert.equal(s.cardCount, 84); assert.equal(E.view(s, 0).dixit.artworkVersion, art); conserved(s, 84);
  }
});

for (const count of [84, 126]) test(count + '-card games conserve their own pool through full draw exhaustion and Firebase reconstruction', () => {
  let s = start(4, count === 84), shuffled = false;
  const session = s.sessionId;
  for (let round = 0; round < 40 && !shuffled; round++) {
    // Exercise draw exhaustion without reaching the configured winning target.
    s.scores = {}; s = finish(s); conserved(s, count);
    const insufficient = s.deck.length < 4;
    const serialized = adapters.dixit.decode({ stateJson: JSON.stringify(firebase(s)) });
    s = act(serialized, 'nextRound'); conserved(s, count);
    assert.equal(s.sessionId, session); assert.equal(E.view(s, 0).dixit.cardCount, count);
    if (insufficient) { shuffled = true; assert.deepEqual(s.discard, []); }
  }
  assert.ok(shuffled, 'the draw pile must reach a real discard reshuffle');
});

for (const count of [84, 126]) test(count + '-card membership retains the pool, private hands and scores until explicit restart upgrades it', () => {
  let s = start(3, count === 84);
  const originalHands = clone(s.hands), session = s.sessionId;
  s.scores[2] = 13; s = members(s, 4);
  assert.deepEqual(s.hands[1], originalHands[1]); assert.equal(s.scores[2], 13);
  assert.equal(s.roster[3].pending, true); assert.deepEqual(s.hands[4], []); conserved(s, count);
  s = finish(s); s = act(s, 'nextRound');
  assert.equal(s.sessionId, session); assert.equal(s.scores[4], 0); assert.equal(s.hands[4].length, 6); conserved(s, count);
  const newcomerHand = s.hands[4].slice(); s = members(s, 4, [4]); s = members(s, 4);
  assert.deepEqual(s.hands[4], newcomerHand); assert.equal(s.roster[3].pending, true); conserved(s, count);
  s = members(s, 4, [4]); s = act(s, 'restart', 0, { deckVersion: 2, cardCount: 84 });
  assert.notEqual(s.sessionId, session); assert.equal(s.deckVersion, 3); assert.equal(s.cardCount, 126);
  assert.equal(s.targetScore, 100); assert.equal(s.roster[3].active, false); assert.equal(s.artworkVersion, 2);
  s = act(s, 'deal', 0, { firstPlayerNum: 1 });
  assert.deepEqual(s.hands[4], []); conserved(s, 126);
});

test('expansion cards use their own standalone faces through private selection, voting and revealed results', () => {
  const source = fs.readFileSync(require.resolve('../dixit-ui.js'), 'utf8');
  const deck = { version: 3, cards: Array.from({ length: 126 }, (_, i) => ({ id: 'd' + String(i + 1).padStart(3, '0'), image: (i < 84 ? 'assets/dixit-v2/' : 'assets/dixit-expansion-1/') + 'd' + String(i + 1).padStart(3, '0') + '.webp' })) };
  const context = { DIXIT_DECK: deck }; vm.runInNewContext(source, context);
  const U = context.DIXIT_UI;
  for (const id of ['d085', 'd100', 'd126']) {
    assert.equal(U.picture(id).src, 'assets/dixit-expansion-1/' + id + '.webp');
    assert.equal(U.picture(id).atlas, false);
    assert.match(U.cardHTML(id, 1), new RegExp('src="assets/dixit-expansion-1/' + id + '.webp"'));
  }
  let s, chosen;
  for (let seed = 1; seed < 30 && !chosen; seed++) {
    s = act({ ...lobby(), rngState: seed }, 'deal', 0, { firstPlayerNum: 1 });
    chosen = s.hands[1].find(id => Number(id.slice(1)) > 84);
  }
  assert.ok(chosen, 'at least one seeded real hand includes an expansion card');
  const image = 'assets/dixit-expansion-1/' + chosen + '.webp';
  assert.ok(U.tableHTML(E.view(s, 1)).includes(image));
  assert.ok(!U.tableHTML(E.view(s, 0), { host: true }).includes(image), 'the shared table keeps the hand private');
  s = act(s, 'story', 1, { cardId: chosen, clueMode: 'spoken' });
  for (const n of [2, 3, 4]) s = act(s, 'submit', n, { cardIds: [s.hands[n][0]] });
  assert.ok(U.tableHTML(E.view(s, 2)).includes(image));
  for (const n of [2, 3, 4]) s = act(s, 'vote', n, { cardId: chosen });
  s = act(s, 'reveal'); s = act(s, 'advanceReveal', 0, { now: s.revealPopularAt });
  assert.ok(U.tableHTML(E.view(s, 0), { host: true }).includes(image)); conserved(s, 126);
});

test('cached base manifests resolve expansion pictures while original atlas and base faces remain stable', () => {
  const source = fs.readFileSync(require.resolve('../dixit-ui.js'), 'utf8');
  const oldCards = Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit/atlas-' + (Math.floor(i / 12) + 1) + '.webp' }));
  const baseCards = Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit-v2/d' + String(i + 1).padStart(3, '0') + '.webp' }));
  const context = { DIXIT_DECK: { version: 2, cards: baseCards, legacyCards: oldCards } }; vm.runInNewContext(source, context);
  const U = context.DIXIT_UI;
  assert.equal(U.picture('d084', 2).src, 'assets/dixit-v2/d084.webp');
  assert.equal(U.picture('d084', 1).src, 'assets/dixit/atlas-7.webp');
  for (const id of ['d085', 'd126']) {
    assert.equal(U.picture(id, 2).src, 'assets/dixit-expansion-1/' + id + '.webp');
    assert.equal(U.picture(id, 2).atlas, false);
  }
  context.DIXIT_DECK = { version: 1, cards: oldCards };
  assert.equal(U.picture('d084', 2).src, 'assets/dixit/atlas-7.webp');
  assert.equal(U.picture('d126', 2).src, 'assets/dixit-expansion-1/d126.webp');
  assert.match(U.rulesHTML(E.view(lobby(), 0).dixit), /126 original illustrations/);
  assert.match(U.rulesHTML(E.view(lobby(4, true), 0).dixit), /84 original illustrations/);
  assert.match(U.rulesHTML({ sessionId: 'cached-old-game' }), /84 original illustrations/);
});
