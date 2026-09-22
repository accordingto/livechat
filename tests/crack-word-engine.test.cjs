const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../crack-word-engine.js');

test('letterCount ignores spaces and punctuation', () => {
  assert.equal(E.letterCount('wall'), 4);
  assert.equal(E.letterCount('Ice Cream'), 8);
  assert.equal(E.letterCount('T-shirt'), 6);
});

test('tierOf follows the deck-derived boundaries', () => {
  assert.equal(E.tierOf(2), 'short');
  assert.equal(E.tierOf(5), 'short');
  assert.equal(E.tierOf(6), 'medium');
  assert.equal(E.tierOf(8), 'medium');
  assert.equal(E.tierOf(9), 'long');
  assert.equal(E.tierOf(13), 'long');
});

test('tileLayout tags letters vs punctuation and upper-cases letters', () => {
  const t = E.tileLayout('Ice Cream');
  assert.equal(t.length, 9);
  assert.equal(t[3].ch, ' ');
  assert.equal(t[3].isLetter, false);
  assert.equal(t[0].ch, 'I');
  assert.equal(t[0].isLetter, true);
  assert.equal(t.filter(x => x.isLetter).length, 8);
});

test('isCorrectGuess is case- and whitespace-insensitive', () => {
  assert.equal(E.isCorrectGuess('wall', 'Wall'), true);
  assert.equal(E.isCorrectGuess('  WALL  ', 'Wall'), true);
  assert.equal(E.isCorrectGuess('ice   cream', 'Ice Cream'), true);
  assert.equal(E.isCorrectGuess('walls', 'Wall'), false);
  assert.equal(E.isCorrectGuess('', 'Wall'), false);
});

test('revealedPositions counts positions, not unique letters', () => {
  assert.equal(E.revealedPositions('wall', ['L']), 2);
  assert.equal(E.revealedPositions('wall', ['W', 'L']), 3);
  assert.equal(E.revealedPositions('wall', []), 0);
  assert.equal(E.revealedPositions('wall', ['W', 'A', 'L']), 4);
});

test('guesserScore decreases toward a floor of 1 as more gets revealed', () => {
  const none = E.guesserScore('medium', 0, 6);
  const half = E.guesserScore('medium', 3, 6);
  const all = E.guesserScore('medium', 6, 6);
  assert.ok(none > half);
  assert.ok(half >= all);
  assert.equal(all, 1);
  assert.ok(none >= 1);
});

test('guesserScore never returns less than 1 even fully revealed', () => {
  for (const tier of E.TIERS) {
    assert.equal(E.guesserScore(tier, 20, 20), 1);
  }
});

test('longer tiers are worth more at the same reveal fraction', () => {
  const s = E.guesserScore('short', 0, 4);
  const m = E.guesserScore('medium', 0, 7);
  const l = E.guesserScore('long', 0, 10);
  assert.ok(s < m);
  assert.ok(m < l);
});

test('distributeLetters assigns every one of the 26 letters to exactly one seat', () => {
  const { owner } = E.distributeLetters('wall', 4);
  assert.equal(Object.keys(owner).length, 26);
  for (const l of E.ALPHABET) assert.ok(owner[l] >= 0 && owner[l] < 4);
});

test('distributeLetters splits the word\'s own letters as evenly as possible', () => {
  // "procrastination" has 10 unique letters (p r o c a s t i n) — wait, count them
  const word = 'onomatopoeia'; // unique letters: o n m a t p e i = 8
  for (let count = 2; count <= 9; count++) {
    for (let trial = 0; trial < 25; trial++) {
      const { owner, correctLetters } = E.distributeLetters(word, count);
      const perSeat = new Array(count).fill(0);
      correctLetters.forEach(l => perSeat[owner[l]]++);
      const min = Math.min(...perSeat), max = Math.max(...perSeat);
      assert.ok(max - min <= 1, `count=${count} correct-letter spread was ${min}-${max}`);
    }
  }
});

test('distributeLetters keeps total letters per seat within 1 of each other too', () => {
  const word = 'cat'; // only 3 unique letters — most seats get filler only
  for (let count = 2; count <= 9; count++) {
    const { owner } = E.distributeLetters(word, count);
    const perSeat = new Array(count).fill(0);
    Object.values(owner).forEach(s => perSeat[s]++);
    const min = Math.min(...perSeat), max = Math.max(...perSeat);
    assert.ok(max - min <= 1, `count=${count} total spread was ${min}-${max}`);
  }
});

test('distributeLetters is reproducible with an injected rng', () => {
  let n = 0;
  const rng = () => { n = (n + 0.31) % 1; return n; };
  const a = E.distributeLetters('wall', 4, rng);
  n = 0;
  const b = E.distributeLetters('wall', 4, rng);
  assert.deepEqual(a.owner, b.owner);
});

test('lettersForSeat returns exactly the letters distributeLetters assigned to it', () => {
  const { owner } = E.distributeLetters('sunshine', 5);
  for (let seat = 0; seat < 5; seat++) {
    const mine = E.lettersForSeat(owner, seat);
    for (const l of mine) assert.equal(owner[l], seat);
    for (const l of E.ALPHABET) if (owner[l] === seat) assert.ok(mine.includes(l));
  }
});

test('a one-letter room still gets every letter assigned somewhere', () => {
  const { owner } = E.distributeLetters('hi', 1);
  assert.equal(Object.keys(owner).length, 26);
  for (const l of E.ALPHABET) assert.equal(owner[l], 0);
});
