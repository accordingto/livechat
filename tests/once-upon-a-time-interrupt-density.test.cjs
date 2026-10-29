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

// Official third-edition core deck: 23 of 114 Story cards are Interrupts (20.2%).
// https://www.atlas-games.com/pdf_storage/OUAT3CoreCardlistWEB.pdf
const OFFICIAL_RATIO = 23 / 114;
const WORLDS = [
  // world, Story cards, profile 1, profile 2, profile 3 (current), current per category
  ['classic', 129, 20, 30, 35, { character: 7, thing: 7, place: 7, aspect: 7, event: 7 }],
  ['modern-future', 60, 10, 15, 17, { character: 4, thing: 3, place: 3, aspect: 3, event: 4 }],
  ['halloween', 150, 40, 40, 42, { character: 9, thing: 9, place: 8, aspect: 8, event: 8 }]
];
const savedIds = (pool, profile) => profile === 2 ? pool.profile2InterruptIds : pool.legacyInterruptIds;
const savedProfile = (s, profile) => { if (profile === 1) delete s.interruptProfile; else s.interruptProfile = profile; return s; };

test('every released world has a modest fixed Interrupt increase, a little above the official deck', () => {
  for (const [world, storyCount, first, second, current, perCategory] of WORLDS) {
    const pool = D.getWorld(world), now = pool.storyCards.filter(card => card.isInterrupt).map(card => card.id);
    assert.equal(pool.storyCards.length, storyCount); assert.equal(now.length, current);
    for (const [ids, size] of [[pool.legacyInterruptIds, first], [pool.profile2InterruptIds, second]]) {
      assert.ok(Object.isFrozen(ids)); assert.equal(ids.length, size); assert.equal(new Set(ids).size, size);
      for (const id of ids) assert.equal(D.storyById[id].isInterrupt, true, id + ' stays an Interrupt in newer mixes');
    }
    assert.ok(pool.legacyInterruptIds.every(id => pool.profile2InterruptIds.includes(id)), 'each mix only adds cards');
    for (const category of D.categories) assert.equal(pool.storyCards.filter(card => card.isInterrupt && card.category === category.id).length, perCategory[category.id], world + ' ' + category.id);
    const ratio = current / storyCount;
    assert.ok(ratio > OFFICIAL_RATIO && ratio <= OFFICIAL_RATIO + 0.09, world + ' ' + ratio.toFixed(3) + ' stays a little above the official 20.2%');
    assert.ok(ratio >= 0.27 && ratio <= 0.285, world + ' ' + ratio.toFixed(3));
  }
});

test('new deals use profile 3 and accept every newly added Interrupt without altering ordinary takeover rules', () => {
  for (const [world] of WORLDS) {
    const pool = D.getWorld(world), added = pool.storyCards.filter(c => c.isInterrupt && !pool.profile2InterruptIds.includes(c.id));
    assert.ok(added.length >= 2);
    for (const card of added) {
      let s = prepare(start(world), card);
      assert.equal(s.interruptProfile, 3);
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

test('already-running saved games retain their own Interrupt markings, permissions and physical piles after reconnect', () => {
  for (const [world] of WORLDS) for (const profile of [1, 2]) {
    const pool = D.getWorld(world), kept = savedIds(pool, profile);
    const added = pool.storyCards.filter(c => c.isInterrupt && !kept.includes(c.id));
    for (const card of added) {
      let s = savedProfile(prepare(start(world), card), profile);
      // Only this promoted card is in the non-storyteller's hand, so action
      // availability cannot accidentally come from another same-category card.
      s.storyDiscard.push(...s.hands[2].filter(id => id !== card.id)); s.hands[2] = [card.id];
      const before = clone(s), piles = zones(s);
      const v = E.view(s, 2).once;
      assert.equal(v.hand[0].isInterrupt, false, world + ' profile ' + profile + ' ' + card.id); assert.equal(v.actions.categoryInterrupt, false);
      assert.deepEqual(s, before, 'reading/reconnecting must not mutate or re-deal saved state');
      s = act(s, 'interrupt', 2, { cardId: card.id, mode: 'category', opportunityId: s.categoryOpportunity.id, interruptProfile: 3 });
      assert.equal(s.interruptProfile ?? 1, profile); assert.equal(s.replies[2].error, 'wrong_category');
      assert.deepEqual(zones(s), piles, 'a rejected promotion must not draw or discard');
      assert.equal(E.view(s, 2).once.hand[0].isInterrupt, false);
      s = act(s, 'interrupt', 2, { cardId: card.id, mode: 'normal' });
      assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2, 'all ordinary cards may still interrupt a spoken element');
      assert.equal(E.view(s, 0).once.history.at(-1).card.isInterrupt, false);
    }
  }
});

test('saved-profile Interrupts remain valid and all public card projections use the saved game profile', () => {
  for (const [world] of WORLDS) for (const profile of [1, 2]) {
    const pool = D.getWorld(world), kept = savedIds(pool, profile), original = D.storyById[kept.at(-1)];
    let s = savedProfile(start(world), profile); s = prepare(s, original);
    assert.equal(E.view(s, 2).once.hand.find(c => c.id === original.id).isInterrupt, true);
    s = act(s, 'interrupt', 2, { cardId: original.id, mode: 'category', opportunityId: s.categoryOpportunity.id });
    assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2);
    const promoted = pool.storyCards.find(c => c.isInterrupt && !kept.includes(c.id));
    s = savedProfile(start(world), profile); give(s, 1, promoted.id);
    s = act(s, 'play', 1, { cardId: promoted.id }); s.starterCard = promoted.id;
    const view = E.view(s, 0).once;
    for (const card of [view.starterCard, view.history.at(-1).card, view.returnableCard]) assert.equal(card.isInterrupt, false);
  }
});

test('restart and a fresh deal adopt the current Interrupt mix; ordinary actions cannot upgrade a saved match', () => {
  for (const [world] of WORLDS) for (const profile of [1, 2]) {
    let s = savedProfile(start(world), profile);
    s = act(s, 'continueStory', 1, { interruptProfile: 3 }); assert.equal(s.interruptProfile ?? 1, profile);
    s = act(s, 'restart'); assert.equal(s.interruptProfile, 3); assert.equal(s.world, world);
    assert.equal(s.phase, 'LOBBY'); assert.deepEqual(s.hands, {});
    savedProfile(s, profile); s = act(s, 'deal'); assert.equal(s.interruptProfile, 3);
    for (const seat of roster) for (const card of E.view(s, seat.playerNum).once.hand) assert.equal(card.isInterrupt, D.storyById[card.id].isInterrupt);
  }
});

test('higher density changes no hand quotas, physical-card counts or draw order', () => {
  for (const [world] of WORLDS) {
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
