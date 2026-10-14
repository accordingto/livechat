'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createStore}=require('../runtime/talk-archive-store.cjs');
function storage(){let value=null,version=0;const fetchImpl=async(url,options={})=>{if((options.method||'GET')==='GET')return{ok:true,status:200,headers:new Headers({etag:'"'+version+'"'}),json:async()=>value==null?null:structuredClone(value)};if(new Headers(options.headers).get('if-match')!=='"'+version+'"')return{ok:false,status:412,headers:new Headers()};value=JSON.parse(options.body);version++;return{ok:true,status:200,headers:new Headers()}};return{store:createStore({secret:'82'.repeat(32),databaseURL:'http://localhost',fetchImpl}),get:()=>value}}
const owner='ab'.repeat(32),vault=(version=1)=>({id:'vault:'+owner+':card-1',category:'vault',ownerIdentity:owner,cardId:'card-1',kind:'task',text:'Praise your spoon.',target:'random',status:'saved',version,createdAt:1000,updatedAt:1000+version});
test('vNext private vault roundtrips encrypted owner identity, version and tombstone',async()=>{const f=storage();await f.store.writeRoom('VNSTORE',[vault()]);let records=await f.store.readRoom('VNSTORE');assert.equal(records[0].ownerIdentity,owner);assert.equal(records[0].cardId,'card-1');assert.ok(!JSON.stringify(f.get()).includes('Praise your spoon.'));assert.ok(!JSON.stringify(f.get()).includes(owner));await f.store.writeRoom('VNSTORE',[{...vault(2),deleted:true,status:'deleted'}]);await f.store.writeRoom('VNSTORE',[vault()]);records=await f.store.readRoom('VNSTORE');assert.equal(records[0].status,'deleted');assert.equal(records[0].version,2);assert.equal(records[0].deleted,true)});
test('vNext structured system diagnostic has bounded whitelisted metadata and no prompt text',async()=>{const f=storage();const record={id:'event:1',category:'event',kind:'task',text:'render_unconfirmed',eventType:'render_unconfirmed',source:'system',actor:2,recipientNum:2,promptId:'session:prompt:1',reason:'display_timeout',status:'done',version:1,createdAt:31000,rawToken:'SECRET',body:{secret:'SECRET'}};await f.store.writeRoom('VNSTORE',[record]);const restored=(await f.store.readRoom('VNSTORE'))[0];assert.equal(restored.eventType,'render_unconfirmed');assert.equal(restored.source,'system');assert.equal(restored.reason,'display_timeout');assert.equal(restored.recipientNum,2);assert.equal(restored.rawToken,undefined);assert.equal(restored.body,undefined);assert.ok(!JSON.stringify(f.get()).includes('render_unconfirmed'));assert.ok(!JSON.stringify(f.get()).includes('SECRET'))});
test('vNext vault owner binding rejects malformed hashes before touching storage',async()=>{const f=storage();await assert.rejects(f.store.writeRoom('VNSTORE',[{...vault(),ownerIdentity:'player-name'}]),{code:'archive_invalid_record'});assert.equal(f.get(),null)});

test('vNext vault normalization is idempotent for duplicate batches and durable exact retries',async()=>{
 for(const target of ['random',2]) { const f=storage(),record={...vault(),target};
  await f.store.writeRoom('VNSTORE',[record,{...record}]);
  await f.store.writeRoom('VNSTORE',[record]);
  const restored=(await f.store.readRoom('VNSTORE'))[0];assert.equal(restored.targetNum,target==='random'?null:2);
  await f.store.writeRoom('VNSTORE',[restored]);assert.equal((await f.store.readRoom('VNSTORE')).length,1);
 }
});
