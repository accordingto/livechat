// CUT Halloween recorded audio lifecycle. No browser, network or real timers.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../cut-halloween-audio.js'), 'utf8');
const FX = ['scream', 'laugh', 'ghost', 'howl', 'door', 'thunder', 'heartbeat', 'bell'];
const AMBIENCE = ['wind', 'rain'];
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function manifestFixture() {
  return { version: 1, assets: Object.fromEntries([...FX, ...AMBIENCE].map(key => [key, {
    file: key + '.mp3', duration: AMBIENCE.includes(key) ? 4 : 2.5,
  }])) };
}
function fixture(options = {}) {
  const contexts = [], fetches = [], decodeGates = new Map(), resumeGates = [];
  const intervals = new Map(), timeouts = new Map(), saved = new Map();
  let timerId = 0, changes = 0, manifestFailures = options.manifestFailures || 0;
  const manifest = options.manifest || manifestFixture();
  const failingFetch = new Set(options.failFetchOnce || []), failingDecode = new Set(options.failDecodeOnce || []);
  const waitDecode = new Set(options.waitDecode || []);
  class Param {
    constructor(ctx, value = 0) { this.ctx = ctx; this.value = value; this.calls = []; }
    setValueAtTime(value, at) { this.value = value; this.calls.push(['set', value, at]); }
    linearRampToValueAtTime(value, at) { this.value = value; this.calls.push(['linear', value, at]); }
    exponentialRampToValueAtTime(value, at) { this.value = value; this.calls.push(['exponential', value, at]); }
    setTargetAtTime(value, at, time) { this.value = value; this.calls.push(['target', value, at, time]); }
    cancelScheduledValues(at) { this.calls.push(['cancel', at]); }
  }
  class Node {
    constructor(ctx, kind) {
      this.ctx = ctx; this.kind = kind; this.connections = []; this.disconnected = 0;
      this.starts = []; this.stops = []; this.gain = new Param(ctx, 1);
      this.frequency = new Param(ctx, 440); this.Q = new Param(ctx, 0);
    }
    connect(target) {
      if (target.ctx && target.ctx !== this.ctx) throw new Error('InvalidAccessError: nodes belong to different AudioContexts');
      this.connections.push(target); return target;
    }
    disconnect() { this.disconnected++; this.connections = []; }
    start(...args) { if (this.ctx.state === 'closed') throw new Error('closed context'); this.starts.push(args); }
    stop(...args) { this.stops.push(args); }
    finish() { this.onended?.(); }
  }
  class Context {
    constructor() {
      this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 1000;
      this.destination = { ctx: this }; this.nodes = []; this.decodes = []; this.resumes = 0; this.closes = 0;
      contexts.push(this);
    }
    async resume() {
      this.resumes++;
      if (options.waitResume) { const gate = deferred(); resumeGates.push(gate); await gate.promise; }
      if (this.state === 'closed' || options.blocked) throw new Error('resume unavailable');
      this.state = 'running';
    }
    async close() { this.closes++; this.state = 'closed'; }
    node(kind) { const n = new Node(this, kind); this.nodes.push(n); return n; }
    createGain() { return this.node('gain'); }
    createBufferSource() { return this.node('bufferSource'); }
    createOscillator() { return this.node('oscillator'); }
    createBiquadFilter() { return this.node('filter'); }
    createConvolver() { return this.node('convolver'); }
    createDynamicsCompressor() {
      const n = this.node('compressor');
      for (const key of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[key] = new Param(this);
      return n;
    }
    createBuffer(channels, frames, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(frames));
      return { duration: frames / rate, getChannelData: n => data[n] };
    }
    async decodeAudioData(encoded) {
      const key = Buffer.from(encoded).toString('utf8');
      this.decodes.push(key);
      if (failingDecode.delete(key)) throw new Error('bad recording');
      if (waitDecode.has(key)) {
        const gate = deferred(); decodeGates.set(key, gate); await gate.promise;
      }
      return { key, duration: manifest.assets[key]?.duration || 2.5 };
    }
  }
  async function fetchImpl(url, init) {
    fetches.push({ url: String(url), signal: init?.signal });
    if (String(url).includes('manifest.json')) {
      if (manifestFailures-- > 0) return { ok: false, status: 503 };
      return { ok: true, json: async () => JSON.parse(JSON.stringify(manifest)) };
    }
    const key = Object.keys(manifest.assets).find(k => String(url).includes('/' + manifest.assets[k].file + '?'));
    if (!key || failingFetch.delete(key)) return { ok: false, status: 404 };
    return { ok: true, arrayBuffer: async () => {
      const b = Buffer.from(key); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    } };
  }
  const sandbox = vm.createContext({
    window: options.unsupported ? {} : { AudioContext: Context }, fetch: fetchImpl, AbortController,
    setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(fn) { const id = ++timerId; timeouts.set(id, fn); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    Math: Object.assign(Object.create(Math), { random: options.random || (() => .25) }),
  });
  vm.runInContext(source, sandbox);
  const api = sandbox.CUT_HALLOWEEN_AUDIO;
  const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) };
  function board(extra = {}) {
    return new api.Board({ storage, onChange: () => { changes++; }, ...extra });
  }
  return { api, board, Context, contexts, fetches, decodeGates, resumeGates, intervals, timeouts, saved,
    get changes() { return changes; },
    fetchCount(key) { return fetches.filter(r => r.url.includes(key === 'manifest' ? 'manifest.json' : '/' + key + '.mp3?')).length; },
    tick() { for (const fn of [...intervals.values()]) fn(); },
    finishTimeouts() { const callbacks = [...timeouts.values()]; timeouts.clear(); for (const fn of callbacks) fn(); },
  };
}

test('a board stays silent and performs no audio creation or downloads before enable', async () => {
  const f = fixture(), b = f.board();
  assert.equal(f.contexts.length, 0); assert.equal(f.fetches.length, 0);
  assert.equal(b.ready, false); assert.equal(b.play('scream'), 0); assert.equal(b.cut(), false);
  assert.equal(b.cue('go'), false);
  await b.startMusic('wind');
  assert.equal(f.contexts.length, 0); assert.equal(f.fetches.length, 0);
  assert.equal(f.intervals.size, 0);
  b.close();
});

test('concurrent enable shares one manifest, one effects download/decode each, and never autoplays', async () => {
  const f = fixture(), b = f.board();
  assert.deepEqual(await Promise.all([b.unlock(), b.unlock()]), [true, true]);
  assert.equal(f.contexts.length, 1);
  assert.equal(f.fetchCount('manifest'), 1);
  for (const key of FX) assert.equal(f.fetchCount(key), 1, key);
  for (const key of AMBIENCE) assert.equal(f.fetchCount(key), 0, key + ' is lazy');
  const ctx = f.contexts[0];
  assert.equal(ctx.decodes.length, FX.length);
  assert.equal(ctx.nodes.filter(n => n.kind === 'compressor').length, 1);
  assert.equal(ctx.nodes.filter(n => n.kind === 'oscillator' || n.kind === 'bufferSource').length, 0);
  await b.unlock();
  assert.equal(f.fetchCount('manifest'), 1); assert.equal(ctx.decodes.length, FX.length);
  assert.equal(b.loading, 0); assert.equal(b.pending.size, 0);
  assert.ok(f.fetches.every(r => r.url.startsWith('assets/cut-halloween/audio-v1/')));
  b.close();
});

test('recorded effects and compact cues use decoded samples, not oscillators or a second reveal hit', async () => {
  const f = fixture(), b = f.board(); await b.unlock();
  const ctx = f.contexts[0];
  for (const key of FX) {
    assert.ok(b.play(key) > 0); const played = ctx.nodes.filter(n => n.kind === 'bufferSource').at(-1);
    assert.equal(played.buffer.key, key);
  }
  const before = ctx.nodes.length;
  assert.equal(b.cue('reveal'), true); assert.equal(b.cue('round'), true);
  assert.equal(ctx.nodes.length, before, 'reveal does not layer another cue on CUT');
  assert.equal(b.cue('go'), true);
  assert.equal(ctx.nodes.filter(n => n.kind === 'bufferSource').at(-1).buffer.key, 'bell');
  assert.equal(ctx.nodes.filter(n => n.kind === 'oscillator').length, 0);
  assert.equal(b.fxVoices.size, 3, 'rapid taps have a bounded voice count');
  const active = [...b.fxVoices]; b.stopEffects();
  assert.equal(b.fxVoices.size, 0);
  assert.ok(active.every(v => v.source.stops.length && v.source.disconnected && v.envelope.disconnected));
  b.close();
});

test('CUT scares do not immediately repeat; disabling random scares uses a short recorded bell', async () => {
  const f = fixture({ random: () => 0 }), b = f.board(); await b.unlock();
  let last = '';
  for (let i = 0; i < 40; i++) {
    assert.equal(b.cut(), true);
    const key = f.contexts[0].nodes.filter(n => n.kind === 'bufferSource').at(-1).buffer.key;
    assert.ok(f.api.SCARES.includes(key)); assert.notEqual(key, last); last = key;
  }
  b.setAutoScare(false); assert.equal(b.cut(), true);
  const source = f.contexts[0].nodes.filter(n => n.kind === 'bufferSource').at(-1);
  assert.equal(source.buffer.key, 'bell'); assert.ok(source.starts[0][2] <= .65);
  assert.equal(JSON.parse(f.saved.get(f.api.STORAGE)).autoScare, false);
  b.close();
});

test('a failed manifest reports locally and retries without replacing the working context', async () => {
  const f = fixture({ manifestFailures: 1 }), b = f.board();
  assert.equal(await b.unlock(), false); await flush();
  assert.equal(b.assetError, true); assert.equal(b.ready, false);
  assert.equal(f.fetchCount('manifest'), 1); assert.equal(f.contexts[0].decodes.length, 0);
  assert.equal(await b.unlock(), true);
  assert.equal(b.assetError, false); assert.equal(f.fetchCount('manifest'), 2);
  assert.equal(f.contexts.length, 1); assert.equal(b.loading, 0);
  b.close();
});

test('a failed decode retries only that recording and reuses all successful effects', async () => {
  const f = fixture({ failDecodeOnce: ['ghost'] }), b = f.board();
  assert.equal(await b.unlock(), false); await flush();
  assert.equal(b.assetError, true); assert.equal(b.buffers.size, 7);
  assert.equal(await b.unlock(), true);
  assert.equal(f.fetchCount('manifest'), 1); assert.equal(f.fetchCount('ghost'), 2);
  for (const key of FX.filter(k => k !== 'ghost')) assert.equal(f.fetchCount(key), 1, key);
  assert.equal(b.buffers.size, 8); assert.equal(b.pending.size, 0); assert.equal(b.loading, 0);
  b.close();
});

test('invalid or traversing manifest entries never cause a recording request or playback', async () => {
  for (const change of [m => { m.version = 9; }, m => { m.assets.scream.file = '../secret.mp3'; }, m => { m.assets.door.duration = 0; }]) {
    const manifest = manifestFixture(); change(manifest);
    const f = fixture({ manifest }), b = f.board();
    assert.equal(await b.unlock(), false); await flush();
    assert.equal(b.assetError, true); assert.equal(f.fetches.length, 1);
    assert.equal(f.contexts[0].decodes.length, 0); assert.equal(b.cut(), false);
    b.close();
  }
});

test('stopping while ambience decodes cancels pending playback; the cached recording can be reused later', async () => {
  const f = fixture({ waitDecode: ['wind'] }), b = f.board(); await b.unlock();
  const first = b.startMusic('wind'); await flush();
  assert.ok(f.decodeGates.has('wind')); assert.equal(b.track, 'wind');
  b.toggleMusic('wind');
  assert.equal(b.track, null);
  f.decodeGates.get('wind').resolve(); await first;
  assert.equal(f.intervals.size, 0); assert.equal(b.musicVoices.size, 0);
  assert.equal(f.contexts[0].nodes.filter(n => n.kind === 'bufferSource').length, 0);
  await b.startMusic('wind');
  assert.equal(f.fetchCount('wind'), 1);
  assert.equal(b.track, 'wind'); assert.equal(f.intervals.size, 1); assert.equal(b.musicVoices.size, 1);
  b.close();
});

test('switching tracks during a pending decode cannot start the old selection late', async () => {
  const f = fixture({ waitDecode: ['wind'] }), b = f.board(); await b.unlock();
  const first = b.startMusic('wind'); await flush();
  await b.startMusic('rain');
  const current = [...b.musicVoices];
  assert.equal(b.track, 'rain'); assert.equal(current[0].buffer.key, 'rain');
  f.decodeGates.get('wind').resolve(); await first;
  assert.equal(b.track, 'rain'); assert.deepEqual([...b.musicVoices], current);
  assert.equal(f.intervals.size, 1);
  b.close();
});

test('recorded ambience schedules crossfaded loops and stopping cancels every source and scheduler', async () => {
  const f = fixture(), b = f.board(); await b.unlock(); await b.startMusic('rain');
  const ctx = f.contexts[0], first = [...b.musicVoices][0];
  assert.equal(first.buffer.key, 'rain'); assert.equal(ctx.nodes.filter(n => n.kind === 'oscillator').length, 0);
  ctx.currentTime = 3.2; f.tick();
  const voices = [...b.musicVoices]; assert.equal(voices.length, 2);
  assert.ok(voices[1].starts[0][0] < voices[0].stops[0][0], 'next sample overlaps the previous fade');
  b.stopMusic();
  assert.equal(b.track, null); assert.equal(b.musicVoices.size, 0); assert.equal(f.intervals.size, 0);
  assert.ok(voices.every(n => n.stops.at(-1)[0] <= ctx.currentTime + .39));
  const count = ctx.nodes.length; f.tick(); assert.equal(ctx.nodes.length, count);
  f.finishTimeouts(); b.close();
});

test('late ambience joins use the shared epoch and include download/decode elapsed time', async () => {
  const f = fixture({ waitDecode: ['wind'] }), b = f.board(); await b.unlock();
  const joining = b.startMusic('wind', { offsetSeconds: 8 }); await flush();
  const ctx = f.contexts[0]; ctx.currentTime = 1.25;
  f.decodeGates.get('wind').resolve(); await joining;
  const first = ctx.nodes.find(n => n.kind === 'bufferSource');
  const period = 4 - .7, expectedOffset = 9.25 % period;
  assert.ok(Math.abs(first.starts[0][1] - expectedOffset) < 1e-9);
  assert.ok(Math.abs(first.stops[0][0] - first.starts[0][0] - (4 - expectedOffset)) < 1e-9);
  assert.ok([...b.musicVoices].every(n => n.starts[0][0] >= ctx.currentTime));
  b.close();
});

test('late joins to optional synth tracks align upcoming notes to their shared musical phase', async () => {
  for (const track of ['musicbox', 'crawl']) {
    const f = fixture(), b = f.board(); await b.unlock();
    await b.startMusic(track, { offsetSeconds: 10.1 });
    const ctx = f.contexts[0];
    assert.ok(b.step > 0, track + ' skips past notes');
    assert.ok(b.nextTime > ctx.currentTime && b.nextTime < ctx.currentTime + 3);
    assert.ok(ctx.nodes.filter(n => n.starts.length).every(n => (n.starts[0][0] ?? ctx.currentTime) >= ctx.currentTime));
    b.stopMusic(); assert.equal(f.intervals.size, 0); b.close();
  }
});

test('a throttled background scheduler resumes near now instead of replaying missed loops or notes', async () => {
  for (const track of ['rain', 'musicbox', 'crawl']) {
    const f = fixture(), b = f.board(); await b.unlock(); await b.startMusic(track);
    const ctx = f.contexts[0], before = new Set(ctx.nodes);
    ctx.currentTime = 600; f.tick();
    const spawned = ctx.nodes.filter(n => !before.has(n) && n.starts.length);
    assert.ok(spawned.length > 0, track + ' resumes');
    assert.ok(spawned.length < 12, track + ' does not burst through ten minutes of missed playback');
    assert.ok(spawned.every(n => n.starts[0][0] >= ctx.currentTime), track + ' starts in the present');
    b.close();
  }
});

test('optional musicbox and crawl stop their drones, scheduled notes and callbacks', async () => {
  for (const track of ['musicbox', 'crawl']) {
    const f = fixture(), b = f.board(); await b.unlock(); await b.startMusic(track);
    const ctx = f.contexts[0], voices = [...new Set([...b.musicVoices, ...(b.drone || [])])], gain = b.musicGain;
    assert.ok(voices.length > 0); assert.equal(f.intervals.size, 1);
    assert.ok(ctx.nodes.some(n => n.kind === 'oscillator'), track + ' is explicitly optional synthesis');
    const queued = [...f.intervals.values()];
    b.stopMusic();
    assert.equal(b.drone, null); assert.equal(b.scheduler, null); assert.equal(b.track, null);
    assert.equal(f.intervals.size, 0);
    assert.ok(voices.every(n => n.stops.at(-1)?.[0] <= ctx.currentTime + .39), track + ' stops all voices, including the drone');
    const nodeCount = ctx.nodes.length; queued.forEach(fn => fn()); assert.equal(ctx.nodes.length, nodeCount);
    f.finishTimeouts(); assert.ok(gain.disconnected);
    b.close();
  }
});

test('close during a pending decode cannot cache, repaint or resurrect audio later', async () => {
  const f = fixture({ waitDecode: ['scream'] }), b = f.board();
  const enabling = b.unlock(); await flush();
  assert.ok(f.decodeGates.has('scream')); b.close();
  const changes = f.changes, requests = f.fetches.length;
  assert.equal(f.contexts[0].closes, 1); assert.equal(b.closed, true);
  assert.ok(f.fetches.every(r => r.signal.aborted));
  f.decodeGates.get('scream').resolve(); assert.equal(await enabling, false); await flush();
  assert.equal(b.ready, false); assert.equal(b.context, null); assert.equal(b.buffers.size, 0);
  assert.equal(b.pending.size, 0); assert.equal(b.loading, 0); assert.equal(f.changes, changes);
  assert.equal(f.intervals.size, 0); assert.equal(b.cut(), false);
  assert.equal(await b.unlock(), false); assert.equal(f.fetches.length, requests); assert.equal(f.contexts.length, 1);
});

test('close during resume never starts a download; a borrowed context is not closed by the board', async () => {
  const f = fixture({ waitResume: true }), b = f.board(), enabling = b.unlock();
  assert.equal(f.resumeGates.length, 1); b.close(); f.resumeGates[0].resolve();
  assert.equal(await enabling, false); assert.equal(f.fetches.length, 0); assert.equal(f.contexts.length, 1);
  const other = fixture(), context = new other.Context(), borrowed = other.board({ context });
  await borrowed.unlock(); borrowed.play('door'); borrowed.close();
  assert.equal(context.closes, 0, 'the adapter that supplied a shared context owns its lifetime');
  assert.equal(context.state, 'running'); assert.equal(borrowed.context, null);
});

test('blocked and unsupported browsers remain playable and make no asset requests', async () => {
  for (const options of [{ blocked: true }, { unsupported: true }]) {
    const f = fixture(options), b = f.board();
    assert.equal(await b.unlock(), false); assert.equal(b.ready, false);
    assert.equal(f.fetches.length, 0); assert.equal(b.cut(), false);
    assert.equal(b.cue('go'), false); assert.equal(b.unsupported || b.blocked, true);
    b.close();
  }
});

test('a replacement context cannot inherit a scheduler connected to the old audio graph', async () => {
  const f = fixture(), b = f.board(); await b.unlock(); await b.startMusic('musicbox');
  const old = f.contexts[0]; await old.close();
  assert.equal(await b.unlock(), true); assert.equal(f.contexts.length, 2);
  assert.doesNotThrow(() => f.tick(), 'stale music nodes must not be connected to a new AudioContext');
  assert.equal(b.track, null); assert.equal(f.intervals.size, 0, 'closed-context music does not auto-resume');
  b.close();
});

const assetRoot = path.join(__dirname, '../assets/cut-halloween/audio-v1');
const actualManifest = path.join(assetRoot, 'manifest.json');
test('shipped recording bytes, CC0 provenance and objective metadata match the manifest', { skip: !fs.existsSync(actualManifest) }, () => {
  const manifest = JSON.parse(fs.readFileSync(actualManifest, 'utf8'));
  const licenses = fs.readFileSync(path.join(assetRoot, 'LICENSES.md'), 'utf8');
  assert.equal(manifest.version, 1);
  assert.deepEqual(Object.keys(manifest.assets).sort(), [...FX, ...AMBIENCE].sort());
  let total = 0;
  for (const key of [...FX, ...AMBIENCE]) {
    const item = manifest.assets[key];
    assert.match(item.file, /^[a-z-]+\.mp3$/);
    const bytes = fs.readFileSync(path.join(assetRoot, item.file)); total += bytes.length;
    assert.equal(bytes.length, item.bytes, key + ' bytes');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256, key + ' immutable bytes');
    assert.ok(item.duration > 0 && item.duration <= 45);
    assert.equal(item.source.license, 'CC0-1.0'); assert.match(item.source.licenseUrl, /^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/);
    assert.match(item.source.url, /^https:\/\//); assert.ok(item.source.author && item.source.title);
    assert.ok(licenses.includes(item.source.url), key + ' retains its source link');
    assert.equal(item.validation.decodeErrors, 0); assert.equal(item.validation.sampleRate, 44100); assert.equal(item.validation.channels, 1);
    assert.ok(item.validation.truePeakDbTP <= -3, key + ' retains mastering headroom');
    assert.ok(Math.abs(item.validation.decodedFrames / 44100 - item.duration) < .02);
  }
  assert.ok(total < 1024 * 1024, 'the ten-clip self-hosted pack stays below 1 MiB');
});
