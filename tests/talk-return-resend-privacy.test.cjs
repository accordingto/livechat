'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const { fixture } = require('./helpers/talk-vnext-fixture.cjs');
const clone = value => structuredClone(value);
const original = 'Tell your spoon it is beautiful.';
const edited = 'Ask your cup to sing a love song.';

async function prepare(options = {}) {
  const f = fixture({ count: 3, crazyPlayStyle: 'free', gameSeconds: 900, ...options });
  await f.register(); await f.act(0, 'start');
  await f.act(1, 'crazyAssign', { target: 2, text: original }); await f.shown(2);
  const prompt = f.state().crazy.prompts[2];
  await f.act(2, 'crazySkip', { promptId: prompt.id, renderVersion: 1 });
  const returned = clone(f.card(1).talk.crazy.returnedCards[0]);
  const oldCard = clone(Object.values(f.state().crazy.roundCards).find(card => card.text === original));
  return { f, returned, oldCard };
}
const vaultRecords = async f => (await f.store.readRoom(f.code)).filter(record => record.category === 'vault');
const newCards = (f, request) => Object.values(f.state().crazy.roundCards).filter(card => card.commandId === request.command.id);
function assertUnchangedReturn(f, returned, oldCard) {
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, [returned]);
  assert.deepEqual(f.card(1).talk.crazy.library, []);
  assert.deepEqual(Object.values(f.state().crazy.roundCards).find(card => card.archiveId === oldCard.archiveId), oldCard);
}
function assertPrivateMetadata(f) {
  for (const seat of f.seats) {
    const serialized = JSON.stringify(f.card(seat.playerNum));
    for (const marker of ['crazyVault', 'ownerIdentity', 'archiveId', 'actionReceipts', ...Object.values(f.state().crazyIdentities)]) {
      assert.equal(serialized.includes(marker), false, 'private canonical metadata must not reach a player projection');
    }
  }
  const shared = E.view(f.state(), 0, f.now()).talk.crazy;
  assert.deepEqual(shared.returnedCards, []); assert.deepEqual(shared.library, []);
}
function assertTextOnlyFor(f, text, allowed) {
  for (const seat of f.seats) if (!allowed.includes(seat.playerNum)) {
    assert.equal(JSON.stringify(f.card(seat.playerNum)).includes(text), false, 'only the author and chosen recipient may see the new task');
  }
  assert.equal(JSON.stringify(E.view(f.state(), 0, f.now())).includes(text), false);
}
async function denied(f, n, type, extra, error) {
  const body = f.command(n, type, extra); await f.run(body);
  assert.equal(f.state().replies[n].error, error); return body;
}
async function freshSession(f, id, firstToken = f.seats[0].token) {
  f.seats[0].token = firstToken;
  const next = E.create({ id, now: f.now(), topic: { question: 'Build our next silly cafe.' },
    roster: f.seats.map(seat => ({ playerNum: seat.playerNum, name: 'Same name ' + seat.playerNum })),
    gameMode: 'crazy', crazyPlayStyle: 'free', crazySource: 'players', conversationMode: 'free', gameSeconds: 900 });
  f.set(f.canonical, { state: next, revision: 1 });
  for (const seat of f.seats) f.set(f.path(seat.playerNum), E.view(next, seat.playerNum, f.now()));
  await f.service.register({ game: 'letstalk', code: f.code, controlToken: f.controlToken, seats: f.seats, sessionId: next.sessionId });
}

test('edited returned resend is one authenticated submission and one saved revision under concurrent exact retries', async () => {
  const { f, returned, oldCard } = await prepare();
  const request = f.command(1, 'crazyReturnSend', { cardId: returned.id, text: '  ' + edited + '  ', target: 3 });
  await Promise.all([f.run(clone(request)), f.run(clone(request))]); await f.run(request);
  assert.equal(f.state().replies[1].error, '');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []);
  assert.deepEqual(f.card(1).talk.crazy.library, [{ id: returned.id, text: edited, target: 3, version: returned.version + 1 }]);
  assert.equal(newCards(f, request).length, 1); assert.equal(newCards(f, request)[0].text, edited);
  assert.equal(f.state().crazy.prompts[3].text, edited); assert.equal(f.state().crazy.prompts[3].source, 'player');
  assert.equal(f.state().scores[2], -1); assert.equal(f.state().scores[3], 0);
  assert.deepEqual(Object.values(f.state().crazy.roundCards).find(card => card.archiveId === oldCard.archiveId), oldCard);
  assertTextOnlyFor(f, edited, [1, 3]); assertPrivateMetadata(f);
  const records = await vaultRecords(f); assert.equal(records.length, 1);
  assert.equal(records[0].status, 'saved'); assert.equal(records[0].text, edited); assert.equal(records[0].targetNum, 3);
  assert.equal(records[0].version, returned.version + 1);
  const altered = clone(request); altered.command.text = 'A retry must not change this card.'; altered.command.target = 2;
  await f.run(altered);
  assert.equal(newCards(f, request).length, 1); assert.equal(f.state().crazy.prompts[3].text, edited);
  assert.equal(f.card(1).talk.crazy.library[0].text, edited); assert.equal((await vaultRecords(f))[0].version, returned.version + 1);
  await f.shown(3); await f.act(3, 'crazyDone', { promptId: f.state().crazy.prompts[3].id, renderVersion: 1 });
  await f.act(0, 'crazyDrain'); await f.act(0, 'crazyReveal');
  for (const num of [1, 2, 3]) {
    const recap = f.card(num).talk.crazy.revealCards;
    assert.equal(recap.length, 2);
    assert.equal(recap.find(card => card.id === oldCard.id).text, original);
    assert.equal(recap.find(card => card.id === oldCard.id).status, 'skipped');
    assert.equal(recap.filter(card => card.text === edited).length, 1);
  }
});

test('invalid or forged returned sends preserve the original private choice and create no task', async () => {
  const { f, returned, oldCard } = await prepare();
  for (const text of ['', '   ', 'x'.repeat(121)]) {
    const request = await denied(f, 1, 'crazyReturnSend', { cardId: returned.id, text, target: 3 }, 'invalid_prompt');
    assert.equal(newCards(f, request).length, 0); assertUnchangedReturn(f, returned, oldCard);
  }
  for (const target of [1, 99]) {
    await denied(f, 1, 'crazyReturnSend', { cardId: returned.id, text: edited, target }, 'invalid_target');
    assertUnchangedReturn(f, returned, oldCard);
  }
  for (const type of ['crazyReturnSend', 'crazyLibrarySend']) {
    await denied(f, 3, type, { cardId: returned.id, text: edited, target: 2,
      actor: 1, actorIdentity: f.state().crazyIdentities[1], ownerIdentity: f.state().crazyIdentities[1] }, 'invalid_card');
    assertUnchangedReturn(f, returned, oldCard);
  }
  await denied(f, 1, 'crazyLibrarySend', { cardId: returned.id, text: edited, target: 3 }, 'invalid_card');
  const wrongSession = f.command(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3, sessionId: 'obsolete-session' });
  await f.run(wrongSession); assert.notEqual(f.card(1).talk.reply?.id, wrongSession.command.id);
  assert.equal(newCards(f, wrongSession).length, 0); assertUnchangedReturn(f, returned, oldCard);
  const unauthenticated = f.command(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 }); unauthenticated.token = 'f'.repeat(32);
  await assert.rejects(f.run(unauthenticated), { code: 'wrong_player' });
  assertUnchangedReturn(f, returned, oldCard);
  const record = (await vaultRecords(f))[0]; assert.equal(record.status, 'returned'); assert.equal(record.version, returned.version);
  assertTextOnlyFor(f, edited, []); assertPrivateMetadata(f);
});

test('actor, inactive, and closed-round owners retain their return when sending is forbidden', async () => {
  const { f, returned, oldCard } = await prepare({ crazyPlayStyle: 'director', crazyRotationSeconds: 60 });
  f.advance(60000); await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
  assert.equal(f.card(1).talk.crazy.role, 'player');
  await denied(f, 1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 }, 'not_director');
  assertUnchangedReturn(f, returned, oldCard);
  await f.service.setParticipant({ capsule: f.capsule(), token: f.seats[0].token, commandId: 'resend-author-away', playerNum: 1, active: false });
  assert.equal(f.card(1).talk.crazy.returnedCards[0].id, returned.id);
  await assert.rejects(f.run(f.command(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 })), { code: 'not_eligible' });
  assertUnchangedReturn(f, returned, oldCard);
  const ended = await prepare(); await ended.f.act(0, 'crazyDrain');
  await denied(ended.f, 1, 'crazyReturnSend', { cardId: ended.returned.id, text: edited, target: 3 }, 'queue_locked');
  assertUnchangedReturn(ended.f, ended.returned, ended.oldCard);
  assertTextOnlyFor(ended.f, edited, []); assertPrivateMetadata(f); assertPrivateMetadata(ended.f);
});

test('a full author queue retains the returned draft; freeing capacity never automatically resends it', async () => {
  const { f, returned, oldCard } = await prepare();
  for (let n = 0; n < 10; n++) await f.act(1, 'crazyAssign', { target: 2, text: 'Queued chicken number ' + n + '.' });
  assert.equal(f.state().crazy.queue.length, 10);
  const failed = await denied(f, 1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 }, 'queue_full');
  assert.equal(newCards(f, failed).length, 0); assertUnchangedReturn(f, returned, oldCard);
  f.advance(30000); await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
  assert.equal(f.state().crazy.queue.length, 9); assert.equal(f.state().crazy.prompts[3], undefined);
  await f.run(failed); assert.equal(newCards(f, failed).length, 0); assertUnchangedReturn(f, returned, oldCard);
  assert.equal((await vaultRecords(f))[0].status, 'returned');
  const accepted = await f.act(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 });
  assert.equal(newCards(f, accepted.body).length, 1); assert.equal(f.state().crazy.prompts[3].text, edited);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].version, returned.version + 1);
  assert.equal(f.state().crazy.queue.length, 9); assertTextOnlyFor(f, edited, [1, 3]); assertPrivateMetadata(f);
});

test('returned random sends hydrate only the original room token and fence off obsolete-session replay', async () => {
  const { f, returned } = await prepare(), token = f.seats[0].token;
  const obsolete = f.command(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 });
  await freshSession(f, 'return-resend-replacement-token', 'd'.repeat(32)); await f.act(0, 'start');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []);
  await denied(f, 1, 'crazyReturnSend', { cardId: returned.id, text: edited }, 'invalid_card');
  await assert.rejects(f.run(obsolete), { code: 'stale_session' });
  await freshSession(f, 'return-resend-original-token', token); await f.act(0, 'start');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, [returned]);
  const sent = await f.act(1, 'crazyReturnSend', { cardId: returned.id, text: edited }); await f.run(sent.body);
  const card = newCards(f, sent.body); assert.equal(card.length, 1); assert.equal(card[0].target, null);
  assert.ok([2, 3].includes(card[0].recipient)); assert.equal(f.state().crazy.prompts[card[0].recipient].text, edited);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assert.equal(f.card(1).talk.crazy.library[0].target, null); assertTextOnlyFor(f, edited, [1, card[0].recipient]);
  await freshSession(f, 'return-resend-saved-reconnect', token);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assert.equal(f.card(1).talk.crazy.library[0].id, returned.id); assertPrivateMetadata(f);
});

test('archive failure withholds resend publication and exact retry persists one accepted edited task', async () => {
  const { f, returned } = await prepare();
  const request = f.command(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 3 });
  f.failArchive(true); await assert.rejects(f.run(request));
  assert.equal(newCards(f, request).length, 1, 'accepted canonical command survives the transport outage');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, [returned]); assert.deepEqual(f.card(1).talk.crazy.library, []);
  assert.notEqual(f.card(1).talk.reply?.id, request.command.id); assertTextOnlyFor(f, edited, []);
  f.failArchive(false); await f.run(request); await f.run(request);
  assert.equal(newCards(f, request).length, 1); assert.equal(f.state().scores[2], -1);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assert.equal(f.card(3).talk.crazy.prompt.text, edited);
  const records = await vaultRecords(f); assert.equal(records.length, 1); assert.equal(records[0].status, 'saved');
  assert.equal(records[0].version, returned.version + 1);
  assertTextOnlyFor(f, edited, [1, 3]); assertPrivateMetadata(f);
});

test('ordinary library send edits the first text atomically and omitted text uses its latest saved wording', async () => {
  const { f, returned, oldCard } = await prepare();
  await f.act(1, 'crazyReturnSave', { cardId: returned.id });
  const before = clone(f.card(1).talk.crazy.library[0]);
  for (const extra of [{ text: '   ', target: 3 }, { text: edited, target: 1 }]) {
    await denied(f, 1, 'crazyLibrarySend', { cardId: returned.id, ...extra }, extra.target === 1 ? 'invalid_target' : 'invalid_prompt');
    assert.deepEqual(f.card(1).talk.crazy.library, [before]); assertTextOnlyFor(f, edited, []);
  }
  const sent = await f.act(1, 'crazyLibrarySend', { cardId: returned.id, text: edited, target: 3 }); await f.run(sent.body);
  assert.equal(newCards(f, sent.body).length, 1); assert.equal(f.card(3).talk.crazy.prompt.text, edited);
  assert.deepEqual(f.card(1).talk.crazy.library, [{ ...before, text: edited, target: 3, version: before.version + 1 }]);
  assert.deepEqual(Object.values(f.state().crazy.roundCards).find(card => card.archiveId === oldCard.archiveId), oldCard);
  const fallback = await f.act(1, 'crazyLibrarySend', { cardId: returned.id });
  assert.equal(newCards(f, fallback.body).length, 1); assert.equal(newCards(f, fallback.body)[0].text, edited);
  assert.equal(newCards(f, fallback.body)[0].target, null); assert.equal(f.state().crazy.queue.length, 1);
  assert.equal(f.state().crazy.queue[0].text, edited); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assert.equal((await vaultRecords(f))[0].text, edited); assertTextOnlyFor(f, edited, [1, 3]); assertPrivateMetadata(f);
});

test('accepted returned resend waits behind the mission cap without overwriting or duplicating another recipient', async () => {
  const { f, returned } = await prepare({ count: 5, crazyMaxActive: 1 });
  await f.act(4, 'crazyAssign', { text: 'Make one quiet chicken sound.', target: 3 }); await f.shown(3);
  const blocker = clone(f.state().crazy.prompts[3]);
  const sent = await f.act(1, 'crazyReturnSend', { cardId: returned.id, text: edited, target: 5 }); await f.run(sent.body);
  assert.deepEqual(f.state().crazy.prompts[3], blocker); assert.equal(f.state().crazy.prompts[5], undefined);
  assert.equal(f.state().crazy.queue.length, 1); assert.equal(f.state().crazy.queue[0].text, edited);
  assert.equal(newCards(f, sent.body).length, 1); assert.equal(newCards(f, sent.body)[0].status, 'queued');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assertTextOnlyFor(f, edited, [1]);
  await f.act(3, 'crazyDone', { promptId: blocker.id, renderVersion: 1 });
  assert.equal(f.state().crazy.prompts[5].text, edited); assert.equal(f.state().crazy.prompts[3].status, 'done');
  assert.equal(f.state().crazy.queue.length, 0); assert.equal(newCards(f, sent.body).length, 1);
  assert.equal(f.state().scores[2], -1); assert.equal(f.state().scores[3], 1); assert.equal(f.state().scores[5], 0);
  assertTextOnlyFor(f, edited, [1, 5]); assertPrivateMetadata(f);
});
