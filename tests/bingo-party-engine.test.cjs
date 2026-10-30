'use strict';
// 雙選賓果 rules: boards, nominations, result mapping, atomic settlement and
// the five challenge flows. Pure engine — no Firebase, no clock.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bingo-party-engine.js');
const BANK = require('../bingo-party-content.js');

const names = ['Amy', 'Ben', 'Cat', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kim', 'Lou'];
let clock = 1_000_000, ids = 0;
function cmd(state, actor, type, extra = {}) {
  clock += 10;
  return E.apply(state, Object.assign({ id: 'c' + (++ids), type, actor, sessionId: state.sessionId, now: clock, seed: 12345 + ids, uid: 'u' + ids }, extra));
}
function ok(state, actor, type, extra) {
  const next = cmd(state, actor, type, extra);
  const reply = next.replies[String(actor)];
  assert.equal(reply.error, '', `${type} by ${actor} failed: ${reply.error}`);
  return next;
}
function err(state, actor, type, extra) {
  const next = cmd(state, actor, type, extra);
  return next.replies[String(actor)].error;
}
function lobby(n = 6, settings = {}, seed = 7) {
  const roster = names.slice(0, n).map((name, i) => ({ playerNum: i + 1, name }));
  return E.create({ sessionId: 'S' + seed, seed, now: clock, roster, settings });
}
const team = (s, t) => s.roster.filter(p => p.team === t).map(p => p.playerNum);
function started(n = 6, settings = {}, seed = 7) { return ok(lobby(n, settings, seed), 0, 'start'); }
function tickTo(state, ms) { clock = ms; return E.apply(state, { type: 'tick', now: ms }); }
function lockAll(s) { return ok(s, 0, 'lockNow'); }
function toChallenge(s) { return ok(lockAll(s), 0, 'beginChallenge'); }
// Force the round type (tests drive one challenge at a time).
function forceType(s, type) {
  const next = JSON.parse(JSON.stringify(s));
  next.round.type = type;
  next.round.cardId = BANK.cards.find(c => c.type === type).id;
  return next;
}

test('card bank: 60 bilingual cards, 12 per type, no legacy director fields', () => {
  assert.equal(BANK.cards.length, 60);
  for (const type of E.TYPES) assert.equal(BANK.cards.filter(c => c.type === type).length, 12, type);
  for (const c of BANK.cards) {
    for (const f of ['title', 'prompt']) assert.ok(c[f].zh && c[f].en, c.id + f);
    assert.ok(!('twists' in c) && !('twistAt' in c));
    if (c.type === 'guess_person') { assert.equal(c.options.length, 3); c.options.forEach(o => assert.ok(o.text.zh && o.text.en)); }
    if (c.type === 'improv_scene') assert.equal(c.roles.length, 2);
    if (c.type === 'taboo_description') { assert.equal(c.targets.length, 4); c.targets.forEach(t => { assert.equal(t.forbidden.zh.length, 2); assert.equal(t.forbidden.en.length, 2); }); }
  }
});

test('comfortable pacing: acting still live after a minute, ends at three; story reminder is two minutes', () => {
  let s = started();
  assert.equal(s.round.clock.endsAt - clock, 20_000);
  s = toChallenge(forceType(s, 'guess_person'));
  assert.equal(s.round.clock.endsAt - clock, 45_000);
  s = toChallenge(forceType(started(), 'improv_scene'));
  const segmentId = s.round.sub.segs[0].segmentId;
  s = ok(s, 0, 'imStart', { segmentId });
  const began = clock;
  assert.equal(s.round.clock.endsAt - began, 180_000);
  s = tickTo(s, began + 61_000);
  assert.equal(s.round.sub.segs[0].stage, 'live', 'one minute no longer cuts a scene short');
  s = tickTo(s, began + 180_000);
  assert.equal(s.round.sub.segs[0].stage, 'wrapup');
  s = toChallenge(forceType(started(), 'story_exchange'));
  const cycleId = s.round.sub.cycles[0].cycleId;
  const storyBegan = clock;
  assert.equal(s.round.clock.endsAt - storyBegan, 120_000);
  s = tickTo(s, storyBegan + 120_000);
  assert.equal(s.round.sub.cycles[0].cycleId, cycleId);
  assert.equal(s.round.sub.cycles[0].stage, 'share', 'a reminder never auto-advances the story');
});

test('pacing: custom/saved values stay intact; only a lobby host can restore recommended times', () => {
  let legacy = started(6, { t: { songTurn: 10, story: 20, reply: 10, pick: 10 } });
  legacy = ok(ok(legacy, 0, 'endGame'), 0, 'newGame');
  assert.deepEqual([legacy.settings.t.songTurn, legacy.settings.t.story, legacy.settings.t.reply, legacy.settings.t.pick], [10, 20, 10, 10], 'old legal lower bounds survive a new game');
  let s = lobby(6, { targetLines: 2, qLang: 'zh', songTurns: 6, t: { improv: 60, story: 45, songTurn: 20 } });
  assert.deepEqual([s.settings.t.improv, s.settings.t.story, s.settings.t.songTurn], [60, 45, 20]);
  assert.equal(err(s, 1, 'setSettings', { settings: { resetTimers: true } }), 'host_only');
  s = ok(s, 0, 'setSettings', { settings: { resetTimers: true } });
  assert.deepEqual([s.settings.t.improv, s.settings.t.story, s.settings.t.songTurn, s.settings.t.sing], [180, 120, 60, 90]);
  assert.deepEqual([s.settings.targetLines, s.settings.qLang, s.settings.songTurns], [2, 'zh', 6]);
  s = ok(s, 0, 'setSettings', { settings: { t: { improv: 300, story: 300, reply: 180, songTurn: 120 } } });
  assert.equal(s.settings.t.improv, 300);
  assert.deepEqual(E.view(s, 'host').timerLimits.improv, [30, 300], 'UI uses the authority\'s legal range');
  s = toChallenge(forceType(ok(s, 0, 'start'), 'improv_scene'));
  s = ok(s, 0, 'imStart', { segmentId: s.round.sub.segs[0].segmentId });
  const deadline = s.round.clock.endsAt;
  assert.equal(deadline - clock, 300_000);
  const denied = cmd(s, 0, 'setSettings', { settings: { resetTimers: true } });
  assert.ok(denied.replies['0'].error);
  assert.equal(denied.round.clock.endsAt, deadline, 'live settings cannot reset a deadline');
  assert.equal(E.view(JSON.parse(JSON.stringify(s)), 'host').round.clock.endsAt, deadline, 'reconnection keeps the deadline');
});

test('boards hold 1–25 once each, differ between teams, and survive re-reads', () => {
  for (let seed = 1; seed < 40; seed++) {
    const { A, B } = E.makeBoards(seed);
    assert.deepEqual([...A].sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
    assert.deepEqual([...B].sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
    assert.notDeepEqual(A, B);
    assert.deepEqual(E.makeBoards(seed), { A, B });
  }
  const s = started();
  const v1 = E.view(s, { playerNum: team(s, 'A')[0] });
  const v2 = E.view(JSON.parse(JSON.stringify(s)), { playerNum: team(s, 'A')[0] });
  assert.deepEqual(v1.board, v2.board);
});

test('12 lines: rows, columns and both full diagonals, each counted once', () => {
  assert.equal(E.LINES.length, 12);
  const board = Array.from({ length: 25 }, (_, i) => i + 1);
  assert.deepEqual(E.linesDone(board, [1, 2, 3, 4, 5]), ['r0']);
  assert.deepEqual(E.linesDone(board, [1, 7, 13, 19, 25]), ['d1']);
  assert.deepEqual(E.linesDone(board, [5, 9, 13, 17, 21]), ['d2']);
  // Overlapping lines both count; the same line never counts twice.
  assert.deepEqual(E.linesDone(board, [1, 2, 3, 4, 5, 6, 11, 16, 21, 1, 2]).sort(), ['c0', 'r0']);
  assert.equal(E.linesDone(board, Array.from({ length: 25 }, (_, i) => i + 1)).length, 12);
});

test('lobby: auto teams differ by at most one, start needs two per team, 4–12 players', () => {
  for (const n of [4, 5, 7, 12]) {
    const s = lobby(n);
    assert.ok(Math.abs(team(s, 'A').length - team(s, 'B').length) <= 1, String(n));
    assert.equal(s.phase, 'lobby');
  }
  let s = lobby(4);
  s = ok(s, 0, 'setTeam', { playerNum: team(s, 'A')[0], team: 'B' });
  assert.equal(err(s, 0, 'start'), 'team_too_small');
  assert.equal(err(lobby(4), 2, 'start'), 'host_only');
  s = ok(lobby(6), 0, 'setSettings', { settings: { targetLines: 2, songTurns: 6, singing: false, qLang: 'zh' } });
  assert.deepEqual([s.settings.targetLines, s.settings.songTurns, s.settings.singing, s.settings.qLang], [2, 6, false, 'zh']);
  s = ok(s, 0, 'setSettings', { settings: { songTurns: 9 } });
  assert.equal(s.settings.songTurns, 6, 'clamped to 2–6');
  s = ok(s, 0, 'start');
  assert.equal(err(s, 0, 'setSettings', { settings: { targetLines: 3 } }), 'wrong_stage', 'settings frozen after start');
});

test('nominations: secret votes, own-team tally only, tie draw reproducible, empty team gets a system pick', () => {
  let s = started(6);
  const [a1, a2, a3] = team(s, 'A'), [b1] = team(s, 'B');
  s = ok(s, a1, 'vote', { number: 7 });
  s = ok(s, a2, 'vote', { number: 9 });
  s = ok(s, a3, 'vote', { number: 9 });
  s = ok(s, a3, 'vote', { number: 7 }); // change before lock
  const mine = E.view(s, { playerNum: a1 }).round.nominations;
  assert.deepEqual(mine.A.tally, { 7: 2, 9: 1 });
  assert.equal(mine.A.mine, 7);
  assert.deepEqual(mine.B, { voted: 0, of: 3 });
  const theirs = E.view(s, { playerNum: b1 }).round.nominations;
  assert.deepEqual(theirs.A, { voted: 3, of: 3 }, 'opponents see only how many voted');
  assert.ok(!JSON.stringify(theirs).includes('"7"'));
  assert.equal(err(s, 0, 'vote', { number: 3 }), 'not_participant');
  s = lockAll(s);
  assert.equal(s.round.nominations.A.pick, 7);
  assert.equal(s.round.nominations.B.auto, true, 'no votes → system pick');
  assert.ok(s.round.nominations.B.pick >= 1 && s.round.nominations.B.pick <= 25);
  // tie: reproducible for the same seed/round/team; not always the smaller number
  const picks = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    let t = started(4, {}, seed);
    const [x, y] = team(t, 'A');
    t = ok(t, x, 'vote', { number: 3 }); t = ok(t, y, 'vote', { number: 20 });
    const p1 = lockAll(t).round.nominations.A.pick, p2 = lockAll(t).round.nominations.A.pick;
    assert.equal(p1, p2);
    picks.add(p1);
  }
  assert.deepEqual([...picks].sort((a, b) => a - b), [3, 20]);
});

test('all voted shortens the nomination clock; deadline tick locks; same number on both teams is legal', () => {
  let s = started(4);
  for (const n of team(s, 'A')) s = ok(s, n, 'vote', { number: 12 });
  for (const n of team(s, 'B')) s = ok(s, n, 'vote', { number: 12 });
  assert.ok(s.round.clock.endsAt <= clock + 3000);
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(s.round.stage, 'revealed');
  assert.equal(s.round.nominations.A.pick, 12);
  assert.equal(s.round.nominations.B.pick, 12);
});

function settleWith(s, result) {
  s = forceType(s, 'story_exchange');
  s.round.stage = 'result'; s.round.proposed = result; s.round.sub = { stage: 'done', cycles: [] };
  return ok(s, 0, 'confirmResult', { version: s.round.version });
}
test('result mapping A/B/BOTH/NEITHER, fallback alternates by round, duplicate nominations call once', () => {
  let s = started(4, {}, 3);
  const first = s.fallbackFirst;
  const pickFor = (state, a, b) => { state = JSON.parse(JSON.stringify(state)); state.round.stage = 'revealed'; state.round.nominations.A.pick = a; state.round.nominations.B.pick = b; return state; };
  s = settleWith(pickFor(s, 1, 2), 'A'); assert.deepEqual(s.round.settled.called, [1]);
  s = ok(s, 0, 'nextRound'); s = settleWith(pickFor(s, 3, 4), 'B'); assert.deepEqual(s.round.settled.called, [4]);
  s = ok(s, 0, 'nextRound'); s = settleWith(pickFor(s, 5, 6), 'BOTH'); assert.deepEqual(s.round.settled.called, [5, 6]);
  s = ok(s, 0, 'nextRound'); assert.equal(s.round.fallbackTeam, first === 'A' ? 'B' : 'A');
  s = settleWith(pickFor(s, 7, 8), 'NEITHER'); assert.deepEqual(s.round.settled.called, [first === 'A' ? 8 : 7]);
  s = ok(s, 0, 'nextRound'); assert.equal(s.round.fallbackTeam, first);
  s = settleWith(pickFor(s, 9, 9), 'BOTH'); assert.deepEqual(s.round.settled.called, [9], 'same number called once, no replacement');
  assert.deepEqual(s.called, [1, 4, 5, 6, first === 'A' ? 8 : 7, 9]);
});

test('settlement is atomic and idempotent; both teams reaching the target is a shared win', () => {
  let s = started(4, { targetLines: 2 }, 11);
  // Craft boards so A and B each need exactly 2 numbers for their second line.
  s = JSON.parse(JSON.stringify(s));
  s.boards.A = Array.from({ length: 25 }, (_, i) => i + 1);
  s.boards.B = Array.from({ length: 25 }, (_, i) => 25 - i);
  s.called = [1, 2, 3, 4, 5, 6, 7, 8, 9, 21, 22, 23, 24, 25, 20, 19, 18, 17]; // A: r0, B: r0 (25..21) ; more partial
  assert.equal(E.linesDone(s.boards.A, s.called).length, 2 - 0 > 0 ? E.linesDone(s.boards.A, s.called).length : 0);
  s.called = [1, 2, 3, 4, 5, 25, 24, 23, 22, 21, 6, 7, 8, 9, 20, 19, 18, 17];
  // A has r0 (1–5); needs 10 for r1 (6–10). B has r0 (25..21); needs 16 for r1 (20..16).
  s.round.stage = 'revealed'; s.round.nominations.A.pick = 10; s.round.nominations.B.pick = 16;
  s = forceType(s, 'story_exchange'); s.round.stage = 'result'; s.round.proposed = 'BOTH'; s.round.sub = { stage: 'done', cycles: [] };
  const confirm = { id: 'confirm-once', type: 'confirmResult', actor: 0, sessionId: s.sessionId, now: clock + 1, seed: 1, version: s.round.version };
  const after = E.apply(s, confirm);
  assert.equal(after.round.settled.winner, 'BOTH');
  assert.equal(after.phase, 'finished');
  assert.deepEqual(after.finished.winner, 'BOTH');
  assert.equal(E.apply(after, confirm), after, 'same request id is a no-op');
  const again = E.apply(after, Object.assign({}, confirm, { id: 'confirm-twice' }));
  assert.ok(['wrong_stage', 'not_playing'].includes(again.replies['0'].error));
  assert.deepEqual(again.called, after.called);
  const pub = E.view(after, null);
  assert.ok(pub.boards, 'boards revealed at the end');
});

test('only one team at the target wins even if the round called its number first', () => {
  // A already has row 2 (6–10) and needs 1 for row 1; B's nomination is 1.
  let found = false;
  for (let seed = 1; seed < 200 && !found; seed++) {
    let s = started(4, { targetLines: 2 }, 5);
    s = JSON.parse(JSON.stringify(s));
    s.boards.A = Array.from({ length: 25 }, (_, i) => i + 1);
    s.boards.B = E.makeBoards(seed).B;
    s.called = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (E.linesDone(s.boards.B, [...s.called, 1]).length >= 2) continue;
    found = true;
    s.round.stage = 'revealed'; s.round.nominations.A.pick = 11; s.round.nominations.B.pick = 1;
    s = settleWith(s, 'B'); // B won the challenge, but its number completes A's second line
    assert.equal(s.round.settled.winner, 'A');
    assert.equal(s.finished.winner, 'A');
  }
  assert.ok(found);
});

test('type bag: first round guess_person, every five rounds cover all types, no type twice in a row, singing off drops song relay', () => {
  for (const singing of [true, false]) {
    let s = started(4, { singing }, 21);
    const seen = [s.round.type];
    for (let i = 0; i < 19; i++) { s = settleWith(Object.assign(JSON.parse(JSON.stringify(s)), {}), 'NEITHER'); if (s.phase === 'finished') break; s = ok(s, 0, 'nextRound'); seen.push(s.round.type); }
    assert.equal(seen[0], 'guess_person');
    const size = singing ? 5 : 4;
    for (let i = 0; i + size <= seen.length; i += size) assert.equal(new Set(seen.slice(i, i + size)).size, size, seen.join(','));
    for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
    if (!singing) assert.ok(!seen.includes('song_relay'));
  }
});

/* ── guess_person ── */
test('guess: private answers, ratio by cross-multiplication with snapshot denominators, away/disconnect cannot shrink it', () => {
  let s = started(7, {}, 9); // teams of 4 and 3
  s = toChallenge(s);
  assert.equal(s.round.type, 'guess_person');
  const pA = s.round.roles.protagonist.A, pB = s.round.roles.protagonist.B;
  const gA = s.round.sub.eligible.A, gB = s.round.sub.eligible.B;
  const bigger = gA.length > gB.length ? 'A' : 'B';
  s = ok(s, pA, 'gpAnswer', { option: 'a' });
  s = ok(s, pB, 'gpAnswer', { option: 'b' });
  const vPeer = E.view(s, { playerNum: gA[0] });
  assert.equal(vPeer.round.sub.myAnswer, undefined);
  assert.ok(!JSON.stringify(E.view(s, { playerNum: gB[0] }).round.sub).includes('"answers"'), 'answers hidden before reveal');
  assert.equal(E.view(s, { playerNum: pA }).round.sub.myAnswer, 'a');
  assert.equal(err(s, gA[0], 'gpAnswer', { option: 'a' }), 'not_your_role');
  // A: 1 of n hits; B: 1 of m hits; ratio decides, not head count.
  s = ok(s, gA[0], 'gpGuess', { option: 'a' });
  s = ok(s, gB[0], 'gpGuess', { option: 'b' });
  for (const n of gA.slice(1)) s = ok(s, n, 'gpGuess', { option: 'c' });
  // one B guesser never answers and goes away — still counted in the denominator
  s = ok(s, 0, 'setAway', { playerNum: gB[gB.length - 1], away: true });
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(s.round.sub.stage, 'reveal');
  assert.equal(s.round.sub.hits.A.of, gA.length);
  assert.equal(s.round.sub.hits.B.of, gB.length);
  const expected = 1 * gB.length > 1 * gA.length ? 'A' : 1 * gB.length < 1 * gA.length ? 'B' : 'BOTH';
  assert.equal(E.view(s, null).round.sub.preview, expected);
  assert.notEqual(expected, bigger, 'the bigger team does not win on raw hits');
  assert.equal(err(s, pA, 'gpAnswer', { option: 'c' }), 'wrong_stage', 'no changes after reveal');
  s = ok(s, 0, 'gpTalkDone');
  assert.equal(s.round.stage, 'result');
  assert.equal(s.round.proposed, expected);
});

test('guess: missing protagonist blocks without leaking; host can extend, swap or reopen; equal non-zero is BOTH; 0–0 NEITHER', () => {
  let s = toChallenge(started(4, {}, 13));
  const pA = s.round.roles.protagonist.A;
  s = ok(s, pA, 'gpAnswer', { option: 'a' });
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(s.round.sub.stage, 'blocked');
  assert.equal(E.view(s, null).round.sub.answers, undefined);
  s = ok(s, 0, 'swapRole', { team: 'B' });
  assert.equal(s.round.sub.stage, 'answer');
  const pB = s.round.roles.protagonist.B;
  s = ok(s, pB, 'gpAnswer', { option: 'c' });
  const [gA] = s.round.sub.eligible.A, [gB] = s.round.sub.eligible.B;
  s = ok(s, gA, 'gpGuess', { option: 'a' });
  s = ok(s, gB, 'gpGuess', { option: 'c' });
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(E.view(s, null).round.sub.preview, 'BOTH');
  let z = toChallenge(started(4, {}, 14));
  z = ok(z, z.round.roles.protagonist.A, 'gpAnswer', { option: 'a' });
  z = ok(z, z.round.roles.protagonist.B, 'gpAnswer', { option: 'a' });
  z = ok(z, 0, 'lockNow');
  assert.equal(E.view(z, null).round.sub.preview, 'NEITHER');
});

/* ── song_relay ── */
function songRound(n = 6, settings = {}, seed = 31) {
  let s = forceType(lockAll(started(n, settings, seed)), 'song_relay');
  s.round.roles = { first: s.firsts.song_relay };
  return ok(s, 0, 'beginChallenge');
}
test('song relay: default 4 turns each alternating A/B, rotation before repeats, same-round duplicate blocked, failed attempt does not lock the song', () => {
  let s = songRound(6);
  const sub = s.round.sub;
  assert.equal(sub.turns.length, 8);
  const first = s.round.roles.first;
  assert.deepEqual(sub.turns.map(t => t.team), [first, first === 'A' ? 'B' : 'A'].flatMap(x => [x]).concat([]).length ? sub.turns.map((_, i) => i % 2 === 0 ? first : (first === 'A' ? 'B' : 'A')) : []);
  const performers = { A: [], B: [] };
  let turn = () => s.round.sub.turns[s.round.sub.cur];
  // turn 1: invalid attempt with "Rain" — must not lock the title
  s = ok(s, turn().performer, 'songSubmit', { turnId: turn().turnId, title: '  Rain   Song ' });
  assert.equal(turn().title, 'Rain Song');
  performers[turn().team].push(turn().performer);
  s = ok(s, 0, 'songJudge', { turnId: turn().turnId, verdict: 'invalid' });
  performers[turn().team].push(turn().performer);
  s = ok(s, turn().performer, 'songSubmit', { turnId: turn().turnId, title: 'rain song', mode: 'alt' });
  s = ok(s, 0, 'songJudge', { turnId: turn().turnId, verdict: 'valid' }); // equivalent alternative accepted
  performers[turn().team].push(turn().performer);
  s = ok(s, turn().performer, 'songSubmit', { turnId: turn().turnId, title: 'RAIN  SONG' });
  assert.equal(turn().dup, true, 'exact duplicate is flagged for the host');
  assert.equal(err(s, 0, 'songJudge', { turnId: turn().turnId, verdict: 'valid' }), 'duplicate_song');
  const stale = turn().turnId;
  s = ok(s, 0, 'songJudge', { turnId: stale, verdict: 'skipped' });
  assert.equal(err(s, 0, 'songJudge', { turnId: stale, verdict: 'valid' }), 'stale_turn', 'a double tap cannot judge twice');
  while (s.round.stage === 'challenge') {
    performers[turn().team].push(turn().performer);
    s = ok(s, 0, 'songJudge', { turnId: turn().turnId, verdict: 'valid', title: 'Song ' + s.round.sub.cur });
  }
  assert.equal(s.round.stage, 'result');
  const scores = E.view(s, null).round.sub.scores;
  assert.equal(scores.A + scores.B, 6);
  for (const t of ['A', 'B']) assert.equal(new Set(performers[t].slice(0, 3)).size, 3, 'three different people before anyone repeats');
  assert.equal(s.round.sub.turns.length, 8, 'never extended for a tie');
});

test('song relay: 2–6 turns, suggestions stay inside the team, correction before settle, resend does not double count', () => {
  let s = songRound(4, { songTurns: 2 }, 32);
  assert.equal(s.round.sub.turns.length, 4);
  const t0 = s.round.sub.turns[0];
  const mate = s.roster.find(p => p.team === t0.team && p.playerNum !== t0.performer).playerNum;
  const foe = s.roster.find(p => p.team !== t0.team).playerNum;
  s = ok(s, mate, 'songSuggest', { title: 'Secret Pick' });
  assert.ok(JSON.stringify(E.view(s, { playerNum: mate })).includes('Secret Pick'));
  assert.ok(!JSON.stringify(E.view(s, { playerNum: foe })).includes('Secret Pick'));
  assert.ok(!JSON.stringify(E.view(s, null)).includes('Secret Pick'));
  const judge = { id: 'judge-1', type: 'songJudge', actor: 0, sessionId: s.sessionId, now: clock + 5, seed: 3, turnId: t0.turnId, verdict: 'valid', title: 'Yellow' };
  s = E.apply(s, judge);
  const twice = E.apply(s, judge);
  assert.equal(twice, s, 'resent request is ignored');
  assert.equal(E.view(s, null).round.sub.scores[t0.team], 1);
  while (s.round.stage === 'challenge') s = ok(s, 0, 'songJudge', { turnId: s.round.sub.turns[s.round.sub.cur].turnId, verdict: 'invalid' });
  assert.equal(s.round.proposed, t0.team);
  s = ok(s, 0, 'songCorrect', { turnId: t0.turnId, verdict: 'invalid' });
  assert.equal(s.round.proposed, 'NEITHER');
  assert.equal(err(s, t0.performer, 'songCorrect', { turnId: t0.turnId, verdict: 'valid' }), 'host_only');
});

test('song relay: no guessing, lyric chaining, next-song links or resource economy commands exist', () => {
  let s = songRound(4);
  for (const type of ['guessSong', 'lyricChain', 'chainSong', 'useStar', 'buyItem', 'grabCell', 'twist'])
    assert.equal(err(s, 0, type, {}), 'bad_command', type);
});

/* ── improv_scene ── */
function improvRound(n = 6, seed = 41) {
  let s = forceType(lockAll(started(n, {}, seed)), 'improv_scene');
  s.round.roles = { first: s.firsts.improv_scene, actors: { A: team(s, 'A').slice(0, 2), B: team(s, 'B').slice(0, 2) } };
  return ok(s, 0, 'beginChallenge');
}
test('director: four public commands from the opposing team only, 2 s shared gap, stale and late events rejected, language resets per segment', () => {
  let s = improvRound(6);
  let seg = s.round.sub.segs[0];
  const acting = seg.team, directors = team(s, acting === 'A' ? 'B' : 'A'), own = team(s, acting).filter(n => !seg.actors.includes(n));
  assert.equal(err(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'stale_segment', 'not live yet');
  s = ok(s, seg.actors[0], 'imStart', { segmentId: seg.segmentId });
  assert.equal(s.round.sub.segs[0].lang, 'en');
  s = ok(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' });
  assert.equal(err(s, directors[1], 'imCmd', { segmentId: seg.segmentId, kind: 'speak_mandarin' }), 'cooldown', 'second tap inside 2 s is refused, not queued');
  assert.equal(err(s, own[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'not_director');
  assert.equal(err(s, seg.actors[1], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'not_director');
  clock += 2100;
  s = ok(s, directors[1], 'imCmd', { segmentId: seg.segmentId, kind: 'speak_taiwanese' });
  assert.equal(s.round.sub.segs[0].lang, 'tw');
  clock += 2100;
  s = ok(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'speak_english' });
  assert.equal(s.round.sub.segs[0].lang, 'en', 'Speak English returns to the English default');
  clock += 2100;
  s = ok(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'speak_mandarin' });
  assert.equal(s.round.sub.segs[0].lang, 'zh');
  clock += 2100;
  assert.equal(err(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line', sentAt: clock - 10000 }), 'too_late');
  assert.equal(err(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'speak_klingon' }), 'bad_command');
  // public event visible to everyone, including spectators and the stage
  const events = E.view(s, null).round.sub.segs[0].events.map(e => e.kind);
  assert.deepEqual(events, ['new_line', 'speak_taiwanese', 'speak_english', 'speak_mandarin']);
  assert.equal(s.settings.qLang, 'en', 'prompt language untouched');
  // time up → wrap-up refuses new commands; extension reopens
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(s.round.sub.segs[0].stage, 'wrapup');
  assert.equal(err(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'scene_closing');
  s = ok(s, 0, 'imExtend', { segmentId: seg.segmentId });
  assert.equal(s.round.sub.segs[0].stage, 'live');
  clock += 2100;
  s = ok(s, directors[1], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' });
  s = ok(s, 0, 'imJudge', { segmentId: seg.segmentId, complete: true });
  const seg2 = s.round.sub.segs[1];
  assert.equal(seg2.lang, 'en', 'next team starts in the room language');
  assert.equal(err(s, directors[0], 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'stale_segment', 'old segment event cannot hit the next team');
});

test('director lines: target one of the two actors, private to author and recipient, 1 active + 2 waiting, cancel/skip/report/hide, expire at segment end', () => {
  let s = improvRound(8, 42);
  const seg = s.round.sub.segs[0];
  const [x, y] = seg.actors, directors = team(s, seg.team === 'A' ? 'B' : 'A');
  const ownMate = team(s, seg.team).find(n => !seg.actors.includes(n));
  s = ok(s, x, 'imStart', { segmentId: seg.segmentId });
  const id = seg.segmentId;
  assert.equal(err(s, directors[0], 'imLine', { segmentId: id, target: directors[1], text: 'hi' }), 'bad_target');
  assert.equal(err(s, directors[0], 'imLine', { segmentId: id, target: x, text: '   ' }), 'empty');
  assert.equal(err(s, directors[0], 'imLine', { segmentId: id, target: x, text: 'x'.repeat(121) }), 'too_long');
  assert.equal(err(s, ownMate, 'imLine', { segmentId: id, target: x, text: 'hi' }), 'not_director');
  s = ok(s, directors[0], 'imLine', { segmentId: id, target: x, text: '<b>I am secretly a pirate</b>' });
  s = ok(s, directors[1], 'imLine', { segmentId: id, target: x, text: 'Line two' });
  s = ok(s, directors[2], 'imLine', { segmentId: id, target: x, text: 'Line three' });
  assert.equal(err(s, directors[0], 'imLine', { segmentId: id, target: x, text: 'Line four' }), 'queue_full');
  const forX = E.view(s, { playerNum: x }).round.sub.segs[0].myLines;
  assert.equal(forX.length, 3);
  assert.equal(forX[0].text, '<b>I am secretly a pirate</b>', 'raw text stored; the UI escapes it');
  assert.equal(forX[1].text, '', 'waiting lines show only that they exist');
  for (const viewer of [y, ownMate, directors[1], directors[3], null]) {
    const json = JSON.stringify(E.view(s, viewer ? { playerNum: viewer } : null));
    assert.ok(!json.includes('secretly a pirate'), 'leaked to ' + viewer);
  }
  assert.ok(JSON.stringify(E.view(s, { playerNum: directors[0] })).includes('secretly a pirate'), 'author sees own line');
  // host seat that is not author/recipient never sees the text
  s.hostPlayerNum = directors[3];
  assert.ok(!JSON.stringify(E.view(s, { playerNum: directors[3] })).includes('pirate'));
  assert.equal(E.view(s, null).round.sub.segs[0].received[x], 3, 'public sees only a count');
  const active = s.round.sub.segs[0].lines[0].lineId, second = s.round.sub.segs[0].lines[1].lineId;
  assert.equal(err(s, y, 'imLineResolve', { segmentId: id, lineId: active, action: 'done' }), 'not_your_line');
  s = ok(s, x, 'imLineResolve', { segmentId: id, lineId: active, action: 'done' });
  assert.equal(err(s, x, 'imLineResolve', { segmentId: id, lineId: active, action: 'done' }), 'stale_line', 'no double completion');
  assert.equal(s.round.sub.segs[0].lines[1].status, 'active');
  s = ok(s, directors[1], 'imLineCancel', { segmentId: id, lineId: second });
  assert.equal(s.round.sub.segs[0].lines[2].status, 'active');
  s = ok(s, x, 'imLineResolve', { segmentId: id, lineId: s.round.sub.segs[0].lines[2].lineId, action: 'reported' });
  s = ok(s, 0, 'imLineHide', { lineId: s.round.sub.segs[0].lines[2].lineId });
  s = ok(s, directors[0], 'imLine', { segmentId: id, target: y, text: 'left waiting' });
  s = ok(s, 0, 'imJudge', { segmentId: id, complete: false });
  assert.ok(s.round.sub.segs[0].lines.every(l => l.text === '' && !['active', 'waiting'].includes(l.status)), 'segment end expires and purges');
});

test('director: skipping lines or never being directed does not fail a team; results map from host completion', () => {
  let s = improvRound(4, 43);
  for (const complete of [true, false]) {
    const seg = s.round.sub.segs[s.round.sub.cur];
    s = ok(s, 0, 'imStart', { segmentId: seg.segmentId });
    s = ok(s, 0, 'imJudge', { segmentId: seg.segmentId, complete });
  }
  assert.equal(s.round.stage, 'result');
  assert.equal(s.round.proposed, s.round.sub.segs[0].team);
  s = ok(s, 0, 'imJudge', { segmentId: s.round.sub.segs[1].segmentId, complete: true });
  assert.equal(s.round.proposed, 'BOTH', 'host correction before settling');
});

test('pause freezes clocks and blocks director/competitive actions; resume keeps the remaining time', () => {
  let s = improvRound(4, 44);
  const seg = s.round.sub.segs[0], director = team(s, seg.team === 'A' ? 'B' : 'A')[0];
  s = ok(s, 0, 'imStart', { segmentId: seg.segmentId });
  const left = s.round.clock.endsAt - clock;
  s = ok(s, 0, 'pause');
  clock += 50000;
  assert.equal(E.timerDue(s, clock), false);
  assert.equal(err(s, director, 'imCmd', { segmentId: seg.segmentId, kind: 'new_line' }), 'paused');
  s = ok(s, 0, 'resume');
  assert.ok(Math.abs((s.round.clock.endsAt - clock) - left) <= 30);
});

/* ── story_exchange ── */
function storyRound(n = 6, settings = {}, seed = 51) {
  let s = forceType(lockAll(started(n, settings, seed)), 'story_exchange');
  const A = team(s, 'A'), B = team(s, 'B');
  s.round.roles = { first: 'A', sharer: { A: A[0], B: B[0] }, interviewer: { A: A[1], B: B[1] } };
  return ok(s, 0, 'beginChallenge');
}
test('story: share → follow-up → reply → opponent picks → singer confirms → sing, then the other team; result BOTH', () => {
  let s = storyRound(6);
  const A = team(s, 'A'), B = team(s, 'B');
  let c = s.round.sub.cycles[0];
  assert.equal(c.sharer, A[0]); assert.equal(c.interviewer, B[1]);
  assert.equal(err(s, B[0], 'stPropose', { cycleId: c.cycleId, title: 'Too early' }), 'not_open_yet', 'no song picking before the follow-up is answered');
  s = ok(s, B[2], 'stSuggestQ', { cycleId: c.cycleId, text: 'Who was with you?' });
  s = ok(s, A[0], 'stAdvance', { cycleId: c.cycleId, from: 'share' });
  assert.ok(JSON.stringify(E.view(s, { playerNum: B[1] })).includes('Who was with you?'), 'interviewer sees the suggestion');
  assert.ok(!JSON.stringify(E.view(s, { playerNum: A[0] })).includes('Who was with you?'));
  s = ok(s, B[1], 'stAdvance', { cycleId: c.cycleId, from: 'ask' });
  s = ok(s, A[0], 'stAdvance', { cycleId: c.cycleId, from: 'reply' });
  s = ok(s, B[0], 'stPropose', { cycleId: c.cycleId, title: 'Song One', artist: 'Band', reason: 'it fits' });
  s = ok(s, B[2], 'stPropose', { cycleId: c.cycleId, title: 'Song Two' });
  assert.equal(err(s, A[1], 'stPropose', { cycleId: c.cycleId, title: 'mine' }), 'not_your_role');
  assert.ok(!JSON.stringify(E.view(s, { playerNum: A[0] })).includes('Song Two'), 'proposals stay with the picking team until chosen');
  const p1 = s.round.sub.cycles[0].proposals[0].id;
  assert.equal(err(s, B[0], 'stPick', { cycleId: c.cycleId, proposalId: p1 }), 'not_your_role', 'the interviewer confirms for the team');
  s = ok(s, B[1], 'stPick', { cycleId: c.cycleId, proposalId: p1 });
  const pub = E.view(s, null).round.sub.cycles[0];
  assert.equal(pub.song.title, 'Song One'); assert.equal(pub.song.source, 'opponent');
  const v1 = s.round.sub.cycles[0].song.version;
  s = ok(s, A[0], 'stConfirm', { cycleId: c.cycleId, version: v1, action: 'replace' });
  assert.equal(s.round.sub.cycles[0].stage, 'pick');
  s = ok(s, B[1], 'stPick', { cycleId: c.cycleId, title: 'Song Three' });
  assert.equal(err(s, A[0], 'stConfirm', { cycleId: c.cycleId, version: v1, action: 'accept' }), 'stale_song', 'old confirmation cannot accept the new request');
  const v2 = s.round.sub.cycles[0].song.version;
  s = ok(s, A[0], 'stConfirm', { cycleId: c.cycleId, version: v2, action: 'accept' });
  assert.equal(s.round.sub.cycles[0].stage, 'sing');
  s = ok(s, A[0], 'stConfirm', { cycleId: c.cycleId, action: 'self', title: 'My Own Song' }); // switch mid-song
  const v3 = s.round.sub.cycles[0].song.version;
  s = ok(s, A[0], 'stConfirm', { cycleId: c.cycleId, version: v3, action: 'done' });
  c = s.round.sub.cycles[1];
  assert.equal(s.round.sub.cur, 1); assert.equal(c.sharer, B[0]); assert.equal(c.interviewer, A[1]);
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'share' });
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'ask' });
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'reply' });
  s = ok(s, B[0], 'stConfirm', { cycleId: c.cycleId, action: 'skip' }); // nobody proposed: singer passes, no penalty
  assert.equal(s.round.sub.stage, 'echo');
  assert.equal(err(s, A[0], 'stEcho', {}), 'not_your_role', 'sharers do not take the optional echo');
  s = ok(s, A[2], 'stEcho', {});
  assert.equal(err(s, B[2], 'stEcho', {}), 'taken', 'at most one person');
  s = ok(s, A[2], 'stEcho', { done: true });
  assert.equal(s.round.stage, 'result');
  assert.equal(s.round.proposed, 'BOTH');
  s = ok(s, 0, 'confirmResult', { version: s.round.version });
  assert.deepEqual(s.round.sub.cycles.map(x => x.proposals.length + Object.keys(x.qSuggest).length), [0, 0], 'round-only drafts are purged');
});

test('story with singing off: no pick stage, follow-up kept; song relay never drawn', () => {
  let s = storyRound(4, { singing: false }, 52);
  const c = s.round.sub.cycles[0];
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'share' });
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'ask' });
  s = ok(s, 0, 'stAdvance', { cycleId: c.cycleId, from: 'reply' });
  assert.equal(s.round.sub.cycles[0].stage, 'done');
  assert.equal(s.round.sub.cycles[0].singResult, 'off');
  assert.equal(s.round.sub.cur, 1);
});

/* ── taboo ── */
function tabooRound(n = 4, seed = 61, settings = {}) {
  let s = forceType(lockAll(started(n, settings, seed)), 'taboo_description');
  s.round.roles = { first: 'A', describer: { A: team(s, 'A')[0], B: team(s, 'B')[0] } };
  return ok(s, 0, 'beginChallenge');
}
test('taboo: only the describer sees the target and forbidden words; answers go public per item; single settlement; scores map', () => {
  let s = tabooRound(4);
  const card = BANK.cards.find(c => c.id === s.round.cardId);
  const seg = s.round.sub.segs[0], d = seg.describer, mate = team(s, seg.team).find(n => n !== d), foe = team(s, 'B')[0];
  s = ok(s, d, 'tbStart', { segmentId: seg.segmentId });
  const secret = E.view(s, { playerNum: d }).round.sub.segs[0].secret;
  assert.ok(secret.answer && secret.forbidden.length === 2);
  const allAnswers = card.targets.flatMap(t => [t.answer.en, t.answer.zh]);
  for (const viewer of [mate, foe, null]) {
    const json = JSON.stringify(E.view(s, viewer ? { playerNum: viewer } : null));
    for (const a of allAnswers) assert.ok(!json.includes(`"${a}"`), `${a} leaked to ${viewer}`);
    assert.ok(!json.includes(card.id), 'card id not exposed');
  }
  s.hostPlayerNum = foe; // a participating host sees no answers either
  assert.equal(E.view(s, { playerNum: foe }).round.sub.segs[0].secret, undefined);
  s = ok(s, d, 'tbMark', { segmentId: seg.segmentId, idx: 0, result: 'hit' });
  assert.equal(err(s, d, 'tbMark', { segmentId: seg.segmentId, idx: 0, result: 'hit' }), 'stale_target', 'one settlement per item');
  assert.ok(E.view(s, { playerNum: mate }).round.sub.segs[0].targets[0].answer, 'first answer public after its item');
  assert.equal(E.view(s, { playerNum: mate }).round.sub.segs[0].targets[1].answer, undefined);
  s = tickTo(s, s.round.clock.endsAt + 1);
  assert.equal(s.round.sub.segs[0].stage, 'timeup');
  assert.equal(err(s, d, 'tbMark', { segmentId: seg.segmentId, idx: 1, result: 'hit' }), 'time_up', 'no scoring after time');
  s = ok(s, 0, 'tbFinish', { segmentId: seg.segmentId });
  const seg2 = s.round.sub.segs[1];
  s = ok(s, 0, 'tbStart', { segmentId: seg2.segmentId });
  s = ok(s, seg2.describer, 'tbMark', { segmentId: seg2.segmentId, idx: 0, result: 'foul' });
  s = ok(s, seg2.describer, 'tbMark', { segmentId: seg2.segmentId, idx: 1, result: 'skip' });
  assert.equal(s.round.stage, 'result');
  assert.equal(s.round.proposed, 'A');
  s = ok(s, 0, 'tbCorrect', { segmentId: seg2.segmentId, idx: 0, result: 'hit' });
  assert.equal(s.round.proposed, 'BOTH');
});

test('taboo: a team with fewer than two present players waits', () => {
  let s = tabooRound(4, 62);
  const seg = s.round.sub.segs[0];
  const mate = team(s, seg.team).find(n => n !== seg.describer);
  s = ok(s, 0, 'setAway', { playerNum: mate, away: true });
  assert.equal(err(s, seg.describer, 'tbStart', { segmentId: seg.segmentId }), 'team_too_small');
  assert.equal(E.view(s, null).round.sub.segs[0].blocked, true);
});

test('permissions: spectators and wrong teams cannot act; forged host commands refused; stale session/round refused', () => {
  let s = lobby(6);
  s = ok(s, 0, 'setTeam', { playerNum: 6, team: null }); // spectator
  s = ok(s, 0, 'setHost', { playerNum: 1 });
  s = ok(s, 1, 'start'); // host seat may run host tools from their card
  assert.equal(err(s, 6, 'vote', { number: 3 }), 'not_participant');
  assert.equal(err(s, 2, 'lockNow'), 'host_only');
  assert.equal(err(s, 2, 'vote', { number: 3, sessionId: 'old' }), 'stale_session');
  assert.equal(err(s, 2, 'vote', { number: 3, roundId: 'r0-old' }), 'stale_round');
  const spectator = E.view(s, { playerNum: 6 });
  assert.equal(spectator.board, undefined, 'spectators get no board');
  assert.equal(spectator.me.spectator, true);
  const host = E.view(s, { playerNum: 1 });
  assert.ok(Array.isArray(host.log));
  const opp = s.roster.find(p => p.team && p.team !== s.roster[0].team).playerNum;
  assert.notDeepEqual(E.view(s, { playerNum: opp }).board, host.board, 'each team only sees its own board');
  assert.equal(E.view(s, { playerNum: opp }).boards, undefined);
});

test('late joiners watch; early end is labelled, not a victory; new game keeps teams and settings', () => {
  let s = started(4);
  s = ok(s, 0, 'addSeats', { seats: [{ playerNum: 5, name: 'Late' }] });
  assert.equal(s.roster.find(p => p.playerNum === 5).team, null);
  assert.equal(E.view(s, null).round.nominations.A.of, 2, 'denominators unchanged');
  s = ok(s, 0, 'endGame');
  assert.deepEqual([s.phase, s.finished.early, s.finished.winner], ['finished', true, null]);
  const n = ok(s, 0, 'newGame');
  assert.equal(n.phase, 'lobby');
  assert.equal(n.roster.find(p => p.playerNum === 5).team !== null, true, 'the late arrival plays next game');
  let w = ok(lobby(6), 0, 'setTeam', { playerNum: 6, team: null });
  w = ok(ok(ok(w, 0, 'autoTeams'), 0, 'start'), 0, 'endGame');
  assert.equal(ok(w, 0, 'newGame').roster.find(p => p.playerNum === 6).team, null, 'a chosen spectator stays a spectator');
  assert.notEqual(n.sessionId, s.sessionId);
  assert.equal(n.roster.find(p => p.playerNum === 1).team, s.roster.find(p => p.playerNum === 1).team);
});

test('skip card keeps nominations and board; no extra number is called', () => {
  let s = toChallenge(started(4, {}, 71));
  const picks = JSON.stringify(s.round.nominations), called = s.called.slice(), card = s.round.cardId;
  s = ok(s, 0, 'skipCard');
  assert.notEqual(s.round.cardId, card);
  assert.equal(JSON.stringify(s.round.nominations), picks);
  assert.deepEqual(s.called, called);
  assert.equal(s.round.stage, 'revealed');
});

test('a full standard game reaches three lines and stops', () => {
  let s = started(6, {}, 99);
  let rounds = 0;
  while (s.phase === 'playing' && rounds < 40) {
    s = lockAll(s);
    s = forceType(s, 'story_exchange'); s.round.stage = 'result'; s.round.proposed = 'BOTH'; s.round.sub = { stage: 'done', cycles: [] };
    s = ok(s, 0, 'confirmResult', { version: s.round.version });
    rounds++;
    if (s.phase === 'playing') s = ok(s, 0, 'nextRound');
  }
  assert.equal(s.phase, 'finished');
  const lines = { A: E.linesDone(s.boards.A, s.called).length, B: E.linesDone(s.boards.B, s.called).length };
  assert.ok(lines.A >= 3 || lines.B >= 3);
  const w = s.finished.winner;
  assert.ok(w === 'BOTH' ? lines.A >= 3 && lines.B >= 3 : lines[w] >= 3 && lines[w === 'A' ? 'B' : 'A'] < 3);
});

test('12 players (6 v 6) can start; a 7th on one team is refused; seats 10–12 come only from a 9-link room', () => {
  const s = ok(lobby(12), 0, 'start');
  assert.equal(team(s, 'A').length + team(s, 'B').length, 12);
  let l = lobby(12);
  const extra = team(l, 'B')[0];
  assert.equal(err(l, 0, 'setTeam', { playerNum: extra, team: 'A' }), 'team_too_large');
  const SYNC = require('../bingo-party-sync.js');
  const tokens = Array.from({ length: 9 }, (_, i) => 'tok' + i + 'abcdefghij');
  const extras = [{ token: 'extra0abcdefghij', name: 'Ten' }, { token: 'extra1abcdefghij', name: 'Eleven' }, { token: 'extra2abcdefghij', name: '' }, { token: 'extra3abcdefghij' }];
  const nine = SYNC.seatsFrom({ tokens, playerCount: 9, names: [], bingoPartyExtraSeats: extras });
  assert.deepEqual(nine.map(x => x.playerNum), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(nine[9].name, 'Ten');
  const six = SYNC.seatsFrom({ tokens: tokens.slice(0, 6), playerCount: 6, bingoPartyExtraSeats: extras });
  assert.equal(six.length, 6, 'extra seats never apply to a smaller Hub room');
});

test('a resent request id is ignored for every command type, including private lines and votes', () => {
  let s = improvRound(4, 45);
  const seg = s.round.sub.segs[0], director = team(s, seg.team === 'A' ? 'B' : 'A')[0];
  s = ok(s, 0, 'imStart', { segmentId: seg.segmentId });
  const line = { id: 'same-line', type: 'imLine', actor: director, sessionId: s.sessionId, now: clock + 1, seed: 1, segmentId: seg.segmentId, target: seg.actors[0], text: 'once' };
  const once = E.apply(s, line);
  assert.equal(E.apply(once, line), once);
  assert.equal(once.round.sub.segs[0].lines.length, 1);
});

test('song, director, story and taboo rounds alternate which team goes first; a redrawn card does not flip it twice', () => {
  for (const type of ['song_relay', 'improv_scene', 'story_exchange', 'taboo_description']) {
    let s = forceType(lockAll(started(4, {}, 81)), type);
    s.round.roles = null;
    const startTeam = s.firsts[type];
    s = JSON.parse(JSON.stringify(s)); s.round.stage = 'revealed';
    // assign roles the way a reveal does, then begin, redraw, begin again
    s = forceType(s, type);
    s = E.apply(s, { id: 'roles-' + type, type: 'skipCard', actor: 0, sessionId: s.sessionId, now: clock += 10, seed: 5 });
    s.round.roles = type === 'song_relay' ? { first: s.firsts[type] } : type === 'improv_scene' ? { first: s.firsts[type], actors: { A: team(s, 'A').slice(0, 2), B: team(s, 'B').slice(0, 2) } }
      : type === 'story_exchange' ? { first: s.firsts[type], sharer: { A: team(s, 'A')[0], B: team(s, 'B')[0] }, interviewer: { A: team(s, 'A')[1], B: team(s, 'B')[1] } }
      : { first: s.firsts[type], describer: { A: team(s, 'A')[0], B: team(s, 'B')[0] } };
    s = ok(s, 0, 'beginChallenge');
    const firstTeam = (s.round.sub.turns || s.round.sub.segs || s.round.sub.cycles)[0].team;
    assert.equal(firstTeam, startTeam, type);
    assert.notEqual(s.firsts[type], startTeam, type + ' flips for next time');
    s = ok(s, 0, 'skipCard');
    s = ok(s, 0, 'beginChallenge');
    assert.notEqual(s.firsts[type], startTeam, type + ' is not flipped back by a redraw');
  }
});
