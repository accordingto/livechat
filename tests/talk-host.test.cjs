'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const E = require('../talk-engine.js');
const preferences = require('../talk-settings.js');
const topics = require('../talk-topics.js');
function fixture({ saved = {}, initial = null, pending = false } = {}) {
  const html = fs.readFileSync(require.resolve('../lets-talk.html'), 'utf8');
  class Element {
    constructor(tag = 'DIV') {
      this.tagName = tag; this.options = []; this.dataset = {}; this.listeners = {}; this.hidden = false;
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
    setAttribute() {}
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
    now() { return 1000; }
    async start(options) {
      created.push(structuredClone(options));
      this.doc.state = E.create({ ...options, id: 'new-host-topic', now: 1000, roster: initial.roster });
      this.options.onChange(this.doc.state); return this.doc.state;
    }
    async command(type, extra) {
      commands.push({ type, ...extra });
      this.doc.state = E.apply(this.doc.state, { ...extra, type, actor: 0, id: 'host-' + commands.length,
        sessionId: this.doc.state.sessionId, turnId: this.doc.state.turnId, now: 1000, seed: 35 });
      this.options.onChange(this.doc.state);
      const error = this.doc.state.replies[0]?.error; if (error) throw Error(error);
      return this.doc.state;
    }
  }
  const context = vm.createContext({
    structuredClone, URLSearchParams, crypto: webcrypto, localStorage: storage, setInterval: () => 1, clearInterval() {},
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
  return { elements, created, commands, storage, host, click: id => elements['talk-' + id].fire('click'), submit: () => elements['talk-setup'].fire('submit') };
}
test('saved custom seconds and homepage modes survive host hydration and opening the topic', async () => {
  const f = fixture({ saved: { gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', seconds: 20, crazySeconds: 60 } });
  assert.equal(f.elements['talk-seconds'].value, '20');
  assert.ok(f.elements['talk-seconds'].options.some(option => option.value === '20'));
  await f.submit();
  assert.equal(f.created[0].seconds, 20); assert.equal(f.created[0].conversationMode, 'free');
  assert.equal(f.created[0].crazySource, 'players'); assert.equal(f.created[0].gameMode, 'crazy');
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
