(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.BLUFF_ENGINE = factory(); })(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
const crypto = { randomUUID: () => globalThis.crypto.randomUUID(), randomInt: n => { const a = new Uint32Array(1); const ceiling = Math.floor(0x100000000 / n) * n; do { globalThis.crypto.getRandomValues(a); } while (a[0] >= ceiling); return a[0] % n; } };

const RULES = Object.freeze({ basePoints: 2, correctChallengeBonus: 1, falseChallengePenalty: -2, preparationSeconds: 25, discussionReminderSeconds: 300, roundsPerSeat: 1, minPlayers: 3, maxPlayers: 9 });
class GameError extends Error { constructor(code, message, status = 409, details) { super(message); this.code = code; this.status = status; this.details = details; } }
function fail(code, message, status, details) { throw new GameError(code, message, status, details); }
function blankStore() { return { schema: 1, identities: {}, rooms: {} }; }
function identity(store, id) { return store.identities[id] ||= { known: {}, seen: {} }; }
function markKnown(store, id, knowledgeId, reason, now) { const who = identity(store, id); if (!who.known[knowledgeId]) who.known[knowledgeId] = { at: now, reason }; }
function markSeen(store, id, knowledgeId, now) { const who = identity(store, id); who.seen[knowledgeId] ||= now; }
function seat(room, identityId) { return room.members.find(p => p.identityId === identityId); }
function requireMember(room, identityId) { const p = seat(room, identityId); if (!p) fail('not_joined', 'Join this room before taking part.', 403); return p; }
function requireHost(room, id) { if (room.hostIdentityId !== id) fail('host_only', 'Only the room host can do this.', 403); }
const eligibleMember = p => !!p && p.active !== false && p.pending !== true;
const currentPlayers = room => room.round?.playerIds || room.roster;
const activeRoster = room => room.roster.filter(id => eligibleMember(room.members.find(p => p.id === id)));
function activatePending(room) { for (const p of room.members) if (p.active !== false && p.pending === true) p.pending = false; }
function requireManager(room, id) {
  if (room.hostIdentityId === id) return;
  const p = requireMember(room, id);
  if (!eligibleMember(p) || !room.sharedControls || !(room.phase === 'lobby' ? p.seated : room.roster.includes(p.id))) fail('host_only', 'Only the room host can do this.', 403);
}
function requirePhase(room, ...phases) { if (!phases.includes(room.phase)) fail('wrong_phase', 'That action is no longer available in this stage.'); }
function requireThinker(room, id) { const p = requireMember(room, id); if (!eligibleMember(p) || !room.round || room.round.thinkerId !== p.id) fail('thinker_only', 'Only the current Thinker can do this.', 403); return p; }
function requireLeader(room, id) { if (room.sharedControls) requireManager(room, id); else if (room.hostIdentityId !== id) requireThinker(room, id); }
function onlinePlayers(room, ctx) { const active = activeRoster(room); return ctx.onlineIds ? active.filter(id => ctx.onlineIds.has(id)) : active.filter(id => ctx.now - (room.members.find(p => p.id === id)?.lastSeen || 0) <= 60000); }
function isOnline(room, id, ctx) { return eligibleMember(room.members.find(p => p.id === id)) && (!room.sharedControls || (ctx.onlineIds ? ctx.onlineIds.has(id) : ctx.now - (room.members.find(p => p.id === id)?.lastSeen || 0) <= 60000)); }
function requireActiveRound(room, ctx) {
  if (room.sharedControls && onlinePlayers(room, ctx).length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
  if (room.sharedControls && (!isOnline(room, room.round.thinkerId, ctx) || room.round.truthfulId && !isOnline(room, room.round.truthfulId, ctx))) fail('recovery_required', 'A player needed for this round is offline. Continue without offline players to replace this round without scoring.');
}
function advanceRound(store, room, bank, ctx) {
  activatePending(room);
  if (room.sharedControls && onlinePlayers(room, ctx).length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
  room.roundIndex++;
  if (room.sharedControls) while (room.roundIndex < room.thinkerOrder.length && !isOnline(room, room.thinkerOrder[room.roundIndex], ctx)) room.roundIndex++;
  if (room.roundIndex >= room.thinkerOrder.length) { room.phase = 'results'; if (!room.round?.result) room.round = null; }
  else selectTopic(store, room, bank, ctx);
}
function skipOfflineSpotlights(room, ctx) {
  const r = room.round;
  while (!r.allCovered && !isOnline(room, r.spotlightOrder[r.spotlightIndex], ctx)) {
    const id = r.spotlightOrder[r.spotlightIndex];
    if (id && !r.coveredIds.includes(id)) r.coveredIds.push(id);
    r.skippedIds ||= []; if (id && !r.skippedIds.includes(id)) r.skippedIds.push(id);
    r.spotlightIndex++;
    if (r.spotlightIndex >= r.spotlightOrder.length) r.allCovered = true;
  }
}
function cleanName(name) { const n = String(name || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40); if (!n) fail('name_required', 'Enter a player name.', 400); return n; }
function normalizeCode(code) { const c = String(code || '').toUpperCase().trim(); if (!/^[A-Z0-9]{4,12}$/.test(c)) fail('invalid_room', 'Use a room code with 4–12 letters or numbers.', 400); return c; }
function target(room, targetId) { const p = room.members.find(p => p.id === targetId && currentPlayers(room).includes(p.id) && eligibleMember(p)); if (!p || p.id === room.round.thinkerId) fail('invalid_target', 'Choose a formal player other than the Thinker.', 400); return p; }
function publicQuestion(q, hints) { return q ? { id: q.id, canonicalKnowledgeId: q.canonicalKnowledgeId, locale: q.locale, term: q.term, publicPrompt: q.publicPrompt, hintMode: q.hintMode, publicHints: hints || q.publicHints || [] } : null; }
function availableQuestions(store, room, bank) { const known = new Set(room.roster.filter(pid => eligibleMember(room.members.find(p => p.id === pid))).flatMap(pid => Object.keys(identity(store, room.members.find(p => p.id === pid).identityId).known))); const used = new Set(room.usedKnowledgeIds); return bank.filter(q => q.enabled !== false && q.verificationStatus === 'verified' && !known.has(q.canonicalKnowledgeId) && !used.has(q.canonicalKnowledgeId)); }
function shuffled(values, rng) { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function selectTopic(store, room, bank, ctx) { activatePending(room); const playerIds = activeRoster(room); const pool = availableQuestions(store, room, bank); room.availability = { remaining: pool.length, totalVerified: bank.length, requiredRounds: room.roster.length - room.roundIndex, reason: pool.length ? null : 'All verified topics are already known by a formal player or have appeared in this game.' }; if (!pool.length) { room.round = { id: ctx.uuid(), playerIds: playerIds.slice(), thinkerId: room.thinkerOrder[room.roundIndex], questionId: null, publicHints: [], truthfulId: null, spotlightOrder: [], spotlightIndex: -1, coveredIds: [], allCovered: false, challengeId: null, selectedId: null, readyIds: [], rules: { ...RULES }, createdAt: ctx.now }; room.phase = 'topic_check'; return; } const q = pool[ctx.rng(pool.length)]; room.usedKnowledgeIds.push(q.canonicalKnowledgeId); room.round = { id: ctx.uuid(), playerIds: playerIds.slice(), thinkerId: room.thinkerOrder[room.roundIndex], questionId: q.id, publicHints: ['choices', 'options'].includes(q.hintMode) ? shuffled(q.publicHints, ctx.rng) : [...q.publicHints], truthfulId: null, spotlightOrder: [], spotlightIndex: -1, coveredIds: [], allCovered: false, challengeId: null, selectedId: null, readyIds: [], rules: { ...RULES }, createdAt: ctx.now }; room.availability.remaining = pool.length - 1; room.phase = 'topic_check'; }
function scoreRound(roster, thinkerId, truthfulId, selectedId, challengeId, rules = RULES) { const delta = Object.fromEntries(roster.map(id => [id, { points: 0, reasons: [] }])); const add = (id, points, reason) => { delta[id].points += points; delta[id].reasons.push({ points, reason }); }; const correct = selectedId === truthfulId; if (correct) { add(thinkerId, rules.basePoints, 'identified_truthful'); add(truthfulId, rules.basePoints, 'truthful_selected'); } else add(selectedId, rules.basePoints, 'bluff_selected'); if (challengeId === truthfulId) add(thinkerId, rules.falseChallengePenalty, 'challenged_truthful'); else if (challengeId && correct) add(thinkerId, rules.correctChallengeBonus, 'challenged_bluffer_and_identified_truthful'); return { correct, challengeCorrect: challengeId ? challengeId !== truthfulId : null, delta }; }
function applyCommand(store, identityId, input, bank, options = {}) {
  const ctx = { now: options.now ?? Date.now(), rng: options.rng || (n => crypto.randomInt(n)), uuid: options.uuid || (() => crypto.randomUUID()), onlineIds: Array.isArray(options.onlinePlayerIds) ? new Set(options.onlinePlayerIds) : null };
  identity(store, identityId);
  const code = normalizeCode(input.room); const action = input.action;
  if (action === 'create') {
    if (store.rooms[code]) { if (store.rooms[code].hostIdentityId !== identityId) fail('room_exists', 'This BLUFF PARTY room already has a host. Join it using the room code.', 409); return store.rooms[code]; }
    const name = cleanName(input.name || 'Host'); const member = { id: ctx.uuid(), identityId, name, wantsSeat: input.participate !== false, seated: input.participate !== false, joinedAt: ctx.now, lastSeen: ctx.now };
    const room = { code, hostIdentityId: identityId, members: [member], phase: 'lobby', roster: [], thinkerOrder: [], roundIndex: 0, round: null, scores: {}, history: [], usedKnowledgeIds: [], version: 1, gameNumber: 0, processed: {}, createdAt: ctx.now, availability: { totalVerified: bank.length, remaining: bank.length, requiredRounds: 0, reason: null } }; store.rooms[code] = room; return room;
  }
  const room = store.rooms[code]; if (!room) fail('room_not_found', 'This BLUFF PARTY room has not been opened by a host yet.', 404);
  if (action === 'join') { let member = seat(room, identityId); if (!member) { if (room.members.length >= 80) fail('room_full', 'This room has reached its participant limit.'); member = { id: ctx.uuid(), identityId, name: cleanName(input.name), wantsSeat: input.participate !== false, seated: room.phase === 'lobby' && input.participate !== false && room.members.filter(p => p.seated).length < RULES.maxPlayers, joinedAt: ctx.now, lastSeen: ctx.now }; room.members.push(member); room.version++; } else { const name = cleanName(input.name || member.name); if (member.name !== name) { member.name = name; room.version++; } if (room.phase === 'lobby' && typeof input.participate === 'boolean' && member.seated !== input.participate) { if (input.participate && room.members.filter(p => p.seated).length >= RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.'); member.seated = input.participate; member.wantsSeat = input.participate; room.version++; } } member.lastSeen = ctx.now; return room; }
  const actor = requireMember(room, identityId);
  if (!eligibleMember(actor)) fail('not_eligible', 'This player is away or waiting for the next round.', 403);
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(String(input.commandId || ''))) fail('command_id_required', 'A unique command identifier is required.', 400);
  const key = identityId + ':' + input.commandId; const fingerprint = JSON.stringify({ action, targetId: input.targetId || null, roundId: input.roundId || null, seated: input.seated });
  if (room.processed[key]) { if (room.processed[key] !== fingerprint) fail('command_conflict', 'This command identifier was already used for another action.', 409); return room; }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== room.version) fail('stale_version', 'The room changed. Refresh the room and try again.', 409, { version: room.version });
  if (room.round && input.roundId !== room.round.id) fail('stale_round', 'This action belongs to an earlier round.', 409);
  switch (action) {
    case 'setSeat': { requireManager(room, identityId); requirePhase(room, 'lobby'); const p = room.members.find(p => p.id === input.targetId); if (!p) fail('invalid_target', 'Player not found.', 400); if (input.seated && !p.seated && room.members.filter(p => p.seated).length >= RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.'); p.seated = !!input.seated; p.wantsSeat = !!input.seated; break; }
    case 'start': { requireManager(room, identityId); requirePhase(room, 'lobby'); const roster = room.members.filter(p => p.seated && eligibleMember(p) && isOnline(room, p.id, ctx)).map(p => p.id); if (roster.length < RULES.minPlayers || roster.length > RULES.maxPlayers) fail('player_count', 'Start with three to nine connected formal players.', 400); room.roster = roster; room.scores = Object.fromEntries(room.roster.map(id => [id, 0])); const first = ctx.rng(room.roster.length); room.thinkerOrder = room.roster.slice(first).concat(room.roster.slice(0, first)); room.roundIndex = 0; room.usedKnowledgeIds = []; room.history = []; room.gameNumber++; selectTopic(store, room, bank, ctx); break; }
    case 'knowTopic': { requirePhase(room, 'topic_check'); if (!currentPlayers(room).includes(actor.id)) fail('player_only', 'Only formal players can report a known topic.', 403); const q = bank.find(q => q.id === room.round.questionId); if (!q) fail('deck_exhausted', 'There are no eligible topics remaining.'); markKnown(store, identityId, q.canonicalKnowledgeId, 'already_knew', ctx.now); selectTopic(store, room, bank, ctx); break; }
    case 'replaceTopic': { requirePhase(room, 'topic_check'); requireLeader(room, identityId); selectTopic(store, room, bank, ctx); break; }
    case 'confirmTopic': { requirePhase(room, 'topic_check'); requireLeader(room, identityId); requireActiveRound(room, ctx); if (!room.round.questionId) fail('deck_exhausted', 'There are no eligible topics remaining. Invite a different group or add more verified questions.'); const candidates = currentPlayers(room).filter(id => id !== room.round.thinkerId && isOnline(room, id, ctx)); if (candidates.length < RULES.minPlayers - 1) fail('player_count', 'At least three connected players are needed to deal roles.'); room.round.truthfulId = candidates[ctx.rng(candidates.length)]; room.round.prepareStartedAt = ctx.now; room.phase = 'prepare'; break; }
    case 'ready': { requirePhase(room, 'prepare'); if (!currentPlayers(room).includes(actor.id)) fail('player_only', 'Only formal players can mark themselves ready.', 403); if (!room.round.readyIds.includes(actor.id)) room.round.readyIds.push(actor.id); break; }
    case 'beginDiscussion': { requirePhase(room, 'prepare'); requireLeader(room, identityId); requireActiveRound(room, ctx); const candidates = currentPlayers(room).filter(id => id !== room.round.thinkerId && isOnline(room, id, ctx)); const first = ctx.rng(candidates.length); room.round.spotlightOrder = candidates.slice(first).concat(candidates.slice(0, first)); room.round.spotlightIndex = 0; room.round.discussionStartedAt = ctx.now; room.phase = 'discussion'; break; }
    case 'nextSpotlight': { requirePhase(room, 'discussion'); requireThinker(room, identityId); requireActiveRound(room, ctx); if (room.round.allCovered) fail('all_covered', 'Everyone has had a Spotlight opportunity.'); const current = room.round.spotlightOrder[room.round.spotlightIndex]; room.round.coveredIds.push(current); room.round.spotlightIndex++; if (room.round.spotlightIndex >= room.round.spotlightOrder.length) room.round.allCovered = true; if (room.sharedControls) skipOfflineSpotlights(room, ctx); break; }
    case 'challenge': { requirePhase(room, 'discussion'); requireThinker(room, identityId); requireActiveRound(room, ctx); if (room.round.challengeId) fail('challenge_used', 'The Thinker has already used this round’s challenge.'); room.round.challengeId = target(room, input.targetId).id; break; }
    case 'identify': { requirePhase(room, 'discussion'); requireThinker(room, identityId); requireActiveRound(room, ctx); if (!room.round.allCovered) fail('spotlight_incomplete', 'Give every player one full Spotlight opportunity before deciding.'); room.round.selectedId = target(room, input.targetId).id; const scored = scoreRound(currentPlayers(room), room.round.thinkerId, room.round.truthfulId, room.round.selectedId, room.round.challengeId, room.round.rules); room.round.result = scored; room.round.revealedAt = ctx.now; for (const id of currentPlayers(room)) room.scores[id] = (room.scores[id] || 0) + scored.delta[id].points; room.history.push({ roundId: room.round.id, roundNumber: room.roundIndex + 1, questionId: room.round.questionId, thinkerId: room.round.thinkerId, truthfulId: room.round.truthfulId, selectedId: room.round.selectedId, challengeId: room.round.challengeId, rules: { ...room.round.rules }, result: scored }); room.phase = 'reveal'; break; }
    case 'nextRound': { requirePhase(room, 'reveal'); requireLeader(room, identityId); advanceRound(store, room, bank, ctx); break; }
    case 'cancelRound': { requirePhase(room, 'topic_check', 'prepare', 'discussion'); requireManager(room, identityId); selectTopic(store, room, bank, ctx); break; }
    case 'recover': {
      if (!room.sharedControls) fail('host_only', 'Offline recovery needs the room service.');
      requireManager(room, identityId); requirePhase(room, 'topic_check', 'prepare', 'discussion');
      const active = onlinePlayers(room, ctx);
      if (!active.includes(actor.id)) fail('player_only', 'Reconnect your own card before continuing.');
      if (active.length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
      if (active.length === room.roster.length) fail('no_offline_player', 'Everyone is connected. There is no offline turn to skip.');
      const priorRoundId = room.round.id;
      if (!isOnline(room, room.round.thinkerId, ctx)) advanceRound(store, room, bank, ctx);
      else if (room.round.truthfulId && !isOnline(room, room.round.truthfulId, ctx)) selectTopic(store, room, bank, ctx);
      else if (room.phase === 'discussion') skipOfflineSpotlights(room, ctx);
      else fail('no_blocked_turn', 'No offline player is blocking this stage.');
      room.lastRecovery = { at: ctx.now, cancelledRound: priorRoundId !== room.round?.id, priorRoundId };
      break;
    }
    case 'transferHost': { requireHost(room, identityId); const p = room.members.find(p => p.id === input.targetId); if (!p) fail('invalid_target', 'Player not found.', 400); room.hostIdentityId = p.identityId; break; }
    case 'restart': { requireManager(room, identityId); requirePhase(room, 'results', 'lobby'); room.phase = 'lobby'; room.round = null; room.roster = []; room.thinkerOrder = []; room.scores = {}; room.roundIndex = 0; let count = 0; for (const p of room.members) { p.pending = false; p.seated = p.active !== false && p.wantsSeat && count++ < RULES.maxPlayers; }; break; }
    default: fail('unknown_action', 'Unknown room action.', 400);
  }
  room.version++; room.processed[key] = fingerprint; actor.lastSeen = ctx.now;
  const keys = Object.keys(room.processed); for (const key of keys.slice(0, Math.max(0, keys.length - 2500))) delete room.processed[key];
  return room;
}
function projectView(store, identityId, code, bank, options = {}) {
  const now = options.now ?? Date.now(); const room = store.rooms[normalizeCode(code)]; if (!room) fail('room_not_found', 'This BLUFF PARTY room has not been opened by a host yet.', 404); const actor = seat(room, identityId); const r = room.round; const q = r && bank.find(q => q.id === r.questionId); const revealing = ['reveal', 'results'].includes(room.phase);
  if (q && actor) { markSeen(store, identityId, q.canonicalKnowledgeId, now); if (revealing) markKnown(store, identityId, q.canonicalKnowledgeId, 'reveal_received', now); }
  const players = room.members.map(p => ({ id: p.id, playerNum: Number(p.playerNum) || 0, name: p.name, active: p.active !== false, pending: p.pending === true, memberStatus: p.active === false ? 'away' : p.pending === true ? 'next_round' : 'active', seated: p.seated, spectator: !eligibleMember(p) || (room.phase === 'lobby' ? !p.seated : !currentPlayers(room).includes(p.id)), isHost: p.identityId === room.hostIdentityId, connected: now - p.lastSeen <= 45000, score: room.scores[p.id] || 0 }));
  const round = r ? { id: r.id, number: Math.min(room.roundIndex + 1, room.thinkerOrder.length), total: room.thinkerOrder.length, thinkerId: r.thinkerId, topic: publicQuestion(q, r.publicHints), spotlightOrder: [...r.spotlightOrder], currentSpotlightId: r.allCovered ? null : r.spotlightOrder[r.spotlightIndex] || null, coveredIds: [...r.coveredIds], pendingIds: r.spotlightOrder.filter(id => !r.coveredIds.includes(id) && id !== r.spotlightOrder[r.spotlightIndex]), allCovered: r.allCovered, challengeId: r.challengeId, readyCount: r.readyIds.filter(id => currentPlayers(room).includes(id)).length, allReady: currentPlayers(room).every(id => r.readyIds.includes(id)), prepareStartedAt: r.prepareStartedAt || null, discussionStartedAt: r.discussionStartedAt || null, rules: { ...r.rules } } : null;
  if (revealing && r && q) { round.reveal = { selectedId: r.selectedId, truthfulId: r.truthfulId, roles: Object.fromEntries(currentPlayers(room).map(id => [id, id === r.thinkerId ? 'thinker' : id === r.truthfulId ? 'truthful' : 'bluffer'])), secretAnswer: q.secretAnswer, supportingFacts: [...q.supportingFacts], revealExplanation: q.revealExplanation, sources: q.sources.map(s => ({ title: s.title, url: s.url })), result: r.result, revealedAt: r.revealedAt }; }
  let privateCard = null;
  if (options.private && eligibleMember(actor) && r && currentPlayers(room).includes(actor.id) && ['prepare', 'discussion', 'reveal', 'results'].includes(room.phase)) { const role = actor.id === r.thinkerId ? 'thinker' : actor.id === r.truthfulId ? 'truthful' : 'bluffer'; privateCard = { roundId: r.id, playerId: actor.id, role, ready: r.readyIds.includes(actor.id) }; if (role === 'truthful' && q) { privateCard.secretAnswer = q.secretAnswer; privateCard.supportingFacts = [...q.supportingFacts]; markKnown(store, identityId, q.canonicalKnowledgeId, 'answer_received', now); } }
  const pool = availableQuestions(store, room.phase === 'lobby' ? { ...room, roster: room.members.filter(p => p.seated).map(p => p.id), usedKnowledgeIds: [] } : room, bank);
  return { room: room.code, version: room.version, phase: room.phase, gameNumber: room.gameNumber, sharedControls: !!room.sharedControls, recovery: room.sharedControls ? { available: ['topic_check', 'prepare', 'discussion'].includes(room.phase) && players.some(p => room.roster.includes(p.id) && now - (room.members.find(m => m.id === p.id)?.lastSeen || 0) > 60000), last: room.lastRecovery || null } : null, membership: { enabled: !!room.sharedControls, minPlayers: 3, maxPlayers: 9, activeCount: activeRoster(room).length, pendingCount: room.members.filter(p => p.pending === true && p.active !== false).length }, self: actor ? { playerId: actor.id, playerNum: Number(actor.playerNum) || 0, name: actor.name, isHost: room.hostIdentityId === identityId, isFormal: eligibleMember(actor) && (room.phase === 'lobby' ? actor.seated : currentPlayers(room).includes(actor.id)) } : null, players, roster: [...room.roster], scores: { ...room.scores }, round, privateCard, availability: { totalVerified: bank.length, remaining: pool.length, requiredRounds: room.roster.length ? Math.max(0, room.roster.length - room.roundIndex - (q ? 1 : 0)) : room.members.filter(p => p.seated).length, reason: pool.length ? null : 'Every eligible verified topic is known by a formal player or has already appeared in this game.' }, rules: { ...RULES }, history: room.history.map(h => ({ roundId: h.roundId, roundNumber: h.roundNumber, term: bank.find(q => q.id === h.questionId)?.term || h.questionId, thinkerId: h.thinkerId, truthfulId: h.truthfulId, selectedId: h.selectedId, challengeId: h.challengeId, result: h.result })), serverTime: now };
}
function membership(store, changes = {}, options = {}) {
  const room = store.rooms[normalizeCode(options.code || options.room)]; if (!room) fail('room_not_found', 'This Bluff room is unavailable.', 404);
  const added = changes.added || [], rows = changes.roster || [], inactive = new Set((changes.inactiveNums || []).map(Number));
  const bank = options.bank || []; let random = Number(options.seed) >>> 0 || 1, sequence = 0;
  const rng = n => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) % n; };
  const uuid = () => 'membership-' + String(options.id || options.seed || 'room').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) + '-' + ++sequence;
  const ctx = { now: options.now ?? Date.now(), rng: options.rng || rng, uuid: options.uuid || uuid, onlineIds: null };
  if (room.members.filter(p => Number(p.playerNum) > 0).length + added.length > RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.');
  for (const item of added) {
    if (!Number.isInteger(item.playerNum) || item.playerNum < 1 || room.members.some(p => p.playerNum === item.playerNum || p.identityId === item.identityId)) fail('invalid_roster', 'This player already belongs to the room.');
    applyCommand(store, item.identityId, { room: room.code, action: 'join', name: item.name, participate: false }, bank, ctx);
    const p = seat(room, item.identityId); p.playerNum = item.playerNum; p.seated = true; p.wantsSeat = true; p.active = !inactive.has(p.playerNum); p.pending = room.phase !== 'lobby' && !inactive.has(p.playerNum); p.lastSeen = ctx.now;
    if (room.phase !== 'lobby') { room.roster.push(p.id); if (!room.thinkerOrder.includes(p.id)) room.thinkerOrder.push(p.id); room.scores[p.id] = 0; }
  }
  for (const p of room.members.filter(p => Number(p.playerNum) > 0)) {
    const row = rows.find(r => r.playerNum === p.playerNum); if (row) p.name = cleanName(row.name || p.name);
    const wasAway = p.active === false; p.active = !inactive.has(p.playerNum);
    if (!p.active) p.pending = false;
    else if (wasAway && room.phase !== 'lobby') p.pending = true;
  }
  if (room.round && ['topic_check', 'prepare', 'discussion'].includes(room.phase)) {
    room.round.playerIds ||= room.roster.filter(id => !room.members.find(p => p.id === id)?.pending);
    const available = room.roster.filter(id => room.members.find(p => p.id === id)?.active !== false);
    if (available.length >= RULES.minPlayers && !eligibleMember(room.members.find(p => p.id === room.round.thinkerId))) advanceRound(store, room, bank, ctx);
    else if (available.length >= RULES.minPlayers && (room.round.truthfulId && !eligibleMember(room.members.find(p => p.id === room.round.truthfulId)) || currentPlayers(room).filter(id => eligibleMember(room.members.find(p => p.id === id))).length < RULES.minPlayers && room.members.some(p => p.active !== false && p.pending === true))) selectTopic(store, room, bank, ctx);
    else {
      room.round.playerIds = room.round.playerIds.filter(id => room.members.find(p => p.id === id)?.active !== false);
      if (room.phase === 'topic_check') {
        activatePending(room); room.round.playerIds = activeRoster(room);
        const q = bank.find(q => q.id === room.round.questionId);
        if (q && room.round.playerIds.some(id => identity(store, room.members.find(p => p.id === id).identityId).known[q.canonicalKnowledgeId])) selectTopic(store, room, bank, ctx);
      }
      if (room.phase === 'discussion') {
        const r = room.round; r.spotlightOrder = r.spotlightOrder.filter(id => r.playerIds.includes(id));
        r.spotlightIndex = r.spotlightOrder.findIndex(id => !r.coveredIds.includes(id)); r.allCovered = r.spotlightIndex < 0;
      }
    }
  }
  room.version++; return store;
}
return { RULES, GameError, blankStore, normalizeCode, applyCommand, projectView, membership, scoreRound, availableQuestions, publicQuestion };

});


