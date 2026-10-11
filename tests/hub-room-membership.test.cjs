// Exercise the actual shipped handlers: stale homepages cannot replace a live game or a newcomer.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../room.js'),'utf8');
const cardHandler=source.slice(source.indexOf('  function sendCardCheck() {'),source.indexOf('  function revealCardCheck() {'));
const buttonHandler=source.slice(source.indexOf('  function sendButtonCheck() {'),source.indexOf('  function clearButtonCheck() {'));
const setupHandlers=source.slice(source.indexOf('  function setCount(n) {'),source.indexOf('  /* ── Firebase traffic ── */'));
const games=['dixit','onceupon','bluffking','cut','openmic','letstalk'];
function fixture(data={},remote={}){
 const writes=[],nodes=new Map(Object.entries(remote).map(([number,value])=>['rooms/TEST/players/'+['a','b','c','d'][Number(number)-1],structuredClone(value)]));
 const context=vm.createContext({on:()=>true,count:4,data,names:['A','B','C','New'],tokens:['a','b','c','d'],sessionCode:'TEST',
  checkWords:[{word:'stale'}],checkRevealed:true,checkNumbers:null,checkButtonId:'',GAME_DATA:{forbidden:Array.from({length:8},(_,i)=>({word:'word'+i,emoji:'x'}))},render(){},
  publish(){assert.fail('card checks must not use unconditional publication');},
  db:{ref:path=>({transaction(fn,onComplete,applyLocally){assert.equal(applyLocally,false);const next=fn(nodes.get(path)||null);if(next!==undefined){nodes.set(path,next);writes.push(next);}},set(){assert.fail('card checks must not replace a node without checking current game');}})}});
 vm.runInContext(cardHandler+buttonHandler,context);return{context,writes,nodes};
}
for(const game of games)test(game+' active cards protect the still-empty newcomer from both check races even with a retained Reveal state',()=>{
 for(const type of ['sendCardCheck','sendButtonCheck']){const f=fixture({1:{game,playerNum:1}},{1:{game,playerNum:1,sessionId:'current'}});f.context[type]();assert.equal(f.writes.length,0);assert.equal(f.nodes.has('rooms/TEST/players/d'),false);}
});

for(const game of games)test(game+' remote game publication wins both per-node transactions when the retained homepage cache is stale',()=>{
 for(const type of ['sendCardCheck','sendButtonCheck']){const saved={game,playerNum:1,sessionId:'current',privateSafe:true},f=fixture({}, {1:saved});f.context[type]();assert.equal(f.writes.length,3);assert.deepEqual(f.nodes.get('rooms/TEST/players/a'),saved);}
});

test('an ordinary new Hub still sends individual check cards',()=>{const f=fixture();f.context.sendCardCheck();assert.equal(f.writes.length,4);assert.deepEqual(f.writes.map(row=>row.playerNum),[1,2,3,4]);assert.equal(new Set(f.writes.map(row=>row.word)).size,4);assert.equal(f.context.checkRevealed,false);});

test('an ordinary Hub still sends three usable shared buttons and keeps each exact player identity',()=>{
 const f=fixture();f.context.sendButtonCheck();assert.equal(f.writes.length,4);assert.deepEqual(f.writes.map(row=>row.playerNum),[1,2,3,4]);assert.deepEqual(f.writes.map(row=>row.name),['A','B','C','New']);
 assert.equal(new Set(f.writes.map(row=>row.id)).size,1);const numbers=Array.from(f.writes[0].numbers).sort((a,b)=>a-b);assert.equal(new Set(numbers).size,3);assert.ok(numbers.every(n=>Number.isInteger(n)&&n>=10&&n<=99));
 for(const row of f.writes){assert.equal(row.game,'buttoncheck');assert.deepEqual(Array.from(row.numbers).sort((a,b)=>a-b),numbers);}
});

for(const action of ['setCount','loadRoomCode','newRoom'])test(action+' clears the old Reveal flag together with its stale check answers and buttons',()=>{
 const context=vm.createContext({count:4,checkWords:[{word:'stale'}],checkRevealed:true,checkNumbers:[12,34,56],checkButtonId:'old-id',sessionCode:'TEST',tokens:['a'],names:['Old'],cfg:{},
  document:{querySelectorAll:()=>[],getElementById:()=>({value:'NEW234'})},on:()=>true,ensureTokens(){},save(){},attach(){},render(){},loadSessionData:()=>null,generateSessionCode:()=> 'NEW567',clampCount:n=>n});
 vm.runInContext(setupHandlers,context);if(action==='setCount')context.setCount(5);else context[action]();
 assert.equal(context.checkRevealed,false);assert.equal(context.checkWords,null);assert.equal(context.checkNumbers,null);assert.equal(context.checkButtonId,'');
});

test('loading a saved Hub count also clears the previous Reveal state',()=>{
 const context=vm.createContext({count:4,checkWords:[{}],checkRevealed:true,checkNumbers:[12],checkButtonId:'old-id',sessionCode:'TEST',tokens:[],names:[],cfg:{},
  document:{querySelectorAll:()=>[],getElementById:()=>({value:'NEW234'})},on:()=>true,ensureTokens(){},save(){},attach(){},render(){},loadSessionData:()=>({playerCount:5,tokens:['a'],names:['Saved']}),generateSessionCode:()=> 'NEW567',clampCount:n=>n});
 vm.runInContext(setupHandlers,context);context.loadRoomCode();assert.equal(context.count,5);assert.equal(context.checkRevealed,false);assert.equal(context.checkWords,null);
});
