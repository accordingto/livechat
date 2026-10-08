/* Server-only Chat Wolf coordinator. Reuses the complete shipped transport,
 * including RSA joins, channel sequence guards and HistoryScope journals. */
'use strict';
const { randomUUID } = require('node:crypto');
const { Client, FirebaseREST, presentationView } = require('../chat-wolf-sync.js');
const E = require('../chat-wolf-engine.js');
const DEFAULT_DB = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const TOKEN = /^[a-f0-9]{64}$/;
function fail(code, status = 403) { throw Object.assign(new Error(code), { code, status }); }
function decode(raw) {
  if (typeof raw?.data !== 'string') fail('room_missing', 404);
  const data = JSON.parse(raw.data);
  if (!data.room || !data.channels || !data.privateKey) fail('room_missing', 404);
  return data;
}
function validateSeats(data, ticket) {
  const links = data.cardLinks;
  if (!Array.isArray(links) || !links.length || links.length !== ticket.seats?.length) fail('original_cards_required', 409);
  const sorted = [...links].sort((a, b) => a.playerNum - b.playerNum);
  if (sorted.some((link, i) => link.playerNum !== i + 1 || ticket.seats[i]?.playerNum !== i + 1 ||
    ticket.seats[i]?.token !== link.token || !data.channels[link.token] || data.channels[link.token].error)) fail('invalid_roster');
  if (data.room.code !== ticket.code) fail('invalid_registration');
}
function assertEpoch(raw, ticket, capsule) {
  if (raw?.executor?.v !== 1 || raw.executor.epoch !== ticket.epoch || raw.executor.capsule !== capsule) fail('stale_session', 409);
  const data = decode(raw);
  if (data.executorSessionId !== ticket.sessionId) fail('stale_session', 409);
  validateSeats(data, ticket);
  return data;
}
const chatwolf = {
  decode,
  encode(raw, data) { return { ...(raw || {}), data: JSON.stringify(data) }; },
  session(data) { return data.executorSessionId ||= randomUUID(); },
  validateRegistration: validateSeats,
  release(data) { delete data.room.sharedControls; return data; },
  async customExecute({ ticket, body, fetchImpl = globalThis.fetch, databaseURL = DEFAULT_DB, now = Date.now }) {
    const timestamp = typeof now === 'function' ? now() : now;
    if (!Number.isFinite(timestamp) || !TOKEN.test(body.token || '') || ticket.game !== 'chatwolf' ||
      !TOKEN.test(ticket.controlToken || '') || ticket.canonicalPath !== 'rooms/chatwolf-' + ticket.code + '/players/' + ticket.controlToken) fail('invalid_ticket');
    const host = body.token === ticket.controlToken, actor = ticket.seats.find(s => s.token === body.token);
    if (!host && !actor) fail('wrong_player');
    // The original client creates guarded seq/id/context mailbox packets. Do not
    // turn a bare API body into a role action or pretend to be another player.
    if (body.command) fail('mailbox_required', 400);
    const store = new FirebaseREST(databaseURL, fetchImpl);
    let data, recorded = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const snapshot = await store.get(ticket.canonicalPath);
      data = assertEpoch(snapshot.value, ticket, body.capsule);
      const next = structuredClone(snapshot.value);
      next.executor.presence ||= {};
      if (actor) next.executor.presence[actor.playerNum] = timestamp;
      data.room.sharedControls = true;
      next.data = JSON.stringify(data);
      next.owner = 'server:' + ticket.epoch; next.leaseUntil = timestamp + 10000;
      const updated = await store.put(ticket.canonicalPath, next, snapshot.etag);
      if (!updated.conflict) { recorded = true; break; }
    }
    if (!recorded) fail('room_busy', 409);
    const hostToken = Object.keys(data.channels).find(token => data.channels[token].playerId === data.room.hostPlayerId && !data.channels[token].error);
    if (!hostToken) fail('invalid_host_session');
    const storage = { getItem: () => null, setItem: () => {} };
    const client = new Client({ store, storage, clock: () => timestamp, allowHostRecovery: false,
      serverExecutor: { epoch: ticket.epoch, capsule: body.capsule, sessionId: ticket.sessionId, seats: ticket.seats } });
    client.owner = 'server:' + ticket.epoch;
    client.host = { code: ticket.code, control: ticket.controlToken, token: hostToken };
    try {
      let committed = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const result = await client.runCycle();
        if (result?.committed) { committed = true; break; }
      }
      if (!committed) fail('room_busy', 409);
      const fresh = (await store.get(ticket.canonicalPath)).value;
      data = assertEpoch(fresh, ticket, body.capsule);
      if (host) {
        const view = presentationView(E.projectState(data.room, data.room.hostPlayerId, timestamp));
        Object.assign(view.public, { syncRevision: fresh.revision, hostLiveUntil: timestamp + 10000,
          transportRound: data.room.round || 0, legacyCardRoom: data.legacyRoom || null });
        return { ok: true, payload: { view: JSON.stringify(view), revision: fresh.revision } };
      }
      return { ok: true };
    } catch (error) {
      if (error.code === 'GAME_SWITCHED') fail('game_switched', 409);
      if (error.code === 'STALE_EXECUTOR') fail('stale_session', 409);
      throw error;
    } finally { client.close(); }
  }
};
module.exports = { adapters: { chatwolf }, validateSeats };
