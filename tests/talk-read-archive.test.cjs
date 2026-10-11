
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../scripts/talk-read-archive.cjs');
const secret='a1'.repeat(32);
function fixture(records=[]) {
  const calls=[],factoryCalls=[];let stdout='',stderr='';
  const options={env:{CRAZY_TALK_ARCHIVE_SECRET:secret},stdout:value=>stdout+=value,stderr:value=>stderr+=value,
    storeFactory:config=>{factoryCalls.push(config);return{readRoom:async room=>{calls.push(room);return records;}};}};
  return {options,calls,factoryCalls,stdout:()=>stdout,stderr:()=>stderr,json:()=>JSON.parse(stdout)};
}
test('invalid, duplicated, missing or enumeration/path arguments never initialize a store',async()=>{
  for(const args of [[],['--room'],['--room','abc1'],['--room','ABC'],['--room','ABCDEFGHIJKLM'],['--room','../ABCD'],
    ['--room','https://example.test'],['--all'],['--room','ABCD','--room','EFGH'],['--room','ABCD','--limit','0'],
    ['--room','ABCD','--limit','201'],['--room','ABCD','--limit','1.5'],['--room','ABCD','--limit','1e2'],
    ['--room','ABCD','--date','2026-02-29'],['--room','ABCD','--date','2026-04-31'],['--room','ABCD','--date','2026-1-01'],
    ['--room','ABCD','--url','https://example.test'],['--room','ABCD','--database-url','https://example.test']]) {
    const f=fixture();assert.equal(await run(args,f.options),2);assert.equal(f.factoryCalls.length,0);
    assert.equal(f.calls.length,0);assert.equal(f.stdout(),'');assert.equal(f.stderr(),'Use --room CODE [--limit 1..200] [--date YYYY-MM-DD].\n');
  }
});
test('missing, sensitive-placeholder and malformed keys fail closed and never fall back to the Hub secret',async()=>{
  for(const value of [undefined,null,'','[SENSITIVE]','f'.repeat(63),'x'.repeat(64),secret+'\n']) {
    const f=fixture();f.options.env={CRAZY_TALK_ARCHIVE_SECRET:value,HUB_EXECUTOR_SECRET:secret};
    assert.equal(await run(['--room','ABCD'],f.options),1);assert.equal(f.factoryCalls.length,0);assert.equal(f.calls.length,0);
    assert.equal(f.stdout(),'');assert.equal(f.stderr(),'Archive key is unavailable.\n');
  }
});
test('reads exactly one room, caps recent chronological output and allowlists only challenge fields',async()=>{
  const privateFields={id:'private-id',ciphertext:'cipher-value',controlToken:'control-secret',capsule:'capsule-secret',nested:{token:'private-path'}};
  const records=[{text:'newest',kind:'task',status:'done',createdAt:3000,assignedAt:3100,closedAt:3200,author:{playerNum:1,name:'Alex'},recipient:{playerNum:3,name:'Jo'},target:{playerNum:3,name:'Random'},topic:{title:'Internal title',question:'Which restaurant?'},...privateFields},
    {text:'oldest',kind:'line',status:'queued',createdAt:1000,...privateFields},{text:'middle',kind:'task',status:'skipped',createdAt:2000,authorName:{secret},...privateFields}];
  const f=fixture(records);
  assert.equal(await run(['--limit','2','--room','ROOM42'],f.options),0);assert.deepEqual(f.calls,['ROOM42']);assert.equal(f.factoryCalls.length,1);
  assert.equal(f.factoryCalls[0].secret,secret);
  assert.deepEqual(f.json(),{room:'ROOM42',count:2,total:3,records:[
    {text:'middle',kind:'task',status:'skipped',createdAt:2000,assignedAt:null,closedAt:null,authorName:null,recipientName:null,targetName:null,topicQuestion:null},
    {text:'newest',kind:'task',status:'done',createdAt:3000,assignedAt:3100,closedAt:3200,authorName:'Alex',recipientName:'Jo',targetName:'Random',topicQuestion:'Which restaurant?'}]});
  for(const value of [...Object.values(privateFields).filter(v=>typeof v==='string'),secret])assert.ok(!f.stdout().includes(value));
  assert.equal(f.stderr(),'');assert.deepEqual(records.map(record=>record.text),['newest','oldest','middle']);
});
test('default limit is 100, max is 200 and equal-timestamp order remains chronological and stable',async()=>{
  const records=Array.from({length:220},(_,i)=>({text:'card '+i,createdAt:Math.floor(i/2)*1000}));
  for(const [args,limit] of [[['--room','A123'],100],[['--room','A123','--limit','200'],200]]) {
    const f=fixture(records);assert.equal(await run(args,f.options),0);
    assert.equal(f.json().count,limit);assert.equal(f.json().total,220);
    assert.equal(f.json().records[0].text,'card '+(220-limit));assert.equal(f.json().records.at(-1).text,'card 219');
  }
});
test('Taiwan date uses inclusive midnight and exclusive next midnight, excluding unknown creation',async()=>{
  const start=Date.parse('2026-10-10T00:00:00+08:00'),end=Date.parse('2026-10-11T00:00:00+08:00');
  const records=[{text:'before',createdAt:start-1},{text:'opening',createdAt:start},{text:'closing',createdAt:end-1},{text:'after',createdAt:end},
    {text:'unknown'},{text:'string timestamp',createdAt:String(start)},{text:'infinite',createdAt:Infinity}];
  const f=fixture(records);assert.equal(await run(['--room','TW2026','--date','2026-10-10'],f.options),0);
  assert.deepEqual(f.calls,['TW2026']);assert.equal(f.json().total,2);assert.equal(f.json().count,2);
  assert.deepEqual(f.json().records.map(record=>record.text),['opening','closing']);
  assert.equal(f.json().records[0].createdAt,Date.parse('2026-10-09T16:00:00Z'));
});
test('valid leap day works and unknown creation is represented by null without a date filter',async()=>{
  const time=Date.parse('2024-02-29T08:00:00+08:00'),f=fixture([{text:'unknown',createdAt:'bad'},{text:'leap day',createdAt:time}]);
  assert.equal(await run(['--room','LEAP'],f.options),0);assert.equal(f.json().records[0].createdAt,null);
  const dated=fixture([{text:'unknown',createdAt:null},{text:'leap day',createdAt:time}]);
  assert.equal(await run(['--room','LEAP','--date','2024-02-29'],dated.options),0);
  assert.deepEqual(dated.json().records.map(record=>record.text),['leap day']);
});
test('transport forces no redirects or browser credentials and a bounded abort signal',async()=>{
  const f=fixture(),controller=new AbortController();let transport;
  f.options.fetchImpl=async(url,init)=>{transport={url,init};return{ok:true};};
  f.options.storeFactory=config=>({readRoom:async room=>{
    await config.fetchImpl('https://example.test/private/'+room,{redirect:'follow',credentials:'include',method:'GET',signal:controller.signal});
    return[];
  }});
  assert.equal(await run(['--room','SAFE'],f.options),0);
  assert.equal(transport.url,'https://example.test/private/SAFE');assert.equal(transport.init.redirect,'error');
  assert.equal(transport.init.credentials,'omit');assert.equal(transport.init.method,'GET');
  assert.ok(transport.init.signal instanceof AbortSignal);assert.notEqual(transport.init.signal,controller.signal);
  assert.equal(transport.init.signal.aborted,false);controller.abort();assert.equal(transport.init.signal.aborted,true);
});
test('store creation/read failures and malformed results expose no key, private URL or raw error',async()=>{
  for(const mode of ['factory','read','malformed']) {
    const f=fixture();f.options.storeFactory=()=>{
      if(mode==='factory')throw Error(secret+' https://private.test/root/private-id');
      return{readRoom:async room=>{f.calls.push(room);if(mode==='malformed')return{ciphertext:secret};throw Error(secret+' https://private.test/root/private-id');}};
    };
    assert.equal(await run(['--room','FAIL1'],f.options),1);assert.equal(f.stdout(),'');assert.equal(f.stderr(),'Archive read failed.\n');
    assert.ok(!f.stderr().includes(secret));assert.ok(!f.stderr().includes('private.test'));assert.ok(!f.stderr().includes('private-id'));
    assert.equal(f.calls.length,mode==='factory'?0:1);
  }
});


test('real encrypted store integration reads one synthetic room with GET only and unwraps names/topic safely',async()=>{
  const {createStore}=require('../runtime/talk-archive-store.cjs');
  const nodes=new Map(),requests=[];
  const memoryFetch=async(url,init={})=>{
    assert.equal(new URL(url).origin,'http://localhost');requests.push({url,method:init.method});
    if(init.method==='PUT'){nodes.set(url,JSON.parse(init.body));return{ok:true,status:200};}
    assert.equal(init.method,'GET');return{ok:true,status:200,headers:new Headers({etag:'"memory"'}),json:async()=>structuredClone(nodes.get(url)||null)};
  };
  const writer=createStore({secret,fetchImpl:memoryFetch,databaseURL:'http://localhost'});
  await writer.writeRoom('SYNTH1',[{id:'submission-one',version:1,text:'Pretend to be a tiny chicken.',kind:'task',status:'done',
    createdAt:1000,assignedAt:2000,closedAt:3000,author:{playerNum:1,name:'Alex'},target:null,recipient:{playerNum:2,name:'Sam'},
    topic:{title:'Cafe',question:'Invent a funny cafe.'},sessionId:'private-session'}]);
  await writer.writeRoom('SYNTH2',[{id:'submission-two',version:1,text:'Different room.',kind:'line',status:'queued',createdAt:1000}]);
  requests.length=0;const f=fixture();f.options.fetchImpl=memoryFetch;
  f.options.storeFactory=options=>createStore({...options,databaseURL:'http://localhost'});
  assert.equal(await run(['--room','SYNTH1'],f.options),0);assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');
  assert.deepEqual(f.json(),{room:'SYNTH1',count:1,total:1,records:[{text:'Pretend to be a tiny chicken.',kind:'task',status:'done',
    createdAt:1000,assignedAt:2000,closedAt:3000,authorName:'Alex',recipientName:'Sam',targetName:null,topicQuestion:'Invent a funny cafe.'}]});
  assert.doesNotMatch(f.stdout(),/private-session|submission-one|submission-two|Different room|cipher|Cafe/);
});
