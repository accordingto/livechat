'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dixit-engine.js');
const LIFE=require('../life-story-engine.js');
let sequence=0;
function setup(count=4,config){
  const h={state:E.create({id:'life-'+(++sequence),roster:Array.from({length:count},(_,i)=>({playerNum:i+1,name:String.fromCharCode(65+i)})),mode:'life_story',seed:88,now:10,hostPlayerNum:1,sharedControls:true,config}),online:Array.from({length:count},(_,i)=>i+1)};
  ok(h,1,'deal');return h;
}
function command(h,actor,type,extra={}){const s=h.state;sequence++;h.clock=Math.max(h.clock||0,sequence*100)+1;return{id:'cmd-'+sequence,actor,type,sessionId:s.sessionId,turnId:s.turnId,cycleId:s.cycleId,expectedRevision:s.lifeRevision,seed:sequence*33,now:h.clock,onlineNums:h.online,serverAuthority:true,...extra};}
function act(h,actor,type,extra={}){const cmd=command(h,actor,type,extra);h.state=E.apply(h.state,cmd);LIFE.assertCardInvariant(h.state);return h.state.replies[actor]?.error;}
function ok(h,actor,type,extra){assert.equal(act(h,actor,type,extra),'',type);}
function v(h,actor){return E.view(h.state,actor,100000).dixit;}
function storyteller(h){return h.state.storyteller;}
function start(h){const a=storyteller(h),p=v(h,a);if(p.candidates.length)ok(h,a,'choose_question',{questionId:p.candidates[0].id});ok(h,a,'choose_story_card',{cardId:p.hand[0]});ok(h,a,'start_story');}
function submit(h){for(const a of h.state.lifeRoom.turn.participants.map(Number))if(a!==storyteller(h)&&!h.state.lifeRoom.turn.excused.includes(String(a)))ok(h,a,'submit_card',{cardId:v(h,a).hand[0]});}
function voting(h){start(h);submit(h);assert.equal(h.state.phase,'STORYTELLING');ok(h,storyteller(h),'finish_story');assert.equal(h.state.phase,'VOTING');}
function answer(h){return h.state.lifeRoom.turn.table.find(t=>Number(t.ownerId)===storyteller(h)).token;}
function reveal(h){assert.equal(h.state.phase,'VOTING');ok(h,h.state.hostPlayerNum,'reveal');h.clock=h.state.lifeRoom.turn.revealAnswerAt;h.state=LIFE.pulse(h.state,{now:h.clock,onlineNums:h.online,serverAuthority:true});assert.equal(h.state.lifeRoom.turn.revealStage,'answer');h.clock=h.state.lifeRoom.turn.revealPopularAt;h.state=LIFE.pulse(h.state,{now:h.clock,onlineNums:h.online,serverAuthority:true});assert.equal(h.state.phase,'REVEAL_DISCUSS');}
function complete(h){voting(h);const token=answer(h);for(const a of h.state.lifeRoom.turn.participants.map(Number))if(a!==storyteller(h))ok(h,a,'cast_vote',{token});reveal(h);}
function follow(h){ok(h,h.state.hostPlayerNum,'finish_discussion');}

test('life mode dispatch is isolated; deterministic retry, own hand projection, story timing and all-correct scoring',()=>{
  const h=setup();assert.equal(h.state.mode,'life_story');assert.equal(v(h,1).candidates.length,3);assert.deepEqual(v(h,2).candidates,v(h,1).candidates);assert.deepEqual(v(h,0).hand,[]);
  const c=command(h,1,'free_share');assert.deepEqual(E.apply(h.state,c),E.apply(h.state,c));h.state=E.apply(h.state,c);
  ok(h,1,'choose_story_card',{cardId:v(h,1).hand[0]});ok(h,1,'start_story');
  ok(h,2,'submit_card',{cardId:v(h,2).hand[0]});ok(h,2,'withdraw_submission');ok(h,2,'submit_card',{cardId:v(h,2).hand[1]});
  ok(h,3,'submit_card',{cardId:v(h,3).hand[0]});ok(h,4,'submit_card',{cardId:v(h,4).hand[0]});assert.equal(h.state.phase,'STORYTELLING');
  assert.equal(act(h,2,'claim_follow_up'),'wrong_phase');ok(h,1,'finish_story');assert.equal(h.state.phase,'VOTING');
  const before=v(h,2).table;assert.equal(before.length,4);assert(before.every(t=>Object.keys(t).sort().join(',')==='cardId,token'));assert.deepEqual(E.view(JSON.parse(JSON.stringify(h.state)),2).dixit.table,before);
  assert.equal(act(h,2,'cast_vote',{token:v(h,2).ownTableToken}),'self_vote');assert.equal(act(h,1,'cast_vote',{token:answer(h)}),'storyteller_cannot_vote');
  const token=answer(h);ok(h,2,'cast_vote',{token});assert.equal(v(h,3).vote,null);assert(v(h,3).table.every(t=>!t.voterNums));ok(h,3,'cast_vote',{token});ok(h,4,'cast_vote',{token});reveal(h);
  assert.deepEqual(Object.values(h.state.scores),[2,2,2,2]);assert(h.state.lifeRoom.players.every(p=>p.hand.length===8));assert.equal(v(h,2).eligibleFollowUp,false);
  assert.equal(act(h,2,'claim_follow_up'),'wrong_phase');
});
test('none correct still awards the storyteller two points and legal decoy authors one per vote',()=>{
  const h=setup();voting(h);const token=a=>h.state.lifeRoom.turn.table.find(c=>Number(c.ownerId)===a).token;
  ok(h,2,'cast_vote',{token:token(3)});ok(h,3,'cast_vote',{token:token(4)});ok(h,4,'cast_vote',{token:token(2)});reveal(h);assert.deepEqual(Object.values(h.state.scores),[2,1,1,1]);
});
test('fixed opportunity order, successful follow-up has no questions, shared members continue playing',()=>{
  const h=setup();complete(h);follow(h);assert.equal(act(h,1,'claim_follow_up'),'ineligible');const history=h.state.lifeRoom.questionHistory.selections;
  ok(h,3,'claim_follow_up');assert.equal(storyteller(h),3);assert.equal(h.state.lifeRoom.questionHistory.selections,history);assert.deepEqual(v(h,3).candidates,[]);
  assert.equal(act(h,3,'refresh_questions'),'follow_up_no_question');complete(h);follow(h);ok(h,1,'next_in_order');assert.equal(storyteller(h),2);start(h);ok(h,1,'submit_card',{cardId:v(h,1).hand[0]});
});
test('concurrent follow-up and host-next use revision/cycle/turn fences; repeated command is exact no-op',()=>{
  const h=setup();complete(h);follow(h);const b=command(h,2,'claim_follow_up'),c=command(h,3,'claim_follow_up'),host=command(h,1,'next_in_order');
  h.state=E.apply(h.state,b);const turn=h.state.turnId;assert.equal(h.state.replies[2].error,'');assert.strictEqual(E.apply(h.state,b),h.state);
  h.state=E.apply(h.state,c);assert(h.state.replies[3].error);h.state=E.apply(h.state,host);assert(h.state.replies[1].error);assert.equal(h.state.turnId,turn);assert.equal(h.state.lifeRoom.cycle.opportunities['3'],'pending');
  complete(h);follow(h);const n=command(h,1,'next_in_order'),late=command(h,4,'claim_follow_up');h.state=E.apply(h.state,n);h.state=E.apply(h.state,late);assert(h.state.replies[4].error);assert.equal(storyteller(h),3);
});
test('cycle resets before follow-up; last storyteller may immediately continue; old cycle cannot mutate new one',()=>{
  const h=setup(3);complete(h);follow(h);ok(h,1,'next_in_order');complete(h);follow(h);ok(h,1,'next_in_order');complete(h);const oldCycle=h.state.cycleId;
  follow(h);assert.notEqual(h.state.cycleId,oldCycle);assert.equal(v(h,3).cycleNumber,2);assert(v(h,3).eligibleFollowUp);assert.equal(act(h,3,'claim_follow_up',{cycleId:oldCycle}),'stale_cycle');ok(h,3,'claim_follow_up');assert.equal(storyteller(h),3);
});
test('pass differs from sharing and gives no points; cancelled/pass turns cannot offer follow-up',()=>{
  const h=setup();assert.equal(act(h,2,'pass_opportunity'),'storyteller_only');ok(h,1,'pass_opportunity');assert.equal(h.state.lifeRoom.cycle.opportunities['1'],'passed');assert.equal(h.state.scores[1],0);assert.equal(v(h,2).eligibleFollowUp,false);assert.equal(act(h,2,'claim_follow_up'),'no_completed_story');ok(h,1,'next_in_order');assert.equal(storyteller(h),2);
});
test('mulligan is bounded/idempotent and card pool remains unique through repeated recycling',()=>{
  const h=setup(4,{cardPackId:'dixit_base84'}),old=v(h,2).hand.slice(0,2),cmd=command(h,2,'mulligan',{cardIds:old});h.state=E.apply(h.state,cmd);assert.equal(h.state.replies[2].error,'');assert(old.every(id=>!v(h,2).hand.includes(id)));assert.strictEqual(E.apply(h.state,cmd),h.state);assert.equal(act(h,2,'mulligan',{cardIds:v(h,2).hand.slice(0,1)}),'mulligan_limit');
  for(let i=0;i<24;i++){complete(h);LIFE.assertCardInvariant(h.state);follow(h);ok(h,h.state.hostPlayerNum,'next_in_order');}
});
test('settlement cannot execute twice, locked-card mutations reject and cancellation restores physical cards',()=>{
  const h=setup(),initial=h.state.lifeRoom.players.map(p=>p.hand.slice().sort());voting(h);
  for(const type of ['submit_card','withdraw_submission','mulligan'])assert.equal(act(h,2,type,{cardId:v(h,2).hand[0],cardIds:[v(h,2).hand[0]]}),'wrong_phase');
  ok(h,1,'cancel_turn');assert(h.state.lifeRoom.players.every((p,i)=>JSON.stringify(p.hand.slice().sort())===JSON.stringify(initial[i])));assert(Object.values(h.state.scores).every(n=>n===0));assert.equal(v(h,2).eligibleFollowUp,false);ok(h,1,'next_in_order');voting(h);
  const token=answer(h);ok(h,2,'cast_vote',{token});ok(h,3,'cast_vote',{token});const last=command(h,4,'cast_vote',{token});h.state=E.apply(h.state,last);assert.strictEqual(E.apply(h.state,last),h.state);reveal(h);assert.equal(act(h,1,'cancel_turn'),'wrong_phase');
});
test('server-only gate and spectator whitelists prevent browser mutation, other hands and answer leaks',()=>{
  const h=setup();assert.throws(()=>E.apply(h.state,{...command(h,1,'free_share'),serverAuthority:false}),/server_required/);voting(h);
  const shared=v(h,0);assert.deepEqual(shared.hand,[]);assert.equal(shared.storyCard,null);assert.deepEqual(shared.candidates,[]);assert(shared.table.every(t=>t.ownerPlayerNum===undefined&&t.voterNums===undefined&&t.isAnswer===undefined));assert(!('lifeRoom'in shared)&&!('hands'in shared)&&!('scores'in shared)&&!('deck'in shared));
  const header={mode:'life_story',publicLifeView:shared};assert.deepEqual(E.view(header,0).dixit,shared);assert.throws(()=>E.view(header,1),/server_required/);
});
test('host disconnection transfers role without dropping a temporary participant, explicit exclusions preserve locked cards and minimum',()=>{
  const h=setup();voting(h);const table=JSON.stringify(h.state.lifeRoom.turn.table);h.online=[2,3,4];h.state=LIFE.pulse(h.state,{onlineNums:h.online,now:200000,serverAuthority:true});assert.equal(h.state.hostPlayerNum,2);assert.equal(h.state.lifeRoom.cycle.opportunities['1'],'in_progress');
  ok(h,2,'excuse_player',{playerNum:1});assert.equal(h.state.phase,'FOLLOW_UP');assert(Object.values(h.state.scores).every(n=>n===0));
  h.online=[1,2,3,4];h.state=LIFE.pulse(h.state,{onlineNums:h.online,now:210000,serverAuthority:true});assert.equal(h.state.hostPlayerNum,2);ok(h,2,'next_in_order');voting(h);const locked=JSON.stringify(h.state.lifeRoom.turn.table);
  h.online=[1,2,3];h.state=LIFE.pulse(h.state,{onlineNums:h.online,now:220000,serverAuthority:true});ok(h,2,'excuse_player',{playerNum:4});assert.equal(JSON.stringify(h.state.lifeRoom.turn.table),locked);assert.notEqual(locked,table);
  h.online=[1,2];h.state=LIFE.pulse(h.state,{onlineNums:h.online,now:230000,serverAuthority:true});ok(h,2,'excuse_player',{playerNum:3});assert.equal(h.state.phase,'FOLLOW_UP');assert(Object.values(h.state.scores).every(n=>n===0));
});
test('mid-cycle membership adds next-turn cards/votes and next-cycle storytelling; normalized Firebase containers survive',()=>{
  const h=setup(3);start(h);h.state=E.membership(h.state,{roster:[1,2,3,4].map(playerNum=>({playerNum,name:String(playerNum)})),added:[{playerNum:4,name:'D'}],inactiveNums:[]},{serverAuthority:true,now:5000,seed:1,id:'join'});h.online.push(4);
  assert.equal(v(h,4).roster.find(p=>p.playerNum===4).opportunity,'next_cycle');assert.equal(act(h,4,'submit_card',{cardId:v(h,4).hand[0]}),'not_participant');submit(h);ok(h,1,'finish_story');const token=answer(h);ok(h,2,'cast_vote',{token});ok(h,3,'cast_vote',{token});reveal(h);follow(h);ok(h,1,'next_in_order');assert(h.state.lifeRoom.turn.participants.includes('4'));complete(h);follow(h);ok(h,1,'next_in_order');complete(h);follow(h);assert.equal(h.state.lifeRoom.cycle.opportunities['4'],'pending');
  const saved=JSON.parse(JSON.stringify(h.state));saved.lifeRoom.players=Object.fromEntries(saved.lifeRoom.players.map((p,i)=>[i,p]));saved.lifeRoom.deck=Object.fromEntries(saved.lifeRoom.deck.map((p,i)=>[i,p]));saved.lifeRoom.discard=Object.fromEntries(saved.lifeRoom.discard.map((p,i)=>[i,p]));delete saved.lifeRoom.events;delete saved.lifeRoom.turn.mulligans;delete saved.lifeRoom.turn.excused;delete saved.lifeRoom.turn.abstained;
  assert.deepEqual(E.view(saved,2).dixit.hand,v(h,2).hand);LIFE.assertCardInvariant(E.apply(saved,command(h,4,'claim_follow_up')));
});
test('question history survives end/restart and mode config language/pack stay independent',()=>{
  const h=setup();complete(h);const history=JSON.stringify(h.state.lifeRoom.questionHistory);ok(h,1,'end_game');assert.equal(JSON.stringify(h.state.lifeRoom.questionHistory),history);ok(h,1,'configure',{locale:'en',cardPackId:'dixit_base84'});ok(h,1,'restart');assert.equal(JSON.stringify(h.state.lifeRoom.questionHistory),history);assert.equal(v(h,1).config.cardPackId,'dixit_base84');assert.equal(v(h,1).locale,'en');ok(h,1,'deal');assert(v(h,1).candidates.every(q=>q.question.en));
});
test('manager control cannot fake an offline seat or perform player-only card actions',()=>{
  const h=setup();assert.equal(act(h,0,'choose_story_card',{cardId:v(h,1).hand[0]}),'not_eligible');ok(h,0,'end_game');h.online=[2,3];h.state=LIFE.pulse(h.state,{onlineNums:h.online,now:30000,serverAuthority:true});assert.equal(act(h,0,'deal'),'min_players');assert.equal(h.state.lifeRoom.players.find(p=>p.id==='1').connected,false);
});
test('presence recovers an initially offline host even when player presence values did not change',()=>{
  const s=E.create({id:'away-host',mode:'life_story',seed:19,now:1,hostPlayerNum:1,sharedControls:true,roster:[{playerNum:1,name:'A',active:false},{playerNum:2,name:'B'},{playerNum:3,name:'C'},{playerNum:4,name:'D'}]});
  const next=LIFE.pulse(s,{serverAuthority:true,onlineNums:[2,3,4],now:100});assert.equal(next.hostPlayerNum,2);assert.equal(next.lifeRoom.players[0].connected,false);
});
test('accepted command receipts keep game fields only and do not retain injected story text',()=>{
  const h=setup();ok(h,1,'free_share',{storyText:'PRIVATE_STORY_SENTINEL',transcript:'PRIVATE_TRANSCRIPT_SENTINEL'});
  assert(!JSON.stringify(h.state).includes('PRIVATE_STORY_SENTINEL'));assert(!JSON.stringify(h.state).includes('PRIVATE_TRANSCRIPT_SENTINEL'));
});

test('all seats and the shared manager see the same system choices and selected prompt, while only the teller can choose',()=>{
  const h=setup(),candidates=v(h,1).candidates;
  for(const actor of [0,1,2,3,4]){assert.deepEqual(v(h,actor).candidates,candidates);assert.equal(v(h,actor).actions.choose_question,actor===1);if(actor!==1)assert.equal(v(h,actor).storyCard,null);}
  assert.equal(act(h,2,'choose_question',{questionId:candidates[0].id}),'storyteller_only');
  ok(h,1,'choose_question',{questionId:candidates[1].id});
  const chosen=v(h,1).question;for(const actor of [0,1,2,3,4])assert.deepEqual(v(h,actor).question,chosen);
  ok(h,1,'choose_story_card',{cardId:v(h,1).hand[0]});ok(h,1,'start_story');submit(h);ok(h,1,'finish_story');
  for(const actor of [0,1,2,3,4]){assert.deepEqual(v(h,actor).question,chosen);assert.deepEqual(v(h,actor).candidates,[]);}
  for(const actor of [2,3,4])ok(h,actor,'cast_vote',{token:answer(h)});reveal(h);
  for(const actor of [0,1,2,3,4])assert.deepEqual(v(h,actor).question,chosen);
});

test('story may start before the secret card, which remains changeable until formal locking',()=>{
  const h=setup(),hand=v(h,1).hand.slice();
  assert.equal(act(h,1,'start_story'),'question_required');ok(h,1,'free_share');assert.equal(v(h,1).actions.start_story,true);
  ok(h,1,'start_story');assert.equal(v(h,1).storyCard,null);assert.equal(v(h,1).submission,null);
  ok(h,2,'submit_card',{cardId:v(h,2).hand[0]});
  ok(h,1,'choose_story_card',{cardId:hand[0]});ok(h,1,'choose_story_card',{cardId:hand[1]});
  assert.equal(v(h,1).storyCard,hand[1]);assert.equal(v(h,1).submission,hand[1]);assert.deepEqual(v(h,1).hand,hand);
  for(const actor of [0,2,3,4])assert.equal(v(h,actor).storyCard,null);
  assert.equal(act(h,2,'choose_story_card',{cardId:v(h,2).hand[1]}),'storyteller_only');
  for(const actor of [3,4])ok(h,actor,'submit_card',{cardId:v(h,actor).hand[0]});assert.equal(h.state.phase,'STORYTELLING');
  ok(h,1,'finish_story');assert.equal(h.state.phase,'VOTING');assert.equal(h.state.lifeRoom.turn.table.find(c=>c.ownerId==='1').cardId,hand[1]);
  assert(v(h,1).hand.includes(hand[0]));assert.equal(act(h,1,'choose_story_card',{cardId:hand[0]}),'wrong_phase');
});

test('finishing without a storyteller card waits in collecting without revealing or moving any reserved card',()=>{
  const h=setup(),hands=h.state.lifeRoom.players.map(p=>p.hand.slice());ok(h,1,'free_share');ok(h,1,'start_story');submit(h);
  ok(h,1,'finish_story');assert.equal(h.state.phase,'COLLECTING');assert.equal(v(h,0).storyCardRequired,true);assert.deepEqual(v(h,0).table,[]);
  assert.deepEqual(h.state.lifeRoom.players.map(p=>p.hand),hands);assert.equal(v(h,1).actions.choose_story_card,true);
  const restored=JSON.parse(JSON.stringify(h.state));assert.equal(E.view(restored,1).dixit.actions.choose_story_card,true);
  ok(h,2,'withdraw_submission');ok(h,2,'submit_card',{cardId:v(h,2).hand[1]});assert.equal(h.state.phase,'COLLECTING');
  ok(h,1,'choose_story_card',{cardId:hands[0][3]});assert.equal(h.state.phase,'VOTING');LIFE.assertCardInvariant(h.state);
});

test('server controls reveal countdown, answer-only interval, full scoring and exact-once refill',()=>{
  const h=setup();voting(h);const token=answer(h),answerCard=h.state.lifeRoom.turn.table.find(c=>c.token===token).cardId;
  assert.equal(act(h,1,'reveal'),'votes_incomplete');for(const actor of [2,3,4])ok(h,actor,'cast_vote',{token});
  assert.equal(h.state.phase,'VOTING');assert.equal(v(h,0).votesComplete,true);assert.deepEqual(Object.values(h.state.scores),[0,0,0,0]);assert(h.state.lifeRoom.players.every(p=>p.hand.length===7));
  assert.equal(act(h,2,'reveal'),'host_only');ok(h,1,'reveal');
  const turn=h.state.lifeRoom.turn,answerAt=turn.revealAnswerAt,popularAt=turn.revealPopularAt;assert.equal(answerAt-turn.revealStartedAt,3000);assert.equal(popularAt-answerAt,1200);
  const table=v(h,2).table;assert.equal(v(h,0).answerCardId,undefined);assert.equal(v(h,0).result,null);
  assert.equal(act(h,1,'advance_reveal',{now:answerAt-1}),'reveal_not_ready');
  h.state=LIFE.pulse(JSON.parse(JSON.stringify(h.state)),{serverAuthority:true,now:answerAt-1,onlineNums:h.online});assert.equal(v(h,0).answerCardId,undefined);
  h.state=LIFE.pulse(h.state,{serverAuthority:true,now:answerAt,onlineNums:h.online});
  for(const actor of [0,1,2,3,4]){const s=v(h,actor);assert.equal(s.revealStage,'answer');assert.equal(s.answerCardId,answerCard);assert.deepEqual(s.table,table);assert.equal(s.result,null);assert.deepEqual(s.deltas,{});assert.equal(s.actions.claim_follow_up,false);}
  assert.deepEqual(Object.values(h.state.scores),[0,0,0,0]);assert.equal(act(h,1,'advance_reveal',{now:popularAt-1}),'reveal_not_ready');
  h.state=LIFE.pulse(JSON.parse(JSON.stringify(h.state)),{serverAuthority:true,now:popularAt,onlineNums:h.online});assert.equal(h.state.phase,'REVEAL_DISCUSS');
  assert.deepEqual(Object.values(h.state.scores),[2,2,2,2]);assert(h.state.lifeRoom.players.every(p=>p.hand.length===8));
  const result=v(h,0).result;assert.equal(result.answerCardId,answerCard);assert.equal(result.table.length,4);assert(result.rows.every(row=>row.base===2&&row.bonus===0&&row.delta===2&&row.score===2));
  const settled=JSON.stringify(h.state);assert.strictEqual(LIFE.pulse(h.state,{serverAuthority:true,now:popularAt+5000,onlineNums:h.online}),h.state);assert.equal(JSON.stringify(h.state),settled);
});

test('pausing either reveal stage freezes and shifts authoritative deadlines, including after reconnect',()=>{
  for(const stage of ['countdown','answer']){
    const h=setup();voting(h);for(const actor of [2,3,4])ok(h,actor,'cast_vote',{token:answer(h)});ok(h,1,'reveal');
    const answerAt=h.state.lifeRoom.turn.revealAnswerAt,popularAt=h.state.lifeRoom.turn.revealPopularAt;
    const pauseAt=stage==='countdown'?answerAt-1000:answerAt+300;
    h.state=LIFE.pulse(h.state,{serverAuthority:true,now:pauseAt,onlineNums:h.online});ok(h,1,'pause',{now:pauseAt});
    h.state=LIFE.pulse(JSON.parse(JSON.stringify(h.state)),{serverAuthority:true,now:pauseAt+10000,onlineNums:h.online});assert.equal(h.state.lifeRoom.turn.revealStage,stage);assert.deepEqual(Object.values(h.state.scores),[0,0,0,0]);
    ok(h,1,'resume',{now:pauseAt+10000});assert.equal(h.state.lifeRoom.turn.revealAnswerAt,answerAt+10000);assert.equal(h.state.lifeRoom.turn.revealPopularAt,popularAt+10000);
    h.state=LIFE.pulse(h.state,{serverAuthority:true,now:popularAt+9999,onlineNums:h.online});assert.equal(h.state.phase,'REVEALING');
    h.state=LIFE.pulse(h.state,{serverAuthority:true,now:popularAt+10000,onlineNums:h.online});assert.equal(h.state.phase,'REVEAL_DISCUSS');assert.deepEqual(Object.values(h.state.scores),[2,2,2,2]);
  }
});

test('countdown and answer-only cancellation restore all played cards without settling, and old saves normalize safely',()=>{
  for(const stage of ['countdown','answer']){
    const h=setup(),initial=h.state.lifeRoom.players.map(p=>p.hand.slice().sort());voting(h);for(const actor of [2,3,4])ok(h,actor,'cast_vote',{token:answer(h)});
    const old=JSON.parse(JSON.stringify(h.state));for(const key of ['revealStage','revealStartedAt','revealAnswerAt','revealPopularAt','revealPausedAt'])delete old.lifeRoom.turn[key];
    h.state=LIFE.pulse(old,{serverAuthority:true,now:h.clock,onlineNums:h.online});assert.equal(v(h,0).actions.reveal,true);ok(h,1,'reveal');
    if(stage==='answer')h.state=LIFE.pulse(h.state,{serverAuthority:true,now:h.state.lifeRoom.turn.revealAnswerAt,onlineNums:h.online});
    ok(h,1,'cancel_turn');assert.equal(h.state.phase,'FOLLOW_UP');assert.equal(v(h,0).turnCancelled,true);assert.equal(v(h,2).eligibleFollowUp,false);assert.equal(h.state.lifeRoom.cycle.opportunities['1'],'pending');
    assert(h.state.lifeRoom.players.every((p,i)=>JSON.stringify(p.hand.slice().sort())===JSON.stringify(initial[i])));assert.deepEqual(Object.values(h.state.scores),[0,0,0,0]);LIFE.assertCardInvariant(h.state);
  }
});
