// Server-only adapters for the two public conversation games. Player cards
// remain filtered projections: control tokens and other card paths never leave
// the authenticated runtime. The browser's legacy Host stays unchanged.
'use strict';
const crypto = require('node:crypto');
const CUT = require('../cut-engine.js');
const MIC = require('../open-mic-engine.js');
const list = value => Array.isArray(value) ? value : value instanceof Set ? [...value] : Object.values(value || {});
const copy = value => JSON.parse(JSON.stringify(value));
const read = raw => typeof raw?.stateJson === 'string' ? JSON.parse(raw.stateJson) : raw?.state || null;
const shared = state => state && state.sharedControls === true ? state : state ? { ...copy(state), sharedControls: true } : null;
const randomSeed = ctx => Number.isInteger(ctx.seed) ? ctx.seed >>> 0 : crypto.randomInt(0, 0x100000000);
const actor = ctx => Number(ctx.seat?.playerNum ?? ctx.actor);
function input(command, ctx) {
  // These fields come from authenticated runtime context, never the mailbox.
  return { ...command, actor: actor(ctx), now: ctx.now, seed: randomSeed(ctx) };
}
function encode(raw, state) {
  const next = { ...raw, stateJson: JSON.stringify(state), revision: (Number(raw?.revision) || 0) + 1 };
  delete next.state;
  return next;
}
function acknowledge(state, command, number, error = '') {
  const next = copy(state);
  next.seen ||= {}; next.replies ||= {};
  next.seen[number] = [...list(next.seen[number]), command.id].slice(-32);
  next.replies[number] = { id: command.id, error };
  return next;
}
function recover(engine, original, command, ctx) {
  const state = shared(original), number = actor(ctx);
  if (!state || !command || command.sessionId !== state.sessionId || typeof command.id !== 'string' ||
      !command.id || command.id.length > 100 || !list(state.roster).some(p => p.playerNum === number)) return state;
  if (list(state.seen?.[number]).includes(command.id)) return state;
  if (command.turnId !== state.turnId) return acknowledge(state, command, number, 'stale_turn');
  if (!Number.isFinite(ctx.now) || ctx.now < state.lastChangeAt) return acknowledge(state, command, number, 'invalid_time');
  // The runtime has already applied the 60-second presence grace. An unknown
  // presence set cannot remove anyone. Recovery is always an explicit click.
  const online = new Set(ctx.onlineNums == null ? list(state.roster).map(p => p.playerNum) : list(ctx.onlineNums).map(Number));
  if (!online.has(number)) return acknowledge(state, command, number, 'not_available');
  let next = copy(state);
  const removed = new Set(list(next.runtimeOfflineNums).map(Number));
  const changes = [];
  // Restore only seats previously removed by recovery, not manual sit-outs.
  for (const candidate of list(next.roster)) {
    if (removed.has(candidate.playerNum) && online.has(candidate.playerNum)) {
      changes.push({ playerNum: candidate.playerNum, active: true }); removed.delete(candidate.playerNum);
    }
  }
  for (const candidate of list(next.roster)) {
    if (candidate.active !== false && !online.has(candidate.playerNum)) {
      changes.push({ playerNum: candidate.playerNum, active: false }); removed.add(candidate.playerNum);
    }
  }
  for (const change of changes) {
    next = engine.apply(next, { ...change, id: 'recover-' + crypto.createHash('sha256').update(command.id + ':' + change.playerNum).digest('hex'), type: 'exclude',
      sessionId: next.sessionId, turnId: next.turnId, actor: 0, now: ctx.now, seed: randomSeed(ctx) });
    if (next.replies?.[0]?.error) return acknowledge(state, command, number, next.replies[0].error);
  }
  next.runtimeOfflineNums = [...removed];
  return acknowledge(next, command, number);
}
function apply(engine, original, command, ctx) {
  const state = shared(original);
  if (!state || !command) return state;
  if (command.type === 'recover') return recover(engine, state, command, ctx);
  let next = engine.apply(state, input(command, ctx));
  if (command.type === 'exclude' && next.replies?.[actor(ctx)]?.id === command.id && !next.replies[actor(ctx)].error) {
    next = { ...next, runtimeOfflineNums: list(next.runtimeOfflineNums).filter(n => Number(n) !== Number(command.playerNum)) };
  }
  return next;
}
function project(engine, state, seat, ctx, key) {
  const view = engine.view(shared(state), Number(seat.playerNum), ctx.now);
  view[key].sharedControls = true;
  if (Number.isFinite(ctx.revision)) view[key].revision = ctx.revision;
  // A server response is live without a host page. Browser code uses the
  // sharedControls flag instead of this legacy host lease to allow operations.
  if (Number.isFinite(ctx.hostLiveUntil)) view[key].hostLiveUntil = ctx.hostLiveUntil;
  return view;
}
const adapters = {
  cut: {
    decode: read, encode, session: state => state?.sessionId,
    apply: (state, command, ctx) => apply(CUT, state, command, ctx),
    pulse(state, ctx) {
      if (!state) return state;
      const current = shared(CUT.upgrade(state, ctx.now));
      return CUT.apply(current, { id: 'runtime-tick-' + current.turnId + '-' + ctx.now, type: 'tick',
        sessionId: current.sessionId, turnId: current.turnId, actor: 0, now: ctx.now, seed: randomSeed(ctx) });
    },
    project: (state, seat, ctx) => project(CUT, state, seat, ctx, 'cut'),
    command: card => card?.cutAction || null,
  },
  openmic: {
    decode: read, encode, session: state => state?.sessionId,
    apply: (state, command, ctx) => apply(MIC, state, command, ctx),
    // Open Mic never judges a performance or rotates on a timer.
    pulse: state => shared(state),
    project: (state, seat, ctx) => project(MIC, state, seat, ctx, 'openmic'),
    command: card => card?.openmicAction || null,
  },
};
module.exports = { adapters };
