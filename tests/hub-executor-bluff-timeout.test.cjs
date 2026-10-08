// Deterministic slow transport and CAS guards, with no live-room access.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../bluff-king-engine.js'),A=require('../runtime/bluff-executor.cjs').adapters.bluffking;
const {createExecutor}=require('../runtime/hub-executor-core.cjs');
const bank=require('../bluff-king-topics.js'),copy=v=>v==null?null:structuredClone(v);
function guardFixture(count=3){
 const code='BUDGET',entries=Array.from({length:count},(_,i)=>({originalToken:(i+1).toString(16).repeat(20),token:(i+1).toString(16).repeat(64),identityId:(i+1).toString(16).repeat(40),historyToken:(i+10).toString(16).repeat(64)}));
 const path=entry=>'rooms/'+code+'/players/'+entry.originalToken;
 const values=new Map(entries.map(entry=>[path(entry),{game:'bluffking',bluff:{version:2,room:code,token:entry.token,identityId:entry.identityId,historyToken:entry.historyToken}}]));
 const state={rooms:{[code]:{code}},transport:{cardRoster:entries}},executor={v:1},reads=[];
 const ctx={code,executor,async read(node){assert.ok(values.has(node),'only exact original-card paths are read');reads.push(node);return copy(values.get(node));}};
 return {code,entries,path,values,state,executor,reads,ctx};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('nine slow original-card reads share one network wave instead of exhausting the host request budget',async()=>{
 const f=guardFixture(9),pending=[],waves=[];let virtualElapsed=0,settled=false;
 f.ctx.read=node=>new Promise(resolve=>{assert.ok(f.values.has(node));f.reads.push(node);pending.push({node,resolve});});
 const task=A.guard(f.state,f.ctx).finally(()=>{settled=true;});
 for(let turn=0;turn<30&&!settled;turn++){
  await flush();if(!pending.length)continue;
  const wave=pending.splice(0);waves.push(wave.map(item=>item.node));virtualElapsed+=1500;
  for(const item of wave)item.resolve(copy(f.values.get(item.node)));
 }
 await task;
 assert.equal(waves.length,1,'independent cards must not add sequential source-read latency');assert.equal(waves[0].length,9);
 assert.equal(virtualElapsed,1500);assert.ok(virtualElapsed<12000,'source verification alone stays below the original browser budget');
 assert.deepEqual(f.executor.originalCardBindingsSeen,Object.fromEntries(f.entries.map(entry=>[entry.originalToken,entry.token])));
});
test('every source is verified after its delayed snapshot arrives; private reads cannot bless tampered bindings',async()=>{
 for(const field of ['game','version','room','token','identityId','historyToken','missing']){
  const f=guardFixture();await A.guard(f.state,f.ctx);const entry=f.entries[1],node=f.values.get(f.path(entry));
  if(field==='game')node.game='dixit';else if(field==='missing')f.values.set(f.path(entry),null);else node.bluff[field]=field==='version'?1:'different-current-binding';
  await assert.rejects(A.guard(f.state,f.ctx),{code:'game_switched'});
 }
});
test('target publication verifies only its own exact source while a global retry still detects a newer game elsewhere',async()=>{
 const f=guardFixture();await A.guard(f.state,f.ctx);f.reads.length=0;
 f.values.set(f.path(f.entries[2]),{game:'cut',cut:{sessionId:'newer-table'}});
 await A.guard(f.state,{...f.ctx,target:{token:f.entries[0].token}});
 assert.deepEqual(f.reads,[f.path(f.entries[0])]);
 await assert.rejects(A.guard(f.state,f.ctx),{code:'game_switched'});
 const before=f.reads.length;await assert.rejects(A.guard(f.state,{...f.ctx,target:{token:'absent-seat'}}),{code:'invalid_card_session'});assert.equal(f.reads.length,before);
});
test('parallel verification preserves pending-publication baselines and rejects a newer source session',async()=>{
 const f=guardFixture();for(const entry of f.entries)f.values.set(f.path(entry),{game:'cut',cut:{sessionId:'prior-cut-session',phase:'ready'},heartbeat:1});
 await A.guard(f.state,f.ctx);assert.equal(Object.keys(f.executor.originalCardBaselines).length,3);
 for(const node of f.values.values()){node.cut.phase='speaking';node.heartbeat=999;node.vote='ordinary-answer';}
 await A.guard(f.state,f.ctx);
 f.values.get(f.path(f.entries[0])).cut.sessionId='newer-cut-session';
 await assert.rejects(A.guard(f.state,f.ctx),{code:'game_switched'});
});
test('invalid original capabilities fail before any parallel source read and missing storage authority remains rejected',async()=>{
 const f=guardFixture();f.entries[1].originalToken='bad';await assert.rejects(A.guard(f.state,f.ctx),{code:'original_cards_required'});assert.deepEqual(f.reads,[]);
 await assert.rejects(A.guard(f.state,{...f.ctx,read:null}),{code:'unsafe_storage'});
 await assert.rejects(A.guard(f.state,{...f.ctx,executor:{v:0}}),{code:'unsafe_storage'});
});
test('a failed source read cannot partially mark unverified source snapshots as accepted',async()=>{
 const f=guardFixture();f.ctx.read=async node=>{f.reads.push(node);if(node===f.path(f.entries[1]))throw Object.assign(new Error('synthetic storage error'),{code:'storage_unavailable'});return copy(f.values.get(node));};
 await assert.rejects(A.guard(f.state,f.ctx),{code:'storage_unavailable'});
 assert.deepEqual(f.executor.originalCardBindingsSeen,{});assert.deepEqual(f.executor.originalCardBaselines,{});
});
function coreFixture(){
 const f=guardFixture(),control='f'.repeat(64),hostId='host-budget',state=E.blankStore();let serial=0;
 const options={now:1000,rng:()=>0,uuid:()=>('budget-member-'+(++serial))};
 E.applyCommand(state,hostId,{room:f.code,action:'create',name:'Host',participate:false},bank,options);
 const members={[hostId]:{token:'e'.repeat(64),historyToken:'d'.repeat(64)}};
 for(let i=0;i<f.entries.length;i++){const entry=f.entries[i];E.applyCommand(state,entry.identityId,{room:f.code,action:'join',name:'Player '+(i+1),participate:true},bank,options);members[entry.identityId]={token:entry.token,historyToken:entry.historyToken};}
 state.transport={members,cardRoster:f.entries,accepted:{},acknowledgements:{},executorSessionId:'budget-service-session',publicationRevision:0};
 const values=new Map(f.values),versions=new Map(),writes=[],sourceReads=[],canonical='rooms/bluffking-'+f.code+'/players/'+control;
 const seats=f.entries.map((entry,i)=>({playerNum:i+1,token:entry.token})),privatePath=i=>'rooms/bluffking-'+f.code+'/players/'+f.entries[i].token;
 function put(node,value){values.set(node,copy(value));versions.set(node,(versions.get(node)||0)+1);}
 put(canonical,{data:JSON.stringify(state),revision:1});
 for(let i=0;i<seats.length;i++)put(privatePath(i),{viewJson:JSON.stringify(E.projectView(state,f.entries[i].identityId,f.code,bank,{private:true,now:1000})),sessionBinding:{room:f.code,identityId:f.entries[i].identityId,historyToken:f.entries[i].historyToken},publicationRevision:0});
 const db={values,versions,writes,sourceReads,put,canonical,privatePath,beforeGet:null,beforePut:null};
 async function fetchImpl(url,options={}){
  const node=new URL(url).pathname.slice(1).replace(/\.json$/,''),method=options.method||'GET';
  if(method==='GET'){if(f.values.has(node))sourceReads.push(node);if(db.beforeGet)await db.beforeGet(node,options);const etag='"'+(versions.get(node)||0)+'"';return new Response(JSON.stringify(copy(values.get(node))??null),{status:200,headers:{etag}});}
  assert.equal(method,'PUT');if(db.beforePut)await db.beforePut(node,options);
  const etag='"'+(versions.get(node)||0)+'"';if(new Headers(options.headers).get('if-match')!==etag)return new Response('null',{status:412});
  const value=JSON.parse(options.body);put(node,value);writes.push(node);return new Response(JSON.stringify(value),{status:200});
 }
 const service=createExecutor({secret:'34'.repeat(32),databaseURL:'http://localhost',fetchImpl,now:()=>1000,games:{bluffking:A}});
 return {...f,db,service,control,seats,register:()=>service.register({game:'bluffking',code:f.code,controlToken:control,seats})};
}
test('a canonical ETag conflict repeats fresh parallel guards and cannot apply a stale host action after source switching',async()=>{
 const f=coreFixture(),registered=await f.register(),beforePrivate=f.seats.map((_,i)=>copy(f.db.values.get(f.db.privatePath(i))));
 f.db.sourceReads.length=0;let conflicted=false;
 f.db.beforePut=async node=>{if(node===f.db.canonical&&!conflicted){conflicted=true;f.db.put(f.path(f.entries[0]),{game:'dixit',dixit:{sessionId:'newer-after-canonical-read'}});f.db.put(node,{...f.db.values.get(node),syntheticConcurrentUpdate:1});}};
 const before=JSON.parse(f.db.values.get(f.db.canonical).data),room=before.rooms[f.code];
 await assert.rejects(f.service.execute({capsule:registered.capsule,token:f.control,command:{action:'start',commandId:'budget-conflict-start-command',expectedVersion:room.version}}),{code:'game_switched'});
 assert.equal(conflicted,true);for(const entry of f.entries)assert.equal(f.db.sourceReads.filter(node=>node===f.path(entry)).length,2,'a CAS retry rereads every current source');
 assert.equal(JSON.parse(f.db.values.get(f.db.canonical).data).rooms[f.code].phase,'lobby');
 for(let i=0;i<beforePrivate.length;i++)assert.deepEqual(f.db.values.get(f.db.privatePath(i)),beforePrivate[i]);
 assert.equal(f.db.values.get(f.path(f.entries[0])).game,'dixit');
});
test('private publication rereads its exact source and cannot publish over a newer game selected after canonical commit',async()=>{
 const f=coreFixture(),registered=await f.register(),target=1,before=copy(f.db.values.get(f.db.privatePath(target)));let switched=false;
 f.db.beforeGet=async(node,options)=>{if(!switched&&node===f.db.privatePath(target)&&new Headers(options.headers).get('x-firebase-etag')==='true'){
  switched=true;f.db.put(f.path(f.entries[target]),{game:'cut',cut:{sessionId:'newer-before-target-publication'}});
 }};
 await assert.rejects(f.service.execute({capsule:registered.capsule,token:f.control}),{code:'game_switched'});
 assert.equal(switched,true);assert.deepEqual(f.db.values.get(f.db.privatePath(target)),before);
 assert.equal(f.db.values.get(f.path(f.entries[target])).game,'cut');
});

test('registration returns its public host view only after every private seat has the same sealed epoch',async()=>{
 const f=coreFixture(),raw=copy(f.db.values.get(f.db.canonical)),state=JSON.parse(raw.data);
 state.transport.privateKey={d:'CANONICAL_ONLY_TEST_KEY'};
 let serial=0;const options={now:1000,rng:()=>0,uuid:()=>('registration-round-'+(++serial))};
 E.applyCommand(state,'host-budget',{room:f.code,action:'start',commandId:'registration-active-start',expectedVersion:state.rooms[f.code].version},bank,options);
 E.applyCommand(state,'host-budget',{room:f.code,action:'confirmTopic',commandId:'registration-active-confirm',expectedVersion:state.rooms[f.code].version,roundId:state.rooms[f.code].round.id},bank,options);
 f.db.put(f.db.canonical,{...raw,data:JSON.stringify(state)});
 let reachLast,releaseLast,held=false,returned=false;
 const lastReached=new Promise(resolve=>{reachLast=resolve;}),lastWrite=new Promise(resolve=>{releaseLast=resolve;});
 f.db.beforePut=async node=>{if(!held&&node===f.db.privatePath(2)){held=true;reachLast();await lastWrite;}};
 const pending=f.register().then(result=>{returned=true;return result;});
 await lastReached;assert.equal(returned,false,'registration cannot respond while a private card is still waiting for publication');
 assert.equal(f.db.values.get(f.db.privatePath(2)).hubExecutor,undefined);
 releaseLast();const result=await pending,view=JSON.parse(result.payload.viewJson);
 assert.equal(view.phase,'prepare');assert.equal(view.sharedControls,true);assert.equal(view.self.isHost,true);assert.equal(view.privateCard,null);
 const roles=[];
 for(let i=0;i<f.seats.length;i++){
  const card=f.db.values.get(f.db.privatePath(i)),privateView=JSON.parse(card.viewJson);
  assert.equal(card.hubExecutor.capsule,result.capsule);assert.equal(card.hubExecutor.sessionId,result.sessionId);
  assert.equal(privateView.phase,'prepare');assert.equal(privateView.sharedControls,true);roles.push(privateView.privateCard.role);
 }
 assert.deepEqual(roles.sort(),['bluffer','thinker','truthful']);
 const publicPayload=JSON.stringify(result.payload);
 assert.doesNotMatch(publicPayload,/privateKey|CANONICAL_ONLY_TEST_KEY|identityId|historyToken|secretAnswer|supportingFacts|truthfulId/);
 assert.ok(!publicPayload.includes(f.control));
 for(const member of Object.values(state.transport.members))for(const token of [member.token,member.historyToken])assert.ok(!publicPayload.includes(token),'the returned host view contains no private seat credentials');
});
