/* ROOM SURVEY — pure authoritative rules. No DOM, Firebase or timers.
 *
 * The room is the survey. Each round one player is the Keeper (everyone takes
 * turns). The Keeper picks a prompt — "Something you'd hate your partner to see
 * in your search history" — and everyone, the Keeper included, secretly writes
 * short answers. The Keeper merges answers that mean the same thing, and the
 * board ranks them by how many people wrote each one, so a bigger stack ranks
 * higher. Then the others buzz in from their own cards, one at a time, and say
 * a guess out loud; the Keeper taps the matching answer. A hit scores one point
 * for every person who wrote it (higher on the board = more points). A wrong
 * buzzer waits until everyone else has missed once too. The rules know who
 * wrote what, so guessing an answer you wrote yourself never scores: the answer
 * is burned and nobody scores it. Nobody may write the same answer twice.
 *
 * Inspired by street-survey ranking games on variety TV; prompts and wording
 * are original.
 *
 * Same table model as WHO KNOWS?: canonical state in one table node, any
 * active player may run the table from their card, and every command carries
 * its own captured time and seed. The shared screen (actor 0) never receives
 * a hidden answer's text; only the Keeper's card does.
 */
var ROOM_SURVEY_ENGINE = (() => {
  'use strict';
  const CONTENT = typeof ROOM_SURVEY_CONTENT !== 'undefined' ? ROOM_SURVEY_CONTENT : require('./room-survey-content.js');
  const CONFIG = Object.freeze({
    minPlayers: 3, maxPlayers: 9,
    answerCounts: Object.freeze([1, 2, 3]), defaultAnswers: 2,
    writeSeconds: Object.freeze([60, 90, 120, 180]), defaultWriteSeconds: 90,
    guessMinutes: Object.freeze([3, 4, 5, 6, 8]), defaultGuessMinutes: 4,
    // How long a buzzer has to say their answer (0: no limit).
    turnSeconds: Object.freeze([0, 10, 15, 20, 30]), defaultTurnSeconds: 15,
    categories: Object.freeze(['mixed', ...CONTENT.CATEGORIES]),
    sortMs: 120000,
    answerMax: 40, questionMax: 100, questionMin: 2,
    optionCount: 3, maxRerolls: 5, minGroups: 2,
    extendWriteMs: 30000, extendSortMs: 30000, extendGuessMs: 60000, resumeFloorMs: 3000,
    logMax: 160, historyMax: 30, seenMax: 16, questionMemory: 60,
  });
  const TIMED = Object.freeze(['write', 'sort', 'guess']);
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
  const roster = state => list(state.roster);
  const seat = (state, n) => roster(state).find(player => player.playerNum === n) || null;
  const isActive = (state, n) => seat(state, n)?.active === true;
  const activeNums = state => roster(state).filter(player => player.active).map(player => player.playerNum).sort((a, b) => a - b);

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
  // Plain text only: everything is escaped on screen anyway, but an answer
  // slip has no reason to carry markup or control characters.
  function cleanText(value, max) {
    return Array.from(String(value ?? '').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
  }
  // "Keys!", "keys" and "ＫＥＹＳ" are the same answer; the Keeper merges the rest.
  const normKey = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const CJK = /[㐀-鿿豈-﫿]/;
  function lengthHint(text) {
    const clean = String(text || '');
    if (CJK.test(clean)) return { n: clean.replace(/[\s\p{P}\p{S}]/gu, '').length, unit: 'chars' };
    return { n: clean.trim().split(/\s+/).filter(Boolean).length, unit: 'words' };
  }
  function firstChar(text) {
    const match = String(text || '').match(/[\p{L}\p{N}]/u);
    return match ? match[0].toUpperCase() : '';
  }

  // ── settings ───────────────────────────────────────────────────────────
  function defaultSettings() {
    return { answers: CONFIG.defaultAnswers, writeSeconds: CONFIG.defaultWriteSeconds, guessMinutes: CONFIG.defaultGuessMinutes,
      turnSeconds: CONFIG.defaultTurnSeconds, category: 'mixed', showAuthors: false };
  }
  // Omitted fields keep the current choice. Invalid values throw.
  function parseSettings(input = {}, current = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_options');
    const base = Object.assign(defaultSettings(), current || {});
    const pick = (key, allowed) => {
      const value = input[key] === undefined ? base[key] : (typeof allowed[0] === 'number' ? Number(input[key]) : input[key]);
      if (!allowed.includes(value)) throw new Error('invalid_options');
      return value;
    };
    const out = {
      answers: pick('answers', CONFIG.answerCounts), writeSeconds: pick('writeSeconds', CONFIG.writeSeconds),
      guessMinutes: pick('guessMinutes', CONFIG.guessMinutes), turnSeconds: pick('turnSeconds', CONFIG.turnSeconds),
      category: pick('category', CONFIG.categories), showAuthors: base.showAuthors === true,
    };
    if (input.showAuthors !== undefined) {
      if (typeof input.showAuthors !== 'boolean') throw new Error('invalid_options');
      out.showAuthors = input.showAuthors;
    }
    return out;
  }

  // ── stage, keeper rotation, prompts ────────────────────────────────────
  function bump(state, now) { state.turnId++; state.lastChangeAt = now; }
  function enter(state, phase, now, ms = null) {
    state.phase = phase; state.stage++;
    state.deadline = Number.isFinite(ms) ? now + ms : null;
    state.pausedFrom = null; state.remainingMs = null;
  }
  // Everyone keeps once before anyone keeps twice; never twice in a row.
  function drawKeeper(state, random) {
    const players = activeNums(state), rotation = state.rotation;
    if (rotation.next != null && players.includes(rotation.next)) {
      const chosen = rotation.next;
      rotation.next = null; rotation.bag = list(rotation.bag).filter(n => n !== chosen); rotation.last = chosen;
      return chosen;
    }
    rotation.next = null;
    let bag = list(rotation.bag).filter(n => players.includes(n));
    if (!bag.length) {
      bag = shuffle(players, random);
      if (bag.length > 1 && bag[0] === rotation.last) bag.push(bag.shift());
    }
    const chosen = bag.shift();
    rotation.bag = bag; rotation.last = chosen;
    return chosen;
  }
  function drawOptions(state, round, random) {
    const pool = CONTENT.pool(round.category), used = new Set(state.used.questions), shown = new Set(round.options);
    const fresh = shuffle(pool.filter(item => !used.has(item.id) && !shown.has(item.id)), random);
    const recycled = shuffle(pool.filter(item => used.has(item.id) && !shown.has(item.id)), random);
    const fallback = shuffle(pool.filter(item => shown.has(item.id)), random);
    round.options = [...fresh, ...recycled, ...fallback].slice(0, CONFIG.optionCount).map(item => item.id);
  }
  function startRound(state, now, random) {
    const players = activeNums(state);
    if (players.length < CONFIG.minPlayers) throw new Error('not_enough_players');
    const s = state.settings;
    state.roundNo++;
    const round = {
      no: state.roundNo, keeper: null, players, category: s.category, options: [], rerolls: 0, question: null,
      answersPer: s.answers, writeMs: s.writeSeconds * 1000, guessMs: s.guessMinutes * 60000, turnMs: s.turnSeconds * 1000, showAuthors: s.showAuthors,
      answers: {}, submitted: {}, groups: [], board: [], ranks: {}, values: {}, revealed: {}, hints: {},
      buzz: null, buzzSerial: 0, locked: [], guessEndsAt: null, pausedGuessMs: null, pausedBuzzMs: null,
      log: [], points: {}, outcome: null, endReason: null, groupSerial: 0,
    };
    round.keeper = drawKeeper(state, random);
    drawOptions(state, round, random);
    state.round = round;
    enter(state, 'choose', now);
  }

  // ── helpers over the current round ─────────────────────────────────────
  const inRound = (state, n) => !!state.round && list(state.round.players).includes(n);
  const playing = (state, n) => inRound(state, n) && isActive(state, n);
  const writers = state => list(state.round?.players).filter(n => isActive(state, n));
  const allSubmitted = state => writers(state).every(n => state.round.submitted[n] === true);
  const groupOf = (round, id) => round.groups.find(group => group.id === id) || null;
  const authorsOf = group => [...new Set(list(group?.members).map(member => member.playerNum))].sort((a, b) => a - b);
  // Everyone in the round except the Keeper, while they are playing.
  const guessers = state => list(state.round?.players).filter(n => n !== state.round.keeper && isActive(state, n));
  // A hit is worth one point per writer: the higher on the board, the more.
  const worth = (round, id) => Number.isInteger(round.values?.[id]) ? round.values[id] : authorsOf(groupOf(round, id)).length;
  // Competition ranks by how many people wrote each answer (ties share a rank).
  function rankGroups(groups) {
    const ranks = {};
    let rank = 0, last = null;
    groups.forEach((group, index) => { const count = authorsOf(group).length; if (count !== last) { rank = index + 1; last = count; } ranks[group.id] = rank; });
    return ranks;
  }

  // ── round flow ─────────────────────────────────────────────────────────
  function beginWrite(state, now) {
    enter(state, 'write', now, state.round.writeMs);
  }
  function beginSort(state, now, random) {
    const round = state.round, buckets = new Map();
    for (const n of round.players) for (const answer of list(round.answers[n])) {
      const key = normKey(answer.text) || answer.text;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ playerNum: n, text: answer.text, aid: answer.id });
    }
    round.groups = shuffle([...buckets.values()], random).map(members => ({ id: 'g' + (++round.groupSerial), text: members[0].text, members, dropped: false }));
    if (round.groups.length < CONFIG.minGroups) { finishRound(state, now, { voided: true, reason: 'few_answers' }); return; }
    enter(state, 'sort', now, CONFIG.sortMs);
  }
  const guessDeadline = round => round.buzz?.endsAt ? Math.min(round.guessEndsAt, round.buzz.endsAt) : round.guessEndsAt;
  function beginGuess(state, now, random) {
    const round = state.round;
    const live = round.groups.filter(group => !group.dropped);
    if (!live.length) { finishRound(state, now, { voided: true, reason: 'few_answers' }); return; }
    const tie = new Map(live.map(group => [group.id, random()]));
    const sorted = live.slice().sort((a, b) => authorsOf(b).length - authorsOf(a).length || tie.get(a.id) - tie.get(b.id));
    round.board = sorted.map(group => group.id);
    round.ranks = rankGroups(sorted);
    round.values = Object.fromEntries(sorted.map(group => [group.id, authorsOf(group).length]));
    round.buzz = null; round.locked = [];
    round.guessEndsAt = now + round.guessMs;
    state.phase = 'guess'; state.stage++; state.pausedFrom = null; state.remainingMs = null;
    state.deadline = guessDeadline(round);
    if (!guessers(state).length) endGuess(state, now, 'nobody');
  }
  // Whoever buzzed is done for now: a miss locks them until every other
  // guesser has missed once as well, then everyone may buzz again.
  function lockOut(state, playerNum) {
    const round = state.round;
    if (!round.locked.includes(playerNum)) round.locked = [...round.locked, playerNum];
    reopen(state);
  }
  function reopen(state) {
    const round = state.round, live = guessers(state);
    round.locked = round.locked.filter(n => live.includes(n));
    if (live.length && live.every(n => round.locked.includes(n))) round.locked = [];
  }
  function clearBuzz(state) {
    const round = state.round;
    round.buzz = null; round.pausedBuzzMs = null;
    if (state.phase === 'guess') state.deadline = guessDeadline(round);
  }
  function logEntry(round, playerNum, result, now, group = null, points = 0) {
    round.log = [...round.log, { playerNum, result, group, points, ts: now }].slice(-CONFIG.logMax);
  }
  function endGuess(state, now, reason) {
    const round = state.round;
    for (const id of round.board) if (!round.revealed[id]) round.revealed[id] = { how: 'left', by: null, points: 0 };
    round.endReason = reason; round.buzz = null;
    finishRound(state, now);
  }
  function finishRound(state, now, { voided = false, reason = null } = {}) {
    const round = state.round;
    if (voided) { round.endReason = reason || 'host'; round.buzz = null; }
    else for (const [n, value] of Object.entries(round.points)) state.scores[n] = (state.scores[n] || 0) + value;
    const values = Object.values(round.points), top = values.length ? Math.max(...values) : 0;
    const best = !voided && top > 0 ? Object.keys(round.points).map(Number).filter(n => round.points[n] === top).sort((a, b) => a - b) : [];
    round.outcome = { voided, reason: voided ? round.endReason : null, best, top };
    state.history = [...list(state.history), { no: round.no, question: round.question ? { en: round.question.en, zh: round.question.zh, custom: !!round.question.custom } : null,
      keeper: round.keeper, best, voided }].slice(-CONFIG.historyMax);
    enter(state, 'result', now);
  }

  // ── create / apply ─────────────────────────────────────────────────────
  // `previous` (an earlier game at this table) only carries which prompts were
  // used, so a restart doesn't offer them again straight away.
  function create({ id, roster: seats, settings, now, seed, previous } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(seats) || seats.length < 1 || seats.length > CONFIG.maxPlayers) throw new Error('invalid_roster');
    if (seats.some(player => !player || !Number.isInteger(player.playerNum) || player.playerNum < 1 || player.playerNum > CONFIG.maxPlayers)
      || new Set(seats.map(player => player.playerNum)).size !== seats.length) throw new Error('invalid_roster');
    const parsed = parseSettings(settings || {});
    const state = {
      version: 1, sessionId: String(id), turnId: 0, stage: 0, lastChangeAt: now,
      settings: parsed,
      roster: seats.map(player => ({ playerNum: player.playerNum, name: String(player.name || '').trim().slice(0, 80), active: player.active !== false }))
        .sort((a, b) => a.playerNum - b.playerNum),
      scores: {}, rotation: { bag: [], last: null, next: null },
      used: { questions: list(previous?.used?.questions).filter(item => typeof item === 'string' && CONTENT.get(item)).slice(-CONFIG.questionMemory) },
      roundNo: 0, round: null, history: [],
      phase: 'choose', deadline: null, pausedFrom: null, remainingMs: null, stopped: false,
      seen: {}, replies: {},
    };
    if (activeNums(state).length < CONFIG.minPlayers) throw new Error('not_enough_players');
    startRound(state, now, rng(seed));
    return state;
  }
  function normalize(state) {
    state.roster = roster(state); state.history = list(state.history);
    state.scores = state.scores || {}; state.seen = state.seen || {}; state.replies = state.replies || {};
    state.rotation = Object.assign({ bag: [], last: null, next: null }, state.rotation || {});
    state.rotation.bag = list(state.rotation.bag);
    state.used = { questions: list(state.used?.questions) };
    const round = state.round;
    if (round) {
      for (const key of ['players', 'options', 'groups', 'board', 'log', 'locked']) round[key] = list(round[key]);
      for (const key of ['answers', 'submitted', 'ranks', 'values', 'revealed', 'hints', 'points']) round[key] = round[key] || {};
      for (const key of Object.keys(round.answers)) round.answers[key] = list(round.answers[key]);
      round.groups.forEach(group => { group.members = list(group.members); group.dropped = group.dropped === true; });
      round.buzz = round.buzz || null; round.buzzSerial = Number(round.buzzSerial) || 0;
      // The earlier version took turns in a fixed order; buzzing replaces them.
      delete round.turn; delete round.order; delete round.pausedTurnMs;
    }
  }
  const PLAYER_COMMANDS = new Set(['pick', 'custom', 'reroll', 'submit', 'merge', 'split', 'drop', 'startGuess', 'buzz', 'hit', 'miss', 'pass', 'hint', 'next']);
  const TABLE_COMMANDS = new Set(['tick', 'pause', 'resume', 'close', 'extend', 'void', 'setNext', 'exclude', 'restart', 'settings', 'stop']);
  const HOST_COMMANDS = new Set([...TABLE_COMMANDS, 'next', 'rename']);
  // Any active player may run the table from their card; the Keeper's tools
  // are checked per command. Only the Hub's rename stays with the host page.
  function allowed(state, actor, type, input) {
    if (actor === 0) return HOST_COMMANDS.has(type);
    if (PLAYER_COMMANDS.has(type)) return isActive(state, actor);
    if (!TABLE_COMMANDS.has(type)) return false;
    if (type === 'tick' || isActive(state, actor)) return true;
    return type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
  }
  const KEEPER = { choose: ['pick', 'custom', 'reroll'], sort: ['merge', 'split', 'drop', 'startGuess'], guess: ['hit', 'miss', 'hint'] };

  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor), host = actor === 0;
    if (!host && !seat(current, actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const now = Number(input.now);
    if (!Number.isFinite(now)) return current;
    const type = String(input.type || '');
    if (type === 'tick') {
      if (input.stage !== current.stage || !TIMED.includes(current.phase) || !(current.deadline > 0) || now < current.deadline) return current;
    }
    const state = copy(current);
    normalize(state);
    const random = rng(input.seed);
    const round = state.round;
    const fresh = input.stage === state.stage;
    let error = '';
    const fail = code => { error = code; };
    const keeperOnly = Object.entries(KEEPER).find(([, types]) => types.includes(type));
    if (!allowed(current, actor, type, input)) fail('not_available');
    else if (!fresh && (!host || ['close', 'extend', 'next'].includes(type))) fail('stale_turn');
    else if (keeperOnly && (state.phase !== keeperOnly[0] || actor !== round?.keeper)) fail('not_available');
    else switch (type) {
      case 'tick':
      case 'close': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
        if (state.phase === 'write') beginSort(state, now, random);
        else if (state.phase === 'sort') beginGuess(state, now, random);
        else if (type === 'close') endGuess(state, now, 'host');
        else if (now >= round.guessEndsAt) endGuess(state, now, 'time');
        else if (round.buzz?.endsAt && now >= round.buzz.endsAt) { const late = round.buzz.playerNum; logEntry(round, late, 'timeout', now); clearBuzz(state); lockOut(state, late); }
        else state.deadline = guessDeadline(round);
        break;
      }
      case 'pick': {
        if (!round.options.includes(input.questionId)) { fail('not_available'); break; }
        const item = CONTENT.get(input.questionId);
        round.question = { id: item.id, en: item.en, zh: item.zh, cat: item.cat, custom: false };
        state.used.questions = [...state.used.questions.filter(idValue => idValue !== item.id), item.id].slice(-CONFIG.questionMemory);
        beginWrite(state, now);
        break;
      }
      case 'custom': {
        const text = cleanText(input.text, CONFIG.questionMax);
        if (Array.from(text).length < CONFIG.questionMin) { fail('empty'); break; }
        round.question = { id: null, en: text, zh: text, custom: true };
        beginWrite(state, now);
        break;
      }
      case 'reroll': {
        if (round.rerolls >= CONFIG.maxRerolls) { fail('not_available'); break; }
        round.rerolls++;
        drawOptions(state, round, random);
        break;
      }
      case 'submit': {
        if (state.phase !== 'write' || !playing(state, actor)) { fail('not_available'); break; }
        const answers = list(input.answers).slice(0, 6).map(raw => cleanText(raw, CONFIG.answerMax)).filter(Boolean).slice(0, round.answersPer);
        if (!answers.length) { fail('empty'); break; }
        // Each answer of one player must be different ("Keys" and "keys!" are the same).
        const keys = answers.map(text => normKey(text) || text);
        if (new Set(keys).size !== keys.length) { fail('duplicate'); break; }
        round.answers[actor] = answers.map((text, index) => ({ id: `a${round.no}-${actor}-${index}`, text }));
        round.submitted[actor] = true;
        if (allSubmitted(state)) beginSort(state, now, random);
        break;
      }
      case 'merge': {
        const from = groupOf(round, input.from), into = groupOf(round, input.into);
        if (!from || !into || from === into || from.dropped || into.dropped) { fail('not_available'); break; }
        into.members = into.members.concat(from.members);
        round.groups = round.groups.filter(group => group !== from);
        break;
      }
      case 'split': {
        // Undo the Keeper's merges; answers that are the same word stay together.
        const index = round.groups.findIndex(group => group.id === input.group), group = round.groups[index];
        const buckets = new Map();
        for (const member of list(group?.members)) {
          const key = normKey(member.text) || member.text;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(member);
        }
        if (!group || buckets.size < 2) { fail('not_available'); break; }
        const parts = [...buckets.values()].map(members => ({ id: 'g' + (++round.groupSerial), text: members[0].text, members, dropped: group.dropped }));
        round.groups.splice(index, 1, ...parts);
        break;
      }
      case 'drop': {
        const group = groupOf(round, input.group), want = input.dropped === true;
        if (!group || group.dropped === want) { fail('not_available'); break; }
        if (want && round.groups.filter(item => !item.dropped).length <= 1) { fail('not_available'); break; }
        group.dropped = want;
        break;
      }
      case 'startGuess': {
        beginGuess(state, now, random);
        break;
      }
      case 'buzz': {
        // First come, first served: one buzzer at a time.
        if (state.phase !== 'guess' || !guessers(state).includes(actor)) { fail('not_available'); break; }
        if (round.buzz) { fail('taken'); break; }
        if (round.locked.includes(actor)) { fail('locked'); break; }
        if (round.board.every(id => round.revealed[id])) { fail('not_available'); break; }
        round.buzzSerial++;
        round.buzz = { serial: round.buzzSerial, playerNum: actor, at: now, endsAt: round.turnMs > 0 ? now + round.turnMs : null };
        state.deadline = guessDeadline(round);
        break;
      }
      case 'hit': {
        const id = String(input.group || ''), group = groupOf(round, id);
        if (!round.buzz || input.buzz !== round.buzz.serial || !round.board.includes(id) || round.revealed[id] || !group) { fail('stale_turn'); break; }
        const guesser = round.buzz.playerNum, authors = authorsOf(group);
        clearBuzz(state);
        if (authors.includes(guesser)) {
          // The rules know the writers: your own answer never scores, and it
          // burns so nobody can repeat what you just said.
          round.revealed[id] = { how: 'own', by: guesser, points: 0 };
          logEntry(round, guesser, 'own', now, id);
          lockOut(state, guesser);
        } else {
          const points = worth(round, id);
          round.revealed[id] = { how: 'hit', by: guesser, points };
          round.points[guesser] = (round.points[guesser] || 0) + points;
          logEntry(round, guesser, 'hit', now, id, points);
          // The board changed: everyone may buzz again.
          round.locked = [];
        }
        if (round.board.every(item => round.revealed[item])) endGuess(state, now, 'all');
        break;
      }
      case 'miss': {
        if (!round.buzz || input.buzz !== round.buzz.serial) { fail('stale_turn'); break; }
        const missed = round.buzz.playerNum;
        logEntry(round, missed, 'miss', now);
        clearBuzz(state); lockOut(state, missed);
        break;
      }
      case 'pass': {
        // The buzzer gives up (or the Keeper lets them go): it counts as a miss.
        if (state.phase !== 'guess' || !round.buzz || input.buzz !== round.buzz.serial || !(actor === round.keeper || actor === round.buzz.playerNum)) { fail('not_available'); break; }
        const passed = round.buzz.playerNum;
        logEntry(round, passed, 'pass', now);
        clearBuzz(state); lockOut(state, passed);
        break;
      }
      case 'hint': {
        const id = String(input.group || '');
        if (!round.board.includes(id) || round.revealed[id] || round.hints[id]) { fail('not_available'); break; }
        round.hints[id] = true;
        break;
      }
      case 'next': {
        if (state.phase !== 'result') { fail('not_available'); break; }
        try { startRound(state, now, random); } catch (e) { fail(e.message); }
        break;
      }
      case 'pause': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
        const from = state.phase;
        let remaining;
        if (from === 'guess') {
          round.pausedGuessMs = Math.max(CONFIG.resumeFloorMs, round.guessEndsAt - now);
          round.pausedBuzzMs = round.buzz?.endsAt ? Math.max(CONFIG.resumeFloorMs, round.buzz.endsAt - now) : null;
          if (round.buzz) round.buzz.endsAt = null;
          remaining = round.pausedGuessMs;
        } else remaining = Math.max(CONFIG.resumeFloorMs, (state.deadline || now) - now);
        enter(state, 'paused', now);
        state.pausedFrom = from; state.remainingMs = remaining;
        break;
      }
      case 'resume': {
        if (state.phase !== 'paused') { fail('not_available'); break; }
        const from = state.pausedFrom;
        if (from === 'guess') {
          round.guessEndsAt = now + Math.max(CONFIG.resumeFloorMs, round.pausedGuessMs || 0);
          if (round.buzz) round.buzz.endsAt = round.pausedBuzzMs ? now + round.pausedBuzzMs : (round.turnMs > 0 ? now + round.turnMs : null);
          round.pausedGuessMs = null; round.pausedBuzzMs = null;
          state.phase = 'guess'; state.stage++; state.pausedFrom = null; state.remainingMs = null;
          state.deadline = guessDeadline(round);
        } else {
          enter(state, from, now, Math.max(CONFIG.resumeFloorMs, state.remainingMs || 0));
          if (from === 'write' && allSubmitted(state)) beginSort(state, now, random);
        }
        break;
      }
      case 'extend': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
        if (state.phase === 'guess') { round.guessEndsAt = Math.max(round.guessEndsAt, now) + CONFIG.extendGuessMs; state.deadline = guessDeadline(round); }
        else state.deadline = Math.max(state.deadline || now, now) + (state.phase === 'write' ? CONFIG.extendWriteMs : CONFIG.extendSortMs);
        break;
      }
      case 'void': {
        if (!round || ['result', 'finished'].includes(state.phase)) { fail('not_available'); break; }
        finishRound(state, now, { voided: true, reason: 'host' });
        break;
      }
      case 'setNext': {
        const target = input.playerNum == null ? null : Number(input.playerNum);
        if (target != null && !isActive(state, target)) { fail('not_available'); break; }
        state.rotation.next = target;
        break;
      }
      case 'exclude': {
        const number = Number(input.playerNum), want = input.active === true, player = seat(state, number);
        if (!player || player.active === want) { fail('not_available'); break; }
        player.active = want;
        if (!want && state.rotation.next === number) state.rotation.next = null;
        if (want || !round || ['result', 'finished'].includes(state.phase)) break;
        const live = state.phase === 'paused' ? state.pausedFrom : state.phase;
        // The Keeper holds every answer: without them the round can't go on.
        if (number === round.keeper && ['choose', 'write', 'sort', 'guess'].includes(live)) { finishRound(state, now, { voided: true, reason: 'keeper_left' }); break; }
        if (live === 'write' && state.phase === 'write' && allSubmitted(state)) { beginSort(state, now, random); break; }
        if (live === 'guess') {
          if (round.buzz?.playerNum === number) { logEntry(round, number, 'skip', now); clearBuzz(state); }
          reopen(state);
          if (!guessers(state).length) endGuess(state, now, 'nobody');
        }
        break;
      }
      case 'settings': {
        try { state.settings = parseSettings(input.settings || {}, state.settings); } catch (e) { fail('invalid_options'); }
        break;
      }
      case 'rename': {
        let changed = false;
        for (const entry of list(input.names)) {
          const player = seat(state, Number(entry?.playerNum)), name = String(entry?.name ?? '').trim().slice(0, 80);
          if (player && name && player.name !== name) { player.name = name; changed = true; }
        }
        if (!changed) fail('not_available');
        break;
      }
      case 'restart': {
        let settings;
        try { settings = parseSettings(input.settings || {}, state.settings); } catch (e) { fail('invalid_options'); break; }
        if (activeNums(state).length < CONFIG.minPlayers) { fail('not_enough_players'); break; }
        state.settings = settings; state.scores = {}; state.history = []; state.roundNo = 0; state.stopped = false;
        state.rotation = { bag: [], last: null, next: state.rotation.next };
        startRound(state, now, random);
        break;
      }
      case 'stop': {
        if (state.phase === 'finished') { fail('not_available'); break; }
        if (round) round.buzz = null;
        state.stopped = true;
        enter(state, 'finished', now);
        break;
      }
      default: fail('not_available');
    }
    if (!error) bump(state, now);
    state.seen[actor] = [...list(state.seen[actor]), input.id].slice(-CONFIG.seenMax);
    state.replies[actor] = { id: input.id, error };
    return state;
  }

  // ── projections ────────────────────────────────────────────────────────
  function standings(state) {
    const rows = roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active, score: state.scores?.[player.playerNum] || 0 }));
    const best = rows.length ? Math.max(...rows.map(row => row.score)) : 0;
    return rows.map(row => Object.assign(row, { leading: best > 0 && row.score === best }))
      .sort((a, b) => b.score - a.score || a.playerNum - b.playerNum);
  }
  const questionView = item => item ? { id: item.id ?? null, en: item.en, zh: item.zh, custom: !!item.custom, cat: item.cat || null } : null;
  // `keeper` adds every hidden text; `reveal` shows everything at the end.
  // Each tile says what a hit is worth (one point per writer).
  function boardView(round, { keeper = false, reveal = false } = {}) {
    return round.board.map(id => {
      const group = groupOf(round, id); if (!group) return null;
      const result = round.revealed[id] || null, authors = authorsOf(group);
      const tile = { id, rank: round.ranks[id] || 0, count: authors.length, points: worth(round, id), length: lengthHint(group.text),
        hint: round.hints[id] ? firstChar(group.text) : null, revealed: result ? { how: result.how, by: result.by, points: result.points } : null };
      if (result || reveal || keeper) tile.text = group.text;
      if (reveal && round.showAuthors) tile.authors = authors;
      return tile;
    }).filter(Boolean);
  }
  function logView(round) {
    return list(round?.log).slice(-30).map(entry => {
      const group = entry.group ? groupOf(round, entry.group) : null;
      return { playerNum: entry.playerNum, result: entry.result, text: group && round.revealed[entry.group] ? group.text : null, points: Number(entry.points) || 0, ts: entry.ts };
    });
  }
  // The Keeper's sorting table: biggest stacks first, with the rank and
  // points they would have on the board right now.
  function sortView(round) {
    const order = new Map(round.groups.map((group, index) => [group.id, index]));
    const sorted = round.groups.slice().sort((a, b) => Number(a.dropped) - Number(b.dropped) || authorsOf(b).length - authorsOf(a).length || order.get(a.id) - order.get(b.id));
    const ranks = rankGroups(sorted.filter(group => !group.dropped));
    return sorted.map(group => ({ id: group.id, text: group.text, count: authorsOf(group).length, rank: group.dropped ? null : ranks[group.id], points: group.dropped ? 0 : authorsOf(group).length,
      // Spellings that differ only in case or punctuation were stacked on
      // their own; `variants` lists the other answers the Keeper stacked on.
      variants: [...new Map(group.members.map(member => [normKey(member.text) || member.text, member.text])).entries()]
        .filter(([key]) => key !== (normKey(group.text) || group.text)).map(([, text]) => text),
      parts: group.members.length, dropped: group.dropped }));
  }
  function view(state, actor) {
    const n = Number(actor), round = state.round, phase = state.phase;
    const live = phase === 'paused' ? state.pausedFrom : phase;
    const reveal = phase === 'result' || phase === 'finished';
    const keeperView = !!round && n > 0 && n === round.keeper;
    const guessing = !!round && live === 'guess';
    const buzz = guessing && round.buzz ? { serial: round.buzz.serial, playerNum: round.buzz.playerNum, endsAt: phase === 'guess' ? round.buzz.endsAt : null, leftMs: phase === 'paused' ? round.pausedBuzzMs ?? null : null } : null;
    const rs = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, stage: state.stage, phase,
      pausedFrom: phase === 'paused' ? state.pausedFrom : null,
      settings: copy(state.settings), roundNo: state.roundNo,
      keeper: round?.keeper ?? null, category: round?.category || state.settings.category,
      question: round?.question ? questionView(round.question) : null,
      answersPer: round?.answersPer ?? state.settings.answers,
      deadline: TIMED.includes(phase) ? state.deadline : null,
      remainingMs: phase === 'paused' ? state.remainingMs : null,
      writeMs: round?.writeMs ?? null, guessMs: round?.guessMs ?? null, turnMs: round?.turnMs ?? null,
      writing: live === 'write' ? { submitted: writers(state).filter(p => round.submitted[p]), total: writers(state).length, writers: writers(state) } : null,
      sorting: live === 'sort' ? { answers: round.groups.reduce((sum, group) => sum + group.members.length, 0), groups: round.groups.filter(group => !group.dropped).length } : null,
      board: round && (live === 'guess' || (reveal && round.board.length)) ? boardView(round, { reveal }) : [],
      buzz,
      guessers: guessing ? guessers(state) : [],
      locked: guessing ? list(round.locked) : [],
      guessEndsAt: phase === 'guess' ? round.guessEndsAt : null,
      guessLeftMs: phase === 'paused' && state.pausedFrom === 'guess' ? round.pausedGuessMs : null,
      roundPoints: round ? copy(round.points) : {},
      log: logView(round),
      result: reveal && round?.outcome ? { outcome: copy(round.outcome), points: copy(round.points), endReason: round.endReason, showAuthors: !!round.showAuthors } : null,
      standings: standings(state),
      history: list(state.history).slice(-12).map(copy),
      roster: roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active, score: state.scores?.[player.playerNum] || 0, inRound: inRound(state, player.playerNum) })),
      stopped: phase === 'finished' && state.stopped === true,
      nextKeeper: state.rotation?.next ?? null,
      reply: (state.replies || {})[n] || null,
    };
    if (n > 0) {
      const mine = seat(state, n), active = mine?.active === true;
      const guesser = guessing && guessers(state).includes(n), locked = guesser && list(round.locked).includes(n);
      const unrevealed = guessing && round.board.some(id => !round.revealed[id]);
      rs.me = {
        active, inRound: inRound(state, n), isKeeper: keeperView, isGuesser: guesser,
        options: keeperView && phase === 'choose' ? round.options.map(id => questionView(CONTENT.get(id))).filter(Boolean) : null,
        rerollsLeft: keeperView && phase === 'choose' ? Math.max(0, CONFIG.maxRerolls - round.rerolls) : 0,
        myAnswers: round ? list(round.answers[n]).map(answer => answer.text) : [],
        submitted: !!round?.submitted?.[n],
        canSubmit: phase === 'write' && active && inRound(state, n),
        groups: keeperView && live === 'sort' ? sortView(round) : null,
        board: keeperView && guessing ? boardView(round, { keeper: true }) : null,
        locked,
        myBuzz: !!buzz && buzz.playerNum === n,
        canBuzz: phase === 'guess' && guesser && !locked && !buzz && unrevealed,
        canPass: phase === 'guess' && !!buzz && (keeperView || buzz.playerNum === n),
        canNext: phase === 'result' && active,
        canControl: active,
      };
    }
    return { game: 'roomsurvey', playerNum: n, name: seat(state, n)?.name || null, rs };
  }

  return { CONFIG, CONTENT, TIMED, create, apply, view, standings, parseSettings, defaultSettings, rng, list, cleanText, normKey, lengthHint, firstChar, authorsOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ROOM_SURVEY_ENGINE;
