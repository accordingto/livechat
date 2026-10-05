'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../dixit-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Asynchronous atomic transactions model the existing private Firebase paths.
// Each callback runs twice, exercising retry-safe captured seeds and clocks.
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map();
  const db = {
    values, before: null,
    put(path, value) {
      values.set(path, clone(value));
      for (const cb of listeners.get(path) || []) queueMicrotask(() => cb(snap(value)));
    },
    ref(path) {
      return {
        on(event, cb) {
          if (!listeners.has(path)) listeners.set(path, new Set());
          listeners.get(path).add(cb); queueMicrotask(() => cb(snap(values.get(path))));
        },
        off(event, cb) { listeners.get(path)?.delete(cb); },
        transaction(update) {
          const task = (tails.get(path) || Promise.resolve()).then(async () => {
            if (db.before) await db.before(path);
            const first = update(clone(values.get(path))), next = update(clone(values.get(path)));
            assert.deepEqual(next, first, 'transaction retries must reuse captured randomness/time');
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            db.put(path, next); return { committed: true, snapshot: snap(next) };
          });
          tails.set(path, task.catch(() => {})); return task;
        },
      };
    },
  };
  return db;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) {
  for (let i = 0; i < 10; i++) {
    await tick();
    await Promise.all(hosts.flatMap(host => [host.serial, host.outgoing]));
  }
}
function setup(t, count = 4) {
  const db = database(), extras = {}, hosts = [];
  const paths = Array.from({ length: count }, (_, i) => `rooms/DX-TEST/players/player-${i + 1}`);
  const room = { code: 'DX-TEST', count, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date, DIXIT_ENGINE: E, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../dixit-sync.js'), 'utf8'), context);
  function host() {
    const h = new context.DIXIT_SYNC.Host({ db, room,
      onChange: payload => { h.latest = payload; }, onStatus: status => { h.lastStatus = status; } });
    hosts.push(h); h.connect(); return h;
  }
  paths.forEach((path, i) => db.ref(path).on('value', s => {
    room.answers[i + 1] = s.val(); hosts.forEach(h => h.receive(i + 1, s.val()));
  }));
  t.after(async () => { hosts.forEach(h => h.close()); await settle(...hosts); });
  return { db, room, host, paths, hosts,
    card: n => clone(db.values.get(paths[n - 1])),
    async action(n, type, extra = {}) {
      const card = this.card(n);
      const command = { id: crypto.randomUUID(), type, sessionId: card.dixit.sessionId, turnId: card.dixit.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, dixitAction: command }));
      return command;
    },
    async lobby(h) { await settle(h); await h.start(); await settle(h); },
    async dealt(h) {
      await this.lobby(h);
      await Promise.all(paths.map((_, i) => this.action(i + 1, 'ready', { value: true })));
      await settle(h); await h.command('deal', { firstPlayerNum: 1 }); await settle(h);
    },
    async send(h, n, type, extra = {}) { const command = await this.action(n, type, extra); await settle(h); return command; },
    async voting(h) {
      await this.dealt(h);
      await this.send(h, 1, 'story', { cardId: h.doc.state.hands[1][0], clue: 'The moon keeps a secret.' });
      await Promise.all(paths.slice(1).map((_, i) => {
        const seat = i + 2;
        return this.action(seat, 'submit', { cardIds: h.doc.state.hands[seat].slice(0, count === 3 ? 2 : 1) });
      }));
      await settle(h);
    },
  };
}

for (const count of [3, 4, 8]) test(`${count} players receive only their own hand; host receives no private cards`, async t => {
  const f = setup(t, count), h = f.host(); await f.dealt(h);
  assert.equal(h.doc.state.phase, 'CLUE');
  const control = f.room.getExtra('dixitControlToken');
  assert.match(control, /^[a-f0-9]{32}$/);
  assert.equal(f.room.getExtra('letsTalkControlToken'), undefined);
  assert.equal(f.room.getExtra('onceUponControlToken'), undefined);
  const allHands = Object.values(h.doc.state.hands).flat();
  assert.equal(new Set(allHands).size, allHands.length);
  for (let seat = 1; seat <= count; seat++) {
    const card = f.card(seat);
    assert.equal(card.game, 'dixit'); assert.equal(card.dixit.version, 1);
    assert.equal(card.dixit.playerNum, seat); assert.equal(card.dixit.hand.length, count === 3 ? 7 : 6);
    assert.deepEqual(card.dixit.hand, h.doc.state.hands[seat]);
    const serialized = JSON.stringify(card);
    for (let other = 1; other <= count; other++) {
      if (other === seat) continue;
      h.doc.state.hands[other].forEach(id => assert.equal(serialized.includes(JSON.stringify(id)), false));
      assert.equal(serialized.includes(f.paths[other - 1]), false);
    }
    assert.equal(serialized.includes(control), false);
    assert.equal(card.dixit.deck, undefined); assert.equal(card.dixit.hands, undefined);
    assert.equal(card.dixit.tableOwners, undefined); assert.equal(card.dixit.answer, undefined);
  }
  const hostView = JSON.stringify(h.latest);
  allHands.forEach(id => assert.equal(hostView.includes(JSON.stringify(id)), false));
  assert.equal(h.latest.dixit.playerNum, 0); assert.equal(h.latest.dixit.hand, undefined);
  assert.equal(h.latest.dixit.ownSubmitted, undefined); assert.equal(h.latest.dixit.ownVote, undefined);
  assert.equal(hostView.includes(control), false);
  assert.equal([...f.db.values.keys()].filter(path => path.startsWith('rooms/')).length, count + 1);
});

test('seat listeners establish actor identity; concurrent readiness and mailboxes are preserved', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const commands = await Promise.all([f.action(1, 'ready', { value: true, actor: 4 }), f.action(2, 'ready', { value: true, actor: 0 })]);
  await settle(h);
  const roster = f.card(1).dixit.roster;
  assert.equal(roster[0].ready, true); assert.equal(roster[1].ready, true); assert.equal(roster[3].ready, false);
  for (let seat = 1; seat <= 2; seat++) {
    assert.equal(f.card(seat).dixit.reply.id, commands[seat - 1].id);
    assert.equal(f.card(seat).dixitAction.id, commands[seat - 1].id);
  }
  const denied = await f.send(h, 1, 'deal', { actor: 0 });
  assert.equal(f.card(1).dixit.reply.id, denied.id); assert.ok(f.card(1).dixit.reply.error);
  assert.equal(h.doc.state.phase, 'LOBBY');
  await h.command('deal', { firstPlayerNum: 1 }); await settle(h);
  assert.equal(h.doc.state.phase, 'CLUE'); assert.equal(f.card(4).dixit.hand.length, 6);
  assert.equal(f.card(2).dixitAction.id, commands[1].id);
});

test('duplicate host deal and storyteller requests do not advance or consume cards twice', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const envelope = { id: 'direct-host-deal', sessionId: h.doc.state.sessionId, turnId: h.doc.state.turnId, firstPlayerNum: 1 };
  await h.command('deal', envelope); await settle(h);
  const before = clone(h.doc.state.hands);
  await h.command('deal', envelope); await settle(h); assert.deepEqual(h.doc.state.hands, before);
  const story = await f.send(h, 1, 'story', { cardId: before[1][0], clue: 'A forgotten promise' });
  const after = clone(h.doc.state);
  await f.send(h, 1, 'story', story); assert.deepEqual(h.doc.state, after);
  assert.equal(f.card(1).dixit.reply.id, story.id); assert.equal(f.card(1).dixit.reply.error, '');
});

for (const count of [3, 4, 8]) test(`${count}-player concurrent submissions produce one shared anonymous voting table`, async t => {
  const f = setup(t, count), h = f.host(); await f.dealt(h);
  const target = h.doc.state.hands[1][0];
  await f.send(h, 1, 'story', { cardId: target, clue: 'Yesterday was a dream' });
  assert.equal(h.doc.state.phase, 'SUBMIT');
  for (let seat = 2; seat <= count; seat++) {
    assert.equal(JSON.stringify(f.card(seat)).includes(JSON.stringify(target)), false, 'answer is hidden before the shared table opens');
  }
  assert.equal(JSON.stringify(h.latest).includes(JSON.stringify(target)), false);
  const submissions = Object.fromEntries(Array.from({ length: count - 1 }, (_, i) => {
    const seat = i + 2; return [seat, h.doc.state.hands[seat].slice(0, count === 3 ? 2 : 1)];
  }));
  const commands = await Promise.all(Object.entries(submissions).map(([seat, cardIds]) => f.action(+seat, 'submit', { cardIds, actor: 1 })));
  await settle(h);
  assert.equal(h.doc.state.phase, 'VOTE');
  const table = f.card(1).dixit.table;
  assert.equal(table.length, count === 3 ? 5 : count);
  assert.deepEqual(new Set(table), new Set([target, ...Object.values(submissions).flat()]));
  for (let seat = 1; seat <= count; seat++) {
    const view = f.card(seat).dixit;
    assert.deepEqual(view.table, table);
    assert.equal(view.answer, undefined); assert.equal(view.tableOwners, undefined); assert.equal(view.result, null);
    if (seat > 1) {
      assert.deepEqual(view.ownSubmitted, submissions[seat]);
      assert.equal(view.reply.id, commands[seat - 2].id); assert.equal(view.reply.error, '');
    }
    assert.equal(view.submissions, undefined); assert.equal(view.votes, undefined);
  }
  assert.equal(h.latest.dixit.ownSubmitted, undefined); assert.equal(h.latest.dixit.answer, undefined);
  assert.equal(h.latest.dixit.tableOwners, undefined); assert.equal(h.latest.dixit.result, null);
  const before = clone(h.doc.state);
  await f.send(h, 2, 'submit', commands[0]); assert.deepEqual(h.doc.state, before);
});

test('a player cannot vote for an own decoy; votes stay private and reveal waits for every voter', async t => {
  const f = setup(t), h = f.host(); await f.voting(h);
  const target = f.card(1).dixit.ownSubmitted[0];
  const invalid = await f.send(h, 2, 'vote', { cardId: f.card(2).dixit.ownSubmitted[0] });
  assert.equal(f.card(2).dixit.reply.id, invalid.id); assert.ok(f.card(2).dixit.reply.error);
  assert.equal(f.card(2).dixit.ownVote, null);
  const first = await f.send(h, 2, 'vote', { cardId: target });
  assert.equal(f.card(2).dixit.ownVote, target); assert.equal(f.card(3).dixit.ownVote, null);
  assert.equal(f.card(3).dixit.votes, undefined); assert.equal(h.latest.dixit.ownVote, undefined);
  await assert.rejects(h.command('reveal'));
  assert.equal(h.doc.state.phase, 'VOTE');
  const before = clone(h.doc.state);
  await f.send(h, 2, 'vote', first); assert.deepEqual(h.doc.state, before);
  const votes = await Promise.all([f.action(3, 'vote', { cardId: target }), f.action(4, 'vote', { cardId: target })]);
  await settle(h);
  assert.equal(h.doc.state.phase, 'VOTE');
  assert.equal(f.card(3).dixit.reply.id, votes[0].id); assert.equal(f.card(4).dixit.reply.id, votes[1].id);
  await h.command('reveal'); await settle(h);
  assert.equal(h.doc.state.phase, 'REVEAL'); assert.ok(h.latest.dixit.result);
  for (let seat = 1; seat <= 4; seat++) assert.deepEqual(f.card(seat).dixit.result, h.latest.dixit.result);
});

test('one host owns the lease; refresh and reconnect preserve private hands, submissions, votes, and session', async t => {
  const f = setup(t), first = f.host(); await f.voting(first);
  await f.send(first, 2, 'vote', { cardId: f.card(1).dixit.ownSubmitted[0] });
  const before = clone(first.doc.state), second = f.host(); await settle(first, second);
  assert.equal(first.own, true); assert.equal(second.own, false);
  await assert.rejects(second.command('cancel'), /not_available/);
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(second.doc.state, before);
  first.close(); await settle(second); assert.equal(second.own, true);
  f.db.put('.info/connected', false); await settle(second); assert.equal(second.own, false);
  await assert.rejects(second.command('cancel'), /offline/);
  f.db.put('.info/connected', true); await settle(second); assert.equal(second.own, true);
  assert.deepEqual(second.doc.state, before); assert.equal(f.card(2).dixit.ownVote, f.card(1).dixit.ownSubmitted[0]);
});

test('another game suspends projections; starting a new session clears the old mailbox', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const old = f.card(1).dixit;
  await f.send(h, 1, 'ready', { value: true });
  const otherGame = { game: 'chainstory', story: 'A new game selected.' };
  f.db.put(f.paths[0], otherGame); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.lastStatus, 'switched');
  await h.renew(); await settle(h); assert.deepEqual(f.card(1), otherGame);
  await assert.rejects(h.command('deal'), /not_available/);
  await h.start(); await settle(h);
  assert.equal(h.suspended, false); assert.notEqual(h.doc.state.sessionId, old.sessionId);
  for (let seat = 1; seat <= 4; seat++) { assert.equal(f.card(seat).game, 'dixit'); assert.equal(f.card(seat).dixitAction, undefined); }
  await f.send(h, 1, 'ready', { value: true, sessionId: old.sessionId, turnId: old.turnId });
  assert.equal(f.card(1).dixit.roster[0].ready, false);
});

test('a game switch during opening cannot be overwritten by a late projection', async t => {
  const f = setup(t), h = f.host(); await settle(h);
  let switched = false;
  const otherGame = { game: 'chainstory', story: 'Selected while opening.' };
  f.db.before = async path => {
    if (!switched && path === f.paths[2]) { switched = true; f.db.put(path, otherGame); }
  };
  await h.start(); await settle(h);
  assert.equal(h.suspended, true); assert.deepEqual(f.card(3), otherGame);
  await h.renew(); await settle(h); assert.deepEqual(f.card(3), otherGame);
});

test('old revisions and shorter leases never overwrite a newer player view', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const card = f.card(1);
  const newer = { ...card, dixit: { ...card.dixit, revision: card.dixit.revision + 20, hostLiveUntil: card.dixit.hostLiveUntil + 1000 } };
  f.db.put(f.paths[0], newer); await settle(h); h.project(); await settle(h);
  assert.equal(f.card(1).dixit.revision, newer.dixit.revision);
  const equal = { ...card, dixit: { ...card.dixit, hostLiveUntil: card.dixit.hostLiveUntil + 50000 } };
  f.db.put(f.paths[0], equal); await settle(h); h.project(); await settle(h);
  assert.equal(f.card(1).dixit.hostLiveUntil, equal.dixit.hostLiveUntil); assert.equal(h.suspended, false);
});

test('invalid roster counts fail before a private game is opened', async t => {
  for (const count of [2, 9]) {
    const f = setup(t, count), h = f.host(); await settle(h);
    await assert.rejects(h.start(), /player_count/); assert.equal(h.doc?.state, undefined);
  }
});

test('restart replaces the session and clears mailbox requests without leaking the previous hand', async t => {
  const f = setup(t), h = f.host(); await f.voting(h);
  const oldSession = h.doc.state.sessionId;
  await h.command('restart'); await settle(h);
  assert.equal(h.doc.state.phase, 'LOBBY'); assert.notEqual(h.doc.state.sessionId, oldSession);
  assert.equal(h.suspended, false); assert.equal(h.initialSession, null);
  for (let seat = 1; seat <= 4; seat++) {
    const card = f.card(seat);
    assert.equal(card.dixit.sessionId, h.doc.state.sessionId); assert.deepEqual(card.dixit.hand, []);
    assert.equal(card.dixitAction, undefined); assert.equal(card.dixit.roster.some(player => player.ready), false);
  }
});
