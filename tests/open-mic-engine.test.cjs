const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../open-mic-engine.js');
const C = require('../open-mic-content.js');
let serial = 0;
const create = (extra = {}) => E.create({ id: 'mic-session', roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'Player ' + playerNum })), now: 1000, seed: 120, ...extra });
const act = (s, type, extra = {}) => E.apply(s, { id: 'command-' + ++serial, sessionId: s.sessionId, turnId: s.turnId,
  actor: 0, type, now: s.lastChangeAt + 1, seed: serial * 739, ...extra });
const choice = (result = 'success') => act(create(), result);
const singing = (result = 'success') => {
  let s = choice(result);
  s = act(s, 'selectSong', { actor: s.spotlight, videoId: s.songLibrary[0].videoId });
  return act(s, 'startSinging', { actor: s.spotlight });
};
const error = (s, actor = 0) => s.replies[actor]?.error;

test('create starts a named Spotlight with bilingual challenge and 35-second optional singing', () => {
  const s = create();
  assert.equal(s.spotlight, 1); assert.equal(s.round, 1); assert.equal(s.phase, 'challenge');
  assert.equal(s.teamScore, 0); assert.equal(s.duration, 35); assert.equal(s.selectedSong, null);
  assert.equal(s.singingState, 'idle'); assert.equal(s.singingStartedAt, null);
  assert.ok(C.challenges.length >= 15); assert.equal(new Set(C.challenges.map(c => c.id)).size, C.challenges.length);
  assert.ok(C.challenges.every(c => ['title', 'situation', 'challenge', 'successRule'].every(key => c[key].en && c[key].zh)));
  assert.ok(C.challenges.every(c => c.duration >= 20 && c.duration <= 45));
  assert.equal(create({ singingDuration: 50 }).duration, 50);
  assert.throws(() => create({ singingDuration: -1 }), /invalid_duration/);
  assert.throws(() => create({ roster: [{ playerNum: 1 }, { playerNum: 1 }] }), /invalid_roster/);
  assert.throws(() => create({ roster: [{ playerNum: 1 }, { playerNum: 2, active: false }] }), /not_enough_players/);
});

test('only the host can judge; song selection and singing unlock after one locked result', () => {
  let s = create(); const videoId = s.songLibrary[0].videoId;
  for (const type of ['success', 'failed', 'newChallenge', 'next', 'exclude']) {
    const rejected = act(s, type, { actor: 1, playerNum: 2, active: false });
    assert.equal(error(rejected, 1), 'not_available'); assert.equal(rejected.phase, 'challenge'); assert.equal(rejected.teamScore, 0);
  }
  for (const type of ['selectSong', 'startSinging', 'skip', 'inviteDuet']) {
    assert.equal(error(act(s, type, { actor: 1, playerNum: 2, videoId }), 1), 'not_available');
  }
  s = act(s, 'success'); assert.equal(s.challengeResult, 'success'); assert.equal(s.phase, 'choice'); assert.equal(s.teamScore, 2);
  for (const type of ['success', 'failed', 'newChallenge']) {
    const repeated = act(s, type); assert.equal(error(repeated), 'not_available'); assert.equal(repeated.teamScore, 2); assert.equal(repeated.challengeResult, 'success');
  }
  assert.equal(error(act(s, 'selectSong', { actor: 2, videoId }), 2), 'not_available');
  assert.equal(error(act(s, 'startSinging', { actor: 1 }), 1), 'choose_song');
  s = act(s, 'selectSong', { actor: 1, videoId }); assert.equal(s.selectedSong.videoId, videoId);
  s = act(s, 'startSinging', { actor: 1 }); assert.equal(s.phase, 'singing');
});

test('all cooperative score paths award exactly the challenge and optional singing points', () => {
  for (const result of ['success', 'failed']) {
    const base = result === 'success' ? 2 : 0;
    const skipped = act(choice(result), 'skip', { actor: 1 });
    assert.equal(skipped.phase, 'finished'); assert.equal(skipped.teamScore, base);
    assert.equal(E.view(skipped, 1).openmic.singingAwarded, false);
    let sung = singing(result);
    const started = sung.singingStartedAt;
    sung = act(sung, 'finishSinging', { actor: 1, now: started + 36000 });
    assert.equal(sung.teamScore, base + 1); assert.equal(sung.phase, 'finished'); assert.equal(sung.singingState, 'finished');
    assert.equal(E.view(sung, 1).openmic.singingAwarded, true);
    assert.equal(act(sung, 'finishSinging', { actor: 1 }).teamScore, base + 1);
    assert.equal(act(sung, 'next').teamScore, base + 1);
    const manualNext = act(singing(result), 'next');
    assert.equal(manualNext.teamScore, base + 1); assert.equal(manualNext.spotlight, 2); assert.equal(manualNext.phase, 'challenge');
  }
});

test('timer expiry never scores, finishes, changes songs, or advances the Spotlight', () => {
  const s = singing('failed');
  const before = JSON.stringify(s);
  for (const now of [s.singingStartedAt + 35000, s.singingStartedAt + 3600000]) {
    assert.equal(E.view(s, 2, now).openmic.phase, 'singing');
    assert.equal(E.view(s, 2, now).openmic.teamScore, 0);
    assert.equal(act(s, 'tick', { now }), s);
  }
  assert.equal(JSON.stringify(s), before);
  // The performer may naturally finish a short section early; duration is guidance.
  assert.equal(act(s, 'finishSinging', { actor: 1 }).teamScore, 1);
  assert.equal(act(s, 'skip', { actor: 1 }).teamScore, 0);
});

test('round-robin Spotlight skips excluded players and each turn resets stage fields', () => {
  let s = singing();
  s = act(s, 'inviteDuet', { actor: 1, playerNum: 3 });
  s = act(s, 'exclude', { playerNum: 2, active: false });
  s = act(s, 'next');
  assert.equal(s.spotlight, 3); assert.equal(s.round, 2); assert.equal(s.teamScore, 3);
  assert.equal(s.challengeResult, null); assert.equal(s.selectedSong, null); assert.equal(s.duet, null);
  assert.equal(s.singingStartedAt, null); assert.equal(s.singingState, 'idle');
  assert.equal(act(s, 'next').spotlight, 1);
  s = act(s, 'exclude', { playerNum: 2, active: true });
  s = act(s, 'next'); assert.equal(s.spotlight, 1);
  s = act(s, 'next'); assert.equal(s.spotlight, 2);
});

test('excluding Spotlight abandons unfinished singing without +1 and recovers after everyone returns', () => {
  let s = singing();
  s = act(s, 'exclude', { playerNum: 1, active: false });
  assert.equal(s.spotlight, 2); assert.equal(s.teamScore, 2); assert.equal(s.phase, 'challenge');
  s = act(s, 'exclude', { playerNum: 2, active: false }); assert.equal(s.spotlight, 3);
  s = act(s, 'exclude', { playerNum: 3, active: false });
  assert.equal(s.spotlight, null); assert.equal(s.challenge, null); assert.equal(s.phase, 'finished');
  assert.equal(error(act(s, 'next')), 'not_enough_players');
  s = act(s, 'exclude', { playerNum: 2, active: true });
  assert.equal(s.spotlight, 2); assert.equal(s.phase, 'challenge'); assert.equal(s.teamScore, 2);
});

test('duet allows one active non-Spotlight partner without changing score or restarting the timer', () => {
  let s = singing('failed'); const started = s.singingStartedAt;
  assert.equal(error(act(s, 'inviteDuet', { actor: 1, playerNum: 1 }), 1), 'invalid_player');
  assert.equal(error(act(s, 'inviteDuet', { actor: 2, playerNum: 3 }), 2), 'not_available');
  s = act(s, 'inviteDuet', { actor: 1, playerNum: 2 }); assert.equal(s.duet, 2);
  s = act(s, 'inviteDuet', { actor: 1, playerNum: 3 }); assert.equal(s.duet, 3);
  assert.equal(s.teamScore, 0); assert.equal(s.singingStartedAt, started);
  s = act(s, 'exclude', { playerNum: 3, active: false }); assert.equal(s.duet, null);
  assert.equal(error(act(s, 'inviteDuet', { actor: 1, playerNum: 3 }), 1), 'invalid_player');
  s = act(s, 'inviteDuet', { actor: 1, playerNum: 2 });
  s = act(s, 'inviteDuet', { actor: 1, playerNum: null }); assert.equal(s.duet, null);
  assert.equal(act(s, 'finishSinging', { actor: 1 }).teamScore, 1);
});

test('challenges avoid every repeat until the whole bank has been used, including deck boundaries', () => {
  let s = create(); const ids = [s.challenge.id];
  for (let i = 1; i < C.challenges.length; i++) { s = act(s, 'newChallenge'); ids.push(s.challenge.id); }
  assert.equal(new Set(ids).size, C.challenges.length);
  const last = s.challenge.id;
  s = act(s, 'newChallenge'); assert.notEqual(s.challenge.id, last); assert.equal(s.challengeHistory.length, 1);
  const secondDeck = [s.challenge.id];
  for (let i = 1; i < C.challenges.length; i++) { s = act(s, 'next'); secondDeck.push(s.challenge.id); }
  assert.equal(new Set(secondDeck).size, C.challenges.length);
});

test('seeded transactions are immutable and deterministic; duplicate IDs and stale sessions cannot score twice', () => {
  const initial = create(); const before = JSON.stringify(initial);
  const command = { actor: 0, type: 'success', id: 'judge-once', sessionId: initial.sessionId, turnId: initial.turnId, now: 1001, seed: 19 };
  const once = E.apply(initial, command);
  assert.equal(JSON.stringify(initial), before); assert.deepEqual(E.apply(initial, command), once);
  assert.equal(E.apply(once, command), once);
  assert.equal(E.apply(once, { ...command, id: 'new-id', sessionId: 'old' }), once);
  const stale = E.apply(once, { ...command, id: 'new-id' });
  assert.equal(error(stale), 'stale_turn'); assert.equal(stale.teamScore, 2);
  const nextCommand = { ...command, id: 'next-id', type: 'next', turnId: once.turnId, now: 1002, seed: 90 };
  assert.deepEqual(E.apply(once, nextCommand), E.apply(once, nextCommand));
  assert.equal(E.apply(once, { ...nextCommand, actor: 55 }), once);
  assert.equal(E.apply(once, { ...nextCommand, actor: null }), once);
});

test('state-changing stage commands reject stale phase IDs, invalid time and unsupported score manipulation', () => {
  const s = choice();
  assert.equal(error(act(s, 'skip', { now: 999 })), 'invalid_time');
  assert.equal(error(act(s, 'skip', { now: NaN })), 'invalid_time');
  assert.equal(error(act(s, 'selectSong', { videoId: 'nonexistent' })), 'invalid_song');
  const selected = act(s, 'selectSong', { videoId: s.songLibrary[0].videoId });
  const staleStart = act(selected, 'startSinging', { turnId: s.turnId });
  assert.equal(error(staleStart), 'stale_turn'); assert.equal(staleStart.phase, 'choice');
  for (const type of ['applause', 'setScore', 'singingQuality', 'award']) {
    const rejected = act(s, type, { points: 100 });
    assert.equal(error(rejected), 'not_available'); assert.equal(rejected.teamScore, 2);
  }
});

test('supported YouTube URLs extract exactly one safe video ID and canonical embeds need no URL input', () => {
  const id = 'dQw4w9WgXcQ';
  for (const url of ['https://youtube.com/watch?v=' + id, 'https://www.youtube.com/watch?v=' + id + '&t=20',
    'http://m.youtube.com/watch?v=' + id, 'https://youtu.be/' + id + '?si=example',
    'https://youtube.com/embed/' + id, 'https://www.youtube.com/shorts/' + id + '/',
    ' https://music.youtube.com/watch?v=' + id + ' ']) assert.equal(E.parseYouTube(url), id, url);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'youtube.com/watch?v=' + id, '//youtu.be/' + id,
    'ftp://youtu.be/' + id, 'https://youtube.com.evil.test/watch?v=' + id,
    'https://evil.test/youtube.com/watch?v=' + id, 'https://youtu.be.evil.test/' + id,
    'https://user:password@youtube.com/watch?v=' + id, 'https://youtube.com:123/watch?v=' + id,
    'https://youtube.com/watch?v=short', 'https://youtube.com/watch?v=' + id + '&v=abcdefghijk',
    'https://youtu.be/' + id + '/extra', 'https://youtube.com/embed/' + id + '/extra',
    'https://youtube.com./watch?v=' + id, 'https://youtubｅ.com/watch?v=' + id]) assert.equal(E.parseYouTube(url), null, url);
});

test('custom songs immediately join their owner favorites and duplicates never expand or overwrite the library', () => {
  let s = create(); const count = s.songLibrary.length, turn = s.turnId;
  s = act(s, 'addSong', { actor: 2, title: 'My comfortable song', url: 'https://youtu.be/abcdefghijk' });
  assert.equal(error(s, 2), ''); assert.equal(s.songLibrary.length, count + 1); assert.equal(s.turnId, turn);
  assert.deepEqual(s.mySongs[2], ['abcdefghijk']); assert.deepEqual(s.mySongs[1], []);
  const song = s.songLibrary.at(-1);
  assert.equal(song.ownerPlayerNum, 2); assert.equal(song.custom, true); assert.equal(song.url, 'https://www.youtube.com/watch?v=abcdefghijk');
  s = act(s, 'addSong', { actor: 3, title: 'Another name', url: 'https://youtube.com/shorts/abcdefghijk' });
  assert.equal(s.songLibrary.length, count + 1); assert.equal(s.songLibrary.at(-1).title, 'My comfortable song');
  assert.deepEqual(s.mySongs[3], ['abcdefghijk']);
  s = act(s, 'next'); assert.deepEqual(s.mySongs[2], ['abcdefghijk']);
  s = act(s, 'failed');
  s = act(s, 'selectSong', { actor: 2, videoId: 'abcdefghijk' });
  assert.equal(s.selectedSong.videoId, 'abcdefghijk');
});

test('favorite edits are isolated by player and host can manage a selected player', () => {
  let s = create(); const videoId = s.songLibrary[0].videoId, turn = s.turnId;
  const unauthorized = act(s, 'toggleFavorite', { actor: 2, ownerPlayerNum: 1, videoId });
  assert.equal(error(unauthorized, 2), 'not_available'); assert.deepEqual(unauthorized.mySongs[1], []);
  assert.equal(error(act(s, 'addSong', { actor: 2, ownerPlayerNum: 1, title: 'Mine', url: 'https://youtu.be/abcdefghijk' }), 2), 'not_available');
  s = act(s, 'toggleFavorite', { actor: 2, videoId }); assert.deepEqual(s.mySongs[2], [videoId]);
  assert.equal(s.turnId, turn);
  s = act(s, 'toggleFavorite', { actor: 2, videoId }); assert.deepEqual(s.mySongs[2], []);
  s = act(s, 'toggleFavorite', { videoId }); assert.deepEqual(s.mySongs[1], [videoId]);
  s = act(s, 'addSong', { ownerPlayerNum: 3, title: 'For our third player', url: 'https://youtu.be/abcdefghijk' });
  assert.deepEqual(s.mySongs[3], ['abcdefghijk']);
  assert.equal(s.songLibrary.at(-1).ownerPlayerNum, 3);
  assert.equal(error(act(s, 'toggleFavorite', { actor: 2, videoId: 'missing' }), 2), 'invalid_song');
});

test('song titles and library size are bounded, while existing favorites work at the limit', () => {
  let s = create();
  for (const title of ['', '  ', 'a'.repeat(141), 'control\ncharacter']) assert.equal(error(act(s, 'addSong', { title, url: 'https://youtu.be/abcdefghijk' })), 'invalid_title');
  assert.equal(error(act(s, 'addSong', { title: 'Valid', url: 'https://example.com/watch?v=abcdefghijk' })), 'invalid_url');
  while (s.songLibrary.length < 120) {
    const id = String(s.songLibrary.length).padStart(11, '0');
    s = act(s, 'addSong', { title: 'Song ' + id, url: 'https://youtu.be/' + id });
  }
  assert.equal(s.songLibrary.length, 120);
  assert.equal(error(act(s, 'addSong', { title: 'One too many', url: 'https://youtu.be/abcdefghijk' })), 'library_full');
  s = act(s, 'addSong', { actor: 2, title: 'Existing is okay', url: s.songLibrary[0].url });
  assert.equal(error(s, 2), ''); assert.equal(s.songLibrary.length, 120); assert.ok(s.mySongs[2].includes(s.songLibrary[0].videoId));
});

test('public projections expose only gameplay plus actor-specific reply, with detached arrays and no private state', () => {
  let s = choice();
  s = act(s, 'toggleFavorite', { actor: 2, videoId: s.songLibrary[0].videoId });
  s.secretCredentials = { hostToken: 'private' };
  const projected = E.view(s, 2, 100000);
  assert.equal(projected.game, 'openmic'); assert.equal(projected.playerNum, 2); assert.equal(projected.name, 'Player 2');
  assert.equal(projected.openmic.reply.id, s.replies[2].id);
  assert.equal(projected.openmic.singingAwarded, false);
  for (const field of ['seen', 'replies', 'challengeHistory', 'challengeAwarded', 'lastChangeAt', 'secretCredentials']) assert.equal(field in projected.openmic, false, field);
  const before = JSON.stringify(s);
  projected.openmic.roster[0].name = 'Changed'; projected.openmic.mySongs[2].push('something');
  projected.openmic.songLibrary[0].title = 'Changed'; projected.openmic.challenge.title.en = 'Changed'; projected.openmic.reply.error = 'Changed';
  assert.equal(JSON.stringify(s), before);
});
