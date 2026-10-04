/* Once Upon a Time: pure, deterministic tabletop rules. Only the authoritative
 * host stores this state; clients receive the explicit allow-list in view().
 * Commands carry a session, narrative turn, and per-actor id. Transaction retries
 * never use Math.random(), clocks, or mutate the input state.
 */
var ONCE_ENGINE = (() => {
  'use strict';
  const deck = typeof ONCE_DECK !== 'undefined' ? ONCE_DECK : require('./once-upon-a-time-deck.js');
  // Firebase drops empty containers and sometimes returns numeric-key objects.
  const list = value => Array.isArray(value) ? value.filter(x => x != null) :
    Object.keys(value || {}).sort((a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : 0)
      .map(key => value[key]).filter(x => x != null);
  const copy = value => JSON.parse(JSON.stringify(value));
  const storyCards = list(deck.storyCards), endingCards = list(deck.endingCards);
  const storyById = Object.fromEntries(storyCards.map(card => [card.id, card]));
  const endingById = Object.fromEntries(endingCards.map(card => [card.id, card]));
  const HOST_TYPES = ['deal', 'chooseFirst', 'randomFirst', 'finishVote', 'resolveSocial', 'restart', 'cancel'];
  const TURN_FREE = ['ready', 'vote', 'finishVote', 'resolveSocial'];
  function seedValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0) || 1;
    let result = 2166136261;
    for (const char of String(value == null ? 'once' : value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
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
  function create({ id, roster, seed, now } = {}) {
    const players = list(roster);
    if (!id || players.length < 2 || players.length > 6) throw new Error('invalid_setup');
    if (new Set(players.map(p => p.playerNum)).size !== players.length ||
        players.some(p => !Number.isInteger(p.playerNum) || p.playerNum < 1)) throw new Error('invalid_roster');
    return {
      version: 1, sessionId: String(id), phase: 'LOBBY', turnId: 0, revision: 0,
      roster: players.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').trim().slice(0, 80) })),
      readiness: {}, hands: {}, endings: {}, storyteller: null, winner: null,
      storyDeck: [], storyDiscard: [], storyHeld: [], endingDeck: [], endingDiscard: [],
      starterCard: null, history: [], log: [], lastAction: null, categoryOpportunity: null,
      latestPlay: null, interrupt: null, vote: null, passPlayer: null, endingPlayed: null,
      rngState: seedValue(seed), createdAt: Number(now) || 0, replies: {}, seen: {},
    };
  }
  function normalize(current) {
    const s = copy(current);
    for (const key of ['roster', 'storyDeck', 'storyDiscard', 'storyHeld', 'endingDeck', 'endingDiscard', 'history', 'log']) s[key] = list(s[key]);
    for (const key of ['readiness', 'hands', 'endings', 'replies', 'seen']) s[key] = s[key] || {};
    for (const player of s.roster) s.hands[player.playerNum] = list(s.hands[player.playerNum]);
    if (s.interrupt?.rollback) {
      const rollback = s.interrupt.rollback;
      for (const key of ['storyDeck', 'storyDiscard', 'storyHeld']) rollback[key] = list(rollback[key]);
      rollback.hands = rollback.hands || {};
      for (const player of s.roster) rollback.hands[player.playerNum] = list(rollback.hands[player.playerNum]);
    }
    if (s.vote) {
      s.vote.eligible = list(s.vote.eligible);
      // RTDB can return numeric seat maps as sparse arrays, e.g.
      // [null, null, null, null, 'continue']. Null slots are absent ballots,
      // not submissions. Keep only actual, eligible, valid choice entries.
      s.vote.votes = Object.fromEntries(Object.entries(s.vote.votes || {}).filter(([seat, choice]) =>
        s.vote.eligible.includes(Number(seat)) && choices(s.vote.kind).includes(choice)));
    }
    return s;
  }
  const name = (s, actor) => s.roster.find(p => p.playerNum === actor)?.name || 'Host';
  const left = (s, actor) => s.roster[(s.roster.findIndex(p => p.playerNum === actor) + 1) % s.roster.length].playerNum;
  function log(s, cmd, type, text) {
    const item = { id: cmd.id + ':' + type, type, actor: Number(cmd.actor), at: Number(cmd.now) || 0, text };
    s.log = [...s.log, item].slice(-128); s.lastAction = item;
  }
  function randomize(s, ids, cmd, salt) {
    const seed = seedValue(cmd.seed == null ? s.rngState : cmd.seed) ^ seedValue(salt) ^ seedValue(s.rngState);
    s.rngState = seedValue(seed ^ 0x9e3779b9);
    return shuffle(ids, seed);
  }
  function draw(s, kind, count, cmd) {
    const pile = kind + 'Deck', discard = kind + 'Discard', result = [];
    for (let i = 0; i < count; i++) {
      if (!s[pile].length && s[discard].length) {
        s[pile] = randomize(s, s[discard], cmd, kind + ':' + i); s[discard] = [];
      }
      if (!s[pile].length) break; // Never invent cards when every physical card is held.
      result.push(s[pile].shift());
    }
    return result;
  }
  function drawStory(s, actor, count, cmd) {
    const ids = draw(s, 'story', count, cmd); s.hands[actor].push(...ids);
    log(s, cmd, 'draw', name(s, actor) + ' drew ' + ids.length + ' Story Card' + (ids.length === 1 ? '.' : 's.'));
    return ids;
  }
  function releaseHeld(s) { s.storyDiscard.push(...s.storyHeld); s.storyHeld = []; }
  function closeOpportunities(s, keepLatest = false) {
    s.categoryOpportunity = null; s.interrupt = null;
    // The latest normal play stays physically reserved while it could be
    // returned by a Challenge. Public history is a record, not a physical pile.
    const keep = keepLatest && s.latestPlay ? s.latestPlay.cardId : null;
    s.storyDiscard.push(...s.storyHeld.filter(id => id !== keep));
    s.storyHeld = keep && s.storyHeld.includes(keep) ? [keep] : [];
    if (!keepLatest) s.latestPlay = null;
  }
  function advance(s) { s.turnId++; }
  function addHistory(s, cmd, actor, cardId, kind, mode) {
    // Receipt ids are per actor, so history ids include actor and narrative turn
    // as well. Different seats may legitimately submit the same request id.
    const item = { eventId: actor + ':' + s.turnId + ':' + cmd.id, cardId, playerNum: actor, kind, mode: mode || 'normal', at: Number(cmd.now) || 0 };
    s.history.push(item); return item;
  }
  function beginVote(s, cmd, kind, subjectPlayer, excluded, extra = {}) {
    s.vote = { id: s.sessionId + ':' + cmd.actor + ':' + s.turnId + ':' + cmd.id + ':vote', kind, subjectPlayer, eligible: s.roster.map(p => p.playerNum).filter(n => !excluded.includes(n)), votes: {}, ...extra };
    s.phase = kind === 'interrupt' ? 'INTERRUPT_DISPUTE' : kind === 'challenge' ? 'CHALLENGE' : 'ENDING_REVIEW';
    advance(s);
  }
  const choices = kind => kind === 'interrupt' ? ['valid', 'invalid'] : kind === 'challenge' ? ['lose', 'continue'] : ['accept', 'reject'];
  // Count a majority against ALL eligible voters, including nonresponders.
  // Ties keep a normal interrupt valid, fail a Challenge, and accept an Ending.
  function resolveVote(s, cmd, socialChoice) {
    const vote = s.vote, all = vote.eligible.length;
    const count = choice => Object.values(vote.votes || {}).filter(v => v === choice).length;
    const wins = choice => socialChoice ? socialChoice === choice : count(choice) > all / 2;
    if (vote.kind === 'interrupt') {
      const action = s.interrupt;
      if (wins('invalid')) {
        const rollback = action.rollback;
        for (const key of ['storyDeck', 'storyDiscard', 'storyHeld', 'hands']) s[key] = copy(rollback[key]);
        s.rngState = rollback.rngState;
        s.latestPlay = rollback.latestPlay ? copy(rollback.latestPlay) : null;
        // A preceding accepted interrupt is already final. Only an actual
        // normal play may remain reserved for the restored teller's Challenge.
        const returnable = s.latestPlay ? s.latestPlay.cardId : null;
        s.storyDiscard.push(...s.storyHeld.filter(id => id !== returnable));
        s.storyHeld = s.storyHeld.filter(id => id === returnable);
        s.hands[action.interrupter] = s.hands[action.interrupter].filter(id => id !== action.cardId);
        s.storyDiscard.push(action.cardId);
        s.history = s.history.filter(event => event.eventId !== action.eventId);
        s.storyteller = action.oldStoryteller;
        log(s, cmd, 'undoDraw', name(s, s.storyteller) + "'s interrupt penalty draw was reversed.");
        drawStory(s, action.interrupter, 2, cmd);
        log(s, cmd, 'interruptInvalid', name(s, action.interrupter) + "'s interrupt was invalid; " + name(s, s.storyteller) + ' resumes.');
      } else {
        releaseHeld(s); s.latestPlay = null;
        log(s, cmd, 'interruptValid', name(s, action.interrupter) + "'s interrupt was accepted.");
      }
      s.interrupt = null; s.categoryOpportunity = null; s.phase = 'STORYTELLING';
    } else if (vote.kind === 'challenge') {
      if (wins('lose')) {
        const latest = s.latestPlay;
        if (vote.returnLatest && latest && latest.playerNum === vote.subjectPlayer && s.storyHeld.includes(latest.cardId)) {
          s.storyHeld = s.storyHeld.filter(id => id !== latest.cardId);
          s.hands[vote.subjectPlayer].push(latest.cardId);
          s.history = s.history.filter(event => event.eventId !== latest.eventId);
          log(s, cmd, 'returnCard', name(s, vote.subjectPlayer) + "'s most recent Story Card returned to their hand.");
        }
        closeOpportunities(s); drawStory(s, vote.subjectPlayer, 1, cmd);
        s.storyteller = left(s, vote.subjectPlayer);
        log(s, cmd, 'challengeSucceeded', 'The Challenge succeeded; ' + name(s, s.storyteller) + ' continues the story.');
      } else {
        log(s, cmd, 'challengeFailed', 'The Challenge failed; ' + name(s, s.storyteller) + ' continues the story.');
      }
      s.phase = 'STORYTELLING';
    } else {
      if (wins('reject')) {
        s.endingDiscard.push(s.endingPlayed.cardId); s.endingPlayed = null;
        s.endings[vote.subjectPlayer] = draw(s, 'ending', 1, cmd)[0] || null;
        drawStory(s, vote.subjectPlayer, 1, cmd);
        s.storyteller = left(s, vote.subjectPlayer); s.phase = 'STORYTELLING';
        log(s, cmd, 'endingRejected', 'The Ending was rejected; ' + name(s, s.storyteller) + ' continues the story.');
      } else {
        s.winner = vote.subjectPlayer; s.phase = 'FINISHED';
        log(s, cmd, 'win', name(s, s.winner) + ' completed the story and won.');
      }
    }
    s.vote = null; advance(s);
  }
  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor);
    if (!Number.isInteger(actor) || (actor !== 0 && !list(current.roster).some(p => p.playerNum === actor))) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const s = normalize(current), cmd = { ...input, actor }, host = actor === 0;
    let error = '';
    const reject = code => { error = code; };
    const story = s.phase === 'STORYTELLING', speaking = actor === s.storyteller;
    if (HOST_TYPES.includes(cmd.type) && !host) reject('not_available');
    else if (!TURN_FREE.includes(cmd.type) && cmd.turnId !== s.turnId) reject('stale_turn');
    else switch (cmd.type) {
      case 'ready':
        if (host || s.phase !== 'LOBBY' || typeof cmd.value !== 'boolean') { reject('not_available'); break; }
        s.readiness[actor] = cmd.value;
        break;
      case 'deal': {
        if (s.phase !== 'LOBBY') { reject('not_available'); break; }
        if (!s.roster.every(p => s.readiness[p.playerNum] === true)) { reject('not_ready'); break; }
        s.storyDeck = randomize(s, storyCards.map(card => card.id), cmd, 'story-deal');
        s.endingDeck = randomize(s, endingCards.map(card => card.id), cmd, 'ending-deal');
        const count = Math.max(5, 11 - s.roster.length);
        for (const player of s.roster) {
          s.hands[player.playerNum] = draw(s, 'story', count, cmd);
          s.endings[player.playerNum] = draw(s, 'ending', 1, cmd)[0] || null;
        }
        s.starterCard = draw(s, 'story', 1, cmd)[0]; s.storyDiscard.push(s.starterCard);
        s.phase = 'CHOOSING_FIRST'; advance(s);
        log(s, cmd, 'deal', 'Cards dealt. Choose the player who looks most like ' + storyById[s.starterCard].title + '.');
        break;
      }
      case 'chooseFirst':
      case 'randomFirst': {
        if (s.phase !== 'CHOOSING_FIRST') { reject('not_available'); break; }
        const chosen = cmd.type === 'randomFirst' ? randomize(s, s.roster.map(p => p.playerNum), cmd, 'first')[0] : Number(cmd.playerNum);
        if (!s.roster.some(p => p.playerNum === chosen)) { reject('invalid_player'); break; }
        s.storyteller = chosen; s.phase = 'STORYTELLING'; advance(s);
        log(s, cmd, 'first', name(s, chosen) + ' begins the story.');
        break;
      }
      case 'play': {
        if (!story || !speaking || host) { reject('not_available'); break; }
        if (!s.hands[actor].includes(cmd.cardId) || !storyById[cmd.cardId]) { reject('invalid_card'); break; }
        closeOpportunities(s); s.hands[actor] = s.hands[actor].filter(id => id !== cmd.cardId); s.storyHeld.push(cmd.cardId);
        const event = addHistory(s, cmd, actor, cmd.cardId, 'play');
        s.latestPlay = { eventId: event.eventId, cardId: cmd.cardId, playerNum: actor };
        s.categoryOpportunity = { id: event.eventId + ':category', eventId: event.eventId, cardId: cmd.cardId, category: storyById[cmd.cardId].category, storyteller: actor };
        advance(s); log(s, cmd, 'play', name(s, actor) + ' played ' + storyById[cmd.cardId].title + '.');
        break;
      }
      case 'interrupt': {
        if (!story || speaking || host) { reject('not_available'); break; }
        const mode = cmd.mode;
        if (mode !== 'normal' && mode !== 'category') { reject('invalid_mode'); break; }
        const card = storyById[cmd.cardId];
        if (!card || !s.hands[actor].includes(cmd.cardId)) { reject('invalid_card'); break; }
        if (mode === 'category') {
          if (!s.categoryOpportunity || cmd.opportunityId !== s.categoryOpportunity.id) { reject('stale_opportunity'); break; }
          if (!card.isInterrupt || card.category !== s.categoryOpportunity.category) { reject('wrong_category'); break; }
        }
        const oldStoryteller = s.storyteller;
        const rollback = mode === 'normal' ? copy({ storyDeck: s.storyDeck, storyDiscard: s.storyDiscard, storyHeld: s.storyHeld, hands: s.hands, rngState: s.rngState, latestPlay: s.latestPlay || null }) : null;
        closeOpportunities(s); s.hands[actor] = s.hands[actor].filter(id => id !== cmd.cardId);
        // A disputable interrupt remains reserved until the following narrative
        // action; its snapshot reverses the exact old-teller penalty draw.
        if (mode === 'normal') s.storyHeld.push(cmd.cardId); else s.storyDiscard.push(cmd.cardId);
        const event = addHistory(s, cmd, actor, cmd.cardId, 'interrupt', mode);
        drawStory(s, oldStoryteller, 1, cmd); s.storyteller = actor;
        s.interrupt = mode === 'normal' ? { id: event.eventId + ':interrupt', eventId: event.eventId, cardId: cmd.cardId, oldStoryteller, interrupter: actor, rollback } : null;
        advance(s); log(s, cmd, 'interrupt', name(s, actor) + ' interrupted with ' + card.title + '.');
        break;
      }
      case 'dispute': {
        if (!story || host || !s.interrupt || cmd.interruptId !== s.interrupt.id || actor === s.interrupt.interrupter) { reject('not_available'); break; }
        beginVote(s, cmd, 'interrupt', s.interrupt.interrupter, [s.interrupt.oldStoryteller, s.interrupt.interrupter]);
        log(s, cmd, 'dispute', name(s, actor) + ' disputed the interrupt.');
        break;
      }
      case 'continueStory':
        if (!story || !speaking || host) { reject('not_available'); break; }
        closeOpportunities(s, true); advance(s);
        log(s, cmd, 'continueStory', name(s, actor) + ' continues the story.');
        break;
      case 'pass':
        if (!story || !speaking || host) { reject('not_available'); break; }
        closeOpportunities(s); drawStory(s, actor, 1, cmd);
        s.passPlayer = actor; s.phase = 'PASS_DISCARD'; advance(s);
        log(s, cmd, 'pass', name(s, actor) + ' passed; choose one card to discard or keep all cards.');
        break;
      case 'discard':
      case 'keepAll':
        if (s.phase !== 'PASS_DISCARD' || actor !== s.passPlayer || host) { reject('not_available'); break; }
        if (cmd.type === 'discard') {
          if (!s.hands[actor].includes(cmd.cardId)) { reject('invalid_card'); break; }
          s.hands[actor] = s.hands[actor].filter(id => id !== cmd.cardId); s.storyDiscard.push(cmd.cardId);
          log(s, cmd, 'discard', name(s, actor) + ' discarded ' + storyById[cmd.cardId].title + '.');
        }
        s.passPlayer = null; s.storyteller = left(s, actor); s.phase = 'STORYTELLING'; advance(s);
        log(s, cmd, 'handover', name(s, s.storyteller) + ' continues the story.');
        break;
      case 'challenge': {
        if (!story || speaking || host) { reject('not_available'); break; }
        if (cmd.returnLatest != null && typeof cmd.returnLatest !== 'boolean') { reject('invalid_choice'); break; }
        if (cmd.returnLatest && (!s.latestPlay || s.latestPlay.playerNum !== s.storyteller || !s.storyHeld.includes(s.latestPlay.cardId))) { reject('no_returnable_card'); break; }
        closeOpportunities(s, true);
        beginVote(s, cmd, 'challenge', s.storyteller, [actor, s.storyteller], { challenger: actor, returnLatest: cmd.returnLatest === true });
        log(s, cmd, 'challenge', name(s, actor) + ' challenged the Storyteller.');
        break;
      }
      case 'ending': {
        if (!story || !speaking || host) { reject('not_available'); break; }
        if (s.hands[actor].length || !s.endings[actor]) { reject('ending_locked'); break; }
        closeOpportunities(s); s.endingPlayed = { cardId: s.endings[actor], playerNum: actor }; s.endings[actor] = null;
        beginVote(s, cmd, 'ending', actor, [actor]);
        log(s, cmd, 'ending', name(s, actor) + ' proposed an Ending.');
        break;
      }
      case 'vote': {
        const vote = s.vote;
        if (!vote || cmd.voteId !== vote.id) { reject('stale_vote'); break; }
        if (host || !vote.eligible.includes(actor)) { reject('not_eligible'); break; }
        if (!choices(vote.kind).includes(cmd.choice)) { reject('invalid_choice'); break; }
        if (Object.prototype.hasOwnProperty.call(vote.votes, actor)) { reject('already_voted'); break; }
        vote.votes[actor] = cmd.choice;
        // Resolve when everyone responds; an early partial majority would leak
        // opponents' choices and race other voters out of the ballot.
        if (vote.eligible.every(n => Object.prototype.hasOwnProperty.call(vote.votes, n))) resolveVote(s, cmd);
        break;
      }
      case 'finishVote':
      case 'resolveSocial': {
        const vote = s.vote;
        if (!vote || cmd.voteId !== vote.id) { reject('stale_vote'); break; }
        if (cmd.type === 'resolveSocial') {
          if (vote.eligible.length || !choices(vote.kind).includes(cmd.choice)) { reject('not_available'); break; }
          resolveVote(s, cmd, cmd.choice);
        } else {
          // Two-player disputes/challenges have no uninvolved voter. A host
          // must record an explicit spoken agreement; absence is not a verdict.
          if (!vote.eligible.length) { reject('social_agreement_required'); break; }
          resolveVote(s, cmd);
        }
        break;
      }
      case 'restart': {
        const fresh = create({ id: s.sessionId + ':restart:' + cmd.id, roster: s.roster, seed: cmd.seed, now: cmd.now });
        Object.assign(s, fresh); advance(s);
        log(s, cmd, 'restart', 'A new game is waiting for everyone to get ready.');
        break;
      }
      case 'cancel':
        if (['FINISHED', 'CANCELLED'].includes(s.phase)) { reject('not_available'); break; }
        s.phase = 'CANCELLED'; s.storyteller = null; s.vote = null; s.passPlayer = null;
        closeOpportunities(s); advance(s); log(s, cmd, 'cancel', 'The host cancelled this game.');
        break;
      default: reject('not_available');
    }
    s.revision = (Number(current.revision) || 0) + 1;
    s.seen[actor] = [...list(s.seen[actor]), cmd.id].slice(-64);
    s.replies[actor] = { id: cmd.id, error };
    return s;
  }
  function view(current, playerNum, now) {
    const s = normalize(current), actor = Number(playerNum), mine = s.roster.find(p => p.playerNum === actor), host = actor === 0;
    const player = !!mine, speaking = player && actor === s.storyteller, story = s.phase === 'STORYTELLING';
    const hand = player ? s.hands[actor].filter(id => storyById[id]).map(id => copy(storyById[id])) : [];
    const vote = s.vote, pending = s.interrupt;
    const mayReturn = !!(s.latestPlay && s.latestPlay.playerNum === s.storyteller && s.storyHeld.includes(s.latestPlay.cardId));
    const actions = {
      ready: player && s.phase === 'LOBBY', deal: host && s.phase === 'LOBBY' && s.roster.every(p => s.readiness[p.playerNum] === true),
      chooseFirst: host && s.phase === 'CHOOSING_FIRST', randomFirst: host && s.phase === 'CHOOSING_FIRST',
      play: story && speaking && hand.length > 0, interrupt: story && player && !speaking && hand.length > 0,
      categoryInterrupt: story && player && !speaking && !!s.categoryOpportunity && hand.some(c => c.isInterrupt && c.category === s.categoryOpportunity.category),
      dispute: story && player && !!pending && actor !== pending.interrupter,
      continueStory: story && speaking && !!(pending || s.categoryOpportunity), pass: story && speaking,
      challenge: story && player && !speaking, ending: story && speaking && !hand.length && !!s.endings[actor],
      discard: s.phase === 'PASS_DISCARD' && actor === s.passPlayer && hand.length > 0,
      keepAll: s.phase === 'PASS_DISCARD' && actor === s.passPlayer,
      vote: player && !!vote && vote.eligible.includes(actor) && !Object.prototype.hasOwnProperty.call(vote.votes, actor),
      finishVote: host && !!vote && vote.eligible.length > 0, resolveSocial: host && !!vote && !vote.eligible.length,
      restart: host, cancel: host && !['FINISHED', 'CANCELLED'].includes(s.phase),
    };
    const once = {
      version: 1, playerNum: player ? actor : 0, sessionId: s.sessionId, turnId: s.turnId, revision: s.revision,
      phase: s.phase, storyteller: s.storyteller || null, winner: s.winner || null,
      roster: s.roster.map(p => ({ ...p, handCount: s.hands[p.playerNum].length, ready: s.readiness[p.playerNum] === true })),
      starterCard: s.starterCard ? copy(storyById[s.starterCard]) : null,
      history: s.history.map(event => ({ ...event, card: copy(storyById[event.cardId]) })),
      categoryOpportunity: s.categoryOpportunity ? copy(s.categoryOpportunity) : null,
      interrupt: pending ? { id: pending.id, eventId: pending.eventId, cardId: pending.cardId, oldStoryteller: pending.oldStoryteller, interrupter: pending.interrupter } : null,
      vote: vote ? { id: vote.id, kind: vote.kind, subjectPlayer: vote.subjectPlayer, eligible: vote.eligible.slice(),
        totalVoters: vote.eligible.length, received: Object.keys(vote.votes).length,
        ownChoice: player && vote.eligible.includes(actor) ? vote.votes[actor] || null : null,
        returnLatest: vote.returnLatest === true, requiresSocial: !vote.eligible.length } : null,
      endingCard: ['ENDING_REVIEW', 'FINISHED'].includes(s.phase) && s.endingPlayed ? copy(endingById[s.endingPlayed.cardId]) : null,
      passPlayer: s.passPlayer || null, canReturnLatest: mayReturn,
      returnableCard: mayReturn ? copy(storyById[s.latestPlay.cardId]) : null,
      deckCounts: { story: s.storyDeck.length, storyDiscard: s.storyDiscard.length, ending: s.endingDeck.length, endingDiscard: s.endingDiscard.length },
      readiness: player && s.readiness[actor] === true, actions, log: copy(s.log), lastAction: s.lastAction ? copy(s.lastAction) : null,
      reply: s.replies[actor] ? copy(s.replies[actor]) : null,
    };
    // Only a real roster member gets private keys, even when the requested seat
    // is unknown. No deck order, other hands/endings, ballots, tokens, or rollback.
    if (player) {
      once.hand = hand; once.ending = s.endings[actor] ? copy(endingById[s.endings[actor]]) : null;
      once.endingState = s.phase === 'FINISHED' ? 'finished' : s.endingPlayed?.playerNum === actor ? 'review' : !hand.length && s.endings[actor] ? 'ready' : 'locked';
    }
    return { game: 'onceupon', playerNum: player ? actor : 0, name: mine?.name || null, once };
  }
  return { create, apply, view, list, shuffle };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ONCE_ENGINE;
