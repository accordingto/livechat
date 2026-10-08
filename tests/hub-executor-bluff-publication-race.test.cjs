// Exercise real browser transport and the sealed service across a held registration.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {createExecutor}=require('../runtime/hub-executor-core.cjs');
const games=require('../runtime/bluff-executor.cjs').adapters;
const copy=value=>value==null?null:structuredClone(value);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
class Database{
 constructor(){this.values=new Map();this.versions=new Map();this.writes=[];}
 get(path){return copy(this.values.get(path));}
 put(path,value){this.values.set(path,copy(value));this.versions.set(path,(this.versions.get(path)||0)+1);this.writes.push({path,value:copy(value)});}
 fetch=async(url,options={})=>{
  const path=new URL(url).pathname.slice(1).replace(/\.json$/,''),method=options.method||'GET';
  if(this.beforeRead&&method==='GET')await this.beforeRead({url,path,options});
  const etag='"'+(this.versions.get(path)||0)+'"';
  if(method==='GET')return new Response(JSON.stringify(this.get(path)),{status:200,headers:{etag}});
  assert.equal(method,'PUT');const expected=new Headers(options.headers).get('if-match');
  if(expected&&expected!==etag)return new Response('null',{status:412});
  const value=JSON.parse(options.body);this.put(path,value);return new Response(JSON.stringify(value),{status:200});
 };
}
async function fixture(t){
 const db=new Database(),values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const timers=new Map(),calls=[],clients=[],hooks={};let timerId=0;
 const code='RACE12',setup={playerCount:3,tokens:['1'.repeat(20),'2'.repeat(20),'3'.repeat(20)],names:['Amy','Bob','Cat']};
 const service=createExecutor({secret:'28'.repeat(32),databaseURL:'http://localhost',fetchImpl:db.fetch,games});
 const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,structuredClone,AbortSignal,btoa,atob,Uint8Array,Date,Promise,console,localStorage:storage,
  document:{hidden:false,documentElement:{lang:'en'},addEventListener(){},getElementById(){return null;}},
  setInterval(){return 1;},clearInterval(){},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  async fetch(url,options={}){
   if(new URL(url).pathname!=='/api/hub-executor')return db.fetch(url,options);
   const body=options.body&&JSON.parse(options.body);if(!body)return new Response(JSON.stringify({ready:true}),{status:200});calls.push(copy(body));
   try{return new Response(JSON.stringify(await service[body.operation](body)),{status:200});}
   catch(error){if(hooks.afterServiceError)await hooks.afterServiceError({body,error});return new Response(JSON.stringify({error:error.code||error.message}),{status:error.status||500});}
  }});
 context.window=context;context.addEventListener=()=>{};
 for(const file of ['bluff-king-engine.js','bluff-king-topics.js','bluff-king-sync.js','hub-executor.js'])vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),context);
 context.HUB_EXECUTOR.install();
 const client=()=>{const c=new context.BLUFF_SYNC.Client({databaseURL:'https://test.firebaseio.com',storage,hostPresentation:true});clients.push(c);return c;};
 const manager=client();manager.executorDeferred=true;
 await manager.createFromCards(code,setup,{replaceActive:true});
 const sessions=await manager.getCardSessions();
 for(let i=0;i<sessions.length;i++)db.put('rooms/'+code+'/players/'+setup.tokens[i],{game:'bluffking',playerNum:i+1,name:setup.names[i],bluff:sessions[i].credential});
 await manager.command({action:'start',commandId:'race-start-active-round',expectedVersion:manager.lastView.version});
 await manager.command({action:'confirmTopic',commandId:'race-confirm-active-roles',expectedVersion:manager.lastView.version,roundId:manager.lastView.round.id});
 const canonical='rooms/bluffking-'+code+'/players/'+manager.hostToken;
 const state=()=>JSON.parse(db.get(canonical).data);
 function pauseRegistration(){
  const entered=deferred(),resume=deferred();let held=false;
  db.beforeRead=async({url,path,options})=>{if(!held&&new URL(url).hostname==='localhost'&&path===canonical&&new Headers(options.headers).get('x-firebase-etag')==='true'){
   held=true;entered.resolve();await resume.promise;
  }};
  return {entered:entered.promise,resume:()=>{resume.resolve();db.beforeRead=null;}};
 }
 t.after(()=>{for(const c of clients)c.close();});
 return {db,context,manager,client,setup,sessions,code,timers,calls,service,canonical,state,pauseRegistration,hooks};
}
test('a slow service registration cannot be interleaved by a deferred host polling writer',async t=>{
 const f=await fixture(t),before=f.state(),gate=f.pauseRegistration();
 const registration=f.context.HUB_EXECUTOR.ensureBluff(f.manager);registration.catch(()=>{});await gate.entered;
 const legacyPolls=[...f.timers.values()].filter(timer=>timer.ms===1500);
 // In the regression, this timer rewrites every private projection after the
 // service took its exact opening snapshots, poisoning the sealed epoch.
 for(const timer of legacyPolls)await timer.fn();
 gate.resume();
 await registration;
 assert.equal(legacyPolls.length,0,'deferred import must not leave a legacy polling writer scheduled');
 const registered=f.db.get(f.canonical);assert.equal(registered.executor.v,1);
 assert.equal(f.state().rooms[f.code].round.id,before.rooms[f.code].round.id);
 for(const [id,history] of Object.entries(before.identities))for(const field of ['known','seen'])for(const [key,value] of Object.entries(history[field]||{}))assert.deepEqual(f.state().identities[id][field][key],value,'existing exposure history is retained');
 assert.ok(Object.values(f.state().identities).some(history=>Object.keys(history.known||{}).length),'registration persists the newly delivered truthful answer');
 for(const seat of f.sessions){const node=f.db.get('rooms/bluffking-'+f.code+'/players/'+seat.credential.token);assert.equal(node.hubExecutor.capsule,registered.executor.capsule);
  await f.service.execute({capsule:node.hubExecutor.capsule,token:seat.credential.token});}
 f.manager.executorDeferred=false;f.manager._schedule();assert.equal([...f.timers.values()].filter(timer=>timer.ms===1500).length,1,'normal polling resumes only after service publication');
});
test('a matching-source reopen repairs a partial poisoned registration while preserving its active game',async t=>{
 const f=await fixture(t);
 await f.context.HUB_EXECUTOR.ensureBluff(f.manager);const prior=f.db.get(f.canonical).executor.capsule;
 await f.service.release({capsule:prior,token:f.manager.hostToken});
 await f.manager.refresh();const before=f.state(),gate=f.pauseRegistration();
 const registration=f.context.HUB_EXECUTOR.ensureBluff(f.manager);registration.catch(()=>{});await gate.entered;
 // Force the historical writer explicitly. The first test ensures current
 // scheduling cannot cause this; this test repairs users already affected.
 f.manager.executorDeferred=false;try{await f.manager.refresh();}finally{f.manager.executorDeferred=true;f.manager._schedule();}gate.resume();
 await assert.rejects(registration,{code:'game_switched'});
 const poisoned=f.db.get(f.canonical);assert.equal(poisoned.executor.v,1);
 const staleCard=f.db.get('rooms/bluffking-'+f.code+'/players/'+f.sessions[0].credential.token);
 assert.equal(staleCard.hubExecutor.capsule,prior);assert.equal(JSON.parse(staleCard.viewJson).sharedControls,false);
 await assert.rejects(f.service.execute({capsule:staleCard.hubExecutor.capsule,token:f.sessions[0].credential.token}),{code:'stale_session'});
 await assert.rejects(f.service.execute({capsule:poisoned.executor.capsule,token:f.sessions[0].credential.token}),{code:'game_switched'});
 f.manager.close();const reopened=f.client();reopened.executorDeferred=true;
 await reopened.createFromCards(f.code,f.setup,{replaceActive:true});
 await f.context.HUB_EXECUTOR.ensureBluff(reopened);
 const repaired=f.db.get(f.canonical),after=f.state();
 assert.notEqual(repaired.executor.capsule,poisoned.executor.capsule,'the obsolete partial epoch is replaced');
 assert.equal(after.rooms[f.code].phase,'prepare');assert.equal(after.rooms[f.code].round.id,before.rooms[f.code].round.id);
 assert.deepEqual(after.rooms[f.code].scores,before.rooms[f.code].scores);assert.deepEqual(after.identities,JSON.parse(poisoned.data).identities,'repair retains all exposures including the forced historical writer');
 assert.ok(f.calls.some(call=>call.operation==='release'&&call.capsule===poisoned.executor.capsule));
 for(let i=0;i<f.sessions.length;i++){const seat=f.sessions[i],node=f.db.get('rooms/bluffking-'+f.code+'/players/'+seat.credential.token);
  assert.deepEqual(f.db.get('rooms/'+f.code+'/players/'+f.setup.tokens[i]).bluff,copy(seat.credential),'existing original-card credentials survive repair');
  assert.equal(node.hubExecutor.capsule,repaired.executor.capsule);await f.service.execute({capsule:node.hubExecutor.capsule,token:seat.credential.token});}
});

test('partial-epoch repair rechecks every original binding and leaves a newer game untouched',async t=>{
 const f=await fixture(t),gate=f.pauseRegistration();
 const registration=f.context.HUB_EXECUTOR.ensureBluff(f.manager);registration.catch(()=>{});await gate.entered;
 f.manager.executorDeferred=false;try{await f.manager.refresh();}finally{f.manager.executorDeferred=true;f.manager._schedule();}gate.resume();await assert.rejects(registration,{code:'game_switched'});
 const poisoned=f.db.get(f.canonical),releasedBefore=f.calls.filter(call=>call.operation==='release').length;
 const sourcePath='rooms/'+f.code+'/players/'+f.setup.tokens[0];
 const newer={game:'dixit',playerNum:1,name:'Amy',dixit:{sessionId:'newer-dixit-table'}};let replaced=false;
 f.hooks.afterServiceError=async({body,error})=>{if(!replaced&&body.operation==='execute'&&body.token===f.manager.hostToken&&error.code==='game_switched'){
  replaced=true;f.db.put(sourcePath,newer);
 }};
 f.manager.close();const reopened=f.client();reopened.executorDeferred=true;
 await assert.rejects(reopened.createFromCards(f.code,f.setup,{replaceActive:true}),{code:'game_switched'});
 assert.equal(replaced,true);assert.deepEqual(f.db.get(sourcePath),newer);
 assert.equal(f.calls.filter(call=>call.operation==='release').length,releasedBefore,'a changed source cannot authorize partial-epoch release');
 assert.equal(f.db.get(f.canonical).executor.capsule,poisoned.executor.capsule);
});

test('an already queued host poll cannot write after Hub import defers and clears its timer',async t=>{
 const f=await fixture(t);f.manager.executorDeferred=false;f.manager._schedule();
 const queued=[...f.timers.values()].find(timer=>timer.ms===1500);assert.ok(queued);
 const before=f.db.writes.length;let refreshed=0;const refresh=f.manager.refresh.bind(f.manager);
 f.manager.refresh=async()=>{refreshed++;return refresh();};
 f.manager.executorDeferred=true;f.manager._schedule();
 assert.equal([...f.timers.values()].filter(timer=>timer.ms===1500).length,0);
 await queued.fn();
 assert.equal(refreshed,0,'a timer already dispatched before clearTimeout must honor the new deferral');
 assert.equal(f.db.writes.length,before,'queued polling cannot change canonical state or private projections during import');
});
