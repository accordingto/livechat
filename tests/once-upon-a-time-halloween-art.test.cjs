'use strict';
// Strict real deployment-asset QA. Unlike the separate builder unit fixture,
// these tests require every final WebP, provenance file and complete manifest.
// Pixel meaning remains an explicitly recorded visual-review responsibility.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../once-upon-a-time-halloween-deck.js');
const { buildManifest } = require('../scripts/once-upon-a-time-halloween-art-manifest.cjs');
const root = path.resolve(__dirname, '..');
const assetRoot = 'assets/once-upon-a-time/halloween/';
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('complete Halloween art manifest exactly matches all 170 final main/thumbnail images and reviewed provenance', () => {
  const rebuilt = buildManifest();
  const shipped = read(assetRoot + 'art-manifest-v1.json');
  assert.deepEqual(shipped, rebuilt, 'generated inventory cannot claim stale or incomplete assets are ready');
  assert.equal(shipped.complete, true); assert.equal(shipped.uniqueIllustrationCount, 170);
  assert.equal(shipped.generatedIllustrationCount, 110); assert.equal(shipped.reusedIllustrationCount, 60);
  assert.equal(shipped.storyCardCount, 150); assert.equal(shipped.endingCardCount, 20);
  assert.ok(shipped.newlyGeneratedBytes > 0 && shipped.newlyGeneratedBytes < 50 * 1024 * 1024);
  const all = [...H.storyCards, ...H.endingCards];
  assert.deepEqual(Object.keys(shipped.cards).sort(), all.map(card => card.id).sort());
  for (const card of all) {
    const record = shipped.cards[card.id];
    assert.equal(record.artOrigin, card.artOrigin); assert.equal(record.sourceCardId, card.sourceCardId);
    assert.equal(record.artKey, card.artKey); assert.equal(record.imagePath, card.imagePath);
    assert.equal(record.thumbnailPath, card.thumbnailPath); assert.equal(record.status, 'semantic-illustration');
    assert.equal(record.semanticDescription, card.artBrief);
    assert.deepEqual([record.main.width, record.main.height], [768, 1152]);
    assert.deepEqual([record.thumbnail.width, record.thumbnail.height], [384, 576]);
  }
});

test('all 110 new Halloween pictures retain individual generation prompts, unique original paths and an actual visual review record', () => {
  const cards = [...H.storyCards, ...H.endingCards].filter(card => card.artOrigin === 'new');
  const records = ['character', 'thing', 'place', 'aspect', 'event', 'ending'].flatMap(category => {
    const document = read(assetRoot + 'art-prompts-' + category + '-v1.json');
    assert.equal(document.version, 1); assert.equal(document.world, 'halloween'); assert.equal(document.category, category);
    return (document.records || document.entries).map(record => ({ ...record, category,
      generatedPath: record.generatedPath || record.originalGeneratedFile,
      originalPath: record.originalPath || record.originalLocalFile,
      scene: record.scene || record.semanticDescription,
      semanticReview: record.semanticReview ?? record.review,
      mode: record.mode || document.mode || document.generator }));
  });
  assert.equal(records.length, 110); assert.equal(new Set(records.map(record => record.id)).size, 110);
  assert.equal(new Set(records.map(record => record.generatedPath)).size, 110, 'individual generation rather than one category image');
  assert.equal(new Set(records.map(record => record.originalPath)).size, 110, 'source originals are separately retained');
  const byId = new Map(records.map(record => [record.id, record]));
  for (const card of cards) {
    const record = byId.get(card.id); assert.ok(record, card.id);
    assert.equal(record.category, card.category || 'ending'); assert.equal(record.scene, card.artBrief);
    assert.ok(record.prompt.includes(card.artBrief), card.id + ' actual scene is in its generation prompt');
    assert.match(record.mode, /imagegen|image_gen|built.in/i); assert.match(record.generatedPath, /\.png$/i);
    assert.equal(record.originalPath.replace(/\\/g, '/'), card.imagePath.replace(/\.webp$/, '.png'));
    assert.equal(record.imagePath, card.imagePath); assert.equal(record.thumbnailPath, card.thumbnailPath);
    assert.ok(record.semanticReview === true || typeof record.semanticReview === 'string' && record.semanticReview.trim().length > 20 || record.semanticReview?.approved === true && record.semanticReview.notes?.length > 20, card.id + ' is visually reviewed, not merely encoded');
    assert.notEqual(record.reviewStatus, 'pending-visual-review', card.id);
  }
});
