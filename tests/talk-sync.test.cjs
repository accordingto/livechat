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
