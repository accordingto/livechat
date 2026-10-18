'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const V = require('../talk-vnext.js');
const clone = value => structuredClone(value);
const owner = '1'.padStart(64, '0');
let sequence = 0;
function command(s, type, extra = {}) {
  return { id: 'return-send-' + ++sequence, type, actor: 1, sessionId: s.sessionId, turnId: s.turnId, now: 2500, seed: 29, ...extra };
}
function act(s, type, extra = {}) { return E.apply(s, command(s, type, extra)); }
function fixture(returned = true) {
  let s = E.create({ id: 'return-send-round', now: 1000, seconds: 30, gameSeconds: 900,
    topic: { title: 'Our soup shop', question: 'Choose the soup shop rules together.' },
    roster: Array.from({ length: 5 }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })),
    gameMode: 'crazy', conversationMode: 'free', crazyPlayStyle: 'free', crazySource: 'players',
    crazyIdentities: { 1: owner } });
  s = act(s, 'start', { actor: 0, now: 1000 });
  let original = null;
  if (returned) {
    s = act(s, 'crazyAssign', { target: 3, text: 'The soup spoon is your king.', now: 2000 });
    original = clone(s.crazy.prompts[3]);
    s = act(s, 'crazySkip', { actor: 3, promptId: original.id, now: 2200 });
  } else s = act(s, 'crazyLibrarySave', { text: 'The soup spoon is your king.', target: 4, now: 2200 });
  const field = returned ? 'returnedCards' : 'library';
  const card = E.view(s, 1, 2300).talk.crazy[field][0];
  return { s, card, original, type: returned ? 'crazyReturnSend' : 'crazyLibrarySend' };
}
function cards(s) { return Object.values(s.crazy.roundCards); }

test('return send atomically uses current edited text and chosen target, resolves privately, and keeps old executed text immutable', () => {
  const f = fixture(), text = 'Introduce your cup as a tiny king.';
  let s = act(f.s, f.type, { cardId: f.card.id, text: '  ' + text + '  ', target: 4 });
  assert.equal(s.replies[1].error, ''); assert.equal(s.crazy.prompts[4].text, text);
  const own = E.view(s, 1, 2500).talk.crazy;
  assert.deepEqual(own.returnedCards, []);
  assert.deepEqual(own.library, [{ id: f.card.id, text, target: 4, version: 2 }]);
  assert.equal(cards(s).length, 2); assert.equal(cards(s).find(c => c.archiveId === f.original.archiveId).text, f.original.text);
  assert.equal(cards(s).find(c => c.text === text).target, 4);
  assert.ok(!JSON.stringify(E.view(s, 2, 2500)).includes(text));
  assert.equal(V.archiveRecords(s).find(r => r.category === 'vault').status, 'saved');
});

for (const returned of [true, false]) test((returned ? 'return' : 'library') + ' send preserves backward-compatible stored text while random target ignores the saved person', () => {
  const f = fixture(returned), s = act(f.s, f.type, { cardId: f.card.id });
  assert.equal(s.replies[1].error, '');
  const submitted = cards(s).find(card => card.commandId === s.replies[1].id);
  assert.equal(submitted.text, f.card.text); assert.equal(submitted.target, null);
  assert.equal(s.crazyVault[owner][f.card.id].target, null);
  assert.equal(s.crazyVault[owner][f.card.id].returned, undefined);
});

test('ordinary library send saves the current edit and chosen target only after accepting the new submission', () => {
  const f = fixture(false), text = 'Please sing the soup menu.';
  const s = act(f.s, f.type, { cardId: f.card.id, text, target: 5 });
  assert.equal(s.replies[1].error, ''); assert.equal(s.crazy.prompts[5].text, text);
  assert.equal(s.crazyVault[owner][f.card.id].text, text); assert.equal(s.crazyVault[owner][f.card.id].target, 5);
  assert.equal(s.crazyVault[owner][f.card.id].version, f.card.version + 1);
  assert.equal(cards(s).length, 1);
});

for (const returned of [true, false]) test((returned ? 'return' : 'library') + ' send failures retain private text, target, version and unresolved status', () => {
  const cases = [
    { error: 'invalid_prompt', extra: { text: ' '.repeat(3) } },
    { error: 'invalid_prompt', extra: { text: 'x'.repeat(121) } },
    { error: 'invalid_target', extra: { target: 1 } },
    { error: 'invalid_target', extra: { target: 9 } },
    { error: 'not_director', mutate: s => { s.crazy.playStyle = 'director'; s.crazy.directors = [2, 3]; } },
    { error: 'not_available', mutate: s => { s.roster[0].active = false; } },
    { error: 'queue_locked', mutate: s => { s.crazy.queueLocked = true; s.crazy.roundStage = 'decision'; } },
    { error: 'queue_locked', mutate: s => { s.crazy.source = 'system'; } },
    { error: 'queue_full', mutate: s => {
      s.crazy.paused = true;
      for (let n = 0; n < 10; n++) assert.equal(V.submit(s, { id: 'full-' + n, assignedBy: 1, target: 3,
        text: 'A queued soup task ' + n, kind: 'task' }, command(s, 'crazyAssign')), null);
    } }
  ];
  for (const sample of cases) {
    const f = fixture(returned); sample.mutate?.(f.s);
    const before = clone(f.s.crazyVault[owner][f.card.id]), beforeCount = cards(f.s).length;
    const s = act(f.s, f.type, { cardId: f.card.id, text: 'Keep this edit private on failure.', target: 5, ...sample.extra });
    assert.equal(s.replies[1].error, sample.error);
    assert.deepEqual(s.crazyVault[owner][f.card.id], before, sample.error); assert.equal(cards(s).length, beforeCount, sample.error);
  }
});

for (const returned of [true, false]) test((returned ? 'return' : 'library') + ' send is exact-idempotent and an altered payload never overwrites the accepted edit', () => {
  const f = fixture(returned), send = command(f.s, f.type, { cardId: f.card.id, text: 'One exact soup performance.', target: 4 });
  let s = E.apply(f.s, send), count = cards(s).length;
  const saved = clone(s.crazyVault[owner][f.card.id]);
  s = E.apply(clone(s), send);
  assert.equal(cards(s).length, count); assert.deepEqual(s.crazyVault[owner][f.card.id], saved);
  s = E.apply(s, { ...send, text: 'A conflicting invisible overwrite.', target: 5 });
  assert.equal(cards(s).length, count); assert.deepEqual(s.crazyVault[owner][f.card.id], saved);
  // The engine retains recent receipt replay semantics. Once its short seen
  // window advances, the module's longer receipt still binds text and target.
  for (let n = 0; n < 33; n++) s = act(s, 'crazyReceive', { paused: false });
  s = E.apply(s, { ...send, text: 'A conflicting invisible overwrite.', target: 5 });
  assert.equal(s.replies[1].error, 'command_conflict');
  assert.equal(cards(s).length, count); assert.deepEqual(s.crazyVault[owner][f.card.id], saved);
});

test('a stale-session send does not submit or resolve the return, and actor owners may still save without send authority', () => {
  const f = fixture(), send = command(f.s, f.type, { sessionId: 'old-round', cardId: f.card.id, text: 'A stale edit.' });
  assert.equal(E.apply(f.s, send), f.s);
  f.s.crazy.playStyle = 'director'; f.s.crazy.directors = [2, 3];
  const s = act(f.s, 'crazyReturnSave', { cardId: f.card.id, text: 'Save this for another director turn.' });
  assert.equal(s.replies[1].error, ''); assert.equal(cards(s).length, 1);
  assert.equal(s.crazyVault[owner][f.card.id].text, 'Save this for another director turn.');
});
