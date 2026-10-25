// Fresh disposable production QA for the 2026-10-25 service release:
// BLUFF PARTY "Everyone votes" + Halloween pack, and Once opening stories.
// Exact fresh nodes only (created where null, deleted only when still ours);
// no room listing, no existing-room access, no secret loading or credential
// output. Live execution requires --live. Also checks the public service
// boundary (readiness, CORS, synthetic ticket, private runtime, search, lyrics).
'use strict';
const crypto = require('node:crypto');
const BF = require('../bluff-king-engine.js');
const BA = require('../runtime/bluff-executor.cjs').adapters.bluffking;
const topics = require('../bluff-king-topics.js');
const ONCE = require('../once-upon-a-time-engine.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const ORIGIN = 'https://icebreaker-youtube-search.vercel.app';
const SERVICE = ORIGIN + '/api/hub-executor';
const HUB = 'https://livechat-two-alpha.vercel.app';
const uid = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {}).filter(x => x != null);
const must = condition => { if (!condition) throw new Error('modes_smoke_failed'); };

function bluffFixture(now) {
  const game = 'bluffking', code = 'HV' + uid(4).toUpperCase(), marker = uid(), controlToken = uid(32), hostId = uid(20), state = BF.blankStore();
  let seq = 0; const options = { now, rng: () => 0, uuid: () => 'qa-modes-' + ++seq };
  BF.applyCommand(state, hostId, { room: code, action: 'create', name: 'Disposable manager', participate: false }, topics, options);
  const originals = Array.from({ length: 3 }, (_, i) => ({ playerNum: i + 1, originalToken: uid(10), name: 'Disposable participant ' + (i + 1) }));
  const seats = [], cardRoster = [], members = { [hostId]: { token: controlToken, historyToken: uid(32) } };
  for (const row of originals) {
    const identityId = uid(20), token = uid(32), historyToken = uid(32);
    BF.applyCommand(state, identityId, { room: code, action: 'join', name: row.name, participate: true }, topics, options);
    const member = state.rooms[code].members.at(-1); member.playerNum = row.playerNum;
    seats.push({ playerNum: row.playerNum, token }); members[identityId] = { token, historyToken };
    cardRoster.push({ ...row, identityId, token, historyToken, playerId: member.id });
  }
  state.transport = { members, cardRoster, accepted: {}, acknowledgements: {}, executorSessionId: code + ':bluffking', publicationRevision: 0 };
  state.rooms[code].sharedControls = true;
  // The table stays in the lobby: the mode and pack are lobby choices.
  BA.pulse(state, { code, now, seats, onlineNums: [1, 2, 3] });
  return { game, code, marker, controlToken, originals, seats, state, sessionId: state.transport.executorSessionId,
    canonicalPath: 'rooms/bluffking-' + code + '/players/' + controlToken, known: new Map(), attempted: new Set() };
}
function onceFixture(now) {
  const game = 'onceupon', code = 'HV' + uid(4).toUpperCase(), marker = uid(), controlToken = uid(16);
  const originals = Array.from({ length: 3 }, (_, i) => ({ playerNum: i + 1, originalToken: uid(10), name: 'Disposable participant ' + (i + 1) }));
  const seats = originals.map(p => ({ playerNum: p.playerNum, token: p.originalToken }));
  const state = ONCE.create({ id: code + ':' + game, roster: originals, now, seed: 1025 });
  return { game, code, marker, controlToken, originals, seats, state, sessionId: state.sessionId,
    canonicalPath: 'rooms/' + code + '/players/' + controlToken, known: new Map(), attempted: new Set() };
}

async function run({ fetchImpl = globalThis.fetch, now = Date.now, games = ['bluffking', 'onceupon'] } = {}) {
  const fixtures = [], report = { ok: false, passed: 0, step: 'initial', boundary: {}, games: [], cleanup: { tracked: 0, deleted: 0, empty: 0, failed: 0 } };
  const check = (condition, g) => { must(condition); report.passed++; if (g) g.passed++; };
  const http = (url, options = {}) => fetchImpl(url, { credentials: 'omit', signal: AbortSignal.timeout(65000), ...options });
  async function api(body, error = '') {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), data = await response.json();
    if (error) { must(!response.ok && data.error === error); return data; } must(response.ok && data.ok !== false); return data;
  }
  const decode = (f, raw) => f.game === 'bluffking' ? BA.decode(raw) : raw.state || JSON.parse(raw.stateJson);
  async function readPath(f, path) {
    must(f.known.has(path)); const response = await http(DATABASE + '/' + path + '.json', { headers: { 'X-Firebase-ETag': 'true' } }); must(response.ok);
    const etag = response.headers.get('etag'); must(etag); return { value: await response.json(), etag };
  }
  const marker = f => ({ marker: f.marker, game: f.game });
  function addPath(f, path, kind, extra = {}) { must(!f.known.has(path)); f.known.set(path, { kind, ...extra }); return path; }
  const originalPath = (f, n) => 'rooms/' + f.code + '/players/' + f.originals[n - 1].originalToken;
  const seatPath = (f, n) => 'rooms/' + (f.game === 'bluffking' ? 'bluffking-' : '') + f.code + '/players/' + f.seats[n - 1].token;
  function ownedRoot(f, node) {
    if (!node || node.qaModes?.marker !== f.marker || node.qaModes.game !== f.game || node.game !== f.game) return false;
    try { return (f.game === 'bluffking' ? BA.session(decode(f, node)) : decode(f, node).sessionId) === f.sessionId; } catch { return false; }
  }
  function ownedNode(f, path, node, state, raw) {
    const info = f.known.get(path); if (!info || !node) return false;
    if (info.kind === 'canonical') return ownedRoot(f, node);
    if (info.kind === 'history') {
      // Fresh random history tokens created by this run for its own identities.
      return ownedRoot(f, raw) && state.transport?.members[info.identityId]?.historyToken === info.historyToken && Object.keys(node).every(key => ['known', 'seen'].includes(key));
    }
    if (info.kind === 'original' && f.game === 'bluffking') {
      const row = state?.transport?.cardRoster?.find(p => p.originalToken === f.originals[info.num - 1].originalToken);
      return node.qaModes?.marker === f.marker && node.qaModes.game === f.game && !!row && node.game === 'bluffking' && node.playerNum === info.num && node.bluff?.token === row.token && node.bluff?.room === f.code;
    }
    if (info.kind === 'private' && f.game === 'bluffking') {
      const row = state?.transport?.cardRoster?.[info.num - 1];
      if (!ownedRoot(f, raw) || !row || row.token !== info.token || node.sessionBinding?.room !== f.code || node.sessionBinding.identityId !== row.identityId) return false;
      if (node.qaModes?.marker === f.marker) return true;
      return node.hubExecutor?.v === 1 && node.hubExecutor.game === f.game && node.hubExecutor.sessionId === f.sessionId && node.hubExecutor.capsule === raw.executor.capsule;
    }
    return node.qaModes?.marker === f.marker && node.qaModes.game === f.game && node.game === f.game && node.playerNum === info.num && node.once?.sessionId === f.sessionId;
  }
  async function create(f, path, value) {
    const snapshot = await readPath(f, path); must(snapshot.value === null); f.attempted.add(path);
    const response = await http(DATABASE + '/' + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': snapshot.etag }, body: JSON.stringify(value) }); must(response.ok);
  }
  async function canonical(f) { const raw = (await readPath(f, f.canonicalPath)).value; must(ownedRoot(f, raw)); return { raw, state: decode(f, raw) }; }
  function discover(f, state) {
    must(state.transport.executorSessionId === f.sessionId && state.transport.cardRoster.length === 3);
    for (const row of state.transport.cardRoster) {
      must(row.originalToken === f.originals[row.playerNum - 1].originalToken && /^[a-f0-9]{64}$/.test(row.token));
      f.seats[row.playerNum - 1] = { playerNum: row.playerNum, token: row.token };
      const path = seatPath(f, row.playerNum); if (!f.known.has(path)) { addPath(f, path, 'private', { num: row.playerNum, token: row.token }); f.attempted.add(path); }
    }
    for (const [identityId, binding] of Object.entries(state.transport.members)) {
      must(/^[a-f0-9]{40}$/.test(identityId) && /^[a-f0-9]{64}$/.test(binding.historyToken));
      const path = 'rooms/bluff-identities/players/' + binding.historyToken; if (!f.known.has(path)) { addPath(f, path, 'history', { identityId, historyToken: binding.historyToken }); f.attempted.add(path); }
    }
  }
  async function card(f, n) {
    const { raw, state } = await canonical(f); if (f.game === 'bluffking') discover(f, state);
    const path = seatPath(f, n), node = (await readPath(f, path)).value; must(ownedNode(f, path, node, state, raw));
    must(node.hubExecutor?.v === 1 && node.hubExecutor.game === f.game && node.hubExecutor.sessionId === f.sessionId);
    const view = f.game === 'bluffking' ? JSON.parse(node.viewJson) : node.once; must(view.sharedControls === true);
    const text = JSON.stringify(node); must(!text.includes(f.controlToken));
    for (const s of f.seats) if (s.playerNum !== n) must(!text.includes(JSON.stringify(s.token)));
    return { node, view, raw, state };
  }
  let lastTouch = 0;
  async function execute(f, n, command) {
    const before = await card(f, n); await api({ operation: 'execute', capsule: before.node.hubExecutor.capsule, token: f.seats[n - 1].token, ...(command ? { command } : {}) });
    return card(f, n);
  }
  async function keepAlive(f) { if (Date.now() - lastTouch < 25000) return; for (const s of f.seats) await execute(f, s.playerNum); lastTouch = Date.now(); }
  async function command(f, n, type, extra = {}) {
    await keepAlive(f);
    const before = await card(f, n);
    const input = f.game === 'bluffking' ? { action: type, commandId: 'qa-command-' + uid(), expectedVersion: before.state.rooms[f.code].version, roundId: before.state.rooms[f.code].round?.id, ...extra }
      : { id: 'qa-command-' + uid(), type, sessionId: f.sessionId, turnId: before.view.turnId, ...extra };
    const after = await execute(f, n, input);
    if (f.game === 'bluffking') must(after.node.ack?.commandId === input.commandId && after.node.ack.ok === true);
    else must(after.view.reply?.id === input.id && !after.view.reply.error);
    return after;
  }
  async function open(f) {
    addPath(f, f.canonicalPath, 'canonical');
    await create(f, f.canonicalPath, { game: f.game, ...(f.game === 'bluffking' ? { data: JSON.stringify(f.state) } : { stateJson: JSON.stringify(f.state) }), revision: 1, qaModes: marker(f) });
    for (const row of f.originals) {
      const path = originalPath(f, row.playerNum); addPath(f, path, 'original', { num: row.playerNum });
      if (f.game === 'bluffking') {
        const bound = f.state.transport.cardRoster[row.playerNum - 1];
        await create(f, path, { game: f.game, playerNum: row.playerNum, name: row.name, bluff: { version: 2, room: f.code, token: bound.token, identityId: bound.identityId, historyToken: bound.historyToken }, qaModes: marker(f) });
        const privatePath = seatPath(f, row.playerNum); addPath(f, privatePath, 'private', { num: row.playerNum, token: bound.token });
        await create(f, privatePath, { ...BA.project(f.state, f.seats[row.playerNum - 1], { code: f.code, now: now(), seats: f.seats, onlineNums: [1, 2, 3] }), qaModes: marker(f) });
      } else await create(f, path, { ...ONCE.view(f.state, row.playerNum, now()), qaModes: marker(f) });
    }
    if (f.game === 'bluffking') {
      discover(f, f.state);
      for (const [path, info] of f.known) if (info.kind === 'history') { f.attempted.delete(path); await create(f, path, { known: {}, seen: {} }); }
    }
    const result = await api({ operation: 'register', game: f.game, code: f.code, controlToken: f.controlToken, sessionId: f.sessionId, seats: f.seats }); must(result.capsule);
    lastTouch = Date.now();
    return card(f, 1);
  }
  const numOf = (state, memberId) => state.transport.cardRoster.find(row => row.playerId === memberId)?.playerNum;

  try {
    report.step = 'boundary';
    const health = await http(SERVICE + '?release=modes-1', { cache: 'no-store' }), readiness = await health.json();
    report.boundary.ready = health.status === 200 && readiness.version === 1 && readiness.ready === true; must(report.boundary.ready);
    const cors = await http(SERVICE, { method: 'OPTIONS', headers: { Origin: HUB, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' } });
    report.boundary.cors = cors.status === 204 && cors.headers.get('access-control-allow-origin') === HUB; must(report.boundary.cors);
    const invalid = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'execute', capsule: 'invalid-synthetic-ticket', token: '1'.repeat(32) }) });
    let invalidBody; try { invalidBody = await invalid.json(); } catch {}
    report.boundary.syntheticRejected = invalid.status === 403 && invalidBody?.error === 'invalid_ticket'; must(report.boundary.syntheticRejected);
    const privateRuntime = await http(ORIGIN + '/runtime/hub-executor-core.cjs?release=modes-1'), privateHub = await http(HUB + '/runtime/hub-executor-core.cjs?release=modes-1');
    report.boundary.runtimeBlocked = privateRuntime.status === 404 && privateHub.status === 404; must(report.boundary.runtimeBlocked);
    const lyrics = await http(ORIGIN + '/api/open-mic-lyrics?title=x&release=modes-1'); let lyricsBody; try { lyricsBody = await lyrics.json(); } catch {}
    report.boundary.lyricsRetired = lyrics.status === 410 && lyricsBody?.error === 'lyrics_retired'; must(report.boundary.lyricsRetired);
    const search = await http(ORIGIN + '/api/open-mic-discovery?mode=popular&region=TW');
    report.boundary.searchStatus = search.status; // 200 with a configured key; 429/503 are reported, not failed.
    report.passed += 5;
    const serverTime = Date.parse(health.headers.get('date')), clientStart = now(), base = Number.isFinite(serverTime) ? serverTime - 1000 : clientStart - 1000;
    const at = () => base + now() - clientStart;

    if (games.includes('bluffking')) {
      const g = { game: 'bluffking', passed: 0, ok: false }; report.games.push(g);
      report.step = 'bluff:open'; const f = bluffFixture(at()); fixtures.push(f);
      let current = await open(f);
      // An older service projects without these lists; the host page then hides both pickers.
      check(Array.isArray(current.view.modes) && current.view.modes.includes('thinker') && current.view.modes.includes('vote') && current.view.mode === 'thinker', g);
      check(Array.isArray(current.view.decks) && current.view.decks.some(d => d.id === 'halloween'), g);
      report.step = 'bluff:setMode'; current = await command(f, 2, 'setMode', { mode: 'vote' }); check(current.view.mode === 'vote', g);
      report.step = 'bluff:setDeck'; current = await command(f, 1, 'setDeck', { deck: 'halloween' }); check(current.view.deck === 'halloween', g);
      report.step = 'bluff:start'; current = await command(f, 1, 'start');
      check(current.state.rooms[f.code].round.mode === 'vote' && current.state.rooms[f.code].round.thinkerId === null, g);
      check(current.view.round?.topic?.deck === 'halloween', g);
      report.step = 'bluff:confirm'; current = await command(f, 1, 'confirmTopic'); check(current.state.rooms[f.code].phase === 'prepare', g);
      report.step = 'bluff:discussion'; current = await command(f, 1, 'beginDiscussion');
      let room = current.state.rooms[f.code]; check(room.phase === 'discussion' && room.round.spotlightOrder.length === 3, g);
      for (let i = 0; i < 3; i++) {
        report.step = 'bluff:speaker-' + (i + 1);
        const speakerNum = numOf(current.state, room.round.spotlightOrder[room.round.spotlightIndex]); must(speakerNum);
        current = await command(f, speakerNum, 'nextSpotlight'); room = current.state.rooms[f.code];
      }
      check(room.round.allCovered === true, g);
      report.step = 'bluff:openVote'; current = await command(f, 3, 'openVote'); room = current.state.rooms[f.code]; check(room.phase === 'vote', g);
      report.step = 'bluff:self-vote';
      { const before = await card(f, 1), self = before.state.transport.cardRoster[0].playerId;
        const input = { action: 'castVote', commandId: 'qa-command-' + uid(), expectedVersion: before.state.rooms[f.code].version, roundId: before.state.rooms[f.code].round.id, targetId: self };
        const after = await execute(f, 1, input); check(after.node.ack?.commandId === input.commandId && after.node.ack.ok === false && after.node.ack.error?.code === 'self_vote', g); }
      const truth = room.round.truthfulId, ids = current.state.transport.cardRoster.map(row => row.playerId);
      for (let n = 1; n <= 3; n++) {
        report.step = 'bluff:vote-' + n;
        const self = ids[n - 1], targetId = self === truth ? ids.find(id => id !== self) : truth;
        current = await command(f, n, 'castVote', { targetId }); room = current.state.rooms[f.code];
        if (n < 3) check(room.phase === 'vote' && current.view.round.myVoteId === targetId && !JSON.stringify(current.view.round).includes('"votes"'), g);
      }
      check(room.phase === 'reveal' && room.round.result && room.history.at(-1)?.mode === 'vote', g);
      // Both bluffers found the Truth Teller (+2 each, Truth Teller +1 per finder);
      // the Truth Teller's vote gives one bluffer +1 for being picked.
      const delta = room.round.result.delta, expected = BF.scoreVoteRound(room.round.playerIds, truth, room.history.at(-1).votes).delta;
      check(delta[truth].points === 2 && ids.every(id => delta[id].points === expected[id].points), g);
      check(current.view.round?.reveal?.truthfulId === truth && Object.keys(current.view.round.reveal.votes || {}).length === 3, g);
      g.ok = true;
    }
    if (games.includes('onceupon')) {
      const g = { game: 'onceupon', passed: 0, ok: false }; report.games.push(g);
      report.step = 'once:open'; const f = onceFixture(at()); fixtures.push(f);
      let current = await open(f); check(current.view.phase === 'LOBBY', g);
      report.step = 'once:deal'; current = await command(f, 2, 'deal');
      check(current.view.phase === 'CHOOSING_FIRST' && current.view.opening && current.view.opening.id && current.view.starterCard == null, g);
      check(current.view.actions?.newOpening === true, g);
      const first = current.view.opening.id;
      report.step = 'once:newOpening'; current = await command(f, 1, 'newOpening');
      check(current.view.opening?.id && current.view.opening.id !== first && list(current.state.recentOpenings).includes(first), g);
      report.step = 'once:randomFirst'; current = await command(f, 3, 'randomFirst'); check(current.view.phase === 'STORYTELLING' && current.view.opening?.id, g);
      g.ok = true;
    }
    report.ok = true; report.step = 'complete';
  } catch (error) { report.ok = false; report.error = error.message === 'modes_smoke_failed' ? 'modes_smoke_failed' : 'qa_failed'; }
  finally {
    // Delete only nodes this run created and that still carry its marker/session.
    for (const f of fixtures) {
      let raw, state; try { ({ raw, state } = await canonical(f)); if (f.game === 'bluffking') discover(f, state); } catch {}
      const entries = [...f.known].filter(([path]) => f.attempted.has(path)).sort((a, b) => (a[1].kind === 'canonical') - (b[1].kind === 'canonical'));
      report.cleanup.tracked += entries.length;
      for (const [path] of entries) try {
        const snapshot = await readPath(f, path); if (snapshot.value === null) { report.cleanup.empty++; continue; }
        must(ownedNode(f, path, snapshot.value, state, raw));
        const response = await http(DATABASE + '/' + path + '.json', { method: 'DELETE', headers: { 'If-Match': snapshot.etag } }); must(response.ok); report.cleanup.deleted++;
      } catch { report.cleanup.failed++; report.ok = false; }
    }
  }
  return report;
}
module.exports = { run, bluffFixture, onceFixture };
if (require.main === module) {
  if (!process.argv.includes('--live')) { process.stdout.write('{"ok":false,"reason":"live_flag_required"}\n'); process.exitCode = 1; }
  else run().then(report => { process.stdout.write(JSON.stringify(report) + '\n'); if (!report.ok) process.exitCode = 1; }).catch(() => { process.stdout.write('{"ok":false,"error":"qa_failed"}\n'); process.exitCode = 1; });
}
