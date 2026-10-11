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
test('original Hub cards seed exact seats and duplicate names without a second join; separate identities share persistent device knowledge', { timeout: 60000 }, async t => {
  const fb = await firebase(); t.after(() => new Promise(resolve => fb.server.close(resolve))); const host = device(fb.url, memoryStorage(), true); const sameBrowser = memoryStorage(); const p0 = device(fb.url, sameBrowser); const p1 = device(fb.url, sameBrowser); const p2 = device(fb.url); const all = [host, p0, p1, p2]; t.after(() => all.forEach(d => d.client.close()));
  const setup = { names: ['Amy', 'Amy', 'Bob'], tokens: ['a'.repeat(32), 'b'.repeat(32), 'c'.repeat(32)], playerCount: 3 };
  await host.client.createFromCards('CARD', setup); const cards = await host.client.getCardSessions(); assert.equal(cards.length, 3); assert.deepEqual(Array.from(cards, c => c.name), setup.names); assert.deepEqual(Array.from(cards, c => c.originalToken), setup.tokens); assert.equal(host.client.lastView.players.filter(p => p.seated).length, 3); assert.equal(host.client.lastView.self.isFormal, false); assert.equal(host.client.lastView.privateCard, null); assert.ok(host.client.lastView.players.filter(p => p.seated).every(p => p.connected === false));
  for (const card of cards) { assert.ok(!JSON.stringify(card.credential).includes(host.client.hostToken)); assert.equal(card.credential.version, 2); }
  const defaultId = JSON.parse(sameBrowser.getItem('icebreak.bluff.identity.v1')).id;
  await p0.client._request(p0.client._historyPath(), { method: 'PUT', body: { known: { [bank[0].canonicalKnowledgeId]: { at: 10, reason: 'earlier_cloud_game' } }, seen: {} } });
  await p0.client.connectCard('CARD', cards[0].credential); await p1.client.connectCard('CARD', cards[1].credential); await p2.client.connectCard('CARD', cards[2].credential); assert.notEqual(p0.client.identity.id, p1.client.identity.id); assert.notEqual(p0.client.identityStorageKey, p1.client.identityStorageKey); assert.equal(JSON.parse(sameBrowser.getItem('icebreak.bluff.identity.v1')).id, defaultId); assert.equal(p0.client.lastView.self.name, 'Amy'); assert.equal(p1.client.lastView.self.name, 'Amy'); assert.notEqual(p0.client.lastView.self.playerId, p1.client.lastView.self.playerId);
  await host.client.refresh(); assert.equal(host.client.lastView.players.filter(p => p.seated && p.connected).length, 3);
  await host.client.command({ action: 'start', commandId: 'cards_start_command_001', expectedVersion: host.client.lastView.version }); assert.notEqual(host.client.lastView.round.topic.canonicalKnowledgeId, bank[0].canonicalKnowledgeId); assert.equal(host.client.lastView.round.total, 3); assert.equal(host.client.lastView.roster.length, 3);
  const before = host.client.lastView.round.id; await host.client.createFromCards('CARD', setup); assert.equal(host.client.lastView.round.id, before);
  await assert.rejects(host.client.createFromCards('CARD', { ...setup, tokens: [...setup.tokens].reverse() }), e => e.code === 'roster_locked'); assert.equal(host.client.lastView.round.id, before);
  await assert.rejects(p2.client.connectCard('CARD', { ...cards[0].credential, identityId: cards[1].credential.identityId }), e => e.code === 'invalid_card_session');
  await assert.rejects(p2.client.connectCard('OTHER', cards[0].credential), e => e.code === 'invalid_card_session');
  await host.client.command({ action: 'confirmTopic', commandId: 'cards_confirm_command_001', expectedVersion: host.client.lastView.version, roundId: before }); await Promise.all([p0.client.refresh(), p1.client.refresh(), p2.client.refresh()]); const truth = [p0, p1, p2].find(d => d.client.lastView.privateCard.role === 'truthful'); const knownId = host.client.lastView.round.topic.canonicalKnowledgeId; assert.ok(truth.client.identity.history.known[knownId]);
  const nextHost = device(fb.url, memoryStorage(), true); all.push(nextHost); await nextHost.client.createFromCards('NEXT', setup); const newCards = await nextHost.client.getCardSessions(); const oldCardDevice = device(fb.url, truth.storage); all.push(oldCardDevice); await oldCardDevice.client.connectCard('NEXT', newCards[0].credential); assert.ok(oldCardDevice.client.identity.history.known[knownId]); await nextHost.client.refresh(); const available = nextHost.client.lastView.availability.remaining; assert.equal(available, bank.length - Object.keys(oldCardDevice.client.identity.history.known).length);
});
test('lobby adoption replaces old independent formal roster safely, and a seeded new host can restore its public table', { timeout: 60000 }, async t => {
  const fb = await firebase(); t.after(() => new Promise(resolve => fb.server.close(resolve))); const host = device(fb.url, memoryStorage(), true); const legacy = device(fb.url); const all = [host, legacy]; t.after(() => all.forEach(d => d.client.close()));
  await host.client.create('SEED', { name: 'Original host', participate: true }); await legacy.client.join('SEED', { name: 'Legacy player' }); await host.client.refresh(); const legacyId = legacy.client.identity.id;
  const setup = { names: ['One', 'Two', 'Three'], tokens: ['d'.repeat(32), 'e'.repeat(32), 'f'.repeat(32)], playerCount: 3 }; await host.client.createFromCards('SEED', setup); const cards = await host.client.getCardSessions(); assert.equal(host.client.lastView.players.length, 4); assert.equal(host.client.lastView.players.some(p => p.name === 'Legacy player'), false); const canonical = JSON.parse(fb.get(['rooms', 'bluffking-SEED', 'players', host.client.hostToken]).data); assert.ok(canonical.identities[legacyId]);
  await legacy.client.join('SEED', { name: 'Legacy observer', participate: true }); await host.client.refresh(); await legacy.client.refresh(); assert.equal(legacy.client.lastView.self.isFormal, false); assert.equal(host.client.lastView.players.filter(p => p.seated).length, 3);
  const promoted = device(fb.url); all.push(promoted); await promoted.client.connectCard('SEED', cards[1].credential); await host.client.refresh(); await host.client.command({ action: 'transferHost', commandId: 'seed_transfer_command001', expectedVersion: host.client.lastView.version, targetId: cards[1].playerId }); await promoted.client.refresh(); assert.equal(promoted.client.lastView.self.isHost, true);
  const explicitTable = device(fb.url, promoted.storage, true); all.push(explicitTable); await explicitTable.client.connectCard('SEED', cards[1].credential); assert.equal(explicitTable.client.isHost, true); assert.equal(explicitTable.client.lastView.privateCard, null);
  const restoredTable = device(fb.url, promoted.storage, true); all.push(restoredTable); await restoredTable.client.connect('SEED'); assert.equal(restoredTable.client.isHost, true); assert.equal(restoredTable.client.identity.id, cards[1].credential.identityId); await restoredTable.client.createFromCards('SEED', setup); assert.equal(restoredTable.client.lastView.players.filter(p => p.seated).length, 3); assert.equal(new Set(restoredTable.client.lastView.players.map(p => p.id)).size, restoredTable.client.lastView.players.length);
});
test('card-roster import rechecks canonical host authority when a transfer races after reconnect', { timeout: 60000 }, async t => {
  const fb = await firebase(); t.after(() => new Promise(resolve => fb.server.close(resolve))); const host = device(fb.url, memoryStorage(), true); t.after(() => host.client.close());
  const setup = { names: ['First', 'Second', 'Third'], tokens: ['1'.repeat(32), '2'.repeat(32), '3'.repeat(32)], playerCount: 3 };
  await host.client.createFromCards('RACE', setup); const cards = await host.client.getCardSessions(); const originalHostId = host.client.identity.id; const hostToken = host.client.hostToken; const originalVersion = host.client.lastView.version;
  const connect = host.client.connect.bind(host.client);
  host.client.connect = async code => { const view = await connect(code); await host.client._cas(host.client._roomPath('players/' + hostToken), state => { E.applyCommand(state, originalHostId, { room: 'RACE', action: 'transferHost', targetId: cards[1].playerId, commandId: 'racing_transfer_command_0001', expectedVersion: state.rooms.RACE.version }, bank); state.transport.hostIdentityId = state.rooms.RACE.hostIdentityId; return { state }; }); return view; };
  await assert.rejects(host.client.createFromCards('RACE', { ...setup, names: ['Replaced A', 'Replaced B', 'Replaced C'] }), e => e.code === 'host_only');
  const state = JSON.parse(fb.get(['rooms', 'bluffking-RACE', 'players', hostToken]).data); assert.equal(state.rooms.RACE.hostIdentityId, cards[1].credential.identityId); assert.equal(state.rooms.RACE.version, originalVersion + 1); assert.deepEqual(state.transport.cardRoster.map(p => p.name), setup.names); assert.deepEqual(state.rooms.RACE.members.filter(p => p.seated).map(p => p.name), setup.names);
});

test('trusted current Hub import replaces obsolete active names/count/tokens without erasing truths; unchanged bindings resume the same round', {timeout:60000}, async t=>{
 const fb=await firebase();t.after(()=>new Promise(resolve=>fb.server.close(resolve)));
 const host=device(fb.url,memoryStorage(),true),players=[device(fb.url),device(fb.url),device(fb.url)];
 t.after(()=>[host,...players].forEach(d=>d.client.close()));
 const setup={names:['Current A','Current B','Current C'],tokens:['a'.repeat(20),'b'.repeat(20),'c'.repeat(20)],playerCount:3};
 await host.client.createFromCards('CURHUB',setup);
 let slots=await host.client.getCardSessions();
 async function publish(){for(let i=0;i<slots.length;i++)await host.client._request('/rooms/CURHUB/players/'+slots[i].originalToken,{method:'PUT',body:{game:'bluffking',playerNum:i+1,name:slots[i].name,bluff:slots[i].credential}});}
 await publish();for(let i=0;i<3;i++)await players[i].client.connectCard('CURHUB',slots[i].credential);
 await host.client.refresh();
 async function start(){await host.client.command({action:'start',commandId:'current_hub_start_'+crypto.randomUUID(),expectedVersion:host.client.lastView.version});await host.client.command({action:'confirmTopic',commandId:'current_hub_confirm_'+crypto.randomUUID(),expectedVersion:host.client.lastView.version,roundId:host.client.lastView.round.id});}
 const canonical=()=>JSON.parse(fb.get(['rooms','bluffking-CURHUB','players',host.client.hostToken]).data);
 await start();const first=canonical(),round=first.rooms.CURHUB.round.id,truth=first.rooms.CURHUB.round.truthfulId;
 const truthIdentity=first.rooms.CURHUB.members.find(m=>m.id===truth).identityId;
 assert.ok(Object.keys(first.identities[truthIdentity].known).length);
 await host.client.createFromCards('CURHUB',setup,{replaceActive:true});
 assert.equal(host.client.lastView.phase,'prepare');assert.equal(host.client.lastView.round.id,round);
 assert.deepEqual(canonical().identities[truthIdentity].known,first.identities[truthIdentity].known);
 const renamed={...setup,names:['Renamed A','Current B','Current C']};
 await assert.rejects(host.client.createFromCards('CURHUB',renamed),{code:'roster_locked'});
 assert.equal(host.client.lastView.round.id,round);
 await host.client.createFromCards('CURHUB',renamed,{replaceActive:true});
 assert.equal(host.client.lastView.phase,'lobby');assert.equal(host.client.lastView.round,null);
 assert.deepEqual(Array.from(host.client.lastView.players.filter(p=>p.seated),p=>p.name),renamed.names);
 assert.deepEqual(Array.from(await host.client.getCardSessions(),s=>s.credential.token),Array.from(slots,s=>s.credential.token));
 assert.deepEqual(canonical().identities[truthIdentity].known,first.identities[truthIdentity].known);
 slots=await host.client.getCardSessions();await publish();await start();
 const replacement={names:['New C','New A','Fresh D','New B'],tokens:[setup.tokens[2],setup.tokens[0],'d'.repeat(20),setup.tokens[1]],playerCount:4};
 await host.client.createFromCards('CURHUB',replacement,{replaceActive:true});
 assert.equal(host.client.lastView.phase,'lobby');
 const newer=await host.client.getCardSessions();assert.deepEqual(Array.from(newer,s=>s.originalToken),replacement.tokens);
 assert.deepEqual(Array.from(newer,s=>s.name),replacement.names);
 assert.equal(newer[0].credential.identityId,slots[2].credential.identityId);
 assert.equal(newer[1].credential.historyToken,slots[0].credential.historyToken);
 assert.ok(canonical().identities[truthIdentity].known);assert.equal(Object.keys(host.client.lastView.scores).length,0);
 assert.ok(!JSON.stringify(host.client.lastView).includes('PRIVATE_TEST_SECRET_'));
});
test('trusted explicit reopen after original cards moved to another game cancels the old round; ordinary invite reload never inspects Hub cards', {timeout:60000},async t=>{
 const fb=await firebase();t.after(()=>new Promise(resolve=>fb.server.close(resolve)));
 const host=device(fb.url,memoryStorage(),true),players=[device(fb.url),device(fb.url),device(fb.url)];
 t.after(()=>[host,...players].forEach(d=>d.client.close()));
 const setup={names:['One','Two','Three'],tokens:['1'.repeat(20),'2'.repeat(20),'3'.repeat(20)],playerCount:3};
 await host.client.createFromCards('MOVED',setup);const slots=await host.client.getCardSessions();
 for(let i=0;i<3;i++)await players[i].client.connectCard('MOVED',slots[i].credential);
 await host.client.refresh();await host.client.command({action:'start',commandId:'moved_start_command',expectedVersion:host.client.lastView.version});
 const oldRound=host.client.lastView.round.id;
 await host.client.createFromCards('MOVED',setup);assert.equal(host.client.lastView.round.id,oldRound);
 for(const token of setup.tokens)await host.client._request('/rooms/MOVED/players/'+token,{method:'PUT',body:{game:'scene',round:'new-scene-round'}});
 await host.client.createFromCards('MOVED',setup,{replaceActive:true});
 assert.equal(host.client.lastView.phase,'lobby');assert.equal(host.client.lastView.round,null);
 assert.deepEqual(Array.from(await host.client.getCardSessions(),s=>JSON.parse(JSON.stringify(s.credential))),Array.from(slots,s=>JSON.parse(JSON.stringify(s.credential))));
});
