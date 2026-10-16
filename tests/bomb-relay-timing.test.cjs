const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SPEED_MODES, DEFAULT_TIMING_SETTINGS, getTimingRange,
  normalizeTimingSettings, sampleFuseDurationMs, startFuse,
  hasFuseExpired, checkTimedCommand,
} = require('../bomb-relay-timing.js');
function seeded(seed = 19) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296; };
}
const ranges = {
  fast: [30000, 60000], normal: [60000, 100000], chill: [90000, 150000],
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
  assert.equal(getTimingRange({ activePlayerCount: 3 }).meanMs, 80000);
});
test('2 players are not given an even shorter fuse', () => {
  for (const speedMode of SPEED_MODES) {
    const a = getTimingRange({ activePlayerCount: 2, settings: { speedMode } });
    const b = getTimingRange({ activePlayerCount: 3, settings: { speedMode } });
    assert.equal(a.minMs, b.minMs); assert.equal(a.maxMs, b.maxMs);
  }
});
test('6 players add 30 seconds; 8 add 50; greater counts are capped', () => {
  const six = getTimingRange({ activePlayerCount: 6 });
  assert.deepEqual([six.minMs, six.maxMs], [90000, 130000]);
  const eight = getTimingRange({ activePlayerCount: 8 });
  assert.deepEqual([eight.minMs, eight.maxMs], [110000, 150000]);
  const many = getTimingRange({ activePlayerCount: 40 });
  assert.equal(many.maxMs, eight.maxMs); assert.equal(many.capped, true);
});
test('Player scaling can be switched off independently of speed', () => {
  const r = getTimingRange({ activePlayerCount: 20, settings: { speedMode: 'chill', scaleWithPlayers: false } });
  assert.deepEqual([r.minMs, r.maxMs, r.addedMs], [90000, 150000, 0]);
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
    if (d < 64000 || d > 96000) nearEitherEdge++;
  }
  assert.ok(Math.abs(sum / n - 80000) < 200);
  // Mathematical target: 4% in the outer 10% at both ends combined.
  assert.ok(nearEitherEdge / n > 0.03 && nearEitherEdge / n < 0.05);
});
test('startFuse snapshots at GO, preserving round, count and timing settings', () => {
  const settings = { speedMode: 'normal', scaleWithPlayers: true };
  const f = startFuse({ roundId: 'r1', nowMs: 1000, activePlayerCount: 3, settings, random: () => 0.5 });
  settings.speedMode = 'chill';
  assert.equal(f.startedAtMs, 1000); assert.equal(f.explodeAtMs, 81000);
  assert.equal(f.activePlayerCountAtStart, 3); assert.equal(f.speedModeAtStart, 'normal');
  assert.ok(Object.isFrozen(f));
  // Settings/roster changes are only inputs for a future startFuse call.
  const next = startFuse({ roundId: 'r2', nowMs: 1000, activePlayerCount: 6, settings, random: () => 0.5 });
  assert.equal(next.durationMs, 150000); assert.equal(f.explodeAtMs, 81000);
});
test('Saved fuse is serializable; reconnect reads it rather than sampling again', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 1000, activePlayerCount: 3, random: () => 0.5 });
  const restored = JSON.parse(JSON.stringify(f));
  assert.equal(restored.explodeAtMs, f.explodeAtMs);
  assert.equal(hasFuseExpired(restored, 80000), false);
});
test('Exactly at deadline is expired, even if a timeout has not fired', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  assert.equal(hasFuseExpired(f, 79999), false);
  assert.equal(hasFuseExpired(f, 80000), true);
  assert.equal(hasFuseExpired(f, 80001), true);
});
test('Late PASS and TICK use the same expiration gate; passing never resets a fuse', () => {
  const f = startFuse({ roundId: 'r1', nowMs: 0, activePlayerCount: 3, random: () => 0.5 });
  for (const nowMs of [1000, 5000, 25000, 79999]) {
    assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r1', nowMs }).decision, 'CONTINUE');
    assert.equal(f.explodeAtMs, 80000);
  }
  assert.equal(checkTimedCommand({ fuse: f, commandRoundId: 'r1', nowMs: 80000 }).decision, 'EXPLODE');
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
