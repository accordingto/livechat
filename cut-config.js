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
    antiRepeat: { shortBelowSeconds: 6, longFromSeconds: 13, repeatedExtremeWeight: 0.45 },
    fairness: { deficitPower: 2, idleBoost: 0.35, maxIdleBoost: 5, recentWeights: [0.25, 0.55, 0.8] },
    speeds: {
      normal: { label: 'Normal', minSeconds: 4, maxSeconds: 15, bins: [
        { from: 4, to: 7, weight: 0.15 }, { from: 7, to: 10, weight: 0.35 },
        { from: 10, to: 12, weight: 0.30 }, { from: 12, to: 15, weight: 0.20 },
      ] },
      chill: { label: 'Chill', minSeconds: 9, maxSeconds: 18, bins: [
        { from: 9, to: 12, weight: 0.20 }, { from: 12, to: 15, weight: 0.45 },
        { from: 15, to: 18, weight: 0.35 },
      ] },
      chaos: { label: 'Chaos', minSeconds: 4, maxSeconds: 10, bins: [
        { from: 4, to: 6, weight: 0.30 }, { from: 6, to: 8, weight: 0.45 },
        { from: 8, to: 10, weight: 0.25 },
      ] },
    },
    cutsByPlayers: [ { upTo: 4, min: 4, max: 5 }, { upTo: 6, min: 5, max: 7 }, { upTo: 9, min: 6, max: 8 } ],
  };
  const freeze = object => {
    Object.values(object).forEach(value => { if (value && typeof value === 'object') freeze(value); });
    return Object.freeze(object);
  };
  return freeze(config);
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_CONFIG;
