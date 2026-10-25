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

test('every real topic has two short sayable fictional explanations, without private answer evidence or extra steps', () => {
  for (const question of bank) {
    const topic = E.publicQuestion(question), key = 'round:seat', guide = E.storyGuide(topic, key);
    assert.equal(guide.kind, 'fiction'); assert.equal(guide.optional, true);
    assert.equal(guide.version, 2); assert.equal(guide.format, 'sayable');
    assert.equal(guide.topic, topic.term); assert.equal(guide.starts.length, 2); assert.deepEqual(guide.steps, []);
    assert.notDeepEqual(guide.starts[0], guide.starts[1]);
    for (const item of guide.starts) {
      assert.ok(item.en.length > 20); assert.ok(item.zh.length > 8);
      assert.ok(item.en.split(/\s+/).length <= 24, 'one short sentence in simple English');
      assert.ok(item.zh.length <= 55, 'one direct Chinese explanation');
      assert.match(item.en, /\.$/); assert.match(item.zh, /。$/);
      assert.doesNotMatch(item.en, /\b(?:invent|choose|pick|imagine|decide|add|start by)\b/i, 'a proposed explanation, not instructions to invent one');
    }
    const poisoned = { ...topic };
    for (const field of ['secretAnswer', 'supportingFacts', 'revealExplanation', 'sources', 'tags', 'truthfulId', 'roles']) {
      Object.defineProperty(poisoned, field, { get() { throw Error('Private evidence was read: ' + field); } });
    }
    assert.deepEqual(E.storyGuide(poisoned, key), guide);
    assert.deepEqual(E.storyGuide({ ...topic, publicHints: topic.publicHints.slice().reverse() }, key), guide, 'public choice ordering does not indicate which category is true');
    for (const secret of [question.secretAnswer, question.revealExplanation, ...question.supportingFacts]) assert.ok(!JSON.stringify(guide).includes(secret));
  }
});

test('fiction starts stay stable on reconnect, vary among seats, and never expose mutable shared data', () => {
  const topic = E.publicQuestion(bank[0]), guide = E.storyGuide(topic, 'round-1:seat-1');
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), guide);
  const variants = new Set(Array.from({ length: 20 }, (_, n) => JSON.stringify(E.storyGuide(topic, 'round-1:seat-' + n).starts)));
  assert.ok(variants.size >= 4);
  const saved = clone(guide); guide.starts[0].en = 'tampered'; guide.steps.push({ en: 'tampered', zh: 'changed' });
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), saved);
});

test('unfamiliar topics use all public category choices, including decoys, rather than assuming the first is correct', () => {
  const topic = { id: 'public-only', term: 'Unfamiliar term', deck: 'classic', publicHints: ['Weather', 'Historical tableware', 'Clothing accessory'] };
  const lines = new Set();
  for (let n = 0; n < 100; n++) {
    const key = 'round:seat-' + n, guide = E.storyGuide(topic, key);
    assert.deepEqual(E.storyGuide({ ...topic, publicHints: topic.publicHints.slice().reverse() }, key), guide);
    for (const line of guide.starts) lines.add(line.en);
  }
  assert.ok([...lines].some(line => line.includes('warm rain')));
  assert.ok([...lines].some(line => line.includes('little bell')));
  assert.ok([...lines].some(line => line.includes('tiny mirror')));
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
