'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PHASES,
  createRoom,
  addPlayer,
  advanceExpired,
  dispatch,
  projectState,
} = require('../api/_lib/chat-wolf-engine.cjs');

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
  while (ctx.room.phase === PHASES.TALK && ctx.room.round === round) finishCurrentSpeech(ctx);
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

test('6 人 2 狼只共享兩個任務；村民與村民房主都拿不到秘密', () => {
  let ctx;
  for (let seed = 1; seed < 100; seed += 1) {
    const candidate = setup6(seed);
    if (candidate.room.players.p1.role === 'VILLAGER') { ctx = candidate; break; }
  }
  assert.ok(ctx);
  const wolfIds = wolves(ctx.room);
  assert.equal(wolfIds.length, 2);
  assert.equal(ctx.room.tasks.length, 2);
  assert.equal(new Set(ctx.room.tasks.map((task) => task.id)).size, 2);
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
  assert.throws(() => dispatch(ctx.room, first, 'endTurn', {}, ++ctx.now), /CURRENT_SPEAKER_ONLY/);

  const beforeTimeout = Object.keys(ctx.room.currentRoundState.completed).length;
  const deadline = ctx.room.deadlineAt;
  advanceExpired(ctx.room, deadline + 1);
  assert.equal(Object.keys(ctx.room.currentRoundState.completed).length, beforeTimeout + 1);

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

test('狼隊可同步備註及提早申報兩項，但不公開也不立即獲勝', () => {
  const ctx = setup6(42);
  acknowledgeAll(ctx);
  const wolfIds = wolves(ctx.room);
  const targetIds = villagers(ctx.room).slice(0, 2);
  dispatch(ctx.room, wolfIds[0], 'taskNote', { taskId: ctx.room.tasks[0].id, note: '我先引導A，下一輪你問B。' }, ++ctx.now);
  dispatch(ctx.room, wolfIds[1], 'claimTask', { taskId: ctx.room.tasks[0].id, targetIds, round: 1, summary: '兩位村民各自完成回應。' }, ++ctx.now);
  dispatch(ctx.room, wolfIds[0], 'claimTask', { taskId: ctx.room.tasks[1].id, targetIds, round: 1, summary: '狼隊有引導，兩位村民正式回應。' }, ++ctx.now);
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

test('終局正確為村民勝；錯誤且兩任務有效為狼人勝；任務不足為平手', () => {
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
    dispatch(wolfWin.room, wolf, 'claimTask', { taskId: task.id, targetIds: targets, round: 1, summary: '談話輪次中的有效事件。' }, ++wolfWin.now);
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
