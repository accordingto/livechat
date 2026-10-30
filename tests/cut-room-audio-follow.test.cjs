'use strict';
// Client follower behavior. Authority/transport and actual Web Audio have
// separate tests; this VM fixture makes late async work and reconnect repeatable.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../cut-ui.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function audio(patch = {}) { return { version: 1, revision: 0, music: null, musicStartedAt: null, musicVolume: .28, effectsVolume: .65, autoScare: true, cutEffect: 'random', event: null, ...patch }; }
function cut(patch = {}) { return { version: 1, sessionId: 'room-audio-one', turnId: 1, edition: 'halloween', phase: 'ready', roster: [{ playerNum: 1, name: 'Amy' }, { playerNum: 2, name: 'Kevin' }], audio: audio(), ...patch }; }
function fixture(options = {}) {
  let now = 10000, changes = 0;
  const boards = [], contexts = [], scripts = [], tones = [], levels = [], listeners = new Map();
  const document = { hidden: false, createElement: () => ({ remove() {} }), head: { appendChild(script) { scripts.push(script); } },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  };
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.closed = 0; contexts.push(this); }
    async resume() { if (options.resumeGate) await options.resumeGate.promise; if (this.state === 'closed') throw Error('closed'); this.state = 'running'; }
    async close() { this.state = 'closed'; this.closed++; }
    createOscillator() { const tone = { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {} }; tones.push(tone); return tone; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime(value) { levels.push(value); } }, connect() {}, disconnect() {} }; }
  }
  class Board {
    constructor({ context } = {}) { this.context = context; this.ready = false; this.closed = 0; this.track = null; this.musicVolume = .28; this.effectsVolume = .65; this.autoScare = true; this.starts = []; this.musicStops = 0; this.effectStops = 0; this.plays = []; this.cues = []; boards.push(this); }
    async unlock() { if (options.boardGate) await options.boardGate.promise; if (this.closed) return false; this.ready = true; return true; }
    async startMusic(track, options) { this.track = track; this.starts.push({ track, options: clone(options) }); }
    stopMusic() { this.musicStops++; this.track = null; }
    stopEffects() { this.effectStops++; }
    setMusicVolume(value) { this.musicVolume = value; }
    setEffectsVolume(value) { this.effectsVolume = value; }
    setAutoScare(value) { this.autoScare = value; }
    play(key) { this.plays.push(key); return 2; }
    cue(key) { this.cues.push(key); return true; }
    sting() { this.plays.push('sting'); return 1; }
    close() { this.closed++; this.ready = false; this.track = null; }
  }
  const sandbox = vm.createContext({ window: { AudioContext: Context }, Date: { now: () => now },
    document,
    ...(options.lazyModule ? {} : { CUT_HALLOWEEN_AUDIO: { Board } }), setInterval() { return 1; }, clearInterval() {},
  });
  vm.runInContext(source, sandbox);
  const sound = new sandbox.CUT_UI.Sound(() => { changes++; });
  return { sound, boards, contexts, scripts, tones, levels, sandbox, document, listeners, get changes() { return changes; }, set now(value) { now = value; },
    update(view, audible = true) { sound.update(clone(view), now, false, audible); },
    loadModule() { sandbox.CUT_HALLOWEEN_AUDIO = { Board }; scripts.at(-1).onload(); },
  };
}

test('a quiet room follower records only current state without context, module load or playback', () => {
  const f = fixture({ lazyModule: true }); f.sound.enabled = false;
  try {
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 2000, event: { id: 'already-heard', at: 10000, key: 'scream' } }) }));
    assert.equal(f.contexts.length, 0); assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0);
    assert.equal(f.sound.roomEventId, 'already-heard'); assert.equal(f.sound.roomAudible, false);
  } finally { f.sound.close(); }
});

test('first enable follows the current music offset and volumes without replaying its old one-shot', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 2500, musicVolume: .19, effectsVolume: .42, event: { id: 'old-effect', at: 10000, key: 'scream' } }) }));
    assert.equal(await f.sound.unlock(), true); const board = f.boards[0];
    assert.deepEqual(board.starts, [{ track: 'rain', options: { offsetSeconds: 7.5 } }]);
    assert.equal(board.musicVolume, .19); assert.equal(board.effectsVolume, .42); assert.deepEqual(board.plays, []);
    assert.equal(f.tones.length, 0);
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 2500, musicVolume: .19, effectsVolume: .42, event: { id: 'old-effect', at: 10000, key: 'scream' } }) }));
    assert.equal(board.starts.length, 1); assert.deepEqual(board.plays, []);
  } finally { f.sound.close(); }
});

test('new manual effects play once while audible; old and future events are consumed', async () => {
  const f = fixture();
  try {
    f.update(cut()); await f.sound.unlock(); const board = f.boards[0];
    const live = cut({ audio: audio({ revision: 1, event: { id: 'live-door', at: 10000, key: 'door' } }) });
    f.update(live); f.update(live); assert.deepEqual(board.plays, ['door']);
    f.now = 20000;
    f.update(cut({ audio: audio({ revision: 2, event: { id: 'too-old', at: 10000, key: 'scream' } }) }));
    f.update(cut({ audio: audio({ revision: 3, event: { id: 'bad-future', at: 24000, key: 'laugh' } }) }));
    assert.deepEqual(board.plays, ['door']);
  } finally { f.sound.close(); }
});

test('volume-only updates preserve playing music; a new music start epoch restarts the same track', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
    f.update(cut({ audio: audio({ revision: 1, music: 'wind', musicStartedAt: 1000, musicVolume: .1, effectsVolume: 0 }) }));
    assert.equal(board.starts.length, 1); assert.equal(board.musicVolume, .1); assert.equal(board.effectsVolume, 0);
    f.update(cut({ audio: audio({ revision: 2, music: 'wind', musicStartedAt: 9000, musicVolume: .1, effectsVolume: 0 }) }));
    assert.equal(board.starts.length, 2); assert.deepEqual(board.starts[1], { track: 'wind', options: { offsetSeconds: 1 } });
    f.update(cut({ audio: audio({ revision: 3, music: null }) })); assert.equal(board.track, null);
  } finally { f.sound.close(); }
});

test('mute consumes room events and unmute follows latest track without replaying muted effects', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
    await f.sound.toggle(); assert.equal(f.sound.enabled, false); assert.equal(board.track, null); assert.ok(board.effectStops > 0);
    f.update(cut({ audio: audio({ revision: 1, music: 'rain', musicStartedAt: 8000, event: { id: 'during-mute', at: 10000, key: 'laugh' } }) }));
    assert.equal(board.starts.length, 1); assert.deepEqual(board.plays, []);
    await f.sound.toggle(); assert.equal(board.track, 'rain'); assert.equal(board.starts.at(-1).options.offsetSeconds, 2); assert.deepEqual(board.plays, []);
  } finally { f.sound.close(); }
});

test('hidden or disconnected playback stops and resumes only current music without a one-shot backlog', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 1000, event: { id: 'while-away', at: 10000, key: 'howl' } }) }), false);
    assert.equal(board.track, null); assert.deepEqual(board.plays, []);
    f.now = 12000;
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 1000, event: { id: 'while-away', at: 10000, key: 'howl' } }) }), true);
    assert.equal(board.track, 'rain'); assert.equal(board.starts.at(-1).options.offsetSeconds, 11); assert.deepEqual(board.plays, []);
  } finally { f.sound.close(); }
});

test('unlock completion uses latest room snapshot, not the track or effect from when loading started', async () => {
  const gate = deferred(), f = fixture({ boardGate: gate });
  try {
    f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); const loading = f.sound.unlock(); await flush();
    f.update(cut({ audio: audio({ revision: 1, music: 'rain', musicStartedAt: 7000, event: { id: 'loading-scare', at: 10000, key: 'scream' } }) }));
    gate.resolve(); assert.equal(await loading, true); const board = f.boards[0];
    assert.deepEqual(board.starts, [{ track: 'rain', options: { offsetSeconds: 3 } }]); assert.deepEqual(board.plays, []);
  } finally { f.sound.close(); }
});

test('muting during pending module load cannot start music after the module eventually arrives', async () => {
  const f = fixture({ lazyModule: true });
  try {
    f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 1000 }) })); const loading = f.sound.unlock(); await flush();
    assert.equal(f.scripts.length, 1); await f.sound.toggle(); f.loadModule(); assert.equal(await loading, false);
    assert.equal(f.boards.length, 0); assert.equal(f.sound.enabled, false);
  } finally { f.sound.close(); }
});

test('new session and stopped game suppress their initial event and stop old music', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
    f.update(cut({ sessionId: 'room-audio-two', audio: audio({ event: { id: 'other-room-old', at: 10000, key: 'scream' } }) }));
    assert.equal(board.track, null); assert.deepEqual(board.plays, []);
    f.update(cut({ sessionId: 'room-audio-two', audio: audio({ music: 'rain', musicStartedAt: 1000 }) })); assert.equal(board.track, 'rain');
    f.update(cut({ sessionId: 'room-audio-two', phase: 'stopped', audio: audio({ music: 'rain', musicStartedAt: 1000 }) }));
    assert.equal(board.track, null); assert.equal(f.sound.roomAudible, false);
  } finally { f.sound.close(); }
});

test('authoritative selected and random CUT recordings agree across independent followers and dedupe the event', async () => {
  const followers = [fixture(), fixture(), fixture()];
  try {
    for (const f of followers) { f.update(cut()); await f.sound.unlock(); }
    const selected = cut({ phase: 'cut', turnId: 2, cutEvent: { id: 'same-cut-one' }, audio: audio({ cutEffect: 'door' }) });
    for (const f of followers) { f.update(selected); f.update(selected); assert.deepEqual(f.boards[0].plays, ['door']); }
    const random = cut({ phase: 'cut', turnId: 3, cutEvent: { id: 'same-cut-two' }, audio: audio() });
    for (const f of followers) f.update(random);
    assert.ok(followers.every(f => f.boards[0].plays.length === 2));
    assert.ok(followers.every(f => f.boards[0].plays[1] === followers[0].boards[0].plays[1]));
    assert.ok(['scream', 'laugh', 'ghost', 'howl', 'thunder'].includes(followers[0].boards[0].plays[1]));
  } finally { for (const f of followers) f.sound.close(); }
});

test('classic CUT retains its cues while the host effects volume can reduce or silence them', async () => {
  const f = fixture({ lazyModule: true });
  try {
    f.update(cut({ edition: 'classic' })); await f.sound.unlock();
    f.sound.cue('go'); assert.equal(f.tones.length, 2); assert.ok(f.levels.includes(.08));
    f.update(cut({ edition: 'classic', audio: audio({ effectsVolume: 0 }) })); f.sound.cue('cut');
    assert.equal(f.tones.length, 2, 'room effects volume zero suppresses classic oscillators');
    f.update(cut({ edition: 'classic', audio: audio({ effectsVolume: .325 }) })); f.sound.cue('go');
    assert.equal(f.tones.length, 4); assert.ok(f.levels.includes(.04), 'half host level halves original cue gain');
    assert.equal(f.scripts.length, 0); assert.equal(f.boards.length, 0);
  } finally { f.sound.close(); }
});

test('changing edition to classic stops Halloween ambience without creating a new board', async () => {
  const f = fixture();
  try {
    f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
    f.update(cut({ edition: 'classic', audio: audio({ music: 'wind', musicStartedAt: 1000 }) }));
    assert.equal(board.track, null); assert.equal(f.boards.length, 1); assert.equal(board.starts.length, 1);
  } finally { f.sound.close(); }
});

test('repeated audio gestures and a GO transition do not restart an already-followed music loop', async () => {
  const f = fixture();
  try {
    const settings = audio({ music: 'rain', musicStartedAt: 1000 });
    f.update(cut({ audio: settings })); await f.sound.unlock(); const board = f.boards[0];
    await f.sound.unlock(); await f.sound.unlock();
    f.update(cut({ phase: 'speaking', turnId: 2, speaker: 1, audio: settings }));
    assert.equal(board.starts.length, 1); assert.equal(board.track, 'rain');
  } finally { f.sound.close(); }
});

test('the captured CUT recording and scare flag remain authoritative after later mixer changes', async () => {
  const f = fixture();
  try {
    f.update(cut()); await f.sound.unlock(); const board = f.boards[0];
    f.update(cut({ phase: 'cut', turnId: 2, cutEvent: { id: 'captured-door', audioKey: 'door', audioScare: true }, audio: audio({ cutEffect: 'scream', autoScare: false }) }));
    assert.deepEqual(board.plays, ['door']);
    f.update(cut({ phase: 'cut', turnId: 3, cutEvent: { id: 'captured-quiet', audioKey: 'bell', audioScare: false }, audio: audio({ cutEffect: 'howl', autoScare: true }) }));
    assert.deepEqual(board.plays, ['door', 'sting']);
  } finally { f.sound.close(); }
});

test('visibility hides silence immediately, suppress pending room events, and unregister on close', async () => {
  const f = fixture();
  f.update(cut({ audio: audio({ music: 'wind', musicStartedAt: 1000 }) })); await f.sound.unlock(); const board = f.boards[0];
  assert.equal(f.listeners.get('visibilitychange').size, 1);
  f.document.hidden = true; for (const fn of f.listeners.get('visibilitychange')) fn();
  assert.equal(board.track, null); assert.ok(board.effectStops > 0);
  f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 9000, event: { id: 'hidden', at: 10000, key: 'scream' } }) }));
  assert.equal(board.track, null); assert.deepEqual(board.plays, []);
  f.document.hidden = false;
  f.update(cut({ audio: audio({ music: 'rain', musicStartedAt: 9000, event: { id: 'hidden', at: 10000, key: 'scream' } }) }));
  assert.equal(board.track, 'rain'); assert.deepEqual(board.plays, []);
  f.sound.close(); assert.equal(f.listeners.get('visibilitychange').size, 0);
});

test('ready, settings, pause and topic-break transitions stop cues while keeping room music continuous', async () => {
  const f = fixture();
  try {
    const settings = audio({ music: 'rain', musicStartedAt: 1000 });
    f.update(cut({ audio: settings })); await f.sound.unlock(); const board = f.boards[0];
    let turnId = 2;
    for (const phase of ['speaking', 'setup', 'ready', 'countdown', 'speaking', 'paused', 'ready', 'break', 'ready']) {
      f.update(cut({ phase, turnId: turnId++, speaker: 1, audio: settings }));
      assert.equal(board.track, 'rain', phase + ' retains room background');
      assert.equal(board.starts.length, 1, phase + ' does not restart its loop');
    }
  } finally { f.sound.close(); }
});
