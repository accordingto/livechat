const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const UI = require('../cut-ui.js');
const ENGINE = require('../cut-engine.js');
const sample = (extra = {}) => ({
  sessionId: 'session', turnId: 1, phase: 'speaking', speaker: 1,
  topic: { question: 'I opened the door and saw…' },
  roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Jason', active: true }],
  ...extra,
});

test('speaking UI has no countdown, next-player reveal, or hidden timing fields', () => {
  const html = UI.scene(sample({ deadline: 1234567, speakingDurationMs: 9123, nextSpeaker: 2, targetCuts: 7 }), 1, 1000);
  assert.match(html, /Amy/);
  assert.doesNotMatch(html, /Jason|data-cut-countdown|1234567|9123|progress|targetCuts/);
  assert.match(html, /cut-is-you/);
});

test('CUT reveals the next name only after interruption and final CUT leaves no phantom speaker', () => {
  const cut = sample({ phase: 'cut', nextSpeaker: 2, cutEvent: { id: 'c1', final: false } });
  assert.match(UI.scene(cut, 2), /CUT!.*Jason/s);
  assert.doesNotMatch(UI.scene(cut), /data-cut-countdown/);
  const final = UI.scene(sample({ phase: 'cut', nextSpeaker: null, cutEvent: { id: 'last', final: true } }));
  assert.match(final, /CUT!/); assert.doesNotMatch(final, /cut-speaker/);
});

test('non-final CUT holds on the next name with a manual handoff action and no countdown', () => {
  const cut = sample({ phase: 'cut', nextSpeaker: 2, canBegin: true, cutEvent: { id: 'manual-cut', final: false } });
  const host = UI.scene(cut, 0), player = UI.scene(cut, 1);
  for (const html of [host, player]) {
    assert.match(html, /CUT!.*下一位.*Jason.*準備好.*開始接話/s);
    assert.doesNotMatch(html, /data-cut-countdown|GO!/);
  }
  assert.doesNotMatch(host, /data-cut-action="begin"/);
  assert.match(player, /Jason.*data-cut-action="begin"[^>]*>開始接話/s);
  assert.doesNotMatch(UI.scene({ ...cut, canBegin: false }, 2), /data-cut-action="begin"/);
  const final = UI.scene({ ...cut, nextSpeaker: null, canBegin: false, cutEvent: { id: 'final-cut', final: true } }, 2);
  assert.doesNotMatch(final, /開始接話|data-cut-action="begin"|data-cut-countdown|cut-speaker/);
});

test('prep counts down while paused and stopped have no countdown', () => {
  const prep = sample({ phase: 'handoff', nextSpeaker: 2, phaseUntil: 4000 });
  assert.equal(UI.countdown(prep, 1100), 3);
  assert.match(UI.scene(prep, 2, 1100), /data-cut-countdown[^>]*>3</);
  for (const phase of ['setup', 'ready', 'paused', 'stopped', 'break']) assert.doesNotMatch(UI.scene(sample({ phase, phaseUntil: 4000 })), /data-cut-countdown/);
});

test('revealed topic waits for an explicit start and only eligible player views offer Begin', () => {
  const ready = sample({ phase: 'ready', canBegin: true });
  const host = UI.scene(ready, 0), player = UI.scene(ready, 2);
  for (const html of [host, player]) {
    assert.match(html, /I opened the door and saw/);
    assert.match(html, /主持人或任一玩家/);
    assert.doesNotMatch(html, /data-cut-countdown|GO!/);
  }
  assert.doesNotMatch(host, /data-cut-action="begin"/);
  assert.match(player, /data-cut-action="begin"/);
  assert.doesNotMatch(UI.scene({ ...ready, canBegin: false }, 2), /data-cut-action="begin"/);
  const editing = UI.scene({ ...ready, phase: 'setup', canBegin: false }, 2);
  assert.match(editing, /正在調整設定/);
  assert.doesNotMatch(editing, /data-cut-action="begin"|data-cut-countdown/);
});

test('topic and player names are escaped on host and player surfaces', () => {
  const html = UI.scene(sample({ topic: { question: '<img onerror="bad()">' }, roster: [{ playerNum: 1, name: '<script>bad()</script>' }] }));
  assert.doesNotMatch(html, /<script|<img/); assert.match(html, /&lt;img/); assert.match(html, /&lt;script/);
});

test('sound cues run once per CUT event and never replay upon reconnect or roster updates', () => {
  const sound = new UI.Sound(), cues = [];
  sound.cue = cue => cues.push(cue);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 1000, true);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 1100);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 2100);
  sound.update(sample({ turnId: 2 }), 4000);
  const cut = sample({ turnId: 3, phase: 'cut', nextSpeaker: 2, cutEvent: { id: 'cut-1', final: false } });
  sound.update(cut, 9000); sound.update(cut, 9100);
  sound.update({ ...cut, turnId: 4 }, 9200);
  assert.equal(cues.filter(c => c === 'cut').length, 1);
  assert.equal(cues.filter(c => c === 'reveal').length, 1);
  assert.equal(cues.filter(c => c === 'go').length, 1);
  const restored = new UI.Sound(), old = [];
  restored.cue = cue => old.push(cue);
  restored.update(cut, 9100); restored.update(cut, 9200);
  assert.deepEqual(old, []);
  const passive = new UI.Sound(), passiveCues = [];
  passive.cue = cue => passiveCues.push(cue);
  passive.update(sample(), 4000, false, false);
  passive.update(cut, 9000, false, false);
  passive.update({ ...cut, turnId: 4 }, 9200, false, true);
  assert.deepEqual(passiveCues, []);
  passive.close();
  sound.close(); restored.close();
});

test('card heartbeat preserves current DOM and destroy clears its only paint interval', () => {
  let html = '', writes = 0, intervalCount = 0, clears = 0; const added = {}, removed = {};
  const element = { get innerHTML() { return html; }, set innerHTML(value) { html = value; writes++; }, querySelector() { return null; }, addEventListener(type, fn) { added[type] = fn; }, removeEventListener(type, fn) { removed[type] = fn; } };
  const originalSet = global.setInterval, originalClear = global.clearInterval;
  global.setInterval = () => { intervalCount++; return 42; };
  global.clearInterval = id => { assert.equal(id, 42); clears++; };
  try {
    const card = new UI.Card(element, { nameBanner: () => '<span>Amy</span>', now: () => 1000 });
    const payload = { playerNum: 1, name: 'Amy', cut: sample() };
    card.update(payload); card.update({ ...payload, cut: { ...payload.cut, hostLiveUntil: 5000, revision: 2 } });
    assert.equal(writes, 1); assert.equal(intervalCount, 1);
    card.destroy(); card.update(payload); assert.equal(writes, 1); assert.equal(clears, 1); assert.deepEqual(Object.keys(added).sort(), ['change', 'click', 'input', 'submit']); assert.deepEqual(added, removed);
  } finally { global.setInterval = originalSet; global.clearInterval = originalClear; }
});

function playerCard(send, extra = {}) {
  const nodes = { button: { disabled: false }, feedback: { textContent: '' }, connection: { textContent: '' } };
  let click;
  const element = {
    innerHTML: '',
    querySelector(selector) { return selector === '[data-cut-action="begin"]' ? nodes.button : selector === '[data-cut-action-status]' ? nodes.feedback : selector === '[data-cut-connection]' ? nodes.connection : null; },
    addEventListener(type, handler) { if (type === 'click') click = handler; },
    removeEventListener(type, handler) { if (type === 'click') { assert.equal(handler, click); click = null; } },
  };
  const card = new UI.Card(element, { send, now: () => 1000, ...extra });
  const payload = { playerNum: 2, name: 'Jason', cut: sample({ phase: 'ready', canBegin: true, hostLiveUntil: 5000 }) };
  card.update(payload);
  return { card, nodes, element, payload, click: () => click?.({ target: { closest: selector => selector === '[data-cut-action]' ? nodes.button : null } }) };
}

test('player Begin sends current session and turn once, waits for acknowledgement and removes handler on destroy', async () => {
  const sent = [], f = playerCard(async command => sent.push(command));
  try {
    f.click(); f.click();
    await Promise.resolve();
    assert.equal(sent.length, 1);
    assert.match(sent[0].id, /^[\w-]{8,100}$/);
    assert.deepEqual({ ...sent[0], id: 'id' }, { id: 'id', sessionId: 'session', turnId: 1, type: 'begin' });
    assert.equal(f.nodes.button.disabled, true);
    assert.match(f.nodes.feedback.textContent, /等待同步/);
    f.card.update({ ...f.payload, cut: { ...f.payload.cut, turnId: 2, phase: 'countdown', reply: { id: sent[0].id, error: '' } } });
    assert.equal(f.card.pending, null);
    assert.equal(f.nodes.feedback.textContent, '');
    f.card.destroy(); f.click();
    assert.equal(sent.length, 1);
  } finally { if (!f.card.destroyed) f.card.destroy(); }
});

test('player Begin is blocked while disconnected, host lease expired, sitting out, or settings are open', async () => {
  let clock = 1000, online = true;
  const sent = [], f = playerCard(async command => sent.push(command), { now: () => clock, connected: () => online });
  try {
    online = false; f.card.paint(); f.click();
    assert.equal(f.nodes.button.disabled, true); assert.match(f.nodes.connection.textContent, /連線/);
    online = true; clock = 6000; f.card.paint(); f.click();
    assert.equal(f.nodes.button.disabled, true); assert.match(f.nodes.connection.textContent, /主持頁/);
    clock = 1000;
    for (const cut of [{ ...f.payload.cut, canBegin: false }, { ...f.payload.cut, phase: 'setup', canBegin: false }, { ...f.payload.cut, phase: 'speaking' }]) {
      f.card.update({ ...f.payload, cut }); f.click();
      assert.equal(f.nodes.button.disabled, true);
    }
    await Promise.resolve(); assert.equal(sent.length, 0);
  } finally { f.card.destroy(); }
});

test('stale player Begin shows a recoverable message; existing pending request survives a card refresh', async () => {
  const request = { id: 'pending-cut-action', sessionId: 'session', turnId: 1, type: 'begin' };
  const sent = [], f = playerCard(async command => { sent.push(command); throw new Error('stale_turn'); });
  try {
    f.card.update({ ...f.payload, cutAction: request });
    assert.equal(f.card.pending, request); f.click(); assert.equal(sent.length, 0);
    f.card.update({ ...f.payload, cutAction: request, cut: { ...f.payload.cut, reply: { id: request.id, error: 'stale_turn' } } });
    assert.equal(f.card.pending, null); assert.match(f.nodes.feedback.textContent, /畫面已更新/);
    await f.card.begin();
    assert.equal(sent.length, 1); assert.equal(f.card.pending, null);
    assert.match(f.nodes.feedback.textContent, /畫面已更新/);
    assert.equal(f.nodes.button.disabled, false);
  } finally { f.card.destroy(); }
});

test('player can start a waiting CUT once and pending handoff survives refresh until speaking confirmation', async () => {
  const sent = [], f = playerCard(async command => sent.push(command));
  const cut = { ...f.payload.cut, phase: 'cut', turnId: 4, nextSpeaker: 2, cutEvent: { id: 'waiting-cut', final: false } };
  const request = { id: 'existing-handoff', sessionId: 'session', turnId: 4, type: 'begin' };
  try {
    f.card.update({ ...f.payload, cut, cutAction: request });
    f.click(); assert.equal(sent.length, 0); assert.equal(f.card.pending, request);
    f.card.update({ ...f.payload, cut: { ...cut, reply: { id: request.id, error: 'stale_turn' } } });
    assert.equal(f.card.pending, null);
    f.click(); f.click(); await Promise.resolve();
    assert.equal(sent.length, 1); assert.equal(sent[0].turnId, 4); assert.equal(sent[0].type, 'begin');
    assert.equal(f.nodes.button.disabled, true);
    f.card.update({ ...f.payload, cut: { ...cut, phase: 'speaking', turnId: 5, nextSpeaker: null, canBegin: false, reply: { id: sent[0].id, error: '' } } });
    assert.equal(f.card.pending, null); assert.equal(f.nodes.feedback.textContent, '');
    assert.doesNotMatch(f.element.innerHTML, /data-cut-countdown|data-cut-action="begin"/);
  } finally { f.card.destroy(); }
});

test('waiting CUT preserves its DOM through heartbeats and does not replay its animation on roster updates', () => {
  const f = playerCard(async () => {}), cut = { ...f.payload.cut, phase: 'cut', nextSpeaker: 2, cutEvent: { id: 'one-animation', final: false } };
  try {
    f.card.update({ ...f.payload, cut });
    const initial = f.element.innerHTML;
    assert.doesNotMatch(initial, /cut-static/);
    f.card.update({ ...f.payload, cut: { ...cut, hostLiveUntil: 90000, revision: 2 } });
    assert.equal(f.element.innerHTML, initial);
    f.card.update({ ...f.payload, cut: { ...cut, turnId: 3, roster: [{ playerNum: 1, name: 'Amy', active: false }, { playerNum: 2, name: 'Jason', active: true }] } });
    assert.match(f.element.innerHTML, /cut-static/);
    assert.match(f.element.innerHTML, /CUT!.*Jason/s);
    f.card.update({ ...f.payload, cut: { ...cut, turnId: 6, cutEvent: { id: 'new-animation', final: false } } });
    assert.doesNotMatch(f.element.innerHTML, /cut-static/);
  } finally { f.card.destroy(); }
});

test('manual CUT handoff plays CUT once, stays silent while waiting and plays GO once on Begin', () => {
  const sound = new UI.Sound(), cues = [];
  sound.cue = cue => cues.push(cue);
  sound.update(sample(), 1000);
  const cut = sample({ phase: 'cut', turnId: 3, nextSpeaker: 2, canBegin: true, cutEvent: { id: 'manual-sound', final: false } });
  sound.update(cut, 12000);
  assert.deepEqual(cues, ['cut', 'reveal']);
  for (const time of [13000, 17000, 90000]) sound.update(cut, time);
  sound.update({ ...cut, turnId: 4 }, 90001);
  assert.deepEqual(cues, ['cut', 'reveal']);
  sound.update(sample({ turnId: 5, speaker: 2 }), 90002);
  sound.update(sample({ turnId: 5, speaker: 2 }), 90003);
  assert.deepEqual(cues, ['cut', 'reveal', 'go']);
  sound.close();
});

test('topic reveal stays silent until the explicit Begin transition starts countdown cues', () => {
  const sound = new UI.Sound(), cues = [];
  sound.cue = cue => cues.push(cue);
  sound.update(sample({ phase: 'ready', canBegin: true }), 1000, true);
  sound.update(sample({ phase: 'ready', canBegin: true }), 90000);
  assert.deepEqual(cues, []);
  sound.update(sample({ turnId: 2, phase: 'countdown', phaseUntil: 93000 }), 90000);
  assert.deepEqual(cues, ['round', 'tick']);
  sound.close();
});

function hostDemo() {
  let time = 1000, serial = 0, interval;
  const elements = new Map(), creations = [], commands = [];
  const defaults = { 'cut-speed': 'normal', 'cut-category': 'mixed', 'cut-custom-min': '15', 'cut-custom-max': '25', 'cut-library-category': 'mixed', 'cut-library-search': '' };
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', textContent: '', value: defaults[id] ?? '0', hidden: false, disabled: false, open: false, attributes: {},
      events: {}, addEventListener(type, callback) { this.events[type] = callback; }, setAttribute(name, value) { this.attributes[name] = value; }, querySelector() { return null; },
      close() { this.open = false; }, showModal() { this.open = true; }, focus() { this.focused = true; },
    });
    return elements.get(id);
  }
  class QuietSound {
    constructor() { this.enabled = false; this.context = null; }
    unlock() { return Promise.resolve(false); } update() {} silence() {} close() {} toggle() {}
  }
  const trackedEngine = { ...ENGINE,
    create(options) { creations.push(options); return ENGINE.create(options); },
    apply(state, command) { if (command.type !== 'tick') commands.push(command); return ENGINE.apply(state, command); },
  };
  const context = {
    CUT_UI: { ...UI, Sound: QuietSound }, CUT_ENGINE: trackedEngine, CUT_TOPICS: require('../cut-topics.js'), CUT_SYNC: { uid: () => 'host-command-' + (++serial) },
    I18N: { applyStatic() {}, onChange() {} }, document: { getElementById: element }, location: { search: '?demo=1' },
    URLSearchParams, crypto: { getRandomValues: array => { array[0] = 314; return array; } },
    Date: class extends Date { static now() { return time; } }, setInterval: fn => { interval = fn; return 1; }, clearInterval() {},
    window: { addEventListener() {} },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../cut-host.js'), 'utf8'), context);
  const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  const click = async id => { element('cut-' + id).events.click?.({ target: { closest: () => null } }); await settle(); };
  const submit = async () => { element('cut-setup').events.submit({ preventDefault() {} }); await settle(); };
  return { element, click, submit, creations, commands, scene: () => element('cut-scene').innerHTML,
    advance: milliseconds => { time += milliseconds; interval(); },
    change: (id, value) => { const node = element('cut-' + id); node.value = value; node.events.change?.(); node.events.input?.(); },
  };
}

test('host can return to settings mid-speech, preserve the topic and wait again after saving or cancelling', async () => {
  const { element, click, submit, scene, advance } = hostDemo();
  assert.equal(element('cut-start').textContent, UI.t('start'));
  await submit();
  assert.match(scene(), /data-cut-phase="ready"/);
  const topic = scene().match(/<h2>(.*?)<\/h2>/s)[1];
  advance(60000);
  assert.match(scene(), /data-cut-phase="ready"/);
  assert.equal(element('cut-begin').hidden, false);
  await click('begin');
  assert.match(scene(), /data-cut-phase="countdown"/);
  advance(3000);
  assert.match(scene(), /data-cut-phase="speaking"/);
  assert.equal(element('cut-settings-open').hidden, false);
  await click('settings-open');
  assert.equal(element('cut-setup').hidden, false); assert.equal(element('cut-session').hidden, true);
  assert.equal(element('cut-start').textContent, UI.t('saveSettings'));
  assert.equal(element('cut-speed').value, 'normal');
  advance(120000);
  assert.match(scene(), /data-cut-phase="setup"/);
  element('cut-speed').value = 'chill';
  await submit();
  assert.equal(element('cut-setup').hidden, true); assert.equal(element('cut-session').hidden, false);
  assert.match(scene(), /data-cut-phase="ready"/);
  assert.equal(scene().match(/<h2>(.*?)<\/h2>/s)[1], topic);
  advance(120000); assert.match(scene(), /data-cut-phase="ready"/);
  await click('begin'); advance(3000);
  assert.match(scene(), /data-cut-phase="speaking"/);
  advance(50000);
  assert.match(scene(), /data-cut-phase="cut"/);
  assert.equal(element('cut-begin').hidden, false);
  assert.equal(element('cut-begin').textContent, UI.t('beginHandoff'));
  const heldCut = scene();
  advance(120000);
  assert.equal(scene(), heldCut);
  await click('begin');
  assert.match(scene(), /data-cut-phase="speaking"/);
  assert.doesNotMatch(scene(), /data-cut-countdown/);
  await click('settings-open');
  assert.equal(element('cut-speed').value, 'chill');
  element('cut-speed').value = 'chaos';
  await click('setup-close');
  assert.match(scene(), /data-cut-phase="ready"/);
  await click('settings-open');
  assert.equal(element('cut-speed').value, 'chill', 'cancel keeps the last saved pace');
});


test('server-operated CUT cards remain usable after the legacy host lease expires', async () => {
  const sent = [], f = playerCard(async command => sent.push(command), { now: () => 6000 });
  try {
    assert.equal(f.card.canBegin(), false);
    f.card.update({ ...f.payload, cut: { ...f.payload.cut, sharedControls: true, canManage: true } });
    assert.equal(f.card.canBegin(), true); assert.equal(f.nodes.connection.textContent, '');
    assert.match(f.element.innerHTML, /data-cut-action="pause"/); assert.match(f.element.innerHTML, /data-cut-action="recover"/);
    await f.card.action('pause'); assert.equal(sent.length, 1); assert.equal(sent[0].type, 'pause');
    assert.equal(f.card.canAction('recover'), false, 'a pending command cannot be overwritten');
    f.card.update({ ...f.payload, cut: { ...f.payload.cut, sharedControls: true, phase: 'paused', turnId: 2, reply: { id: sent[0].id, error: '' } } });
    assert.equal(f.card.canAction('resume'), true); assert.equal(f.card.canAction('next'), false);
    f.card.update({ ...f.payload, cut: { ...f.payload.cut, sharedControls: true, phase: 'break', turnId: 3 } });
    assert.match(f.element.innerHTML, /data-cut-action="next"/); assert.equal(f.card.canAction('next'), true);
  } finally { f.card.destroy(); }
});

test('a sitting-out CUT seat can return or recover but cannot manage another player', async () => {
  const sent = [], f = playerCard(async command => sent.push(command));
  try {
    f.card.update({ ...f.payload, cut: { ...f.payload.cut, sharedControls: true, roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: '<img>', active: false }] } });
    assert.equal(f.card.canAction('pause'), false); assert.equal(f.card.canAction('exclude', { playerNum: 1, active: false }), false);
    assert.equal(f.card.canAction('recover'), true); assert.equal(f.card.canAction('exclude', { playerNum: 2, active: true }), true);
    assert.doesNotMatch(f.element.innerHTML, /data-cut-action="pause"|<img>/);
    await f.card.action('exclude', { playerNum: 2, active: true });
    assert.deepEqual({ ...sent[0], id: 'id' }, { playerNum: 2, active: true, id: 'id', sessionId: 'session', turnId: 1, type: 'exclude' });
  } finally { f.card.destroy(); }
});


test('custom timing rejects blank, fractional, out-of-range and reversed bounds, but allows a fixed duration', async () => {
  const f = hostDemo();
  f.change('speed', 'custom');
  assert.equal(f.element('cut-custom').hidden, false);
  assert.equal(f.element('cut-custom-min').disabled, false);
  for (const [min, max] of [['', '25'], ['4', '25'], ['15.5', '25'], ['15', '121'], ['26', '25']]) {
    f.change('custom-min', min); f.change('custom-max', max);
    await f.submit();
    assert.equal(f.creations.length, 0);
    assert.match(f.element('cut-custom-error').textContent, /5–120/);
    assert.equal(f.element('cut-custom-min').attributes['aria-invalid'], 'true');
  }
  f.change('custom-min', '25'); f.change('custom-max', '25');
  await f.submit();
  assert.equal(f.creations.length, 1);
  assert.equal(f.creations[0].speed, 'custom');
  assert.equal(f.creations[0].customMinSeconds, 25);
  assert.equal(f.creations[0].customMaxSeconds, 25);
  assert.match(f.scene(), /data-cut-phase="ready"/);
  await f.click('begin'); f.advance(3000);
  f.advance(24999); assert.match(f.scene(), /data-cut-phase="speaking"/);
  f.advance(1); assert.match(f.scene(), /data-cut-phase="cut"/);
});

test('switching to a preset disables invalid custom inputs and clears their error without blocking topic creation', async () => {
  const f = hostDemo();
  f.change('speed', 'custom'); f.change('custom-min', '130'); f.change('custom-max', '');
  await f.submit(); assert.equal(f.creations.length, 0);
  f.change('speed', 'normal');
  assert.equal(f.element('cut-custom').hidden, true);
  assert.equal(f.element('cut-custom-min').disabled, true);
  assert.equal(f.element('cut-custom-max').disabled, true);
  assert.equal(f.element('cut-custom-min').required, false);
  assert.equal(f.element('cut-custom-error').textContent, '');
  await f.submit();
  assert.equal(f.creations.length, 1);
  assert.equal(f.creations[0].speed, 'normal');
  assert.equal(f.creations[0].customMinSeconds, 15);
  assert.equal(f.creations[0].customMaxSeconds, 25);
});

test('custom bounds return in mid-topic settings, cancel retains the saved range, and restart preserves it', async () => {
  const f = hostDemo();
  f.change('speed', 'custom'); f.change('custom-min', '30'); f.change('custom-max', '45');
  await f.submit(); await f.click('begin'); f.advance(3000);
  await f.click('settings-open');
  assert.equal(f.element('cut-speed').value, 'custom');
  assert.equal(f.element('cut-custom-min').value, '30');
  assert.equal(f.element('cut-custom-max').value, '45');
  f.change('custom-min', '35'); f.change('custom-max', '50'); await f.submit();
  const saved = f.commands.find(command => command.type === 'configure');
  assert.equal(saved.customMinSeconds, 35); assert.equal(saved.customMaxSeconds, 50);
  await f.click('settings-open');
  f.change('custom-min', '60'); f.change('custom-max', '80'); await f.click('setup-close');
  await f.click('settings-open');
  assert.equal(f.element('cut-custom-min').value, '35');
  assert.equal(f.element('cut-custom-max').value, '50');
  await f.click('setup-close'); await f.click('restart');
  assert.equal(f.creations.length, 2);
  assert.equal(f.creations[1].speed, 'custom');
  assert.equal(f.creations[1].customMinSeconds, 35);
  assert.equal(f.creations[1].customMaxSeconds, 50);
});

test('host continues the same topic beyond twenty CUTs and ends only after explicit topic confirmation', async () => {
  const f = hostDemo();
  await f.submit();
  const topic = f.scene().match(/<h2>(.*?)<\/h2>/s)[1];
  await f.click('begin'); f.advance(3000);
  for (let turn = 0; turn < 20; turn++) {
    f.advance(60000);
    assert.match(f.scene(), /data-cut-phase="cut"/);
    assert.equal(f.scene().match(/<h2>(.*?)<\/h2>/s)[1], topic);
    assert.equal(f.element('cut-next').hidden, true);
    await f.click('begin');
    assert.match(f.scene(), /data-cut-phase="speaking"/);
  }
  assert.equal(f.element('cut-end-topic').hidden, false);
  await f.click('end-topic');
  assert.equal(f.element('cut-end-confirm').open, true);
  assert.equal(f.commands.filter(command => command.type === 'endTopic').length, 0);
  await f.click('end-cancel');
  assert.equal(f.element('cut-end-confirm').open, false);
  assert.match(f.scene(), /data-cut-phase="speaking"/);
  await f.click('end-topic'); await f.click('end-accept');
  assert.equal(f.commands.filter(command => command.type === 'endTopic').length, 1);
  assert.equal(f.element('cut-end-confirm').open, false);
  assert.match(f.scene(), /data-cut-phase="break"/);
  assert.equal(f.element('cut-next').hidden, false);
  await f.click('next');
  assert.match(f.scene(), /data-cut-phase="ready"/);
  assert.notEqual(f.scene().match(/<h2>(.*?)<\/h2>/s)[1], topic);
});

test('active shared players can end a topic after verbal-agreement confirmation; legacy and sitting-out cards cannot', async () => {
  const originalWindow = global.window, sent = [];
  let agreed = false, questions = 0;
  global.window = { confirm(question) { assert.equal(question, UI.t('endTopicQuestion')); questions++; return agreed; } };
  const f = playerCard(async command => sent.push(command));
  try {
    const cut = { ...f.payload.cut, phase: 'speaking', canBegin: false, sharedControls: true, canEndTopic: true };
    f.card.update({ ...f.payload, cut });
    assert.match(f.element.innerHTML, /data-cut-action="endTopic"/);
    assert.equal(f.card.canAction('endTopic'), true);
    await f.card.action('endTopic');
    assert.equal(questions, 1); assert.equal(sent.length, 0); assert.equal(f.card.pending, null);
    agreed = true;
    await f.card.action('endTopic'); await f.card.action('endTopic');
    assert.equal(questions, 2); assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'endTopic'); assert.equal(sent[0].turnId, cut.turnId);
    f.card.update({ ...f.payload, cut: { ...cut, phase: 'break', turnId: 2, canEndTopic: false, reply: { id: sent[0].id, error: '' } } });
    assert.equal(f.card.pending, null); assert.equal(f.card.canAction('next'), true);
    f.card.update({ ...f.payload, cut: { ...cut, sharedControls: false } });
    assert.equal(f.card.canAction('endTopic'), false);
    assert.doesNotMatch(f.element.innerHTML, /data-cut-action="endTopic"/);
    f.card.update({ ...f.payload, cut: { ...cut, roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Jason', active: false }] } });
    assert.equal(f.card.canAction('endTopic'), false);
    assert.doesNotMatch(f.element.innerHTML, /data-cut-action="endTopic"/);
  } finally {
    f.card.destroy();
    if (originalWindow === undefined) delete global.window; else global.window = originalWindow;
  }
});


test('topic browser filters by category and searches English questions or starters without exposing selection actions', () => {
  const rows = [
    { category: 'real', question: 'The bus leaves early.', starter: 'I run to the bus.' },
    { category: 'personal', question: 'Tell us about your first job.', starter: 'My first day begins with...' },
    { category: 'ideas', question: 'Would you choose a quiet home?', starter: 'A quiet place makes me...' },
    { category: 'absurd', question: '<script>bad()</script>', starter: '<img onerror="bad()"> & "test"' },
  ];
  const all = UI.topicLibrary(rows);
  assert.equal(all.count, 4); assert.equal(all.total, 4);
  assert.deepEqual(all.counts, { mixed: 4, real: 1, personal: 1, ideas: 1, absurd: 1 });
  assert.match(all.html, /個人經驗/); assert.match(all.html, /想法與喜好/);
  assert.doesNotMatch(all.html, /<script|<img|<button|data-cut-action|data-cut-topic/);
  assert.match(all.html, /&lt;script&gt;/); assert.match(all.html, /&amp;/);
  const personal = UI.topicLibrary(rows, 'personal');
  assert.equal(personal.count, 1); assert.match(personal.html, /first job/); assert.doesNotMatch(personal.html, /quiet home/);
  assert.equal(UI.topicLibrary(rows, 'mixed', 'FIRST DAY').count, 1, 'search also matches the starter');
  assert.equal(UI.topicLibrary(rows, 'ideas', 'first').count, 0);
  assert.match(UI.topicLibrary(rows, 'mixed', 'no match').html, /沒有符合/);
});

test('host topic browsing preserves live topic and setup category, and the clock never redraws its list', async () => {
  const f = hostDemo(), topics = require('../cut-topics.js');
  const list = f.element('cut-library-list'), initial = list.innerHTML;
  assert.equal((initial.match(/class="cut-library-item"/g) || []).length, topics.items.length);
  assert.equal(f.element('cut-library-count').textContent, UI.t('libraryCount', { shown: topics.items.length, total: topics.items.length }));
  assert.equal(f.element('cut-library').open, false);
  await f.submit(); await f.click('begin'); f.advance(3000);
  const scene = f.scene(), before = f.commands.length;
  f.change('library-category', 'real');
  assert.equal(f.element('cut-category').value, 'mixed');
  assert.equal(f.scene(), scene); assert.equal(f.commands.length, before);
  const realCount = topics.items.filter(topic => topic.category === 'real').length;
  assert.equal((list.innerHTML.match(/class="cut-library-item"/g) || []).length, realCount);
  const phrase = topics.items.find(topic => topic.category === 'real').starter;
  f.change('library-search', phrase);
  assert.ok(list.innerHTML.includes(UI.esc(phrase))); assert.equal(f.scene(), scene);
  assert.equal(f.commands.length, before); assert.equal(f.creations.length, 1);
  let html = list.innerHTML, writes = 0;
  Object.defineProperty(list, 'innerHTML', { get: () => html, set: value => { html = value; writes++; }, configurable: true });
  for (let i = 0; i < 20; i++) f.advance(100);
  assert.equal(writes, 0, 'clock and live-state paints must leave the topic browser alone');
  f.change('library-search', 'nothing-matches-this-query');
  assert.equal(writes, 1); assert.match(html, /沒有符合/);
});

test('shared player settings include both new categories while topic browsing remains host-only', () => {
  const f = playerCard(async () => {});
  try {
    const cut = { ...f.payload.cut, phase: 'setup', sharedControls: true, category: 'personal' };
    f.card.update({ ...f.payload, cut });
    assert.match(f.element.innerHTML, /<option value="personal" selected>個人經驗/);
    assert.match(f.element.innerHTML, /<option value="ideas">想法與喜好/);
    assert.match(f.element.innerHTML, /<option value="mixed">全部混合/);
    for (const category of ['personal', 'ideas']) {
      assert.equal(f.card.canAction('configure', { speed: 'normal', category, customMinSeconds: 15, customMaxSeconds: 25 }), true);
    }
    assert.doesNotMatch(f.element.innerHTML, /cut-library|Browse topics|查看題庫/);
  } finally { f.card.destroy(); }
});

