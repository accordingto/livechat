/* Bilingual interface shared by the host and the existing player card page. */
var TALK_UI = (() => {
  const dict = {
    thinking: ['先想一想', 'Take a moment'], secondsLeft: ['還有 {n} 秒思考時間', '{n} seconds to think'],
    ready: ['我有想法', 'I have an idea'], wait: ['需要時間', 'I need more time'],
    readySet: ['已記下，你可以先準備分享。', 'You are ready. Take a moment to prepare.'],
    waitSet: ['已記下，會把你安排在後面一些。', 'Noted. Your turn will come a little later.'],
    noteLabel: ['寫一句想法（選填，送出後大家看得到）', 'A short thought (optional, shared when sent)'],
    notePlaceholder: ['幾個字也可以，還沒想清楚也沒關係。', 'A few words are enough. It is fine to be unsure.'],
    sendNote: ['分享這句想法', 'Share this thought'], updateNote: ['更新這句想法', 'Update this thought'],
    noteSent: ['已分享，大家都看得到。', 'Shared with everyone.'],
    yourTurn: ['輪到你分享', 'Your turn to share'], speaking: ['{name} 正在分享', '{name} is sharing'],
    turnAlert: ['輪到你了！', 'Your turn!'], turnHint: ['現在可以開口分享，說完按「我說完了」。', 'You can speak now. Tap “I’m done” when you finish.'],
    asking: ['{name} 可以口頭提問', '{name}, you can ask out loud'],
    returnTo: ['提問後，回到 {name} 繼續分享', 'Then {name} continues sharing'],
    ask: ['我想追問', 'I would like to ask'], cancelAsk: ['取消追問', 'Cancel my request'],
    askPending: ['已讓對方知道你想追問，等對方開放再問。', 'They can see your request. Wait until they invite you.'],
    askLater: ['對方想先說完這段，你的追問意願還在。', 'They will finish this thought first. Your request is still there.'],
    wantsAsk: ['{name} 想追問', '{name} would like to ask'], invite: ['請你問', 'Please ask'],
    later: ['等我說完這段', 'Let me finish this thought'], held: ['先保留', 'Waiting'],
    asked: ['我問完了', 'Done asking'], resume: ['繼續分享', 'Continue sharing'],
    more: ['想聽更多', 'I would like to hear more'], interested: ['{name} 想聽更多', '{name} would like to hear more'],
    share: ['我也有想法', 'I have a thought too'], cancelShare: ['取消接話意願', 'Cancel my sharing request'],
    shareThisRound: ['已保留本輪的接話機會。', 'Your thought is queued for this round.'],
    shareNextRound: ['已保留到下一輪，輪到你時再接著聊。', 'Saved for the next round, when your turn comes.'],
    next: ['接下來預計輪到你，可以慢慢想。', 'You are expected next. Take a moment to think.'],
    listening: ['聽聽彼此的想法，也可以自然附和。', 'Listen, and feel free to respond naturally.'],
    end: ['我說完了', "I'm done"],
    briefIsFine: ['一句想法、接著別人的話聊，都很好。', 'A short thought or a response to someone is welcome.'],
    natural: ['可以隨性自然地聊，卡片只是輔助。', 'Chat freely and naturally. The cards are just a guide.'],
    sharedNotes: ['一起想到的話', 'Thoughts to build on'],
    waiting: ['正在送出…', 'Sending…'], waitingHost: ['等待主持頁接收…', 'Waiting for the host page…'],
    offline: ['連線暫時中斷，重新連上後再操作。', 'Connection lost. Controls return when you reconnect.'],
    hostAway: ['等待主持頁重新連線，語音仍可以繼續聊。', 'Waiting for the host page to reconnect. Voice chat can continue.'],
    retry: ['重試傳送', 'Retry sending'],
    stale_turn: ['已經換到下一段分享，請依現在畫面操作。', 'The conversation has moved on. Please use the current controls.'],
    not_available: ['這個動作目前無法使用，請看最新畫面。', 'That action is no longer available. Check the current view.'],
    pending_questions: ['還有人想追問。可以先請對方問，或直接交棒。', 'Someone is waiting to ask. Invite them, or hand over the turn.'],
    question_open: ['目前有人在提問，請先回到原發言者。', 'A question is open. Return to the original speaker first.'],
    forceEnd: ['直接結束，下一位', 'End turn, next person'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check the connection and try again.'],
    title: ['{name} 的談話頁', "{name}'s conversation"], player: ['參加者 {n}', 'Participant {n}'],
    room: ['房間 {code}', 'Room {code}'],
    setupTopic: ['這次聊什麼', 'Choose a topic'], setupMode: ['怎麼開始', 'How to begin'],
    thinkMode: ['先想一想，不用打字', 'Think first, no writing'], writeMode: ['可以寫一句想法', 'Optionally write a thought'],
    thinkingTime: ['思考時間', 'Thinking time'], seconds: ['{n} 秒', '{n} seconds'],
    openTopic: ['開啟話題', 'Open the topic'], newTopic: ['換個話題', 'Choose another topic'],
    start: ['開始分享', 'Start sharing'], extend: ['延伸這個話題', 'Explore a little further'],
    hideExtend: ['收起延伸題', 'Hide the follow-up'], help: ['流程協助', 'Flow controls'],
    fromLibrary: ['從題庫選', 'Choose from the library'], writeTopic: ['自己出題', 'Write your own'],
    category: ['議題分類', 'Topic category'], allCategories: ['全部議題', 'All categories'],
    searchTopics: ['搜尋題目（中／英）', 'Search topics (Chinese / English)'],
    libraryCount: ['{categories} 類議題 · {topics} 組話題 · {questions} 個問題；目前找到 {matches} 組。', '{categories} categories · {topics} topics · {questions} questions; {matches} topics found.'],
    noTopics: ['沒有符合的題目，試試別的關鍵字，或自己出題。', 'No topics match. Try another search or write your own.'],
    previewPath: ['預覽這題可以怎麼深入', 'Preview ways to go deeper'], editTopic: ['以這題修改', 'Adapt this topic'],
    customHint: ['可以直接輸入中英文。按「開啟話題」後，問題才會送到玩家頁。', 'Write in any language. The question reaches player pages when you open the topic.'],
    customTitle: ['話題名稱（選填）', 'Topic title (optional)'],
    customQuestion: ['想聊的問題（必填，最多 500 字）', 'Your question (required, up to 500 characters)'],
    customStarter: ['題目說明（選填，最多 600 字）', 'Question explanation (optional, up to 600 characters)'],
    showStarters: ['顯示題目說明（試用）', 'Show question explanations (trial)'],
    customFollowUps: ['延伸問題（選填，每行一題，最多 8 題，每題 300 字）', 'Follow-ups (optional, one per line, up to 8, 300 characters each)'],
    customTopic: ['自訂話題', 'Your topic'],
    draftSaved: ['草稿已保存在這個瀏覽器，重新整理後可接著編輯。', 'Draft saved in this browser. You can keep editing after a reload.'],
    draftUnsaved: ['這個瀏覽器無法保存草稿，關頁前請自行留存。', 'This browser could not save the draft. Keep a copy before closing.'],
    invalid_topic: ['請填寫主問題；名稱最多 80 字、主問題 500 字、題目說明 600 字，延伸最多 8 題、每題 300 字。', 'Add a main question (up to 500 characters). Title: 80; explanation: 600; follow-ups: up to 8, 300 characters each.'],
    invalid_extension: ['請選擇延伸問題，或輸入 1–300 字的新問題。', 'Choose a follow-up or enter a question of 1–300 characters.'],
    understand: ['先理解想法', 'Understand the idea'], perspective: ['換個角度', 'Another perspective'],
    tradeoff: ['價值與取捨', 'Values & trade-offs'], practice: ['回到生活', 'Bring it into life'], custom: ['自訂延伸', 'Your follow-up'],
    exploreTitle: ['接著這個議題往下聊', 'Keep exploring this topic'],
    exploreHint: ['選適合當下的一題，不必照順序或全部問完。只更新延伸問題，原分享者與輪次會保留。', 'Choose what fits the conversation. Skip around or stop anytime. The speaker and round stay the same.'],
    exploreDirection: ['選擇延伸問題', 'Choose a follow-up question'], showFollowUp: ['顯示這個問題', 'Show this question'],
    improvise: ['接著大家的話，自訂延伸問題', 'Build on the conversation with your own question'],
    liveFollowUp: ['此刻想接著問什麼（最多 300 字）', 'What would you ask next? (up to 300 characters)'],
    showCustomFollowUp: ['顯示自訂延伸問題', 'Show your follow-up'], closeExplore: ['收起延伸選單', 'Close exploration options'],
    cancelSetup: ['返回目前話題', 'Return to the current topic'],
    currentFollowUp: ['目前顯示：{question}', 'Now showing: {question}'],
    noFollowUpShown: ['目前還沒顯示延伸問題。', 'No follow-up is showing.'],
    topicSource: ['話題來源', 'Topic source'],
    helpEnd: ['結束發言，下一位', 'End turn, next person'],
    helpResume: ['結束提問，回到分享者', 'End question, return to speaker'],
    randomTopic: ['🎲 隨機抽一題', '🎲 Pick a random question'],
    randomNew: ['🎲 隨機選下一題', '🎲 Pick a random next topic'],
    randomHint: ['可以直接聊這一題。不合適就再抽，或到頁尾挑選；按「開啟話題」才會開始。', 'Ready to use. Pick another or browse below if you like. It starts when you open the topic.'],
    chooseManually: ['手動選題', 'Choose a question'],
    browseLibrary: ['到頁尾看完整題庫 ↓', 'Browse the full library below ↓'],
    fullLibrary: ['完整問題庫', 'Full question library'],
    libraryHint: ['先看完整問題，再決定聊哪一題。每題下方可展開四個延伸問題；選題後仍可修改。', 'Read each question before choosing. Expand its four follow-ups below. You can still edit it after selecting.'],
    useTopic: ['選這題', 'Use this question'],
    other_host: ['另一個主持頁正在控制這個房間；關閉那頁後，這裡會自動接續。', 'Another host tab is controlling this room. Close it to continue here.'],
    switched: ['玩家頁已切換到其他活動。要回來聊，可以重新開啟話題。', 'Player pages have switched activities. Open a topic to return here.'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the hub first.'],
    noFirebase: ['目前無法連線到玩家頁，請檢查網路後重新整理。', 'Player pages are unavailable. Check your connection and reload.'],
    intro: ['每人都有分享的機會；不用精彩，也不用講很長。', 'Everyone gets a turn. A short, everyday thought is welcome.'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'],
    demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    details: ['怎麼參與', 'How to take part'],
    tip1: ['先留一點思考時間，每人每輪都有一次主要分享。', 'Take time to think. Everyone has one main turn each round.'],
    tip2: ['想追問就送出意願，等發言者開放後口頭提問。', 'Request a question, then ask out loud when the speaker invites you.'],
    tip3: ['已分享過的人想再補充，會保留到下一輪。附和可以隨時直接說。', 'If you have already shared, another thought waits for the next round. Small responses are welcome anytime.'],
    tip4: ['共同畫面請保持開啟，語音照常在原本的通訊軟體進行。', 'Keep the shared screen open. Continue using your usual voice chat app.'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('talk', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const list = v => Array.isArray(v) ? v.filter(x => x != null) : Object.values(v || {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (key, vars = {}) => {
    let value = typeof I18N !== 'undefined' ? I18N.t('talk', key) : (dict[key]?.[0] || key);
    for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(v);
    return value;
  };
  const name = (s, num) => list(s.roster).find(p => p.playerNum === num)?.name || t('player', { n: num });
  const button = (key, action, extra = '', primary = false) => `<button type="button" class="talk-button${primary ? ' talk-primary' : ''}" data-talk-action="${action}" ${extra}>${esc(t(key))}</button>`;
  function notes(s) {
    return list(s.notes).map(n => `<p class="talk-note"><span>${esc(name(s, n.playerNum))}</span>${esc(n.text)}</p>`).join('');
  }
  function interests(s, now) {
    return list(s.interests).filter(r => r.until > now).map(r => `<span data-talk-until="${r.until}">${esc(t('interested', { name: name(s, r.playerNum) }))}</span>`).join('');
  }
  function status(s, me) {
    if (s.phase === 'thinking') return t('thinking');
    if (s.activeQuestion) return t('asking', { name: name(s, s.activeQuestion.playerNum) });
    return s.speaker === me ? t('yourTurn') : t('speaking', { name: name(s, s.speaker) });
  }
  return { t, esc, list, name, button, notes, interests, status };
})();

var TALK_PLAYER = (() => {
  const { t, esc, list, name, button } = TALK_UI;
  class Card {
    constructor(element, { send, nameBanner, now = () => Date.now(), connected = () => true }) {
      this.element = element; this.send = send; this.nameBanner = nameBanner; this.now = now; this.connected = connected;
      this.pending = null; this.error = ''; this.draft = ''; this.data = null;
      this.clickHandler = event => {
        const b = event.target.closest('[data-talk-action]');
        if (!b || !this.element.contains(b) || b.disabled) return;
        const type = b.dataset.talkAction;
        if (type === 'retry') { this.deliver(); return; }
        this.act(type === 'forceEnd' ? 'end' : type, {
          ...(b.dataset.target ? { target: b.dataset.target } : {}),
          ...(type === 'note' ? { text: this.draft } : {}),
          ...(type === 'forceEnd' ? { confirm: true } : {}),
        });
      };
      this.inputHandler = event => { if (event.target.matches('[data-talk-note]')) this.draft = event.target.value; };
      element.addEventListener('click', this.clickHandler); element.addEventListener('input', this.inputHandler);
      this.timer = setInterval(() => this.paint(), 1000);
    }
    update(data) {
      const changedSession = this.data?.talk?.sessionId !== data.talk.sessionId;
      if (changedSession) { this.pending = null; this.error = ''; this.draft = data.talk.myNote || ''; }
      this.data = data;
      // Recover an unacknowledged request after a card refresh. A second
      // action must not overwrite the first while the host is reconnecting.
      if (!this.pending && data.talkAction?.sessionId === data.talk.sessionId && data.talkAction.turnId === data.talk.turnId
          && data.talk.reply?.id !== data.talkAction.id) {
        this.pending = data.talkAction; this.sentAt = this.now();
      }
      if (this.pending && data.talk.reply?.id === this.pending.id) { this.error = data.talk.reply.error || ''; this.pending = null; }
      if (this.pending && this.pending.turnId !== data.talk.turnId) { this.pending = null; }
      this.render(!changedSession);
    }
    act(type, extra = {}) {
      if (this.pending || !this.data) return;
      const s = this.data.talk;
      this.error = '';
      this.pending = Object.assign({}, extra, { type, id: Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''), sessionId: s.sessionId, turnId: s.turnId });
      this.sentAt = this.now(); this.render(true); this.deliver();
    }
    deliver() {
      if (!this.pending) return;
      const command = this.pending;
      Promise.resolve().then(() => this.send(command)).catch(e => {
        if (this.pending?.id !== command.id) return;
        this.error = e.message === 'stale_turn' ? 'stale_turn' : 'error';
        this.pending = null; this.render(true);
      });
    }
    render(preserveInput) {
      const data = this.data; if (!data) return;
      const s = data.talk, me = data.playerNum;
      let controls = '';
      if (s.phase === 'thinking') {
        if (s.mode === 'write') controls += `<label class="talk-field">${esc(t('noteLabel'))}<textarea data-talk-note maxlength="180" rows="3" placeholder="${esc(t('notePlaceholder'))}">${esc(this.draft)}</textarea></label>${button(s.myNote ? 'updateNote' : 'sendNote', 'note')}${s.myNote ? `<p class="talk-soft">${esc(t('noteSent'))}</p>` : ''}`;
        controls += `<div class="talk-actions">${button('ready', 'ready', `aria-pressed="${s.readiness === 'ready'}"`, true)}${button('wait', 'wait', `aria-pressed="${s.readiness === 'wait'}"`)}</div>`;
        if (s.readiness) controls += `<p class="talk-soft">${esc(t(s.readiness === 'ready' ? 'readySet' : 'waitSet'))}</p>`;
      } else if (s.speaker === me) {
        if (s.activeQuestion) controls += `<p class="talk-soft">${esc(t('returnTo', { name: name(s, me) }))}</p>${button('resume', 'resume', '', true)}`;
        else {
          controls += list(s.questions).map(q => `<div class="talk-request"><p>${esc(t('wantsAsk', { name: name(s, q.playerNum) }))}${q.deferred ? ` · ${esc(t('held'))}` : ''}</p><div class="talk-actions">${button('invite', 'invite', `data-target="${esc(q.id)}"`, true)}${!q.deferred ? button('later', 'later', `data-target="${esc(q.id)}"`) : ''}</div></div>`).join('');
          controls += button('end', 'end', '', true) + `<p class="talk-soft">${esc(t('briefIsFine'))}</p>`;
        }
      } else if (s.activeQuestion?.playerNum === me) {
        controls += button('asked', 'resume', '', true);
        controls += `<p class="talk-soft">${esc(t('returnTo', { name: name(s, s.speaker) }))}</p>`;
      } else {
        const question = list(s.questions).find(q => q.playerNum === me);
        controls += `<div class="talk-listener-actions">${button('more', 'more')}${button(question ? 'cancelAsk' : 'ask', question ? 'cancelAsk' : 'ask')}${button(s.intentRound ? 'cancelShare' : 'share', s.intentRound ? 'cancelShare' : 'share')}</div>`;
        if (question) controls += `<p class="talk-soft">${esc(t(question.deferred ? 'askLater' : 'askPending'))}</p>`;
        controls += `<p class="talk-soft">${esc(t(s.intentRound ? (s.intentRound > s.round ? 'shareNextRound' : 'shareThisRound') : s.isNext ? 'next' : 'listening'))}</p>`;
      }
      const active = this.element.querySelector('[data-talk-note]');
      const keep = preserveInput && active && s.phase === 'thinking' && s.mode === 'write' ? active : null;
      const focused = keep && document.activeElement === keep;
      const notesOpen = preserveInput && this.element.querySelector('.talk-shared')?.open;
      if (keep) keep.remove();
      const myTurn = s.phase === 'talking' && s.speaker === me && !s.activeQuestion;
      this.element.innerHTML = `<div class="secret-card talk-player${myTurn ? ' talk-my-turn' : ''}">
        ${this.nameBanner(data)}
        ${myTurn ? `<div class="talk-turn-alert" role="status"><span aria-hidden="true">🎤</span><strong>${esc(t('turnAlert'))}</strong><p>${esc(t('turnHint'))}</p></div>` : ''}
        <span class="talk-kicker">Let's Talk</span>
        <p class="talk-player-topic">${esc(s.topic.question)}</p>
        ${s.showStarters && s.starter && !(s.extended && s.starter === s.topic.followUp) ? `<p class="talk-starter">${esc(s.starter)}</p>` : ''}
        ${s.extended ? `<p class="talk-extension">${esc(s.topic.followUp)}</p>` : ''}
        <div class="talk-floor" aria-live="polite">${esc(TALK_UI.status(s, me))}</div>
        ${s.phase === 'thinking' ? '<p class="talk-soft" data-talk-clock></p>' : ''}
        <div class="talk-interest" aria-live="polite">${TALK_UI.interests(s, this.now())}</div>
        <div class="talk-controls">${controls}</div>
        <p class="talk-feedback" role="status">${this.error ? esc(t(this.error)) : ''}</p>
        ${this.error === 'pending_questions' ? button('forceEnd', 'forceEnd') : ''}
        <p class="talk-connection" role="status"></p>
        ${this.pending ? button('retry', 'retry') : ''}
        <p class="talk-soft talk-footnote">${esc(t('natural'))}</p>
        ${list(s.notes).length ? `<details class="talk-shared"><summary>${esc(t('sharedNotes'))}</summary>${TALK_UI.notes(s)}</details>` : ''}
      </div>`;
      if (keep) {
        this.element.querySelector('[data-talk-note]')?.replaceWith(keep);
        if (focused) keep.focus({ preventScroll: true });
      }
      if (notesOpen && this.element.querySelector('.talk-shared')) this.element.querySelector('.talk-shared').open = true;
      document.title = (myTurn ? t('turnAlert') + ' · ' : '') + t('title', { name: data.name || t('player', { n: me }) });
      this.paint();
    }
    paint() {
      if (!this.data) return;
      const s = this.data.talk, now = this.now();
      const offline = !this.connected();
      const hostAway = !!s.hostLiveUntil && now > s.hostLiveUntil;
      const message = offline ? 'offline' : hostAway ? 'hostAway' : this.pending ? (now - this.sentAt > 2000 ? 'waitingHost' : 'waiting') : '';
      const status = this.element.querySelector('.talk-connection');
      if (status) status.textContent = message ? t(message) : '';
      this.element.querySelectorAll('[data-talk-action]').forEach(b => {
        b.disabled = offline || hostAway || (!!this.pending && b.dataset.talkAction !== 'retry');
        if (b.dataset.talkAction === 'retry') b.hidden = now - this.sentAt < 6000;
      });
      const clock = this.element.querySelector('[data-talk-clock]');
      if (clock) clock.textContent = t('secondsLeft', { n: Math.max(0, Math.ceil((s.deadline - now) / 1000)) });
      this.element.querySelectorAll('[data-talk-until]').forEach(e => { if (Number(e.dataset.talkUntil) <= now) e.remove(); });
    }
    destroy() {
      clearInterval(this.timer); this.element.removeEventListener('click', this.clickHandler); this.element.removeEventListener('input', this.inputHandler);
    }
  }
  return { Card };
})();
