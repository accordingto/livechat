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
    realTopicWeight: 0.6,
    antiRepeat: { shortBelowSeconds: 10, longFromSeconds: 22, repeatedExtremeWeight: 0.45 },
    customTiming: { minSeconds: 5, maxSeconds: 120, defaultMinSeconds: 15, defaultMaxSeconds: 25 },
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
  };
  const freeze = object => {
    Object.values(object).forEach(value => { if (value && typeof value === 'object') freeze(value); });
    return Object.freeze(object);
  };
  return freeze(config);
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_CONFIG;
