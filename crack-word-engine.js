/* crack-word-engine.js — pure logic for 🔤 Crack the Word: fair letter
 * distribution across the room, the blank/letter tile layout, and scoring.
 * No DOM, no Firebase in here — same shape as next-round.js, so it runs
 * under node for the tests and the host page just calls into it.
 */
var CRACK_ENGINE = (() => {
  'use strict';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  /* The 5 vowels are never owned by a seat — distributeLetters() only ever
   * hands out CONSONANTS below, so a vowel's owner is always undefined —
   * but pressing one is still gated by whose turn it is, exactly like a
   * consonant (see crack-the-word.html's pressLetter); "ownerless" only
   * describes the letter-distribution side of things, not who may press.
   * CONSONANTS is the actual pool distributeLetters() hands out; a plain
   * ALPHABET-minus-VOWELS filter, computed once. */
  const VOWELS = ['A', 'E', 'I', 'O', 'U'];
  const CONSONANTS = ALPHABET.filter(l => !VOWELS.includes(l));

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

  /* Every letter someone presses that turns out to be in the word earns them
   * a flat point — small and constant regardless of tier, since it rewards
   * information given, not the length of the word it happened to belong to. */
  const LETTER_CREDIT = 1;

  /* How many of the word's letter POSITIONS (not unique letters) a set of
   * revealed letters accounts for — "wall" with L revealed is 2, not 1. */
  function revealedPositions(word, revealedLetters) {
    const set = new Set((revealedLetters || []).map(l => String(l).toUpperCase()));
    let n = 0;
    for (const ch of String(word).toUpperCase()) if (set.has(ch)) n++;
    return n;
  }

  /* How many letter positions are STILL blank when someone guesses correctly
   * — this is the shared team award (see SOLVER_BONUS below): everyone in
   * the room gets this many points, the solver a little more. It rewards
   * guessing early, off less information, the same way the old per-tier
   * formula tried to, but the number itself now means something a player
   * can see on the tile row at the moment they call it out — "3 blanks
   * left" and "+3 each" are the same number, not a hidden formula. */
  function remainingBlanks(word, revealedLetters) {
    return Math.max(0, letterCount(word) - revealedPositions(word, revealedLetters));
  }

  /* The solver's one point of credit for actually being the one who typed
   * the word in, on top of the team award everyone else also gets. Flat and
   * small — the achievement being rewarded is "spoke first", not "knew
   * more than the room", which the shared award already covers. */
  const SOLVER_BONUS = 1;

  /* How many distinct letters the word actually needs owners for — the same
   * count `distributeLetters()` uses to size `correctLetters`. This is the
   * real "how much is there to find" number: two people each holding one of
   * the word's four repeated letters doesn't make it easier, so turnLimitFor
   * budgets on unique letters, not total positions. */
  function uniqueLetterCount(word) {
    return new Set(String(word).toUpperCase().match(/[A-Za-z]/g) || []).size;
  }

  /* Same idea, but counting only consonants — vowels are free-for-all (see
   * VOWELS above) and never cost a turn to press, so turnLimitFor() budgets
   * on this, not uniqueLetterCount(), or a vowel-heavy word would inflate a
   * budget that vowels don't actually spend from. */
  function uniqueConsonantCount(word) {
    let n = 0;
    new Set(String(word).toUpperCase().match(/[A-Za-z]/g) || []).forEach(l => { if (!VOWELS.includes(l)) n++; });
    return n;
  }

  /* Total consonant POSITIONS (not unique) — the consonant-only counterpart
   * of letterCount(), used for turnLimitFor()'s small length-based nudge so
   * that term also only reflects what actually costs a turn to reveal. */
  function consonantPositionCount(word) {
    return (String(word).toUpperCase().match(/[A-Za-z]/g) || []).filter(l => !VOWELS.includes(l)).length;
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
    const unique = uniqueConsonantCount(word);
    const total = consonantPositionCount(word);
    const mult = TURN_MULT[difficulty] || TURN_MULT.medium;
    const raw = unique * mult + total * 0.3;
    return Math.min(TURN_MAX, Math.max(TURN_MIN, Math.round(raw)));
  }

  /* Point loss for every seat when a round's turn budget runs out before
   * anyone guesses it — a shared consequence for a shared budget. Scales
   * with turnLimit itself rather than being a flat number: turnLimit is
   * already the room's one number for "how big a challenge was this"
   * (unique consonants + length + concept difficulty + the host's own
   * turn-difficulty dial all feed into it — see turnLimitFor() and
   * applyTurnDifficulty() above), so deriving the penalty from it means a
   * short/easy word that gets squandered costs little, and a long/hard one
   * costs more, without maintaining a second parallel formula. The divisor
   * is picked so a middling turnLimit (~12, a typical short/medium word)
   * lands on 2 — the same number this was a flat constant at before. */
  const TURN_LIMIT_PENALTY_MIN = 1;
  const TURN_LIMIT_PENALTY_MAX = 5;
  const TURN_LIMIT_PENALTY_DIVISOR = 6;
  function penaltyFor(turnLimit) {
    return Math.min(TURN_LIMIT_PENALTY_MAX, Math.max(TURN_LIMIT_PENALTY_MIN, Math.round(turnLimit / TURN_LIMIT_PENALTY_DIVISOR)));
  }

  /* A second, host-set dial on top of turnLimitFor(): players found the
   * computed budget too generous, so the host can tighten it — "easy" is
   * exactly what turnLimitFor() already computes, "medium" (the default)
   * cuts it to two thirds, "hard" cuts it in half. This scales the whole
   * room's shared budget, not any one word's own concept difficulty
   * (that's still `card.level`, already baked into turnLimitFor's result) —
   * two independent knobs on the same number. */
  const TURN_DIFF_MULT = { easy: 1, medium: 2 / 3, hard: 1 / 2 };

  function applyTurnDifficulty(limit, turnDifficulty) {
    const mult = TURN_DIFF_MULT[turnDifficulty] || TURN_DIFF_MULT.medium;
    return Math.max(TURN_MIN, Math.round(limit * mult));
  }

  function normalizeGuess(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function isCorrectGuess(guess, word) {
    return normalizeGuess(guess) === normalizeGuess(word);
  }

  /* Splits the 21 CONSONANTS between `count` seats for one round of `word` —
   * vowels are never in this pool at all (see VOWELS above), so they never
   * get an owner and stay open to everyone. Two-phase round-robin over a
   * single shuffled seat order, same as before:
   *   1. the word's own unique consonants, shuffled, dealt first;
   *   2. every other consonant, shuffled, dealt next, continuing the SAME
   *      rotation (not restarted) so both passes stay in step.
   * That keeps both "how many consonants total" and "how many are actually
   * in the word" within 1 of each other across every seat — nobody ends up
   * starving for useful letters just because they went early or late in the
   * deal. Returns { owner: {A:0, B:2, …} (0-based seat per consonant, no
   * vowel keys at all), correctLetters, fillerLetters }. */
  function distributeLetters(word, count, rng) {
    const n = Math.max(1, Math.floor(count) || 1);
    const inWord = new Set(String(word).toUpperCase().match(/[A-Za-z]/g) || []);
    const correctLetters = shuffle(CONSONANTS.filter(l => inWord.has(l)), rng);
    const fillerLetters = shuffle(CONSONANTS.filter(l => !inWord.has(l)), rng);
    const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
    const owner = {};
    let seat = 0;
    correctLetters.forEach(l => { owner[l] = order[seat % n]; seat++; });
    fillerLetters.forEach(l => { owner[l] = order[seat % n]; seat++; });
    return { owner, correctLetters, fillerLetters };
  }

  /* The consonants owned by one seat — used to build that seat's own button
   * grid. Vowels never appear here: owner[vowel] is always undefined, so it
   * can never equal a real seat number. Deliberately not split into
   * "correct" / "filler" — a seat finds that out only by pressing, exactly
   * like everyone else watching the tiles. */
  function lettersForSeat(owner, seat) {
    return CONSONANTS.filter(l => owner[l] === seat);
  }

  return {
    ALPHABET, VOWELS, CONSONANTS, shuffle, letterCount, tileLayout, TIERS, tierOf, LETTER_CREDIT,
    revealedPositions, remainingBlanks, SOLVER_BONUS, normalizeGuess, isCorrectGuess,
    distributeLetters, lettersForSeat,
    uniqueLetterCount, uniqueConsonantCount, consonantPositionCount,
    TURN_MULT, TURN_MIN, TURN_MAX, turnLimitFor,
    TURN_LIMIT_PENALTY_MIN, TURN_LIMIT_PENALTY_MAX, TURN_LIMIT_PENALTY_DIVISOR, penaltyFor,
    TURN_DIFF_MULT, applyTurnDifficulty,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CRACK_ENGINE;
