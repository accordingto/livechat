'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const source = fs.readFileSync(path.resolve(__dirname, '../chat-wolf-v3-engine.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const fails = (fn, code) => assert.throws(fn, error => error.code === code, code);

function content() {
  return { version: 'cooperation-fixture', topics: [{ id: 'fixture', category: 'Fixture',
    mainQuestion: 'Which choice?', entryPrompts: [], followUps: [], tags: ['fixture'] }],
    wolfTasks: Array.from({ length: 80 }, (_, i) => ({ id: `w-${i}`, canonicalTaskKey: `key-${i}`,
      variantGroup: `variant-${i}`, mechanicKey: `variant-${i}`, family: `family-${i % 12}`,
      active: true, status: 'active', reviewed: true, type: 'self_action',
      // Synthetic editorial labels: odd cards are ordinary, even cards have a tell.
      noticeableTell: i % 2 === 0, text: `Fixture action ${i}`, compatibleTopicIds: ['fixture'],
      isGeneric: false, requiredOtherPlayerCount: 0, actionTags: [], positiveClues: [] })),
    villageTasks: [], directorDirections: require('../chat-wolf-v6-directions.js').directions,
    exclusionClues: {}, legacyTaskMap: {} };
}
function harness(options = {}, fixtureContent = content()) {
  const context = { module: { exports: {} }, require: name => name.includes('rules') ? RULES : fixtureContent };
  vm.runInNewContext(source, context);
  const E = context.module.exports; let now = 100000;
  const room = E.createRoom({ code: 'V7TEST', hostPlayerId: 'p0', hostSessionHash: 's0', hostName: 'Host',
    settings: { playerCount: 6, wolfCount: 2, enabledProfessions: [], topicId: 'fixture', ...options }, seed: 41, now });
  for (let i = 1; i < 6; i++) E.addPlayer(room, { playerId: `p${i}`, sessionHash: `s${i}`, name: `Player ${i}`, now });
  const send = (actor, action, payload = {}) => E.dispatch(room, actor, action, payload, ++now);
  const host = (action, payload) => send('p0', action, payload);
  return { E, room, content: fixtureContent, send, host, now: () => now, advance: ms => { now += ms; },
    start: () => host('startGame'), view: id => E.projectState(room, id, now) };
}

test('each task count, including odd counts, has at least half explicitly reviewed noticeable tells', () => {
  for (let count = 1; count <= 12; count++) for (let seed = 1; seed <= 30; seed++) {
    const h = harness({ taskCount: count }); h.room.rngState = seed; h.start();
    assert.equal(h.room.tasks.length, count);
    assert.ok(h.room.tasks.filter(task => task.noticeableTell === true).length >= Math.ceil(count / 2));
    assert.equal(new Set(h.room.tasks.map(task => task.variantGroup)).size, count);
    assert.equal(new Set(h.room.tasks.map(task => task.canonicalTaskKey)).size, count);
  }
});

test('draws prefer the minimum noticeable-tell count but permit more when the only valid deals need it', () => {
  for (let count = 1; count <= 12; count++) {
    const h = harness({ taskCount: count }); h.start();
    assert.equal(h.room.tasks.filter(task => task.noticeableTell === true).length, Math.ceil(count / 2));
  }
  const allTell = content();
  allTell.wolfTasks.forEach(task => { task.noticeableTell = true; });
  const h = harness({ taskCount: 12 }, allTell); h.start();
  assert.equal(h.room.tasks.filter(task => task.noticeableTell === true).length, 12,
    'preferred balance is not a new hard cap or an excuse to report exhaustion');
  const ordinaryBlocked = harness({ taskCount: 3 });
  ordinaryBlocked.start();
  ordinaryBlocked.room.exposureHistory.wolfTasks = ordinaryBlocked.content.wolfTasks.filter(task => !task.noticeableTell).map(task =>
    ({ canonicalTaskKey: task.canonicalTaskKey, variantGroup: task.variantGroup, family: task.family, sequence: 1 }));
  ordinaryBlocked.room.exposureHistory.deals = [];
  ordinaryBlocked.host('restart', { keepTopic: true });
  assert.equal(ordinaryBlocked.room.tasks.filter(task => task.noticeableTell === true).length, 3,
    'strict history may require a tell-only deal without silently recycling an ordinary task');
  assert.equal(ordinaryBlocked.room.contentRepeatException, false);
});

test('tell quota cannot silently relax voice/generic caps or strict history even with repeat consent', () => {
  const fixture = content();
  fixture.wolfTasks.forEach(task => { task.noticeableTell = task.id === 'w-0' || task.id === 'w-2'; });
  const h = harness({ taskCount: 3 }, fixture); h.start();
  assert.equal(h.room.tasks.filter(task => task.noticeableTell).length, 2);
  fails(() => h.host('restart', { keepTopic: true }), 'CONTENT_EXHAUSTED');
  h.host('restart', { keepTopic: true, allowRecentRepeat: true });
  assert.equal(h.room.tasks.filter(task => task.noticeableTell).length, 2);
  assert.equal(h.room.contentRepeatException, true);
  for (const property of ['isGeneric', 'performanceGroup']) {
    const insufficient = content();
    insufficient.wolfTasks.forEach(task => {
      task.noticeableTell = task.id === 'w-0' || task.id === 'w-2';
      if (task.noticeableTell) task[property] = property === 'isGeneric' ? true : 'voice';
    });
    const broken = harness({ taskCount: 3 }, insufficient);
    fails(() => broken.start(), 'CONTENT_EXHAUSTED');
    fails(() => broken.host('startGame', { allowRecentRepeat: true }), 'CONTENT_EXHAUSTED');
    assert.equal(broken.room.phase, 'LOBBY');
    assert.equal(broken.room.matchId, null);
  }
});

test('noticeable quota preserves exact interaction/self counts and does not treat truthy strings as reviewed tells', () => {
  const fixture = content();
  fixture.wolfTasks.forEach((task, index) => {
    task.type = index < 40 ? 'interaction' : 'self_action';
    task.requiredOtherPlayerCount = index < 40 ? 1 : 0;
  });
  for (let count = 2; count <= 12; count++) for (let interactions = 1; interactions < count; interactions++) {
    const h = harness({ taskCount: count, interactionTaskCount: interactions }, fixture);
    h.room.topic = clone(fixture.topics[0]);
    const deal = h.E.selectWolfTasks(h.room, fixture.wolfTasks).tasks;
    assert.equal(deal.filter(task => task.type === 'interaction').length, interactions);
    assert.equal(deal.filter(task => task.type === 'self_action').length, count - interactions);
    assert.ok(deal.filter(task => task.noticeableTell === true).length >= Math.ceil(count / 2));
  }
  const mislabeled = content();
  mislabeled.wolfTasks.forEach(task => { task.noticeableTell = 'true'; });
  fails(() => harness({ taskCount: 3 }, mislabeled).start(), 'CONTENT_EXHAUSTED');
});

test('two wolves independently volunteer, withdraw only themselves, and either may finish any shared card', () => {
  const h = harness(); h.start();
  const wolves = Object.values(h.room.players).filter(player => player.role === 'WOLF').map(player => player.id);
  const task = h.room.tasks[0], id = task.id;
  h.send(wolves[0], 'volunteerTask', { taskId: id }); h.send(wolves[0], 'volunteerTask', { taskId: id });
  h.send(wolves[1], 'volunteerTask', { taskId: id });
  assert.deepEqual(clone(h.room.tasks[0].volunteerIds), wolves.slice().sort());
  assert.equal(h.room.tasks[0].completed, null);
  for (const wolf of wolves) assert.deepEqual(clone(h.view(wolf).private.tasks[0].volunteerIds), wolves.slice().sort());
  h.send(wolves[0], 'withdrawTaskVolunteer', { taskId: id });
  h.send(wolves[0], 'withdrawTaskVolunteer', { taskId: id });
  assert.deepEqual(clone(h.room.tasks[0].volunteerIds), [wolves[1]]);
  h.host('beginTalk'); h.send(wolves[0], 'completeTask', { taskId: id });
  assert.equal(h.room.tasks[0].completed.by, wolves[0]);
  assert.deepEqual(clone(h.room.tasks[0].volunteerIds), [wolves[1]], 'completion does not reassign ownership');
});

test('volunteer controls are wolf-only, authoritative, phase-bound and excluded from public reveal', () => {
  const h = harness(); h.start();
  const wolf = Object.values(h.room.players).find(player => player.role === 'WOLF').id;
  const nonWolf = Object.values(h.room.players).find(player => player.role !== 'WOLF').id;
  const taskId = h.room.tasks[0].id;
  assert.equal(h.view(wolf).private.actions.canVolunteerTask, true);
  assert.equal(h.view(nonWolf).private.actions.canVolunteerTask, false);
  fails(() => h.send(nonWolf, 'volunteerTask', { taskId, role: 'WOLF', playerId: wolf }), 'WOLF_ONLY');
  fails(() => h.send(wolf, 'volunteerTask', { taskId: 'fake' }), 'TASK_NOT_AVAILABLE');
  fails(() => h.send('outsider', 'volunteerTask', { taskId }), 'NOT_A_MEMBER');
  h.host('beginTalk'); h.host('pause');
  assert.equal(h.view(wolf).private.actions.canVolunteerTask, false);
  fails(() => h.send(wolf, 'volunteerTask', { taskId }), 'GAME_PAUSED');
  h.host('resume'); h.send(wolf, 'volunteerTask', { taskId });
  for (const player of Object.values(h.room.players)) {
    const view = h.view(player.id);
    assert.equal(JSON.stringify(view.public).includes('volunteerIds'), false);
    if (player.role !== 'WOLF') assert.equal(view.private.tasks, null);
  }
  h.host('endTalk');
  assert.equal(h.view(wolf).private.actions.canVolunteerTask, false);
  fails(() => h.send(wolf, 'withdrawTaskVolunteer', { taskId }), 'WRONG_PHASE');
  h.host('cancelGame');
  assert.equal(JSON.stringify(h.view(wolf).public.reveal).includes('volunteerIds'), false);
  assert.equal(JSON.stringify(h.view(wolf).private.tasks).includes('volunteerIds'), false);
  h.host('restart', { keepTopic: true });
  assert.ok(h.room.tasks.every(task => task.volunteerIds.length === 0 && task.completed === null));
});

test('old shared cards acquire coordination without changing their dealt instruction or history', () => {
  const h = harness(); h.start();
  const wolf = Object.values(h.room.players).find(player => player.role === 'WOLF').id;
  const original = clone(h.room.tasks[0]); delete h.room.tasks[0].volunteerIds;
  const history = JSON.stringify(h.room.exposureHistory);
  assert.deepEqual(clone(h.view(wolf).private.tasks[0].volunteerIds), []);
  h.send(wolf, 'volunteerTask', { taskId: original.id });
  assert.equal(h.room.tasks[0].text, original.text);
  assert.equal(h.room.tasks[0].id, original.id);
  assert.equal(JSON.stringify(h.room.exposureHistory), history);
});

test('Director pending reminder closes once at meeting, stays closed next chat, and legacy Got it is not completion', () => {
  const h = harness(); h.start(); h.host('beginTalk');
  const director = Object.values(h.room.players).find(player => player.wolfProfession === 'director');
  const target = Object.values(h.room.players).find(player => player.role === 'JESTER');
  h.send(director.id, 'sendDirection', { targetId: target.id, directionId: director.wolfAbility.options[0].id });
  const directionId = h.room.players[target.id].secretDirection.id;
  h.send(target.id, 'showDirectionNotice', { directionId }); h.advance(31000);
  fails(() => h.send(target.id, 'acknowledgeDirection', { directionId }), 'DIRECTION_MUST_COMPLETE');
  const before = clone(h.room.tasks);
  h.room.players[target.id].secretDirection.noticeAcknowledgedAt = h.now() - 1;
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, null, 'legacy acknowledgment is not a dismissal');
  h.host('endTalk');
  const closedAt = h.room.players[target.id].secretDirection.noticeClosedAt;
  assert.equal(closedAt, h.now());
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedReason, 'meeting');
  assert.equal(h.view(target.id).private.secretDirection.completed, null);
  assert.equal(h.view(target.id).private.actions.canShowDirectionNotice, false);
  h.host('endMeeting');
  for (const player of Object.keys(h.room.players)) h.send(player, 'submitVote', { selections: [] });
  assert.equal(h.room.phase, 'TALK');
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, closedAt);
  assert.deepEqual(clone(h.room.tasks), before);
  h.send(target.id, 'swapDirection', { directionId });
  const replacement = h.view(target.id).private.secretDirection;
  assert.notEqual(replacement.id, directionId);
  assert.equal(replacement.noticeClosedAt, null); assert.equal(replacement.noticeClosedReason, null);
  h.send(target.id, 'completeDirection', { directionId: replacement.id });
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedReason, 'completed');
  assert.equal(h.view(target.id).private.secretDirection.noticeShownAt, null, 'completion needs no new receipt restriction');
});

test('automatic wrap-up keeps pending reminder; final clues fold it without completing it', () => {
  for (const final of [false, true]) {
    const h = harness({ talkEndBehavior: 'automatic', talkSeconds: 30, wrapUpSeconds: 30, roundCount: final ? 1 : 3 });
    h.start(); h.host('beginTalk');
    const director = Object.values(h.room.players).find(player => player.wolfProfession === 'director');
    const target = Object.values(h.room.players).find(player => player.role === 'JESTER');
    h.send(director.id, 'sendDirection', { targetId: target.id, directionId: director.wolfAbility.options[0].id });
    const directionId = h.room.players[target.id].secretDirection.id;
    h.advance(30000); h.E.advanceExpired(h.room, h.now());
    assert.equal(h.room.phase, 'WRAP_UP');
    assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, null);
    fails(() => h.send(target.id, 'acknowledgeDirection', { directionId }), 'DIRECTION_MUST_COMPLETE');
    h.advance(30000); h.E.advanceExpired(h.room, h.now());
    assert.equal(h.room.phase, final ? 'FINAL_CLUES' : 'MEETING_TURNS');
    assert.equal(h.view(target.id).private.secretDirection.noticeClosedReason, 'meeting');
    assert.equal(h.view(target.id).private.secretDirection.completed, null);
    const closedAt = h.view(target.id).private.secretDirection.noticeClosedAt;
    h.send(target.id, 'showDirectionNotice', { directionId });
    assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, closedAt);
    assert.equal(h.view(target.id).private.actions.canShowDirectionNotice, false);
  }
});

test('missing legacy closure fields infer a real prior meeting but not an old acknowledgment or cross-round swap', () => {
  const h = harness(); h.start(); h.host('beginTalk');
  const director = Object.values(h.room.players).find(player => player.wolfProfession === 'director');
  const target = Object.values(h.room.players).find(player => player.role === 'JESTER');
  h.send(director.id, 'sendDirection', { targetId: target.id, directionId: director.wolfAbility.options[0].id });
  const originalId = h.room.players[target.id].secretDirection.id;
  h.room.players[target.id].secretDirection.noticeAcknowledgedAt = h.now();
  for (const key of ['noticeClosedAt', 'noticeClosedReason', 'assignedRound']) delete h.room.players[target.id].secretDirection[key];
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, null);
  h.host('endTalk'); h.host('endMeeting');
  for (const player of Object.keys(h.room.players)) h.send(player, 'submitVote', { selections: [] });
  for (const key of ['noticeClosedAt', 'noticeClosedReason']) delete h.room.players[target.id].secretDirection[key];
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedReason, 'meeting');
  h.send(target.id, 'swapDirection', { directionId: originalId });
  for (const key of ['noticeClosedAt', 'noticeClosedReason', 'assignedRound']) delete h.room.players[target.id].secretDirection[key];
  assert.equal(h.view(target.id).private.secretDirection.noticeClosedAt, null, 'past meeting preceded the swapped instruction');
  assert.equal(h.view(target.id).private.actions.canShowDirectionNotice, true);
});
