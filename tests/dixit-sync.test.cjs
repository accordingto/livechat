'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../dixit-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Realtime Database omits null/empty nodes and returns dense integer-keyed
// children as arrays, even when the write used an object with numeric keys.
function firebaseValue(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, child]) => [key, firebaseValue(child)]).filter(([, child]) => child !== null);
  if (!entries.length) return null;
  const integerKeys = entries.every(([key]) => /^(0|[1-9][0-9]*)$/.test(key));
  const max = integerKeys ? Math.max(...entries.map(([key]) => Number(key))) : 0;
  if (integerKeys && entries.length > (max + 1) / 2) {
    const result = Array(max + 1).fill(null);
    entries.forEach(([key, child]) => { result[Number(key)] = child; }); return result;
  }
  return Object.fromEntries(entries);
}

// Asynchronous atomic transactions model the existing private Firebase paths.
// Each callback runs twice, exercising retry-safe captured seeds and clocks.
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map();
  const db = {
    values, before: null,
    put(path, value) {
      if (db.shape) value = db.shape(value);
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
        async once() { if (db.beforeRead) await db.beforeRead(path); return snap(values.get(path)); },
        transaction(update) {
          const task = (tails.get(path) || Promise.resolve()).then(async () => {
            if (db.before) await db.before(path);
            const first = update(clone(values.get(path))), next = update(clone(values.get(path)));
            assert.deepEqual(next, first, 'transaction retries must reuse captured randomness/time');
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            db.put(path, next); return { committed: true, snapshot: snap(values.get(path)) };
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
  let clock = 10000;
  const paths = Array.from({ length: count }, (_, i) => `rooms/DX-TEST/players/player-${i + 1}`);
  const room = { code: 'DX-TEST', count, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: { now: () => clock }, DIXIT_ENGINE: E, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../dixit-sync.js'), 'utf8'), context);
  function host(options = {}) {
    const h = new context.DIXIT_SYNC.Host({ db, room,
      onChange: payload => { h.latest = payload; }, onStatus: status => { h.lastStatus = status; }, ...options });
    hosts.push(h); h.connect(); return h;
  }
  paths.forEach((path, i) => db.ref(path).on('value', s => {
    room.answers[i + 1] = s.val(); hosts.forEach(h => h.receive(i + 1, s.val()));
  }));
  t.after(async () => { hosts.forEach(h => h.close()); await settle(...hosts); });
  return { db, room, host, paths, hosts, clock: value => { clock = value; },
    card: n => clone(db.values.get(paths[n - 1])),
    async action(n, type, extra = {}) {
      const card = this.card(n);
      const command = { id: crypto.randomUUID(), type, sessionId: card.dixit.sessionId, turnId: card.dixit.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, dixitAction: command }));
      return command;
    },
    async lobby(h, options) { await settle(h); await h.start(options); await settle(h); },
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
  const denied = await f.send(h, 3, 'deal', { actor: 0, hostPlayerNum: 3, hostControls: true });
  assert.equal(f.card(3).dixit.reply.id, denied.id); assert.ok(f.card(3).dixit.reply.error);
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

test('a spoken clue crosses the private transport as a mode without publishing invented clue text', async t => {
  const f = setup(t), h = f.host(); await f.dealt(h);
  const cardId = h.doc.state.hands[1][0], command = await f.send(h, 1, 'story', { cardId, clueMode: 'spoken' });
  assert.equal(h.doc.state.phase, 'SUBMIT'); assert.equal(h.doc.state.clue, '');
  assert.equal(f.card(1).dixit.reply.id, command.id); assert.equal(f.card(1).dixit.reply.error, '');
  for (const view of [h.latest, ...Array.from({ length: 4 }, (_, i) => f.card(i + 1))]) {
    assert.equal(view.dixit.clueMode, 'spoken'); assert.equal(view.dixit.clue, ''); assert.equal(view.dixit.artworkVersion, 2);
  }
  for (let seat = 2; seat <= 4; seat++) assert.equal(JSON.stringify(f.card(seat)).includes(JSON.stringify(cardId)), false);
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
  assert.equal(h.doc.state.phase, 'REVEALING'); assert.equal(h.latest.dixit.result, null);
  f.clock(h.doc.state.revealAnswerAt); await h.tickReveal(); await settle(h);
  assert.equal(h.doc.state.revealStage, 'answer'); assert.equal(h.latest.dixit.answerCardId, target); assert.equal(h.latest.dixit.result, null);
  f.clock(h.doc.state.revealPopularAt); await h.tickReveal(); await settle(h);
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

test('trusted host binding gives one private seat administrative controls without accepting forged actor or binding fields', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h, { hostPlayerNum: 3 });
  assert.equal(h.doc.state.hostPlayerNum, 3);
  for (let seat = 1; seat <= 4; seat++) {
    assert.equal(f.card(seat).dixit.hostControls, seat === 3); assert.equal(f.card(seat).dixit.actions.deal, seat === 3);
  }
  const forged = await f.send(h, 1, 'deal', { actor: 3, hostControls: true, hostPlayerNum: 1 });
  assert.equal(f.card(1).dixit.reply.id, forged.id); assert.equal(f.card(1).dixit.reply.error, 'not_available');
  assert.equal(h.doc.state.phase, 'LOBBY'); assert.equal(h.doc.state.hostPlayerNum, 3);
  await f.send(h, 3, 'ready', { value: true });
  const deal = await f.send(h, 3, 'deal', { firstPlayerNum: 1 });
  assert.equal(f.card(3).dixit.reply.id, deal.id); assert.equal(f.card(3).dixit.reply.error, '');
  assert.equal(h.doc.state.phase, 'CLUE'); assert.equal(h.doc.state.storyteller, 1);
  assert.deepEqual(f.card(3).dixit.hand, h.doc.state.hands[3]);
  assert.equal(f.card(3).dixit.actions.pause, true); assert.equal(f.card(2).dixit.actions.pause, false);
  await f.send(h, 1, 'story', { cardId: h.doc.state.hands[1][0], clueMode: 'spoken' });
  await Promise.all([2, 3, 4].map(seat => f.action(seat, 'submit', { cardIds: [h.doc.state.hands[seat][0]] }))); await settle(h);
  const answer = f.card(1).dixit.ownSubmitted[0], decoy = f.card(2).dixit.ownSubmitted[0];
  await Promise.all([f.action(2, 'vote', { cardId: answer }), f.action(3, 'vote', { cardId: decoy }), f.action(4, 'vote', { cardId: decoy })]); await settle(h);
  assert.equal(f.card(3).dixit.ownVote, decoy); assert.equal(f.card(3).dixit.actions.reveal, true);
  const reveal = await f.send(h, 3, 'reveal'); assert.equal(f.card(3).dixit.reply.id, reveal.id); assert.equal(h.doc.state.phase, 'REVEALING');
  f.clock(h.doc.state.revealAnswerAt); await h.tickReveal(); await settle(h);
  assert.equal(h.latest.dixit.answerCardId, answer); assert.equal(f.card(3).dixit.result, null);
  f.clock(h.doc.state.revealPopularAt); await h.tickReveal(); await settle(h);
  assert.deepEqual(f.card(3).dixit.result.popularCardIds, [decoy]); assert.equal(f.card(3).dixit.actions.nextRound, true);
  await f.send(h, 3, 'nextRound'); assert.equal(h.doc.state.phase, 'CLUE'); assert.equal(h.doc.state.storyteller, 2);
  await f.send(h, 3, 'pause'); assert.equal(h.doc.state.paused, true); await f.send(h, 3, 'resume'); assert.equal(h.doc.state.paused, false);
  await f.send(h, 3, 'cancel'); assert.equal(h.doc.state.phase, 'CANCELLED');
  const oldSession = h.doc.state.sessionId, restart = await f.send(h, 3, 'restart', { hostPlayerNum: 2 });
  assert.notEqual(h.doc.state.sessionId, oldSession); assert.equal(h.doc.state.phase, 'LOBBY'); assert.equal(h.doc.state.hostPlayerNum, 3);
  assert.equal(h.suspended, false); assert.equal(h.initialSession, null);
  assert.equal(f.card(3).dixit.reply.id, restart.id); assert.equal(f.card(3).dixit.reply.error, '');
  for (let seat = 1; seat <= 4; seat++) {
    assert.equal(f.card(seat).dixit.sessionId, h.doc.state.sessionId); assert.equal(f.card(seat).dixitAction, undefined);
    assert.deepEqual(f.card(seat).dixit.hand, []); assert.equal(f.card(seat).dixit.hostControls, seat === 3);
  }
  const before = clone(h.doc.state); await f.send(h, 3, 'restart', restart); assert.deepEqual(h.doc.state, before, 'old-session mailbox retry never restarts twice');
});

test('configured winning target and private host lobby adjustment reach every seat and survive restart', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h, { hostPlayerNum: 3, targetScore: 5 });
  assert.equal(h.doc.state.targetScore, 5); assert.equal(h.latest.dixit.targetScore, 5);
  for (let seat = 1; seat <= 4; seat++) assert.equal(f.card(seat).dixit.targetScore, 5);
  const adjusted = await f.send(h, 3, 'setTargetScore', { targetScore: 12 });
  assert.equal(f.card(3).dixit.reply.id, adjusted.id); assert.equal(f.card(3).dixit.reply.error, '');
  assert.equal(h.doc.state.targetScore, 12); assert.equal(h.latest.dixit.targetScore, 12);
  for (let seat = 1; seat <= 4; seat++) assert.equal(f.card(seat).dixit.targetScore, 12);
  const oldSession = h.doc.state.sessionId, restarted = await f.send(h, 3, 'restart', { targetScore: 5 });
  assert.notEqual(h.doc.state.sessionId, oldSession); assert.equal(h.doc.state.phase, 'LOBBY');
  assert.equal(h.doc.state.targetScore, 12); assert.equal(h.latest.dixit.targetScore, 12);
  assert.equal(f.card(3).dixit.reply.id, restarted.id); assert.equal(f.card(3).dixit.reply.error, '');
  assert.equal(h.suspended, false);
  for (let seat = 1; seat <= 4; seat++) {
    assert.equal(f.card(seat).dixit.sessionId, h.doc.state.sessionId); assert.equal(f.card(seat).dixit.targetScore, 12);
  }
});

test('shared deadline projections survive host refresh and reconnect without restarting countdown or scoring twice', async t => {
  const f = setup(t), first = f.host(); await f.voting(first);
  const answer = f.card(1).dixit.ownSubmitted[0];
  await Promise.all([2, 3, 4].map(seat => f.action(seat, 'vote', { cardId: answer }))); await settle(first);
  await first.command('reveal'); await settle(first);
  const timing = { started: first.doc.state.revealStartedAt, answer: first.doc.state.revealAnswerAt, popular: first.doc.state.revealPopularAt };
  assert.equal(first.doc.state.phase, 'REVEALING');
  for (let seat = 1; seat <= 4; seat++) {
    const view = f.card(seat).dixit;
    assert.equal(view.revealStartedAt, timing.started); assert.equal(view.revealAnswerAt, timing.answer); assert.equal(view.revealPopularAt, timing.popular);
    assert.equal(view.answerCardId, undefined); assert.equal(view.result, null); assert.deepEqual(view.roster.map(p => p.score), [0, 0, 0, 0]);
  }
  const second = f.host(); await settle(first, second); assert.equal(second.own, false);
  f.clock(timing.answer - 1); await Promise.all([first.tickReveal(), second.tickReveal()]); await settle(first, second);
  assert.equal(first.doc.state.revealStage, 'countdown');
  first.close(); await settle(first, second);
  f.clock(timing.answer + 100); await second.renew(); await settle(second); assert.equal(second.own, true);
  assert.equal(second.doc.state.revealStage, 'answer'); assert.equal(second.doc.state.revealStartedAt, timing.started);
  for (let seat = 1; seat <= 4; seat++) { assert.equal(f.card(seat).dixit.answerCardId, answer); assert.equal(f.card(seat).dixit.result, null); }
  f.db.put('.info/connected', false); await settle(second); f.clock(timing.popular + 100);
  await second.tickReveal(); assert.equal(second.doc.state.phase, 'REVEALING');
  f.db.put('.info/connected', true); await settle(second);
  assert.equal(second.doc.state.phase, 'REVEAL'); assert.equal(second.doc.state.revealStartedAt, timing.started);
  assert.deepEqual(second.doc.state.scores, { 1: 0, 2: 2, 3: 2, 4: 2 });
  const before = clone(second.doc.state); await Promise.all([second.tickReveal(), second.tickReveal(), first.tickReveal()]); await settle(second);
  assert.deepEqual(second.doc.state, before); assert.equal(f.card(1).dixit.result.maxVotes, 3);
});

test('paused countdown is inert until its shifted deadline and respects the existing room-switch guard', async t => {
  const f = setup(t), h = f.host(); await f.voting(h);
  const answer = f.card(1).dixit.ownSubmitted[0];
  await Promise.all([2, 3, 4].map(seat => f.action(seat, 'vote', { cardId: answer }))); await settle(h);
  await h.command('reveal'); await settle(h);
  f.clock(11000); await f.send(h, 1, 'pause'); assert.equal(h.doc.state.revealPausedAt, 11000);
  f.clock(61000); await h.renew(); await h.tickReveal(); await settle(h); assert.equal(h.doc.state.revealStage, 'countdown'); assert.equal(h.latest.dixit.result, null);
  await f.send(h, 1, 'resume'); assert.equal(h.doc.state.revealAnswerAt, 63000); assert.equal(h.doc.state.revealPopularAt, 64200);
  f.clock(62999); await h.tickReveal(); await settle(h); assert.equal(h.latest.dixit.answerCardId, undefined);
  f.clock(63000); await h.tickReveal(); await settle(h); assert.equal(h.latest.dixit.answerCardId, answer);
  const otherGame = { game: 'chainstory', story: 'A different game now owns this seat.' }; f.db.put(f.paths[1], otherGame); await settle(h);
  f.clock(64200); await h.tickReveal(); await settle(h);
  assert.equal(h.suspended, true); assert.deepEqual(f.card(2), otherGame); assert.equal(h.doc.state.phase, 'REVEALING');
});

test('foreground private HOST immediately takes a live shared lease and keeps playing after the shared page closes', async t => {
  const f = setup(t), shared = f.host(); await f.dealt(shared);
  const before = clone(shared.doc.state), oldLease = shared.doc.leaseUntil;
  const cardHost = f.host({ mode: 'private' }); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(shared.own, false);
  assert.equal(shared.lastStatus, 'host_card_active'); assert.equal(cardHost.doc.ownerMode, 'private');
  assert.equal(cardHost.doc.leaseUntil, oldLease, 'takeover does not wait for the previous live lease to expire');
  assert.deepEqual(cardHost.doc.state, before); assert.ok(cardHost.doc.leaseEpoch > 1);
  shared.close(); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(cardHost.doc.leaseUntil, oldLease, 'closing an old screen cannot release the new executor');
  f.clock(70000); await cardHost.renew(); await settle(cardHost);
  assert.equal(cardHost.own, true); assert.ok(f.card(1).dixit.hostLiveUntil > 70000);
  await f.send(cardHost, 1, 'story', { cardId: before.hands[1][0], clueMode: 'spoken' });
  assert.equal(cardHost.doc.state.phase, 'SUBMIT'); assert.equal(f.card(2).dixit.phase, 'SUBMIT');
  assert.equal(f.card(1).dixit.hostEpoch, cardHost.doc.leaseEpoch);
});

test('private HOST also preempts legacy shared leases and equal-priority private tabs never fight', async t => {
  const f = setup(t), shared = f.host(); await f.dealt(shared);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  const legacy = clone(f.db.values.get(path)); delete legacy.ownerMode; delete legacy.leaseEpoch;
  f.db.put(path, legacy); await settle(shared);
  const first = f.host({ mode: 'private' }); await settle(shared, first);
  const second = f.host({ mode: 'private' }); await settle(shared, first, second);
  assert.equal(first.own, true); assert.equal(second.own, false); assert.equal(shared.own, false);
  const owner = first.doc.owner, epoch = first.doc.leaseEpoch;
  for (const now of [12000, 16000, 20000]) {
    f.clock(now); await Promise.all([shared.renew(), first.renew(), second.renew()]); await settle(shared, first, second);
    assert.equal(first.doc.owner, owner); assert.equal(first.doc.leaseEpoch, epoch);
    assert.equal(second.lastStatus, 'host_card_active'); assert.equal(shared.lastStatus, 'host_card_active');
  }
  await assert.rejects(second.command('cancel'), /not_available/);
});

test('visible shared HOST replaces a hidden private owner immediately without background ownership fights', async t => {
  const f = setup(t), shared = f.host(); await f.dealt(shared);
  let visible = true;
  const cardHost = f.host({ mode: 'private', isActive: () => visible }); await settle(shared, cardHost);
  assert.equal(cardHost.own, true);
  visible = false; await cardHost.setActive(false); await settle(shared, cardHost);
  assert.equal(cardHost.own, false); assert.equal(cardHost.lastStatus, 'other_host'); assert.equal(shared.own, true);
  assert.equal(shared.doc.ownerVisible, true); assert.equal(shared.doc.ownerVisibilityClient, shared.client);
  const fallbackEpoch = shared.doc.leaseEpoch, before = clone(shared.doc.state);
  await cardHost.renew(); cardHost.project(); await cardHost.tickReveal(); await settle(shared, cardHost);
  await assert.rejects(cardHost.command('pause'), /not_available/);
  assert.deepEqual(shared.doc.state, before); assert.equal(shared.doc.leaseEpoch, fallbackEpoch);
  visible = true; await cardHost.setActive(true); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(shared.own, false); assert.ok(cardHost.doc.leaseEpoch > fallbackEpoch);
  await f.send(cardHost, 1, 'pause'); assert.equal(cardHost.doc.state.paused, true);
  cardHost.close(); await settle(shared, cardHost);
  assert.equal(shared.own, true); assert.equal(shared.lastStatus, 'ready');
  assert.equal(shared.doc.state.paused, true); assert.equal(shared.doc.state.sessionId, before.sessionId);
});

test('an initially hidden private tab cannot preempt a visible shared owner, and connectivity recovery preserves the game', async t => {
  const f = setup(t), shared = f.host(); await f.voting(shared);
  let visible = false;
  const cardHost = f.host({ mode: 'private', isActive: () => visible }); await settle(shared, cardHost);
  assert.equal(shared.own, true); assert.equal(cardHost.own, false); assert.equal(cardHost.lastStatus, 'other_host');
  visible = true; await cardHost.setActive(true); await settle(shared, cardHost);
  const before = clone(cardHost.doc.state);
  f.db.put('.info/connected', false); await settle(shared, cardHost);
  assert.equal(cardHost.own, false); assert.equal(cardHost.lastStatus, 'offline');
  await assert.rejects(cardHost.command('cancel'), /offline/);
  f.clock(50000); f.db.put('.info/connected', true); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(shared.own, false); assert.deepEqual(cardHost.doc.state, before);
  await f.send(cardHost, 2, 'vote', { cardId: f.card(1).dixit.ownSubmitted[0] });
  assert.equal(f.card(2).dixit.ownVote, f.card(1).dixit.ownSubmitted[0]);
});

test('slow player projection coalesces heartbeat snapshots and stamps only the current lease', async t => {
  const f = setup(t, 8), h = f.host(); await f.dealt(h);
  let unblock, entered;
  const gate = new Promise(resolve => { unblock = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const writes = new Map();
  let block = true;
  f.db.before = async path => {
    if (!f.paths.includes(path)) return;
    writes.set(path, (writes.get(path) || 0) + 1);
    if (block && path === f.paths[0]) { block = false; entered(); await gate; }
  };
  f.clock(11000); await h.renew(); await started;
  for (const now of [71000, 131000, 191000, 251000]) {
    f.clock(now); await h.renew(); await tick();
    await Promise.all([...h.projectionTasks].filter(([seat]) => seat !== 1).map(([, task]) => task));
    for (let n = 2; n <= 8; n++) assert.equal(f.card(n).dixit.hostLiveUntil, h.doc.leaseUntil, 'healthy seats receive fresh heartbeats while one seat stays blocked');
  }
  let actionTimer;
  try {
    await Promise.race([h.command('pause'), new Promise((resolve, reject) => { actionTimer = setTimeout(() => reject(new Error('host action was held by a slow player projection')), 500); })]);
    await tick(); await Promise.all([...h.projectionTasks].filter(([seat]) => seat !== 1).map(([, task]) => task));
    assert.equal(f.card(2).dixit.paused, true);
  } finally { clearTimeout(actionTimer); unblock(); }
  const latestLease = h.doc.leaseUntil;
  await settle(h);
  for (let n = 1; n <= 8; n++) {
    assert.equal(f.card(n).dixit.hostLiveUntil, latestLease);
  }
  assert.ok((writes.get(f.paths[0]) || 0) <= 2, 'the blocked seat attempts only its in-flight snapshot and latest coalesced snapshot');
});

test('a projection queued by an old shared owner aborts when the private HOST takes over', async t => {
  const f = setup(t, 8), shared = f.host(); await f.dealt(shared);
  let unblock, entered;
  const gate = new Promise(resolve => { unblock = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let block = true;
  f.db.before = async path => {
    if (block && path === f.paths[0]) { block = false; entered(); await gate; }
  };
  f.clock(11000); await shared.renew(); await started;
  const cardHost = f.host({ mode: 'private' }); await tick(); await tick();
  assert.equal(shared.own, false); assert.equal(cardHost.own, true);
  const privateEpoch = cardHost.doc.leaseEpoch;
  unblock(); await settle(shared, cardHost);
  assert.equal(shared.lastStatus, 'host_card_active');
  for (let n = 1; n <= 8; n++) assert.equal(f.card(n).dixit.hostEpoch, privateEpoch);
  shared.close(); await settle(cardHost); assert.equal(cardHost.own, true);
});

test('a delayed renewal commits a fresh lease immediately instead of leaving an expired captured deadline', async t => {
  const f = setup(t), h = f.host({ mode: 'private' }); await f.dealt(h);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  let delayed = false;
  f.db.before = async current => {
    if (current === path && !delayed) { delayed = true; f.clock(150000); }
  };
  f.clock(11000); await h.renew(); await settle(h);
  assert.equal(h.own, true); assert.equal(h.doc.leaseUntil, 240000);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.hostLiveUntil, 240000);
  await f.send(h, 1, 'story', { cardId: h.doc.state.hands[1][0], clueMode: 'spoken' });
  assert.equal(h.doc.state.phase, 'SUBMIT');
});

test('a failed renewal preserves the game and a later heartbeat recovers without replacing cards', async t => {
  const f = setup(t), h = f.host({ mode: 'private' }); await f.voting(h);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  const before = clone(h.doc.state);
  let failed = false;
  f.db.before = async current => { if (current === path && !failed) { failed = true; throw new Error('simulated connection interruption'); } };
  f.clock(15000); await h.renew(); assert.equal(h.lastStatus, 'error');
  f.clock(20000); await h.renew(); await settle(h);
  assert.equal(h.own, true); assert.equal(h.lastStatus, 'ready'); assert.deepEqual(h.doc.state, before);
  assert.equal(f.card(1).dixit.hostLiveUntil, 110000);
});

test('a cached legacy shared page cannot inherit private priority from a previous executor', async t => {
  const f = setup(t), cardHost = f.host({ mode: 'private' }); await f.dealt(cardHost);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  await cardHost.setActive(false); await settle(cardHost);
  // The previous adapter changes only owner and leaseUntil, preserving any
  // unfamiliar mode metadata written by a newer private executor.
  await f.db.ref(path).transaction(doc => ({ ...doc, owner: 'cached-legacy-shared', leaseUntil: 24000 }));
  await settle(cardHost);
  assert.equal(cardHost.doc.ownerMode, 'private'); assert.notEqual(cardHost.doc.ownerModeClient, cardHost.doc.owner);
  await cardHost.setActive(true); await settle(cardHost);
  assert.equal(cardHost.own, true); assert.equal(cardHost.doc.owner, cardHost.client);
  assert.equal(cardHost.doc.ownerModeClient, cardHost.client);
});

test('refresh keeps its tab resume group and immediately replaces its live private lease without old-client fights', async t => {
  const f = setup(t), group = '1'.repeat(32);
  const old = f.host({ mode: 'private', resumeGroup: group }); await f.dealt(old);
  const before = clone(old.doc.state), lease = old.doc.leaseUntil;
  const refreshed = f.host({ mode: 'private', resumeGroup: group }); await settle(old, refreshed);
  assert.notEqual(refreshed.client, old.client); assert.equal(refreshed.own, true); assert.equal(old.own, false);
  assert.equal(old.resumeSuperseded, true); assert.equal(refreshed.doc.ownerResumeGroup, group);
  assert.equal(refreshed.doc.leaseUntil, lease, 'refresh takes over immediately instead of waiting for the old lease');
  assert.deepEqual(refreshed.doc.state, before);
  const other = f.host({ mode: 'private', resumeGroup: '2'.repeat(32) }); await settle(old, refreshed, other);
  assert.equal(other.own, false); assert.equal(other.lastStatus, 'host_card_active');
  await Promise.all([old.renew(), other.renew()]); await settle(old, refreshed, other);
  assert.equal(refreshed.own, true); assert.equal(refreshed.doc.owner, refreshed.client);
  old.close(); await settle(refreshed, other);
  assert.equal(refreshed.own, true); assert.equal(refreshed.doc.leaseUntil, lease);
  await f.send(refreshed, 1, 'story', { cardId: before.hands[1][0], clueMode: 'spoken' });
  assert.equal(refreshed.doc.state.phase, 'SUBMIT');
});

for (const restarting of [false, true]) test(`${restarting ? 'restart' : 'opening'} bootstrap survives private takeover before another seat receives its new session`, async t => {
  const f = setup(t), shared = f.host(); await settle(shared);
  if (restarting) await f.dealt(shared);
  const oldCards = Array.from({ length: 4 }, (_, i) => f.card(i + 1));
  let unblock, entered;
  const gate = new Promise(resolve => { unblock = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let block = true;
  f.db.before = async path => {
    if (block && path === f.paths[1]) { block = false; entered(); await gate; }
  };
  if (restarting) await shared.command('restart'); else await shared.start();
  await started; await tick();
  const session = shared.doc.state.sessionId;
  assert.equal(f.card(1).dixit.sessionId, session);
  assert.deepEqual(f.card(2), oldCards[1]);
  assert.equal(shared.doc.openingProjection.sessionId, session);
  assert.deepEqual(clone(shared.bootstrap(shared.doc).cards[2]), oldCards[1]);
  const cardHost = f.host({ mode: 'private' }); await tick(); await tick();
  assert.equal(cardHost.own, true); assert.equal(cardHost.initialSession, session);
  unblock(); await settle(shared, cardHost);
  assert.equal(cardHost.suspended, false); assert.equal(cardHost.initialSession, null);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).dixit.sessionId, session); assert.equal(f.card(n).dixitAction, undefined);
    assert.equal(JSON.stringify(f.card(n)).includes('openingProjection'), false);
  }
  await cardHost.renew(); await settle(cardHost); assert.equal(cardHost.initialSession, null, 'heartbeats do not reload completed bootstrap');
});

test('legacy opening without durable snapshots waits for all canonical cards before private takeover', async t => {
  const f = setup(t), shared = f.host(); await f.lobby(shared);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  const doc = clone(shared.doc); delete doc.openingProjection;
  f.db.put(path, doc); await settle(shared);
  const secondCard = f.card(2), otherGame = { game: 'chainstory', story: 'Opening still pending.' };
  f.db.put(f.paths[1], otherGame); await tick();
  // A refreshed legacy executor knows its previous canonical state but has
  // not seen this seat in the new session, as during an opening projection.
  shared.suspended = false; shared.seenCards.delete(2);
  const cardHost = f.host({ mode: 'private' }); await settle(shared, cardHost);
  assert.equal(cardHost.own, false); assert.equal(shared.doc.owner, shared.client);
  f.db.put(f.paths[1], secondCard); await tick(); await cardHost.renew(); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(cardHost.suspended, false);
});

test('durable bootstrap replacement preserves a concurrent selection of another game', async t => {
  const f = setup(t), shared = f.host(); await settle(shared);
  let unblock, entered;
  const gate = new Promise(resolve => { unblock = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let block = true;
  f.db.before = async path => {
    if (block && path === f.paths[1]) { block = false; entered(); await gate; }
  };
  await shared.start(); await started; await tick();
  const cardHost = f.host({ mode: 'private' }); await tick(); await tick();
  assert.equal(cardHost.own, true);
  const otherGame = { game: 'chainstory', story: 'Selected after this opening started.' };
  f.db.put(f.paths[1], otherGame); unblock(); await settle(shared, cardHost);
  assert.equal(cardHost.suspended, true); assert.equal(cardHost.lastStatus, 'switched');
  assert.deepEqual(f.card(2), otherGame);
});

test('private HOST keeps processing in the background after the shared page closes and tolerates sixty-second heartbeat gaps', async t => {
  const f = setup(t), shared = f.host(); await f.dealt(shared);
  let visible = true;
  const cardHost = f.host({ mode: 'private', isActive: () => visible }); await settle(shared, cardHost);
  shared.close(); await settle(cardHost);
  visible = false; await cardHost.setActive(false); await settle(cardHost);
  assert.equal(cardHost.own, true); assert.equal(cardHost.lastStatus, 'ready');
  assert.equal(cardHost.doc.ownerVisible, false); assert.equal(cardHost.doc.ownerVisibilityClient, cardHost.client);
  const epoch = cardHost.doc.leaseEpoch;
  for (const now of [80000, 140000, 200000]) {
    f.clock(now); assert.equal(cardHost.liveOwner(), true, 'background heartbeat delays do not expire the ninety-second lease');
    await cardHost.renew(); await settle(cardHost);
    assert.equal(cardHost.doc.leaseUntil, now + 90000); assert.equal(cardHost.doc.leaseEpoch, epoch);
  }
  await f.send(cardHost, 1, 'story', { cardId: cardHost.doc.state.hands[1][0], clueMode: 'spoken' });
  await Promise.all([2, 3, 4].map(seat => f.action(seat, 'submit', { cardIds: [cardHost.doc.state.hands[seat][0]] })));
  await settle(cardHost);
  assert.equal(cardHost.doc.state.phase, 'VOTE'); assert.equal(f.card(2).dixit.phase, 'VOTE');
  assert.equal(cardHost.doc.ownerVisible, false, 'player requests do not invent foreground visibility');
});

test('when both host pages are hidden the existing private executor keeps its lease and receives other players requests', async t => {
  const f = setup(t); let sharedVisible = true, privateVisible = true;
  const shared = f.host({ isActive: () => sharedVisible }); await f.dealt(shared);
  sharedVisible = false; await shared.setActive(false); await settle(shared);
  const cardHost = f.host({ mode: 'private', isActive: () => privateVisible }); await settle(shared, cardHost);
  privateVisible = false; await cardHost.setActive(false); await settle(shared, cardHost);
  assert.equal(cardHost.own, true); assert.equal(shared.own, false);
  const owner = cardHost.doc.owner;
  await shared.renew(); await settle(shared, cardHost); assert.equal(cardHost.doc.owner, owner);
  const story = await f.send(cardHost, 1, 'story', { cardId: cardHost.doc.state.hands[1][0], clueMode: 'spoken' });
  assert.equal(f.card(1).dixit.reply.id, story.id); assert.equal(f.card(1).dixit.reply.error, '');
  await f.send(cardHost, 2, 'submit', { cardIds: [cardHost.doc.state.hands[2][0]] });
  assert.equal(f.card(2).dixit.ownSubmitted.length, 1);
});

test('a foreground private page may replace a hidden private owner while background tabs cannot reclaim its live lease', async t => {
  const f = setup(t); let oldVisible = true;
  const old = f.host({ mode: 'private', resumeGroup: '1'.repeat(32), isActive: () => oldVisible }); await f.dealt(old);
  oldVisible = false; await old.setActive(false); await settle(old);
  const next = f.host({ mode: 'private', resumeGroup: '2'.repeat(32) }); await settle(old, next);
  assert.equal(next.own, true); assert.equal(old.own, false);
  const owner = next.doc.owner;
  for (const now of [20000, 40000, 70000]) { f.clock(now); await Promise.all([old.renew(), next.renew()]); await settle(old, next); assert.equal(next.doc.owner, owner); }
  assert.equal(next.doc.ownerVisible, true); assert.equal(old.resumeSuperseded, false);
  old.close(); await settle(next); assert.equal(next.own, true);
});

test('if every host executor is suspended a mailbox stays pending and is applied exactly once when a host resumes', async t => {
  const f = setup(t); let visible = true;
  const cardHost = f.host({ mode: 'private', isActive: () => visible }); await f.voting(cardHost);
  visible = false; await cardHost.setActive(false); await settle(cardHost);
  const before = clone(cardHost.doc.state);
  f.clock(200000); // No executor timer or callback ran while the browser froze.
  const action = await f.action(2, 'vote', { cardId: f.card(1).dixit.ownSubmitted[0] }); await settle(cardHost);
  assert.deepEqual(cardHost.doc.state, before); assert.notEqual(f.card(2).dixit.reply.id, action.id);
  assert.equal(f.card(2).dixitAction.id, action.id); assert.equal(f.card(2).dixit.ownVote, null);
  visible = true; await cardHost.setActive(true); await settle(cardHost);
  assert.equal(cardHost.own, true); assert.equal(f.card(2).dixit.reply.id, action.id); assert.equal(f.card(2).dixit.reply.error, '');
  assert.equal(f.card(2).dixit.ownVote, action.cardId);
  const processed = clone(cardHost.doc.state); await cardHost.renew(); await settle(cardHost);
  assert.deepEqual(cardHost.doc.state, processed);
});

test('a new trusted tab in the same browser immediately replaces an un-released closed-tab lease', async t => {
  const f = setup(t), browserGroup = 'a'.repeat(32);
  const old = f.host({ mode: 'private', browserGroup, resumeGroup: '1'.repeat(32) }); await f.voting(old);
  const before = clone(old.doc.state), lease = old.doc.leaseUntil, owner = old.doc.owner;
  // Tab teardown is not guaranteed time to finish its asynchronous release.
  old.connected = false; old.close(); await settle(old);
  assert.equal(old.doc.owner, owner); assert.equal(old.doc.leaseUntil, lease);
  const next = f.host({ mode: 'private', browserGroup, resumeGroup: '2'.repeat(32) }); await settle(old, next);
  assert.equal(next.own, true); assert.notEqual(next.client, old.client);
  assert.equal(next.doc.leaseUntil, lease, 'new tab takes over without waiting ninety seconds');
  assert.equal(next.doc.ownerBrowserGroup, browserGroup); assert.equal(next.doc.ownerBrowserGroupClient, next.client);
  assert.deepEqual(next.doc.state, before);
  const otherBrowser = f.host({ mode: 'private', browserGroup: 'b'.repeat(32), resumeGroup: '3'.repeat(32) }); await settle(next, otherBrowser);
  assert.equal(otherBrowser.own, false); assert.equal(otherBrowser.lastStatus, 'host_card_active');
  await f.send(next, 2, 'vote', { cardId: f.card(1).dixit.ownSubmitted[0] });
  assert.equal(f.card(2).dixit.ownVote, f.card(1).dixit.ownSubmitted[0]);
  for (const view of [next.latest, ...[1, 2, 3, 4].map(n => f.card(n))]) {
    assert.equal(JSON.stringify(view).includes(browserGroup), false);
    assert.equal(JSON.stringify(view).includes(next.resumeGroup), false);
  }
  old.close(); await settle(next); assert.equal(next.own, true);
});

test('same-browser replacement never fights an older tab and that older tab can resume after hiding or closing it', async t => {
  const f = setup(t), browserGroup = 'a'.repeat(32);
  const old = f.host({ mode: 'private', browserGroup, resumeGroup: '1'.repeat(32) }); await f.dealt(old);
  let nextVisible = true;
  const next = f.host({ mode: 'private', browserGroup, resumeGroup: '2'.repeat(32), isActive: () => nextVisible }); await settle(old, next);
  assert.equal(next.own, true); assert.equal(old.own, false); assert.equal(old.resumeSuperseded, false);
  const before = clone(next.doc.state), owner = next.client;
  for (const now of [20000, 40000, 70000]) {
    f.clock(now); await Promise.all([old.renew(), next.renew()]); await settle(old, next);
    assert.equal(next.doc.owner, owner); assert.equal(old.own, false);
  }
  nextVisible = false; await next.setActive(false); await settle(old, next);
  assert.equal(old.own, true); assert.equal(next.own, false); assert.equal(old.resumeSuperseded, false);
  assert.deepEqual(old.doc.state, before);
  nextVisible = true; await next.setActive(true); await settle(old, next); assert.equal(old.own, true, 'previous owners cannot replace another live foreground owner');
  await old.setActive(false); await settle(old, next); assert.equal(next.own, true);
  await old.setActive(true); await settle(old, next); assert.equal(old.own, false);
  next.close(); await settle(old, next);
  assert.equal(old.own, true); assert.equal(old.resumeSuperseded, false); assert.deepEqual(old.doc.state, before);
});

test('trusted browser identity migrates a legacy private lease once while ordinary cards and other browsers remain blocked', async t => {
  const f = setup(t), old = f.host({ mode: 'private', resumeGroup: '1'.repeat(32) }); await f.dealt(old);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  const legacy = clone(old.doc); delete legacy.ownerBrowserGroup; delete legacy.ownerBrowserGroupClient;
  f.db.put(path, legacy); await settle(old);
  const noBrowserIdentity = f.host({ mode: 'private', resumeGroup: '3'.repeat(32) }); await settle(old, noBrowserIdentity);
  assert.equal(noBrowserIdentity.own, false);
  const migrated = f.host({ mode: 'private', browserGroup: 'a'.repeat(32), resumeGroup: '2'.repeat(32) }); await settle(old, noBrowserIdentity, migrated);
  assert.equal(migrated.own, true); assert.equal(migrated.doc.ownerBrowserGroup, 'a'.repeat(32));
  const different = f.host({ mode: 'private', browserGroup: 'b'.repeat(32), resumeGroup: '4'.repeat(32) }); await settle(old, migrated, different);
  assert.equal(different.own, false); assert.equal(old.own, false);
});

test('explicit opening reads actual player refs before capturing cards and tolerates an unread ROOM cache', async t => {
  const f = setup(t), h = f.host(); await settle(h);
  const previous = { game: 'hottake', round: 1, voteId: 'still-playing', phase: 'voting' };
  f.paths.forEach(path => f.db.put(path, previous)); await settle(h);
  f.room.answers = {}; h.observedCards.clear();
  let enter, release;
  const reading = new Promise(resolve => { enter = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  f.db.beforeRead = async path => { if (path === f.paths[2]) { enter(); await gate; } };
  const opening = h.start(); await reading; await tick();
  assert.equal(h.doc.state, undefined, 'canonical opening waits for every private seat read');
  for (let n = 1; n <= 4; n++) assert.deepEqual(f.card(n), previous);
  release(); await opening; await settle(h);
  assert.equal(h.suspended, false);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.sessionId, h.doc.state.sessionId);
});

const previousGames = [
  { game: 'onceupon', once: { sessionId: 'previous' } },
  { game: 'dixit', dixit: { sessionId: 'previous' } },
  { game: 'letstalk', talk: { sessionId: 'previous' } },
  ...['taboo', 'hottake', 'sophies', 'persuade'].map(game => ({ game, round: 1, voteId: 'previous' })),
  ...['scene', 'conquest'].map(game => ({ game, round: 1 })),
  { game: 'kangaroo', case: 1 }, { game: 'crack', roundId: 'previous' },
  { game: 'buttoncheck', id: 'previous' },
  { game: 'chatwolf', chatWolf: { room: 'CW-ROOM', token: 'private-player-token' } },
];
for (const previous of previousGames) test(`opening from ${previous.game} tolerates its same-session runtime updates`, async t => {
  const f = setup(t), h = f.host(); await settle(h);
  f.paths.forEach(path => f.db.put(path, previous)); await settle(h);
  let updated = false;
  f.db.before = async path => {
    if (path === f.paths[1] && !updated) {
      updated = true;
      f.db.put(path, { ...previous, phase: 'next-normal-phase', serverNow: 98765, hostLiveUntil: 100001,
        action: { id: 'normal-request' }, reply: { id: 'normal-reply' }, prevoteId: 'new-prevote', finalVoteId: 'new-final-vote',
        conquest: { id: 'new-challenge' }, stale: true });
    }
  };
  await h.start(); await settle(h);
  assert.equal(updated, true); assert.equal(h.suspended, false);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.sessionId, h.doc.state.sessionId);
  assert.equal(h.doc.openingProjection.complete, true);
  assert.equal(JSON.stringify(f.card(2)).includes('private-player-token'), false);
});

const changedGames = [
  [{ game: 'letstalk', talk: { sessionId: 'previous' } }, { game: 'letstalk', talk: { sessionId: 'newer' } }],
  [{ game: 'onceupon', once: { sessionId: 'previous' } }, { game: 'onceupon', once: { sessionId: 'newer' } }],
  [{ game: 'dixit', dixit: { sessionId: 'previous' } }, { game: 'dixit', dixit: { sessionId: 'newer' } }],
  [{ game: 'hottake', round: 1, voteId: 'previous' }, { game: 'hottake', round: 2, voteId: 'newer' }],
  [{ game: 'sophies', round: 1, voteId: 'previous' }, { game: 'sophies', round: 1, voteId: 'newer' }],
  [{ game: 'conquest', round: 1 }, { game: 'conquest', round: 2 }],
  [{ game: 'kangaroo', case: 1 }, { game: 'kangaroo', case: 2 }],
  [{ game: 'scene', round: 1, dixit: { sessionId: 'stale' } }, { game: 'hottake', round: 1, voteId: 'newer', dixit: { sessionId: 'stale' } }],
  [{ game: 'unknown', round: 1, sessionId: 'stale' }, { game: 'unknown', round: 1, sessionId: 'stale', content: 'changed' }],
];
for (const [previous, newer] of changedGames) test(`opening preserves a newer ${newer.game} game identity or unknown payload`, async t => {
  const f = setup(t), h = f.host(); await settle(h);
  f.paths.forEach(path => f.db.put(path, previous)); await settle(h);
  let updated = false;
  f.db.before = async path => { if (path === f.paths[1] && !updated) { updated = true; f.db.put(path, newer); } };
  await h.start(); await settle(h);
  assert.equal(updated, true); assert.equal(h.suspended, true); assert.equal(h.lastStatus, 'switched');
  assert.deepEqual(f.card(2), newer);
  await h.renew(); await settle(h); assert.deepEqual(f.card(2), newer);
});

for (const mode of ['shared', 'private']) test(`a fresh main page reclaims a switched ${mode} ghost lease without automatically changing cards`, async t => {
  const f = setup(t), old = f.host({ mode }); await f.lobby(old);
  const session = old.doc.state.sessionId, oldOwner = old.client;
  const foreign = { game: 'hottake', round: 1, voteId: 'ongoing', phase: 'voting' };
  f.paths.forEach(path => f.db.put(path, foreign)); await settle(old);
  assert.equal(old.suspended, true); assert.equal(old.doc.owner, oldOwner);
  const next = f.host(); await settle(old, next);
  assert.equal(next.own, true); assert.equal(next.lastStatus, 'switched'); assert.equal(old.own, false);
  for (let n = 1; n <= 4; n++) assert.deepEqual(f.card(n), foreign);
  const leaseOwner = next.client;
  for (const now of [20000, 30000, 40000]) {
    f.clock(now); await Promise.all([old.renew(), next.renew()]); await settle(old, next);
    assert.equal(next.doc.owner, leaseOwner, 'previously acquired executors cannot fight a fresh owner');
  }
  await next.start(); await settle(old, next);
  assert.notEqual(next.doc.state.sessionId, session); assert.equal(next.suspended, false);
  assert.equal(old.own, false); assert.equal(next.doc.owner, leaseOwner);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.sessionId, next.doc.state.sessionId);
});

for (const completeMarker of [true, false]) test(`a completed ${completeMarker ? 'marked' : 'legacy unmarked'} opening never replays its previous game snapshots on refresh`, async t => {
  const f = setup(t), first = f.host(); await settle(first);
  const foreign = { game: 'hottake', round: 1, voteId: 'revisited' };
  f.paths.forEach(path => f.db.put(path, foreign)); await settle(first);
  await first.start(); await settle(first);
  assert.equal(first.doc.openingProjection.complete, true);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  if (!completeMarker) await f.db.ref(path).transaction(doc => {
    const openingProjection = { ...doc.openingProjection }; delete openingProjection.complete;
    return { ...doc, openingProjection };
  });
  f.paths.forEach(playerPath => f.db.put(playerPath, { ...foreign, phase: 'later-runtime-state' })); await settle(first);
  first.close(); await settle(first);
  const next = f.host(); await settle(next);
  assert.equal(next.own, true); assert.equal(next.lastStatus, 'switched'); assert.equal(next.initialSession, null);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).game, foreign.game);
  await next.renew(); await settle(next);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).game, foreign.game);
  await next.start(); await settle(next);
  assert.equal(next.suspended, false);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.sessionId, next.doc.state.sessionId);
});

test('a failed authoritative opening read preserves the previous canonical session and all player cards', async t => {
  const f = setup(t), h = f.host(); await f.dealt(h);
  const before = clone(h.doc), cards = f.paths.map((_, i) => f.card(i + 1));
  f.db.beforeRead = async path => { if (path === f.paths[2]) throw new Error('temporary-read-failure'); };
  await assert.rejects(h.start(), /temporary-read-failure/); await settle(h);
  assert.deepEqual(h.doc, before); cards.forEach((card, i) => assert.deepEqual(f.card(i + 1), card));
  assert.equal(h.suspended, false);
});

test('a changed Hub roster leaves the old canonical table inert and explicit opening uses only current player refs', async t => {
  const f = setup(t), old = f.host(); await f.dealt(old);
  const removedCard = f.card(4), oldSession = old.doc.state.sessionId;
  f.room.count = 3;
  const playerRef = f.room.playerRef;
  f.room.playerRef = i => {
    assert.ok(i < 3, 'the removed private player link must not be read or projected');
    return playerRef(i);
  };
  const next = f.host(); await settle(old, next);
  assert.equal(next.own, true); assert.equal(next.lastStatus, 'switched');
  assert.equal(next.doc.state.roster.length, 4, 'opening a host page must not silently change an existing table');
  await next.start(); await settle(old, next);
  assert.equal(next.suspended, false); assert.equal(next.doc.state.roster.length, 3);
  assert.notEqual(next.doc.state.sessionId, oldSession); assert.deepEqual(f.card(4), removedCard);
  for (let n = 1; n <= 3; n++) assert.equal(f.card(n).dixit.sessionId, next.doc.state.sessionId);
});

test('replacement waits for initial authoritative reads before safely finishing a partially opened session', async t => {
  const f = setup(t), shared = f.host(); await settle(shared);
  let projected, releaseWrite, readStarted, releaseRead;
  const writing = new Promise(resolve => { projected = resolve; });
  const writeGate = new Promise(resolve => { releaseWrite = resolve; });
  const reading = new Promise(resolve => { readStarted = resolve; });
  const readGate = new Promise(resolve => { releaseRead = resolve; });
  let blocked = false;
  f.db.before = async path => { if (path === f.paths[1] && !blocked) { blocked = true; projected(); await writeGate; } };
  await shared.start(); await writing; await tick();
  const session = shared.doc.state.sessionId;
  f.db.beforeRead = async path => { if (path === f.paths[1]) { readStarted(); await readGate; } };
  const cardHost = f.host({ mode: 'private' }); await reading; await tick(); await tick();
  try {
    assert.equal(cardHost.own, true); assert.equal(cardHost.cardsRead(), false);
    assert.equal(cardHost.suspended, false, 'unread cards cannot be interpreted as a foreign selection');
    assert.equal(f.card(2), null);
    releaseRead(); await tick(); await tick();
    assert.equal(cardHost.initialSession, session);
    releaseWrite(); await settle(shared, cardHost);
    assert.equal(cardHost.suspended, false); assert.equal(cardHost.initialSession, null);
    assert.equal(cardHost.doc.openingProjection.complete, true);
    for (let n = 1; n <= 4; n++) assert.equal(f.card(n).dixit.sessionId, session);
  } finally { releaseRead(); releaseWrite(); }
});

test('one foreign seat does not let a fresh main page steal an otherwise current private table', async t => {
  const f = setup(t), cardHost = f.host({ mode: 'private' }); await f.dealt(cardHost);
  const before = clone(cardHost.doc.state), foreign = { game: 'hottake', round: 1, voteId: 'newer' };
  f.db.put(f.paths[0], foreign); await settle(cardHost);
  const shared = f.host(); await settle(shared, cardHost);
  assert.equal(shared.own, false); assert.equal(shared.doc.owner, cardHost.client);
  assert.equal(shared.lastStatus, 'host_card_active'); assert.deepEqual(shared.doc.state, before);
  await assert.rejects(shared.start(), /not_available/); await settle(shared, cardHost);
  assert.deepEqual(f.card(1), foreign); assert.deepEqual(shared.doc.state, before);
});

test('explicit opening survives an old canonical value callback while its creation transaction is pending', async t => {
  const f = setup(t, 3), previousHost = f.host(); await f.lobby(previousHost);
  const once = { game: 'onceupon', once: { sessionId: 'active-once', revision: 18, hostLiveUntil: 100000 } };
  f.paths.forEach(path => f.db.put(path, once)); await settle(previousHost);
  const h = f.host(); await settle(previousHost, h);
  assert.equal(h.own, true); assert.equal(h.lastStatus, 'switched');
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  let notified = false;
  f.db.before = async refPath => {
    if (refPath === path && !notified) {
      notified = true; f.db.put(path, clone(h.doc)); await tick();
    }
  };
  await h.start(); await settle(previousHost, h);
  assert.equal(notified, true); assert.equal(h.suspended, false);
  assert.equal(h.lastStatus, 'ready');
  for (let n = 1; n <= 3; n++) assert.equal(f.card(n).dixit.sessionId, h.doc.state.sessionId);
});

for (const newerSelection of [false, true]) test(`opening can return before its first canonical event${newerSelection ? ' while preserving a later foreign selection' : ' and still resume projection'}`, async t => {
  const f = setup(t, 3), previousHost = f.host(); await f.lobby(previousHost);
  const once = { game: 'onceupon', once: { sessionId: 'active-once' } };
  f.paths.forEach(path => f.db.put(path, once)); await settle(previousHost);
  const h = f.host(); await settle(previousHost, h);
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`, oldSession = h.doc.state.sessionId;
  const publish = f.db.put.bind(f.db);
  let holding = true, oldNotified = false;
  f.db.put = (refPath, value) => {
    if (holding && refPath === path && value.state?.sessionId !== oldSession) f.db.values.set(refPath, clone(value));
    else publish(refPath, value);
  };
  f.db.before = async refPath => {
    if (refPath === path && !oldNotified) { oldNotified = true; publish(path, clone(h.doc)); await tick(); }
  };
  const state = await h.start();
  assert.notEqual(state.sessionId, oldSession); assert.equal(h.openingIntent, state.sessionId);
  assert.equal(h.doc.state.sessionId, oldSession, 'transaction completion can precede its value listener');
  const newer = { game: 'onceupon', once: { sessionId: 'newer-once' } };
  if (newerSelection) publish(f.paths[1], newer);
  holding = false; publish(path, clone(f.db.values.get(path))); await settle(previousHost, h);
  assert.equal(h.openingIntent, null, 'the exact creation callback consumes intent only once');
  if (newerSelection) {
    assert.equal(h.suspended, true); assert.deepEqual(f.card(2), newer);
    await h.renew(); await settle(h);
    assert.equal(h.suspended, true); assert.deepEqual(f.card(2), newer, 'a later heartbeat cannot clear foreign rejection');
  } else {
    assert.equal(h.suspended, false); assert.equal(h.lastStatus, 'ready');
    for (let n = 1; n <= 3; n++) assert.equal(f.card(n).dixit.sessionId, state.sessionId);
  }
});

for (const emptyCards of [false, true]) test(`real Firebase numeric-array and null-node shapes support ${emptyCards ? 'a first empty-room' : 'an active Once-to-Dixit'} opening`, async t => {
  const f = setup(t, 3), h = f.host(); await settle(h);
  f.db.shape = firebaseValue;
  if (!emptyCards) {
    const previous = { game: 'onceupon', once: { sessionId: 'still-active-once' } };
    f.paths.forEach(path => f.db.put(path, previous)); await settle(h);
  }
  await h.start(); await settle(h);
  assert.equal(h.suspended, false); assert.equal(h.lastStatus, 'ready');
  assert.equal(h.doc.openingProjection.complete, true);
  for (let n = 1; n <= 3; n++) assert.equal(f.card(n).dixit.sessionId, h.doc.state.sessionId);
});

for (const emptyCards of [false, true]) for (const newerSelection of [false, true]) test(`legacy RTDB ${emptyCards ? 'omitted null' : 'array'} bootstrap ${newerSelection ? 'preserves a newer game' : 'survives private takeover'}`, async t => {
  const f = setup(t, 3), shared = f.host(); await settle(shared); f.db.shape = firebaseValue;
  const previous = emptyCards ? null : { game: 'onceupon', once: { sessionId: 'old-once' } };
  f.paths.forEach(path => f.db.put(path, previous)); await settle(shared);
  let entered, release;
  const waiting = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let blocked = false;
  f.db.before = async path => { if (path === f.paths[1] && !blocked) { blocked = true; entered(); await gate; } };
  await shared.start(); await waiting; await tick();
  const session = shared.doc.state.sessionId;
  const path = `rooms/${f.room.code}/players/${f.room.getExtra('dixitControlToken')}`;
  f.db.put(path, { ...clone(shared.doc), openingProjection: { sessionId: session, cards: { 1: previous, 2: previous, 3: previous } } });
  await tick();
  assert.equal(Array.isArray(shared.doc.openingProjection.cards), !emptyCards);
  if (emptyCards) assert.equal(shared.doc.openingProjection.cards, undefined, 'RTDB drops the entire all-null cards node');
  const privateHost = f.host({ mode: 'private' }); await tick(); await tick();
  try {
    assert.equal(privateHost.own, true); assert.equal(privateHost.initialSession, session);
    const newer = { game: 'onceupon', once: { sessionId: 'newer-once' } };
    if (newerSelection) f.db.put(f.paths[1], newer);
    release(); await settle(shared, privateHost);
    if (newerSelection) {
      assert.equal(privateHost.suspended, true); assert.deepEqual(f.card(2), newer);
      await privateHost.renew(); await settle(privateHost); assert.deepEqual(f.card(2), newer);
    } else {
      assert.equal(privateHost.suspended, false); assert.equal(privateHost.initialSession, null);
      assert.equal(privateHost.doc.openingProjection.complete, true);
      for (let n = 1; n <= 3; n++) assert.equal(f.card(n).dixit.sessionId, session);
    }
    for (let n = 1; n <= 3; n++) assert.equal(JSON.stringify(f.card(n)).includes('openingProjection'), false);
  } finally { release(); }
});
