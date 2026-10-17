const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SPEED_MODES, DEFAULT_TIMING_SETTINGS, getTimingRange,
  normalizeTimingSettings, sampleFuseDurationMs, startFuse,
  hasFuseExpired, checkTimedCommand, fuseCdf,
} = require('../bomb-relay-timing.js');
function seeded(seed = 19) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296; };
}
const ranges = {
  fast: [30000, 60000], normal: [30000, 90000], chill: [30000, 120000],
};
for (const speedMode of SPEED_MODES) {
  test(`${speedMode}: 3-player baseline, midpoint and valid samples`, () => {
    const options = { activePlayerCount: 3, settings: { speedMode } };
    const r = getTimingRange(options);
    assert.deepEqual([r.minMs, r.maxMs], ranges[speedMode]);
    assert.equal(sampleFuseDurationMs({ ...options, random: () => 0.5 }), r.meanMs);
    assert.equal(sampleFuseDurationMs({ ...options, random: () => 0 }), r.minMs);
    assert.equal(sampleFuseDurationMs({ ...options, random: () => 1 - Number.EPSILON }), r.maxMs);
    const random = seeded(7);
    for (let i = 0; i < 1000; i++) {
      const d = sampleFuseDurationMs({ ...options, random });
      assert.ok(Number.isInteger(d) && d >= r.minMs && d <= r.maxMs);
    }
  });
}
test('Default is Normal with gentle player scaling on', () => {
  assert.deepEqual(normalizeTimingSettings(), DEFAULT_TIMING_SETTINGS);
  assert.equal(getTimingRange({ activePlayerCount: 3 }).meanMs, 60000);
});
test('2 players are not given an even shorter fuse', () => {
  for (const speedMode of SPEED_MODES) {
    const a = getTimingRange({ activePlayerCount: 2, settings: { speedMode } });
    const b = getTimingRange({ activePlayerCount: 3, settings: { speedMode } });
    assert.equal(a.minMs, b.minMs); assert.equal(a.maxMs, b.maxMs);
  }
});
test('6 players add 21 seconds only to the upper bound; 8 add 35; greater counts are capped', () => {
  const six = getTimingRange({ activePlayerCount: 6 });
  assert.deepEqual([six.minMs, six.maxMs, six.minAddedMs, six.maxAddedMs, six.meanAddedMs], [30000, 111000, 0, 21000, 10500]);
  const eight = getTimingRange({ activePlayerCount: 8 });
  assert.deepEqual([eight.minMs, eight.maxMs, eight.addedMs], [30000, 125000, 35000]);
  const many = getTimingRange({ activePlayerCount: 40 });
  assert.equal(many.maxMs, eight.maxMs); assert.equal(many.capped, true);
});
test('Player scaling can be switched off independently of speed', () => {
  const r = getTimingRange({ activePlayerCount: 20, settings: { speedMode: 'chill', scaleWithPlayers: false } });
  assert.deepEqual([r.minMs, r.maxMs, r.addedMs], [30000, 120000, 0]);
  assert.equal(r.capped, false);
});
test('Time is monotonic in player count up to the cap for all modes', () => {
  for (const speedMode of SPEED_MODES) {
    let last = 0;
    for (let n = 2; n < 30; n++) {
      const r = getTimingRange({ activePlayerCount: n, settings: { speedMode } });
      assert.ok(r.meanMs >= last); last = r.meanMs;
    }
  }
});
test('Invalid player counts and settings fail instead of silently changing rules', () => {
  for (const n of [0, 1, -3, 3.5, '3', NaN, Infinity, undefined]) {
    assert.throws(() => getTimingRange({ activePlayerCount: n }), /activePlayerCount/);
  }
  assert.throws(() => normalizeTimingSettings({ speedMode: 'norrmal' }), /speedMode/);
  assert.throws(() => normalizeTimingSettings({ scaleWithPlayers: 'true' }), /boolean/);
  assert.throws(() => normalizeTimingSettings(null), /object/);
});
test('Invalid RNG output is rejected for both independent draws', () => {
  for (const x of [-0.1, 1, NaN, Infinity, '0.5']) {
    assert.throws(() => sampleFuseDurationMs({ activePlayerCount: 3, random: () => x }), /random/);
    let call = 0;
    assert.throws(() => sampleFuseDurationMs({ activePlayerCount: 3, random: () => ++call === 1 ? 0.5 : x }), /random/);
  }
});
test('Triangular sampling has expected mean and fewer extreme durations in a seeded simulation', () => {
  const random = seeded(284);
  let sum = 0, nearEitherEdge = 0;
  const n = 50000;
  for (let i = 0; i < n; i++) {
    const d = sampleFuseDurationMs({ activePlayerCount: 3, random });
    sum += d;
    if (d < 36000 || d > 84000) nearEitherEdge++;
  }
  assert.ok(Math.abs(sum / n - 60000) < 250);
  // Mathematical target: 4% in the outer 10% at both ends combined.
  assert.ok(nearEitherEdge / n > 0.03 && nearEitherEdge / n < 0.05);
});
test('startFuse snapshots at GO, preserving round, count and timing settings', () => {
  const settings = { speedMode: 'normal', scaleWithPlayers: true };
  const f = startFuse({ roundId: 'r1', nowMs: 1000, activePlayerCount: 3, settings, random: () => 0.5 });
  settings.speedMode = 'chill';
  assert.equal(f.startedAtMs, 1000); assert.equal(f.explodeAtMs, 61000);
  assert.equal(f.activePlayerCountAtStart, 3); assert.equal(f.speedModeAtStart, 'normal');
  assert.ok(Object.isFrozen(f));
  // Settings/roster changes are only inputs for a future startFuse call.
  const next = startFuse({ roundId: 'r2', nowMs: 1000, activePlayerCount: 6, settings, random: () => 0.5 });
  assert.equal(next.durationMs, 85500); assert.equal(f.explodeAtMs, 61000);
});
test('Saved fuse is serializable; reconnect reads it rather than sampling again', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 1000, activePlayerCount: 3, random: () => 0.5 });
  const restored = JSON.parse(JSON.stringify(f));
  assert.equal(restored.explodeAtMs, f.explodeAtMs);
  assert.equal(hasFuseExpired(restored, 60000), false);
});
test('Exactly at deadline is expired, even if a timeout has not fired', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  assert.equal(hasFuseExpired(f, 59999), false);
  assert.equal(hasFuseExpired(f, 60000), true);
  assert.equal(hasFuseExpired(f, 60001), true);
});
test('Late PASS and TICK use the same expiration gate; passing never resets a fuse', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  for (const nowMs of [1000, 5000, 25000, 59999]) {
    assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r1', nowMs }).decision, 'CONTINUE');
    assert.equal(f.explodeAtMs, 60000);
  }
  assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r1', nowMs: 60000 }).decision, 'EXPLODE');
});
test('Stale round and already-settled callbacks are ignored', () => {
  const f = startFuse({ roundId: 'r2', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r1', nowMs: 99000 }).decision, 'IGNORE_STALE');
  assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r2', nowMs: 99000, settled: true }).decision, 'IGNORE_SETTLED');
});
test('Invalid fuse, time and ID inputs are rejected', () => {
  assert.throws(() => startFuse({ roundId: '', nowMs: 0, activePlayerCount: 3 }), /roundId/);
  assert.throws(() => startFuse({ roundId: 'r1', nowMs: -1, activePlayerCount: 3 }), /nowMs/);
  assert.throws(() => startFuse({ roundId: 'r1', nowMs: Number.MAX_SAFE_INTEGER, activePlayerCount: 3 }), /explodeAtMs/);
  const f = startFuse({ roundId: 'r1', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  assert.throws(() => hasFuseExpired({ ...f, explodeAtMs: 1 }, 0), /Inconsistent/);
  assert.throws(() => checkTimedCommand({ fuse: f, commandRoundId: '', nowMs: 0 }), /commandRoundId/);
});

test('all three modes have exact 3/6/8-player ranges with no legacy lower-bound correction', () => {
  const maxima = { fast: [60, 81, 95], normal: [90, 111, 125], chill: [120, 141, 155] };
  for (const speedMode of SPEED_MODES) {
    for (const [index, activePlayerCount] of [3, 6, 8].entries()) {
      const r = getTimingRange({ activePlayerCount, settings: { speedMode } });
      assert.deepEqual([r.minMs, r.maxMs], [30000, maxima[speedMode][index] * 1000]);
      assert.equal(r.minAddedMs, 0);
      assert.equal(r.meanAddedMs, r.maxAddedMs / 2);
      const off = getTimingRange({ activePlayerCount, settings: { speedMode, scaleWithPlayers: false } });
      assert.deepEqual([off.minMs, off.maxMs], ranges[speedMode]);
    }
    for (let count = 4; count <= 8; count++) {
      const before = getTimingRange({ activePlayerCount: count - 1, settings: { speedMode } });
      const after = getTimingRange({ activePlayerCount: count, settings: { speedMode } });
      assert.deepEqual([after.minMs - before.minMs, after.maxMs - before.maxMs, after.meanMs - before.meanMs], [0, 7000, 3500]);
    }
  }
});

test('sampling uses two independent uniforms and the actual effective range', () => {
  let calls = 0;
  const duration = sampleFuseDurationMs({ activePlayerCount: 6,
    settings: { speedMode: 'fast' }, random: () => [0.1, 0.9][calls++] });
  assert.equal(calls, 2);
  assert.equal(duration, 55500);
  // A fixed floor is no promise that eight slow answers finish their first lap.
  const firstLap = startFuse({ roundId: 'eight', nowMs: 1000, activePlayerCount: 8,
    settings: { speedMode: 'fast' }, random: () => 0 });
  assert.equal(firstLap.durationMs, 30000);
  assert.equal(hasFuseExpired(firstLap, 31000), true);
});

test('host can lower the base upper bound without changing the floor or adding duration after sampling', () => {
  const settings = { speedMode: 'fast', scaleWithPlayers: true, baseMaxSeconds: 45 };
  const r = getTimingRange({ activePlayerCount: 6, settings });
  assert.deepEqual([r.minMs, r.maxMs, r.meanMs], [30000, 66000, 48000]);
  assert.equal(sampleFuseDurationMs({ activePlayerCount: 6, settings, random: () => 0 }), 30000);
  assert.equal(sampleFuseDurationMs({ activePlayerCount: 6, settings, random: () => .5 }), 48000);
  assert.deepEqual(getTimingRange({ activePlayerCount: 8, settings: { ...settings, scaleWithPlayers: false } }).maxMs, 45000);
  assert.equal(normalizeTimingSettings(settings).baseMaxSeconds, 45);
  assert.equal(getTimingRange({ activePlayerCount: 3, settings: { speedMode: 'normal', baseMaxSeconds: 31 } }).maxMs, 31000);
  for (const baseMaxSeconds of [30, 0, -1, 60.5, 61, NaN, Infinity, '45']) {
    assert.throws(() => normalizeTimingSettings({ speedMode: 'fast', baseMaxSeconds }), /baseMaxSeconds/);
  }
});

test('100000 samples per policy fit the rescaled triangular probabilities including lowered upper bounds', () => {
  const cases = [];
  for (const speedMode of SPEED_MODES) for (const activePlayerCount of [3, 6, 8]) {
    cases.push({ activePlayerCount, settings: { speedMode, scaleWithPlayers: true } });
    cases.push({ activePlayerCount, settings: { speedMode, scaleWithPlayers: false } });
  }
  cases.push({ activePlayerCount: 6, settings: { speedMode: 'fast', scaleWithPlayers: true, baseMaxSeconds: 45 } });
  cases.push({ activePlayerCount: 6, settings: { speedMode: 'fast', scaleWithPlayers: true, baseMinSeconds: 20, baseMaxSeconds: 25 } });
  for (const options of cases) {
    const range = getTimingRange(options), bins = [0, 0, 0, 0, 0], random = seeded(19683);
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      const d = sampleFuseDurationMs({ ...options, random });
      assert.ok(d >= range.minMs && d <= range.maxMs);
      sum += d;
      bins[Math.min(4, Math.floor(5 * (d - range.minMs) / (range.maxMs - range.minMs)))]++;
    }
    assert.ok(Math.abs(sum / 100000 - range.meanMs) < (range.maxMs - range.minMs) * .004, JSON.stringify(options));
    const expected = [.08, .24, .36, .24, .08];
    for (let i = 0; i < bins.length; i++) assert.ok(Math.abs(bins[i] / 100000 - expected[i]) < .007, JSON.stringify({ options, bins }));
  }
});

test('saved pre-update short fuse deadlines remain valid after the policy update', () => {
  const old = { ...startFuse({ roundId: 'old', nowMs: 100000, activePlayerCount: 3, random: () => .5 }),
    policyVersion: 'talk-bomb-timing-3.0-candidate', durationMs: 10000, explodeAtMs: 110000 };
  assert.equal(hasFuseExpired(old, 109999), false);
  assert.equal(hasFuseExpired(old, 110000), true);
});

test('triangular CDF rescales early-tail probability for participants and a lowered upper bound', () => {
  const base = getTimingRange({ activePlayerCount: 3, settings: { speedMode: 'fast' } });
  const six = getTimingRange({ activePlayerCount: 6, settings: { speedMode: 'fast' } });
  const lowered = getTimingRange({ activePlayerCount: 6, settings: { speedMode: 'fast', baseMaxSeconds: 45 } });
  assert.equal(fuseCdf(29999, base), 0); assert.equal(fuseCdf(60000, base), 1);
  assert.ok(Math.abs(fuseCdf(35000, base) - 1 / 18) < 1e-12);
  assert.ok(Math.abs(fuseCdf(35000, six) - 50 / 51 ** 2) < 1e-12);
  assert.ok(Math.abs(fuseCdf(35000, lowered) - 50 / 36 ** 2) < 1e-12);
  const edges = [30, 36, 42, 48, 54, 60], weights = [.08, .24, .36, .24, .08];
  for (let i = 0; i < weights.length; i++) assert.ok(Math.abs(fuseCdf(edges[i + 1] * 1000, base) - fuseCdf(edges[i] * 1000, base) - weights[i]) < 1e-12);
});

test('a deliberate host minimum rescales the triangle while population still changes only the upper bound', () => {
  const settings = { speedMode: 'fast', scaleWithPlayers: true, baseMinSeconds: 20, baseMaxSeconds: 45 };
  const r = getTimingRange({ activePlayerCount: 6, settings });
  assert.deepEqual([r.minMs, r.maxMs, r.meanMs], [20000, 66000, 43000]);
  assert.deepEqual([r.minAddedMs, r.maxAddedMs, r.meanAddedMs], [0, 21000, 10500]);
  assert.equal(sampleFuseDurationMs({ activePlayerCount: 6, settings, random: () => 0 }), 20000);
  assert.equal(sampleFuseDurationMs({ activePlayerCount: 6, settings, random: () => .5 }), 43000);
  assert.ok(Math.abs(fuseCdf(25000, r) - 50 / 46 ** 2) < 1e-12);
  const off = getTimingRange({ activePlayerCount: 8, settings: { ...settings, scaleWithPlayers: false } });
  assert.deepEqual([off.minMs, off.maxMs], [20000, 45000]);
  assert.equal(normalizeTimingSettings({ speedMode: 'fast', baseMinSeconds: 1 }).baseMinSeconds, 1);
  for (const baseMinSeconds of [0, -1, 45, 46, 20.5, NaN, Infinity, '20']) {
    assert.throws(() => normalizeTimingSettings({ ...settings, baseMinSeconds }), /baseMinSeconds|range/);
  }
  // Population cannot make an invalid base interval valid.
  assert.throws(() => getTimingRange({ activePlayerCount: 8, settings: { ...settings, baseMinSeconds: 46 } }), /baseMinSeconds|range/);
  const short = getTimingRange({ activePlayerCount: 3, settings: { ...settings, baseMaxSeconds: 25 } });
  assert.deepEqual([short.minMs, short.maxMs, short.meanMs], [20000, 25000, 22500]);
  assert.throws(() => normalizeTimingSettings({ ...settings, baseMinSeconds: 25, baseMaxSeconds: 25 }), /baseMinSeconds|baseMaxSeconds|range/);
  assert.throws(() => normalizeTimingSettings({ speedMode: 'fast', baseMaxSeconds: 25 }), /baseMinSeconds|baseMaxSeconds|range/);
});
