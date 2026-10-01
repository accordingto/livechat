/* Private, cross-room exposure history for one host browser.
 * Only its random bearer credential is stored on the device. Firebase holds
 * the history and a recoverable journal, not a public roster or player card.
 */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  const empty = () => ({ version: 1, serial: 0, wolfTasks: [], villageTasks: [], deals: [] });
  const parse = doc => doc?.data ? JSON.parse(doc.data) : { history: null, importedRooms: [], pending: null };
  const unique = (items, key) => {
    const seen = new Set();
    return items.filter(item => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; });
  };
  // Previously released rooms may have their own history. Import it once as
  // older history; the scope's committed records stay the most recent.
  function mergeHistory(shared, local) {
    if (!shared) return clone(local || empty());
    if (!local) return clone(shared);
    const result = clone(shared);
    const exposureKey = e => e.exposureId || [e.matchId, e.source, e.roleId, e.canonicalTaskKey || e.id].join(':');
    for (const field of ['wolfTasks', 'villageTasks']) {
      result[field] = unique([...(local[field] || []), ...(shared[field] || [])].reverse(), exposureKey).reverse().slice(-60);
    }
    result.deals = unique([...(local.deals || []), ...(shared.deals || [])].reverse(), e => e.matchId).reverse().slice(-5);
    result.serial = Math.max(local.serial || 0, shared.serial || 0);
    return result;
  }
  class HistoryScope {
    constructor({ store, token, owner, clock = () => Date.now() }) {
      if (!/^[a-f0-9]{64}$/.test(token || '')) fail('INVALID_SESSION');
      this.store = store; this.path = `rooms/chatwolf-history/players/${token}`;
      this.owner = owner; this.now = clock; this.lock = null;
    }
    async resolvePending(current) {
      const state = parse(current.value), pending = state.pending;
      if (!pending) return current;
      // The write may have committed even when the browser missed its reply.
      let room = await this.store.get(pending.roomPath);
      let committed = room.value?.historyTransactionId === pending.id;
      if (!committed && room.etag === pending.baseEtag) {
        const write = await this.store.put(pending.roomPath, pending.nextDoc, pending.baseEtag);
        if (!write.conflict) committed = true;
        else {
          room = await this.store.get(pending.roomPath);
          committed = room.value?.historyTransactionId === pending.id;
        }
      }
      // A changed room without our marker proves that this allocation never
      // committed. Do not count its cards or replace the intervening room.
      if (committed) {
        state.history = pending.history;
        state.importedRooms = [...new Set([...(state.importedRooms || []), pending.roomCode])];
      }
      state.pending = null;
      const write = await this.store.put(this.path, { data: JSON.stringify(state), owner: null, leaseUntil: 0 }, current.etag);
      if (write.conflict) return null;
      return this.store.get(this.path);
    }
    async acquire() {
      for (let attempt = 0; attempt < 8; attempt++) {
        let current = await this.store.get(this.path);
        if (parse(current.value).pending) {
          current = await this.resolvePending(current);
          if (!current) continue;
        }
        if (current.value?.owner && current.value.owner !== this.owner && current.value.leaseUntil > this.now()) fail('ACTION_PENDING');
        const state = parse(current.value);
        const locked = { data: JSON.stringify(state), owner: this.owner, leaseUntil: this.now() + 30000 };
        const write = await this.store.put(this.path, locked, current.etag);
        if (write.conflict) continue;
        const confirmed = await this.store.get(this.path);
        if (confirmed.value?.owner !== this.owner || parse(confirmed.value).pending) continue;
        this.lock = confirmed;
        return state;
      }
      fail('ACTION_CONFLICT');
    }
    historyFor(roomCode, local) {
      if (!this.lock) fail('ACTION_CONFLICT');
      const state = parse(this.lock.value);
      return (state.importedRooms || []).includes(roomCode)
        ? clone(state.history || local || empty())
        : mergeHistory(state.history, local);
    }
    async release() {
      if (!this.lock) return;
      const locked = this.lock; this.lock = null;
      const state = parse(locked.value);
      if (state.pending) return; // A journal must be recovered, never discarded.
      await this.store.put(this.path, { data: JSON.stringify(state), owner: null, leaseUntil: 0 }, locked.etag);
    }
    async commit({ roomPath, baseEtag, nextDoc, history, roomCode, id }) {
      if (!this.lock || this.lock.value.leaseUntil <= this.now()) fail('ACTION_CONFLICT');
      const locked = this.lock, state = parse(locked.value);
      state.pending = { id, roomPath, baseEtag, nextDoc: { ...nextDoc, historyTransactionId: id }, history, roomCode };
      // This CAS is the fence: a stale lock holder cannot write the room.
      const prepared = await this.store.put(this.path, {
        data: JSON.stringify(state), owner: this.owner, leaseUntil: this.now() + 30000,
      }, locked.etag);
      this.lock = null;
      if (prepared.conflict) return { conflict: true };
      // Recovery uses exactly the same durable document and deterministic draw.
      // It never re-runs random selection.
      for (let attempt = 0; attempt < 8; attempt++) {
        const current = await this.store.get(this.path);
        const pending = parse(current.value).pending;
        if (pending?.id === id) { await this.resolvePending(current); continue; }
        const room = await this.store.get(roomPath);
        return { conflict: room.value?.historyTransactionId !== id };
      }
      fail('ACTION_CONFLICT');
    }
  }
  const api = { HistoryScope, mergeHistory };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CHAT_WOLF_HISTORY = api;
})(typeof globalThis === 'object' ? globalThis : this);
