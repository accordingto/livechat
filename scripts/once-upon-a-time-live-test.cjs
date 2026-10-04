'use strict';
// Opt-in maintenance test. Reads/writes only fresh, exact private-token paths.
// This compatibility adapter exercises the production Host through Firebase's
// REST ETag transactions. It is never imported by the production game or tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const E = require('../once-upon-a-time-engine.js');
const { FirebaseREST } = require('../chat-wolf-sync.js');
if (process.env.ONCE_UPON_LIVE_TEST !== '1') throw new Error('Set ONCE_UPON_LIVE_TEST=1 to create and clean a temporary real Firebase game.');
const store = new FirebaseREST('https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = Array.from(crypto.randomBytes(6), n => alphabet[n % alphabet.length]).join('');
const token = () => crypto.randomBytes(16).toString('hex');
const control = token(), playerTokens = Array.from({ length: 6 }, token);
const paths = playerTokens.map(value => `rooms/${code}/players/${value}`);
const controlPath = `rooms/${code}/players/${control}`;
const ownedPaths = [controlPath, ...paths], hosts = [];
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let mayClean = false, db;

function compatibilityDatabase() {
  const allowed = new Set(ownedPaths), listeners = new Map(), errors = new Map();
  const snapshots = new Map(), epochs = new Map(), reads = new Map(), tasks = new Set();
  const check = path => { if (!allowed.has(path)) throw new Error('Out-of-scope Firebase path'); };
  function tracked(work) {
    const promise = work(); tasks.add(promise);
    promise.finally(() => tasks.delete(promise)).catch(() => {}); return promise;
  }
  function emit(path, value) {
    const serialized = JSON.stringify(value);
    if (snapshots.get(path) === serialized) return;
    snapshots.set(path, serialized);
    for (const callback of listeners.get(path) || []) callback(snap(value));
  }
  async function refresh(path) {
    if (reads.has(path)) return reads.get(path);
    const epoch = epochs.get(path) || 0;
    const work = tracked(async () => {
      const result = await store.get(path);
      if ((epochs.get(path) || 0) === epoch) emit(path, result.value);
    });
    reads.set(path, work);
    try { await work; } finally { reads.delete(path); }
  }
  const timer = setInterval(() => {
    for (const path of listeners.keys()) refresh(path).catch(error => { for (const callback of errors.get(path) || []) callback(error); });
  }, 500);
  return {
    async flush() { while (tasks.size) await Promise.allSettled([...tasks]); },
    async refresh() { await Promise.all([...listeners.keys()].map(refresh)); },
    stop() { clearInterval(timer); },
    ref(path) {
      const info = path === '.info/connected' || path === '.info/serverTimeOffset';
      if (!info) check(path);
      return {
        on(event, callback, error) {
          assert.equal(event, 'value');
          if (info) { queueMicrotask(() => callback(snap(path === '.info/connected' ? true : 0))); return; }
          if (!listeners.has(path)) listeners.set(path, new Set());
          if (!errors.has(path)) errors.set(path, new Set());
          listeners.get(path).add(callback); if (error) errors.get(path).add(error);
          // A new listener always gets the latest value, even if cached.
          tracked(async () => { const result = await store.get(path); callback(snap(result.value)); }).catch(error || (() => {}));
        },
        off(event, callback) {
          listeners.get(path)?.delete(callback);
          if (!listeners.get(path)?.size) { listeners.delete(path); errors.delete(path); }
        },
        transaction(update) {
          if (info) return Promise.reject(new Error('Read-only Firebase info'));
          return tracked(async () => {
            for (let attempt = 0; attempt < 30; attempt++) {
              const old = await store.get(path), next = update(clone(old.value));
              if (next === undefined) return { committed: false, snapshot: snap(old.value) };
              const written = await store.put(path, next, old.etag);
              if (written.conflict) { await delay(20); continue; }
              epochs.set(path, (epochs.get(path) || 0) + 1); emit(path, written.value);
              return { committed: true, snapshot: snap(written.value) };
            }
            throw new Error('Firebase transaction retry limit');
          });
        },
      };
    },
  };
}
async function waitFor(check, message, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await db.refresh(); await delay(100);
  }
  throw new Error('Timed out: ' + message);
}
async function drain(host) {
  await Promise.all([host.serial, host.outgoing]); await db.refresh();
  await Promise.all([host.serial, host.outgoing]);
}
async function card(seat) { return (await store.get(paths[seat - 1])).value; }
function makeCommand(view, type, extra = {}) {
  return { id: crypto.randomUUID(), type, sessionId: view.once.sessionId, turnId: view.once.turnId, ...extra };
}
async function submit(seat, command) {
  await db.ref(paths[seat - 1]).transaction(old => ({ ...old, onceAction: command })); return command;
}
async function acknowledged(seat, command, host) {
  await waitFor(async () => (await card(seat))?.once?.reply?.id === command.id, 'player request acknowledgement');
  await drain(host); return (await card(seat)).once.reply;
}
async function send(seat, type, extra, host) {
  await drain(host);
  const command = makeCommand(await card(seat), type, extra);
  await submit(seat, command); const reply = await acknowledged(seat, command, host);
  assert.equal(reply.error, '', 'Player command ' + type); return command;
}
async function voteAll(host, choice) {
  await drain(host);
  const vote = host.doc.state.vote;
  const commands = await Promise.all(E.list(vote.eligible).map(async seat => ({ seat,
    command: makeCommand(await card(seat), 'vote', { voteId: vote.id, choice }) })));
  await Promise.all(commands.map(({ seat, command }) => submit(seat, command)));
  const replies = await Promise.all(commands.map(({ seat, command }) => acknowledged(seat, command, host)));
  const outcomes = commands.map(({ seat }, index) => ({ seat, error: replies[index].error }));
  assert.ok(replies.every(reply => reply.error === ''), 'Every eligible concurrent ballot must be accepted: ' + JSON.stringify(outcomes));
}

async function main() {
  // Confirm all exact cryptographically fresh paths are empty before allowing
  // any write or cleanup. Never read, list, or delete a whole room/root node.
  const fresh = await Promise.all(ownedPaths.map(path => store.get(path)));
  assert.ok(fresh.every(result => result.value === null), 'All isolated paths must be fresh'); mayClean = true;
  db = compatibilityDatabase();
  const extras = { onceUponControlToken: control };
  const room = { code, count: 6, answers: {}, name: i => 'Once QA ' + (i + 1),
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto: crypto.webcrypto, Date, ONCE_ENGINE: E, setInterval, clearInterval });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../once-upon-a-time-sync.js'), 'utf8'), context);
  paths.forEach((path, i) => db.ref(path).on('value', snapshot => {
    room.answers[i + 1] = snapshot.val(); hosts.forEach(host => host.receive(i + 1, snapshot.val()));
  }));
  function host() {
    const instance = new context.ONCE_SYNC.Host({ db, room,
      onChange: payload => { instance.latest = payload; }, onStatus: status => { instance.lastStatus = status; } });
    hosts.push(instance); instance.connect(); return instance;
  }
  const first = host();
  await waitFor(() => first.own && Object.keys(room.answers).length === 6, 'host lease and player-node reads');
  await first.start(); await waitFor(async () => (await card(6))?.once?.phase === 'LOBBY', 'all six lobby projections');
  assert.ok(E.list(first.doc.state.roster).every(player=>!first.doc.state.readiness?.[player.playerNum]));
  await first.command('deal'); await drain(first);
  for(let seat=1;seat<=6;seat++)assert.equal((await card(seat)).once.hand.length,5);
  console.log('PASS host immediately deals with zero ready players; all six original private cards receive hands.');
  await first.command('restart'); await drain(first);
  await send(1, 'ready', { value: true, actor: 6 }, first);
  assert.equal(first.doc.state.readiness[1], true); assert.notEqual(first.doc.state.readiness[6], true);
  const ready = await Promise.all([2, 3, 4, 5, 6].map(async seat => ({ seat, command: makeCommand(await card(seat), 'ready', { value: false }) })));
  await Promise.all(ready.map(({ seat, command }) => submit(seat, command)));
  await Promise.all(ready.map(({ seat, command }) => acknowledged(seat, command, first)));
  assert.ok([2,3,4,5,6].every(seat=>first.doc.state.readiness?.[seat]!==true));
  await first.command('deal'); await drain(first);
  for (let seat = 1; seat <= 6; seat++) {
    const value = await card(seat), serialized = JSON.stringify(value);
    assert.equal(value.once.hand.length, 5); assert.equal(value.once.ending.id, first.doc.state.endings[seat]);
    for (let other = 1; other <= 6; other++) if (other !== seat) {
      first.doc.state.hands[other].forEach(id => assert.equal(serialized.includes(id), false));
      assert.equal(serialized.includes(first.doc.state.endings[other]), false);
      assert.equal(serialized.includes(playerTokens[other - 1]), false);
    }
    assert.equal(serialized.includes(control), false);
  }
  assert.equal(first.latest.once.hand, undefined); assert.equal(first.latest.once.ending, undefined);
  console.log('PASS six private projections, separate control token, trusted seat identity, concurrent optional readiness, and direct host deal with five unready players over real Firebase.');
  // Find a real pair in the dealt cards; if necessary start another isolated
  // game rather than injecting artificial hands into authoritative state.
  let pair = null;
  for (let attempt = 0; attempt < 10 && !pair; attempt++) {
    const views = await Promise.all([1, 2, 3, 4, 5, 6].map(card));
    for (let interrupter = 1; interrupter <= 6 && !pair; interrupter++) {
      for (const interruptCard of views[interrupter - 1].once.hand.filter(value => value.isInterrupt)) {
        for (let teller = 1; teller <= 6 && !pair; teller++) if (teller !== interrupter) {
          const played = views[teller - 1].once.hand.find(value => value.category === interruptCard.category);
          if (played) pair = { teller, interrupter, played: played.id, interruptCard: interruptCard.id };
        }
      }
    }
    if (!pair) {
      await first.command('restart'); await drain(first);
      await Promise.all([1, 2, 3, 4, 5, 6].map(seat => send(seat, 'ready', { value: true }, first)));
      await first.command('deal'); await drain(first);
    }
  }
  assert.ok(pair, 'A category interrupt pair must be dealt');
  await first.command('chooseFirst', { playerNum: pair.teller }); await drain(first);
  await send(pair.teller, 'play', { cardId: pair.played }, first);
  await send(pair.interrupter, 'interrupt', { cardId: pair.interruptCard, mode: 'category', opportunityId: first.doc.state.categoryOpportunity.id }, first);
  assert.equal(first.doc.state.storyteller, pair.interrupter); assert.equal(first.doc.state.categoryOpportunity ?? null, null);
  console.log('PASS actual-play category interruption and closed chaining opportunity.');
  const original = first.doc.state.storyteller;
  const contenders = [1, 2, 3, 4, 5, 6].filter(seat => seat !== original).slice(0, 2);
  const beforeRace = clone(first.doc.state.hands);
  const requests = await Promise.all(contenders.map(async seat => ({ seat,
    command: makeCommand(await card(seat), 'interrupt', { cardId: first.doc.state.hands[seat][0], mode: 'normal' }) })));
  await Promise.all(requests.map(({ seat, command }) => submit(seat, command)));
  await Promise.all(requests.map(({ seat, command }) => acknowledged(seat, command, first)));
  const winner = first.doc.state.storyteller, loser = contenders.find(seat => seat !== winner);
  assert.ok(contenders.includes(winner)); assert.equal(first.doc.state.hands[loser].length, beforeRace[loser].length);
  assert.equal(first.doc.state.hands[original].length, beforeRace[original].length + 1);
  await send(original, 'dispute', { interruptId: first.doc.state.interrupt.id }, first);
  await voteAll(first, 'invalid');
  assert.equal(first.doc.state.storyteller, original); assert.equal(first.doc.state.hands[original].length, beforeRace[original].length);
  assert.equal(first.doc.state.hands[winner].length, beforeRace[winner].length + 1);
  console.log('PASS atomic simultaneous interrupt winner, no late penalty, concurrent ballots, and exact invalid-interrupt rollback.');
  const challenger = [1, 2, 3, 4, 5, 6].find(seat => seat !== original);
  await send(challenger, 'challenge', {}, first); await voteAll(first, 'continue');
  assert.equal(first.doc.state.storyteller, original);
  await send(original, 'pass', {}, first); await send(original, 'keepAll', {}, first);
  const endingSeat = first.doc.state.storyteller;
  while (E.list(first.doc.state.hands?.[endingSeat]).length) await send(endingSeat, 'play', { cardId: E.list(first.doc.state.hands?.[endingSeat])[0] }, first);
  await send(endingSeat, 'ending', {}, first); await voteAll(first, 'accept');
  assert.equal(first.doc.state.phase, 'FINISHED'); assert.equal(first.doc.state.winner, endingSeat);
  console.log('PASS failed Challenge, optional keep-all Pass, sequential plays, private Ending readiness, and accepted Ending win.');
  const saved = clone(first.doc.state), second = host();
  await waitFor(() => !!second.doc?.state, 'replacement host reads saved state');
  assert.equal(second.own, false); await assert.rejects(second.command('cancel'));
  first.close(); await db.flush(); await second.renew();
  await waitFor(() => second.own, 'replacement host lease'); await drain(second);
  assert.equal(second.doc.state.sessionId, saved.sessionId); assert.deepEqual(second.doc.state.hands, saved.hands);
  assert.deepEqual(second.doc.state.endings, saved.endings);
  await second.command('restart'); await drain(second);
  assert.equal(second.doc.state.phase, 'LOBBY'); assert.equal((await card(1)).onceAction, undefined);
  await db.ref(paths[0]).transaction(() => ({ game: 'chainstory', story: 'Isolated game-switch test.' }));
  await waitFor(() => second.suspended, 'game switch suspension'); await second.renew(); await drain(second);
  assert.equal((await card(1)).game, 'chainstory');
  console.log('PASS competing host lease, reconnect without new cards, fresh restart mailboxes, and game-switch suspension.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  hosts.forEach(host => host.close());
  if (db) { db.stop(); await db.flush(); }
  if (!mayClean) return;
  try {
    await Promise.all(ownedPaths.map(path => store.put(path, null)));
    const removed = await Promise.all(ownedPaths.map(path => store.get(path)));
    assert.ok(removed.every(result => result.value === null));
    console.log('CLEANED only the seven temporary private-token paths created by this test.');
  } catch (error) { console.error('Temporary test path cleanup failed:', error.message); process.exitCode = 1; }
});
