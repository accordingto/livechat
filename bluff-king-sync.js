/* Bluff King trusted-host transport. The host device owns the canonical state;
 * player devices load only this transport and their own private projection.
 * Firebase bearer paths are opaque, encrypted joins bind each seat to its own
 * independently generated device identity. Keep the host page open. */
(function (root) {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const random = (bytes = 32) => { const a = new Uint8Array(bytes); root.crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
  const base64 = data => { let s = ''; for (const n of new Uint8Array(data)) s += String.fromCharCode(n); return btoa(s); };
  const unbase64 = data => Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const cleanCode = code => { const c = String(code || '').trim().toUpperCase(); if (!/^[A-Z0-9]{4,12}$/.test(c)) throw new Error('Use a room code with 4–12 letters or numbers.'); return c; };
  const mergeHistory = (a, b) => ({ known: { ...(b?.known || {}), ...(a?.known || {}) }, seen: { ...(b?.seen || {}), ...(a?.seen || {}) } });
  const safeError = e => ({ code: e.code || 'connection_error', message: e.message || 'The room connection was interrupted. Please try again.' });
  // Firebase removes empty maps/arrays and null children. The canonical state
  // and exact filtered view therefore use JSON envelopes, preserving their
  // schema without exposing canonical contents outside the host bearer path.
  function decodeState(value) { const state = typeof value?.data === 'string' ? JSON.parse(value.data) : value; if (!state) return state; state.identities ||= {}; state.rooms ||= {}; for (const who of Object.values(state.identities)) { who.known ||= {}; who.seen ||= {}; } for (const room of Object.values(state.rooms)) { for (const k of ['members', 'roster', 'thinkerOrder', 'history', 'usedKnowledgeIds']) room[k] ||= []; for (const k of ['scores', 'processed']) room[k] ||= {}; room.round ||= null; if (room.round) { for (const k of ['publicHints', 'spotlightOrder', 'coveredIds', 'readyIds']) room.round[k] ||= []; for (const k of ['questionId', 'truthfulId', 'challengeId', 'selectedId']) room.round[k] ??= null; } } if (state.transport) { state.transport.members ||= {}; state.transport.accepted ||= {}; state.transport.acknowledgements ||= {}; } return state; }
  function decodeView(node) { const view = typeof node?.viewJson === 'string' ? JSON.parse(node.viewJson) : node?.view; if (!view) return null; view.players ||= []; view.roster ||= []; view.scores ||= {}; view.history ||= []; view.privateCard ??= null; if (view.round) { for (const k of ['spotlightOrder', 'coveredIds', 'pendingIds']) view.round[k] ||= []; view.round.challengeId ??= null; view.round.currentSpotlightId ??= null; if (view.round.topic) view.round.topic.publicHints ||= []; if (view.round.reveal?.result?.delta) for (const delta of Object.values(view.round.reveal.result.delta)) delta.reasons ||= []; } return view; }
  class Client {
    constructor({ databaseURL, storage, hostPresentation = false, onView = () => {}, onStatus = () => {} } = {}) {
      this.databaseURL = String(databaseURL || root.FIREBASE_CONFIG?.databaseURL || '').replace(/\/$/, ''); if (!/^https:\/\/[a-z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)$/.test(this.databaseURL)) throw new Error('A Firebase Realtime Database URL is required.');
      this.storage = storage || root.localStorage; this.identityStorageKey = 'icebreak.bluff.identity.v1'; this.hostPresentation = !!hostPresentation; this.onView = onView; this.onStatus = onStatus; this.identity = this._identity(); this.closed = false; this.pending = new Map(); this.lastView = null; this.processing = false;
    }
    _deviceHistory() { let common, original; try { common = JSON.parse(this.storage.getItem('icebreak.bluff.device-history.v1')); } catch {} try { original = JSON.parse(this.storage.getItem('icebreak.bluff.identity.v1')); } catch {} return mergeHistory(common, original?.history); }
    _identity() { const key = this.identityStorageKey; let identity; try { identity = JSON.parse(this.storage.getItem(key)); } catch {} if (!identity || !/^[a-f0-9]{40}$/.test(identity.id || '') || !/^[a-f0-9]{64}$/.test(identity.historyToken || '')) { identity = { id: random(20), historyToken: random(), history: { known: {}, seen: {} }, rooms: {} }; this.storage.setItem(key, JSON.stringify(identity)); } identity.history = mergeHistory(identity.history, this._deviceHistory()); identity.rooms ||= {}; return identity; }
    _saveIdentity() { this.identity.history = mergeHistory(this.identity.history, this._deviceHistory()); this.storage.setItem(this.identityStorageKey, JSON.stringify(this.identity)); this.storage.setItem('icebreak.bluff.device-history.v1', JSON.stringify(this.identity.history)); }
    _saveHostIdentity() { this.storage.setItem('icebreak.bluff.host-identity.' + this.code, JSON.stringify({ identityId: this.identity.id, identityStorageKey: this.identityStorageKey })); }
    _roomPath(tail = '') { return `/rooms/bluffking-${this.code}/${tail}`; }
    _historyPath(token = this.identity.historyToken) { return `/rooms/bluff-identities/players/${token}`; }
    async _request(path, { method = 'GET', body, etag, getETag = false } = {}) { const headers = {}; if (body !== undefined) headers['Content-Type'] = 'application/json'; if (etag) headers['If-Match'] = etag; if (getETag) headers['X-Firebase-ETag'] = 'true'; const r = await fetch(this.databaseURL + path + '.json', { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: AbortSignal.timeout(15000) }); if (r.status === 412) return { conflict: true }; if (!r.ok) throw new Error('The room storage could not be reached. Check the connection and Firebase permissions.'); const data = await r.json(); return { data, etag: r.headers.get('etag') }; }
    async _cas(path, change) { const canonical = this.hostToken && path === this._roomPath('players/' + this.hostToken); for (let i = 0; i < 10; i++) { const read = await this._request(path, { getETag: true }); if (!read.etag) throw new Error('The storage does not support safe room updates.'); const old = JSON.stringify(read.data); const working = read.data == null ? null : structuredClone(canonical ? decodeState(read.data) : read.data); const result = await change(working); const next = canonical ? { data: JSON.stringify(result.state) } : result.state; if (JSON.stringify(next) === old) return result.value; const write = await this._request(path, { method: 'PUT', body: next, etag: read.etag }); if (!write.conflict) return result.value; await new Promise(r => setTimeout(r, 30 + Math.random() * 100)); } throw new Error('The room is busy. Please try again.'); }
    async _loadHistory() { const remote = (await this._request(this._historyPath())).data; this.identity.history = mergeHistory(this.identity.history, remote); this._saveIdentity(); }
    _emit(view) { if (this.lastView?.room === view.room && this.lastView.version > view.version) return this.lastView; this.lastView = view; this.onView(view); this.onStatus(this.isHost ? 'hosting' : 'connected'); return view; }
    _schedule() { clearTimeout(this.timer); if (!this.closed) this.timer = setTimeout(() => this.refresh().catch(e => { this.onStatus({ state: 'disconnected', error: safeError(e) }); }).finally(() => this._schedule()), 1500); }
    async connect(code) {
      this.code = cleanCode(code); this.closed = false; const savedHost = this.storage.getItem('icebreak.bluff.host.' + this.code); this.isHost = this.hostPresentation && !!savedHost; this.hostToken = this.isHost ? savedHost : null; this.roomToken = this.identity.rooms[this.code]?.token;
      if (this.isHost) { let meta, profile; try { meta = JSON.parse(this.storage.getItem('icebreak.bluff.host-identity.' + this.code)); profile = meta?.identityStorageKey && JSON.parse(this.storage.getItem(meta.identityStorageKey)); } catch {} if (profile?.id === meta?.identityId && profile.rooms?.[this.code]?.token) { this.identityStorageKey = meta.identityStorageKey; this.identity = profile; this.roomToken = profile.rooms[this.code].token; } }
      await this._loadHistory();
      if (this.isHost) { if (!root.BLUFF_ENGINE || !root.BLUFF_QUESTIONS) throw new Error('The host game engine and verified topics must be loaded.'); const state = decodeState((await this._request(this._roomPath('players/' + this.hostToken))).data); if (!state?.rooms?.[this.code]) throw new Error('The saved host room could not be restored.'); if (state.rooms[this.code].hostIdentityId !== this.identity.id) { this.storage.removeItem('icebreak.bluff.host.' + this.code); this.isHost = false; this.hostToken = null; } else this.privateKey = await root.crypto.subtle.importKey('jwk', state.transport.privateKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']); }
      if (!this.isHost && !this.roomToken) { this.onStatus('not_joined'); return null; }
      const view = await this.refresh(); this._schedule(); return view;
    }
    async create(code, { name = 'Host', participate = true } = {}) {
      this.code = cleanCode(code); this.closed = false;
      if (this.storage.getItem('icebreak.bluff.host.' + this.code)) return this.connect(this.code);
      if (!root.BLUFF_ENGINE || !root.BLUFF_QUESTIONS) throw new Error('The host game engine and verified topics must be loaded.');
      await this._loadHistory();
      const existing = (await this._request(this._roomPath('roster/joinPublic'))).data;
      if (existing) { const e = new Error('This room already has a Bluff King host. Join it using its room code.'); e.code = 'room_exists'; throw e; }
      const keys = await root.crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
      const publicKey = await root.crypto.subtle.exportKey('jwk', keys.publicKey); const privateKey = await root.crypto.subtle.exportKey('jwk', keys.privateKey); const hostToken = random(); const roomToken = random();
      const state = root.BLUFF_ENGINE.blankStore(); state.identities[this.identity.id] = mergeHistory(this.identity.history); root.BLUFF_ENGINE.applyCommand(state, this.identity.id, { room: this.code, action: 'create', name, participate }, root.BLUFF_QUESTIONS);
      state.transport = { hostIdentityId: this.identity.id, publicKey, privateKey, members: { [this.identity.id]: { token: roomToken, historyToken: this.identity.historyToken } }, accepted: {}, acknowledgements: {} };
      await this._request(this._roomPath('players/' + hostToken), { method: 'PUT', body: { data: JSON.stringify(state) } });
      const metaPath = this._roomPath('roster/joinPublic'); await this._cas(metaPath, current => { if (current) { const e = new Error('This room already has a host. Join it instead.'); e.code = 'room_exists'; throw e; } return { state: { version: 1, publicKey, createdAt: Date.now(), game: 'bluffking' } }; });
      this.storage.setItem('icebreak.bluff.host.' + this.code, hostToken); this.identity.rooms[this.code] = { token: roomToken, name }; this._saveIdentity(); this.isHost = true; this.hostToken = hostToken; this.roomToken = roomToken; this.privateKey = keys.privateKey;
      this._saveHostIdentity();
      const view = await this.refresh(); this._schedule(); return view;
    }
    async createFromCards(code, setup) {
      const names = setup?.names, tokens = setup?.tokens; const count = Number(setup?.playerCount ?? names?.length);
      if (!Array.isArray(names) || !Array.isArray(tokens) || !Number.isInteger(count) || count < 3 || count > 9 || names.length !== count || tokens.length !== count || names.some(n => typeof n !== 'string' || !n.trim() || n.length > 40) || tokens.some(t => typeof t !== 'string' || !/^[A-Za-z0-9_-]{12,128}$/.test(t)) || new Set(tokens).size !== count) { const e = new Error('The existing Hub roster needs three to nine names and distinct original player links.'); e.code = 'invalid_card_roster'; throw e; }
      this.code = cleanCode(code); this.closed = false;
      if (this.storage.getItem('icebreak.bluff.host.' + this.code)) await this.connect(this.code); else await this.create(this.code, { name: 'Host', participate: false });
      if (!this.isHost) { const e = new Error('Only the current host can use this original Hub roster.'); e.code = 'host_only'; throw e; }
      await this._cas(this._roomPath('players/' + this.hostToken), state => {
        const room = state.rooms[this.code];
        if (room.hostIdentityId !== this.identity.id) { const e = new Error('The host has changed. Only the current host can import the original player cards.'); e.code = 'host_only'; throw e; }
        const prior = state.transport.cardRoster || [];
        if (room.phase !== 'lobby') { if (prior.length !== count || prior.some((p, i) => p.originalToken !== tokens[i])) { const e = new Error('The current game has a fixed roster. Finish it before importing the original player cards.'); e.code = 'roster_locked'; throw e; } return { state }; }
        const priorMap = new Map(prior.map(p => [p.originalToken, p])); const newMembers = []; const newSessions = {};
        const hostMember = room.members.find(p => p.identityId === this.identity.id); const hostHasOriginalSeat = prior.some(p => p.identityId === this.identity.id && tokens.includes(p.originalToken)); if (!hostHasOriginalSeat) { hostMember.seated = false; hostMember.wantsSeat = false; newMembers.push(hostMember); } newSessions[this.identity.id] = state.transport.members[this.identity.id];
        const cardRoster = tokens.map((originalToken, i) => {
          const entry = priorMap.get(originalToken) || { originalToken, identityId: random(20), token: random(), historyToken: random() };
          let member = room.members.find(p => p.identityId === entry.identityId);
          if (!member) { root.BLUFF_ENGINE.applyCommand(state, entry.identityId, { room: this.code, action: 'join', name: names[i], participate: false }, root.BLUFF_QUESTIONS); member = room.members.find(p => p.identityId === entry.identityId); member.lastSeen = 0; }
          member.name = names[i]; member.seated = true; member.wantsSeat = true; newMembers.push(member); newSessions[entry.identityId] = { token: entry.token, historyToken: entry.historyToken };
          return { ...entry, name: names[i], playerId: member.id };
        });
        const same = JSON.stringify(prior) === JSON.stringify(cardRoster) && room.members.length === newMembers.length && room.members.every((p, i) => p.id === newMembers[i].id);
        room.members = newMembers; state.transport.members = newSessions; state.transport.cardRoster = cardRoster;
        if (!same) room.version++;
        return { state };
      });
      while (this.processing) await new Promise(resolve => setTimeout(resolve, 30));
      return this.refresh();
    }
    async getCardSessions() {
      if (!this.isHost || !this.hostToken) { const e = new Error('Only the current host can publish original player cards.'); e.code = 'host_only'; throw e; }
      const state = decodeState((await this._request(this._roomPath('players/' + this.hostToken))).data);
      if (state.rooms[this.code].hostIdentityId !== this.identity.id) { const e = new Error('The host has changed.'); e.code = 'host_only'; throw e; }
      return (state.transport.cardRoster || []).map(p => ({ originalToken: p.originalToken, name: p.name, playerId: p.playerId, credential: { version: 2, room: this.code, token: p.token, identityId: p.identityId, historyToken: p.historyToken } }));
    }
    async connectCard(code, credential) {
      const roomCode = cleanCode(code);
      if (credential?.version !== 2 || credential.room !== roomCode || !/^[a-f0-9]{64}$/.test(credential.token || '') || !/^[a-f0-9]{40}$/.test(credential.identityId || '') || !/^[a-f0-9]{64}$/.test(credential.historyToken || '')) { const e = new Error('This original player card has an invalid game session. Ask the host to reopen Bluff King.'); e.code = 'invalid_card_session'; throw e; }
      this.code = roomCode; this.closed = false;
      const node = (await this._request(this._roomPath('players/' + credential.token))).data; const binding = node?.sessionBinding;
      if (!binding || binding.room !== roomCode || binding.identityId !== credential.identityId || binding.historyToken !== credential.historyToken) { const e = new Error('This player card is not bound to this game seat. Ask the host to republish the original cards.'); e.code = 'invalid_card_session'; throw e; }
      await this._loadHistory();
      const common = mergeHistory(this.identity.history, this._deviceHistory()); this.identityStorageKey = 'icebreak.bluff.card.v2.' + roomCode + '.' + credential.token; let existing; try { existing = JSON.parse(this.storage.getItem(this.identityStorageKey)); } catch {}
      this.identity = { id: credential.identityId, historyToken: credential.historyToken, history: mergeHistory(existing?.history, common), rooms: { [roomCode]: { token: credential.token, name: decodeView(node)?.self?.name || '' } } }; this.roomToken = credential.token; this.hostToken = null; this.isHost = false; this._saveIdentity();
      await this._loadHistory(); await this._cas(this._historyPath(), current => ({ state: mergeHistory(current, this.identity.history) }));
      const view = await this.refresh(); this._schedule(); return view;
    }
    async join(code, { name, participate = true } = {}) {
      this.code = cleanCode(code); this.closed = false; this.isHost = false; this.hostToken = null; await this._loadHistory();
      const meta = (await this._request(this._roomPath('roster/joinPublic'))).data; if (!meta?.publicKey) { const e = new Error('The host has not opened this Bluff King room yet.'); e.code = 'room_not_found'; throw e; }
      const roomToken = this.identity.rooms[this.code]?.token || random(); this.roomToken = roomToken; this.identity.rooms[this.code] = { token: roomToken, name: String(name || '').trim() }; this._saveIdentity();
      const payload = { identityId: this.identity.id, token: roomToken, historyToken: this.identity.historyToken, history: this.identity.history, name: String(name || '').trim().slice(0, 40), participate: !!participate };
      const aes = await root.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']); const iv = new Uint8Array(12); root.crypto.getRandomValues(iv); const cipher = await root.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, enc.encode(JSON.stringify(payload))); const publicKey = await root.crypto.subtle.importKey('jwk', meta.publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']); const wrapped = await root.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, await root.crypto.subtle.exportKey('raw', aes));
      const requestId = random(16); await this._request(this._roomPath('roster/requests/' + requestId), { method: 'PUT', body: { key: base64(wrapped), iv: base64(iv), cipher: base64(cipher) } }); this.onStatus('waiting_for_host');
      await this.refresh(); this._schedule(); return this.lastView;
    }
    async _decode(packet) { if (!packet || JSON.stringify(packet).length > 160000) throw new Error('Invalid join packet.'); const raw = await root.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, this.privateKey, unbase64(packet.key)); const key = await root.crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); return JSON.parse(dec.decode(await root.crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(packet.iv) }, key, unbase64(packet.cipher)))); }
    async _hostRefresh() {
      const joins = (await this._request(this._roomPath('roster/requests'))).data || {}; const decoded = [];
      for (const [requestId, packet] of Object.entries(joins).slice(0, 100)) { try { const p = await this._decode(packet); if (!/^[a-f0-9]{40}$/.test(p.identityId || '') || !/^[a-f0-9]{64}$/.test(p.token || '') || !/^[a-f0-9]{64}$/.test(p.historyToken || '')) throw new Error('Invalid join credentials.'); decoded.push({ requestId, p }); } catch { await this._request(this._roomPath('roster/requests/' + requestId), { method: 'DELETE' }); } }
      const snapshot = decodeState((await this._request(this._roomPath('players/' + this.hostToken))).data); if (!snapshot?.transport) throw new Error('The host room could not be restored.');
      const commands = await Promise.all(Object.entries(snapshot.transport.members).map(async ([identityId, credentials]) => { const [node, history] = await Promise.all([this._request(this._roomPath('players/' + credentials.token)), this._request(this._historyPath(credentials.historyToken))]); return { identityId, credentials, node: node.data, history: history.data }; }));
      const published = await this._cas(this._roomPath('players/' + this.hostToken), state => {
        if (!state?.transport) throw new Error('The host state is missing.');
        const activeHost = state.rooms[this.code].members.find(p => p.identityId === this.identity.id); if (activeHost) activeHost.lastSeen = Date.now();
        for (const { requestId, p } of decoded) { if (state.transport.accepted[requestId]) continue; const knownMember = state.transport.members[p.identityId]; if (knownMember && (knownMember.token !== p.token || knownMember.historyToken !== p.historyToken)) continue; state.identities[p.identityId] = mergeHistory(state.identities[p.identityId], p.history); try { root.BLUFF_ENGINE.applyCommand(state, p.identityId, { room: this.code, action: 'join', name: p.name, participate: state.transport.cardRoster?.length ? false : p.participate }, root.BLUFF_QUESTIONS); state.transport.members[p.identityId] = { token: p.token, historyToken: p.historyToken }; state.transport.accepted[requestId] = true; } catch (e) { state.transport.acknowledgements[p.identityId] = { error: safeError(e) }; } }
        for (const { identityId, node, history } of commands) {
          state.identities[identityId] = mergeHistory(state.identities[identityId], history);
          if (identityId !== this.identity.id && node?.heartbeat && state.rooms[this.code].members.find(p => p.identityId === identityId)) state.rooms[this.code].members.find(p => p.identityId === identityId).lastSeen = Math.min(Date.now(), Number(node.heartbeat) || 0);
          const command = node?.command; if (!command?.commandId || state.transport.acknowledgements[identityId]?.commandId === command.commandId) continue;
          try { if (JSON.stringify(command).length > 12000) throw new Error('Request too large.'); root.BLUFF_ENGINE.applyCommand(state, identityId, { ...command, room: this.code }, root.BLUFF_QUESTIONS); state.transport.acknowledgements[identityId] = { commandId: command.commandId, ok: true }; } catch (e) { state.transport.acknowledgements[identityId] = { commandId: command.commandId, ok: false, error: safeError(e) }; }
        }
        const room = state.rooms[this.code]; state.transport.hostIdentityId = room.hostIdentityId; const messages = Object.entries(state.transport.members).map(([identityId, credentials]) => ({ identityId, credentials, view: root.BLUFF_ENGINE.projectView(state, identityId, this.code, root.BLUFF_QUESTIONS, { private: true }), ack: state.transport.acknowledgements[identityId] || null }));
        const hostView = root.BLUFF_ENGINE.projectView(state, this.identity.id, this.code, root.BLUFF_QUESTIONS, { private: !this.hostPresentation });
        state.transport.publicationRevision = (state.transport.publicationRevision || 0) + 1;
        return { state, value: { messages, hostView, histories: structuredClone(state.identities), isCurrentHost: room.hostIdentityId === this.identity.id, hostIdentityId: room.hostIdentityId, publicationRevision: state.transport.publicationRevision } };
      });
      await Promise.all(published.messages.map(async item => { await this._cas(this._historyPath(item.credentials.historyToken), current => ({ state: mergeHistory(current, published.histories[item.identityId]) })); await this._cas(this._roomPath('players/' + item.credentials.token), current => { if ((current?.publicationRevision || 0) > published.publicationRevision || (decodeView(current)?.version || 0) > item.view.version) return { state: current }; return { state: { ...(current || {}), view: null, viewJson: JSON.stringify(item.view), ack: item.ack, history: mergeHistory(current?.history, published.histories[item.identityId]), sessionBinding: { room: this.code, identityId: item.identityId, historyToken: item.credentials.historyToken }, hostGrant: item.identityId === published.hostIdentityId ? { token: this.hostToken } : null, publicationRevision: published.publicationRevision } }; }); }));
      for (const { requestId } of decoded) await this._request(this._roomPath('roster/requests/' + requestId), { method: 'DELETE' });
      this.identity.history = mergeHistory(this.identity.history, published.histories[this.identity.id]); this._saveIdentity();
      if (!published.isCurrentHost) { this.storage.removeItem('icebreak.bluff.host.' + this.code); this.isHost = false; this.hostToken = null; }
      return this._emit(published.hostView);
    }
    async refresh() {
      if (this.closed || this.processing) return this.lastView; this.processing = true;
      try {
        if (this.isHost) return await this._hostRefresh();
        if (!this.roomToken) return null;
        await this._request(this._roomPath('players/' + this.roomToken + '/heartbeat'), { method: 'PUT', body: Date.now() });
        const node = (await this._request(this._roomPath('players/' + this.roomToken))).data;
        const receivedView = decodeView(node); if (!receivedView) { this.onStatus('waiting_for_host'); return null; }
        this.identity.history = mergeHistory(this.identity.history, node.history); this._saveIdentity();
        if (node.hostGrant?.token && receivedView.self?.isHost) { this.storage.setItem('icebreak.bluff.host.' + this.code, node.hostGrant.token); this._saveHostIdentity(); if (this.hostPresentation && root.BLUFF_ENGINE && root.BLUFF_QUESTIONS) { this.hostToken = node.hostGrant.token; const state = decodeState((await this._request(this._roomPath('players/' + this.hostToken))).data); this.privateKey = await root.crypto.subtle.importKey('jwk', state.transport.privateKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']); this.isHost = true; } }
        if (node.ack?.commandId && this.pending.has(node.ack.commandId)) { const pending = this.pending.get(node.ack.commandId); this.pending.delete(node.ack.commandId); node.ack.ok ? pending.resolve(receivedView) : pending.reject(Object.assign(new Error(node.ack.error?.message || 'The action could not be completed.'), { code: node.ack.error?.code })); }
        const view = structuredClone(receivedView); if (this.hostPresentation) view.privateCard = null; return this._emit(view);
      } finally { this.processing = false; }
    }
    async command(input) {
      if (this.isHost) {
        const snapshot = decodeState((await this._request(this._roomPath('players/' + this.hostToken))).data);
        const histories = await Promise.all(Object.entries(snapshot.transport.members).map(async ([identityId, credentials]) => [identityId, (await this._request(this._historyPath(credentials.historyToken))).data]));
        await this._cas(this._roomPath('players/' + this.hostToken), state => { for (const [identityId, history] of histories) state.identities[identityId] = mergeHistory(state.identities[identityId], history); root.BLUFF_ENGINE.applyCommand(state, this.identity.id, { ...input, room: this.code }, root.BLUFF_QUESTIONS); state.transport.hostIdentityId = state.rooms[this.code].hostIdentityId; return { state }; });
        return this.refresh();
      }
      if (!this.roomToken) throw new Error('Join the room first.');
      if (this.pending.size) throw new Error('Wait for the previous room action to complete.');
      const command = { ...input, room: this.code }; const promise = new Promise((resolve, reject) => { const timeout = setTimeout(() => { if (this.pending.has(command.commandId)) { this.pending.delete(command.commandId); const e = new Error('The host has not processed this action yet. Keep the host page open, then refresh before retrying.'); e.code = 'host_timeout'; reject(e); } }, 20000); this.pending.set(command.commandId, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } }); });
      try { await this._request(this._roomPath('players/' + this.roomToken + '/command'), { method: 'PUT', body: command }); await this.refresh(); } catch (e) { this.pending.get(command.commandId)?.reject(e); this.pending.delete(command.commandId); } return promise;
    }
    close() { this.closed = true; clearTimeout(this.timer); for (const pending of this.pending.values()) pending.reject(new Error('The room connection closed.')); this.pending.clear(); }
  }
  root.BLUFF_SYNC = { Client, mergeHistory };
  if (typeof module === 'object' && module.exports) module.exports = root.BLUFF_SYNC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
