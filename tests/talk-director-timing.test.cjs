'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const V = require('../talk-vnext.js');
const roster = Array.from({ length: 5 }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) }));
let serial = 0;
const room = (options = {}) => E.create({ id: 'rotation-' + ++serial, now: 1000, roster,
  topic: { question: 'Invent a silly cafe together.' }, gameMode: 'crazy', crazySource: 'players',
  conversationMode: 'assigned', gameSeconds: 900, ...options });
const act = (s, type, actor, options = {}) => E.apply(s, { id: 'rotation-action-' + ++serial, type, actor,
  sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: 17, ...options });

test('new engine and lifecycle defaults use two minutes while explicit supported durations are retained', () => {
  const s = room(); assert.equal(s.crazy.rotationSeconds, 120); assert.equal(s.crazy.nextRotateAt, 121000);
  delete s.crazy.rotationSeconds; delete s.crazy.nextRotateAt;
  V.init(s, { now: 3000 }); assert.equal(s.crazy.rotationSeconds, 120); assert.equal(s.crazy.nextRotateAt, 123000);
  for (const seconds of [60, 121, 240, 300, 360, 900]) assert.equal(room({ crazyRotationSeconds: seconds }).crazy.rotationSeconds, seconds);
  for (const seconds of [59, 120.5, 901]) assert.throws(() => room({ crazyRotationSeconds: seconds }), { message: 'invalid_settings' });
});

test('an existing four-minute round keeps its exact rotation clock and inherited next-topic choice', () => {
  let s = room({ crazyRotationSeconds: 240 }); s = act(s, 'start', 0, { now: 1000 });
  const deadline = s.crazy.nextRotateAt;
  V.init(s, { now: 90000 }); assert.equal(s.crazy.nextRotateAt, deadline); assert.equal(s.crazy.rotationSeconds, 240);
  s = act(s, 'clockTick', 0, { now: 121000 }); assert.deepEqual(s.crazy.directors, [1, 2]);
  assert.equal(s.crazy.nextRotateAt, 241000);
  s = act(s, 'clockTick', 0, { now: 241000 }); assert.deepEqual(s.crazy.directors, [2, 3]);
  s = act(s, 'crazyDrain', 0, { now: 242000, hostAuthorized: true });
  const replacement = { confirm: true, topic: { question: 'Choose our next cafe.' }, mode: 'think', seconds: 45,
    showStarters: true, gameMode: 'crazy', now: 243000 };
  s = act(s, 'newTopic', 0, replacement); assert.equal(s.replies[0].error, ''); assert.equal(s.crazy.rotationSeconds, 240);
  const normal = room({ gameMode: 'normal' });
  const firstCrazy = act(normal, 'newTopic', 0, replacement);
  assert.equal(firstCrazy.replies[0].error, ''); assert.equal(firstCrazy.crazy.rotationSeconds, 120);
});

test('two-minute rotation waits for the selected busy actor and then exchanges exactly one seat', () => {
  let s = room(); s = act(s, 'start', 0, { now: 1000 });
  s = act(s, 'crazyAssign', 1, { target: 3, text: 'Keep this mission until its actor responds.' });
  const id = s.crazy.prompts[3].id, expiresAt = s.crazy.prompts[3].expiresAt;
  s = act(s, 'crazyRendered', 3, { promptId: id, renderVersion: 1, now: 2100 });
  s = act(s, 'clockTick', 0, { now: 121000 });
  assert.deepEqual(s.crazy.directors, [1, 2]); assert.equal(s.crazy.nextRotateAt, 126000);
  assert.equal(s.crazy.prompts[3].status, 'pending'); assert.equal(s.crazy.prompts[3].expiresAt, expiresAt);
  s = act(s, 'crazySkip', 3, { promptId: id, now: 122000 });
  s = act(s, 'clockTick', 0, { now: 126000 });
  assert.deepEqual(s.crazy.directors, [2, 3]); assert.equal(s.crazy.nextRotateAt, 246000);
  assert.equal(s.crazy.prompts[3].status, 'skipped'); assert.equal(s.scores[3], 0);
  assert.ok(!s.crazy.directors.includes(s.speaker));
});

test('the new default lets all nine idle participants reach a director turn within ten minutes', () => {
  const largeRoster=Array.from({length:9},(_,i)=>({playerNum:i+1,name:'Player '+(i+1)}));
  let s=room({roster:largeRoster});s=act(s,'start',0,{now:1000});
  const directed=new Set(s.crazy.directors);assert.deepEqual([...directed],[1,2,3,4]);
  for(let exchange=0;exchange<5;exchange++) {
    const before=s.crazy.directors.slice();s=act(s,'clockTick',0,{now:s.crazy.nextRotateAt});
    assert.equal(before.filter(num=>!s.crazy.directors.includes(num)).length,1);
    for(const num of s.crazy.directors)directed.add(num);
    assert.ok(!s.crazy.directors.includes(s.speaker));
  }
  assert.equal(directed.size,9);assert.equal(s.crazy.nextRotateAt-120000,601000);
  assert.equal(s.gameDeadline,901000);assert.equal(s.crazy.roundStage,'open');
});
