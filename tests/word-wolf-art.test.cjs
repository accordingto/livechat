'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), CONTENT = require('../word-wolf-content.js'), ART = require('../word-wolf-art.js');
const items = CONTENT.PAIRS.flatMap(pair => [pair.a, pair.b]);
function ui(language) {
  const dictionaries = {}, I18N = { lang: language, registerDict(ns, dict) { dictionaries[ns] = dict; }, t(ns, key) { return dictionaries[ns]?.[key]?.[this.lang] || key; } };
  const context = vm.createContext({ I18N });
  for (const file of ['card-table-ui.js', 'word-wolf-content.js', 'word-wolf-art.js', 'word-wolf-ui.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return vm.runInContext('WORD_WOLF_UI', context);
}
function webpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'complete WebP container');
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (chunk === 'VP8L') {
    assert.equal(bytes[20], 0x2f);
    return [1 + (bytes[21] | ((bytes[22] & 0x3f) << 8)), 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10))];
  }
  assert.equal(chunk, 'VP8 '); assert.equal(bytes.toString('hex', 23, 26), '9d012a');
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

test('the immutable art manifest derives all 160 unique ids from the original 80 pairs, with no second word authority', () => {
  assert.equal(items.length, 160); assert.equal(new Set(items.map(item => item.id)).size, 160);
  assert.deepEqual(ART.ids, items.map(item => item.id)); assert.equal(Object.keys(ART.manifest).length, 160);
  assert.ok(Object.isFrozen(ART) && Object.isFrozen(ART.ids) && Object.isFrozen(ART.manifest));
  for (const item of items) {
    const entry = ART.get(item.id); assert.ok(Object.isFrozen(entry));
    assert.deepEqual(entry, { id: item.id, src: `assets/word-wolf/cards-v1/${item.id}.webp`, width: 640, height: 640 });
    assert.ok(!('en' in entry) && !('zh' in entry), 'content alone owns the visible names');
    assert.doesNotMatch(ART.item(item.id), /<svg|<script|\bon\w+=|https?:|data:|srcset=/);
  }
  for (const id of ['__proto__', 'constructor', '../vase', 'vase.webp', '<img>', '', null]) { assert.equal(ART.get(id), null); assert.equal(ART.item(id), ''); }
});

test('every word has its own real, distinct 640-square WebP file; missing files cannot pass as an illustrated deck', () => {
  const missing = ART.ids.filter(id => !fs.existsSync(path.join(root, ART.get(id).src)));
  assert.equal(missing.length, 0, `${missing.length} missing Word Wolf images: ${missing.slice(0, 12).join(', ')}`);
  const hashes = new Set();
  for (const id of ART.ids) {
    const bytes = fs.readFileSync(path.join(root, ART.get(id).src));
    assert.ok(bytes.length > 1000, id + ': real bitmap payload'); assert.deepEqual(webpSize(bytes), [640, 640], id);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex'); assert.ok(!hashes.has(hash), id + ': no duplicate placeholder image'); hashes.add(hash);
  }
  assert.equal(hashes.size, 160);
  const disk = fs.readdirSync(path.join(root, 'assets/word-wolf/cards-v1')).filter(file => file.endsWith('.webp')).sort();
  assert.deepEqual(disk, ART.ids.map(id => id + '.webp').sort(), 'the shipped image directory matches the authoritative item ids');
});

test('each card renders only its own picture with live bilingual labels below it, including every abstract word and long name', () => {
  for (const language of ['en', 'zh']) {
    const UI = ui(language);
    for (const pair of CONTENT.PAIRS) for (const [item, other] of [[pair.a, pair.b], [pair.b, pair.a]]) {
      const html = UI.itemCard(item, 'Your secret card');
      assert.equal((html.match(/<img /g) || []).length, 1); assert.ok(html.includes(ART.get(item.id).src));
      assert.ok(!html.includes(ART.get(other.id).src)); assert.ok(!html.includes('>' + other.en + '<'));
      assert.ok(html.indexOf('<img ') < html.indexOf('<h2 ')); assert.ok(html.includes('>' + item.en + '</h2>'));
      assert.ok(html.includes('lang="zh-Hant">' + item.zh + '</p>'), 'Chinese reading aid remains visible in either control language');
      assert.match(html, /alt="" aria-hidden="true"/); assert.doesNotMatch(html, /is-type-only|<svg|data-ww-role/);
      assert.match(UI.itemCard(item, 'Your secret card', true), /ww-item-card is-compact/);
    }
  }
});
