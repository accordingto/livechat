'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../chat-wolf-v4-preview');
const C=require('../chat-wolf-v4-preview/chat-wolf-v4-content.js');
const E=require('../chat-wolf-v4-preview/chat-wolf-v3-engine.js');
test('isolated preview ships only declared public assets and has reproducible content hashes',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
  assert.equal(manifest.stage,'development');
  assert.equal(manifest.files.length,22);
  for(const {file,sha256} of manifest.files){
    let bytes=fs.readFileSync(path.join(root,file));
    if(/\.(js|html|css)$/.test(file))bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha256,file);
  }
  const html=fs.readFileSync(path.join(root,'chat-wolf.html'),'utf8');
  assert.match(html,/Development Preview/);
  assert.match(html,/chat-wolf-preview-config\.js/);
  assert.equal(C.releaseStage,'development');
});
test('published preview starts all 48 topics with three shared wolf tasks and manual follow-ups',()=>{
  for(const topic of C.topics){
    assert.equal(topic.followUps.length,8);
    const room=E.createRoom({code:'PREVWX',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Host',settings:{topicId:topic.id},now:1,seed:17});
    for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Player '+i,now:1});
    E.dispatch(room,'p0','startGame',{},2);
    assert.equal(room.flowVersion,4);
    assert.equal(room.tasks.length,3);
    assert.equal(room.tasks.filter(t=>t.type==='interaction').length,1);
    assert.equal(new Set(room.tasks.map(t=>t.variantGroup)).size,3);
    assert.ok(room.tasks.every(t=>E.compatible(t,topic)));
    for(const t of room.tasks)for(const line of t.requiredUtterances||[])assert.ok(t.textZh.includes(line));
  }
});
