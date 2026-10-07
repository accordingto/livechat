/* Open Mic Rescue — pure, authoritative party rules.
 * The visible timer is guidance: time alone never scores or advances a turn.
 */
var OPEN_MIC_ENGINE = (() => {
  'use strict';
  const content = typeof OPEN_MIC_CONTENT !== 'undefined' ? OPEN_MIC_CONTENT : require('./open-mic-content.js');
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const active = state => list(state.roster).filter(player => player.active !== false);
  const player = (state, number) => list(state.roster).find(candidate => candidate.playerNum === number);
  const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
  const MAX_SONGS = 120;
  const MAX_LYRICS_CHARS = 16000;
  const SCORE = Object.freeze({ challenge: 2, singing: 1 });

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
    const bank = list(content.challenges);
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
      if (candidate.active !== false) return candidate.playerNum;
    }
    return null;
  }

  function create({ id, roster, now, seed, singingDuration = 35 } = {}) {
    if (typeof id !== 'string' || !id || id.length > 100 || !Number.isFinite(now) || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (roster.some(candidate => !candidate || !Number.isInteger(candidate.playerNum) || candidate.playerNum < 1) || new Set(roster.map(candidate => candidate.playerNum)).size !== roster.length) throw new Error('invalid_roster');
    if (!Number.isFinite(singingDuration) || singingDuration < 1 || singingDuration > 600) throw new Error('invalid_duration');
    if (!list(content.challenges).length) throw new Error('missing_challenges');
    const songs = list(content.songs).filter(song => song && videoIdPattern.test(song.videoId));
    const songLibrary = songs.filter((song, index) => songs.findIndex(other => other.videoId === song.videoId) === index).slice(0, MAX_SONGS).map(copy);
    const state = {
      version: 1, sessionId: id, turnId: 0,
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
    const isSpotlight = host || (actor === state.spotlight && player(state, actor)?.active !== false);
    const now = input.now;
    const rng = random(input.seed);
    let error = '';
    if (input.turnId !== state.turnId) error = 'stale_turn';
    else if (!Number.isFinite(now) || now < state.lastChangeAt) error = 'invalid_time';
    else switch (input.type) {
      case 'success':
      case 'failed':
        if (!host || state.phase !== 'challenge') error = 'not_available';
        else {
          state.challengeResult = input.type;
          if (input.type === 'success') award(state, 'challenge');
          state.phase = 'choice'; changed(state, now);
        }
        break;
      case 'newChallenge':
        if (!host || state.phase !== 'challenge') error = 'not_available';
        else { chooseChallenge(state, rng); changed(state, now); }
        break;
      case 'selectSong': {
        const selected = state.songLibrary.find(song => song.videoId === input.videoId);
        if (!isSpotlight || state.phase !== 'choice') error = 'not_available';
        else if (!selected) error = 'invalid_song';
        else { state.selectedSong = copy(selected); changed(state, now); }
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
        else if (input.playerNum != null && (!partner || partner.active === false || partner.playerNum === state.spotlight)) error = 'invalid_player';
        else { state.duet = partner?.playerNum ?? null; changed(state, now); }
        break;
      }
      case 'setLyrics': {
        if (!isSpotlight) { error = 'not_available'; break; }
        if (!state.songLibrary.some(song => song.videoId === input.videoId)) { error = 'invalid_song'; break; }
        if (typeof input.lyrics !== 'string' || input.lyrics.length > MAX_LYRICS_CHARS || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.lyrics)) { error = 'invalid_lyrics'; break; }
        if (input.onlyIfEmpty === true && typeof state.songLyrics[input.videoId] === 'string' && state.songLyrics[input.videoId].trim()) { error = 'lyrics_exists'; break; }
        const lyrics = input.lyrics.replace(/\r\n?/g, '\n');
        if (lyrics.trim()) state.songLyrics[input.videoId] = lyrics;
        else delete state.songLyrics[input.videoId];
        // Shared text edits preserve the live song, its timer, and phase token.
        state.lastChangeAt = now;
        break;
      }
      case 'next': {
        if (!host) { error = 'not_available'; break; }
        const next = nextPlayer(state);
        if (next == null) { error = 'not_enough_players'; break; }
        if (state.phase === 'singing') award(state, 'singing');
        beginTurn(state, next, now, rng);
        break;
      }
      case 'exclude': {
        const candidate = player(state, Number(input.playerNum));
        if (!host) { error = 'not_available'; break; }
        if (!candidate || typeof input.active !== 'boolean') { error = 'invalid_player'; break; }
        if (candidate.active === input.active) break;
        candidate.active = input.active;
        if (state.duet === candidate.playerNum && !input.active) state.duet = null;
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
          const videoId = parseYouTube(input.url);
          const title = typeof input.title === 'string' ? input.title.trim() : '';
          if (!videoId) { error = 'invalid_url'; break; }
          if (!title || title.length > 140 || /[\u0000-\u001f\u007f]/.test(title)) { error = 'invalid_title'; break; }
          if (!state.songLibrary.some(song => song.videoId === videoId)) {
            if (state.songLibrary.length >= MAX_SONGS) { error = 'library_full'; break; }
            state.songLibrary.push({ id: videoId, videoId, title, artist: '', tags: [],
              thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
              url: 'https://www.youtube.com/watch?v=' + videoId, ownerPlayerNum: owner, custom: true });
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

  function view(state, actor, now) {
    const playerNum = Number(actor);
    const roster = list(state.roster).map(candidate => ({ playerNum: candidate.playerNum, name: candidate.name, active: candidate.active !== false }));
    const mySongs = {};
    for (const candidate of roster) mySongs[candidate.playerNum] = list((state.mySongs || {})[candidate.playerNum]);
    return { game: 'openmic', playerNum, name: roster.find(candidate => candidate.playerNum === playerNum)?.name || null,
      openmic: {
        version: 1, sessionId: state.sessionId, turnId: state.turnId, roster,
        spotlight: state.spotlight ?? null, round: state.round, phase: state.phase,
        challenge: state.challenge ? copy(state.challenge) : null, challengeResult: state.challengeResult ?? null,
        teamScore: state.teamScore, selectedSong: state.selectedSong ? copy(state.selectedSong) : null,
        singingState: state.singingState, singingStartedAt: state.singingStartedAt ?? null,
        singingAwarded: state.singingAwarded === true,
        duration: state.duration, duet: state.duet ?? null,
        songLibrary: list(state.songLibrary).map(copy), songLyrics: copy(state.songLyrics || {}), mySongs,
        reply: (state.replies || {})[playerNum] ? copy(state.replies[playerNum]) : null,
      } };
  }
  return { create, apply, view, list, parseYouTube, SCORE, MAX_LYRICS_CHARS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OPEN_MIC_ENGINE;
