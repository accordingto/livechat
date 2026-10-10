/* CUT! — pure authoritative rules. No DOM, Firebase, audio, or running timers.
 * Clients see view(), never the private speaking deadline or fairness history.
 * Every phase advances once, using the command's captured time and seed.
 */
var CUT_ENGINE = (() => {
  'use strict';
  const config = typeof CUT_CONFIG !== 'undefined' ? CUT_CONFIG : require('./cut-config.js');
  const random = typeof CUT_RANDOM !== 'undefined' ? CUT_RANDOM : require('./cut-random.js');
  const topics = typeof CUT_TOPICS !== 'undefined' ? CUT_TOPICS : require('./cut-topics.js');
  const jumpTopics = typeof CUT_JUMP_TOPICS !== 'undefined' ? CUT_JUMP_TOPICS : require('./cut-jump-topics.js');
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const active = state => list(state.roster).filter(player => player.active !== false && player.pending !== true);
  const isActive = (state, number) => active(state).some(player => player.playerNum === number);
  // 'back' belongs to Mode 2 only: the short beat that returns to the Main Speaker.
  const publicTimedPhases = ['countdown', 'handoff', 'back'];
  const waitingCut = state => state.phase === 'cut';
  // Mode 1 (classic) hands the sentence to the next player. Mode 2 (jump) keeps one
  // Main Speaker for the round. A state saved before modes existed is classic.
  const jump = state => state?.mode === 'jump';
  const validMode = mode => mode === 'classic' || mode === 'jump';
  const validMainMinutes = minutes => config.jump.mainMinutes.options.includes(minutes);
  const validSpeed = speed => speed === 'custom' || Object.hasOwn(config.speeds, speed);
  const validTiming = (min, max) => Number.isInteger(min) && Number.isInteger(max) &&
    min >= config.customTiming.minSeconds && max <= config.customTiming.maxSeconds && min <= max;
  const validTopicMinutes = minutes => Number.isInteger(minutes) &&
    minutes >= config.topicTiming.minMinutes && minutes <= config.topicTiming.maxMinutes;
  const topicRunning = name => name === 'speaking' || name === 'cut';
  const validTopicClock = clock => clock && !Array.isArray(clock) &&
    Number.isFinite(clock.durationMs) && clock.durationMs > 0 &&
    Number.isFinite(clock.elapsedMs) && clock.elapsedMs >= 0 &&
    (clock.runningSince == null || Number.isFinite(clock.runningSince));
  const newTopicClock = minutes => ({ durationMs: minutes * 60000, elapsedMs: 0, runningSince: null });
  function topicClock(state) {
    if (!validTopicMinutes(state.topicMinutes)) state.topicMinutes = config.topicTiming.defaultMinutes;
    if (!validTopicClock(state.topicClock)) state.topicClock = newTopicClock(state.topicMinutes);
    state.topicClock.durationMs = state.topicMinutes * 60000;
    return state.topicClock;
  }
  function moveTopicClock(state, name, now) {
    const clock = topicClock(state);
    if (topicRunning(name)) {
      // Keep one anchor throughout speaking and manual CUT handoffs. Reconnects
      // and repeated phase updates must not restart or double-count this span.
      if (clock.runningSince == null) clock.runningSince = now;
    } else if (Number.isFinite(clock.runningSince)) {
      // Do not cap accumulated time: extending a topic must retain time spent
      // talking after its previous reminder reached zero.
      clock.elapsedMs += Math.max(0, now - clock.runningSince);
      clock.runningSince = null;
    }
  }
  function mainClock(state) {
    if (!validMainMinutes(state.mainMinutes)) state.mainMinutes = config.jump.mainMinutes.default;
    if (!validTopicClock(state.mainClock)) state.mainClock = newTopicClock(state.mainMinutes);
    state.mainClock.durationMs = state.mainMinutes * 60000;
    return state.mainClock;
  }
  function moveMainClock(state, name, now) {
    const clock = mainClock(state);
    // Only the Main Speaker's own talking time counts. An interruption, the
    // beat back, Pause and settings all leave this clock frozen.
    if (name === 'speaking') {
      if (clock.runningSince == null) clock.runningSince = now;
    } else if (Number.isFinite(clock.runningSince)) {
      clock.elapsedMs += Math.max(0, now - clock.runningSince);
      clock.runningSince = null;
    }
  }
  function mainRemaining(state, now) {
    const clock = mainClock(state);
    return clock.durationMs - clock.elapsedMs - (Number.isFinite(clock.runningSince) ? Math.max(0, now - clock.runningSince) : 0);
  }
  function phase(state, name, now, durationMs) {
    if (jump(state)) moveMainClock(state, name, now); else moveTopicClock(state, name, now);
    state.phase = name;
    state.turnId++;
    state.lastChangeAt = now;
    state.deadline = null;
    state.phaseUntil = publicTimedPhases.includes(name) && Number.isFinite(durationMs) ? now + durationMs : null;
  }
  function chooseSpeaker(state, excluded, rng) {
    return random.speaker(list(state.roster).filter(p => p.pending !== true), excluded, state.stats, state.recent, state.speakerSequence, rng);
  }
  function chooseTopic(state, rng) {
    const available = topics.categories.filter(category => category !== 'mixed' && topics.items.some(topic => topic.category === category));
    const category = state.category === 'mixed'
      ? random.weighted(available, category => config.mixedTopicWeights[category] || 0, rng)
      : state.category;
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
    if (jump(state)) return startJumpRound(state, now, rng);
    state.topicClock = newTopicClock(state.topicMinutes);
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
      // A full, visible prep gives everyone time to return. Both clocks stay
      // frozen until GO; this never counts as another speaking turn.
      prepare(state, saved.speaker, now, 'handoff', saved.remainingMs, false);
    } else {
      state.pendingDurationMs = saved.pendingDurationMs ?? null;
      state.countOnGo = saved.countOnGo !== false;
      phase(state, saved.phase, now, saved.remainingMs);
    }
  }
  /* Mode 2 · Jump In. One Main Speaker (state.speaker) owns the whole round:
   *   ready → Begin → countdown → speaking ⇄ CUT → interrupt → DONE/SKIP → back
   *   … until the Main Speaker's clock runs out → break → Next topic → ready.
   * state.deadline stays private: it is the next CUT, or the end of the round. */
  function jumpLedger(state) {
    state.mainStats = state.mainStats || {};
    state.interruptStats = state.interruptStats || {};
    state.interruptRecent = list(state.interruptRecent);
    state.interruptSequence = Number(state.interruptSequence) || 0;
    state.jumpTopicHistory = list(state.jumpTopicHistory);
  }
  const seats = state => list(state.roster).filter(player => player.pending !== true);
  const chooseMain = (state, excluded, rng) => random.mainSpeaker(seats(state), excluded, state.mainStats, rng);
  // Mode 1's balanced draw on a ledger of its own, and never the Main Speaker.
  const chooseInterrupter = (state, rng) => random.speaker(seats(state), state.speaker, state.interruptStats, state.interruptRecent, state.interruptSequence, rng);
  function chooseJumpTopic(state, rng) {
    const fresh = jumpTopics.items.filter(topic => !state.jumpTopicHistory.includes(topic.id));
    const bank = fresh.length ? fresh : jumpTopics.items;
    const kinds = jumpTopics.categories.filter(category => bank.some(topic => topic.category === category));
    const last = state.topic?.category;
    const category = random.weighted(kinds, kind => (config.jump.topicWeights[kind] || 0) * (kind === last ? config.jump.repeatedCategoryWeight : 1), rng);
    const pool = bank.filter(topic => topic.category === category);
    const chosen = pool[Math.floor(rng() * pool.length)];
    state.topic = copy(chosen);
    state.jumpTopicHistory = [...state.jumpTopicHistory, chosen.id].slice(-config.jump.topicHistorySize);
  }
  // Whoever is seated as Main Speaker gets a full round that has not been counted yet.
  function seatMain(state, playerNum, now, name) {
    state.speaker = playerNum; state.nextSpeaker = null; state.interrupter = null; state.cutEvent = null;
    state.pendingDurationMs = null; state.speakingDurationMs = null; state.previousDurationMs = 0;
    state.countOnGo = true; state.lastStretch = false; state.roundEnd = null;
    state.pause = null; state.pauseReason = ''; state.mainClock = null;
    phase(state, name, now);
  }
  function startJumpRound(state, now, rng) {
    jumpLedger(state);
    state.round++;
    state.cutsCompleted = 0;
    state.targetCuts = null;
    chooseJumpTopic(state, rng);
    seatMain(state, chooseMain(state, state.previousSpeaker, rng), now, 'ready');
  }
  function endJumpRound(state, now, reason) {
    if (state.speaker != null) state.previousSpeaker = state.speaker;
    state.roundEnd = reason;
    state.speaker = null; state.nextSpeaker = null; state.interrupter = null; state.cutEvent = null;
    state.pause = null; state.pauseReason = ''; state.pendingDurationMs = null; state.speakingDurationMs = null;
    state.lastStretch = false;
    phase(state, 'break', now);
  }
  // GO, and every return to the Main Speaker: the clock runs and a new private deadline is set.
  function talk(state, now, rng) {
    if (active(state).length < config.minPlayers) return pause(state, now, 'not_enough_players');
    if (!isActive(state, state.speaker)) return seatMain(state, chooseMain(state, state.speaker, rng), now, 'ready');
    const remaining = mainRemaining(state, now);
    if (remaining <= 0) return endJumpRound(state, now, 'time');
    const first = state.countOnGo !== false;
    if (first) state.mainStats[state.speaker] = { count: (Number(state.mainStats[state.speaker]?.count) || 0) + 1, lastRound: state.round };
    // A paused turn keeps the CUT it was already heading for, instead of drawing again.
    const kept = Number.isFinite(state.pendingDurationMs) ? Math.max(config.jump.resumeQuietSeconds * 1000, state.pendingDurationMs) : null;
    const gap = kept ?? random.interval(first, state.previousDurationMs, rng);
    if (kept == null) state.speakingDurationMs = gap;
    state.pendingDurationMs = null;
    state.countOnGo = false;
    // No CUT lands in the last few seconds: the Main Speaker finishes the round instead.
    state.lastStretch = remaining - gap < config.jump.quietEndSeconds * 1000;
    phase(state, 'speaking', now);
    state.deadline = now + (state.lastStretch ? remaining : gap);
  }
  // Being chosen counts even after SKIP, so nobody is asked again and again.
  function interrupt(state, playerNum) {
    state.interruptSequence++;
    state.interruptStats[playerNum] = { count: (Number(state.interruptStats[playerNum]?.count) || 0) + 1, lastTurn: state.interruptSequence };
    state.interruptRecent = [playerNum, ...state.interruptRecent.filter(number => number !== playerNum)].slice(0, config.fairness.recentWeights.length);
    state.interrupter = playerNum;
  }
  function cutIn(state, now, rng) {
    if (state.lastStretch || mainRemaining(state, now) <= 0) return endJumpRound(state, now, 'time');
    const chosen = chooseInterrupter(state, rng);
    if (chosen == null) return pause(state, now, 'not_enough_players');
    interrupt(state, chosen);
    state.previousDurationMs = state.speakingDurationMs;
    state.cutsCompleted++;
    state.cutEvent = { id: state.sessionId + ':' + state.turnId, turnId: state.turnId, at: now, from: state.speaker, to: chosen, final: false };
    // No deadline and no phaseUntil: the interruption lasts until DONE or SKIP.
    phase(state, 'interrupt', now);
  }
  function replaceInterrupter(state, now, rng) {
    const chosen = chooseInterrupter(state, rng);
    if (chosen == null) return backToMain(state, now);
    interrupt(state, chosen);
    if (state.cutEvent) state.cutEvent.to = chosen;
    phase(state, 'interrupt', now);
  }
  function backToMain(state, now, pendingMs = null) {
    state.interrupter = null; state.cutEvent = null;
    state.pendingDurationMs = Number.isFinite(pendingMs) ? pendingMs : null;
    phase(state, 'back', now, config.jump.backMs);
  }
  function resumeJump(state, now, rng) {
    const saved = state.pause || { phase: 'ready' };
    state.pause = null; state.pauseReason = '';
    if (saved.phase === 'break') return phase(state, 'break', now);
    const waiting = ['ready', 'setup', 'countdown'].includes(saved.phase);
    if (!isActive(state, state.speaker)) {
      // The Main Speaker left during the pause.
      return waiting ? seatMain(state, chooseMain(state, state.speaker, rng), now, saved.phase === 'setup' ? 'setup' : 'ready')
        : endJumpRound(state, now, 'none');
    }
    if (saved.phase === 'countdown') return phase(state, 'countdown', now, config.countdownMs);
    if (waiting) return phase(state, saved.phase, now);
    if (saved.phase === 'interrupt') return isActive(state, state.interrupter) ? phase(state, 'interrupt', now) : replaceInterrupter(state, now, rng);
    // Paused while talking: the same beat brings everyone back before the clock runs.
    backToMain(state, now, saved.phase === 'speaking' ? saved.remainingMs : saved.pendingDurationMs);
  }
  function leaveSetup(state, now, rng) {
    if (state.roundEnd) return phase(state, 'break', now);
    if (state.speaker == null) return startJumpRound(state, now, rng);
    if (!isActive(state, state.speaker)) return seatMain(state, chooseMain(state, state.speaker, rng), now, 'ready');
    phase(state, 'ready', now);
  }
  // A seat that joins or returns starts level with the others, not far behind them.
  function catchUp(state, playerNum) {
    const others = active(state).filter(player => player.playerNum !== playerNum);
    if (!others.length) return;
    const least = stats => Math.min(...others.map(player => Number(stats[player.playerNum]?.count) || 0));
    const own = stats => Number(stats[playerNum]?.count) || 0;
    if (own(state.mainStats) < least(state.mainStats)) state.mainStats[playerNum] = { count: least(state.mainStats), lastRound: state.round };
    if (own(state.interruptStats) < least(state.interruptStats)) state.interruptStats[playerNum] = { count: least(state.interruptStats), lastTurn: state.interruptSequence };
  }
  const settingsOf = state => ({ mode: jump(state) ? 'jump' : 'classic', speed: state.speed, category: state.category,
    customMinSeconds: state.customMinSeconds, customMaxSeconds: state.customMaxSeconds, topicMinutes: state.topicMinutes,
    mainMinutes: validMainMinutes(state.mainMinutes) ? state.mainMinutes : config.jump.mainMinutes.default });
  function settingsFrom(state, input) {
    const saved = settingsOf(state), pick = key => input[key] === undefined ? saved[key] : input[key];
    const next = { speed: input.speed ?? saved.speed, category: input.category ?? saved.category,
      customMinSeconds: pick('customMinSeconds'), customMaxSeconds: pick('customMaxSeconds'),
      topicMinutes: pick('topicMinutes'), mainMinutes: pick('mainMinutes') };
    return validSpeed(next.speed) && topics.categories.includes(next.category) && validTiming(next.customMinSeconds, next.customMaxSeconds) &&
      validTopicMinutes(next.topicMinutes) && validMainMinutes(next.mainMinutes) ? next : null;
  }
  // The two pools suit different play, so a new mode always opens its own topic.
  // Nothing of the old mode keeps running: no deadline, interruption or paused turn.
  function switchMode(state, input, now, rng) {
    const options = settingsFrom(state, input);
    if (state.phase !== 'setup') return 'not_available';
    if (!validMode(input.mode) || !options) return 'invalid_options';
    Object.assign(state, options, { mode: input.mode });
    state.nextSpeaker = null; state.interrupter = null; state.cutEvent = null; state.roundEnd = null; state.lastStretch = false;
    state.pause = null; state.pauseReason = ''; state.pendingDurationMs = null; state.speakingDurationMs = null;
    startRound(state, now, rng);
    return '';
  }
  function applyJump(state, input, now, rng, current) {
    jumpLedger(state);
    switch (input.type) {
      case 'begin':
        if (state.phase !== 'ready') return 'not_available';
        if (active(state).length < config.minPlayers) return 'not_enough_players';
        if (!isActive(state, state.speaker)) seatMain(state, chooseMain(state, state.speaker, rng), now, 'ready');
        phase(state, 'countdown', now, config.countdownMs);
        return '';
      case 'tick':
        if (state.phase === 'speaking') cutIn(state, now, rng);
        else if (state.phase === 'countdown' || state.phase === 'back') talk(state, now, rng);
        return '';
      // DONE and SKIP are one step for the rules: nothing is judged, timed or scored.
      case 'done':
      case 'skip':
        if (state.phase !== 'interrupt') return 'not_available';
        backToMain(state, now);
        return '';
      case 'endTopic':
        if (!state.topic || ['break', 'stopped', 'finished'].includes(state.phase)) return 'not_available';
        endJumpRound(state, now, state.countOnGo === false ? 'ended' : 'none');
        return '';
      case 'next':
        if (state.phase !== 'break') return 'not_available';
        if (active(state).length < config.minPlayers) return 'not_enough_players';
        startJumpRound(state, now, rng);
        return '';
      case 'pause':
        if (state.phase === 'paused' || state.phase === 'stopped') return 'not_available';
        pause(state, now, 'host');
        return '';
      case 'resume':
        if (state.phase !== 'paused') return 'not_available';
        if (active(state).length < config.minPlayers) return 'not_enough_players';
        resumeJump(state, now, rng);
        return '';
      case 'settings':
        // The round freezes with its topic, Main Speaker and used time. An open interruption is dropped.
        state.interrupter = null; state.cutEvent = null; state.pendingDurationMs = null;
        state.pause = null; state.pauseReason = '';
        phase(state, 'setup', now);
        return '';
      case 'configure': {
        const options = settingsFrom(state, input);
        if (state.phase !== 'setup') return 'not_available';
        if (!options) return 'invalid_options';
        Object.assign(state, options);
        mainClock(state); // A new length keeps the time already used.
        leaveSetup(state, now, rng);
        return '';
      }
      case 'cancelSettings':
        if (state.phase !== 'setup') return 'not_available';
        leaveSetup(state, now, rng);
        return '';
      case 'restart':
        if (state.sharedControls !== true) return 'not_available';
        if (active(state).length < config.minPlayers) return 'not_enough_players';
        Object.assign(state, create({ id: state.sessionId, roster: state.roster, ...settingsOf(state), now, seed: input.seed }),
          { turnId: current.turnId + 1, seen: state.seen, replies: state.replies });
        return '';
      case 'stop':
        if (state.phase === 'stopped') return 'not_available';
        state.speaker = null; state.nextSpeaker = null; state.interrupter = null; state.cutEvent = null;
        state.pause = null; state.pendingDurationMs = null; state.pauseReason = '';
        phase(state, 'stopped', now);
        return '';
      case 'exclude': {
        const player = state.roster.find(candidate => candidate.playerNum === Number(input.playerNum));
        if (!player || typeof input.active !== 'boolean' || (state.phase === 'stopped' && state.sharedControls !== true)) return 'invalid_player';
        if (player.active === input.active) return '';
        player.active = input.active;
        if (input.active) catchUp(state, player.playerNum);
        const mainLeft = state.speaker != null && !isActive(state, state.speaker);
        if (state.phase !== 'stopped' && active(state).length < config.minPlayers) pause(state, now, 'not_enough_players');
        else if (state.phase === 'stopped' || state.phase === 'paused') { state.turnId++; state.lastChangeAt = now; }
        // Before GO the round simply passes to someone else. A round under way ends with its speaker.
        else if (mainLeft && ['ready', 'setup', 'countdown'].includes(state.phase)) seatMain(state, chooseMain(state, state.speaker, rng), now, state.phase === 'setup' ? 'setup' : 'ready');
        else if (mainLeft) endJumpRound(state, now, 'none');
        else if (state.phase === 'interrupt' && !isActive(state, state.interrupter)) replaceInterrupter(state, now, rng);
        else { state.turnId++; state.lastChangeAt = now; }
        return '';
      }
      default: return 'not_available';
    }
  }
  function upgrade(current, now) {
    if (!current || current.version !== 1 || !Number.isFinite(now)) return current;
    if (jump(current)) return current; // Legacy repairs below are for Mode 1 states only.
    const standardHandoff = saved => saved?.phase === 'handoff' && saved.countOnGo !== false && !Number.isFinite(saved.pendingDurationMs);
    const oldRules = current.rulesVersion !== 2 || current.targetCuts !== null;
    const legacyCut = waitingCut(current) && Number.isFinite(current.phaseUntil);
    const legacyHandoff = standardHandoff(current);
    const legacyPausedCut = current.phase === 'paused' && current.pause?.phase === 'cut' && Number(current.pause.remainingMs) > 0;
    const legacyPausedHandoff = current.phase === 'paused' && standardHandoff(current.pause);
    const missingTiming = !validTiming(current.customMinSeconds, current.customMaxSeconds);
    const missingTopicClock = !validTopicMinutes(current.topicMinutes) || !validTopicClock(current.topicClock) ||
      current.topicClock.durationMs !== current.topicMinutes * 60000;
    if (!oldRules && !legacyCut && !legacyHandoff && !legacyPausedCut && !legacyPausedHandoff && !missingTiming && !missingTopicClock) return current;
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
    // An old room has no trustworthy overall elapsed time. A missing clock
    // starts at this upgrade only; existing clocks retain their accumulated span.
    moveTopicClock(state, state.phase, now);
    state.turnId++; state.lastChangeAt = now;
    return state;
  }
  function create({ id, roster, speed = 'normal', category = 'mixed',
    customMinSeconds = config.customTiming.defaultMinSeconds, customMaxSeconds = config.customTiming.defaultMaxSeconds,
    topicMinutes = config.topicTiming.defaultMinutes, mode = 'classic', mainMinutes = config.jump.mainMinutes.default, now, seed } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(roster) || roster.length < config.minPlayers || roster.length > config.maxPlayers) throw new Error('invalid_setup');
    if (roster.some(player => !player || !Number.isInteger(player.playerNum) || player.playerNum < 1) || new Set(roster.map(player => player.playerNum)).size !== roster.length) throw new Error('invalid_roster');
    if (!validSpeed(speed) || !topics.categories.includes(category) || !validTiming(customMinSeconds, customMaxSeconds) || !validTopicMinutes(topicMinutes)) throw new Error('invalid_options');
    if (!validMode(mode) || !validMainMinutes(mainMinutes)) throw new Error('invalid_options');
    const state = {
      version: 1, rulesVersion: 2, sessionId: String(id), turnId: 0, mode,
      speed, category, customMinSeconds, customMaxSeconds, topicMinutes, mainMinutes,
      // Mode 2 keeps its own clock, topic history and fairness ledgers.
      mainClock: null, interrupter: null, roundEnd: null, lastStretch: false, jumpTopicHistory: [],
      mainStats: {}, interruptStats: {}, interruptRecent: [], interruptSequence: 0,
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
      ['begin', 'next', 'endTopic', 'pause', 'resume', 'exclude', 'settings', 'configure', 'cancelSettings', 'stop', 'restart', 'done', 'skip'].includes(input.type);
    const selfReturn = state.sharedControls === true && input.type === 'exclude' &&
      Number(input.playerNum) === actor && input.active === true;
    // Mode 2: whoever was asked to jump in may always hand the floor back.
    const finishing = jump(state) && (input.type === 'done' || input.type === 'skip') && actor === state.interrupter && isActive(state, actor);
    if (!host && !sharedManager && !selfReturn && !finishing && (input.type !== 'begin' || !isActive(state, actor))) error = 'not_available';
    else if (input.turnId !== state.turnId) error = 'stale_turn';
    else if (!Number.isFinite(now) || now < state.lastChangeAt) error = 'invalid_time';
    else if (input.type === 'configure' && input.mode != null && input.mode !== (jump(state) ? 'jump' : 'classic')) error = switchMode(state, input, now, rng);
    else if (jump(state)) error = applyJump(state, input, now, rng, current);
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
        const minutes = input.topicMinutes === undefined ? state.topicMinutes : input.topicMinutes;
        if (state.phase !== 'setup') error = 'not_available';
        else if ((input.speed != null && !validSpeed(input.speed)) ||
          (input.category != null && !topics.categories.includes(input.category)) || !validTiming(min, max) || !validTopicMinutes(minutes)) error = 'invalid_options';
        else {
          if (input.speed != null) state.speed = input.speed;
          if (input.category != null) state.category = input.category;
          state.customMinSeconds = min; state.customMaxSeconds = max; state.topicMinutes = minutes;
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
      case 'restart':
        if (state.sharedControls !== true) error = 'not_available';
        else if (active(state).length < config.minPlayers) error = 'not_enough_players';
        else {
          // Keep the sealed room session and dedup ledger, but advance its fence.
          // Old timers and competing pre-restart commands cannot affect the new game.
          const restarted = create({ id: state.sessionId, roster: state.roster,
            speed: state.speed, category: state.category, customMinSeconds: state.customMinSeconds,
            customMaxSeconds: state.customMaxSeconds, topicMinutes: state.topicMinutes,
            mainMinutes: settingsOf(state).mainMinutes, now, seed: input.seed });
          Object.assign(state, restarted, { turnId: current.turnId + 1,
            seen: state.seen, replies: state.replies });
        }
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
        if (!player || typeof input.active !== 'boolean' || (state.phase === 'stopped' && state.sharedControls !== true)) { error = 'invalid_player'; break; }
        if (player.active === input.active) break;
        player.active = input.active;
        if (state.phase === 'stopped') {
          // Returning seats can prepare a restart without starting a stopped game.
          state.turnId++; state.lastChangeAt = now;
        } else if (active(state).length < config.minPlayers) {
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
    if (jump(next)) { jumpLedger(next); for (const seat of added) catchUp(next, seat.playerNum); }
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
    const roster = list(state.roster).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active !== false, ...(player.pending === true ? { pending: true } : {}) }));
    const mine = roster.find(player => player.playerNum === playerNum);
    const cut = {
      version: 1, rulesVersion: state.rulesVersion || 1, sessionId: state.sessionId, turnId: state.turnId,
      speed: state.speed, category: state.category, phase: state.phase,
      customMinSeconds: state.customMinSeconds ?? config.customTiming.defaultMinSeconds,
      customMaxSeconds: state.customMaxSeconds ?? config.customTiming.defaultMaxSeconds,
      topicMinutes: validTopicMinutes(state.topicMinutes) ? state.topicMinutes : config.topicTiming.defaultMinutes,
      topicClock: validTopicClock(state.topicClock) ? {
        durationMs: state.topicClock.durationMs, elapsedMs: state.topicClock.elapsedMs,
        runningSince: state.topicClock.runningSince ?? null,
      } : newTopicClock(validTopicMinutes(state.topicMinutes) ? state.topicMinutes : config.topicTiming.defaultMinutes),
      round: state.round, cutsCompleted: state.cutsCompleted, targetCuts: state.targetCuts,
      topic: copy(state.topic), speaker: state.speaker ?? null,
      previousSpeaker: state.previousSpeaker ?? null, roster,
      cutEvent: state.cutEvent ? copy(state.cutEvent) : null,
      pauseReason: state.pauseReason || '', reply: (state.replies || {})[playerNum] || null,
      ...(state.sharedControls === true ? { sharedControls: true, canManage: mine?.active === true && mine.pending !== true } : {}),
      canEndTopic: !!state.topic && !['break', 'stopped', 'finished'].includes(state.phase) &&
        (playerNum === 0 || (state.sharedControls === true && mine?.active === true && mine.pending !== true)),
      canBegin: (state.phase === 'ready' || (waitingCut(state) && isActive(state, state.nextSpeaker))) &&
        active(state).length >= config.minPlayers && (playerNum === 0 || mine?.active === true && mine.pending !== true),
    };
    if (publicTimedPhases.includes(state.phase) && !waitingCut(state)) cut.phaseUntil = state.phaseUntil;
    if (state.phase === 'cut' || state.phase === 'handoff') cut.nextSpeaker = state.nextSpeaker ?? null;
    // Everyone may know the mode and its length. The next CUT, the drawn gaps and
    // both fairness ledgers stay private, exactly like Mode 1's speaking deadline.
    cut.mode = jump(state) ? 'jump' : 'classic';
    cut.mainMinutes = settingsOf(state).mainMinutes;
    cut.mainOptions = [...config.jump.mainMinutes.options];
    if (jump(state)) {
      cut.mainClock = validTopicClock(state.mainClock) ? { durationMs: state.mainClock.durationMs,
        elapsedMs: state.mainClock.elapsedMs, runningSince: state.mainClock.runningSince ?? null } : newTopicClock(cut.mainMinutes);
      cut.interrupter = state.phase === 'interrupt' ? state.interrupter ?? null : null;
      cut.roundEnd = state.phase === 'break' ? state.roundEnd || null : null;
      cut.canFinish = state.phase === 'interrupt' && (playerNum === 0 ||
        (mine?.active === true && mine.pending !== true && (state.sharedControls === true || playerNum === state.interrupter)));
    }
    return { game: 'cut', playerNum, name: mine?.name || null, cut };
  }
  return { create, apply, membership, view, upgrade, list };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_ENGINE;
