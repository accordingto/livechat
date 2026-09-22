'use strict';

const PHASES = Object.freeze({
  LOBBY: 'LOBBY',
  ROLE_REVEAL: 'ROLE_REVEAL',
  TALK: 'TALK',
  MEETING_DISCUSS: 'MEETING_DISCUSS',
  VOTING: 'VOTING',
  TASK_REVIEW: 'TASK_REVIEW',
  FINISHED: 'FINISHED',
});

const SCENARIO = Object.freeze({
  id: 'shared-apartment-month',
  title: '我們一起合租一間房子，住一個月。',
  rounds: [
    {
      question: '你希望住在什麼樣的房子裡？最在意哪一點？',
      followUps: ['如果只能先選三個條件，你會選哪三個？', '對你來說，住得舒服和地點方便哪個更重要？'],
    },
    {
      question: '你最受不了室友的哪一種生活習慣？',
      followUps: ['這件事應該先提醒一次，還是直接訂成共同規則？', '哪一種小習慣你反而可以接受？'],
    },
    {
      question: '如果大家週末一起活動，你想安排什麼？',
      followUps: ['如果有人只想待在家，活動可以怎麼調整？', '你希望這個活動熱鬧一點，還是輕鬆一點？'],
    },
    {
      question: '假如附近突然開一家奇怪的小店，你希望它賣什麼？',
      followUps: ['這家店最奇怪、但最吸引人的地方會是什麼？', '你會想帶哪一位室友一起去？'],
    },
    {
      question: '大家只剩一小筆公共預算，你最想拿來改善什麼？',
      followUps: ['如果不能買東西，這筆錢還可以怎麼用？', '你願意為了哪個改善項目多付一點？'],
    },
    {
      question: '一個月結束前，你希望大家一起留下什麼回憶？',
      followUps: ['你想用什麼方式把這段回憶留下來？', '哪一個普通的小日常可能最值得記住？'],
    },
  ],
});

const TASK_POOL = Object.freeze([
  {
    id: 'T1',
    title: '公寓命名',
    condition: '引導兩位不同村民，各自為這間公寓提出一個自創名稱。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
  {
    id: 'T2',
    title: '冰箱道歉',
    condition: '讓兩位不同村民，在自己的發言中明確贊成「違反共同規則的人要向冰箱道歉」這條搞笑處罰。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
  {
    id: 'T3',
    title: '奇怪職位',
    condition: '引導兩位不同村民，分別替自己取一個搞笑的公寓職位，並解釋這個職位負責什麼。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
  {
    id: 'T4',
    title: '吉祥物',
    condition: '先提出一種動物作為公寓吉祥物，讓兩位不同村民在自己的發言中明確支持同一種動物。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
  {
    id: 'T5',
    title: '荒謬採購',
    condition: '提出一項明顯不實用但無害的公共採購，讓兩位不同村民分別說出支持購買它的理由。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
  {
    id: 'T6',
    title: '家庭口號',
    condition: '提出一句原創的公寓口號，讓兩位不同村民分別在自己的發言中完整引用一次。',
    requiredVillagers: 2,
    scenarioId: SCENARIO.id,
  },
]);

class GameError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'GameError';
    this.code = code;
    this.status = status;
  }
}

function fail(code, status) {
  throw new GameError(code, status);
}

function cleanText(value, max, code = 'INVALID_TEXT') {
  const text = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text.length > max) fail(code);
  return text;
}

function cleanOptionalText(value, max) {
  const text = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > max) fail('TEXT_TOO_LONG');
  return text;
}

function intInRange(value, min, max, code = 'INVALID_SETTING') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(code);
  return n;
}

function normalizeSettings(input = {}) {
  const playerCount = intInRange(input.playerCount == null ? 6 : input.playerCount, 3, 12);
  const wolfCount = intInRange(input.wolfCount == null ? 2 : input.wolfCount, 1, playerCount - 2, 'INVALID_WOLF_COUNT');
  return {
    playerCount,
    wolfCount,
    bellEnabled: input.bellEnabled !== false,
    talkSeconds: intInRange(input.talkSeconds == null ? 60 : input.talkSeconds, 20, 180),
    meetingSeconds: intInRange(input.meetingSeconds == null ? 20 : input.meetingSeconds, 10, 60),
    voteSeconds: intInRange(input.voteSeconds == null ? 30 : input.voteSeconds, 15, 90),
  };
}

function makePlayer({ id, name, isHost, now }) {
  return {
    id,
    name: cleanText(name, 24, 'INVALID_NAME'),
    isHost: !!isHost,
    ready: false,
    role: null,
    roleAcknowledged: false,
    joinedAt: now,
    lastSeenAt: now,
  };
}

function createRoom({ code, hostPlayerId, hostSessionHash, hostName, settings, now, seed }) {
  const normalized = normalizeSettings(settings);
  const room = {
    version: 1,
    revision: 1,
    code,
    phase: PHASES.LOBBY,
    createdAt: now,
    updatedAt: now,
    hostPlayerId,
    settings: normalized,
    players: {},
    sessions: {},
    gameNumber: 0,
    rngState: (Number(seed) >>> 0) || 0x6d2b79f5,
  };
  room.players[hostPlayerId] = makePlayer({ id: hostPlayerId, name: hostName, isHost: true, now });
  room.sessions[hostSessionHash] = { playerId: hostPlayerId, createdAt: now };
  return room;
}

function addPlayer(room, { playerId, sessionHash, name, now }) {
  if (!room || room.phase !== PHASES.LOBBY) fail('GAME_ALREADY_STARTED', 409);
  const players = Object.values(room.players || {});
  if (players.length >= room.settings.playerCount) fail('ROOM_FULL', 409);
  const cleaned = cleanText(name, 24, 'INVALID_NAME');
  if (players.some((player) => player.name.toLocaleLowerCase('zh-Hant') === cleaned.toLocaleLowerCase('zh-Hant'))) {
    fail('NAME_TAKEN', 409);
  }
  room.players[playerId] = makePlayer({ id: playerId, name: cleaned, isHost: false, now });
  room.sessions[sessionHash] = { playerId, createdAt: now };
  touch(room, now);
  return room;
}

function touch(room, now) {
  room.updatedAt = now;
  room.revision = (Number(room.revision) || 0) + 1;
}

function random(room) {
  let x = Number(room.rngState) >>> 0;
  if (!x) x = 0x6d2b79f5;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  room.rngState = x >>> 0;
  return (room.rngState >>> 0) / 4294967296;
}

function shuffle(room, values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random(room) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function playerIds(room) {
  return Object.keys(room.players || {});
}

function requireActor(room, actorId) {
  const actor = room.players && room.players[actorId];
  if (!actor) fail('NOT_A_MEMBER', 403);
  return actor;
}

function requireHost(room, actorId) {
  const actor = requireActor(room, actorId);
  if (!actor.isHost || room.hostPlayerId !== actorId) fail('HOST_ONLY', 403);
  return actor;
}

function requirePhase(room, ...phases) {
  if (!phases.includes(room.phase)) fail('WRONG_PHASE', 409);
}

function sameSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function clearGameData(room) {
  for (const key of [
    'round', 'rounds', 'currentRoundState', 'meeting', 'meetingSlots', 'bell', 'tasks',
    'tasksFrozen', 'voting', 'ballots', 'voteHistory', 'lastVoteResult', 'result',
    'paused', 'pausedRemainingMs', 'deadlineAt', 'followUpIndexByRound',
  ]) delete room[key];
  for (const player of Object.values(room.players || {})) {
    player.role = null;
    player.roleAcknowledged = false;
  }
}

function startGame(room, now) {
  requirePhase(room, PHASES.LOBBY);
  const ids = playerIds(room);
  if (ids.length !== room.settings.playerCount) fail('PLAYER_COUNT_MISMATCH', 409);
  if (!ids.every((id) => room.players[id].ready)) fail('NOT_EVERYONE_READY', 409);
  if (room.settings.wolfCount > ids.length - 2) fail('INVALID_WOLF_COUNT');

  clearGameData(room);
  const shuffledIds = shuffle(room, ids);
  const wolves = new Set(shuffledIds.slice(0, room.settings.wolfCount));
  for (const id of ids) {
    room.players[id].role = wolves.has(id) ? 'WOLF' : 'VILLAGER';
    room.players[id].roleAcknowledged = false;
  }
  const villagerCount = ids.length - room.settings.wolfCount;
  const eligible = TASK_POOL.filter((task) => task.requiredVillagers <= villagerCount);
  if (eligible.length < 2) fail('NO_ELIGIBLE_TASKS', 409);
  room.tasks = shuffle(room, eligible).slice(0, 2).map((task) => ({
    ...task,
    note: '',
    noteEditedBy: null,
    noteEditedAt: null,
    claim: null,
    review: null,
  }));
  room.gameNumber = (Number(room.gameNumber) || 0) + 1;
  room.phase = PHASES.ROLE_REVEAL;
  room.meetingSlots = {
    after2: { scheduledAfterRound: 2, used: false, advanced: false },
    after4: { scheduledAfterRound: 4, used: false, advanced: false },
  };
  room.bell = {
    enabled: room.settings.bellEnabled,
    used: false,
    triggeredBy: null,
    triggeredRound: null,
    slotId: null,
  };
  room.round = 0;
  room.rounds = {};
  room.voteHistory = [];
  room.ballots = {};
  room.tasksFrozen = false;
  room.paused = false;
  room.deadlineAt = null;
  room.followUpIndexByRound = {};
}

function startTalkRound(room, round, anchorTime) {
  const ids = playerIds(room);
  const order = shuffle(room, ids);
  room.phase = PHASES.TALK;
  room.round = round;
  room.currentRoundState = {
    round,
    order,
    speakerIndex: 0,
    completed: {},
    startedAt: anchorTime,
  };
  room.rounds[String(round)] = room.currentRoundState;
  room.deadlineAt = anchorTime + room.settings.talkSeconds * 1000;
  room.paused = false;
  room.pausedRemainingMs = null;
  room.meeting = null;
  room.voting = null;
  room.ballots = {};
}

function startMeeting(room, slotId, anchorTime, resumeRound) {
  const slot = room.meetingSlots[slotId];
  if (!slot || slot.used) fail('MEETING_ALREADY_USED', 409);
  slot.used = true;
  const order = shuffle(room, playerIds(room));
  room.phase = PHASES.MEETING_DISCUSS;
  room.meeting = {
    slotId,
    order,
    speakerIndex: 0,
    completed: {},
    resumeRound,
    startedAt: anchorTime,
  };
  room.deadlineAt = anchorTime + room.settings.meetingSeconds * 1000;
  room.paused = false;
  room.pausedRemainingMs = null;
}

function startVoting(room, type, anchorTime, resumeRound = null, slotId = null) {
  room.phase = PHASES.VOTING;
  room.tasksFrozen = type === 'FINAL';
  room.voting = {
    id: type === 'FINAL' ? 'final' : slotId,
    type,
    slotId,
    resumeRound,
    requiredSelections: room.settings.wolfCount,
    submitted: {},
    startedAt: anchorTime,
  };
  room.ballots = {};
  room.deadlineAt = anchorTime + room.settings.voteSeconds * 1000;
  room.paused = false;
  room.pausedRemainingMs = null;
}

function finishTalkRound(room, anchorTime) {
  const round = room.round;
  if (round === 1 && room.meetingSlots.after2.advanced && !room.meetingSlots.after2.used) {
    startMeeting(room, 'after2', anchorTime, 2);
    return;
  }
  if (round === 2 && !room.meetingSlots.after2.used) {
    startMeeting(room, 'after2', anchorTime, 3);
    return;
  }
  if (round === 3 && room.meetingSlots.after4.advanced && !room.meetingSlots.after4.used) {
    startMeeting(room, 'after4', anchorTime, 4);
    return;
  }
  if (round === 4 && !room.meetingSlots.after4.used) {
    startMeeting(room, 'after4', anchorTime, 5);
    return;
  }
  if (round === 6) {
    startVoting(room, 'FINAL', anchorTime);
    return;
  }
  startTalkRound(room, round + 1, anchorTime);
}

function finishCurrentTalk(room, anchorTime, reason) {
  const state = room.currentRoundState;
  if (!state || room.phase !== PHASES.TALK) fail('WRONG_PHASE', 409);
  const currentId = state.order[state.speakerIndex];
  if (!currentId || state.completed[currentId]) fail('TURN_ALREADY_USED', 409);
  state.completed[currentId] = { reason, endedAt: anchorTime };
  if (state.speakerIndex + 1 < state.order.length) {
    state.speakerIndex += 1;
    room.deadlineAt = anchorTime + room.settings.talkSeconds * 1000;
  } else {
    room.deadlineAt = null;
    finishTalkRound(room, anchorTime);
  }
}

function finishCurrentMeetingSpeaker(room, anchorTime, reason) {
  const meeting = room.meeting;
  if (!meeting || room.phase !== PHASES.MEETING_DISCUSS) fail('WRONG_PHASE', 409);
  const currentId = meeting.order[meeting.speakerIndex];
  if (!currentId || meeting.completed[currentId]) fail('TURN_ALREADY_USED', 409);
  meeting.completed[currentId] = { reason, endedAt: anchorTime };
  if (meeting.speakerIndex + 1 < meeting.order.length) {
    meeting.speakerIndex += 1;
    room.deadlineAt = anchorTime + room.settings.meetingSeconds * 1000;
  } else {
    room.deadlineAt = null;
    startVoting(room, 'MIDGAME', anchorTime, meeting.resumeRound, meeting.slotId);
  }
}

function officialNominees(room) {
  const ids = playerIds(room);
  const ballots = Object.values(room.ballots || {}).filter((ballot) => Array.isArray(ballot));
  if (!ballots.length) return [];
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const ballot of ballots) {
    for (const id of ballot) if (Object.hasOwn(counts, id)) counts[id] += 1;
  }
  const groups = new Map();
  for (const id of ids) {
    const count = counts[id];
    if (!groups.has(count)) groups.set(count, []);
    groups.get(count).push(id);
  }
  const selected = [];
  for (const count of Array.from(groups.keys()).sort((a, b) => b - a)) {
    const group = shuffle(room, groups.get(count));
    const need = room.settings.wolfCount - selected.length;
    selected.push(...group.slice(0, need));
    if (selected.length === room.settings.wolfCount) break;
  }
  return selected;
}

function finishGame(room, outcome, reason, now) {
  room.phase = PHASES.FINISHED;
  room.deadlineAt = null;
  room.paused = false;
  room.pausedRemainingMs = null;
  room.tasksFrozen = true;
  room.ballots = {};
  room.result = { outcome, reason, finishedAt: now };
}

function finishVote(room, anchorTime) {
  if (room.phase !== PHASES.VOTING || !room.voting) fail('WRONG_PHASE', 409);
  const voting = room.voting;
  const nominees = officialNominees(room);
  const wolfIds = playerIds(room).filter((id) => room.players[id].role === 'WOLF');
  const exact = nominees.length === wolfIds.length && sameSet(nominees, wolfIds);
  const record = {
    id: voting.id,
    type: voting.type,
    nominees,
    outcome: exact ? 'EXACT' : nominees.length ? 'NOT_EXACT' : 'NO_NOMINATION',
    resolvedAt: anchorTime,
  };
  room.voteHistory.push(record);
  room.lastVoteResult = record;
  room.ballots = {};
  room.deadlineAt = null;
  if (exact) {
    finishGame(room, 'VILLAGERS', 'FULL_IDENTIFICATION', anchorTime);
    return;
  }
  if (voting.type === 'MIDGAME') {
    startTalkRound(room, voting.resumeRound, anchorTime);
    return;
  }
  room.phase = PHASES.TASK_REVIEW;
  room.tasksFrozen = true;
  room.voting = null;
  for (const task of room.tasks) {
    if (!task.claim) task.review = { valid: false, reason: 'NOT_CLAIMED', reviewedAt: anchorTime };
  }
}

function allTaskReviewsDone(room) {
  return Array.isArray(room.tasks) && room.tasks.every((task) => task.review && typeof task.review.valid === 'boolean');
}

function finalizeTaskReview(room, now) {
  if (!allTaskReviewsDone(room)) fail('TASK_REVIEW_INCOMPLETE', 409);
  const allValid = room.tasks.length === 2 && room.tasks.every((task) => task.review.valid === true);
  finishGame(room, allValid ? 'WOLVES' : 'DRAW', allValid ? 'TASKS_VALID' : 'TASKS_INCOMPLETE', now);
}

function advanceExpired(room, now) {
  if (!room || room.paused) return false;
  let changed = false;
  let guard = 0;
  while (room.deadlineAt != null && Number(room.deadlineAt) <= now && guard < 200) {
    guard += 1;
    changed = true;
    const anchor = Number(room.deadlineAt);
    if (room.phase === PHASES.TALK) finishCurrentTalk(room, anchor, 'timeout');
    else if (room.phase === PHASES.MEETING_DISCUSS) finishCurrentMeetingSpeaker(room, anchor, 'timeout');
    else if (room.phase === PHASES.VOTING) finishVote(room, anchor);
    else break;
  }
  if (changed) touch(room, now);
  return changed;
}

function dispatch(room, actorId, action, payload = {}, now = Date.now()) {
  if (!room) fail('ROOM_NOT_FOUND', 404);
  advanceExpired(room, now);
  const actor = requireActor(room, actorId);
  if (action === 'heartbeat') {
    actor.lastSeenAt = now;
    return room;
  }
  actor.lastSeenAt = now;

  switch (action) {
    case 'ready': {
      requirePhase(room, PHASES.LOBBY);
      actor.ready = !!payload.ready;
      break;
    }
    case 'settings': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.LOBBY);
      const settings = normalizeSettings({ ...room.settings, ...payload.settings });
      if (settings.playerCount < playerIds(room).length) fail('PLAYER_COUNT_TOO_SMALL', 409);
      room.settings = settings;
      break;
    }
    case 'removePlayer': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.LOBBY);
      const targetId = String(payload.playerId || '');
      if (!room.players[targetId] || targetId === room.hostPlayerId) fail('INVALID_PLAYER');
      delete room.players[targetId];
      for (const [hash, session] of Object.entries(room.sessions || {})) {
        if (session.playerId === targetId) delete room.sessions[hash];
      }
      break;
    }
    case 'startGame': {
      requireHost(room, actorId);
      startGame(room, now);
      break;
    }
    case 'ackRole': {
      requirePhase(room, PHASES.ROLE_REVEAL);
      actor.roleAcknowledged = true;
      if (playerIds(room).every((id) => room.players[id].roleAcknowledged)) startTalkRound(room, 1, now);
      break;
    }
    case 'beginTalk': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.ROLE_REVEAL);
      startTalkRound(room, 1, now);
      break;
    }
    case 'endTurn': {
      if (room.paused) fail('GAME_PAUSED', 409);
      if (room.phase === PHASES.TALK) {
        const currentId = room.currentRoundState.order[room.currentRoundState.speakerIndex];
        if (actorId !== currentId && !actor.isHost) fail('CURRENT_SPEAKER_ONLY', 403);
        finishCurrentTalk(room, now, actorId === currentId ? 'ended' : 'host-skipped');
      } else if (room.phase === PHASES.MEETING_DISCUSS) {
        const currentId = room.meeting.order[room.meeting.speakerIndex];
        if (actorId !== currentId && !actor.isHost) fail('CURRENT_SPEAKER_ONLY', 403);
        finishCurrentMeetingSpeaker(room, now, actorId === currentId ? 'ended' : 'host-skipped');
      } else fail('WRONG_PHASE', 409);
      break;
    }
    case 'ringBell': {
      requirePhase(room, PHASES.TALK);
      if (room.paused) fail('GAME_PAUSED', 409);
      if (!room.bell.enabled) fail('BELL_DISABLED', 409);
      if (room.bell.used) fail('BELL_ALREADY_USED', 409);
      if (![1, 3].includes(room.round)) fail('BELL_NOT_AVAILABLE', 409);
      const slotId = room.round === 1 ? 'after2' : 'after4';
      const slot = room.meetingSlots[slotId];
      if (!slot || slot.used || slot.advanced) fail('MEETING_ALREADY_USED', 409);
      room.bell.used = true;
      room.bell.triggeredBy = actorId;
      room.bell.triggeredRound = room.round;
      room.bell.slotId = slotId;
      slot.advanced = true;
      break;
    }
    case 'followUp': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.TALK);
      const round = room.round;
      const options = SCENARIO.rounds[round - 1].followUps;
      const next = Number(room.followUpIndexByRound[String(round)] == null ? -1 : room.followUpIndexByRound[String(round)]) + 1;
      if (next >= options.length) fail('NO_MORE_FOLLOW_UPS', 409);
      room.followUpIndexByRound[String(round)] = next;
      break;
    }
    case 'pause': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.TALK, PHASES.MEETING_DISCUSS, PHASES.VOTING);
      if (room.paused) fail('GAME_PAUSED', 409);
      room.pausedRemainingMs = Math.max(0, Number(room.deadlineAt) - now);
      room.paused = true;
      room.deadlineAt = null;
      break;
    }
    case 'resume': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.TALK, PHASES.MEETING_DISCUSS, PHASES.VOTING);
      if (!room.paused) fail('GAME_NOT_PAUSED', 409);
      room.deadlineAt = now + Math.max(0, Number(room.pausedRemainingMs) || 0);
      room.paused = false;
      room.pausedRemainingMs = null;
      break;
    }
    case 'cancelGame': {
      requireHost(room, actorId);
      if (room.phase === PHASES.FINISHED) fail('WRONG_PHASE', 409);
      finishGame(room, 'CANCELLED', 'HOST_CANCELLED', now);
      break;
    }
    case 'taskNote': {
      if (actor.role !== 'WOLF') fail('WOLF_ONLY', 403);
      if (room.tasksFrozen) fail('TASKS_FROZEN', 409);
      if (![PHASES.ROLE_REVEAL, PHASES.TALK, PHASES.MEETING_DISCUSS, PHASES.VOTING].includes(room.phase)
          || (room.phase === PHASES.VOTING && room.voting && room.voting.type === 'FINAL')) fail('WRONG_PHASE', 409);
      const task = room.tasks.find((item) => item.id === payload.taskId);
      if (!task) fail('INVALID_TASK');
      task.note = cleanOptionalText(payload.note, 240);
      task.noteEditedBy = actorId;
      task.noteEditedAt = now;
      break;
    }
    case 'claimTask': {
      requirePhase(room, PHASES.TALK);
      if (actor.role !== 'WOLF') fail('WOLF_ONLY', 403);
      if (room.tasksFrozen) fail('TASKS_FROZEN', 409);
      const task = room.tasks.find((item) => item.id === payload.taskId);
      if (!task) fail('INVALID_TASK');
      const targets = Array.isArray(payload.targetIds) ? payload.targetIds.map(String) : [];
      if (targets.length !== task.requiredVillagers || new Set(targets).size !== targets.length) fail('INVALID_TASK_TARGETS');
      if (!targets.every((id) => room.players[id] && room.players[id].role === 'VILLAGER')) fail('TASK_REQUIRES_VILLAGERS');
      const claimRound = intInRange(payload.round, 1, room.round, 'INVALID_TASK_ROUND');
      task.claim = {
        targetIds: targets,
        round: claimRound,
        summary: cleanText(payload.summary, 240, 'INVALID_TASK_SUMMARY'),
        claimedBy: actorId,
        claimedAt: now,
      };
      task.review = null;
      break;
    }
    case 'cancelClaim': {
      requirePhase(room, PHASES.TALK);
      if (actor.role !== 'WOLF') fail('WOLF_ONLY', 403);
      if (room.tasksFrozen) fail('TASKS_FROZEN', 409);
      const task = room.tasks.find((item) => item.id === payload.taskId);
      if (!task) fail('INVALID_TASK');
      task.claim = null;
      task.review = null;
      break;
    }
    case 'submitVote': {
      requirePhase(room, PHASES.VOTING);
      if (room.paused) fail('GAME_PAUSED', 409);
      if (room.voting.submitted[actorId]) fail('VOTE_ALREADY_SUBMITTED', 409);
      const selections = Array.isArray(payload.selections) ? payload.selections.map(String) : [];
      if (selections.length !== room.settings.wolfCount || new Set(selections).size !== selections.length) fail('SELECT_EXACTLY_K');
      if (!selections.every((id) => room.players[id])) fail('INVALID_PLAYER');
      room.ballots[actorId] = selections;
      room.voting.submitted[actorId] = now;
      if (playerIds(room).every((id) => room.voting.submitted[id])) finishVote(room, now);
      break;
    }
    case 'reviewTask': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.TASK_REVIEW);
      const task = room.tasks.find((item) => item.id === payload.taskId);
      if (!task || !task.claim) fail('TASK_NOT_CLAIMED');
      if (typeof payload.valid !== 'boolean') fail('INVALID_REVIEW');
      task.review = { valid: payload.valid, reviewedBy: actorId, reviewedAt: now };
      if (allTaskReviewsDone(room)) finalizeTaskReview(room, now);
      break;
    }
    case 'finalizeReview': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.TASK_REVIEW);
      finalizeTaskReview(room, now);
      break;
    }
    case 'replay': {
      requireHost(room, actorId);
      requirePhase(room, PHASES.FINISHED);
      clearGameData(room);
      room.phase = PHASES.LOBBY;
      for (const player of Object.values(room.players)) {
        player.ready = false;
        player.lastSeenAt = now;
      }
      break;
    }
    default:
      fail('UNKNOWN_ACTION');
  }

  touch(room, now);
  return room;
}

function playerSummary(room, player, now) {
  return {
    id: player.id,
    name: player.name,
    isHost: !!player.isHost,
    ready: !!player.ready,
    roleAcknowledged: !!player.roleAcknowledged,
    connected: now - Number(player.lastSeenAt || 0) < 45000,
  };
}

function publicTask(room, task) {
  const nameOf = (id) => room.players[id] ? room.players[id].name : '未知玩家';
  return {
    id: task.id,
    title: task.title,
    condition: task.condition,
    requiredVillagers: task.requiredVillagers,
    scenarioId: task.scenarioId,
    claim: task.claim ? {
      targetIds: task.claim.targetIds,
      targetNames: task.claim.targetIds.map(nameOf),
      round: task.claim.round,
      summary: task.claim.summary,
      claimedBy: task.claim.claimedBy,
      claimedByName: nameOf(task.claim.claimedBy),
      claimedAt: task.claim.claimedAt,
    } : null,
    review: task.review ? { ...task.review } : null,
  };
}

function wolfTask(room, task) {
  return {
    ...publicTask(room, task),
    note: task.note || '',
    noteEditedBy: task.noteEditedBy,
    noteEditedByName: task.noteEditedBy && room.players[task.noteEditedBy] ? room.players[task.noteEditedBy].name : null,
    noteEditedAt: task.noteEditedAt,
  };
}

function timerProjection(room) {
  return {
    deadlineAt: room.deadlineAt == null ? null : Number(room.deadlineAt),
    paused: !!room.paused,
    pausedRemainingMs: room.paused ? Number(room.pausedRemainingMs || 0) : null,
  };
}

function projectState(room, actorId, now = Date.now()) {
  const actor = requireActor(room, actorId);
  const reveal = [PHASES.TASK_REVIEW, PHASES.FINISHED].includes(room.phase);
  const players = playerIds(room).map((id) => playerSummary(room, room.players[id], now));
  const names = Object.fromEntries(players.map((player) => [player.id, player.name]));
  const publicState = {
    version: room.version,
    revision: room.revision,
    serverNow: now,
    code: room.code,
    phase: room.phase,
    gameNumber: room.gameNumber,
    settings: { ...room.settings },
    players,
    hostPlayerId: room.hostPlayerId,
    scenario: {
      id: SCENARIO.id,
      title: SCENARIO.title,
      rounds: room.phase === PHASES.LOBBY ? SCENARIO.rounds.map((round) => ({ question: round.question })) : undefined,
    },
    meetingSlots: room.meetingSlots ? JSON.parse(JSON.stringify(room.meetingSlots)) : null,
    bell: room.bell ? {
      enabled: room.bell.enabled,
      used: room.bell.used,
      triggeredBy: room.bell.triggeredBy,
      triggeredByName: room.bell.triggeredBy ? names[room.bell.triggeredBy] : null,
      triggeredRound: room.bell.triggeredRound,
      slotId: room.bell.slotId,
    } : null,
    voteHistory: (room.voteHistory || []).map((record) => ({ ...record })),
    lastVoteResult: room.lastVoteResult ? { ...room.lastVoteResult } : null,
    result: room.result ? { ...room.result } : null,
    ...timerProjection(room),
  };

  if (room.phase === PHASES.TALK && room.currentRoundState) {
    const state = room.currentRoundState;
    const followIndex = room.followUpIndexByRound && room.followUpIndexByRound[String(room.round)];
    publicState.talk = {
      round: room.round,
      totalRounds: 6,
      question: SCENARIO.rounds[room.round - 1].question,
      followUp: Number.isInteger(followIndex) ? SCENARIO.rounds[room.round - 1].followUps[followIndex] : null,
      followUpsRemaining: SCENARIO.rounds[room.round - 1].followUps.length - (Number.isInteger(followIndex) ? followIndex + 1 : 0),
      order: state.order.slice(),
      speakerIndex: state.speakerIndex,
      currentSpeakerId: state.order[state.speakerIndex],
      completed: { ...state.completed },
    };
  }
  if (room.phase === PHASES.MEETING_DISCUSS && room.meeting) {
    publicState.meeting = {
      slotId: room.meeting.slotId,
      order: room.meeting.order.slice(),
      speakerIndex: room.meeting.speakerIndex,
      currentSpeakerId: room.meeting.order[room.meeting.speakerIndex],
      completed: { ...room.meeting.completed },
    };
  }
  if (room.phase === PHASES.VOTING && room.voting) {
    publicState.voting = {
      id: room.voting.id,
      type: room.voting.type,
      requiredSelections: room.voting.requiredSelections,
      submittedPlayerIds: Object.keys(room.voting.submitted || {}),
    };
  }
  if (reveal) {
    publicState.reveal = {
      roles: Object.fromEntries(playerIds(room).map((id) => [id, room.players[id].role])),
      wolfIds: playerIds(room).filter((id) => room.players[id].role === 'WOLF'),
      tasks: (room.tasks || []).map((task) => publicTask(room, task)),
    };
  }

  const currentSpeakerId = room.phase === PHASES.TALK && room.currentRoundState
    ? room.currentRoundState.order[room.currentRoundState.speakerIndex]
    : room.phase === PHASES.MEETING_DISCUSS && room.meeting
      ? room.meeting.order[room.meeting.speakerIndex]
      : null;
  const canBell = room.phase === PHASES.TALK && !room.paused && room.bell && room.bell.enabled && !room.bell.used
    && [1, 3].includes(room.round)
    && !(room.round === 1 ? room.meetingSlots.after2.used || room.meetingSlots.after2.advanced : room.meetingSlots.after4.used || room.meetingSlots.after4.advanced);
  const privateState = {
    playerId: actorId,
    name: actor.name,
    isHost: !!actor.isHost,
    role: room.phase === PHASES.LOBBY ? null : actor.role,
    roleAcknowledged: !!actor.roleAcknowledged,
    wolfTeam: actor.role === 'WOLF' && room.phase !== PHASES.LOBBY
      ? playerIds(room).filter((id) => room.players[id].role === 'WOLF').map((id) => ({ id, name: room.players[id].name }))
      : null,
    tasks: actor.role === 'WOLF' && !reveal ? (room.tasks || []).map((task) => wolfTask(room, task)) : null,
    myVoteSubmitted: !!(room.voting && room.voting.submitted && room.voting.submitted[actorId]),
    actions: {
      canStart: actor.isHost && room.phase === PHASES.LOBBY,
      canAckRole: room.phase === PHASES.ROLE_REVEAL && !actor.roleAcknowledged,
      canBeginTalk: actor.isHost && room.phase === PHASES.ROLE_REVEAL,
      canEndTurn: !room.paused && currentSpeakerId === actorId,
      canHostEndTurn: !room.paused && actor.isHost && !!currentSpeakerId && currentSpeakerId !== actorId,
      canRingBell: canBell,
      canFollowUp: actor.isHost && room.phase === PHASES.TALK && publicState.talk && publicState.talk.followUpsRemaining > 0,
      canPause: actor.isHost && [PHASES.TALK, PHASES.MEETING_DISCUSS, PHASES.VOTING].includes(room.phase) && !room.paused,
      canResume: actor.isHost && !!room.paused,
      canCancel: actor.isHost && room.phase !== PHASES.FINISHED,
      canEditTaskNote: actor.role === 'WOLF' && !room.tasksFrozen
        && [PHASES.ROLE_REVEAL, PHASES.TALK, PHASES.MEETING_DISCUSS, PHASES.VOTING].includes(room.phase)
        && !(room.phase === PHASES.VOTING && room.voting && room.voting.type === 'FINAL'),
      canClaimTasks: actor.role === 'WOLF' && room.phase === PHASES.TALK && !room.tasksFrozen,
      canSubmitVote: room.phase === PHASES.VOTING && !room.paused && !(room.voting && room.voting.submitted[actorId]),
      canReviewTasks: actor.isHost && room.phase === PHASES.TASK_REVIEW,
      canReplay: actor.isHost && room.phase === PHASES.FINISHED,
    },
  };
  return { public: publicState, private: privateState };
}

module.exports = {
  PHASES,
  SCENARIO,
  TASK_POOL,
  GameError,
  normalizeSettings,
  createRoom,
  addPlayer,
  advanceExpired,
  dispatch,
  projectState,
};
