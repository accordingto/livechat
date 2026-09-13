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
    asking: ['{name} 可以口頭提問', '{name}, you can ask out loud'],
    returnTo: ['提問後，回到 {name} 繼續分享', 'Then {name} continues sharing'],
    ask: ['我想追問', 'I would like to ask'], cancelAsk: ['取消追問', 'Cancel my request'],
    askPending: ['已讓對方知道你想追問，等對方開放再問。', 'They can see your request. Wait until they invite you.'],
    askLater: ['對方想先說完這段，你的追問意願還在。', 'They will finish this thought first. Your request is still there.'],
    wantsAsk: ['{name} 想追問', '{name} would like to ask'], invite: ['請你問', 'Please ask'],
    later: ['等我說完這段', 'Let me finish this thought'], held: ['先保留', 'Waiting'],
    asked: ['問好了', 'I have asked my question'], resume: ['繼續分享', 'Continue sharing'],
    more: ['想聽更多', 'I would like to hear more'], interested: ['{name} 想聽更多', '{name} would like to hear more'],
    share: ['我也有想法', 'I have a thought too'], cancelShare: ['取消接話意願', 'Cancel my sharing request'],
    shareThisRound: ['已保留本輪的接話機會。', 'Your thought is queued for this round.'],
    shareNextRound: ['已保留到下一輪，輪到你時再接著聊。', 'Saved for the next round, when your turn comes.'],
    next: ['接下來預計輪到你，可以慢慢想。', 'You are expected next. Take a moment to think.'],
    listening: ['聽聽彼此的想法，也可以自然附和。', 'Listen, and feel free to respond naturally.'],
    end: ['先到這裡', 'That is my thought for now'],
    briefIsFine: ['一句想法、接著別人的話聊，都很好。', 'A short thought or a response to someone is welcome.'],
    natural: ['嗯嗯、笑聲、附和，都可以直接說。', 'Small responses and laughter can happen naturally.'],
    sharedNotes: ['一起想到的話', 'Thoughts to build on'],
    waiting: ['正在送出…', 'Sending…'], waitingHost: ['等待主持頁接收…', 'Waiting for the host page…'],
    offline: ['連線暫時中斷，重新連上後再操作。', 'Connection lost. Controls return when you reconnect.'],
    hostAway: ['等待主持頁重新連線，語音仍可以繼續聊。', 'Waiting for the host page to reconnect. Voice chat can continue.'],
    retry: ['重試傳送', 'Retry sending'],
    stale_turn: ['已經換到下一段分享，請依現在畫面操作。', 'The conversation has moved on. Please use the current controls.'],
    not_available: ['這個動作目前無法使用，請看最新畫面。', 'That action is no longer available. Check the current view.'],
    pending_questions: ['還有人想追問。可以先請對方問，或直接交棒。', 'Someone is waiting to ask. Invite them, or hand over the turn.'],
    question_open: ['目前有人在提問，請先回到原發言者。', 'A question is open. Return to the original speaker first.'],
    forceEnd: ['這段先結束，交棒', 'Finish this thought and hand over'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check the connection and try again.'],
    title: ['{name} 的談話頁', "{name}'s conversation"], player: ['參加者 {n}', 'Participant {n}'],
    room: ['房間 {code}', 'Room {code}'], round: ['第 {n} 輪', 'Round {n}'],
    setupTopic: ['這次聊什麼', 'Choose a topic'], setupMode: ['怎麼開始', 'How to begin'],
    thinkMode: ['先想一想，不用打字', 'Think first, no writing'], writeMode: ['可以寫一句想法', 'Optionally write a thought'],
    thinkingTime: ['思考時間', 'Thinking time'], seconds: ['{n} 秒', '{n} seconds'],
    openTopic: ['開啟話題', 'Open the topic'], newTopic: ['換個話題', 'Choose another topic'],
    start: ['開始分享', 'Start sharing'], extend: ['延伸這個話題', 'Explore a little further'],
    hideExtend: ['收起延伸題', 'Hide the follow-up'], help: ['流程協助', 'Flow controls'],
    helpEnd: ['協助交給下一位', 'Help pass the turn'],
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
          controls += button('end', 'end') + `<p class="talk-soft">${esc(t('briefIsFine'))}</p>`;
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
      this.element.innerHTML = `<div class="secret-card talk-player">
        ${this.nameBanner(data)}<span class="talk-kicker">Let's Talk</span>
        <p class="talk-player-topic">${esc(s.topic.question)}</p>
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
      document.title = t('title', { name: data.name || t('player', { n: me }) });
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
