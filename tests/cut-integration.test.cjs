'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
test('CUT remains before Open Mic Rescue and original player cards have lifecycle cleanup', () => {
  const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const links = [...hub.matchAll(/<a class="game-card[^\"]*" href="([^\"]+)"/g)].map(match => match[1]);
  assert.equal(links.at(-2), 'cut.html'); assert.equal(links.at(-1), 'open-mic-rescue.html'); assert.ok(links.indexOf('bluff-king-live-chat.html') < links.indexOf('cut.html'));
  const cards = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
  assert.match(cards, /new CUT_UI\.Card/); assert.match(cards, /cutCard\.destroy\(\)/);
  assert.match(cards, /current\.cut\?\.sessionId !== command\.sessionId/);
  assert.match(cards, /current\.cut\?\.turnId !== command\.turnId/);
  for (const match of cards.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});
test('CUT host loads independent modules in dependency order and assets exist', () => {
  const html = fs.readFileSync(path.join(root, 'cut.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(cut-[^\"]+\.js)(?:\?[^\"]*)?"/g)].map(match => match[1]);
  assert.deepEqual(files, ['cut-config.js', 'cut-random.js', 'cut-topics.js', 'cut-engine.js', 'cut-ui.js', 'cut-sync.js', 'cut-host.js']);
  for (const file of files) { assert.ok(fs.existsSync(path.join(root, file))); new vm.Script(fs.readFileSync(path.join(root, file), 'utf8')); }
  assert.ok(fs.existsSync(path.join(root, 'cut.css')));
});
test('cleared card data cannot resurrect a stale CUT card on page restore', () => {
  const source = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
  const live = source.match(/\.on\('value', snap => \{\s*const data = snap\.val\(\);([\s\S]*?)\n\s*\}, \(\) =>/)[1];
  const refresh = source.match(/\.once\('value'\)\.then\(snap => \{\s*const data = snap\.val\(\);([\s\S]*?)\n\s*\}\)\.catch/)[1];
  for (const body of [live, refresh]) {
    let errors = 0, renders = 0;
    const context = vm.createContext({ latestData: { game: 'cut', cut: { phase: 'speaking' } }, showError: key => { assert.equal(key, 'waitingDeal'); errors++; }, tryRenderCard: () => { renders++; } });
    vm.runInContext('(function(data){' + body + '})(null)', context);
    vm.runInContext("if (latestData?.game === 'dixit' || latestData?.game === 'cut') tryRenderCard()", context);
    assert.equal(context.latestData, null); assert.equal(errors, 1); assert.equal(renders, 0);
  }
});


test('CUT has accessible custom-time inputs and explicit topic-ending confirmation without changing approved copy', () => {
  const html = fs.readFileSync(path.join(root, 'cut.html'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'cut-ui.js'), 'utf8');
  const host = fs.readFileSync(path.join(root, 'cut-host.js'), 'utf8');
  assert.match(html, /<p class="cut-subtitle">DON’T FINISH THAT<\/p>/);
  assert.match(ui, /cutHint: \['停！話交給下一位。', 'STOP! Hand over the unfinished thought\.'\]/);
  assert.match(ui, /beginHandoff: \['開始接話', 'Start'\]/);
  assert.match(html, /<form[^>]*id="cut-setup"[^>]*novalidate/);
  assert.match(html, /<option value="custom"/);
  for (const id of ['cut-custom-min', 'cut-custom-max']) {
    const input = html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'))?.[0];
    assert.ok(input, id + ' must be a real form field');
    assert.match(input, /type="number"/); assert.match(input, /min="5"/); assert.match(input, /max="120"/); assert.match(input, /step="1"/);
    assert.match(input, /disabled/); assert.match(input, /aria-describedby="cut-custom-hint cut-custom-error"/);
  }
  for (const id of ['cut-end-topic', 'cut-end-confirm', 'cut-end-title', 'cut-end-hint', 'cut-end-cancel', 'cut-end-accept', 'cut-custom-error']) {
    assert.ok(html.includes('id="' + id + '"'), id + ' must exist for host controls');
  }
  assert.match(html, /<dialog[^>]*id="cut-end-confirm"[^>]*aria-labelledby="cut-end-title"/);
  assert.match(host, /command\('endTopic'\)/);
  assert.match(ui, /window\.confirm\(t\('endTopicQuestion'\)\)/);
  assert.match(ui, /data-cut-action/);
  assert.doesNotMatch(html, /cut-(?:vote|ballot)/);
});
