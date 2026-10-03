const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const rootPath = path.resolve(__dirname, '..');

function harness(overrides = {}, embeddedCard = false, extraContext = {}) {
  let now=1000;
  const context = { window: {}, console };
  context.window.CHAT_WOLF_V3_RULES = RULES;
  context.window.CHAT_WOLF_V3_CONTENT = { topics:[{
    id:'travel',category:'Travel',mainQuestion:'What do you like about trips?',
    entryPrompts:['Food?','Time alone?'],followUps:[{id:'travel-f1',text:'What can go wrong?'}],
  }] };
  vm.createContext(context);
  for (const file of ['chat-wolf-copy.js','chat-wolf-v3-ui.js']) vm.runInContext(fs.readFileSync(path.join(rootPath,file),'utf8'),context);
  const players = ['a','b','c','d','e','f'].map((id,i)=>({id,name:'Player '+(i+1),isHost:i===0,ready:true}));
  const current = {
    public: {
      code:'TEST01',rulesVersion:3,flowVersion:3,matchId:'match-1',gameNumber:1,phase:'TALK',round:1,totalRounds:3,
      players,settings:{...RULES.defaults,talkEndBehavior:undefined,wrapUpSeconds:30,enabledProfessions:[...RULES.defaults.enabledProfessions]},
      topic:context.window.CHAT_WOLF_V3_CONTENT.topics[0],usedFollowUpIds:[],activeFollowUp:null,
      voteHistory:[],deadlineAt:10000,paused:false,
      ...overrides.public,
    },
    private: {
      playerId:'a',isHost:false,role:'WOLF',profession:null,
      wolfTeam:[players[0],players[1]],tasks:[
        {id:'w1',text:'Secret wolf action one.',completed:null},
        {id:'w2',text:'Secret wolf action two.',completed:{by:'b',at:1,round:1}},
        {id:'w3',text:'Secret wolf action three.',completed:null},
      ],
      actions:{canCompleteTask:true}, ...overrides.private,
    },
  };
  const calls=[];
  const htmlEsc = value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const api=context.window.CHAT_WOLF_V3_UI.create({
    esc:htmlEsc,getState:()=>current,now:()=>now,embeddedCard,playerName:id=>players.find(p=>p.id===id)?.name || 'Unknown',
    action:async(action,payload)=>{calls.push({action,payload});return true;},
    roomBar:()=>'<header>Room</header>',timer:()=>'<div class="timer">10:00</div>',playerRows:()=>'<div>Players</div>',
    showToast:()=>{},rerender:()=>{},privateCardUrl:()=>'/chat-wolf.html?card=1#session=private',...extraContext,
  });
  return {api,current,calls,context,setNow:value=>{now=value;}};
}

test('pending direction remains central after 30 seconds and old Got it cannot dismiss it; completion is separate',async()=>{
  const {api,current,calls,setNow}=harness({public:{flowVersion:4},private:{role:'JESTER',tasks:null,
    secretDirection:{id:'notice-1',text:'Start with “Breaking news!”',noticeShownAt:null,noticeUnlockAt:null,noticeAcknowledgedAt:null,swapsRemaining:1},
    actions:{canCompleteDirection:true,canShowDirectionNotice:true}}});
  let html=api.render();
  assert.match(html,/role="dialog" aria-modal="true"/);assert.match(html,/Keep this direction open/);
  assert.doesNotMatch(html,/data-direction-notice-close|Got it/);assert.equal(calls.length,0);
  const click=()=>api.handleClick({target:{closest:()=>({dataset:{v3Action:'acknowledgeDirection',directionId:'notice-1'},disabled:false})}});
  await click();assert.equal(calls.length,0,'old or forged Got it cannot dismiss a pending instruction');
  Object.assign(current.private.secretDirection,{noticeShownAt:1000,noticeUnlockAt:31000});setNow(30999);
  html=api.render();assert.match(html,/role="dialog"/);await click();assert.equal(calls.length,0);
  setNow(31000);html=api.render();assert.doesNotMatch(html,/data-direction-notice-close|Got it/);
  await click();assert.equal(calls.length,0);
  assert.match(html,/data-v3-action="completeDirection"/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'completeDirection',directionId:'notice-1'}})}});
  assert.equal(calls[0].action,'completeDirection');assert.equal(calls[0].payload.directionId,'notice-1');
  current.private.secretDirection.completed={at:31000,round:1};
  assert.doesNotMatch(api.render(),/role="dialog"/);
});

test('meeting-closed direction folds below and remains readable without obstructing the next round',async()=>{
  const {api,current,calls}=harness({public:{flowVersion:4},private:{role:'VILLAGER',tasks:null,
    secretDirection:{id:'notice-1',text:'Sing one sentence.',noticeClosedAt:100,noticeClosedReason:'meeting',swapsRemaining:1},actions:{}}});
  let html=api.render();assert.doesNotMatch(html,/role="dialog"/);
  assert.match(html,/<details class="panel v6-secret-direction" data-detail="saved-secret-direction">/);
  assert.match(html,/id="direction-notice-reopen"/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'openDirectionNotice',directionId:'notice-1'},disabled:false})}});
  html=api.render();assert.match(html,/role="dialog"/);assert.doesNotMatch(html,/Got it · 30s/);
  assert.match(html,/Back to my card/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'closeDirectionNotice',directionId:'notice-1'},disabled:false})}});
  assert.equal(calls.length,0,'rereading a meeting-folded direction needs no server command');
  assert.doesNotMatch(api.render(),/role="dialog"/);
  current.private.secretDirection={id:'notice-2',text:'Start with “Plot twist!”',noticeAcknowledgedAt:null};
  html=api.render();assert.match(html,/Keep this direction open/);assert.match(html,/data-direction-notice-id="notice-2"/);
  current.public.phase='MEETING_DISCUSS';
  assert.doesNotMatch(api.render(),/role="dialog"/,'meetings fold immediately, even on pre-upgrade data');
});

test('visible persistent popup starts one receipt, traps focus and does not gain a timed close button',async()=>{
  const {api,current,calls,context,setNow}=harness({public:{flowVersion:4},private:{role:'JESTER',tasks:null,
    secretDirection:{id:'notice-1',text:'Sing one sentence.',noticeShownAt:null,noticeUnlockAt:null,noticeAcknowledgedAt:null}}});
  api.render();
  const background={inert:false},header={inert:false},help={textContent:''};let focusCount=0;
  const doc={hidden:true,activeElement:{id:'old-control'},body:{classList:{toggle(){}}}};
  const heading={focus(){doc.activeElement=heading;focusCount++;}},language={dataset:{v3Action:'toggleTaskLanguage'},disabled:false,focus(){doc.activeElement=language;}},close={dataset:{v3Action:'completeDirection'},disabled:false,focus(){doc.activeElement=close;}};
  const popup={contains:e=>[heading,language,close].includes(e),querySelector:selector=>selector==='[data-direction-notice-close]'?close:selector==='[data-direction-notice-help]'?help:heading,
    querySelectorAll:()=>[language,close].filter(b=>!b.disabled)};
  doc.querySelector=()=>popup;doc.querySelectorAll=selector=>selector==='.site-header'?[header]:[background,popup];context.window.document=doc;
  api.updateDirectionNotice();assert.equal(calls.length,0,'background tabs do not start the reading window');
  doc.hidden=false;api.updateDirectionNotice();api.updateDirectionNotice();
  assert.equal(calls.length,1);assert.equal(calls[0].action,'showDirectionNotice');assert.equal(focusCount,1);
  assert.equal(background.inert,true);assert.equal(header.inert,true);
  current.private.secretDirection.noticeShownAt=1000;current.private.secretDirection.noticeUnlockAt=31000;
  setNow(31000);api.updateDirectionNotice();assert.equal(help.textContent.includes('Keep this direction open'),true);assert.equal(focusCount,1);
  let prevented=0;doc.activeElement=close;api.handleKeydown({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});assert.equal(doc.activeElement,language);
  api.handleKeydown({key:'Escape',preventDefault(){prevented++;},stopPropagation(){}});assert.equal(prevented,2);
  await Promise.resolve();
});

test('wolf task volunteers show teammates privately, allow undo, and do not replace the completion button',async()=>{
  const {api,current,calls}=harness({public:{flowVersion:4},private:{actions:{canCompleteTask:true,canVolunteerTask:true},
    tasks:[{id:'w1',text:'Say “Plot twist!”',volunteerIds:['b'],completed:null}]}},true);
  const actionsRow=html=>{
    const task=html.match(/<article\b[^>]*data-player-task="w1"[^>]*>([\s\S]*?)<\/article>/)?.[1];
    assert.ok(task,'the named task must have its own card');
    // The support column contains its own div; match through the task's end,
    // not the first closing div inside the shared actions row.
    const rowMatch=task.match(/<div\b[^>]*class="[^"]*\bv7-task-actions\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/);
    const row=rowMatch?.[1];
    assert.ok(row,'completion and cooperation need one shared actions row');
    const support=row.match(/<div\b[^>]*class="[^"]*\bv7-task-support\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/)?.[1];
    assert.ok(support,'intent button and volunteer names need one right support column');
    assert.ok(row.indexOf('data-v3-action="completeTask"')<row.indexOf('v7-task-support'),'completion must come first on the left');
    assert.doesNotMatch(task.slice(0,rowMatch.index),/data-task-volunteers|Planning to do it/,'names must not consume a separate line above the actions');
    assert.match(row,/data-v3-action="completeTask"[^>]*data-task-id="w1"/);
    assert.match(row,/data-v3-action="completeTask"[^>]*>I completed the task<\/button>/,'the completion label remains unchanged');
    const completion=row.match(/<button\b[^>]*data-v3-action="completeTask"[^>]*>/)?.[0];
    assert.doesNotMatch(completion,/class="[^"]*\b(?:ghost|secondary)\b/,'completion remains the primary button');
    assert.match(support,/<button\b[^>]*class="[^"]*\bghost\b[^"]*"[^>]*data-v3-action="(?:volunteerTask|withdrawTaskVolunteer)"[^>]*data-task-id="w1"/);
    assert.match(support,/<p\b[^>]*data-task-volunteers[^>]*>Planning to do it:/);
    assert.equal((row.match(/<button\b/g)||[]).length,2);
    return row;
  };
  let html=api.render();assert.match(html,/Planning to do it: Player 2/);assert.match(html,/>Let me do it<\/button>/);
  assert.doesNotMatch(html,/I&#039;ll do it|>I'll do it<\/button>/);
  assert.match(actionsRow(html),/data-v3-action="volunteerTask"[^>]*data-task-id="w1"[^>]*aria-pressed="false"/);
  assert.match(html,/data-v3-action="completeTask"/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'volunteerTask',taskId:'w1'}})}});
  assert.equal(calls[0].action,'volunteerTask');assert.equal(calls[0].payload.taskId,'w1');
  current.private.tasks[0].volunteerIds=['a','b'];html=api.render();
  assert.match(html,/Planning to do it: Player 1, Player 2/);assert.match(html,/I&#039;m doing it · Undo/);
  assert.match(actionsRow(html),/data-v3-action="withdrawTaskVolunteer"[^>]*data-task-id="w1"[^>]*aria-pressed="true"/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'withdrawTaskVolunteer',taskId:'w1'}})}});
  assert.equal(calls[1].action,'withdrawTaskVolunteer');assert.equal(calls[1].payload.taskId,'w1');
  current.private.actions.canVolunteerTask=false;assert.doesNotMatch(api.render(),/data-v3-action="volunteerTask"|data-v3-action="withdrawTaskVolunteer"/);
});

test('paused and meeting cards keep existing volunteer names in the right support column without enabling actions',()=>{
  const {api,current}=harness({public:{flowVersion:4,paused:true},private:{
    actions:{canCompleteTask:false,canVolunteerTask:false},
    tasks:[{id:'w1',text:'Say one odd sentence.',volunteerIds:['a','b'],completed:null}]}},true);
  for(const phase of ['TALK','MEETING_TURNS']){
    current.public.phase=phase;
    current.public.paused=phase==='TALK';
    const html=api.render();
    const task=html.match(/<article\b[^>]*data-player-task="w1"[^>]*>([\s\S]*?)<\/article>/)?.[1];
    const rowMatch=task?.match(/<div\b[^>]*class="[^"]*\bv7-task-actions\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/);
    assert.ok(rowMatch,'existing coordination remains in its compact row when actions are unavailable');
    const row=rowMatch[1],support=row.match(/<div\b[^>]*class="[^"]*\bv7-task-support\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/)?.[1];
    assert.match(support,/data-task-volunteers>Planning to do it: Player 1, Player 2<\/p>/);
    assert.match(row.slice(0,row.indexOf('v7-task-support')),/>Not completed<\/span>/,'left completion state stays unchanged');
    assert.doesNotMatch(task.slice(0,rowMatch.index),/data-task-volunteers|Planning to do it/);
    assert.doesNotMatch(task,/data-v3-action="volunteerTask"|data-v3-action="withdrawTaskVolunteer"|data-v3-action="completeTask"/);
  }
});

test('village tasks and host presentation never get wolf volunteer controls or names',()=>{
  const village=harness({public:{flowVersion:4},private:{role:'VILLAGER',tasks:null,profession:'judge',
    villageTask:{id:'v1',text:'Give your opinion.',volunteerIds:['b']},actions:{canCompleteTask:true,canVolunteerTask:true}}},true);
  assert.doesNotMatch(village.api.render(),/Planning to do it|data-task-volunteers|volunteerTask|Let me do it|I&#039;m doing it/);
  const host=harness({public:{flowVersion:4},private:{isHost:true,actions:{canVolunteerTask:true}}});
  assert.doesNotMatch(host.api.render(),/Planning to do it|data-task-volunteers|volunteerTask|Let me do it|I&#039;m doing it/);
});

test('saved V3 wolf cards render cooperation with base copy rather than requiring V4 copy',async()=>{
  const {api,calls,current}=harness({private:{actions:{canVolunteerTask:true,canCompleteTask:true},
    tasks:[{id:'w1',text:'Say one odd sentence.',volunteerIds:['a','b'],completed:null}]}},true);
  const html=api.render();
  assert.match(html,/Planning to do it: Player 1, Player 2/);
  assert.match(html,/I&#039;m doing it · Undo/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'withdrawTaskVolunteer',taskId:'w1'}})}});
  assert.equal(calls[0].action,'withdrawTaskVolunteer');
  current.private.tasks[0].volunteerIds=['b'];
  assert.match(api.render(),/>Let me do it<\/button>/);
  assert.doesNotMatch(api.render(),/I&#039;ll do it/);
});

test('new popup waits for a running swap request before sending its display receipt',async()=>{
  let ready=false;
  const {api,calls,context}=harness({public:{flowVersion:4},private:{role:'JESTER',tasks:null,
    secretDirection:{id:'after-swap',text:'Sing one sentence.',noticeShownAt:null}}},true,
    {canStartAction:()=>ready});
  api.render();
  const heading={focus(){}};
  const popup={querySelector:()=>heading,querySelectorAll:()=>[],contains:()=>true};
  context.window.document={hidden:false,activeElement:heading,body:{classList:{toggle(){}}},
    querySelector:()=>popup,querySelectorAll:()=>[]};
  api.updateDirectionNotice();assert.equal(calls.length,0);
  ready=true;api.updateDirectionNotice();api.updateDirectionNotice();
  assert.equal(calls.length,1);assert.equal(calls[0].action,'showDirectionNotice');
  await Promise.resolve();
});

test('Director private card offers one simple target selector and preserves choices through refreshes',async()=>{
  const {api,calls}=harness({public:{flowVersion:4},private:{wolfProfession:'director',
    wolfAbility:{type:'director',used:false,targets:[{id:'c',name:'Jessie'},{id:'d',name:'Leo'}],options:[
      {id:'d1',text:'Sing your next sentence.'},{id:'d2',text:'Make a short drumroll.'},{id:'d3',text:'Start with “Breaking news!”'}]},
    actions:{canSendDirection:true}}});
  let html=api.render();
  assert.match(html,/Director Wolf/);assert.match(html,/Send Direction/);
  assert.match(html,/<details data-detail="wolf-role-rules">/,'role ability rules remain available');
  assert.equal((html.match(/>Random<\/option>/g)||[]).length,1);
  assert.match(html,/>Jessie<\/option>/);assert.match(html,/>Leo<\/option>/);
  assert.doesNotMatch(html,/Choose random|Choose player|Control Wolf|Puppet Wolf/);
  api.handleChange({target:{name:'targetId',value:'d',form:{id:'v6-director-form'}}});
  api.handleChange({target:{name:'directionId',value:'d2',form:{id:'v6-director-form'}}});
  html=api.render();assert.match(html,/value="d" selected/);assert.match(html,/value="d2" selected/);
  await api.handleSubmit({preventDefault(){},target:{id:'v6-director-form',elements:{targetId:{value:'d'},directionId:{value:'d2'}}}});
  assert.equal(calls.at(-1).action,'sendDirection');assert.deepEqual({...calls.at(-1).payload},{targetId:'d',directionId:'d2'});
});

test('Secret Direction is playable on a Jester card without a sender or a wolf-task control',async()=>{
  const {api,calls}=harness({public:{flowVersion:4},private:{role:'JESTER',wolfTeam:null,tasks:null,
    secretDirection:{id:'opaque-1',text:'Start with “Breaking news!”',completed:null,swapsRemaining:1},
    actions:{canCompleteDirection:true,canSwapDirection:true}}});
  const html=api.render();
  assert.match(html,/Secret Direction/);assert.match(html,/I did it/);assert.match(html,/Swap direction/);
  assert.doesNotMatch(html,/v6-director-form|Send Direction|data-v3-action="completeTask"/);
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'completeDirection',directionId:'opaque-1'},disabled:false})}});
  assert.equal(calls.at(-1).action,'completeDirection');assert.equal(calls.at(-1).payload.directionId,'opaque-1');
});

test('Temporary Topic is shown once with its own countdown; drafted short text survives rerender',async()=>{
  const {api,current,calls}=harness({public:{flowVersion:4,serverNow:1000,temporaryTopic:{id:'temp-1',text:'What hobby would be hardest to quit?',deadlineAt:181000,remainingMs:null}},private:{
    wolfProfession:'topic_shifter',wolfAbility:{type:'topic_shifter',used:false},actions:{canChangeTopic:true}}});
  api.render();api.handleInput({target:{value:'Which friend replies last?',form:{id:'v6-topic-shifter-form'}}});
  let html=api.render();
  assert.equal((html.match(/What hobby would be hardest to quit\?/g)||[]).length,1);
  assert.match(html,/<div class="eyebrow">Temporary topic<\/div>/);
  assert.doesNotMatch(html,/v4-topic-label|<div class="eyebrow">Main topic<\/div>/);
  assert.match(html,/data-temporary-deadline="181000"/);assert.match(html,/>3:00<\/span>/);
  assert.match(html,/Which friend replies last\?/);assert.match(html,/maxlength="150"/);
  assert.doesNotMatch(html,/data-v3-action="endTemporaryTopic"/);
  await api.handleSubmit({preventDefault(){},target:{id:'v6-topic-shifter-form',elements:{text:{value:' Which friend replies last? '}}}});
  assert.equal(calls.at(-1).action,'changeTopic');assert.equal(calls.at(-1).payload.text,'Which friend replies last?');
  current.private.isHost=true;current.private.actions={canEndTemporaryTopic:true};
  html=api.render();assert.match(html,/data-temporary-topic-id="temp-1"/);assert.doesNotMatch(html,/v6-topic-shifter-form/);
});

test('Host presentation never renders wolf abilities or a directed host’s private performance',()=>{
  const {api}=harness({public:{flowVersion:4},private:{isHost:true,wolfProfession:'director',
    wolfAbility:{type:'director',used:false,options:[{id:'secret',text:'PRIVATE OPTION'}],targets:[]},
    secretDirection:{id:'hidden',text:'PRIVATE DIRECTION',swapsRemaining:1},actions:{canSendDirection:true,canCompleteDirection:true}}});
  assert.doesNotMatch(api.render(),/PRIVATE OPTION|PRIVATE DIRECTION|v6-director-form|v6-secret-direction|class="role-title[^>]*>Director Wolf/);
});

test('Lobby has required Director, optional Topic Shifter and no interaction quota input',()=>{
  const {api}=harness({public:{phase:'LOBBY',flowVersion:4,matchId:null,topic:null},private:{isHost:true,role:null,tasks:null}});
  const html=api.render();assert.match(html,/Required · always included/);assert.match(html,/name="wolfRole" value="topic_shifter"/);
  assert.match(html,/name="temporaryTopicSeconds"[^>]*value="180"/);assert.doesNotMatch(html,/name="interactionTaskCount"|Control Wolf|Puppet Wolf/);
});

test('paused follow-ups cannot be clicked and extensions show the updated estimate',()=>{
  const {api,current}=harness({public:{extensionSeconds:120,estimatedSeconds:2360},private:{isHost:true,actions:{canFollowUp:true}}});
  assert.match(api.render(),/Estimated core game: 39 min 20 s/);
  assert.match(api.render(),/data-v3-action="followUp"/);
  current.public.paused=true;
  assert.doesNotMatch(api.render(),/data-v3-action="followUp"|data-v3-action="clearFollowUp"/);
});

test('v3 host presentation renders no role, secret tasks, rewards, or own ballot even if unsanitized input is supplied',()=>{
  const {api,current}=harness({private:{isHost:true,villageTask:{id:'v1',text:'PRIVATE VILLAGE TASK'},reward:{result:{text:'PRIVATE CLUE'}}}});
  let html=api.render();
  assert.match(html,/Host presentation/);
  assert.match(html,/Open my private card/);
  assert.doesNotMatch(html,/Secret wolf action|PRIVATE VILLAGE TASK|PRIVATE CLUE|Your private card|data-task-id|v3-vote-form/);
  current.public.phase='VOTING';
  current.public.voting={id:'vote-1',type:'MIDGAME',requiredSelections:2,submittedPlayerIds:['a']};
  html=api.render();
  assert.match(html,/Cast your own vote on your private card/);
  assert.doesNotMatch(html,/v3-vote-form|Your private card|Secret wolf action/);
  current.public.phase='JUDGE_DECISION';
  current.private.judgeDecision={candidates:['c','d'],seats:1,submitted:false};
  assert.doesNotMatch(api.render(),/v3-judge-form/);
});

test('embedded host card has the same playable wolf card as other players, with one-button tasks and no reports',()=>{
  const {api}=harness({private:{isHost:true}},true);
  const html=api.render();
  assert.match(html,/Your private card/);
  assert.match(html,/Wolf team tasks 1\/3/);
  assert.match(html,/Secret wolf action one/);
  assert.equal((html.match(/data-v3-action="completeTask"/g)||[]).length,2);
  assert.doesNotMatch(html,/<textarea|name="note"|name="target"|name="summary"|Host presentation|<details[^>]*task/);
});

test('v3 voting excludes self, offers explicit abstain, and locks submitted votes',()=>{
  const {api,current}=harness({
    public:{phase:'VOTING',voting:{id:'vote-1',type:'FINAL',requiredSelections:2,submittedPlayerIds:[]}},
    private:{role:'VILLAGER',tasks:null,wolfTeam:null,actions:{canSubmitVote:true}},
  });
  let html=api.render();
  assert.doesNotMatch(html,/id="v3-a"/);
  assert.match(html,/id="v3-b"/);
  assert.match(html,/data-v3-action="abstain"/);
  assert.match(html,/Choose up to 2 other players/);
  assert.doesNotMatch(html,/Choose exactly 2|may choose yourself/);
  current.private.myVoteSubmitted=true;
  html=api.render();
  assert.match(html,/submitted and locked/);
  assert.doesNotMatch(html,/id="v3-vote-form"/);
});

test('v3 lobby offers unique profession pool, complete question preview, defaults and estimated time',()=>{
  const {api}=harness({public:{phase:'LOBBY',matchId:null,topic:null},private:{isHost:true,role:null,tasks:null}});
  const html=api.render();
  assert.match(html,/37 min 20 s/);
  assert.match(html,/Each profession appears at most once/);
  assert.match(html,/ordinary villagers/);
  assert.match(html,/What do you like about trips/);
  assert.match(html,/What can go wrong/);
  assert.match(html,/Round 2 starts with one unused follow-up/);
  assert.doesNotMatch(html,/kindred|Same-interest|bellEnabled|Speaking time/);
  assert.equal((html.match(/name="profession"/g)||[]).length,6);
  assert.doesNotMatch(html,/>playerCount<|>wolfCount<|undefined/);
});

test('v3 village reward output is readable and escaped, with no note requirement',()=>{
  const {api,current}=harness({private:{
    role:'VILLAGER',profession:'reporter',tasks:null,wolfTeam:null,
    villageTask:{id:'r1',text:'Ask another player what they dislike.',completed:{by:'a',round:1}},
    reward:{unlocked:true,used:true,result:{targetId:'c',selections:['d','f'],abstained:false}},
  }});
  let html=api.render();
  assert.match(html,/Their submitted choices: Player 4, Player 6/);
  assert.doesNotMatch(html,/<textarea|name="note"|name="summary"/);
  current.private.reward.result={targetId:'c',selections:[],abstained:true};
  assert.match(api.render(),/No valid ballot/);
  current.private.profession='veteran';
  current.private.reward.result={text:'<script>test</script>'};
  assert.match(api.render(),/&lt;script&gt;test&lt;\/script&gt;/);
});

test('v3 final tie card lists only boundary candidates and results reveal public task status',()=>{
  const {api,current}=harness({public:{phase:'JUDGE_DECISION'},private:{
    role:'VILLAGER',profession:'judge',tasks:null,wolfTeam:null,judgeDecision:{candidates:['c','d'],seats:1,submitted:false},
  }});
  let html=api.render();
  assert.match(html,/Your private tie decision/);
  assert.match(html,/Choose exactly 1/);
  assert.match(html,/id="v3-c"/);
  assert.doesNotMatch(html,/id="v3-b"/);
  current.public.phase='FINISHED';
  current.public.result={outcome:'WOLVES',reason:'ALL_TASKS_REPORTED'};
  current.public.reveal={roles:{a:'VILLAGER',b:'WOLF'},professions:{a:'judge'},tasks:[{id:'w1',text:'Test task',completed:{by:'b'}}],villageTasks:[],jester:null};
  html=api.render();
  assert.match(html,/Wolves win!/);
  assert.match(html,/Player-reported completion/);
  assert.match(html,/Completed · player-reported/);
});

test('new create settings default to free-chat v3 and preserve visible Jester choice',()=>{
  const {api}=harness();
  const settings=api.readSettings({elements:{playerCount:{value:'6'},wolfCount:{value:'2'},jesterEnabled:{checked:false}},dataset:{}});
  assert.equal(settings.mode,'free-chat-v3');
  assert.equal(settings.talkSeconds,600);
  assert.equal(settings.roundCount,3);
  assert.equal(settings.jesterEnabled,false);
  assert.equal(settings.taskCount,3);
  assert.match(api.entryFields(),/name="jesterEnabled"/);
});

test('actual engine projections render every role through a full three-round game',()=>{
  const E=require('../chat-wolf-v3-engine.js');
  let now=1000;
  const room=E.createRoom({code:'UITEST',hostPlayerId:'a',hostSessionHash:'sa',hostName:'Player 1',settings:{playerCount:12,infoRoleLimit:2},now,seed:8134});
  for(let i=1;i<12;i++) E.addPlayer(room,{playerId:String.fromCharCode(97+i),sessionHash:'s'+i,name:'Player '+(i+1),now});
  const send=(action,payload={})=>E.dispatch(room,'a',action,payload,++now);
  function check() {
    for (const player of Object.values(room.players)) {
      const projection=E.projectState(room,player.id,now);
      const {api}=harness(projection,player.isHost);
      const html=api.render();
      assert.doesNotMatch(html,/undefined|NaN/,room.phase+' '+player.id);
      if(room.phase!=='LOBBY' && room.phase!=='FINISHED') {
        assert.match(html,/What|[A-Za-z]/);
        const host=harness({...projection,private:{...projection.private,isHost:true}},false).api.render();
        for(const task of room.tasks || []) assert.ok(!host.includes(task.text),'host task not present');
      }
    }
  }
  check();
  send('startGame');check();
  send('beginTalk');check();
  while(room.phase!=='FINISHED') {
    if(['TALK','WRAP_UP'].includes(room.phase))send('endTalk');
    else if(room.phase==='FINAL_CLUES')send('endClues');
    else if(['MEETING_DISCUSS','MEETING_TURNS'].includes(room.phase))send('endMeeting');
    else if(room.phase==='VOTING')send('endVote');
    else throw new Error('Unexpected phase '+room.phase);
    check();
  }
  assert.equal(room.result.outcome,'DRAW');
});

test('v4 private reading order is role, full question, task and reward; no oversized chat controls',()=>{
  const {api}=harness({public:{flowVersion:4,deadlineAt:null},private:{role:'VILLAGER',profession:'contrarian',tasks:null,wolfTeam:null,
    villageTask:{id:'c1',text:'Say one upside of a noisy kitchen.',textZh:'說一個吵雜廚房的好處。',completed:null},
    reward:{unlocked:false}}},true);
  const html=api.render();
  assert.ok(html.indexOf('Village team')<html.indexOf('data-current-question'));
  assert.ok(html.indexOf('data-current-question')<html.indexOf('Say one upside'));
  assert.ok(html.indexOf('Say one upside')<html.indexOf('Your reward'));
  assert.match(html,/Other Side/);
  assert.doesNotMatch(html,/>Everyone can talk<|>Player cards<|data-elapsed-ms|class="timer"/);
  assert.doesNotMatch(html,/v4-question-peek/);
  assert.match(html,/What do you like about trips/);
  assert.equal(html.split('What do you like about trips?').length-1,1);
});

test('modern private question panels omit duplicate titles and main eyebrows while host panels retain them',()=>{
  const topic={id:'travel',shortTitle:'Our Short Trip Title',title:'Our Full Trip Title',category:'Travel',
    mainQuestion:'What do you like about trips?',entryPrompts:['Food?'],followUps:[{id:'travel-f1',text:'What can go wrong?'}]};
  for(const role of ['WOLF','VILLAGER','JESTER']){
    const {api}=harness({public:{flowVersion:4,round:2,topic},private:{role}},true);
    const html=api.render();
    const panel=html.match(/<section class="question-card v3-topic v4-topic-full[^\"]*">([\s\S]*?)<\/section>/)?.[1];
    assert.ok(panel);
    assert.match(panel,/>Round 2 of 3<\/span>/);
    assert.match(panel,/data-current-question>What do you like about trips\?<\/h2>/);
    assert.doesNotMatch(panel,/v4-topic-label|Our Short Trip Title|Our Full Trip Title|<div class="eyebrow">Main topic<\/div>/);
    assert.equal((panel.match(/What do you like about trips\?/g)||[]).length,1);
  }
  const host=harness({public:{flowVersion:4,round:2,topic},private:{isHost:true}});
  const hostHtml=host.api.render();
  assert.match(hostHtml,/<span class="v4-topic-label">Our Short Trip Title<\/span>/);
  assert.match(hostHtml,/<div class="eyebrow">Main topic<\/div>/);
  assert.match(hostHtml,/data-current-question>What do you like about trips\?<\/h2>/);
});

test('completion rows use readable primary text and top alignment rather than stretching to volunteer names',()=>{
  const css=fs.readFileSync(path.join(rootPath,'chat-wolf.css'),'utf8');
  const row=css.match(/\.v7-task-actions\s*\{([^}]+)\}/)?.[1];
  const sharedButton=css.match(/\.v7-task-actions\s+\.btn\s*\{([^}]+)\}/)?.[1]||'';
  const button=css.match(/\.v7-task-actions\s*>\s*\.btn\s*\{([^}]+)\}/)?.[1]||sharedButton;
  assert.match(row,/align-items:\s*start\b/);
  assert.doesNotMatch(row,/align-items:\s*stretch\b/);
  assert.match(button,/font-size:\s*(?:0)?\.95rem\b/);
  const minimum=Number((button.match(/min-height:\s*(\d+)px\b/)||sharedButton.match(/min-height:\s*(\d+)px\b/))?.[1]);
  assert.ok(minimum>=44,'the primary control must have at least a 44px tap target');
  assert.match(sharedButton+button,/white-space:\s*normal\b/);
  assert.doesNotMatch(button,/(?:^|;)\s*height:\s*(?:100%|\d+px)\b/,'the primary button should keep its natural content height');
});

test('readable private cards use camp colors, one progress heading, essential controls and footer room info',()=>{
  const {api,current}=harness({public:{flowVersion:4,phase:'ROLE_REVEAL'},private:{roleAcknowledged:false}},true);
  let html=api.render();
  assert.match(html,/v5-role-wolf/);
  assert.match(html,/<h2 class="role-title wolf">Wolf<\/h2>/);
  assert.equal(html.split('Wolf tasks 1/3').length-1,1);
  assert.doesNotMatch(html,/Shared by all wolves|v5-task-meta|data-detail="wolf-task-rules"|<header>Room<\/header>/);
  assert.match(html,/<div class="team-list" aria-label="Wolf team">/);
  assert.match(html,/<span class="team-chip">Player 1<\/span>/);
  assert.match(html,/<span class="team-chip">Player 2<\/span>/);
  assert.match(html,/data-v3-action="toggleTaskLanguage"/);
  assert.match(html,/<details class="panel v3-rules" data-detail="v3-rules">/);
  assert.ok(html.indexOf('v5-room-info')>html.indexOf('Secret wolf action three'));
  assert.match(html,/<dd>TEST01<\/dd>/);
  assert.match(html,/data-v3-action="ackRole"/);
  current.private.role='JESTER';current.private.tasks=null;
  html=api.render();assert.match(html,/<h2 class="role-title jester">Jester<\/h2>/);
  current.private.role='VILLAGER';current.private.profession='bait';
  html=api.render();assert.match(html,/<h2 class="role-title villager">Bait<\/h2>/);
  current.public.phase='LOBBY';assert.match(api.render(),/<header>Room<\/header>/);
});

test('role colors are readable red, yellow and green without relying on color alone',()=>{
  const css=fs.readFileSync(path.join(rootPath,'chat-wolf.css'),'utf8');
  assert.match(css,/\.role-title\.wolf\s*\{\s*color:\s*#ff8996/);
  assert.match(css,/\.role-title\.jester\s*\{\s*color:\s*#ffdc73/);
  assert.match(css,/\.role-title\.villager\s*\{\s*color:\s*#78e5a6/);
  for(const role of ['WOLF','JESTER','VILLAGER']){
    const html=harness({public:{flowVersion:4},private:{role,isHost:true}}).api.render();
    assert.doesNotMatch(html,/v5-role-wolf|v5-role-jester|v5-role-villager|Secret wolf action/);
  }
});

test('a manual follow-up displays once above tasks and retains the original only in collapsed context',()=>{
  const {api}=harness({public:{flowVersion:4,activeFollowUp:{id:'f1',text:'Which trip would you repeat?'}}},true);
  const html=api.render();
  assert.equal(html.split('Which trip would you repeat?').length-1,1);
  assert.equal(html.split('What do you like about trips?').length-1,1);
  assert.match(html,/<details class="v4-original-topic" data-detail="original-topic">/);
  assert.match(html,/<div class="eyebrow">Currently discussing<\/div>/);
  assert.doesNotMatch(html,/v4-topic-label|<div class="eyebrow">Main topic<\/div>/);
  assert.doesNotMatch(html,/v4-question-peek/);
});

test('v4 host talk timer is collapsed and forward-only, with a host-only gentle reminder',()=>{
  const {api,current}=harness({public:{flowVersion:4,deadlineAt:null,talkClock:{elapsedMs:4000,activeSince:10000,suggestedSeconds:600}},private:{isHost:true,talkReminder:{due:true},actions:{canEndTalk:true,canExtendTalk:true}}});
  const html=api.render();
  assert.match(html,/<details class="v4-chat-clock" data-detail="talk-clock-1">/);
  assert.doesNotMatch(html,/<details class="v4-chat-clock"[^>]*open|class="timer"|urgent/);
  assert.match(html,/data-elapsed-ms="4000"/);
  assert.match(html,/Suggested chat time reached/);
  assert.match(html,/Remind me again in 2 minutes/);
  current.private.isHost=false;
  assert.doesNotMatch(api.render(),/v4-chat-clock|Suggested chat time reached/);
});

test('v4 elapsed clock excludes paused time, survives saved accumulated time, and passes one hour',()=>{
  const {context}=harness();
  const {elapsedMilliseconds,formatElapsed}=context.window.CHAT_WOLF_V3_UI;
  assert.equal(elapsedMilliseconds({elapsedMs:5000,activeSince:10000,paused:false},17000),12000);
  assert.equal(elapsedMilliseconds({elapsedMs:12000,activeSince:null,paused:true},99000),12000);
  assert.equal(elapsedMilliseconds({elapsedMs:12000,activeSince:100000,paused:false},104000),16000);
  assert.equal(formatElapsed(260000),'4:20');
  assert.equal(formatElapsed(3723000),'1:02:03');
});

test('v4 Chinese task explanation is a private local toggle and preserves required English lines',async()=>{
  const {api,calls}=harness({public:{flowVersion:4},private:{tasks:[{id:'w1',text:'Say “My sofa needs a holiday.”',textZh:'說出「My sofa needs a holiday.」。',completed:null}]}},true);
  api.render();
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'toggleTaskLanguage'}})}});
  const html=api.render();
  assert.match(html,/lang="zh-Hant"/);
  assert.match(html,/說出「My sofa needs a holiday.」。/);
  assert.equal(calls.length,0);
  assert.match(html,/data-task-id="w1"/);
});

test('v4 meetings expose the current speaker only for player controls and a distinct confirmed host end-all action',async()=>{
  const meeting={id:'m1',order:['a','b','c','d','e','f'],speakerIndex:1,currentSpeakerId:'b',nextSpeakerId:'c',completedPlayerIds:['a'],turnSeconds:60,nextTurnSeconds:45};
  const {api,current,context,calls}=harness({public:{flowVersion:4,phase:'MEETING_TURNS',meeting},private:{isHost:false,playerId:'b',actions:{canEndMeetingTurn:true,canSkipMeetingTurn:true}}},true);
  let html=api.render();
  assert.match(html,/Turn 2 of 6/);
  assert.match(html,/I am done speaking/);
  assert.match(html,/Next speaker: up to 45 seconds/);
  assert.match(html,/class="timer"/);
  current.private.playerId='c';
  assert.doesNotMatch(api.render(),/data-v3-action="endMeetingTurn"|data-v3-action="skipMeetingTurn"/);
  const host=harness({public:{flowVersion:4,phase:'MEETING_TURNS',meeting},private:{isHost:true,actions:{canSkipMeetingTurn:true,canEndMeeting:true,canSetMeetingTurnSeconds:true}}});
  host.context.window.confirm=()=>false;
  html=host.api.render();
  assert.match(html,/Skip \/ end this speaker/);
  assert.match(html,/End remaining turns and start voting/);
  assert.match(html,/Applies from the next speaker/);
  assert.match(html,/name="seconds" type="number" min="10" max="180"/);
  await host.api.handleClick({target:{closest:()=>({dataset:{v3Action:'endMeeting'}})}});
  assert.equal(host.calls.length,0);
  host.context.window.confirm=()=>true;
  await host.api.handleClick({target:{closest:()=>({dataset:{v3Action:'endMeeting'}})}});
  assert.equal(host.calls[0].action,'endMeeting');
});

test('v4 estimates use all meeting turns without a forty-minute warning and manual follow-ups only',()=>{
  const {api,current}=harness({public:{flowVersion:4,phase:'LOBBY',matchId:null},private:{isHost:true}});
  let html=api.render();
  assert.match(html,/50 min 50 s/);
  assert.doesNotMatch(html,/40 minutes|37 min 20|Round 2 starts/);
  assert.match(html,/Follow-ups change only when the host chooses/);
  assert.match(html,/name="meetingTurnSeconds"/);
  assert.doesNotMatch(html,/name="wrapUpSeconds"|name="meetingSeconds"/);
  current.public.settings.playerCount=8;
  assert.match(api.render(),/56 min 50 s/);
});

test('v4 exhaustion offers no secret details and requires explicit one-deal repeat permission',async()=>{
  const {api,context,calls}=harness({public:{flowVersion:4},private:{isHost:true}});
  api.render();
  api.onActionError('restart',{keepTopic:true},'CONTENT_EXHAUSTED');
  let html=api.render();
  assert.match(html,/Fresh task combinations are running low/);
  assert.doesNotMatch(html,/Secret wolf action|canonicalTaskKey|variantGroup/);
  context.window.confirm=()=>false;
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'allowRecentRepeat'}})}});
  assert.equal(calls.length,0);
  context.window.confirm=()=>true;
  await api.handleClick({target:{closest:()=>({dataset:{v3Action:'allowRecentRepeat'}})}});
  assert.equal(calls[0].action,'restart');
  assert.equal(calls[0].payload.allowRecentRepeat,true);
  assert.equal(calls[0].payload.keepTopic,true);
});
