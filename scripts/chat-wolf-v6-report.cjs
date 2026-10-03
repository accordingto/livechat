'use strict';
// Reproducible offline audit of the current aggregate, never loaded by players.
const fs=require('node:fs');
const path=require('node:path');
const C=require('../chat-wolf-v4-content.js');
const E=require('../chat-wolf-v3-engine.js');
const V=require('../chat-wolf-v6-village.js');
const S=require('../chat-wolf-v6-soft-tells.js');
const wordCount=text=>(String(text||'').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
const active=t=>t.active===true&&t.reviewed===true&&t.status!=='deprecated';
const distribution=items=>Object.fromEntries([...new Set(items)].sort().map(key=>[key,items.filter(item=>item===key).length]));
const canonicalTasks=tasks=>[...new Map(tasks.map(t=>[t.canonicalTaskKey||t.id,t])).values()];
const clone=value=>JSON.parse(JSON.stringify(value));
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
function roomFor(seed,topicId){
  const room=E.createRoom({code:'V6QA',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',
    settings:{topicId,enabledWolfRoles:['director','topic_shifter']},now:1,seed});
  for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
  return room;
}

function directorSimulation(){
  const runs=[];
  const allOptions=[],selected=[];
  let room=roomFor(61,C.topics[0].id),now=2,previousOptionIds=[];
  for(let game=1;game<=20;game++){
    E.dispatch(room,'p0',game===1?'startGame':'restart',game===1?{}:{keepTopic:false},now++);
    E.dispatch(room,'p0','beginTalk',{},now++);
    const director=Object.values(room.players).find(p=>p.wolfProfession==='director');
    ensure(director,'A required Director was not assigned');
    const view=E.projectState(room,director.id,now).private.wolfAbility;
    const options=view.options;
    ensure(options.length>=3&&options.length<=5,'Director options outside 3–5');
    ensure(new Set(options.map(d=>d.family)).size===options.length,'Director options repeat a mechanic family');
    const expected=Object.values(room.players).filter(p=>p.role&&p.role!=='WOLF').map(p=>p.id).sort();
    ensure(JSON.stringify(view.targets.map(t=>t.id).sort())===JSON.stringify(expected),'Director target pool omitted a non-wolf');
    ensure(view.targets.every(t=>Object.keys(t).sort().join(',')==='id,name'),'Director target leaked a role');
    const jester=Object.values(room.players).find(p=>p.role==='JESTER');
    ensure(!jester||view.targets.some(t=>t.id===jester.id),'Jester omitted from Director target list');
    const choice=options[(game-1)%options.length];
    const adjacentOptionRepeats=options.filter(d=>previousOptionIds.includes(d.id)).length;
    const requestedTarget=game%3===0&&jester?jester.id:'random';
    const wolfBefore=JSON.stringify(room.tasks);
    E.dispatch(room,director.id,'sendDirection',{targetId:requestedTarget,directionId:choice.id},now++);
    const target=Object.values(room.players).find(p=>p.secretDirection);
    ensure(target&&expected.includes(target.id),'Director selected an ineligible target');
    ensure(director.wolfAbility.used||room.players[director.id].wolfAbility.used,'Director charge was not consumed');
    const receipt=E.projectState(room,target.id,now);
    ensure(receipt.private.secretDirection?.text===choice.text,'Target received the wrong direction');
    ensure(!Object.hasOwn(receipt.private.secretDirection,'directorId'),'Direction revealed its sender');
    ensure(!Object.hasOwn(receipt.public,'secretDirection'),'Direction appeared in public state');
    const other=Object.values(room.players).find(p=>p.id!==target.id);
    ensure(E.projectState(room,other.id,now).private.secretDirection==null,'Direction appeared on another card');
    const restored=clone(room);
    ensure(JSON.stringify(E.projectState(restored,director.id,now).private.wolfAbility.options)===JSON.stringify(options),'Refresh rerolled the Director options');
    ensure(E.projectState(restored,director.id,now).private.wolfAbility.used,'Refresh restored the charge');
    const targetTask=JSON.stringify(target.villageTask);
    const targetReward=JSON.stringify(target.reward);
    E.dispatch(restored,target.id,'completeDirection',{directionId:target.secretDirection.id},now++);
    ensure(JSON.stringify(restored.tasks)===wolfBefore,'Direction completion changed wolf task progress');
    ensure(JSON.stringify(restored.players[target.id].villageTask)===targetTask,'Direction completion completed a village task');
    ensure(JSON.stringify(restored.players[target.id].reward)===targetReward,'Direction completion unlocked a village reward');
    ensure(restored.players[target.id].secretDirection.completed,'Direction completion was not recorded');
    let rejected=false;
    try{E.dispatch(restored,director.id,'sendDirection',{targetId:'random',directionId:choice.id},now++);}
    catch(error){ensure(error.code==='WOLF_ABILITY_ALREADY_USED','Unexpected second-use error '+error.code);rejected=true;}
    ensure(rejected,'Director used a second charge');
    allOptions.push(...options);
    selected.push(choice);
    runs.push({game,seed:61,topicId:room.topic.id,options:options.map(d=>({id:d.id,family:d.family,source:d.source})),
      chosenId:choice.id,requestedTarget,targetCamp:target.role,completed:true,wolfProgressChanged:false,
      adjacentOptionRepeats,targetListRoleLeak:false,refreshRetainedChargeAndOptions:true});
    previousOptionIds=options.map(d=>d.id);
    room=restored;
  }
  const frequencies=distribution(allOptions.map(d=>d.id));
  const highest=Math.max(...Object.values(frequencies));
  return {executions:runs.length,optionSizes:distribution(runs.map(r=>String(r.options.length))),
    optionFamilyDistribution:distribution(allOptions.map(d=>d.family)),
    optionSourceDistribution:distribution(allOptions.map(d=>d.source)),optionFrequency:frequencies,
    differentOptionsShown:Object.keys(frequencies).length,highestSingleOptionAppearances:highest,
    selectedFamilyDistribution:distribution(selected.map(d=>d.family)),
    completedDirections:runs.filter(r=>r.completed).length,wolfProgressChanges:0,
    consecutiveGamesInOneRoom:true,adjacentOptionRepeats:runs.reduce((n,r)=>n+r.adjacentOptionRepeats,0),
    targetCampDistribution:distribution(runs.map(r=>r.targetCamp)),
    everySetUsesDifferentFamilies:true,
    repeatAssessment:`Across ${allOptions.length} displayed options in 20 consecutive games in one room, ${Object.keys(frequencies).length} different cards appeared. The most frequent card appeared ${highest} times; within-set families never repeated. Adjacent-game option repeats: ${runs.reduce((n,r)=>n+r.adjacentOptionRepeats,0)}. This does not promise zero repetition across all games.`,runs};
}

function strictCapacity(seedsPerTopic=100,progress=()=>{}){
  const report={topics:C.topics.length,seedsPerTopic,dealsPerSequence:11,
    plannedSequences:C.topics.length*seedsPerTopic,plannedDeals:C.topics.length*seedsPerTopic*11,
    attemptedDeals:0,successfulDeals:0,completedSequences:0,shortages:[],perTopic:[],
    violations:{canonicalRepeats:0,recentVariantRepeats:0,sameDealVariantPairs:0,historyReset:0,
      interactionTasks:0,genericOverCap:0,voiceOverCap:0,silentRepeatExceptions:0,noticeableTellUnderQuota:0},
    policy:clone(E.RULES.selection),usesExplicitRepeatOverride:false};
  for(const [topicIndex,topic] of C.topics.entries()){
    const row={topicId:topic.id,sequences:seedsPerTopic,completedSequences:0,successfulDeals:0,
      minimumDealsReached:11,maximumDealsReached:0,shortages:[]};
    for(let seed=1;seed<=seedsPerTopic;seed++){
      const room=roomFor(seed,topic.id);
      let completed=0;
      for(let deal=0;deal<11;deal++){
        const before=JSON.stringify(room),history=clone(room.exposureHistory||{});
        report.attemptedDeals++;
        try{E.dispatch(room,'p0',deal?'restart':'startGame',deal?{keepTopic:true}:{},2+deal);}
        catch(error){
          if(error.code!=='CONTENT_EXHAUSTED')throw error;
          ensure(JSON.stringify(room)===before,'Failed draw changed authoritative room state');
          const shortage={topicId:topic.id,seed,failedAttempt:deal+1,dealsCompleted:completed,code:error.code};
          row.shortages.push(shortage);report.shortages.push(shortage);break;
        }
        ensure(room.topic.id===topic.id,'Strict capacity draw changed the requested topic');
        const keys=new Set((history.wolfTasks||[]).map(t=>t.canonicalTaskKey));
        const groups=new Set((history.deals||[]).slice(-E.RULES.selection.variantDeals)
          .flatMap(d=>d.allActionGroups||d.wolfGroups||[]).map(C.normalizeGroup));
        for(const task of room.tasks){
          report.violations.canonicalRepeats+=Number(keys.has(task.canonicalTaskKey));
          report.violations.recentVariantRepeats+=Number(groups.has(task.variantGroup));
          report.violations.interactionTasks+=Number(task.type!=='self_action');
        }
        report.violations.sameDealVariantPairs+=Number(new Set(room.tasks.map(t=>t.variantGroup)).size!==room.tasks.length);
        report.violations.genericOverCap+=Number(room.tasks.filter(t=>t.isGeneric).length>E.RULES.selection.maxGeneric);
        report.violations.voiceOverCap+=Number(room.tasks.filter(t=>t.performanceGroup==='voice').length>E.RULES.selection.maxVoicePerformance);
        report.violations.silentRepeatExceptions+=Number(!!room.contentRepeatException);
        report.violations.noticeableTellUnderQuota+=Number(room.tasks.filter(t=>t.noticeableTell===true).length<Math.ceil(room.tasks.length/2));
        report.violations.historyReset+=Number(deal>0&&room.exposureHistory.serial<=(history.serial||0));
        completed++;report.successfulDeals++;row.successfulDeals++;
      }
      row.minimumDealsReached=Math.min(row.minimumDealsReached,completed);
      row.maximumDealsReached=Math.max(row.maximumDealsReached,completed);
      if(completed===11){report.completedSequences++;row.completedSequences++;}
    }
    report.perTopic.push(row);
    if((topicIndex+1)%8===0)progress(`${topicIndex+1}/${C.topics.length} topics checked; ${report.successfulDeals} strict deals; ${report.shortages.length} shortages.`);
  }
  report.allPlannedSequencesCompleted=report.completedSequences===report.plannedSequences;
  report.shortageTopics=report.perTopic.filter(t=>t.shortages.length).map(t=>({topicId:t.topicId,sequencesExhausted:t.shortages.length,minimumDealsReached:t.minimumDealsReached}));
  ensure(Object.values(report.violations).every(n=>n===0),'Strict capacity detected a repeat/policy violation');
  return report;
}

function buildReport({capacitySeeds=100,progress=()=>{}}={}){
  ensure(Array.isArray(C.directorDirections)&&C.directorDirections.length,'Current aggregate has not integrated Director directions');
  ensure(C.villageTasks.some(t=>t.id==='villager_v6_39_reporter_2'),'Current aggregate has not integrated village corrections');
  const wolves=C.wolfTasks.filter(active);
  ensure(wolves.every(t=>t.type==='self_action'),'Formal wolf pool still contains interaction cards');
  const archive=C.experimentalWolfTasks||C.archivedWolfInteractionTasks||[];
  const directions=C.directorDirections.filter(active);
  const wordStats=tasks=>{
    const ns=tasks.map(t=>wordCount(t.text)).sort((a,b)=>a-b);
    return {average:Number((ns.reduce((a,n)=>a+n,0)/ns.length).toFixed(2)),median:ns.length%2?ns[Math.floor(ns.length/2)]:(ns[ns.length/2-1]+ns[ns.length/2])/2,
      min:ns[0],max:ns.at(-1),over14:tasks.filter(t=>wordCount(t.text)>14).map(t=>({id:t.id,words:wordCount(t.text),text:t.text}))};
  };
  const villageAudit=clone(C.villageAudit||V.audit);
  const perTopic=C.topics.map(topic=>{
    const pool=canonicalTasks(wolves.filter(t=>E.compatible(t,topic)));
    return {topicId:topic.id,mainQuestion:topic.mainQuestion,
      formalWolfSelfCards:pool.length,topicSpecific:pool.filter(t=>!t.isGeneric).length,
      genericCandidates:pool.filter(t=>t.isGeneric).length,
      mechanicGroups:new Set(pool.map(t=>t.variantGroup)).size,
      noticeableTellCards:pool.filter(t=>t.noticeableTell===true).length,
      noticeableTellGroups:new Set(pool.filter(t=>t.noticeableTell===true).map(t=>t.variantGroup)).size,
      families:distribution(pool.map(t=>t.family)),
      villageByRole:Object.fromEntries(E.RULES.professions.map(p=>[p.id,C.villageTasks.filter(t=>active(t)&&t.roleId===p.id&&E.compatible(t,topic)).length]))};
  });
  return {version:C.version,clientDate:'2026-10-04',generatedAtUtc:new Date().toISOString(),
    scope:'Current-revision content review and actual deterministic engine calls. Every new deal must include at least ceil(taskCount / 2) explicitly reviewed audible small-tell cards; default 3 means at least 2. The capacity run checks that quota together with the unchanged history and generic/voice caps. No cloud, browser or physical-device claim.',
    village:{...villageAudit,aggregateCards:C.villageTasks.filter(active).length,
      aggregateMappings:C.villageTasks.filter(active).reduce((n,t)=>n+(t.compatibleTopicIds||[]).length,0),
      wordStats:wordStats(C.villageTasks.filter(active)),families:distribution(C.villageTasks.filter(active).map(t=>t.family))},
    wolf:{activeSelfCards:wolves.length,interactionCardsInFormalPool:wolves.filter(t=>t.type==='interaction').length,
      archivedInteractionCards:archive.filter(t=>t.type==='interaction').length||S.audit.defaultDisabledInteractionCount,
      archivedCountDerivedFrom:archive.length?'aggregate experimental archive':'readable source audit',
      targetedOverrides:S.audit.overwrittenCount,newCards:S.audit.addedCount,
      wordingChangedOverrides:S.audit.wordingChangedCount,metadataOnlyOverrides:S.audit.metadataOnlyOverrides,
      untouchedReadableWording:S.audit.untouchedPreviousTextCount,
      editorialAudit:clone(C.softTellAudit||S.audit),wordStats:wordStats(wolves),
      families:distribution(wolves.map(t=>t.family)),mechanicGroups:distribution(wolves.map(t=>t.variantGroup)),
      softTellTaggedCards:wolves.filter(t=>t.softTell).length,
      noticeableTellCards:wolves.filter(t=>t.noticeableTell===true).length,
      minimumNoticeableShare:0.5,defaultMinimumNoticeable:Math.ceil(E.RULES.defaults.taskCount/2),
      noticeableSamples:wolves.filter(t=>t.noticeableTell===true).slice(0,24).map(t=>({id:t.id,text:t.text,textZh:t.textZh,variantGroup:t.variantGroup,compatibleTopicIds:t.compatibleTopicIds}))},
    director:{poolTotal:directions.length,sources:distribution(directions.map(t=>t.source)),
      families:distribution(directions.map(t=>t.family)),wordStats:wordStats(directions),
      pool:directions.map(t=>({id:t.id,text:t.text,textZh:t.textZh,family:t.family,source:t.source,words:wordCount(t.text)})),
      editorial:'Read the authored 48-card pool: brief audible actions, no props, vote instructions, targeted insults, role disclosure or multi-step scenes. Director-only directions use news, trailers, sports, animal sounds and dramatic openings for stronger performance.',
      simulation:directorSimulation()},
    perTopic,strictCapacity:strictCapacity(capacitySeeds,progress),
    limitations:[
      'Village matching and direction style were reviewed editorially. No actual voice recording or AI voice assessment was used.',
      'The capacity test creates six-player seeded engine rooms and performs an initial deal plus ten same-topic restarts for each seed. These are actual engine calls, not six browsers or six physical devices.',
      'A finite task bank can exhaust later than the tested eleven deals. Shortages, if present here, are reported explicitly and never silently bypassed.',
      'Task completion remains the player’s own declaration. Short readable text and deterministic tests do not establish fun, difficulty or live-group balance.',
      'This content report does not itself verify Firebase delivery or a production deployment; those require their own integration checks.'
    ]};
}

function markdown(report){
  const rows=object=>Object.entries(object).map(([k,v])=>`| ${k} | ${v} |`).join('\n');
  const v=report.village,w=report.wolf,d=report.director,c=report.strictCapacity;
  return `# Chat Wolf current content QA\n\nClient date: ${report.clientDate}. Content version: ${report.version}. Generated UTC: ${report.generatedAtUtc}.\n\n${report.scope}\n\n## Village tasks\n\nReviewed all ${v.editorialReview.reviewedCards} original bilingual cards, ${v.editorialReview.reviewedMappings} mappings, ${v.editorialReview.reviewedMainQuestions} main questions and ${v.editorialReview.reviewedFollowUps} follow-ups. The report retains ${v.sampledCards.length} actual sampled instructions and ${v.perTopic.length} per-topic notes.\n\nChanged ${v.changedCards} cards: ${v.changedWording} same-goal wording corrections retain history identity; ${v.rewrittenGoals} changed goals use new canonical keys. All ${v.judgeRewrites} Judge tasks now require only one personal spoken action. The existing role rewards remain in the engine.\n\nRemoved ${v.removedMappings.length} inappropriate original mappings:\n\n${v.removedMappings.map(m=>`- ${m.taskId} → ${m.topicId}: ${m.reason}`).join('\n')}\n\nThe removed associations have new explicitly matched replacement cards. Current coverage is ${v.aggregateCards} cards / ${v.aggregateMappings} topic mappings. English mean ${v.wordStats.average} words, median ${v.wordStats.median}, range ${v.wordStats.min}–${v.wordStats.max}, over 14 words ${v.wordStats.over14.length}.\n\n## Formal wolf task pool\n\n${w.activeSelfCards} active self-action cards; ${w.interactionCardsInFormalPool} interaction cards are selectable in formal mode. ${w.archivedInteractionCards} older interaction cards remain archived. The targeted overlay has ${w.targetedOverrides} content/metadata overrides (${w.wordingChangedOverrides} changed English instructions and ${w.metadataOnlyOverrides} classification-only cards) and ${w.newCards} additions. ${w.untouchedReadableWording} earlier authored wordings were left intact before formal-pool filtering.\n\n${w.noticeableTellCards} tasks have reviewed audible small tells. Every new deal requires at least half (rounded up); the default three-task deal requires at least ${w.defaultMinimumNoticeable}.\n\nEnglish mean ${w.wordStats.average} words, median ${w.wordStats.median}; over 14 words ${w.wordStats.over14.length}. Near variants share mechanic groups and cannot evade recent-history exclusion.\n\n| Formal mechanic group | Cards |\n| --- | ---: |\n${rows(w.mechanicGroups)}\n\n## Director directions\n\n${d.poolTotal} directions across ${Object.keys(d.families).length} families: ${d.sources.shared_soft_tell||0} shared_soft_tell and ${d.sources.director_only||0} director_only. English mean ${d.wordStats.average} words; maximum ${d.wordStats.max}.\n\n${d.editorial}\n\n| Family | Cards |\n| --- | ---: |\n${rows(d.families)}\n\nThe simulation ran ${d.simulation.executions} actual Director allocations, sends and recipient completion operations. Every option set had 3–5 distinct families. Targets included all non-wolves including Jester; the list exposed only ID/name. Refresh retained options and the consumed charge. A second send was rejected. Completed directions changed wolf progress ${d.simulation.wolfProgressChanges} times.\n\n${d.simulation.repeatAssessment}\n\n## Same-topic strict capacity\n\n${c.topics} topics × ${c.seedsPerTopic} seeds × ${c.dealsPerSequence} planned deals = ${c.plannedDeals} planned deals. The actual run attempted ${c.attemptedDeals} draws and completed ${c.successfulDeals}; ${c.completedSequences}/${c.plannedSequences} sequences reached eleven deals. Explicit repeat override was disabled. Canonical repeats, recent mechanic repeats, within-deal duplication, history resets, interaction draws, cap violations and silent exceptions were all ${Object.values(c.violations).reduce((n,v)=>n+v,0)}.\n\n${c.shortages.length?`**${c.shortages.length} sequences exhausted:** ${c.shortageTopics.map(t=>`${t.topicId} (${t.sequencesExhausted} seeds; minimum ${t.minimumDealsReached} deals)`).join('; ')}. Detailed failed attempts are preserved in the JSON report. No failed draw mutated the room.`:'All planned sequences completed without exhaustion.'}\n\n| Topic | Self cards | Topic-specific | Mechanic groups | Village cards by role |\n| --- | ---: | ---: | ---: | --- |\n${report.perTopic.map(t=>`| ${t.topicId} | ${t.formalWolfSelfCards} | ${t.topicSpecific} | ${t.mechanicGroups} | ${Object.entries(t.villageByRole).map(([role,n])=>role+': '+n).join(', ')} |`).join('\n')}\n\n## Verification limits\n\n${report.limitations.map(l=>'- '+l).join('\n')}\n`;
}

if(require.main===module){
  const seedsArg=process.argv.find(a=>a.startsWith('--capacity-seeds='));
  const capacitySeeds=seedsArg?Number(seedsArg.split('=')[1]):100;
  ensure(Number.isInteger(capacitySeeds)&&capacitySeeds>=1&&capacitySeeds<=100,'Invalid capacity seed count');
  const report=buildReport({capacitySeeds,progress:text=>console.log(text)});
  if(process.argv.includes('--write')){
    const dir=path.resolve(__dirname,'../docs');
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'chat-wolf-v6-content-qa.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(dir,'chat-wolf-v6-content-qa.md'),markdown(report));
  }
  console.log(JSON.stringify({version:report.version,village:{cards:report.village.aggregateCards,changed:report.village.changedCards,removedMappings:report.village.removedMappings.length,samples:report.village.sampledCards.length},wolf:{self:report.wolf.activeSelfCards,archivedInteraction:report.wolf.archivedInteractionCards,overrides:report.wolf.targetedOverrides,new:report.wolf.newCards},director:{total:report.director.poolTotal,sources:report.director.sources,families:report.director.families,executions:report.director.simulation.executions,optionRepeatAssessment:report.director.simulation.repeatAssessment},capacity:{planned:report.strictCapacity.plannedDeals,completed:report.strictCapacity.successfulDeals,sequences:report.strictCapacity.completedSequences,shortages:report.strictCapacity.shortageTopics,violations:report.strictCapacity.violations}},null,2));
}
module.exports={buildReport,directorSimulation,strictCapacity,markdown};
