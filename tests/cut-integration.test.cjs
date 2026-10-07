'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
test('CUT is the final Hub game and original player cards have lifecycle cleanup', () => {
  const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const links = [...hub.matchAll(/<a class="game-card[^\"]*" href="([^\"]+)"/g)].map(match => match[1]);
  assert.equal(links.at(-1), 'cut.html'); assert.ok(links.indexOf('bluff-king-live-chat.html') < links.indexOf('cut.html'));
  const cards = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
  assert.match(cards, /new CUT_UI\.Card/); assert.match(cards, /cutCard\.destroy\(\)/);
  assert.match(cards, /current\.cut\?\.sessionId !== command\.sessionId/);
  assert.match(cards, /current\.cut\?\.turnId !== command\.turnId/);
  for (const match of cards.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});
test('CUT host loads independent modules in dependency order and assets exist', () => {
  const html = fs.readFileSync(path.join(root, 'cut.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(cut-[^\"]+\.js)"/g)].map(match => match[1]);
  assert.deepEqual(files, ['cut-config.js', 'cut-random.js', 'cut-topics.js', 'cut-engine.js', 'cut-ui.js', 'cut-sync.js', 'cut-host.js']);
  for (const file of files) { assert.ok(fs.existsSync(path.join(root, file))); new vm.Script(fs.readFileSync(path.join(root, file), 'utf8')); }
  assert.ok(fs.existsSync(path.join(root, 'cut.css')));
});
