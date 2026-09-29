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
      code:'TEST01',rulesVersion:3,matchId:'match-1',gameNumber:1,phase:'TALK',round:1,totalRounds:3,
      players,settings:{...RULES.defaults,enabledProfessions:[...RULES.defaults.enabledProfessions]},
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
    else if(room.phase==='MEETING_DISCUSS')send('endMeeting');
    else if(room.phase==='VOTING')send('endVote');
    else throw new Error('Unexpected phase '+room.phase);
    check();
  }
  assert.equal(room.result.outcome,'DRAW');
});
