// Disposable production RPC smoke. Exact fresh token nodes only; no browser
// Host, room listing, user-room reads, credential logs or saved private data.
'use strict';
const { randomBytes } = require('node:crypto');
const CUT = require('../cut-engine.js');
const TALK = require('../talk-engine.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const list = v => Array.isArray(v) ? v.filter(x => x != null) : Object.values(v || {});
const uid = () => randomBytes(16).toString('hex');
const fail = () => { throw new Error('smoke_failed'); };
const must = value => { if (!value) fail(); };
async function run({ fetchImpl = globalThis.fetch, delay = ms => new Promise(r => setTimeout(r, ms)), now = Date.now } = {}) {
  const fixtures = [], attempted = new Set();
  const report = { ok: false, passed: 0, phase: 'initializing', cleaned: 0, cleanupFailed: 0 };
  const check = value => { must(value); report.passed++; };
  async function http(url, options = {}) {
    return fetchImpl(url, { credentials: 'omit', signal: AbortSignal.timeout(20000), ...options });
  }
  async function api(body, expectedError = '') {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (expectedError) { must(!response.ok && data.error === expectedError); return data; }
    must(response.ok); return data;
  }
  function fixture(game, engine, startTime) {
    const code = 'HX' + randomBytes(4).toString('hex').toUpperCase(), marker = uid(), controlToken = uid();
    const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: randomBytes(10).toString('hex') }));
    const initialSession = code + '-' + game;
    const path = num => 'rooms/' + code + '/players/' + (num === 0 ? controlToken : seats[num - 1].token);
    const known = new Set([path(0), ...seats.map(s => path(s.playerNum))]);
    const state = engine.create({ id: initialSession, now: startTime, seed: randomBytes(4).readUInt32LE(),
      roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Smoke participant ' + s.playerNum })),
      speed: 'custom', category: 'mixed', customMinSeconds: 5, customMaxSeconds: 5,
      topic: { id: 'smoke', title: 'An imaginary place', question: 'What would we build together?', followUps: ['Who would visit?'] }, seconds: 120 });
    const ownedSession = id => typeof id === 'string' && (id === initialSession || game === 'letstalk' && id.startsWith(initialSession + ':topic:'));
    const owned = (node, num) => node?.qaSmoke?.marker === marker && node.qaSmoke.game === game &&
      (num === 0 ? node.game === game && ownedSession((node.state || (node.stateJson ? JSON.parse(node.stateJson) : null))?.sessionId)
        : node.game === game && node.playerNum === num && ownedSession(node[game === 'letstalk' ? 'talk' : 'cut']?.sessionId));
    const f = { game, engine, code, marker, controlToken, seats, state, initialSession, path, known, owned }; fixtures.push(f); return f;
  }
  async function read(f, num) {
    const path = f.path(num); must(f.known.has(path));
    const response = await http(DATABASE + '/' + path + '.json', { headers: { 'X-Firebase-ETag': 'true' } });
    must(response.ok); const etag = response.headers.get('etag'); must(etag);
    return { value: await response.json(), etag };
  }
  async function write(f, num, change, create = false) {
    const path = f.path(num); must(f.known.has(path));
    for (let i = 0; i < 5; i++) {
      const old = await read(f, num);
      if (create) must(old.value === null); else must(f.owned(old.value, num));
      const value = change(old.value); attempted.add(path);
      const response = await http(DATABASE + '/' + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': old.etag }, body: JSON.stringify(value) });
      if (response.status === 412 && !create) continue;
      must(response.ok); return;
    }
    fail();
  }
  async function open(f) {
    // Each write independently proves this exact node was null immediately
    // before creation; If-Match prevents a race from replacing another node.
    await write(f, 0, () => ({ game: f.game, stateJson: JSON.stringify(f.state), revision: 1,
      qaSmoke: { marker: f.marker, game: f.game } }), true);
    for (const seat of f.seats) await write(f, seat.playerNum, () => ({ ...f.engine.view(f.state, seat.playerNum, now()), qaSmoke: { marker: f.marker, game: f.game } }), true);
    // The sole management-credential request for this fixture.
    await api({ operation: 'register', game: f.game, code: f.code, controlToken: f.controlToken, sessionId: f.initialSession, seats: f.seats });
  }
  async function card(f, num) {
    const value = (await read(f, num)).value; must(f.owned(value, num));
    const key = f.game === 'letstalk' ? 'talk' : 'cut', s = value[key];
    must(value.hubExecutor?.v === 1 && value.hubExecutor.game === f.game && value.hubExecutor.sessionId === s.sessionId);
    must(s.sharedControls === true);
    const serialized = JSON.stringify(value);
    must(!serialized.includes(JSON.stringify(f.controlToken)));
    for (const other of f.seats.filter(seat => seat.playerNum !== num)) must(!serialized.includes(JSON.stringify(other.token)));
    if (f.game === 'cut') for (const field of ['deadline', 'speakingDurationMs', 'pendingDurationMs', 'stats', 'recent', 'teamScore', 'score']) must(!Object.hasOwn(s, field));
    report.phase = f.game + ':' + s.phase; return value;
  }
  async function pulse(f, num) {
    const value = await card(f, num);
    await api({ operation: 'execute', capsule: value.hubExecutor.capsule, token: f.seats[num - 1].token });
    return card(f, num);
  }
  async function command(f, num, type, extra = {}, expectedError = '') {
    const value = await card(f, num), key = f.game === 'letstalk' ? 'talk' : 'cut', s = value[key];
    const action = { id: uid(), type, sessionId: s.sessionId, turnId: s.turnId, ...extra };
    await write(f, num, old => ({ ...old, [key + 'Action']: action }));
    await api({ operation: 'execute', capsule: value.hubExecutor.capsule, token: f.seats[num - 1].token });
    const next = await card(f, num); check(next[key].reply?.id === action.id && (next[key].reply.error || '') === expectedError); return next;
  }
  async function phase(f, wanted) {
    const started = now();
    do { const value = await pulse(f, 2); if (value.cut.phase === wanted) return value; await delay(500); } while (now() - started < 20000);
    fail();
  }
  try {
    const response = await http(SERVICE); const readiness = await response.json(); must(response.ok && readiness.ready === true);
    const serverTime = Date.parse(response.headers.get('date'));
    const startTime = Number.isFinite(serverTime) ? serverTime - 1000 : now() - 60000;
    const cut = fixture('cut', CUT, startTime); await open(cut);
    let value = await card(cut, 2); check(value.cut.canManage === true && value.cut.phase === 'ready');
    value = await command(cut, 2, 'settings'); check(value.cut.phase === 'setup');
    value = await command(cut, 3, 'cancelSettings'); check(value.cut.phase === 'ready');
    await command(cut, 3, 'settings');
    value = await command(cut, 2, 'configure', { speed: 'custom', category: 'mixed', customMinSeconds: 5, customMaxSeconds: 5 });
    check(value.cut.phase === 'ready' && value.cut.customMinSeconds === 5 && value.cut.customMaxSeconds === 5);
    const oldTurn = value.cut.turnId;
    value = await command(cut, 3, 'begin'); check(value.cut.phase === 'countdown' && Number.isFinite(value.cut.phaseUntil));
    value = await phase(cut, 'speaking'); check(value.cut.phase === 'speaking');
    value = await phase(cut, 'cut'); check(value.cut.cutsCompleted === 1 && value.cut.cutEvent && value.cut.nextSpeaker !== value.cut.speaker);
    for (const seat of cut.seats) await card(cut, seat.playerNum);
    value = await command(cut, 2, 'stop'); check(value.cut.phase === 'stopped');
    value = await command(cut, 3, 'restart'); check(value.cut.phase === 'ready' && value.cut.cutsCompleted === 0);
    value = await command(cut, 2, 'begin', { turnId: oldTurn }, 'stale_turn'); check(value.cut.phase === 'ready');
    const talk = fixture('letstalk', TALK, startTime); await open(talk);
    const oldCard = await card(talk, 3), oldCapsule = oldCard.hubExecutor.capsule;
    value = await command(talk, 2, 'newTopic', { confirm: true, topic: { id: 'smoke-next', question: 'Imagine a welcoming shop. What belongs inside?', followUps: ['Who visits?'] },
      mode: 'write', seconds: 30, gameMode: 'normal', crazySeconds: 120, showStarters: true });
    check(value.talk.phase === 'thinking' && value.talk.mode === 'write' && value.talk.sessionId !== talk.initialSession && value.hubExecutor.capsule !== oldCapsule);
    const capsule = value.hubExecutor.capsule, sessionId = value.talk.sessionId;
    for (const seat of talk.seats) { const next = await card(talk, seat.playerNum); check(next.hubExecutor.capsule === capsule && next.talk.sessionId === sessionId); }
    await api({ operation: 'execute', capsule: oldCapsule, token: talk.seats[2].token,
      command: { id: uid(), type: 'start', sessionId: talk.initialSession, turnId: oldCard.talk.turnId } }, 'stale_session'); report.passed++;
    await pulse(talk, 3); value = await command(talk, 3, 'start'); check(value.talk.phase === 'talking' && list(value.talk.roster).some(p => p.playerNum === value.talk.speaker));
    await command(talk, 2, 'starters', { show: false }); check((await card(talk, 3)).talk.showStarters === false);
    report.ok = true;
  } catch (_) { report.ok = false; }
  finally {
    // No parent deletes. A foreign marker, changed game/session, conflicting
    // ETag or failed ownership check leaves the node untouched and fails QA.
    for (const f of fixtures) for (const num of [0, ...f.seats.map(s => s.playerNum)]) {
      if (!attempted.has(f.path(num))) continue;
      try {
        const old = await read(f, num); if (old.value === null) continue;
        must(f.owned(old.value, num));
        const response = await http(DATABASE + '/' + f.path(num) + '.json', { method: 'DELETE', headers: { 'If-Match': old.etag } });
        must(response.ok); report.cleaned++;
      } catch (_) { report.cleanupFailed++; report.ok = false; }
    }
  }
  return report;
}
module.exports = { run };
if (require.main === module) run().then(report => { process.stdout.write(JSON.stringify(report) + '\n'); if (!report.ok) process.exitCode = 1; }).catch(() => { process.stdout.write('{"ok":false,"phase":"failed"}\n'); process.exitCode = 1; });
