'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const ENGINE = require('../cut-engine.js'), UI = require('../cut-ui.js');

function hostFixture() {
  let time = 1000, serial = 0, interval, current = null;
  const elements = new Map(), commands = [], creations = [], sounds = [], boards = [], timers = new Map(), windowEvents = {};
  const defaults = { 'cut-speed': 'custom', 'cut-category': 'mixed', 'cut-custom-min': '60', 'cut-custom-max': '60', 'cut-topic-minutes': '10', 'cut-main-minutes': '4', 'cut-first-min': '25', 'cut-first-max': '45', 'cut-interval-min': '30', 'cut-interval-max': '55', 'cut-library-category': 'mixed', 'cut-library-mode': 'classic', 'cut-library-search': '' };
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      _html: '', writes: 0, get innerHTML() { return this._html; }, set innerHTML(value) { this._html = value; this.writes++; },
      textContent: '', value: defaults[id] ?? '0', checked: true, hidden: false, disabled: false, open: false, attributes: {}, events: {},
      addEventListener(type, fn) { this.events[type] = fn; }, setAttribute(k, v) { this.attributes[k] = v; }, querySelector() { return null; },
      close() { this.open = false; }, showModal() { this.open = true; }, focus() {},
    });
    return elements.get(id);
  }
  const tracks = ['wind', 'rain', 'musicbox', 'crawl'].map(key => Object.assign(element('track-' + key), { dataset: { hwTrack: key } }));
  const effects = ['scream', 'laugh', 'ghost', 'howl', 'door', 'thunder', 'heartbeat', 'bell'].map(key => Object.assign(element('effect-' + key), { dataset: { hwFx: key } }));
  class QuietSound {
    constructor(onChange) { this.enabled = false; this.context = null; this.onChange = onChange; this.unlocks = 0; sounds.push(this); }
    useHalloweenBoard(board) { this.board = board; }
    unlock() { this.unlocks++; return this.hang ? new Promise(() => {}) : Promise.resolve(false); }
    update() {} silence() {} close() { this.closed = true; } toggle() { this.enabled = !this.enabled; return this.unlock(); }
  }
  class QuietBoard {
    constructor({ onChange }) { this.onChange = onChange; this.ready = false; this.loading = 0; boards.push(this); }
    close() { this.closed = true; }
    play() { throw Error('Host must not play a manual effect outside the room follower'); }
    toggleMusic() { throw Error('Host must not toggle local music'); }
    setMusicVolume() { throw Error('Host must not change local-only volume'); }
    setEffectsVolume() { throw Error('Host must not change local-only volume'); }
  }
  const context = {
    CUT_UI: { ...UI, Sound: QuietSound },
    CUT_ENGINE: { ...ENGINE,
      create(options) { creations.push(options); return current = ENGINE.create(options); },
      apply(state, command) { if (command.type !== 'tick') commands.push(command); return current = ENGINE.apply(state, command); },
    },
    CUT_TOPICS: require('../cut-topics.js'), CUT_CONFIG: require('../cut-config.js'), CUT_JUMP_TOPICS: require('../cut-jump-topics.js'),
    CUT_HALLOWEEN_TOPICS: require('../cut-halloween-topics.js'), CUT_HALLOWEEN_AUDIO: { Board: QuietBoard }, CUT_SYNC: { uid: () => 'room-host-' + ++serial },
    I18N: { applyStatic() {}, onChange() {} }, location: { search: '?demo=1&edition=halloween' },
    document: { getElementById: element, querySelectorAll: selector => selector === '[data-hw-track]' ? tracks : selector === '[data-hw-fx]' ? effects : [], body: { classList: { toggle() {} } } },
    URLSearchParams, crypto: { getRandomValues: array => { array[0] = 314; return array; } },
    Date: class extends Date { static now() { return time; } },
    setInterval: fn => { interval = fn; return 1; }, clearInterval() {},
    setTimeout: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    window: { addEventListener: (type, fn) => { windowEvents[type] = fn; } },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../cut-host.js'), 'utf8'), context);
  const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  async function fire(id, type, extra = {}) { const el = element(id); el.events[type]?.({ target: el, preventDefault() {}, ...extra }); await settle(); }
  return { element, commands, creations, sounds, boards, timers, get state() { return current; },
    start: () => fire('cut-setup', 'submit'), click: id => fire(id, 'click'), change: id => fire(id, 'change'), input: id => fire(id, 'input'),
    advance: async ms => { time += ms; interval(); await settle(); },
    flush: async () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); await settle(); },
    close: () => windowEvents.pagehide(), settle,
  };
}

test('host audio controls wait for a real topic and publish while the local audio unlock is pending', async () => {
  const f = hostFixture();
  assert.equal(f.element('track-wind').disabled, true);
  await f.click('track-wind'); assert.equal(f.commands.length, 0);
  await f.start();
  assert.equal(f.element('track-wind').disabled, false);
  const sound = f.sounds[0]; sound.enabled = true; sound.hang = true;
  await f.click('track-wind');
  assert.equal(f.state.audio.music, 'wind');
  assert.equal(f.commands.at(-1).type, 'audioSettings');
  assert.equal(sound.edition, 'halloween'); assert.ok(sound.unlocks > 0);
  await f.click('effect-door');
  assert.equal(f.state.audio.event.key, 'door'); assert.equal(f.commands.at(-1).type, 'audioEffect');
  assert.equal(sound.onCut, undefined, 'host does not intercept CUT ahead of the common follower');
  f.close();
});

test('volume dragging coalesces settings, retains draft values during repaint and flushes on change', async () => {
  const f = hostFixture(); await f.start();
  for (const value of ['10', '20', '30', '37']) { f.element('cut-hw-music-volume').value = value; await f.input('cut-hw-music-volume'); }
  f.element('cut-hw-effects-volume').value = '45'; await f.input('cut-hw-effects-volume');
  assert.equal(f.commands.filter(c => c.type === 'audioSettings').length, 0);
  assert.equal(f.timers.size, 1);
  f.boards[0].onChange();
  assert.equal(f.element('cut-hw-music-volume').value, '37');
  assert.equal(f.element('cut-hw-effects-volume').value, '45');
  await f.change('cut-hw-effects-volume');
  assert.equal(f.timers.size, 0);
  const commands = f.commands.filter(c => c.type === 'audioSettings'); assert.equal(commands.length, 1);
  assert.equal(commands[0].musicVolume, .37); assert.equal(commands[0].effectsVolume, .45);
  assert.equal(f.state.audio.musicVolume, .37); assert.equal(f.state.audio.effectsVolume, .45);
  await f.flush(); assert.equal(f.commands.filter(c => c.type === 'audioSettings').length, 1);
  f.close();
});

test('host room audio changes do not redraw the story or alter a running CUT clock', async () => {
  const f = hostFixture(); await f.start(); await f.click('cut-begin'); await f.advance(3000);
  assert.equal(f.state.phase, 'speaking');
  const before = { turn: f.state.turnId, deadline: f.state.deadline, topic: f.state.topic.id, lastChange: f.state.lastChangeAt, writes: f.element('cut-scene').writes };
  f.element('cut-hw-cut-effect').value = 'laugh'; await f.change('cut-hw-cut-effect');
  f.element('cut-hw-auto').checked = false; await f.change('cut-hw-auto');
  await f.click('track-rain'); await f.click('cut-hw-stop'); await f.click('effect-bell');
  assert.equal(f.state.audio.cutEffect, 'laugh'); assert.equal(f.state.audio.autoScare, false); assert.equal(f.state.audio.music, null);
  assert.deepEqual({ turn: f.state.turnId, deadline: f.state.deadline, topic: f.state.topic.id, lastChange: f.state.lastChangeAt, writes: f.element('cut-scene').writes }, before);
  f.close();
});

test('host restart carries room mixer choices and close discards unsent volume work', async () => {
  const f = hostFixture(); await f.start();
  await f.click('track-wind'); f.element('cut-hw-cut-effect').value = 'ghost'; await f.change('cut-hw-cut-effect');
  f.element('cut-hw-effects-volume').value = '40'; await f.input('cut-hw-effects-volume'); await f.flush();
  await f.click('cut-restart');
  assert.equal(f.creations.at(-1).audio.music, 'wind'); assert.equal(f.creations.at(-1).audio.cutEffect, 'ghost'); assert.equal(f.creations.at(-1).audio.effectsVolume, .4);
  assert.equal(f.state.audio.music, 'wind'); assert.equal(f.state.audio.event, null);
  const count = f.commands.length;
  f.element('cut-hw-music-volume').value = '5'; await f.input('cut-hw-music-volume'); assert.equal(f.timers.size, 1);
  f.close(); assert.equal(f.timers.size, 0); await f.flush(); assert.equal(f.commands.length, count);
  assert.equal(f.sounds[0].closed, true); assert.equal(f.boards[0].closed, true);
});
