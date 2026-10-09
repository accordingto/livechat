'use strict';
const crypto = require('node:crypto');
const DEFAULT_DB = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const GRACE_MS = 60000;
const TOKEN = /^[a-f0-9]{20,64}$/;
const CODE = /^[A-Z0-9]{4,12}$/;
const SAME = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = value => value == null ? value : structuredClone(value);
function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }); }
function keyFrom(secret) {
  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) fail('executor_not_configured', 503);
  return Buffer.from(secret, 'hex');
}
function seal(value, key) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('icebreak-executor-v1'));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
function unseal(capsule, key) {
  if (typeof capsule !== 'string' || capsule.length > 24000 || !/^[\w-]+$/.test(capsule)) fail('invalid_ticket', 403);
  try {
    const bytes = Buffer.from(capsule, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from('icebreak-executor-v1')); decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  } catch { fail('invalid_ticket', 403); }
}
function adapters() {
  return { ...require('./story-executor.cjs').adapters, ...require('./party-executor.cjs').adapters,
    ...require('./bluff-executor.cjs').adapters, ...require('./wolf-executor.cjs').adapters };
}
function fingerprint(value) {
  const clean = value ? { ...value } : null;
  if (clean) for (const field of ['talkAction','onceAction','dixitAction','cutAction','openmicAction','command','heartbeat']) delete clean[field];
  return crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex');
}
// A copied service ticket cannot authorize a different game or a restarted
// session. The initial migration may still match its exact pre-service node.
function sameBinding(a, b) {
  return a.game === b.game && a.code === b.code && a.canonicalPath === b.canonicalPath &&
    a.controlToken === b.controlToken && SAME(a.seats, b.seats);
}
function currentCard(node, ticket, capsule, baseline, predecessor) {
  const field = { dixit: 'dixit', onceupon: 'once', letstalk: 'talk', cut: 'cut', openmic: 'openmic' }[ticket.game];
  if (node?.hubExecutor?.capsule === capsule) return !field || node.game === ticket.game && node[field]?.sessionId === ticket.sessionId;
  if (fingerprint(node) === baseline) return true;
  // An old writer may finish just after rotation's cross-node epoch read.
  // Repair that exact predecessor session, never a different/newer game.
  return !!field && !!predecessor && node?.hubExecutor?.capsule === predecessor.capsule &&
    node.game === predecessor.ticket.game && node[field]?.sessionId === predecessor.ticket.sessionId;
}
function createExecutor({ secret, archiveSecret, databaseURL = DEFAULT_DB, fetchImpl = globalThis.fetch, now = Date.now, games } = {}) {
  const key = keyFrom(secret); const registry = games || adapters();
  const archiveStore = archiveSecret == null ? null : require('./talk-archive-store.cjs').createStore({ secret: archiveSecret, fetchImpl, databaseURL });
  if (databaseURL !== DEFAULT_DB && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(databaseURL)) fail('invalid_database');
  function predecessor(executor, ticket) {
    if (!executor.previousCapsule) return null;
    const previous = unseal(executor.previousCapsule, key);
    if (!sameBinding(ticket, previous)) fail('stale_session', 409);
    return { capsule: executor.previousCapsule, ticket: previous };
  }
  async function read(path, etag = false) {
    const r = await fetchImpl(databaseURL + '/' + path + '.json', { headers: etag ? { 'X-Firebase-ETag': 'true' } : {}, signal: AbortSignal.timeout(8000) });
    if (!r.ok) fail('storage_unavailable', 503);
    return { data: await r.json(), etag: r.headers.get('etag') };
  }
  async function cas(path, change) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const snapshot = await read(path, true); if (!snapshot.etag) fail('unsafe_storage', 503);
      const next = await change(copy(snapshot.data));
      if (next === undefined || SAME(next, snapshot.data)) return snapshot.data;
      const r = await fetchImpl(databaseURL + '/' + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': snapshot.etag }, body: JSON.stringify(next), signal: AbortSignal.timeout(8000) });
      if (r.status === 412) continue;
      if (!r.ok) fail('storage_unavailable', 503);
      return next;
    }
    fail('room_busy', 409);
  }
  async function flushArchive(ticket, adapter, raw) {
    if (!archiveStore || !adapter?.archiveEntries || !raw) return raw;
    const entries = adapter.archiveEntries(adapter.decode(raw));
    if (!entries.length) return raw;
    // Never write from a canonical CAS callback: retries may run it repeatedly.
    // A failed sidecar write leaves the committed journal and withholds the
    // public receipt. A later authenticated retry can drain it after a switch.
    const versions = await archiveStore.writeRoom(ticket.code, entries);
    await cas(ticket.canonicalPath, current => {
      if (current?.executor?.v !== 1) return;
      const bound = unseal(current.executor.capsule, key);
      if (!sameBinding(bound, ticket)) return;
      const before = adapter.decode(current), next = adapter.ackArchive(before, versions);
      if (SAME(before, next)) return;
      const result = adapter.encode(current, next);
      // Journal housekeeping has no visible game change or new player receipt.
      result.revision = current.revision;
      return result;
    });
    // Publish only the snapshot whose complete journal was just persisted. A
    // concurrent command may have accepted newer, still-unflushed records.
    return raw;
  }
  function validate(body) {
    const { game, code, controlToken } = body;
    if (typeof game !== 'string' || !Object.hasOwn(registry, game) || !CODE.test(code || '') || !TOKEN.test(controlToken || '')) fail('invalid_registration');
    const prefix = game === 'bluffking' ? 'bluffking-' : game === 'chatwolf' ? 'chatwolf-' : '';
    const canonicalPath = `rooms/${prefix}${code}/players/${controlToken}`;
    let seats = body.seats;
    if (!Array.isArray(seats) || seats.length < 2 || seats.length > (game === 'chatwolf' ? 12 : 9)) fail('invalid_roster');
    const unique = new Set();
    seats = seats.map((s, i) => {
      if (s.playerNum !== i + 1 || !TOKEN.test(s.token || '') || unique.has(s.token) || s.token === controlToken) fail('invalid_roster');
      unique.add(s.token);
      return { playerNum: i + 1, token: s.token, path: `rooms/${prefix}${code}/players/${s.token}` };
    });
    return { v: 1, game, code, controlToken, canonicalPath, seats };
  }
  async function register(body) {
    const ticket = validate(body), adapter = registry[ticket.game], timestamp = now();
    const opening = await Promise.all(ticket.seats.map(s => read(s.path)));
    let capsule;
    const raw = await cas(ticket.canonicalPath, current => {
      if (!current) fail('room_missing', 404);
      const state = adapter.decode(current);
      if (!state) fail('room_missing', 404);
      if (adapter.validateRegistration) adapter.validateRegistration(state, ticket);
      if (ticket.game === 'bluffking') {
        if (!state.transport?.cardRoster?.length) fail('original_cards_required', 409);
        const roster = state.transport.cardRoster;
        if (ticket.seats.length !== roster.length || ticket.seats.some((s, i) => s.token !== roster[i].token)) fail('invalid_roster');
        state.transport.executorSessionId ||= crypto.randomUUID();
      } else if (state.roster && Object.keys(state.roster).length !== ticket.seats.length) fail('invalid_roster');
      const sessionId = adapter.session(state, ticket);
      if (!sessionId || (body.sessionId && body.sessionId !== sessionId)) fail('stale_session', 409);
      if (current.executor?.v === 1 && current.executor.sessionId === sessionId) { capsule = current.executor.capsule; return current; }
      ticket.sessionId = sessionId; ticket.epoch = crypto.randomUUID(); ticket.expiresAt = timestamp + 14 * 86400000;
      capsule = seal(ticket, key); state.sharedControls = true;
      const next = adapter.encode(current, state);
      next.owner = 'server'; next.leaseUntil = 0;
      next.executor = { v: 1, game: ticket.game, sessionId, epoch: ticket.epoch, capsule, createdAt: timestamp, presence: {},
        baselines: Object.fromEntries(ticket.seats.map((s, i) => [s.playerNum, fingerprint(opening[i].data)])) };
      return next;
    });
    // Registration finishes projecting before a browser releases its authority.
    const initialized = await execute({ capsule, token: ticket.controlToken });
    return { capsule, game: ticket.game, sessionId: raw.executor.sessionId,
      ...(ticket.game === 'bluffking' ? { payload: initialized.payload } : {}) };
  }
  async function execute(body) {
    const timestamp = now(), ticket = unseal(body.capsule, key), adapter = registry[ticket.game];
    if (!adapter || ticket.expiresAt < timestamp || !TOKEN.test(body.token || '')) fail('invalid_ticket', 403);
    const host = body.token === ticket.controlToken;
    const seat = ticket.seats.find(s => s.token === body.token);
    if (!host && !seat) fail('wrong_player', 403);
    const ctx = { ...ticket, seed: crypto.randomInt(0, 0x100000000), now: timestamp, actor: host ? 0 : seat.playerNum, seat };
    if (adapter.customExecute) return adapter.customExecute({ ticket, body, fetchImpl, databaseURL, now: timestamp });
    if (archiveStore && adapter.archiveEntries) {
      const initial = (await read(ticket.canonicalPath)).data;
      if (initial?.executor?.v === 1 && sameBinding(unseal(initial.executor.capsule, key), ticket)) await flushArchive(ticket, adapter, initial);
    }
    const cards = await Promise.all(ticket.seats.map(async s => ({ seat: s, node: (await read(s.path)).data })));
    let historySnapshots = [];
    if (adapter.historyWrites) {
      const initial = adapter.decode((await read(ticket.canonicalPath)).data);
      historySnapshots = await Promise.all(adapter.historyWrites(initial, ctx).map(async entry => ({ ...entry, remote: (await read(entry.path)).data })));
    }
    let publishNeeded = false;
    let raw = await cas(ticket.canonicalPath, async current => {
      if (current?.executor?.v !== 1) fail('stale_session', 409);
      let currentTicket = ticket, retryProjection = false;
      if (current.executor.capsule !== body.capsule) {
        // A previous epoch may only repair a failed card publication. It cannot
        // issue commands, process mailboxes or authorize a different roster.
        if (body.command || current.executor.previousCapsule !== body.capsule) fail('stale_session', 409);
        currentTicket = unseal(current.executor.capsule, key);
        if (currentTicket.expiresAt < timestamp || !sameBinding(currentTicket, ticket)) fail('stale_session', 409);
        retryProjection = true;
      }
      if (current.executor.epoch !== currentTicket.epoch || current.executor.sessionId !== currentTicket.sessionId) fail('stale_session', 409);
      Object.assign(ctx, { sessionId: currentTicket.sessionId, epoch: currentTicket.epoch, expiresAt: currentTicket.expiresAt });
      let state = adapter.decode(current);
      if (adapter.session(state, ctx) !== currentTicket.sessionId) fail('stale_session', 409);
      if (adapter.guard) await adapter.guard(state, { ...ctx, executor: current.executor, read: async path => (await read(path)).data });
      if (adapter.mergeHistories) state = adapter.mergeHistories(state, historySnapshots, ctx);
      ctx.seats = cards.map(({ seat: s, node }) => ({ ...s, card: node }));
      let executor = current.executor; executor.presence ||= {};
      if (seat) executor.presence[seat.playerNum] = timestamp;
      ctx.onlineNums = ticket.seats.filter(s => timestamp - (executor.presence[s.playerNum] || executor.createdAt) < GRACE_MS).map(s => s.playerNum);
      const prior = predecessor(executor, currentTicket);
      for (const item of cards) {
        if (!currentCard(item.node, currentTicket, current.executor.capsule, executor.baselines[item.seat.playerNum], prior)) fail('game_switched', 409);
      }
      if (!retryProjection) for (const item of cards) {
        const command = await adapter.command(item.node, { ...ctx, actor: item.seat.playerNum, seat: item.seat, state });
        if (command) state = await adapter.apply(state, command, { ...ctx, actor: item.seat.playerNum, seat: item.seat });
      }
      if (body.command) {
        if (typeof body.command !== 'object' || Array.isArray(body.command) || JSON.stringify(body.command).length > 16000) fail('invalid_command');
        state = await adapter.apply(state, body.command, ctx);
      }
      state.sharedControls = true;
      state = await adapter.pulse(state, ctx);
      const nextSession = adapter.session(state, ctx);
      if (!nextSession) fail('stale_session', 409);
      if (nextSession !== currentTicket.sessionId) {
        const replacement = { ...currentTicket, sessionId: nextSession, epoch: crypto.randomUUID(), expiresAt: timestamp + 14 * 86400000 };
        executor = { ...executor, sessionId: nextSession, epoch: replacement.epoch, capsule: seal(replacement, key),
          previousCapsule: current.executor.capsule,
          baselines: Object.fromEntries(cards.map(({ seat: s, node }) => [s.playerNum, fingerprint(node)])) };
        delete executor.originalCardBindingsSeen;
      }
      const next = SAME(state, adapter.decode(current)) ? { ...current } : adapter.encode(current, state); next.executor = executor; next.owner = 'server'; next.leaseUntil = timestamp + GRACE_MS;
      const absent = ticket.seats.filter(s => timestamp - (executor.presence[s.playerNum] || executor.createdAt) >= GRACE_MS).map(s => s.playerNum);
      const lagging = cards.some(({ node }) => node?.hubExecutor?.capsule !== executor.capsule || (node.hubExecutor.revision || 0) < (next.revision || 0));
      publishNeeded = lagging || !!executor.previousCapsule || body.clock !== true || executor.lastPublicationRevision !== (next.revision || 0) || !SAME(absent, executor.lastAbsentNums) || !executor.lastPublicationAt || timestamp - executor.lastPublicationAt >= 15000;
      if (publishNeeded) { executor.lastPublicationRevision = next.revision || 0; executor.lastPublicationAt = timestamp; executor.lastAbsentNums = absent; }
      return next;
    });
    raw = await flushArchive(ticket, adapter, raw);
    // Only the committed epoch is used below: an ETag retry may have minted
    // several replacement tickets before one canonical write succeeded.
    const publicationCapsule = raw.executor.capsule, publicationTicket = unseal(publicationCapsule, key);
    const state = adapter.decode(raw), prior = predecessor(raw.executor, publicationTicket);
    Object.assign(ctx, { sessionId: publicationTicket.sessionId, epoch: publicationTicket.epoch, expiresAt: publicationTicket.expiresAt,
      revision: raw.revision || 0, leaseEpoch: raw.leaseEpoch || 0, hostLiveUntil: timestamp + GRACE_MS });
    const absentNums = ticket.seats.filter(s => timestamp - (raw.executor.presence[s.playerNum] || raw.executor.createdAt) >= GRACE_MS).map(s => s.playerNum);
    let publicationComplete = false;
    if (publishNeeded) publicationComplete = (await Promise.all(cards.map(async ({ seat: target }) => {
      const payload = await adapter.project(state, target, ctx);
      if (!payload) return false;
      payload.hubExecutor = { v: 1, game: ticket.game, sessionId: publicationTicket.sessionId, capsule: publicationCapsule, absentNums, publishedAt: timestamp };
      const published = await cas(target.path, async old => {
        const authority = (await read(publicationTicket.canonicalPath)).data;
        if (authority?.executor?.capsule !== publicationCapsule || authority.executor.epoch !== publicationTicket.epoch) return;
        if (adapter.guard) await adapter.guard(state, { ...ctx, executor: raw.executor, target, read: async path => (await read(path)).data });
        if (!currentCard(old, publicationTicket, publicationCapsule, raw.executor.baselines[target.playerNum], prior)) return;
        const previous = old?.hubExecutor?.revision || 0;
        if (previous > (raw.revision || 0) || (previous === (raw.revision || 0) && (old?.hubExecutor?.publishedAt || 0) > timestamp)) return;
        payload.hubExecutor.revision = raw.revision || 0;
        return { ...(old || {}), ...payload };
      });
      return published?.hubExecutor?.capsule === publicationCapsule && currentCard(published, publicationTicket, publicationCapsule);
    }))).every(Boolean);
    if (publicationComplete && raw.executor.previousCapsule) await cas(ticket.canonicalPath, current => {
      if (current?.executor?.capsule !== publicationCapsule || current.executor.previousCapsule !== raw.executor.previousCapsule) return;
      const executor = { ...current.executor }; delete executor.previousCapsule;
      return { ...current, executor };
    });
    if (adapter.historyWrites) {
      if (adapter.guard) await adapter.guard(state, { ...ctx, executor: raw.executor, read: async path => (await read(path)).data });
      await Promise.all(adapter.historyWrites(state, ctx).map(entry => cas(entry.path, old => ({ known: { ...(old?.known || {}), ...(entry.history?.known || {}) }, seen: { ...(old?.seen || {}), ...(entry.history?.seen || {}) } }))));
    }
    const driver = ticket.seats.filter(s => raw.executor.presence?.[s.playerNum] && timestamp - raw.executor.presence[s.playerNum] < 10000).map(s => s.playerNum).sort((a,b) => a-b)[0];
    const fast = ticket.game === 'cut' && ['countdown','speaking','handoff'].includes(state.phase) || ticket.game === 'dixit' && state.phase === 'REVEALING' && !state.paused;
    const pollAfterMs = fast && seat?.playerNum === driver ? 500 : 5000;
    if (host) return { ok: true, pollAfterMs, payload: await adapter.project(state, { playerNum: 0 }, ctx) };
    return { ok: true, pollAfterMs };
  }
  async function release(body) {
    const ticket = unseal(body.capsule, key);
    if (body.token !== ticket.controlToken) fail('wrong_player', 403);
    const archiveInitial = (await read(ticket.canonicalPath)).data;
    if (archiveInitial?.executor?.capsule === body.capsule) await flushArchive(ticket, registry[ticket.game], archiveInitial);
    await cas(ticket.canonicalPath, raw => {
      if (raw?.executor?.capsule !== body.capsule) fail('stale_session', 409);
      let state = registry[ticket.game].decode(raw); if (registry[ticket.game].release) state = registry[ticket.game].release(state); delete state.sharedControls; if (state.rooms?.[ticket.code]) delete state.rooms[ticket.code].sharedControls;
      const next = registry[ticket.game].encode(raw, state); delete next.executor;
      next.owner = ''; next.leaseUntil = 0; return next;
    });
    return { ok: true };
  }
  return { register, execute, release };
}
module.exports = { createExecutor, seal, unseal, keyFrom, GRACE_MS };