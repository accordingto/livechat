'use strict';
const { createExecutor, keyFrom } = require('../runtime/hub-executor-core.cjs');
const ALLOWED = new Set(['https://livechat-two-alpha.vercel.app', 'https://icebreaker-youtube-search.vercel.app']);
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin && !ALLOWED.has(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return res.status(403).json({ error: 'origin_denied' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    let ready = false; try { keyFrom(process.env.HUB_EXECUTOR_SECRET); ready = true; } catch {}
    return res.status(200).json({ ready, version: 1 });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'invalid_request' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 36000) return res.status(400).json({ error: 'invalid_request' });
    const service = createExecutor({ secret: process.env.HUB_EXECUTOR_SECRET });
    const result = body.operation === 'register' ? await service.register(body)
      : body.operation === 'release' ? await service.release(body)
      : body.operation === 'execute' ? await service.execute(body) : null;
    if (!result) return res.status(400).json({ error: 'invalid_operation' });
    return res.status(200).json(result);
  } catch (e) {
    // Never include room paths, tickets, tokens, card contents or upstream bodies.
    return res.status(e.status || 503).json({ error: e.code || 'executor_unavailable' });
  }
};