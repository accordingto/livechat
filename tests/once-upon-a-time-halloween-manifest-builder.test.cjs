'use strict';
// Synthetic metadata-only fixture. These WebP-shaped headers are NOT artwork;
// they exercise inventory/error handling, never visual quality or real decoding.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const H = require('../once-upon-a-time-halloween-deck.js');
const { buildManifest, writeManifest, webpDimensions, assetFile } = require('../scripts/once-upon-a-time-halloween-art-manifest.cjs');
const gallery = require('../scripts/once-upon-a-time-halloween-gallery.cjs');
const categories = ['character', 'thing', 'place', 'aspect', 'event', 'ending'];
const all = [...H.storyCards, ...H.endingCards];
const relativeRoot = 'assets/once-upon-a-time/halloween/';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'once-halloween-manifest-unit-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('once-halloween-manifest-unit-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const file = relative => path.join(root, relative);
  function write(relative, data) { fs.mkdirSync(path.dirname(file(relative)), { recursive: true }); fs.writeFileSync(file(relative), data); }
  function fakeImage(width, height, marker) {
    const result = Buffer.alloc(160, 0);
    result.write('RIFF', 0); result.writeUInt32LE(152, 4); result.write('WEBPVP8X', 8); result.writeUInt32LE(10, 16);
    result.writeUIntLE(width - 1, 24, 3); result.writeUIntLE(height - 1, 27, 3);
    crypto.createHash('sha256').update(marker).digest().copy(result, 40);
    return result;
  }
  for (const card of all) {
    write(card.imagePath, fakeImage(768, 1152, card.id + ':main'));
    write(card.thumbnailPath, fakeImage(384, 576, card.id + ':thumbnail'));
  }
  for (const category of categories) {
    const records = all.filter(card => card.artOrigin === 'new' && (card.category || 'ending') === category).map(card => ({
      id: card.id, category, slug: card.id.replace('once-hw-' + category + '-', ''), label: card.title || card.text,
      scene: card.artBrief, prompt: 'SYNTHETIC UNIT FIXTURE ONLY. ' + card.artBrief,
      mode: 'built-in image_gen synthetic test metadata', generatedPath: '/not-real-generated-art/' + card.id + '.png',
      originalPath: relativeRoot + category + '/' + card.id + '.png', imagePath: card.imagePath,
      thumbnailPath: card.thumbnailPath, semanticReview: 'Synthetic review-field fixture; no artwork was generated or visually tested.'
    }));
    write(relativeRoot + 'art-prompts-' + category + '-v1.json', JSON.stringify({ version: 1, world: 'halloween', category, records }));
  }
  const edit = (category, fn) => {
    const relative = relativeRoot + 'art-prompts-' + category + '-v1.json';
    const doc = JSON.parse(fs.readFileSync(file(relative), 'utf8')); fn(doc); write(relative, JSON.stringify(doc));
  };
  return { root, file, write, edit, manifest: relativeRoot + 'art-manifest-v1.json' };
}

test('Halloween manifest builder inventories all 170 cards, 110 new scenes and 60 exact explicit reuses', t => {
  const f = fixture(t), result = buildManifest({ root: f.root });
  assert.equal(result.complete, true); assert.equal(result.world, 'halloween');
  assert.equal(result.uniqueIllustrationCount, 170); assert.equal(result.generatedIllustrationCount, 110);
  assert.equal(result.reusedIllustrationCount, 60); assert.equal(Object.keys(result.cards).length, 170);
  assert.equal(result.provenanceFiles.length, 6); assert.ok(result.newlyGeneratedBytes < result.totalBytes);
  assert.equal(fs.existsSync(f.file(f.manifest)), false, 'inspection never writes');
  for (const card of all) {
    const record = result.cards[card.id]; assert.equal(record.imagePath, card.imagePath);
    assert.equal(record.artOrigin, card.artOrigin); assert.equal(record.sourceCardId, card.sourceCardId);
    assert.equal(record.main.width, 768); assert.equal(record.main.height, 1152);
    assert.equal(record.thumbnail.width, 384); assert.equal(record.thumbnail.height, 576);
    assert.match(record.main.sha256, /^[a-f0-9]{64}$/);
  }
});

test('Halloween manifest builder writes a complete inventory only on explicit write request', t => {
  const f = fixture(t), result = writeManifest({ root: f.root });
  assert.equal(result.file, f.file(f.manifest));
  assert.deepEqual(JSON.parse(fs.readFileSync(result.file, 'utf8')), result.manifest);
});

test('Halloween manifest builder never replaces an existing manifest when an image or provenance is missing', t => {
  for (const missing of ['image', 'provenance']) {
    const f = fixture(t); f.write(f.manifest, 'PREVIOUS COMPLETE MANIFEST');
    const target = missing === 'image' ? H.endingCards[0].imagePath : relativeRoot + 'art-prompts-ending-v1.json';
    fs.unlinkSync(f.file(target));
    assert.throws(() => writeManifest({ root: f.root }), /Missing/);
    assert.equal(fs.readFileSync(f.file(f.manifest), 'utf8'), 'PREVIOUS COMPLETE MANIFEST');
  }
});

test('Halloween manifest builder accepts the Ending pipeline aliases without changing source records', t => {
  const f = fixture(t);
  f.edit('ending', doc => {
    doc.generator = 'built-in image_gen';
    doc.entries = doc.records.map(r => ({ id: r.id, imagePath: r.imagePath, thumbnailPath: r.thumbnailPath,
      semanticDescription: r.scene, prompt: r.prompt, originalGeneratedFile: r.generatedPath,
      originalLocalFile: r.originalPath, semanticReview: r.semanticReview }));
    delete doc.records;
  });
  const before = fs.readFileSync(f.file(relativeRoot + 'art-prompts-ending-v1.json'), 'utf8');
  assert.equal(buildManifest({ root: f.root }).generatedIllustrationCount, 110);
  assert.equal(fs.readFileSync(f.file(relativeRoot + 'art-prompts-ending-v1.json'), 'utf8'), before);
});

test('Halloween manifest builder rejects duplicate, unknown, wrong-title and unrevised review provenance', t => {
  for (const [name, mutate, message] of [
    ['duplicate', doc => { doc.records[1] = doc.records[0]; }, /Duplicate/],
    ['unknown', doc => { doc.records[0].id = 'once-hw-character-invented'; }, /unknown/],
    ['title', doc => { doc.records[0].label = 'Different Meaning'; }, /identity/],
    ['path', doc => { doc.records[0].imagePath = 'assets/once-upon-a-time/other.webp'; }, /identity/],
    ['scene', doc => { doc.records[0].scene = 'An unrelated painting.'; }, /literal scene/],
    ['prompt', doc => { doc.records[0].prompt = 'Not the actual recorded scene.'; }, /literal scene/],
    ['review', doc => { delete doc.records[0].semanticReview; }, /visual review/],
    ['mode', doc => { doc.records[0].mode = 'unknown model'; }, /generation mode/]
  ]) {
    const f = fixture(t); f.edit('character', mutate);
    assert.throws(() => buildManifest({ root: f.root }), message, name);
  }
});

test('Halloween manifest builder rejects bad aspect ratios, repeated new images and silently reused old images', t => {
  const fresh = H.storyCards.filter(card => card.artOrigin === 'new'), reuse = H.storyCards.find(card => card.artOrigin === 'reuse');
  {
    const f = fixture(t), bytes = fs.readFileSync(f.file(fresh[0].imagePath));
    bytes.writeUIntLE(999, 24, 3); f.write(fresh[0].imagePath, bytes);
    assert.throws(() => buildManifest({ root: f.root }), /Wrong 2:3/);
  }
  {
    const f = fixture(t); f.write(fresh[1].imagePath, fs.readFileSync(f.file(fresh[0].imagePath)));
    assert.throws(() => buildManifest({ root: f.root }), /Repeated painting/);
  }
  {
    const f = fixture(t); f.write(fresh[0].imagePath, fs.readFileSync(f.file(reuse.imagePath)));
    assert.throws(() => buildManifest({ root: f.root }), /silently repeats/);
  }
});

test('Halloween manifest builder limits paths to scoped Once assets and reads common WebP headers', () => {
  for (const relative of ['../secret.webp', 'C:/secret.webp', '/secret.webp', 'assets/once-upon-a-time/../outside.webp', 'assets\\once-upon-a-time\\bad.webp', 'runtime/secret.cjs']) {
    assert.throws(() => assetFile('/unit-root', relative), /Invalid scoped/);
  }
  assert.throws(() => webpDimensions(Buffer.from('not an image')), /Not a WebP/);
});

test('Halloween gallery includes all 170 public authored cards and can restrict to 110 new scenes', () => {
  assert.equal(gallery.groups().flatMap(group => group.cards).length, 170);
  assert.equal(gallery.groups({ onlyNew: true }).flatMap(group => group.cards).length, 110);
  assert.equal(gallery.groups({ category: 'ending' }).flatMap(group => group.cards).length, 20);
  const html = gallery.galleryHTML();
  assert.equal((html.match(/<article class="card">/g) || []).length, 170);
  assert.match(html, /LOCAL PUBLIC ART QA/);
  assert.doesNotMatch(html, /firebase|fetch\(|<script|localStorage|room=/i);
});
