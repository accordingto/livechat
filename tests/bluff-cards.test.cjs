'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../bluff-king-cards.js');
const setup = count => ({ code: 'BKROOM', playerCount: count, tokens: Array.from({ length: count }, (_, i) => (i + 1).toString(16).padStart(20, '0')), names: Array.from({ length: count }, (_, i) => ['Sam', 'Sam', 'A&B <player>'][i] || 'Player ' + (i + 1)) });
const credential = { version: 2, room: 'BKROOM', token: 'a'.repeat(64), identityId: 'b'.repeat(40), historyToken: 'c'.repeat(64) };

test('existing Hub setup keeps every original name and seat index for 3, 6 and 9 players', () => {
  for (const count of [3, 6, 9]) {
    const original = setup(count), before = JSON.stringify(original);
    assert.deepEqual(C.normalize(original), original);
    assert.equal(JSON.stringify(original), before);
    const normalized = C.normalize({ ...original, tokens: [...original.tokens, 'e'.repeat(20)], names: [...original.names, 'Unused extra'] });
    assert.deepEqual(normalized, original, 'only the configured original count is seated');
    assert.deepEqual(normalized.names.slice(0, 3), ['Sam', 'Sam', 'A&B <player>'], 'duplicate names remain distinct seats');
  }
});

test('setup adapter rejects incomplete, invalid and duplicate bearer seats', () => {
  const good = setup(3);
  for (const bad of [null, {}, { ...good, code: '../ROOM' }, { ...good, playerCount: 2 }, { ...good, playerCount: 10 },
    { ...good, tokens: good.tokens.slice(0, 2) }, { ...good, tokens: ['x'.repeat(20), ...good.tokens.slice(1)] },
    { ...good, tokens: [good.tokens[0], good.tokens[0], good.tokens[2]] }]) assert.equal(C.normalize(bad), null);
});

test('readSetup imports the original Hub session without creating a replacement room', () => {
  const original = setup(6), values = new Map([['room-last-session', original.code], ['room-session-' + original.code, JSON.stringify(original)]]);
  const storage = { getItem: key => values.get(key) || null, setItem() { assert.fail('reading setup must not create or rewrite room credentials'); } };
  assert.deepEqual(C.readSetup(storage), original);
  values.set('room-session-' + original.code, '{bad');
  assert.equal(C.readSetup(storage), null);
});

test('private v2 frame puts only one seat credential in the fragment', () => {
  const url = new URL(C.frameURL({ ...credential, hostToken: 'forbidden-host', privateKey: 'forbidden-key', otherSeats: ['forbidden-other-seat'] }, 'https://hub.example/play.html?s=OLD&p=old-player#old-host'));
  assert.equal(url.pathname, '/bluff-king-live-chat.html');
  assert.equal(url.searchParams.get('room'), credential.room);
  assert.equal(url.searchParams.get('card'), '1');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['card', 'room']);
  const fragment = new URLSearchParams(url.hash.slice(1));
  assert.deepEqual([...fragment.keys()].sort(), ['history', 'identity', 'session']);
  assert.equal(fragment.get('session'), credential.token);
  assert.equal(fragment.get('identity'), credential.identityId);
  assert.equal(fragment.get('history'), credential.historyToken);
  assert.equal(url.search.includes(credential.token), false, 'seat secrets do not enter the network query');
  assert.equal(url.href.includes('forbidden'), false);
  assert.equal(url.href.includes('old-player'), false);
  assert.deepEqual(C.readCard(url.hash, credential.room), credential);
});

test('malformed v2 credentials cannot produce a private frame or auto-connect credential', () => {
  for (const bad of [{ ...credential, token: 'short' }, { ...credential, identityId: 'a'.repeat(39) },
    { ...credential, historyToken: 'g'.repeat(64) }, { ...credential, room: '<script>' }, { ...credential, version: 3 }]) assert.equal(C.frameURL(bad, 'https://hub.example/play.html'), null);
  for (const hash of ['', '#session=short', '#session=' + credential.token + '&identity=' + credential.identityId,
    '#session=' + credential.token + '&identity=' + credential.identityId + '&history=short']) assert.equal(C.readCard(hash, credential.room), null);
  assert.equal(C.readCard('#session=' + credential.token + '&identity=' + credential.identityId + '&history=' + credential.historyToken, '../ROOM'), null);
});

test('legacy v1 card markers remain compatible without a credential fragment', () => {
  const url = new URL(C.frameURL({ version: 1, room: credential.room }, 'https://hub.example/play.html?s=OLD&p=old-player#host-secret'));
  assert.equal(url.pathname, '/bluff-king-live-chat.html');
  assert.equal(url.searchParams.get('room'), credential.room);
  assert.equal(url.searchParams.get('card'), '1');
  assert.equal(url.hash, '');
  assert.equal(C.readCard(url.hash, credential.room), null);
  assert.equal(C.frameURL({ version: 1, room: '../ROOM' }, 'https://hub.example/play.html'), null);
});
