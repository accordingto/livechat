'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const V = require('../talk-vnext.js');
const clone = value => structuredClone(value);
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) }));
let serial = 0;
function create(count = 3, options = {}) {
  return E.create({ id: 'three-person-' + ++serial, roster: roster(count), topic: { question: 'Invent a silly cafe.' },
    now: 1000, gameMode: 'crazy', crazySource: 'players', gameSeconds: 900,
    conversationMode: 'assigned', crazyRotationSeconds: 60, ...options });
}
function act(s, type, actor, options = {}) {
  return E.apply(s, { id: 'presence-' + ++serial, type, actor, sessionId: s.sessionId, turnId: s.turnId,
    now: 2000, seed: 13, ...options });
}
function pending(options = {}) {
  let s = create(3, { crazyPlayStyle: 'free', conversationMode: 'free', ...options });
  s = act(s, 'start', 0);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Announce a promotion for your spoon.' });
  return s;
}
function shown(s, now = 2100) {
  return act(s, 'crazyRendered', 2, { promptId: s.crazy.prompts[2].id, renderVersion: 1, now });
}

test('new Crazy rooms default to half-rounded-down directors for every supported Hub size', () => {
  for (let count = 2; count <= 9; count++) {
    const directors = Math.floor(count / 2);
    const s = create(count);
    assert.equal(s.crazy.playStyle, 'director'); assert.equal(s.crazy.effectivePlayStyle, 'director');
    assert.equal(s.crazy.directors.length, directors);
    assert.equal(V.roles(s).receivers.length, count - directors);
    assert.equal(V.capacity(s), Math.min(3, count - directors));
  }
  assert.deepEqual(create(2).crazy.directors, [1]);
  assert.equal(create(2, { crazyPlayStyle: 'free' }).crazy.effectivePlayStyle, 'free');
});

test('three-person director permissions, delivery and nominated main sharing exclude the director', () => {
  let s = create(); s = act(s, 'start', 0);
  assert.deepEqual(s.crazy.directors, [1]); assert.ok([2, 3].includes(s.speaker));
  s = act(s, 'crazyAssign', 2, { target: 3, text: 'An actor must not send this.' });
  assert.equal(s.replies[2].error, 'not_director'); assert.equal(s.crazy.queue.length, 0);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'The director sends this secret.' });
  assert.equal(s.replies[1].error, ''); assert.equal(s.crazy.prompts[2].status, 'pending');
  assert.equal(E.view(s, 1, 2000).talk.crazy.canAssign, true);
  assert.equal(E.view(s, 2, 2000).talk.crazy.canAssign, false);
  assert.equal(E.view(s, 3, 2000).talk.crazy.receiverStatuses.length, 1);
  assert.ok(!JSON.stringify(E.view(s, 3, 2000)).includes('The director sends this secret.'));
});

test('three-person rotation waits for the next actor mission and safely exchanges one role', () => {
  let s = create(); s = act(s, 'start', 0);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Keep this actor busy during rotation.' });
  s = shown(s);
  s = act(s, 'clockTick', 0, { now: 61000 });
  assert.deepEqual(s.crazy.directors, [1]); assert.equal(s.crazy.nextRotateAt, 66000);
  assert.equal(s.crazy.prompts[2].status, 'pending');
  s = act(s, 'crazyDone', 2, { promptId: s.crazy.prompts[2].id, now: 62000 });
  s = act(s, 'clockTick', 0, { now: 66000 });
  assert.deepEqual(s.crazy.directors, [2]); assert.ok([1, 3].includes(s.speaker));
  assert.ok(!s.remaining.includes(2)); assert.equal(s.scores[2], 1);
  s = act(s, 'crazyAssign', 1, { target: 3, text: 'Former director cannot send.' });
  assert.equal(s.replies[1].error, 'not_director');
  s = act(s, 'crazyAssign', 2, { target: 3, text: 'New director can send.' });
  assert.equal(s.replies[2].error, '');
});

test('director preference safely falls back below two active members and explicit legacy free stays free', () => {
  const s = create(); s.roster[1].active = false; s.roster[2].active = false;
  V.init(s, { now: 2000 });
  assert.equal(s.crazy.playStyle, 'director'); assert.equal(s.crazy.effectivePlayStyle, 'free');
  assert.deepEqual(s.crazy.directors, []); assert.equal(s.crazy.nextRotateAt, 0);
  s.roster[1].active = true; V.init(s, { now: 3000 });
  assert.equal(s.crazy.directors.length, 1); assert.equal(s.crazy.effectivePlayStyle, 'director');
  const explicit = create(3, { crazyPlayStyle: 'free' }); V.init(explicit, { now: 4000 });
  assert.equal(explicit.crazy.playStyle, 'free'); assert.deepEqual(explicit.crazy.directors, []);
  const legacy = clone(explicit); delete legacy.crazy.playStyle;
  V.init(legacy, { now: 5000 }); assert.equal(legacy.crazy.playStyle, 'free');
});

test('membership role fill cannot turn the current main speaker into a director', () => {
  for (const conversationMode of ['assigned', 'random']) {
    let s = create(3, { conversationMode }); s = act(s, 'start', 0);
    s = E.membership(s, { added: [{ playerNum: 4, name: 'New actor' }], inactiveNums: [1] }, { now: 3000, seed: 13 });
    assert.equal(s.crazy.directors.length, 1); assert.equal(s.crazy.effectivePlayStyle, 'director');
    assert.ok(!s.crazy.directors.includes(s.speaker));
    assert.ok(s.remaining.every(num => !s.crazy.directors.includes(num)));
    assert.ok([2, 3, 4].includes(s.speaker));
  }
  for (const legacyCommand of [false, true]) {
    let s = create(4, { sharedControls: true }); s = act(s, 'start', 0);
    assert.deepEqual(s.crazy.directors, [1, 2]); assert.equal(s.speaker, 3);
    s = legacyCommand ? act(s, 'exclude', 1, { playerNum: 4, active: false, onlineNums: [1, 2, 3, 4] })
      : E.membership(s, { inactiveNums: [4] }, { now: 3000, seed: 13 });
    assert.deepEqual(s.crazy.directors, [1]); assert.equal(s.speaker, 3);
    assert.ok(s.remaining.includes(2), 'the freed director joins this conversation round as an actor');
  }
});

test('newTopic inherits explicit free and entering Crazy from Normal supports director mode with two participants', () => {
  const replacement = { confirm: true, topic: { question: 'Choose our next shared cafe.' },
    mode: 'think', seconds: 45, showStarters: true, gameMode: 'crazy' };
  let s = create(3, { crazyPlayStyle: 'free' }); s = act(s, 'newTopic', 0, replacement);
  assert.equal(s.replies[0].error, ''); assert.equal(s.crazy.playStyle, 'free');
  const normal = create(3, { gameMode: 'normal' });
  const crazy = act(normal, 'newTopic', 0, replacement);
  assert.equal(crazy.replies[0].error, ''); assert.equal(crazy.crazy.playStyle, 'director');
  assert.equal(crazy.crazy.directors.length, 1);
  const smallest = act(create(2, { gameMode: 'normal' }), 'newTopic', 0, replacement);
  assert.equal(smallest.replies[0].error, ''); assert.deepEqual(smallest.crazy.directors, [1]);
});

test('own check-in appears ten seconds before 150s expiry and scales to configured mission durations', () => {
  for (const [seconds, offset] of [[30, 20000], [150, 140000], [300, 140000]]) {
    const s = shown(pending({ crazyTaskSeconds: seconds })), p = s.crazy.prompts[2];
    assert.equal(E.view(s, 2, p.at + offset - 1).talk.crazy.prompt.checkIn, false);
    assert.equal(E.view(s, 2, p.at + offset - 1).talk.crazy.prompt.checkInAt, p.at + offset);
    assert.equal(E.view(s, 2, p.at + offset).talk.crazy.prompt.checkIn, true);
    assert.equal(E.view(s, 2, p.expiresAt).talk.crazy.prompt.checkIn, false);
    assert.equal(E.view(s, 2, p.expiresAt).talk.crazy.prompt.checkInAt, 0);
    assert.equal(E.view(s, 1, p.at + offset).talk.crazy.prompt, null);
    assert.equal(E.view(s, 0, p.at + offset).talk.crazy.prompt, null);
    assert.equal(E.view(s, 2, p.at + 33000).talk.crazy.prompt.reminder, seconds > 30);
  }
  const unshown = pending();
  assert.equal(E.view(unshown, 2, 142000).talk.crazy.prompt.checkIn, false);
});

test('the check-in boundary produces one authoritative private revision and never repeats on idle ticks', () => {
  let s = shown(pending()), p = s.crazy.prompts[2], checkInAt = p.at + 140000;
  assert.equal(V.due(s, checkInAt - 1), false); assert.equal(V.due(s, checkInAt), true);
  s = act(s, 'clockTick', 0, { now: checkInAt });
  assert.equal(s.crazy.prompts[2].checkInReadyAt, checkInAt);
  assert.equal(s.crazy.events.filter(event => event.type === 'check_in_available').length, 1);
  assert.equal(E.view(s, 2, checkInAt).talk.crazy.prompt.checkIn, true);
  assert.equal(V.due(s, checkInAt + 1), false);
  const before = clone(s.crazy);
  s = act(s, 'clockTick', 0, { now: checkInAt + 1 });
  assert.deepEqual(s.crazy, before);
  let late = shown(pending());
  late = act(late, 'clockTick', 0, { now: late.crazy.prompts[2].expiresAt });
  assert.equal(late.crazy.events.filter(event => event.type === 'check_in_available').length, 0);
  assert.equal(late.crazy.prompts[2].status, 'expired');
});

test('crazyHere is an idempotent prompt-local response without extending TTL, scoring or changing cooldown', () => {
  let s = shown(pending()), p = s.crazy.prompts[2];
  const id = 'exact-here-command', expiresAt = p.expiresAt, nextAssignAt = s.crazy.nextAssignAt;
  s = act(s, 'crazyHere', 2, { id, promptId: p.id, now: p.at + 140000 });
  assert.equal(s.replies[2].error, ''); p = s.crazy.prompts[2];
  assert.equal(p.hereAt, p.at + 140000); assert.equal(p.interactedAt, p.hereAt);
  assert.equal(p.expiresAt, expiresAt); assert.equal(s.crazy.nextAssignAt, nextAssignAt);
  assert.equal(s.scores[2], 0); assert.equal(s.crazy.receivers[2].cooldownUntil, 0);
  assert.equal(E.view(s, 2, p.hereAt + 1).talk.crazy.prompt.checkIn, false);
  assert.equal(E.view(s, 2, p.hereAt + 1).talk.crazy.prompt.checkInAt, 0);
  s = act(s, 'crazyHere', 2, { id, promptId: p.id, now: p.hereAt + 500 });
  assert.equal(s.crazy.events.filter(event => event.type === 'checked_in').length, 1);
  s = act(s, 'clockTick', 0, { now: expiresAt });
  assert.equal(s.crazy.prompts[2].status, 'expired'); assert.equal(s.crazy.receivers[2].paused, false);
  assert.equal(s.scores[2], 0); assert.equal(s.crazy.receivers[2].cooldownUntil, 0);
  const metadata = E.archiveEntries(s).filter(record => record.category === 'event' && record.eventType === 'checked_in');
  assert.equal(metadata.length, 1); assert.ok(!JSON.stringify(metadata).includes(p.text));
});

test('render ACK and unrelated commands cannot stand in for the recipient check-in', () => {
  let s = pending(), p = s.crazy.prompts[2];
  s = act(s, 'crazyHere', 2, { promptId: p.id, now: 2200 }); assert.equal(s.replies[2].error, 'stale_prompt');
  assert.equal(s.crazy.prompts[2].interactedAt, undefined);
  s = shown(s); p = s.crazy.prompts[2];
  s = act(s, 'crazyHere', 3, { promptId: p.id, now: 3000 }); assert.equal(s.replies[3].error, 'stale_prompt');
  s = act(s, 'crazyRendered', 2, { promptId: p.id, renderVersion: 1, now: 4000 });
  s = act(s, 'note', 2, { text: 'This is unrelated.', now: 4500 });
  assert.equal(s.crazy.prompts[2].interactedAt, undefined);
  s = act(s, 'clockTick', 0, { now: p.expiresAt });
  assert.equal(s.crazy.receivers[2].paused, true); assert.equal(s.scores[2], 0);
});

test('late, replaced, stale-session and unrendered check-ins never revive tasks or mutate another lifecycle', () => {
  let s = shown(pending()), p = clone(s.crazy.prompts[2]);
  const stale = act(s, 'crazyHere', 2, { promptId: p.id, sessionId: 'previous-session', now: 3000 });
  assert.equal(stale.crazy.prompts[2].interactedAt, undefined);
  s = act(s, 'crazyHere', 2, { promptId: 'another-prompt', now: 4000 });
  assert.equal(s.replies[2].error, 'stale_prompt'); assert.equal(s.crazy.prompts[2].interactedAt, undefined);
  s = act(s, 'crazyHere', 2, { promptId: p.id, renderVersion: 2, now: 5000 });
  assert.equal(s.replies[2].error, 'stale_prompt');
  s = act(s, 'crazyHere', 2, { promptId: p.id, now: p.expiresAt });
  assert.equal(s.replies[2].error, 'stale_prompt'); assert.equal(s.crazy.prompts[2].status, 'expired');
  assert.equal(s.crazy.receivers[2].paused, true); assert.equal(s.scores[2], 0);
  const direct = shown(pending());
  assert.equal(V.action(direct, { type: 'crazyHere', id: 'missing-session', actor: 2,
    promptId: direct.crazy.prompts[2].id, now: 3000 }), 'stale_session');
  assert.equal(direct.crazy.prompts[2].interactedAt, undefined);
});

test('a replacement never inherits a previous task check-in and rejects that former prompt ID', () => {
  let s = create(3, { crazyPlayStyle: 'free', crazySource: 'mixed', conversationMode: 'free',
    crazyMinSeconds: 300, crazyMaxSeconds: 300 });
  s = act(s, 'start', 0);
  assert.equal(V.assign(s, { id: 'former-system', source: 'system', text: 'Represent the spoon union.', kind: 'task' }, 2,
    { actor: 0, now: 2000, seed: 15 }), true);
  s = shown(s); const former = clone(s.crazy.prompts[2]);
  s = act(s, 'crazyHere', 2, { promptId: former.id, now: 142000 });
  assert.equal(s.replies[2].error, '');
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Run for mayor of this cafe.', now: 143000 });
  const offer = s.crazy.offers[2]; assert.ok(offer);
  s = act(s, 'crazyReplace', 2, { offerId: offer.id, promptId: former.id, now: 144000 });
  assert.equal(s.replies[2].error, '');
  const replacement = clone(s.crazy.prompts[2]);
  assert.notEqual(replacement.id, former.id); assert.equal(replacement.hereAt, undefined);
  assert.equal(replacement.interactedAt, undefined); assert.equal(replacement.checkInReadyAt, undefined);
  s = shown(s, 144100);
  assert.equal(E.view(s, 2, 144100).talk.crazy.prompt.checkInAt, 284000);
  s = act(s, 'crazyHere', 2, { promptId: former.id, now: 284000 });
  assert.equal(s.replies[2].error, 'stale_prompt'); assert.equal(s.crazy.prompts[2].interactedAt, undefined);
  s = act(s, 'clockTick', 0, { now: replacement.expiresAt });
  assert.equal(s.crazy.prompts[2].status, 'expired'); assert.equal(s.crazy.receivers[2].paused, true);
  assert.equal(s.scores[2], 0);
});
