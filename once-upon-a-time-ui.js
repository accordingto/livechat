/* The Hub shell and I18N stay shared. Cards are presentation only; ONCE_ENGINE
 * alone decides rules. Player views contain only that seat's private cards. */
(function(root){
  'use strict';
  const dict={
    host:['共同畫面','Shared table'], story:['故事走到這裡','Story so far'], hand:['你的手牌','Your hand'],
    ending:['你的結局','Your ending'], private:['只在你的私人連結顯示','Only on your private card'],
    storyteller:['說故事的人：{name}','Storyteller: {name}'], yourTurn:['輪到你接著說故事。','Your turn to continue the story.'],
    theirTurn:['仔細聽故事；適合時可以用手牌打斷。','Listen for your cards. Interrupt when their elements are mentioned.'],
    sharedTurn:['大家一起延續同一個故事。','Keep one continuous story going.'],
    lobby:['準備一起說故事','Get ready to tell a story'], ready:['準備好了','Ready'], notReady:['尚未準備','Not ready'],
    unready:['取消準備','Not ready yet'], readyHint:['準備按鈕僅供參考；主持人可直接發牌開始。','Ready is optional. The host can deal cards and begin at any time.'],
    deal:['發牌','Deal cards'], first:['誰最像這張牌？','Who looks most like this card?'],
    firstHelp:['這張牌已公開丟棄。主持人選出最像這張牌的人，開始故事。','This card is revealed and discarded. The host chooses who looks most like it to begin.'],
    chooseFirst:['選為第一位說故事的人','Choose first Storyteller'], random:['改為隨機選人','Choose randomly instead'],
    waitingFirst:['等主持人選出第一位說故事的人。','Waiting for the host to choose the first Storyteller.'],
    play:['出牌','Play card'], interrupt:['打斷故事','Interrupt'], categoryInterrupt:['同類別打斷','Category interrupt'],
    interruptTag:['打斷牌','Interrupt card'], interruptConfirm:['用「{title}」打斷？','Interrupt with {title}?'],
    categoryConfirm:['用同類別打斷？這張牌的內容不必出現在故事中。','Take over with a matching category? This card’s element need not appear in the story.'],
    normalHelp:['目前說故事的人必須已經說出你這張牌的元素。由大家判斷是否有效。','The Storyteller must have mentioned your card’s element. Players judge whether it is valid.'],
    pass:['交棒','Pass'], passConfirm:['抽一張牌後，可以丟棄一張，也可以全部保留，再交給左邊的人。','Draw one card, optionally discard one, then pass the story to the player on your left.'],
    discard:['丟棄這張牌','Discard this card'], keep:['全部保留','Keep all cards'], discardHint:['你已抽一張牌。可丟棄一張手牌，或全部保留。','You have drawn one card. Discard one card or keep them all.'],
    waitingDiscard:['等說故事的人決定要丟棄或保留手牌。','Waiting for the Storyteller’s discard choice.'],
    challenge:['提出質疑','Challenge'], challengeConfirm:['讓大家口頭討論，是否需要換人說故事？','Discuss aloud: should the Storyteller lose the story?'],
    returnLatest:['這張牌沒有實際推進故事時，也將它退回手牌','Also return their latest card if it did not matter to the story'],
    dispute:['這次打斷有爭議','Dispute'], disputeConfirm:['請未直接參與的玩家判斷這次打斷是否有效。','Ask uninvolved players whether this interrupt was valid.'],
    tookOver:['{name} 用「{title}」接手故事。','{name} took over with {title}.'],
    continue:['繼續故事','Continue story'], continueHelp:['開始下一步後，這次打斷／同類別打斷機會會關閉。','The next story action closes the current interrupt opportunity.'],
    matchOpen:['剛出的是 {category} 牌。同類別的打斷牌現在可以接手。','Just played: {category}. Matching Interrupt cards may take over now.'],
    locked:['先出完所有故事牌','Play all Story Cards first'], readyEnd:['可以收尾了','Ready to end'], playEnding:['說出這個結局','Play ending'],
    endingConfirm:['用你的結局收尾？結局不能被打斷，由其他玩家判斷是否合理。','Finish with your ending? It cannot be interrupted; other players judge whether it fits.'],
    endQuestion:['這個結局能合理結束目前的故事嗎？','Does this ending sensibly finish the story?'],
    challengeQuestion:['說故事的人應該交棒嗎？','Should the Storyteller lose the story?'],
    disputeQuestion:['這次打斷有效嗎？','Was this interrupt valid?'],
    valid:['有效','Valid'], invalid:['無效','Invalid'], lose:['換人說故事','Storyteller loses the story'], keepStory:['繼續','Continue'],
    accept:['接受結局','Accept ending'], reject:['拒絕結局','Reject ending'], voteSent:['你已提交判斷。','Your vote is submitted.'],
    voteCount:['已提交 {n} / {total}','Submitted: {n} / {total}'], voteWaiting:['等未直接參與的玩家判斷。','Waiting for eligible players to decide.'],
    voteHint:['每人提交一次。只有達到全體合資格玩家的多數，才會判打斷無效、換人或拒絕結局。','Submit once. Invalid interrupts, successful challenges and rejected endings need a majority of eligible voters.'],
    social:['沒有未直接參與的玩家可以投票。請口頭達成共識，再由主持人確認。','There are no uninvolved voters. Agree aloud, then have the host confirm the group’s decision.'],
    finishVote:['結束判斷（未投者棄權）','Finish vote (missing votes abstain)'],
    finishConfirm:['未投者視為棄權。不足多數：打斷有效、質疑失敗、結局接受。','Missing votes abstain. Without a majority: the interrupt stands, the challenge fails, or the ending is accepted.'],
    winner:['{name} 完成了故事！','{name} finished the story!'], finished:['故事已結束','The story is complete'], cancelled:['已取消這局','Game cancelled'],
    restart:['原房間再玩一局','Another game in this room'], restartConfirm:['保留玩家，重新準備並洗牌？','Keep the players and prepare a fresh shuffled game?'],
    cancelGame:['取消這局','Cancel game'], cancelConfirm:['確定取消？不會判任何人獲勝。','Cancel this game? No winner will be declared.'],
    cardsCount:['{n} 張手牌','{n} cards'], deckCount:['牌庫 {n} · 棄牌 {d}','Deck {n} · Discard {d}'], noStory:['還沒有出牌。直接開口說故事，不用輸入文字。','No cards played yet. Tell the story aloud—no typing required.'],
    recent:['最新 {n} 張／共 {total} 張','Latest {n} of {total}'], earlier:['較早的 {n} 張牌','Earlier cards ({n})'],
    noHand:['故事手牌已全部出完。','You have played all your Story Cards.'], waitingDeal:['等主持人發牌。','Waiting for the host to deal.'],
    select:['選這張牌','Select card'], close:['關閉','Close'], cancel:['取消','Cancel'], confirm:['確認','Confirm'],
    help:['玩法／繁中說明','Rules / How to play'], log:['操作紀錄（不是故事逐字稿）','Action log (not a story transcript)'],
    ruleGoal:['出完手上的故事牌，再以自己的結局合理收尾，就獲勝。','Play every Story Card, then sensibly finish with your private Ending Card to win.'],
    ruleStory:['說故事的人可以自由說，並將真正重要的故事元素出成牌。','The Storyteller talks freely and plays cards whose elements really matter to the story.'],
    ruleNormal:['別人說到你的牌的元素時，可以用該牌打斷並接手；原說故事的人抽一張。只有有爭議時才投票。無效者丟棄打斷牌並抽兩張。','Interrupt when your card’s element is mentioned. The old Storyteller draws one card. Vote only if disputed; an invalid interrupter discards that card and draws two.'],
    ruleSpecial:['打斷牌也可當一般故事牌。別人實際出牌後，可用同類別打斷牌接手，牌上的元素不必被說出。不能接連用類別打斷打斷牌。','An Interrupt card also plays normally. After an actual card play, a matching-category Interrupt card can take over without its element being spoken. You cannot category-interrupt an interruption.'],
    rulePass:['交棒時抽一張，可選擇丟一張或全部保留，再交給左邊玩家。','Pass: draw one, optionally discard one, then hand the story to the player on your left.'],
    ruleChallenge:['質疑時口頭討論，由未直接參與的玩家判斷。成功則原說故事的人抽一張，交給左邊的人；失敗無懲罰。兩人局由口頭共識與主持確認。','Challenge: discuss aloud, then uninvolved players decide. Success makes the Storyteller draw one and pass left; failure has no penalty. With no uninvolved voter, agree aloud and the host confirms.'],
    ruleEnding:['手牌清空且輪到你才能出結局，不能被打斷。其他玩家過半拒絕才不成立；平票接受。拒絕後換結局、抽一張故事牌並交給左邊的人。','Only the current Storyteller with an empty hand can play an ending. It cannot be interrupted. A majority must reject it; ties accept. Rejection replaces the ending, draws one Story Card and passes left.'],
    ruleTrust:['用既有語音房聊天。網頁不聽錄音、不判語意；主持頁需要保持開啟。不要分享私人卡片畫面。','Use your existing voice room. The app does not record or judge speech. Keep the trusted host page open. Do not screen-share your private card.'],
    online:['已同步','Connected'], offline:['連線中斷，正在重連','Offline—reconnecting'], waitingHost:['等待主持頁重新連線','Waiting for the host page'],
    sending:['送出中…','Sending…'], retry:['重試這次操作','Retry this action'], pending:['仍在等待主持頁確認，可重試同一次操作。','Still waiting for the host. You can retry the same action.'],
    changed:['故事狀態已改變，請重新選擇操作。','The story has moved on. Choose your action again.'], unavailable:['目前不能執行這個操作。','This action is not available now.'],
    notYourTurn:['目前不是你說故事。','You are not the current Storyteller.'], invalidCard:['請選擇你仍持有的故事牌。','Select a Story Card still in your hand.'],
    emptyRequired:['必須先出完故事手牌才能說出結局。','Play every Story Card before your ending.'], badCategory:['必須使用剛出牌的同類別打斷牌。','Use an Interrupt card matching the latest played category.'],
    choosePlayer:['選一位玩家','Choose a player'], tableNeeded:['請先在首頁設定 2–6 人房間。','Set up a 2–6-player room in the Hub first.'],
    setup:['回首頁設定房間','Set up room in Hub'], openTable:['開啟這桌遊戲','Open this table'], hostHint:['沿用原玩家連結。主持若也參加，請用自己的玩家卡片操作。保持這頁開啟。','Use the existing player links. If you are playing too, use your own player card. Keep this page open.'],
    otherHost:['另一個主持分頁正在管理這桌。','Another host tab is managing this table.'], switched:['玩家卡片已切到其他遊戲。','Player cards have switched to another game.'],
    artNote:['通用分類插畫，尚非每張牌專屬插畫。','Shared category artwork; not unique illustrations for every card yet.']
  };
  if(typeof I18N!=='undefined')I18N.registerDict('once',Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,{zh:v[0],en:v[1]}])));
  function t(key,vars={}){let s=typeof I18N!=='undefined'?I18N.t('once',key):(dict[key]?.[1]||key);return s.replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=v=>Array.isArray(v)?v:Object.values(v||{});
  const deck=()=>root.ONCE_DECK||(typeof module==='object'&&module.exports?require('./once-upon-a-time-deck.js'):{});
  const paths={character:'M3 8l3 3 6-7 6 7 3-3-2 12H5L3 8zm2 15h14',thing:'M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 5 8-5M12 12v9',place:'M12 22s8-8 8-13a8 8 0 00-16 0c0 5 8 13 8 13zm0-10a3 3 0 100-6 3 3 0 000 6',aspect:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zm10 4a4 4 0 100-8 4 4 0 000 8',event:'M13 2L4 14h7l-1 8 10-13h-7l1-7'};
  const icon=cat=>'<svg viewBox="0 0 24 26" aria-hidden="true"><path d="'+paths[cat]+'"/></svg>';
  function category(cat){return list(deck().categories).find(c=>c.id===cat)||{label:cat||'Ending'};}
  function cardHTML(card,variant='mini',opts={}){
    if(!card)return '';
    // A refreshed player may receive a saved projection from an older host tab.
    // Prefer this release's artwork for the same immutable card ID.
    const current=deck().storyById?.[card.id]||deck().endingById?.[card.id];
    if(current)card={...card,imagePath:current.imagePath,thumbnailPath:current.thumbnailPath};
    const ending=!card.category,cat=ending?'ending':card.category,label=ending?'ENDING':category(cat).label;
    const tag=opts.interactive?'button':'article';
    const large=variant==='full',src=large?card.imagePath:card.thumbnailPath||card.imagePath;
    const sizes=large?'300px':variant==='ending'?'(max-width: 760px) 118px, 168px':variant==='history'?'(max-width: 760px) 80px, 168px':'(max-width: 760px) 96px, 122px';
    const responsive=card.thumbnailPath?' srcset="'+esc(card.thumbnailPath)+' 384w, '+esc(card.imagePath)+' 768w" sizes="'+sizes+'"':'';
    const imageAttrs=' src="'+esc(src)+'"'+responsive+' alt="" loading="'+(large?'eager':'lazy')+'" decoding="async"';
    return '<'+tag+(opts.interactive?' type="button" data-once-card="'+esc(card.id)+'" aria-label="'+esc(card.title||card.text)+'" aria-pressed="'+!!opts.selected+'"':'')+' class="once-card once-card--'+variant+' once-cat-'+esc(cat)+(opts.selected?' is-selected':'')+'"><span class="once-card-category">'+(ending?'<span aria-hidden="true">✦</span>':icon(cat))+esc(label)+'</span><span class="once-card-art"><img class="once-card-art-fill"'+imageAttrs+' aria-hidden="true"><img'+imageAttrs+'></span><span class="once-card-title">'+esc(card.title||card.text)+'</span>'+(card.isInterrupt?'<span class="once-interrupt-mark">'+esc(t('interruptTag'))+'</span>':'')+'</'+tag+'>';
  }
  function button(type,label,extra='',secondary=false,disabled=false){return '<button type="button" class="once-button'+(secondary?' once-button--secondary':'')+'" data-once-action="'+esc(type)+'" '+extra+(disabled?' disabled':'')+'>'+esc(t(label))+'</button>';}
  const player=(s,num)=>list(s.roster).find(p=>p.playerNum===num||p.id===num);
  const name=(s,num)=>player(s,num)?.name||'Player '+num;
  function rulesHTML(){return '<details class="once-help" data-once-detail="rules"><summary>'+esc(t('help'))+'</summary><p>'+esc(t('ruleGoal'))+'</p><div class="once-category-key">'+list(deck().categories).map(c=>'<span class="once-cat-'+esc(c.id)+'">'+icon(c.id)+esc(c.label)+'</span>').join('')+'</div>'+['ruleStory','ruleNormal','ruleSpecial','rulePass','ruleChallenge','ruleEnding','ruleTrust'].map(k=>'<p>'+esc(t(k))+'</p>').join('')+'</details>';}
  function voteHTML(s,host){
    if(!s.vote)return '';
    const v=s.vote,kind=v.kind,ending=kind==='ending',challenge=kind==='challenge';
    const options=ending?[['accept','accept'],['reject','reject']]:challenge?[['lose','lose'],['continue','keepStory']]:[['valid','valid'],['invalid','invalid']];
    const can=s.actions?.vote,received=Array.isArray(v.received)?v.received.length:Number(v.received||0);
    return '<section class="once-panel once-decision" aria-live="polite"><h2>'+esc(t(ending?'endQuestion':challenge?'challengeQuestion':'disputeQuestion'))+'</h2>'+(ending?'<p class="once-ending-review">'+esc((s.endingCard||v.endingCard)?.text||'')+'</p>':'')+(v.returnLatest?'<p class="once-muted">'+esc(t('returnLatest'))+'</p>':'')+
      (v.requiresSocial?'<p>'+esc(t('social'))+'</p>':'<p class="once-muted">'+esc(t('voteCount',{n:received,total:v.totalVoters??list(v.eligible).length}))+'</p><p class="once-muted">'+esc(t('voteHint'))+'</p>')+
      (can?'<div class="once-actions">'+options.map(([value,label])=>button('vote',label,'data-choice="'+value+'"',value==='invalid'||value==='reject'||value==='continue')).join('')+'</div>':!host?'<p>'+esc(t(v.ownChoice?'voteSent':'voteWaiting'))+'</p>':'')+
      (host&&s.actions?.resolveSocial?'<div class="once-actions">'+options.map(([value,label])=>button('resolveSocial',label,'data-choice="'+value+'"',value==='invalid'||value==='reject'||value==='continue')).join('')+'</div>':'')+
      (host&&s.actions?.finishVote?'<div class="once-actions">'+button('finishVote','finishVote','',true)+'</div>':'')+'</section>';
  }
  function tableHTML(payload,options={}){
    const s=payload?.once||payload,host=!!options.host,a=s.actions||{},hand=list(s.hand),who=name(s,s.storyteller);
    const roster='<div class="once-roster">'+list(s.roster).map(p=>'<span class="once-seat'+(s.storyteller===p.playerNum?' is-storyteller':'')+'"><strong>'+esc(p.name)+'</strong><span>'+esc(s.phase==='LOBBY'?t(p.ready?'ready':'notReady'):t('cardsCount',{n:p.handCount??0}))+'</span></span>').join('')+'</div>';
    let body='';
    if(s.phase==='LOBBY')body='<section class="once-panel"><h2>'+esc(t('lobby'))+'</h2>'+roster+'<p class="once-muted">'+esc(t('readyHint'))+'</p><div class="once-actions">'+(host?button('deal','deal','',false,!a.deal):a.ready?button('ready',player(s,s.playerNum)?.ready?'unready':'ready'):'')+'</div></section>';
    else if(s.phase==='CHOOSING_FIRST')body='<section class="once-panel once-first"><div><h2>'+esc(t('first'))+'</h2><p class="once-muted">'+esc(t('firstHelp'))+'</p>'+(host?'<label>'+esc(t('choosePlayer'))+'<select data-once-first-player>'+list(s.roster).map(p=>'<option value="'+p.playerNum+'">'+esc(p.name)+'</option>').join('')+'</select></label><div class="once-actions">'+button('chooseFirst','chooseFirst')+button('randomFirst','random','',true)+'</div>':'<p>'+esc(t('waitingFirst'))+'</p>')+'</div>'+cardHTML(s.starterCard,'history')+'</section>';
    else if(['FINISHED','CANCELLED'].includes(s.phase))body='<section class="once-panel once-winner"><h2>'+esc(s.winner?t('winner',{name:name(s,s.winner)}):t('cancelled'))+'</h2>'+(s.endingCard?'<p class="once-ending-review">'+esc(s.endingCard.text)+'</p>':'')+(host?'<div class="once-actions">'+button('restart','restart')+'</div>':'')+'</section>';
    else body='<section class="once-storyteller'+(s.storyteller===s.playerNum?' is-mine':'')+'"><div><p class="once-kicker">'+esc(t('storyteller',{name:who}))+'</p><h2>'+esc(t(host?'sharedTurn':s.storyteller===s.playerNum?'yourTurn':'theirTurn'))+'</h2></div></section>'+roster+voteHTML(s,host);
    if(s.phase==='PASS_DISCARD')body+='<p class="once-notice">'+esc(t(s.storyteller===s.playerNum?'discardHint':'waitingDiscard'))+'</p>';
    if(s.interrupt&&s.phase==='STORYTELLING')body+='<div class="once-notice once-interrupt-notice"><span>'+esc(t('tookOver',{name:name(s,s.interrupt.interrupter),title:s.interrupt.card?.title||deck().storyById?.[s.interrupt.cardId]?.title||s.interrupt.cardId}))+'</span>'+(a.dispute?button('dispute','dispute','',true):'')+'</div>';
    if(s.categoryOpportunity&&s.phase==='STORYTELLING')body+='<p class="once-muted once-opportunity">'+esc(t('matchOpen',{category:category(s.categoryOpportunity.category).label}))+'</p>';
    const history=list(s.history),offset=Math.max(0,history.length-4);
    const historyItem=(event,i)=>'<div class="once-history-item"><span class="once-history-number">'+(i+1)+' · '+esc(name(s,event.playerNum??event.actor))+'</span>'+cardHTML(event.card||deck().storyById?.[event.cardId],'history')+(event.mode==='category'?'<small>'+esc(t('categoryInterrupt'))+'</small>':'')+'</div>';
    body+='<div class="once-table-grid"><section class="once-panel once-history-panel"><div class="once-section-heading"><h2>'+esc(t('story'))+'</h2><span class="once-muted">'+esc(t('recent',{n:Math.min(4,history.length),total:history.length}))+'</span></div><div class="once-history once-history-latest" aria-label="'+esc(t('story'))+'">'+(history.length?history.slice(offset).map((event,i)=>historyItem(event,offset+i)).join(''):'<p class="once-empty">'+esc(t('noStory'))+'</p>')+'</div>'+(offset?'<details class="once-history-archive" data-once-detail="history"><summary>'+esc(t('earlier',{n:offset}))+'</summary><div class="once-history">'+history.slice(0,offset).map(historyItem).join('')+'</div></details>':'')+'<span class="once-deck-count once-muted">'+esc(t('deckCount',{n:s.deckCounts?.story??0,d:s.deckCounts?.storyDiscard??0}))+'</span></section></div>';
    if(!host&&s.phase!=='LOBBY'){
      const selected=hand.find(c=>c.id===options.selectedId);
      const selectedEnding=!!s.ending&&s.ending.id===options.selectedId;
      const categoryOK=selected?.isInterrupt&&s.categoryOpportunity?.category===selected.category;
      const endingAction=selectedEnding||a.ending;
      body+='<section class="once-panel once-hand-panel"><div class="once-section-heading"><h2>'+esc(t('hand'))+'</h2><span class="once-muted">'+hand.length+'</span></div><div class="once-hand-layout"'+(s.ending?' data-has-ending':'')+'><div class="once-carousel once-hand" aria-label="'+esc(t('hand'))+'">'+(hand.length?hand.map(card=>cardHTML(card,'mini',{interactive:true,selected:card.id===options.selectedId})).join(''):'<p class="once-empty">'+esc(t(['CHOOSING_FIRST','LOBBY'].includes(s.phase)?'waitingDeal':'noHand'))+'</p>')+'</div>'+(s.ending?'<aside class="once-ending-dock"><span class="once-ending-state">'+esc(t(hand.length?'locked':'readyEnd'))+'</span>'+cardHTML(s.ending,'ending',{interactive:true,selected:selectedEnding})+'</aside>':'')+'</div><div class="once-actions once-hand-actions">'+
        (a.play||a.ending?button(endingAction?'ending':'play',endingAction?'playEnding':'play','',false,endingAction?!a.ending||!selectedEnding:!selected):'')+(a.interrupt?button('interrupt','interrupt','data-mode="normal"',false,!selected):'')+(a.categoryInterrupt&&categoryOK?button('interrupt','categoryInterrupt','data-mode="category"',true):'')+
        (a.discard?button('discard','discard','',false,!selected):'')+(a.keepAll?button('keepAll','keep','',true):'')+(a.pass?button('pass','pass','',true):'')+(a.challenge?button('challenge','challenge','',true):'')+(a.continueStory&&(s.interrupt||s.categoryOpportunity)?button('continueStory','continue','',true):'')+'</div></section>';
    }
    if(host&&a.cancel)body+='<div class="once-host-tools">'+button('cancel','cancelGame','',true)+'</div>';
    return '<div class="once-game once-game--compact"><header class="once-game-header"><div><p class="once-kicker">Ice Breaking Hub</p><h1>Once Upon a Time</h1></div><div class="once-player-meta"><strong>'+esc(host?t('host'):payload.name||name(s,s.playerNum))+'</strong><span class="once-connection" role="status">'+esc(t('online'))+'</span></div></header><div class="once-request-status" aria-live="polite"></div>'+body+rulesHTML()+'<details class="once-help" data-once-detail="log"><summary>'+esc(t('log'))+'</summary><ol class="once-log">'+list(s.log).slice(-12).map(item=>'<li>'+esc(typeof item==='string'?item:item.text||'')+'</li>').join('')+'</ol></details></div>';
  }
  function errorText(code){
    if(/offline|network/.test(code))return t('offline');
    if(/stale|turn|session|opportunity/.test(code))return t('changed');
    if(/ending_locked|hand_not_empty|cards_remaining/.test(code))return t('emptyRequired');
    if(/category|not_interrupt/.test(code))return t('badCategory');
    if(/card|not_in_hand/.test(code))return t('invalidCard');
    return t('unavailable');
  }
  class Card{
    constructor(el,options={}){
      this.el=el;this.options=options;this.selectedId=null;this.preview=null;this.confirm=null;this.pending=null;this.error='';this.data=null;
      this.clickHandler=e=>this.click(e);this.keyHandler=e=>{if(e.key==='Escape'&&(this.preview||this.confirm)){this.preview=null;this.confirm=null;this.render();}};
      el.addEventListener('click',this.clickHandler);el.addEventListener('keydown',this.keyHandler);
      this.timer=setInterval(()=>this.paint(),1000);
    }
    update(data){
      const old=this.data?.once,next=data.once;
      if(old?.sessionId!==next.sessionId){this.selectedId=null;this.preview=null;this.confirm=null;this.pending=null;this.error='';}
      if(this.confirm&&old?.turnId!==next.turnId){this.confirm=null;this.error=t('changed');}
      this.data=data;
      if(this.selectedId&&!list(next.hand).some(c=>c.id===this.selectedId)&&next.ending?.id!==this.selectedId)this.selectedId=null;
      if(this.preview&&!list(next.hand).some(c=>c.id===this.preview.id)&&next.ending?.id!==this.preview.id)this.preview=null;
      if(this.pending&&next.reply?.id===this.pending.command.id){this.error=next.reply.error?errorText(next.reply.error):'';this.pending=null;}
      this.render();
    }
    render(){
      if(!this.data)return;
      const scrolls=Array.from(this.el.querySelectorAll('.once-carousel')).map(x=>x.scrollLeft);
      const openDetails=Array.from(this.el.querySelectorAll('[data-once-detail][open]')).map(x=>x.dataset.onceDetail);
      const firstPlayer=this.el.querySelector('[data-once-first-player]')?.value;
      if(this.confirm)this.confirm.returnLatest=this.el.querySelector('[data-once-return-latest]')?.checked??this.confirm.returnLatest;
      this.el.innerHTML=tableHTML(this.data,{host:this.options.host,selectedId:this.selectedId});
      this.el.querySelectorAll('.once-carousel').forEach((x,i)=>{x.scrollLeft=scrolls[i]||0;});
      this.el.querySelectorAll('[data-once-detail]').forEach(x=>{x.open=openDetails.includes(x.dataset.onceDetail);});
      const firstSelect=this.el.querySelector('[data-once-first-player]');if(firstSelect&&firstPlayer)firstSelect.value=firstPlayer;
      if(this.confirm)this.el.insertAdjacentHTML('beforeend','<div class="once-modal-backdrop"><section class="once-modal once-confirm" role="dialog" aria-modal="true" aria-label="'+esc(t('confirm'))+'"><h2>'+esc(this.confirm.text)+'</h2>'+(this.confirm.type==='interrupt'&&this.confirm.extra.mode==='normal'?'<p>'+esc(t('normalHelp'))+'</p>':'')+(this.confirm.type==='challenge'&&this.data.once.returnableCard?'<label class="once-check"><input type="checkbox" data-once-return-latest'+(this.confirm.returnLatest?' checked':'')+'> '+esc(t('returnLatest'))+' <strong>'+esc(this.data.once.returnableCard.title)+'</strong></label>':'')+'<div class="once-actions">'+button('confirm','confirm')+button('closeConfirm','cancel','',true)+'</div></section></div>');
      if(this.pending)this.el.querySelectorAll('[data-once-card],[data-once-action]:not([data-once-action="closeConfirm"])').forEach(b=>b.disabled=true);
      if(this.options.disabled?.())this.el.querySelectorAll('[data-once-action],[data-once-card]').forEach(b=>b.disabled=true);
      this.paint();
      if(this.preview||this.confirm){const modal=this.el.querySelector('.once-modal');modal?.querySelector('button')?.focus();}
    }
    paint(){
      if(!this.data)return;
      const now=this.options.now?.()||Date.now(),s=this.data.once,online=this.options.connected?.()!==false;
      const alive=!s.hostLiveUntil||s.hostLiveUntil>now;
      const status=this.el.querySelector('.once-connection');if(status){status.textContent=t(!online?'offline':!alive?'waitingHost':'online');status.classList.toggle('is-offline',!online||!alive);}
      const node=this.el.querySelector('.once-request-status');if(!node)return;
      if(this.pending){const wait=now-this.pending.at>6500;node.innerHTML='<p>'+esc(t(wait?'pending':'sending'))+'</p>'+(wait?button('retry','retry','',true):'');}
      else node.textContent=this.error;
    }
    async send(type,extra={},captured){
      if(this.pending)return;
      const s=this.data.once,command={...extra,id:root.crypto.randomUUID(),type,sessionId:s.sessionId,turnId:s.turnId,...captured};
      this.pending={command,at:this.options.now?.()||Date.now()};this.error='';this.preview=null;this.confirm=null;this.render();
      try{await this.options.send(command);}catch(e){if(this.pending?.command.id===command.id){this.pending=null;this.error=errorText(e.message);this.render();}}
    }
    async retry(){if(!this.pending)return;try{await this.options.send(this.pending.command);this.pending.at=this.options.now?.()||Date.now();this.paint();}catch(e){this.error=errorText(e.message);this.pending=null;this.render();}}
    click(event){
      const card=event.target.closest('[data-once-card]');
      if(card&&this.el.contains(card)){
        if(this.options.host||this.pending||this.confirm||this.options.disabled?.())return;
        const s=this.data.once,id=card.dataset.onceCard;
        if(!list(s.hand).some(c=>c.id===id)&&s.ending?.id!==id)return;
        this.selectedId=id;this.preview=null;this.error='';this.render();
        this.el.querySelectorAll('[data-once-card]').forEach(node=>{if(node.dataset.onceCard===id)node.focus?.({preventScroll:true});});return;
      }
      const b=event.target.closest('[data-once-action]');if(!b||!this.el.contains(b)||b.disabled)return;
      const type=b.dataset.onceAction,s=this.data.once;
      if(b.classList.contains('once-modal-backdrop')&&event.target!==b)return;
      if(type==='closePreview'){this.preview=null;this.render();return;}
      if(type==='closeConfirm'){this.confirm=null;this.render();return;}
      if(type==='retry'){this.retry();return;}
      if(type==='confirm'){
        const c=this.confirm;if(!c)return;const extra={...c.extra};if(c.type==='challenge')extra.returnLatest=!!this.el.querySelector('[data-once-return-latest]')?.checked;
        this.send(c.type,extra,c.captured);return;
      }
      if(type==='ready'){this.send(type,{value:!player(s,s.playerNum)?.ready});return;}
      if(type==='chooseFirst'){this.send(type,{playerNum:Number(this.el.querySelector('[data-once-first-player]').value)});return;}
      if(type==='vote'||type==='resolveSocial'){this.send(type,{voteId:s.vote.id,choice:b.dataset.choice});return;}
      if(type==='play'||type==='discard'){if(this.selectedId)this.send(type,{cardId:this.selectedId});return;}
      if(type==='ending'&&(!s.actions?.ending||s.ending?.id!==this.selectedId))return;
      const extra=type==='interrupt'?{cardId:this.selectedId,mode:b.dataset.mode||'normal',...(s.categoryOpportunity?{opportunityId:s.categoryOpportunity.id}:{})}:type==='dispute'?{interruptId:s.interrupt?.id}:type==='finishVote'?{voteId:s.vote?.id}:{};
      const texts={interrupt:extra.mode==='category'?t('categoryConfirm'):t('interruptConfirm',{title:list(s.hand).find(c=>c.id===this.selectedId)?.title||''}),pass:t('passConfirm'),challenge:t('challengeConfirm'),dispute:t('disputeConfirm'),ending:t('endingConfirm'),cancel:t('cancelConfirm'),restart:t('restartConfirm'),finishVote:t('finishConfirm')};
      if(texts[type]){this.confirm={type,extra,text:texts[type],captured:{sessionId:s.sessionId,turnId:s.turnId}};this.render();return;}
      this.send(type,extra);
    }
    destroy(){clearInterval(this.timer);this.el.removeEventListener('click',this.clickHandler);this.el.removeEventListener('keydown',this.keyHandler);this.el.innerHTML='';}
  }
  const api={Card,cardHTML,tableHTML,rulesHTML,t,esc,errorText};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ONCE_UI=api;
})(typeof globalThis==='object'?globalThis:this);
