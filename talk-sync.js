/* Host-side transport. A private random token uses the existing per-token
 * Firebase rules. It contains the canonical state and a short host lease;
 * its token is stored only with the host's local room session, never in cards
 * or the public roster. This preserves the site's bearer-link trust model.
 */
var TALK_SYNC = (() => {
  'use strict';
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  class Host {
    constructor({ room, db, onChange, onStatus }) {
      this.room = room; this.db = db; this.onChange = onChange; this.onStatus = onStatus;
      this.client = uid(); this.offset = 0; this.connected = false; this.own = false;
      this.doc = null; this.stopped = false; this.suspended = false;
      this.serial = Promise.resolve(); this.outgoing = Promise.resolve(); this.seenCards = new Set();
      this.incoming = new Set(); this.initialSession = null;
      let token = room.getExtra('letsTalkControlToken');
      if (!/^[a-f0-9]{32}$/.test(token || '')) { token = uid(); room.setExtra('letsTalkControlToken', token); }
      this.ref = db.ref(`rooms/${room.code}/players/${token}`);
      this.offsetRef = db.ref('.info/serverTimeOffset');
      this.connectedRef = db.ref('.info/connected');
      this.offsetHandler = snap => { this.offset = Number(snap.val()) || 0; };
      this.connectedHandler = snap => {
        this.connected = snap.val() === true;
        if (this.connected) this.renew();
        else { this.own = false; this.status('offline'); }
      };
      this.valueHandler = snap => {
        this.doc = snap.val();
        this.own = this.connected && this.doc?.owner === this.client && this.doc.leaseUntil > this.now();
        this.status(this.suspended ? 'switched' : this.own ? 'ready' : 'other_host');
        if (this.doc?.state) this.onChange(this.doc.state);
        if (this.own && !this.suspended && this.doc?.state) {
          this.project();
          Object.entries(this.room.answers).forEach(([n, data]) => this.receive(Number(n), data));
        }
      };
    }
    now() { return Date.now() + this.offset; }
    status(value) { this.onStatus(value); }
    connect() {
      this.offsetRef.on('value', this.offsetHandler);
      this.ref.on('value', this.valueHandler, () => this.status('error'));
      this.connectedRef.on('value', this.connectedHandler);
      this.timer = setInterval(() => this.renew(), 4000);
    }
    async renew() {
      if (!this.connected || this.stopped || this.renewing) return;
      this.renewing = true;
      const now = this.now();
      try {
        const result = await this.ref.transaction(doc => {
          doc = doc || {};
          if (doc.owner && doc.owner !== this.client && doc.leaseUntil > now) return;
          return Object.assign({}, doc, { owner: this.client, leaseUntil: now + 14000 });
        }, undefined, false);
        if (!result.committed) { this.own = false; this.status('other_host'); }
      } catch (e) { this.status('error'); }
      finally { this.renewing = false; }
    }
    enqueue(fn) {
      const result = this.serial.then(fn);
      this.serial = result.catch(() => {});
      return result;
    }
    async change(fn) {
      if (!this.connected || this.stopped) throw new Error('offline');
      const now = this.now();
      const result = await this.ref.transaction(doc => {
        if (!doc || doc.owner !== this.client || doc.leaseUntil <= now) return;
        const next = fn(doc.state || null);
        if (!next || next === doc.state) return;
        return Object.assign({}, doc, { state: next, revision: (doc.revision || 0) + 1, leaseUntil: now + 14000 });
      }, undefined, false);
      if (!result.committed) throw new Error('not_available');
      return result.snapshot.val().state;
    }
    start({ topic, mode, seconds, showStarters }) {
      return this.enqueue(async () => {
        await this.outgoing;
        const id = uid(); this.initialSession = id; this.suspended = false; this.seenCards.clear();
        try {
          return await this.change(() => TALK_ENGINE.create({ id, topic, mode, seconds, showStarters, now: this.now(),
            roster: Array.from({ length: this.room.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) })) }));
        } catch (e) { this.initialSession = null; throw e; }
      });
    }
    command(type, extra = {}) {
      const state = this.doc?.state;
      if (!state || this.suspended) return Promise.reject(new Error('not_available'));
      const command = Object.assign({}, extra, { id: uid(), type, actor: 0, sessionId: state.sessionId,
        turnId: state.turnId, now: this.now(), seed: crypto.getRandomValues(new Uint32Array(1))[0] });
      return this.enqueue(async () => {
        const s = await this.change(current => TALK_ENGINE.apply(current, command));
        const error = s.replies?.[0]?.error;
        if (error) throw new Error(error);
        return s;
      });
    }
    receive(playerNum, data) {
      const state = this.doc?.state;
      if (!state || !this.own || this.suspended) return;
      const ours = data?.game === 'letstalk' && data.talk?.sessionId === state.sessionId;
      if (!ours) {
        if (this.seenCards.has(playerNum) && !this.initialSession) {
          this.suspended = true; this.status('switched');
        }
        return;
      }
      this.seenCards.add(playerNum);
      const a = data.talkAction;
      if (!a || typeof a.id !== 'string' || a.id.length > 100 || a.sessionId !== state.sessionId) return;
      if (TALK_ENGINE.list(state.seen?.[playerNum]).includes(a.id)) return;
      const key = playerNum + ':' + a.id;
      if (this.incoming.has(key)) return;
      this.incoming.add(key);
      const command = Object.assign({}, a, { actor: playerNum, now: this.now(), seed: crypto.getRandomValues(new Uint32Array(1))[0] });
      this.enqueue(() => this.suspended ? null : this.change(current => TALK_ENGINE.apply(current, command)))
        .catch(e => { if (e.message !== 'not_available') this.status('error'); })
        .finally(() => this.incoming.delete(key));
    }
    project() {
      const doc = this.doc;
      this.outgoing = this.outgoing.then(async () => {
        if (!this.own || this.suspended || this.stopped || this.doc?.state?.sessionId !== doc.state.sessionId) return;
        const initial = this.initialSession === doc.state.sessionId;
        let complete = true;
        for (let i = 0; i < this.room.count; i++) {
          if (this.doc?.state?.sessionId !== doc.state.sessionId || this.suspended || !this.own || this.stopped) return;
          const ref = this.room.playerRef(i);
          if (!ref) { complete = false; continue; }
          const payload = TALK_ENGINE.view(doc.state, i + 1, this.now());
          payload.talk.revision = doc.revision || 0;
          payload.talk.hostLiveUntil = doc.leaseUntil;
          const result = await ref.transaction(old => {
            if (!this.own || this.stopped || this.suspended || this.doc?.state?.sessionId !== doc.state.sessionId) return;
            if (!initial && (old?.game !== 'letstalk' || old.talk?.sessionId !== doc.state.sessionId)) return;
            if (old?.talk?.sessionId === doc.state.sessionId && old.talk.revision > payload.talk.revision) return;
            if (old?.talk?.sessionId === doc.state.sessionId && old.talk.revision === payload.talk.revision
                && old.talk.hostLiveUntil > payload.talk.hostLiveUntil) return;
            // A retry of the opening projection must also preserve a request
            // already submitted by a player who received the topic earlier.
            return initial && old?.talk?.sessionId !== doc.state.sessionId ? payload : Object.assign({}, old, payload);
          }, undefined, false);
          if (!result.committed) {
            complete = false;
            const other = result.snapshot.val();
            if (!initial && (other?.game !== 'letstalk' || other.talk?.sessionId !== doc.state.sessionId)) {
              this.suspended = true; this.status('switched'); break;
            }
          }
        }
        if (initial && complete) this.initialSession = null;
      }).catch(() => this.status('error'));
    }
    close() {
      this.stopped = true; clearInterval(this.timer);
      this.offsetRef.off('value', this.offsetHandler); this.connectedRef.off('value', this.connectedHandler);
      this.ref.off('value', this.valueHandler);
      // An old tab must never remove a newer tab's lease.
      if (this.connected) this.ref.transaction(doc => doc?.owner === this.client
        ? Object.assign({}, doc, { leaseUntil: 0 }) : undefined, undefined, false).catch(() => {});
    }
  }
  return { Host, uid };
})();
