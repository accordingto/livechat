'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const V = require('../talk-vnext.js');
const clone = value => structuredClone(value);
const identity = num => num.toString(16).padStart(64, '0');
let serial = 0;
function room(options = {}) {
  return E.create({ id: 'skip-rules', now: 1000, roster: Array.from({ length: 5 }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })),
    topic: { title: 'Our soup shop', question: 'Build a funny soup shop together.' }, seconds: 30, gameSeconds: 900,
    gameMode: 'crazy', conversationMode: 'free', crazyPlayStyle: 'free', crazySource: 'mixed', crazyMinSeconds: 5, crazyMaxSeconds: 5,
    crazyIdentities: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [i + 1, identity(i + 1)])), ...options });
}
function act(s, type, actor = 0, extra = {}) {
  return E.apply(s, { id: 'skip-rules-' + ++serial, sessionId: s.sessionId, turnId: s.turnId, actor, type, now: 2000, seed: 19, ...extra });
}
const own = (s, n) => E.view(s, n, 2200).talk.crazy;
function started(options) { return act(room(options), 'start'); }
function handwritten(options = {}) {
  let s = started(options);
  s = act(s, 'crazyAssign', 1, { target: 3, text: 'Treat your soup spoon as a king.', now: 2100 });
  const p = s.crazy.prompts[3];
  s = act(s, 'crazyRendered', 3, { promptId: p.id, renderVersion: 1, now: 2150 });
  return s;
}
function system() {
  let s = started({ crazySource: 'system' });
  return act(s, 'clockTick', 0, { now: 7000 });
}

test('handwritten skip deducts exactly once, retains rest and negative score through clocks and serialization', () => {
  let s = handwritten();
  const p = clone(s.crazy.prompts[3]), command = { id: 'same-player-skip', promptId: p.id, now: 2200 };
  s = act(s, 'crazySkip', 3, command);
  assert.equal(s.scores[3], -1); assert.equal(s.crazy.receivers[3].cooldownUntil, 32200);
  assert.equal(s.crazy.prompts[3].status, 'skipped'); assert.equal(own(s, 1).returnedCards.length, 1);
  s = act(clone(s), 'crazySkip', 3, command);
  assert.equal(s.scores[3], -1); assert.equal(own(s, 1).returnedCards.length, 1);
  s = act(clone(s), 'clockTick', 0, { now: 2300 });
  assert.equal(s.scores[3], -1); assert.equal(E.view(s, 3, 2300).talk.scores.find(v => v.playerNum === 3).score, -1);
  const penalties = E.archiveEntries(s).filter(record => record.category === 'event' && record.eventType === 'skip_penalty');
  assert.equal(penalties.length, 1); assert.equal(penalties[0].reason, 'points:-1');
  assert.equal(penalties[0].actor, 3); assert.equal(penalties[0].recipientNum, 3); assert.equal(penalties[0].promptId, p.id);
  assert.equal(penalties[0].source, 'player'); assert.ok(!JSON.stringify(penalties).includes(p.text));
  assert.deepEqual(own(s, 3).lastResult, { id: command.id, promptId: p.id, source: 'player', status: 'skipped', scoreDelta: -1, at: 2200 });
  assert.equal(own(s, 2).lastResult, null); assert.equal(E.view(s, 0, 2300).talk.crazy.lastResult, null);
  const late = act(s, 'crazySkip', 3, { promptId: p.id, now: 2400 });
  assert.equal(late.replies[3].error, 'stale_prompt'); assert.equal(late.scores[3], -1);
});

test('system skip immediately gives the same actor a different system card, fresh TTL and no rest or penalty', () => {
  let s = system(); const num = V.activeNums(s)[0], p = clone(s.crazy.prompts[num]);
  const command = { id: 'same-system-skip', promptId: p.id, now: 7100 };
  s = act(s, 'crazySkip', num, command);
  assert.equal(s.scores[num], 0); assert.equal(s.crazy.receivers[num].cooldownUntil, 0);
  const next = s.crazy.prompts[num];
  assert.equal(next.status, 'pending'); assert.equal(next.source, 'system'); assert.notEqual(next.id, p.id); assert.notEqual(next.lineId, p.lineId);
  assert.equal(next.at, 7100); assert.equal(next.expiresAt, 157100); assert.equal(next.renderedVersion, 0);
  const replay = act(s, 'crazySkip', num, command);
  assert.equal(replay.crazy.prompts[num].id, next.id); assert.equal(V.activeNums(replay).length, 1); assert.equal(replay.scores[num], 0);
  assert.equal(own(s, num).lastResult.source, 'system'); assert.equal(own(s, num).lastResult.scoreDelta, 0);
});

test('queued handwriting takes the released system slot without an extra system assignment', () => {
  let s = system(); s.crazy.source = 'mixed';
  const recipient = V.activeNums(s)[0], author = recipient === 1 ? 2 : 1, old = clone(s.crazy.prompts[recipient]);
  s = act(s, 'crazyAssign', author, { target: recipient, text: 'The tiny soup is your new boss.', now: 7050 });
  assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'crazySkip', recipient, { promptId: old.id, now: 7100 });
  assert.equal(s.crazy.prompts[recipient].source, 'player'); assert.equal(s.crazy.prompts[recipient].text, 'The tiny soup is your new boss.');
  assert.equal(V.activeNums(s).length, 1); assert.equal(s.scores[recipient], 0); assert.equal(s.crazy.receivers[recipient].cooldownUntil, 0);
});

test('immediate system replacement honors closing, source, paused receivers and changed roles', () => {
  for (const change of [s => { s.crazy.roundStage = 'decision'; s.crazy.queueLocked = true; }, s => { s.crazy.source = 'players'; },
    s => { s.crazy.receivers[V.activeNums(s)[0]].paused = true; }, s => { s.crazy.paused = true; }]) {
    let s = system(); const num = V.activeNums(s)[0], id = s.crazy.prompts[num].id; change(s);
    s = act(s, 'crazySkip', num, { promptId: id, now: 7100 });
    assert.equal(s.crazy.prompts[num].status, 'skipped'); assert.equal(s.scores[num], 0); assert.equal(s.crazy.systemReplacement, undefined);
  }
  let s = system(), num = V.activeNums(s)[0], id = s.crazy.prompts[num].id;
  s.crazy.playStyle = 'director'; s.crazy.directors = [num]; s.crazy.effectivePlayStyle = 'director';
  s = act(s, 'crazySkip', num, { promptId: id, now: 7100 });
  assert.equal(s.crazy.prompts[num].status, 'skipped');
});

test('a system replacement cannot exceed a reduced capacity or disturb another pending recipient', () => {
  let s = system(); s = act(s, 'clockTick', 0, { now: 12000 });
  const [first, second] = V.activeNums(s), other = clone(s.crazy.prompts[second]);
  assert.ok(first && second); s.crazy.maxActive = 1;
  s = act(s, 'crazySkip', first, { promptId: s.crazy.prompts[first].id, now: 12100 });
  assert.equal(s.crazy.prompts[first].status, 'skipped'); assert.deepEqual(s.crazy.prompts[second], other);
  assert.equal(V.activeNums(s).length, 1); assert.equal(s.scores[first], 0);
});

test('returned cards stay with original identity, remain private, and are never queued by generic library commands', () => {
  let s = handwritten(); const p = clone(s.crazy.prompts[3]);
  s = act(s, 'crazySkip', 3, { promptId: p.id, now: 2200 });
  const returned = own(s, 1).returnedCards[0]; assert.ok(returned); assert.equal(own(s, 1).library.length, 0);
  for (const num of [0, 2, 3, 4, 5]) assert.equal(own(s, num).returnedCards.length, 0);
  for (const type of ['crazyLibrarySend', 'crazyLibraryUpdate', 'crazyLibrarySave']) {
    const next = act(s, type, 1, { cardId: returned.id, text: 'Do not bypass the return choice.', now: 2300 });
    assert.equal(next.replies[1].error, 'invalid_card'); assert.equal(next.crazy.queue.length, 0);
  }
  s.crazyIdentities[1] = identity(9);
  assert.equal(own(s, 1).returnedCards.length, 0);
  const forged = act(s, 'crazyReturnSave', 1, { cardId: returned.id, now: 2400 });
  assert.equal(forged.replies[1].error, 'invalid_card');
  assert.equal(s.crazyVault[identity(1)][returned.id].returned, true);
});

test('a seat rebound before Skip cannot claim the original author return or redirected archived ownership', () => {
  let s = handwritten(); const promptId = s.crazy.prompts[3].id;
  s.crazyIdentities[1] = identity(9);
  s = act(s, 'crazySkip', 3, { promptId, now: 2200 });
  const original = Object.values(s.crazyVault[identity(1)]);
  assert.equal(original.length, 1); assert.equal(original[0].returned, true);
  assert.equal(own(s, 1).returnedCards.length, 0); assert.equal(s.crazyVault[identity(9)], undefined);
  const record = V.archiveRecords(s).find(record => record.category === 'vault');
  assert.equal(record.ownerIdentity, identity(1)); assert.equal(record.status, 'returned');
});

test('return save/edit/delete are private versioned choices, with no original reveal rewrite or resurrection on reset', () => {
  for (const remove of [false, true]) {
    let s = handwritten(); const p = clone(s.crazy.prompts[3]);
    s = act(s, 'crazySkip', 3, { promptId: p.id, now: 2200 });
    const id = own(s, 1).returnedCards[0].id;
    s.roster[0].active = false;
    const command = { id: 'return-choice-' + remove, cardId: id, ...(remove ? {} : { text: 'A revised private soup challenge.' }), now: 2300 };
    s = act(s, remove ? 'crazyReturnDelete' : 'crazyReturnSave', 1, command);
    assert.equal(s.replies[1].error, ''); assert.equal(own(s, 1).returnedCards.length, 0);
    assert.equal(s.crazyVault[identity(1)][id].version, 2);
    s = act(s, remove ? 'crazyReturnDelete' : 'crazyReturnSave', 1, command);
    assert.equal(s.crazyVault[identity(1)][id].version, 2);
    assert.equal(s.crazy.roundCards[p.archiveId].text, p.text); assert.equal(s.crazy.queue.length, 0);
    s = act(s, 'crazyDrain', 0, { now: 2400 }); s = act(s, 'crazyReveal', 0, { now: 2500 });
    const recap = own(s, 2).revealCards; assert.equal(recap[0].text, p.text);
    assert.ok(!JSON.stringify(recap).includes('revised private'));
    const carry = E.resetCarry(s, 2600);
    assert.equal(carry.crazyVault[identity(1)][id].deleted, remove);
    assert.equal(carry.crazyVault[identity(1)][id].text, remove ? p.text : 'A revised private soup challenge.');
  }
});

test('saving an unchanged return makes it an ordinary saved card but never submits it', () => {
  let s = handwritten(); const promptId = s.crazy.prompts[3].id;
  s = act(s, 'crazySkip', 3, { promptId, now: 2200 });
  const returned = own(s, 1).returnedCards[0];
  s = act(s, 'crazyReturnSave', 1, { cardId: returned.id, now: 2300 });
  assert.equal(s.replies[1].error, ''); assert.equal(own(s, 1).returnedCards.length, 0);
  assert.deepEqual(own(s, 1).library, [{ ...returned, version: 2 }]); assert.equal(s.crazy.queue.length, 0);
  assert.equal(V.archiveRecords(s).find(record => record.category === 'vault').status, 'saved');
});

test('a late handwritten skip cannot penalize or return an expired task, and Normal still rejects malformed negative scores', () => {
  let s = handwritten(); const p = clone(s.crazy.prompts[3]);
  s = act(s, 'crazySkip', 3, { promptId: p.id, now: p.expiresAt });
  assert.equal(s.replies[3].error, 'stale_prompt'); assert.equal(s.scores[3], 0);
  assert.equal(own(s, 1).returnedCards.length, 0); assert.equal(s.crazy.prompts[3].status, 'expired');
  let normal = started({ gameMode: 'normal' }); normal.scores[3] = -2;
  normal = act(normal, 'clockTick', 0, { now: 2300 });
  assert.equal(normal.scores[3], 0);
});
