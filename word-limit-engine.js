/* WORD LIMIT THEATER — pure authoritative rules. No DOM, Firebase or timers.
 *
 * Everyone improvises one scene together, out loud. Each player is dealt a
 * role and a line limit: every line they say must be exactly that many words
 * (or Chinese characters). The limits differ, so one actor can only say "No!"
 * while another has to fill eight words. Part-way through, a plot twist lands
 * and the limits shuffle. When the scene ends, everyone votes for an MVP.
 * Anyone can call a foul on a line that broke its limit.
 *
 * The exercise is a classic improv game ("limited words"); every scene, role,
 * twist and word of copy here is original.
 *
 * Same table model as WHO KNOWS?: the canonical state lives in one table node,
 * any active player may run the table from their card (pause, add time, sit
 * someone out, change settings, start over), and every command carries its own
 * captured time and seed, so a retried transaction gives the same result.
 * Nothing in this game is secret: roles and limits are public on purpose.
 */
var WORD_LIMIT_ENGINE = (() => {
  'use strict';
  const CONTENT = typeof WORD_LIMIT_CONTENT !== 'undefined' ? WORD_LIMIT_CONTENT : require('./word-limit-content.js');
  const CONFIG = Object.freeze({
    minPlayers: 2, maxPlayers: 9,
    sceneMinutes: Object.freeze([2, 3, 4, 5]), defaultSceneMinutes: 3,
    units: Object.freeze(['words', 'chars']),
    castMs: 20000, voteMs: 30000,
    // When the automatic twist and the limit shuffle land, as a share of the scene.
    twistAt: 0.35, shuffleAt: 0.65,
    twistCooldownMs: 15000, foulCooldownMs: 2500,
    maxRerolls: 5,
    extendSceneMs: 60000, extendOtherMs: 15000, resumeFloorMs: 3000,
    // One limit per player in the scene: mostly short, one long line for contrast.
    ladders: Object.freeze({
      1: Object.freeze([3]), 2: Object.freeze([1, 4]), 3: Object.freeze([1, 2, 5]), 4: Object.freeze([1, 2, 3, 6]),
      5: Object.freeze([1, 2, 3, 4, 7]), 6: Object.freeze([1, 2, 3, 4, 5, 8]), 7: Object.freeze([1, 2, 3, 4, 5, 6, 9]),
      8: Object.freeze([1, 2, 3, 4, 5, 6, 7, 10]), 9: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 10]),
    }),
    historyMax: 30, seenMax: 16, foulLogMax: 80, sceneMemory: 30, twistMemory: 30,
  });
  const TIMED = Object.freeze(['cast', 'scene', 'vote']);
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
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
  function defaultSettings(unit = 'words') {
    return { sceneMinutes: CONFIG.defaultSceneMinutes, unit: CONFIG.units.includes(unit) ? unit : 'words', twists: true, shuffle: true, vote: true };
  }
  // Omitted fields keep the current choice. Invalid values throw.
  function parseSettings(input = {}, current = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_options');
    const base = Object.assign(defaultSettings(), current || {});
    const minutes = input.sceneMinutes === undefined ? base.sceneMinutes : Number(input.sceneMinutes);
    if (!CONFIG.sceneMinutes.includes(minutes)) throw new Error('invalid_options');
    const unit = input.unit === undefined ? base.unit : input.unit;
    if (!CONFIG.units.includes(unit)) throw new Error('invalid_options');
    for (const key of ['twists', 'shuffle', 'vote']) if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error('invalid_options');
    return { sceneMinutes: minutes, unit, twists: input.twists ?? base.twists !== false, shuffle: input.shuffle ?? base.shuffle !== false, vote: input.vote ?? base.vote !== false };
  }
  const ladder = count => CONFIG.ladders[Math.max(1, Math.min(CONFIG.maxPlayers, count))].slice();

  // ── stage helpers ──────────────────────────────────────────────────────
  function bump(state, now) { state.turnId++; state.lastChangeAt = now; }
  function enter(state, phase, now, ms = null) {
    state.phase = phase; state.stage++;
    state.deadline = Number.isFinite(ms) ? now + ms : null;
    state.pausedFrom = null; state.remainingMs = null;
  }
  // The scene clock is a stopwatch, so a pause never loses time or events.
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
  const voters = state => livePlayers(state);
  const targets = (state, voter) => livePlayers(state).filter(n => n !== voter);

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
  // Fresh limits that avoid repeating last scene's limit where possible.
  function dealLimits(round, previous, random) {
    const values = ladder(round.players.length);
    const before = previous?.limits || {};
    let best = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const perm = shuffle(values, random);
      const repeats = round.players.filter((n, index) => before[n] === perm[index]).length;
      if (!best || repeats < best.repeats) best = { perm, repeats };
      if (!repeats) break;
    }
    round.limits = {}; round.prevLimits = {};
    round.players.forEach((n, index) => { round.limits[n] = best.perm[index]; });
  }
  function startRound(state, now, random) {
    const players = activeNums(state);
    if (players.length < CONFIG.minPlayers) throw new Error('not_enough_players');
    const s = state.settings, previous = state.round;
    state.roundNo++;
    const round = {
      no: state.roundNo, sceneId: null, unit: s.unit, sceneMs: s.sceneMinutes * 60000,
      twistsOn: s.twists, shuffleOn: s.shuffle, voteOn: s.vote,
      players, roles: {}, limits: {}, prevLimits: {}, rerolls: 0,
      runBase: 0, runSince: null, startedAt: null, endedAt: null, endReason: null,
      pending: [], twists: [], lastTwistAt: null, shuffles: 0, event: null,
      fouls: {}, foulLog: [], votes: {}, points: {}, mvp: [], outcome: null,
    };
    pickScene(state, round, random);
    dealRoles(round, random);
    dealLimits(round, previous, random);
    state.round = round;
    enter(state, 'cast', now, CONFIG.castMs);
  }

  // ── the scene ──────────────────────────────────────────────────────────
  const nextSerial = round => (round.event?.serial || 0) + 1;
  function addTwist(state, now, random, by) {
    const round = state.round;
    const used = new Set(state.used.twists), seenHere = new Set(round.twists.map(item => item.id));
    let pool = CONTENT.TWISTS.filter(item => !used.has(item.id) && !seenHere.has(item.id));
    if (!pool.length) pool = CONTENT.TWISTS.filter(item => !seenHere.has(item.id));
    if (!pool.length) return false;
    const pick = pool[Math.floor(random() * pool.length)];
    round.twists.push({ id: pick.id, by, at: elapsed(round, now) });
    round.lastTwistAt = now;
    state.used.twists = [...state.used.twists.filter(id => id !== pick.id), pick.id].slice(-CONFIG.twistMemory);
    round.event = { kind: 'twist', id: pick.id, by, ts: now, serial: nextSerial(round) };
    return true;
  }
  // Everyone still playing gets a different limit than the one they had.
  function shuffleLimits(state, now, random) {
    const round = state.round, live = livePlayers(state);
    if (live.length < 2) return;
    const values = live.map(n => round.limits[n]);
    let perm = null;
    for (let attempt = 0; attempt < 24 && !perm; attempt++) {
      const candidate = shuffle(values, random);
      if (live.every((n, index) => candidate[index] !== round.limits[n])) perm = candidate;
    }
    if (!perm) perm = values.slice(1).concat(values[0]);
    round.prevLimits = {};
    live.forEach((n, index) => { round.prevLimits[n] = round.limits[n]; round.limits[n] = perm[index]; });
    round.shuffles++;
    round.event = { kind: 'shuffle', ts: now, serial: nextSerial(round) };
  }
  function beginScene(state, now) {
    const round = state.round;
    round.runBase = 0; round.runSince = now; round.startedAt = now;
    round.pending = [];
    if (round.twistsOn) round.pending.push({ type: 'twist', at: Math.round(round.sceneMs * CONFIG.twistAt) });
    if (round.shuffleOn && livePlayers(state).length >= 2) round.pending.push({ type: 'shuffle', at: Math.round(round.sceneMs * CONFIG.shuffleAt) });
    round.pending.sort((a, b) => a.at - b.at);
    enterScene(state);
  }
  function tickScene(state, now, random) {
    const round = state.round, at = elapsed(round, now);
    while (round.pending.length && round.pending[0].at <= at) {
      const event = round.pending.shift();
      if (event.type === 'twist') addTwist(state, now, random, 0);
      else if (event.type === 'shuffle') shuffleLimits(state, now, random);
    }
    if (at >= round.sceneMs) endScene(state, now, 'time');
    else state.deadline = sceneDeadline(round);
  }
  function endScene(state, now, reason) {
    const round = state.round;
    round.runBase = Math.min(round.sceneMs, elapsed(round, now)); round.runSince = null; round.pending = [];
    round.endReason = reason; round.endedAt = now;
    if (round.voteOn && voters(state).length >= 2) enter(state, 'vote', now, CONFIG.voteMs);
    else finishRound(state, now);
  }
  const allVoted = state => voters(state).every(n => Object.prototype.hasOwnProperty.call(state.round.votes, n));
  function finishRound(state, now, { voided = false, reason = null } = {}) {
    const round = state.round;
    const counts = {};
    if (!voided) for (const target of Object.values(round.votes)) if (Number.isInteger(target) && target > 0) counts[target] = (counts[target] || 0) + 1;
    const top = Object.values(counts).length ? Math.max(...Object.values(counts)) : 0;
    round.points = counts;
    for (const [n, value] of Object.entries(counts)) state.scores[n] = (state.scores[n] || 0) + value;
    round.mvp = top > 0 ? Object.keys(counts).map(Number).filter(n => counts[n] === top).sort((a, b) => a - b) : [];
    if (round.runSince != null) { round.runBase = Math.min(round.sceneMs, elapsed(round, now)); round.runSince = null; }
    round.pending = [];
    if (voided) { round.endReason = reason || 'host'; round.endedAt = round.endedAt || now; }
    round.outcome = { voided, reason: voided ? round.endReason : null, mvp: round.mvp, top };
    state.history = [...list(state.history), { no: round.no, sceneId: round.sceneId, mvp: round.mvp, voided }].slice(-CONFIG.historyMax);
    enter(state, 'result', now);
  }

  // ── create / apply ─────────────────────────────────────────────────────
  // `previous` (an earlier game at this table) only carries which scenes and
  // twists were already used, so a restart doesn't repeat them.
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
      used: {
        scenes: list(previous?.used?.scenes).filter(item => typeof item === 'string' && CONTENT.scene(item)).slice(-CONFIG.sceneMemory),
        twists: list(previous?.used?.twists).filter(item => typeof item === 'string' && CONTENT.twist(item)).slice(-CONFIG.twistMemory),
      },
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
    state.used = { scenes: list(state.used?.scenes), twists: list(state.used?.twists) };
    const round = state.round;
    if (round) {
      for (const key of ['players', 'pending', 'twists', 'foulLog', 'mvp']) round[key] = list(round[key]);
      for (const key of ['roles', 'limits', 'prevLimits', 'fouls', 'votes', 'points']) round[key] = round[key] || {};
    }
  }
  const PLAYER_COMMANDS = new Set(['reroll', 'twist', 'foul', 'vote', 'next']);
  const TABLE_COMMANDS = new Set(['tick', 'pause', 'resume', 'close', 'extend', 'void', 'exclude', 'restart', 'settings', 'stop']);
  const HOST_COMMANDS = new Set([...TABLE_COMMANDS, 'reroll', 'twist', 'foul', 'next', 'rename']);
  // The table runs without a host page: any active player may use the table
  // commands from their own card, and anyone seated may tick an expired clock.
  // Only the Hub's rename stays with the host page.
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
      if (input.stage !== current.stage || !TIMED.includes(current.phase) || !(current.deadline > 0) || now < current.deadline) return current;
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
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
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
      case 'twist': {
        if (state.phase !== 'scene') { fail('not_available'); break; }
        if (round.lastTwistAt != null && now - round.lastTwistAt < CONFIG.twistCooldownMs) { fail('cooldown'); break; }
        if (!addTwist(state, now, random, actor)) fail('not_available');
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
      case 'vote': {
        const target = Number(input.target);
        if (state.phase !== 'vote' || !voters(state).includes(actor) || !(target === 0 || targets(state, actor).includes(target))) { fail('not_available'); break; }
        round.votes[actor] = target;
        if (allVoted(state)) finishRound(state, now);
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
        } else {
          enter(state, from, now, Math.max(CONFIG.resumeFloorMs, state.remainingMs || 0));
          if (from === 'vote' && allVoted(state)) finishRound(state, now);
        }
        break;
      }
      case 'extend': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
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
        player.active = want;
        if (!want && round && !['result', 'finished'].includes(state.phase)) {
          delete round.votes[number];
          for (const [voter, target] of Object.entries(round.votes)) if (target === number) delete round.votes[voter];
          if (state.phase === 'vote' && allVoted(state)) finishRound(state, now);
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
        if (round && round.runSince != null) { round.runBase = Math.min(round.sceneMs, elapsed(round, now)); round.runSince = null; }
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
  const roleView = role => role ? { en: role.en, zh: role.zh, want: { en: role.want.en, zh: role.want.zh } } : null;
  function castView(state) {
    const round = state.round; if (!round) return [];
    const scene = CONTENT.scene(round.sceneId);
    return round.players.map(n => ({
      playerNum: n, name: seat(state, n)?.name || '', active: isActive(state, n),
      role: roleView(scene?.roles[round.roles[n]]), limit: round.limits[n] ?? null,
      prev: Object.prototype.hasOwnProperty.call(round.prevLimits, n) ? round.prevLimits[n] : null,
      fouls: round.fouls[n] || 0,
    }));
  }
  function view(state, actor) {
    const n = Number(actor), round = state.round, phase = state.phase;
    const live = phase === 'paused' ? state.pausedFrom : phase;
    const scene = round ? CONTENT.scene(round.sceneId) : null;
    const running = phase === 'scene' && round?.runSince != null;
    const reveal = phase === 'result' || phase === 'finished';
    const who = live === 'vote' ? voters(state) : [];
    const wl = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, stage: state.stage, phase,
      pausedFrom: phase === 'paused' ? state.pausedFrom : null,
      settings: copy(state.settings), roundNo: state.roundNo,
      unit: round?.unit || state.settings.unit,
      scene: scene ? { id: scene.id, slug: copy(scene.slug), title: copy(scene.title), line: copy(scene.line) } : null,
      cast: castView(state),
      deadline: TIMED.includes(phase) ? state.deadline : null,
      remainingMs: phase === 'paused' ? state.remainingMs : null,
      sceneMs: round?.sceneMs ?? null,
      sceneEndsAt: running ? round.runSince + (round.sceneMs - round.runBase) : null,
      sceneLeftMs: round && !running ? Math.max(0, round.sceneMs - round.runBase) : null,
      twists: round ? round.twists.map(item => { const card = CONTENT.twist(item.id); return { id: item.id, en: card?.en || '', zh: card?.zh || '', by: item.by, at: item.at }; }) : [],
      event: round?.event ? copy(round.event) : null,
      twistReadyAt: round?.lastTwistAt != null ? round.lastTwistAt + CONFIG.twistCooldownMs : 0,
      shuffles: round?.shuffles || 0,
      rerollsLeft: round ? Math.max(0, CONFIG.maxRerolls - round.rerolls) : 0,
      ballots: live === 'vote' ? { cast: who.filter(voter => Object.prototype.hasOwnProperty.call(round.votes, voter)).length, total: who.length, voted: who.filter(voter => Object.prototype.hasOwnProperty.call(round.votes, voter)) } : null,
      result: reveal && round?.outcome ? { outcome: copy(round.outcome), votes: copy(round.votes), points: copy(round.points), mvp: copy(round.mvp), endReason: round.endReason } : null,
      standings: standings(state),
      history: list(state.history).slice(-12).map(entry => { const item = CONTENT.scene(entry.sceneId); return { no: entry.no, title: item ? copy(item.title) : null, mvp: list(entry.mvp), voided: !!entry.voided }; }),
      roster: roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active, score: state.scores?.[player.playerNum] || 0, inRound: inRound(state, player.playerNum) })),
      stopped: phase === 'finished' && state.stopped === true,
      reply: (state.replies || {})[n] || null,
    };
    if (n > 0) {
      const mine = seat(state, n), active = mine?.active === true, here = inRound(state, n);
      const me = {
        active, inRound: here,
        role: here ? roleView(scene?.roles[round.roles[n]]) : null,
        limit: here ? round.limits[n] ?? null : null,
        prev: here && Object.prototype.hasOwnProperty.call(round.prevLimits, n) ? round.prevLimits[n] : null,
        fouls: here ? round.fouls[n] || 0 : 0,
        canBegin: phase === 'cast' && active,
        canReroll: phase === 'cast' && active && round.rerolls < CONFIG.maxRerolls,
        canTwist: phase === 'scene' && active,
        canFoul: phase === 'scene' && active,
        canVote: phase === 'vote' && active && voters(state).includes(n),
        vote: round && Object.prototype.hasOwnProperty.call(round.votes, n) ? round.votes[n] : null,
        voteTargets: phase === 'vote' && voters(state).includes(n) ? targets(state, n) : [],
        canNext: phase === 'result' && active,
        canControl: active,
      };
      wl.me = me;
    }
    return { game: 'wordlimit', playerNum: n, name: seat(state, n)?.name || null, wl };
  }

  return { CONFIG, CONTENT, TIMED, create, apply, view, standings, parseSettings, defaultSettings, ladder, rng, list, elapsed, voters, targets };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WORD_LIMIT_ENGINE;
