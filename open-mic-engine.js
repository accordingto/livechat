/* Open Mic Rescue — pure, authoritative party rules.
 * The visible timer is guidance: time alone never scores or advances a turn.
 */
var OPEN_MIC_ENGINE = (() => {
  'use strict';
  const content = typeof OPEN_MIC_CONTENT !== 'undefined' ? OPEN_MIC_CONTENT : require('./open-mic-content.js');
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const active = state => list(state.roster).filter(player => player.active !== false && player.pending !== true);
  const player = (state, number) => list(state.roster).find(candidate => candidate.playerNum === number);
  const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
  const MAX_SONGS = 120;
  const MAX_LYRICS_CHARS = 16000;

  const SCORE = Object.freeze({ challenge: 2, singing: 1 });
  // 'life' (Life Song, the default for new games) draws a memory prompt, then
  // a song. 'next' (Now & Next) uses the same flow with prompts about life now
  // and hopes for the future. 'mission' keeps the original social challenges.
  // Saved games from before modes existed have no mode field and stay on 'mission'.
  const MODES = Object.freeze(['life', 'next', 'mission']);
  const modeOf = state => state && MODES.includes(state.mode) ? state.mode : 'mission';
  const bankFor = mode => list(mode === 'life' ? content.lifePrompts : mode === 'next' ? content.nextPrompts : content.challenges);

  // Old video IDs remain opaque library keys; a projected card carries text only.
  const songReference = song => ({ id: typeof song.id === 'string' ? song.id : song.videoId,
    videoId: song.videoId, title: typeof song.title === 'string' ? song.title : '',
    artist: typeof song.artist === 'string' ? song.artist : '',
    tags: list(song.tags).filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 80)).slice(0, 32) });
  function textSongId(state, commandId) {
    let hash = 2166136261;
    for (const character of commandId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    let number = (hash >>> 0) % 2176782336;
    let id;
    do { id = 'omtxt' + number.toString(36).padStart(6, '0'); number = (number + 1) % 2176782336; }
    while (state.songLibrary.some(song => song.videoId === id));
    return id;
  }

  function random(seed) {
    let value = 2166136261;
    for (const character of String(seed == null ? 1 : seed)) {
      value ^= character.charCodeAt(0); value = Math.imul(value, 16777619);
    }
    return () => {
      value += 0x6D2B79F5;
      let n = value;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }

  function parseYouTube(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    const source = value.trim();
    const authority = source.match(/^https?:\/\/([^/?#]*)/i);
    // Reject lookalike or escaped authorities before URL's Unicode normalization.
    if (!authority || !/^[A-Za-z0-9.-]+(?::[0-9]+)?$/.test(authority[1])) return null;
    let url;
    try { url = new URL(source); } catch (_) { return null; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    let videoId = null;
    if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) {
      const match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      videoId = match && match[1];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) videoId = url.searchParams.get('v');
      else {
        const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/);
        videoId = match && match[1];
      }
    }
    return typeof videoId === 'string' && videoIdPattern.test(videoId) ? videoId : null;
  }

  function chooseChallenge(state, rng) {
    const bank = bankFor(modeOf(state));
    const seen = list(state.challengeHistory);
    let candidates = bank.filter(challenge => !seen.includes(challenge.id));
    if (!candidates.length) {
      state.challengeHistory = [];
      candidates = bank.length > 1 ? bank.filter(challenge => challenge.id !== state.challenge?.id) : bank;
    }
    const selected = candidates[Math.floor(rng() * candidates.length)];
    state.challenge = copy(selected);
    state.challengeHistory = [...list(state.challengeHistory), selected.id];
  }

  function changed(state, now) { state.turnId++; state.lastChangeAt = now; }
  function award(state, kind) {
    const field = kind === 'challenge' ? 'challengeAwarded' : 'singingAwarded';
    if (state[field]) return;
    state.teamScore += SCORE[kind];
    state[field] = true;
  }
  function finishSinging(state, now) {
    award(state, 'singing');
    state.phase = 'finished'; state.singingState = 'finished'; changed(state, now);
  }
  function beginTurn(state, spotlight, now, rng) {
    state.spotlight = spotlight;
    state.round++;
    state.phase = 'challenge';
    state.challengeResult = null;
    state.challengeAwarded = false; state.singingAwarded = false;
    state.selectedSong = null; state.duet = null;
    state.singingState = 'idle'; state.singingStartedAt = null;
    chooseChallenge(state, rng); changed(state, now);
  }
  function nextPlayer(state) {
    const roster = list(state.roster);
    const start = roster.findIndex(candidate => candidate.playerNum === state.spotlight);
    for (let offset = 1; offset <= roster.length; offset++) {
      const candidate = roster[(start + offset + roster.length) % roster.length];
      if (candidate.active !== false && candidate.pending !== true) return candidate.playerNum;
    }
    return null;
  }

  function create({ id, roster, now, seed, singingDuration = 35, mode = 'life' } = {}) {
    if (typeof id !== 'string' || !id || id.length > 100 || !Number.isFinite(now) || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (roster.some(candidate => !candidate || !Number.isInteger(candidate.playerNum) || candidate.playerNum < 1) || new Set(roster.map(candidate => candidate.playerNum)).size !== roster.length) throw new Error('invalid_roster');
    if (!Number.isFinite(singingDuration) || singingDuration < 1 || singingDuration > 600) throw new Error('invalid_duration');
    if (!MODES.includes(mode)) throw new Error('invalid_mode');
    if (!bankFor(mode).length) throw new Error('missing_challenges');
    const songs = list(content.songs).filter(song => song && videoIdPattern.test(song.videoId));
    const songLibrary = songs.filter((song, index) => songs.findIndex(other => other.videoId === song.videoId) === index).slice(0, MAX_SONGS).map(copy);
    const state = {
      version: 1, sessionId: id, turnId: 0, mode,
      roster: roster.map(candidate => ({ playerNum: candidate.playerNum, name: String(candidate.name || '').trim().slice(0, 80), active: candidate.active !== false })),
      spotlight: null, round: 0, phase: 'challenge', challenge: null, challengeHistory: [], challengeResult: null,
      teamScore: 0, challengeAwarded: false, singingAwarded: false,
      selectedSong: null, singingState: 'idle', singingStartedAt: null, duration: singingDuration, duet: null,
      songLibrary, songLyrics: {}, mySongs: {}, lastChangeAt: now, seen: {}, replies: {},
    };
    if (active(state).length < 2) throw new Error('not_enough_players');
    for (const candidate of state.roster) state.mySongs[candidate.playerNum] = [];
    beginTurn(state, active(state)[0].playerNum, now, random(seed));
    return state;
  }

  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    if (input.actor == null || input.actor === '' || typeof input.actor === 'boolean') return current;
    const actor = Number(input.actor);
    if (!Number.isInteger(actor) || (actor !== 0 && !player(current, actor))) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    // A timer tick has no authority in this game. Reconnecting never replays turns.
    if (input.type === 'tick') return current;
    const state = copy(current);
    state.roster = list(state.roster); state.songLibrary = list(state.songLibrary);
    state.challengeHistory = list(state.challengeHistory);
    state.mySongs = state.mySongs || {}; state.songLyrics = state.songLyrics || {};
    state.seen = state.seen || {}; state.replies = state.replies || {};
    const host = actor === 0;
    const manager = host || (state.sharedControls === true && player(state, actor)?.active !== false && player(state, actor)?.pending !== true);
    const isSpotlight = host || (actor === state.spotlight && player(state, actor)?.active !== false && player(state, actor)?.pending !== true);
    const now = input.now;
    const rng = random(input.seed);
    let error = '';
    const selfReturn = state.sharedControls === true && input.type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
    if (input.turnId !== state.turnId) error = 'stale_turn';
    else if (!Number.isFinite(now) || now < state.lastChangeAt) error = 'invalid_time';
    else if (!host && state.sharedControls === true && (player(state, actor).active === false || player(state, actor).pending === true) && !selfReturn) error = 'not_available';
    else if (state.phase === 'stopped' && !['restart', 'stop', 'exclude', 'addSong', 'toggleFavorite'].includes(input.type)) error = 'not_available';
    else switch (input.type) {
      case 'stop':
        if (!manager) error = 'not_available';
        else if (state.phase !== 'stopped') { state.phase = 'stopped'; state.singingState = 'idle'; state.singingStartedAt = null; changed(state, now); }
        break;
      case 'restart': {
        if (!manager) { error = 'not_available'; break; }
        if (active(state).length < 2) { error = 'not_enough_players'; break; }
        const previousTurn = state.turnId, seen = state.seen, replies = state.replies;
        const mode = input.mode == null ? modeOf(state) : input.mode;
        if (!MODES.includes(mode)) { error = 'invalid_mode'; break; }
        const fresh = create({ id: state.sessionId, roster: state.roster, now, seed: input.seed, singingDuration: state.duration, mode });
        const preserve = { sharedControls: state.sharedControls, runtimeOfflineNums: state.runtimeOfflineNums,
          songLibrary: state.songLibrary, mySongs: state.mySongs, seen, replies, turnId: previousTurn + 1 };
        Object.assign(state, fresh, preserve);
        break;
      }
      case 'success':
      case 'failed':
        if (!manager || state.phase !== 'challenge') error = 'not_available';
        else {
          state.challengeResult = input.type;
          if (input.type === 'success') award(state, 'challenge');
          state.phase = 'choice'; changed(state, now);
        }
        break;
      case 'setMode':
        // Switching during the prompt redraws it from the new deck; later in a
        // turn the new mode starts with the next player.
        if (!manager) error = 'not_available';
        else if (!MODES.includes(input.mode)) error = 'invalid_mode';
        else if (input.mode !== modeOf(state)) {
          state.mode = input.mode;
          if (state.phase === 'challenge') chooseChallenge(state, rng);
          changed(state, now);
        }
        break;
      case 'newChallenge':
        if (!manager || state.phase !== 'challenge') error = 'not_available';
        else { chooseChallenge(state, rng); changed(state, now); }
        break;
      case 'selectSong': {
        if (!isSpotlight || !['choice', 'singing', 'finished'].includes(state.phase)) { error = 'not_available'; break; }
        // Re-selecting a live or finished video leaves playback and timing alone.
        if (['singing', 'finished'].includes(state.phase) && state.selectedSong && state.selectedSong.videoId === input.videoId) break;
        let selected = state.songLibrary.find(song => song.videoId === input.videoId);
        if (!selected) {
          if (typeof input.videoId !== 'string' || input.videoId.length !== 11 || !videoIdPattern.test(input.videoId) || !Object.hasOwn(input, 'title')) { error = 'invalid_song'; break; }
          const title = typeof input.title === 'string' ? input.title.trim() : '';
          if (!title || title.length > 140 || /[\u0000-\u001f\u007f]/.test(input.title)) { error = 'invalid_title'; break; }
          if (state.songLibrary.length >= MAX_SONGS) { error = 'library_full'; break; }
          selected = { id: input.videoId, videoId: input.videoId, title, artist: '', tags: [],
            ownerPlayerNum: state.spotlight, custom: true };
          // A direct stage selection joins the shared library, never favorites.
          state.songLibrary.push(selected);
        }
        state.selectedSong = copy(selected);
        if (state.phase === 'singing') {
          state.phase = 'choice'; state.singingState = 'idle'; state.singingStartedAt = null;
        } else if (state.phase === 'finished') state.singingStartedAt = null;
        changed(state, now);
        break;
      }
      case 'clearSong': {
        if (!isSpotlight || !['choice', 'singing', 'finished'].includes(state.phase)) { error = 'not_available'; break; }
        const finished = state.phase === 'finished';
        state.selectedSong = null; state.duet = null;
        state.phase = finished ? 'finished' : 'choice';
        state.singingState = finished ? 'finished' : 'idle'; state.singingStartedAt = null;
        changed(state, now);
        break;
      }
      case 'startSinging':
        if (!isSpotlight || state.phase !== 'choice') error = 'not_available';
        else if (!state.selectedSong) error = 'choose_song';
        else {
          state.singingState = 'singing'; state.singingStartedAt = now;
          state.phase = 'singing'; changed(state, now);
        }
        break;
      case 'finishSinging':
        if (!isSpotlight || state.phase !== 'singing') error = 'not_available';
        else finishSinging(state, now);
        break;
      case 'skip':
        if (!isSpotlight || !['choice', 'singing'].includes(state.phase)) error = 'not_available';
        else {
          state.phase = 'finished'; state.singingState = 'finished'; changed(state, now);
        }
        break;
      case 'inviteDuet': {
        const partner = input.playerNum == null ? null : player(state, Number(input.playerNum));
        if (!isSpotlight || !['choice', 'singing'].includes(state.phase)) error = 'not_available';
        else if (input.playerNum != null && (!partner || partner.active === false || partner.pending === true || partner.playerNum === state.spotlight)) error = 'invalid_player';
        else { state.duet = partner?.playerNum ?? null; changed(state, now); }
        break;
      }
      case 'setLyrics': {
        // Retired commands never change or re-publish saved room lyrics.
        error = 'not_available';
        break;
      }
      case 'next': {
        if (!manager) { error = 'not_available'; break; }
        const next = nextPlayer(state);
        if (next == null) { error = 'not_enough_players'; break; }
        if (state.phase === 'singing') award(state, 'singing');
        beginTurn(state, next, now, rng);
        break;
      }
      case 'exclude': {
        const candidate = player(state, Number(input.playerNum));
        const selfReturn = state.sharedControls === true && Number(input.playerNum) === actor && input.active === true;
        if (!manager && !selfReturn) { error = 'not_available'; break; }
        if (!candidate || typeof input.active !== 'boolean') { error = 'invalid_player'; break; }
        if (candidate.active === input.active) break;
        candidate.active = input.active;
        if (state.duet === candidate.playerNum && !input.active) state.duet = null;
        if (state.phase === 'stopped') { changed(state, now); break; }
        if (state.spotlight === candidate.playerNum && !input.active) {
          const next = nextPlayer(state);
          // An excluded singer did not finish: preserve earned challenge points only.
          if (next != null) beginTurn(state, next, now, rng);
          else {
            state.spotlight = null; state.phase = 'finished'; state.challenge = null;
            state.challengeResult = null; state.selectedSong = null; state.duet = null;
            state.singingState = 'idle'; state.singingStartedAt = null;
            changed(state, now);
          }
        } else if (state.spotlight == null && input.active) beginTurn(state, candidate.playerNum, now, rng);
        else changed(state, now);
        break;
      }
      case 'addSong':
      case 'toggleFavorite': {
        const owner = host ? Number(input.ownerPlayerNum ?? state.spotlight) : actor;
        if (!player(state, owner)) { error = 'invalid_player'; break; }
        if (!host && input.ownerPlayerNum != null && Number(input.ownerPlayerNum) !== actor) { error = 'not_available'; break; }
        const favorites = list(state.mySongs[owner]);
        if (input.type === 'toggleFavorite') {
          if (!state.songLibrary.some(song => song.videoId === input.videoId)) { error = 'invalid_song'; break; }
          state.mySongs[owner] = favorites.includes(input.videoId) ? favorites.filter(id => id !== input.videoId) : [...favorites, input.videoId];
        } else {
          const title = typeof input.title === 'string' ? input.title.trim() : '';
          if (!title || title.length > 140 || /[\u0000-\u001f\u007f]/.test(title)) { error = 'invalid_title'; break; }
          const artist = input.artist == null ? '' : typeof input.artist === 'string' ? input.artist.trim() : null;
          if (artist == null || artist.length > 140 || /[\u0000-\u001f\u007f]/.test(artist)) { error = 'invalid_title'; break; }
          let videoId;
          if (Object.hasOwn(input, 'url')) {
            // Legacy clients may still identify a song by URL; no media is saved.
            videoId = parseYouTube(input.url);
            if (!videoId) { error = 'invalid_url'; break; }
          } else {
            const existing = state.songLibrary.find(song => /^omtxt[a-z0-9]{6}$/.test(song.videoId || '') && song.title === title && (song.artist || '') === artist);
            videoId = existing ? existing.videoId : textSongId(state, input.id);
          }
          if (!state.songLibrary.some(song => song.videoId === videoId)) {
            if (state.songLibrary.length >= MAX_SONGS) { error = 'library_full'; break; }
            state.songLibrary.push({ id: videoId, videoId, title, artist, tags: [], ownerPlayerNum: owner, custom: true });
          }
          state.mySongs[owner] = favorites.includes(videoId) ? favorites : [...favorites, videoId];
        }
        // Personal song edits do not invalidate concurrent stage controls.
        state.lastChangeAt = now;
        break;
      }
      default: error = 'not_available';
    }
    state.seen[actor] = [...list(state.seen[actor]), input.id].slice(-32);
    state.replies[actor] = { id: input.id, error };
    return state;
  }

  // Membership is authenticated by the service; bearer credentials never enter
  // the game state. Keep ordinal seats, earned progress and the live activity.
  function membership(current, change, ctx = {}) {
    if (!current || !Number.isFinite(ctx.now) || ctx.now < current.lastChangeAt) throw new Error('invalid_time');
    const added = list(change?.added), names = list(change?.roster), inactive = list(change?.inactiveNums);
    const old = list(current.roster), existing = new Set(old.map(p => p.playerNum));
    if (old.length + added.length > 9 || added.some(p => !Number.isInteger(p?.playerNum) || p.playerNum < 1 || p.playerNum > 9 || existing.has(p.playerNum))
        || new Set(added.map(p => p.playerNum)).size !== added.length) throw new Error('invalid_roster');
    const next = copy(current);
    next.roster = old.map(copy).concat(added.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').trim().slice(0, 80), active: true })));
    if (inactive.some(n => !Number.isInteger(n) || !next.roster.some(p => p.playerNum === n))) throw new Error('invalid_player');
    for (const descriptor of names) {
      const seat = next.roster.find(p => p.playerNum === descriptor.playerNum);
      if (!seat) throw new Error('invalid_roster');
      seat.name = String(descriptor.name || '').trim().slice(0, 80);
    }
    next.mySongs ||= {};
    for (const seat of added) next.mySongs[seat.playerNum] = [];
    let state = next;
    const changedNums = [];
    for (const seat of next.roster) {
      const active = !inactive.includes(seat.playerNum);
      if ((seat.active !== false) === active) continue;
      changedNums.push(seat.playerNum);
      state = apply(state, { type: 'exclude', actor: 0, id: String(ctx.id || 'membership').slice(0, 70) + ':' + seat.playerNum,
        sessionId: state.sessionId, turnId: state.turnId, playerNum: seat.playerNum, active, now: ctx.now, seed: ctx.seed });
      if (state.replies?.[0]?.error) throw new Error(state.replies[0].error);
    }
    // Explicitly selected away seats must not be returned by presence recovery.
    state.runtimeOfflineNums = list(state.runtimeOfflineNums).filter(n => !inactive.includes(n) && !changedNums.includes(n));
    return state;
  }
  function view(state, actor, now) {
    const playerNum = Number(actor);
    const roster = list(state.roster).map(candidate => ({ playerNum: candidate.playerNum, name: candidate.name, active: candidate.active !== false, ...(candidate.pending === true ? { pending: true } : {}) }));
    const mySongs = {};
    for (const candidate of roster) mySongs[candidate.playerNum] = list((state.mySongs || {})[candidate.playerNum]);
    return { game: 'openmic', playerNum, name: roster.find(candidate => candidate.playerNum === playerNum)?.name || null,
      openmic: {
        version: 1, sessionId: state.sessionId, turnId: state.turnId, mode: modeOf(state), roster,
        ...(state.sharedControls === true ? { sharedControls: true, canManage: playerNum === 0 || !!player(state, playerNum) && player(state, playerNum).active !== false && player(state, playerNum).pending !== true } : {}),
        spotlight: state.spotlight ?? null, round: state.round, phase: state.phase,
        challenge: state.challenge ? copy(state.challenge) : null, challengeResult: state.challengeResult ?? null,
        teamScore: state.teamScore, selectedSong: state.selectedSong ? songReference(state.selectedSong) : null,
        singingState: state.singingState, singingStartedAt: state.singingStartedAt ?? null,
        singingAwarded: state.singingAwarded === true,
        duration: state.duration, duet: state.duet ?? null,
        songLibrary: list(state.songLibrary).map(songReference), songLyrics: {}, mySongs,
        reply: (state.replies || {})[playerNum] ? copy(state.replies[playerNum]) : null,
      } };
  }
  return { create, apply, membership, view, list, parseYouTube, SCORE, MODES, MAX_LYRICS_CHARS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OPEN_MIC_ENGINE;
