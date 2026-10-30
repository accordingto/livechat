// The shared card/host adapter must use local recorded audio only after a gesture.
// Board's download/decoder implementation has its own independent tests.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../cut-ui.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const view = (extra = {}) => ({ playerNum: 1, name: 'Amy', cut: {
  version: 1, edition: 'halloween', sessionId: 'recorded-card-room', turnId: 1,
  phase: 'speaking', speaker: 1, sharedControls: true,
  topic: { question: 'A guest knocks at the haunted house.' },
  roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Kevin', active: true }],
  ...extra,
} });

function fixture(options = {}) {
  let html = '', clock = 1000, online = true, uiWrites = 0, interval, intervalClears = 0;
  const contexts = [], tones = [], boards = [], scripts = [], sent = [], handlers = {};
  const document = {
    hidden: false,
    createElement(type) {
      assert.equal(type, 'script');
      return { src: '', removed: false, remove() { this.removed = true; } };
    },
    head: { appendChild(script) { scripts.push(script); } },
  };
  class FakeAudioContext {
    constructor() {
      this.state = 'suspended'; this.currentTime = 0; this.destination = {};
      this.closed = 0; this.resumed = 0; contexts.push(this);
    }
    async resume() {
      this.resumed++;
      if (options.resumeGate) await options.resumeGate.promise;
      if (this.state === 'closed') throw new Error('context_closed');
      if (options.resumeFails) throw new Error('gesture_blocked');
      this.state = 'running';
    }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {} };
      tones.push(oscillator); return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  class InjectedBoard {
    constructor({ context } = {}) {
      this.context = context; this.ready = false; this.assetError = false; this.closed = 0;
      this.unlocks = 0; this.stops = 0; this.cues = []; this.cueAttempts = []; boards.push(this);
    }
    async unlock() {
      this.unlocks++;
      if (options.boardGate) await options.boardGate.promise;
      if (options.boardThrows) throw new Error('recording_load_failed');
      if (this.closed) return false;
      if (options.boardFails) { this.assetError = true; return false; }
      this.ready = true; return true;
    }
    cue(key) {
      this.cueAttempts.push(key);
      if (!this.ready || this.closed) return false;
      this.cues.push(key); return true;
    }
    stopEffects() { this.stops++; }
    close() { this.closed++; this.ready = false; }
  }
  const context = vm.createContext({
    document, window: options.unsupported ? {} : { AudioContext: FakeAudioContext },
    setInterval(fn) { interval = fn; return 19; }, clearInterval(id) { assert.equal(id, 19); intervalClears++; },
    crypto: { randomUUID: () => 'recorded-card-command' },
    ...(options.lazyModule ? {} : { CUT_HALLOWEEN_AUDIO: { Board: InjectedBoard } }),
  });
  vm.runInContext(source, context);
  const textNode = () => ({ get textContent() { return this.value || ''; }, set textContent(value) { this.value = value; uiWrites++; } });
  const button = Object.assign(textNode(), { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; uiWrites++; } });
  const soundStatus = textNode(), actionStatus = textNode(), connection = textNode();
  const element = {
    get innerHTML() { return html; }, set innerHTML(value) { html = value; uiWrites++; },
    querySelector(selector) {
      if (selector === '[data-cut-sound]') return html.includes('data-cut-sound ') ? button : null;
      if (selector === '[data-cut-sound-status]') return html.includes('data-cut-sound-status') ? soundStatus : null;
      if (selector === '[data-cut-action-status]') return actionStatus;
      if (selector === '[data-cut-connection]') return connection;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { handlers[type] = fn; },
    removeEventListener(type, fn) { assert.equal(handlers[type], fn); delete handlers[type]; },
  };
  const card = new context.CUT_UI.Card(element, {
    now: () => clock, connected: () => online, send: async command => sent.push(command),
  });
  return {
    card, context, contexts, tones, boards, scripts, sent, handlers, button, soundStatus, element, document,
    get uiWrites() { return uiWrites; }, get intervalClears() { return intervalClears; },
    set now(value) { clock = value; }, set online(value) { online = value; },
    paint() { interval(); },
    clickSound() { handlers.click?.({ target: { closest: selector => selector === '[data-cut-sound]' ? button : null } }); },
    loadModule() { context.CUT_HALLOWEEN_AUDIO = { Board: InjectedBoard }; scripts.at(-1).onload(); },
    failModule() { scripts.at(-1).onerror(); },
    newSound(onChange) { return new context.CUT_UI.Sound(onChange); },
    newBoard() { return new InjectedBoard(); },
  };
}

test('quiet Halloween cards never create an AudioContext, load the module, or construct a Board', () => {
  const f = fixture({ lazyModule: true });
  try {
    f.card.update(view());
    f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'quiet-cut' } }));
    f.paint();
    assert.equal(f.card.sound.enabled, false); assert.equal(f.button.attributes['aria-pressed'], 'false');
    assert.equal(f.contexts.length, 0); assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0);
    assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
  } finally { f.card.destroy(); }
});

test('a gesture lazy-loads one recorded Board using the card context without replaying the revealed CUT', async () => {
  const f = fixture({ lazyModule: true });
  try {
    f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'restored-cut' } }));
    f.clickSound(); await flush();
    assert.equal(f.contexts.length, 1); assert.equal(f.contexts[0].resumed, 1);
    assert.equal(f.scripts.length, 1); assert.match(f.scripts[0].src, /^cut-halloween-audio\.js\?/);
    assert.equal(f.boards.length, 0); assert.equal(f.card.sound.assetLoading, true);
    assert.match(f.soundStatus.textContent, /載入/);
    f.loadModule(); await flush();
    const board = f.boards[0];
    assert.equal(board.context, f.contexts[0]); assert.equal(board.unlocks, 1);
    assert.equal(f.card.sound.halloweenOwned, true); assert.equal(f.card.sound.blocked, false);
    assert.equal(f.card.sound.assetLoading, false); assert.deepEqual(board.cues, []);
    f.paint(); assert.deepEqual(board.cues, []);
    f.card.update(view({ turnId: 3, speaker: 2 }));
    assert.deepEqual(board.cues, ['go']); assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
  } finally { f.card.destroy(); }
});

test('Halloween countdown, GO, CUT, time and return cues delegate once without oscillator fallback', async () => {
  const f = fixture();
  try {
    f.card.update(view({ phase: 'ready' })); f.clickSound(); await flush();
    const board = f.boards[0];
    f.card.update(view({ phase: 'countdown', turnId: 2, phaseUntil: 4000 }));
    f.now = 2000; f.paint(); f.now = 3000; f.paint();
    f.card.update(view({ turnId: 3 }));
    const cut = view({ phase: 'cut', turnId: 4, nextSpeaker: 2, cutEvent: { id: 'recorded-cut' } });
    f.card.update(cut); f.paint(); f.card.update(cut);
    f.card.update(view({ phase: 'interrupt', turnId: 5, interrupter: 2, cutEvent: { id: 'recorded-cut' } }));
    f.card.update(view({ phase: 'timeup', turnId: 6 }));
    f.card.update(view({ phase: 'back', turnId: 7 }));
    assert.deepEqual(board.cues, ['round', 'tick', 'tick', 'tick', 'go', 'cut', 'reveal', 'time', 'go']);
    assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
  } finally { f.card.destroy(); }
});

test('classic cards retain the existing synthesized cues without constructing or loading a Halloween Board', async () => {
  const f = fixture({ lazyModule: true });
  try {
    f.card.update(view({ edition: 'classic', phase: 'ready' })); f.clickSound(); await flush();
    f.card.update(view({ edition: 'classic', phase: 'countdown', turnId: 2, phaseUntil: 4000 }));
    assert.equal(f.tones.length, 3, 'two round tones and one countdown tick');
    f.card.update(view({ edition: 'classic', turnId: 3 })); assert.equal(f.tones.length, 5);
    f.card.update(view({ edition: 'classic', phase: 'cut', turnId: 4, nextSpeaker: 2, cutEvent: { id: 'classic-cut' } }));
    assert.equal(f.tones.length, 9, 'classic CUT and reveal retain their four tones');
    assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0);
  } finally { f.card.destroy(); }
});

test('muting recorded cues stops effects and ignores events observed while muted, offline or hidden', async () => {
  const f = fixture();
  try {
    f.card.update(view()); f.clickSound(); await flush(); const board = f.boards[0];
    f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'audible-cut' } }));
    assert.deepEqual(board.cues, ['cut', 'reveal']);
    const stops = board.stops; f.clickSound(); await flush();
    assert.equal(f.card.sound.enabled, false); assert.ok(board.stops > stops);
    f.card.update(view({ turnId: 3 }));
    f.card.update(view({ phase: 'cut', turnId: 4, nextSpeaker: 2, cutEvent: { id: 'muted-cut' } }));
    f.clickSound(); await flush(); f.paint();
    assert.deepEqual(board.cues, ['cut', 'reveal'], 'enabling cannot replay muted events');
    f.online = false;
    f.card.update(view({ turnId: 5 })); f.online = true; f.paint();
    f.document.hidden = true;
    f.card.update(view({ phase: 'cut', turnId: 6, nextSpeaker: 2, cutEvent: { id: 'hidden-cut' } }));
    f.document.hidden = false; f.paint();
    assert.deepEqual(board.cues, ['cut', 'reveal']);
    f.card.update(view({ turnId: 7 })); assert.deepEqual(board.cues, ['cut', 'reveal', 'go']);
    assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
  } finally { f.card.destroy(); }
});

test('failed recording load reports blocked and assetError while actions stay usable, with no fake synth fallback', async () => {
  for (const options of [{ boardFails: true }, { boardThrows: true }]) {
    const f = fixture(options);
    try {
      f.card.update(view({ phase: 'ready', canBegin: true })); f.clickSound(); await flush();
      assert.equal(f.card.sound.blocked, true); assert.equal(f.card.sound.assetError, true);
      assert.equal(f.card.sound.assetLoading, false); assert.match(f.soundStatus.textContent, /載入失敗/);
      assert.match(f.button.textContent, /啟用音效/); assert.equal(f.card.canBegin(), true);
      f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'load-failed-cut' } }));
      assert.deepEqual(f.boards[0].cues, []); assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
    } finally { f.card.destroy(); }
  }
});

test('failed lazy module load reports an asset error, and a later gesture can retry', async () => {
  const f = fixture({ lazyModule: true });
  try {
    f.card.update(view()); f.clickSound(); await flush(); f.failModule(); await flush();
    assert.equal(f.card.sound.blocked, true); assert.equal(f.card.sound.assetError, true);
    assert.equal(f.scripts[0].removed, true); assert.match(f.soundStatus.textContent, /載入失敗/);
    assert.equal(f.boards.length, 0); assert.equal(f.tones.length, 0);
    f.clickSound(); await flush(); assert.equal(f.scripts.length, 2);
    f.loadModule(); await flush();
    assert.equal(f.card.sound.blocked, false); assert.equal(f.card.sound.assetError, false);
    assert.equal(f.boards.length, 1); assert.equal(f.card.sound.enabled, true);
  } finally { f.card.destroy(); }
});

test('destroy during pending context resume cannot load recordings, repaint or resurrect a card', async () => {
  const resumeGate = deferred(), f = fixture({ resumeGate, lazyModule: true });
  f.card.update(view()); f.clickSound(); await flush();
  const ctx = f.contexts[0]; f.card.destroy(); const writes = f.uiWrites;
  resumeGate.resolve(); await flush();
  f.paint(); f.card.update(view({ phase: 'cut', turnId: 2, cutEvent: { id: 'late-cut' } }));
  assert.equal(ctx.closed, 1); assert.equal(ctx.state, 'closed'); assert.equal(f.card.sound, null);
  assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0); assert.equal(f.tones.length, 0);
  assert.equal(f.uiWrites, writes); assert.deepEqual(Object.keys(f.handlers), []); assert.equal(f.intervalClears, 1);
});

test('destroy during pending module load cannot construct a Board or repaint after the script completes', async () => {
  const f = fixture({ lazyModule: true });
  f.card.update(view()); f.clickSound(); await flush(); assert.equal(f.scripts.length, 1);
  const ctx = f.contexts[0]; f.card.destroy(); const writes = f.uiWrites;
  f.loadModule(); await flush();
  assert.equal(f.boards.length, 0); assert.equal(f.uiWrites, writes); assert.equal(ctx.closed, 1);
  assert.equal(f.tones.length, 0); assert.equal(f.card.sound, null);
});

test('destroy during pending Board unlock closes the owned Board and cannot repaint or replay', async () => {
  const boardGate = deferred(), f = fixture({ boardGate });
  f.card.update(view()); f.clickSound(); await flush(); const board = f.boards[0];
  assert.equal(board.unlocks, 1); f.card.destroy(); const writes = f.uiWrites;
  assert.equal(board.closed, 1); boardGate.resolve(); await flush();
  assert.equal(f.uiWrites, writes); assert.equal(f.contexts[0].closed, 1);
  assert.deepEqual(board.cues, []); assert.equal(f.tones.length, 0); assert.equal(f.card.sound, null);
});

test('muting during pending Board unlock cannot repaint or replay when recordings finish', async () => {
  const boardGate = deferred(), f = fixture({ boardGate });
  try {
    f.card.update(view()); f.clickSound(); await flush(); const sound = f.card.sound, board = f.boards[0];
    f.clickSound(); await flush(); assert.equal(sound.enabled, false);
    const writes = f.uiWrites; boardGate.resolve(); await flush();
    assert.equal(f.uiWrites, writes); assert.equal(sound.enabled, false); assert.equal(sound.assetLoading, false);
    assert.deepEqual(board.cues, []); assert.equal(f.tones.length, 0);
  } finally { f.card.destroy(); }
});

test('muting during pending context resume cannot later load assets, repaint or replace the muted status', async () => {
  for (const reject of [false, true]) {
    const resumeGate = deferred(), f = fixture({ resumeGate, lazyModule: true });
    try {
      f.card.update(view()); f.clickSound(); await flush();
      f.clickSound(); await flush(); const writes = f.uiWrites;
      if (reject) resumeGate.reject(new Error('late_resume_failure')); else resumeGate.resolve();
      await flush();
      assert.equal(f.card.sound.enabled, false); assert.equal(f.card.sound.blocked, false);
      assert.equal(f.card.sound.assetError, false); assert.equal(f.card.sound.assetLoading, false);
      assert.equal(f.uiWrites, writes); assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0);
      assert.equal(f.tones.length, 0);
    } finally { f.card.destroy(); }
  }
});

test('a cancelled unlock failure cannot repaint a muted card or replace its status with an asset error', async () => {
  const moduleFailure = fixture({ lazyModule: true });
  try {
    moduleFailure.card.update(view()); moduleFailure.clickSound(); await flush();
    moduleFailure.clickSound(); await flush(); const writes = moduleFailure.uiWrites;
    moduleFailure.failModule(); await flush();
    assert.equal(moduleFailure.card.sound.enabled, false);
    assert.equal(moduleFailure.card.sound.assetError, false, 'stale failure must not overwrite the muted status');
    assert.equal(moduleFailure.uiWrites, writes, 'cancelled async work must not repaint');
    assert.equal(moduleFailure.boards.length, 0); assert.equal(moduleFailure.tones.length, 0);
  } finally { moduleFailure.card.destroy(); }
});

test('a rejected recording unlock after mute cannot publish a stale error or invoke the host hook', async () => {
  const boardGate = deferred(), f = fixture({ boardGate });
  try {
    f.card.update(view()); f.clickSound(); await flush(); const sound = f.card.sound;
    let calls = 0; sound.onCut = () => { calls++; return true; };
    f.clickSound(); await flush(); const writes = f.uiWrites;
    boardGate.reject(new Error('late_decode_failure')); await flush();
    assert.equal(sound.enabled, false); assert.equal(sound.assetError, false); assert.equal(sound.blocked, false);
    assert.equal(f.uiWrites, writes); sound.cue('cut'); assert.equal(calls, 0);
    assert.deepEqual(f.boards[0].cues, []); assert.equal(f.tones.length, 0);
  } finally { f.card.destroy(); }
});

test('muted or closed Sound never calls the host onCut hook, and closing does not own an external Board', async () => {
  const f = fixture();
  try {
    const sound = f.newSound(), board = f.newBoard(); let calls = 0;
    sound.edition = 'halloween'; sound.useHalloweenBoard(board);
    sound.onCut = () => { calls++; return true; };
    assert.equal(await sound.unlock(), true); assert.equal(sound.halloweenOwned, false);
    sound.cue('cut'); assert.equal(calls, 1); assert.deepEqual(board.cues, []);
    await sound.toggle(); sound.cue('cut'); sound.update(view({ phase: 'cut', turnId: 2, cutEvent: { id: 'muted-host-cut' } }).cut, 1000, true);
    assert.equal(calls, 1); assert.deepEqual(board.cues, []); assert.equal(f.tones.length, 0);
    sound.close(); sound.cue('cut');
    assert.equal(calls, 1); assert.equal(board.closed, 0, 'the host owns its external board lifecycle');
    assert.equal(f.contexts[0].closed, 1);
  } finally { f.card.destroy(); }
});
