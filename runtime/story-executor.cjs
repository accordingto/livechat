'use strict';

/* Server-only adapters. Credentials stay in the API's authenticated context;
 * these pure adapters never place paths or tokens in a player projection. */
const crypto = require('node:crypto');
const DIXIT = require('../dixit-engine.js');
const ONCE = require('../once-upon-a-time-engine.js');
const TALK = require('../talk-engine.js');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value.filter(v => v != null) : Object.values(value || {}).filter(v => v != null);

function decode(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.state && typeof raw.state === 'object') return copy(raw.state);
  if (typeof raw.stateJson === 'string') {
    try { const value = JSON.parse(raw.stateJson); return value && typeof value === 'object' ? value : null; }
    catch { return null; }
  }
  return null;
}
function encode(raw, state) {
  const next = { ...raw, revision: (Number(raw?.revision) || 0) + 1 };
  if (Object.hasOwn(raw || {}, 'stateJson')) next.stateJson = JSON.stringify(state);
  if (Object.hasOwn(raw || {}, 'state') || !Object.hasOwn(raw || {}, 'stateJson')) next.state = copy(state);
  return next;
}
function online(state, ctx) {
  const roster = list(state.roster).map(p => p.playerNum);
  // Missing presence means unknown, not an empty room. The service supplies
  // this list only after its disconnection grace period.
  return ctx?.onlineNums == null ? roster : roster.filter(n => list(ctx.onlineNums).includes(n));
}
function now(ctx) {
  const value = Number(ctx?.now);
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_time');
  return value;
}
function boundCommand(state, command, ctx) {
  const actor = Number(ctx?.seat?.playerNum ?? ctx?.actor);
  if (!Number.isInteger(actor) || actor !== 0 && !list(state.roster).some(p => p.playerNum === actor)) throw new Error('not_eligible');
  const seed = Number.isFinite(Number(ctx?.seed)) ? Number(ctx.seed) : Number.parseInt(crypto.createHash('sha256').update(String(state.sessionId) + ':' + String(command.id)).digest('hex').slice(0, 8), 16);
  const bound = { ...command, actor, seed, now: now(ctx), onlineNums: online(state, ctx),
    sessionId: command.type === 'crazyHere' ? command.sessionId : command.sessionId == null ? state.sessionId : command.sessionId,
    // Player-written prompts belong to the turn visible when the sender typed
    // them; do not bind an omitted turn to a newer speaker after delivery.
    turnId: command.type === 'crazyAssign' ? command.turnId : command.turnId == null ? state.turnId : command.turnId };
  if (state.gameMode === 'crazy') {
    bound.hostAuthorized = actor === 0 || state.crazy?.hostDelegate === actor;
    bound.hostOnline = ctx.hostOnline;
    bound.actorIdentity = ctx.identityByNum?.[actor];
    bound.connectionByNum = ctx.connectionByNum;
    bound.identityByNum = ctx.identityByNum;
  }
  if (state.mode === 'life_story') {
    // An omitted old-turn fence must never become authority for the current turn.
    bound.sessionId = command.sessionId; bound.turnId = command.turnId;
    bound.serverAuthority = true;
  }
  return bound;
}
function tick(state, type, ctx, marker) {
  const digest = crypto.createHash('sha256').update(JSON.stringify([state.sessionId, state.turnId, type, marker])).digest('hex');
  return { id: 'server:' + digest.slice(0, 40), sessionId: state.sessionId, turnId: state.turnId,
    type, actor: 0, hostAuthorized: true, hostOnline: ctx?.hostOnline, connectionByNum: ctx?.connectionByNum, identityByNum: ctx?.identityByNum, now: now(ctx), seed: Number.isFinite(Number(ctx?.seed)) ? Number(ctx.seed) : Number.parseInt(digest.slice(0, 8), 16), onlineNums: online(state, ctx) };
}
function adapter(engine, key, actionKey, pulse) {
  return {
    decode, encode,
    session: state => state?.sessionId || null,
    membership: (state, change, ctx) => engine.membership(state, change, state?.mode === 'life_story' ? { ...ctx, serverAuthority: true } : ctx),
    apply: (state, command, ctx) => engine.apply(state, boundCommand(state, command, ctx)),
    pulse,
    project(state, seat, ctx) {
      const num = Number(typeof seat === 'object' ? seat.playerNum : seat);
      const payload = engine.view(state, num, now(ctx), { actorIdentity: ctx?.identityByNum?.[num], hostAuthorized: num === 0 || state.crazy?.hostDelegate === num, hostOnline: ctx?.hostOnline, connectionByNum: ctx?.connectionByNum });
      if (Number.isFinite(Number(ctx?.revision))) payload[key].revision = Number(ctx.revision);
      payload[key].hostLiveUntil = state.sharedControls === true ? 0 : Number(ctx?.hostLiveUntil) || 0;
      return payload;
    },
    command: card => card?.[actionKey] || null,
  };
}
const adapters = {
  dixit: adapter(DIXIT, 'dixit', 'dixitAction', (state, ctx) => {
    if (state?.mode === 'life_story') return require('../life-story-engine.js').pulse(state, { ...ctx, serverAuthority: true });
    if (state?.phase !== 'REVEALING' || state.paused) return state;
    const deadline = state.revealStage === 'answer' ? state.revealPopularAt : state.revealAnswerAt;
    if (!(Number(deadline) > 0) || now(ctx) < Number(deadline)) return state;
    return DIXIT.apply(state, tick(state, 'advanceReveal', ctx, deadline));
  }),
  onceupon: adapter(ONCE, 'once', 'onceAction', state => state),
  letstalk: adapter(TALK, 'talk', 'talkAction', (state, ctx) => {
    if (!TALK.timerDue(state, now(ctx), ctx)) return state;
    return TALK.apply(state, tick(state, 'clockTick', ctx,
      [state.phase, state.deadline, state.gameDeadline, state.gameSeconds, state.crazy?.schedulerVersion,
        state.crazy?.nextAssignAt, state.crazy?.scheduleSequence, state.crazy?.replacementFor,
        list(state.crazy?.prompts).map(p => [p.id, p.status, p.expiresAt, p.renderAckAt, p.displayDeadline, p.interactedAt, p.hereAt, p.checkInReadyAt]),
        state.crazy?.roundStage, state.crazy?.nextRotateAt || state.crazy?.nextRotationAt, state.crazy?.receivers, state.crazy?.queue?.map?.(p=>p.id), ctx.onlineNums]));
  }),
};
Object.assign(adapters.letstalk, {
  archiveEntries: TALK.archiveEntries, ackArchive: TALK.ackArchive,
  hydrateVault(state, records, ctx) {
    if (state?.gameMode !== 'crazy') return state;
    const next = copy(state); next.crazyVault ||= {}; next.crazyIdentities ||= {};
    for (const [num, identity] of Object.entries(ctx.identityByNum || {})) next.crazyIdentities[num] = identity;
    for (const record of records || []) {
      if (record.category !== 'vault' || !Object.values(ctx.identityByNum || {}).includes(record.ownerIdentity)) continue;
      const vault = next.crazyVault[record.ownerIdentity] ||= {};
      const prior = vault[record.cardId];
      if (prior && prior.version >= record.version) continue;
      vault[record.cardId] = { id: record.cardId, text: record.text, target: record.targetNum ?? 'random',
        version: record.version, persistedVersion: record.version, deleted: record.deleted === true || record.status === 'deleted',
        createdAt: record.createdAt, updatedAt: record.updatedAt };
    }
    return next;
  }
});
module.exports = { adapters };
