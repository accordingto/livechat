'use strict';
// WORD LIMIT THEATER rules: dealing, the scene stopwatch (twist and limit
// shuffle on schedule, pause keeps them), fouls, MVP votes, table controls,
// fencing and the public projection. Run: node --test tests/word-limit-engine.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const CONTENT = require('../word-limit-content.js');
const E = require('../word-limit-engine.js');

const NAMES = ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo', 'Sam', 'Robin', 'Ivy'];
const roster = n => Array.from({ length: n }, (_, i) => ({ playerNum: i + 1, name: NAMES[i] }));
let serial = 0;
function make(n = 5, settings = {}, now = 1_000_000) {
  return E.create({ id: 'session-' + (++serial), roster: roster(n), settings, now, seed: 4242 + serial });
}
// Apply one command; returns { state, error } where error is '' on success and
// 'unchanged' when the rules ignored it entirely.
function run(state, actor, type, extra = {}, now) {
  const input = Object.assign({ id: 'cmd-' + (++serial).toString().padStart(6, '0'), type, actor, sessionId: state.sessionId,
    stage: state.stage, now: now ?? state.lastChangeAt + 10, seed: 777 + serial }, extra);
  const next = E.apply(state, input);
  if (next === state) return { state, error: 'unchanged' };
  return { state: next, error: next.replies?.[actor]?.id === input.id ? next.replies[actor].error : '' };
}
const ok = (result, label = '') => { assert.equal(result.error, '', label || 'command accepted'); return result.state; };
// Start the scene now (anyone may skip the reading time).
function toScene(state, at) { return ok(run(state, 1, 'close', {}, at ?? state.lastChangeAt + 100)); }

test('the content is complete: 36 scenes with nine bilingual roles each, 40 twists, unique ids', () => {
  assert.equal(CONTENT.SCENES.length, 36);
  assert.equal(CONTENT.TWISTS.length, 40);
  const ids = new Set();
  for (const scene of CONTENT.SCENES) {
    assert.ok(!ids.has(scene.id), scene.id); ids.add(scene.id);
    for (const field of ['slug', 'title', 'line']) { assert.ok(scene[field].en.trim(), `${scene.id} ${field} en`); assert.ok(scene[field].zh.trim(), `${scene.id} ${field} zh`); }
    assert.match(scene.slug.en, /^(INT|EXT)\. /, `${scene.id} uses a screenplay slug line`);
    assert.equal(scene.roles.length, 9, `${scene.id} has nine roles`);
    for (const role of scene.roles) for (const value of [role.en, role.zh, role.want.en, role.want.zh]) assert.ok(String(value).trim(), `${scene.id} role text`);
    assert.equal(new Set(scene.roles.map(role => role.en)).size, 9, `${scene.id} role names are distinct`);
  }
  for (const twist of CONTENT.TWISTS) { assert.ok(!ids.has(twist.id)); ids.add(twist.id); assert.ok(twist.en.trim() && twist.zh.trim()); }
  // Simple English for an English-learning room: short lines, no markup.
  for (const scene of CONTENT.SCENES) assert.ok(scene.line.en.split(/\s+/).length <= 20, `${scene.id} line stays short`);
  assert.equal(JSON.stringify(CONTENT).includes('<'), false);
});

test('every player gets one of the first N roles and a distinct limit from the ladder', () => {
  for (let n = 2; n <= 9; n++) {
    const state = make(n);
    const round = state.round;
    assert.equal(state.phase, 'cast');
    assert.deepEqual(Object.values(round.roles).sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `${n} players use roles 0..${n - 1}`);
    assert.deepEqual(Object.values(round.limits).sort((a, b) => a - b), E.ladder(n).sort((a, b) => a - b));
    assert.equal(Math.min(...Object.values(round.limits)), 1, 'someone always gets a one-word limit');
  }
  assert.throws(() => make(1), /not_enough_players/);
  assert.throws(() => E.create({ id: 'x', roster: [{ playerNum: 1 }, { playerNum: 1 }], now: 1, seed: 1 }), /invalid_roster/);
});

test('the cast phase: anyone can start now or deal a different scene; time runs out into the scene', () => {
  let state = make(4);
  const first = state.round.sceneId, limits = { ...state.round.limits };
  state = ok(run(state, 2, 'reroll', {}, state.lastChangeAt + 1000));
  assert.notEqual(state.round.sceneId, first);
  assert.deepEqual(state.round.limits, limits, 'a new scene keeps the limits');
  assert.equal(state.deadline, state.lastChangeAt + E.CONFIG.castMs, 'a new scene gets the full reading time');
  for (let i = 1; i < E.CONFIG.maxRerolls; i++) state = ok(run(state, 1, 'reroll'));
  assert.equal(run(state, 1, 'reroll').error, 'not_available', 'rerolls are limited');
  // An early tick is a no-op; an expired clock starts the scene.
  assert.equal(run(state, 3, 'tick', {}, state.deadline - 1).error, 'unchanged');
  state = ok(run(state, 3, 'tick', {}, state.deadline + 200));
  assert.equal(state.phase, 'scene');
});

test('the scene stopwatch drops a twist and then shuffles every limit; pause keeps both on schedule', () => {
  let state = make(5, { sceneMinutes: 3 });
  const start = state.lastChangeAt + 50;
  state = toScene(state, start);
  const ms = 180000;
  assert.equal(state.deadline, start + Math.round(ms * E.CONFIG.twistAt), 'the first deadline is the twist');
  // Pause one minute in: the stopwatch freezes.
  state = ok(run(state, 2, 'pause', {}, start + 30000));
  assert.equal(state.phase, 'paused'); assert.equal(state.remainingMs, ms - 30000);
  assert.equal(run(state, 1, 'twist', {}, start + 31000).error, 'not_available', 'no twists while paused');
  const resumeAt = start + 500000;
  state = ok(run(state, 2, 'resume', {}, resumeAt));
  assert.equal(state.phase, 'scene');
  assert.equal(state.deadline, resumeAt + Math.round(ms * E.CONFIG.twistAt) - 30000, 'the twist keeps its place in the scene');
  state = ok(run(state, 4, 'tick', {}, state.deadline + 150));
  assert.equal(state.round.twists.length, 1); assert.equal(state.round.twists[0].by, 0);
  assert.equal(state.round.event.kind, 'twist');
  const before = { ...state.round.limits };
  state = ok(run(state, 4, 'tick', {}, state.deadline + 150));
  assert.equal(state.round.shuffles, 1); assert.equal(state.round.event.kind, 'shuffle');
  for (const n of state.round.players) {
    assert.notEqual(state.round.limits[n], before[n], `player ${n} has a new limit`);
    assert.equal(state.round.prevLimits[n], before[n]);
  }
  assert.deepEqual(Object.values(state.round.limits).sort(), Object.values(before).sort(), 'the same limits, swapped');
  const end = state.deadline;
  assert.equal(end, resumeAt + ms - 30000);
  state = ok(run(state, 1, 'tick', {}, end + 150));
  assert.equal(state.phase, 'vote');
  assert.equal(state.round.endReason, 'time');
});

test('twists and shuffles can be switched off; anyone can drop a twist with a short cool-down', () => {
  let state = make(3, { twists: false, shuffle: false, sceneMinutes: 2 });
  const start = state.lastChangeAt + 10;
  state = toScene(state, start);
  assert.equal(state.deadline, start + 120000, 'no scheduled events: the deadline is the end of the scene');
  state = ok(run(state, 2, 'twist', {}, start + 1000));
  assert.equal(state.round.twists.length, 1); assert.equal(state.round.twists[0].by, 2);
  assert.equal(run(state, 3, 'twist', {}, start + 1000 + E.CONFIG.twistCooldownMs - 1).error, 'cooldown');
  state = ok(run(state, 3, 'twist', {}, start + 1000 + E.CONFIG.twistCooldownMs));
  assert.equal(state.round.twists.length, 2);
  assert.notEqual(state.round.twists[0].id, state.round.twists[1].id, 'no repeated twist in a scene');
});

test('fouls: anyone can call one on an active player; the same caller waits a moment', () => {
  let state = toScene(make(4));
  const t0 = state.lastChangeAt + 10;
  state = ok(run(state, 1, 'foul', { target: 3 }, t0));
  assert.equal(state.round.fouls[3], 1);
  assert.deepEqual({ kind: state.round.event.kind, target: state.round.event.target, by: state.round.event.by }, { kind: 'foul', target: 3, by: 1 });
  assert.equal(run(state, 1, 'foul', { target: 3 }, t0 + 1000).error, 'cooldown');
  state = ok(run(state, 2, 'foul', { target: 3 }, t0 + 1000), 'a different caller is not blocked');
  state = ok(run(state, 1, 'foul', { target: 3 }, t0 + E.CONFIG.foulCooldownMs + 1));
  assert.equal(state.round.fouls[3], 3);
  assert.equal(run(state, 1, 'foul', { target: 9 }, t0 + 9000).error, 'not_available', 'only someone in the scene');
  state = ok(run(state, 2, 'exclude', { playerNum: 4, active: false }, t0 + 9000));
  assert.equal(run(state, 1, 'foul', { target: 4 }, t0 + 9500).error, 'not_available', 'not someone sitting out');
  assert.equal(run(state, 4, 'foul', { target: 1 }, t0 + 9500).error, 'not_available', 'someone sitting out cannot call fouls');
});

test('votes: no self-votes, skipping counts as voting, the last ballot ends it, each vote is a point', () => {
  let state = make(4);
  state = toScene(state);
  state = ok(run(state, 1, 'close'), 'anyone can end the scene');
  assert.equal(state.phase, 'vote');
  assert.equal(run(state, 2, 'vote', { target: 2 }).error, 'not_available', 'no voting for yourself');
  state = ok(run(state, 1, 'vote', { target: 2 }));
  state = ok(run(state, 1, 'vote', { target: 3 }), 'a vote can change');
  state = ok(run(state, 2, 'vote', { target: 3 }));
  state = ok(run(state, 3, 'vote', { target: 0 }), 'skip');
  assert.equal(state.phase, 'vote');
  const view = E.view(state, 0).wl;
  assert.deepEqual(view.ballots, { cast: 3, total: 4, voted: [1, 2, 3] });
  assert.equal(view.result, null, 'ballots stay secret until the result');
  state = ok(run(state, 4, 'vote', { target: 2 }));
  assert.equal(state.phase, 'result');
  assert.deepEqual(state.round.mvp, [3]);
  assert.deepEqual(state.scores, { 2: 1, 3: 2 });
  const result = E.view(state, 0).wl.result;
  assert.deepEqual(result.votes, { 1: 3, 2: 3, 3: 0, 4: 2 });
  assert.equal(result.outcome.top, 2);
  // Ties share the spotlight.
  let tie = toScene(make(3));
  tie = ok(run(tie, 1, 'close'));
  tie = ok(run(tie, 1, 'vote', { target: 2 })); tie = ok(run(tie, 2, 'vote', { target: 3 })); tie = ok(run(tie, 3, 'vote', { target: 1 }));
  assert.deepEqual(tie.round.mvp, [1, 2, 3]);
});

test('with voting off the scene goes straight to the result and scores nothing', () => {
  let state = toScene(make(3, { vote: false }));
  state = ok(run(state, 2, 'close'));
  assert.equal(state.phase, 'result');
  assert.deepEqual(state.scores, {});
  assert.deepEqual(state.round.mvp, []);
});

test('the vote clock runs out; a voter sitting out completes the ballot; next scene deals again', () => {
  let state = toScene(make(4));
  state = ok(run(state, 1, 'close'));
  state = ok(run(state, 1, 'vote', { target: 2 }));
  state = ok(run(state, 2, 'vote', { target: 1 }));
  state = ok(run(state, 3, 'vote', { target: 4 }));
  state = ok(run(state, 1, 'exclude', { playerNum: 4, active: false }));
  assert.equal(state.phase, 'vote', 'a vote for someone who left is dropped, so that voter votes again');
  assert.equal(state.round.votes[3], undefined);
  assert.equal(run(state, 3, 'vote', { target: 4 }).error, 'not_available', 'nobody can vote for a seat sitting out');
  state = ok(run(state, 3, 'vote', { target: 1 }));
  assert.equal(state.phase, 'result', 'the remaining voters have all voted');
  const roundNo = state.roundNo;
  state = ok(run(state, 2, 'next'));
  assert.equal(state.roundNo, roundNo + 1); assert.equal(state.phase, 'cast');
  assert.deepEqual(state.round.players, [1, 2, 3], 'only active players are cast');
  assert.equal(run(state, 4, 'next').error, 'not_available', 'a seat sitting out cannot run the table');
  state = ok(run(state, 4, 'exclude', { playerNum: 4, active: true }), 'but can bring itself back');
  let timed = toScene(make(3));
  timed = ok(run(timed, 1, 'close'));
  timed = ok(run(timed, 2, 'tick', {}, timed.deadline + 200));
  assert.equal(timed.phase, 'result');
});

test('table controls: pause floor, extend, void, settings, restart, stop and the Hub rename', () => {
  let state = make(4);
  state = ok(run(state, 2, 'pause', {}, state.deadline - 500));
  assert.equal(state.remainingMs, E.CONFIG.resumeFloorMs, 'a pause always leaves a few seconds');
  state = ok(run(state, 2, 'resume'));
  state = ok(run(state, 3, 'extend'));
  state = toScene(state);
  const end = E.view(state, 0).wl.sceneEndsAt;
  state = ok(run(state, 3, 'extend'));
  assert.equal(E.view(state, 0).wl.sceneEndsAt, end + E.CONFIG.extendSceneMs);
  state = ok(run(state, 1, 'settings', { settings: { sceneMinutes: 5, unit: 'chars', vote: false } }));
  assert.equal(state.round.unit, 'words', 'settings wait for the next scene');
  assert.equal(run(state, 1, 'settings', { settings: { sceneMinutes: 7 } }).error, 'invalid_options');
  state = ok(run(state, 1, 'void'));
  assert.equal(state.phase, 'result'); assert.equal(state.round.outcome.voided, true);
  state = ok(run(state, 1, 'next'));
  assert.equal(state.round.unit, 'chars'); assert.equal(state.round.sceneMs, 300000); assert.equal(state.round.voteOn, false);
  assert.equal(run(state, 2, 'rename', { names: [{ playerNum: 2, name: 'Kev' }] }).error, 'not_available', 'only the host page renames');
  state = ok(run(state, 0, 'rename', { names: [{ playerNum: 2, name: 'Kev' }] }));
  assert.equal(state.roster[1].name, 'Kev');
  state = ok(run(state, 1, 'restart'));
  assert.equal(state.roundNo, 1); assert.deepEqual(state.scores, {});
  state = ok(run(state, 2, 'stop'));
  assert.equal(state.phase, 'finished'); assert.equal(state.stopped, true);
  assert.equal(run(state, 2, 'stop').error, 'not_available');
});

test('commands are fenced to the stage a card showed, and a repeated id is ignored', () => {
  let state = make(3);
  const stale = state.stage;
  state = toScene(state);
  assert.equal(run(state, 2, 'twist', { stage: stale }).error, 'stale_turn');
  assert.equal(run(state, 0, 'close', { stage: stale }).error, 'stale_turn', 'host buttons that advance are fenced too');
  const input = { id: 'same-command-01', type: 'foul', actor: 1, target: 2, sessionId: state.sessionId, stage: state.stage, now: state.lastChangeAt + 5, seed: 1 };
  const once = E.apply(state, input);
  assert.notEqual(once, state);
  assert.equal(E.apply(once, Object.assign({}, input, { now: input.now + 9000 })), once, 'a retried command never applies twice');
  assert.equal(E.apply(state, Object.assign({}, input, { sessionId: 'other' })), state, 'another session is ignored');
});

test('the projection: roles and limits are public; a card adds only its own seat', () => {
  let state = toScene(make(4));
  const shared = E.view(state, 0);
  assert.equal(shared.game, 'wordlimit');
  assert.equal(shared.wl.me, undefined);
  assert.equal(shared.wl.cast.length, 4);
  for (const row of shared.wl.cast) { assert.ok(row.role.en && row.role.zh && row.role.want.en); assert.ok(Number.isInteger(row.limit)); }
  const card = E.view(state, 2).wl;
  assert.equal(card.me.limit, state.round.limits[2]);
  assert.equal(card.me.role.en, CONTENT.scene(state.round.sceneId).roles[state.round.roles[2]].en);
  assert.equal(card.me.canTwist, true); assert.equal(card.me.canVote, false);
  assert.ok(card.sceneEndsAt > 0 && card.sceneLeftMs === null);
  state = ok(run(state, 1, 'pause'));
  const paused = E.view(state, 2).wl;
  assert.equal(paused.sceneEndsAt, null); assert.ok(paused.sceneLeftMs > 0); assert.equal(paused.me.canTwist, false);
});

test('scenes are not repeated until the deck runs out, and a restart keeps that memory', () => {
  let state = make(3);
  const seen = new Set([state.round.sceneId]);
  for (let i = 0; i < 20; i++) {
    state = toScene(state); state = ok(run(state, 1, 'close')); state = ok(run(state, 1, 'close'));
    state = ok(run(state, 1, 'next'));
    assert.ok(!seen.has(state.round.sceneId), 'a fresh scene'); seen.add(state.round.sceneId);
  }
  const again = E.create({ id: 'again', roster: roster(3), now: 5, seed: 9, previous: state });
  assert.ok(!state.used.scenes.slice(-20).includes(again.round.sceneId), 'a new game at the same table skips recent scenes');
});
