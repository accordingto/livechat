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
const migration = require('../scripts/bomb-relay-apply-editorial-patch.cjs');
const patch = require('../content/bomb-relay-editorial-v3-patch.json');
const byChange = new Map(patch.changes.map(change => [change.id, change]));
const sourceRecord = prompt => Object.fromEntries(Object.entries(prompt).filter(([field]) => !['category', 'zh', 'emoji'].includes(field)));
const baseline = catalog.map(prompt => builder.canonical(byChange.get(prompt.id)?.before ?? prompt));
const original = catalog.filter(prompt => /^tb-(everyday|playful)-\d{3}$/.test(prompt.id) && Number(prompt.id.split('-').at(-1)) <= 60);
const added = catalog.filter(prompt => /^tb-(everyday|playful)-\d{3}$/.test(prompt.id) && Number(prompt.id.split('-').at(-1)) > 60 && Number(prompt.id.split('-').at(-1)) <= 360);

test('all 120 original IDs remain, with only the explicitly approved editorial changes', () => {
  assert.equal(original.length, 120);
  const prior = baseline.filter(prompt => Number(prompt.id.split('-').at(-1)) <= 60);
  const hash = crypto.createHash('sha256').update(JSON.stringify(prior)).digest('hex');
  assert.equal(hash, '99bd0adb68a017db9db47af028175a8ac69149c804711538d69b40e2adcd5bd4');
  assert.equal(manifest.originalDataSha256, crypto.createHash('sha256').update(JSON.stringify(original.map(builder.canonical))).digest('hex'));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(baseline)).digest('hex'), '56b20be9e0fcc8b064acd6d70d67fd2459b98f966d2a31a557183d7e71072955');
});

test('all 600 supplied additions are present with continuous stable IDs and bilingual schema', () => {
  assert.equal(added.length, 600);
  for (const pack of ['everyday', 'playful']) {
    assert.deepEqual(added.filter(prompt => prompt.pack === pack).map(prompt => Number(prompt.id.split('-').at(-1))), Array.from({ length: 300 }, (_, i) => i + 61));
  }
  for (const prompt of catalog) {
    assert.ok(['id', 'pack', 'family', 'en', 'zhHant'].every(field => typeof prompt[field] === 'string'));
    assert.ok(/[\u3400-\u9fff]/u.test(prompt.zhHant));
    assert.ok(!/\n|\||TODO|PLACEHOLDER/i.test(prompt.en + prompt.zhHant));
    assert.ok(prompt.en.length <= 150, prompt.id);
  }
});

test('the single JSON source and generated classic/CJS runtime are identical', () => {
  assert.deepEqual(deck.items.map(sourceRecord), catalog);
  assert.deepEqual(deck.legacyItems, legacy);
  const runtime = fs.readFileSync(path.join(root, 'bomb-relay-deck.js'), 'utf8');
  assert.equal(runtime.replace(/\r\n/g, '\n'), builder.renderDeck(catalog, legacy));
  const browser = vm.createContext({}); vm.runInContext(runtime, browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.BOMB_RELAY_DECK.items.map(sourceRecord))), catalog);
  assert.doesNotMatch(runtime, /fetch\(|XMLHttpRequest|\.mjs/);
  assert.ok(Object.isFrozen(deck.items) && Object.isFrozen(deck.legacyItems));
});

test('manifest and build check reflect the complete bank and all 34 supplied families', () => {
  assert.deepEqual(builder.build({ check: true }), manifest);
  assert.equal(manifest.total, catalog.length);
  assert.ok(manifest.total >= 720);
  assert.equal(manifest.activeTotal, 700);
  assert.equal(manifest.disabledTotal, 20);
  assert.deepEqual(manifest.activePacks, { everyday: 351, playful: 349 });
  assert.equal(manifest.previousWordingCount, 166);
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

test('the ID/before/after migration applies exactly 166 rewrites and 20 reversible deferrals', () => {
  const result = migration.applyPromptPatch(baseline, patch);
  assert.equal(result.applied.length, 186);
  assert.equal(result.conflicts.length, 0); assert.equal(result.missing.length, 0);
  assert.equal(result.disabledIds.length, 20);
  assert.equal(result.catalog.filter(deck.isEligible).length, 700);
  assert.deepEqual(result.catalog, catalog);
  assert.equal(patch.changes.filter(change => change.action === 'rewrite').length, 166);
  assert.equal(patch.changes.filter(change => change.action === 'defer').length, 20);
  for (const change of patch.changes) {
    const current = catalog.find(prompt => prompt.id === change.id);
    assert.deepEqual(builder.canonical(current), change.action === 'rewrite' ? change.after : change.before);
    if (change.action === 'defer') assert.equal(current.disabled, true);
  }
  const again = migration.applyPromptPatch(result.catalog, patch);
  assert.equal(again.applied.length, 0); assert.equal(again.alreadyApplied.length, 186);
  assert.deepEqual(again.catalog, result.catalog);
  assert.doesNotThrow(() => migration.migrate({ check: true }));
});

test('patch conflicts preserve local English/Chinese edits, metadata, custom prompts and prior disabled choices', () => {
  const rewrite = patch.changes.find(change => change.action === 'rewrite');
  const defer = patch.changes.find(change => change.action === 'defer');
  const editedRewrite = { ...rewrite.before, en: 'A local author changed this prompt.', customMetadata: { approvedBy: 'host' } };
  const editedDefer = { ...defer.before, zhHant: '主持人已經修改的本地題目。', notes: ['keep'] };
  const custom = { id: 'custom-owned', pack: 'playful', family: 'local', en: 'A custom prompt for our group.', zhHant: '我們這一組的自訂題目。', enabled: false, author: 'host', labels: ['local'] };
  const priorDisabled = { ...baseline.find(prompt => !byChange.has(prompt.id)), disabled: true, why: 'host preference' };
  const local = [...baseline.filter(prompt => ![rewrite.id, defer.id, priorDisabled.id].includes(prompt.id)), editedRewrite, editedDefer, priorDisabled, custom];
  const before = JSON.stringify(local), result = migration.applyPromptPatch(local, patch);
  assert.deepEqual(result.conflicts.map(conflict => conflict.id), [rewrite.id, defer.id]);
  for (const prompt of [editedRewrite, editedDefer, priorDisabled, custom]) assert.deepEqual(result.catalog.find(current => current.id === prompt.id), prompt);
  assert.ok(!result.disabledIds.includes(defer.id));
  assert.ok(result.disabledIds.includes(priorDisabled.id) && result.disabledIds.includes(custom.id));
  assert.equal(JSON.stringify(local), before);
  const withMetadata = { ...rewrite.before, author: 'host', privateNotes: { example: 'keep' }, disabled: true, [migration.MARKER]: { custom: 'keep existing metadata' } };
  const merged = migration.applyPromptPatch([withMetadata], { ...patch, changes: [rewrite] });
  assert.deepEqual(merged.catalog[0], { ...withMetadata, ...rewrite.after });
});

test('unknown or malformed patch IDs never silently insert or overwrite prompts', () => {
  const change = patch.changes[0];
  const absent = migration.applyPromptPatch([], { ...patch, changes: [change] });
  assert.deepEqual(absent.missing, [change.id]); assert.deepEqual(absent.catalog, []);
  assert.throws(() => migration.applyPromptPatch([baseline[0], baseline[0]], patch), /Duplicate/);
  assert.throws(() => migration.applyPromptPatch(baseline, { ...patch, changes: [change, change] }), /duplicate/);
  assert.throws(() => migration.applyPromptPatch(baseline, { ...patch, changes: [{ ...change, before: { ...change.before, id: 'wrong-id' } }] }), /Mismatched/);
});

test('disabled prompts never enter any formal pool, but old IDs and original wording remain readable', () => {
  for (const change of patch.changes.filter(change => change.action === 'defer')) {
    const current = deck.get(change.id);
    assert.deepEqual(builder.canonical(current), change.before);
    assert.equal(current.disabled, true);
    assert.equal(deck.getPrevious(change.id), current);
    for (const mode of ['mixed', 'everyday', 'playful']) assert.ok(!deck.pool(mode).some(prompt => prompt.id === change.id));
  }
  assert.equal(deck.pool('mixed').length, 700);
  for (const change of patch.changes.filter(change => change.action === 'rewrite')) {
    assert.deepEqual(builder.canonical(deck.get(change.id)), change.after);
    assert.deepEqual(builder.canonical(deck.getPrevious(change.id)), change.before);
  }
  for (const card of legacy) assert.equal(deck.getPrevious(card.id), deck.get(card.id));
});

test('previous-wording migration never masks subsequent local edits or unrelated custom wording', () => {
  const change = patch.changes.find(change => change.action === 'rewrite');
  const local = catalog.map(prompt => prompt.id === change.id ? { ...prompt, en: 'Our improved local text.' } : prompt);
  const browser = vm.createContext({}); vm.runInContext(builder.renderDeck(local, legacy), browser);
  assert.equal(browser.BOMB_RELAY_DECK.getPrevious(change.id).en, 'Our improved local text.');
  const withoutMarker = catalog.map(prompt => { const copy = { ...prompt }; delete copy[migration.MARKER]; return copy; });
  vm.runInContext(builder.renderDeck(withoutMarker, legacy), browser);
  assert.equal(browser.BOMB_RELAY_DECK.getPrevious(change.id).en, change.after.en);
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
