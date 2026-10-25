'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
function modules(lang = 'en') {
  const dicts = {}, I18N = { lang, registerDict: (ns, dict) => { dicts[ns] = dict; }, t: (ns, key) => dicts[ns]?.[key]?.[I18N.lang] || key };
  const context = vm.createContext({ I18N, crypto: require('node:crypto').webcrypto, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {} });
  for (const file of ['card-table.js', 'card-table-ui.js', 'word-wolf-content.js', 'word-wolf-art.js', 'word-wolf-engine.js', 'word-wolf-ui.js']) vm.runInContext(read(file), context, { filename: file });
  return { E: vm.runInContext('WORD_WOLF_ENGINE', context), UI: vm.runInContext('WORD_WOLF_UI', context), C: vm.runInContext('CARD_TABLE_UI', context) };
}

test('the restored game has one real Hub entry and the original player links load its modules in order', () => {
  const hub = read('index.html'), page = read('word-wolf.html'), play = read('play.html');
  assert.equal([...hub.matchAll(/href="word-wolf\.html"/g)].length, 1);
  assert.match(hub, /descWordwolf/); assert.match(page, /<h1>WORD WOLF<\/h1>/);
  const files = ['content', 'art', 'engine', 'ui'].map(x => `word-wolf-${x}.js?v=ww-art-2`);
  for (const html of [page, play]) {
    let before = html.indexOf('card-table-ui.js?v=ct-2');
    assert.ok(before > 0);
    for (const file of files) { const at = html.indexOf(file); assert.ok(at > before, file + ' dependency order'); before = at; }
    assert.match(html, /href="word-wolf\.css\?v=ww-art-2"/);
  }
  assert.match(page, /word-wolf-host\.js\?v=ww-art-2/); assert.doesNotMatch(play, /word-wolf-host\.js/);
  assert.match(play, /wordwolf: \{ key: 'ww', page: 'ww-card-page', title: 'WORD WOLF', ui: \(\) => WORD_WOLF_UI \}/);
  assert.match(play, /'ct-card-page', 'wl-card-page', 'rs-card-page', 'ww-card-page'/);
  for (const id of ['room-label', 'demo-bar', 'demo-view', 'demo-link', 'status', 'setup-needed', 'switched', 'continue', 'setup', 'start', 'setup-cancel', 'count-note', 'game', 'scene', 'actions', 'controls', 'error', 'category']) assert.match(page, new RegExp(`id="ww-${id}"`));
  for (const file of ['word-wolf-content.js', 'word-wolf-art.js', 'word-wolf-engine.js', 'word-wolf-ui.js', 'word-wolf-host.js']) new vm.Script(read(file));
  assert.match(read('word-wolf-ui.js'), /extra: 'wordWolfControlToken'/);
  assert.match(read('word-wolf-ui.js'), /game: 'wordwolf', key: 'ww'/);
});

test('the shared screen never prints a private item; a player sees just their own clear object card and role stays unknown', () => {
  for (const lang of ['en', 'zh']) {
    const { E, UI } = modules(lang), s = E.create({ id: 'ww-ui', roster: [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Person ' + playerNum })), now: 1, seed: 77 });
    const host = E.view(s, 0).ww, stage = UI.stage(host), own = E.view(s, 1), card = UI.Card.prototype.main.call({ pending: null }, own);
    assert.match(card, /ww-object-art/); assert.ok(card.includes(own.ww.me.item.en));
    const names = new Set(s.round.seats.map(n => E.view(s, n).ww.me.item.en));
    for (const secret of names) assert.ok(!stage.includes(secret), secret);
    const other = [...names].find(name => name !== own.ww.me.item.en);
    assert.ok(!card.includes(other)); assert.ok(!card.includes('data-ww-role'));
    assert.ok(!stage.includes('ww-object-art'));
    assert.equal(E.TIMED.length, 0, 'untimed game also works with the shared demo controller');
  }
});

test('all own copy is bilingual and the compact card escapes names while retaining private voting controls', () => {
  const { E, UI } = modules('zh');
  for (const [key, pair] of Object.entries(UI.dict)) assert.ok(pair.length === 2 && pair[0] && pair[1], key);
  const state = E.create({ id: 'ww-escaping', roster: [1, 2, 3].map(playerNum => ({ playerNum, name: playerNum === 2 ? 'X <img onerror=x>' : 'P' + playerNum })), now: 1, seed: 2 });
  const next = E.apply(state, { id: 'vote-ui-1', type: 'vote', actor: 1, sessionId: state.sessionId, stage: state.stage, now: 2 });
  const data = E.view(next, 1), html = UI.Card.prototype.main.call({ pending: null }, data);
  assert.match(html, /data-ct-action="ballot"/); assert.ok(!html.includes('data-ct-arg-target="1"'));
  assert.doesNotMatch(html, /<img[^>]*\bonerror\s*=/); assert.match(html, /X img onerror=x/);
  assert.ok(UI.settingsForm({ category: 'objects' }).includes('data-ct-set="category"'));
});
