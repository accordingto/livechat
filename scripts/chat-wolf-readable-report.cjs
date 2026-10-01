'use strict';
// Offline, reproducible content audit. Never imported by the player page.
const C=require('../chat-wolf-v4-content.js');
const E=require('../chat-wolf-v3-engine.js');
const crypto=require('node:crypto');
const words=text=>(text.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g)||[]).length;
const distribution=items=>Object.fromEntries([...new Set(items)].sort().map(k=>[k,items.filter(v=>v===k).length]));
const unique=tasks=>[...new Map(tasks.map(t=>[t.canonicalTaskKey,t])).values()];
const active=C.wolfTasks.filter(t=>t.active&&t.reviewed&&t.status==='active');
const old=C.previousWolfTasks||[];
const retiredIds=new Set(old.filter(t=>!active.some(n=>n.id===t.id)).map(t=>t.id));
const lengths=active.map(t=>words(t.text)).sort((a,b)=>a-b);
const perTopic=C.topics.map(topic=>{
  const pool=unique(active.filter(t=>E.compatible(t,topic)));
  return {id:topic.id,title:topic.title,mainQuestion:topic.mainQuestion,mainWords:words(topic.mainQuestion),
    candidates:pool.length,topicSpecific:pool.filter(t=>!t.isGeneric).length,genericCandidates:pool.filter(t=>t.isGeneric).length,
    interaction:pool.filter(t=>t.type==='interaction').length,
    self:pool.filter(t=>t.type==='self_action').length,
    mechanics:new Set(pool.map(t=>t.variantGroup)).size,families:distribution(pool.map(t=>t.family))};
});
function runSequence(mode){
  const rounds=mode==='restart'?11:10;
  const report={seeds:100,initialDeals:100,subsequentDealsPerSeed:rounds-1,successfulDeals:0,
    fullGamesCompleted:0,exhaustedRuns:[],canonicalRepeats:0,recentVariantRepeats:0,
    sameDealVariantPairs:0,historyReset:0,genericOverCap:0,voiceOverCap:0,topicChanges:0};
  for(let seed=1;seed<=100;seed++){
    const topic=C.topics[(seed-1)%C.topics.length];
    const room=E.createRoom({code:'READQA',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',settings:{topicId:topic.id},now:1,seed});
    for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
    let now=2;
    const send=(action,payload={})=>E.dispatch(room,'p0',action,payload,now++);
    for(let deal=0;deal<rounds;deal++){
      const before=JSON.stringify(room),history=JSON.parse(JSON.stringify(room.exposureHistory||{})),previousTopic=room.topic?.id;
      try {
        if(deal===0||mode==='normal')send('startGame');
        else send('restart',{keepTopic:mode==='restart'});
      }catch(error){
        if(error.code!=='CONTENT_EXHAUSTED')throw error;
        if(JSON.stringify(room)!==before)throw new Error('An exhausted draw mutated the room');
        report.exhaustedRuns.push({seed,topicId:topic.id,attempt:deal+1});
        break; // No test-only bypass; do not disguise shortage as success.
      }
      const keys=new Set((history.wolfTasks||[]).map(t=>t.canonicalTaskKey));
      if(deal&&mode==='changing'){
        if(room.topic.id===previousTopic)throw new Error('Change-topic restart did not change the topic');
        report.topicChanges++;
      }
      if(mode!=='changing'&&room.topic.id!==topic.id)throw new Error('Same-topic test changed its topic');
      const groups=new Set((history.deals||[]).slice(-3).flatMap(d=>d.allActionGroups||d.wolfGroups||[]).map(C.normalizeGroup));
      for(const task of room.tasks){
        report.canonicalRepeats+=Number(keys.has(task.canonicalTaskKey));
        report.recentVariantRepeats+=Number(groups.has(task.variantGroup));
      }
      report.sameDealVariantPairs+=Number(new Set(room.tasks.map(t=>t.variantGroup)).size!==room.tasks.length);
      report.genericOverCap+=Number(room.tasks.filter(t=>t.isGeneric).length>1);
      report.voiceOverCap+=Number(room.tasks.filter(t=>t.performanceGroup==='voice').length>1);
      if(deal&&room.exposureHistory.serial<=(history.serial||0))report.historyReset++;
      report.successfulDeals++;
      if(mode==='normal'){
        send('beginTalk');let guard=0;
        while(room.phase!=='FINISHED'&&guard++<40){
          if(room.phase==='TALK')send('endTalk');
          else if(room.phase==='MEETING_TURNS')send('endMeeting');
          else if(room.phase==='FINAL_CLUES')send('endClues');
          else if(room.phase==='VOTING')send('endVote');
          else throw new Error('Unexpected normal-game phase '+room.phase);
        }
        if(room.phase!=='FINISHED')throw new Error('Normal game did not finish');
        report.fullGamesCompleted++;
        if(deal<rounds-1){
          const saved=JSON.stringify(room.exposureHistory);
          send('replay');
          if(JSON.stringify(room.exposureHistory)!==saved)report.historyReset++;
        }
      }
    }
  }
  return report;
}
// Stratified across every topic and both task types, then fill deterministically.
// These rows are supplied for actual editorial reading, not auto-rated as clear/fun.
const sample=[];const sampled=new Set();
const add=t=>{if(t&&!sampled.has(t.id)){sampled.add(t.id);sample.push(t);}};
for(const topic of C.topics)for(const type of ['interaction','self_action'])add(active.find(t=>t.type===type&&E.compatible(t,topic)));
const ordered=active.slice().sort((a,b)=>crypto.createHash('sha256').update(a.id).digest('hex').localeCompare(crypto.createHash('sha256').update(b.id).digest('hex')));
for(const task of ordered)if(sample.length<120)add(task);
const textGroups=new Map();
for(const t of active){const key=t.text.toLowerCase().replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();const rows=textGroups.get(key)||[];rows.push(t.id);textGroups.set(key,rows);}
const report={version:C.version,scope:'Authored content and engine-only tests, no recordings or physical-device claim.',
  previousActiveCards:old.length,disabledOldCards:retiredIds.size,
  directlyRewrittenOldCards:new Set(active.flatMap(t=>t.replaces||[])).size,
  activeCards:active.length,uniqueCanonicalCards:unique(active).length,
  averageWords:Number((lengths.reduce((a,b)=>a+b,0)/lengths.length).toFixed(2)),
  medianWords:lengths.length%2?lengths[Math.floor(lengths.length/2)]:(lengths[lengths.length/2-1]+lengths[lengths.length/2])/2,
  over14:active.filter(t=>words(t.text)>14).map(t=>({id:t.id,words:words(t.text),text:t.text,reason:t.lengthNote||null})),
  under6:active.filter(t=>words(t.text)<6).map(t=>({id:t.id,words:words(t.text),text:t.text})),
  types:distribution(active.map(t=>t.type)),families:distribution(active.map(t=>t.family)),
  mechanics:distribution(active.map(t=>t.variantGroup)),
  exactTextDuplicates:[...textGroups.values()].filter(ids=>ids.length>1),
  nearVariantExamples:[
    ['wolf_v5_a_s_food-help','wolf_v5_b_s-power-offer'],
    ['wolf_v5_a_s_object-thanks','w5-c-s-change-thanks'],
    ['wolf_v5_a_s_room-lamp','wolf_v5_a_s_room-change']
  ].map(ids=>({cards:ids.map(id=>{const task=active.find(t=>t.id===id);return {id,text:task.text,mechanic:task.variantGroup};}),
    policy:'One mechanic group: cannot appear together or within the three recent deals.'})),
  rejectedMechanicFlags:active.filter(t=>/name.*(?:apartment|club)|nickname|invent (?:a |an )?(?:word|name)|imaginary rent|apologize to|pillowcase|weather report|worn kitchen apron/i.test(t.text)).map(t=>t.id),
  editorialSample:sample.map(t=>({id:t.id,type:t.type,text:t.text,textZh:t.textZh,words:words(t.text),
    mechanic:t.variantGroup,topics:t.compatibleTopicIds.map(id=>C.topics.find(p=>p.id===id)?.title||id)})),
  perTopic,repeatTests:{sameTopicRestart:runSequence('restart'),sameTopicNormal:runSequence('normal'),changingTopics:runSequence('changing')},
  editorialNotes:[
    'Word count measures English letter/number tokens with internal apostrophes/hyphens as one word.',
    'The root editor read all 120 final sample rows; a second editor read all B and C-authored task groups were checked during authoring. Independent A review covered its initial 232 rows and final additions.',
    'Review fixes included car/aisle-seat mismatch, generic shop/food assumptions, vague physical actions, weak past-moment mappings and an exact duplicate across banks.',
    'Near variants still exist (for example different concrete help offers, preferences and thank-you actions). They share normalized mechanics, cannot coexist in a deal and are excluded for three recent deals; the report does not claim every card has an entirely unique mechanic.',
    'No active task asks for object roleplay, object apologies, naming, nicknames or invented words. Some public topics remain imaginative, as requested; their wolf instructions are ordinary actions.',
    'The former 60-card target is not enforced: the user explicitly prioritizes quality over pool size.',
    'Existing dealt cards remain immutable until the next deal. Roles, rewards, rounds and outcomes are unchanged.'
  ],limitations:[
    'Shortness and editorial review do not prove task difficulty, naturalness for every group, fun or balance; live voice play-testing is still needed.',
    'Pool counts are before exposure filters. A finite pool can still exhaust in longer runs; the existing explicit host recovery prompt remains. No hidden repeat fallback is enabled.',
    'These repeated-game tests are deterministic engine runs, not browser or physical-device tests.'
  ]};
if(require.main===module){
  if(process.argv.includes('--write')){
    const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'../qa');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'chat-wolf-readable-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({...report,editorialSample:report.editorialSample.length,perTopic:report.perTopic.map(t=>({id:t.id,candidates:t.candidates,interaction:t.interaction,self:t.self})),repeatTests:report.repeatTests},null,2));
  }else console.log(JSON.stringify(report,null,2));
}
module.exports=report;
