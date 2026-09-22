/* crack-word-engine.js — pure logic for 🔤 Crack the Word: fair letter
 * distribution across the room, the blank/letter tile layout, and scoring.
 * No DOM, no Firebase in here — same shape as next-round.js, so it runs
 * under node for the tests and the host page just calls into it.
 */
var CRACK_ENGINE = (() => {
  'use strict';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function shuffle(arr, rng) {
    const a = arr.slice();
    const rand = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* How many actual letters (A-Z) a word needs revealed to be solved — this is
   * what tiering and the blank row are both driven by, not the raw string
   * length, so a two-word phrase like "Ice Cream" isn't inflated by its space. */
  function letterCount(word) {
    return (String(word).match(/[A-Za-z]/g) || []).length;
  }

  /* Every character in the word, tagged so the caller can render a blank/letter
   * tile for a real letter and a plain static character (space, hyphen…) for
   * anything else — those never need to be "revealed", they're just punctuation
   * that was never going to be a secret. */
  function tileLayout(word) {
    return String(word).split('').map(ch => ({
      ch: ch.toUpperCase(),
      isLetter: /[A-Za-z]/.test(ch),
    }));
  }

  const TIERS = ['short', 'medium', 'long'];
  /* Boundaries chosen from the actual taboo deck's letter-count spread (700
   * words, 2–13 letters): short ≤5 covers ~340 words, medium 6–8 ~270,
   * long ≥9 ~90 — all three stay well stocked for a whole session. */
  function tierOf(letters) {
    if (letters <= 5) return 'short';
    if (letters <= 8) return 'medium';
    return 'long';
  }

  /* Base points a correct guess is worth before the reveal penalty below —
   * longer words are worth chasing even once a few letters are already up. */
  const TIER_BASE = { short: 5, medium: 8, long: 12 };

  /* Every letter someone presses that turns out to be in the word earns them
   * a flat point — small and constant regardless of tier, since it rewards
   * information given, not the length of the word it happened to belong to. */
  const LETTER_CREDIT = 1;

  /* Wheel-of-Fortune-style: the more of the word was already up when someone
   * guesses it right, the less it's worth — floors at 1 so a guess is never
   * worthless, even on a fully-revealed word. */
  function guesserScore(tier, revealedPositionsCount, totalPositions) {
    const base = TIER_BASE[tier] || TIER_BASE.medium;
    if (!totalPositions) return base;
    const frac = Math.max(0, 1 - revealedPositionsCount / totalPositions);
    return Math.max(1, Math.round(base * frac));
  }

  /* How many of the word's letter POSITIONS (not unique letters) a set of
   * revealed letters accounts for — "wall" with L revealed is 2, not 1. */
  function revealedPositions(word, revealedLetters) {
    const set = new Set((revealedLetters || []).map(l => String(l).toUpperCase()));
    let n = 0;
    for (const ch of String(word).toUpperCase()) if (set.has(ch)) n++;
    return n;
  }

  /* How many distinct letters the word actually needs owners for — the same
   * count `distributeLetters()` uses to size `correctLetters`. This is the
   * real "how much is there to find" number: two people each holding one of
   * the word's four repeated letters doesn't make it easier, so turnLimitFor
   * budgets on unique letters, not total positions. */
  function uniqueLetterCount(word) {
    return new Set(String(word).toUpperCase().match(/[A-Za-z]/g) || []).size;
  }

  /* Turns per unique letter, by the word's own concept-difficulty tier (the
   * taboo deck's existing easy/medium/hard `level` — see game-data.js). A
   * harder concept needs more turns for the same letter count: seeing
   * "_ E _ I _ I E N C E" up doesn't make "Resilience" easy to name the way
   * "_ I N E A P P L E" makes "Pineapple" easy, so hard words get a bigger
   * per-letter budget rather than a flat bonus. */
  const TURN_MULT = { easy: 1.2, medium: 1.6, hard: 2.2 };
  const TURN_MIN = 6;
  const TURN_MAX = 30;

  /* The shared turn budget for a round: enough presses for the room to find
   * a good chunk of the word's letters together, not so many that the whole
   * thing gets revealed by mechanical exhaustion before anyone has to guess.
   * Driven by exactly three things — how many unique letters need finding,
   * how long the word is end to end, and how hard the concept itself is to
   * name once you can see it — then clamped to a sane range so a 2-letter
   * word and a 13-letter word both land somewhere playable. */
  function turnLimitFor(word, difficulty) {
    const unique = uniqueLetterCount(word);
    const total = letterCount(word);
    const mult = TURN_MULT[difficulty] || TURN_MULT.medium;
    const raw = unique * mult + total * 0.3;
    return Math.min(TURN_MAX, Math.max(TURN_MIN, Math.round(raw)));
  }

  /* Flat point loss for every seat when a round's turn budget runs out
   * before anyone guesses it — a shared consequence for a shared budget,
   * not scaled by tier or difficulty (only the turn count itself is). */
  const TURN_LIMIT_PENALTY = 2;

  function normalizeGuess(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function isCorrectGuess(guess, word) {
    return normalizeGuess(guess) === normalizeGuess(word);
  }

  /* Splits the 26 letters between `count` seats for one round of `word`.
   * Two-phase round-robin over a single shuffled seat order:
   *   1. the word's own unique letters, shuffled, dealt first;
   *   2. every other letter of the alphabet, shuffled, dealt next, continuing
   *      the SAME rotation (not restarted) so both passes stay in step.
   * That keeps both "how many letters total" and "how many are actually in
   * the word" within 1 of each other across every seat — nobody ends up
   * starving for useful letters just because they went early or late in the
   * deal. Returns { owner: {A:0, B:2, …} (0-based seat per letter),
   * correctLetters, fillerLetters }. */
  function distributeLetters(word, count, rng) {
    const n = Math.max(1, Math.floor(count) || 1);
    const inWord = new Set(String(word).toUpperCase().match(/[A-Za-z]/g) || []);
    const correctLetters = shuffle(ALPHABET.filter(l => inWord.has(l)), rng);
    const fillerLetters = shuffle(ALPHABET.filter(l => !inWord.has(l)), rng);
    const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
    const owner = {};
    let seat = 0;
    correctLetters.forEach(l => { owner[l] = order[seat % n]; seat++; });
    fillerLetters.forEach(l => { owner[l] = order[seat % n]; seat++; });
    return { owner, correctLetters, fillerLetters };
  }

  /* The letters owned by one seat — used to build that seat's own button grid.
   * Deliberately not split into "correct" / "filler" here: a seat finds that
   * out only by pressing, exactly like everyone else watching the tiles. */
  function lettersForSeat(owner, seat) {
    return ALPHABET.filter(l => owner[l] === seat);
  }

  return {
    ALPHABET, shuffle, letterCount, tileLayout, TIERS, tierOf, TIER_BASE, LETTER_CREDIT,
    guesserScore, revealedPositions, normalizeGuess, isCorrectGuess,
    distributeLetters, lettersForSeat,
    uniqueLetterCount, TURN_MULT, TURN_MIN, TURN_MAX, turnLimitFor, TURN_LIMIT_PENALTY,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CRACK_ENGINE;
