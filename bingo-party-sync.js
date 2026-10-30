/* bingo-party-sync.js — 雙選賓果 transport on the Hub's existing Firebase
 * per-token paths (rooms/{code}/players/{token}); no rule, service or secret
 * change.
 *
 * Authority (trusted host browser): the canonical match lives in a private
 * control node rooms/{code}/players/{bingoPartyControlToken}. Its token is
 * kept only in the host browser's saved room session. The authority holds a
 * short lease, applies every command with BINGO_ENGINE, runs the deadlines,
 * and writes each seat a projection containing only what that seat may see.
 * It can run on the host page or — in the same browser — on the host's own
 * player card, so a participating host may close the host page.
 *
 * Seat (any player card): reads ONLY its own node and writes requests into
 * its own node's bpInbox with a server timestamp. The authority decides the
 * actor from WHICH node a request came from, never from the request body.
 * Requests are idempotent by id; a public director command that arrives too
 * late is refused instead of being replayed out of context.
 */
var BINGO_SYNC = (() => {
  'use strict';
  const VERSION = 1;
  const CONTROL_KEY = 'bingoPartyControlToken';
  const EXTRA_KEY = 'bingoPartyExtraSeats';
  const LEASE_MS = 12000, RENEW_MS = 4000, TICK_MS = 400, LIVE_REPUBLISH_MS = 8000;
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
  const engine = () => (typeof BINGO_ENGINE !== 'undefined' ? BINGO_ENGINE : require('./bingo-party-engine.js'));
  const parse = text => { try { return typeof text === 'string' ? JSON.parse(text) : null; } catch (e) { return null; } };

  /* The seat map comes from the host browser's saved Hub room: Hub links are
   * seats 1–9; a 9-link room may add bingo-only seats 10–12. */
  function savedRoom(code, storage) {
    try { return JSON.parse((storage || localStorage).getItem('room-session-' + code) || 'null'); } catch (e) { return null; }
  }
  function seatsFrom(saved) {
    if (!saved || !Array.isArray(saved.tokens)) return [];
    const count = Number(saved.playerCount || saved.tokens.length) || 0;
    const seats = saved.tokens.slice(0, count).map((token, i) => ({ playerNum: i + 1, token, name: String(saved.names?.[i] || '').trim() }));
    if (count === 9 && Array.isArray(saved[EXTRA_KEY])) {
      saved[EXTRA_KEY].slice(0, 3).forEach((extra, i) => {
        if (extra && TOKEN.test(extra.token || '')) seats.push({ playerNum: 10 + i, token: extra.token, name: String(extra.name || '').trim() });
      });
    }
    return seats.filter(s => TOKEN.test(s.token || ''));
  }
  function controlToken(code, storage, create) {
    const saved = savedRoom(code, storage);
    let token = saved?.[CONTROL_KEY];
    if (!/^[a-f0-9]{32}$/.test(token || '') && create && saved) {
      token = uid();
      try { (storage || localStorage).setItem('room-session-' + code, JSON.stringify(Object.assign({}, saved, { [CONTROL_KEY]: token }))); } catch (e) { return null; }
    }
    return /^[a-f0-9]{32}$/.test(token || '') ? token : null;
  }

  class Authority {
    constructor({ db, code, storage, onState = () => {}, onStatus = () => {}, label = 'page', preferred = false }) {
      this.db = db; this.code = code; this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      this.onState = onState; this.onStatus = onStatus; this.label = label; this.preferred = preferred;
      this.client = uid(); this.offset = 0; this.connected = false; this.own = false; this.stopped = false; this.switched = false;
      this.doc = null; this.state = null; this.serial = Promise.resolve(); this.publishing = Promise.resolve();
      this.cards = {}; this.listeners = []; this.inflight = new Set(); this.published = {}; this.initialSession = null; this.statusValue = 'connecting';
      const token = controlToken(code, this.storage, true);
      if (!token) throw new Error('setup_needed');
      this.token = token;
      this.ref = db.ref(`rooms/${code}/players/${token}`);
    }
    now() { return Date.now() + this.offset; }
    status(value) { if (this.statusValue !== value) { this.statusValue = value; this.onStatus(value); } }
    seats() { return seatsFrom(savedRoom(this.code, this.storage)); }
    seatRef(playerNum) { const seat = this.seats().find(s => s.playerNum === playerNum); return seat ? this.db.ref(`rooms/${this.code}/players/${seat.token}`) : null; }
    connect() {
      const on = (ref, handler, fail) => { ref.on('value', handler, fail); this.listeners.push([ref, handler]); };
      on(this.db.ref('.info/serverTimeOffset'), snap => { this.offset = Number(snap.val()) || 0; });
      on(this.db.ref('.info/connected'), snap => {
        this.connected = snap.val() === true;
        if (this.connected) this.renew(); else { this.own = false; this.status('offline'); }
      });
      on(this.ref, snap => this.receiveDoc(snap.val()), () => this.status('error'));
      this.watchSeats();
      this.timers = [setInterval(() => this.renew(), RENEW_MS), setInterval(() => this.tick(), TICK_MS)];
    }
    watchSeats() {
      for (const [ref, handler] of this.seatListeners || []) ref.off('value', handler);
      this.seatListeners = [];
      for (const seat of this.seats()) {
        const ref = this.db.ref(`rooms/${this.code}/players/${seat.token}`);
        const handler = snap => { this.cards[seat.playerNum] = snap.val(); this.receiveCard(seat.playerNum); };
        ref.on('value', handler);
        this.seatListeners.push([ref, handler]);
      }
    }
    receiveDoc(doc) {
      this.doc = doc;
      this.state = parse(doc?.stateJson);
      this.own = this.connected && doc?.owner === this.client && doc.leaseUntil > this.now();
      this.status(this.switched ? 'switched' : this.own ? 'ready' : doc?.owner && doc.leaseUntil > this.now() ? 'other_host' : 'connecting');
      this.onState(this.state);
      if (this.own && this.state && !this.switched) {
        this.publish();
        for (const n of Object.keys(this.cards)) this.receiveCard(Number(n));
      }
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing) return;
      this.renewing = true;
      const now = this.now();
      try {
        const result = await this.ref.transaction(doc => {
          doc = doc || {};
          if (doc.owner && doc.owner !== this.client && doc.leaseUntil > now) return;
          return Object.assign({}, doc, { owner: this.client, holder: this.label, leaseUntil: now + LEASE_MS });
        }, undefined, false);
        if (!result.committed) { this.own = false; this.status('other_host'); }
      } catch (e) { this.status('error'); }
      finally { this.renewing = false; }
    }
    enqueue(fn) { const run = this.serial.then(fn); this.serial = run.catch(() => {}); return run; }
    async change(fn) {
      if (!this.connected || this.stopped) throw new Error('offline');
      const now = this.now();
      let produced = null;
      const result = await this.ref.transaction(doc => {
        if (!doc || doc.owner !== this.client || !(doc.leaseUntil > now)) return;
        const current = parse(doc.stateJson);
        const next = fn(current);
        if (!next || next === current) return;
        produced = next;
        return Object.assign({}, doc, { stateJson: JSON.stringify(next), revision: (doc.revision || 0) + 1, leaseUntil: now + LEASE_MS });
      }, undefined, false);
      if (!result.committed) { if (produced === null && this.own) return this.state; throw new Error('not_available'); }
      return parse(result.snapshot.val()?.stateJson);
    }
    /* Opening a lobby replaces whatever game the links showed before. */
    openLobby({ settings, hostPlayerNum = 0, seats } = {}) {
      return this.enqueue(async () => {
        const list = (seats || this.seats()).map(s => ({ playerNum: s.playerNum, name: s.name || ('Player ' + s.playerNum) }));
        if (list.length < 4) throw new Error('player_count');
        const id = uid(), state = engine().create({ sessionId: id, seed: seed(), now: this.now(), roster: list, settings, hostPlayerNum });
        this.initialSession = id; this.switched = false; this.published = {};
        await this.renew();
        const next = await this.change(() => state);
        this.watchSeats();
        return next;
      });
    }
    command(type, extra = {}) {
      const state = this.state;
      if (!state) return Promise.reject(new Error('not_available'));
      const cmd = Object.assign({}, extra, { id: extra.id || uid(), type, actor: 0, sessionId: state.sessionId, now: this.now(), seed: seed(), uid: uid() });
      return this.enqueue(async () => {
        // The visible host page reclaims control from the host card in this
        // same browser the moment the host uses it (both are trusted here).
        if (!this.own && this.label === 'page' && (typeof document === 'undefined' || !document.hidden)) await this.takeover();
        const next = await this.change(current => current ? engine().apply(current, Object.assign({}, cmd, { sessionId: cmd.sessionId })) : current);
        if (type === 'newGame' && next) { this.initialSession = next.sessionId; this.published = {}; }
        const reply = engine().list(next?.replyLog?.['0']).find(r => r.id === cmd.id);
        if (reply?.error) throw new Error(reply.error);
        return next;
      });
    }
    tick() {
      const state = this.state;
      if (!this.own || this.stopped || this.ticking || !state || !engine().timerDue(state, this.now())) return;
      this.ticking = true;
      const cmd = { type: 'tick', now: this.now() };
      this.enqueue(() => this.change(current => current ? engine().apply(current, cmd) : current))
        .catch(() => {}).finally(() => { this.ticking = false; });
    }
    receiveCard(playerNum) {
      const state = this.state, data = this.cards[playerNum];
      if (!state || !this.own || this.stopped || this.switched) return;
      if (!engine().list(state.roster).some(p => p.playerNum === playerNum)) return;
      const ours = data?.game === engine().GAME && data.bp?.sessionId === state.sessionId;
      if (!ours) {
        // A link already showing this session now shows something else: the
        // host switched games elsewhere. Stop instead of fighting over it.
        if (this.published[playerNum] && this.initialSession !== state.sessionId && data && data.game !== engine().GAME) { this.switched = true; this.status('switched'); }
        return;
      }
      const inbox = data.bpInbox && typeof data.bpInbox === 'object' ? data.bpInbox : {};
      const entries = Object.entries(inbox).filter(([key, value]) => value && typeof value === 'object' && /^[a-f0-9]{8,64}$/.test(key))
        .sort((a, b) => (Number(a[1].sentAt) || 0) - (Number(b[1].sentAt) || 0));
      const ref = this.seatRef(playerNum);
      for (const [key, request] of entries) {
        const flight = playerNum + ':' + key;
        if (this.inflight.has(flight)) continue;
        if (engine().list(state.seen?.[String(playerNum)]).includes(key) || request.sessionId !== state.sessionId) {
          this.inflight.add(flight);
          ref?.child('bpInbox/' + key).remove().catch(() => {}).finally(() => this.inflight.delete(flight));
          continue;
        }
        this.inflight.add(flight);
        // The actor is the node this came from; body fields cannot change it.
        const cmd = Object.assign({}, request, { id: key, actor: playerNum, now: this.now(), seed: seed(), uid: uid(),
          sentAt: Number.isFinite(Number(request.sentAt)) ? Number(request.sentAt) : undefined });
        this.enqueue(() => this.change(current => current ? engine().apply(current, cmd) : current))
          .then(() => ref?.child('bpInbox/' + key).remove())
          .catch(() => {})
          .finally(() => this.inflight.delete(flight));
      }
    }
    publish() {
      const state = this.state, doc = this.doc;
      if (!state) return;
      this.publishing = this.publishing.then(async () => {
        if (!this.own || this.stopped || this.switched || this.state?.sessionId !== state.sessionId) return;
        const initial = this.initialSession === state.sessionId;
        const live = doc?.leaseUntil || 0;
        let complete = true;
        for (const p of engine().list(state.roster)) {
          if (this.state?.sessionId !== state.sessionId || !this.own || this.stopped) return;
          const ref = this.seatRef(p.playerNum);
          if (!ref) { complete = false; continue; }
          const viewJson = JSON.stringify(engine().view(state, { playerNum: p.playerNum }, this.now()));
          const last = this.published[p.playerNum];
          if (last && last.viewJson === viewJson && live - last.live < LIVE_REPUBLISH_MS) continue;
          const payload = { version: VERSION, sessionId: state.sessionId, revision: state.revision || 0, live, viewJson };
          const result = await ref.transaction(old => {
            const same = old?.game === engine().GAME && old.bp?.sessionId === state.sessionId;
            if (!same && !initial) return;
            if (same && (old.bp.revision || 0) > payload.revision) return;
            const base = same ? old : {};
            return Object.assign({}, base, { game: engine().GAME, playerNum: p.playerNum, name: p.name, bp: payload });
          }, undefined, false);
          if (result.committed) this.published[p.playerNum] = { viewJson, live };
          else {
            complete = false;
            const now = result.snapshot.val();
            if (!initial && now && now.game !== engine().GAME) { this.switched = true; this.status('switched'); return; }
          }
        }
        if (initial && complete) this.initialSession = null;
      }).catch(() => this.status('error'));
    }
    /* Same browser only (the control token lives here): take the lease now. */
    async takeover() {
      const now = this.now();
      await this.ref.transaction(doc => doc ? Object.assign({}, doc, { owner: this.client, holder: this.label, leaseUntil: now + LEASE_MS }) : undefined, undefined, false).catch(() => {});
    }
    /* "Bring every card back": re-publish this session over other games. */
    reclaim() { if (!this.state) return; this.switched = false; this.initialSession = this.state.sessionId; this.published = {}; this.status(this.own ? 'ready' : 'connecting'); this.publish(); }
    close() {
      this.stopped = true;
      (this.timers || []).forEach(clearInterval);
      for (const [ref, handler] of [...this.listeners, ...(this.seatListeners || [])]) ref.off('value', handler);
      // Only release the lease this tab holds; never a newer tab's.
      if (this.connected) this.ref.transaction(doc => doc?.owner === this.client ? Object.assign({}, doc, { leaseUntil: 0 }) : undefined, undefined, false).catch(() => {});
    }
  }

  /* A player card: own node only. */
  class Seat {
    constructor({ db, code, token }) {
      this.db = db; this.code = code; this.token = token; this.ref = db.ref(`rooms/${code}/players/${token}`);
      this.pending = new Map(); this.view = null;
    }
    update(data) {
      this.view = data?.game === 'bingoparty' && data.bp?.version === VERSION ? parse(data.bp.viewJson) : null;
      if (!this.view) return null;
      const replies = this.view.replies || [], acks = new Set(this.view.acks || []);
      for (const [id, entry] of this.pending) {
        if (!acks.has(id)) continue;
        const reply = replies.find(r => r.id === id);
        clearTimeout(entry.timer);
        this.pending.delete(id);
        entry.resolve({ error: reply?.error || '' });
      }
      return this.view;
    }
    send(type, extra = {}) {
      const view = this.view;
      if (!view) return Promise.resolve({ error: 'not_available' });
      const id = uid();
      const body = Object.assign({}, extra, { type, sessionId: view.sessionId });
      if (view.round?.id && extra.roundId !== false) body.roundId = view.round.id; else delete body.roundId;
      const timestamp = (typeof firebase !== 'undefined' && firebase.database?.ServerValue?.TIMESTAMP) || Date.now();
      return new Promise(resolve => {
        const timer = setTimeout(() => { this.pending.delete(id); resolve({ error: 'no_host' }); }, 9000);
        this.pending.set(id, { resolve, timer });
        this.ref.child('bpInbox/' + id).set(Object.assign(body, { sentAt: timestamp })).catch(() => {
          clearTimeout(timer); this.pending.delete(id); resolve({ error: 'offline' });
        });
      });
    }
  }

  return { VERSION, CONTROL_KEY, EXTRA_KEY, Authority, Seat, savedRoom, seatsFrom, controlToken, uid, seed };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BINGO_SYNC;
