/* CUT uses the existing trusted-host, private bearer-node architecture.
 * Only the active host runs the clock/RNG; player cards receive filtered views.
 * JSON preserves exact canonical arrays through Firebase's empty-tree cleanup. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CUT_SYNC = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const CONFIG = Object.freeze({ leaseMs: 14000, renewMs: 4000, tickMs: 150 });
  const uid = () => Array.from(root.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const seed = () => root.crypto.getRandomValues(new Uint32Array(1))[0];
  const stateOf = doc => typeof doc?.stateJson === 'string' ? JSON.parse(doc.stateJson) : doc?.state || null;
  const seen = value => Array.isArray(value) ? value : Object.values(value || {});
  // Store opaque opening fingerprints, never a copy of another game's card.
  function stamp(value) {
    const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v)
      ? '[' + v.map(stable).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    const text = stable(value ?? null); let a = 2166136261, b = 2246822519;
    for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b ^ text.charCodeAt(i), 3266489917); }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  class Host {
    constructor({ room, db, onChange = () => {}, onStatus = () => {} }) {
      this.room = room; this.db = db; this.onChange = onChange; this.onStatus = onStatus;
      this.code = room.code; this.count = room.count; this.client = uid();
      this.offset = 0; this.connected = false; this.own = false; this.stopped = false; this.suspended = false;
      this.doc = null; this.serial = Promise.resolve(); this.outgoing = Promise.resolve();
      this.incoming = new Set(); this.seenCards = new Set(); this.cardValues = new Map(); this.listeners = [];
      let token = room.getExtra('cutControlToken');
      if (!/^[a-f0-9]{32}$/.test(token || '')) { token = uid(); room.setExtra('cutControlToken', token); }
      this.ref = db.ref(`rooms/${this.code}/players/${token}`);
      this.offsetRef = db.ref('.info/serverTimeOffset'); this.connectedRef = db.ref('.info/connected');
      this.playerRefs = Array.from({ length: this.count }, (_, i) => room.playerRef(i));
      this.offsetHandler = snapshot => { if (!this.stopped) this.offset = Number(snapshot.val()) || 0; };
      this.connectedHandler = snapshot => {
        if (this.stopped) return;
        this.connected = snapshot.val() === true;
        if (this.connected) this.renew();
        else { this.own = false; this.status('offline'); }
      };
      this.valueHandler = snapshot => {
        if (this.stopped) return;
        try {
          const raw = snapshot.val(); this.doc = raw ? Object.assign({}, raw, { state: stateOf(raw) }) : null;
          this.own = this.connected && this.doc?.owner === this.client && this.doc.leaseUntil > this.now() && this.sameRoom();
          this.status(this.suspended ? 'switched' : !this.connected ? 'offline' : this.own ? 'ready' : 'other_host');
          if (this.doc?.state) this.onChange(this.doc.state);
          if (this.own && !this.suspended && this.doc?.state) {
            this.project();
            for (const [number, value] of this.cardValues) this.receive(number, value);
          }
        } catch (_) { this.own = false; this.status('error'); }
      };
    }
    now() { return Date.now() + this.offset; }
    status(value) { if (this.lastStatus !== value) { this.lastStatus = value; this.onStatus(value); } }
    sameRoom() {
      if (this.room.code === this.code && this.room.count === this.count) return true;
      this.suspended = true; this.own = false; this.status('switched'); return false;
    }
    connect() {
      if (this.started || this.stopped) return; this.started = true;
      this.offsetRef.on('value', this.offsetHandler);
      this.ref.on('value', this.valueHandler, () => this.status('error'));
      this.cardsReady = Promise.all(this.playerRefs.map((ref, i) => new Promise(resolve => {
        if (!ref) { resolve(); return; }
        const handler = snapshot => { if (this.stopped) return; const value = snapshot.val(); this.cardValues.set(i + 1, value); resolve(); this.receive(i + 1, value); };
        ref.on('value', handler, () => { resolve(); this.status('error'); }); this.listeners.push({ ref, handler });
      })));
      this.connectedRef.on('value', this.connectedHandler);
      this.renewTimer = root.setInterval(() => this.renew(), CONFIG.renewMs);
      this.tickTimer = root.setInterval(() => this.pulse(), CONFIG.tickMs);
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing || !this.sameRoom()) return;
      this.renewing = true; const now = this.now();
      try {
        const result = await this.ref.transaction(raw => {
          if (this.stopped || !this.connected || !this.sameRoom()) return;
          raw ||= {};
          if (raw.owner && raw.owner !== this.client && raw.leaseUntil > now) return;
          return Object.assign({}, raw, { owner: this.client, leaseUntil: now + CONFIG.leaseMs });
        }, undefined, false);
        if (!result.committed && !this.stopped) { this.own = false; this.status('other_host'); }
      } catch (_) { if (!this.stopped) { this.own = false; this.status('error'); } }
      finally { this.renewing = false; }
    }
    enqueue(fn) { const task = this.serial.then(fn); this.serial = task.catch(() => {}); return task; }
    async change(fn, { opening = null, allowSwitched = false } = {}) {
      if (!this.connected || this.stopped || !this.sameRoom()) throw new Error('offline');
      if (this.suspended && !allowSwitched) throw new Error('not_available');
      const now = this.now(); let noChange = false;
      const result = await this.ref.transaction(raw => {
        noChange = false;
        if (this.stopped || !this.connected || !this.sameRoom() || (this.suspended && !allowSwitched) || raw?.owner !== this.client || raw.leaseUntil <= now) return;
        const current = stateOf(raw), next = fn(current);
        if (!next || next === current || JSON.stringify(next) === raw.stateJson) { noChange = true; return; }
        const doc = Object.assign({}, raw, { stateJson: JSON.stringify(next), revision: (raw.revision || 0) + 1, leaseUntil: now + CONFIG.leaseMs });
        delete doc.state;
        if (opening) doc.opening = opening;
        return doc;
      }, undefined, false);
      if (!result.committed && !noChange) throw new Error('not_available');
      return stateOf(result.snapshot.val());
    }
    start({ speed = 'normal', category = 'mixed' } = {}) {
      return this.enqueue(async () => {
        await this.cardsReady; await this.outgoing;
        if (!this.sameRoom() || this.stopped) throw new Error('not_available');
        const id = uid(), now = this.now(), randomSeed = seed();
        const opening = { sessionId: id, baselines: Object.fromEntries(this.playerRefs.map((_, i) => [i + 1, stamp(this.cardValues.get(i + 1))])) };
        const roster = Array.from({ length: this.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        const priorSuspended = this.suspended; this.suspended = false; this.seenCards.clear();
        try { return await this.change(() => root.CUT_ENGINE.create({ id, roster, speed, category, now, seed: randomSeed }), { opening, allowSwitched: true }); }
        catch (error) { this.suspended = priorSuspended; throw error; }
      });
    }
    command(type, extra = {}) {
      const state = this.doc?.state;
      if (!state || this.suspended || this.stopped || !this.sameRoom()) return Promise.reject(new Error('not_available'));
      const input = Object.assign({}, extra, { id: uid(), type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: this.now(), seed: seed() });
      return this.enqueue(async () => {
        const next = await this.change(current => root.CUT_ENGINE.apply(current, input));
        const error = next?.replies?.[0]?.id === input.id && next.replies[0].error;
        if (error) throw new Error(error);
        return next;
      });
    }
    pulse() {
      if (this.stopped || this.suspended || !this.own || !this.connected || this.ticking || !this.sameRoom()) return;
      const state = this.doc?.state;
      const due = state?.phase === 'speaking' ? state.deadline : ['countdown', 'cut', 'handoff'].includes(state?.phase) ? state.phaseUntil : null;
      if (!(due > 0) || this.now() < due) return;
      this.ticking = true;
      this.command('tick').catch(error => { if (error.message !== 'not_available' && !this.stopped) this.status('error'); }).finally(() => { this.ticking = false; });
    }
    receive(playerNum, data) {
      if (this.stopped || !this.own || this.suspended || !this.sameRoom()) return;
      const state = this.doc?.state; if (!state) return;
      const ours = data?.game === 'cut' && data.cut?.sessionId === state.sessionId;
      if (!ours) { if (this.seenCards.has(playerNum)) { this.suspended = true; this.status('switched'); } return; }
      this.seenCards.add(playerNum);
      const action = data.cutAction;
      if (!action || typeof action.id !== 'string' || action.id.length < 8 || action.id.length > 100 || action.sessionId !== state.sessionId || JSON.stringify(action).length > 4000) return;
      if (seen(state.seen?.[playerNum]).includes(action.id) || state.replies?.[playerNum]?.id === action.id) return;
      const key = playerNum + ':' + action.id; if (this.incoming.has(key)) return;
      this.incoming.add(key);
      const input = Object.assign({}, action, { actor: playerNum, now: this.now(), seed: seed() });
      this.enqueue(() => this.change(current => root.CUT_ENGINE.apply(current, input)))
        .catch(error => { if (error.message !== 'not_available' && !this.stopped) this.status('error'); })
        .finally(() => this.incoming.delete(key));
    }
    project() {
      const doc = this.doc; if (!doc?.state) return;
      this.outgoing = this.outgoing.then(async () => {
        const valid = () => !this.stopped && !this.suspended && this.own && this.connected && this.sameRoom() && this.doc?.state?.sessionId === doc.state.sessionId;
        if (!valid()) return;
        const initial = doc.opening?.sessionId === doc.state.sessionId; let complete = true;
        for (let i = 0; i < this.playerRefs.length; i++) {
          if (!valid()) return;
          const ref = this.playerRefs[i]; if (!ref) { complete = false; continue; }
          const payload = root.CUT_ENGINE.view(doc.state, i + 1, this.now());
          payload.cut.revision = doc.revision || 0; payload.cut.hostLiveUntil = doc.leaseUntil;
          const result = await ref.transaction(old => {
            if (!valid()) return;
            const ours = old?.game === 'cut' && old.cut?.sessionId === doc.state.sessionId;
            if (!ours && (!initial || stamp(old) !== doc.opening.baselines?.[i + 1])) return;
            if (ours && (old.cut.revision > payload.cut.revision || (old.cut.revision === payload.cut.revision && old.cut.hostLiveUntil > payload.cut.hostLiveUntil))) return;
            return ours ? Object.assign({}, old, payload) : payload;
          }, undefined, false);
          if (!result.committed) {
            complete = false; const other = result.snapshot.val();
            if (valid() && !(other?.game === 'cut' && other.cut?.sessionId === doc.state.sessionId)) { this.suspended = true; this.status('switched'); return; }
          }
        }
        if (initial && complete && valid()) await this.ref.transaction(raw => {
          if (!valid() || raw?.owner !== this.client || raw.opening?.sessionId !== doc.state.sessionId) return;
          const next = Object.assign({}, raw); delete next.opening; return next;
        }, undefined, false);
      }).catch(() => { if (!this.stopped) this.status('error'); });
    }
    close() {
      if (this.stopped) return;
      this.stopped = true; this.own = false;
      root.clearInterval(this.renewTimer); root.clearInterval(this.tickTimer);
      this.offsetRef.off('value', this.offsetHandler); this.connectedRef.off('value', this.connectedHandler); this.ref.off('value', this.valueHandler);
      this.listeners.forEach(({ ref, handler }) => ref.off('value', handler)); this.listeners = [];
      if (this.connected) this.ref.transaction(raw => raw?.owner === this.client ? Object.assign({}, raw, { leaseUntil: 0 }) : undefined, undefined, false).catch(() => {});
    }
  }
  return { Host, CONFIG, uid };
});
