/* Sketch Relay transport: the existing trusted-host bearer-node design.
 *
 * rooms/{CODE}/players/{controlToken}/lease   { owner, until }       small, renewed often
 * rooms/{CODE}/players/{controlToken}/core    { owner, stateJson, revision }  the game, written on change
 * rooms/{CODE}/players/{controlToken}/opening { sessionId, baselines } one-time card takeover guard
 *
 * Drawings live in the canonical state, so the lease is kept in its own small
 * node and the heavy state is only written when the game actually changes.
 * Player cards get filtered views; they write one pending request at a time
 * to `relayAction` on their own node. A tiny `relayLive` child tells cards the
 * host page is still running without rewriting their drawings. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SKETCH_RELAY_SYNC = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const CONFIG = Object.freeze({ leaseMs: 60000, renewMs: 5000, pulseMs: 500, liveMs: 75000, heartbeatMs: 15000, maxActionLength: 24000 });
  const GAME = 'sketchrelay';
  const uid = () => Array.from(root.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const seed = () => root.crypto.getRandomValues(new Uint32Array(1))[0];
  const stateOf = doc => typeof doc?.stateJson === 'string' ? JSON.parse(doc.stateJson) : null;
  const list = value => Array.isArray(value) ? value : Object.values(value || {});
  // Opaque fingerprint of a card as it was when the game opened.
  function stamp(value) {
    const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v)
      ? '[' + v.map(stable).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    const text = stable(value ?? null); let a = 2166136261, b = 2246822519;
    for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b ^ text.charCodeAt(i), 3266489917); }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  // A card's stable identity: which game and session it shows. Heartbeats,
  // timers and pending requests of the previous game do not change it.
  function identity(card) {
    if (!card || typeof card !== 'object') return stamp(null);
    const sessions = {};
    for (const [key, value] of Object.entries(card)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.sessionId === 'string') sessions[key] = value.sessionId;
    }
    return stamp({ game: card.game ?? null, sessions });
  }
  function clientId(storage) {
    // A reload of the same tab keeps its lease instead of waiting for it to expire.
    try {
      const saved = storage?.getItem('sketchRelayHostClient');
      if (/^[a-f0-9]{32}$/.test(saved || '')) return saved;
      const fresh = uid(); storage?.setItem('sketchRelayHostClient', fresh); return fresh;
    } catch (_) { return uid(); }
  }

  class Host {
    constructor({ room, db, onChange = () => {}, onStatus = () => {}, storage = root.sessionStorage, engine = root.SKETCH_RELAY_ENGINE }) {
      this.room = room; this.db = db; this.engine = engine; this.onChange = onChange; this.onStatus = onStatus;
      this.code = room.code; this.count = room.count; this.client = clientId(storage);
      // sessionStorage survives a reload, but browsers also copy it when a tab
      // is duplicated. Fence each live document separately. A new document may
      // resume its stored client once; a displaced document cannot steal it back.
      this.instance = uid(); this.claimedOnce = false;
      this.offset = 0; this.connected = false; this.stopped = false; this.suspended = false; this.started = false;
      this.lease = null; this.doc = null; this.opening = null; this.lastStatus = '';
      this.serial = Promise.resolve(); this.inbox = []; this.incoming = new Set(); this.flushQueued = false;
      this.cardValues = new Map(); this.seenCards = new Set(); this.sent = new Map(); this.pending = new Map(); this.writing = new Set();
      this.listeners = []; this.cardsSeen = new Set();
      let token = room.getExtra('sketchRelayControlToken');
      if (!/^[a-f0-9]{32}$/.test(token || '')) { token = uid(); room.setExtra('sketchRelayControlToken', token); }
      const base = `rooms/${this.code}/players/${token}`;
      this.leaseRef = db.ref(base + '/lease'); this.coreRef = db.ref(base + '/core'); this.openingRef = db.ref(base + '/opening');
      this.playerRefs = Array.from({ length: this.count }, (_, i) => room.playerRef(i));
    }
    now() { return Date.now() + this.offset; }
    get own() {
      return this.connected && !this.stopped && this.lease?.owner === this.client && this.lease.instance === this.instance && this.lease.until > this.now() && this.doc?.owner === this.client && this.doc.instance === this.instance;
    }
    get state() { return this.doc?.state || null; }
    get rosterChanged() {
      const roster = this.state?.roster;
      return !!roster && (roster.length !== this.count || roster.some((p, i) => p.playerNum !== i + 1));
    }
    status(value) { if (this.lastStatus !== value) { this.lastStatus = value; this.onStatus(value); } }
    refreshStatus() {
      if (this.stopped) return;
      this.status(this.suspended ? 'switched' : !this.connected ? 'offline' : this.own ? this.rosterChanged ? 'rosterChanged' : 'ready'
        : this.lease && (this.lease.owner !== this.client || this.lease.instance !== this.instance) && this.lease.until > this.now() ? 'other_host' : 'connecting');
    }
    sameRoom() {
      if (this.room.code === this.code && this.room.count === this.count) return true;
      this.suspended = true; this.status('switched'); return false;
    }
    listen(ref, handler) { ref.on('value', handler, () => this.status('error')); this.listeners.push({ ref, handler }); }
    connect() {
      if (this.started || this.stopped) return; this.started = true;
      this.listen(this.db.ref('.info/serverTimeOffset'), s => { this.offset = Number(s.val()) || 0; });
      this.listen(this.db.ref('.info/connected'), s => {
        if (this.stopped) return;
        this.connected = s.val() === true;
        if (this.connected) this.renew(); this.refreshStatus();
      });
      this.listen(this.leaseRef, s => { if (this.stopped) return; this.lease = s.val(); this.refreshStatus(); this.afterOwnership(); });
      this.listen(this.openingRef, s => { if (!this.stopped) this.opening = s.val(); });
      this.listen(this.coreRef, s => {
        if (this.stopped) return;
        try {
          const raw = s.val();
          this.doc = raw ? { owner: raw.owner, instance: raw.instance, revision: raw.revision || 0, state: stateOf(raw) } : null;
        } catch (_) { this.doc = null; this.status('error'); return; }
        this.refreshStatus();
        if (this.doc?.state) this.onChange(this.doc.state);
        this.afterOwnership();
      });
      this.cardsReady = Promise.all(this.playerRefs.map((ref, i) => new Promise(resolve => {
        if (!ref) { resolve(); return; }
        const handler = s => { if (this.stopped) return; this.cardValues.set(i + 1, s.val()); resolve(); this.receive(i + 1, s.val()); };
        ref.on('value', handler, () => { resolve(); this.status('error'); }); this.listeners.push({ ref, handler });
      })));
      this.timers = [
        root.setInterval(() => this.renew(), CONFIG.renewMs),
        root.setInterval(() => this.pulse(), CONFIG.pulseMs),
        root.setInterval(() => this.heartbeat(), CONFIG.heartbeatMs),
      ];
    }
    afterOwnership() {
      if (!this.own || this.suspended || !this.doc?.state || !this.sameRoom()) return;
      if (this.rosterChanged) { this.refreshStatus(); return; }
      this.project();
      for (const [num, value] of this.cardValues) this.receive(num, value);
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing || !this.sameRoom()) return;
      this.renewing = true;
      try {
        const now = this.now();
        const result = await this.leaseRef.transaction(raw => {
          if (this.stopped || this.suspended) return;
          if (raw && raw.until > now && (raw.owner !== this.client || (raw.instance !== this.instance && this.claimedOnce))) return;
          return { owner: this.client, instance: this.instance, until: now + CONFIG.leaseMs };
        }, undefined, false);
        if (result.committed) this.claimedOnce = true;
        if (result.committed && (this.doc?.owner !== this.client || this.doc?.instance !== this.instance) && !this.suspended) {
          await this.coreRef.transaction(raw => {
            if (this.stopped || this.lease?.owner !== this.client || this.lease?.instance !== this.instance) return;
            return raw?.owner === this.client && raw?.instance === this.instance ? undefined : Object.assign({}, raw || {}, { owner: this.client, instance: this.instance });
          }, undefined, false);
        }
      } catch (_) { if (!this.stopped) this.status('error'); }
      finally { this.renewing = false; this.refreshStatus(); }
    }
    enqueue(fn) { const task = this.serial.then(fn); this.serial = task.catch(() => {}); return task; }
    async change(fn) {
      if (!this.connected || this.stopped || !this.sameRoom()) throw new Error('offline');
      if (this.suspended) throw new Error('not_available');
      if (!this.own) throw new Error('other_host');
      let noChange = false;
      const result = await this.coreRef.transaction(raw => {
        noChange = false;
        if (this.stopped || this.suspended || !this.connected || raw?.owner !== this.client || raw?.instance !== this.instance || !(this.lease?.owner === this.client && this.lease.instance === this.instance && this.lease.until > this.now())) return;
        const current = stateOf(raw), next = fn(current);
        if (!next || next === current) { noChange = true; return; }
        const json = JSON.stringify(next);
        if (json === raw.stateJson) { noChange = true; return; }
        return { owner: this.client, instance: this.instance, stateJson: json, revision: (raw.revision || 0) + 1 };
      }, undefined, false);
      if (!result.committed && !noChange) throw new Error('not_available');
      return stateOf(result.snapshot.val());
    }
    start(settings) {
      return this.enqueue(async () => {
        await this.cardsReady;
        if (!this.sameRoom() || this.stopped) throw new Error('not_available');
        if (!this.own) throw new Error(this.connected ? 'other_host' : 'offline');
        const id = uid(), now = this.now();
        const roster = Array.from({ length: this.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        const state = this.engine.create({ id, roster, settings, now, seed: seed() });
        const opening = { sessionId: id, baselines: Object.fromEntries(this.playerRefs.map((_, i) => ['p' + (i + 1), identity(this.cardValues.get(i + 1))])) };
        await this.openingRef.set(opening); this.opening = opening;
        const prior = this.suspended; this.suspended = false; this.seenCards.clear(); this.sent.clear();
        try { return await this.change(() => state); }
        catch (error) { this.suspended = prior; throw error; }
      });
    }
    command(type, extra = {}) {
      const state = this.state;
      if (!state || this.rosterChanged || this.suspended || this.stopped) return Promise.reject(new Error('not_available'));
      const input = Object.assign({}, extra, { id: uid(), type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: this.now(), seed: seed() });
      return this.enqueue(async () => {
        const next = await this.change(current => this.engine.apply(current, Object.assign({}, input, { now: this.now() })));
        const reply = next?.replies?.[0];
        if (reply?.id === input.id && reply.error) throw new Error(reply.error);
        return next;
      });
    }
    pulse() {
      if (!this.own || this.rosterChanged || this.suspended || this.ticking) return;
      const state = this.state;
      if (state?.phase !== 'play' || state.paused || !(state.deadline > 0) || this.now() < state.deadline + this.engine.AUTO_SKIP_GRACE_MS) return;
      this.ticking = true;
      this.command('tick').catch(error => { if (!['not_available', 'other_host', 'offline'].includes(error.message) && !this.stopped) this.status('error'); })
        .finally(() => { this.ticking = false; });
    }
    receive(num, data) {
      if (this.stopped || !this.own || this.rosterChanged || this.suspended || !this.sameRoom()) return;
      const state = this.state; if (!state) return;
      const ours = data?.game === GAME && data.relay?.sessionId === state.sessionId;
      if (!ours) {
        if (this.seenCards.has(num)) { this.suspended = true; this.status('switched'); }
        return;
      }
      this.seenCards.add(num);
      const action = data.relayAction;
      if (!action || typeof action !== 'object' || typeof action.id !== 'string' || action.id.length < 8 || action.id.length > 100) return;
      if (action.sessionId !== state.sessionId || JSON.stringify(action).length > CONFIG.maxActionLength) return;
      if (list(state.receipts?.[num]).some(receipt => receipt?.id === action.id) || state.replies?.[num]?.id === action.id) return;
      const key = num + ':' + action.id;
      if (this.incoming.has(key)) return;
      this.incoming.add(key);
      this.inbox.push(Object.assign({}, action, { actor: num }));
      this.flush();
    }
    // Every waiting request goes into one canonical write.
    flush() {
      if (this.flushQueued) return;
      this.flushQueued = true;
      this.enqueue(async () => {
        this.flushQueued = false;
        const items = this.inbox.splice(0);
        if (!items.length) return;
        const base = seed();
        try {
          await this.change(current => items.reduce((state, item, k) => this.engine.apply(state, Object.assign({}, item, { now: this.now(), seed: (base + k) >>> 0 })), current));
        } catch (error) {
          if (!['not_available', 'other_host', 'offline'].includes(error.message) && !this.stopped) this.status('error');
        } finally { items.forEach(item => this.incoming.delete(item.actor + ':' + item.id)); }
      });
    }
    project() {
      const doc = this.doc; if (!doc?.state || this.rosterChanged) return;
      const state = doc.state, now = this.now();
      this.playerRefs.forEach((ref, i) => {
        if (!ref) return;
        const payload = this.engine.view(state, i + 1, now);
        const key = JSON.stringify(payload);
        const sent = this.sent.get(i);
        if (sent && sent.sessionId === state.sessionId && sent.key === key) return;
        payload.relay.revision = doc.revision;
        payload.relayLive = { sessionId: state.sessionId, until: now + CONFIG.liveMs };
        this.pending.set(i, { payload, key, sessionId: state.sessionId, revision: doc.revision });
        this.drain(i);
      });
    }
    async drain(i) {
      if (this.writing.has(i)) return;
      this.writing.add(i);
      try {
        while (this.pending.get(i)) {
          const job = this.pending.get(i); this.pending.delete(i);
          await this.write(i, job);
        }
      } finally { this.writing.delete(i); }
    }
    async write(i, job) {
      const valid = () => !this.stopped && !this.suspended && this.own && this.state?.sessionId === job.sessionId;
      if (!valid()) return;
      const opening = this.opening?.sessionId === job.sessionId ? this.opening : null;
      try {
        const result = await this.playerRefs[i].transaction(old => {
          if (!valid()) return;
          const ours = old?.game === GAME && old.relay?.sessionId === job.sessionId;
          if (!ours && (!opening || identity(old) !== opening.baselines?.['p' + (i + 1)])) return;
          if (ours && Number(old.relay.revision) > job.revision) return;
          return ours ? Object.assign({}, old, job.payload) : job.payload;
        }, undefined, false);
        if (result.committed) {
          this.sent.set(i, { key: job.key, sessionId: job.sessionId });
          // Count cards written for this session only; a new game starts over.
          if (this.cardsSession !== job.sessionId) { this.cardsSession = job.sessionId; this.cardsSeen = new Set(); }
          this.cardsSeen.add(i);
          if (opening && this.cardsSeen.size === this.playerRefs.filter(Boolean).length) {
            this.openingRef.transaction(raw => raw?.sessionId === job.sessionId ? null : undefined, undefined, false).catch(() => {});
          }
        } else {
          const other = result.snapshot.val();
          if (valid() && !(other?.game === GAME && other.relay?.sessionId === job.sessionId)) { this.suspended = true; this.status('switched'); }
        }
      } catch (_) { if (!this.stopped) this.status('error'); }
    }
    heartbeat() {
      if (!this.own || this.rosterChanged || this.suspended) return;
      const sessionId = this.state?.sessionId, until = this.now() + CONFIG.liveMs;
      this.playerRefs.forEach((ref, i) => {
        if (!ref || this.sent.get(i)?.sessionId !== sessionId) return;
        ref.child('relayLive').transaction(old => old?.sessionId === sessionId ? { sessionId, until } : undefined, undefined, false).catch(() => {});
      });
    }
    close() {
      if (this.stopped) return;
      const owned = this.lease?.owner === this.client && this.lease.instance === this.instance && this.connected;
      this.stopped = true;
      this.timers?.forEach(timer => root.clearInterval(timer));
      this.listeners.forEach(({ ref, handler }) => ref.off('value', handler)); this.listeners = [];
      if (owned) this.leaseRef.transaction(raw => raw?.owner === this.client && raw?.instance === this.instance ? { owner: this.client, instance: this.instance, until: 0 } : undefined, undefined, false).catch(() => {});
    }
  }
  return { Host, CONFIG, uid, stamp, identity };
});
