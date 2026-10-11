// Whole-round clocks and controls are independent of browser cadence and Crazy missions.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const { adapters } = require('../runtime/story-executor.cjs');
const topic = { id: 'round', question: 'How should we build our island?' };
let sequence = 0;
const create = (options = {}) => E.create({ id: 'round-session', topic, now: 1000, gameSeconds: 60,
  roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'Player ' + playerNum })), ...options });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, { id: 'round-' + ++sequence,
  actor, type, sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: 57, ...extra });

test('whole game clock starts at discussion start and normal mode ends precisely at its deadline', () => {
  let s = create(); assert.equal(s.gameDeadline, 0); assert.equal(E.timerDue(s, 2000), false);
  s = act(s, 'start'); assert.equal(s.gameDeadline, 62000); assert.equal(s.phase, 'talking');
  assert.equal(E.timerDue(s, 61999), false); assert.equal(E.crazyDue(s, 62000), true);
  assert.equal(act(s, 'clockTick', 0, { now: 61999 }), s);
  s = act(s, 'clockTick', 0, { now: 62000 }); assert.equal(s.phase, 'ended'); assert.equal(s.speaker, null);
  assert.deepEqual(s.scores, { 1: 0, 2: 0, 3: 0 }); assert.equal(E.timerDue(s, 62000), false);
});

test('clockTick auto-starts both modes after preparation only when at least two players are available', () => {
  for (const gameMode of ['normal', 'crazy']) {
    let s = create({ gameMode, sharedControls: true });
    assert.equal(act(s, 'clockTick', 0, { now: 46000, onlineNums: [1] }), s);
    s = act(s, 'clockTick', 0, { now: 46000, onlineNums: [1, 3] });
    assert.equal(s.phase, 'talking'); assert.equal(s.gameDeadline, 106000); assert.ok([1, 3].includes(s.speaker));
    if (gameMode === 'crazy') assert.ok(s.crazy.nextAssignAt > 46000);
  }
});

test('real runtime pulses normal preparations and normal round deadlines, with no idle revisions', () => {
  let s = create(); const adapter = adapters.letstalk;
  assert.equal(adapter.pulse(s, { now: 45999 }), s);
  s = adapter.pulse(s, { now: 46000 }); assert.equal(s.phase, 'talking'); assert.equal(s.gameDeadline, 106000);
  assert.equal(adapter.pulse(s, { now: 105999 }), s);
  s = adapter.pulse(s, { now: 106000 }); assert.equal(s.phase, 'ended'); assert.equal(adapter.pulse(s, { now: 999999 }), s);
});

test('only manager or shared authenticated players can add allowed time and finish, with turn fences', () => {
  let s = act(create(), 'start'); const original = s.gameDeadline;
  s = act(s, 'addTime', 1, { seconds: 60 }); assert.equal(s.replies[1].error, 'not_available'); assert.equal(s.gameDeadline, original);
  s = act(s, 'finish', 1); assert.equal(s.phase, 'talking'); assert.equal(s.replies[1].error, 'not_available');
  s.sharedControls = true;
  for (const seconds of [0, 59, 61, 301, '60', 60.5]) { const next = act(s, 'addTime', 2, { seconds }); assert.equal(next.replies[2].error, 'not_available'); assert.equal(next.gameDeadline, original); }
  s = act(s, 'addTime', 2, { seconds: 60 }); assert.equal(s.gameDeadline, original + 60000);
  s = act(s, 'addTime', 3, { seconds: 300 }); assert.equal(s.gameDeadline, original + 360000);
  const deadline = s.gameDeadline;
  s = act(s, 'addTime', 2, { seconds: 60, turnId: s.turnId - 1 }); assert.equal(s.replies[2].error, 'stale_turn'); assert.equal(s.gameDeadline, deadline);
  assert.equal(act(s, 'finish', 8), s); assert.equal(act(s, 'finish', 2, { sessionId: 'old' }), s);
  const view = E.view(s, 2, 2000).talk; assert.equal(view.actions.addTime, true); assert.equal(view.actions.finish, true);
  s = act(s, 'finish', 2); assert.equal(s.phase, 'ended'); assert.equal(E.view(s, 2, 2000).talk.actions.finish, false);
});

test('round expiry cancels pending tasks, freezes points, and blocks late done, addTime, start and unpause', () => {
  let s = act(create({ gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5, crazyTaskSeconds: 300, sharedControls: true }), 'start');
  s = act(s, 'clockTick', 0, { now: 7000 }); const firstNum = E.view(s, 0, 7000).talk.crazy.pendingPlayerNums[0];
  s = act(s, 'crazyDone', firstNum, { promptId: s.crazy.prompts[firstNum].id, now: 7000 });
  s = act(s, 'clockTick', 0, { now: 12000 }); const num = E.view(s, 0, 12000).talk.crazy.pendingPlayerNums[0], promptId = s.crazy.prompts[num].id;
  s = act(s, 'crazyDone', num, { promptId, now: 62000 }); assert.equal(s.phase, 'ended'); assert.equal(s.replies[num].error, 'not_available');
  assert.equal(s.crazy.prompts[num].status, 'cancelled'); assert.equal(s.crazy.nextAssignAt, 0); assert.equal(s.scores[firstNum], 1);
  const frozen = structuredClone(s.scores);
  for (const [type, extra] of [['addTime', { seconds: 300 }], ['start', {}], ['crazyPause', { paused: false }], ['crazyAssign', { text: 'Late mission.' }]]) {
    s = act(s, type, 2, { now: 63000, ...extra }); assert.equal(s.phase, 'ended'); assert.equal(s.replies[2].error, 'not_available'); assert.deepEqual(s.scores, frozen);
  }
});

test('expiry wins over same-millisecond addTime and completion, including a replayed old command ID', () => {
  let s = act(create({ sharedControls: true }), 'start');
  s = act(s, 'addTime', 1, { seconds: 60, now: 62000 }); assert.equal(s.phase, 'ended'); assert.equal(s.gameDeadline, 62000);
  let c = act(create({ gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5, crazyTaskSeconds: 30 }), 'start');
  c = act(c, 'clockTick', 0, { now: 7000 }); const num = E.view(c, 0, 7000).talk.crazy.pendingPlayerNums[0];
  const early = { id: 'wrong-prompt', type: 'crazyDone', actor: num, sessionId: c.sessionId, now: 7001, promptId: 'wrong' };
  c = E.apply(c, early); c = E.apply(c, { ...early, now: 37000 });
  assert.equal(c.crazy.prompts[num].status, 'expired'); assert.equal(c.scores[num], 0);
});

test('new topic after rest resets points and inherits game/task durations unless explicitly changed', () => {
  let s = act(create({ gameSeconds: 601, crazyTaskSeconds: 239, sharedControls: true }), 'start');
  s.scores[2] = 3; s = act(s, 'finish', 1);
  const options = { confirm: true, topic, mode: 'write', seconds: 30, gameMode: 'crazy', showStarters: false };
  s = act(s, 'newTopic', 3, options); assert.equal(s.phase, 'thinking'); assert.equal(s.gameDeadline, 0);
  assert.equal(s.gameSeconds, 601); assert.equal(s.crazy.taskSeconds, 239); assert.deepEqual(s.scores, { 1: 0, 2: 0, 3: 0 });
  for (const extra of [{ gameSeconds: 59 }, { crazyTaskSeconds: 301 }, { gameSeconds: 60.5 }]) {
    const next = act(s, 'newTopic', 2, { ...options, ...extra }); assert.equal(next.replies[2].error, 'invalid_settings'); assert.equal(next.sessionId, s.sessionId);
  }
  s = act(s, 'newTopic', 1, { ...options, gameSeconds: 120, crazyTaskSeconds: 30 }); assert.equal(s.gameSeconds, 120); assert.equal(s.crazy.taskSeconds, 30);
});

test('normal projections retain configured task duration for switching modes later', () => {
  const s = create({ crazyTaskSeconds: 239, gameSeconds: 601 }), view = E.view(s, 1, 0).talk;
  assert.equal(view.crazyTaskSeconds, 239); assert.equal(view.gameSeconds, 601); assert.equal(view.gameDeadline, 0);
  assert.equal(view.crazy.taskSeconds, 239); assert.deepEqual(view.scores, [1, 2, 3].map(playerNum => ({ playerNum, score: 0 })));
});

function firebaseWire(value) {
  if (value == null) return undefined;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, firebaseWire(item)]).filter(([, item]) => item !== undefined);
  if (!entries.length) return undefined;
  return Array.isArray(value) ? entries.map(([, item]) => item) : Object.fromEntries(entries);
}

test('Firebase-stripped overdue preparation stays truly idle with one online player, including duplicate mailboxes', () => {
  for (const gameMode of ['normal', 'crazy']) {
    const command = { id: 'saved-ready', type: 'ready', actor: 1, sessionId: 'round-session', now: 2000 };
    let s = firebaseWire(E.apply(create({ gameMode, sharedControls: true }), command));
    assert.equal(s.notes, undefined); assert.equal(s.remaining, undefined); assert.equal(s.replies[1].id, command.id);
    const ctx = { now: 46000, onlineNums: [1] };
    for (let i = 0; i < 5; i++) {
      const snapshot = JSON.stringify(s);
      assert.equal(adapters.letstalk.pulse(s, ctx), s, 'idle runtime pulse preserves the authoritative reference');
      assert.equal(E.apply(s, { ...command, now: ctx.now, onlineNums: ctx.onlineNums }), s, 'duplicate mailbox cannot normalize a new revision');
      assert.equal(JSON.stringify(s), snapshot); s = firebaseWire(s);
    }
    s = adapters.letstalk.pulse(s, { ...ctx, onlineNums: [1, 3] });
    assert.equal(s.phase, 'talking'); assert.equal(s.gameDeadline, 106000);
  }
});

test('legacy Firebase-stripped waiting rooms migrate once and then produce no repeated clock revisions', () => {
  for (const gameMode of ['normal', 'crazy']) {
    const command = { id: 'legacy-ready', type: 'ready', actor: 1, sessionId: 'round-session', now: 2000 };
    let old = E.apply(create({ gameMode, sharedControls: true }), command);
    delete old.gameSeconds; delete old.crazyTaskSeconds; delete old.gameDeadline; delete old.scores;
    if (old.crazy) { delete old.crazy.schedulerVersion; delete old.crazy.taskSeconds; delete old.crazy.nextAssignAt; }
    old = firebaseWire(old);
    const ctx = { now: 46000, onlineNums: [1] }, migrated = adapters.letstalk.pulse(old, ctx);
    assert.notEqual(migrated, old); assert.equal(migrated.phase, 'thinking'); assert.equal(migrated.gameDeadline, 0);
    assert.equal(migrated.gameSeconds, 900); assert.deepEqual(migrated.scores, { 1: 0, 2: 0, 3: 0 });
    if (gameMode === 'crazy') assert.equal(migrated.crazy.schedulerVersion, 2);
    let s = firebaseWire(migrated);
    for (let i = 0; i < 5; i++) {
      assert.equal(adapters.letstalk.pulse(s, ctx), s);
      assert.equal(E.apply(s, { ...command, now: ctx.now, onlineNums: ctx.onlineNums }), s);
      s = firebaseWire(s);
    }
  }
});
