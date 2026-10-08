/* Independent execution is enabled only after the service seals a room ticket.
 * Player pages send their own token; no canonical credential leaves the service.
 */
var HUB_EXECUTOR = (() => {
  'use strict';
  const endpoint = '/api/hub-executor';
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
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(12000) });
    const data = await r.json(); if (!r.ok) throw Object.assign(new Error(data.error || 'executor_unavailable'), { code: data.error });
    return data;
  }
  function observe(data, token) {
    const ticket = data?.hubExecutor;
    if (!ticket || ticket.v !== 1 || !token || ticket.capsule === retiredCapsule) { current = null; active = false; recoveryControl([]); return; }
    const nested = data[{ onceupon: 'once', letstalk: 'talk' }[ticket.game] || ticket.game] || {};
    const action = data.talkAction || data.onceAction || data.dixitAction || data.cutAction || data.openmicAction || data.command || data.request;
    const actionId = action?.id || action?.commandId;
    const phaseKey = JSON.stringify([ticket.capsule, nested.turnId, nested.phaseId, nested.phase, nested.revealStage]);
    if (phaseKey !== current?.phaseKey || actionId && actionId !== current?.actionId) { lastPulse = 0; pendingWake = !!inflight; }
    current = { actionId, phaseKey, capsule: ticket.capsule, token, game: ticket.game, sessionId: ticket.sessionId, turnId: nested.turnId, phaseId: nested.phaseId };
    recoveryControl(['bluffking','chatwolf'].includes(ticket.game) ? [] : ticket.absentNums || []);
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
        retiredCapsule = snapshot.capsule; current = null; active = false; recoveryControl([]);
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
  function isIndependent(data) { return data?.hubExecutor?.v === 1 || data?.sharedControls === true; }
  function patchHost(Host, game) {
    if (!Host || Object.prototype.hasOwnProperty.call(Host.prototype, 'executorPatched')) return;
    const p = Host.prototype;
    Object.defineProperty(p, 'executorPatched', { value: true });
    const originals = Object.fromEntries(['project', 'renew', 'change', 'command', 'start', 'status'].map(k => [k, p[k]]));
    const isServer = host => host.doc?.executor?.v === 1;
    const metadata = host => ({ capsule: host.doc.executor.capsule, token: host.ref.key });
    const register = async host => {
      if (host.executorStarting || host.executorRegistering || host.stopped || !host.doc?.state || isServer(host) || Date.now() < (host.executorRetryAt || 0)) return;
      if (!await ready()) return;
      host.executorRegistering = true;
      try {
        await host.outgoing;
        if (host.projectionTasks) await Promise.all(host.projectionTasks.values());
        const seats = Array.from({ length: host.room.count }, (_, i) => ({ playerNum: i + 1, token: host.room.playerRef(i)?.key }));
        await request({ operation: 'register', game, code: host.room.code, controlToken: host.ref.key, sessionId: host.doc.state.sessionId, seats });
      } catch (_) { host.executorRetryAt = Date.now() + 60000; }
      finally { host.executorRegistering = false; }
    };
    p.project = function (...args) {
      if (isServer(this) || this.executorRegistering) return;
      const result = originals.project.apply(this, args); void register(this); return result;
    };
    p.renew = function (...args) {
      if (!isServer(this)) return originals.renew.apply(this, args);
      if (this.stopped || !this.connected || this.executorPulsing) return Promise.resolve();
      this.executorPulsing = true;
      return request({ operation: 'execute', ...metadata(this) }).catch(error => { if (error.code === 'game_switched') { this.suspended = true; this.status('switched'); } }).finally(() => { this.executorPulsing = false; });
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
        if (isServer(this)) {
          await request({ operation: 'release', ...metadata(this) });
          this.doc = { ...this.doc }; delete this.doc.executor;
          await originals.renew.call(this);
        }
        return await originals.start.apply(this, args);
      } finally { this.executorStarting = false; void register(this); }
    };
    p.status = function (status) {
      if (isServer(this) && this.connected && status !== 'switched') status = 'ready';
      return originals.status.call(this, status);
    };
  }
  function installBluff(Client) {
    if (!Client || Client.prototype.executorPatched) return;
    const p = Client.prototype;
    p.executorPatched = true;
    const original = p._hostRefresh, originalCommand = p.command, originalCards = p.createFromCards;
    p.createFromCards = async function (code, setup) {
      const token = this.storage.getItem('icebreak.bluff.host.' + String(code).trim().toUpperCase());
      if (token) {
        const raw = (await this._request('/rooms/bluffking-' + String(code).trim().toUpperCase() + '/players/' + token)).data;
        if (raw?.executor?.v === 1) await request({ operation: 'release', capsule: raw.executor.capsule, token });
      }
      this.executorTicket = null; return originalCards.call(this, code, setup);
    };
    p._hostRefresh = async function () {
      const raw = (await this._request(this._roomPath('players/' + this.hostToken))).data;
      if (raw?.executor?.v === 1) {
        this.executorTicket = { capsule: raw.executor.capsule, token: this.hostToken };
        const result = await request({ operation: 'execute', ...this.executorTicket });
        const view = result.payload?.viewJson ? JSON.parse(result.payload.viewJson) : result.payload?.view;
        return view ? this._emit(view) : this.lastView;
      }
      this.executorTicket = null;
      const view = await original.call(this);
      const state = typeof raw?.data === 'string' ? JSON.parse(raw.data) : raw;
      if (state?.transport?.cardRoster?.length && !this.executorRegistering && await ready()) {
        this.executorRegistering = true;
        try {
          const registered = await request({ operation: 'register', game: 'bluffking', code: this.code, controlToken: this.hostToken,
            seats: state.transport.cardRoster.map((s, i) => ({ playerNum: i + 1, token: s.token })) });
          this.executorTicket = { capsule: registered.capsule, token: this.hostToken };
        } catch (_) {} finally { this.executorRegistering = false; }
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
  return { request, ready, registerWolf, observe, pulse, recover, isIndependent, install };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HUB_EXECUTOR;