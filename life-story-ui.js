/* Life Story is a mode of the existing Dixit table and private Hub cards.
 * This renderer consumes only the service's per-seat projection. */
(function(root){
  'use strict';
  const dict={
    mode:['人生故事版','Life Stories'],classic:['原版 Dixit','Original Dixit'],modeLabel:['說書人模式','Storyteller mode'],
    lobby:['每個人，都有一段故事','Everyone has a story'],prepare:['準備你的故事','Find your story'],story:['故事正在發生','A story is unfolding'],collect:['等候大家出牌','Gathering the cards'],vote:['哪張是說書人的牌？','Which is the storyteller’s card?'],reveal:['揭曉，繼續聊聊','Reveal & conversation'],follow:['讓故事繼續','Let the story continue'],cancelled:['回合已取消','This turn was cancelled'],
    intro:['分享一段真實經驗，也可以邊說邊秘密選牌。朋友們邊聽邊出牌，再一起找出你的故事牌。','Share a real experience and secretly choose a card before or while speaking. Friends submit while listening, then try to find yours.'],
    lowPressure:['小事就很好；不必說出別人的真名，也可以換題或自由分享。','Small moments are enough. No real names needed. Change the prompt or share freely.'],
    voice:['請搭配面對面聊天或外部語音通話。遊戲不錄音，也不分析你的故事。','Play face to face or use your own voice call. Stories are never recorded or analyzed.'],
    ownLink:['沿用原本的 Hub 玩家連結；主持人也從自己的玩家卡片選牌。','Use the same Hub player links. The host chooses cards from their own private card too.'],
    start:['發牌，開始我們的故事','Deal & begin our stories'],questionStart:['哪個問題讓你想起生活片段？','Which prompt brings a moment back?'],
    optional:['延伸提示（選看）','Optional prompts'],optionalHelp:['可以只看一個，也可以都不回答。','Choose either, or skip both.'],
    refresh:['↻ 換一批問題','↻ Try three more'],free:['自由分享','Share freely'],pass:['略過本輪機會','Pass this cycle'],
    chosen:['這段故事的起點','A starting point'],pick:['再從自己的手牌秘密選一張。圖片的意義由你決定。','Secretly choose from your own hand. Its meaning is yours to decide.'],
    pickWhile:['可先開始說故事，再從手牌選一張；講完前確認你的秘密故事牌。','You can start speaking first, then choose from your hand. Confirm your secret story card before finishing.'],confirmStory:['確認秘密故事牌','Confirm secret story card'],storyCardRequired:['故事已講完；請說書人確認一張自己的故事牌，再一起鎖牌。','The story is complete. The storyteller needs to confirm a card before all cards lock.'],revealStart:['揭曉答案','Reveal the answer'],revealContinue:['繼續揭曉・顯示選票與分數','Continue reveal · show votes & points'],sharingScore:['完成分享','Completed story'],guessScore:['猜中說書人的牌','Correct guess'],
    startStory:['開始說故事','Start telling your story'],finishStory:['我說完了','I’ve finished my story'],
    tellHint:['可以完整說事件與感受，不必故意模糊。','Share the full event and your feelings. Be as clear as you like.'],
    listenHint:['邊聽邊找：哪張圖片讓你聯想到這段故事？','Listen and look: which image connects with this story?'],
    waitingPrepare:['{name} 正在選故事的起點，也可以開始說故事後再秘密選牌。故事開始後就能出牌。','{name} is choosing a starting point and can choose a secret card while speaking. Submit as soon as the story begins.'],
    submit:['提交這張牌','Submit this card'],withdraw:['撤回改選','Withdraw & change'],submitted:['你的牌已保留，正式鎖牌前可撤回改選。','Your card is reserved. You can change it before the cards lock.'],
    submittedProgress:['已出牌 {n}／{total} 人','Cards submitted: {n} / {total}'],
    allSubmitted:['大家已交牌，等候說書人講完；不會提早投票。','All cards are in. The story can take its time; voting waits.'],
    collection:['故事已講完，等候剩下的玩家出牌。','The story is complete. Waiting for the remaining cards.'],
    voteHint:['猜的是說書人原先選的圖片，不是尚未透露的心理。不可投自己的牌。','Guess the storyteller’s original card, not unspoken feelings. You cannot vote for your own card.'],
    storytellerNoVote:['說書人不投票，等朋友們猜好再一起揭曉。','The storyteller doesn’t vote. Wait for your friends to choose.'],
    ownCard:['你的牌・不可投','Your card · no vote'],castVote:['確認我的猜測','Confirm my guess'],voteFinal:['確認後就不能改票。','Your vote is final once confirmed.'],voted:['你的選票已確認，揭曉前保持私密。','Your vote is confirmed and stays private until the reveal.'],
    voteProgress:['已投票 {n}／{total} 人','Votes received: {n} / {total}'],
    answer:['說書人的牌','The story card'],noVotes:['沒有選票','No votes'],voters:['投票：{names}','Votes: {names}'],
    discuss:['聊聊為什麼選這張，或你在圖片裡看見了什麼。想說多少都可以。','Talk about why you chose your card, or what you saw in the images. Share as much or as little as you like.'],
    finishDiscussion:['結束本回合・開放接棒','Finish discussion & open follow-up'],waitingDiscussion:['自由討論中；主持人會在大家聊完後繼續。','Conversation is open. The host continues when everyone is ready.'],
    followQuestion:['剛才的故事，讓你想到自己的經驗嗎？','Did that story bring one of yours to mind?'],followHint:['用自己的手牌，分享與上一段故事相關的經驗。','Use your own hand and share a related real experience.'],
    followUp:['我也有故事','I have a story too'],next:['依序下一位','Next in seat order'],nextHint:['沒人接棒時，依原座位順序找本輪尚未分享的人。','If no one follows up, continue in the original seat order with someone who hasn’t shared yet.'],
    followPrepare:['接續上一個故事，分享你想到的相關經驗。','Continue the previous story with the related experience that came to mind.'],previous:['上一題：{question}','Previous prompt: {question}'],
    cycleComplete:['這一輪每個人都取得機會。討論結束後，先建立新輪再開放接棒。','Everyone had an opportunity this cycle. The new cycle opens before follow-up.'],
    hand:['你的手牌','Your hand'],private:['只有你看得到','Only visible to you'],secretCard:['你的秘密故事牌','Your secret story card'],zoom:['放大圖卡','Enlarge card'],close:['關閉大圖','Close card'],chooseCard:['選這張牌','Choose this card'],chooseStory:['選作我的故事牌','Choose as my story card'],chooseVote:['猜第 {n} 張','Choose card {n}'],
    swap:['換牌','Swap cards'],swapCancel:['取消換牌','Cancel swap'],swapHint:['選最多 {n} 張想更換的牌。本回合限 {times} 次。','Choose up to {n} cards. {times} swap per turn.'],swapConfirm:['更換 {n} 張','Swap {n} cards'],
    players:['玩家與分數','Players & scores'],cycle:['第 {n} 輪','Cycle {n}'],turn:['回合 {n}','Turn {n}'],
    pending:['本輪待分享','Yet to share'],inProgress:['本回合說書人','This turn’s storyteller'],storytellerStatus:['說書人','Storyteller'],shared:['本輪已分享','Shared this cycle'],passed:['本輪已略過','Passed this cycle'],excused:['本輪暫離','Excused this cycle'],nextCycle:['下一輪取得分享資格','Shares from next cycle'],offline:['離線','Offline'],you:['你','You'],
    noEligibility:['你本輪已分享或已略過，下一輪可以再接棒；仍然可以聊天、出牌與猜牌。','You’ve shared or passed this cycle. Follow up next cycle; you can still chat, submit, and vote.'],
    joined:['你會從下一回合開始出牌、猜牌，下一輪取得分享資格。','You can submit and vote from the next turn, and share from the next cycle.'],
    cancelledHint:['未結算的卡牌已回復，不發分。主持人可以安排下一位。','Unsettled cards have been restored without points. The host can choose the next storyteller.'],
    scoring:['完成分享 +{share}，猜對 +{guess}，你的牌每收到一票 +{vote}；全部猜對，說書人仍正常得分。','Complete a story +{share}, guess correctly +{guess}, each vote for your card +{vote}. The storyteller still scores when everyone guesses correctly.'],
    controls:['主持人工具','Host controls'],pause:['暫停','Pause'],resume:['繼續','Resume'],reserved:['已保留','Reserved'],cancelTurn:['取消回合，回復卡牌','Cancel turn & restore cards'],end:['結束遊戲，回到大廳','End game & return to lobby'],confirmCancel:['取消未結算的回合？卡牌會回復，不算已分享，也不發分。','Cancel this unsettled turn? Cards are restored without points or completed sharing.'],confirmEnd:['結束遊戲並回到大廳？同房題目歷史會保留。','End the game and return to the lobby? Question history stays in this room.'],confirm:['確認','Confirm'],back:['返回遊戲','Keep playing'],excuse:['將 {name} 標記暫離','Excuse {name}'],abstain:['讓 {name} 本回合棄權','Abstain for {name}'],transfer:['主持權交給 {name}','Make {name} host'],
    language:['房間題目語言','Room question language'],pack:['圖卡包','Card pack'],basePack:['原創基本包・84 張','Original base pack · 84 cards'],fullPack:['原創完整包・126 張','Original full pack · 126 cards'],art:['沿用 Hub 既有原創圖卡，卡牌包與玩法分開。','Uses the Hub’s existing original artwork. Card packs are independent of the rules.'],
    reuse:['題庫已走過一輪，這次可能再遇到先前的題目。','You’ve explored the question pool. A previous prompt may return.'],
    history:['清除題目歷史','Reset question history'],confirmHistory:['清除同房題目歷史？之後可能再次出現之前選過的問題。','Reset this room’s question history? Previously chosen prompts may appear again.'],
    connection:['暫時離線，等候重新連線。','Connection lost. Waiting to reconnect.'],sent:['已送出，等待伺服器確認…','Sent. Waiting for the server…'],waitingSync:['仍在等候同步；重連後會確認同一筆操作。','Still waiting for sync. Reconnecting will check this same action.'],
    stale:['牌局已更新，請依目前畫面重新操作。','The game has moved on. Please use the current screen.'],invalid:['這個操作目前無法完成，請確認最新牌局。','That action is unavailable. Please check the current game.'],service:['人生故事需要可信的伺服器。同步服務尚未支援此模式，請更新服務後再開始。','Life Stories needs the trusted server. Update the game service to support this mode before starting.'],
    rules:['人生故事玩法','Life Story rules'],rule1:['說書人完整分享真實生活經驗，可先開始說故事，再從手牌確認一張秘密故事牌。其他人聽故事時就能提交自己的牌，鎖牌前可以改選。','The storyteller shares a complete real experience and can start speaking before confirming a secret card from their hand. Friends submit while listening and can change before locking.'],
    rule2:['故事講完且牌收齊後才匿名洗混。朋友猜說書人的原牌，不可投自己的牌；說書人不投票。','Cards shuffle only after the story finishes and everyone submits. Friends guess the original story card, never their own. The storyteller doesn’t vote.'],
    rule3:['揭曉與自由討論完成後才開放接棒。每人每輪一次；接棒只是讓待分享的人提前輪到，不改原座位順序。','Follow-up opens only after reveal and free discussion. Each player gets one opportunity per cycle; follow-up brings an unshared player forward without changing seat order.'],
    rule4:['AI 只提供問題，不出牌、不猜心境、不評分故事。沒有逐字稿，也不產生假故事摘要。','AI only offers prompts. It never plays cards, guesses feelings, or grades stories. No transcript or invented story summary.'],
  };
  if(typeof I18N!=='undefined')I18N.registerDict('lifeStory',Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,{zh:v[0],en:v[1]}])));
  const t=(key,vars={})=>(typeof I18N!=='undefined'?I18N.t('lifeStory',key):dict[key]?.[1]||key).replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=value=>Array.isArray(value)?value:Object.values(value||{});
  const name=(s,n)=>list(s.roster).find(p=>Number(p.playerNum)===Number(n))?.name||'Player '+n;
  const privateActions=['choose_question','refresh_questions','free_share','choose_story_card','start_story','submit_card','withdraw_submission','mulligan','cast_vote','claim_follow_up','pass_opportunity'];
  const hostActions=['start_game','deal','reveal','advance_reveal','finish_discussion','next_in_order','cancel_turn','end_game','excuse_player','abstain_vote','transfer_host','configure','clear_question_history','pause','resume','recover'];
  const phaseKeys={LOBBY:'lobby',PREPARE:'prepare',STORYTELLING:'story',COLLECTING:'collect',VOTING:'vote',REVEAL_DISCUSS:'reveal',FOLLOW_UP:'follow'};
  const statusKeys={pending:'pending',in_progress:'inProgress',shared:'shared',passed:'passed',excused:'excused',next_cycle:'nextCycle'};
  const dt=(key,vars={})=>root.DIXIT_UI.t(key,vars);
  const clockNow=options=>typeof options.now==='function'?options.now():Number.isFinite(options.now)?options.now:Date.now();
  const locale=s=>s.locale==='zh-TW'||s.locale==='zh'?'zh-TW':'en';
  const questionText=(q,s)=>q?.question?.[locale(s)]||'';
  function actions(s,host){const a={...s.actions};if(host||!Number(s.playerNum))privateActions.forEach(key=>a[key]=false);if(!host&&!s.hostControls)hostActions.forEach(key=>a[key]=false);return a;}
  function btn(type,label,disabled=false,secondary=false,extra='',vars={}){
    const ids={start_game:'start-game',deal:'start-game',start_story:'start-story',choose_story_card:'choose-card',submit_card:'submit-card',finish_story:'finish-story',cast_vote:'cast-vote',reveal:'reveal',advance_reveal:'advance-reveal',finish_discussion:'finish-discussion',claim_follow_up:'follow-up',next_in_order:'next-in-order',pass_opportunity:'pass',withdraw_submission:'withdraw-card'};
    return '<button type="button" class="dx-button'+(secondary?' dx-secondary':'')+'" data-ls-action="'+type+'" data-testid="'+(ids[type]||type)+'"'+(disabled?' disabled':'')+extra+'>'+esc(t(label,vars))+'</button>';
  }
  /* The original card renderer owns the face, aspect ratio, frame, numbering,
     selected mark and artwork lookup. Only Life command metadata is added. */
  function cardHTML(id,index,s,{kind='hand',token='',selected=false,interactive=false,own=false,answer=false,owner='',votesHTML='',reserved=false}={}){
    const original=root.DIXIT_UI.cardHTML(id,index,{interactive,selected,disabled:own,own,answer,owner,votesHTML,artworkVersion:s.artworkVersion||2});
    return original.replace('class="dx-card-wrap"','class="dx-card-wrap'+(reserved?' ls-reserved':'')+'" data-ls-card="'+esc(id)+'" data-ls-kind="'+kind+'" data-ls-token="'+esc(token)+'" data-testid="'+(kind==='table'?'table-card':'hand-card')+'" data-card-id="'+esc(id)+'" data-token="'+esc(token)+'"');
  }
  function promptsHTML(q,s,key='chosen'){
    return '<details class="dx-help ls-prompts" data-ls-disclosure="'+esc(key)+'"><summary>'+esc(t('optional'))+'</summary><p class="dx-muted">'+esc(t('optionalHelp'))+'</p>'+list(q?.optionalPrompts?.[locale(s)]).map(p=>'<p>'+esc(p)+'</p>').join('')+'</details>';
  }
  function questionHTML(s,a){
    if(s.source==='follow_up'&&!s.question)return '<section class="dx-panel ls-question-area" data-ls-question-area><h2>'+esc(t('followPrepare'))+'</h2>'+(s.previousQuestion?'<p class="dx-muted">'+esc(t('previous',{question:questionText(s.previousQuestion,s)}))+'</p>':'')+'</section>';
    if(s.phase==='PREPARE'&&list(s.candidates).length){
      return '<section class="dx-panel ls-question-area" data-ls-question-area><h2>'+esc(t('questionStart'))+'</h2><div class="ls-question-options">'+list(s.candidates).map((q,i)=>'<section class="ls-question-option'+(q.id===s.question?.id?' is-selected':'')+'" data-testid="question-option" data-question-id="'+esc(q.id)+'">'+(a.choose_question?'<button type="button" class="dx-button dx-secondary" data-ls-question="'+esc(q.id)+'" aria-pressed="'+(q.id===s.question?.id)+'">'+esc(questionText(q,s))+'</button>':'<p class="ls-readonly-question" data-ls-readonly-question>'+esc(questionText(q,s))+'</p>')+promptsHTML(q,s,'candidate-'+i)+'</section>').join('')+'</div><div class="dx-actions">'+(a.refresh_questions?btn('refresh_questions','refresh',false,true):'')+(a.free_share?btn('free_share','free',false,true,s.questionChosen&&!s.question?' aria-pressed="true"':''):'')+'</div>'+(s.questionReuse?'<p class="dx-muted">'+esc(t('reuse'))+'</p>':'')+'</section>';
    }
    if(s.question)return '<section class="dx-panel ls-question-area" data-ls-question-area><h2>'+esc(t('chosen'))+'</h2><blockquote class="dx-clue" data-ls-selected-question>'+esc(questionText(s.question,s))+'</blockquote>'+promptsHTML(s.question,s)+'</section>';
    if(s.phase==='LOBBY'||s.phase==='FOLLOW_UP')return '';
    return '<section class="dx-panel ls-question-area" data-ls-question-area><h2>'+esc(t('free'))+'</h2><p>'+esc(t('tellHint'))+'</p></section>';
  }
  function settingsHTML(s,a){
    return a.configure?'<div class="dx-actions ls-settings"><label>'+esc(t('language'))+' <select data-ls-config="locale"><option value="en"'+(locale(s)==='en'?' selected':'')+'>English</option><option value="zh-TW"'+(locale(s)==='zh-TW'?' selected':'')+'>繁體中文</option></select></label><label>'+esc(t('pack'))+' <select data-ls-config="cardPackId">'+list(s.packs).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===s.config?.cardPackId?' selected':'')+'>'+esc(p.name?.[locale(s)]||p.name?.en||p.id)+'</option>').join('')+'</select></label></div>':'';
  }
  function choiceBar(s,a,selected,swapping){
    const type=swapping?'mulligan':a.choose_story_card?'choose_story_card':a.submit_card?'submit_card':a.cast_vote?'cast_vote':null;
    if(!type||!a[type])return '';
    const max=swapping?Number(s.config?.mulliganMaxCards||2):1;
    const label=type==='mulligan'?'swapConfirm':type==='choose_story_card'?'confirmStory':type==='cast_vote'?'castVote':'submit';
    const valid=selected.size>0&&selected.size<=max&&(type!=='cast_vote'||!selected.has(s.ownTableToken));
    return '<div class="dx-choice-bar"><span>'+esc(dt('selectCount',{n:selected.size,total:max}))+'</span>'+btn(type,label,!valid,false,'',{n:selected.size})+'</div>';
  }
  function revealView(s){return {...s,phase:s.phase==='REVEAL_DISCUSS'?'REVEAL':s.phase,table:list(s.table).map(c=>c.cardId),result:s.result};}
  function roundScoresHTML(s){
    const rows=list(s.result?.rows).slice().sort((a,b)=>Number(b.playerNum===s.playerNum)-Number(a.playerNum===s.playerNum));
    const others=rows.filter(r=>r.playerNum!==s.storyteller),correct=others.filter(r=>r.correct).length;
    return '<aside class="dx-round-scores" data-dx-round-scores aria-label="'+esc(dt('roundGain'))+'"><div class="dx-reveal-heading"><h2>'+esc(dt('roundGain'))+'</h2><p class="dx-score-outcome">'+esc(dt('roundFound',{n:correct,total:others.length}))+'</p></div><div class="dx-score-changes">'+rows.map(r=>{
      const reasons=[];if(Number(r.base)>0)reasons.push({label:t(r.playerNum===s.storyteller?'sharingScore':'guessScore'),points:r.base});if(Number(r.bonus)>0)reasons.push({label:dt(Number(r.bonus)===1?'scoreVoteOne':'scoreVoteMany',{n:r.bonus}),points:r.bonus});
      return '<div class="dx-score-change'+(r.playerNum===s.playerNum?' is-me':'')+(!r.delta?' is-zero':'')+'" data-dx-score-player="'+r.playerNum+'"><div class="dx-score-person"><strong class="dx-score-name">'+esc(name(s,r.playerNum))+'</strong><strong class="dx-score-gain" aria-label="'+esc(dt('pointsChange'))+'">'+(r.delta?'+'+Number(r.delta):'0')+'</strong></div>'+reasons.map(reason=>'<div class="dx-score-reason"><span>'+esc(reason.label)+'</span><strong>+'+Number(reason.points)+'</strong></div>').join('')+'</div>';
    }).join('')+'</div></aside>';
  }
  function voteStatusesHTML(s){
    if(!['STORYTELLING','COLLECTING','VOTING'].includes(s.phase))return '';
    const voting=s.phase==='VOTING',eligible=new Set(list(s.participants).map(Number)),kind=voting?'vote':'submit';
    return '<div class="dx-vote-statuses" role="list" aria-label="'+esc(dt(voting?'votingStatuses':'submitStatuses'))+'" data-dx-'+kind+'-statuses>'+list(s.roster).map(p=>{
      const teller=Number(p.playerNum)===Number(s.storyteller),inactive=!eligible.has(Number(p.playerNum)),done=voting?p.voted:p.submitted;
      const key=teller?voting?'voteStoryteller':'submitStoryteller':inactive?voting?'voteInactive':'submitInactive':done?voting?'voteDone':'submitDone':voting?'voteWaiting':'submitWaiting';
      const text=teller&&!voting?t('storytellerStatus'):dt(key);
      return '<div class="dx-vote-status is-'+(teller?'storyteller':inactive?'inactive':done?'voted':'waiting')+'" data-dx-'+kind+'-player="'+p.playerNum+'" role="listitem"><span class="dx-vote-name">'+esc(p.name)+'</span><span class="dx-vote-state">'+esc(text)+'</span></div>';
    }).join('')+'</div>';
  }
  function phaseInfo(s,{host=false,now=Date.now()}={}){
    const a=actions(s,host),mine=!host&&Number(s.playerNum)===Number(s.storyteller),others=list(s.roster).filter(p=>list(s.participants).map(Number).includes(Number(p.playerNum))&&Number(p.playerNum)!==Number(s.storyteller));
    let title=t(s.turnCancelled&&s.phase==='FOLLOW_UP'?'cancelled':phaseKeys[s.phase]||'lobby'),instruction='',progress='',primary='';
    if(s.phase==='LOBBY')instruction=t('ownLink');
    if(s.phase==='PREPARE'){instruction=mine?t('pickWhile'):t('waitingPrepare',{name:name(s,s.storyteller)});if(mine)primary=btn('start_story','startStory',!a.start_story||!s.questionChosen);}
    if(s.phase==='STORYTELLING'||s.phase==='COLLECTING'){
      instruction=s.storyCardRequired?t('storyCardRequired'):s.phase==='COLLECTING'?t('collection'):mine?t(s.storyCard?'tellHint':'pickWhile'):t('listenHint');
      progress=t('submittedProgress',{n:others.filter(p=>p.submitted).length,total:others.length});
      if(mine&&a.finish_story)primary=btn('finish_story','finishStory',!s.storyCard);
    }
    if(s.phase==='VOTING'){instruction=mine?t('storytellerNoVote'):s.vote?t('voted'):t('voteHint');progress=t('voteProgress',{n:others.filter(p=>p.voted).length,total:others.length});if(s.votesComplete)instruction=dt(a.reveal?'phaseAllVotesHost':'phaseAllVotesPlayer');if(a.reveal)primary=btn('reveal','revealStart');}
    if(s.phase==='REVEALING'){const answer=root.DIXIT_UI.revealVisual(s,now)==='answer';title=dt(answer?'phaseAnswer':'phaseRevealing');instruction=dt(answer?'phaseAnswerWait':'phaseCountdown');}
    if(s.phase==='REVEAL_DISCUSS'){instruction=t('discuss');if(a.finish_discussion)primary=btn('finish_discussion','finishDiscussion');}
    if(s.phase==='FOLLOW_UP')instruction=t(s.turnCancelled?'cancelledHint':'followHint');
    return {title,instruction:s.paused?dt('paused'):instruction,progress,primary};
  }
  function tableHTML(payload,options={}){
    const s=payload.dixit||payload,host=!!options.host,privateView=!host&&Number(s.playerNum)>0,a=actions(s,host),selected=options.selected||new Set(),now=clockNow(options),roster=list(s.roster),mine=privateView&&Number(s.playerNum)===Number(s.storyteller),revealed=s.phase==='REVEAL_DISCUSS',info=phaseInfo(s,{host,now});
    let body='';
    if(s.phase==='LOBBY')body='<section class="dx-panel"><h2>'+esc(dt('lobby'))+'</h2><p>'+esc(t('intro'))+'</p>'+settingsHTML(s,a)+'<div class="dx-actions">'+(a.start_game||a.deal?btn(a.start_game?'start_game':'deal','start'):'')+'</div><p class="dx-muted">'+esc(t('art'))+'</p></section>';
    else if(s.phase==='FOLLOW_UP')body='<section class="dx-panel"><h2>'+esc(t(s.turnCancelled?'cancelled':'followQuestion'))+'</h2><p>'+esc(t(s.turnCancelled?'cancelledHint':'followHint'))+'</p><div class="dx-actions">'+(!s.turnCancelled&&a.claim_follow_up&&s.eligibleFollowUp?btn('claim_follow_up','followUp'):'')+(a.next_in_order?btn('next_in_order','next',false,true):'')+'</div>'+(!s.turnCancelled&&privateView&&!s.eligibleFollowUp?'<p class="dx-muted">'+esc(t(roster.find(p=>Number(p.playerNum)===Number(s.playerNum))?.opportunity==='next_cycle'?'joined':'noEligibility'))+'</p>':'')+'</section>';
    else{
      body+=questionHTML(s,a);
      if(s.phase==='PREPARE'&&s.questionChosen&&!s.question&&s.source!=='follow_up')body+='<p class="dx-muted" data-ls-selected-question>'+esc(t('free'))+'</p>';
      if(s.phase==='REVEALING'||revealed)body+=root.DIXIT_UI.revealHTML(revealView(s),now,{roundScoresHTML});
      if(s.phase==='VOTING'||revealed){
        const projected=revealView(s);
        const gallery='<section class="dx-panel dx-card-panel"><h2>'+esc(dt('table'))+'</h2>'+(!host?choiceBar(s,a,selected,false):'')+'<div class="dx-table">'+list(s.table).map((c,i)=>cardHTML(c.cardId,i+1,s,{kind:'table',token:c.token,interactive:!!a.cast_vote,selected:selected.has(c.token),own:privateView&&!revealed&&c.token===s.ownTableToken,answer:revealed&&c.isAnswer,owner:revealed?name(s,c.ownerPlayerNum):'',votesHTML:revealed?root.DIXIT_UI.votersHTML(projected,c.cardId,'gallery'):''})).join('')+'</div>'+(!host&&a.cast_vote?'<p class="dx-muted">'+esc(t('voteFinal'))+'</p>':'')+'</section>';
        body+=revealed?'<details class="dx-round-gallery" data-ls-disclosure="gallery"><summary>'+esc(dt('allPlayed'))+'</summary>'+gallery+'</details>':gallery;
      }
      if(privateView&&s.submission&&!mine&&['STORYTELLING','COLLECTING'].includes(s.phase))body+='<section class="dx-panel"><p>'+esc(t('submitted'))+'</p><div class="dx-actions">'+(a.withdraw_submission?btn('withdraw_submission','withdraw',false,true):'')+'</div></section>';
      if(privateView&&list(s.hand).length&&['PREPARE','STORYTELLING','COLLECTING'].includes(s.phase)){
        body+='<section class="dx-panel dx-hand"><h2>'+esc(dt('hand'))+'</h2>'+choiceBar(s,a,selected,options.swapping)+'<p class="dx-select-hint">'+esc(dt('selectHint'))+'</p><div class="dx-hand-grid">'+list(s.hand).map((id,i)=>cardHTML(id,i+1,s,{interactive:!!(a.choose_story_card||a.submit_card||a.mulligan),selected:selected.has(id)||!selected.size&&id===s.storyCard,reserved:id===s.submission&&!mine})).join('')+'</div>'+(a.mulligan?'<details class="dx-help ls-swap" data-ls-disclosure="swap"><summary>'+esc(t('swap'))+'</summary><p>'+esc(t('swapHint',{n:s.config?.mulliganMaxCards||2,times:s.config?.mulliganTimesPerTurn||1}))+'</p><button type="button" class="dx-button dx-secondary" data-ls-swap-toggle>'+esc(t(options.swapping?'swapCancel':'swap'))+'</button></details>':'')+'</section>';
      }
      if(s.cycleComplete&&revealed)body+='<p class="dx-notice">'+esc(t('cycleComplete'))+'</p>';
    }
    if(a.pass_opportunity)body+='<div class="dx-actions ls-pass">'+btn('pass_opportunity','pass',false,true)+'</div>';
    const scores='<details class="dx-game-details" data-ls-disclosure="players" open><summary>'+esc(dt('gameDetails'))+'</summary><div class="dx-scores">'+roster.map(p=>'<div class="dx-seat'+(Number(p.playerNum)===Number(s.storyteller)&&!['FOLLOW_UP','REVEAL_DISCUSS'].includes(s.phase)?' is-teller':'')+'" data-ls-player="'+p.playerNum+'" data-opportunity="'+esc(p.opportunity)+'"><span>'+esc(p.name)+'</span><strong>'+Number(p.score||0)+'</strong><small>'+esc(t(statusKeys[p.opportunity]||'nextCycle'))+(p.connected===false?' · '+esc(t('offline')):'')+'</small></div>').join('')+'</div><p class="dx-muted dx-goal">'+esc(t('cycle',{n:s.cycleNumber||1}))+' · '+esc(t('turn',{n:s.round||0}))+'</p></details>';
    const tools=(host||s.hostControls)?'<details class="dx-help" data-ls-disclosure="tools"><summary>'+esc(dt('hostControls'))+'</summary><div class="dx-host-controls">'+(a.pause?btn('pause','pause',false,true):a.resume?btn('resume','resume',false,true):'')+(a.finish_story&&!mine?btn('finish_story','finishStory',false,true):'')+(a.cancel_turn?btn('cancel_turn','cancelTurn',false,true):'')+(a.end_game?btn('end_game','end',false,true):'')+(a.clear_question_history?btn('clear_question_history','history',false,true):'')+roster.filter(p=>p.connected===false).map(p=>(a.excuse_player?btn('excuse_player','excuse',false,true,' data-ls-player-num="'+p.playerNum+'"',{name:p.name}):'')+(a.abstain_vote&&!p.voted&&Number(p.playerNum)!==Number(s.storyteller)?btn('abstain_vote','abstain',false,true,' data-ls-player-num="'+p.playerNum+'"',{name:p.name}):'')).join('')+roster.filter(p=>p.connected!==false&&Number(p.playerNum)!==Number(s.hostPlayerNum)).map(p=>a.transfer_host?btn('transfer_host','transfer',false,true,' data-ls-player-num="'+p.playerNum+'"',{name:p.name}):'').join('')+'</div></details>':'';
    const rules='<details class="dx-help" data-ls-disclosure="rules"><summary>'+esc(t('rules'))+'</summary>'+['rule1','rule2','rule3','rule4'].map(k=>'<p>'+esc(t(k))+'</p>').join('')+'<p>'+esc(t('scoring',{share:s.config?.sharingPoints??2,guess:s.config?.correctGuessPoints??2,vote:s.config?.attractedVotePoints??1}))+'</p><p class="dx-muted">'+esc(t('voice'))+'</p></details>';
    const confirmation=options.confirmation?'<div class="dx-confirm" role="alertdialog"><p>'+esc(t(options.confirmation==='end_game'?'confirmEnd':options.confirmation==='clear_question_history'?'confirmHistory':'confirmCancel'))+'</p><div class="dx-actions">'+btn(options.confirmation,'confirm',false,false,' data-ls-confirm="true"')+'<button type="button" class="dx-button dx-secondary" data-ls-dismiss-confirm>'+esc(t('back'))+'</button></div></div>':'';
    const phase='<section class="dx-phase-bar'+(s.paused?' is-paused':'')+(s.phase==='VOTING'||s.phase==='STORYTELLING'||s.phase==='COLLECTING'?' is-voting':'')+'" data-dx-phase="'+esc(s.phase)+'" data-ls-phase="'+esc(s.phase)+'"><div class="dx-phase-main"><span class="dx-phase-kicker">'+esc(dt('currentStage'))+'</span><h2 data-testid="phase" data-phase="'+esc(s.phase)+'">'+esc(info.title)+'</h2><p class="dx-phase-instruction" role="status">'+esc(info.instruction)+'</p><span class="dx-connection" data-ls-connection role="status"></span></div><div class="dx-phase-progress">'+(info.progress?'<strong>'+esc(info.progress)+'</strong>':'')+info.primary+'</div>'+voteStatusesHTML(s)+'</section>';
    return '<div class="dx-game ls-game'+(s.phase==='REVEALING'||revealed?' is-reveal-phase':'')+'" data-life-story>'+phase+'<p class="dx-message" data-ls-message role="status"></p>'+body+scores+tools+confirmation+rules+'<p class="dx-muted ls-low-pressure">'+esc(t('lowPressure'))+'</p></div>';
  }
  function errorText(error){return /stale|revision|cycle|turn|session/i.test(error)?t('stale'):/executor|service|unsupported_mode|server_required/i.test(error)?t('service'):/offline|connection/i.test(error)?t('connection'):error==='card_required'?t('storyCardRequired'):t('invalid');}
  class Card{
    constructor(el,options={}){this.el=el;this.options=options;this.payload=null;this.selected=new Set();this.pending=null;this.pendingWaiting=false;this.error='';this.errorCode='';this.swapping=false;this.confirmation='';this.signature='';this.openVoters=new Set();this.visualSignature='';this.click=e=>this.onClick(e);this.change=e=>this.onChange(e);el.addEventListener('click',this.click);el.addEventListener('change',this.change);this.timer=setInterval(()=>this.paint(),200);}
    blocked(){return !!this.pending||this.options.disabled?.()||this.options.connected?.()===false;}
    update(payload){
      const previous=this.payload?.dixit,s=payload?.dixit;this.payload=payload;if(!s)return;
      if(!previous||previous.sessionId!==s.sessionId||previous.turnId!==s.turnId||previous.phase!==s.phase){this.selected.clear();this.swapping=false;this.confirmation='';if(previous?.turnId!==s.turnId)this.openVoters.clear();}
      if(this.pending&&s.reply?.id===this.pending.id){this.errorCode=s.reply.error||'';if(!this.errorCode&&!['choose_question','choose_story_card','refresh_questions','free_share'].includes(this.pending.type))this.selected.clear();this.pending=null;this.pendingWaiting=false;clearTimeout(this.pendingTimer);}
      else if(this.pending&&(this.pending.sessionId!==s.sessionId||this.pending.turnId!==s.turnId||this.pending.cycleId!==s.cycleId)){this.pending=null;this.pendingWaiting=false;clearTimeout(this.pendingTimer);}
      const queued=payload.dixitAction;if(!this.pending&&!this.options.host&&queued?.id&&queued.sessionId===s.sessionId&&queued.turnId===s.turnId&&queued.cycleId===s.cycleId&&s.reply?.id!==queued.id&&Object.hasOwn(s.actions||{},queued.type)){this.pending={...queued};this.pendingWaiting=true;}
      for(const id of this.selected)if(!list(s.hand).includes(id)&&!list(s.table).some(c=>c.token===id))this.selected.delete(id);
      const clean={...s};delete clean.revision;delete clean.hostLiveUntil;const signature=JSON.stringify(clean)+'|'+t('mode');if(signature!==this.signature){this.signature=signature;this.render();}else this.paint();
      if(s.phase==='REVEALING'&&previous?.phase!=='REVEALING')this.el.scrollIntoView?.({block:'start',behavior:'instant'});
    }
    paint(){
      if(!this.payload)return;const s=this.payload.dixit,visual=root.DIXIT_UI.revealVisual(s,clockNow(this.options));if(visual!==this.visualSignature){this.render();return;}
      const message=this.el.querySelector('[data-ls-message]');if(message)message.textContent=this.errorCode?errorText(this.errorCode):this.pending?t(this.pendingWaiting?'waitingSync':'sent'):'';
      const connection=this.el.querySelector('[data-ls-connection]');if(connection)connection.textContent=this.options.connected?.()===false?t('connection'):'';
      const bar=this.el.querySelector('[data-dx-phase]');if(bar?.getBoundingClientRect&&this.el.style?.setProperty)this.el.style.setProperty('--dx-phase-height',Math.ceil(bar.getBoundingClientRect().height)+'px');
      const blocked=this.blocked();this.el.querySelectorAll('[data-ls-action],[data-ls-question],[data-ls-config],[data-ls-swap-toggle],button[data-dx-card]').forEach(b=>{if(blocked){if(!b.disabled)b.dataset.lsBlocked='1';b.disabled=true;}else if(b.dataset.lsBlocked){b.disabled=false;delete b.dataset.lsBlocked;}});
    }
    render(){
      if(!this.payload)return;const open=new Map(Array.from(this.el.querySelectorAll('[data-ls-disclosure]')).map(d=>[d.dataset.lsDisclosure,d.open]));this.visualSignature=root.DIXIT_UI.revealVisual(this.payload.dixit,clockNow(this.options));
      this.el.innerHTML=tableHTML(this.payload,{...this.options,selected:this.selected,swapping:this.swapping,confirmation:this.confirmation});this.el.querySelectorAll('[data-ls-disclosure]').forEach(d=>{if(open.has(d.dataset.lsDisclosure))d.open=open.get(d.dataset.lsDisclosure);});this.el.querySelectorAll('[data-dx-voters-toggle]').forEach(b=>{if(this.openVoters.has(b.dataset.dxVotersToggle))this.setVoters(b,true);});this.paint();
    }
    setVoters(button,open){button.setAttribute('aria-expanded',String(open));if(button.nextElementSibling)button.nextElementSibling.hidden=!open;}
    async send(type,extra={}){if(this.blocked())return;const s=this.payload.dixit,a=actions(s,!!this.options.host);if(!a[type])return;const command={type,id:root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),sessionId:s.sessionId,turnId:s.turnId,cycleId:s.cycleId,expectedRevision:s.lifeRevision,...extra};this.pending=command;this.pendingWaiting=false;this.errorCode='';this.paint();this.pendingTimer=setTimeout(()=>{if(this.pending?.id===command.id){this.pendingWaiting=true;this.paint();}},15000);try{await this.options.send(command);}catch(error){this.pending=null;clearTimeout(this.pendingTimer);this.errorCode=error.message||'failed';this.render();}}
    async onChange(event){const input=event.target.closest('[data-ls-config]');if(input&&!this.blocked())await this.send('configure',{[input.dataset.lsConfig]:input.value});}
    async onClick(event){
      const target=event.target,s=this.payload?.dixit;if(!s)return;
      const voters=target.closest('[data-dx-voters-toggle]');if(voters){const key=voters.dataset.dxVotersToggle,open=!this.openVoters.has(key);if(open)this.openVoters.add(key);else this.openVoters.delete(key);this.setVoters(voters,open);return;}
      if(target.closest('[data-ls-dismiss-confirm]')){this.confirmation='';this.render();return;}
      const a=actions(s,!!this.options.host);
      if(target.closest('[data-ls-swap-toggle]')){if(this.blocked()||!a.mulligan)return;this.swapping=!this.swapping;this.selected.clear();this.render();return;}
      const card=target.closest('[data-ls-card]');
      if(card){
        if(this.blocked()||this.options.host||!Number(s.playerNum))return;
        const id=card.dataset.lsCard,kind=card.dataset.lsKind,token=card.dataset.lsToken;
        if(kind==='table'){if(!a.cast_vote||token===s.ownTableToken||!list(s.table).some(c=>c.token===token&&c.cardId===id))return;if(this.selected.has(token))this.selected.delete(token);else this.selected=new Set([token]);}
        else{if(!list(s.hand).includes(id)||!(a.choose_story_card||a.submit_card||this.swapping&&a.mulligan))return;const max=this.swapping?Number(s.config?.mulliganMaxCards||2):1;if(this.selected.has(id))this.selected.delete(id);else{if(max===1)this.selected.clear();if(this.selected.size<max)this.selected.add(id);}}
        this.render();return;
      }
      const question=target.closest('[data-ls-question]');if(question){if(a.choose_question&&list(s.candidates).some(q=>q.id===question.dataset.lsQuestion))await this.send('choose_question',{questionId:question.dataset.lsQuestion});return;}
      const button=target.closest('[data-ls-action]');if(!button||button.disabled||this.blocked())return;const type=button.dataset.lsAction;if(!a[type])return;
      if(['cancel_turn','end_game','clear_question_history'].includes(type)&&!(this.confirmation===type&&button.dataset.lsConfirm==='true')){this.confirmation=type;this.render();return;}
      this.confirmation='';let extra={};if(type==='submit_card'||type==='choose_story_card'){if(this.selected.size!==1)return;extra.cardId=[...this.selected][0];}if(type==='cast_vote'){if(this.selected.size!==1||this.selected.has(s.ownTableToken))return;extra.token=[...this.selected][0];}if(type==='mulligan'){extra.cardIds=[...this.selected];this.swapping=false;}if(['transfer_host','excuse_player','abstain_vote'].includes(type))extra.playerNum=Number(button.dataset.lsPlayerNum);await this.send(type,extra);
    }
    destroy(){clearInterval(this.timer);clearTimeout(this.pendingTimer);this.el.removeEventListener('click',this.click);this.el.removeEventListener('change',this.change);}
  }
  root.LIFE_STORY_UI={Card,tableHTML,cardHTML,phaseInfo,roundScoresHTML,t,esc,errorText};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.LIFE_STORY_UI;
})(typeof globalThis!=='undefined'?globalThis:this);
