'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const copy = value => JSON.parse(JSON.stringify(value));
const topic = { title: 'Our silly cafe', question: 'What should we serve together?' };
const roster = [1, 2, 3].map(playerNum => ({ playerNum, name: ['Alice', 'Bo', 'Chloe'][playerNum - 1] }));
const create = (extra = {}) => E.create({ id: 'archive-membership-session', now: 1000, topic, roster,
  sharedControls: true, gameMode: 'crazy', crazySource: 'players', conversationMode: 'free',
  gameSeconds: 60, crazyTaskSeconds: 30, crazyMinSeconds: 5, crazyMaxSeconds: 5, ...extra });
let sequence = 0;
const command = (s, type, actor = 0, extra = {}) => ({ id: 'archive-membership-action-' + ++sequence, type, actor,
  sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: 73, ...extra });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, command(s, type, actor, extra));
const submit = (s, actor, target, text, now = 1500) => {
  const next = act(s, 'crazyAssign', actor, { target, text, now });
  assert.equal(next.replies[actor].error, ''); return next;
};
const membership = (s, inactiveNums, extra = {}, now = 3000) => E.membership(s,
  { inactiveNums, ...extra }, { id: 'membership-change-' + ++sequence, now, seed: 81 });
const records = s => s.challengeArchive.records;
const byText = (s, text) => records(s).find(record => record.text === text);
const start = s => act(s, 'start', 0, { now: 2000 });
const deliver = s => act(s, 'clockTick', 0, { now: s.crazy.nextAssignAt });
function assertPrivate(s, now) {
  for (const num of [0, 1, 2, 3, 4, 99]) {
    const serialized = JSON.stringify(E.view(s, num, now));
    for (const field of ['challengeArchive', 'archiveId', 'persistedVersion']) assert.equal(serialized.includes(field), false);
    for (const record of records(s)) {
      assert.equal(serialized.includes(record.id), false);
      const prompt = s.crazy?.prompts?.[num];
      const visible = prompt?.archiveId === record.id && s.roster.some(p => p.playerNum === num && p.active !== false && p.pending !== true);
      assert.equal(serialized.includes(record.text), !!visible, 'only the recipient sees their current canonical prompt: ' + record.text);
    }
  }
}

test('membership cancels queued writing from the away author or to that seat, keeping other random and targeted writing', () => {
  let s = submit(create(), 1, 2, 'A song from Alice.');
  s = submit(s, 3, 1, 'A chicken for Alice.', 1600);
  s = submit(s, 3, null, 'A random cup song.', 1700);
  s = submit(s, 3, 2, 'A robot for Bo.', 1800);
  s.scores[1] = 4;
  const before = copy(s), kept = s.crazy.queue.slice(2);
  const next = membership(s, [1], { added: [{ playerNum: 4, name: 'Drew' }] });
  assert.deepEqual(s, before, 'membership cannot mutate the transaction input');
  assert.deepEqual(next.crazy.queue, kept);
  for (const text of ['A song from Alice.', 'A chicken for Alice.']) {
    const record = byText(next, text);
    assert.equal(record.status, 'cancelled'); assert.equal(record.version, 2); assert.equal(record.closedAt, 3000);
  }
  for (const text of ['A random cup song.', 'A robot for Bo.']) assert.deepEqual(byText(next, text), byText(s, text));
  assert.equal(next.scores[1], 4); assert.equal(next.scores[4], 0);
  for (const field of ['sessionId', 'phase', 'gameDeadline', 'deadline']) assert.equal(next[field], s[field]);
  assert.deepEqual(next.topic, s.topic); assert.equal(next.crazy.nextAssignAt, s.crazy.nextAssignAt);
  const repeated = membership(next, [1], {}, 3100);
  assert.deepEqual(records(repeated), records(next), 'another coordinator update does not repeat cancellation');
  const rejoined = membership(repeated, [], {}, 3200);
  assert.equal(rejoined.roster[0].active, true); assert.deepEqual(records(rejoined), records(next));
  assert.deepEqual(rejoined.crazy.queue, kept, 'rejoin cannot resurrect discarded writing');
  assertPrivate(next, 3000); assertPrivate(rejoined, 3200);
});

test('departure closes only the away recipient mission while a mission from that author stays live for someone else', () => {
  let s = submit(create(), 1, 2, 'Bo sings for Alice.');
  s = submit(s, 3, 1, 'Alice makes chicken sounds.', 1600);
  s = deliver(start(s)); s = deliver(s);
  s = submit(s, 1, 3, 'A waiting Alice task.', 12001);
  s = submit(s, 3, null, 'A kept random task.', 12002);
  s.scores[1] = 6;
  const before = copy(s), keptPrompt = copy(s.crazy.prompts[2]), nextAssignAt = s.crazy.nextAssignAt;
  const next = membership(s, [1], {}, 13000);
  assert.deepEqual(s, before); assert.equal(next.crazy.prompts[1].status, 'cancelled');
  assert.equal(byText(next, 'Alice makes chicken sounds.').status, 'cancelled');
  assert.equal(byText(next, 'Alice makes chicken sounds.').version, 3);
  assert.equal(byText(next, 'Alice makes chicken sounds.').closedAt, 13000);
  assert.deepEqual(next.crazy.prompts[2], keptPrompt);
  assert.deepEqual(byText(next, 'Bo sings for Alice.'), byText(s, 'Bo sings for Alice.'));
  assert.equal(byText(next, 'A waiting Alice task.').status, 'cancelled');
  assert.equal(byText(next, 'A waiting Alice task.').version, 2);
  assert.deepEqual(byText(next, 'A kept random task.'), byText(s, 'A kept random task.'));
  assert.equal(next.crazy.queue.length, 1); assert.equal(next.crazy.queue[0].target, null);
  assert.equal(next.crazy.nextAssignAt, nextAssignAt); assert.equal(next.gameDeadline, s.gameDeadline);
  assert.equal(next.scores[1], 6); assertPrivate(next, 13000);
  const done = act(next, 'crazyDone', 2, { promptId: keptPrompt.id, now: 14000 });
  assert.equal(done.replies[2].error, ''); assert.equal(done.scores[2], 1); assert.equal(done.scores[1], 6);
  assert.equal(byText(done, 'Bo sings for Alice.').status, 'done');
  assert.equal(byText(done, 'Bo sings for Alice.').version, 3); assertPrivate(done, 14000);
});

test('exclude commands archive recipient and author cancellations once and self-rejoin keeps their outcomes', () => {
  let s = deliver(start(submit(create(), 1, 2, 'Bo sings a short song.')));
  s = submit(s, 2, 3, 'An away author queue.', 7001);
  s = submit(s, 1, 3, 'Another author queue.', 7002);
  const before = copy(s), leave = command(s, 'exclude', 3, { playerNum: 2, active: false, now: 8000 });
  const next = E.apply(s, leave);
  assert.equal(next.replies[3].error, ''); assert.deepEqual(s, before);
  assert.equal(byText(next, 'Bo sings a short song.').status, 'cancelled');
  assert.equal(byText(next, 'Bo sings a short song.').version, 3);
  assert.equal(byText(next, 'An away author queue.').status, 'cancelled');
  assert.equal(byText(next, 'An away author queue.').version, 2);
  assert.deepEqual(byText(next, 'Another author queue.'), byText(s, 'Another author queue.'));
  assert.equal(E.apply(next, leave), next); assertPrivate(next, 8000);
  const returned = act(next, 'exclude', 2, { playerNum: 2, active: true, now: 8100 });
  assert.equal(returned.replies[2].error, ''); assert.equal(returned.roster[1].active, true);
  assert.deepEqual(records(returned), records(next)); assert.equal(returned.crazy.queue.length, 1);
  assert.equal(returned.crazy.prompts[2].status, 'cancelled'); assertPrivate(returned, 8100);
});

for (const initialized of [false, true]) test((initialized ? 'old-writer' : 'legacy') + ' membership captures original names and known times before renaming and removing private writing', () => {
  const s = start(create()); if (!initialized) delete s.challengeArchive;
  s.crazy.queue = [
    { id: 'old-author', assignedBy: 1, target: 3, kind: 'line', text: 'Old author song.', at: 1500 },
    { id: 'old-target', assignedBy: 3, target: 1, kind: 'task', text: 'Old target chicken.' },
    { id: 'old-random', assignedBy: 3, target: null, kind: 'task', text: 'Old random cup.', at: 1600 }
  ];
  s.crazy.prompts[1] = { id: 'old-recipient', assignedBy: 3, source: 'player', kind: 'task', text: 'Old recipient song.', at: 2500, expiresAt: 50000, status: 'pending' };
  s.crazy.prompts[2] = { id: 'old-kept', assignedBy: 1, source: 'player', kind: 'task', text: 'Old kept chicken.', at: 2600, expiresAt: 50000, status: 'pending' };
  const before = copy(s), names = roster.map(p => ({ ...p, name: 'New ' + p.name }));
  let next = membership(s, [1], { roster: names }, 3000);
  assert.deepEqual(s, before); assert.equal(records(next).length, 5); assert.equal(next.challengeArchive.version, 1);
  const author = byText(next, 'Old author song.'), targetRecord = byText(next, 'Old target chicken.');
  assert.deepEqual(author.author, { playerNum: 1, name: 'Alice' }); assert.deepEqual(author.target, { playerNum: 3, name: 'Chloe' });
  assert.equal(author.createdAt, 1500); assert.equal(author.closedAt, 3000); assert.equal(author.version, 2);
  assert.equal(targetRecord.status, 'cancelled'); assert.equal(targetRecord.version, 2);
  assert.equal(Object.hasOwn(targetRecord, 'createdAt'), false, 'migration never invents an original writing time');
  assert.deepEqual(targetRecord.target, { playerNum: 1, name: 'Alice' });
  const recipient = byText(next, 'Old recipient song.'), kept = byText(next, 'Old kept chicken.');
  assert.equal(recipient.status, 'cancelled'); assert.equal(recipient.version, 3); assert.equal(recipient.assignedAt, 2500);
  assert.equal(Object.hasOwn(recipient, 'createdAt'), false);
  assert.deepEqual(kept.author, { playerNum: 1, name: 'Alice' }); assert.deepEqual(kept.recipient, { playerNum: 2, name: 'Bo' });
  assert.equal(kept.status, 'pending'); assert.equal(kept.version, 2); assert.equal(kept.assignedAt, 2600);
  assert.equal(next.crazy.prompts[2].archiveId, kept.id); assert.equal(next.roster[1].name, 'New Bo');
  assert.equal(next.crazy.queue.length, 1); assert.equal(next.crazy.queue[0].archiveId, byText(next, 'Old random cup.').id);
  assert.ok(records(next).every(record => record.legacy === true)); assertPrivate(next, 3000);
  const closedIds = records(next).filter(record => record.status === 'cancelled').map(record => record.id);
  next = E.ackArchive(next, records(next).filter(record => record.status === 'cancelled').map(record => ({ id: record.id, version: record.version })));
  assert.equal(records(next).length, 2);
  next = membership(next, [], {}, 3100); next = act(next, 'clockTick', 0, { now: 3200 });
  assert.equal(records(next).length, 2); assert.ok(records(next).every(record => !closedIds.includes(record.id)));
  assertPrivate(next, 3200);
});

test('fresh creation and topic changes preserve away and pending roster flags alongside the private journal', () => {
  const flaggedRoster = [{ playerNum: 1, name: 'Alice', active: false }, { playerNum: 2, name: 'Bo' },
    { playerNum: 3, name: 'Chloe', pending: true }, { playerNum: 4, name: 'Drew' }];
  const s = submit(create({ roster: flaggedRoster }), 2, 4, 'Drew sings for Bo.'), before = copy(s);
  const fresh = create({ id: 'replacement-membership-session', roster: s.roster, challengeArchive: s.challengeArchive, now: 3000 });
  assert.deepEqual(fresh.roster, flaggedRoster); assert.equal(records(fresh).length, 1);
  assert.equal(records(fresh)[0].id, records(s)[0].id); assert.equal(records(fresh)[0].status, 'cancelled');
  assert.equal(records(fresh)[0].version, 2); assert.equal(records(fresh)[0].closedAt, 3000);
  let next = act(s, 'newTopic', 2, { confirm: true, topic: { title: 'Next shared cafe', question: 'What name should we choose together?' },
    gameMode: 'crazy', crazySource: 'players', conversationMode: 'free', mode: 'think', seconds: 45, showStarters: true, now: 3000 });
  assert.equal(next.replies[2].error, ''); assert.deepEqual(next.roster, flaggedRoster);
  assert.deepEqual(records(next), records(fresh)); assert.notEqual(next.sessionId, s.sessionId); assert.deepEqual(s, before);
  const closed = copy(records(next));
  next = act(next, 'newTopic', 2, { confirm: true, topic: { question: 'Choose our next silly menu.' }, gameMode: 'normal',
    conversationMode: 'assigned', mode: 'think', seconds: 45, showStarters: false, now: 4000 });
  assert.equal(next.replies[2].error, ''); assert.deepEqual(next.roster, flaggedRoster);
  assert.deepEqual(records(next), closed, 'a waiting terminal record keeps its original cancellation timestamp');
  assertPrivate(fresh, 3000); assertPrivate(next, 4000);
});


test('initialized journals capture old-writer unlinked active items once, normalize idle clocks and never revive persisted terminal history', () => {
  let s = start(submit(create(), 3, null, 'Already journaled queue.'));
  const originalRecord = copy(records(s)[0]);
  s.crazy.queue.push({ id: 'old-writer-queue', assignedBy: 1, target: 3, kind: 'line', text: 'An old writer cup song.', at: 1500 });
  s.crazy.prompts[2] = { id: 'old-writer-prompt', assignedBy: 3, source: 'player', kind: 'task', text: 'An old writer chicken.', at: 2500, expiresAt: 50000, status: 'pending' };
  s.crazy.prompts[3] = { id: 'system-prompt', source: 'system', kind: 'task', text: 'System task stays outside archive.', at: 2600, expiresAt: 50000, status: 'pending' };
  const before = copy(s);
  assert.equal(s.challengeArchive.version, 1); assert.equal(E.timerDue(s, 3000), true, 'unlinked handwriting requires normalization before any gameplay clock is due');
  let next = act(s, 'clockTick', 0, { now: 3000 });
  assert.deepEqual(s, before); assert.equal(records(next).length, 3);
  assert.deepEqual(records(next)[0], originalRecord, 'an already linked accepted submission keeps its identity and version');
  const queued = byText(next, 'An old writer cup song.'), pending = byText(next, 'An old writer chicken.');
  assert.equal(queued.id, s.sessionId + ':author:1:old-writer-queue');
  assert.equal(queued.version, 1); assert.equal(queued.status, 'queued'); assert.equal(queued.createdAt, 1500); assert.equal(queued.legacy, true);
  assert.equal(pending.id, s.sessionId + ':legacy:old-writer-prompt');
  assert.equal(pending.version, 2); assert.equal(pending.status, 'pending'); assert.equal(pending.assignedAt, 2500); assert.equal(pending.legacy, true);
  assert.equal(Object.hasOwn(pending, 'createdAt'), false, 'the prompt delivery time is not its writing time');
  assert.equal(next.crazy.queue[1].archiveId, queued.id); assert.equal(next.crazy.prompts[2].archiveId, pending.id);
  assert.equal(next.crazy.prompts[3].archiveId, undefined); assert.equal(next.crazy.nextAssignAt, s.crazy.nextAssignAt);
  assert.equal(E.timerDue(next, 3001), false); assert.equal(act(next, 'clockTick', 0, { now: 3001 }), next);
  const normalized = membership(next, [], {}, 3002);
  assert.deepEqual(records(normalized), records(next), 'membership normalization cannot capture a linked item a second time');
  next = E.ackArchive(normalized, records(normalized).map(record => ({ id: record.id, version: record.version })));
  assert.equal(records(next).length, 3); assert.deepEqual(E.archiveEntries(next), []);
  const persisted = copy(records(next)); next = membership(next, [], {}, 3003);
  assert.deepEqual(records(next), persisted); assertPrivate(next, 3003);
  next = act(next, 'finish', 1, { now: 4000 });
  assert.ok(records(next).every(record => record.status === 'cancelled')); assertPrivate(next, 4000);
  next = E.ackArchive(next, records(next).map(record => ({ id: record.id, version: record.version })));
  assert.equal(records(next).length, 0); assert.equal(next.challengeArchive.version, 1);
  const wire = copy(next); delete wire.challengeArchive.records;
  assert.equal(E.timerDue(wire, 4100), false); assert.equal(act(wire, 'clockTick', 0, { now: 4100 }), wire);
  const later = membership(wire, [1], {}, 4200);
  assert.equal(records(later).length, 0, 'terminal prompts and persisted empty journals do not re-create archive history');
  assert.deepEqual(E.archiveEntries(later), []); assertPrivate(later, 4200);
});
