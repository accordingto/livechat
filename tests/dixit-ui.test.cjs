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
const visibleText = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
function secondaryPart(html) {
  const start = html.indexOf('class="dx-popular-reveal"');
  if (start < 0) return '';
  const end = html.indexOf('<aside', start);
  return html.slice(start, end < 0 ? html.indexOf('<details class="dx-panel dx-result', start) : end);
}
function scorePlayerParts(points) {
  const starts = [...points.matchAll(/<div\b[^>]*\bdata-dx-score-player="(\d+)"[^>]*>/g)];
  return new Map(starts.map((match, i) => [Number(match[1]), points.slice(match.index, starts[i + 1]?.index ?? points.length)]));
}

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
          assert.ok(!host.includes('data-dx-picture="' + id + '"'));
          assert.ok(!accidentallyPrivate.includes('data-dx-picture="' + id + '"'));
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
  for (const id of submit.hands[3]) assert.ok(!hand.includes('data-dx-picture="' + id + '"'));
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
  assert.match(htmlFor(spoken, 2), /Listen to the spoken clue and select/);
  assert.doesNotMatch(publicHTML, /class="dx-spoken"|Listen to the Storyteller’s spoken clue|<blockquote/);
});

test('reveal prints the actual answer, owners, votes and base/bonus/total scores for every scoring branch', () => {
  for (const outcome of ['all', 'none', 'some']) {
    const s = scored(outcome), result = s.lastRound, html = htmlFor(s);
    assert.ok(html.includes(UI.esc(UI.t(outcome))));
    assert.ok(html.includes('class="dx-picture is-answer"'));
    const gallery = html.slice(html.indexOf('<details class="dx-round-gallery"'));
    assert.equal((gallery.match(/class="dx-owner"/g) || []).length, 4);
    assert.doesNotMatch(html, /class="dx-answer"/, 'the Storyteller heading is not repeated over the artwork');
    assert.ok(action(html, 'nextRound')); noActions(htmlFor(s, 2), ['nextRound', 'vote', 'submit']);
    for (const row of result.rows) {
      for (const id of row.cardIds) assert.ok(gallery.includes('data-dx-picture="' + id + '"><div class="dx-owner">Seat ' + row.playerNum + ' '), 'each played picture identifies its owner above the image');
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
  const owned = context.DIXIT_UI.cardHTML('d001', 1, { owner: hostile, answer: true });
  assert.ok(owned.includes('<div class="dx-owner">' + UI.esc(hostile) + '</div><div class="dx-picture is-answer">'));
  assert.doesNotMatch(owned, /onerror="alert|class="dx-answer"/);
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
        checked: /\schecked(?:\s|>)/.test(tag), open: /\sopen(?:\s|>)/.test(tag), textContent: '',
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

test('an expired executor lease permits queued player actions; pause and transport loss still disable actions', async () => {
  const s = dealt(), data = E.view(s, 1); data.dixit.hostLiveUntil = 2000;
  const h = harness(data);
  try {
    const button = h.element.querySelector('[data-dx-card="' + s.hands[1][0] + '"]');
    assert.equal(button.disabled, false); assert.equal(h.element.querySelector('[data-dx-connection]').textContent, UI.t('hostAway'));
    assert.match(h.element.querySelector('[data-dx-connection]').textContent, /Reconnecting game sync/);
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); assert.equal(h.card.selected.size, 1);
    await h.click('[data-dx-action="story"]'); assert.equal(h.sent.length, 1); assert.equal(h.sent[0].type, 'story');
    assert.ok(h.card.pending); assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, true, 'pending actions still cannot be duplicated');
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

test('large pictures have no separate enlargement controls in hands, voting or revealed results', () => {
  for (const s of [dealt(), submitted(), voting(), scored()]) for (const seat of [0, 1, 2]) {
    assert.doesNotMatch(htmlFor(s, seat), /data-dx-zoom|dx-zoom|Enlarge picture|Picture focus view|data-dx-focus|dx-modal/);
  }
  const hand = htmlFor(dealt(), 1);
  assert.equal(cardButtons(hand).length, 6);
  assert.match(hand, /Tap a picture to select it, then confirm your choice/);
});

test('a new session releases pending work and clears the previous private card selection', async () => {
  const s = dealt(), h = harness(E.view(s, 1));
  try {
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); await h.click('[data-dx-action="story"]');
    assert.ok(h.card.pending);
    const restarted = act(s, 'restart'); h.card.update(E.view(restarted, 1));
    assert.equal(h.card.pending, null); assert.equal(h.card.selected.size, 0);
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
    assert.ok(html.indexOf('class="dx-phase-bar') < html.indexOf('data-dx-message'), 'phase is the first visual information');
    assert.doesNotMatch(html, /class="dx-identity"|class="dx-spoken"|Private hand:/, 'extra identity and spoken-clue lines do not compete with the phase bar');
    assert.doesNotMatch(html, /dx-header|dx-kicker|<h1>Dixit<\/h1>|Round \d+ · Storyteller:/);
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

function voteStatusRows(html) {
  const rows = [...html.matchAll(/<div\b[^>]*\bdata-dx-vote-player="(\d+)"[^>]*>[\s\S]*?<\/div>/g)];
  return new Map(rows.map(match => [Number(match[1]), { state: match[0].match(/data-dx-vote-state="([^"]+)"/)?.[1], html: match[0], text: visibleText(match[0]) }]));
}

test('the voting information bar names every player who voted or is waiting without revealing any ballot', () => {
  const before = voting(), after = act(before, 'vote', 2, { cardId: before.submissions[1][0] });
  const expected = new Map([[1, ['storyteller', 'Seat 1 Storyteller · no vote required']], [2, ['voted', 'Seat 2 Voted']], [3, ['waiting', 'Seat 3 Waiting for vote']], [4, ['waiting', 'Seat 4 Waiting for vote']]]);
  for (const seat of [0, 1, 2, 3, 4]) {
    const html = htmlFor(after, seat), statuses = voteStatusRows(html);
    assert.equal(statuses.size, 4, 'public and private screens show the full roster');
    assert.deepEqual([...statuses.keys()], after.roster.map(player => player.playerNum));
    assert.ok(html.indexOf('data-dx-vote-statuses') < html.indexOf('data-dx-message'), 'the status list belongs to the prominent phase bar');
    assert.match(html, /role="list"[^>]*data-dx-vote-statuses|data-dx-vote-statuses[^>]*role="list"/);
    for (const [playerNum, [state, text]] of expected) {
      const row = statuses.get(playerNum); assert.equal(row.state, state); assert.equal(row.text, text);
      assert.match(row.html, /role="listitem"/);
      assert.doesNotMatch(row.html, /data-dx-picture|dx-owner|vote\(s\)|#\d|<img/);
      for (const id of after.table) assert.ok(!row.html.includes(id), 'public vote status never contains the selected picture ID');
    }
    assert.match(html, /Votes received: 1 \/ 3/);
  }
  assert.equal(voteStatusRows(htmlFor(before)).get(2).state, 'waiting', 'submitting a vote updates that player’s public status');
});

test('voting statuses translate on the same live projection and escape player names without disclosing votes', () => {
  let locale = 'en'; const dictionaries = new Map(), I18N = {
    registerDict(namespace, dictionary) { dictionaries.set(namespace, dictionary); },
    t(namespace, key) { return dictionaries.get(namespace)?.[key]?.[locale] || key; },
  };
  let s = voting(); s = act(s, 'vote', 2, { cardId: s.submissions[1][0] });
  const data = E.view(s, 3), hostile = '<img src=x onerror="alert(1)"> & \'"';
  data.dixit.roster[1].name = hostile;
  const h = harness(data, {}, { I18N });
  try {
    assert.ok(voteStatusRows(h.element.innerHTML).get(2).html.includes(UI.esc(hostile)));
    assert.doesNotMatch(voteStatusRows(h.element.innerHTML).get(2).html, /<img|onerror="alert/);
    locale = 'zh'; h.card.update(data);
    const statuses = voteStatusRows(h.element.innerHTML);
    assert.equal(statuses.get(1).text, 'Seat 1 說書人 · 不用投票');
    assert.match(statuses.get(2).text, /已投票$/); assert.equal(statuses.get(3).text, 'Seat 3 尚未投票');
    assert.equal(statuses.get(4).text, 'Seat 4 尚未投票');
    for (const row of statuses.values()) for (const id of s.table) assert.ok(!row.html.includes(id));
    locale = 'en'; h.card.update(data);
    assert.equal(voteStatusRows(h.element.innerHTML).get(3).text, 'Seat 3 Waiting for vote');
    assert.equal(h.sent.length, 0, 'changing the status language sends no game action');
  } finally { h.card.destroy(); }
});

test('complete ballots update every eligible status while non-voting phases contain no stale waiting list', () => {
  let s = voting();
  for (let seat = 2; seat <= 4; seat++) s = act(s, 'vote', seat, { cardId: s.submissions[1][0] });
  const html = htmlFor(s, 3), statuses = voteStatusRows(html);
  for (const seat of [2, 3, 4]) assert.equal(statuses.get(seat).state, 'voted');
  assert.equal(statuses.get(1).state, 'storyteller'); assert.match(html, /Votes received: 3 \/ 3/);
  assert.doesNotMatch([...statuses.values()].map(row => row.text).join(' '), /Waiting for vote/);
  for (const phaseState of [create(), dealt(), submitted(), startedReveal(), scored(), act(dealt(), 'cancel')]) {
    assert.doesNotMatch(htmlFor(phaseState, 2), /data-dx-vote-statuses|data-dx-vote-player|data-dx-vote-state/, 'vote statuses do not persist into ' + phaseState.phase);
  }
});

test('shared recovery identifies sitting-out players while retaining real votes from an offline player', () => {
  let s = voting(5); s.sharedControls = true; s.roundPlayerNums = [1, 2, 3, 4, 5];
  s = act(s, 'vote', 2, { cardId: s.submissions[1][0] });
  s = act(s, 'vote', 5, { cardId: s.submissions[3][0] });
  s = act(s, 'recover', 1, { onlineNums: [1, 2, 3] });
  assert.deepEqual(s.roundPlayerNums, [1, 2, 3, 5]);
  for (const seat of [0, 1, 4]) {
    const html = htmlFor(s, seat), statuses = voteStatusRows(html);
    assert.equal(statuses.size, 5, 'recovery must not hide a roster member');
    assert.equal(statuses.get(1).state, 'storyteller'); assert.equal(statuses.get(2).state, 'voted');
    assert.equal(statuses.get(3).state, 'waiting'); assert.equal(statuses.get(4).state, 'inactive');
    assert.equal(statuses.get(4).text, 'Seat 4 Sitting out this round');
    assert.equal(statuses.get(5).state, 'voted', 'a genuine retained ballot still counts even when its player is offline');
    assert.match(html, /Votes received: 2 \/ 3/, 'sitting-out players are excluded from the eligible progress total');
  }
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

test('answer stage centers only the actual Storyteller card without repeating its owner; voted pictures and points appear later', () => {
  const started = startedReveal(), answer = started.submissions[1][0];
  const s = act(started, 'advanceReveal', 1, { now: started.revealAnswerAt });
  const html = UI.tableHTML(E.view(s, 2, started.revealAnswerAt), { now: started.revealAnswerAt });
  assert.match(html, /data-dx-reveal-stage="answer"/);
  assert.match(html, /class="dx-story-reveal"/);
  assert.match(html, new RegExp('data-dx-picture="' + answer + '"'));
  assert.equal((html.match(/data-dx-picture=/g) || []).length, 1, 'only the answer picture competes for attention');
  assert.match(html, /<h2>The Storyteller’s card<\/h2>.*?<div class="dx-picture is-answer">/);
  assert.doesNotMatch(html, /class="dx-owner"/, 'the Storyteller heading already identifies the answer');
  assert.doesNotMatch(html, /dx-popular-reveal|dx-result|class="dx-answer"|data-dx-countdown/);
  const final = finishReveal(s), finalHTML = htmlFor(final, 2);
  assert.match(finalHTML, /data-dx-reveal-stage="popular"/);
  assert.ok(finalHTML.indexOf('class="dx-story-reveal"') < finalHTML.indexOf('class="dx-popular-reveal"'));
  const secondary = secondaryPart(finalHTML);
  assert.match(visibleText(secondary), /Voted pictures.*2 vote\(s\)/);
  assert.deepEqual(pictureIds(secondary), [final.submissions[2][0]], 'the highest-voted non-answer appears even when the answer itself ranks second');
  assert.ok(!secondary.includes('data-dx-picture="' + answer + '"'), 'the central answer is not repeated on the right');
  assert.ok(finalHTML.indexOf('dx-popular-reveal') < finalHTML.indexOf('dx-result'));
  const centre = finalHTML.slice(finalHTML.indexOf('class="dx-story-reveal"'), finalHTML.indexOf('class="dx-popular-reveal"'));
  assert.match(centre, /<h2>The Storyteller’s card <span class=\"dx-voters\" data-dx-voters=\"answer:[^\"]+\"><button[^>]*data-dx-voters-toggle[^>]*aria-expanded=\"false\"[^>]*>1 vote\(s\)<\/button><span class=\"dx-voter-list\" hidden>by: [^<]+<\/span><\/span><\/h2>/);
  assert.doesNotMatch(centre, /class="dx-owner"/);
  const context = { DIXIT_DECK: { version: 2, cards: Array.from({ length: 84 }, (_, i) => ({ image: 'assets/dixit-v2/d' + String(i + 1).padStart(3, '0') + '.webp' })) } };
  vm.runInNewContext(source, context);
  const eagerHTML = context.DIXIT_UI.tableHTML(E.view(s, 2, started.revealAnswerAt), { now: started.revealAnswerAt });
  assert.match(eagerHTML, /<img class="dx-art"[^>]+loading="eager"/);
  assert.doesNotMatch(eagerHTML, /loading="lazy"/, 'the reveal picture loads eagerly during its short exclusive stage');
});

const pictureIds = html => [...html.matchAll(/data-dx-picture="([^"]+)"/g)].map(match => match[1]);
function votedPictureOrder(s) {
  return s.table.map((id, index) => ({ id, index, count: s.lastRound.rows.filter(row => row.voteCardId === id).length }))
    .filter(picture => picture.id !== s.lastRound.answerCardId && picture.count > 0)
    .sort((left, right) => right.count - left.count || left.index - right.index).map(picture => picture.id);
}

test('the right side includes every voted non-answer in a first-place tie and omits zero-vote pictures', () => {
  const s = finishReveal(startedReveal({ tied: true })), html = htmlFor(s, 2);
  assert.equal(s.lastRound.popularCardIds.length, 3);
  const right = secondaryPart(html), unvoted = s.submissions[4][0];
  assert.match(right, /Voted pictures/); assert.match(right, /1 vote\(s\)/);
  assert.deepEqual(pictureIds(right), votedPictureOrder(s), 'the two non-answer first-place cards follow the original table order');
  assert.equal(pictureIds(right).length, 2);
  assert.ok(!right.includes('data-dx-picture="' + unvoted + '"'));
  assert.ok(!right.includes('data-dx-picture="' + s.lastRound.answerCardId + '"'));
  const gallery = html.slice(html.indexOf('<details class="dx-round-gallery"'));
  assert.ok(gallery.includes('data-dx-picture="' + unvoted + '"'), 'zero-vote pictures remain in the full round gallery');
  for (const id of pictureIds(right)) {
    const row = s.lastRound.rows.find(row => row.cardIds.includes(id));
    const pictureIndex = right.indexOf('data-dx-picture="' + id + '"'), ownerIndex = right.indexOf('Seat ' + row.playerNum);
    assert.ok(ownerIndex >= 0 && ownerIndex < right.indexOf('class="dx-picture"', pictureIndex), 'each voted picture identifies its owner above its artwork');
  }
  const legacy = E.view(s, 2); delete legacy.dixit.revealStage; delete legacy.dixit.revealStartedAt; delete legacy.dixit.revealAnswerAt; delete legacy.dixit.revealPopularAt;
  delete legacy.dixit.result.popularCardIds; delete legacy.dixit.result.maxVotes;
  const legacyHTML = UI.tableHTML(legacy);
  assert.doesNotMatch(legacyHTML, /data-dx-countdown/);
  assert.equal(secondaryPart(legacyHTML), right, 'legacy vote rows produce the same voted-picture group without new ranking metadata');
});

test('everyone finding the answer keeps the answer vote count central and zero-vote pictures in the full gallery', () => {
  const s = scored('all'), html = htmlFor(s, 2), right = secondaryPart(html);
  assert.equal(pictureIds(right).length, 0, 'no zero-vote pictures compete with the central answer');
  assert.ok(!right.includes('data-dx-picture="' + s.lastRound.answerCardId + '"'));
  const gallery = html.slice(html.indexOf('<details class="dx-round-gallery"'));
  for (const row of s.lastRound.rows) for (const id of row.cardIds) assert.ok(gallery.includes('data-dx-picture="' + id + '"'), 'all played pictures remain available for review');
  const centre = html.slice(html.indexOf('class="dx-story-reveal"'), html.indexOf('class="dx-popular-reveal"'));
  assert.match(centre, /3 vote\(s\)/); assert.doesNotMatch(centre, /class="dx-owner"/);
});

test('voted-picture display ranks the actual picture votes and keeps the highest-voted card when nobody finds the answer', () => {
  const s = scored('none'), right = secondaryPart(htmlFor(s, 2));
  assert.deepEqual(pictureIds(right), [s.submissions[2][0], s.submissions[3][0]]);
  assert.match(visibleText(right), /Voted pictures.*2 vote\(s\).*1 vote\(s\)/);
  const firstIndex = right.indexOf('data-dx-picture="' + s.submissions[2][0] + '"');
  assert.ok(right.indexOf('Seat 2') < right.indexOf('class="dx-picture"', firstIndex), 'highest-voted owner appears over the first right-side picture');
  const secondIndex = right.indexOf('data-dx-picture="' + s.submissions[3][0] + '"');
  assert.ok(right.indexOf('Seat 3') < right.indexOf('class="dx-picture"', secondIndex), 'the next picture keeps its own owner metadata');
  const noBallots = E.view(s, 2); noBallots.dixit.result.rows.forEach(row => { row.voteCardId = null; });
  const empty = secondaryPart(UI.tableHTML(noBallots));
  assert.equal(pictureIds(empty).length, 0, 'a legacy empty vote set does not promote unvoted cards into results');
  assert.doesNotMatch(empty, /Second-highest|Tied pictures/);
});

test('a vote-level tie with the answer retains both the highest-voted and other tied non-answer pictures', () => {
  let s = voting(5);
  for (const [seat, owner] of [[2, 1], [3, 2], [4, 2], [5, 3]]) s = act(s, 'vote', seat, { cardId: s.submissions[owner][0] });
  s = finishReveal(act(s, 'reveal'));
  const right = secondaryPart(htmlFor(s, 2));
  assert.deepEqual(pictureIds(right), [s.submissions[2][0], s.submissions[3][0]]);
  assert.match(visibleText(right), /2 vote\(s\).*1 vote\(s\)/);
  assert.ok(!right.includes('data-dx-picture="' + s.lastRound.answerCardId + '"'));
  assert.ok(!right.includes('data-dx-picture="' + s.submissions[4][0] + '"'));
  assert.ok(!right.includes('data-dx-picture="' + s.submissions[5][0] + '"'));
});

test('eight-player results show every positive vote level in descending order and keep tied pictures stable', () => {
  let s = voting(8);
  for (const [seat, owner] of [[2, 1], [3, 1], [4, 1], [5, 2], [6, 2], [7, 3], [8, 4]]) s = act(s, 'vote', seat, { cardId: s.submissions[owner][0] });
  s = finishReveal(act(s, 'reveal'));
  const data = E.view(s, 8), preserved = copy(data), html = UI.tableHTML(data), right = secondaryPart(html);
  assert.deepEqual(pictureIds(right), votedPictureOrder(s)); assert.equal(pictureIds(right).length, 3);
  assert.equal(pictureIds(right)[0], s.submissions[2][0], 'the highest-voted non-answer leads even when the answer has more votes');
  const tiedOrder = s.table.filter(id => [s.submissions[3][0], s.submissions[4][0]].includes(id));
  assert.deepEqual(pictureIds(right).slice(1), tiedOrder, 'one-vote ties retain the revealed table order');
  assert.equal((right.match(/1 vote\(s\)/g) || []).length, 2, 'each lower voted picture carries its own vote count');
  assert.deepEqual(data, preserved, 'rendering never reorders or modifies the canonical result projection');
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

const roundPointsPart = html => html.match(/<aside\b[^>]*\bdata-dx-round-scores(?:="[^"]*")?[^>]*>[\s\S]*?<\/aside>/)?.[0] || '';
const unusableScoreStorage = {
  getItem() { throw new Error('Round points must not depend on popup storage'); },
  setItem() { throw new Error('Round points must not record popup display state'); },
};

test('all-player round points stay beside the revealed pictures through time, heartbeats and refresh without a popup', () => {
  const s = finishReveal(startedReveal()), data = E.view(s, 1);
  data.dixit.result.revealedAt = 30000;
  let now = 30000;
  const h = harness(data, { now: () => now }, { sessionStorage: unusableScoreStorage });
  try {
    const points = roundPointsPart(h.element.innerHTML);
    assert.ok(points.includes(UI.esc(UI.t('roundGain'))));
    assert.equal((points.match(/data-dx-score-player=/g) || []).length, 4);
    for (const row of data.dixit.result.rows) {
      assert.ok(points.includes('data-dx-score-player="' + row.playerNum + '"'));
      assert.ok(points.includes('Seat ' + row.playerNum));
      assert.ok(points.includes('aria-label="Round gain">' + (row.delta ? '+' : '') + row.delta + '</strong>'));
    }
    assert.match(points, />0<\/strong>/, 'zero-point players remain visible');
    assert.doesNotMatch(points, />\+0|>-0|>\+-|aria-modal|role="dialog"|Total|Base|Bonus/);
    const revealArea = h.element.innerHTML.match(/<section\b[^>]*data-dx-reveal-stage="popular"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(revealArea.includes(points), 'round points participate in the reveal layout beside its card area');
    assert.doesNotMatch(points, /data-dx-picture|class="dx-art"/, 'the points panel does not contain or replace the artwork');
    assert.equal(h.element.querySelector('[data-dx-action="nextRound"]').disabled, false);
    const heartbeat = copy(data); heartbeat.dixit.revision = 999; heartbeat.dixit.hostLiveUntil = 90000;
    for (const at of [30699, 30700, 35699, 35700, 60000, 3600000]) {
      now = at; h.card.update(heartbeat); h.card.paint();
      assert.equal(roundPointsPart(h.element.innerHTML), points, 'points persist at ' + at + ' until the next round');
      assert.doesNotMatch(h.element.innerHTML, /data-dx-score-popup|data-dx-dismiss-score|dx-score-popup-layer/);
      assert.match(h.element.innerHTML, /data-dx-reveal-stage="popular"/); assert.match(h.element.innerHTML, /data-dx-picture=/);
    }
    const refreshed = harness(heartbeat, { now: () => now }, { sessionStorage: unusableScoreStorage });
    try { assert.equal(roundPointsPart(refreshed.element.innerHTML), points, 'refresh retains the revealed round points'); }
    finally { refreshed.card.destroy(); }
    assert.equal(h.sent.length, 0, 'displaying points never changes the game');
  } finally { h.card.destroy(); }
});

test('compact round points explain only awarded points and keep zero-point players to their name and zero', () => {
  const expected = {
    some: {
      1: ['Some, not all, found your card +3'],
      2: ['Correct guess +3', '2 votes for your card +2'],
      3: [], 4: [],
    },
    all: {
      1: [], 2: ['Everyone guessed right +2'], 3: ['Everyone guessed right +2'], 4: ['Everyone guessed right +2'],
    },
    none: {
      1: [],
      2: ['Nobody guessed right +2', '2 votes for your card +2'],
      3: ['Nobody guessed right +2', '1 vote for your card +1'],
      4: ['Nobody guessed right +2'],
    },
  };
  for (const outcome of ['some', 'all', 'none']) {
    const s = scored(outcome), points = roundPointsPart(htmlFor(s, 2)), players = scorePlayerParts(points);
    assert.equal(players.size, 4);
    assert.doesNotMatch(visibleText(points), /Total|Base|Bonus|0 votes|\+0/, 'left points list only this round and positive reasons');
    for (const row of s.lastRound.rows) {
      const text = visibleText(players.get(row.playerNum) || '');
      const reasons = expected[outcome][row.playerNum];
      assert.equal(text, 'Seat ' + row.playerNum + ' ' + (row.delta ? '+' : '') + row.delta + (reasons.length ? ' ' + reasons.join(' ') : ''), 'compact awarded points for ' + outcome + ' / Seat ' + row.playerNum);
      for (const other of s.roster.filter(player => player.playerNum !== row.playerNum)) assert.ok(!text.includes(other.name), 'no voter names are listed under a player’s points');
    }
  }
});

test('round explanations use awarded deltas rather than accumulated totals and preserve uncapped vote bonuses', () => {
  let s = voting(8);
  s.scores = Object.fromEntries(s.roster.map(player => [player.playerNum, 10 + player.playerNum]));
  for (let seat = 2; seat <= 8; seat++) s = act(s, 'vote', seat, { cardId: seat === 2 ? s.submissions[1][0] : s.submissions[2][0] });
  s = finishReveal(act(s, 'reveal'));
  const html = htmlFor(s, 2), points = roundPointsPart(html), players = scorePlayerParts(points), row = s.lastRound.rows.find(row => row.playerNum === 2);
  assert.equal(row.bonus, 6); assert.equal(row.delta, 9); assert.equal(row.score, 21);
  assert.equal(visibleText(players.get(2)), 'Seat 2 +9 Correct guess +3 6 votes for your card +6');
  assert.doesNotMatch(points, /Total|Base|Bonus|>21<|>\+21</);
  const totals = html.slice(html.indexOf('data-dx-details'));
  assert.match(totals, /Seat 2<\/span><strong>21<\/strong>/, 'accumulated totals stay in Players and scores below the cards');
});

test('three-player double submissions combine vote bonuses while ranking each individual picture separately', () => {
  let s = voting(3);
  s = act(s, 'vote', 2, { cardId: s.submissions[3][0] });
  s = act(s, 'vote', 3, { cardId: s.submissions[2][1] });
  s = finishReveal(act(s, 'reveal'));
  const html = htmlFor(s, 2), points = roundPointsPart(html), players = scorePlayerParts(points), right = secondaryPart(html);
  assert.equal(s.table.length, 5);
  assert.equal(visibleText(players.get(1)), 'Seat 1 0');
  for (const seat of [2, 3]) assert.equal(visibleText(players.get(seat)), 'Seat ' + seat + ' +3 Nobody guessed right +2 1 vote for your card +1');
  assert.match(right, /1 vote\(s\)/); assert.deepEqual(pictureIds(right), votedPictureOrder(s));
  for (const [seat, cardIndex] of [[2, 1], [3, 0]]) assert.ok(right.includes('data-dx-picture="' + s.submissions[seat][cardIndex] + '"'), 'each actually voted individual card appears');
  for (const [seat, cardIndex] of [[2, 0], [3, 1]]) assert.ok(!right.includes('data-dx-picture="' + s.submissions[seat][cardIndex] + '"'), 'unvoted double-submission cards stay out of the focus');
  assert.ok(!right.includes('data-dx-picture="' + s.lastRound.answerCardId + '"'), 'the central answer is not repeated');
});

test('legacy object-shaped score rows retain the same concise reasons and every voted picture', () => {
  const s = scored('none'), data = E.view(s, 2), original = UI.tableHTML(data);
  data.dixit.result.rows = Object.fromEntries(data.dixit.result.rows.map((row, i) => [i, row]));
  for (const key of ['popularCardIds', 'maxVotes', 'revealedAt']) delete data.dixit.result[key];
  for (const key of ['revealStage', 'revealStartedAt', 'revealAnswerAt', 'revealPopularAt']) delete data.dixit[key];
  const restored = UI.tableHTML(data);
  assert.equal(roundPointsPart(restored), roundPointsPart(original));
  assert.equal(secondaryPart(restored), secondaryPart(original));
  assert.doesNotMatch(restored, /data-dx-countdown/);
});

test('player totals start expanded and preserve manual collapse while round points and review details repaint', () => {
  const s = scored('none'), data = E.view(s, 1);
  const h = harness(data);
  try {
    assert.match(h.element.innerHTML, /data-dx-round-scores/);
    assert.equal(h.element.querySelector('[data-dx-details]').open, true, 'the score section starts expanded');
    assert.equal(h.element.querySelector('[data-dx-result-details]').open, false, 'the detailed vote review starts collapsed');
    h.element.querySelector('[data-dx-result-details]').open = true;
    h.element.querySelector('[data-dx-details]').open = false;
    h.card.render(); h.card.paint(); h.card.update(data);
    assert.equal(h.element.querySelector('[data-dx-result-details]').open, true);
    assert.equal(h.element.querySelector('[data-dx-details]').open, false, 'a paint does not undo the player’s collapse');
    assert.equal(h.element.querySelector('[data-dx-action="nextRound"]').disabled, false);
    const changedName = copy(data); changedName.dixit.roster[1].name = 'New name'; h.card.update(changedName);
    assert.equal(h.element.querySelector('[data-dx-result-details]').open, true);
    assert.equal(h.element.querySelector('[data-dx-details]').open, false, 'a synchronization repaint retains the collapse');
    assert.match(roundPointsPart(h.element.innerHTML), /New name/);
    h.element.querySelector('[data-dx-details]').open = true; h.card.render();
    assert.equal(h.element.querySelector('[data-dx-details]').open, true, 'manual expansion is retained as well');
    assert.equal(h.sent.length, 0);
  } finally { h.card.destroy(); }
});

test('finished games and older completed reveals always keep their final round points available', () => {
  for (const phase of ['REVEAL', 'FINISHED']) {
    for (const at of [30000, undefined]) {
      const data = E.view(scored(), 2); data.dixit.phase = phase;
      if (at === undefined) delete data.dixit.result.revealedAt; else data.dixit.result.revealedAt = at;
      const h = harness(data, { now: () => 3600000 }, { sessionStorage: unusableScoreStorage });
      try {
        assert.match(h.element.innerHTML, /data-dx-round-scores/); assert.match(h.element.innerHTML, /data-dx-result-details/);
        assert.doesNotMatch(h.element.innerHTML, /data-dx-score-popup|data-dx-dismiss-score/);
        assert.equal(h.element.querySelector('[data-dx-details]').open, true);
        if (phase === 'FINISHED') noActions(h.element.innerHTML, ['nextRound']);
      } finally { h.card.destroy(); }
    }
  }
});

test('round points cannot appear before the complete reveal even if a stale result or popup flag is supplied', () => {
  const started = startedReveal(), answer = act(started, 'advanceReveal', 0, { now: started.revealAnswerAt });
  const priorResult = E.view(scored(), 2).dixit.result;
  for (const s of [create(), dealt(), submitted(), voting(), started, answer, act(dealt(), 'cancel')]) {
    const data = E.view(s, 2); data.dixit.result = copy(priorResult);
    const html = UI.tableHTML(data, { now: s.revealAnswerAt || 10000, scorePopup: true });
    assert.doesNotMatch(html, /data-dx-round-scores|data-dx-score-player|data-dx-score-popup|data-dx-result-details/, 'no old or premature points in ' + s.phase);
    if (s.phase === 'REVEALING') assert.doesNotMatch(html, /vote\(s\)/, 'votes stay secret until the complete reveal');
  }
});

test('entering the next round or restarting removes the previous round points from the live card', () => {
  const s = scored(), h = harness(E.view(s, 1));
  try {
    assert.match(h.element.innerHTML, /data-dx-round-scores/);
    const next = act(s, 'nextRound'); h.card.update(E.view(next, 1));
    assert.doesNotMatch(h.element.innerHTML, /data-dx-round-scores|data-dx-score-player|data-dx-result-details/);
    assert.match(h.element.innerHTML, /data-dx-phase="CLUE"/);
    h.card.update(E.view(s, 1)); assert.match(h.element.innerHTML, /data-dx-round-scores/);
    h.card.update(E.view(act(s, 'restart'), 1));
    assert.doesNotMatch(h.element.innerHTML, /data-dx-round-scores|data-dx-score-player|data-dx-result-details/);
    assert.match(h.element.innerHTML, /data-dx-phase="LOBBY"/);
    assert.equal(h.sent.length, 0);
  } finally { h.card.destroy(); }
});

test('card groups lead expanded player totals and full round points also remain available in a collapsed review', () => {
  for (const s of [create(), dealt(), voting(), scored()]) {
    const html = htmlFor(s, 2);
    if (html.includes('data-dx-picture=')) assert.ok(html.indexOf('data-dx-picture=') < html.indexOf('data-dx-details'), 'pictures precede player totals');
    const totalsTag = html.match(/<details\b[^>]*\bdata-dx-details[^>]*>/)?.[0] || '';
    assert.match(totalsTag, /\sopen(?:\s|>)/, 'player totals are expanded by default in ' + s.phase);
    assert.doesNotMatch(html, /<header|<h1>Dixit<\/h1>|Round \d+ · Storyteller:|class="dx-identity"|class="dx-spoken"/);
  }
  const html = htmlFor(scored('none'), 2);
  const centre = html.slice(html.indexOf('class="dx-story-reveal"'), html.indexOf('class="dx-popular-reveal"'));
  assert.match(centre, /<h2>The Storyteller’s card <span class=\"dx-voters-count\">0 vote\(s\)<\/span><\/h2>/);
  assert.match(html, /<details class="dx-panel dx-result" data-dx-result-details>/);
  assert.ok(html.indexOf('data-dx-result-details') < html.indexOf('data-dx-details'));
});

test('the host sets a score target in the same deal action and a readiness repaint retains the unsaved value', async () => {
  const s = create(), data = E.view(s, 1), h = harness(data);
  try {
    assert.equal(h.element.querySelector('[data-dx-target-score]').value, '30');
    h.element.querySelector('[data-dx-target-score]').value = '12';
    const ready = act(s, 'ready', 2, { value: true }); h.card.update(E.view(ready, 1));
    assert.equal(h.element.querySelector('[data-dx-target-score]').value, '12');
    h.card.render(); assert.equal(h.element.querySelector('[data-dx-target-score]').value, '12');
    h.element.querySelector('[data-dx-first]').value = '2';
    await h.click('[data-dx-action="deal"]');
    assert.equal(h.sent.length, 1); assert.equal(h.sent[0].targetScore, 12); assert.equal(h.sent[0].firstPlayerNum, 2);
    const started = act(ready, 'deal', 1, h.sent[0]); assert.equal(started.targetScore, 12); h.card.update(E.view(started, 1));
    assert.equal(h.card.pending, null); assert.match(h.element.innerHTML, /Reach 12; highest score wins/);
    assert.match(h.element.innerHTML, /End after a round with a score of 12 or more/); assert.match(h.element.innerHTML, /custom variation/);
  } finally { h.card.destroy(); }
  assert.doesNotMatch(htmlFor(s, 2), /data-dx-target-score/);
});

test('invalid target drafts send no deal and give a readable validation instruction', async () => {
  const h = harness(E.view(create(), 1));
  try {
    for (const value of ['', '4', '101', '12.5']) {
      h.element.querySelector('[data-dx-target-score]').value = value;
      await h.click('[data-dx-action="deal"]'); assert.equal(h.sent.length, 0); assert.equal(h.card.pending, null);
      assert.match(h.element.querySelector('[data-dx-message]').textContent, /whole-number score target from 5 to 100/);
      assert.equal(h.element.querySelector('[data-dx-target-score]').value, value, 'the draft remains editable');
    }
  } finally { h.card.destroy(); }
  assert.equal(UI.errorText('invalid_target_score'), UI.t('invalidTarget'));
});

test('eight-player round side panels include every player and bring the viewing player first without changing result order', () => {
  let s = voting(8);
  for (let seat = 2; seat <= 8; seat++) s = act(s, 'vote', seat, { cardId: s.submissions[1][0] });
  s = finishReveal(act(s, 'reveal', 1, { now: 10000 }));
  const data = E.view(s, 8), canonicalOrder = data.dixit.result.rows.map(row => row.playerNum);
  data.dixit.result.revealedAt = 30000;
  const h = harness(data, { now: () => 31000 });
  try {
    const points = roundPointsPart(h.element.innerHTML);
    assert.equal((points.match(/data-dx-score-player=/g) || []).length, 8);
    assert.match(points, /class="dx-score-change is-me" data-dx-score-player="8"/);
    assert.equal(points.match(/data-dx-score-player="(\d+)"/)[1], '8');
    assert.deepEqual(data.dixit.result.rows.map(row => row.playerNum), canonicalOrder);
  } finally { h.card.destroy(); }
});

test('a submitted action remains pending beyond fifteen seconds and clears only when the resumed host acknowledges it', async () => {
  const s = dealt(); let now = 3000;
  const h = harness(E.view(s, 1), { now: () => now });
  try {
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]'); await h.click('[data-dx-action="story"]');
    const command = copy(h.sent[0]);
    now = 20000; h.timers.get(h.card.pendingTimer)();
    assert.equal(h.card.pending.id, command.id); assert.equal(h.card.pendingWaiting, true);
    assert.equal(h.card.error, ''); assert.equal(h.card.errorCode, '');
    assert.match(h.element.querySelector('[data-dx-message]').textContent, /Action sent\. Waiting for game sync to resume/);
    assert.doesNotMatch(h.element.querySelector('[data-dx-message]').textContent, /Could not send/);
    await h.click('[data-dx-action="story"]'); assert.equal(h.sent.length, 1, 'waiting never overwrites or duplicates the mailbox');
    const unrelated = E.view(s, 1); unrelated.dixit.reply = { id: 'previous-action', error: '' }; h.card.update(unrelated);
    assert.equal(h.card.pending.id, command.id);
    const accepted = act(s, 'story', 1, command); h.card.update(E.view(accepted, 1));
    assert.equal(h.card.pending, null); assert.equal(h.card.pendingWaiting, false); assert.equal(h.card.error, '');
    assert.equal(h.card.selected.size, 0); assert.match(h.element.innerHTML, /Secret card selection/);
  } finally { h.card.destroy(); }
  assert.equal(h.timers.size, 0);
});

test('refresh restores an unacknowledged private mailbox without resending and drops it on a receipt or stale turn', async () => {
  const s = dealt(), original = harness(E.view(s, 1)); let queued;
  try {
    await original.click('[data-dx-card="' + s.hands[1][0] + '"]'); await original.click('[data-dx-action="story"]');
    queued = E.view(s, 1); queued.dixitAction = copy(original.sent[0]);
  } finally { original.card.destroy(); }
  const refreshed = harness(queued);
  try {
    assert.equal(refreshed.card.pending.id, queued.dixitAction.id); assert.equal(refreshed.card.pendingWaiting, true);
    assert.equal(refreshed.element.querySelector('[data-dx-action="story"]').disabled, true);
    await refreshed.click('[data-dx-card="' + s.hands[1][1] + '"]'); await refreshed.click('[data-dx-action="story"]');
    refreshed.card.update(queued); assert.equal(refreshed.sent.length, 0);
    const accepted = act(s, 'story', 1, queued.dixitAction), receipt = E.view(accepted, 1); receipt.dixitAction = queued.dixitAction;
    refreshed.card.update(receipt); assert.equal(refreshed.card.pending, null); assert.equal(refreshed.card.pendingWaiting, false);
    assert.equal(refreshed.sent.length, 0, 'restoring a request reads the mailbox rather than publishing it again');
  } finally { refreshed.card.destroy(); }
  const stale = harness(queued);
  try {
    const next = E.view(act(s, 'pause', 1), 1); next.dixitAction = queued.dixitAction;
    stale.card.update(next); assert.equal(stale.card.pending, null); assert.equal(stale.card.pendingWaiting, false);
    const restarted = E.view(act(s, 'restart', 1), 1); restarted.dixitAction = queued.dixitAction;
    stale.card.update(restarted); assert.equal(stale.card.pending, null); assert.equal(stale.sent.length, 0);
  } finally { stale.card.destroy(); }
  const alreadyAcknowledged = copy(queued); alreadyAcknowledged.dixit.reply = { id: queued.dixitAction.id, error: '' };
  const done = harness(alreadyAcknowledged);
  try { assert.equal(done.card.pending, null); assert.equal(done.sent.length, 0); }
  finally { done.card.destroy(); }
  const publicView = harness(queued, { host: true });
  try { assert.equal(publicView.card.pending, null, 'the shared screen never adopts a player mailbox'); }
  finally { publicView.card.destroy(); }
});

test('card submission phase lists every player status and clears before voting', () => {
  const rows = html => new Map([...html.matchAll(/<div\b[^>]*\bdata-dx-submit-player="(\d+)"[^>]*>[\s\S]*?<\/div>/g)]
    .map(match => [Number(match[1]), { state: match[0].match(/data-dx-submit-state="([^"]+)"/)?.[1], text: visibleText(match[0]) }]));
  let s = submitted();
  let html = htmlFor(s, 3), statuses = rows(html);
  assert.match(html, /data-dx-submit-statuses[^>]*role="list"|role="list"[^>]*data-dx-submit-statuses/);
  assert.ok(html.indexOf('data-dx-submit-statuses') < html.indexOf('data-dx-message'), 'the status list belongs to the phase bar');
  assert.equal(statuses.get(1).state, 'storyteller');
  for (const seat of [2, 3, 4]) assert.equal(statuses.get(seat).state, 'waiting');
  s = act(s, 'submit', 2, { cardIds: s.hands[2].slice(0, 1) });
  html = htmlFor(s, 3); statuses = rows(html);
  assert.equal(statuses.get(2).state, 'submitted'); assert.equal(statuses.get(3).state, 'waiting');
  assert.match(html, /Cards submitted: 1 \/ 3/);
  for (const row of statuses.values()) for (const id of s.submissions[2] || []) assert.ok(!row.text.includes(id), 'statuses never reveal submitted cards');
  assert.doesNotMatch(htmlFor(voting(), 2), /data-dx-submit-statuses|data-dx-submit-player/, 'submit statuses do not persist into voting');
});

test('revealed vote counts expand to name every voter for that card, never before the full reveal', () => {
  let s = voting();
  const answer = s.submissions[1][0], decoy = s.submissions[2][0];
  s = act(s, 'vote', 2, { cardId: answer }); s = act(s, 'vote', 3, { cardId: decoy }); s = act(s, 'vote', 4, { cardId: decoy });
  assert.doesNotMatch(htmlFor(s, 3), /data-dx-voters/, 'no voter lists while voting');
  s = act(s, 'reveal', 0); s = act(s, 'advanceReveal', 0, { now: Number.MAX_SAFE_INTEGER });
  const html = htmlFor(s, 3);
  const block = id => [...html.matchAll(/<span class="dx-voters" data-dx-voters="([a-z]+):([^"]+)">[\s\S]*?<\/span><\/span>/g)].filter(m => m[2] === id).map(m => visibleText(m[0]));
  assert.ok(block(answer).some(text => text === '1 vote(s) by: Seat 2'));
  assert.ok(block(decoy).some(text => text === '2 vote(s) by: Seat 3, Seat 4'));
});
