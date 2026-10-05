/* Original picture cards with the current Dixit base-game rules. Both the
 * shared table and existing Hub player links use this same filtered renderer. */
(function(root){
  'use strict';
  const dict={
    subtitle:['妙語說書人','Picture storytelling'], round:['第 {n} 輪','Round {n}'], storyteller:['說書人：{name}','Storyteller: {name}'],
    yourTurn:['輪到你當說書人','You are the Storyteller'], waitingClue:['等 {name} 選牌並給提示。','Wait for {name} to choose a card and give a clue.'],
    storyHint:['選一張圖卡，給一句有點神秘的提示。讓部分人猜中，卻不要讓所有人都猜中。','Choose one picture and give a clue. Aim for some people to guess it, but not everyone.'],
    clueLabel:['你的提示','Your clue'], cluePlaceholder:['一個詞、一句話，或一段故事…','A word, a phrase, or a short story…'], spoken:['我用歌聲、聲音或動作給提示','My clue is a song, sound, or gesture'], spokenClue:['口頭／聲音／動作提示','Spoken / sound / gesture clue'],
    tell:['確認圖卡與提示','Send card and clue'], submit:['秘密出牌','Submit secretly'], submitHint:['從手牌選 {n} 張最符合提示的圖卡，試著讓別人投給你。','Choose {n} picture card(s) that fit the clue. Try to attract other players’ votes.'],
    submitted:['已秘密出牌。等其他玩家選牌。','Cards submitted. Waiting for the other players.'], voteHint:['猜哪張是說書人的圖卡。不能投自己出的牌。','Which card belongs to the Storyteller? You cannot vote for your own cards.'],
    vote:['秘密投票','Vote secretly'], voted:['已投票，揭曉前不會公開你的選擇。','Vote submitted. Your choice stays secret until the reveal.'], tellerVote:['說書人不投票。等其他玩家猜你的圖卡。','The Storyteller does not vote. Wait for everyone to guess your card.'],
    ownCard:['你的圖卡，不能投票','Your card — you cannot vote for it'], hand:['你的手牌','Your hand'], table:['展示的圖卡','Revealed picture cards'],
    selectCount:['已選 {n}／{total} 張','Selected {n} / {total}'], ready:['準備好了','Ready'], unready:['取消準備','Not ready'], readyStatus:['已準備','Ready'], notReady:['等待準備','Not ready'],
    deal:['發牌並開始','Deal and start'], first:['首位說書人','First Storyteller'], random:['隨機','Random'], lobby:['每人打開自己的玩家卡片','Open your own player card'],
    lobbyHint:['使用首頁原本的玩家連結。主持人若也玩，請從自己的玩家卡片選牌與投票。','Use your existing Hub player links. Hosts who are playing use their own player card to choose cards and vote.'],
    shared:['共同牌桌','Shared table'], private:['{name} 的私人手牌','{name}’s private hand'], open:['開啟這桌遊戲','Open this table'], setup:['回首頁設定房間','Set up room in Hub'],
    setupHint:['請先在首頁設定 3–8 人房間。','Set up a 3–8-player room in the Hub first.'], keepOpen:['保持主持頁開啟，玩家卡片才會持續同步。','Keep this host page open so player cards stay in sync.'],
    reveal:['揭曉並計分','Reveal and score'], next:['補牌，下一輪','Refill and start next round'], pause:['暫停','Pause'], resume:['繼續','Resume'], paused:['遊戲已暫停','Game paused'], cancel:['結束這局','Cancel game'], restart:['原班人馬再玩一局','Play again with the same players'],
    confirmCancel:['確定結束這局？這局不會產生勝者。','Cancel this game? This game will have no winner.'], confirmRestart:['重新發牌並清除這局分數？','Deal again and clear this game’s scores?'],
    progressSubmit:['已出牌 {n}／{total} 人','Cards submitted: {n} / {total}'], progressVote:['已投票 {n}／{total} 人','Votes received: {n} / {total}'],
    waitingReveal:['全員投票完成，等主持人揭曉。','All votes are in. Waiting for the host to reveal.'], waitingSubmit:['其他玩家正在秘密選牌。','Other players are choosing their cards secretly.'],
    result:['這輪結果','Round result'], all:['所有人都猜對：說書人 0 分，其他人各 2 分。','Everyone guessed correctly: Storyteller 0, everyone else +2.'], none:['沒有人猜對：說書人 0 分，其他人各 2 分。','Nobody guessed correctly: Storyteller 0, everyone else +2.'], some:['部分人猜對：說書人與猜中者各 3 分。','Some guessed correctly: Storyteller and correct guesses +3.'],
    bonusRule:['你的圖卡每被投一票，再得 1 分。','Each vote on your own card adds 1 bonus point.'], player:['玩家','Player'], guess:['投票','Vote'], base:['猜牌得分','Base'], bonus:['吸票加分','Bonus'], total:['總分','Total'], votes:['{n} 票','{n} vote(s)'], winner:['勝者：{name}','Winner: {name}'], tie:['並列勝者：{name}','Shared winners: {name}'], cancelled:['這局已取消','Game cancelled'],
    help:['玩法與計分','Rules and scoring'], rule1:['3–8 人，每人 6 張圖卡。三人局每人 7 張，非說書人每輪各出 2 張。','3–8 players; 6 cards each. With 3 players, deal 7 each and each non-Storyteller submits 2 cards.'],
    rule2:['說書人秘密選 1 張，用詞語、句子、歌聲或動作給提示。其他人秘密選符合提示的牌；全部洗勻再編號展示。','The Storyteller secretly picks 1 card and gives a word, phrase, song, or gesture. Others submit matching cards secretly. All cards are shuffled and numbered.'],
    rule3:['非說書人各秘密投 1 票，不能投自己的牌。全員投完才揭曉圖卡主人、選票和分數。','Each non-Storyteller votes once, secretly, never for their own card. Owners, votes, and points are revealed only after everyone votes.'],
    rule4:['用過的牌棄掉，補滿手牌，由下一位接任說書人。牌庫不足時重洗棄牌。有人在輪末達到 30 分即結束，最高分獲勝，同分並列。','Discard played cards, refill hands, and pass the Storyteller role to the next player. Reshuffle discards when needed. End after a round with a score of 30 or more. Highest score wins; ties share the win.'],
    artNote:['84 張原創插畫；玩法依據 Dixit 現行基本版。這是非官方改編，卡面不是原版圖卡。','84 original illustrations using the current Dixit base-game rules. An unofficial adaptation; the art is independently created.'],
    sources:['官方規則','Official rules'], enlarge:['放大圖卡 {n}','Enlarge card {n}'], close:['關閉','Close'], card:['圖卡 {n}','Card {n}'], answer:['說書人的圖卡','The Storyteller’s card'],
    scoreTarget:['先到 30 分，最高分獲勝','Reach 30; highest score wins'], deck:['牌庫：{n} 張','Draw pile: {n}'],
    offline:['暫時離線，操作已停用。','Connection lost. Actions are paused.'], hostAway:['主持頁未連線，請主持人重新開啟。','The host page is offline. Ask the host to reopen it.'], otherHost:['另一個主持分頁正在管理。','Another host tab is managing this table.'], switched:['玩家卡片已切到其他遊戲。','Player cards have switched to another game.'],
    pending:['已送出，等待同步…','Sent. Waiting for confirmation…'], failed:['無法送出，請確認連線後重試。','Could not send. Check your connection and try again.'], stale:['牌局已更新，請重新選擇。','The game has moved on. Please choose again.'], invalid:['這個階段不能這樣操作，請重新選擇。','That action is not available now. Please choose again.'],
    demo:['單機示範：模擬玩家，沒有房間同步','LOCAL DEMO — synthetic players; no room connection'], view:['視角','View'], real:['使用真正的 Hub 房間','Use a real Hub room'],
  };
  if(typeof I18N!=='undefined')I18N.registerDict('dixit',Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,{zh:v[0],en:v[1]}])));
  const t=(k,vars={})=>(typeof I18N!=='undefined'?I18N.t('dixit',k):dict[k]?.[1]||k).replace(/\{(\w+)\}/g,(_,p)=>String(vars[p]??''));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=v=>Array.isArray(v)?v:Object.values(v||{});
  const name=(s,n)=>list(s.roster).find(p=>p.playerNum===n)?.name||'Player '+n;
  function picture(id){
    const n=Number(String(id).slice(1))-1,sheet=Math.floor(n/12),slot=n%12;
    const card=root.DIXIT_DECK?.cards?.[n];
    return {src:card?.image||'assets/dixit/atlas-'+(sheet+1)+'.webp',col:slot%4,row:Math.floor(slot/4),alt:card?.description||t('card',{n:n+1})};
  }
  function art(id){const p=picture(id);return '<span class="dx-art" role="img" aria-label="'+esc(p.alt)+'" style="background-image:url(&quot;'+esc(p.src)+'&quot;);background-position:'+(p.col*100/3)+'% '+(p.row*50)+'%"></span>';}
  function cardHTML(id,n,{interactive=false,selected=false,disabled=false,own=false,answer=false,owner='',votes=null}={}){
    const tag=interactive?'button':'div';
    return '<div class="dx-card-wrap"><'+tag+' class="dx-picture'+(selected?' is-selected':'')+(answer?' is-answer':'')+'"'+(interactive?' type="button" data-dx-card="'+esc(id)+'" aria-label="'+esc(t('card',{n})+(own?' — '+t('ownCard'):''))+'" aria-pressed="'+selected+'"'+(disabled?' disabled':''):'')+'>'+art(id)+'<span class="dx-number">'+n+'</span>'+(own?'<span class="dx-own">'+esc(t('ownCard'))+'</span>':'')+(answer?'<span class="dx-answer">'+esc(t('answer'))+'</span>':'')+'</'+tag+'><button type="button" class="dx-zoom" data-dx-zoom="'+esc(id)+'" aria-label="'+esc(t('enlarge',{n}))+'">⤢</button>'+(owner?'<div class="dx-owner">'+esc(owner)+(votes!=null?' · '+esc(t('votes',{n:votes})): '')+'</div>':'')+'</div>';
  }
  const btn=(type,label,disabled=false,secondary=false)=>'<button type="button" class="dx-button'+(secondary?' dx-secondary':'')+'" data-dx-action="'+type+'"'+(disabled?' disabled':'')+'>'+esc(t(label))+'</button>';
  function rulesHTML(){return '<details class="dx-help" data-dx-rules><summary>'+esc(t('help'))+'</summary>'+['rule1','rule2','rule3','some','all','none','bonusRule','rule4'].map(k=>'<p>'+esc(t(k))+'</p>').join('')+'<p class="dx-muted">'+esc(t('artNote'))+' <a href="https://www.libellud.com/game/dixit/" target="_blank" rel="noopener noreferrer">'+esc(t('sources'))+'</a></p></details>';}
  function tableHTML(payload,options={}){
    const s=payload.dixit||payload,host=!!options.host,a=host?{...s.actions,ready:false,story:false,submit:false,vote:false}:s.actions||{},selected=options.selected||new Set(),mine=s.playerNum===s.storyteller;
    const roster=list(s.roster),others=roster.filter(p=>p.playerNum!==s.storyteller),submitted=others.filter(p=>p.submitted).length,voted=others.filter(p=>p.voted).length;
    const finished=['REVEAL','FINISHED'].includes(s.phase),table=list(s.table),rows=list(s.result?.rows),count=Number(s.submitCount)||1;
    const scores='<div class="dx-scores">'+roster.map(p=>'<div class="dx-seat'+(p.playerNum===s.storyteller?' is-teller':'')+'"><span>'+esc(p.name)+(p.playerNum===s.storyteller?' ✦':'')+'</span><strong>'+Number(p.score||0)+'</strong><span class="dx-track"><i style="width:'+Math.min(100,(p.score||0)/30*100)+'%"></i></span>'+(s.phase==='LOBBY'?'<small>'+esc(t(p.ready?'readyStatus':'notReady'))+'</small>':'')+'</div>').join('')+'</div>';
    let body='';
    if(s.phase==='LOBBY')body='<section class="dx-panel"><h2>'+esc(t('lobby'))+'</h2><p>'+esc(t('lobbyHint'))+'</p><div class="dx-actions">'+(host?'<label>'+esc(t('first'))+' <select data-dx-first><option value="0">'+esc(t('random'))+'</option>'+roster.map(p=>'<option value="'+p.playerNum+'">'+esc(p.name)+'</option>').join('')+'</select></label>'+btn('deal','deal',!a.deal):btn('ready',roster.find(p=>p.playerNum===s.playerNum)?.ready?'unready':'ready',!a.ready))+'</div></section>';
    else if(s.phase==='CANCELLED')body='<section class="dx-panel"><h2>'+esc(t('cancelled'))+'</h2></section>';
    else{
      let instruction='';
      if(s.phase==='CLUE')instruction=mine&&!host?t('storyHint'):t('waitingClue',{name:name(s,s.storyteller)});
      if(s.phase==='SUBMIT')instruction=mine||host?t('waitingSubmit'):list(s.ownSubmitted).length?t('submitted'):t('submitHint',{n:count});
      if(s.phase==='VOTE')instruction=mine?t('tellerVote'):host?'':s.ownVote?t('voted'):t('voteHint');
      body='<section class="dx-panel dx-stage'+(mine&&!host?' is-mine':'')+'"><div class="dx-stage-heading"><h2>'+esc(mine&&!host?t('yourTurn'):t('storyteller',{name:name(s,s.storyteller)}))+'</h2><span>'+esc(t('round',{n:s.round}))+'</span></div>'+(s.clue?'<blockquote class="dx-clue">'+esc(s.clue)+'</blockquote>':'')+(instruction?'<p>'+esc(instruction)+'</p>':'')+
        (s.phase==='SUBMIT'?'<p class="dx-progress">'+esc(t('progressSubmit',{n:submitted,total:others.length}))+'</p>':'')+(s.phase==='VOTE'?'<p class="dx-progress">'+esc(t('progressVote',{n:voted,total:others.length}))+'</p>':'')+
        (s.phase==='CLUE'&&a.story?'<label class="dx-label">'+esc(t('clueLabel'))+'<input data-dx-clue maxlength="180" value="'+esc(options.clue||'')+'" placeholder="'+esc(t('cluePlaceholder'))+'"></label><label class="dx-check"><input data-dx-spoken type="checkbox"'+(options.spoken?' checked':'')+'>'+esc(t('spoken'))+'</label>':'')+'</section>';
      if(table.length)body+='<section class="dx-panel"><h2>'+esc(t('table'))+'</h2><div class="dx-table">'+table.map((id,i)=>{
        const own=!host&&list(s.ownSubmitted).includes(id),owner=rows.find(p=>list(p.cardIds).includes(id));
        return cardHTML(id,i+1,{interactive:!!a.vote,selected:selected.has(id),disabled:own,own:own&&!finished,answer:finished&&s.result?.answerCardId===id,owner:finished&&owner?name(s,owner.playerNum):'',votes:finished?rows.filter(p=>p.voteCardId===id).length:null});
      }).join('')+'</div>'+(a.vote?'<div class="dx-actions">'+btn('vote','vote',selected.size!==1)+'</div>':'')+(host&&s.phase==='VOTE'?'<div class="dx-actions">'+btn('reveal','reveal',!a.reveal)+'</div>':'')+(!host&&s.phase==='VOTE'&&voted===others.length?'<p>'+esc(t('waitingReveal'))+'</p>':'')+'</section>';
      if(finished&&s.result){
        const correct=rows.filter(p=>p.playerNum!==s.storyteller&&p.correct).length,branch=correct===0?'none':correct===others.length?'all':'some';
        const winners=list(s.winners);
        body+='<section class="dx-panel dx-result"><h2>'+esc(s.phase==='FINISHED'?t(winners.length>1?'tie':'winner',{name:winners.map(n=>name(s,n)).join(', ')}):t('result'))+'</h2><p>'+esc(t(branch))+'</p><p class="dx-muted">'+esc(t('bonusRule'))+'</p><div class="dx-score-scroll"><table><thead><tr>'+['player','guess','base','bonus','total'].map(k=>'<th>'+esc(t(k))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th>'+esc(name(s,r.playerNum))+'</th><td>'+(r.playerNum===s.storyteller?'✦':r.voteCardId?'#'+(table.indexOf(r.voteCardId)+1)+(r.correct?' ✓':''):'—')+'</td><td>+'+Number(r.base||0)+'</td><td>+'+Number(r.bonus||0)+'</td><td><strong>'+Number(r.score||0)+'</strong> <small>(+'+Number(r.delta||0)+')</small></td></tr>').join('')+'</tbody></table></div>'+(a.nextRound?'<div class="dx-actions">'+btn('nextRound','next')+'</div>':'')+'</section>';
      }
      if(!host&&list(s.hand).length&&s.phase!=='FINISHED'){
        const can=!!(a.story||a.submit);
        body+='<section class="dx-panel dx-hand"><div class="dx-stage-heading"><h2>'+esc(t('hand'))+'</h2>'+(can?'<span>'+esc(t('selectCount',{n:selected.size,total:a.story?1:count}))+'</span>':'')+'</div><div class="dx-hand-grid" style="--dx-hand-count:'+Math.max(6,list(s.hand).length)+'">'+list(s.hand).map((id,i)=>cardHTML(id,i+1,{interactive:can,selected:selected.has(id)})).join('')+'</div>'+(a.story?'<div class="dx-actions">'+btn('story','tell',selected.size!==1||!options.spoken&&!String(options.clue||'').trim())+'</div>':a.submit?'<div class="dx-actions">'+btn('submit','submit',selected.size!==count)+'</div>':'')+'</section>';
      }
    }
    return '<div class="dx-game"><header class="dx-header"><div><span class="dx-kicker">Ice Breaking Hub · '+esc(t('subtitle'))+'</span><h1>Dixit</h1></div><div class="dx-player">'+esc(host?t('shared'):t('private',{name:name(s,s.playerNum)}))+'<span class="dx-connection" data-dx-connection role="status"></span></div></header><p class="dx-muted dx-goal">'+esc(t('scoreTarget'))+' · '+esc(t('deck',{n:s.deckCount??84}))+'</p>'+scores+(s.paused?'<p class="dx-alert">'+esc(t('paused'))+'</p>':'')+'<p class="dx-message" data-dx-message role="status"></p>'+body+(host?'<div class="dx-host-controls">'+(a.pause?btn('pause','pause',false,true):a.resume?btn('resume','resume',false,true):'')+(a.cancel?btn('cancel','cancel',false,true):'')+(a.restart?btn('restart','restart',false,true):'')+'</div><p class="dx-muted">'+esc(t('keepOpen'))+'</p>':'')+rulesHTML()+'</div>';
  }
  class Card{
    constructor(el,options={}){this.el=el;this.options=options;this.selected=new Set();this.clue='';this.spoken=false;this.payload=null;this.pending=null;this.error='';this.signature='';this.timer=setInterval(()=>this.paint(),1000);
      this.click=e=>this.onClick(e);this.input=e=>{if(e.target.matches('[data-dx-clue]')){this.clue=e.target.value;this.refreshStoryButton();}if(e.target.matches('[data-dx-spoken]')){this.spoken=e.target.checked;this.refreshStoryButton();}};
      el.addEventListener('click',this.click);el.addEventListener('input',this.input);
      this.key=e=>{if(e.key==='Escape')this.closeModal();if(e.key==='Tab'&&this.el.querySelector('.dx-modal')){e.preventDefault();this.el.querySelector('[data-dx-close]')?.focus();}};el.addEventListener('keydown',this.key);
    }
    update(payload){const previous=this.payload?.dixit,next=payload?.dixit;this.payload=payload;if(!next)return;
      if(!previous||previous.sessionId!==next.sessionId||previous.turnId!==next.turnId){this.selected.clear();this.clue='';this.spoken=false;this.error='';}
      if(this.pending&&next.reply?.id===this.pending.id){this.error=next.reply.error?errorText(next.reply.error):'';this.pending=null;clearTimeout(this.pendingTimer);}
      const clean={...next};delete clean.revision;delete clean.hostLiveUntil;
      const signature=JSON.stringify(clean)+'|'+t('hand');if(signature!==this.signature){this.signature=signature;this.render();}else this.paint();
    }
    refreshStoryButton(){const b=this.el.querySelector('[data-dx-action="story"]');if(b)b.disabled=this.blocked()||this.selected.size!==1||!this.spoken&&!this.clue.trim();}
    blocked(){const s=this.payload?.dixit;return !!this.pending||this.options.disabled?.()||this.options.connected?.()===false||(!this.options.host&&Number(s?.hostLiveUntil)>0&&s.hostLiveUntil< (this.options.now?.()||Date.now()));}
    paint(){if(!this.payload)return;const s=this.payload.dixit,blocked=this.blocked();
      const connection=this.el.querySelector('[data-dx-connection]');if(connection){connection.textContent=this.options.connected?.()===false?t('offline'):!this.options.host&&s.hostLiveUntil>0&&s.hostLiveUntil<(this.options.now?.()||Date.now())?t('hostAway'):'';}
      const message=this.el.querySelector('[data-dx-message]');if(message)message.textContent=this.error||this.pending&&t('pending')||'';
      this.el.querySelectorAll('[data-dx-action],[data-dx-card]').forEach(b=>{if(blocked){if(!b.disabled)b.dataset.dxBlocked='1';b.disabled=true;}else if(b.dataset.dxBlocked){b.disabled=false;delete b.dataset.dxBlocked;}});
      this.refreshStoryButton();
    }
    render(){if(!this.payload)return;const open=this.el.querySelector('[data-dx-rules]')?.open,active=this.el.ownerDocument.activeElement,clueFocus=active?.matches?.('[data-dx-clue]'),pos=clueFocus?active.selectionStart:null;
      this.el.innerHTML=tableHTML(this.payload,{...this.options,selected:this.selected,clue:this.clue,spoken:this.spoken});if(open)this.el.querySelector('[data-dx-rules]').open=true;if(clueFocus){const input=this.el.querySelector('[data-dx-clue]');input?.focus({preventScroll:true});input?.setSelectionRange(pos,pos);}this.paint();
    }
    async onClick(e){const zoom=e.target.closest('[data-dx-zoom]');if(zoom){this.openModal(zoom.dataset.dxZoom);return;}if(e.target.closest('[data-dx-close]')){this.closeModal();return;}
      const c=e.target.closest('[data-dx-card]');if(c&&!c.disabled&&!this.blocked()){const s=this.payload.dixit,id=c.dataset.dxCard,max=s.actions.story||s.actions.vote?1:s.submitCount;if(this.selected.has(id))this.selected.delete(id);else{if(max===1)this.selected.clear();if(this.selected.size<max)this.selected.add(id);}this.render();return;}
      const b=e.target.closest('[data-dx-action]');if(!b||b.disabled||this.blocked())return;const type=b.dataset.dxAction,s=this.payload.dixit;
      if(['cancel','restart'].includes(type)&&!root.confirm(t(type==='cancel'?'confirmCancel':'confirmRestart')))return;
      let extra={};if(type==='deal'){const n=Number(this.el.querySelector('[data-dx-first]')?.value);if(n)extra.firstPlayerNum=n;}if(type==='ready')extra.value=!list(s.roster).find(p=>p.playerNum===s.playerNum)?.ready;
      if(type==='story')extra={cardId:[...this.selected][0],clue:this.spoken?t('spokenClue'):this.clue.trim()};if(type==='submit')extra.cardIds=[...this.selected];if(type==='vote')extra.cardId=[...this.selected][0];
      const command={...extra,type,id:root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),sessionId:s.sessionId,turnId:s.turnId};this.pending=command;this.error='';this.paint();
      this.pendingTimer=setTimeout(()=>{if(this.pending?.id===command.id){this.pending=null;this.error=t('failed');this.render();}},15000);
      try{await this.options.send(command);}catch(err){clearTimeout(this.pendingTimer);this.pending=null;this.error=errorText(err.message);this.render();}
    }
    openModal(id){this.closeModal();this.focusBefore=this.el.ownerDocument.activeElement;const modal=this.el.ownerDocument.createElement('div');modal.className='dx-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',picture(id).alt);modal.innerHTML='<button class="dx-button dx-modal-close" data-dx-close>'+esc(t('close'))+'</button><div class="dx-modal-picture">'+art(id)+'</div>';this.el.append(modal);modal.querySelector('button').focus();}
    closeModal(){const modal=this.el.querySelector('.dx-modal');if(modal){modal.remove();this.focusBefore?.focus?.({preventScroll:true});}}
    destroy(){clearInterval(this.timer);clearTimeout(this.pendingTimer);this.el.removeEventListener('click',this.click);this.el.removeEventListener('input',this.input);this.el.removeEventListener('keydown',this.key);this.closeModal();}
  }
  function errorText(error){return ['stale_turn','stale_session'].includes(error)?t('stale'):error==='paused'?t('paused'):['offline','not_available'].includes(error)?t('failed'):t('invalid');}
  root.DIXIT_UI={Card,t,esc,tableHTML,cardHTML,rulesHTML,errorText,picture};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.DIXIT_UI;
})(typeof globalThis!=='undefined'?globalThis:this);
