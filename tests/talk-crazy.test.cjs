const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../talk-engine.js');
const C = require('../talk-crazy.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const topic = { id: 'apartment', question: 'What kind of home would we share?', followUp: 'Who should wash the dishes?' };
let serial = 0;
const create = (options = {}) => E.create({ id: 'crazy-session', topic, now: 1000, gameMode: 'crazy',
  roster: [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Person ' + playerNum })), ...options });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, { id: 'crazy-event-' + (++serial),
  type, actor, sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: serial * 511, ...extra });
const begin = options => act(create({ crazyMinSeconds: 5, crazyMaxSeconds: 5, ...options }), 'start');
const pendingCount = s => Object.values(s.crazy.prompts || {}).filter(p => p.status === 'pending').length;
const due = s => act(s, 'clockTick', 0, { now: s.crazy.nextAssignAt });
function twoPending(s) { return due(due(s)); }

test('pool has unique short simple English lines and tasks', () => {
  assert.ok(C.pool.length >= 96); assert.equal(new Set(C.pool.map(p => p.id)).size, C.pool.length);
  assert.equal(new Set(C.pool.map(p => p.text)).size, C.pool.length);
  assert.ok(C.pool.some(p => p.kind === 'line')); assert.ok(C.pool.some(p => p.kind === 'task'));
  for (const p of C.pool) { assert.ok(['line', 'task'].includes(p.kind)); assert.ok(p.text.length <= 240); assert.match(p.text, /^[\x20-\x7e]+$/); }
});

test('start draws one deterministic global deadline within the chosen range for every room size', () => {
  for (let count = 2; count <= 9; count++) {
    const initial = create({ crazyMinSeconds: 20, crazyMaxSeconds: 80,
      roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1 })) });
    assert.equal(initial.crazy.nextAssignAt, 0); assert.equal(initial.gameDeadline, 0);
    const input = { id: 'start', type: 'start', actor: 0, sessionId: initial.sessionId, now: 100000, seed: 425 };
    const s = E.apply(initial, input); assert.deepEqual(s, E.apply(initial, input));
    assert.ok(s.crazy.nextAssignAt >= 120000 && s.crazy.nextAssignAt <= 180000);
    assert.equal(s.crazy.nextAt, undefined); assert.equal(s.gameDeadline, 1000000);
    assert.equal(E.timerDue(s, s.crazy.nextAssignAt - 1), false); assert.deepEqual(initial.crazy.prompts, {});
  }
  assert.deepEqual(E.crazyRange(create()), { minSeconds: 60, maxSeconds: 180 });
});

test('fixed range creates repeated shared slots; invalid game, task, and interval settings fail', () => {
  let s = begin(); assert.equal(s.crazy.nextAssignAt, 7000);
  s = due(s); assert.equal(pendingCount(s), 1); assert.equal(s.crazy.nextAssignAt, 12000);
  for (const options of [{ crazyMinSeconds: 4 }, { crazyMaxSeconds: 301 }, { crazyMinSeconds: 80, crazyMaxSeconds: 20 },
    { crazyMinSeconds: 5.5 }, { gameSeconds: 59 }, { gameSeconds: 3601 }, { gameSeconds: 90.5 },
    { crazyTaskSeconds: 29 }, { crazyTaskSeconds: 301 }, { crazyTaskSeconds: 30.5 }]) assert.throws(() => create(options), /invalid_settings/);
  for (const options of [{ gameSeconds: 60, crazyTaskSeconds: 30 }, { gameSeconds: 3600, crazyTaskSeconds: 300 }]) assert.doesNotThrow(() => create(options));
});

test('one slot reveals one task and repeated idle or concurrent ticks cannot fill the room at once', () => {
  let s = begin(); assert.equal(act(s, 'clockTick', 0, { now: 6999 }), s);
  s = act(s, 'crazyTick', 0, { now: 7000 }); assert.equal(pendingCount(s), 1);
  assert.equal(act(s, 'clockTick', 0, { now: 7000 }), s);
  s = act(s, 'clockTick', 0, { now: 12000 }); assert.equal(pendingCount(s), 2);
  const deadline = s.crazy.nextAssignAt;
  for (let i = 0; i < 10; i++) assert.equal(act(s, 'clockTick', 0, { now: 17000 }), s);
  assert.equal(s.crazy.nextAssignAt, deadline); assert.equal(E.timerDue(s, 17000), false);
});

test('a background return produces one assignment and draws a future global slot', () => {
  let s = act(begin(), 'clockTick', 0, { now: 500000 });
  assert.equal(pendingCount(s), 1); assert.equal(s.crazy.nextAssignAt, 505000);
  assert.equal(act(s, 'clockTick', 0, { now: 500000 }), s);
});

test('legacy crazySend only redraws the shared deadline and never immediately sends a task', () => {
  let s = begin(); s = act(s, 'crazySend', 0, { now: 10000 });
  assert.deepEqual(s.crazy.prompts, {}); assert.equal(s.crazy.nextAssignAt, 15000);
  s = due(s); const saved = clone(s.crazy.prompts);
  s = act(s, 'crazySend', 0, { now: 16000 }); assert.deepEqual(s.crazy.prompts, saved);
  assert.equal(E.view({ ...s, sharedControls: true }, 1, 0).talk.actions.crazySend, false);
});

test('player queue has priority and stays private until a future timed slot', () => {
  let s = begin(); const text = 'My soup needs a hat.';
  s = act(s, 'crazyAssign', 1, { target: 2, text, kind: 'line', now: 3000 });
  assert.deepEqual(s.crazy.prompts, {}); assert.equal(s.crazy.nextAssignAt, 7000);
  for (let num = 0; num <= 4; num++) assert.equal(JSON.stringify(E.view(s, num, 3000)).includes(text), false);
  s = due(s); assert.equal(s.crazy.prompts[2].text, text); assert.equal(s.crazy.prompts[2].assignedBy, 1);
  assert.equal(s.crazy.prompts[2].source, 'player'); assert.equal(s.crazy.queue.length, 0);
  for (let num = 0; num <= 4; num++) assert.equal(JSON.stringify(E.view(s, num, 7000)).includes(text), num === 2);
});

test('random recipient is resolved at delivery, excludes author, and varies across seeds', () => {
  const recipients = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    let s = create({ crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 });
    s = act(s, 'crazyAssign', 1, { text: 'Announce a new holiday.', now: 1000 });
    assert.equal(s.crazy.queue[0].target, null); s = act(s, 'start');
    s = act(s, 'clockTick', 0, { now: 7000, seed: Math.imul(seed, 2654435761) >>> 0 });
    const recipient = Number(Object.keys(s.crazy.prompts)[0]); assert.ok([2, 3, 4].includes(recipient)); recipients.add(recipient);
  }
  assert.ok(recipients.size >= 2);
});

test('queued fixed targets wait for their recipient and FIFO delivery never overwrites an active task', () => {
  let s = begin({ crazySource: 'players' });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'First.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 2, text: 'Second.', now: 4000 }); s = due(s);
  const first = clone(s.crazy.prompts[2]); s = due(s);
  assert.deepEqual(s.crazy.prompts[2], first); assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'crazyDone', 2, { promptId: first.id, now: 12001 });
  assert.equal(s.crazy.nextAssignAt, 17000); s = due(s); assert.equal(s.crazy.prompts[2].text, 'Second.');
});

test('fresh submissions after an overdue slot do not arrive immediately or lose priority to fallback', () => {
  let s = begin({ crazySource: 'players' });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Arrive later.', now: 10000 });
  s = act(s, 'clockTick', 0, { now: 10000 }); assert.deepEqual(s.crazy.prompts, {}); assert.equal(s.crazy.nextAssignAt, 15000);
  s = due(s); assert.equal(s.crazy.prompts[2].text, 'Arrive later.');
  s = begin(); s = act(s, 'crazyAssign', 1, { target: 2, text: 'Reserved slot.', now: 10000 });
  s = act(s, 'clockTick', 0, { now: 10000 }); assert.equal(s.crazy.prompts[2], undefined);
  s = due(s); assert.equal(s.crazy.prompts[2].text, 'Reserved slot.');
});

test('a fresh submission cannot delay an older queued mission already due', () => {
  let s = begin({ crazySource: 'players' });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Older.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 2, text: 'Fresh.', now: 10000 });
  assert.equal(s.crazy.nextAssignAt, 7000); s = act(s, 'clockTick', 0, { now: 10000 });
  assert.equal(s.crazy.prompts[2].text, 'Older.'); assert.equal(s.crazy.queue.length, 1);
});

test('completion adds exactly one point, is prompt-bound across turns, and preserves the shared timer', () => {
  let s = due(begin({ conversationMode: 'assigned' })); const num = Number(Object.keys(s.crazy.prompts)[0]), prompt = s.crazy.prompts[num], turn = s.turnId;
  s = act(s, 'end'); const deadline = s.crazy.nextAssignAt;
  const input = { id: 'complete-once', type: 'crazyDone', actor: num, sessionId: s.sessionId, turnId: turn,
    now: 7000, seed: 53, promptId: prompt.id };
  const next = E.apply(s, input); assert.equal(next.scores[num], 1); assert.equal(next.crazy.prompts[num].status, 'done');
  assert.equal(next.crazy.nextAssignAt, deadline); assert.equal(E.apply(next, input), next); assert.deepEqual(E.apply(s, input), next);
  s = act(next, 'crazyDone', num, { promptId: prompt.id, now: 7001 }); assert.equal(s.replies[num].error, 'stale_prompt'); assert.equal(s.scores[num], 1);
});

test('skip immediately replaces for another player at the exact same timestamp and awards no points', () => {
  let s = due(begin()); const num = Number(Object.keys(s.crazy.prompts)[0]), prompt = s.crazy.prompts[num], deadline = s.crazy.nextAssignAt;
  s = act(s, 'crazySkip', num, { promptId: prompt.id, now: 7000 });
  assert.equal(s.crazy.prompts[num].status, 'skipped'); assert.equal(s.scores[num], 0); assert.equal(pendingCount(s), 1);
  const replacement = E.view(s, 0, 7000).talk.crazy.pendingPlayerNums[0]; assert.notEqual(replacement, num);
  assert.equal(s.crazy.prompts[replacement].at, 7000); assert.equal(s.crazy.nextAssignAt, deadline);
});

test('skip consumes a queued custom replacement before system fallback and excludes the skipped recipient', () => {
  let s = begin({ crazySource: 'players' });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Original.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 4, text: 'Replacement.', now: 4000 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Wait for next timed slot.', now: 5000 }); s = due(s);
  s = act(s, 'crazySkip', 2, { promptId: s.crazy.prompts[2].id, now: 7000 });
  assert.equal(s.crazy.prompts[4].text, 'Replacement.'); assert.equal(s.crazy.prompts[2].status, 'skipped');
  assert.equal(s.crazy.queue.length, 1); assert.equal(s.scores[2], 0);
});

test('task expiry happens before late completion and immediately replaces without awarding a point', () => {
  let s = due(begin({ crazyTaskSeconds: 30 })); const num = Number(Object.keys(s.crazy.prompts)[0]), prompt = s.crazy.prompts[num];
  assert.equal(prompt.expiresAt, 37000); s = act(s, 'crazyDone', num, { promptId: prompt.id, now: 37000 });
  assert.equal(s.crazy.prompts[num].status, 'expired'); assert.equal(s.replies[num].error, 'stale_prompt'); assert.equal(s.scores[num], 0);
  assert.equal(pendingCount(s), 1); assert.ok(E.view(s, 0, 37000).talk.crazy.pendingPlayerNums.every(n => n !== num));
});

test('two tasks expiring together cause only one replacement and never reassign either expired actor in that tick', () => {
  let s = twoPending(begin({ crazyTaskSeconds: 30 })); const expired = E.view(s, 0, 12000).talk.crazy.pendingPlayerNums;
  for (const num of expired) s.crazy.prompts[num].expiresAt = 40000;
  s = act(s, 'clockTick', 0, { now: 40000 });
  assert.equal(pendingCount(s), 1); assert.equal(Object.values(s.crazy.prompts).filter(p => p.at === 40000).length, 1);
  for (const num of expired) assert.equal(s.crazy.prompts[num].status, 'expired');
  assert.ok(E.view(s, 0, 40000).talk.crazy.pendingPlayerNums.every(n => !expired.includes(n)));
  assert.equal(s.crazy.nextAssignAt, 45000); assert.equal(act(s, 'clockTick', 0, { now: 40000 }), s);
});

test('pause stops delivery while expiry and whole-game countdown continue; resume delivers deferred replacement', () => {
  let s = due(begin({ crazyTaskSeconds: 30 })); const num = Number(Object.keys(s.crazy.prompts)[0]);
  s = act(s, 'crazyPause', 0, { paused: true, now: 7001 }); const gameDeadline = s.gameDeadline;
  s = act(s, 'clockTick', 0, { now: 37000 }); assert.equal(s.crazy.prompts[num].status, 'expired'); assert.equal(pendingCount(s), 0);
  assert.equal(s.gameDeadline, gameDeadline); assert.equal(E.timerDue(s, 37000), false);
  s = act(s, 'crazyAssign', 1, { target: num === 2 ? 3 : 2, text: 'Queued while paused.', now: 38000 });
  assert.equal(E.view(s, 1, 38000).talk.crazy.canAssign, true);
  s = act(s, 'crazyPause', 0, { paused: false, now: 39000 }); assert.equal(pendingCount(s), 1);
  assert.ok(E.view(s, 0, 39000).talk.crazy.pendingPlayerNums.every(n => n !== num));
  s = act(s, 'crazyPause', 0, { paused: true, now: 39001 }); s = act(s, 'clockTick', 0, { now: gameDeadline });
  assert.equal(s.phase, 'ended'); assert.equal(pendingCount(s), 0);
});

test('players-only skips and expiry never fall back to system or immediately return a task to the same recipient', () => {
  let s = begin({ crazySource: 'players', crazyTaskSeconds: 30 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'First.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 2, text: 'Next later.', now: 4000 }); s = due(s);
  s = act(s, 'crazySkip', 2, { promptId: s.crazy.prompts[2].id, now: 7000 }); assert.equal(pendingCount(s), 0);
  assert.equal(s.crazy.prompts[2].status, 'skipped'); s = due(s); assert.equal(s.crazy.prompts[2].text, 'Next later.');
  s = act(s, 'clockTick', 0, { now: s.crazy.prompts[2].expiresAt }); assert.equal(pendingCount(s), 0);
  assert.equal(s.crazy.prompts[2].status, 'expired'); assert.equal(s.scores[2], 0);
});

test('completed recipients are not selected again when a different eligible player exists', () => {
  let s = begin(); let previous = null;
  for (let i = 0; i < 35; i++) {
    const now = s.crazy.nextAssignAt; s = act(s, 'clockTick', 0, { now });
    const num = E.view(s, 0, now).talk.crazy.pendingPlayerNums[0]; assert.notEqual(num, previous);
    s = act(s, 'crazyDone', num, { promptId: s.crazy.prompts[num].id, now }); previous = num;
  }
  assert.equal(Object.values(s.scores).reduce((a, b) => a + b, 0), 35);
});

test('only the authenticated recipient can score; unknown actor, stale session and prompt IDs cannot change points', () => {
  let s = due(begin()); const num = Number(Object.keys(s.crazy.prompts)[0]), prompt = s.crazy.prompts[num], other = num === 1 ? 2 : 1;
  assert.equal(act(s, 'crazyDone', 9, { promptId: prompt.id }), s);
  assert.equal(act(s, 'crazyDone', num, { promptId: prompt.id, sessionId: 'old' }), s);
  s = act(s, 'crazyDone', other, { promptId: prompt.id, now: 7000 }); assert.equal(s.replies[other].error, 'stale_prompt');
  s = act(s, 'crazyDone', 0, { promptId: prompt.id, now: 7000 }); assert.equal(s.replies[0].error, 'not_available');
  assert.ok(Object.values(s.scores).every(score => score === 0)); assert.equal(s.crazy.prompts[num].status, 'pending');
});

test('public views show statuses and scores but reveal only the recipient text and sender queue count', () => {
  let s = twoPending(begin()); s = act(s, 'crazyAssign', 1, { text: 'Secret queue text.', now: 12001 });
  for (let num = 0; num <= 4; num++) {
    const view = E.view(s, num, 12001), encoded = JSON.stringify(view), crazy = view.talk.crazy;
    assert.deepEqual(crazy.pendingPlayerNums, E.view(s, 0, 12001).talk.crazy.pendingPlayerNums);
    assert.equal(crazy.prompt?.text || null, s.crazy.prompts[num]?.text || null); assert.equal(crazy.myQueuedCount, num === 1 ? 1 : 0);
    assert.equal(encoded.includes('Secret queue text.'), false); assert.deepEqual(E.view(clone(s), num, 12001), view);
    for (const [recipient, prompt] of Object.entries(s.crazy.prompts)) if (Number(recipient) !== num) assert.equal(encoded.includes(prompt.text), false);
    for (const key of ['queue', 'prompts', 'sequence', 'recent', 'lineId', 'pool']) assert.equal(key in crazy, false);
    assert.equal(view.talk.scores.length, 4); if (crazy.prompt) assert.equal(crazy.prompt.expiresAt, s.crazy.prompts[num].expiresAt);
  }
});

test('custom submissions keep text bounds, authentication, source, turn fences, queue bounds and idempotency', () => {
  const initial = create({ crazySource: 'players' }), base = { target: 2, text: 'Give a spoon a job.', kind: 'task' };
  for (const target of [0, 1, 9, '2', 2.5]) assert.equal(act(initial, 'crazyAssign', 1, { ...base, target }).replies[1].error, 'invalid_target');
  for (const extra of [{ text: '' }, { text: 'x'.repeat(121) }, { kind: 'other' }]) assert.equal(act(initial, 'crazyAssign', 1, { ...base, ...extra }).replies[1].error, 'invalid_prompt');
  for (const turnId of [-1, undefined]) assert.equal(act(initial, 'crazyAssign', 1, { ...base, turnId }).replies[1].error, 'stale_turn');
  assert.equal(act(initial, 'crazyAssign', 0, base).replies[0].error, 'not_available'); assert.equal(act(initial, 'crazyAssign', 9, base), initial);
  assert.equal(act(create({ crazySource: 'system' }), 'crazyAssign', 1, base).replies[1].error, 'not_available');
  const input = { id: 'once', type: 'crazyAssign', actor: 1, sessionId: initial.sessionId, turnId: 0, now: 1500, ...base };
  let s = E.apply(initial, input); assert.deepEqual(E.apply(initial, input), s); assert.equal(E.apply(s, input), s);
  for (let i = 0; i < 9; i++) s = act(s, 'crazyAssign', 1, { text: 'Mission ' + i });
  assert.equal(act(s, 'crazyAssign', 1, base).replies[1].error, 'queue_full');
  for (let i = 0; i < 10; i++) s = act(s, 'crazyAssign', 2, { text: 'Other mission ' + i });
  assert.equal(act(s, 'crazyAssign', 3, base).replies[3].error, 'queue_full'); assert.equal(s.crazy.queue.length, 20);
});

test('legacy migration preserves private assignments and queue, cancels extras, and starts safe shared clocks', () => {
  let s = begin({ crazySeconds: 60 }); delete s.gameSeconds; delete s.crazyTaskSeconds; delete s.gameDeadline; delete s.scores;
  delete s.crazy.schedulerVersion; delete s.crazy.taskSeconds; delete s.crazy.nextAssignAt; delete s.crazy.minSeconds; delete s.crazy.maxSeconds;
  s.crazy.nextAt = { 1: 6000, 2: 8000 }; s.crazy.nextDeliveryAt = 9000;
  s.crazy.queue = [{ id: 'saved-queue', text: 'Private queued card.', assignedBy: 1, target: 2, kind: 'task', at: 1000 }];
  for (let num = 1; num <= 4; num++) s.crazy.prompts[num] = { id: 'saved-' + num, text: 'Private card ' + num, kind: 'task', at: num * 1000, status: 'pending' };
  assert.equal(E.timerDue(s, 10000), true); s = act(s, 'clockTick', 0, { now: 10000 });
  assert.equal(s.crazy.schedulerVersion, 2); assert.equal(s.gameDeadline, 910000); assert.equal(pendingCount(s), 2);
  assert.deepEqual(E.crazyRange(s), { minSeconds: 48, maxSeconds: 72 }); assert.ok(s.crazy.nextAssignAt >= 58000 && s.crazy.nextAssignAt <= 82000);
  for (let num = 1; num <= 4; num++) { assert.equal(s.crazy.prompts[num].id, 'saved-' + num); assert.equal(s.crazy.prompts[num].expiresAt, 160000); }
  assert.equal(s.crazy.prompts[3].status, 'cancelled'); assert.equal(s.crazy.prompts[4].status, 'cancelled');
  assert.equal(s.crazy.queue[0].text, 'Private queued card.'); assert.equal(E.view(s, 0, 10000).talk.crazy.prompt, null); assert.equal(s.crazy.nextAt, undefined);
});

test('raw legacy create range is preserved while new undefined options use defaults', () => {
  for (const interval of [60, 120, 180]) assert.deepEqual(E.crazyRange(create({ crazySeconds: interval })),
    { minSeconds: Math.round(interval * .8), maxSeconds: Math.round(interval * 1.2) });
  assert.deepEqual(E.crazyRange(create({ crazySeconds: undefined, crazyMinSeconds: undefined, crazyMaxSeconds: undefined })), { minSeconds: 60, maxSeconds: 180 });
  assert.equal(create({ gameSeconds: undefined, crazyTaskSeconds: undefined }).gameSeconds, 900);
});

test('Firebase omission of empty maps still supports queues, scores and timed private delivery', () => {
  const wire = value => { if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
    return entries.length ? Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries) : null; };
  let s = act(wire(create({ crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 })), 'crazyAssign', 1, { target: 2, text: 'A queued hat.' });
  s = act(wire(s), 'start'); s = act(wire(s), 'clockTick', 0, { now: 7000 });
  assert.equal(E.view(wire(s), 2, 7000).talk.crazy.prompt.text, 'A queued hat.'); assert.equal(E.view(wire(s), 0, 7000).talk.crazy.prompt, null);
  s = act(wire(s), 'crazyDone', 2, { promptId: s.crazy.prompts[2].id, now: 7000 }); assert.equal(s.scores[2], 1);
});

// Transactions are asynchronous, serialize each path and invoke every updater
// twice, just as a Firebase conflict may retry it. No real room is touched.
const snap = value => ({ val: () => clone(value) });
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]), listeners = new Map(), tails = new Map();
  let transactions = 0;
  const put = (path, value) => { values.set(path, clone(value)); for (const cb of listeners.get(path) || []) queueMicrotask(() => cb(snap(value))); };
  return { values, put, count: () => transactions, ref(path) { return {
    on(event, cb) { if (!listeners.has(path)) listeners.set(path, new Set()); listeners.get(path).add(cb); queueMicrotask(() => cb(snap(values.get(path)))); },
    off(event, cb) { listeners.get(path)?.delete(cb); },
    transaction(update) {
      transactions++;
      const task = (tails.get(path) || Promise.resolve()).then(() => {
        const before = clone(values.get(path)), attempt = update(clone(before)), next = update(clone(before));
        assert.deepEqual(next, attempt, 'transaction updater must be retry-stable');
        if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
        put(path, next); return { committed: true, snapshot: snap(next) };
      }); tails.set(path, task.catch(() => {})); return task;
    },
  }; } };
}
async function settle(...hosts) {
  for (let i = 0; i < 8; i++) { await new Promise(resolve => setImmediate(resolve)); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); }
}
function setup() {
  const db = database(), extras = {}, hosts = [], timers = [];
  let clock = 100000;
  const paths = [1, 2, 3, 4].map(n => 'rooms/CRAZY/players/player-' + n);
  const room = { code: 'CRAZY', count: 4, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: k => extras[k], setExtra: (k, v) => { extras[k] = v; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: { now: () => clock }, TALK_ENGINE: E,
    setInterval: (cb, ms) => { timers.push({ cb, ms }); return timers.length; }, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  const host = () => {
    const h = new context.TALK_SYNC.Host({ db, room, onChange: s => { h.latest = s; }, onStatus: status => { h.lastStatus = status; } });
    hosts.push(h); h.connect(); return h;
  };
  paths.forEach((path, i) => db.ref(path).on('value', s => { room.answers[i + 1] = s.val(); hosts.forEach(h => h.receive(i + 1, s.val())); }));
  return { db, room, host, hosts, paths, timers, time: t => { clock = t; }, card: n => clone(db.values.get(paths[n - 1])),
    async action(n, type, extra = {}) {
      const card = this.card(n), command = { id: crypto.randomUUID(), type, sessionId: card.talk.sessionId, turnId: card.talk.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, talkAction: command })); return command;
    },
  };
}



async function hostDeliverTwo(f, h) {
  for (let i = 0; i < 2 && pendingCount(h.latest) < 2; i++) {
    f.time(h.latest.crazy.nextAssignAt); await h.renew(); await settle(h);
    await h.tickClock(); await settle(h);
  }
}

test('browser scheduler uses atomic shared slots, two-task cap and recipient-only publication', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic }); await settle(h); await h.command('start'); await settle(h);
  let writes = f.db.count(); assert.equal(await h.tickClock(), false); assert.equal(f.db.count(), writes);
  await h.start({ topic, gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await settle(h);
  await h.command('start'); await settle(h); f.time(105000); await h.renew(); await settle(h);
  const results = await Promise.all([h.tickClock(), h.tickClock(), h.tickClock()]); await settle(h);
  assert.equal(results.filter(Boolean).length, 1); assert.equal(pendingCount(h.latest), 1);
  writes = f.db.count(); assert.equal(await h.tickClock(), false); assert.equal(f.db.count(), writes);
  await hostDeliverTwo(f, h); assert.equal(pendingCount(h.latest), 2);
  f.time(h.latest.crazy.nextAssignAt); await h.renew(); await settle(h); writes = f.db.count();
  assert.equal(await h.tickClock(), false); assert.equal(f.db.count(), writes);
  for (let num = 1; num <= 4; num++) {
    const card = f.card(num); assert.equal(card.talk.crazy.prompt?.text || null, h.latest.crazy.prompts[num]?.text || null);
    for (const [other, prompt] of Object.entries(h.latest.crazy.prompts)) if (Number(other) !== num) assert.equal(JSON.stringify(card).includes(prompt.text), false);
    assert.equal(JSON.stringify(card).includes(f.room.getExtra('letsTalkControlToken')), false);
    assert.equal(card.talk.crazy.pendingPlayerNums.length, 2);
  }
  h.close();
});

test('browser custom queues bind authenticated authors and recipient completion scores once across turns', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy', crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await settle(h);
  await f.action(1, 'crazyAssign', { target: 2, text: 'Be the mayor of this chair.', actor: 3 }); await settle(h);
  assert.equal(h.latest.crazy.queue[0].assignedBy, 1); assert.equal(f.card(1).talk.crazy.myQueuedCount, 1); assert.equal(f.card(2).talk.crazy.prompt, null);
  await h.command('start'); await settle(h); f.time(h.latest.crazy.nextAssignAt); await h.renew(); await settle(h);
  await h.tickClock(); await settle(h); const prompt = f.card(2).talk.crazy.prompt, turn = h.latest.turnId;
  await f.action(1, 'crazyDone', { promptId: prompt.id, actor: 2 }); await settle(h); assert.equal(f.card(1).talk.reply.error, 'stale_prompt');
  await h.command('end'); await settle(h); const currentTurn = h.latest.turnId, sharedDeadline = h.latest.crazy.nextAssignAt;
  const command = await f.action(2, 'crazyDone', { promptId: prompt.id, actor: 1, turnId: turn }); await settle(h);
  assert.equal(h.latest.crazy.prompts[2].status, 'done'); assert.equal(h.latest.scores[2], 1); assert.equal(h.latest.turnId, currentTurn);
  assert.equal(h.latest.crazy.nextAssignAt, sharedDeadline);
  await f.db.ref(f.paths[1]).transaction(old => ({ ...old, talkAction: command })); await settle(h); assert.equal(h.latest.scores[2], 1);
  h.close();
});

test('browser replacement and reconnect retain pending tasks, private queue and scheduler lease', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ topic, gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await settle(first);
  await first.command('start'); await settle(first); await hostDeliverTwo(f, first);
  await f.action(1, 'crazyAssign', { text: 'Stay queued.' }); await settle(first);
  const original = clone(first.latest.crazy), second = f.host(); await settle(first, second);
  assert.equal(second.own, false); assert.equal(await second.tickClock(), false); await assert.rejects(second.command('crazySend'));
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(second.latest.crazy, original);
  f.db.put('.info/connected', false); await settle(second); assert.equal(await second.tickClock(), false);
  f.db.put('.info/connected', true); await settle(second); assert.deepEqual(second.latest.crazy, original); second.close();
});

test('switching activities suspends scheduling and a fresh normal topic rejects old private task acknowledgements', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await settle(h);
  await h.command('start'); await settle(h); await hostDeliverTwo(f, h);
  const num = Object.keys(h.latest.crazy.prompts)[0], old = f.card(Number(num)).talk;
  await f.action(1, 'crazyAssign', { text: 'A queued mission.' }); await settle(h);
  f.db.put(f.paths[0], { game: 'other-game' }); await settle(h); assert.equal(h.suspended, true); assert.equal(await h.tickClock(), false);
  await h.start({ topic: { ...topic, id: 'normal-next' }, gameMode: 'normal' }); await settle(h);
  for (let n = 1; n <= 4; n++) { assert.equal(f.card(n).talk.crazy.prompt, null); assert.equal(f.card(n).talk.crazy.myQueuedCount, 0); }
  await f.action(Number(num), 'crazyDone', { promptId: old.crazy.prompt.id, sessionId: old.sessionId }); await settle(h);
  assert.equal(h.latest.crazy, undefined); assert.equal(h.latest.phase, 'thinking'); assert.ok(Object.values(h.latest.scores).every(score => score === 0)); h.close();
});


test('shared task slots exclude known absent recipients but unknown presence retains the roster', () => {
  const unknownRecipients = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const initial = begin({ sharedControls: true });
    const input = { id: 'presence-slot-' + seed, type: 'clockTick', actor: 0, sessionId: initial.sessionId,
      now: 7000, seed: Math.imul(seed, 2654435761) >>> 0 };
    const known = E.apply(initial, { ...input, onlineNums: [1, 2] });
    assert.equal(pendingCount(known), 1); assert.ok(E.view(known, 0, 7000).talk.crazy.pendingPlayerNums.every(num => [1, 2].includes(num)));
    const absent = E.apply(initial, { ...input, onlineNums: [] }); assert.equal(pendingCount(absent), 0); assert.equal(absent.crazy.nextAssignAt, 12000);
    const unknown = E.apply(initial, input); for (const num of E.view(unknown, 0, 7000).talk.crazy.pendingPlayerNums) unknownRecipients.add(num);
  }
  assert.ok([...unknownRecipients].some(num => num === 3 || num === 4), 'unknown presence keeps existing roster eligibility');
});

test('fixed custom target waits offline and gets queue priority when that player returns', () => {
  let s = begin({ sharedControls: true, crazySource: 'players' });
  s = act(s, 'crazyAssign', 1, { target: 3, text: 'Wait for the returning player.', now: 3000, onlineNums: [1, 2] });
  s = act(s, 'clockTick', 0, { now: 7000, onlineNums: [1, 2] }); assert.equal(pendingCount(s), 0); assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'clockTick', 0, { now: 12000, onlineNums: [] }); assert.equal(pendingCount(s), 0); assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'crazyAssign', 2, { target: 1, text: 'Newer queued mission.', now: 13000, onlineNums: [1, 2] });
  s = act(s, 'clockTick', 0, { now: 17000, onlineNums: [1, 2, 3] });
  assert.equal(s.crazy.prompts[3].text, 'Wait for the returning player.'); assert.equal(s.crazy.queue.length, 1);
  assert.equal(s.crazy.prompts[1], undefined); assert.equal(s.crazy.queue[0].text, 'Newer queued mission.');
});
