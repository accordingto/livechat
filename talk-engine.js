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
  const crazyDue = (s, now) => crazyEnabled(s) && s.phase === 'talking' && !s.crazy.paused
    && list(s.roster).some(p => s.crazy.prompts?.[p.playerNum]?.status !== 'pending'
      && Number(s.crazy.nextAt?.[p.playerNum]) > 0 && Number(s.crazy.nextAt[p.playerNum]) <= now);
  function crazyRandom(seed, salt) {
    let n = ((Number(seed) >>> 0) ^ Math.imul(Number(salt) || 1, 2654435761)) >>> 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    return (n >>> 0) / 4294967296;
  }
  const crazyDelay = (s, seed, num) => Math.round(s.crazy.intervalSeconds * 1000 * (0.8 + crazyRandom(seed, num) * 0.4));
  function startCrazy(s, input) {
    if (!crazyEnabled(s)) return;
    const players = shuffle(s.roster.map(p => p.playerNum), input.seed);
    const span = 60000 / players.length;
    players.forEach((num, i) => {
      s.crazy.nextAt[num] = (Number(input.now) || 0) + Math.round(30000 + i * span + crazyRandom(input.seed, num) * span);
    });
  }
  function assignCrazy(s, input, immediate) {
    const c = s.crazy, now = Number(input.now) || 0, pool = crazyPool();
    if (!pool.length) return false;
    let changed = false;
    for (const p of s.roster) {
      const num = p.playerNum;
      if (c.prompts[num]?.status === 'pending' || (!immediate && !(c.nextAt[num] > 0 && c.nextAt[num] <= now))) continue;
      const recent = list(c.recent[num]);
      const pending = list(c.prompts).filter(prompt => prompt.status === 'pending').map(prompt => prompt.lineId);
      let choices = pool.filter(line => !recent.includes(line.id) && !pending.includes(line.id));
      if (!choices.length) choices = pool.filter(line => !recent.includes(line.id));
      if (!choices.length) choices = pool;
      const line = choices[Math.floor(crazyRandom(input.seed, num + (c.sequence[num] || 0) * 101) * choices.length)];
      const sequence = (c.sequence[num] || 0) + 1;
      c.sequence[num] = sequence;
      c.prompts[num] = { id: `${s.sessionId}:crazy:${num}:${sequence}`, lineId: line.id,
        text: line.text, kind: line.kind, at: now, status: 'pending' };
      c.recent[num] = [...recent, line.id].slice(-12);
      c.nextAt[num] = 0;
      changed = true;
    }
    return changed;
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
  function create({ id, topic, roster, mode = 'think', seconds = 45, showStarters = true, gameMode = 'normal', crazySeconds = 120, now, sharedControls = false }) {
    if (!id || !topic || !topic.question || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (new Set(roster.map(p => p.playerNum)).size !== roster.length || roster.some(p => !Number.isInteger(p.playerNum) || p.playerNum < 1)) throw new Error('invalid_roster');
    const state = {
      version: 1, sessionId: String(id), topic: copy(topic), showStarters: showStarters === true,
      ...(sharedControls === true ? { sharedControls: true } : {}),
      gameMode: gameMode === 'crazy' ? 'crazy' : 'normal',
      roster: roster.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').slice(0, 80) })),
      mode: mode === 'write' ? 'write' : 'think', phase: 'thinking', round: 0, turnId: 0,
      deadline: now + Math.max(15, Math.min(120, Number(seconds) || 45)) * 1000,
      speaker: null, remaining: [], spoken: [], readiness: {}, notes: {}, intents: {},
      questions: [], activeQuestion: null, interests: {}, replies: {}, seen: {}, extended: false,
    };
    if (state.gameMode === 'crazy') state.crazy = {
      intervalSeconds: [60, 120, 180].includes(Number(crazySeconds)) ? Number(crazySeconds) : 120,
      paused: false, prompts: {}, nextAt: {}, sequence: {}, recent: {},
    };
    return state;
  }
  function order(state) {
    const remaining = list(state.remaining);
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
      state.remaining = shuffle(availableSeats(state), seed);
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
    }
    const host = actor === 0, manager = host || s.sharedControls === true;
    const online = input.onlineNums == null ? s.roster.map(p => p.playerNum) : s.roster.filter(p => list(input.onlineNums).includes(p.playerNum)).map(p => p.playerNum);
    if (s.sharedControls === true && online.length >= 2) s.availablePlayerNums = online;
    const speaking = actor === s.speaker;
    let error = '';
    const reject = code => { error = code; };
    const turnTypes = ['ask', 'cancelAsk', 'invite', 'later', 'resume', 'share', 'cancelShare', 'more', 'end', 'recover'];
    if (turnTypes.includes(input.type) && (s.phase !== 'talking' || input.turnId !== s.turnId)) reject('stale_turn');
    else switch (input.type) {
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
        s.remaining = shuffle(availableSeats(s), input.seed);
        const ready = s.remaining.filter(n => s.readiness[n]?.value === 'ready');
        ready.sort((a, b) => s.readiness[a].at - s.readiness[b].at);
        // Only the first ready person is moved to the front; the rest retain
        // their random relative order. Every person stays in this round.
        if (ready.length) s.remaining = [ready[0], ...s.remaining.filter(n => n !== ready[0])];
        nextSpeaker(s, input.seed);
        startCrazy(s, input);
        break;
      }
      case 'ask':
        if (host || speaking) { reject('not_available'); break; }
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
        if (host || speaking) { reject('not_available'); break; }
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
        if (!manager && !speaking) { reject('not_available'); break; }
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
        if (!online.includes(s.speaker)) nextSpeaker(s, input.seed);
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
      case 'crazySend':
        if (!manager || !crazyEnabled(s) || s.phase !== 'talking' || s.crazy.paused) { reject('not_available'); break; }
        if (!assignCrazy(s, input, input.type === 'crazySend')) reject('not_available');
        break;
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
        version: 1, sessionId: s.sessionId, mode: s.mode, phase: s.phase, round: s.round,
        ...(s.sharedControls === true ? { sharedControls: true, hostControls: !!mine, actions: {
          start: !!mine && s.phase === 'thinking', end: !!mine && s.phase === 'talking',
          resume: !!mine && !!s.activeQuestion, extend: !!mine && s.phase === 'talking',
          starters: !!mine, crazySend: !!mine && crazyEnabled(s) && s.phase === 'talking' && !s.crazy.paused,
          crazyPause: !!mine && crazyEnabled(s) && s.phase === 'talking', recover: !!mine && s.phase === 'talking',
        } } : {}),
        gameMode: s.gameMode === 'crazy' ? 'crazy' : 'normal',
        crazy: {
          enabled: crazyEnabled(s), paused: crazyEnabled(s) ? !!s.crazy.paused : false,
          intervalSeconds: crazyEnabled(s) ? s.crazy.intervalSeconds : 120,
          prompt: crazyEnabled(s) && mine && s.crazy.prompts?.[playerNum] ? (() => {
            const p = s.crazy.prompts[playerNum];
            return { id: p.id, text: p.text, kind: p.kind, at: p.at, status: p.status };
          })() : null,
          pendingCount: crazyEnabled(s) ? list(s.crazy.prompts).filter(p => p.status === 'pending').length : 0,
        },
        turnId: s.turnId, deadline: s.deadline, showStarters: !!s.showStarters, starter: starter(s.topic),
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
  return { create, apply, view, order, shuffle, list, followUps, starter, crazyDue };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_ENGINE;
