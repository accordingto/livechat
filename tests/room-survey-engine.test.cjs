'use strict';
// ROOM SURVEY rules: Keeper rotation and prompts, writing, merging, the ranked
// board, turns, hits worth the number of writers, burned own answers, clocks,
// table controls and — above all — that hidden answers and authors never reach
// a screen that shouldn't have them. Run: node --test tests/room-survey-engine.test.cjs
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

test('writing: answers are cleaned, de-duplicated and capped; the round moves on when everyone has sent', () => {
  let state = make(4, { answers: 2 });
  state = ok(run(state, keeperOf(state), 'pick', { questionId: state.round.options[1] }));
  assert.equal(run(state, 1, 'submit', { answers: ['', '   '] }).error, 'empty');
  state = ok(run(state, 1, 'submit', { answers: ['Snacks', 'snacks!', 'My ex', 'third one'] }));
  assert.deepEqual(state.round.answers[1].map(a => a.text), ['Snacks', 'My ex'], 'same-word duplicates collapse; extra answers are dropped');
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

test('sorting: same words merge on their own; the Keeper merges, splits and removes the rest', () => {
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
  state = ok(run(state, keeper, 'split', { group: myEx.id }));
  assert.ok(groupByText(state, 'My ex') && groupByText(state, 'ex IG'), 'split undoes the merge');
  assert.equal(run(state, keeper, 'split', { group: groupByText(state, 'snacks').id }).error, 'not_available', 'same words stay together');
  state = ok(run(state, keeper, 'drop', { group: groupByText(state, 'Taxes').id, dropped: true }));
  state = ok(run(state, keeper, 'startGuess'));
  assert.equal(state.phase, 'guess');
  assert.equal(state.round.board.some(id => state.round.groups.find(group => group.id === id).text === 'Taxes'), false, 'removed answers are not on the board');
});

test('the board ranks answers by how many people wrote them (ties share a rank)', () => {
  let state = written(5, { 1: ['Snacks', 'Ex'], 2: ['snacks', 'Symptoms'], 3: ['snacks', 'ex'], 4: ['Symptoms', 'Apps'], 5: ['Flights', 'Taxes'] });
  state = ok(run(state, keeperOf(state), 'startGuess'));
  const board = E.view(state, 0).rs.board;
  assert.deepEqual(board.map(tile => tile.count), [3, 2, 2, 1, 1, 1]);
  assert.deepEqual(board.map(tile => tile.rank), [1, 2, 2, 4, 4, 4]);
  assert.deepEqual(board[0].length, { n: 1, unit: 'words' });
});

test('turns go round from after the Keeper; a hit scores one point per writer; your own answer burns', () => {
  // Seat 1 is made the Keeper so the order is predictable: 2, 3, 4, 5.
  let state = make(5);
  state = ok(run(state, 2, 'setNext', { playerNum: 1 }));
  state = ok(run(state, 2, 'void')); state = ok(run(state, 2, 'next'));
  assert.equal(keeperOf(state), 1);
  state = ok(run(state, 1, 'pick', { questionId: state.round.options[0] }));
  const answers = { 1: ['Snacks', 'Ex'], 2: ['snacks', 'Symptoms'], 3: ['snacks', 'ex'], 4: ['Symptoms', 'Apps'], 5: ['Flights', 'Taxes'] };
  for (const [seat, list] of Object.entries(answers)) state = ok(run(state, Number(seat), 'submit', { answers: list }));
  state = ok(run(state, 1, 'startGuess'));
  assert.deepEqual(state.round.order, [2, 3, 4, 5]);
  assert.equal(state.round.turn.playerNum, 2);
  const snacks = groupByText(state, 'snacks').id, apps = groupByText(state, 'apps').id, symptoms = groupByText(state, 'symptoms').id;
  // Seat 2 guesses "Apps" (written by 4 only): +1.
  state = ok(run(state, 1, 'hit', { group: apps, turn: state.round.turn.serial }));
  assert.deepEqual(state.round.revealed[apps], { how: 'hit', by: 2, points: 1 });
  assert.equal(state.round.turn.playerNum, 3);
  assert.equal(run(state, 2, 'pass', { turn: state.round.turn.serial }).error, 'not_available', 'only the Keeper or the guesser passes');
  // Seat 3 guesses "Snacks", which seat 3 wrote: burned, nobody scores it.
  state = ok(run(state, 1, 'hit', { group: snacks, turn: state.round.turn.serial }));
  assert.deepEqual(state.round.revealed[snacks], { how: 'own', by: 3, points: 0 });
  assert.equal(state.round.turn.playerNum, 4);
  // Seat 4 misses; seat 5 finds "Symptoms" (written by 2 and 4): +2.
  state = ok(run(state, 1, 'miss', { turn: state.round.turn.serial }));
  assert.equal(state.round.turn.playerNum, 5);
  assert.equal(run(state, 1, 'hit', { group: symptoms, turn: state.round.turn.serial - 1 }).error, 'stale_turn', 'a tap for an earlier turn is refused');
  state = ok(run(state, 1, 'hit', { group: symptoms, turn: state.round.turn.serial }));
  assert.equal(state.round.revealed[symptoms].points, 2);
  assert.equal(run(state, 1, 'hit', { group: symptoms, turn: state.round.turn.serial }).error, 'stale_turn', 'an answer is found once');
  assert.equal(state.round.turn.playerNum, 2, 'back to the first guesser');
  assert.deepEqual(state.scores, {}, 'points are added when the round ends');
  assert.deepEqual(E.view(state, 0).rs.roundPoints, { 2: 1, 5: 2 });
  state = ok(run(state, 3, 'close'));
  assert.equal(state.phase, 'result');
  assert.deepEqual(state.scores, { 2: 1, 5: 2 });
  assert.deepEqual(state.round.outcome.best, [5]);
  for (const id of state.round.board) assert.ok(state.round.revealed[id], 'everything is revealed at the end');
  assert.equal(state.round.revealed[groupByText(state, 'flights').id].how, 'left');
});

test('turn and round clocks: a turn times out, the board clearing or the clock ends the round', () => {
  let state = written(3, { 1: ['a1'], 2: ['b1'], 3: ['c1'] }, { answers: 1, turnSeconds: 15, guessMinutes: 3 });
  const keeper = keeperOf(state);
  state = ok(run(state, keeper, 'startGuess'));
  const first = state.round.turn.playerNum, start = state.lastChangeAt;
  assert.equal(state.deadline, start + 15000, 'the turn clock comes first');
  state = ok(run(state, keeper, 'hint', { group: state.round.board[0] }));
  assert.equal(E.view(state, 0).rs.board[0].hint.length, 1, 'a hint shows the first letter');
  state = ok(run(state, 1, 'tick', {}, start + 15200));
  assert.notEqual(state.round.turn.playerNum, first);
  assert.equal(state.round.log.at(-1).result, 'timeout');
  // Pause keeps both clocks.
  state = ok(run(state, 2, 'pause', {}, start + 20000));
  const paused = E.view(state, 0).rs;
  assert.equal(paused.guessLeftMs, 180000 - 20000); assert.equal(paused.turn.leftMs, 15000 - (20000 - 15200));
  state = ok(run(state, 2, 'resume', {}, start + 900000));
  assert.equal(state.round.guessEndsAt, start + 900000 + 160000);
  assert.equal(state.round.turn.endsAt, start + 900000 + 10200);
  // The board clears.
  for (const id of state.round.board) if (!state.round.revealed[id]) {
    const turn = state.round.turn;
    state = ok(run(state, keeper, 'hit', { group: id, turn: turn.serial }));
    if (state.phase !== 'guess') break;
  }
  assert.equal(state.phase, 'result'); assert.equal(state.round.endReason, 'all');
  // The round clock.
  let clock = written(3, { 1: ['a1'], 2: ['b1'], 3: ['c1'] }, { answers: 1, turnSeconds: 0, guessMinutes: 3 });
  clock = ok(run(clock, keeperOf(clock), 'startGuess'));
  assert.equal(clock.round.turn.endsAt, null, 'no turn limit');
  clock = ok(run(clock, 1, 'tick', {}, clock.round.guessEndsAt + 200));
  assert.equal(clock.phase, 'result'); assert.equal(clock.round.endReason, 'time');
});

test('people leaving: the Keeper leaving cancels the round; the current guesser leaving passes the turn', () => {
  let state = written(4, { 1: ['a'], 2: ['b'], 3: ['c'], 4: ['d'] }, { answers: 1 });
  const keeper = keeperOf(state);
  state = ok(run(state, keeper, 'startGuess'));
  const guesser = state.round.turn.playerNum;
  state = ok(run(state, keeper, 'exclude', { playerNum: guesser, active: false }));
  assert.notEqual(state.round.turn.playerNum, guesser);
  assert.equal(state.round.log.at(-1).result, 'skip');
  state = ok(run(state, state.round.turn.playerNum, 'exclude', { playerNum: keeper, active: false }));
  assert.equal(state.phase, 'result'); assert.equal(state.round.outcome.reason, 'keeper_left');
  assert.deepEqual(state.scores, {}, 'a cancelled round scores nothing');
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
