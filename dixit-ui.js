/* Original picture cards with the current Dixit base-game rules. Both the
 * shared table and existing Hub player links use this same filtered renderer. */
(function(root){
  'use strict';
  const dict={
    subtitle:['妙語說書人','Picture storytelling'], round:['第 {n} 輪','Round {n}'], storyteller:['說書人：{name}','Storyteller: {name}'],
    yourTurn:['輪到你當說書人','You are the Storyteller'], waitingClue:['等 {name} 選牌，直接說出提示。','Wait for {name} to select a card and speak the clue.'],
    storyHint:['選一張圖卡，直接說出提示。說完後再確認出牌。讓部分人猜中，但別讓所有人都猜中。','Select one picture, then say your clue aloud. Confirm your card after speaking. Aim for some people to guess it, but not everyone.'],
    tell:['已說完提示，確認出牌','I have spoken my clue — confirm card'], submit:['確認秘密出牌','Confirm secret cards'], submitHint:['聽口頭提示，選 {n} 張符合提示的圖卡。選好後再確認出牌。','Listen to the spoken clue and select {n} matching picture card(s). Confirm after choosing.'],
    submitted:['已秘密出牌。等其他玩家選牌。','Cards submitted. Waiting for the other players.'], voteHint:['猜哪張是說書人的圖卡。不能投自己出的牌。','Which card belongs to the Storyteller? You cannot vote for your own cards.'],
    vote:['確認秘密投票','Confirm secret vote'], voted:['已投票，揭曉前不會公開你的選擇。','Vote submitted. Your choice stays secret until the reveal.'], tellerVote:['說書人不投票。等其他玩家猜你的圖卡。','The Storyteller does not vote. Wait for everyone to guess your card.'],
    ownCard:['你的圖卡，不能投票','Your card — you cannot vote for it'], hand:['你的手牌','Your hand'], table:['展示的圖卡','Revealed picture cards'],
    selectCount:['已選 {n}／{total} 張','Selected {n} / {total}'], selectHint:['點圖卡選牌，選好後再確認。','Tap a picture to select it, then confirm your choice.'], ready:['準備好了','Ready'], unready:['取消準備','Not ready'], readyStatus:['已準備','Ready'], notReady:['等待準備','Not ready'],
    deal:['發牌並開始','Deal and start'], first:['首位說書人','First Storyteller'], random:['隨機','Random'], lobby:['每人打開自己的玩家卡片','Open your own player card'],
    lobbyHint:['使用首頁原本的玩家連結。主持人若也玩，請從自己的玩家卡片選牌與投票。','Use your existing Hub player links. Hosts who are playing use their own player card to choose cards and vote.'],
    shared:['共同牌桌','Shared table'], open:['開啟這桌遊戲','Open this table'], setup:['回首頁設定房間','Set up room in Hub'],
    setupHint:['請先在首頁設定 3–8 人房間。','Set up a 3–8-player room in the Hub first.'], keepOpen:['請用開房間時的同一個瀏覽器開啟 HOST 玩家卡片，卡片會自動維持遊戲同步。','Open your host player card in the browser used to create this room; your card will keep the game in sync.'],
    reveal:['揭曉並計分','Reveal and score'], next:['補牌，下一輪','Refill and start next round'], pause:['暫停','Pause'], resume:['繼續','Resume'], paused:['遊戲已暫停','Game paused'], cancel:['結束這局','Cancel game'], restart:['原班人馬再玩一局','Play again with the same players'],
    confirmCancel:['確定結束這局？這局不會產生勝者。','Cancel this game? This game will have no winner.'], confirmRestart:['重新發牌並清除這局分數？','Deal again and clear this game’s scores?'],
    progressSubmit:['已出牌 {n}／{total} 人','Cards submitted: {n} / {total}'], progressVote:['已投票 {n}／{total} 人','Votes received: {n} / {total}'],
    waitingReveal:['全員投票完成，等主持人揭曉。','All votes are in. Waiting for the host to reveal.'], waitingSubmit:['其他玩家正在秘密選牌。','Other players are choosing their cards secretly.'], waitingVotes:['玩家正在秘密投票，全部投完後一起揭曉。','Players are voting secretly. Reveal together when everyone has voted.'],
    result:['這輪結果','Round result'], all:['所有人都猜對：說書人 0 分，其他人各 2 分。','Everyone guessed correctly: Storyteller 0, everyone else +2.'], none:['沒有人猜對：說書人 0 分，其他人各 2 分。','Nobody guessed correctly: Storyteller 0, everyone else +2.'], some:['部分人猜對：說書人與猜中者各 3 分。','Some guessed correctly: Storyteller and correct guesses +3.'],
    bonusRule:['你的圖卡每被投一票，再得 1 分。','Each vote on your own card adds 1 bonus point.'], player:['玩家','Player'], guess:['投票','Vote'], base:['猜牌得分','Base'], bonus:['吸票加分','Bonus'], total:['總分','Total'], votes:['{n} 票','{n} vote(s)'], winner:['勝者：{name}','Winner: {name}'], tie:['並列勝者：{name}','Shared winners: {name}'], cancelled:['這局已取消','Game cancelled'],
    help:['玩法與計分','Rules and scoring'], rule1:['3–8 人，每人 6 張圖卡。三人局每人 7 張，非說書人每輪各出 2 張。','3–8 players; 6 cards each. With 3 players, deal 7 each and each non-Storyteller submits 2 cards.'],
    rule2:['說書人秘密選 1 張，直接用語音說出一個詞、一句話或故事。說完後確認出牌。其他人秘密選符合提示的牌；全部洗勻再編號展示。','The Storyteller secretly selects 1 card and speaks a word, phrase or story aloud, then confirms the card. Others submit matching cards secretly. All cards are shuffled and numbered.'],
    rule3:['非說書人各秘密投 1 票，不能投自己的牌。全員投完才揭曉圖卡主人、選票和分數。','Each non-Storyteller votes once, secretly, never for their own card. Owners, votes, and points are revealed only after everyone votes.'],
    rule4:['用過的牌棄掉，補滿手牌，由下一位接任說書人。牌庫不足時重洗棄牌。有人在輪末達到 {n} 分即結束，最高分獲勝，同分並列。','Discard played cards, refill hands, and pass the Storyteller role to the next player. Reshuffle discards when needed. End after a round with a score of {n} or more. Highest score wins; ties share the win.'],
    targetVariant:['選擇其他目標分數是自訂玩法；基本版為 30 分。','A target other than 30 points is a custom variation of the base-game rules.'], invalidTarget:['目標分數請填 5–100 的整數。','Choose a whole-number score target from 5 to 100.'],
    artNote:['84 張原創插畫；玩法依據 Dixit 現行基本版。這是非官方改編，卡面不是原版圖卡。','84 original illustrations using the current Dixit base-game rules. An unofficial adaptation; the art is independently created.'],
    sources:['官方規則','Official rules'], card:['圖卡 {n}','Card {n}'], answer:['說書人的圖卡','The Storyteller’s card'],
    scoreTarget:['先到 {n} 分，最高分獲勝','Reach {n}; highest score wins'], deck:['牌庫：{n} 張','Draw pile: {n}'],
    offline:['暫時離線，操作已停用。','Connection lost. Actions are paused.'], hostAway:['同步恢復中，操作會在連線恢復後確認。','Reconnecting game sync. Your action will be confirmed when it resumes.'], otherHost:['另一個主持分頁正在管理。','Another host tab is managing this table.'], switched:['玩家卡片已切到其他遊戲。','Player cards have switched to another game.'],
    pending:['已送出，等待同步…','Sent. Waiting for confirmation…'], pendingResume:['已送出，等待遊戲恢復同步…','Action sent. Waiting for game sync to resume…'], failed:['無法送出，請確認連線後重試。','Could not send. Check your connection and try again.'], stale:['牌局已更新，請重新選擇。','The game has moved on. Please choose again.'], invalid:['這個階段不能這樣操作，請重新選擇。','That action is not available now. Please choose again.'],
    refreshHost:['請主持人重新整理遊戲頁面，啟用口頭提示後再確認出牌。','Ask the host to refresh the game page to enable spoken clues, then confirm your card again.'],
    demo:['單機示範：模擬玩家，沒有房間同步','LOCAL DEMO — synthetic players; no room connection'], view:['視角','View'], real:['使用真正的 Hub 房間','Use a real Hub room'],
    ruleSharedRecovery:['玩家可共同揭曉、換輪與處理缺席玩家。確定離線者本輪不須出牌或投票，不會自動獲得分數；已投出的票保留。若說書人缺席，本輪圖卡退回且不計分。至少三位玩家在線才能恢復。','Players can reveal, start rounds and handle confirmed absences together. Missing cards or votes are skipped without awarding automatic points; real ballots already cast remain. If the Storyteller is away, return this round’s cards without scoring. At least three players must be online to recover.'],
    awayPlayers:['至少需要三位玩家在線，請等候其他人回來。','At least three players must be online. Wait for another player to return.'], awayRound:['上一輪說書人離線，圖卡已退回且不計分；由下一位重新說提示。','The previous Storyteller is away. Cards were returned and that round was not scored. The next Storyteller gives a new clue.'],
    currentStage:['目前階段','Current stage'], phaseLobby:['等待開始','Waiting to start'], phaseClue:['說書人說提示','Storyteller speaks'], phaseSubmit:['秘密出牌','Secret card selection'], phaseVote:['秘密投票','Secret voting'], phaseRevealing:['準備揭曉','The reveal'], phaseAnswer:['說書人的圖卡','The Storyteller’s card'], phaseReveal:['揭曉結果','Round revealed'], phaseFinished:['遊戲結束','Game finished'], phaseCancelled:['這局已取消','Game cancelled'],
    phaseStoryOwn:['選一張圖卡 → 口頭說出提示 → 確認出牌。','Choose a picture → say your clue aloud → confirm your card.'], phaseStoryWait:['聽 {name} 的口頭提示，等說書人確認出牌。','Listen to {name}’s spoken clue and wait for their card confirmation.'], phaseHostLobby:['玩家到齊後，選首位說書人並開始發牌。','When everyone is here, choose the first Storyteller and deal.'], phaseLobbyPlayer:['準備好後按「準備好了」，等待主持人開始。','Mark yourself ready, then wait for the host to start.'], phaseReady:['你已準備好，等待主持人發牌。','You are ready. Waiting for the host to deal.'], phaseAllVotesHost:['全員投票完成。按下揭曉，大家一起倒數。','All votes are in. Start the reveal for everyone.'], phaseAllVotesPlayer:['全員投票完成，等待主持人開始倒數。','All votes are in. Waiting for the host to start the countdown.'], phaseCountdown:['一起倒數，說書人的圖卡即將揭曉。','Count down together. The Storyteller’s picture is about to appear.'], phaseAnswerWait:['先看說書人的圖卡，接著揭曉所有得票圖卡。','Look at the Storyteller’s picture. All voted pictures are next.'], phaseNextHost:['結果已揭曉，準備好後開始下一輪。','The result is revealed. Start the next round when everyone is ready.'], phaseNextPlayer:['看看大家投了哪張牌，等待主持人開始下一輪。','See everyone’s guesses, then wait for the next round.'], phaseFinishedHost:['最高分獲勝。可以用原班人馬再玩一局。','The highest score wins. Play again with the same players.'], phaseFinishedPlayer:['最高分獲勝，等待主持人再開一局。','The highest score wins. Wait for the host to start another game.'], phaseCancelledHost:['可以用原班人馬重新開始。','You can start again with the same players.'], phaseCancelledPlayer:['等待主持人重新開始。','Wait for the host to start again.'],
    gameDetails:['玩家與分數','Players and scores'], roundSummary:['第 {n} 輪 · 說書人：{name}','Round {n} · Storyteller: {name}'], readyProgress:['已準備 {n}／{total} 人','Ready: {n} / {total}'], mostVoted:['最高票圖卡','Most-voted picture'], mostVotedTie:['並列最高票圖卡','Tied most-voted pictures'], allPlayed:['這輪所有圖卡','All pictures from this round'], revealFocus:['揭曉圖卡','Reveal pictures'], confirmYes:['確定','Confirm'], confirmNo:['返回遊戲','Keep playing'], hostControls:['主持操作','Host controls'],
    roundGain:['本輪得分','Round points'], pointsChange:['本輪得分','Round gain'],
    roundFound:['{n}／{total} 人猜中說書人的圖卡。','{n} of {total} found the Storyteller’s card.'],
    scoreStory:['部分人猜中你的牌','Some, not all, found your card'], scoreCorrect:['猜中說書人的牌','Correct guess'],
    scoreAll:['所有人都猜中','Everyone guessed right'], scoreNone:['沒有人猜中','Nobody guessed right'],
    scoreVoteOne:['你的牌得到 1 票','1 vote for your card'], scoreVoteMany:['你的牌得到 {n} 票','{n} votes for your card'],
    votedPictures:['得票圖卡','Voted pictures'], votedBy:['投票的人：{names}','Voted by: {names}'], showVoters:['看看誰投了這張','See who voted for this card'], noOtherVotes:['其他圖卡沒有得票。','No other pictures received votes.'],
    votingStatuses:['每位玩家的投票狀態','Each player’s voting status'], voteDone:['已投票','Voted'], voteWaiting:['尚未投票','Waiting for vote'], voteStoryteller:['說書人 · 不用投票','Storyteller · no vote required'], voteInactive:['本輪不參與投票','Sitting out this round'],
    submitStatuses:['每位玩家的出牌狀態','Each player’s card status'], submitDone:['已出牌','Card submitted'], submitWaiting:['尚未出牌','Choosing a card'], submitStoryteller:['說書人 · 已選好圖卡','Storyteller · card chosen'], submitInactive:['本輪不參與出牌','Sitting out this round'],
    winningScore:['勝利目標分數','Winning score'], scoreRange:['5–100 分；基本版為 30 分。','5–100 points; the base game uses 30.'],
  };
  if(typeof I18N!=='undefined')I18N.registerDict('dixit',Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,{zh:v[0],en:v[1]}])));
  const t=(k,vars={})=>(typeof I18N!=='undefined'?I18N.t('dixit',k):dict[k]?.[1]||k).replace(/\{(\w+)\}/g,(_,p)=>String(vars[p]??''));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=v=>Array.isArray(v)?v:Object.values(v||{});
  const name=(s,n)=>list(s.roster).find(p=>p.playerNum===n)?.name||'Player '+n;
  function picture(id,artworkVersion=2){
    const n=Number(String(id).slice(1))-1,sheet=Math.floor(n/12),slot=n%12;
    const deck=root.DIXIT_DECK,pool=deck?.version===1||artworkVersion===1?(deck?.legacyCards||deck?.cards):deck?.cards,card=pool?.[n],src=card?.image||'assets/dixit/atlas-'+(sheet+1)+'.webp';
    return {src,col:slot%4,row:Math.floor(slot/4),atlas:/atlas-\d+\.(png|webp)$/.test(src),alt:card?.description||t('card',{n:n+1})};
  }
  function art(id,artworkVersion=2,eager=false){const p=picture(id,artworkVersion);return p.atlas?'<span class="dx-art dx-art-atlas" role="img" aria-label="'+esc(p.alt)+'" style="background-image:url(&quot;'+esc(p.src)+'&quot;);background-position:'+(p.col*100/3)+'% '+(p.row*50)+'%"></span>':'<img class="dx-art" src="'+esc(p.src)+'" alt="'+esc(p.alt)+'" loading="'+(eager?'eager':'lazy')+'" decoding="async" width="768" height="1024">';}
  function cardHTML(id,n,{interactive=false,selected=false,disabled=false,own=false,answer=false,owner='',votes=null,votesHTML='',artworkVersion=2,eager=false}={}){
    const tag=interactive?'button':'div';
    return '<div class="dx-card-wrap" data-dx-picture="'+esc(id)+'">'+(owner?'<div class="dx-owner">'+esc(owner)+(votesHTML?' <span>· </span>'+votesHTML:votes!=null?' <span>· '+esc(t('votes',{n:votes}))+'</span>':'')+'</div>':'')+'<'+tag+' class="dx-picture'+(selected?' is-selected':'')+(answer?' is-answer':'')+'"'+(interactive?' type="button" data-dx-card="'+esc(id)+'" aria-label="'+esc(t('card',{n})+(own?' — '+t('ownCard'):''))+'" aria-pressed="'+selected+'"'+(disabled?' disabled':''):'')+'>'+art(id,artworkVersion,eager)+'<span class="dx-number">'+n+'</span>'+(own?'<span class="dx-own">'+esc(t('ownCard'))+'</span>':'')+'</'+tag+'></div>';
  }
  const btn=(type,label,disabled=false,secondary=false)=>'<button type="button" class="dx-button'+(secondary?' dx-secondary':'')+'" data-dx-action="'+type+'"'+(disabled?' disabled':'')+'>'+esc(t(label))+'</button>';
  function rulesHTML(s={}){const target=Number(s.targetScore)||30;return '<details class="dx-help" data-dx-rules><summary>'+esc(t('help'))+'</summary>'+['rule1','rule2','rule3','some','all','none','bonusRule','rule4',...(s.sharedControls===true?['ruleSharedRecovery']:[])].map(k=>'<p>'+esc(t(k,{n:target}))+'</p>').join('')+(target!==30?'<p class="dx-muted">'+esc(t('targetVariant'))+'</p>':'')+'<p class="dx-muted">'+esc(t('artNote'))+' <a href="https://www.libellud.com/game/dixit/" target="_blank" rel="noopener noreferrer">'+esc(t('sources'))+'</a></p></details>';}
  function choiceBar(a,selected,count){const type=a.story?'story':a.submit?'submit':a.vote?'vote':null;if(!type)return '';const total=type==='submit'?count:1;return '<div class="dx-choice-bar"><span>'+esc(t('selectCount',{n:selected.size,total}))+'</span>'+btn(type,type==='story'?'tell':type,selected.size!==total)+'</div>';}
  const hostTypes=['deal','reveal','advanceReveal','nextRound','cancel','restart','pause','resume','setTargetScore'];
  const clockNow=options=>typeof options.now==='function'?options.now():Number.isFinite(options.now)?options.now:Date.now();
  function revealVisual(s,now){
    if(s.phase!=='REVEALING')return s.phase;
    if(s.revealStage==='answer'&&s.answerCardId)return 'answer';
    if(s.paused&&Number(s.revealPausedAt)>0)now=Number(s.revealPausedAt);
    return 'countdown:'+Math.max(1,Math.min(3,Math.ceil((Number(s.revealAnswerAt)-now)/1000)||1));
  }
  function phaseInfo(s,{host=false,now=Date.now()}={}){
    const roster=list(s.roster).filter(p=>s.sharedControls!==true||list(s.roundPlayerNums).includes(p.playerNum)),others=roster.filter(p=>p.playerNum!==s.storyteller),mine=!host&&s.playerNum===s.storyteller,controls=host||s.hostControls===true;
    const submitted=others.filter(p=>p.submitted).length,voted=others.filter(p=>p.voted).length;
    let title='phase'+(s.phase==='LOBBY'?'Lobby':s.phase==='CLUE'?'Clue':s.phase==='SUBMIT'?'Submit':s.phase==='VOTE'?'Vote':s.phase==='REVEALING'?'Revealing':s.phase==='REVEAL'?'Reveal':s.phase==='FINISHED'?'Finished':'Cancelled'),instruction='',progress='';
    if(s.phase==='LOBBY'){instruction=t(controls?'phaseHostLobby':roster.find(p=>p.playerNum===s.playerNum)?.ready?'phaseReady':'phaseLobbyPlayer');progress=t('readyProgress',{n:roster.filter(p=>p.ready).length,total:roster.length});}
    if(s.phase==='CLUE')instruction=mine?t('phaseStoryOwn'):t('phaseStoryWait',{name:name(s,s.storyteller)});
    if(s.phase==='SUBMIT'){instruction=mine||host?t('waitingSubmit'):list(s.ownSubmitted).length?t('submitted'):t('submitHint',{n:Number(s.submitCount)||1});progress=t('progressSubmit',{n:submitted,total:others.length});}
    if(s.phase==='VOTE'){instruction=voted===others.length?t(controls?'phaseAllVotesHost':'phaseAllVotesPlayer'):mine?t('tellerVote'):host?t('waitingVotes'):s.ownVote?t('voted'):t('voteHint');progress=t('progressVote',{n:voted,total:others.length});}
    if(s.phase==='REVEALING'){const answer=revealVisual(s,now)==='answer';if(answer)title='phaseAnswer';instruction=t(answer?'phaseAnswerWait':'phaseCountdown');}
    if(s.phase==='REVEAL')instruction=t(controls?'phaseNextHost':'phaseNextPlayer');
    if(s.phase==='FINISHED')instruction=t(controls?'phaseFinishedHost':'phaseFinishedPlayer');
    if(s.phase==='CANCELLED')instruction=t(controls?'phaseCancelledHost':'phaseCancelledPlayer');
    return {title:t(title),instruction:s.paused?t('paused'):instruction,progress,submitted,voted,others};
  }
  function votedCards(s,answer){
    const rows=list(s.result?.rows),table=list(s.table).length?list(s.table):list(s.result?.table);
    const counts=table.map(id=>({id,count:rows.filter(p=>p.voteCardId===id).length}));
    // Keep every actual vote in view, including first-place ties. Equal counts
    // retain shuffled table order; the central answer is never repeated here.
    const ranked=counts.filter(p=>p.id!==answer&&p.count>0).sort((left,right)=>right.count-left.count);
    return {counts,ranked};
  }
  // Vote counts become a disclosure listing each voter. Ballots are only in
  // s.result after the full reveal, so this never exposes a secret vote.
  function votersHTML(s,id,slot){
    const names=list(s.result?.rows).filter(p=>p.voteCardId===id).map(p=>name(s,p.playerNum)),label=esc(t('votes',{n:names.length}));
    if(!names.length)return '<span class="dx-voters-count">'+label+'</span>';
    const key=esc(slot+':'+id);
    return '<span class="dx-voters" data-dx-voters="'+key+'"><button type="button" class="dx-voters-toggle" data-dx-voters-toggle="'+key+'" aria-expanded="false" title="'+esc(t('showVoters'))+'">'+label+'</button><span class="dx-voter-list" hidden>'+esc(t('votedBy',{names:names.join(', ')}))+'</span></span>';
  }
  function voteStatusesHTML(s){
    const voting=s.phase==='VOTE';
    if(!voting&&s.phase!=='SUBMIT')return '';
    const kind=voting?'vote':'submit',done=voting?'voted':'submitted';
    const labels=voting?{storyteller:'voteStoryteller',inactive:'voteInactive',[done]:'voteDone',waiting:'voteWaiting'}:{storyteller:'submitStoryteller',inactive:'submitInactive',[done]:'submitDone',waiting:'submitWaiting'};
    const roster=list(s.roster),eligible=new Set((s.sharedControls===true&&s.roundPlayerNums!=null?list(s.roundPlayerNums):roster.map(p=>p.playerNum)).map(Number));
    return '<div class="dx-vote-statuses" data-dx-'+kind+'-statuses role="list" aria-label="'+esc(t(voting?'votingStatuses':'submitStatuses'))+'">'+roster.map(p=>{
      const state=Number(p.playerNum)===Number(s.storyteller)?'storyteller':!eligible.has(Number(p.playerNum))?'inactive':p[done]?done:'waiting';
      return '<div class="dx-vote-status is-'+(state===done?'voted':state)+'" data-dx-'+kind+'-player="'+esc(p.playerNum)+'" data-dx-'+kind+'-state="'+state+'" role="listitem"><span class="dx-vote-name" title="'+esc(p.name)+'">'+esc(p.name)+'</span><span class="dx-vote-state">'+esc(t(labels[state]))+'</span></div>';
    }).join('')+'</div>';
  }
  function revealHTML(s,now){
    const visual=revealVisual(s,now),finished=['REVEAL','FINISHED'].includes(s.phase),answer=finished?s.result?.answerCardId:s.answerCardId,table=list(s.table).length?list(s.table):list(s.result?.table);
    if(visual.startsWith('countdown:'))return '<section class="dx-reveal-focus is-counting" data-dx-reveal-stage="countdown" aria-label="'+esc(t('revealFocus'))+'"><div class="dx-countdown" role="status" aria-live="polite"><span data-dx-countdown>'+visual.split(':')[1]+'</span><p>'+esc(t('phaseCountdown'))+'</p></div></section>';
    if(!answer)return '';
    const rows=list(s.result?.rows),voted=votedCards(s,answer),ownerFor=id=>{const owner=rows.find(p=>list(p.cardIds).includes(id));return owner?name(s,owner.playerNum):'';};
    const firstOwner=voted.ranked.length?'<div class="dx-owner">'+esc(ownerFor(voted.ranked[0].id))+'</div>':'';
    return '<section class="dx-reveal-focus" data-dx-reveal-stage="'+(finished?'popular':'answer')+'" aria-label="'+esc(t('revealFocus'))+'"><div class="dx-reveal-layout"><div class="dx-story-reveal"><div class="dx-reveal-heading"><h2>'+esc(t('answer'))+(finished?' '+votersHTML(s,answer,'answer'):'')+'</h2></div>'+cardHTML(answer,table.indexOf(answer)+1,{answer:true,artworkVersion:s.artworkVersion||1,eager:true})+'</div>'+(finished?'<div class="dx-popular-reveal"><div class="dx-reveal-heading"><h2>'+esc(t('votedPictures'))+(voted.ranked.length?' '+votersHTML(s,voted.ranked[0].id,'popular'):'')+'</h2>'+firstOwner+'</div><div class="dx-popular-gallery">'+(voted.ranked.length?voted.ranked.map(({id,count},i)=>cardHTML(id,table.indexOf(id)+1,{owner:i?ownerFor(id):'',votes:i?count:null,votesHTML:i?votersHTML(s,id,'popular'):'',artworkVersion:s.artworkVersion||1,eager:i===0})).join(''):'<p class="dx-secondary-note">'+esc(t('noOtherVotes'))+'</p>')+'</div></div>'+roundScoresHTML(s):'')+'</div></section>';
  }
  const gain=n=>'+'+Math.max(0,Number(n)||0);
  function roundScoresHTML(s){
    const rows=list(s.result?.rows).slice().sort((left,right)=>Number(right.playerNum===s.playerNum)-Number(left.playerNum===s.playerNum));
    const others=rows.filter(r=>r.playerNum!==s.storyteller),correct=others.filter(r=>r.correct||r.voteCardId===s.result?.answerCardId).length;
    return '<aside class="dx-round-scores" data-dx-round-scores aria-label="'+esc(t('roundGain'))+'"><div class="dx-reveal-heading"><h2>'+esc(t('roundGain'))+'</h2><p class="dx-score-outcome">'+esc(t('roundFound',{n:correct,total:others.length}))+'</p></div><div class="dx-score-changes">'+rows.map(r=>{
      const delta=Math.max(0,Number(r.delta)||0),reasons=[];
      if(delta>0&&Number(r.base)>0)reasons.push({label:t(r.playerNum===s.storyteller?'scoreStory':Number(r.base)===3?'scoreCorrect':correct===0?'scoreNone':'scoreAll'),points:r.base});
      if(delta>0&&Number(r.bonus)>0)reasons.push({label:t(Number(r.bonus)===1?'scoreVoteOne':'scoreVoteMany',{n:r.bonus}),points:r.bonus});
      return '<div class="dx-score-change'+(r.playerNum===s.playerNum?' is-me':'')+(delta===0?' is-zero':'')+'" data-dx-score-player="'+r.playerNum+'"><div class="dx-score-person"><strong class="dx-score-name">'+esc(name(s,r.playerNum))+'</strong><strong class="dx-score-gain" aria-label="'+esc(t('pointsChange'))+'">'+(delta?gain(delta):'0')+'</strong></div>'+reasons.map(reason=>'<div class="dx-score-reason"><span>'+esc(reason.label)+'</span><strong>'+gain(reason.points)+'</strong></div>').join('')+'</div>';
    }).join('')+'</div></aside>';
  }
  function tableHTML(payload,options={}){
    const s=payload.dixit||payload,host=!!options.host,controls=host||s.hostControls===true,a={...s.actions},selected=options.selected||new Set(),now=clockNow(options);
    if(host)for(const type of ['ready','story','submit','vote'])a[type]=false;
    if(!controls)for(const type of hostTypes)a[type]=false;
    const roster=list(s.roster),info=phaseInfo(s,{host,now}),{others,voted}=info;
    const finished=['REVEAL','FINISHED'].includes(s.phase),table=list(s.table),rows=list(s.result?.rows),count=Number(s.submitCount)||1;
    const scores='<div class="dx-scores">'+roster.map(p=>'<div class="dx-seat'+(p.playerNum===s.storyteller?' is-teller':'')+'"><span>'+esc(p.name)+(p.playerNum===s.storyteller?' ✦':'')+'</span><strong>'+Number(p.score||0)+'</strong><span class="dx-track"><i style="width:'+Math.min(100,(p.score||0)/(Number(s.targetScore)||30)*100)+'%"></i></span>'+(s.phase==='LOBBY'?'<small>'+esc(t(p.ready?'readyStatus':'notReady'))+'</small>':'')+'</div>').join('')+'</div>';
    let body='';
    if(s.phase==='LOBBY')body='<section class="dx-panel"><h2>'+esc(t('lobby'))+'</h2><p>'+esc(t('lobbyHint'))+'</p>'+(controls?'<div class="dx-lobby-target"><label>'+esc(t('winningScore'))+' <input type="number" data-dx-target-score min="5" max="100" step="1" inputmode="numeric" required value="'+(Number(s.targetScore)||30)+'" aria-label="'+esc(t('winningScore'))+'" aria-describedby="dx-lobby-target-hint"></label><p class="dx-muted" id="dx-lobby-target-hint">'+esc(t('scoreRange'))+'</p></div>':'')+'<div class="dx-actions">'+(controls?'<label>'+esc(t('first'))+' <select data-dx-first><option value="0">'+esc(t('random'))+'</option>'+roster.map(p=>'<option value="'+p.playerNum+'">'+esc(p.name)+'</option>').join('')+'</select></label>'+btn('deal','deal',!a.deal):'')+(!host&&a.ready?btn('ready',roster.find(p=>p.playerNum===s.playerNum)?.ready?'unready':'ready'): '')+'</div></section>';
    else if(s.phase==='CANCELLED')body='<section class="dx-panel"><h2>'+esc(t('cancelled'))+'</h2></section>';
    else{
      if(s.clueMode!=='spoken'&&s.clue)body='<blockquote class="dx-clue">'+esc(s.clue)+'</blockquote>';
      if(s.phase==='REVEALING'||finished)body+=revealHTML(s,now);
      let played='';
      if(table.length&&s.phase!=='REVEALING')played='<section class="dx-panel dx-card-panel"><h2>'+esc(t('table'))+'</h2>'+choiceBar({vote:a.vote},selected,count)+'<div class="dx-table">'+table.map((id,i)=>{
        const own=!host&&list(s.ownSubmitted).includes(id),owner=rows.find(p=>list(p.cardIds).includes(id));
        return cardHTML(id,i+1,{interactive:!!a.vote,selected:selected.has(id),disabled:own,own:own&&!finished,answer:finished&&s.result?.answerCardId===id,owner:finished&&owner?name(s,owner.playerNum):'',votes:finished?rows.filter(p=>p.voteCardId===id).length:null,votesHTML:finished?votersHTML(s,id,'gallery'):'',artworkVersion:s.artworkVersion||1});
      }).join('')+'</div>'+(!host&&s.phase==='VOTE'&&voted===others.length?'<p>'+esc(t('waitingReveal'))+'</p>':'')+'</section>';
      if(!finished)body+=played;
      if(finished&&s.result){
        const correct=rows.filter(p=>p.playerNum!==s.storyteller&&p.correct).length,branch=correct===0?'none':correct===others.length?'all':'some';
        const winners=list(s.winners);
        if(s.phase==='FINISHED')body+='<p class="dx-winner">'+esc(t(winners.length>1?'tie':'winner',{name:winners.map(n=>name(s,n)).join(', ')}))+'</p>';
        body+='<details class="dx-panel dx-result" data-dx-result-details><summary>'+esc(t('result'))+'</summary><p>'+esc(t(branch))+'</p><p class="dx-muted">'+esc(t('bonusRule'))+'</p><div class="dx-score-scroll"><table><thead><tr>'+['player','guess','base','bonus','total'].map(k=>'<th>'+esc(t(k))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th>'+esc(name(s,r.playerNum))+'</th><td>'+(r.playerNum===s.storyteller?'✦':r.voteCardId?'#'+(table.indexOf(r.voteCardId)+1)+(r.correct?' ✓':''):'—')+'</td><td>'+gain(r.base)+'</td><td>'+gain(r.bonus)+'</td><td><strong>'+Number(r.score||0)+'</strong> <small>('+gain(r.delta)+')</small></td></tr>').join('')+'</tbody></table></div></details>';
        if(played)body+='<details class="dx-round-gallery" data-dx-round-gallery><summary>'+esc(t('allPlayed'))+'</summary>'+played+'</details>';
      }
      if(!host&&list(s.hand).length&&!['REVEALING','REVEAL','FINISHED'].includes(s.phase)){
        const can=!!(a.story||a.submit);
        body+='<section class="dx-panel dx-hand"><h2>'+esc(t('hand'))+'</h2>'+choiceBar({story:a.story,submit:a.submit},selected,count)+(can?'<p class="dx-select-hint">'+esc(t('selectHint'))+'</p>':'')+'<div class="dx-hand-grid">'+list(s.hand).map((id,i)=>cardHTML(id,i+1,{interactive:can,selected:selected.has(id),artworkVersion:s.artworkVersion||1})).join('')+'</div></section>';
      }
    }
    const primary=controls&&s.phase==='VOTE'?btn('reveal','reveal',!a.reveal):a.nextRound?btn('nextRound','next'):'';
    const phase='<section class="dx-phase-bar'+(s.paused?' is-paused':'')+(s.phase==='VOTE'||s.phase==='SUBMIT'?' is-voting':'')+'" data-dx-phase="'+esc(s.phase)+'" aria-label="'+esc(t('currentStage'))+'"><div class="dx-phase-main"><span class="dx-phase-kicker">'+esc(t('currentStage'))+'</span><h2>'+esc(info.title)+'</h2><p class="dx-phase-instruction" role="status">'+esc(info.instruction)+'</p><span class="dx-connection" data-dx-connection role="status"></span></div><div class="dx-phase-progress">'+(info.progress?'<strong>'+esc(info.progress)+'</strong>':'')+primary+'</div>'+voteStatusesHTML(s)+'</section>';
    const confirmation=options.confirmation?'<div class="dx-confirm" role="alertdialog" aria-label="'+esc(t(options.confirmation==='cancel'?'confirmCancel':'confirmRestart'))+'"><p>'+esc(t(options.confirmation==='cancel'?'confirmCancel':'confirmRestart'))+'</p><div class="dx-actions"><button type="button" class="dx-button" data-dx-action="'+options.confirmation+'" data-dx-confirm="'+options.confirmation+'">'+esc(t('confirmYes'))+'</button><button type="button" class="dx-button dx-secondary" data-dx-dismiss-confirm>'+esc(t('confirmNo'))+'</button></div></div>':'';
    const details='<details class="dx-game-details" data-dx-details open><summary>'+esc(t('gameDetails'))+'</summary>'+scores+'<p class="dx-muted dx-goal">'+esc(t('scoreTarget',{n:Number(s.targetScore)||30}))+' · '+esc(t('deck',{n:s.deckCount??84}))+'</p></details>';
    return '<div class="dx-game'+(s.phase==='REVEALING'||finished?' is-reveal-phase':'')+'">'+phase+'<p class="dx-message" data-dx-message role="status"></p>'+ (s.roundNotice?.type==='round_skipped'?'<p class="dx-notice">'+esc(t('awayRound'))+'</p>':'')+body+details+(controls?'<div class="dx-host-controls" aria-label="'+esc(t('hostControls'))+'">'+(a.pause?btn('pause','pause',false,true):a.resume?btn('resume','resume',false,true):'')+(a.cancel?btn('cancel','cancel',false,true):'')+(a.restart?btn('restart','restart',false,true):'')+'</div>'+confirmation+(s.sharedControls===true?'':'<p class="dx-muted dx-keep-open">'+esc(t('keepOpen'))+'</p>'):'')+rulesHTML(s)+'</div>';
  }
  class Card{
    constructor(el,options={}){
      this.el=el;this.options=options;this.selected=new Set();this.payload=null;this.pending=null;this.pendingWaiting=false;this.error='';this.errorCode='';this.signature='';this.confirmation='';this.revealVisualSignature='';this.openVoters=new Set();this.revealSize=null;this.timer=setInterval(()=>this.paint(),200);
      this.click=e=>this.onClick(e);el.addEventListener('click',this.click);
    }
    update(payload){
      const previous=this.payload?.dixit,next=payload?.dixit;this.payload=payload;if(!next)return;
      const enteringReveal=next.phase==='REVEALING'&&previous?.phase!=='REVEALING';
      if(!previous||previous.sessionId!==next.sessionId||previous.turnId!==next.turnId){this.openVoters.clear();this.revealSize=null;this.selected.clear();this.error='';this.errorCode='';this.confirmation='';}
      if(next.phase==='REVEALING'&&previous?.phase!=='REVEALING')this.selected.clear();
      if(this.pending&&next.reply?.id===this.pending.id){this.errorCode=next.reply.error||'';this.error=this.errorCode?errorText(this.errorCode):'';this.pending=null;this.pendingWaiting=false;clearTimeout(this.pendingTimer);}
      else if(this.pending&&(this.pending.sessionId!==next.sessionId||this.pending.turnId!==next.turnId)){this.pending=null;this.pendingWaiting=false;clearTimeout(this.pendingTimer);}
      const request=payload.dixitAction;
      if(!this.pending&&!this.options.host&&Number(next.playerNum)>0&&typeof request?.id==='string'&&request.id&&request.id.length<=100&&
        request.sessionId===next.sessionId&&request.turnId===next.turnId&&next.reply?.id!==request.id&&Object.prototype.hasOwnProperty.call(next.actions||{},request.type)){
        this.pending={...request};this.pendingWaiting=true;this.error='';this.errorCode='';
      }
      const clean={...next};delete clean.revision;delete clean.hostLiveUntil;
      const signature=JSON.stringify(clean)+'|'+t('hand');if(signature!==this.signature){this.signature=signature;this.render();}else this.paint();
      if(enteringReveal)this.el.scrollIntoView?.({block:'start',behavior:'instant'});
    }
    blocked(){return !!this.pending||this.options.disabled?.()||this.options.connected?.()===false;}
    paint(){
      if(!this.payload)return;const s=this.payload.dixit,blocked=this.blocked(),now=clockNow(this.options),visual=revealVisual(s,now);
      if(visual!==this.revealVisualSignature){this.render();return;}
      const connection=this.el.querySelector('[data-dx-connection]');
      if(connection)connection.textContent=this.options.connected?.()===false?t('offline'):!this.options.host&&s.sharedControls!==true&&s.hostLiveUntil>0&&s.hostLiveUntil<clockNow(this.options)?t('hostAway'):'';
      if(this.errorCode)this.error=errorText(this.errorCode);
      const message=this.el.querySelector('[data-dx-message]');if(message)message.textContent=this.error||(this.pending?t(this.pendingWaiting?'pendingResume':'pending'):'');
      const bar=this.el.querySelector('[data-dx-phase]');if(bar?.getBoundingClientRect&&this.el.style?.setProperty)this.el.style.setProperty('--dx-phase-height',Math.ceil(bar.getBoundingClientRect().height)+'px');
      if(root.innerWidth>600&&this.el.style?.setProperty){
        const picture=this.el.querySelector('.dx-story-reveal .dx-picture');
        // Measure once per round and window size. Re-measuring from the live
        // viewport position made the picture grow and shrink while scrolling
        // or when an expanded voter list pushed it down.
        const viewport=root.innerWidth+'x'+root.innerHeight;
        if(picture?.getBoundingClientRect&&this.revealSize?.viewport!==viewport){
          const elTop=this.el.getBoundingClientRect?.().top||0,offset=Math.max(0,picture.getBoundingClientRect().top-Math.min(0,elTop));
          const available=Math.max(180,root.innerHeight-offset-25);this.revealSize={viewport,width:Math.floor(available*3/4)};
        }
        if(this.revealSize)this.el.style.setProperty('--dx-reveal-picture-width',this.revealSize.width+'px');
      }
      this.el.querySelectorAll('[data-dx-action],[data-dx-card],[data-dx-target-score]').forEach(b=>{if(blocked){if(!b.disabled)b.dataset.dxBlocked='1';b.disabled=true;}else if(b.dataset.dxBlocked){b.disabled=false;delete b.dataset.dxBlocked;}});
    }
    render(){
      if(!this.payload)return;
      const disclosures=['rules','details','result-details','round-gallery'].map(key=>[key,this.el.querySelector('[data-dx-'+key+']')?.open]);
      const s=this.payload.dixit,targetDraft=this.el.querySelector('[data-dx-target-score]')?.value;
      const retainTarget=s.phase==='LOBBY'&&this.renderedSessionId===s.sessionId&&this.renderedTargetScore===s.targetScore;
      this.renderedSessionId=s.sessionId;this.renderedTargetScore=s.targetScore;
      this.revealVisualSignature=revealVisual(this.payload.dixit,clockNow(this.options));
      this.el.innerHTML=tableHTML(this.payload,{...this.options,selected:this.selected,confirmation:this.confirmation});
      if(retainTarget&&targetDraft!=null){const input=this.el.querySelector('[data-dx-target-score]');if(input)input.value=targetDraft;}
      for(const [key,open] of disclosures)if(typeof open==='boolean'){const detail=this.el.querySelector('[data-dx-'+key+']');if(detail)detail.open=open;}
      if(this.openVoters.size)this.el.querySelectorAll('[data-dx-voters-toggle]').forEach(b=>{if(this.openVoters.has(b.dataset.dxVotersToggle))this.setVoters(b,true);});
      this.paint();
    }
    setVoters(button,open){
      button.setAttribute('aria-expanded',String(open));
      const names=button.nextElementSibling;if(names)names.hidden=!open;
    }
    async onClick(e){
      const voters=e.target.closest('[data-dx-voters-toggle]');
      if(voters){const key=voters.dataset.dxVotersToggle,open=!this.openVoters.has(key);if(open)this.openVoters.add(key);else this.openVoters.delete(key);this.setVoters(voters,open);return;}
      if(e.target.closest('[data-dx-dismiss-confirm]')){this.confirmation='';this.render();return;}
      const c=e.target.closest('[data-dx-card]');
      if(c&&!c.disabled&&!this.blocked()){
        const s=this.payload.dixit,id=c.dataset.dxCard,a=s.actions||{},max=a.story||a.vote?1:s.submitCount;
        if(this.options.host||!(a.story||a.submit||a.vote))return;
        if(a.vote?(!list(s.table).includes(id)||list(s.ownSubmitted).includes(id)):!list(s.hand).includes(id))return;
        if(this.selected.has(id))this.selected.delete(id);else{if(max===1)this.selected.clear();if(this.selected.size<max)this.selected.add(id);}
        this.render();return;
      }
      const b=e.target.closest('[data-dx-action]');if(!b||b.disabled||this.blocked())return;
      const type=b.dataset.dxAction,s=this.payload.dixit;if(!s.actions?.[type]||this.options.host&&['ready','story','submit','vote'].includes(type)||hostTypes.includes(type)&&!this.options.host&&s.hostControls!==true)return;
      if(['cancel','restart'].includes(type)&&!(b.dataset.dxConfirm===type&&this.confirmation===type)){this.confirmation=type;this.render();this.el.querySelector('[data-dx-confirm="'+type+'"]')?.focus();return;}
      this.confirmation='';
      let extra={};
      if(type==='deal'){
        const n=Number(this.el.querySelector('[data-dx-first]')?.value);if(n)extra.firstPlayerNum=n;
        const target=Number(this.el.querySelector('[data-dx-target-score]')?.value);
        if(!Number.isInteger(target)||target<5||target>100){this.errorCode='invalid_target_score';this.error=errorText(this.errorCode);this.paint();return;}
        extra.targetScore=target;
      }
      if(type==='ready')extra.value=!list(s.roster).find(p=>p.playerNum===s.playerNum)?.ready;
      if(type==='story'){if(this.selected.size!==1)return;extra={cardId:[...this.selected][0],clueMode:'spoken'};}
      if(type==='submit'){if(this.selected.size!==s.submitCount)return;extra.cardIds=[...this.selected];}
      if(type==='vote'){if(this.selected.size!==1)return;extra.cardId=[...this.selected][0];}
      const command={...extra,type,id:root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),sessionId:s.sessionId,turnId:s.turnId};
      this.pending=command;this.pendingWaiting=false;this.error='';this.errorCode='';this.paint();
      this.pendingTimer=setTimeout(()=>{if(this.pending?.id===command.id){this.pendingWaiting=true;this.paint();}},15000);
      try{await this.options.send(command);}catch(err){clearTimeout(this.pendingTimer);this.pending=null;this.pendingWaiting=false;this.errorCode=err.message;this.error=errorText(err.message);this.render();}
    }
    destroy(){clearInterval(this.timer);clearTimeout(this.pendingTimer);this.el.removeEventListener('click',this.click);}
  }
  function errorText(error){return error==='waiting_players'?t('awayPlayers'): ['stale_turn','stale_session'].includes(error)?t('stale'):error==='paused'?t('paused'):error==='invalid_clue'?t('refreshHost'):error==='invalid_target_score'?t('invalidTarget'):['offline','not_available'].includes(error)?t('failed'):t('invalid');}
  root.DIXIT_UI={Card,t,esc,tableHTML,cardHTML,rulesHTML,errorText,picture,phaseInfo,revealVisual};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.DIXIT_UI;
})(typeof globalThis!=='undefined'?globalThis:this);
