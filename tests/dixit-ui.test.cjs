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
  return act(s, 'story', 1, { cardId: s.hands[1][0], clue: 'The moon keeps a secret.' });
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
  return act(s, 'reveal');
}
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
    noActions(htmlFor(s, 1), ['deal', 'reveal', 'nextRound', 'pause', 'restart']);
  }
  const s = submitted(3), [first, second] = s.hands[2];
  assert.match(htmlFor(s, 2), /Choose 2 picture card/);
  assert.equal(action(htmlFor(s, 2, { selected: new Set([first]) }), 'submit').disabled, true);
  assert.equal(action(htmlFor(s, 2, { selected: new Set([first, second]) }), 'submit').disabled, false);
  assert.equal(action(htmlFor(s, 2, { selected: new Set(s.hands[2].slice(0, 3)) }), 'submit').disabled, true);
});

test('story clue requires a selected card and either text or an explicit spoken clue', () => {
  const s = dealt(), id = s.hands[1][0];
  assert.equal(action(htmlFor(s, 1, { clue: 'a river' }), 'story').disabled, true);
  assert.equal(action(htmlFor(s, 1, { selected: new Set([id]), clue: '  ' }), 'story').disabled, true);
  assert.equal(action(htmlFor(s, 1, { selected: new Set([id]), clue: 'a river' }), 'story').disabled, false);
  assert.equal(action(htmlFor(s, 1, { selected: new Set([id]), spoken: true }), 'story').disabled, false);
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
  s = act(s, 'reveal');
  assert.equal(s.phase, 'FINISHED'); assert.match(htmlFor(s), /Shared winners: Seat 1, Seat 2/);
  noActions(htmlFor(s), ['nextRound', 'deal', 'pause', 'cancel']);
  assert.doesNotMatch(htmlFor(s, 2), /dx-hand/);
  const cancelled = act(dealt(), 'cancel');
  assert.match(htmlFor(cancelled), /Game cancelled/); assert.doesNotMatch(htmlFor(cancelled, 2), /dx-hand|data-dx-card=/);
});

test('names, clues, image descriptions and input values are escaped, and errors use user-facing wording', () => {
  let s = submitted();
  const hostile = '<img src=x onerror="alert(1)"> & \'\"';
  s.roster[0].name = hostile; s.clue = hostile;
  const html = htmlFor(s, 2);
  assert.ok(html.includes(UI.esc(hostile))); assert.doesNotMatch(html, /<img|onerror="alert/);
  const input = htmlFor(dealt(), 1, { clue: hostile });
  assert.ok(input.includes('value="' + UI.esc(hostile) + '"'));
  const context = { DIXIT_DECK: { cards: [{ description: hostile, image: 'assets/dixit/atlas-1.png' }] } };
  vm.runInNewContext(source, context);
  const picture = context.DIXIT_UI.cardHTML('d001', 1);
  assert.ok(picture.includes('aria-label="' + UI.esc(hostile) + '"')); assert.doesNotMatch(picture, /<img|onerror="alert/);
  assert.equal(UI.errorText('stale_turn'), UI.t('stale')); assert.equal(UI.errorText('stale_session'), UI.t('stale'));
  assert.equal(UI.errorText('paused'), UI.t('paused')); assert.equal(UI.errorText('offline'), UI.t('failed'));
  assert.equal(UI.errorText('invalid_card'), UI.t('invalid')); assert.doesNotMatch(UI.errorText('invalid_card'), /invalid_card/);
  assert.match(UI.rulesHTML(), /84 original illustrations|unofficial adaptation/i);
});

// Small DOM double retains live disabled flags, datasets and form inputs.
// It drives the real Card event handler rather than copying its decisions.
class ElementDouble {
  constructor() { this.listeners = new Map(); this.ownerDocument = { activeElement: null }; this.nodes = []; this._html = ''; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type) { this.listeners.delete(type); }
  set innerHTML(html) {
    this._html = html; this.nodes = [];
    for (const tag of html.match(/<(?:button|input|select|details|span|p)\b[^>]*>/g) || []) {
      const dataset = {};
      for (const attr of tag.matchAll(/data-dx-([\w-]+)(?:="([^"]*)")?/g)) dataset['dx' + attr[1].split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')] = attr[2] || '';
      const node = { dataset, disabled: /\sdisabled(?:\s|>)/.test(tag), value: tag.match(/\bvalue="([^"]*)"/)?.[1] || '',
        checked: /\schecked(?:\s|>)/.test(tag), open: false, textContent: '',
        matches(selector) { return selector.startsWith('[data-dx-') && Object.hasOwn(this.dataset, selector.slice(9, -1).split('-').map((part, i) => i ? part[0].toUpperCase() + part.slice(1) : 'dx' + part[0].toUpperCase() + part.slice(1)).join('')); },
        closest(selector) { return this.matches(selector) ? this : null; } };
      this.nodes.push(node);
    }
  }
  get innerHTML() { return this._html; }
  querySelector(selector) {
    const exact = selector.match(/^\[data-dx-([\w-]+)="([^"]+)"\]$/);
    if (exact) {
      const key = 'dx' + exact[1].split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
      return this.nodes.find(node => node.dataset[key] === exact[2]) || null;
    }
    if (selector.startsWith('.')) return null;
    return this.nodes.find(node => node.matches(selector)) || null;
  }
  querySelectorAll(selector) { return this.nodes.filter(node => selector.split(',').some(part => node.matches(part))); }
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
    input(selector, value) { const target = element.querySelector(selector); assert.ok(target); target.value = value; card.input({ target }); },
  };
}

test('changing language repaints the same player projection and preserves the selected card and clue', async () => {
  let locale = 'en';
  const dictionaries = new Map(), I18N = {
    registerDict(namespace, dictionary) { dictionaries.set(namespace, dictionary); },
    t(namespace, key) { return dictionaries.get(namespace)?.[key]?.[locale] || key; },
  };
  const s = dealt(), projection = E.view(s, 1), h = harness(projection, {}, { I18N });
  try {
    const id = s.hands[1][0];
    await h.click('[data-dx-card="' + id + '"]'); h.input('[data-dx-clue]', 'Stars at noon');
    assert.match(h.element.innerHTML, /Your hand/);
    locale = 'zh'; h.card.update(projection);
    assert.match(h.element.innerHTML, /你的手牌/); assert.match(h.element.innerHTML, /確認圖卡與提示/);
    assert.doesNotMatch(h.element.innerHTML, />Your hand</);
    assert.deepEqual([...h.card.selected], [id]); assert.equal(h.card.clue, 'Stars at noon');
    assert.equal(h.element.querySelector('[data-dx-clue]').value, 'Stars at noon');
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    locale = 'en'; h.card.update(projection);
    assert.match(h.element.innerHTML, /Your hand/); assert.match(h.element.innerHTML, /Send card and clue/);
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

test('story submission preserves selected card and trimmed clue; reconnect never enables an empty clue', async () => {
  const s = dealt(); let connected = true;
  const h = harness(E.view(s, 1), { connected: () => connected });
  try {
    await h.click('[data-dx-card="' + s.hands[1][0] + '"]');
    h.input('[data-dx-clue]', '  Stars at noon  ');
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, false);
    connected = false; h.card.paint(); h.input('[data-dx-clue]', '');
    connected = true; h.card.paint();
    assert.equal(h.element.querySelector('[data-dx-action="story"]').disabled, true);
    h.input('[data-dx-clue]', '  Stars at noon  '); await h.click('[data-dx-action="story"]');
    assert.equal(h.sent[0].cardId, s.hands[1][0]); assert.equal(h.sent[0].clue, 'Stars at noon');
    const next = act(s, 'story', 1, h.sent[0]); h.card.update(E.view(next, 1));
    assert.equal(h.card.pending, null); assert.equal(h.card.selected.size, 0); assert.equal(h.card.clue, '');
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
