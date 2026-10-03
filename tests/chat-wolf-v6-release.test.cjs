'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../chat-wolf-v4-content.js');
const root=path.resolve(__dirname,'..');

test('production HTML loads the actual revised browser banks in dependency order',()=>{
  const html=fs.readFileSync(path.join(root,'chat-wolf.html'),'utf8');
  const scripts=Array.from(html.matchAll(/<script src="([^"?]+)(?:\?[^" ]+)?"><\/script>/g),m=>m[1]);
  const last=scripts.indexOf('chat-wolf-v4-content.js');
  assert.ok(last>0);
  const context={};context.window=context;vm.createContext(context);
  for(const filename of scripts.slice(0,last+1)){
    vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),context,{filename});
  }
  const browser=context.CHAT_WOLF_V4_CONTENT;
  assert.equal(browser.version,C.version);
  for(const field of ['wolfTasks','villageTasks','directorDirections','experimentalWolfTasks']){
    assert.equal(JSON.stringify(browser[field]),JSON.stringify(C[field]),field);
  }
  assert.ok(browser.wolfTasks.every(t=>t.type==='self_action'));
});

test('current QA samples and reported capacity refer to the released content, not the historical bank',()=>{
  const report=require('../docs/chat-wolf-v6-content-qa.json');
  assert.equal(report.version,C.version);
  assert.equal(report.wolf.activeSelfCards,C.wolfTasks.length);
  assert.equal(report.wolf.noticeableTellCards,C.wolfTasks.filter(t=>t.noticeableTell===true).length);
  assert.equal(report.wolf.minimumNoticeableShare,0.5);
  assert.equal(report.wolf.defaultMinimumNoticeable,2);
  assert.ok(report.wolf.noticeableSamples.length>=20);
  for(const sample of report.wolf.noticeableSamples){
    assert.ok(C.wolfTasks.some(t=>t.noticeableTell===true&&t.id===sample.id&&t.text===sample.text&&t.textZh===sample.textZh));
  }
  assert.equal(report.wolf.archivedInteractionCards,C.experimentalWolfTasks.length);
  assert.equal(report.village.aggregateCards,C.villageTasks.length);
  assert.equal(report.director.poolTotal,C.directorDirections.length);
  assert.equal(report.village.sampledCards.length,120);
  for(const sample of report.village.sampledCards){
    assert.ok(C.villageTasks.some(t=>t.id===sample.id&&t.text===sample.text&&t.compatibleTopicIds.includes(sample.topicId)));
  }
  assert.equal(report.strictCapacity.successfulDeals,52800);
  assert.deepEqual(report.strictCapacity.shortages,[]);
  assert.ok(Object.values(report.strictCapacity.violations).every(n=>n===0));
  assert.equal(report.strictCapacity.violations.noticeableTellUnderQuota,0);
  assert.equal(report.director.simulation.executions,20);
  assert.equal(report.director.simulation.wolfProgressChanges,0);
});
