'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Client, presentationView } = require('../chat-wolf-sync.js');

const clone = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
const etag = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
};
class MemoryStore {
  constructor() { this.data = {}; }
  async get(path) {
    const value = clone(path.split('/').reduce((node, key) => node?.[key], this.data));
    return { value, etag: etag(value) };
  }
  async put(path, value, expected) {
    const previous = path.split('/').reduce((node, key) => node?.[key], this.data) ?? null;
    if (expected && etag(previous) !== expected) return { conflict: true };
    const keys = path.split('/');
    let node = this.data;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    node[keys.at(-1)] = clone(value);
    return { value: clone(value) };
  }
}

async function setup(t, settings = {}) {
  const store = new MemoryStore();
  let now = 100000;
  const host = new Client({ store, storage: storage(), clock: () => now,
    interval: 10, hostPresentation: true });
  const legacy = { code: 'ABC234', playerCount: 6,
    tokens: Array.from({ length: 6 }, (_, i) => String(i + 1).repeat(20)),
    names: ['Alex', 'Blair', 'Casey', 'Drew', 'Ellis', 'Flynn'] };
  const made = await host.create({ name: 'Alex', legacy, hostSeat: 0,
    settings: { mode: 'free-chat-v3', playerCount: 6, wolfCount: 2,
      jesterEnabled: true, topicId: 'topic_v2_01', enabledProfessions: [],
      talkSeconds: 60, clueSeconds: 0, ...settings } });
  const code = made.state.public.code;
  await host.connectCards();
  const clients = [host], players = [];
  for (const source of legacy.tokens) {
    const link = (await store.get(`rooms/ABC234/players/${source}`)).value.chatWolf;
    const client = new Client({ store, storage: storage(), clock: () => now, allowHostRecovery: false });
    clients.push(client);
    const view = await client.read(code, link.token);
    players.push({ client, token: link.token, id: view.private.playerId });
  }
  t.after(() => clients.forEach(client => client.close()));
  const hostPlayer = { client: host, token: made.token, id: made.state.private.playerId };
  const read = player => player.client.read(code, player.token);
  const send = async (player, body) => { await read(player); return player.client.command(code, player.token, body); };
  // Small clock steps keep the host lease alive, including automatic TALK timers.
  const advance = async milliseconds => {
    while (milliseconds > 0) { const step = Math.min(milliseconds, 1000); now += step; milliseconds -= step; await host.cycle(); }
  };
  const data = async () => JSON.parse((await store.get(host.path(code, host.host.control))).value.data);
  const reconnect = async player => {
    const client = new Client({ store, storage: storage(), clock: () => now, allowHostRecovery: false });
    clients.push(client);
    const copy = { ...player, client };
    await read(copy);
    return copy;
  };
  await send(hostPlayer, { action: 'startGame' });
  const views = await Promise.all(players.map(read));
  const wolves = players.filter((_, i) => views[i].private.role === 'WOLF');
  const director = players[views.findIndex(view => view.private.wolfProfession === 'director')];
  const recipient = players[views.findIndex(view => view.private.role === 'JESTER')];
  const villager = players[views.findIndex(view => view.private.role === 'VILLAGER')];
  const deliver = async () => {
    const option = (await read(director)).private.wolfAbility.options[0];
    await send(director, { action: 'sendDirection', targetId: recipient.id, directionId: option.id });
    return (await read(recipient)).private.secretDirection;
  };
  return { store, host, hostPlayer, players, wolves, director, recipient, villager, code,
    read, send, advance, data, reconnect, deliver, now: () => now };
}

const error = code => value => value.code === code;
const noticeFields = ['noticeShownAt', 'noticeUnlockAt', 'noticeAcknowledgedAt', 'noticeClosedAt', 'noticeClosedReason'];

test('two original wolf cards volunteer concurrently; cooperation is shared, nonexclusive, and never completion', async t => {
  const s = await setup(t);
  const original = (await s.read(s.wolves[0])).private.tasks;
  assert.ok(original.length > 0);
  assert.ok(original.every(task => task.volunteerIds.length === 0 && task.completed === null));
  const dealt = (await s.data()).room.tasks;
  assert.ok(dealt.filter(task => task.noticeableTell === true).length >= Math.ceil(dealt.length / 2));
  const taskId = original[0].id;
  await Promise.all(s.wolves.map(wolf => s.send(wolf, { action: 'volunteerTask', taskId })));
  const ids = s.wolves.map(wolf => wolf.id).sort();
  const shared = (await s.read(s.wolves[0])).private.tasks;
  assert.deepEqual(shared[0].volunteerIds, ids);
  assert.deepEqual((await s.read(s.wolves[1])).private.tasks, shared);
  assert.ok(shared.every(task => task.completed === null));
  await s.send(s.wolves[0], { action: 'volunteerTask', taskId });
  assert.deepEqual((await s.read(s.wolves[1])).private.tasks[0].volunteerIds, ids);
  await s.send(s.wolves[0], { action: 'withdrawTaskVolunteer', taskId });
  assert.deepEqual((await s.read(s.wolves[1])).private.tasks[0].volunteerIds, [s.wolves[1].id]);
  await s.send(s.wolves[0], { action: 'withdrawTaskVolunteer', taskId });
  assert.deepEqual((await s.read(s.wolves[0])).private.tasks[0].volunteerIds, [s.wolves[1].id]);
  const refreshed = await s.reconnect(s.wolves[1]);
  assert.deepEqual((await s.read(refreshed)).private.tasks, (await s.read(s.wolves[0])).private.tasks);
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  // The volunteer is a communication marker, not ownership. Either teammate
  // can complete a shared task without a contribution score or claim transfer.
  await s.send(s.wolves[0], { action: 'completeTask', taskId });
  const done = (await s.read(s.wolves[1])).private.tasks[0];
  assert.equal(done.completed.by, s.wolves[0].id);
  assert.deepEqual(done.volunteerIds, [s.wolves[1].id]);
});

test('volunteers never enter public or host presentation data and cannot be forged by a non-wolf', async t => {
  const s = await setup(t);
  const taskId = (await s.read(s.wolves[0])).private.tasks[0].id;
  await s.send(s.wolves[0], { action: 'volunteerTask', taskId,
    playerId: s.wolves[1].id, role: 'WOLF', isHost: true, volunteerIds: s.wolves.map(wolf => wolf.id) });
  assert.deepEqual((await s.read(s.wolves[1])).private.tasks[0].volunteerIds, [s.wolves[0].id]);
  for (const action of ['volunteerTask', 'withdrawTaskVolunteer']) {
    await assert.rejects(s.send(s.villager, { action, taskId, playerId: s.wolves[0].id, role: 'WOLF', isHost: true }), error('WOLF_ONLY'));
    await assert.rejects(s.send(s.wolves[0], { action, taskId: 'not-a-current-task' }), error('TASK_NOT_AVAILABLE'));
  }
  for (const player of s.players) {
    const view = await s.read(player);
    assert.equal(JSON.stringify(view.public).includes('volunteerIds'), false);
    if (!s.wolves.some(wolf => wolf.id === player.id)) {
      assert.equal(view.private.tasks, null);
      assert.equal(view.private.actions.canVolunteerTask, false);
      assert.equal(JSON.stringify(view.private).includes('volunteerIds'), false);
    }
  }
  const privateWolf = await s.read(s.wolves[0]);
  const presentation = presentationView({ ...privateWolf, private: { ...privateWolf.private, isHost: true } });
  assert.equal(presentation.private.tasks, null);
  assert.equal(presentation.private.actions.canVolunteerTask, undefined);
  assert.equal(JSON.stringify(presentation).includes('volunteerIds'), false);
  assert.equal((await s.read(s.hostPlayer)).private.tasks, null);
});

test('cooperation respects pause, meetings, freeze, and a fresh deal has no old volunteers', async t => {
  const s = await setup(t, { roundCount: 1 });
  const taskId = (await s.read(s.wolves[0])).private.tasks[0].id;
  await s.send(s.wolves[0], { action: 'volunteerTask', taskId });
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  await s.send(s.hostPlayer, { action: 'pause' });
  assert.equal((await s.read(s.wolves[0])).private.actions.canVolunteerTask, false);
  for (const action of ['volunteerTask', 'withdrawTaskVolunteer']) {
    await assert.rejects(s.send(s.wolves[0], { action, taskId }), error('GAME_PAUSED'));
  }
  await s.send(s.hostPlayer, { action: 'resume' });
  await s.send(s.hostPlayer, { action: 'endTalk' });
  const meeting = await s.read(s.wolves[0]);
  assert.equal(meeting.public.phase, 'MEETING_TURNS');
  assert.equal(meeting.private.actions.canVolunteerTask, false);
  assert.equal((await s.data()).room.tasksFrozen, true);
  for (const action of ['volunteerTask', 'withdrawTaskVolunteer']) {
    await assert.rejects(s.send(s.wolves[0], { action, taskId }), error('WRONG_PHASE'));
  }
  const oldMatch = meeting.public.matchId;
  await s.send(s.hostPlayer, { action: 'cancelGame' });
  await s.send(s.hostPlayer, { action: 'restart', keepTopic: true });
  const newViews = await Promise.all(s.players.map(s.read));
  assert.notEqual(newViews[0].public.matchId, oldMatch);
  for (const view of newViews) if (view.private.tasks) {
    assert.ok(view.private.tasks.every(task => task.volunteerIds.length === 0 && task.completed === null));
    assert.ok(view.private.tasks.every(task => task.id !== taskId));
  }
  const newWolf = s.players[newViews.findIndex(view => view.private.role === 'WOLF')];
  await assert.rejects(s.send(newWolf, { action: 'volunteerTask', taskId }), error('TASK_NOT_AVAILABLE'));
});

test('pending Director instructions stay open after 30 seconds and completion closes without granting wolf progress', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  const tasks = (await s.read(s.director)).private.tasks;
  const original = await s.deliver();
  for (const field of noticeFields) assert.equal(original[field], null);
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: original.id });
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: original.id }), error('DIRECTION_MUST_COMPLETE'));
  await s.advance(30000);
  const refreshed = await s.reconnect(s.recipient);
  const shown = (await s.read(refreshed)).private.secretDirection;
  assert.equal(shown.noticeUnlockAt - shown.noticeShownAt, 30000);
  assert.equal(shown.noticeClosedAt, null);
  assert.equal(shown.noticeAcknowledgedAt, null);
  assert.equal((await s.read(refreshed)).private.actions.canAcknowledgeDirection, false);
  await assert.rejects(s.send(refreshed, { action: 'acknowledgeDirection', directionId: original.id }), error('DIRECTION_MUST_COMPLETE'));
  await s.send(s.hostPlayer, { action: 'pause' });
  await assert.rejects(s.send(refreshed, { action: 'acknowledgeDirection', directionId: original.id }), error('DIRECTION_MUST_COMPLETE'));
  await assert.rejects(s.send(refreshed, { action: 'completeDirection', directionId: original.id }), error('GAME_PAUSED'));
  assert.equal((await s.read(refreshed)).private.secretDirection.noticeClosedAt, null);
  await s.send(s.hostPlayer, { action: 'resume' });
  await s.send(refreshed, { action: 'completeDirection', directionId: original.id });
  const completed = (await s.read(s.recipient)).private.secretDirection;
  assert.equal(completed.noticeClosedAt, s.now());
  assert.equal(completed.noticeClosedReason, 'completed');
  assert.ok(completed.completed);
  assert.deepEqual((await s.read(s.director)).private.tasks, tasks);
  await s.send(s.recipient, { action: 'completeDirection', directionId: original.id });
  assert.deepEqual((await s.read(refreshed)).private.secretDirection, completed);
  for (const player of s.players) {
    const view = await s.read(player);
    for (const field of noticeFields) assert.equal(JSON.stringify(view.public).includes(field), false);
    if (player.id !== s.recipient.id) assert.equal(view.private.secretDirection, null);
  }
});

test('meeting auto-folds an unread pending instruction once, preserving it incomplete across refresh and next TALK', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  const original = await s.deliver();
  const tasks = (await s.read(s.director)).private.tasks;
  assert.equal(original.noticeShownAt, null);
  await s.send(s.hostPlayer, { action: 'endTalk' });
  const meeting = await s.read(s.recipient);
  assert.equal(meeting.public.phase, 'MEETING_TURNS');
  const closed = meeting.private.secretDirection;
  assert.equal(closed.noticeClosedAt, s.now());
  assert.equal(closed.noticeClosedReason, 'meeting');
  assert.equal(closed.completed, null);
  assert.equal(closed.noticeShownAt, null);
  assert.equal(meeting.private.actions.canShowDirectionNotice, false);
  await assert.rejects(s.send(s.recipient, { action: 'completeDirection', directionId: original.id }), error('WRONG_PHASE'));
  const refreshed = await s.reconnect(s.recipient);
  assert.deepEqual((await s.read(refreshed)).private.secretDirection, closed);
  await s.send(s.hostPlayer, { action: 'endMeeting' });
  for (const player of s.players) await s.send(player, { action: 'submitVote', selections: [] });
  const next = await s.read(s.recipient);
  assert.equal(next.public.phase, 'TALK');
  assert.equal(next.public.round, 2);
  assert.deepEqual(next.private.secretDirection, closed);
  assert.equal(next.private.actions.canShowDirectionNotice, false);
  assert.deepEqual((await s.read(s.director)).private.tasks, tasks);
  await s.send(s.hostPlayer, { action: 'endTalk' });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeClosedAt, closed.noticeClosedAt);
  assert.equal((await s.data()).room.directionRecap[0].completed, null);
  for (const field of noticeFields) assert.equal(JSON.stringify((await s.data()).room.directionRecap).includes(field), false);
});

test('swapping a pending instruction starts a fresh popup, rejects old IDs, and can complete before 30 seconds', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  const original = await s.deliver();
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: original.id });
  await s.send(s.recipient, { action: 'swapDirection', directionId: original.id });
  const replacement = (await s.read(s.recipient)).private.secretDirection;
  assert.notEqual(replacement.id, original.id);
  for (const field of noticeFields) assert.equal(replacement[field], null);
  for (const action of ['showDirectionNotice', 'acknowledgeDirection', 'completeDirection']) {
    await assert.rejects(s.send(s.recipient, { action, directionId: original.id }), error('STALE_DIRECTION'));
  }
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: replacement.id });
  await s.send(s.recipient, { action: 'completeDirection', directionId: replacement.id });
  const completed = (await s.read(s.recipient)).private.secretDirection;
  assert.ok(completed.completed.at < completed.noticeUnlockAt);
  assert.equal(completed.noticeClosedReason, 'completed');
  assert.equal(completed.noticeAcknowledgedAt, null);
});

test('WRAP_UP cannot be used to dismiss a pending performance through the old Got it action', async t => {
  const s = await setup(t, { talkEndBehavior: 'automatic', talkSeconds: 30, wrapUpSeconds: 30 });
  await s.send(s.hostPlayer, { action: 'beginTalk' });
  const original = await s.deliver();
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: original.id });
  await s.advance(30000);
  const wrapUp = await s.read(s.recipient);
  assert.equal(wrapUp.public.phase, 'WRAP_UP');
  assert.equal(wrapUp.private.secretDirection.noticeClosedAt, null);
  assert.equal(wrapUp.private.actions.canAcknowledgeDirection, false);
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: original.id }), error('DIRECTION_MUST_COMPLETE'));
  await s.advance(30000);
  const meeting = await s.read(s.recipient);
  assert.equal(meeting.public.phase, 'MEETING_TURNS');
  assert.equal(meeting.private.secretDirection.noticeClosedReason, 'meeting');
  assert.equal(meeting.private.secretDirection.completed, null);
});
