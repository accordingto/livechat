'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const WORDS = require('../who-knows-words.js');
const E = require('../who-knows-engine.js');
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
async function settle(...hosts) { for (let n = 0; n < 14; n++) { await turn(); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); } }

function setup(count = 5) {
  let clock = 900000; const db = database(), extras = {};
  let timerId = 0; const timers = new Set();
  class ClockDate extends Date { static now() { return clock; } }
  const paths = Array.from({ length: count }, (_, i) => `rooms/WKTEST/players/card-${i + 1}`);
  const room = { code: 'WKTEST', count, name: i => ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo'][i] || `P${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, WHO_KNOWS_WORDS: WORDS, WHO_KNOWS_ENGINE: E,
    setInterval: () => { const id = ++timerId; timers.add(id); return id; }, clearInterval: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(require.resolve('../who-knows-sync.js'), 'utf8'), context);
  const host = () => { const h = new context.WHO_KNOWS_SYNC.Host({ db, room, onChange: s => { h.latest = s; }, onStatus: s => { h.lastStatus = s; } }); h.connect(); return h; };
  let n = 0;
  return {
    db, room, paths, host, extras, timers,
    card: i => clone(db.values.get(paths[i - 1])),
    state: () => JSON.parse(db.values.get(`rooms/WKTEST/players/${extras.whoKnowsControlToken}`).stateJson),
    get now() { return clock; }, set now(value) { clock = value; },
    // Exactly what play.html writes: one wkAction fenced to the shown stage.
    async action(i, type, extra = {}) {
      const card = this.card(i);
      const command = Object.assign({ id: `action-${i}-${++n}-xxxxxxxx`, type, sessionId: card.wk.sessionId, stage: card.wk.stage }, extra);
      const result = await db.ref(paths[i - 1]).transaction(current => {
        if (current?.game !== 'whoknows' || current.wk?.sessionId !== command.sessionId || current.wk?.stage !== command.stage) return;
        return Object.assign({}, current, { wkAction: command });
      });
      return { command, committed: result.committed };
    },
  };
}
const roleOf = (s, role) => Object.keys(s.state().round.roles).map(Number).filter(n => s.state().round.roles[n] === role);

test('the host deals private cards to every original link without leaking the word', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  assert.equal(h.lastStatus, 'ready');
  await h.start({ settings: { mode: 'werewolf' } }); await settle(h);
  const state = s.state(), mayor = state.round.mayor;
  for (let i = 1; i <= 5; i++) {
    const card = s.card(i);
    assert.equal(card.game, 'whoknows'); assert.equal(card.playerNum, i);
    assert.equal(card.wk.phase, 'choose'); assert.equal(card.wk.me.role, state.round.roles[i]);
    assert.equal(card.wk.mayor, mayor);
  }
  assert.equal(s.card(mayor).wk.me.options.length, 3);
  await s.action(mayor, 'choose', { wordId: state.round.options[0] }); await settle(h);
  assert.equal(s.state().phase, 'countdown');
  const secret = WORDS.get(state.round.options[0]);
  const knowers = [mayor, ...roleOf(s, 'seer'), ...roleOf(s, 'werewolf')];
  for (let i = 1; i <= 5; i++) {
    const json = JSON.stringify(s.card(i));
    assert.equal(json.includes(secret.en), knowers.includes(i), `card ${i}`);
    assert.ok(!json.includes('stateJson') && !json.includes('"roles"'), `card ${i} has no canonical state`);
  }
  h.close();
});

test('players drive a whole Insider round from their own cards; the host only keeps time', async () => {
  const s = setup(6); const h = s.host(); await settle(h);
  await h.start({ settings: { mode: 'insider' } }); await settle(h);
  const master = s.state().round.mayor, insider = roleOf(s, 'insider')[0];
  const common = s.state().round.players.find(n => n !== master && n !== insider);
  await s.action(master, 'choose', { wordId: s.state().round.options[1] }); await settle(h);
  const writes = s.db.writes;
  h.pulse(); await settle(h);
  assert.equal(s.db.writes, writes, 'an idle tick writes nothing');
  s.now += 5000; await h.renew(); await settle(h); h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'questions');
  await s.action(common, 'raise', { text: 'Is it bigger than a cat?' }); await settle(h);
  await s.action(insider, 'raise'); await settle(h);
  assert.equal(s.card(insider).wk.me.queuePos, 1);
  assert.equal(s.card(master).wk.current.text, 'Is it bigger than a cat?');
  await s.action(master, 'answer', { askId: s.card(master).wk.current.id, answer: 'no' }); await settle(h);
  assert.equal(s.card(insider).wk.me.asking, true);
  assert.deepEqual(s.card(1).wk.log.map(entry => entry.answer), ['no']);
  s.now += 40000; await h.renew(); await settle(h);
  await s.action(master, 'answer', { askId: s.card(master).wk.current.id, answer: 'correct' }); await settle(h);
  assert.equal(s.state().phase, 'discuss');
  assert.equal(s.card(common).wk.word.id, s.state().round.wordId, 'the guessed word is public');
  s.now = s.state().deadline; await h.renew(); await settle(h); h.pulse(); await settle(h);
  assert.equal(s.state().phase, 'judge');
  for (const n of s.state().round.players.filter(n => n !== insider)) { await s.action(n, 'judge', { choice: 'yes' }); await settle(h); }
  assert.equal(s.state().phase, 'result');
  assert.equal(s.card(insider).wk.result.outcome.key, 'commons_found');
  assert.equal(s.card(master).wk.standings[0].score, 1);
  await s.action(insider, 'next'); await settle(h);
  assert.equal(s.state().phase, 'choose'); assert.equal(s.state().roundNo, 2);
  h.close();
});

test('a card request fenced to an old stage cannot be written, and replays are ignored', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({}); await settle(h);
  const mayor = s.state().round.mayor;
  const old = s.card(mayor);
  await s.action(mayor, 'choose', { wordId: s.state().round.options[0] }); await settle(h);
  const stale = await s.db.ref(s.paths[mayor - 1]).transaction(current => {
    if (current.wk.stage !== old.wk.stage) return;
    return Object.assign({}, current, { wkAction: { id: 'stale-choose-xxxxxxxx', type: 'choose', sessionId: old.wk.sessionId, stage: old.wk.stage, wordId: s.state().round.options[2] } });
  });
  assert.equal(stale.committed, false);
  const before = s.state();
  s.db.put(s.paths[mayor - 1], s.card(mayor)); await settle(h);
  assert.equal(s.state().turnId, before.turnId, 'redelivering the same request changes nothing');
  h.close();
});

test('another game taking a card suspends the host instead of fighting it', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({}); await settle(h);
  s.db.put(s.paths[2], { game: 'bombrelay', playerNum: 3, bomb: { version: 1, sessionId: 'other' } }); await settle(h);
  assert.equal(h.lastStatus, 'switched');
  await assert.rejects(h.command('pause'), /not_available/);
  assert.equal(s.card(3).game, 'bombrelay');
  h.close();
});

test('a second host tab waits for the lease, then continues the same game', async () => {
  const s = setup(); const first = s.host(); await settle(first);
  await first.start({ settings: { mode: 'werewolf' } }); await settle(first);
  const session = s.state().sessionId;
  const second = s.host(); await settle(first, second);
  assert.equal(second.lastStatus, 'other_host');
  first.stopped = true; // the first tab is frozen, not closed
  s.now += 15000; await second.renew(); await settle(second);
  assert.equal(second.lastStatus, 'ready');
  assert.equal(s.state().sessionId, session);
  await second.command('void'); await settle(second);
  assert.equal(s.state().phase, 'result');
  second.close();
});

test('a saved game for a different number of seats is never projected; Start begins a fresh one', async () => {
  const s = setup(5); const first = s.host(); await settle(first);
  await first.start({ settings: { mode: 'werewolf' } }); await settle(first);
  const oldSession = s.state().sessionId, oldCard = JSON.stringify(s.card(1));
  first.close(); await settle(first);
  s.room.count = 4; // the Hub room now has four links
  const second = s.host(); await settle(second);
  assert.equal(second.lastStatus, 'rosterChanged');
  await assert.rejects(second.command('pause'), /not_available/);
  s.now += 60000; await second.renew(); await settle(second); second.pulse(); await settle(second);
  assert.equal(JSON.stringify(s.card(1)), oldCard, 'old cards are left alone');
  await second.start({}); await settle(second);
  assert.equal(second.lastStatus, 'ready');
  const fresh = s.state();
  assert.notEqual(fresh.sessionId, oldSession);
  assert.equal(fresh.roster.length, 4);
  assert.equal(fresh.settings.mode, 'werewolf', 'the last settings carry over');
  for (let i = 1; i <= 4; i++) assert.equal(s.card(i).wk.sessionId, fresh.sessionId);
  second.close();
});

test('names edited in the Hub follow into the running game', async () => {
  const s = setup(); const h = s.host(); await settle(h);
  await h.start({}); await settle(h);
  const round = JSON.stringify(s.state().round);
  s.room.names = ['Amy', 'Kev', '', 'Willy', 'Mia'];
  await h.renew(); await settle(h);
  assert.deepEqual(s.state().roster.map(player => player.name), ['Amy', 'Kev', 'Jason', 'Willy', 'Mia'], 'a blank Hub name keeps the old one');
  assert.equal(JSON.stringify(s.state().round), round);
  assert.equal(s.card(2).name, 'Kev');
  assert.equal(s.card(4).wk.roster.find(player => player.playerNum === 2).name, 'Kev');
  const writes = s.db.writes;
  await h.renew(); await settle(h);
  assert.equal(s.db.writes - writes, 1, 'only the lease renewal is written once names match');
  h.close();
});
