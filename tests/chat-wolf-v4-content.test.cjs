'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../chat-wolf-v4-content.js');
const E=require('../chat-wolf-v3-engine.js');
test('release pool meets every unique-canonical topic gate and supports a default six-player deal',()=>{
  assert.equal(C.releaseStage,'release');
  assert.equal(C.topics.length,48);
  for(const topic of C.topics){
    assert.equal(topic.followUps.length,8);
    const pool=[...new Map(C.wolfTasks.filter(t=>E.compatible(t,topic)).map(t=>[t.canonicalTaskKey,t])).values()];
    assert.ok(pool.length>=60,topic.id+': 60 unique cards');
    assert.ok(pool.filter(t=>t.type==='interaction').length>=20,topic.id+': 20 interactions');
    assert.ok(pool.filter(t=>t.type==='self_action').length>=40,topic.id+': 40 self actions');
    assert.ok(new Set(pool.map(t=>t.family)).size>=8,topic.id+': 8 broad families');
    const room=E.createRoom({code:'CHECKX',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',settings:{topicId:topic.id},now:1,seed:17});
    for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
    E.dispatch(room,'p0','startGame',{},2);
    assert.equal(room.tasks.length,3);
    assert.equal(room.tasks.filter(t=>t.type==='interaction').length,1);
    assert.ok(room.tasks.every(t=>E.compatible(t,topic)&&t.status==='active'));
    assert.equal(new Set(room.tasks.map(t=>t.variantGroup)).size,3);
  }
});
test('every authored wolf card has bilingual explicit metadata and preserves English quoted lines',()=>{
  assert.equal(new Set(C.wolfTasks.map(t=>t.id)).size,C.wolfTasks.length);
  for(const t of C.wolfTasks){
    assert.ok(t.canonicalTaskKey&&t.variantGroup&&t.actionTags.length,t.id);
    assert.equal(t.variantGroup,t.mechanicKey,t.id);
    assert.match(t.textZh,/[\u3400-\u9fff]/u,t.id);
    assert.equal(t.active,true,t.id);
    assert.equal(t.reviewed,true,t.id);
    for(const line of t.requiredUtterances||[]){
      assert.ok(t.text.includes(line),t.id);
      assert.ok(t.textZh.includes(line),t.id+': do not translate the required spoken words');
    }
    if(/["“][^"”]+["”]/.test(t.text))assert.ok(t.actionTags.includes('prepared_sentence'),t.id);
    if(/\bapologi[sz]e\b/i.test(t.text))assert.ok(t.actionTags.includes('apology'),t.id);
  }
});
test('changing a prepared one-line quote does not manufacture a new action group',()=>{
  const lines=C.wolfTasks.filter(t=>t.type==='self_action'&&t.performanceGroup!=='voice'&&/^(Say|Read|Read out)\b/i.test(t.text)&&['fixed_phrase','quotation','quoted_line'].includes(t.family));
  // Families are normalized too; inspect the shared group directly.
  const grouped=C.wolfTasks.filter(t=>t.variantGroup==='prepared_one_line');
  assert.ok(grouped.length>20);
  assert.ok(grouped.every(t=>t.actionTags.includes('prepared_sentence')));
  assert.ok(lines.every(t=>t.variantGroup==='prepared_one_line'));
});

test('migration preserves older village exposures and cross-source bait mechanics',()=>{
  const room=E.createRoom({code:'OLD123',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',now:1,seed:7});
  room.recentTasks=[{id:'v3-hobbies-bait-2',mechanicKey:'bait:2',topicId:'hobbies'},
    {id:'v3-gifts-bait-1',mechanicKey:'bait:1',topicId:'gifts'}];
  const history=E.prepareHistory(room);
  assert.equal(history.villageTasks.length,2);assert.equal(history.wolfTasks.length,0);
  assert.ok(history.deals[0].allActionGroups.includes('three_audible_beats'));
  assert.ok(history.deals[0].allActionGroups.includes('prepared_one_line'));
  E.prepareHistory(room);assert.equal(history.villageTasks.length,2);
});

test('cross-bank semantic aliases do not manufacture new families or false exclusion clues',()=>{
  assert.equal(C.normalizeGroup('offer_chore_trade'),C.normalizeGroup('make_conditional_bargain'));
  assert.equal(C.normalizeGroup('guess_a_number'),C.normalizeGroup('get_number_estimate'));
  assert.equal(C.normalizeGroup('give_playful_warning'),C.normalizeGroup('invent_warning'));
  assert.equal(C.normalizeFamily('correction'),'reframe');
  assert.equal(C.normalizeFamily('concrete_comparison'),'analogy');
  for(const task of C.wolfTasks){
    assert.notEqual(task.family,'prediction',task.id);
    assert.ok(!/^guess_my_/.test(task.variantGroup),task.id);
    if(['address_object','apologize_to_object','thank_object','promise_to_object'].includes(task.variantGroup))
      assert.ok(task.actionTags.includes('object_address'),task.id);
  }
});
