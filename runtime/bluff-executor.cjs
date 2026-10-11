/* Server-only adapter for the original Bluff King state and private card nodes.
 * Never distribute the canonical bearer, join private key or another seat's token. */
'use strict';

const E = require('../bluff-king-engine.js');
const topics = require('../bluff-king-topics.js');

function fail(code, message, status = 403) { const error = new Error(message); error.code = code; error.status = status; throw error; }
function decode(raw) {
  const state = typeof raw?.data === 'string' ? JSON.parse(raw.data) : structuredClone(raw);
  if (!state || typeof state !== 'object' || !state.rooms || !state.transport) fail('room_not_found', 'The saved Bluff room could not be restored.', 404);
  state.identities ||= {}; for (const who of Object.values(state.identities)) { who.known ||= {}; who.seen ||= {}; } state.transport.members ||= {}; state.transport.accepted ||= {}; state.transport.acknowledgements ||= {};
  for (const room of Object.values(state.rooms)) {
    for (const key of ['members', 'roster', 'thinkerOrder', 'history', 'usedKnowledgeIds']) room[key] ||= [];
    for (const key of ['scores', 'processed']) room[key] ||= {};
    room.round ||= null;
    if (room.round) {
      for (const key of ['publicHints', 'spotlightOrder', 'coveredIds', 'readyIds']) room.round[key] ||= [];
      for (const key of ['questionId', 'truthfulId', 'challengeId', 'selectedId']) room.round[key] ??= null;
    }
  }
  return state;
}
function roomFor(state, ctx) { const room = state.rooms[E.normalizeCode(ctx.code)]; if (!room) fail('room_not_found', 'This Bluff room is unavailable.', 404); return room; }
function bindSeat(state, seat, ctx) {
  const room = roomFor(state, ctx);
  // Identity supplied by a request is never an authorization source.
  const found = Object.entries(state.transport.members).find(([, member]) => member.token === seat?.token);
  if (!found || !room.members.some(member => member.identityId === found[0])) fail('invalid_card_session', 'This card does not belong to the current Bluff game.');
  const card = state.transport.cardRoster?.[Number(seat.playerNum) - 1];
  if (state.transport.cardRoster?.length && (!card || card.token !== seat.token || card.identityId !== found[0])) fail('invalid_card_session', 'This card is bound to a different Bluff seat.');
  return { identityId: found[0], credential: found[1], member: room.members.find(member => member.identityId === found[0]) };
}
function assignPlayerNums(state, ctx) {
  const room = roomFor(state, ctx);
  if (!Array.isArray(room.members)) return;
  for (let i = 0; i < (state.transport.cardRoster || []).length; i++) {
    const item = state.transport.cardRoster[i], member = room.members.find(p => p.identityId === item.identityId);
    if (member) member.playerNum = Number(item.playerNum) || i + 1;
  }
}
function connectedIds(state, ctx) {
  const room = roomFor(state, ctx);
  if (!Array.isArray(ctx.onlineNums)) return room.members.filter(member => member.seated || room.roster.includes(member.id)).map(member => member.id);
  const online = new Set(ctx.onlineNums);
  return (ctx.seats || []).filter(s => online.has(s.playerNum)).map(s => bindSeat(state, s, ctx).member.id);
}
function gameOptions(state, ctx) { return { now: ctx.now ?? Date.now(), onlinePlayerIds: connectedIds(state, ctx), ...(ctx.rng ? { rng: ctx.rng } : {}), ...(ctx.uuid ? { uuid: ctx.uuid } : {}) }; }
function mergeHistory(a, b) { return { known: { ...(b?.known || {}), ...(a?.known || {}) }, seen: { ...(b?.seen || {}), ...(a?.seen || {}) } }; }


function sourceBinding(source) {
  if (!source || typeof source !== 'object') return JSON.stringify(null);
  const game = typeof source.game === 'string' ? source.game : null;
  const key = ({ onceupon:'once', letstalk:'talk', bluffking:'bluff', chatwolf:'chatWolf' })[game] || game;
  const node = source[key] && typeof source[key] === 'object' ? source[key] : {};
  // Phase, points, deadline and retained executor metadata are allowed to
  // change while registration waits for its first correct Hub publication.
  const fields = Object.fromEntries(['sessionId','room','token','identityId','historyToken','version']
    .filter(name => node[name] != null && ['string','number','boolean'].includes(typeof node[name]))
    .map(name => [name,node[name]]));
  return JSON.stringify([game,source.sessionId || null,fields]);
}

const bluffking = {
  decode,
  encode(raw, state) {
    return { ...(raw || {}), data: JSON.stringify(state), revision: Math.max(Number(raw?.revision) || 0, Number(state.transport.publicationRevision) || 0) };
  },
  session(state) {
    if (typeof state.transport.executorSessionId !== 'string' || !state.transport.executorSessionId) fail('executor_not_registered', 'This room has not enabled the room service.', 409);
    return state.transport.executorSessionId;
  },
  async guard(state, ctx) {
    const room = roomFor(state, ctx), roster = state.transport.cardRoster;
    if (!Array.isArray(roster) || !roster.length) fail('original_cards_required', 'The original Hub cards are missing.', 409);
    if (typeof ctx.read !== 'function') fail('unsafe_storage', 'The room service cannot verify its original player cards.', 503);
    if (ctx.executor?.v !== 1) fail('unsafe_storage', 'This room is missing its registered executor epoch.', 503);
    const seen = ctx.executor.originalCardBindingsSeen ||= {};
    const baselines = ctx.executor.originalCardBaselines ||= {};
    assignPlayerNums(state, ctx);
    const selected = ctx.target ? roster.filter(entry => entry.token === ctx.target.token) : roster;
    if (!selected.length) fail('invalid_card_session', 'This projection does not belong to a current Bluff seat.');
    const overrideInactive = Array.isArray(ctx.membershipInactiveNums) ? new Set(ctx.membershipInactiveNums) : null;
    const entries = selected.filter(entry => overrideInactive ? !overrideInactive.has(Number(entry.playerNum) || roster.indexOf(entry) + 1) : room.members?.find(p => p.identityId === entry.identityId)?.active !== false);
    if (!entries.length) return state;
    for (const entry of entries) {
      if (!/^[A-Za-z0-9_-]{12,128}$/.test(entry.originalToken || '')) fail('original_cards_required', 'This Bluff seat is missing its original Hub card.', 409);
    }
    // Every path is an independently bound source card. Read one network wave
    // before checking them in roster order; CAS retries and publication still
    // perform their own fresh guard, including the exact target-only guard.
    const sources = await Promise.all(entries.map(entry => ctx.read('rooms/' + room.code + '/players/' + entry.originalToken)));
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i], source = sources[i];
      const card = source?.bluff;
      const matching = source?.game === 'bluffking' && card?.version === 2 && card.room === room.code &&
        card.token === entry.token && card.identityId === entry.identityId && card.historyToken === entry.historyToken;
      // Import/registration precedes ROOM.publish. A newly bound source may
      // still contain the prior game until its first correct publication.
      if (matching) seen[entry.originalToken] = entry.token;
      else if (seen[entry.originalToken] === entry.token) fail('game_switched', 'The game changed. Return to your current player card.', 409);
      else {
        const signature = sourceBinding(source), prior = baselines[entry.originalToken];
        if (!prior || prior.token !== entry.token) baselines[entry.originalToken] = { token: entry.token, signature };
        else if (prior.signature !== signature) fail('game_switched', 'The game changed before the original Bluff cards were published.', 409);
      }
    }
    return state;
  },
  apply(state, input, ctx) {
    const room = roomFor(state, ctx); assignPlayerNums(state, ctx);
    const binding = ctx.actor === 0 ? { identityId: room.hostIdentityId } : bindSeat(state, ctx.seat, ctx);
    room.sharedControls = true;
    const actorMember = binding.member;
    if (ctx.actor !== 0 && (!actorMember || actorMember.active === false || actorMember.pending === true)) fail('not_eligible', 'This player is away or waiting for the next round.');
    const command = { ...input, room: room.code };
    const commandId = command.commandId;
    try {
      E.applyCommand(state, binding.identityId, command, ctx.bank || topics, gameOptions(state, ctx));
      state.transport.acknowledgements[binding.identityId] = { commandId, ok: true };
    } catch (error) {
      // The normal transport uses private acknowledgements. Persist rejected
      // commands too so a retained mailbox cannot retry a rejected action forever.
      state.transport.acknowledgements[binding.identityId] = { commandId, ok: false, error: { code: error.code || 'invalid_command', message: error.message } };
    }
    return state;
  },
  pulse(state, ctx) {
    const room = roomFor(state, ctx), now = ctx.now ?? Date.now(); assignPlayerNums(state, ctx);
    room.sharedControls = true;
    const online = new Set(connectedIds(state, ctx));
    for (const s of ctx.seats || []) {
      const binding = bindSeat(state, s, ctx);
      if (online.has(binding.member.id)) binding.member.lastSeen = now;
      if (s.card?.history) state.identities[binding.identityId] = mergeHistory(state.identities[binding.identityId], s.card.history);
      // projectView records delivery of a truth. Persist this before publishing,
      // including an offline seat whose private node still contains that answer.
      E.projectView(state, binding.identityId, room.code, ctx.bank || topics, { private: true, now });
    }
    state.transport.publicationRevision = (Number(state.transport.publicationRevision) || 0) + 1;
    return state;
  },
  project(state, seat, ctx) {
    const room = roomFor(state, ctx); assignPlayerNums(state, ctx);
    if (seat?.playerNum === 0) {
      const view = E.projectView(state, room.hostIdentityId, room.code, ctx.bank || topics, { private: false, now: ctx.now ?? Date.now() });
      const online = new Set(connectedIds(state, ctx));
      for (const player of view.players) if (room.roster.includes(player.id) || player.seated) player.connected = player.active !== false && player.pending !== true && online.has(player.id);
      view.recovery.available = ['topic_check', 'prepare', 'discussion'].includes(room.phase) && (room.round?.playerIds || room.roster).some(id => room.members.find(p => p.id === id)?.active !== false && !online.has(id));
      return { view: null, viewJson: JSON.stringify(view), ack: state.transport.acknowledgements[room.hostIdentityId] || null, publicationRevision: state.transport.publicationRevision || 0 };
    }
    const binding = bindSeat(state, seat, ctx);
    const now = ctx.now ?? Date.now();
    const view = E.projectView(state, binding.identityId, room.code, ctx.bank || topics, { private: true, now });
    // Presence for shared service games uses the same 60-second grace used to
    // authorize recovery, and never reveals which offline player was truthful.
    const online = new Set(connectedIds(state, ctx));
    for (const player of view.players) if (room.roster.includes(player.id) || player.seated) player.connected = player.active !== false && player.pending !== true && online.has(player.id);
    view.recovery.available = ['topic_check', 'prepare', 'discussion'].includes(room.phase) && (room.round?.playerIds || room.roster).some(id => room.members.find(p => p.id === id)?.active !== false && !online.has(id));
    return {
      view: null, viewJson: JSON.stringify(view),
      ack: state.transport.acknowledgements[binding.identityId] || null,
      history: structuredClone(state.identities[binding.identityId] || { known: {}, seen: {} }),
      sessionBinding: { room: room.code, identityId: binding.identityId, historyToken: binding.credential.historyToken },
      hostGrant: null, publicationRevision: state.transport.publicationRevision || 0
    };
  },
  membership(state, changes, ctx) {
    const room = roomFor(state, ctx); assignPlayerNums(state, ctx);
    const added = changes.added || [];
    if (!Array.isArray(state.transport.cardRoster) || state.transport.cardRoster.length + added.length > E.RULES.maxPlayers) fail('invalid_roster', 'This Bluff roster exceeds its player limit.');
    const current = state.transport.cardRoster;
    for (const item of added) {
      if (item.playerNum !== current.length + 1 || !/^[A-Za-z0-9_-]{12,128}$/.test(item.originalToken || '') || !/^[a-f0-9]{64}$/.test(item.token || '') || !/^[a-f0-9]{64}$/.test(item.historyToken || '') || !/^[a-f0-9]{40}$/.test(item.identityId || '') || current.some(p => p.originalToken === item.originalToken || p.token === item.token || p.identityId === item.identityId)) fail('invalid_roster', 'This newcomer is missing a safe original-card binding.');
      state.transport.members[item.identityId] = { token: item.token, historyToken: item.historyToken };
      state.identities[item.identityId] ||= { known: {}, seen: {} };
      if (item.history) state.identities[item.identityId] = mergeHistory(state.identities[item.identityId], item.history);
      current.push({ playerNum: item.playerNum, originalToken: item.originalToken, name: item.name, token: item.token, identityId: item.identityId, historyToken: item.historyToken });
    }
    E.membership(state, changes, { ...ctx, bank: ctx.bank || topics });
    for (let i = 0; i < current.length; i++) {
      const item = current[i], member = room.members.find(p => p.identityId === item.identityId), row = (changes.roster || []).find(p => p.playerNum === i + 1);
      item.playerNum = i + 1; item.playerId = member.id; if (row) item.name = member.name;
    }
    state.transport.publicationRevision = (Number(state.transport.publicationRevision) || 0) + 1;
    return state;
  },
  membershipInactive(state, ctx) {
    assignPlayerNums(state, ctx); const room = roomFor(state, ctx);
    return (state.transport.cardRoster || []).map((item, i) => room.members.find(p => p.identityId === item.identityId)?.active === false ? i + 1 : null).filter(n => n != null);
  },
  membershipEligible(state, playerNum, ctx) {
    assignPlayerNums(state, ctx); const room = roomFor(state, ctx), item = state.transport.cardRoster?.[Number(playerNum) - 1], member = item && room.members.find(p => p.identityId === item.identityId);
    return !!member && member.active !== false && member.pending !== true;
  },
  release(state) {
    for (const room of Object.values(state.rooms)) delete room.sharedControls;
    return state;
  },
  mergeHistories(state, entries) {
    for (const entry of entries || []) {
      const found = Object.entries(state.transport.members).find(([, member]) => entry.path === 'rooms/bluff-identities/players/' + member.historyToken);
      if (found) state.identities[found[0]] = mergeHistory(state.identities[found[0]], entry.remote);
    }
    return state;
  },
  historyWrites(state) {
    return Object.entries(state.transport.members).filter(([, member]) => /^[a-f0-9]{64}$/.test(member.historyToken || '')).map(([identityId, member]) => ({
      path: 'rooms/bluff-identities/players/' + member.historyToken,
      history: structuredClone(state.identities[identityId] || { known: {}, seen: {} })
    }));
  },
  command(card, ctx) {
    const command = card?.command;
    if (!command?.commandId) return null;
    // With state supplied, don't process an already acknowledged mailbox again.
    const state = ctx?.state;
    if (state && ctx.seat) {
      const binding = bindSeat(state, ctx.seat, ctx);
      if (state.transport.acknowledgements[binding.identityId]?.commandId === command.commandId) return null;
    }
    return command;
  }
};
module.exports = { adapters: { bluffking }, bindSeat };
