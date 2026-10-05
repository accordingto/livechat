/* Dixit uses the Hub's existing private-token transport and host
 * lease. Only this game's adapter lives here; talk-sync.js remains unchanged.
 * Load talk-sync.js and dixit-engine.js before this file.
 */
var DIXIT_SYNC = (() => {
  'use strict';
  const uid = TALK_SYNC.uid;
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
  const LEASE_MS = 90000;
  function roomAdapter(room) {
    return new Proxy(room, {
      get(target, key) {
        if (key === 'getExtra') return name => target.getExtra(name === 'letsTalkControlToken' ? 'dixitControlToken' : name);
        if (key === 'setExtra') return (name, value) => target.setExtra(name === 'letsTalkControlToken' ? 'dixitControlToken' : name, value);
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }
  class Host extends TALK_SYNC.Host {
    constructor({ room, db, mode = 'shared', resumeGroup = '', browserGroup = '', isActive = () => true, onChange = () => {}, onStatus = () => {} }) {
      let host;
      super({ room: roomAdapter(room), db, onStatus,
        // The public host screen receives the same strictly filtered view as
        // a spectator. Full hands exist only inside the secret control node.
        onChange: state => {
          const payload = DIXIT_ENGINE.view(state, 0, host.now());
          payload.dixit.revision = host.doc?.revision || 0;
          payload.dixit.hostLiveUntil = host.doc?.leaseUntil || 0;
          onChange(payload);
        },
      });
      host = this;
      this.openingCards = null;
      this.restartingSession = null;
      this.revealAdvancing = null;
      this.mode = mode === 'private' ? 'private' : 'shared';
      this.resumeGroup = /^[a-f0-9]{32}$/.test(resumeGroup) ? resumeGroup : '';
      this.browserGroup = /^[a-f0-9]{32}$/.test(browserGroup) ? browserGroup : '';
      this.privateAcquired = false;
      this.resumeSuperseded = false;
      this.isActive = isActive;
      this.active = true;
      this.pendingProjections = new Map();
      this.projectionTasks = new Map();
      this.projectedSeats = new Map();
      this.loadedBootstrapSession = null;
      // Hidden pages keep executing instead of intentionally dropping the
      // game. A visible host context may replace a hidden executor; the
      // background predecessor cannot steal a live foreground lease back.
      this.connectedHandler = snap => {
        this.connected = snap.val() === true;
        this.own = this.liveOwner();
        if (this.connected && this.canAcquire(this.doc)) this.renew();
        else this.reportStatus();
      };
      this.valueHandler = snap => {
        this.doc = snap.val();
        if (this.mode === 'private' && this.privateAcquired && this.resumeGroup && this.doc?.owner !== this.client
          && this.privateOwner(this.doc) && this.doc.ownerResumeGroup === this.resumeGroup) this.resumeSuperseded = true;
        this.own = this.liveOwner();
        if (this.mode === 'private' && this.own) this.privateAcquired = true;
        if (this.own) this.loadBootstrap();
        this.reportStatus();
        if (this.doc?.state) this.onChange(this.doc.state);
        if (this.own && !this.suspended && this.doc?.state) {
          this.project();
          Object.entries(this.room.answers).forEach(([n, data]) => this.receive(Number(n), data));
        } else if (this.connected && this.canAcquire(this.doc)) this.renew();
      };
    }
    foreground() { return this.active && this.isActive(); }
    liveOwner(doc = this.doc, now = this.now()) {
      return !!(this.connected && !this.stopped && !this.resumeSuperseded && doc?.owner === this.client && doc.leaseUntil > now);
    }
    privateOwner(doc) { return doc?.ownerMode === 'private' && doc.ownerModeClient === doc.owner; }
    hiddenOwner(doc) { return doc?.ownerVisible === false && doc.ownerVisibilityClient === doc.owner; }
    browserOwnerGroup(doc) {
      return this.privateOwner(doc) && doc.ownerBrowserGroupClient === doc.owner && /^[a-f0-9]{32}$/.test(doc.ownerBrowserGroup || '')
        ? doc.ownerBrowserGroup : '';
    }
    bootstrap(doc) {
      const initial = doc?.openingProjection;
      if (!doc?.state?.sessionId || initial?.sessionId !== doc.state.sessionId || !initial.cards || Array.isArray(initial.cards)) return null;
      return DIXIT_ENGINE.list(doc.state.roster).every(p => Object.prototype.hasOwnProperty.call(initial.cards, p.playerNum)) ? initial : null;
    }
    loadBootstrap() {
      const session = this.doc?.state?.sessionId;
      if (!session || this.loadedBootstrapSession === session) return;
      this.loadedBootstrapSession = session;
      const initial = this.bootstrap(this.doc);
      if (!initial) return;
      // Exact previous seat snapshots stay only under the secret control
      // token. A replacement can safely finish a partially opened session.
      this.initialSession = session; this.openingCards = clone(initial.cards);
      this.seenCards.clear(); this.projectedSeats.clear();
    }
    legacyOpeningComplete(doc) {
      return DIXIT_ENGINE.list(doc.state.roster).every(p => {
        const data = this.room.answers[p.playerNum];
        return data?.game === 'dixit' && data.dixit?.version === 1 && data.dixit.sessionId === doc.state.sessionId;
      });
    }
    canAcquire(doc, now = this.now()) {
      if (this.stopped || this.resumeSuperseded) return false;
      if (this.mode === 'private' && doc?.state && !this.privateOwner(doc) && !this.bootstrap(doc) && !this.legacyOpeningComplete(doc)) return false;
      if (!doc?.owner || doc.owner === this.client || !(doc.leaseUntil > now)) return true;
      if (!this.foreground()) return false;
      if (this.hiddenOwner(doc)) return true;
      if (this.mode !== 'private') return false;
      if (!this.privateOwner(doc)) return true;
      // A refresh gets a fresh client identity but keeps this tab's resume
      // group. Only the replacement, which has never owned a lease, may
      // preempt its predecessor; the old instance cannot take it back.
      if (this.privateAcquired) return false;
      if (this.resumeGroup && doc.ownerResumeGroup === this.resumeGroup) return true;
      // A newly opened tab in the same trusted browser also replaces a ghost
      // lease when the preceding tab's asynchronous close could not finish.
      // Separate per-tab resume groups keep a still-open predecessor eligible
      // again after this replacement hides/closes, without a live-tab fight.
      const previousBrowser = this.browserOwnerGroup(doc);
      return !!(this.browserGroup && (!previousBrowser || previousBrowser === this.browserGroup));
    }
    reportStatus() {
      const privateOwner = this.privateOwner(this.doc) && this.doc.owner !== this.client && this.doc.leaseUntil > this.now();
      this.status(this.suspended ? 'switched' : !this.connected ? 'offline'
        : this.own ? 'ready' : privateOwner ? 'host_card_active' : 'other_host');
    }
    async release() {
      if (!this.connected) return;
      try {
        await this.ref.transaction(doc => doc?.owner === this.client
          ? Object.assign({}, doc, { leaseUntil: 0 }) : undefined, undefined, false);
      } catch (error) { if (!this.stopped) this.status('error'); }
    }
    setActive(value) {
      this.active = value === true;
      this.own = this.liveOwner();
      this.reportStatus();
      if (this.connected && !this.stopped) return this.renew();
      return Promise.resolve();
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing) return;
      this.renewing = true;
      const now = this.now();
      let expiredCommit = false;
      try {
        const result = await this.ref.transaction(doc => {
          doc = doc || {};
          if (this.stopped || !this.connected || !this.canAcquire(doc, now)) return;
          const changedOwner = doc.owner !== this.client;
          return Object.assign({}, doc, { owner: this.client, ownerMode: this.mode, ownerModeClient: this.client,
            ownerResumeGroup: this.mode === 'private' ? this.resumeGroup : '',
            ownerBrowserGroup: this.mode === 'private' ? this.browserGroup : '', ownerBrowserGroupClient: this.client,
            ownerVisible: this.foreground(), ownerVisibilityClient: this.client, leaseUntil: now + LEASE_MS,
            leaseEpoch: (doc.leaseEpoch || 0) + (changedOwner ? 1 : 0) });
        }, undefined, false);
        if (!result.committed) { this.own = this.liveOwner(); this.reportStatus(); }
        else {
          const committed = result.snapshot.val();
          if (this.mode === 'private' && committed?.owner === this.client) this.privateAcquired = true;
          expiredCommit = committed?.leaseUntil <= this.now();
        }
      } catch (error) { if (!this.stopped) this.status('error'); }
      finally { this.renewing = false; }
      // A delayed Firebase retry can commit a deadline captured more than
      // the lease duration ago. Refresh it with a fresh timestamp immediately.
      if (expiredCommit && this.connected && !this.stopped) return this.renew();
    }
    async change(fn) {
      if (!this.connected || this.stopped) throw new Error('offline');
      const now = this.now();
      const result = await this.ref.transaction(doc => {
        if (!this.liveOwner(doc, now)) return;
        const next = fn(doc.state || null);
        if (!next || next === doc.state) return;
        const opening = next.sessionId !== doc.state?.sessionId && this.openingCards
          ? { openingProjection: { sessionId: next.sessionId, cards: clone(this.openingCards) } } : {};
        return Object.assign({}, doc, opening, { state: next, revision: (doc.revision || 0) + 1,
          ownerMode: this.mode, ownerModeClient: this.client, ownerResumeGroup: this.mode === 'private' ? this.resumeGroup : '',
          ownerBrowserGroup: this.mode === 'private' ? this.browserGroup : '', ownerBrowserGroupClient: this.client,
          ownerVisible: this.foreground(), ownerVisibilityClient: this.client, leaseUntil: now + LEASE_MS });
      }, undefined, false);
      if (!result.committed) throw new Error('not_available');
      return result.snapshot.val().state;
    }
    connect() {
      super.connect();
      this.revealTimer = setInterval(() => this.tickReveal(), 200);
    }
    tickReveal() {
      const state = this.doc?.state;
      if (!state || state.phase !== 'REVEALING' || state.paused || !this.liveOwner() || this.suspended) return Promise.resolve(null);
      const deadline = state.revealStage === 'answer' ? state.revealPopularAt : state.revealAnswerAt;
      if (this.now() < deadline) return Promise.resolve(null);
      if (this.revealAdvancing) return this.revealAdvancing;
      this.revealAdvancing = this.command('advanceReveal').catch(error => {
        if (!['stale_turn', 'stale_session', 'paused', 'reveal_not_ready', 'not_available', 'offline'].includes(error.message)) this.status('error');
        return null;
      }).finally(() => { this.revealAdvancing = null; });
      return this.revealAdvancing;
    }
    close() { clearInterval(this.revealTimer); this.pendingProjections.clear(); super.close(); }
    captureOpeningCards() {
      this.openingCards = {};
      for (let n = 1; n <= this.room.count; n++) this.openingCards[n] = clone(this.room.answers[n]);
    }
    start({ hostPlayerNum = 1, targetScore = 30 } = {}) {
      return this.enqueue(async () => {
        if (!Number.isInteger(this.room.count) || this.room.count < 3 || this.room.count > 8) throw new Error('player_count');
        const id = uid(), randomSeed = seed(), now = this.now();
        const roster = Array.from({ length: this.room.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        const hostSeat = roster.some(p => p.playerNum === Number(hostPlayerNum)) ? Number(hostPlayerNum) : 1;
        this.captureOpeningCards();
        this.initialSession = id; this.suspended = false; this.seenCards.clear();
        try {
          return await this.change(() => DIXIT_ENGINE.create({ id, roster, seed: randomSeed, now, hostPlayerNum: hostSeat, targetScore }));
        } catch (error) {
          this.initialSession = null; this.openingCards = null; throw error;
        }
      });
    }
    command(type, extra = {}) {
      const state = this.doc?.state;
      if (!state || this.suspended || this.stopped) return Promise.reject(new Error('not_available'));
      // Capture randomness and time once, outside Firebase's retry callback.
      const id = typeof extra.id === 'string' && extra.id && extra.id.length <= 100 ? extra.id : uid();
      const command = Object.assign({}, extra, { id, type, actor: 0,
        sessionId: extra.sessionId == null ? state.sessionId : extra.sessionId,
        turnId: extra.turnId == null ? state.turnId : extra.turnId, now: this.now(), seed: seed() });
      return this.enqueue(async () => {
        if (this.suspended) throw new Error('not_available');
        if (this.doc?.state?.sessionId === command.sessionId && DIXIT_ENGINE.list(this.doc.state.seen?.[0]).includes(command.id)) {
          const reply = this.doc.state.replies?.[0];
          if (reply?.id === command.id && reply.error) throw new Error(reply.error);
          return this.doc.state;
        }
        if (type === 'restart') {
          this.captureOpeningCards();
          this.restartingSession = command.sessionId;
        }
        try {
          const next = await this.change(current => DIXIT_ENGINE.apply(current, command));
          const error = next.replies?.[0]?.error;
          if (error) throw new Error(error);
          return next;
        } finally { this.restartingSession = null; }
      });
    }
    receive(playerNum, data) {
      const state = this.doc?.state;
      if (!state || !this.liveOwner() || this.suspended) return;
      if (!Number.isInteger(playerNum) || !DIXIT_ENGINE.list(state.roster).some(p => p.playerNum === playerNum)) return;
      const ours = data?.game === 'dixit' && data.dixit?.version === 1 && data.dixit.sessionId === state.sessionId;
      if (!ours) {
        if (this.seenCards.has(playerNum) && !this.initialSession) {
          this.suspended = true; this.status('switched');
        }
        return;
      }
      this.seenCards.add(playerNum);
      const action = data.dixitAction;
      if (!action || typeof action.id !== 'string' || !action.id || action.id.length > 100 || action.sessionId !== state.sessionId) return;
      if (DIXIT_ENGINE.list(state.seen?.[playerNum]).includes(action.id)) return;
      const key = playerNum + ':' + action.id;
      if (this.incoming.has(key)) return;
      this.incoming.add(key);
      const command = Object.assign({}, action, { actor: playerNum, now: this.now(), seed: seed() });
      this.enqueue(async () => {
        if (this.suspended || !this.liveOwner()) return null;
        const restarting = command.type === 'restart' && playerNum === (this.doc?.state?.hostPlayerNum || 1);
        if (restarting) { this.captureOpeningCards(); this.restartingSession = command.sessionId; }
        try { return await this.change(current => DIXIT_ENGINE.apply(current, command)); }
        finally { if (restarting) this.restartingSession = null; }
      })
        .catch(error => { if (error.message !== 'not_available') this.status('error'); })
        .finally(() => this.incoming.delete(key));
    }
    project() {
      const doc = this.doc;
      if (!doc?.state || !this.liveOwner() || this.suspended) return;
      this.tickReveal();
      if (this.restartingSession && doc.state.sessionId !== this.restartingSession) {
        this.initialSession = doc.state.sessionId; this.seenCards.clear(); this.projectedSeats.clear();
      }
      // Each private seat has one in-flight write and one latest snapshot.
      // A slow seat never holds the other players' heartbeat or an action.
      for (const player of DIXIT_ENGINE.list(doc.state.roster)) {
        const seat = player.playerNum;
        this.pendingProjections.set(seat, { doc, initial: this.initialSession === doc.state.sessionId, openingCards: this.openingCards });
        if (this.projectionTasks.has(seat)) continue;
        const task = (async () => {
          while (this.pendingProjections.has(seat)) {
            const next = this.pendingProjections.get(seat); this.pendingProjections.delete(seat);
            await this.projectSeat(seat, next);
          }
        })().catch(() => { if (this.liveOwner() && !this.suspended) this.status('error'); }).finally(() => {
          this.projectionTasks.delete(seat);
          if (this.pendingProjections.has(seat)) this.project();
        });
        this.projectionTasks.set(seat, task);
      }
      this.outgoing = Promise.all([...this.projectionTasks.values()]).then(() => {});
    }
    currentProjection(doc) {
      return this.liveOwner() && !this.suspended && this.doc?.state?.sessionId === doc.state.sessionId
        && this.doc.revision === doc.revision && this.doc.leaseUntil === doc.leaseUntil
        && (this.doc.leaseEpoch || 0) === (doc.leaseEpoch || 0);
    }
    async projectSeat(playerNum, { doc, initial, openingCards }) {
      if (!this.currentProjection(doc)) return;
      const ref = this.room.playerRef(playerNum - 1);
      if (!ref) return;
      const payload = DIXIT_ENGINE.view(doc.state, playerNum, this.now());
      payload.dixit.version = 1;
      payload.dixit.revision = doc.revision || 0;
      payload.dixit.hostLiveUntil = doc.leaseUntil;
      payload.dixit.hostEpoch = doc.leaseEpoch || 0;
      const result = await ref.transaction(old => {
        if (!this.currentProjection(doc)) return;
        const currentSession = old?.game === 'dixit' && old.dixit?.sessionId === doc.state.sessionId;
        if (!currentSession && (!initial || !same(old, openingCards?.[playerNum]))) return;
        if (currentSession && (old.dixit.hostEpoch || 0) > payload.dixit.hostEpoch) return;
        if (currentSession && old.dixit.revision > payload.dixit.revision) return;
        if (currentSession && old.dixit.revision === payload.dixit.revision && old.dixit.hostLiveUntil > payload.dixit.hostLiveUntil) return;
        // Every same-session projection preserves concurrent dixitAction.
        return currentSession ? Object.assign({}, old, payload) : payload;
      }, undefined, false);
      if (!result.committed && this.currentProjection(doc)) {
        const other = result.snapshot.val();
        const currentSession = other?.game === 'dixit' && other.dixit?.sessionId === doc.state.sessionId;
        if (!currentSession && (!initial || !same(other, openingCards?.[playerNum]))) {
          this.suspended = true; this.status('switched');
        }
      }
      if (initial && result.committed && this.currentProjection(doc)) {
        const key = [doc.state.sessionId, doc.revision, doc.leaseUntil, doc.leaseEpoch || 0].join(':');
        this.projectedSeats.set(playerNum, key);
        if (DIXIT_ENGINE.list(doc.state.roster).every(p => this.projectedSeats.get(p.playerNum) === key)) {
          this.initialSession = null; this.openingCards = null; this.projectedSeats.clear();
        }
      }
    }
  }
  return { Host, uid, leaseMs: LEASE_MS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DIXIT_SYNC;

