'use strict';
// Opt-in maintenance only. Creates fresh synthetic sessions and cleans only
// the exact Firebase paths it created. Never loaded by production pages.
const assert=require('node:assert/strict');
const {Client,FirebaseREST}=require('../chat-wolf-sync.js');
const Cards=require('../chat-wolf-cards.js');
const crypto=require('node:crypto');
if(process.env.CHAT_WOLF_LIVE_TEST!=='1')throw new Error('Set CHAT_WOLF_LIVE_TEST=1 to create a temporary real Firebase room.');
const store=new FirebaseREST('https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app');
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const players=[];let host,code,control,hostToken,historyToken;
let legacy=null;
async function main(){
  host=new Client({store,storage:memory(),hostPresentation:true,interval:1000});
  if(process.env.CHAT_WOLF_TEST_CARDS==='1'){
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const legacyCode=Array.from(crypto.randomBytes(6),n=>alphabet[n%alphabet.length]).join('');
    legacy={code:legacyCode,playerCount:6,tokens:Array.from({length:6},()=>crypto.randomBytes(10).toString('hex')),
      names:['V4 QA Host',...Array.from({length:5},(_,i)=>'V4 QA '+(i+1))]};
    // This test writes only cryptographically fresh private paths, never an
    // existing Hub setup or another user's room roster.
    for(const token of legacy.tokens)assert.equal((await store.get(`rooms/${legacy.code}/players/${token}`)).value,null);
  }
  const made=await host.create({name:'V4 QA Host',...(legacy?{legacy,hostSeat:0}:{}),settings:{mode:'free-chat-v3',playerCount:6,wolfCount:2,
    jesterEnabled:true,enabledProfessions:['reporter','dreamer','judge'],clueSeconds:0,topicId:'topic_v2_01',meetingTurnSeconds:10}});
  code=made.state.public.code;control=host.host.control;hostToken=made.token;
  historyToken=host.historyToken();
  if(legacy)await host.connectCards();
  const hostCard=new Client({store,storage:memory(),allowHostRecovery:false});
  players.push({client:hostCard,token:hostToken,id:made.state.private.playerId});
  for(let i=1;i<6;i++){
    const client=new Client({store,storage:memory(),allowHostRecovery:false});
    let joined;
    if(legacy){
      const card=(await store.get(`rooms/${legacy.code}/players/${legacy.tokens[i]}`)).value;
      assert.equal(card.game,'chatwolf');
      const frame=Cards.frameURL(card.chatWolf,'https://livechat-two-alpha.vercel.app/play.html');
      assert.equal(new URL(frame).pathname,'/chat-wolf.html');
      assert.equal(new URL(frame).searchParams.get('card'),'1');
      for(const other of legacy.tokens.filter(t=>t!==legacy.tokens[i]))assert.equal(JSON.stringify(card).includes(other),false);
      joined={token:card.chatWolf.token,state:await client.read(code,card.chatWolf.token)};
    } else joined=await client.join({room:code,name:'V4 QA '+i});
    players.push({client,token:joined.token,id:joined.state.private.playerId});
  }
  if(legacy){
    for(const player of players){await player.client.read(code,player.token);await player.client.command(code,player.token,{action:'ready',ready:true});}
    assert.ok((await host.read(code,hostToken)).public.players.every(p=>p.ready));
    console.log('PASS original Hub card bridge: six private cards, correct production iframe target, ready from each original card session.');
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
  assert.equal((await read(hostPlayer)).public.deadlineAt,null);
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
    assert.equal(phase,'MEETING_TURNS');
    if(round===1){
      const meeting=(await read(hostPlayer)).public.meeting;
      assert.equal(new Set(meeting.order).size,6);
      const speaker=players.find(p=>p.id===meeting.currentSpeakerId);
      await send(speaker,{action:'endMeetingTurn',meetingId:meeting.id});
      assert.equal((await read(hostPlayer)).public.meeting.speakerIndex,1);
      const before=(await read(hostPlayer)).public.deadlineAt;
      await send(hostPlayer,{action:'setMeetingTurnSeconds',seconds:20});
      assert.equal((await read(hostPlayer)).public.deadlineAt,before);
      await send(hostPlayer,{action:'skipMeetingTurn',meetingId:meeting.id});
      assert.equal((await read(hostPlayer)).public.meeting.turnSeconds,20);
      for(let i=2;i<6;i++){
        const current=(await read(hostPlayer)).public.meeting;
        await send(players.find(p=>p.id===current.currentSpeakerId),{action:'endMeetingTurn',meetingId:current.id});
      }
      assert.equal((await read(hostPlayer)).public.phase,'VOTING');
    }else await send(hostPlayer,{action:'endMeeting'});
    if(round<3){
      for(const p of players)await send(p,{action:'submitVote',selections:[]});
      const next=(await read(players[1])).public;
      assert.equal(next.phase,'TALK');assert.equal(next.round,round+1);
      if(round===1){
        assert.ok(next.activeFollowUp);assert.equal(next.activeFollowUp.id,initialFollow);
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
  const canonical=JSON.parse((await store.get(host.path(code,control))).value.data);
  const savedScope=JSON.parse((await store.get('rooms/chatwolf-history/players/'+historyToken)).value.data);
  assert.equal(savedScope.history.deals.length,2);
  assert.deepEqual(savedScope.history,canonical.room.exposureHistory);
  for(const p of players){
    const serialized=JSON.stringify(await read(p));
    assert.equal(serialized.includes(historyToken),false);
    assert.equal(serialized.includes('exposureHistory'),false);
  }
  console.log('PASS three rounds, two midgame votes, private ballot/zero-vote rewards, final judge tie, wolf win, fresh restart.');
}
main().catch(e=>{console.error('FAIL',e.code||e.message,e.stack);process.exitCode=1;}).finally(async()=>{
  host?.close();players.forEach(p=>p.client.close());
  if(host?.running)await host.running.catch(()=>{});
  if(code&&control){
    const paths=new Set([control,hostToken,...players.map(p=>p.token)]);
    await Promise.all([...paths].filter(Boolean).map(token=>store.put('rooms/chatwolf-'+code+'/players/'+token,null)));
    await store.put('rooms/chatwolf-'+code+'/roster',null);
    if(/^[a-f0-9]{64}$/.test(historyToken||''))await store.put('rooms/chatwolf-history/players/'+historyToken,null);
    if(legacy)await Promise.all(legacy.tokens.map(token=>store.put(`rooms/${legacy.code}/players/${token}`,null)));
    console.log('Cleaned only this run’s temporary room paths.');
  }
});
