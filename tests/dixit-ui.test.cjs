'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dixit-engine.js');
const UI = require('../dixit-ui.js');
const source = fs.readFileSync(require.resolve('../dixit-ui.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
let serial = 0;
function create(count = 4) {
  return E.create({ id: 'ui-' + (++serial), seed: 713, now: 1000,
    roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Seat ' + (i + 1) })) });
}
function act(s, type, actor = 0, extra = {}) {
  const next = E.apply(s, { id: 'ui-command-' + (++serial), sessionId: s.sessionId, turnId: s.turnId,
    seed: 891, now: 2000 + serial, type, actor, ...extra });
  assert.equal(next.replies[actor]?.error, '', type + ' fixture command should be accepted');
  return next;
}
const dealt = (count = 4) => act(create(count), 'deal', 0, { firstPlayerNum: 1 });
const submitted = (count = 4) => {
  const s = dealt(count);
  return act(s, 'story', 1, { cardId: s.hands[1][0], clueMode: 'spoken' });
};
function voting(count = 4) {
  let s = submitted(count);
  for (let seat = 2; seat <= count; seat++) s = act(s, 'submit', seat, { cardIds: s.hands[seat].slice(0, count === 3 ? 2 : 1) });
  return s;
}
function scored(outcome = 'some') {
  let s = voting();
  const answer = s.submissions[1][0], second = s.submissions[2][0], third = s.submissions[3][0];
  const votes = outcome === 'all' ? [answer, answer, answer] : outcome === 'none' ? [third, second, second] : [answer, second, second];
  for (let seat = 2; seat <= 4; seat++) s = act(s, 'vote', seat, { cardId: votes[seat - 2] });
  return finishReveal(act(s, 'reveal'));
}
function finishReveal(s) { return act(s, 'advanceReveal', 0, { now: s.revealPopularAt }); }
const htmlFor = (s, seat = 0, options = {}) => UI.tableHTML(E.view(s, seat, 3000), { host: seat === 0, ...options });
function buttons(html) {
  return (html.match(/<button\b[^>]*\bdata-dx-action="[^"]+"[^>]*>/g) || []).map(tag => ({
    type: tag.match(/data-dx-action="([^"]+)"/)[1], disabled: /\sdisabled(?:\s|>)/.test(tag)
  }));
}
const action = (html, type) => buttons(html).find(b => b.type === type);
function noActions(html, types) { for (const type of types) assert.equal(action(html, type), undefined, type + ' must not be offered'); }
const cardButtons = html => html.match(/<button\b[^>]*\bdata-dx-card="[^"]+"[^>]*>/g) || [];

test('shared host renderer cannot expose private hands or private controls, even with a player projection', () => {
  for (const count of [3, 4, 8]) {
    for (const s of [dealt(count), submitted(count), voting(count)]) {
      const host = htmlFor(s);
      assert.doesNotMatch(host, /dx-hand|data-dx-card=|data-dx-clue|dx-own/);
      noActions(host, ['ready', 'story', 'submit', 'vote']);
      for (const player of s.roster) {
        const accidentallyPrivate = UI.tableHTML(E.view(s, player.playerNum), { host: true });
        assert.doesNotMatch(accidentallyPrivate, /dx-hand|data-dx-card=|data-dx-clue|dx-own/);
        noActions(accidentallyPrivate, ['story', 'submit', 'vote']);
        for (const id of s.hands[player.playerNum]) {
          assert.ok(!host.includes('data-dx-zoom="' + id + '"'));
          assert.ok(!accidentallyPrivate.includes('data-dx-zoom="' + id + '"'));
        }
      }
    }
  }
});

test('phase-specific private renderer shows only the owning hand and legal card selection surfaces', () => {
  const clue = dealt(), submit = submitted(), vote = voting();
  assert.equal(cardButtons(htmlFor(clue, 1)).length, 6);
  assert.ok(action(htmlFor(clue, 1), 'story').disabled);
  assert.equal(cardButtons(htmlFor(clue, 2)).length, 0);
  noActions(htmlFor(clue, 2), ['story', 'submit', 'vote', 'deal']);
  const hand = htmlFor(submit, 2);
  assert.equal(cardButtons(hand).length, 6); assert.ok(action(hand, 'submit').disabled);
  assert.equal(cardButtons(htmlFor(submit, 1)).length, 0);
  for (const id of submit.hands[3]) assert.ok(!hand.includes('data-dx-zoom="' + id + '"'));
  const table = cardButtons(htmlFor(vote, 2));
  assert.equal(table.length, 4);
  assert.ok(table.find(tag => tag.includes('data-dx-card="' + vote.submissions[2][0] + '"')).includes(' disabled'));
  assert.ok(table.filter(tag => !tag.includes(' disabled')).every(tag => vote.table.some(id => tag.includes(id))));
  noActions(htmlFor(vote, 1), ['vote', 'story', 'submit']);
  assert.equal(action(htmlFor(vote), 'reveal').disabled, true);
  assert.doesNotMatch(htmlFor(vote, 3), /dx-answer|dx-owner|dx-result|<tbody>/);
});

test('lobby has host start and player readiness, and three-player submission requires exactly two cards', () => {
  for (const count of [3, 4, 8]) {
    const s = create(count);
    assert.equal(action(htmlFor(s), 'deal').disabled, false);
    assert.equal(action(htmlFor(s, 1), 'ready').disabled, false);
    noActions(htmlFor(s), ['ready', 'story', 'submit', 'vote']);
    noActions(htmlFor(s, 2), ['deal', 'reveal', 'nextRound', 'pause', 'restart']);
  }
  const s = submitted(3), [first, second] = s.hands[2];
  assert.match(htmlFor(s, 2), /select 2 matching picture card/);
  assert.equal(action(htmlFor(s, 2, { selected: new Set([first]) }), 'submit').disabled, true);
  assert.equal(action(htmlFor(s, 2, { selected: new Set([first, second]) }), 'submit').disabled, false);
  assert.equal(action(htmlFor(s, 2, { selected: new Set(s.hands[2].slice(0, 3)) }), 'submit').disabled, true);
});

test('story uses voice only and requires a selected card before the separate spoken confirmation', () => {
  const s = dealt(), id = s.hands[1][0];
  assert.equal(action(htmlFor(s, 1), 'story').disabled, true);
  assert.equal(action(htmlFor(s, 1, { selected: new Set([id]) }), 'story').disabled, false);
  assert.match(htmlFor(s, 1), /I have spoken my clue/);
  assert.doesNotMatch(htmlFor(s, 1), /data-dx-clue|data-dx-spoken|type="checkbox"|<input/);
  const spoken = submitted(), publicHTML = htmlFor(spoken);
  assert.match(publicHTML, /Listen to the Storyteller’s spoken clue/); assert.doesNotMatch(publicHTML, /<blockquote/);
});

test('reveal prints the actual answer, owners, votes and base/bonus/total scores for every scoring branch', () => {
  for (const outcome of ['all', 'none', 'some']) {
    const s = scored(outcome), result = s.lastRound, html = htmlFor(s);
    assert.ok(html.includes(UI.esc(UI.t(outcome))));
    assert.ok(html.includes('class="dx-picture is-answer"'));
    assert.equal((html.match(/class="dx-owner"/g) || []).length, 4);
    assert.ok(action(html, 'nextRound')); noActions(htmlFor(s, 2), ['nextRound', 'vote', 'submit']);
    for (const row of result.rows) {
      const vote = row.playerNum === 1 ? '✦' : '#' + (result.table.indexOf(row.voteCardId) + 1) + (row.correct ? ' ✓' : '');
      const expected = '<tr><th>Seat ' + row.playerNum + '</th><td>' + vote + '</td><td>+' + row.base + '</td><td>+' + row.bonus + '</td><td><strong>' + row.score + '</strong> <small>(+' + row.delta + ')</small></td></tr>';
      assert.ok(html.includes(expected), 'render the awarded engine score, including vote bonuses in ' + outcome);
    }
    const refilled = act(s, 'nextRound');
    assert.equal(refilled.storyteller, 2); assert.doesNotMatch(htmlFor(refilled), /dx-result|dx-answer|dx-owner/);
  }
});

test('finish displays all tied winners and prevents another round; cancellation preserves no playable hand', () => {
  let s = voting();
  s.scores = { 1: 27, 2: 25, 3: 0, 4: 0 };
  for (const [seat, cardId] of [[2, s.submissions[1][0]], [3, s.submissions[2][0]], [4, s.submissions[2][0]]]) s = act(s, 'vote', seat, { cardId });
  s = finishReveal(act(s, 'reveal'));
  assert.equal(s.phase, 'FINISHED'); assert.match(htmlFor(s), /Shared winners: Seat 1, Seat 2/);
  noActions(htmlFor(s), ['nextRound', 'deal', 'pause', 'cancel']);
  assert.doesNotMatch(htmlFor(s, 2), /dx-hand/);
  const cancelled = act(dealt(), 'cancel');
  assert.match(htmlFor(cancelled), /Game cancelled/); assert.doesNotMatch(htmlFor(cancelled, 2), /dx-hand|data-dx-card=/);
});

test('names, legacy clues and image descriptions are escaped without visible picture captions', () => {
  let s = submitted();
  const hostile = '<img src=x onerror="alert(1)"> & \'\"';
  s.roster[0].name = hostile; s.clue = hostile; s.clueMode = 'text';
  const html = htmlFor(s, 2);
  assert.ok(html.includes(UI.esc(hostile))); assert.doesNotMatch(html, /<img|onerror="alert/);
  const context = { DIXIT_DECK: { version: 2, cards: [{ description: hostile, image: 'assets/dixit-v2/d001.webp' }] } };
  vm.runInNewContext(source, context);
  const picture = context.DIXIT_UI.cardHTML('d001', 1);
  assert.ok(picture.includes('alt="' + UI.esc(hostile) + '"')); assert.doesNotMatch(picture, /onerror="alert|<figcaption/);
  assert.equal(picture.split(UI.esc(hostile)).length - 1, 1, 'description appears only in the accessible image alt');
  assert.match(picture, /<img class="dx-art" src="assets\/dixit-v2\/d001.webp"/);
  assert.equal(UI.errorText('stale_turn'), UI.t('stale')); assert.equal(UI.errorText('stale_session'), UI.t('stale'));
  assert.equal(UI.errorText('paused'), UI.t('paused')); assert.equal(UI.errorText('offline'), UI.t('failed'));
  assert.equal(UI.errorText('invalid_card'), UI.t('invalid')); assert.doesNotMatch(UI.errorText('invalid_card'), /invalid_card/);
  assert.match(UI.rulesHTML(), /84 original illustrations|unofficial adaptation/i);
});

// Small DOM double retains live disabled flags, datasets and form inputs.
// It drives the real Card event handler rather than copying its decisions.
class ElementDouble {
  constructor(document) {
    this.listeners = new Map(); this.children = []; this.attributes = {}; this.nodes = []; this._html = '';
    this.ownerDocument = document || { activeElement: null, body: { style: { overflow: '' } } };
    if (!this.ownerDocument.createElement) this.ownerDocument.createElement = () => new ElementDouble(this.ownerDocument);
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(child) { child.parentElement = this; this.children.push(child); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type) { this.listeners.delete(type); }
  set innerHTML(html) {
    this._html = html; this.nodes = []; this.children = [];
    for (const tag of html.match(/<(?:button|input|select|details|span|p)\b[^>]*>/g) || []) {
      const dataset = {};
      for (const attr of tag.matchAll(/data-dx-([\w-]+)(?:="([^"]*)")?/g)) dataset['dx' + attr[1].split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')] = attr[2] || '';
      const document = this.ownerDocument;
      const node = { dataset, tag, disabled: /\sdisabled(?:\s|>)/.test(tag), value: tag.match(/\bvalue="([^"]*)"/)?.[1] || '',
        checked: /\schecked(?:\s|>)/.test(tag), open: false, textContent: '',
        focus() { document.activeElement = this; },
        matches(selector) {
          if (selector === 'button:not([disabled])') return tag.startsWith('<button') && !this.disabled;
          return selector.startsWith('[data-dx-') && Object.hasOwn(this.dataset, selector.slice(9, -1).split('-').map((part, i) => i ? part[0].toUpperCase() + part.slice(1) : 'dx' + part[0].toUpperCase() + part.slice(1)).join(''));
        },
        closest(selector) { return this.matches(selector) ? this : null; } };
      this.nodes.push(node);
    }
  }
  get innerHTML() { return this._html; }
  querySelector(selector) {
    const exact = selector.match(/^\[data-dx-([\w-]+)="([^"]+)"\]$/);
    if (exact) {
      const key = 'dx' + exact[1].split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
      return this.nodes.find(node => node.dataset[key] === exact[2]) || this.children.map(child => child.querySelector(selector)).find(Boolean) || null;
    }
    if (selector.startsWith('.')) return this.children.find(child => child.className === selector.slice(1)) || null;
    return this.nodes.find(node => node.matches(selector)) || this.children.map(child => child.querySelector(selector)).find(Boolean) || null;
  }
  querySelectorAll(selector) { return this.nodes.filter(node => selector.split(',').some(part => node.matches(part))).concat(this.children.flatMap(child => child.querySelectorAll(selector))); }
}
function harness(data, options = {}, globals = {}) {
  const timers = new Map(), sent = [], context = { crypto: { randomUUID: () => 'ui-mailbox-' + (++serial) },
    setInterval: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
    setTimeout: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id), confirm: () => true, ...globals };
  vm.runInNewContext(source, context);
  const element = new ElementDouble(), card = new context.DIXIT_UI.Card(element, { now: () => 3000,
    send: async command => { sent.push(copy(command)); }, ...options });
  card.update(data);
  return { card, element, sent, timers,
    async click(selector) { const target = element.querySelector(selector); assert.ok(target, selector + ' exists'); await card.onClick({ target }); },
  };
}

test('changing language repaints the same player projection and preserves the selected card', async () => {
  let locale = 'en';
  const dictionaries = new Map(), I18N = {
    registerDict(namespace, dictionary) { dictionaries.set(namespace, dictionary); },
    t(namespace, key) { return dictionaries.get(namespace)?.[key]?.[locale] || key; },
  };
  const s = dealt(), projection = E.view(s, 1), h = harness(projection, {}, { I18N });
  try {
    const id = s.hands[1][0];
    await h.click('[data-dx-card="' + id + '"]');
    assert.match(h.element.innerHTML, /Your hand/);
    locale = 'zh'; h.card.update(projection);
    assert.match(h.element.innerHTML, /你的手牌/); assert.match(h.element.innerHTML, /已說完提示，確認出牌/);
    assert.doesNotMatch(h.element.innerHTML, />Your hand</);
    assert.deepEqual([...h.card.selected], [id]);
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    locale = 'en'; h.card.update(projection);
    assert.match(h.element.innerHTML, /Your hand/); assert.match(h.element.innerHTML, /I have spoken my clue/);
    assert.deepEqual([...h.card.selected], [id]); assert.equal(h.sent.length, 0);
  } finally { h.card.destroy(); }
});

test('three-player taps select two distinct cards and send one captured request until its matching receipt', async () => {
  const s = submitted(3), h = harness(E.view(s, 2));
  try {
    const [first, second, third] = s.hands[2];
    await h.click('[data-dx-card="' + first + '"]');
    assert.equal(h.element.querySelector('[data-dx-action="submit"]').disabled, true);
    await h.click('[data-dx-card="' + second + '"]');
    assert.equal(h.element.querySelector('[data-dx-action="submit"]').disabled, false);
    await h.click('[data-dx-card="' + third + '"]');
    assert.deepEqual([...h.card.selected], [first, second]);
    await h.click('[data-dx-action="submit"]'); await h.click('[data-dx-action="submit"]');
    assert.equal(h.sent.length, 1); assert.deepEqual(h.sent[0].cardIds, [first, second]);
    assert.equal(h.sent[0].sessionId, s.sessionId); assert.equal(h.sent[0].turnId, s.turnId);
    const unrelated = E.view(s, 2); unrelated.dixit.reply = { id: 'different', error: '' }; h.card.update(unrelated);
    assert.ok(h.card.pending);
    const acknowledged = act(s, 'submit', 2, h.sent[0]); h.card.update(E.view(acknowledged, 2));
    assert.equal(h.card.pending, null); noActions(h.element.innerHTML, ['submit']);
  } finally { h.card.destroy(); }
  assert.equal(h.timers.size, 0); assert.equal(h.element.listeners.size, 0);
});

test('disabled own cards cannot be selected, and a vote command captures exactly one eligible table card', async () => {
  const s = voting(3), h = harness(E.view(s, 2));
  try {
    for (const id of s.submissions[2]) await h.click('[data-dx-card="' + id + '"]');
    assert.equal(h.card.selected.size, 0);
    const first = s.submissions[1][0], second = s.submissions[3][0];
    await h.click('[data-dx-card="' + first + '"]'); await h.click('[data-dx-card="' + second + '"]');
    assert.deepEqual([...h.card.selected], [second]);
    await h.click('[data-dx-action="vote"]');
    assert.equal(h.sent.length, 1); assert.equal(h.sent[0].cardId, second); assert.equal(h.sent[0].type, 'vote');
    const next = act(s, 'vote', 2, h.sent[0]); h.card.update(E.view(next, 2));
    assert.equal(h.card.pending, null); noActions(h.element.innerHTML, ['vote']); assert.match(h.element.innerHTML, /Vote submitted/);
  } finally { h.card.destroy(); }
});

test('story selection never submits immediately; explicit spoken confirmation survives reconnect and sends no invented text', async () => {
  const s = dealt(); let connected = true;
  const h = harness(E.view(s, 1), { connected: () => connected });
  try {
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]');
    assert.equal(h.sent.length, 0);
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    connected = false; h.card.paint();
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, true);
    connected = true; h.card.paint();
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    await h.click('[data-dx-action="story"]');
    assert.equal(h.sent[0].cardId, s.hands[1][0]); assert.equal(h.sent[0].clueMode, 'spoken'); assert.equal(h.sent[0].clue, undefined);
    const next = act(s, 'story', 1, h.sent[0]); h.card.update(E.view(next, 1));
    assert.equal(h.card.pending, null); assert.equal(h.card.selected.size, 0); assert.equal(next.clue, '');
  } finally { h.card.destroy(); }
});

test('paused, expired host lease and transport rejection disable actions and expose readable status', async () => {
  const s = dealt(), data = E.view(s, 1); data.dixit.hostLiveUntil = 2000;
  const h = harness(data);
  try {
    const button = h.element.querySelector('[data-dx-card="' + s.hands[1][0] + '"]');
    assert.equal(button.disabled, true); assert.equal(h.element.querySelector('[data-dx-connection]').textContent, UI.t('hostAway'));
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); assert.equal(h.card.selected.size, 0);
  } finally { h.card.destroy(); }
  const paused = act(s, 'pause'); noActions(htmlFor(paused, 1), ['story']); assert.ok(action(htmlFor(paused), 'resume'));
  const failed = harness(E.view(create(), 1), { send: async () => { throw new Error('offline'); } });
  try { await failed.click('[data-dx-action="ready"]'); assert.equal(failed.card.pending, null); assert.equal(failed.card.error, UI.t('failed')); }
  finally { failed.card.destroy(); }
});

test('legacy games retain the atlas card faces while newly created games use standalone artwork', () => {
  const oldCards = Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit/atlas-' + (Math.floor(i / 12) + 1) + '.webp', description: 'Old art ' + i }));
  const newCards = Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit-v2/d' + String(i + 1).padStart(3, '0') + '.webp', description: 'Independent picture ' + i }));
  const context = { DIXIT_DECK: { version: 2, cards: newCards, legacyCards: oldCards } }; vm.runInNewContext(source, context);
  const fresh = dealt(), legacy = copy(fresh); delete legacy.artworkVersion;
  assert.equal(E.view(fresh, 1).dixit.artworkVersion, 2); assert.equal(E.view(legacy, 1).dixit.artworkVersion, 1);
  const freshHTML = context.DIXIT_UI.tableHTML(E.view(fresh, 1)), legacyHTML = context.DIXIT_UI.tableHTML(E.view(legacy, 1));
  assert.match(freshHTML, /<img class="dx-art" src="assets\/dixit-v2\/d\d{3}\.webp"/); assert.doesNotMatch(freshHTML, /atlas-\d/);
  assert.match(legacyHTML, /dx-art-atlas/); assert.doesNotMatch(legacyHTML, /assets\/dixit-v2/);
  context.DIXIT_DECK = { version: 1, cards: oldCards };
  assert.match(context.DIXIT_UI.tableHTML(E.view(fresh, 1)), /dx-art-atlas/, 'old deck script remains usable during staggered deployment');
});

test('focus gallery views only permitted cards with next, previous and overview controls without changing selection or sending', async () => {
  const s = dealt(), h = harness(E.view(s, 1));
  try {
    const [first, second] = s.hands[1];
    await h.click('[data-dx-card="' + first + '"]');
    const zoom = h.element.querySelector('[data-dx-zoom="' + second + '"]'); zoom.focus();
    await h.click('[data-dx-zoom="' + second + '"]');
    assert.ok(h.card.modal); assert.equal(h.card.modal.attributes.role, 'dialog'); assert.equal(h.card.modal.attributes['aria-modal'], 'true');
    assert.equal(h.card.focusIndex, 1); assert.deepEqual([...h.card.selected], [first]); assert.equal(h.sent.length, 0);
    assert.equal(h.element.ownerDocument.body.style.overflow, 'hidden');
    assert.doesNotMatch(h.card.modal.innerHTML, /data-dx-card=|data-dx-action=/);
    await h.click('[data-dx-focus-step="1"]'); assert.equal(h.card.focusIndex, 2);
    await h.click('[data-dx-focus-step="-1"]'); assert.equal(h.card.focusIndex, 1);
    await h.click('[data-dx-focus-index="5"]'); assert.equal(h.card.focusIndex, 5);
    assert.equal(h.element.querySelector('[data-dx-focus-step="1"]').disabled, true);
    h.card.key({ key: 'ArrowLeft', preventDefault() {} }); assert.equal(h.card.focusIndex, 4);
    const focusButtons = h.card.modal.querySelectorAll('button:not([disabled])');
    focusButtons.at(-1).focus(); h.card.key({ key: 'Tab', shiftKey: false, preventDefault() {} });
    assert.equal(h.element.ownerDocument.activeElement, focusButtons[0], 'Tab stays inside the gallery');
    h.card.key({ key: 'Escape', preventDefault() {} }); assert.equal(h.card.modal, null);
    assert.equal(h.element.ownerDocument.activeElement, zoom); assert.equal(h.element.ownerDocument.body.style.overflow, '');
    assert.deepEqual([...h.card.selected], [first]); assert.equal(h.sent.length, 0);
    h.card.openModal(s.hands[2][0], 'hand'); assert.equal(h.card.modal, null, 'another player’s card cannot be opened');
  } finally { h.card.destroy(); }
});

test('a new session releases pending work and closes a focus view containing the previous private hand', async () => {
  const s = dealt(), h = harness(E.view(s, 1));
  try {
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); await h.click('[data-dx-action="story"]');
    assert.ok(h.card.pending);
    h.card.openModal(s.hands[1][1], 'hand'); assert.ok(h.card.modal);
    const restarted = act(s, 'restart'); h.card.update(E.view(restarted, 1));
    assert.equal(h.card.pending, null); assert.equal(h.card.modal, null); assert.equal(h.card.selected.size, 0);
    assert.equal(h.element.ownerDocument.body.style.overflow, ''); assert.equal(h.card.error, '');
  } finally { h.card.destroy(); }
});

test('an old host rejecting a spoken clue gives a bilingual refresh instruction and preserves the card for retry', async () => {
  let locale = 'en'; const dictionaries = new Map(), I18N = {
    registerDict(namespace, dictionary) { dictionaries.set(namespace, dictionary); },
    t(namespace, key) { return dictionaries.get(namespace)?.[key]?.[locale] || key; },
  };
  const s = dealt(), h = harness(E.view(s, 1), {}, { I18N });
  try {
    const id = s.hands[1][0]; await h.click('[data-dx-card="' + id + '"]'); await h.click('[data-dx-action="story"]');
    const rejected = E.view(s, 1); rejected.dixit.reply = { id: h.sent[0].id, error: 'invalid_clue' }; h.card.update(rejected);
    assert.equal(h.card.pending, null); assert.deepEqual([...h.card.selected], [id]);
    assert.match(h.element.querySelector('[data-dx-message]').textContent, /host to refresh the game page to enable spoken clues/i);
    assert.doesNotMatch(h.element.innerHTML, /data-dx-clue|<input/);
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    locale = 'zh'; h.card.update(rejected);
    assert.match(h.element.querySelector('[data-dx-message]').textContent, /請主持人重新整理遊戲頁面/);
    await h.click('[data-dx-action="story"]'); assert.equal(h.sent.length, 2);
    assert.equal(h.sent[1].clueMode, 'spoken'); assert.equal(h.sent[1].clue, undefined); assert.equal(h.sent[1].cardId, id);
    assert.notEqual(h.sent[1].id, h.sent[0].id);
  } finally { h.card.destroy(); }
});

test('the current phase leads the information bar and gives each role its next action and progress', () => {
  const clue = dealt(), submit = submitted(), vote = voting();
  for (const [s, label] of [[create(), 'Waiting to start'], [clue, 'Storyteller speaks'], [submit, 'Secret card selection'], [vote, 'Secret voting']]) {
    const html = htmlFor(s, 2);
    assert.ok(html.indexOf('class="dx-phase-bar') < html.indexOf('class="dx-header'), 'phase is the first visual information');
    assert.match(html, new RegExp('data-dx-phase="' + s.phase + '"'));
    assert.ok(html.includes('<h2>' + label + '</h2>'));
    assert.match(html, /<details class="dx-game-details"/, 'scores and deck details stay secondary');
  }
  assert.match(htmlFor(clue, 1), /Choose a picture → say your clue aloud → confirm your card/);
  assert.match(htmlFor(clue, 2), /Listen to Seat 1’s spoken clue/);
  assert.match(htmlFor(submit, 2), /Cards submitted: 0 \/ 3/);
  assert.match(htmlFor(vote, 2), /Votes received: 0 \/ 3/);
  const afterVote = act(vote, 'vote', 2, { cardId: vote.submissions[1][0] });
  assert.match(htmlFor(afterVote, 2), /Vote submitted/);
  assert.match(htmlFor(afterVote, 3), /Which card belongs to the Storyteller/);
});

function startedReveal({ tied = false } = {}) {
  let s = voting();
  const cards = tied ? [s.submissions[1][0], s.submissions[2][0], s.submissions[3][0]] : [s.submissions[1][0], s.submissions[2][0], s.submissions[2][0]];
  for (let seat = 2; seat <= 4; seat++) s = act(s, 'vote', seat, { cardId: cards[seat - 2] });
  return act(s, 'reveal', 1, { now: 10000 });
}

test('countdown uses the shared deadline, continues correctly after refresh, and reveals no answer or vote result', () => {
  const s = startedReveal();
  assert.equal(s.phase, 'REVEALING');
  for (const [now, number] of [[10000, 3], [10999, 3], [11000, 2], [12000, 1], [13050, 1]]) {
    const html = UI.tableHTML(E.view(s, 2, now), { now });
    assert.match(html, new RegExp('data-dx-countdown>' + number + '</span>'));
    assert.doesNotMatch(html, /dx-story-reveal|dx-popular-reveal|dx-result|dx-owner|dx-hand/);
  }
  let now = 10000; const h = harness(E.view(s, 2, now), { now: () => now });
  try {
    assert.match(h.element.innerHTML, /data-dx-countdown>3<\/span>/);
    now = 11000; h.card.paint(); assert.match(h.element.innerHTML, /data-dx-countdown>2<\/span>/);
    now = 12000; h.card.paint(); assert.match(h.element.innerHTML, /data-dx-countdown>1<\/span>/);
    const refreshed = harness(E.view(s, 2, now), { now: () => now });
    try { assert.match(refreshed.element.innerHTML, /data-dx-countdown>1<\/span>/); }
    finally { refreshed.card.destroy(); }
    assert.equal(h.sent.length, 0, 'a display timer never sends or advances a reveal');
  } finally { h.card.destroy(); }
  const paused = act(s, 'pause', 1, { now: 11500 });
  const html = UI.tableHTML(E.view(paused, 2, 40000), { now: 40000 });
  assert.match(html, /data-dx-countdown>2<\/span>/);
  assert.match(html, /Game paused/);
});

test('answer stage centers only the actual Storyteller card; top votes and scores appear at the later stage', () => {
  const started = startedReveal(), answer = started.submissions[1][0];
  const s = act(started, 'advanceReveal', 1, { now: started.revealAnswerAt });
  const html = UI.tableHTML(E.view(s, 2, started.revealAnswerAt), { now: started.revealAnswerAt });
  assert.match(html, /data-dx-reveal-stage="answer"/);
  assert.match(html, /class="dx-story-reveal"/);
  assert.match(html, new RegExp('data-dx-zoom="' + answer + '"'));
  assert.equal((html.match(/data-dx-zoom=/g) || []).length, 1, 'only the answer picture competes for attention');
  assert.doesNotMatch(html, /dx-popular-reveal|dx-result|dx-owner|data-dx-countdown/);
  const final = finishReveal(s), finalHTML = htmlFor(final, 2);
  assert.match(finalHTML, /data-dx-reveal-stage="popular"/);
  assert.ok(finalHTML.indexOf('class="dx-story-reveal"') < finalHTML.indexOf('class="dx-popular-reveal"'));
  assert.match(finalHTML, /Most-voted picture/);
  assert.ok(finalHTML.indexOf('dx-popular-reveal') < finalHTML.indexOf('dx-result'));
  const context = { DIXIT_DECK: { version: 2, cards: Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit-v2/d' + String(i + 1).padStart(3, '0') + '.webp' })) } };
  vm.runInNewContext(source, context);
  const eagerHTML = context.DIXIT_UI.tableHTML(E.view(s, 2, started.revealAnswerAt), { now: started.revealAnswerAt });
  assert.match(eagerHTML, /<img class="dx-art"[^>]+loading="eager"/);
  assert.doesNotMatch(eagerHTML, /loading="lazy"/, 'the reveal picture loads eagerly during its short exclusive stage');
});

test('all tied most-voted pictures appear, including the answer when it ties; legacy revealed rounds never replay a countdown', () => {
  const s = finishReveal(startedReveal({ tied: true })), html = htmlFor(s, 2);
  assert.equal(s.lastRound.popularCardIds.length, 3);
  const feature = html.slice(html.indexOf('data-dx-reveal-stage="popular"'), html.indexOf('<section class="dx-panel dx-result'));
  assert.match(feature, /Tied most-voted pictures/);
  for (const id of s.lastRound.popularCardIds) assert.match(feature, new RegExp('data-dx-zoom="' + id + '"'));
  assert.equal((feature.match(new RegExp('data-dx-zoom="' + s.lastRound.answerCardId + '"', 'g')) || []).length, 2, 'the same picture can be answer and top-voted');
  const legacy = E.view(s, 2); delete legacy.dixit.revealStage; delete legacy.dixit.revealStartedAt; delete legacy.dixit.revealAnswerAt; delete legacy.dixit.revealPopularAt;
  delete legacy.dixit.result.popularCardIds; delete legacy.dixit.result.maxVotes;
  const legacyHTML = UI.tableHTML(legacy);
  assert.doesNotMatch(legacyHTML, /data-dx-countdown/); assert.match(legacyHTML, /Tied most-voted pictures/);
});

test('a private host retains their own hand and player actions while controlling deal, reveal, pause and next round', async () => {
  const lobby = create(), hostLobby = htmlFor(lobby, 1), otherLobby = htmlFor(lobby, 2);
  assert.ok(action(hostLobby, 'deal')); assert.ok(action(hostLobby, 'ready'));
  noActions(otherLobby, ['deal', 'pause', 'cancel', 'restart']);
  const s = dealt(), h = harness(E.view(s, 1));
  try {
    assert.equal(cardButtons(h.element.innerHTML).length, 6);
    assert.ok(action(h.element.innerHTML, 'pause')); assert.ok(action(h.element.innerHTML, 'cancel'));
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); await h.click('[data-dx-action="story"]');
    assert.equal(h.sent.length, 1); assert.equal(h.sent[0].type, 'story');
  } finally { h.card.destroy(); }
  const start = startedReveal(), final = finishReveal(start);
  assert.ok(action(htmlFor(final, 1), 'nextRound')); noActions(htmlFor(final, 2), ['nextRound']);
  const vote = voting();
  for (const seat of [2, 3, 4]) vote.votes[seat] = vote.submissions[1][0];
  assert.equal(action(htmlFor(vote, 1), 'reveal').disabled, false);
  noActions(htmlFor(vote, 2), ['reveal']);
});

test('player projections cannot gain host controls from forged action flags, and confirmation stays inside the card', async () => {
  const s = dealt(), forged = E.view(s, 2); forged.dixit.actions = { ...forged.dixit.actions, pause: true, cancel: true, restart: true };
  noActions(UI.tableHTML(forged), ['pause', 'cancel', 'restart']);
  const h = harness(E.view(s, 1), {}, { confirm: () => { throw new Error('Native confirmation is prohibited'); } });
  try {
    await h.click('[data-dx-action="cancel"]'); assert.equal(h.sent.length, 0);
    assert.match(h.element.innerHTML, /role="alertdialog"/); assert.match(h.element.innerHTML, /Cancel this game/);
    await h.click('[data-dx-dismiss-confirm]'); assert.equal(h.sent.length, 0); assert.equal(h.card.confirmation, '');
    await h.click('[data-dx-action="restart"]'); assert.equal(h.sent.length, 0);
    await h.click('[data-dx-confirm="restart"]'); assert.equal(h.sent.length, 1); assert.equal(h.sent[0].type, 'restart');
  } finally { h.card.destroy(); }
});
