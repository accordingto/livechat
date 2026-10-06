'use strict';
/* Live Firebase verification. Each device uses the shipped browser transport in
 * its own V8 context and its own storage. Only random test-room/token paths are
 * written, and all generated paths are removed in finally. No mock database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomInt, randomUUID, createHash } = require('node:crypto');
const app = path.resolve(__dirname, '..');
const output = path.resolve(app, '../../outputs/bluff-live-verification.json');
const config = fs.readFileSync(path.join(app, 'firebase-config.js'), 'utf8');
const databaseURL = config.match(/databaseURL\s*:\s*["'](https:\/\/[^"']+)["']/)?.[1];
if (!databaseURL || !/^https:\/\/[a-z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)$/.test(databaseURL)) throw new Error('The public Firebase database URL was not found.');
const syncSource = fs.readFileSync(path.join(app, 'bluff-king-sync.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(app, 'bluff-king-engine.js'), 'utf8');
const bank = require('../bluff-king-topics.js');
const plain = value => JSON.parse(JSON.stringify(value));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { startedAt: new Date().toISOString(), target: new URL(databaseURL).hostname, transport: 'live Firebase REST; shipped browser sync and engine; independent V8 devices', topics: bank.length, hashes: { sync: createHash('sha256').update(syncSource).digest('hex'), engine: createHash('sha256').update(engineSource).digest('hex'), bank: createHash('sha256').update(JSON.stringify(bank)).digest('hex') }, checks: [], rooms: [], network: { requests: 0, statusCounts: {} }, cleanup: { attempted: 0, deleted: 0, failed: [] }, limitations: ['This verifies real multiplayer data flow with independent Node browser-like devices; visual browser layout and live spoken conversation are checked separately.', 'This trusted-host design keeps canonical answers on the host device. The public host projection and other players are checked for leakage.'] };
const devices = [];
const generatedNodes = new Set();
const generatedCodes = new Set();
function storage(seed = []) { const data = new Map(seed); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }; }
function check(name, fn, details) { try { fn(); report.checks.push({ name, passed: true, ...(details ? { details } : {}) }); } catch (e) { report.checks.push({ name, passed: false, error: e.message }); throw e; } }
async function liveFetch(url, options) { report.network.requests++; const response = await fetch(url, options); const status = String(response.status); report.network.statusCounts[status] = (report.network.statusCounts[status] || 0) + 1; return response; }
function remember(d) { if (d.client.identity?.historyToken) generatedNodes.add('/rooms/bluff-identities/players/' + d.client.identity.historyToken); if (d.client.code && generatedCodes.has(d.client.code)) { if (d.client.roomToken) generatedNodes.add('/rooms/bluffking-' + d.client.code + '/players/' + d.client.roomToken); if (d.client.hostToken) generatedNodes.add('/rooms/bluffking-' + d.client.code + '/players/' + d.client.hostToken); } }
function device(label, memory = storage(), hostPresentation = false) {
  const packets = [];
  const ctx = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, structuredClone, AbortSignal, btoa, atob, setTimeout, clearTimeout, console, localStorage: memory, fetch: async (url, options) => { if (options?.method === 'PUT' && /\/roster\/requests\//.test(String(url))) packets.push(JSON.parse(options.body)); return liveFetch(url, options); } });
  if (hostPresentation) { vm.runInContext(engineSource, ctx, { filename: 'bluff-king-engine.js' }); ctx.BLUFF_QUESTIONS = plain(bank); }
  vm.runInContext(syncSource, ctx, { filename: 'bluff-king-sync.js' });
  const d = { label, storage: memory, ctx, packets, statuses: [] };
  d.client = new ctx.BLUFF_SYNC.Client({ databaseURL, storage: memory, hostPresentation, onStatus: status => d.statuses.push(status) });
  devices.push(d); return d;
}
async function roomCode() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; for (let attempt = 0; attempt < 20; attempt++) { const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); if (generatedCodes.has(code)) continue; const response = await liveFetch(databaseURL + '/rooms/bluffking-' + code + '/roster/joinPublic.json', { signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error('Firebase public join metadata is not readable: HTTP ' + response.status); if (await response.json() == null) { generatedCodes.add(code); report.rooms.push(code); return code; } } throw new Error('Could not allocate a unique isolated test room.'); }
async function create(d, code) { generatedNodes.add('/rooms/bluffking-' + code + '/roster'); await d.client.create(code, { name: d.label, participate: true }); remember(d); }
async function join(d, code, participate = true) { await d.client.join(code, { name: d.label, participate }); remember(d); }
async function pump(host, others) { await host.client.refresh(); await Promise.all(others.filter(d => !d.client.closed).map(d => d.client.refresh())); }
async function until(host, others, predicate, description, maxMs = 60000) { const end = Date.now() + maxMs; do { await pump(host, others); if (predicate()) return; await pause(120); } while (Date.now() < end); throw new Error('Timed out waiting for ' + description); }
let commandNumber = 0;
async function send(host, peers, actor, action, payload = {}, replay) {
  await pump(host, peers);
  const view = actor.client.lastView;
  const input = replay || { action, commandId: 'live_' + (++commandNumber) + '_' + randomUUID().replaceAll('-', ''), expectedVersion: view.version, roundId: view.round?.id, ...payload };
  let settled = false, value, error;
  const pending = actor.client.command(input).then(v => { value = v; settled = true; }, e => { error = e; settled = true; });
  await until(host, peers, () => settled, action + ' acknowledgement', 25000); await pending;
  if (error) throw error;
  await until(host, peers, () => host.client.lastView?.version >= input.expectedVersion + 1 && peers.filter(d => !d.client.closed).every(d => d.client.lastView?.version >= host.client.lastView.version), action + ' publication to every client', 25000);
  return { input, value };
}
async function rejected(host, peers, actor, action, payload, expectedCode, name) { let code = null; try { await send(host, peers, actor, action, payload); } catch (e) { code = e.code || e.message; } check(name, () => assert.equal(code, expectedCode), { rejectionCode: code }); }
function noPublicSecret(view, name) { const forbidden = ['truthfulId', 'secretAnswer', 'supportingFacts', 'revealExplanation', 'sources', 'identityId']; const visit = item => { if (!item || typeof item !== 'object') return; for (const [key, value] of Object.entries(item)) { assert.ok(!forbidden.includes(key), 'Public projection contains ' + key); visit(value); } }; check(name, () => { assert.equal(view.privateCard, null); const current = { ...view }; delete current.history; visit(current); assert.ok(!JSON.stringify(view).includes('identityId')); }); }
function roleCheck(formal, host, roundNumber) {
  const cards = formal.map(d => d.client.lastView.privateCard);
  check('Round ' + roundNumber + ': three distinct private cards and exactly one of each role', () => { assert.equal(new Set(cards.map(c => c.playerId)).size, 3); assert.deepEqual(cards.map(c => c.role).sort(), ['bluffer', 'thinker', 'truthful']); for (const card of cards) { assert.equal(Object.hasOwn(card, 'secretAnswer'), card.role === 'truthful'); assert.equal(Object.hasOwn(card, 'supportingFacts'), card.role === 'truthful'); } });
  noPublicSecret(host.client.lastView, 'Round ' + roundNumber + ': public host view contains no answer or Truthful identity');
  for (const d of formal) { const v = plain(d.client.lastView); delete v.privateCard; noPublicSecret({ ...v, privateCard: null }, 'Round ' + roundNumber + ': ' + d.label + ' has no other player secret'); }
  return { thinker: formal.find(d => d.client.lastView.privateCard.role === 'thinker'), truthful: formal.find(d => d.client.lastView.privateCard.role === 'truthful'), bluffer: formal.find(d => d.client.lastView.privateCard.role === 'bluffer') };
}
async function cleanup() {
  devices.forEach(d => { if (d.client.code && generatedCodes.has(d.client.code)) remember(d); d.client.close(); });
  const pendingUntil = Date.now() + 20000;
  while (devices.some(d => d.client.processing) && Date.now() < pendingUntil) await pause(100);
  for (const node of generatedNodes) {
    const ownRoom = [...generatedCodes].some(code => node.startsWith('/rooms/bluffking-' + code + '/'));
    const ownHistory = devices.some(d => node === '/rooms/bluff-identities/players/' + d.client.identity.historyToken);
    if (!ownRoom && !ownHistory) throw new Error('Refusing to delete a path outside the generated test scope.');
    report.cleanup.attempted++;
    try { const r = await liveFetch(databaseURL + node + '.json', { method: 'DELETE', signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error('HTTP ' + r.status); report.cleanup.deleted++; } catch (e) { report.cleanup.failed.push({ kind: ownHistory ? 'generated identity history' : 'generated room node', error: e.message }); }
  }
}
async function main() {
  const host = device('Live QA Host', storage(), true);
  let p1 = device('Live QA Amy');
  const p2 = device('Live QA Bob');
  const code = await roomCode(); await create(host, code); await join(p1, code); await join(p2, code);
  await until(host, [p1, p2], () => host.client.lastView?.players.length === 3 && p1.client.lastView?.self && p2.client.lastView?.self, 'three joins');
  check('Real Firebase joins create three independent persistent identities', () => { assert.equal(new Set([host, p1, p2].map(d => d.client.identity.id)).size, 3); assert.equal(new Set([host, p1, p2].map(d => d.client.roomToken)).size, 3); assert.equal(new Set([host, p1, p2].map(d => d.storage)).size, 3); });
  check('Shipped transport submits encrypted hybrid RSA/AES join envelopes', () => { for (const d of [p1, p2]) { assert.ok(d.packets.length); const packet = d.packets[0]; assert.deepEqual(Object.keys(packet).sort(), ['cipher', 'iv', 'key']); const content = JSON.stringify(packet); assert.ok(!content.includes(d.client.identity.id)); assert.ok(!content.includes(d.client.roomToken)); assert.ok(!content.includes(d.label)); assert.ok(packet.cipher.length > 100 && packet.key.length > 100); } });
  check('Player devices receive no engine or compiled answer bank', () => { for (const d of [p1, p2]) { assert.equal(d.ctx.BLUFF_ENGINE, undefined); assert.equal(d.ctx.BLUFF_QUESTIONS, undefined); } });
  check('The host transport timer remains active', () => assert.ok(host.client.timer && !host.client.closed));
  const hostPrivate = device('Live QA Host Private', host.storage); await hostPrivate.client.connect(code); remember(hostPrivate);
  let formal = [hostPrivate, p1, p2]; let peers = [...formal];
  await send(host, peers, host, 'start');
  check('The formal roster freezes to three seats and three rounds', () => { assert.equal(host.client.lastView.roster.length, 3); assert.equal(host.client.lastView.round.total, 3); });
  const initiallyKnown = host.client.lastView.round.topic.canonicalKnowledgeId;
  await send(host, peers, p1, 'knowTopic');
  check('I know this immediately replaces the topic and persists knowledge', () => { assert.notEqual(host.client.lastView.round.topic.canonicalKnowledgeId, initiallyKnown); assert.ok(p1.client.identity.history.known[initiallyKnown]); });
  const expectedScores = Object.fromEntries(host.client.lastView.roster.map(id => [id, 0]));
  const thinkerIds = [], revealedKnowledge = [];
  for (let number = 1; number <= 3; number++) {
    await send(host, peers, host, 'confirmTopic');
    let roles = roleCheck(formal, host, number); thinkerIds.push(roles.thinker.client.lastView.self.playerId);
    if (number === 1) {
      const original = plain(p1.client.lastView.privateCard), originalId = p1.client.identity.id, originalToken = p1.client.roomToken, originalPlayer = p1.client.lastView.self.playerId;
      p1.client.close(); const resumed = device('Live QA Amy', p1.storage); await resumed.client.connect(code); remember(resumed);
      check('Reconnect preserves device identity, room token, player seat and private role', () => { assert.equal(resumed.client.identity.id, originalId); assert.equal(resumed.client.roomToken, originalToken); assert.equal(resumed.client.lastView.self.playerId, originalPlayer); assert.deepEqual(plain(resumed.client.lastView.privateCard), original); });
      formal = formal.map(d => d === p1 ? resumed : d); peers = peers.map(d => d === p1 ? resumed : d); p1 = resumed;
      const roster = plain(host.client.lastView.roster), rounds = host.client.lastView.round.total;
      const spectator = device('Live QA Late Spectator'); await join(spectator, code); peers.push(spectator);
      await until(host, peers, () => spectator.client.lastView?.self, 'late spectator join');
      check('Late join receives a spectator projection without changing formal seats or rounds', () => { assert.deepEqual(plain(host.client.lastView.roster), roster); assert.equal(host.client.lastView.round.total, rounds); assert.equal(spectator.client.lastView.self.isFormal, false); assert.ok(spectator.client.lastView.privateCard == null); assert.equal(spectator.client.lastView.players.find(p => p.id === spectator.client.lastView.self.playerId).spectator, true); });
      await rejected(host, peers, spectator, 'ready', {}, 'player_only', 'A spectator cannot submit a formal-player ready command');
      roles = roleCheck(formal, host, number);
    }
    for (const d of formal) await send(host, peers, d, 'ready');
    check('Round ' + number + ': all three readiness acknowledgements synchronize', () => { assert.equal(host.client.lastView.round.readyCount, 3); assert.equal(host.client.lastView.round.allReady, true); });
    await send(host, peers, host, 'beginDiscussion');
    const firstSpotlight = host.client.lastView.round.currentSpotlightId;
    const truthId = roles.truthful.client.lastView.self.playerId, bluffId = roles.bluffer.client.lastView.self.playerId;
    await rejected(host, peers, roles.thinker, 'identify', { targetId: truthId }, 'spotlight_incomplete', 'Round ' + number + ': premature identification is rejected');
    if (number <= 2) {
      const challengeId = number === 1 ? truthId : bluffId;
      await send(host, peers, roles.thinker, 'challenge', { targetId: challengeId });
      check('Round ' + number + ': challenge works during the first Spotlight without advancing it', () => { assert.equal(host.client.lastView.round.challengeId, challengeId); assert.equal(host.client.lastView.round.currentSpotlightId, firstSpotlight); assert.equal(host.client.lastView.round.coveredIds.length, 0); });
      await rejected(host, peers, roles.thinker, 'challenge', { targetId: challengeId }, 'challenge_used', 'Round ' + number + ': a second challenge is rejected');
    }
    const next = await send(host, peers, roles.thinker, 'nextSpotlight');
    const afterNext = plain(host.client.lastView.round), nextVersion = host.client.lastView.version;
    await send(host, peers, roles.thinker, 'nextSpotlight', {}, next.input);
    check('Round ' + number + ': duplicate Next with the same commandId advances only once', () => { assert.equal(host.client.lastView.version, nextVersion); assert.deepEqual(plain(host.client.lastView.round), afterNext); assert.equal(host.client.lastView.round.coveredIds.length, 1); });
    await rejected(host, peers, roles.thinker, 'nextSpotlight', { expectedVersion: next.input.expectedVersion }, 'stale_version', 'Round ' + number + ': a new command with an old expectedVersion is rejected');
    await send(host, peers, roles.thinker, 'nextSpotlight');
    check('Round ' + number + ': both explainers have a Spotlight before identification', () => { assert.equal(host.client.lastView.round.allCovered, true); assert.equal(host.client.lastView.round.coveredIds.length, 2); assert.equal(new Set(host.client.lastView.round.coveredIds).size, 2); assert.equal(host.client.lastView.round.currentSpotlightId, null); });
    const identified = await send(host, peers, roles.thinker, 'identify', { targetId: truthId });
    const reveal = host.client.lastView.round.reveal;
    const thinkerId = roles.thinker.client.lastView.self.playerId;
    expectedScores[thinkerId] += number === 1 ? 0 : number === 2 ? 3 : 2; expectedScores[truthId] += 2;
    check('Round ' + number + ': reveal exposes the checked answer, roles and sources', () => { assert.equal(host.client.lastView.phase, 'reveal'); assert.equal(reveal.truthfulId, truthId); assert.equal(reveal.result.correct, true); assert.ok(reveal.secretAnswer && reveal.supportingFacts.length >= 2 && reveal.sources.length); for (const d of peers) assert.equal(d.client.lastView.round.reveal.secretAnswer, reveal.secretAnswer); });
    check('Round ' + number + ': score calculation matches the frozen point rules', () => assert.deepEqual(plain(host.client.lastView.scores), expectedScores));
    const scores = plain(host.client.lastView.scores), version = host.client.lastView.version, historyLength = host.client.lastView.history.length;
    await send(host, peers, roles.thinker, 'identify', {}, identified.input);
    check('Round ' + number + ': duplicate identification adds no score or history entry', () => { assert.deepEqual(plain(host.client.lastView.scores), scores); assert.equal(host.client.lastView.version, version); assert.equal(host.client.lastView.history.length, historyLength); });
    const kid = host.client.lastView.round.topic.canonicalKnowledgeId; revealedKnowledge.push(kid);
    check('Round ' + number + ': every formal player records revealed knowledge', () => { for (const d of formal) assert.ok(d.client.identity.history.known[kid]); });
    await send(host, peers, host, 'nextRound');
  }
  check('A full circle ends with each seat as Thinker exactly once', () => { assert.equal(new Set(thinkerIds).size, 3); assert.equal(host.client.lastView.phase, 'results'); assert.equal(host.client.lastView.history.length, 3); assert.equal(new Set(revealedKnowledge).size, 3); for (const d of peers) { assert.equal(d.client.lastView.phase, 'results'); assert.deepEqual(plain(d.client.lastView.scores), expectedScores); } });
  report.finalScores = { seatCount: 3, scores: Object.values(expectedScores), roundCount: 3 };
  const knownByAmy = Object.keys(p1.client.identity.history.known); const p1Identity = plain(p1.client.identity);
  host.client.close(); peers.forEach(d => d.client.close());
  const cloudOnlyStorage = storage(); p1Identity.history = { known: {}, seen: {} }; p1Identity.rooms = {}; cloudOnlyStorage.setItem('icebreak.bluff.identity.v1', JSON.stringify(p1Identity));
  const hostB = device('Live QA Host', host.storage, true), amyB = device('Live QA Amy', cloudOnlyStorage), bobB = device('Live QA Bob', p2.storage);
  const codeB = await roomCode(); await create(hostB, codeB); await join(amyB, codeB); await join(bobB, codeB);
  await until(hostB, [amyB, bobB], () => hostB.client.lastView?.players.length === 3 && amyB.client.lastView?.self && bobB.client.lastView?.self, 'cross-room joins');
  check('Cloud history restores known knowledge when the same identity has no local history', () => { for (const kid of knownByAmy) assert.ok(amyB.client.identity.history.known[kid]); });
  await send(hostB, [amyB, bobB], hostB, 'start');
  const persistedCanonical = (await hostB.client._request(hostB.client._roomPath('players/' + hostB.client.hostToken))).data;
  const canonical = typeof persistedCanonical?.data === 'string' ? JSON.parse(persistedCanonical.data) : persistedCanonical;
  const room = canonical.rooms[codeB]; const eligible = hostB.ctx.BLUFF_ENGINE.availableQuestions(canonical, room, hostB.ctx.BLUFF_QUESTIONS);
  const knownUnion = new Set(room.roster.flatMap(pid => Object.keys(canonical.identities[room.members.find(m => m.id === pid).identityId].known || {})));
  check('A new room excludes every formal player known knowledge ID from its whole eligible pool', () => { assert.ok(knownUnion.size >= 4); assert.ok(eligible.length > 0); for (const q of eligible) assert.ok(!knownUnion.has(q.canonicalKnowledgeId)); assert.ok(!knownUnion.has(hostB.client.lastView.round.topic.canonicalKnowledgeId)); });
  report.crossRoomKnownCount = knownUnion.size;
}
async function transferOnly() {
  const host = device('Transfer QA Original Host', storage(), true), amy = device('Transfer QA New Host'), bob = device('Transfer QA Bob');
  const code = await roomCode(); await create(host, code); await join(amy, code); await join(bob, code);
  await until(host, [amy, bob], () => host.client.lastView?.players.length === 3 && amy.client.lastView?.self && bob.client.lastView?.self, 'transfer test three joins');
  const hostPrivate = device('Transfer QA Original Private', host.storage); await hostPrivate.client.connect(code); remember(hostPrivate);
  let peers = [hostPrivate, amy, bob];
  await send(host, peers, host, 'start'); await send(host, peers, host, 'confirmTopic');
  roleCheck(peers, host, 'transfer baseline');
  const originalCredentials = { hostToken: host.client.hostToken, identityId: host.client.identity.id, playerId: host.client.lastView.self.playerId };
  const roster = plain(host.client.lastView.roster), roundId = host.client.lastView.round.id, knowledgeId = host.client.lastView.round.topic.canonicalKnowledgeId;
  const privateBefore = new Map(peers.map(d => [d.client.identity.id, plain(d.client.lastView.privateCard)]));
  await send(host, peers, host, 'transferHost', { targetId: amy.client.lastView.self.playerId });
  check('Live transfer changes host ownership without replacing the round or formal roster', () => { assert.equal(host.client.lastView.self.isHost, false); assert.equal(amy.client.lastView.self.isHost, true); assert.equal(host.client.lastView.round.id, roundId); assert.deepEqual(plain(host.client.lastView.roster), roster); });
  host.client.close();
  const newHost = device('Transfer QA Restored New Host', amy.storage, true); await newHost.client.connect(code); remember(newHost);
  check('The new host restores canonical state and encrypted-join key from its granted credential', () => { assert.equal(newHost.client.isHost, true); assert.equal(newHost.client.lastView.self.isHost, true); assert.ok(newHost.client.privateKey); assert.equal(newHost.client.lastView.round.id, roundId); assert.equal(newHost.client.lastView.round.topic.canonicalKnowledgeId, knowledgeId); assert.equal(newHost.client.lastView.privateCard, null); });
  // Restore a stale host credential to reproduce an original device that was
  // offline while ownership changed, rather than relying on its prior demotion.
  host.storage.setItem('icebreak.bluff.host.' + code, originalCredentials.hostToken);
  const formerHost = device('Transfer QA Reopened Original Host', host.storage, true); await formerHost.client.connect(code); remember(formerHost); peers.push(formerHost);
  check('A former host with a stale saved host credential reconnects as a formal participant without an exception', () => { assert.equal(formerHost.client.identity.id, originalCredentials.identityId); assert.equal(formerHost.client.lastView.self.playerId, originalCredentials.playerId); assert.equal(formerHost.client.isHost, false); assert.equal(formerHost.client.lastView.self.isHost, false); assert.equal(formerHost.client.lastView.self.isFormal, true); assert.equal(host.storage.getItem('icebreak.bluff.host.' + code), null); });
  await send(newHost, peers, formerHost, 'ready');
  check('The reconnected former host can submit a participant action through the new host', () => assert.equal(hostPrivate.client.lastView.privateCard.ready, true));
  const late = device('Transfer QA New Spectator'); await join(late, code); peers.push(late);
  await until(newHost, peers, () => late.client.lastView?.self, 'new host decrypts fresh spectator join');
  check('The restored new host processes a new encrypted join with the original room key', () => { assert.equal(late.client.lastView.self.isFormal, false); assert.equal(late.client.lastView.privateCard, null); assert.deepEqual(plain(newHost.client.lastView.roster), roster); });
  await send(newHost, peers, newHost, 'beginDiscussion');
  check('The new host continues discussion and every original private role and answer remain unchanged', () => { assert.equal(newHost.client.lastView.phase, 'discussion'); assert.equal(newHost.client.lastView.round.id, roundId); assert.equal(newHost.client.lastView.round.topic.canonicalKnowledgeId, knowledgeId); for (const d of [hostPrivate, amy, bob]) { const before = privateBefore.get(d.client.identity.id), after = d.client.lastView.privateCard; assert.equal(after.roundId, before.roundId); assert.equal(after.playerId, before.playerId); assert.equal(after.role, before.role); assert.equal(after.secretAnswer, before.secretAnswer); if (before.supportingFacts) assert.deepEqual(plain(after.supportingFacts), before.supportingFacts); } });
  noPublicSecret(newHost.client.lastView, 'Transferred public host screen still contains no current answer or Truthful identity');
  report.sourceChangeNote = 'Current source includes former-host stale-credential fallback and history persistence before private view publication. The earlier 63 checks exercised the unchanged create/join/roles/score/history contract; this run exercises the final transfer/reconnect path.';
}
(async () => {
  if (process.argv.includes('--cleanup-last-roster')) {
    const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(previous.target, new URL(databaseURL).hostname);
    assert.ok(Array.isArray(previous.rooms) && previous.rooms.length <= 2);
    const removed = [];
    for (const code of previous.rooms) {
      assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      const r = await liveFetch(databaseURL + '/rooms/bluffking-' + code + '/roster.json', { method: 'DELETE', signal: AbortSignal.timeout(15000) });
      assert.ok(r.ok, 'Could not remove prior generated test roster: HTTP ' + r.status); removed.push(code);
    }
    previous.previousRosterCleanup = { at: new Date().toISOString(), removed: removed.length };
    fs.writeFileSync(output, JSON.stringify(previous, null, 2) + '\n');
    console.log(JSON.stringify({ removedGeneratedTestRosters: removed.length })); return;
  }
  if (process.argv.includes('--transfer-only')) {
    const previous = JSON.parse(fs.readFileSync(output, 'utf8')); assert.equal(previous.target, report.target); assert.equal(previous.success, true);
    try { await transferOnly(); report.success = true; } catch (e) { report.success = false; report.failure = { code: e.code || null, message: e.message, stack: String(e.stack || '').split('\n').slice(0, 6).join('\n') }; console.error('Live transfer verification failed:', e.code || '', e.message); }
    finally { await cleanup(); report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(c => c.passed).length; report.failed = report.checks.filter(c => !c.passed).length; if (report.cleanup.failed.length) report.success = false; previous.additionalVerifications ||= []; previous.additionalVerifications.push({ kind: 'Final source: live transfer and former-host reconnect', ...report }); previous.success = previous.success && report.success; previous.totalPassedChecks = previous.passed + previous.additionalVerifications.reduce((sum, run) => sum + run.passed, 0); fs.writeFileSync(output, JSON.stringify(previous, null, 2) + '\n'); console.log(JSON.stringify({ success: report.success, passed: report.passed, failed: report.failed, totalPassedChecks: previous.totalPassedChecks, rooms: report.rooms.length, cleanupDeleted: report.cleanup.deleted, cleanupFailed: report.cleanup.failed.length, report: output })); if (!report.success) process.exitCode = 1; }
    return;
  }
  try { await main(); report.success = true; } catch (e) { report.success = false; report.failure = { code: e.code || null, message: e.message, stack: String(e.stack || '').split('\n').slice(0, 6).join('\n') }; console.error('Live verification failed:', e.code || '', e.message); }
  finally { await cleanup(); report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(c => c.passed).length; report.failed = report.checks.filter(c => !c.passed).length; if (report.cleanup.failed.length) report.success = false; fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ success: report.success, passed: report.passed, failed: report.failed, rooms: report.rooms.length, requests: report.network.requests, cleanupDeleted: report.cleanup.deleted, cleanupFailed: report.cleanup.failed.length, report: output })); if (!report.success) process.exitCode = 1; }
})();
