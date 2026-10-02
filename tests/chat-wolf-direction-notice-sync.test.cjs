'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Client, presentationView } = require('../chat-wolf-sync.js');

const clone = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
const storage = () => {
  const map = new Map();
  return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value) };
};
const etag = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

async function setup(t) {
  const store = new MemoryStore();
  let now = 100000;
  const host = new Client({ store, storage: storage(), clock: () => now,
    interval: 10, hostPresentation: true });
  const legacy = { code: 'ABC234', playerCount: 6,
    tokens: Array.from({ length: 6 }, (_, i) => String(i + 1).repeat(20)),
    names: ['Alex', 'Blair', 'Casey', 'Drew', 'Ellis', 'Flynn'] };
  const made = await host.create({ name: 'Alex', legacy, hostSeat: 0,
    settings: { mode: 'free-chat-v3', playerCount: 6, wolfCount: 2,
      topicId: 'topic_v2_01', enabledProfessions: [], talkSeconds: 60 } });
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
  const hostPlayer = { client: host, token: made.token, id: made.state.private.playerId };
  t.after(() => clients.forEach(client => client.close()));
  const read = player => player.client.read(code, player.token);
  const send = async (player, body) => { await read(player); return player.client.command(code, player.token, body); };
  const advance = async milliseconds => { now += milliseconds; await host.cycle(); };
  const data = async () => JSON.parse((await store.get(host.path(code, host.host.control))).value.data);
  const reconnect = async player => {
    const client = new Client({ store, storage: storage(), clock: () => now, allowHostRecovery: false });
    clients.push(client);
    const copy = { ...player, client };
    await read(copy);
    return copy;
  };
  await send(hostPlayer, { action: 'startGame' });
  await send(hostPlayer, { action: 'beginTalk' });
  const views = await Promise.all(players.map(read));
  const director = players[views.findIndex(view => view.private.wolfProfession === 'director')];
  const recipient = players[views.findIndex(view => view.private.role === 'JESTER')];
  const outsider = players[views.findIndex(view => view.private.role !== 'WOLF' && view.private.playerId !== recipient.id)];
  const direction = (await read(director)).private.wolfAbility.options[0];
  await send(director, { action: 'sendDirection', targetId: recipient.id, directionId: direction.id });
  return { store, host, hostPlayer, players, director, recipient, outsider, code,
    read, send, advance, data, reconnect, now: () => now };
}

const noticeFields = ['noticeShownAt', 'noticeUnlockAt', 'noticeAcknowledgedAt'];
const error = code => value => value.code === code;

test('notice begins on first display, not Director send, and server rejects early acknowledgement', async t => {
  const s = await setup(t);
  const original = (await s.read(s.recipient)).private.secretDirection;
  assert.ok(original);
  for (const field of noticeFields) assert.equal(original[field], null);
  assert.equal((await s.read(s.recipient)).private.actions.canShowDirectionNotice, true);
  await s.advance(60000);
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: original.id }), error('DIRECTION_NOTICE_LOCKED'));
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: original.id,
    noticeShownAt: 1, noticeUnlockAt: 2, noticeAcknowledgedAt: 3 });
  const shown = (await s.read(s.recipient)).private.secretDirection;
  assert.equal(shown.noticeShownAt, s.now());
  assert.equal(shown.noticeUnlockAt, s.now() + 30000);
  assert.equal(shown.noticeAcknowledgedAt, null);
  await s.advance(29999);
  assert.equal((await s.read(s.recipient)).private.actions.canAcknowledgeDirection, false);
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: shown.id,
    noticeUnlockAt: 0 }), error('DIRECTION_NOTICE_LOCKED'));
  await s.advance(1);
  assert.equal((await s.read(s.recipient)).private.actions.canAcknowledgeDirection, true);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId: shown.id });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeAcknowledgedAt, s.now());
  assert.equal((await s.read(s.recipient)).private.secretDirection.completed, null);
  assert.ok((await s.data()).room.tasks.every(task => !task.completed));
});

test('reconnect and another recipient device share one lock; repeated display and acknowledgement do not reset it', async t => {
  const s = await setup(t);
  const directionId = (await s.read(s.recipient)).private.secretDirection.id;
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId });
  const first = (await s.read(s.recipient)).private.secretDirection;
  await s.advance(12000);
  const device = await s.reconnect(s.recipient);
  assert.deepEqual((await s.read(device)).private.secretDirection, first);
  await s.send(device, { action: 'showDirectionNotice', directionId });
  assert.deepEqual((await s.read(device)).private.secretDirection, first);
  await s.advance(18000);
  await s.send(device, { action: 'acknowledgeDirection', directionId });
  const acknowledged = (await s.read(s.recipient)).private.secretDirection;
  assert.equal(acknowledged.noticeAcknowledgedAt, s.now());
  await s.advance(7000);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId });
  await s.send(device, { action: 'showDirectionNotice', directionId });
  assert.deepEqual((await s.read(s.recipient)).private.secretDirection, acknowledged);
  const refreshed = await s.reconnect(s.recipient);
  assert.deepEqual((await s.read(refreshed)).private.secretDirection, acknowledged);
});

test('only recipient receives notice timing; unrelated players cannot acknowledge and host presentation remains empty', async t => {
  const s = await setup(t);
  const directionId = (await s.read(s.recipient)).private.secretDirection.id;
  await assert.rejects(s.send(s.outsider, { action: 'showDirectionNotice', directionId }), error('SECRET_DIRECTION_UNAVAILABLE'));
  await assert.rejects(s.send(s.director, { action: 'acknowledgeDirection', directionId }), error('SECRET_DIRECTION_UNAVAILABLE'));
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId });
  const recipientView = await s.read(s.recipient);
  for (const player of s.players) {
    const view = await s.read(player);
    for (const field of noticeFields) assert.equal(JSON.stringify(view.public).includes(field), false);
    assert.equal(JSON.stringify(view.public).includes(directionId), false);
    if (player.id !== s.recipient.id) {
      assert.equal(view.private.secretDirection, null);
      assert.equal(view.private.actions.canShowDirectionNotice, false);
      assert.equal(view.private.actions.canAcknowledgeDirection, false);
      for (const field of noticeFields) assert.equal(JSON.stringify(view.private).includes(field), false);
    }
  }
  const presentation = presentationView({ public: recipientView.public,
    private: { ...recipientView.private, isHost: true } });
  assert.equal(presentation.private.secretDirection, null);
  assert.equal(presentation.private.actions.canShowDirectionNotice, undefined);
  assert.equal(presentation.private.actions.canAcknowledgeDirection, undefined);
  assert.equal(JSON.stringify(presentation).includes(directionId), false);
  const raw = await s.data();
  for (const field of noticeFields) assert.equal(JSON.stringify(raw.room.directionRecap).includes(field), false);
});

test('acknowledgement can be read and dismissed during pause or meeting without completing a task', async t => {
  const s = await setup(t);
  const directionId = (await s.read(s.recipient)).private.secretDirection.id;
  await s.send(s.hostPlayer, { action: 'pause' });
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId });
  const shownAt = (await s.read(s.recipient)).private.secretDirection.noticeShownAt;
  await s.advance(30000);
  const paused = await s.read(s.recipient);
  assert.equal(paused.public.paused, true);
  assert.equal(paused.private.actions.canAcknowledgeDirection, true);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeAcknowledgedAt, shownAt + 30000);
  await s.send(s.hostPlayer, { action: 'resume' });
  await s.send(s.hostPlayer, { action: 'endTalk' });
  assert.equal((await s.read(s.recipient)).public.phase, 'MEETING_TURNS');
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId });
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId });
  const after = (await s.read(s.recipient)).private.secretDirection;
  assert.equal(after.noticeShownAt, shownAt);
  assert.equal(after.noticeAcknowledgedAt, shownAt + 30000);
  assert.equal(after.completed, null);
  assert.ok((await s.data()).room.tasks.every(task => !task.completed));
});

test('an unread notice first displayed in a paused meeting gets its own full 30 seconds and vanishes on finish', async t => {
  const s = await setup(t);
  const directionId = (await s.read(s.recipient)).private.secretDirection.id;
  await s.send(s.hostPlayer, { action: 'endTalk' });
  await s.send(s.hostPlayer, { action: 'pause' });
  const meeting = await s.read(s.recipient);
  assert.equal(meeting.public.phase, 'MEETING_TURNS');
  assert.equal(meeting.private.secretDirection.noticeShownAt, null);
  assert.equal(meeting.private.actions.canShowDirectionNotice, true);
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId });
  const shown = (await s.read(s.recipient)).private.secretDirection;
  assert.equal(shown.noticeUnlockAt, s.now() + 30000);
  await s.advance(30000);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeAcknowledgedAt, s.now());
  await s.send(s.hostPlayer, { action: 'cancelGame' });
  const finished = await s.read(s.recipient);
  assert.equal(finished.public.phase, 'FINISHED');
  assert.equal(finished.private.secretDirection, null);
  assert.equal(finished.private.actions.canShowDirectionNotice, false);
  assert.equal(finished.private.actions.canAcknowledgeDirection, false);
  await assert.rejects(s.send(s.recipient, { action: 'showDirectionNotice', directionId }));
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId }));
});

test('swapped assignment requires its own new notice; stale acknowledgement cannot dismiss it', async t => {
  const s = await setup(t);
  const oldId = (await s.read(s.recipient)).private.secretDirection.id;
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: oldId });
  await s.advance(30000);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId: oldId });
  await s.send(s.recipient, { action: 'swapDirection', directionId: oldId });
  const replacement = (await s.read(s.recipient)).private.secretDirection;
  assert.notEqual(replacement.id, oldId);
  for (const field of noticeFields) assert.equal(replacement[field], null);
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: oldId }), error('STALE_DIRECTION'));
  await assert.rejects(s.send(s.recipient, { action: 'acknowledgeDirection', directionId: replacement.id }), error('DIRECTION_NOTICE_LOCKED'));
  await s.send(s.recipient, { action: 'showDirectionNotice', directionId: replacement.id });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeUnlockAt, s.now() + 30000);
  assert.equal((await s.read(s.director)).private.wolfAbility.used, true);
  await s.advance(30000);
  await s.send(s.recipient, { action: 'acknowledgeDirection', directionId: replacement.id });
  assert.equal((await s.read(s.recipient)).private.secretDirection.noticeAcknowledgedAt, s.now());
});
