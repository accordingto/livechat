'use strict';

/* Development-only local server. It mirrors the production API contract in memory so
   multiple local browser contexts can exercise the UI without touching Firebase.
   It is never imported by the Vercel function and never exposes another player's view. */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  GameError,
  createRoom,
  addPlayer,
  advanceExpired,
  dispatch,
  projectState,
} = require('../api/_lib/chat-wolf-engine.cjs');

const ROOT = path.resolve(__dirname, '..');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function randomToken() { return crypto.randomBytes(32).toString('base64url'); }
function randomId(prefix) { return `${prefix}_${crypto.randomBytes(12).toString('base64url')}`; }
function randomCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return code;
}
function normalizeCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new GameError('INVALID_ROOM_CODE');
  return code;
}
function bearer(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+([A-Za-z0-9_-]{30,100})$/);
  if (!match) throw new GameError('SESSION_REQUIRED', 401);
  return match[1];
}
function actorId(room, token) {
  const session = room.sessions[tokenHash(token)];
  if (!session || !room.players[session.playerId]) throw new GameError('INVALID_SESSION', 401);
  return session.playerId;
}
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new GameError('REQUEST_TOO_LARGE', 413);
    chunks.push(chunk);
  }
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
  catch (error) { throw new GameError('INVALID_JSON'); }
}

function createDevServer() {
  const rooms = new Map();
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/api/chat-wolf') {
        if (req.method === 'GET') {
          const code = normalizeCode(url.searchParams.get('room'));
          const room = rooms.get(code);
          if (!room) throw new GameError('ROOM_NOT_FOUND', 404);
          const id = actorId(room, bearer(req));
          advanceExpired(room, Date.now());
          sendJson(res, 200, { ok: true, state: projectState(room, id, Date.now()) });
          return;
        }
        if (req.method !== 'POST') throw new GameError('METHOD_NOT_ALLOWED', 405);
        const body = await readBody(req);
        const now = Date.now();
        if (body.action === 'create') {
          let code = randomCode();
          while (rooms.has(code)) code = randomCode();
          const token = randomToken();
          const id = randomId('p');
          const room = createRoom({ code, hostPlayerId: id, hostSessionHash: tokenHash(token), hostName: body.name, settings: body.settings, now, seed: crypto.randomBytes(4).readUInt32BE(0) });
          rooms.set(code, room);
          sendJson(res, 201, { ok: true, token, state: projectState(room, id, now) });
          return;
        }
        if (body.action === 'join') {
          const code = normalizeCode(body.room);
          const room = rooms.get(code);
          if (!room) throw new GameError('ROOM_NOT_FOUND', 404);
          const token = randomToken();
          const id = randomId('p');
          addPlayer(room, { playerId: id, sessionHash: tokenHash(token), name: body.name, now });
          sendJson(res, 201, { ok: true, token, state: projectState(room, id, now) });
          return;
        }
        const code = normalizeCode(body.room);
        const room = rooms.get(code);
        if (!room) throw new GameError('ROOM_NOT_FOUND', 404);
        const id = actorId(room, bearer(req));
        dispatch(room, id, body.action, body, now);
        sendJson(res, 200, { ok: true, state: projectState(room, id, now) });
        return;
      }

      const requested = url.pathname === '/' ? '/chat-wolf.html' : url.pathname;
      if (requested.includes('..') || requested.startsWith('/api/') || requested.startsWith('/.')) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const file = path.resolve(ROOT, `.${requested}`);
      if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      if (error instanceof GameError) sendJson(res, error.status || 400, { ok: false, error: error.code });
      else { console.error(error); sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' }); }
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.CHAT_WOLF_DEV_PORT || 8088);
  const server = createDevServer();
  server.listen(port, '127.0.0.1', () => console.log(`Chat Wolf dev server: http://127.0.0.1:${port}/chat-wolf.html`));
}

module.exports = { createDevServer };
