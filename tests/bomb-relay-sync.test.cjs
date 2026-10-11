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

function setup() {
  let clock = 500000; const db = database(), extras = {};
  class ClockDate extends Date { static now() { return clock; } }
  const paths = [1, 2, 3, 4].map(n => `rooms/BOMBTEST/players/card-${n}`);
  const room = { code: 'BOMBTEST', count: 4, name: i => ['Amy', 'Kevin', 'Jason', 'Willy'][i],
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
