'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const directions=require('../chat-wolf-v6-directions.js').directions;
const banks=['a','b','c','core'].map(name=>require('../chat-wolf-v5-readable-'+name+'.js'));
const original=JSON.stringify(banks);
const overlay=require('../chat-wolf-v6-soft-tells.js');
const words=text=>text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[];

test('Director has at least forty reviewed, short, audio-only choices and eight real families',()=>{
  const active=directions.filter(direction=>direction.active&&direction.reviewed);
  assert.ok(active.length>=40);
  assert.equal(new Set(active.map(direction=>direction.id)).size,active.length);
  assert.equal(new Set(active.map(direction=>direction.text)).size,active.length);
  const families=new Map();
  for(const direction of active){
    assert.ok(words(direction.text).length<=14,direction.text);
    assert.equal(direction.pressure,'low');
    assert.equal(direction.editorial.audioOnly,true);
    assert.equal(direction.editorial.noProps,true);
    assert.equal(direction.editorial.singleOutcome,true);
    assert.ok(['shared_soft_tell','director_only'].includes(direction.source));
    families.set(direction.family,(families.get(direction.family)||0)+1);
  }
  assert.ok(families.size>=8);
  for(const count of families.values())assert.ok(count>=2,'Every family supports an alternative direction.');
});

test('Director choices contain no prop, video, disclosure, accusation or vote command',()=>{
  const forbidden=/\b(camera|video|stand up|show us|bring|fetch|prop|secret|politic|vote|wolf|villager|jester|accuse|insult|private|password|strip|naked)\b/i;
  for(const direction of directions)assert.doesNotMatch(direction.text,forbidden);
  assert.ok(directions.some(direction=>direction.source==='director_only'&&/movie trailer|villain|news anchor/.test(direction.text)));
  assert.ok(directions.some(direction=>direction.source==='shared_soft_tell'&&/drumroll|three times/.test(direction.text)));
});

test('Chinese directions preserve any required English words exactly',()=>{
  for(const direction of directions){
    assert.ok(direction.textZh);
    for(const utterance of direction.requiredUtterances||[])assert.ok(direction.textZh.includes(utterance),direction.id+': '+utterance);
  }
});

test('Browser direction bank matches Node without any runtime service',()=>{
  const sandbox={};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../chat-wolf-v6-directions.js'),'utf8'),sandbox);
  assert.equal(JSON.stringify(sandbox.CHAT_WOLF_V6_DIRECTIONS.directions),JSON.stringify(directions));
});

test('Soft Tell edits are a modest overlay and never mutate the previous readable cards',()=>{
  assert.equal(JSON.stringify(banks),original);
  const previous=banks.flatMap(bank=>bank.tasks);
  assert.ok(overlay.overrides.length>0&&overlay.overrides.length<previous.length/10);
  assert.ok(overlay.newTasks.length<previous.length/8);
  assert.equal(overlay.audit.defaultDisabledInteractionCount,previous.filter(task=>task.type==='interaction').length);
  for(const task of overlay.overrides){
    const before=previous.find(item=>item.id===task.id);
    assert.ok(before);
    assert.equal(before.type,'self_action');
    assert.notEqual(task.text,before.text);
    assert.notEqual(task.canonicalTaskKey,before.canonicalTaskKey,'Changed goals need new history identity.');
    assert.equal(task.previousCanonicalTaskKey,before.canonicalTaskKey);
    assert.equal(task.previousTaskId,before.id);
    assert.deepEqual(task.replaces,[],'Changed goals are not audited as wording-only replacements.');
  }
});

test('Soft Tell additions stay literal, brief, audible and self-completable',()=>{
  for(const task of overlay.overrides.concat(overlay.newTasks)){
    const count=words(task.text).length;
    assert.ok(count>=6&&count<=14,task.id+': '+count+' words');
    assert.equal(task.type,'self_action');
    assert.equal(task.requiredOtherPlayerCount,0);
    assert.equal(task.editorial.singleOutcome,true);
    assert.equal(task.editorial.audioOnly,true);
    assert.ok(task.softTell);
    assert.doesNotMatch(task.text,/\b(get someone|make someone|two people|three people|apologize to a lamp|imaginary rent|invent a nickname|name yourself|give yourself a name)\b/i);
    for(const utterance of task.requiredUtterances||[])assert.ok(task.textZh.includes(utterance),task.id);
  }
});

test('Soft Tell mappings are explicit and equivalent mechanics do not gain fresh topic groups',()=>{
  const ids=new Set(Array.from({length:48},(_,index)=>'topic_v2_'+String(index+1).padStart(2,'0')));
  for(const task of overlay.newTasks){
    if(task.isGeneric){
      assert.deepEqual(task.compatibleTopicTags,['*']);
      assert.equal(task.compatibleTopicIds.length,0);
    }else{
      assert.ok(task.compatibleTopicIds.length>0);
      assert.ok(task.compatibleTopicIds.every(id=>ids.has(id)));
      assert.ok(!(task.compatibleTopicTags||[]).includes('*'));
    }
    if(task.text.startsWith('Say ')&&task.text.includes(' twice'))assert.equal(task.variantGroup,'repeat_spoken_words');
    if(task.text.startsWith('Stress '))assert.equal(task.variantGroup,'emphasize_one_word');
    if(task.text.startsWith('Pause '))assert.equal(task.variantGroup,'dramatic_pause');
  }
});

test('Soft Tell browser overlay produces exactly the same authored bank',()=>{
  const sandbox={CHAT_WOLF_V5_READABLE_A:banks[0],CHAT_WOLF_V5_READABLE_B:banks[1],
    CHAT_WOLF_V5_READABLE_C:banks[2],CHAT_WOLF_V5_READABLE_CORE:banks[3]};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../chat-wolf-v6-soft-tells.js'),'utf8'),sandbox);
  assert.equal(JSON.stringify(sandbox.CHAT_WOLF_V6_SOFT_TELLS),JSON.stringify(overlay));
});
