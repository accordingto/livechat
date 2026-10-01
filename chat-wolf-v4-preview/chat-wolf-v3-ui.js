(function (root) {
  'use strict';
  function elapsedMilliseconds(clock, now) {
    return Math.max(0,Number(clock.elapsedMs||0)+(!clock.paused && clock.activeSince!=null?Math.max(0,now-Number(clock.activeSince)):0));
  }
  function formatElapsed(ms) {
    const seconds=Math.floor(Math.max(0,Number(ms)||0)/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
    return hours?hours+':'+String(minutes%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):minutes+':'+String(seconds%60).padStart(2,'0');
  }
  function create(ctx) {
    let C = root.CHAT_WOLF_COPY_V3;
    const esc = ctx.esc;
    let settingsDraft = null;
    let draftMatch = null;
    let ballotId = null;
    let ballot = new Set();
    let judgeDraft = new Set();
    let rewardDraft = {};
    let taskLanguage = 'en';
    let pendingDeal = null;
    const state = () => ctx.getState();
    const pub = () => state().public;
    const me = () => state().private;
    const actions = () => me().actions || {};
    const isHost = () => me().isHost && !ctx.embeddedCard;
    const modern = () => pub().flowVersion >= 4 || (pub().phase === 'LOBBY' && pub().settings.talkEndBehavior === 'host_confirm');
    const name = id => ctx.playerName(id);
    const professions = () => root.CHAT_WOLF_V3_RULES.professions;
    const profession = id => professions().find(item => item.id === id || item.roleId === id);
    const topics = () => (root.CHAT_WOLF_V4_CONTENT || root.CHAT_WOLF_V3_CONTENT).topics;
    const names = ids => (ids || []).map(name).map(esc).join(', ') || esc(C.nobody);
    const button = (action, label, extra, style) => '<button type="button" class="btn '+(style || '')+'" data-v3-action="'+esc(action)+'" '+(extra || '')+'>'+esc(label)+'</button>';
    const field = (key, value, min, max) => {
      const limits = root.CHAT_WOLF_V3_RULES.limits[key] || [min,max];
      return '<label class="field"><span>'+esc(C[key] || key)+'</span><input name="'+esc(key)+'" type="number" min="'+limits[0]+'" max="'+limits[1]+'" step="1" required value="'+esc(value)+'"></label>';
    };
    const duration = seconds => {
      const n = Math.max(0, Math.round(Number(seconds) || 0));
      return Math.floor(n / 60)+' min'+(n % 60 ? ' '+n % 60+' s' : '');
    };
    const estimate = settings => modern()?root.CHAT_WOLF_V3_RULES.estimateSeconds(settings):
      settings.roundCount*(settings.talkSeconds+settings.wrapUpSeconds+settings.meetingSeconds+settings.voteSeconds)+settings.clueSeconds+(settings.enabledProfessions.includes('judge')?settings.judgeSeconds:0);

    function readSettings(form, base) {
      const settings = Object.assign({}, base || root.CHAT_WOLF_V3_RULES.defaults, { mode:'free-chat-v3' });
      for (const key of ['playerCount','wolfCount','roundCount','talkSeconds','wrapUpSeconds','meetingSeconds','meetingTurnSeconds','voteSeconds','clueSeconds','judgeSeconds','taskCount','interactionTaskCount','rerollLimit','infoRoleLimit']) {
        if (form.elements[key]) settings[key] = Number(form.elements[key].value);
      }
      if (form.elements.jesterEnabled) settings.jesterEnabled = form.elements.jesterEnabled.checked;
      if (form.elements.jesterTieWins) settings.jesterTieWins = form.elements.jesterTieWins.checked;
      if (form.elements.topicId) settings.topicId = form.elements.topicId.value;
      if (form.dataset.v3Settings) {
        settings.enabledProfessions = Array.from(form.querySelectorAll('[name="profession"]:checked')).map(input => input.value);
        settings.professionWeights = {};
        form.querySelectorAll('[data-profession-weight]').forEach(input => { settings.professionWeights[input.dataset.professionWeight] = Number(input.value); });
      }
      return settings;
    }
    function entryFields() {
      return (root.CHAT_WOLF_V4_CONTENT?.releaseStage==='development'?'<p class="notice warning">'+esc(root.CHAT_WOLF_COPY_V4.developmentPreview)+'</p>':'')+'<label class="check-line"><input name="jesterEnabled" type="checkbox" checked><span>'+esc(C.jester)+'</span></label><p class="muted">3 rounds · about 10 minutes of free chat per round. The host decides when to start each meeting. Settings can be changed in the lobby.</p>';
    }
    function rules() {
      return '<details class="panel v3-rules" data-detail="v3-rules"><summary><strong>'+esc(C.rules)+'</strong></summary><p>'+esc(C.rulesIntro)+'</p><ul>'+C.rulesBullets.map(text => '<li>'+esc(text)+'</li>').join('')+'</ul><p><strong>'+esc(C.rulesWins)+'</strong></p><ul>'+C.rulesExamples.map(text => '<li>'+esc(text)+'</li>').join('')+'</ul></details>';
    }
    function hostCardLink() {
      if (!isHost()) return '';
      return '<section class="panel v3-host-card"><div><h3>'+esc(C.hostView)+'</h3><p class="muted">'+esc(C.hostViewHelp)+'</p></div><div class="button-row">'+button('openCard',C.openCard,'','secondary small')+button('copyCard',C.copyCard,'','ghost small')+'</div><small class="muted">'+esc(C.privateWarning)+'</small></section>';
    }
    function hostControls() {
      if (!isHost()) return '';
      const a = actions();
      let html = '<div class="button-row v3-controls">';
      if (a.canBeginTalk) html += button('beginTalk',C.start);
      if (a.canPause) html += button('pause',C.pause,'','secondary');
      if (a.canResume) html += button('resume',C.resume,'','warning');
      if (a.canExtendTalk) html += button('extendTalk',C.extend,'data-seconds="120"','secondary');
      if (a.canEndTalk) html += button('endTalk',C.endTalk,'','warning');
      if (a.canEndClues) html += button('endClues',C.endClues,'','secondary');
      if (a.canEndMeeting && pub().phase !== 'MEETING_TURNS') html += button('endMeeting',C.endMeeting);
      if (a.canEndVote) html += button('endVote',C.endVote,'','secondary');
      html += '</div>';
      return html;
    }
    function restartControls() {
      if (!isHost() || pub().phase === 'LOBBY') return '';
      return '<details class="panel v3-restart" data-detail="v3-restart"><summary>'+esc(C.restartMenu)+'</summary><div class="button-row">'+button('restart',C.restartSame,'data-keep-topic="true"','secondary')+button('restart',C.restartNew,'data-keep-topic="false"','secondary')+(pub().phase === 'FINISHED' ? button('replay',C.backLobby,'','secondary') : button('cancelGame',C.cancel,'','danger'))+'</div></details>';
    }
    function settingSummary(settings) {
      const seconds = estimate(settings);
      return '<div id="v3-estimate" class="notice"><strong>'+esc(C.estimated)+': '+esc(duration(seconds))+'</strong><br>'+esc(C.estimateNote)+'</div>';
    }
    function settingsForm() {
      const s = settingsDraft || pub().settings;
      const numeric = (key,min,max) => field(key,s[key],min,max);
      return '<form class="panel v3-settings" id="v3-settings-form" data-v3-settings="true"><h2>'+esc(C.settings)+'</h2><div class="inline-fields">'+numeric('playerCount',3,12)+numeric('wolfCount',1,9)+'</div><label class="check-line"><input type="checkbox" name="jesterEnabled" '+(s.jesterEnabled?'checked':'')+'><span>'+esc(C.jester)+'</span></label><div class="inline-fields">'+numeric('roundCount',1,8)+numeric('talkSeconds',30,3600)+numeric('taskCount',1,12)+numeric('interactionTaskCount',0,12)+'</div><p id="v3-self-tasks" class="muted">'+esc(C.selfTasks(Math.max(0,s.taskCount-s.interactionTaskCount)))+'</p><label class="field"><span>'+esc(C.topic)+'</span><select name="topicId"><option value="random">'+esc(C.randomTopic)+'</option>'+topics().map(topic => '<option value="'+esc(topic.id)+'"'+(topic.id===s.topicId?' selected':'')+'>'+esc(topic.mainQuestion)+'</option>').join('')+'</select><small>'+esc(C.topicDefault)+'</small></label><fieldset class="v3-professions"><legend>'+esc(C.pool)+'</legend><p class="muted">'+esc(C.unique)+'</p>'+professions().map(role => '<label class="v3-profession"><input type="checkbox" name="profession" value="'+esc(role.id || role.roleId)+'" '+(s.enabledProfessions.includes(role.id || role.roleId)?'checked':'')+'><span><strong>'+esc(role.name)+'</strong><span>'+esc(role.style)+'</span><small>'+esc(role.reward)+'</small></span></label>').join('')+'<p id="v3-no-pool" class="notice"'+(s.enabledProfessions.length?' hidden':'')+'>'+esc(C.noPool)+'</p></fieldset><details data-detail="v3-advanced"><summary>'+esc(C.advanced)+'</summary><div class="inline-fields">'+ (modern()?numeric('meetingTurnSeconds',10,300):numeric('wrapUpSeconds',0,300)+numeric('meetingSeconds',0,600))+numeric('voteSeconds',10,300)+numeric('clueSeconds',0,120)+numeric('judgeSeconds',5,120)+numeric('rerollLimit',0,3)+numeric('infoRoleLimit',0,2)+'</div><p class="muted">'+esc(C.infoWarning)+'</p><label class="check-line"><input type="checkbox" name="jesterTieWins" '+(s.jesterTieWins?'checked':'')+'><span>'+esc(C.jesterTieWins)+'</span></label><p class="muted">'+esc(C.jesterDefault)+'</p><div class="inline-fields">'+professions().map(role=>'<label class="field"><span>'+esc(role.name)+' · '+esc(C.weight)+'</span><input data-profession-weight="'+esc(role.id || role.roleId)+'" type="number" min="1" max="10" value="'+esc(s.professionWeights?.[role.id || role.roleId] || 1)+'"></label>').join('')+'</div></details>'+settingSummary(s)+'<button class="btn" type="submit">'+esc(C.save)+'</button></form>';
    }
    function topicLibrary() {
      const selected = (settingsDraft || pub().settings).topicId;
      return '<details class="panel v3-topic-library" data-detail="v3-topic-library"><summary><strong>'+esc(C.browseTopics)+' ('+topics().length+')</strong></summary><label class="field"><span>'+esc(C.topicSearch)+'</span><input type="text" id="v3-topic-search"></label><div class="v3-topic-list">'+topics().map(topic => '<article class="v3-topic-option" data-topic-search="'+esc((topic.category+' '+topic.mainQuestion).toLowerCase())+'"><span class="eyebrow">'+esc(topic.category)+'</span><h3>'+esc(topic.mainQuestion)+'</h3><ul>'+topic.entryPrompts.map(text=>'<li>'+esc(text)+'</li>').join('')+'<details data-detail="preview-'+esc(topic.id)+'"><summary>'+esc(C.followUps)+' ('+topic.followUps.length+')</summary><ol>'+topic.followUps.map(item=>'<li>'+esc(item.text)+'</li>').join('')+'</ol></details>'+(isHost()?button('chooseTopic',topic.id===selected?C.selectedTopic:C.chooseTopic,'data-topic-id="'+esc(topic.id)+'"','secondary small'):'')+'</article>').join('')+'</div></details>';
    }
    function lobby() {
      const p = pub();
      const current = p.players.find(player=>player.id===me().playerId);
      return '<div class="game-grid"><div class="main-stack"><section class="panel"><div class="panel-header"><div><h2>'+esc(C.lobby)+'</h2><p>'+esc(C.lobbyHelp)+'</p></div><span class="phase-chip">'+p.players.length+' / '+p.settings.playerCount+'</span></div>'+ctx.playerRows(isHost())+'<div class="button-row">'+button('ready',current?.ready?C.notReady:C.ready,'data-ready="'+(current?.ready?'false':'true')+'"')+(isHost()?button('startGame',C.deal,p.players.length===p.settings.playerCount?'':'disabled','warning'):'')+'</div></section>'+hostCardLink()+topicLibrary()+'</div><aside class="side-stack">'+(isHost()?settingsForm():settingSummary(p.settings))+'</aside></div>';
    }
    function chatClock() {
      const p=pub(), clock=p.talkClock;
      if (!modern() || p.phase!=='TALK' || !isHost() || !clock) return '';
      return '<details class="v4-chat-clock" data-detail="talk-clock-'+p.round+'"><summary>'+esc(C.showTimer)+'</summary><div><span>'+esc(C.elapsed)+'</span> <strong data-elapsed-ms="'+Number(clock.elapsedMs||0)+'" data-active-since="'+Number(clock.activeSince||0)+'" data-clock-paused="'+(p.paused?'true':'false')+'">0:00</strong><span class="muted">'+esc(C.suggested)+': '+esc(duration(clock.suggestedSeconds))+'</span></div><p class="muted" data-talk-overtime="'+Number(clock.suggestedSeconds||0)+'"></p>'+(p.paused?'<small>'+esc(C.pausedClock)+'</small>':'')+'</details>';
    }
    function topicCard(privateView) {
      const p=pub(), topic=p.topic;
      if(!topic)return '';
      const active=p.activeFollowUp;
      if (!modern()) return '<section class="question-card v3-topic"><div class="panel-header"><div class="scenario">'+esc(p.phase==='ROLE_REVEAL'?C.topic:C.round(p.round,p.totalRounds || p.settings.roundCount))+'</div>'+((p.deadlineAt || p.paused)&&!['ROLE_REVEAL','LOBBY','FINISHED'].includes(p.phase)?ctx.timer(p.deadlineAt):'')+'</div><h2 class="question">'+esc(active?active.text:topic.mainQuestion)+'</h2>'+(active?'<p class="muted v3-main-anchor"><strong>'+esc(C.mainTopic)+':</strong> '+esc(topic.mainQuestion)+'</p>':'<ul class="v3-entry-prompts">'+topic.entryPrompts.map(text=>'<li>'+esc(text)+'</li>').join(''))+'<p class="muted">'+esc(C.chatHelp)+'</p>'+(p.phase==='WRAP_UP'?'<div class="notice warning">'+esc(C.wrapUp)+'</div>':'')+'</section>';
      const label=topic.shortTitle || topic.title || topic.category;
      const time=!['ROLE_REVEAL','LOBBY','FINISHED','TALK','MEETING_TURNS'].includes(p.phase)?ctx.timer(p.deadlineAt):'';
      return '<section class="question-card v3-topic v4-topic-full"><div class="panel-header"><div><span class="scenario">'+esc(p.phase==='ROLE_REVEAL'?C.topic:C.round(p.round,p.totalRounds || p.settings.roundCount))+'</span><span class="v4-topic-label">'+esc(label)+'</span></div>'+time+'</div><div class="eyebrow">'+esc(active?C.currentQuestion:C.mainTopic)+'</div><h2 class="question'+(active?' v4-active-followup':'')+'" data-current-question>'+esc(active?active.text:topic.mainQuestion)+'</h2>'+(active?'<details class="v4-original-topic" data-detail="original-topic"><summary>'+esc(C.viewOriginal)+'</summary><p>'+esc(topic.mainQuestion)+'</p></details>':'')+(!privateView?'<p class="muted">'+esc(C.chatHelp)+'</p>':'')+chatClock()+'</section>';
    }
    function stickyQuestion() {
      const p=pub();
      if(!p.topic)return '';
      const text=p.activeFollowUp?.text || p.topic.mainQuestion;
      return '<details class="v4-question-peek" data-detail="sticky-question"><summary><span>'+esc(C.currentQuestion)+'</span><span class="v4-peek-question">'+esc(text)+'</span></summary><p>'+esc(text)+'</p></details>';
    }
    function followUpControls() {
      if (!isHost() || pub().paused || !['TALK','WRAP_UP'].includes(pub().phase)) return '';
      const used = new Set(pub().usedFollowUpIds || []);
      return '<section class="panel"><div class="button-row">'+(actions().canFollowUp?button('followUp',C.followUp,'','secondary'):'<p class="muted">'+esc(C.noFollowUps)+'</p>')+(pub().activeFollowUp?button('clearFollowUp',C.backToMain,'','ghost'):'')+'</div><details data-detail="v3-followups"><summary>'+esc(C.chooseFollowUp)+'</summary><div class="v3-followup-list">'+pub().topic.followUps.map(item=>'<article><p>'+esc(item.text)+'</p>'+(used.has(item.id)?'<span class="mini-chip">'+esc(C.used)+'</span>':button('followUp',C.useFollowUp,'data-follow-up-id="'+esc(item.id)+'"','secondary small'))+'</article>').join('')+'</div></details></section>';
    }
    function taskCard(task, wolf) {
      const translated=modern() && taskLanguage==='zh' && task.textZh;
      const example=translated?(task.exampleZh || task.example):task.example;
      return '<article class="task-card v3-task" data-player-task="'+esc(task.id)+'"><p class="task-condition" lang="'+(translated?'zh-Hant':'en')+'">'+esc(translated?task.textZh:task.text)+'</p>'+(example?'<details class="v4-task-example" data-detail="example-'+esc(task.id)+'"><summary>Example</summary><p>'+esc(example)+'</p></details>':'')+(task.completed?'<span class="mini-chip ready">'+esc(C.completed)+'</span>':actions().canCompleteTask?button('completeTask',C.complete,'data-task-id="'+esc(task.id)+'"'):'<span class="mini-chip">'+esc(C.notCompleted)+'</span>')+'</article>';
    }
    function rewardCard() {
      const reward = me().reward, role = profession(me().profession);
      if (!reward || !role) return '';
      let html = '<section class="v3-reward"><h3>'+esc(C.reward)+'</h3><p>'+esc(role.reward)+'</p>';
      if (me().profession==='bait') html += '<p class="muted">'+esc(C.baitDeadline)+'</p>';
      if (reward.result) {
        const result = reward.result;
        if (typeof result.text === 'string') html += '<div class="notice">'+esc(result.text)+'</div><p class="muted">'+esc(C.clueDisclaimer)+'</p>';
        else if (me().profession === 'reporter') html += '<div class="notice"><strong>'+esc(name(result.targetId))+'</strong><br>'+esc(result.abstained?C.noBallot:C.ballot)+(!result.abstained?': '+names(result.selections):'')+'</div>';
        else html += '<div class="notice"><strong>'+esc(me().profession==='bait'?C.voters:C.zeroVotes)+'</strong><br>'+names(result.playerIds)+'</div>';
        html += '<p class="muted">'+esc(C.rewardUsed)+'</p>';
      } else if (!reward.unlocked) html += '<p class="muted">'+esc(C.rewardLocked)+'</p>';
      else if (actions().canUseReward && reward.available) {
        const meetings = reward.eligibleMeetings || [];
        html += '<form id="v3-reward-form">'+(me().profession==='reporter'?'<label class="field"><span>'+esc(C.rewardSelectPlayer)+'</span><select name="targetId" required><option value="">Choose a player</option>'+pub().players.filter(player=>player.id!==me().playerId).map(player=>'<option value="'+esc(player.id)+'"'+(rewardDraft.targetId===player.id?' selected':'')+'>'+esc(player.name)+'</option>').join('')+'</select></label>':'')+'<label class="field"><span>'+esc(C.rewardSelectMeeting)+'</span><select name="meetingId" required>'+meetings.map(item=>'<option value="'+esc(item.id)+'"'+(rewardDraft.meetingId===item.id?' selected':'')+'>'+esc(C.round(item.round,pub().totalRounds || pub().settings.roundCount))+'</option>').join('')+'</select></label><button class="btn secondary" type="submit">'+esc(C.useReward)+'</button></form>';
      } else html += '<p class="muted">'+esc(reward.windowClosed?C.rewardUnavailable:C.rewardWaiting)+'</p>';
      return html+'</section>';
    }
    function privateCard() {
      if (isHost() || !me().role) return '';
      if (modern()) return modernPrivateCard();
      const role = me().role, villager = profession(me().profession);
      let html = '<section class="panel v3-private"><div class="eyebrow">'+esc(C.privateCard)+'</div><h2 class="role-title '+(role==='WOLF'?'wolf':'villager')+'">'+esc(role==='VILLAGER'?(villager?.name || C.ordinary):C.roles[role])+'</h2>';
      if (role==='WOLF') {
        html += '<p>'+esc(C.wolfHelp)+'</p><div class="team-list">'+(me().wolfTeam || []).map(player=>'<span class="team-chip">'+esc(player.name)+'</span>').join('')+'</div><h3>'+esc(C.teamTasks((me().tasks || []).filter(task=>task.completed).length,(me().tasks || []).length))+'</h3><p class="muted">'+esc(C.wolfTaskRule)+'</p><div class="v3-task-list">'+(me().tasks || []).map(task=>taskCard(task,true)).join('')+'</div><p class="muted">'+esc(C.taskWindow)+'</p>';
      } else if (role==='JESTER') html += '<p>'+esc(C.jesterHelp)+'</p><p class="notice">'+esc(pub().settings.jesterTieWins?C.jesterTie:C.jesterUnique)+'</p>';
      else if (me().villageTask) html += '<p class="muted">'+esc(C.villagerHelp)+'</p>'+taskCard(me().villageTask,false)+(actions().canRerollTask?'<div class="button-row">'+button('rerollTask',C.reroll,'','ghost small')+'<span class="muted">'+esc(C.rerollLeft(me().rerollRemaining))+'</span></div>':'')+rewardCard();
      else html += '<p>'+esc(C.ordinaryHelp)+'</p>';
      if (pub().phase==='ROLE_REVEAL') html += '<div class="button-row">'+(me().roleAcknowledged?'<span class="mini-chip ready">'+esc(C.ready)+'</span>':button('ackRole',C.ready))+'</div>';
      if (['FINAL_CLUES','MEETING_DISCUSS','VOTING','JUDGE_DECISION'].includes(pub().phase) && (pub().round===pub().settings.roundCount)) html += '<p class="muted">'+esc(C.taskLocked)+'</p>';
      return html+'</section>';
    }
    function modernPrivateCard() {
      const p=pub(), person=me(), role=person.role, villageRole=profession(person.profession);
      const hasTasks=role==='WOLF' || !!person.villageTask;
      const team=role==='WOLF'?C.wolfCamp:role==='JESTER'?C.independentCamp:C.villageCamp;
      const roleName=role==='VILLAGER'?(villageRole?.name || C.ordinary):C.roles[role];
      const progress=role==='WOLF'?C.teamTasks((person.tasks||[]).filter(task=>task.completed).length,(person.tasks||[]).length):'';
      let html='<div class="v4-private-layout"><header class="panel v4-role-header"><div><div class="eyebrow">'+esc(team)+'</div><h2>'+esc(roleName)+'</h2>'+(progress?'<p>'+esc(progress)+'</p>':'')+'</div>'+(p.phase==='ROLE_REVEAL'?(person.roleAcknowledged?'<span class="mini-chip ready">'+esc(C.ready)+'</span>':button('ackRole',C.ready)):'')+'</header>';
      if(['MEETING_TURNS','FINAL_CLUES','VOTING','JUDGE_DECISION'].includes(p.phase))html+=phasePanel();
      html+=topicCard(true)+stickyQuestion();
      if(hasTasks)html+='<section class="panel v4-private-tasks"><div class="v4-task-toolbar"><h3>'+esc(role==='WOLF'?progress:roleName+' · task')+'</h3>'+button('toggleTaskLanguage',taskLanguage==='en'?C.chineseHelp:C.englishHelp,'aria-pressed="'+(taskLanguage==='zh')+'"','ghost small')+'</div>';
      if(role==='WOLF') {
        html+='<p class="v4-task-rule">'+esc(C.wolfHelp)+'</p><p class="v4-task-rule muted">'+esc(C.wolfTaskRule)+'</p><div class="team-list">'+(person.wolfTeam||[]).map(player=>'<span class="team-chip">'+esc(player.name)+'</span>').join('')+'</div><div class="v3-task-list">'+(person.tasks||[]).map(task=>taskCard(task,true)).join('')+'</div>';
      } else if(person.villageTask) {
        html+=taskCard(person.villageTask,false)+(actions().canRerollTask?'<div class="button-row">'+button('rerollTask',C.reroll,'','ghost small')+'<span class="muted">'+esc(C.rerollLeft(person.rerollRemaining))+'</span></div>':'');
      }
      if(hasTasks)html+=(taskLanguage==='zh'?'<small class="muted">'+esc(C.taskLanguageNote)+'</small>':'')+'</section>';
      if(role==='JESTER') html+='<section class="panel"><p>'+esc(C.jesterHelp)+'</p><p class="notice">'+esc(p.settings.jesterTieWins?C.jesterTie:C.jesterUnique)+'</p></section>';
      else if(!hasTasks)html+='<p class="notice">'+esc(C.ordinaryHelp)+'</p>';
      if(person.villageTask)html+='<section class="panel v4-reward-panel">'+rewardCard()+'</section>';
      if(['FINAL_CLUES','MEETING_TURNS','VOTING','JUDGE_DECISION'].includes(p.phase) && p.round===p.settings.roundCount)html+='<p class="muted">'+esc(C.taskLocked)+'</p>';
      return html+'</div>';
    }
    function statusList(kind) {
      const submitted = new Set(pub().voting?.submittedPlayerIds || []);
      return '<div class="submission-grid">'+pub().players.map(player=>'<span class="mini-chip'+((kind==='ready'?player.roleAcknowledged:submitted.has(player.id))?' ready':'')+'">'+esc(player.name)+' · '+esc((kind==='ready'?player.roleAcknowledged:submitted.has(player.id))?C.submitted:C.waiting)+'</span>').join('')+'</div>';
    }
    function lastGuess() {
      const last = (pub().voteHistory || []).at(-1);
      if (!last || last.type==='FINAL') return '';
      return '<div class="notice warning"><strong>'+esc(C.previousGuess)+':</strong> '+(last.nominees.length?names(last.nominees):esc(C.noGuess))+'<br>'+esc(C.notExact)+'</div>';
    }
    function ballotForm(judge) {
      const decision = me().judgeDecision;
      const count = judge ? decision.seats : pub().voting.requiredSelections;
      const locked = judge ? decision.submitted : me().myVoteSubmitted;
      if (locked) return '<p class="notice">'+esc(judge?C.judgeLocked:C.voteLocked)+'</p>';
      if (pub().paused) return '<p class="notice">'+esc(C.pausedVoting)+'</p>';
      const selection = judge?judgeDraft:ballot;
      const players = pub().players.filter(player=>judge?decision.candidates.includes(player.id):player.id!==me().playerId);
      return '<form id="'+(judge?'v3-judge-form':'v3-vote-form')+'"><p>'+esc(judge?C.judgeHelp(count):C.voteHelp(count))+'</p><div class="vote-grid">'+players.map(player=>'<div class="vote-choice"><input id="v3-'+esc(player.id)+'" type="checkbox" name="vote" value="'+esc(player.id)+'"'+(selection.has(player.id)?' checked':'')+'><label for="v3-'+esc(player.id)+'">'+esc(player.name)+'</label></div>').join('')+'</div><div class="button-row"><span id="v3-vote-count" class="muted">'+esc(C.selected(selection.size,count))+'</span><button id="v3-vote-submit" class="btn" type="submit"'+((judge?selection.size!==count:selection.size===0)?' disabled':'')+'>'+esc(judge?C.judgeSubmit:C.submitVote)+'</button>'+(!judge?button('abstain',C.abstain,'','ghost'):'')+'</div></form>';
    }
    function phasePanel() {
      const phase = pub().phase;
      if (phase==='MEETING_TURNS') return meetingTurns();
      if (phase==='ROLE_REVEAL') return '<section class="panel"><h2>'+esc(C.readyCards)+'</h2><p>'+esc(C.readCard)+'</p>'+statusList('ready')+hostControls()+'</section>';
      if (modern() && phase==='TALK') return '<section class="panel v4-talk-controls">'+(me().talkReminder?.due?'<p class="notice v4-gentle-reminder">'+esc(C.reminder)+'</p>':'')+hostControls()+'</section>';
      if (['TALK','WRAP_UP'].includes(phase)) return '<section class="panel"><div class="panel-header"><h2>'+esc(C.everyone)+'</h2></div>'+hostControls()+(pub().extensionSeconds?'<p class="muted">'+esc(C.extension(pub().extensionSeconds/60))+' '+esc(C.estimated)+': '+esc(duration(pub().estimatedSeconds))+'</p>':'')+'</section>';
      if (phase==='FINAL_CLUES') return '<section class="panel"><h2>'+esc(C.finalClues)+'</h2><p>'+esc(C.finalCluesHelp)+'</p>'+hostControls()+'</section>';
      if (phase==='MEETING_DISCUSS') return '<section class="panel"><h2>'+esc(C.meeting)+'</h2><p>'+esc(C.meetingHelp)+'</p>'+hostControls()+'</section>';
      if (phase==='VOTING') return '<section class="panel"><h2>'+esc(pub().voting.type==='FINAL'?C.finalVote:C.midVote)+'</h2><p class="muted">'+esc(C.voteRule)+'</p>'+(isHost()?'<p class="notice">'+esc(C.hostVote)+'</p>':ballotForm(false))+'</section><section class="panel">'+statusList('vote')+hostControls()+'</section>';
      if (phase==='JUDGE_DECISION') return '<section class="panel"><h2>'+esc(!isHost()&&me().judgeDecision?C.judgeTitle:C.judgeWaiting)+'</h2>'+(!isHost()&&me().judgeDecision?ballotForm(true):'<p>'+esc(C.judgeWaitingHelp)+'</p>')+hostControls()+'</section>';
      return '';
    }
    function meetingTurns() {
      const p=pub(), m=p.meeting, a=actions();
      if(!m)return '';
      const mine=m.currentSpeakerId===me().playerId;
      const completed=new Set(m.completedPlayerIds||[]);
      let controls='';
      if(!p.paused && mine)controls+=button('endMeetingTurn',C.endMeetingTurn,'')+button('skipMeetingTurn',C.skipMeetingTurn,'','ghost');
      else if(!p.paused && isHost() && a.canSkipMeetingTurn)controls+=button('skipMeetingTurn',C.hostSkipTurn,'','secondary');
      let html='<section class="panel v4-meeting"><div class="panel-header"><div><div class="eyebrow">'+esc(C.meetingProgress(m.speakerIndex+1,m.order.length))+'</div><h2>'+esc(C.meeting)+'</h2></div></div><div class="v4-speaker-focus'+(mine?' mine':'')+'"><div><span>'+esc(mine&&!isHost()?C.meetingYourTurn:C.currentSpeaker)+'</span><strong>'+esc(name(m.currentSpeakerId))+'</strong><small>'+esc(m.nextSpeakerId?C.nextSpeaker+': '+name(m.nextSpeakerId):C.lastSpeaker)+'</small></div>'+ctx.timer(p.deadlineAt)+'</div><p class="muted">'+esc(C.meetingHelp)+'</p><div class="button-row">'+controls+'</div><div class="v4-meeting-order">'+m.order.map(id=>'<span class="mini-chip'+(completed.has(id)?' ready':id===m.currentSpeakerId?' active':'')+'">'+esc(name(id))+' · '+esc(completed.has(id)?C.meetingDone:id===m.currentSpeakerId?C.currentSpeaker:C.meetingWaiting)+'</span>').join('')+'</div>';
      if(isHost()){
        html+=hostControls();
        if(a.canSetMeetingTurnSeconds){
          const limits=root.CHAT_WOLF_V3_RULES.limits.meetingTurnSeconds||[10,180];
          html+='<details data-detail="meeting-turn-settings"><summary>'+esc(C.meetingTimeSetting)+'</summary><form id="v4-meeting-time-form"><label class="field"><span>'+esc(C.meetingTurnSeconds)+'</span><input name="seconds" type="number" min="'+limits[0]+'" max="'+limits[1]+'" step="1" required value="'+Number(m.nextTurnSeconds||p.settings.meetingTurnSeconds||60)+'"></label><p class="muted">'+esc(C.meetingTimeNote)+'</p><button class="btn secondary" type="submit">'+esc(C.saveMeetingTime)+'</button></form></details>';
        }
        if(a.canEndMeeting)html+='<div class="v4-end-meeting">'+button('endMeeting',C.endMeeting,'','ghost small')+'</div>';
      }
      return html+'<small class="muted">'+esc(C.nextTurnLimit(m.nextTurnSeconds||p.settings.meetingTurnSeconds||60))+'</small></section>';
    }
    function contentExhausted() {
      if(!pendingDeal || !isHost())return '';
      return '<section class="notice v4-exhausted"><h3>'+esc(C.contentExhausted)+'</h3><p>'+esc(C.contentExhaustedHelp)+'</p><div class="button-row">'+(pub().phase==='LOBBY'?button('exhaustedSettings',C.chooseDifferent,'','secondary'):button('exhaustedNewTopic',C.differentRestart,'','secondary'))+button('allowRecentRepeat',C.allowRepeat,'','ghost')+'</div></section>';
    }
    function onActionError(action,payload,code) {
      if(code!=='CONTENT_EXHAUSTED')return;
      if(isHost()) {
        pendingDeal={action,payload:{...(payload||{})}};
        delete pendingDeal.payload.allowRecentRepeat;
        ctx.rerender();
      }
    }
    function resultReason() {
      const result = pub().result;
      if (result.outcome==='VILLAGERS') return 'The room identified the full wolf team.';
      if (result.outcome==='JESTER') return 'The Jester met the final highest-vote condition.';
      if (result.outcome==='WOLVES') return 'Every wolf task was reported complete. Neither earlier win condition applied.';
      if (result.outcome==='CANCELLED') return 'The host cancelled this game. No winner.';
      return 'No full wolf identification or Jester win, and the wolf tasks were not all complete.';
    }
    function finished() {
      const r = pub().reveal || {}, records = pub().voteHistory || [];
      const village = Array.isArray(r.villageTasks)?r.villageTasks:Object.entries(r.villageTasks || {}).map(([playerId,task])=>Object.assign({playerId},task));
      return '<section class="result-hero"><div class="eyebrow">'+esc(C.results)+'</div><h1>'+esc(C.outcomes[pub().result.outcome])+'</h1><p>'+esc(resultReason())+'</p></section><section class="panel"><h2>'+esc(C.reveal)+'</h2><div class="role-grid">'+pub().players.map(player=>'<div class="reveal-player'+(r.roles?.[player.id]==='WOLF'?' wolf':'')+'"><strong>'+esc(player.name)+'</strong><span>'+esc(r.roles?.[player.id]==='VILLAGER'?(profession(r.professions?.[player.id])?.name || C.ordinary):C.roles[r.roles?.[player.id]] || C.ordinary)+'</span></div>').join('')+'</div></section><div class="game-grid"><section class="panel"><h2>'+esc(C.wolfResults)+'</h2><p class="muted">'+esc(C.reportedNote)+'</p>'+(r.tasks || []).map(task=>'<article class="task-card"><p>'+esc(task.text)+'</p><span class="mini-chip'+(task.completed?' ready':'')+'">'+esc(task.completed?C.completed:C.notCompleted)+'</span></article>').join('')+'</section><section class="panel"><h2>'+esc(C.villageResults)+'</h2>'+village.map(task=>'<article class="task-card"><h3>'+esc(name(task.playerId || task.ownerId))+'</h3><p>'+esc(task.text)+'</p><span class="mini-chip">'+esc(task.completed?C.unlocked:C.notUnlocked)+'</span></article>').join('')+'</section></div><section class="panel"><h2>'+esc(C.history)+'</h2><div class="history-list">'+records.map(record=>'<article class="history-item"><strong>'+esc(C.round(record.round,pub().totalRounds || pub().settings.roundCount))+' · '+esc(record.type==='FINAL'?C.finalVote:C.midVote)+'</strong><p>'+(record.nominees.length?names(record.nominees):esc(C.noGuess))+'</p></article>').join('')+'</div></section>'+jesterResult(r)+judgeResult(r);
    }
    function jesterResult(reveal) {
      if (!pub().settings.jesterEnabled) return '';
      const j = reveal.jester;
      return '<section class="panel"><h3>'+esc(C.jesterResult)+'</h3><p>'+esc(pub().settings.jesterTieWins?C.tieRuleShared:C.tieRuleUnique)+'</p>'+(j?'<p>'+esc(j.met || j.qualified || j.won?C.jesterMet:C.jesterMissed)+(Number.isFinite(j.votes)?' · '+j.votes+' votes':'')+'</p>':'')+'</section>';
    }
    function judgeResult(reveal) {
      const j = reveal.judgeResult;
      if (!j) return '';
      return '<section class="panel"><h3>'+esc(C.judgeResult)+'</h3><p>'+names(j.candidates || [])+'</p><p>Selected: '+names(j.chosen || [])+'</p></section>';
    }
    function render() {
      C=modern()?(root.CHAT_WOLF_COPY_V4 || root.CHAT_WOLF_COPY_V3):root.CHAT_WOLF_COPY_V3;
      if (draftMatch !== pub().matchId) {
        draftMatch = pub().matchId; ballot.clear(); judgeDraft.clear(); rewardDraft={}; settingsDraft=null; pendingDeal=null;taskLanguage='en';
      }
      if (ballotId !== pub().voting?.id) { ballotId=pub().voting?.id; ballot.clear(); judgeDraft.clear(); }
      let html = ctx.roomBar()+contentExhausted();
      if(pub().releaseStage==='development')html+='<p class="notice warning v4-development">'+esc(C.developmentPreview)+'</p>';
      if (pub().phase==='LOBBY') html += lobby();
      else if (pub().phase==='FINISHED') html += finished()+restartControls();
      else if(modern() && !isHost())html+=privateCard()+lastGuess();
      else if(modern()) {
        html+='<div class="main-stack">'+(pub().phase==='MEETING_TURNS'?phasePanel()+topicCard():topicCard()+phasePanel())+(['TALK','WRAP_UP'].includes(pub().phase)?lastGuess():'')+followUpControls()+hostCardLink()+'</div>'+restartControls();
      } else {
        html += '<div class="v3-play-grid"><div class="main-stack">'+topicCard()+(['TALK','WRAP_UP'].includes(pub().phase)?lastGuess():'')+phasePanel()+followUpControls()+hostCardLink()+'</div>'+(!isHost()?'<aside class="side-stack">'+privateCard()+'</aside>':'')+'</div>'+restartControls();
      }
      return '<div class="v3-shell">'+html+rules()+'</div>';
    }
    async function handleClick(event) {
      const b = event.target.closest('[data-v3-action]');
      if (!b) return false;
      if (b.disabled) return true;
      const action = b.dataset.v3Action;
      if(action==='toggleTaskLanguage'){taskLanguage=taskLanguage==='en'?'zh':'en';ctx.rerender();return true;}
      if(action==='exhaustedSettings'){document.getElementById('v3-settings-form')?.scrollIntoView({block:'start'});return true;}
      if(action==='exhaustedNewTopic'){if(root.confirm(C.restartConfirm))await ctx.action('restart',{keepTopic:false});return true;}
      if(action==='allowRecentRepeat'){
        if(pendingDeal && root.confirm(C.repeatConfirm)){const saved=pendingDeal;await ctx.action(saved.action,{...saved.payload,allowRecentRepeat:true});}
        return true;
      }
      if (action==='openCard') { root.open(ctx.privateCardUrl(),'_blank','noopener,noreferrer'); return true; }
      if (action==='copyCard') { try { await navigator.clipboard.writeText(ctx.privateCardUrl()); ctx.showToast('Copied'); } catch (_) { root.prompt(C.copyCard,ctx.privateCardUrl()); } return true; }
      if (action==='chooseTopic') {
        const form = document.getElementById('v3-settings-form');
        settingsDraft = readSettings(form,settingsDraft || pub().settings);
        settingsDraft.topicId = b.dataset.topicId;
        ctx.rerender();
        document.querySelector('[name="topicId"]')?.scrollIntoView({block:'center'});
        return true;
      }
      if (action==='restart' && !root.confirm(C.restartConfirm)) return true;
      if (action==='cancelGame' && !root.confirm(C.cancelConfirm)) return true;
      if (action==='endMeeting' && modern() && pub().phase==='MEETING_TURNS' && !root.confirm(C.endMeetingConfirm)) return true;
      const payload = {};
      if (action==='restart') payload.keepTopic=b.dataset.keepTopic==='true';
      if (action==='ready') payload.ready=b.dataset.ready==='true';
      if (action==='completeTask') payload.taskId=b.dataset.taskId;
      if (action==='extendTalk') payload.seconds=Number(b.dataset.seconds);
      if (action==='followUp' && b.dataset.followUpId) payload.followUpId=b.dataset.followUpId;
      if (['endMeetingTurn','skipMeetingTurn'].includes(action)) payload.meetingId=pub().meeting?.id;
      if (action==='abstain') await ctx.action('submitVote',{selections:[]});
      else await ctx.action(action,payload);
      return true;
    }
    function handleChange(event) {
      const input = event.target, form = input.form;
      if (form?.id==='v3-settings-form') {
        settingsDraft=readSettings(form,settingsDraft || pub().settings);
        const s=settingsDraft;
        document.getElementById('v3-estimate').outerHTML=settingSummary(s);
        document.getElementById('v3-self-tasks').textContent=C.selfTasks(Math.max(0,s.taskCount-s.interactionTaskCount));
        document.getElementById('v3-no-pool').hidden=s.enabledProfessions.length>0;
        return true;
      }
      if (form?.id==='v3-reward-form') { rewardDraft[input.name]=input.value; return true; }
      if (['v3-vote-form','v3-judge-form'].includes(form?.id) && input.name==='vote') {
        const judge=form.id==='v3-judge-form', draft=judge?judgeDraft:ballot, limit=judge?me().judgeDecision.seats:pub().voting.requiredSelections;
        if (input.checked) draft.add(input.value); else draft.delete(input.value);
        if (draft.size>limit) { draft.delete(input.value);input.checked=false;ctx.showToast(C.voteMax(limit)); }
        document.getElementById('v3-vote-count').textContent=C.selected(draft.size,limit);
        document.getElementById('v3-vote-submit').disabled=judge?draft.size!==limit:draft.size===0;
        return true;
      }
      return false;
    }
    function handleInput(event) {
      if(event.target.form?.id==='v3-settings-form'){handleChange(event);return;}
      if (event.target.id!=='v3-topic-search') return;
      const query=event.target.value.toLowerCase().trim();
      document.querySelectorAll('[data-topic-search]').forEach(item=>{ item.hidden=!item.dataset.topicSearch.includes(query); });
    }
    async function handleSubmit(event) {
      const form=event.target;
      if(form.id==='v4-meeting-time-form'){event.preventDefault();await ctx.action('setMeetingTurnSeconds',{seconds:Number(form.elements.seconds.value)});return true;}
      if (form.id==='v3-settings-form') {
        event.preventDefault();
        const next=readSettings(form,settingsDraft || pub().settings);
        if (await ctx.action('settings',{settings:next})) { settingsDraft=null;pendingDeal=null;ctx.rerender(); }
        return true;
      }
      if (form.id==='v3-reward-form') {
        event.preventDefault();
        await ctx.action('useReward',{meetingId:form.elements.meetingId?.value,targetId:form.elements.targetId?.value});
        return true;
      }
      if (['v3-vote-form','v3-judge-form'].includes(form.id)) {
        event.preventDefault();
        const judge=form.id==='v3-judge-form', draft=judge?judgeDraft:ballot;
        await ctx.action(judge?'judgeVote':'submitVote',{selections:Array.from(draft)});
        return true;
      }
      return false;
    }
    return {render,entryFields,readSettings,handleClick,handleChange,handleInput,handleSubmit,onActionError};
  }
  root.CHAT_WOLF_V3_UI=Object.freeze({create,elapsedMilliseconds,formatElapsed});
}(window));
