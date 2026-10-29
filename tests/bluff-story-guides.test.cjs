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

const sayable = (item, maxWords, maxZh) => {
  assert.ok(item.en.length > 20); assert.ok(item.zh.length > 8);
  assert.ok(item.en.split(/\s+/).length <= maxWords, 'short simple English: ' + item.en);
  assert.ok(item.zh.length <= maxZh, 'direct Chinese: ' + item.zh);
  assert.match(item.en, /\.$/); assert.match(item.zh, /。$/);
  assert.doesNotMatch(item.en, /\b(?:invent|choose|pick|imagine|decide|add|start by)\b/i, 'a proposed story, not instructions to invent one');
};

test('every real topic gives a Bluffer one complete made-up story, like the Truth Teller card, without private evidence', () => {
  const seen = new Set();
  for (const question of bank) {
    const topic = E.publicQuestion(question), key = 'round:seat', guide = E.storyGuide(topic, key);
    assert.equal(guide.kind, 'fiction'); assert.equal(guide.optional, true);
    assert.equal(guide.version, 3); assert.equal(guide.format, 'story');
    assert.equal(guide.topic, topic.term); assert.deepEqual(guide.steps, []);
    assert.equal(guide.starts.length, 1, 'one option only'); assert.deepEqual(guide.starts[0], guide.story.answer, 'older cards show the same one answer');
    sayable(guide.story.answer, 24, 55);
    assert.equal(guide.story.details.length, question.supportingFacts.length >= 2 ? 2 : guide.story.details.length, 'two details, like the two real supporting facts');
    assert.notDeepEqual(guide.story.details[0], guide.story.details[1]);
    for (const detail of guide.story.details) sayable(detail, 18, 40);
    seen.add(guide.story.answer.en);
    const poisoned = { ...topic };
    for (const field of ['secretAnswer', 'supportingFacts', 'revealExplanation', 'sources', 'tags', 'truthfulId', 'roles']) {
      Object.defineProperty(poisoned, field, { get() { throw Error('Private evidence was read: ' + field); } });
    }
    assert.deepEqual(E.storyGuide(poisoned, key), guide);
    assert.deepEqual(E.storyGuide({ ...topic, publicHints: topic.publicHints.slice().reverse() }, key), guide, 'public choice ordering does not indicate which category is true');
    for (const secret of [question.secretAnswer, question.revealExplanation, ...question.supportingFacts]) assert.ok(!JSON.stringify(guide).includes(secret));
  }
  assert.ok(seen.size >= 20, 'the bank draws on many different stories');
});

test('all 72 written stories, across the 18 public-clue families, are complete, sayable and distinct', () => {
  const terms = { weather: 'Weather', light: 'Light', stone: 'Stone', plant: 'Plant', animal: 'Animal', container: 'Cup', clothing: 'Clothing',
    writing: 'Book', craft: 'Craft', food: 'Food', performance: 'Dance', custom: 'Custom', person: 'Who is she', place: 'Castle',
    creature: 'Creature', illusion: 'Illusion', mystery: 'Mystery', unknown: 'Zzq' };
  const all = new Map();
  for (const [family, term] of Object.entries(terms)) {
    const found = new Map();
    for (let n = 0; n < 300; n++) {
      const guide = E.storyGuide({ id: 'family-' + family, term, deck: 'classic', publicHints: [] }, 'seat-' + n);
      found.set(guide.story.answer.en, guide.story);
    }
    assert.equal(found.size, 4, family + ' has four stories');
    for (const story of found.values()) all.set(story.answer.en, story);
  }
  assert.equal(all.size, 72);
  const details = [...all.values()].flatMap(story => story.details);
  assert.equal(details.length, 144); assert.equal(new Set(details.map(d => d.en)).size, 144, 'no repeated detail lines');
  for (const story of all.values()) { sayable(story.answer, 24, 55); for (const detail of story.details) sayable(detail, 18, 40); }
});

test('fiction stories stay stable on reconnect, vary among seats, and never expose mutable shared data', () => {
  const topic = E.publicQuestion(bank[0]), guide = E.storyGuide(topic, 'round-1:seat-1');
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), guide);
  const variants = new Set(Array.from({ length: 20 }, (_, n) => JSON.stringify(E.storyGuide(topic, 'round-1:seat-' + n).story)));
  assert.ok(variants.size >= 3);
  const saved = clone(guide); guide.starts[0].en = 'tampered'; guide.story.answer.en = 'tampered'; guide.story.details[0].en = 'tampered'; guide.steps.push({ en: 'tampered', zh: 'changed' });
  assert.deepEqual(E.storyGuide(topic, 'round-1:seat-1'), saved);
});

test('unfamiliar topics use all public category choices, including decoys, rather than assuming the first is correct', () => {
  const topic = { id: 'public-only', term: 'Unfamiliar term', deck: 'classic', publicHints: ['Weather', 'Historical tableware', 'Clothing accessory'] };
  const lines = new Set();
  for (let n = 0; n < 100; n++) {
    const key = 'round:seat-' + n, guide = E.storyGuide(topic, key);
    assert.deepEqual(E.storyGuide({ ...topic, publicHints: topic.publicHints.slice().reverse() }, key), guide);
    lines.add(guide.story.answer.en);
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
