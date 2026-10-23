/* CARD_TABLE — the card-run table shared by WORD LIMIT THEATER and ROOM SURVEY.
 * Same model as WHO KNOWS? (who-knows-sync.js), made reusable:
 *
 * The canonical state lives in one table node, rooms/{code}/players/{table}/stateJson.
 * The host page starts a game by pointing each original player link at it:
 *   rooms/{code}/players/{playerToken} = { game, playerNum, name, [key]: { version: 1, table } }
 * Every card then subscribes to the table, renders ENGINE.view() for its own
 * seat and applies its own commands with one compare-and-set transaction, so
 * two taps can never both win and no page has to relay them. No page has to
 * stay open: deadlines are absolute server-corrected times, and whoever is
 * connected ticks an expired clock (host page first if open, then the
 * lowest-numbered visible card, the rest a little later). A tick is just
 * another fenced command, so extra ticks are harmless no-ops.
 *
 * Trade-off (no server): every card can reach the table node. Screens never
 * show another player's secret, but someone using developer tools could read
 * it. Player tokens are never shared, so other games keep their privacy.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CARD_TABLE = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const CONFIG = Object.freeze({ tickMs: 250, tickBaseMs: 150, tickGapMs: 900, retryMs: 1500 });
  const uid = () => Array.from(root.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const shortId = () => uid().slice(0, 16);
  const seed = () => root.crypto.getRandomValues(new Uint32Array(1))[0];
  const seen = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const parse = raw => { if (typeof raw !== 'string') return null; try { return JSON.parse(raw); } catch (_) { return null; } };
  const isTable = token => /^[a-f0-9]{32}$/.test(token || '');

  // game: Firebase `game` value ('wordlimit'); key: pointer/view field ('wl');
  // engine: () => the rules module; extra: the room-session key that keeps the
  // table token; fields: command fields that may reach the rules.
  function define({ game, key, engine, extra, fields }) {
    const ENGINE = typeof engine === 'function' ? engine : () => engine;
    const FIELDS = Object.freeze(seen(fields));
    const pointsAt = (value, token) => value?.game === game && value[key]?.version === 1 && value[key].table === token;
    const pointerTable = value => value?.game === game && value[key]?.version === 1 && isTable(value[key].table) ? value[key].table : null;

    class Table {
      constructor({ db, code, token, actor = 0, onChange = () => {}, onStatus = () => {}, onPresence = () => {} }) {
        this.db = db; this.code = code; this.actor = Number(actor) || 0;
        this.onChange = onChange; this.onStatus = onStatus; this.onPresence = onPresence;
        this.client = shortId(); this.offset = 0; this.connected = false; this.stopped = false; this.started = false;
        this.visible = true; this.loaded = false; this.raw = null; this.state = null; this.presence = {};
        this.ticking = false; this.failedStage = null; this.retryAt = 0;
        this.offsetRef = db.ref('.info/serverTimeOffset'); this.connectedRef = db.ref('.info/connected');
        this.offsetHandler = snapshot => { if (!this.stopped) this.offset = Number(snapshot.val()) || 0; };
        this.connectedHandler = snapshot => {
          if (this.stopped) return;
          this.connected = snapshot.val() === true;
          if (this.connected) this.announce();
          this.updateStatus();
        };
        this.stateHandler = snapshot => this.receive(snapshot.val());
        this.presenceHandler = snapshot => {
          if (this.stopped) return;
          const value = snapshot.val();
          this.presence = value && typeof value === 'object' ? value : {};
          this.onPresence(this.presence);
        };
        this.target(token);
      }
      target(token) {
        this.token = token;
        const base = `rooms/${this.code}/players/${token}`;
        this.stateRef = this.db.ref(base + '/stateJson');
        this.presenceRef = this.db.ref(base + '/presence');
        this.mineRef = this.db.ref(`${base}/presence/${this.client}`);
      }
      now() { return Math.round(Date.now() + this.offset); }
      status(value) { if (this.lastStatus !== value) { this.lastStatus = value; this.onStatus(value); } }
      computeStatus() { return !this.connected ? 'offline' : !this.loaded ? 'connecting' : 'ready'; }
      updateStatus() { if (!this.stopped) this.status(this.computeStatus()); }
      connect() {
        if (this.started || this.stopped) return; this.started = true;
        this.offsetRef.on('value', this.offsetHandler);
        this.listen();
        this.connectedRef.on('value', this.connectedHandler);
        this.tickTimer = root.setInterval(() => this.pulse(), CONFIG.tickMs);
      }
      listen() {
        this.stateRef.on('value', this.stateHandler, () => this.status('error'));
        this.presenceRef.on('value', this.presenceHandler, () => {});
      }
      // Switch to another table node (the host page adopting the table its
      // player links already point at).
      retarget(token) {
        if (this.stopped || token === this.token) return;
        this.stateRef.off('value', this.stateHandler); this.presenceRef.off('value', this.presenceHandler);
        this.release(); this.target(token);
        this.loaded = false; this.raw = null; this.state = null; this.presence = {};
        this.listen(); this.announce(); this.updateStatus();
      }
      receive(raw) {
        if (this.stopped) return;
        const first = !this.loaded; this.loaded = true;
        if (!first && (raw ?? null) === this.raw) return;
        this.raw = raw ?? null; this.state = parse(raw);
        this.updateStatus();
        this.onChange(this.state);
      }
      // A phone coming back from the background reads the table once instead of
      // trusting a socket that may have been suspended.
      refresh() {
        if (this.stopped) return Promise.resolve();
        return Promise.resolve(this.stateRef.once('value')).then(snapshot => this.receive(snapshot.val())).catch(() => {});
      }
      // Presence only ranks who ticks first and shows who is online; it is never
      // needed for correctness.
      announce() {
        if (this.stopped || !this.connected) return;
        try { this.mineRef.onDisconnect?.().remove(); } catch (_) {}
        Promise.resolve(this.mineRef.set({ actor: this.actor, visible: this.visible, at: this.now() })).catch(() => {});
      }
      release() {
        try { this.mineRef.onDisconnect?.().cancel?.(); } catch (_) {}
        try { Promise.resolve(this.mineRef.remove?.()).catch(() => {}); } catch (_) {}
      }
      setVisible(visible) {
        visible = visible !== false;
        if (this.visible === visible) return;
        this.visible = visible; this.announce();
        if (visible) this.refresh();
      }
      online() {
        return [...new Set(Object.values(this.presence || {}).map(entry => Number(entry?.actor)).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
      }
      rank() {
        const peers = Object.entries(this.presence || {}).filter(([, entry]) => entry && entry.visible !== false)
          .map(([id, entry]) => ({ id, actor: Number(entry.actor) || 0 }))
          .sort((a, b) => a.actor - b.actor || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const index = peers.findIndex(peer => peer.id === this.client);
        return index < 0 ? peers.length : index;
      }
      // The seat's own projection plus who is online right now.
      view() {
        if (!this.state) return null;
        const view = ENGINE().view(this.state, this.actor);
        view[key].online = this.online();
        return view;
      }
      command(type, extra = {}) {
        const state = this.state;
        if (this.stopped || !state) return Promise.reject(new Error('not_available'));
        if (!this.connected) return Promise.reject(new Error('offline'));
        const input = {};
        for (const field of FIELDS) if (extra[field] !== undefined) input[field] = extra[field];
        Object.assign(input, {
          id: typeof extra.id === 'string' && extra.id.length >= 8 && extra.id.length <= 100 ? extra.id.slice(0, 32) : shortId(),
          type: String(type), actor: this.actor,
          sessionId: typeof extra.sessionId === 'string' ? extra.sessionId : state.sessionId,
          stage: Number.isInteger(extra.stage) ? extra.stage : state.stage, now: this.now(), seed: seed(),
        });
        let failure = null;
        return Promise.resolve(this.stateRef.transaction(raw => {
          failure = null;
          if (this.stopped) { failure = 'not_available'; return; }
          // An empty first guess from the cache: return it unchanged so the
          // server compares against the real value and retries with it.
          if (raw == null) return null;
          const current = parse(raw);
          if (!current) { failure = 'error'; return; }
          const next = ENGINE().apply(current, input);
          if (next === current) { failure = type === 'tick' ? 'idle' : 'not_available'; return; }
          const reply = next.replies?.[this.actor];
          if (reply?.id === input.id && reply.error) { failure = reply.error; return; }
          return JSON.stringify(next);
        }, undefined, false)).then(result => {
          const value = result?.snapshot?.val?.();
          if (!result?.committed || typeof value !== 'string') throw new Error(failure || 'not_available');
          this.receive(value);
          return parse(value);
        });
      }
      // Watch every deadline; nobody writes until one has passed.
      pulse() {
        if (this.stopped || !this.connected || this.ticking) return;
        const state = this.state;
        if (!(state?.deadline > 0) || ['paused', 'result', 'finished'].includes(state.phase)) return;
        const now = this.now();
        if (now - state.deadline < CONFIG.tickBaseMs + this.rank() * CONFIG.tickGapMs) return;
        if (this.failedStage === state.stage && this.failedDeadline === state.deadline && now < this.retryAt) return;
        this.ticking = true;
        const stage = state.stage, deadline = state.deadline;
        this.command('tick', { stage }).catch(error => {
          if (error.message !== 'idle') { this.failedStage = stage; this.failedDeadline = deadline; this.retryAt = this.now() + CONFIG.retryMs; }
        }).finally(() => { this.ticking = false; });
      }
      close() {
        if (this.stopped) return;
        this.release();
        this.stopped = true;
        root.clearInterval(this.tickTimer);
        this.offsetRef.off('value', this.offsetHandler); this.connectedRef.off('value', this.connectedHandler);
        this.stateRef.off('value', this.stateHandler); this.presenceRef.off('value', this.presenceHandler);
      }
    }

    // The host page: a table client (actor 0) that also knows the room's player
    // links, so it can start a game, point every link at the table, follow Hub
    // renames and notice when the room moved on. It is optional once started.
    class HostTable extends Table {
      constructor({ room, db, onChange = () => {}, onStatus = () => {}, onPresence = () => {} }) {
        let token = room.getExtra(extra);
        if (!isTable(token)) { token = uid(); room.setExtra(extra, token); }
        super({ db, code: room.code, token, actor: 0, onChange, onStatus, onPresence });
        this.room = room; this.count = room.count; this.cardValues = new Map(); this.cardsLoaded = false; this.adopted = false;
        this.playerRefs = Array.from({ length: this.count }, (_, i) => room.playerRef(i));
        this.cardListeners = [];
        const shown = this.onChange;
        this.onChange = state => { shown(state); this.afterChange(); };
      }
      connect() {
        if (this.started || this.stopped) return;
        super.connect();
        this.cardsReady = Promise.all(this.playerRefs.map((ref, i) => new Promise(resolve => {
          if (!ref) { resolve(); return; }
          const handler = snapshot => {
            if (this.stopped) return;
            this.cardValues.set(i + 1, snapshot.val()); resolve();
            if (this.cardsLoaded) { this.updateStatus(); this.afterChange(); }
          };
          ref.on('value', handler, () => { resolve(); this.status('error'); });
          this.cardListeners.push({ ref, handler });
        }))).then(() => { this.cardsLoaded = true; this.adopt(); this.updateStatus(); this.afterChange(); });
      }
      pointer(i) { return { game, playerNum: i + 1, name: String(this.room.name(i) || ''), [key]: { version: 1, table: this.token } }; }
      // A saved game for a different number of seats is never shown on this
      // room's links; the host starts a fresh game instead.
      get rosterChanged() {
        const roster = this.state?.roster; if (!roster) return false;
        const seats = seen(roster);
        return seats.length !== this.count || seats.some((player, i) => player?.playerNum !== i + 1);
      }
      // Some original link now shows another game (or nothing).
      get switched() {
        if (!this.state || !this.cardsLoaded) return false;
        return this.playerRefs.some((ref, i) => ref && !pointsAt(this.cardValues.get(i + 1), this.token));
      }
      get sameRoom() { return this.room.code === this.code && this.room.count === this.count; }
      computeStatus() {
        const base = super.computeStatus();
        if (base !== 'ready') return base;
        if (!this.sameRoom) return 'switched';
        if (this.rosterChanged) return 'rosterChanged';
        if (!this.cardsLoaded) return 'connecting';
        return this.switched ? 'switched' : 'ready';
      }
      // Opened on another computer (or after the room session lost its saved
      // token): follow the table the player links already point at.
      adopt() {
        if (this.adopted || this.stopped) return; this.adopted = true;
        const counts = new Map();
        for (const value of this.cardValues.values()) { const table = pointerTable(value); if (table) counts.set(table, (counts.get(table) || 0) + 1); }
        if (!counts.size || counts.has(this.token)) return;
        const token = [...counts].sort((a, b) => b[1] - a[1])[0][0];
        this.room.setExtra(extra, token);
        this.retarget(token);
      }
      afterChange() {
        if (this.stopped || !this.state || !this.cardsLoaded || !this.connected || this.rosterChanged || !this.sameRoom) return;
        if (this.lastStatus === 'ready') this.syncNames();
      }
      // Names edited in the Hub follow into the running game (same seats and
      // scores). Blank Hub names keep whatever the game already shows.
      syncNames() {
        const state = this.state; if (!state || this.renaming) return;
        const raw = i => String((Array.isArray(this.room.names) ? this.room.names[i] : this.room.name(i)) ?? '').trim().slice(0, 80);
        const names = Array.from({ length: this.count }, (_, i) => ({ playerNum: i + 1, name: raw(i) })).filter(entry => entry.name);
        const seats = seen(state.roster);
        if (names.every(entry => seats.find(player => player?.playerNum === entry.playerNum)?.name === entry.name)) return;
        this.renaming = true;
        this.command('rename', { names }).catch(() => {}).finally(() => { this.renaming = false; });
      }
      command(type, extraFields = {}) {
        if (this.rosterChanged || !this.sameRoom) return Promise.reject(new Error('not_available'));
        return super.command(type, extraFields);
      }
      // While the room shows another game, this page leaves the clock alone.
      pulse() { if (this.lastStatus === 'ready') super.pulse(); }
      // Start = a new game for this Hub room on every original link. Scores
      // reset; what the table already used (scenes, prompts) carries over.
      async start({ settings } = {}) {
        if (this.stopped || !this.connected || !this.sameRoom) throw new Error('offline');
        await this.cardsReady;
        const id = uid(), now = this.now(), randomSeed = seed();
        const roster = Array.from({ length: this.count }, (_, i) => ({ playerNum: i + 1, name: this.room.name(i) }));
        let failure = null;
        const result = await this.stateRef.transaction(raw => {
          failure = null;
          const current = parse(raw);
          try { return JSON.stringify(ENGINE().create({ id, roster, now, seed: randomSeed, settings: settings ?? current?.settings, previous: current })); }
          catch (error) { failure = error.message; return; }
        }, undefined, false);
        if (!result?.committed || typeof result.snapshot.val() !== 'string') throw new Error(failure || 'not_available');
        this.receive(result.snapshot.val());
        await this.point();
        return this.state;
      }
      // Point every original link at this table (Start, or bringing the cards
      // back to the running game after another game borrowed them).
      async point() {
        if (this.stopped || !this.connected || !this.sameRoom) throw new Error('offline');
        await Promise.all(this.playerRefs.map((ref, i) => ref ? Promise.resolve(ref.set(this.pointer(i))) : null));
        this.playerRefs.forEach((ref, i) => { if (ref) this.cardValues.set(i + 1, this.pointer(i)); });
        this.updateStatus();
      }
      close() {
        if (this.stopped) return;
        super.close();
        this.cardListeners.forEach(({ ref, handler }) => ref.off('value', handler)); this.cardListeners = [];
      }
    }
    return { Table, HostTable, pointsAt, pointerTable, game, key, extra };
  }
  return { define, CONFIG, uid, isTable };
});
