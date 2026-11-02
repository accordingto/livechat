const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const games = [
  { name: 'Dixit', script: 'dixit-host.js', prefix: 'dx', game: 'dixit', stateKey: 'dixit', uiKey: 'DIXIT_UI', syncKey: 'DIXIT_SYNC' },
  { name: 'Once Upon a Time', script: 'once-upon-a-time-host.js', prefix: 'once', game: 'onceupon', stateKey: 'once', uiKey: 'ONCE_UI', syncKey: 'ONCE_SYNC' },
];

// Execute the actual page entry point. These doubles supply its browser and
// transport boundaries; status changes and clicks use the registered callbacks.
function hostPage(game, { deferredStart = false } = {}) {
  const elements = new Map(), cards = [], dictionaries = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, disabled: false, value: id === 'dx-target-score' ? '30' : '0',
      innerHTML: '', textContent: '', href: '', listeners: new Map(),
      addEventListener(type, listener) { this.listeners.set(type, listener); },
      insertAdjacentHTML(_position, value) { this.innerHTML += value; },
    });
    return elements.get(id);
  };
  const saved = {
    playerCount: 3, tokens: ['a'.repeat(20), 'b'.repeat(20), 'c'.repeat(20)],
    names: ['Alex', 'Jamie', 'Sam'], dixitHostPlayerNum: 1, dixitTargetScore: 30,
  };
  const storage = new Map([
    ['room-last-session', 'HOSTSWITCH'],
    ['room-session-HOSTSWITCH', JSON.stringify(saved)],
  ]);
  const room = {
    enabled: true, code: 'HOSTSWITCH', count: 3, answers: {},
    init(options) { this.options = options; },
    name(index) { return saved.names[index]; },
    getExtra(key) { return saved[key]; },
    setExtra(key, value) { saved[key] = value; },
  };
  let host;
  class Host {
    constructor(options) {
      this.options = options; this.connected = false; this.own = false;
      this.starts = []; this.commands = []; host = this;
    }
    connect() { this.connectCalled = true; }
    now() { return 12345; }
    receive() {}
    command(...args) { this.commands.push(args); return Promise.resolve(); }
    setActive() {}
    close() {}
    start(options) {
      this.starts.push(options);
      const finish = () => {
        this.connected = true; this.own = true;
        this.options.onStatus('ready');
        this.options.onChange(payload('new-session', options));
      };
      if (!deferredStart) { finish(); return Promise.resolve(); }
      return new Promise(resolve => { this.finishStart = () => { finish(); resolve(); }; });
    }
  }
  class Card {
    constructor(mount, options) { this.mount = mount; this.options = options; this.updates = []; cards.push(this); }
    update(next) { this.updates.push(next); this.payload = next; }
    paint() {}
    render() {}
    destroy() {}
  }
  function payload(sessionId, options = {}) {
    return {
      game: game.game,
      [game.stateKey]: {
        sessionId, turnId: 0, phase: 'LOBBY',
        hostPlayerNum: options?.hostPlayerNum || 1,
        targetScore: options?.targetScore || 30,
      },
    };
  }
  const context = {
    document: { hidden: false, getElementById: element, addEventListener() {} },
    window: { addEventListener() {} },
    location: { search: '', href: `https://hub.example/${game.script.replace('-host.js', '.html')}`, reload() {} },
    URL, URLSearchParams, Date, Uint32Array,
    setInterval() {}, clearInterval() {},
    localStorage: { getItem: key => storage.get(key) ?? null },
    ROOM: room, firebase: { database: () => ({}) },
    I18N: {
      registerDict(namespace, dict) { dictionaries.set(namespace, dict); },
      t(namespace, key) { return dictionaries.get(namespace)?.[key]?.en || key; },
      onChange() {},
    },
    [game.uiKey]: { t: key => key, esc: String, errorText: String, Card },
    [game.syncKey]: { Host },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', game.script), 'utf8'), context, { filename: game.script });
  assert.ok(host?.connectCalled, `${game.name}: the page connects to the restored Hub room`);
  const setStatus = (status, { connected = true, own = true } = {}) => {
    host.connected = connected; host.own = own; host.options.onStatus(status);
  };
  return {
    host, cards, element, payload, setStatus,
    open: element(`${game.prefix}-open`),
    setup: element(`${game.prefix}-setup`),
    table: element(`${game.prefix}-table`),
    show: next => host.options.onChange(next),
    click: () => element(`${game.prefix}-open`).listeners.get('click')(),
  };
}

for (const game of games) {
  test(`${game.name}: foreign player cards expose an explicit switch and replace the restored table`, async () => {
    const page = hostPage(game);
    page.setStatus('ready');
    page.show(page.payload('old-session'));
    assert.equal(page.setup.hidden, true);
    assert.equal(page.table.hidden, false);

    page.setStatus('switched');
    assert.equal(page.setup.hidden, false, 'the existing payload cannot hide the switch controls');
    assert.equal(page.table.hidden, true, 'the inactive table is hidden');
    assert.equal(page.open.disabled, false, 'the owner can explicitly switch existing player cards');
    assert.equal(page.cards[0].options.disabled(), true, 'old table commands remain disabled');
    if (game.stateKey === 'dixit') {
      assert.equal(page.element('dx-own-card').hidden, true, 'the old host link is hidden until the switch completes');
      page.element('dx-host-seat').value = '2';
      page.element('dx-target-score').value = '12';
    }

    await page.click();
    assert.equal(page.host.starts.length, 1);
    if (game.stateKey === 'dixit') {
      assert.equal(page.host.starts[0].hostPlayerNum, 2);
      assert.equal(page.host.starts[0].targetScore, 12);
    }
    assert.equal(page.cards[0].payload[game.stateKey].sessionId, 'new-session');
    assert.equal(page.setup.hidden, true);
    assert.equal(page.table.hidden, false);
    assert.equal(page.cards[0].options.disabled(), false, 'the replacement table accepts normal host controls');
    assert.equal(page.open.disabled, false);
  });

  test(`${game.name}: boot, restoration, and switch detection never automatically start a table`, () => {
    const page = hostPage(game);
    assert.equal(page.open.disabled, true, 'loading is not ready to start');
    assert.equal(page.host.starts.length, 0);
    page.setStatus('ready');
    assert.equal(page.host.starts.length, 0, 'connecting to an owned room does not reset it');
    page.show(page.payload('old-session'));
    assert.equal(page.host.starts.length, 0, 'receiving the canonical session only restores it');
    page.setStatus('switched');
    assert.equal(page.host.starts.length, 0, 'foreign cards require an explicit Open click');
    assert.equal(page.open.disabled, false);
  });

  test(`${game.name}: offline and nonowner clicks cannot start even with a restored session`, async () => {
    const page = hostPage(game);
    page.show(page.payload('old-session'));
    for (const [status, connected, own] of [
      ['switched', false, true],
      ['ready', false, true],
      ['switched', true, false],
      ['ready', true, false],
      ['other_host', true, false],
      ['offline', true, true],
    ]) {
      page.setStatus(status, { connected, own });
      assert.equal(page.open.disabled, true, `${status}, connected=${connected}, own=${own}`);
      await page.click();
      assert.equal(page.host.starts.length, 0, 'the event handler also rejects a programmatic disabled-button click');
    }
    if (game.stateKey === 'dixit') {
      page.setStatus('host_card_active', { connected: true, own: false });
      assert.equal(page.open.disabled, true);
      await page.click();
      assert.equal(page.host.starts.length, 0);
    }
  });

  test(`${game.name}: an outstanding explicit switch blocks duplicate starts until it completes`, async () => {
    const page = hostPage(game, { deferredStart: true });
    page.show(page.payload('old-session'));
    page.setStatus('switched');
    const firstClick = page.click();
    assert.equal(page.host.starts.length, 1);
    assert.equal(page.open.disabled, true, 'the switch button is disabled while start is outstanding');
    await page.click();
    assert.equal(page.host.starts.length, 1, 'the click guard also prevents duplicate in-flight starts');
    page.host.finishStart();
    await firstClick;
    assert.equal(page.cards[0].payload[game.stateKey].sessionId, 'new-session');
    assert.equal(page.setup.hidden, true);
    assert.equal(page.open.disabled, false, 'the busy flag clears after the canonical replacement arrives');
  });
}
