// Use the shipped card-check handler; expanding a live table must not race its first new-seat projection.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../room.js'),'utf8');
const handler=source.slice(source.indexOf('  function sendCardCheck() {'),source.indexOf('  function revealCardCheck() {'));
function fixture(data){const writes=[],nodes=new Map(),context=vm.createContext({on:()=>true,count:4,data,names:['A','B','C','New'],tokens:['a','b','c','d'],sessionCode:'TEST',GAME_DATA:{forbidden:Array.from({length:8},(_,i)=>({word:'word'+i,emoji:'x'}))},render(){},db:{ref:path=>({transaction(fn){const next=fn(nodes.get(path)||null);if(next!==undefined){nodes.set(path,next);writes.push(next);}}})}});vm.runInContext(handler,context);return{context,writes,nodes};}
for(const game of ['dixit','onceupon','bluffking','cut','openmic','letstalk'])test(game+' active cards protect the still-empty newcomer from a card-check race',()=>{const f=fixture({1:{game,playerNum:1}});f.context.sendCardCheck();assert.equal(f.writes.length,0);});
test('an ordinary new Hub still sends individual check cards',()=>{const f=fixture({});f.context.sendCardCheck();assert.equal(f.writes.length,4);assert.deepEqual(f.writes.map(row=>row.playerNum),[1,2,3,4]);assert.equal(new Set(f.writes.map(row=>row.word)).size,4);});
