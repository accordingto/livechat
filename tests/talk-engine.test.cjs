const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const topic = { id: 'test', title: 'Time', emoji: '🌿', question: 'What helps you feel at ease?', followUp: 'What matters to you?' };
let serial = 0;
const create = (count = 4, mode = 'think') => E.create({ id: 'topic-one', topic, mode, now: 1000, seconds: 45,
  roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })) });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, { id: 'event-' + (++serial), sessionId: s.sessionId,
  turnId: s.turnId, seed: serial * 731, now: 2000 + serial, type, actor, ...extra });

test('first readiness gets priority; needing time delays without removing a turn', () => {
  let s = create();
  s = act(s, 'wait', 1); s = act(s, 'ready', 3); s = act(s, 'ready', 2); s = act(s, 'start');
  const actual = [];
  for (let i = 0; i < 4; i++) { actual.push(s.speaker); s = act(s, 'end', s.speaker); }
  assert.deepEqual(actual, [3, 2, 4, 1]);
});

test('2–9 people all get exactly one main turn in each of 30 continuous rounds', () => {
  for (let count = 2; count <= 9; count++) {
    let s = act(create(count), 'start');
    for (let round = 1; round <= 30; round++) {
      const speakers = [];
      for (let i = 0; i < count; i++) {
        assert.equal(s.round, round); speakers.push(s.speaker);
        // Listeners can queue thoughts in any order without starving anyone.
        for (const p of E.shuffle(s.roster.map(p => p.playerNum), serial)) if (p !== s.speaker) s = act(s, 'share', p);
        s = act(s, 'end', s.speaker);
      }
      assert.equal(new Set(speakers).size, count);
      assert.deepEqual(speakers.slice().sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i + 1));
    }
  }
});

test('a spoken participant waits until next round; an unspoken one can go next', () => {
  let s = act(create(), 'start');
  const first = s.speaker; s = act(s, 'end', first); s = act(s, 'share', first);
  assert.equal(E.view(s, first, 0).talk.intentRound, 2);
  const next = E.order(s).at(-1); s = act(s, 'share', next);
  s = act(s, 'end', s.speaker); assert.equal(s.speaker, next);
  while (s.round === 1) { assert.notEqual(s.speaker, first); s = act(s, 'end', s.speaker); }
  assert.equal(s.speaker, first);
  assert.equal(E.view(s, first, 0).talk.intentRound, null);
});

test('spoken question is invited by the speaker, deferred, and returns without consuming a main turn', () => {
  let s = act(create(), 'start'); const speaker = s.speaker, asker = E.order(s)[0];
  const remaining = s.remaining.slice();
  s = act(s, 'ask', asker); const request = s.questions[0].id;
  s = act(s, 'invite', asker, { target: request }); assert.equal(s.activeQuestion, null);
  s = act(s, 'later', speaker, { target: request }); assert.equal(s.questions[0].deferred, true);
  s = act(s, 'invite', speaker, { target: request }); assert.equal(s.activeQuestion.playerNum, asker);
  s = act(s, 'end', speaker); assert.equal(s.speaker, speaker); assert.equal(s.replies[speaker].error, 'question_open');
  s = act(s, 'resume', asker);
  assert.equal(s.speaker, speaker); assert.deepEqual(s.remaining, remaining); assert.deepEqual(s.spoken, []);
  assert.equal(s.questions.length, 0);
});

test('pending question is not silently lost; a deliberate handover can close it', () => {
  let s = act(create(), 'start'); const speaker = s.speaker;
  s = act(s, 'ask', E.order(s)[0]); s = act(s, 'end', speaker);
  assert.equal(s.speaker, speaker); assert.equal(s.replies[speaker].error, 'pending_questions');
  s = act(s, 'end', speaker, { confirm: true }); assert.notEqual(s.speaker, speaker); assert.equal(s.questions.length, 0);
});

test('duplicate, old-session, and old-turn requests cannot advance or affect a new speaker', () => {
  let s = act(create(), 'start'); const oldTurn = s.turnId, speaker = s.speaker;
  const cmd = { id: 'same-end', type: 'end', actor: speaker, sessionId: s.sessionId, turnId: s.turnId, seed: 51 };
  s = E.apply(s, cmd); const once = JSON.stringify(s);
  assert.equal(JSON.stringify(E.apply(s, cmd)), once);
  s = act(s, 'ask', speaker, { turnId: oldTurn }); assert.equal(s.questions.length, 0);
  assert.equal(s.replies[speaker].error, 'stale_turn');
  assert.equal(E.apply(s, { ...cmd, id: 'old-topic', sessionId: 'previous' }), s);
  assert.equal(E.apply(s, { ...cmd, actor: 88, id: 'not-a-member' }), s);
});

test('notes are optional and shared only on explicit submission in the writing mode', () => {
  let s = create(4, 'write'); assert.deepEqual(E.view(s, 1, 0).talk.notes, []);
  s = act(s, 'note', 1, { text: 'I like quiet time.' });
  assert.equal(E.view(s, 2, 0).talk.notes[0].text, 'I like quiet time.');
  s = act(s, 'note', 1, { text: '' }); assert.equal(E.view(s, 2, 0).talk.notes.length, 0);
  const noWriting = act(create(), 'note', 1, { text: 'Not this mode' }); assert.equal(Object.keys(noWriting.notes).length, 0);
});

test('interest is transient, has no cumulative count, and never changes the floor', () => {
  let s = act(create(), 'start'), speaker = s.speaker, listener = E.order(s)[0];
  s = act(s, 'more', listener, { now: 5000 }); s = act(s, 'more', listener, { now: 5001 });
  assert.equal(E.view(s, listener, 5002).talk.interests.length, 1);
  assert.equal(E.view(s, listener, 11002).talk.interests.length, 0);
  assert.equal(s.speaker, speaker);
  assert.equal('readiness' in E.view(s, listener, 5002).talk, true);
  assert.equal('remaining' in E.view(s, listener, 5002).talk, false);
  assert.equal('seen' in E.view(s, listener, 5002).talk, false);
});

test('Firebase omission of empty containers still allows starting, questions, and round changes', () => {
  function wire(value) {
    if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
    if (!entries.length) return null;
    return Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries);
  }
  let s = wire(create());
  s = act(s, 'start'); const asker = E.order(s)[0];
  s = act(wire(s), 'ask', asker); s = act(wire(s), 'cancelAsk', asker);
  for (let i = 0; i < 8; i++) s = act(wire(s), 'end', s.speaker);
  assert.equal(s.round, 3);
  assert.equal(E.order(s).length, 3);
});
