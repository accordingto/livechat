'use strict';
// WORD LIMIT THEATER rules: dealing, the scene stopwatch (limit swaps spread
// over the scene, pause keeps them), "I said a line" scoring by the current
// limit with a points table, fouls, table controls, fencing, the public
// projection and tables saved by the earlier version.
// Run: node --test tests/word-limit-engine.test.cjs
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
const COOL = E.CONFIG.lineCooldownMs;

test('the content is complete: 36 scenes with nine bilingual roles each, unique ids', () => {
  assert.equal(CONTENT.SCENES.length, 36);
  const ids = new Set();
  for (const scene of CONTENT.SCENES) {
    assert.ok(!ids.has(scene.id), scene.id); ids.add(scene.id);
    for (const field of ['slug', 'title', 'line']) { assert.ok(scene[field].en.trim(), `${scene.id} ${field} en`); assert.ok(scene[field].zh.trim(), `${scene.id} ${field} zh`); }
    assert.match(scene.slug.en, /^(INT|EXT)\. /, `${scene.id} uses a screenplay slug line`);
    assert.equal(scene.roles.length, 9, `${scene.id} has nine roles`);
    for (const role of scene.roles) for (const value of [role.en, role.zh, role.want.en, role.want.zh]) assert.ok(String(value).trim(), `${scene.id} role text`);
    assert.equal(new Set(scene.roles.map(role => role.en)).size, 9, `${scene.id} role names are distinct`);
  }
  // The twist cards stay in the content (unused by the rules for now).
  for (const twist of CONTENT.TWISTS) { assert.ok(!ids.has(twist.id)); ids.add(twist.id); assert.ok(twist.en.trim() && twist.zh.trim()); }
  // Simple English for an English-learning room: short lines, no markup.
  for (const scene of CONTENT.SCENES) assert.ok(scene.line.en.split(/\s+/).length <= 20, `${scene.id} line stays short`);
  assert.equal(JSON.stringify(CONTENT).includes('<'), false);
});

test('every player gets one of the first N roles and a random limit from 1 to 6', () => {
  for (let n = 2; n <= 9; n++) {
    const state = make(n);
    const round = state.round, limits = Object.values(round.limits);
    assert.equal(state.phase, 'cast');
    assert.deepEqual(Object.values(round.roles).sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `${n} players use roles 0..${n - 1}`);
    assert.equal(limits.length, n);
    for (const limit of limits) assert.ok(E.CONFIG.dealValues.includes(limit), `${n} players: ${limit} is within 1–6`);
    // Drawn like cards from a bag: up to six players never share a limit.
    assert.equal(new Set(limits).size, Math.min(n, 6), `${n} players: as many different limits as possible`);
  }
  assert.deepEqual(E.CONFIG.dealValues, [1, 2, 3, 4, 5, 6]);
  // Over many tables every limit from 1 to 6 comes up, and nothing above 6.
  const seen = new Set();
  for (let i = 0; i < 60; i++) for (const limit of Object.values(make(4).round.limits)) seen.add(limit);
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.equal(E.drawLimits(9, E.rng(4)).length, 9);
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
  assert.equal(run(state, 2, 'line').error, 'not_available', 'no scoring before the curtain');
  // An early tick is a no-op; an expired clock starts the scene.
  assert.equal(run(state, 3, 'tick', {}, state.deadline - 1).error, 'unchanged');
  state = ok(run(state, 3, 'tick', {}, state.deadline + 200));
  assert.equal(state.phase, 'scene');
});

test('the limits swap three times by default, spread over the scene; pause keeps them on schedule; time ends straight on the result', () => {
  let state = make(5, { sceneMinutes: 3 });
  assert.equal(state.settings.shuffles, 3);
  const start = state.lastChangeAt + 50;
  state = toScene(state, start);
  const ms = 180000;
  assert.deepEqual(state.round.pending.map(event => event.at), [45000, 90000, 135000], 'evenly spread');
  assert.equal(state.deadline, start + 45000, 'the first deadline is the first swap');
  assert.equal(E.view(state, 0).wl.nextShuffleAt, start + 45000);
  // Pause 30 s in: the stopwatch freezes.
  state = ok(run(state, 2, 'pause', {}, start + 30000));
  assert.equal(state.phase, 'paused'); assert.equal(state.remainingMs, ms - 30000);
  assert.equal(E.view(state, 0).wl.nextShuffleInMs, 15000, 'a paused card shows the swap still 15 s away');
  assert.equal(run(state, 1, 'line', {}, start + 31000).error, 'not_available', 'no scoring while paused');
  const resumeAt = start + 500000;
  state = ok(run(state, 2, 'resume', {}, resumeAt));
  assert.equal(state.phase, 'scene');
  assert.equal(state.deadline, resumeAt + 15000, 'the swap keeps its place in the scene');
  let before = null;
  for (let swap = 1; swap <= 3; swap++) {
    before = { ...state.round.limits };
    state = ok(run(state, 4, 'tick', {}, state.deadline + 150));
    assert.equal(state.round.shuffles, swap); assert.equal(state.round.event.kind, 'shuffle');
    for (const n of state.round.players) {
      assert.notEqual(state.round.limits[n], before[n], `swap ${swap}: player ${n} has a new limit`);
      assert.equal(state.round.prevLimits[n], before[n]);
    }
    for (const limit of Object.values(state.round.limits)) assert.ok(E.CONFIG.dealValues.includes(limit), 'a new random limit from 1 to 6');
  }
  assert.equal(E.view(state, 0).wl.nextShuffleAt, null, 'no more swaps in this scene');
  const end = state.deadline;
  assert.equal(end, resumeAt + ms - 30000);
  state = ok(run(state, 1, 'tick', {}, end + 150));
  assert.equal(state.phase, 'result', 'no vote: the scene ends on its result');
  assert.equal(state.round.endReason, 'time');
});

test('how many swaps is a setting (0–4); the earlier on/off swap setting still reads', () => {
  let none = toScene(make(3, { shuffles: 0, sceneMinutes: 2 }));
  assert.deepEqual(none.round.pending, []);
  assert.equal(none.deadline, none.round.runSince + 120000, 'no swaps: the deadline is the end of the scene');
  const four = toScene(make(3, { shuffles: 4, sceneMinutes: 5 }));
  assert.deepEqual(four.round.pending.map(event => event.at), [60000, 120000, 180000, 240000]);
  assert.throws(() => E.parseSettings({ shuffles: 5 }), /invalid_options/);
  assert.equal(E.parseSettings({}, { sceneMinutes: 3, unit: 'words', twists: true, shuffle: false, vote: true }).shuffles, 0, 'old “shuffle off” is no swaps');
  assert.equal(E.parseSettings({}, { sceneMinutes: 3, unit: 'words', shuffle: true }).shuffles, E.CONFIG.defaultShuffles);
  assert.deepEqual(Object.keys(E.parseSettings({}, { twists: true, vote: true })).sort(), ['points', 'sceneMinutes', 'shuffles', 'unit'], 'old twist and vote options are dropped');
  // A swap the clock skipped past at the very end does not fire.
  let late = toScene(make(3, { shuffles: 1, sceneMinutes: 2 }));
  late = ok(run(late, 2, 'tick', {}, late.round.runSince + 130000));
  assert.equal(late.phase, 'result'); assert.equal(late.round.shuffles, 0);
});

test('“I said a line”: each actor scores their current limit, with a short cool-down; points count at once and settle at the end', () => {
  let state = toScene(make(4, { shuffles: 1, sceneMinutes: 2 }));
  const t0 = state.lastChangeAt + 10;
  const limitOf = n => state.round.limits[n];
  const first = limitOf(2);
  state = ok(run(state, 2, 'line', {}, t0));
  assert.equal(state.round.gained[2], first, 'one point per word by default');
  assert.equal(state.round.lines[2], 1);
  assert.equal(run(state, 2, 'line', {}, t0 + COOL - 1).error, 'cooldown', 'a double tap does not score twice');
  state = ok(run(state, 3, 'line', {}, t0 + 100), 'another actor is not blocked');
  state = ok(run(state, 2, 'line', {}, t0 + COOL));
  assert.equal(state.round.gained[2], first * 2);
  assert.deepEqual(state.scores, {}, 'scores settle when the scene ends');
  const live = E.view(state, 0).wl;
  assert.equal(live.standings.find(row => row.playerNum === 2).score, first * 2, 'but the live standings already count them');
  assert.equal(live.cast.find(row => row.playerNum === 2).gained, first * 2);
  assert.deepEqual(live.cast.find(row => row.playerNum === 2).lastLine, { ts: t0 + COOL, points: first });
  assert.equal(E.view(state, 2).wl.me.lineReadyAt, t0 + COOL + COOL);
  // After a swap, a line scores the new limit.
  state = ok(run(state, 1, 'tick', {}, state.deadline + 10));
  assert.equal(state.round.shuffles, 1);
  const second = limitOf(2);
  assert.notEqual(second, first);
  state = ok(run(state, 2, 'line', {}, state.lastChangeAt + COOL));
  assert.equal(state.round.gained[2], first * 2 + second);
  // The host page has no seat; someone sitting out or watching cannot score.
  assert.equal(run(state, 0, 'line').error, 'not_available');
  state = ok(run(state, 1, 'exclude', { playerNum: 4, active: false }));
  assert.equal(run(state, 4, 'line', {}, state.lastChangeAt + COOL).error, 'not_available');
  assert.equal(state.round.gained[3] > 0, true);
  state = ok(run(state, 1, 'close'));
  assert.equal(state.phase, 'result');
  assert.deepEqual(state.scores, Object.fromEntries(Object.entries(state.round.gained).filter(([, v]) => v > 0)), 'every line counts once');
  const top = Math.max(...Object.values(state.round.gained));
  assert.deepEqual(state.round.outcome.best, Object.keys(state.round.gained).map(Number).filter(n => state.round.gained[n] === top));
  assert.equal(E.view(state, 0).wl.standings.find(row => row.playerNum === 2).score, state.scores[2], 'nothing is counted twice after the result');
  assert.equal(run(state, 2, 'line').error, 'not_available', 'the scene is over');
});

test('the points of every limit are a setting: partial changes keep the rest; they apply from the next scene', () => {
  assert.deepEqual(E.defaultPoints(), { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 });
  const custom = E.parseSettings({ points: { 1: 2, 6: 12 } });
  assert.equal(custom.points[1], 2); assert.equal(custom.points[6], 12); assert.equal(custom.points[3], 3);
  assert.equal(E.parseSettings({ points: { 3: 5 } }, custom).points[6], 12, 'other limits keep their points');
  for (const bad of [{ 11: 3 }, { 2: -1 }, { 2: 1.5 }, { 2: 51 }, { 2: '' }, []]) assert.throws(() => E.parseSettings({ points: bad }), /invalid_options/, JSON.stringify(bad));
  let state = make(4, { points: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 }, shuffles: 0 });
  state = toScene(state);
  state = ok(run(state, 1, 'line'));
  assert.equal(state.round.gained[1], 5, 'a flat table: every line is worth 5');
  assert.deepEqual(E.view(state, 0).wl.values.map(item => [item.limit, item.points]), [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5]], 'the legend lists every limit from 1 to 6');
  assert.deepEqual(E.view(state, 0).wl.values.filter(item => item.held).map(item => item.limit), [...new Set(Object.values(state.round.limits))].sort((a, b) => a - b));
  state = ok(run(state, 2, 'settings', { settings: { points: { 1: 0 } } }));
  state = ok(run(state, 1, 'line', {}, state.lastChangeAt + COOL));
  assert.equal(state.round.gained[1], 10, 'the scene keeps the points it started with');
  assert.equal(run(state, 2, 'settings', { settings: { points: { 1: 99 } } }).error, 'invalid_options');
  state = ok(run(state, 1, 'void'));
  state = ok(run(state, 1, 'next'));
  assert.equal(E.pointsFor(state.round, 1), 0, 'the next scene uses the new points');
});

test('fouls: anyone can call one on an active player; the same caller waits a moment; no points are taken', () => {
  let state = toScene(make(4));
  const t0 = state.lastChangeAt + 10;
  state = ok(run(state, 3, 'line', {}, t0 - 5));
  state = ok(run(state, 1, 'foul', { target: 3 }, t0));
  assert.equal(state.round.fouls[3], 1);
  assert.deepEqual({ kind: state.round.event.kind, target: state.round.event.target, by: state.round.event.by }, { kind: 'foul', target: 3, by: 1 });
  assert.equal(run(state, 1, 'foul', { target: 3 }, t0 + 1000).error, 'cooldown');
  state = ok(run(state, 2, 'foul', { target: 3 }, t0 + 1000), 'a different caller is not blocked');
  state = ok(run(state, 1, 'foul', { target: 3 }, t0 + E.CONFIG.foulCooldownMs + 1));
  assert.equal(state.round.fouls[3], 3);
  assert.equal(state.round.gained[3], state.round.limits[3], 'a foul only counts');
  assert.equal(run(state, 1, 'foul', { target: 9 }, t0 + 9000).error, 'not_available', 'only someone in the scene');
  state = ok(run(state, 2, 'exclude', { playerNum: 4, active: false }, t0 + 9000));
  assert.equal(run(state, 1, 'foul', { target: 4 }, t0 + 9500).error, 'not_available', 'not someone sitting out');
  assert.equal(run(state, 4, 'foul', { target: 1 }, t0 + 9500).error, 'not_available', 'someone sitting out cannot call fouls');
  for (const old of ['twist', 'vote']) assert.equal(run(state, 1, old, { target: 2 }, t0 + 9600).error, 'not_available', `no ${old} any more`);
});

test('a cancelled scene scores nothing; ending the game mid-scene keeps the lines already said; next scene deals again', () => {
  let state = toScene(make(4));
  state = ok(run(state, 2, 'line'));
  state = ok(run(state, 1, 'void'));
  assert.equal(state.phase, 'result'); assert.equal(state.round.outcome.voided, true);
  assert.deepEqual(state.scores, {}); assert.deepEqual(state.round.outcome.best, []);
  const roundNo = state.roundNo;
  state = ok(run(state, 1, 'exclude', { playerNum: 4, active: false }));
  state = ok(run(state, 2, 'next'));
  assert.equal(state.roundNo, roundNo + 1); assert.equal(state.phase, 'cast');
  assert.deepEqual(state.round.players, [1, 2, 3], 'only active players are cast');
  assert.equal(run(state, 4, 'next').error, 'not_available', 'a seat sitting out cannot run the table');
  state = ok(run(state, 4, 'exclude', { playerNum: 4, active: true }), 'but can bring itself back');
  state = toScene(state);
  state = ok(run(state, 3, 'line'));
  const said = state.round.gained[3];
  state = ok(run(state, 1, 'stop'));
  assert.equal(state.phase, 'finished');
  assert.equal(state.scores[3], said, 'an early end still counts the lines');
  assert.equal(E.standings(state).find(row => row.playerNum === 3).score, said);
});

test('table controls: pause floor, extend, settings, restart, stop and the Hub rename', () => {
  let state = make(4);
  state = ok(run(state, 2, 'pause', {}, state.deadline - 500));
  assert.equal(state.remainingMs, E.CONFIG.resumeFloorMs, 'a pause always leaves a few seconds');
  state = ok(run(state, 2, 'resume'));
  state = ok(run(state, 3, 'extend'));
  state = toScene(state);
  const end = E.view(state, 0).wl.sceneEndsAt;
  state = ok(run(state, 3, 'extend'));
  assert.equal(E.view(state, 0).wl.sceneEndsAt, end + E.CONFIG.extendSceneMs);
  state = ok(run(state, 1, 'settings', { settings: { sceneMinutes: 5, unit: 'chars', shuffles: 2 } }));
  assert.equal(state.round.unit, 'words', 'settings wait for the next scene');
  assert.equal(run(state, 1, 'settings', { settings: { sceneMinutes: 7 } }).error, 'invalid_options');
  state = ok(run(state, 1, 'void'));
  state = ok(run(state, 1, 'next'));
  assert.equal(state.round.unit, 'chars'); assert.equal(state.round.sceneMs, 300000); assert.equal(state.round.planned, 2);
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
  assert.equal(run(state, 2, 'line', { stage: stale }).error, 'stale_turn');
  assert.equal(run(state, 0, 'close', { stage: stale }).error, 'stale_turn', 'host buttons that advance are fenced too');
  const input = { id: 'same-command-01', type: 'line', actor: 1, sessionId: state.sessionId, stage: state.stage, now: state.lastChangeAt + 5, seed: 1 };
  const once = E.apply(state, input);
  assert.notEqual(once, state);
  assert.equal(E.apply(once, Object.assign({}, input, { now: input.now + 9000 })), once, 'a retried line never scores twice');
  assert.equal(E.apply(state, Object.assign({}, input, { sessionId: 'other' })), state, 'another session is ignored');
});

test('the projection: roles, limits and points are public; a card adds only its own seat', () => {
  let state = toScene(make(4));
  const shared = E.view(state, 0);
  assert.equal(shared.game, 'wordlimit');
  assert.equal(shared.wl.me, undefined);
  assert.equal(shared.wl.cast.length, 4);
  assert.equal(shared.wl.planned, 3);
  for (const row of shared.wl.cast) { assert.ok(row.role.en && row.role.zh && row.role.want.en); assert.ok(Number.isInteger(row.limit)); assert.equal(row.worth, row.limit); }
  const card = E.view(state, 2).wl;
  assert.equal(card.me.limit, state.round.limits[2]);
  assert.equal(card.me.worth, state.round.limits[2]);
  assert.equal(card.me.role.en, CONTENT.scene(state.round.sceneId).roles[state.round.roles[2]].en);
  assert.equal(card.me.canLine, true); assert.equal(card.me.canFoul, true);
  assert.ok(card.sceneEndsAt > 0 && card.sceneLeftMs === null);
  state = ok(run(state, 1, 'pause'));
  const paused = E.view(state, 2).wl;
  assert.equal(paused.sceneEndsAt, null); assert.ok(paused.sceneLeftMs > 0); assert.equal(paused.me.canLine, false);
});

test('scenes are not repeated until the deck runs out, and a restart keeps that memory', () => {
  let state = make(3);
  const seen = new Set([state.round.sceneId]);
  for (let i = 0; i < 20; i++) {
    state = toScene(state); state = ok(run(state, 1, 'close'));
    state = ok(run(state, 1, 'next'));
    assert.ok(!seen.has(state.round.sceneId), 'a fresh scene'); seen.add(state.round.sceneId);
  }
  const again = E.create({ id: 'again', roster: roster(3), now: 5, seed: 9, previous: state });
  assert.ok(!state.used.scenes.slice(-20).includes(again.round.sceneId), 'a new game at the same table skips recent scenes');
});

test('a table saved by the earlier version keeps working: an old vote runs out into the result, old settings read as today’s', () => {
  // The earlier version's shape: twist/shuffle/vote options, a scene with a
  // scripted twist pending, then a 30-second MVP vote.
  let state = make(3);
  state.settings = { sceneMinutes: 3, unit: 'words', twists: true, shuffle: false, vote: true };
  delete state.round.value; delete state.round.gained; delete state.round.lines; delete state.round.lastLine; delete state.round.planned;
  state = toScene(state);
  state.round.pending = [{ type: 'twist', at: 63000 }];
  state.deadline = state.round.runSince + 63000;
  assert.equal(E.view(state, 1).wl.nextShuffleAt, null, 'an old scripted twist is not shown as a swap');
  state = ok(run(state, 1, 'line'));
  assert.equal(state.round.gained[1], state.round.limits[1], 'an old scene scores one point per word');
  state = ok(run(state, 2, 'tick', {}, state.deadline + 10));
  assert.equal(state.phase, 'scene'); assert.deepEqual(state.round.twists || [], [], 'the old twist is skipped');
  // The old vote phase.
  state.phase = 'vote'; state.stage++; state.deadline = state.lastChangeAt + 30000; state.round.outcome = null;
  assert.equal(E.view(state, 1).wl.me.canEndVote, true);
  state = ok(run(state, 3, 'tick', {}, state.deadline + 10));
  assert.equal(state.phase, 'result');
  assert.equal(state.scores[1], state.round.gained[1]);
  state = ok(run(state, 1, 'next'));
  assert.equal(state.settings.shuffles, 0, 'old “shuffle off” stays off'); assert.equal(state.round.planned, 0);
  assert.deepEqual(state.settings.points, E.defaultPoints());
});
