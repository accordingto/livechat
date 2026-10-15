'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const V = require('../talk-vnext.js');
const clone = value => structuredClone(value);
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) }));
let serial = 0;
function room(count, options = {}) {
  return E.create({ id: 'balanced-' + ++serial, roster: roster(count), topic: { question: 'Invent a silly cafe.' },
    now: 1000, gameMode: 'crazy', crazySource: 'players', conversationMode: 'assigned',
    crazyRotationSeconds: 60, gameSeconds: 900, ...options });
}
const act = (s, type, actor, options = {}) => E.apply(s, { id: 'balanced-action-' + ++serial,
  type, actor, sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: 23, ...options });
function assertBalanced(s, count) {
  assert.equal(s.crazy.directorCount, Math.floor(count / 2));
  assert.equal(V.roles(s).directors.length, Math.floor(count / 2));
  assert.equal(V.roles(s).receivers.length, Math.ceil(count / 2));
  assert.ok(V.roles(s).directors.length <= V.roles(s).receivers.length);
}

test('legacy automatic or oversized director counts migrate to the same participant-derived limit', () => {
  for (let count = 2; count <= 9; count++) for (const legacyCount of [1, 2, 3, 9, 999]) {
    const s = room(count);
    s.crazy.directorCount = legacyCount;
    s.crazy.directors = roster(count).map(player => player.playerNum);
    V.init(s, { now: 2000 });
    assertBalanced(s, count);
    assert.deepEqual(s.crazy.directors, roster(Math.floor(count / 2)).map(player => player.playerNum));
  }
});

test('an old six-to-nine-player room grows from two automatic directors on an authoritative pulse', () => {
  for (const count of [6, 7, 8, 9]) {
    let s = room(count); s = act(s, 'start', 0);
    s.crazy.directorCount = 2; s.crazy.directors = [1, 2];
    assert.equal(V.due(s, 3000), true); assert.equal(E.timerDue(s, 3000), true);
    s = act(s, 'clockTick', 0, { now: 3000 });
    assertBalanced(s, count); assert.ok(!s.crazy.directors.includes(s.speaker));
    assert.equal(V.due(s, 3001), false);
    assert.strictEqual(act(s, 'clockTick', 0, { now: 3001 }), s, 'migration is not an endless idle write');
  }
});

test('increased director target waits for busy actors and fills each newly idle slot without cancelling tasks', () => {
  let s = room(8, { crazyPlayStyle: 'free', conversationMode: 'free', crazyMaxActive: 9 });
  s = act(s, 'start', 0);
  for (let num = 3; num <= 8; num++) {
    s = act(s, 'crazyAssign', 1, { target: num, text: 'A live private mission for actor ' + num });
    s = act(s, 'crazyRendered', num, { promptId: s.crazy.prompts[num].id, renderVersion: 1, now: 2100 });
  }
  const pending = clone(s.crazy.prompts);
  s.crazy.playStyle = 'director'; s.crazy.effectivePlayStyle = 'director';
  s.crazy.directorCount = 2; s.crazy.directors = [1, 2];
  V.init(s, { now: 3000 });
  assert.equal(s.crazy.directorCount, 4); assert.deepEqual(s.crazy.directors, [1, 2]);
  assert.deepEqual(s.crazy.prompts, pending); assert.equal(V.due(s, 3000), false, 'busy-only deficit does not spin');
  s = act(s, 'crazyDone', 3, { promptId: pending[3].id, now: 4000 });
  assert.deepEqual(s.crazy.directors, [1, 2, 3]); assert.equal(s.scores[3], 1);
  for (const num of [4, 5, 6, 7, 8]) assert.deepEqual(s.crazy.prompts[num], pending[num]);
  s = act(s, 'crazySkip', 4, { promptId: pending[4].id, now: 5000 });
  assert.deepEqual(s.crazy.directors, [1, 2, 3, 4]); assert.equal(s.scores[4], 0);
  for (const num of [5, 6, 7, 8]) assert.deepEqual(s.crazy.prompts[num], pending[num]);
  assertBalanced(s, 8);
});

test('membership addition and removal rebalance all sizes while keeping nominated sharing on an actor', () => {
  let s = room(2); s = act(s, 'start', 0);
  for (let count = 3; count <= 9; count++) {
    s = E.membership(s, { added: [{ playerNum: count, name: 'Person ' + count }], inactiveNums: [] }, { now: 3000 + count, seed: 23 });
    assertBalanced(s, count); assert.ok(!s.crazy.directors.includes(s.speaker));
    assert.ok(s.remaining.every(num => !s.crazy.directors.includes(num)));
  }
  for (let count = 8; count >= 2; count--) {
    s = E.membership(s, { inactiveNums: roster(9).map(p => p.playerNum).filter(num => num > count) }, { now: 5000 + (9 - count), seed: 23 });
    assertBalanced(s, count); assert.ok(!s.crazy.directors.includes(s.speaker));
    assert.ok(s.remaining.every(num => num <= count && !s.crazy.directors.includes(num)));
  }
  s.roster[1].active = false; V.init(s, { now: 6000 });
  assert.equal(s.crazy.playStyle, 'director'); assert.equal(s.crazy.effectivePlayStyle, 'free');
  assert.equal(s.crazy.directorCount, 0); assert.deepEqual(s.crazy.directors, []);
});

test('two-player rotation exchanges the one director and actor only after the live mission closes', () => {
  let s = room(2); s = act(s, 'start', 0);
  assertBalanced(s, 2); assert.equal(s.speaker, 2);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Introduce your spoon as royalty.' });
  const original = s.crazy.prompts[2].id;
  s = act(s, 'crazyRendered', 2, { promptId: original, renderVersion: 1, now: 2100 });
  s = act(s, 'clockTick', 0, { now: 61000 });
  assert.deepEqual(s.crazy.directors, [1]); assert.equal(s.crazy.prompts[2].status, 'pending');
  assert.equal(s.crazy.nextRotateAt, 66000);
  s = act(s, 'crazySkip', 2, { promptId: original, now: 62000 });
  s = act(s, 'clockTick', 0, { now: 66000 });
  assert.deepEqual(s.crazy.directors, [2]); assert.equal(s.speaker, 1);
  assert.deepEqual(V.roles(s).receivers, [1]); assert.equal(V.capacity(s), 1);
  assert.equal(s.crazy.prompts[2].status, 'skipped'); assert.equal(s.scores[2], 0);
  s = act(s, 'crazyAssign', 2, { target: 1, text: 'A new actor receives a fresh challenge.', now: 67000 });
  assert.equal(s.replies[2].error, ''); assert.equal(s.crazy.prompts[1].status, 'pending');
  assert.notEqual(s.crazy.prompts[1].id, original);
  assert.equal(E.view(s, 1, 67000).talk.crazy.canAssign, false);
  assert.equal(E.view(s, 2, 67000).talk.crazy.canAssign, true);
});

test('explicit free play is never converted by old automatic director metadata', () => {
  for (const count of [2, 6, 9]) {
    const s = room(count, { crazyPlayStyle: 'free' }); s.crazy.directorCount = 999;
    V.init(s, { now: 2000 });
    assert.equal(s.crazy.playStyle, 'free'); assert.equal(s.crazy.effectivePlayStyle, 'free');
    assert.equal(s.crazy.directorCount, Math.floor(count / 2)); assert.deepEqual(s.crazy.directors, []);
    assert.equal(V.roles(s).receivers.length, count);
    assert.ok(roster(count).every(player => E.view(s, player.playerNum, 2000).talk.crazy.canAssign));
  }
});
