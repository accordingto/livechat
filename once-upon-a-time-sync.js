/* Once Upon a Time uses the Hub's existing private-token transport and host
 * lease. Only this game's adapter lives here; talk-sync.js remains unchanged.
 * Load talk-sync.js and once-upon-a-time-engine.js before this file.
 */
var ONCE_SYNC = (() => {
  'use strict';
  const uid = TALK_SYNC.uid;
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
  function gameIdentity(data) {
    if (data == null) return 'null';
    if (typeof data.game !== 'string') return JSON.stringify(data);
    const game = data.game, key = value => value == null ? null : value;
    // A heartbeat, receipt, vote or timer can change while the host opens
    // another game. Only the old game's own stable session/round identifies
    // a later selection; ROOM.update can retain other games' nested fields.
    switch (game) {
      case 'onceupon': return JSON.stringify([game, key(data.once?.sessionId)]);
      case 'dixit': return JSON.stringify([game, key(data.dixit?.sessionId)]);
      case 'letstalk': return JSON.stringify([game, key(data.talk?.sessionId)]);
      case 'chatwolf': return JSON.stringify([game, key(data.chatWolf?.room), key(data.chatWolf?.token)]);
      case 'taboo': case 'hottake': case 'sophies': case 'persuade':
        return JSON.stringify([game, key(data.round), key(data.voteId)]);
      case 'kangaroo': return JSON.stringify([game, key(data.case)]);
      case 'crack': return JSON.stringify([game, key(data.roundId)]);
      case 'buttoncheck': return JSON.stringify([game, key(data.id)]);
      case 'scene': case 'conquest': return JSON.stringify([game, key(data.round)]);
      case 'cardcheck': return JSON.stringify([game, key(data.word), key(data.emoji)]);
      default: return JSON.stringify(data);
    }
  }
  const sameGame = (a, b) => gameIdentity(a) === gameIdentity(b);
  function roomAdapter(room) {
    return new Proxy(room, {
      get(target, key) {
        if (key === 'getExtra') return name => target.getExtra(name === 'letsTalkControlToken' ? 'onceUponControlToken' : name);
        if (key === 'setExtra') return (name, value) => target.setExtra(name === 'letsTalkControlToken' ? 'onceUponControlToken' : name, value);
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
          const payload = ONCE_ENGINE.view(state, 0, host.now());
          payload.once.revision = host.doc?.revision || 0;
          payload.once.hostLiveUntil = host.doc?.leaseUntil || 0;
          onChange(payload);
        },
      });
      host = this;
      this.openingCards = null;
      this.restartingSession = null;
      this.cardSnapshots = {};
      this.cardsReady = false;
      this.hasHeldLease = false;
      this.valueHandler = snap => {
        this.doc = snap.val();
        this.own = this.connected && this.doc?.owner === this.client && this.doc.leaseUntil > this.now();
        if (this.own) this.hasHeldLease = true;
        // A persisted Once state is not the active table when every actual
        // player path belongs elsewhere. Opening the page never revives it.
        if (!this.initialSession && !this.restartingSession && this.inactiveSession(this.doc)) this.suspended = true;
        this.status(this.suspended ? 'switched' : this.own ? 'ready' : 'other_host');
        if (this.doc?.state) this.onChange(this.doc.state);
        if (this.own && !this.suspended && this.doc?.state) {
          this.project();
          Object.entries(this.cardSnapshots).forEach(([n, data]) => this.receive(Number(n), data));
        }
      };
    }
    async readCards(players = Array.from({ length: this.room.count }, (_, i) => ({ playerNum: i + 1 }))) {
      const snapshots = await Promise.all(players.map(async player => {
        const ref = this.room.playerRef(player.playerNum - 1);
        if (!ref) throw new Error('not_available');
        const snapshot = await ref.once('value');
        return [player.playerNum, clone(snapshot.val())];
      }));
      return Object.fromEntries(snapshots);
    }
    connect() {
      // Wait for real per-token values, rather than guessing from an empty
      // ROOM listener cache and claiming an inactive/active table too early.
      if (this.connecting || this.stopped) return this.connecting;
      this.connecting = this.readCards().then(cards => {
        if (this.stopped) return;
        this.cardSnapshots = { ...cards, ...this.cardSnapshots }; this.cardsReady = true;
        super.connect();
      }).catch(() => { if (!this.stopped) this.status('error'); });
      return this.connecting;
    }
    inactiveSession(doc) {
      const state = doc?.state, players = ONCE_ENGINE.list(state?.roster);
      if (!this.cardsReady || !state?.sessionId || players.length < 2 || players.length > 6) return false;
      if (Number.isInteger(this.room.count) && this.room.count >= 2 && this.room.count <= 6 && this.room.count !== players.length) return true;
      return players.every(player => {
        if (!Object.prototype.hasOwnProperty.call(this.cardSnapshots, player.playerNum)) return false;
        const data = this.cardSnapshots[player.playerNum];
        return !(data?.game === 'onceupon' && data.once?.sessionId === state.sessionId);
      });
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing) return;
      this.renewing = true;
      const now = this.now();
      try {
        const result = await this.ref.transaction(doc => {
          doc = doc || {};
          if (doc.owner && doc.owner !== this.client && doc.leaseUntil > now &&
              (this.hasHeldLease || !this.inactiveSession(doc))) return;
          return Object.assign({}, doc, { owner: this.client, leaseUntil: now + 14000 });
        }, undefined, false);
        if (result.committed) this.hasHeldLease = true;
        else { this.own = false; this.status(this.suspended ? 'switched' : 'other_host'); }
      } catch (error) { if (!this.stopped) this.status('error'); }
      finally { this.renewing = false; }
    }
    async captureOpeningCards(players) {
      this.openingCards = await this.readCards(players);
    }
    start() {
      return this.enqueue(async () => {
        await this.outgoing;
        if (!Number.isInteger(this.room.count) || this.room.count < 2 || this.room.count > 6) throw new Error('player_count');
        const id = uid(), randomSeed = seed(), now = this.now();
        const roster = Array.from({ length: this.room.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        await this.captureOpeningCards(roster);
        this.initialSession = id; this.suspended = false; this.seenCards.clear();
        try {
          return await this.change(() => ONCE_ENGINE.create({ id, roster, seed: randomSeed, now }));
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
        if (this.doc?.state?.sessionId === command.sessionId && ONCE_ENGINE.list(this.doc.state.seen?.[0]).includes(command.id)) {
          const reply = this.doc.state.replies?.[0];
          if (reply?.id === command.id && reply.error) throw new Error(reply.error);
          return this.doc.state;
        }
        if (type === 'restart') {
          await this.captureOpeningCards(ONCE_ENGINE.list(this.doc.state.roster));
          this.restartingSession = command.sessionId;
        }
        try {
          const next = await this.change(current => ONCE_ENGINE.apply(current, command));
          const error = next.replies?.[0]?.error;
          if (error) throw new Error(error);
          return next;
        } finally { this.restartingSession = null; }
      });
    }
    receive(playerNum, data) {
      if (Number.isInteger(playerNum) && playerNum > 0) this.cardSnapshots[playerNum] = clone(data);
      const state = this.doc?.state;
      if (!state || !this.own || this.suspended || this.stopped) return;
      if (!Number.isInteger(playerNum) || !ONCE_ENGINE.list(state.roster).some(p => p.playerNum === playerNum)) return;
      const ours = data?.game === 'onceupon' && data.once?.version === 1 && data.once.sessionId === state.sessionId;
      if (!ours) {
        if (this.seenCards.has(playerNum) && !this.initialSession) {
          this.suspended = true; this.status('switched');
        }
        return;
      }
      this.seenCards.add(playerNum);
      const action = data.onceAction;
      if (!action || typeof action.id !== 'string' || !action.id || action.id.length > 100 || action.sessionId !== state.sessionId) return;
      if (ONCE_ENGINE.list(state.seen?.[playerNum]).includes(action.id)) return;
      const key = playerNum + ':' + action.id;
      if (this.incoming.has(key)) return;
      this.incoming.add(key);
      const command = Object.assign({}, action, { actor: playerNum, now: this.now(), seed: seed() });
      this.enqueue(() => this.suspended || this.stopped ? null : this.change(current => ONCE_ENGINE.apply(current, command)))
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
        const openingCards = this.openingCards;
        let complete = true;
        // Project only the immutable session's seats, never an unexpected
        // changed Hub roster or a room-wide state/deck document.
        for (const player of ONCE_ENGINE.list(doc.state.roster)) {
          if (this.doc?.state?.sessionId !== doc.state.sessionId || this.suspended || !this.own || this.stopped) return;
          const playerNum = player.playerNum, ref = this.room.playerRef(playerNum - 1);
          if (!ref) { complete = false; continue; }
          const payload = ONCE_ENGINE.view(doc.state, playerNum, this.now());
          payload.once.version = 1;
          payload.once.revision = doc.revision || 0;
          payload.once.hostLiveUntil = doc.leaseUntil;
          const result = await ref.transaction(old => {
            if (!this.own || this.stopped || this.suspended || this.doc?.state?.sessionId !== doc.state.sessionId) return;
            const currentSession = old?.game === 'onceupon' && old.once?.sessionId === doc.state.sessionId;
            if (!currentSession && (!initial || !sameGame(old, openingCards?.[playerNum]))) return;
            if (currentSession && old.once.revision > payload.once.revision) return;
            if (currentSession && old.once.revision === payload.once.revision && old.once.hostLiveUntil > payload.once.hostLiveUntil) return;
            // Opening a session clears another game's/old session's mailbox.
            // Every same-session projection preserves concurrent onceAction.
            return currentSession ? Object.assign({}, old, payload) : payload;
          }, undefined, false);
          if (!result.committed) {
            complete = false;
            const other = result.snapshot.val();
            const currentSession = other?.game === 'onceupon' && other.once?.sessionId === doc.state.sessionId;
            if (!currentSession && (!initial || !sameGame(other, openingCards?.[playerNum]))) {
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
if (typeof module !== 'undefined' && module.exports) module.exports = ONCE_SYNC;
