// Fresh disposable membership QA. No room listing, real-room access, secret
// loading or credential output. Live execution requires an explicit CLI flag.
'use strict';
const crypto = require('node:crypto');
const engines = { cut: require('../cut-engine.js'), openmic: require('../open-mic-engine.js'),
  dixit: require('../dixit-engine.js'), onceupon: require('../once-upon-a-time-engine.js'), letstalk: require('../talk-engine.js') };
const BF = require('../bluff-king-engine.js');
const BA = require('../runtime/bluff-executor.cjs').adapters.bluffking;
const topics = require('../bluff-king-topics.js');
const fields = { cut: 'cut', openmic: 'openmic', dixit: 'dixit', onceupon: 'once', letstalk: 'talk' };
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const uid = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {}).filter(x => x != null);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const ordered = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(ordered) : Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])) : value;
const must = condition => { if (!condition) throw new Error('membership_smoke_failed'); };
function decode(f, raw) {
  return f.game === 'bluffking' ? BA.decode(raw) : raw.state || JSON.parse(raw.stateJson);
}
function genericFixture(game, now) {
  const engine = engines[game], code = 'HM' + uid(4).toUpperCase(), marker = uid(), controlToken = uid(16);
  const originals = Array.from({ length: 4 }, (_, i) => ({ playerNum: i + 1, originalToken: uid(10), name: 'Disposable participant ' + (i + 1) }));
  const seats = originals.slice(0, 3).map(p => ({ playerNum: p.playerNum, token: p.originalToken }));
  let state = engine.create({ id: code + ':' + game, roster: originals.slice(0,3), now, seed: 713,
    topic: { id: 'qa-membership-topic', question: 'Invent a welcoming place.', followUps: ['Who visits?'] },
    seconds: 120, gameSeconds: 600, gameMode: 'normal', conversationMode: 'assigned',
    speed: 'custom', category: 'mixed', customMinSeconds: 60, customMaxSeconds: 60 });
  let count = 0;
  const act = (type, actor = 0, extra = {}) => state = engine.apply(state, { id: 'qa-initial-' + ++count, type, actor, now, seed: 713 + count,
    sessionId: state.sessionId, turnId: state.turnId, ...extra });
  if (game === 'dixit') { act('deal',0,{firstPlayerNum:1}); state.scores[1] = 6; }
  if (game === 'onceupon') { act('deal'); act('chooseFirst',0,{playerNum:1}); }
  if (game === 'letstalk') { act('start'); state.scores[1] = 6; }
  if (game === 'cut') act('begin');
  const canonicalPath = 'rooms/' + code + '/players/' + controlToken;
  return { game, engine, code, marker, controlToken, originals, seats, state, sessionId: state.sessionId, canonicalPath, known: new Map(), attempted: new Set() };
}
function bluffFixture(now) {
  const game = 'bluffking', code = 'HM' + uid(4).toUpperCase(), marker = uid(), controlToken = uid(32), hostId = uid(20), state = BF.blankStore();
  let seq = 0; const options = { now, rng: () => 0, uuid: () => 'qa-member-' + ++seq };
  BF.applyCommand(state,hostId,{room:code,action:'create',name:'Disposable manager',participate:false},topics,options);
  const originals = Array.from({length:4},(_,i)=>({playerNum:i+1,originalToken:uid(10),name:'Disposable participant '+(i+1)}));
  const seats = [], cardRoster = [], members = {[hostId]:{token:controlToken,historyToken:uid(32)}};
  for (const row of originals.slice(0,3)) {
    const identityId = uid(20), token = uid(32), historyToken = uid(32);
    BF.applyCommand(state,identityId,{room:code,action:'join',name:row.name,participate:true},topics,options);
    const member = state.rooms[code].members.at(-1); member.playerNum = row.playerNum;
    seats.push({playerNum:row.playerNum,token}); members[identityId] = {token,historyToken};
    cardRoster.push({...row,identityId,token,historyToken,playerId:member.id});
  }
  state.transport = { members, cardRoster, accepted:{}, acknowledgements:{}, executorSessionId: code+':bluffking', publicationRevision:0 };
  state.rooms[code].sharedControls = true;
  const action = action => { const room=state.rooms[code]; BF.applyCommand(state,hostId,{room:code,action,commandId:'qa-initial-'+String(++seq).padStart(14,'0'),expectedVersion:room.version,roundId:room.round?.id},topics,options); };
  action('start'); action('confirmTopic'); action('beginDiscussion');
  state.rooms[code].scores[state.rooms[code].roster[0]]=6;
  BA.pulse(state,{code,now,seats,onlineNums:[1,2,3]});
  return {game,code,marker,controlToken,originals,seats,state,sessionId:state.transport.executorSessionId,
    canonicalPath:'rooms/bluffking-'+code+'/players/'+controlToken,known:new Map(),attempted:new Set()};
}
async function run({ fetchImpl = globalThis.fetch, now = Date.now, gameNames = [...Object.keys(engines),'bluffking'] } = {}) {
  const fixtures = [], report = {ok:false,passed:0,step:'initial',games:[],cleanup:{tracked:0,deleted:0,empty:0,failed:0}};
  const check = (condition,g) => {must(condition);report.passed++;if(g)g.passed++;};
  const http = (url, options={}) => fetchImpl(url,{credentials:'omit',signal:AbortSignal.timeout(65000),...options});
  async function api(body, error='') {
    const response=await http(SERVICE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}), data=await response.json();
    if(error){must(!response.ok && data.error===error);return data;}must(response.ok && data.ok!==false);return data;
  }
  async function readPath(f,path) {
    must(f.known.has(path));const response=await http(DATABASE+'/'+path+'.json',{headers:{'X-Firebase-ETag':'true'}});must(response.ok);
    const etag=response.headers.get('etag');must(etag);return {value:await response.json(),etag};
  }
  function marker(f) { return {marker:f.marker,game:f.game}; }
  function addPath(f,path,kind,extra={}) { must(!f.known.has(path));f.known.set(path,{kind,...extra});return path; }
  function originalPath(f,n) {return 'rooms/'+f.code+'/players/'+f.originals[n-1].originalToken;}
  function seatPath(f,n) {return 'rooms/'+(f.game==='bluffking'?'bluffking-':'')+f.code+'/players/'+f.seats[n-1].token;}
  function ownedRoot(f,node) {if(!node || node.qaMembership?.marker!==f.marker || node.qaMembership.game!==f.game || node.game!==f.game)return false;try{return (f.game==='bluffking'?BA.session(decode(f,node)):decode(f,node).sessionId)===f.sessionId;}catch{return false;}}
  function ownedNode(f,path,node,state,raw) {
    const info=f.known.get(path);if(!info || !node)return false;
    if(info.kind==='canonical')return ownedRoot(f,node);
    if(info.kind==='history') {
      if(!ownedRoot(f,raw) || !state.transport?.members[info.identityId] || state.transport.members[info.identityId].historyToken!==info.historyToken)return false;
      const expected=state.identities[info.identityId]||{known:{},seen:{}};
      return Object.keys(node).every(key=>['known','seen'].includes(key)) && same(ordered(node.known||{}),ordered(expected.known||{})) && same(ordered(node.seen||{}),ordered(expected.seen||{}));
    }
    if(info.kind==='original' && f.game==='bluffking') {
      const row=state.transport?.cardRoster?.find(p=>p.originalToken===f.originals[info.num-1].originalToken);
      return node.qaMembership?.marker===f.marker && node.qaMembership.game===f.game && (node.game==='scene' && node.playerNum===info.num || row && node.game==='bluffking' && node.playerNum===info.num && node.bluff?.token===row.token && node.bluff?.identityId===row.identityId && node.bluff?.historyToken===row.historyToken && node.bluff?.room===f.code);
    }
    if(info.kind==='private' && f.game==='bluffking') {
      const row=state.transport?.cardRoster?.[info.num-1];
      if(!ownedRoot(f,raw) || !row || row.token!==info.token || node.sessionBinding?.room!==f.code || node.sessionBinding.identityId!==row.identityId || node.sessionBinding.historyToken!==row.historyToken)return false;
      if(info.created && node.qaMembership?.marker===f.marker)return true;
      return node.hubExecutor?.v===1 && node.hubExecutor.game===f.game && node.hubExecutor.sessionId===f.sessionId && node.hubExecutor.capsule===raw.executor.capsule;
    }
    return node.qaMembership?.marker===f.marker && node.qaMembership.game===f.game && node.game===f.game && node.playerNum===info.num && node[fields[f.game]]?.sessionId===f.sessionId || node.qaMembership?.marker===f.marker && node.game==='scene' && node.playerNum===info.num;
  }
  async function create(f,path,value) {
    const snapshot=await readPath(f,path);must(snapshot.value===null);f.attempted.add(path);
    const response=await http(DATABASE+'/'+path+'.json',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':snapshot.etag},body:JSON.stringify(value)});must(response.ok);
  }
  async function canonical(f) {const raw=(await readPath(f,f.canonicalPath)).value;must(ownedRoot(f,raw));return {raw,state:decode(f,raw)};}
  function discover(f,state) {
    must(f.game==='bluffking' && state.transport.executorSessionId===f.sessionId);
    const room=state.rooms[f.code];must(room.code===f.code && state.transport.cardRoster.length<=4);
    for(const row of state.transport.cardRoster) {
      must(row.playerNum>=1 && row.playerNum<=4 && row.originalToken===f.originals[row.playerNum-1].originalToken && /^[a-f0-9]{64}$/.test(row.token) && /^[a-f0-9]{64}$/.test(row.historyToken) && /^[a-f0-9]{40}$/.test(row.identityId));
      must(state.transport.members[row.identityId]?.token===row.token && state.transport.members[row.identityId]?.historyToken===row.historyToken && room.members.some(p=>p.identityId===row.identityId));
      f.seats[row.playerNum-1]={playerNum:row.playerNum,token:row.token};
      const path=seatPath(f,row.playerNum);if(!f.known.has(path)){addPath(f,path,'private',{num:row.playerNum,token:row.token});f.attempted.add(path);}
    }
    for(const [identityId,binding] of Object.entries(state.transport.members)) {
      must(/^[a-f0-9]{40}$/.test(identityId) && /^[a-f0-9]{64}$/.test(binding.historyToken));
      const path='rooms/bluff-identities/players/'+binding.historyToken;if(!f.known.has(path)){addPath(f,path,'history',{identityId,historyToken:binding.historyToken});f.attempted.add(path);}
    }
  }
  async function card(f,n) {
    const {raw,state}=await canonical(f);if(f.game==='bluffking')discover(f,state);
    const path=seatPath(f,n),node=(await readPath(f,path)).value;must(ownedNode(f,path,node,state,raw));
    must(node.hubExecutor?.v===1 && node.hubExecutor.game===f.game && node.hubExecutor.sessionId===f.sessionId);
    const view=f.game==='bluffking'?JSON.parse(node.viewJson):node[fields[f.game]];must(view.sharedControls===true);
    const text=JSON.stringify(node);must(!text.includes(f.controlToken));
    for(const s of f.seats)if(s.playerNum!==n)must(!text.includes(JSON.stringify(s.token)));
    return {node,view,raw,state};
  }
  async function execute(f,n,command,cap) {
    const before=await card(f,n);await api({operation:'execute',capsule:cap||before.node.hubExecutor.capsule,token:f.seats[n-1].token,...(command?{command}:{})});return card(f,n);
  }
  async function command(f,n,type,extra={},cap) {
    const before=await card(f,n);
    const input=f.game==='bluffking'?{action:type,commandId:'qa-command-'+uid(),expectedVersion:before.state.rooms[f.code].version,roundId:before.state.rooms[f.code].round?.id,...extra}:
      {id:'qa-command-'+uid(),type,sessionId:f.sessionId,turnId:before.view.turnId,...extra};
    const after=await execute(f,n,input,cap);
    if(f.game==='bluffking')must(after.node.ack?.commandId===input.commandId && after.node.ack.ok===true);
    else must(after.view.reply?.id===input.id && !after.view.reply.error);
    return after;
  }
  function rows(f,view) {return f.game==='bluffking'?view.players.filter(p=>p.playerNum>0):list(view.roster);}
  async function open(f) {
    addPath(f,f.canonicalPath,'canonical');
    await create(f,f.canonicalPath,{game:f.game,...(f.game==='bluffking'?{data:JSON.stringify(f.state)}:{stateJson:JSON.stringify(f.state)}),revision:1,qaMembership:marker(f)});
    for(const row of f.originals.slice(0,3)) {
      const path=originalPath(f,row.playerNum);addPath(f,path,'original',{num:row.playerNum,created:true});
      if(f.game==='bluffking') {
        const bound=f.state.transport.cardRoster[row.playerNum-1];await create(f,path,{game:f.game,playerNum:row.playerNum,name:row.name,bluff:{version:2,room:f.code,token:bound.token,identityId:bound.identityId,historyToken:bound.historyToken},qaMembership:marker(f)});
        const privatePath=seatPath(f,row.playerNum);addPath(f,privatePath,'private',{num:row.playerNum,token:bound.token,created:true});await create(f,privatePath,{...BA.project(f.state,f.seats[row.playerNum-1],{code:f.code,now:now(),seats:f.seats,onlineNums:[1,2,3]}),qaMembership:marker(f)});
      } else await create(f,path,{...f.engine.view(f.state,row.playerNum,now()),qaMembership:marker(f)});
    }
    if(f.game==='bluffking') {
      discover(f,f.state);for(const [path,info] of f.known)if(info.kind==='history'){f.attempted.delete(path);await create(f,path,{known:f.state.identities[info.identityId]?.known||{},seen:f.state.identities[info.identityId]?.seen||{}});}
    }
    const result=await api({operation:'register',game:f.game,code:f.code,controlToken:f.controlToken,sessionId:f.sessionId,seats:f.seats});must(result.capsule);
    return card(f,1);
  }
  try {
    const health=await http(SERVICE),readiness=await health.json();must(health.ok && readiness.ready===true);
    const serverTime=Date.parse(health.headers.get('date')), initialClientTime=now(), initialTime=Number.isFinite(serverTime)?serverTime-1000:initialClientTime-1000;
    for(const game of gameNames) {
      must(Object.hasOwn(engines,game)||game==='bluffking');report.step=game+':open';const f=game==='bluffking'?bluffFixture(initialTime+now()-initialClientTime):genericFixture(game,initialTime+now()-initialClientTime);fixtures.push(f);
      const g={game,passed:0,ok:false};report.games.push(g);let before=await open(f);const oldCap=before.node.hubExecutor.capsule,oldSession=f.sessionId,beforeState=before.state;
      check(rows(f,before.view).length===3,g);
      const fourth=originalPath(f,4);addPath(f,fourth,'original',{num:4,created:true});await create(f,fourth,{game:'scene',playerNum:4,name:f.originals[3].name,qaMembership:marker(f)});
      report.step=game+':admit';const admitted=await api({operation:'updateRoster',capsule:before.raw.executor.capsule,token:f.controlToken,commandId:'qa-membership-'+uid(),roster:f.originals,hubCount:4});
      check(admitted.ok===true && admitted.sessionId===oldSession && admitted.capsule!==oldCap,g);
      const latest=await canonical(f);if(game==='bluffking')discover(f,latest.state);else f.seats.push({playerNum:4,token:f.originals[3].originalToken});
      const afterState=latest.state;check((game==='bluffking'?afterState.transport.executorSessionId:afterState.sessionId)===oldSession,g);
      for(let n=1;n<=3;n++) {
        if(beforeState.hands)check(same(afterState.hands?.[n]||[],beforeState.hands[n]||[]),g);
        if(beforeState.endings)check(afterState.endings?.[n]===beforeState.endings[n],g);
        if(beforeState.scores)check((afterState.scores?.[n]||0)===(beforeState.scores[n]||0),g);
        const current=await card(f,n);check(current.node.hubExecutor.capsule===admitted.capsule,g);
      }
      if(game==='bluffking'){const oldRoom=beforeState.rooms[f.code],newRoom=afterState.rooms[f.code];check(same(oldRoom.scores,Object.fromEntries(Object.entries(newRoom.scores).filter(([id])=>oldRoom.roster.includes(id)))),g);check(same(oldRoom.history,newRoom.history),g);check(newRoom.round.id===oldRoom.round.id && same(newRoom.round.playerIds,oldRoom.round.playerIds),g);}
      let newcomer=await card(f,4);check(rows(f,newcomer.view).length===4 && newcomer.node.hubExecutor.capsule===admitted.capsule,g);
      const newRow=rows(f,newcomer.view).find(p=>p.playerNum===4);check(newRow.active!==false,g);
      if(game==='dixit')check(newRow.pending===true && list(newcomer.view.hand).length===0 && newRow.score===0,g);
      if(game==='onceupon')check(newRow.pending===true && list(newcomer.view.hand).length===0 && newcomer.view.ending==null,g);
      if(game==='letstalk')check(list(newcomer.view.scores).find(p=>p.playerNum===4)?.score===0,g);
      if(game==='bluffking')check(newRow.pending===true && newRow.score===0 && newcomer.view.privateCard===null,g);
      report.step=game+':retained-ticket';await execute(f,1,null,oldCap);check(true,g);
      await api({operation:'execute',capsule:oldCap,token:f.seats[3].token},'wrong_player');check(true,g);
      if(game==='dixit')await command(f,1,'story',{cardId:(await card(f,1)).view.hand[0],clueMode:'spoken'},oldCap);
      if(game==='onceupon'){await command(f,1,'pass',{},oldCap);await command(f,1,'keepAll');newcomer=await card(f,4);check(list(newcomer.view.hand).length>0 && newcomer.view.ending && rows(f,newcomer.view).find(p=>p.playerNum===4).pending!==true,g);}
      if(game==='openmic'){const scored=await command(f,1,'success',{},oldCap);check(scored.view.teamScore===2,g);}
      if(game==='letstalk')await command(f,1,'end',{},oldCap);
      if(game==='bluffking')await command(f,1,'nextSpotlight',{},oldCap);
      report.step=game+':departure';before=await card(f,2);const left=await api({operation:'setParticipant',capsule:before.node.hubExecutor.capsule,token:f.seats[1].token,commandId:'qa-away-'+uid(),playerNum:3,active:false});check(left.ok===true && left.inactiveNums.includes(3),g);
      const remaining=await execute(f,2);check(rows(f,remaining.view).find(p=>p.playerNum===3)?.active===false,g);
      await api({operation:'execute',capsule:remaining.node.hubExecutor.capsule,token:f.seats[2].token,command:game==='bluffking'?{action:'cancelRound',commandId:'qa-away-denied-'+uid(),expectedVersion:remaining.state.rooms[f.code].version,roundId:remaining.state.rooms[f.code].round?.id}:{type:'restart',id:'qa-away-denied-'+uid(),sessionId:f.sessionId,turnId:remaining.view.turnId}},'not_eligible');check(true,g);
      report.step=game+':same-link-return';const oldSeat=await card(f,3),returned=await api({operation:'setParticipant',capsule:oldSeat.node.hubExecutor.capsule,token:f.seats[2].token,commandId:'qa-return-'+uid(),playerNum:3,active:true});check(returned.ok===true && !returned.inactiveNums.includes(3),g);
      const rejoined=await card(f,3);check(rows(f,rejoined.view).find(p=>p.playerNum===3)?.active===true && (game==='bluffking'?rejoined.view.self.playerNum:rejoined.node.playerNum)===3,g);
      check(rejoined.node.hubExecutor.sessionId===oldSession,g);await execute(f,2);g.ok=true;
    }
    report.ok=true;report.step='complete';
  } catch(error) {report.ok=false;report.error=['wrong_player','not_eligible','game_switched','invalid_roster','host_only','storage_unavailable','registration_incomplete','stale_session','membership_smoke_failed'].includes(error.code||error.message)?error.code||error.message:'qa_failed';}
  finally {
    // Derive dynamic Bluff nodes only from this task's exact marked canonical.
    // A changed source, marker/session mismatch or foreign projection is retained.
    for(const f of fixtures) {
      let raw,state;try{({raw,state}=await canonical(f));if(f.game==='bluffking')discover(f,state);}catch{};
      const entries=[...f.known].filter(([path])=>f.attempted.has(path)).sort((a,b)=>(a[1].kind==='canonical')-(b[1].kind==='canonical'));
      report.cleanup.tracked+=entries.length;
      for(const [path]of entries)try{const snapshot=await readPath(f,path);if(snapshot.value===null){report.cleanup.empty++;continue;}must(ownedNode(f,path,snapshot.value,state,raw));const response=await http(DATABASE+'/'+path+'.json',{method:'DELETE',headers:{'If-Match':snapshot.etag}});must(response.ok);report.cleanup.deleted++;}catch{report.cleanup.failed++;report.ok=false;}
    }
  }
  return report;
}
module.exports={run,genericFixture,bluffFixture};
if(require.main===module){if(!process.argv.includes('--live')){process.stdout.write('{"ok":false,"reason":"live_flag_required"}\n');process.exitCode=1;}else run().then(report=>{process.stdout.write(JSON.stringify(report)+'\n');if(!report.ok)process.exitCode=1;}).catch(()=>{process.stdout.write('{"ok":false,"error":"qa_failed"}\n');process.exitCode=1;});}
