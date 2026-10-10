'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const DECK = require('../bomb-relay-deck.js');
const E = require('../bomb-relay-engine.js');

test('every scene card has a unique id, simple text and a 4:3 picture on disk', () => {
  assert.equal(DECK.items.length, 60);
  assert.equal(new Set(DECK.items.map(card => card.id)).size, 60);
  assert.equal(new Set(DECK.items.map(card => card.en)).size, 60);
  for (const card of DECK.items) {
    assert.ok(DECK.categories.includes(card.category) && card.category !== 'mixed', card.id);
    assert.ok(card.en && card.zh && card.emoji, card.id);
    assert.ok(card.en.split(' ').length <= 5, `${card.id} title stays short`);
    assert.ok(!/[<>]/.test(card.en + card.zh), card.id);
    const file = card.art.split('?')[0];
    assert.equal(file, `assets/bomb-relay/${card.id}.svg`);
    const svg = read(file);
    assert.match(svg, /viewBox="0 0 400 300"/, card.id);
    assert.ok(!/<script|on\w+=|href=/i.test(svg), `${card.id} picture is inert`);
  }
  for (const category of DECK.categories.slice(1)) assert.ok(DECK.pool(category).length >= E.CONFIG.cardOptions[0], category);
});

test('the host page loads its modules in dependency order and every file parses', () => {
  const html = read('bomb-relay.html');
  const files = [...html.matchAll(/<script src="(bomb-relay-[^"]+\.js)(?:\?[^"]*)?"/g)].map(match => match[1]);
  assert.deepEqual(files, ['bomb-relay-deck.js', 'bomb-relay-engine.js', 'bomb-relay-sync.js', 'bomb-relay-ui.js', 'bomb-relay-host.js']);
  for (const file of files) new vm.Script(read(file));
  assert.match(html, /<h1>💣 Bomb Relay<\/h1>/);
  assert.match(html, /href="bomb-relay\.css\?v=br-1"/);
});

test('original player links render the Bomb Relay card and fence actions to the shown turn', () => {
  const play = read('play.html');
  assert.match(play, /bomb-relay-deck\.js\?v=br-1/); assert.match(play, /bomb-relay-ui\.js\?v=br-1/); assert.match(play, /bomb-relay\.css\?v=br-1/);
  assert.match(play, /new BOMB_RELAY_UI\.Card/); assert.match(play, /bombCard\.destroy\(\)/);
  assert.match(play, /current\.bomb\?\.sessionId !== command\.sessionId \|\| current\.bomb\?\.turnId !== command\.turnId/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const hub = read('index.html');
  const links = [...hub.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(links.filter(link => link === 'bomb-relay.html').length, 1);
  assert.match(hub, /descBombRelay/);
});

function ui() {
  const context = vm.createContext({ BOMB_RELAY_DECK: DECK, setInterval: () => 0, clearInterval: () => {}, crypto: require('node:crypto').webcrypto });
  vm.runInContext(read('bomb-relay-ui.js') + ';this.BOMB_RELAY_UI = BOMB_RELAY_UI;', context);
  return context.BOMB_RELAY_UI;
}
function playing() {
  let state = E.create({ id: 'ui', roster: ['Amy', 'Kevin', 'Jason'].map((name, i) => ({ playerNum: i + 1, name })), now: 1, seed: 3 });
  state.holder = 1; state.starter = 1;
  const act = (actor, type) => { state = E.apply(state, { id: 'c' + Math.random(), type, actor, sessionId: state.sessionId, turnId: state.turnId, now: state.lastChangeAt + 5, seed: 1 }); };
  return { get state() { return state; }, act };
}

test('the shared stage names the holder and never prints the fuse', () => {
  const UI = ui(), g = playing();
  assert.match(UI.stage(E.view(g.state, 0).bomb), /Amy/);
  g.act(1, 'light'); g.act(1, 'pass');
  const html = UI.stage(E.view(g.state, 0).bomb);
  assert.match(html, /br-phase-ticking/); assert.match(html, /Kevin/); assert.match(html, /Next: Jason/);
  assert.ok(!html.includes(String(g.state.explodeAt)));
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
  assert.match(html(2), /data-br-action="pass"/); assert.match(html(2), /PASS to Jason/);
  assert.doesNotMatch(html(1), /data-br-action="pass"/);
  assert.doesNotMatch(html(1), /data-br-action="bounce"/, 'the challenged player cannot challenge');
  assert.match(html(3), /data-br-action="bounce"/); assert.match(html(3), /back to Amy/);
  assert.match(html(3), /You’re next/);
});
