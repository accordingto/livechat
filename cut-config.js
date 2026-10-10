/* CUT! — the tuning knobs live here, rather than in a screen or timer. */
var CUT_CONFIG = (() => {
  'use strict';
  const config = {
    version: 1,
    name: 'CUT! · 話別說完',
    minPlayers: 2,
    maxPlayers: 9,
    countdownMs: 3000,
    handoffMs: 3000,
    cutRevealMs: 900,
    topicHistorySize: 16,
    realTopicWeight: 0.6, // Legacy integrations; mixed now includes every category below.
    mixedTopicWeights: { real: 0.36, absurd: 0.24, personal: 0.20, ideas: 0.20 },
    antiRepeat: { shortBelowSeconds: 10, longFromSeconds: 22, repeatedExtremeWeight: 0.45 },
    customTiming: { minSeconds: 5, maxSeconds: 120, defaultMinSeconds: 15, defaultMaxSeconds: 25 },
    topicTiming: { defaultMinutes: 10, minMinutes: 1, maxMinutes: 60 },
    fairness: { deficitPower: 2, idleBoost: 0.35, maxIdleBoost: 5, recentWeights: [0.25, 0.55, 0.8] },
    speeds: {
      normal: { label: 'Normal', minSeconds: 15, maxSeconds: 25, bins: [
        { from: 15, to: 18, weight: 0.20 }, { from: 18, to: 22, weight: 0.45 },
        { from: 22, to: 25, weight: 0.35 },
      ] },
      chill: { label: 'Chill', minSeconds: 25, maxSeconds: 40, bins: [
        { from: 25, to: 30, weight: 0.20 }, { from: 30, to: 35, weight: 0.45 },
        { from: 35, to: 40, weight: 0.35 },
      ] },
      chaos: { label: 'Chaos', minSeconds: 8, maxSeconds: 16, bins: [
        { from: 8, to: 10, weight: 0.30 }, { from: 10, to: 13, weight: 0.45 },
        { from: 13, to: 16, weight: 0.25 },
      ] },
    },
    // Retained for older integrations; v2 topics have no automatic CUT limit.
    cutsByPlayers: [ { upTo: 4, min: 4, max: 5 }, { upTo: 6, min: 5, max: 7 }, { upTo: 9, min: 6, max: 8 } ],
    // Mode 2 · Jump In: one Main Speaker per round, with a few free interruptions.
    // Every time below is the Main Speaker's own talking time; interruptions stop the clock.
    jump: {
      mainMinutes: { options: [3, 4, 5], default: 4 }, // Quick / Normal / Long
      firstCut: { minSeconds: 25, maxSeconds: 45 }, // Nothing interrupts the opening.
      cutInterval: { minSeconds: 30, maxSeconds: 55, bins: [
        { from: 30, to: 38, weight: 0.30 }, { from: 38, to: 47, weight: 0.40 },
        { from: 47, to: 55, weight: 0.30 },
      ] },
      antiRepeat: { shortBelowSeconds: 38, longFromSeconds: 47, repeatedExtremeWeight: 0.45 },
      quietEndSeconds: 12, // No CUT that would leave the Main Speaker less than this.
      resumeQuietSeconds: 8, // After Pause, the pending CUT waits at least this long.
      backMs: 2500, // The "BACK TO …" beat before the clock runs again.
      topicHistorySize: 40,
      topicWeights: { stories: 0.28, self: 0.18, opinions: 0.18, whatif: 0.20, group: 0.16 },
      repeatedCategoryWeight: 0.4, // Two topics of one kind in a row are less likely.
    },
  };
  const freeze = object => {
    Object.values(object).forEach(value => { if (value && typeof value === 'object') freeze(value); });
    return Object.freeze(object);
  };
  return freeze(config);
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_CONFIG;
