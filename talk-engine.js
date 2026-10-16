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
  const vnext = () => typeof TALK_VNEXT !== 'undefined' ? TALK_VNEXT : require('./talk-vnext.js');
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
  const unresolvedArchive = record => ['queued', 'pending'].includes(record?.status);
  const terminalArchive = record => ['done', 'skipped', 'expired', 'cancelled', 'replaced', 'withdrawn', 'saved', 'deleted', 'revealed'].includes(record?.status);
  const knownArchiveTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  function archivePerson(s, num) {
    const person = list(s.roster).find(p => p.playerNum === num);
    return { playerNum: Number.isInteger(num) ? num : null, name: person?.name || '' };
  }
  const archiveTopic = s => ({ title: String(s.topic?.title || ''), question: String(s.topic?.question || '') });
  function archiveEnvelope(value) { return { version: 1, records: copy(list(value?.records)) }; }
  function archiveEntries(s) {
    return copy([...list(s?.challengeArchive?.records).filter(record => Number.isInteger(record?.version)
      && record.version > (Number(record.persistedVersion) || 0)), ...vnext().archiveRecords(s)]);
  }
  function ackArchive(current, acknowledgements) {
    const s = copy(current), acks = list(acknowledgements);
    if (!s.challengeArchive || s.challengeArchive.version !== 1) return s;
    s.challengeArchive.records = list(s.challengeArchive.records).filter(record => {
      const versions = acks.filter(ack => ack?.id === record.id && Number.isInteger(ack.version)
        && ack.version > 0 && ack.version <= record.version).map(ack => ack.version);
      if (!versions.length) return true;
      record.persistedVersion = Math.max(Number(record.persistedVersion) || 0, ...versions);
      return !(terminalArchive(record) && record.persistedVersion === record.version);
    });
    if (vnext().ackRecords) vnext().ackRecords(s, acks);
    return s;
  }
  function addArchiveRecord(s, id, details, version = 1) {
    const existing = s.challengeArchive.records.find(record => record.id === id);
    if (existing) return existing;
    const record = { id, version, persistedVersion: 0, ...details };
    s.challengeArchive.records.push(record); return record;
  }
  function archiveQueued(s, item, legacy = false, fallbackId = '') {
    const id = item.archiveId || item.roundCardId || (typeof item.id === 'string' && item.id ? s.sessionId + ':author:' + item.assignedBy + ':' + item.id : fallbackId);
    if (!id) return;
    const at = knownArchiveTime(item.at);
    addArchiveRecord(s, id, { sessionId: s.sessionId, kind: item.kind === 'line' ? 'line' : 'task', text: item.text,
      author: archivePerson(s, item.assignedBy), target: item.target == null ? null : archivePerson(s, item.target),
      topic: archiveTopic(s), status: 'queued', ...(legacy ? { legacy: true } : {}),
      ...(at == null ? {} : { createdAt: at, updatedAt: at }) });
    item.archiveId = id;
  }
  function updateArchive(s, id, status, now, extra = {}) {
    if (!id) return;
    const record = s.challengeArchive?.records?.find(item => item.id === id);
    if (!record || record.status === status) return;
    record.version++; record.status = status; Object.assign(record, extra);
    const at = knownArchiveTime(now);
    if (at != null) { record.updatedAt = at; if (terminalArchive(record)) record.closedAt = at; }
  }
  function closeUnresolvedArchive(s, now, predicate = () => true) {
    for (const record of list(s.challengeArchive?.records)) if (unresolvedArchive(record) && predicate(record)) {
      updateArchive(s, record.id, 'cancelled', now);
    }
  }
  function migrateArchive(s) {
    const initialize = s.challengeArchive?.version !== 1;
    s.challengeArchive = archiveEnvelope(s.challengeArchive);
    // The envelope remains initialized after terminal history is persisted.
    // An older executor can still write unlinked tasks during an upgrade;
    // capture those active items once without reviving linked, pruned records.
    if (!crazyEnabled(s)) return;
    list(s.crazy.queue).forEach((item, index) => {
      if (initialize || !item.archiveId) archiveQueued(s, item, true, s.sessionId + ':legacy:queue:' + index);
    });
    for (const [num, prompt] of Object.entries(s.crazy.prompts || {})) {
      if (prompt?.source !== 'player' || prompt.status !== 'pending' || (!initialize && prompt.archiveId)) continue;
      const id = prompt.archiveId || prompt.roundCardId || prompt.queueItem?.archiveId || s.sessionId + ':legacy:' + prompt.id, at = knownArchiveTime(prompt.at);
      addArchiveRecord(s, id, { sessionId: s.sessionId, kind: prompt.kind === 'line' ? 'line' : 'task', text: prompt.text,
        author: archivePerson(s, prompt.assignedBy), recipient: archivePerson(s, Number(num)), topic: archiveTopic(s),
        legacy: true, status: 'pending', ...(at == null ? {} : { assignedAt: at, updatedAt: at }) }, 2);
      prompt.archiveId = id;
    }
  }
  function needsMigration(s) {
    if (s?.challengeArchive?.version !== 1) return true;
    if (!validGameSeconds(s?.gameSeconds) || !validTaskSeconds(s?.crazyTaskSeconds)
        || !s.scores || list(s.roster).some(p => !Number.isInteger(s.scores[p.playerNum]) || s.scores[p.playerNum] < 0)
        || !Number.isFinite(s.gameDeadline) || (s.phase === 'talking' && !(s.gameDeadline > 0))) return true;
    return crazyEnabled(s) && (s.crazy.vnextVersion !== 1 || s.crazy.directorCount !== Math.floor(participants(s).length / 2)
      || s.crazy.schedulerVersion !== 2 || !validTaskSeconds(s.crazy.taskSeconds)
      || list(s.crazy.queue).some(item => !item.archiveId)
      || list(s.crazy.prompts).some(prompt => prompt?.source === 'player' && prompt.status === 'pending' && !prompt.archiveId)
      || !Number.isFinite(s.crazy.nextAssignAt) || (s.phase === 'talking' && !(s.crazy.nextAssignAt > 0))
      || pendingNums(s).some(num => !Number.isFinite(s.crazy.prompts[num].expiresAt)));
  }
  function timerDue(s, now, context = {}) {
    if (!s || !Number.isFinite(Number(now))) return false;
    if (needsMigration(s)) return true;
    if (s.phase === 'thinking') return Number(now) >= Number(s.deadline);
    if (crazyEnabled(s)) {
      if (context.onlineNums != null && JSON.stringify(list(context.onlineNums).slice().sort((a,b)=>a-b)) !== JSON.stringify(list(s.availablePlayerNums).slice().sort((a,b)=>a-b))) return true;
      if (vnext().due(s, Number(now))) return true;
      return s.phase === 'talking' && vnext().maySystem(s, { now: Number(now) })
        && s.crazy.nextAssignAt > 0 && Number(now) >= s.crazy.nextAssignAt;
    }
    return s.phase === 'talking' && Number(now) >= s.gameDeadline;
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
    migrateArchive(s);
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
      for (const num of pending.slice(2)) {
        c.prompts[num].status = 'cancelled'; updateArchive(s, c.prompts[num].archiveId, 'cancelled', now);
      }
      c.schedulerVersion = 2; c.scheduleSequence = 0; c.lastAssignAt = 0;
      c.lastPlayerNum = pending[0] || null;
      c.nextAssignAt = s.phase === 'talking' ? now + crazyDelay(s, input.seed) : 0;
      delete c.nextAt; delete c.nextDeliveryAt;
    }
    if (!Number.isFinite(c.nextAssignAt) || s.phase === 'talking' && !(c.nextAssignAt > 0)) scheduleCrazy(s, input);
    for (const prompt of list(c.prompts)) if (!Number.isFinite(prompt.expiresAt)) prompt.expiresAt = now + c.taskSeconds * 1000;
    vnext().init(s, input);
  }
  function finishGame(s, now) {
    closeUnresolvedArchive(s, now);
    s.phase = 'ended'; s.endedAt = now; s.speaker = null; s.remaining = [];
    s.questions = []; s.activeQuestion = null; s.interests = {};
    if (crazyEnabled(s)) {
      for (const prompt of list(s.crazy.prompts)) if (prompt.status === 'pending') prompt.status = 'cancelled';
      s.crazy.nextAssignAt = 0; s.crazy.replacementFor = []; s.crazy.queue = [];
    }
  }
  function syncVnextArchive(s, input) {
    if (!crazyEnabled(s)) return;
    for (const card of list(s.crazy.roundCards)) {
      let record = list(s.challengeArchive?.records).find(r => r.id === card.archiveId);
      if (!record && !card.archiveLinked && card.source !== 'system' && card.archiveId) {
        const item = { ...card, id:card.id, archiveId:card.archiveId, at:card.createdAt ?? card.at, assignedBy:card.assignedBy ?? card.author };
        archiveQueued(s,item); record = list(s.challengeArchive.records).find(r=>r.id === card.archiveId);
      }
      if (!record) continue;
      card.archiveLinked = true;
      const recipient = card.recipient ?? card.recipientNum;
      const extra = { ...(recipient ? { recipient:record.recipient?.playerNum === recipient ? record.recipient : archivePerson(s,recipient) } : {}),
        ...(Number.isFinite(card.assignedAt) ? { assignedAt:card.assignedAt } : {}) };
      if (record.status === card.status && Object.entries(extra).every(([key,val])=>JSON.stringify(record[key]) === JSON.stringify(val))) continue;
      record.version++; record.status = card.status; Object.assign(record,extra); record.updatedAt = Number(input.now) || 0;
      if (terminalArchive(record)) record.closedAt = record.updatedAt;
    }
  }
  function resetCarry(current, now = 0, { superseded = false } = {}) {
    const s = copy(current || {}), input = { actor: 0, now: Number(now) || 0 };
    if (crazyEnabled(s) && list(s.crazy.prompts).some(prompt => prompt?.status === 'pending')) {
      if (superseded !== true && s.crazy.activitySuperseded !== true) throw new Error('missions_active');
    }
    migrateArchive(s);
    if (crazyEnabled(s)) {
      if (superseded === true || s.crazy.activitySuperseded === true) vnext().cancelSuperseded(s, input);
      vnext().preserveUnusedForReset(s, input); syncVnextArchive(s, input);
    }
    closeUnresolvedArchive(s, input.now);
    const records = new Map(list(s.challengeArchive.records).map(record => [record.id, record]));
    for (const record of vnext().archiveRecords(s)) {
      const previous = records.get(record.id);
      if (!previous || record.version >= previous.version) records.set(record.id, copy(record));
    }
    return { challengeArchive: { version: 1, records: [...records.values()] },
      crazyVault: copy(s.crazyVault || {}), crazyIdentities: copy(s.crazyIdentities || {}) };
  }
  function assignCrazy(s, input) {
    if (!systemCrazy(s) || !vnext().maySystem(s, input)) return false;
    const c = s.crazy, pool = crazyPool(), candidates = vnext().eligibleReceivers(s, input);
    if (!pool.length || !candidates.length) return false;
    const recipient = candidates[Math.floor(crazyRandom(input.seed, (Number(c.scheduleSequence) || 0) + 701) * candidates.length)];
    const recent = list(c.recent[recipient]);
    const pending = list(c.prompts).filter(p => p.status === 'pending').map(p => p.lineId);
    let choices = pool.filter(line => !recent.includes(line.id) && !pending.includes(line.id));
    if (!choices.length) choices = pool.filter(line => !recent.includes(line.id));
    if (!choices.length) choices = pool;
    const line = choices[Math.floor(crazyRandom(input.seed, recipient + ((c.sequence[recipient] || 0) + 1) * 101) * choices.length)];
    const assigned = vnext().assign(s, { ...line, lineId: line.id, source: 'system' }, recipient, input);
    if (assigned) c.recent[recipient] = [...recent, line.id].slice(-12);
    return assigned;
  }
  function deliverCrazy(s, input, allowScheduled = true, formerDirectors) {
    if (!crazyEnabled(s)) return false;
    const before = JSON.stringify(s.crazy), priorDirectors = formerDirectors ?? JSON.stringify(list(s.crazy.directors));
    vnext().advance(s, input);
    if (s.phase === 'talking' && conversationMode(s) !== 'free'
        && (priorDirectors !== JSON.stringify(list(s.crazy.directors)) || list(s.crazy.directors).includes(s.speaker)
          || list(s.remaining).some(num => list(s.crazy.directors).includes(num)))) {
      const actors = availableSeats(s);
      s.remaining = list(s.remaining).filter(n=>actors.includes(n));
      for (const num of actors) if (num !== s.speaker && !list(s.spoken).includes(num) && !s.remaining.includes(num)) s.remaining.push(num);
      if (!actors.includes(s.speaker)) nextSpeaker(s, input.seed);
    }
    const c = s.crazy, now = Number(input.now) || 0;
    if (allowScheduled && c.nextAssignAt > 0 && now >= c.nextAssignAt && vnext().maySystem(s, input)) {
      if (!assignCrazy(s, input)) { c.scheduleSequence = (Number(c.scheduleSequence) || 0) + 1; scheduleCrazy(s, input); }
    }
    syncVnextArchive(s, input);
    return before !== JSON.stringify(c);
  }
  function applyClocks(s, input, allowScheduled = true, allowDelivery = true) {
    if (crazyEnabled(s)) return deliverCrazy(s, input, allowScheduled && allowDelivery);
    if (s.phase === 'talking' && (Number(input.now) || 0) >= s.gameDeadline) finishGame(s, Number(input.now) || 0);
    return false;
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
      challengeArchive: archiveEnvelope(options.challengeArchive),
      crazyVault: copy(options.crazyVault || {}), crazyIdentities: copy(options.crazyIdentities || {}),
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
    closeUnresolvedArchive(state, Number(now) || 0, record => record.sessionId !== state.sessionId);
    if (state.gameMode === 'crazy') state.crazy = {
      source: ['system', 'players'].includes(promptSource) ? promptSource : 'mixed',
      intervalSeconds: [60, 120, 180].includes(Number(crazySeconds)) ? Number(crazySeconds) : 120,
      minSeconds: Number(crazyMinSeconds), maxSeconds: Number(crazyMaxSeconds),
      schedulerVersion: 2, taskSeconds: taskDuration, nextAssignAt: 0, lastAssignAt: 0, lastPlayerNum: null, scheduleSequence: 0,
      hostDelegate: roster.some(p=>p.playerNum === Number(options.hostPlayerNum)) ? Number(options.hostPlayerNum) : null,
      maxActive: options.crazyMaxActive == null ? 3 : Number(options.crazyMaxActive),
      playStyle: options.crazyPlayStyle || 'director', rotationSeconds: options.crazyRotationSeconds == null ? 120 : Number(options.crazyRotationSeconds),
      paused: false, prompts: {}, sequence: {}, recent: {}, queue: [], replacementFor: [],
    };
    if (crazyEnabled(state)) {
      if (!Number.isInteger(state.crazy.maxActive) || state.crazy.maxActive < 1 || state.crazy.maxActive > 9
          || !['free', 'director'].includes(state.crazy.playStyle) || !Number.isInteger(state.crazy.rotationSeconds)
          || state.crazy.rotationSeconds < 60 || state.crazy.rotationSeconds > 900
          || state.crazy.playStyle === 'director' && participants(state).length < 2) throw new Error('invalid_settings');
      vnext().init(state, { now, seed: options.seed || 1 });
    }
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
  const availableSeats = state => participants(state).map(p => p.playerNum).filter(n => !crazyEnabled(state) || !list(state.crazy.directors).includes(n)).filter(n => state.sharedControls !== true
    || state.availablePlayerNums == null || list(state.availablePlayerNums).includes(n));
  function nextSpeaker(state, seed) {
    if (state.sharedControls === true || crazyEnabled(state)) state.remaining = list(state.remaining).filter(n => availableSeats(state).includes(n));
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
    if (crazyEnabled(s)) deliverCrazy(s, input, false);
  }
  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || input.id.length > 100) return current;
    const actor = Number(input.actor);
    if (actor !== 0 && !list(current.roster).some(p => p.playerNum === actor)) return current;
    const clockCommand = ['clockTick', 'crazyTick'].includes(input.type);
    const duplicate = list((current.seen || {})[actor]).includes(input.id);
    if ((clockCommand || duplicate) && !timerDue(current, Number(input.now) || 0, input)) return current;
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
    // Handwritten work is reevaluated independently of the system schedule.
    const deliveredByClock = applyClocks(s, input, !['crazyAssign', 'crazySend', 'crazyDone', 'crazySkip', 'finish', 'exclude'].includes(input.type),
      !['crazySend', 'exclude'].includes(input.type) && !(input.type === 'crazyPause' && input.paused === true));
    if (duplicate) return JSON.stringify(s) === JSON.stringify(current) ? current : s;
    const host = actor === 0, manager = host || s.sharedControls === true && eligible(s, actor);
    const online = input.onlineNums == null ? participants(s).map(p => p.playerNum) : participants(s).filter(p => list(input.onlineNums).includes(p.playerNum)).map(p => p.playerNum);
    if (s.sharedControls === true) s.availablePlayerNums = online;
    const speaking = actor === s.speaker;
    let error = '';
    const reject = code => { error = code; };
    const turnTypes = ['ask', 'cancelAsk', 'invite', 'later', 'resume', 'share', 'cancelShare', 'more', 'end', 'recover', 'newTopic', 'addTime', 'finish', 'exclude'];
    const selfReturn = s.sharedControls === true && input.type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
    if (!host && !eligible(s, actor) && !selfReturn && !['crazySort','crazyLibraryUpdate','crazyLibraryDelete'].includes(input.type)) reject('not_available');
    else if (s.phase === 'ended' && !['newTopic', 'clockTick', 'crazyTick', 'exclude'].includes(input.type) && !input.type.startsWith('crazy')) reject('not_available');
    else if (turnTypes.includes(input.type) && ((!['newTopic', 'crazyAssign', 'exclude'].includes(input.type) && s.phase !== 'talking')
        || (input.type === 'crazyAssign' && !['thinking', 'talking'].includes(s.phase)) || input.turnId !== s.turnId)) reject('stale_turn');
    else if (crazyEnabled(s) && ['crazyRendered', 'crazyHere', 'crazyReplace', 'crazyKeep', 'crazyReceive', 'crazyExtend', 'crazyDrain', 'crazyDelegate', 'crazyClaimHost', 'crazySort', 'crazyReveal', 'crazyLibrarySave', 'crazyLibraryUpdate', 'crazyLibraryDelete', 'crazyLibrarySend', 'crazyDone', 'crazySkip'].includes(input.type)) {
      error = vnext().action(s, { ...input, hostAuthorized: host || input.hostAuthorized === true }) || '';
      if (!error) deliverCrazy(s, input, false);
    } else switch (input.type) {
      case 'newTopic': {
        if (!manager || crazyEnabled(s) && !host && input.hostAuthorized !== true) { reject('not_available'); break; }
        if (crazyEnabled(s) && (pendingNums(s).length || s.phase === 'talking' && !['sorting','reveal'].includes(s.crazy.roundStage))) { reject('missions_active'); break; }
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
        const maxActive = input.crazyMaxActive ?? s.crazy?.maxActive ?? 3, playStyle = input.crazyPlayStyle ?? s.crazy?.playStyle ?? 'director';
        const rotationSeconds = input.crazyRotationSeconds ?? s.crazy?.rotationSeconds ?? 120;
        if (input.gameMode === 'crazy' && (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 9
            || !['free','director'].includes(playStyle) || !Number.isInteger(rotationSeconds) || rotationSeconds < 60 || rotationSeconds > 900
            || playStyle === 'director' && participants(s).length < 2)) { reject('invalid_settings'); break; }
        if (!['think', 'write'].includes(input.mode) || !['normal', 'crazy'].includes(input.gameMode)
            || !Number.isInteger(seconds) || seconds < 15 || seconds > 120 || ![60, 120, 180].includes(crazySeconds)
            || typeof input.showStarters !== 'boolean' || !['assigned', 'random', 'free'].includes(discussionMode)
            || !['system', 'players', 'mixed'].includes(promptSource) || !validCrazyRange(minSeconds, maxSeconds)
            || !validGameSeconds(duration) || !validTaskSeconds(taskDuration)) { reject('invalid_settings'); break; }
        if (crazyEnabled(s)) { vnext().preserveUnusedForReset(s, input); syncVnextArchive(s, input); }
        closeUnresolvedArchive(s, Number(input.now) || 0);
        for (const record of vnext().archiveRecords(s)) if (!s.challengeArchive.records.some(r=>r.id === record.id)) s.challengeArchive.records.push(copy(record));
        const fresh = create({ id: s.sessionId + ':topic:' + input.id, topic, roster: s.roster, mode: input.mode, seconds,
          challengeArchive: s.challengeArchive, hostPlayerNum:s.crazy?.hostDelegate, crazyVault: s.crazyVault, crazyIdentities: s.crazyIdentities,
          crazyMaxActive: input.crazyMaxActive ?? s.crazy?.maxActive ?? 3,
          crazyPlayStyle: input.crazyPlayStyle ?? s.crazy?.playStyle ?? 'director', crazyRotationSeconds: input.crazyRotationSeconds ?? s.crazy?.rotationSeconds ?? 120,
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
        const formerDirectors = JSON.stringify(list(s.crazy?.directors));
        setParticipant(s, candidate.playerNum, input.active, input);
        if (crazyEnabled(s)) deliverCrazy(s, input, false, formerDirectors);
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
        const item = { id: input.id, target, text, kind, assignedBy: actor, at: Number(input.now) || 0 };
        const submissionError = vnext().submit(s, item, input);
        if (submissionError) { reject(submissionError); break; }
        archiveQueued(s, item);
        deliverCrazy(s, input, false);
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
        updateArchive(s, prompt.archiveId, prompt.status, Number(input.now) || 0);
        if (input.type === 'crazyDone') s.scores[actor]++;
        else {
          if (!s.crazy.replacementFor.includes(actor)) s.crazy.replacementFor.push(actor);
          if (!deliveredByClock) deliverCrazy(s, input, false);
        }
        break;
      }
      case 'addTime':
        if (crazyEnabled(s) && (s.crazy.queueLocked || !host && input.hostAuthorized !== true)) { reject('host_only'); break; }
        if (!manager || s.phase !== 'talking' || ![60, 300].includes(input.seconds)) { reject('not_available'); break; }
        s.gameDeadline += input.seconds * 1000;
        break;
      case 'finish':
        if (crazyEnabled(s)) { error = vnext().action(s, { ...input, type: 'crazyDrain', hostAuthorized: host || input.hostAuthorized === true }) || ''; break; }
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
    syncVnextArchive(s, input);
    if (input.type === 'crazyRendered') return s;
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
      vnext().cancelMember(s, num, input);
      const prompt = s.crazy.prompts?.[num];
      if (prompt?.status === 'pending') {
        prompt.status = 'cancelled'; updateArchive(s, prompt.archiveId, 'cancelled', Number(input.now) || 0);
      }
      s.crazy.queue = list(s.crazy.queue).filter(item => {
        if (item.assignedBy !== num && item.target !== num) return true;
        updateArchive(s, item.archiveId, 'cancelled', Number(input.now) || 0); return false;
      });
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
    const s = copy(current), formerDirectors = JSON.stringify(list(current.crazy?.directors));
    migrate(s, ctx);
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
    if (crazyEnabled(s)) deliverCrazy(s, ctx, false, formerDirectors);
    return s;
  }
  function view(s, playerNum, now, context = {}) {
    const roster = list(s.roster);
    const v = crazyEnabled(s) ? vnext().view(s, playerNum, now, { ...context, hostAuthorized: playerNum === 0 || context.hostAuthorized === true }) : {};
    const mine = roster.find(p => p.playerNum === playerNum), canPlay = !!mine && eligible(s, playerNum);
    const payload = {
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
          ...v,
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
    if (crazyEnabled(s)) {
      payload.talk.crazy.canAssign = canPlay && crazySource(s) !== 'system' && !s.crazy.queueLocked
        && ['thinking', 'talking'].includes(s.phase) && (s.crazy.effectivePlayStyle !== 'director' || list(s.crazy.directors).includes(playerNum));
      if (payload.talk.actions) {
        const actualHost = playerNum === 0 || context.hostAuthorized === true || s.crazy.hostDelegate === playerNum;
        for (const action of ['addTime', 'finish', 'newTopic']) payload.talk.actions[action] = actualHost && (action === 'newTopic' || !s.crazy.queueLocked);
        payload.talk.actions.crazyAssign = payload.talk.crazy.canAssign;
      }
    }
    return payload;
  }
  return { create, apply, membership, view, order, shuffle, list, followUps, starter, timerDue, crazyDue, conversationMode, crazySource, crazyRange, archiveEntries, ackArchive, resetCarry };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_ENGINE;
