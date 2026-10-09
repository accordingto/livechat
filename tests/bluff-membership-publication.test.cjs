// Exercise the shipped manager publication helper after the sealed service marks a member away.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../bluff-king-ui.js'),'utf8');
const publish=source.slice(source.indexOf('  async function connectLegacy(){'),source.indexOf('  function rules(){'));
const matches=source.slice(source.indexOf('  function matchesSlot('),source.indexOf('  async function deferHub('));
test('reopening the manager never republishes an away original card now used by another game',async()=>{
 const tokens=['first-original','second-original','third-original'];const setup={playerCount:3,tokens,names:['First','Away','Third']};
 const sessions=tokens.map((originalToken,i)=>({originalToken,name:setup.names[i],credential:{version:2,room:'TEST',token:'private-'+i,identityId:'identity-'+i,historyToken:'history-'+i}}));
 const nodes=new Map(sessions.map((seat,i)=>['/rooms/TEST/players/'+tokens[i],{game:'bluffking',playerNum:i+1,name:seat.name,bluff:seat.credential}]));
 const foreign={game:'scene',playerNum:2,name:'Away',round:123};nodes.set('/rooms/TEST/players/'+tokens[1],foreign);
 const reads=[],writes=[];const context=vm.createContext({ROOM:{enabled:true,code:'TEST',publish(){throw Error('unexpected broad publication');}},code:'TEST',hubMode:true,setup,hubSources:tokens.map(token=>({path:'/rooms/TEST/players/'+token,stamp:'same'})),checkHubSetup(){},sourceStamp:()=> 'same',t:key=>key,window:{},client:{executorTicket:{capsule:'current'},lastView:{room:'TEST',sharedControls:true,self:{isHost:true},players:[{playerNum:1,active:true},{playerNum:2,active:false},{playerNum:3,active:true}]},getCardSessions:async()=>sessions,_request:async(path,input={})=>{reads.push(path);if(input.method){writes.push(path);throw Error('Unexpected overwrite');}return{data:nodes.get(path),etag:'exact'};}}});
 vm.runInContext(matches+publish,context);assert.equal(await context.connectLegacy(),true);assert.equal(writes.length,0);assert.deepEqual(nodes.get('/rooms/TEST/players/'+tokens[1]),foreign);assert.ok(reads.length>=2);
});
