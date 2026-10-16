/* Generated adaptation of the v2 pure timing policy for classic script / CommonJS. */
var BOMB_RELAY_TIMING = (() => {
'use strict';
/**
 * Pure timing policy for the EXISTING Talk Bomb authority. No network, UI,
 * audio, per-player timers, scoring, or background jobs are created here.
 * Call startFuse ONCE at actual GO, not at topic reveal or on every pass.
 * The caller must persist the fuse and enforce expiration atomically.
 */
const SPEED_MODES = Object.freeze(['fast', 'normal', 'chill']);
const DEFAULT_TIMING_SETTINGS = Object.freeze({
  speedMode: 'normal',
  scaleWithPlayers: true,
});
const TIMING_CONFIG = Object.freeze({
  baseRangesSeconds: Object.freeze({
    fast: Object.freeze({ min: 30, max: 60 }),
    normal: Object.freeze({ min: 60, max: 100 }),
    chill: Object.freeze({ min: 90, max: 150 }),
  }),
  baselinePlayers: 3,
  scalingCapPlayers: 8,
  extraSecondsPerPlayer: 10,
});

function requireSafeInteger(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(`${label} must be a safe integer >= ${min}.`);
  }
}
function requireId(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}
function unit(random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  const value = random();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random() must return a finite number in [0, 1).');
  }
  return value;
}

/**
 * @param {{speedMode?:'fast'|'normal'|'chill', scaleWithPlayers?:boolean}} settings
 * @returns {{speedMode:'fast'|'normal'|'chill', scaleWithPlayers:boolean}}
 */
function normalizeTimingSettings(settings = {}) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new TypeError('settings must be an object.');
  }
  const { speedMode = 'normal', scaleWithPlayers = true } = settings;
  if (!SPEED_MODES.includes(speedMode)) throw new RangeError(`Unknown speedMode: ${speedMode}`);
  if (typeof scaleWithPlayers !== 'boolean') throw new TypeError('scaleWithPlayers must be boolean.');
  return Object.freeze({ speedMode, scaleWithPlayers });
}

/**
 * Participant count means players actually playing, NOT every connected client.
 * 2–3 players use base values. Above 3, add 10 s/player, capped at 8 players.
 * A mode remains a pacing preference; this does NOT guarantee a number of laps.
 * Ranges and means are policy values, not measurements from the current Hub.
 * @param {{activePlayerCount:number, settings?:object}} options
 */
function getTimingRange({ activePlayerCount, settings = {} } = {}) {
  requireSafeInteger(activePlayerCount, 'activePlayerCount', 2);
  const normalized = normalizeTimingSettings(settings);
  const base = TIMING_CONFIG.baseRangesSeconds[normalized.speedMode];
  const effectivePlayers = Math.min(
    TIMING_CONFIG.scalingCapPlayers,
    Math.max(TIMING_CONFIG.baselinePlayers, activePlayerCount),
  );
  const extraSeconds = normalized.scaleWithPlayers
    ? (effectivePlayers - TIMING_CONFIG.baselinePlayers) * TIMING_CONFIG.extraSecondsPerPlayer
    : 0;
  const minMs = (base.min + extraSeconds) * 1000;
  const maxMs = (base.max + extraSeconds) * 1000;
  return Object.freeze({
    minMs, maxMs, meanMs: (minMs + maxMs) / 2,
    activePlayerCount, effectivePlayers,
    addedMs: extraSeconds * 1000,
    capped: normalized.scaleWithPlayers && activePlayerCount > TIMING_CONFIG.scalingCapPlayers,
    ...normalized,
  });
}

/**
 * Mean of TWO independent uniforms gives a symmetric triangular distribution.
 * Every duration inside the range is possible, but near-boundary fuses are rarer.
 * No history-based alternation, answer-speed adaptation, or pass-count extension.
 * @param {{activePlayerCount:number,settings?:object,random?:()=>number}} options
 */
function sampleFuseDurationMs({ activePlayerCount, settings = {}, random = Math.random } = {}) {
  const { minMs, maxMs } = getTimingRange({ activePlayerCount, settings });
  return Math.round(minMs + (maxMs - minMs) * (unit(random) + unit(random)) / 2);
}

/**
 * Snapshot at GO. Do not broadcast the chosen duration/deadline as a UI countdown.
 * Server authority: keep private. Host-only architecture: hide in the normal UI;
 * that is NOT a claim of anti-cheat secrecy from someone inspecting client state.
 * Never call again for the same active round, roster update, reconnect, or pass.
 * @param {{roundId:string,nowMs:number,activePlayerCount:number,settings?:object,random?:()=>number}} options
 */
function startFuse({ roundId, nowMs, activePlayerCount, settings = {}, random = Math.random } = {}) {
  requireId(roundId, 'roundId');
  requireSafeInteger(nowMs, 'nowMs');
  const range = getTimingRange({ activePlayerCount, settings });
  const durationMs = sampleFuseDurationMs({ activePlayerCount, settings, random });
  const explodeAtMs = nowMs + durationMs;
  requireSafeInteger(explodeAtMs, 'explodeAtMs');
  return Object.freeze({
    policyVersion: 'talk-bomb-timing-2.0',
    roundId, startedAtMs: nowMs, durationMs, explodeAtMs,
    activePlayerCountAtStart: activePlayerCount,
    speedModeAtStart: range.speedMode,
    scaleWithPlayersAtStart: range.scaleWithPlayers,
    minMsAtStart: range.minMs,
    maxMsAtStart: range.maxMs,
  });
}

function validateFuse(fuse) {
  if (!fuse || typeof fuse !== 'object') throw new TypeError('fuse must be an object.');
  requireId(fuse.roundId, 'fuse.roundId');
  requireSafeInteger(fuse.startedAtMs, 'fuse.startedAtMs');
  requireSafeInteger(fuse.durationMs, 'fuse.durationMs', 1);
  requireSafeInteger(fuse.explodeAtMs, 'fuse.explodeAtMs');
  if (fuse.explodeAtMs - fuse.startedAtMs !== fuse.durationMs) {
    throw new RangeError('Inconsistent fuse deadline and duration.');
  }
}

/** Pure deadline comparison. A pass AT the deadline loses, not just after it. */
function hasFuseExpired(fuse, nowMs) {
  validateFuse(fuse);
  requireSafeInteger(nowMs, 'nowMs');
  return nowMs >= fuse.explodeAtMs;
}

/**
 * Authority-side gate, NOT a complete state reducer or transaction manager.
 * In the existing serialized command handler:
 * 1. ignore stale/settled events;
 * 2. settle an expired round against its CURRENT holder before any valid pass;
 * 3. only on CONTINUE, validate actor/holder, phase, version and commandId, then pass.
 * Caller must mark settled/update score once in the SAME transaction.
 * TICK, PASS and reconnect processing should all check the saved deadline.
 */
function checkTimedCommand({ fuse, commandRoundId, nowMs, settled = false } = {}) {
  validateFuse(fuse);
  requireId(commandRoundId, 'commandRoundId');
  requireSafeInteger(nowMs, 'nowMs');
  if (typeof settled !== 'boolean') throw new TypeError('settled must be boolean.');
  if (commandRoundId !== fuse.roundId) return Object.freeze({ decision: 'IGNORE_STALE' });
  if (settled) return Object.freeze({ decision: 'IGNORE_SETTLED' });
  if (hasFuseExpired(fuse, nowMs)) return Object.freeze({ decision: 'EXPLODE' });
  return Object.freeze({ decision: 'CONTINUE' });
}

return { SPEED_MODES, DEFAULT_TIMING_SETTINGS, TIMING_CONFIG, normalizeTimingSettings, getTimingRange, sampleFuseDurationMs, startFuse, hasFuseExpired, checkTimedCommand };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_TIMING;
