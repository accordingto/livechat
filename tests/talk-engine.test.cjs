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

test('host can handle an absent speaker or asker without spending anyone else’s main turn', () => {
  let s = act(create(), 'start');
  const first = s.speaker, asker = E.order(s)[0], listener = E.order(s)[1];
  s = act(s, 'end', listener); assert.equal(s.speaker, first);
  assert.equal(s.replies[listener].error, 'not_available');
  s = act(s, 'ask', asker);
  s = act(s, 'end'); assert.equal(s.replies[0].error, 'pending_questions');
  s = act(s, 'invite', first, { target: s.questions[0].id });
  const remaining = s.remaining.slice();
  s = act(s, 'resume');
  assert.equal(s.activeQuestion, null); assert.equal(s.speaker, first);
  assert.deepEqual(s.remaining, remaining); assert.deepEqual(s.spoken, []);
  const endedTurn = s.turnId;
  s = act(s, 'end');
  assert.deepEqual(s.spoken, [first]); assert.notEqual(s.speaker, first);
  const next = s.speaker;
  s = act(s, 'end', first, { turnId: endedTurn }); assert.equal(s.speaker, next);
  const seen = [first];
  while (s.round === 1) { seen.push(s.speaker); s = act(s, 'end'); }
  assert.deepEqual(seen.slice().sort(), [1, 2, 3, 4]);
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

test('starter toggle is host-only and preserves thinking time, turns and an active question', () => {
  let s = create(); assert.equal(E.view(s, 1, 0).talk.showStarters, true);
  s.topic.starter = 'Feeling at ease means being comfortable enough to speak honestly.';
  const explanation = s.topic.starter;
  const deadline = s.deadline;
  s = act(s, 'starters', 0, {show:false});
  assert.equal(s.deadline, deadline); assert.equal(s.phase, 'thinking');
  s = act(s, 'starters', 1, {show:true}); assert.equal(s.showStarters, false);
  assert.equal(s.replies[1].error, 'not_available');
  s = act(s, 'start'); s = act(s, 'ask', E.order(s)[0]);
  s = act(s, 'invite', s.speaker, {target:s.questions[0].id});
  const before = JSON.stringify([s.speaker, s.turnId, s.round, s.remaining, s.spoken, s.questions, s.activeQuestion]);
  s = act(s, 'starters', 0, {show:true});
  assert.equal(JSON.stringify([s.speaker, s.turnId, s.round, s.remaining, s.spoken, s.questions, s.activeQuestion]), before);
  assert.equal(E.view(s, 2, 0).talk.showStarters, true);
  assert.equal(E.view(s, 2, 0).talk.starter, explanation);
  s = act(s, 'extend', 0, {text:'A different follow-up?'});
  assert.equal(E.view(s, 2, 0).talk.starter, explanation);
  s = act(s, 'starters', 0, {show:'false'}); assert.equal(s.showStarters, true);
  assert.equal(s.replies[0].error, 'not_available');
  delete s.showStarters;
  assert.equal(E.view(s, 2, 0).talk.showStarters, false);
});

test('host can refresh the explanation in an existing topic without changing the conversation', () => {
  let s = act(create(4, 'write'), 'note', 1, {text:'Keep my note'});
  s = act(s, 'start'); s = act(s, 'ask', E.order(s)[0]);
  s = act(s, 'invite', s.speaker, {target:s.questions[0].id});
  s = act(s, 'starters', 0, {show:false});
  const unchanged = state => JSON.stringify([state.sessionId,state.topic.question,state.topic.followUp,state.deadline,state.speaker,state.round,state.turnId,state.remaining,state.spoken,state.notes,state.questions,state.activeQuestion,state.showStarters]);
  const before = unchanged(s), text = 'This question asks what makes speaking honestly feel comfortable.';
  s = act(s, 'explain', 1, {text}); assert.equal(s.replies[1].error, 'not_available');
  assert.equal(s.topic.starter, undefined);
  s = act(s, 'explain', 0, {text}); assert.equal(E.view(s,2,0).talk.starter, text);
  assert.equal(unchanged(s), before);
  for (const invalid of ['', ' ', 'x'.repeat(601), false]) {
    s = act(s, 'explain', 0, {text:invalid}); assert.equal(s.replies[0].error, 'invalid_topic');
    assert.equal(s.topic.starter, text);
  }
  const old = act(s, 'explain', 0, {text:'Old description',sessionId:'older-topic'});
  assert.equal(old, s);
});


test('shared players can confirm a fresh topic with settings while legacy and stale requests cannot', () => {
  const options = { topic: { ...topic, question: 'What would make a quiet street fun?', controlToken: 'never-project-this', followUps: ['Why?'] },
    mode: 'write', seconds: 30, showStarters: false, gameMode: 'crazy', crazySeconds: 60, confirm: true };
  let legacy = act(create(), 'newTopic', 2, options);
  assert.equal(legacy.sessionId, 'topic-one'); assert.equal(legacy.replies[2].error, 'not_available');
  let s = { ...act(create(), 'start'), sharedControls: true };
  s = act(s, 'ask', E.order(s)[0]); const oldSession = s.sessionId, oldTurn = s.turnId;
  const pending = act(s, 'newTopic', 2, { ...options, confirm: false });
  assert.equal(pending.sessionId, oldSession); assert.equal(pending.questions.length, 1); assert.equal(pending.replies[2].error, 'confirmation_required');
  const stale = act(s, 'newTopic', 2, { ...options, turnId: oldTurn - 1 });
  assert.equal(stale.sessionId, oldSession); assert.equal(stale.replies[2].error, 'stale_turn');
  s = act(s, 'newTopic', 2, options);
  assert.notEqual(s.sessionId, oldSession); assert.equal(s.sharedControls, true); assert.equal(s.phase, 'thinking');
  assert.equal(s.mode, 'write'); assert.equal(s.seconds, 30); assert.equal(s.gameMode, 'crazy'); assert.equal(s.crazy.intervalSeconds, 60);
  assert.deepEqual(s.questions, []); assert.deepEqual(s.notes, {}); assert.equal(s.showStarters, false);
  assert.equal(s.deadline - (2000 + serial), 30000);
  assert.equal(s.topic.controlToken, undefined); assert.deepEqual(s.roster.map(p => p.playerNum), [1, 2, 3, 4]);
  const saved = JSON.stringify(s);
  assert.equal(E.apply(s, { id: 'old-turn', type: 'end', actor: 2, sessionId: oldSession, turnId: oldTurn }), s);
  assert.equal(JSON.stringify(E.apply(s, { id: s.replies[2].id, type: 'newTopic', actor: 2, sessionId: s.sessionId, turnId: s.turnId, ...options })), saved);
  assert.equal(E.view(s, 2, 0).talk.actions.newTopic, true); assert.equal(E.view(s, 0, 0).talk.hostControls, false);
  assert.doesNotMatch(JSON.stringify(E.view(s, 2, 0)), /never-project-this|controlToken|nextAt|recent/);
});

test('new topics reject malformed text and settings without clearing the existing conversation', () => {
  const base = { ...create(), sharedControls: true };
  const options = { topic, mode: 'think', seconds: 45, gameMode: 'normal', crazySeconds: 120, showStarters: true, confirm: true };
  for (const extra of [{ seconds: 14 }, { seconds: 121 }, { seconds: 30.5 }, { mode: 'other' }, { crazySeconds: 90 }, { showStarters: 'true' },
    { topic: { ...topic, question: '' } }, { topic: { ...topic, title: 'x'.repeat(81) } }, { topic: { ...topic, followUps: Array(9).fill('Why?') } }]) {
    const s = act(base, 'newTopic', 1, { ...options, ...extra });
    assert.equal(s.sessionId, base.sessionId); assert.equal(s.deadline, base.deadline); assert.deepEqual(s.topic, base.topic);
    assert.ok(['invalid_topic', 'invalid_settings'].includes(s.replies[1].error));
  }
  const thinking = act(base, 'newTopic', 1, options);
  assert.notEqual(thinking.sessionId, base.sessionId); assert.equal(thinking.phase, 'thinking');
});
