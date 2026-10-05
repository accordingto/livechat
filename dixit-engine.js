/* Dixit base rules (current 3–8 player edition). The authoritative host keeps
 * this state; view() is the complete, explicit allow-list sent to each seat.
 * All randomness comes from captured seeds, so transaction retries are pure.
 */
var DIXIT_ENGINE = (() => {
  'use strict';

  // Firebase can omit empty containers and return numeric-key objects.
  const list = value => Array.isArray(value) ? value.filter(x => x != null) :
    Object.keys(value || {}).sort((a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : 0)
      .map(key => value[key]).filter(x => x != null);
  const copy = value => JSON.parse(JSON.stringify(value));
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const seatNumber = value => (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : NaN;
  const cards = Array.from({ length: 84 }, (_, i) => 'd' + String(i + 1).padStart(3, '0'));
  const HOST_TYPES = ['deal', 'reveal', 'advanceReveal', 'nextRound', 'cancel', 'restart', 'pause', 'resume'];
  const boundHost = s => s.roster.some(p => p.playerNum === seatNumber(s.hostPlayerNum)) ? seatNumber(s.hostPlayerNum) :
    s.roster.find(p => p.playerNum === 1)?.playerNum || s.roster[0]?.playerNum;

  function seedValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0) || 1;
    let result = 2166136261;
    for (const char of String(value == null ? 'dixit' : value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return (result >>> 0) || 1;
  }
  function shuffle(items, seed) {
    let random = seedValue(seed);
    const result = list(items).slice();
    for (let i = result.length - 1; i > 0; i--) {
      random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
      const j = Math.floor((random >>> 0) / 4294967296 * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function create({ id, roster, seed, now, hostPlayerNum = 1 } = {}) {
    const players = list(roster);
    if (!id || players.length < 3 || players.length > 8) throw new Error('invalid_setup');
    if (players.some(p => !p || !Number.isInteger(p.playerNum) || p.playerNum < 1) ||
        new Set(players.map(p => p.playerNum)).size !== players.length) throw new Error('invalid_roster');
    return {
      version: 1, artworkVersion: 2, hostPlayerNum: boundHost({ roster: players, hostPlayerNum }), sessionId: String(id), phase: 'LOBBY', turnId: 0, revision: 0,
      roster: players.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').trim().slice(0, 80) })),
      paused: false, readiness: {}, hands: {}, submissions: {}, votes: {}, table: [],
      deck: [], discard: [], storyteller: null, round: 0, clue: '', clueMode: '', scores: {},
      lastRound: null, winners: [], revealStage: '', revealStartedAt: 0, revealAnswerAt: 0, revealPopularAt: 0, revealPausedAt: 0, rngState: seedValue(seed), createdAt: Number(now) || 0,
      seen: {}, replies: {},
    };
  }
  function normalize(current) {
    const s = copy(current);
    for (const key of ['roster', 'table', 'deck', 'discard', 'winners']) s[key] = list(s[key]);
    s.hostPlayerNum = boundHost(s);
    for (const key of ['readiness', 'hands', 'submissions', 'votes', 'scores', 'seen', 'replies']) {
      s[key] = Object.fromEntries(Object.entries(s[key] || {}).filter(([, value]) => value != null));
    }
    for (const actor of Object.keys(s.seen)) s.seen[actor] = list(s.seen[actor]);
    s.lastRound = s.lastRound || null; s.storyteller = s.storyteller == null ? null : s.storyteller;
    s.clue = typeof s.clue === 'string' ? s.clue : '';
    s.clueMode = s.clueMode === 'spoken' ? 'spoken' : s.clue ? 'text' : '';
    if (s.clueMode === 'spoken') s.clue = '';
    for (const player of s.roster) {
      const seat = player.playerNum;
      s.hands[seat] = list(s.hands[seat]);
      if (s.submissions[seat] != null) s.submissions[seat] = list(s.submissions[seat]);
      if (s.votes[seat] == null) delete s.votes[seat];
    }
    if (s.lastRound) {
      s.lastRound.clue = typeof s.lastRound.clue === 'string' ? s.lastRound.clue : '';
      s.lastRound.clueMode = s.lastRound.clueMode === 'spoken' ? 'spoken' : s.lastRound.clue ? 'text' : '';
      if (s.lastRound.clueMode === 'spoken') s.lastRound.clue = '';
      s.lastRound.table = list(s.lastRound.table);
      if (s.lastRound.popularCardIds) s.lastRound.popularCardIds = list(s.lastRound.popularCardIds);
      s.lastRound.rows = list(s.lastRound.rows).map(row => ({ ...row, cardIds: list(row.cardIds), voteCardId: row.voteCardId || null }));
    }
    return s;
  }
  function randomize(s, items, cmd, salt) {
    // Mix the captured command seed and prior RNG without cancelling equal seeds.
    const seed = seedValue(String(s.rngState) + ':' + seedValue(cmd.seed) + ':' + salt);
    s.rngState = seedValue(seed ^ 0x9e3779b9);
    return shuffle(items, seed);
  }
  const handSize = s => s.roster.length === 3 ? 7 : 6;
  const submitCount = s => s.roster.length === 3 ? 2 : 1;
  const voters = s => s.roster.filter(p => p.playerNum !== s.storyteller).map(p => p.playerNum);
  const allVoted = s => voters(s).every(seat => has(s.votes, seat));
  function transition(s, phase) { s.phase = phase; s.turnId++; }
  function held(s) { return s.roster.flatMap(p => list(s.submissions[p.playerNum])); }
  function replenish(s, cmd) {
    const needed = s.roster.reduce((total, p) => total + Math.max(0, handSize(s) - s.hands[p.playerNum].length), 0);
    // The current base rules mix remaining draw cards with discards BEFORE
    // refilling anyone if the remaining draw pile cannot refill everyone.
    if (s.deck.length < needed) {
      s.deck = randomize(s, [...s.deck, ...s.discard], cmd, 'refill:' + s.round);
      s.discard = [];
    }
    for (const player of s.roster) {
      const hand = s.hands[player.playerNum];
      while (hand.length < handSize(s) && s.deck.length) hand.push(s.deck.shift());
    }
  }
  function scoreRound(s) {
    const answerCardId = s.submissions[s.storyteller][0], eligible = voters(s);
    const correctCount = eligible.filter(seat => s.votes[seat] === answerCardId).length;
    const partial = correctCount > 0 && correctCount < eligible.length;
    const rows = s.roster.map(player => {
      const seat = player.playerNum, telling = seat === s.storyteller;
      const cardIds = s.submissions[seat].slice(), voteCardId = telling ? null : s.votes[seat];
      const correct = !telling && voteCardId === answerCardId;
      const base = telling ? (partial ? 3 : 0) : partial ? (correct ? 3 : 0) : 2;
      // No cap in the current basic edition. Bonuses apply in every branch.
      const bonus = telling ? 0 : eligible.filter(voter => cardIds.includes(s.votes[voter])).length;
      const delta = base + bonus, score = (Number(s.scores[seat]) || 0) + delta;
      s.scores[seat] = score;
      return { playerNum: seat, cardIds, voteCardId, correct, base, bonus, delta, score };
    });
    s.lastRound = {
      round: s.round, storyteller: s.storyteller, clue: s.clue, clueMode: s.clueMode, table: s.table.slice(),
      answerCardId, correctCount, totalVoters: eligible.length,
      outcome: partial ? 'some' : correctCount === 0 ? 'none' : 'all', rows,
    };
    const voteCounts = Object.fromEntries(s.table.map(id => [id, eligible.filter(seat => s.votes[seat] === id).length]));
    s.lastRound.maxVotes = Math.max(...Object.values(voteCounts));
    s.lastRound.popularCardIds = s.table.filter(id => voteCounts[id] === s.lastRound.maxVotes);
    const high = Math.max(...rows.map(row => row.score));
    s.winners = high >= 30 ? rows.filter(row => row.score === high).map(row => row.playerNum) : [];
    s.revealStage = 'complete'; transition(s, high >= 30 ? 'FINISHED' : 'REVEAL');
  }
  function apply(current, input) {
    if (!current || !input || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = seatNumber(input.actor);
    if (!Number.isInteger(actor) || (actor !== 0 && !list(current.roster).some(p => p.playerNum === actor))) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const s = normalize(current), cmd = { ...input, actor }, host = actor === 0 || actor === s.hostPlayerNum;
    let error = '';
    const reject = code => { error = code; };
    if (cmd.sessionId !== s.sessionId) reject('stale_session');
    else if (cmd.turnId !== s.turnId) reject('stale_turn');
    else if (HOST_TYPES.includes(cmd.type) && !host) reject('not_available');
    else if (s.paused && !['resume', 'cancel', 'restart'].includes(cmd.type)) reject('paused');
    else switch (cmd.type) {
      case 'ready':
        if (actor === 0 || s.phase !== 'LOBBY' || typeof cmd.value !== 'boolean') { reject('not_available'); break; }
        s.readiness[actor] = cmd.value;
        break;
      case 'deal': {
        if (s.phase !== 'LOBBY') { reject('not_available'); break; }
        if (cmd.firstPlayerNum != null && !s.roster.some(p => p.playerNum === Number(cmd.firstPlayerNum))) {
          reject('invalid_player'); break;
        }
        s.deck = randomize(s, cards, cmd, 'deal');
        for (const player of s.roster) {
          s.hands[player.playerNum] = s.deck.splice(0, handSize(s)); s.scores[player.playerNum] = 0;
        }
        s.storyteller = cmd.firstPlayerNum != null ? Number(cmd.firstPlayerNum) :
          randomize(s, s.roster.map(p => p.playerNum), cmd, 'first')[0];
        s.round = 1; transition(s, 'CLUE');
        break;
      }
      case 'story': {
        if (actor === 0 || actor !== s.storyteller || s.phase !== 'CLUE') { reject('not_available'); break; }
        const clueMode = cmd.clueMode === 'spoken' ? 'spoken' :
          cmd.clueMode == null || cmd.clueMode === 'text' ? 'text' : null;
        if (!clueMode || clueMode === 'text' &&
            (typeof cmd.clue !== 'string' || !cmd.clue.trim() || Array.from(cmd.clue.trim()).length > 180)) {
          reject('invalid_clue'); break;
        }
        if (!s.hands[actor].includes(cmd.cardId)) { reject('invalid_card'); break; }
        s.hands[actor] = s.hands[actor].filter(id => id !== cmd.cardId);
        s.submissions[actor] = [cmd.cardId]; s.clueMode = clueMode;
        s.clue = clueMode === 'spoken' ? '' : cmd.clue.trim(); transition(s, 'SUBMIT');
        break;
      }
      case 'submit': {
        if (actor === 0 || actor === s.storyteller || s.phase !== 'SUBMIT' || has(s.submissions, actor)) {
          reject('not_available'); break;
        }
        const ids = cmd.cardIds;
        if (!Array.isArray(ids) || ids.length !== submitCount(s) || new Set(ids).size !== ids.length ||
            ids.some(id => typeof id !== 'string' || !s.hands[actor].includes(id))) {
          reject('invalid_cards'); break;
        }
        s.hands[actor] = s.hands[actor].filter(id => !ids.includes(id)); s.submissions[actor] = ids.slice();
        if (s.roster.every(p => has(s.submissions, p.playerNum))) {
          s.table = randomize(s, held(s), cmd, 'table:' + s.round); transition(s, 'VOTE');
        }
        break;
      }
      case 'vote':
        if (actor === 0 || actor === s.storyteller || s.phase !== 'VOTE' || has(s.votes, actor)) {
          reject('not_available'); break;
        }
        if (!s.table.includes(cmd.cardId) || list(s.submissions[actor]).includes(cmd.cardId)) {
          reject('invalid_card'); break;
        }
        s.votes[actor] = cmd.cardId;
        break;
      case 'reveal':
        if (s.phase !== 'VOTE' || !allVoted(s)) { reject('not_available'); break; }
        if (!Number.isFinite(Number(cmd.now)) || Number(cmd.now) < 0) { reject('invalid_time'); break; }
        s.revealStartedAt = Number(cmd.now); s.revealAnswerAt = s.revealStartedAt + 3000;
        s.revealPopularAt = s.revealAnswerAt + 1200; s.revealPausedAt = 0; s.revealStage = 'countdown';
        transition(s, 'REVEALING');
        break;
      case 'advanceReveal':
        if (s.phase !== 'REVEALING') { reject('not_available'); break; }
        if (!Number.isFinite(Number(cmd.now)) || Number(cmd.now) < s.revealAnswerAt) { reject('reveal_not_ready'); break; }
        if (Number(cmd.now) >= s.revealPopularAt) scoreRound(s);
        else if (s.revealStage === 'countdown') { s.revealStage = 'answer'; s.turnId++; }
        else reject('reveal_not_ready');
        break;
      case 'nextRound': {
        if (s.phase !== 'REVEAL') { reject('not_available'); break; }
        s.discard.push(...held(s)); s.submissions = {}; s.votes = {}; s.table = []; s.clue = ''; s.clueMode = ''; s.lastRound = null;
        s.revealStage = ''; s.revealStartedAt = 0; s.revealAnswerAt = 0; s.revealPopularAt = 0; s.revealPausedAt = 0;
        replenish(s, cmd);
        s.storyteller = s.roster[(s.roster.findIndex(p => p.playerNum === s.storyteller) + 1) % s.roster.length].playerNum;
        s.round++; transition(s, 'CLUE');
        break;
      }
      case 'cancel':
        if (['FINISHED', 'CANCELLED'].includes(s.phase)) { reject('not_available'); break; }
        s.paused = false; transition(s, 'CANCELLED');
        break;
      case 'restart': {
        const fresh = create({ id: s.sessionId + ':restart:' + cmd.id, roster: s.roster, seed: cmd.seed, now: cmd.now, hostPlayerNum: s.hostPlayerNum });
        Object.assign(s, fresh); s.turnId = Number(current.turnId) + 1;
        break;
      }
      case 'pause':
        if (s.paused || ['FINISHED', 'CANCELLED'].includes(s.phase)) { reject('not_available'); break; }
        if (s.phase === 'REVEALING') s.revealPausedAt = Number(cmd.now) || 0;
        s.paused = true; s.turnId++;
        break;
      case 'resume':
        if (!s.paused || ['FINISHED', 'CANCELLED'].includes(s.phase)) { reject('not_available'); break; }
        if (s.phase === 'REVEALING') {
          const delay = Math.max(0, Number(cmd.now) - s.revealPausedAt);
          s.revealStartedAt += delay; s.revealAnswerAt += delay; s.revealPopularAt += delay; s.revealPausedAt = 0;
        }
        s.paused = false; s.turnId++;
        break;
      default: reject('not_available');
    }
    s.revision = (Number(current.revision) || 0) + 1;
    // Receipts are per seat. Retain all ids within this bounded-duration game;
    // evicting old ids would allow a late retry to repeat a successful action.
    s.seen[actor] = [...list(s.seen[actor]), cmd.id];
    s.replies[actor] = { id: cmd.id, error };
    return s;
  }
  function view(current, playerNum, now) {
    const s = normalize(current), actor = seatNumber(playerNum), mine = s.roster.find(p => p.playerNum === actor);
    const player = !!mine, host = actor === 0 || player && actor === s.hostPlayerNum, telling = player && actor === s.storyteller;
    const live = !s.paused, ended = ['FINISHED', 'CANCELLED'].includes(s.phase);
    const revealed = ['REVEAL', 'FINISHED'].includes(s.phase);
    const actions = {
      ready: live && player && s.phase === 'LOBBY', deal: live && host && s.phase === 'LOBBY',
      story: live && telling && s.phase === 'CLUE',
      submit: live && player && !telling && s.phase === 'SUBMIT' && !has(s.submissions, actor),
      vote: live && player && !telling && s.phase === 'VOTE' && !has(s.votes, actor),
      reveal: live && host && s.phase === 'VOTE' && allVoted(s),
      advanceReveal: live && host && s.phase === 'REVEALING' && Number(now) >= (s.revealStage === 'answer' ? s.revealPopularAt : s.revealAnswerAt),
      nextRound: live && host && s.phase === 'REVEAL',
      cancel: host && !ended, restart: host,
      pause: host && !s.paused && !ended, resume: host && s.paused && !ended,
    };
    const dixit = {
      version: 1, artworkVersion: Number(s.artworkVersion)||1, sessionId: s.sessionId, turnId: s.turnId, revision: s.revision,
      phase: s.phase, paused: s.paused === true, round: s.round, storyteller: s.storyteller, hostPlayerNum: s.hostPlayerNum, hostControls: !!host,
      revealStage: s.revealStage || '', revealStartedAt: s.revealStartedAt || 0, revealAnswerAt: s.revealAnswerAt || 0, revealPopularAt: s.revealPopularAt || 0, revealPausedAt: s.revealPausedAt || 0,
      clue: s.clue, clueMode: s.clueMode, playerNum: player ? actor : 0,
      roster: s.roster.map(p => ({
        playerNum: p.playerNum, name: p.name, score: Number(s.scores[p.playerNum]) || 0,
        ready: s.readiness[p.playerNum] === true, submitted: has(s.submissions, p.playerNum),
        voted: has(s.votes, p.playerNum), handCount: s.hands[p.playerNum].length,
      })),
      table: ['VOTE', 'REVEALING', 'REVEAL', 'FINISHED'].includes(s.phase) ? s.table.slice() : [],
      result: revealed && s.lastRound ? copy(s.lastRound) : null,
      winners: s.phase === 'FINISHED' ? s.winners.slice() : [], actions,
      submitCount: submitCount(s), deckCount: s.deck.length,
      reply: (player || host) && s.replies[actor] ? copy(s.replies[actor]) : null,
    };
    if (s.phase === 'REVEALING' && s.revealStage === 'answer' && Number(now) >= s.revealAnswerAt) dixit.answerCardId = s.submissions[s.storyteller][0];
    if (player) {
      dixit.hand = s.hands[actor].slice(); dixit.ownSubmitted = list(s.submissions[actor]);
      dixit.ownVote = s.votes[actor] || null;
    }
    return { game: 'dixit', playerNum: player ? actor : 0, name: mine ? mine.name : null, dixit };
  }
  return { create, apply, view, list, shuffle };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DIXIT_ENGINE;
