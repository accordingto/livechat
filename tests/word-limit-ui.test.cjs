'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const E = require('../word-limit-engine.js');
const root = path.resolve(__dirname, '..');
function ui(language) {
  const dictionaries = {};
  const i18n = { lang: language, registerDict: (name, dictionary) => { dictionaries[name] = dictionary; },
    t: (name, key) => dictionaries[name]?.[key]?.[language] || key };
  const context = vm.createContext({ I18N: i18n, WORD_LIMIT_ENGINE: E });
  vm.runInContext(fs.readFileSync(path.join(root, 'card-table-ui.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'word-limit-ui.js'), 'utf8'), context);
  return context.WORD_LIMIT_UI;
}
function game() {
  let state = E.create({ id: 'ui-turns', roster: [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Actor ' + playerNum })), now: 1000, seed: 264 });
  state = E.apply(state, { id: 'begin', type: 'close', actor: 1, sessionId: state.sessionId, stage: state.stage, now: 1100, seed: 1 });
  return state;
}
function renderer(UI) {
  const card = Object.create(UI.Card.prototype);
  card.pending = null; card.secondaryOpen = false; card.nameBanner = data => `<span>${data.name}</span>`;
  card.scoreline = () => '<div data-test-total>Totals</div>';
  return card;
}

test('the actor card puts the theme above the floor and limit, with roles folded as optional inspiration', () => {
  const state = game();
  for (const language of ['en', 'zh']) {
    const UI = ui(language), card = renderer(UI), view = E.view(state, state.round.speaker), html = card.main(view);
    assert.ok(html.indexOf('class="wl-scene-brief') < html.indexOf('data-wl-speaker'));
    assert.ok(html.indexOf('data-wl-speaker') < html.indexOf('class="wl-board'));
    assert.ok(html.indexOf('class="wl-board') < html.indexOf('data-ct-action="line"'));
    assert.ok(html.indexOf('data-ct-action="line"') < html.indexOf('data-wl-inspiration'));
    assert.ok(html.indexOf('data-ct-action="line"') < html.indexOf('data-wl-more'));
    assert.match(html, new RegExp(`data-ct-arg-speaking-turn="${state.round.speakingTurn}"`));
    assert.equal((html.match(/data-ct-action="line"/g) || []).length, 1);
    assert.match(html, /<details class="wl-more" data-wl-more>/, 'secondary information starts folded');
    assert.match(html, /<details class="wl-inspiration" data-wl-inspiration>/, 'role inspiration starts folded');
    assert.ok(html.includes(UI.t('roleInspirationHint')));
    assert.doesNotMatch(html, /class="wl-board-role"/);
    assert.ok(html.includes(UI.t('yourTurn')));
    assert.doesNotMatch(html, /undefined|NaN|Infinity/);
    assert.equal((html.match(/data-ct-deadline/g) || []).length >= 1, true, 'the scene clock is still visible');
  }
});

test('waiting actors keep their own role and limit but receive no other actor’s scoring button', () => {
  const state = game(), actor = state.round.players.find(n => n !== state.round.speaker);
  for (const language of ['en', 'zh']) {
    const UI = ui(language), card = renderer(UI), view = E.view(state, actor), html = card.main(view);
    assert.doesNotMatch(html, /data-ct-action="line"/);
    assert.ok(html.includes('Actor ' + state.round.speaker));
    assert.ok(html.includes(String(state.round.limits[actor])));
    assert.ok(html.includes(view.wl.me.role[language]));
    assert.ok(html.includes(UI.t('waitingTurn', { name: 'Actor ' + state.round.speaker })));
    card.secondaryOpen = true;
    assert.match(card.main(view), /data-wl-more open>/, 'a reader’s open details survive the next render');
  }
});

test('listener cards show the current speaker’s limit next to their name; the speaker’s own card does not repeat it', () => {
  const state = game(), speaker = state.round.speaker, listener = state.round.players.find(n => n !== speaker);
  for (const language of ['en', 'zh']) {
    const UI = ui(language), card = renderer(UI);
    let html = card.main(E.view(state, listener));
    const floor = html.slice(html.indexOf('data-wl-speaker='), html.indexOf('class="wl-board'));
    assert.ok(floor.indexOf('Actor ' + speaker) < floor.indexOf('data-wl-speaker-limit'), 'name first, then their limit');
    assert.match(floor, new RegExp(`data-wl-speaker-limit="${state.round.limits[speaker]}"`));
    assert.match(floor, new RegExp(`<b class="wl-floor-tile">${state.round.limits[speaker]}</b>`));
    assert.doesNotMatch(card.main(E.view(state, speaker)), /data-wl-speaker-limit/, 'the speaker already sees their own big board');
    const swapped = JSON.parse(JSON.stringify(state)); swapped.round.limits[speaker] = state.round.limits[speaker] === 6 ? 1 : 6;
    html = card.main(E.view(swapped, listener));
    assert.match(html, new RegExp(`data-wl-speaker-limit="${swapped.round.limits[speaker]}"`), 'a limit swap shows the new limit');
    assert.match(UI.stage(E.view(state, 0).wl), new RegExp(`data-wl-speaker-limit="${state.round.limits[speaker]}"`), 'the shared screen shows it too');
  }
});

test('the shared screen shows the current floor without a host scoring action, and player names remain escaped', () => {
  const state = game();
  state.roster.find(row => row.playerNum === state.round.speaker).name = '<img src=x onerror=x>';
  for (const language of ['en', 'zh']) {
    const UI = ui(language), html = UI.stage(E.view(state, 0).wl);
    assert.match(html, /data-wl-speaker/);
    assert.match(html, /<details class="wl-inspiration" data-wl-inspiration>/, 'host roles start folded too');
    assert.ok(html.indexOf('wl-marquee-title') < html.indexOf('data-wl-inspiration'));
    assert.doesNotMatch(html, /data-ct-action="line"|<img src=x onerror=x>/);
    assert.match(html, /&lt;img src=x onerror=x&gt;/);
  }
});

test('the actual command transport forwards the speaking token while retaining points settings for all six draw values', () => {
  const source = fs.readFileSync(path.join(root, 'word-limit-ui.js'), 'utf8');
  assert.match(source, /fields: \[[^\]]*'speakingTurn'/);
  const UI = ui('en'), html = UI.pointsFields(E.defaultSettings());
  assert.equal((html.match(/data-ct-set="pt-/g) || []).length, 6);
  assert.match(html, /data-ct-set="pt-6"/);
  assert.doesNotMatch(html, /data-ct-set="pt-7"/);
});
