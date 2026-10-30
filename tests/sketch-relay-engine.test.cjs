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
  for (const art of ['', ART.encode([{ color: ART.ERASER, size: 1, points: [10, 10, 20, 20] }])]) {
    s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art }); assert.equal(s.replies[1].error, 'invalid_sketch');
  }
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: '', turnId: turn - 1 }); assert.equal(s.replies[1].error, 'stale_turn');
  const first = { id: id(), type: 'submit', actor: 1, sessionId: s.sessionId, turnId: turn, now: s.lastChangeAt + 5, seed: 1, book: 0, kind: 'sketch', art: doodle() };
  s = E.apply(s, first); assert.equal(s.replies[1].error, '');
  const again = E.apply(s, { ...first, art: '' }); assert.equal(again, s, 'duplicate command ids are ignored');
  // Handing in a page is final even while the other players are still working.
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: '' });
  assert.equal(s.replies[1].error, 'already_submitted');
  assert.equal(s.submissions[0].art, first.art);
  s = playStep(s);
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: '   ' }); assert.equal(s.replies[2].error, 'invalid_guess');
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: 'a'.repeat(41) }); assert.equal(s.replies[2].error, 'invalid_guess');
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: '  big   <red> dog ' });
  assert.equal(s.submissions[0].text, 'big red dog');
  assert.equal(E.view(s, 2).relay.me.task.submitted.text, 'big red dog');
  assert.equal(E.view(s, 0).relay.roster[1].status, 'done');
  s = act(s, 2, 'submit', { book: 0, kind: 'guess', text: 'replacement' });
  assert.equal(s.replies[2].error, 'already_submitted'); assert.equal(s.submissions[0].text, 'big red dog');
});

test('drawing drafts are private, replaceable until the deadline, and never count as a finished page', () => {
  let s = readyAll(game(4));
  const drawing = doodle(123), second = doodle(321);
  s = act(s, 2, 'draft', { book: 0, kind: 'sketch', art: drawing }); assert.equal(s.replies[2].error, 'not_available');
  s = act(s, 1, 'draft', { book: 0, kind: 'guess', art: drawing }); assert.equal(s.replies[1].error, 'not_available');
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: '<bad>' }); assert.equal(s.replies[1].error, 'invalid_sketch');
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: drawing });
  assert.equal(s.replies[1].error, ''); assert.equal(s.step, 0);
  assert.equal(E.view(s, 0).relay.progress.done, 0);
  assert.deepEqual(E.view(s, 1).relay.me.task.draft, { art: drawing });
  for (const actor of [0, 2, 3, 4]) assert.ok(!JSON.stringify(E.view(s, actor)).includes(drawing));
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: second });
  assert.equal(s.drafts[0].art, second);
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: '' });
  assert.equal(s.drafts[0].art, '', 'clearing the canvas also clears its saved draft');
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: drawing }, s.deadline - 1);
  const deadline = s.deadline;
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: second }, deadline);
  assert.equal(s.replies[1].error, 'deadline_passed'); assert.equal(s.drafts[0].art, drawing);
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art: drawing }, deadline + 1);
  assert.equal(s.replies[1].error, '', 'the final in-flight submission has a delivery grace window');
  assert.equal(s.drafts[0], undefined); assert.equal(E.view(s, 1).relay.me.task.draft, undefined);
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: second }, deadline + 2);
  assert.equal(s.replies[1].error, 'already_submitted'); assert.equal(s.submissions[0].art, drawing);
});

test('the host can hand in saved drawings without any player tab running its timer', () => {
  let s = readyAll(game(4));
  const drawing = doodle(222), erased = ART.encode([{ color: ART.ERASER, size: 1, points: [2, 2, 3, 3] }]);
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: drawing });
  const savedAt = s.drafts[0].at;
  s = act(s, 2, 'draft', { book: 1, kind: 'sketch', art: erased });
  s = act(s, 3, 'draft', { book: 2, kind: 'sketch', art: doodle(333) });
  s = act(s, 3, 'draft', { book: 2, kind: 'sketch', art: '' });
  const expired = s.deadline + E.AUTO_SKIP_GRACE_MS;
  s = act(s, 4, 'submit', { book: 3, kind: 'sketch', art: doodle(444) }, expired);
  assert.equal(s.replies[4].error, 'deadline_passed'); assert.equal(s.submissions[3], undefined);
  s = act(s, 0, 'tick', {}, expired);
  assert.equal(s.step, 1);
  assert.deepEqual(s.books[0].pages[1], { kind: 'sketch', by: 1, art: drawing, at: savedAt });
  for (const b of [1, 2, 3]) assert.equal(s.books[b].pages[1].skipped, true);
  assert.deepEqual(s.drafts, {}, 'a new holder never inherits another player\'s unfinished work');
  assert.equal(E.view(s, 2).relay.me.task.prompt.art, drawing);
});

test('a final blank draft can clear saved ink during delivery grace without allowing extra drawing time', () => {
  let s = readyAll(game(4));
  const saved = doodle(555), erased = ART.encode([{ color: ART.ERASER, size: 2, points: [10, 10, 20, 20] }]);
  for (const actor of [1, 2, 3]) s = act(s, actor, 'draft', { book: actor - 1, kind: 'sketch', art: saved });
  const oldTurn = s.turnId, deadline = s.deadline, expired = deadline + E.AUTO_SKIP_GRACE_MS;
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: '' }, deadline);
  assert.equal(s.replies[1].error, ''); assert.equal(s.drafts[0].art, '');
  s = act(s, 2, 'draft', { book: 1, kind: 'sketch', art: erased }, expired - 1);
  assert.equal(s.replies[2].error, ''); assert.equal(s.drafts[1].art, erased);
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: doodle(777) }, expired - 1);
  assert.equal(s.replies[1].error, 'deadline_passed'); assert.equal(s.drafts[0].art, '', 'late ink cannot replace the final clear');
  s = act(s, 3, 'draft', { book: 2, kind: 'sketch', art: '' }, expired);
  assert.equal(s.replies[3].error, 'deadline_passed'); assert.equal(s.drafts[2].art, saved, 'grace has a firm end even for clear requests');
  s = act(s, 0, 'tick', {}, expired);
  assert.equal(s.step, 1);
  for (const b of [0, 1, 3]) assert.equal(s.books[b].pages[1].skipped, true);
  assert.equal(s.books[2].pages[1].art, saved);
  s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: '', turnId: oldTurn }, expired + 1);
  assert.equal(s.replies[1].error, 'stale_turn'); assert.deepEqual(s.drafts, {}, 'an old clear cannot affect the next holder');
});

test('pause freezes player commands and passage, then resume preserves the remaining drawing time', () => {
  let s = game(4);
  s = act(s, 0, 'pause');
  for (const type of ['ready', 'swapWord']) { s = act(s, 1, type); assert.equal(s.replies[1].error, 'paused'); }
  s = act(s, 0, 'start'); assert.equal(s.replies[0].error, 'paused');
  assert.equal(s.phase, 'word'); assert.deepEqual(s.ready, {});
  s = act(s, 0, 'resume'); s = readyAll(s);
  s = playStep(s); s = playStep(s); // another drawing page
  const deadline = s.deadline, step = s.step;
  for (const actor of [1, 2]) s = act(s, actor, 'submit', { book: E.bookHeldBy(s, actor), kind: 'sketch', art: doodle(actor) });
  const pauseAt = s.lastChangeAt + 10;
  s = act(s, 0, 'pause', {}, pauseAt);
  assert.equal(E.view(s, 1, pauseAt + 99999).relay.pausedRemainingMs, deadline - pauseAt);
  for (const type of ['draft', 'submit']) {
    s = act(s, 3, type, { book: E.bookHeldBy(s, 3), kind: 'sketch', art: doodle(3) }, pauseAt + 1000);
    assert.equal(s.replies[3].error, 'paused');
  }
  s = act(s, 0, 'skip', {}, pauseAt + 1001); assert.equal(s.replies[0].error, 'paused');
  s = act(s, 0, 'tick', {}, deadline + E.AUTO_SKIP_GRACE_MS + 1000); assert.equal(s.step, step);
  s = act(s, 0, 'away', { playerNum: 3, away: true });
  s = act(s, 0, 'away', { playerNum: 4, away: true });
  assert.equal(s.step, step, 'presence changes cannot pass every book while paused');
  const resumeAt = s.lastChangeAt + 10;
  s = act(s, 0, 'resume', {}, resumeAt);
  assert.equal(s.step, step + 1, 'the already complete page moves on only after resume');
  const first = readyAll(game(4));
  let clock = act(first, 0, 'pause', {}, first.stepStartedAt + 1000);
  clock = act(clock, 0, 'resume', {}, first.stepStartedAt + 6000);
  assert.equal(clock.deadline, first.deadline + 5000);
});

test('host commands are deduplicated and a stale tick cannot expire a newer page', () => {
  let s = readyAll(game(4));
  const skip = { id: id(), type: 'skip', actor: 0, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 10 };
  s = E.apply(s, skip); assert.equal(s.step, 1);
  assert.equal(E.apply(s, { ...skip, turnId: s.turnId, now: s.lastChangeAt + 10 }), s, 're-delivered host skip does not skip two pages');
  const olderTurn = s.turnId;
  s = playStep(s); s = playStep(s); assert.equal(s.step, 3);
  const deadline = s.deadline;
  s = act(s, 0, 'tick', { turnId: olderTurn }, deadline + E.AUTO_SKIP_GRACE_MS);
  assert.equal(s.replies[0].error, 'stale_turn'); assert.equal(s.step, 3); assert.deepEqual(s.submissions, {});
  s = act(s, 0, 'tick', {}, deadline + E.AUTO_SKIP_GRACE_MS);
  assert.equal(s.step, 4); assert.equal(s.phase, 'reveal');
});

test('each seat gets a bounded private acknowledgment history for batched commands from multiple tabs', () => {
  let s = readyAll(game(4));
  const first = { id: id(), type: 'draft', actor: 1, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 10, book: 0, kind: 'sketch', art: doodle() };
  const second = { ...first, id: id(), type: 'submit', now: first.now + 1 };
  const third = { ...second, id: id(), text: 'wrong tab', kind: 'guess', now: second.now + 1 };
  for (const command of [first, second, third]) s = E.apply(s, command);
  const own = E.view(s, 1).relay;
  assert.equal(own.reply.id, third.id, 'a batch still has only one latest reply');
  assert.deepEqual(own.receipts.slice(-3), [{ id: first.id, error: '' }, { id: second.id, error: '' }, { id: third.id, error: 'already_submitted' }]);
  for (const actor of [0, 2, 3, 4]) {
    const other = JSON.stringify(E.view(s, actor));
    for (const command of [first, second, third]) assert.ok(!other.includes(command.id));
  }
  assert.equal(E.view(s, 0).relay.receipts, undefined);
  for (let i = 0; i < 35; i++) s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: doodle() });
  assert.ok(E.view(s, 1).relay.receipts.some(r => r.id === first.id), 'receipts live as long as their deduplication IDs');
  assert.equal(E.apply(s, first), s, 'a retained receipt makes retries a no-op');
  for (let i = 0; i < 5; i++) s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: doodle() });
  assert.equal(E.view(s, 1).relay.receipts.length, 40);
  assert.ok(!E.view(s, 1).relay.receipts.some(r => r.id === first.id));
  assert.equal(s.seen[1].includes(first.id), false, 'receipt and deduplication eviction stay aligned');
});

test('a seen command with a missing legacy receipt is acknowledged without re-executing', () => {
  let s = readyAll(game(4));
  const first = { id: id(), type: 'draft', actor: 1, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 10, book: 0, kind: 'sketch', art: doodle(111) };
  s = E.apply(s, first);
  for (let i = 0; i < 15; i++) s = act(s, 1, 'draft', { book: 0, kind: 'sketch', art: doodle(222) });
  s.receipts[1] = s.receipts[1].slice(-12);
  const seenCount = s.seen[1].length, currentDraft = { ...s.drafts[0] };
  assert.equal(s.seen[1].includes(first.id), true);
  s = E.apply(s, { ...first, now: s.lastChangeAt + 1 });
  assert.deepEqual(s.drafts[0], currentDraft, 'the old drawing cannot replace newer work');
  assert.equal(s.seen[1].length, seenCount, 'restoring a receipt does not duplicate its seen ID');
  assert.deepEqual(E.view(s, 1).relay.receipts.at(-1), { id: first.id, error: 'stale_turn' });
  assert.equal(E.apply(s, first), s, 'the restored acknowledgment also deduplicates retries');
  const latest = { id: id(), type: 'draft', actor: 1, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 1, book: 0, kind: 'sketch', art: doodle(333) };
  s = E.apply(s, latest); delete s.receipts[1];
  s = E.apply(s, { ...latest, art: doodle(444) });
  assert.equal(s.drafts[0].art, latest.art, 'a missing receipt still cannot re-run a command with a changed payload');
  assert.deepEqual(E.view(s, 1).relay.receipts.at(-1), { id: latest.id, error: '' }, 'the original latest reply outcome is preserved when available');
});

test('a book ending with a drawing never scores an older matching guess as its final answer', () => {
  let s = readyAll(game(4));
  const originals = s.books.map(b => b.pages[0].text);
  for (let turn = 0; turn < 3; turn++) s = playStep(s, (task, num) => task.kind === 'sketch' ? { art: doodle(num) } : { text: originals[task.book] });
  s = act(s, 0, 'away', { playerNum: 4, away: true });
  s = playStep(s, task => ({ text: originals[task.book] }));
  assert.equal(s.phase, 'reveal');
  assert.equal(s.books[0].pages[4].skipped, true);
  assert.equal(E.finalGuess(s.books[0].pages), -1);
  assert.equal(E.finalGuess(s.books[1].pages), 4);
  s = act(s, 0, 'revealNext', { book: 0, shown: 1, all: true });
  assert.equal(s.awards[0].final, false);
  s = act(s, 1, 'award', { book: 0, field: 'final', value: true });
  assert.equal(s.replies[1].error, 'not_available'); assert.equal(E.roundScores(s).points[1], 0);
  const trailingSkipAfterGuess = [{ kind: 'word', text: 'cat' }, { kind: 'sketch' }, { kind: 'guess', text: 'cat' }, { kind: 'sketch', skipped: true }];
  assert.equal(E.finalGuess(trailingSkipAfterGuess), 2, 'skipped pages do not hide a real final guess');
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
  const ink = { color: 0, size: 1, points: [10, 20, 100, 200, 300, 100] };
  const eraser = { ...ink, color: ART.ERASER, size: 2 };
  assert.equal(ART.isBlank(ART.encode([ink, eraser])), true, 'fully erased ink cannot be handed in as a blank drawing');
  assert.equal(ART.isBlank(ART.encode([eraser, ink])), false, 'new ink after erasing is still visible');
  assert.equal(ART.isBlank(ART.encode([ink, { ...eraser, size: 0 }])), false, 'a narrow eraser leaves ink visible');
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

test('empty or sitting-out seats are left out of the circle, so every book still ends with a guess', () => {
  for (const [n, away] of [[6, [6]], [5, [5]], [9, [7, 8, 9]], [8, [8]], [9, [2, 5]]]) {
    let s = game(n);
    for (const num of away) s = act(s, 0, 'away', { playerNum: num, away: true });
    s = readyAll(s);
    assert.equal(s.phase, 'play', `${n} seats, away ${away}`);
    const playing = n - away.length;
    assert.deepEqual(s.circle, roster(n).map(p => p.playerNum).filter(num => !away.includes(num)));
    assert.equal(s.books.length, playing, 'only players in the circle own a sketchbook');
    assert.equal(s.offset, playing % 2); assert.equal(s.steps, playing - playing % 2);
    // Absent seats get no task; the next real player is who you pass to.
    for (const num of away) {
      const me = E.view(s, num).relay.me;
      assert.equal(me.task, undefined); assert.equal(me.away, true);
      assert.equal(E.view(s, 0).relay.roster.find(p => p.playerNum === num).status, 'away');
    }
    const first = s.circle[0], second = s.circle[1];
    assert.equal(E.view(s, first).relay.me.task.passTo, second);
    assert.equal(E.view(s, s.circle[s.circle.length - 1]).relay.me.task.passTo, first);
    const odd = playing % 2 === 1;
    assert.equal(E.view(s, first).relay.me.task.own, !odd, odd ? 'odd circle passes the word first' : 'even circle draws its own word');
    s = playAll(s);
    assert.equal(s.phase, 'reveal');
    for (const book of s.books) {
      assert.ok(book.pages.every(p => !p.skipped), 'no skipped pages from empty seats');
      assert.equal(book.pages.length, 1 + s.steps);
      assert.equal(book.pages.at(-1).kind, 'guess', 'every book comes home with a guess');
      assert.ok(book.pages.slice(1).every(p => p.by !== book.owner || !odd), 'odd circles never let owners draw their own word');
    }
  }
});

test('someone who comes back after drawing starts waits for the next round, then plays', () => {
  let s = game(6);
  s = act(s, 0, 'away', { playerNum: 6, away: true });
  s = readyAll(s);
  assert.equal(s.books.length, 5);
  s = act(s, 6, 'away', { playerNum: 6, away: false });
  assert.equal(s.replies[6].error, '');
  const me = E.view(s, 6).relay;
  assert.equal(me.me.nextRound, true); assert.equal(me.me.task, undefined);
  assert.equal(me.roster.find(p => p.playerNum === 6).status, 'nextRound');
  assert.deepEqual(me.circle, [1, 2, 3, 4, 5]);
  // Nobody ever waits for the returning player during this round.
  s = playAll(s);
  assert.equal(s.phase, 'reveal');
  assert.ok(s.books.every(b => b.owner !== 6 && b.pages.every(p => p.by !== 6)));
  for (let b = 0; b < s.books.length; b++) {
    if (!s.reveal.complete) s = act(s, 0, 'revealNext', { book: b, shown: s.reveal.shown, all: true });
    s = act(s, 0, 'nextBook', { book: b });
  }
  assert.equal(s.phase, 'finished');
  assert.ok(Object.hasOwn(s.result.totals, 6));
  s = act(s, 0, 'nextRound');
  assert.equal(s.circle, null); assert.equal(s.books.length, 6);
  s = readyAll(s);
  assert.deepEqual(s.circle, [1, 2, 3, 4, 5, 6]);
  assert.equal(s.offset, 0); assert.equal(s.steps, 6);
});

test('a circle member cannot leave fewer than two players drawing and passing', () => {
  let s = game(4);
  s = act(s, 0, 'away', { playerNum: 4, away: true });
  s = readyAll(s);
  assert.equal(s.steps, 2, 'a circle of three passes the word first and has two pages');
  s = act(s, 4, 'away', { playerNum: 4, away: false }); // back, but waits for next round
  s = act(s, 0, 'away', { playerNum: 3, away: true });
  assert.equal(s.replies[0].error, '');
  s = act(s, 0, 'away', { playerNum: 2, away: true });
  assert.equal(s.replies[0].error, 'not_enough_players', 'only two circle players are left');
});

test('games saved before the circle existed keep passing around every seat', () => {
  let s = readyAll(game(5));
  delete s.circle; // legacy save: steps/offset from the full roster, no circle
  s.books.forEach(b => { assert.ok(b.pages.length === 1); });
  assert.equal(E.holderOf(s, 0), 2); assert.equal(E.bookHeldBy(s, 1), 4);
  s = playAll(s);
  assert.equal(s.phase, 'reveal');
  assert.ok(s.books.every(b => b.pages.at(-1).kind === 'guess'));
});

test('competitive matching also accepts a guess that names the secret word', () => {
  let s = game(4, { scoring: 'competitive' });
  const words = s.books.map(b => b.card[b.wordIndex]);
  // Ben guesses something else; Dee, later in Amy's book, names Amy's secret word.
  s = playAll(s, (task, num) => task.kind === 'sketch' ? { art: doodle(num) } : { text: num === 4 && task.book === 0 ? words[0] : `nope ${num} ${task.book}` });
  s = act(s, 0, 'revealNext', { book: 0, shown: 1, all: true });
  assert.equal(s.awards[0].matches[2], false);
  assert.equal(s.awards[0].matches[4], true, 'a guess equal to the secret word is suggested as a match');
  assert.equal(s.awards[0].final, true);
});
