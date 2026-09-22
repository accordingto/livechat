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

test('remainingBlanks counts unrevealed letter positions, matching the example: 3 blanks left', () => {
  // "wall" revealed W and A leaves L, L unrevealed — 2 blanks, not 3, but the
  // shape is the same: total positions minus however many are already up
  assert.equal(E.remainingBlanks('wall', ['W', 'A']), 2);
  assert.equal(E.remainingBlanks('wall', []), 4);
  assert.equal(E.remainingBlanks('wall', ['W', 'A', 'L']), 0);
});

test('remainingBlanks never goes negative', () => {
  assert.equal(E.remainingBlanks('cat', ['C', 'A', 'T']), 0);
});

test('remainingBlanks ignores letters that were pressed but aren\'t in the word', () => {
  // an excluded/filler letter someone pressed shouldn't reduce the blank count
  assert.equal(E.remainingBlanks('wall', ['Z', 'Q']), 4);
});

test('SOLVER_BONUS is a small flat amount on top of the team award', () => {
  assert.equal(E.SOLVER_BONUS, 1);
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

test('uniqueLetterCount counts distinct letters, not positions', () => {
  assert.equal(E.uniqueLetterCount('wall'), 3); // w, a, l
  assert.equal(E.uniqueLetterCount('Pot'), 3);
  assert.equal(E.uniqueLetterCount('Ice Cream'), 6); // i c e r a m (case/space-insensitive)
});

test('turnLimitFor scales with difficulty at the same word', () => {
  const easy = E.turnLimitFor('Pineapple', 'easy');
  const medium = E.turnLimitFor('Pineapple', 'medium');
  const hard = E.turnLimitFor('Pineapple', 'hard');
  assert.ok(easy < medium);
  assert.ok(medium < hard);
});

test('turnLimitFor scales with unique letters at the same difficulty', () => {
  const short = E.turnLimitFor('cat', 'medium'); // 3 unique
  const long = E.turnLimitFor('resilience', 'medium'); // more unique letters
  assert.ok(long > short);
});

test('turnLimitFor is clamped to [TURN_MIN, TURN_MAX]', () => {
  assert.ok(E.turnLimitFor('a', 'easy') >= E.TURN_MIN);
  assert.ok(E.turnLimitFor('pneumonoultramicroscopicsilicovolcanoconiosis', 'hard') <= E.TURN_MAX);
});

test('turnLimitFor is deterministic for the same inputs', () => {
  assert.equal(E.turnLimitFor('Underwear', 'hard'), E.turnLimitFor('Underwear', 'hard'));
});

test('turnLimitFor falls back to the medium multiplier for an unknown difficulty', () => {
  assert.equal(E.turnLimitFor('wall', 'nonsense'), E.turnLimitFor('wall', 'medium'));
});

test('applyTurnDifficulty: easy is the unscaled turnLimitFor value', () => {
  const limit = E.turnLimitFor('Underwear', 'medium');
  assert.equal(E.applyTurnDifficulty(limit, 'easy'), limit);
});

test('applyTurnDifficulty: medium cuts to two thirds, hard to one half', () => {
  const limit = 18; // a value comfortably above TURN_MIN so the cuts aren't clamped away
  assert.equal(E.applyTurnDifficulty(limit, 'medium'), Math.round(18 * 2 / 3));
  assert.equal(E.applyTurnDifficulty(limit, 'hard'), Math.round(18 * 1 / 2));
});

test('applyTurnDifficulty never cuts below TURN_MIN', () => {
  assert.ok(E.applyTurnDifficulty(E.TURN_MIN, 'hard') >= E.TURN_MIN);
  assert.ok(E.applyTurnDifficulty(1, 'hard') >= E.TURN_MIN);
});

test('applyTurnDifficulty falls back to medium for an unknown setting', () => {
  assert.equal(E.applyTurnDifficulty(18, 'nonsense'), E.applyTurnDifficulty(18, 'medium'));
});
