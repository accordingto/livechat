/* Same bearer-path Firebase model as room.js. The host browser is trusted.
 * No Admin SDK, server credential, custom Rules or server function is required.
 * Canonical state lives at an unguessable host-only path, never in the roster.
 * RSA protects joiners' card tokens from other readers of the public lobby.
 */
(function (root) {
  'use strict';
  const E = typeof module === 'object' && module.exports ? require('./chat-wolf-engine.js') : root.CHAT_WOLF_ENGINE;
  const Cards = typeof module === 'object' && module.exports ? require('./chat-wolf-cards.js') : root.CHAT_WOLF_CARDS;
  const History = typeof module === 'object' && module.exports ? require('./chat-wolf-history.js') : root.CHAT_WOLF_HISTORY;
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const validToken = token => /^[a-f0-9]{64}$/.test(token || '');
  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function codeOf(value) {
    const code = String(value || '').trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail('INVALID_ROOM_CODE');
    return code;
  }
  function stamp(room) {
    if (room.rulesVersion >= 3) return [room.matchId || '', room.phaseVersion || 0, room.phase, room.round || 0,
      room.phase === 'VOTING' || room.phase === 'JUDGE_DECISION' ? room.voting?.id || '' : ''].join(':');
    const turn = room.currentRoundState;
    const meeting = room.meeting;
    return [room.gameNumber, room.phase, room.round || 0,
      ['TALK', 'FREE_TALK'].includes(room.phase) ? turn?.speakerIndex : room.phase === 'MEETING_DISCUSS' ? meeting?.speakerIndex : '',
      room.phase === 'VOTING' ? room.voting?.id || '' : ''].join(':');
  }
  function viewStamp(view) {
    const p = view.public;
    if (p.rulesVersion >= 3) return [p.matchId || '', p.phaseVersion || 0, p.phase, p.round || 0,
      p.phase === 'VOTING' || p.phase === 'JUDGE_DECISION' ? p.voting?.id || '' : ''].join(':');
    return [p.gameNumber, p.phase, p.talk?.round || p.transportRound || 0,
      ['TALK', 'FREE_TALK'].includes(p.phase) ? p.talk.speakerIndex : p.phase === 'MEETING_DISCUSS' ? p.meeting.speakerIndex : '',
      p.voting?.id || ''].join(':');
  }
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

  // Presentation safety, not hostile-host security. The trusted coordinator
  // still runs the rules. Its shareable UI consumes no private player fields.
  function presentationView(view) {
    if (view.public.rulesVersion < 3 || !view.private.isHost || view.public.phase === 'FINISHED') return view;
    const actions = view.private.actions || {};
    const publicActions = ['canStart','canSettings','canBeginTalk','canEndTalk','canExtendTalk','canEndClues','canEndMeeting','canEndVote',
      'canPause','canResume','canCancel','canRestart','canReplay','canFollowUp','canClearFollowUp',
      'canEndMeetingTurn','canSkipMeetingTurn','canSetMeetingTurnSeconds','canSnoozeTalkReminder'];
    return { public: view.public, private: {
      playerId: view.private.playerId, name: view.private.name, isHost: true, presentationOnly: true,
      role: null, profession: null, wolfTeam: null, tasks: null, villageTask: null, reward: null,
      myVoteSubmitted: false, judgeDecision: null, roleAcknowledged: false,
      talkReminder: view.private.talkReminder || null,
      contentRepeatException: !!view.private.contentRepeatException,
      actions: Object.fromEntries(publicActions.map(key => [key, !!actions[key]])),
    } };
  }

  class FirebaseREST {
    constructor(url, fetcher = fetch) { this.url = url.replace(/\/$/, ''); this.fetcher = fetcher; }
    async call(path, method = 'GET', value, etag) {
      const headers = { 'Content-Type': 'application/json' };
      if (method === 'GET') headers['X-Firebase-ETag'] = 'true';
      if (etag) headers['if-match'] = etag;
      let response;
      try {
        // Native browser fetch rejects a FirebaseREST instance as its receiver.
        // Call the function directly (Node fetch did not expose this difference).
        const fetcher = this.fetcher;
        response = await fetcher(`${this.url}/${path}.json`, {
          method, headers, cache: 'no-store', signal: AbortSignal.timeout(12000),
          ...(value === undefined ? {} : { body: JSON.stringify(value) }),
        });
      } catch (_) { fail('NETWORK'); }
      if (response.status === 412) return { conflict: true };
      if (!response.ok) fail(response.status === 401 || response.status === 403 ? 'DATABASE_ACCESS' : 'NETWORK');
      const version = response.headers.get('etag');
      // Never silently degrade a conditional update into an unconditional write.
      if (method === 'GET' && !version) fail('NETWORK');
      return { value: await response.json(), etag: version };
    }
    get(path) { return this.call(path); }
    put(path, value, etag) { return this.call(path, 'PUT', value, etag); }
  }

  class Client {
    constructor({ databaseURL, store, storage, clock = () => Date.now(), interval = 1500, allowHostRecovery = true, hostPresentation = false } = {}) {
      this.store = store || new FirebaseREST(databaseURL);
      this.storage = storage || root.localStorage;
      this.now = clock;
      this.interval = interval;
      this.allowHostRecovery = allowHostRecovery;
      this.hostPresentation = hostPresentation;
      this.owner = uid();
      this.host = null;
      this.lastView = null;
      this.running = null;
      this.stopped = false;
    }
    path(code, token) { return `rooms/chatwolf-${code}/players/${token}`; }
    lobby(code) { return `rooms/chatwolf-${code}/roster`; }
    hostKey(code) { return `chat-wolf-host-v2:${code}`; }
    sessionKey(code) { return `chat-wolf-legacy-session:${code}`; }
    historyToken() {
      const key = 'chat-wolf-history-scope-v1';
      let token = this.load(key);
      if (!validToken(token)) { token = uid(); this.save(key, token); }
      return token;
    }
    save(key, value) {
      try { this.storage.setItem(key, value); } catch (_) { fail('STORAGE_REQUIRED'); }
    }
    load(key) { try { return this.storage.getItem(key); } catch (_) { return null; } }
    async create(body) {
      const legacy = body.legacy ? Cards.normalize(body.legacy) : null;
      const hostSeat = Number(body.hostSeat);
      if (body.legacy && (!legacy || !Number.isInteger(hostSeat) || hostSeat < 0 || hostSeat >= legacy.playerCount ||
          body.settings.playerCount !== legacy.playerCount)) fail('INVALID_CARD_SETUP');
      const token = uid(), control = uid(), hostId = `p_${uid().slice(0, 24)}`;
      // Validate before writing any room data or generating the join key.
      E.createRoom({ code: 'ABCDEF', hostPlayerId: hostId, hostSessionHash: token,
        hostName: body.name, settings: body.settings, now: this.now(), seed: 1 });
      const keys = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072,
        publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
      const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
      const privateKey = await crypto.subtle.exportKey('jwk', keys.privateKey);
      for (let attempt = 0; attempt < 8; attempt++) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
        const ref = this.lobby(code), old = await this.store.get(ref);
        if (old.value) continue;
        const room = E.createRoom({ code, hostPlayerId: hostId, hostSessionHash: token, hostName: body.name,
          settings: body.settings, now: this.now(), seed: crypto.getRandomValues(new Uint32Array(1))[0] });
        if (room.rulesVersion >= 3) room.secureRandom = true;
        this.save(this.hostKey(code), JSON.stringify({ control, token }));
        this.save(this.sessionKey(code), token);
        const data = { room, privateKey, channels: { [token]: { playerId: hostId, seq: 0 } }, joins: {} };
        if (room.rulesVersion >= 3) data.historyScopeToken = this.historyToken();
        if (legacy) {
          room.players[hostId].name = legacy.names[hostSeat];
          data.legacyRoom = legacy.code;
          data.cardLinks = legacy.tokens.map((sourceToken, i) => {
            const cardToken = i === hostSeat ? token : uid();
            if (i !== hostSeat) {
              const playerId = `p_${uid().slice(0, 24)}`;
              E.addPlayer(room, { playerId, sessionHash: cardToken, name: legacy.names[i], now: this.now() });
              data.channels[cardToken] = { playerId, seq: 0 };
            }
            return { sourceToken, token: cardToken, name: legacy.names[i], playerNum: i + 1 };
          });
        }
        await this.store.put(this.path(code, control), { data: JSON.stringify(data), revision: 1,
          owner: this.owner, lastHostAt: this.now(), leaseUntil: this.now() + 10000 });
        const reserved = await this.store.put(ref, { version: 2, publicKey, createdAt: this.now() }, old.etag);
        if (reserved.conflict) continue;
        this.host = { code, control, token };
        await this.cycle();
        this.start();
        return { ok: true, token, state: await this.read(code, token) };
      }
      fail('ROOM_CODE_UNAVAILABLE');
    }
    async join(body) {
      const code = codeOf(body.room);
      const name = String(body.name || '').trim();
      if (!name || name.length > 24) fail('INVALID_NAME');
      const lobby = (await this.store.get(this.lobby(code))).value;
      if (!lobby || lobby.version !== 2 || !lobby.publicKey) fail('ROOM_NOT_FOUND');
      const pendingKey = `chat-wolf-join-v2:${code}`;
      let pending;
      try { pending = JSON.parse(this.load(pendingKey)); } catch (_) {}
      if (!pending || pending.name !== name) pending = { token: uid(), id: uid(), name };
      const { token, id } = pending;
      const existing = (await this.store.get(this.path(code, token))).value;
      if (existing?.view) {
        this.save(this.sessionKey(code), token);
        return { ok: true, token, state: this.accept(existing) };
      }
      if (existing?.error) {
        this.save(pendingKey, 'null');
        fail(existing.error);
      }
      const key = await crypto.subtle.importKey('jwk', lobby.publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
      const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key,
        new TextEncoder().encode(JSON.stringify({ token, name })));
      this.save(pendingKey, JSON.stringify(pending));
      await this.store.put(`${this.lobby(code)}/joins/${id}`, encode(cipher));
      const start = Date.now();
      while (Date.now() - start < 20000) {
        const card = (await this.store.get(this.path(code, token))).value;
        if (card?.error) { this.save(pendingKey, 'null'); fail(card.error); }
        if (card?.view) {
          this.save(this.sessionKey(code), token);
          this.save(pendingKey, 'null');
          return { ok: true, token, state: this.accept(card) };
        }
        await wait(400);
      }
      fail('HOST_UNAVAILABLE');
    }
    accept(card) {
      if (card.error) fail(card.error);
      if (!card.view) fail('HOST_UNAVAILABLE');
      const raw = JSON.parse(card.view);
      const view = this.hostPresentation ? presentationView(raw) : raw;
      // A slow earlier poll must not replace a newer state on this client.
      if (this.lastView?.public.code === view.public.code &&
          this.lastView.public.syncRevision > view.public.syncRevision) return this.lastView;
      this.lastView = view;
      return view;
    }
    async read(code, token) {
      code = codeOf(code);
      if (!validToken(token)) fail('INVALID_SESSION');
      if (!this.host && this.allowHostRecovery) {
        let saved;
        try { saved = JSON.parse(this.load(this.hostKey(code))); } catch (_) {}
        if (saved?.token === token && validToken(saved.control)) {
          this.host = { code, ...saved };
          this.stopped = false;
          await this.cycle();
          this.start();
        }
      }
      const card = (await this.store.get(this.path(code, token))).value;
      if (!card) fail('INVALID_SESSION');
      return this.accept(card);
    }
    async command(code, token, body, displayedView) {
      code = codeOf(code);
      if (!validToken(token)) fail('INVALID_SESSION');
      const path = this.path(code, token);
      const requestId = uid();
      // Capture the turn the user actually clicked, not a newer turn fetched below.
      let clickedView = displayedView || this.lastView;
      let context = clickedView ? viewStamp(clickedView) : null;
      const waitUntil = Date.now() + 12000;
      let seq;
      for (let attempt = 0; attempt < 8; attempt++) {
        let old = await this.store.get(path), card = old.value;
        if (!card?.view) fail('INVALID_SESSION');
        if (!clickedView) { clickedView = JSON.parse(card.view); context = viewStamp(clickedView); }
        while ((card.request?.seq || 0) > (card.reply?.seq || 0)) {
          let pendingBody;
          try { pendingBody = typeof card.request.bodyJson === 'string' ? JSON.parse(card.request.bodyJson) : card.request.body; }
          catch (_) { fail('ACTION_PENDING'); }
          // Host presentation and its private card share one session channel.
          // A presence ping must not swallow a real click; never queue/retry an
          // arbitrary user action or update the click's original phase fence.
          if (body.action === 'heartbeat' || pendingBody?.action !== 'heartbeat' || Date.now() >= waitUntil) fail('ACTION_PENDING');
          if (this.host) await this.cycle();
          await wait(150);
          old = await this.store.get(path); card = old.value;
          if (!card?.view) fail('INVALID_SESSION');
        }
        seq = (card.reply?.seq || 0) + 1;
        const protectedBody = clickedView.public.rulesVersion >= 3 ? { ...body, matchId: clickedView.public.matchId, phaseVersion: clickedView.public.phaseVersion } : body;
        // Firebase deletes empty arrays/objects from nested JSON nodes. Preserve
        // an exact command alongside the legacy object so [] remains an explicit
        // abstention (and an empty profession pool remains an intentional choice).
        const request = { seq, id: requestId, context,
          body: protectedBody, bodyJson: JSON.stringify(protectedBody) };
        if (JSON.stringify(request).length > 12000) fail('REQUEST_TOO_LARGE');
        const result = await this.store.put(path, { ...card, request }, old.etag);
        if (!result.conflict) break;
        if (attempt === 7) fail('ACTION_CONFLICT');
      }
      if (this.host) await this.cycle();
      const start = Date.now();
      while (Date.now() - start < 18000) {
        const card = (await this.store.get(path)).value;
        if (card?.reply?.seq >= seq) {
          if (card.reply.id !== requestId) fail('ACTION_CONFLICT');
          if (card.reply.error) fail(card.reply.error);
          return this.accept(card);
        }
        await wait(300);
      }
      fail('HOST_UNAVAILABLE');
    }
    start() {
      if (this.timer) return;
      this.timer = setInterval(() => this.cycle().catch(() => {}), this.interval);
    }
    cycle() {
      if (!this.host || this.stopped) return Promise.resolve();
      if (this.running) return this.running;
      this.running = this.runCycle().finally(() => { this.running = null; });
      return this.running;
    }
    async runCycle() {
      const { code, control } = this.host, path = this.path(code, control);
      const old = await this.store.get(path), doc = old.value;
      if (!doc?.data) fail('ROOM_NOT_FOUND');
      const now = this.now();
      if (doc.owner !== this.owner && doc.leaseUntil > now) return;
      const data = JSON.parse(doc.data);
      const room = data.room;
      // After a sleeping/closed host returns, preserve the last known remaining
      // time instead of silently timing out everybody during its absence.
      if (doc.leaseUntil < now && room.deadlineAt != null && !room.paused) {
        room.deadlineAt = now + Math.max(0, room.deadlineAt - doc.lastHostAt);
        room.revision++;
      }
      if (doc.leaseUntil < now && room.flowVersion >= 4 && room.phase === 'TALK' && !room.paused && room.talkClock?.activeSince != null) {
        room.talkClock.elapsedMs += Math.max(0, doc.lastHostAt - room.talkClock.activeSince);
        room.talkClock.activeSince = now;
        room.revision++;
      }
      E.advanceExpired(room, now);
      const lobby = (await this.store.get(this.lobby(code))).value;
      if (!this.privateKey) this.privateKey = await crypto.subtle.importKey('jwk', data.privateKey,
        { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
      // Public requests contain no card token or plaintext personal name.
      for (const [id, cipher] of Object.entries(lobby?.joins || {}).slice(0, 100)) {
        if (data.joins[id] || typeof cipher !== 'string' || cipher.length > 1024) continue;
        try {
          const plain = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, this.privateKey, decode(cipher));
          const request = JSON.parse(new TextDecoder().decode(plain));
          if (!validToken(request.token)) continue;
          data.joins[id] = true;
          if (data.channels[request.token]) continue;
          const playerId = `p_${uid().slice(0, 24)}`;
          let error = null;
          try { E.addPlayer(room, { playerId, sessionHash: request.token, name: request.name, now }); }
          catch (e) { error = e.code || 'INVALID_NAME'; }
          data.channels[request.token] = { playerId, seq: 0, ...(error ? { error } : {}) };
        } catch (_) { data.joins[id] = true; }
      }
      const incoming = await Promise.all(Object.entries(data.channels).map(async ([token, channel]) =>
        [token, channel, (await this.store.get(this.path(code, token))).value]));
      let historyScope = null, historyChanged = false, storedHistory = null;
      // Acquire one scope fence before consuming allocation requests. If another
      // room is dealing, leave requests untouched for the next coordinator tick.
      const allocationActions = ['startGame', 'restart', 'replay', 'rerollTask'];
      const allocationPending = room.rulesVersion >= 3 && incoming.some(([, channel, card]) => {
        if (!card?.request || card.request.seq <= channel.seq) return false;
        try {
          const body = typeof card.request.bodyJson === 'string' ? JSON.parse(card.request.bodyJson) : card.request.body;
          return allocationActions.includes(body?.action);
        } catch (_) { return false; }
      });
      if (allocationPending) {
        if (!validToken(data.historyScopeToken)) data.historyScopeToken = this.historyToken();
        historyScope = new History.HistoryScope({ store: this.store, token: data.historyScopeToken, owner: this.owner, clock: this.now });
        storedHistory = (await historyScope.acquire()).history || null;
      }
      for (const [token, channel, card] of incoming) {
        const request = card?.request;
        if (!request || !Number.isSafeInteger(request.seq) || request.seq <= channel.seq) continue;
        channel.seq = request.seq;
        channel.reply = { seq: request.seq, id: String(request.id || '').slice(0, 64), error: null };
        try {
          if (!room.players[channel.playerId] || channel.error) fail('INVALID_SESSION');
          if (JSON.stringify(request).length > 12000) fail('INVALID_REQUEST');
          const body = typeof request.bodyJson === 'string' ? JSON.parse(request.bodyJson) : request.body;
          if (!body || Array.isArray(body) || typeof body.action !== 'string') fail('INVALID_REQUEST');
          if (body.action !== 'heartbeat' && request.context !== stamp(room)) fail('STALE_ACTION');
          // Failed actions must not leave partial mutations behind.
          const next = clone(room);
          if (historyScope && allocationActions.includes(body.action)) {
            E.prepareHistory(next);
            next.exposureHistory = historyScope.historyFor(code, next.exposureHistory);
            // Multiple rerolls in this same transaction accumulate rather than
            // reloading the scope's pre-transaction exposure list.
            if (historyChanged) next.exposureHistory = clone(room.exposureHistory);
          }
          E.dispatch(next, channel.playerId, body.action, body, now);
          if (historyScope && allocationActions.includes(body.action) &&
              JSON.stringify(next.exposureHistory || null) !== JSON.stringify(storedHistory)) historyChanged = true;
          Object.keys(room).forEach(key => delete room[key]);
          Object.assign(room, next);
        } catch (e) { channel.reply.error = e.code || 'INVALID_REQUEST'; }
      }
      const revision = doc.revision + 1;
      const nextDoc = { data: JSON.stringify(data), revision,
        ...(doc.historyTransactionId ? { historyTransactionId: doc.historyTransactionId } : {}),
        owner: this.owner, leaseUntil: now + 10000, lastHostAt: now };
      let committed;
      if (historyScope && historyChanged) {
        committed = await historyScope.commit({ roomPath: path, baseEtag: old.etag, nextDoc,
          history: room.exposureHistory, roomCode: code, id: uid() });
      } else {
        if (historyScope) await historyScope.release();
        committed = await this.store.put(path, nextDoc, old.etag);
      }
      if (committed.conflict || this.stopped) return;
      await Promise.all(Object.entries(data.channels).map(async ([token, channel]) => {
        const view = room.players[channel.playerId] && !channel.error ? E.projectState(room, channel.playerId, now) : null;
        if (view) Object.assign(view.public, { syncRevision: revision, hostLiveUntil: now + 10000, transportRound: room.round || 0,
          legacyCardRoom: data.legacyRoom || null });
        for (let attempt = 0; attempt < 4; attempt++) {
          const ref = this.path(code, token), oldCard = await this.store.get(ref);
          if ((oldCard.value?.revision || 0) > revision || this.stopped) return;
          const result = await this.store.put(ref, { ...oldCard.value, revision,
            view: view ? JSON.stringify(view) : null,
            error: view ? null : channel.error || 'INVALID_SESSION',
            reply: channel.reply || { seq: channel.seq, id: '', error: null },
          }, oldCard.etag);
          if (!result.conflict) return;
        }
      }));
    }
    async connectCards() {
      if (!this.host) fail('HOST_ONLY');
      const { code, control } = this.host;
      const data = JSON.parse((await this.store.get(this.path(code, control))).value.data);
      if (!data.cardLinks || !data.legacyRoom) fail('INVALID_CARD_SETUP');
      for (const link of data.cardLinks) {
        const ref = `rooms/${data.legacyRoom}/players/${link.sourceToken}`;
        let done = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const old = await this.store.get(ref);
          const result = await this.store.put(ref, { game: 'chatwolf', name: link.name, playerNum: link.playerNum,
            chatWolf: { version: 1, room: code, token: link.token } }, old.etag);
          if (!result.conflict) { done = true; break; }
        }
        if (!done) fail('ACTION_CONFLICT');
      }
    }
    async request(method, body, session, displayedView) {
      if (method === 'POST' && body?.action === 'create') return this.create(body);
      if (method === 'POST' && body?.action === 'join') return this.join(body);
      if (!session) fail('SESSION_REQUIRED');
      const state = method === 'GET' ? await this.read(session.room, session.token)
        : await this.command(session.room, session.token, body, displayedView);
      return { ok: true, state };
    }
    close() { this.stopped = true; clearInterval(this.timer); this.timer = null; }
  }
  const api = { Client, FirebaseREST, stamp, viewStamp, presentationView };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CHAT_WOLF_SYNC = api;
})(typeof globalThis === 'object' ? globalThis : this);
