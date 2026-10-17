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

test('reviewed bank retains 720 unique bilingual records and 700 eligible prompts', () => {
  validateCatalog(PROMPTS);
  assert.ok(PROMPTS.length >= 720);
  assert.ok(PROMPTS.filter(p => p.pack === 'everyday').length >= 360);
  assert.ok(PROMPTS.filter(p => p.pack === 'playful').length >= 360);
  assert.equal(DECK.pool('mixed').length, 700);
  assert.equal(DECK.pool('everyday').length, 351);
  assert.equal(DECK.pool('playful').length, 349);
  assert.equal(new Set(PROMPTS.map(p => p.en.trim().toLowerCase())).size, PROMPTS.length);
  assert.equal(new Set(PROMPTS.map(p => p.zhHant.trim())).size, PROMPTS.length);
  for (const prompt of PROMPTS) {
    assert.ok(typeof prompt.id === 'string' && prompt.id.trim());
    assert.ok(Object.isFrozen(prompt));
  }
});

test('single formal source has consistent browser card aliases and lookup', () => {
  for (const prompt of PROMPTS) {
    assert.equal(DECK.get(prompt.id), prompt);
    assert.equal(prompt.zh, prompt.zhHant);
    assert.equal(prompt.category, prompt.pack);
  }
  assert.equal(DECK.pool('mixed').length, PROMPTS.filter(DECK.isEligible).length);
  assert.ok(DECK.legacyItems.every(card => !PROMPTS.includes(card)));
  assert.deepEqual(DECK.pool('unknown'), []);
});

test('Mixed draws the entire expanded pool before eligible-pool recycling', () => {
  const total = DECK.pool('mixed').length;
  const { draws } = drawMany(total + 1);
  assert.equal(new Set(draws.slice(0, total).map(d => d.prompt.id)).size, total);
  assert.ok(draws.slice(0, total).every(d => d.recycledPool === false));
  assert.equal(draws[total].recycledPool, true);
  assert.notEqual(draws[total].prompt.id, draws[total - 1].prompt.id);
});

for (const mode of ['everyday', 'playful']) {
  test(`${mode}: only that pack, its full expanded pool before recycling`, () => {
    const total = DECK.pool(mode).length;
    const { draws } = drawMany(total + 1, { mode });
    assert.ok(draws.every(d => d.prompt.pack === mode));
    assert.equal(new Set(draws.slice(0, total).map(d => d.prompt.id)).size, total);
    assert.equal(draws[total].recycledPool, true);
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
  const next = drawMany(DECK.pool('everyday').length + 1, { mode: 'everyday', history: first.history });
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

test('deferred IDs retain seen history through modes and recycling but can never become fallback draws', () => {
  const disabled = PROMPTS.filter(prompt => !DECK.isEligible(prompt));
  const history = { seenIds: PROMPTS.map(prompt => prompt.id), recentIds: disabled.slice(-3).map(prompt => prompt.id), recentFamilies: disabled.slice(-3).map(prompt => prompt.family) };
  const before = JSON.stringify(history);
  for (const mode of ['mixed', 'everyday', 'playful']) {
    const result = selectPrompt({ mode, history, random: seeded(20) });
    assert.equal(result.recycledPool, true);
    assert.ok(DECK.isEligible(result.prompt));
    for (const prompt of disabled) assert.ok(result.history.seenIds.includes(prompt.id));
  }
  const { draws, history: after } = drawMany(1405, { history });
  assert.ok(draws.every(draw => DECK.isEligible(draw.prompt)));
  for (const prompt of disabled) assert.ok(after.seenIds.includes(prompt.id));
  assert.equal(JSON.stringify(history), before);
});

test('a disabled-only eligible pack fails explicitly instead of selecting disabled cards or legacy scenes', () => {
  const disabled = PROMPTS.filter(prompt => !DECK.isEligible(prompt));
  for (const mode of ['mixed', 'everyday', 'playful']) assert.throws(() => selectPrompt({ catalog: disabled, mode }), /No prompts/);
  const custom = { ...PROMPTS[0], id: 'custom-disabled', enabled: false };
  assert.throws(() => selectPrompt({ catalog: [custom] }), /No prompts/);
  const available = { ...PROMPTS[0], id: 'custom-active', en: 'Custom active.', zhHant: '自訂啟用。' };
  const { draws } = drawMany(3, { catalog: [custom, available], mode: 'everyday' });
  assert.deepEqual(draws.map(draw => draw.prompt.id), [available.id, available.id, available.id]);
});

test('Zero-weight pack stays disabled in Mixed; explicit pack selection overrides weights', () => {
  const { draws } = drawMany(DECK.pool('playful').length + 5, { weights: { everyday: 0, playful: 1 } });
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
  assert.ok(history.seenIds.length <= PROMPTS.length);
  assert.ok(history.recentIds.length <= 24);
  assert.ok(history.recentFamilies.length <= 24);
  assert.ok(draws.every(d => PROMPTS.some(p => p.id === d.prompt.id)));
});
