/* Adapter for the existing per-player play.html links. Never publish a roster
 * containing card credentials; each seat receives only its own game session. */
(function (root) {
  'use strict';
  function normalize(value) {
    if (!value || !/^[A-HJ-NP-Z2-9]{6}$/.test(value.code || '')) return null;
    const count = Number(value.playerCount);
    const tokens = Array.isArray(value.tokens) ? value.tokens.slice(0, count) : null;
    if (!Number.isInteger(count) || count < 3 || count > 12 || tokens?.length !== count ||
        tokens.some(t => !/^[a-f0-9]{20}$/.test(t)) || new Set(tokens).size !== count) return null;
    const names = tokens.map((_, i) => String(value.names?.[i] || '').trim().slice(0, 20) || `Player ${i + 1}`);
    // Existing rooms allow repeated names. Give those seats distinct game names.
    const used = new Set();
    const unique = names.map(n => {
      let result = n, suffix = 1;
      while (used.has(result)) result = `${n} ${++suffix}`;
      used.add(result);
      return result;
    });
    return { code: value.code, playerCount: count, tokens, names: unique };
  }
  function readSetup(storage) {
    try {
      const code = storage.getItem('room-last-session');
      const value = JSON.parse(storage.getItem(`room-session-${code}`));
      return normalize({ ...(Array.isArray(value) ? { tokens: value, playerCount: value.length } : value), code });
    } catch (_) { return null; }
  }
  function frameURL(value, base) {
    if (value?.version !== 1 || !/^[A-HJ-NP-Z2-9]{6}$/.test(value.room || '') ||
        !/^[a-f0-9]{64}$/.test(value.token || '')) return null;
    const url = new URL('chat-wolf.html', base);
    url.searchParams.set('room', value.room);
    url.searchParams.set('card', '1');
    // Fragment isn't sent to the web host or included in a referrer.
    url.hash = `session=${value.token}`;
    return url.href;
  }
  const api = { normalize, readSetup, frameURL };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CHAT_WOLF_CARDS = api;
})(typeof globalThis === 'object' ? globalThis : this);
