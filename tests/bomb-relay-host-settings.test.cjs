'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const E = require('../bomb-relay-engine.js');
const DECK = require('../bomb-relay-deck.js');
const copy = value => JSON.parse(JSON.stringify(value));

// Execute the actual host controller. The transport deliberately commits and
// resolves BEFORE delivering onChange, reproducing Firebase's two async paths.
function hostFixture() {
  let onChange, onStatus, failNext = false, lastStart = null, commandId = 0;
  let transport = null;
  let canonical = E.create({ id: 'host-settings', roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'P' + playerNum })), now: 10000, seed: 1 });
  const elements = new Map(), listeners = new Map();
  const selectIds = new Set(['fuse', 'manage-speed', 'cards', 'category', 'library-category', 'demo-view']);
  const document = { activeElement: null, body: { classList: { toggle() {} } } };
  const element = id => {
    if (elements.has(id)) return elements.get(id);
    let value = '', html = '';
    const item = { id: 'br-' + id, dataset: {}, disabled: false, checked: id === 'scale', hidden: false, open: false,
      textContent: '', min: '', max: '', placeholder: '',
      get value() { return value; }, set value(next) { value = String(next); },
      get innerHTML() { return html; }, set innerHTML(next) {
        html = String(next);
        if (selectIds.has(id)) value = html.match(/<option value="([^"]*)"/)?.[1] || '';
      },
      addEventListener(type, handler) { listeners.set(id + ':' + type, handler); },
      setAttribute() {},
      close() { this.open = false; }, showModal() { this.open = true; },
      focus() { document.activeElement = this; },
      reportValidity() {
        if (value === '') return true;
        const number = Number(value);
        return Number.isInteger(number) && (!this.min || number >= Number(this.min)) && (!this.max || number <= Number(this.max));
      },
    };
    elements.set(id, item); return item;
  };
  document.getElementById = id => element(id.replace(/^br-/, ''));
  class Transport {
    constructor(options) { onChange = options.onChange; onStatus = options.onStatus; this.count = 3; this.connected = true; this.own = true; this.suspended = false; transport = this; }
    connect() { onStatus('ready'); onChange(copy(canonical)); }
    now() { return 11000 + commandId; }
    async command(type, extra) {
      if (failNext) { failNext = false; throw new Error('offline'); }
      canonical = E.apply(canonical, { ...extra, id: 'settings-' + (++commandId), type, actor: 0,
        sessionId: canonical.sessionId, turnId: canonical.turnId, now: this.now(), seed: 1 });
      return copy(canonical);
    }
    async start(options) { lastStart = copy(options); return copy(canonical); }
    close() {}
  }
  class Sound { constructor() { this.enabled = false; } stopLoop() {} follow() {} close() {} }
  const context = vm.createContext({ document, URLSearchParams, location: { search: '' }, crypto: require('node:crypto').webcrypto,
    localStorage: { getItem: key => key === 'room-last-session' ? 'HOST_SETTINGS_QA' : JSON.stringify({ tokens: ['a', 'b', 'c'], playerCount: 3 }) },
    ROOM: { enabled: true, code: 'HOST_SETTINGS_QA', init() {} }, firebase: { database: () => ({}) },
    BOMB_RELAY_ENGINE: E, BOMB_RELAY_DECK: DECK,
    BOMB_RELAY_SYNC: { Host: Transport, uid: () => 'host-setting-request' },
    BOMB_RELAY_UI: { t: key => key, esc: String, list: value => Array.isArray(value) ? value : Object.values(value || {}),
      Sound, stage: () => '', nameOf: () => 'P1', colorOf: () => '#000' },
    I18N: { lang: 'en', applyStatic() {}, onChange() {} },
    setInterval: () => 1, clearInterval() {}, setTimeout,
    window: { addEventListener(type, handler) { listeners.set('window:' + type, handler); } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'bomb-relay-host.js'), 'utf8'), context);
  const change = async (id, value) => {
    if (typeof value === 'boolean') element(id).checked = value;
    else element(id).value = value;
    await listeners.get(id + ':change')({ target: element(id) });
  };
  return { element, change,
    get canonical() { return copy(canonical); }, get state() { return copy(context.window.BOMB_RELAY_HOST.state); },
    get lastStart() { return lastStart; },
    deliver(value = canonical) { onChange(copy(value)); }, repaint() { onStatus('ready'); },
    failNext() { failNext = true; }, switched() { onStatus('switched'); },
    // The room moved to another game: the transport suspends itself.
    suspend() { transport.suspended = true; onStatus('switched'); },
    submit() { return listeners.get('setup:submit')({ preventDefault() {} }); },
    restart() { return context.window.BOMB_RELAY_HOST.start({ restart: true }); },
  };
}

test('host preserves a committed settings preview until its delayed value event confirms it', async () => {
  const host = hostFixture();
  await host.change('manage-speed', 'fast');
  const firstAck = host.canonical;
  assert.equal(host.state.settingsTiming.speedMode, 'normal', 'transport value delivery is still pending');
  assert.equal(host.element('manage-speed').value, 'fast', 'transaction completion cannot repaint the old mode');
  await host.change('manage-scale', false);
  const secondAck = host.canonical;
  assert.deepEqual(secondAck.settingsTiming, { speedMode: 'fast', scaleWithPlayers: false });
  host.repaint();
  assert.equal(host.element('manage-scale').checked, false, 'an unrelated render cannot revert the native checkbox');
  host.deliver(firstAck);
  assert.equal(host.element('manage-scale').checked, false, 'an older acknowledgement cannot clear a newer requested preview');
  host.deliver(secondAck);
  assert.deepEqual(host.state.settingsTiming, secondAck.settingsTiming);
  const later = copy(secondAck); later.settingsTiming = { speedMode: 'chill', scaleWithPlayers: true };
  host.deliver(later);
  assert.equal(host.element('manage-speed').value, 'chill', 'matching acknowledgement released the preview');
  assert.equal(host.element('manage-scale').checked, true);
});

test('host restores canonical controls when a requested setting fails', async () => {
  const host = hostFixture();
  host.failNext(); await host.change('manage-speed', 'fast');
  assert.equal(host.element('manage-speed').value, 'normal');
  assert.equal(host.element('error').textContent, 'offline');
  assert.equal(host.canonical.settingsTiming.speedMode, 'normal');
});

test('host clears unconfirmed settings previews when the room changes session or game', async () => {
  const host = hostFixture();
  await host.change('manage-speed', 'fast');
  const next = host.canonical; next.sessionId = 'replacement';
  next.settingsTiming = { speedMode: 'chill', scaleWithPlayers: false, baseMinSeconds: 20, baseMaxSeconds: 45 };
  host.deliver(next);
  assert.equal(host.element('manage-speed').value, 'chill');
  assert.equal(host.element('manage-min').value, '20');
  assert.equal(host.element('manage-max').value, '45');
  // A separate fixture keeps the simulated transport's session aligned.
  const switched = hostFixture();
  await switched.change('manage-speed', 'fast'); switched.switched();
  assert.equal(switched.element('manage-speed').value, 'normal');
});

test('Restart retains both committed custom bounds while their value event is delayed', async () => {
  const host = hostFixture();
  await host.change('manage-min', '20');
  await host.change('manage-max', '25');
  assert.deepEqual(host.canonical.settingsTiming, { speedMode: 'normal', scaleWithPlayers: true, baseMinSeconds: 20, baseMaxSeconds: 25 });
  assert.equal(host.state.settingsTiming.baseMinSeconds, undefined, 'the room value event remains delayed');
  await host.restart();
  assert.deepEqual(host.lastStart.timing, host.canonical.settingsTiming);
});

test('after the room switched to another game, Start stays available and takes the cards back', async () => {
  const host = hostFixture();
  host.suspend();
  assert.equal(host.element('start').disabled, false, 'a suspended (switched) host can still start a new game');
  await host.submit();
  assert.ok(host.lastStart, 'Start reached the transport');
});
