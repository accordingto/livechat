/* CUT! — pure authoritative rules. No DOM, Firebase, audio, or running timers.
 * Clients see view(), never the private speaking deadline or fairness history.
 * Every phase advances once, using the command's captured time and seed.
 */
var CUT_ENGINE = (() => {
  'use strict';
  const config = typeof CUT_CONFIG !== 'undefined' ? CUT_CONFIG : require('./cut-config.js');
  const random = typeof CUT_RANDOM !== 'undefined' ? CUT_RANDOM : require('./cut-random.js');
  const topics = typeof CUT_TOPICS !== 'undefined' ? CUT_TOPICS : require('./cut-topics.js');
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const active = state => list(state.roster).filter(player => player.active !== false);
  const isActive = (state, number) => active(state).some(player => player.playerNum === number);
  const publicTimedPhases = ['countdown', 'handoff'];
  const waitingCut = state => state.phase === 'cut';
  const validSpeed = speed => speed === 'custom' || Object.hasOwn(config.speeds, speed);
  const validTiming = (min, max) => Number.isInteger(min) && Number.isInteger(max) &&
    min >= config.customTiming.minSeconds && max <= config.customTiming.maxSeconds && min <= max;
  function phase(state, name, now, durationMs) {
    state.phase = name;
    state.turnId++;
    state.lastChangeAt = now;
    state.deadline = null;
    state.phaseUntil = publicTimedPhases.includes(name) && Number.isFinite(durationMs) ? now + durationMs : null;
  }
  function chooseSpeaker(state, excluded, rng) {
    return random.speaker(state.roster, excluded, state.stats, state.recent, state.speakerSequence, rng);
  }
  function chooseTopic(state, rng) {
    const category = state.category === 'mixed' ? (rng() < config.realTopicWeight ? 'real' : 'absurd') : state.category;
    const pool = topics.items.filter(topic => topic.category === category);
    const unseen = pool.filter(topic => !state.topicHistory.includes(topic.id));
    const choices = unseen.length ? unseen : pool;
    const chosen = choices[Math.floor(rng() * choices.length)];
    state.topic = copy(chosen);
    state.topicHistory = [...state.topicHistory, chosen.id].slice(-config.topicHistorySize);
  }
  function prepare(state, playerNum, now, name = 'ready', remainingMs = null, countOnGo = true) {
    state.speaker = playerNum;
    state.nextSpeaker = name === 'handoff' ? playerNum : null;
    state.pendingDurationMs = remainingMs;
    state.countOnGo = countOnGo;
    if (countOnGo) state.speakingDurationMs = null;
    state.pause = null;
    state.pauseReason = '';
    phase(state, name, now, name === 'countdown' ? config.countdownMs : config.handoffMs);
  }
  function beginSpeaking(state, now, rng) {
    const resumed = Number.isFinite(state.pendingDurationMs);
    const durationMs = resumed ? Math.max(0, state.pendingDurationMs) : state.speed === 'custom'
      ? Math.round((state.customMinSeconds + rng() * (state.customMaxSeconds - state.customMinSeconds)) * 1000)
      : random.duration(state.speed, state.previousDurationMs, rng);
    if (state.countOnGo !== false) {
      state.speakerSequence++;
      const record = state.stats[state.speaker] || { count: 0, lastTurn: 0 };
      state.stats[state.speaker] = { count: (Number(record.count) || 0) + 1, lastTurn: state.speakerSequence };
      state.recent = [state.speaker, ...state.recent.filter(number => number !== state.speaker)].slice(0, config.fairness.recentWeights.length);
    }
    if (!resumed) state.speakingDurationMs = durationMs;
    state.pendingDurationMs = null;
    state.countOnGo = false;
    state.nextSpeaker = null;
    phase(state, 'speaking', now);
    state.deadline = now + durationMs;
  }
  function startRound(state, now, rng) {
    state.round++;
    state.cutsCompleted = 0;
    state.targetCuts = null;
    state.cutEvent = null;
    chooseTopic(state, rng);
    const speaker = chooseSpeaker(state, state.previousSpeaker, rng);
    prepare(state, speaker, now, 'ready');
  }
  function pause(state, now, reason) {
    if (state.phase !== 'paused') {
      const due = state.phase === 'speaking' ? state.deadline : state.phaseUntil;
      state.pause = {
        phase: state.phase, remainingMs: Math.max(0, Number(due) - now),
        speaker: state.speaker, nextSpeaker: state.nextSpeaker,
        pendingDurationMs: Number.isFinite(state.pendingDurationMs) ? state.pendingDurationMs : null,
        countOnGo: state.countOnGo !== false,
        refreshSpeaker: !isActive(state, state.speaker) && state.phase !== 'break',
      };
      phase(state, 'paused', now);
    }
    state.pauseReason = reason;
  }
  function resume(state, now, rng) {
    const saved = state.pause || { phase: 'countdown', refreshSpeaker: true };
    if (saved.phase === 'ready' || saved.phase === 'setup') {
      const replace = saved.refreshSpeaker || !isActive(state, saved.speaker);
      const speaker = replace ? chooseSpeaker(state, saved.speaker, rng) : saved.speaker;
      prepare(state, speaker, now, saved.phase, null, replace || saved.countOnGo !== false);
      return;
    }
    if (saved.phase === 'break') {
      state.pause = null; state.pauseReason = ''; phase(state, 'break', now); return;
    }
    if (saved.phase === 'cut') {
      state.speaker = saved.speaker;
      state.nextSpeaker = isActive(state, saved.nextSpeaker) ? saved.nextSpeaker : chooseSpeaker(state, saved.speaker, rng);
      if (state.cutEvent) { state.cutEvent.to = state.nextSpeaker; state.cutEvent.final = false; }
      state.pendingDurationMs = null; state.pause = null; state.pauseReason = '';
      phase(state, 'cut', now);
      return;
    }
    if (saved.refreshSpeaker || !isActive(state, saved.speaker) || (saved.phase === 'cut' && saved.nextSpeaker != null && !isActive(state, saved.nextSpeaker))) {
      const oldSpeaker = saved.speaker;
      const next = chooseSpeaker(state, oldSpeaker, rng);
      state.previousSpeaker = oldSpeaker;
      prepare(state, next, now, 'ready');
      return;
    }
    state.speaker = saved.speaker;
    state.nextSpeaker = saved.nextSpeaker ?? null;
    state.pause = null;
    state.pauseReason = '';
    if (saved.phase === 'speaking') {
      // A full, visible prep gives everyone time to return. Only the hidden
      // speaking time is frozen; this never counts as another speaking turn.
      prepare(state, saved.speaker, now, 'handoff', saved.remainingMs, false);
    } else {
      state.pendingDurationMs = saved.pendingDurationMs ?? null;
      state.countOnGo = saved.countOnGo !== false;
      phase(state, saved.phase, now, saved.remainingMs);
    }
  }
  function upgrade(current, now) {
    if (!current || current.version !== 1 || !Number.isFinite(now)) return current;
    const standardHandoff = saved => saved?.phase === 'handoff' && saved.countOnGo !== false && !Number.isFinite(saved.pendingDurationMs);
    const oldRules = current.rulesVersion !== 2 || current.targetCuts !== null;
    const legacyCut = waitingCut(current) && Number.isFinite(current.phaseUntil);
    const legacyHandoff = standardHandoff(current);
    const legacyPausedCut = current.phase === 'paused' && current.pause?.phase === 'cut' && Number(current.pause.remainingMs) > 0;
    const legacyPausedHandoff = current.phase === 'paused' && standardHandoff(current.pause);
    const missingTiming = !validTiming(current.customMinSeconds, current.customMaxSeconds);
    if (!oldRules && !legacyCut && !legacyHandoff && !legacyPausedCut && !legacyPausedHandoff && !missingTiming) return current;
    const state = copy(current);
    state.roster = list(state.roster); state.recent = list(state.recent);
    state.rulesVersion = 2; state.targetCuts = null;
    if (missingTiming) {
      state.customMinSeconds = config.customTiming.defaultMinSeconds;
      state.customMaxSeconds = config.customTiming.defaultMaxSeconds;
    }
    if (legacyHandoff || legacyPausedHandoff) {
      const saved = legacyPausedHandoff ? state.pause : state;
      const nextSpeaker = saved.nextSpeaker ?? saved.speaker ?? null;
      const previousSpeaker = state.cutEvent?.from ?? state.previousSpeaker ?? null;
      state.speaker = previousSpeaker; state.nextSpeaker = nextSpeaker;
      state.pendingDurationMs = null; state.countOnGo = true; state.speakingDurationMs = null;
      state.cutEvent = state.cutEvent ? { ...state.cutEvent, to: nextSpeaker, final: false } : {
        id: state.sessionId + ':' + state.turnId + ':upgrade', turnId: state.turnId,
        at: state.lastChangeAt, from: previousSpeaker, to: nextSpeaker, final: false,
      };
      if (legacyPausedHandoff) state.pause = { ...state.pause, phase: 'cut', speaker: previousSpeaker, nextSpeaker,
        remainingMs: 0, pendingDurationMs: null, countOnGo: true };
      else state.phase = 'cut';
    }
    const pausedCut = state.phase === 'paused' && state.pause?.phase === 'cut';
    if (waitingCut(state) || pausedCut) {
      const saved = pausedCut ? state.pause : state;
      const nextSpeaker = isActive(state, saved.nextSpeaker) ? saved.nextSpeaker :
        chooseSpeaker(state, saved.speaker, random.create(state.sessionId + ':' + state.turnId + ':unlimited'));
      state.nextSpeaker = nextSpeaker;
      if (state.cutEvent) { state.cutEvent.to = nextSpeaker; state.cutEvent.final = false; }
      state.pendingDurationMs = null; state.phaseUntil = null; state.deadline = null;
      if (pausedCut) state.pause = { ...state.pause, nextSpeaker, remainingMs: 0, pendingDurationMs: null };
    }
    if (state.phase === 'break' || state.phase === 'stopped') state.cutEvent = null;
    state.turnId++; state.lastChangeAt = now;
    return state;
  }
  function create({ id, roster, speed = 'normal', category = 'mixed',
    customMinSeconds = config.customTiming.defaultMinSeconds, customMaxSeconds = config.customTiming.defaultMaxSeconds, now, seed } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(roster) || roster.length < config.minPlayers || roster.length > config.maxPlayers) throw new Error('invalid_setup');
    if (roster.some(player => !player || !Number.isInteger(player.playerNum) || player.playerNum < 1) || new Set(roster.map(player => player.playerNum)).size !== roster.length) throw new Error('invalid_roster');
    if (!validSpeed(speed) || !topics.categories.includes(category) || !validTiming(customMinSeconds, customMaxSeconds)) throw new Error('invalid_options');
    const state = {
      version: 1, rulesVersion: 2, sessionId: String(id), turnId: 0,
      speed, category, customMinSeconds, customMaxSeconds,
      roster: roster.map(player => ({ playerNum: player.playerNum, name: String(player.name || '').trim().slice(0, 80), active: player.active !== false })),
      phase: 'ready', phaseUntil: null, deadline: null, lastChangeAt: now,
      speaker: null, nextSpeaker: null, previousSpeaker: null,
      round: 0, cutsCompleted: 0, targetCuts: null, cutEvent: null,
      topic: null, topicHistory: [], stats: {}, recent: [], speakerSequence: 0,
      previousDurationMs: 0, speakingDurationMs: null, pendingDurationMs: null, countOnGo: true,
      pause: null, pauseReason: '', seen: {}, replies: {},
    };
    if (active(state).length < config.minPlayers) throw new Error('not_enough_players');
    startRound(state, now, random.create(seed));
    return state;
  }
  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor);
    if (actor !== 0 && !list(current.roster).some(player => player.playerNum === actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const host = actor === 0;
    // Idle ticks and ticks already consumed by another transaction perform no
    // write. On reconnection, one live phase starts now; missed CUTs do not replay.
    if (input.type === 'tick' && host) {
      // A saved v1 non-final CUT may still carry its old automatic deadline.
      // It now waits for a manual handoff, without committing idle tick writes.
      if (waitingCut(current)) return current;
      const due = current.phase === 'speaking' ? current.deadline : current.phaseUntil;
      if (input.turnId !== current.turnId || !Number.isFinite(input.now) || !['speaking', ...publicTimedPhases].includes(current.phase) || !Number.isFinite(due) || input.now < due) return current;
    }
    const state = copy(current);
    state.roster = list(state.roster);
    state.recent = list(state.recent);
    state.topicHistory = list(state.topicHistory);
    state.stats = state.stats || {};
    state.seen = state.seen || {};
    state.replies = state.replies || {};
    const now = input.now;
    const rng = random.create(input.seed);
    let error = '';
    const sharedManager = state.sharedControls === true && isActive(state, actor) &&
      ['begin', 'next', 'endTopic', 'pause', 'resume', 'exclude'].includes(input.type);
    const selfReturn = state.sharedControls === true && input.type === 'exclude' &&
      Number(input.playerNum) === actor && input.active === true;
    if (!host && !sharedManager && !selfReturn && (input.type !== 'begin' || !isActive(state, actor))) error = 'not_available';
    else if (input.turnId !== state.turnId) error = 'stale_turn';
    else if (!Number.isFinite(now) || now < state.lastChangeAt) error = 'invalid_time';
    else switch (input.type) {
      case 'begin':
        if (state.phase !== 'ready' && !waitingCut(state)) error = 'not_available';
        else if (active(state).length < config.minPlayers) error = 'not_enough_players';
        else if (waitingCut(state)) {
          if (!isActive(state, state.nextSpeaker)) error = 'not_available';
          else {
            state.speaker = state.nextSpeaker;
            state.pendingDurationMs = null; state.countOnGo = true;
            beginSpeaking(state, now, rng);
          }
        }
        else {
          if (!isActive(state, state.speaker)) {
            state.speaker = chooseSpeaker(state, state.previousSpeaker, rng);
            state.countOnGo = true;
          }
          phase(state, 'countdown', now, config.countdownMs);
        }
        break;
      case 'settings': {
        const pausedCut = state.phase === 'paused' && state.pause?.phase === 'cut';
        const intendedSpeaker = waitingCut(state) ? state.nextSpeaker : pausedCut ? state.pause.nextSpeaker : state.speaker;
        const speaker = isActive(state, intendedSpeaker) ? intendedSpeaker :
          chooseSpeaker(state, state.previousSpeaker, rng) ?? active(state)[0]?.playerNum ?? null;
        const endedTurn = state.phase === 'cut' || (state.phase === 'paused' && state.pause?.phase === 'cut');
        const countOnGo = endedTurn || speaker !== state.speaker || state.countOnGo !== false;
        state.cutEvent = null;
        state.speakingDurationMs = null;
        prepare(state, speaker, now, 'setup', null, countOnGo);
        break;
      }
      case 'configure': {
        const min = input.customMinSeconds === undefined ? state.customMinSeconds : input.customMinSeconds;
        const max = input.customMaxSeconds === undefined ? state.customMaxSeconds : input.customMaxSeconds;
        if (state.phase !== 'setup') error = 'not_available';
        else if ((input.speed != null && !validSpeed(input.speed)) ||
          (input.category != null && !topics.categories.includes(input.category)) || !validTiming(min, max)) error = 'invalid_options';
        else {
          if (input.speed != null) state.speed = input.speed;
          if (input.category != null) state.category = input.category;
          state.customMinSeconds = min; state.customMaxSeconds = max;
          phase(state, 'ready', now);
        }
        break;
      }
      case 'cancelSettings':
        if (state.phase !== 'setup') error = 'not_available';
        else phase(state, 'ready', now);
        break;
      case 'tick':
        if (state.phase === 'countdown' || state.phase === 'handoff') {
          if (active(state).length < config.minPlayers) pause(state, now, 'not_enough_players');
          else if (!isActive(state, state.speaker)) prepare(state, chooseSpeaker(state, state.speaker, rng), now, 'ready');
          else beginSpeaking(state, now, rng);
        } else if (state.phase === 'speaking') {
          state.previousDurationMs = state.speakingDurationMs;
          state.previousSpeaker = state.speaker;
          state.cutsCompleted++;
          state.nextSpeaker = chooseSpeaker(state, state.speaker, rng);
          state.cutEvent = { id: state.sessionId + ':' + state.turnId, turnId: state.turnId, at: now,
            from: state.speaker, to: state.nextSpeaker, final: false };
          phase(state, 'cut', now);
        }
        break;
      case 'endTopic':
        if (!state.topic || ['break', 'stopped', 'finished'].includes(state.phase)) error = 'not_available';
        else {
          if (state.countOnGo === false && state.speaker != null) state.previousSpeaker = state.speaker;
          state.speaker = null; state.nextSpeaker = null; state.pause = null; state.pauseReason = '';
          state.pendingDurationMs = null; state.speakingDurationMs = null; state.cutEvent = null;
          phase(state, 'break', now);
        }
        break;
      case 'next':
        if (state.phase !== 'break') error = 'not_available';
        else if (active(state).length < config.minPlayers) error = 'not_enough_players';
        else startRound(state, now, rng);
        break;
      case 'pause':
        if (state.phase === 'paused' || state.phase === 'stopped') error = 'not_available';
        else pause(state, now, 'host');
        break;
      case 'resume':
        if (state.phase !== 'paused') error = 'not_available';
        else if (active(state).length < config.minPlayers) error = 'not_enough_players';
        else resume(state, now, rng);
        break;
      case 'stop':
        if (state.phase === 'stopped') error = 'not_available';
        else {
          state.speaker = null; state.nextSpeaker = null; state.pause = null;
          state.pendingDurationMs = null; state.pauseReason = '';
          phase(state, 'stopped', now);
        }
        break;
      case 'exclude': {
        const player = state.roster.find(candidate => candidate.playerNum === Number(input.playerNum));
        if (!player || typeof input.active !== 'boolean' || state.phase === 'stopped') { error = 'invalid_player'; break; }
        if (player.active === input.active) break;
        player.active = input.active;
        if (active(state).length < config.minPlayers) {
          pause(state, now, 'not_enough_players');
          if (!isActive(state, state.pause?.speaker)) state.pause.refreshSpeaker = true;
        } else if (state.phase === 'paused') {
          if (!isActive(state, state.pause?.speaker) || (state.pause?.phase === 'cut' && state.pause.nextSpeaker != null && !isActive(state, state.pause.nextSpeaker))) state.pause.refreshSpeaker = true;
          state.turnId++; state.lastChangeAt = now;
        } else if ((state.phase === 'ready' || state.phase === 'setup') && !isActive(state, state.speaker)) {
          state.previousSpeaker = state.speaker;
          prepare(state, chooseSpeaker(state, state.speaker, rng), now, state.phase);
        } else if (waitingCut(state)) {
          if (!isActive(state, state.nextSpeaker)) {
            state.nextSpeaker = chooseSpeaker(state, state.speaker, rng);
            if (state.cutEvent) state.cutEvent.to = state.nextSpeaker;
          }
          phase(state, 'cut', now);
        } else if (['speaking', 'countdown', 'handoff'].includes(state.phase) && !isActive(state, state.speaker)) {
          const oldSpeaker = state.speaker;
          state.previousSpeaker = oldSpeaker;
          prepare(state, chooseSpeaker(state, oldSpeaker, rng), now, 'ready');
        } else { state.turnId++; state.lastChangeAt = now; }
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
    const roster = list(state.roster).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active !== false }));
    const mine = roster.find(player => player.playerNum === playerNum);
    const cut = {
      version: 1, rulesVersion: state.rulesVersion || 1, sessionId: state.sessionId, turnId: state.turnId,
      speed: state.speed, category: state.category, phase: state.phase,
      customMinSeconds: state.customMinSeconds ?? config.customTiming.defaultMinSeconds,
      customMaxSeconds: state.customMaxSeconds ?? config.customTiming.defaultMaxSeconds,
      round: state.round, cutsCompleted: state.cutsCompleted, targetCuts: state.targetCuts,
      topic: copy(state.topic), speaker: state.speaker ?? null,
      previousSpeaker: state.previousSpeaker ?? null, roster,
      cutEvent: state.cutEvent ? copy(state.cutEvent) : null,
      pauseReason: state.pauseReason || '', reply: (state.replies || {})[playerNum] || null,
      ...(state.sharedControls === true ? { sharedControls: true, canManage: mine?.active === true } : {}),
      canEndTopic: !!state.topic && !['break', 'stopped', 'finished'].includes(state.phase) &&
        (playerNum === 0 || (state.sharedControls === true && mine?.active === true)),
      canBegin: (state.phase === 'ready' || (waitingCut(state) && isActive(state, state.nextSpeaker))) &&
        active(state).length >= config.minPlayers && (playerNum === 0 || mine?.active === true),
    };
    if (publicTimedPhases.includes(state.phase) && !waitingCut(state)) cut.phaseUntil = state.phaseUntil;
    if (state.phase === 'cut' || state.phase === 'handoff') cut.nextSpeaker = state.nextSpeaker ?? null;
    return { game: 'cut', playerNum, name: mine?.name || null, cut };
  }
  return { create, apply, view, upgrade, list };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_ENGINE;
