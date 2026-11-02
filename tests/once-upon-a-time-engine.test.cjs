const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../once-upon-a-time-engine.js');
const D = require('../once-upon-a-time-deck.js');
let serial = 0;
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) }));
const create = (count = 4, seed = 731) => E.create({ id: 'once-test', roster: roster(count), seed, now: 1000 });
const command = (s, type, actor = 0, extra = {}) => ({ id: 'command-' + (++serial), sessionId: s.sessionId, turnId: s.turnId, seed: 24681 + serial, now: 2000 + serial, type, actor, ...extra });
const act = (s, type, actor = 0, extra = {}) => E.apply(s, command(s, type, actor, extra));
function dealt(count = 4) {
  let s = create(count);
  for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
  return act(s, 'deal');
}
const started = (count = 4, first = 1) => act(dealt(count), 'chooseFirst', 0, { playerNum: first });
const clone = value => JSON.parse(JSON.stringify(value));
function gameplay(s) {
  const result = clone(s); delete result.seen; delete result.replies; delete result.revision;
  return result;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}
function conservation(s) {
  if (s.phase === 'LOBBY') return;
  const story = [...E.list(s.storyDeck), ...E.list(s.storyDiscard), ...E.list(s.storyHeld), ...Object.values(s.hands || {}).flatMap(E.list)];
  assert.equal(story.length, D.storyCards.length, 'every physical Story Card stays in exactly one zone');
  assert.equal(new Set(story).size, story.length, 'no duplicate physical Story Card');
  assert.deepEqual(story.slice().sort(), D.storyCards.map(c => c.id).sort());
  const endings = [...E.list(s.endingDeck), ...E.list(s.endingDiscard), ...Object.values(s.endings || {}).filter(Boolean), ...(s.endingPlayed ? [s.endingPlayed.cardId] : [])];
  assert.equal(endings.length, D.endingCards.length);
  assert.equal(new Set(endings).size, endings.length, 'no duplicate physical Ending Card');
  assert.deepEqual(endings.slice().sort(), D.endingCards.map(c => c.id).sort());
}
// Fixture helpers move a real physical card rather than inventing duplicates.
function give(s, playerNum, cardId) {
  for (const key of ['storyDeck', 'storyDiscard', 'storyHeld']) s[key] = s[key].filter(id => id !== cardId);
  for (const key of Object.keys(s.hands)) s.hands[key] = s.hands[key].filter(id => id !== cardId);
  s.hands[playerNum].push(cardId);
}
function emptyHand(s, playerNum) { s.storyDiscard.push(...s.hands[playerNum]); s.hands[playerNum] = []; }
function finish(s, choice, extra = {}) {
  const voteId = s.vote.id, turnId = s.turnId;
  for (const playerNum of s.vote.eligible.slice()) s = act(s, 'vote', playerNum, { voteId, turnId, choice, ...extra });
  return s;
}
function wire(value) {
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
  return entries.length ? Object.fromEntries(entries) : null;
}

test('setup accepts fixed 2–6 seat rosters and rejects malformed or duplicate seats', () => {
  for (const count of [2, 4, 6]) {
    const s = create(count);
    assert.equal(s.phase, 'LOBBY'); assert.equal(s.storyteller, null);
    assert.deepEqual(s.roster, roster(count)); assert.deepEqual(s.hands, {});
    assert.deepEqual(E.view(s, 1, 0).once.hand, []);
  }
  for (const count of [0, 1, 7]) assert.throws(() => create(count), /invalid_setup/);
  assert.throws(() => E.create({ id: 'x', roster: [{ playerNum: 1 }, { playerNum: 1 }] }), /invalid_roster/);
  assert.throws(() => E.create({ id: 'x', roster: [{ playerNum: 0 }, { playerNum: 2 }] }), /invalid_roster/);
  assert.throws(() => E.create({ roster: roster(2) }), /invalid_setup/);
});

test('2, 4, and 6 players receive correct private hands/endings and one public discarded starter', () => {
  for (const count of [2, 4, 6]) {
    const s = dealt(count), handSize = Math.max(5, 11 - count);
    assert.equal(s.phase, 'CHOOSING_FIRST'); assert.equal(s.storyteller, null);
    for (const p of s.roster) {
      assert.equal(s.hands[p.playerNum].length, handSize);
      assert.equal(E.view(s, p.playerNum, 0).once.hand.length, handSize);
      assert.equal(E.view(s, p.playerNum, 0).once.ending.id, s.endings[p.playerNum]);
    }
    assert.deepEqual(s.storyDiscard, [s.starterCard]); assert.deepEqual(s.history, []);
    assert.equal(s.storyDeck.length, D.storyCards.length - count * handSize - 1);
    assert.equal(s.endingDeck.length, D.endingCards.length - count);
    assert.equal(E.view(s, 0, 0).once.starterCard.id, s.starterCard); conservation(s);
  }
});

test('optional lobby readiness and classic first-teller selection are host-controlled', () => {
  let s = create();
  assert.equal(E.view(s, 0, 0).once.actions.deal, true);
  s = act(s, 'ready', 0, { value: true }); assert.equal(s.replies[0].error, 'not_available');
  for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
  s = act(s, 'ready', 4, { value: false }); assert.equal(E.view(s, 0, 0).once.actions.deal, true);
  s = act(s, 'ready', 4, { value: true }); assert.equal(E.view(s, 0, 0).once.actions.deal, true);
  s = act(s, 'deal', 1); assert.equal(s.phase, 'LOBBY');
  s = act(s, 'deal'); assert.equal(s.storyteller, null);
  s = act(s, 'chooseFirst', 0, { playerNum: 99 }); assert.equal(s.replies[0].error, 'invalid_player');
  s = act(s, 'chooseFirst', 2, { playerNum: 2 }); assert.equal(s.replies[2].error, 'not_available');
  s = act(s, 'chooseFirst', 0, { playerNum: 3 }); assert.equal(s.storyteller, 3);
  assert.equal(s.phase, 'STORYTELLING'); conservation(s);
});

test('host may deal with zero or partial readiness; absent players retain their private cards', () => {
  for (const count of [2, 4, 6]) for (const partial of [false, true]) {
    let s = create(count);
    if (partial) s = act(s, 'ready', 1, { value: true });
    assert.equal(E.view(s, 0, 0).once.actions.deal, true);
    const unauthorized = act(s, 'deal', 2);
    assert.equal(unauthorized.phase, 'LOBBY');
    assert.equal(unauthorized.replies[2].error, 'not_available');
    const cmd = command(s, 'deal'); s = E.apply(s, cmd);
    assert.equal(s.phase, 'CHOOSING_FIRST'); assert.equal(s.replies[0].error, '');
    for (const player of s.roster) {
      assert.equal(E.view(s, player.playerNum).once.hand.length, Math.max(5, 11 - count));
      assert.ok(E.view(s, player.playerNum).once.ending);
    }
    assert.equal(E.apply(s, cmd), s, 'retry must not redeal'); conservation(s);
  }
});

test('independent shuffle, random first selection and transaction retries are deterministic', () => {
  let a = create(6), b = create(6);
  for (let n = 1; n <= 6; n++) {
    const cmd = command(a, 'ready', n, { value: true }); a = E.apply(a, cmd); b = E.apply(b, cmd);
  }
  const deal = command(a, 'deal'); assert.deepEqual(E.apply(a, deal), E.apply(a, deal));
  a = E.apply(a, deal); b = E.apply(b, deal); assert.deepEqual(a, b);
  const first = command(a, 'randomFirst');
  assert.deepEqual(E.apply(a, first), E.apply(b, first));
  assert.ok(a.roster.some(p => p.playerNum === E.apply(a, first).storyteller));
  assert.deepEqual(E.shuffle([1, 2, 3, 4, 5], 15), E.shuffle([1, 2, 3, 4, 5], 15));
  assert.notDeepEqual(E.shuffle(D.storyCards.map(c => c.id), 1), E.shuffle(D.storyCards.map(c => c.id), 2));
});

test('a Storyteller can play several cards in order; category-special cards are ordinary elements when played', () => {
  let s = started();
  const interruptCard = D.storyCards.find(c => c.isInterrupt); give(s, 1, interruptCard.id);
  const cards = [s.hands[1][0], s.hands[1][1], interruptCard.id];
  for (const id of cards) {
    const turn = s.turnId; s = act(s, 'play', 1, { cardId: id });
    assert.equal(s.storyteller, 1); assert.equal(s.turnId, turn + 1);
    assert.equal(s.hands[1].includes(id), false); conservation(s);
  }
  assert.deepEqual(s.history.map(h => h.cardId), cards);
  assert.ok(s.history.every(h => h.kind === 'play'));
  assert.equal(E.view(s, 2, 0).once.categoryOpportunity.category, interruptCard.category);
});

test('normal interrupt immediately transfers story, reveals used card, and draws exactly one old-teller card', () => {
  let s = started(), oldHand = s.hands[1].length, newHand = s.hands[2].length;
  const card = s.hands[2][0]; s = act(s, 'interrupt', 2, { cardId: card, mode: 'normal' });
  assert.equal(s.storyteller, 2); assert.equal(s.hands[1].length, oldHand + 1); assert.equal(s.hands[2].length, newHand - 1);
  assert.equal(s.history.at(-1).cardId, card); assert.equal(s.history.at(-1).kind, 'interrupt');
  assert.equal(s.phase, 'STORYTELLING'); assert.ok(s.interrupt.id);
  assert.equal(E.view(s, 1, 0).once.actions.dispute, true); assert.equal(E.view(s, 2, 0).once.actions.dispute, false);
  conservation(s);
});

test('invalid disputed interrupt restores old teller, undoes exact penalty draw, and penalizes only interrupter', () => {
  let s = started(); s = act(s, 'play', 1, { cardId: s.hands[1][0] });
  const before = clone(s), used = s.hands[2][0];
  s = act(s, 'interrupt', 2, { cardId: used, mode: 'normal' });
  const eventId = s.interrupt.eventId;
  s = act(s, 'dispute', 1, { interruptId: s.interrupt.id });
  assert.equal(s.phase, 'INTERRUPT_DISPUTE'); assert.deepEqual(s.vote.eligible, [3, 4]);
  const voteId = s.vote.id;
  s = act(s, 'vote', 1, { voteId, choice: 'invalid' }); assert.equal(s.replies[1].error, 'not_eligible');
  s = act(s, 'vote', 2, { voteId, choice: 'invalid' }); assert.equal(s.replies[2].error, 'not_eligible');
  s = finish(s, 'invalid');
  assert.equal(s.storyteller, 1); assert.equal(s.phase, 'STORYTELLING');
  assert.deepEqual(s.hands[1], before.hands[1]); assert.equal(s.hands[2].length, before.hands[2].length + 1);
  assert.equal(s.hands[2].includes(used), false); assert.ok(s.storyDiscard.includes(used));
  assert.equal(s.history.some(h => h.eventId === eventId), false);
  assert.deepEqual(s.history, before.history); assert.equal(s.interrupt, null); assert.equal(s.categoryOpportunity, null);
  assert.equal(E.view(s, 0, 0).once.returnableCard.id, before.latestPlay.cardId); conservation(s);
});

test('disputed interrupt accepted or tied is valid; host nonresponse uses all eligible voters', () => {
  for (const mode of ['valid', 'tie', 'missing']) {
    let s = started(); s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
    s = act(s, 'dispute', 3, { interruptId: s.interrupt.id }); const voteId = s.vote.id;
    if (mode === 'valid') s = finish(s, 'valid');
    else {
      s = act(s, 'vote', 3, { voteId, choice: 'invalid' });
      s = mode === 'tie' ? act(s, 'vote', 4, { voteId, choice: 'valid' }) : act(s, 'finishVote', 0, { voteId });
    }
    assert.equal(s.storyteller, 2); assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.history.length, 1);
    assert.equal(s.interrupt, null); conservation(s);
  }
});

test('two-player dispute requires explicit host-recorded social agreement, never an automatic verdict', () => {
  for (const choice of ['valid', 'invalid']) {
    let s = started(2); s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
    s = act(s, 'dispute', 1, { interruptId: s.interrupt.id }); const voteId = s.vote.id;
    assert.deepEqual(s.vote.eligible, []); assert.equal(E.view(s, 0, 0).once.actions.resolveSocial, true);
    s = act(s, 'finishVote', 0, { voteId }); assert.equal(s.phase, 'INTERRUPT_DISPUTE');
    assert.equal(s.replies[0].error, 'social_agreement_required');
    s = act(s, 'resolveSocial', 1, { voteId, choice }); assert.equal(s.replies[1].error, 'not_available');
    s = act(s, 'resolveSocial', 0, { voteId, choice });
    assert.equal(s.storyteller, choice === 'invalid' ? 1 : 2); conservation(s);
  }
});

test('category interrupt checks actual latest normal play and matching special card, without a speech vote', () => {
  let s = started();
  const special = D.storyCards.find(c => c.isInterrupt);
  const source = D.storyCards.find(c => c.category === special.category && c.id !== special.id);
  give(s, 1, source.id); give(s, 2, special.id);
  s = act(s, 'interrupt', 2, { cardId: special.id, mode: 'category', opportunityId: 'spoken-only' });
  assert.equal(s.replies[2].error, 'stale_opportunity');
  s = act(s, 'play', 1, { cardId: source.id }); const opportunityId = s.categoryOpportunity.id;
  const oldCount = s.hands[1].length, ownCount = s.hands[2].length;
  assert.equal(E.view(s, 2, 0).once.actions.categoryInterrupt, true);
  s = act(s, 'interrupt', 2, { cardId: special.id, mode: 'category', opportunityId });
  assert.equal(s.storyteller, 2); assert.equal(s.hands[1].length, oldCount + 1); assert.equal(s.hands[2].length, ownCount - 1);
  assert.equal(s.vote, null); assert.equal(s.interrupt, null); assert.equal(s.categoryOpportunity, null);
  assert.equal(s.history.at(-1).mode, 'category'); conservation(s);
});

test('wrong-category or nonspecial cards cannot category-interrupt; normal play of a special allows interruption', () => {
  let s = started(); const special = D.storyCards.find(c => c.isInterrupt);
  const ordinary = D.storyCards.find(c => !c.isInterrupt && c.category === special.category);
  const wrong = D.storyCards.find(c => c.isInterrupt && c.category !== special.category);
  give(s, 1, special.id); give(s, 2, ordinary.id); give(s, 3, wrong.id);
  s = act(s, 'play', 1, { cardId: special.id }); const opportunityId = s.categoryOpportunity.id;
  for (const [actor, cardId] of [[2, ordinary.id], [3, wrong.id]]) {
    const before = gameplay(s); s = act(s, 'interrupt', actor, { cardId, mode: 'category', opportunityId });
    assert.equal(s.replies[actor].error, 'wrong_category'); assert.deepEqual(gameplay(s), before);
  }
  const matching = D.storyCards.find(c => c.isInterrupt && c.category === special.category && c.id !== special.id);
  assert.ok(matching, 'deck contains multiple interrupt cards in each category'); give(s, 2, matching.id);
  s = act(s, 'interrupt', 2, { cardId: matching.id, mode: 'category', opportunityId }); assert.equal(s.storyteller, 2); conservation(s);
});

test('interrupts cannot category-interrupt an interrupt, and continuation closes opportunities', () => {
  let s = started(); s = act(s, 'play', 1, { cardId: s.hands[1][0] });
  const oldOpportunity = s.categoryOpportunity.id;
  s = act(s, 'continueStory', 1); assert.equal(s.categoryOpportunity, null); assert.ok(s.latestPlay);
  s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'category', opportunityId: oldOpportunity });
  assert.equal(s.replies[2].error, 'stale_opportunity');
  s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' }); const oldInterrupt = s.interrupt.id;
  s = act(s, 'interrupt', 3, { cardId: s.hands[3][0], mode: 'category', opportunityId: oldOpportunity });
  assert.equal(s.replies[3].error, 'stale_opportunity');
  s = act(s, 'continueStory', 2); assert.equal(s.interrupt, null);
  s = act(s, 'dispute', 1, { interruptId: oldInterrupt }); assert.equal(s.replies[1].error, 'not_available'); conservation(s);
});

test('first authoritative simultaneous interrupt wins; later normal/category attempts have no penalty', () => {
  for (const secondMode of ['normal', 'category']) {
    let s = started(); s = act(s, 'play', 1, { cardId: s.hands[1][0] });
    const first = command(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
    const second = command(s, 'interrupt', 3, { cardId: s.hands[3][0], mode: secondMode, opportunityId: s.categoryOpportunity.id });
    s = E.apply(s, first); const before = gameplay(s);
    s = E.apply(s, second); assert.equal(s.replies[3].error, 'stale_turn'); assert.deepEqual(gameplay(s), before);
    assert.equal(s.storyteller, 2); conservation(s);
  }
});

test('Pass draws once, optional discard never forced, then fixed roster left neighbor receives story', () => {
  for (const choice of ['discard', 'keepAll']) {
    let s = started(4, 4), original = s.hands[4].length;
    s = act(s, 'pass', 4); assert.equal(s.phase, 'PASS_DISCARD'); assert.equal(s.storyteller, 4);
    assert.equal(s.hands[4].length, original + 1);
    assert.equal(E.view(s, 4, 0).once.actions.keepAll, true); assert.equal(E.view(s, 1, 0).once.actions.keepAll, false);
    s = act(s, 'keepAll', 1); assert.equal(s.replies[1].error, 'not_available');
    const id = s.hands[4][0]; s = act(s, choice, 4, { cardId: id });
    assert.equal(s.storyteller, 1); assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.passPlayer, null);
    assert.equal(s.hands[4].length, original + (choice === 'keepAll' ? 1 : 0));
    if (choice === 'discard') assert.ok(s.storyDiscard.includes(id)); conservation(s);
  }
});

test('left neighbor follows preserved noncontiguous seat order rather than arithmetic seat number', () => {
  let s = E.create({ id: 'seats', roster: [{ playerNum: 8, name: 'A' }, { playerNum: 2, name: 'B' }, { playerNum: 6, name: 'C' }], seed: 4 });
  for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
  s = act(s, 'deal'); s = act(s, 'chooseFirst', 0, { playerNum: 2 });
  s = act(s, 'pass', 2); s = act(s, 'keepAll', 2); assert.equal(s.storyteller, 6);
  s = act(s, 'pass', 6); s = act(s, 'keepAll', 6); assert.equal(s.storyteller, 8); conservation(s);
});

test('successful Challenge excludes challenger/teller and draws one then passes left', () => {
  let s = started(), count = s.hands[1].length;
  s = act(s, 'challenge', 2, { returnLatest: false }); assert.equal(s.phase, 'CHALLENGE');
  assert.deepEqual(s.vote.eligible, [3, 4]); assert.equal(s.vote.subjectPlayer, 1);
  s = finish(s, 'lose'); assert.equal(s.storyteller, 2); assert.equal(s.hands[1].length, count + 1);
  assert.equal(s.phase, 'STORYTELLING'); conservation(s);
});

test('failed, tied and insufficient-majority Challenges have no card penalty', () => {
  for (const scenario of ['continue', 'tie', 'missing']) {
    let s = started(), hands = clone(s.hands); s = act(s, 'challenge', 2);
    const voteId = s.vote.id;
    if (scenario === 'continue') s = finish(s, 'continue');
    else {
      s = act(s, 'vote', 3, { voteId, choice: 'lose' });
      s = scenario === 'tie' ? act(s, 'vote', 4, { voteId, choice: 'continue' }) : act(s, 'finishVote', 0, { voteId });
    }
    assert.equal(s.storyteller, 1); assert.deepEqual(s.hands, hands); assert.equal(s.vote, null); conservation(s);
  }
});

test('successful Challenge optionally returns only latest actual Storyteller play, including special played normally', () => {
  for (const card of [D.storyCards.find(c => !c.isInterrupt), D.storyCards.find(c => c.isInterrupt)]) {
    let s = started(); give(s, 1, card.id); s = act(s, 'play', 1, { cardId: card.id });
    const eventId = s.latestPlay.eventId, afterPlayCount = s.hands[1].length;
    assert.equal(E.view(s, 2, 0).once.returnableCard.id, card.id);
    s = act(s, 'challenge', 2, { returnLatest: true }); s = finish(s, 'lose');
    assert.equal(s.hands[1].includes(card.id), true); assert.equal(s.hands[1].length, afterPlayCount + 2);
    assert.equal(s.history.some(h => h.eventId === eventId), false); assert.equal(s.storyteller, 2); conservation(s);
  }
  let s = started(); s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  const before = gameplay(s); s = act(s, 'challenge', 3, { returnLatest: true });
  assert.equal(s.replies[3].error, 'no_returnable_card'); assert.deepEqual(gameplay(s), before);
});

test('two-player Challenge waits for spoken agreement and failed agreement has no penalty', () => {
  for (const choice of ['lose', 'continue']) {
    let s = started(2), count = s.hands[1].length; s = act(s, 'challenge', 2);
    assert.equal(s.phase, 'CHALLENGE'); assert.deepEqual(s.vote.eligible, []);
    const voteId = s.vote.id; s = act(s, 'finishVote', 0, { voteId }); assert.equal(s.phase, 'CHALLENGE');
    s = act(s, 'resolveSocial', 0, { voteId, choice });
    assert.equal(s.storyteller, choice === 'lose' ? 2 : 1); assert.equal(s.hands[1].length, count + (choice === 'lose' ? 1 : 0)); conservation(s);
  }
});

test('Ending remains locked until storyteller really empties hand; all other players review without interrupts', () => {
  let s = started(4), originalEnding = s.endings[1];
  s = act(s, 'ending', 1); assert.equal(s.replies[1].error, 'ending_locked');
  while (s.hands[1].length) s = act(s, 'play', 1, { cardId: s.hands[1][0] });
  assert.equal(E.view(s, 1, 0).once.endingState, 'ready'); assert.equal(E.view(s, 1, 0).once.actions.ending, true);
  s = act(s, 'ending', 2); assert.equal(s.replies[2].error, 'not_available');
  s = act(s, 'ending', 1); assert.equal(s.phase, 'ENDING_REVIEW'); assert.deepEqual(s.vote.eligible, [2, 3, 4]);
  assert.equal(E.view(s, 0, 0).once.endingCard.id, originalEnding);
  assert.equal(E.view(s, 1, 0).once.endingState, 'review'); assert.equal(E.view(s, 2, 0).once.actions.interrupt, false);
  const before = gameplay(s); s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  assert.equal(s.replies[2].error, 'not_available'); assert.deepEqual(gameplay(s), before);
  s = finish(s, 'accept'); assert.equal(s.phase, 'FINISHED'); assert.equal(s.winner, 1);
  assert.equal(E.view(s, 2, 0).once.endingCard.id, originalEnding); assert.equal(E.view(s, 1, 0).once.actions.play, false); conservation(s);
});

test('Ending majority rejection discards ending, gives new private ending+one story card, then passes left', () => {
  let s = started(4); emptyHand(s, 1); const ending = s.endings[1];
  s = act(s, 'ending', 1); s = finish(s, 'reject');
  assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.storyteller, 2); assert.equal(s.winner, null);
  assert.equal(s.hands[1].length, 1); assert.notEqual(s.endings[1], ending); assert.ok(s.endingDiscard.includes(ending));
  assert.equal(E.view(s, 0, 0).once.endingCard, null); assert.equal(E.view(s, 1, 0).once.endingState, 'locked'); conservation(s);
});

test('tied or incomplete Ending review accepts: rejection requires a majority of all eligible voters', () => {
  for (const [count, rejecting] of [[3, 1], [4, 1], [6, 2]]) {
    let s = started(count); emptyHand(s, 1); s = act(s, 'ending', 1); const voteId = s.vote.id;
    for (let n = 2; n < 2 + rejecting; n++) s = act(s, 'vote', n, { voteId, choice: 'reject' });
    s = act(s, 'finishVote', 0, { voteId }); assert.equal(s.phase, 'FINISHED'); assert.equal(s.winner, 1); conservation(s);
  }
  let s = started(2); emptyHand(s, 1); s = act(s, 'ending', 1); s = finish(s, 'reject');
  assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.storyteller, 2); conservation(s);
});

test('votes are concurrent by vote id, do not advance turn until resolution, and cannot be changed or reused', () => {
  let s = started(6); s = act(s, 'challenge', 2); const voteId = s.vote.id, turnId = s.turnId;
  s = act(s, 'vote', 3, { voteId, turnId: turnId - 99, choice: 'lose' }); assert.equal(s.turnId, turnId);
  s = act(s, 'vote', 3, { voteId, choice: 'continue' }); assert.equal(s.replies[3].error, 'already_voted');
  assert.equal(s.vote.votes[3], 'lose');
  s = act(s, 'vote', 4, { voteId: 'wrong', choice: 'lose' }); assert.equal(s.replies[4].error, 'stale_vote');
  s = act(s, 'vote', 4, { voteId, choice: 'invalid' }); assert.equal(s.replies[4].error, 'invalid_choice');
  for (const n of [4, 5, 6]) s = act(s, 'vote', n, { voteId, turnId, choice: 'lose' });
  assert.equal(s.storyteller, 2); assert.ok(s.turnId > turnId);
  const before = gameplay(s); s = act(s, 'vote', 5, { voteId, turnId, choice: 'lose' });
  assert.equal(s.replies[5].error, 'stale_vote'); assert.deepEqual(gameplay(s), before); conservation(s);
});

test('strict private projections expose only own cards and own ballot; host never sees private state', () => {
  let s = started(6); s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  s = act(s, 'dispute', 1, { interruptId: s.interrupt.id }); const voteId = s.vote.id;
  s = act(s, 'vote', 3, { voteId, choice: 'invalid' });
  for (const actor of [0, 1, 3, 4, 999]) {
    const v = E.view(s, actor, 3000), o = v.once, serialized = JSON.stringify(o);
    for (const privateKey of ['hands', 'endings', 'storyDeck', 'endingDeck', 'storyHeld', 'rollback', 'rngState', 'seen', 'votes']) assert.equal(serialized.includes('"' + privateKey + '"'), false, privateKey);
    for (const p of s.roster) if (p.playerNum !== actor) {
      for (const cardId of s.hands[p.playerNum]) assert.equal(serialized.includes('"' + cardId + '"'), false, 'other hand card id');
      assert.equal(serialized.includes('"' + s.endings[p.playerNum] + '"'), false, 'other ending id');
    }
    assert.equal(o.vote.ownChoice, actor === 3 ? 'invalid' : null);
    assert.equal(o.vote.received, 1);
    if (actor === 0 || actor === 999) { assert.equal('hand' in o, false); assert.equal('ending' in o, false); }
    else { assert.deepEqual(o.hand.map(c => c.id), s.hands[actor]); assert.equal(o.ending.id, s.endings[actor]); }
  }
  const projection = E.view(s, 3, 0); projection.once.hand[0].title = 'mutated'; projection.once.roster[0].name = 'mutated';
  assert.notEqual(E.view(s, 3, 0).once.hand[0].title, 'mutated'); assert.equal(s.roster[0].name, 'Person 1');
});

test('public activity log reveals used/discarded cards but never card draw contents, speech, or private endings', () => {
  let s = started(); s = act(s, 'pass', 1); const drawn = s.hands[1].at(-1);
  const serialized = JSON.stringify(E.view(s, 0, 0).once.log);
  assert.ok(serialized.includes('drew 1 Story Card')); assert.equal(serialized.includes(drawn), false);
  assert.equal(serialized.includes(s.endings[1]), false); assert.equal(serialized.includes('transcript'), false);
  const discard = s.hands[1][0]; s = act(s, 'discard', 1, { cardId: discard });
  assert.ok(E.view(s, 0, 0).once.log.some(item => item.text.includes(D.storyCards.find(c => c.id === discard).title)));
});

test('duplicate, old-session, unauthorized and stale requests never double-play or double-draw', () => {
  let s = started(), cmd = command(s, 'play', 1, { cardId: s.hands[1][0] });
  const frozen = freeze(clone(s)), before = clone(s); const once = E.apply(frozen, cmd); assert.deepEqual(frozen, before);
  assert.equal(E.apply(once, cmd), once);
  assert.equal(E.apply(once, { ...cmd, id: 'outside', actor: 99 }), once);
  assert.equal(E.apply(once, { ...cmd, id: 'older', sessionId: 'older-session' }), once);
  assert.equal(E.apply(once, { ...cmd, id: '' }), once);
  const after = gameplay(once); s = E.apply(once, { ...cmd, id: 'stale' });
  assert.equal(s.replies[1].error, 'stale_turn'); assert.deepEqual(gameplay(s), after);
  s = act(s, 'play', 1, { cardId: cmd.cardId }); assert.equal(s.replies[1].error, 'invalid_card'); assert.deepEqual(gameplay(s), after);
  const pass = command(s, 'pass', 1); s = E.apply(s, pass); assert.equal(E.apply(s, pass), s); conservation(s);
});

test('malformed or unavailable actions only acknowledge error and do not change gameplay', () => {
  let s = started();
  const attempts = [
    ['play', 2, { cardId: s.hands[2][0] }], ['play', 0, { cardId: s.hands[1][0] }],
    ['interrupt', 1, { cardId: s.hands[1][0], mode: 'normal' }], ['interrupt', 2, { cardId: s.hands[2][0], mode: 'other' }],
    ['interrupt', 2, { cardId: 'invented', mode: 'normal' }], ['pass', 2, {}], ['challenge', 1, {}],
    ['challenge', 2, { returnLatest: 'yes' }], ['dispute', 3, { interruptId: 'invented' }],
    ['discard', 1, { cardId: s.hands[1][0] }], ['keepAll', 1, {}], ['ready', 1, { value: true }],
    ['chooseFirst', 0, { playerNum: 2 }], ['randomFirst', 0, {}], ['deal', 0, {}], ['unexpected', 1, {}],
  ];
  for (const [type, actor, extra] of attempts) {
    const before = gameplay(s); s = act(s, type, actor, extra); assert.ok(s.replies[actor].error, type); assert.deepEqual(gameplay(s), before, type);
  }
  conservation(s);
});

test('restart resets readiness/private cards/history, retains seat identities, and excludes old-session requests', () => {
  let s = started(); s = act(s, 'play', 1, { cardId: s.hands[1][0] }); const old = command(s, 'pass', 1);
  const before = gameplay(s); s = act(s, 'restart', 1); assert.equal(s.replies[1].error, 'not_available'); assert.deepEqual(gameplay(s), before);
  s = act(s, 'restart'); assert.notEqual(s.sessionId, old.sessionId); assert.deepEqual(s.roster, roster(4));
  assert.equal(s.phase, 'LOBBY'); assert.deepEqual(s.hands, {}); assert.deepEqual(s.endings, {}); assert.deepEqual(s.readiness, {});
  assert.deepEqual(s.history, []); assert.deepEqual(s.storyDeck, []); assert.equal(s.storyteller, null);
  assert.equal(E.apply(s, old), s); assert.equal(E.view(s, 0, 0).once.actions.deal, true);
  for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
  s = act(s, 'deal'); conservation(s);
});

test('host cancellation clears active vote/actions and never grants player cancellation', () => {
  let s = started(); s = act(s, 'challenge', 2); const before = gameplay(s);
  s = act(s, 'cancel', 3); assert.equal(s.replies[3].error, 'not_available'); assert.deepEqual(gameplay(s), before);
  s = act(s, 'cancel'); assert.equal(s.phase, 'CANCELLED'); assert.equal(s.vote, null); assert.equal(s.storyteller, null);
  const actions = E.view(s, 2, 0).once.actions;
  for (const [key, value] of Object.entries(actions)) assert.equal(value, false, key);
  conservation(s);
});

test('Firebase omission/numeric object arrays and JSON reconnect preserve hands and all rule paths', () => {
  let s = wire(create());
  for (let n = 1; n <= 4; n++) s = act(wire(s), 'ready', n, { value: true });
  s = act(wire(s), 'deal'); s = act(wire(s), 'chooseFirst', 0, { playerNum: 1 });
  const originalHand = clone(s.hands[1]); const reconnected = E.view(wire(s), 1, 4000);
  assert.deepEqual(reconnected.once.hand.map(c => c.id), originalHand);
  s = act(wire(s), 'play', 1, { cardId: originalHand[0] });
  s = act(wire(s), 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  s = act(wire(s), 'dispute', 1, { interruptId: s.interrupt.id }); const voteId = s.vote.id;
  s = act(wire(s), 'vote', 3, { voteId, choice: 'invalid' }); s = act(wire(s), 'vote', 4, { voteId, choice: 'invalid' });
  assert.equal(s.storyteller, 1); s = act(wire(s), 'pass', 1); s = act(wire(s), 'keepAll', 1);
  assert.equal(s.storyteller, 2); conservation(s);
  assert.deepEqual(E.list({ 10: 'ten', 2: 'two', 0: 'zero' }), ['zero', 'two', 'ten']);
});

test('Story Deck exhaustion reshuffles physical discard, preserves chronological history, and reuses event ids safely', () => {
  let s = started(2); const initialStarter = s.starterCard;
  // Long tabletop session: pass, draw, discard, with occasional narrative plays.
  for (let i = 0; i < 180; i++) {
    const actor = s.storyteller;
    const played = s.hands[actor].length && i % 4 === 0;
    if (played) s = act(s, 'play', actor, { cardId: s.hands[actor][0] });
    s = act(s, 'pass', actor); s = act(s, played ? 'keepAll' : 'discard', actor, { cardId: s.hands[actor][0] }); conservation(s);
  }
  assert.ok(s.history.length > 30); assert.equal(s.starterCard, initialStarter);
  assert.equal(new Set(s.history.map(event => event.eventId)).size, s.history.length);
  assert.ok(s.history.every((event, i) => i === 0 || event.at >= s.history[i - 1].at));
});

test('draw exhaustion honestly draws zero if no unreserved card exists; duplicate retries remain no-op', () => {
  let s = started(2); for (const id of [...s.storyDeck, ...s.storyDiscard]) give(s, 2, id);
  assert.equal(s.storyDeck.length, 0); assert.equal(s.storyDiscard.length, 0); conservation(s);
  const count = s.hands[1].length, cmd = command(s, 'pass', 1); s = E.apply(s, cmd);
  assert.equal(s.hands[1].length, count); assert.ok(s.log.some(item => item.text.includes('drew 0 Story Cards')));
  assert.equal(E.apply(s, cmd), s); s = act(s, 'keepAll', 1); conservation(s);
});

test('invalid interrupt after penalty reshuffle exactly restores old hand and conserves every card', () => {
  let s = started(4);
  s.storyDiscard.push(...s.storyDeck); s.storyDeck = [];
  const before = clone(s.hands[1]), used = s.hands[2][0];
  s = act(s, 'interrupt', 2, { cardId: used, mode: 'normal' }); assert.ok(s.storyDeck.length > 0);
  s = act(s, 'dispute', 1, { interruptId: s.interrupt.id }); s = finish(s, 'invalid');
  assert.deepEqual(s.hands[1], before); assert.equal(s.storyteller, 1); conservation(s);
});

test('Ending Deck exhaustion reshuffles discarded endings and keeps replacement private', () => {
  let s = started(4); s.endingDiscard.push(...s.endingDeck); s.endingDeck = [];
  emptyHand(s, 1); const oldEnding = s.endings[1]; s = act(s, 'ending', 1); s = finish(s, 'reject');
  assert.ok(s.endings[1]); assert.ok(s.endingDeck.length); conservation(s);
  assert.equal(JSON.stringify(E.view(s, 0, 0)).includes(s.endings[1]), false);
  assert.equal(E.view(s, 0, 0).once.endingCard, null);
});

test('seen command receipts and diagnostic log are bounded without truncating story history', () => {
  let s = create(2);
  for (let i = 0; i < 90; i++) s = act(s, 'ready', 1, { value: !!(i % 2) });
  assert.equal(s.seen[1].length, 64);
  s = act(s, 'ready', 1, { value: true }); s = act(s, 'ready', 2, { value: true }); s = act(s, 'deal'); s = act(s, 'chooseFirst', 0, { playerNum: 1 });
  for (let i = 0; i < 140; i++) { s = act(s, 'pass', s.storyteller); s = act(s, 'discard', s.storyteller, { cardId: s.hands[s.storyteller][0] }); }
  assert.equal(s.log.length, 128); assert.ok(s.seen[1].length <= 64); conservation(s);
});

test('per-actor receipt id collisions never merge history events or reuse a previous ballot', () => {
  let s = started(6);
  s = act(s, 'play', 1, { id: 'shared-id', cardId: s.hands[1][0] }); const originalEvent = s.history[0].eventId;
  s = act(s, 'interrupt', 2, { id: 'shared-id', cardId: s.hands[2][0], mode: 'normal' });
  assert.notEqual(s.history[1].eventId, originalEvent);
  s = act(s, 'dispute', 1, { interruptId: s.interrupt.id }); s = finish(s, 'invalid');
  assert.equal(s.history.length, 1); assert.equal(s.history[0].eventId, originalEvent);
  s = act(s, 'challenge', 2, { id: 'shared-challenge' }); const oldVoteId = s.vote.id;
  s = act(s, 'finishVote', 0, { voteId: oldVoteId });
  s = act(s, 'challenge', 3, { id: 'shared-challenge' }); assert.notEqual(s.vote.id, oldVoteId);
  const before = gameplay(s); s = act(s, 'vote', 4, { voteId: oldVoteId, choice: 'lose' });
  assert.equal(s.replies[4].error, 'stale_vote'); assert.deepEqual(gameplay(s), before); conservation(s);
});

test('finished winner can restart but cannot be cancelled or altered by late gameplay requests', () => {
  let s = started(2); emptyHand(s, 1); s = act(s, 'ending', 1); s = finish(s, 'accept');
  assert.equal(s.winner, 1); assert.equal(E.view(s, 0, 0).once.actions.cancel, false);
  const before = gameplay(s); s = act(s, 'cancel'); assert.equal(s.replies[0].error, 'not_available'); assert.deepEqual(gameplay(s), before);
  for (const [type, actor] of [['play', 1], ['pass', 1], ['challenge', 2], ['ending', 1], ['continueStory', 1]]) {
    s = act(s, type, actor, { cardId: s.hands[2][0] }); assert.equal(s.replies[actor].error, 'not_available'); assert.deepEqual(gameplay(s), before);
  }
  s = act(s, 'restart'); assert.equal(s.phase, 'LOBBY'); assert.equal(s.winner, null);
});

test('browser global builds use the same deck and engine without CommonJS or external dependencies', () => {
  const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../once-upon-a-time-deck.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../once-upon-a-time-engine.js'), 'utf8'), context);
  assert.equal(typeof context.ONCE_ENGINE.create, 'function'); assert.equal(context.ONCE_DECK.storyCards.length, 114);
  const s = context.ONCE_ENGINE.create({ id: 'browser', roster: roster(2), seed: 1 });
  assert.equal(context.ONCE_ENGINE.view(s, 1, 0).game, 'onceupon'); assert.equal(s.phase, 'LOBBY');
});

test('disputing the newest of successive normal interrupts preserves the older accepted event and exact draws', () => {
  let s = started(6);
  const firstCard = s.hands[2][0], firstTellerCount = s.hands[1].length;
  s = act(s, 'interrupt', 2, { cardId: firstCard, mode: 'normal' });
  const oldEvent = s.history[0].eventId, beforeSecond = clone(s.hands), secondCard = s.hands[3][0];
  s = act(s, 'interrupt', 3, { cardId: secondCard, mode: 'normal' });
  const newestEvent = s.history[1].eventId;
  s = act(s, 'dispute', 2, { interruptId: s.interrupt.id });
  assert.deepEqual(s.vote.eligible, [1, 4, 5, 6]); s = finish(s, 'invalid');
  assert.equal(s.storyteller, 2); assert.deepEqual(s.hands[2], beforeSecond[2]);
  assert.equal(s.hands[1].length, firstTellerCount + 1); assert.equal(s.hands[3].length, beforeSecond[3].length + 1);
  assert.equal(s.history.length, 1); assert.equal(s.history[0].eventId, oldEvent);
  assert.equal(s.history.some(event => event.eventId === newestEvent), false);
  assert.deepEqual(s.storyHeld, []); assert.ok(s.storyDiscard.includes(firstCard));
  assert.equal(E.view(s, 0, 0).once.returnableCard, null); conservation(s);
});

test('return-latest Challenge after continuation closes all held zones without duplicate physical cards', () => {
  let s = started(), cardId = s.hands[1][0];
  s = act(s, 'play', 1, { cardId }); s = act(s, 'continueStory', 1);
  assert.deepEqual(s.storyHeld, [cardId]); assert.equal(s.categoryOpportunity, null);
  s = act(s, 'challenge', 2, { returnLatest: true }); s = finish(s, 'lose');
  assert.deepEqual(s.storyHeld, []); assert.equal(s.latestPlay, null); assert.equal(s.hands[1].filter(id => id === cardId).length, 1);
  assert.equal(E.view(s, 2, 0).once.returnableCard, null); conservation(s);
});

// Actual RTDB numeric-seat maps can become sparse arrays when the highest seat
// votes first. Preserve null placeholders here, unlike the omitted-node helper.
function firebaseBallots(s) {
  s = clone(s);
  if (s.vote) {
    const submitted = Object.entries(s.vote.votes || {}).filter(([, choice]) => choice != null);
    const highest = Math.max(0, ...submitted.map(([seat]) => Number(seat)));
    s.vote.votes = Array(highest + 1).fill(null);
    for (const [seat, choice] of submitted) s.vote.votes[Number(seat)] = choice;
  }
  return s;
}

test('real Firebase sparse ballot arrays count actual eligible submissions and leave null slots available', () => {
  for (const count of [2, 4, 6]) {
    let s = started(count); emptyHand(s, 1); s = act(s, 'ending', 1);
    const voteId = s.vote.id, turnId = s.turnId;
    const last = count;
    s = act(s, 'vote', last, { voteId, choice: 'accept' });
    if (count === 2) { assert.equal(s.phase, 'FINISHED'); conservation(s); continue; }
    s = firebaseBallots(s);
    assert.equal(s.vote.votes.length, count + 1);
    for (const actor of [0, 1, 2, last]) {
      const view = E.view(s, actor, 0).once;
      assert.equal(view.vote.received, 1);
      assert.equal(view.vote.ownChoice, actor === last ? 'accept' : null);
      assert.equal(view.actions.vote, actor === 2);
      assert.equal('votes' in view.vote, false);
    }
    const before = gameplay(E.apply(s, command(s, 'vote', last, { voteId, choice: 'reject' })));
    const duplicate = act(s, 'vote', last, { voteId, choice: 'reject' });
    assert.equal(duplicate.replies[last].error, 'already_voted'); assert.deepEqual(gameplay(duplicate), before);
    for (let actor = count - 1; actor >= 2; actor--) {
      s = act(firebaseBallots(s), 'vote', actor, { voteId, turnId: turnId - 1, choice: 'accept' });
      assert.equal(s.replies[actor].error, '');
      if (actor > 2) { assert.equal(s.phase, 'ENDING_REVIEW'); assert.equal(E.view(s, 0, 0).once.vote.received, count - actor + 1); }
    }
    assert.equal(s.phase, 'FINISHED'); assert.equal(s.winner, 1); conservation(s);
  }
});

test('sparse null ballot arrays never resolve Challenge/dispute before all real eligible voters reply', () => {
  for (const kind of ['challenge', 'interrupt']) {
    let s = started(6);
    if (kind === 'interrupt') {
      s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
      s = act(s, 'dispute', 1, { interruptId: s.interrupt.id });
    } else s = act(s, 'challenge', 2);
    const voteId = s.vote.id, choice = kind === 'interrupt' ? 'invalid' : 'lose';
    s = act(s, 'vote', 6, { voteId, choice }); s = firebaseBallots(s);
    assert.equal(E.view(s, 0, 0).once.vote.received, 1);
    for (const actor of [5, 4]) {
      s = act(firebaseBallots(s), 'vote', actor, { voteId, choice });
      assert.equal(s.replies[actor].error, ''); assert.ok(s.vote, 'not every eligible player has replied');
    }
    s = act(firebaseBallots(s), 'vote', 3, { voteId, choice });
    assert.equal(s.vote, null); assert.equal(s.storyteller, kind === 'interrupt' ? 1 : 2); conservation(s);
  }
});

test('null object slots and invalid/noneligible ballots do not count as votes or expose another choice', () => {
  let s = started(6); s = act(s, 'challenge', 2);
  s.vote.votes = { 0: 'lose', 1: 'lose', 2: 'continue', 3: null, 4: 'continue', 5: '', 6: 'invented' };
  for (const actor of [0, 1, 3, 4, 5, 6]) {
    const v = E.view(s, actor, 0).once;
    assert.equal(v.vote.received, 1); assert.equal(v.vote.ownChoice, actor === 4 ? 'continue' : null);
    assert.equal(v.actions.vote, [3, 5, 6].includes(actor)); assert.equal('votes' in v.vote, false);
  }
  const voteId = s.vote.id;
  for (const actor of [3, 5, 6]) s = act(firebaseBallots(s), 'vote', actor, { voteId, choice: 'continue' });
  assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.storyteller, 1); conservation(s);
});
