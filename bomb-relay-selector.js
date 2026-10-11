/* Pure prompt rotation only. Hub owns storage, synchronization and bomb timers. */
var BOMB_RELAY_SELECTOR = (() => {
  'use strict';
  const deck = typeof BOMB_RELAY_DECK !== 'undefined' ? BOMB_RELAY_DECK : require('./bomb-relay-deck.js');
  const PROMPTS = deck.items;
/** @typedef {'everyday'|'playful'} Pack */
/** @typedef {'mixed'|'everyday'|'playful'} Mode */
/** @typedef {{id:string,pack:Pack,family:string,en:string,zhHant:string}} Prompt */
/** @typedef {{seenIds:string[],recentIds:string[],recentFamilies:string[]}} History */

const DEFAULT_WEIGHTS = Object.freeze({ everyday: 1, playful: 1 });
const PACKS = Object.freeze(['everyday', 'playful']);
const HISTORY_LIMIT = 24;

/** @returns {History} A new, serializable history. No global mutable state. */
function createHistory() {
  return { seenIds: [], recentIds: [], recentFamilies: [] };
}

/** @param {unknown} catalog @returns {asserts catalog is Prompt[]} */
function validateCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new TypeError('Prompt catalog must be a non-empty array.');
  }
  const ids = new Set();
  for (const item of catalog) {
    if (!item || typeof item !== 'object') {
      throw new TypeError('Every prompt must be an object.');
    }
    for (const field of ['id', 'family', 'en', 'zhHant']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) {
        throw new TypeError(`Every prompt needs a non-empty ${field}.`);
      }
    }
    if (!PACKS.includes(item.pack)) {
      throw new TypeError(`Unknown prompt pack: ${String(item.pack)}`);
    }
    if (ids.has(item.id)) throw new TypeError(`Duplicate prompt ID: ${item.id}`);
    ids.add(item.id);
  }
}

/** @param {unknown} history @returns {asserts history is History} */
function validateHistory(history) {
  if (!history || typeof history !== 'object') {
    throw new TypeError('History must be an object.');
  }
  for (const field of ['seenIds', 'recentIds', 'recentFamilies']) {
    if (!Array.isArray(history[field]) ||
        !history[field].every(value => typeof value === 'string')) {
      throw new TypeError(`History.${field} must be an array of strings.`);
    }
  }
}

/** @param {() => number} random @returns {number} */
function randomUnit(random) {
  const value = random();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random() must return a finite number in [0, 1).');
  }
  return value;
}

/**
 * Draw a prompt without mutating the catalog or the supplied history.
 *
 * Priority:
 * 1. Use only enabled packs, and avoid exact repeats until that eligible pool
 *    is exhausted. In Mixed, an exhausted pack waits for the other enabled pack.
 * 2. Pick among non-empty packs using relative weights (1:1 is a playtest
 *    starting point, NOT a validated optimum or forced alternation).
 * 3. Prefer a different recent family within the chosen pack when possible.
 * 4. On exhaustion, recycle only the eligible pool, keeping other-pack history.
 *    Avoid immediately repeating the last prompt whenever an alternative exists.
 *
 * This is content rotation, NOT automatic answer validation. Family avoidance
 * is best-effort and must never cause an empty draw or a retry loop.
 *
 * @param {{
 *   catalog?: Prompt[],
 *   mode?: Mode,
 *   history?: History,
 *   weights?: Partial<Record<Pack, number>>,
 *   familyWindow?: number,
 *   random?: () => number
 * }} [options]
 * @returns {{prompt:Prompt, history:History, recycledPool:boolean}}
 */
function selectPrompt({
  catalog = PROMPTS,
  mode = 'mixed',
  history = createHistory(),
  weights = DEFAULT_WEIGHTS,
  familyWindow = 3,
  random = Math.random,
} = {}) {
  validateCatalog(catalog);
  validateHistory(history);
  if (!['mixed', ...PACKS].includes(mode)) {
    throw new RangeError(`Unknown content mode: ${String(mode)}`);
  }
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  if (!Number.isInteger(familyWindow) || familyWindow < 0 || familyWindow > HISTORY_LIMIT) {
    throw new RangeError(`familyWindow must be an integer from 0 to ${HISTORY_LIMIT}.`);
  }
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
    throw new TypeError('weights must be an object.');
  }
  const effectiveWeights = { ...DEFAULT_WEIGHTS, ...weights };
  for (const pack of PACKS) {
    if (typeof effectiveWeights[pack] !== 'number' ||
        !Number.isFinite(effectiveWeights[pack]) || effectiveWeights[pack] < 0) {
      throw new RangeError('Pack weights must be finite, non-negative numbers.');
    }
  }
  const enabledPacks = mode === 'mixed'
    ? PACKS.filter(pack => effectiveWeights[pack] > 0)
    : [mode];
  const eligible = catalog.filter(item => enabledPacks.includes(item.pack));
  if (eligible.length === 0) {
    throw new RangeError('No prompts in the enabled packs; check the loaded catalog and filters.');
  }

  // Drop stale IDs from removed cards, but keep known IDs from disabled packs.
  const knownIds = new Set(catalog.map(item => item.id));
  const seen = new Set(history.seenIds.filter(id => knownIds.has(id)));
  let candidates = eligible.filter(item => !seen.has(item.id));
  let recycledPool = false;
  if (candidates.length === 0) {
    recycledPool = true;
    for (const item of eligible) seen.delete(item.id);
    candidates = eligible.slice();
  }

  const lastId = history.recentIds.at(-1);
  const notLast = candidates.filter(item => item.id !== lastId);
  if (notLast.length > 0) candidates = notLast;

  // Use relative pack weights only where there are still eligible candidates.
  const availablePacks = enabledPacks.filter(pack => candidates.some(item => item.pack === pack));
  const relative = availablePacks.map(pack => mode === 'mixed' ? effectiveWeights[pack] : 1);
  // Normalize first so very large, but individually finite, weights cannot overflow.
  const maxWeight = Math.max(...relative);
  const normalized = relative.map(weight => weight / maxWeight);
  const total = normalized.reduce((sum, weight) => sum + weight, 0);
  let target = randomUnit(random) * total;
  let chosenPack = availablePacks.at(-1);
  for (let i = 0; i < availablePacks.length; i += 1) {
    target -= normalized[i];
    if (target < 0) {
      chosenPack = availablePacks[i];
      break;
    }
  }
  candidates = candidates.filter(item => item.pack === chosenPack);

  const recentFamilies = new Set(
    familyWindow === 0 ? [] : history.recentFamilies.slice(-familyWindow)
  );
  const freshFamily = candidates.filter(item => !recentFamilies.has(item.family));
  if (freshFamily.length > 0) candidates = freshFamily;
  const recentIds = new Set(history.recentIds);
  const freshId = candidates.filter(item => !recentIds.has(item.id));
  if (freshId.length > 0) candidates = freshId;

  const prompt = candidates[Math.floor(randomUnit(random) * candidates.length)];
  seen.add(prompt.id);
  return {
    prompt,
    history: {
      seenIds: [...seen],
      recentIds: [...history.recentIds, prompt.id].slice(-HISTORY_LIMIT),
      recentFamilies: [...history.recentFamilies, prompt.family].slice(-HISTORY_LIMIT),
    },
    recycledPool,
  };
}

  return Object.freeze({ DEFAULT_WEIGHTS, createHistory, validateCatalog, selectPrompt });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_SELECTOR;
