const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const DECK = require('../bomb-relay-deck.js');
const E = require('../bomb-relay-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Firebase drops empty arrays/maps and null children; transactions retry the
// updater, and listeners get independent snapshots, as in live rooms.
function normalize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const clean = normalize(entry); if (clean !== null) output[key] = clean; }
  return Object.keys(output).length ? output : null;
}
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map(); let writes = 0;
  function put(path, value) {
    values.set(path, normalize(clone(value))); writes++;
    for (const fn of listeners.get(path) || []) queueMicrotask(() => fn(snap(values.get(path))));
  }
  return {
    values, put, get writes() { return writes; },
    ref(path) {
      return {
        path,
        on(_event, fn) { if (!listeners.has(path)) listeners.set(path, new Set()); listeners.get(path).add(fn); queueMicrotask(() => fn(snap(values.get(path)))); },
        off(_event, fn) { listeners.get(path)?.delete(fn); },
        transaction(updater) {
          const task = (tails.get(path) || Promise.resolve()).then(async () => {
            updater(clone(values.get(path)));
            const next = updater(clone(values.get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            put(path, next); return { committed: true, snapshot: snap(values.get(path)) };
          });
          tails.set(path, task.catch(() => {})); return task;
        },
      };
    },
  };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) { for (let n = 0; n < 12; n++) { await turn(); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); } }

function setup(count = 4) {
  let clock = 500000; const db = database(), extras = {};
  class ClockDate extends Date { static now() { return clock; } }
  const paths = Array.from({ length: count }, (_, i) => `rooms/BOMBTEST/players/card-${i + 1}`);
  const room = { code: 'BOMBTEST', count, name: i => ['Amy', 'Kevin', 'Jason', 'Willy'][i] || `P${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, BOMB_RELAY_DECK: DECK, BOMB_RELAY_ENGINE: E,
    setInterval: () => 0, clearInterval: () => {} });
  vm.runInContext(fs.readFileSync(require.resolve('../bomb-relay-sync.js'), 'utf8'), context);
  const host = () => { const h = new context.BOMB_RELAY_SYNC.Host({ db, room, onChange: s => { h.latest = s; }, onStatus: s => { h.lastStatus = s; } }); h.connect(); return h; };
  let n = 0;
  return {
    db, room, paths, host, extras,
    card: i => clone(db.values.get(paths[i - 1])),
    state: () => JSON.parse(db.values.get(`rooms/BOMBTEST/players/${extras.bombRelayControlToken}`).stateJson),
    get now() { return clock; }, set now(value) { clock = value; },
    // Exactly what play.html writes: one bombAction fenced to the shown turn.
    async action(i, type) {
      const card = this.card(i);
      const command = { id: `action-${i}-${++n}-xxxxxxxx`, type, sessionId: card.bomb.sessionId, turnId: card.bomb.turnId };
      const result = await db.ref(paths[i - 1]).transaction(current => {
        if (current?.game !== 'bombrelay' || current.bomb?.sessionId !== command.sessionId || current.bomb?.turnId !== command.turnId) return;
        return Object.assign({}, current, { bombAction: command });
      });
      return { command, committed: result.committed };
    },
  };
}

test('the host deals cards to every original link and players drive the relay', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  assert.equal(h.lastStatus, 'ready');
  await h.start({ cards: 5, fuse: 'quick' }); await settle(h);
  for (const i of [1, 2, 3, 4]) {
    const card = s.card(i);
    assert.equal(card.game, 'bombrelay'); assert.equal(card.playerNum, i);
    assert.equal(card.bomb.phase, 'ready'); assert.equal(card.bomb.cardsTotal, 5);
  }
  const holder = s.state().holder;
  assert.equal(s.card(holder).bomb.canLight, true);
  await s.action(holder, 'light'); await settle(h);
  assert.equal(s.state().phase, 'ticking');
  await s.action(holder, 'pass'); await settle(h);
  const next = E.nextActive(s.state(), holder);
  assert.equal(s.state().holder, next);
  assert.equal(s.card(next).bomb.canPass, true);
  assert.equal(s.card(holder).bomb.reply.error, '');
  // Anyone but the passer can challenge; the bomb returns.
  const challenger = [1, 2, 3, 4].find(i => i !== holder && i !== next);
  await s.action(challenger, 'bounce'); await settle(h);
  assert.equal(s.state().holder, holder);
  assert.equal(s.card(1).bomb.bounce.to, holder);
  h.close();
});

test('the secret fuse never reaches a player card, and the host tick explodes it', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  const holder = s.state().holder;
  await s.action(holder, 'light'); await settle(h);
  const secret = s.state().explodeAt;
  for (const i of [1, 2, 3, 4]) {
    const json = JSON.stringify(s.card(i));
    assert.ok(!json.includes('explodeAt') && !json.includes(String(secret)), `card ${i}`);
  }
  s.now = secret; await h.renew(); await settle(h); h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'boom');
  assert.equal(s.card(holder).bomb.boom.loser, holder);
  s.now = s.state().phaseUntil; await h.renew(); await settle(h); h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'ready');
  assert.equal(s.state().holder, holder);
  h.close();
});

test('a stale card action is refused at the card and never reaches the host', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  const holder = s.state().holder;
  const stale = s.card(holder);
  await s.action(holder, 'light'); await settle(h);
  const result = await s.db.ref(s.paths[holder - 1]).transaction(current => {
    if (current.bomb.turnId !== stale.bomb.turnId) return;
    return Object.assign({}, current, { bombAction: { id: 'stale-xxxxxxxxxxxx', type: 'light', sessionId: stale.bomb.sessionId, turnId: stale.bomb.turnId } });
  });
  assert.equal(result.committed, false);
  h.close();
});

test('a second host tab waits while the first one holds the lease', async () => {
  const s = setup(); const a = s.host(); await settle(a);
  const b = s.host(); await settle(a, b);
  assert.equal(a.lastStatus, 'ready');
  assert.equal(b.lastStatus, 'other_host');
  a.close(); b.close();
});

test('switching a player link to another game suspends this host', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  s.db.put(s.paths[0], { game: 'cut', name: 'Amy', playerNum: 1, cut: { version: 1, sessionId: 'other' } }); await settle(h);
  assert.equal(h.lastStatus, 'switched');
  assert.equal(s.card(1).game, 'cut');
  h.close();
});

test('opening replaces the card it captured when the game started', async () => {
  const s = setup();
  s.db.put(s.paths[1], { game: 'dixit', dixit: { version: 1, sessionId: 'd' } });
  const h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  assert.equal(s.card(2).game, 'bombrelay', 'the opening may replace what it captured');
  h.close();
});

test('the formal pool is selected once on the authority and every player keeps that prompt throughout the fuse', async () => {
  const s = setup(), h = s.host(); await settle(h);
  await h.start({ cards: 5, category: 'playful' }); await settle(h);
  const first = s.state(), promptId = first.order[0];
  assert.equal(DECK.get(promptId).pack, 'playful');
  assert.equal(first.promptHistory.seenIds.length, 1, 'draw only the revealed prompt');
  assert.deepEqual([1, 2, 3, 4].map(i => s.card(i).bomb.cardId), Array(4).fill(promptId));
  assert.equal(s.card(1).bomb.canReroll, false, 'reroll belongs to host preview');
  await s.action(first.holder, 'reroll'); await settle(h);
  assert.equal(s.state().order[0], promptId);
  await h.command('reroll'); await settle(h);
  const rerolled = s.state().order[0];
  assert.notEqual(rerolled, promptId);
  assert.deepEqual(s.state().promptHistory.seenIds, [promptId, rerolled]);
  await s.action(s.state().holder, 'light'); await settle(h);
  const at = s.state().explodeAt;
  const history = clone(s.state().promptHistory);
  for (let n = 0; n < 6; n++) {
    await s.action(s.state().holder, 'pass'); await settle(h);
    assert.equal(s.state().explodeAt, at);
    assert.deepEqual(s.state().promptHistory, history);
    assert.deepEqual([1, 2, 3, 4].map(i => s.card(i).bomb.cardId), Array(4).fill(rerolled));
  }
  await assert.rejects(h.command('reroll'), /not_available/);
  assert.equal(s.state().order[0], rerolled);
  h.close();
});

test('ordinary start/restart, mode change and host reconnection retain the room prompt history', async () => {
  const s = setup(); let h = s.host(); await settle(h);
  await h.start({ cards: 5, category: 'everyday' }); await settle(h);
  const firstId = s.state().order[0];
  await h.start({ cards: 10, category: 'playful' }); await settle(h);
  const secondId = s.state().order[0];
  assert.equal(DECK.get(secondId).pack, 'playful');
  assert.deepEqual(s.state().promptHistory.seenIds, [firstId, secondId]);
  await h.command('restart', { category: 'mixed' }); await settle(h);
  const beforeReload = clone(s.state());
  assert.ok(beforeReload.promptHistory.seenIds.includes(firstId));
  assert.ok(beforeReload.promptHistory.seenIds.includes(secondId));
  h.close(); await settle(h);
  h = s.host(); await settle(h);
  assert.deepEqual(s.state(), beforeReload, 'lease reacquisition does not draw/reset anything');
  await h.start({ cards: 5 }); await settle(h);
  assert.equal(s.state().promptHistory.seenIds.length, beforeReload.promptHistory.seenIds.length + 1);
  h.close();
  const other = setup(), otherHost = other.host(); await settle(otherHost);
  await otherHost.start({ cards: 5 }); await settle(otherHost);
  assert.equal(other.state().promptHistory.seenIds.length, 1, 'new room starts its own history');
  otherHost.close();
});

test('reconnecting a ticking host retains one deadline and explosion settles once for every player', async () => {
  const s = setup(); let h = s.host(); await settle(h);
  await h.start({ cards: 5, fuse: 'quick' }); await settle(h);
  await s.action(s.state().holder, 'light'); await settle(h);
  const before = clone(s.state());
  h.close(); await settle(h);
  h = s.host(); await settle(h);
  assert.equal(s.state().explodeAt, before.explodeAt);
  assert.deepEqual(s.state().promptHistory, before.promptHistory);
  const other = s.host(); await settle(h, other);
  assert.equal(other.own, false);
  s.now = before.explodeAt;
  await h.renew(); await settle(h, other);
  await s.action(before.holder, 'pass'); await settle(h, other);
  h.pulse(); other.pulse(); await settle(h, other);
  assert.equal(s.state().phase, 'boom');
  assert.equal(s.state().boom.loser, before.holder);
  assert.equal(s.state().history.length, 1);
  assert.deepEqual(s.state().penalties[before.holder], [before.order[0]]);
  for (const i of [1, 2, 3, 4]) {
    assert.equal(s.card(i).bomb.boom.loser, before.holder);
    assert.equal(s.card(i).bomb.cardId, before.order[0]);
  }
  h.close(); other.close();
});

test('duplicate requests and a stale second pass cannot advance the bomb twice', async () => {
  const s = setup(), h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  await s.action(s.state().holder, 'light'); await settle(h);
  const firstHolder = s.state().holder;
  const { command } = await s.action(firstHolder, 'pass'); await settle(h);
  const afterPass = clone(s.state());
  // Retry and a second tab send the same shown turn. The host deduplicates
  // one request and rejects the stale turn, even though it now sees a new holder.
  const node = s.card(firstHolder);
  s.db.put(s.paths[firstHolder - 1], { ...node, bombAction: command }); await settle(h);
  assert.equal(s.state().passes, 1);
  s.db.put(s.paths[firstHolder - 1], { ...s.card(firstHolder), bombAction: { ...command, id: 'new-stale-request-xxxx' } }); await settle(h);
  assert.equal(s.state().passes, 1);
  assert.equal(s.state().holder, afterPass.holder);
  assert.equal(s.state().explodeAt, afterPass.explodeAt);
  h.close();
});

test('stop and restart invalidate old pending clock events without discarding prompt history', async () => {
  const s = setup(), h = s.host(); await settle(h);
  await h.start({ cards: 5 }); await settle(h);
  await s.action(s.state().holder, 'light'); await settle(h);
  const old = clone(s.state());
  await h.command('stop'); await settle(h);
  s.now = old.explodeAt; await h.renew(); await settle(h); h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'finished');
  assert.equal(s.state().history.length, 0);
  await h.start({ cards: 5 }); await settle(h);
  const newPrompt = s.state().order[0];
  assert.notEqual(newPrompt, old.order[0]);
  assert.ok(s.state().promptHistory.seenIds.includes(old.order[0]));
  h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'ready');
  assert.equal(s.state().explodeAt, null);
  h.close();
});

test('switching back to Bomb Relay retains the activity history and configured Mixed weights', async () => {
  const s = setup(), h = s.host(); await settle(h);
  await h.start({ cards: 5, weights: { everyday: 0, playful: 2 }, familyWindow: 2 }); await settle(h);
  const old = s.state();
  assert.equal(DECK.get(old.order[0]).pack, 'playful');
  s.db.put(s.paths[0], { game: 'cut', name: 'Amy', playerNum: 1, cut: { version: 1, sessionId: 'other' } }); await settle(h);
  assert.equal(h.suspended, true);
  await h.start({ cards: 5 }); await settle(h);
  const next = s.state();
  assert.equal(h.suspended, false);
  assert.equal(DECK.get(next.order[0]).pack, 'playful');
  assert.deepEqual(next.promptWeights, old.promptWeights);
  assert.equal(next.familyWindow, 2);
  assert.deepEqual(next.promptHistory.seenIds, [old.order[0], next.order[0]]);
  for (const i of [1, 2, 3, 4]) assert.equal(s.card(i).bomb.cardId, next.order[0]);
  h.close();
});

test('retried transactions persist one GO snapshot for 3, 6 and 8 actual players, including host takeover', async () => {
  for (const count of [3, 6, 8]) {
    const s = setup(count); let h = s.host(); await settle(h);
    await h.start(); await settle(h);
    assert.deepEqual(s.state().settingsTiming, { speedMode: 'normal', scaleWithPlayers: true });
    assert.equal(s.state().roundFuse, null);
    await s.action(s.state().holder, 'light'); await settle(h);
    const before = s.state(), snapshot = before.roundFuse;
    assert.equal(snapshot.activePlayerCountAtStart, count);
    assert.deepEqual([snapshot.minMsAtStart, snapshot.maxMsAtStart], count === 3 ? [60000, 100000] : count === 6 ? [90000, 130000] : [110000, 150000]);
    await h.command('settings', { timing: { speedMode: 'chill', scaleWithPlayers: false } }); await settle(h);
    await s.action(s.state().holder, 'pass'); await settle(h);
    assert.deepEqual(s.state().roundFuse, snapshot);
    assert.equal(s.state().explodeAt, before.explodeAt);
    for (let i = 1; i <= count; i++) {
      assert.equal(s.card(i).bomb.cardId, before.order[0]);
      assert.ok(!JSON.stringify(s.card(i)).includes('roundFuse'));
    }
    h.close(); await settle(h); h = s.host(); await settle(h);
    assert.deepEqual(s.state().roundFuse, snapshot);
    assert.equal(s.state().explodeAt, before.explodeAt);
    await h.start(); await settle(h);
    assert.deepEqual(s.state().settingsTiming, { speedMode: 'chill', scaleWithPlayers: false });
    assert.ok(s.state().promptHistory.seenIds.includes(before.order[0]));
    await s.action(s.state().holder, 'light'); await settle(h);
    assert.deepEqual([s.state().roundFuse.minMsAtStart, s.state().roundFuse.maxMsAtStart], [90000, 150000]);
    h.close();
  }
});

test('saved legacy preference remains on start until an explicit timing choice replaces it', async () => {
  const s = setup(), h = s.host(); await settle(h);
  await h.start({ fuse: 'long' }); await settle(h);
  await h.start(); await settle(h);
  assert.equal(s.state().settingsTiming.legacyFuse, 'long');
  await h.command('settings', { timing: { speedMode: 'normal', scaleWithPlayers: true } }); await settle(h);
  await h.start(); await settle(h);
  assert.deepEqual(s.state().settingsTiming, { speedMode: 'normal', scaleWithPlayers: true });
  h.close();
});

test('fractional Firebase server offset cannot break a GO transaction', async () => {
  const s = setup(), h = s.host(); await settle(h);
  s.db.put('.info/serverTimeOffset', 0.75); await settle(h);
  assert.equal(h.now(), s.now + 1);
  await h.start(); await settle(h);
  await s.action(s.state().holder, 'light'); await settle(h);
  assert.equal(s.state().phase, 'ticking');
  assert.equal(s.state().roundFuse.startedAtMs, s.now + 1);
  h.close();
});
