'use strict';

const crypto = require('node:crypto');
const {
  GameError,
  createRoom,
  addPlayer,
  advanceExpired,
  dispatch,
  projectState,
} = require('./_lib/chat-wolf-engine.cjs');
const { roomRef } = require('./_lib/chat-wolf-store.cjs');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return code;
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('base64url')}`;
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function normalizeCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new GameError('INVALID_ROOM_CODE');
  return code;
}

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > 32768) throw new GameError('REQUEST_TOO_LARGE', 413);
    try { return JSON.parse(req.body); } catch (error) { throw new GameError('INVALID_JSON'); }
  }
  return req.body;
}

function bearer(req) {
  const value = String(req.headers.authorization || '');
  const match = value.match(/^Bearer\s+([A-Za-z0-9_-]{30,100})$/);
  if (!match) throw new GameError('SESSION_REQUIRED', 401);
  return match[1];
}

function json(res, status, value) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json(value);
}

function actorFromRoom(room, hash) {
  const session = room && room.sessions && room.sessions[hash];
  if (!session || !room.players || !room.players[session.playerId]) throw new GameError('INVALID_SESSION', 401);
  return session.playerId;
}

async function create(body, now) {
  const token = randomToken();
  const hash = tokenHash(token);
  const playerId = randomId('p');
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode();
    const room = createRoom({
      code,
      hostPlayerId: playerId,
      hostSessionHash: hash,
      hostName: body.name,
      settings: body.settings,
      now,
      seed,
    });
    const result = await roomRef(code).transaction((current) => current == null ? room : undefined, undefined, false);
    if (result.committed) return { token, state: projectState(result.snapshot.val(), playerId, now) };
  }
  throw new GameError('ROOM_CODE_UNAVAILABLE', 503);
}

async function join(body, now) {
  const code = normalizeCode(body.room);
  const token = randomToken();
  const hash = tokenHash(token);
  const playerId = randomId('p');
  let capturedError = null;
  const result = await roomRef(code).transaction((current) => {
    if (!current) {
      capturedError = new GameError('ROOM_NOT_FOUND', 404);
      return;
    }
    try {
      addPlayer(current, { playerId, sessionHash: hash, name: body.name, now });
      return current;
    } catch (error) {
      capturedError = error;
      return;
    }
  }, undefined, false);
  if (!result.committed) throw capturedError || new GameError('JOIN_CONFLICT', 409);
  return { token, state: projectState(result.snapshot.val(), playerId, now) };
}

async function readState(code, token, now) {
  const hash = tokenHash(token);
  let actorId = null;
  let capturedError = null;
  const result = await roomRef(code).transaction((current) => {
    if (!current) {
      capturedError = new GameError('ROOM_NOT_FOUND', 404);
      return;
    }
    try {
      actorId = actorFromRoom(current, hash);
      return advanceExpired(current, now) ? current : undefined;
    } catch (error) {
      capturedError = error;
      return;
    }
  }, undefined, false);
  if (capturedError) throw capturedError;
  if (!result.snapshot || !result.snapshot.exists()) throw new GameError('ROOM_NOT_FOUND', 404);
  return projectState(result.snapshot.val(), actorId, now);
}

async function mutate(code, token, body, now) {
  const hash = tokenHash(token);
  let actorId = null;
  let capturedError = null;
  const result = await roomRef(code).transaction((current) => {
    if (!current) {
      capturedError = new GameError('ROOM_NOT_FOUND', 404);
      return;
    }
    try {
      actorId = actorFromRoom(current, hash);
      dispatch(current, actorId, body.action, body, now);
      return current;
    } catch (error) {
      capturedError = error;
      return;
    }
  }, undefined, false);
  if (!result.committed) throw capturedError || new GameError('ACTION_CONFLICT', 409);
  return projectState(result.snapshot.val(), actorId, now);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const code = normalizeCode(req.query && req.query.room);
      const state = await readState(code, bearer(req), Date.now());
      json(res, 200, { ok: true, state });
      return;
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    const body = bodyOf(req);
    const now = Date.now();
    if (body.action === 'create') {
      json(res, 201, { ok: true, ...(await create(body, now)) });
      return;
    }
    if (body.action === 'join') {
      json(res, 201, { ok: true, ...(await join(body, now)) });
      return;
    }
    const code = normalizeCode(body.room);
    const state = await mutate(code, bearer(req), body, now);
    json(res, 200, { ok: true, state });
  } catch (error) {
    if (error instanceof GameError) {
      json(res, error.status || 400, { ok: false, error: error.code });
      return;
    }
    console.error('chat-wolf-api', error && error.code ? error.code : error);
    const configurationError = error && error.code === 'CHAT_WOLF_BACKEND_NOT_CONFIGURED';
    json(res, configurationError ? 503 : 500, {
      ok: false,
      error: configurationError ? 'BACKEND_NOT_CONFIGURED' : 'SERVER_ERROR',
    });
  }
};
