'use strict';
const crypto = require('node:crypto');
const DEFAULT_DB = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const GRACE_MS = 60000;
const TOKEN = /^[a-f0-9]{20,64}$/;
const CODE = /^[A-Z0-9]{4,12}$/;
const ORIGINAL_TOKEN = /^[A-Za-z0-9_-]{12,128}$/;
const MEMBER_LIMITS = { dixit: 8, onceupon: 6, letstalk: 9, cut: 9, openmic: 9, bluffking: 9 };
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
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
function sameAuthority(a, b) {
  return a.game === b.game && a.code === b.code && a.canonicalPath === b.canonicalPath && a.controlToken === b.controlToken;
}
function extendsSeats(current, former) {
  return current.seats.length >= former.seats.length && former.seats.every((seat, i) =>
    current.seats[i]?.playerNum === seat.playerNum && current.seats[i]?.token === seat.token && current.seats[i]?.path === seat.path);
}
function currentCard(node, ticket, capsule, baseline, predecessor, target) {
  const field = { dixit: 'dixit', onceupon: 'once', letstalk: 'talk', cut: 'cut', openmic: 'openmic' }[ticket.game];
  if (node?.hubExecutor?.capsule === capsule) return !field || node.game === ticket.game && node[field]?.sessionId === ticket.sessionId;
  if (fingerprint(node) === baseline) return true;
  // An old writer may finish just after rotation's cross-node epoch read.
  // Repair that exact predecessor session, never a different/newer game.
  if (!field && ticket.game === 'bluffking' && predecessor && (!target || predecessor.ticket.seats.some(s => s.token === target.token && s.playerNum === target.playerNum))) {
    return node?.hubExecutor?.capsule === predecessor.capsule && node.hubExecutor.game === 'bluffking' && node.hubExecutor.sessionId === predecessor.ticket.sessionId && node.sessionBinding?.room === ticket.code;
  }
  return !!field && !!predecessor && (!target || predecessor.ticket.seats.some(s => s.token === target.token && s.playerNum === target.playerNum)) && node?.hubExecutor?.capsule === predecessor.capsule &&
    node.game === predecessor.ticket.game && node[field]?.sessionId === predecessor.ticket.sessionId;
}
function createExecutor({ secret, archiveSecret, databaseURL = DEFAULT_DB, fetchImpl = globalThis.fetch, now = Date.now, games } = {}) {
  const key = keyFrom(secret); const registry = games || adapters();
  const archiveStore = archiveSecret == null ? null : require('./talk-archive-store.cjs').createStore({ secret: archiveSecret, fetchImpl, databaseURL });
  if (databaseURL !== DEFAULT_DB && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(databaseURL)) fail('invalid_database');
  function predecessor(executor, ticket) {
    if (!executor.previousCapsule) return null;
    const previous = unseal(executor.previousCapsule, key);
    if (!sameBinding(ticket, previous) && !(executor.membershipPredecessor === true && sameAuthority(ticket, previous) && ticket.sessionId === previous.sessionId && extendsSeats(ticket, previous))) fail('stale_session', 409);
    return { capsule: executor.previousCapsule, ticket: previous };
  }
  function ownedCard(node, ticket, capsule, baseline, prior, target, executor) {
    if (currentCard(node, ticket, capsule, baseline, prior, target)) return true;
    const formerCapsule = node?.hubExecutor?.capsule;
    if (!formerCapsule || !executor?.membershipCapsules?.includes(hash(formerCapsule))) return false;
    const former = unseal(formerCapsule, key);
    if (!sameAuthority(ticket, former) || ticket.sessionId !== former.sessionId || !extendsSeats(ticket, former) ||
      !target || !former.seats.some(s => s.token === target.token && s.playerNum === target.playerNum)) return false;
    const field = { dixit:'dixit', onceupon:'once', letstalk:'talk', cut:'cut', openmic:'openmic' }[ticket.game];
    return field ? node.game === ticket.game && node[field]?.sessionId === ticket.sessionId :
      ticket.game === 'bluffking' && node.hubExecutor.game === ticket.game && node.hubExecutor.sessionId === ticket.sessionId && node.sessionBinding?.room === ticket.code;
  }
  function inactive(state, ctx) {
    const nums = registry[ctx.game]?.membershipInactive?.(state, ctx) || (Array.isArray(state?.roster) ? state.roster.filter(p => p?.active === false).map(p => p.playerNum) : []);
    return [...new Set(Array.from(nums || [], Number).filter(n => ctx.seats?.some(s => s.playerNum === n)))].sort((a, b) => a - b);
  }
  function eligible(state, number, ctx) {
    if (number === 0) return true;
    const custom = registry[ctx.game]?.membershipEligible;
    if (custom) return custom(state, number, ctx) === true;
    const row = (Array.isArray(state?.roster) ? state.roster : Object.values(state?.roster || {})).find(p => p?.playerNum === number);
    return row ? row.active !== false && row.pending !== true : ctx.game === 'bluffking' && ctx.seats?.some(s => s.playerNum === number);
  }
  function permittedCommand(state, command, number, ctx) {
    return eligible(state, number, ctx) || command?.type === 'exclude' && Number(command.playerNum) === number && command.active === true || command?.type === 'recover' && (state.runtimeOfflineNums || []).includes(number);
  }
  function membershipAuthorized(executor, incoming, current, capsule) {
    return incoming.sessionId === current.sessionId && sameAuthority(incoming, current) && extendsSeats(current, incoming) &&
      Array.isArray(executor.membershipCapsules) && executor.membershipCapsules.includes(hash(capsule));
  }
  function originalRoster(state, ticket, executor) {
    return ticket.seats.map((seat, i) => ({ playerNum: seat.playerNum,
      originalToken: executor?.membershipRoster?.[i]?.originalToken || (ticket.game === 'bluffking' ? state.transport?.cardRoster?.[i]?.originalToken : seat.token),
      name: executor?.membershipRoster?.[i]?.name || (ticket.game === 'bluffking' ? state.transport?.cardRoster?.[i]?.name : (Array.isArray(state.roster) ? state.roster : Object.values(state.roster || {})).find(p => p.playerNum === seat.playerNum)?.name) || '' }));
  }
  function commandIdentifier(body) {
    if (typeof body.commandId !== 'string' || !body.commandId || body.commandId.length > 100) fail('invalid_command');
    return hash(body.commandId);
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
  async function execute(body, membershipAttempt = 0) {
    const timestamp = now(), incomingTicket = unseal(body.capsule, key), adapter = registry[incomingTicket.game];
    let ticket = incomingTicket, capsuleUsed = body.capsule;
    if (!adapter || ticket.expiresAt < timestamp || !TOKEN.test(body.token || '')) fail('invalid_ticket', 403);
    const host = body.token === ticket.controlToken;
    let seat = ticket.seats.find(s => s.token === body.token);
    if (!host && !seat) fail('wrong_player', 403);
    if (adapter.customExecute) return adapter.customExecute({ ticket, body, fetchImpl, databaseURL, now: timestamp });
    const authority = (await read(ticket.canonicalPath)).data;
    if (authority?.executor?.capsule && authority.executor.capsule !== body.capsule) {
      const latest = unseal(authority.executor.capsule, key);
      if (membershipAuthorized(authority.executor, incomingTicket, latest, body.capsule)) { ticket = latest; capsuleUsed = authority.executor.capsule; seat = ticket.seats.find(s => s.token === body.token); }
    }
    const ctx = { ...ticket, seed: crypto.randomInt(0, 0x100000000), now: timestamp, actor: host ? 0 : seat.playerNum, seat };
    if (archiveStore && adapter.archiveEntries) {
      if (authority?.executor?.v === 1 && sameBinding(unseal(authority.executor.capsule, key), ticket)) await flushArchive(ticket, adapter, authority);
    }
    const cards = await Promise.all(ticket.seats.map(async s => ({ seat: s, node: (await read(s.path)).data })));
    let historySnapshots = [];
    if (adapter.historyWrites) {
      const initial = adapter.decode(authority);
      historySnapshots = await Promise.all(adapter.historyWrites(initial, ctx).map(async entry => ({ ...entry, remote: (await read(entry.path)).data })));
    }
    let publishNeeded = false;
    let raw;
    try { raw = await cas(ticket.canonicalPath, async current => {
      if (current?.executor?.v !== 1) fail('stale_session', 409);
      let currentTicket = ticket, retryProjection = false;
      if (current.executor.capsule !== capsuleUsed) {
        const latest = unseal(current.executor.capsule, key);
        if (membershipAuthorized(current.executor, incomingTicket, latest, body.capsule)) fail('membership_changed', 409);
        // A previous epoch may only repair a failed card publication. It cannot
        // issue commands, process mailboxes or authorize a different roster.
        if (body.command || current.executor.previousCapsule !== capsuleUsed) fail('stale_session', 409);
        currentTicket = unseal(current.executor.capsule, key);
        if (currentTicket.expiresAt < timestamp || !sameBinding(currentTicket, ticket)) fail('stale_session', 409);
        retryProjection = true;
      }
      if (current.executor.epoch !== currentTicket.epoch || current.executor.sessionId !== currentTicket.sessionId) fail('stale_session', 409);
      Object.assign(ctx, { sessionId: currentTicket.sessionId, epoch: currentTicket.epoch, expiresAt: currentTicket.expiresAt });
      let state = adapter.decode(current);
      if (adapter.session(state, ctx) !== currentTicket.sessionId) fail('stale_session', 409);
      ctx.membershipInactiveNums = inactive(state, ctx);
      if (adapter.guard) await adapter.guard(state, { ...ctx, executor: current.executor, read: async path => (await read(path)).data });
      if (body.command && !permittedCommand(state, body.command, ctx.actor, ctx)) fail('not_eligible', 403);
      if (adapter.mergeHistories) state = adapter.mergeHistories(state, historySnapshots, ctx);
      ctx.seats = cards.map(({ seat: s, node }) => ({ ...s, card: node }));
      let executor = current.executor; executor.presence ||= {};
      if (seat) executor.presence[seat.playerNum] = timestamp;
      ctx.onlineNums = ticket.seats.filter(s => (!ctx.membershipInactiveNums.includes(s.playerNum) || (state.runtimeOfflineNums || []).includes(s.playerNum)) && timestamp - (executor.presence[s.playerNum] || executor.createdAt) < GRACE_MS).map(s => s.playerNum);
      const prior = predecessor(executor, currentTicket);
      for (const item of cards) {
        const owned = ownedCard(item.node, currentTicket, current.executor.capsule, executor.baselines[item.seat.playerNum], prior, item.seat, executor);
        if (!owned && !ctx.membershipInactiveNums.includes(item.seat.playerNum)) fail('game_switched', 409);
        item.owned = owned;
        if (!owned) ctx.seats.find(s => s.playerNum === item.seat.playerNum).card = null;
      }
      if (!retryProjection) for (const item of cards) {
        if (!item.owned) continue;
        const command = await adapter.command(item.node, { ...ctx, actor: item.seat.playerNum, seat: item.seat, state });
        if (command && permittedCommand(state, command, item.seat.playerNum, ctx)) state = await adapter.apply(state, command, { ...ctx, actor: item.seat.playerNum, seat: item.seat });
      }
      if (body.command) {
        if (typeof body.command !== 'object' || Array.isArray(body.command) || JSON.stringify(body.command).length > 16000) fail('invalid_command');
        state = await adapter.apply(state, body.command, ctx);
      }
      state.sharedControls = true;
      const remainingInactive = inactive(state, ctx);
      // Legacy card controls also return seats through exclude/recover. Their
      // adapter may clear active=false, but a different game must still win.
      for (const number of ctx.membershipInactiveNums.filter(n => !remainingInactive.includes(n))) {
        const target = currentTicket.seats.find(s => s.playerNum === number);
        const fresh = (await read(target.path)).data;
        if (!ownedCard(fresh, currentTicket, current.executor.capsule, executor.baselines[number], prior, target, executor)) fail('game_switched', 409);
        if (ticket.game === 'bluffking') {
          const entry = state.transport.cardRoster[number - 1], source = (await read(`rooms/${ticket.code}/players/${entry.originalToken}`)).data;
          if (source?.game !== 'bluffking' || source.bluff?.version !== 2 || source.bluff.room !== ticket.code || source.bluff.token !== entry.token || source.bluff.identityId !== entry.identityId || source.bluff.historyToken !== entry.historyToken) fail('game_switched', 409);
        }
      }
      ctx.membershipInactiveNums = remainingInactive;
      executor.membershipInactiveNums = ctx.membershipInactiveNums;
      ctx.onlineNums = ctx.onlineNums.filter(n => !ctx.membershipInactiveNums.includes(n) || (state.runtimeOfflineNums || []).includes(n));
      state = await adapter.pulse(state, ctx);
      const nextSession = adapter.session(state, ctx);
      if (!nextSession) fail('stale_session', 409);
      if (nextSession !== currentTicket.sessionId) {
        const replacement = { ...currentTicket, sessionId: nextSession, epoch: crypto.randomUUID(), expiresAt: timestamp + 14 * 86400000 };
        executor = { ...executor, sessionId: nextSession, epoch: replacement.epoch, capsule: seal(replacement, key),
          previousCapsule: current.executor.capsule,
          baselines: Object.fromEntries(cards.map(({ seat: s, node }) => [s.playerNum, fingerprint(node)])) };
        delete executor.originalCardBindingsSeen;
        delete executor.membershipCapsules; delete executor.membershipPredecessor; delete executor.membershipCommands;
      }
      const next = SAME(state, adapter.decode(current)) ? { ...current } : adapter.encode(current, state); next.executor = executor; next.owner = 'server'; next.leaseUntil = timestamp + GRACE_MS;
      const absent = ticket.seats.filter(s => timestamp - (executor.presence[s.playerNum] || executor.createdAt) >= GRACE_MS).map(s => s.playerNum);
      const lagging = cards.some(({ node }) => node?.hubExecutor?.capsule !== executor.capsule || (node.hubExecutor.revision || 0) < (next.revision || 0));
      publishNeeded = lagging || !!executor.previousCapsule || body.clock !== true || executor.lastPublicationRevision !== (next.revision || 0) || !SAME(absent, executor.lastAbsentNums) || !executor.lastPublicationAt || timestamp - executor.lastPublicationAt >= 15000;
      if (publishNeeded) { executor.lastPublicationRevision = next.revision || 0; executor.lastPublicationAt = timestamp; executor.lastAbsentNums = absent; }
      return next;
    }); } catch (error) {
      if (error.code === 'membership_changed' && membershipAttempt < 7) return execute(body, membershipAttempt + 1);
      throw error;
    }
    raw = await flushArchive(ticket, adapter, raw);
    // Only the committed epoch is used below: an ETag retry may have minted
    // several replacement tickets before one canonical write succeeded.
    const publicationCapsule = raw.executor.capsule, publicationTicket = unseal(publicationCapsule, key);
    const state = adapter.decode(raw), prior = predecessor(raw.executor, publicationTicket);
    ctx.membershipInactiveNums = inactive(state, ctx);
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
        // Sitting out changes membership without rotating the same-session
        // capsule. A delayed archive writer must not restore its older roster.
        if ((authority.executor.membershipRevision || 0) !== (raw.executor.membershipRevision || 0)) return;
        if (adapter.guard) await adapter.guard(state, { ...ctx, executor: raw.executor, target, read: async path => (await read(path)).data });
        if (!ownedCard(old, publicationTicket, publicationCapsule, raw.executor.baselines[target.playerNum], prior, target, raw.executor)) return;
        const previous = old?.hubExecutor?.revision || 0;
        if (previous > (raw.revision || 0) || (previous === (raw.revision || 0) && (old?.hubExecutor?.publishedAt || 0) > timestamp)) return;
        payload.hubExecutor.revision = raw.revision || 0;
        return { ...(old || {}), ...payload };
      });
      return ctx.membershipInactiveNums.includes(target.playerNum) && !ownedCard(published, publicationTicket, publicationCapsule, raw.executor.baselines[target.playerNum], prior, target, raw.executor) || published?.hubExecutor?.capsule === publicationCapsule && currentCard(published, publicationTicket, publicationCapsule);
    }))).every(Boolean);
    if (publicationComplete && raw.executor.previousCapsule) await cas(ticket.canonicalPath, current => {
      if (current?.executor?.capsule !== publicationCapsule || current.executor.previousCapsule !== raw.executor.previousCapsule) return;
      if ((current.executor.membershipRevision || 0) !== (raw.executor.membershipRevision || 0)) return;
      const executor = { ...current.executor }; delete executor.previousCapsule; delete executor.membershipPredecessor;
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
  async function membershipResult(raw, body) {
    const ticket = unseal(raw.executor.capsule, key), adapter = registry[ticket.game];
    // Membership can cancel handwritten missions. Persist its committed journal
    // before any receipt or private projection, including exact receipt retries.
    raw = await flushArchive(ticket, adapter, raw);
    // Bluff owns a separate private channel. Bind only the exact newly admitted
    // Hub source, and never overwrite a card that moved while admission waited.
    if (ticket.game === 'bluffking') {
      const state = adapter.decode(raw), away = inactive(state, { ...ticket, seats: ticket.seats });
      for (const entry of state.transport.cardRoster || []) {
        const number = entry.playerNum || (state.transport.cardRoster.indexOf(entry) + 1);
        if (away.includes(number)) continue;
        const expected = { version: 2, room: ticket.code, token: entry.token, identityId: entry.identityId, historyToken: entry.historyToken };
        const baseline = raw.executor.membershipSourceBaselines?.[entry.originalToken];
        if (!baseline) continue;
        await cas(`rooms/${ticket.code}/players/${entry.originalToken}`, async old => {
          const authority = (await read(ticket.canonicalPath)).data;
          if (authority?.executor?.capsule !== raw.executor.capsule || authority.executor.epoch !== ticket.epoch) fail('stale_session', 409);
          if (old?.game === 'bluffking' && old.bluff?.version === 2 && old.bluff.room === ticket.code && old.bluff.token === entry.token && old.bluff.identityId === entry.identityId && old.bluff.historyToken === entry.historyToken) return old;
          if (fingerprint(old) !== baseline) fail('game_switched', 409);
          return { ...old, game: 'bluffking', playerNum: entry.playerNum || (state.transport.cardRoster.indexOf(entry) + 1), name: entry.name, bluff: expected };
        });
      }
    }
    const result = await execute({ capsule: raw.executor.capsule, token: ticket.controlToken });
    const latest = (await read(ticket.canonicalPath)).data;
    if (latest?.executor?.capsule !== raw.executor.capsule) fail('stale_session', 409);
    const inactiveNums = inactive(adapter.decode(latest), { ...ticket, seats: ticket.seats });
    const projections = await Promise.all(ticket.seats.filter(s => !inactiveNums.includes(s.playerNum)).map(s => read(s.path)));
    if (projections.some(s => s.data?.hubExecutor?.capsule !== raw.executor.capsule || s.data.hubExecutor.sessionId !== ticket.sessionId)) fail('registration_incomplete', 503);
    return { ok: true, capsule: raw.executor.capsule, game: ticket.game, sessionId: ticket.sessionId,
      membershipRevision: latest.executor.membershipRevision || 0, inactiveNums, payload: result.payload };
  }
  async function changeMembership(body, operation) {
    const timestamp = now(), incoming = unseal(body.capsule, key), adapter = registry[incoming.game];
    if (!adapter || !MEMBER_LIMITS[incoming.game] || typeof adapter.membership !== 'function') fail('membership_not_supported', 409);
    if (incoming.expiresAt < timestamp || !TOKEN.test(body.token || '')) fail('invalid_ticket', 403);
    const host = body.token === incoming.controlToken, actorSeat = incoming.seats.find(s => s.token === body.token);
    if (!host && !actorSeat) fail('wrong_player', 403);
    if (operation === 'updateRoster' && !host) fail('host_only', 403);
    const receiptKey = commandIdentifier(body);
    let requestedRoster = [];
    if (operation === 'updateRoster') {
      if (!Array.isArray(body.roster) || body.roster.length < incoming.seats.length || body.roster.length > MEMBER_LIMITS[incoming.game]) fail('invalid_roster');
      const tokens = new Set();
      requestedRoster = body.roster.map((entry, i) => {
        if (!entry || entry.playerNum !== i + 1 || !ORIGINAL_TOKEN.test(entry.originalToken || '') ||
          (incoming.game !== 'bluffking' && !TOKEN.test(entry.originalToken)) || tokens.has(entry.originalToken) || entry.originalToken === incoming.controlToken) fail('invalid_roster');
        tokens.add(entry.originalToken);
        return { playerNum: i + 1, originalToken: entry.originalToken, name: String(entry.name || '').trim().slice(0, incoming.game === 'bluffking' ? 40 : 80) };
      });
      if (body.hubCount != null && (!Number.isInteger(body.hubCount) || body.hubCount < 1 || body.hubCount > requestedRoster.length)) fail('invalid_roster');
      if (body.inactiveNums != null && (!Array.isArray(body.inactiveNums) || body.inactiveNums.some(n => !Number.isInteger(n) || n < 1 || n > requestedRoster.length))) fail('invalid_roster');
    } else if (!Number.isInteger(body.playerNum) || body.playerNum < 1 || typeof body.active !== 'boolean') fail('invalid_player');
    const requestFingerprint = hash(JSON.stringify([operation, body.token, requestedRoster, body.inactiveNums == null ? null : [...new Set(body.inactiveNums)].sort((a,b)=>a-b), body.hubCount ?? null, body.playerNum ?? null, body.active ?? null]));
    const opening = (await read(incoming.canonicalPath)).data;
    if (opening?.executor?.v !== 1) fail('stale_session', 409);
    const ticket = unseal(opening.executor.capsule, key), state = adapter.decode(opening);
    if (!sameAuthority(ticket, incoming) || ticket.sessionId !== incoming.sessionId || opening.executor.epoch !== ticket.epoch) fail('stale_session', 409);
    const duplicate = opening.executor.membershipCommands?.[receiptKey];
    if (duplicate && duplicate.fingerprint !== requestFingerprint) fail('command_conflict', 409);
    if (opening.executor.capsule !== body.capsule && !membershipAuthorized(opening.executor, incoming, ticket, body.capsule)) fail('stale_session', 409);
    if (operation === 'updateRoster' && opening.executor.capsule !== body.capsule && !duplicate) fail('stale_session', 409);
    if (duplicate) return membershipResult(opening, body);
    // Drain already accepted records before changing membership. Sidecar writes
    // stay outside CAS callbacks and the post-commit flush uses the new ticket.
    await flushArchive(ticket, adapter, opening);
    const previousRoster = originalRoster(state, ticket, opening.executor);
    if (operation === 'updateRoster' && (requestedRoster.length < previousRoster.length || previousRoster.some((row,i) => row.originalToken !== requestedRoster[i]?.originalToken))) fail('invalid_roster');
    if (operation === 'setParticipant' && !ticket.seats.some(s => s.playerNum === body.playerNum)) fail('invalid_player');
    const prefix = ticket.game === 'bluffking' ? 'bluffking-' : '';
    const added = operation === 'updateRoster' ? requestedRoster.slice(previousRoster.length).map(row => ({ ...row,
      token: ticket.game === 'bluffking' ? crypto.randomBytes(32).toString('hex') : row.originalToken,
      ...(ticket.game === 'bluffking' ? { identityId: crypto.randomBytes(20).toString('hex'), historyToken: crypto.randomBytes(32).toString('hex') } : {}) })) : [];
    const newSeats = [...ticket.seats, ...added.map(row => ({ playerNum: row.playerNum, token: row.token, path: `rooms/${prefix}${ticket.code}/players/${row.token}` }))];
    const currentCards = await Promise.all(ticket.seats.map(async seat => ({ seat, node: (await read(seat.path)).data })));
    const sources = await Promise.all(added.map(async row => ({ row, node: (await read(`rooms/${ticket.code}/players/${row.originalToken}`)).data })));
    if (sources.some(({row,node}) => node != null && (typeof node !== 'object' || Array.isArray(node) || node.playerNum != null && Number(node.playerNum) !== row.playerNum))) fail('original_cards_required', 409);
    const newPrivate = ticket.game === 'bluffking' ? await Promise.all(added.map(row => read(`rooms/${prefix}${ticket.code}/players/${row.token}`))) : sources.map(s => ({ data:s.node }));
    if (ticket.game === 'bluffking' && newPrivate.some(s => s.data != null)) fail('room_busy', 409);
    const raw = await cas(ticket.canonicalPath, async current => {
      if (current?.executor?.v !== 1 || current.executor.epoch !== ticket.epoch || current.executor.sessionId !== ticket.sessionId) fail('stale_session', 409);
      const existingReceipt = current.executor.membershipCommands?.[receiptKey];
      if (existingReceipt) { if (existingReceipt.fingerprint !== requestFingerprint) fail('command_conflict', 409); return current; }
      if (current.executor.capsule !== opening.executor.capsule) fail('stale_session', 409);
      let nextState = adapter.decode(current);
      if (adapter.session(nextState, ticket) !== ticket.sessionId) fail('stale_session', 409);
      const ctx = { ...ticket, seats: newSeats, actor: host ? 0 : actorSeat.playerNum, now: timestamp,
        seed: Number.parseInt(requestFingerprint.slice(0,8),16), id: body.commandId, commandId: body.commandId, executor: current.executor,
        read: async path => (await read(path)).data };
      const previousInactiveNums = inactive(nextState, ctx);
      ctx.membershipInactiveNums = previousInactiveNums;
      let inactiveNums = operation === 'updateRoster' && body.inactiveNums != null ? [...new Set(body.inactiveNums)].sort((a,b)=>a-b) : ctx.membershipInactiveNums.slice();
      const hubRemoved = new Set(current.executor.hubRemovedNums || []);
      if (operation === 'setParticipant') {
        inactiveNums = inactiveNums.filter(n=>n!==body.playerNum); if (!body.active) inactiveNums.push(body.playerNum);
        hubRemoved.delete(body.playerNum);
      } else if (body.hubCount != null) {
        const oldCount = current.executor.hubCount ?? ticket.seats.length;
        if (body.hubCount < oldCount) for (const seat of newSeats.filter(s=>s.playerNum>body.hubCount)) {
          if (!inactiveNums.includes(seat.playerNum)) { inactiveNums.push(seat.playerNum); hubRemoved.add(seat.playerNum); }
        }
        if (body.hubCount > oldCount) for (const n of [...hubRemoved]) if (n<=body.hubCount) { inactiveNums=inactiveNums.filter(v=>v!==n); hubRemoved.delete(n); }
      }
      ctx.membershipInactiveNums = [...new Set(inactiveNums)].sort((a,b)=>a-b);
      if (operation === 'setParticipant' && !host && !eligible(nextState, actorSeat.playerNum, ctx) && !(body.playerNum === actorSeat.playerNum && body.active)) fail('not_eligible', 403);
      // A voluntarily absent seat must still own its exact card before returning.
      const prior = predecessor(current.executor, ticket);
      for (const {seat,node} of currentCards) {
        if (!ownedCard(node, ticket, current.executor.capsule, current.executor.baselines[seat.playerNum], prior, seat, current.executor) && !ctx.membershipInactiveNums.includes(seat.playerNum)) fail('game_switched', 409);
      }
      async function verifyReturning(number) {
        const target = currentCards.find(item => item.seat.playerNum === number);
        if (!target || !ownedCard((await read(target.seat.path)).data, ticket, current.executor.capsule, current.executor.baselines[target.seat.playerNum], prior, target.seat, current.executor)) fail('game_switched', 409);
        if (ticket.game === 'bluffking') {
          const entry = nextState.transport.cardRoster[number - 1], source = (await read(`rooms/${ticket.code}/players/${entry.originalToken}`)).data;
          if (source?.game !== 'bluffking' || source.bluff?.version !== 2 || source.bluff.room !== ticket.code || source.bluff.token !== entry.token || source.bluff.identityId !== entry.identityId || source.bluff.historyToken !== entry.historyToken) fail('game_switched', 409);
        }
      }
      if (!host) await verifyReturning(actorSeat.playerNum);
      if (operation === 'setParticipant' && body.active) {
        await verifyReturning(body.playerNum);
        const target = currentCards.find(item => item.seat.playerNum === body.playerNum);
        if (!ownedCard(target.node, ticket, current.executor.capsule, current.executor.baselines[target.seat.playerNum], prior, target.seat, current.executor)) fail('game_switched', 409);
        if (adapter.guard) await adapter.guard(nextState, { ...ctx, membershipInactiveNums: ctx.membershipInactiveNums.filter(n=>n!==body.playerNum), target: target.seat });
      }
      if (adapter.guard) await adapter.guard(nextState, ctx);
      for (const source of sources) {
        if (fingerprint((await read(`rooms/${ticket.code}/players/${source.row.originalToken}`)).data) !== fingerprint(source.node)) fail('game_switched', 409);
      }
      for (const number of previousInactiveNums) if (!inactiveNums.includes(number)) await verifyReturning(number);
      ctx.onlineNums = newSeats.filter(seat => !inactiveNums.includes(seat.playerNum) && (added.some(row=>row.playerNum===seat.playerNum) || timestamp - (current.executor.presence?.[seat.playerNum] || current.executor.createdAt) < GRACE_MS)).map(s=>s.playerNum);
      nextState = await adapter.membership(nextState, { added, roster: operation === 'updateRoster' ? requestedRoster : [], inactiveNums: [...new Set(inactiveNums)].sort((a,b)=>a-b) }, ctx);
      if (!nextState || adapter.session(nextState, ctx) !== ticket.sessionId) fail('stale_session', 409);
      nextState.sharedControls = true;
      const executor = { ...current.executor, presence: {...current.executor.presence}, baselines: {...current.executor.baselines},
        membershipRevision: (current.executor.membershipRevision || 0) + 1, hubRemovedNums:[...hubRemoved].sort((a,b)=>a-b),
        membershipRoster: operation === 'updateRoster' ? requestedRoster : previousRoster,
        ...(body.hubCount != null ? {hubCount:body.hubCount} : {}),
        membershipCommands: {...current.executor.membershipCommands, [receiptKey]:{fingerprint:requestFingerprint,operation,at:timestamp}} };
      const receiptKeys = Object.keys(executor.membershipCommands).sort((a,b)=>(executor.membershipCommands[a].at||0)-(executor.membershipCommands[b].at||0)); for (const old of receiptKeys.slice(0,Math.max(0,receiptKeys.length-32))) delete executor.membershipCommands[old];
      if (added.length) {
        const replacement = {...ticket,seats:newSeats,epoch:crypto.randomUUID(),expiresAt:timestamp+14*86400000};
        executor.epoch=replacement.epoch; executor.capsule=seal(replacement,key); executor.previousCapsule=current.executor.capsule; executor.membershipPredecessor=true;
        executor.membershipCapsules=[...new Set([...(current.executor.membershipCapsules||[]),hash(current.executor.capsule)])].slice(-9);
        executor.membershipSourceBaselines={...current.executor.membershipSourceBaselines};
        for (let i=0;i<added.length;i++) { const row=added[i]; executor.baselines[row.playerNum]=fingerprint(newPrivate[i].data); executor.presence[row.playerNum]=timestamp;
          if(ticket.game==='bluffking') executor.membershipSourceBaselines[row.originalToken]=fingerprint(sources[i].node); }
      }
      executor.membershipInactiveNums=inactive(nextState,{...ctx,seats:newSeats});
      const next=adapter.encode(current,nextState); next.executor=executor; next.owner='server'; next.leaseUntil=timestamp+GRACE_MS;
      return next;
    });
    return membershipResult(raw,body);
  }
  const updateRoster = body => changeMembership(body,'updateRoster');
  const setParticipant = body => changeMembership(body,'setParticipant');
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
  return { register, execute, release, updateRoster, setParticipant };
}
module.exports = { createExecutor, seal, unseal, keyFrom, GRACE_MS };