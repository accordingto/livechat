'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../chat-wolf-v3-engine.js');
let clock = 100000;
function room(settings = {}, seed = 8675309) {
  const result = E.createRoom({ code: 'ABCDEF', hostPlayerId: 'p0', hostSessionHash: 's0', hostName: 'Player 0',
    settings: { ...settings }, now: clock, seed });
  for (let i = 1; i < result.settings.playerCount; i++) E.addPlayer(result,
    { playerId: `p${i}`, sessionHash: `s${i}`, name: `Player ${i}`, now: clock });
  return result;
}
const send = (r, id, action, payload = {}) => E.dispatch(r, id, action, payload, ++clock);
const host = (r, action, payload = {}) => send(r, 'p0', action, payload);
const players = r => Object.values(r.players);
const wolves = r => players(r).filter(p => p.role === 'WOLF');
const villagers = r => players(r).filter(p => p.role === 'VILLAGER');
const profession = (r, id) => players(r).find(p => p.profession === id);
function start(settings = {}, seed) { const r = room(settings, seed); host(r, 'startGame'); return r; }
function talk(settings = {}, seed) { const r = start(settings, seed); host(r, 'beginTalk'); return r; }
function rolesRoom() { return talk({ playerCount: 12, infoRoleLimit: 2 }); }
function beginVote(r) {
  host(r, 'endTalk');
  if (r.phase === 'FINAL_CLUES') host(r, 'endClues');
  host(r, 'endMeeting');
}
function abstain(r) { for (const p of players(r)) send(r, p.id, 'submitVote', { selections: [] }); }
function finalVote(r) {
  while (r.round < r.settings.roundCount) { beginVote(r); abstain(r); }
  beginVote(r);
}
function completeWolves(r) { for (const t of r.tasks) send(r, wolves(r)[0].id, 'completeTask', { taskId: t.id }); }
function completeProfession(r, roleId) {
  const p = profession(r, roleId); assert.ok(p, roleId);
  send(r, p.id, 'completeTask', { taskId: p.villageTask.id }); return r.players[p.id];
}
function fails(fn, code) { assert.throws(fn, e => e.code === code); }
function voteFor(r, targets) {
  for (const p of players(r)) send(r, p.id, 'submitVote', { selections: targets.filter(id => id !== p.id) });
}

test('v3 defaults: six seats, two wolves, one jester, unique village professions and shared tasks', () => {
  const r = start();
  assert.equal(wolves(r).length, 2); assert.equal(villagers(r).length, 3);
  assert.equal(players(r).filter(p => p.role === 'JESTER').length, 1);
  assert.equal(new Set(villagers(r).map(p => p.profession)).size, 3);
  assert.equal(r.tasks.length, 3); assert.equal(r.tasks.filter(t => t.type === 'interaction').length, 1);
  const views = wolves(r).map(p => E.projectState(r, p.id).private);
  assert.deepEqual(views[0].tasks, views[1].tasks); assert.equal(views[0].tasks.length, 3);
  assert.equal(r.phase, 'ROLE_REVEAL'); assert.equal(r.deadlineAt, null);
  assert.equal(players(r).some(p => p.roleAcknowledged), false);
  host(r, 'beginTalk'); assert.equal(r.phase, 'TALK'); assert.equal(r.round, 1);
});

test('only chosen professions occur once; ordinary villagers fill; information cap applies', () => {
  const r = start({ playerCount: 12, enabledProfessions: ['reporter', 'veteran', 'contrarian'], infoRoleLimit: 1 });
  const assigned = villagers(r).map(p => p.profession).filter(Boolean);
  assert.equal(assigned.length, 2); assert.equal(new Set(assigned).size, assigned.length);
  assert.ok(assigned.includes('reporter'));
  assert.equal(assigned.filter(id => ['veteran', 'contrarian'].includes(id)).length, 1);
  assert.equal(villagers(r).filter(p => p.profession === null).length, 7);
  assert.equal(players(start({ enabledProfessions: [] })).filter(p => p.profession).length, 0);
  fails(() => E.normalizeSettings({ enabledProfessions: ['kindred'] }), 'INVALID_PROFESSIONS');
});

test('settings validate seats, K/M/I, midgame windows, weights and duration estimate', () => {
  assert.equal(E.RULES.estimateSeconds(E.normalizeSettings()), 2240);
  fails(() => E.normalizeSettings({ playerCount: 4 }), 'INVALID_WOLF_COUNT');
  fails(() => E.normalizeSettings({ taskCount: 2, interactionTaskCount: 3 }), 'INVALID_TASK_COUNTS');
  for (const id of ['reporter', 'dreamer', 'bait']) fails(() => E.normalizeSettings({ roundCount: 1, enabledProfessions: [id] }), 'PROFESSION_NEEDS_MIDGAME');
  const s = E.normalizeSettings({ roundCount: 1, enabledProfessions: ['judge'], jesterEnabled: false, playerCount: 3, wolfCount: 1 });
  assert.equal(s.roundCount, 1);
  fails(() => E.normalizeSettings({ professionWeights: { judge: 0 } }), 'INVALID_SETTING');
  fails(() => E.normalizeSettings({ topicId: 'nonexistent' }), 'INVALID_TOPIC');
});

test('variable wolf and mission counts stay one whole-team set, with feasible compatible draws', () => {
  for (const settings of [{ playerCount: 8, wolfCount: 3, taskCount: 5, interactionTaskCount: 2 },
    { playerCount: 3, wolfCount: 1, jesterEnabled: false, taskCount: 1, interactionTaskCount: 0 },
    { playerCount: 12, wolfCount: 4, taskCount: 8, interactionTaskCount: 3 }]) {
    const r = start(settings);
    assert.equal(r.tasks.length, settings.taskCount);
    assert.equal(r.tasks.filter(t => t.type === 'interaction').length, settings.interactionTaskCount);
    assert.equal(new Set(r.tasks.map(t => t.mechanicKey)).size, r.tasks.length);
    for (const task of r.tasks) { assert.ok(E.compatible(task, r.topic)); assert.ok(task.requiredOtherPlayerCount <= r.settings.playerCount - settings.wolfCount); }
    for (const p of wolves(r)) assert.equal(E.projectState(r, p.id).private.tasks.length, settings.taskCount);
  }
});

test('village and jester projections contain no wolf tasks, teammate IDs, other professions or private history', () => {
  const r = rolesRoom(); completeWolves(r);
  for (const p of players(r).filter(p => p.role !== 'WOLF')) {
    const view = E.projectState(r, p.id, clock);
    assert.equal(view.private.tasks, null); assert.equal(view.private.wolfTeam, null);
    assert.equal(view.public.reveal, undefined);
    const serialized = JSON.stringify(view);
    for (const task of r.tasks) { assert.equal(serialized.includes(task.id), false); assert.equal(serialized.includes(task.text), false); }
    assert.equal(serialized.includes('recentTasks'), false);
    for (const publicPlayer of view.public.players) { assert.equal(publicPlayer.role, undefined); assert.equal(publicPlayer.profession, undefined); }
  }
  fails(() => E.projectState(r, 'outsider'), 'NOT_A_MEMBER');
});

test('a full talk interval does not alternate speakers, then wrap-up, meeting and vote', () => {
  const r = talk(); const deadline = r.deadlineAt;
  E.advanceExpired(r, deadline - 1); assert.equal(r.phase, 'TALK'); assert.equal(r.currentRoundState, undefined);
  E.advanceExpired(r, deadline); assert.equal(r.phase, 'WRAP_UP'); assert.equal(r.deadlineAt, deadline + 30000);
  E.advanceExpired(r, r.deadlineAt); assert.equal(r.phase, 'MEETING_DISCUSS');
  E.advanceExpired(r, r.deadlineAt); assert.equal(r.phase, 'VOTING');
  E.advanceExpired(r, r.deadlineAt); assert.equal(r.phase, 'TALK'); assert.equal(r.round, 2);
  assert.equal(r.voteHistory.length, 1);
});

test('follow-ups preserve countdown and missions; round two auto-selects unused follow-up only once', () => {
  const r = talk(); const deadline = r.deadlineAt; const tasks = JSON.stringify(r.tasks);
  const first = r.topic.followUps[0]; host(r, 'followUp', { followUpId: first.id });
  assert.equal(r.activeFollowUp.id, first.id); assert.equal(r.deadlineAt, deadline); assert.equal(JSON.stringify(r.tasks), tasks);
  host(r, 'clearFollowUp'); assert.equal(r.activeFollowUp, null); assert.deepEqual(r.usedFollowUpIds, [first.id]);
  fails(() => host(r, 'followUp', { followUpId: first.id }), 'INVALID_FOLLOW_UP');
  beginVote(r); abstain(r); assert.equal(r.round, 2); assert.equal(r.usedFollowUpIds.length, 2); assert.notEqual(r.activeFollowUp.id, first.id);
  const second = r.activeFollowUp.id; beginVote(r); abstain(r); assert.equal(r.round, 3); assert.equal(r.activeFollowUp.id, second);
});

test('round count generalizes: exactly R votes with R-1 midgame, final freeze and outcome', () => {
  for (const roundCount of [1, 2, 3, 5]) {
    const r = talk({ roundCount, enabledProfessions: [] });
    finalVote(r); assert.equal(r.tasksFrozen, true); abstain(r);
    assert.equal(r.phase, 'FINISHED'); assert.equal(r.voteHistory.length, roundCount);
    assert.equal(r.voteHistory.filter(v => v.type === 'MIDGAME').length, roundCount - 1);
    assert.equal(r.voteHistory.at(-1).type, 'FINAL'); assert.equal(r.result.outcome, 'DRAW');
  }
});

test('pause freezes deadlines; extension and resume retain remainder; stale timer cannot skip stages', () => {
  const r = talk(); const before = r.deadlineAt;
  host(r, 'pause'); const remaining = r.pausedRemainingMs; const version = r.phaseVersion;
  E.advanceExpired(r, before + 999999); assert.equal(r.phase, 'TALK'); assert.equal(r.pausedRemainingMs, remaining);
  host(r, 'extendTalk', { seconds: 120 }); assert.equal(r.pausedRemainingMs, remaining + 120000);
  assert.equal(E.projectState(r, 'p0').public.estimatedSeconds, E.RULES.estimateSeconds(r.settings) + 120);
  host(r, 'resume'); assert.equal(r.deadlineAt, clock + remaining + 120000); assert.equal(r.extensionSeconds, 120);
  fails(() => host(r, 'endTalk', { phaseVersion: version }), 'STALE_ACTION');
  const expiry = r.deadlineAt;
  fails(() => E.dispatch(r, 'p0', 'endTalk', { phaseVersion: r.phaseVersion }, expiry), 'STALE_ACTION');
  assert.equal(r.phase, 'WRAP_UP'); assert.equal(r.round, 1);
  E.advanceExpired(r, expiry); assert.equal(r.phase, 'WRAP_UP');
});

test('shared completion needs only taskId, is idempotent, never ends play, and rejects other camps', () => {
  const r = talk(); const [a, b] = wolves(r); const taskId = r.tasks[0].id;
  send(r, a.id, 'completeTask', { taskId }); const completion = clone(r.tasks[0].completed);
  send(r, b.id, 'completeTask', { taskId }); assert.deepEqual(r.tasks[0].completed, completion);
  assert.deepEqual(E.projectState(r, a.id).private.tasks, E.projectState(r, b.id).private.tasks);
  fails(() => send(r, villagers(r)[0].id, 'completeTask', { taskId }), 'TASK_NOT_AVAILABLE');
  completeWolves(r); assert.equal(r.phase, 'TALK'); assert.equal(r.result, undefined);
  host(r, 'endTalk'); fails(() => send(r, a.id, 'completeTask', { taskId }), 'WRONG_PHASE');
});
function clone(v) { return JSON.parse(JSON.stringify(v)); }

test('tasks count during wrap-up but freeze before final clues; no review or report forms required', () => {
  const r = talk({ roundCount: 1, enabledProfessions: [] });
  E.advanceExpired(r, r.deadlineAt); assert.equal(r.phase, 'WRAP_UP'); clock = r.updatedAt;
  completeWolves(r); host(r, 'endTalk'); assert.equal(r.phase, 'FINAL_CLUES');
  fails(() => send(r, wolves(r)[0].id, 'undoTask', { taskId: r.tasks[0].id }), 'WRONG_PHASE');
  host(r, 'endClues'); host(r, 'endMeeting'); abstain(r); assert.equal(r.result.outcome, 'WOLVES');
  assert.equal(r.voteHistory.at(-1).nominees.length, 0);
});

test('reporter reads exactly one finished full ballot, persists result, no current vote or repeat use', () => {
  const r = rolesRoom(); const p = completeProfession(r, 'reporter');
  fails(() => send(r, p.id, 'useReward', { meetingId: 'fake', targetId: wolves(r)[0].id }), 'REWARD_NEEDS_FINISHED_MIDGAME');
  beginVote(r);
  const target = players(r).find(v => v.id !== p.id); const chosen = players(r).filter(v => v.id !== target.id).slice(0, 2).map(v => v.id);
  send(r, target.id, 'submitVote', { selections: chosen });
  for (const other of players(r).filter(v => v.id !== target.id)) send(r, other.id, 'submitVote', { selections: [] });
  assert.equal(r.phase, 'TALK');
  send(r, p.id, 'useReward', { meetingId: r.voteHistory[0].id, targetId: target.id });
  const result = E.projectState(r, p.id).private.reward.result;
  assert.deepEqual(result.selections, chosen); assert.equal(result.abstained, false);
  fails(() => send(r, p.id, 'useReward', { meetingId: r.voteHistory[0].id, targetId: p.id }), 'REWARD_ALREADY_USED');
  fails(() => send(r, p.id, 'undoTask', { taskId: p.villageTask.id }), 'REWARD_ALREADY_USED');
  assert.deepEqual(E.projectState(JSON.parse(JSON.stringify(r)), p.id).private.reward.result, result);
  assert.equal(E.projectState(r, target.id).public.voteHistory[0].ballots, undefined);
});

test('reporter abstention does not award a replacement; dreamer zero list includes all camps and self', () => {
  const r = rolesRoom(); const reporter = completeProfession(r, 'reporter'); const dreamer = completeProfession(r, 'dreamer');
  beginVote(r); abstain(r);
  send(r, reporter.id, 'useReward', { meetingId: r.voteHistory[0].id, targetId: wolves(r)[0].id });
  assert.deepEqual(r.players[reporter.id].reward.result.selections, []);
  assert.equal(r.players[reporter.id].reward.result.abstained, true);
  send(r, dreamer.id, 'useReward', { meetingId: r.voteHistory[0].id });
  assert.deepEqual(r.players[dreamer.id].reward.result.playerIds.sort(), players(r).map(p => p.id).sort());
  assert.equal(r.players[dreamer.id].reward.used, true);
});

test('dreamer can receive an empty zero-vote list without replacement', () => {
  const r = rolesRoom(); const p = completeProfession(r, 'dreamer');
  beginVote(r); const list = players(r);
  list.forEach((v, i) => send(r, v.id, 'submitVote', { selections: [list[(i + 1) % list.length].id] }));
  // A random two-person shortlist cannot accidentally end this deterministic fixture.
  assert.equal(r.phase, 'TALK');
  send(r, p.id, 'useReward', { meetingId: r.voteHistory[0].id }); assert.deepEqual(r.players[p.id].reward.result.playerIds, []);
});

test('bait sees only voters from next midgame after completion, including empty response and missed window', () => {
  const r = rolesRoom(); beginVote(r); abstain(r); const bait = completeProfession(r, 'bait');
  beginVote(r); const voter = wolves(r)[0]; send(r, voter.id, 'submitVote', { selections: [bait.id] });
  for (const p of players(r).filter(p => p.id !== voter.id)) send(r, p.id, 'submitVote', { selections: [] });
  assert.deepEqual(r.players[bait.id].reward.result, { meetingId: r.voteHistory[1].id, playerIds: [voter.id] });
  const late = rolesRoom(); beginVote(late); abstain(late); beginVote(late); abstain(late); const lateBait = completeProfession(late, 'bait');
  assert.equal(E.projectState(late, lateBait.id).private.reward.windowClosed, true);
  finalVote(late); voteFor(late, [lateBait.id]); assert.equal(late.players[lateBait.id].reward.result, null);
  const empty = rolesRoom(); const emptyBait = completeProfession(empty, 'bait'); beginVote(empty); abstain(empty);
  assert.deepEqual(empty.players[emptyBait.id].reward.result.playerIds, []);
});

test('positive and negative final clues are true, partial, private and persist across refresh', () => {
  const r = rolesRoom(); const veteran = completeProfession(r, 'veteran'); const contrarian = completeProfession(r, 'contrarian');
  assert.equal(r.players[veteran.id].reward.result, null);
  while (r.round < r.settings.roundCount) { beginVote(r); abstain(r); }
  host(r, 'endTalk'); assert.equal(r.phase, 'FINAL_CLUES');
  const positive = r.players[veteran.id].reward.result.text;
  const negative = r.players[contrarian.id].reward.result.text;
  assert.ok(r.tasks.some(t => t.positiveClues.includes(positive)));
  assert.equal(r.tasks.some(t => t.text === positive), false);
  const tag = Object.entries(E.CONTENT.exclusionClues).find(([_, text]) => text === negative)?.[0]; assert.ok(tag);
  assert.equal(r.tasks.some(t => t.actionTags.includes(tag)), false);
  assert.ok(E.CONTENT.wolfTasks.some(t => E.compatible(t, r.topic) && t.actionTags.includes(tag)));
  assert.equal(JSON.stringify(E.projectState(r, wolves(r)[0].id)).includes(positive), false);
  assert.equal(JSON.stringify(E.projectState(r, wolves(r)[0].id)).includes(negative), false);
  assert.equal(E.projectState(clone(r), veteran.id).private.reward.result.text, positive);
});

test('village reroll only at opening, same profession/reward, single-use and recent history retained', () => {
  const r = start({ playerCount: 12, infoRoleLimit: 2 }); const p = profession(r, 'reporter'); const original = p.villageTask.id;
  const type = p.reward.type; send(r, p.id, 'rerollTask');
  assert.notEqual(r.players[p.id].villageTask.id, original); assert.equal(r.players[p.id].profession, 'reporter');
  assert.equal(r.players[p.id].reward.type, type); assert.ok(r.recentTasks.some(t => t.id === original));
  fails(() => send(r, p.id, 'rerollTask'), 'REROLL_NOT_AVAILABLE');
  host(r, 'beginTalk'); fails(() => send(r, p.id, 'rerollTask'), 'WRONG_PHASE');
});

test('ballots allow zero through K, reject self/duplicates/too-many, lock after submit and stay private', () => {
  const r = talk(); beginVote(r); const all = players(r); const p = all[0];
  for (const selections of [[p.id], [all[1].id, all[1].id], all.slice(1, 4).map(v => v.id), ['outsider']]) {
    const before = JSON.stringify(r); fails(() => send(r, p.id, 'submitVote', { selections }), 'INVALID_SELECTION'); assert.equal(JSON.stringify(r), before);
  }
  send(r, p.id, 'submitVote', { selections: [all[1].id] });
  fails(() => send(r, p.id, 'submitVote', { selections: [] }), 'ALREADY_VOTED');
  const view = E.projectState(r, all[1].id);
  assert.deepEqual(view.public.voting.submittedPlayerIds, [p.id]); assert.equal(view.public.voting.ballots, undefined);
  assert.equal(view.private.myVoteSubmitted, false); assert.equal(view.private.selections, undefined);
  host(r, 'endVote'); assert.deepEqual(r.voteHistory[0].nominees, [all[1].id]);
  assert.equal(r.voteHistory[0].ballots[all[2].id], undefined); assert.equal(r.phase, 'TALK');
});

test('full wolf identification immediately wins midgame; partial identification reveals no count or roles', () => {
  const r = talk(); completeWolves(r); beginVote(r); voteFor(r, wolves(r).map(p => p.id));
  assert.equal(r.phase, 'FINISHED'); assert.equal(r.result.outcome, 'VILLAGERS'); assert.equal(r.round, 1);
  const partial = talk(); beginVote(partial); voteFor(partial, [wolves(partial)[0].id]);
  assert.equal(partial.phase, 'TALK'); const pub = E.projectState(partial, 'p0').public;
  assert.equal(pub.reveal, undefined); assert.equal(pub.lastVoteResult.correctCount, undefined); assert.equal(pub.voteHistory[0].tallies, undefined);
});

test('jester only final highest positive votes, not merely shortlist; tie switch and priority over tasks', () => {
  const r = talk(); completeWolves(r); const jester = players(r).find(p => p.role === 'JESTER');
  beginVote(r); voteFor(r, [jester.id]); assert.equal(r.phase, 'TALK');
  finalVote(r); voteFor(r, [jester.id]); assert.equal(r.result.outcome, 'JESTER');
  const below = talk(); const j = players(below).find(p => p.role === 'JESTER'); const candidate = villagers(below)[0]; finalVote(below);
  const voters = players(below); let jVotes = 0;
  for (const p of voters) {
    const selections = p.id === candidate.id ? [] : [candidate.id];
    if (p.id !== j.id && jVotes++ === 0) selections.push(j.id);
    send(below, p.id, 'submitVote', { selections });
  }
  assert.equal(below.result.outcome, 'DRAW'); assert.equal(below.voteHistory.at(-1).jester.qualified, false);
  for (const jesterTieWins of [false, true]) {
    const tied = talk({ jesterTieWins, enabledProfessions: [] }); const j = players(tied).find(p => p.role === 'JESTER');
    const other = villagers(tied)[0]; finalVote(tied);
    voteFor(tied, [j.id, other.id]); assert.equal(tied.result.outcome, jesterTieWins ? 'JESTER' : 'DRAW');
  }
});

test('zero votes never form shortlist or give jester win; final votes are not cumulative', () => {
  const r = talk({ jesterTieWins: true }); const j = players(r).find(p => p.role === 'JESTER');
  beginVote(r); voteFor(r, [j.id]); finalVote(r); abstain(r);
  assert.equal(r.result.outcome, 'DRAW'); const last = r.voteHistory.at(-1);
  assert.deepEqual(last.nominees, []); assert.ok(Object.values(last.tallies).every(n => n === 0));
  assert.ok(r.voteHistory[0].tallies[j.id] > 0);
});

function tiedFinal(r, candidateIds) {
  finalVote(r);
  const neutral = players(r).filter(p => !candidateIds.includes(p.id));
  candidateIds.forEach((id, i) => send(r, neutral[i].id, 'submitVote', { selections: [id] }));
  for (const p of players(r).filter(p => !neutral.slice(0, candidateIds.length).some(q => q.id === p.id))) send(r, p.id, 'submitVote', { selections: [] });
}
test('judge sees final boundary only; chooses exact remaining seats without changing raw jester counts', () => {
  const r = rolesRoom(); const judge = completeProfession(r, 'judge'); completeWolves(r);
  const candidates = [...wolves(r).map(p => p.id), players(r).find(p => p.role === 'JESTER').id];
  tiedFinal(r, candidates); assert.equal(r.phase, 'JUDGE_DECISION');
  const decision = E.projectState(r, judge.id).private.judgeDecision;
  assert.equal(decision.seats, 2); assert.deepEqual(decision.candidates.slice().sort(), candidates.slice().sort());
  assert.equal(E.projectState(r, candidates[0]).private.judgeDecision, null);
  assert.equal(E.projectState(r, candidates[0]).public.judge, undefined);
  fails(() => send(r, candidates[0], 'judgeVote', { selections: candidates.slice(0, 2) }), 'JUDGE_ONLY');
  fails(() => send(r, judge.id, 'judgeVote', { selections: [candidates[0]] }), 'INVALID_SELECTION');
  send(r, judge.id, 'judgeVote', { selections: wolves(r).map(p => p.id) });
  assert.equal(r.result.outcome, 'VILLAGERS'); assert.equal(r.voteHistory.at(-1).tallies[candidates[2]], 1);
  assert.deepEqual(r.voteHistory.at(-1).judgeResult.chosen.sort(), wolves(r).map(p => p.id).sort());
});

test('judge timeout and no-judge ties draw once and retain the result on expiry/refresh', () => {
  const r = rolesRoom(); completeProfession(r, 'judge');
  const candidates = [...wolves(r).map(p => p.id), players(r).find(p => p.role === 'JESTER').id];
  tiedFinal(r, candidates); E.advanceExpired(r, r.deadlineAt); assert.equal(r.phase, 'FINISHED');
  const saved = clone(r.voteHistory.at(-1)); E.advanceExpired(r, clock + 999999); assert.deepEqual(r.voteHistory.at(-1), saved);
  assert.equal(saved.judgeResult.method, 'RANDOM');
  const noJudge = rolesRoom(); tiedFinal(noJudge, [...wolves(noJudge).map(p => p.id), players(noJudge).find(p => p.role === 'JESTER').id]);
  assert.equal(noJudge.phase, 'FINISHED'); assert.equal(noJudge.voteHistory.at(-1).judgeResult.method, 'RANDOM');
});

test('judge cannot intervene in midgame and no boundary tie skips judge entirely', () => {
  const r = rolesRoom(); const judge = completeProfession(r, 'judge'); beginVote(r);
  const list = players(r); list.forEach((p, i) => send(r, p.id, 'submitVote', { selections: [list[(i + 1) % list.length].id] }));
  assert.equal(r.phase, 'TALK'); assert.equal(r.players[judge.id].reward.used, false);
  finalVote(r); abstain(r); assert.equal(r.phase, 'FINISHED'); assert.equal(r.players[judge.id].reward.used, false);
});

test('restart preserves seats/settings/history, rerolls all cards, and fences all stale match requests', () => {
  const r = talk(); completeWolves(r); const prior = { matchId: r.matchId, phaseVersion: r.phaseVersion };
  host(r, 'extendTalk', { seconds: 120 });
  const topic = r.topic.id, tasks = r.tasks.map(t => t.id), sessions = clone(r.sessions), settings = clone(r.settings);
  host(r, 'restart', { keepTopic: true }); assert.equal(r.phase, 'ROLE_REVEAL'); assert.notEqual(r.matchId, prior.matchId);
  assert.equal(r.topic.id, topic); assert.deepEqual(r.sessions, sessions); assert.deepEqual(r.settings, settings);
  assert.equal(r.voteHistory.length, 0); assert.equal(r.tasks.some(t => t.completed), false); assert.equal(r.deadlineAt, null);
  assert.equal(r.extensionSeconds, 0); assert.equal(E.projectState(r, 'p0').public.estimatedSeconds, E.RULES.estimateSeconds(r.settings));
  assert.equal(r.tasks.some(t => tasks.includes(t.id)), false); assert.ok(tasks.every(id => r.recentTasks.some(t => t.id === id)));
  fails(() => host(r, 'beginTalk', prior), 'STALE_MATCH');
  const restored = clone(r); assert.deepEqual(E.projectState(restored, 'p0').private, E.projectState(r, 'p0').private);
  host(r, 'beginTalk'); beginVote(r); host(r, 'restart', { keepTopic: false }); assert.equal(r.phase, 'ROLE_REVEAL');
  assert.equal(r.voteHistory.length, 0); assert.equal(r.ballots && Object.keys(r.ballots).length, 0);
});

test('replay returns lobby with no prior private cards; cancel has no winning camp', () => {
  const r = talk(); const known = r.tasks.map(t => t.id); host(r, 'cancelGame');
  assert.equal(r.result.outcome, 'CANCELLED'); assert.ok(E.projectState(r, 'p0').public.reveal);
  host(r, 'replay'); assert.equal(r.phase, 'LOBBY'); assert.equal(r.matchId, null);
  for (const p of players(r)) { const view = E.projectState(r, p.id); assert.equal(view.private.role, null); assert.equal(view.private.tasks, null); assert.equal(view.private.reward, null); }
  assert.ok(known.every(id => r.recentTasks.some(t => t.id === id)));
});

test('host privileges never grant task authority; outsiders and non-host controls fail without mutation', () => {
  let r;
  for (let seed = 1; seed < 100; seed++) { r = talk({}, seed); if (r.players.p0.role === 'VILLAGER') break; }
  assert.equal(r.players.p0.role, 'VILLAGER'); assert.equal(E.projectState(r, 'p0').private.tasks, null);
  fails(() => host(r, 'completeTask', { taskId: r.tasks[0].id }), 'TASK_NOT_AVAILABLE');
  const other = players(r).find(p => !p.isHost); const saved = JSON.stringify(r);
  for (const action of ['restart', 'endTalk', 'pause', 'cancelGame', 'followUp']) fails(() => send(r, other.id, action), 'HOST_ONLY');
  assert.equal(JSON.stringify(r), saved); fails(() => send(r, 'outsider', 'heartbeat'), 'NOT_A_MEMBER');
});

test('restart change-topic option changes even a manually chosen starting topic', () => {
  const r = start({ topicId: E.CONTENT.topics[0].id }); const first = r.topic.id;
  host(r, 'restart', { keepTopic: true }); assert.equal(r.topic.id, first);
  host(r, 'restart', { keepTopic: false }); assert.notEqual(r.topic.id, first);
  assert.equal(r.settings.topicId, first); // Lobby preference is not silently rewritten.
});

test('secure production randomness does not consume or expose the deterministic test RNG', () => {
  const r = room(); r.secureRandom = true; const state = r.rngState;
  host(r, 'startGame'); assert.equal(r.rngState, state);
  assert.equal(r.tasks.length, 3); assert.equal(wolves(r).length, 2);
  assert.equal(E.projectState(r, 'p0').public.rngState, undefined);
});

test('all 48 topics support maximum configured task counts without mechanic duplicates', () => {
  for (const topic of E.CONTENT.topics) for (const interactionTaskCount of [0, 6, 12]) {
    const r = start({ topicId: topic.id, taskCount: 12, interactionTaskCount });
    assert.equal(r.tasks.length, 12, topic.id);
    assert.equal(new Set(r.tasks.map(t => t.mechanicKey)).size, 12, topic.id);
    assert.equal(r.tasks.filter(t => t.type === 'interaction').length, interactionTaskCount, topic.id);
    for (const task of r.tasks) assert.ok(E.compatible(task, topic));
  }
});

test('full identification outranks a jester tied for highest when judge selects all wolves', () => {
  const r = talk({ playerCount: 12, infoRoleLimit: 2, jesterTieWins: true }); const judge = completeProfession(r, 'judge');
  completeWolves(r);
  const candidates = [...wolves(r).map(p => p.id), players(r).find(p => p.role === 'JESTER').id];
  tiedFinal(r, candidates); send(r, judge.id, 'judgeVote', { selections: wolves(r).map(p => p.id) });
  assert.equal(r.result.outcome, 'VILLAGERS'); assert.equal(E.projectState(r, 'p0').public.reveal.jester.qualified, true);
});

test('restart at every active stage invalidates timers, rewards, ballots and old match requests', () => {
  for (const target of ['ROLE_REVEAL', 'TALK', 'WRAP_UP', 'MEETING_DISCUSS', 'VOTING', 'FINAL_CLUES', 'JUDGE_DECISION', 'FINISHED']) {
    const r = start({ playerCount: 12, infoRoleLimit: 2 });
    if (target !== 'ROLE_REVEAL') host(r, 'beginTalk');
    if (target === 'WRAP_UP') { E.advanceExpired(r, r.deadlineAt); clock = r.updatedAt; }
    if (target === 'MEETING_DISCUSS') host(r, 'endTalk');
    if (target === 'VOTING') beginVote(r);
    if (target === 'FINAL_CLUES') {
      while (r.round < r.settings.roundCount) { beginVote(r); abstain(r); }
      host(r, 'endTalk');
    }
    if (target === 'JUDGE_DECISION') {
      completeProfession(r, 'judge');
      tiedFinal(r, [...wolves(r).map(p => p.id), players(r).find(p => p.role === 'JESTER').id]);
    }
    if (target === 'FINISHED') host(r, 'cancelGame');
    assert.equal(r.phase, target);
    const oldMatch = r.matchId;
    host(r, 'restart', { keepTopic: true });
    assert.equal(r.phase, 'ROLE_REVEAL'); assert.equal(r.deadlineAt, null); assert.equal(r.round, 0);
    assert.deepEqual(r.ballots, {}); assert.deepEqual(r.voteHistory, []); assert.equal(r.judge, null);
    assert.equal(players(r).some(p => p.reward?.used || p.villageTask?.completed), false);
    assert.notEqual(r.matchId, oldMatch);
    fails(() => host(r, 'beginTalk', { matchId: oldMatch }), 'STALE_MATCH');
  }
});

test('room history is bounded and keeps compatible shared IDs across new topics', () => {
  const r = start(); const history = r.tasks.map(t => t.id);
  host(r, 'restart', { keepTopic: false });
  assert.equal(r.tasks.some(t => history.includes(t.id)), false);
  for (let i = 0; i < 20; i++) host(r, 'restart', { keepTopic: true });
  assert.equal(r.recentTasks.length, 60); assert.ok(r.tasks.every(t => E.compatible(t, r.topic)));
});
