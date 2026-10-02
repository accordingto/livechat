'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../chat-wolf-v3-engine.js');
const copy = value => JSON.parse(JSON.stringify(value));
const fails = (fn, code) => assert.throws(fn, error => error.code === code, code);

function fixture(seed = 7) {
  let now = 100000;
  const room = E.createRoom({ code: 'NOTICE', hostPlayerId: 'p0', hostSessionHash: 's0', hostName: 'Host',
    settings: { playerCount: 6, wolfCount: 2, enabledProfessions: [], topicId: 'topic_v2_02', talkEndBehavior: 'host_confirm' }, seed, now });
  for (let i = 1; i < 6; i++) E.addPlayer(room, { playerId: `p${i}`, sessionHash: `s${i}`, name: `Player ${i}`, now });
  const send = (actor, action, payload = {}) => E.dispatch(room, actor, action, payload, now);
  send('p0', 'startGame'); send('p0', 'beginTalk');
  const directorId = Object.values(room.players).find(player => player.wolfProfession === 'director').id;
  const targetId = Object.values(room.players).find(player => player.role === 'JESTER').id;
  send(directorId, 'sendDirection', { targetId, directionId: room.players[directorId].wolfAbility.options[0].id });
  const assignment = () => room.players[targetId].secretDirection;
  const notice = action => send(targetId, action, { directionId: assignment().id });
  return { room, directorId, targetId, send, assignment, notice,
    now: () => now, setTime: time => { now = time; }, advance: milliseconds => { now += milliseconds; },
    view: id => E.projectState(room, id || targetId, now) };
}

test('Director receipt waits for first displayed popup then uses an authoritative 30-second lock', () => {
  const h = fixture();
  assert.equal(h.assignment().noticeShownAt, null);
  assert.equal(h.assignment().noticeUnlockAt, null);
  assert.equal(h.assignment().noticeAcknowledgedAt, null);
  assert.equal(h.view().private.actions.canShowDirectionNotice, true);
  assert.equal(h.view().private.actions.canAcknowledgeDirection, false);
  h.advance(200000);
  assert.equal(h.assignment().noticeShownAt, null, 'delivery alone does not count as reading');
  h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeShownAt, h.now());
  assert.equal(h.assignment().noticeUnlockAt, h.now() + 30000);
  assert.equal(h.view().private.actions.canShowDirectionNotice, false);
  fails(() => h.notice('acknowledgeDirection'), 'DIRECTION_NOTICE_LOCKED');
  h.advance(29999);
  assert.equal(h.view().private.actions.canAcknowledgeDirection, false);
  fails(() => h.notice('acknowledgeDirection'), 'DIRECTION_NOTICE_LOCKED');
  h.advance(1);
  assert.equal(h.view().private.actions.canAcknowledgeDirection, true);
  h.notice('acknowledgeDirection');
  assert.equal(h.assignment().noticeAcknowledgedAt, h.now());
  assert.equal(h.view().private.actions.canAcknowledgeDirection, false);
});

test('unshown notices cannot be acknowledged even long after delivery', () => {
  const h = fixture();
  h.advance(1000000);
  fails(() => h.notice('acknowledgeDirection'), 'DIRECTION_NOTICE_LOCKED');
  assert.equal(h.assignment().noticeAcknowledgedAt, null);
  assert.equal(h.assignment().noticeShownAt, null);
});

test('refresh and duplicate read/ack actions preserve the first saved times across devices', () => {
  const h = fixture();
  h.notice('showDirectionNotice');
  const shownAt = h.assignment().noticeShownAt, unlockAt = h.assignment().noticeUnlockAt;
  const secondDeviceRoom = copy(h.room);
  h.advance(10000); h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeShownAt, shownAt);
  assert.equal(h.assignment().noticeUnlockAt, unlockAt);
  assert.deepEqual(E.projectState(secondDeviceRoom, h.targetId, h.now()).private.secretDirection,
    h.view().private.secretDirection);
  h.advance(20000); h.notice('acknowledgeDirection');
  const acknowledgedAt = h.assignment().noticeAcknowledgedAt;
  h.advance(5000); h.notice('acknowledgeDirection'); h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeAcknowledgedAt, acknowledgedAt);
  assert.equal(h.assignment().noticeShownAt, shownAt);
  assert.equal(h.assignment().noticeUnlockAt, unlockAt);
  assert.deepEqual(E.projectState(copy(h.room), h.targetId, h.now()).private.secretDirection,
    h.view().private.secretDirection);
});

test('reading and task completion are separate; neither changes wolf progress nor village rewards', () => {
  const h = fixture();
  const tasks = JSON.stringify(h.room.tasks), rewards = JSON.stringify(Object.values(h.room.players).map(p => p.reward));
  h.notice('showDirectionNotice'); h.advance(30000); h.notice('acknowledgeDirection');
  assert.equal(h.assignment().completed, null);
  assert.equal(JSON.stringify(h.room.tasks), tasks); assert.equal(JSON.stringify(Object.values(h.room.players).map(p => p.reward)), rewards);
  h.notice('completeDirection');
  assert.ok(h.assignment().completed);
  assert.equal(JSON.stringify(h.room.tasks), tasks);
  const completionFirst = fixture(8);
  completionFirst.notice('completeDirection');
  assert.ok(completionFirst.assignment().completed);
  assert.equal(completionFirst.assignment().noticeAcknowledgedAt, null);
  assert.equal(completionFirst.view().private.actions.canShowDirectionNotice, true);
});

test('notice reading continues while paused and in meetings without changing game timers', () => {
  const h = fixture();
  h.send('p0', 'pause');
  const pausedTimer = h.room.pausedRemainingMs, clock = JSON.stringify(h.room.talkClock);
  h.notice('showDirectionNotice'); h.advance(30000); h.notice('acknowledgeDirection');
  assert.equal(h.room.paused, true); assert.equal(h.room.pausedRemainingMs, pausedTimer);
  assert.equal(JSON.stringify(h.room.talkClock), clock);
  h.send('p0', 'resume'); h.send('p0', 'endTalk');
  assert.equal(h.room.phase, 'MEETING_TURNS');
  const meeting = fixture(9);
  meeting.send('p0', 'endTalk');
  meeting.notice('showDirectionNotice'); meeting.advance(30000);
  // A temporarily paused meeting remains readable, independent of the turn deadline.
  meeting.send('p0', 'pause');
  const remaining = meeting.room.pausedRemainingMs;
  meeting.notice('acknowledgeDirection');
  assert.equal(meeting.assignment().noticeAcknowledgedAt, meeting.now());
  assert.equal(meeting.room.pausedRemainingMs, remaining);
  assert.equal(meeting.room.phase, 'MEETING_TURNS');
  fails(() => meeting.notice('completeDirection'), 'GAME_PAUSED');
});

test('swap opens a fresh notice; old assignment and another player cannot read or acknowledge it', () => {
  const h = fixture();
  h.notice('showDirectionNotice'); h.advance(30000); h.notice('acknowledgeDirection');
  const oldId = h.assignment().id;
  h.notice('swapDirection');
  assert.notEqual(h.assignment().id, oldId);
  assert.equal(h.assignment().noticeShownAt, null); assert.equal(h.assignment().noticeUnlockAt, null);
  assert.equal(h.assignment().noticeAcknowledgedAt, null);
  for (const action of ['showDirectionNotice', 'acknowledgeDirection']) {
    fails(() => h.send(h.targetId, action, { directionId: oldId }), 'STALE_DIRECTION');
    fails(() => h.send(h.directorId, action, { directionId: h.assignment().id }), 'SECRET_DIRECTION_UNAVAILABLE');
    const outsider = Object.values(h.room.players).find(p => p.role !== 'WOLF' && p.id !== h.targetId);
    fails(() => h.send(outsider.id, action, { directionId: h.assignment().id }), 'SECRET_DIRECTION_UNAVAILABLE');
  }
  h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeUnlockAt, h.now() + 30000);
  fails(() => h.notice('acknowledgeDirection'), 'DIRECTION_NOTICE_LOCKED');
});

test('notice metadata is recipient-private and never goes to Director or finished public recap', () => {
  const h = fixture();
  const directorAbility = JSON.stringify(h.view(h.directorId).private.wolfAbility);
  h.notice('showDirectionNotice'); h.advance(30000); h.notice('acknowledgeDirection');
  const privateNotice = h.view().private.secretDirection;
  assert.equal(privateNotice.noticeAcknowledgedAt, h.now());
  assert.equal(JSON.stringify(h.view(h.directorId).private.wolfAbility), directorAbility);
  for (const p of Object.values(h.room.players)) {
    const v = h.view(p.id);
    assert.equal(JSON.stringify(v.public).includes('noticeShownAt'), false);
    assert.equal(JSON.stringify(v.public).includes('noticeUnlockAt'), false);
    assert.equal(JSON.stringify(v.public).includes('noticeAcknowledgedAt'), false);
    if (p.id !== h.targetId) {
      assert.equal(v.private.secretDirection, null);
      assert.equal(v.private.actions.canShowDirectionNotice, false);
      assert.equal(v.private.actions.canAcknowledgeDirection, false);
    }
  }
  h.send('p0', 'cancelGame');
  assert.equal(h.view().private.secretDirection, null);
  assert.equal(JSON.stringify(h.view().public.reveal.directionRecap).includes('notice'), false);
  for (const action of ['showDirectionNotice', 'acknowledgeDirection']) {
    fails(() => h.send(h.targetId, action, { directionId: privateNotice.id }), 'WRONG_PHASE');
  }
  h.send('p0', 'replay');
  assert.ok(Object.values(h.room.players).every(p => p.secretDirection === null));
});

test('pre-update running directions initialize a notice safely and zero timestamps remain valid', () => {
  const h = fixture();
  for (const key of ['noticeShownAt', 'noticeUnlockAt', 'noticeAcknowledgedAt']) delete h.assignment()[key];
  assert.equal(h.view().private.secretDirection.noticeShownAt, null);
  assert.equal(h.view().private.actions.canShowDirectionNotice, true);
  h.setTime(0); h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeShownAt, 0); assert.equal(h.assignment().noticeUnlockAt, 30000);
  h.setTime(10000); h.notice('showDirectionNotice');
  assert.equal(h.assignment().noticeShownAt, 0);
  h.setTime(30000); h.notice('acknowledgeDirection');
  assert.equal(h.assignment().noticeAcknowledgedAt, 30000);
});
