/* Let's Talk: deterministic conversation rules, independent of Firebase and DOM.
 * The host applies commands to one authoritative state. Player numbers, never
 * bearer tokens, may appear in projections. Randomness is supplied per command
 * so a Firebase transaction retry produces exactly the same order.
 */
var TALK_ENGINE = (() => {
  'use strict';
  const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const participants = s => list(s.roster).filter(p => p.active !== false && p.pending !== true);
  const eligible = (s, num) => participants(s).some(p => p.playerNum === num);
  const crazyPool = () => typeof TALK_CRAZY !== 'undefined' ? TALK_CRAZY.pool
    : typeof require === 'function' ? require('./talk-crazy.js').pool : [];
  const crazyEnabled = s => s?.gameMode === 'crazy' && !!s.crazy;
  const conversationMode = s => ['assigned', 'free'].includes(s?.conversationMode) ? s.conversationMode : 'random';
  const crazySource = s => ['system', 'players'].includes(s?.crazy?.source) ? s.crazy.source : 'mixed';
  const systemCrazy = s => crazyEnabled(s) && crazySource(s) !== 'players';
  const validCrazyRange = (min, max) => Number.isInteger(min) && Number.isInteger(max)
    && min >= 5 && max <= 300 && min <= max;
  function legacyCrazyRange(seconds) {
    const interval = [60, 120, 180].includes(Number(seconds)) ? Number(seconds) : 120;
    return { minSeconds: Math.round(interval * 0.8), maxSeconds: Math.round(interval * 1.2) };
  }
  function crazyRange(s) {
    if (!s?.crazy) return { minSeconds: 60, maxSeconds: 180 };
    const c = s.crazy;
    if (validCrazyRange(c.minSeconds, c.maxSeconds)) return { minSeconds: c.minSeconds, maxSeconds: c.maxSeconds };
    // Saved rooms keep their original pace and any pending private prompt.
    return legacyCrazyRange(c.intervalSeconds);
  }
  const validGameSeconds = value => Number.isInteger(value) && value >= 60 && value <= 3600;
  const validTaskSeconds = value => Number.isInteger(value) && value >= 30 && value <= 300;
  const gameSeconds = s => validGameSeconds(s?.gameSeconds) ? s.gameSeconds : 900;
  const taskSeconds = s => validTaskSeconds(s?.crazy?.taskSeconds) ? s.crazy.taskSeconds
    : validTaskSeconds(s?.crazyTaskSeconds) ? s.crazyTaskSeconds : 150;
  const pendingNums = s => crazyEnabled(s) ? participants(s).map(p => p.playerNum)
    .filter(num => s.crazy.prompts?.[num]?.status === 'pending') : [];
  function needsMigration(s) {
    if (!validGameSeconds(s?.gameSeconds) || !validTaskSeconds(s?.crazyTaskSeconds)
        || !s.scores || list(s.roster).some(p => !Number.isInteger(s.scores[p.playerNum]) || s.scores[p.playerNum] < 0)
        || !Number.isFinite(s.gameDeadline) || (s.phase === 'talking' && !(s.gameDeadline > 0))) return true;
    return crazyEnabled(s) && (s.crazy.schedulerVersion !== 2 || !validTaskSeconds(s.crazy.taskSeconds)
      || !Number.isFinite(s.crazy.nextAssignAt) || (s.phase === 'talking' && !(s.crazy.nextAssignAt > 0))
      || pendingNums(s).some(num => !Number.isFinite(s.crazy.prompts[num].expiresAt)));
  }
  function timerDue(s, now) {
    if (!s || !Number.isFinite(Number(now))) return false;
    if (needsMigration(s)) return true;
    if (s.phase === 'thinking') return Number(now) >= Number(s.deadline);
    if (s.phase !== 'talking') return false;
    if (Number(now) >= s.gameDeadline) return true;
    if (!crazyEnabled(s)) return false;
    const c = s.crazy, pending = pendingNums(s);
    if (pending.some(num => c.prompts[num].expiresAt <= Number(now))) return true;
    return !c.paused && pending.length < 2
      && (list(c.replacementFor).length > 0 || c.nextAssignAt > 0 && Number(now) >= c.nextAssignAt);
  }
  // Kept for older pages; this predicate now includes the whole game clock.
  const crazyDue = timerDue;
  function crazyRandom(seed, salt) {
    let n = ((Number(seed) >>> 0) ^ Math.imul(Number(salt) || 1, 2654435761)) >>> 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    return (n >>> 0) / 4294967296;
  }
  function crazyDelay(s, seed, salt = 1) {
    const range = crazyRange(s);
    return Math.round((range.minSeconds + crazyRandom(seed, salt) * (range.maxSeconds - range.minSeconds)) * 1000);
  }
  function scheduleCrazy(s, input) {
    if (crazyEnabled(s)) s.crazy.nextAssignAt = (Number(input.now) || 0)
      + crazyDelay(s, input.seed, (Number(s.crazy.scheduleSequence) || 0) + 1);
  }
  function migrate(s, input) {
    const now = Number(input.now) || 0;
    s.gameSeconds = gameSeconds(s); s.crazyTaskSeconds = taskSeconds(s);
    if (!Number.isFinite(s.gameDeadline) || s.phase === 'talking' && !(s.gameDeadline > 0)) {
      // Old rooms have no reliable start timestamp. Give them a fresh clock,
      // rather than ending a live conversation retroactively on upgrade.
      s.gameDeadline = s.phase === 'talking' ? now + s.gameSeconds * 1000 : 0;
    }
    s.scores = s.scores || {};
    for (const p of s.roster) if (!Number.isInteger(s.scores[p.playerNum]) || s.scores[p.playerNum] < 0) s.scores[p.playerNum] = 0;
    if (!crazyEnabled(s)) return;
    const c = s.crazy;
    for (const key of ['prompts', 'sequence', 'recent']) c[key] = c[key] || {};
    Object.assign(c, crazyRange(s)); c.queue = list(c.queue); c.replacementFor = list(c.replacementFor);
    c.taskSeconds = taskSeconds(s);
    if (c.schedulerVersion !== 2) {
      const pending = pendingNums(s).sort((a, b) => (Number(c.prompts[a].at) || 0) - (Number(c.prompts[b].at) || 0));
      for (const num of pending.slice(2)) c.prompts[num].status = 'cancelled';
      c.schedulerVersion = 2; c.scheduleSequence = 0; c.lastAssignAt = 0;
      c.lastPlayerNum = pending[0] || null;
      c.nextAssignAt = s.phase === 'talking' ? now + crazyDelay(s, input.seed) : 0;
      delete c.nextAt; delete c.nextDeliveryAt;
    }
    if (!Number.isFinite(c.nextAssignAt) || s.phase === 'talking' && !(c.nextAssignAt > 0)) scheduleCrazy(s, input);
    for (const prompt of list(c.prompts)) if (!Number.isFinite(prompt.expiresAt)) prompt.expiresAt = now + c.taskSeconds * 1000;
  }
  function finishGame(s, now) {
    s.phase = 'ended'; s.endedAt = now; s.speaker = null; s.remaining = [];
    s.questions = []; s.activeQuestion = null; s.interests = {};
    if (crazyEnabled(s)) {
      for (const prompt of list(s.crazy.prompts)) if (prompt.status === 'pending') prompt.status = 'cancelled';
      s.crazy.nextAssignAt = 0; s.crazy.replacementFor = []; s.crazy.queue = [];
    }
  }
  function assignCrazy(s, input, excluded = [], replacement = false) {
    const c = s.crazy, now = Number(input.now) || 0, pool = crazyPool();
    if (c.paused || pendingNums(s).length >= 2) return false;
    // Authenticated runtime presence already includes the disconnect grace
    // period. Unknown presence retains the roster; known absent players must
    // not occupy one of the two shared task slots.
    const online = s.sharedControls === true && input.onlineNums != null ? list(input.onlineNums) : null;
    const eligible = participants(s).map(p => p.playerNum).filter(num => (online == null || online.includes(num))
      && !excluded.includes(num) && c.prompts[num]?.status !== 'pending');
    const avoidRepeat = nums => nums.length > 1 && nums.includes(c.lastPlayerNum) ? nums.filter(num => num !== c.lastPlayerNum) : nums;
    let queued, candidates;
    for (const item of c.queue) {
      // A just-submitted mission cannot be revealed by the service pulse in
      // the same request, or steal a slot whose deadline predated submission.
      if (Number(item.at) >= now || !replacement && Number(item.at) >= c.nextAssignAt) continue;
      const matches = eligible.filter(num => num !== item.assignedBy && (item.target == null || item.target === num));
      if (matches.length) { queued = item; candidates = avoidRepeat(matches); break; }
    }
    if (!queued) {
      // Fresh queued work reserves matching recipients over system fallback.
      candidates = avoidRepeat(eligible.filter(num => !c.queue.some(item => num !== item.assignedBy
        && (item.target == null || item.target === num))));
      if (!systemCrazy(s) || !pool.length) return false;
    }
    if (!candidates.length) return false;
    const recipient = candidates[Math.floor(crazyRandom(input.seed, (Number(c.scheduleSequence) || 0) + 701) * candidates.length)];
    const sequence = (c.sequence[recipient] || 0) + 1; c.sequence[recipient] = sequence;
    const prompt = { id: `${s.sessionId}:crazy:${recipient}:${sequence}`, at: now,
      expiresAt: now + c.taskSeconds * 1000, status: 'pending' };
    if (queued) {
      Object.assign(prompt, { text: queued.text, kind: queued.kind, source: 'player', assignedBy: queued.assignedBy });
      c.queue = c.queue.filter(item => item !== queued);
    } else {
      const recent = list(c.recent[recipient]);
      const pending = list(c.prompts).filter(p => p.status === 'pending').map(p => p.lineId);
      let choices = pool.filter(line => !recent.includes(line.id) && !pending.includes(line.id));
      if (!choices.length) choices = pool.filter(line => !recent.includes(line.id));
      if (!choices.length) choices = pool;
      const line = choices[Math.floor(crazyRandom(input.seed, recipient + sequence * 101) * choices.length)];
      Object.assign(prompt, { lineId: line.id, text: line.text, kind: line.kind, source: 'system' });
      c.recent[recipient] = [...recent, line.id].slice(-12);
    }
    c.prompts[recipient] = prompt; c.lastPlayerNum = recipient; c.lastAssignAt = now;
    return true;
  }
  function deliverCrazy(s, input, allowScheduled = true) {
    if (!crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) return false;
    const c = s.crazy, now = Number(input.now) || 0;
    if (pendingNums(s).length >= 2) return false;
    if (list(c.replacementFor).length) {
      const excluded = c.replacementFor.slice(); c.replacementFor = [];
      if (assignCrazy(s, input, excluded, true)) {
        if (c.nextAssignAt <= now) { c.scheduleSequence = (Number(c.scheduleSequence) || 0) + 1; scheduleCrazy(s, input); }
        return true;
      }
      if (c.nextAssignAt <= now) { c.scheduleSequence = (Number(c.scheduleSequence) || 0) + 1; scheduleCrazy(s, input); }
      return false;
    }
    if (allowScheduled && c.nextAssignAt > 0 && now >= c.nextAssignAt) {
      const assigned = assignCrazy(s, input);
      // Empty queues and unavailable recipients still consume this timed slot.
      c.scheduleSequence = (Number(c.scheduleSequence) || 0) + 1; scheduleCrazy(s, input);
      return assigned;
    }
    return false;
  }
  function applyClocks(s, input, allowScheduled = true, allowDelivery = true) {
    if (s.phase !== 'talking') return false;
    const now = Number(input.now) || 0;
    if (now >= s.gameDeadline) { finishGame(s, now); return false; }
    if (!crazyEnabled(s)) return false;
    for (const num of pendingNums(s)) if (s.crazy.prompts[num].expiresAt <= now) {
      s.crazy.prompts[num].status = 'expired';
      if (!s.crazy.replacementFor.includes(num)) s.crazy.replacementFor.push(num);
    }
    return allowDelivery && deliverCrazy(s, input, allowScheduled);
  }
  const followUps = topic => {
    const items = list(topic?.followUps).map(q => typeof q === 'string' ? { stage: 'custom', question: q } : q)
      .filter(q => q && typeof q.question === 'string' && q.question.trim());
    return items.length ? items : topic?.followUp ? [{ stage: 'custom', question: topic.followUp }] : [];
  };
  function shuffle(items, seed) {
    let n = (Number(seed) >>> 0) || 1;
    const random = () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  const starter = topic => typeof topic?.starter === 'string' ? topic.starter.trim().slice(0, 600) : '';
  function cleanTopic(topic) {
    if (!topic || typeof topic !== 'object') throw new Error('invalid_topic');
    const text = (key, max, required = false) => {
      const value = topic[key] == null ? '' : topic[key];
      if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error('invalid_topic');
      return value.trim();
    };
    const questions = followUps(topic);
    if (questions.length > 8 || questions.some(q => q.question.trim().length > 300)) throw new Error('invalid_topic');
    return { id: text('id', 100) || 'custom', emoji: text('emoji', 16) || '✏️', title: text('title', 80),
      question: text('question', 500, true), starter: text('starter', 600),
      followUp: questions[0]?.question.trim() || '', followUps: questions.map(q => ({ stage: 'custom', question: q.question.trim() })) };
  }
  function create(options) {
    const { id, topic, roster, mode = 'think', seconds = 45, showStarters = true, gameMode = 'normal', crazySeconds = 120,
      conversationMode: discussionMode = 'random', crazySource: promptSource = 'mixed', now, sharedControls = false } = options;
    const duration = options.gameSeconds === undefined ? 900 : Number(options.gameSeconds);
    const taskDuration = options.crazyTaskSeconds === undefined ? 150 : Number(options.crazyTaskSeconds);
    const defaults = options.crazySeconds != null && [60, 120, 180].includes(Number(crazySeconds))
      ? legacyCrazyRange(crazySeconds) : { minSeconds: 60, maxSeconds: 180 };
    const crazyMinSeconds = options.crazyMinSeconds === undefined ? defaults.minSeconds : Number(options.crazyMinSeconds);
    const crazyMaxSeconds = options.crazyMaxSeconds === undefined ? defaults.maxSeconds : Number(options.crazyMaxSeconds);
    if (!id || !topic || !topic.question || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (!validGameSeconds(duration) || !validTaskSeconds(taskDuration) || !validCrazyRange(Number(crazyMinSeconds), Number(crazyMaxSeconds))) throw new Error('invalid_settings');
    if (new Set(roster.map(p => p.playerNum)).size !== roster.length || roster.some(p => !Number.isInteger(p.playerNum) || p.playerNum < 1)) throw new Error('invalid_roster');
    const state = {
      version: 1, sessionId: String(id), topic: copy(topic), showStarters: showStarters === true,
      gameSeconds: duration, crazyTaskSeconds: taskDuration, gameDeadline: 0, scores: Object.fromEntries(roster.map(p => [p.playerNum, 0])),
      ...(sharedControls === true ? { sharedControls: true } : {}),
      gameMode: gameMode === 'crazy' ? 'crazy' : 'normal',
      conversationMode: ['assigned', 'free'].includes(discussionMode) ? discussionMode : 'random',
      roster: roster.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').slice(0, 80),
        ...(p.active === false ? { active: false } : {}), ...(p.pending === true ? { pending: true } : {}) })),
      mode: mode === 'write' ? 'write' : 'think', phase: 'thinking', round: 0, turnId: 0,
      seconds: Math.max(15, Math.min(120, Number(seconds) || 45)),
      deadline: now + Math.max(15, Math.min(120, Number(seconds) || 45)) * 1000,
      speaker: null, remaining: [], spoken: [], readiness: {}, notes: {}, intents: {},
      questions: [], activeQuestion: null, interests: {}, replies: {}, seen: {}, extended: false,
    };
    if (state.gameMode === 'crazy') state.crazy = {
      source: ['system', 'players'].includes(promptSource) ? promptSource : 'mixed',
      intervalSeconds: [60, 120, 180].includes(Number(crazySeconds)) ? Number(crazySeconds) : 120,
      minSeconds: Number(crazyMinSeconds), maxSeconds: Number(crazyMaxSeconds),
      schedulerVersion: 2, taskSeconds: taskDuration, nextAssignAt: 0, lastAssignAt: 0, lastPlayerNum: null, scheduleSequence: 0,
      paused: false, prompts: {}, sequence: {}, recent: {}, queue: [], replacementFor: [],
    };
    return state;
  }
  function order(state) {
    if (conversationMode(state) === 'free') return [];
    const remaining = list(state.remaining).filter(n => eligible(state, n));
    if (conversationMode(state) === 'assigned') return remaining;
    const rank = num => {
      if ((state.intents || {})[num]?.round === state.round) return 0;
      if (state.round !== 1) return 1;
      const value = (state.readiness || {})[num]?.value;
      return value === 'ready' ? 1 : value === 'wait' ? 3 : 2;
    };
    return remaining.slice().sort((a, b) => rank(a) - rank(b));
  }
  const availableSeats = state => participants(state).map(p => p.playerNum).filter(n => state.sharedControls !== true
    || state.availablePlayerNums == null || list(state.availablePlayerNums).includes(n));
  function nextSpeaker(state, seed) {
    if (state.sharedControls === true) state.remaining = list(state.remaining).filter(n => availableSeats(state).includes(n));
    if (!list(state.remaining).length) {
      state.round++;
      state.remaining = conversationMode(state) === 'assigned' ? availableSeats(state).slice() : shuffle(availableSeats(state), seed);
      state.spoken = [];
    }
    const next = order(state)[0] ?? null;
    state.remaining = list(state.remaining).filter(n => n !== next);
    state.speaker = next;
    state.turnId++;
    state.questions = [];
    state.activeQuestion = null;
    state.interests = {};
    delete state.intents[next];
  }
  function beginDiscussion(s, input) {
    s.phase = 'talking'; s.round = 1;
    s.gameDeadline = (Number(input.now) || 0) + s.gameSeconds * 1000;
    if (conversationMode(s) === 'free') {
      s.speaker = null; s.remaining = []; s.spoken = []; s.turnId++;
      s.questions = []; s.activeQuestion = null; s.interests = {};
    } else {
      s.remaining = conversationMode(s) === 'assigned' ? availableSeats(s).slice() : shuffle(availableSeats(s), input.seed);
      const ready = s.remaining.filter(n => s.readiness[n]?.value === 'ready');
      ready.sort((a, b) => s.readiness[a].at - s.readiness[b].at);
      if (conversationMode(s) === 'random' && ready.length) s.remaining = [ready[0], ...s.remaining.filter(n => n !== ready[0])];
      nextSpeaker(s, input.seed);
    }
    scheduleCrazy(s, input);
  }
  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || input.id.length > 100) return current;
    const actor = Number(input.actor);
    if (actor !== 0 && !list(current.roster).some(p => p.playerNum === actor)) return current;
    const clockCommand = ['clockTick', 'crazyTick'].includes(input.type);
    const duplicate = list((current.seen || {})[actor]).includes(input.id);
    if ((clockCommand || duplicate) && !timerDue(current, Number(input.now) || 0)) return current;
    // Firebase omits empty containers after every save. An overdue
    // preparation with fewer than two players is still idle; normalizing
    // those containers must not create an endless series of revisions.
    const onlineCount = input.onlineNums == null ? participants(current).length
      : participants(current).filter(p => list(input.onlineNums).includes(p.playerNum)).length;
    if ((clockCommand || duplicate) && current.phase === 'thinking' && onlineCount < 2 && !needsMigration(current)) return current;
    const s = copy(current);
    for (const key of ['readiness', 'notes', 'intents', 'interests', 'replies', 'seen']) s[key] = s[key] || {};
    s.roster = list(s.roster); s.remaining = list(s.remaining); s.spoken = list(s.spoken); s.questions = list(s.questions);
    migrate(s, input);
    // Expiry and the game deadline win over a late completion or extension.
    // Newly submitted custom work waits for a later scheduler slot.
    const deliveredByClock = applyClocks(s, input, !['crazyAssign', 'crazySend', 'crazyDone', 'crazySkip', 'finish', 'exclude'].includes(input.type),
      !['crazySend', 'exclude'].includes(input.type) && !(input.type === 'crazyPause' && input.paused === true));
    if (duplicate) return JSON.stringify(s) === JSON.stringify(current) ? current : s;
    const host = actor === 0, manager = host || s.sharedControls === true && eligible(s, actor);
    const online = input.onlineNums == null ? participants(s).map(p => p.playerNum) : participants(s).filter(p => list(input.onlineNums).includes(p.playerNum)).map(p => p.playerNum);
    if (s.sharedControls === true) s.availablePlayerNums = online;
    const speaking = actor === s.speaker;
    let error = '';
    const reject = code => { error = code; };
    const turnTypes = ['ask', 'cancelAsk', 'invite', 'later', 'resume', 'share', 'cancelShare', 'more', 'end', 'recover', 'newTopic', 'crazyAssign', 'addTime', 'finish', 'exclude'];
    const selfReturn = s.sharedControls === true && input.type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
    if (!host && !eligible(s, actor) && !selfReturn) reject('not_available');
    else if (s.phase === 'ended' && !['newTopic', 'clockTick', 'crazyTick', 'exclude'].includes(input.type)) reject('not_available');
    else if (turnTypes.includes(input.type) && ((!['newTopic', 'crazyAssign', 'exclude'].includes(input.type) && s.phase !== 'talking')
        || (input.type === 'crazyAssign' && !['thinking', 'talking'].includes(s.phase)) || input.turnId !== s.turnId)) reject('stale_turn');
    else switch (input.type) {
      case 'newTopic': {
        if (!manager) { reject('not_available'); break; }
        if (input.confirm !== true) { reject('confirmation_required'); break; }
        let topic;
        try { topic = cleanTopic(input.topic); } catch (_) { reject('invalid_topic'); break; }
        const seconds = Number(input.seconds), crazySeconds = input.crazySeconds == null ? 120 : Number(input.crazySeconds);
        const range = input.crazyMinSeconds === undefined && input.crazyMaxSeconds === undefined
          && input.crazySeconds != null ? legacyCrazyRange(crazySeconds) : crazyRange(s);
        const minSeconds = input.crazyMinSeconds === undefined ? range.minSeconds : Number(input.crazyMinSeconds);
        const maxSeconds = input.crazyMaxSeconds === undefined ? range.maxSeconds : Number(input.crazyMaxSeconds);
        const duration = input.gameSeconds === undefined ? s.gameSeconds : Number(input.gameSeconds);
        const taskDuration = input.crazyTaskSeconds === undefined ? taskSeconds(s) : Number(input.crazyTaskSeconds);
        const discussionMode = input.conversationMode == null ? conversationMode(s) : input.conversationMode;
        const promptSource = input.crazySource == null ? crazySource(s) : input.crazySource;
        if (!['think', 'write'].includes(input.mode) || !['normal', 'crazy'].includes(input.gameMode)
            || !Number.isInteger(seconds) || seconds < 15 || seconds > 120 || ![60, 120, 180].includes(crazySeconds)
            || typeof input.showStarters !== 'boolean' || !['assigned', 'random', 'free'].includes(discussionMode)
            || !['system', 'players', 'mixed'].includes(promptSource) || !validCrazyRange(minSeconds, maxSeconds)
            || !validGameSeconds(duration) || !validTaskSeconds(taskDuration)) { reject('invalid_settings'); break; }
        const fresh = create({ id: s.sessionId + ':topic:' + input.id, topic, roster: s.roster, mode: input.mode, seconds,
          gameMode: input.gameMode, crazySeconds, crazyMinSeconds: minSeconds, crazyMaxSeconds: maxSeconds,
          conversationMode: discussionMode, crazySource: promptSource, gameSeconds: duration, crazyTaskSeconds: taskDuration,
          showStarters: input.showStarters, now: Number(input.now) || 0,
          sharedControls: s.sharedControls });
        fresh.seen[actor] = [input.id]; fresh.replies[actor] = { id: input.id, error: '' };
        return fresh;
      }
      case 'ready':
      case 'wait':
        if (host || s.phase !== 'thinking') { reject('not_available'); break; }
        s.readiness[actor] = { value: input.type, at: Number(input.now) || 0 };
        break;
      case 'note': {
        if (host || s.phase !== 'thinking' || s.mode !== 'write') { reject('not_available'); break; }
        const note = typeof input.text === 'string' ? input.text.trim().slice(0, 180) : '';
        if (note) s.notes[actor] = note;
        else delete s.notes[actor];
        break;
      }
      case 'start': {
        if (!manager || s.phase !== 'thinking') { reject('not_available'); break; }
        if (s.sharedControls === true && online.length < 2) { reject('waiting_players'); break; }
        beginDiscussion(s, input);
        break;
      }
      case 'ask':
        if (host || speaking || conversationMode(s) === 'free') { reject('not_available'); break; }
        if (!s.questions.some(q => q.playerNum === actor)) s.questions.push({ id: input.id, playerNum: actor, deferred: false });
        break;
      case 'cancelAsk':
        if (host || s.activeQuestion?.playerNum === actor) { reject('not_available'); break; }
        s.questions = s.questions.filter(q => q.playerNum !== actor);
        break;
      case 'invite': {
        const q = s.questions.find(q => q.id === input.target);
        if (!speaking || !q || s.activeQuestion) { reject('not_available'); break; }
        s.activeQuestion = { id: q.id, playerNum: q.playerNum };
        break;
      }
      case 'later': {
        const q = s.questions.find(q => q.id === input.target);
        if (!speaking || !q || s.activeQuestion) { reject('not_available'); break; }
        q.deferred = true;
        break;
      }
      case 'resume':
        if (!s.activeQuestion || (!manager && !speaking && actor !== s.activeQuestion.playerNum)) { reject('not_available'); break; }
        s.questions = s.questions.filter(q => q.id !== s.activeQuestion.id);
        s.activeQuestion = null;
        break;
      case 'share':
        if (host || speaking || conversationMode(s) === 'free') { reject('not_available'); break; }
        s.intents[actor] = { round: s.spoken.includes(actor) ? s.round + 1 : s.round };
        break;
      case 'cancelShare':
        if (host || speaking) { reject('not_available'); break; }
        delete s.intents[actor];
        break;
      case 'more':
        if (host || speaking) { reject('not_available'); break; }
        s.interests[actor] = { playerNum: actor, until: (Number(input.now) || 0) + 6000 };
        break;
      case 'end':
        if (conversationMode(s) === 'free' || (!manager && !speaking)) { reject('not_available'); break; }
        if (s.activeQuestion) { reject('question_open'); break; }
        if (s.questions.length && input.confirm !== true) { reject('pending_questions'); break; }
        s.spoken.push(s.speaker);
        nextSpeaker(s, input.seed);
        break;
      case 'recover': {
        if (s.sharedControls !== true || !manager) { reject('not_available'); break; }
        if (online.length < 2) { reject('waiting_players'); break; }
        s.questions = s.questions.filter(q => online.includes(q.playerNum));
        if (s.activeQuestion && !online.includes(s.activeQuestion.playerNum)) s.activeQuestion = null;
        if (conversationMode(s) !== 'free' && !online.includes(s.speaker)) nextSpeaker(s, input.seed);
        break;
      }
      case 'exclude': {
        const candidate = s.roster.find(p => p.playerNum === Number(input.playerNum));
        if ((!manager && !selfReturn) || !candidate || typeof input.active !== 'boolean') { reject('not_available'); break; }
        if ((candidate.active !== false) === input.active) break;
        setParticipant(s, candidate.playerNum, input.active, input);
        break;
      }
      case 'explain': {
        if (!manager) { reject('not_available'); break; }
        const text = typeof input.text === 'string' ? input.text.trim() : '';
        if (!text || text.length > 600) { reject('invalid_topic'); break; }
        s.topic.starter = text;
        break;
      }
      case 'clockTick':
      case 'crazyTick':
        if (!manager) { reject('not_available'); break; }
        if (s.phase === 'thinking' && (Number(input.now) || 0) >= s.deadline && online.length >= 2) beginDiscussion(s, input);
        // A scheduler pulse with no change never creates a revision or receipt.
        if (JSON.stringify(s) === JSON.stringify(current)) return current;
        break;
      case 'crazySend':
        // Older pages can redraw the shared timer; this command never creates
        // a prompt itself, including when the former timer was overdue.
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) { reject('not_available'); break; }
        scheduleCrazy(s, input);
        break;
      case 'crazyAssign': {
        if (host || !crazyEnabled(s) || crazySource(s) === 'system' || !['thinking', 'talking'].includes(s.phase)) { reject('not_available'); break; }
        const target = input.target == null || input.target === 'random' ? null : input.target;
        const text = typeof input.text === 'string' ? input.text.trim() : '', kind = input.kind == null ? 'task' : input.kind;
        if (target != null && (!Number.isInteger(target) || target === actor || !eligible(s, target))) { reject('invalid_target'); break; }
        if (!text || text.length > 120 || !['line', 'task'].includes(kind)) { reject('invalid_prompt'); break; }
        if (s.crazy.queue.length >= 20 || s.crazy.queue.filter(item => item.assignedBy === actor).length >= 10) { reject('queue_full'); break; }
        s.crazy.queue.push({ id: input.id, target, text, kind, assignedBy: actor, at: Number(input.now) || 0 });
        break;
      }
      case 'crazyPause':
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || typeof input.paused !== 'boolean') { reject('not_available'); break; }
        s.crazy.paused = input.paused;
        if (!input.paused && !deliveredByClock) deliverCrazy(s, input);
        break;
      case 'crazyDone':
      case 'crazySkip': {
        if (host || !crazyEnabled(s) || s.phase !== 'talking') { reject('not_available'); break; }
        const prompt = s.crazy.prompts[actor];
        if (!prompt || prompt.status !== 'pending' || input.promptId !== prompt.id) { reject('stale_prompt'); break; }
        prompt.status = input.type === 'crazyDone' ? 'done' : 'skipped';
        if (input.type === 'crazyDone') s.scores[actor]++;
        else {
          if (!s.crazy.replacementFor.includes(actor)) s.crazy.replacementFor.push(actor);
          if (!deliveredByClock) deliverCrazy(s, input, false);
        }
        break;
      }
      case 'addTime':
        if (!manager || s.phase !== 'talking' || ![60, 300].includes(input.seconds)) { reject('not_available'); break; }
        s.gameDeadline += input.seconds * 1000;
        break;
      case 'finish':
        if (!manager || s.phase !== 'talking') { reject('not_available'); break; }
        finishGame(s, Number(input.now) || 0);
        break;
      case 'starters':
        if (!manager || typeof input.show !== 'boolean') { reject('not_available'); break; }
        s.showStarters = input.show;
        break;
      case 'extend': {
        if (!manager || s.phase !== 'talking') { reject('not_available'); break; }
        if (input.show === false) { s.extended = false; break; }
        if (Object.hasOwn(input, 'text')) {
          const text = typeof input.text === 'string' ? input.text.trim() : '';
          if (!text || text.length > 300) { reject('invalid_extension'); break; }
          s.extension = text; s.extensionIndex = -1; s.extended = true;
        } else if (Object.hasOwn(input, 'index')) {
          const choices = followUps(s.topic);
          if (!Number.isInteger(input.index) || !choices[input.index]) { reject('invalid_extension'); break; }
          s.extension = choices[input.index].question; s.extensionIndex = input.index; s.extended = true;
        } else {
          if (!s.extension && !s.topic.followUp) { reject('invalid_extension'); break; }
          s.extended = !s.extended;
        }
        break;
      }
      default: reject('not_available');
    }
    s.seen[actor] = [...list(s.seen[actor]), input.id].slice(-32);
    s.replies[actor] = { id: input.id, error };
    return s;
  }
  function setParticipant(s, num, active, input) {
    const seat = s.roster.find(p => p.playerNum === num); seat.active = active;
    s.availablePlayerNums = list(s.availablePlayerNums).filter(n => n !== num && eligible(s, n));
    if (active) {
      s.availablePlayerNums.push(num);
      if (s.phase === 'talking' && conversationMode(s) !== 'free' && num !== s.speaker && !s.spoken.includes(num) && !s.remaining.includes(num)) s.remaining.push(num);
      if (s.phase === 'talking' && conversationMode(s) !== 'free' && s.speaker == null) nextSpeaker(s, input.seed);
      else s.turnId++;
      return;
    }
    s.remaining = list(s.remaining).filter(n => n !== num);
    s.questions = list(s.questions).filter(q => q.playerNum !== num);
    if (s.activeQuestion?.playerNum === num) s.activeQuestion = null;
    for (const key of ['readiness', 'notes', 'intents', 'interests']) if (s[key]) delete s[key][num];
    if (crazyEnabled(s)) {
      const prompt = s.crazy.prompts?.[num];
      if (prompt?.status === 'pending') prompt.status = 'cancelled';
      s.crazy.queue = list(s.crazy.queue).filter(item => item.assignedBy !== num && item.target !== num);
      s.crazy.replacementFor = list(s.crazy.replacementFor).filter(n => n !== num);
    }
    if (s.phase === 'talking' && conversationMode(s) !== 'free' && s.speaker === num) nextSpeaker(s, input.seed);
    else s.turnId++;
  }
  // Only the authenticated coordinator calls this hook. Existing ordinals,
  // scores, topic and deadlines stay intact while newcomers join future turns.
  function membership(current, change, ctx = {}) {
    if (!current || !Number.isFinite(ctx.now)) throw new Error('invalid_time');
    const added = list(change?.added), names = list(change?.roster), inactive = list(change?.inactiveNums);
    const existing = new Set(list(current.roster).map(p => p.playerNum));
    if (existing.size + added.length > 9 || added.some(p => !Number.isInteger(p?.playerNum) || p.playerNum < 1 || p.playerNum > 9 || existing.has(p.playerNum))
        || new Set(added.map(p => p.playerNum)).size !== added.length) throw new Error('invalid_roster');
    const s = copy(current);
    s.roster = list(s.roster); s.remaining = list(s.remaining); s.spoken = list(s.spoken); s.scores ||= {};
    for (const seat of added) {
      s.roster.push({ playerNum: seat.playerNum, name: String(seat.name || '').trim().slice(0, 80), active: true });
      s.scores[seat.playerNum] = 0;
      if (s.availablePlayerNums != null) s.availablePlayerNums = [...list(s.availablePlayerNums), seat.playerNum];
      if (s.phase === 'talking' && conversationMode(s) !== 'free') s.remaining.push(seat.playerNum);
    }
    if (inactive.some(n => !Number.isInteger(n) || !s.roster.some(p => p.playerNum === n))) throw new Error('invalid_player');
    for (const descriptor of names) {
      const seat = s.roster.find(p => p.playerNum === descriptor.playerNum); if (!seat) throw new Error('invalid_roster');
      seat.name = String(descriptor.name || '').trim().slice(0, 80);
    }
    for (const seat of s.roster) if ((seat.active !== false) !== !inactive.includes(seat.playerNum)) setParticipant(s, seat.playerNum, !inactive.includes(seat.playerNum), ctx);
    if (s.phase === 'talking' && conversationMode(s) !== 'free' && s.speaker == null && availableSeats(s).length) nextSpeaker(s, ctx.seed);
    return s;
  }
  function view(s, playerNum, now) {
    const roster = list(s.roster);
    const mine = roster.find(p => p.playerNum === playerNum), canPlay = !!mine && eligible(s, playerNum);
    return {
      game: 'letstalk', playerNum, name: mine?.name || null,
      talk: {
        version: 1, sessionId: s.sessionId, membership: { enabled: s.sharedControls === true, minPlayers: 2, maxPlayers: 9, activeCount: participants(s).length, pendingCount: roster.filter(p => p.active !== false && p.pending === true).length }, gameSeconds: gameSeconds(s), crazyTaskSeconds: taskSeconds(s), gameDeadline: Number(s.gameDeadline) || 0,
        scores: roster.map(p => ({ playerNum: p.playerNum, score: Number(s.scores?.[p.playerNum]) || 0 })), mode: s.mode, conversationMode: conversationMode(s), phase: s.phase, round: s.round,
        ...(s.sharedControls === true ? { sharedControls: true, hostControls: canPlay, actions: {
          start: canPlay && s.phase === 'thinking', end: canPlay && s.phase === 'talking' && conversationMode(s) !== 'free',
          addTime: canPlay && s.phase === 'talking', finish: canPlay && s.phase === 'talking',
          resume: canPlay && !!s.activeQuestion, extend: canPlay && s.phase === 'talking',
          starters: canPlay && s.phase !== 'ended', newTopic: canPlay, exclude: canPlay, rejoin: !!mine && !canPlay, crazySend: false,
          crazyAssign: canPlay && crazyEnabled(s) && crazySource(s) !== 'system' && ['thinking', 'talking'].includes(s.phase),
          crazyPause: canPlay && crazyEnabled(s) && s.phase === 'talking', recover: canPlay && s.phase === 'talking',
        } } : {}),
        gameMode: s.gameMode === 'crazy' ? 'crazy' : 'normal',
        crazy: {
          enabled: crazyEnabled(s), source: crazySource(s),
          canAssign: canPlay && crazyEnabled(s) && crazySource(s) !== 'system' && ['thinking', 'talking'].includes(s.phase),
          ...crazyRange(s), taskSeconds: taskSeconds(s), nextAssignAt: crazyEnabled(s) ? Number(s.crazy.nextAssignAt) || 0 : 0,
          pendingPlayerNums: pendingNums(s),
          myQueuedCount: canPlay && crazyEnabled(s) ? list(s.crazy.queue).filter(item => item.assignedBy === playerNum).length : 0,
          paused: crazyEnabled(s) ? !!s.crazy.paused : false,
          intervalSeconds: crazyEnabled(s) ? s.crazy.intervalSeconds : 120,
          prompt: crazyEnabled(s) && canPlay && s.crazy.prompts?.[playerNum] ? (() => {
            const p = s.crazy.prompts[playerNum];
            return { id: p.id, text: p.text, kind: p.kind, source: p.source === 'player' ? 'player' : 'system',
              ...(p.source === 'player' ? { assignedBy: p.assignedBy } : {}), at: p.at, expiresAt: Number(p.expiresAt) || 0, status: p.status };
          })() : null,
          pendingCount: crazyEnabled(s) ? list(s.crazy.prompts).filter(p => p.status === 'pending').length : 0,
        },
        turnId: s.turnId, seconds: Number(s.seconds) || 45, deadline: s.deadline, showStarters: !!s.showStarters, starter: starter(s.topic),
        // Keep the original followUp field in cards so already-open v0.1
        // player pages can display the newly selected question as well.
        topic: Object.assign({}, s.topic, { followUp: s.extension || s.topic.followUp || '' }), extended: !!s.extended,
        speaker: s.speaker || null, roster, questions: list(s.questions), activeQuestion: s.activeQuestion || null,
        notes: roster.filter(p => (s.notes || {})[p.playerNum]).map(p => ({ playerNum: p.playerNum, text: s.notes[p.playerNum] })),
        interests: list(s.interests).filter(r => r.until > now),
        readiness: (s.readiness || {})[playerNum]?.value || '',
        myNote: (s.notes || {})[playerNum] || '',
        intentRound: (s.intents || {})[playerNum]?.round || null,
        hasSpoken: list(s.spoken).includes(playerNum),
        isNext: s.phase === 'talking' && order(s)[0] === playerNum,
        reply: (s.replies || {})[playerNum] || null,
      },
    };
  }
  return { create, apply, membership, view, order, shuffle, list, followUps, starter, timerDue, crazyDue, conversationMode, crazySource, crazyRange };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_ENGINE;
