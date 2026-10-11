const test = require('node:test');
const assert = require('node:assert/strict');
const DECK = require('../bomb-relay-deck.js');
const PROMPTS = DECK.items;
const { createHistory, selectPrompt, validateCatalog } = require('../bomb-relay-selector.js');

function seeded(seed = 1) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function drawMany(count, options = {}) {
  let history = options.history ?? createHistory();
  const random = options.random ?? seeded(731);
  const draws = [];
  for (let i = 0; i < count; i += 1) {
    const result = selectPrompt({ ...options, history, random });
    history = result.history;
    draws.push(result);
  }
  return { draws, history };
}

test('120 unique bilingual cards, 60 per pack; no duplicate English wording', () => {
  validateCatalog(PROMPTS);
  assert.equal(PROMPTS.length, 120);
  assert.equal(PROMPTS.filter(p => p.pack === 'everyday').length, 60);
  assert.equal(PROMPTS.filter(p => p.pack === 'playful').length, 60);
  assert.equal(new Set(PROMPTS.map(p => p.en.trim().toLowerCase())).size, 120);
  assert.equal(new Set(PROMPTS.map(p => p.zhHant.trim())).size, 120);
  for (const prompt of PROMPTS) {
    assert.ok(prompt.id.startsWith(`tb-${prompt.pack}-`));
    assert.ok(Object.isFrozen(prompt));
  }
});

test('single formal source has consistent browser card aliases and lookup', () => {
  for (const prompt of PROMPTS) {
    assert.equal(DECK.get(prompt.id), prompt);
    assert.equal(prompt.zh, prompt.zhHant);
    assert.equal(prompt.category, prompt.pack);
  }
  assert.equal(DECK.pool('mixed').length, 120);
  assert.ok(DECK.legacyItems.every(card => !PROMPTS.includes(card)));
  assert.deepEqual(DECK.pool('unknown'), []);
});

test('Mixed draws all 120 distinct prompts before eligible-pool recycling', () => {
  const { draws } = drawMany(121);
  assert.equal(new Set(draws.slice(0, 120).map(d => d.prompt.id)).size, 120);
  assert.ok(draws.slice(0, 120).every(d => d.recycledPool === false));
  assert.equal(draws[120].recycledPool, true);
  assert.notEqual(draws[120].prompt.id, draws[119].prompt.id);
});

for (const mode of ['everyday', 'playful']) {
  test(`${mode}: only that pack, all 60 before recycling`, () => {
    const { draws } = drawMany(61, { mode });
    assert.ok(draws.every(d => d.prompt.pack === mode));
    assert.equal(new Set(draws.slice(0, 60).map(d => d.prompt.id)).size, 60);
    assert.equal(draws[60].recycledPool, true);
  });
}

test('Mode switches preserve history instead of resetting it', () => {
  const first = drawMany(8, { mode: 'everyday' });
  const middle = drawMany(8, { mode: 'playful', history: first.history });
  const last = drawMany(8, { mode: 'everyday', history: middle.history });
  const allIds = [...first.draws, ...middle.draws, ...last.draws].map(d => d.prompt.id);
  assert.equal(new Set(allIds).size, 24);
  assert.equal(last.history.seenIds.length, 24);
});

test('Recycling one pack keeps seen IDs from the other pack', () => {
  const first = drawMany(4, { mode: 'playful' });
  const next = drawMany(61, { mode: 'everyday', history: first.history });
  for (const d of first.draws) assert.ok(next.history.seenIds.includes(d.prompt.id));
});

test('Recent families are avoided when the chosen pack has alternatives', () => {
  const { draws } = drawMany(24, { mode: 'everyday', familyWindow: 3 });
  for (let i = 1; i < draws.length; i += 1) {
    const recent = draws.slice(Math.max(0, i - 3), i).map(d => d.prompt.family);
    assert.ok(!recent.includes(draws[i].prompt.family));
  }
});

test('Small catalogs still work when all recent families are excluded', () => {
  const catalog = PROMPTS.slice(0, 2);
  const { draws } = drawMany(8, { catalog, mode: 'everyday', familyWindow: 3 });
  assert.equal(draws.length, 8);
  for (let i = 1; i < draws.length; i += 1) assert.notEqual(draws[i].prompt.id, draws[i-1].prompt.id);
});

test('A single-card pack can recycle without an infinite loop', () => {
  const { draws } = drawMany(3, { catalog: PROMPTS.slice(0, 1), mode: 'everyday' });
  assert.deepEqual(draws.map(d => d.recycledPool), [false, true, true]);
});

test('Input history is not mutated; independent rooms do not share state', () => {
  const history = createHistory();
  const before = structuredClone(history);
  const first = selectPrompt({ history, random: seeded(20) });
  assert.deepEqual(history, before);
  const second = selectPrompt({ history, random: seeded(20) });
  assert.equal(first.prompt.id, second.prompt.id);
  assert.notEqual(first.history, history);
});

test('Serialized history can be restored, including across app restarts', () => {
  const first = drawMany(17);
  const restored = JSON.parse(JSON.stringify(first.history));
  const next = drawMany(17, { history: restored });
  assert.equal(new Set([...first.draws, ...next.draws].map(d => d.prompt.id)).size, 34);
});

test('Removed IDs are cleaned without clearing known history', () => {
  const history = { seenIds: ['removed-card', PROMPTS[0].id], recentIds: ['removed-card'], recentFamilies: ['old-family'] };
  const next = selectPrompt({ history, random: seeded(44) });
  assert.ok(!next.history.seenIds.includes('removed-card'));
  assert.ok(next.history.seenIds.includes(PROMPTS[0].id));
  assert.notEqual(next.prompt.id, PROMPTS[0].id);
});

test('Zero-weight pack stays disabled in Mixed; explicit pack selection overrides weights', () => {
  const { draws } = drawMany(65, { weights: { everyday: 0, playful: 1 } });
  assert.ok(draws.every(d => d.prompt.pack === 'playful'));
  const result = selectPrompt({ mode: 'everyday', weights: { everyday: 0, playful: 1 } });
  assert.equal(result.prompt.pack, 'everyday');
});

test('Invalid random results fail explicitly', () => {
  for (const value of [-1, 1, Infinity, NaN, '0.5']) {
    assert.throws(() => selectPrompt({ random: () => value }), /random/);
  }
});

test('Invalid catalog, mode, weights, and history fail explicitly', () => {
  assert.throws(() => selectPrompt({ catalog: [] }), /non-empty/);
  assert.throws(() => selectPrompt({ catalog: [PROMPTS[0], PROMPTS[0]] }), /Duplicate/);
  assert.throws(() => selectPrompt({ mode: 'unknown' }), /Unknown/);
  assert.throws(() => selectPrompt({ weights: { everyday: 0, playful: 0 } }), /No prompts/);
  assert.throws(() => selectPrompt({ weights: { everyday: -1 } }), /weights/);
  assert.throws(() => selectPrompt({ weights: { playful: Infinity } }), /weights/);
  assert.throws(() => selectPrompt({ familyWindow: -1 }), /familyWindow/);
  assert.throws(() => selectPrompt({ history: {} }), /History/);
  assert.throws(() => selectPrompt({ catalog: PROMPTS.slice(0, 2), mode: 'playful' }), /No prompts/);
});

test('Seeded stress draw remains bounded and returns known cards', () => {
  const { draws, history } = drawMany(1200);
  assert.equal(draws.length, 1200);
  assert.ok(history.seenIds.length <= 120);
  assert.ok(history.recentIds.length <= 24);
  assert.ok(history.recentFamilies.length <= 24);
  assert.ok(draws.every(d => PROMPTS.some(p => p.id === d.prompt.id)));
});
