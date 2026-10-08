/* Let's Talk: deterministic conversation rules, independent of Firebase and DOM.
 * The host applies commands to one authoritative state. Player numbers, never
 * bearer tokens, may appear in projections. Randomness is supplied per command
 * so a Firebase transaction retry produces exactly the same order.
 */
var TALK_ENGINE = (() => {
  'use strict';
  const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
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
  const crazyDue = (s, now) => crazyEnabled(s) && s.phase === 'talking' && !s.crazy.paused
    && now >= (Number(s.crazy.nextDeliveryAt) || 0)
    && list(s.roster).some(p => s.crazy.prompts?.[p.playerNum]?.status !== 'pending'
      && (!(Number(s.crazy.nextAt?.[p.playerNum]) > 0) || Number(s.crazy.nextAt[p.playerNum]) <= now));
  function crazyRandom(seed, salt) {
    let n = ((Number(seed) >>> 0) ^ Math.imul(Number(salt) || 1, 2654435761)) >>> 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    return (n >>> 0) / 4294967296;
  }
  function crazyDelay(s, seed, num) {
    const range = crazyRange(s);
    return Math.round((range.minSeconds + crazyRandom(seed, num) * (range.maxSeconds - range.minSeconds)) * 1000);
  }
  function startCrazy(s, input) {
    if (!crazyEnabled(s)) return;
    for (const p of s.roster) if (s.crazy.prompts[p.playerNum]?.status !== 'pending') {
      s.crazy.nextAt[p.playerNum] = (Number(input.now) || 0) + crazyDelay(s, input.seed, p.playerNum);
    }
  }
  function restoreCrazyTimers(s, input) {
    if (!crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) return false;
    let changed = false;
    for (const p of s.roster) if (s.crazy.prompts[p.playerNum]?.status !== 'pending' && !(Number(s.crazy.nextAt[p.playerNum]) > 0)) {
      s.crazy.nextAt[p.playerNum] = (Number(input.now) || 0) + crazyDelay(s, input.seed, p.playerNum);
      changed = true;
    }
    return changed;
  }
  function assignCrazy(s, input) {
    const c = s.crazy, now = Number(input.now) || 0, pool = crazyPool();
    if (now < (Number(c.nextDeliveryAt) || 0)) return false;
    let due = shuffle(s.roster.map(p => p.playerNum), input.seed).filter(num =>
      c.prompts[num]?.status !== 'pending' && c.nextAt[num] > 0 && c.nextAt[num] <= now)
      .sort((a, b) => c.nextAt[a] - c.nextAt[b]);
    if (!due.length) return false;
    // A random-recipient mission stays unbound until a recipient's timer is due.
    // Player missions have priority over the system across all eligible seats.
    let queued, recipient;
    for (const item of c.queue) {
      const eligible = due.filter(num => num !== item.assignedBy && (item.target == null || item.target === num)
        && Number(item.at) < c.nextAt[num]);
      if (eligible.length) {
        queued = item; recipient = eligible[Math.floor(crazyRandom(input.seed, (c.queue.indexOf(item) + 1) * 701) * eligible.length)];
        break;
      }
    }
    if (recipient == null) {
      // A freshly queued mission owns its next slot, even when its recipient's
      // previous empty timer expired before submission. Draw a fresh timer
      // instead of letting a system fallback take that recipient's slot.
      // Older eligible queued work is selected above before any timer redraw.
      const blocked = due.filter(num => c.queue.some(item => num !== item.assignedBy
        && (item.target == null || item.target === num) && Number(item.at) >= c.nextAt[num]));
      for (const num of blocked) c.nextAt[num] = now + crazyDelay(s, input.seed, num);
      due = due.filter(num => !blocked.includes(num));
    }
    if (recipient == null && due.length && systemCrazy(s) && pool.length) recipient = due[0];
    if (recipient == null) {
      // Empty player-only slots receive a fresh timer, never a system fallback.
      // This also stops an overdue empty timer from delivering a newly queued
      // mission immediately inside the same request's service pulse.
      for (const num of due) c.nextAt[num] = now + crazyDelay(s, input.seed, num);
      return true;
    }
    const sequence = (c.sequence[recipient] || 0) + 1;
    c.sequence[recipient] = sequence;
    if (queued) {
      c.prompts[recipient] = { id: `${s.sessionId}:crazy:${recipient}:${sequence}`,
        text: queued.text, kind: queued.kind, source: 'player', assignedBy: queued.assignedBy, at: now, status: 'pending' };
      c.queue = c.queue.filter(item => item !== queued);
    } else {
      const recent = list(c.recent[recipient]);
      const pending = list(c.prompts).filter(prompt => prompt.status === 'pending').map(prompt => prompt.lineId);
      let choices = pool.filter(line => !recent.includes(line.id) && !pending.includes(line.id));
      if (!choices.length) choices = pool.filter(line => !recent.includes(line.id));
      if (!choices.length) choices = pool;
      const line = choices[Math.floor(crazyRandom(input.seed, recipient + sequence * 101) * choices.length)];
      c.prompts[recipient] = { id: `${s.sessionId}:crazy:${recipient}:${sequence}`, lineId: line.id,
        text: line.text, kind: line.kind, source: 'system', at: now, status: 'pending' };
      c.recent[recipient] = [...recent, line.id].slice(-12);
    }
    c.nextAt[recipient] = 0;
    // Background returns and equal custom ranges still reveal one mission at
    // a time, with a short gap before the next participant receives theirs.
    c.nextDeliveryAt = now + 4000;
    return true;
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
    const defaults = options.crazySeconds != null && [60, 120, 180].includes(Number(crazySeconds))
      ? legacyCrazyRange(crazySeconds) : { minSeconds: 60, maxSeconds: 180 };
    const crazyMinSeconds = options.crazyMinSeconds === undefined ? defaults.minSeconds : Number(options.crazyMinSeconds);
    const crazyMaxSeconds = options.crazyMaxSeconds === undefined ? defaults.maxSeconds : Number(options.crazyMaxSeconds);
    if (!id || !topic || !topic.question || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (!validCrazyRange(Number(crazyMinSeconds), Number(crazyMaxSeconds))) throw new Error('invalid_settings');
    if (new Set(roster.map(p => p.playerNum)).size !== roster.length || roster.some(p => !Number.isInteger(p.playerNum) || p.playerNum < 1)) throw new Error('invalid_roster');
    const state = {
      version: 1, sessionId: String(id), topic: copy(topic), showStarters: showStarters === true,
      ...(sharedControls === true ? { sharedControls: true } : {}),
      gameMode: gameMode === 'crazy' ? 'crazy' : 'normal',
      conversationMode: ['assigned', 'free'].includes(discussionMode) ? discussionMode : 'random',
      roster: roster.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').slice(0, 80) })),
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
      paused: false, prompts: {}, nextAt: {}, sequence: {}, recent: {}, queue: [], nextDeliveryAt: 0,
    };
    return state;
  }
  function order(state) {
    if (conversationMode(state) === 'free') return [];
    const remaining = list(state.remaining);
    if (conversationMode(state) === 'assigned') return remaining;
    const rank = num => {
      if ((state.intents || {})[num]?.round === state.round) return 0;
      if (state.round !== 1) return 1;
      const value = (state.readiness || {})[num]?.value;
      return value === 'ready' ? 1 : value === 'wait' ? 3 : 2;
    };
    return remaining.slice().sort((a, b) => rank(a) - rank(b));
  }
  const availableSeats = state => state.sharedControls === true && state.availablePlayerNums != null ? list(state.availablePlayerNums) : list(state.roster).map(p => p.playerNum);
  function nextSpeaker(state, seed) {
    if (state.sharedControls === true) state.remaining = list(state.remaining).filter(n => availableSeats(state).includes(n));
    if (!list(state.remaining).length) {
      state.round++;
      state.remaining = conversationMode(state) === 'assigned' ? availableSeats(state).slice() : shuffle(availableSeats(state), seed);
      state.spoken = [];
    }
    const next = order(state)[0];
    state.remaining = list(state.remaining).filter(n => n !== next);
    state.speaker = next;
    state.turnId++;
    state.questions = [];
    state.activeQuestion = null;
    state.interests = {};
    delete state.intents[next];
  }
  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || input.id.length > 100) return current;
    const actor = Number(input.actor);
    if (actor !== 0 && !list(current.roster).some(p => p.playerNum === actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    // Idle scheduler checks do not produce revisions, acknowledgements or writes.
    if (input.type === 'crazyTick' && actor === 0 && crazyEnabled(current)
        && current.phase === 'talking' && !current.crazy.paused && !crazyDue(current, Number(input.now) || 0)) return current;
    const s = copy(current);
    for (const key of ['readiness', 'notes', 'intents', 'interests', 'replies', 'seen']) s[key] = s[key] || {};
    s.roster = list(s.roster); s.remaining = list(s.remaining); s.spoken = list(s.spoken); s.questions = list(s.questions);
    if (crazyEnabled(s)) {
      for (const key of ['prompts', 'nextAt', 'sequence', 'recent']) s.crazy[key] = s.crazy[key] || {};
      Object.assign(s.crazy, crazyRange(s));
      s.crazy.queue = list(s.crazy.queue);
    }
    const restoredCrazyTimers = restoreCrazyTimers(s, input);
    const host = actor === 0, manager = host || s.sharedControls === true;
    const online = input.onlineNums == null ? s.roster.map(p => p.playerNum) : s.roster.filter(p => list(input.onlineNums).includes(p.playerNum)).map(p => p.playerNum);
    if (s.sharedControls === true && online.length >= 2) s.availablePlayerNums = online;
    const speaking = actor === s.speaker;
    let error = '';
    const reject = code => { error = code; };
    const turnTypes = ['ask', 'cancelAsk', 'invite', 'later', 'resume', 'share', 'cancelShare', 'more', 'end', 'recover', 'newTopic', 'crazyAssign'];
    if (turnTypes.includes(input.type) && ((input.type !== 'newTopic' && input.type !== 'crazyAssign' && s.phase !== 'talking')
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
        const discussionMode = input.conversationMode == null ? conversationMode(s) : input.conversationMode;
        const promptSource = input.crazySource == null ? crazySource(s) : input.crazySource;
        if (!['think', 'write'].includes(input.mode) || !['normal', 'crazy'].includes(input.gameMode)
            || !Number.isInteger(seconds) || seconds < 15 || seconds > 120 || ![60, 120, 180].includes(crazySeconds)
            || typeof input.showStarters !== 'boolean' || !['assigned', 'random', 'free'].includes(discussionMode)
            || !['system', 'players', 'mixed'].includes(promptSource) || !validCrazyRange(minSeconds, maxSeconds)) { reject('invalid_settings'); break; }
        const fresh = create({ id: s.sessionId + ':topic:' + input.id, topic, roster: s.roster, mode: input.mode, seconds,
          gameMode: input.gameMode, crazySeconds, crazyMinSeconds: minSeconds, crazyMaxSeconds: maxSeconds,
          conversationMode: discussionMode, crazySource: promptSource,
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
        s.phase = 'talking'; s.round = 1;
        if (conversationMode(s) === 'free') {
          s.speaker = null; s.remaining = []; s.spoken = []; s.turnId++;
          s.questions = []; s.activeQuestion = null; s.interests = {};
          startCrazy(s, input);
          break;
        }
        s.remaining = conversationMode(s) === 'assigned' ? availableSeats(s).slice() : shuffle(availableSeats(s), input.seed);
        const ready = s.remaining.filter(n => s.readiness[n]?.value === 'ready');
        ready.sort((a, b) => s.readiness[a].at - s.readiness[b].at);
        // Only the first ready person is moved to the front; the rest retain
        // their random relative order. Every person stays in this round.
        if (conversationMode(s) === 'random' && ready.length) s.remaining = [ready[0], ...s.remaining.filter(n => n !== ready[0])];
        nextSpeaker(s, input.seed);
        startCrazy(s, input);
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
      case 'explain': {
        if (!manager) { reject('not_available'); break; }
        const text = typeof input.text === 'string' ? input.text.trim() : '';
        if (!text || text.length > 600) { reject('invalid_topic'); break; }
        s.topic.starter = text;
        break;
      }
      case 'crazyTick':
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) { reject('not_available'); break; }
        if (!assignCrazy(s, input) && !restoredCrazyTimers) reject('not_available');
        break;
      case 'crazySend':
        // Legacy open pages may request this action. It only draws fresh
        // timers; prompts always arrive through the independent scheduler.
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) { reject('not_available'); break; }
        startCrazy(s, input);
        break;
      case 'crazyAssign': {
        if (host || !crazyEnabled(s) || crazySource(s) === 'system' || !['thinking', 'talking'].includes(s.phase)) { reject('not_available'); break; }
        const target = input.target == null || input.target === 'random' ? null : input.target;
        const text = typeof input.text === 'string' ? input.text.trim() : '', kind = input.kind == null ? 'task' : input.kind;
        if (target != null && (!Number.isInteger(target) || target === actor || !s.roster.some(p => p.playerNum === target))) { reject('invalid_target'); break; }
        if (!text || text.length > 120 || !['line', 'task'].includes(kind)) { reject('invalid_prompt'); break; }
        if (s.crazy.queue.length >= 20 || s.crazy.queue.filter(item => item.assignedBy === actor).length >= 10) { reject('queue_full'); break; }
        s.crazy.queue.push({ id: input.id, target, text, kind, assignedBy: actor, at: Number(input.now) || 0 });
        break;
      }
      case 'crazyPause':
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || typeof input.paused !== 'boolean') { reject('not_available'); break; }
        if (s.crazy.paused && !input.paused) {
          for (const p of s.roster) if (s.crazy.prompts[p.playerNum]?.status !== 'pending') {
            s.crazy.nextAt[p.playerNum] = (Number(input.now) || 0) + crazyDelay(s, input.seed, p.playerNum);
          }
        }
        s.crazy.paused = input.paused;
        break;
      case 'crazyDone':
      case 'crazySkip': {
        if (host || !crazyEnabled(s) || s.phase !== 'talking') { reject('not_available'); break; }
        const prompt = s.crazy.prompts[actor];
        if (!prompt || prompt.status !== 'pending' || input.promptId !== prompt.id) { reject('stale_prompt'); break; }
        prompt.status = input.type === 'crazyDone' ? 'done' : 'skipped';
        s.crazy.nextAt[actor] = s.crazy.paused ? 0 : (Number(input.now) || 0) + crazyDelay(s, input.seed, actor);
        break;
      }
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
  function view(s, playerNum, now) {
    const roster = list(s.roster);
    const mine = roster.find(p => p.playerNum === playerNum);
    return {
      game: 'letstalk', playerNum, name: mine?.name || null,
      talk: {
        version: 1, sessionId: s.sessionId, mode: s.mode, conversationMode: conversationMode(s), phase: s.phase, round: s.round,
        ...(s.sharedControls === true ? { sharedControls: true, hostControls: !!mine, actions: {
          start: !!mine && s.phase === 'thinking', end: !!mine && s.phase === 'talking' && conversationMode(s) !== 'free',
          resume: !!mine && !!s.activeQuestion, extend: !!mine && s.phase === 'talking',
          starters: !!mine, newTopic: !!mine, crazySend: false,
          crazyAssign: !!mine && crazyEnabled(s) && crazySource(s) !== 'system' && ['thinking', 'talking'].includes(s.phase),
          crazyPause: !!mine && crazyEnabled(s) && s.phase === 'talking', recover: !!mine && s.phase === 'talking',
        } } : {}),
        gameMode: s.gameMode === 'crazy' ? 'crazy' : 'normal',
        crazy: {
          enabled: crazyEnabled(s), source: crazySource(s),
          canAssign: !!mine && crazyEnabled(s) && crazySource(s) !== 'system' && ['thinking', 'talking'].includes(s.phase),
          ...crazyRange(s),
          myQueuedCount: mine && crazyEnabled(s) ? list(s.crazy.queue).filter(item => item.assignedBy === playerNum).length : 0,
          paused: crazyEnabled(s) ? !!s.crazy.paused : false,
          intervalSeconds: crazyEnabled(s) ? s.crazy.intervalSeconds : 120,
          prompt: crazyEnabled(s) && mine && s.crazy.prompts?.[playerNum] ? (() => {
            const p = s.crazy.prompts[playerNum];
            return { id: p.id, text: p.text, kind: p.kind, source: p.source === 'player' ? 'player' : 'system',
              ...(p.source === 'player' ? { assignedBy: p.assignedBy } : {}), at: p.at, status: p.status };
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
  return { create, apply, view, order, shuffle, list, followUps, starter, crazyDue, conversationMode, crazySource, crazyRange };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_ENGINE;
