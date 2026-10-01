'use strict';
// Development-only report. No player endpoint imports this script.
const C = require('../chat-wolf-v4-content.js');
const E = require('../chat-wolf-v3-engine.js');
const RULES = require('../chat-wolf-v3-rules.js');
const active = t => t.active === true && t.status === 'active' && t.reviewed === true;
const counts = C.topics.map(topic => {
  const raw = C.wolfTasks.filter(t => active(t) && E.compatible(t,topic));
  const pool = [...new Map(raw.map(t=>[t.canonicalTaskKey,t])).values()];
  const interaction = pool.filter(t=>t.type==='interaction').length;
  const self = pool.filter(t=>t.type==='self_action').length;
  return { topicId:topic.id, title:topic.title, followUps:topic.followUps.length,
    rawCards:raw.length,candidates:pool.length,canonicalUnique:pool.length, interaction, self,
    variantGroups:new Set(pool.map(t=>t.variantGroup)).size,
    selfActionGroups:new Set(pool.filter(t=>t.type==='self_action').map(t=>t.variantGroup)).size,
    families:new Set(pool.map(t=>t.family)).size,
    familyDistribution:Object.fromEntries([...new Set(pool.map(t=>t.family))].sort().map(f=>[f,pool.filter(t=>t.family===f).length])),
    generic:pool.filter(t=>t.isGeneric).length,
    villageByRole:Object.fromEntries(RULES.professions.map(r=>[r.id,C.villageTasks.filter(t=>active(t)&&t.roleId===r.id&&E.compatible(t,topic)).length])),
    targetGaps:{total:Math.max(0,60-pool.length),interaction:Math.max(0,20-interaction),self:Math.max(0,40-self)}
  };
});
function repeatedDeals(changingTopic) {
  let committed = 0, shortages = 0, explicitExceptions = 0, canonicalRepeats = 0,
    recentGroupRepeats = 0, genericCards = 0, voicePairs = 0, invalidCards = 0, illegalExceptions = 0;
  const firstShortage = [];
  const drawnKeys=new Set(),selectionAudit=[];
  for (let seed=1;seed<=100;seed++) {
    const topic = C.topics[(seed-1)%C.topics.length];
    const room = E.createRoom({ code:'AUDITX', hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',
      settings:{topicId:topic.id},now:1,seed });
    for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
    let first = null;
    for(let deal=0;deal<10;deal++) {
      const before = JSON.stringify(room), past = room.exposureHistory;
      const body = {keepTopic:!changingTopic};
      const action = deal===0?'startGame':'restart';
      let exception = false;
      try { E.dispatch(room,'p0',action,body,deal+2); }
      catch(error) {
        if(error.code!=='CONTENT_EXHAUSTED')throw error;
        if(JSON.stringify(room)!==before)throw new Error('Failed allocation changed the room');
        shortages++; if(first===null)first=deal+1;
        E.dispatch(room,'p0',action,{...body,allowRecentRepeat:true},deal+2);
        exception=room.contentRepeatException; explicitExceptions+=Number(exception);
        if(!exception)illegalExceptions++;
      }
      const recentKeys = new Set((past?.wolfTasks||[]).map(t=>t.canonicalTaskKey));
      const recentGroups = new Set((past?.deals||[]).slice(-3).flatMap(d=>d.allActionGroups||d.wolfGroups||[]));
      const reviewed=C.wolfTasks.filter(active),compatible=reviewed.filter(t=>E.compatible(t,room.topic));
      const feasible=compatible.filter(t=>(t.requiredOtherPlayerCount||0)<=6-room.settings.wolfCount);
      const canonical=feasible.filter(t=>!recentKeys.has(t.canonicalTaskKey));
      const variants=canonical.filter(t=>!recentGroups.has(t.variantGroup));
      selectionAudit.push({seed,deal:deal+1,topicId:room.topic.id,reviewed:reviewed.length,
        compatible:compatible.length,feasible:feasible.length,afterCanonical:canonical.length,
        afterVariant:variants.length,interaction:variants.filter(t=>t.type==='interaction').length,
        self:variants.filter(t=>t.type==='self_action').length,strictCombinationAvailable:!exception,explicitException:exception});
      for(const task of room.tasks) {
        drawnKeys.add(task.canonicalTaskKey);
        if(recentKeys.has(task.canonicalTaskKey)){canonicalRepeats++;if(!exception)throw new Error('Silent canonical repeat');}
        if(recentGroups.has(task.variantGroup)){recentGroupRepeats++;if(!exception)throw new Error('Silent group repeat');}
        genericCards+=Number(task.isGeneric);
        if(!active(task)||!E.compatible(task,room.topic))invalidCards++;
      }
      if(room.tasks.filter(t=>t.type==='self_action'&&t.performanceGroup==='voice').length>1)voicePairs++;
      if(room.tasks.filter(t=>t.isGeneric).length>1)throw new Error('Generic cap exceeded');
      if(new Set(room.tasks.map(t=>t.variantGroup)).size!==room.tasks.length)throw new Error('Same-deal variant repeat');
      committed++;
    }
    firstShortage.push(first);
  }
  return {seeds:100,dealsPerSeed:10,committed,shortages,explicitExceptions,canonicalRepeats,recentGroupRepeats,
    genericCards,voicePairs,invalidCards,illegalExceptions,
    seedsWithNoShortage:firstShortage.filter(x=>x===null).length,
    earliestShortage:firstShortage.some(x=>x!==null)?Math.min(...firstShortage.filter(x=>x!==null)):null,
    distinctCardsDrawn:drawnKeys.size,actualPoolCoverage:drawnKeys.size/new Set(C.wolfTasks.map(t=>t.canonicalTaskKey)).size,
    genericShare:genericCards/(committed*3),selectionAudit,
    scope:'Actual authored content; any shortages are explicitly retried once with recent-repeat permission. No player ACK or task completion required. Synthetic test seeds only.'};
}
const report = {
  contentVersion:C.version,releaseStage:C.releaseStage,
  topics:C.topics.length,followUps:C.topics.reduce((n,t)=>n+t.followUps.length,0),
  authoredWolfCards:C.wolfTasks.length,authoredVillageCards:C.villageTasks.length,
  perTopic:counts,allTopicsMeetTarget:counts.every(t=>Object.values(t.targetGaps).every(n=>n===0)&&t.families>=8),
  sameTopic:repeatedDeals(false),changingTopic:repeatedDeals(true),
  caveats:['Editorial compatibility is authored, not voice verified; content validation is not a claim of player-tested balance.',
    counts.every(t=>Object.values(t.targetGaps).every(n=>n===0)&&t.families>=8)?'All 48 topics meet the 60/20/40 unique-canonical and 8-family content gate.':'Content targets are not met; see exact per-topic gaps.',
    'Actual browser tests and physical-device tests are reported separately.']
};
if(require.main===module){
  if(process.argv.includes('--write')){
    const fs=require('node:fs'),path=require('node:path');
    const dir=path.resolve(__dirname,'../qa');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'chat-wolf-v4-content-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({topics:report.topics,authoredWolfCards:report.authoredWolfCards,
      allTopicsMeetTarget:report.allTopicsMeetTarget,sameTopic:{...report.sameTopic,selectionAudit:undefined},
      changingTopic:{...report.changingTopic,selectionAudit:undefined}},null,2));
  }else console.log(JSON.stringify(report,null,2));
}
module.exports = report;
