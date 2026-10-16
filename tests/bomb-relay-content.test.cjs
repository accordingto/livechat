'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const catalog = require('../content/bomb-relay-prompts.json');
const legacy = require('../content/bomb-relay-legacy-scenes.json');
const manifest = require('../content/bomb-relay-catalog-manifest.json');
const deck = require('../bomb-relay-deck.js');
const selector = require('../bomb-relay-selector.js');
const builder = require('../scripts/bomb-relay-build-catalog.cjs');
const original = catalog.filter(prompt => /^tb-(everyday|playful)-\d{3}$/.test(prompt.id) && Number(prompt.id.split('-').at(-1)) <= 60);
const added = catalog.filter(prompt => /^tb-(everyday|playful)-\d{3}$/.test(prompt.id) && Number(prompt.id.split('-').at(-1)) > 60 && Number(prompt.id.split('-').at(-1)) <= 360);

test('the 120 original prompts retain their exact five fields and stable IDs', () => {
  assert.equal(original.length, 120);
  const hash = crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex');
  assert.equal(hash, '99bd0adb68a017db9db47af028175a8ac69149c804711538d69b40e2adcd5bd4');
  assert.equal(manifest.originalDataSha256, hash);
});

test('all 600 supplied additions are present with continuous stable IDs and bilingual schema', () => {
  assert.equal(added.length, 600);
  for (const pack of ['everyday', 'playful']) {
    assert.deepEqual(added.filter(prompt => prompt.pack === pack).map(prompt => Number(prompt.id.split('-').at(-1))), Array.from({ length: 300 }, (_, i) => i + 61));
  }
  for (const prompt of catalog) {
    assert.deepEqual(Object.keys(prompt), ['id', 'pack', 'family', 'en', 'zhHant']);
    assert.ok(/[\u3400-\u9fff]/u.test(prompt.zhHant));
    assert.ok(!/\n|\||TODO|PLACEHOLDER/i.test(prompt.en + prompt.zhHant));
    assert.ok(prompt.en.length <= 150, prompt.id);
  }
});

test('the single JSON source and generated classic/CJS runtime are identical', () => {
  assert.deepEqual(deck.items.map(builder.canonical), catalog);
  assert.deepEqual(deck.legacyItems, legacy);
  const runtime = fs.readFileSync(path.join(root, 'bomb-relay-deck.js'), 'utf8');
  assert.equal(runtime.replace(/\r\n/g, '\n'), builder.renderDeck(catalog, legacy));
  const browser = vm.createContext({}); vm.runInContext(runtime, browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.BOMB_RELAY_DECK.items.map(builder.canonical))), catalog);
  assert.doesNotMatch(runtime, /fetch\(|XMLHttpRequest|\.mjs/);
  assert.ok(Object.isFrozen(deck.items) && Object.isFrozen(deck.legacyItems));
});

test('manifest and build check reflect the complete bank and all 34 supplied families', () => {
  assert.deepEqual(builder.build({ check: true }), manifest);
  assert.equal(manifest.total, catalog.length);
  assert.ok(manifest.total >= 720);
  assert.ok(Object.keys(manifest.families).length >= 34);
  for (const [pack, count] of Object.entries(manifest.packs)) assert.equal(catalog.filter(prompt => prompt.pack === pack).length, count);
  for (const [family, count] of Object.entries(manifest.families)) assert.equal(catalog.filter(prompt => prompt.family === family).length, count);
});

test('all 60 archived scenes remain exact lookup-only cards and never enter the live pool', () => {
  assert.equal(legacy.length, 60);
  for (const card of legacy) {
    assert.equal(deck.get(card.id).en, card.en);
    assert.equal(deck.get(card.id).zh, card.zh);
    assert.ok(!deck.pool('mixed').some(prompt => prompt.id === card.id));
    assert.ok(fs.existsSync(path.join(root, card.art.split('?')[0])), card.id);
  }
});

test('fully seen original history naturally draws the 600 new prompts without clearing history', () => {
  const history = { seenIds: original.map(prompt => prompt.id), recentIds: original.slice(-3).map(prompt => prompt.id), recentFamilies: original.slice(-3).map(prompt => prompt.family) };
  const before = JSON.stringify(history);
  const selected = selector.selectPrompt({ history, random: () => .5 });
  assert.ok(added.some(prompt => prompt.id === selected.prompt.id));
  assert.equal(selected.recycledPool, false);
  assert.equal(selected.history.seenIds.length, 121);
  for (const prompt of original) assert.ok(selected.history.seenIds.includes(prompt.id));
  assert.equal(JSON.stringify(history), before);
});

test('mode changes keep the complete catalog and the other pack seen history', () => {
  const history = { seenIds: original.map(prompt => prompt.id), recentIds: [], recentFamilies: [] };
  const everyday = selector.selectPrompt({ mode: 'everyday', history, random: () => .3 });
  const playful = selector.selectPrompt({ mode: 'playful', history: JSON.parse(JSON.stringify(everyday.history)), random: () => .7 });
  assert.equal(everyday.prompt.pack, 'everyday'); assert.equal(playful.prompt.pack, 'playful');
  assert.ok(playful.history.seenIds.includes(everyday.prompt.id));
  for (const prompt of original) assert.ok(playful.history.seenIds.includes(prompt.id));
  assert.equal(playful.history.seenIds.length, 122);
});

test('the builder accepts valid additional custom prompts and preserves their history', () => {
  const custom = { id: 'custom-retained-social', pack: 'playful', family: 'custom-social', en: 'A harmless surprise for a very patient friend.', zhHant: '給一位很有耐心的朋友的無傷大雅驚喜。' };
  const extended = [...catalog, custom];
  assert.doesNotThrow(() => builder.validateCatalog(extended, legacy));
  const context = vm.createContext({}); vm.runInContext(builder.renderDeck(extended, legacy), context);
  assert.equal(context.BOMB_RELAY_DECK.items.length, catalog.length + 1);
  assert.equal(context.BOMB_RELAY_DECK.get(custom.id).en, custom.en);
  const history = { seenIds: [custom.id], recentIds: [custom.id], recentFamilies: [custom.family] };
  const selected = selector.selectPrompt({ catalog: context.BOMB_RELAY_DECK.items, history, random: () => .4 });
  assert.ok(selected.history.seenIds.includes(custom.id));
  assert.notEqual(selected.prompt.id, custom.id);
});

test('invalid or repeated catalog entries fail the build rather than using a legacy fallback', () => {
  assert.throws(() => builder.validateCatalog([]), /non-empty/);
  assert.throws(() => builder.validateCatalog([catalog[0], catalog[0]]), /Duplicate prompt ID/);
  assert.throws(() => builder.validateCatalog([catalog[0], { ...catalog[0], id: 'different-id' }]), /Duplicate normalized English/);
  assert.throws(() => builder.validateCatalog([{ ...catalog[0], pack: 'fantasy' }]), /Invalid prompt pack/);
  assert.throws(() => builder.validateCatalog([{ ...catalog[0], family: '' }]), /Invalid prompt family/);
  assert.throws(() => builder.validateCatalog(catalog, [{ ...legacy[0], id: catalog[0].id }]), /Duplicate live\/legacy ID/);
  assert.deepEqual(deck.pool('unavailable-filter'), []);
});
