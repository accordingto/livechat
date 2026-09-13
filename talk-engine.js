/* Let's Talk: deterministic conversation rules, independent of Firebase and DOM.
 * The host applies commands to one authoritative state. Player numbers, never
 * bearer tokens, may appear in projections. Randomness is supplied per command
 * so a Firebase transaction retry produces exactly the same order.
 */
var TALK_ENGINE = (() => {
  'use strict';
  const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
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
  function create({ id, topic, roster, mode = 'think', seconds = 45, now }) {
    if (!id || !topic || !topic.question || !Array.isArray(roster) || roster.length < 2 || roster.length > 9) throw new Error('invalid_setup');
    if (new Set(roster.map(p => p.playerNum)).size !== roster.length || roster.some(p => !Number.isInteger(p.playerNum) || p.playerNum < 1)) throw new Error('invalid_roster');
    return {
      version: 1, sessionId: String(id), topic: copy(topic),
      roster: roster.map(p => ({ playerNum: p.playerNum, name: String(p.name || '').slice(0, 80) })),
      mode: mode === 'write' ? 'write' : 'think', phase: 'thinking', round: 0, turnId: 0,
      deadline: now + Math.max(15, Math.min(120, Number(seconds) || 45)) * 1000,
      speaker: null, remaining: [], spoken: [], readiness: {}, notes: {}, intents: {},
      questions: [], activeQuestion: null, interests: {}, replies: {}, seen: {}, extended: false,
    };
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
  function nextSpeaker(state, seed) {
    if (!list(state.remaining).length) {
      state.round++;
      state.remaining = shuffle(state.roster.map(p => p.playerNum), seed);
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
    const s = copy(current);
    for (const key of ['readiness', 'notes', 'intents', 'interests', 'replies', 'seen']) s[key] = s[key] || {};
    s.roster = list(s.roster); s.remaining = list(s.remaining); s.spoken = list(s.spoken); s.questions = list(s.questions);
    const host = actor === 0;
    const speaking = actor === s.speaker;
    let error = '';
    const reject = code => { error = code; };
    const turnTypes = ['ask', 'cancelAsk', 'invite', 'later', 'resume', 'share', 'cancelShare', 'more', 'end'];
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
        if (!host || s.phase !== 'thinking') { reject('not_available'); break; }
        s.phase = 'talking'; s.round = 1;
        s.remaining = shuffle(s.roster.map(p => p.playerNum), input.seed);
        const ready = s.remaining.filter(n => s.readiness[n]?.value === 'ready');
        ready.sort((a, b) => s.readiness[a].at - s.readiness[b].at);
        // Only the first ready person is moved to the front; the rest retain
        // their random relative order. Every person stays in this round.
        if (ready.length) s.remaining = [ready[0], ...s.remaining.filter(n => n !== ready[0])];
        nextSpeaker(s, input.seed);
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
        if (!s.activeQuestion || (!host && !speaking && actor !== s.activeQuestion.playerNum)) { reject('not_available'); break; }
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
        if (!host && !speaking) { reject('not_available'); break; }
        if (s.activeQuestion) { reject('question_open'); break; }
        if (s.questions.length && input.confirm !== true) { reject('pending_questions'); break; }
        s.spoken.push(s.speaker);
        nextSpeaker(s, input.seed);
        break;
      case 'extend':
        if (!host || s.phase !== 'talking') { reject('not_available'); break; }
        s.extended = !s.extended;
        break;
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
        turnId: s.turnId, deadline: s.deadline, topic: s.topic, extended: !!s.extended,
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
  return { create, apply, view, order, shuffle, list };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_ENGINE;
