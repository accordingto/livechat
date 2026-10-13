'use strict';
// Disposable Life Story QA through the real Hub capability service. No room
// enumeration, real-room reads, secrets, transcripts, credential output or parent deletes.
const { randomBytes } = require('node:crypto');
const DIXIT = require('../dixit-engine.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const list = value => Array.isArray(value) ? value.filter(v => v != null) : Object.values(value || {});
const uid = bytes => randomBytes(bytes || 16).toString('hex');
const copy = value => structuredClone(value);

async function run({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const code = 'LS' + uid(4).toUpperCase(), marker = uid(), controlToken = uid();
  const initialSession = code + ':life-story-smoke', sessions = new Set([initialSession]);
  const seats = [1, 2, 3, 4].map(playerNum => ({ playerNum, token: uid(10) }));
  const roster = seats.map(s => ({ playerNum: s.playerNum, name: 'Disposable Life Story ' + s.playerNum }));
  const path = num => `rooms/${code}/players/${num === 0 ? controlToken : seats[num - 1].token}`;
  const allowed = new Set([0, 1, 2, 3, 4].map(path)), attempted = new Set();
  const stamp = { marker, game: 'dixit', mode: 'life_story' };
  const report = { ok: false, passed: 0, step: 'health', phase: 'initial', cleanup: { tracked: 0, deleted: 0, empty: 0, failed: 0 } };
  const must = value => { if (!value) throw new Error('life_story_smoke_failed'); };
  const check = value => { must(value); report.passed++; };
  const http = (url, options = {}) => fetchImpl(url, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000), ...options });
  async function api(body) {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json(); must(response.ok && result.ok !== false); return result;
  }
  async function read(num) {
    const target = path(num); must(allowed.has(target));
    const response = await http(`${DATABASE}/${target}.json`, { headers: { 'X-Firebase-ETag': 'true' } });
    must(response.ok); const etag = response.headers.get('etag'); must(etag);
    return { value: await response.json(), etag };
  }
  function header(node) { return node?.state || (typeof node?.stateJson === 'string' ? JSON.parse(node.stateJson) : null); }
  function owned(node, num) {
    if (node?.qaLifeSmoke?.marker !== marker || node.qaLifeSmoke.game !== 'dixit' || node.qaLifeSmoke.mode !== 'life_story' || node.game !== 'dixit') return false;
    const state = num === 0 ? header(node) : node.dixit;
    return state?.mode === 'life_story' && sessions.has(state.sessionId) && (num === 0 || node.playerNum === num);
  }
  async function write(num, change, create = false) {
    for (let tries = 0; tries < 5; tries++) {
      const before = await read(num); must(create ? before.value === null : owned(before.value, num));
      const value = change(before.value); attempted.add(path(num));
      const response = await http(`${DATABASE}/${path(num)}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': before.etag }, body: JSON.stringify(value) });
      if (response.status === 412 && !create) continue;
      must(response.ok); return;
    }
    must(false);
  }
  async function card(num) {
    const node = (await read(num)).value; must(owned(node, num));
    must(node.hubExecutor?.v === 1 && node.hubExecutor.game === 'dixit' && sessions.has(node.hubExecutor.sessionId));
    const s = node.dixit; must(s.sessionId === node.hubExecutor.sessionId && s.sharedControls === true);
    const serialized = JSON.stringify(node); check(!serialized.includes(JSON.stringify(controlToken)));
    for (const other of seats.filter(p => p.playerNum !== num)) check(!serialized.includes(JSON.stringify(other.token)));
    check(!Object.hasOwn(s, 'lifeRoom') && !Object.hasOwn(s, 'hands') && !Object.hasOwn(s, 'deck') && !Object.hasOwn(s, 'submissions') && !Object.hasOwn(s, 'votes'));
    check(list(s.roster).every(p => !Object.hasOwn(p, 'hand')));
    report.phase = s.phase; return node;
  }
  async function canonicalPrivate() {
    const raw = (await read(0)).value; must(owned(raw, 0));
    const h = header(raw), s = h.publicLifeView;
    check(typeof raw.lifeStateCipher === 'string' && typeof raw.lifeHistoryCipher === 'string');
    for (const key of ['lifeRoom', 'hands', 'deck', 'submissions', 'votes', 'answer']) check(!Object.hasOwn(h, key));
    check(s?.mode === 'life_story' && s.playerNum === 0 && list(s.hand).length === 0 && list(s.candidates).length === 0 && s.storyCard == null);
    if (s.phase === 'VOTING') check(list(s.table).every(c => !Object.hasOwn(c, 'ownerPlayerNum') && !Object.hasOwn(c, 'isAnswer') && !Object.hasOwn(c, 'voterNums')));
    return raw;
  }
  async function pulse(num, action) {
    const before = await card(num);
    await api({ operation: 'execute', capsule: before.hubExecutor.capsule, token: seats[num - 1].token, ...(action ? { command: action } : {}) });
    return card(num);
  }
  function makeCommand(node, type, extra = {}) {
    const s = node.dixit;
    return { id: 'qa-life-' + uid(), type, sessionId: s.sessionId, turnId: s.turnId, cycleId: s.cycleId ?? 0, expectedRevision: s.lifeRevision, ...extra };
  }
  async function command(num, type, extra = {}, expectedError = '') {
    const before = await card(num), action = makeCommand(before, type, extra);
    if (type === 'restart') sessions.add(before.dixit.sessionId + ':restart:' + action.id);
    await write(num, old => ({ ...old, dixitAction: action }));
    const node = await pulse(num); check(node.dixit.reply?.id === action.id && (node.dixit.reply.error || '') === expectedError);
    return { node, action };
  }
  async function finishTurn(storyteller, normal) {
    const prep = (await card(storyteller)).dixit; check(prep.phase === 'PREPARE' && prep.storyteller === storyteller);
    check(list(prep.candidates).length === (normal ? 3 : 0));
    if (normal) await command(storyteller, 'choose_question', { questionId: prep.candidates[0].id });
    const answer = prep.hand[0];
    await command(storyteller, 'choose_story_card', { cardId: answer }); await command(storyteller, 'start_story');
    const others = seats.map(s => s.playerNum).filter(n => n !== storyteller);
    for (const num of others) {
      const mine = (await card(num)).dixit; check(mine.storyCard == null && list(mine.candidates).length === 0);
      await command(num, 'submit_card', { cardId: mine.hand[0] });
    }
    check((await card(1)).dixit.phase === 'STORYTELLING');
    await command(others[0], 'withdraw_submission');
    await command(others[0], 'submit_card', { cardId: (await card(others[0])).dixit.hand[1] });
    await command(others[0], 'claim_follow_up', {}, 'wrong_phase');
    await command(storyteller, 'finish_story');
    const voting = (await card(others[0])).dixit, table = copy(voting.table);
    check(voting.phase === 'VOTING' && table.length === 4 && new Set(table.map(c => c.cardId)).size === 4);
    check(table.every(c => !Object.hasOwn(c, 'ownerPlayerNum') && !Object.hasOwn(c, 'isAnswer') && !Object.hasOwn(c, 'voterNums')));
    await canonicalPrivate(); await pulse(others[0]);
    check(JSON.stringify((await card(others[0])).dixit.table) === JSON.stringify(table));
    await command(others[0], 'cast_vote', { token: voting.ownTableToken }, 'self_vote');
    const correct = table.find(c => c.cardId === answer); check(!!correct);
    await command(storyteller, 'cast_vote', { token: correct.token }, 'storyteller_cannot_vote');
    let last;
    for (const num of others) last = await command(num, 'cast_vote', { token: correct.token });
    const revealed = (await card(1)).dixit; check(revealed.phase === 'REVEAL_DISCUSS');
    for (const num of [1, 2, 3, 4]) {
      const s = (await card(num)).dixit;
      check(s.deltas[num] === 2 && s.hand.length === 8 && !s.eligibleFollowUp);
    }
    const scores = list(revealed.roster).map(p => p.score), hands = await Promise.all(seats.map(async s => (await card(s.playerNum)).dixit.hand));
    await write(others.at(-1), old => ({ ...old, dixitAction: last.action })); await pulse(others.at(-1));
    check(JSON.stringify(list((await card(1)).dixit.roster).map(p => p.score)) === JSON.stringify(scores));
    check(JSON.stringify(await Promise.all(seats.map(async s => (await card(s.playerNum)).dixit.hand))) === JSON.stringify(hands));
    await canonicalPrivate(); await command(1, 'finish_discussion');
  }
  try {
    const health = await http(SERVICE), healthBody = await health.json();
    check(health.ok && healthBody.ready === true && health.headers.get('x-icebreak-life-story') === '1');
    const serverTime = Date.parse(health.headers.get('date'));
    const initial = DIXIT.create({ mode: 'life_story', id: initialSession, roster, seed: randomBytes(4).readUInt32LE(), now: Number.isFinite(serverTime) ? serverTime : now(), hostPlayerNum: 1 });
    report.step = 'fresh-fixture';
    await write(0, () => ({ game: 'dixit', stateJson: JSON.stringify(initial), revision: 1, qaLifeSmoke: stamp }), true);
    for (const seat of seats) await write(seat.playerNum, () => ({ ...DIXIT.view(initial, seat.playerNum), qaLifeSmoke: stamp }), true);
    report.step = 'register';
    await api({ operation: 'register', game: 'dixit', code, controlToken, seats, sessionId: initialSession });
    await canonicalPrivate();
    for (const seat of seats) await pulse(seat.playerNum);
    await command(1, 'configure', { locale: 'en', cardPackId: 'dixit_original' }); await command(1, 'deal');
    report.step = 'normal-turn'; await command(1, 'refresh_questions');
    await command(2, 'mulligan', { cardIds: (await card(2)).dixit.hand.slice(0, 2) }); await finishTurn(1, true);
    report.step = 'follow-up-race';
    const beforeC = await card(3), beforeD = await card(4), actionC = makeCommand(beforeC, 'claim_follow_up'), actionD = makeCommand(beforeD, 'claim_follow_up');
    await Promise.all([write(3, old => ({ ...old, dixitAction: actionC })), write(4, old => ({ ...old, dixitAction: actionD }))]);
    await Promise.all([pulse(3), pulse(4)]);
    const c = (await card(3)).dixit, d = (await card(4)).dixit;
    check(c.reply?.id === actionC.id && d.reply?.id === actionD.id);
    check([c, d].filter(s => s.reply && !s.reply.error).length === 1);
    const winner = !c.reply.error ? 3 : 4, loser = winner === 3 ? 4 : 3;
    check(c.storyteller === winner && d.storyteller === winner && c.source === 'follow_up');
    check(list(c.roster).find(p => p.playerNum === loser).opportunity === 'pending');
    const historyBeforeFollow = c.historyCount;
    await finishTurn(winner, false);
    check((await card(1)).dixit.historyCount === historyBeforeFollow);
    report.step = 'normal-order'; await command(1, 'next_in_order'); check((await card(1)).dixit.storyteller === 2); await finishTurn(2, true);
    await command(1, 'next_in_order'); check((await card(1)).dixit.storyteller === loser); await finishTurn(loser, true);
    report.step = 'cross-cycle';
    const boundary = (await card(1)).dixit; check(boundary.cycleNumber === 2 && boundary.phase === 'FOLLOW_UP' && list(boundary.roster).every(p => p.opportunity === 'pending'));
    await command(loser, 'claim_follow_up'); check((await card(1)).dixit.storyteller === loser && (await card(loser)).dixit.source === 'follow_up');
    const history = (await card(1)).dixit.historyCount;
    await command(1, 'cancel_turn'); await command(1, 'end_game'); check((await card(1)).dixit.historyCount === history);
    report.step = 'same-room-reopen';
    const raw = await canonicalPrivate(), nextSession = initialSession + ':reopen:' + uid(); sessions.add(nextSession);
    const fresh = DIXIT.create({ mode: 'life_story', id: nextSession, roster, hostPlayerNum: 1, seed: randomBytes(4).readUInt32LE(), now: now() });
    await write(0, () => ({ game: 'dixit', stateJson: JSON.stringify(fresh), revision: (Number(raw.revision) || 0) + 1, lifeHistoryCipher: raw.lifeHistoryCipher, qaLifeSmoke: stamp }));
    for (const seat of seats) await write(seat.playerNum, () => ({ ...DIXIT.view(fresh, seat.playerNum), qaLifeSmoke: stamp }));
    await api({ operation: 'register', game: 'dixit', code, controlToken, seats, sessionId: nextSession });
    check((await card(1)).dixit.historyCount === history); await command(1, 'deal'); check((await card(1)).dixit.historyCount === history + 3);
    await canonicalPrivate(); report.step = 'complete'; report.ok = true;
  } catch { report.ok = false; report.error = 'production_smoke_failed'; }
  finally {
    // Exactly five known capability nodes. Foreign values, sessions or changed
    // ETags are never overwritten/deleted and make the smoke fail.
    report.cleanup.tracked = attempted.size;
    for (const num of [0, 1, 2, 3, 4]) {
      if (!attempted.has(path(num))) continue;
      try {
        const before = await read(num); if (before.value === null) { report.cleanup.empty++; continue; }
        must(owned(before.value, num));
        const response = await http(`${DATABASE}/${path(num)}.json`, { method: 'DELETE', headers: { 'If-Match': before.etag } });
        must(response.ok); report.cleanup.deleted++;
      } catch { report.cleanup.failed++; report.ok = false; }
    }
  }
  return report;
}
module.exports = { run, DATABASE, SERVICE };
if (require.main === module) {
  if (!process.argv.includes('--live')) { process.stdout.write('{"ok":false,"reason":"live_flag_required"}\n'); process.exitCode = 1; }
  else run().then(report => { process.stdout.write(JSON.stringify(report) + '\n'); if (!report.ok) process.exitCode = 1; }).catch(() => { process.stdout.write('{"ok":false,"error":"production_smoke_failed"}\n'); process.exitCode = 1; });
}
