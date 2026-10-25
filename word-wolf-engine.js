/* WORD WOLF — restored one-different-card game on the Hub's card-run table.
 * One canonical deal, private own-card views, spoken clues and secret ballots.
 * No recognition, per-player timer, automatic clues or answer judging. */
var WORD_WOLF_ENGINE = (() => {
  'use strict';
  const CONTENT = typeof WORD_WOLF_CONTENT !== 'undefined' ? WORD_WOLF_CONTENT : require('./word-wolf-content.js');
  const CONFIG = Object.freeze({ minPlayers: 3, maxPlayers: 9, categories: CONTENT.CATEGORIES, defaultCategory: 'objects', historyMax: 160 });
  const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const roster = s => list(s.roster);
  const active = s => roster(s).filter(p => p.active !== false).map(p => p.playerNum);
  const seat = (s, n) => roster(s).find(p => p.playerNum === n);
  const clean = text => String(text || '').replace(/[<>\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  function rng(seed) {
    let a = Number(seed) >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(items, random) { const out = items.slice(); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  const defaultSettings = () => ({ category: CONFIG.defaultCategory });
  function parseSettings(input = {}, current = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('invalid_options');
    const category = input.category ?? current?.category ?? CONFIG.defaultCategory;
    if (!CONFIG.categories.includes(category)) throw Error('invalid_options');
    return { category };
  }
  function touch(s, now, phaseChange = false) { s.turnId++; if (phaseChange) s.stage++; s.lastChangeAt = now; }
  function enter(s, phase, now) { s.phase = phase; s.deadline = null; s.pausedFrom = null; s.remainingMs = null; touch(s, now, true); }
  function deal(s, now, random) {
    const players = active(s);
    if (players.length < CONFIG.minPlayers) throw Error('not_enough_players');
    const pool = CONTENT.pool(s.settings.category), used = new Set(list(s.usedPairs));
    let candidates = pool.filter(p => !used.has(p.id));
    if (!candidates.length) { const ids = new Set(pool.map(p => p.id)); s.usedPairs = list(s.usedPairs).filter(id => !ids.has(id)); candidates = pool; }
    const pair = candidates[Math.floor(random() * candidates.length)];
    const odd = players[Math.floor(random() * players.length)], majoritySide = random() < .5 ? 'a' : 'b';
    s.usedPairs = [...list(s.usedPairs), pair.id].slice(-CONFIG.historyMax);
    s.roundNo++; s.roundSerial++;
    s.round = { id: `${s.sessionId}:${s.roundSerial}`, pairId: pair.id, seats: players, odd, majoritySide, votes: {}, picked: null, pickLeft: [], pickedCycle: [] };
    s.result = null; s.stopped = false;
    enter(s, 'describe', now);
  }
  function result(s, now, cancelled = false) {
    const r = s.round, pair = CONTENT.get(r.pairId), votes = r.votes || {};
    const counts = Object.fromEntries(r.seats.map(n => [n, 0]));
    for (const [voter, target] of Object.entries(votes)) if (r.seats.includes(Number(voter)) && r.seats.includes(target) && Number(voter) !== target) counts[target]++;
    const max = Math.max(0, ...Object.values(counts)), top = max ? r.seats.filter(n => counts[n] === max) : [];
    const winner = cancelled ? 'cancelled' : top.length !== 1 ? 'tie' : top[0] === r.odd ? 'majority' : 'odd';
    s.result = { pairId: pair.id, majority: copy(pair[r.majoritySide]), different: copy(pair[r.majoritySide === 'a' ? 'b' : 'a']),
      odd: r.odd, votes: copy(votes), counts, top, winner, cancelled,
      cards: r.seats.map(playerNum => ({ playerNum, odd: playerNum === r.odd, item: copy(pair[playerNum === r.odd ? (r.majoritySide === 'a' ? 'b' : 'a') : r.majoritySide]) })) };
    s.history = [...list(s.history), { round: s.roundNo, pairId: pair.id, winner }].slice(-30);
    enter(s, 'result', now);
  }
  function create({ id, roster: seats, now, seed, settings, previous } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(seats) || seats.length < CONFIG.minPlayers || seats.length > CONFIG.maxPlayers ||
      seats.some(p => !Number.isInteger(p?.playerNum) || p.playerNum < 1 || p.playerNum > 9) || new Set(seats.map(p => p.playerNum)).size !== seats.length) throw Error('invalid_roster');
    const s = { version: 1, sessionId: id, stage: 0, turnId: 0, lastChangeAt: now, phase: 'describe', deadline: null, pausedFrom: null, remainingMs: null,
      roster: seats.map(p => ({ playerNum: p.playerNum, name: clean(p.name), active: p.active !== false })), settings: parseSettings(settings || {}, previous?.settings),
      roundNo: 0, roundSerial: Number(previous?.roundSerial) || 0, usedPairs: list(previous?.usedPairs).filter(id => CONTENT.get(id)), history: [], round: null,
      result: null, stopped: false, seen: {}, replies: {} };
    deal(s, now, rng(seed)); return s;
  }
  function apply(current, input = {}) {
    if (!current || current.version !== 1 || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100 || !Number.isFinite(input.now)) return current;
    const actor = Number(input.actor), host = actor === 0;
    if (!host && !seat(current, actor)) return current;
    if (input.type === 'tick' || list(current.seen?.[actor]).includes(input.id)) return current;
    const s = copy(current), now = input.now, random = rng(input.seed);
    s.roster = roster(s); s.seen ||= {}; s.replies ||= {};
    const mayAct = host || seat(s, actor)?.active !== false;
    const fail = error => { s.seen[actor] = [...list(s.seen[actor]), input.id].slice(-32); s.replies[actor] = { id: input.id, error }; return s; };
    if (!mayAct && !(input.type === 'exclude' && Number(input.playerNum) === actor && input.active === true)) return fail('not_available');
    if (input.stage !== s.stage) return fail('stale_turn');
    switch (input.type) {
      case 'pick': {
        if (s.phase !== 'describe') return fail('not_available');
        const r = s.round;
        if (!list(r.pickLeft).length) {
          r.pickLeft = shuffle(r.seats, random); r.pickedCycle = [];
          if (r.pickLeft.length > 1 && r.pickLeft[0] === r.picked) r.pickLeft.push(r.pickLeft.shift());
        }
        r.picked = r.pickLeft.shift(); r.pickedCycle.push(r.picked); touch(s, now, true); break;
      }
      case 'vote':
        if (s.phase !== 'describe') return fail('not_available');
        s.round.votes = {}; enter(s, 'vote', now); break;
      case 'ballot': {
        const target = Number(input.target), r = s.round;
        if (host || s.phase !== 'vote' || !r.seats.includes(actor) || !r.seats.includes(target) || target === actor || seat(s, target)?.active === false) return fail('not_available');
        r.votes[actor] = target; touch(s, now);
        if (r.seats.every(n => r.votes[n] != null)) result(s, now);
        break;
      }
      case 'close':
        if (s.phase === 'describe') { s.round.votes = {}; enter(s, 'vote', now); }
        else if (s.phase === 'vote' && Object.keys(s.round.votes || {}).length) result(s, now);
        else return fail('not_available');
        break;
      case 'next':
        if (s.phase !== 'result') return fail('not_available');
        try { deal(s, now, random); } catch (e) { return fail(e.message); } break;
      case 'pause':
        if (!['describe', 'vote'].includes(s.phase)) return fail('not_available');
        s.pausedFrom = s.phase; s.phase = 'paused'; touch(s, now, true); break;
      case 'resume':
        if (s.phase !== 'paused') return fail('not_available');
        s.phase = s.pausedFrom; s.pausedFrom = null; touch(s, now, true); break;
      case 'settings':
        try { s.settings = parseSettings(input.settings, s.settings); } catch (e) { return fail(e.message); }
        touch(s, now); break;
      case 'rename':
        if (!host || !Array.isArray(input.names)) return fail('not_available');
        s.roster.forEach(p => {
          const entry = input.names.find(value => value && typeof value === 'object' && Number(value.playerNum) === p.playerNum);
          const value = entry ? entry.name : input.names[p.playerNum - 1];
          if (typeof value === 'string') p.name = clean(value);
        }); touch(s, now); break;
      case 'exclude': {
        const p = seat(s, Number(input.playerNum));
        if (!p || typeof input.active !== 'boolean') return fail('not_available');
        const changed = p.active !== input.active; p.active = input.active;
        if (changed && s.round?.seats.includes(p.playerNum) && ['describe', 'vote', 'paused'].includes(s.phase)) result(s, now, true);
        else touch(s, now); break;
      }
      case 'void':
        if (!['describe', 'vote', 'paused'].includes(s.phase)) return fail('not_available');
        result(s, now, true); break;
      case 'restart':
        if (active(s).length < CONFIG.minPlayers) return fail('not_enough_players');
        try { s.settings = parseSettings(input.settings || {}, s.settings); s.roundNo = 0; s.history = []; deal(s, now, random); } catch (e) { return fail(e.message); } break;
      case 'stop':
        if (s.phase === 'finished') return fail('not_available');
        s.stopped = true; s.round = null; s.result = null; enter(s, 'finished', now); break;
      default: return fail('not_available');
    }
    return fail(null);
  }
  function view(s, actor = 0) {
    const n = Number(actor), mine = seat(s, n), canControl = n === 0 || mine?.active === true, r = s.round;
    const inRound = !!r?.seats.includes(n) && mine?.active === true;
    let item = null;
    if (inRound && s.phase !== 'finished') {
      const pair = CONTENT.get(r.pairId), side = n === r.odd ? (r.majoritySide === 'a' ? 'b' : 'a') : r.majoritySide;
      item = copy(pair[side]);
    }
    const shown = { version: 1, sessionId: s.sessionId, stage: s.stage, turnId: s.turnId, phase: s.phase, deadline: null, pausedFrom: s.pausedFrom,
      settings: copy(s.settings), roundNo: s.roundNo, stopped: s.stopped,
      roster: roster(s).map(p => ({ ...p, inRound: !!r?.seats.includes(p.playerNum) })),
      picked: r?.picked ?? null, pickedCycle: list(r?.pickedCycle), votesCast: Object.keys(r?.votes || {}).length, votersTotal: r?.seats.length || 0,
      result: s.phase === 'result' ? copy(s.result) : null, standings: [], history: list(s.history).map(h => ({ round: h.round, winner: h.winner })),
      me: { active: !!mine?.active, inRound, item, canControl, canPick: canControl && s.phase === 'describe', canOpenVote: canControl && s.phase === 'describe',
        canVote: inRound && s.phase === 'vote', vote: inRound ? r.votes[n] ?? null : null, canNext: canControl && s.phase === 'result' },
      reply: s.replies?.[n] || null };
    return { game: 'wordwolf', playerNum: n, name: mine?.name || null, ww: shown };
  }
  return { CONFIG, TIMED: Object.freeze([]), create, apply, view, rng, defaultSettings, parseSettings };
})();
if (typeof module === 'object' && module.exports) module.exports = WORD_WOLF_ENGINE;
