'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const audio = require('../bomb-relay-audio.js');
const root = path.resolve(__dirname, '..');
const hash = samples => crypto.createHash('sha256').update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)).digest('hex');
// Fingerprints from the approved demo, including its trimmed recording and
// deterministic bass-reduced explosion; no demo files are needed at runtime.
const approved = {
  44100: { tick: 'b1eac5175c96826a1ece8b8023abc0e63a44ca7e2f2100f3133456159af73b50', boom: '65842d9222d58ce342ecadeadbeebd3573b6fc5ccbcb385ffe3d97fb440c356d' },
  48000: { tick: 'ec9470e7cdb3fa25c33a5d76d9f766b8d37edff1de286ff7e1179b3243cda8cf', boom: 'aa7166b6fc4f027ba26ee205bbefd375549b994aa2479ff5b3699773ebab717f' },
};
test('production cues match the approved lighter recording and bass-reduced boom', () => {
  assert.equal(audio.cadenceMs, 1000); assert.equal(audio.gain, .6);
  for (const rate of [44100, 48000]) for (const kind of ['tick', 'boom']) {
    const samples = audio.getSamples(kind, rate);
    assert.equal(hash(samples), approved[rate][kind]);
    assert.equal(samples.length, Math.round(rate * (kind === 'tick' ? .0525 : .52)));
    assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
    assert.ok(samples.every(Number.isFinite));
  }
  assert.throws(() => audio.getSamples('missing'), RangeError);
});
test('the browser classic script produces the same samples without loading media', () => {
  const context = vm.createContext({ atob });
  const source = fs.readFileSync(path.join(root, 'bomb-relay-audio.js'), 'utf8');
  vm.runInContext(source, context);
  for (const kind of ['tick', 'boom']) assert.equal(hash(context.BOMB_RELAY_AUDIO.getSamples(kind, 48000)), approved[48000][kind]);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|decodeAudioData/);
});
function fixture() {
  const intervals = new Map(); let timer = 0;
  class Node {
    constructor() { this.stops = []; this.disconnected = false; }
    connect(target) { return target; }
    disconnect() { this.disconnected = true; }
    start() { this.started = true; }
    stop(at) { this.stops.push(at); }
    finish() { this.onended?.(); }
  }
  class Context {
    constructor() { this.state = 'running'; this.sampleRate = 48000; this.currentTime = 2; this.nodes = []; this.bufferCount = 0; }
    createBuffer(channels, size) { this.bufferCount++; const samples = new Float32Array(size); return { copyToChannel: data => samples.set(data), getChannelData: () => samples }; }
    createBufferSource() { const node = new Node(); this.nodes.push(node); return node; }
    createGain() { return Object.assign(new Node(), { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} } }); }
    createOscillator() { const node = new Node(); node.frequency = { setValueAtTime(value) { node.frequencyValue = value; }, exponentialRampToValueAtTime() {} }; this.nodes.push(node); return node; }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const context = vm.createContext({ window: { AudioContext: Context }, BOMB_RELAY_AUDIO: audio,
    setInterval: (callback, cadence) => { intervals.set(++timer, { callback, cadence }); return timer; }, clearInterval: id => intervals.delete(id) });
  vm.runInContext(fs.readFileSync(path.join(root, 'bomb-relay-ui.js'), 'utf8') + ';this.UI = BOMB_RELAY_UI;', context);
  return { sound: new context.UI.Sound(), intervals };
}
test('one steady loop survives a pass; pause stops ticks and boom settles audibly once', () => {
  const { sound, intervals } = fixture();
  const bomb = { sessionId: 's', turnId: 1, phase: 'ticking' };
  sound.follow(bomb); const loop = sound.loop;
  assert.equal(intervals.get(loop).cadence, 1000);
  intervals.get(loop).callback(); intervals.get(loop).callback();
  assert.equal(sound.context.bufferCount, 1, 'recorded tick buffer is reused');
  assert.equal(hash(sound.context.nodes[0].buffer.getChannelData(0)), approved[48000].tick);
  sound.follow({ ...bomb, turnId: 2 });
  assert.equal(sound.loop, loop, 'passing does not restart the sound rhythm');
  assert.equal(sound.context.nodes.at(-1).frequencyValue, 520, 'original pass cue');
  sound.follow({ ...bomb, phase: 'paused' });
  assert.equal(intervals.size, 0); assert.ok(sound.context.nodes[0].stops.length);
  const boom = { ...bomb, phase: 'boom', boom: { id: 'b1' } };
  sound.follow(boom); const count = sound.context.nodes.length;
  sound.follow(boom); assert.equal(sound.context.nodes.length, count);
  assert.equal(hash(sound.context.nodes.at(-1).buffer.getChannelData(0)), approved[48000].boom);
  sound.close();
});
test('mute and card disposal stop active audio; disabled phones do not play cues', async () => {
  const { sound } = fixture();
  sound.enabled = false; sound.tick(); sound.boom(); assert.equal(sound.context, null);
  await sound.toggle(); sound.boom();
  const context = sound.context, source = context.nodes.at(-1);
  await sound.toggle(); assert.ok(source.stops.length, 'mute stops an active explosion');
  source.finish(); assert.equal(sound.sources.size, 0); assert.equal(source.disconnected, true);
  await sound.toggle(); sound.tick(); const tick = context.nodes.at(-1);
  sound.close(); assert.ok(tick.stops.length); assert.equal(context.state, 'closed'); assert.equal(sound.buffers.size, 0);
});

test('discussion and the following preview stay silent, including a reconnect', () => {
  const { sound, intervals } = fixture();
  const ticking = { sessionId: 'chat', turnId: 1, phase: 'ticking' };
  sound.follow(ticking);
  const boom = { ...ticking, turnId: 2, phase: 'boom', boom: { id: 'chat:0' } };
  sound.follow(boom);
  const count = sound.context.nodes.length;
  sound.follow({ ...boom, turnId: 3, phase: 'discussion' });
  sound.follow({ ...boom, turnId: 4, phase: 'discussion' });
  sound.follow({ sessionId: 'chat', turnId: 5, phase: 'ready' });
  assert.equal(intervals.size, 0, 'neither discussion nor preview starts ticking');
  assert.equal(sound.context.nodes.length, count, 'no repeated explosion, alarm or transition cue');
  const reconnected = fixture();
  reconnected.sound.follow({ ...boom, phase: 'discussion' });
  assert.equal(reconnected.sound.context, null, 'reconnecting during discussion does not replay audio');
  assert.equal(reconnected.intervals.size, 0);
  sound.close(); reconnected.sound.close();
});
