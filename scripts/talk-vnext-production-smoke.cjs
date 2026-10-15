'use strict';
// Owned disposable production fixture only. Secrets remain in env-run memory.
const crypto=require('node:crypto');
const E=require('../talk-engine.js'),{createStore,DEFAULT_DB}=require('../runtime/talk-archive-store.cjs');
const API='https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const uid=()=>crypto.randomBytes(16).toString('hex'),list=E.list;
async function run({env=process.env,fetchImpl=globalThis.fetch,now=Date.now,delay=ms=>new Promise(r=>setTimeout(r,ms)),progress=()=>{},onFailure=()=>{},diagnosticOnly=false,threePlayerCheckIn=false,roleBalanceOnly=false,rolePlayerCount=9}={}){
 const report={ok:false,checks:0,cleaned:0,cleanupFailed:0,step:'initial',flags:{}},key=env.CRAZY_TALK_ARCHIVE_SECRET;
 if(!/^[a-f0-9]{64}$/i.test(key||''))return{...report,error:'archive_key_unavailable'};
 const fixtureCount=roleBalanceOnly?rolePlayerCount:threePlayerCheckIn?3:5;
 if(!Number.isInteger(fixtureCount)||fixtureCount<2||fixtureCount>9)return{...report,error:'invalid_fixture_count'};
 const code='QVN'+crypto.randomBytes(4).toString('hex').toUpperCase(),marker=uid(),control=uid(),initial=code+':vnext';
 const seats=Array.from({length:fixtureCount},(_,i)=>i+1).map(playerNum=>({playerNum,token:crypto.randomBytes(10).toString('hex')}));
 const node=n=>'rooms/'+code+'/players/'+(n===0?control:seats[n-1].token),created=new Set(),vaultIds=new Set(),ownerIds=new Set();
 const archive='rooms/talk-archive/players/'+crypto.createHmac('sha256',Buffer.from(key,'hex')).update('crazy-talk-archive-room-v1:'+code).digest('hex');
 const store=createStore({secret:key,fetchImpl}),ownSession=s=>typeof s==='string'&&(s===initial||s.startsWith(initial+':topic:'));
 const check=v=>{if(!v)throw Error('check_failed');report.checks++};
 const http=(url,opts={})=>fetchImpl(url,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),...opts});
 const snapshot=async path=>{const r=await http(DEFAULT_DB+'/'+path+'.json',{headers:{'X-Firebase-ETag':'true'}});check(r.ok);check(!!r.headers.get('etag'));return{value:await r.json(),etag:r.headers.get('etag')}};
 const put=async(path,value,etag)=>{const r=await http(DEFAULT_DB+'/'+path+'.json',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(value)});check(r.ok)};
 const api=async body=>{const r=await http(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.headers.get('x-icebreak-crazy-wake')==='scheduled')report.scheduled=(report.scheduled||0)+1;const v=await r.json();check(r.ok&&!v.error);return v};
 const raw=async()=> (await snapshot(node(0))).value,state=async()=> (await raw()).state,card=async n=>(await snapshot(node(n))).value;
 let seq=0;
 const act=async(n,type,extra={},expected='')=>{const source=await raw(),s=source.state;const id='vnext-qa-'+ ++seq;
  const result=await api({operation:'execute',capsule:source.executor.capsule,token:n===0?control:seats[n-1].token,command:{id,sessionId:s.sessionId,turnId:s.turnId,type,...extra}});
  const next=await state();if(type==='crazyRendered')check(result.technical?.rendered===true);else check(next.replies[n]?.id===id&&next.replies[n]?.error===expected);return next};
 const pulse=async n=>{const source=await raw();return api({operation:'execute',capsule:source.executor.capsule,token:n===0?control:seats[n-1].token,clock:true})};
 const shown=async n=>{const p=(await state()).crazy.prompts[n];check(p?.status==='pending');return act(n,'crazyRendered',{promptId:p.id,renderVersion:1})};
 const waitState=async(fn,limit=20000)=>{const end=now()+limit;do{const s=await state();if(fn(s))return s;await delay(1000)}while(now()<end);throw Error('wait_failed')};
 const mark=(step,flag)=>{report.step=step;if(flag)report.flags[flag]=true;progress({step,checks:report.checks})};
 try{
  mark(roleBalanceOnly?'create-owned-seats-for-role-balance':threePlayerCheckIn?'create-three-owned-seats':'create-five-owned-seats');const prior=await snapshot(archive);check(prior.value==null);created.add(archive);
  const s=E.create({id:initial,now:now(),topic:{question:'Invent a ridiculous cafe together.'},roster:seats.map(p=>({playerNum:p.playerNum,name:'vNext QA '+p.playerNum})),gameMode:'crazy',crazySource:threePlayerCheckIn||roleBalanceOnly?'players':'mixed',conversationMode:'free',...(threePlayerCheckIn||roleBalanceOnly?{}:{crazyPlayStyle:'director'}),crazyRotationSeconds:threePlayerCheckIn?240:60,crazyMinSeconds:5,crazyMaxSeconds:5,gameSeconds:threePlayerCheckIn||roleBalanceOnly?900:60});
  for(const n of [0,...seats.map(p=>p.playerNum)]){const path=node(n),before=await snapshot(path);check(before.value==null);created.add(path);await put(path,{...(n===0?{state:s,revision:1}:E.view(s,n,now())),qaVNext:{marker}},before.etag)}
  await api({operation:'register',game:'letstalk',code,controlToken:control,seats,sessionId:initial});await act(0,'start');await act(0,'crazyDelegate',{playerNum:1});
  let current=await state();
  if(roleBalanceOnly){
   const expected=Math.floor(fixtureCount/2),directors=list(current.crazy.directors),actors=seats.map(p=>p.playerNum).filter(n=>!directors.includes(n));
   check(current.crazy.playStyle==='director');check(current.crazy.effectivePlayStyle==='director');check(directors.length===expected);check(actors.length===Math.ceil(fixtureCount/2));check(directors.length<=actors.length);
   report.players=fixtureCount;report.directors=directors.length;report.actors=actors.length;report.flags.generalDirectorActorRatio=true;
   for(const seat of seats)check((await card(seat.playerNum)).talk.crazy.canAssign===directors.includes(seat.playerNum));
   await act(actors[0],'crazyAssign',{target:directors[0],text:'An actor must not assign this.'},'not_director');report.flags.directorOnlyAssignment=true;
   const text='Announce that your spoon is royalty.';await act(directors[0],'crazyAssign',{target:actors[0],text});
   const prompt=(await card(actors[0])).talk.crazy.prompt;check(prompt?.text===text);
   for(const seat of seats)if(seat.playerNum!==actors[0])check(!JSON.stringify((await card(seat.playerNum)).talk).includes(text));
   report.flags.privateActorTask=true;await shown(actors[0]);await act(actors[0],'crazyDone',{promptId:prompt.id});
   check((await state()).scores[actors[0]]===1);await act(0,'crazyDrain');check((await state()).crazy.roundStage==='sorting');
   report.flags.completionAndClosing=true;report.ok=true;mark('general-role-balance-complete');return report;
  }
  if(threePlayerCheckIn){
   check(current.crazy.playStyle==='director');check(list(current.crazy.directors).join(',')==='1');
   check((await card(1)).talk.crazy.canAssign===true);for(const n of [2,3])check((await card(n)).talk.crazy.canAssign===false);
   check((await card(2)).talk.crazy.effectiveMaxActive===2);report.flags.threeSeatsOneDirectorTwoActors=true;
   await act(2,'crazyAssign',{target:3,text:'Actors must not be allowed to write.'},'not_director');
   await act(1,'crazyAssign',{target:2,text:'Introduce your cup as royalty.'});await shown(2);
   await act(1,'crazyAssign',{target:3,text:'Make one tiny chicken noise.'});await shown(3);
   const p2=(await state()).crazy.prompts[2],p3=(await state()).crazy.prompts[3];
   for(const n of [1,3])check(!JSON.stringify((await card(n)).talk).includes(p2.text));
   mark('waiting-for-real-140-second-check-in');await delay(Math.max(0,p2.at+140000-now()+300));
   await waitState(s=>s.crazy.prompts[2]?.checkInReadyAt>0,7000);
   check((await card(2)).talk.crazy.prompt.checkIn===true);report.flags.autonomousCheckInProjection=true;
   const hereSource=await raw(),hereId='vnext-qa-'+ ++seq;
   const here={operation:'execute',capsule:hereSource.executor.capsule,token:seats[1].token,command:{id:hereId,type:'crazyHere',sessionId:hereSource.state.sessionId,promptId:p2.id,renderVersion:1}};
   await api(here);await api(here);current=await state();check(current.replies[2]?.error==='');check(current.crazy.prompts[2].expiresAt===p2.expiresAt);check(current.scores[2]===0);
   check((await card(2)).talk.crazy.prompt.checkIn===false);report.flags.exactOnceHereWithoutExtraTime=true;
   mark('waiting-for-real-150-second-expiry-after-check-in');await delay(Math.max(0,Math.max(p2.expiresAt,p3.expiresAt)-now()+1000));
   current=await waitState(s=>[2,3].every(n=>s.crazy.prompts[n]?.status==='expired'),12000);
   check(current.crazy.receivers[2].paused===false);check(current.crazy.receivers[3].paused===true);check(current.scores[2]===0&&current.scores[3]===0);report.flags.hereKeepsReceivingSilentPlayerPauses=true;
   await act(1,'crazyAssign',{target:2,text:'Ask your spoon for a raise.'});check((await card(2)).talk.crazy.prompt.text==='Ask your spoon for a raise.');
   await shown(2);await act(2,'crazySkip',{promptId:(await state()).crazy.prompts[2].id});
   const lateSource=await raw();await api({operation:'execute',capsule:lateSource.executor.capsule,token:seats[1].token,command:{id:'vnext-qa-'+ ++seq,type:'crazyHere',sessionId:lateSource.state.sessionId,promptId:p2.id,renderVersion:1}});
   check((await state()).replies[2]?.error==='stale_prompt');report.flags.nextTaskAndStaleHereFence=true;
   await act(0,'crazyDrain');const records=await store.readRoom(code);check(records.filter(r=>r.eventType==='checked_in'&&r.promptId===p2.id).length===1);
   check(records.some(r=>r.eventType==='check_in_available'&&r.promptId===p2.id));report.ok=true;mark('three-player-check-in-complete');return report;
  }
  check(list(current.crazy.directors).join(',')==='1,2');check((await card(3)).talk.crazy.canAssign===false);check(current.crazy.maxActive===3);report.flags.fiveSeatsTwoDirectorsThreeActors=true;
  if(diagnosticOnly){mark('waiting-for-first-autonomous-background-job');const before=(await raw()).executor.crazyWake?.id;await delay(55000);const after=await raw();check(after.executor.crazyWake?.id!==before);check(after.executor.crazyWake?.dueAt>=now()-5000);check(list(after.state.crazy.prompts).some(p=>p.status==='pending'));report.flags.autonomousFirstWake=true;report.ok=true;mark('background-probe-complete');return report}
  await act(3,'crazyAssign',{target:4,text:'Unauthorized actor card.'},'not_director');
  mark('waiting-for-system-card');await delay(5500);await pulse(1);current=await state();const actor=[3,4,5].find(n=>current.crazy.prompts[n]?.source==='system');check(!!actor);await shown(actor);
  mark('system-card-replacement-and-rest');const original=current.crazy.prompts[actor].id,writing='Insist your cup is royalty.';
  await act(1,'crazyAssign',{target:actor,text:writing});current=await state();check(current.crazy.offers?.[actor]?.promptId===original);check(current.crazy.prompts[actor].id===original);
  for(const n of [1,2,3,4,5])if(n!==actor)check(!JSON.stringify((await card(n)).talk).includes(writing));
  const offer=current.crazy.offers?.[actor];await act(actor,'crazyKeep',{offerId:offer.id,promptId:original});await pulse(2);check(!(await state()).crazy.offers?.[actor]);report.flags.privateReplacementChoice=true;
  // Another fresh system prompt is allowed to present this previously declined handwriting once.
  await act(actor,'crazyDone',{promptId:original});check((await state()).scores[actor]===1);
  const cooling=(await state()).crazy.receivers[actor].cooldownUntil;check(cooling>=now()+29000);report.flags.cooldownFromCompletion=true;
  await act(1,'crazyAssign',{target:actor,text:'Private unused spoon one.'});await act(1,'crazyAssign',{target:actor,text:'Private unused spoon two.'});
  await delay(Math.max(0,cooling-now()+500));await pulse(actor);current=await state();check(current.crazy.prompts[actor]?.text===writing);await shown(actor);const ttl=current.crazy.prompts[actor].expiresAt-current.crazy.prompts[actor].at;check(ttl===150000);report.flags.immediateAfterCooldown=true;
  const prompt=current.crazy.prompts[actor],deadline=current.gameDeadline;
  const beforeRelease=await raw();
  const restart=await http(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'release',capsule:beforeRelease.executor.capsule,token:control})});
  check(restart.status===409);check((await restart.json()).error==='missions_active');
  const retained=await raw();check(retained.executor.capsule===beforeRelease.executor.capsule);check(retained.state.crazy.prompts[actor].id===prompt.id);
  report.flags.activeMissionRestartGuard=true;
  mark('waiting-for-natural-round-decision');await delay(Math.max(0,deadline-now()+1200));current=await waitState(s=>s.crazy.roundStage==='decision',25000);check(current.crazy.prompts[actor].status==='pending');check((await card(2)).talk.crazy.hostActions.extend===false);report.flags.autonomousRoundDecision=true;
  await act(2,'crazyExtend',{seconds:180,hostAuthorized:true,actor:0},'not_available');await act(0,'crazyExtend',{seconds:180});
  await act(1,'crazyAssign',{text:'This must remain rejected.'},'queue_locked');current=await state();check(current.crazy.queueLocked===true);check(current.crazy.roundStage==='extension');report.flags.hostOnlyLockedExtension=true;
  mark('waiting-for-real-150-second-unanswered-task');await delay(Math.max(0,prompt.expiresAt-now()+1200));current=await waitState(s=>s.crazy.prompts[actor]?.status==='expired',25000);check(current.crazy.receivers[actor].paused===true);check(current.scores[actor]===1);report.flags.autonomous150SecondExpiryPause=true;
  await act(0,'crazyDrain');current=await state();if(list(current.crazy.prompts).some(p=>p.status==='pending')){for(const [n,p]of Object.entries(current.crazy.prompts))if(p.status==='pending')await act(Number(n),'crazySkip',{promptId:p.id})}
  check((await state()).crazy.roundStage==='sorting');const mine=(await card(1)).talk.crazy;check(list(mine.unusedCards).length===2);for(const v of list(mine.library))vaultIds.add(v.id);
  const saved=mine.unusedCards.find(v=>v.text==='Private unused spoon one.'),publicCard=mine.unusedCards.find(v=>v.text==='Private unused spoon two.');check(saved&&publicCard);
  await act(1,'crazySort',{saveIds:[saved.id]});await act(0,'crazyReveal');const shared=(await card(2)).talk.crazy.revealCards;
  check(shared.some(v=>v.text==='Private unused spoon two.'&&v.unused===true));check(!JSON.stringify(shared).includes('Private unused spoon one.'));check(shared.some(v=>v.text===writing&&v.status==='expired'));report.flags.privateVaultAndConsentedReveal=true;
  await act(1,'crazyLibraryUpdate',{cardId:saved.id,text:'Ask your spoon for a raise.'});
  await act(0,'newTopic',{confirm:true,topic:{question:'Invent a silly school.'},mode:'think',seconds:45,showStarters:false,gameMode:'crazy',crazySource:'players',conversationMode:'free',gameSeconds:900,crazyTaskSeconds:150});
  check(list((await card(1)).talk.crazy.library).some(v=>v.id===saved.id&&v.text==='Ask your spoon for a raise.'));check(!list((await card(2)).talk.crazy.library).length);await pulse(2);await pulse(4);await act(0,'start');await act(1,'crazyLibrarySend',{cardId:saved.id,target:4});
  current=await state();check(current.crazy.prompts[4]?.text==='Ask your spoon for a raise.');check(!JSON.stringify((await card(3)).talk).includes('Ask your spoon for a raise.'));await shown(4);await act(4,'crazySkip',{promptId:current.crazy.prompts[4].id});
  await act(1,'crazyLibraryDelete',{cardId:saved.id});check(!list((await card(1)).talk.crazy.library).some(v=>v.id===saved.id));report.flags.crossSessionEditResendDelete=true;
  await act(0,'crazyDrain');current=await state();for(const identity of Object.values(current.crazyIdentities||{}))ownerIds.add(identity);
  const records=await store.readRoom(code);check(records.some(r=>r.category==='event'&&r.source==='system'));check(records.some(r=>r.category==='event'&&r.eventType==='rendered'));check(records.some(r=>r.category==='vault'&&r.status==='deleted'));check(records.some(r=>!r.category&&r.status==='expired'));
  check(!JSON.stringify((await snapshot(archive)).value).includes('Private unused spoon'));report.flags.encryptedSystemAndPlayerDiagnostics=true;
  report.ok=true;mark('complete');
 }catch(error){onFailure(error);report.error='smoke_failed';try{const diagnostic=await raw(),w=diagnostic?.executor?.crazyWake;report.diagnostic={phase:diagnostic?.state?.phase,stage:diagnostic?.state?.crazy?.roundStage,now:now(),deadline:diagnostic?.state?.gameDeadline,wake:w?{dueAt:w.dueAt,leaseUntil:w.leaseUntil,claimUntil:w.claimUntil}:null,wakeLog:diagnostic?.executor?.crazyWakeLog||[]}}catch{}}finally{
  // Recover owned vault identifiers for safe cleanup even after an earlier failed check.
  try { const owned=await raw();if(owned?.qaVNext?.marker===marker&&ownSession(owned.state?.sessionId)) {for(const identity of Object.values(owned.state.crazyIdentities||{}))ownerIds.add(identity);for(const vault of Object.values(owned.state.crazyVault||{}))for(const entry of Object.values(vault||{}))if(entry?.id)vaultIds.add(entry.id)} }catch{}
  // Delete only the exact known nodes, using current ETags and ownership proof.
  for(const path of created)try{const old=await snapshot(path);if(old.value==null)continue;if(path===archive){const records=await store.readRoom(code);check(records.every(r=>r.category==='vault'?ownerIds.has(r.ownerIdentity)&&vaultIds.has(r.cardId):ownSession(r.sessionId)))}else{check(old.value.qaVNext?.marker===marker);const n=path===node(0)?0:seats.find(p=>path===node(p.playerNum))?.playerNum;check(n!=null);check(ownSession(n===0?old.value.state?.sessionId:old.value.talk?.sessionId))}await put(path,null,old.etag);report.cleaned++}catch{report.cleanupFailed++}
  if(report.cleanupFailed)report.ok=false;
 }
 return report;
}
module.exports={run};if(require.main===module)run({progress:step=>process.stdout.write(JSON.stringify(step)+'\n')}).then(r=>{process.stdout.write(JSON.stringify(r)+'\n');if(!r.ok)process.exitCode=1}).catch(()=>{process.stdout.write('{"ok":false,"error":"smoke_failed"}\n');process.exitCode=1});
