'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../bluff-king-engine.js');
const cardsPath = require('node:path').resolve(__dirname, '../bluff-king-cards.js');
const clone = value => JSON.parse(JSON.stringify(value));
const bank = Array.from({ length: 12 }, (_, i) => ({ id: `ui-test-${i}`, canonicalKnowledgeId: `ui-test-knowledge-${i}`, locale: 'en', term: `Test term ${i}`, publicPrompt: 'What does this mean?', hintMode: 'choices', publicHints: ['Nature', 'Music', 'Food'], secretAnswer: `PRIVATE_TEST_ANSWER_${i}`, supportingFacts: ['Private fact one', 'Private fact two'], revealExplanation: 'Only a test fixture.', sources: [{ title: 'Test source', url: 'https://example.invalid/test' }], verificationStatus: 'verified', verifiedAt: '2026-10-06', enabled: true }));
let serial = 0;
const options = { now: 1000, rng: () => 0, uuid: () => 'ui-seat-' + (++serial) };
function fixture(phase = 'discussion', count = 3) {
  const state = E.blankStore();
  E.applyCommand(state, 'identity-0', { room: 'UITEST', action: 'create', name: 'Alex', participate: true }, bank, options);
  for (let i = 1; i < count; i++) E.applyCommand(state, 'identity-' + i, { room: 'UITEST', action: 'join', name: 'Player ' + i, participate: true }, bank, options);
  if (phase !== 'lobby') act(state, 'start');
  if (['prepare', 'discussion', 'reveal', 'results'].includes(phase)) act(state, 'confirmTopic');
  if (['discussion', 'reveal', 'results'].includes(phase)) act(state, 'beginDiscussion');
  return state;
}
function act(state, action, identityId = 'identity-0', payload = {}) {
  const room = state.rooms.UITEST;
  E.applyCommand(state, identityId, { room: 'UITEST', action, commandId: 'ui-command-' + (++serial), expectedVersion: room.version, roundId: room.round?.id, ...payload }, bank, options);
}
const project = (state, identityId = 'identity-0') => E.projectView(state, identityId, 'UITEST', bank, { private: true, now: 1000 });
class NodeDouble {
  constructor(document, id = '') { this.document = document; this.id = id; this.listeners = new Map(); this.dataset = {}; this.value = ''; this.checked = false; this.disabled = false; this.hidden = false; this.open = false; this.textContent = ''; this.classes = new Set(); this.classList = { toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name) }; this._html = ''; }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  focus() { this.document.activeElement = this; }
  closest(selector) { return selector === '[data-bk-action]' && this.dataset.bkAction ? this : null; }
  showModal() { this.open = true; }
  close() { this.open = false; this.listeners.get('close')?.(); }
  set innerHTML(value) {
    this._html = value;
    if (!this.id) return;
    const previousIds = this.document.dynamicIdsByContainer.get(this.id) || new Set();
    for (const id of previousIds) this.document.nodes.delete(id);
    const ids = new Set(), buttons = [];
    for (const tag of value.match(/<(?:button|input|select|details|span|p|a|div)\b[^>]*>/g) || []) {
      const id = tag.match(/\bid="([^"]+)"/)?.[1] || '';
      const node = new NodeDouble(this.document, id);
      node.containerId = this.id;
      node.disabled = /\sdisabled(?:\s|>)/.test(tag); node.checked = /\schecked(?:\s|>)/.test(tag); node.open = /\sopen(?:\s|>)/.test(tag); node.hidden = /\shidden(?:\s|>)/.test(tag); node.value = tag.match(/\bvalue="([^"]*)"/)?.[1] || '';
      for (const m of tag.matchAll(/data-bk-([\w-]+)="([^"]*)"/g)) node.dataset['bk' + m[1].split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('')] = m[2];
      if (id) { this.document.nodes.set(id, node); ids.add(id); }
      if (node.dataset.bkAction) buttons.push(node);
    }
    this.document.dynamicIdsByContainer.set(this.id, ids);
    this.document.buttonsByContainer.set(this.id, buttons);
    this.document.buttons = [...this.document.buttonsByContainer.values()].flat();
  }
  get innerHTML() { return this._html; }
}
async function harness(initialView, { card = false, setup = null, hash = '', transport = {} } = {}) {
  const nodes = new Map(), document = { nodes, dynamicIdsByContainer: new Map(), buttonsByContainer: new Map(), buttons: [], activeElement: null, listeners: new Map(), addEventListener(type, fn) { this.listeners.set(type, fn); }, getElementById(id) { return nodes.get(id) || null; }, createElement() { return new NodeDouble(this); } };
  const pageHTML = fs.readFileSync(require.resolve('../bluff-king-live-chat.html'), 'utf8');
  const fixedIds = [...pageHTML.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of new Set([...fixedIds, 'bk-app', 'bk-rule-copy', 'bk-room-label', 'bk-connection', 'bk-error', 'bk-confirm', 'bk-confirm-title', 'bk-confirm-text', 'bk-confirm-send', 'room-mount'])) nodes.set(id, new NodeDouble(document, id));
  document.body = new NodeDouble(document); document.head = { append: script => queueMicrotask(() => script.onload?.()) };
  const dictionary = new Map(), storage = new Map(), sent = [], creates = [], cardCreates = [], cardConnections = [], joins = [], connections = [], publications = [], loadedScripts = [], intervals = [], statuses = [];
  if (setup) { storage.set('room-last-session', setup.code); storage.set('room-session-' + setup.code, JSON.stringify(setup)); }
  let transportOptions;
  const context = { document, location: { href: 'https://example.test/bluff-king-live-chat.html?room=UITEST' + (card ? '&card=1' : '') + hash, origin: 'https://example.test', search: '?room=UITEST' + (card ? '&card=1' : ''), hash }, URL, URLSearchParams, crypto, Uint8Array, Promise, queueMicrotask, Date, navigator: { clipboard: { writeText: async () => {} } }, prompt() {}, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }, I18N: { lang: 'en', registerDict: (name, dict) => dictionary.set(name, dict), t: (name, key) => dictionary.get(name)?.[key]?.en || key, onChange() {} }, FIREBASE_CONFIG: { databaseURL: 'https://test.firebaseio.com' }, BLUFF_ENGINE: E, BLUFF_QUESTIONS: bank, setInterval: fn => (intervals.push(fn), intervals.length), addEventListener() {}, BLUFF_SYNC: { Client: class {
    constructor(opts) { transportOptions = opts; }
    async connect(...args) { connections.push(args); if (transport.connectError) throw transport.connectError; if (initialView) transportOptions.onView(clone(initialView)); transportOptions.onStatus('hosting'); return initialView; }
    async refresh() { return initialView; }
    async command(input) { sent.push(clone(input)); return initialView; }
    async create(code, settings) { creates.push({ code, ...settings }); return initialView; }
    async createFromCards(code, settings) { cardCreates.push({ code, setup: clone(settings) }); const next = transport.createdView || initialView; if (next) transportOptions.onView(clone(next)); return next; }
    async getCardSessions() { return clone(transport.sessions || []); }
    async connectCard(code, credential) { cardConnections.push({ code, credential: clone(credential) }); if (transport.cardError) throw transport.cardError; if (initialView) transportOptions.onView(clone(initialView)); transportOptions.onStatus('connected'); return initialView; }
    async join(...args) { joins.push(args); return initialView; }
    close() {}
  } } };
  if (fs.existsSync(cardsPath)) context.BLUFF_CARDS = require(cardsPath);
  if (setup) context.ROOM = { enabled: true, code: setup.code, count: setup.playerCount, init() {}, name: i => setup.names[i], publish: fn => { publications.push(setup.tokens.slice(0, setup.playerCount).map((_, i) => clone(fn(i)))); } };
  document.head = { append: script => { loadedScripts.push(script.src); queueMicrotask(() => script.onload?.()); } };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(require.resolve('../bluff-king-ui.js'), 'utf8'), context);
  for (let i = 0; i < 40; i++) await Promise.resolve();
  async function click(action, targetId) {
    const button = document.buttons.find(b => b.dataset.bkAction === action && (!targetId || b.dataset.bkTarget === targetId));
    assert.ok(button, action + ' exists');
    const container = button.containerId === 'bk-picker-list' ? 'bk-picker' : button.containerId === 'bk-management-content' ? 'bk-manage' : button.containerId;
    const handler = nodes.get(button.containerId)?.listeners.get('click') || nodes.get(container)?.listeners.get('click') || document.listeners.get('click') || nodes.get('bk-app').listeners.get('click');
    assert.ok(handler, action + ' has an event handler');
    await handler({ target: button });
    for (let i = 0; i < 16; i++) await Promise.resolve();
  }
  return { document, sent, creates, cardCreates, cardConnections, joins, connections, publications, loadedScripts, storage, context, intervals, html: () => nodes.get('bk-app').innerHTML, content: id => nodes.get(id)?.innerHTML || '', button: action => document.buttons.find(b => b.dataset.bkAction === action), node: id => nodes.get(id), update: view => transportOptions.onView(clone(view)), status: value => transportOptions.onStatus(value), click, async confirm() { nodes.get('bk-confirm-send').listeners.get('click')(); for (let i = 0; i < 16; i++) await Promise.resolve(); } };
}
test('shared host presentation hides a supplied private role and answer during preparation and discussion', async () => {
  for (const phase of ['prepare', 'discussion']) {
    const state = fixture(phase), truth = state.rooms.UITEST.members.find(p => p.id === state.rooms.UITEST.round.truthfulId), view = project(state, truth.identityId);
    view.self.isHost = true;
    const h = await harness(view);
    assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact|Only you can see this|class="bk-role-title"|id="bk-role"/);
    assert.equal(h.button('challenge'), undefined); assert.equal(h.button('identify'), undefined); assert.match(h.html(), /Open my private card/);
  }
});
test('private cards show the owner role; only the Truth Teller receives answer details', async () => {
  const state = fixture('prepare');
  for (const identityId of ['identity-0', 'identity-1', 'identity-2']) {
    const view = project(state, identityId), h = await harness(view, { card: true });
    assert.match(h.html(), /class="bk-private"/); assert.match(h.html(), /Only you can see this/);
    if (view.privateCard.role === 'truthful') { assert.match(h.html(), /PRIVATE_TEST_ANSWER_|Private fact one/); assert.match(h.html(), /do not invent new facts/); }
    else assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact/);
    assert.ok(h.button('ready')); assert.equal(h.button('challenge'), undefined);
  }
});
test('Thinker must hear every Spotlight before choosing; challenged players remain selectable', async () => {
  const state = fixture(), h = await harness(project(state), { card: true });
  assert.ok(h.button('nextSpotlight')); assert.equal(h.button('identify').disabled, true); assert.ok(h.button('challenge'));
  act(state, 'challenge', 'identity-0', { targetId: state.rooms.UITEST.round.truthfulId }); h.update(project(state));
  assert.equal(h.button('challenge'), undefined); assert.match(h.html(), /CHALLENGED/);
  const r = state.rooms.UITEST.round;
  for (let i = 0; i < r.spotlightOrder.length; i++) act(state, 'nextSpotlight');
  h.update(project(state)); assert.equal(h.button('nextSpotlight'), undefined); assert.equal(h.button('identify').disabled, false); assert.match(h.html(), /Keep asking/);
  await h.click('identify');
  assert.ok(h.document.buttons.find(button => button.dataset.bkAction === 'pickTarget' && button.dataset.bkTarget === r.truthfulId), 'challenged truth teller stays in final choice');
});
test('Bluffers and spectators see progress but cannot operate Thinker controls', async () => {
  const state = fixture(); E.applyCommand(state, 'spectator', { room: 'UITEST', action: 'join', name: 'Watcher', participate: false }, bank, options);
  for (const identityId of ['identity-2', 'spectator']) {
    const h = await harness(project(state, identityId), { card: true });
    assert.ok(h.node('bk-clock')); assert.match(h.html(), /class="bk-coverage">0 \/ 2/);
    for (const action of ['nextSpotlight', 'challenge', 'identify', 'inspiration']) assert.equal(h.button(action), undefined, action + ' is Thinker-only');
    assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact/);
  }
});
test('final choice uses a second confirmation and preserves its round/version snapshot', async () => {
  const state = fixture(); for (let i = 0; i < 2; i++) act(state, 'nextSpotlight');
  const view = project(state), h = await harness(view, { card: true });
  await h.click('identify'); assert.equal(h.sent.length, 0); assert.equal(h.node('bk-picker').open, true);
  await h.click('pickTarget', state.rooms.UITEST.round.truthfulId); assert.equal(h.sent.length, 0); assert.equal(h.node('bk-confirm').open, true);
  h.update({ ...view, version: view.version + 1 }); await h.confirm();
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].action, 'identify'); assert.equal(h.sent[0].expectedVersion, view.version); assert.equal(h.sent[0].roundId, view.round.id); assert.equal(h.sent[0].targetId, state.rooms.UITEST.round.truthfulId);
});
test('soft discussion clock never sends automatic Next, choice, or phase transition', async () => {
  const state = fixture(), h = await harness(project(state), { card: true });
  for (let i = 0; i < 10; i++) for (const timer of h.intervals) timer();
  assert.equal(h.sent.length, 0); assert.equal(h.button('identify').disabled, true); assert.equal(h.node('bk-nudge').hidden, false);
});
test('reveal displays actual engine deltas, including zero net and negative Thinker points', async () => {
  const cases = [ [false, null, 2], [true, null, 0], [false, 'bluffer', 3], [true, 'bluffer', 0], [true, 'truthful', -2], [false, 'truthful', 0] ];
  for (const [wrong, challengeRole, thinkerDelta] of cases) {
    const state = fixture('discussion', 4), r = state.rooms.UITEST.round;
    if (challengeRole) act(state, 'challenge', 'identity-0', { targetId: challengeRole === 'truthful' ? r.truthfulId : state.rooms.UITEST.roster.find(id => id !== r.thinkerId && id !== r.truthfulId) });
    for (let i = 0; i < 3; i++) act(state, 'nextSpotlight');
    const selected = wrong ? state.rooms.UITEST.roster.find(id => id !== r.thinkerId && id !== r.truthfulId) : r.truthfulId;
    act(state, 'identify', 'identity-0', { targetId: selected });
    const h = await harness(project(state));
    assert.match(h.html(), /PRIVATE_TEST_ANSWER_|Test source/); assert.equal(r.result.delta[r.thinkerId].points, thinkerDelta);
    assert.ok(h.button('nextRound')); assert.equal(h.button('identify'), undefined); assert.equal(h.sent.length, 0, 'reveal waits for manual continuation');
    assert.ok(h.html().includes('>' + (thinkerDelta > 0 ? '+' : '') + thinkerDelta + '</strong>'));
  }
});
test('player names are escaped in public progress and final confirmation text', async () => {
  const state = fixture(); state.rooms.UITEST.members[1].name = '<img src=x onerror=alert(1)>';
  const h = await harness(project(state), { card: true });
  assert.ok(h.html().includes('&lt;img src=x onerror=alert(1)&gt;')); assert.doesNotMatch(h.html(), /<img src=x/);
  await h.click('challenge'); await h.click('pickTarget', state.rooms.UITEST.members[1].id);
  assert.ok(h.node('bk-confirm-title').textContent.includes('<img src=x onerror=alert(1)>')); assert.equal(h.sent.length, 0);
});
test('unchecking host participation is retained while the form becomes busy', async () => {
  const h = await harness(null); h.node('bk-name').value = 'Public host'; h.node('bk-participate').checked = false;
  await h.click('create'); assert.equal(h.creates.length, 1); assert.equal(h.creates[0].participate, false);
});
test('host and waiting-host transport statuses render readable connection state', async () => {
  const h = await harness(project(fixture('lobby')));
  h.status('hosting'); assert.equal(h.node('bk-connection').classes.has('is-offline'), false);
  h.status('waiting_for_host'); assert.match(h.node('bk-connection').textContent, /host.*reconnect/i);
});

function originalSetup(count = 3) {
  return { code: 'UITEST', playerCount: count, tokens: Array.from({ length: count }, (_, i) => (i + 1).toString(16).padStart(20, '0')), names: Array.from({ length: count }, (_, i) => ['Sam', 'Sam', 'A&B <player>'][i] || 'Player ' + (i + 1)) };
}
function originalSessions(setup) {
  return setup.tokens.map((originalToken, i) => ({ originalToken, name: setup.names[i], playerId: 'original-seat-' + i, credential: { version: 2, room: setup.code, token: (i + 1).toString(16).padStart(64, '0'), identityId: (i + 101).toString(16).padStart(40, '0'), historyToken: (i + 201).toString(16).padStart(64, '0') } }));
}
function moderatorView(setup, phase = 'lobby') {
  const state = E.blankStore();
  E.applyCommand(state, 'moderator', { room: 'UITEST', action: 'create', name: 'Host', participate: false }, bank, options);
  for (let i = 0; i < setup.playerCount; i++) E.applyCommand(state, 'original-' + i, { room: 'UITEST', action: 'join', name: setup.names[i], participate: true }, bank, options);
  if (phase !== 'lobby') act(state, 'start', 'moderator');
  if (['prepare', 'discussion'].includes(phase)) act(state, 'confirmTopic', 'moderator');
  if (phase === 'discussion') act(state, 'beginDiscussion', 'moderator');
  return project(state, 'moderator');
}
test('original Hub names and all 3, 6 or 9 seats carry over without a second registration', async () => {
  for (const count of [3, 6, 9]) {
    const setup = originalSetup(count), hostView = moderatorView(setup), sessions = originalSessions(setup);
    const h = await harness(null, { setup, transport: { createdView: hostView, sessions } });
    assert.equal(h.cardCreates.length, 1);
    assert.deepEqual(h.cardCreates[0], { code: setup.code, setup });
    assert.equal(h.creates.length, 0); assert.equal(h.joins.length, 0);
    assert.equal(h.node('bk-name'), undefined); assert.equal(h.node('bk-participate'), undefined);
    assert.equal(h.button('create'), undefined); assert.equal(h.button('join'), undefined); assert.equal(h.button('watch'), undefined);
    assert.equal(hostView.players.filter(p => p.seated).length, count);
    assert.equal(hostView.self.isFormal, false, 'the shared moderator adds no extra formal seat');
    assert.ok(h.button('start')); assert.equal(h.button('start').disabled, false);
    assert.doesNotMatch(h.html(), /Open my private card/);
    assert.match(h.html(), /A&amp;B &lt;player&gt;/);
    assert.ok(h.publications.length >= 1);
    const published = h.publications.at(-1);
    assert.equal(published.length, count);
    for (let i = 0; i < count; i++) {
      assert.equal(published[i].name, setup.names[i]);
      assert.deepEqual(published[i].bluff, sessions[i].credential);
      assert.equal(published[i].game, 'bluffking');
      for (let j = 0; j < count; j++) if (i !== j) assert.equal(JSON.stringify(published[i]).includes(sessions[j].credential.token), false, 'a shared card receives only its own bearer');
    }
    assert.equal(h.sent.length, 0, 'adopting the Hub roster waits for Start');
    await h.click('start');
    assert.equal(h.sent.length, 1); assert.equal(h.sent[0].action, 'start'); assert.equal(h.sent[0].expectedVersion, hostView.version);
  }
});
test('restoring an existing Hub game never resets, replaces or automatically starts it', async () => {
  const setup = originalSetup(6), existing = moderatorView(setup, 'discussion'), sessions = originalSessions(setup);
  const h = await harness(existing, { setup, transport: { sessions } });
  assert.equal(h.creates.length, 0); assert.equal(h.joins.length, 0); assert.equal(h.sent.length, 0);
  assert.equal(h.node('bk-name'), undefined); assert.equal(h.button('start'), undefined);
  assert.match(h.html(), /Live conversation/);
  assert.equal(existing.phase, 'discussion');
  assert.doesNotMatch(h.html(), /Open my private card/);
});
test('v2 original private card connects its assigned seat automatically and never asks for a name', async () => {
  const state = fixture('prepare'), view = project(state, 'identity-1'), credential = originalSessions(originalSetup())[1].credential;
  const hash = '#session=' + credential.token + '&identity=' + credential.identityId + '&history=' + credential.historyToken;
  const h = await harness(view, { card: true, hash });
  assert.deepEqual(h.cardConnections, [{ code: 'UITEST', credential }]);
  assert.equal(h.connections.length, 0); assert.equal(h.joins.length, 0); assert.equal(h.creates.length, 0); assert.equal(h.cardCreates.length, 0);
  assert.equal(h.node('bk-name'), undefined); assert.equal(h.button('join'), undefined); assert.equal(h.button('watch'), undefined);
  assert.match(h.html(), /Only you can see this/);
  assert.equal(h.loadedScripts.some(src => /bluff-king-(?:engine|topics)\.js/.test(src)), false, 'a private card does not load the host bank or engine');
});
test('malformed private-card credentials show an error without starting a replacement join flow', async () => {
  const h = await harness(null, { card: true, hash: '#session=bad&identity=bad&history=bad' });
  assert.equal(h.cardConnections.length, 0); assert.equal(h.joins.length, 0); assert.equal(h.creates.length, 0);
  assert.equal(h.node('bk-error').hidden, false);
  assert.equal(h.node('bk-name'), undefined); assert.equal(h.button('join'), undefined); assert.equal(h.button('watch'), undefined);
  assert.equal(h.sent.length, 0);
});
test('legacy v1 private invitations retain standalone joining when no Hub credentials exist', async () => {
  const h = await harness(null, { card: true });
  assert.equal(h.cardConnections.length, 0);
  assert.equal(h.connections.length, 1);
  assert.ok(h.node('bk-name')); assert.ok(h.button('join')); assert.ok(h.button('watch'));
});
test('a transferred original-seat host opens a public table without registration or role exposure', async () => {
  const state = fixture('prepare'), privateView = project(state, 'identity-1'), credential = originalSessions(originalSetup())[1].credential;
  privateView.self.isHost = true;
  const hash = '#session=' + credential.token + '&identity=' + credential.identityId + '&history=' + credential.historyToken;
  const card = await harness(privateView, { card: true, hash });
  const hostLink = card.html().match(/<a\b[^>]*href="([^"]+)"[^>]*>(?:Open host table|Host table)/);
  assert.ok(hostLink, 'the transferred host receives a table link');
  const url = new URL(hostLink[1].replaceAll('&amp;', '&'));
  assert.equal(url.searchParams.has('card'), false);
  assert.equal(url.hash, '', 'host identity is restored from its saved room binding');
  const table = await harness(privateView);
  assert.equal(table.connections.length, 1);
  assert.equal(table.joins.length, 0); assert.equal(table.creates.length, 0);
  assert.equal(table.node('bk-name'), undefined);
  assert.doesNotMatch(table.html(), /PRIVATE_TEST_ANSWER_|Private fact|Only you can see this|class="bk-role-title"|id="bk-role"/);
});
test('finishing a Hub game then restarting adopts and republishes the original cards without auto-starting', async () => {
  const setup = originalSetup(), sessions = originalSessions(setup), state = fixture('discussion');
  for (let round = 0; round < 3; round++) {
    if (round) { act(state, 'confirmTopic'); act(state, 'beginDiscussion'); }
    const r = state.rooms.UITEST.round, thinker = state.rooms.UITEST.members.find(p => p.id === r.thinkerId).identityId;
    for (let i = 0; i < 2; i++) act(state, 'nextSpotlight', thinker);
    act(state, 'identify', thinker, { targetId: r.truthfulId });
    act(state, 'nextRound');
  }
  const finished = project(state), transport = { sessions }, h = await harness(finished, { setup, transport });
  assert.equal(finished.phase, 'results');
  const imports = h.cardCreates.length, publications = h.publications.length;
  transport.createdView = moderatorView(setup);
  await h.click('restart');
  assert.deepEqual(h.sent.map(command => command.action), ['restart']);
  assert.equal(h.cardCreates.length, imports + 1);
  assert.deepEqual(h.cardCreates.at(-1), { code: setup.code, setup });
  assert.equal(h.publications.length, publications + 1);
  assert.deepEqual(h.publications.at(-1).map(marker => marker.bluff), sessions.map(slot => slot.credential));
  assert.ok(h.button('start')); assert.equal(h.button('start').disabled, false);
  assert.equal(h.node('bk-name'), undefined); assert.equal(h.button('join'), undefined);
});
test('the on-demand picker lists eligible seats without disclosing roles or sending a choice', async () => {
  for (const count of [3, 6, 9]) {
    const state = fixture('discussion', count), room = state.rooms.UITEST;
    E.applyCommand(state, 'watcher', { room: 'UITEST', action: 'join', name: 'Watcher', participate: false }, bank, options);
    const view = project(state), h = await harness(view, { card: true });
    assert.equal(h.node('bk-picker').open, false);
    assert.equal(h.node('bk-challenge-target'), undefined); assert.equal(h.node('bk-truth-target'), undefined);
    await h.click('challenge');
    assert.equal(h.node('bk-picker').open, true); assert.equal(h.sent.length, 0);
    const candidates = h.document.buttons.filter(button => button.dataset.bkAction === 'pickTarget');
    assert.equal(candidates.length, count - 1);
    assert.deepEqual(candidates.map(button => button.dataset.bkTarget).sort(), room.roster.filter(id => id !== room.round.thinkerId).sort());
    assert.doesNotMatch(h.content('bk-picker-list'), /PRIVATE_TEST_ANSWER_|Private fact|Truth Teller|Bluffer|Watcher/);
    await h.click('pickTarget', room.round.truthfulId);
    assert.equal(h.node('bk-picker').open, false); assert.equal(h.node('bk-confirm').open, true); assert.equal(h.sent.length, 0);
    await h.confirm();
    assert.equal(h.sent.length, 1); assert.equal(h.sent[0].action, 'challenge'); assert.equal(h.sent[0].targetId, room.round.truthfulId);
  }
});
test('closing a player picker cancels selection and sends no room action', async () => {
  const h = await harness(project(fixture()), { card: true });
  await h.click('challenge'); assert.equal(h.node('bk-picker').open, true);
  h.node('bk-picker').close();
  assert.equal(h.node('bk-confirm').open, false); assert.equal(h.sent.length, 0);
});
test('rules and room management stay outside the active game and open without game commands', async () => {
  const h = await harness(project(fixture()), { card: true });
  assert.equal(h.node('bk-help').open, false); assert.equal(h.node('bk-manage').open, false);
  assert.doesNotMatch(h.html(), /<ol>|Three roles|Table rules/);
  const openHelp = h.node('bk-help-open').listeners.get('click');
  assert.ok(openHelp); await openHelp();
  assert.equal(h.node('bk-help').open, true); assert.equal(h.sent.length, 0);
  await h.click('manage'); assert.equal(h.node('bk-manage').open, true); assert.equal(h.sent.length, 0);
});
test('Truth Teller can hide their own card while facts stay collapsed by default', async () => {
  const state = fixture('prepare'), truth = state.rooms.UITEST.members.find(p => p.id === state.rooms.UITEST.round.truthfulId);
  const h = await harness(project(state, truth.identityId), { card: true });
  assert.match(h.html(), /PRIVATE_TEST_ANSWER_/); assert.match(h.html(), /<details class="bk-detail">/);
  assert.doesNotMatch(h.html(), /<details\b[^>]*\bopen\b/);
  await h.click('toggleRole');
  assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact|class="bk-role-title"/);
  h.update(project(state, truth.identityId));
  assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact/);
  await h.click('toggleRole'); assert.match(h.html(), /PRIVATE_TEST_ANSWER_|Private fact one/);
  assert.equal(h.sent.length, 0, 'card visibility never changes room state');
});
test('a picker started in an earlier round cannot spend the next round’s challenge', async () => {
  const state = fixture(), h = await harness(project(state), { card: true });
  await h.click('challenge'); assert.equal(h.node('bk-picker').open, true);
  act(state, 'cancelRound'); act(state, 'confirmTopic'); act(state, 'beginDiscussion');
  h.update(project(state));
  assert.equal(h.node('bk-picker').open, false, 'changing round closes the old player choice');
  assert.equal(h.node('bk-confirm').open, false); assert.equal(h.sent.length, 0);
});
test('standalone participating host can open their own card before the deal; known-topic reporting stays private', async () => {
  for (const phase of ['lobby', 'topic_check']) {
    const view = project(fixture(phase)), shared = await harness(view);
    const link = shared.html().match(/<a\b[^>]*href="([^"]+)"[^>]*>Open my private card/);
    assert.ok(link, phase + ' includes the participating host’s private-card link');
    const url = new URL(link[1].replaceAll('&amp;', '&'));
    assert.equal(url.searchParams.get('room'), 'UITEST'); assert.equal(url.searchParams.get('card'), '1');
    assert.equal(shared.button('knowTopic'), undefined, 'known-answer report belongs on the owner card');
    const own = await harness(view, { card: true });
    assert.equal(Boolean(own.button('knowTopic')), phase === 'topic_check');
    assert.equal(shared.sent.length, 0); assert.equal(own.sent.length, 0);
    const setup = originalSetup(), moderator = await harness(moderatorView(setup, phase), { setup, transport: { sessions: originalSessions(setup) } });
    assert.doesNotMatch(moderator.html(), /Open my private card/);
    assert.equal(moderator.button('knowTopic'), undefined, 'the original Hub moderator adds no formal player');
  }
});
