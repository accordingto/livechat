'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../chat-wolf-v4-content.js');
const E=require('../chat-wolf-v3-engine.js');
const S=require('../chat-wolf-v6-soft-tells.js');

function roomFor(topicId,taskCount=3,seed=17){
  const room=E.createRoom({code:'TELLS7',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',
    settings:{topicId,taskCount},now:1,seed});
  for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
  return room;
}
function assertQuality(room){
  assert.ok(room.tasks.filter(t=>t.noticeableTell===true).length>=Math.ceil(room.tasks.length/2),
    room.topic.id+': at least half the actual deal has an audible tell');
  assert.ok(room.tasks.every(t=>t.type==='self_action'&&t.reviewed===true));
  assert.equal(new Set(room.tasks.map(t=>t.canonicalTaskKey)).size,room.tasks.length);
  assert.equal(new Set(room.tasks.map(t=>t.variantGroup)).size,room.tasks.length);
  assert.ok(room.tasks.filter(t=>t.isGeneric).length<=1);
  assert.ok(room.tasks.filter(t=>t.performanceGroup==='voice').length<=1);
}

test('noticeable status is a reviewed per-card goal, never a family or quotation shortcut',()=>{
  assert.equal(C.wolfTasks.length,501,'incremental editorial changes do not inflate the bank');
  assert.ok(C.wolfTasks.every(t=>typeof t.noticeableTell==='boolean'));
  for(const task of C.wolfTasks.filter(t=>t.noticeableTell)){
    assert.equal(task.type,'self_action',task.id);
    assert.equal(task.requiredOtherPlayerCount,0,task.id);
    assert.ok(task.tellEvidence,task.id+': declared audible evidence is required');
  }
  for(const id of ['wolf_v5_a_s_travel-past',
    'wolf_v5_a_s_room-temperature','wolf_v5_a_s_object-fixed',
    'w5-core-regret','w5-core-changed','wolf_v6_soft_pleasure-impressed']){
    assert.equal(C.wolfTasks.find(t=>t.id===id).noticeableTell,false,id+': natural conversation is not a tell');
  }
  assert.equal(C.wolfTasks.find(t=>t.id==='w5-core-clap').noticeableTell,true);
  assert.equal(C.wolfTasks.find(t=>t.id==='wolf_v6_soft_room-quiet').noticeableTell,true);
});

test('weak stress and pauses are replaced by exact audible instructions with honest changed-goal keys',()=>{
  const original=new Map(C.previousNoticeableWolfTasks.map(t=>[t.id,t]));
  for(const id of ['wolf_v6_soft_trip-rule','wolf_v6_soft_room-habit','wolf_v6_soft_pause-word']){
    const task=C.wolfTasks.find(t=>t.id===id);
    assert.match(task.text,/four seconds/);
    assert.equal(task.noticeableTell,true);
    assert.equal(task.variantGroup,'dramatic_pause');
    assert.equal(task.performanceGroup,'voice');
    assert.notEqual(task.canonicalTaskKey,original.get(id).canonicalTaskKey);
    assert.equal(task.previousCanonicalTaskKey,original.get(id).canonicalTaskKey);
    assert.deepEqual(task.replaces,[],'a new requirement is not a readability-only rewrite');
  }
  for(const id of ['wolf_v6_soft_food-delicious','wolf_v6_soft_absolutely']){
    const task=C.wolfTasks.find(t=>t.id===id);
    assert.match(task.text,/much louder/);
    assert.equal(task.variantGroup,'emphasize_one_word');
  }
  const oldPause=original.get('wolf_v6_soft_pause-word');
  assert.match(oldPause.text,/briefly/,'the previous released wording remains available for audit');
  assert.equal(oldPause.canonicalTaskKey,'v6-soft:pause-word');
});

test('actual new mechanics retain honest shared groups and matching partial clue semantics',()=>{
  const analogies=C.wolfTasks.filter(t=>t.previousCanonicalTaskKey&&t.variantGroup==='compare_unlike_things');
  assert.ok(analogies.length>=12);
  assert.ok(analogies.every(t=>t.actionTags.includes('analogy')));
  assert.ok(analogies.every(t=>t.positiveClues.includes('One task compares unlike concepts.')));
  assert.ok(analogies.every(t=>t.family==='analogy'));
  assert.equal(C.wolfTasks.find(t=>t.id==='wolf_v5_b_s-social-listen').variantGroup,'offer_concrete_exchange');
  const phrases=C.wolfTasks.filter(t=>t.noticeableTell&&/^Say:/.test(t.text));
  assert.ok(phrases.length>=12);
  assert.ok(phrases.every(t=>t.variantGroup==='prepared_one_line'),
    'changing an odd line does not manufacture a new action group');
});

test('magic-specific new goals have only actual magic-topic links',()=>{
  const rewritten=C.wolfTasks.filter(t=>t.id.startsWith('wolf_v5_b_s-power-')&&t.canonicalTaskKey.startsWith('v7-tell:'));
  assert.ok(rewritten.length>=12);
  for(const task of rewritten){
    assert.deepEqual(task.compatibleTopicIds,['topic_v2_17','topic_v2_24'],task.id);
    assert.equal(task.isGeneric,false,task.id);
    assert.ok(!task.compatibleTopicTags?.length,task.id+': no hidden wildcard');
  }
});

test('every topic has genuine six-tell capacity and fresh deals meet the quota at all useful sizes',()=>{
  for(const topic of C.topics){
    const tells=C.wolfTasks.filter(t=>t.noticeableTell&&E.compatible(t,topic));
    const topicalNonVoice=tells.filter(t=>!t.isGeneric&&t.performanceGroup!=='voice');
    assert.ok(new Set(topicalNonVoice.map(t=>t.variantGroup)).size>=6,topic.id);
    for(const taskCount of [1,2,3,5,12]){
      const room=roomFor(topic.id,taskCount);
      E.dispatch(room,'p0','startGame',{},2);
      assert.equal(room.tasks.length,taskCount);
      assertQuality(room);
    }
  }
});

test('default deals remain strict through 11 same-topic games across all 48 topics',()=>{
  for(const topic of C.topics)for(const seed of [1,17,61,93]){
    const room=roomFor(topic.id,3,seed);
    for(let deal=0;deal<11;deal++){
      const keys=new Set((room.exposureHistory?.wolfTasks||[]).map(t=>t.canonicalTaskKey));
      const groups=new Set((room.exposureHistory?.deals||[]).slice(-3)
        .flatMap(d=>d.allActionGroups||d.wolfGroups||[]).map(C.normalizeGroup));
      E.dispatch(room,'p0',deal?'restart':'startGame',deal?{keepTopic:true}:{},deal+2);
      assertQuality(room);
      assert.equal(room.contentRepeatException,false);
      assert.ok(room.tasks.every(t=>!keys.has(t.canonicalTaskKey)),topic.id+'/'+seed+'/'+deal+': canonical history');
      assert.ok(room.tasks.every(t=>!groups.has(t.variantGroup)),topic.id+'/'+seed+'/'+deal+': mechanic history');
    }
  }
});

test('new tell overlay is deterministic in browser and CommonJS and preserves archival data',()=>{
  const files=['a','b','c','core'].map(suffix=>'chat-wolf-v5-readable-'+suffix+'.js').concat('chat-wolf-v6-soft-tells.js');
  const context={};
  for(const filename of files){
    const source=fs.readFileSync(path.resolve(__dirname,'..',filename),'utf8');
    assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|OPENAI_API_KEY|localStorage/);
    vm.runInNewContext(source,context,{filename});
  }
  assert.equal(JSON.stringify(context.CHAT_WOLF_V6_SOFT_TELLS),JSON.stringify(S));
  assert.equal(S.previousNoticeableTasks.length,122);
  assert.ok(C.previousReadableWolfTasks.some(t=>t.id==='wolf_v5_a_s_travel-budget'&&t.text==='State your maximum budget for a day out.'));
});
