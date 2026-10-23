'use strict';
// ROOM SURVEY rules: Keeper rotation and prompts, writing (no repeated answer
// in one player's boxes), stacking, the ranked board, buzz-in guessing with
// locks, hits worth the number of writers, burned own answers, clocks, table
// controls and — above all — that hidden answers and authors never reach a
// screen that shouldn't have them. Run: node --test tests/room-survey-engine.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const CONTENT = require('../room-survey-content.js');
const E = require('../room-survey-engine.js');

const NAMES = ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo', 'Sam', 'Robin', 'Ivy'];
const roster = n => Array.from({ length: n }, (_, i) => ({ playerNum: i + 1, name: NAMES[i] }));
let serial = 0;
const make = (n = 5, settings = {}, now = 2_000_000) => E.create({ id: 'rs-session-' + (++serial), roster: roster(n), settings, now, seed: 99 + serial });
function run(state, actor, type, extra = {}, now) {
  const input = Object.assign({ id: 'cmd-' + (++serial).toString().padStart(6, '0'), type, actor, sessionId: state.sessionId,
    stage: state.stage, now: now ?? state.lastChangeAt + 10, seed: 555 + serial }, extra);
  const next = E.apply(state, input);
  if (next === state) return { state, error: 'unchanged' };
  return { state: next, error: next.replies?.[actor]?.id === input.id ? next.replies[actor].error : '' };
}
const ok = (result, label = '') => { assert.equal(result.error, '', label || 'command accepted'); return result.state; };
const keeperOf = state => state.round.keeper;
const others = state => state.round.players.filter(n => n !== keeperOf(state));
// A full write phase with the given answers per seat (seat 1..n).
function written(n, answers, settings = {}) {
  let state = make(n, settings);
  state = ok(run(state, keeperOf(state), 'pick', { questionId: state.round.options[0] }));
  for (const [seat, list] of Object.entries(answers)) state = ok(run(state, Number(seat), 'submit', { answers: list }));
  return state;
}
const groupByText = (state, text) => state.round.groups.find(group => E.normKey(group.text) === E.normKey(text));

test('the prompts are complete: seven bilingual packs with unique ids', () => {
  assert.ok(CONTENT.QUESTIONS.length >= 90);
  assert.equal(new Set(CONTENT.QUESTIONS.map(item => item.id)).size, CONTENT.QUESTIONS.length);
  for (const category of CONTENT.CATEGORIES) assert.ok(CONTENT.pool(category).length >= 12, category);
  for (const item of CONTENT.QUESTIONS) {
    assert.ok(item.en.trim() && item.zh.trim(), item.id);
    assert.ok(CONTENT.CATEGORIES.includes(item.cat), item.id);
    assert.ok(item.en.split(/\s+/).length <= 14, `${item.id} stays short`);
  }
  assert.deepEqual(E.CONFIG.categories, ['mixed', ...CONTENT.CATEGORIES]);
});

test('the Keeper rotates fairly, never twice in a row, and can be named for the next round', () => {
  let state = make(4);
  const keepers = [keeperOf(state)];
  for (let i = 0; i < 7; i++) {
    state = ok(run(state, 1, 'void'));
    state = ok(run(state, 1, 'next'));
    keepers.push(keeperOf(state));
  }
  for (let i = 1; i < keepers.length; i++) assert.notEqual(keepers[i], keepers[i - 1], 'never twice in a row');
  assert.deepEqual(keepers.slice(0, 4).sort(), [1, 2, 3, 4], 'everyone keeps once before anyone keeps twice');
  assert.deepEqual(keepers.slice(4, 8).sort(), [1, 2, 3, 4]);
  state = ok(run(state, 2, 'setNext', { playerNum: 3 }));
  state = ok(run(state, 1, 'void')); state = ok(run(state, 1, 'next'));
  assert.equal(keeperOf(state), 3);
  assert.throws(() => make(2), /not_enough_players/);
});

test('choosing: only the Keeper sees and picks the options, may reroll or write their own', () => {
  let state = make(5, { category: 'food' });
  const keeper = keeperOf(state), other = others(state)[0];
  assert.equal(state.phase, 'choose'); assert.equal(state.deadline, null, 'no clock while choosing');
  assert.equal(state.round.options.length, 3);
  for (const id of state.round.options) assert.equal(CONTENT.get(id).cat, 'food');
  assert.ok(Array.isArray(E.view(state, keeper).rs.me.options));
  assert.equal(E.view(state, other).rs.me.options, null);
  assert.equal(JSON.stringify(E.view(state, 0)).includes(state.round.options[0]), false, 'the shared screen never sees the options');
  assert.equal(run(state, other, 'pick', { questionId: state.round.options[0] }).error, 'not_available');
  const before = state.round.options.slice();
  state = ok(run(state, keeper, 'reroll'));
  assert.ok(state.round.options.every(id => !before.includes(id)), 'three fresh prompts');
  assert.equal(run(state, keeper, 'custom', { text: ' ' }).error, 'empty');
  state = ok(run(state, keeper, 'custom', { text: '  A <b>thing</b> you   always lose  ' }));
  assert.equal(state.phase, 'write');
  assert.deepEqual(state.round.question, { id: null, en: 'A b thing /b you always lose', zh: 'A b thing /b you always lose', custom: true });
  assert.equal(state.deadline, state.lastChangeAt + 90000);
});

test('writing: answers are cleaned and capped; one player may not write the same answer twice; the round moves on when everyone has sent', () => {
  let state = make(4, { answers: 2 });
  state = ok(run(state, keeperOf(state), 'pick', { questionId: state.round.options[1] }));
  assert.equal(run(state, 1, 'submit', { answers: ['', '   '] }).error, 'empty');
  assert.equal(run(state, 1, 'submit', { answers: ['Snacks', 'snacks!'] }).error, 'duplicate', '“Snacks” and “snacks!” in two boxes are refused');
  assert.equal(run(state, 1, 'submit', { answers: ['零食', ' 零食。'] }).error, 'duplicate', 'also in Chinese');
  assert.equal(state.round.submitted[1], undefined, 'nothing was saved');
  state = ok(run(state, 1, 'submit', { answers: ['Snacks', '', 'My ex', 'third one'] }));
  assert.deepEqual(state.round.answers[1].map(a => a.text), ['Snacks', 'My ex'], 'blank boxes are skipped; extra answers are dropped');
  state = ok(run(state, 1, 'submit', { answers: ['x'.repeat(80)] }), 'answers can be edited until time is up');
  assert.equal(state.round.answers[1][0].text.length, E.CONFIG.answerMax);
  state = ok(run(state, 2, 'submit', { answers: ['A'] }));
  state = ok(run(state, 3, 'submit', { answers: ['B'] }));
  assert.equal(state.phase, 'write');
  assert.deepEqual(E.view(state, 0).rs.writing.submitted, [1, 2, 3]);
  state = ok(run(state, 4, 'submit', { answers: ['C'] }));
  assert.equal(state.phase, 'sort', 'everyone sent, so sorting starts at once');
  // A clock that runs out moves on with whatever was sent.
  let timed = make(4);
  timed = ok(run(timed, keeperOf(timed), 'pick', { questionId: timed.round.options[0] }));
  timed = ok(run(timed, 1, 'submit', { answers: ['one'] })); timed = ok(run(timed, 2, 'submit', { answers: ['two'] }));
  timed = ok(run(timed, 3, 'tick', {}, timed.deadline + 200));
  assert.equal(timed.phase, 'sort');
  // Fewer than two different answers cannot make a board.
  let thin = make(3);
  thin = ok(run(thin, keeperOf(thin), 'pick', { questionId: thin.round.options[0] }));
  thin = ok(run(thin, 1, 'submit', { answers: ['same'] }));
  thin = ok(run(thin, 2, 'tick', {}, thin.deadline + 200));
  assert.equal(thin.phase, 'result'); assert.equal(thin.round.outcome.voided, true); assert.equal(thin.round.outcome.reason, 'few_answers');
});

test('sorting: same words stack on their own; the Keeper stacks, unstacks and removes the rest, seeing the rank each stack would get', () => {
  let state = written(5, { 1: ['Snacks', 'My ex'], 2: ['snacks!', 'Weird symptoms'], 3: ['ＳＮＡＣＫＳ', 'ex IG'], 4: ['Dating apps', 'weird symptoms'], 5: ['Flights', 'Taxes'] });
  assert.equal(state.phase, 'sort');
  const keeper = keeperOf(state);
  assert.deepEqual(E.authorsOf(groupByText(state, 'snacks')), [1, 2, 3], 'Snacks, snacks! and ＳＮＡＣＫＳ are one answer');
  const myEx = groupByText(state, 'My ex'), exIg = groupByText(state, 'ex IG');
  assert.equal(run(state, others(state)[0], 'merge', { from: exIg.id, into: myEx.id }).error, 'not_available', 'only the Keeper sorts');
  state = ok(run(state, keeper, 'merge', { from: exIg.id, into: myEx.id }));
  const merged = state.round.groups.find(group => group.id === myEx.id);
  assert.deepEqual(E.authorsOf(merged), [1, 3]);
  const keeperGroups = E.view(state, keeper).rs.me.groups;
  assert.deepEqual(keeperGroups.find(group => group.id === myEx.id).variants, ['ex IG']);
  assert.equal(JSON.stringify(keeperGroups).includes('playerNum'), false, 'the Keeper never sees who wrote what');
  assert.deepEqual(keeperGroups.map(group => group.count), [...keeperGroups.map(group => group.count)].sort((a, b) => b - a), 'biggest stacks first');
  assert.deepEqual(keeperGroups.slice(0, 3).map(group => [group.count, group.rank, group.points]), [[3, 1, 3], [2, 2, 2], [2, 2, 2]], 'each stack shows its rank and worth');
  state = ok(run(state, keeper, 'split', { group: myEx.id }));
  assert.ok(groupByText(state, 'My ex') && groupByText(state, 'ex IG'), 'split undoes the merge');
  assert.equal(run(state, keeper, 'split', { group: groupByText(state, 'snacks').id }).error, 'not_available', 'same words stay together');
  state = ok(run(state, keeper, 'drop', { group: groupByText(state, 'Taxes').id, dropped: true }));
  state = ok(run(state, keeper, 'startGuess'));
  assert.equal(state.phase, 'guess');
  assert.equal(state.round.board.some(id => state.round.groups.find(group => group.id === id).text === 'Taxes'), false, 'removed answers are not on the board');
});

test('the board ranks answers by how many people wrote them (ties share a rank); every tile says what a hit is worth', () => {
  let state = written(5, { 1: ['Snacks', 'Ex'], 2: ['snacks', 'Symptoms'], 3: ['snacks', 'ex'], 4: ['Symptoms', 'Apps'], 5: ['Flights', 'Taxes'] });
  state = ok(run(state, keeperOf(state), 'startGuess'));
  const board = E.view(state, 0).rs.board;
  assert.deepEqual(board.map(tile => tile.count), [3, 2, 2, 1, 1, 1]);
  assert.deepEqual(board.map(tile => tile.rank), [1, 2, 2, 4, 4, 4]);
  assert.deepEqual(board.map(tile => tile.points), [3, 2, 2, 1, 1, 1], 'higher on the board, more points');
  assert.deepEqual(board[0].length, { n: 1, unit: 'words' });
});

test('buzz-in: one buzzer at a time; a hit scores one point per writer; your own answer burns; a miss waits for the others', () => {
  // Seat 1 is made the Keeper so the guessers are 2, 3, 4 and 5.
  let state = make(5);
  state = ok(run(state, 2, 'setNext', { playerNum: 1 }));
  state = ok(run(state, 2, 'void')); state = ok(run(state, 2, 'next'));
  assert.equal(keeperOf(state), 1);
  state = ok(run(state, 1, 'pick', { questionId: state.round.options[0] }));
  const answers = { 1: ['Snacks', 'Ex'], 2: ['snacks', 'Symptoms'], 3: ['snacks', 'ex'], 4: ['Symptoms', 'Apps'], 5: ['Flights', 'Taxes'] };
  for (const [seat, list] of Object.entries(answers)) state = ok(run(state, Number(seat), 'submit', { answers: list }));
  state = ok(run(state, 1, 'startGuess'));
  assert.equal(state.round.buzz, null, 'nobody holds the buzz yet');
  assert.deepEqual(E.view(state, 0).rs.guessers, [2, 3, 4, 5]);
  assert.equal(E.view(state, 3).rs.me.canBuzz, true);
  assert.equal(run(state, 1, 'buzz').error, 'not_available', 'the Keeper judges and does not buzz');
  const snacks = groupByText(state, 'snacks').id, apps = groupByText(state, 'apps').id, symptoms = groupByText(state, 'symptoms').id;
  assert.equal(run(state, 1, 'hit', { group: apps, buzz: 1 }).error, 'stale_turn', 'no judging before someone buzzes');
  // Seat 3 buzzes first; seat 2 is a moment too late.
  state = ok(run(state, 3, 'buzz'));
  assert.equal(state.round.buzz.playerNum, 3);
  assert.equal(run(state, 2, 'buzz').error, 'taken');
  assert.equal(E.view(state, 2).rs.me.canBuzz, false);
  assert.equal(E.view(state, 3).rs.me.myBuzz, true);
  // Seat 3 says "Apps" (written by 4 only): +1, and nobody is locked.
  state = ok(run(state, 1, 'hit', { group: apps, buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.revealed[apps], { how: 'hit', by: 3, points: 1 });
  assert.equal(state.round.buzz, null);
  // Seat 2 buzzes and says "Snacks", which seat 2 wrote: the rules burn it.
  state = ok(run(state, 2, 'buzz'));
  state = ok(run(state, 1, 'hit', { group: snacks, buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.revealed[snacks], { how: 'own', by: 2, points: 0 });
  assert.deepEqual(state.round.locked, [2], 'guessing your own answer counts as a miss');
  assert.equal(run(state, 2, 'buzz').error, 'locked');
  // Seat 4 misses, seat 5 gives up: now 2, 4 and 5 wait; 3 may still buzz.
  state = ok(run(state, 4, 'buzz'));
  const stale = state.round.buzz.serial;
  state = ok(run(state, 1, 'miss', { buzz: stale }));
  state = ok(run(state, 5, 'buzz'));
  assert.equal(run(state, 3, 'pass', { buzz: state.round.buzz.serial }).error, 'not_available', 'only the buzzer or the Keeper lets a buzz go');
  state = ok(run(state, 5, 'pass', { buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.locked, [2, 4, 5]);
  assert.equal(run(state, 1, 'miss', { buzz: stale }).error, 'stale_turn', 'a tap for an earlier buzz is refused');
  // Seat 3 misses too: everyone has had a go, so everyone may buzz again.
  state = ok(run(state, 3, 'buzz'));
  state = ok(run(state, 1, 'miss', { buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.locked, [], 'once everyone missed, all buzzers open again');
  // A wrong buzzer is locked; a hit by someone else opens everyone again.
  state = ok(run(state, 4, 'buzz'));
  state = ok(run(state, 1, 'miss', { buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.locked, [4]);
  state = ok(run(state, 5, 'buzz'));
  state = ok(run(state, 1, 'hit', { group: symptoms, buzz: state.round.buzz.serial }));
  assert.equal(state.round.revealed[symptoms].points, 2, '“Symptoms” was written by two people');
  assert.deepEqual(state.round.locked, [], 'the board changed: everyone may buzz again');
  assert.equal(run(state, 1, 'hit', { group: symptoms, buzz: state.round.buzz?.serial ?? 99 }).error, 'stale_turn', 'an answer is found once');
  assert.deepEqual(state.scores, {}, 'points are added when the round ends');
  assert.deepEqual(E.view(state, 0).rs.roundPoints, { 3: 1, 5: 2 });
  assert.deepEqual(state.round.log.map(entry => entry.result), ['hit', 'own', 'miss', 'pass', 'miss', 'miss', 'hit']);
  state = ok(run(state, 3, 'close'));
  assert.equal(state.phase, 'result');
  assert.deepEqual(state.scores, { 3: 1, 5: 2 });
  assert.deepEqual(state.round.outcome.best, [5]);
  for (const id of state.round.board) assert.ok(state.round.revealed[id], 'everything is revealed at the end');
  assert.equal(state.round.revealed[groupByText(state, 'flights').id].how, 'left');
});

test('clocks: a buzzer who runs out of time misses; the board clearing or the round clock ends the round; pause keeps both clocks', () => {
  let state = written(3, { 1: ['a1'], 2: ['b1'], 3: ['c1'] }, { answers: 1, turnSeconds: 15, guessMinutes: 3 });
  const keeper = keeperOf(state), [g1, g2] = others(state);
  state = ok(run(state, keeper, 'startGuess'));
  const start = state.lastChangeAt;
  assert.equal(state.deadline, start + 180000, 'with nobody buzzing, only the round clock runs');
  state = ok(run(state, keeper, 'hint', { group: state.round.board[0] }));
  assert.equal(E.view(state, 0).rs.board[0].hint.length, 1, 'a hint shows the first letter');
  state = ok(run(state, g1, 'buzz', {}, start + 1000));
  assert.equal(state.deadline, start + 16000, 'the buzzer has 15 s to answer');
  state = ok(run(state, g2, 'tick', {}, start + 16200));
  assert.equal(state.round.buzz, null);
  assert.equal(state.round.log.at(-1).result, 'timeout');
  assert.deepEqual(state.round.locked, [g1]);
  // Pause keeps both clocks.
  state = ok(run(state, g2, 'buzz', {}, start + 20000));
  state = ok(run(state, g2, 'pause', {}, start + 25000));
  const paused = E.view(state, 0).rs;
  assert.equal(paused.guessLeftMs, 180000 - 25000); assert.equal(paused.buzz.leftMs, 10000);
  assert.equal(E.view(state, g2).rs.me.canBuzz, false);
  state = ok(run(state, g2, 'resume', {}, start + 900000));
  assert.equal(state.round.guessEndsAt, start + 900000 + 155000);
  assert.equal(state.round.buzz.endsAt, start + 900000 + 10000);
  // The board clears.
  const ids = state.round.board.filter(id => !state.round.revealed[id]);
  for (const id of ids) {
    if (state.phase !== 'guess') break;
    if (!state.round.buzz) state = ok(run(state, others(state).find(n => !state.round.locked.includes(n)), 'buzz'));
    state = ok(run(state, keeper, 'hit', { group: id, buzz: state.round.buzz.serial }));
  }
  assert.equal(state.phase, 'result'); assert.equal(state.round.endReason, 'all');
  // The round clock, with no limit on answering.
  let clock = written(3, { 1: ['a1'], 2: ['b1'], 3: ['c1'] }, { answers: 1, turnSeconds: 0, guessMinutes: 3 });
  clock = ok(run(clock, keeperOf(clock), 'startGuess'));
  clock = ok(run(clock, others(clock)[0], 'buzz'));
  assert.equal(clock.round.buzz.endsAt, null, 'no answer limit');
  clock = ok(run(clock, 1, 'tick', {}, clock.round.guessEndsAt + 200));
  assert.equal(clock.phase, 'result'); assert.equal(clock.round.endReason, 'time');
});

test('people leaving: the Keeper leaving cancels the round; a buzzer leaving frees the buzz; nobody left to guess ends it', () => {
  let state = written(4, { 1: ['a'], 2: ['b'], 3: ['c'], 4: ['d'] }, { answers: 1 });
  const keeper = keeperOf(state), [g1, g2, g3] = others(state);
  state = ok(run(state, keeper, 'startGuess'));
  state = ok(run(state, g1, 'buzz'));
  state = ok(run(state, keeper, 'exclude', { playerNum: g1, active: false }));
  assert.equal(state.round.buzz, null);
  assert.equal(state.round.log.at(-1).result, 'skip');
  // g2 misses; with g1 gone, g2 and g3 are the guessers left.
  state = ok(run(state, g2, 'buzz')); state = ok(run(state, keeper, 'miss', { buzz: state.round.buzz.serial }));
  assert.deepEqual(state.round.locked, [g2]);
  // g3 sits out: g2 is the only guesser, so g2 may buzz again.
  state = ok(run(state, keeper, 'exclude', { playerNum: g3, active: false }));
  assert.deepEqual(state.round.locked, []);
  state = ok(run(state, g2, 'exclude', { playerNum: keeper, active: false }));
  assert.equal(state.phase, 'result'); assert.equal(state.round.outcome.reason, 'keeper_left');
  assert.deepEqual(state.scores, {}, 'a cancelled round scores nothing');
  let alone = written(3, { 1: ['a'], 2: ['b'], 3: ['c'] }, { answers: 1 });
  const k = keeperOf(alone), [x, y] = others(alone);
  alone = ok(run(alone, k, 'startGuess'));
  alone = ok(run(alone, k, 'exclude', { playerNum: x, active: false }));
  alone = ok(run(alone, k, 'exclude', { playerNum: y, active: false }));
  assert.equal(alone.phase, 'result'); assert.equal(alone.round.endReason, 'nobody');
  // While writing, a seat that leaves no longer holds up the round.
  let writing = make(4);
  writing = ok(run(writing, keeperOf(writing), 'pick', { questionId: writing.round.options[0] }));
  const [w1, w2, w3] = writing.round.players.filter(n => n !== keeperOf(writing));
  for (const seat of [keeperOf(writing), w1, w2]) writing = ok(run(writing, seat, 'submit', { answers: ['x' + seat] }));
  writing = ok(run(writing, w1, 'exclude', { playerNum: w3, active: false }));
  assert.equal(writing.phase, 'sort');
});

test('privacy: the shared screen and the guessers never receive a hidden answer or who wrote it', () => {
  const secret = 'zebra-secret-answer';
  let state = written(4, { 1: [secret, 'alpha'], 2: ['beta', secret], 3: ['gamma'], 4: ['delta'] }, { showAuthors: false });
  const keeper = keeperOf(state);
  state = ok(run(state, keeper, 'startGuess'));
  const guesser = others(state)[0];
  const shared = JSON.stringify(E.view(state, 0)), guessing = E.view(state, guesser);
  assert.equal(shared.includes(secret), false, 'not on the shared screen');
  assert.equal(JSON.stringify(guessing.rs.board).includes(secret), false, 'not on a guesser’s board');
  assert.equal(JSON.stringify(Object.assign({}, guessing.rs, { me: null })).includes(secret), false);
  assert.equal(shared.includes('"authors"'), false);
  const keeperBoard = E.view(state, keeper).rs.me.board;
  assert.ok(keeperBoard.some(tile => tile.text === secret), 'the Keeper sees the answers to judge them');
  state = ok(run(state, guesser, 'buzz'));
  assert.equal(JSON.stringify(E.view(state, 0)).includes(secret), false, 'buzzing reveals nothing');
  assert.equal(JSON.stringify(keeperBoard).includes('authors'), false, 'but never who wrote them');
  assert.ok(E.view(state, 1).rs.me.myAnswers.includes(secret), 'each writer sees their own answers');
  state = ok(run(state, keeper, 'close'));
  const result = E.view(state, 0).rs;
  assert.ok(result.board.every(tile => typeof tile.text === 'string'), 'everything is revealed at the end');
  assert.equal(JSON.stringify(result).includes('"authors"'), false, 'authors stay hidden unless the room chose to show them');
  // With the option on, the result names the writers.
  let open = written(3, { 1: ['same'], 2: ['same'], 3: ['other'] }, { answers: 1, showAuthors: true });
  open = ok(run(open, keeperOf(open), 'startGuess')); open = ok(run(open, 1, 'close'));
  assert.deepEqual(E.view(open, 0).rs.board.find(tile => tile.text === 'same').authors, [1, 2]);
});

test('table controls and fencing: pause, extend, settings, restart, stop and repeated ids', () => {
  let state = make(4);
  const keeper = keeperOf(state);
  assert.equal(run(state, 1, 'pause').error, 'not_available', 'choosing has no clock to pause');
  state = ok(run(state, keeper, 'pick', { questionId: state.round.options[0] }));
  const deadline = state.deadline;
  state = ok(run(state, 2, 'extend'));
  assert.equal(state.deadline, deadline + E.CONFIG.extendWriteMs);
  state = ok(run(state, 2, 'settings', { settings: { answers: 3, category: 'love', turnSeconds: 0, showAuthors: true } }));
  assert.equal(state.round.answersPer, 2, 'settings wait for the next round');
  assert.equal(run(state, 2, 'settings', { settings: { answers: 5 } }).error, 'invalid_options');
  const stale = state.stage;
  state = ok(run(state, 3, 'close'));
  assert.equal(run(state, 3, 'extend', { stage: stale }).error, 'stale_turn');
  assert.equal(state.phase, 'result', 'closing an empty write phase cancels the round');
  assert.equal(state.round.outcome.reason, 'few_answers');
  assert.equal(run(state, 3, 'void').error, 'not_available', 'a finished round cannot be cancelled again');
  state = ok(run(state, 3, 'next'));
  assert.equal(state.round.answersPer, 3); assert.equal(state.round.category, 'love'); assert.equal(state.round.turnMs, 0); assert.equal(state.round.showAuthors, true);
  const input = { id: 'repeat-cmd-0001', type: 'reroll', actor: keeperOf(state), sessionId: state.sessionId, stage: state.stage, now: state.lastChangeAt + 1, seed: 3 };
  const once = E.apply(state, input);
  assert.equal(E.apply(once, input), once, 'a retried command never applies twice');
  state = ok(run(state, 0, 'rename', { names: [{ playerNum: 1, name: 'Amelia' }] }));
  assert.equal(state.roster[0].name, 'Amelia');
  state = ok(run(state, 2, 'restart'));
  assert.equal(state.roundNo, 1); assert.deepEqual(state.scores, {});
  state = ok(run(state, 2, 'stop'));
  assert.equal(state.phase, 'finished');
});

test('normalizing and hints work for Chinese and English answers', () => {
  assert.equal(E.normKey('  Snacks!! '), E.normKey('ｓｎａｃｋｓ'));
  assert.equal(E.normKey('前任的 IG'), E.normKey('前任的IG。'));
  assert.deepEqual(E.lengthHint('前任的 IG'), { n: 5, unit: 'chars' });
  assert.deepEqual(E.lengthHint('my ex’s Instagram'), { n: 3, unit: 'words' });
  assert.equal(E.firstChar('  ex IG'), 'E');
  assert.equal(E.firstChar('「前任」'), '前');
});

test('a table saved by the earlier version (fixed turns) carries on with buzzing', () => {
  let state = written(4, { 1: ['a'], 2: ['b'], 3: ['c'], 4: ['d'] }, { answers: 1 });
  const keeper = keeperOf(state);
  state = ok(run(state, keeper, 'startGuess'));
  // The earlier shape: a turn order and the current turn, no buzz, no values.
  state.round.turn = { serial: 3, playerNum: others(state)[0], endsAt: state.lastChangeAt + 20000 };
  state.round.order = others(state); delete state.round.buzz; delete state.round.locked; delete state.round.values;
  state.deadline = state.round.turn.endsAt;
  state = ok(run(state, others(state)[1], 'tick', {}, state.deadline + 10));
  assert.equal(state.round.turn, undefined, 'the old turn is gone');
  assert.equal(state.deadline, state.round.guessEndsAt);
  state = ok(run(state, others(state)[1], 'buzz'));
  state = ok(run(state, keeper, 'hit', { group: state.round.board.find(id => !E.authorsOf(state.round.groups.find(g => g.id === id)).includes(others(state)[1])), buzz: state.round.buzz.serial }));
  assert.equal(Object.values(state.round.points)[0], 1, 'an old board scores one point per writer');
});
