/* WORD LIMIT THEATER — pure authoritative rules. No DOM, Firebase or timers.
 *
 * Everyone improvises one scene together, out loud. Each player is dealt a
 * role and a random line limit from 1 to 6: every line they say must be
 * exactly that many words (or Chinese characters). One actor may only say
 * "No!" while another has to fill six words. During the scene everyone draws a
 * new random limit a few times. After each line, the actor taps a button on their own card and
 * scores the points of their current limit (by default one point per word, so
 * long limits score more; the table can set every limit's points). Anyone can
 * call a foul on a line that broke its limit; it only counts.
 *
 * The exercise is a classic improv game ("limited words"); every scene, role
 * and word of copy here is original. (The bilingual twist cards in the content
 * file are not used by these rules for now.)
 *
 * Same table model as WHO KNOWS?: the canonical state lives in one table node,
 * any active player may run the table from their card (pause, add time, sit
 * someone out, change settings, start over), and every command carries its own
 * captured time and seed, so a retried transaction gives the same result.
 * Nothing in this game is secret: roles, limits and points are public.
 */
var WORD_LIMIT_ENGINE = (() => {
  'use strict';
  const CONTENT = typeof WORD_LIMIT_CONTENT !== 'undefined' ? WORD_LIMIT_CONTENT : require('./word-limit-content.js');
  const CONFIG = Object.freeze({
    minPlayers: 2, maxPlayers: 9,
    sceneMinutes: Object.freeze([2, 3, 4, 5]), defaultSceneMinutes: 3,
    units: Object.freeze(['words', 'chars']),
    // How many times the limits swap during a scene, spread evenly over it.
    shuffleCounts: Object.freeze([0, 1, 2, 3, 4]), defaultShuffles: 3,
    // Points can be set for 1–10 (tables saved by the earlier ladder version
    // may still hold 7–10); every scene deals and swaps limits in 1–6.
    limitValues: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), pointsMax: 50,
    dealValues: Object.freeze([1, 2, 3, 4, 5, 6]),
    // Short lines may repeat. A six-word line is an occasional variation,
    // never a compulsory role, and at most one is drawn for the cast.
    dealWeights: Object.freeze([22, 22, 20, 18, 13, 5]),
    castMs: 20000,
    lineCooldownMs: 3000, foulCooldownMs: 2500,
    maxRerolls: 5,
    extendSceneMs: 60000, extendOtherMs: 15000, resumeFloorMs: 3000,
    historyMax: 30, seenMax: 16, foulLogMax: 80, sceneMemory: 30,
  });
  const TIMED = Object.freeze(['cast', 'scene']);
  // A table saved by the earlier version may still be in its 30-second MVP
  // vote; its clock still runs out into the result.
  const TICKED = Object.freeze([...TIMED, 'vote']);
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

  // ── settings ───────────────────────────────────────────────────────────
  // By default a line scores one point per word: a 6-word line is worth 6.
  const defaultPoints = () => Object.fromEntries(CONFIG.limitValues.map(n => [n, n]));
  const validPoints = value => Number.isInteger(value) && value >= 0 && value <= CONFIG.pointsMax;
  function defaultSettings(unit = 'words') {
    return { sceneMinutes: CONFIG.defaultSceneMinutes, unit: CONFIG.units.includes(unit) ? unit : 'words', shuffles: CONFIG.defaultShuffles, points: defaultPoints() };
  }
  // Omitted fields keep the current choice. Invalid values throw. `points` may
  // name only some limits; the others keep their points.
  function parseSettings(input = {}, current = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_options');
    const base = Object.assign(defaultSettings(), current || {});
    const minutes = input.sceneMinutes === undefined ? base.sceneMinutes : Number(input.sceneMinutes);
    if (!CONFIG.sceneMinutes.includes(minutes)) throw new Error('invalid_options');
    const unit = input.unit === undefined ? base.unit : input.unit;
    if (!CONFIG.units.includes(unit)) throw new Error('invalid_options');
    // Tables saved by the earlier version had a single on/off `shuffle`.
    const legacy = flag => flag === false ? 0 : CONFIG.defaultShuffles;
    let shuffles;
    if (input.shuffles !== undefined) shuffles = Number(input.shuffles);
    else if (typeof input.shuffle === 'boolean') shuffles = legacy(input.shuffle);
    else if (current && current.shuffles === undefined && typeof current.shuffle === 'boolean') shuffles = legacy(current.shuffle);
    else shuffles = Number(base.shuffles);
    if (!CONFIG.shuffleCounts.includes(shuffles)) throw new Error('invalid_options');
    const points = defaultPoints();
    for (const [key, value] of Object.entries(base.points && typeof base.points === 'object' ? base.points : {})) {
      if (CONFIG.limitValues.includes(Number(key)) && validPoints(Number(value))) points[Number(key)] = Number(value);
    }
    if (input.points !== undefined) {
      if (!input.points || typeof input.points !== 'object' || Array.isArray(input.points)) throw new Error('invalid_options');
      for (const [key, value] of Object.entries(input.points)) {
        const limit = Number(key), worth = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
        if (!CONFIG.limitValues.includes(limit) || !validPoints(worth)) throw new Error('invalid_options');
        points[limit] = worth;
      }
    }
    return { sceneMinutes: minutes, unit, shuffles, points };
  }
  // Weighted draws with replacement for 1–5. Drawing order is shuffled so a
  // seat does not get first refusal on the single occasional six-word slot.
  // Exclude each seat's previous limit directly rather than retrying entire
  // deals, which would distort the weights and sometimes force long lines.
  function drawLimits(count, random, previous = [], allowSix = true) {
    const size = Math.max(0, Math.min(CONFIG.maxPlayers, Math.floor(Number(count) || 0)));
    const out = Array(size), order = shuffle(Array.from({ length: size }, (_, index) => index), random);
    let sixUsed = !allowSix;
    for (const index of order) {
      const choices = CONFIG.dealValues.filter(value => value !== Number(previous[index]) && !(value === 6 && sixUsed));
      const total = choices.reduce((sum, value) => sum + CONFIG.dealWeights[value - 1], 0);
      let cursor = random() * total, chosen = choices.at(-1);
      for (const value of choices) { cursor -= CONFIG.dealWeights[value - 1]; if (cursor < 0) { chosen = value; break; } }
      out[index] = chosen;
      if (chosen === 6) sixUsed = true;
    }
    return out;
  }
  // The points one line at this limit scores in this scene.
  function pointsFor(round, limit) {
    const value = Number(round?.value?.[limit]);
    return validPoints(value) ? value : Math.max(0, Number(limit) || 0);
  }

  // ── stage helpers ──────────────────────────────────────────────────────
  function bump(state, now) { state.turnId++; state.lastChangeAt = now; }
  function enter(state, phase, now, ms = null) {
    state.phase = phase; state.stage++;
    state.deadline = Number.isFinite(ms) ? now + ms : null;
    state.pausedFrom = null; state.remainingMs = null;
  }
  // The scene clock is a stopwatch, so a pause never loses time or swaps.
  const elapsed = (round, now) => round.runBase + (round.runSince != null ? Math.max(0, now - round.runSince) : 0);
  function sceneDeadline(round) {
    const target = round.pending.length ? Math.min(round.pending[0].at, round.sceneMs) : round.sceneMs;
    return round.runSince + Math.max(0, target - round.runBase);
  }
  function enterScene(state) {
    state.phase = 'scene'; state.stage++;
    state.pausedFrom = null; state.remainingMs = null;
    state.deadline = sceneDeadline(state.round);
  }
  const inRound = (state, n) => !!state.round && list(state.round.players).includes(n);
  const livePlayers = state => list(state.round?.players).filter(n => isActive(state, n));
  function speaking(state) {
    const round = state.round;
    if (!round) return { order: [], speaker: null, turn: 0 };
    const players = list(round.players).map(Number);
    const order = [...new Set([...list(round.speakingOrder).map(Number).filter(n => players.includes(n)), ...players])];
    const speaker = order.includes(round.speaker) && isActive(state, round.speaker)
      ? round.speaker : order.find(n => isActive(state, n)) ?? null;
    return { order, speaker, turn: Number.isInteger(round.speakingTurn) && round.speakingTurn > 0 ? round.speakingTurn : 1 };
  }
  function advanceSpeaker(state) {
    const round = state.round, floor = speaking(state), from = floor.order.indexOf(round.speaker);
    round.speaker = null;
    for (let step = 1; step <= floor.order.length; step++) {
      const number = floor.order[(Math.max(-1, from) + step) % floor.order.length];
      if (isActive(state, number)) { round.speaker = number; break; }
    }
    round.speakingTurn = floor.turn + 1;
    // Phase and scene clocks stay put; the existing stage fence makes a
    // second tap from the previous speaker unable to skip another actor.
    state.stage++;
  }
  // A round that has not been settled yet (its points are still running).
  const liveRound = state => !!state.round && !state.round.outcome;

  // ── dealing ────────────────────────────────────────────────────────────
  function pickScene(state, round, random) {
    const used = new Set(state.used.scenes), current = round.sceneId;
    let pool = CONTENT.SCENES.filter(item => !used.has(item.id) && item.id !== current);
    if (!pool.length) pool = CONTENT.SCENES.filter(item => item.id !== current);
    const chosen = pool[Math.floor(random() * pool.length)];
    round.sceneId = chosen.id;
    state.used.scenes = [...state.used.scenes.filter(id => id !== chosen.id), chosen.id].slice(-CONFIG.sceneMemory);
  }
  // The first N roles of the scene (the centre of the story), dealt at random.
  function dealRoles(round, random) {
    const order = shuffle(round.players.map((_, index) => index), random);
    round.roles = {};
    round.players.forEach((n, index) => { round.roles[n] = order[index]; });
  }
  // Fresh random limits that avoid repeating last scene's limit where possible.
  function dealLimits(round, previous, random) {
    const before = previous?.limits || {};
    const perm = drawLimits(round.players.length, random, round.players.map(n => before[n]));
    round.limits = {}; round.prevLimits = {};
    round.players.forEach((n, index) => { round.limits[n] = perm[index]; });
  }
  function startRound(state, now, random) {
    const players = activeNums(state);
    if (players.length < CONFIG.minPlayers) throw new Error('not_enough_players');
    const s = state.settings, previous = state.round;
    state.roundNo++;
    const round = {
      no: state.roundNo, sceneId: null, unit: s.unit, sceneMs: s.sceneMinutes * 60000,
      planned: s.shuffles, value: copy(s.points),
      players, roles: {}, limits: {}, prevLimits: {}, rerolls: 0,
      runBase: 0, runSince: null, startedAt: null, endedAt: null, endReason: null,
      pending: [], shuffles: 0, event: null,
      fouls: {}, foulLog: [], lines: {}, gained: {}, lastLine: {}, best: [], outcome: null,
    };
    pickScene(state, round, random);
    dealRoles(round, random);
    dealLimits(round, previous, random);
    round.speakingOrder = shuffle(players, random);
    round.speaker = round.speakingOrder[0]; round.speakingTurn = 1;
    state.round = round;
    enter(state, 'cast', now, CONFIG.castMs);
  }

  // ── the scene ──────────────────────────────────────────────────────────
  const nextSerial = round => (round.event?.serial || 0) + 1;
  // Everyone still playing draws a new random limit, never the one they had.
  function shuffleLimits(state, now, random) {
    const round = state.round, live = livePlayers(state);
    if (!live.length) return;
    // Reserve an inactive actor's six-word line, so rejoining cannot add a
    // second long line to a newly drawn cast. Legacy saved limits stay intact.
    const reservedSix = list(round.players).some(n => !isActive(state, n) && Number(round.limits[n]) >= 6);
    const perm = drawLimits(live.length, random, live.map(n => round.limits[n]), !reservedSix);
    round.prevLimits = {};
    live.forEach((n, index) => { round.prevLimits[n] = round.limits[n]; round.limits[n] = perm[index]; });
    round.shuffles++;
    round.event = { kind: 'shuffle', ts: now, serial: nextSerial(round) };
  }
  // The swaps are spread evenly: with three in a 3-minute scene, at 0:45, 1:30 and 2:15.
  function beginScene(state, now) {
    const round = state.round, count = Number(round.planned) || 0;
    round.runBase = 0; round.runSince = now; round.startedAt = now;
    round.pending = [];
    if (livePlayers(state).length >= 1) for (let k = 1; k <= count; k++) round.pending.push({ type: 'shuffle', at: Math.round(round.sceneMs * k / (count + 1)) });
    enterScene(state);
  }
  function tickScene(state, now, random) {
    const round = state.round, at = elapsed(round, now);
    while (round.pending.length && round.pending[0].at <= at) {
      const event = round.pending.shift();
      if (event.type === 'shuffle' && at < round.sceneMs) shuffleLimits(state, now, random);
    }
    if (at >= round.sceneMs) endScene(state, now, 'time');
    else state.deadline = sceneDeadline(round);
  }
  function endScene(state, now, reason) {
    const round = state.round;
    round.runBase = Math.min(round.sceneMs, elapsed(round, now)); round.runSince = null; round.pending = [];
    round.endReason = reason; round.endedAt = now;
    finishRound(state, now);
  }
  // Adds the scene's points to the scores (unless cancelled) and closes it.
  function settle(state, now, { voided = false, reason = null } = {}) {
    const round = state.round;
    if (round.runSince != null) { round.runBase = Math.min(round.sceneMs, elapsed(round, now)); round.runSince = null; }
    round.pending = [];
    if (voided) { round.endReason = reason || 'host'; round.endedAt = round.endedAt || now; }
    else for (const [n, value] of Object.entries(round.gained)) if (value) state.scores[n] = (state.scores[n] || 0) + value;
    const values = voided ? [] : Object.values(round.gained).map(Number);
    const top = values.length ? Math.max(...values) : 0;
    round.best = top > 0 ? Object.keys(round.gained).map(Number).filter(n => Number(round.gained[n]) === top).sort((a, b) => a - b) : [];
    round.outcome = { voided, reason: voided ? round.endReason : null, best: round.best, top };
    state.history = [...list(state.history), { no: round.no, sceneId: round.sceneId, best: round.best, top, voided }].slice(-CONFIG.historyMax);
  }
  function finishRound(state, now, options = {}) {
    settle(state, now, options);
    enter(state, 'result', now);
  }

  // ── create / apply ─────────────────────────────────────────────────────
  // `previous` (an earlier game at this table) only carries which scenes were
  // already used, so a restart doesn't repeat them.
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
      scores: {},
      used: { scenes: list(previous?.used?.scenes).filter(item => typeof item === 'string' && CONTENT.scene(item)).slice(-CONFIG.sceneMemory) },
      roundNo: 0, round: null, history: [],
      phase: 'cast', deadline: null, pausedFrom: null, remainingMs: null, stopped: false,
      seen: {}, replies: {},
    };
    if (activeNums(state).length < CONFIG.minPlayers) throw new Error('not_enough_players');
    startRound(state, now, rng(seed));
    return state;
  }
  function normalize(state) {
    state.roster = roster(state); state.history = list(state.history);
    state.scores = state.scores || {}; state.seen = state.seen || {}; state.replies = state.replies || {};
    state.used = { scenes: list(state.used?.scenes) };
    // An earlier version's settings (twists, an on/off shuffle, a vote) read as today's.
    try { state.settings = parseSettings({}, state.settings); } catch (_) { state.settings = defaultSettings(state.settings?.unit); }
    const round = state.round;
    if (round) {
      for (const key of ['players', 'pending', 'foulLog', 'best']) round[key] = list(round[key]);
      for (const key of ['roles', 'limits', 'prevLimits', 'fouls', 'lines', 'gained', 'lastLine']) round[key] = round[key] || {};
      if (!round.value || typeof round.value !== 'object') round.value = defaultPoints();
      const floor = speaking(state);
      round.speakingOrder = floor.order; round.speaker = floor.speaker; round.speakingTurn = floor.turn;
    }
  }
  const PLAYER_COMMANDS = new Set(['reroll', 'line', 'foul', 'next']);
  const TABLE_COMMANDS = new Set(['tick', 'pause', 'resume', 'close', 'extend', 'void', 'exclude', 'restart', 'settings', 'stop']);
  const HOST_COMMANDS = new Set([...TABLE_COMMANDS, 'reroll', 'foul', 'next', 'rename']);
  // The table runs without a host page: any active player may use the table
  // commands from their own card, and anyone seated may tick an expired clock.
  // A line is scored only by the actor who said it. Only the Hub's rename
  // stays with the host page.
  function allowed(state, actor, type, input) {
    if (actor === 0) return HOST_COMMANDS.has(type);
    if (PLAYER_COMMANDS.has(type)) return isActive(state, actor);
    if (!TABLE_COMMANDS.has(type)) return false;
    if (type === 'tick' || isActive(state, actor)) return true;
    // Someone sitting out can always bring themselves back.
    return type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
  }

  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor), host = actor === 0;
    if (!host && !seat(current, actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const now = Number(input.now);
    if (!Number.isFinite(now)) return current;
    const type = String(input.type || '');
    if (type === 'tick') {
      // Idle ticks never write.
      if (input.stage !== current.stage || !TICKED.includes(current.phase) || !(current.deadline > 0) || now < current.deadline) return current;
    }
    const state = copy(current);
    normalize(state);
    const random = rng(input.seed);
    const round = state.round;
    const fresh = input.stage === state.stage;
    let error = '';
    const fail = code => { error = code; };
    if (!allowed(current, actor, type, input)) fail('not_available');
    // Cards are fenced to the stage they showed; host buttons that advance the
    // table are fenced too, so a double click cannot skip a whole phase.
    else if (!fresh && (!host || ['close', 'extend', 'next'].includes(type))) fail('stale_turn');
    else switch (type) {
      case 'tick':
      case 'close': {
        if (!TICKED.includes(state.phase)) { fail('not_available'); break; }
        if (state.phase === 'cast') beginScene(state, now);
        else if (state.phase === 'scene') { if (type === 'tick') tickScene(state, now, random); else endScene(state, now, 'host'); }
        else finishRound(state, now);
        break;
      }
      case 'reroll': {
        if (state.phase !== 'cast' || round.rerolls >= CONFIG.maxRerolls) { fail('not_available'); break; }
        round.rerolls++;
        pickScene(state, round, random);
        dealRoles(round, random);
        // A new scene gets the full reading time.
        state.deadline = now + CONFIG.castMs;
        break;
      }
      case 'line': {
        // "I said a line": scores the points of the limit this actor has now.
        if (state.phase !== 'scene' || !inRound(state, actor) || !isActive(state, actor)) { fail('not_available'); break; }
        const floor = speaking(state);
        if (actor !== floor.speaker) { fail('not_available'); break; }
        if (input.speakingTurn !== undefined && Number(input.speakingTurn) !== floor.turn) { fail('stale_turn'); break; }
        const last = round.lastLine[actor];
        if (last && now - Number(last.ts) < CONFIG.lineCooldownMs) { fail('cooldown'); break; }
        // A late tap cannot score after the scene, even if the clock's tick
        // was still in flight. Due swaps still use the same scene stopwatch.
        if (state.deadline > 0 && now >= state.deadline) {
          tickScene(state, now, random);
          if (state.phase !== 'scene') { bump(state, now); fail('not_available'); break; }
        }
        const limit = round.limits[actor], worth = pointsFor(round, limit);
        round.lines[actor] = (Number(round.lines[actor]) || 0) + 1;
        round.gained[actor] = (Number(round.gained[actor]) || 0) + worth;
        round.lastLine[actor] = { ts: now, points: worth, limit };
        advanceSpeaker(state);
        break;
      }
      case 'foul': {
        const target = Number(input.target);
        if (state.phase !== 'scene' || !inRound(state, target) || !isActive(state, target)) { fail('not_available'); break; }
        const last = round.foulLog.slice().reverse().find(entry => entry.by === actor && entry.target === target);
        if (last && now - last.ts < CONFIG.foulCooldownMs) { fail('cooldown'); break; }
        round.fouls[target] = (round.fouls[target] || 0) + 1;
        round.foulLog = [...round.foulLog, { by: actor, target, ts: now }].slice(-CONFIG.foulLogMax);
        round.event = { kind: 'foul', target, by: actor, ts: now, serial: nextSerial(round) };
        break;
      }
      case 'next': {
        if (state.phase !== 'result') { fail('not_available'); break; }
        try { startRound(state, now, random); } catch (e) { fail(e.message); }
        break;
      }
      case 'pause': {
        if (!TICKED.includes(state.phase)) { fail('not_available'); break; }
        const from = state.phase;
        let remaining;
        if (from === 'scene') {
          round.runBase = elapsed(round, now); round.runSince = null;
          remaining = Math.max(0, round.sceneMs - round.runBase);
        } else remaining = Math.max(CONFIG.resumeFloorMs, (state.deadline || now) - now);
        enter(state, 'paused', now);
        state.pausedFrom = from; state.remainingMs = remaining;
        break;
      }
      case 'resume': {
        if (state.phase !== 'paused') { fail('not_available'); break; }
        const from = state.pausedFrom;
        if (from === 'scene') {
          if (round.sceneMs - round.runBase < CONFIG.resumeFloorMs) round.sceneMs = round.runBase + CONFIG.resumeFloorMs;
          round.runSince = now;
          enterScene(state);
        } else enter(state, from, now, Math.max(CONFIG.resumeFloorMs, state.remainingMs || 0));
        break;
      }
      case 'extend': {
        if (!TICKED.includes(state.phase)) { fail('not_available'); break; }
        if (state.phase === 'scene') { round.sceneMs += CONFIG.extendSceneMs; state.deadline = sceneDeadline(round); }
        else state.deadline = Math.max(state.deadline || now, now) + CONFIG.extendOtherMs;
        break;
      }
      case 'void': {
        if (!round || ['result', 'finished'].includes(state.phase)) { fail('not_available'); break; }
        finishRound(state, now, { voided: true, reason: 'host' });
        break;
      }
      case 'exclude': {
        const number = Number(input.playerNum), want = input.active === true, player = seat(state, number);
        if (!player || player.active === want) { fail('not_available'); break; }
        // Points already scored in this scene stay with the player.
        const previousSpeaker = speaking(state).speaker;
        player.active = want;
        if (round && inRound(state, number) && (!want && previousSpeaker === number)) advanceSpeaker(state);
        else if (round && want && previousSpeaker === null && inRound(state, number)) {
          round.speaker = number; round.speakingTurn = speaking(state).turn + 1; state.stage++;
        }
        break;
      }
      case 'settings': {
        try { state.settings = parseSettings(input.settings || {}, state.settings); } catch (e) { fail('invalid_options'); }
        break;
      }
      case 'rename': {
        // The Hub renamed someone: keep every seat and its score.
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
        startRound(state, now, random);
        break;
      }
      case 'stop': {
        if (state.phase === 'finished') { fail('not_available'); break; }
        // Lines already said in the scene still count when the game ends early.
        if (round && !round.outcome) settle(state, now);
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
  // While a scene runs, its points already count in the totals people see.
  function standings(state) {
    const live = liveRound(state) ? state.round.gained || {} : {};
    const rows = roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active,
      score: (state.scores?.[player.playerNum] || 0) + (Number(live[player.playerNum]) || 0) }));
    const best = rows.length ? Math.max(...rows.map(row => row.score)) : 0;
    return rows.map(row => Object.assign(row, { leading: best > 0 && row.score === best }))
      .sort((a, b) => b.score - a.score || a.playerNum - b.playerNum);
  }
  const roleView = role => role ? { en: role.en, zh: role.zh, want: { en: role.want.en, zh: role.want.zh } } : null;
  function castView(state) {
    const round = state.round; if (!round) return [];
    const scene = CONTENT.scene(round.sceneId);
    return round.players.map(n => ({
      playerNum: n, name: seat(state, n)?.name || '', active: isActive(state, n),
      role: roleView(scene?.roles[round.roles[n]]), limit: round.limits[n] ?? null,
      prev: own(round.prevLimits, n) ? round.prevLimits[n] : null,
      worth: round.limits[n] != null ? pointsFor(round, round.limits[n]) : 0,
      fouls: round.fouls[n] || 0, lines: Number(round.lines?.[n]) || 0, gained: Number(round.gained?.[n]) || 0,
      lastLine: round.lastLine?.[n] ? { ts: Number(round.lastLine[n].ts), points: Number(round.lastLine[n].points) || 0 } : null,
    }));
  }
  // The points of every limit a scene can deal (1–6, plus a 7–10 an older
  // table may still hold), lowest limit first; `held` marks the ones in play.
  function valuesView(round) {
    if (!round) return [];
    const held = new Set(Object.values(round.limits).map(Number));
    return [...new Set([...CONFIG.dealValues, ...held])].sort((a, b) => a - b).map(limit => ({ limit, points: pointsFor(round, limit), held: held.has(limit) }));
  }
  const viewSettings = settings => { try { return parseSettings({}, settings); } catch (_) { return defaultSettings(settings?.unit); } };
  function view(state, actor) {
    const n = Number(actor), round = state.round, phase = state.phase, settings = viewSettings(state.settings);
    const scene = round ? CONTENT.scene(round.sceneId) : null;
    const running = phase === 'scene' && round?.runSince != null;
    const reveal = phase === 'result' || phase === 'finished';
    const floor = speaking(state);
    const floorIndex = floor.order.indexOf(floor.speaker);
    const after = floor.order.slice(floorIndex + 1).concat(floor.order.slice(0, floorIndex + 1));
    // (A table saved by the earlier version may still hold a scripted twist; it is skipped.)
    const swap = round ? list(round.pending).find(event => event.type === 'shuffle') : null;
    const nextAt = swap && round.runSince == null && phase === 'paused' && state.pausedFrom === 'scene' ? Math.max(0, swap.at - round.runBase) : null;
    const wl = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, stage: state.stage, phase,
      pausedFrom: phase === 'paused' ? state.pausedFrom : null,
      settings, roundNo: state.roundNo,
      unit: round?.unit || settings.unit,
      scene: scene ? { id: scene.id, slug: copy(scene.slug), title: copy(scene.title), line: copy(scene.line) } : null,
      cast: castView(state),
      speaker: ['cast', 'scene', 'paused'].includes(phase) ? floor.speaker : null,
      speakingOrder: floor.order, speakingTurn: floor.turn,
      nextSpeaker: after.find(number => isActive(state, number)) ?? null,
      values: valuesView(round),
      deadline: TICKED.includes(phase) ? state.deadline : null,
      remainingMs: phase === 'paused' ? state.remainingMs : null,
      sceneMs: round?.sceneMs ?? null,
      sceneEndsAt: running ? round.runSince + (round.sceneMs - round.runBase) : null,
      sceneLeftMs: round && !running ? Math.max(0, round.sceneMs - round.runBase) : null,
      // When the limits swap next (a time while the scene runs, a duration while paused).
      nextShuffleAt: running && swap ? round.runSince + (swap.at - round.runBase) : null,
      nextShuffleInMs: nextAt,
      shuffles: round?.shuffles || 0, planned: round ? Number(round.planned) || 0 : settings.shuffles,
      event: round?.event ? copy(round.event) : null,
      rerollsLeft: round ? Math.max(0, CONFIG.maxRerolls - round.rerolls) : 0,
      lineCooldownMs: CONFIG.lineCooldownMs,
      result: reveal && round?.outcome ? { outcome: copy(round.outcome), best: list(round.best), endReason: round.endReason } : null,
      standings: standings(state),
      history: list(state.history).slice(-12).map(entry => { const item = CONTENT.scene(entry.sceneId); return { no: entry.no, title: item ? copy(item.title) : null, best: list(entry.best), voided: !!entry.voided }; }),
      roster: standings(state).map(row => ({ playerNum: row.playerNum, name: row.name, active: row.active, score: row.score, inRound: inRound(state, row.playerNum) }))
        .sort((a, b) => a.playerNum - b.playerNum),
      stopped: phase === 'finished' && state.stopped === true,
      reply: (state.replies || {})[n] || null,
    };
    if (n > 0) {
      const mine = seat(state, n), active = mine?.active === true, here = inRound(state, n);
      const limit = here ? round.limits[n] ?? null : null, last = here ? round.lastLine?.[n] : null;
      wl.me = {
        active, inRound: here,
        role: here ? roleView(scene?.roles[round.roles[n]]) : null,
        limit, worth: limit != null ? pointsFor(round, limit) : 0,
        prev: here && own(round.prevLimits, n) ? round.prevLimits[n] : null,
        fouls: here ? round.fouls[n] || 0 : 0,
        lines: here ? Number(round.lines?.[n]) || 0 : 0, gained: here ? Number(round.gained?.[n]) || 0 : 0,
        lineReadyAt: last ? Number(last.ts) + CONFIG.lineCooldownMs : 0,
        canBegin: phase === 'cast' && active,
        canReroll: phase === 'cast' && active && round.rerolls < CONFIG.maxRerolls,
        isSpeaker: floor.speaker === n && active && here,
        canLine: phase === 'scene' && active && here && floor.speaker === n,
        canFoul: phase === 'scene' && active,
        canNext: phase === 'result' && active,
        canEndVote: phase === 'vote' && active,
        canControl: active,
      };
    }
    return { game: 'wordlimit', playerNum: n, name: seat(state, n)?.name || null, wl };
  }

  return { CONFIG, CONTENT, TIMED, create, apply, view, standings, parseSettings, defaultSettings, defaultPoints, pointsFor, drawLimits, rng, list, elapsed };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WORD_LIMIT_ENGINE;
