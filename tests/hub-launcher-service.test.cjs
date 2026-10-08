'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {createExecutor,unseal,keyFrom}=require('../runtime/hub-executor-core.cjs');
const games={...require('../runtime/party-executor.cjs').adapters,...require('../runtime/story-executor.cjs').adapters,
 ...require('../runtime/bluff-executor.cjs').adapters,...require('../runtime/wolf-executor.cjs').adapters};
const clone=value=>value==null?null:JSON.parse(JSON.stringify(value));
const source=fs.readFileSync(require.resolve('../hub-launcher.js'),'utf8');
class Database {
 constructor(){this.values=new Map([['.info/connected',true],['.info/serverTimeOffset',0]]);this.versions=new Map();this.listeners=new Map();this.tails=new Map();this.writes=[];}
 get(path){return clone(this.values.get(path));}
 put(path,value){this.values.set(path,clone(value));this.versions.set(path,(this.versions.get(path)||0)+1);this.writes.push({path,value:clone(value)});
  for(const fn of this.listeners.get(path)||[])queueMicrotask(()=>fn({val:()=>this.get(path)}));}
 ref(path){const db=this;return {key:path.split('/').at(-1),once:async()=>({val:()=>db.get(path)}),
  async set(value){db.put(path,value);},
  on(event,fn){if(!db.listeners.has(path))db.listeners.set(path,new Set());db.listeners.get(path).add(fn);queueMicrotask(()=>fn({val:()=>db.get(path)}));},
  off(event,fn){db.listeners.get(path)?.delete(fn);},
  transaction(update){const task=(db.tails.get(path)||Promise.resolve()).then(()=>{
    const next=update(db.get(path));if(next===undefined)return {committed:false,snapshot:{val:()=>db.get(path)}};
    db.put(path,next);return {committed:true,snapshot:{val:()=>clone(next)}};});
    db.tails.set(path,task.catch(()=>{}));return task;}
 };}
 fetch=async(url,options={})=>{
  const path=new URL(url).pathname.slice(1).replace(/\.json$/,'');
  const etag='"'+(this.versions.get(path)||0)+'"';
  if(!options.method||options.method==='GET')return new Response(JSON.stringify(this.get(path)),{status:200,headers:{etag}});
  assert.equal(options.method,'PUT');
  const expected=new Headers(options.headers).get('if-match');
  if(expected&&expected!==etag)return new Response('null',{status:412});
  const value=JSON.parse(options.body);this.put(path,value);return new Response(JSON.stringify(value),{status:200});
 };
}
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function fixture(t,{count=4,ready=true,failRegister=false,afterService=null,overrideLoad=null,onReady=null}={}){
 const db=new Database(),extras={},tokens=Array.from({length:count},(_,i)=>(i+1).toString(16).repeat(20));
 const names=Array.from({length:count},(_,i)=>'Person '+(i+1)),code='ABC234',refs=tokens.map(token=>db.ref('rooms/'+code+'/players/'+token));
 const localStorage=storage(),calls=[],loaded=[],loadedFiles=new Set(),navigation=[],intervals=[],timeouts=new Set();
 const room={enabled:true,code,count,answers:{},name:i=>names[i],playerRef:i=>refs[i],getExtra:k=>extras[k],setExtra:(k,v)=>{extras[k]=v;}};
 refs.forEach((ref,i)=>{db.put('rooms/'+code+'/players/'+ref.key,{game:'cut',playerNum:i+1,name:names[i],cut:{sessionId:'old-cut',phase:'SPEAKING'}});
  ref.on('value',s=>{room.answers[i+1]=s.val();});});
 const secret='45'.repeat(32),service=createExecutor({secret,databaseURL:'http://localhost',fetchImpl:db.fetch,now:()=>Date.now(),games});
 const context=vm.createContext({console,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Uint32Array,AbortSignal,URL,btoa,atob,structuredClone,Date,Promise,
  localStorage,ROOM:room,location:{href:'https://hub.invalid/index.html',assign:url=>navigation.push(url)},
  FIREBASE_CONFIG:{databaseURL:'https://test.firebaseio.com'},firebase:{database:()=>db},
  GAME_DATA:{},document:{querySelectorAll:()=>[],hidden:false,documentElement:{lang:'en'},addEventListener(){},getElementById(){return null;}},
  setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},clearInterval(id){if(intervals[id-1])intervals[id-1].cleared=true;},
  setTimeout(fn,ms){const id=setTimeout(()=>{timeouts.delete(id);fn();},ms);timeouts.add(id);return id;},clearTimeout(id){clearTimeout(id);timeouts.delete(id);},
  async fetch(url,input={}){
   if(new URL(url,'https://hub.invalid').pathname!=='/api/hub-executor')return db.fetch(url,input);
   const body=input.body&&JSON.parse(input.body);calls.push({url,body});
   if(!body){if(onReady)await onReady({db});return new Response(JSON.stringify({ready}),{status:200});}
   if(failRegister&&body.operation==='register')return new Response(JSON.stringify({error:'synthetic_failure'}),{status:503});
   try{const result=await service[body.operation](body);if(afterService)await afterService({body,result,db});
    return new Response(JSON.stringify(result),{status:200});}
   catch(error){return new Response(JSON.stringify({error:error.code||error.message}),{status:error.status||500});}
  }
 });
 context.window=context;context.addEventListener=()=>{};
 vm.runInContext(fs.readFileSync(require.resolve('../hub-executor.js'),'utf8'),context);
 vm.runInContext(source,context);
 const load=async file=>{if(loadedFiles.has(file))return;loaded.push(file);if(overrideLoad)await overrideLoad(file,context);vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),context);loadedFiles.add(file);};
 const launcher=context.HUB_LAUNCHER.create({room,executor:context.HUB_EXECUTOR,database:()=>db,load,storage:localStorage,timeoutMs:250,
  delay:()=>new Promise(r=>setImmediate(r)),navigate:url=>{assert.ok(intervals.every(item=>item.ms===250||item.cleared),'initializer must close before navigating');navigation.push(url);}});
 t.after(()=>{for(const timeout of timeouts)clearTimeout(timeout);});
 return {db,extras,tokens,names,code,refs,room,context,launcher,calls,loaded,navigation,intervals,service,secret};
}
for(const game of ['letstalk','onceupon','dixit','cut','openmic','bluffking','chatwolf']){
 test(game+': actual constructors and sealed service initialize all original private cards, close setup and open only own link',async t=>{
  const f=fixture(t);const result=await f.launcher.launch(game,3);
  assert.equal(f.navigation.length,1);assert.equal(result.url,f.navigation[0]);
  const url=new URL(result.url);assert.equal(url.pathname,'/play.html');assert.equal(url.searchParams.get('s'),f.code);
  assert.equal(url.searchParams.get('p'),f.tokens[2]);assert.equal(url.searchParams.get('n'),f.names[2]);
  assert.deepEqual([...url.searchParams.keys()],['s','p','n']);
  const register=f.calls.find(c=>c.body?.operation==='register');
  assert.ok(register);assert.equal(register.body.game,game);assert.equal(register.body.seats.length,4);
  for(let i=0;i<4;i++){
   const card=(await f.refs[i].once()).val();assert.equal(card.game,game);
   assert.equal(card.playerNum,i+1);const json=JSON.stringify(card);
   assert.ok(!json.includes(register.body.controlToken));
   for(const other of f.tokens.filter(token=>token!==f.tokens[i]))assert.ok(!json.includes(other));
  }
  const capsule=f.calls.find(c=>c.body?.capsule)?.body.capsule||((await f.refs[2].once()).val().hubExecutor?.capsule);
  const ticket=unseal(capsule,keyFrom(f.secret)),raw=f.db.get(ticket.canonicalPath);
  assert.equal(raw.executor.v,1);assert.equal(raw.executor.game,game);
  for(const seat of ticket.seats){
   const card=f.db.get(seat.path);assert.equal(card.hubExecutor.capsule,raw.executor.capsule);
   assert.equal(card.hubExecutor.sessionId,raw.executor.sessionId);assert.ok(card.hubExecutor.revision>=raw.revision);
   const json=JSON.stringify(card);assert.ok(!json.includes(ticket.controlToken));
   for(const other of ticket.seats.filter(s=>s.token!==seat.token))assert.ok(!json.includes(other.token));
  }
  if(game==='chatwolf'){
   const data=JSON.parse(raw.data);assert.equal(data.room.phase,'LOBBY');
   const first=JSON.parse(f.db.get(ticket.seats[0].path).view),mine=JSON.parse(f.db.get(ticket.seats[2].path).view);
   assert.equal(first.private.isHost,false);assert.equal(mine.private.isHost,true);
   assert.equal(first.private.canManage,true);
   assert.deepEqual(Object.values(raw.executor.originalCardsSeen),[true,true,true,true]);
  }
  if(game==='bluffking')assert.equal(Object.keys(raw.executor.originalCardBindingsSeen).length,4);
  if(game==='dixit'){const state=raw.stateJson?JSON.parse(raw.stateJson):raw.state;assert.equal(state.hostPlayerNum,3);assert.equal(state.targetScore,30);}
  assert.ok(!f.loaded.some(file=>/-ui\.js$|\.html$/.test(file)),'no manager UI is loaded');
 });
}
test('service unavailable: no files or room writes are started and no player is redirected',async t=>{
 const f=fixture(t,{ready:false}),before=f.db.writes.length;
 await assert.rejects(f.launcher.launch('dixit',1),{code:'executor_unavailable'});
 assert.equal(f.db.writes.length,before);assert.equal(f.loaded.length,0);assert.equal(f.navigation.length,0);assert.equal(f.launcher.busy,false);
});
test('registration errors never fall back to a successful local-host launch',async t=>{
 const f=fixture(t,{failRegister:true});
 await assert.rejects(f.launcher.launch('onceupon',2));
 assert.equal(f.navigation.length,0);assert.ok(f.intervals.every(item=>item.ms===250||item.cleared));
});
test('a missing or wrong-session private projection prevents navigation after registration',async t=>{
 for(const damage of [card=>{delete card.hubExecutor;},card=>{card.hubExecutor.sessionId='different';},card=>{card.game='cut';}]){
  const f=fixture(t,{afterService({body,db}){if(body.operation==='register'){const path='rooms/ABC234/players/'+'4'.repeat(20),card=db.get(path);damage(card);db.put(path,card);}}});
  await assert.rejects(f.launcher.launch('dixit',1),{code:'registration_failed'});assert.equal(f.navigation.length,0);
 }
});
test('seat and game player limits fail before any connection or write',async t=>{
 for(const [game,seat,count,error] of [['dixit',0,4,'select_seat'],['onceupon',2,7,'player_count'],['dixit',3,2,'player_count'],['chatwolf',5,4,'select_seat']]){
  const f=fixture(t,{count}),before=f.db.writes.length;await assert.rejects(f.launcher.launch(game,seat),{code:error});
  assert.equal(f.calls.length,0);assert.equal(f.db.writes.length,before);assert.equal(f.navigation.length,0);
 }
});
test('room changes while scripts load abort before construction and preserve the new roster',async t=>{
 const f=fixture(t,{overrideLoad(){f.names[0]='Changed person';}}),before=f.db.writes.length;
 await assert.rejects(f.launcher.launch('dixit',1),{code:'room_changed'});
 assert.equal(f.db.writes.length,before);assert.equal(f.navigation.length,0);
});
test('a second launch cannot replace a game that is still preparing',async t=>{
 let release;const held=new Promise(r=>{release=r;}),f=fixture(t,{overrideLoad:()=>held});
 const first=f.launcher.launch('cut',2);await new Promise(r=>setImmediate(r));
 await assert.rejects(f.launcher.launch('dixit',1),{code:'launch_busy'});release();await first;
 assert.equal(f.navigation.length,1);assert.equal(f.navigation[0].includes(f.tokens[1]),true);
});

test('switching all seven games in one homepage keeps the original roster and reopening releases the old executor safely',async t=>{
 const f=fixture(t);
 for(const game of ['letstalk','dixit','onceupon','cut','openmic','bluffking','chatwolf','bluffking','dixit']){
  await f.launcher.launch(game,2);
  const cards=await Promise.all(f.refs.map(async ref=>(await ref.once()).val()));
  assert.ok(cards.every(card=>card.game===game));
  assert.equal(new URL(f.navigation.at(-1)).searchParams.get('p'),f.tokens[1]);
 }
 assert.equal(f.navigation.length,9);assert.equal(f.loaded.filter(file=>file==='talk-sync.js').length,1);
 const releases=f.calls.filter(call=>call.body?.operation==='release');assert.equal(releases.length,2);
 const registered=f.calls.filter(call=>call.body?.operation==='register');assert.deepEqual(registered.map(call=>call.body.game),
  ['letstalk','dixit','onceupon','cut','openmic','bluffking','chatwolf','bluffking','dixit']);
});

test('reopening an existing Talk canonical defers background registration until the new session is committed, even with slow readiness',async t=>{
 let release;const gate=new Promise(resolve=>{release=resolve;}),f=fixture(t,{onReady:()=>gate});
 f.context.HUB_EXECUTOR.ready=async()=>true;
 const E=require('../talk-engine.js'),control='a'.repeat(32),path='rooms/'+f.code+'/players/'+control;
 f.extras.letsTalkControlToken=control;
 const old=E.create({id:'old-talk-session',now:1000,topic:{id:'before',question:'Old question'},mode:'think',seconds:30,
  roster:f.names.map((name,i)=>({playerNum:i+1,name}))});
 f.db.put(path,{state:old,revision:1,owner:'old-browser',leaseUntil:0});
 f.refs.forEach((ref,i)=>f.db.put('rooms/'+f.code+'/players/'+ref.key,E.view(old,i+1,1000)));
 await new Promise(resolve=>setImmediate(resolve));
 const launched=f.launcher.launch('letstalk',3);
 for(let i=0;i<30&&!f.calls.length;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].body,undefined);
 assert.notEqual(f.db.get(path).state.sessionId,old.sessionId,'new session commits before readiness is awaited for registration');
 assert.equal(f.calls.filter(call=>call.body?.operation==='register').length,0);assert.equal(f.navigation.length,0);
 release();await launched;
 const registered=f.calls.filter(call=>call.body?.operation==='register');assert.equal(registered.length,1);
 assert.notEqual(registered[0].body.sessionId,old.sessionId);assert.equal(f.navigation.length,1);
});


test('Bluff manager reload of the same active original cards keeps the sealed epoch, current round and private history',async t=>{
 const f=fixture(t);await f.launcher.launch('bluffking',2);
 const Client=f.context.BLUFF_SYNC.Client;
 const manager=new Client({databaseURL:'https://test.firebaseio.com',storage:f.context.localStorage,hostPresentation:true});
 t.after(()=>manager.close());
 await manager.connect(f.code);
 await manager.command({action:'start',commandId:'first-active-round',expectedVersion:manager.lastView.version});
 const sessions=await manager.getCardSessions();
 for(const seat of sessions)await f.service.execute({capsule:manager.executorTicket.capsule,token:seat.credential.token});
 await manager.command({action:'confirmTopic',commandId:'first-roles-confirmation',expectedVersion:manager.lastView.version,roundId:manager.lastView.round.id});
 const before=(await manager._request(manager._roomPath('players/'+manager.hostToken))).data;
 const beforeState=JSON.parse(before.data),roundId=beforeState.rooms[f.code].round.id;
 const releases=f.calls.filter(call=>call.body?.operation==='release').length;
 const registrations=f.calls.filter(call=>call.body?.operation==='register').length;
 const originalCards=await Promise.all(f.refs.map(async ref=>(await ref.once()).val()));
 manager.close();
 const reopened=new Client({databaseURL:'https://test.firebaseio.com',storage:f.context.localStorage,hostPresentation:true});
 t.after(()=>reopened.close());
 await reopened.createFromCards(f.code,{playerCount:4,tokens:f.tokens,names:f.names},{replaceActive:true});
 const after=(await reopened._request(reopened._roomPath('players/'+reopened.hostToken))).data;
 const afterState=JSON.parse(after.data);
 assert.equal(after.executor.capsule,before.executor.capsule,'reloading must keep the active service epoch');
 assert.equal(afterState.rooms[f.code].round.id,roundId);
 assert.equal(afterState.rooms[f.code].phase,'prepare');
 assert.ok(Object.values(beforeState.identities).some(history=>Object.keys(history.known||{}).length),'the active truth-delivery history is retained');
 assert.deepEqual(afterState.rooms[f.code].scores,beforeState.rooms[f.code].scores);
 assert.deepEqual(afterState.identities,beforeState.identities);
 assert.equal(f.calls.filter(call=>call.body?.operation==='release').length,releases);
 assert.equal(f.calls.filter(call=>call.body?.operation==='register').length,registrations);
 assert.equal(reopened.executorTicket.capsule,before.executor.capsule);
 for(let i=0;i<originalCards.length;i++){
  const card=(await f.refs[i].once()).val();
  assert.deepEqual(card.bluff,originalCards[i].bluff,'a reload does not replace an original private card');
 }
});


for(const change of ['name','count','token','other-game']){
 test('Bluff current-Hub '+change+' replacement starts a fresh group, preserves truth history and fences the old epoch',async t=>{
  const f=fixture(t);await f.launcher.launch('bluffking',2);
  const Client=f.context.BLUFF_SYNC.Client;
  const manager=new Client({databaseURL:'https://test.firebaseio.com',storage:f.context.localStorage,hostPresentation:true});
  t.after(()=>manager.close());await manager.connect(f.code);
  await manager.command({action:'start',commandId:'replacement-first-start',expectedVersion:manager.lastView.version});
  const oldSessions=await manager.getCardSessions(),oldTicket=clone(manager.executorTicket);
  for(const seat of oldSessions)await f.service.execute({capsule:oldTicket.capsule,token:seat.credential.token});
  await manager.command({action:'confirmTopic',commandId:'replacement-first-role-deal',expectedVersion:manager.lastView.version,roundId:manager.lastView.round.id});
  const canonicalPath=manager._roomPath('players/'+manager.hostToken);
  const before=JSON.parse((await manager._request(canonicalPath)).data.data);
  assert.ok(Object.values(before.identities).some(history=>Object.keys(history.known||{}).length));
  const setup={playerCount:4,tokens:[...f.tokens],names:[...f.names]};
  if(change==='name')setup.names[1]='Current new name';
  if(change==='count'){setup.playerCount=3;setup.tokens.pop();setup.names.pop();}
  if(change==='token'){setup.tokens[1]='9'.repeat(20);setup.names[1]='Replacement person';}
  if(change==='other-game')for(let i=0;i<f.refs.length;i++)await f.refs[i].set({game:'cut',playerNum:i+1,name:f.names[i],cut:{sessionId:'newer-table'}});
  manager.close();
  const reopened=new Client({databaseURL:'https://test.firebaseio.com',storage:f.context.localStorage,hostPresentation:true});
  t.after(()=>reopened.close());
  await reopened.createFromCards(f.code,setup,{replaceActive:true});
  assert.equal(reopened.lastView.phase,'lobby');assert.equal(reopened.lastView.round,null);
  const sessions=await reopened.getCardSessions();
  assert.deepEqual(Array.from(sessions,seat=>seat.originalToken),setup.tokens);
  assert.deepEqual(Array.from(sessions,seat=>seat.name),setup.names);
  const fresh=JSON.parse((await reopened._request(canonicalPath)).data.data);
  assert.deepEqual(fresh.rooms[f.code].scores,{});assert.deepEqual(fresh.rooms[f.code].history,[]);
  for(const [id,history] of Object.entries(before.identities))for(const type of ['known','seen'])for(const [key,value] of Object.entries(history[type]||{}))assert.deepEqual(fresh.identities[id][type][key],value,'truth histories survive abandoned games');
  for(let i=0;i<sessions.length;i++)await f.db.ref('rooms/'+f.code+'/players/'+setup.tokens[i]).set({game:'bluffking',playerNum:i+1,name:setup.names[i],bluff:sessions[i].credential});
  await f.context.HUB_EXECUTOR.ensureBluff(reopened);await reopened.refresh();
  const newTicket=clone(reopened.executorTicket);
  assert.notEqual(newTicket.capsule,oldTicket.capsule);
  const rawBeforeStale=f.db.get(canonicalPath.slice(1));
  await assert.rejects(f.service.execute({capsule:oldTicket.capsule,token:oldSessions[0].credential.token,
   command:{action:'ready',commandId:'old-table-delayed-operation',expectedVersion:before.rooms[f.code].version,roundId:before.rooms[f.code].round.id}}),{code:'stale_session'});
  assert.deepEqual(f.db.get(canonicalPath.slice(1)),rawBeforeStale,'the old player ticket cannot change the new group');
  reopened.close();
  const result=await f.service.execute({capsule:newTicket.capsule,token:sessions[0].credential.token,
   command:{action:'start',commandId:'new-group-start-without-manager',expectedVersion:reopened.lastView.version}});
  assert.equal(result.ok,true);
  const started=JSON.parse(f.db.get(canonicalPath.slice(1)).data).rooms[f.code];
  assert.equal(started.phase,'topic_check');assert.equal(started.roster.length,setup.playerCount);
  assert.notEqual(started.round.id,before.rooms[f.code].round.id);
  assert.ok(Object.values(started.scores).every(score=>score===0));
 });
}


test('optional Talk launcher applies saved homepage free conversation and player missions to canonical state',async t=>{
 const f=fixture(t);f.context.localStorage.setItem('lets-talk-settings.v2',JSON.stringify({gameMode:'crazy',conversationMode:'free',crazySource:'players',crazySeconds:60,mode:'think',seconds:30}));
 await f.launcher.launch('letstalk',2);const raw=f.db.get('rooms/ABC234/players/'+f.extras.letsTalkControlToken),state=raw.state;
 assert.equal(state.gameMode,'crazy');assert.equal(state.conversationMode,'free');assert.equal(state.crazy.source,'players');assert.equal(state.crazy.minSeconds,48);assert.equal(state.crazy.maxSeconds,72);
 const card=await f.refs[1].once();assert.equal(card.val().talk.conversationMode,'free');
});

test('optional Talk launcher propagates custom random intervals to the sealed service and every original card', async t => {
 const f=fixture(t); f.context.localStorage.setItem('lets-talk-settings.v2', JSON.stringify({
  gameMode:'crazy', conversationMode:'random', crazySource:'mixed', crazyMinSeconds:7, crazyMaxSeconds:233, mode:'write', seconds:23
 }));
 await f.launcher.launch('letstalk',2);
 const state=f.db.get('rooms/ABC234/players/'+f.extras.letsTalkControlToken).state;
 assert.equal(state.crazy.minSeconds,7); assert.equal(state.crazy.maxSeconds,233); assert.equal(state.seconds,23);
 for (const ref of f.refs) {
  const card=(await ref.once()).val();
  assert.equal(card.talk.crazy.minSeconds,7); assert.equal(card.talk.crazy.maxSeconds,233);
  assert.equal(card.talk.crazy.prompt,null); assert.equal(card.talk.crazy.myQueuedCount,0);
  assert.equal(card.talk.actions.crazySend,false);
 }
});
