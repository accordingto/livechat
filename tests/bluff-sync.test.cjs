'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const E = require('../bluff-king-engine.js');
const bank = Array.from({ length: 12 }, (_, i) => ({ id: 'test-topic-' + i, canonicalKnowledgeId: 'test-knowledge-' + i, locale: 'en', term: 'Test topic ' + i, publicPrompt: 'Explain this.', hintMode: 'none', publicHints: [], secretAnswer: 'PRIVATE_TEST_SECRET_' + i, supportingFacts: ['First test fact', 'Second test fact'], revealExplanation: 'Test only.', sources: [{ title: 'Test only', url: 'https://example.invalid/test' }], verificationStatus: 'verified', verifiedAt: '2026-10-06', enabled: true }));
function memoryStorage() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k), data }; }
async function firebase() {
  const database = {}; let version = 1;
  const get = parts => { let n = database; for (const p of parts) { if (n == null) return null; n = n[p]; } return n ?? null; };
  const firebaseValue = value => { if (value === null || value === undefined) return null; if (typeof value !== 'object') return value; const out = Array.isArray(value) ? [] : {}; for (const [k, v] of Object.entries(value)) { const next = firebaseValue(v); if (next !== null) out[k] = next; } return Object.keys(out).length ? out : null; };
  const set = (parts, value) => { let n = database; for (const p of parts.slice(0, -1)) n = n[p] ||= {}; const cleaned = firebaseValue(value); if (cleaned === null) delete n[parts.at(-1)]; else n[parts.at(-1)] = cleaned; version++; };
  const server = http.createServer(async (req, res) => {
    const parts = new URL(req.url, 'http://localhost').pathname.replace(/\.json$/, '').split('/').filter(Boolean); const etag = '"' + version + '"'; res.setHeader('Content-Type', 'application/json'); res.setHeader('ETag', etag);
    if (req.method === 'GET') return res.end(JSON.stringify(get(parts)));
    if (req.headers['if-match'] && req.headers['if-match'] !== etag) { res.statusCode = 412; return res.end('null'); }
    let body = ''; for await (const c of req) body += c; const data = body ? JSON.parse(body) : null;
    if (req.method === 'PATCH') set(parts, { ...(get(parts) || {}), ...data }); else set(parts, data); res.end(JSON.stringify(get(parts)));
  }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return { url: 'http://127.0.0.1:' + server.address().port, server, database, get };
}
function device(localUrl, storage = memoryStorage(), host = false) {
  const ctx = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, structuredClone, AbortSignal, btoa, atob, setTimeout, clearTimeout, console, localStorage: storage, BLUFF_ENGINE: host ? E : undefined, BLUFF_QUESTIONS: host ? bank : undefined, fetch: (url, opts) => fetch(String(url).replace('https://test.firebaseio.com', localUrl), opts) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../bluff-king-sync.js'), 'utf8'), ctx);
  const updates = []; const client = new ctx.BLUFF_SYNC.Client({ databaseURL: 'https://test.firebaseio.com', storage, hostPresentation: host, onView: v => updates.push(v) }); client._schedule = () => {}; return { client, ctx, storage, updates };
}
test('three independent devices over real HTTP: encrypted joins, private projections, full circle, replay protection and reconnect', { timeout: 60000 }, async t => {
  const fb = await firebase(); t.after(() => new Promise(resolve => fb.server.close(resolve)));
  const host = device(fb.url, memoryStorage(), true); const p1 = device(fb.url); const p2 = device(fb.url); const all = [host, p1, p2]; t.after(() => all.forEach(d => d.client.close()));
  await host.client.create('REAL', { name: 'Host', participate: true }); await p1.client.join('REAL', { name: 'Amy' }); await p2.client.join('REAL', { name: 'Bob' });
  const joinPublic = fb.get(['rooms', 'bluffking-REAL', 'roster']); assert.ok(joinPublic.joinPublic.publicKey); assert.ok(!JSON.stringify(joinPublic).includes(p1.client.identity.id)); assert.ok(!JSON.stringify(joinPublic).includes(p1.client.roomToken));
  await host.client.refresh(); await p1.client.refresh(); await p2.client.refresh(); assert.equal(host.client.lastView.players.length, 3); assert.ok(p1.client.lastView.self.playerId !== p2.client.lastView.self.playerId);
  let number = 1;
  async function cmd(d, action, payload = {}) { const v = d.client.lastView; const input = { action, commandId: 'network_command_' + number++, expectedVersion: v.version, roundId: v.round?.id, ...payload }; const pending = d.client.command(input); if (!d.client.isHost) { await new Promise(r => setTimeout(r, 15)); await host.client.refresh(); await d.client.refresh(); } const result = await pending; await Promise.all(all.map(x => x.client.refresh())); return { input, result }; }
  await cmd(host, 'start'); await cmd(host, 'confirmTopic');
  const state = JSON.parse(fb.get(['rooms', 'bluffking-REAL', 'players', host.client.hostToken]).data); const truthId = state.rooms.REAL.round.truthfulId; const thinkerId = state.rooms.REAL.round.thinkerId;
  for (const d of [p1, p2]) { const own = d.client.lastView; assert.equal(Object.keys(own.privateCard).includes('secretAnswer'), own.self.playerId === truthId); assert.ok(!JSON.stringify(own).includes('identityId')); assert.ok(!JSON.stringify(own).includes('truthfulId')); }
  assert.equal(host.client.lastView.privateCard, null); assert.ok(!JSON.stringify(host.client.lastView).includes('PRIVATE_TEST_SECRET_'));
  const hostCard = device(fb.url, host.storage, false); all.push(hostCard); await hostCard.client.connect('REAL'); assert.equal(hostCard.client.lastView.privateCard.playerId, host.client.lastView.self.playerId); assert.equal(hostCard.ctx.BLUFF_ENGINE, undefined); assert.equal(hostCard.ctx.BLUFF_QUESTIONS, undefined);
  await cmd(host, 'beginDiscussion');
  const thinker = all.find(d => d.client.lastView?.self.playerId === thinkerId && !d.client.hostPresentation) || host;
  const first = await cmd(thinker, 'nextSpotlight'); const replay = thinker.client.command(first.input); if (!thinker.client.isHost) { await new Promise(r => setTimeout(r, 15)); await host.client.refresh(); await thinker.client.refresh(); } await replay; await host.client.refresh();
  assert.equal(host.client.lastView.round.coveredIds.length, 1);
  await cmd(thinker, 'nextSpotlight'); assert.equal(host.client.lastView.phase, 'discussion'); assert.equal(host.client.lastView.round.allCovered, true);
  await cmd(thinker, 'challenge', { targetId: truthId }); await cmd(thinker, 'identify', { targetId: truthId }); assert.equal(host.client.lastView.phase, 'reveal'); assert.equal(host.client.lastView.round.reveal.result.correct, true); assert.equal(host.client.lastView.scores[thinkerId], 0);
  await Promise.all(all.map(d => d.client.refresh())); const truthDevice = all.find(d => d.client.lastView.self.playerId === truthId); assert.ok(Object.keys(truthDevice.client.identity.history.known).length >= 1);
  const reconnect = device(fb.url, p1.storage); all.push(reconnect); await reconnect.client.connect('REAL'); assert.equal(reconnect.client.lastView.self.playerId, p1.client.lastView.self.playerId); assert.equal(reconnect.client.lastView.phase, 'reveal');
});
test('host transfer restores on the new host table; cross-room persistent truths refresh before topic selection', { timeout: 60000 }, async t => {
  const fb = await firebase(); t.after(() => new Promise(resolve => fb.server.close(resolve))); const old = device(fb.url, memoryStorage(), true); const p1 = device(fb.url); const p2 = device(fb.url); const all = [old, p1, p2]; t.after(() => all.forEach(d => d.client.close()));
  await old.client.create('MOVE', { name: 'Original', participate: true }); await p1.client.join('MOVE', { name: 'Next host' }); await p2.client.join('MOVE', { name: 'Third' }); await old.client.refresh(); await p1.client.refresh(); await p2.client.refresh();
  const formerHostToken = old.client.hostToken;
  await old.client.command({ action: 'transferHost', commandId: 'transfer_command_0001', expectedVersion: old.client.lastView.version, targetId: p1.client.lastView.self.playerId }); await p1.client.refresh(); assert.equal(old.client.isHost, false); assert.ok(p1.storage.getItem('icebreak.bluff.host.MOVE'));
  old.storage.setItem('icebreak.bluff.host.MOVE', formerHostToken); const formerReconnect = device(fb.url, old.storage, true); all.push(formerReconnect); await formerReconnect.client.connect('MOVE'); assert.equal(formerReconnect.client.isHost, false); assert.equal(formerReconnect.client.lastView.self.isHost, false); assert.equal(old.storage.getItem('icebreak.bluff.host.MOVE'), null);
  const newHost = device(fb.url, p1.storage, true); all.push(newHost); await newHost.client.connect('MOVE'); assert.equal(newHost.client.isHost, true); assert.equal(newHost.client.lastView.self.isHost, true); assert.equal(newHost.client.lastView.privateCard, null);
  // A different existing room/device can add history after joining MOVE. The
  // canonical MOVE room must fetch the persistent history before drawing.
  await p2.client._request(p2.client._historyPath(), { method: 'PUT', body: { known: Object.fromEntries(bank.map(q => [q.canonicalKnowledgeId, { at: Date.now(), reason: 'another_room_reveal' }])), seen: {} } });
  await newHost.client.command({ action: 'start', commandId: 'new_host_start_0001', expectedVersion: newHost.client.lastView.version }); assert.equal(newHost.client.lastView.phase, 'topic_check'); assert.equal(newHost.client.lastView.availability.remaining, 0); assert.equal(newHost.client.lastView.round.topic, null);
  const restored = device(fb.url, p1.storage, true); all.push(restored); await restored.client.connect('MOVE'); assert.equal(restored.client.isHost, true); assert.equal(restored.client.lastView.round.id, newHost.client.lastView.round.id);
});
