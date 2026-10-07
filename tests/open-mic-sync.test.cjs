const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../open-mic-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Model Firebase's empty-tree cleanup, transaction retries, isolated snapshots,
// and per-path serialization. Hooks let tests insert another game during writes.
function normalize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) {
    const clean = normalize(entry); if (clean !== null) output[key] = clean;
  }
  return Object.keys(output).length ? output : null;
}
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map(), hooks = new Map(); let writes = 0;
  function put(path, value) {
    values.set(path, normalize(clone(value))); writes++;
    for (const fn of listeners.get(path) || []) queueMicrotask(() => fn(snap(values.get(path))));
  }
  return {
    values, put, hooks, listeners, get writes() { return writes; },
    ref(path) {
      return {
        path,
        on(_event, fn) {
          if (!listeners.has(path)) listeners.set(path, new Set());
          listeners.get(path).add(fn); queueMicrotask(() => fn(snap(values.get(path))));
        },
        off(_event, fn) { listeners.get(path)?.delete(fn); },
        transaction(updater) {
          const task = (tails.get(path) || Promise.resolve()).then(async () => {
            const hook = hooks.get(path); if (hook) { hooks.delete(path); await hook(); }
            updater(clone(values.get(path)));
            const next = updater(clone(values.get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            put(path, next); return { committed: true, snapshot: snap(values.get(path)) };
          });
          tails.set(path, task.catch(() => {})); return task;
        },
      };
    },
  };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) {
  for (let n = 0; n < 12; n++) { await turn(); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); }
}
function setup() {
  let clock = 100000; const db = database(), extras = {}, timers = new Map(); let timerId = 0;
  class ClockDate extends Date { static now() { return clock; } }
  const paths = [1, 2, 3, 4].map(n => `rooms/MIC_TEST/players/card-${n}`);
  const room = { code: 'MIC_TEST', count: 4, name: i => `Person ${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, OPEN_MIC_ENGINE: E,
    setInterval: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearInterval: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(require.resolve('../open-mic-sync.js'), 'utf8'), context);
  function host() {
    const h = new context.OPEN_MIC_SYNC.Host({ db, room,
      onChange: state => { h.latest = state; }, onStatus: status => { h.lastStatus = status; } });
    h.connect(); return h;
  }
  return { db, room, paths, host, extras, timers,
    card: n => clone(db.values.get(paths[n - 1])),
    raw: () => clone(db.values.get(`rooms/MIC_TEST/players/${extras.openMicControlToken}`)),
    state: () => JSON.parse(db.values.get(`rooms/MIC_TEST/players/${extras.openMicControlToken}`).stateJson),
    get now() { return clock; }, set now(value) { clock = value; },
    listenerCount: () => [...db.listeners.values()].reduce((total, handlers) => total + handlers.size, 0),
    async action(n, type, extra = {}) {
      const card = this.card(n);
      const action = { id: crypto.randomUUID(), type, sessionId: card.openmic.sessionId, turnId: card.openmic.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, openmicAction: action })); return action;
    },
  };
}

test('canonical JSON keeps exact empty state and participant views hide host control data', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const raw = f.raw(), state = f.state();
  assert.equal(typeof raw.stateJson, 'string'); assert.equal(raw.state, undefined);
  assert.ok(Array.isArray(state.roster)); assert.ok(Array.isArray(state.mySongs[1]));
  assert.deepEqual(state.mySongs[1], []); assert.equal(state.teamScore, 0);
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n), serialized = JSON.stringify(card);
    assert.equal(card.game, 'openmic'); assert.equal(card.playerNum, n);
    assert.equal(card.openmic.spotlight, 1); assert.equal(card.openmic.phase, 'challenge');
    assert.equal(card.openmic.duration, 35); assert.equal(card.openmic.teamScore, 0);
    assert.equal(card.openmic.owner, undefined); assert.equal(card.openmic.stateJson, undefined);
    assert.equal(card.openmic.seen, undefined); assert.equal(card.openmic.replies, undefined);
    assert.ok(!serialized.includes(f.extras.openMicControlToken));
  }
  h.close(); await settle(h);
});

test('a replacement host preserves score, singing state, and session under a single lease', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first);
  await first.command('success'); await first.command('selectSong', { videoId: first.latest.songLibrary[0].videoId });
  await first.command('inviteDuet', { playerNum: 2 }); await first.command('startSinging'); await settle(first);
  const original = f.state(); assert.equal(original.teamScore, 2);
  const second = f.host(); await settle(first, second);
  assert.equal(first.own, true); assert.equal(second.own, false);
  await assert.rejects(second.start()); await assert.rejects(second.command('next'));
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(f.state(), original);
  assert.equal(f.card(2).openmic.duet, 2);
  await second.command('finishSinging'); await settle(second); assert.equal(second.latest.teamScore, 3);
  await second.command('next'); await settle(second);
  assert.equal(second.latest.spotlight, 2); assert.equal(second.latest.teamScore, 3);
  first.close(); await settle(second); assert.equal(second.own, true);
  second.close(); await settle(second);
});

test('a sleeping host loses its expired lease and cannot overwrite a takeover', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first);
  await first.command('failed'); await settle(first); const original = f.state();
  f.now = f.raw().leaseUntil + 1;
  const second = f.host(); await settle(first, second);
  assert.equal(first.own, false); assert.equal(second.own, true); assert.deepEqual(f.state(), original);
  await assert.rejects(first.command('next')); await first.renew(); await settle(first, second);
  assert.equal(second.own, true); assert.equal(f.card(1).openmic.phase, 'choice');
  first.close(); second.close(); await settle(first, second);
});

test('spoofed actors cannot judge or advance; only the actual Spotlight can sing, once', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const initial = [h.latest.phase, h.latest.turnId, h.latest.spotlight, h.latest.teamScore];
  for (const [player, type] of [[2, 'success'], [2, 'failed'], [1, 'next'], [2, 'newChallenge']]) {
    const action = await f.action(player, type, { actor: 0 }); await settle(h);
    assert.deepEqual([h.latest.phase, h.latest.turnId, h.latest.spotlight, h.latest.teamScore], initial);
    assert.equal(f.card(player).openmic.reply.id, action.id); assert.ok(f.card(player).openmic.reply.error);
  }
  await h.command('success'); await settle(h);
  const videoId = h.latest.songLibrary[0].videoId;
  const spoof = await f.action(2, 'selectSong', { actor: 1, videoId }); await settle(h);
  assert.equal(h.latest.selectedSong, null); assert.ok(f.card(2).openmic.reply.error);
  assert.equal(f.card(2).openmic.reply.id, spoof.id);
  const selection = await f.action(1, 'selectSong', { videoId }); await settle(h);
  assert.equal(h.latest.selectedSong.videoId, videoId);
  assert.equal(f.card(1).openmic.reply.id, selection.id);
  const start = await f.action(1, 'startSinging'); await settle(h);
  assert.equal(h.latest.phase, 'singing'); assert.equal(h.latest.singingStartedAt, f.now);
  assert.equal(f.card(1).openmic.reply.id, start.id);
  const finish = await f.action(1, 'finishSinging'); await settle(h);
  assert.equal(h.latest.phase, 'finished'); assert.equal(h.latest.teamScore, 3);
  assert.equal(f.card(1).openmic.reply.id, finish.id); assert.equal(f.card(1).openmic.reply.error, '');
  const revision = f.raw().revision;
  await f.db.ref(f.paths[0]).transaction(old => ({ ...old, openmicAction: finish })); await settle(h);
  assert.equal(f.raw().revision, revision); assert.equal(h.latest.teamScore, 3);
  await f.action(1, 'finishSinging'); await settle(h); assert.equal(h.latest.teamScore, 3);
  await h.command('next'); await settle(h);
  assert.equal(h.latest.spotlight, 2); assert.equal(h.latest.selectedSong, null);
  assert.equal(h.latest.singingStartedAt, null); assert.equal(h.latest.teamScore, 3);
  h.close(); await settle(h);
});

test('lease projection preserves a concurrent player action and its acknowledgement', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('failed'); await settle(h);
  const card = f.card(1), videoId = h.latest.songLibrary[1].videoId;
  const action = { id: crypto.randomUUID(), type: 'selectSong', videoId,
    sessionId: card.openmic.sessionId, turnId: card.openmic.turnId, actor: 0 };
  f.db.hooks.set(f.paths[0], () => f.db.put(f.paths[0], { ...f.card(1), openmicAction: action }));
  await h.renew(); await settle(h);
  assert.equal(h.latest.selectedSong.videoId, videoId);
  assert.equal(f.card(1).openmicAction.id, action.id); assert.equal(f.card(1).openmic.reply.id, action.id);
  assert.equal(f.card(1).openmic.reply.error, '');
  await f.action(1, 'startSinging'); await settle(h);
  await f.action(1, 'finishSinging'); await settle(h);
  assert.equal(h.latest.teamScore, 1, 'failure rescue grants one shared point');
  await h.renew(); await settle(h); assert.equal(h.latest.teamScore, 1);
  h.close(); await settle(h);
});

test('success skip and failure skip preserve their two and zero challenge points', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('success'); await h.command('skip'); await settle(h);
  assert.equal(h.latest.phase, 'finished'); assert.equal(h.latest.teamScore, 2);
  await h.command('next'); await h.command('failed'); await h.command('skip'); await settle(h);
  assert.equal(h.latest.phase, 'finished'); assert.equal(h.latest.teamScore, 2);
  await h.command('next'); await settle(h);
  assert.equal(h.latest.spotlight, 3); assert.equal(h.latest.round, 3); assert.equal(h.latest.teamScore, 2);
  h.close(); await settle(h);
});

test('switching games suspends publication and reload cannot implicitly reclaim cards', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('success'); await settle(h); const score = h.latest.teamScore;
  f.db.put(f.paths[0], { game: 'cardcheck', word: 'hello' }); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.lastStatus, 'switched');
  await h.renew(); await settle(h); await assert.rejects(h.command('next'));
  assert.deepEqual(f.card(1), { game: 'cardcheck', word: 'hello' }); assert.equal(h.latest.teamScore, score);
  h.close(); await settle(h);
  const restored = f.host(); await settle(restored);
  assert.equal(restored.suspended, true); await restored.renew(); await settle(restored);
  assert.deepEqual(f.card(1), { game: 'cardcheck', word: 'hello' });
  await assert.rejects(restored.command('next'));
  const oldSession = restored.latest.sessionId;
  await restored.start({ singingDuration: 42 }); await settle(restored);
  assert.equal(restored.suspended, false); assert.notEqual(restored.latest.sessionId, oldSession);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).game, 'openmic'); assert.equal(f.card(n).word, undefined);
    assert.equal(f.card(n).openmic.duration, 42); assert.equal(f.card(n).openmic.teamScore, 0);
    assert.equal(f.card(n).openmicAction, undefined, 'new session removes previous player intents');
  }
  assert.equal(f.raw().opening, undefined); restored.close(); await settle(restored);
});

test('a game arriving during opening publication wins over the stale projection', async () => {
  const f = setup(), h = f.host(); await settle(h);
  f.db.put(f.paths[0], { game: 'cardcheck', word: 'old' }); await settle(h);
  f.db.hooks.set(f.paths[0], () => f.db.put(f.paths[0], { game: 'dixit', card: 'new' }));
  await h.start(); await settle(h);
  assert.equal(h.suspended, true); assert.deepEqual(f.card(1), { game: 'dixit', card: 'new' });
  await h.renew(); await settle(h); assert.equal(f.card(1).game, 'dixit');
  h.close(); await settle(h);
});

test('a replacement completes an interrupted opening without resetting session or challenge', async () => {
  const f = setup(), first = f.host(); await settle(first);
  let release; const waiting = new Promise(resolve => { release = resolve; });
  f.db.hooks.set(f.paths[0], () => waiting);
  await first.start(); const original = clone(first.latest);
  assert.ok(f.raw().opening); first.close(); release(); await settle(first);
  const restored = f.host(); await settle(restored);
  assert.equal(restored.own, true); assert.deepEqual(f.state(), original);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.sessionId, original.sessionId);
  assert.equal(f.raw().opening, undefined); restored.close(); await settle(restored);
});

test('elapsed time and offline cannot advance singing; room change and close stop all activity', async () => {
  const f = setup(), h = f.host(); await settle(h); h.connect(); assert.equal(f.timers.size, 1);
  await h.start(); await h.command('failed'); await h.command('selectSong', { videoId: h.latest.songLibrary[0].videoId });
  await h.command('startSinging'); await settle(h);
  const original = f.state(); f.now += 120000; await h.renew(); await settle(h);
  assert.deepEqual(f.state(), original, 'visual timer never scores, stops audio, or rotates');
  f.db.put('.info/connected', false); await settle(h);
  assert.equal(h.own, false); assert.equal(h.lastStatus, 'offline'); const offlineWrites = f.db.writes;
  for (const timer of f.timers.values()) timer.fn(); await h.renew(); await settle(h);
  assert.equal(f.db.writes, offlineWrites); assert.deepEqual(f.state(), original);
  await assert.rejects(h.command('next'));
  f.db.put('.info/connected', true); await settle(h); assert.equal(h.own, true);
  assert.deepEqual(f.state(), original, 'reconnection keeps the unfinished singing turn');
  f.room.code = 'NEWROOM'; await h.renew(); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.own, false); assert.deepEqual(f.state(), original);
  await assert.rejects(h.command('next'));
  h.close(); await settle(h); assert.equal(f.timers.size, 0); assert.equal(f.listenerCount(), 0);
  const closedWrites = f.db.writes;
  await h.renew(); h.connect(); await settle(h); assert.equal(f.db.writes, closedWrites);
});

function singingProgress(state) {
  return { sessionId: state.sessionId, turnId: state.turnId, spotlight: state.spotlight, round: state.round,
    phase: state.phase, teamScore: state.teamScore, challengeResult: state.challengeResult,
    singingState: state.singingState, singingStartedAt: state.singingStartedAt, duration: state.duration };
}

test('host lyrics fan out to every player and survive host replacement without moving the singing turn', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first);
  const videoId = first.latest.songLibrary[0].videoId;
  await first.command('success'); await first.command('selectSong', { videoId });
  await first.command('startSinging'); await settle(first);
  const progress = singingProgress(f.state()), lyrics = 'Our voices fill the room.\r\nA little song, a little smile.\rTogether we go.';
  const expected = lyrics.replace(/\r\n?/g, '\n');
  f.now += 1000;
  await first.command('setLyrics', { videoId, lyrics }); await settle(first);
  assert.equal(f.state().songLyrics[videoId], expected);
  assert.deepEqual(singingProgress(f.state()), progress);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics[videoId], expected);
  const original = f.state(); first.close(); await settle(first);
  const restored = f.host(); await settle(restored);
  assert.equal(restored.own, true); assert.deepEqual(f.state(), original);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics[videoId], expected);
  f.now += 120000; await restored.renew(); await settle(restored);
  assert.deepEqual(singingProgress(f.state()), progress, 'lyrics and elapsed time never score or advance');
  restored.close(); await settle(restored);
});

test('lyrics permissions use the real player card and stale previous-turn text cannot replace saved lyrics', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const videoId = h.latest.songLibrary[0].videoId, originalText = 'We have a song to share.';
  await h.command('setLyrics', { videoId, lyrics: originalText }); await settle(h);
  const progress = singingProgress(f.state());
  const spoof = await f.action(2, 'setLyrics', { actor: 0, videoId, lyrics: 'A listener cannot replace the text.' }); await settle(h);
  assert.equal(f.state().songLyrics[videoId], originalText);
  assert.equal(f.card(2).openmic.reply.id, spoof.id); assert.equal(f.card(2).openmic.reply.error, 'not_available');
  assert.deepEqual(singingProgress(f.state()), progress);
  const spotlightText = 'Spotlight adds a little line.\nEveryone can read along.';
  const update = await f.action(1, 'setLyrics', { videoId, lyrics: spotlightText }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, update.id); assert.equal(f.card(1).openmic.reply.error, '');
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics[videoId], spotlightText);
  assert.deepEqual(singingProgress(f.state()), progress);
  const revision = f.raw().revision;
  await f.db.ref(f.paths[0]).transaction(old => ({ ...old, openmicAction: update })); await settle(h);
  assert.equal(f.raw().revision, revision, 'replayed lyrics have no second canonical mutation');
  await h.command('next'); await settle(h); assert.equal(h.latest.spotlight, 2);
  const nextProgress = singingProgress(f.state());
  const stale = await f.action(1, 'setLyrics', { actor: 0, videoId, lyrics: 'An old turn must not overwrite.', turnId: update.turnId }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, stale.id); assert.equal(f.card(1).openmic.reply.error, 'stale_turn');
  assert.equal(f.state().songLyrics[videoId], spotlightText);
  assert.deepEqual(singingProgress(f.state()), nextProgress);
  h.close(); await settle(h);
});

test('Spotlight can sync the full 16000-character lyrics allowance, including JSON-escaped formatting', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const videoId = h.latest.songLibrary[0].videoId, lyrics = '"Party"\n'.repeat(2000);
  assert.equal(lyrics.length, 16000); const progress = singingProgress(f.state());
  const action = await f.action(1, 'setLyrics', { videoId, lyrics }); await settle(h);
  assert.equal(f.card(1).openmic.reply?.id, action.id, 'a valid large action must receive an acknowledgement');
  assert.equal(f.card(1).openmic.reply.error, '');
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics[videoId], lyrics);
  assert.deepEqual(singingProgress(f.state()), progress);
  h.close(); await settle(h);
});

test('invalid lyrics are acknowledged without damage; clearing text removes it from all views', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const videoId = h.latest.songLibrary[0].videoId, lyrics = 'This line belongs to our party.';
  await h.command('setLyrics', { videoId, lyrics }); await settle(h);
  const progress = singingProgress(f.state());
  await assert.rejects(h.command('setLyrics', { videoId, lyrics: 'x'.repeat(16001) }), /invalid_lyrics/);
  await settle(h); assert.equal(f.state().songLyrics[videoId], lyrics);
  const invalid = await f.action(1, 'setLyrics', { videoId, lyrics: 'Hidden\u0000control' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, invalid.id); assert.equal(f.card(1).openmic.reply.error, 'invalid_lyrics');
  assert.equal(f.state().songLyrics[videoId], lyrics);
  const cleared = await f.action(1, 'setLyrics', { videoId, lyrics: '\n \t\n' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, cleared.id); assert.equal(f.card(1).openmic.reply.error, '');
  assert.deepEqual(f.state().songLyrics, {});
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics?.[videoId], undefined);
  assert.deepEqual(singingProgress(f.state()), progress);
  h.close(); await settle(h);
});

test('Spotlight can put a discovery song directly on the shared stage without saving or starting it', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('failed'); await settle(h);
  const before = f.state(), progress = singingProgress(before), revision = f.raw().revision;
  const videoId = 'searchsong1', title = 'A song for our party', observations = [];
  h.onChange = state => { h.latest = state; observations.push(clone(state)); };
  const action = await f.action(1, 'selectSong', { videoId, title }); await settle(h);
  const selected = f.state();
  assert.equal(f.card(1).openmic.reply.id, action.id); assert.equal(f.card(1).openmic.reply.error, '');
  assert.equal(f.raw().revision, revision + 1, 'selection and library registration commit together');
  assert.equal(selected.songLibrary.length, before.songLibrary.length + 1);
  const song = selected.songLibrary.find(candidate => candidate.videoId === videoId);
  assert.ok(song); assert.equal(song.title, title); assert.equal(song.artist, '');
  assert.equal(song.url, 'https://www.youtube.com/watch?v=' + videoId);
  assert.deepEqual(selected.selectedSong, song); assert.deepEqual(selected.mySongs, before.mySongs);
  assert.deepEqual(singingProgress(selected), { ...progress, turnId: progress.turnId + 1 });
  assert.equal(selected.singingAwarded, false); assert.equal(selected.singingStartedAt, null);
  assert.ok(observations.length > 0);
  for (const state of observations) {
    if (state.selectedSong?.videoId === videoId) {
      assert.ok(state.songLibrary.some(candidate => candidate.videoId === videoId), 'no canonical snapshot selects an unregistered song');
      assert.deepEqual(state.mySongs, before.mySongs);
    }
  }
  for (let n = 1; n <= 4; n++) {
    const view = f.card(n).openmic;
    assert.deepEqual(view.selectedSong, normalize(song)); assert.equal(view.phase, 'choice');
    assert.equal(view.singingStartedAt ?? null, null); assert.equal(view.teamScore, 0);
    assert.equal(view.songLibrary.filter(candidate => candidate.videoId === videoId).length, 1);
    assert.deepEqual(Object.values(view.mySongs || {}).flat(), [], 'direct playback does not create a personal favorite');
  }
  const selectedProgress = singingProgress(selected), lyrics = 'We bring a little tune.\nOur friends sing along.';
  const lyricsAction = await f.action(1, 'setLyrics', { videoId, lyrics }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, lyricsAction.id); assert.equal(f.card(1).openmic.reply.error, '');
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).openmic.songLyrics[videoId], lyrics);
  assert.deepEqual(singingProgress(f.state()), selectedProgress);
  assert.deepEqual(f.state().mySongs, before.mySongs);
  h.close(); await settle(h);
});

test('replayed direct selection is acknowledged once and another selection keeps one canonical song', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('success'); await settle(h);
  await f.action(2, 'toggleFavorite', { videoId: h.latest.songLibrary[0].videoId }); await settle(h);
  const videoId = 'searchsong2', baseline = f.state();
  const action = await f.action(1, 'selectSong', { videoId, title: 'Our first title' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.error, ''); const once = f.state(), revision = f.raw().revision;
  await f.db.ref(f.paths[0]).transaction(old => ({ ...old, openmicAction: action })); await settle(h);
  assert.equal(f.raw().revision, revision); assert.deepEqual(f.state(), once);
  assert.equal(f.card(1).openmic.reply.id, action.id);
  await f.action(1, 'setLyrics', { videoId, lyrics: 'The room keeps our own little line.' }); await settle(h);
  const again = await f.action(1, 'selectSong', { videoId, title: 'A later discovery title' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, again.id); assert.equal(f.card(1).openmic.reply.error, '');
  assert.equal(f.state().songLibrary.length, baseline.songLibrary.length + 1);
  assert.equal(f.state().songLibrary.filter(song => song.videoId === videoId).length, 1);
  assert.equal(h.latest.selectedSong.title, 'Our first title', 'an existing room song retains its canonical metadata');
  assert.equal(f.state().songLyrics[videoId], 'The room keeps our own little line.');
  assert.deepEqual(f.state().mySongs, baseline.mySongs);
  assert.equal(h.latest.phase, 'choice'); assert.equal(h.latest.teamScore, 2);
  assert.equal(h.latest.singingState, 'idle'); assert.equal(h.latest.singingStartedAt, null);
  h.close(); await settle(h);
});

test('direct discovery registration rejects spoofed listeners and every unavailable stage phase', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  async function rejectSelection(player, videoId, extra = {}) {
    const before = f.state(), progress = singingProgress(before);
    const action = await f.action(player, 'selectSong', { videoId, title: 'A rejected room song', ...extra }); await settle(h);
    assert.equal(f.card(player).openmic.reply.id, action.id); assert.equal(f.card(player).openmic.reply.error, 'not_available');
    assert.deepEqual(f.state().songLibrary, before.songLibrary); assert.deepEqual(f.state().mySongs, before.mySongs);
    assert.deepEqual(f.state().selectedSong, before.selectedSong); assert.deepEqual(singingProgress(f.state()), progress);
  }
  await rejectSelection(1, 'searchsong3', { actor: 0 });
  await h.command('failed'); await settle(h);
  await rejectSelection(2, 'searchsong4', { actor: 0 });
  await rejectSelection(3, 'searchsong5', { actor: 1 });
  await f.action(1, 'selectSong', { videoId: 'searchsong6', title: 'Our allowed stage song' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.error, '');
  await f.action(1, 'startSinging'); await settle(h);
  await rejectSelection(1, 'searchsong7');
  const singing = f.state();
  await assert.rejects(h.command('selectSong', { videoId: 'searchsong8', title: 'Host cannot replace a live song' }), /not_available/);
  await settle(h); assert.deepEqual(f.state().songLibrary, singing.songLibrary);
  assert.deepEqual(singingProgress(f.state()), singingProgress(singing));
  await f.action(1, 'skip'); await settle(h);
  await rejectSelection(1, 'searchsong9');
  assert.equal(h.latest.teamScore, 0, 'rejected choices and skipping never award a singing point');
  h.close(); await settle(h);
});

test('old turn and session discovery choices cannot inject new songs into the current room', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const oldTurn = h.latest.turnId; await h.command('failed'); await settle(h);
  const before = f.state();
  const stale = await f.action(1, 'selectSong', { videoId: 'stalesong01', title: 'An old result', turnId: oldTurn }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, stale.id); assert.equal(f.card(1).openmic.reply.error, 'stale_turn');
  assert.deepEqual(f.state().songLibrary, before.songLibrary); assert.deepEqual(f.state().mySongs, before.mySongs);
  assert.deepEqual(singingProgress(f.state()), singingProgress(before));
  const revision = f.raw().revision, rejectedState = f.state();
  const oldSession = await f.action(1, 'selectSong', { videoId: 'stalesong02', title: 'A different session', sessionId: 'expired-party' }); await settle(h);
  assert.equal(f.raw().revision, revision); assert.deepEqual(f.state(), rejectedState);
  assert.notEqual(f.card(1).openmic.reply.id, oldSession.id, 'another session never receives a current-room acknowledgement');
  const accepted = await f.action(1, 'selectSong', { videoId: 'stalesong03', title: 'The current choice' }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, accepted.id); assert.equal(f.card(1).openmic.reply.error, '');
  const selected = f.state();
  const delayed = await f.action(1, 'selectSong', { videoId: 'stalesong04', title: 'A delayed second result', turnId: accepted.turnId }); await settle(h);
  assert.equal(f.card(1).openmic.reply.id, delayed.id); assert.equal(f.card(1).openmic.reply.error, 'stale_turn');
  assert.deepEqual(f.state().songLibrary, selected.songLibrary); assert.deepEqual(f.state().selectedSong, selected.selectedSong);
  assert.deepEqual(singingProgress(f.state()), singingProgress(selected)); assert.deepEqual(f.state().mySongs, before.mySongs);
  h.close(); await settle(h);
});
