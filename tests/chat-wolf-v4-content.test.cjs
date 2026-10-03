'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../chat-wolf-v4-content.js');
const E=require('../chat-wolf-v3-engine.js');
const RULES=require('../chat-wolf-v3-rules.js');
const banks=['a','b','c','core'].map(name=>({name,content:require('../chat-wolf-v5-readable-'+name+'.js')}));
const words=text=>text.trim().split(/\s+/u).length;
function sixPlayerRoom(engine=E,settings={},seed=17){
  const room=engine.createRoom({code:'CHECKX',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',settings,now:1,seed});
  for(let i=1;i<6;i++)engine.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
  return room;
}
test('formal release supports an honest three-self-action default deal on every topic',()=>{
  assert.equal(C.releaseStage,'release');
  assert.equal(C.contentPolicy,'self-soft-tell');
  assert.equal(C.topics.length,48);
  for(const topic of C.topics){
    assert.equal(topic.followUps.length,8);
    const pool=[...new Map(C.wolfTasks.filter(t=>E.compatible(t,topic)).map(t=>[t.canonicalTaskKey,t])).values()];
    // The user explicitly superseded the former 60/20/40 quantity quota.
    // Keep real playability checks; repetition statistics belong in the report.
    assert.equal(pool.filter(t=>t.type==='interaction').length,0,topic.id+': interactions are archived');
    assert.ok(pool.filter(t=>t.type==='self_action').length>=3,topic.id+': three self actions exist');
    for(const seed of [1,17,91]){
      const room=sixPlayerRoom(E,{topicId:topic.id},seed);
      E.dispatch(room,'p0','startGame',{},2);
      assert.equal(room.tasks.length,3);
      assert.equal(room.tasks.filter(t=>t.type==='interaction').length,0);
      assert.equal(room.tasks.filter(t=>t.type==='self_action').length,3);
      assert.ok(room.tasks.every(t=>E.compatible(t,topic)&&t.status==='active'));
      assert.equal(new Set(room.tasks.map(t=>t.canonicalTaskKey)).size,3);
      assert.equal(new Set(room.tasks.map(t=>t.variantGroup)).size,3);
      assert.ok(room.tasks.filter(t=>t.isGeneric).length<=1);
      assert.ok(room.tasks.filter(t=>t.performanceGroup==='voice').length<=1);
    }
  }
});
test('every authored wolf card has bilingual explicit metadata and preserves English quoted lines',()=>{
  assert.equal(new Set(C.wolfTasks.map(t=>t.id)).size,C.wolfTasks.length);
  const topicIds=new Set(C.topics.map(t=>t.id));
  for(const t of C.wolfTasks){
    assert.ok(t.canonicalTaskKey&&t.variantGroup&&t.actionTags.length,t.id);
    assert.equal(t.variantGroup,t.mechanicKey,t.id);
    assert.equal(t.source,'wolf',t.id);
    assert.ok(['interaction','self_action'].includes(t.type),t.id);
    assert.equal(t.requiredOtherPlayerCount,t.type==='interaction'?1:0,t.id);
    assert.match(t.textZh,/[\u3400-\u9fff]/u,t.id);
    assert.equal(t.active,true,t.id);
    assert.equal(t.status,'active',t.id);
    assert.equal(t.reviewed,true,t.id);
    assert.equal(t.activityLanguage,'en',t.id);
    assert.equal(t.contentVersion,C.version,t.id);
    assert.equal(typeof t.isGeneric,'boolean',t.id);
    assert.ok(t.positiveClues.length&&t.positiveCluesZh.length,t.id);
    assert.equal(t.positiveClues.length,t.positiveCluesZh.length,t.id);
    assert.ok(t.positiveClues.every(clue=>clue!==t.text),t.id+': clue does not reveal the task');
    if(t.isGeneric){
      assert.equal(t.type,'self_action',t.id);
      assert.deepEqual(t.compatibleTopicTags,['*'],t.id);
    }else{
      assert.ok(t.compatibleTopicIds.length,t.id+': literal topic mapping required');
      assert.ok(!t.compatibleTopicTags?.length,t.id+': no hidden wildcard');
      assert.ok(t.compatibleTopicIds.every(id=>topicIds.has(id)),t.id);
      assert.equal(t.compatibleTopicIds.length,new Set(t.compatibleTopicIds).size,t.id);
    }
    assert.ok(!Object.hasOwn(t,'ownerPlayerId'),t.id+': all wolf tasks remain shared');
    assert.ok(!Object.hasOwn(t,'requiredTargets'),t.id+': no evidence paperwork');
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
  assert.ok(grouped.length>0,'prepared lines remain an optional mechanic, not a content quota');
  assert.ok(grouped.every(t=>t.actionTags.includes('prepared_sentence')));
  assert.ok(lines.every(t=>t.variantGroup==='prepared_one_line'));
});

test('active wolf instructions are 6–14 English words and exclude retired creative-writing constructions',()=>{
  for(const task of C.wolfTasks){
    assert.ok(words(task.text)>=6&&words(task.text)<=14,task.id+': '+words(task.text)+' words');
    assert.doesNotMatch(task.text,/topic-related|connected to the topic|about the current topic/i,task.id);
    assert.doesNotMatch(task.text,/invent (?:a |an )?(?:name|word)|nickname|give yourself a name|third.person|say your own name/i,task.id);
    assert.doesNotMatch(task.text,/robot voice|station announcement|navigation voice|pretend to be|imaginary rent|apologize to (?:an? |the )?(?:lamp|mug)|worries inside pillowcases|sofa cancelling|weather report|worn kitchen apron/i,task.id);
    assert.doesNotMatch(task.text,/upload|record evidence|submit evidence|host approval|raise your hand|thumbs.up/i,task.id);
    assert.ok(!['prediction','object_address','object_viewpoint'].includes(task.family),task.id);
  }
});

test('all 48 main questions are concise bilingual updates, not topic-title templates',()=>{
  const updates=Object.assign({},...banks.map(bank=>bank.content.topicUpdates||{}));
  assert.equal(Object.keys(updates).length,48);
  for(const topic of C.topics){
    assert.equal(topic.mainQuestion,updates[topic.id].mainQuestion,topic.id);
    assert.equal(topic.mainQuestionZh,updates[topic.id].mainQuestionZh,topic.id);
    assert.ok(words(topic.mainQuestion)<=24,topic.id+': main topic should fit one short glance');
    assert.ok((topic.mainQuestion.match(/[.!?]/g)||[]).length<=2,topic.id+': at most two short sentences');
    assert.ok((topic.mainQuestion.match(/\?/g)||[]).length<=1,topic.id+': no second independent question');
    assert.match(topic.mainQuestionZh,/[\u3400-\u9fff]/u,topic.id);
    assert.equal(topic.followUps.length,8,topic.id+': follow-ups are retained');
  }
});

test('formal draw pool contains only curated self actions; old interactions remain audit-only',()=>{
  const authored=banks.flatMap(bank=>bank.content.tasks).filter(t=>t.type==='self_action').concat(require('../chat-wolf-v6-soft-tells.js').newTasks);
  assert.deepEqual(C.wolfTasks.map(t=>t.id).sort(),authored.map(t=>t.id).sort());
  assert.equal(C.experimentalWolfTasks.length,246);
  assert.ok(C.experimentalWolfTasks.every(t=>t.type==='interaction'));
  const retiredIds=new Set(C.previousWolfTasks.map(t=>t.id));
  assert.ok(retiredIds.size>0);
  assert.ok(C.wolfTasks.every(t=>!retiredIds.has(t.id)),'no retired prose can re-enter the active pool');
  // Even with an intact old bank available, empty curated content must fail.
  // A quantity shortage must never silently restore creative-writing cards.
  const content={...C,wolfTasks:[]};
  const context={module:{exports:{}},crypto:require('node:crypto').webcrypto,
    require:name=>name.includes('rules')?RULES:content};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../chat-wolf-v3-engine.js'),'utf8'),context);
  const engine=context.module.exports;
  const room=sixPlayerRoom(engine,{topicId:C.topics[0].id});
  const before=JSON.stringify(room);
  assert.throws(()=>engine.dispatch(room,'p0','startGame',{},2),error=>error.code==='CONTENT_EXHAUSTED');
  assert.equal(JSON.stringify(room),before,'failed allocation remains atomic');
});

test('shortened same-goal cards retain old canonical identities and normalized variant groups',()=>{
  const prior=new Map(C.previousWolfTasks.map(t=>[t.id,t]));
  const rewritten=C.wolfTasks.filter(t=>t.replaces?.length);
  // A new odd goal must not be labelled as a same-goal shortening. This pool
  // may contain no wording-only replacements after the V7 goal rewrite.
  const unchanged=C.wolfTasks.filter(t=>C.previousReadableWolfTasks.some(old=>old.id===t.id&&old.text===t.text));
  assert.ok(unchanged.length>0);
  for(const task of unchanged){
    const old=C.previousReadableWolfTasks.find(t=>t.id===task.id);
    assert.equal(task.canonicalTaskKey,old.canonicalTaskKey);
    assert.equal(task.variantGroup,C.normalizeGroup(old.variantGroup));
  }
  for(const task of rewritten)for(const id of task.replaces){
    const old=prior.get(id);
    assert.ok(old,id+': replacement refers to a real prior card');
    assert.equal(task.canonicalTaskKey,old.canonicalTaskKey,task.id);
    assert.equal(task.variantGroup,C.normalizeGroup(old.variantGroup),task.id);
  }
  const changed=C.experimentalWolfTasks.find(t=>t.id==='wolf_v5_b_i-reply-too-direct');
  assert.ok(changed);
  assert.equal(changed.canonicalTaskKey,'v5-b:i-reply-too-direct');
  assert.deepEqual(changed.replaces,[],'a different goal does not masquerade as a wording-only rewrite');
});

test('each readable bank exposes identical browser and CommonJS content without API calls',()=>{
  for(const {name,content}of banks){
    const filename=path.resolve(__dirname,'../chat-wolf-v5-readable-'+name+'.js');
    const source=fs.readFileSync(filename,'utf8');
    assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|OPENAI_API_KEY|localStorage/);
    const context={};vm.runInNewContext(source,context,{filename});
    assert.equal(JSON.stringify(context['CHAT_WOLF_V5_READABLE_'+name.toUpperCase()]),JSON.stringify(content));
  }
});

test('actual readable-content audit reports a 120-card sample and no hidden quality-count exceptions',()=>{
  const report=require('../scripts/chat-wolf-readable-report.cjs');
  assert.equal(report.version,C.version);
  assert.equal(report.activeCards,C.wolfTasks.length);
  assert.equal(report.uniqueCanonicalCards,report.activeCards);
  assert.equal(report.disabledOldCards,C.previousWolfTasks.length);
  assert.equal(report.types.interaction||0,0);
  assert.equal(report.types.self_action,report.activeCards);
  assert.deepEqual(report.over14,[]);
  assert.deepEqual(report.under6,[]);
  assert.deepEqual(report.exactTextDuplicates,[]);
  assert.deepEqual(report.rejectedMechanicFlags,[]);
  assert.ok(report.averageWords>=6&&report.averageWords<=14);
  assert.ok(report.medianWords>=6&&report.medianWords<=14);
  assert.equal(report.editorialSample.length,120);
  assert.equal(new Set(report.editorialSample.map(row=>row.id)).size,120);
  for(const row of report.editorialSample){
    assert.ok(C.wolfTasks.some(task=>task.id===row.id&&task.text===row.text),row.id);
    assert.ok(row.textZh&&row.mechanic,row.id);
    assert.ok(row.words>=6&&row.words<=14,row.id);
  }
  assert.equal(report.perTopic.length,48);
  for(const row of report.perTopic){
    const topic=C.topics.find(t=>t.id===row.id);
    const pool=[...new Map(C.wolfTasks.filter(t=>E.compatible(t,topic)).map(t=>[t.canonicalTaskKey,t])).values()];
    assert.equal(row.candidates,pool.length,row.id);
    assert.equal(row.interaction,pool.filter(t=>t.type==='interaction').length,row.id);
    assert.equal(row.self,pool.filter(t=>t.type==='self_action').length,row.id);
    assert.equal(row.interaction,0,row.id);
    assert.ok(row.self>=3,row.id);
  }
});

test('actual authored pool survives 10 immediate restarts, 10 complete games and 10 changing-topic deals',()=>{
  const report=require('../scripts/chat-wolf-readable-report.cjs');
  for(const [key,expectedDeals]of [['sameTopicRestart',1100],['sameTopicNormal',1000],['changingTopics',1000]]){
    const sequence=report.repeatTests[key];
    assert.equal(sequence.seeds,100,key);
    assert.equal(sequence.successfulDeals,expectedDeals,key);
    assert.deepEqual(sequence.exhaustedRuns,[],key+': no test-only repeated-card permission');
    for(const field of ['canonicalRepeats','recentVariantRepeats','sameDealVariantPairs','historyReset','genericOverCap','voiceOverCap']){
      assert.equal(sequence[field],0,key+'/'+field);
    }
  }
  assert.equal(report.repeatTests.sameTopicRestart.subsequentDealsPerSeed,10);
  assert.equal(report.repeatTests.sameTopicNormal.fullGamesCompleted,1000);
  assert.equal(report.repeatTests.changingTopics.topicChanges,900);
  assert.equal(report.repeatTests.sameTopicRestart.topicChanges,0);
  assert.equal(report.repeatTests.sameTopicNormal.topicChanges,0);
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
  assert.equal(C.normalizeGroup('state_clear_preference'),C.normalizeGroup('reject_one_option'));
  assert.equal(C.normalizeGroup('set_personal_limit'),C.normalizeGroup('set_a_specific_limit'));
  assert.equal(C.normalizeGroup('mention_concrete_detail'),C.normalizeGroup('mention_specific_detail'));
  assert.equal(C.normalizeGroup('share_specific_experience'),C.normalizeGroup('describe_past_example'));
  assert.equal(C.normalizeFamily('gratitude'),'appreciation');
  assert.equal(C.normalizeFamily('comparison'),'reasoning');
  for(const task of C.wolfTasks){
    assert.notEqual(task.family,'prediction',task.id);
    assert.ok(!/^guess_my_/.test(task.variantGroup),task.id);
    if(['address_object','apologize_to_object','thank_object','promise_to_object'].includes(task.variantGroup))
      assert.ok(task.actionTags.includes('object_address'),task.id);
    if(task.variantGroup==='compare_real_options'){
      assert.ok(task.actionTags.length,task.id+': removing the metaphor tag must not remove all metadata');
      assert.ok(!task.actionTags.includes('analogy'),task.id+': comparing real options is not a metaphor');
    }
    if(task.variantGroup==='thank_a_person')assert.ok(!task.actionTags.includes('object_address'),task.id);
  }
});
