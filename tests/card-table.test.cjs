'use strict';
// The card-run table shared by WORD LIMIT THEATER and ROOM SURVEY: the host
// page only starts a game, then the players' own cards apply every command
// with one compare-and-set transaction and tick the clock themselves.
// Loads the real card-table.js plus each game's UI module (whose SYNC is what
// play.html and the host pages use) against a Firebase-like in-memory tree.
// Run: node --test tests/card-table.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Firebase drops empty arrays/maps and null children. One tree, listeners on
// any path, transactions serialized like the server and updaters run twice to
// catch impure code. (Same stand-in as tests/who-knows-sync.test.cjs.)
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
  const keys = p => p.split('/').filter(Boolean);
  const get = p => p.startsWith('.info') ? info[p] ?? null : keys(p).reduce((value, key) => value?.[key], tree) ?? null;
  function notify() {
    for (const entry of listeners) {
      const value = get(entry.path), json = JSON.stringify(value);
      if (json === entry.last) continue;
      entry.last = json; queueMicrotask(() => { if (listeners.has(entry)) entry.fn(snap(value)); });
    }
  }
  function put(p, value) {
    const parts = keys(p), clean = normalize(clone(value));
    tree = clone(tree) || {};
    let parent = tree;
    for (const key of parts.slice(0, -1)) parent = parent[key] = parent[key] && typeof parent[key] === 'object' ? parent[key] : {};
    if (clean === null) delete parent[parts.at(-1)]; else parent[parts.at(-1)] = clean;
    tree = normalize(tree) || {}; writes++; notify();
  }
  let tail = Promise.resolve();
  return {
    get, put, get writes() { return writes; },
    setInfo(key, value) { info[key] = value; notify(); },
    ref(p) {
      return {
        path: p, key: keys(p).at(-1),
        on(_event, fn) { const entry = { path: p, fn, last: JSON.stringify(get(p)) }; listeners.add(entry); queueMicrotask(() => fn(snap(get(p)))); },
        off(_event, fn) { for (const entry of listeners) if (entry.path === p && (!fn || entry.fn === fn)) listeners.delete(entry); },
        once: async () => snap(get(p)),
        set: async value => put(p, value),
        remove: async () => put(p, null),
        onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
        transaction(updater) {
          const task = tail.then(async () => {
            updater(clone(get(p)));
            const next = updater(clone(get(p)));
            if (next === undefined) return { committed: false, snapshot: snap(get(p)) };
            put(p, next); return { committed: true, snapshot: snap(get(p)) };
          });
          tail = task.catch(() => {}); return task;
        },
      };
    },
  };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const settle = async () => { for (let n = 0; n < 12; n++) await turn(); };

const ROOT = path.join(__dirname, '..');
const MODULES = ['card-table.js', 'card-table-ui.js', 'word-limit-content.js', 'word-limit-engine.js', 'word-limit-ui.js',
  'room-survey-content.js', 'room-survey-engine.js', 'room-survey-ui.js'];
const NAMES = ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo', 'Sam', 'Robin', 'Ivy'];

function setup(count = 4) {
  let clock = 900000; const db = database(), extras = {};
  class ClockDate extends Date { static now() { return clock; } }
  const paths = Array.from({ length: count }, (_, i) => `rooms/CTTEST/players/card-${i + 1}`);
  const room = { code: 'CTTEST', count, name: i => NAMES[i] || `P${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, setInterval: () => 0, clearInterval: () => {}, console });
  for (const file of MODULES) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  const games = {
    wl: { sync: vm.runInContext('WORD_LIMIT_UI.SYNC', context), engine: vm.runInContext('WORD_LIMIT_ENGINE', context) },
    rs: { sync: vm.runInContext('ROOM_SURVEY_UI.SYNC', context), engine: vm.runInContext('ROOM_SURVEY_ENGINE', context) },
  };
  const tables = [];
  const host = which => {
    const S = games[which].sync;
    const h = new S.HostTable({ db, room, onStatus: value => { h.seenStatus = value; } }); h.connect(); tables.push(h); return h;
  };
  // Exactly what play.html does with the pointer on its own link.
  const card = (which, n) => {
    const S = games[which].sync, pointer = db.get(paths[n - 1]);
    assert.equal(pointer.game, S.game); assert.equal(pointer[S.key].version, 1);
    const c = new S.Table({ db, code: room.code, token: pointer[S.key].table, actor: pointer.playerNum }); c.connect(); tables.push(c); return c;
  };
  const cards = (which, seats = count) => Object.fromEntries(Array.from({ length: seats }, (_, i) => [i + 1, card(which, i + 1)]));
  return {
    db, room, paths, extras, games, host, card, cards, tables,
    state: which => JSON.parse(db.get(`rooms/CTTEST/players/${extras[games[which].sync.extra]}/stateJson`)),
    get now() { return clock; }, set now(value) { clock = value; },
    close: () => tables.forEach(t => t.close()),
  };
}
// Let the clock pass the current deadline and let whoever ranks first tick it.
async function expire(s, which, all) {
  const deadline = s.state(which).deadline;
  s.now = Math.max(s.now, deadline + 200);
  for (const c of all) c.pulse();
  await settle();
}

test('Start points every original link at the table; each game keeps its own table and pointer', async () => {
  const s = setup(4);
  const wl = s.host('wl'), rs = s.host('rs'); await settle();
  assert.equal(wl.seenStatus, 'ready'); assert.equal(rs.seenStatus, 'ready');
  assert.notEqual(s.extras.wordLimitControlToken, s.extras.roomSurveyControlToken, 'two games never share a table');
  await wl.start({ settings: { sceneMinutes: 2 } }); await settle();
  for (let i = 1; i <= 4; i++) {
    assert.deepEqual(s.db.get(s.paths[i - 1]), { game: 'wordlimit', playerNum: i, name: NAMES[i - 1], wl: { version: 1, table: s.extras.wordLimitControlToken } });
  }
  assert.equal(rs.seenStatus, 'ready', 'a survey host page with no game yet does not complain');
  // Starting the other game takes the links over; the first host page notices.
  await rs.start({}); await settle();
  assert.deepEqual(s.db.get(s.paths[0]), { game: 'roomsurvey', playerNum: 1, name: 'Amy', rs: { version: 1, table: s.extras.roomSurveyControlToken } });
  assert.equal(wl.seenStatus, 'switched');
  assert.equal(s.games.wl.sync.pointsAt(s.db.get(s.paths[0]), s.extras.wordLimitControlToken), false);
  assert.equal(s.games.rs.sync.pointerTable(s.db.get(s.paths[0])), s.extras.roomSurveyControlToken);
  // …and can bring every card back to its game, which carried on untouched.
  const session = s.state('wl').sessionId;
  await wl.point(); await settle();
  assert.equal(wl.seenStatus, 'ready');
  assert.equal(s.state('wl').sessionId, session);
  assert.equal(s.db.get(s.paths[3]).game, 'wordlimit');
  s.close();
});

test('WORD LIMIT THEATER: with the host page closed, the cards run a whole scene, score their lines, swap limits and start the next scene', async () => {
  const s = setup(4); const h = s.host('wl'); await settle();
  await h.start({ settings: { sceneMinutes: 2, unit: 'words', shuffles: 3, points: { 6: 10 } } }); await settle();
  h.close(); await settle();
  const cards = s.cards('wl'); const all = Object.values(cards); await settle();
  const first = s.state('wl');
  assert.equal(first.phase, 'cast');
  for (const c of all) {
    const view = c.view();
    assert.equal(view.playerNum, c.actor);
    assert.equal(view.wl.me.limit, first.round.limits[c.actor], 'each card shows its own limit');
    assert.equal(view.wl.me.worth, first.round.limits[c.actor] === 6 ? 10 : first.round.limits[c.actor], 'and what a line is worth');
    assert.deepEqual([...view.wl.online].sort(), [1, 2, 3, 4]);
  }
  // Any card may start the scene early.
  await cards[3].command('close'); await settle();
  assert.equal(s.state('wl').phase, 'scene');
  const writes = s.db.writes;
  for (const c of all) c.pulse(); await settle();
  assert.equal(s.db.writes, writes, 'an idle tick writes nothing');
  // Lines and a foul from the players' cards.
  await cards[2].command('line'); await settle();
  const worth2 = cards[2].view().wl.me.worth;
  assert.equal(s.state('wl').round.gained[2], worth2);
  await assert.rejects(cards[2].command('line'), /cooldown/, 'a double tap does not score twice');
  await cards[4].command('line'); await settle();
  await cards[2].command('foul', { target: 1 }); await settle();
  assert.equal(s.state('wl').round.fouls[1], 1);
  await assert.rejects(cards[2].command('foul', { target: 1 }), /cooldown/, 'the same whistle waits a moment');
  await assert.rejects(cards[4].command('twist'), /not_available/, 'no plot twists any more');
  assert.equal(cards[1].view().wl.standings.find(row => row.playerNum === 2).score, worth2, 'every card sees the points at once');
  // Pause from one card, resume from another: the stopwatch loses nothing.
  s.now += 10000;
  await cards[1].command('pause'); await settle();
  const left = s.state('wl').remainingMs;
  s.now += 600000;
  await cards[3].command('resume'); await settle();
  assert.equal(cards[2].view().wl.sceneEndsAt, s.now + left);
  // The three swaps and the end of the scene all fire from the cards' own pulses.
  const before = Object.assign({}, s.state('wl').round.limits);
  for (let guard = 0; guard < 8 && s.state('wl').phase === 'scene'; guard++) await expire(s, 'wl', all);
  const round = s.state('wl').round;
  assert.equal(s.state('wl').phase, 'result', 'no vote: straight to the result');
  assert.equal(round.shuffles, 3);
  assert.notDeepEqual(round.limits, before);
  assert.equal(round.endReason, 'time');
  assert.deepEqual(s.state('wl').scores, Object.fromEntries(Object.entries(round.gained).filter(([, v]) => v > 0)));
  assert.ok(cards[1].view().wl.result.best.length >= 1);
  await cards[4].command('next'); await settle();
  assert.equal(s.state('wl').phase, 'cast'); assert.equal(s.state('wl').roundNo, 2);
  assert.notEqual(s.state('wl').round.sceneId, first.round.sceneId, 'a new scene');
  s.close();
});

test('ROOM SURVEY: with the host page closed, the cards write, sort, guess and score a whole round', async () => {
  const s = setup(4); const h = s.host('rs'); await settle();
  await h.start({ settings: { answers: 2, turnSeconds: 15, guessMinutes: 4 } }); await settle();
  h.close(); await settle();
  const cards = s.cards('rs'); const all = Object.values(cards); await settle();
  const keeper = s.state('rs').round.keeper;
  const others = [1, 2, 3, 4].filter(n => n !== keeper);
  // Only the Keeper's card gets the prompt options.
  for (const c of all) assert.equal(c.view().rs.me.options != null, c.actor === keeper);
  await assert.rejects(cards[others[0]].command('pick', { questionId: cards[keeper].view().rs.me.options[0].id }), /not_available/);
  await cards[keeper].command('custom', { text: 'Something you always lose' }); await settle();
  assert.equal(s.state('rs').phase, 'write');
  assert.equal(cards[others[1]].view().rs.question.en, 'Something you always lose');
  // Everyone writes (the Keeper too); the last answer moves the table on.
  const answers = { 1: ['Keys zebra1', 'Socks'], 2: ['keys zebra1!', 'Umbrella zebra2'], 3: ['Socks', 'Phone zebra3'], 4: ['Patience zebra4', 'Phone zebra3'] };
  await assert.rejects(cards[1].command('submit', { answers: ['Socks', 'socks!'] }), /duplicate/, 'the same answer in two boxes is refused');
  for (const n of [1, 2, 3]) await cards[n].command('submit', { answers: answers[n] });
  await settle();
  assert.equal(s.state('rs').phase, 'write');
  assert.deepEqual(clone(cards[keeper].view().rs.writing.submitted), [1, 2, 3]);
  await cards[4].command('submit', { answers: answers[4] }); await settle();
  assert.equal(s.state('rs').phase, 'sort');
  // The Keeper tidies up from their card: same words merged on their own.
  // Always read the Keeper's current slips: a split gives both parts new ids.
  const find = text => cards[keeper].view().rs.me.groups.find(group => group.text.toLowerCase().startsWith(text));
  assert.equal(find('keys').count, 2);
  assert.equal(cards[others[0]].view().rs.me.groups, null, 'only the Keeper sees the slips');
  await cards[keeper].command('merge', { from: find('umbrella').id, into: find('patience').id }); await settle();
  assert.deepEqual(clone(find('patience').variants), ['Umbrella zebra2']);
  await cards[keeper].command('split', { group: find('patience').id }); await settle();
  assert.ok(find('umbrella') && find('patience'), 'split undid the merge');
  await cards[keeper].command('drop', { group: find('umbrella').id, dropped: true }); await settle();
  assert.equal(find('umbrella').dropped, true);
  await cards[keeper].command('startGuess'); await settle();
  const state = s.state('rs');
  assert.equal(state.phase, 'guess');
  assert.equal(state.round.buzz, null, 'guessing opens with nobody holding the buzz');
  // Nobody but the Keeper sees a hidden answer; each card sees its own.
  for (const n of others) {
    const json = JSON.stringify(Object.assign({}, cards[n].view(), { rs: Object.assign({}, cards[n].view().rs, { me: null }) }));
    for (const word of ['zebra1', 'zebra2', 'zebra3', 'zebra4']) assert.equal(json.includes(word), false, `card ${n} never receives ${word}`);
  }
  assert.equal(JSON.stringify(cards[keeper].view().rs.me.board).includes('zebra'), true);
  // Two cards buzz at once: exactly one gets it.
  const race = await Promise.allSettled([cards[others[0]].command('buzz'), cards[others[1]].command('buzz')]);
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(race.find(r => r.status === 'rejected').reason.message, /taken|stale_turn/);
  await settle();
  // A buzzer who runs out of time misses by itself.
  const firstBuzzer = s.state('rs').round.buzz.playerNum;
  s.now = s.state('rs').round.buzz.endsAt + 200;
  for (const c of all) c.pulse(); await settle();
  assert.equal(s.state('rs').round.buzz, null);
  assert.equal(s.state('rs').round.log.at(-1).result, 'timeout');
  assert.deepEqual(s.state('rs').round.locked, [firstBuzzer]);
  await assert.rejects(cards[firstBuzzer].command('buzz'), /locked/);
  // A hint, then whoever may buzz does, and the Keeper judges until the board is clear.
  const boardIds = s.state('rs').round.board;
  await cards[keeper].command('hint', { group: boardIds[0] }); await settle();
  assert.equal(cards[others[0]].view().rs.board[0].hint.length, 1);
  const expected = {};
  for (const id of boardIds) {
    const live = s.state('rs');
    if (live.phase !== 'guess') break;
    const buzzer = others.find(n => cards[n].view().rs.me.canBuzz);
    await cards[buzzer].command('buzz'); await settle();
    const group = live.round.groups.find(item => item.id === id);
    const writers = [...new Set(group.members.map(member => member.playerNum))];
    if (!writers.includes(buzzer)) expected[buzzer] = (expected[buzzer] || 0) + writers.length;
    await cards[keeper].command('hit', { group: id, buzz: cards[keeper].view().rs.buzz.serial }); await settle();
  }
  const done = s.state('rs');
  assert.equal(done.phase, 'result'); assert.equal(done.round.endReason, 'all');
  for (const [n, points] of Object.entries(expected)) assert.equal(done.scores[n], points, `seat ${n}`);
  assert.equal(done.scores[keeper] || 0, 0, 'the Keeper does not guess');
  assert.ok(cards[others[2]].view().rs.board.every(tile => typeof tile.text === 'string'), 'every answer is revealed at the end');
  await cards[others[2]].command('next'); await settle();
  assert.equal(s.state('rs').phase, 'choose'); assert.notEqual(s.state('rs').round.keeper, keeper, 'the Keeper moves on');
  s.close();
});

test('two cards pressing at once: exactly one wins, the other learns the table moved on', async () => {
  const s = setup(3); const h = s.host('wl'); await settle();
  await h.start({}); await settle();
  const a = s.card('wl', 1), b = s.card('wl', 2); await settle();
  await a.command('void'); await settle();
  const results = await Promise.allSettled([a.command('next'), b.command('next')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.message, 'stale_turn');
  assert.equal(s.state('wl').roundNo, 2);
  s.close();
});

test('an expired clock is ticked once: the host page first, then the lowest visible card, then the rest', async () => {
  const s = setup(4); const h = s.host('rs'); await settle();
  await h.start({}); await settle();
  const cards = s.cards('rs'); const all = Object.values(cards); await settle();
  const keeper = s.state('rs').round.keeper;
  await cards[keeper].command('pick', { questionId: cards[keeper].view().rs.me.options[0].id }); await settle();
  assert.equal(h.rank(), 0, 'the open host page ranks first');
  assert.deepEqual(all.map(c => c.rank()), [1, 2, 3, 4]);
  cards[1].setVisible(false); await settle();
  assert.equal(cards[1].rank(), 4, 'a card in the background waits for the others');
  h.close(); await settle();
  assert.equal(cards[2].rank(), 0, 'without the host page the lowest visible card ticks first');
  const deadline = s.state('rs').deadline;
  s.now = deadline + 160; // just past CARD_TABLE.CONFIG.tickBaseMs for the first in line
  for (const c of all) c.pulse(); await settle();
  assert.equal(s.state('rs').phase, 'result', 'nobody wrote, so the round was cancelled when time ran out');
  assert.equal(s.state('rs').round.outcome.reason, 'few_answers');
  const stage = s.state('rs').stage, writes = s.db.writes;
  for (const c of all) c.pulse(); await settle();
  assert.equal(s.state('rs').stage, stage, 'a second tick finds nothing to do');
  assert.equal(s.db.writes, writes);
  s.close();
});

test('cards manage the table: sit out, self-return, next-round settings, start over and end; only the host page renames', async () => {
  const s = setup(4); const h = s.host('wl'); await settle();
  await h.start({ settings: { sceneMinutes: 3 } }); await settle();
  h.close();
  const cards = s.cards('wl'); await settle();
  await cards[1].command('exclude', { playerNum: 4, active: false }); await settle();
  assert.equal(s.state('wl').roster.find(p => p.playerNum === 4).active, false);
  await assert.rejects(cards[4].command('pause'), /not_available/, 'someone sitting out cannot manage the table');
  await cards[4].command('exclude', { playerNum: 4, active: true }); await settle();
  assert.equal(s.state('wl').roster.find(p => p.playerNum === 4).active, true, 'they bring themselves back');
  await cards[2].command('settings', { settings: { sceneMinutes: 5, unit: 'chars', shuffles: 1, points: { 1: 4 } } }); await settle();
  assert.equal(s.state('wl').round.sceneMs, 180000, 'the scene in progress keeps its length');
  await assert.rejects(cards[2].command('settings', { settings: { points: { 1: -2 } } }), /invalid_options/);
  await cards[2].command('void'); await settle();
  await cards[3].command('next'); await settle();
  assert.equal(s.state('wl').round.sceneMs, 300000); assert.equal(s.state('wl').round.unit, 'chars'); assert.equal(s.state('wl').round.planned, 1);
  assert.equal(s.state('wl').round.value[1], 4);
  await assert.rejects(cards[1].command('rename', { names: [{ playerNum: 1, name: 'Hacker' }] }), /not_available/);
  await cards[1].command('stop'); await settle();
  assert.equal(s.state('wl').phase, 'finished');
  await cards[2].command('restart', { settings: s.state('wl').settings }); await settle();
  assert.equal(s.state('wl').phase, 'cast'); assert.equal(s.state('wl').roundNo, 1); assert.deepEqual(s.state('wl').scores, {});
  s.close();
});

test('the host page reopened elsewhere adopts the table the links point at; a new Start remembers used scenes', async () => {
  const s = setup(4); const first = s.host('wl'); await settle();
  await first.start({}); await settle();
  const token = s.extras.wordLimitControlToken, session = s.state('wl').sessionId, scene = s.state('wl').round.sceneId;
  first.close();
  delete s.extras.wordLimitControlToken; // another computer, no saved token
  const second = s.host('wl'); await settle(); await settle();
  assert.equal(second.token, token, 'it adopted the table from the links');
  assert.equal(s.extras.wordLimitControlToken, token);
  assert.equal(second.state.sessionId, session);
  assert.equal(second.seenStatus, 'ready');
  // While another game borrows a link, the page leaves the clock alone.
  s.db.put(s.paths[1], { game: 'bombrelay', playerNum: 2, bomb: { version: 1, sessionId: 'other' } }); await settle();
  assert.equal(second.seenStatus, 'switched');
  const stage = s.state('wl').stage;
  s.now += 60000; second.pulse(); await settle();
  assert.equal(s.state('wl').stage, stage);
  await second.start({}); await settle();
  assert.notEqual(s.state('wl').sessionId, session, 'Start is a new game');
  assert.equal(s.state('wl').used.scenes.includes(scene), true, 'the table remembers the scene it already played');
  assert.notEqual(s.state('wl').round.sceneId, scene);
  assert.equal(s.db.get(s.paths[1]).game, 'wordlimit', 'Start points the borrowed link back');
  s.close();
});

test('a saved game for a different number of seats is never reused; names edited in the Hub follow in', async () => {
  const s = setup(4); const first = s.host('rs'); await settle();
  await first.start({ settings: { answers: 3 } }); await settle();
  const round = JSON.stringify(s.state('rs').round);
  s.room.names = ['Amy', 'Kev', '', 'Willy'];
  first.afterChange(); await settle();
  assert.deepEqual(s.state('rs').roster.map(p => p.name), ['Amy', 'Kev', 'Jason', 'Willy'], 'a blank Hub name keeps the old one');
  assert.equal(JSON.stringify(s.state('rs').round), round, 'renaming keeps the round');
  const oldSession = s.state('rs').sessionId;
  first.close(); s.room.count = 3; delete s.room.names;
  const second = s.host('rs'); await settle(); await settle();
  assert.equal(second.seenStatus, 'rosterChanged');
  await assert.rejects(second.command('pause'), /not_available/);
  await second.start({}); await settle();
  assert.equal(second.seenStatus, 'ready');
  assert.notEqual(s.state('rs').sessionId, oldSession);
  assert.equal(s.state('rs').roster.length, 3);
  assert.equal(s.state('rs').settings.answers, 3, 'the last settings carry over');
  s.close();
});

test('a phone back from the background reads the table once; a card offline refuses to act', async () => {
  const s = setup(3); const h = s.host('wl'); await settle();
  await h.start({}); await settle();
  const c = s.card('wl', 2); await settle();
  const before = c.state.stage;
  await h.command('void'); await settle();
  c.raw = null; c.state = clone(c.state); c.state.stage = before; // a stale socket
  await c.refresh();
  assert.equal(c.state.phase, 'result');
  s.db.setInfo('.info/connected', false); await settle();
  await assert.rejects(c.command('next'), /offline/);
  s.close();
});
