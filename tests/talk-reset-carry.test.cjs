'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const clone = value => structuredClone(value);
const owner = 'a'.repeat(64);
const roster = [1, 2, 3].map(playerNum => ({ playerNum, name: 'Person ' + playerNum }));
function create(id = 'reset-old', extra = {}) {
  return E.create({ id, now: 1000, topic: { question: 'Invent a silly cafe.' }, roster,
    gameMode: 'crazy', crazySource: 'players', conversationMode: 'free', crazyIdentities: { 1: owner }, ...extra });
}
let serial = 0;
const act = (s, type, actor, extra = {}) => E.apply(s, { id: 'reset-' + ++serial, type, actor,
  sessionId: s.sessionId, turnId: s.turnId, now: 2000 + serial, seed: 13, ...extra });

test('reset carry privately retains prepared handwriting, latest journals and the original verified owner without mutating its input', () => {
  let s = create();
  s = act(s, 'crazyAssign', 1, { text: 'A preparation card that must survive.', target: 2 });
  const before = clone(s), card = Object.values(s.crazy.roundCards)[0];
  const carry = E.resetCarry(s, 5000);
  assert.deepEqual(s, before);
  assert.equal(carry.crazyVault[owner][card.id].text, card.text);
  assert.equal(carry.crazyVault[owner][card.id].deleted, false);
  const challenge = carry.challengeArchive.records.find(record => record.id === card.archiveId);
  assert.equal(challenge.status, 'cancelled'); assert.equal(challenge.closedAt, 5000);
  assert.equal(challenge.author.playerNum, 1);
  assert.ok(carry.challengeArchive.records.some(record => record.category === 'event' && record.eventType === 'cancelled'));
  assert.ok(carry.challengeArchive.records.some(record => record.category === 'vault' && record.ownerIdentity === owner));
  const next = create('reset-next', carry);
  assert.equal(E.view(next, 1, 5000, { actorIdentity: owner }).talk.crazy.library[0].text, card.text);
  for (const num of [0, 2, 3]) assert.ok(!JSON.stringify(E.view(next, num, 5000)).includes(card.text));
  assert.equal(next.crazy.queue.length, 0); assert.equal(next.gameDeadline, 0);
  carry.crazyVault[owner][card.id].text = 'Different output copy';
  assert.deepEqual(s, before, 'callers cannot mutate the transaction snapshot through carry references');
});

test('reset carry keeps current vault edits and tombstones over stale copied journal versions', () => {
  let old = create();
  old = act(old, 'crazyAssign', 1, { text: 'Old edited card.', target: 2 });
  old = act(old, 'crazyAssign', 1, { text: 'Old deleted card.', target: 3 });
  const first = E.resetCarry(old, 5000), nextCards = Object.values(old.crazy.roundCards);
  let current = create('reset-edit', first);
  current = act(current, 'crazyLibraryUpdate', 1, { cardId: nextCards[0].id, text: 'My latest private edit.', now: 6000 });
  current = act(current, 'crazyLibraryDelete', 1, { cardId: nextCards[1].id, now: 6500 });
  // Model an old writer retaining round snapshots but omitting auto-save markers.
  current.crazy.roundCards = clone(old.crazy.roundCards);
  const before = clone(current), carry = E.resetCarry(current, 7000);
  assert.deepEqual(current, before);
  assert.equal(carry.crazyVault[owner][nextCards[0].id].text, 'My latest private edit.');
  assert.equal(carry.crazyVault[owner][nextCards[0].id].version, 2);
  assert.equal(carry.crazyVault[owner][nextCards[1].id].deleted, true);
  assert.equal(carry.crazyVault[owner][nextCards[1].id].version, 2);
  const vaultRecords = carry.challengeArchive.records.filter(record => record.category === 'vault');
  assert.equal(vaultRecords.length, 2);
  assert.ok(vaultRecords.every(record => record.version === 2));
  assert.equal(vaultRecords.find(record => record.cardId === nextCards[1].id).status, 'deleted');
  const final = create('reset-final', carry);
  assert.deepEqual(E.view(final, 1, 7000, { actorIdentity: owner }).talk.crazy.library.map(card => card.text), ['My latest private edit.']);
});

test('reset carry rejects active Crazy missions before changing prompts, scores or private retention', () => {
  let s = create(); s = act(s, 'start', 0);
  s = act(s, 'crazyAssign', 1, { text: 'Still in progress.', target: 2 });
  const before = clone(s);
  assert.throws(() => E.resetCarry(s, 5000), { message: 'missions_active' });
  assert.deepEqual(s, before); assert.equal(s.crazy.prompts[2].status, 'pending');
  s.roster[1].active = false;
  const legacy = clone(s);
  assert.throws(() => E.resetCarry(s, 5000), { message: 'missions_active' });
  assert.deepEqual(s, legacy, 'a legacy inactive pending mailbox cannot be silently discarded');
});

test('normal active rounds retain their ordinary restart behavior and private vault carry', () => {
  let s = create('reset-normal', { gameMode: 'normal' }); s = act(s, 'start', 0);
  s.crazyVault[owner] = { saved: { id: 'saved', text: 'Private normal carry.', target: null,
    version: 3, persistedVersion: 2, deleted: false, createdAt: 1000, updatedAt: 2000 } };
  const before = clone(s), carry = E.resetCarry(s, 5000);
  assert.deepEqual(s, before); assert.equal(carry.crazyVault[owner].saved.version, 3);
  const next = create('next-normal', { ...carry, gameMode: 'normal' });
  assert.equal(next.phase, 'thinking'); assert.equal(next.gameDeadline, 0);
  assert.ok(E.view(next, 2, 5000).talk.scores.every(entry => entry.score === 0));
  assert.ok(!JSON.stringify(E.view(next, 2, 5000)).includes('Private normal carry.'));
  assert.ok(E.archiveEntries(next).some(record => record.category === 'vault' && record.version === 3));
});

test('only confirmed supersession can close old pending mailboxes while retaining all unused handwriting', () => {
  let s = create(); s = act(s, 'start', 0);
  s = act(s, 'crazyAssign', 1, { text: 'Unconfirmed display from the former activity.', target: 2 });
  s = act(s, 'crazyAssign', 1, { text: 'Waiting card from the former activity.', target: 2 });
  const before = clone(s);
  for (const superseded of [false, 'true', 1]) {
    assert.throws(() => E.resetCarry(s, 5000, { superseded }), { message: 'missions_active' });
  }
  const carried = E.resetCarry(s, 5000, { superseded: true });
  assert.deepEqual(s, before); assert.deepEqual(E.resetCarry(s, 5000, { superseded: true }), carried);
  assert.equal(Object.values(carried.crazyVault[owner]).length, 2);
  const challenges = carried.challengeArchive.records.filter(record => !record.category || record.category === 'challenge');
  assert.ok(challenges.every(record => record.status === 'cancelled' && record.closedAt === 5000));
  assert.ok(carried.challengeArchive.records.some(record => record.category === 'event'
    && record.eventType === 'cancelled' && record.reason === 'activity_switched' && record.source === 'player'));
  const backendProven = clone(s); backendProven.crazy.activitySuperseded = true;
  const byCanonicalProof = E.resetCarry(backendProven, 5000);
  assert.deepEqual(byCanonicalProof, carried);
  const next = create('after-confirmed-switch', carried);
  assert.equal(next.crazy.activitySuperseded, undefined);
  assert.equal(E.view(next, 1, 5000, { actorIdentity: owner }).talk.crazy.library.length, 2);
  assert.equal(next.crazy.queue.length, 0); assert.equal(Object.keys(next.crazy.prompts).length, 0);
  assert.ok(!JSON.stringify(E.view(next, 2, 5000)).includes('former activity'));
  const forged = act(s, 'newTopic', 0, { superseded: true, confirm: true, topic: { question: 'Forged bypass?' },
    mode: 'think', seconds: 45, showStarters: true, gameMode: 'crazy' });
  assert.equal(forged.replies[0].error, 'missions_active'); assert.equal(forged.sessionId, s.sessionId);
});

test('a confirmed switch records closure of system missions without awarding points or adding private text to diagnostics', () => {
  let s = create('former-system', { crazySource: 'system', crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  s = act(s, 'start', 0, { now: 1000 }); s = act(s, 'clockTick', 0, { now: 6000 });
  const [num, prompt] = Object.entries(s.crazy.prompts).find(([, p]) => p.status === 'pending');
  const before = clone(s), carry = E.resetCarry(s, 7000, { superseded: true });
  assert.deepEqual(s, before);
  const trace = carry.challengeArchive.records.find(record => record.category === 'event'
    && record.eventType === 'cancelled' && record.promptId === prompt.id);
  assert.equal(trace.source, 'system'); assert.equal(trace.reason, 'activity_switched');
  assert.equal(trace.recipientNum, Number(num)); assert.equal(trace.updatedAt, 7000);
  assert.ok(!JSON.stringify(trace).includes(prompt.text)); assert.deepEqual(carry.crazyVault, {});
  assert.ok(Object.values(s.scores).every(score => score === 0));
});
