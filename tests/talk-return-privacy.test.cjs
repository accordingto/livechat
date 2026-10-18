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
  const prompt = clone(f.state().crazy.prompts[2]);
  return { f, prompt, skip: f.command(2, 'crazySkip', { promptId: prompt.id, renderVersion: 1 }) };
}
const vaultRecords = async f => (await f.store.readRoom(f.code)).filter(record => record.category === 'vault');
function assertPrivateMetadata(f) {
  for (const seat of f.seats) {
    const serialized = JSON.stringify(f.card(seat.playerNum));
    for (const marker of ['crazyVault', 'ownerIdentity', 'archiveId', 'actionReceipts', ...Object.values(f.state().crazyIdentities)]) {
      assert.equal(serialized.includes(marker), false, 'private canonical metadata must not reach player cards');
    }
  }
  const spectator = E.view(f.state(), 0, f.now()).talk.crazy;
  assert.deepEqual(spectator.returnedCards, []); assert.deepEqual(spectator.library, []); assert.equal(spectator.lastResult, null);
}
function assertEditedPrivate(f, text, ownerNum = 1) {
  for (const seat of f.seats.filter(seat => seat.playerNum !== ownerNum)) {
    assert.equal(JSON.stringify(f.card(seat.playerNum)).includes(text), false, 'only the authenticated author sees a private edited variant');
  }
  assert.equal(JSON.stringify(E.view(f.state(), 0, f.now())).includes(text), false);
}
async function freshSession(f, id, firstToken = f.seats[0].token) {
  f.seats[0].token = firstToken;
  const next = E.create({ id, now: f.now(), topic: { question: 'Build our next silly cafe.' },
    roster: f.seats.map(seat => ({ playerNum: seat.playerNum, name: 'Same displayed name ' + seat.playerNum })),
    gameMode: 'crazy', crazyPlayStyle: 'free', crazySource: 'players', conversationMode: 'free', gameSeconds: 900 });
  // No in-memory vault is carried: registration must hydrate the encrypted room
  // archive using each seat's original bearer identity, not its displayed name.
  f.set(f.canonical, { state: next, revision: 1 });
  for (const seat of f.seats) f.set(f.path(seat.playerNum), E.view(next, seat.playerNum, f.now()));
  await f.service.register({ game: 'letstalk', code: f.code, controlToken: f.controlToken, seats: f.seats, sessionId: next.sessionId });
}

test('concurrent exact skip retries charge one point once and durably return handwriting only to its original author', async () => {
  const { f, prompt, skip } = await prepare();
  await Promise.all([f.run(clone(skip)), f.run(clone(skip))]); await f.run(skip);
  assert.equal(f.state().scores[2], -1); assert.equal(f.card(2).talk.scores.find(row => row.playerNum === 2).score, -1);
  const returned = f.card(1).talk.crazy.returnedCards;
  assert.equal(returned.length, 1); assert.equal(returned[0].text, original); assert.equal(returned[0].target, 2);
  assert.deepEqual(f.card(1).talk.crazy.library, []);
  for (const num of [2, 3]) { assert.deepEqual(f.card(num).talk.crazy.returnedCards, []); assert.deepEqual(f.card(num).talk.crazy.library, []); }
  assert.deepEqual(f.card(2).talk.crazy.lastResult, { id: skip.command.id, promptId: prompt.id, source: 'player', status: 'skipped', scoreDelta: -1, at: f.now() });
  assert.equal(f.card(1).talk.crazy.lastResult, null); assert.equal(f.card(3).talk.crazy.lastResult, null);
  const persisted = await vaultRecords(f); assert.equal(persisted.length, 1);
  assert.equal(persisted[0].status, 'returned'); assert.equal(persisted[0].cardId, returned[0].id);
  assert.equal(persisted[0].ownerIdentity, f.state().crazyIdentities[1]);
  const penalties = (await f.store.readRoom(f.code)).filter(record => record.category === 'event' && record.eventType === 'skip_penalty' && record.promptId === prompt.id);
  assert.equal(penalties.length, 1); assert.equal(penalties[0].reason, 'points:-1');
  assert.equal(penalties[0].actor, 2); assert.equal(penalties[0].recipientNum, 2); assert.equal(penalties[0].source, 'player');
  assert.equal(JSON.stringify(penalties).includes(original), false, 'penalty diagnostics contain metadata only');
  const version = persisted[0].version;
  f.advance(1000); await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
  await f.run(skip);
  const stale = f.command(2, 'crazySkip', { promptId: prompt.id, renderVersion: 1 }); await f.run(stale);
  assert.equal(f.state().replies[2].error, 'stale_prompt'); assert.equal(f.state().scores[2], -1);
  assert.equal((await vaultRecords(f))[0].version, version); assert.equal(f.card(1).talk.crazy.returnedCards.length, 1);
  const encrypted = JSON.stringify([...f.nodes].filter(([key]) => key.startsWith('rooms/talk-archive/players/')).map(([, value]) => value));
  assert.equal(encrypted.includes(original), false); assert.equal(encrypted.includes(returned[0].id), false);
  assertPrivateMetadata(f);
});

test('foreign or forged identities cannot resolve returned cards while the original author can edit and save after rotation and sitting out', async () => {
  const { f, skip } = await prepare({ crazyPlayStyle: 'director', crazyRotationSeconds: 60 }); await f.run(skip);
  const returned = clone(f.card(1).talk.crazy.returnedCards[0]), owner = f.state().crazyIdentities[1];
  f.advance(60000); await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
  assert.equal(f.card(1).talk.crazy.role, 'player'); assert.equal(f.card(1).talk.crazy.canAssign, false);
  for (const type of ['crazyReturnSave', 'crazyReturnDelete']) {
    const forged = f.command(2, type, { cardId: returned.id, text: 'STOLEN EDIT', actor: 1, actorIdentity: owner, ownerIdentity: owner });
    await f.run(forged); assert.equal(f.state().replies[2].error, 'invalid_card');
    assert.deepEqual(f.card(1).talk.crazy.returnedCards[0], returned);
  }
  await f.service.setParticipant({ capsule: f.capsule(), token: f.seats[0].token, commandId: 'returned-author-away', playerNum: 1, active: false });
  assert.equal(f.state().roster[0].active, false); assert.equal(f.card(1).talk.crazy.returnedCards[0].id, returned.id);
  const saved = await f.act(1, 'crazyReturnSave', { cardId: returned.id, text: edited }); await f.run(saved.body);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  assert.equal(f.state().scores[2], -1); assert.equal(f.state().roster[0].active, false);
  const records = await vaultRecords(f); assert.equal(records.length, 1); assert.equal(records[0].status, 'saved'); assert.equal(records[0].text, edited);
  assert.equal(records[0].ownerIdentity, owner); assert.ok(records[0].version > returned.version);
  assertEditedPrivate(f, edited); assertPrivateMetadata(f);
});

test('encrypted returned choices follow the original room token across fresh sessions, never a reused ordinal or matching name', async () => {
  const { f, skip } = await prepare(); await f.run(skip);
  const returned = clone(f.card(1).talk.crazy.returnedCards[0]), token = f.seats[0].token, owner = f.state().crazyIdentities[1];
  await freshSession(f, 'return-reconnect-original');
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, [returned]); assert.deepEqual(f.card(1).talk.crazy.library, []);
  assert.equal(f.state().crazyIdentities[1], owner); assertPrivateMetadata(f);
  await freshSession(f, 'return-same-name-new-token', 'd'.repeat(32));
  assert.notEqual(f.state().crazyIdentities[1], owner);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.deepEqual(f.card(1).talk.crazy.library, []);
  const impostor = f.command(1, 'crazyReturnSave', { cardId: returned.id, text: 'New token must not steal this.', actorIdentity: owner });
  await f.run(impostor); assert.equal(f.state().replies[1].error, 'invalid_card');
  assert.equal((await vaultRecords(f)).find(record => record.cardId === returned.id).status, 'returned');
  await freshSession(f, 'return-original-token-again', token);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, [returned]); assert.equal(f.state().crazyIdentities[1], owner);
  const removed = await f.act(1, 'crazyReturnDelete', { cardId: returned.id }); await f.run(removed.body);
  const tombstone = (await vaultRecords(f)).find(record => record.cardId === returned.id);
  assert.equal(tombstone.status, 'deleted'); assert.equal(tombstone.version, returned.version + 1);
  await freshSession(f, 'return-deleted-reconnect', token);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.deepEqual(f.card(1).talk.crazy.library, []);
  assert.equal(f.card(1).talk.crazy.lastResult, null); assertPrivateMetadata(f);
});

test('author edits and deletes a returned copy without changing the executed original recap or reviving it on a new round', async () => {
  const { f, skip } = await prepare(); await f.run(skip);
  const id = f.card(1).talk.crazy.returnedCards[0].id;
  await f.act(1, 'crazyReturnSave', { cardId: id, text: edited });
  const latest = 'Ask your chair to sing very softly.';
  await f.act(1, 'crazyLibraryUpdate', { cardId: id, text: latest });
  assertEditedPrivate(f, latest); assert.equal(f.state().scores[2], -1);
  await f.act(0, 'crazyDrain'); await f.act(0, 'crazyReveal');
  for (const num of [1, 2, 3]) {
    const recap = f.card(num).talk.crazy.revealCards;
    assert.equal(recap.length, 1); assert.equal(recap[0].text, original); assert.equal(recap[0].status, 'skipped');
    assert.equal(recap[0].author, 1); assert.equal(recap[0].recipient, 2); assert.notEqual(recap[0].id, id);
    assert.equal(JSON.stringify(recap).includes(latest), false);
  }
  const history = await f.store.readRoom(f.code);
  assert.ok(history.some(record => (!record.category || record.category === 'challenge') && record.text === original && record.status === 'skipped'));
  assert.ok(history.filter(record => record.category !== 'vault').every(record => record.text !== edited && record.text !== latest));
  assertEditedPrivate(f, latest);
  await f.act(1, 'crazyLibraryDelete', { cardId: id });
  await f.act(0, 'newTopic', { confirm: true, topic: { question: 'Choose our next cafe name.' }, mode: 'think', seconds: 45,
    gameMode: 'crazy', crazyPlayStyle: 'free', showStarters: false });
  assert.deepEqual(f.card(1).talk.crazy.library, []); assert.deepEqual(f.card(1).talk.crazy.returnedCards, []);
  await freshSession(f, 'return-library-tombstone-reconnect');
  assert.deepEqual(f.card(1).talk.crazy.library, []); assert.deepEqual(f.card(1).talk.crazy.returnedCards, []);
  assert.equal((await vaultRecords(f)).find(record => record.cardId === id).status, 'deleted'); assertPrivateMetadata(f);
});

test('archive outages withhold skip and author-save receipts, while exact retries persist one penalty and one returned version', async () => {
  const { f, skip } = await prepare(); f.failArchive(true);
  await assert.rejects(f.run(skip));
  assert.equal(f.state().scores[2], -1); assert.notEqual(f.card(2).talk.reply?.id, skip.command.id);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []);
  f.failArchive(false); await f.run(skip); await f.run(skip);
  assert.equal(f.state().scores[2], -1); assert.equal(f.card(2).talk.reply.id, skip.command.id);
  const returned = clone(f.card(1).talk.crazy.returnedCards[0]);
  assert.equal((await vaultRecords(f)).length, 1); assert.equal((await vaultRecords(f))[0].status, 'returned');
  const save = f.command(1, 'crazyReturnSave', { cardId: returned.id, text: edited });
  f.failArchive(true); await assert.rejects(f.run(save));
  assert.equal(f.card(1).talk.crazy.returnedCards[0].text, original); assert.deepEqual(f.card(1).talk.crazy.library, []);
  assert.notEqual(f.card(1).talk.reply?.id, save.command.id);
  f.failArchive(false); await f.run(save); await f.run(save);
  assert.deepEqual(f.card(1).talk.crazy.returnedCards, []); assert.equal(f.card(1).talk.crazy.library[0].text, edited);
  const records = await vaultRecords(f); assert.equal(records.length, 1); assert.equal(records[0].version, returned.version + 1);
  assert.equal(records[0].status, 'saved'); assert.equal(f.state().scores[2], -1);
  assertEditedPrivate(f, edited); assertPrivateMetadata(f);
});

test('a free system skip immediately replaces only that recipient task and never creates a private author return', async () => {
  const f = fixture({ count: 3, crazyPlayStyle: 'free', crazySource: 'system', gameSeconds: 900, crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  await f.register(); await f.act(0, 'start'); f.advance(5000);
  await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
  const num = Number(Object.keys(f.state().crazy.prompts)[0]); await f.shown(num);
  const prompt = clone(f.state().crazy.prompts[num]), request = f.command(num, 'crazySkip', { promptId: prompt.id, renderVersion: 1 });
  await f.run(request); await f.run(request);
  const replacement = f.state().crazy.prompts[num];
  assert.equal(replacement.status, 'pending'); assert.equal(replacement.source, 'system');
  assert.notEqual(replacement.id, prompt.id); assert.notEqual(replacement.text, prompt.text);
  assert.equal(replacement.at, f.now()); assert.equal(f.state().scores[num], 0);
  assert.ok(f.state().crazy.receivers[num].cooldownUntil <= f.now());
  assert.equal(f.card(num).talk.crazy.lastResult.scoreDelta, 0); assert.equal(f.card(num).talk.crazy.lastResult.source, 'system');
  for (const seat of f.seats) assert.deepEqual(f.card(seat.playerNum).talk.crazy.returnedCards, []);
  assert.deepEqual(await vaultRecords(f), []); assertPrivateMetadata(f);
});
