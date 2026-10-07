/* Pure, seeded draws. A retried authoritative transaction makes the same draw. */
var CUT_RANDOM = (() => {
  'use strict';
  const config = typeof CUT_CONFIG !== 'undefined' ? CUT_CONFIG : require('./cut-config.js');
  function create(seed) {
    let value = 2166136261;
    for (const character of String(seed == null ? 1 : seed)) {
      value ^= character.charCodeAt(0); value = Math.imul(value, 16777619);
    }
    return () => {
      value += 0x6D2B79F5;
      let n = value;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function weighted(items, weight, random) {
    if (!items.length) return null;
    const weights = items.map(item => Math.max(0, Number(weight(item)) || 0));
    const total = weights.reduce((sum, n) => sum + n, 0);
    if (!total) return items[Math.floor(random() * items.length)];
    let pick = random() * total;
    for (let i = 0; i < items.length; i++) { pick -= weights[i]; if (pick < 0) return items[i]; }
    return items[items.length - 1];
  }
  function duration(speed, previousMs, random) {
    const mode = config.speeds[speed] || config.speeds.normal;
    const previous = Number(previousMs) / 1000;
    const anti = config.antiRepeat;
    const bin = weighted(mode.bins, candidate => {
      let weight = candidate.weight;
      if (previous > 0 && previous < anti.shortBelowSeconds && candidate.from < anti.shortBelowSeconds) weight *= anti.repeatedExtremeWeight;
      if (previous >= anti.longFromSeconds && candidate.to > anti.longFromSeconds) weight *= anti.repeatedExtremeWeight;
      return weight;
    }, random);
    return Math.max(mode.minSeconds * 1000, Math.min(mode.maxSeconds * 1000, Math.round((bin.from + random() * (bin.to - bin.from)) * 1000)));
  }
  function speaker(roster, current, stats, recent, sequence, random) {
    const active = roster.filter(p => p.active !== false);
    const candidates = active.filter(p => p.playerNum !== current);
    const largestCount = Math.max(0, ...active.map(p => Number((stats || {})[p.playerNum]?.count) || 0));
    return weighted(candidates, player => {
      const record = (stats || {})[player.playerNum] || { count: 0, lastTurn: 0 };
      const deficit = largestCount - (Number(record.count) || 0) + 1;
      const idle = Math.max(0, sequence - (Number(record.lastTurn) || 0));
      let weight = Math.pow(deficit, config.fairness.deficitPower) * (1 + Math.min(config.fairness.maxIdleBoost, idle * config.fairness.idleBoost));
      const index = (recent || []).indexOf(player.playerNum);
      if (index >= 0) weight *= config.fairness.recentWeights[index] || 1;
      // Recent speakers always remain eligible, so the order is never a fixed rotation.
      return Math.max(0.01, weight);
    }, random)?.playerNum ?? null;
  }
  function targetCuts(playerCount, random) {
    const range = config.cutsByPlayers.find(item => playerCount <= item.upTo) || config.cutsByPlayers.at(-1);
    return range.min + Math.floor(random() * (range.max - range.min + 1));
  }
  return { create, weighted, duration, speaker, targetCuts };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_RANDOM;
