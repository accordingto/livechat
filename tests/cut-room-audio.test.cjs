'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CUT = require('../cut-engine.js');
const { adapters } = require('../runtime/party-executor.cjs');
const roster = [1, 2, 3].map(playerNum => ({ playerNum, name: 'Player ' + playerNum }));
let sequence = 0;
const create = extra => CUT.create({ id: 'room-audio-test', roster, now: 1000, seed: 123, edition: 'halloween', ...extra });
const command = (state, type, extra = {}) => ({ id: 'audio-command-' + ++sequence, type, actor: 0,
  sessionId: state.sessionId, turnId: state.turnId, now: Math.max(state.lastChangeAt, state.audioUpdatedAt || 0) + 1, seed: 789, ...extra });
const apply = (state, type, extra) => CUT.apply(state, command(state, type, extra));
const gameplay = state => {
  const result = structuredClone(state);
  for (const key of Object.keys(result)) if (key.startsWith('audio')) delete result[key];
  return result;
};
const speaking = state => {
  const prep = apply(state, 'begin');
  return apply(prep, 'tick', { now: prep.phaseUntil });
};
const audioOk = state => assert.equal(state.audioReplies[0].error, '');

test('room audio defaults are safe/public for all original cards and old rooms without mutating active state', () => {
  const state = speaking(create()), original = structuredClone(state);
  const legacy = structuredClone(state); delete legacy.audio; delete legacy.audioSeen; delete legacy.audioReplies; delete legacy.audioUpdatedAt;
  const defaults = { version: 1, revision: 0, music: null, musicStartedAt: null,
    musicVolume: .28, effectsVolume: .65, autoScare: true, cutEffect: 'random', event: null };
  for (const n of [0, 1, 2, 3]) {
    assert.deepEqual(CUT.view(legacy, n, 5000).cut.audio, defaults);
    assert.equal(CUT.view(legacy, n, 5000).cut.canControlAudio, n === 0);
  }
  assert.deepEqual(state, original);
  assert.equal(legacy.audio, undefined);
  const changed = apply(state, 'audioSettings', { music: 'wind', musicVolume: .4, effectsVolume: .2, cutEffect: 'door', autoScare: false });
  audioOk(changed);
  for (const n of [1, 2, 3]) {
    const view = CUT.view(changed, n, 5000).cut;
    assert.deepEqual(view.audio, changed.audio);
    for (const key of ['audioSeen', 'audioReplies', 'audioUpdatedAt', 'audioLastScare', 'deadline', 'stats', 'recent']) assert.equal(view[key], undefined);
  }
});

test('host changes room audio during any gameplay phase without touching clocks, topics, RNG/fairness or gameplay acknowledgements', () => {
  for (const mode of ['classic', 'jump']) {
    let state = speaking(create({ mode }));
    state.replies[2] = { id: 'pending-player-action', error: '' };
    const before = gameplay(state);
    // An old turn fence is harmless: the room audio action cannot consume it.
    state = apply(state, 'audioSettings', { music: 'rain', turnId: -100 });
    audioOk(state); assert.deepEqual(gameplay(state), before);
    assert.equal(state.audio.musicStartedAt, state.audioUpdatedAt);
    const event = apply(state, 'audioEffect', { key: 'door', turnId: -100, now: state.deadline + 10000 });
    audioOk(event); assert.deepEqual(gameplay(event), before);
    assert.equal(event.audio.event.key, 'door'); assert.equal(event.audio.event.at, state.deadline + 10000);
    assert.equal(event.audio.revision, state.audio.revision + 1);
  }
});

test('music epoch changes only on a track change; levels, no-op updates and explicit stop behave predictably', () => {
  let state = apply(create(), 'audioSettings', { music: 'wind' });
  const epoch = state.audio.musicStartedAt, rev = state.audio.revision;
  state = apply(state, 'audioSettings', { musicVolume: .5, effectsVolume: .25, autoScare: false, cutEffect: 'howl' });
  assert.equal(state.audio.musicStartedAt, epoch); assert.equal(state.audio.revision, rev + 1);
  const previous = structuredClone(state.audio);
  state = apply(state, 'audioSettings', { music: 'wind', musicVolume: .5 });
  assert.deepEqual(state.audio, previous);
  state = apply(state, 'audioSettings', { music: 'rain' });
  assert.ok(state.audio.musicStartedAt > epoch);
  state = apply(state, 'audioSettings', { music: null });
  assert.equal(state.audio.musicStartedAt, null); assert.equal(state.audio.music, null);
});

test('players cannot configure or trigger room audio, even with shared controls and forged host flags', () => {
  const state = { ...create(), sharedControls: true };
  for (const actor of [1, 2, 3]) for (const [type, extra] of [['audioSettings', { music: 'rain' }], ['audioEffect', { key: 'scream' }]]) {
    const next = apply(state, type, { ...extra, actor, isHost: true, sharedControls: true });
    assert.equal(next.audioReplies[actor].error, 'not_available');
    assert.deepEqual(next.audio, state.audio); assert.deepEqual(gameplay(next), gameplay(state));
  }
  assert.equal(CUT.apply(state, command(state, 'audioEffect', { actor: 99, key: 'door' })), state);
});

test('runtime uses authenticated host/seat identity instead of the command actor and projects one public audio state', () => {
  const state = create(), host = { actor: 0, now: 1100, seed: 2 };
  const spoof = command(state, 'audioSettings', { actor: 0, music: 'rain' });
  const denied = adapters.cut.apply(state, spoof, { ...host, actor: 2, seat: { playerNum: 2 } });
  assert.equal(denied.audioReplies[2].error, 'not_available');
  assert.deepEqual(denied.audio, state.audio);
  const accepted = adapters.cut.apply(state, spoof, host);
  audioOk(accepted); assert.equal(accepted.audio.music, 'rain');
  assert.equal(accepted.audio.musicStartedAt, 1100);
  for (const playerNum of [1, 2, 3]) assert.deepEqual(adapters.cut.project(accepted, { playerNum }, host).cut.audio, accepted.audio);
});

test('audio inputs are allowlisted/validated atomically and malformed settings never change a valid setting', () => {
  const state = create();
  for (const patch of [{}, { music: '../outside.mp3' }, { music: 'rain', musicVolume: NaN }, { musicVolume: -1 },
    { musicVolume: 1.1 }, { effectsVolume: '1' }, { autoScare: 1 }, { cutEffect: 'voice-api' }]) {
    const next = apply(state, 'audioSettings', patch);
    assert.equal(next.audioReplies[0].error, 'invalid_options'); assert.deepEqual(next.audio, state.audio);
  }
  for (const key of ['../door', null, '']) {
    const next = apply(state, 'audioEffect', { key });
    assert.equal(next.audioReplies[0].error, 'invalid_options'); assert.deepEqual(next.audio, state.audio);
  }
  for (const audio of [null, [], { musicVolume: Infinity }, { cutEffect: 'other' }]) assert.throws(() => create({ audio }), /invalid_options/);
});

test('audio commands have bounded independent dedup, current-session and monotonic-time guards', () => {
  let state = create();
  const event = command(state, 'audioEffect', { key: 'door' });
  state = CUT.apply(state, event);
  assert.equal(CUT.apply(state, { ...event, now: 99999 }), state);
  assert.equal(CUT.apply(state, { ...event, id: 'wrong-session', sessionId: 'old' }), state);
  const old = apply(state, 'audioSettings', { music: 'rain', now: state.audioUpdatedAt - 1 });
  assert.equal(old.audioReplies[0].error, 'invalid_time'); assert.deepEqual(old.audio, state.audio);
  for (let i = 0; i < 70; i++) state = apply(state, 'audioSettings', { musicVolume: i % 2 });
  assert.equal(state.audioSeen[0].length, 32);
  assert.deepEqual(state.seen, {}); assert.deepEqual(state.replies, {});
});

test('same-session restart preserves room audio settings/epoch and dedup, but clears the old manual event', () => {
  for (const mode of ['classic', 'jump']) {
    let state = apply(create({ mode }), 'audioSettings', { music: 'rain', cutEffect: 'laugh', effectsVolume: .1 });
    const event = command(state, 'audioEffect', { key: 'door' }); state = CUT.apply(state, event);
    const before = structuredClone(state.audio), ledger = structuredClone(state.audioSeen);
    state.sharedControls = true;
    const next = apply(state, 'restart');
    assert.equal(next.replies[0].error, '');
    assert.deepEqual(next.audio, { ...before, event: null });
    assert.deepEqual(next.audioSeen, ledger);
    assert.equal(CUT.apply(next, { ...event, now: next.lastChangeAt + 1 }), next);
  }
});

test('initial host audio settings are retained by create while manual events/epochs cannot be injected', () => {
  const state = create({ audio: { music: 'rain', musicVolume: .1, effectsVolume: .2, autoScare: false, cutEffect: 'door',
    revision: 100, musicStartedAt: 99, event: { id: 'injected', key: 'scream', at: 1000 } } });
  assert.equal(state.audio.music, 'rain'); assert.equal(state.audio.musicStartedAt, 1000);
  assert.equal(state.audio.revision, 0); assert.equal(state.audio.event, null);
});

test('each new Halloween CUT seals the same nonrepeating recorded cue for every player without consuming game RNG', () => {
  for (const mode of ['classic', 'jump']) {
    let state = speaking(create({ mode, firstCutMinSeconds: 5, firstCutMaxSeconds: 5, cutIntervalMinSeconds: 5, cutIntervalMaxSeconds: 5 }));
    let previous = '';
    for (let i = 0; i < 10; i++) {
      state = apply(state, 'tick', { now: state.deadline });
      assert.ok(['scream', 'laugh', 'ghost', 'howl', 'thunder'].includes(state.cutEvent.audioKey));
      assert.notEqual(state.cutEvent.audioKey, previous); assert.equal(state.cutEvent.audioScare, true);
      previous = state.cutEvent.audioKey;
      for (const n of [0, 1, 2, 3]) assert.equal(CUT.view(state, n, state.lastChangeAt).cut.cutEvent.audioKey, previous);
      if (mode === 'jump') {
        state = apply(state, 'done'); state = apply(state, 'tick', { now: state.phaseUntil });
      } else state = apply(state, 'begin');
    }
  }
});

test('fixed and quiet CUT cues are captured only at a new CUT, while existing and legacy events stay unchanged', () => {
  let state = apply(create(), 'audioSettings', { cutEffect: 'door' });
  state = speaking(state); state = apply(state, 'tick', { now: state.deadline });
  assert.equal(state.cutEvent.audioKey, 'door'); assert.equal(state.cutEvent.audioScare, true);
  const event = structuredClone(state.cutEvent);
  state = apply(state, 'audioSettings', { autoScare: false, cutEffect: 'scream' });
  assert.deepEqual(state.cutEvent, event);
  state = apply(state, 'begin'); state = apply(state, 'tick', { now: state.deadline });
  assert.equal(state.cutEvent.audioKey, 'bell'); assert.equal(state.cutEvent.audioScare, false);
  const classic = speaking(create({ edition: 'classic' }));
  assert.equal(apply(classic, 'tick', { now: classic.deadline }).cutEvent.audioKey, undefined);
});

test('audio choices and captured scare selection leave the identical seeded gameplay/fairness trajectory intact', () => {
  const comparable = state => {
    const next = gameplay(state);
    if (next.cutEvent) { delete next.cutEvent.audioKey; delete next.cutEvent.audioScare; }
    return next;
  };
  for (const mode of ['classic', 'jump']) {
    let original = create({ mode }), configured = apply(original, 'audioSettings', { cutEffect: 'door', music: 'rain' });
    for (let i = 0; i < 30; i++) {
      const type = original.phase === 'interrupt' ? 'done' : ['speaking', 'countdown', 'back'].includes(original.phase) ? 'tick' : 'begin';
      const now = original.phase === 'speaking' ? original.deadline : ['countdown', 'back'].includes(original.phase) ? original.phaseUntil
        : Math.max(original.lastChangeAt, configured.audioUpdatedAt || 0) + 1;
      const input = { id: 'same-gameplay-' + i, type, actor: 0, sessionId: original.sessionId, turnId: original.turnId, now, seed: 11000 + i };
      original = CUT.apply(original, input); configured = CUT.apply(configured, input);
      assert.deepEqual(comparable(configured), comparable(original), mode + ' step ' + i);
    }
  }
});
