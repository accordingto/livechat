'use strict';
// Opt-in maintenance only. Creates fresh synthetic sessions and cleans only
// the exact Firebase paths it created. Never loaded by production pages.
const assert=require('node:assert/strict');
const {Client,FirebaseREST}=require('../chat-wolf-sync.js');
if(process.env.CHAT_WOLF_LIVE_TEST!=='1')throw new Error('Set CHAT_WOLF_LIVE_TEST=1 to create a temporary real Firebase room.');
const store=new FirebaseREST('https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app');
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const players=[];let host,code,control,hostToken;
async function main(){
  host=new Client({store,storage:memory(),hostPresentation:true,interval:1000});
  const made=await host.create({name:'V3 QA Host',settings:{mode:'free-chat-v3',playerCount:6,wolfCount:2,
    jesterEnabled:true,enabledProfessions:['reporter','dreamer','judge'],clueSeconds:0}});
  code=made.state.public.code;control=host.host.control;hostToken=made.token;
  const hostCard=new Client({store,storage:memory(),allowHostRecovery:false});
  players.push({client:hostCard,token:hostToken,id:made.state.private.playerId});
  for(let i=1;i<6;i++){
    const client=new Client({store,storage:memory(),allowHostRecovery:false});
    const joined=await client.join({room:code,name:'V3 QA '+i});
    players.push({client,token:joined.token,id:joined.state.private.playerId});
  }
  const hostPlayer={client:host,token:hostToken};
  const read=p=>p.client.read(code,p.token);
  const send=async(p,body)=>{await read(p);return p.client.command(code,p.token,body);};
  await Promise.all([read(players[0]),read(hostPlayer)]);
  const presenceRace=await Promise.allSettled([
    hostCard.command(code,hostToken,{action:'heartbeat'}),
    host.command(code,hostToken,{action:'ready',ready:true}),
  ]);
  assert.equal(presenceRace[1].status,'fulfilled','A host click must not be lost to its private card heartbeat.');
  await send(hostPlayer,{action:'startGame'});
  assert.equal((await read(hostPlayer)).private.role,null);
  const views=await Promise.all(players.map(read));
  const wolves=players.filter((_,i)=>views[i].private.role==='WOLF');
  const villagers=players.filter((_,i)=>views[i].private.role==='VILLAGER');
  const judge=players.find((_,i)=>views[i].private.profession==='judge');
  assert.equal(wolves.length,2);assert.equal(villagers.length,3);
  assert.equal(views.filter(v=>v.private.role==='JESTER').length,1);
  assert.equal(new Set(views.filter(v=>v.private.profession).map(v=>v.private.profession)).size,3);
  for(const v of views.filter(v=>v.private.role!=='WOLF'))assert.equal(v.private.tasks,null);
  assert.deepEqual((await read(wolves[0])).private.tasks,(await read(wolves[1])).private.tasks);
  await send(hostPlayer,{action:'beginTalk'});
  const tasks=(await read(wolves[0])).private.tasks;
  for(const task of tasks)await send(wolves[0],{action:'completeTask',taskId:task.id});
  assert.ok((await read(wolves[1])).private.tasks.every(t=>t.completed));
  for(const p of villagers)await send(p,{action:'completeTask',taskId:(await read(p)).private.villageTask.id});
  assert.equal((await read(hostPlayer)).public.phase,'TALK');
  const deadline=(await read(hostPlayer)).public.deadlineAt;
  await send(hostPlayer,{action:'followUp'});
  const initialFollow=(await read(players[2])).public.activeFollowUp.id;
  assert.equal((await read(players[2])).public.deadlineAt,deadline);
  await send(hostPlayer,{action:'pause'});
  assert.equal((await read(players[3])).public.paused,true);
  await send(hostPlayer,{action:'resume'});
  await send(hostPlayer,{action:'extendTalk',seconds:60});
  const refreshed=new Client({store,storage:memory(),allowHostRecovery:false});
  assert.equal((await refreshed.read(code,players[1].token)).private.playerId,players[1].id);refreshed.close();
  console.log('PASS six real sessions, host/card heartbeat race, private host card, unique professions, shared one-click tasks, follow-up, pause/extend/reconnect.');
  for(let round=1;round<=3;round++){
    await send(hostPlayer,{action:'endTalk'});
    const phase=(await read(hostPlayer)).public.phase;
    assert.equal(phase,'MEETING_DISCUSS');
    await send(hostPlayer,{action:'endMeeting'});
    if(round<3){
      for(const p of players)await send(p,{action:'submitVote',selections:[]});
      const next=(await read(players[1])).public;
      assert.equal(next.phase,'TALK');assert.equal(next.round,round+1);
      if(round===1){
        assert.ok(next.activeFollowUp);assert.notEqual(next.activeFollowUp.id,initialFollow);
        for(const role of ['reporter','dreamer']){
          const p=players.find((_,i)=>views[i].private.profession===role);
          const meetingId=next.voteHistory[0].id;
          await send(p,{action:'useReward',meetingId,targetId:players.find(x=>x.id!==p.id).id});
          assert.ok((await read(p)).private.reward.used);
        }
      }
    }else{
      // Three villagers receive exactly two votes each. Everyone gives one
      // valid non-self vote, creating a genuine boundary tie for K=2.
      const candidates=villagers.map(p=>p.id),counts=Object.fromEntries(candidates.map(id=>[id,0]));
      function assign(i,ballots){
        if(i===players.length)return ballots;
        for(const id of candidates){
          if(id===players[i].id||counts[id]>=2)continue;
          counts[id]++;const found=assign(i+1,[...ballots,[id]]);counts[id]--;
          if(found)return found;
        }
        return null;
      }
      const ballots=assign(0,[]);assert.ok(ballots);
      for(let i=0;i<players.length;i++)await send(players[i],{action:'submitVote',selections:ballots[i]});
      const jv=await read(judge);
      assert.equal(jv.public.phase,'JUDGE_DECISION');
      assert.equal(jv.private.judgeDecision.seats,2);
      assert.equal((await read(wolves[0])).private.judgeDecision,null);
      await send(judge,{action:'judgeVote',selections:candidates.slice(0,2)});
    }
  }
  const final=(await read(hostPlayer)).public;
  assert.equal(final.phase,'FINISHED');assert.equal(final.result.outcome,'WOLVES');
  assert.equal(final.voteHistory.length,3);
  assert.equal(final.reveal.tasks.length,3);
  await send(hostPlayer,{action:'restart',keepTopic:true});
  const restarted=(await read(hostPlayer)).public;
  assert.equal(restarted.phase,'ROLE_REVEAL');assert.notEqual(restarted.matchId,final.matchId);
  assert.deepEqual(restarted.voteHistory,[]);
  console.log('PASS three rounds, two midgame votes, private ballot/zero-vote rewards, final judge tie, wolf win, fresh restart.');
}
main().catch(e=>{console.error('FAIL',e.code||e.message,e.stack);process.exitCode=1;}).finally(async()=>{
  host?.close();players.forEach(p=>p.client.close());
  if(host?.running)await host.running.catch(()=>{});
  if(code&&control){
    const paths=new Set([control,hostToken,...players.map(p=>p.token)]);
    await Promise.all([...paths].filter(Boolean).map(token=>store.put('rooms/chatwolf-'+code+'/players/'+token,null)));
    await store.put('rooms/chatwolf-'+code+'/roster',null);
    console.log('Cleaned only this run’s temporary room paths.');
  }
});
