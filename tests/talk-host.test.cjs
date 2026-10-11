'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const E = require('../talk-engine.js');
const preferences = require('../talk-settings.js');
const topics = require('../talk-topics.js');
function fixture({ saved = {}, initial = null, pending = false, time = 1000 } = {}) {
  let clock = time; const clockTasks = [];
  class FixtureDate extends Date { static now() { return clock; } }
  const html = fs.readFileSync(require.resolve('../lets-talk.html'), 'utf8');
  class Element {
    constructor(tag = 'DIV') {
      this.tagName = tag; this.options = []; this.dataset = {}; this.listeners = {}; this.attributes = {}; this.hidden = false;
      this.classList = { toggle() {} }; this.parentElement = { setAttribute() {} }; this._value = ''; this._html = '';
    }
    get value() { return this._value; }
    set value(value) { value = String(value); this._value = this.tagName === 'SELECT' && !this.options.some(o => o.value === value) ? '' : value; }
    get innerHTML() { return this._html; }
    set innerHTML(value) {
      this._html = value;
      if (this.tagName === 'SELECT') {
        this.options = [...value.matchAll(/<option\b([^>]*)>(.*?)<\/option>/g)].map(m => ({ value: m[1].match(/value="([^"]*)"/)?.[1] || '', textContent: m[2], selected: /\bselected\b/.test(m[1]) }));
        this._value = this.options.find(o => o.selected)?.value || this.options[0]?.value || '';
      }
    }
    append(option) { this.options.push(option); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    focus() {}
    querySelectorAll(selector) { return selector === 'option' ? this.options : []; }
    async fire(name) { return this.listeners[name]?.({ preventDefault() {}, target: this }); }
  }
  const elements = {};
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) elements[match[2]] = new Element(match[1].toUpperCase());
  for (const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) elements[match[1]].innerHTML = match[2];
  const stored = new Map([[preferences.key, JSON.stringify(saved)]]);
  if (initial) {
    stored.set('room-last-session', 'test'); stored.set('room-session-test', JSON.stringify({ tokens: ['fixture-a', 'fixture-b'] }));
  }
  const storage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) };
  if (pending) preferences.markPending(storage);
  const dictionaries = {}, created = [], commands = []; let host;
  class Host {
    constructor(options) { this.options = options; this.connected = true; this.own = true; host = this; this.doc = { state: structuredClone(initial) }; }
    connect() { this.options.onStatus('ready'); this.options.onChange(this.doc.state); }
    now() { return clock; }
    async start(options) {
      created.push(structuredClone(options));
      this.doc.state = E.create({ ...options, id: 'new-host-topic', now: clock, roster: initial.roster });
      this.options.onChange(this.doc.state); return this.doc.state;
    }
    async command(type, extra) {
      commands.push({ type, ...extra });
      this.doc.state = E.apply(this.doc.state, { ...extra, type, actor: 0, id: 'host-' + commands.length,
        sessionId: this.doc.state.sessionId, turnId: this.doc.state.turnId, now: clock, seed: 35 });
      this.options.onChange(this.doc.state);
      const error = this.doc.state.replies[0]?.error; if (error) throw Error(error);
      return this.doc.state;
    }
  }
  const context = vm.createContext({
    structuredClone, URLSearchParams, Date: FixtureDate, crypto: webcrypto, localStorage: storage, setInterval: fn => { clockTasks.push(fn); return clockTasks.length; }, clearInterval() {},
    location: { search: initial ? '' : '?demo=1' }, window: { addEventListener() {} },
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag.toUpperCase()), body: new Element('BODY') },
    I18N: { lang: 'en', registerDict: (ns, dict) => { dictionaries[ns] = dict; }, onChange() {}, t: (ns, key) => dictionaries[ns]?.[key]?.en || key },
    ROOM: { enabled: true, code: 'FIXTURE', init() {} }, firebase: { database: () => ({}) },
    TALK_ENGINE: { ...E, create(options) { created.push(structuredClone(options)); return E.create(options); } },
    TALK_SETTINGS: { ...preferences, read: () => preferences.read(storage), save: value => preferences.save(value, storage), consumePending: () => preferences.consumePending(storage) },
    TALK_SYNC: { Host, uid: () => 'fixture-' + Math.random() }, ...topics,
  });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-ui.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../talk-host.js'), 'utf8'), context);
  return { elements, created, commands, storage, host, hydrate: next => { host.doc.state = structuredClone(next); host.options.onChange(host.doc.state); }, advance: async value => { clock = value; for (const task of clockTasks) task(); await new Promise(resolve => setImmediate(resolve)); }, click: id => elements['talk-' + id].fire('click'), submit: () => elements['talk-setup'].fire('submit') };
}
test('saved custom seconds and homepage modes survive host hydration and opening the topic', async () => {
  const f = fixture({ saved: { gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', seconds: 20, crazyMinSeconds: 10, crazyMaxSeconds: 45 } });
  assert.equal(f.elements['talk-seconds'].value, '20');
  assert.ok(f.elements['talk-seconds'].options.some(option => option.value === '20'));
  await f.submit();
  assert.equal(f.created[0].seconds, 20); assert.equal(f.created[0].conversationMode, 'free');
  assert.equal(f.created[0].crazySource, 'players'); assert.equal(f.created[0].gameMode, 'crazy');
  assert.equal(f.created[0].crazyMinSeconds, 10); assert.equal(f.created[0].crazyMaxSeconds, 45);
});
test('restored player settings remain selected when the host opens the next topic', async () => {
  const initial = E.create({ id: 'old', now: 1000, topic: { question: 'Choose a cafe.' }, seconds: 23,
    conversationMode: 'assigned', gameMode: 'crazy', crazySource: 'players', roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial });
  assert.equal(f.elements['talk-seconds'].value, '23');
  assert.equal(f.elements['talk-conversation-mode'].value, 'assigned');
  await f.click('new'); await f.submit();
  assert.equal(f.created[0].seconds, 23); assert.equal(f.created[0].conversationMode, 'assigned');
  assert.equal(f.created[0].crazySource, 'players');
});
test('old pending and active oral questions remain recoverable after removing request panels', async () => {
  let initial = E.create({ id: 'old', now: 1000, topic: { question: 'Choose a cafe.' },
    roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  initial = E.apply(initial, { id: 'start', type: 'start', actor: 0, now: 1000, seed: 25, sessionId: initial.sessionId });
  const asker = initial.speaker === 1 ? 2 : 1;
  initial.questions = [{ id: 'old-question', playerNum: asker }];
  const pending = fixture({ initial });
  await pending.click('help-end');
  assert.equal(pending.elements['talk-force-end'].hidden, false);
  await pending.click('force-end');
  assert.deepEqual(pending.commands.at(-1), { type: 'end', confirm: true });
  assert.notEqual(pending.host.doc.state.speaker, initial.speaker);
  initial.activeQuestion = { id: 'old-question', playerNum: asker };
  const active = fixture({ initial });
  assert.equal(active.elements['talk-help-resume'].hidden, false);
  await active.click('help-resume');
  assert.equal(active.host.doc.state.activeQuestion, null);
  assert.equal(active.elements['talk-help-end'].hidden, false);
});

test('explicit homepage changes open setup over an active topic until the organizer starts it', async () => {
  const initial = E.create({ id: 'active-topic', now: 1000, topic: { question: 'Keep the current conversation.' },
    conversationMode: 'assigned', gameMode: 'normal', roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial, pending: true, saved: { conversationMode: 'free', gameMode: 'crazy', crazySource: 'players' } });
  assert.equal(f.elements['talk-setup'].hidden, false);
  assert.equal(f.elements['talk-game-mode'].value, 'crazy');
  assert.equal(f.elements['talk-conversation-mode'].value, 'free');
  assert.equal(f.elements['talk-crazy-source'].value, 'players');
  assert.equal(f.created.length, 0); assert.equal(f.commands.length, 0);
  assert.equal(f.host.doc.state.sessionId, 'active-topic');
  assert.equal(preferences.consumePending(f.storage), false, 'one visit consumes the home intent');
  await f.click('cancel-setup');
  assert.equal(f.elements['talk-setup'].hidden, true);
  assert.equal(f.host.doc.state.sessionId, 'active-topic');
  assert.equal(f.host.doc.state.gameMode, 'normal');
  await f.click('new'); await f.submit();
  assert.equal(f.created[0].gameMode, 'crazy'); assert.equal(f.created[0].conversationMode, 'free');
  assert.equal(f.created[0].crazySource, 'players');
});

test('host rejects invalid intervals without creating a topic and starts after the range is corrected', async () => {
  const f = fixture({ saved: { gameMode: 'crazy', crazyMinSeconds: 20, crazyMaxSeconds: 90 } });
  f.elements['talk-crazy-min-seconds'].value = '150';
  await f.elements['talk-crazy-min-seconds'].fire('change'); await f.submit();
  assert.equal(f.created.length, 0);
  assert.equal(preferences.read(f.storage).crazyMinSeconds, 20);
  assert.ok(f.elements['talk-crazy-interval-error'].textContent);
  f.elements['talk-crazy-max-seconds'].value = '180';
  await f.elements['talk-crazy-max-seconds'].fire('change'); await f.submit();
  assert.equal(f.created[0].crazyMinSeconds, 150);
  assert.equal(f.created[0].crazyMaxSeconds, 180);
});
test('host restores a custom range from player settings into the next topic', async () => {
  const initial = E.create({ id: 'custom-range', now: 1000, topic: { question: 'A silly cafe.' }, gameMode: 'crazy',
    crazySource: 'players', crazyMinSeconds: 7, crazyMaxSeconds: 233, roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial });
  assert.equal(f.elements['talk-crazy-min-seconds'].value, '7');
  assert.equal(f.elements['talk-crazy-max-seconds'].value, '233');
  await f.click('new'); await f.submit();
  assert.equal(f.created[0].crazyMinSeconds, 7);
  assert.equal(f.created[0].crazyMaxSeconds, 233);
  assert.equal(f.created[0].crazySource, 'players');
});

test('host minute settings propagate custom round length and mission expiry without losing precision', async () => {
  const initial = E.create({ id: 'timed-old', now: 1000, topic: { question: 'Build a silly park.' },
    gameSeconds: 601, crazyTaskSeconds: 239, gameMode: 'crazy',
    roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial });
  assert.equal(Number(f.elements['talk-game-seconds'].value), 601 / 60);
  assert.equal(Number(f.elements['talk-crazy-task-seconds'].value), 239 / 60);
  await f.click('new'); await f.submit();
  assert.equal(f.created[0].gameSeconds, 601); assert.equal(f.created[0].crazyTaskSeconds, 239);
  f.elements['talk-game-seconds'].value = '0.5'; await f.submit();
  assert.equal(f.created.length, 1); assert.ok(f.elements['talk-host-error'].textContent);
  f.elements['talk-game-seconds'].value = '2'; f.elements['talk-crazy-task-seconds'].value = '0.1'; await f.submit();
  assert.equal(f.created.length, 1);
  f.elements['talk-crazy-task-seconds'].value = '2.5'; await f.submit();
  assert.equal(f.created[1].gameSeconds, 120); assert.equal(f.created[1].crazyTaskSeconds, 150);
});
test('host extends and finishes a round, shows rest and resets a new topic', async () => {
  let initial = E.create({ id: 'round-controls', now: 1000, topic: { question: 'Choose a mascot.' }, gameSeconds: 60,
    gameMode: 'crazy', roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  initial = E.apply(initial, { id: 'round-start', type: 'start', actor: 0, sessionId: initial.sessionId, now: 1000 });
  const f = fixture({ initial });
  assert.equal(f.elements['talk-round-controls'].hidden, false);
  await f.click('add-time');
  assert.deepEqual(f.commands.at(-1), { type: 'addTime', seconds: 60 });
  assert.equal(f.host.doc.state.gameDeadline, 121000);
  await f.click('finish');
  assert.equal(f.host.doc.state.phase, 'ended'); assert.equal(f.elements['talk-round-rest'].hidden, false);
  assert.equal(f.elements['talk-active-board'].hidden, true);
  assert.equal(f.elements['talk-participants-panel'].hidden, true);
  await f.click('new'); await f.submit();
  assert.equal(f.host.doc.state.phase, 'thinking'); assert.equal(f.host.doc.state.gameDeadline, 0);
  assert.ok(E.view(f.host.doc.state,0,1000).talk.scores.every(entry => entry.score === 0));
});
test('host demo automatically ends a normal round at its authoritative deadline', async () => {
  const f = fixture({ saved: { gameSeconds: 60 } });
  await f.submit(); await f.click('start');
  assert.equal(f.elements['talk-round-rest'].hidden, true);
  await f.advance(61000);
  assert.equal(f.elements['talk-round-rest'].hidden, false); assert.equal(f.elements['talk-active-board'].hidden, true);
  for (const id of ['start', 'help', 'extend', 'round-controls']) assert.equal(f.elements['talk-' + id].hidden, true);
  assert.equal(f.elements['talk-participants-panel'].hidden, false);
});

test('normal-room hydration preserves a saved mission duration when the next topic switches to Crazy', async () => {
  const initial = E.create({ id: 'normal-saved-duration', now: 1000, topic: { question: 'Invent a team badge.' },
    gameSeconds: 601, crazyTaskSeconds: 239, gameMode: 'normal',
    roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial });
  assert.equal(Number(f.elements['talk-crazy-task-seconds'].value), 239 / 60);
  await f.click('new'); f.elements['talk-game-mode'].value = 'crazy';
  await f.elements['talk-game-mode'].fire('change'); await f.submit();
  assert.equal(f.created[0].gameMode, 'crazy'); assert.equal(f.created[0].crazyTaskSeconds, 239);
});


test('the home host can mark a Talk participant away from the participant board without resetting the round', async () => {
  let initial = E.create({ id: 'home-membership', now: 1000, topic: { question: 'Keep the current plan.' }, conversationMode: 'assigned', sharedControls: true,
    roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }, { playerNum: 3, name: 'C' }] });
  initial = E.apply(initial, { id: 'begin', type: 'start', actor: 0, sessionId: initial.sessionId, now: 1000, seed: 5 });
  const f = fixture({ initial }), board = f.elements['talk-participants-content'];
  assert.match(board.innerHTML, /data-talk-action="exclude"/);
  await board.listeners.click({ target: { closest: () => ({ disabled: false, dataset: { player: '1', active: 'false' } }) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.commands.at(-1), { type: 'exclude', playerNum: 1, active: false });
  assert.equal(f.host.doc.state.sessionId, initial.sessionId); assert.equal(f.host.doc.state.gameDeadline, initial.gameDeadline);
  assert.equal(f.host.doc.state.roster[0].active, false); assert.equal(f.host.doc.state.speaker, 2);
});

test('normal and Crazy host clocks are hidden by default and the optional toggle only changes local presentation', async () => {
  for (const gameMode of ['normal', 'crazy']) {
    let initial = E.create({ id: 'optional-time-' + gameMode, now: 1000, gameMode, gameSeconds: 60,
      topic: { question: 'Invent a silly shop.' }, roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
    initial = E.apply(initial, { id: 'begin-clock', type: 'start', actor: 0, sessionId: initial.sessionId, now: 1000 });
    const f = fixture({ initial }), clock = f.elements['talk-clock'], toggle = f.elements['talk-clock-toggle'];
    const canonicalBefore = structuredClone(f.host.doc.state), savedBefore = preferences.read(f.storage);
    assert.equal(clock.hidden, true); assert.equal(clock.textContent, '');
    assert.equal(toggle.hidden, false); assert.equal(toggle.textContent, 'View time');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(f.elements['talk-add-time'].disabled, false); assert.equal(f.elements['talk-finish'].disabled, false);
    await f.click('clock-toggle');
    assert.equal(clock.hidden, false); assert.equal(clock.textContent, 'Round remaining 01:00');
    assert.equal(toggle.textContent, 'Hide time'); assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(f.commands.length, 0); assert.deepEqual(f.host.doc.state, canonicalBefore);
    await f.advance(6000); assert.equal(clock.textContent, 'Round remaining 00:55');
    await f.click('clock-toggle');
    assert.equal(clock.hidden, true); assert.equal(clock.textContent, '');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(f.commands.length, 0); assert.deepEqual(f.host.doc.state, canonicalBefore);
    assert.deepEqual(preferences.read(f.storage), savedBefore);
  }
});

test('host preparation remains visible, while starting, extending and finishing do not expose the round clock', async () => {
  const initial = E.create({ id: 'preparation-feedback', now: 1000, gameSeconds: 60,
    topic: { question: 'Design a funny park.' }, roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  const f = fixture({ initial }), clock = f.elements['talk-clock'], toggle = f.elements['talk-clock-toggle'];
  assert.equal(clock.hidden, false); assert.match(clock.textContent, /45/);
  assert.equal(toggle.hidden, true);
  await f.click('start');
  assert.equal(clock.hidden, true); assert.equal(clock.textContent, ''); assert.equal(toggle.hidden, false);
  await f.click('add-time'); assert.equal(f.host.doc.state.gameDeadline, 121000);
  assert.deepEqual(f.commands.at(-1), { type: 'addTime', seconds: 60 });
  assert.equal(clock.hidden, true); assert.equal(clock.textContent, '');
  await f.click('clock-toggle'); assert.equal(clock.hidden, false);
  await f.click('finish');
  assert.equal(f.host.doc.state.phase, 'ended'); assert.equal(toggle.hidden, true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false'); assert.equal(clock.hidden, true); assert.equal(clock.textContent, '');
});

test('visible host time survives same-session updates but resets when a new round session arrives', async () => {
  let initial = E.create({ id: 'visible-time-session', now: 1000, gameSeconds: 60,
    topic: { question: 'Plan a tiny parade.' }, roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  initial = E.apply(initial, { id: 'start-first', type: 'start', actor: 0, sessionId: initial.sessionId, now: 1000 });
  const f = fixture({ initial }); await f.click('clock-toggle');
  const updated = E.apply(initial, { id: 'other-player-adds-time', type: 'addTime', actor: 0, seconds: 60, sessionId: initial.sessionId, turnId: initial.turnId, now: 1000 });
  f.hydrate(updated);
  assert.equal(f.elements['talk-clock'].hidden, false); assert.equal(f.elements['talk-clock'].textContent, 'Round remaining 02:00');
  let next = E.create({ id: 'new-hidden-time-session', now: 1000, gameSeconds: 120, topic: { question: 'Invent a strange hotel.' }, roster: initial.roster });
  next = E.apply(next, { id: 'start-next', type: 'start', actor: 0, sessionId: next.sessionId, now: 1000 });
  f.hydrate(next);
  assert.equal(f.elements['talk-clock'].hidden, true); assert.equal(f.elements['talk-clock'].textContent, '');
  assert.equal(f.elements['talk-clock-toggle'].textContent, 'View time');
  assert.equal(f.elements['talk-clock-toggle'].getAttribute('aria-expanded'), 'false');
  assert.equal(f.commands.length, 0);
});

test('the shared Crazy host status exposes mission count while leaving its assignment and expiry clocks private', () => {
  let initial = E.create({ id: 'private-mission-timing', now: 1000, gameMode: 'crazy',
    crazyMinSeconds: 7, crazyMaxSeconds: 233, crazyTaskSeconds: 239, gameSeconds: 900,
    topic: { question: 'Build an imaginary cafe.' }, roster: [{ playerNum: 1, name: 'A' }, { playerNum: 2, name: 'B' }] });
  initial = E.apply(initial, { id: 'start-private-timing', type: 'start', actor: 0, sessionId: initial.sessionId, now: 1000 });
  initial.crazy.prompts = { 2: { id: 'synthetic-prompt', status: 'pending', expiresAt: 240000, at: 1000, text: 'Talk to a synthetic spoon.', kind: 'task', source: 'system' } };
  const f = fixture({ initial });
  assert.equal(f.elements['talk-crazy-status'].textContent, '1/2 active missions');
  assert.equal(f.elements['talk-clock'].textContent, '');
  assert.equal(f.host.doc.state.crazy.prompts[2].expiresAt, 240000);
  assert.equal(f.host.doc.state.crazy.minSeconds, 7); assert.equal(f.host.doc.state.crazy.maxSeconds, 233);
  assert.equal(f.commands.length, 0);
});
