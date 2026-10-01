(function (root) {
'use strict';
const RULES = typeof module === 'object' && module.exports ? require('./chat-wolf-v3-rules.js') : root.CHAT_WOLF_V3_RULES;
const CONTENT = typeof module === 'object' && module.exports ? require('./chat-wolf-v4-content.js') : root.CHAT_WOLF_V4_CONTENT;
const contentFor = room => (room.flowVersion || 3) < 4 && CONTENT.legacy ? CONTENT.legacy : CONTENT;
const PHASES = Object.freeze(Object.fromEntries(['LOBBY', 'ROLE_REVEAL', 'TALK', 'WRAP_UP', 'FINAL_CLUES', 'MEETING_DISCUSS', 'MEETING_TURNS', 'VOTING', 'JUDGE_DECISION', 'FINISHED'].map(p => [p, p])));
const clone = value => JSON.parse(JSON.stringify(value));
class GameError extends Error {
  constructor(code, status = 400) { super(code); this.name = 'GameError'; this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new GameError(code, status); };
function integer(value, limits, code = 'INVALID_SETTING') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < limits[0] || n > limits[1]) fail(code);
  return n;
}
function cleanName(value) {
  const name = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 24) fail('INVALID_NAME');
  return name;
}
function normalizeSettings(input = {}) {
  const s = { ...RULES.defaults, ...input, mode: RULES.mode };
  for (const [key, limits] of Object.entries(RULES.limits)) s[key] = integer(s[key], limits);
  for (const key of ['jesterEnabled', 'jesterTieWins']) if (typeof s[key] !== 'boolean') fail('INVALID_SETTING');
  if (!['host_confirm', 'automatic'].includes(s.talkEndBehavior)) fail('INVALID_SETTING');
  if (s.wolfCount + (s.jesterEnabled ? 1 : 0) + 2 > s.playerCount) fail('INVALID_WOLF_COUNT');
  if (s.interactionTaskCount > s.taskCount) fail('INVALID_TASK_COUNTS');
  const valid = RULES.professions.map(p => p.id);
  if (!Array.isArray(s.enabledProfessions) || s.enabledProfessions.some(id => !valid.includes(id))) fail('INVALID_PROFESSIONS');
  s.enabledProfessions = [...new Set(s.enabledProfessions)];
  if (s.roundCount < 2 && RULES.professions.some(p => p.requiresMidgame && s.enabledProfessions.includes(p.id))) fail('PROFESSION_NEEDS_MIDGAME');
  s.topicId = String(s.topicId || 'random');
  if (s.topicId !== 'random' && !CONTENT.topics.some(t => t.id === s.topicId)) fail('INVALID_TOPIC');
  s.professionWeights = {};
  const weights = input.professionWeights || {};
  if (typeof weights !== 'object' || Array.isArray(weights)) fail('INVALID_SETTING');
  for (const id of valid) if (weights[id] != null) s.professionWeights[id] = integer(weights[id], [1, 10]);
  // Explicit allow-list: obsolete bell, personal-task and repeated-role options cannot leak into v3.
  return Object.fromEntries(Object.keys(RULES.defaults).map(key => [key, clone(s[key])]));
}
function makePlayer(id, name, isHost, now) {
  return { id, name: cleanName(name), isHost, ready: false, role: null, profession: null,
    roleAcknowledged: false, joinedAt: now, lastSeenAt: now, villageTask: null, reward: null, rerollsUsed: 0 };
}
function createRoom({ code, hostPlayerId, hostSessionHash, hostName, settings, now = Date.now(), seed }) {
  const room = { version: 3, rulesVersion: 3, flowVersion: 4, revision: 1, code, phase: PHASES.LOBBY,
    phaseVersion: 0, matchId: null, createdAt: now, updatedAt: now, hostPlayerId,
    settings: normalizeSettings(settings), players: {}, sessions: {}, gameNumber: 0,
    rngState: (Number(seed) >>> 0) || 0x6d2b79f5, recentTasks: [], topicHistory: [] };
  room.players[hostPlayerId] = makePlayer(hostPlayerId, hostName, true, now);
  room.sessions[hostSessionHash] = { playerId: hostPlayerId, createdAt: now };
  return room;
}
function ids(room) { return Object.keys(room.players || {}); }
function requireActor(room, id) { const p = room.players && room.players[id]; if (!p) fail('NOT_A_MEMBER', 403); return p; }
function requireHost(room, id) { const p = requireActor(room, id); if (!p.isHost || room.hostPlayerId !== id) fail('HOST_ONLY', 403); }
function requirePhase(room, ...phases) { if (!phases.includes(room.phase)) fail('WRONG_PHASE', 409); }
function completionPhases(room) { return (room.flowVersion || 3) >= 4 ? [PHASES.TALK] : RULES.completionPhases; }
function touch(room, now) { room.updatedAt = now; room.revision = (room.revision || 0) + 1; }
function random(room) {
  if (room.secureRandom) {
    if (!root.crypto || typeof root.crypto.getRandomValues !== 'function') fail('RANDOM_UNAVAILABLE', 503);
    return root.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  }
  let x = Number(room.rngState) >>> 0 || 0x6d2b79f5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  room.rngState = x >>> 0;
  return room.rngState / 4294967296;
}
function shuffle(room, values) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random(room) * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function addPlayer(room, { playerId, sessionHash, name, now = Date.now() }) {
  requirePhase(room, PHASES.LOBBY);
  if (room.sessions[sessionHash]) {
    if (room.sessions[sessionHash].playerId !== playerId) fail('SESSION_IN_USE', 409);
    return room;
  }
  if (room.players[playerId]) fail('PLAYER_EXISTS', 409);
  if (ids(room).length >= room.settings.playerCount) fail('ROOM_FULL', 409);
  const cleaned = cleanName(name);
  if (Object.values(room.players).some(p => p.name.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) fail('NAME_TAKEN', 409);
  room.players[playerId] = makePlayer(playerId, cleaned, false, now);
  room.sessions[sessionHash] = { playerId, createdAt: now };
  touch(room, now);
  return room;
}
function compatible(task, topic) {
  return (task.compatibleTopicIds || []).includes(topic.id) || (task.compatibleTopicTags || task.tags || []).some(tag => tag === '*' || topic.tags.includes(tag));
}
function sameSet(a, b) { return a.length === b.length && new Set(a).size === a.length && a.every(id => b.includes(id)); }
function stage(room, phase, now, seconds = null) {
  room.phase = phase; room.phaseVersion = (room.phaseVersion || 0) + 1;
  room.deadlineAt = seconds == null ? null : now + seconds * 1000;
  room.paused = false; room.pausedRemainingMs = null;
}
function clearMatch(room) {
  for (const key of ['topic', 'tasks', 'tasksFrozen', 'round', 'meeting', 'voting', 'ballots', 'voteHistory', 'judge', 'result',
    'lastVoteResult', 'deadlineAt', 'paused', 'pausedRemainingMs', 'activeFollowUp', 'usedFollowUpIds',
    'extensionSeconds', 'finalClues', 'finishedAt', 'talkClock', 'talkReminder', 'meetingBaseOrder',
    'meetingTimePlan', 'liveMeetingTurnSeconds', 'contentRepeatException']) delete room[key];
  for (const player of Object.values(room.players)) {
    player.role = null; player.profession = null; player.roleAcknowledged = false;
    player.villageTask = null; player.reward = null; player.rerollsUsed = 0;
  }
}
function remember(room, task) {
  room.recentTasks = [...(room.recentTasks || []), { id: task.id, mechanicKey: task.mechanicKey,
    family: task.family || null, topicId: room.topic.id }].slice(-RULES.historyLimit);
}
function chooseTask(room, pool, selected = []) {
  const candidates = pool.filter(t => !selected.some(s => s.id === t.id ||
    (s.mechanicKey && s.mechanicKey === t.mechanicKey) || (s.variantGroup && s.variantGroup === t.variantGroup)));
  if (!candidates.length) fail('NO_ELIGIBLE_TASKS', 409);
  const history = room.recentTasks || [];
  const age = task => history.map(h => h.id).lastIndexOf(task.id);
  const recentMechanics = new Set(history.map(h => h.mechanicKey));
  // Never relax within-match uniqueness. Old compatible IDs return oldest-first only when needed.
  return shuffle(room, candidates).sort((a, b) => {
    const aAge = age(a), bAge = age(b);
    if (aAge !== bAge) return aAge - bAge;
    const mechanicPenalty = Number(recentMechanics.has(a.mechanicKey)) - Number(recentMechanics.has(b.mechanicKey));
    if (mechanicPenalty) return mechanicPenalty;
    return Number(selected.some(t => t.family && t.family === a.family)) - Number(selected.some(t => t.family && t.family === b.family));
  })[0];
}
function prepareHistory(room) {
  const previous = room.exposureHistory || {};
  const history = room.exposureHistory = { version: 1, serial: Number(previous.serial) || 0,
    wolfTasks: Array.isArray(previous.wolfTasks) ? previous.wolfTasks.slice(-RULES.selection.canonicalWindow) : [],
    villageTasks: Array.isArray(previous.villageTasks) ? previous.villageTasks.slice(-RULES.selection.villageWindow) : [],
    deals: Array.isArray(previous.deals) ? previous.deals.slice(-RULES.selection.familyDeals) : [] };
  if (!room.historyLegacyImported) {
    const imported = [];
    for (const [index, task] of (room.recentTasks || []).entries()) {
      const mapped = CONTENT.legacyTaskMap?.[task.id];
      if (!mapped) continue;
      const source = /^w3-/.test(task.id) ? 'wolf' : 'village';
      const entry = { ...mapped, id: task.id, source, sequence: 0, at: 0, topicId: task.topicId || null,
        matchId: `${room.code}-legacy-import`, exposureId: `${room.code}-legacy-${index}-${task.id}` };
      const target = source === 'wolf' ? history.wolfTasks : history.villageTasks;
      if (!target.some(e => e.exposureId === entry.exposureId)) { target.push(entry); imported.push(entry); }
    }
    if (imported.length) history.deals.unshift({ matchId: `${room.code}-legacy-import`, sequence: 0,
      topicId: null, wolfGroups: imported.filter(e => e.source === 'wolf').map(e => e.variantGroup),
      allActionGroups: [...new Set(imported.map(e => e.variantGroup).filter(Boolean))],
      families: [...new Set(imported.map(e => e.family).filter(Boolean))], exception: false });
    room.historyLegacyImported = true;
  }
  // Taxonomy aliases can be consolidated in a content release. Apply those
  // same identities to persisted exposures, otherwise an older group name
  // would silently bypass the recent-variant window. Never alter dealt cards.
  const normalizeEntry = entry => CONTENT.normalizeHistoryEntry ? CONTENT.normalizeHistoryEntry(entry) : entry;
  const normalizeGroup = group => CONTENT.normalizeGroup ? CONTENT.normalizeGroup(group) : group;
  const normalizeFamily = family => CONTENT.normalizeFamily ? CONTENT.normalizeFamily(family) : family;
  history.wolfTasks = history.wolfTasks.slice(-RULES.selection.canonicalWindow).map(normalizeEntry);
  history.villageTasks = history.villageTasks.slice(-RULES.selection.villageWindow).map(normalizeEntry);
  history.deals = history.deals.slice(-RULES.selection.familyDeals).map(deal => ({ ...deal,
    ...(Array.isArray(deal.wolfGroups) ? { wolfGroups: [...new Set(deal.wolfGroups.map(normalizeGroup))] } : {}),
    ...(Array.isArray(deal.allActionGroups) ? { allActionGroups: [...new Set(deal.allActionGroups.map(normalizeGroup))] } : {}),
    ...(Array.isArray(deal.families) ? { families: [...new Set(deal.families.map(normalizeFamily))] } : {})
  }));
  return history;
}
function activeReviewed(task) { return task.active === true && task.status === 'active' && task.reviewed === true; }
function taskKey(task) { return task.canonicalTaskKey || task.id; }
function recordExposure(room, task, source, playerId, now) {
  const h = prepareHistory(room);
  const entry = { id: task.id, canonicalTaskKey: taskKey(task), variantGroup: task.variantGroup || task.mechanicKey,
    family: task.family || null, topicId: room.topic.id, matchId: room.matchId, source, at: now, sequence: h.serial,
    ...(playerId ? { playerId, roleId: room.players[playerId]?.profession || null } : {}),
    exposureId: `${room.matchId}:${source}:${playerId || 'team'}:${h.serial}:${taskKey(task)}` };
  const key = source === 'wolf' ? 'wolfTasks' : 'villageTasks';
  if (!h[key].some(e => e.exposureId === entry.exposureId)) h[key].push(entry);
  h[key] = h[key].slice(-(source === 'wolf' ? RULES.selection.canonicalWindow : RULES.selection.villageWindow));
  let deal = h.deals.find(d => d.matchId === room.matchId);
  if (!deal) { deal = { matchId: room.matchId, sequence: h.serial, at: now, topicId: room.topic.id,
    wolfGroups: [], allActionGroups: [], families: [], exception: !!room.contentRepeatException }; h.deals.push(deal); }
  if (source === 'wolf' && entry.variantGroup && !deal.wolfGroups.includes(entry.variantGroup)) deal.wolfGroups.push(entry.variantGroup);
  if ((source === 'wolf' || task.performanceGroup || room.players[playerId]?.profession === 'bait') && entry.variantGroup &&
      !deal.allActionGroups.includes(entry.variantGroup)) deal.allActionGroups.push(entry.variantGroup);
  if (entry.family && !deal.families.includes(entry.family)) deal.families.push(entry.family);
  h.deals = h.deals.slice(-RULES.selection.familyDeals);
  // Read-only legacy diagnostics remain available, but no longer control wolf exclusion.
  remember(room, task);
}
function selectWolfTasks(room, pool, allowRecentRepeat = false) {
  const h = prepareHistory(room), policy = RULES.selection;
  const recentGroups = h.deals.slice(-policy.variantDeals);
  const blockedAt = task => {
    const rows = h.wolfTasks.filter(e => e.canonicalTaskKey === taskKey(task));
    const deals = recentGroups.filter(d => (d.allActionGroups || d.wolfGroups || []).includes(task.variantGroup));
    return rows.length || deals.length ? Math.max(...rows.map(e => Number(e.sequence) || 0), ...deals.map(e => Number(e.sequence) || 0)) : -1;
  };
  const legal = pool.filter(t => activeReviewed(t) && t.canonicalTaskKey && t.variantGroup && t.family &&
    compatible(t, room.topic) && (t.requiredOtherPlayerCount || 0) <= ids(room).length - room.settings.wolfCount);
  const familyCounts = new Map();
  for (const deal of h.deals) for (const family of deal.families || []) familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
  const ordered = legal.map(task => ({ task, rank: -Math.log(Math.max(random(room), Number.EPSILON)) * (1 + (familyCounts.get(task.family) || 0)) }))
    .sort((a, b) => a.rank - b.rank).map(v => v.task);
  function search(candidates) {
    const wanted = { interaction: room.settings.interactionTaskCount,
      self_action: room.settings.taskCount - room.settings.interactionTaskCount };
    const groups = new Set(), keys = new Set(), selected = [];
    function fits(task, generic, voice) {
      return !groups.has(task.variantGroup) && !keys.has(taskKey(task)) &&
        generic + Number(task.isGeneric) <= policy.maxGeneric &&
        voice + Number(task.type === 'self_action' && task.performanceGroup === 'voice') <= policy.maxVoicePerformance;
    }
    function visit(remainingI, remainingS, startI, startS, generic, voice) {
      if (!remainingI && !remainingS) return selected.slice();
      const byType = {};
      for (const type of ['interaction', 'self_action']) {
        const minimum = type === 'interaction' ? startI : startS;
        byType[type] = candidates.map((task, index) => ({ task, index })).filter(v =>
          v.index >= minimum && v.task.type === type && fits(v.task, generic, voice));
        const needed = type === 'interaction' ? remainingI : remainingS;
        if (new Set(byType[type].map(v => v.task.variantGroup)).size < needed) return null;
        if (needed && byType[type].filter(v => !v.task.isGeneric).length + (policy.maxGeneric - generic) < needed) return null;
        if (type === 'self_action' && needed && byType[type].filter(v => v.task.performanceGroup !== 'voice').length + (policy.maxVoicePerformance - voice) < needed) return null;
      }
      const type = remainingI && (!remainingS || byType.interaction.length <= byType.self_action.length) ? 'interaction' : 'self_action';
      for (const { task, index } of byType[type]) {
        selected.push(task); groups.add(task.variantGroup); keys.add(taskKey(task));
        const result = visit(remainingI - Number(type === 'interaction'), remainingS - Number(type === 'self_action'),
          type === 'interaction' ? index + 1 : startI, type === 'self_action' ? index + 1 : startS,
          generic + Number(task.isGeneric), voice + Number(task.type === 'self_action' && task.performanceGroup === 'voice'));
        if (result) return result;
        selected.pop(); groups.delete(task.variantGroup); keys.delete(taskKey(task));
      }
      return null;
    }
    return visit(wanted.interaction, wanted.self_action, 0, 0, 0, 0);
  }
  let selected = search(ordered.filter(t => blockedAt(t) < 0));
  if (selected) return { tasks: selected, exception: false };
  if (allowRecentRepeat) {
    // Restore the oldest blocked exposure waves gradually; content/type and
    // within-deal quality constraints are never relaxed, even with consent.
    const levels = [...new Set(ordered.map(blockedAt).filter(n => n >= 0))].sort((a, b) => a - b);
    for (const level of levels) {
      selected = search(ordered.filter(t => blockedAt(t) <= level));
      if (selected) return { tasks: selected, exception: true };
    }
  }
  fail('CONTENT_EXHAUSTED', 409);
}
function chooseVillageTask(room, pool, currentId = null) {
  const history = prepareHistory(room).villageTasks;
  const candidates = pool.filter(t => activeReviewed(t) && t.id !== currentId);
  if (!candidates.length) fail('CONTENT_EXHAUSTED', 409);
  const recentIndex = t => history.map(e => e.canonicalTaskKey).lastIndexOf(taskKey(t));
  return shuffle(room, candidates).sort((a, b) => recentIndex(a) - recentIndex(b))[0];
}
function weightedProfession(room, available) {
  const total = available.reduce((sum, p) => sum + (room.settings.professionWeights[p.id] || 1), 0);
  let cursor = random(room) * total;
  for (const p of available) { cursor -= room.settings.professionWeights[p.id] || 1; if (cursor < 0) return p; }
  return available[available.length - 1];
}
function chooseTopic(room, pool) {
  const recent = (room.topicHistory || []).slice(-RULES.selection.familyDeals);
  const categories = recent.map(id => CONTENT.topics.find(t => t.id === id)?.category).filter(Boolean);
  // Soft preference, not a fixed category cycle. Explicitly chosen topics are
  // still allowed; a one-item pool must never be excluded by this history.
  return pool.map(topic => ({ topic, rank: -Math.log(Math.max(random(room), Number.EPSILON)) *
    (1 + 3 * recent.filter(id => id === topic.id).length + categories.filter(c => c === topic.category).length) }))
    .sort((a, b) => a.rank - b.rank)[0]?.topic;
}
function startGame(room, now, keepTopic = false, changeTopic = false, allowRecentRepeat = false) {
  if (ids(room).length !== room.settings.playerCount) fail('WAITING_FOR_PLAYERS', 409);
  const savedTopic = keepTopic && room.topic ? clone(CONTENT.topics.find(t =>
    t.id === room.topic.id || t.id === CONTENT.legacyTopicMap?.[room.topic.id]) || room.topic) : null;
  const oldTopicId = room.topic && room.topic.id;
  room.settings = normalizeSettings({ ...room.settings,
    topicId: room.settings.topicId === 'random' || CONTENT.topics.some(t => t.id === room.settings.topicId) ? room.settings.topicId : 'random' });
  prepareHistory(room);
  clearMatch(room);
  room.flowVersion = 4;
  room.contentVersion = CONTENT.version;
  room.gameNumber += 1;
  room.matchId = `${room.code}-${room.gameNumber}-${Math.floor(random(room) * 0x100000000).toString(16).padStart(8, '0')}`;
  room.round = 0; room.tasks = []; room.tasksFrozen = false; room.voteHistory = [];
  room.ballots = {}; room.voting = null; room.judge = null; room.activeFollowUp = null;
  room.usedFollowUpIds = []; room.extensionSeconds = 0; room.finalClues = null;
  room.liveMeetingTurnSeconds = room.settings.meetingTurnSeconds;
  room.meetingTimePlan = Array.from({ length: room.settings.roundCount }, () => Array(room.settings.playerCount).fill(room.settings.meetingTurnSeconds));
  let topicPool = CONTENT.topics;
  if (room.settings.topicId !== 'random' && !savedTopic && !changeTopic) topicPool = topicPool.filter(t => t.id === room.settings.topicId);
  else if (!savedTopic && topicPool.length > 1) topicPool = topicPool.filter(t => t.id !== oldTopicId);
  room.topic = savedTopic || clone(chooseTopic(room, topicPool));
  if (!room.topic) fail('INVALID_TOPIC');
  room.topicHistory = [...(room.topicHistory || []), room.topic.id].slice(-RULES.historyLimit);
  const order = shuffle(room, ids(room));
  order.forEach((id, index) => { room.players[id].role = index < room.settings.wolfCount ? 'WOLF' :
    room.settings.jesterEnabled && index === room.settings.wolfCount ? 'JESTER' : 'VILLAGER'; });
  let available = RULES.professions.filter(p => room.settings.enabledProfessions.includes(p.id));
  let informationRoles = 0;
  for (const id of shuffle(room, ids(room).filter(id => room.players[id].role === 'VILLAGER'))) {
    const eligible = available.filter(p => !p.informationRole || informationRoles < room.settings.infoRoleLimit);
    if (!eligible.length) continue; // User-requested ordinary-villager fallback; never invent an unchecked profession.
    const profession = weightedProfession(room, eligible);
    room.players[id].profession = profession.id;
    if (profession.informationRole) informationRoles++;
    available = available.filter(p => p.id !== profession.id);
  }
  const nonWolfCount = order.length - room.settings.wolfCount;
  const pool = CONTENT.wolfTasks.filter(t => compatible(t, room.topic) && (t.requiredOtherPlayerCount || 0) <= nonWolfCount);
  const selected = selectWolfTasks(room, pool, allowRecentRepeat);
  room.contentRepeatException = selected.exception;
  room.tasks = selected.tasks.map(task => ({ ...clone(task), completed: null }));
  for (const player of Object.values(room.players)) {
    if (!player.profession) continue;
    const card = clone(chooseVillageTask(room, CONTENT.villageTasks.filter(t => t.roleId === player.profession && compatible(t, room.topic))));
    player.villageTask = { ...card, completed: null };
    player.reward = { type: RULES.professions.find(p => p.id === player.profession).rewardType,
      unlocked: false, used: false, result: null, unlockedAfterMidgameCount: null };
  }
  // A failed allocation never reaches this point; dispatch commits this entire
  // candidate room together, including exposure before any player read/ACK.
  room.exposureHistory.serial++;
  for (const task of room.tasks) recordExposure(room, task, 'wolf', null, now);
  for (const player of Object.values(room.players)) if (player.villageTask) recordExposure(room, player.villageTask, 'village', player.id, now);
  stage(room, PHASES.ROLE_REVEAL, now);
}
function useFollowUp(room, requestedId) {
  const available = room.topic.followUps.filter(t => !room.usedFollowUpIds.includes(t.id));
  const question = requestedId ? available.find(t => t.id === requestedId) : shuffle(room, available)[0];
  if (!question) fail(requestedId ? 'INVALID_FOLLOW_UP' : 'NO_MORE_FOLLOW_UPS', 409);
  room.activeFollowUp = clone(question); room.usedFollowUpIds.push(question.id);
}
function beginTalk(room, round, now) {
  room.round = round; room.meeting = null; room.voting = null; room.ballots = {}; room.judge = null;
  // Follow-ups are manual in every round; no task or question is silently replaced.
  // Only an already-running older snapshot retains its previously released rule.
  if ((room.flowVersion || 3) < 4 && round === 2 && room.topic.followUps.some(t => !room.usedFollowUpIds.includes(t.id))) useFollowUp(room);
  const hostConfirm = room.flowVersion >= 4 && room.settings.talkEndBehavior !== 'automatic';
  stage(room, PHASES.TALK, now, hostConfirm ? null : room.settings.talkSeconds);
  if (room.flowVersion >= 4) {
    room.talkClock = { elapsedMs: 0, activeSince: now, suggestedSeconds: room.settings.talkSeconds };
    room.talkReminder = { due: false, remindAtElapsedMs: room.settings.talkSeconds * 1000, number: 0 };
  }
}
function talkElapsedMs(room, now) {
  if (!room.talkClock) return 0;
  return room.talkClock.elapsedMs + (room.talkClock.activeSince == null ? 0 : Math.max(0, now - room.talkClock.activeSince));
}
function stopTalkClock(room, now) {
  if (!room.talkClock) return;
  room.talkClock.elapsedMs = talkElapsedMs(room, now); room.talkClock.activeSince = null;
}
function estimateRoomSeconds(room) {
  if ((room.flowVersion || 3) < 4) return room.settings.roundCount *
    (room.settings.talkSeconds + room.settings.wrapUpSeconds + room.settings.meetingSeconds + room.settings.voteSeconds)
    + room.settings.clueSeconds + (room.settings.enabledProfessions.includes('judge') ? room.settings.judgeSeconds : 0) + (room.extensionSeconds || 0);
  const base = RULES.estimateSeconds(room.settings);
  const meeting = room.meetingTimePlan ? room.meetingTimePlan.flat().reduce((sum, seconds) => sum + seconds, 0) :
    room.settings.roundCount * room.settings.playerCount * room.settings.meetingTurnSeconds;
  return base + meeting - room.settings.roundCount * room.settings.playerCount * room.settings.meetingTurnSeconds + (room.extensionSeconds || 0);
}
function completedMidgames(room) { return (room.voteHistory || []).filter(v => v.type === 'MIDGAME'); }
function freezeTasks(room) {
  if (room.tasksFrozen) return;
  room.tasksFrozen = true;
  const positives = room.tasks.flatMap(t => t.positiveClues || []);
  const content = contentFor(room);
  // Running v4 snapshots keep their exact wording and progress, but a newly
  // corrected semantic tag must also protect their final exclusion clues.
  const clueTasks = (room.flowVersion || 3) >= 4 && content.normalizeTasks ? content.normalizeTasks(room.tasks) : room.tasks;
  const actualTags = new Set(clueTasks.flatMap(t => t.actionTags || []));
  const possibleTags = new Set(content.wolfTasks.filter(t => compatible(t, room.topic) && ((room.flowVersion || 3) < 4 || activeReviewed(t))).flatMap(t => t.actionTags || []));
  const negatives = Object.entries(content.exclusionClues || {}).filter(([tag]) => possibleTags.has(tag) && !actualTags.has(tag));
  room.finalClues = { positive: shuffle(room, positives)[0] || null, negative: shuffle(room, negatives)[0]?.[1] || null };
  for (const player of Object.values(room.players)) {
    if (!player.reward?.unlocked) continue;
    const text = player.profession === 'veteran' ? room.finalClues.positive : player.profession === 'contrarian' ? room.finalClues.negative : null;
    if (['veteran', 'contrarian'].includes(player.profession)) {
      // Missing content is explicit, never substitute a fabricated or identifying clue.
      player.reward.result = text ? { text } : { text: 'No safe clue is available for this set of tasks.' };
      player.reward.used = true;
    }
  }
}
function beginMeeting(room, now) {
  room.meeting = { round: room.round, type: room.round === room.settings.roundCount ? 'FINAL' : 'MIDGAME' };
  if (room.flowVersion >= 4) {
    if (!room.meetingBaseOrder) room.meetingBaseOrder = shuffle(room, ids(room));
    const start = (room.round - 1) % room.meetingBaseOrder.length;
    const order = [...room.meetingBaseOrder.slice(start), ...room.meetingBaseOrder.slice(0, start)];
    Object.assign(room.meeting, { id: `${room.matchId}-meeting-${room.round}`, order, speakerIndex: 0,
      completedPlayerIds: [], turns: [], turnSeconds: room.liveMeetingTurnSeconds,
      nextTurnSeconds: room.liveMeetingTurnSeconds });
    stage(room, PHASES.MEETING_TURNS, now, room.meeting.turnSeconds);
    return;
  }
  stage(room, PHASES.MEETING_DISCUSS, now, room.settings.meetingSeconds);
}
function endMeetingTurn(room, now, reason) {
  const meeting = room.meeting;
  const speakerId = meeting.order[meeting.speakerIndex];
  meeting.completedPlayerIds.push(speakerId);
  meeting.turns.push({ playerId: speakerId, seconds: meeting.turnSeconds, endedAt: now, reason });
  meeting.speakerIndex++;
  if (meeting.speakerIndex >= meeting.order.length) { beginVote(room, now); return; }
  meeting.turnSeconds = meeting.nextTurnSeconds;
  stage(room, PHASES.MEETING_TURNS, now, meeting.turnSeconds);
}
function endTalk(room, now) {
  stopTalkClock(room, now);
  if (room.round === room.settings.roundCount) {
    freezeTasks(room);
    if (room.settings.clueSeconds > 0) stage(room, PHASES.FINAL_CLUES, now, room.settings.clueSeconds);
    else beginMeeting(room, now);
  } else beginMeeting(room, now);
}
function beginVote(room, now) {
  room.voting = { id: `${room.matchId}-vote-${room.round}`, round: room.round,
    type: room.round === room.settings.roundCount ? 'FINAL' : 'MIDGAME' };
  room.ballots = {};
  stage(room, PHASES.VOTING, now, room.settings.voteSeconds);
}
function ballotSelections(room, actorId, value, allowed = ids(room), min = 0, max = room.settings.wolfCount, allowSelf = false) {
  if (!Array.isArray(value) || value.length < min || value.length > max || new Set(value).size !== value.length ||
      value.some(id => typeof id !== 'string' || !allowed.includes(id) || (!allowSelf && id === actorId))) fail('INVALID_SELECTION');
  return value.slice();
}
function boundary(room, tallies) {
  const positive = ids(room).filter(id => tallies[id] > 0).sort((a, b) => tallies[b] - tallies[a]);
  const count = room.settings.wolfCount;
  if (positive.length <= count) return { fixed: positive, candidates: [], seats: 0 };
  const edge = tallies[positive[count - 1]];
  const fixed = positive.filter(id => tallies[id] > edge);
  const candidates = positive.filter(id => tallies[id] === edge);
  const seats = count - fixed.length;
  return candidates.length <= seats ? { fixed: positive.slice(0, count), candidates: [], seats: 0 } : { fixed, candidates, seats };
}
function finish(room, outcome, reason, now) {
  stopTalkClock(room, now);
  room.tasksFrozen = true; room.result = { outcome, reason }; room.finishedAt = now;
  stage(room, PHASES.FINISHED, now);
}
function jesterStatus(room, record) {
  const playerId = ids(room).find(id => room.players[id].role === 'JESTER') || null;
  const votes = playerId ? record.tallies[playerId] : 0;
  const maximum = Math.max(0, ...Object.values(record.tallies));
  const leaders = ids(room).filter(id => record.tallies[id] === maximum);
  return { playerId, votes, maximum, tiedHighest: maximum > 0 && leaders.length > 1,
    tieWins: room.settings.jesterTieWins,
    qualified: !!playerId && votes > 0 && votes === maximum && (room.settings.jesterTieWins || leaders.length === 1) };
}
function awardBait(room, record) {
  const count = completedMidgames(room).length;
  for (const player of Object.values(room.players)) {
    if (player.profession !== 'bait' || !player.reward.unlocked || player.reward.used || count <= player.reward.unlockedAfterMidgameCount) continue;
    player.reward.result = { meetingId: record.id, playerIds: ids(room).filter(id => (record.ballots[id] || []).includes(player.id)) };
    player.reward.used = true;
  }
}
function resolveRecord(room, record, nominees, now) {
  record.nominees = nominees.slice(); record.resolvedAt = now;
  room.voteHistory.push(record); room.lastVoteResult = { id: record.id, round: record.round, type: record.type, nominees: record.nominees };
  room.ballots = {}; room.voting = null;
  const wolves = ids(room).filter(id => room.players[id].role === 'WOLF');
  if (record.type === 'MIDGAME') awardBait(room, record);
  if (sameSet(record.nominees, wolves)) { finish(room, 'VILLAGERS', 'FULL_IDENTIFICATION', now); return; }
  if (record.type === 'MIDGAME') { beginTalk(room, room.round + 1, now); return; }
  record.jester = jesterStatus(room, record);
  if (record.jester.qualified) { finish(room, 'JESTER', 'JESTER_TOP_VOTE', now); return; }
  const allDone = room.tasks.length === room.settings.taskCount && room.tasks.every(t => !!t.completed);
  finish(room, allDone ? 'WOLVES' : 'DRAW', allDone ? 'ALL_TASKS_REPORTED' : 'TASKS_INCOMPLETE', now);
}
function closeVote(room, now) {
  const ballots = clone(room.ballots || {});
  const tallies = Object.fromEntries(ids(room).map(id => [id, 0]));
  for (const selections of Object.values(ballots)) for (const id of selections) tallies[id]++;
  const record = { ...room.voting, ballots, tallies, nominees: [], closedAt: now };
  const edge = boundary(room, tallies);
  const judges = ids(room).filter(id => room.players[id].profession === 'judge' && room.players[id].reward?.unlocked);
  if (record.type === 'FINAL' && edge.seats && judges.length) {
    room.judge = { ...edge, judges, nominations: {}, record };
    room.voting = null; room.ballots = {};
    stage(room, PHASES.JUDGE_DECISION, now, room.settings.judgeSeconds);
    return;
  }
  const choices = edge.seats ? shuffle(room, edge.candidates).slice(0, edge.seats) : [];
  if (edge.seats) record.judgeResult = { candidates: edge.candidates, seats: edge.seats, chosen: choices, method: 'RANDOM', judgeIds: [], nominations: {} };
  resolveRecord(room, record, [...edge.fixed, ...choices], now);
}
function closeJudge(room, now) {
  const j = room.judge;
  const nominations = Object.fromEntries(j.candidates.map(id => [id, 0]));
  for (const selections of Object.values(j.nominations)) for (const id of selections) nominations[id]++;
  const chosen = shuffle(room, j.candidates).sort((a, b) => nominations[b] - nominations[a]).slice(0, j.seats);
  const record = j.record;
  record.judgeResult = { candidates: j.candidates.slice(), seats: j.seats, chosen,
    method: Object.keys(j.nominations).length ? 'JUDGE' : 'RANDOM', judgeIds: j.judges.slice(), nominations: clone(j.nominations) };
  for (const id of j.judges) room.players[id].reward.used = true;
  resolveRecord(room, record, [...j.fixed, ...chosen], now);
}
function advanceOne(room, now) {
  switch (room.phase) {
    case PHASES.TALK:
      if (room.flowVersion >= 4 && room.settings.talkEndBehavior !== 'automatic') return false;
      stopTalkClock(room, now);
      if (room.settings.wrapUpSeconds) stage(room, PHASES.WRAP_UP, now, room.settings.wrapUpSeconds);
      else endTalk(room, now);
      break;
    case PHASES.WRAP_UP: endTalk(room, now); break;
    case PHASES.FINAL_CLUES: beginMeeting(room, now); break;
    case PHASES.MEETING_DISCUSS: beginVote(room, now); break;
    case PHASES.MEETING_TURNS: endMeetingTurn(room, now, 'timeout'); break;
    case PHASES.VOTING: closeVote(room, now); break;
    case PHASES.JUDGE_DECISION: closeJudge(room, now); break;
    default: return false;
  }
  return true;
}
function advanceExpired(room, now = Date.now()) {
  if (!room || room.paused) return false;
  let changed = false;
  if (room.flowVersion >= 4 && room.phase === PHASES.TALK && room.settings.talkEndBehavior !== 'automatic' &&
      room.talkReminder && !room.talkReminder.due && talkElapsedMs(room, now) >= room.talkReminder.remindAtElapsedMs) {
    room.talkReminder.due = true; room.talkReminder.number++; changed = true;
  }
  // Anchor to authoritative host time, not an old deadline. Zero-second stages may pass immediately.
  for (let i = 0; i < 12 && room.deadlineAt != null && room.deadlineAt <= now; i++) {
    if (!advanceOne(room, now)) break;
    changed = true;
  }
  if (changed) touch(room, now);
  return changed;
}
function personalTask(room, player, id) {
  const task = player.role === 'WOLF' ? room.tasks.find(t => t.id === id) : player.villageTask?.id === id ? player.villageTask : null;
  if (!task) fail('TASK_NOT_AVAILABLE', 403);
  return task;
}
function useReward(room, player, payload) {
  requirePhase(room, PHASES.TALK);
  if (room.tasksFrozen || !player.reward?.unlocked) fail('REWARD_NOT_AVAILABLE', 409);
  if (player.reward.used) fail('REWARD_ALREADY_USED', 409);
  const meeting = completedMidgames(room).find(m => m.id === payload.meetingId);
  if (!meeting) fail('REWARD_NEEDS_FINISHED_MIDGAME', 409);
  if (player.profession === 'reporter') {
    if (!room.players[payload.targetId] || payload.targetId === player.id) fail('INVALID_TARGET');
    const selections = (meeting.ballots[payload.targetId] || []).slice();
    player.reward.result = { meetingId: meeting.id, targetId: payload.targetId, selections, abstained: !selections.length };
  } else if (player.profession === 'dreamer') {
    player.reward.result = { meetingId: meeting.id, playerIds: ids(room).filter(id => meeting.tallies[id] === 0) };
  } else fail('REWARD_NOT_AVAILABLE', 409);
  player.reward.used = true;
}
function applyCommand(room, actorId, action, payload, now) {
  const actor = requireActor(room, actorId);
  actor.lastSeenAt = now;
  if (action === 'heartbeat') return;
  if (room.paused && !['resume', 'cancelGame', 'restart', 'extendTalk', 'setMeetingTurnSeconds'].includes(action)) fail('GAME_PAUSED', 409);
  switch (action) {
    case 'ready': requirePhase(room, PHASES.LOBBY); actor.ready = !!payload.ready; break;
    case 'settings': {
      requireHost(room, actorId); requirePhase(room, PHASES.LOBBY);
      const settings = normalizeSettings({ ...room.settings, ...payload.settings });
      if (settings.playerCount < ids(room).length) fail('PLAYER_COUNT_TOO_SMALL', 409);
      room.settings = settings; break;
    }
    case 'removePlayer': {
      requireHost(room, actorId); requirePhase(room, PHASES.LOBBY);
      if (payload.playerId === room.hostPlayerId) fail('CANNOT_REMOVE_HOST');
      requireActor(room, payload.playerId);
      delete room.players[payload.playerId];
      for (const [token, session] of Object.entries(room.sessions)) if (session.playerId === payload.playerId) delete room.sessions[token];
      break;
    }
    case 'startGame': requireHost(room, actorId); requirePhase(room, PHASES.LOBBY); startGame(room, now, false, false, payload.allowRecentRepeat === true); break;
    case 'restart': requireHost(room, actorId); if (room.phase === PHASES.LOBBY) fail('WRONG_PHASE', 409); if (room.phase === PHASES.JUDGE_DECISION) fail('JUDGE_PENDING', 409); startGame(room, now, payload.keepTopic === true, payload.keepTopic !== true, payload.allowRecentRepeat === true); break;
    case 'ackRole': requirePhase(room, PHASES.ROLE_REVEAL); actor.roleAcknowledged = true; break;
    case 'beginTalk': requireHost(room, actorId); requirePhase(room, PHASES.ROLE_REVEAL); beginTalk(room, 1, now); break;
    case 'endTalk': requireHost(room, actorId); requirePhase(room, PHASES.TALK, PHASES.WRAP_UP); endTalk(room, now); break;
    case 'endClues': requireHost(room, actorId); requirePhase(room, PHASES.FINAL_CLUES); beginMeeting(room, now); break;
    case 'endMeeting': requireHost(room, actorId); requirePhase(room, PHASES.MEETING_DISCUSS, PHASES.MEETING_TURNS); beginVote(room, now); break;
    case 'endMeetingTurn':
    case 'skipMeetingTurn': {
      requirePhase(room, PHASES.MEETING_TURNS);
      if (payload.meetingId != null && payload.meetingId !== room.meeting.id) fail('STALE_ACTION', 409);
      if (room.meeting.order[room.meeting.speakerIndex] !== actorId) requireHost(room, actorId);
      endMeetingTurn(room, now, action === 'skipMeetingTurn' ? 'skipped' : 'ended'); break;
    }
    case 'setMeetingTurnSeconds': {
      requireHost(room, actorId); requirePhase(room, PHASES.MEETING_TURNS);
      const seconds = integer(payload.seconds, RULES.limits.meetingTurnSeconds);
      room.liveMeetingTurnSeconds = seconds; room.meeting.nextTurnSeconds = seconds;
      for (let r = room.round - 1; r < room.meetingTimePlan.length; r++) {
        const start = r === room.round - 1 ? room.meeting.speakerIndex + 1 : 0;
        for (let i = start; i < room.meetingTimePlan[r].length; i++) room.meetingTimePlan[r][i] = seconds;
      }
      break;
    }
    case 'endVote': requireHost(room, actorId); requirePhase(room, PHASES.VOTING); closeVote(room, now); break;
    case 'extendTalk': {
      requireHost(room, actorId); requirePhase(room, PHASES.TALK, PHASES.WRAP_UP);
      const seconds = integer(payload.seconds, [10, RULES.maxExtensionSeconds]);
      const paused = room.paused;
      if (room.flowVersion >= 4 && room.phase === PHASES.TALK && room.settings.talkEndBehavior !== 'automatic') {
        room.talkReminder.remindAtElapsedMs = talkElapsedMs(room, now) + seconds * 1000;
        room.talkReminder.due = false; room.extensionSeconds += seconds; break;
      }
      if (room.phase === PHASES.WRAP_UP) {
        stage(room, PHASES.TALK, now, seconds);
        if (paused) { room.paused = true; room.pausedRemainingMs = seconds * 1000; room.deadlineAt = null; }
      } else if (paused) room.pausedRemainingMs += seconds * 1000;
      else room.deadlineAt += seconds * 1000;
      room.extensionSeconds += seconds; break;
    }
    case 'pause': {
      requireHost(room, actorId);
      if (room.deadlineAt == null && !(room.flowVersion >= 4 && room.phase === PHASES.TALK)) fail('WRONG_PHASE', 409);
      stopTalkClock(room, now);
      room.pausedRemainingMs = room.deadlineAt == null ? null : Math.max(0, room.deadlineAt - now);
      room.deadlineAt = null; room.paused = true;
      room.phaseVersion++; break;
    }
    case 'resume': {
      requireHost(room, actorId);
      if (!room.paused) fail('NOT_PAUSED', 409);
      room.deadlineAt = room.pausedRemainingMs == null ? null : now + room.pausedRemainingMs;
      if (room.phase === PHASES.TALK && room.talkClock) room.talkClock.activeSince = now;
      room.paused = false; room.pausedRemainingMs = null;
      room.phaseVersion++; break;
    }
    case 'cancelGame': requireHost(room, actorId); if ([PHASES.LOBBY, PHASES.FINISHED].includes(room.phase)) fail('WRONG_PHASE', 409); if (room.phase === PHASES.JUDGE_DECISION) fail('JUDGE_PENDING', 409); finish(room, 'CANCELLED', 'HOST_CANCELLED', now); break;
    case 'replay':
      requireHost(room, actorId); requirePhase(room, PHASES.FINISHED); clearMatch(room); room.matchId = null;
      for (const player of Object.values(room.players)) player.ready = false;
      stage(room, PHASES.LOBBY, now); break;
    case 'followUp': requireHost(room, actorId); requirePhase(room, PHASES.TALK, PHASES.WRAP_UP); useFollowUp(room, payload.followUpId); break;
    case 'clearFollowUp': requireHost(room, actorId); requirePhase(room, PHASES.TALK, PHASES.WRAP_UP); room.activeFollowUp = null; break;
    case 'completeTask': {
      requirePhase(room, ...completionPhases(room));
      if (room.tasksFrozen) fail('TASKS_FROZEN', 409);
      const task = personalTask(room, actor, payload.taskId);
      if (task.completed) break;
      task.completed = { matchId: room.matchId, taskId: task.id, by: actor.id, at: now, round: room.round };
      if (actor.role === 'VILLAGER') {
        actor.reward.unlocked = true; actor.reward.unlockedAfterMidgameCount = completedMidgames(room).length;
      }
      break;
    }
    case 'undoTask': {
      requirePhase(room, ...completionPhases(room));
      if (room.tasksFrozen) fail('TASKS_FROZEN', 409);
      const task = personalTask(room, actor, payload.taskId);
      if (actor.reward?.used) fail('REWARD_ALREADY_USED', 409);
      task.completed = null;
      if (actor.reward) { actor.reward.unlocked = false; actor.reward.unlockedAfterMidgameCount = null; }
      break;
    }
    case 'rerollTask': {
      requirePhase(room, PHASES.ROLE_REVEAL);
      if (!actor.villageTask || actor.rerollsUsed >= room.settings.rerollLimit) fail('REROLL_NOT_AVAILABLE', 409);
      const pool = contentFor(room).villageTasks.filter(t => t.roleId === actor.profession && compatible(t, room.topic) && t.id !== actor.villageTask.id);
      const card = clone(room.flowVersion >= 4 ? chooseVillageTask(room, pool, actor.villageTask.id) : chooseTask(room, pool));
      actor.villageTask = { ...card, completed: null }; actor.rerollsUsed++;
      if (room.flowVersion >= 4) { prepareHistory(room).serial++; recordExposure(room, card, 'village', actor.id, now); }
      else remember(room, card);
      break;
    }
    case 'useReward': useReward(room, actor, payload); break;
    case 'submitVote': {
      requirePhase(room, PHASES.VOTING);
      if (Object.prototype.hasOwnProperty.call(room.ballots, actor.id)) fail('ALREADY_VOTED', 409);
      room.ballots[actor.id] = ballotSelections(room, actor.id, payload.selections);
      if (Object.keys(room.ballots).length === ids(room).length) closeVote(room, now);
      break;
    }
    case 'judgeVote': {
      requirePhase(room, PHASES.JUDGE_DECISION);
      if (!room.judge.judges.includes(actor.id)) fail('JUDGE_ONLY', 403);
      if (room.judge.nominations[actor.id]) fail('ALREADY_VOTED', 409);
      room.judge.nominations[actor.id] = ballotSelections(room, actor.id, payload.selections, room.judge.candidates, room.judge.seats, room.judge.seats, true);
      if (Object.keys(room.judge.nominations).length === room.judge.judges.length) closeJudge(room, now);
      break;
    }
    default: fail('UNKNOWN_ACTION');
  }
}
function dispatch(room, actorId, action, payload = {}, now = Date.now()) {
  if (!room) fail('ROOM_NOT_FOUND', 404);
  requireActor(room, actorId);
  if (payload.matchId !== undefined && payload.matchId !== room.matchId) fail('STALE_MATCH', 409);
  if (payload.phaseVersion !== undefined && payload.phaseVersion !== room.phaseVersion) fail('STALE_ACTION', 409);
  const version = room.phaseVersion;
  advanceExpired(room, now);
  if (room.phaseVersion !== version && action !== 'heartbeat') fail('STALE_ACTION', 409);
  const next = clone(room);
  applyCommand(next, actorId, action, payload, now);
  if (action !== 'heartbeat') touch(next, now);
  for (const key of Object.keys(room)) delete room[key];
  Object.assign(room, next);
  return room;
}
function taskView(task) { return { id: task.id, text: task.text,
  ...(task.textZh ? { textZh: task.textZh } : {}), ...(task.example ? { example: task.example } : {}),
  ...(task.exampleZh ? { exampleZh: task.exampleZh } : {}),
  ...(task.type ? { type: task.type } : {}), completed: task.completed ? clone(task.completed) : null }; }
function publicVote(vote) { return { id: vote.id, round: vote.round, type: vote.type, nominees: vote.nominees.slice() }; }
function rewardView(room, actor) {
  if (!actor.reward) return null;
  const value = actor.reward;
  const eligibleMeetings = completedMidgames(room).map(m => ({ id: m.id, round: m.round }));
  return { type: value.type, unlocked: value.unlocked, used: value.used,
    available: !room.paused && room.phase === PHASES.TALK && !room.tasksFrozen && value.unlocked && !value.used && eligibleMeetings.length > 0 && ['reporter', 'dreamer'].includes(actor.profession),
    result: value.result ? clone(value.result) : null, eligibleMeetings,
    windowClosed: actor.profession === 'bait' && !value.used && completedMidgames(room).length >= room.settings.roundCount - 1 };
}
function projectState(room, actorId, now = Date.now()) {
  const actor = requireActor(room, actorId);
  const host = actor.isHost && room.hostPlayerId === actorId;
  const active = ![PHASES.LOBBY, PHASES.FINISHED].includes(room.phase);
  const talk = completionPhases(room).includes(room.phase) && !room.tasksFrozen && !room.paused;
  const reward = rewardView(room, actor);
  const actions = {
    canReady: room.phase === PHASES.LOBBY, canSettings: host && room.phase === PHASES.LOBBY,
    canStart: host && room.phase === PHASES.LOBBY && ids(room).length === room.settings.playerCount,
    canAckRole: room.phase === PHASES.ROLE_REVEAL && !actor.roleAcknowledged,
    canBeginTalk: host && room.phase === PHASES.ROLE_REVEAL,
    canEndTalk: host && !room.paused && [PHASES.TALK, PHASES.WRAP_UP].includes(room.phase), canExtendTalk: host && [PHASES.TALK, PHASES.WRAP_UP].includes(room.phase),
    canEndClues: host && !room.paused && room.phase === PHASES.FINAL_CLUES,
    canEndMeeting: host && !room.paused && [PHASES.MEETING_DISCUSS, PHASES.MEETING_TURNS].includes(room.phase),
    canEndMeetingTurn: !room.paused && room.phase === PHASES.MEETING_TURNS && (host || room.meeting.order[room.meeting.speakerIndex] === actorId),
    canSkipMeetingTurn: !room.paused && room.phase === PHASES.MEETING_TURNS && (host || room.meeting.order[room.meeting.speakerIndex] === actorId),
    canSetMeetingTurnSeconds: host && room.phase === PHASES.MEETING_TURNS,
    canEndVote: host && !room.paused && room.phase === PHASES.VOTING,
    canPause: host && !room.paused && (room.deadlineAt != null || (room.flowVersion >= 4 && room.phase === PHASES.TALK)),
    canResume: host && !!room.paused,
    canRestart: host && ![PHASES.LOBBY, PHASES.JUDGE_DECISION].includes(room.phase),
    canCancel: host && active && room.phase !== PHASES.JUDGE_DECISION, canReplay: host && room.phase === PHASES.FINISHED,
    canFollowUp: host && talk && room.topic.followUps.some(t => !room.usedFollowUpIds.includes(t.id)),
    canClearFollowUp: host && talk && !!room.activeFollowUp,
    canCompleteTask: talk && (actor.role === 'WOLF' || !!actor.villageTask),
    canUndoTask: talk && (actor.role === 'WOLF' || (!!actor.villageTask?.completed && !actor.reward?.used)),
    canRerollTask: room.phase === PHASES.ROLE_REVEAL && !!actor.villageTask && actor.rerollsUsed < room.settings.rerollLimit,
    canUseReward: !!reward?.available,
    canSubmitVote: !room.paused && room.phase === PHASES.VOTING && !Object.prototype.hasOwnProperty.call(room.ballots || {}, actor.id),
    canJudgeVote: !room.paused && room.phase === PHASES.JUDGE_DECISION && room.judge.judges.includes(actor.id) && !room.judge.nominations[actor.id],
  };
  const publicState = { version: 3, rulesVersion: 3, flowVersion: room.flowVersion || 3,
    releaseStage: (room.flowVersion || 3) >= 4 ? CONTENT.releaseStage || 'stable' : 'stable',
    contentVersion: room.contentVersion || 'legacy-v3', code: room.code, revision: room.revision,
    matchId: room.matchId, phaseVersion: room.phaseVersion, gameNumber: room.gameNumber,
    phase: room.phase, serverNow: now, settings: clone(room.settings), hostPlayerId: room.hostPlayerId,
    players: Object.values(room.players).map(p => ({ id: p.id, name: p.name, isHost: p.id === room.hostPlayerId,
      ready: !!p.ready, roleAcknowledged: !!p.roleAcknowledged, connected: now - p.lastSeenAt < 30000 })),
    round: room.round || 0, totalRounds: room.settings.roundCount,
    deadlineAt: room.deadlineAt == null ? null : room.deadlineAt, paused: !!room.paused,
    pausedRemainingMs: room.paused ? room.pausedRemainingMs : null,
    talkClock: room.talkClock ? { ...clone(room.talkClock), paused: !!room.paused } : null,
    topic: room.topic ? { id: room.topic.id, category: room.topic.category, mainQuestion: room.topic.mainQuestion,
      ...(room.topic.mainQuestionZh ? { mainQuestionZh: room.topic.mainQuestionZh } : {}),
      ...(room.topic.shortTitle ? { shortTitle: room.topic.shortTitle } : {}),
      ...(room.topic.shortTitleZh ? { shortTitleZh: room.topic.shortTitleZh } : {}),
      entryPrompts: room.topic.entryPrompts.slice(), followUps: clone(room.topic.followUps), tags: room.topic.tags.slice() } : null,
    activeFollowUp: room.activeFollowUp ? clone(room.activeFollowUp) : null,
    usedFollowUpIds: (room.usedFollowUpIds || []).slice(),
    estimatedSeconds: estimateRoomSeconds(room), extensionSeconds: room.extensionSeconds || 0,
    voteHistory: (room.voteHistory || []).map(publicVote), lastVoteResult: room.lastVoteResult ? clone(room.lastVoteResult) : null,
    meeting: room.meeting ? { ...clone(room.meeting), ...(room.meeting.order ? {
      currentSpeakerId: room.meeting.order[room.meeting.speakerIndex] || null,
      nextSpeakerId: room.meeting.order[room.meeting.speakerIndex + 1] || null } : {}) } : null,
    voting: room.phase === PHASES.VOTING ? { id: room.voting.id, type: room.voting.type, requiredSelections: room.settings.wolfCount,
      submittedPlayerIds: Object.keys(room.ballots) } : null,
    result: room.phase === PHASES.FINISHED ? clone(room.result) : null,
  };
  if (room.phase === PHASES.FINISHED) {
    publicState.reveal = { roles: Object.fromEntries(Object.values(room.players).map(p => [p.id, p.role])),
      professions: Object.fromEntries(Object.values(room.players).map(p => [p.id, p.profession])),
      wolfIds: ids(room).filter(id => room.players[id].role === 'WOLF'),
      tasks: (room.tasks || []).map(taskView), villageTasks: Object.values(room.players).filter(p => p.villageTask).map(p =>
        ({ playerId: p.id, profession: p.profession, ...taskView(p.villageTask), unlocked: !!p.reward.unlocked })),
      voteDetails: clone(room.voteHistory || []),
      judgeResult: clone((room.voteHistory || []).find(v => v.type === 'FINAL')?.judgeResult || null),
      jester: (room.voteHistory || []).some(v => v.type === 'FINAL') ? jesterStatus(room, room.voteHistory.find(v => v.type === 'FINAL')) : null };
  }
  const privateState = { playerId: actor.id, name: actor.name, isHost: host, ready: !!actor.ready,
    role: actor.role, roleAcknowledged: !!actor.roleAcknowledged, profession: actor.profession,
    wolfTeam: actor.role === 'WOLF' ? Object.values(room.players).filter(p => p.role === 'WOLF').map(p => ({ id: p.id, name: p.name })) : null,
    tasks: actor.role === 'WOLF' ? room.tasks.map(taskView) : null,
    villageTask: actor.villageTask ? taskView(actor.villageTask) : null,
    rerollRemaining: actor.villageTask ? Math.max(0, room.settings.rerollLimit - actor.rerollsUsed) : 0,
    talkReminder: host && room.phase === PHASES.TALK && room.talkReminder ? clone(room.talkReminder) : null,
    contentRepeatException: host && !!room.contentRepeatException,
    reward, myVoteSubmitted: room.phase === PHASES.VOTING && Object.prototype.hasOwnProperty.call(room.ballots, actor.id),
    judgeDecision: room.phase === PHASES.JUDGE_DECISION && room.judge.judges.includes(actor.id) ?
      { candidates: room.judge.candidates.slice(), seats: room.judge.seats, submitted: !!room.judge.nominations[actor.id] } : null,
    actions };
  return { public: publicState, private: privateState };
}
const api = { PHASES, RULES, CONTENT, GameError, normalizeSettings, createRoom, addPlayer,
  advanceExpired, dispatch, projectState, compatible, prepareHistory, selectWolfTasks, talkElapsedMs };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.CHAT_WOLF_V3_ENGINE = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
