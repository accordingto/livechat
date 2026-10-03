'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const repo = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));

function frameHarness() {
  const source = fs.readFileSync(path.join(repo, 'play.html'), 'utf8');
  const scope = source.indexOf('let wolfCardFrame = null;');
  assert.ok(scope >= 0, 'test must exercise the real original player-card frame');
  const start = source.indexOf("window.addEventListener('message', event => {", scope);
  const end = source.indexOf('let talkConnected', start);
  assert.ok(start > scope && end > start, 'actual scoped popup message listener must be present');
  // Evaluate the actual listener from play.html, not a hand-written replica.
  const code = source.slice(start, end);
  let handler;
  const calls = [], contentWindow = Object.freeze({ syntheticFrame: true });
  const frame = { contentWindow, scrollIntoView: options => calls.push(['frame', clone(options)]) };
  const sandbox = {
    wolfCardFrame: frame,
    location: Object.freeze({ origin: 'https://player-card.example' }),
    window: {
      addEventListener(type, callback) { assert.equal(type, 'message'); assert.equal(handler, undefined); handler = callback; },
      scrollTo: options => calls.push(['window', clone(options)]),
    },
    // The parent may position its own frame, but never receives or stores card
    // content. These throw if this small handler grows an unrelated data sink.
    localStorage: { getItem() { throw new Error('parent must not read card storage'); },
      setItem() { throw new Error('parent must not store card data'); } },
    sessionStorage: { setItem() { throw new Error('parent must not store card data'); } },
    console: { log() { throw new Error('parent must not log private messages'); } },
  };
  Object.defineProperty(sandbox, 'document', { get() { throw new Error('parent must not surface instruction text'); } });
  vm.runInNewContext(code, sandbox, { filename: 'play.html:direction-notice-listener' });
  assert.equal(typeof handler, 'function');
  const event = (overrides = {}) => ({ origin: sandbox.location.origin, source: contentWindow,
    data: { type: 'chat-wolf-direction-notice' }, ...overrides });
  return { handler, event, calls, sandbox, frame, contentWindow };
}

test('actual original-card handler scrolls only its same-origin player iframe and then the parent top', () => {
  const h = frameHarness();
  h.handler(h.event());
  assert.deepEqual(h.calls, [
    ['frame', { block: 'start', behavior: 'instant' }],
    ['window', { top: 0, behavior: 'instant' }],
  ]);
});

test('unknown origin, different iframe, incorrect notice type and missing frame cannot move the parent', () => {
  const h = frameHarness();
  const ignored = [
    { origin: 'https://elsewhere.example' },
    { origin: h.sandbox.location.origin + '.untrusted.example' },
    { source: {} },
    { source: null },
    { data: { type: 'some-other-popup' } },
    { data: null },
    { data: {} },
  ];
  for (const override of ignored) h.handler(h.event(override));
  assert.deepEqual(h.calls, []);
  h.sandbox.wolfCardFrame = null;
  h.handler(h.event());
  assert.deepEqual(h.calls, []);
});

test('a replaced original-card iframe rejects the old frame even when its origin and message type match', () => {
  const h = frameHarness();
  const replacementWindow = {};
  h.sandbox.wolfCardFrame = { contentWindow: replacementWindow,
    scrollIntoView: options => h.calls.push(['replacement', clone(options)]) };
  h.handler(h.event());
  assert.deepEqual(h.calls, []);
  h.handler(h.event({ source: replacementWindow }));
  assert.deepEqual(h.calls, [
    ['replacement', { block: 'start', behavior: 'instant' }],
    ['window', { top: 0, behavior: 'instant' }],
  ]);
});

test('parent handler reads only the notice type, never incoming instruction text, sender, role or private card', () => {
  const h = frameHarness(), reads = [];
  const data = new Proxy(Object.freeze({ type: 'chat-wolf-direction-notice',
    text: 'SENSITIVE INSTRUCTION', sender: 'SENSITIVE DIRECTOR', role: 'SENSITIVE ROLE',
    privateCard: { token: 'SENSITIVE TOKEN' } }), {
    get(target, key) { reads.push(key); assert.equal(key, 'type'); return target[key]; },
    set() { throw new Error('parent must not rewrite or save card data'); },
  });
  h.handler(h.event({ data }));
  assert.deepEqual(reads, ['type']);
  assert.equal(h.calls.length, 2);
  assert.equal(JSON.stringify(h.calls).includes('SENSITIVE'), false);
  assert.equal(Object.keys(h.sandbox.window).sort().join(','), 'addEventListener,scrollTo');
});

function recipientUI(embeddedCard) {
  const browser = { CHAT_WOLF_V3_RULES: RULES };
  const topic = { id: 'fixture-topic', category: 'Everyday life', mainQuestion: 'What surprised you today?',
    entryPrompts: [], followUps: [] };
  browser.CHAT_WOLF_V3_CONTENT = { topics: [topic] };
  const context = { window: browser };
  vm.createContext(context);
  for (const file of ['chat-wolf-copy.js', 'chat-wolf-v3-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context);
  }
  const state = {
    public: { code: 'TEST01', rulesVersion: 3, flowVersion: 4, matchId: 'fixture-match', gameNumber: 1,
      phase: 'TALK', round: 1, totalRounds: 3, players: [{ id: 'host', name: 'Alex', isHost: true, ready: true }],
      settings: { ...RULES.defaults }, topic, usedFollowUpIds: [], activeFollowUp: null,
      voteHistory: [], deadlineAt: null, paused: false },
    private: { playerId: 'host', name: 'Alex', isHost: true, role: 'JESTER', profession: null,
      tasks: null, wolfTeam: null, villageTask: null, actions: {},
      secretDirection: { id: 'host-notice', text: 'PRIVATE HOST INSTRUCTION', completed: null, swapsRemaining: 1,
        noticeShownAt: null, noticeUnlockAt: null, noticeAcknowledgedAt: null } },
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  return browser.CHAT_WOLF_V3_UI.create({ esc: escape, getState: () => state, now: () => 1000,
    embeddedCard, playerName: () => 'Alex', action: async () => true, roomBar: () => '<header>Presentation</header>',
    timer: () => '', playerRows: () => '', showToast: () => {}, rerender: () => {}, privateCardUrl: () => '/card' });
}

test('participating host may receive the popup in their original private embedded card, not on their host presentation', () => {
  const privateHtml = recipientUI(true).render();
  assert.match(privateHtml, /role="dialog" aria-modal="true"/);
  assert.match(privateHtml, /PRIVATE HOST INSTRUCTION/);
  assert.match(privateHtml, /Keep this direction open/);
  assert.doesNotMatch(privateHtml, /data-direction-notice-close/);
  const presentationHtml = recipientUI(false).render();
  assert.doesNotMatch(presentationHtml, /role="dialog"|PRIVATE HOST INSTRUCTION|data-direction-notice-id|direction-notice-reopen/);
});
