// Real sealed service and game adapters over disposable REST/ETag nodes.
// Tests never use live Firebase, user rooms, environment secrets or credentials.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createExecutor,unseal,keyFrom}=require('../runtime/hub-executor-core.cjs');
const party=require('../runtime/party-executor.cjs').adapters;
const story=require('../runtime/story-executor.cjs').adapters;
const engines={cut:require('../cut-engine.js'),openmic:require('../open-mic-engine.js'),dixit:require('../dixit-engine.js'),onceupon:require('../once-upon-a-time-engine.js'),letstalk:require('../talk-engine.js')};
const fields={cut:'cut',openmic:'openmic',dixit:'dixit',onceupon:'once',letstalk:'talk'};
const SECRET='71'.repeat(32),clone=value=>value==null?null:structuredClone(value);
class Storage{
 constructor(){this.nodes=new Map();this.versions=new Map();this.writes=[];this.beforePut=null;this.afterPut=null;this.failWrites=new Set();this.dropEtags=false;this.conflicts=0;}
 get(path){return clone(this.nodes.get(path));}
 set(path,value){this.nodes.set(path,clone(value));this.versions.set(path,(this.versions.get(path)||0)+1);}
 async fetch(url,input={}){const path=new URL(url).pathname.slice(1).replace(/\.json$/,''),etag='"'+(this.versions.get(path)||0)+'"';
  if(!input.method||input.method==='GET')return new Response(JSON.stringify(this.get(path)),{headers:this.dropEtags?{}:{etag}});
  assert.equal(input.method,'PUT');assert.ok(new Headers(input.headers).get('if-match'),'every membership write is conditional');
  if(this.failWrites.has(path))return new Response('null',{status:503});
  const value=JSON.parse(input.body);if(this.beforePut)await this.beforePut(path,value);
  if(new Headers(input.headers).get('if-match')!=='"'+(this.versions.get(path)||0)+'"'){this.conflicts++;return new Response('null',{status:412});}
  this.set(path,value);this.writes.push({path,value:clone(value)});if(this.afterPut)await this.afterPut(path,value);return new Response(JSON.stringify(value));
 }
}
async function fixture(game='cut'){
 const db=new Storage(),engine=engines[game],adapter={...party,...story}[game],code='MEMB234',controlToken='a'.repeat(32),tokens=[1,2,3,4,5,6,7,8,9].map(n=>String(n).repeat(32));
 const seats=tokens.slice(0,3).map((token,i)=>({playerNum:i+1,token})),path=n=>`rooms/${code}/players/${tokens[n-1]}`,canonicalPath=`rooms/${code}/players/${controlToken}`;
 let time=1000,sequence=0;
 const original=engine.create({id:'membership-'+game,roster:seats.map(s=>({playerNum:s.playerNum,name:'Person '+s.playerNum})),now:time,seed:359,topic:{id:'topic',question:'What would you make?',followUps:['Who joins?']}});
 db.set(canonicalPath,{stateJson:JSON.stringify(original),revision:1});for(const seat of seats)db.set(path(seat.playerNum),engine.view(original,seat.playerNum,time));
 const service=createExecutor({secret:SECRET,databaseURL:'http://localhost',fetchImpl:db.fetch.bind(db),now:()=>time,games:{...party,...story}});
 const registered=await service.register({game,code,controlToken,seats});
 const state=()=>adapter.decode(db.get(canonicalPath)),capsule=()=>db.get(canonicalPath).executor.capsule;
 const roster=count=>tokens.slice(0,count).map((originalToken,i)=>({playerNum:i+1,originalToken,name:'Person '+(i+1)}));
 const addSource=n=>db.set(path(n),{game:'scene',playerNum:n,name:'Person '+n,round:77});
 const update=(count,extra={})=>service.updateRoster({capsule:capsule(),token:controlToken,commandId:'membership-'+(++sequence),roster:roster(count),...extra});
 const setParticipant=(actor,playerNum,active,extra={})=>service.setParticipant({capsule:capsule(),token:actor===0?controlToken:tokens[actor-1],commandId:'participation-'+(++sequence),playerNum,active,...extra});
 const command=(actor,type,extra={},cap=capsule())=>service.execute({capsule:cap,token:actor===0?controlToken:tokens[actor-1],command:{id:'command-'+(++sequence),type,sessionId:state().sessionId,turnId:state().turnId,...extra}});
 return{game,db,service,adapter,code,controlToken,tokens,seats,path,canonicalPath,registered,state,capsule,roster,addSource,update,setParticipant,command,now:()=>time,advance:n=>{time=n;}};
}

test('all five numeric-seat adapters admit a new exact Hub card without replacing session, scores or existing hands',async()=>{
 for(const game of Object.keys(engines)){
  const f=await fixture(game),before=f.state(),oldCapsule=f.capsule();
  f.addSource(4);const result=await f.update(4,{hubCount:4});
  assert.equal(result.ok,true);assert.notEqual(result.capsule,oldCapsule);assert.equal(f.state().sessionId,before.sessionId);assert.equal(f.state().roster.length,4);
  assert.deepEqual(f.state().scores&&Object.fromEntries(Object.entries(f.state().scores).filter(([n])=>Number(n)<=3)),before.scores);
  for(let n=1;n<=3;n++){if(before.hands||f.state().hands)assert.deepEqual(f.state().hands?.[n]||[],before.hands?.[n]||[]);assert.equal(f.db.get(f.path(n)).hubExecutor.capsule,result.capsule);}
  assert.equal(f.db.get(f.path(4)).hubExecutor.capsule,result.capsule);
  assert.equal(unseal(result.capsule,keyFrom(SECRET)).seats[3].token,f.tokens[3]);
  const publicText=JSON.stringify(result.payload);assert.ok(!publicText.includes(f.controlToken));for(const token of f.tokens)assert.ok(!publicText.includes(token));
 }
});

test('old retained private tickets continue commands after append while old capsules cannot authorize a newcomer or another roster change',async()=>{
 const f=await fixture('openmic'),old=f.capsule();f.addSource(4);await f.update(4);
 await f.command(2,'success',{},old);assert.equal(f.state().teamScore,2);
 await assert.rejects(f.service.execute({capsule:old,token:f.tokens[3]}),{code:'wrong_player'});
 f.addSource(5);await assert.rejects(f.service.updateRoster({capsule:old,token:f.controlToken,commandId:'stale-manager-add',roster:f.roster(5)}),{code:'stale_session'});
 await f.command(4,'next');assert.equal(f.state().spotlight,2);
});

test('only the manager changes the Hub roster and exact old originals cannot be replaced or reordered',async()=>{
 const f=await fixture();f.addSource(4);const body={capsule:f.capsule(),token:f.tokens[1],commandId:'unauthorized',roster:f.roster(4)};
 await assert.rejects(f.service.updateRoster(body),{code:'host_only'});
 for(const roster of [f.roster(2),[{...f.roster(4)[1],playerNum:1},{...f.roster(4)[0],playerNum:2},...f.roster(4).slice(2)],f.roster(4).map((row,i)=>i===0?{...row,originalToken:'f'.repeat(32)}:row)]){
  await assert.rejects(f.service.updateRoster({...body,token:f.controlToken,roster}),{code:'invalid_roster'});
 }
 assert.equal(f.state().roster.length,3);
});

test('a repeated admission command resumes projections exactly once; conflicting content is rejected',async()=>{
 const f=await fixture('openmic');f.addSource(4);const old=f.capsule(),body={capsule:old,token:f.controlToken,commandId:'retry-same-admission',roster:f.roster(4)};
 f.db.failWrites.add(f.path(4));await assert.rejects(f.service.updateRoster(body),{code:'storage_unavailable'});
 assert.equal(f.state().roster.length,4);const committed=f.capsule(),revision=f.db.get(f.canonicalPath).executor.membershipRevision;
 f.db.failWrites.clear();const repaired=await f.service.updateRoster(body);assert.equal(repaired.capsule,committed);assert.equal(f.state().roster.length,4);assert.equal(f.db.get(f.canonicalPath).executor.membershipRevision,revision);
 assert.equal(f.db.get(f.path(4)).hubExecutor.capsule,committed);
 await assert.rejects(f.service.updateRoster({...body,roster:f.roster(4).map((row,i)=>i===3?{...row,name:'Changed content'}:row)}),{code:'command_conflict'});
});

test('an active card can mark leavers away; moved inactive cards neither block nor get overwritten, and cannot rejoin',async()=>{
 const f=await fixture('openmic');await f.command(2,'success');const score=f.state().teamScore;
 const result=await f.setParticipant(2,3,false);assert.deepEqual(result.inactiveNums,[3]);assert.equal(f.state().roster[2].active,false);assert.equal(f.state().teamScore,score);
 const foreign={game:'scene',playerNum:3,round:90};f.db.set(f.path(3),foreign);
 await f.command(1,'next');assert.equal(f.state().spotlight,2);assert.deepEqual(f.db.get(f.path(3)),foreign);
 await assert.rejects(f.setParticipant(3,1,false),{code:'not_eligible'});
 await assert.rejects(f.setParticipant(3,3,true),{code:'game_switched'});
 await assert.rejects(f.command(3,'success'),{code:'not_eligible'});
});

test('the same private card can explicitly rejoin itself, preserves earned score and cannot manipulate others while away',async()=>{
 const f=await fixture('openmic'),cap=f.capsule();await f.command(2,'success');await f.setParticipant(1,2,false);
 await assert.rejects(f.setParticipant(2,3,false),{code:'not_eligible'});
 await f.setParticipant(2,2,true);assert.equal(f.state().roster[1].active,true);assert.equal(f.state().teamScore,2);assert.equal(f.capsule(),cap);
});

test('Hub count changes preserve manual away and restore only previously omitted suffix seats',async()=>{
 const f=await fixture('openmic');f.addSource(4);await f.update(4,{hubCount:4});await f.setParticipant(1,2,false);
 await f.update(4,{hubCount:3});assert.deepEqual(f.state().roster.map(p=>p.active),[true,false,true,false]);
 await f.update(4,{hubCount:4});assert.deepEqual(f.state().roster.map(p=>p.active),[true,false,true,true]);
 assert.deepEqual(f.db.get(f.canonicalPath).executor.hubRemovedNums,[]);
});

test('a new card switching games after membership commit always wins its node and produces a retryable failure',async()=>{
 const f=await fixture(),foreign={game:'scene',playerNum:4,round:200};f.addSource(4);let switched=false;
 f.db.afterPut=path=>{if(path===f.canonicalPath&&!switched){switched=true;f.db.set(f.path(4),foreign);}};
 await assert.rejects(f.update(4),{code:'game_switched'});assert.equal(switched,true);assert.deepEqual(f.db.get(f.path(4)),foreign);
});

test('overlapping canonical state updates are retried without losing score or admitting a seat twice',async()=>{
 const f=await fixture('openmic');f.addSource(4);let collided=false;
 f.db.beforePut=(path,next)=>{if(path===f.canonicalPath&&!collided&&next.executor?.membershipRevision){collided=true;const current=f.db.get(path),s=f.adapter.decode(current);s.teamScore=7;f.db.set(path,f.adapter.encode(current,s));}};
 await f.update(4);assert.equal(collided,true);assert.ok(f.db.conflicts>0);assert.equal(f.state().teamScore,7);assert.equal(f.state().roster.length,4);
});

test('session restart retires all membership lineage; old-round capsules cannot command a new game',async()=>{
 const f=await fixture('dixit'),old=f.capsule();f.addSource(4);await f.update(4);const membership=f.capsule();
 await f.command(1,'restart');assert.notEqual(f.capsule(),membership);
 assert.equal(f.db.get(f.canonicalPath).executor.membershipCapsules,undefined);
 await assert.rejects(f.service.execute({capsule:old,token:f.tokens[1]}),{code:'stale_session'});
 await assert.rejects(f.command(2,'deal',{},membership),{code:'stale_session'});
});

test('wrong original ordinals, excessive game rosters and absent ETags fail before unsafe writes',async()=>{
 const f=await fixture('onceupon');f.db.set(f.path(4),{game:'scene',playerNum:2});await assert.rejects(f.update(4),{code:'original_cards_required'});
 await assert.rejects(f.update(7),{code:'invalid_roster'});
 f.addSource(4);const before=f.db.writes.length;f.db.dropEtags=true;await assert.rejects(f.update(4),{code:'unsafe_storage'});assert.equal(f.db.writes.length,before);
});

test('a freshly created Hub slot with no remote node is admitted with an exact null baseline',async()=>{
 const f=await fixture('openmic');assert.equal(f.db.get(f.path(4)),null);const result=await f.update(4);assert.equal(result.ok,true);assert.equal(f.db.get(f.path(4)).openmic.roster.length,4);
});

async function bluffFixture(){
 const E=require('../bluff-king-engine.js'),adapter=require('../runtime/bluff-executor.cjs').adapters.bluffking,topics=require('../bluff-king-topics.js');
 const db=new Storage(),code='MEMBLUFF',controlToken='a'.repeat(64),hostId='f'.repeat(40),state=E.blankStore(),tokens=[1,2,3,4,5].map(n=>String(n).repeat(20));let serial=0,sequence=0;
 const opts={now:1000,rng:()=>0,uuid:()=> 'bluff-member-'+(++serial)};
 E.applyCommand(state,hostId,{room:code,action:'create',name:'Manager',participate:false},topics,opts);
 const seats=[],members={[hostId]:{token:controlToken,historyToken:'e'.repeat(64)}},cardRoster=[];
 for(let n=1;n<=3;n++){const identityId=String(n).repeat(40),token=String(n).repeat(64),historyToken=String(n+4).repeat(64);
  E.applyCommand(state,identityId,{room:code,action:'join',name:'Person '+n,participate:true},topics,opts);
  seats.push({playerNum:n,token,path:`rooms/bluffking-${code}/players/${token}`});members[identityId]={token,historyToken};cardRoster.push({playerNum:n,originalToken:tokens[n-1],name:'Person '+n,identityId,token,historyToken});
 }
 state.transport={members,cardRoster,accepted:{},acknowledgements:{},executorSessionId:'membership-bluff',publicationRevision:0};adapter.pulse(state,{...opts,code,seats,onlineNums:[1,2,3]});
 const canonicalPath=`rooms/bluffking-${code}/players/${controlToken}`,path=n=>`rooms/${code}/players/${tokens[n-1]}`;
 db.set(canonicalPath,{data:JSON.stringify(state),revision:1});
 for(const row of cardRoster){db.set(path(row.playerNum),{game:'bluffking',playerNum:row.playerNum,name:row.name,bluff:{version:2,room:code,token:row.token,identityId:row.identityId,historyToken:row.historyToken}});db.set(seats[row.playerNum-1].path,adapter.project(state,seats[row.playerNum-1],{...opts,code,seats,onlineNums:[1,2,3]}));}
 const service=createExecutor({secret:SECRET,databaseURL:'http://localhost',fetchImpl:db.fetch.bind(db),now:()=>1000,games:{bluffking:adapter}}),registered=await service.register({game:'bluffking',code,controlToken,seats});
 const getState=()=>adapter.decode(db.get(canonicalPath)),capsule=()=>db.get(canonicalPath).executor.capsule,roster=count=>tokens.slice(0,count).map((originalToken,i)=>({playerNum:i+1,originalToken,name:'Person '+(i+1)}));
 const card=n=>{const row=getState().transport.cardRoster[n-1];return db.get(`rooms/bluffking-${code}/players/${row.token}`);};
 const command=(n,action,extra={},cap=capsule())=>{const current=getState(),room=current.rooms[code],token=n===0?controlToken:current.transport.cardRoster[n-1].token;return service.execute({capsule:cap,token,command:{action,commandId:'bluff-action-'+(++sequence),expectedVersion:room.version,roundId:room.round?.id,...extra}});};
 const update=(count,extra={})=>service.updateRoster({capsule:capsule(),token:controlToken,commandId:'bluff-roster-'+(++sequence),roster:roster(count),...extra});
 const setParticipant=(n,playerNum,active)=>service.setParticipant({capsule:capsule(),token:n===0?controlToken:getState().transport.cardRoster[n-1].token,commandId:'bluff-participation-'+(++sequence),playerNum,active});
 return{db,code,controlToken,seats,tokens,path,canonicalPath,service,registered,state:getState,capsule,roster,card,command,update,setParticipant};
}

test('Bluff admission creates only its own private capability, preserves an active round and freezes newcomer until next boundary',async()=>{
 const f=await bluffFixture();await f.command(0,'start');await f.command(0,'confirmTopic');await f.command(0,'beginDiscussion');
 const before=f.state(),old=f.capsule(),roomBefore=before.rooms[f.code];const result=await f.update(4,{hubCount:4});
 assert.equal(result.ok,true);assert.notEqual(result.capsule,old);assert.equal(f.state().transport.executorSessionId,before.transport.executorSessionId);
 assert.equal(f.state().rooms[f.code].round.id,roomBefore.round.id);assert.deepEqual(f.state().rooms[f.code].round.playerIds,roomBefore.round.playerIds);
 const entry=f.state().transport.cardRoster[3],original=f.db.get(f.path(4));assert.equal(original.game,'bluffking');assert.equal(original.bluff.token,entry.token);assert.notEqual(entry.token,f.tokens[3]);
 assert.equal(f.card(4).hubExecutor.capsule,result.capsule);const view=JSON.parse(f.card(4).viewJson);assert.equal(view.players.find(p=>p.playerNum===4).pending,true);assert.equal(view.privateCard,null);
 const publicText=JSON.stringify(result.payload);for(const row of f.state().transport.cardRoster){assert.ok(!publicText.includes(row.token));assert.ok(!publicText.includes(row.historyToken));assert.ok(!publicText.includes(row.identityId));}
 const token=f.state().transport.cardRoster[1].token;await f.service.execute({capsule:old,token});
 await assert.rejects(f.service.execute({capsule:old,token:entry.token}),{code:'wrong_player'});
 await assert.rejects(f.command(4,'ready'),{code:'not_eligible'});
});

test('Bluff a moved source can be marked away without blocking its table; returning it requires the exact original binding',async()=>{
 const f=await bluffFixture(),foreign={game:'scene',playerNum:3,round:55};f.db.set(f.path(3),foreign);
 await f.setParticipant(1,3,false);assert.equal(f.state().rooms[f.code].members.find(p=>p.playerNum===3).active,false);
 await f.command(1,'start');assert.equal(f.state().rooms[f.code].phase,'lobby','two active players retain lobby rather than reset');
 await assert.rejects(f.setParticipant(3,3,true),{code:'game_switched'});assert.deepEqual(f.db.get(f.path(3)),foreign);
 const row=f.state().transport.cardRoster[2];f.db.set(f.path(3),{game:'bluffking',playerNum:3,bluff:{version:2,room:f.code,token:row.token,identityId:row.identityId,historyToken:row.historyToken}});
 await f.setParticipant(3,3,true);assert.equal(f.state().rooms[f.code].members.find(p=>p.playerNum===3).active,true);
});

test('an original Bluff card changing during admission wins against the exact null source baseline',async()=>{
 const f=await bluffFixture(),foreign={game:'cut',playerNum:4,cut:{sessionId:'another-game'}},before=f.capsule();let changed=false;
 f.db.afterPut=(path,node)=>{if(path===f.canonicalPath&&!changed&&node.executor.capsule!==before){changed=true;f.db.set(f.path(4),foreign);}};
 await assert.rejects(f.update(4),{code:'game_switched'});assert.equal(changed,true);assert.deepEqual(f.db.get(f.path(4)),foreign);
});

test('Hub omission can deactivate a moved source; restoring it refuses ownership before committing',async()=>{
 const f=await fixture('openmic');f.addSource(4);await f.update(4,{hubCount:4});const foreign={game:'scene',playerNum:4,round:66};f.db.set(f.path(4),foreign);
 await f.update(4,{hubCount:3});assert.equal(f.state().roster[3].active,false);const before=f.db.get(f.canonicalPath);
 await assert.rejects(f.update(4,{hubCount:4}),{code:'game_switched'});assert.deepEqual(f.db.get(f.canonicalPath),before);assert.deepEqual(f.db.get(f.path(4)),foreign);
});

test('a player execute racing member growth reloads the latest seats and retains exactly one command score',async()=>{
 const f=await fixture('openmic'),old=f.capsule();let changed=false;const originalFetch=f.db.fetch.bind(f.db);
 f.db.fetch=originalFetch; // executor holds this same mutable Storage instance.
 f.db.beforePut=async(path,next)=>{if(path===f.canonicalPath&&!changed&&next.executor?.presence?.[2]&&next.executor.capsule===old){changed=true;f.db.beforePut=null;f.addSource(4);await f.update(4);}};
 await f.command(2,'success',{},old);assert.equal(changed,true);assert.equal(f.state().roster.length,4);assert.equal(f.state().teamScore,2);assert.equal(f.db.get(f.path(4)).hubExecutor.capsule,f.capsule());
});


test('a second append repairs retained nodes still carrying an earlier membership capsule after a failed first publication',async()=>{
 const f=await fixture('openmic'),base=f.capsule();f.addSource(4);f.db.failWrites.add(f.path(1));await assert.rejects(f.update(4),{code:'storage_unavailable'});
 assert.equal(f.db.get(f.path(1)).hubExecutor.capsule,base);f.db.failWrites.clear();f.addSource(5);const second=await f.update(5);
 assert.equal(f.state().roster.length,5);for(let n=1;n<=5;n++)assert.equal(f.db.get(f.path(n)).hubExecutor.capsule,second.capsule);
 await f.command(2,'success',{},base);assert.equal(f.state().teamScore,2);
});


test('legacy execute exclude cannot reactivate a foreign inactive card, for self, active peers or host',async()=>{
 for(const game of ['cut','openmic','letstalk']){
  const f=await fixture(game);await f.setParticipant(1,3,false);const foreign={game:'scene',playerNum:3,round:99};f.db.set(f.path(3),foreign);
  for(const actor of [3,1,0]){const before=f.db.get(f.canonicalPath);await assert.rejects(f.command(actor,'exclude',{playerNum:3,active:true}),{code:'game_switched'});assert.deepEqual(f.db.get(f.canonicalPath),before);assert.deepEqual(f.db.get(f.path(3)),foreign);}
 }
});

test('legacy offline recovery cannot restore a moved runtime-offline source',async()=>{
 const f=await fixture('openmic');const current=f.db.get(f.canonicalPath),s=f.adapter.decode(current);s.roster[2].active=false;s.runtimeOfflineNums=[3];f.db.set(f.canonicalPath,f.adapter.encode(current,s));
 await f.service.execute({capsule:f.capsule(),token:f.tokens[2]});const foreign={game:'scene',playerNum:3,round:100};f.db.set(f.path(3),foreign);const before=f.db.get(f.canonicalPath);
 await assert.rejects(f.command(1,'recover'),{code:'game_switched'});assert.deepEqual(f.db.get(f.canonicalPath),before);assert.deepEqual(f.db.get(f.path(3)),foreign);
});
