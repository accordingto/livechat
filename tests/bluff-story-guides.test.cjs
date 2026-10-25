'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bluff-king-engine.js');
const bank = require('../bluff-king-topics.js');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(deck = 'classic', mode = 'thinker') {
  const store = E.blankStore(); let seq = 0;
  const options = { now: 1000, rng: () => 0, uuid: () => 'guide-' + ++seq };
  const action = (name, identityId = 'host', extra = {}) => {
    const room = store.rooms.GUIDE;
    return E.applyCommand(store, identityId, { room: 'GUIDE', action: name, commandId: 'guide-command-' + ++seq,
      expectedVersion: room?.version, roundId: room?.round?.id, ...extra }, bank, options);
  };
  action('create', 'host', { name: 'Host', participate: false });
  for (let n = 1; n <= 4; n++) action('join', 'seat-' + n, { name: 'Player ' + n, participate: true });
  action('setDeck', 'host', { deck }); action('setMode', 'host', { mode });
  action('start'); action('confirmTopic');
  return { store, action, get room() { return store.rooms.GUIDE; }, view(identityId, private_ = true) {
    return E.projectView(store, identityId, 'GUIDE', bank, { private: private_, now: 1000 });
  } };
}

test('every real topic has two optional fiction starts, without consulting private answer evidence', () => {
  for (const question of bank) {
    const topic = E.publicQuestion(question), key = 'round:seat', guide = E.storyGuide(topic, key);
    assert.equal(guide.kind, 'fiction'); assert.equal(guide.optional, true);
    assert.equal(guide.topic, topic.term); assert.equal(guide.starts.length, 2); assert.equal(guide.steps.length, 3);
    assert.notDeepEqual(guide.starts[0], guide.starts[1]);
    for (const item of [...guide.starts, ...guide.steps]) {
      assert.ok(item.en.length > 20); assert.ok(item.zh.length > 8);
    }
    const poisoned = { ...topic };
    for (const field of ['secretAnswer', 'supportingFacts', 'revealExplanation', 'sources', 'tags', 'truthfulId', 'roles']) {
      Object.defineProperty(poisoned, field, { get() { throw Error('Private evidence was read: ' + field); } });
    }
    assert.deepEqual(E.storyGuide(poisoned, key), guide);
    assert.deepEqual(E.storyGuide({ ...topic, publicHints: ['changed public category'] }, key), guide, 'starts are story structure, not category-based answer clues');
    for (const secret of [question.secretAnswer, question.revealExplanation, ...question.supportingFacts]) assert.ok(!JSON.stringify(guide).includes(secret));
  }
});

test('fiction starts stay stable on reconnect, vary among seats, and never expose mutable shared data', () => {
  const topic = E.publicQuestion(bank[0]), guide = E.storyGuide(topic, 'round-1:seat-1');
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), guide);
  const variants = new Set(Array.from({ length: 20 }, (_, n) => JSON.stringify(E.storyGuide(topic, 'round-1:seat-' + n).starts)));
  assert.ok(variants.size >= 4);
  const saved = clone(guide); guide.starts[0].en = 'tampered'; guide.steps[0].zh = 'changed';
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), saved);
});

test('only current bluffers receive the optional guide, in both packs and both modes; game rules remain untouched', () => {
  for (const deck of ['classic', 'halloween']) for (const mode of ['thinker', 'vote']) {
    const f = fixture(deck, mode);
    for (const phase of ['prepare', 'discussion']) {
      if (phase === 'discussion') f.action('beginDiscussion');
      const roomBefore = clone(f.room);
      for (let n = 1; n <= 4; n++) {
        const view = f.view('seat-' + n), p = view.privateCard;
        assert.ok(p);
        if (p.role === 'bluffer') {
          assert.equal(p.storyGuide.kind, 'fiction');
          assert.deepEqual(p.storyGuide, E.storyGuide(view.round.topic, f.room.round.id + ':' + p.playerId));
          assert.equal(p.secretAnswer, undefined); assert.equal(p.supportingFacts, undefined);
          assert.deepEqual(f.store.identities['seat-' + n]?.known || {}, {}, 'a story guide never marks the actual truth as known');
        } else assert.equal(p.storyGuide, undefined);
        assert.equal(f.view('seat-' + n, false).privateCard, null, 'the public projection never includes a story guide or role');
      }
      assert.equal(f.view('host').privateCard, null);
      assert.deepEqual(f.room, roomBefore, 'view-only guidance cannot change timing, scoring, deal, Spotlight or room state');
    }
  }
});

test('a bluffer guide remains identical if the true answer and research are edited', () => {
  const f = fixture('halloween', 'vote'), bluffer = f.room.members.find(p => f.room.roster.includes(p.id) && p.id !== f.room.round.truthfulId);
  const before = f.view(bluffer.identityId).privateCard.storyGuide;
  const altered = bank.map(q => q.id === f.room.round.questionId ? { ...q, secretAnswer: 'DIFFERENT PRIVATE ANSWER', supportingFacts: ['DIFFERENT PRIVATE FACT'], revealExplanation: 'DIFFERENT PRIVATE RESEARCH' } : q);
  const after = E.projectView(f.store, bluffer.identityId, 'GUIDE', altered, { private: true, now: 1000 }).privateCard.storyGuide;
  assert.deepEqual(after, before);
});
