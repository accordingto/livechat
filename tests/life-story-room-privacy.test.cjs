'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../room.js'),'utf8');
const traffic=source.slice(source.indexOf('  function detach() {'),source.indexOf('  /* .set() replaces'));
const init=source.slice(source.indexOf('  function init(options) {'),source.indexOf('  const api = {'));
const checks=source.slice(source.indexOf('  function sendCardCheck() {'),source.indexOf('  function revealCardCheck() {'))+source.slice(source.indexOf('  function sendButtonCheck() {'),source.indexOf('  function clearButtonCheck() {'));
const paths=[1,2,3].map(n=>'rooms/ROOM123/players/token-'+n);
const plain=n=>({game:'dixit',playerNum:n,dixit:{version:1,phase:'LOBBY',sessionId:'classic'}});
const life=n=>({game:'dixit',playerNum:n,dixit:{version:1,mode:'life_story',phase:'LOBBY',sessionId:'life',hand:[]}});
function fixture({initial={},synchronous=false,savedMode}={}){
  const refs=new Map(),received=[],snapshots=[],stored=[],data={};
  const saved={tokens:['token-1','token-2','token-3'],playerCount:3,names:['A','B','C'],...(savedMode?{dixitMode:savedMode}:{})};
  function ref(path){if(!refs.has(path))refs.set(path,{path,handlers:new Set(),oldHandlers:[],on(_event,handler){this.handlers.add(handler);if(synchronous&&initial[path]!==undefined)this.deliver(initial[path]);},off(_event,handler){this.handlers.delete(handler);this.oldHandlers.push(handler);},deliver(value){for(const handler of [...this.handlers]){snapshots.push(structuredClone(value));handler({val:()=>structuredClone(value)});}}});return refs.get(path);}
  const context=vm.createContext({cfg:{onPlayerData:(n,value)=>received.push([n,structuredClone(value)])},privateReads:true,listenerEpoch:0,listeners:[],data,on:()=>true,count:3,tokens:saved.tokens,sessionCode:'ROOM123',names:saved.names,db:{ref},checkNumbers:null,render(){},console,
    LAST_SESSION_KEY:'room-last-session',setExtra:(key,value)=>{saved[key]=value;stored.push([key,value]);},localStorage:{getItem:key=>key==='room-last-session'?'ROOM123':null},loadSessionData:()=>saved,clampCount:n=>n,generateSessionCode:()=> 'ROOM123',injectCSS(){},buildDOM(){},ensureTokens(){},save(){},document:{getElementById:()=>({})},api:{}});
  vm.runInContext(traffic+init+checks,context);
  return{context,refs,received,snapshots,stored,saved,data,deliver:(n,value)=>ref(paths[n-1]).deliver(value)};
}
test('original Room cards still subscribe individually and publish unchanged callbacks',()=>{
  const f=fixture();f.context.attach();assert.equal(f.refs.size,3);for(const n of [1,2,3])f.deliver(n,plain(n));assert.equal(f.received.length,3);assert.deepEqual(Object.values(f.data).map(p=>p.playerNum),[1,2,3]);assert.equal(f.context.privateReads,true);
});
test('first Life lobby observation detaches all manager listeners and clears cache before any private callback',()=>{
  const f=fixture();f.context.attach();f.deliver(1,plain(1));assert.equal(f.received.length,1);f.deliver(2,life(2));assert.equal(f.context.privateReads,false);assert.deepEqual(Object.keys(f.data),[]);assert.equal(f.received.length,1);assert.equal(f.saved.dixitMode,'life_story');for(const r of f.refs.values())assert.equal(r.handlers.size,0);
  for(const n of [1,2,3])f.deliver(n,{...life(n),dixit:{...life(n).dixit,phase:'PREPARE',hand:['secret-'+n]}});
  assert.equal(f.snapshots.filter(p=>p.dixit?.mode==='life_story').length,1,'only the empty opening projection arrived while a subscription existed');assert.equal(f.received.length,1);assert.deepEqual(Object.keys(f.data),[]);
});
test('synchronous initial Life snapshot stops the first listener and prevents subscribing later seats',()=>{
  const f=fixture({initial:{[paths[0]]:life(1)},synchronous:true});f.context.attach();assert.equal(f.refs.size,1);assert.equal(f.refs.get(paths[0]).handlers.size,0);assert.equal(f.received.length,0);assert.deepEqual(Object.keys(f.data),[]);
});
test('queued snapshots from detached Firebase listeners cannot repopulate answers or call the game',()=>{
  const f=fixture();f.context.attach();const handlers=[...f.refs.values()].map(r=>[...r.handlers][0]);f.context.setPrivateReads(false);for(const handler of handlers)handler({val:()=>({game:'dixit',dixit:{mode:'life_story',hand:['never-cache']}})});assert.deepEqual(Object.keys(f.data),[]);assert.equal(f.received.length,0);f.context.attach();assert([...f.refs.values()].every(r=>r.handlers.size===0));
});
test('saved Life metadata suppresses all private subscriptions on manager or Hub homepage refresh',()=>{
  for(const explicit of [false,true]){const f=fixture({savedMode:'life_story'});f.data[1]=plain(1);f.context.init({hideSetup:true,defaultCount:3,counts:[3,4],privateProjectionOnly:explicit});assert.equal(f.refs.size,0);assert.equal(f.context.privateReads,false);assert.equal(f.context.cfg.privateProjectionOnly,true);assert.deepEqual(Object.keys(f.data),[]);}
});
test('explicit privateProjectionOnly also blocks a new manager before any room subscriptions',()=>{
  const f=fixture();f.context.init({hideSetup:true,defaultCount:3,counts:[3,4],privateProjectionOnly:true});assert.equal(f.refs.size,0);assert.equal(f.received.length,0);
});
test('homepage card/button checks cannot fetch current private Life nodes through client transactions',()=>{
  const f=fixture({savedMode:'life_story'});f.context.init({hideSetup:true,defaultCount:3,counts:[3,4]});f.context.sendCardCheck();f.context.sendButtonCheck();assert.equal(f.refs.size,0,'no per-seat transaction is even opened');assert.equal(f.received.length,0);assert.deepEqual(Object.keys(f.data),[]);
});
test('reenabling after known original lobby replacement resumes original behavior; a surviving Life node blocks it again',()=>{
  const f=fixture({initial:{[paths[0]]:life(1)},synchronous:true});f.context.attach();f.context.setPrivateReads(true);assert.equal(f.context.privateReads,false);assert.equal(f.received.length,0);
  const normal=fixture();normal.context.attach();normal.context.setPrivateReads(false);normal.context.setPrivateReads(true);for(const n of [1,2,3])normal.deliver(n,plain(n));assert.equal(normal.received.length,3);assert.equal(normal.context.privateReads,true);
});
test('current Hub manager entry pages bust cached private-reading Room and old private host bridge scripts',()=>{
  for(const path of fs.readdirSync(require.resolve('../package.json').replace(/package\.json$/,'' )).filter(file=>file.endsWith('.html'))){const text=fs.readFileSync(require.resolve('../'+path),'utf8');if(/<script src="room\.js/.test(text))assert.match(text,/<script src="room\.js\?v=life-story-1"><\/script>/,path);if(/<script src="hub-executor\.js/.test(text))assert.match(text,/<script src="hub-executor\.js\?v=life-story-1"><\/script>/,path);}
  assert.match(fs.readFileSync(require.resolve('../play.html'),'utf8'),/dixit-card-host\.js\?v=life-story-1/);
});
test('frontend HTTP denies server question module and bank/prompt files while keeping service bundling dependencies',()=>{
  const config=JSON.parse(fs.readFileSync(require.resolve('../vercel.json'),'utf8'));
  const blocked=url=>config.routes.find(route=>route.src&&new RegExp(route.src).test(url))?.status===404;
  for(const url of ['/life-story-questions.cjs','/assets/life-story','/assets/life-story/life_story_questions.zh-TW.en.json','/assets/life-story/question_batch.schema.json','/assets/life-story/QUESTION_GENERATOR_PROMPT.md','/runtime/life-story-state.cjs'])assert.equal(blocked(url),true,url);
  for(const url of ['/api/hub-executor','/life-story-engine.js','/life-story-ui.js','/life-story.css','/assets/dixit-v2/d001.webp','/assets/dixit-expansion-1/d085.webp'])assert.equal(blocked(url),false,url);
  assert.equal(fs.existsSync(require.resolve('../life-story-questions.cjs')),true);
  assert.equal(fs.existsSync(require.resolve('../assets/life-story/QUESTION_GENERATOR_PROMPT.md')),true);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../.vercelignore'),'utf8'),/^life-story-questions\.cjs$|^assets\/life-story\/$/m,'deny HTTP routes rather than stripping runtime dependencies');
  const safe404=fs.readFileSync(require.resolve('../404.html'),'utf8');
  for(const route of config.routes.filter(route=>route.status===404))assert.equal(route.dest,'/404.html','status alone can return protected file bytes; denied routes must rewrite to a safe body');
  assert.match(safe404,/Page not found/);
  assert.doesNotMatch(safe404,/require\(|process\.env|exports\.|lifeRoom|QUESTION_GENERATOR_PROMPT|protectAdapter/);
});
