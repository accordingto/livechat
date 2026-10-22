'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../once-upon-a-time-engine.js');
const D = require('../once-upon-a-time-deck.js');
const clone = value => JSON.parse(JSON.stringify(value));
const roster = Array.from({ length: 4 }, (_, i) => ({ playerNum: i + 1, name: 'Seat ' + (i + 1) }));
let serial = 0;
const cmd = (s, type, actor = 0, extra = {}) => ({ id: 'density-' + ++serial, sessionId: s.sessionId, turnId: s.turnId, now: serial, seed: serial * 7919, type, actor, ...extra });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, cmd(s, type, actor, extra));
const start = (world, seed = 731) => {
  let s = E.create({ id: world + '-interrupt', roster, world, handSize: 5, seed });
  s = act(s, 'deal'); return act(s, 'chooseFirst', 0, { playerNum: 1 });
};
function give(s, seat, id) {
  for (const key of ['storyDeck', 'storyDiscard', 'storyHeld']) s[key] = s[key].filter(card => card !== id);
  for (const hand of Object.values(s.hands)) { const i = hand.indexOf(id); if (i >= 0) hand.splice(i, 1); }
  s.hands[seat].push(id);
}
function prepare(s, card) {
  const source = D.getWorld(s.world).storyCards.find(c => c.category === card.category && c.id !== card.id);
  give(s, 1, source.id); give(s, 2, card.id);
  return act(s, 'play', 1, { cardId: source.id });
}
const zones = s => Object.fromEntries(['hands', 'endings', 'storyDeck', 'storyDiscard', 'storyHeld', 'endingDeck', 'endingDiscard', 'history'].map(key => [key, clone(s[key])]));

test('every released world has a modest fixed Interrupt increase, evenly spread across categories', () => {
  for (const [world, storyCount, before, after, perCategory] of [['classic', 129, 20, 30, 6], ['modern-future', 60, 10, 15, 3]]) {
    const pool = D.getWorld(world), current = pool.storyCards.filter(card => card.isInterrupt);
    assert.equal(pool.storyCards.length, storyCount); assert.equal(current.length, after);
    assert.equal(pool.legacyInterruptIds.length, before); assert.ok(Object.isFrozen(pool.legacyInterruptIds));
    assert.equal(new Set(pool.legacyInterruptIds).size, before);
    for (const id of pool.legacyInterruptIds) assert.equal(D.storyById[id].isInterrupt, true, id);
    for (const category of D.categories) assert.equal(current.filter(card => card.category === category.id).length, perCategory);
    assert.ok(current.length / pool.storyCards.length >= 0.23 && current.length / pool.storyCards.length <= 0.25);
  }
});

test('new deals project and accept newly added Interrupts without altering ordinary takeover rules', () => {
  for (const world of ['classic', 'modern-future']) {
    const pool = D.getWorld(world), added = pool.storyCards.filter(c => c.isInterrupt && !pool.legacyInterruptIds.includes(c.id));
    for (const card of added) {
      let s = prepare(start(world), card);
      assert.equal(s.interruptProfile, 2);
      assert.equal(E.view(s, 2).once.hand.find(c => c.id === card.id).isInterrupt, true);
      assert.equal(E.view(s, 2).once.actions.categoryInterrupt, true);
      const previous = s.hands[1].length;
      s = act(s, 'interrupt', 2, { cardId: card.id, mode: 'category', opportunityId: s.categoryOpportunity.id });
      assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2);
      assert.equal(s.hands[1].length, previous + 1); assert.equal(s.history.at(-1).mode, 'category');
      assert.equal(s.vote, null); assert.equal(s.interrupt, null);
    }
  }
});

test('already-running saved games retain original Interrupt markings, permissions and physical piles after reconnect', () => {
  for (const world of ['classic', 'modern-future']) {
    const pool = D.getWorld(world), added = pool.storyCards.filter(c => c.isInterrupt && !pool.legacyInterruptIds.includes(c.id));
    for (const card of added) {
      let s = prepare(start(world), card); delete s.interruptProfile;
      // Only this promoted card is in the non-storyteller's hand, so action
      // availability cannot accidentally come from another same-category card.
      s.storyDiscard.push(...s.hands[2].filter(id => id !== card.id)); s.hands[2] = [card.id];
      const before = clone(s), piles = zones(s);
      const v = E.view(s, 2).once;
      assert.equal(v.hand[0].isInterrupt, false); assert.equal(v.actions.categoryInterrupt, false);
      assert.deepEqual(s, before, 'reading/reconnecting must not mutate or re-deal saved state');
      s = act(s, 'interrupt', 2, { cardId: card.id, mode: 'category', opportunityId: s.categoryOpportunity.id, interruptProfile: 2 });
      assert.equal(s.interruptProfile, 1); assert.equal(s.replies[2].error, 'wrong_category');
      assert.deepEqual(zones(s), piles, 'a rejected promotion must not draw or discard');
      assert.equal(E.view(s, 2).once.hand[0].isInterrupt, false);
      s = act(s, 'interrupt', 2, { cardId: card.id, mode: 'normal' });
      assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2, 'all ordinary cards may still interrupt a spoken element');
      assert.equal(E.view(s, 0).once.history.at(-1).card.isInterrupt, false);
    }
  }
});

test('legacy original Interrupts remain valid and all public card projections use the saved game profile', () => {
  for (const world of ['classic', 'modern-future']) {
    const pool = D.getWorld(world), original = D.storyById[pool.legacyInterruptIds[0]];
    let s = start(world); delete s.interruptProfile; s = prepare(s, original);
    assert.equal(E.view(s, 2).once.hand.find(c => c.id === original.id).isInterrupt, true);
    s = act(s, 'interrupt', 2, { cardId: original.id, mode: 'category', opportunityId: s.categoryOpportunity.id });
    assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2);
    const promoted = pool.storyCards.find(c => c.isInterrupt && !pool.legacyInterruptIds.includes(c.id));
    s = start(world); delete s.interruptProfile; give(s, 1, promoted.id);
    s = act(s, 'play', 1, { cardId: promoted.id }); s.starterCard = promoted.id;
    const view = E.view(s, 0).once;
    for (const card of [view.starterCard, view.history.at(-1).card, view.returnableCard]) assert.equal(card.isInterrupt, false);
  }
});

test('restart and a fresh deal adopt the new Interrupt mix; ordinary actions cannot upgrade a saved match', () => {
  for (const world of ['classic', 'modern-future']) {
    let s = start(world); delete s.interruptProfile;
    s = act(s, 'continueStory', 1, { interruptProfile: 2 }); assert.equal(s.interruptProfile, 1);
    s = act(s, 'restart'); assert.equal(s.interruptProfile, 2); assert.equal(s.world, world);
    assert.equal(s.phase, 'LOBBY'); assert.deepEqual(s.hands, {});
    delete s.interruptProfile; s = act(s, 'deal'); assert.equal(s.interruptProfile, 2);
    for (const seat of roster) for (const card of E.view(s, seat.playerNum).once.hand) assert.equal(card.isInterrupt, D.storyById[card.id].isInterrupt);
  }
});

test('higher density changes no hand quotas, physical-card counts or draw order', () => {
  for (const world of ['classic', 'modern-future']) {
    const signatures = new Set(), totals = [0, 0, 0, 0];
    for (let seed = 1; seed <= 250; seed++) {
      const s = start(world, seed), pool = D.getWorld(world);
      const allIds = [...s.storyDeck, ...s.storyDiscard, ...s.storyHeld, ...Object.values(s.hands).flat()];
      assert.equal(allIds.length, pool.storyCards.length); assert.equal(new Set(allIds).size, allIds.length);
      for (const seat of roster) {
        const hand = E.view(s, seat.playerNum).once.hand;
        assert.equal(hand.length, 5); const interrupts = hand.filter(c => c.isInterrupt).length;
        signatures.add(interrupts); totals[seat.playerNum - 1] += interrupts;
      }
      const next = s.storyDeck[0], after = act(s, 'pass', 1);
      assert.equal(after.hands[1].at(-1), next, 'later draws still take the unchanged top card');
    }
    assert.ok(signatures.has(0) && signatures.has(1) && signatures.has(2), 'Interrupt access is variable, never a forced per-hand quota');
    assert.ok(Math.max(...totals) - Math.min(...totals) < 85, 'no persistent seat-order advantage');
  }
});
