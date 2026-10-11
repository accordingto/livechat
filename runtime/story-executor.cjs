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
  return { ...command, actor, seed, now: now(ctx), onlineNums: online(state, ctx),
    sessionId: command.sessionId == null ? state.sessionId : command.sessionId,
    // Player-written prompts belong to the turn visible when the sender typed
    // them; do not bind an omitted turn to a newer speaker after delivery.
    turnId: command.type === 'crazyAssign' ? command.turnId : command.turnId == null ? state.turnId : command.turnId };
}
function tick(state, type, ctx, marker) {
  const digest = crypto.createHash('sha256').update(JSON.stringify([state.sessionId, state.turnId, type, marker])).digest('hex');
  return { id: 'server:' + digest.slice(0, 40), sessionId: state.sessionId, turnId: state.turnId,
    type, actor: 0, now: now(ctx), seed: Number.isFinite(Number(ctx?.seed)) ? Number(ctx.seed) : Number.parseInt(digest.slice(0, 8), 16), onlineNums: online(state, ctx) };
}
function adapter(engine, key, actionKey, pulse) {
  return {
    decode, encode,
    session: state => state?.sessionId || null,
    membership: (state, change, ctx) => engine.membership(state, change, ctx),
    apply: (state, command, ctx) => engine.apply(state, boundCommand(state, command, ctx)),
    pulse,
    project(state, seat, ctx) {
      const num = Number(typeof seat === 'object' ? seat.playerNum : seat);
      const payload = engine.view(state, num, now(ctx));
      if (Number.isFinite(Number(ctx?.revision))) payload[key].revision = Number(ctx.revision);
      payload[key].hostLiveUntil = state.sharedControls === true ? 0 : Number(ctx?.hostLiveUntil) || 0;
      return payload;
    },
    command: card => card?.[actionKey] || null,
  };
}
const adapters = {
  dixit: adapter(DIXIT, 'dixit', 'dixitAction', (state, ctx) => {
    if (state?.phase !== 'REVEALING' || state.paused) return state;
    const deadline = state.revealStage === 'answer' ? state.revealPopularAt : state.revealAnswerAt;
    if (!(Number(deadline) > 0) || now(ctx) < Number(deadline)) return state;
    return DIXIT.apply(state, tick(state, 'advanceReveal', ctx, deadline));
  }),
  onceupon: adapter(ONCE, 'once', 'onceAction', state => state),
  letstalk: adapter(TALK, 'talk', 'talkAction', (state, ctx) => {
    if (!TALK.timerDue(state, now(ctx))) return state;
    return TALK.apply(state, tick(state, 'clockTick', ctx,
      [state.phase, state.deadline, state.gameDeadline, state.gameSeconds, state.crazy?.schedulerVersion,
        state.crazy?.nextAssignAt, state.crazy?.scheduleSequence, state.crazy?.replacementFor,
        list(state.crazy?.prompts).map(p => [p.id, p.status, p.expiresAt])]));
  }),
};
Object.assign(adapters.letstalk, { archiveEntries: TALK.archiveEntries, ackArchive: TALK.ackArchive });
module.exports = { adapters };
