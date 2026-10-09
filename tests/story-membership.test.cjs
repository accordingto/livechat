'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const DX = require('../dixit-engine.js');
const ON = require('../once-upon-a-time-engine.js');
const OD = require('../once-upon-a-time-deck.js');
const BF = require('../bluff-king-engine.js');
const BA = require('../runtime/bluff-executor.cjs').adapters.bluffking;
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) }));
let serial = 0;
const clone = v => JSON.parse(JSON.stringify(v));
const command = (s, type, actor = 0, extra = {}) => ({ id: 'membership-action-' + ++serial, sessionId: s.sessionId, turnId: s.turnId, type, actor, seed: 457 + serial, now: 5000 + serial, ...extra });
const act = (E, s, type, actor = 0, extra = {}) => E.apply(s, command(s, type, actor, extra));
const update = (E, s, count, inactiveNums = []) => E.membership(s, { added: roster(count).slice(s.roster.length), roster: roster(count), inactiveNums }, { id: 'member-' + ++serial, now: 6000 + serial, seed: 712 + serial });
const dxStart = (n = 3) => act(DX, DX.create({ id: 'membership-dixit', roster: roster(n), sharedControls: true, seed: 98 }), 'deal', 0, { firstPlayerNum: 1 });
const onStart = (n = 3) => act(ON, act(ON, ON.create({ id: 'membership-once', roster: roster(n), sharedControls: true, seed: 98 }), 'deal'), 'chooseFirst', 0, { playerNum: 1 });
function conserveDX(s) {
  const cards = [...DX.list(s.deck), ...DX.list(s.discard), ...Object.values(s.hands).flatMap(DX.list), ...Object.values(s.submissions).flatMap(DX.list)];
  assert.equal(cards.length, 84); assert.equal(new Set(cards).size, 84);
}
function conserveON(s) {
  const cards = [...ON.list(s.storyDeck), ...ON.list(s.storyDiscard), ...ON.list(s.storyHeld), ...Object.values(s.hands).flatMap(ON.list)];
  assert.equal(cards.length, OD.storyCards.length); assert.equal(new Set(cards).size, cards.length);
  const ends = [...ON.list(s.endingDeck), ...ON.list(s.endingDiscard), ...Object.values(s.endings).filter(Boolean), ...(s.endingPlayed ? [s.endingPlayed.cardId] : [])];
  assert.equal(ends.length, OD.endingCards.length); assert.equal(new Set(ends).size, ends.length);
}
function dxVote(s) {
  s = act(DX, s, 'story', 1, { cardId: s.hands[1][0], clueMode: 'spoken' });
  for (const n of s.roundPlayerNums.filter(n => n !== 1)) s = act(DX, s, 'submit', n, { cardIds: s.hands[n].slice(0, DX.view(s, n).dixit.submitCount) });
  assert.equal(s.phase, 'VOTE'); return s;
}
function dxFinish(s) {
  for (const n of s.roundPlayerNums.filter(n => n !== s.storyteller)) if (!s.votes[n]) s = act(DX, s, 'vote', n, { cardId: s.submissions[n === 2 ? 1 : 2][0] });
  s = act(DX, s, 'reveal'); return act(DX, s, 'advanceReveal', 0, { now: s.revealPopularAt });
}

test('Dixit newcomer waits through the 3-player double-submission round, then receives a real private hand and 0 score', () => {
  let s = dxStart(); s = act(DX, s, 'story', 1, { cardId: s.hands[1][0], clueMode: 'spoken' });
  const original = clone(s); s = update(DX, s, 4);
  assert.equal(s.sessionId, original.sessionId); assert.equal(s.turnId, original.turnId); assert.deepEqual(s.hands[1], original.hands[1]);
  assert.deepEqual(s.roundPlayerNums, [1,2,3]); assert.equal(DX.view(s,4).dixit.submitCount, 2);
  assert.equal(DX.view(s,4).dixit.roster[3].memberStatus, 'next_round'); assert.deepEqual(DX.view(s,4).dixit.hand, []);
  assert.equal(DX.view(s,4).dixit.actions.submit, false); assert.equal(s.scores[4], 0);
  for (const n of [2,3]) s = act(DX,s,'submit',n,{cardIds:s.hands[n].slice(0,2)});
  s = dxFinish(s); assert.equal(s.lastRound.rows.find(r=>r.playerNum===4).delta, 0); conserveDX(s);
  s = act(DX,s,'nextRound'); assert.equal(s.roster[3].pending,false); assert.equal(s.hands[4].length,6); assert.equal(s.roundSubmissionCount,1);
  assert.deepEqual(s.roundPlayerNums,[1,2,3,4]); assert.equal(s.scores[4],0); conserveDX(s);
  assert.equal('hand' in DX.view(s,0).dixit,false); assert.equal(DX.view(s,4).dixit.hand.length,6);
});

test('Dixit explicit decoy departure removes blocking submission, preserves old hands and never changes frozen card count',()=>{
  let s=dxStart(4);s=act(DX,s,'story',1,{cardId:s.hands[1][0],clueMode:'spoken'});
  s=act(DX,s,'submit',2,{cardIds:s.hands[2].slice(0,1)});s=act(DX,s,'submit',3,{cardIds:s.hands[3].slice(0,1)});
  const kept=s.hands[4].slice();s=update(DX,s,4,[4]);assert.equal(s.phase,'VOTE');assert.deepEqual(s.roundPlayerNums,[1,2,3]);assert.equal(s.roundSubmissionCount,1);assert.deepEqual(s.hands[4],kept);
  assert.equal(DX.view(s,4).dixit.actions.reveal,false);assert.equal(DX.view(s,4).dixit.roster[3].memberStatus,'away');
  s=dxFinish(s);assert.equal(s.lastRound.rows.find(r=>r.playerNum===4).delta,0);conserveDX(s);
});

test('Dixit keeps real ballots after departure, preserves scores, and rejects away shared commands',()=>{
  let s=dxVote(dxStart(4));s=act(DX,s,'vote',4,{cardId:s.submissions[1][0]});s.scores[4]=9;
  s=update(DX,s,4,[4]);assert.equal(s.votes[4],s.submissions[1][0]);assert.ok(s.roundPlayerNums.includes(4));
  const rejected=act(DX,s,'cancel',4);assert.equal(rejected.phase,'VOTE');assert.equal(rejected.replies[4].error,'not_available');
  s=dxFinish(s);assert.ok(s.scores[4]>=9);conserveDX(s);
});

test('Dixit absent storyteller skips an unscored round; below minimum waits and a newcomer can rescue it',()=>{
  let s=dxStart(4);s=act(DX,s,'story',1,{cardId:s.hands[1][0],clueMode:'spoken'});s=act(DX,s,'submit',2,{cardIds:s.hands[2].slice(0,1)});
  const score=clone(s.scores);s=update(DX,s,4,[1]);assert.equal(s.phase,'CLUE');assert.notEqual(s.storyteller,1);assert.deepEqual(s.scores,score);assert.deepEqual(s.submissions,{});conserveDX(s);
  let small=update(DX,dxStart(),3,[3]);assert.equal(small.phase,'CLUE');assert.equal(DX.view(small,1).dixit.actions.story,false);
  small=update(DX,small,4,[3]);assert.equal(small.round,2);assert.deepEqual(small.roundPlayerNums,[1,2,4]);assert.equal(small.hands[4].length,7);conserveDX(small);
});

test('Dixit same-seat rejoin keeps hand and score, awaits next round, and restart leaves manually away seats inactive',()=>{
  let s=dxStart(4);s.scores[4]=11;const hand=s.hands[4].slice();s=update(DX,s,4,[4]);s=update(DX,s,4,[]);
  assert.equal(s.roster.length,4);assert.deepEqual(s.hands[4],hand);assert.equal(s.scores[4],11);assert.equal(s.roster[3].pending,true);
  s=update(DX,s,4,[4]);s=act(DX,s,'restart');assert.equal(s.roster[3].active,false);s=act(DX,s,'deal',0,{firstPlayerNum:1});assert.deepEqual(s.hands[4],[]);conserveDX(s);
});

test('Once newcomer receives real Story and Ending cards only after safe narrative handover, leaving existing cards unchanged',()=>{
  let s=onStart();const original=clone(s);s=update(ON,s,4);assert.equal(s.turnId,original.turnId);assert.equal(s.sessionId,original.sessionId);assert.deepEqual(s.hands[1],original.hands[1]);
  assert.deepEqual(s.hands[4],[]);assert.equal(ON.view(s,4).once.roster[3].memberStatus,'next_turn');assert.equal(ON.view(s,4).once.actions.interrupt,false);
  s=act(ON,s,'pass',1);assert.equal(s.phase,'PASS_DISCARD');assert.equal(s.roster[3].pending,true);
  s=act(ON,s,'keepAll',1);assert.equal(s.phase,'STORYTELLING');assert.equal(s.roster[3].pending,false);assert.equal(s.hands[4].length,7);assert.ok(s.endings[4]);conserveON(s);
  assert.equal('hand' in ON.view(s,0).once,false);assert.equal('ending' in ON.view(s,0).once,false);assert.equal(ON.view(s,4).once.hand.length,7);
});

test('Once joining during disputed interrupt cannot lose or duplicate dealt cards through rollback',()=>{
  let s=onStart(3);s=act(ON,s,'interrupt',2,{cardId:s.hands[2][0],mode:'normal'});s=act(ON,s,'dispute',1,{interruptId:s.interrupt.id});assert.equal(s.phase,'INTERRUPT_DISPUTE');
  const rollback=clone(s.interrupt.rollback);s=update(ON,s,4);assert.deepEqual(s.hands[4],[]);assert.equal(s.roster[3].pending,true);assert.deepEqual(s.interrupt.rollback,rollback);
  s=act(ON,s,'vote',3,{voteId:s.vote.id,choice:'invalid'});assert.equal(s.phase,'STORYTELLING');assert.equal(s.storyteller,1);assert.equal(s.roster[3].pending,false);assert.equal(s.hands[4].length,7);conserveON(s);
});

test('Once departed storyteller or pass-discard seat yields without inventing private discards or resetting game',()=>{
  for(const discard of [false,true]){let s=onStart(4);if(discard)s=act(ON,s,'pass',1);const hand=s.hands[1].slice(),session=s.sessionId;
    s=update(ON,s,4,[1]);assert.equal(s.phase,'STORYTELLING');assert.equal(s.storyteller,2);assert.deepEqual(s.hands[1],hand);assert.equal(s.sessionId,session);assert.equal(ON.view(s,1).once.actions.restart,false);conserveON(s);}
});

test('Once current eligible denominator and real ballots survive departure while missing voters abstain',()=>{
  let s=onStart(4);s=act(ON,s,'challenge',2);const eligible=s.vote.eligible.slice();s=act(ON,s,'vote',3,{voteId:s.vote.id,choice:'lose'});s=update(ON,s,4,[4]);
  assert.equal(s.phase,'STORYTELLING');assert.equal(s.storyteller,1,'one real lose ballot among two eligible remains a tie');assert.equal(s.vote,null);assert.deepEqual(eligible,[3,4]);conserveON(s);
});

test('Once same-link rejoin retains Story hand and Ending, waiting until next safe turn; explicit absence survives restart',()=>{
  let s=onStart(4),hand=s.hands[4].slice(),ending=s.endings[4];s=update(ON,s,4,[4]);s=update(ON,s,4,[]);assert.deepEqual(s.hands[4],hand);assert.equal(s.endings[4],ending);assert.equal(s.roster[3].pending,true);
  s=act(ON,s,'pass',1);s=act(ON,s,'keepAll',1);assert.equal(s.roster[3].pending,false);assert.deepEqual(s.hands[4],hand);assert.equal(s.endings[4],ending);conserveON(s);
  s=update(ON,s,4,[4]);s=act(ON,s,'restart');assert.equal(s.roster[3].active,false);s=act(ON,s,'deal');assert.deepEqual(s.hands[4],[]);assert.equal(s.endings[4],undefined);conserveON(s);
});

test('Story membership is deterministic, does not mutate input, and preserves game limits',()=>{
  for(const [E,start,max] of [[DX,dxStart,8],[ON,onStart,6]]){const s=start(),before=clone(s),change={added:[{playerNum:4,name:'New'}],roster:roster(4),inactiveNums:[]},ctx={id:'stable-change',now:8000,seed:13};
    assert.deepEqual(E.membership(s,change,ctx),E.membership(clone(s),clone(change),ctx));assert.deepEqual(s,before);
    const full=start(max);assert.throws(()=>update(E,full,max+1),/invalid_roster/);assert.throws(()=>E.membership(s,{added:[{playerNum:1,name:'Duplicate'}]},ctx),/invalid_roster/);}
});

const bank=Array.from({length:30},(_,i)=>({id:'topic-'+i,canonicalKnowledgeId:'knowledge-'+i,term:'Topic '+i,publicPrompt:'Explain.',publicHints:[],hintMode:'none',secretAnswer:'SECRET_'+i,supportingFacts:[],sources:[],verificationStatus:'verified',enabled:true}));
function bfStart(count=3){const s=BF.blankStore(),ctx={now:1000,rng:()=>0,uuid:()=> 'member-'+ ++serial};BF.applyCommand(s,'host',{room:'TEST',action:'create',name:'Host',participate:false},bank,ctx);
  s.transport={members:{},cardRoster:[],accepted:{},acknowledgements:{},executorSessionId:'registered-bluff'};
  for(let i=1;i<=count;i++){const identityId=String(i).padStart(40,'0'),token=String(i).padStart(64,'0'),historyToken=String(i+40).padStart(64,'0');BF.applyCommand(s,identityId,{room:'TEST',action:'join',name:'Player '+i,participate:true},bank,ctx);const member=s.rooms.TEST.members.at(-1);member.playerNum=i;s.transport.members[identityId]={token,historyToken};s.transport.cardRoster.push({playerNum:i,originalToken:'original-seat-'+i,identityId,token,historyToken,playerId:member.id,name:member.name});}
  s.rooms.TEST.sharedControls=true;bfCommand(s,'start');return s;
}
const bfCtx=s=>({code:'TEST',now:5000+ ++serial,seed:771,id:'membership-'+serial,bank,rng:()=>0,uuid:()=> 'member-'+ ++serial});
function bfCommand(s,action,num=1,extra={}){const r=s.rooms.TEST,who=s.transport.cardRoster[num-1].identityId;BF.applyCommand(s,who,{room:'TEST',action,commandId:'command_'+String(++serial).padStart(12,'0'),expectedVersion:r.version,roundId:r.round?.id,...extra},bank,{now:5000,rng:()=>0,uuid:()=> 'member-'+ ++serial});}
const bfAdded=n=>({playerNum:n,originalToken:'original-seat-'+n,name:'Player '+n,token:String(n).padStart(64,'0'),identityId:String(n).padStart(40,'0'),historyToken:String(n+40).padStart(64,'0')});
function bfUpdate(s,n,inactiveNums=[]){return BA.membership(s,{added:Array.from({length:n-s.transport.cardRoster.length},(_,i)=>bfAdded(s.transport.cardRoster.length+i+1)),roster:roster(n),inactiveNums},bfCtx(s));}

test('Bluff topic-check newcomer safely enters before roles, preserves group scores and adds one Thinker turn',()=>{
  let s=bfStart();const r=s.rooms.TEST,session=s.transport.executorSessionId,oldOrder=r.thinkerOrder.slice();r.scores[r.roster[1]]=5;s=bfUpdate(s,4);
  assert.equal(r.phase,'topic_check');assert.equal(r.round.playerIds.length,4);assert.equal(r.thinkerOrder.length,4);assert.deepEqual(r.thinkerOrder.slice(0,3),oldOrder);assert.equal(s.transport.executorSessionId,session);
  const newMember=r.members.find(p=>p.playerNum===4);assert.equal(r.scores[newMember.id],0);assert.equal(r.scores[r.roster[1]],5);assert.equal(newMember.pending,false);
  const v=JSON.parse(BA.project(s,{playerNum:4,token:s.transport.cardRoster[3].token},bfCtx(s)).viewJson);assert.equal(v.self.playerNum,4);assert.equal(v.players.find(p=>p.playerNum===4).memberStatus,'active');assert.equal(v.privateCard,null);assert.equal(v.membership.maxPlayers,9);
});

test('Bluff newcomer during discussion sees no current role or secret and scores 0 until the next fresh topic',()=>{
  let s=bfStart();bfCommand(s,'confirmTopic');bfCommand(s,'beginDiscussion');const r=s.rooms.TEST,ids=r.round.playerIds.slice(),role=r.round.truthfulId,roundId=r.round.id;
  s=bfUpdate(s,4);assert.deepEqual(r.round.playerIds,ids);assert.equal(r.round.truthfulId,role);assert.equal(r.round.id,roundId);const p=r.members.find(p=>p.playerNum===4);assert.equal(p.pending,true);
  const view=JSON.parse(BA.project(s,{playerNum:4,token:s.transport.cardRoster[3].token},bfCtx(s)).viewJson);assert.equal(view.privateCard,null);assert.equal(view.self.isFormal,false);assert.ok(!JSON.stringify(view).includes('SECRET_'));
  for(let i=0;i<2;i++)bfCommand(s,'nextSpotlight');bfCommand(s,'identify',1,{targetId:role});assert.equal(r.scores[p.id],0);assert.equal(r.round.result.delta[p.id],undefined);
  bfCommand(s,'nextRound');assert.equal(p.pending,false);assert.ok(r.round.playerIds.includes(p.id));assert.equal(r.history.length,1);assert.equal(r.thinkerOrder.length,4);
});

test('Bluff critical departures replace an unscored role round and inactive commands cannot manage it',()=>{
  for(const truth of [false,true]){let s=bfStart(4);bfCommand(s,'confirmTopic');bfCommand(s,'beginDiscussion');const r=s.rooms.TEST,old=r.round.id,oldScore=clone(r.scores),absent=truth?r.members.find(p=>p.id===r.round.truthfulId).playerNum:1;
    s=bfUpdate(s,4,[absent]);assert.equal(r.phase,'topic_check');assert.notEqual(r.round.id,old);assert.deepEqual(r.scores,oldScore);assert.equal(r.history.length,0);assert.ok(!r.round.playerIds.includes(r.members.find(p=>p.playerNum===absent).id));
    assert.equal(BA.membershipEligible(s,absent,bfCtx(s)),false);assert.deepEqual(BA.membershipInactive(s,bfCtx(s)),[absent]);assert.throws(()=>bfCommand(s,'cancelRound',absent),e=>e.code==='not_eligible');}
});

test('Bluff decoy departure skips spotlight and readiness without pretending to choose or exposing truthful identity',()=>{
  let s=bfStart(4);bfCommand(s,'confirmTopic');const r=s.rooms.TEST,truth=r.round.truthfulId,absent=r.members.find(p=>p.playerNum===4);bfCommand(s,'beginDiscussion');s=bfUpdate(s,4,[4]);
  assert.equal(r.phase,'discussion');assert.equal(r.round.truthfulId,truth);assert.ok(!r.round.spotlightOrder.includes(absent.id));assert.ok(!r.round.playerIds.includes(absent.id));
  const publicView=JSON.parse(BA.project(s,{playerNum:0},bfCtx(s)).viewJson);assert.ok(!JSON.stringify(publicView).includes('SECRET_'));assert.equal(publicView.players.find(p=>p.playerNum===4).memberStatus,'away');
});

test('Bluff source guard ignores only explicit away origins; active and pending switched cards still fail',async()=>{
  let s=bfStart(4);bfCommand(s,'confirmTopic');s=bfUpdate(s,5,[4]);const r=s.rooms.TEST;
  const sources=Object.fromEntries(s.transport.cardRoster.map(p=>[p.originalToken,{game:'bluffking',bluff:{version:2,room:'TEST',token:p.token,identityId:p.identityId,historyToken:p.historyToken}}]));
  const executor={v:1};const ctx={...bfCtx(s),executor,read:async path=>sources[path.split('/').at(-1)]};await BA.guard(s,ctx);
  sources['original-seat-4']={game:'cut',cut:{sessionId:'different'}};await BA.guard(s,ctx);
  sources['original-seat-5']={game:'cut',cut:{sessionId:'different'}};await assert.rejects(()=>BA.guard(s,ctx),e=>e.code==='game_switched');assert.equal(r.members.find(p=>p.playerNum===5).pending,true);
});

test('Bluff source-safe member updates never publish credentials and rejoining preserves same identity, score and order',()=>{
  let s=bfStart(4);const r=s.rooms.TEST,id=r.members.find(p=>p.playerNum===4).id,order=r.thinkerOrder.slice();r.scores[id]=7;bfCommand(s,'confirmTopic');s=bfUpdate(s,4,[4]);s=bfUpdate(s,4,[]);
  assert.equal(r.members.find(p=>p.playerNum===4).id,id);assert.equal(r.scores[id],7);assert.deepEqual(r.thinkerOrder,order);assert.equal(r.members.find(p=>p.playerNum===4).pending,true);
  const p=JSON.parse(BA.project(s,{playerNum:4,token:s.transport.cardRoster[3].token},bfCtx(s)).viewJson),publicJSON=JSON.stringify(p);for(const x of s.transport.cardRoster)for(const key of ['token','identityId','historyToken','originalToken'])assert.ok(!publicJSON.includes(x[key]));
});


test('Dixit a saved pre-membership three-player round freezes its two-card rule before appending a newcomer',()=>{
  let s=dxStart(); delete s.roundSubmissionCount; s=update(DX,s,4); assert.equal(s.roundSubmissionCount,2); assert.equal(DX.view(s,2).dixit.submitCount,2);conserveDX(s);
});

test('Once a sole active storyteller waits below minimum, but a pending newcomer can safely restore two-player play',()=>{
  let s=update(ON,onStart(2),2,[2]);assert.equal(ON.view(s,1).once.actions.play,false);let denied=act(ON,s,'pass',1);assert.equal(denied.replies[1].error,'waiting_players');assert.equal(denied.phase,'STORYTELLING');
  s=update(ON,s,3,[2]);assert.equal(s.roster[2].pending,false);assert.ok(s.hands[3].length);assert.equal(ON.view(s,1).once.actions.play,true);conserveON(s);
});

test('Bluff the manager cannot begin a two-person role round after an explicit decoy departure',()=>{
  let s=bfStart(3);bfCommand(s,'confirmTopic');s=bfUpdate(s,3,[3]);assert.throws(()=>bfCommand(s,'beginDiscussion'),e=>e.code==='player_count');assert.equal(s.rooms.TEST.phase,'prepare');
});

test('Bluff desired inactive override skips a moved leaving source and verifies a moved returning source before activation',async()=>{
  let s=bfStart(4);const sources=Object.fromEntries(s.transport.cardRoster.map(p=>[p.originalToken,{game:'bluffking',bluff:{version:2,room:'TEST',token:p.token,identityId:p.identityId,historyToken:p.historyToken}}]));
  const executor={v:1},ctx={...bfCtx(s),executor,read:async path=>sources[path.split('/').at(-1)]};await BA.guard(s,ctx);
  sources['original-seat-4']={game:'cut',cut:{sessionId:'different'}};await BA.guard(s,{...ctx,membershipInactiveNums:[4]});
  s=bfUpdate(s,4,[4]);await BA.guard(s,ctx);await assert.rejects(()=>BA.guard(s,{...ctx,membershipInactiveNums:[],target:{token:s.transport.cardRoster[3].token}}),e=>e.code==='game_switched');
  assert.equal(s.rooms.TEST.members.find(p=>p.playerNum===4).active,false);
});


test('Bluff a newcomer can rescue a two-person blocked role round by replacing it without scores or reused secrets',()=>{
  let s=bfStart(3);bfCommand(s,'confirmTopic');bfCommand(s,'beginDiscussion');const r=s.rooms.TEST,old=r.round.id,oldScore=clone(r.scores);s=bfUpdate(s,3,[3]);
  s=bfUpdate(s,4,[3]);assert.equal(r.phase,'topic_check');assert.notEqual(r.round.id,old);assert.equal(r.round.playerIds.length,3);assert.equal(r.members.find(p=>p.playerNum===4).pending,false);assert.equal(r.scores[r.roster[0]],oldScore[r.roster[0]]);bfCommand(s,'confirmTopic');
});

test('Dixit a failed next round below online minimum keeps newcomer queued and its hand empty until a successful boundary',()=>{
  let s=dxFinish(dxVote(dxStart()));s=update(DX,s,4);s=act(DX,s,'nextRound',0,{onlineNums:[1,2]});assert.equal(s.phase,'REVEAL');assert.equal(s.roster[3].pending,true);assert.deepEqual(s.hands[4],[]);conserveDX(s);
});
