'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../cut-engine.js'),R=require('../cut-random.js'),UI=require('../cut-ui.js');
const timings={firstCutMinSeconds:9,firstCutMaxSeconds:9,cutIntervalMinSeconds:15,cutIntervalMaxSeconds:15};
let serial=0;
const create=(extra={})=>E.create({id:'custom-jump',mode:'jump',now:1000,seed:12,roster:[1,2,3].map(playerNum=>({playerNum,name:'Player '+playerNum})),...timings,...extra});
const act=(s,type,extra={})=>E.apply(s,{id:'custom-'+ ++serial,type,actor:0,sessionId:s.sessionId,turnId:s.turnId,now:s.lastChangeAt+1,seed:serial,...extra});
const tick=s=>act(s,'tick',{now:s.phase==='speaking'?s.deadline:s.phaseUntil});
const speaking=extra=>tick(act(create(extra),'begin'));
test('first and repeated delays follow independent custom settings; interruptions cost no main time',()=>{
 let s=speaking();assert.equal(s.deadline-s.lastChangeAt,9000);
 const main=s.speaker;s=tick(s);assert.equal(s.phase,'interrupt');const used=s.mainClock.elapsedMs;
 s=act(s,'done',{now:s.lastChangeAt+90000});assert.equal(s.phase,'back');s=tick(s);
 assert.equal(s.deadline-s.lastChangeAt,15000);assert.equal(s.speaker,main);assert.equal(s.mainClock.elapsedMs,used);
 s=tick(s);assert.equal(s.phase,'interrupt');assert.equal(s.mainClock.elapsedMs,used+15000);
});
test('custom random ranges stay inside their limits; default settings preserve seeded pacing',()=>{
 for(let seed=0;seed<300;seed++)for(const first of [true,false]){
  assert.equal(R.interval(first,33000,R.create(seed)),R.interval(first,33000,R.create(seed),UI.jumpTimingDefaults));
  const gap=R.interval(first,33000,R.create(seed),{firstCutMinSeconds:60,firstCutMaxSeconds:90,cutIntervalMinSeconds:10,cutIntervalMaxSeconds:20});
  assert.ok(gap >= (first?60000:10000) && gap <=(first?90000:20000));
 }
});
test('engine and UI reject blanks, decimals, reversed ranges and out-of-bounds timing',()=>{
 for(const key of UI.jumpTimingKeys)for(const value of [null,NaN,4,301,8.5,'30']){
  const opts={...timings,[key]:value};assert.throws(()=>create(opts),/invalid_options/);assert.equal(UI.validJumpTiming(opts),false);
 }
 for(const opts of [{firstCutMinSeconds:60,firstCutMaxSeconds:59},{cutIntervalMinSeconds:30,cutIntervalMaxSeconds:29}])assert.throws(()=>create(opts),/invalid_options/);
 assert.doesNotThrow(()=>create({firstCutMinSeconds:5,firstCutMaxSeconds:300,cutIntervalMinSeconds:5,cutIntervalMaxSeconds:300}));
});
test('editing timings keeps the topic, speaker and used main time; subsequent intervals use the new range',()=>{
 let s=speaking();const topic=s.topic,speaker=s.speaker;s=act(s,'settings',{now:s.lastChangeAt+3000});const used=s.mainClock.elapsedMs;
 s=act(s,'configure',{cutIntervalMinSeconds:22,cutIntervalMaxSeconds:22});assert.equal(s.phase,'ready');assert.deepEqual(s.topic,topic);assert.equal(s.speaker,speaker);assert.equal(s.mainClock.elapsedMs,used);
 s=tick(act(s,'begin'));assert.equal(s.deadline-s.lastChangeAt,22000);assert.equal(s.mainClock.elapsedMs,used);
 s=act(s,'settings');const invalid=act(s,'configure',{firstCutMaxSeconds:4});assert.equal(invalid.phase,'setup');assert.equal(invalid.replies[0].error,'invalid_options');
});
test('restart, new topic and mode changes keep manual timings',()=>{
 let s=create();s.sharedControls=true;s=act(s,'restart');for(const k of UI.jumpTimingKeys)assert.equal(s[k],timings[k]);
 s=act(s,'endTopic');s=act(s,'next');for(const k of UI.jumpTimingKeys)assert.equal(s[k],timings[k]);
 s=act(s,'settings');s=act(s,'configure',{mode:'classic'});assert.equal(s.mode,'classic');s=act(s,'settings');s=act(s,'configure',{mode:'jump'});assert.equal(s.mode,'jump');
 for(const k of UI.jumpTimingKeys)assert.equal(s[k],timings[k]);
});
test('legacy upgrade fills settings once and keeps a pending interruption and existing main clock',()=>{
 const s=speaking();for(const k of UI.jumpTimingKeys)delete s[k];const before=structuredClone(s),next=E.upgrade(s,s.lastChangeAt+2000);
 for(const k of UI.jumpTimingKeys)assert.equal(next[k],UI.jumpTimingDefaults[k]);
 for(const k of ['deadline','pendingDurationMs','topic','mainClock','speaker','phase'])assert.deepEqual(next[k],before[k]);
 assert.equal(E.upgrade(next,next.lastChangeAt+1000),next);
 const view=E.view(next,1,next.lastChangeAt).cut;for(const k of UI.jumpTimingKeys)assert.equal(view[k],next[k]);
 for(const k of ['deadline','speakingDurationMs','previousDurationMs','lastStretch'])assert.equal(k in view,false);
});
test('long custom delay respects the quiet ending and extension draws the configured repeat range',()=>{
 let s=speaking({firstCutMinSeconds:300,firstCutMaxSeconds:300,cutIntervalMinSeconds:30,cutIntervalMaxSeconds:30,mainMinutes:3});
 assert.equal(s.lastStretch,true);s=act(s,'extend');assert.equal(s.lastStretch,false);assert.equal(s.deadline-s.lastChangeAt,30000);
 s=tick(s);assert.equal(s.phase,'interrupt');
});
test('shared card form sends manual timings, disables invalid saves, and ignores hidden Mode 2 drafts in Mode 1',()=>{
 let s=act(create(),'settings');s.sharedControls=true;const card=new UI.Card({innerHTML:'',addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return []}},{send:async()=>{},now:()=>s.lastChangeAt});
 try{
 card.update(E.view(s,1,s.lastChangeAt));const fields={mode:'jump',mainMinutes:'4',firstCutMinSeconds:'45',firstCutMaxSeconds:'45',cutIntervalMinSeconds:'20',cutIntervalMaxSeconds:'35',speed:'normal',category:'mixed',topicMinutes:'10'};
 const form={querySelector:selector=>{const k=selector.match(/name="(\w+)"/)?.[1];return k?{value:fields[k]}:null}};
 let input=card.settingsInput(form);assert.equal(input.firstCutMinSeconds,45);assert.equal(input.cutIntervalMaxSeconds,35);assert.equal(card.canAction('configure',input),true);
 fields.firstCutMinSeconds='';assert.equal(card.canAction('configure',card.settingsInput(form)),false);
 fields.mode='classic';assert.equal(card.canAction('configure',card.settingsInput(form)),true);
 assert.equal(card.settingsInput(form).firstCutMinSeconds,9);
 }finally{card.destroy()}
});
