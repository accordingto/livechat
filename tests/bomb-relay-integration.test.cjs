'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const DECK = require('../bomb-relay-deck.js');
const E = require('../bomb-relay-engine.js');

test('the live packs contain 120 bilingual prompts and legacy scenes remain lookup-only', () => {
  assert.deepEqual(DECK.categories, ['mixed', 'everyday', 'playful']);
  assert.equal(DECK.items.length, 120);
  assert.equal(new Set(DECK.items.map(card => card.id)).size, 120);
  assert.equal(DECK.pool('mixed').length, 120);
  assert.equal(DECK.pool('everyday').length, 60);
  assert.equal(DECK.pool('playful').length, 60);
  for (const card of DECK.items) {
    assert.ok(['everyday', 'playful'].includes(card.pack), card.id);
    assert.equal(card.category, card.pack);
    assert.ok(card.en && card.zhHant && card.family, card.id);
    assert.equal(card.zh, card.zhHant);
    assert.ok(!/[<>]/.test(card.en + card.zhHant), card.id);
    assert.equal(DECK.get(card.id), card);
    assert.ok(!card.art, 'live prompts require no scene illustration');
  }
  assert.equal(DECK.legacyItems.length, 60);
  for (const card of DECK.legacyItems) {
    assert.equal(DECK.get(card.id), card);
    assert.ok(!DECK.pool('mixed').some(prompt => prompt.id === card.id));
    assert.ok(fs.existsSync(path.join(root, card.art.split('?')[0])), card.id);
  }
});

test('the host page loads its modules in dependency order and every file parses', () => {
  const html = read('bomb-relay.html');
  const files = [...html.matchAll(/<script src="(bomb-relay-[^"]+\.js)(?:\?[^"]*)?"/g)].map(match => match[1]);
  assert.deepEqual(files, ['bomb-relay-deck.js', 'bomb-relay-selector.js', 'bomb-relay-engine.js', 'bomb-relay-sync.js', 'bomb-relay-audio.js', 'bomb-relay-ui.js', 'bomb-relay-host.js']);
  for (const file of files) new vm.Script(read(file));
  assert.match(html, /<h1>Bomb Relay<\/h1>/);
  assert.match(html, /href="bomb-relay\.css\?v=br-sound-4"/);
  assert.doesNotMatch(html, /assets\/bomb-relay\//);
  assert.match(html, /id="br-reroll" hidden/);
  const host = read('bomb-relay-host.js');
  assert.match(host, /byId\('reroll'\)\.hidden = !hostView \|\| bomb\.phase !== 'ready'/);
  assert.match(host, /byId\('reroll'\)\.addEventListener\('click', \(\) => command\('reroll', \{ turnId: turn\(\) \}\)\)/);
  assert.match(host, /promptHistory: state\?\.promptHistory/);
});

test('original player links render the Bomb Relay card and fence actions to the shown turn', () => {
  const play = read('play.html');
  assert.match(play, /bomb-relay-deck\.js\?v=br-studio-3/); assert.match(play, /bomb-relay-ui\.js\?v=br-sound-4/); assert.match(play, /bomb-relay\.css\?v=br-sound-4/);
  assert.ok(play.indexOf('bomb-relay-audio.js?v=br-sound-4') < play.indexOf('bomb-relay-ui.js?v=br-sound-4'));
  assert.match(play, /new BOMB_RELAY_UI\.Card/); assert.match(play, /bombCard\.destroy\(\)/);
  assert.match(play, /current\.bomb\?\.sessionId !== command\.sessionId \|\| current\.bomb\?\.turnId !== command\.turnId/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const hub = read('index.html');
  const links = [...hub.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(links.filter(link => link === 'bomb-relay.html').length, 1);
  assert.match(hub, /descBombRelay/);
});

function ui(language = 'en') {
  const dictionaries = {}, intervals = new Set();
  let nextTimer = 0;
  const i18n = { lang: language, registerDict: (namespace, dictionary) => { dictionaries[namespace] = dictionary; }, t: (namespace, key) => dictionaries[namespace]?.[key]?.[i18n.lang] || key };
  const context = vm.createContext({ I18N: i18n, BOMB_RELAY_DECK: DECK, BOMB_RELAY_AUDIO: require('../bomb-relay-audio.js'), crypto: require('node:crypto').webcrypto, window: { innerHeight: 568 },
    setInterval: () => { const id = ++nextTimer; intervals.add(id); return id; }, clearInterval: id => intervals.delete(id) });
  vm.runInContext(read('bomb-relay-ui.js') + ';this.BOMB_RELAY_UI = BOMB_RELAY_UI;', context);
  const result = context.BOMB_RELAY_UI;
  result.i18n = i18n; result.intervals = intervals;
  return result;
}
function playing() {
  let state = E.create({ id: 'ui', roster: ['Amy', 'Kevin', 'Jason'].map((name, i) => ({ playerNum: i + 1, name })), now: 1, seed: 3 });
  state.holder = 1; state.starter = 1;
  const act = (actor, type) => { state = E.apply(state, { id: 'c' + Math.random(), type, actor, sessionId: state.sessionId, turnId: state.turnId, now: state.lastChangeAt + 5, seed: 1 }); };
  return { get state() { return state; }, act };
}

test('the shared stage names the holder and never prints the fuse', () => {
  const UI = ui(), g = playing();
  const prompt = DECK.get(E.view(g.state, 0).bomb.cardId);
  assert.match(UI.stage(E.view(g.state, 0).bomb), /Amy/);
  assert.ok(UI.stage(E.view(g.state, 0).bomb).includes(UI.esc(prompt.en)));
  g.act(1, 'light'); const deadline = g.state.explodeAt; g.act(1, 'pass');
  const html = UI.stage(E.view(g.state, 0).bomb);
  assert.match(html, /br-phase-ticking/); assert.match(html, /Kevin/); assert.match(html, /Next: Jason/);
  assert.ok(!html.includes(String(g.state.explodeAt)));
  assert.equal(E.view(g.state, 0).bomb.cardId, prompt.id);
  assert.equal(g.state.explodeAt, deadline);
  assert.doesNotMatch(html, /<img|<input|<textarea|<progress/);
  g.state.explodeAt = g.state.lastChangeAt; g.act(0, 'tick');
  assert.match(UI.stage(E.view(g.state, 0).bomb), /br-burst/);
});

test('each card shows only the buttons that player may use', () => {
  const UI = ui(), g = playing();
  const element = { addEventListener() {}, removeEventListener() {}, querySelector: () => null, innerHTML: '' };
  const html = (n) => new UI.Card(element).html(E.view(g.state, n));
  assert.match(html(1), /data-br-action="light"/);
  assert.doesNotMatch(html(2), /data-br-action=/);
  g.act(1, 'light'); g.act(1, 'pass');
  assert.match(html(2), /data-br-action="pass"/); assert.match(html(2), /Pass to Jason/);
  assert.ok(html(2).indexOf('data-br-prompt-id=') < html(2).indexOf('data-br-action="pass"'));
  assert.doesNotMatch(html(1), /data-br-action="pass"/);
  assert.doesNotMatch(html(1), /data-br-action="bounce"/, 'the challenged player cannot challenge');
  assert.match(html(3), /data-br-action="bounce"/); assert.match(html(3), /back to Amy/);
  assert.match(html(3), /You’re next/);
});

test('every player sees one English prompt with a static Chinese helper in zh', () => {
  const UI = ui(), g = playing();
  const element = { addEventListener() {}, removeEventListener() {}, querySelector: () => null, innerHTML: '' };
  const card = new UI.Card(element);
  const verify = () => {
    const promptId = E.view(g.state, 0).bomb.cardId, prompt = DECK.get(promptId);
    for (const number of [1, 2, 3]) {
      const html = card.html(E.view(g.state, number));
      assert.ok(html.includes(`data-br-prompt-id="${promptId}"`));
      assert.ok(html.includes(`<h2 lang="en">${UI.esc(prompt.en)}</h2>`));
      assert.doesNotMatch(html, /<img|data-br-action="reroll"|data-br-action="skip"/);
      if (UI.i18n.lang === 'zh') assert.ok(html.includes(UI.esc(prompt.zhHant)));
      else assert.doesNotMatch(html, /lang="zh-Hant"/);
    }
  };
  verify();
  g.act(1, 'light'); g.act(1, 'pass');
  const beforeLanguageChange = JSON.stringify(g.state);
  UI.i18n.lang = 'zh'; verify();
  assert.equal(JSON.stringify(g.state), beforeLanguageChange);
  g.act(0, 'pause'); verify();
  card.destroy();
  assert.doesNotMatch(read('bomb-relay-ui.js'), /selectPrompt\(|createHistory\(/);
});

test('host reroll requires a fresh ready turn, keeps its chosen holder and invalidates old Light', () => {
  const g = playing();
  const old = E.view(g.state, 0).bomb;
  assert.equal(old.canReroll, true);
  assert.equal(E.view(g.state, 1).bomb.canReroll, false);
  g.act(1, 'reroll');
  assert.equal(E.view(g.state, 0).bomb.cardId, old.cardId);
  g.act(0, 'reroll');
  const next = E.view(g.state, 0).bomb;
  assert.notEqual(next.cardId, old.cardId);
  assert.equal(next.holder, old.holder);
  assert.equal(next.phase, 'ready');
  assert.equal(g.state.explodeAt, null);
  const stale = E.apply(g.state, { id: 'old-light', type: 'light', actor: 1, sessionId: old.sessionId, turnId: old.turnId, now: g.state.lastChangeAt + 1, seed: 2 });
  assert.equal(stale.phase, 'ready');
  g.act(1, 'light');
  assert.equal(E.view(g.state, 0).bomb.canReroll, false);
  const deadline = g.state.explodeAt;
  g.act(0, 'reroll');
  assert.equal(E.view(g.state, 0).bomb.cardId, next.cardId);
  assert.equal(g.state.explodeAt, deadline);
});

test('an arriving bomb scrolls the prompt into view together with the nearby PASS action', () => {
  const UI = ui(), g = playing(), scrolled = [];
  const prompt = { scrollIntoView: options => scrolled.push({ target: 'prompt', ...options }) };
  const button = { getBoundingClientRect: () => ({ top: 580, bottom: 640 }), scrollIntoView: options => scrolled.push({ target: 'pass', ...options }) };
  const element = { addEventListener() {}, removeEventListener() {}, innerHTML: '', querySelector: selector => selector === '.br-card-scene' ? prompt : selector === '[data-br-action="pass"]' ? button : null };
  const card = new UI.Card(element);
  g.act(1, 'light');
  card.update(E.view(g.state, 1));
  assert.deepEqual(scrolled, [{ target: 'prompt', block: 'start', behavior: 'instant' }]);
  card.update(E.view(g.state, 1));
  assert.equal(scrolled.length, 1, 'unchanged projections do not scroll again');
  card.destroy();
});

test('the library shows all three live packs with no artwork and missing prompts report a reload', () => {
  const UI = ui();
  for (const [pack, count] of [['mixed', 120], ['everyday', 60], ['playful', 60]]) {
    const html = UI.libraryHTML(pack);
    assert.equal((html.match(/data-br-prompt-id=/g) || []).length, count);
    assert.doesNotMatch(html, /<img|undefined/);
    for (const prompt of DECK.pool(pack)) assert.ok(html.includes(UI.esc(prompt.en)));
  }
  UI.i18n.lang = 'zh';
  const chinese = UI.libraryHTML();
  for (const prompt of DECK.items) assert.ok(chinese.includes(UI.esc(prompt.zhHant)));
  assert.match(UI.sceneTitle('missing-prompt'), /題目無法載入/);
});

test('ordinary short answers need no typed input or approval to pass and score', () => {
  const UI = ui(), g = playing();
  const prompt = E.view(g.state, 1).bomb.cardId;
  g.act(1, 'light'); g.act(1, 'pass');
  assert.equal(g.state.holder, 2);
  assert.equal(g.state.passes, 1);
  g.state.explodeAt = g.state.lastChangeAt; g.act(0, 'tick');
  const bomb = E.view(g.state, 0).bomb;
  assert.equal(bomb.boom.loser, 2);
  assert.equal(bomb.boom.cardId, prompt);
  assert.equal(bomb.standings.find(row => row.playerNum === 2).count, 1);
  assert.doesNotMatch(UI.stage(bomb), /<img|<input|<textarea|<audio|speech|recording/);
  assert.match(UI.t('noPressure'), /One word is enough\. Funny is optional/);
  assert.match(UI.t('rule2'), /simple English description/);
  assert.match(UI.t('bounceHint'), /specific elaboration can still count/);
});

test('sound retains a steady tick loop, immediate passes and one cue per explosion', () => {
  const UI = ui(), g = playing(), sound = new UI.Sound(), heard = [];
  for (const cue of ['tick', 'pass', 'bounce', 'boom']) sound[cue] = () => heard.push(cue);
  sound.follow(E.view(g.state, 0).bomb);
  g.act(1, 'light'); sound.follow(E.view(g.state, 0).bomb);
  assert.equal(UI.intervals.size, 1);
  sound.follow(E.view(g.state, 0).bomb);
  assert.equal(UI.intervals.size, 1);
  g.act(1, 'pass'); sound.follow(E.view(g.state, 0).bomb);
  sound.follow(E.view(g.state, 0).bomb);
  assert.deepEqual(heard, ['pass']);
  g.act(3, 'bounce'); sound.follow(E.view(g.state, 0).bomb);
  assert.deepEqual(heard, ['pass', 'bounce']);
  g.state.explodeAt = g.state.lastChangeAt; g.act(0, 'tick');
  sound.follow(E.view(g.state, 0).bomb); sound.follow(E.view(g.state, 0).bomb);
  assert.deepEqual(heard, ['pass', 'bounce', 'boom']);
  assert.equal(UI.intervals.size, 0);
  sound.close();
});
