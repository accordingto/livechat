/* Independent execution is enabled only after the service seals a room ticket.
 * Player pages send their own token; no canonical credential leaves the service.
 */
var HUB_EXECUTOR = (() => {
  'use strict';
  const endpoint = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
  const uid = () => crypto.randomUUID();
  let retiredCapsule = null;
  let current = null, lastPulse = 0, inflight = null, active = false, pollAfterMs = 5000, pendingWake = false, readyUntil = 0, readyValue = false;
  async function ready() {
    if (Date.now() < readyUntil) return readyValue;
    readyUntil = Date.now() + 60000;
    try { const r = await fetch(endpoint, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000) }); readyValue = r.ok && (await r.json()).ready === true; } catch { readyValue = false; }
    return readyValue;
  }
  async function request(input) {
    // The service can spend up to 60 seconds finishing guarded publication.
    // Aborting at 12 seconds stranded an otherwise successful registration.
    let r;
    try { r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(65000) }); }
    catch (error) {
      if (error.name === 'TimeoutError') throw Object.assign(new Error('The room sync took too long. Retry the connection.'), { code: 'connection_timeout' });
      throw error;
    }
    const data = await r.json(); if (!r.ok) throw Object.assign(new Error(data.error || 'executor_unavailable'), { code: data.error });
    return data;
  }
  function observe(data, token) {
    const ticket = data?.hubExecutor;
    if (!ticket || ticket.v !== 1 || !token || ticket.capsule === retiredCapsule) { current = null; active = false; recoveryControl([]); clearMembership(); return; }
    const nested = data[{ onceupon: 'once', letstalk: 'talk' }[ticket.game] || ticket.game] || {};
    const action = data.talkAction || data.onceAction || data.dixitAction || data.cutAction || data.openmicAction || data.command || data.request;
    const actionId = action?.id || action?.commandId;
    const phaseKey = JSON.stringify([ticket.capsule, nested.turnId, nested.phaseId, nested.phase, nested.revealStage]);
    if (phaseKey !== current?.phaseKey || actionId && actionId !== current?.actionId) { lastPulse = 0; pendingWake = !!inflight; }
    current = { actionId, phaseKey, capsule: ticket.capsule, token, game: ticket.game, sessionId: ticket.sessionId, turnId: nested.turnId, phaseId: nested.phaseId };
    recoveryControl(['bluffking','chatwolf'].includes(ticket.game) ? [] : ticket.absentNums || []);
    membershipControl(data, current);
    active = true; backgroundPulse();
  }
  function pulse(command) {
    if (!current || (!command && (inflight || Date.now() - lastPulse < pollAfterMs))) return inflight || Promise.resolve();
    const snapshot = current; lastPulse = Date.now();
    const task = request({ operation: 'execute', ...snapshot, clock: pollAfterMs < 5000, ...(command ? { command } : {}) }).then(result => {
      if (current?.capsule === snapshot.capsule) pollAfterMs = Math.max(500, Math.min(5000, Number(result.pollAfterMs) || 5000));
      return result;
    }).catch(error => {
      if (error.code === 'game_switched' && current?.capsule === snapshot.capsule) {
        retiredCapsule = snapshot.capsule; current = null; active = false; recoveryControl([]); clearMembership();
      }
      throw error;
    });
    inflight = task.catch(() => {}).finally(() => { if (inflight === settled) inflight = null; if (pendingWake) { pendingWake = false; lastPulse = 0; backgroundPulse(); } });
    const settled = inflight;
    return task;
  }
  function backgroundPulse() { void pulse().catch(() => {}); }
  function recover() { return pulse({ id: uid(), commandId: uid(), type: 'recover', action: 'recover', sessionId: current?.sessionId, turnId: current?.turnId, phaseId: current?.phaseId }); }
  function recoveryControl(absent) {
    if (typeof document === 'undefined') return;
    let row = document.getElementById('hub-absence-controls');
    if (!absent.length) { row?.remove(); return; }
    if (!row) {
      row = document.createElement('div'); row.id = 'hub-absence-controls';
      row.style.cssText = 'margin:16px auto;max-width:680px;text-align:center;padding:12px';
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'dx-button once-button cut-button om-button';
      button.onclick = async () => { button.disabled = true; try { await recover(); } catch { button.textContent = document.documentElement.lang.startsWith('zh') ? '暫時無法接續，請稍後再試' : 'Unable to continue yet. Try again shortly.'; } finally { button.disabled = false; } };
      row.append(button); document.body.append(row);
    }
    row.firstChild.textContent = document.documentElement.lang.startsWith('zh') ? '跳過缺席玩家，接續遊戲' : 'Continue without absent players';
  }
  const membershipGames = ['dixit', 'onceupon', 'bluffking', 'cut', 'openmic', 'letstalk'];
  const controlKeys = { dixit: 'dixitControlToken', onceupon: 'onceUponControlToken', cut: 'cutControlToken', openmic: 'openMicControlToken', letstalk: 'letsTalkControlToken' };
  const tableKey = code => 'icebreak.hub.active.' + code;
  const pendingRosterKey = code => 'icebreak.hub.roster.pending.' + code;
  const terminalRosterErrors = new Set(['stale_session', 'invalid_roster', 'player_count', 'game_switched', 'host_only', 'invalid_ticket', 'command_conflict', 'invalid_command']);
  const readLocal = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  function writeTable(table) { if (!membershipGames.includes(table?.game)) return; try { localStorage.setItem(tableKey(table.code), JSON.stringify(table)); } catch {} }
  function rememberTable(code, game, capsule, token, rows) {
    if (!capsule || !token || !membershipGames.includes(game)) return;
    const setup = readLocal('room-session-' + code), prior = readLocal(tableKey(code));
    const roster = (Array.isArray(rows) ? rows : []).map((row, i) => ({ playerNum: i + 1, originalToken: setup?.tokens?.[i], name: row.name || setup?.names?.[i] || 'Player ' + (i + 1) }));
    if (!roster.length || roster.some(row => !row.originalToken)) return;
    writeTable({ code, game, capsule, token, roster, hubCount: prior?.capsule === capsule ? prior.hubCount : roster.length });
  }
  let rosterWork = Promise.resolve();
  async function discoverTable(room) {
    let prior = readLocal(tableKey(room.code));
    const first = room.playerRef?.(0);
    if (!first || typeof first.once !== 'function') return prior;
    let card = (await first.once('value')).val();
    if (!membershipGames.includes(card?.game) || prior?.game && card?.game !== prior.game) {
      const others = await Promise.all(Array.from({ length: Math.max(0, room.count - 1) }, async (_, i) => { const ref = room.playerRef(i + 1); return typeof ref?.once === 'function' ? (await ref.once('value')).val() : null; }));
      card = [card, ...others].find(node => prior?.game && node?.game === prior.game) || [card, ...others].find(node => membershipGames.includes(node?.game));
    }
    const game = card?.game;
    if (!membershipGames.includes(game)) return null;
    const saved = readLocal('room-session-' + room.code);
    const token = game === 'bluffking' ? (() => { try { return localStorage.getItem('icebreak.bluff.host.' + room.code); } catch {} })() : saved?.[controlKeys[game]];
    if (!token || typeof firebase === 'undefined') return prior?.game === game ? prior : null;
    const path = 'rooms/' + (game === 'bluffking' ? 'bluffking-' : '') + room.code + '/players/' + token;
    const raw = (await firebase.database().ref(path).once('value')).val();
    if (raw?.executor?.v !== 1) return null;
    const state = raw.state || (raw.stateJson ? JSON.parse(raw.stateJson) : raw.data ? JSON.parse(raw.data) : raw);
    const rows = game === 'bluffking' ? state.transport?.cardRoster : state.roster;
    rememberTable(room.code, game, raw.executor.capsule, token, rows);
    return readLocal(tableKey(room.code));
  }
  function syncRoster(room, input) {
    const work = async () => {
      if (!room?.enabled) return null;
      const setup = input || readLocal('room-session-' + room.code);
      if (!setup?.tokens?.length || !Number.isInteger(setup.playerCount)) return null;
      const pendingKey = pendingRosterKey(room.code), pending = readLocal(pendingKey);
      if (pending) {
        try {
          const completed = await request(pending);
          const saved = readLocal(tableKey(room.code));
          if (saved?.game === completed.game) writeTable({ ...saved, capsule: completed.capsule, roster: pending.roster, hubCount: pending.hubCount });
        } catch (error) { if (!terminalRosterErrors.has(error.code)) throw error; }
        try { localStorage.removeItem(pendingKey); } catch {}
      }
      const table = await discoverTable(room);
      if (!table) return null;
      const count = setup.playerCount, old = table.roster || [];
      if (old.some((row, i) => row.originalToken !== setup.tokens[i])) throw Object.assign(new Error('room_changed'), { code: 'room_changed' });
      const size = Math.max(count, old.length);
      const names = Array.from({ length: count }, (_, i) => String(setup.names?.[i] || '').trim());
      if (names.some(name => !name)) return null;
      const roster = Array.from({ length: size }, (_, i) => ({ playerNum: i + 1, originalToken: setup.tokens[i], name: i < count ? names[i] : old[i]?.name || setup.names?.[i] || 'Player ' + (i + 1) }));
      if (table.hubCount === count && JSON.stringify(roster) === JSON.stringify(old)) return table;
      const mutation = { operation: 'updateRoster', capsule: table.capsule, token: table.token, commandId: uid(), roster, hubCount: count };
      try { localStorage.setItem(pendingKey, JSON.stringify(mutation)); } catch {}
      let result;
      try { result = await request(mutation); }
      catch (error) { if (terminalRosterErrors.has(error.code)) { try { localStorage.removeItem(pendingKey); } catch {} } throw error; }
      try { localStorage.removeItem(pendingKey); } catch {}
      writeTable({ ...table, capsule: result.capsule, roster, hubCount: count });
      return { ...table, ...result, roster, hubCount: count };
    };
    const task = rosterWork.then(work); rosterWork = task.catch(() => {}); return task;
  }
  function watchHub(room) {
    if (typeof window === 'undefined') return;
    let timer, busy = false, rerun = false;
    const status = message => { const node = document.getElementById('hub-membership-status'); if (node) { node.textContent = message; node.hidden = !message; } };
    const text = (en, zh) => typeof I18N !== 'undefined' && I18N.lang === 'zh' ? zh : en;
    const run = async () => {
      if (busy) { rerun = true; return; } busy = true;
      try {
        const result = await syncRoster(room);
        const retry = document.getElementById('hub-membership-retry'); if (retry) retry.hidden = true;
        if (result?.ok) status(text('Players updated. Keep playing; new players join at the next safe turn or round.', '玩家名單已更新，原遊戲繼續；新人會在合適的下一輪或下一次換手加入。'));
      } catch (error) {
        const retry = document.getElementById('hub-membership-retry'); if (retry) retry.hidden = false;
        status(error.code === 'player_count' || error.code === 'invalid_roster' ? text('This game has reached its player limit. Keep the current table or start another game.', '目前遊戲已達人數上限，請維持原桌或選擇其他遊戲。') : text('The player update has not completed. Your game is kept; retry updating the roster.', '名單尚未更新完成，原遊戲保留；請重試同步名單。'));
      } finally { busy = false; if (rerun) { rerun = false; schedule(); } }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 700); };
    window.addEventListener('hub-room-setup', schedule);
    window.addEventListener('storage', event => { if (event.key === 'room-session-' + room.code) schedule(); });
    document.getElementById('hub-membership-retry')?.addEventListener('click', run);
    schedule();
  }
  let membershipBusy = false, membershipSnapshot = null, membershipSignature = '';
  async function setParticipant(playerNum, active, ticket) {
    const credential = ticket || current;
    if (!credential?.capsule || !credential?.token) throw new Error('room_not_ready');
    const result = await request({ operation: 'setParticipant', capsule: credential.capsule, token: credential.token, commandId: uid(), playerNum: Number(playerNum), active: !!active });
    if (current?.capsule === credential.capsule) { current.capsule = result.capsule; lastPulse = 0; }
    return result;
  }
  function clearMembership() {
    if (typeof document !== 'undefined') document.getElementById('hub-membership-controls')?.remove();
    membershipSnapshot = null; membershipSignature = '';
  }
  function membershipControl(data, ticket, selfNum = data?.playerNum) {
    if (typeof document === 'undefined' || !document.createElement || !document.body) return;
    const game = ticket?.game || data?.game;
    if (!['dixit', 'onceupon', 'bluffking'].includes(game)) { clearMembership(); return; }
    const nested = game === 'bluffking' ? data : data?.[game === 'onceupon' ? 'once' : game];
    const rows = game === 'bluffking' ? nested?.players?.filter(row => Number.isInteger(row.playerNum) && row.playerNum > 0) : nested?.roster;
    if (!nested?.membership?.enabled || !rows?.length || !ticket?.capsule) { clearMembership(); return; }
    membershipSnapshot = { data, ticket, selfNum };
    const zh = typeof I18N !== 'undefined' && I18N.lang === 'zh';
    const signature = JSON.stringify([game, ticket.capsule, rows.map(row => [row.playerNum, row.name, row.active, row.pending, row.memberStatus]), selfNum, zh]);
    if (membershipSignature === signature) return; membershipSignature = signature;
    let panel = document.getElementById('hub-membership-controls');
    if (!panel) {
      panel = document.createElement('details'); panel.id = 'hub-membership-controls'; panel.className = 'hub-membership-controls';
      const summary = document.createElement('summary'), list = document.createElement('div'), note = document.createElement('p');
      list.className = 'hub-membership-list'; note.className = 'hub-membership-note';
      panel.append(summary, list, note); document.body.append(panel);
    }
    panel.firstChild.textContent = zh ? '玩家與離席設定' : 'Players and participation';
    panel.lastChild.textContent = zh ? '離席會保留手牌與分數。可從自己的原連結重新加入；人數不足時先等候其他玩家。' : 'Sitting out keeps cards and scores. Rejoin with your original link; play waits when there are too few players.';
    const self = rows.find(row => row.playerNum === Number(selfNum));
    const canManage = !selfNum || self && self.active !== false && !self.pending;
    panel.children[1].replaceChildren(...rows.map(row => {
      const line = document.createElement('div'), label = document.createElement('span'), button = document.createElement('button');
      line.className = 'hub-membership-row';
      const state = row.active === false ? (zh ? '已離席' : 'Sitting out') : row.pending ? (row.memberStatus === 'next_turn' ? (zh ? '下一次換手加入' : 'Joining next turn') : (zh ? '下一輪加入' : 'Joining next round')) : (zh ? '參與中' : 'Playing');
      label.textContent = row.name + ' · ' + state;
      button.type = 'button'; button.textContent = row.active === false ? (zh ? '重新加入' : 'Rejoin') : (zh ? '設為離席' : 'Sit out');
      button.disabled = membershipBusy || !canManage && !(row.playerNum === Number(selfNum) && row.active === false);
      button.onclick = async () => {
        if (membershipBusy) return; membershipBusy = true; button.disabled = true;
        try {
          const result = await setParticipant(row.playerNum, row.active === false, ticket);
          if (result.payload) {
            const payload = game === 'bluffking' ? (result.payload.viewJson ? JSON.parse(result.payload.viewJson) : result.payload.view) : result.payload;
            if (payload) { membershipSignature = ''; membershipControl(payload, { ...ticket, capsule: result.capsule }, selfNum); }
          }
        } catch { panel.lastChild.textContent = zh ? '尚未更新，請稍後重試。' : 'Not updated yet. Try again shortly.'; }
        finally { membershipBusy = false; membershipSignature = ''; if (membershipSnapshot) membershipControl(membershipSnapshot.data, membershipSnapshot.ticket, membershipSnapshot.selfNum); }
      };
      line.append(label, button); return line;
    }));
  }
  function hostMembership(host, game) {
    const raw = host.doc, state = raw?.state;
    if (!state || raw.executor?.v !== 1) return;
    rememberTable(host.room.code, game, raw.executor.capsule, host.ref.key, state.roster);
    const engine = game === 'dixit' ? (typeof DIXIT_ENGINE !== 'undefined' ? DIXIT_ENGINE : null) : game === 'onceupon' ? (typeof ONCE_ENGINE !== 'undefined' ? ONCE_ENGINE : null) : null;
    if (engine) membershipControl(engine.view(state, 0, host.now()), { game, capsule: raw.executor.capsule, token: host.ref.key }, 0);
  }
  function isIndependent(data) { return data?.hubExecutor?.v === 1 || data?.sharedControls === true; }
  async function ensureHost(host, game) {
    if (!host || host.stopped || !host.doc?.state || host.executorStarting) throw new Error('room_not_ready');
    if (host.executorPromise) return host.executorPromise;
    const sessionId = host.doc.state.sessionId;
    host.executorRegistering = true;
    const task = (async () => {
      if (!await ready()) throw new Error('executor_unavailable');
      await host.outgoing;
      if (host.projectionTasks) await Promise.all(host.projectionTasks.values());
      if (host.stopped || host.doc?.state?.sessionId !== sessionId) throw new Error('stale_session');
      let result;
      if (host.doc.executor?.v === 1 && host.doc.executor.sessionId === sessionId) {
        const executed = await request({ operation: 'execute', capsule: host.doc.executor.capsule, token: host.ref.key });
        result = { capsule: executed.capsule || host.doc.executor.capsule, game, sessionId };
      } else {
        const seats = Array.from({ length: host.room.count }, (_, i) => ({ playerNum: i + 1, token: host.room.playerRef(i)?.key }));
        result = await request({ operation: 'register', game, code: host.room.code, controlToken: host.ref.key, sessionId, seats });
      }
      if (!result?.capsule || result.sessionId && result.sessionId !== sessionId) throw new Error('registration_incomplete');
      if (typeof host.ref.once === 'function') {
        const raw = (await host.ref.once('value')).val();
        const state = raw?.state || (raw?.stateJson ? JSON.parse(raw.stateJson) : null);
        if (raw?.executor?.v !== 1 || raw.executor.capsule !== result.capsule || state?.sessionId !== sessionId) throw new Error('registration_incomplete');
        host.doc = { ...raw, state }; host.own = false;
      }
      rememberTable(host.room.code, game, result.capsule, host.ref.key, host.doc.state.roster);
      return result;
    })();
    host.executorPromise = task;
    try { return await task; }
    finally { if (host.executorPromise === task) host.executorPromise = null; host.executorRegistering = false; }
  }
  async function ensureBluff(client) {
    if (!client?.hostToken || !client.code) throw new Error('room_not_ready');
    if (client.executorPromise) return client.executorPromise;
    client.executorRegistering = true;
    const task = (async () => {
      if (!await ready()) throw new Error('executor_unavailable');
      const raw = (await client._request(client._roomPath('players/' + client.hostToken))).data;
      let result;
      if (raw?.executor?.v === 1) {
        const verified = client.executorTicket?.capsule === raw.executor.capsule && client.executorTicket.token === client.hostToken &&
          client.lastView?.room === client.code && client.lastView.sharedControls === true && client.lastView.self?.isHost === true;
        // Native reconnect already validated this same published epoch.
        // Reuse its public view instead of repeating a full publication.
        const current = verified ? null : await request({ operation: 'execute', capsule: raw.executor.capsule, token: client.hostToken });
        result = { capsule: raw.executor.capsule, game: 'bluffking', sessionId: raw.executor.sessionId,
          ...(current?.payload ? { payload: current.payload } : {}) };
      } else {
        const state = typeof raw?.data === 'string' ? JSON.parse(raw.data) : raw;
        if (!state?.transport?.cardRoster?.length) throw new Error('original_cards_required');
        result = await request({ operation: 'register', game: 'bluffking', code: client.code, controlToken: client.hostToken,
          seats: state.transport.cardRoster.map((s, i) => ({ playerNum: i + 1, token: s.token })) });
      }
      if (!result?.capsule) throw new Error('registration_incomplete');
      client.executorTicket = { capsule: result.capsule, token: client.hostToken };
      const state = typeof raw?.data === 'string' ? JSON.parse(raw.data) : raw;
      rememberTable(client.code, 'bluffking', result.capsule, client.hostToken, state?.transport?.cardRoster);
      const view = result.payload?.viewJson ? JSON.parse(result.payload.viewJson) : result.payload?.view;
      if (view) client._emit(view);
      return result;
    })();
    client.executorPromise = task;
    try { return await task; }
    finally { if (client.executorPromise === task) client.executorPromise = null; client.executorRegistering = false; }
  }
  function patchHost(Host, game) {
    if (!Host || Object.prototype.hasOwnProperty.call(Host.prototype, 'executorPatched')) return;
    const p = Host.prototype;
    Object.defineProperty(p, 'executorPatched', { value: true });
    const originals = Object.fromEntries(['project', 'renew', 'change', 'command', 'start', 'status'].map(k => [k, p[k]]));
    const isServer = host => host.doc?.executor?.v === 1;
    const metadata = host => ({ capsule: host.doc.executor.capsule, token: host.ref.key });
    const register = host => {
      if (host.executorStarting || host.executorDeferred || host.executorRegistering || host.stopped || !host.doc?.state || isServer(host) || Date.now() < (host.executorRetryAt || 0)) return;
      return ensureHost(host, game).catch(() => { host.executorRetryAt = Date.now() + 60000; });
    };
    p.project = function (...args) {
      if (isServer(this) || this.executorRegistering) return;
      const result = originals.project.apply(this, args); void register(this); return result;
    };
    p.renew = function (...args) {
      if (!isServer(this)) return originals.renew.apply(this, args);
      if (this.stopped || !this.connected || this.executorPulsing) return Promise.resolve();
      this.executorPulsing = true;
      const ticket = metadata(this);
      return request({ operation: 'execute', ...ticket }).then(() => {
        // A successful pulse may leave the canonical document unchanged. The
        // initial value listener can run before Firebase reports connectivity,
        // so report readiness here rather than waiting for another snapshot.
        if (!this.stopped && this.connected && !this.suspended && isServer(this)
            && this.doc.executor.capsule === ticket.capsule) this.status('ready');
      }).catch(error => { if (error.code === 'game_switched') { this.suspended = true; this.status('switched'); } }).finally(() => { this.executorPulsing = false; });
    };
    p.change = function (...args) {
      if (isServer(this) || this.executorRegistering) return Promise.reject(new Error('not_available'));
      return originals.change.apply(this, args);
    };
    p.command = function (type, extra = {}) {
      if (!isServer(this)) return originals.command.call(this, type, extra);
      return request({ operation: 'execute', ...metadata(this), command: { ...extra, id: uid(), type,
        sessionId: this.doc.state.sessionId, turnId: this.doc.state.turnId, phaseId: this.doc.state.phaseId } }).then(async () => {
          if (typeof this.ref.once === 'function') {
            const snapshot = await this.ref.once('value'), raw = snapshot.val();
            if (raw) this.doc = { ...raw, state: raw.state || (raw.stateJson ? JSON.parse(raw.stateJson) : null) };
          }
          const error = this.doc.state?.replies?.[0]?.error;
          if (error) throw new Error(error);
          return this.doc.state;
        });
    };
    p.start = async function (...args) {
      this.executorStarting = true;
      try {
        if (this.executorPromise) { try { await this.executorPromise; } catch (_) {} }
        if (isServer(this)) {
          await request({ operation: 'release', ...metadata(this) });
          this.doc = { ...this.doc }; delete this.doc.executor;
          await originals.renew.call(this);
        }
        return await originals.start.apply(this, args);
      } finally {
        this.executorStarting = false;
        // Finish available service migration before the manager's start action
        // completes, so immediately closing that page still leaves cards ready.
        await register(this);
      }
    };
    p.status = function (status) {
      if (isServer(this) && this.connected && status !== 'switched') status = 'ready';
      if (status === 'switched') clearMembership(); else hostMembership(this, game);
      const setup = readLocal('room-session-' + this.room?.code);
      const savedCount = setup?.playerCount ?? this.room?.count;
      const storedCount = this.doc?.executor?.hubCount ?? this.doc?.state?.roster?.length;
      const changedNames = setup?.names && this.doc?.state?.roster?.slice(0, savedCount).some((row, i) => String(setup.names[i] || '').trim() && row.name !== String(setup.names[i]).trim());
      if (isServer(this) && this.room?.enabled && !this.executorRosterSyncing && (storedCount !== savedCount || changedNames)) {
        this.executorRosterSyncing = true;
        void syncRoster(this.room).catch(() => {}).finally(() => { this.executorRosterSyncing = false; });
      }
      return originals.status.call(this, status);
    };
  }
  function installBluff(Client) {
    if (!Client || Client.prototype.executorPatched) return;
    const p = Client.prototype;
    p.executorPatched = true;
    const original = p._hostRefresh, originalCommand = p.command, originalCards = p.createFromCards, originalEmit = p._emit;
    p._emit = function(view) { const result = originalEmit.call(this, view); if (this.executorTicket) membershipControl(view, { ...this.executorTicket, game: 'bluffking' }, this.isHost ? 0 : view.self?.playerNum || -1); return result; };
    p.createFromCards = async function (code, setup, options = {}) {
      this.executorStarting = true;
      try {
        if (this.executorPromise) { try { await this.executorPromise; } catch (_) {} }
        const roomCode = String(code).trim().toUpperCase();
        const token = this.storage.getItem('icebreak.bluff.host.' + roomCode);
        if (token) {
          const raw = (await this._request('/rooms/bluffking-' + roomCode + '/players/' + token)).data;
          if (raw?.executor?.v === 1) {
            const state = typeof raw.data === 'string' ? JSON.parse(raw.data) : raw;
            const room = state.rooms?.[roomCode], prior = state.transport?.cardRoster;
            const count = Number(setup?.playerCount ?? setup?.names?.length);
            const sameRoster = Array.isArray(prior) && count >= 3 && count <= 9 && prior.length === count &&
              setup?.tokens?.length === count && setup?.names?.length === count && prior.every((entry, i) =>
                /^[A-Za-z0-9_-]{12,128}$/.test(entry.originalToken || '') && entry.originalToken === setup.tokens[i] &&
                entry.name === setup.names[i] && room?.members?.find(member => member.identityId === entry.identityId)?.name === setup.names[i]);
            const retained = Array.isArray(prior) && count >= 3 && count <= 9 && setup?.tokens?.length === count && setup?.names?.length === count && prior.slice(0, Math.min(count, prior.length)).every((entry, i) => entry.originalToken === setup.tokens[i]);
            if (retained && !sameRoster) {
              const roster = Array.from({ length: Math.max(count, prior.length) }, (_, i) => ({ playerNum: i + 1, originalToken: i < count ? setup.tokens[i] : prior[i].originalToken, name: i < count ? setup.names[i] : prior[i].name }));
              const updated = await request({ operation: 'updateRoster', capsule: raw.executor.capsule, token, commandId: uid(), roster, hubCount: count });
              rememberTable(roomCode, 'bluffking', updated.capsule, token, roster);
              return await this.connect(roomCode);
            }
            if (sameRoster) {
              const cardsMatch = async () => {
                const originals = await Promise.all(prior.map(entry => this._request('/rooms/' + roomCode + '/players/' + entry.originalToken)));
                return originals.every(({ data }, i) => {
                  const card = data?.bluff, entry = prior[i];
                  if (room?.members?.find(member => member.identityId === entry.identityId)?.active === false) return true;
                  return data?.game === 'bluffking' && card?.version === 2 && card.room === roomCode &&
                    card.token === entry.token && card.identityId === entry.identityId && card.historyToken === entry.historyToken;
                });
              };
              // A valid active table retains its epoch, round and private cards.
              if (await cardsMatch()) {
                try { return await this.connect(roomCode); }
                catch (error) {
                  // A prior interrupted registration can seal the canonical
                  // state before publishing its new private cards. The current
                  // Hub manager may repair only that same original-card table.
                  // Reread after failure so a newer game's cards stay protected.
                  if (!options.replaceActive || error.code !== 'game_switched' || !await cardsMatch()) throw error;
                }
              }
            }
            await request({ operation: 'release', capsule: raw.executor.capsule, token });
          }
        }
        this.executorTicket = null; return await originalCards.call(this, code, setup, options);
      } finally { this.executorStarting = false; }
    };
    p._hostRefresh = async function () {
      const raw = (await this._request(this._roomPath('players/' + this.hostToken))).data;
      if (raw?.executor?.v === 1) {
        this.executorTicket = { capsule: raw.executor.capsule, token: this.hostToken };
        // Opening/observing an already published table only needs its verified
        // public snapshot. Commands and player pulses remain service-owned.
        const snapshot = typeof this._readHostSnapshot === 'function' ? await this._readHostSnapshot(raw) : null;
        if (snapshot) return this._emit(snapshot);
        const result = await request({ operation: 'execute', ...this.executorTicket });
        const view = result.payload?.viewJson ? JSON.parse(result.payload.viewJson) : result.payload?.view;
        return view ? this._emit(view) : this.lastView;
      }
      this.executorTicket = null;
      const view = await original.call(this, raw);
      const state = typeof raw?.data === 'string' ? JSON.parse(raw.data) : raw;
      if (state?.transport?.cardRoster?.length && !this.executorStarting && !this.executorDeferred && !this.executorRegistering && await ready()) {
        try { await ensureBluff(this); } catch (_) {}
      }
      return view;
    };
    p.command = async function (input) {
      if (!this.executorTicket) return originalCommand.call(this, input);
      const result = await request({ operation: 'execute', ...this.executorTicket,
        command: { ...input, commandId: input.commandId || uid() } });
      const view = result.payload?.viewJson ? JSON.parse(result.payload.viewJson) : result.payload?.view;
      if (result.payload?.ack?.ok === false) throw Object.assign(new Error(result.payload.ack.error?.message || 'Action unavailable'), { code: result.payload.ack.error?.code });
      return view ? this._emit(view) : this.refresh();
    };
  }
  async function registerWolf(client, doc) {
    if (!client.host || client.stopped) return false;
    if (doc?.executor?.v === 1) {
      await request({ operation: 'execute', capsule: doc.executor.capsule, token: client.host.control });
      return true;
    }
    if (!await ready()) return false;
    const data = typeof doc?.data === 'string' ? JSON.parse(doc.data) : null;
    if (!data?.cardLinks?.length || client.executorRegistering || Date.now() < (client.executorRetryAt || 0)) return false;
    client.executorRegistering = true;
    try {
      await request({ operation: 'register', game: 'chatwolf', code: client.host.code, controlToken: client.host.control,
        seats: [...data.cardLinks].sort((a,b) => a.playerNum-b.playerNum).map(s => ({ playerNum: s.playerNum, token: s.token })) });
      return true;
    } catch (_) { client.executorRetryAt = Date.now() + 60000; return false; }
    finally { client.executorRegistering = false; }
  }
  function install() {
    if (typeof BLUFF_SYNC !== 'undefined') installBluff(BLUFF_SYNC.Client);
    // Patch each concrete adapter, rather than its common superclass.
    if (typeof DIXIT_SYNC !== 'undefined') patchHost(DIXIT_SYNC.Host, 'dixit');
    if (typeof ONCE_SYNC !== 'undefined') patchHost(ONCE_SYNC.Host, 'onceupon');
    if (typeof CUT_SYNC !== 'undefined') patchHost(CUT_SYNC.Host, 'cut');
    if (typeof OPEN_MIC_SYNC !== 'undefined') patchHost(OPEN_MIC_SYNC.Host, 'openmic');
    if (typeof TALK_SYNC !== 'undefined') patchHost(TALK_SYNC.Host, 'letstalk');
  }
  if (typeof window !== 'undefined') {
    setInterval(() => { if (active) backgroundPulse(); }, 250);
    window.addEventListener('online', () => { lastPulse = 0; backgroundPulse(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastPulse = 0; backgroundPulse(); } });
  }
  return { request, ready, ensureHost, ensureBluff, registerWolf, observe, pulse, recover, isIndependent, install, syncRoster, watchHub, setParticipant, membershipControl, rememberTable };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HUB_EXECUTOR;