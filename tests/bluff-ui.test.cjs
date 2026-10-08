'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../bluff-king-engine.js');
const cardsPath = require('node:path').resolve(__dirname, '../bluff-king-cards.js');
const clone = value => JSON.parse(JSON.stringify(value));
const privateMarkup = html => html.match(/<section\b[^>]*class="(?=[^\"]*\bbk-private\b)[^\"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
const expandedMarkup = html => html.replace(/<details\b([^>]*)>[\s\S]*?<\/details>/g, (block, attributes) => /\bopen(?:\s|=|$)/.test(attributes) ? block : '');
const textMarkup = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const actionSentence = html => html.match(/<p\b[^>]*class="(?=[^\"]*\bbk-voice-sentence\b)[^\"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || '';
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
  closest(selector) { return selector.includes('[data-bk-action]') && this.dataset.bkAction || selector.includes('[data-bk-voice]') && this.dataset.bkVoice ? this : null; }
  showModal() { this.open = true; }
  close() { this.open = false; this.listeners.get('close')?.(); }
  set innerHTML(value) {
    this._html = value;
    if (!this.id) return;
    const previousIds = this.document.dynamicIdsByContainer.get(this.id) || new Set();
    for (const id of previousIds) this.document.nodes.delete(id);
    const ids = new Set(), buttons = [], sentences = [];
    for (const tag of value.match(/<(?:button|input|select|details|span|p|a|div|section|aside|h1|h2)\b[^>]*>/g) || []) {
      const id = tag.match(/\bid="([^"]+)"/)?.[1] || '';
      const node = new NodeDouble(this.document, id);
      node.containerId = this.id;
      node.disabled = /\sdisabled(?:\s|>)/.test(tag); node.checked = /\schecked(?:\s|>)/.test(tag); node.open = /\sopen(?:\s|>)/.test(tag); node.hidden = /\shidden(?:\s|>)/.test(tag); node.value = tag.match(/\bvalue="([^"]*)"/)?.[1] || '';
      for (const m of tag.matchAll(/data-bk-([\w-]+)="([^"]*)"/g)) node.dataset['bk' + m[1].split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('')] = m[2];
      if (id) { this.document.nodes.set(id, node); ids.add(id); }
      if (node.dataset.bkAction || node.dataset.bkVoice) buttons.push(node);
      if (/\bclass="[^\"]*\bbk-voice-sentence\b[^\"]*"/.test(tag)) sentences.push(node);
    }
    this.document.dynamicIdsByContainer.set(this.id, ids);
    this.document.buttonsByContainer.set(this.id, buttons);
    this.document.buttons = [...this.document.buttonsByContainer.values()].flat();
    this.document.sentencesByContainer.set(this.id, sentences);
    this.document.sentences = [...this.document.sentencesByContainer.values()].flat();
  }
  get innerHTML() { return this._html; }
}
async function harness(initialView, { card = false, setup = null, hash = '', transport = {}, search = null, now = () => Date.now() } = {}) {
  const nodes = new Map(), document = { nodes, dynamicIdsByContainer: new Map(), buttonsByContainer: new Map(), sentencesByContainer: new Map(), buttons: [], sentences: [], activeElement: null, listeners: new Map(), addEventListener(type, fn) { this.listeners.set(type, fn); }, getElementById(id) { return nodes.get(id) || null; }, createElement() { return new NodeDouble(this); } };
  const pageHTML = fs.readFileSync(require.resolve('../bluff-king-live-chat.html'), 'utf8');
  const fixedIds = [...pageHTML.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of new Set([...fixedIds, 'bk-app', 'bk-rule-copy', 'bk-room-label', 'bk-connection', 'bk-error', 'bk-confirm', 'bk-confirm-title', 'bk-confirm-text', 'bk-confirm-send', 'room-mount'])) nodes.set(id, new NodeDouble(document, id));
  document.body = new NodeDouble(document); document.head = { append: script => queueMicrotask(() => script.onload?.()) };
  const dictionary = new Map(), storage = new Map(), sent = [], creates = [], cardCreates = [], cardConnections = [], joins = [], connections = [], publications = [], loadedScripts = [], intervals = [], statuses = [];
  if (setup) { storage.set('room-last-session', setup.code); storage.set('room-session-' + setup.code, JSON.stringify(setup)); }
  let transportOptions;
  const context = { document, location: { href: 'https://example.test/bluff-king-live-chat.html'+(search??(setup&&!card?'':'?room=UITEST'+(card?'&card=1':'')))+hash, origin: 'https://example.test', search: search??(setup&&!card?'':'?room=UITEST'+(card?'&card=1':'')), hash }, URL, URLSearchParams, crypto, Uint8Array, Promise, queueMicrotask, Date: class extends Date { static now() { return now(); } }, navigator: { clipboard: { writeText: async () => {} } }, prompt() {}, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }, I18N: { lang: 'en', registerDict: (name, dict) => dictionary.set(name, dict), t: (name, key) => dictionary.get(name)?.[key]?.en || key, onChange() {} }, FIREBASE_CONFIG: { databaseURL: 'https://test.firebaseio.com' }, BLUFF_ENGINE: E, BLUFF_QUESTIONS: bank, setInterval: fn => (intervals.push(fn), intervals.length), addEventListener() {}, BLUFF_SYNC: { Client: class {
    constructor(opts) { transportOptions = opts; transport.client=this; }
    async connect(...args) { connections.push(args); if (transport.connectError) throw transport.connectError; if (initialView) transportOptions.onView(clone(initialView)); transportOptions.onStatus('hosting'); return initialView; }
    async refresh() { return initialView; }
    async command(input) { sent.push(clone(input)); return initialView; }
    async create(code, settings) { creates.push({ code, ...settings }); return initialView; }
    async createFromCards(code, settings, options) { cardCreates.push({ code, setup: clone(settings), options: clone(options||{}) }); if(transport.importError)throw transport.importError;if(transport.beforeImport)await transport.beforeImport({storage,context}); const next = transport.createdView || initialView; if (next) transportOptions.onView(clone(next)); return next; }
    async getCardSessions() { return clone(transport.sessions || []); }
    async connectCard(code, credential) { cardConnections.push({ code, credential: clone(credential) }); if (transport.cardError) throw transport.cardError; if (initialView) transportOptions.onView(clone(initialView)); transportOptions.onStatus('connected'); return initialView; }
    async join(...args) { joins.push(args); return initialView; }
    close() {}
  } } };
  if (fs.existsSync(cardsPath)) context.BLUFF_CARDS = require(cardsPath);
  if (setup) context.ROOM = { enabled: true, code: setup.code, count: setup.playerCount, init() {}, name: i => setup.names[i], publish: fn => { publications.push(setup.tokens.slice(0, setup.playerCount).map((_, i) => clone(fn(i)))); } };
  document.head = { append: script => { loadedScripts.push(script.src); queueMicrotask(() => script.onload?.()); } };
  context.window = context;
  if(transport.room)context.ROOM=transport.room;
  if(transport.initializedSetup){const init=context.ROOM.init.bind(context.ROOM);context.ROOM.init=(...args)=>{init(...args);storage.set('room-last-session',transport.initializedSetup.code);storage.set('room-session-'+transport.initializedSetup.code,JSON.stringify(transport.initializedSetup));};}
  if(transport.executor)context.HUB_EXECUTOR=transport.executor;
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
  async function clickGuidance() {
    const sentence = document.sentences.find(node => node.containerId === 'bk-app');
    assert.ok(sentence, 'the visible action sentence exists');
    await nodes.get('bk-app').listeners.get('click')({ target: sentence });
    for (let i = 0; i < 16; i++) await Promise.resolve();
  }
  return { document, sent, creates, cardCreates, cardConnections, joins, connections, publications, loadedScripts, storage, context, intervals, html: () => nodes.get('bk-app').innerHTML, content: id => nodes.get(id)?.innerHTML || '', button: action => document.buttons.find(b => b.dataset.bkAction === action), voiceCues: () => document.buttons.filter(node => node.dataset.bkVoice).map(node => node.dataset.bkVoice), node: id => nodes.get(id), update: view => transportOptions.onView(clone(view)), status: value => transportOptions.onStatus(value), click, clickGuidance, async confirm() { nodes.get('bk-confirm-send').listeners.get('click')(); for (let i = 0; i < 16; i++) await Promise.resolve(); } };
}
test('shared host presentation hides a supplied private role and answer during preparation and discussion', async () => {
  for (const phase of ['prepare', 'discussion']) {
    const state = fixture(phase), truth = state.rooms.UITEST.members.find(p => p.id === state.rooms.UITEST.round.truthfulId), view = project(state, truth.identityId);
    view.self.isHost = true;
    const h = await harness(view);
    assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact|Your role|YOU ARE|class="bk-role-title"|id="bk-role"/);
    assert.equal(h.button('challenge'), undefined); assert.equal(h.button('identify'), undefined); assert.match(h.html(), /Open my private card/);
    if (phase === 'discussion') { assert.match(h.html(), /data-bk-guidance="public"/); assert.equal(textMarkup(actionSentence(h.html())), 'Ask questions or follow up while others speak.'); assert.deepEqual(h.voiceCues(), []); }
    else assert.doesNotMatch(h.html(), /Review the answer, then tap Ready/);
  }
});
test('private cards show the owner role; only the Truth Teller receives answer details', async () => {
  const state = fixture('prepare'), purposes = [], illustrations = [];
  for (const identityId of ['identity-0', 'identity-1', 'identity-2']) {
    const view = project(state, identityId), h = await harness(view, { card: true });
    const ownerCard = privateMarkup(h.html());
    assert.match(h.html(), /class="bk-private bk-role-card"/); assert.match(ownerCard, /class="bk-role-title"/);
    const roleTitle = ownerCard.match(/<h2\b[^>]*class="bk-role-title"[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    assert.equal(textMarkup(roleTitle || ''), { thinker: 'Thinker', truthful: 'Truth Teller', bluffer: 'Bluffer' }[view.privateCard.role]);
    assert.match(ownerCard, /class="[^\"]*\bbk-role-art\b[^\"]*"/);
    const art = ownerCard.match(/<img\b[^>]*class="bk-role-art"[^>]*src="([^"]+)"[^>]*alt=""[^>]*>/)?.[1];
    assert.ok(art, 'the role title has its illustration');
    assert.match(fs.readFileSync(require.resolve('../' + art), 'utf8'), /<svg\b[^>]*viewBox=/, 'the role illustration is included and has a scalable SVG view'); illustrations.push(art);
    assert.equal((ownerCard.match(/class="bk-role-purpose"/g) || []).length, 1, 'the illustrated role has one purpose sentence');
    const purpose = ownerCard.match(/<p\b[^>]*class="bk-role-purpose"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    assert.ok(textMarkup(purpose || '').length > 10); purposes.push(textMarkup(purpose));
    assert.match(ownerCard, /<p class="bk-role-kicker">YOU ARE<\/p>[\s\S]*<h2 class="bk-role-title">/);
    assert.doesNotMatch(ownerCard, /bk-private-heading|bk-private-label|Your role|Only you can see this/);
    if (view.privateCard.role === 'truthful') { assert.match(h.html(), /PRIVATE_TEST_ANSWER_|Private fact one/); assert.match(ownerCard, /class="bk-truth-tip"/); }
    else assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact/);
    assert.ok(h.button('ready')); assert.equal(h.button('challenge'), undefined);
  }
  assert.equal(new Set(purposes).size, 3, 'each role has its own purpose');
  assert.equal(new Set(illustrations).size, 3, 'each role has its own illustration');
});
test('Truth Teller sees every answer fact immediately and all private evidence is escaped', async () => {
  const facts = [
    ['First fact: A & B <evidence>.', 'First fact: A &amp; B &lt;evidence&gt;.'],
    ['Second fact: "quoted" and \'single\' > example.', 'Second fact: &quot;quoted&quot; and &#39;single&#39; &gt; example.'],
    ['Third fact: <button data-bk-action="identify">press</button>.', 'Third fact: &lt;button data-bk-action=&quot;identify&quot;&gt;press&lt;/button&gt;.'],
  ];
  for (const phase of ['prepare', 'discussion']) {
    const state = fixture(phase), truth = state.rooms.UITEST.members.find(player => player.id === state.rooms.UITEST.round.truthfulId);
    const view = project(state, truth.identityId);
    view.privateCard.secretAnswer = 'ANSWER <img src=x onerror="secret()"> A & B';
    view.privateCard.supportingFacts = facts.map(([raw]) => raw);
    const h = await harness(view, { card: true }), visible = expandedMarkup(privateMarkup(h.html()));
    assert.ok(visible.includes('ANSWER &lt;img src=x onerror=&quot;secret()&quot;&gt; A &amp; B'), 'the answer is visible without expanding anything');
    for (const [, escaped] of facts) assert.ok(visible.includes(escaped), 'each supporting fact is visible without expanding anything');
    assert.doesNotMatch(h.html(), /<img src=x|<evidence>|<button data-bk-action="identify">press/);
    assert.equal(h.button('identify'), undefined, 'fact text cannot become a room action');
    assert.equal(h.sent.length, 0);
    const shared = await harness(view);
    assert.doesNotMatch(shared.html(), /ANSWER|First fact:|Second fact:|Third fact:|secret\(\)/, 'private evidence never appears on the shared host screen');
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
    assert.equal(h.html().includes('YOU ARE'), identityId !== 'spectator', 'only the owner of a formal role sees YOU ARE');
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
test('five-minute inline no-rush reminder belongs only to the private Thinker and never advances play', async () => {
  const state = fixture(), startedAt = state.rooms.UITEST.round.discussionStartedAt;
  let now = startedAt + 299999;
  const views = [
    { identity: 'identity-0', card: true, thinker: true },
    { identity: 'identity-1', card: true, thinker: false },
    { identity: 'identity-2', card: true, thinker: false },
    { identity: 'identity-0', card: false, thinker: false },
  ];
  const screens = [];
  for (const entry of views) {
    const h = await harness(project(state, entry.identity), { card: entry.card, now: () => now });
    assert.equal(h.node('bk-nudge').hidden, true, 'the reminder stays hidden before five minutes');
    assert.match(h.node('bk-clock').textContent, /^4:59 · conversation time$/);
    const inlineGroup = h.html().match(/<span class="bk-clock-group">([\s\S]*?)<\/span><\/span>/)?.[1];
    assert.ok(inlineGroup?.includes('id="bk-clock"') && inlineGroup.includes('id="bk-nudge"'), 'the short reminder sits beside the clock');
    assert.match(inlineGroup, /class="bk-clock-reminder"[^>]*title="You can keep asking, or get ready to decide\."[^>]*>· no rush/);
    screens.push({ ...entry, h });
  }
  for (const elapsed of [300000, 900000]) {
    now = startedAt + elapsed;
    for (const { h, thinker } of screens) {
      for (const timer of h.intervals) timer();
      assert.equal(h.node('bk-nudge').hidden, !thinker, 'only the private Thinker gets the reminder');
      assert.equal(h.node('bk-clock').textContent, `${elapsed / 60000}:00${thinker ? '' : ' · conversation time'}`);
      assert.equal(h.sent.length, 0, 'elapsed time cannot trigger a game action');
      assert.equal(h.button('identify')?.disabled, thinker ? true : undefined, 'the timer cannot complete Spotlight coverage');
    }
  }
  assert.equal(state.rooms.UITEST.phase, 'discussion');
  assert.deepEqual(state.rooms.UITEST.round.coveredIds, []);
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
    assert.deepEqual(h.cardCreates[0], { code: setup.code, setup, options: { replaceActive: true } });
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
  assert.match(h.html(), /class="bk-role-title"/);
  assert.doesNotMatch(privateMarkup(h.html()), /Your role|bk-private-heading|bk-private-label/);
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
  assert.doesNotMatch(table.html(), /PRIVATE_TEST_ANSWER_|Private fact|Your role|class="bk-role-title"|id="bk-role"/);
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
  assert.deepEqual(h.cardCreates.at(-1), { code: setup.code, setup, options: { replaceActive: true } });
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
test('Truth Teller sees answer facts immediately and can hide all private card content', async () => {
  const state = fixture('prepare'), truth = state.rooms.UITEST.members.find(p => p.id === state.rooms.UITEST.round.truthfulId);
  const h = await harness(project(state, truth.identityId), { card: true });
  assert.match(expandedMarkup(privateMarkup(h.html())), /PRIVATE_TEST_ANSWER_/);
  assert.ok(expandedMarkup(privateMarkup(h.html())).includes('Private fact one'));
  assert.ok(expandedMarkup(privateMarkup(h.html())).includes('Private fact two'));
  assert.match(privateMarkup(h.html()), /class="bk-supporting-facts"/);
  assert.doesNotMatch(privateMarkup(h.html()), /<details\b/);
  await h.click('toggleRole');
  assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact|class="bk-role-title"|bk-role-art|bk-role-purpose|bk-truth-tip|data-bk-guidance/);
  h.update(project(state, truth.identityId));
  assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_|Private fact|bk-role-art|bk-role-purpose|bk-truth-tip|data-bk-guidance/);
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
test('conversation guidance follows Thinker, current speaker and listener as the Spotlight moves', async () => {
  const state = fixture('discussion', 4), room = state.rooms.UITEST, firstView = project(state);
  const speaker = room.members.find(p => p.id === firstView.round.currentSpotlightId);
  const listener = room.members.find(p => p.id !== room.round.thinkerId && p.id !== speaker.id);
  const thinkerUI = await harness(firstView, { card: true });
  const speakerUI = await harness(project(state, speaker.identityId), { card: true });
  const listenerUI = await harness(project(state, listener.identityId), { card: true });
  const cases = [
    [thinkerUI, 'thinker', 'Ask questions anytime. Find who knows the truth.'],
    [speakerUI, 'speaking', 'Explain your answer. Respond to questions.'],
    [listenerUI, 'listening', 'Ask questions or follow up while others speak.'],
  ];
  for (const [ui, mode, sentence] of cases) {
    assert.ok(ui.html().includes(`data-bk-guidance="${mode}"`));
    assert.equal(textMarkup(actionSentence(ui.html())), sentence, 'the current action appears as a visible sentence');
    assert.ok(ui.html().includes(`aria-label="${sentence}"`), 'the visible action and accessible group agree');
    const sentenceTag = ui.html().match(/<p\b[^>]*class="[^\"]*\bbk-voice-sentence\b[^\"]*"[^>]*>/)?.[0];
    assert.ok(sentenceTag); assert.doesNotMatch(sentenceTag, /\bhidden\b|aria-hidden="true"|data-bk-action/);
    assert.deepEqual(ui.voiceCues(), []);
    assert.doesNotMatch(privateMarkup(ui.html()), /bk-now-label|bk-voice-tag|bk-voice-anytime|data-bk-voice=/);
  }
  act(state, 'nextSpotlight');
  speakerUI.update(project(state, speaker.identityId)); listenerUI.update(project(state, listener.identityId));
  assert.match(speakerUI.html(), /data-bk-guidance="listening"/); assert.equal(textMarkup(actionSentence(speakerUI.html())), 'Ask questions or follow up while others speak.');
  assert.match(listenerUI.html(), /data-bk-guidance="speaking"/); assert.equal(textMarkup(actionSentence(listenerUI.html())), 'Explain your answer. Respond to questions.');
  for (const ui of [thinkerUI, speakerUI, listenerUI]) {
    const shownSentence = textMarkup(actionSentence(ui.html()));
    await ui.clickGuidance();
    assert.equal(ui.sent.length, 0, 'reading or clicking a guidance sentence never sends room commands');
    await ui.click('toggleRole');
    assert.equal(actionSentence(ui.html()), '', 'hiding the role card also hides its action sentence');
    assert.doesNotMatch(privateMarkup(ui.html()), /YOU ARE|bk-role-title|bk-role-art|bk-role-purpose|data-bk-guidance|PRIVATE_TEST_ANSWER_|Private fact/);
    await ui.click('toggleRole');
    assert.match(privateMarkup(ui.html()), /<p class="bk-role-kicker">YOU ARE<\/p>/);
    assert.equal(textMarkup(actionSentence(ui.html())), shownSentence, 'Show restores the latest Spotlight guidance');
    assert.equal(ui.sent.length, 0, 'hiding a card stays local');
  }
});
test('private preparation guidance matches the owner role and disappears when the card is hidden', async () => {
  const state = fixture('prepare');
  for (const member of state.rooms.UITEST.members) {
    const view = project(state, member.identityId), h = await harness(view, { card: true });
    const expected = { thinker: /Think of questions, then tap Ready\./, truthful: /Review the answer, then tap Ready\./, bluffer: /Think of your explanation, then tap Ready\./ }[view.privateCard.role];
    assert.match(h.html(), /data-bk-guidance="prepare"/); assert.match(h.html(), expected);
    assert.deepEqual(h.voiceCues(), []); assert.ok(h.button('ready'));
    await h.click('toggleRole');
    assert.doesNotMatch(h.html(), /YOU ARE|data-bk-guidance="prepare"|PRIVATE_TEST_ANSWER_|Review the answer|Think of your explanation|Think of questions|bk-role-art|bk-role-title|bk-role-purpose/);
    assert.equal(h.sent.length, 0);
  }
});
test('everyone heard and reveal guidance keep conversation open while progression stays manual', async () => {
  const state = fixture(), room = state.rooms.UITEST;
  act(state, 'nextSpotlight'); act(state, 'nextSpotlight');
  const thinker = await harness(project(state), { card: true }), other = await harness(project(state, 'identity-2'), { card: true }), shared = await harness(project(state));
  assert.match(thinker.html(), /data-bk-guidance="thinker"/); assert.equal(textMarkup(actionSentence(thinker.html())), 'Ask more questions, or choose the Truth Teller.');
  assert.match(other.html(), /data-bk-guidance="open"/); assert.equal(textMarkup(actionSentence(other.html())), 'Ask more questions, or defend your answer.');
  assert.match(shared.html(), /data-bk-guidance="public"/); assert.equal(textMarkup(actionSentence(shared.html())), 'Ask questions and compare everyone’s answers.');
  assert.doesNotMatch(shared.html(), /YOU ARE|PRIVATE_TEST_ANSWER_|Private fact/);
  assert.deepEqual(other.voiceCues(), []); assert.equal(thinker.button('identify').disabled, false);
  for (const ui of [thinker, other, shared]) { await ui.clickGuidance(); assert.equal(ui.sent.length, 0); }
  act(state, 'identify', 'identity-0', { targetId: room.round.truthfulId });
  const revealed = await harness(project(state));
  assert.match(revealed.html(), /data-bk-guidance="reveal"/); assert.match(revealed.html(), /Discuss the answer\. Continue when everyone is ready\./);
  assert.deepEqual(revealed.voiceCues(), []); assert.ok(revealed.button('nextRound')); assert.equal(revealed.sent.length, 0);
});

test('service-enabled original cards can start and prepare without host-only controls', async () => {
  for (const phase of ['lobby', 'prepare']) {
    const state = fixture(phase, 4); state.rooms.UITEST.sharedControls = true;
    const h = await harness(project(state, 'identity-3'), { card: true });
    const action = phase === 'lobby' ? 'start' : 'beginDiscussion';
    assert.ok(h.button(action)); assert.ok(h.button('manage')); assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_/);
    await h.click(action); assert.equal(h.sent.at(-1).action, action);
    assert.equal(h.button('identify'), undefined);
  }
});
test('service-enabled reveal allows an online Bluffer to continue, while its own role stays private', async () => {
  const state = fixture('discussion', 4); state.rooms.UITEST.sharedControls = true;
  for (let i = 0; i < 3; i++) act(state, 'nextSpotlight');
  act(state, 'identify', 'identity-0', { targetId: state.rooms.UITEST.round.truthfulId });
  const h = await harness(project(state, 'identity-3'), { card: true });
  assert.ok(h.button('nextRound')); await h.click('nextRound'); assert.equal(h.sent.at(-1).action, 'nextRound');
});
test('offline recovery is a confirmed card action after grace and needs three connected players', async () => {
  const state = fixture('discussion', 4), room = state.rooms.UITEST; room.sharedControls = true;
  for (const p of room.members) if (p.identityId !== 'identity-0') p.lastSeen = 70001;
  const view = E.projectView(state, 'identity-3', 'UITEST', bank, { private: true, now: 70001 });
  const h = await harness(view, { card: true }); assert.ok(h.button('recover')); assert.equal(h.button('recover').disabled, false);
  await h.click('recover'); assert.equal(h.sent.length, 0); assert.equal(h.node('bk-confirm').open, true); await h.confirm();
  assert.equal(h.sent.at(-1).action, 'recover'); assert.equal(h.sent.at(-1).roundId, room.round.id);
  assert.equal(h.button('identify'), undefined); assert.doesNotMatch(h.html(), /PRIVATE_TEST_ANSWER_/);
  const two = clone(view); two.players[1].connected = false; const waiting = await harness(two, { card: true });
  assert.equal(waiting.button('recover').disabled, true); assert.match(waiting.html(), /At least 3 players/);
  const grace = clone(view); grace.recovery.available = false; const short = await harness(grace, { card: true }); assert.equal(short.button('recover'), undefined);
});

function currentHubTest(count=3){
 const setup={code:'UITEST',playerCount:count,tokens:Array.from({length:count},(_,i)=>(i+1).toString(16).repeat(20)),names:Array.from({length:count},(_,i)=>'New Hub '+(i+1))};
 const sessions=setup.tokens.map((originalToken,i)=>({originalToken,name:setup.names[i],playerId:'assigned-'+i,credential:{version:2,room:setup.code,token:(i+1).toString(16).repeat(64),identityId:(i+1).toString(16).repeat(40),historyToken:(i+5).toString(16).repeat(64)}}));
 const values=new Map(setup.tokens.map(token=>[token,{game:'scene',round:'scene-round-one',name:'Old scene player'}])),writes=[];
 const room={enabled:true,code:setup.code,count,name:i=>setup.names[i],init(){},playerRef(i){const token=setup.tokens[i];return {key:token,once:async()=>({val:()=>clone(values.get(token))}),async transaction(update){
   const old=clone(values.get(token)),next=update(old);if(next!==undefined){values.set(token,clone(next));writes.push(token);}
   return {committed:next!==undefined,snapshot:{val:()=>clone(values.get(token))}};
 }}}};
 const lobby=project(fixture('lobby'));lobby.players=setup.names.map((name,i)=>({id:'assigned-'+i,name,seated:true,connected:true,score:0}));lobby.self={name:'Host',isHost:true,isFormal:false};
 return {setup,sessions,values,writes,room,lobby};
}
const flushUI=async()=>{for(let i=0;i<120;i++)await Promise.resolve();};
test('Hub opening uses the current ROOM after init rather than saved old-room members, and explicit invite URLs preserve their selected room',async()=>{
 const f=currentHubTest(),old={...f.setup,code:'OLDTAB',names:['Older A','Older B','Older C']};
 const room={...f.room,init(){}};const h=await harness(f.lobby,{setup:old,transport:{room,sessions:f.sessions,initializedSetup:f.setup}});
 // current ROOM is authoritative at import, even if the earlier stored setup was another table.
 assert.equal(h.cardCreates[0].code,f.setup.code);assert.deepEqual(h.cardCreates[0].setup,f.setup);
 assert.doesNotMatch(h.html(),/Older A|Older B|Older C/);
 const invite=await harness(project(fixture()),{setup:f.setup,search:'?room=INVITE'});
 assert.equal(invite.cardCreates.length,0);assert.deepEqual(invite.connections,[['INVITE']]);
});
test('obsolete roster import errors stay pending instead of reconnecting and exposing the old game',async()=>{
 const f=currentHubTest(),h=await harness(project(fixture('prepare')),{setup:f.setup,transport:{importError:{code:'roster_locked',message:'Old roster cannot be adopted'}}});
 assert.equal(h.connections.length,0);assert.equal(h.publications.length,0);assert.doesNotMatch(h.html(),/Player 1|Alex/);
 assert.match(h.node('bk-error').textContent,/already underway/);
});
test('Hub import waits for all exact-card CAS publications and service registration before showing the new lobby',async()=>{
 const f=currentHubTest();let release;const gate=new Promise(resolve=>{release=resolve;}),registered=[];
 const h=await harness(project(fixture('prepare')),{setup:f.setup,transport:{room:f.room,sessions:f.sessions,createdView:f.lobby,executor:{
  install(){},async ready(){return true;},async ensureBluff(){registered.push(f.setup.tokens.every(token=>f.values.get(token).game==='bluffking'));await gate;}
 }}});
 assert.deepEqual(registered,[true]);assert.doesNotMatch(h.html(),/New Hub|Alex|Player 1/);
 assert.equal(f.writes.length,3);release();await flushUI();assert.match(h.html(),/New Hub 1/);assert.ok(h.button('start'));assert.equal(h.sent.length,0);
});
test('same active original bindings are left untouched, retaining mailbox and presence while reconnecting',async()=>{
 const f=currentHubTest();
 f.sessions.forEach((slot,i)=>f.values.set(slot.originalToken,{game:'bluffking',name:f.setup.names[i],playerNum:i+1,bluff:slot.credential,keep:'private original metadata',heartbeat:123,bluffAction:{action:'ready'}}));
 const before=clone([...f.values.entries()]);
 const h=await harness(project(fixture('prepare')),{setup:f.setup,transport:{room:f.room,sessions:f.sessions}});
 assert.deepEqual([...f.values.entries()],before);assert.deepEqual(f.writes,[]);assert.ok(h.button('beginDiscussion'));assert.equal(h.sent.length,0);
});
test('a newer scene round wins against an old delayed import, while ordinary same-round presence or phase changes may continue',async()=>{
 for(const newer of [true,false]){
  const f=currentHubTest(),h=await harness(f.lobby,{setup:f.setup,transport:{room:f.room,sessions:f.sessions,beforeImport(){
   const card=f.values.get(f.setup.tokens[0]);f.values.set(f.setup.tokens[0],{...card,round:newer?'scene-round-two':card.round,phase:'VOTE',heartbeat:999,votes:{2:'yes'}});
  }}});
  if(newer){assert.equal(f.values.get(f.setup.tokens[0]).round,'scene-round-two');assert.ok(!f.writes.includes(f.setup.tokens[0]));assert.match(h.node('bk-error').textContent,/another game/);assert.doesNotMatch(h.html(),/New Hub/);}
  else{assert.equal(f.writes.length,3);assert.match(h.html(),/New Hub 1/);}
 }
});
test('another Hub tab changing the stored code, names or tokens aborts old-card publication even when ROOM remains stale',async()=>{
 for(const change of ['code','names','tokens']){
  const f=currentHubTest(),h=await harness(f.lobby,{setup:f.setup,transport:{room:f.room,sessions:f.sessions,beforeImport({storage}){
   const next=clone(f.setup);if(change==='code'){next.code='NEWTAB';storage.set('room-last-session',next.code);}
   else if(change==='names')next.names[0]='Different person';else next.tokens[0]='f'.repeat(20);
   storage.set('room-session-'+next.code,JSON.stringify(next));
  }}});
  assert.equal(f.writes.length,0);assert.match(h.node('bk-error').textContent,/Hub room changed/);assert.doesNotMatch(h.html(),/New Hub/);
 }
});
test('an existing unsupported Hub count is rejected before ROOM.init can silently clamp and rewrite its roster',async()=>{
 for(const count of [2,3.5]){const f=currentHubTest(count);let initialized=0;f.room.init=()=>{initialized++;f.room.count=3;};
 const h=await harness(null,{setup:f.setup,transport:{room:f.room}});
 assert.equal(initialized,0);assert.equal(h.cardCreates.length,0);assert.equal(f.writes.length,0);assert.equal(f.room.count,count);
 assert.equal(h.storage.get('room-session-'+f.setup.code),JSON.stringify(f.setup));
 assert.match(h.node('bk-error').textContent,/Three to nine/);}
});

test('a held original-card CAS keeps import deferred until explicit registration completes, including reconnect refreshes',async()=>{
 const f=currentHubTest();let releaseCAS,releaseService;
 const casGate=new Promise(resolve=>{releaseCAS=resolve;}),serviceGate=new Promise(resolve=>{releaseService=resolve;});
 const originalRef=f.room.playerRef.bind(f.room);
 f.room.playerRef=i=>{const ref=originalRef(i);if(i===0){const transaction=ref.transaction;ref.transaction=async(...args)=>{await casGate;return transaction(...args);};}return ref;};
 const registrations=[],transport={room:f.room,sessions:f.sessions,createdView:f.lobby,executor:{
  install(){},async ready(){return true;},async ensureBluff(client){registrations.push({deferred:client.executorDeferred,allPublished:f.setup.tokens.every(token=>f.values.get(token).game==='bluffking')});await serviceGate;}
 }};
 const h=await harness(project(fixture('prepare')),{setup:f.setup,transport});
 assert.equal(transport.client.executorDeferred,true);assert.equal(registrations.length,0);
 await transport.client.refresh();assert.equal(transport.client.executorDeferred,true);assert.equal(registrations.length,0);
 assert.doesNotMatch(h.html(),/Alex|New Hub/);releaseCAS();await flushUI();
 assert.deepEqual(registrations,[{deferred:true,allPublished:true}]);assert.equal(transport.client.executorDeferred,true);
 releaseService();await flushUI();assert.equal(transport.client.executorDeferred,false);assert.match(h.html(),/New Hub 1/);
});
