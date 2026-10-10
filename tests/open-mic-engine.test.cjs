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
const legacyLyrics = (s, extra) => { const next = structuredClone(s); next.songLyrics = { ...(next.songLyrics || {}), [extra.videoId]: extra.lyrics }; return next; };

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
  let s = create({ mode: 'mission' }); const ids = [s.challenge.id];
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
  assert.equal(song.ownerPlayerNum, 2); assert.equal(song.custom, true); assert.equal(song.url, undefined); assert.equal(song.thumbnail, undefined);
  s = act(s, 'addSong', { actor: 3, title: 'Another name', url: 'https://youtube.com/shorts/abcdefghijk' });
  assert.equal(s.songLibrary.length, count + 1); assert.equal(s.songLibrary.at(-1).title, 'My comfortable song');
  assert.deepEqual(s.mySongs[3], ['abcdefghijk']);
  s = act(s, 'next'); assert.deepEqual(s.mySongs[2], ['abcdefghijk']);
  s = act(s, 'failed');
  s = act(s, 'selectSong', { actor: 2, videoId: 'abcdefghijk' });
  assert.equal(s.selectedSong.videoId, 'abcdefghijk');
});

test('host and Spotlight can atomically select an unknown video without favorites, singing or score changes', () => {
  for (const result of ['success', 'failed']) {
    for (const actor of [0, 1]) {
      let initial = choice(result);
      initial = act(initial, 'toggleFavorite', { actor: 2, videoId: initial.songLibrary[0].videoId });
      const before = JSON.stringify(initial), favorites = structuredClone(initial.mySongs), count = initial.songLibrary.length;
      const selected = act(initial, 'selectSong', { actor, videoId: 'abcdefghijk', title: '  A discovered song  ',
        url: 'https://evil.example/video', thumbnail: 'https://evil.example/image', ownerPlayerNum: 3 });
      assert.equal(error(selected, actor), ''); assert.equal(JSON.stringify(initial), before);
      assert.equal(selected.songLibrary.length, count + 1); assert.deepEqual(selected.mySongs, favorites);
      assert.deepEqual(selected.selectedSong, selected.songLibrary.at(-1));
      assert.equal(selected.selectedSong.title, 'A discovered song'); assert.equal(selected.selectedSong.ownerPlayerNum, 1);
      assert.equal(selected.selectedSong.url, undefined);
      assert.equal(selected.selectedSong.thumbnail, undefined);
      assert.equal(selected.selectedSong.artist, ''); assert.deepEqual(selected.selectedSong.tags, []);
      assert.equal(selected.turnId, initial.turnId + 1);
      for (const field of ['phase', 'round', 'challengeResult', 'challengeAwarded', 'teamScore', 'singingState',
        'singingStartedAt', 'singingAwarded', 'duration', 'duet']) assert.deepEqual(selected[field], initial[field], field);
      const projected = E.view(selected, 2).openmic;
      assert.equal(projected.selectedSong.videoId, 'abcdefghijk');
      assert.ok(projected.songLibrary.some(song => song.videoId === 'abcdefghijk')); assert.deepEqual(projected.mySongs, favorites);
    }
  }
});

test('direct selection of an existing video keeps its metadata, lyrics and favorites', () => {
  let initial = choice(); const original = structuredClone(initial.songLibrary[0]);
  initial = legacyLyrics(initial, { actor: 1, videoId: original.videoId, lyrics: 'An original lyric draft.' });
  initial = act(initial, 'toggleFavorite', { actor: 3, videoId: original.videoId });
  const favorites = structuredClone(initial.mySongs), count = initial.songLibrary.length;
  const selected = act(initial, 'selectSong', { actor: 1, videoId: original.videoId, title: 'Different provider title',
    artist: 'Different artist', lyrics: 'Untrusted replacement', url: 'https://evil.example', ownerPlayerNum: 2 });
  assert.equal(error(selected, 1), ''); assert.deepEqual(selected.selectedSong, original);
  assert.deepEqual(selected.songLibrary, initial.songLibrary); assert.equal(selected.songLibrary.length, count);
  assert.deepEqual(selected.mySongs, favorites); assert.deepEqual(selected.songLyrics, initial.songLyrics);
  const repeated = act(selected, 'selectSong', { actor: 1, videoId: original.videoId });
  assert.equal(error(repeated, 1), ''); assert.equal(repeated.songLibrary.length, count);
  assert.deepEqual(repeated.selectedSong, original); assert.deepEqual(repeated.mySongs, favorites);
});

test('direct selection remains deterministic, idempotent and stale-safe without partial insertion', () => {
  const initial = choice();
  const command = { id: 'direct-selection-once', type: 'selectSong', actor: 1, sessionId: initial.sessionId,
    turnId: initial.turnId, now: initial.lastChangeAt + 1, videoId: 'abcdefghijk', title: 'One direct selection' };
  const selected = E.apply(initial, command);
  assert.deepEqual(E.apply(initial, command), selected); assert.equal(E.apply(selected, command), selected);
  assert.equal(selected.turnId, initial.turnId + 1); assert.equal(selected.songLibrary.length, initial.songLibrary.length + 1);
  const stale = E.apply(selected, { ...command, id: 'delayed-direct-selection', videoId: 'lmnopqrstuv', title: 'Late song' });
  assert.equal(error(stale, 1), 'stale_turn'); assert.deepEqual(stale.songLibrary, selected.songLibrary);
  assert.deepEqual(stale.selectedSong, selected.selectedSong); assert.deepEqual(stale.mySongs, selected.mySongs);
  assert.equal(stale.turnId, selected.turnId);
  assert.equal(E.apply(selected, { ...command, id: 'old-session-direct-selection', sessionId: 'old-session' }), selected);
  const repeated = act(selected, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'Cannot overwrite the first title' });
  assert.equal(repeated.songLibrary.length, selected.songLibrary.length);
  assert.equal(repeated.selectedSong.title, 'One direct selection'); assert.equal(repeated.turnId, selected.turnId + 1);
});

test('invalid direct-selection IDs or titles cannot change a current stage or library', () => {
  const initial = act(choice(), 'selectSong', { videoId: C.songs[0].videoId });
  function unchanged(rejected) {
    assert.deepEqual(rejected.songLibrary, initial.songLibrary); assert.deepEqual(rejected.mySongs, initial.mySongs);
    assert.deepEqual(rejected.selectedSong, initial.selectedSong); assert.equal(rejected.turnId, initial.turnId);
    assert.equal(rejected.teamScore, initial.teamScore);
  }
  for (const videoId of [null, undefined, 42, {}, '', 'short', 'abcdefghijkl', 'abcdefghij/', 'abcdefghij?', 'abcdefghij\n', 'abcdefghijk\n', 'abcdefghijk\r\n']) {
    const rejected = act(initial, 'selectSong', { actor: 1, videoId, title: 'Valid title' });
    assert.equal(error(rejected, 1), 'invalid_song'); unchanged(rejected);
  }
  const missingTitle = act(initial, 'selectSong', { actor: 1, videoId: 'abcdefghijk' });
  assert.equal(error(missingTitle, 1), 'invalid_song'); unchanged(missingTitle);
  for (const title of [undefined, null, 42, {}, '', '   ', 'x'.repeat(141), 'line\nline', '\nLeading control', 'Trailing control\t', 'Hidden\u0000control', 'Hidden\u007fcontrol']) {
    const rejected = act(initial, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title });
    assert.equal(error(rejected, 1), 'invalid_title'); unchanged(rejected);
  }
  const boundary = act(initial, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: '  ' + 'x'.repeat(140) + '  ' });
  assert.equal(error(boundary, 1), ''); assert.equal(boundary.selectedSong.title.length, 140);
});

test('direct selection cannot import videos during challenge or for another or inactive participant', () => {
  const candidate = { videoId: 'abcdefghijk', title: 'Must not enter library' };
  for (const initial of [create()]) {
    for (const actor of [0, 1]) {
      const rejected = act(initial, 'selectSong', { actor, ...candidate });
      assert.equal(error(rejected, actor), 'not_available'); assert.deepEqual(rejected.songLibrary, initial.songLibrary);
      assert.deepEqual(rejected.selectedSong, initial.selectedSong); assert.deepEqual(rejected.mySongs, initial.mySongs);
      assert.equal(rejected.turnId, initial.turnId); assert.equal(rejected.teamScore, initial.teamScore);
    }
  }
  const initial = choice();
  for (const actor of [2, 3]) {
    const rejected = act(initial, 'selectSong', { actor, ...candidate, ownerPlayerNum: 1 });
    assert.equal(error(rejected, actor), 'not_available'); assert.deepEqual(rejected.songLibrary, initial.songLibrary);
    assert.equal(rejected.selectedSong, null); assert.deepEqual(rejected.mySongs, initial.mySongs);
  }
  const inactive = { ...initial, roster: initial.roster.map(p => ({ ...p, active: p.playerNum !== 1 })) };
  const rejected = act(inactive, 'selectSong', { actor: 1, ...candidate });
  assert.equal(error(rejected, 1), 'not_available'); assert.deepEqual(rejected.songLibrary, inactive.songLibrary);
});

test('a full library rejects a new direct selection atomically while allowing an existing song', () => {
  const initial = choice();
  while (initial.songLibrary.length < 120) {
    const videoId = String(initial.songLibrary.length).padStart(11, '0');
    initial.songLibrary.push({ videoId, id: videoId, title: 'Capacity fixture', artist: '', tags: [] });
  }
  const selected = act(initial, 'selectSong', { actor: 1, videoId: initial.songLibrary[0].videoId });
  assert.equal(error(selected, 1), ''); assert.equal(selected.songLibrary.length, 120);
  const rejected = act(selected, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'One too many' });
  assert.equal(error(rejected, 1), 'library_full'); assert.deepEqual(rejected.songLibrary, selected.songLibrary);
  assert.deepEqual(rejected.selectedSong, selected.selectedSong); assert.deepEqual(rejected.mySongs, selected.mySongs);
  assert.equal(rejected.turnId, selected.turnId); assert.equal(rejected.teamScore, selected.teamScore);
});

test('a directly selected video supports shared lyrics and later turns without first adding favorites', () => {
  let s = act(choice(), 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'A direct song with lyrics' });
  const turn = s.turnId, score = s.teamScore;
  s = legacyLyrics(s, { actor: 1, videoId: 'abcdefghijk', lyrics: 'A shared original draft.\nAnother line.', onlyIfEmpty: true });
  assert.equal(s.turnId, turn); assert.equal(s.teamScore, score);
  assert.equal(s.phase, 'choice'); assert.equal(s.singingStartedAt, null);
  assert.deepEqual(E.view(s, 2).openmic.songLyrics, {});
  for (const favorites of Object.values(s.mySongs)) assert.deepEqual(favorites, []);
  s = act(s, 'next'); s = act(s, 'failed');
  s = act(s, 'selectSong', { actor: 2, videoId: 'abcdefghijk' });
  assert.equal(error(s, 2), ''); assert.equal(s.selectedSong.title, 'A direct song with lyrics');
  assert.equal(s.songLyrics.abcdefghijk, 'A shared original draft.\nAnother line.');
  for (const favorites of Object.values(s.mySongs)) assert.deepEqual(favorites, []);
  s = act(s, 'toggleFavorite', { actor: 2, videoId: 'abcdefghijk' });
  assert.deepEqual(s.mySongs[2], ['abcdefghijk']); assert.deepEqual(s.mySongs[1], []);
});

const stageFields = ['turnId', 'lastChangeAt', 'round', 'spotlight', 'phase', 'challengeResult', 'challengeAwarded',
  'selectedSong', 'singingState', 'singingStartedAt', 'singingAwarded', 'teamScore', 'duration', 'duet',
  'songLibrary', 'songLyrics', 'mySongs'];
function sameStage(actual, expected) {
  for (const field of stageFields) assert.deepEqual(actual[field], expected[field], field);
}

test('clearing a choice-stage song preserves saved material and leaves a fresh selection available', () => {
  for (const actor of [0, 1]) {
    let initial = act(choice(), 'selectSong', { videoId: C.songs[0].videoId });
    initial = act(initial, 'inviteDuet', { playerNum: 2 });
    initial = legacyLyrics(initial, { videoId: initial.selectedSong.videoId, lyrics: 'Our saved draft.' });
    initial = act(initial, 'toggleFavorite', { actor: 3, videoId: initial.selectedSong.videoId });
    const before = JSON.stringify(initial);
    const cleared = act(initial, 'clearSong', { actor });
    assert.equal(error(cleared, actor), ''); assert.equal(JSON.stringify(initial), before);
    assert.equal(cleared.selectedSong, null); assert.equal(cleared.duet, null); assert.equal(cleared.phase, 'choice');
    assert.equal(cleared.singingState, 'idle'); assert.equal(cleared.singingStartedAt, null);
    assert.equal(cleared.turnId, initial.turnId + 1); assert.equal(cleared.teamScore, initial.teamScore);
    for (const field of ['songLibrary', 'songLyrics', 'mySongs', 'round', 'spotlight', 'challengeResult']) assert.deepEqual(cleared[field], initial[field], field);
    const blocked = act(cleared, 'startSinging', { actor });
    assert.equal(error(blocked, actor), 'choose_song'); sameStage(blocked, cleared);
    const selected = act(cleared, 'selectSong', { actor, videoId: 'abcdefghijk', title: 'A new choice' });
    assert.equal(error(selected, actor), ''); assert.equal(selected.selectedSong.videoId, 'abcdefghijk');
    assert.equal(selected.phase, 'choice'); assert.deepEqual(selected.mySongs, initial.mySongs);
  }
});

test('host and Spotlight can replace a live song atomically, stopping its timer without awarding or changing turns', () => {
  for (const result of ['success', 'failed']) {
    for (const actor of [0, 1]) {
      for (const unknown of [false, true]) {
        let initial = singing(result);
        initial = act(initial, 'inviteDuet', { playerNum: 2 });
        initial = legacyLyrics(initial, { videoId: initial.selectedSong.videoId, lyrics: 'Keep the old song draft.' });
        initial = act(initial, 'toggleFavorite', { actor: 3, videoId: initial.selectedSong.videoId });
        const before = JSON.stringify(initial), target = unknown ? { videoId: 'abcdefghijk', title: 'New live choice' }
          : { videoId: initial.songLibrary[1].videoId, title: 'Do not override library metadata' };
        const replaced = act(initial, 'selectSong', { actor, ...target, now: initial.singingStartedAt + 40000 });
        assert.equal(error(replaced, actor), ''); assert.equal(JSON.stringify(initial), before);
        assert.equal(replaced.selectedSong.videoId, target.videoId); assert.equal(replaced.phase, 'choice');
        assert.equal(replaced.singingState, 'idle'); assert.equal(replaced.singingStartedAt, null);
        assert.equal(replaced.turnId, initial.turnId + 1); assert.equal(replaced.singingAwarded, false);
        for (const field of ['round', 'spotlight', 'teamScore', 'duration', 'challengeResult', 'challengeAwarded', 'duet', 'songLyrics', 'mySongs']) assert.deepEqual(replaced[field], initial[field], field);
        assert.equal(replaced.songLibrary.length, initial.songLibrary.length + Number(unknown));
        if (!unknown) assert.deepEqual(replaced.selectedSong, initial.songLibrary[1]);
      }
    }
  }
});

test('reselecting the currently singing video is a successful no-op and never restarts the timer', () => {
  for (const actor of [0, 1]) {
    const initial = act(singing(), 'inviteDuet', { playerNum: 2 });
    const repeated = act(initial, 'selectSong', { actor, videoId: initial.selectedSong.videoId,
      title: 'Ignored alternate provider title', now: initial.singingStartedAt + 100000 });
    assert.equal(error(repeated, actor), ''); sameStage(repeated, initial);
    assert.equal(repeated.replies[actor].id, repeated.seen[actor].at(-1));
  }
});

test('clearing a live song stops timing and duet without points or deleting saved songs, lyrics or favorites', () => {
  for (const result of ['success', 'failed']) {
    for (const actor of [0, 1]) {
      let initial = singing(result);
      initial = act(initial, 'inviteDuet', { playerNum: 2 });
      initial = legacyLyrics(initial, { videoId: initial.selectedSong.videoId, lyrics: 'Shared original draft.' });
      initial = act(initial, 'toggleFavorite', { actor: 1, videoId: initial.selectedSong.videoId });
      const cleared = act(initial, 'clearSong', { actor, now: initial.singingStartedAt + 40000 });
      assert.equal(error(cleared, actor), ''); assert.equal(cleared.selectedSong, null); assert.equal(cleared.duet, null);
      assert.equal(cleared.phase, 'choice'); assert.equal(cleared.singingState, 'idle'); assert.equal(cleared.singingStartedAt, null);
      assert.equal(cleared.turnId, initial.turnId + 1); assert.equal(cleared.singingAwarded, false);
      for (const field of ['round', 'spotlight', 'teamScore', 'challengeResult', 'challengeAwarded', 'songLibrary', 'songLyrics', 'mySongs']) assert.deepEqual(cleared[field], initial[field], field);
      const next = act(cleared, 'next'); assert.equal(next.teamScore, initial.teamScore);
      assert.equal(next.round, initial.round + 1); assert.equal(next.spotlight, 2);
    }
  }
});

test('clearing an empty choice still fences queued selections and is idempotent by command ID', () => {
  const initial = choice();
  const command = { id: 'clear-empty-once', actor: 1, type: 'clearSong', sessionId: initial.sessionId,
    turnId: initial.turnId, now: initial.lastChangeAt + 1 };
  const cleared = E.apply(initial, command);
  assert.equal(error(cleared, 1), ''); assert.equal(cleared.turnId, initial.turnId + 1);
  assert.equal(cleared.selectedSong, null); assert.equal(cleared.phase, 'choice'); assert.equal(cleared.teamScore, initial.teamScore);
  assert.equal(E.apply(cleared, command), cleared); assert.deepEqual(E.apply(initial, command), cleared);
  const queued = act(cleared, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'Old queued choice', turnId: initial.turnId });
  assert.equal(error(queued, 1), 'stale_turn'); sameStage(queued, cleared);
});

test('replacement failures leave the singing video and timer intact, including a full library', () => {
  const initial = singing();
  for (const [input, expected] of [[{ videoId: 'abcdefghijk' }, 'invalid_song'],
    [{ videoId: 'abcdefghijk\n', title: 'Invalid ID' }, 'invalid_song'], [{ videoId: 'short', title: 'Invalid ID' }, 'invalid_song'],
    [{ videoId: 'abcdefghijk', title: '' }, 'invalid_title'], [{ videoId: 'abcdefghijk', title: null }, 'invalid_title'],
    [{ videoId: 'abcdefghijk', title: 'x'.repeat(141) }, 'invalid_title'], [{ videoId: 'abcdefghijk', title: 'Hidden\u0000title' }, 'invalid_title']]) {
    const rejected = act(initial, 'selectSong', { actor: 1, ...input });
    assert.equal(error(rejected, 1), expected); sameStage(rejected, initial);
  }
  const full = structuredClone(initial);
  while (full.songLibrary.length < 120) {
    const videoId = String(full.songLibrary.length).padStart(11, '0');
    full.songLibrary.push({ id: videoId, videoId, title: 'Capacity fixture', artist: '', tags: [] });
  }
  const rejected = act(full, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'One too many' });
  assert.equal(error(rejected, 1), 'library_full'); sameStage(rejected, full);
  const existing = act(full, 'selectSong', { actor: 1, videoId: full.songLibrary[1].videoId });
  assert.equal(error(existing, 1), ''); assert.equal(existing.phase, 'choice'); assert.equal(existing.songLibrary.length, 120);
});

test('clear and replace respect actors, inactive Spotlight, stale sessions and phase tokens before any stage reset', () => {
  const initial = singing();
  for (const type of ['clearSong', 'selectSong']) {
    const extra = type === 'selectSong' ? { videoId: 'abcdefghijk', title: 'Another song' } : {};
    for (const actor of [2, 3]) {
      const denied = act(initial, type, { actor, ownerPlayerNum: 1, ...extra });
      assert.equal(error(denied, actor), 'not_available'); sameStage(denied, initial);
    }
    const inactive = { ...initial, roster: initial.roster.map(p => ({ ...p, active: p.playerNum !== 1 })) };
    const denied = act(inactive, type, { actor: 1, ...extra });
    assert.equal(error(denied, 1), 'not_available'); sameStage(denied, inactive);
    const stale = act(initial, type, { actor: 1, ...extra, turnId: initial.turnId - 1 });
    assert.equal(error(stale, 1), 'stale_turn'); sameStage(stale, initial);
    assert.equal(act(initial, type, { actor: 1, ...extra, sessionId: 'previous-session' }), initial);
    const badTime = act(initial, type, { actor: 1, ...extra, now: initial.lastChangeAt - 1 });
    assert.equal(error(badTime, 1), 'invalid_time'); sameStage(badTime, initial);
    const challenge = create();
    const locked = act(challenge, type, { actor: 0, ...extra });
    assert.equal(error(locked), 'not_available'); sameStage(locked, challenge);
  }
});

test('repeated singing replacements and cancellations award only one eventual completion and finished scoring stays locked', () => {
  for (const result of ['success', 'failed']) {
    let s = singing(result); const baseline = s.teamScore, round = s.round;
    for (let i = 0; i < 3; i++) {
      s = act(s, 'selectSong', { actor: 1, videoId: s.songLibrary[i + 1].videoId });
      assert.equal(s.teamScore, baseline); assert.equal(s.phase, 'choice'); assert.equal(s.round, round);
      s = act(s, 'startSinging', { actor: 1 });
      s = act(s, 'clearSong', { actor: 1 }); assert.equal(s.teamScore, baseline);
      s = act(s, 'selectSong', { actor: 1, videoId: s.songLibrary[i + 1].videoId });
      s = act(s, 'startSinging', { actor: 1 });
    }
    s = act(s, 'finishSinging', { actor: 1 }); assert.equal(s.teamScore, baseline + 1);
    for (const actor of [0, 1]) {
      for (const type of ['startSinging', 'finishSinging']) {
        const denied = act(s, type, { actor, videoId: 'abcdefghijk', title: 'Cannot reopen' });
        assert.equal(error(denied, actor), 'not_available'); sameStage(denied, s);
      }
    }
    const next = act(s, 'next'); assert.equal(next.teamScore, baseline + 1); assert.equal(next.round, round + 1);
  }
});

test('changed song or clear invalidates queued finish, start and lyric intents before they can affect another stage', () => {
  const initial = singing(); const nextId = initial.songLibrary[1].videoId;
  for (const operation of ['selectSong', 'clearSong']) {
    const changed = act(initial, operation, { actor: 1, videoId: nextId });
    const snapshot = structuredClone(changed);
    for (const type of ['finishSinging', 'startSinging', 'setLyrics']) {
      const queued = act(changed, type, { actor: 1, turnId: initial.turnId, videoId: nextId, lyrics: 'Old queued draft.' });
      assert.equal(error(queued, 1), 'stale_turn'); sameStage(queued, snapshot);
    }
  }
});

function completedStage(result = 'success', operation = 'finishSinging') {
  let s = act(singing(result), 'inviteDuet', { playerNum: 2 });
  s = legacyLyrics(s, { videoId: s.selectedSong.videoId, lyrics: 'An original saved draft.' });
  s = act(s, 'toggleFavorite', { actor: 3, videoId: s.selectedSong.videoId });
  return act(s, operation);
}

test('finished rounds allow host or Spotlight to select existing and new videos for playback without reopening scoring', () => {
  for (const result of ['success', 'failed']) {
    for (const operation of ['finishSinging', 'skip']) {
      for (const actor of [0, 1]) {
        for (const unknown of [false, true]) {
          const initial = completedStage(result, operation), before = JSON.stringify(initial);
          const target = unknown ? { videoId: 'abcdefghijk', title: 'A song after the round' }
            : { videoId: initial.songLibrary[1].videoId, title: 'Keep existing metadata' };
          const selected = act(initial, 'selectSong', { actor, ...target });
          assert.equal(error(selected, actor), ''); assert.equal(JSON.stringify(initial), before);
          assert.equal(selected.selectedSong.videoId, target.videoId); assert.equal(selected.singingStartedAt, null);
          assert.equal(selected.turnId, initial.turnId + 1);
          for (const field of ['phase', 'singingState', 'singingAwarded', 'challengeAwarded', 'challengeResult',
            'teamScore', 'round', 'spotlight', 'duet', 'songLyrics', 'mySongs']) assert.deepEqual(selected[field], initial[field], field);
          assert.equal(selected.phase, 'finished'); assert.equal(selected.singingState, 'finished');
          assert.equal(selected.songLibrary.length, initial.songLibrary.length + Number(unknown));
          if (!unknown) assert.deepEqual(selected.selectedSong, initial.songLibrary[1]);
          for (const type of ['startSinging', 'finishSinging', 'skip']) {
            const denied = act(selected, type, { actor });
            assert.equal(error(denied, actor), 'not_available'); sameStage(denied, selected);
          }
          const next = act(selected, 'next'); assert.equal(next.teamScore, initial.teamScore);
          assert.equal(next.phase, 'challenge'); assert.equal(next.round, initial.round + 1);
        }
      }
    }
  }
});

test('finished clear removes only stage playback and duet while preserving awards, library, lyrics and favorites', () => {
  for (const result of ['success', 'failed']) {
    for (const operation of ['finishSinging', 'skip']) {
      for (const actor of [0, 1]) {
        const initial = completedStage(result, operation);
        const command = { id: 'clear-finished-once', type: 'clearSong', actor, sessionId: initial.sessionId,
          turnId: initial.turnId, now: initial.lastChangeAt + 1 };
        const cleared = E.apply(initial, command);
        assert.equal(error(cleared, actor), ''); assert.equal(cleared.selectedSong, null); assert.equal(cleared.duet, null);
        assert.equal(cleared.singingStartedAt, null); assert.equal(cleared.turnId, initial.turnId + 1);
        for (const field of ['phase', 'singingState', 'singingAwarded', 'challengeAwarded', 'challengeResult',
          'teamScore', 'round', 'spotlight', 'songLibrary', 'songLyrics', 'mySongs']) assert.deepEqual(cleared[field], initial[field], field);
        assert.equal(E.apply(cleared, command), cleared);
        const empty = act(cleared, 'clearSong', { actor });
        assert.equal(error(empty, actor), ''); assert.equal(empty.phase, 'finished'); assert.equal(empty.teamScore, initial.teamScore);
        const missingId = act(empty, 'selectSong', { actor });
        assert.equal(error(missingId, actor), 'invalid_song'); sameStage(missingId, empty);
        const selected = act(empty, 'selectSong', { actor, videoId: 'abcdefghijk', title: 'Playback after clearing' });
        assert.equal(error(selected, actor), ''); assert.equal(selected.phase, 'finished'); assert.equal(selected.teamScore, initial.teamScore);
        assert.deepEqual(selected.mySongs, initial.mySongs); assert.deepEqual(selected.songLyrics, initial.songLyrics);
      }
    }
  }
});

test('reselecting the current finished video is a no-op for metadata, scores, timer and phase token', () => {
  for (const operation of ['finishSinging', 'skip']) {
    for (const actor of [0, 1]) {
      const initial = completedStage('success', operation);
      const repeated = act(initial, 'selectSong', { actor, videoId: initial.selectedSong.videoId, title: 'Ignored provider metadata' });
      assert.equal(error(repeated, actor), ''); sameStage(repeated, initial);
    }
  }
});

test('finished playback mutations preserve atomic validation, actor and stale-command protections', () => {
  const initial = completedStage();
  for (const [extra, expected] of [[{ videoId: 'short', title: 'Invalid' }, 'invalid_song'],
    [{ videoId: 'abcdefghijk\n', title: 'Invalid' }, 'invalid_song'], [{ videoId: 'abcdefghijk' }, 'invalid_song'],
    [{ videoId: 'abcdefghijk', title: '' }, 'invalid_title'], [{ videoId: 'abcdefghijk', title: 'x'.repeat(141) }, 'invalid_title'],
    [{ videoId: 'abcdefghijk', title: 'Control\ncharacter' }, 'invalid_title']]) {
    const denied = act(initial, 'selectSong', { actor: 1, ...extra });
    assert.equal(error(denied, 1), expected); sameStage(denied, initial);
  }
  for (const type of ['selectSong', 'clearSong']) {
    const extra = { videoId: 'abcdefghijk', title: 'Finished playback' };
    const denied = act(initial, type, { actor: 2, ...extra, ownerPlayerNum: 1 });
    assert.equal(error(denied, 2), 'not_available'); sameStage(denied, initial);
    const inactive = { ...initial, roster: initial.roster.map(p => ({ ...p, active: p.playerNum !== 1 })) };
    const inactiveDenied = act(inactive, type, { actor: 1, ...extra });
    assert.equal(error(inactiveDenied, 1), 'not_available'); sameStage(inactiveDenied, inactive);
    const stale = act(initial, type, { actor: 1, ...extra, turnId: initial.turnId - 1 });
    assert.equal(error(stale, 1), 'stale_turn'); sameStage(stale, initial);
    assert.equal(act(initial, type, { actor: 1, ...extra, sessionId: 'old-session' }), initial);
  }
  const full = structuredClone(initial);
  while (full.songLibrary.length < 120) {
    const videoId = String(full.songLibrary.length).padStart(11, '0');
    full.songLibrary.push({ id: videoId, videoId, title: 'Capacity fixture', artist: '', tags: [] });
  }
  const fullDenied = act(full, 'selectSong', { actor: 1, videoId: 'abcdefghijk', title: 'Beyond capacity' });
  assert.equal(error(fullDenied, 1), 'library_full'); sameStage(fullDenied, full);
  const existing = act(full, 'selectSong', { actor: 1, videoId: full.songLibrary[1].videoId });
  assert.equal(error(existing, 1), ''); assert.equal(existing.phase, 'finished'); assert.equal(existing.teamScore, full.teamScore);
});

test('new finished playback fences queued score and lyric commands without making the round singable', () => {
  const initial = completedStage();
  for (const type of ['selectSong', 'clearSong']) {
    const changed = act(initial, type, { actor: 1, videoId: initial.songLibrary[1].videoId });
    for (const queuedType of ['startSinging', 'finishSinging', 'setLyrics']) {
      const queued = act(changed, queuedType, { actor: 1, turnId: initial.turnId,
        videoId: initial.songLibrary[1].videoId, lyrics: 'An old queued edit.' });
      assert.equal(error(queued, 1), 'stale_turn'); sameStage(queued, changed);
    }
  }
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
  s = act(s, 'addSong', { actor: 2, title: 'Existing is okay', url: 'https://youtu.be/' + s.songLibrary[0].videoId });
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


test('retired lyric commands are rejected for every actor without changing legacy words or stage progress', () => {
  const initial = singing();
  initial.songLyrics[initial.selectedSong.videoId] = 'Private legacy fixture';
  const before = JSON.stringify(initial);
  for (const actor of [0, 1, 2, 3]) {
    for (const lyrics of ['Replacement', '', 'x'.repeat(E.MAX_LYRICS_CHARS + 1), null]) {
      const rejected = act(initial, 'setLyrics', { actor, videoId: initial.selectedSong.videoId, lyrics, onlyIfEmpty: true });
      assert.equal(error(rejected, actor), 'not_available');
      assert.deepEqual(rejected.songLyrics, initial.songLyrics);
      for (const field of ['turnId', 'phase', 'teamScore', 'singingState', 'singingStartedAt', 'selectedSong', 'lastChangeAt']) {
        assert.deepEqual(rejected[field], initial[field], field);
      }
      assert.deepEqual(E.view(rejected, actor).openmic.songLyrics, {});
    }
  }
  assert.equal(JSON.stringify(initial), before);
});

test('text-only projections omit legacy lyrics, media URLs, thumbnails and unrelated song fields', () => {
  const initial = singing(), id = initial.selectedSong.videoId;
  initial.songLyrics = { [id]: 'Legacy words must stay private' };
  Object.assign(initial.songLibrary[0], { url: 'https://video.invalid/', thumbnail: 'https://image.invalid/', lyrics: 'Inline secret', secret: { code: 'private' } });
  initial.selectedSong = structuredClone(initial.songLibrary[0]);
  const before = JSON.stringify(initial);
  for (const actor of [0, 1, 2, 3]) {
    const view = E.view(initial, actor).openmic;
    assert.deepEqual(view.songLyrics, {});
    for (const song of [...view.songLibrary, view.selectedSong]) {
      assert.deepEqual(Object.keys(song).sort(), ['artist', 'id', 'tags', 'title', 'videoId']);
    }
    const serialized = JSON.stringify(view);
    for (const hidden of ['Legacy words must stay private', 'video.invalid', 'image.invalid', 'Inline secret', 'private']) assert.ok(!serialized.includes(hidden));
    view.selectedSong.tags.push('only projection');
    view.songLibrary[0].title = 'only projection';
  }
  assert.equal(JSON.stringify(initial), before);
  delete initial.songLyrics;
  assert.deepEqual(E.view(initial, 1).openmic.songLyrics, {});
});

test('pure song names create stable opaque references and favorites without saving media', () => {
  const initial = create();
  const command = { id: 'text-song-once', type: 'addSong', actor: 2, sessionId: initial.sessionId,
    turnId: initial.turnId, now: initial.lastChangeAt + 1, title: '  Our title  ', artist: '  Our artist  ' };
  const next = E.apply(initial, command), song = next.songLibrary.at(-1);
  assert.equal(error(next, 2), '');
  assert.match(song.videoId, /^omtxt[a-z0-9]{6}$/);
  assert.equal(song.videoId.length, 11);
  assert.equal(song.id, song.videoId); assert.equal(song.title, 'Our title'); assert.equal(song.artist, 'Our artist');
  assert.equal(song.url, undefined); assert.equal(song.thumbnail, undefined);
  assert.equal(song.ownerPlayerNum, 2); assert.deepEqual(next.mySongs[2], [song.videoId]);
  assert.equal(next.turnId, initial.turnId); assert.equal(next.phase, initial.phase); assert.equal(next.teamScore, initial.teamScore);
  assert.deepEqual(E.apply(initial, command), next); assert.equal(E.apply(next, command), next);
  const duplicate = act(next, 'addSong', { actor: 3, title: 'Our title', artist: 'Our artist' });
  assert.equal(duplicate.songLibrary.length, next.songLibrary.length); assert.deepEqual(duplicate.mySongs[3], [song.videoId]);
  let selected = act(next, 'success');
  selected = act(selected, 'selectSong', { actor: 1, videoId: song.videoId });
  selected = act(selected, 'startSinging', { actor: 1 });
  assert.equal(selected.phase, 'singing'); assert.equal(selected.selectedSong.title, song.title);
  selected = act(selected, 'finishSinging', { actor: 1 });
  assert.equal(selected.teamScore, 3);
});

test('pure song names enforce ownership, text bounds, capacity and deterministic collision recovery', () => {
  let initial = create();
  for (const extra of [{ title: '' }, { title: 'x'.repeat(141) }, { title: 'line\nline' }, { title: 'Valid', artist: 42 },
    { title: 'Valid', artist: 'x'.repeat(141) }, { title: 'Valid', artist: 'Hidden\u0000control' }]) {
    const rejected = act(initial, 'addSong', { actor: 2, ...extra });
    assert.equal(error(rejected, 2), 'invalid_title'); assert.deepEqual(rejected.songLibrary, initial.songLibrary);
  }
  const wrongOwner = act(initial, 'addSong', { actor: 2, ownerPlayerNum: 1, title: 'No impersonation' });
  assert.equal(error(wrongOwner, 2), 'not_available');
  const firstCommand = { id: 'collision-fixture', type: 'addSong', actor: 0, sessionId: initial.sessionId,
    turnId: initial.turnId, now: initial.lastChangeAt + 1, title: 'First title' };
  const first = E.apply(initial, firstCommand);
  initial.songLibrary.push({ ...first.songLibrary.at(-1), title: 'Already occupied' });
  const recovered = E.apply(initial, firstCommand);
  assert.notEqual(recovered.songLibrary.at(-1).videoId, first.songLibrary.at(-1).videoId);
  assert.deepEqual(E.apply(initial, firstCommand), recovered);
  while (initial.songLibrary.length < 120) {
    const id = 'omtxt' + initial.songLibrary.length.toString(36).padStart(6, '0');
    if (!initial.songLibrary.some(song => song.videoId === id)) initial.songLibrary.push({ id, videoId: id, title: 'Capacity ' + id, artist: '', tags: [] });
    else initial.songLibrary.push({ id: 'capacity-' + initial.songLibrary.length, videoId: String(initial.songLibrary.length).padStart(11, '0'), title: 'Capacity fallback', artist: '', tags: [] });
  }
  const full = act(initial, 'addSong', { title: 'Too many', artist: '' });
  assert.equal(error(full), 'library_full'); assert.deepEqual(full.songLibrary, initial.songLibrary);
  const existing = initial.songLibrary.find(song => /^omtxt/.test(song.videoId));
  const favorite = act(initial, 'addSong', { actor: 2, title: existing.title, artist: existing.artist || '' });
  assert.equal(error(favorite, 2), ''); assert.equal(favorite.songLibrary.length, 120); assert.ok(favorite.mySongs[2].includes(existing.videoId));
});


test('shared players can end and restart without a host while preserving saved songs and fencing old commands', () => {
  let s = { ...singing(), sharedControls: true };
  const score = s.teamScore, session = s.sessionId, library = JSON.stringify(s.songLibrary);
  s = act(s, 'stop', { actor: 2 });
  assert.equal(error(s, 2), ''); assert.equal(s.phase, 'stopped'); assert.equal(s.teamScore, score);
  assert.equal(s.singingStartedAt, null); assert.equal(s.singingState, 'idle');
  const staleTurn = s.turnId;
  assert.equal(error(act(s, 'next', { actor: 2 }), 2), 'not_available');
  s = act(s, 'exclude', { actor: 2, playerNum: 1, active: false });
  assert.equal(s.phase, 'stopped');
  s = act(s, 'restart', { actor: 2, id: 'reset-once' });
  assert.equal(error(s, 2), ''); assert.equal(s.phase, 'challenge'); assert.equal(s.teamScore, 0);
  assert.equal(s.sessionId, session); assert.equal(s.sharedControls, true); assert.equal(s.spotlight, 2);
  assert.equal(JSON.stringify(s.songLibrary), library); assert.ok(s.turnId > staleTurn);
  assert.equal(act(s, 'restart', { actor: 2, id: 'reset-once' }), s, 'duplicate reset cannot create another round');
  assert.equal(error(act(s, 'success', { actor: 2, turnId: staleTurn }), 2), 'stale_turn');
});

test('new game controls reject legacy players and inactive players and require enough active seats', () => {
  const original = create();
  for (const type of ['stop', 'restart']) assert.equal(error(act(original, type, { actor: 2 }), 2), 'not_available');
  let s = { ...create(), sharedControls: true };
  s = act(s, 'exclude', { actor: 1, playerNum: 3, active: false });
  assert.equal(error(act(s, 'restart', { actor: 3 }), 3), 'not_available');
  s = act(s, 'exclude', { actor: 1, playerNum: 2, active: false });
  const before = s.teamScore;
  s = act(s, 'restart', { actor: 1 }); assert.equal(error(s, 1), 'not_enough_players'); assert.equal(s.teamScore, before);
});

test('new games default to Life Song prompts while Mission Rescue keeps the original challenges', () => {
  const life = create(), mission = create({ mode: 'mission' });
  const lifeIds = new Set(C.lifePrompts.map(p => p.id)), missionIds = new Set(C.challenges.map(c => c.id));
  assert.equal(life.mode, 'life'); assert.ok(lifeIds.has(life.challenge.id));
  assert.equal(E.view(life, 0, 1000).openmic.mode, 'life');
  assert.equal(mission.mode, 'mission'); assert.ok(missionIds.has(mission.challenge.id));
  assert.equal(E.view(mission, 2, 1000).openmic.mode, 'mission');
  assert.throws(() => create({ mode: 'karaoke' }), /invalid_mode/);
  let s = life;
  for (let i = 0; i < C.lifePrompts.length; i++) { s = act(s, 'next'); assert.ok(lifeIds.has(s.challenge.id), 'life turns stay on life prompts'); }
});

test('saved games from before modes stay on Mission Rescue', () => {
  const legacy = create({ mode: 'mission' }); delete legacy.mode;
  assert.equal(E.view(legacy, 1, 1000).openmic.mode, 'mission');
  const next = act(legacy, 'next');
  assert.ok(C.challenges.some(c => c.id === next.challenge.id));
  assert.equal(E.view(next, 0, next.lastChangeAt).openmic.mode, 'mission');
});

test('managers switch modes: the prompt redraws during the challenge, otherwise from the next turn', () => {
  let s = create();
  s = act(s, 'setMode', { mode: 'mission' });
  assert.equal(error(s), ''); assert.equal(s.mode, 'mission'); assert.ok(C.challenges.some(c => c.id === s.challenge.id));
  const turn = s.turnId; s = act(s, 'setMode', { mode: 'mission' }); assert.equal(s.turnId, turn, 'same mode is a no-op');
  s = act(s, 'success'); const kept = s.challenge.id;
  s = act(s, 'setMode', { mode: 'life' });
  assert.equal(s.mode, 'life'); assert.equal(s.challenge.id, kept, 'mid-turn switch keeps the current card'); assert.equal(s.phase, 'choice');
  s = act(s, 'next'); assert.ok(C.lifePrompts.some(p => p.id === s.challenge.id));
  assert.equal(error(act(s, 'setMode', { mode: 'disco' })), 'invalid_mode');
  assert.equal(error(act(s, 'setMode', { actor: 2, mode: 'mission' }), 2), 'not_available', 'players without shared controls cannot switch');
  const shared = { ...s, sharedControls: true };
  assert.equal(act(shared, 'setMode', { actor: 2, mode: 'mission' }).mode, 'mission', 'shared-control players can switch');
});

test('restart keeps the current mode unless a new one is chosen', () => {
  let s = act(create(), 'setMode', { mode: 'mission' });
  s = act(s, 'restart'); assert.equal(s.mode, 'mission'); assert.ok(C.challenges.some(c => c.id === s.challenge.id));
  s = act(s, 'restart', { mode: 'life' }); assert.equal(s.mode, 'life'); assert.ok(C.lifePrompts.some(p => p.id === s.challenge.id));
  assert.equal(error(act(s, 'restart', { mode: 'x' })), 'invalid_mode');
});

test('life prompts are bilingual, unique, short and simple', () => {
  assert.ok(C.lifePrompts.length >= 30);
  assert.equal(new Set(C.lifePrompts.map(p => p.id)).size, C.lifePrompts.length);
  assert.ok(C.lifePrompts.every(p => p.id.startsWith('life-') && !C.challenges.some(c => c.id === p.id)));
  for (const p of C.lifePrompts) {
    for (const key of ['title', 'situation', 'challenge', 'successRule']) {
      assert.ok(p[key].en && p[key].zh, p.id + ' ' + key);
      assert.doesNotMatch(p[key].en + p[key].zh, /[<>]/);
    }
    assert.ok(p.challenge.en.split(/\s+/).length <= 20, p.id + ' question is short');
  }
});
