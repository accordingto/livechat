const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sketch-relay-engine.js');
const ART = require('../sketch-relay-art.js');
const WORDS = require('../sketch-relay-words.js');

let counter = 0;
const id = () => 'cmd-' + String(++counter).padStart(6, '0');
const roster = n => Array.from({ length: n }, (_, i) => ({ playerNum: i + 1, name: ['Amy', 'Ben', 'Cai', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'][i] }));
const settings = (extra = {}) => ({ deck: 'mixed', sketchSeconds: 60, scoring: 'friendly', ...extra });
const doodle = (x = 100) => ART.encode([{ color: 0, size: 1, points: [x, 100, x + 200, 300, x + 400, 120] }]);
function game(n = 4, extra = {}, seed = 7) {
  return E.create({ id: 'session-' + n + '-' + seed, roster: roster(n), settings: settings(extra), now: 1000, seed });
}
function act(state, actor, type, extra = {}, now = state.lastChangeAt + 10) {
  return E.apply(state, { id: id(), type, actor, sessionId: state.sessionId, turnId: state.turnId, now, seed: 99, ...extra });
}
function readyAll(state) {
  for (const p of state.roster) if (p.active !== false && state.phase === 'word') state = act(state, p.playerNum, 'ready');
  return state;
}
// Everyone answers whatever they are holding: drawings for words/guesses and
// guesses that copy the secret word, so books "survive" intact.
function playStep(state, answer = (task, num) => task.kind === 'sketch' ? { art: doodle(num * 10) } : { text: 'guess by ' + num }) {
  const step = state.step;
  for (const p of state.roster) {
    if (state.phase !== 'play' || state.step !== step) break;
    const view = E.view(state, p.playerNum).relay;
    const task = view.me?.task;
    if (!task || task.submitted || task.skipped) continue;
    state = act(state, p.playerNum, 'submit', { book: task.book, kind: task.kind, ...answer(task, p.playerNum) });
    assert.equal(state.replies[p.playerNum].error, '', `submit by ${p.playerNum}`);
  }
  return state;
}
function playAll(state, answer) {
  state = readyAll(state);
  let guard = 0;
  while (state.phase === 'play' && guard++ < 20) state = playStep(state, answer);
  return state;
}

test('setup validates players and options, deals six distinct words and one shared die roll', () => {
  assert.throws(() => E.create({ id: 'session-x', roster: roster(3), settings: settings(), now: 1, seed: 1 }), /invalid_roster/);
  assert.throws(() => E.create({ id: 'session-x', roster: roster(10), settings: settings(), now: 1, seed: 1 }), /invalid_roster/);
  assert.throws(() => E.create({ id: 'session-x', roster: roster(4), settings: settings({ sketchSeconds: 30 }), now: 1, seed: 1 }), /invalid_options/);
  assert.throws(() => E.create({ id: 'session-x', roster: roster(4), settings: settings({ deck: 'hard' }), now: 1, seed: 1 }), /invalid_options/);
  const s = game(9);
  assert.equal(s.phase, 'word');
  assert.ok(s.die >= 1 && s.die <= 6);
  const all = s.books.flatMap(b => b.card);
  assert.equal(all.length, 54); assert.equal(new Set(all).size, 54);
  for (const book of s.books) { assert.equal(book.card.length, 6); assert.equal(book.wordIndex, s.die - 1); }
  const easy = E.create({ id: 'session-easy', roster: roster(4), settings: settings({ deck: 'easy' }), now: 1, seed: 3 });
  assert.ok(easy.books.flatMap(b => b.card).every(w => WORDS.easy.includes(w)));
  const tricky = E.create({ id: 'session-tricky', roster: roster(4), settings: settings({ deck: 'tricky' }), now: 1, seed: 3 });
  assert.ok(tricky.books.flatMap(b => b.card).every(w => WORDS.tricky.includes(w)));
});

test('word stage: own card is private, swapping moves along the card, everyone ready starts the first page', () => {
  let s = game(4);
  const v1 = E.view(s, 1).relay;
  assert.deepEqual(v1.me.card, s.books[0].card);
  assert.ok(!JSON.stringify(v1).includes(s.books[1].card[0]));
  assert.ok(!JSON.stringify(E.view(s, 0)).includes(s.books[0].card[0]));
  s = act(s, 1, 'ready'); assert.equal(E.view(s, 0).relay.progress.done, 1);
  s = act(s, 1, 'swapWord');
  assert.equal(s.books[0].wordIndex, s.die % 6); assert.equal(s.ready[1], false);
  for (let i = 0; i < 4; i++) s = act(s, 1, 'swapWord');
  s = act(s, 1, 'swapWord'); assert.equal(s.replies[1].error, 'not_available');
  const word = s.books[0].card[s.books[0].wordIndex];
  s = readyAll(s);
  assert.equal(s.phase, 'play'); assert.equal(s.books[0].pages[0].text, word);
  assert.ok(s.deadline > s.lastChangeAt);
});

test('even groups draw their own word first; books pass one seat on and come home ending with a guess', () => {
  let s = readyAll(game(4));
  assert.equal(s.steps, 4); assert.equal(s.offset, 0);
  for (let p = 1; p <= 4; p++) {
    const task = E.view(s, p).relay.me.task;
    assert.equal(task.owner, p); assert.equal(task.kind, 'sketch'); assert.equal(task.prompt.kind, 'word');
    assert.equal(task.passTo, p % 4 + 1);
  }
  s = playStep(s);
  assert.equal(s.step, 1);
  const task = E.view(s, 2).relay.me.task;
  assert.equal(task.owner, 1); assert.equal(task.kind, 'guess'); assert.equal(task.prompt.kind, 'sketch');
  assert.equal(task.prompt.by, 1);
  // privacy: a guesser never sees the secret word page.
  assert.ok(!JSON.stringify(E.view(s, 2).relay.me.task).includes(s.books[0].pages[0].text));
  s = playAll(s);
  assert.equal(s.phase, 'reveal');
  for (const book of s.books) {
    assert.deepEqual(book.pages.map(p => p.kind), ['word', 'sketch', 'guess', 'sketch', 'guess']);
    assert.equal(book.pages[1].by, book.owner);
    assert.equal(book.pages[4].by, (book.owner + 2) % 4 + 1);
  }
});

test('odd groups pass the word on first, so owners never draw their own word', () => {
  let s = playAll(game(5));
  assert.equal(s.steps, 4); assert.equal(s.phase, 'reveal');
  for (const book of s.books) {
    assert.deepEqual(book.pages.map(p => p.kind), ['word', 'sketch', 'guess', 'sketch', 'guess']);
    assert.ok(book.pages.slice(1).every(p => p.by !== book.owner));
    assert.equal(book.pages[1].by, book.owner % 5 + 1);
  }
  const nine = playAll(game(9));
  assert.equal(nine.books[0].pages.length, 9);
  assert.equal(nine.books[0].pages.at(-1).kind, 'guess');
});

test('submissions are checked: holder, kind, drawing format, guess length, stale turns and duplicates', () => {
  let s = readyAll(game(4));
  const turn = s.turnId;
  s = act(s, 1, 'submit', { book: 1, kind: 'sketch', art: doodle() }); assert.equal(s.replies[1].error, 'not_available');
  s = act(s, 1, 'submit', { book: 0, kind: 'guess', text: 'cat' }); assert.equal(s.replies[1].error, 'not_available');
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: 'B<script>' }); assert.equal(s.replies[1].error, 'invalid_sketch');
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: 'x'.repeat(ART.MAX_LENGTH + 1) }); assert.equal(s.replies[1].error, 'invalid_sketch');
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: '', turnId: turn - 1 }); assert.equal(s.replies[1].error, 'stale_turn');
  const first = { id: id(), type: 'submit', actor: 1, sessionId: s.sessionId, turnId: turn, now: s.lastChangeAt + 5, seed: 1, book: 0, kind: 'sketch', art: doodle() };
  s = E.apply(s, first); assert.equal(s.replies[1].error, '');
  const again = E.apply(s, { ...first, art: '' }); assert.equal(again, s, 'duplicate command ids are ignored');
  // A blank page is a legal drawing, and redrawing before the page moves on replaces it.
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: '' });
  assert.equal(s.submissions[0].art, '');
  s = playStep(s);
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: '   ' }); assert.equal(s.replies[2].error, 'invalid_guess');
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: 'a'.repeat(41) }); assert.equal(s.replies[2].error, 'invalid_guess');
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: '  big   <red> dog ' });
  assert.equal(s.submissions[0].text, 'big red dog');
  assert.equal(E.view(s, 2).relay.me.task.submitted.text, 'big red dog');
  assert.equal(E.view(s, 0).relay.roster[1].status, 'done');
});

test('an away player is skipped and the next player answers the last real page, keeping the alternation', () => {
  let s = playStep(readyAll(game(4)));
  // Ben goes away while holding Amy's book on a guessing page.
  s = act(s, 0, 'away', { playerNum: 2, away: true });
  assert.equal(s.submissions[0].skipped, true);
  s = playStep(s);
  assert.equal(s.step, 2);
  const cai = E.view(s, 3).relay.me.task;
  assert.equal(cai.owner, 1); assert.equal(cai.kind, 'guess', 'Cai guesses the drawing Ben never saw');
  assert.equal(cai.prompt.kind, 'sketch'); assert.equal(cai.prompt.skippedBefore, true);
  // Ben's future pages skip automatically.
  assert.ok(Object.values(s.submissions).some(sub => sub.by === 2 && sub.skipped));
  s = act(s, 0, 'away', { playerNum: 3, away: true });
  s = act(s, 1, 'away', { playerNum: 4, away: true }); assert.equal(s.replies[1].error, 'not_available');
  s = act(s, 0, 'away', { playerNum: 4, away: true }); assert.equal(s.replies[0].error, 'not_enough_players');
  s = act(s, 2, 'away', { playerNum: 2, away: false }); assert.equal(s.replies[2].error, '');
  s = playAll(s);
  assert.equal(s.phase, 'reveal');
  const amy = s.books[0].pages;
  assert.deepEqual(amy.map(p => [p.kind, !!p.skipped]), [['word', false], ['sketch', false], ['guess', true], ['guess', true], ['guess', false]]);
});

test('the sketch timer: cards submit at the deadline, the host skips stragglers only after the grace period, pause shifts it', () => {
  let s = readyAll(game(4, { sketchSeconds: 45 }));
  const deadline = s.deadline;
  assert.equal(deadline, s.stepStartedAt + 45000);
  s = act(s, 0, 'pause', {}, deadline - 5000);
  s = act(s, 0, 'resume', {}, deadline + 5000);
  assert.equal(s.deadline, deadline + 10000);
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: doodle() }, s.deadline + 1000);
  assert.equal(s.replies[1].error, '', 'late drawings are accepted until the page moves on');
  const before = s.step;
  s = act(s, 0, 'tick', {}, s.deadline + E.AUTO_SKIP_GRACE_MS - 1); assert.equal(s.step, before);
  s = act(s, 0, 'tick', {}, s.deadline + E.AUTO_SKIP_GRACE_MS);
  assert.equal(s.step, before + 1);
  assert.equal(s.books[1].pages[1].skipped, true);
  // Amy's book now needs a guess; the skipped books still need their word drawn, on a fresh timer.
  assert.equal(E.taskKind(s, 0), 'guess'); assert.equal(E.taskKind(s, 1), 'sketch');
  assert.equal(s.deadline, s.stepStartedAt + 45000);
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: 'cat' });
  for (const num of [3, 4, 1]) s = act(s, num, 'submit', { book: E.bookHeldBy(s, num), kind: 'sketch', art: doodle() });
  assert.equal(s.step, before + 2);
  assert.equal(E.taskKind(s, 0), 'sketch'); assert.equal(E.taskKind(s, 1), 'guess');
  s = act(s, 0, 'skip');
  assert.equal(s.step, before + 3);
  // Skipped guesses fall back to the last drawing; the skipped drawing falls back to the guess.
  assert.deepEqual(s.books.map((_, b) => E.taskKind(s, b)), ['sketch', 'guess', 'guess', 'guess']);
  assert.equal(s.deadline, s.stepStartedAt + 45000);
  // A page of only guesses has no timer.
  const guessing = playStep(readyAll(game(4, { sketchSeconds: 45 })));
  assert.ok(guessing.books.every((_, b) => E.taskKind(guessing, b) === 'guess'));
  assert.equal(guessing.deadline, null);
  const untimed = readyAll(game(4, { sketchSeconds: 0 }));
  assert.equal(untimed.deadline, null);
});

test('reveal goes page by page under the owner or host, then friendly scoring awards favourites and a matching last guess', () => {
  let s = playAll(game(4), (task, num) => task.kind === 'sketch' ? { art: doodle(num) } : { text: task.prompt.by === task.owner ? 'The ' + 'x' : 'x' });
  // make Amy's last guess match her word
  const word = s.books[0].pages[0].text;
  s.books[0].pages[4].text = word.toUpperCase() + 's';
  assert.equal(s.phase, 'reveal');
  let v = E.view(s, 0).relay;
  assert.equal(v.reveal.shown, 1); assert.equal(v.reveal.pages.length, 1); assert.equal(v.reveal.pages[0].text, word);
  s = act(s, 2, 'revealNext', { book: 0, shown: 1 }); assert.equal(s.replies[2].error, 'not_available');
  s = act(s, 1, 'revealNext', { book: 0, shown: 1 }); assert.equal(s.reveal.shown, 2);
  s = act(s, 1, 'revealNext', { book: 0, shown: 1 }); assert.equal(s.reveal.shown, 2, 'a double tap does not skip a page');
  s = act(s, 0, 'nextBook', { book: 0 }); assert.equal(s.replies[0].error, 'not_available');
  s = act(s, 0, 'revealNext', { book: 0, shown: 2, all: true });
  v = E.view(s, 1).relay;
  assert.equal(v.reveal.complete, true); assert.equal(v.reveal.pages.length, 5); assert.equal(v.reveal.awards.final, true);
  s = act(s, 1, 'award', { book: 0, field: 'sketch', page: 1 }); assert.equal(s.replies[1].error, 'not_available', 'not your own drawing');
  s = act(s, 1, 'award', { book: 0, field: 'sketch', page: 3 });
  s = act(s, 1, 'award', { book: 0, field: 'guess', page: 2 });
  s = act(s, 1, 'award', { book: 0, field: 'guess', page: 4 });
  assert.equal(s.awards[0].guess, 4);
  for (let b = 0; b < 4; b++) {
    if (s.reveal.book !== b) break;
    if (!s.reveal.complete) s = act(s, 0, 'revealNext', { book: b, shown: s.reveal.shown, all: true });
    s = act(s, 0, 'nextBook', { book: b });
  }
  assert.equal(s.phase, 'finished');
  const rows = E.view(s, 0).relay.scores;
  const by = num => rows.find(r => r.playerNum === num);
  assert.equal(by(1).round, 1, 'Amy: last guess matched her word');
  assert.equal(by(3).round, 1, 'Cai drew the favourite sketch');
  assert.equal(by(4).round, 1, 'Dee wrote the favourite guess');
  assert.deepEqual(E.view(s, 3).relay.me.book.map(p => p.kind), ['word', 'sketch', 'guess', 'sketch', 'guess']);
  s = act(s, 0, 'award', { book: 0, field: 'final', value: false });
  assert.equal(E.view(s, 0).relay.scores.find(r => r.playerNum === 1).round, 0, 'the host can correct a decision afterwards');
});

test('competitive scoring suggests matches, credits guesser and sketcher, and next round keeps totals with new words', () => {
  let s = game(4, { scoring: 'competitive' });
  const words = s.books.map(b => b.card[b.wordIndex]);
  s = playAll(s, (task, num) => task.kind === 'sketch' ? { art: doodle(num) } : { text: num === 2 ? words[0] : `nope ${num} ${task.book}` });
  s = act(s, 0, 'revealNext', { book: 0, shown: 1, all: true });
  const matches = Object.fromEntries(Object.entries(s.awards[0].matches));
  assert.equal(matches[2], true, 'Ben guessed Amy\'s word from her drawing');
  assert.equal(matches[4], false);
  s = act(s, 1, 'award', { book: 0, field: 'match', page: 4, value: true });
  for (let b = 0; b < 4; b++) {
    if (s.phase !== 'reveal') break;
    if (!s.reveal.complete) s = act(s, 0, 'revealNext', { book: b, shown: s.reveal.shown, all: true });
    s = act(s, 0, 'nextBook', { book: b });
  }
  const { points } = E.roundScores(s);
  // Book 0: page 2 (Ben) matched → Ben + Amy (sketcher). Page 4 (Dee) marked → Dee + Cai.
  assert.equal(points[2], 1); assert.equal(points[1], 1); assert.equal(points[4], 1); assert.equal(points[3], 1);
  const totals = { ...s.result.totals };
  const used = new Set(s.books.flatMap(b => b.card));
  s = act(s, 0, 'nextRound');
  assert.equal(s.phase, 'word'); assert.equal(s.round, 2);
  assert.deepEqual(s.totals, totals);
  assert.ok(s.books.flatMap(b => b.card).every(w => !used.has(w)), 'no word card repeats in the next round');
  assert.equal(E.view(s, 0).relay.scores, undefined);
});

test('views never leak the canonical book or other players\' pages during play', () => {
  let s = playStep(readyAll(game(6)));
  const host = JSON.stringify(E.view(s, 0));
  for (const book of s.books) assert.ok(!host.includes(book.pages[0].text) || s.roster.some(p => p.name.includes(book.pages[0].text)));
  assert.ok(!host.includes(s.books[0].pages[1].art));
  const v = E.view(s, 3).relay;
  assert.equal(v.me.task.prompt.kind, 'sketch');
  const seen = JSON.stringify(v);
  const other = s.books.filter((_, b) => b !== v.me.task.book).map(b => b.pages[1].art);
  assert.ok(other.every(art => !seen.includes(art)));
  assert.ok(!seen.includes('"card"'));
  s = act(s, 0, 'stop');
  assert.equal(s.phase, 'stopped');
});

test('loose matching ignores case, articles, plurals and punctuation', () => {
  assert.equal(E.sameWords('The Cats!', 'cat'), true);
  assert.equal(E.sameWords('a hot-air balloon', 'hot air balloon'), true);
  assert.equal(E.sameWords('boxes', 'box'), true);
  assert.equal(E.sameWords('glass', 'glasses'), false);
  assert.equal(E.sameWords('', ''), false);
  assert.equal(E.sameWords('dog', 'cat'), false);
});

test('drawing codec round-trips, rejects malformed input and simplifies long strokes', () => {
  const strokes = [{ color: 3, size: 2, points: [0, 0, 1000, 1000, 500, 250] }, { color: ART.ERASER, size: 3, points: [10, 20] }];
  const encoded = ART.encode(strokes);
  assert.ok(ART.valid(encoded));
  assert.deepEqual(ART.decode(encoded), strokes);
  assert.deepEqual(ART.decode(''), []);
  for (const bad of ['A', 'AAAA', 'z' + 'AAAA', 'BAAAA;', '<svg>', 'BPqPqPqPq', 7, null]) assert.equal(ART.decode(bad), null, String(bad));
  assert.equal(ART.isBlank(''), true);
  assert.equal(ART.isBlank(ART.encode([{ color: ART.ERASER, size: 1, points: [1, 1, 2, 2] }])), true);
  assert.equal(ART.isBlank(encoded), false);
  const line = []; for (let i = 0; i <= 100; i++) line.push(i * 10, 500);
  assert.deepEqual(ART.simplify(line), [0, 500, 1000, 500]);
  // A closed loop keeps its shape instead of collapsing to its start point.
  const loop = [200, 700, 350, 400, 500, 250, 650, 400, 800, 700, 500, 700, 200, 700];
  const kept = ART.simplify(loop);
  assert.ok(kept.length >= 8, String(kept));
  assert.ok(kept.includes(250), 'the top of the triangle survives');
  const svg = ART.svg(encoded, { label: '"><x' });
  assert.ok(svg.startsWith('<svg') && svg.includes('&quot;&gt;&lt;x') && !svg.includes('"><x'));
  assert.equal((svg.match(/<path /g) || []).length, 2);
});

test('word list stays simple, unique and printable', () => {
  const all = WORDS.easy.concat(WORDS.tricky);
  assert.ok(WORDS.easy.length >= 250 && WORDS.tricky.length >= 150);
  assert.equal(new Set(all.map(w => w.toLowerCase())).size, all.length);
  for (const word of all) {
    assert.match(word, /^[a-z][a-z' -]*[a-z]$/, word);
    assert.ok(word.length <= 28, word);
  }
});
