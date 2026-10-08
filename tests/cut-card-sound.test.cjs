// Player audio is local, opt-in and independent of the authoritative game.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../cut-ui.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const view = (extra = {}) => ({ playerNum: 1, name: 'Amy', cut: {
  version: 1, sessionId: 'sound-room', turnId: 1, phase: 'speaking', speaker: 1,
  topic: { question: 'We open a cafe. What goes wrong?' }, sharedControls: true,
  roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Jason', active: true }], ...extra } });
function fixture(options = {}) {
  let clock = 1000, online = true, html = '', writes = 0, interval, clears = 0;
  const audio = [], tones = [], sent = [], handlers = {}, document = { hidden: false };
  const button = { textContent: '', attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } };
  const soundStatus = { textContent: '' }, status = { textContent: '' }, connection = { textContent: '' };
  class FakeAudio {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.closed = 0; this.resumed = 0; audio.push(this); }
    async resume() {
      this.resumed++;
      if (options.waitForResume) await new Promise(resolve => { this.releaseResume = resolve; });
      if (options.blocked || this.state === 'closed') throw new Error('audio blocked');
      this.state = 'running';
    }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
    createOscillator() {
      const tone = { frequency: { setValueAtTime() {} }, startCount: 0, stops: 0, disconnected: 0,
        connect() {}, start() { this.startCount++; }, stop() { this.stops++; }, disconnect() { this.disconnected++; } };
      tones.push(tone); return tone;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const context = vm.createContext({ document, window: options.unsupported ? {} : { AudioContext: FakeAudio },
    setInterval(fn) { interval = fn; return 31; }, clearInterval(id) { assert.equal(id, 31); clears++; },
    crypto: { randomUUID: () => 'local-card-command' } });
  vm.runInContext(source, context);
  const element = {
    get innerHTML() { return html; }, set innerHTML(v) { html = v; writes++; },
    querySelector(selector) {
      if (selector === '[data-cut-sound]') return html.includes('data-cut-sound ') ? button : null;
      if (selector === '[data-cut-sound-status]') return html.includes('data-cut-sound-status') ? soundStatus : null;
      if (selector === '[data-cut-action-status]') return status;
      if (selector === '[data-cut-connection]') return connection;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { handlers[type] = handler; },
    removeEventListener(type, handler) { assert.equal(handlers[type], handler); delete handlers[type]; },
  };
  const card = new context.CUT_UI.Card(element, { now: () => clock, connected: () => online, send: async command => sent.push(command) });
  return { card, element, audio, tones, sent, button, soundStatus, status, connection, document, handlers,
    get writes() { return writes; }, get clears() { return clears; }, set now(v) { clock = v; }, set online(v) { online = v; },
    paint: () => interval(), clickSound: () => handlers.click?.({ target: { closest: selector => selector === '[data-cut-sound]' ? button : null } }) };
}

test('shared cards begin muted with no AudioContext; legacy cards never instantiate player audio', () => {
  const f = fixture();
  try {
    f.card.update(view({ sharedControls: undefined }));
    assert.equal(f.card.sound, null); assert.doesNotMatch(f.element.innerHTML, /data-cut-sound/);
    f.card.update(view()); assert.equal(f.card.sound.enabled, false);
    assert.match(f.element.innerHTML, /data-cut-sound/); assert.match(f.button.textContent, /音效關閉/);
    assert.equal(f.button.attributes['aria-pressed'], 'false');
    f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'first-cut' } }));
    f.paint(); assert.equal(f.audio.length, 0); assert.equal(f.tones.length, 0); assert.equal(f.sent.length, 0);
  } finally { f.card.destroy(); }
});

test('an explicit card gesture enables cues locally without replaying the currently revealed CUT', async () => {
  const f = fixture();
  try {
    const first = view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'already-revealed' } });
    f.card.update(first); f.clickSound(); await flush();
    assert.equal(f.audio.length, 1); assert.equal(f.audio[0].resumed, 1); assert.equal(f.card.sound.enabled, true);
    assert.equal(f.button.attributes['aria-pressed'], 'true'); assert.match(f.button.textContent, /音效開啟/);
    assert.equal(f.tones.length, 0); f.paint(); assert.equal(f.tones.length, 0);
    f.card.update(view({ turnId: 3, speaker: 2 })); assert.equal(f.tones.length, 2, 'GO uses two local oscillator tones');
    const next = view({ phase: 'cut', turnId: 4, nextSpeaker: 1, cutEvent: { id: 'new-cut' } });
    f.card.update(next); assert.equal(f.tones.length, 6, 'CUT and next-player cues play once');
    const writes = f.writes;
    f.paint(); f.card.update({ ...next, cut: { ...next.cut, revision: 10, hostLiveUntil: 1 } });
    assert.equal(f.tones.length, 6); assert.equal(f.writes, writes);
    f.card.update({ ...next, cut: { ...next.cut, turnId: 5, roster: [...next.cut.roster] } });
    assert.equal(f.tones.length, 6, 'a roster update cannot repeat the same CUT event');
    assert.equal(f.sent.length, 0, 'audio never submits an authoritative command');
  } finally { f.card.destroy(); }
});

test('muting stops active voices, and enabling again cannot replay events observed while muted', async () => {
  const f = fixture();
  try {
    f.card.update(view()); f.clickSound(); await flush();
    f.card.update(view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'audible-cut' } }));
    assert.equal(f.tones.length, 4); assert.equal(f.card.sound.voices.size, 4);
    f.clickSound(); await flush();
    assert.equal(f.card.sound.enabled, false); assert.equal(f.card.sound.voices.size, 0);
    assert.ok(f.tones.every(tone => tone.stops === 2 && tone.disconnected === 1));
    f.card.update(view({ turnId: 3, speaker: 2 }));
    f.card.update(view({ phase: 'cut', turnId: 4, nextSpeaker: 1, cutEvent: { id: 'muted-cut' } }));
    assert.equal(f.tones.length, 4); f.clickSound(); await flush(); f.paint(); assert.equal(f.tones.length, 4);
    f.card.update(view({ turnId: 5 })); assert.equal(f.tones.length, 6);
  } finally { f.card.destroy(); assert.equal(f.audio[0].closed, 1); assert.equal(f.audio[0].state, 'closed'); }
});

test('disconnect and a hidden page silence cues without pausing or rewriting the visible game', async () => {
  const f = fixture();
  try {
    f.card.update(view()); f.clickSound(); await flush();
    f.online = false;
    const offlineCut = view({ phase: 'cut', turnId: 2, nextSpeaker: 2, cutEvent: { id: 'offline-cut' } });
    f.card.update(offlineCut); assert.equal(f.tones.length, 0); assert.match(f.element.innerHTML, /data-cut-phase="cut"/);
    f.online = true; f.paint(); assert.equal(f.tones.length, 0, 'reconnection does not replay CUT');
    f.card.update(view({ turnId: 3, speaker: 2 })); assert.equal(f.tones.length, 2);
    f.document.hidden = true;
    f.card.update(view({ phase: 'cut', turnId: 4, nextSpeaker: 1, cutEvent: { id: 'background-cut' } }));
    assert.equal(f.tones.length, 2); assert.equal(f.card.sound.voices.size, 0);
    f.document.hidden = false; f.paint(); assert.equal(f.tones.length, 2);
    assert.equal(f.sent.length, 0); assert.equal(f.card.data.cut.phase, 'cut');
  } finally { f.card.destroy(); }
});

test('blocked or unsupported audio reports locally and leaves all game actions usable', async () => {
  for (const options of [{ blocked: true }, { unsupported: true }]) {
    const f = fixture(options);
    try {
      f.card.update(view({ phase: 'ready', canBegin: true }));
      f.clickSound(); await flush(); f.paint();
      assert.equal(f.tones.length, 0); assert.equal(f.card.canBegin(), true);
      assert.equal(f.card.canAction('settings'), true); assert.equal(f.sent.length, 0);
      assert.match(f.soundStatus.textContent, options.unsupported ? /無法播放提示音/ : /啟用音效/);
      if (options.blocked) assert.match(f.button.textContent, /啟用音效/);
    } finally { f.card.destroy(); }
  }
});

test('teardown closes audio even during pending unlock, removes listeners and cannot repaint or resurrect it', async () => {
  const f = fixture({ waitForResume: true });
  f.card.update(view()); f.clickSound();
  assert.equal(f.audio.length, 1); const context = f.audio[0], writes = f.writes;
  f.card.destroy(); assert.equal(context.closed, 1); assert.equal(f.card.sound, null);
  assert.deepEqual(Object.keys(f.handlers), []); assert.equal(f.clears, 1);
  context.releaseResume(); await flush();
  f.paint(); f.card.update(view({ phase: 'cut', turnId: 2, cutEvent: { id: 'late-cut' } }));
  assert.equal(f.writes, writes); assert.equal(f.audio.length, 1); assert.equal(f.tones.length, 0);
  assert.equal(context.state, 'closed');
});

test('switching out of service mode closes audio and a later independent card starts muted again', async () => {
  const f = fixture();
  try {
    f.card.update(view()); f.clickSound(); await flush();
    f.card.update(view({ sharedControls: undefined }));
    assert.equal(f.card.sound, null); assert.equal(f.audio[0].closed, 1); assert.doesNotMatch(f.element.innerHTML, /data-cut-sound/);
    f.card.update(view({ sessionId: 'new-service-room' }));
    assert.equal(f.card.sound.enabled, false); assert.equal(f.audio.length, 1);
  } finally { f.card.destroy(); }
});


test('a freshly restored ready topic stays silent until manual Begin, with optional countdown and GO cues', async () => {
  const f = fixture();
  try {
    f.card.update(view({ phase: 'ready', canBegin: true, canEndTopic: true }));
    assert.equal(f.card.sound.enabled, false); assert.equal(f.card.canBegin(), true);
    assert.match(f.element.innerHTML, /data-cut-action="endTopic"/);
    f.clickSound(); await flush(); f.paint(); assert.equal(f.tones.length, 0);
    f.card.update(view({ phase: 'countdown', turnId: 2, phaseUntil: 4000, canBegin: false, canEndTopic: true }));
    assert.equal(f.tones.length, 3);
    f.now = 2000; f.paint(); f.now = 3000; f.paint(); assert.equal(f.tones.length, 5);
    f.now = 4000; f.card.update(view({ phase: 'speaking', turnId: 3, canBegin: false, canEndTopic: true }));
    assert.equal(f.tones.length, 7); assert.equal(f.sent.length, 0);
    assert.equal(f.card.data.cut.phase, 'speaking'); assert.equal(f.card.canAction('endTopic'), true);
  } finally { f.card.destroy(); }
});
