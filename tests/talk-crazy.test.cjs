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

test('pool contains at least 48 unique, short, simple English lines and tasks', () => {
  assert.ok(C.pool.length >= 48);
  assert.equal(new Set(C.pool.map(p => p.id)).size, C.pool.length);
  assert.equal(new Set(C.pool.map(p => p.text)).size, C.pool.length);
  for (const p of C.pool) {
    assert.ok(['line', 'task'].includes(p.kind)); assert.ok(p.text.length <= 240);
    assert.match(p.text, /^[\x20-\x7e]+$/);
    assert.doesNotMatch(p.text, /drink alcohol|take off|hit someone|kill|phone number|password/i);
  }
  assert.equal(Object.isFrozen(C.pool), true);
});

test('normal and pre-upgrade sessions keep normal turn mechanics and no scheduler', () => {
  let normal = begin({ gameMode: 'normal' });
  assert.equal(normal.crazy, undefined); assert.equal(E.crazyDue(normal, 99999999), false);
  const legacy = clone(normal); delete legacy.gameMode;
  assert.equal(E.view(legacy, 1, 0).talk.gameMode, 'normal');
  assert.equal(E.view(legacy, 1, 0).talk.crazy.enabled, false);
  normal = act(normal, 'crazySend'); assert.equal(normal.replies[0].error, 'not_available');
  assert.equal(normal.crazy, undefined);
  const speaker = normal.speaker; normal = act(normal, 'end', speaker);
  assert.equal(normal.turnId, 2); assert.deepEqual(normal.spoken, [speaker]);
});

test('each first prompt is saved 30–90 seconds after sharing starts, staggered and retry-stable', () => {
  for (let count = 2; count <= 9; count++) {
    const initial = create({ crazySeconds: 60, roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'P' + i })) });
    assert.deepEqual(initial.crazy.nextAt, {}); assert.equal(E.crazyDue(initial, 9999999), false);
    const input = { id: 'start', type: 'start', actor: 0, sessionId: initial.sessionId, now: 100000, seed: 425 };
    const s = E.apply(initial, input);
    assert.deepEqual(s, E.apply(initial, input));
    const times = Object.values(s.crazy.nextAt);
    assert.equal(times.length, count); assert.equal(new Set(times).size, count);
    assert.ok(times.every(t => t >= 130000 && t <= 190000));
    assert.equal(E.crazyDue(s, Math.min(...times) - 1), false);
    assert.equal(E.crazyDue(s, Math.min(...times)), true);
    assert.deepEqual(initial.crazy.nextAt, {}, 'apply never mutates its input');
  }
  assert.equal(create({ crazySeconds: 5 }).crazy.intervalSeconds, 120);
});

test('automatic ticks dispatch only due participants; idle checks never create revisions', () => {
  let s = begin(); const due = Math.min(...Object.values(s.crazy.nextAt));
  assert.equal(act(s, 'crazyTick', 0, { now: due - 1 }), s);
  s = act(s, 'crazyTick', 0, { now: due });
  assert.equal(Object.keys(s.crazy.prompts).length, 1);
  const prompted = Number(Object.keys(s.crazy.prompts)[0]);
  assert.equal(s.crazy.prompts[prompted].status, 'pending');
  assert.equal(s.crazy.nextAt[prompted], 0);
  assert.equal(act(s, 'crazyTick', 0, { now: due }), s);
});

test('saved per-person prompt survives refresh and never projects other lines, histories or pool', () => {
  let s = act(begin(), 'crazySend');
  assert.equal(Object.keys(s.crazy.prompts).length, 4);
  assert.equal(new Set(Object.values(s.crazy.prompts).map(p => p.text)).size, 4);
  for (let n = 0; n <= 4; n++) {
    const v = E.view(s, n, 0);
    const encoded = JSON.stringify(v);
    assert.equal(v.talk.crazy.pendingCount, 4);
    assert.equal(v.talk.crazy.prompt?.text || null, n ? s.crazy.prompts[n].text : null);
    assert.deepEqual(E.view(clone(s), n, 0), v);
    for (const [num, p] of Object.entries(s.crazy.prompts)) if (Number(num) !== n) assert.equal(encoded.includes(p.text), false);
    for (const key of ['prompts', 'nextAt', 'sequence', 'recent', 'lineId', 'pool']) assert.equal(key in v.talk.crazy, false);
  }
  const mine = E.view(s, 1, 0); mine.talk.crazy.prompt.text = 'Changed outside';
  assert.notEqual(s.crazy.prompts[1].text, 'Changed outside');
});

test('send/ack authorization is checked and actor cannot finish another person’s assignment', () => {
  let s = begin();
  for (const type of ['crazySend', 'crazyTick', 'crazyPause']) {
    s = act(s, type, 1, { paused: true, now: 999999 });
    assert.equal(s.replies[1].error, 'not_available'); assert.deepEqual(s.crazy.prompts, {});
  }
  s = act(s, 'crazySend');
  const first = s.crazy.prompts[1].id, second = s.crazy.prompts[2].id;
  s = act(s, 'crazyDone', 0, { promptId: first, playerNum: 1, isHost: true });
  assert.equal(s.replies[0].error, 'not_available');
  s = act(s, 'crazyDone', 1, { promptId: second, playerNum: 2 });
  assert.equal(s.replies[1].error, 'stale_prompt');
  assert.equal(s.crazy.prompts[1].status, 'pending'); assert.equal(s.crazy.prompts[2].status, 'pending');
  assert.equal(act(s, 'crazyDone', 9, { promptId: first }), s);
  assert.equal(act(s, 'crazyDone', 1, { promptId: first, sessionId: 'old' }), s);
});

test('ack is independent of current turn and preserves ordinary discussion, questions and notes', () => {
  let s = create({ mode: 'write' }); s = act(s, 'note', 1, { text: 'Keep this note' });
  s = act(s, 'start'); s = act(s, 'crazySend');
  const oldTurn = s.turnId, firstId = s.crazy.prompts[1].id;
  s = act(s, 'end'); const asker = E.order(s)[0]; s = act(s, 'ask', asker);
  s = act(s, 'invite', s.speaker, { target: s.questions[0].id });
  const before = conversation(s);
  s = act(s, 'crazyDone', 1, { promptId: firstId, turnId: oldTurn, now: 5000 });
  assert.equal(s.crazy.prompts[1].status, 'done'); assert.equal(s.replies[1].error, '');
  assert.equal(conversation(s), before);
  assert.ok(s.crazy.nextAt[1] >= 101000 && s.crazy.nextAt[1] <= 149000);
});

test('pending lines are never overwritten, duplicate commands and old acknowledgements are harmless', () => {
  const s = begin(), input = { id: 'send-once', type: 'crazySend', actor: 0, sessionId: s.sessionId, now: 4000, seed: 51 };
  let next = E.apply(s, input); assert.deepEqual(next, E.apply(s, input), 'transaction retry is deterministic');
  assert.equal(E.apply(next, input), next);
  const saved = clone(next.crazy.prompts);
  next = act(next, 'crazyTick', 0, { now: 99999999 }); assert.deepEqual(next.crazy.prompts, saved);
  next = act(next, 'crazySend'); assert.deepEqual(next.crazy.prompts, saved);
  const done = { id: 'done-once', type: 'crazyDone', actor: 1, sessionId: next.sessionId, promptId: saved[1].id, now: 9000, seed: 2 };
  next = E.apply(next, done); const nextAt = next.crazy.nextAt[1];
  assert.equal(E.apply(next, done), next);
  next = act(next, 'crazySkip', 1, { promptId: saved[1].id, now: 999999 });
  assert.equal(next.replies[1].error, 'stale_prompt'); assert.equal(next.crazy.nextAt[1], nextAt);
});

test('long missed periods issue at most one line per person, not a catch-up storm', () => {
  let s = act(begin(), 'crazyTick', 0, { now: 999999999 });
  assert.equal(Object.keys(s.crazy.prompts).length, 4);
  assert.deepEqual(Object.values(s.crazy.sequence), [1, 1, 1, 1]);
  assert.equal(E.crazyDue(s, 999999999), false);
  assert.equal(act(s, 'crazyTick', 0, { now: 999999999 }), s);
});

test('pause stops assignments, permits done/skip, and resume postpones future lines without a burst', () => {
  let s = act(begin({ crazySeconds: 60 }), 'crazySend');
  s = act(s, 'crazyPause', 0, { paused: true, now: 4000 });
  s = act(s, 'crazyDone', 1, { promptId: s.crazy.prompts[1].id, now: 5000 });
  s = act(s, 'crazySkip', 2, { promptId: s.crazy.prompts[2].id, now: 6000 });
  assert.equal(s.crazy.nextAt[1], 0); assert.equal(s.crazy.nextAt[2], 0);
  assert.equal(E.crazyDue(s, 99999999), false);
  const pending = clone(s.crazy.prompts);
  s = act(s, 'crazySend'); assert.equal(s.replies[0].error, 'not_available');
  s = act(s, 'crazyPause', 0, { paused: 'false' }); assert.equal(s.crazy.paused, true);
  s = act(s, 'crazyPause', 0, { paused: false, now: 999999 });
  assert.deepEqual(s.crazy.prompts, pending);
  for (const n of [1, 2]) assert.ok(s.crazy.nextAt[n] >= 1047999 && s.crazy.nextAt[n] <= 1071999);
  assert.equal(E.crazyDue(s, 999999), false); assert.equal(s.crazy.nextAt[3], 0);
});

test('turns, rounds and follow-ups do not reset prompts, new topics do', () => {
  let s = act(begin(), 'crazySend'); const saved = clone(s.crazy);
  for (let i = 0; i < 16; i++) s = act(s, 'end');
  s = act(s, 'extend', 0, { text: 'What would a silly house rule be?' });
  assert.deepEqual(s.crazy, saved);
  const next = create({ id: 'another-topic', topic: { ...topic, id: 'island' } });
  assert.deepEqual(next.crazy.prompts, {}); assert.deepEqual(next.crazy.recent, {});
  assert.equal(act(next, 'crazyDone', 1, { promptId: saved.prompts[1].id, sessionId: s.sessionId }), next);
});

test('repeat avoidance keeps each participant’s previous twelve lines out of their next assignment', () => {
  let s = begin(); const recent = [];
  for (let i = 0; i < 70; i++) {
    s = act(s, 'crazySend', 0, { now: i * 1000 });
    const p = s.crazy.prompts[1]; assert.equal(recent.includes(p.lineId), false);
    recent.push(p.lineId); if (recent.length > 12) recent.shift();
    s = act(s, 'crazyDone', 1, { promptId: p.id, now: i * 1000 });
  }
  assert.equal(s.crazy.recent[1].length, 12);
});

test('Firebase omission of empty containers does not break scheduling or private projections', () => {
  const wire = value => {
    if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
    return entries.length ? Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries) : null;
  };
  let s = act(wire(create()), 'start'); s = act(wire(s), 'crazySend');
  s = act(wire(s), 'crazySkip', 2, { promptId: s.crazy.prompts[2].id, now: 10000 });
  assert.equal(E.view(wire(s), 2, 0).talk.crazy.prompt.status, 'skipped');
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

test('sync timer stays idle in normal mode; due Crazy scheduling is atomic and private', async () => {
  const f = setup(), h = f.host(); await settle(h);
  assert.equal(f.timers.some(t => t.ms === 1000), true);
  await h.start({ topic }); await settle(h); await h.command('start'); await settle(h);
  let writes = f.db.count(); assert.equal(await h.tickCrazy(), false); assert.equal(f.db.count(), writes);
  await h.start({ topic, gameMode: 'crazy', crazySeconds: 60 }); await settle(h);
  await h.command('start'); await settle(h);
  assert.equal(h.latest.crazy.intervalSeconds, 60);
  writes = f.db.count(); assert.equal(await h.tickCrazy(), false); assert.equal(f.db.count(), writes);
  f.time(200000); await h.renew(); await settle(h);
  const results = await Promise.all([h.tickCrazy(), h.tickCrazy(), h.tickCrazy()]); await settle(h);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(Object.values(h.latest.crazy.sequence), [1, 1, 1, 1]);
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n); assert.equal(card.talk.crazy.prompt.text, h.latest.crazy.prompts[n].text);
    for (let other = 1; other <= 4; other++) if (other !== n) assert.equal(JSON.stringify(card).includes(h.latest.crazy.prompts[other].text), false);
    assert.equal(JSON.stringify(card).includes(f.room.getExtra('letsTalkControlToken')), false);
  }
  writes = f.db.count(); assert.equal(await h.tickCrazy(), false); assert.equal(f.db.count(), writes);
  h.close();
});

test('multiplayer concurrent acknowledgements derive actor from each token and never consume a turn', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy' }); await settle(h); await h.command('start'); await settle(h);
  await h.command('crazySend'); await settle(h);
  const one = f.card(1).talk.crazy.prompt, two = f.card(2).talk.crazy.prompt, turn = h.latest.turnId;
  await f.action(1, 'crazyDone', { promptId: two.id, actor: 2 }); await settle(h);
  assert.equal(f.card(1).talk.reply.error, 'stale_prompt'); assert.equal(h.latest.crazy.prompts[2].status, 'pending');
  await h.command('end'); await settle(h);
  const currentTurn = h.latest.turnId;
  const [a, b] = await Promise.all([
    f.action(1, 'crazyDone', { promptId: one.id, actor: 2, turnId: turn }),
    f.action(2, 'crazySkip', { promptId: two.id, actor: 1, turnId: turn }),
  ]); await settle(h);
  assert.equal(h.latest.crazy.prompts[1].status, 'done'); assert.equal(h.latest.crazy.prompts[2].status, 'skipped');
  assert.equal(h.latest.turnId, currentTurn);
  assert.equal(f.card(1).talk.reply.id, a.id); assert.equal(f.card(2).talk.reply.id, b.id);
  h.close();
});

test('host replacement/reconnect preserves saved lines; only lease owner schedules', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ topic, gameMode: 'crazy' }); await settle(first); await first.command('start'); await settle(first);
  await first.command('crazySend'); await settle(first);
  const original = clone(first.latest.crazy), second = f.host(); await settle(first, second);
  assert.equal(second.own, false); assert.equal(await second.tickCrazy(), false);
  await assert.rejects(second.command('crazySend'));
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(second.latest.crazy, original);
  assert.equal(await second.tickCrazy(), false);
  f.db.put('.info/connected', false); await settle(second);
  assert.equal(await second.tickCrazy(), false);
  f.db.put('.info/connected', true); await settle(second);
  assert.deepEqual(second.latest.crazy, original);
  second.close(); assert.equal(await second.tickCrazy(), false);
});

test('switching activities suspends Crazy timer and new normal topic clears private lines', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, gameMode: 'crazy' }); await settle(h); await h.command('start'); await settle(h);
  await h.command('crazySend'); await settle(h);
  const old = f.card(1).talk;
  f.db.put(f.paths[0], { game: 'other-game' }); await settle(h);
  assert.equal(h.suspended, true); assert.equal(await h.tickCrazy(), false);
  await h.start({ topic: { ...topic, id: 'normal-next' }, gameMode: 'normal' }); await settle(h);
  for (let n = 1; n <= 4; n++) { assert.equal(f.card(n).talk.gameMode, 'normal'); assert.equal(f.card(n).talk.crazy.prompt, null); }
  await f.action(1, 'crazyDone', { promptId: old.crazy.prompt.id, sessionId: old.sessionId }); await settle(h);
  assert.equal(h.latest.crazy, undefined); assert.equal(h.latest.phase, 'thinking');
  h.close();
});

test('player-written lines and tasks are private, retry-stable and do not consume a conversation turn', () => {
  const initial = begin({ crazySource: 'players' }), text = 'Please explain why your soup needs a small hat.';
  const input = { id: 'custom-once', type: 'crazyAssign', actor: 1, sessionId: initial.sessionId,
    turnId: initial.turnId, target: 2, text: '  ' + text + '  ', kind: 'task', now: 5000 };
  const state = E.apply(initial, input);
  assert.deepEqual(state, E.apply(initial, input)); assert.equal(E.apply(state, input), state);
  assert.equal(conversation(state), conversation(initial)); assert.deepEqual(initial.crazy.prompts, {});
  assert.equal(state.crazy.prompts[2].text, text); assert.equal(state.crazy.prompts[2].kind, 'task');
  assert.equal(state.crazy.prompts[2].assignedBy, 1); assert.equal(state.crazy.prompts[2].source, 'player');
  for (let seat = 0; seat <= 4; seat++) {
    const view = E.view(state, seat, 0).talk;
    assert.equal(view.crazy.canAssign, seat > 0); assert.equal(view.crazy.pendingCount, 1);
    assert.equal(JSON.stringify(view).includes(text), seat === 2);
    assert.deepEqual(view.reply, seat === 1 ? { id: input.id, error: '' } : E.view(initial, seat, 0).talk.reply);
    if (seat === 2) assert.equal(view.crazy.prompt.assignedBy, 1);
    else assert.equal(view.crazy.prompt, null);
  }
  let next = act(state, 'crazyDone', 2, { promptId: state.crazy.prompts[2].id });
  next = act(next, 'crazyAssign', 3, { target: 2, text: 'My chair is the boss today.', kind: 'line' });
  assert.equal(next.crazy.prompts[2].kind, 'line'); assert.equal(next.crazy.sequence[2], 2);
  assert.notEqual(next.crazy.prompts[2].id, state.crazy.prompts[2].id);
});

test('custom assignment rejects invalid targets and malformed or overlong text without truncating it', () => {
  const initial = begin({ crazySource: 'players' });
  const base = { target: 2, text: 'A tiny hat for soup.', kind: 'line' };
  for (const target of [0, 1, 9, '2', 2.5, null]) {
    const state = act(initial, 'crazyAssign', 1, { ...base, target });
    assert.equal(state.replies[1].error, 'invalid_target'); assert.deepEqual(state.crazy.prompts, {});
  }
  for (const extra of [{ text: '' }, { text: '   ' }, { text: false }, { text: 'x'.repeat(241) }, { kind: 'other' }, { kind: null }]) {
    const state = act(initial, 'crazyAssign', 1, { ...base, ...extra });
    assert.equal(state.replies[1].error, 'invalid_prompt'); assert.deepEqual(state.crazy.prompts, {});
  }
  const state = act(initial, 'crazyAssign', 1, { ...base, text: 'x'.repeat(240) });
  assert.equal(state.crazy.prompts[2].text.length, 240); assert.equal(state.replies[1].error, '');
});

test('custom assignment requires a real player, an allowed source and the current session and turn', () => {
  const initial = begin({ crazySource: 'mixed' }), base = { target: 2, text: 'Ask the chair for a job.', kind: 'task' };
  const host = act(initial, 'crazyAssign', 0, base); assert.equal(host.replies[0].error, 'not_available');
  assert.equal(act(initial, 'crazyAssign', 9, base), initial);
  assert.equal(act(initial, 'crazyAssign', 1, { ...base, sessionId: 'older-topic' }), initial);
  for (const turnId of [initial.turnId - 1, undefined]) {
    const state = act(initial, 'crazyAssign', 1, { ...base, turnId });
    assert.equal(state.replies[1].error, 'stale_turn'); assert.deepEqual(state.crazy.prompts, {});
  }
  for (const state of [begin({ gameMode: 'normal' }), begin({ crazySource: 'system' }),
    act(initial, 'crazyPause', 0, { paused: true })]) {
    const next = act(state, 'crazyAssign', 1, base); assert.equal(next.replies[1].error, 'not_available');
  }
  const thinking = act(create({ crazySource: 'players' }), 'crazyAssign', 1, base);
  assert.equal(thinking.replies[1].error, 'stale_turn'); assert.deepEqual(thinking.crazy.prompts, {});
});

test('pending custom and system assignments cannot overwrite each other', () => {
  let state = act(begin({ crazySource: 'mixed' }), 'crazyAssign', 1,
    { target: 2, text: 'Give a serious speech about a lost sock.', kind: 'task' });
  const first = clone(state.crazy.prompts[2]);
  state = act(state, 'crazyAssign', 3, { target: 2, text: 'Something else.', kind: 'line' });
  assert.equal(state.replies[3].error, 'recipient_busy'); assert.deepEqual(state.crazy.prompts[2], first);
  state = act(state, 'crazySend'); assert.deepEqual(state.crazy.prompts[2], first);
  const system = clone(state.crazy.prompts[4]);
  state = act(state, 'crazyAssign', 1, { target: 4, text: 'New line.', kind: 'line' });
  assert.equal(state.replies[1].error, 'recipient_busy'); assert.deepEqual(state.crazy.prompts[4], system);
  state = act(state, 'crazyDone', 2, { promptId: first.id });
  state = act(state, 'crazySend');
  assert.equal(state.crazy.prompts[2].source, 'system'); assert.notEqual(state.crazy.prompts[2].id, first.id);
});

test('players-only source keeps automatic scheduling idle before and after acknowledgements and pause', () => {
  let state = begin({ crazySource: 'players' });
  assert.deepEqual(state.crazy.nextAt, {}); assert.equal(E.crazyDue(state, 999999999), false);
  assert.equal(act(state, 'crazyTick', 0, { now: 999999999 }), state);
  state = act(state, 'crazySend'); assert.equal(state.replies[0].error, 'not_available');
  state = act(state, 'crazyAssign', 1, { target: 2, text: 'I am the mayor of this chair.', kind: 'line' });
  state = act(state, 'crazyDone', 2, { promptId: state.crazy.prompts[2].id });
  assert.equal(state.crazy.nextAt[2], 0);
  state = act(state, 'crazyPause', 0, { paused: true }); state = act(state, 'crazyPause', 0, { paused: false });
  assert.equal(Object.values(state.crazy.nextAt).every(time => time === 0), true);
  assert.equal(E.crazyDue(state, 999999999), false);
});
