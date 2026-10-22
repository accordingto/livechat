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

// Firebase drops empty arrays/maps and null children. One tree, listeners on
// any path (a parent hears its children change), transactions serialized like
// the server and updaters run twice to catch impure code.
function normalize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const clean = normalize(entry); if (clean !== null) output[key] = clean; }
  return Object.keys(output).length ? output : null;
}
function database() {
  let tree = {}; let writes = 0;
  const info = { '.info/connected': true, '.info/serverTimeOffset': 0 };
  const listeners = new Set();
  const keys = path => path.split('/').filter(Boolean);
  const get = path => path.startsWith('.info') ? info[path] ?? null : keys(path).reduce((value, key) => value?.[key], tree) ?? null;
  function notify() {
    for (const entry of listeners) {
      const value = get(entry.path), json = JSON.stringify(value);
      if (json === entry.last) continue;
      entry.last = json; queueMicrotask(() => { if (listeners.has(entry)) entry.fn(snap(value)); });
    }
  }
  function put(path, value) {
    const parts = keys(path), clean = normalize(clone(value));
    tree = clone(tree) || {};
    let parent = tree;
    for (const key of parts.slice(0, -1)) parent = parent[key] = parent[key] && typeof parent[key] === 'object' ? parent[key] : {};
    if (clean === null) delete parent[parts.at(-1)]; else parent[parts.at(-1)] = clean;
    tree = normalize(tree) || {}; writes++; notify();
  }
  let tail = Promise.resolve();
  const db = {
    get, put, get writes() { return writes; },
    setInfo(key, value) { info[key] = value; notify(); },
    ref(path) {
      return {
        path, key: keys(path).at(-1),
        on(_event, fn) { const entry = { path, fn, last: JSON.stringify(get(path)) }; listeners.add(entry); queueMicrotask(() => fn(snap(get(path)))); },
        off(_event, fn) { for (const entry of listeners) if (entry.path === path && (!fn || entry.fn === fn)) listeners.delete(entry); },
        once: async () => snap(get(path)),
        set: async value => put(path, value),
        remove: async () => put(path, null),
        onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
        transaction(updater) {
          const task = tail.then(async () => {
            updater(clone(get(path)));
            const next = updater(clone(get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(get(path)) };
            put(path, next); return { committed: true, snapshot: snap(get(path)) };
          });
          tail = task.catch(() => {}); return task;
        },
      };
    },
  };
  return db;
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const settle = async () => { for (let n = 0; n < 12; n++) await turn(); };

function setup(count = 5) {
  let clock = 900000; const db = database(), extras = {};
  class ClockDate extends Date { static now() { return clock; } }
  const paths = Array.from({ length: count }, (_, i) => `rooms/WKTEST/players/card-${i + 1}`);
  const room = { code: 'WKTEST', count, name: i => ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo'][i] || `P${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, WHO_KNOWS_WORDS: WORDS, WHO_KNOWS_ENGINE: E,
    setInterval: () => 0, clearInterval: () => {} });
  vm.runInContext(fs.readFileSync(require.resolve('../who-knows-sync.js'), 'utf8'), context);
  const S = context.WHO_KNOWS_SYNC;
  const tables = [];
  const host = () => { const h = new S.HostTable({ db, room, onStatus: value => { h.seenStatus = value; } }); h.connect(); tables.push(h); return h; };
  // Exactly what play.html does with the pointer on its own link.
  const card = n => {
    const pointer = db.get(paths[n - 1]);
    assert.equal(pointer.game, 'whoknows'); assert.equal(pointer.wk.version, 2);
    const c = new S.Table({ db, code: room.code, token: pointer.wk.table, actor: pointer.playerNum }); c.connect(); tables.push(c); return c;
  };
  return {
    db, room, paths, extras, S, host, card, tables,
    state: () => JSON.parse(db.get(`rooms/WKTEST/players/${extras.whoKnowsControlToken}/stateJson`)),
    get now() { return clock; }, set now(value) { clock = value; },
    close: () => tables.forEach(t => t.close()),
  };
}
const roleOf = (s, role) => Object.keys(s.state().round.roles).map(Number).filter(n => s.state().round.roles[n] === role);

test('Start points every original link at the table; the link itself carries no game secret', async () => {
  const s = setup(); const h = s.host(); await settle();
  assert.equal(h.seenStatus, 'ready');
  await h.start({ settings: { mode: 'werewolf' } }); await settle();
  const state = s.state();
  for (let i = 1; i <= 5; i++) {
    const pointer = s.db.get(s.paths[i - 1]);
    assert.deepEqual(pointer, { game: 'whoknows', playerNum: i, name: s.room.name(i - 1), wk: { version: 2, table: s.extras.whoKnowsControlToken } });
    for (const id of state.round.options) assert.equal(JSON.stringify(pointer).includes(id), false);
  }
  // Each card renders only its own seat.
  const cards = [1, 2, 3, 4, 5].map(s.card); await settle();
  for (const c of cards) {
    const view = c.view();
    assert.equal(view.playerNum, c.actor); assert.equal(view.wk.me.role, state.round.roles[c.actor]);
    assert.equal(JSON.stringify(view).includes('"roles"'), false);
    assert.equal(view.wk.me.options != null, c.actor === state.round.mayor);
  }
  assert.equal(JSON.stringify(h.view()).includes('"roles"'), false, 'the shared screen view has no roles');
  s.close();
});

test('with the host page closed, the cards play a whole Insider round and keep the clock themselves', async () => {
  const s = setup(6); const h = s.host(); await settle();
  await h.start({ settings: { mode: 'insider' } }); await settle();
  h.close(); await settle();
  const cards = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, s.card(n)])); await settle();
  const master = s.state().round.mayor, insider = roleOf(s, 'insider')[0];
  const common = s.state().round.players.find(n => n !== master && n !== insider);
  await cards[master].command('choose', { wordId: s.state().round.options[1] }); await settle();
  assert.equal(s.state().phase, 'countdown');
  const writes = s.db.writes;
  for (const c of Object.values(cards)) c.pulse(); await settle();
  assert.equal(s.db.writes, writes, 'an idle tick writes nothing');
  s.now += 5000 + 200; for (const c of Object.values(cards)) c.pulse(); await settle();
  assert.equal(s.state().phase, 'questions', 'a card started the questions when the countdown ran out');
  await cards[common].command('raise', { text: 'Is it bigger than a cat?' });
  await cards[insider].command('raise'); await settle();
  assert.equal(cards[insider].view().wk.me.queuePos, 1);
  assert.equal(cards[master].view().wk.current.text, 'Is it bigger than a cat?');
  await cards[master].command('answer', { askId: cards[master].view().wk.current.id, answer: 'no' }); await settle();
  assert.equal(cards[insider].view().wk.me.asking, true);
  // Table controls from an ordinary player's card.
  await cards[common].command('pause'); await settle();
  assert.equal(s.state().phase, 'paused');
  s.now += 30000;
  await cards[insider].command('resume'); await settle();
  const deadline = s.state().deadline;
  await cards[common].command('extend'); await settle();
  assert.equal(s.state().deadline, deadline + 60000);
  await cards[master].command('answer', { askId: cards[master].view().wk.current.id, answer: 'correct' }); await settle();
  assert.equal(s.state().phase, 'discuss');
  assert.equal(cards[common].view().wk.word.id, s.state().round.wordId, 'the guessed word is public');
  await cards[common].command('close'); await settle();
  assert.equal(s.state().phase, 'judge');
  for (const n of s.state().round.players.filter(n => n !== insider)) await cards[n].command('judge', { choice: 'yes' });
  await settle();
  assert.equal(s.state().phase, 'result');
  assert.equal(cards[insider].view().wk.result.outcome.key, 'commons_found');
  await cards[insider].command('next'); await settle();
  assert.equal(s.state().phase, 'choose'); assert.equal(s.state().roundNo, 2);
  s.close();
});

test('two cards pressing at once: exactly one wins, the other learns the table moved on', async () => {
  const s = setup(); const h = s.host(); await settle();
  await h.start({}); await settle();
  const a = s.card(1), b = s.card(2); await settle();
  await a.command('void'); await settle();
  assert.equal(s.state().phase, 'result');
  const results = await Promise.allSettled([a.command('next'), b.command('next')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.message, 'stale_turn');
  assert.equal(s.state().roundNo, 2);
  s.close();
});

test('an expired clock is ticked once: the host page first, then the lowest visible card, then the rest', async () => {
  const s = setup(); const h = s.host(); await settle();
  await h.start({ settings: { mode: 'werewolf' } }); await settle();
  const cards = [1, 2, 3, 4, 5].map(s.card); await settle();
  const mayor = s.state().round.mayor;
  await cards[mayor - 1].command('choose', { wordId: s.state().round.options[0] }); await settle();
  assert.equal(h.rank(), 0, 'the open host page ranks first');
  assert.deepEqual(cards.map(c => c.rank()), [1, 2, 3, 4, 5]);
  cards[0].setVisible(false); await settle();
  assert.equal(cards[0].rank(), 5, 'a card in the background waits for the others');
  assert.equal(cards[1].rank(), 1);
  h.close(); await settle();
  assert.equal(cards[1].rank(), 0, 'without the host page the lowest visible card ticks first');
  const deadline = s.state().deadline;
  s.now = deadline + s.S.CONFIG.tickBaseMs + 10;
  for (const c of cards) c.pulse(); await settle();
  assert.equal(s.state().phase, 'questions');
  const stage = s.state().stage;
  for (const c of cards) c.pulse(); await settle();
  assert.equal(s.state().stage, stage, 'a second tick finds nothing to do');
  assert.deepEqual([...cards[2].online()], [1, 2, 3, 4, 5]);
  s.close();
});

test('cards manage the table: sit out, self-return, next answerer, next-round settings, start over and end', async () => {
  const s = setup(5); const h = s.host(); await settle();
  await h.start({ settings: { mode: 'insider' } }); await settle();
  h.close();
  const cards = Object.fromEntries([1, 2, 3, 4, 5].map(n => [n, s.card(n)])); await settle();
  const mayor = s.state().round.mayor, other = s.state().round.players.find(n => n !== mayor);
  await cards[other].command('exclude', { playerNum: mayor, active: false }); await settle();
  assert.equal(s.state().phase, 'result', 'sitting out the answerer cancels the round');
  assert.equal(s.state().round.outcome.reason, 'answerer_left');
  await assert.rejects(cards[mayor].command('exclude', { playerNum: other, active: false }), /not_available/, 'someone sitting out cannot manage others');
  await assert.rejects(cards[mayor].command('pause'), /not_available/);
  await cards[mayor].command('exclude', { playerNum: mayor, active: true }); await settle();
  assert.equal(s.state().roster.find(p => p.playerNum === mayor).active, true, 'they bring themselves back');
  await cards[other].command('setNext', { playerNum: other }); await settle();
  await cards[other].command('settings', { settings: { mode: 'werewolf', tokens: 20 } }); await settle();
  assert.equal(s.state().settings.mode, 'werewolf');
  await cards[mayor].command('next'); await settle();
  assert.equal(s.state().round.mode, 'werewolf'); assert.equal(s.state().round.mayor, other); assert.equal(s.state().round.tokens, 20);
  await assert.rejects(cards[1].command('rename', { names: [{ playerNum: 1, name: 'Hacker' }] }), /not_available/, 'only the host page renames');
  await cards[1].command('stop'); await settle();
  assert.equal(s.state().phase, 'finished');
  await cards[2].command('restart', { settings: s.state().settings }); await settle();
  assert.equal(s.state().phase, 'choose'); assert.equal(s.state().roundNo, 1);
  assert.deepEqual(s.state().scores, {});
  s.close();
});

test('the host page reopened elsewhere follows the table the links point at, and can bring borrowed cards back', async () => {
  const s = setup(); const first = s.host(); await settle();
  await first.start({ settings: { mode: 'werewolf' } }); await settle();
  const token = s.extras.whoKnowsControlToken, session = s.state().sessionId;
  first.close();
  delete s.extras.whoKnowsControlToken; // another computer, no saved token
  const second = s.host(); await settle(); await settle();
  assert.equal(second.token, token, 'it adopted the table from the links');
  assert.equal(s.extras.whoKnowsControlToken, token);
  assert.equal(second.state.sessionId, session);
  assert.equal(second.seenStatus, 'ready');
  // Another game borrows one link.
  s.db.put(s.paths[2], { game: 'bombrelay', playerNum: 3, bomb: { version: 1, sessionId: 'other' } }); await settle();
  assert.equal(second.seenStatus, 'switched');
  const stage = s.state().stage;
  s.now += 60000; second.pulse(); await settle();
  assert.equal(s.state().stage, stage, 'the page leaves the clock alone while the room shows another game');
  await second.point(); await settle();
  assert.equal(second.seenStatus, 'ready');
  assert.equal(s.state().sessionId, session, 'the same game carries on');
  assert.equal(s.db.get(s.paths[2]).wk.table, token);
  s.close();
});

test('a saved game for a different number of seats is never reused; Start begins a fresh one', async () => {
  const s = setup(5); const first = s.host(); await settle();
  await first.start({ settings: { mode: 'werewolf' } }); await settle();
  const oldSession = s.state().sessionId;
  first.close(); s.room.count = 4;
  const second = s.host(); await settle(); await settle();
  assert.equal(second.seenStatus, 'rosterChanged');
  await assert.rejects(second.command('pause'), /not_available/);
  await second.start({}); await settle();
  assert.equal(second.seenStatus, 'ready');
  const fresh = s.state();
  assert.notEqual(fresh.sessionId, oldSession);
  assert.equal(fresh.roster.length, 4);
  assert.equal(fresh.settings.mode, 'werewolf', 'the last settings carry over');
  s.close();
});

test('names edited in the Hub follow into the running game; links from an older host page are migrated', async () => {
  const s = setup(); const h = s.host(); await settle();
  await h.start({}); await settle();
  const round = JSON.stringify(s.state().round);
  s.room.names = ['Amy', 'Kev', '', 'Willy', 'Mia'];
  h.afterChange(); await settle(); // as on the host page's next table or link update
  assert.deepEqual(s.state().roster.map(player => player.name), ['Amy', 'Kev', 'Jason', 'Willy', 'Mia'], 'a blank Hub name keeps the old one');
  assert.equal(JSON.stringify(s.state().round), round);
  // A link still showing a view from the earlier lease-based host page.
  const session = s.state().sessionId;
  s.db.put(s.paths[0], { game: 'whoknows', playerNum: 1, wk: { version: 1, sessionId: session, stage: 0 } }); await settle();
  assert.deepEqual(s.db.get(s.paths[0]).wk, { version: 2, table: s.extras.whoKnowsControlToken });
  s.close();
});

test('a phone back from the background reads the table once; a card offline refuses to act', async () => {
  const s = setup(); const h = s.host(); await settle();
  await h.start({}); await settle();
  const c = s.card(2); await settle();
  const before = c.state.stage;
  await h.command('void'); await settle();
  c.raw = null; c.state = JSON.parse(JSON.stringify(c.state || {})); c.state.stage = before; // a stale socket
  await c.refresh();
  assert.equal(c.state.phase, 'result');
  s.db.setInfo('.info/connected', false); await settle();
  await assert.rejects(c.command('next'), /offline/);
  s.close();
});
