'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Client, stamp, viewStamp, presentationView } = require('../chat-wolf-sync.js');
const E = require('../chat-wolf-engine.js');
const copy = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
const storage = () => { const m = new Map(); return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}; };
function firebaseValue(value){
  if(value==null)return null;
  if(typeof value!=='object')return value;
  if(Array.isArray(value)){const items=value.map(firebaseValue);return items.some(v=>v!==null)?items:null;}
  const entries=Object.entries(value).map(([key,v])=>[key,firebaseValue(v)]).filter(([_,v])=>v!==null);
  return entries.length?Object.fromEntries(entries):null;
}
class Store {
  constructor(stripEmpty=false){this.data={};this.stripEmpty=stripEmpty;}
  async get(path){const value=copy(path.split('/').reduce((v,k)=>v?.[k],this.data));return {value,etag:createHash('sha256').update(JSON.stringify(value)).digest('hex')};}
  async put(path,value,etag){
    if(etag!==undefined&&(await this.get(path)).etag!==etag)return {conflict:true};
    const parts=path.split('/');let parent=this.data;
    for(const p of parts.slice(0,-1))parent=parent[p]||={};
    const stored=this.stripEmpty?firebaseValue(value):copy(value);
    parent[parts.at(-1)]=stored;return {value:copy(stored)};
  }
}
async function setup(t,settings={},stripEmpty=false){
  const store=new Store(stripEmpty),hostStorage=storage();let now=1_000_000;
  const host=new Client({store,storage:hostStorage,clock:()=>now,interval:15,hostPresentation:true});
  const legacy={code:'ABC234',playerCount:6,tokens:Array.from({length:6},(_,i)=>String(i+1).repeat(20)),names:['Alex','Blair','Casey','Drew','Ellis','Flynn']};
  const made=await host.create({name:'Alex',legacy,hostSeat:0,settings:{mode:'free-chat-v3',playerCount:6,wolfCount:2,...settings}});
  const code=made.state.public.code;
  await host.connectCards();
  const players=[];
  for(const sourceToken of legacy.tokens){
    const payload=(await store.get('rooms/ABC234/players/'+sourceToken)).value;
    const client=new Client({store,storage:storage(),clock:()=>now,allowHostRecovery:false});
    const token=payload.chatWolf.token,view=await client.read(code,token);
    players.push({client,token,id:view.private.playerId});
    assert.equal(Object.keys(payload.chatWolf).length,3);
  }
  const hostPlayer={client:host,token:made.token,id:made.state.private.playerId};
  t.after(()=>[host,...players.map(p=>p.client)].forEach(c=>c.close()));
  const read=p=>p.client.read(code,p.token);
  const send=async(p,body)=>{await read(p);return p.client.command(code,p.token,body);};
  const data=async()=>JSON.parse((await store.get(host.path(code,host.host.control))).value.data);
  const elapse=async ms=>{
    // A running host renews its lease. A single 10+ second fake-clock jump means
    // a sleeping host instead, whose remaining countdown is intentionally kept.
    while(ms>0){const step=Math.min(ms,9000);now+=step;ms-=step;await host.cycle();}
  };
  return {host,hostPlayer,hostStorage,store,players,code,read,send,data,elapse,now:()=>now,advance:ms=>{now+=ms;}};
}

test('v3 original cards: host presentation is public, private cards keep unique roles and shared tasks',async t=>{
  const s=await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'});
  const hostView=await s.read(s.hostPlayer);
  assert.equal(hostView.public.rulesVersion,3);
  assert.equal(hostView.public.phase,'ROLE_REVEAL');
  assert.equal(hostView.private.role,null);
  assert.equal(hostView.private.tasks,null);
  assert.equal(hostView.private.reward,null);
  const views=await Promise.all(s.players.map(s.read));
  assert.notEqual(views[0].private.role,null);
  assert.equal(views.filter(v=>v.private.role==='WOLF').length,2);
  assert.equal(views.filter(v=>v.private.role==='JESTER').length,1);
  const roles=views.filter(v=>v.private.role==='VILLAGER').map(v=>v.private.profession).filter(Boolean);
  assert.equal(new Set(roles).size,roles.length);
  assert.equal(roles.includes('kindred'),false);
  const wolfPlayers=s.players.filter((p,i)=>views[i].private.role==='WOLF');
  assert.deepEqual((await s.read(wolfPlayers[0])).private.tasks,(await s.read(wolfPlayers[1])).private.tasks);
  assert.equal((await s.read(wolfPlayers[0])).private.tasks.length,3);
  const publicJson=JSON.stringify(hostView.public);
  for(const task of (await s.read(wolfPlayers[0])).private.tasks)assert.equal(publicJson.includes(task.id),false);
  await s.send(s.hostPlayer,{action:'beginTalk'}); // no player needs to acknowledge first
  const id=(await s.read(wolfPlayers[0])).private.tasks[0].id;
  await Promise.all(wolfPlayers.map(s.read));
  const results=await Promise.allSettled(wolfPlayers.map(p=>p.client.command(s.code,p.token,{action:'completeTask',taskId:id})));
  assert.ok(results.some(r=>r.status==='fulfilled'));
  const completed=(await s.read(wolfPlayers[1])).private.tasks.find(t=>t.id===id).completed;
  assert.ok(completed);
  await s.send(wolfPlayers[0],{action:'completeTask',taskId:id});
  assert.deepEqual((await s.read(wolfPlayers[0])).private.tasks.find(t=>t.id===id).completed,completed);
  const nonwolf=s.players.find((p,i)=>views[i].private.role!=='WOLF');
  await assert.rejects(s.send(nonwolf,{action:'completeTask',taskId:id,role:'WOLF',playerId:wolfPlayers[0].id}));
  assert.equal((await s.read(nonwolf)).private.tasks,null);
  const roster=JSON.stringify((await s.store.get(s.host.lobby(s.code))).value);
  assert.equal(roster.includes(s.host.host.control),false);
  for(const p of s.players)assert.equal(roster.includes(p.token),false);
});

test('v3 expiry/host advance happens once; restart fences old cards and resets secrets',async t=>{
  const s=await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'});
  await s.send(s.hostPlayer,{action:'beginTalk'});
  const before=await s.read(s.hostPlayer);
  await s.elapse(before.public.deadlineAt-s.now());
  await assert.rejects(s.host.command(s.code,s.hostPlayer.token,{action:'endTalk'}));
  let current=await s.read(s.hostPlayer);
  assert.equal(current.public.phase,'WRAP_UP');
  const canonical=(await s.data()).room;
  assert.equal(stamp(canonical),viewStamp(current));
  const stale=s.players[1];await s.read(stale);
  await s.send(s.hostPlayer,{action:'restart',keepTopic:true});
  await assert.rejects(stale.client.command(s.code,stale.token,{action:'completeTask',taskId:'old-task'}),{code:'STALE_ACTION'});
  current=await s.read(s.hostPlayer);
  assert.equal(current.public.phase,'ROLE_REVEAL');
  assert.notEqual(current.public.matchId,before.public.matchId);
  assert.deepEqual(current.public.voteHistory,[]);
  const next=(await s.data()).room;
  assert.equal(stamp(next),viewStamp(current));
  assert.equal(Object.keys(next.players).length,6);
});

test('v3 three rounds synchronize follow-up, partial votes, abstention and final task result',async t=>{
  const s=await setup(t,{jesterEnabled:false,enabledProfessions:[]});
  await s.send(s.hostPlayer,{action:'startGame'});
  await s.send(s.hostPlayer,{action:'beginTalk'});
  const views=await Promise.all(s.players.map(s.read));
  const wolf=s.players.find((p,i)=>views[i].private.role==='WOLF');
  for(const task of (await s.read(wolf)).private.tasks)await s.send(wolf,{action:'completeTask',taskId:task.id});
  const original=(await s.read(s.hostPlayer)).public;
  await s.send(s.hostPlayer,{action:'followUp'});
  let updated=(await s.read(s.players[2])).public;
  assert.equal(updated.deadlineAt,original.deadlineAt);
  assert.equal(updated.round,1);
  assert.ok(updated.activeFollowUp);
  const seen=[updated.activeFollowUp.id];
  for(let round=1;round<=3;round++){
    assert.equal((await s.read(s.hostPlayer)).public.round,round);
    await s.send(s.hostPlayer,{action:'endTalk'});
    let p=(await s.read(s.hostPlayer)).public;
    if(p.phase==='WRAP_UP'){await s.elapse(p.deadlineAt-s.now());p=(await s.read(s.hostPlayer)).public;}
    if(p.phase==='FINAL_CLUES'){
      await assert.rejects(s.send(wolf,{action:'completeTask',taskId:(await s.read(wolf)).private.tasks[0].id}));
      await s.elapse(p.deadlineAt-s.now());p=(await s.read(s.hostPlayer)).public;
    }
    assert.equal(p.phase,'MEETING_DISCUSS');
    await s.send(s.hostPlayer,{action:'endMeeting'});
    for(const player of s.players)await s.send(player,{action:'submitVote',selections:[]});
    updated=(await s.read(s.players[2])).public;
    assert.equal(updated.voteHistory.length,round);
    assert.deepEqual(updated.voteHistory.at(-1).nominees,[]);
    if(round===1){
      assert.ok(updated.activeFollowUp);
      assert.notEqual(updated.activeFollowUp.id,seen[0]);
      seen.push(updated.activeFollowUp.id);
    }
    if(round===2)assert.equal(updated.activeFollowUp.id,seen[1]);
  }
  assert.equal(updated.phase,'FINISHED');
  assert.equal(updated.result.outcome,'WOLVES');
  assert.equal(updated.reveal.tasks.length,3);
  await s.send(s.hostPlayer,{action:'replay'});
  updated=(await s.read(s.hostPlayer)).public;
  assert.equal(updated.phase,'LOBBY');
  assert.equal(updated.reveal,undefined);
});

test('real Firebase empty-node semantics preserve explicit abstention and empty profession settings',async t=>{
  const s=await setup(t,{},true);
  await s.send(s.hostPlayer,{action:'settings',settings:{enabledProfessions:[]}});
  assert.deepEqual((await s.read(s.hostPlayer)).public.settings.enabledProfessions,[]);
  await s.send(s.hostPlayer,{action:'startGame'});
  assert.ok((await Promise.all(s.players.map(s.read))).every(v=>v.private.profession===null));
  await s.send(s.hostPlayer,{action:'beginTalk'});
  await s.send(s.hostPlayer,{action:'endTalk'});
  await s.send(s.hostPlayer,{action:'endMeeting'});
  for(const player of s.players)await s.send(player,{action:'submitVote',selections:[]});
  const view=await s.read(s.hostPlayer);
  assert.equal(view.public.phase,'TALK');assert.equal(view.public.round,2);
  assert.deepEqual(view.public.voteHistory[0].nominees,[]);
  const channel=(await s.store.get(s.host.path(s.code,s.players[1].token))).value;
  assert.equal(channel.request.body.selections,undefined);
  assert.deepEqual(JSON.parse(channel.request.bodyJson).selections,[]);
  // Omitted selections are still malformed, never silently turned into a vote.
  await s.send(s.hostPlayer,{action:'endTalk'});await s.send(s.hostPlayer,{action:'endMeeting'});
  await assert.rejects(s.send(s.players[1],{action:'submitVote'}),{code:'INVALID_SELECTION'});
});

async function pendingRequest(s,player,body){
  const path=s.host.path(s.code,player.token),old=await s.store.get(path),card=old.value;
  card.request={seq:(card.reply?.seq||0)+1,id:'other-tab-presence',context:viewStamp(JSON.parse(card.view)),body,bodyJson:JSON.stringify(body)};
  await s.store.put(path,card,old.etag);
  return card.request.seq;
}
function stopAutomaticCycles(s){clearInterval(s.host.timer);s.host.timer=null;}

test('a real host click waits for a pending heartbeat from its private card instead of being dropped',async t=>{
  const s=await setup(t);stopAutomaticCycles(s);
  await s.read(s.hostPlayer);
  const queued=await pendingRequest(s,s.players[0],{action:'heartbeat'});
  const response=await s.host.command(s.code,s.hostPlayer.token,{action:'ready',ready:true});
  assert.equal(response.public.players.find(p=>p.id===s.hostPlayer.id).ready,true);
  const channel=(await s.store.get(s.host.path(s.code,s.hostPlayer.token))).value;
  assert.equal(channel.reply.seq,queued+1);assert.equal(channel.reply.error,null);
  assert.equal(JSON.parse(channel.request.bodyJson).action,'ready');
});

test('waiting for a heartbeat never replaces the original clicked phase with a fresher polled phase',async t=>{
  const s=await setup(t);await s.send(s.hostPlayer,{action:'startGame'});await s.send(s.hostPlayer,{action:'beginTalk'});
  const talk=await s.read(s.hostPlayer);
  await s.elapse(talk.public.deadlineAt-s.now()-1000);stopAutomaticCycles(s);
  const clicked=await s.read(s.hostPlayer);
  await pendingRequest(s,s.players[0],{action:'heartbeat'});
  s.advance(1000);
  // The pending heartbeat's cycle crosses the deadline. Simulate the other
  // polling path accepting that new phase while the real action waits.
  const refreshed=new Promise((resolve,reject)=>setTimeout(()=>s.read(s.hostPlayer).then(resolve,reject),25));
  await assert.rejects(s.host.command(s.code,s.hostPlayer.token,{action:'endTalk'}),{code:'STALE_ACTION'});
  await refreshed;
  const current=await s.read(s.hostPlayer);assert.equal(current.public.phase,'WRAP_UP');
  const channel=(await s.store.get(s.host.path(s.code,s.hostPlayer.token))).value;
  const body=JSON.parse(channel.request.bodyJson);
  assert.equal(body.phaseVersion,clicked.public.phaseVersion);
  assert.equal(channel.request.context,viewStamp(clicked));
  assert.equal(stamp((await s.data()).room),viewStamp(current));
});

test('pending user commands are not automatically queued or retried',async t=>{
  const s=await setup(t);stopAutomaticCycles(s);await s.read(s.hostPlayer);
  const queued=await pendingRequest(s,s.players[0],{action:'ready',ready:true});
  await assert.rejects(s.host.command(s.code,s.hostPlayer.token,{action:'ready',ready:false}),{code:'ACTION_PENDING'});
  const channel=(await s.store.get(s.host.path(s.code,s.hostPlayer.token))).value;
  assert.equal(channel.request.seq,queued);assert.equal(JSON.parse(channel.request.bodyJson).ready,true);
});

test('presentation sanitizer never changes the actual private card',()=>{
  const view={public:{rulesVersion:3,phase:'VOTING'},private:{playerId:'host',isHost:true,role:'WOLF',tasks:[{text:'secret'}],profession:null,reward:{result:'secret'},actions:{canEndVote:true,canSubmitVote:true}}};
  const clean=presentationView(view);
  assert.equal(clean.private.role,null);
  assert.equal(clean.private.actions.canSubmitVote,undefined);
  assert.equal(clean.private.actions.canEndVote,true);
  assert.equal(view.private.role,'WOLF');
  view.public.phase='FINISHED';
  assert.equal(presentationView(view),view);
});
