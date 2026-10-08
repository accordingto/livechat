const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../talk-engine.js');
const C = require('../talk-crazy.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const topic = { id: 'apartment', question: 'What kind of home would you share?', followUp: 'Who should wash the dishes?' };
let serial = 0;
const create = (options = {}) => E.create({ id: 'crazy-session', topic, now: 1000, gameMode: 'crazy',
  roster: [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Person ' + playerNum })), ...options });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, { id: 'crazy-event-' + (++serial),
  type, actor, sessionId: s.sessionId, turnId: s.turnId, now: 2000, seed: serial * 511, ...extra });
const begin = options => act(create(options), 'start');
const conversation = s => JSON.stringify([s.phase, s.round, s.turnId, s.speaker, s.remaining, s.spoken,
  s.questions, s.activeQuestion, s.notes, s.intents, s.topic, s.extension, s.extended, s.deadline]);
const pendingCount = s => Object.values(s.crazy.prompts || {}).filter(p => p.status === 'pending').length;
function deliverAll(s) {
  for (let i = 0; i < s.roster.length; i++) {
    const due = Object.entries(s.crazy.nextAt).filter(([num, at]) => at > 0 && s.crazy.prompts[num]?.status !== 'pending').map(([, at]) => at);
    if (!due.length) break;
    s = act(s, 'crazyTick', 0, { now: Math.max(...due, s.crazy.nextDeliveryAt || 0) });
  }
  return s;
}

test('pool has unique short simple English lines and tasks', () => {
  assert.ok(C.pool.length >= 96); assert.equal(new Set(C.pool.map(p => p.id)).size, C.pool.length);
  assert.equal(new Set(C.pool.map(p => p.text)).size, C.pool.length);
  assert.ok(C.pool.some(p => p.kind === 'line')); assert.ok(C.pool.some(p => p.kind === 'task'));
  for (const p of C.pool) { assert.ok(['line', 'task'].includes(p.kind)); assert.ok(p.text.length <= 240); assert.match(p.text, /^[\x20-\x7e]+$/); }
  assert.equal(Object.isFrozen(C.pool), true);
});

test('normal and pre-upgrade normal rooms retain ordinary turns and no scheduler', () => {
  let s = begin({ gameMode: 'normal' }); assert.equal(s.crazy, undefined); assert.equal(E.crazyDue(s, 999999), false);
  delete s.gameMode; assert.equal(E.view(s, 1, 0).talk.gameMode, 'normal');
  s = act(s, 'crazySend'); assert.equal(s.replies[0].error, 'not_available');
  const speaker = s.speaker; s = act(s, 'end', speaker); assert.deepEqual(s.spoken, [speaker]);
});

test('each player independently draws their first and repeated deadline from the configured range', () => {
  for (let count = 2; count <= 9; count++) {
    const initial = create({ crazyMinSeconds: 20, crazyMaxSeconds: 80,
      roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1 })) });
    assert.deepEqual(initial.crazy.nextAt, {});
    const input = { id: 'start', type: 'start', actor: 0, sessionId: initial.sessionId, now: 100000, seed: 425 };
    let s = E.apply(initial, input); assert.deepEqual(s, E.apply(initial, input));
    const times = Object.values(s.crazy.nextAt); assert.equal(times.length, count);
    assert.ok(times.every(t => t >= 120000 && t <= 180000)); assert.equal(new Set(times).size, count);
    assert.equal(E.crazyDue(s, Math.min(...times) - 1), false);
    s = deliverAll(s); const now = 500000, first = s.crazy.prompts[1];
    s = act(s, 'crazyDone', 1, { promptId: first.id, now });
    assert.ok(s.crazy.nextAt[1] >= now + 20000 && s.crazy.nextAt[1] <= now + 80000);
    assert.deepEqual(initial.crazy.nextAt, {});
  }
  const defaults = create().crazy; assert.equal(defaults.minSeconds, 60); assert.equal(defaults.maxSeconds, 180);
});

test('equal ranges are fixed deadlines and invalid constructor ranges fail', () => {
  const s = begin({ crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  assert.deepEqual(Object.values(s.crazy.nextAt), [7000, 7000, 7000, 7000]);
  for (const range of [{ crazyMinSeconds: 4 }, { crazyMaxSeconds: 301 }, { crazyMinSeconds: 80, crazyMaxSeconds: 20 }, { crazyMinSeconds: 5.5 }]) {
    assert.throws(() => create(range), /invalid_settings/);
  }
});

test('a due tick reveals one mission, idle ticks preserve the same state and pending missions stop their own timer', () => {
  let s = begin(); const now = Math.min(...Object.values(s.crazy.nextAt));
  assert.equal(act(s, 'crazyTick', 0, { now: now - 1 }), s);
  s = act(s, 'crazyTick', 0, { now }); assert.equal(pendingCount(s), 1);
  const seat = Number(Object.keys(s.crazy.prompts)[0]); assert.equal(s.crazy.nextAt[seat], 0);
  assert.equal(act(s, 'crazyTick', 0, { now }), s);
});

test('equal deadlines and long background gaps never send every player a mission at once', () => {
  let s = begin({ crazyMinSeconds: 5, crazyMaxSeconds: 5 }); const now = 1000000;
  s = act(s, 'crazyTick', 0, { now }); assert.equal(pendingCount(s), 1);
  for (let i = 0; i < 10; i++) assert.equal(act(s, 'crazyTick', 0, { now: now + 3999 }), s);
  s = act(s, 'crazyTick', 0, { now: now + 4000 }); assert.equal(pendingCount(s), 2);
  s = act(s, 'crazyTick', 0, { now: now + 8000 }); assert.equal(pendingCount(s), 3);
  s = act(s, 'crazyTick', 0, { now: now + 12000 }); assert.equal(pendingCount(s), 4);
  assert.equal(E.crazyDue(s, now + 999999), false);
});

test('legacy crazySend only redraws timers and never creates or overwrites a prompt', () => {
  let s = begin(); const input = { id: 'legacy-send', type: 'crazySend', actor: 0,
    sessionId: s.sessionId, now: 3000, seed: 51 };
  let next = E.apply(s, input); assert.deepEqual(next, E.apply(s, input)); assert.equal(E.apply(next, input), next);
  assert.deepEqual(next.crazy.prompts, {}); assert.ok(Object.values(next.crazy.nextAt).every(t => t >= 63000 && t <= 183000));
  next = deliverAll(next); const saved = clone(next.crazy.prompts);
  next = act(next, 'crazySend', 0, { now: 500000 }); assert.deepEqual(next.crazy.prompts, saved);
  assert.equal(E.view({ ...next, sharedControls: true }, 1, 0).talk.actions.crazySend, false);
});

test('saved prompts survive refresh and public cards never reveal another player’s mission or queue', () => {
  let s = deliverAll(begin()); s = act(s, 'crazyAssign', 1, { target: 2, text: 'Give your spoon a job.', kind: 'task' });
  for (let n = 0; n <= 4; n++) {
    const v = E.view(s, n, 0), encoded = JSON.stringify(v);
    assert.equal(v.talk.crazy.prompt?.text || null, n ? s.crazy.prompts[n].text : null);
    assert.deepEqual(E.view(clone(s), n, 0), v); assert.equal(encoded.includes('Give your spoon a job.'), false);
    assert.equal(v.talk.crazy.myQueuedCount, n === 1 ? 1 : 0);
    for (const [num, p] of Object.entries(s.crazy.prompts)) if (Number(num) !== n) assert.equal(encoded.includes(p.text), false);
    for (const key of ['prompts', 'queue', 'nextAt', 'nextDeliveryAt', 'sequence', 'recent', 'lineId', 'pool']) assert.equal(key in v.talk.crazy, false);
  }
});

test('only the recipient can acknowledge their prompt and acknowledgements survive ordinary turn changes', () => {
  let s = deliverAll(begin({ mode: 'write' })); const first = s.crazy.prompts[1], second = s.crazy.prompts[2], turn = s.turnId;
  s = act(s, 'crazyDone', 0, { promptId: first.id }); assert.equal(s.replies[0].error, 'not_available');
  s = act(s, 'crazyDone', 1, { promptId: second.id }); assert.equal(s.replies[1].error, 'stale_prompt');
  assert.equal(act(s, 'crazyDone', 9, { promptId: first.id }), s);
  s = act(s, 'end'); const before = conversation(s);
  s = act(s, 'crazyDone', 1, { promptId: first.id, turnId: turn, now: 500000 });
  assert.equal(s.crazy.prompts[1].status, 'done'); assert.equal(conversation(s), before);
  assert.ok(s.crazy.nextAt[1] >= 560000 && s.crazy.nextAt[1] <= 680000);
  const nextAt = s.crazy.nextAt[1]; s = act(s, 'crazySkip', 1, { promptId: first.id });
  assert.equal(s.replies[1].error, 'stale_prompt'); assert.equal(s.crazy.nextAt[1], nextAt);
});

test('queued player missions take priority over system fallback and reveal only at a future due timer', () => {
  let s = begin({ crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  const before = conversation(s); s = act(s, 'crazyAssign', 1, { target: 2, text: 'My soup needs a hat.', kind: 'line', now: 3000 });
  assert.equal(conversation(s), before); assert.deepEqual(s.crazy.prompts, {}); assert.equal(s.crazy.queue.length, 1);
  assert.equal(E.view(s, 1, 0).talk.crazy.myQueuedCount, 1);
  s = act(s, 'crazyTick', 0, { now: 7000 }); assert.equal(pendingCount(s), 1);
  assert.equal(s.crazy.prompts[2].text, 'My soup needs a hat.'); assert.equal(s.crazy.prompts[2].assignedBy, 1);
  assert.equal(s.crazy.prompts[2].source, 'player'); assert.equal(s.crazy.queue.length, 0);
  for (let n = 0; n <= 4; n++) assert.equal(JSON.stringify(E.view(s, n, 0)).includes('My soup needs a hat.'), n === 2);
  s = act(s, 'crazyTick', 0, { now: 11000 }); assert.equal(pendingCount(s), 2);
  assert.ok(Object.values(s.crazy.prompts).some(p => p.source === 'system'));
});

test('random recipients are resolved at delivery, exclude the author and can vary across seeds', () => {
  const recipients = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    let s = create({ crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 });
    s = act(s, 'crazyAssign', 1, { text: 'Announce a new holiday.', now: 1000 });
    assert.equal(s.crazy.queue[0].target, null); assert.deepEqual(s.crazy.prompts, {});
    s = act(s, 'start', 0, { now: 2000 });
    s = act(s, 'crazyTick', 0, { now: 7000, seed });
    const recipient = Number(Object.keys(s.crazy.prompts)[0]); assert.ok([2, 3, 4].includes(recipient));
    recipients.add(recipient); assert.equal(s.crazy.queue.length, 0);
  }
  assert.ok(recipients.size >= 2);
});

test('a fixed-recipient queue waits behind their pending mission and keeps FIFO priority without overwrites', () => {
  let s = deliverAll(begin()); const original = clone(s.crazy.prompts[2]);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'First player mission.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 2, text: 'Second player mission.', now: 4000 });
  assert.deepEqual(s.crazy.prompts[2], original); assert.equal(s.crazy.queue.length, 2);
  s = act(s, 'crazyDone', 2, { promptId: original.id, now: 500000 });
  s = act(s, 'crazyTick', 0, { now: s.crazy.nextAt[2] });
  assert.equal(s.crazy.prompts[2].text, 'First player mission.'); assert.equal(s.crazy.queue.length, 1);
  const first = s.crazy.prompts[2];
  s = act(s, 'crazyTick', 0, { now: 1000000 }); assert.equal(s.crazy.prompts[2].id, first.id);
  s = act(s, 'crazySkip', 2, { promptId: first.id, now: 1100000 });
  s = act(s, 'crazyTick', 0, { now: s.crazy.nextAt[2] }); assert.equal(s.crazy.prompts[2].text, 'Second player mission.');
});

test('queueing works before conversation starts and while paused; pause controls delivery only', () => {
  let s = create({ crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 10 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Before start.', now: 1000 });
  assert.equal(s.crazy.queue.length, 1); assert.equal(E.crazyDue(s, 999999), false);
  s = act(s, 'start'); s = act(s, 'crazyPause', 0, { paused: true });
  s = act(s, 'crazyAssign', 3, { target: 4, text: 'While paused.', now: 3000 });
  assert.equal(s.crazy.queue.length, 2); assert.equal(E.view(s, 3, 0).talk.crazy.canAssign, true);
  assert.equal(E.crazyDue(s, 999999), false);
  s = act(s, 'crazyPause', 0, { paused: false, now: 100000 });
  assert.ok(Object.values(s.crazy.nextAt).every(t => t >= 105000 && t <= 110000)); assert.deepEqual(s.crazy.prompts, {});
  s = act(s, 'crazyTick', 0, { now: 110000 }); assert.equal(pendingCount(s), 1); assert.equal(s.crazy.queue.length, 1);
});

test('done/skip during pause are accepted and fresh player-only timers start on resume', () => {
  let s = begin({ crazySource: 'players' }); s = act(s, 'crazyAssign', 1, { target: 2, text: 'A private mission.' });
  s = act(s, 'crazyTick', 0, { now: Math.max(...Object.values(s.crazy.nextAt)) });
  s = act(s, 'crazyPause', 0, { paused: true }); const prompt = s.crazy.prompts[2];
  s = act(s, 'crazyDone', 2, { promptId: prompt.id }); assert.equal(s.crazy.nextAt[2], 0);
  s = act(s, 'crazyPause', 0, { paused: false, now: 500000 });
  assert.ok(s.crazy.nextAt[2] >= 560000 && s.crazy.nextAt[2] <= 680000);
});

test('players-only empty timers redraw independently and never use a system fallback', () => {
  let s = begin({ crazySource: 'players' }); const now = Math.max(...Object.values(s.crazy.nextAt));
  s = act(s, 'crazyTick', 0, { now }); assert.deepEqual(s.crazy.prompts, {});
  assert.ok(Object.values(s.crazy.nextAt).every(t => t >= now + 60000 && t <= now + 180000));
  assert.equal(E.crazyDue(s, now), false);
});

test('queueing after an empty timer expired cannot deliver immediately in the same service pulse', () => {
  let s = begin({ crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Arrive later.', now: 10000 });
  s = act(s, 'crazyTick', 0, { now: 10000 }); assert.deepEqual(s.crazy.prompts, {}); assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'crazyTick', 0, { now: 15000 }); assert.equal(s.crazy.prompts[2].text, 'Arrive later.');
});

test('queue command duplicates and transaction retries add only one mission', () => {
  const s = create(), input = { id: 'queue-once', type: 'crazyAssign', actor: 1, sessionId: s.sessionId,
    turnId: s.turnId, text: 'My chair is the boss today.', now: 1500 };
  const next = E.apply(s, input); assert.deepEqual(next, E.apply(s, input)); assert.equal(E.apply(next, input), next);
  assert.equal(next.crazy.queue.length, 1); assert.deepEqual(s.crazy.queue, []); assert.deepEqual(next.replies[1], { id: input.id, error: '' });
});

test('custom queue rejects invalid targets and short-text bounds without truncating missions', () => {
  const initial = create({ crazySource: 'players' }), base = { target: 2, text: 'A tiny hat for soup.', kind: 'line' };
  for (const target of [0, 1, 9, '2', 2.5]) {
    const s = act(initial, 'crazyAssign', 1, { ...base, target }); assert.equal(s.replies[1].error, 'invalid_target'); assert.deepEqual(s.crazy.queue, []);
  }
  for (const extra of [{ text: '' }, { text: '  ' }, { text: false }, { text: 'x'.repeat(121) }, { kind: 'other' }]) {
    const s = act(initial, 'crazyAssign', 1, { ...base, ...extra }); assert.equal(s.replies[1].error, 'invalid_prompt'); assert.deepEqual(s.crazy.queue, []);
  }
  for (const target of [undefined, null, 'random', 2]) {
    const s = act(initial, 'crazyAssign', 1, { ...base, target, text: 'x'.repeat(120) }); assert.equal(s.crazy.queue[0].text.length, 120);
  }
});

test('custom queue requires a real authenticated actor, enabled player source and the visible session and turn', () => {
  const initial = begin(), base = { text: 'Ask the chair for a job.', kind: 'task' };
  const host = act(initial, 'crazyAssign', 0, base); assert.equal(host.replies[0].error, 'not_available');
  assert.equal(act(initial, 'crazyAssign', 9, base), initial);
  assert.equal(act(initial, 'crazyAssign', 1, { ...base, sessionId: 'old-topic' }), initial);
  for (const turnId of [initial.turnId - 1, undefined]) {
    const s = act(initial, 'crazyAssign', 1, { ...base, turnId }); assert.equal(s.replies[1].error, 'stale_turn'); assert.deepEqual(s.crazy.queue, []);
  }
  for (const s of [begin({ gameMode: 'normal' }), begin({ crazySource: 'system' })]) {
    assert.equal(act(s, 'crazyAssign', 1, base).replies[1].error, 'not_available');
  }
});

test('queue limits bound saved state while public cards expose only each sender’s count', () => {
  let s = create();
  for (let i = 0; i < 10; i++) s = act(s, 'crazyAssign', 1, { text: 'Mission ' + i });
  s = act(s, 'crazyAssign', 1, { text: 'Overflow.' }); assert.equal(s.replies[1].error, 'queue_full');
  for (let i = 0; i < 10; i++) s = act(s, 'crazyAssign', 2, { text: 'Second mission ' + i });
  s = act(s, 'crazyAssign', 3, { text: 'Global overflow.' }); assert.equal(s.replies[3].error, 'queue_full');
  assert.equal(s.crazy.queue.length, 20);
  for (let seat = 0; seat <= 4; seat++) { const view = E.view(s, seat, 0).talk.crazy;
    assert.equal(view.myQueuedCount, [1, 2].includes(seat) ? 10 : 0); assert.equal(JSON.stringify(view).includes('Mission 0'), false); }
});

test('legacy saved interval migrates to its previous range while preserving pending missions and clocks', () => {
  let s = deliverAll(begin({ crazySeconds: 60 })); const saved = clone(s.crazy.prompts), deadlines = clone(s.crazy.nextAt);
  delete s.crazy.minSeconds; delete s.crazy.maxSeconds; delete s.crazy.queue; delete s.crazy.nextDeliveryAt;
  assert.deepEqual(E.crazyRange(s), { minSeconds: 48, maxSeconds: 72 });
  s = act(s, 'end'); assert.deepEqual(s.crazy.prompts, saved); assert.deepEqual(s.crazy.nextAt, deadlines);
  s = act(s, 'crazyDone', 1, { promptId: saved[1].id, now: 500000 });
  assert.ok(s.crazy.nextAt[1] >= 548000 && s.crazy.nextAt[1] <= 572000);
});

test('turns and follow-ups preserve queued missions and prompts; a fresh topic clears both', () => {
  let s = deliverAll(begin()); s = act(s, 'crazyAssign', 1, { text: 'Keep me queued.' }); const saved = clone(s.crazy);
  for (let i = 0; i < 8; i++) s = act(s, 'end'); s = act(s, 'extend', 0, { text: 'What is a silly house rule?' });
  assert.deepEqual(s.crazy, saved);
  s = act(s, 'newTopic', 0, { confirm: true, topic, mode: 'think', seconds: 45, gameMode: 'crazy', showStarters: true,
    crazyMinSeconds: 5, crazyMaxSeconds: 20 }); assert.deepEqual(s.crazy.prompts, {}); assert.deepEqual(s.crazy.queue, []);
  assert.equal(s.crazy.minSeconds, 5); assert.equal(s.crazy.maxSeconds, 20);
});

test('system repeat avoidance excludes each recipient’s previous twelve pool missions', () => {
  let s = deliverAll(begin()), recent = [];
  for (let i = 0; i < 70; i++) {
    const p = s.crazy.prompts[1]; assert.equal(recent.includes(p.lineId), false);
    recent.push(p.lineId); if (recent.length > 12) recent.shift();
    const now = 500000 + i * 500000; s = act(s, 'crazyDone', 1, { promptId: p.id, now });
    s = act(s, 'crazyTick', 0, { now: s.crazy.nextAt[1] });
  }
  assert.equal(s.crazy.recent[1].length, 12);
});

test('Firebase omission of empty containers keeps queues, scheduler and recipient projections working', () => {
  const wire = value => { if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
    return entries.length ? Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries) : null; };
  let s = act(wire(create({ crazySource: 'players' })), 'crazyAssign', 1, { target: 2, text: 'A queued hat.' });
  s = act(wire(s), 'start'); s = act(wire(s), 'crazyTick', 0, { now: Math.max(...Object.values(s.crazy.nextAt)) });
  assert.equal(E.view(wire(s), 2, 0).talk.crazy.prompt.text, 'A queued hat.');
  assert.equal(E.view(wire(s), 0, 0).talk.crazy.prompt, null);
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


async function hostDeliverAll(f, h) {
  for (let i = 0; i < 4; i++) {
    const due = Object.values(h.latest.crazy.nextAt || {}).filter(t => t > 0);
    if (!due.length) break;
    f.time(Math.max(...due, h.latest.crazy.nextDeliveryAt || 0)); await h.renew(); await settle(h);
    await h.tickCrazy(); await settle(h);
  }
}

test('browser scheduler stays idle normally and due Crazy delivery is atomic, private and staggered', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic }); await settle(h); await h.command('start'); await settle(h);
  let writes = f.db.count(); assert.equal(await h.tickCrazy(), false); assert.equal(f.db.count(), writes);
  await h.start({ topic, gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await settle(h);
  await h.command('start'); await settle(h); f.time(105000); await h.renew(); await settle(h);
  const results = await Promise.all([h.tickCrazy(), h.tickCrazy(), h.tickCrazy()]); await settle(h);
  assert.equal(results.filter(Boolean).length, 1); assert.equal(pendingCount(h.latest), 1);
  writes = f.db.count(); assert.equal(await h.tickCrazy(), false); assert.equal(f.db.count(), writes);
  await hostDeliverAll(f, h); assert.equal(pendingCount(h.latest), 4);
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n); assert.equal(card.talk.crazy.prompt.text, h.latest.crazy.prompts[n].text);
    for (let other = 1; other <= 4; other++) if (other !== n) assert.equal(JSON.stringify(card).includes(h.latest.crazy.prompts[other].text), false);
    assert.equal(JSON.stringify(card).includes(f.room.getExtra('letsTalkControlToken')), false);
  }
  h.close();
});

test('browser player commands queue privately and authenticated recipients acknowledge across turn changes', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy', crazySource: 'players' }); await settle(h);
  await f.action(1, 'crazyAssign', { target: 2, text: 'Be the mayor of this chair.', actor: 3 }); await settle(h);
  assert.equal(h.latest.crazy.queue[0].assignedBy, 1); assert.equal(f.card(1).talk.crazy.myQueuedCount, 1);
  assert.equal(f.card(2).talk.crazy.prompt, null);
  await h.command('start'); await settle(h); await hostDeliverAll(f, h);
  const prompt = f.card(2).talk.crazy.prompt, turn = h.latest.turnId;
  assert.equal(prompt.assignedBy, 1); assert.equal(prompt.text, 'Be the mayor of this chair.');
  await f.action(1, 'crazyDone', { promptId: prompt.id, actor: 2 }); await settle(h);
  assert.equal(f.card(1).talk.reply.error, 'stale_prompt');
  await h.command('end'); await settle(h); const currentTurn = h.latest.turnId;
  await f.action(2, 'crazySkip', { promptId: prompt.id, actor: 1, turnId: turn }); await settle(h);
  assert.equal(h.latest.crazy.prompts[2].status, 'skipped'); assert.equal(h.latest.turnId, currentTurn);
  h.close();
});

test('browser replacement and reconnect preserve saved prompts, queues and the scheduler lease', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ topic, gameMode: 'crazy' }); await settle(first); await first.command('start'); await settle(first);
  await hostDeliverAll(f, first); await f.action(1, 'crazyAssign', { text: 'Stay queued.' }); await settle(first);
  const original = clone(first.latest.crazy), second = f.host(); await settle(first, second);
  assert.equal(second.own, false); assert.equal(await second.tickCrazy(), false); await assert.rejects(second.command('crazySend'));
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(second.latest.crazy, original);
  f.db.put('.info/connected', false); await settle(second); assert.equal(await second.tickCrazy(), false);
  f.db.put('.info/connected', true); await settle(second); assert.deepEqual(second.latest.crazy, original);
  second.close();
});

test('switching activities suspends scheduling and a fresh normal topic clears private missions and queue', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy' }); await settle(h); await h.command('start'); await settle(h);
  await hostDeliverAll(f, h); const old = f.card(1).talk;
  await f.action(1, 'crazyAssign', { text: 'A queued mission.' }); await settle(h);
  f.db.put(f.paths[0], { game: 'other-game' }); await settle(h); assert.equal(h.suspended, true); assert.equal(await h.tickCrazy(), false);
  await h.start({ topic: { ...topic, id: 'normal-next' }, gameMode: 'normal' }); await settle(h);
  for (let n = 1; n <= 4; n++) { assert.equal(f.card(n).talk.crazy.prompt, null); assert.equal(f.card(n).talk.crazy.myQueuedCount, 0); }
  await f.action(1, 'crazyDone', { promptId: old.crazy.prompt.id, sessionId: old.sessionId }); await settle(h);
  assert.equal(h.latest.crazy, undefined); assert.equal(h.latest.phase, 'thinking'); h.close();
});

test('raw legacy create and new-topic settings retain their former timing range while fresh defaults use 60–180', () => {
  assert.deepEqual(E.crazyRange(create()), { minSeconds: 60, maxSeconds: 180 });
  for (const interval of [60, 120, 180]) {
    const expected = { minSeconds: Math.round(interval * 0.8), maxSeconds: Math.round(interval * 1.2) };
    assert.deepEqual(E.crazyRange(create({ crazySeconds: interval })), expected);
    const next = act(create(), 'newTopic', 0, { confirm: true, topic, mode: 'think', seconds: 45, gameMode: 'crazy',
      showStarters: true, crazySeconds: interval }); assert.deepEqual(E.crazyRange(next), expected);
  }
  const options = { crazySeconds: 60, crazyMinSeconds: 10, crazyMaxSeconds: 30 };
  assert.deepEqual(E.crazyRange(create(options)), { minSeconds: 10, maxSeconds: 30 });
  assert.deepEqual(E.crazyRange(create({ crazySeconds: undefined, crazyMinSeconds: undefined, crazyMaxSeconds: undefined })),
    { minSeconds: 60, maxSeconds: 180 });
});

test('an old active player-only room with no timers recovers without an immediate mission or resetting a pending prompt', () => {
  let s = begin({ crazySource: 'players', crazySeconds: 60 });
  s.crazy.nextAt = {}; delete s.crazy.minSeconds; delete s.crazy.maxSeconds; delete s.crazy.queue;
  s.crazy.prompts[3] = { id: 'saved-prompt', text: 'Keep this mission.', kind: 'task', status: 'pending' };
  assert.equal(E.crazyDue(s, 10000), true);
  s = act(s, 'crazyTick', 0, { now: 10000 }); assert.equal(s.replies[0].error, '');
  assert.equal(s.crazy.prompts[3].id, 'saved-prompt'); assert.equal(s.crazy.nextAt[3], undefined);
  for (const seat of [1, 2, 4]) assert.ok(s.crazy.nextAt[seat] >= 58000 && s.crazy.nextAt[seat] <= 82000);
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Wait for the new timer.', now: 11000 });
  assert.equal(s.crazy.prompts[2], undefined);
  s = act(s, 'crazyTick', 0, { now: s.crazy.nextAt[2] });
  assert.equal(s.crazy.prompts[2].text, 'Wait for the new timer.'); assert.equal(s.crazy.prompts[3].id, 'saved-prompt');
});


test('a fresh queued custom mission keeps its overdue mixed slot ahead of system fallback', () => {
  let s = begin({ crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Save the next slot for me.', now: 10000 });
  s = act(s, 'crazyTick', 0, { now: 10000 });
  assert.equal(s.crazy.prompts[2], undefined); assert.equal(s.crazy.nextAt[2], 15000);
  assert.equal(s.crazy.queue.length, 1); assert.equal(pendingCount(s), 1);
  s = act(s, 'crazyTick', 0, { now: 15000 });
  assert.equal(s.crazy.prompts[2].text, 'Save the next slot for me.');
  assert.equal(s.crazy.prompts[2].source, 'player'); assert.equal(s.crazy.queue.length, 0);
});

test('fresh submissions do not redraw an overdue slot already owned by an older eligible queued mission', () => {
  let s = begin({ crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  s = act(s, 'crazyAssign', 1, { target: 2, text: 'Older queued mission.', now: 3000 });
  s = act(s, 'crazyAssign', 3, { target: 2, text: 'Fresh queued mission.', now: 10000 });
  assert.equal(s.crazy.nextAt[2], 7000);
  s = act(s, 'crazyTick', 0, { now: 10000 });
  assert.equal(s.crazy.prompts[2].text, 'Older queued mission.'); assert.equal(s.crazy.queue.length, 1);
  s = act(s, 'crazyDone', 2, { promptId: s.crazy.prompts[2].id, now: 11000 });
  s = act(s, 'crazyTick', 0, { now: 16000 });
  assert.equal(s.crazy.prompts[2].text, 'Fresh queued mission.'); assert.equal(s.crazy.queue.length, 0);
});
