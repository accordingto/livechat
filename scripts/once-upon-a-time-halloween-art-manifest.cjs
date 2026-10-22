'use strict';
// Mechanical public-art inventory only. This does not generate, edit, rate or
// semantically judge any image, and never connects to a room or external service.
// --write writes only the complete manifest after every required check passes.
// An incomplete build never replaces an existing manifest with a partial one.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const H = require('../once-upon-a-time-halloween-deck.js');
const D = require('../once-upon-a-time-deck.js');
const M = require('../once-upon-a-time-modern-future-deck.js');
const repository = path.resolve(__dirname, '..');
const assetRoot = 'assets/once-upon-a-time/halloween/';
const categories = ['character', 'thing', 'place', 'aspect', 'event', 'ending'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const present = value => typeof value === 'string' && value.trim().length > 0;
const problem = message => { throw new Error(message); };

function assetFile(root, relative) {
  if (!present(relative) || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').includes('..') || !relative.startsWith('assets/once-upon-a-time/')) {
    problem('Invalid scoped card asset path: ' + String(relative));
  }
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root, 'assets/once-upon-a-time') + path.sep)) problem('Asset escaped the Once art directory');
  return file;
}

function webpDimensions(bytes, name = 'image') {
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') problem('Not a WebP image: ' + name);
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (kind === 'VP8 ') {
    if (bytes.toString('hex', 23, 26) !== '9d012a') problem('Invalid WebP key-frame signature: ' + name);
    return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  }
  if (kind === 'VP8L' && bytes[20] === 0x2f) return [1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | (bytes[22] >> 6))];
  problem('Unsupported ordinary WebP format: ' + name + ' (' + kind + ')');
}

function reviewPresent(value) {
  return value === true || present(value) || (value && typeof value === 'object' && value.approved === true && present(value.notes));
}

function buildManifest({ root = repository, deck = H, sources = [...D.storyCards, ...D.endingCards, ...M.storyCards, ...M.endingCards] } = {}) {
  root = path.resolve(root);
  const all = [...deck.storyCards, ...deck.endingCards];
  if (deck.id !== 'halloween' || deck.storyCards.length !== 150 || deck.endingCards.length !== 20 || new Set(all.map(card => card.id)).size !== 170) problem('Unexpected Halloween deck inventory');
  const sourceById = new Map(sources.map(card => [card.id, card]));
  const fresh = all.filter(card => card.artOrigin === 'new');
  const reused = all.filter(card => card.artOrigin === 'reuse');
  if (fresh.length !== 110 || reused.length !== 60) problem('Expected exactly 110 new and 60 explicitly reused illustrations');
  const records = new Map();
  const provenanceFiles = [];
  for (const category of categories) {
    const relative = assetRoot + 'art-prompts-' + category + '-v1.json';
    const file = assetFile(root, relative);
    if (!fs.existsSync(file)) problem('Missing required category provenance: ' + relative);
    let document;
    try { document = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { problem('Invalid category provenance JSON: ' + relative); }
    const entries = document.records || document.entries;
    if (document.world !== 'halloween' || document.category !== category || document.version !== 1 || !Array.isArray(entries)) problem('Invalid provenance header: ' + relative);
    const expected = fresh.filter(card => (card.category || 'ending') === category);
    if (entries.length !== expected.length) problem('Incomplete ' + category + ' provenance: ' + entries.length + '/' + expected.length);
    for (const entry of entries) {
      if (!entry || records.has(entry.id)) problem('Duplicate or invalid art provenance ID: ' + entry?.id);
      const expectedCard = expected.find(card => card.id === entry.id);
      if (!expectedCard) problem('Wrong-category, reused or unknown provenance ID: ' + entry.id);
      const record = { ...entry,
        category: entry.category ?? category,
        slug: entry.slug ?? entry.id.replace('once-hw-' + category + '-', ''),
        label: entry.label ?? (expectedCard.title || expectedCard.text),
        mode: entry.mode ?? document.mode ?? document.generator,
        generatedPath: entry.generatedPath ?? entry.originalGeneratedFile,
        originalPath: entry.originalPath ?? entry.originalLocalFile,
        semanticReview: entry.semanticReview ?? entry.review
      };
      records.set(record.id, { record, file: relative });
    }
    provenanceFiles.push(relative);
  }
  if (records.size !== 110) problem('Incomplete new-art provenance inventory');

  const oldHashes = new Set();
  for (const source of sources) {
    // A unit fixture may supply only the 60 reused source paintings. Real builds
    // read every available old painting to detect accidental unlabelled reuse.
    for (const relative of [source.imagePath, source.thumbnailPath]) {
      const file = assetFile(root, relative);
      if (fs.existsSync(file)) oldHashes.add(hash(fs.readFileSync(file)));
    }
  }
  const mainHashes = new Set(), thumbnailHashes = new Set();
  const cards = {};
  let newBytes = 0, totalBytes = 0;
  for (const card of all) {
    const category = card.category || 'ending';
    const slug = card.id.replace('once-hw-' + category + '-', '');
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(slug) || card.world !== 'halloween') problem('Invalid Halloween identity: ' + card.id);
    const files = [[card.imagePath, 768, 1152, mainHashes], [card.thumbnailPath, 384, 576, thumbnailHashes]];
    const imageFacts = [];
    for (const [relative, width, height, hashes] of files) {
      const file = assetFile(root, relative);
      if (!fs.existsSync(file)) problem('Missing encoded artwork: ' + relative);
      const bytes = fs.readFileSync(file);
      if (bytes.length < 100) problem('Encoded artwork is empty or too small: ' + relative);
      const dimensions = webpDimensions(bytes, relative);
      if (dimensions[0] !== width || dimensions[1] !== height) problem('Wrong 2:3 card dimensions: ' + relative + ' (' + dimensions.join('x') + ')');
      const digest = hash(bytes);
      if (hashes.has(digest)) problem('Repeated painting within Halloween world: ' + relative);
      if (card.artOrigin === 'new' && oldHashes.has(digest)) problem('New art silently repeats an existing world painting: ' + relative);
      hashes.add(digest);
      totalBytes += bytes.length;
      if (card.artOrigin === 'new') newBytes += bytes.length;
      imageFacts.push({ sha256: digest, bytes: bytes.length, width, height });
    }
    let semanticDescription, provenanceFile, sourceCardId = null;
    if (card.artOrigin === 'new') {
      const match = records.get(card.id);
      if (!match) problem('Missing new-art provenance: ' + card.id);
      const { record } = match;
      semanticDescription = record.scene || record.semanticDescription;
      if (record.category !== category || record.slug !== slug || record.label !== (card.title || card.text) || record.imagePath !== card.imagePath || record.thumbnailPath !== card.thumbnailPath) problem('Provenance identity/path mismatch: ' + card.id);
      if (semanticDescription !== card.artBrief || !present(record.prompt) || !record.prompt.includes(card.artBrief)) problem('Provenance must retain the actual literal scene and prompt: ' + card.id);
      if (!present(record.mode) || !/imagegen|image_gen|built.in/i.test(record.mode)) problem('Missing built-in image generation mode: ' + card.id);
      if (!present(record.generatedPath) || !/\.png$/i.test(record.generatedPath) || !present(record.originalPath) || !/\.png$/i.test(record.originalPath)) problem('Missing original PNG provenance paths: ' + card.id);
      if (!reviewPresent(record.semanticReview)) problem('Missing actual human/model visual review record: ' + card.id);
      if (card.imagePath !== assetRoot + category + '/' + slug + '-v1.webp' || card.thumbnailPath !== assetRoot + category + '/' + slug + '-v1-thumb.webp') problem('Wrong new-art output location: ' + card.id);
      provenanceFile = match.file;
    } else if (card.artOrigin === 'reuse') {
      const source = sourceById.get(card.sourceCardId);
      if (!source || source.title !== card.title || source.category !== card.category || ['imagePath', 'thumbnailPath', 'artKey'].some(field => source[field] !== card[field])) problem('Reused art must exactly match the original title/category/paths: ' + card.id);
      sourceCardId = source.id;
      semanticDescription = card.artBrief;
      provenanceFile = source.id.startsWith('once-mf-') ? 'assets/once-upon-a-time/modern-future/art-manifest-v1.json' : 'assets/once-upon-a-time/art-manifest.json';
    } else problem('Unlabelled art origin: ' + card.id);
    cards[card.id] = {
      artKey: card.artKey, imagePath: card.imagePath, thumbnailPath: card.thumbnailPath,
      status: 'semantic-illustration', artOrigin: card.artOrigin, sourceCardId,
      semanticDescription, provenanceFile,
      main: imageFacts[0], thumbnail: imageFacts[1]
    };
  }
  if (newBytes > 50 * 1024 * 1024) problem('New Halloween WebPs exceed the 50 MiB asset budget');
  return {
    version: 1, world: 'halloween', complete: true,
    uniqueIllustrationCount: 170, generatedIllustrationCount: 110, reusedIllustrationCount: 60,
    storyCardCount: 150, endingCardCount: 20,
    mainWidth: 768, mainHeight: 1152, thumbnailWidth: 384, thumbnailHeight: 576,
    generator: 'built-in image_gen', totalBytes, newlyGeneratedBytes: newBytes,
    note: '110 individually generated Halloween paintings and 60 explicitly reused, same-title existing paintings. Every listed image has a checked 2:3 main and thumbnail; visual semantics are supported by the recorded review, not automatically judged by this inventory builder. Original PNG provenance is retained separately. Card words and frames remain HTML.',
    provenanceFiles, cards
  };
}

function writeManifest(options = {}) {
  const manifest = buildManifest(options);
  const root = path.resolve(options.root || repository);
  const file = assetFile(root, assetRoot + 'art-manifest-v1.json');
  // This is generated inventory, not a hand-edited source file. No writes occur
  // before the complete build succeeds; existing incomplete work stays intact.
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  return { file, manifest };
}

module.exports = { buildManifest, writeManifest, webpDimensions, assetFile };
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--write', '--check'].includes(arg))) throw new Error('Usage: node scripts/once-upon-a-time-halloween-art-manifest.cjs [--check|--write]');
    const result = args.includes('--write') ? writeManifest() : { manifest: buildManifest() };
    console.log(JSON.stringify({ complete: true, world: 'halloween', cards: Object.keys(result.manifest.cards).length,
      generated: result.manifest.generatedIllustrationCount, reused: result.manifest.reusedIllustrationCount,
      newlyGeneratedBytes: result.manifest.newlyGeneratedBytes, written: result.file || null }, null, 2));
  } catch (error) {
    console.error('Halloween artwork inventory incomplete: ' + error.message + '. Existing manifest left unchanged.');
    process.exitCode = 1;
  }
}
