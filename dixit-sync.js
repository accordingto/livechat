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
    constructor({ room, db, onChange = () => {}, onStatus = () => {} }) {
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
    }
    captureOpeningCards() {
      this.openingCards = {};
      for (let n = 1; n <= this.room.count; n++) this.openingCards[n] = clone(this.room.answers[n]);
    }
    start() {
      return this.enqueue(async () => {
        await this.outgoing;
        if (!Number.isInteger(this.room.count) || this.room.count < 3 || this.room.count > 8) throw new Error('player_count');
        const id = uid(), randomSeed = seed(), now = this.now();
        const roster = Array.from({ length: this.room.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        this.captureOpeningCards();
        this.initialSession = id; this.suspended = false; this.seenCards.clear();
        try {
          return await this.change(() => DIXIT_ENGINE.create({ id, roster, seed: randomSeed, now }));
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
        await this.outgoing;
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
      if (!state || !this.own || this.suspended || this.stopped) return;
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
      this.enqueue(() => this.suspended || this.stopped ? null : this.change(current => DIXIT_ENGINE.apply(current, command)))
        .catch(error => { if (error.message !== 'not_available') this.status('error'); })
        .finally(() => this.incoming.delete(key));
    }
    project() {
      const doc = this.doc;
      if (!doc?.state) return;
      if (this.restartingSession && doc.state.sessionId !== this.restartingSession) {
        this.initialSession = doc.state.sessionId; this.seenCards.clear();
      }
      this.outgoing = this.outgoing.then(async () => {
        if (!this.own || this.suspended || this.stopped || this.doc?.state?.sessionId !== doc.state.sessionId) return;
        const initial = this.initialSession === doc.state.sessionId;
        let complete = true;
        // Project only the immutable session's seats, never an unexpected
        // changed Hub roster or a room-wide state/deck document.
        for (const player of DIXIT_ENGINE.list(doc.state.roster)) {
          if (this.doc?.state?.sessionId !== doc.state.sessionId || this.suspended || !this.own || this.stopped) return;
          const playerNum = player.playerNum, ref = this.room.playerRef(playerNum - 1);
          if (!ref) { complete = false; continue; }
          const payload = DIXIT_ENGINE.view(doc.state, playerNum, this.now());
          payload.dixit.version = 1;
          payload.dixit.revision = doc.revision || 0;
          payload.dixit.hostLiveUntil = doc.leaseUntil;
          const result = await ref.transaction(old => {
            if (!this.own || this.stopped || this.suspended || this.doc?.state?.sessionId !== doc.state.sessionId) return;
            const currentSession = old?.game === 'dixit' && old.dixit?.sessionId === doc.state.sessionId;
            if (!currentSession && (!initial || !same(old, this.openingCards?.[playerNum]))) return;
            if (currentSession && old.dixit.revision > payload.dixit.revision) return;
            if (currentSession && old.dixit.revision === payload.dixit.revision && old.dixit.hostLiveUntil > payload.dixit.hostLiveUntil) return;
            // Opening a session clears another game's/old session's mailbox.
            // Every same-session projection preserves concurrent dixitAction.
            return currentSession ? Object.assign({}, old, payload) : payload;
          }, undefined, false);
          if (!result.committed) {
            complete = false;
            const other = result.snapshot.val();
            const currentSession = other?.game === 'dixit' && other.dixit?.sessionId === doc.state.sessionId;
            if (!currentSession && (!initial || !same(other, this.openingCards?.[playerNum]))) {
              this.suspended = true; this.status('switched'); break;
            }
          }
        }
        if (initial && complete) { this.initialSession = null; this.openingCards = null; }
      }).catch(() => this.status('error'));
    }
  }
  return { Host, uid };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DIXIT_SYNC;

