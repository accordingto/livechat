/* Bomb Relay — pure authoritative rules. No DOM, Firebase, audio or timers.
 *
 * Mechanics follow the classic "pass the bomb" picture-card party game:
 *   1. A scene card is revealed. The bomb holder lights the fuse.
 *   2. The holder says ONE thing that belongs in the scene, then passes the
 *      bomb to the next player. Answers may not repeat.
 *   3. Anyone may challenge the last answer ("doesn't fit" / "already said"):
 *      the bomb goes straight back to that player, who must say another.
 *   4. The fuse is secret and random. Whoever holds the bomb when it explodes
 *      takes the scene card. They start the next card.
 *   5. After the agreed number of cards, the fewest bomb cards wins.
 *
 * The explosion time (explodeAt / remainingMs) exists only in the host's
 * canonical state. view() never projects it, so no player card can learn it.
 * Every command uses the host-captured time and seed, so a replayed
 * transaction always produces the same result.
 */
var BOMB_RELAY_ENGINE = (() => {
  'use strict';
  const deck = typeof BOMB_RELAY_DECK !== 'undefined' ? BOMB_RELAY_DECK : require('./bomb-relay-deck.js');
  const CONFIG = Object.freeze({
    minPlayers: 2, maxPlayers: 9,
    // Seconds, like the electronic bomb: nobody knows when it goes off.
    fuses: Object.freeze({ quick: [8, 25], classic: [10, 60], long: [20, 80] }),
    cardOptions: Object.freeze([5, 10, 15, 20]), defaultCards: 10,
    boomHoldMs: 4500,
    // A resumed bomb never explodes in the same instant it starts ticking.
    resumeFloorMs: 2500,
  });
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const roster = state => list(state.roster);
  const active = state => roster(state).filter(player => player.active !== false);
  const isActive = (state, number) => active(state).some(player => player.playerNum === number);
  const isPlayer = (state, number) => roster(state).some(player => player.playerNum === number);
  const nameOf = (state, number) => roster(state).find(player => player.playerNum === number)?.name || '';

  function rng(seed) {
    let a = (Number(seed) >>> 0) || 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  // Seat order is the pass direction: the next active seat after `from`.
  function nextActive(state, from) {
    const seats = roster(state).map(player => player.playerNum).sort((a, b) => a - b);
    if (!seats.length) return null;
    let index = seats.indexOf(from);
    for (let step = 1; step <= seats.length; step++) {
      const candidate = seats[(index + step + seats.length) % seats.length];
      if (isActive(state, candidate)) return candidate;
    }
    return null;
  }
  const validFuse = fuse => Object.hasOwn(CONFIG.fuses, fuse);
  const validCards = cards => CONFIG.cardOptions.includes(cards);
  const validCategory = category => deck.categories.includes(category);
  function drawOrder(category, cards, random) {
    const pool = deck.pool(category).map(card => card.id);
    return shuffle(pool, random).slice(0, Math.min(cards, pool.length));
  }
  function fuseMs(state, random) {
    const [min, max] = CONFIG.fuses[state.fuse] || CONFIG.fuses.classic;
    return Math.round((min + random() * (max - min)) * 1000);
  }
  function bump(state, now) { state.turnId++; state.lastChangeAt = now; }

  function dealGame(state, now, random) {
    state.order = drawOrder(state.category, state.cards, random);
    state.cardIndex = 0;
    state.penalties = {};
    state.history = [];
    state.lastBoom = null;
    state.boom = null;
    const players = active(state);
    const starter = players[Math.floor(random() * players.length)]?.playerNum ?? null;
    readyCard(state, starter, now);
  }
  function readyCard(state, holder, now) {
    state.phase = 'ready'; state.holder = holder; state.starter = holder;
    state.passes = 0; state.lastPass = null; state.bounce = null;
    state.explodeAt = null; state.remainingMs = null; state.litAt = null;
    state.phaseUntil = null; state.pausedFrom = null;
    bump(state, now);
  }
  function explode(state, now) {
    const loser = state.holder, cardId = state.order[state.cardIndex];
    state.penalties = state.penalties || {};
    state.penalties[loser] = [...list(state.penalties[loser]), cardId];
    state.history = [...list(state.history), { cardId, loser, passes: state.passes }];
    state.boom = { id: `${state.sessionId}:${state.cardIndex}`, loser, cardId, passes: state.passes,
      last: state.cardIndex + 1 >= state.order.length };
    state.phase = 'boom'; state.phaseUntil = now + CONFIG.boomHoldMs;
    state.explodeAt = null; state.remainingMs = null; state.lastPass = null; state.bounce = null;
    bump(state, now);
  }
  function afterBoom(state, now) {
    const boom = state.boom;
    state.lastBoom = boom ? { loser: boom.loser, cardId: boom.cardId, passes: boom.passes } : null;
    state.boom = null;
    state.cardIndex++;
    if (state.cardIndex >= state.order.length) { finish(state, now, false); return; }
    // The player who exploded starts the next card, like picking up the bomb.
    const starter = boom && isActive(state, boom.loser) ? boom.loser : nextActive(state, boom?.loser ?? state.holder);
    readyCard(state, starter, now);
  }
  function finish(state, now, stopped) {
    state.phase = 'finished'; state.stopped = !!stopped;
    state.holder = null; state.explodeAt = null; state.remainingMs = null; state.lastPass = null; state.bounce = null;
    state.phaseUntil = null; state.pausedFrom = null; state.boom = null;
    bump(state, now);
  }
  // The secret fuse is checked before every move, so a pass that reaches the
  // host after the explosion moment cannot rescue its sender.
  const due = (state, now) => state.phase === 'ticking' && Number.isFinite(state.explodeAt) && now >= state.explodeAt;

  function create({ id, roster: seats, fuse = 'classic', cards = CONFIG.defaultCards, category = 'mixed', now, seed } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(seats) || seats.length < CONFIG.minPlayers || seats.length > CONFIG.maxPlayers) throw new Error('invalid_roster');
    if (seats.some(player => !player || !Number.isInteger(player.playerNum) || player.playerNum < 1 || player.playerNum > CONFIG.maxPlayers)
      || new Set(seats.map(player => player.playerNum)).size !== seats.length) throw new Error('invalid_roster');
    if (!validFuse(fuse) || !validCards(cards) || !validCategory(category)) throw new Error('invalid_options');
    const state = {
      version: 1, sessionId: String(id), turnId: 0, lastChangeAt: now,
      fuse, cards, category,
      roster: seats.map(player => ({ playerNum: player.playerNum, name: String(player.name || '').trim().slice(0, 80), active: player.active !== false })),
      order: [], cardIndex: 0, phase: 'ready', holder: null, starter: null,
      passes: 0, lastPass: null, bounce: null, boom: null, lastBoom: null,
      explodeAt: null, remainingMs: null, litAt: null, phaseUntil: null, pausedFrom: null, stopped: false,
      penalties: {}, history: [], seen: {}, replies: {},
    };
    if (active(state).length < CONFIG.minPlayers) throw new Error('not_enough_players');
    dealGame(state, now, rng(seed));
    return state;
  }

  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor);
    const host = actor === 0;
    if (!host && !isPlayer(current, actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const now = input.now;
    if (!Number.isFinite(now)) return current;
    // Idle host ticks perform no write at all.
    if (input.type === 'tick') {
      if (!host) return current;
      const boomDone = current.phase === 'boom' && Number.isFinite(current.phaseUntil) && now >= current.phaseUntil;
      if (!due(current, now) && !boomDone) return current;
    }
    const state = copy(current);
    state.roster = roster(state); state.order = list(state.order); state.history = list(state.history);
    state.penalties = state.penalties || {}; state.seen = state.seen || {}; state.replies = state.replies || {};
    for (const key of Object.keys(state.penalties)) state.penalties[key] = list(state.penalties[key]);
    const random = rng(input.seed);
    const fresh = input.turnId === state.turnId;
    const mayAct = host || isActive(state, actor);
    let error = '';
    switch (input.type) {
      case 'tick':
        if (due(state, now)) explode(state, now);
        else afterBoom(state, now);
        break;
      case 'light':
        if (state.phase !== 'ready' || !fresh || !mayAct || (!host && actor !== state.holder) || !isActive(state, state.holder)) { error = 'not_available'; break; }
        state.phase = 'ticking'; state.litAt = now;
        state.explodeAt = now + fuseMs(state, random);
        bump(state, now);
        break;
      case 'pass': {
        if (due(state, now)) { explode(state, now); error = 'too_late'; break; }
        if (state.phase !== 'ticking' || !fresh || !mayAct || (!host && actor !== state.holder)) { error = 'not_available'; break; }
        const to = nextActive(state, state.holder);
        if (to == null || to === state.holder) { error = 'not_enough_players'; break; }
        state.lastPass = { id: input.id, from: state.holder, to, bounced: false };
        state.holder = to; state.passes++; state.bounce = null;
        bump(state, now);
        break;
      }
      case 'bounce': {
        if (due(state, now)) { explode(state, now); error = 'too_late'; break; }
        const last = state.lastPass;
        const challengeable = state.phase === 'ticking' && last && !last.bounced && state.holder === last.to && isActive(state, last.from);
        if (!challengeable || !fresh || !mayAct || (!host && actor === last.from)) { error = 'not_available'; break; }
        // The answer did not count: the bomb (and the turn) go straight back.
        state.holder = last.from; last.bounced = true; state.passes = Math.max(0, state.passes - 1);
        state.bounce = { id: input.id, by: actor, to: last.from, from: last.to };
        bump(state, now);
        break;
      }
      case 'next':
        if (state.phase !== 'boom' || !fresh || !mayAct) { error = 'not_available'; break; }
        afterBoom(state, now);
        break;
      case 'pause':
        if (!host || !['ready', 'ticking'].includes(state.phase)) { error = 'not_available'; break; }
        if (due(state, now)) { explode(state, now); break; }
        state.pausedFrom = state.phase;
        if (state.phase === 'ticking') { state.remainingMs = Math.max(CONFIG.resumeFloorMs, state.explodeAt - now); state.explodeAt = null; }
        state.phase = 'paused';
        bump(state, now);
        break;
      case 'resume':
        if (!host || state.phase !== 'paused') { error = 'not_available'; break; }
        if (active(state).length < CONFIG.minPlayers) { error = 'not_enough_players'; break; }
        if (!isActive(state, state.holder)) state.holder = nextActive(state, state.holder);
        if (state.pausedFrom === 'ticking') { state.phase = 'ticking'; state.explodeAt = now + Math.max(CONFIG.resumeFloorMs, state.remainingMs || 0); }
        else { state.phase = 'ready'; state.starter = state.holder; }
        state.remainingMs = null; state.pausedFrom = null;
        bump(state, now);
        break;
      case 'exclude': {
        const number = Number(input.playerNum), want = input.active === true;
        const seat = state.roster.find(player => player.playerNum === number);
        if (!host || !seat || (seat.active !== false) === want) { error = 'not_available'; break; }
        if (!want && active(state).length <= CONFIG.minPlayers) { error = 'not_enough_players'; break; }
        seat.active = want;
        if (!want) {
          // The bomb moves on from someone who left; their last answer stays.
          if (['ready', 'ticking', 'paused'].includes(state.phase) && state.holder === number) {
            state.holder = nextActive(state, number);
            if (state.phase === 'ready') state.starter = state.holder;
          }
          if (state.lastPass && (state.lastPass.from === number || state.lastPass.to === number)) state.lastPass = null;
        }
        bump(state, now);
        break;
      }
      case 'restart':
        if (!host) { error = 'not_available'; break; }
        if (active(state).length < CONFIG.minPlayers) { error = 'not_enough_players'; break; }
        if (input.fuse !== undefined && !validFuse(input.fuse)) { error = 'invalid_options'; break; }
        if (input.cards !== undefined && !validCards(input.cards)) { error = 'invalid_options'; break; }
        if (input.category !== undefined && !validCategory(input.category)) { error = 'invalid_options'; break; }
        if (input.fuse !== undefined) state.fuse = input.fuse;
        if (input.cards !== undefined) state.cards = input.cards;
        if (input.category !== undefined) state.category = input.category;
        state.stopped = false;
        dealGame(state, now, random);
        break;
      case 'stop':
        if (!host || state.phase === 'finished') { error = 'not_available'; break; }
        finish(state, now, true);
        break;
      default: error = 'not_available';
    }
    state.seen[actor] = [...list(state.seen[actor]), input.id].slice(-32);
    state.replies[actor] = { id: input.id, error };
    return state;
  }

  function standings(state) {
    const rows = roster(state).map(player => ({
      playerNum: player.playerNum, name: player.name, active: player.active !== false,
      cards: list(state.penalties?.[player.playerNum]),
    }));
    const fewest = rows.length ? Math.min(...rows.map(row => row.cards.length)) : 0;
    return rows.map(row => Object.assign(row, { count: row.cards.length, leading: row.cards.length === fewest }))
      .sort((a, b) => a.count - b.count || a.playerNum - b.playerNum);
  }

  // Public projection. No fuse time, remaining time or RNG seed ever leaves.
  function view(state, actor) {
    const playerNum = Number(actor);
    const seats = roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active !== false,
      count: list(state.penalties?.[player.playerNum]).length }));
    const mine = seats.find(player => player.playerNum === playerNum);
    const me = playerNum === 0 || mine?.active === true;
    const ticking = state.phase === 'ticking';
    const last = state.lastPass;
    const challengeable = ticking && last && !last.bounced && state.holder === last.to && isActive(state, last.from);
    const bomb = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, phase: state.phase,
      fuse: state.fuse, cards: state.cards, category: state.category,
      cardId: state.phase === 'finished' ? null : state.order[state.cardIndex] ?? null,
      cardNo: Math.min(state.cardIndex + 1, state.order.length), cardsTotal: state.order.length,
      holder: ['ready', 'ticking', 'paused'].includes(state.phase) ? state.holder : null,
      next: ticking ? nextActive(state, state.holder) : null,
      passes: state.passes, pausedFrom: state.phase === 'paused' ? state.pausedFrom : null,
      lastPass: last ? { from: last.from, to: last.to, bounced: !!last.bounced } : null,
      bounce: state.bounce ? copy(state.bounce) : null,
      boom: state.boom ? copy(state.boom) : null,
      lastBoom: state.lastBoom ? copy(state.lastBoom) : null,
      phaseUntil: state.phase === 'boom' ? state.phaseUntil : null,
      stopped: state.phase === 'finished' && state.stopped === true,
      roster: seats, standings: standings(state),
      history: list(state.history).map(entry => ({ cardId: entry.cardId, loser: entry.loser, passes: entry.passes })),
      canLight: state.phase === 'ready' && me && (playerNum === 0 || playerNum === state.holder) && isActive(state, state.holder),
      canPass: ticking && me && (playerNum === 0 || playerNum === state.holder),
      canBounce: !!challengeable && me && playerNum !== last.from,
      canNext: state.phase === 'boom' && me,
      reply: (state.replies || {})[playerNum] || null,
    };
    return { game: 'bombrelay', playerNum, name: mine?.name || null, bomb };
  }

  return { CONFIG, create, apply, view, standings, nextActive, list, rng, nameOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_ENGINE;
