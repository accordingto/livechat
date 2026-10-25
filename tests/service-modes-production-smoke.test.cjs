'use strict';
// Runs the 2026-10-25 release smoke against the real service core and an
// in-memory Firebase stand-in: no network, same exact-node and cleanup rules.
const test = require('node:test'), assert = require('node:assert/strict');
const { run } = require('../scripts/service-modes-production-smoke.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const registry = { ...require('../runtime/party-executor.cjs').adapters, ...require('../runtime/story-executor.cjs').adapters, ...require('../runtime/bluff-executor.cjs').adapters };
const clone = v => v == null ? null : structuredClone(v);
function firebaseValue(value) { if (value == null) return null; if (typeof value !== 'object') return value; const entries = Object.entries(value).map(([key, child]) => [key, firebaseValue(child)]).filter(([, child]) => child !== null); if (!entries.length) return null; const numeric = entries.every(([key]) => /^(0|[1-9][0-9]*)$/.test(key)); const max = numeric ? Math.max(...entries.map(([key]) => Number(key))) : 0; if (numeric && entries.length > (max + 1) / 2) { const result = Array(max + 1).fill(null); entries.forEach(([key, child]) => { result[Number(key)] = child; }); return result; } return Object.fromEntries(entries); }
function harness({ collision = false, firebaseShape = false, oldService = false } = {}) {
  const nodes = new Map(), versions = new Map(), requests = [], seen = new Set(); let collisionPath = null;
  const etag = path => '"' + (versions.get(path) || 0) + '"';
  const database = async (url, options = {}) => {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, ''), method = options.method || 'GET'; requests.push({ method, path });
    assert.match(path, /^rooms\/(?:HV[A-F0-9]{8}|bluffking-HV[A-F0-9]{8}|bluff-identities)\/players\/[a-f0-9]{20,64}$/, 'every request is an exact disposable capability node');
    if (method === 'GET') {
      if (collision && !collisionPath) { collisionPath = path; nodes.set(path, { game: 'foreign', keep: true }); versions.set(path, 1); }
      return new Response(JSON.stringify(firebaseShape ? firebaseValue(nodes.get(path)) : clone(nodes.get(path))), { headers: { etag: etag(path) } });
    }
    const match = new Headers(options.headers).get('if-match'); assert.ok(match, 'writes and deletes always carry the authoritative ETag');
    if (match !== etag(path)) return new Response('null', { status: 412 });
    if (method === 'DELETE') { assert.ok(seen.has(path), 'cleanup only touches nodes this run created or its service generated'); nodes.delete(path); versions.set(path, (versions.get(path) || 0) + 1); return new Response('null'); }
    assert.equal(method, 'PUT'); const next = JSON.parse(options.body); nodes.set(path, clone(next)); versions.set(path, (versions.get(path) || 0) + 1); seen.add(path); return new Response(JSON.stringify(next));
  };
  const service = createExecutor({ secret: '73'.repeat(32), databaseURL: 'http://localhost', fetchImpl: database, now: () => 100000, games: registry });
  const fetch = async (url, options = {}) => {
    const u = new URL(url), method = options.method || 'GET';
    if (u.pathname === '/api/hub-executor') {
      if (method === 'GET') return new Response('{"ready":true,"version":1}', { headers: { date: new Date(100000).toUTCString() } });
      if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': 'https://livechat-two-alpha.vercel.app' } });
      const body = JSON.parse(options.body);
      try {
        assert.ok(['register', 'execute'].includes(body.operation));
        if (body.capsule === 'invalid-synthetic-ticket') return new Response('{"error":"invalid_ticket"}', { status: 403 });
        if (oldService && body.operation === 'execute' && body.command?.action === 'setMode') return new Response('{"error":"invalid_command"}', { status: 400 });
        return new Response(JSON.stringify(await service[body.operation](body)));
      } catch (error) { return new Response(JSON.stringify({ error: error.code || 'executor_unavailable' }), { status: error.status || 503 }); }
    }
    if (u.pathname.startsWith('/runtime/')) return new Response('not found', { status: 404 });
    if (u.pathname === '/api/open-mic-lyrics') return new Response('{"error":"lyrics_retired"}', { status: 410 });
    if (u.pathname === '/api/open-mic-discovery') return new Response('{"songs":[]}', { status: 200 });
    return database(url, options);
  };
  return { fetch, nodes, requests, getCollision: () => collisionPath };
}

test('the release smoke plays a full Everyone-votes Halloween round and a Once opening redraw on the service core, then cleans every node', async () => {
  const h = harness(), report = await run({ fetchImpl: h.fetch, now: () => 100000 });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.deepEqual(report.games.map(g => [g.game, g.ok]), [['bluffking', true], ['onceupon', true]]);
  assert.ok(report.games[0].passed >= 14 && report.games[1].passed >= 5, JSON.stringify(report.games));
  assert.deepEqual(report.boundary, { ready: true, cors: true, syntheticRejected: true, runtimeBlocked: true, lyricsRetired: true, searchStatus: 200 });
  assert.equal(report.cleanup.failed, 0); assert.equal(report.cleanup.tracked, report.cleanup.deleted + report.cleanup.empty); assert.equal(h.nodes.size, 0, 'all generated exact nodes are cleaned');
  assert.ok(h.requests.every(r => !/\/rooms$|\/players$/.test(r.path)));
  assert.doesNotMatch(JSON.stringify(report), /capsule|token|identity|historyToken|originalToken|SECRET_|rooms\//, 'the report never contains capabilities or private content');
});

test('the release smoke also passes with Firebase-shaped values (empty fields omitted)', async () => {
  const h = harness({ firebaseShape: true }), report = await run({ fetchImpl: h.fetch, now: () => 100000 });
  assert.equal(report.ok, true, JSON.stringify(report)); assert.equal(report.cleanup.failed, 0);
  assert.equal([...h.nodes.values()].filter(node => firebaseValue(node) !== null).length, 0);
});

test('a service that cannot take the new mode fails the smoke and still cleans up', async () => {
  const h = harness({ oldService: true }), report = await run({ fetchImpl: h.fetch, now: () => 100000, games: ['bluffking'] });
  assert.equal(report.ok, false); assert.equal(report.step, 'bluff:setMode'); assert.equal(report.cleanup.failed, 0); assert.equal(h.nodes.size, 0);
});

test('the release smoke refuses a preexisting creation node and never overwrites or deletes it', async () => {
  const h = harness({ collision: true }), report = await run({ fetchImpl: h.fetch, now: () => 100000, games: ['onceupon'] });
  assert.equal(report.ok, false); assert.equal(report.cleanup.deleted, 0); assert.deepEqual(h.nodes.get(h.getCollision()), { game: 'foreign', keep: true });
  assert.equal(h.requests.filter(r => r.method !== 'GET').length, 0);
});
