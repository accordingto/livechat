const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../talk-engine.js');
const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
const snap = value => ({ val: () => clone(value) });

// A per-path atomic, asynchronous transport double. Updaters run twice to
// model Firebase retries; snapshots and writes never share object references.
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map();
  function put(path, value) {
    values.set(path, clone(value));
    for (const cb of listeners.get(path) || []) queueMicrotask(() => cb(snap(value)));
  }
  return {
    values, put,
    ref(path) {
      return {
        on(event, cb) {
          if (!listeners.has(path)) listeners.set(path, new Set());
          listeners.get(path).add(cb); queueMicrotask(() => cb(snap(values.get(path))));
        },
        off(event, cb) { listeners.get(path)?.delete(cb); },
        transaction(update) {
          const task = (tails.get(path) || Promise.resolve()).then(() => {
            update(clone(values.get(path)));
            const next = update(clone(values.get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            put(path, next); return { committed: true, snapshot: snap(next) };
          });
          tails.set(path, task.catch(() => {})); return task;
        },
      };
    },
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) {
  for (let i = 0; i < 8; i++) {
    await tick();
    await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing]));
  }
}
const topic = { id: 'ease', question: 'What helps you feel at ease?', title: 'Ease', followUp: 'Why?' };
function setup() {
  const db = database(), extras = {}, hosts = [];
  const paths = [1, 2, 3, 4].map(n => `rooms/TEST/players/player-${n}`);
  const room = { code: 'TEST', count: 4, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: k => extras[k], setExtra: (k, v) => { extras[k] = v; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date, TALK_ENGINE: E, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  function host() {
    const h = new context.TALK_SYNC.Host({ db, room,
      onChange: state => { h.latest = state; }, onStatus: status => { h.lastStatus = status; } });
    hosts.push(h); h.connect(); return h;
  }
  paths.forEach((p, i) => db.ref(p).on('value', s => {
    room.answers[i + 1] = s.val(); hosts.forEach(h => h.receive(i + 1, s.val()));
  }));
  return { db, room, host, paths, hosts,
    card: n => clone(db.values.get(paths[n - 1])),
    async action(n, type, extra = {}) {
      const card = this.card(n);
      const command = { id: crypto.randomUUID(), type, sessionId: card.talk.sessionId, turnId: card.talk.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, talkAction: command }));
      return command;
    },
  };
}

test('projects private cards, derives actor from the card, and acknowledges concurrent intents', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic, mode: 'write', seconds: 45 }); await settle(h);
  assert.equal(f.card(4).game, 'letstalk');
  const [one, two] = await Promise.all([
    f.action(1, 'ready', { actor: 4 }), f.action(2, 'note', { text: 'Quiet time.' }),
  ]);
  await settle(h);
  assert.equal(h.latest.readiness[1].value, 'ready');
  assert.equal(h.latest.readiness[4], undefined);
  assert.equal(f.card(1).talk.reply.id, one.id);
  assert.equal(f.card(2).talk.reply.id, two.id);
  assert.equal(f.card(3).talk.notes[0].text, 'Quiet time.');
  assert.equal(f.card(3).talk.readiness, '');
  assert.equal(JSON.stringify(f.card(3)).includes(f.room.getExtra('letsTalkControlToken')), false);
  await h.command('start'); await settle(h);
  const speaker = h.latest.speaker;
  const ended = await f.action(speaker, 'end'); await settle(h);
  assert.equal(h.latest.turnId, 2);
  await f.action(speaker, 'end', ended); await settle(h);
  assert.equal(h.latest.turnId, 2, 'replaying an old request never passes another turn');
  h.close();
});

test('one host owns the room, and a replacement continues the same state', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ topic }); await settle(first);
  await first.command('start'); await settle(first);
  const session = first.latest.sessionId, speaker = first.latest.speaker;
  const second = f.host(); await settle(first, second);
  assert.equal(first.own, true); assert.equal(second.own, false);
  await assert.rejects(second.command('end'));
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true);
  assert.equal(second.latest.sessionId, session); assert.equal(second.latest.speaker, speaker);
  // A late close from the previous host cannot clear its successor's lease.
  first.close(); await settle(second); assert.equal(second.own, true);
  await second.command('end'); await settle(second); assert.equal(second.latest.turnId, 2);
  second.close();
});

test('projections preserve a player request arriving during another state update', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic }); await settle(h); await h.command('start'); await settle(h);
  const listener = E.order(h.latest)[0];
  const [request] = await Promise.all([f.action(listener, 'ask'), h.command('extend')]);
  await settle(h);
  assert.equal(f.card(listener).talkAction.id, request.id);
  assert.equal(f.card(listener).talk.reply.id, request.id);
  assert.equal(h.latest.questions.length, 1);
  assert.equal(h.latest.extended, true);
  h.close();
});

test('switching games suspends old publishers, and explicitly opening a topic restores cards', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic }); await settle(h);
  f.db.put(f.paths[0], { game: 'wordwolf', word: 'test word' }); await settle(h);
  assert.equal(h.suspended, true);
  await h.renew(); await settle(h);
  assert.equal(f.card(1).game, 'wordwolf');
  await h.start({ topic: { ...topic, id: 'next' } }); await settle(h);
  assert.equal(h.suspended, false);
  assert.equal(f.card(1).game, 'letstalk'); assert.equal(f.card(1).talk.topic.id, 'next');
  assert.equal(f.card(1).word, undefined);
  h.close();
});

test('a new topic waits for old projections and stale topic requests cannot affect it', async () => {
  const f = setup(), h = f.host(); await settle(h);
  await h.start({ topic }); await settle(h);
  const old = f.card(1).talk;
  h.project();
  await h.start({ topic: { ...topic, id: 'new' }, mode: 'write' }); await settle(h);
  await f.action(1, 'ready', { sessionId: old.sessionId, turnId: old.turnId }); await settle(h);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).talk.topic.id, 'new');
    assert.equal(f.card(n).talk.readiness, '');
  }
  h.close();
});

test('chosen and custom follow-ups survive host replacement without using a main turn', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ topic: { ...topic, followUps: [{ stage: 'tradeoff', question: 'Who bears the cost?' }] } });
  await settle(first); await first.command('start'); await settle(first);
  const original = [first.latest.sessionId, first.latest.turnId, first.latest.speaker];
  await first.command('extend', { index: 0 }); await settle(first);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).talk.topic.followUp, 'Who bears the cost?');
  await first.command('extend', { text: 'What would you change here?' }); await settle(first);
  first.close(); await settle(first);
  const second = f.host(); await settle(second);
  assert.deepEqual([second.latest.sessionId, second.latest.turnId, second.latest.speaker], original);
  assert.equal(f.card(4).talk.topic.followUp, 'What would you change here?');
  await second.command('extend', { show: false }); await settle(second);
  assert.equal(f.card(1).talk.extended, false);
  second.close();
});

test('starter preference reaches every card and survives replacing the host', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({topic:{...topic,starter:'Imagine joining a new group.'},showStarters:false});
  await settle(first);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).talk.showStarters, false);
  await first.command('starters', {show:true}); await settle(first);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).talk.showStarters, true);
    assert.equal(f.card(n).talk.starter, 'Imagine joining a new group.');
  }
  first.close(); await settle(first);
  const second = f.host(); await settle(second);
  assert.equal(second.latest.showStarters, true);
  await second.command('explain', {text:'Being at ease means feeling comfortable enough to speak openly.'}); await settle(second);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).talk.starter, 'Being at ease means feeling comfortable enough to speak openly.');
  await second.command('starters', {show:false}); await settle(second);
  assert.equal(f.card(1).talk.showStarters, false);
  assert.equal(f.card(1).talk.phase, 'thinking');
  await second.start({topic}); await settle(second);
  assert.equal(f.card(1).talk.showStarters, true);
  assert.equal(f.card(1).talk.starter, '');
  second.close();
});

test('authoritative clock starts a prepared normal round and ends every card at the shared deadline', async () => {
  const f = setup(), h = f.host(); await settle(h);
  let clock = Date.now(); h.now = () => clock;
  await h.start({ topic, mode: 'think', seconds: 15, gameSeconds: 60, crazyTaskSeconds: 150 }); await settle(h);
  assert.equal(h.latest.gameDeadline, 0); assert.equal(f.card(2).talk.gameSeconds, 60);
  clock = h.latest.deadline; await h.renew(); await settle(h);
  assert.equal(await h.tickClock(), true); await settle(h);
  assert.equal(h.latest.phase, 'talking'); assert.equal(h.latest.gameDeadline, clock + 60000);
  clock = h.latest.gameDeadline; await h.renew(); await settle(h);
  assert.equal(await h.tickClock(), true); await settle(h);
  for (const num of [1,2,3,4]) assert.equal(f.card(num).talk.phase, 'ended');
  const oldSession = h.latest.sessionId;
  await h.start({ topic: { ...topic, id: 'next-round' }, mode: 'think', seconds: 15, gameMode: 'normal', showStarters: true, gameSeconds: 120, crazyTaskSeconds: 239 });
  await settle(h);
  assert.notEqual(h.latest.sessionId, oldSession); assert.equal(h.latest.phase, 'thinking'); assert.equal(h.latest.gameDeadline, 0);
  assert.equal(f.card(3).talk.gameSeconds, 120); assert.ok(f.card(3).talk.scores.every(entry => entry.score === 0));
  h.close();
});
test('host clock expires a private mission, projects public score and preserves new round timing', async () => {
  const f = setup(), h = f.host(); await settle(h);
  let clock = Date.now(); h.now = () => clock;
  await h.start({ topic, seconds: 15, gameMode: 'crazy', gameSeconds: 120, crazyTaskSeconds: 30,
    crazyMinSeconds: 5, crazyMaxSeconds: 5 }); await h.command('start'); await settle(h);
  assert.equal(f.card(1).talk.crazy.taskSeconds, 30);
  clock = h.latest.crazy.nextAssignAt; await h.tickClock(); await settle(h);
  const recipient = h.latest.crazy.pendingPlayerNums?.[0] || Number(Object.keys(h.latest.crazy.prompts).find(num => h.latest.crazy.prompts[num].status === 'pending'));
  const prompt = f.card(recipient).talk.crazy.prompt;
  assert.equal(prompt.status, 'pending'); assert.equal(prompt.expiresAt, clock + 30000);
  for (const num of [1,2,3,4].filter(num => num !== recipient)) assert.ok(!JSON.stringify(f.card(num)).includes(prompt.text));
  clock = prompt.expiresAt; await h.renew(); await settle(h); await h.tickCrazy(); await settle(h);
  assert.equal(f.card(recipient).talk.crazy.prompt.status, 'expired');
  assert.ok(Object.values(h.latest.crazy.prompts).some(item => item.status === 'pending'), 'expiry hands a new mission to another player');
  assert.ok(f.card(1).talk.scores.every(entry => entry.score === 0));
  await h.command('finish'); await settle(h);
  for (const num of [1,2,3,4]) assert.equal(f.card(num).talk.phase, 'ended');
  h.close();
});


test('Host.start carries the journal from transaction-current state while its cached snapshot is stale', async () => {
  const f = setup(), h = f.host(); await settle(h);
  let clock = Date.now(); h.now = () => clock;
  await h.start({ topic, gameMode: 'crazy', crazySource: 'players', conversationMode: 'free',
    gameSeconds: 120, crazyTaskSeconds: 30, crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  await settle(h);
  const cachedSession = h.doc.state.sessionId;
  assert.deepEqual(h.doc.state.challengeArchive.records, []);
  let current = clone(h.doc.state), serial = 0;
  const commit = (type, actor, extra = {}) => {
    current = E.apply(current, { id: 'remote-' + ++serial, type, actor, sessionId: current.sessionId,
      turnId: current.turnId, now: clock, seed: 41, ...extra });
  };
  clock++; commit('crazyAssign', 1, { target: 2, text: 'A finished chicken song.' });
  clock++; commit('start', 0);
  clock = current.crazy.nextAssignAt; commit('clockTick', 0);
  clock++; commit('crazyDone', 2, { promptId: current.crazy.prompts[2].id });
  clock++; commit('crazyAssign', 3, { target: 4, text: 'A still active duck song.' });
  clock = current.crazy.nextAssignAt; commit('clockTick', 0);
  clock++; commit('crazyAssign', 1, { target: 3, text: 'A waiting goat song.' });
  const [done, pending, queued] = current.challengeArchive.records;
  assert.deepEqual([done.status, pending.status, queued.status], ['done', 'pending', 'queued']);
  // Earlier snapshots were persisted; the terminal outcome and future
  // cancellations still need writing. An already-persisted queued card must
  // also remain available to archive its cancellation during replacement.
  current = E.ackArchive(current, [{ id: done.id, version: 2 }, { id: pending.id, version: 1 }, { id: queued.id, version: 1 }]);
  const before = clone(current.challengeArchive.records);
  const controlPath = 'rooms/TEST/players/' + f.room.getExtra('letsTalkControlToken');
  const canonical = f.db.values.get(controlPath);
  // Model a remote commit before its value-listener notification arrives.
  // Do not call put(): the host must still see its cached empty journal.
  f.db.values.set(controlPath, { ...clone(canonical), state: current, revision: canonical.revision + 1, leaseUntil: clock + 14000 });
  assert.equal(h.doc.state.sessionId, cachedSession); assert.deepEqual(h.doc.state.challengeArchive.records, []);
  clock++;
  await h.start({ topic: { ...topic, id: 'replacement-with-history' }, gameMode: 'normal' }); await settle(h);
  assert.notEqual(h.latest.sessionId, cachedSession);
  const retained = h.latest.challengeArchive.records;
  assert.deepEqual(retained.map(record => record.id), before.map(record => record.id));
  assert.deepEqual(retained[0], before[0], 'terminal record awaiting its latest ACK is retained exactly');
  assert.deepEqual(retained.map(record => [record.status, record.version, record.persistedVersion]),
    [['done', 3, 2], ['cancelled', 3, 1], ['cancelled', 2, 1]]);
  assert.equal(retained[1].closedAt, clock); assert.equal(retained[2].closedAt, clock);
  assert.equal(E.archiveEntries(h.latest).length, 3);
  for (const num of [1, 2, 3, 4]) {
    const serialized = JSON.stringify(f.card(num));
    for (const marker of ['challengeArchive', 'archiveId', 'persistedVersion', ...retained.flatMap(record => [record.id, record.text])]) {
      assert.equal(serialized.includes(marker), false, 'history cannot enter a private gameplay projection');
    }
  }
  h.close();
});
