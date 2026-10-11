'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const copy = value => JSON.parse(JSON.stringify(value));
const topic = { title: 'Our silly cafe', question: 'What should we serve together?' };
const roster = [1, 2, 3].map(playerNum => ({ playerNum, name: ['Alice', 'Bo', 'Chloe'][playerNum - 1] }));
const create = (extra = {}) => E.create({ id: 'journal-session', now: 1000, topic, roster,
  sharedControls: true, gameMode: 'crazy', crazySource: 'players', conversationMode: 'free',
  gameSeconds: 60, crazyTaskSeconds: 30, crazyMinSeconds: 5, crazyMaxSeconds: 5, ...extra });
let sequence = 0;
const action = (s, type, actor = 0, extra = {}) => ({ id: 'archive-action-' + ++sequence, type, actor,
  sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: 73, ...extra });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, action(s, type, actor, extra));
const submit = (s, extra = {}) => act(s, 'crazyAssign', 1, { target: 2, text: '  Sing like a chicken.  ', now: 1500, ...extra });
const records = s => s.challengeArchive.records;
const deliver = s => { s = act(s, 'start'); return act(s, 'clockTick', 0, { now: s.crazy.nextAssignAt }); };
const newTopic = { confirm: true, topic: { title: 'Next cafe', question: 'What silly name can we choose?' },
  mode: 'think', seconds: 45, gameMode: 'normal', showStarters: false };

test('accepted handwriting creates a private versioned record with exact author, chosen target and topic', () => {
  const initial = create(), s = submit(initial), item = s.crazy.queue[0];
  assert.deepEqual(initial.challengeArchive, { version: 1, records: [] });
  assert.equal(records(s).length, 1);
  assert.deepEqual(records(s)[0], { id: s.sessionId + ':author:1:' + item.id, version: 1, persistedVersion: 0,
    sessionId: s.sessionId, kind: 'task', text: 'Sing like a chicken.', author: { playerNum: 1, name: 'Alice' },
    target: { playerNum: 2, name: 'Bo' }, topic, status: 'queued', createdAt: 1500, updatedAt: 1500 });
  assert.equal(item.archiveId, records(s)[0].id);
  const random = submit(create(), { target: null, kind: 'line', text: 'My cup sings.' });
  assert.equal(records(random)[0].target, null); assert.equal(records(random)[0].kind, 'line');
  const exported = E.archiveEntries(s); exported[0].text = 'Changed outside the engine.';
  assert.equal(records(s)[0].text, 'Sing like a chicken.');
});

test('invalid, unauthorized, replayed and queue-full submissions never create journal entries', () => {
  for (const extra of [{ target: 1 }, { target: 9 }, { text: '' }, { text: 'x'.repeat(121) }, { kind: 'bad' }, { turnId: -1 }]) {
    const s = submit(create(), extra); assert.equal(records(s).length, 0); assert.ok(s.replies[1].error);
  }
  const host = act(create(), 'crazyAssign', 0, { text: 'Host writing.' }); assert.equal(records(host).length, 0);
  const system = submit(create({ crazySource: 'system' })); assert.equal(records(system).length, 0);
  const original = create(), command = action(original, 'crazyAssign', 1, { target: 2, text: 'Once.', now: 1500 });
  const accepted = E.apply(original, command); assert.equal(E.apply(accepted, command), accepted); assert.equal(records(accepted).length, 1);
  let full = create(); for (let i = 0; i < 10; i++) full = submit(full, { text: 'Queued ' + i });
  const rejected = submit(full, { text: 'Rejected extra.' }); assert.equal(rejected.replies[1].error, 'queue_full');
  assert.equal(records(rejected).length, 10); assert.ok(records(rejected).every(record => record.text !== 'Rejected extra.'));
});

test('the same command ID from different authenticated authors keeps separate handwriting and lifecycle records', () => {
  let s = create();
  s = act(s, 'crazyAssign', 1, { id: 'shared-command', target: 2, text: 'First author song.', now: 1500 });
  s = act(s, 'crazyAssign', 3, { id: 'shared-command', target: 2, text: 'Second author chicken.', now: 1600 });
  assert.equal(s.replies[1].error, ''); assert.equal(s.replies[3].error, '');
  assert.equal(records(s).length, 2); assert.notEqual(records(s)[0].id, records(s)[1].id);
  const [firstId, secondId] = records(s).map(record => record.id);
  assert.equal(firstId, s.sessionId + ':author:1:shared-command');
  assert.equal(secondId, s.sessionId + ':author:3:shared-command');
  s = deliver(s); assert.equal(s.crazy.prompts[2].archiveId, firstId);
  s = act(s, 'crazyDone', 2, { promptId: s.crazy.prompts[2].id, now: 8000 });
  s = act(s, 'clockTick', 0, { now: s.crazy.nextAssignAt });
  assert.equal(s.crazy.prompts[2].archiveId, secondId); assert.equal(s.crazy.prompts[2].text, 'Second author chicken.');
  s = act(s, 'crazySkip', 2, { promptId: s.crazy.prompts[2].id, now: 13000 });
  assert.deepEqual(records(s).map(record => [record.text, record.status, record.version]),
    [['First author song.', 'done', 3], ['Second author chicken.', 'skipped', 3]]);
  assert.equal(s.scores[2], 1);
  s = E.ackArchive(s, [{ id: firstId, version: 3 }]);
  assert.equal(records(s).length, 1); assert.equal(records(s)[0].id, secondId);
});

test('delivery and completion update the same record and private link while normal score/idempotency stay intact', () => {
  const queued = submit(create()), archiveId = records(queued)[0].id;
  let s = deliver(queued), prompt = s.crazy.prompts[2];
  assert.equal(prompt.archiveId, archiveId); assert.equal(records(s).length, 1);
  assert.equal(records(s)[0].version, 2); assert.equal(records(s)[0].status, 'pending');
  assert.deepEqual(records(s)[0].recipient, { playerNum: 2, name: 'Bo' });
  assert.equal(records(s)[0].assignedAt, 7000); assert.equal(records(s)[0].createdAt, 1500); assert.equal(records(s)[0].updatedAt, 7000);
  const command = action(s, 'crazyDone', 2, { promptId: prompt.id, now: 8000 });
  const nextAssignAt = s.crazy.nextAssignAt; s = E.apply(s, command);
  assert.equal(records(s)[0].version, 3); assert.equal(records(s)[0].status, 'done'); assert.equal(records(s)[0].closedAt, 8000);
  assert.equal(s.scores[2], 1); assert.equal(s.crazy.nextAssignAt, nextAssignAt);
  assert.equal(E.apply(s, command), s); assert.equal(records(s)[0].version, 3);
  assert.equal(records(queued)[0].status, 'queued', 'past immutable state does not acquire later outcomes');
});

test('skip closes handwriting without scoring and links a queued immediate replacement to its own record', () => {
  let s = submit(create());
  s = act(s, 'crazyAssign', 3, { target: 1, text: 'Say meow.', now: 1600 });
  s = deliver(s); const first = s.crazy.prompts[2];
  s = act(s, 'crazySkip', 2, { promptId: first.id, now: 8000 });
  assert.equal(records(s)[0].status, 'skipped'); assert.equal(records(s)[0].version, 3); assert.equal(records(s)[0].closedAt, 8000);
  assert.equal(records(s)[1].status, 'pending'); assert.equal(records(s)[1].version, 2);
  assert.equal(s.crazy.prompts[1].archiveId, records(s)[1].id); assert.equal(records(s)[1].assignedAt, 8000);
  assert.deepEqual(s.scores, { 1: 0, 2: 0, 3: 0 });
});

test('task expiry is archived before a late completion and retains the original writing time', () => {
  let s = deliver(submit(create())); const promptId = s.crazy.prompts[2].id;
  s = act(s, 'crazyDone', 2, { promptId, now: 37000 });
  const record = records(s)[0]; assert.equal(record.status, 'expired'); assert.equal(record.version, 3);
  assert.equal(record.createdAt, 1500); assert.equal(record.closedAt, 37000); assert.equal(record.updatedAt, 37000);
  assert.equal(s.replies[2].error, 'stale_prompt'); assert.equal(s.scores[2], 0);
});

for (const closure of ['finish', 'deadline', 'newTopic']) test(closure + ' retains queued and delivered handwriting as cancelled records', () => {
  let s = submit(create()); s = submit(s, { text: 'A waiting song.', now: 1600 }); s = deliver(s);
  const oldSession = s.sessionId, submitted = records(s).map(record => record.id);
  s = closure === 'finish' ? act(s, 'finish', 2, { now: 8000 }) : closure === 'deadline'
    ? act(s, 'clockTick', 0, { now: s.gameDeadline }) : act(s, 'newTopic', 2, { ...newTopic, now: 8000 });
  assert.deepEqual(records(s).map(record => record.id), submitted);
  assert.ok(records(s).every(record => record.status === 'cancelled' && record.closedAt === (closure === 'deadline' ? 62000 : 8000)));
  assert.deepEqual(records(s).map(record => record.version), [3, 2]);
  assert.ok(records(s).every(record => record.sessionId === oldSession));
  if (closure === 'newTopic') { assert.notEqual(s.sessionId, oldSession); assert.equal(s.crazy, undefined); }
  else { assert.equal(s.phase, 'ended'); assert.equal(s.crazy.queue.length, 0); }
  assert.equal(E.archiveEntries(s).length, 2);
});

test('speaker handover preserves live handwriting and invalid topic replacement cannot cancel it', () => {
  let s = deliver(submit(create({ conversationMode: 'assigned' })));
  const pending = copy(records(s)), promptId = s.crazy.prompts[2].id;
  s = act(s, 'end', 1, { now: 8000 });
  assert.equal(s.speaker, 2); assert.equal(s.crazy.prompts[2].id, promptId); assert.deepEqual(records(s), pending);
  s = act(s, 'newTopic', 1, { ...newTopic, topic: { question: '' }, now: 8001 });
  assert.equal(s.replies[1].error, 'invalid_topic'); assert.deepEqual(records(s), pending);
  assert.equal(s.crazy.prompts[2].status, 'pending');
});

test('fresh create carries the prior-session journal and cancels its unresolved records without mutating it', () => {
  const old = submit(create()), prior = copy(old.challengeArchive);
  const next = create({ id: 'replacement-session', now: 3000, challengeArchive: old.challengeArchive });
  assert.deepEqual(old.challengeArchive, prior); assert.equal(records(next)[0].status, 'cancelled');
  assert.equal(records(next)[0].version, 2); assert.equal(records(next)[0].closedAt, 3000);
  assert.equal(records(next)[0].sessionId, old.sessionId); assert.equal(next.crazy.queue.length, 0);
});

test('stale ACKs retain newer updates, ongoing records stay linked and exact terminal ACKs prune only their own record', () => {
  const queued = submit(create()), id = records(queued)[0].id;
  let s = E.ackArchive(queued, [{ id, version: 1 }]);
  assert.notEqual(s, queued); assert.equal(records(queued)[0].persistedVersion, 0);
  assert.equal(records(s).length, 1); assert.equal(records(s)[0].persistedVersion, 1); assert.deepEqual(E.archiveEntries(s), []);
  s = deliver(s); s = E.ackArchive(s, [{ id, version: 1 }]);
  assert.equal(records(s)[0].version, 2); assert.equal(records(s)[0].persistedVersion, 1); assert.equal(E.archiveEntries(s).length, 1);
  s = act(s, 'crazyDone', 2, { promptId: s.crazy.prompts[2].id, now: 8000 });
  s = E.ackArchive(s, [{ id, version: 2 }, { id, version: 999 }, { id: 'other', version: 3 }]);
  assert.equal(records(s).length, 1); assert.equal(records(s)[0].version, 3); assert.equal(records(s)[0].persistedVersion, 2);
  assert.equal(E.archiveEntries(s)[0].status, 'done');
  s = E.ackArchive(s, [{ id, version: 3 }]); assert.equal(records(s).length, 0); assert.deepEqual(E.archiveEntries(s), []);
  const wire = copy(s); delete wire.challengeArchive.records;
  assert.equal(E.apply(wire, action(wire, 'clockTick', 0, { now: 8001 })), wire, 'empty Firebase journal never keeps an idle timer alive');
});

test('legacy active writing backfills once with known timestamps, and never invents writing time for delivered prompts', () => {
  const s = act(create(), 'start'); delete s.challengeArchive;
  s.crazy.queue = [{ id: 'old-write', assignedBy: 1, target: 3, text: 'Known old queue.', kind: 'line', at: 1500 },
    { id: 'no-clock', assignedBy: 1, target: 3, text: 'Unknown queue time.', kind: 'task' }];
  s.crazy.prompts[2] = { id: 'old-prompt', source: 'player', assignedBy: 1, text: 'Known delivery time.', kind: 'task', at: 2500, expiresAt: 50000, status: 'pending' };
  let next = act(s, 'clockTick', 0, { now: 3000 });
  assert.equal(records(next).length, 3);
  const queued = records(next).find(record => record.id.endsWith(':old-write'));
  assert.equal(queued.createdAt, 1500); assert.equal(queued.updatedAt, 1500); assert.equal(queued.legacy, true);
  const timeless = records(next).find(record => record.id.endsWith(':no-clock'));
  for (const field of ['createdAt', 'updatedAt', 'assignedAt']) assert.equal(Object.hasOwn(timeless, field), false);
  const pending = records(next).find(record => record.status === 'pending');
  assert.equal(pending.id, s.sessionId + ':legacy:old-prompt'); assert.equal(pending.assignedAt, 2500);
  assert.equal(Object.hasOwn(pending, 'createdAt'), false); assert.equal(Object.hasOwn(pending, 'target'), false);
  assert.equal(next.crazy.prompts[2].archiveId, pending.id);
  next = act(next, 'finish', 2, { now: 4000 });
  next = E.ackArchive(next, records(next).map(record => ({ id: record.id, version: record.version })));
  assert.equal(records(next).length, 0);
  assert.equal(E.apply(next, action(next, 'clockTick', 0, { now: 4001 })), next);
});

test('legacy pending prompts without a timestamp omit historical times; system prompts are never captured', () => {
  let s = act(create(), 'start'); delete s.challengeArchive;
  s.crazy.prompts[2] = { id: 'no-date', source: 'player', assignedBy: 1, text: 'Unknown delivery.', kind: 'task', expiresAt: 50000, status: 'pending' };
  s.crazy.prompts[3] = { id: 'system', source: 'system', text: 'System text.', kind: 'task', at: 2500, expiresAt: 50000, status: 'pending' };
  s = act(s, 'clockTick', 0, { now: 3000 }); assert.equal(records(s).length, 1);
  for (const field of ['createdAt', 'updatedAt', 'assignedAt']) assert.equal(Object.hasOwn(records(s)[0], field), false);
  assert.equal(s.crazy.prompts[3].archiveId, undefined);
});

test('archive metadata/history are absent from every view while the recipient still receives live private text', () => {
  let s = submit(create()), id = records(s)[0].id;
  for (const num of [0, 1, 2, 3, 99]) {
    const view = E.view(s, num, 2000), serialized = JSON.stringify(view);
    assert.equal(serialized.includes('Sing like a chicken.'), false);
    assert.equal(serialized.includes(id), false); assert.equal(serialized.includes('challengeArchive'), false);
  }
  s = deliver(s);
  for (const num of [0, 1, 2, 3, 99]) {
    const serialized = JSON.stringify(E.view(s, num, 7000));
    assert.equal(serialized.includes('Sing like a chicken.'), num === 2);
    for (const marker of ['challengeArchive', 'archiveId', 'persistedVersion', id]) assert.equal(serialized.includes(marker), false);
  }
  s = act(s, 'newTopic', 1, { ...newTopic, now: 8000 });
  for (const num of [0, 1, 2, 3, 99]) assert.equal(JSON.stringify(E.view(s, num, 8000)).includes('Sing like a chicken.'), false);
});


test('more than ten new topics retain history and accept long session/submission archive identities', () => {
  let s = submit(create(), { id: 'first-history' });
  const firstId = records(s)[0].id;
  let firstClosed;
  for (let index = 0; index < 12; index++) {
    const id = 'topic-' + String(index).padStart(2, '0') + '-' + 'x'.repeat(91);
    assert.equal(id.length, 100);
    s = act(s, 'newTopic', 1, { ...newTopic, id, gameMode: 'crazy', crazySource: 'players', now: 3000 + index });
    assert.equal(s.replies[1].error, '');
    assert.equal(records(s).length, 1); assert.equal(records(s)[0].id, firstId);
    if (index === 0) firstClosed = copy(records(s)[0]);
    else assert.deepEqual(records(s)[0], firstClosed, 'later topics do not rewrite an earlier terminal outcome');
  }
  assert.ok(s.sessionId.length > 1200, 'the engine allows nested topic session IDs beyond earlier short storage limits');
  const sessionId = s.sessionId, submissionId = 'n'.repeat(100);
  s = submit(s, { id: submissionId, text: 'A song after many topics.', now: 4000 });
  assert.equal(s.replies[1].error, ''); assert.equal(records(s).length, 2);
  const long = records(s)[1];
  assert.equal(long.sessionId, sessionId); assert.equal(long.id, sessionId + ':author:1:' + submissionId);
  assert.ok(long.id.length > 1300); assert.equal(long.status, 'queued');
  assert.equal(s.crazy.queue[0].archiveId, long.id);
  assert.equal(E.archiveEntries(s).length, 2);
  for (const num of [0, 1, 2, 3]) {
    const serialized = JSON.stringify(E.view(s, num, 4000));
    assert.equal(serialized.includes(long.id), false); assert.equal(serialized.includes(long.text), false);
    assert.equal(serialized.includes('challengeArchive'), false);
  }
});


function membershipArchiveFixture() {
  let s = create();
  for (const [actor, target, text, now] of [
    [1, 2, 'Delivered to leaving', 1500], [2, 3, 'Delivered by leaving', 1600],
    [1, 3, 'Kept queue', 1700], [3, 2, 'Queue targeted leaving', 1800], [2, 1, 'Queue authored leaving', 1900],
  ]) s = act(s, 'crazyAssign', actor, { target, text, now });
  s = act(s, 'start', 0, { now: 2000 });
  s = act(s, 'clockTick', 0, { now: 7000 });
  return act(s, 'clockTick', 0, { now: 12000 });
}

test('membership departure closes affected private archive records while a newcomer preserves unrelated live work', () => {
  const s = membershipArchiveFixture(), before = copy(s);
  const next = E.membership(s, { added: [{ playerNum: 4, name: 'New friend' }], roster: [], inactiveNums: [2] },
    { now: 13000, seed: 73 });
  assert.deepEqual(s, before); assert.equal(next.sessionId, s.sessionId); assert.equal(next.gameDeadline, s.gameDeadline);
  assert.deepEqual(next.scores, { ...s.scores, 4: 0 }); assert.equal(next.roster[1].active, false);
  const byText = Object.fromEntries(records(next).map(record => [record.text, record]));
  for (const text of ['Delivered to leaving', 'Queue targeted leaving', 'Queue authored leaving']) {
    assert.equal(byText[text].status, 'cancelled'); assert.equal(byText[text].closedAt, 13000);
    assert.equal(byText[text].version, text === 'Delivered to leaving' ? 3 : 2);
  }
  assert.equal(byText['Delivered by leaving'].status, 'pending');
  assert.equal(byText['Kept queue'].status, 'queued');
  assert.deepEqual(next.crazy.queue.map(item => item.text), ['Kept queue']);
  assert.equal(next.crazy.prompts[2].status, 'cancelled');
  assert.deepEqual(next.crazy.prompts[3], s.crazy.prompts[3], 'an already-delivered task remains usable by its active recipient');
  assert.equal(E.archiveEntries(next).length, 5);
  const returned = E.membership(next, { added: [], roster: [], inactiveNums: [] }, { now: 14000, seed: 73 });
  assert.deepEqual(records(returned), records(next), 'returning does not reopen cancelled archive records');
  assert.equal(returned.crazy.prompts[2].status, 'cancelled');
  for (const num of [0, 1, 2, 3, 4]) {
    const serialized = JSON.stringify(E.view(next, num, 13000));
    for (const marker of ['challengeArchive', 'archiveId', 'Delivered to leaving', 'Queue targeted leaving', 'Queue authored leaving', 'Kept queue']) {
      assert.equal(serialized.includes(marker), false);
    }
    assert.equal(serialized.includes('Delivered by leaving'), num === 3);
  }
  const acknowledged = E.ackArchive(next, records(next).filter(record => record.status === 'cancelled')
    .map(record => ({ id: record.id, version: record.version })));
  assert.deepEqual(records(acknowledged).map(record => record.text), ['Delivered by leaving', 'Kept queue']);
  assert.equal(acknowledged.crazy.prompts[3].archiveId, byText['Delivered by leaving'].id);
});

test('membership backfills legacy handwriting before departure cancellation without resetting its game clock', () => {
  const legacy = membershipArchiveFixture(); delete legacy.challengeArchive;
  for (const prompt of Object.values(legacy.crazy.prompts)) delete prompt.archiveId;
  for (const item of legacy.crazy.queue) delete item.archiveId;
  const before = copy(legacy), next = E.membership(legacy, { added: [], roster: [], inactiveNums: [2] }, { now: 14000, seed: 73 });
  assert.deepEqual(legacy, before); assert.equal(next.gameDeadline, legacy.gameDeadline); assert.equal(next.sessionId, legacy.sessionId);
  assert.equal(records(next).length, 5); assert.ok(records(next).every(record => record.legacy));
  const cancelled = records(next).filter(record => record.status === 'cancelled');
  assert.deepEqual(cancelled.map(record => record.text).sort(), ['Delivered to leaving', 'Queue authored leaving', 'Queue targeted leaving'].sort());
  assert.ok(cancelled.every(record => record.closedAt === 14000));
  assert.ok(cancelled.some(record => record.recipient?.playerNum === 2));
  assert.equal(records(next).find(record => record.text === 'Delivered by leaving').status, 'pending');
  assert.equal(records(next).find(record => record.text === 'Kept queue').status, 'queued');
  assert.equal(next.crazy.prompts[2].status, 'cancelled'); assert.equal(next.crazy.prompts[3].status, 'pending');
});
