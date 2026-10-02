const test=require('node:test');
const assert=require('node:assert/strict');
const old=require('../chat-wolf-v4-village.js');
const curated=require('../chat-wolf-v6-village.js');
const roles=['reporter','veteran','bait','dreamer','contrarian','judge'];

test('village editorial update keeps every existing role and two cards per topic',()=>{
  assert.deepEqual([...new Set(curated.tasks.map(t=>t.roleId))].sort(),roles.toSorted());
  assert.equal(curated.audit.perTopic.length,48);
  for(const topic of curated.audit.perTopic){
    for(const role of roles)assert.ok(topic.roles[role]>=2,topic.topicId+' '+role);
  }
  for(const t of curated.tasks){
    assert.ok(t.text&&t.textZh,t.id);
    assert.ok(t.compatibleTopicIds.length,t.id);
    assert.ok(!t.compatibleTopicTags?.includes('*'),t.id);
  }
});

test('all Judge tasks are personal participation and never require two-player matching',()=>{
  const judges=curated.tasks.filter(t=>t.roleId==='judge');
  assert.equal(judges.length,96);
  assert.equal(curated.audit.judgeRewrites,96);
  for(const t of judges){
    assert.doesNotMatch(t.text,/get .+players|two other|three other|same answer|make .+agree|another player .+accept|convince|persuade|then|follow.?up|judge|verdict/i,t.id);
    assert.doesNotMatch(t.textZh,/讓兩|讓另外兩|讓三|宣判|裁決|同意後|接著/,t.id);
    assert.match(t.canonicalTaskKey,/^v6:judge:/,t.id);
    assert.equal(t.replaces.length,1);
  }
  assert.ok(new Set(judges.map(t=>t.mechanicKey)).size>=8);
  assert.ok(new Set(judges.map(t=>t.text.split(' ')[0])).size>=5);
});

test('first-impression tasks cannot receive the two old irrelevant mappings',()=>{
  const cards=curated.tasks.filter(t=>t.compatibleTopicIds.includes('topic_v2_39'));
  assert.equal(cards.filter(t=>t.roleId==='reporter').length,2);
  assert.equal(cards.filter(t=>t.roleId==='dreamer').length,2);
  assert.ok(cards.some(t=>t.text==='Ask someone what changed their first impression.'));
  assert.ok(cards.some(t=>t.text==='Imagine a magic mirror that shows someone’s hidden kindness.'));
  assert.ok(!cards.some(t=>t.id==='villager_v4_39_reporter_2'||t.id==='villager_v4_39_dreamer_1'));
  assert.doesNotMatch(cards.map(t=>t.text).join('\n'),/quieter than usual|stranger.s everyday hobby/);
  assert.equal(curated.audit.removedMappings.length,2);
});

test('same-goal edits preserve history identity while changed goals have new keys',()=>{
  const byOld=new Map(old.map(t=>[t.id,t]));
  const byNew=new Map(curated.tasks.map(t=>[t.id,t]));
  for(const change of curated.audit.changes){
    const before=byOld.get(change.oldId),after=byNew.get(change.newId);
    assert.ok(before&&after);
    assert.notEqual(before.text,after.text);
    if(change.kind==='wording')assert.equal(after.canonicalTaskKey,before.canonicalTaskKey);
    else assert.notEqual(after.canonicalTaskKey,before.canonicalTaskKey);
  }
  assert.equal(old.find(t=>t.id==='villager_v4_39_reporter_2').text,'Ask someone which situation makes them quieter than usual.');
  assert.equal(old.filter(t=>t.roleId==='judge'&&t.text.startsWith('Get two other players')).length,96);
});

test('village audit includes 120 reviewed samples and actual concise-word metrics',()=>{
  assert.equal(curated.audit.sampledCards.length,120);
  assert.equal(curated.audit.editorialReview.reviewedCards,575);
  assert.equal(curated.audit.editorialReview.reviewedMappings,576);
  assert.equal(curated.audit.editorialReview.reviewedFollowUps,384);
  assert.equal(curated.audit.wordStats.over14,0);
  assert.ok(curated.audit.wordStats.max<=14);
  const promptOnly=t=>t.text.replace(/[“”][\s\S]*?[“”]/g,'quoted line');
  for(const t of curated.tasks){
    assert.doesNotMatch(promptOnly(t),/then |after .+ answers|another player must|two other players|three other players|raise your hand|on camera|show .+ camera/i,t.id);
    assert.ok(t.reviewed&&t.active);
  }
});
