'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const source = fs.readFileSync(path.resolve(__dirname, '../chat-wolf-v3-engine.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
function fixtureContent() {
  const topics = ['a', 'b'].map(id => ({ id, category: 'Fixture', shortTitle: id,
    mainQuestion: `Fixture question ${id}?`, mainQuestionZh: '測試題', entryPrompts: [], tags: ['fixture'],
    followUps: Array.from({ length: 8 }, (_, i) => ({ id: `${id}-${i}`, text: `Follow-up ${i}?` })) }));
  const wolfTasks = Array.from({ length: 100 }, (_, i) => ({ id: `w-${i}`, canonicalTaskKey: `key-${i}`,
    variantGroup: `group-${i}`, mechanicKey: `group-${i}`, family: `family-${i % 8}`,
    type: i < 24 ? 'interaction' : 'self_action', text: `Test task ${i}.`, textZh: `測試 ${i}`,
    active: true, status: 'active', reviewed: true, noticeableTell: i % 2 === 0, compatibleTopicIds: ['a', 'b'],
    isGeneric: i % 20 === 0, performanceGroup: i >= 24 && i < 30 ? 'voice' : null,
    requiredOtherPlayerCount: i < 24 ? 1 : 0, actionTags: [`tag-${i % 8}`], positiveClues: [`A task uses method ${i % 8}.`] }));
  const villageTasks = RULES.professions.flatMap(role => [0, 1].map(i => ({ id: `v-${role.id}-${i}`,
    roleId: role.id, text: `Test ${role.id} card ${i}.`, textZh: '村民測試',
    canonicalTaskKey: `vkey-${role.id}-${i}`, variantGroup: role.id === 'bait' ? 'group-25' : `vgroup-${role.id}-${i}`,
    family: role.id, active: true, status: 'active', reviewed: true, compatibleTopicIds: ['a', 'b'] })));
  const result = { version: 'fixture-v4', topics, wolfTasks, villageTasks,
    directorDirections: require('../chat-wolf-v6-directions.js').directions,
    exclusionClues: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`tag-${i}`, `No task uses method ${i}.`])), legacyTaskMap: {} };
  result.legacy = { ...result }; return result;
}
function harness(content = fixtureContent()) {
  const context = { module: { exports: {} }, crypto: require('node:crypto').webcrypto,
    require: name => name.includes('rules') ? RULES : content };
  vm.runInNewContext(source, context);
  const E = context.module.exports; let now = 100000;
  const send = (r, id, action, payload = {}) => E.dispatch(r, id, action, payload, ++now);
  const host = (r, action, payload = {}) => send(r, 'p0', action, payload);
  function room(settings = {}, seed = 42) {
    const r = E.createRoom({ code: 'ABC234', hostPlayerId: 'p0', hostSessionHash: 's0', hostName: 'Host',
      settings, seed, now });
    for (let i = 1; i < r.settings.playerCount; i++) E.addPlayer(r, { playerId: `p${i}`, sessionHash: `s${i}`, name: `Player ${i}`, now });
    return r;
  }
  function started(settings = {}, seed) { const r = room(settings, seed); host(r, 'startGame'); return r; }
  function talk(settings = {}, seed) { const r = started(settings, seed); host(r, 'beginTalk'); return r; }
  function advance(r, amount) { now += amount; E.advanceExpired(r, now); return now; }
  function vote(r) { host(r, 'endTalk'); if (r.phase === 'FINAL_CLUES') host(r, 'endClues'); host(r, 'endMeeting'); }
  function abstain(r) { for (const p of Object.keys(r.players)) send(r, p, 'submitVote', { selections: [] }); }
  return { E, content, room, started, talk, host, send, advance, vote, abstain, now: () => now };
}
function fails(fn, code) { assert.throws(fn, e => e.code === code); }

test('new defaults keep three rounds and estimate full per-person meetings at 6/8/10/12 seats', () => {
  const h = harness();
  for (const n of [6, 8, 10, 12]) {
    const s = h.E.normalizeSettings({ playerCount: n });
    assert.equal(s.roundCount, 3); assert.equal(s.talkEndBehavior, 'host_confirm'); assert.equal(s.meetingTurnSeconds, 60);
    assert.equal(RULES.estimateSeconds(s), 1800 + 3 * n * 60 + 135 + 35);
  }
  assert.equal(RULES.estimateSeconds(h.E.normalizeSettings()), 3050);
});

test('host-confirm talk counts active time upwards, passes an hour, and only reminds host once', () => {
  const h = harness(), r = h.talk(); const started = r.talkClock.activeSince;
  assert.equal(r.deadlineAt, null); h.advance(r, 600001);
  assert.equal(r.phase, 'TALK'); assert.equal(r.round, 1); assert.equal(r.talkReminder.number, 1);
  const revision = r.revision; h.advance(r, 3600000); assert.equal(r.talkReminder.number, 1); assert.equal(r.revision, revision);
  assert.ok(h.E.talkElapsedMs(r, h.now()) > 3600000);
  assert.equal(r.talkClock.activeSince, started);
  assert.equal(h.E.projectState(r, 'p0', h.now()).private.talkReminder.due, true);
  assert.equal(h.E.projectState(r, 'p1', h.now()).private.talkReminder, null);
  assert.equal(h.E.projectState(r, 'p0', h.now()).public.talkReminder, undefined);
  const wolf = Object.values(r.players).find(p => p.role === 'WOLF');
  h.send(r, wolf.id, 'completeTask', { taskId: r.tasks[0].id }); assert.ok(r.tasks[0].completed);
});

test('talk pause excludes time; refresh and reminder snooze never reset active elapsed', () => {
  const h = harness(), r = h.talk(); h.advance(r, 20000); h.host(r, 'pause');
  const elapsed = r.talkClock.elapsedMs; assert.equal(r.talkClock.activeSince, null);
  h.advance(r, 900000); assert.equal(h.E.talkElapsedMs(r, h.now()), elapsed);
  h.host(r, 'extendTalk', { seconds: 60 }); assert.equal(r.talkReminder.remindAtElapsedMs, elapsed + 60000);
  assert.equal(r.talkClock.elapsedMs, elapsed); h.host(r, 'resume'); assert.equal(r.deadlineAt, null);
  h.advance(r, 60001); assert.equal(r.talkReminder.number, 1); assert.equal(r.talkReminder.due, true);
  const restored = copy(r); assert.equal(h.E.talkElapsedMs(restored, h.now()), h.E.talkElapsedMs(r, h.now()));
  h.host(r, 'extendTalk', { seconds: 120 }); const before = h.E.talkElapsedMs(r, h.now());
  assert.equal(r.talkReminder.due, false); h.advance(r, 120001); assert.equal(r.talkReminder.number, 2);
  assert.ok(h.E.talkElapsedMs(r, h.now()) >= before + 120000);
});

test('follow-ups are manual in every round and preserve clocks, cards and active question', () => {
  const h = harness(), r = h.talk(); const tasks = JSON.stringify(r.tasks); const clock = copy(r.talkClock);
  h.host(r, 'followUp'); const question = r.activeFollowUp.id;
  assert.deepEqual(copy(r.talkClock), clock); assert.equal(JSON.stringify(r.tasks), tasks);
  h.vote(r); h.abstain(r); assert.equal(r.round, 2); assert.equal(r.activeFollowUp.id, question);
  assert.equal(r.usedFollowUpIds.length, 1); h.vote(r); h.abstain(r); assert.equal(r.round, 3);
  assert.equal(r.activeFollowUp.id, question); h.host(r, 'clearFollowUp'); assert.equal(r.activeFollowUp, null);
});

test('v4 optional automatic wrap-up cannot complete or undo tasks; legacy snapshots keep their rule', () => {
  const h = harness(), r = h.talk({talkEndBehavior:'automatic',talkSeconds:30,wrapUpSeconds:30});
  const wolf = Object.values(r.players).find(p => p.role === 'WOLF');
  const villager = Object.values(r.players).find(p => p.villageTask);
  h.send(r,wolf.id,'completeTask',{taskId:r.tasks[0].id});
  h.send(r,villager.id,'completeTask',{taskId:villager.villageTask.id});
  h.advance(r,r.deadlineAt-h.now());
  assert.equal(r.phase,'WRAP_UP');
  const before = JSON.stringify(r);
  for (const [id,taskId] of [[wolf.id,r.tasks[0].id],[villager.id,villager.villageTask.id]]) {
    fails(()=>h.send(r,id,'completeTask',{taskId}),'WRONG_PHASE');
    fails(()=>h.send(r,id,'undoTask',{taskId}),'WRONG_PHASE');
    const a = h.E.projectState(r,id,h.now()).private.actions;
    assert.equal(a.canCompleteTask,false); assert.equal(a.canUndoTask,false);
  }
  assert.equal(JSON.stringify(r),before);
  assert.equal(h.E.projectState(r,'p0',h.now()).private.actions.canEndTalk,true);
  r.flowVersion=3;
  h.send(r,wolf.id,'undoTask',{taskId:r.tasks[0].id});
  assert.equal(r.tasks[0].completed,null);
  h.send(r,wolf.id,'completeTask',{taskId:r.tasks[0].id});
  assert.ok(r.tasks[0].completed);
});

test('content taxonomy migrations normalize persisted exposure aliases without replacing dealt cards', () => {
  const content = fixtureContent();
  content.normalizeGroup = value => typeof value === 'string' ? value.replace(/^old-group-/,'group-') : value;
  content.normalizeFamily = value => typeof value === 'string' ? value.replace(/^old-family-/,'family-') : value;
  content.normalizeHistoryEntry = entry => ({...entry,variantGroup:content.normalizeGroup(entry.variantGroup),family:content.normalizeFamily(entry.family)});
  const h=harness(content),r=h.room({enabledProfessions:[]});
  r.exposureHistory={version:1,serial:1,
    wolfTasks:[{canonicalTaskKey:'prior-wolf',variantGroup:'old-group-0',family:'old-family-0',sequence:1,matchId:'old'}],
    villageTasks:[{canonicalTaskKey:'prior-bait',variantGroup:'old-group-1',family:'old-family-1',sequence:1,matchId:'old'}],
    deals:[{matchId:'old',sequence:1,wolfGroups:['old-group-0'],allActionGroups:['old-group-0','old-group-1'],families:['old-family-0','old-family-1']}]};
  h.E.prepareHistory(r);
  assert.equal(r.exposureHistory.wolfTasks[0].variantGroup,'group-0');
  assert.equal(r.exposureHistory.villageTasks[0].variantGroup,'group-1');
  assert.deepEqual(copy(r.exposureHistory.deals[0].wolfGroups),['group-0']);
  assert.deepEqual(copy(r.exposureHistory.deals[0].allActionGroups),['group-0','group-1']);
  assert.deepEqual(copy(r.exposureHistory.deals[0].families),['family-0','family-1']);
  const normalized=JSON.stringify(r.exposureHistory); h.E.prepareHistory(r);
  assert.equal(JSON.stringify(r.exposureHistory),normalized);
  h.host(r,'startGame');
  assert.ok(r.tasks.every(t=>!['group-0','group-1'].includes(t.variantGroup)));
  const dealt=JSON.stringify(r.tasks),matchId=r.matchId;
  h.E.prepareHistory(r);
  assert.equal(JSON.stringify(r.tasks),dealt); assert.equal(r.matchId,matchId);
});

test('older v4 snapshots get corrected clue tags without replacing their immutable task text or progress', () => {
  const content=fixtureContent();
  content.normalizeTasks=require('../chat-wolf-v4-taxonomy.js').normalize;
  content.exclusionClues={object_address:'No wolf task requires speaking directly to an object.'};
  content.wolfTasks[24].actionTags=['object_address','apology'];
  const h=harness(content),r=h.talk({roundCount:1,enabledProfessions:[]});
  // An older snapshot already contained this wording but omitted the semantic
  // object-address tag; using only those stale tags would produce a false clue.
  r.tasks[0]={...r.tasks[0],text:'Apologize to your phone for blaming it when you keep checking it.',
    actionTags:['apology'],variantGroup:'apologize_to_object',completed:{by:'p0',at:h.now(),round:1}};
  r.tasks[1].actionTags=[];r.tasks[2].actionTags=[];
  const saved=JSON.stringify(r.tasks);
  h.host(r,'endTalk');
  assert.equal(r.phase,'FINAL_CLUES'); assert.equal(r.tasksFrozen,true);
  assert.equal(r.finalClues.negative,null);
  assert.equal(JSON.stringify(r.tasks),saved);
  const clue=JSON.stringify(r.finalClues);h.E.advanceExpired(r,h.now());
  assert.equal(JSON.stringify(r.finalClues),clue);
});

test('each meeting has one saved slot for everyone, only current player or host can advance', () => {
  const h = harness(), r = h.talk(); h.host(r, 'endTalk');
  assert.equal(r.phase, 'MEETING_TURNS'); assert.equal(r.meeting.order.length, 6); assert.equal(new Set(r.meeting.order).size, 6);
  const firstOrder = copy(r.meeting.order); let previousVersion = r.phaseVersion;
  for (let i = 0; i < 6; i++) {
    const p = r.meeting.order[i], other = r.meeting.order.find(id => id !== p && id !== 'p0');
    fails(() => h.send(r, other, 'endMeetingTurn'), 'HOST_ONLY');
    const view = h.E.projectState(r, p, h.now()); assert.equal(view.private.actions.canEndMeetingTurn, true);
    assert.equal(view.public.meeting.currentSpeakerId, p); assert.equal(view.public.meeting.speakerIndex, i);
    assert.equal(view.public.meeting.completedPlayerIds.length, i);
    if (i % 3 === 0) h.send(r, p, 'endMeetingTurn', { meetingId: r.meeting.id });
    else if (i % 3 === 1) h.host(r, 'skipMeetingTurn');
    else h.advance(r, r.deadlineAt - h.now());
    assert.ok(r.phaseVersion > previousVersion); previousVersion = r.phaseVersion;
  }
  assert.equal(r.phase, 'VOTING'); assert.deepEqual(copy(r.meeting.completedPlayerIds), firstOrder);
  h.abstain(r); h.host(r, 'endTalk'); assert.deepEqual(copy(r.meeting.order), [...firstOrder.slice(1), firstOrder[0]]);
});

test('meeting pause, next-person duration changes, stale timeouts and host bypass are fenced', () => {
  const h = harness(), r = h.talk(); h.host(r, 'endTalk'); h.advance(r, 10000);
  h.host(r, 'pause'); const remaining = r.pausedRemainingMs, current = r.meeting.order[0];
  h.host(r, 'setMeetingTurnSeconds', { seconds: 30 }); assert.equal(r.meeting.turnSeconds, 60); assert.equal(r.meeting.nextTurnSeconds, 30);
  assert.equal(r.pausedRemainingMs, remaining); h.advance(r, 100000); assert.equal(r.meeting.speakerIndex, 0);
  h.host(r, 'resume'); assert.equal(r.deadlineAt, h.now() + remaining);
  const stale = { matchId: r.matchId, phaseVersion: r.phaseVersion, meetingId: r.meeting.id };
  h.advance(r, remaining); assert.equal(r.meeting.speakerIndex, 1); assert.equal(r.meeting.turnSeconds, 30);
  fails(() => h.send(r, current, 'endMeetingTurn', stale), 'STALE_ACTION'); assert.equal(r.meeting.speakerIndex, 1);
  fails(() => h.host(r, 'skipMeetingTurn', { meetingId: 'old-meeting' }), 'STALE_ACTION');
  assert.equal(h.E.projectState(r, 'p0').public.estimatedSeconds, 3050 - 17 * 30);
  h.host(r, 'endMeeting'); assert.equal(r.phase, 'VOTING');
});

test('final talk freezes tasks before clues, then uses individual meeting turns; all meeting task reports reject', () => {
  const h = harness(), r = h.talk({ roundCount: 1, enabledProfessions: ['veteran', 'judge', 'contrarian'], infoRoleLimit: 2 });
  for (const p of Object.values(r.players)) if (p.villageTask) h.send(r, p.id, 'completeTask', { taskId: p.villageTask.id });
  h.host(r, 'endTalk'); assert.equal(r.phase, 'FINAL_CLUES'); assert.equal(r.tasksFrozen, true);
  const wolf = Object.values(r.players).find(p => p.role === 'WOLF');
  fails(() => h.send(r, wolf.id, 'completeTask', { taskId: r.tasks[0].id }), 'WRONG_PHASE');
  h.host(r, 'endClues'); assert.equal(r.phase, 'MEETING_TURNS');
  fails(() => h.send(r, wolf.id, 'completeTask', { taskId: r.tasks[0].id }), 'WRONG_PHASE');
});

test('snapshot compatibility keeps old auto-timed talk and whole-meeting timing until redeal', () => {
  const h = harness(), r = h.started(); r.flowVersion = 3; delete r.settings.talkEndBehavior;
  const cards = JSON.stringify(r.tasks); h.host(r, 'beginTalk'); assert.ok(r.deadlineAt);
  h.advance(r, r.deadlineAt - h.now()); assert.equal(r.phase, 'WRAP_UP');
  h.advance(r, r.deadlineAt - h.now()); assert.equal(r.phase, 'MEETING_DISCUSS');
  assert.equal(r.deadlineAt - h.now(), 60000); assert.equal(JSON.stringify(r.tasks), cards);
  h.host(r, 'restart', { keepTopic: true }); assert.equal(r.flowVersion, 4); assert.equal(r.phase, 'ROLE_REVEAL');
});

test('ten immediate same-topic restarts across 100 seeds obey canonical/group/generic/voice rules before any ACK', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const h = harness(), r = h.started({ topicId: 'a', enabledProfessions: [] }, seed), seen = new Set();
    for (let deal = 0; deal < 10; deal++) {
      if (deal) h.host(r, 'restart', { keepTopic: true });
      for (const task of r.tasks) { assert.equal(seen.has(task.canonicalTaskKey), false); seen.add(task.canonicalTaskKey); }
      const prior = r.exposureHistory.deals.slice(-4, -1).flatMap(d => d.allActionGroups);
      assert.ok(r.tasks.every(t => !prior.includes(t.variantGroup)));
      assert.ok(r.tasks.filter(t => t.isGeneric).length <= 1);
      assert.ok(r.tasks.filter(t => t.type === 'self_action' && t.performanceGroup === 'voice').length <= 1);
      assert.equal(Object.values(r.players).some(p => p.roleAcknowledged), false);
      assert.equal(r.exposureHistory.wolfTasks.length, (deal + 1) * 3);
    }
  }
});

test('shared exposures record once, village history is separate, rerolls record and reads do not', () => {
  const h = harness(), r = h.started({ playerCount: 12, infoRoleLimit: 2 });
  assert.equal(r.exposureHistory.wolfTasks.length, 3); assert.equal(r.exposureHistory.villageTasks.length, 6);
  const serial = r.exposureHistory.serial;
  for (let i = 0; i < 4; i++) for (const id of Object.keys(r.players)) h.E.projectState(copy(r), id);
  assert.equal(r.exposureHistory.serial, serial);
  const p = Object.values(r.players).find(p => p.profession === 'reporter'), previous = p.villageTask.id;
  h.send(r, p.id, 'rerollTask'); assert.equal(r.exposureHistory.wolfTasks.length, 3);
  assert.equal(r.exposureHistory.villageTasks.length, 7); assert.ok(r.exposureHistory.villageTasks.some(t => t.id === previous));
  assert.equal(new Set(r.exposureHistory.wolfTasks.map(t => t.exposureId)).size, 3);
  assert.equal(JSON.stringify(h.E.projectState(r, p.id)).includes('exposureHistory'), false);
});

test('scope history can carry into a new room or another topic without canonical resets', () => {
  const h = harness(), first = h.started({ topicId: 'a' }); const prior = first.tasks.map(t => t.canonicalTaskKey);
  const second = h.room({ topicId: 'b' }); second.exposureHistory = copy(first.exposureHistory);
  h.host(second, 'startGame'); assert.ok(second.tasks.every(t => !prior.includes(t.canonicalTaskKey)));
  assert.equal(second.exposureHistory.wolfTasks.length, 6);
  h.host(second, 'cancelGame'); h.host(second, 'replay'); assert.equal(second.exposureHistory.wolfTasks.length, 6);
});

test('complete combination search backtracks rather than falsely reporting shortage', () => {
  const content = fixtureContent();
  content.wolfTasks = [
    { ...content.wolfTasks[31], id: 's-block', canonicalTaskKey: 's-block', variantGroup: 'block', isGeneric:true, performanceGroup:'voice' },
    { ...content.wolfTasks[32], id: 's-voice', canonicalTaskKey: 's-voice', variantGroup: 'voice', isGeneric:false, performanceGroup:'voice' },
    { ...content.wolfTasks[33], id: 's-generic', canonicalTaskKey: 's-generic', variantGroup: 'generic', isGeneric:true, performanceGroup:null },
    { ...content.wolfTasks[34], id: 's-plain', canonicalTaskKey: 's-plain', variantGroup: 'plain', isGeneric:false, performanceGroup:null },
  ];
  for (let seed = 1; seed <= 100; seed++) {
    const h = harness(content), r = h.started({ enabledProfessions: [] }, seed);
    assert.deepEqual(Array.from(r.tasks,t=>t.id).sort(),['s-generic','s-plain','s-voice']);
  }
});

test('exhaustion is nonsecret and atomic; explicit relaxation restores oldest history without clearing it', () => {
  const content = fixtureContent(); content.wolfTasks = [content.wolfTasks[30], content.wolfTasks[32], content.wolfTasks[33]];
  const h = harness(content), r = h.started({ enabledProfessions: [] }); const before = JSON.stringify(r);
  fails(() => h.host(r, 'restart', { keepTopic: true }), 'CONTENT_EXHAUSTED'); assert.equal(JSON.stringify(r), before);
  h.host(r, 'restart', { keepTopic: true, allowRecentRepeat: true });
  assert.equal(r.contentRepeatException, true); assert.equal(r.exposureHistory.wolfTasks.length, 6);
  assert.equal(r.exposureHistory.deals.at(-1).exception, true); assert.equal(r.phase, 'ROLE_REVEAL');
});

test('deprecated, unreviewed, incompatible or duplicate-voice cards never become a fallback', () => {
  const content = fixtureContent(); const one = content.wolfTasks[31], voice = content.wolfTasks[25];
  content.wolfTasks = [one, voice,
    { ...content.wolfTasks[26], id: 'unreviewed', reviewed: false },
    { ...content.wolfTasks[31], id: 'deprecated', active: false, status: 'deprecated' },
    { ...content.wolfTasks[32], id: 'incompatible', compatibleTopicIds: ['elsewhere'] },
    { ...voice, id: 'voice-two', canonicalTaskKey: 'second', variantGroup: 'different-voice' }];
  const h = harness(content), r = h.room({ enabledProfessions: [] }); const before = JSON.stringify(r);
  fails(() => h.host(r, 'startGame', { allowRecentRepeat: true }), 'CONTENT_EXHAUSTED');
  assert.equal(JSON.stringify(r), before); assert.equal(r.exposureHistory, undefined);
});

test('random topic selection lowers recent topic/category weights without blocking a manual choice', () => {
  const content = fixtureContent();
  content.topics[0].category='Recent';content.topics[1].category='Fresh';
  let repeats=0;
  for(let seed=1;seed<=200;seed++) {
    const h=harness(content),r=h.room({enabledProfessions:[]},seed);
    r.topicHistory=Array(5).fill('a');
    h.host(r,'startGame');if(r.topic.id==='a')repeats++;
  }
  assert.ok(repeats<40,'soft recent-history preference must materially affect the draw');
  const h=harness(content),r=h.room({topicId:'a',enabledProfessions:[]});
  r.topicHistory=Array(5).fill('a');h.host(r,'startGame');assert.equal(r.topic.id,'a');
});

test('pending final Judge decision cannot be bypassed by host restart or cancellation',()=>{
  const h=harness(),r=h.talk({enabledProfessions:['judge'],infoRoleLimit:2});
  const judge=Object.values(r.players).find(p=>p.profession==='judge');
  h.send(r,judge.id,'completeTask',{taskId:judge.villageTask.id});
  h.vote(r);h.abstain(r);h.vote(r);h.abstain(r);h.vote(r);
  const ids=Object.keys(r.players);
  for(let i=0;i<ids.length;i++)h.send(r,ids[i],'submitVote',{selections:[ids[(i+1)%ids.length]]});
  assert.equal(r.phase,'JUDGE_DECISION');
  const before=JSON.stringify(r);
  fails(()=>h.host(r,'restart',{}),'JUDGE_PENDING');
  fails(()=>h.host(r,'cancelGame',{}),'JUDGE_PENDING');
  assert.equal(JSON.stringify(r),before);
  const a=h.E.projectState(r,'p0').private.actions;
  assert.equal(a.canRestart,false);assert.equal(a.canCancel,false);
  h.host(r,'pause');h.host(r,'resume');
  h.advance(r,r.settings.judgeSeconds*1000+1);assert.equal(r.phase,'FINISHED');
});
