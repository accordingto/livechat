'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const CONTENT = require('../chat-wolf-content.js');
const {
  PHASES,
  createRoom,
  addPlayer,
  advanceExpired,
  dispatch,
  projectState,
} = require('../chat-wolf-engine.js');

function setup6(seed = 123456, settings = {}) {
  let now = 1_000_000;
  const room = createRoom({
    code: 'ABC234',
    hostPlayerId: 'p1',
    hostSessionHash: 's1',
    hostName: '玩家1',
    settings: { playerCount: 6, wolfCount: 2, ...settings },
    now,
    seed,
  });
  for (let i = 2; i <= 6; i += 1) {
    addPlayer(room, { playerId: `p${i}`, sessionHash: `s${i}`, name: `玩家${i}`, now: ++now });
  }
  for (let i = 1; i <= 6; i += 1) dispatch(room, `p${i}`, 'ready', { ready: true }, ++now);
  dispatch(room, 'p1', 'startGame', {}, ++now);
  return { room, now };
}

test('本地題庫數量、分類、明確條件與禁用第三人稱', () => {
  assert.equal(CONTENT.topics.length, 40);
  assert.equal(new Set(CONTENT.topics.map(t => t.category)).size, 20);
  assert.equal(CONTENT.topics.flatMap(t => t.followUps).length, 160);
  assert.ok(CONTENT.sharedTasks.length >= 100);
  assert.ok(CONTENT.personalTasks.length >= 150);
  for (const pool of [CONTENT.topics, CONTENT.sharedTasks, CONTENT.personalTasks]) assert.equal(new Set(pool.map(t => t.id)).size, pool.length);
  for (const t of CONTENT.topics) assert.equal(new Set(t.followUps).size, t.followUps.length);
  for (const t of [...CONTENT.sharedTasks, ...CONTENT.personalTasks]) {
    assert.ok(t.family && t.difficulty && t.suspiciousness && t.text.length > 10);
    assert.equal(t.family === 'third_person', false);
    assert.equal(/第三人稱|用自己的名字稱呼自己/.test(t.text), false);
  }
  assert.ok(CONTENT.personalTasks.every(t => t.onlineCompatible));
});

test('主題六輪保持相同；延伸不重複、不改倒數與順序；自由討論可暫停與重連', () => {
  const ctx = setup6(); acknowledgeAll(ctx);
  const topic = ctx.room.topic.id;
  const first = ctx.room.currentRoundState.order[0];
  const order = ctx.room.currentRoundState.order.slice();
  const deadline = ctx.room.deadlineAt;
  const followUps = new Set();
  for (let i = 0; i < 4; i++) {
    dispatch(ctx.room, 'p1', 'followUp', {}, ++ctx.now);
    followUps.add(projectState(ctx.room, 'p2', ctx.now).public.talk.followUp);
    assert.equal(ctx.room.deadlineAt, deadline);
    assert.deepEqual(ctx.room.currentRoundState.order, order);
    assert.equal(ctx.room.currentRoundState.speakerIndex, 0);
  }
  assert.equal(followUps.size, 4);
  assert.throws(() => dispatch(ctx.room, 'p1', 'followUp', {}, ++ctx.now), /NO_MORE_FOLLOW_UPS/);
  dispatch(ctx.room, first, 'endTurn', {}, ++ctx.now);
  assert.equal(ctx.room.phase, PHASES.FREE_TALK);
  assert.equal(ctx.room.currentRoundState.speakerIndex, 0);
  assert.throws(() => dispatch(ctx.room, 'p2', 'endFreeTalk', {}, ++ctx.now), /HOST_ONLY/);
  dispatch(ctx.room, 'p1', 'pause', {}, ++ctx.now);
  const left = ctx.room.pausedRemainingMs;
  const restored = JSON.parse(JSON.stringify(ctx.room));
  assert.equal(projectState(restored, 'p2', ctx.now).public.phase, PHASES.FREE_TALK);
  assert.equal(projectState(restored, 'p2', ctx.now).public.talk.nextSpeakerId, order[1]);
  dispatch(ctx.room, 'p1', 'resume', {}, ++ctx.now);
  assert.equal(ctx.room.deadlineAt - ctx.now, left);
  ctx.now = ctx.room.deadlineAt;
  advanceExpired(ctx.room, ctx.now);
  assert.equal(ctx.room.phase, PHASES.TALK);
  assert.equal(ctx.room.currentRoundState.speakerIndex, 1);
  finishTalkRound(ctx);
  assert.equal(ctx.room.topic.id, topic);
  assert.equal(projectState(ctx.room, 'p2', ctx.now).public.talk.followUpsRemaining, 0);
});

test('個人任務彼此可見，但不能代報／代取消；自由討論可申報，不要求村民目標', () => {
  const ctx = setup6(); acknowledgeAll(ctx);
  const [a, b] = wolves(ctx.room);
  const task = ctx.room.tasks.find(t => t.ownerId === a);
  const payload = { taskId: task.id, targetIds: [], round: 1, summary: '本人做出任務行為，隊友協助鋪梗。' };
  assert.throws(() => dispatch(ctx.room, b, 'claimTask', payload, ++ctx.now), /TASK_OWNER_ONLY/);
  finishCurrentSpeech(ctx);
  dispatch(ctx.room, a, 'claimTask', payload, ++ctx.now);
  assert.equal(ctx.room.phase, PHASES.FREE_TALK);
  assert.equal(projectState(ctx.room, b, ctx.now).private.tasks.find(t => t.id === task.id).claim.claimedBy, a);
  assert.throws(() => dispatch(ctx.room, b, 'cancelClaim', payload, ++ctx.now), /TASK_OWNER_ONLY/);
  dispatch(ctx.room, a, 'cancelClaim', payload, ++ctx.now);
  assert.equal(task.claim, null);
});

test('共同任務與一人的任務有效、另一人未申報，仍為平手；未核對不能結算', () => {
  const ctx = setup6(); acknowledgeAll(ctx);
  for (const task of ctx.room.tasks.slice(0, 2)) dispatch(ctx.room, task.ownerId || wolves(ctx.room)[0], 'claimTask', {
    taskId: task.id, targetIds: villagers(ctx.room).slice(0, task.requiredVillagers), round: 1, summary: '測試事件',
  }, ++ctx.now);
  progressToFinalVote(ctx);
  submitVotes(ctx, wrongSelections(ctx.room));
  assert.throws(() => dispatch(ctx.room, 'p1', 'finalizeReview', {}, ++ctx.now), /TASK_REVIEW_INCOMPLETE/);
  for (const task of ctx.room.tasks.slice(0, 2)) dispatch(ctx.room, 'p1', 'reviewTask', { taskId: task.id, valid: true }, ++ctx.now);
  assert.equal(ctx.room.result.outcome, 'DRAW');
});

test('連續 30 局保留近期 30 任務避重、主題換新、個人類型不相似', () => {
  const ctx = setup6();
  let previousTopic = null, history = [];
  for (let n = 0; n < 30; n++) {
    const room = ctx.room;
    assert.notEqual(room.topic.id, previousTopic);
    const personal = room.tasks.filter(t => t.ownerId);
    assert.notEqual(personal[0].family, personal[1].family);
    assert.notEqual(personal[0].similarityGroup, personal[1].similarityGroup);
    for (const task of room.tasks) assert.equal(history.slice(-30).includes(task.id), false);
    assert.ok(room.tasks[0].compatibleTopicTags.some(t => t === '*' || room.topic.tags.includes(t)));
    history.push(...room.tasks.map(t => t.id)); previousTopic = room.topic.id;
    dispatch(room, 'p1', 'cancelGame', {}, ++ctx.now);
    dispatch(room, 'p1', 'replay', {}, ++ctx.now);
    assert.ok(room.recentTasks.length <= 30);
    for (const id of Object.keys(room.players)) dispatch(room, id, 'ready', { ready: true }, ++ctx.now);
    dispatch(room, 'p1', 'startGame', {}, ++ctx.now);
  }
});

test('3–12 人與所有合法狼人數都只抽可完成任務', () => {
  for (let count = 3; count <= 12; count++) for (let k = 1; k <= count - 2; k++) {
    const room = createRoom({ code: 'ABC234', hostPlayerId: 'p0', hostName: 'P0', hostSessionHash: 's0', settings: { playerCount: count, wolfCount: k }, now: 100, seed: count * 20 + k });
    for (let i = 1; i < count; i++) addPlayer(room, { playerId: `p${i}`, name: `P${i}`, sessionHash: `s${i}`, now: 100 });
    for (const id of Object.keys(room.players)) dispatch(room, id, 'ready', { ready: true }, 100);
    dispatch(room, 'p0', 'startGame', {}, 100);
    assert.equal(room.tasks.length, k + 1);
    assert.ok(room.tasks[0].requiredVillagers <= count - k);
    assert.equal(new Set(room.tasks.map(t => t.id)).size, k + 1);
    assert.ok(room.tasks.every(t => t.minPlayers <= count));
  }
});

test('更新前已開始的牌局仍用原流程，重玩才升新版', () => {
  const ctx = setup6(); acknowledgeAll(ctx);
  delete ctx.room.rulesVersion; delete ctx.room.topic;
  ctx.room.tasks = require('../chat-wolf-engine.js').TASK_POOL.slice(0, 2).map(t => ({ ...t, claim: null, review: null }));
  finishCurrentSpeech(ctx);
  assert.equal(ctx.room.phase, PHASES.TALK);
  assert.equal(ctx.room.currentRoundState.speakerIndex, 1);
  assert.equal(projectState(ctx.room, 'p1', ctx.now).public.rulesVersion, 1);
});

function acknowledgeAll(ctx) {
  for (let i = 1; i <= 6; i += 1) dispatch(ctx.room, `p${i}`, 'ackRole', {}, ++ctx.now);
  assert.equal(ctx.room.phase, PHASES.TALK);
}

function finishCurrentSpeech(ctx, reasonAction = 'endTurn') {
  const room = ctx.room;
  const current = room.phase === PHASES.TALK
    ? room.currentRoundState.order[room.currentRoundState.speakerIndex]
    : room.meeting.order[room.meeting.speakerIndex];
  dispatch(room, current, reasonAction, {}, ++ctx.now);
}

function finishTalkRound(ctx) {
  const round = ctx.room.round;
  while ([PHASES.TALK, PHASES.FREE_TALK].includes(ctx.room.phase) && ctx.room.round === round) {
    if (ctx.room.phase === PHASES.FREE_TALK) dispatch(ctx.room, 'p1', 'endFreeTalk', {}, ++ctx.now);
    else finishCurrentSpeech(ctx);
  }
}

function finishMeetingDiscussion(ctx) {
  while (ctx.room.phase === PHASES.MEETING_DISCUSS) finishCurrentSpeech(ctx);
  assert.equal(ctx.room.phase, PHASES.VOTING);
}

function wolves(room) {
  return Object.keys(room.players).filter((id) => room.players[id].role === 'WOLF');
}

function villagers(room) {
  return Object.keys(room.players).filter((id) => room.players[id].role === 'VILLAGER');
}

function submitVotes(ctx, selections) {
  const ids = Object.keys(ctx.room.players);
  for (const id of ids) dispatch(ctx.room, id, 'submitVote', { selections }, ++ctx.now);
}

function wrongSelections(room) {
  return villagers(room).slice(0, room.settings.wolfCount);
}

function continueWrongMidgameVote(ctx) {
  finishMeetingDiscussion(ctx);
  submitVotes(ctx, wrongSelections(ctx.room));
  assert.equal(ctx.room.phase, PHASES.TALK);
}

function progressToFinalVote(ctx) {
  while (!(ctx.room.phase === PHASES.VOTING && ctx.room.voting.type === 'FINAL')) {
    if (ctx.room.phase === PHASES.TALK) finishTalkRound(ctx);
    else if (ctx.room.phase === PHASES.MEETING_DISCUSS) continueWrongMidgameVote(ctx);
    else throw new Error(`unexpected ${ctx.room.phase}`);
  }
}

test('6 人 2 狼看到共同任務與雙方個人任務；村民房主的投影不含秘密', () => {
  let ctx;
  for (let seed = 1; seed < 100; seed += 1) {
    const candidate = setup6(seed);
    if (candidate.room.players.p1.role === 'VILLAGER') { ctx = candidate; break; }
  }
  assert.ok(ctx);
  const wolfIds = wolves(ctx.room);
  assert.equal(wolfIds.length, 2);
  assert.equal(ctx.room.tasks.length, 3);
  assert.equal(new Set(ctx.room.tasks.map((task) => task.id)).size, 3);
  assert.equal(ctx.room.tasks.filter(t => t.type === 'shared').length, 1);
  assert.equal(new Set(ctx.room.tasks.filter(t => t.ownerId).map(t => t.ownerId)).size, 2);
  const wolfA = projectState(ctx.room, wolfIds[0], ctx.now);
  const wolfB = projectState(ctx.room, wolfIds[1], ctx.now);
  assert.deepEqual(wolfA.private.tasks, wolfB.private.tasks);
  assert.deepEqual(wolfA.private.wolfTeam.map((p) => p.id).sort(), wolfIds.sort());
  const hostView = projectState(ctx.room, 'p1', ctx.now);
  assert.equal(hostView.private.role, 'VILLAGER');
  assert.equal(hostView.private.tasks, null);
  assert.equal(hostView.private.wolfTeam, null);
  assert.equal(hostView.public.reveal, undefined);
});

test('每輪每人只有一次；提前、逾時與主持跳過都只前進一位', () => {
  const ctx = setup6();
  acknowledgeAll(ctx);
  const first = ctx.room.currentRoundState.order[0];
  dispatch(ctx.room, first, 'endTurn', {}, ++ctx.now);
  assert.equal(Object.keys(ctx.room.currentRoundState.completed).length, 1);
  assert.equal(ctx.room.phase, PHASES.FREE_TALK);
  assert.throws(() => dispatch(ctx.room, first, 'endTurn', {}, ++ctx.now), /WRONG_PHASE/);
  dispatch(ctx.room, 'p1', 'endFreeTalk', {}, ++ctx.now);

  const beforeTimeout = Object.keys(ctx.room.currentRoundState.completed).length;
  const deadline = ctx.room.deadlineAt;
  advanceExpired(ctx.room, deadline + 1);
  ctx.now = deadline + 1;
  assert.equal(Object.keys(ctx.room.currentRoundState.completed).length, beforeTimeout + 1);
  assert.equal(ctx.room.phase, PHASES.FREE_TALK);
  dispatch(ctx.room, 'p1', 'endFreeTalk', {}, ++ctx.now);

  const current = ctx.room.currentRoundState.order[ctx.room.currentRoundState.speakerIndex];
  dispatch(ctx.room, 'p1', 'endTurn', {}, ++ctx.now);
  assert.ok(ctx.room.currentRoundState.completed[current]);
  assert.equal(Object.keys(ctx.room.currentRoundState.completed).length, beforeTimeout + 2);
});

test('沒有搖鈴時只在第 2、4 輪後開中途會議，第 6 輪直接終局投票', () => {
  const ctx = setup6();
  acknowledgeAll(ctx);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.TALK);
  assert.equal(ctx.room.round, 2);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.MEETING_DISCUSS);
  assert.equal(ctx.room.meeting.slotId, 'after2');
  continueWrongMidgameVote(ctx);
  assert.equal(ctx.room.round, 3);
  finishTalkRound(ctx);
  assert.equal(ctx.room.round, 4);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.MEETING_DISCUSS);
  assert.equal(ctx.room.meeting.slotId, 'after4');
  continueWrongMidgameVote(ctx);
  assert.equal(ctx.room.round, 5);
  finishTalkRound(ctx);
  assert.equal(ctx.room.round, 6);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.VOTING);
  assert.equal(ctx.room.voting.type, 'FINAL');
});

test('第 1 輪搖鈴提前使用第一會議槽，第 2 輪末不重開且第 4 輪照常', () => {
  const ctx = setup6();
  acknowledgeAll(ctx);
  dispatch(ctx.room, 'p2', 'ringBell', {}, ++ctx.now);
  assert.equal(ctx.room.bell.used, true);
  assert.equal(ctx.room.meetingSlots.after2.advanced, true);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.MEETING_DISCUSS);
  assert.equal(ctx.room.meeting.resumeRound, 2);
  continueWrongMidgameVote(ctx);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.TALK);
  assert.equal(ctx.room.round, 3);
  finishTalkRound(ctx);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.MEETING_DISCUSS);
  assert.equal(ctx.room.meeting.slotId, 'after4');
});

test('搖鈴全房只能成功一次，第 5、6 輪不可搖', () => {
  const ctx = setup6();
  acknowledgeAll(ctx);
  dispatch(ctx.room, 'p2', 'ringBell', {}, ++ctx.now);
  assert.throws(() => dispatch(ctx.room, 'p3', 'ringBell', {}, ++ctx.now), /BELL_ALREADY_USED/);

  const noBell = setup6(99);
  acknowledgeAll(noBell);
  while (!(noBell.room.phase === PHASES.TALK && noBell.room.round === 5)) {
    if (noBell.room.phase === PHASES.TALK) finishTalkRound(noBell);
    else continueWrongMidgameVote(noBell);
  }
  assert.throws(() => dispatch(noBell.room, 'p2', 'ringBell', {}, ++noBell.now), /BELL_NOT_AVAILABLE/);
});

test('中途只猜中部分不翻牌；整組命中立即村民勝利', () => {
  const partial = setup6(11);
  acknowledgeAll(partial);
  finishTalkRound(partial);
  finishTalkRound(partial);
  finishMeetingDiscussion(partial);
  const pick = [wolves(partial.room)[0], villagers(partial.room)[0]];
  submitVotes(partial, pick);
  assert.equal(partial.room.phase, PHASES.TALK);
  const view = projectState(partial.room, 'p3', partial.now);
  assert.equal(view.public.reveal, undefined);
  assert.equal(view.public.lastVoteResult.outcome, 'NOT_EXACT');
  assert.equal(view.public.lastVoteResult.nominees.length, 2);

  const exact = setup6(12);
  acknowledgeAll(exact);
  finishTalkRound(exact);
  finishTalkRound(exact);
  finishMeetingDiscussion(exact);
  submitVotes(exact, wolves(exact.room));
  assert.equal(exact.room.phase, PHASES.FINISHED);
  assert.equal(exact.room.result.outcome, 'VILLAGERS');
});

test('狼隊同步備註及提早申報全部任務，但不公開也不立即獲勝', () => {
  const ctx = setup6(42);
  acknowledgeAll(ctx);
  const wolfIds = wolves(ctx.room);
  const targetIds = villagers(ctx.room).slice(0, ctx.room.tasks[0].requiredVillagers);
  dispatch(ctx.room, wolfIds[0], 'taskNote', { taskId: ctx.room.tasks[0].id, note: '我先引導A，下一輪你問B。' }, ++ctx.now);
  dispatch(ctx.room, wolfIds[1], 'claimTask', { taskId: ctx.room.tasks[0].id, targetIds, round: 1, summary: '兩位村民各自完成回應。' }, ++ctx.now);
  for (const task of ctx.room.tasks.filter(t => t.ownerId)) dispatch(ctx.room, task.ownerId, 'claimTask', { taskId: task.id, targetIds: [], round: 1, summary: '本人已做出指定行為。' }, ++ctx.now);
  assert.equal(ctx.room.phase, PHASES.TALK);
  assert.equal(ctx.room.result, undefined);
  const a = projectState(ctx.room, wolfIds[0], ctx.now);
  const b = projectState(ctx.room, wolfIds[1], ctx.now);
  assert.deepEqual(a.private.tasks, b.private.tasks);
  assert.equal(projectState(ctx.room, targetIds[0], ctx.now).private.tasks, null);
  assert.equal(projectState(ctx.room, targetIds[0], ctx.now).public.reveal, undefined);
});

test('會議階段拒絕申報，且終局投票開始後資料凍結', () => {
  const ctx = setup6(43);
  acknowledgeAll(ctx);
  const wolf = wolves(ctx.room)[0];
  const payload = { taskId: ctx.room.tasks[0].id, targetIds: villagers(ctx.room).slice(0, 2), round: 1, summary: '有效的談話事件。' };
  finishTalkRound(ctx);
  finishTalkRound(ctx);
  assert.equal(ctx.room.phase, PHASES.MEETING_DISCUSS);
  assert.throws(() => dispatch(ctx.room, wolf, 'claimTask', payload, ++ctx.now), /WRONG_PHASE/);
  continueWrongMidgameVote(ctx);
  progressToFinalVote(ctx);
  assert.equal(ctx.room.tasksFrozen, true);
  assert.throws(() => dispatch(ctx.room, wolf, 'claimTask', payload, ++ctx.now), /WRONG_PHASE/);
});

test('終局正確為村民勝；錯誤且全部任務有效為狼人勝；任務不足為平手', () => {
  const correct = setup6(55);
  acknowledgeAll(correct);
  progressToFinalVote(correct);
  submitVotes(correct, wolves(correct.room));
  assert.equal(correct.room.result.outcome, 'VILLAGERS');

  const wolfWin = setup6(56);
  acknowledgeAll(wolfWin);
  const wolf = wolves(wolfWin.room)[0];
  const targets = villagers(wolfWin.room).slice(0, 2);
  for (const task of wolfWin.room.tasks) {
    dispatch(wolfWin.room, task.ownerId || wolf, 'claimTask', { taskId: task.id, targetIds: villagers(wolfWin.room).slice(0, task.requiredVillagers), round: 1, summary: '談話輪次中的有效事件。' }, ++wolfWin.now);
  }
  progressToFinalVote(wolfWin);
  submitVotes(wolfWin, wrongSelections(wolfWin.room));
  assert.equal(wolfWin.room.phase, PHASES.TASK_REVIEW);
  for (const task of wolfWin.room.tasks.slice()) {
    dispatch(wolfWin.room, 'p1', 'reviewTask', { taskId: task.id, valid: true }, ++wolfWin.now);
  }
  assert.equal(wolfWin.room.result.outcome, 'WOLVES');

  const draw = setup6(57);
  acknowledgeAll(draw);
  progressToFinalVote(draw);
  submitVotes(draw, wrongSelections(draw.room));
  assert.equal(draw.room.phase, PHASES.TASK_REVIEW);
  dispatch(draw.room, 'p1', 'finalizeReview', {}, ++draw.now);
  assert.equal(draw.room.result.outcome, 'DRAW');
});

test('平票抽選只產生一次；全體棄權不隨機補滿', () => {
  const tied = setup6(70);
  acknowledgeAll(tied);
  finishTalkRound(tied);
  finishTalkRound(tied);
  finishMeetingDiscussion(tied);
  const [a, b, c, d] = Object.keys(tied.room.players);
  const ballots = [[a, b], [a, c], [a, d], [b, c], [b, d], [c, d]];
  Object.keys(tied.room.players).forEach((id, index) => {
    dispatch(tied.room, id, 'submitVote', { selections: ballots[index] }, ++tied.now);
  });
  const saved = tied.room.voteHistory[0].nominees.slice();
  const refreshed = projectState(tied.room, 'p1', tied.now + 5000);
  assert.deepEqual(refreshed.public.voteHistory[0].nominees, saved);

  const abstain = setup6(71);
  acknowledgeAll(abstain);
  finishTalkRound(abstain);
  finishTalkRound(abstain);
  finishMeetingDiscussion(abstain);
  advanceExpired(abstain.room, abstain.room.deadlineAt + 1);
  assert.deepEqual(abstain.room.voteHistory[0].nominees, []);
  assert.equal(abstain.room.voteHistory[0].outcome, 'NO_NOMINATION');
  assert.equal(abstain.room.phase, PHASES.TALK);
});

test('重新連線不新增玩家；暫停保留剩餘時間；再玩一局清掉上局秘密', () => {
  const ctx = setup6(81);
  acknowledgeAll(ctx);
  const playerCount = Object.keys(ctx.room.players).length;
  const originalRole = projectState(ctx.room, 'p2', ctx.now).private.role;
  dispatch(ctx.room, 'p2', 'heartbeat', {}, ++ctx.now);
  assert.equal(Object.keys(ctx.room.players).length, playerCount);
  assert.equal(projectState(ctx.room, 'p2', ctx.now).private.role, originalRole);

  const remainingBefore = ctx.room.deadlineAt - ctx.now;
  dispatch(ctx.room, 'p1', 'pause', {}, ++ctx.now);
  assert.equal(ctx.room.deadlineAt, null);
  const pausedRemaining = ctx.room.pausedRemainingMs;
  advanceExpired(ctx.room, ctx.now + 999999);
  assert.equal(ctx.room.currentRoundState.speakerIndex, 0);
  dispatch(ctx.room, 'p1', 'resume', {}, ctx.now + 10000);
  assert.equal(ctx.room.deadlineAt, ctx.now + 10000 + pausedRemaining);
  assert.ok(ctx.room.deadlineAt > ctx.now + 10000);
  assert.ok(remainingBefore > 0);

  dispatch(ctx.room, 'p1', 'cancelGame', {}, ++ctx.now);
  assert.equal(ctx.room.result.outcome, 'CANCELLED');
  dispatch(ctx.room, 'p1', 'replay', {}, ++ctx.now);
  assert.equal(ctx.room.phase, PHASES.LOBBY);
  assert.equal(Object.keys(ctx.room.players).length, 6);
  assert.ok(Object.values(ctx.room.players).every((player) => player.role === null && player.ready === false));
  assert.equal(ctx.room.tasks, undefined);
  assert.equal(ctx.room.voteHistory, undefined);
  assert.equal(ctx.room.bell, undefined);
});
