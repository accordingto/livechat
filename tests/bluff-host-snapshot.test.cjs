// Public manager snapshots over exact synthetic source/private paths only.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const E=require('../bluff-king-engine.js'),A=require('../runtime/bluff-executor.cjs').adapters.bluffking;
const copy=value=>value==null?null:structuredClone(value);
const bank=Array.from({length:12},(_,i)=>({id:'snapshot-topic-'+i,canonicalKnowledgeId:'snapshot-knowledge-'+i,locale:'en',term:'Topic '+i,publicPrompt:'What is this?',hintMode:'none',publicHints:[],secretAnswer:'PRIVATE_SNAPSHOT_ANSWER_'+i,supportingFacts:['Private supporting fact'],revealExplanation:'Test explanation',sources:[{title:'Test',url:'https://example.invalid/test'}],verificationStatus:'verified',enabled:true}));
function fixture(phase='prepare',now=100000){
 const storage=new Map(),storageWrites=[],reads=[],code='SNAP01',hostId='f'.repeat(40),state=E.blankStore();let serial=0;
 const options={now,rng:()=>0,uuid:()=>('snapshot-member-'+(++serial))};
 E.applyCommand(state,hostId,{room:code,action:'create',name:'Host',participate:false},bank,options);
 const entries=[],members={[hostId]:{token:'e'.repeat(64),historyToken:'a'.repeat(64)}};
 for(let i=1;i<=3;i++){
  const entry={originalToken:String(i).repeat(20),token:String(i).repeat(64),identityId:String(i).repeat(40),historyToken:String(i+6).repeat(64)};
  E.applyCommand(state,entry.identityId,{room:code,action:'join',name:'Player '+i,participate:true},bank,options);
  entries.push(entry);members[entry.identityId]={token:entry.token,historyToken:entry.historyToken};
 }
 state.transport={members,cardRoster:entries,executorSessionId:'snapshot-service-session',publicationRevision:7,acknowledgements:{},privateKey:{d:'PRIVATE_SNAPSHOT_CANONICAL_KEY'}};
 state.rooms[code].sharedControls=true;
 let command=0;
 const act=(action,actor=hostId,payload={})=>E.applyCommand(state,actor,{room:code,action,commandId:'snapshot-command-'+(++command),expectedVersion:state.rooms[code].version,roundId:state.rooms[code].round?.id,...payload},bank,options);
 if(phase!=='lobby')act('start');if(['prepare','discussion','reveal','results'].includes(phase))act('confirmTopic');if(['discussion','reveal','results'].includes(phase))act('beginDiscussion');
 if(['reveal','results'].includes(phase)){act('nextSpotlight',entries[0].identityId);act('nextSpotlight',entries[0].identityId);act('identify',entries[0].identityId,{targetId:state.rooms[code].round.truthfulId});if(phase==='results')state.rooms[code].phase='results';}
 const executor={v:1,game:'bluffking',capsule:'snapshot-current-sealed-epoch',epoch:'snapshot-epoch',sessionId:state.transport.executorSessionId,createdAt:now-1000,presence:{1:now,2:now,3:now},lastPublicationRevision:7};
 const values=new Map(),sourcePath=entry=>'rooms/'+code+'/players/'+entry.originalToken,privatePath=entry=>'rooms/bluffking-'+code+'/players/'+entry.token;
 for(const entry of entries){
  const member=state.rooms[code].members.find(p=>p.identityId===entry.identityId);
  values.set(sourcePath(entry),{game:'bluffking',bluff:{version:2,room:code,token:entry.token,identityId:entry.identityId,historyToken:entry.historyToken}});
  values.set(privatePath(entry),{hubExecutor:{v:1,game:'bluffking',capsule:executor.capsule,sessionId:executor.sessionId,revision:7},sessionBinding:{room:code,identityId:entry.identityId,historyToken:entry.historyToken},viewJson:JSON.stringify(E.projectView(state,entry.identityId,code,bank,{private:true,now})),publicationRevision:7});
  assert.ok(member);
 }
 const raw={owner:'server',executor,data:JSON.stringify(state),revision:7};
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{storageWrites.push(k);storage.set(k,String(v));},removeItem:k=>{storageWrites.push(k);storage.delete(k);}};
 const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,structuredClone,AbortSignal,btoa,atob,Uint8Array,Promise,Date:class extends Date{static now(){return now;}},BLUFF_ENGINE:E,BLUFF_QUESTIONS:bank,localStorage,setTimeout,clearTimeout,fetch(){throw new Error('no external RPC permitted');}});
 vm.runInContext(fs.readFileSync(require.resolve('../bluff-king-sync.js'),'utf8'),context);
 const client=new context.BLUFF_SYNC.Client({databaseURL:'https://test.firebaseio.com',storage:localStorage,hostPresentation:true});
 client.identity={id:hostId,historyToken:members[hostId].historyToken,history:{known:{},seen:{}},rooms:{}};client.code=code;client.hostToken='0'.repeat(64);client.isHost=true;
 client._request=async(path,options={})=>{assert.equal(options.method||'GET','GET');const node=path.replace(/^\//,'');assert.ok(values.has(node),'snapshot reads only exact original/private capabilities');reads.push(node);return {data:copy(values.get(node))};};
 storageWrites.length=0;
 const save=()=>{raw.data=JSON.stringify(state);};
 return {client,context,state,raw,executor,entries,values,reads,storageWrites,code,hostId,now,act,save,sourcePath,privatePath};
}
test('published host snapshots read all source/private cards in one wave and never mutate canonical, histories or storage',async()=>{
 const f=fixture(),pending=[],before=copy(f.raw),cards=copy([...f.values.entries()]);
 f.client._request=path=>new Promise(resolve=>{const node=path.slice(1);assert.ok(f.values.has(node));f.reads.push(node);pending.push({node,resolve});});
 const task=f.client._readHostSnapshot(f.raw);
 assert.equal(pending.length,6,'all source and private reads start before any one request completes');
 for(const request of pending)request.resolve({data:copy(f.values.get(request.node))});
 const view=await task;assert.equal(view.phase,'prepare');assert.equal(view.self.isHost,true);assert.equal(view.sharedControls,true);assert.equal(view.privateCard,null);
 assert.deepEqual(f.raw,before);assert.deepEqual([...f.values.entries()],cards);assert.deepEqual(f.storageWrites,[]);
 assert.equal(new Set(f.reads).size,6);
});
test('public snapshots match runtime host projection through every game stage and keep private roles out until the public reveal',async()=>{
 for(const phase of ['lobby','topic_check','prepare','discussion','reveal','results']){
  const f=fixture(phase),view=await f.client._readHostSnapshot(f.raw),state=copy(JSON.parse(f.raw.data));
  const ctx={code:f.code,now:f.now,bank,seats:f.entries.map((entry,i)=>({playerNum:i+1,token:entry.token})),onlineNums:[1,2,3]};
  const expected=JSON.parse(A.project(state,{playerNum:0},ctx).viewJson);assert.deepEqual(copy(view),expected);
  const serialized=JSON.stringify(view);assert.equal(view.privateCard,null);assert.doesNotMatch(serialized,/privateKey|PRIVATE_SNAPSHOT_CANONICAL_KEY|identityId|historyToken/);
  for(const binding of Object.values(f.state.transport.members))for(const token of [binding.token,binding.historyToken])assert.ok(!serialized.includes(token));
  if(!['reveal','results'].includes(phase))assert.doesNotMatch(serialized,/PRIVATE_SNAPSHOT_ANSWER_|supportingFacts|truthfulId|"role"/);
  else assert.match(serialized,/PRIVATE_SNAPSHOT_ANSWER_/,'already revealed answers remain intentionally public');
 }
});
test('a seated Truth Teller transferred to host still gets only a public manager view',async()=>{
 const f=fixture(),truth=f.state.rooms[f.code].members.find(member=>member.id===f.state.rooms[f.code].round.truthfulId);
 f.state.rooms[f.code].hostIdentityId=truth.identityId;f.client.identity.id=truth.identityId;f.save();
 const view=await f.client._readHostSnapshot(f.raw);assert.equal(view.self.isHost,true);assert.equal(view.self.isFormal,true);assert.equal(view.privateCard,null);
 assert.doesNotMatch(JSON.stringify(view),/PRIVATE_SNAPSHOT_ANSWER_|supportingFacts|truthfulId|"role"/);
});
test('same-epoch private phase and revision lag does not block displaying the newly committed canonical phase',async()=>{
 const f=fixture('topic_check');f.act('confirmTopic');f.state.transport.publicationRevision=8;f.raw.revision=8;f.executor.lastPublicationRevision=8;f.save();
 for(const entry of f.entries)assert.equal(JSON.parse(f.values.get(f.privatePath(entry)).viewJson).phase,'topic_check');
 const view=await f.client._readHostSnapshot(f.raw);assert.equal(view.phase,'prepare');assert.equal(view.version,f.state.rooms[f.code].version);assert.equal(view.privateCard,null);
});
test('missing, wrong-epoch or legacy private projections defer to guarded service repair rather than proving a ready table',async()=>{
 for(const change of ['missing','capsule','game','session','ticket-version','binding-room','binding-identity','binding-history','legacy-view','view-room','view-seat','bad-view']){
  const f=fixture(),path=f.privatePath(f.entries[1]),node=f.values.get(path);
  if(change==='missing')f.values.set(path,null);
  else if(change==='capsule')node.hubExecutor.capsule='old-sealed-epoch';
  else if(change==='game')node.hubExecutor.game='dixit';else if(change==='session')node.hubExecutor.sessionId='old-session';else if(change==='ticket-version')node.hubExecutor.v=0;
  else if(change.startsWith('binding-'))node.sessionBinding[{'binding-room':'room','binding-identity':'identityId','binding-history':'historyToken'}[change]]='different-binding';
  else if(change==='bad-view')node.viewJson='malformed view';
  else {const view=JSON.parse(node.viewJson);if(change==='legacy-view')view.sharedControls=false;else if(change==='view-room')view.room='OTHER';else view.self.playerId='another-seat';node.viewJson=JSON.stringify(view);}
  assert.equal(await f.client._readHostSnapshot(f.raw),null,change);assert.deepEqual(f.storageWrites,[]);
 }
});
test('the canonical publication marker alone cannot bless an epoch whose private cards still have an old capsule',async()=>{
 const f=fixture();f.executor.capsule='newly-sealed-partial-epoch';f.executor.epoch='new-partial-epoch';f.executor.lastPublicationRevision=f.raw.revision;
 assert.equal(await f.client._readHostSnapshot(f.raw),null);
});
test('every current source binding is required even when all private cards are ready',async()=>{
 for(const field of ['game','version','room','token','identityId','historyToken','missing']){
  const f=fixture(),path=f.sourcePath(f.entries[2]),node=f.values.get(path);
  if(field==='missing')f.values.set(path,null);else if(field==='game')node.game='cut';else node.bluff[field]=field==='version'?1:'newer-original-binding';
  await assert.rejects(f.client._readHostSnapshot(f.raw),{code:'game_switched'});assert.deepEqual(f.storageWrites,[]);
 }
});
test('invalid host identity, metadata or canonical roster fails before reading any private capability',async()=>{
 for(const change of ['identity','unowned','presentation','owner','game','capsule','epoch','session','created','source-token','private-token','identity-token','history-token','duplicate-source','member-binding']){
  const f=fixture();if(change==='identity')f.client.identity.id='another-identity';else if(change==='unowned')f.client.isHost=false;else if(change==='presentation')f.client.hostPresentation=false;
  else if(change==='owner')f.raw.owner='browser';else if(change==='game')f.executor.game='dixit';else if(change==='capsule')f.executor.capsule='';else if(change==='epoch')f.executor.epoch='';else if(change==='session')f.executor.sessionId='different-session';else if(change==='created')f.executor.createdAt=null;
  else if(change==='source-token')f.entries[0].originalToken='bad';else if(change==='private-token')f.entries[0].token='bad';else if(change==='identity-token')f.entries[0].identityId='bad';else if(change==='history-token')f.entries[0].historyToken='bad';else if(change==='duplicate-source')f.entries[1].originalToken=f.entries[0].originalToken;
  else f.state.transport.members[f.entries[0].identityId].token='different';
  f.save();assert.equal(await f.client._readHostSnapshot(f.raw),null,change);assert.deepEqual(f.reads,[]);
 }
});
test('read-only manager presence and recovery use service grace and initial presence fallback exactly',async()=>{
 const f=fixture();f.executor.presence={1:f.now-59000,2:f.now-60000};f.executor.createdAt=f.now-30000;
 for(const member of f.state.rooms[f.code].members)member.lastSeen=f.now-50000;f.save();
 const view=await f.client._readHostSnapshot(f.raw),formal=f.entries.map(entry=>f.state.rooms[f.code].members.find(member=>member.identityId===entry.identityId).id);
 assert.deepEqual(formal.map(id=>view.players.find(player=>player.id===id).connected),[true,false,true]);assert.equal(view.recovery.available,true);
 assert.equal(view.players.find(player=>player.isHost).connected,false,'unseated moderator retains engine presence behavior');
 const expected=JSON.parse(A.project(copy(JSON.parse(f.raw.data)),{playerNum:0},{code:f.code,now:f.now,bank,seats:f.entries.map((entry,i)=>({playerNum:i+1,token:entry.token})),onlineNums:[1,3]}).viewJson);
 assert.deepEqual(copy(view),expected);
});

function bootstrap(f){
 delete f.raw.executor;f.state.rooms[f.code].sharedControls=false;f.save();f.client.executorDeferred=true;
 const allowed=new Set(f.entries.map(f.privatePath)),versions=new Map(),writes=[],requests=[];
 const transport={writes,requests,beforePut:null};
 f.client._request=async(path,options={})=>{
  const node=path.slice(1),method=options.method||'GET';assert.ok(allowed.has(node),'deferred bootstrap accesses only exact formal private nodes');requests.push({node,method});
  const etag='"'+(versions.get(node)||0)+'"';
  if(method==='GET')return {data:copy(f.values.get(node)),etag};
  assert.equal(method,'PUT');assert.ok(options.etag,'every bootstrap write is conditional');
  if(transport.beforePut)await transport.beforePut(node,options,versions);
  if(options.etag!=='"'+(versions.get(node)||0)+'"')return {conflict:true};
  f.values.set(node,copy(options.body));versions.set(node,(versions.get(node)||0)+1);writes.push(node);return {data:copy(options.body)};
 };
 return transport;
}
test('deferred initial host creation with no formal original roster emits a public lobby without a legacy flush',async()=>{
 const f=fixture('lobby'),transport=bootstrap(f);f.state.transport.cardRoster=[];f.state.rooms[f.code].members=f.state.rooms[f.code].members.filter(member=>member.identityId===f.hostId);f.save();
 const before=copy(f.raw),view=await f.client._hostRefresh(f.raw);
 assert.equal(view.phase,'lobby');assert.equal(view.self.isHost,true);assert.equal(view.privateCard,null);assert.deepEqual(f.raw,before);
 assert.deepEqual(transport.requests,[]);assert.deepEqual(f.storageWrites,[]);
});
test('deferred import seeds only missing formal private nodes and preserves existing mailbox, metadata and histories',async()=>{
 const f=fixture(),transport=bootstrap(f),missing=f.privatePath(f.entries[1]);f.values.delete(missing);
 const existing=f.values.get(f.privatePath(f.entries[0]));existing.command={commandId:'preserve-my-pending-ready',action:'ready'};existing.heartbeat=98765;existing.metadata='keep this';
 const before=copy(f.raw),others=copy([...f.values.entries()].filter(([node])=>node!==missing)),view=await f.client._hostRefresh(f.raw);
 assert.equal(view.phase,'prepare');assert.equal(view.self.isHost,true);assert.equal(view.privateCard,null);
 assert.deepEqual(transport.writes,[missing]);assert.equal(transport.requests.filter(request=>request.method==='GET').length,3);
 for(const [node,value] of others)assert.deepEqual(f.values.get(node),value,'existing nodes and their private data are unchanged');
 const seeded=f.values.get(missing),privateView=JSON.parse(seeded.viewJson),entry=f.entries[1];
 assert.deepEqual(seeded.sessionBinding,{room:f.code,identityId:entry.identityId,historyToken:entry.historyToken});assert.equal(privateView.privateCard.role,'truthful');assert.ok(Object.keys(seeded.history.known).length);
 assert.equal(seeded.hostGrant,null);assert.equal(seeded.publicationRevision,f.state.transport.publicationRevision);
 assert.deepEqual(f.raw,before);assert.deepEqual(f.storageWrites,[]);
});
test('a service projection winning a missing-seat CAS keeps its own card and mailbox through bootstrap retry',async()=>{
 const f=fixture(),transport=bootstrap(f),missing=f.privatePath(f.entries[2]),winner=copy(f.values.get(missing));f.values.delete(missing);
 winner.command={commandId:'new-service-mailbox-wins',action:'ready'};let conflicted=false;
 transport.beforePut=async(node,options,versions)=>{if(node===missing&&!conflicted){conflicted=true;f.values.set(node,copy(winner));versions.set(node,1);}};
 await f.client._hostRefresh(f.raw);assert.equal(conflicted,true);assert.deepEqual(f.values.get(missing),winner);
 assert.deepEqual(transport.writes,[]);assert.equal(transport.requests.filter(request=>request.node===missing&&request.method==='PUT').length,1);
 assert.deepEqual(f.storageWrites,[]);
});
