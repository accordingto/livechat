const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const rootPath = path.resolve(__dirname, '..');

function harness(overrides = {}, embeddedCard = false) {
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
    esc:htmlEsc,getState:()=>current,embeddedCard,playerName:id=>players.find(p=>p.id===id)?.name || 'Unknown',
    action:async(action,payload)=>{calls.push({action,payload});return true;},
    roomBar:()=>'<header>Room</header>',timer:()=>'<div class="timer">10:00</div>',playerRows:()=>'<div>Players</div>',
    showToast:()=>{},rerender:()=>{},privateCardUrl:()=>'/chat-wolf.html?card=1#session=private',
  });
  return {api,current,calls,context};
}

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

test('readable private cards use camp colors, one progress heading, collapsed rules and footer room info',()=>{
  const {api,current}=harness({public:{flowVersion:4,phase:'ROLE_REVEAL'},private:{roleAcknowledged:false}},true);
  let html=api.render();
  assert.match(html,/v5-role-wolf/);
  assert.match(html,/<h2 class="role-title wolf">Wolf<\/h2>/);
  assert.equal(html.split('Wolf tasks 1/3').length-1,1);
  assert.match(html,/Shared by all wolves/);
  assert.match(html,/<details class="v5-task-rules" data-detail="wolf-task-rules">/);
  assert.doesNotMatch(html,/<details class="v5-task-rules"[^>]*open|<header>Room<\/header>/);
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
