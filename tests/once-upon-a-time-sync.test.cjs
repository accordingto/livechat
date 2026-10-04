'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
const E = require('../once-upon-a-time-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Same asynchronous, per-path atomic Firebase double as talk-sync.test.cjs.
// Every updater runs twice. The first result is discarded to exercise retries.
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
            assert.deepEqual(next, first, 'transaction retry must reuse captured randomness/time');
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
function setup(t, count = 4, fixedSeed = null) {
  const db = database(), extras = {}, hosts = [];
  const paths = Array.from({ length: count }, (_, i) => `rooms/OU-TEST/players/player-${i + 1}`);
  const room = { code: 'OU-TEST', count, answers: {}, name: i => 'Person ' + (i + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const contextCrypto = fixedSeed == null ? crypto : { getRandomValues(array) {
    crypto.getRandomValues(array);
    if (array.BYTES_PER_ELEMENT === 4) array.fill(fixedSeed);
    return array;
  } };
  const context = vm.createContext({ crypto: contextCrypto, Date, ONCE_ENGINE: E, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../once-upon-a-time-sync.js'), 'utf8'), context);
  function host() {
    const h = new context.ONCE_SYNC.Host({ db, room,
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
      const command = { id: crypto.randomUUID(), type, sessionId: card.once.sessionId, turnId: card.once.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, onceAction: command }));
      return command;
    },
    async lobby(h) { await settle(h); await h.start(); await settle(h); },
    async dealt(h) {
      await this.lobby(h);
      await Promise.all(paths.map((_, i) => this.action(i + 1, 'ready', { value: true })));
      await settle(h); await h.command('deal'); await settle(h);
    },
    async story(h) { await this.dealt(h); await h.command('chooseFirst', { playerNum: 1 }); await settle(h); },
    async send(h, n, type, extra = {}) { const command = await this.action(n, type, extra); await settle(h); return command; },
  };
}

for (const count of [2, 4, 6]) test(`${count} players receive only their own private cards; host receives a public view`, async t => {
  const f = setup(t, count), h = f.host(); await f.dealt(h);
  assert.equal(h.doc.state.phase, 'CHOOSING_FIRST');
  const control = f.room.getExtra('onceUponControlToken');
  assert.match(control, /^[a-f0-9]{32}$/);
  assert.equal(f.room.getExtra('letsTalkControlToken'), undefined);
  assert.equal(h.ref !== undefined, true);
  const allHands = Object.values(h.doc.state.hands).flat();
  assert.equal(new Set(allHands).size, count * Math.max(5, 11 - count));
  assert.equal(new Set(Object.values(h.doc.state.endings)).size, count);
  for (let seat = 1; seat <= count; seat++) {
    const card = f.card(seat);
    assert.equal(card.game, 'onceupon'); assert.equal(card.once.version, 1);
    assert.equal(card.once.playerNum, seat); assert.equal(card.once.hand.length, Math.max(5, 11 - count));
    assert.deepEqual(card.once.hand.map(c => c.id), h.doc.state.hands[seat]);
    assert.equal(card.once.ending.id, h.doc.state.endings[seat]);
    const serialized = JSON.stringify(card);
    for (let other = 1; other <= count; other++) {
      if (other === seat) continue;
      h.doc.state.hands[other].forEach(id => assert.equal(serialized.includes(id), false));
      assert.equal(serialized.includes(h.doc.state.endings[other]), false);
      assert.equal(serialized.includes(f.paths[other - 1]), false);
    }
    assert.equal(serialized.includes(control), false);
    assert.equal(serialized.includes('storyDeck'), false);
    assert.equal(serialized.includes('rollback'), false);
  }
  const hostView = JSON.stringify(h.latest);
  allHands.forEach(id => assert.equal(hostView.includes(id), false));
  Object.values(h.doc.state.endings).forEach(id => assert.equal(hostView.includes(id), false));
  assert.equal(h.latest.once.playerNum, 0);
  assert.equal(h.latest.once.hand, undefined); assert.equal(h.latest.once.ending, undefined);
  assert.equal(hostView.includes(control), false);
  assert.equal([...f.db.values.keys()].filter(path => path.startsWith('rooms/')).length, count + 1);
});

test('actor identity comes from the seat listener; concurrent readiness is acknowledged', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const commands = await Promise.all([f.action(1, 'ready', { value: true, actor: 4 }), f.action(2, 'ready', { value: true, actor: 0 })]);
  await settle(h);
  assert.equal(f.card(1).once.roster[0].ready, true);
  assert.equal(f.card(1).once.roster[1].ready, true);
  assert.equal(f.card(1).once.roster[3].ready, false);
  assert.equal(f.card(1).once.reply.id, commands[0].id);
  assert.equal(f.card(2).once.reply.id, commands[1].id);
  const denied = await f.send(h, 1, 'deal', { actor: 0 });
  assert.equal(f.card(1).once.reply.id, denied.id); assert.ok(f.card(1).once.reply.error);
  assert.equal(h.doc.state.phase, 'LOBBY');
  await h.command('deal'); await settle(h);
  assert.equal(h.doc.state.phase, 'CHOOSING_FIRST', 'host deals despite two unready seats');
  assert.equal(f.card(4).once.hand.length, 7, 'unready player still receives the original private hand');
});

test('host can deal immediately with nobody ready and retries cannot redeal', async t => {
  const f = setup(t, 6), h = f.host(); await f.lobby(h);
  assert.ok(h.doc.state.roster.every(player => !h.doc.state.readiness[player.playerNum]));
  const envelope = { id:'direct-host-deal', sessionId:h.doc.state.sessionId, turnId:h.doc.state.turnId };
  await h.command('deal', envelope); await settle(h);
  const before = clone(h.doc.state.hands);
  await h.command('deal', envelope); await settle(h);
  assert.deepEqual(h.doc.state.hands, before);
  for(let seat=1;seat<=6;seat++) assert.equal(f.card(seat).once.hand.length,5);
});

test('duplicate play and pass requests never remove a second card or draw twice', async t => {
  const f = setup(t), h = f.host(); await f.story(h);
  const handBefore = h.doc.state.hands[1].length;
  const played = await f.send(h, 1, 'play', { cardId: h.doc.state.hands[1][0] });
  assert.equal(h.doc.state.hands[1].length, handBefore - 1);
  assert.equal(h.doc.state.history.length, 1);
  await f.send(h, 1, 'play', played);
  assert.equal(h.doc.state.hands[1].length, handBefore - 1); assert.equal(h.doc.state.history.length, 1);
  assert.equal(f.card(1).once.reply.id, played.id);
  const pass = await f.send(h, 1, 'pass');
  assert.equal(h.doc.state.phase, 'PASS_DISCARD'); assert.equal(h.doc.state.hands[1].length, handBefore);
  const deckAfter = h.doc.state.storyDeck.length;
  await f.send(h, 1, 'pass', pass);
  assert.equal(h.doc.state.storyDeck.length, deckAfter); assert.equal(h.doc.state.hands[1].length, handBefore);
  await f.send(h, 1, 'keepAll');
  assert.equal(h.doc.state.storyteller, 2); assert.equal(h.doc.state.hands[1].length, handBefore);
});

test('simultaneous interrupts use one atomic winner and impose no penalty on a late contender', async t => {
  const f = setup(t, 6), h = f.host(); await f.story(h);
  const counts = Object.fromEntries(Object.entries(h.doc.state.hands).map(([seat, hand]) => [seat, hand.length]));
  const [second, third] = await Promise.all([
    f.action(2, 'interrupt', { cardId: h.doc.state.hands[2][0], mode: 'normal' }),
    f.action(3, 'interrupt', { cardId: h.doc.state.hands[3][0], mode: 'normal' }),
  ]);
  await settle(h);
  const winner = h.doc.state.storyteller, loser = winner === 2 ? 3 : 2;
  assert.ok([2, 3].includes(winner)); assert.equal(h.doc.state.history.length, 1);
  assert.equal(h.doc.state.hands[1].length, counts[1] + 1);
  assert.equal(h.doc.state.hands[winner].length, counts[winner] - 1);
  assert.equal(h.doc.state.hands[loser].length, counts[loser]);
  assert.equal(f.card(2).once.reply.id, second.id); assert.equal(f.card(3).once.reply.id, third.id);
  assert.equal(f.card(winner).once.reply.error, ''); assert.ok(f.card(loser).once.reply.error);
  assert.equal(h.doc.state.storyDeck.length, 114 - 6 * 5 - 2);
});

test('projections preserve a mailbox submitted concurrently with another state update', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const [first, second] = await Promise.all([
    f.action(1, 'ready', { value: true }), f.action(2, 'ready', { value: true }),
  ]);
  await settle(h);
  assert.equal(f.card(1).onceAction.id, first.id); assert.equal(f.card(1).once.reply.id, first.id);
  assert.equal(f.card(2).onceAction.id, second.id); assert.equal(f.card(2).once.reply.id, second.id);
  await Promise.all([f.action(3, 'ready', { value: true }), f.action(4, 'ready', { value: true })]);
  await settle(h); await h.command('deal'); await settle(h);
  assert.equal(f.card(1).onceAction.id, first.id); assert.equal(f.card(2).onceAction.id, second.id);
});

test('one host owns the lease and reconnect restores the same hands and session', async t => {
  const f = setup(t), first = f.host(); await f.story(first);
  const before = clone(first.doc.state), second = f.host(); await settle(first, second);
  assert.equal(first.own, true); assert.equal(second.own, false);
  await assert.rejects(second.command('cancel'), /not_available/);
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.equal(second.doc.state.sessionId, before.sessionId);
  assert.deepEqual(second.doc.state.hands, before.hands); assert.deepEqual(second.doc.state.endings, before.endings);
  assert.equal(second.doc.state.storyteller, before.storyteller);
  first.close(); await settle(second); assert.equal(second.own, true);
  f.db.put('.info/connected', false); await settle(second); assert.equal(second.own, false);
  await assert.rejects(second.command('cancel'), /offline/);
  f.db.put('.info/connected', true); await settle(second); assert.equal(second.own, true);
  assert.deepEqual(second.doc.state.hands, before.hands);
  await f.send(second, 1, 'pass'); await f.send(second, 1, 'discard', { cardId: second.doc.state.hands[1][0] });
  assert.equal(second.doc.state.storyteller, 2);
});

test('another game suspends projections; starting a new session clears the old mailbox', async t => {
  const f = setup(t), h = f.host(); await f.lobby(h);
  const old = f.card(1).once;
  await f.send(h, 1, 'ready', { value: true });
  const otherGame = { game: 'chainstory', story: 'A test fairy tale.' };
  f.db.put(f.paths[0], otherGame); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.lastStatus, 'switched');
  await h.renew(); await settle(h); assert.deepEqual(f.card(1), otherGame);
  await assert.rejects(h.command('deal'), /not_available/);
  await h.start(); await settle(h);
  assert.equal(h.suspended, false); assert.notEqual(h.doc.state.sessionId, old.sessionId);
  for (let n = 1; n <= 4; n++) { assert.equal(f.card(n).game, 'onceupon'); assert.equal(f.card(n).onceAction, undefined); }
  await f.send(h, 1, 'ready', { value: true, sessionId: old.sessionId, turnId: old.turnId });
  assert.equal(f.card(1).once.roster[0].ready, false);
});

test('a game switch during opening is detected before the new projection can overwrite it', async t => {
  const f = setup(t), h = f.host(); await settle(h);
  let switched = false;
  const otherGame = { game: 'chainstory', story: 'New game selected while opening.' };
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
  const newer = { ...card, once: { ...card.once, revision: card.once.revision + 20, hostLiveUntil: card.once.hostLiveUntil + 1000 } };
  f.db.put(f.paths[0], newer); await settle(h); h.project(); await settle(h);
  assert.equal(f.card(1).once.revision, newer.once.revision);
  const equal = { ...card, once: { ...card.once, hostLiveUntil: card.once.hostLiveUntil + 50000 } };
  f.db.put(f.paths[0], equal); await settle(h); h.project(); await settle(h);
  assert.equal(f.card(1).once.hostLiveUntil, equal.once.hostLiveUntil);
  assert.equal(h.suspended, false);
});

test('invalid roster counts fail without opening a private game state', async t => {
  for (const count of [1, 7]) {
    const f = setup(t, count), h = f.host(); await settle(h);
    await assert.rejects(h.start(), /player_count/);
    assert.equal(h.doc?.state, undefined);
  }
});

test('host UI ids are acknowledged and captured stale confirmations cannot affect the next turn', async t => {
  const f = setup(t), h = f.host(); await f.dealt(h);
  const captured = { id: 'host-ui-choose-first', sessionId: h.doc.state.sessionId, turnId: h.doc.state.turnId, actor: 5, playerNum: 1 };
  await h.command('chooseFirst', captured); await settle(h);
  assert.equal(h.latest.once.reply.id, captured.id); assert.equal(h.latest.once.reply.error, '');
  assert.equal(h.doc.state.storyteller, 1);
  const afterChoose = clone(h.doc.state);
  await h.command('chooseFirst', captured); await settle(h);
  assert.deepEqual(h.doc.state, afterChoose, 'retrying an acknowledged host UI request does not advance or reject');
  await assert.rejects(h.command('cancel', { ...captured, id: 'stale-host-cancel' }), /stale_turn/);
  await settle(h);
  assert.equal(h.doc.state.phase, 'STORYTELLING'); assert.equal(h.latest.once.reply.id, 'stale-host-cancel');
  assert.equal(h.latest.once.reply.error, 'stale_turn');
});

test('full private-card flow: dispute, concurrent votes, challenges, pass, endings, and restart', async t => {
  const f = setup(t), h = f.host(); await f.story(h);
  const locked = await f.send(h, 1, 'ending');
  assert.equal(f.card(1).once.reply.id, locked.id); assert.equal(f.card(1).once.reply.error, 'ending_locked');
  await f.send(h, 1, 'play', { cardId: h.doc.state.hands[1][0] });
  await f.send(h, 1, 'play', { cardId: h.doc.state.hands[1][0] });
  assert.equal(h.doc.state.history.length, 2);
  const beforeInterrupt = clone(h.doc.state.hands);
  await f.send(h, 2, 'interrupt', { cardId: h.doc.state.hands[2][0], mode: 'normal' });
  const pending = h.doc.state.interrupt;
  assert.equal(h.doc.state.storyteller, 2);
  assert.equal(JSON.stringify(f.card(3)).includes('rollback'), false);
  await f.send(h, 1, 'dispute', { interruptId: pending.id });
  const voteId = h.doc.state.vote.id, voteTurn = h.doc.state.turnId;
  assert.deepEqual(h.doc.state.vote.eligible, [3, 4]);
  const votes = await Promise.all([f.action(3, 'vote', { voteId, choice: 'invalid' }), f.action(4, 'vote', { voteId, choice: 'invalid' })]);
  assert.equal(votes[0].turnId, voteTurn); assert.equal(votes[1].turnId, voteTurn);
  await settle(h);
  assert.equal(h.doc.state.storyteller, 1); assert.equal(h.doc.state.phase, 'STORYTELLING');
  assert.equal(h.doc.state.hands[1].length, beforeInterrupt[1].length, 'invalid interrupt reverses the old storyteller draw');
  assert.equal(h.doc.state.hands[2].length, beforeInterrupt[2].length + 1, 'interrupter discards one and draws two');
  assert.equal(h.doc.state.history.length, 2);
  for (const [i, seat] of [3, 4].entries()) {
    assert.equal(f.card(seat).once.reply.id, votes[i].id); assert.equal(f.card(seat).once.reply.error, '');
  }
  const beforeChallenge = h.doc.state.hands[1].length;
  await f.send(h, 2, 'challenge', { returnLatest: true });
  const challengeId = h.doc.state.vote.id;
  await Promise.all([f.action(3, 'vote', { voteId: challengeId, choice: 'lose' }), f.action(4, 'vote', { voteId: challengeId, choice: 'lose' })]);
  await settle(h);
  assert.equal(h.doc.state.storyteller, 2); assert.equal(h.doc.state.hands[1].length, beforeChallenge + 2);
  assert.equal(h.doc.state.history.length, 1, 'the last meaningfulness-challenged card returns to its owner');
  const beforeFailedChallenge = clone(h.doc.state.hands);
  await f.send(h, 3, 'challenge');
  const failedId = h.doc.state.vote.id;
  await Promise.all([f.action(1, 'vote', { voteId: failedId, choice: 'continue' }), f.action(4, 'vote', { voteId: failedId, choice: 'continue' })]);
  await settle(h);
  assert.equal(h.doc.state.storyteller, 2); assert.deepEqual(h.doc.state.hands, beforeFailedChallenge);
  const passHand = h.doc.state.hands[2].length;
  await f.send(h, 2, 'pass');
  await f.send(h, 2, 'discard', { cardId: h.doc.state.hands[2][0] });
  assert.equal(h.doc.state.storyteller, 3); assert.equal(h.doc.state.hands[2].length, passHand);
  while (h.doc.state.hands[3].length) await f.send(h, 3, 'play', { cardId: h.doc.state.hands[3][0] });
  assert.equal(f.card(3).once.endingState, 'ready');
  const rejectedEnding = h.doc.state.endings[3];
  await f.send(h, 3, 'ending');
  assert.equal(h.doc.state.phase, 'ENDING_REVIEW'); assert.equal(f.card(1).once.endingCard.id, rejectedEnding);
  const blocked = await f.send(h, 1, 'interrupt', { cardId: h.doc.state.hands[1][0], mode: 'normal' });
  assert.ok(f.card(1).once.reply.error); assert.equal(f.card(1).once.reply.id, blocked.id);
  const rejectedVote = h.doc.state.vote.id;
  await Promise.all([1, 2, 4].map(n => f.action(n, 'vote', { voteId: rejectedVote, choice: 'reject' })));
  await settle(h);
  assert.equal(h.doc.state.storyteller, 4); assert.equal(h.doc.state.hands[3].length, 1);
  assert.notEqual(h.doc.state.endings[3], rejectedEnding); assert.equal(f.card(1).once.endingCard, null);
  while (h.doc.state.hands[4].length) await f.send(h, 4, 'play', { cardId: h.doc.state.hands[4][0] });
  await f.send(h, 4, 'ending');
  const winningEnding = h.doc.state.endingPlayed.cardId, finalVote = h.doc.state.vote.id;
  await Promise.all([1, 2, 3].map(n => f.action(n, 'vote', { voteId: finalVote, choice: n === 1 ? 'reject' : 'accept' })));
  await settle(h);
  assert.equal(h.doc.state.phase, 'FINISHED'); assert.equal(h.doc.state.winner, 4);
  assert.equal(f.card(2).once.endingCard.id, winningEnding); assert.equal(h.latest.once.endingCard.id, winningEnding);
  const oldSession = h.doc.state.sessionId;
  await h.command('restart'); await settle(h);
  assert.equal(h.doc.state.phase, 'LOBBY'); assert.notEqual(h.doc.state.sessionId, oldSession);
  assert.equal(h.suspended, false); assert.equal(h.initialSession, null);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).once.sessionId, h.doc.state.sessionId); assert.equal(f.card(n).once.hand.length, 0);
    assert.equal(f.card(n).once.roster.some(player => player.ready), false); assert.equal(f.card(n).onceAction, undefined);
  }
});

test('category interrupt responds to an actual play, consumes the opportunity once, and cannot chain', async t => {
  const f = setup(t, 6, 1234), h = f.host(); await f.dealt(h);
  await h.command('chooseFirst', { playerNum: 2 }); await settle(h);
  const playedCard = f.card(2).once.hand.find(card => card.category === 'thing');
  const interruptCard = f.card(1).once.hand.find(card => card.isInterrupt && card.category === 'thing');
  assert.ok(playedCard); assert.ok(interruptCard);
  await f.send(h, 1, 'interrupt', { cardId: interruptCard.id, mode: 'category', opportunityId: 'not-played' });
  assert.equal(h.doc.state.storyteller, 2); assert.ok(f.card(1).once.reply.error);
  await f.send(h, 2, 'play', { cardId: playedCard.id });
  const opportunityId = h.doc.state.categoryOpportunity.id;
  await f.send(h, 1, 'interrupt', { cardId: interruptCard.id, mode: 'category', opportunityId });
  assert.equal(h.doc.state.storyteller, 1); assert.equal(h.doc.state.categoryOpportunity, null);
  assert.equal(h.doc.state.interrupt, null); assert.equal(h.doc.state.history[1].mode, 'category');
  const next = f.card(4).once.hand.find(card => card.isInterrupt && card.category === 'thing'); assert.ok(next);
  const hand = h.doc.state.hands[4].length;
  await f.send(h, 4, 'interrupt', { cardId: next.id, mode: 'category', opportunityId });
  assert.equal(h.doc.state.storyteller, 1); assert.equal(h.doc.state.hands[4].length, hand);
  assert.equal(f.card(4).once.reply.error, 'stale_opportunity');
});

test('two-player dispute and challenge require explicit social agreement; ending ties accept', async t => {
  const f = setup(t, 2), h = f.host(); await f.story(h);
  await f.send(h, 2, 'interrupt', { cardId: h.doc.state.hands[2][0], mode: 'normal' });
  await f.send(h, 1, 'dispute', { interruptId: h.doc.state.interrupt.id });
  assert.equal(h.doc.state.vote.eligible.length, 0); assert.equal(f.card(2).once.vote.requiresSocial, true);
  const disputeVote = h.doc.state.vote.id;
  await assert.rejects(h.command('finishVote', { voteId: disputeVote }), /social_agreement_required/);
  await h.command('resolveSocial', { voteId: disputeVote, choice: 'valid' }); await settle(h);
  assert.equal(h.doc.state.storyteller, 2);
  await f.send(h, 1, 'challenge');
  const challengeVote = h.doc.state.vote.id;
  await h.command('resolveSocial', { voteId: challengeVote, choice: 'continue' }); await settle(h);
  assert.equal(h.doc.state.storyteller, 2);
  while (h.doc.state.hands[2].length) await f.send(h, 2, 'play', { cardId: h.doc.state.hands[2][0] });
  await f.send(h, 2, 'ending');
  await h.command('finishVote', { voteId: h.doc.state.vote.id }); await settle(h);
  assert.equal(h.doc.state.winner, 2); assert.equal(h.doc.state.phase, 'FINISHED');
});
