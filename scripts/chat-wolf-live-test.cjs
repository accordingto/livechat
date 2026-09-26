'use strict';
// Explicit developer opt-in. Creates ONLY a new test room, never discovers or
// reads real player rooms. Removes its own known test paths in finally.
const assert = require('node:assert/strict');
const { Client, FirebaseREST } = require('../chat-wolf-sync.js');
if (process.env.CHAT_WOLF_LIVE_TEST !== '1') throw new Error('Set CHAT_WOLF_LIVE_TEST=1 to create a real Firebase test room.');
const url='https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const store=new FirebaseREST(url);
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const clients=[];
let code, control;
async function main(){
  const host=new Client({store,storage:memory()});
  clients.push({client:host});
  const created=await host.create({name:'QA Host',settings:{playerCount:6,wolfCount:2,talkSeconds:180,meetingSeconds:60,voteSeconds:90}});
  code=created.state.public.code; control=host.host.control;
  Object.assign(clients[0],{token:created.token,id:created.state.private.playerId});
  console.log('Created a fresh live Firebase QA room; no Admin credentials.');
  for(let i=1;i<6;i++){
    const client=new Client({store,storage:memory()});
    const joined=await client.join({room:code,name:`QA ${i}`});
    clients.push({client,token:joined.token,id:joined.state.private.playerId});
  }
  const read=p=>p.client.read(code,p.token);
  const send=async(p,body)=>{await read(p);return p.client.command(code,p.token,body);};
  for(const p of clients) await send(p,{action:'ready',ready:true});
  await send(clients[0],{action:'startGame'});
  const views=await Promise.all(clients.map(read));
  const wolves=clients.filter((_,i)=>views[i].private.role==='WOLF');
  const villagers=clients.filter(p=>!wolves.includes(p));
  assert.equal(wolves.length,2);
  for(const p of villagers){const v=await read(p);assert.equal(v.private.tasks,null);assert.equal(v.private.wolfTeam,null);assert.equal(v.public.reveal,undefined);}
  const tasks=(await read(wolves[0])).private.tasks;
  assert.equal(tasks.length,2);
  await send(wolves[0],{action:'taskNote',taskId:tasks[0].id,note:'Live sync QA'});
  assert.equal((await read(wolves[1])).private.tasks[0].note,'Live sync QA');
  const roster=JSON.stringify((await store.get(host.lobby(code))).value);
  for(const p of clients)assert.equal(roster.includes(p.token),false);
  assert.equal(roster.includes(control),false);
  console.log('PASS 6 players / 2 wolves, private projections, encrypted joins, shared note sync.');
  const refresh=new Client({store,storage:memory()});
  assert.equal((await refresh.read(code,clients[1].token)).private.playerId,clients[1].id);refresh.close();
  for(const p of clients) await send(p,{action:'ackRole'});
  await Promise.all(clients.map(read));
  const bells=await Promise.allSettled(clients.slice(1,3).map(p=>p.client.command(code,p.token,{action:'ringBell'})));
  assert.equal(bells.filter(r=>r.status==='fulfilled').length,1);
  for(const task of tasks) await send(wolves[0],{action:'claimTask',taskId:task.id,targetIds:villagers.slice(0,2).map(p=>p.id),round:1,summary:'QA fabricated event for transport verification only'});
  assert.equal((await read(villagers[0])).private.tasks,null);
  await send(clients[0],{action:'pause'}); const paused=await read(clients[1]);assert.equal(paused.public.paused,true);
  await send(clients[0],{action:'resume'});
  console.log('PASS reconnect identity, concurrent bell once, claims stay private, pause/resume.');
  const stages=[];
  for(let guard=0;guard<110;guard++){
    const view=await read(clients[0]),p=view.public;
    const key=p.phase==='TALK'?`TALK ${p.talk.round}`:p.phase==='MEETING_DISCUSS'?`MEETING ${p.meeting.slotId}`:p.phase==='VOTING'?`VOTING ${p.voting.type}`:p.phase;
    if(stages.at(-1)!==key){stages.push(key);console.log(key);}
    if(p.phase==='TALK'||p.phase==='MEETING_DISCUSS')await send(clients[0],{action:'endTurn'});
    else if(p.phase==='VOTING'){
      for(const voter of clients)await send(voter,{action:'submitVote',selections:villagers.slice(0,2).map(v=>v.id)});
    }else if(p.phase==='TASK_REVIEW'){
      await assert.rejects(send(wolves[0],{action:'claimTask',taskId:tasks[0].id}),e=>['WRONG_PHASE','TASKS_FROZEN'].includes(e.code));
      for(const task of tasks)await send(clients[0],{action:'reviewTask',taskId:task.id,valid:true});
    }else if(p.phase==='FINISHED'){assert.equal(p.result.outcome,'WOLVES');assert.equal(p.voteHistory.length,3);break;}
    else throw new Error(`Unexpected phase ${p.phase}`);
  }
  assert.deepEqual(stages,['TALK 1','MEETING after2','VOTING MIDGAME','TALK 2','TALK 3','TALK 4','MEETING after4','VOTING MIDGAME','TALK 5','TALK 6','VOTING FINAL','TASK_REVIEW','FINISHED']);
  await send(clients[0],{action:'replay'});
  for(const p of clients){const v=await read(p);assert.equal(v.public.phase,'LOBBY');assert.equal(v.private.tasks,null);assert.equal(v.private.role,null);assert.deepEqual(v.public.voteHistory,[]);}
  console.log('PASS complete six-round game, early meeting quota, final review / wolf win, replay clears secrets.');
}
main().catch(e=>{console.error('FAIL',e.code||e.message);process.exitCode=1;}).finally(async()=>{
  clients.forEach(p=>p.client.close());
  await Promise.allSettled(clients.map(p=>p.client.running));
  if(code&&control){
    const known=new Set([...clients.map(p=>p.token).filter(Boolean),control]);
    await Promise.all([...known].map(token=>store.put(`rooms/chatwolf-${code}/players/${token}`,null)));
    await store.put(`rooms/chatwolf-${code}/roster`,null);
    console.log('Removed only the test room paths created by this run.');
  }
});
