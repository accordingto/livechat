/* The host and player card share this public-only presentation. */
var CUT_UI = (() => {
  'use strict';
  const dict = {
    intro: ['講到一半突然 CUT！下一位直接把你的半句話接下去。', 'A sudden CUT! Someone else has to finish your unfinished sentence.'],
    speed: ['遊戲速度', 'Pace'], normal: ['Normal · 正常（15–25 秒）', 'Normal · 15–25 seconds'], chill: ['Chill · 輕鬆（25–40 秒）', 'Chill · 25–40 seconds'], chaos: ['Chaos · 瘋狂（8–16 秒）', 'Chaos · 8–16 seconds'], custom: ['Custom · 自訂秒數', 'Custom · Choose your seconds'],
    customMin: ['最短秒數', 'Minimum seconds'], customMax: ['最長秒數', 'Maximum seconds'], customHint: ['各填 5–120 的整秒；填相同秒數就是固定時間。', 'Use whole seconds from 5 to 120. Use the same number for a fixed time.'], customRangeError: ['請填入 5–120 的整秒，最短秒數不能大於最長秒數。', 'Use whole seconds from 5 to 120. The minimum must not exceed the maximum.'],
    category: ['題目類型', 'Topics'], mixed: ['生活＋荒謬', 'Life + absurd situations'], real: ['生活情境', 'Everyday situations'], absurd: ['荒謬想像', 'Absurd imagination'],
    start: ['顯示話題', 'Show topic'], begin: ['開始說話', 'Start talking'], beginHandoff: ['開始接話', 'Start'], saveSettings: ['儲存設定', 'Save settings'], settings: ['返回設定', 'Back to settings'], closeSettings: ['返回話題', 'Back to the topic'],
    waitingBegin: ['先看話題，準備好後由主持人或任一玩家按「開始說話」。', 'Read the topic first. When everyone is ready, the host or any player can tap “Start talking”.'], settingsHint: ['調整好節奏後儲存，再按「開始說話」繼續這個話題。', 'Save your pace, then tap “Start talking” to continue this topic.'], configuring: ['主持人正在調整設定，先看看話題。', 'The host is adjusting the settings. Read the topic while you wait.'], sending: ['已送出，等待同步…', 'Sent. Waiting for confirmation…'],
    pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], next: ['下一題', 'Next topic'],
    endTopic: ['結束話題', 'End topic'], endTopicQuestion: ['大家都同意結束這個話題了嗎？', 'Has everyone agreed to end this topic?'], endTopicHint: ['先口頭確認。結束後才能換下一題。', 'Check with everyone first. Then end the topic.'], endTopicConfirm: ['是，結束話題', 'Yes, end the topic'], keepTopic: ['繼續這個話題', 'Keep this topic'],
    sharedConfiguring: ['任一玩家都可以儲存設定，或返回話題繼續。', 'Any player can save the settings or return to the topic.'], sharedFinished: ['想繼續玩，任一玩家都可以重新開始。', 'Any player can restart when everyone is ready for more CUT!'],
    sharedManage: ['玩家管理', 'Player controls'], recover: ['略過離線玩家', 'Skip offline players'], sharedBreak: ['準備好後，任一玩家可以按下一題。', 'Any player can reveal the next topic when everyone is ready.'], sharedPaused: ['準備好後，任一玩家可以繼續。', 'Any player can resume when everyone is ready.'],
    manage: ['主持管理', 'Host controls'], close: ['關閉', 'Close'], restart: ['重新開始', 'Restart'], stop: ['結束遊戲', 'End game'],
    topic: ['這次聊什麼', 'THE TOPIC'], current: ['目前發言者', 'CURRENT SPEAKER'], nextPlayer: ['下一位', 'NEXT PLAYER'],
    you: ['是你！', 'THAT’S YOU!'], getReady: ['準備開口…', 'Get ready to speak…'], continue: ['接著那半句說！', 'CONTINUE THE HALF-SENTENCE!'],
    go: ['GO! 開始說！', 'GO! KEEP TALKING'], listen: ['聽著，隨時可能輪到你。', 'Listen. Your turn can come at any moment.'],
    speakHint: ['自然地講下去，CUT 出現就停。', 'Keep talking naturally. Stop as soon as CUT appears.'],
    cutHint: ['停！話交給下一位。', 'STOP! Hand over the unfinished thought.'],
    waitingHandoff: ['接著上一位的半句說。準備好按「開始接話」。', 'Continue the unfinished sentence. Press Start when ready.'],
    breakTitle: ['先笑一笑，聊一下。', 'TAKE A BREATHER'], breakHint: ['主持人按下一題顯示新話題，準備好再按開始。', 'The host reveals the next topic. Tap Start when everyone is ready.'],
    finalCut: ['這題到這裡！', 'THAT’S IT FOR THIS TOPIC!'], paused: ['已暫停', 'PAUSED'], pausedHint: ['繼續聊天，主持人準備好就恢復。', 'Keep chatting. The host will resume when you’re ready.'],
    finished: ['今天的話先說到這裡！', 'THAT’S A WRAP!'], finishedHint: ['想繼續玩，請主持人重新開始。', 'Ask the host to restart for more CUT!'],
    sittingOut: ['你目前先休息，仍然可以自由聊天。', 'You’re sitting out of the draw. Keep chatting freely.'],
    soundOn: ['🔊 音效開啟', '🔊 Sound on'], soundOff: ['🔇 音效關閉', '🔇 Sound off'], enableSound: ['🔊 啟用音效', '🔊 Enable sound'],
    soundHint: ['音效由這個主持頁播放。共用畫面時請分享電腦音訊。', 'This host screen plays the cues. Share computer audio when sharing your screen.'],
    cardSoundHint: ['音效只在你的裝置播放。', 'Cues play only on this device.'],
    soundBlocked: ['按「啟用音效」讓瀏覽器播放提示音。', 'Tap “Enable sound” to allow the browser to play cues.'],
    soundUnsupported: ['這個瀏覽器無法播放提示音，請依畫面接棒。', 'This browser can’t play cues. Follow the screen to pass the turn.'],
    rules: ['怎麼玩', 'How to play'],
    rule1: ['先看話題，主持人或玩家按「開始說話」後才倒數。看到 GO 就開口，CUT 一出現立刻停下。', 'Read the topic, then the host or a player taps “Start talking” to start the countdown. Speak on GO and stop on CUT.'],
    rule2: ['CUT 會停在下一位的名字，準備好後主持人或玩家按「開始接話」。下一位假裝自己就是上一個人，直接接那半句，不要重新回答題目。', 'CUT holds on the next player’s name until the host or a player taps “Start”. Pretend you are the previous speaker and continue the half-sentence without restarting the answer.'],
    rule3: ['同一話題可以一直接下去。大家口頭同意後，主持人或玩家按「結束話題」，再換下一題。', 'Keep going with the same topic as long as you like. When everyone agrees, end the topic before choosing the next one.'],
    ruleExample: ['例如：「他把——」CUT！「——護照丟進了垃圾桶。」', 'For example: “He threw his—” CUT! “—passport into the bin.”'],
    rosterHint: ['暫時離開的人可以先休息，回來再加入抽選。', 'Let someone sit out if they leave, and add them back when they return.'],
    exclude: ['先休息', 'Sit out'], reinclude: ['加入抽選', 'Join the draw'], inactive: ['休息中', 'Sitting out'], active: ['參與中', 'In the draw'],
    room: ['房間 {code}', 'Room {code}'], player: ['玩家 {n}', 'Player {n}'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'], demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the hub first.'], setUpRoom: ['設定房間與玩家', 'Set up room & players'],
    offline: ['連線暫時中斷，正在重新連線…', 'Connection lost. Reconnecting…'], ready: ['', ''], connecting: ['正在連線…', 'Connecting…'],
    hostAway: ['等待主持頁重新連線。先自由聊天。', 'Waiting for the host to reconnect. Keep chatting.'],
    other_host: ['另一個主持頁正在控制房間。關閉那頁後，這裡會接續。', 'Another host tab is controlling this room. Close it to continue here.'],
    switched: ['房間已切換到其他遊戲。按「顯示話題」可以再玩。', 'The room has switched to another game. Tap “Show topic” to play again.'],
    noFirebase: ['目前無法連線到玩家頁，請檢查網路後重新整理。', 'Player pages are unavailable. Check your connection and reload.'],
    roomChanged: ['房間已變更。重新載入此頁以使用新房間。', 'The room changed. Reload this page to use the new room.'],
    not_enough_players: ['至少要有兩位參與抽選的玩家。', 'At least two players must be in the draw.'],
    invalid_roster: ['至少要有兩位玩家，請到主選單設定。', 'Set up at least two players in the hub.'],
    invalid_options: ['請選擇有效的速度與題目類型。', 'Choose a valid pace and topic type.'],
    stale_turn: ['畫面已更新，請再操作一次。', 'The turn has changed. Try again.'],
    not_available: ['這個動作目前無法使用，請依最新畫面操作。', 'This action isn’t available right now. Follow the current screen.'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check your connection and try again.'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('cut', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {});
  const t = (key, vars = {}) => {
    let value = typeof I18N !== 'undefined' ? I18N.t('cut', key) : (dict[key]?.[0] ?? key);
    for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(String(v));
    return value;
  };
  const name = (cut, num) => list(cut.roster).find(p => Number(p.playerNum) === Number(num))?.name || t('player', { n: num });
  const countdown = (cut, now) => ['countdown', 'handoff'].includes(cut.phase)
    ? Math.max(0, Math.ceil((Number(cut.phaseUntil) - now) / 1000)) : null;

  function scene(cut, actor = 0, now = Date.now(), { animate = true } = {}) {
    if (!cut) return '';
    const phase = cut.phase;
    const handoff = phase === 'handoff';
    const isCut = phase === 'cut';
    const next = (handoff || isCut) ? cut.nextSpeaker : null;
    const shownSpeaker = next || cut.speaker;
    const personal = Number(actor) > 0 && Number(actor) === Number(shownSpeaker);
    const inPlay = ['countdown', 'speaking', 'handoff'].includes(phase);
    let floor;
    if (phase === 'ready' || phase === 'setup') {
      floor = speaker(cut, shownSpeaker, t('current'), personal) + `<p class="cut-cue cut-waiting">${esc(t(phase === 'setup' ? cut.sharedControls ? 'sharedConfiguring' : 'configuring' : 'waitingBegin'))}</p>`;
      if (phase === 'ready' && Number(actor) > 0 && cut.canBegin) floor += `<button type="button" class="cut-button cut-primary cut-begin" data-cut-action="begin">${esc(t('begin'))}</button>`;
    } else if (isCut) {
      floor = `<div class="cut-burst" aria-label="CUT!"><strong>CUT!</strong><p>${esc(t(cut.cutEvent?.final ? 'finalCut' : 'cutHint'))}</p></div>`;
      if (next) {
        floor += speaker(cut, next, t('nextPlayer'), Number(actor) === Number(next), 'cut-reveal');
        if (!cut.cutEvent?.final) {
          floor += `<p class="cut-cue cut-waiting">${esc(t('waitingHandoff'))}</p>`;
          if (Number(actor) > 0 && cut.canBegin) floor += `<button type="button" class="cut-button cut-primary cut-begin" data-cut-action="begin">${esc(t('beginHandoff'))}</button>`;
        }
      }
    } else if (inPlay) {
      floor = speaker(cut, shownSpeaker, t(handoff ? 'nextPlayer' : 'current'), personal);
      if (phase === 'countdown' || handoff) floor += `<p class="cut-cue">${esc(t(handoff ? 'continue' : 'getReady'))}</p><div class="cut-countdown" data-cut-countdown aria-live="off">${countdown(cut, now) || 'GO!'}</div>`;
      else floor += `<p class="cut-cue cut-go">${esc(t('go'))}</p><p class="cut-soft">${esc(t(personal || !actor ? 'speakHint' : 'listen'))}</p>`;
    } else {
      const finished = ['finished', 'stopped'].includes(phase);
      const title = phase === 'paused' ? 'paused' : finished ? 'finished' : 'breakTitle';
      const hint = phase === 'paused' ? cut.pauseReason === 'not_enough_players' ? 'not_enough_players' : cut.sharedControls ? 'sharedPaused' : 'pausedHint' : finished ? cut.sharedControls ? 'sharedFinished' : 'finishedHint' : cut.sharedControls ? 'sharedBreak' : 'breakHint';
      floor = `<div class="cut-rest"><span aria-hidden="true">${phase === 'paused' ? 'Ⅱ' : finished ? '✂️' : '☕'}</span><h3>${esc(t(title))}</h3><p class="cut-soft">${esc(t(hint))}</p></div>`;
    }
    const excluded = actor && list(cut.roster).find(p => Number(p.playerNum) === Number(actor))?.active === false;
    return `<div class="cut-stage${isCut ? ' cut-is-cut' : ''}${isCut && !animate ? ' cut-static' : ''}${personal && inPlay ? ' cut-is-you' : ''}" data-cut-phase="${esc(phase)}">
      <div class="cut-topic"><p class="cut-kicker">${esc(t('topic'))}</p><h2>${esc(cut.topic?.question || '')}</h2></div>
      <div class="cut-floor" role="status" aria-live="polite">${floor}</div>
      ${excluded ? `<p class="cut-soft cut-sitting-out">${esc(t('sittingOut'))}</p>` : ''}
    </div>`;
  }
  function speaker(cut, num, label, personal, extra = '') {
    return `<div class="cut-speaker ${extra}"><p class="cut-kicker">${esc(label)}</p><h3>${esc(name(cut, num))}</h3>${personal ? `<span class="cut-you">${esc(t('you'))}</span>` : ''}</div>`;
  }

  function sharedPanel(cut, actor) {
    if (cut.sharedControls !== true || !actor) return '';
    const mine = list(cut.roster).find(p => Number(p.playerNum) === Number(actor));
    if (!mine) return '';
    const button = (action, label, extra = '', css = '') => `<button type="button" class="cut-button ${css}" data-cut-action="${action}"${extra}>${esc(t(label))}</button>`;
    let actions = button('recover', 'recover');
    if (mine.active === false) return `<div class="cut-controls">${actions}${button('exclude', 'reinclude', ` data-player="${Number(actor)}" data-active="true"`)}</div>`;
    const stopped = cut.phase === 'stopped';
    if (stopped) actions = button('restart', 'restart', '', 'cut-primary') + actions;
    else if (cut.phase === 'break') actions += button('next', 'next');
    if (cut.canEndTopic) actions += button('endTopic', 'endTopic');
    if (!stopped && cut.phase !== 'setup') actions += button(cut.phase === 'paused' ? 'resume' : 'pause', cut.phase === 'paused' ? 'resume' : 'pause');
    const options = (values, selected) => values.map(value => `<option value="${value}"${selected === value ? ' selected' : ''}>${esc(t(value))}</option>`).join('');
    const settings = cut.phase === 'setup' ? `<form class="cut-card-settings" data-cut-settings><div class="cut-settings"><label class="cut-field"><span>${esc(t('speed'))}</span><select name="speed" data-cut-setting>${options(['normal', 'chill', 'chaos', 'custom'], cut.speed)}</select></label><label class="cut-field"><span>${esc(t('category'))}</span><select name="category" data-cut-setting>${options(['mixed', 'real', 'absurd'], cut.category)}</select></label></div><div class="cut-custom" data-cut-custom-fields${cut.speed === 'custom' ? '' : ' hidden'}><div class="cut-settings"><label class="cut-field"><span>${esc(t('customMin'))}</span><input type="number" name="customMinSeconds" data-cut-setting min="5" max="120" step="1" inputmode="numeric" value="${esc(cut.customMinSeconds ?? 15)}"></label><label class="cut-field"><span>${esc(t('customMax'))}</span><input type="number" name="customMaxSeconds" data-cut-setting min="5" max="120" step="1" inputmode="numeric" value="${esc(cut.customMaxSeconds ?? 25)}"></label></div><p class="cut-soft">${esc(t('customHint'))}</p><p class="cut-feedback" data-cut-custom-error role="alert"></p></div><div class="cut-controls"><button type="submit" class="cut-button cut-primary" data-cut-settings-save>${esc(t('saveSettings'))}</button>${button('cancelSettings', 'closeSettings')}</div></form>` : '';
    const roster = list(cut.roster).map(p => `<div class="cut-roster-row"><span>${esc(p.name || t('player', { n: p.playerNum }))}</span>${button('exclude', p.active === false ? 'reinclude' : 'exclude', ` data-player="${Number(p.playerNum)}" data-active="${p.active === false ? 'true' : 'false'}"`)}</div>`).join('');
    const management = (cut.phase === 'setup' ? '' : button('settings', 'settings')) + (stopped ? '' : button('restart', 'restart') + button('stop', 'stop', '', 'cut-stop'));
    return `${settings}<div class="cut-controls">${actions}</div><details class="cut-player-management" data-cut-management><summary>${esc(t('sharedManage'))}</summary><div class="cut-controls cut-management-actions">${management}</div><p class="cut-soft">${esc(t('rosterHint'))}</p>${roster}</details>`;
  }

  class Card {
    constructor(element, { now = () => Date.now(), connected = () => true, nameBanner = () => '', send = null } = {}) {
      this.element = element; this.now = now; this.connected = connected; this.nameBanner = nameBanner; this.send = send;
      this.data = null; this.destroyed = false; this.renderKey = ''; this.pending = null; this.error = ''; this.animatedCut = ''; this.sound = null;
      this.click = event => {
        const soundButton = event.target.closest('[data-cut-sound]');
        if (soundButton && this.sound && !this.destroyed) {
          // Web Audio is unlocked synchronously from this explicit user gesture.
          this.sound.toggle().then(() => this.paintSound());
          return;
        }
        const button = event.target.closest('[data-cut-action]');
        if (button && !button.disabled) {
          const type = button.dataset?.cutAction || 'begin';
          this.action(type, type === 'exclude' ? { playerNum: Number(button.dataset.player), active: button.dataset.active === 'true' } : {});
        }
      };
      this.submit = event => {
        const form = event.target.closest('[data-cut-settings]');
        if (!form) return;
        event.preventDefault();
        this.action('configure', this.settingsInput(form));
      };
      this.change = event => { if (event.target.closest('[data-cut-settings]')) this.paint(); };
      this.element.addEventListener('click', this.click);
      this.element.addEventListener('submit', this.submit);
      this.element.addEventListener('input', this.change);
      this.element.addEventListener('change', this.change);
      this.timer = setInterval(() => this.paint(), 150);
    }
    update(data) {
      if (this.destroyed || !data?.cut) return;
      const previous = this.data?.cut;
      this.data = data;
      const cut = data.cut;
      if (cut.sharedControls === true) {
        if (!this.sound) { this.sound = new Sound(() => this.paintSound()); this.sound.enabled = false; }
        if (previous?.sessionId !== cut.sessionId) { this.sound.previous = null; this.sound.seen.clear(); }
      } else if (this.sound) { this.sound.close(); this.sound = null; }
      if (previous?.sessionId !== cut.sessionId || previous?.turnId !== cut.turnId) this.error = '';
      if (this.pending && cut.reply?.id === this.pending.id) {
        this.error = cut.reply.error ? t(cut.reply.error === 'invalid_setup' ? 'invalid_options' : ['stale_turn', 'not_available', 'not_enough_players', 'invalid_options'].includes(cut.reply.error) ? cut.reply.error : 'error') : '';
        this.pending = null;
      } else if (this.pending && (this.pending.sessionId !== cut.sessionId || this.pending.turnId !== cut.turnId)) this.pending = null;
      const request = data.cutAction;
      if (!this.pending && (request?.type === 'begin' || cut.sharedControls === true && ['next', 'pause', 'resume', 'exclude', 'recover', 'endTopic', 'settings', 'configure', 'cancelSettings', 'stop', 'restart'].includes(request?.type)) && request.sessionId === cut.sessionId && request.turnId === cut.turnId && typeof request.id === 'string' && request.id.length >= 8 && request.id.length <= 100 && cut.reply?.id !== request.id) this.pending = request;
      const key = JSON.stringify([typeof I18N !== 'undefined' ? I18N.lang : '', data.name, data.playerNum, cut.sessionId, cut.turnId, cut.phase, cut.canBegin, cut.canEndTopic, cut.sharedControls, cut.canManage, cut.speed, cut.category, cut.customMinSeconds, cut.customMaxSeconds, cut.topic, cut.speaker, cut.nextSpeaker, cut.cutEvent, cut.roster]);
      if (this.renderKey !== key) {
        this.renderKey = key;
        const managementOpen = this.element.querySelector('[data-cut-management]')?.open;
        const cutKey = cut.phase === 'cut' ? `${cut.sessionId}:${cut.cutEvent?.id || cut.turnId}` : '';
        const animate = !cutKey || cutKey !== this.animatedCut;
        if (cutKey) this.animatedCut = cutKey;
        this.element.innerHTML = `<div class="secret-card cut-player">${this.nameBanner(data)}<span class="cut-kicker cut-brand">✂️ CUT!</span><div class="cut-player-scene">${scene(cut, data.playerNum, this.now(), { animate })}</div>${sharedPanel(cut, data.playerNum)}${this.sound ? `<div class="cut-controls"><button type="button" class="cut-button cut-sound" data-cut-sound title="${esc(t('cardSoundHint'))}" aria-pressed="false">${esc(t('soundOff'))}</button></div><p class="cut-feedback" data-cut-sound-status role="status"></p>` : ''}<p class="cut-feedback" data-cut-action-status role="status"></p><p class="cut-feedback" data-cut-connection role="status"></p></div>`;
        if (managementOpen && this.element.querySelector('[data-cut-management]')) this.element.querySelector('[data-cut-management]').open = true;
      }
      this.paint();
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const now = this.now(), cut = this.data.cut;
      const clock = this.element.querySelector('[data-cut-countdown]');
      if (clock) clock.textContent = countdown(cut, now) || 'GO!';
      const connection = this.element.querySelector('[data-cut-connection]');
      if (connection) connection.textContent = !this.connected() ? t('offline') : !cut.sharedControls && cut.hostLiveUntil && now > cut.hostLiveUntil ? t('hostAway') : '';
      const button = this.element.querySelector('[data-cut-action="begin"]');
      if (button) button.disabled = !this.canBegin();
      for (const control of this.element.querySelectorAll?.('[data-cut-action]') || []) {
        control.disabled = !this.canAction(control.dataset.cutAction, control.dataset.cutAction === 'exclude' ? { playerNum: Number(control.dataset.player), active: control.dataset.active === 'true' } : {});
      }
      const form = this.element.querySelector('[data-cut-settings]');
      if (form) {
        const settings = this.settingsInput(form), custom = settings.speed === 'custom';
        const enabled = this.canAction('cancelSettings'), valid = this.validTiming(settings);
        const save = form.querySelector('[data-cut-settings-save]');
        if (save) save.disabled = !this.canAction('configure', settings);
        for (const field of form.querySelectorAll('[data-cut-setting]')) field.disabled = !enabled;
        const customFields = form.querySelector('[data-cut-custom-fields]');
        if (customFields) customFields.hidden = !custom;
        for (const name of ['customMinSeconds', 'customMaxSeconds']) {
          const field = form.querySelector(`[name="${name}"]`);
          if (field) { field.disabled = !enabled || !custom; field.required = custom;
            field.setAttribute?.('aria-invalid', String(custom && !valid)); }
        }
        const message = form.querySelector('[data-cut-custom-error]');
        if (message) message.textContent = custom && !valid ? t('customRangeError') : '';
      }
      const feedback = this.element.querySelector('[data-cut-action-status]');
      if (feedback) feedback.textContent = this.error || (this.pending ? t('sending') : '');
      if (this.sound) {
        const audible = this.sound.enabled && this.sound.context?.state === 'running' && this.connected() &&
          (typeof document === 'undefined' || document.hidden !== true);
        if (!audible) this.sound.silence();
        this.sound.update(cut, now, false, audible);
        this.paintSound();
      }
    }
    paintSound() {
      if (this.destroyed || !this.sound) return;
      const button = this.element.querySelector('[data-cut-sound]');
      if (!button) return;
      const sound = this.sound, waiting = sound.enabled && !sound.unsupported && (sound.blocked || !sound.context);
      button.textContent = t(waiting ? 'enableSound' : sound.enabled ? 'soundOn' : 'soundOff');
      button.setAttribute('aria-pressed', String(sound.enabled));
      const status = this.element.querySelector('[data-cut-sound-status]');
      if (status) status.textContent = sound.unsupported ? t('soundUnsupported') : waiting ? t('soundBlocked') : '';
    }
    settingsInput(form) {
      const speed = form.querySelector('[name="speed"]')?.value;
      const seconds = name => {
        const value = form.querySelector(`[name="${name}"]`)?.value;
        return typeof value === 'string' && value.trim() ? Number(value) : NaN;
      };
      return { speed, category: form.querySelector('[name="category"]')?.value,
        customMinSeconds: speed === 'custom' ? seconds('customMinSeconds') : this.data.cut.customMinSeconds ?? 15,
        customMaxSeconds: speed === 'custom' ? seconds('customMaxSeconds') : this.data.cut.customMaxSeconds ?? 25 };
    }
    validTiming({ customMinSeconds: min, customMaxSeconds: max }) {
      return Number.isInteger(min) && Number.isInteger(max) && min >= 5 && max <= 120 && min <= max;
    }
    canBegin() {
      const cut = this.data?.cut;
      return !this.destroyed && !this.pending && typeof this.send === 'function' && this.connected() && ['ready', 'cut'].includes(cut?.phase) && cut.canBegin === true && (cut.sharedControls === true || !cut.hostLiveUntil || this.now() <= cut.hostLiveUntil);
    }
    canAction(type, extra = {}) {
      if (type === 'begin') return this.canBegin();
      const cut = this.data?.cut, actor = Number(this.data?.playerNum);
      if (this.destroyed || this.pending || typeof this.send !== 'function' || !this.connected() || cut?.sharedControls !== true) return false;
      const mine = list(cut.roster).find(p => Number(p.playerNum) === actor);
      if (!mine) return false;
      if (type === 'recover') return true;
      if (type === 'exclude' && Number(extra.playerNum) === actor && extra.active === true) return true;
      if (mine.active === false) return false;
      if (type === 'endTopic') return cut.canEndTopic === true;
      if (type === 'restart') return list(cut.roster).filter(p => p.active !== false).length >= 2;
      if (type === 'settings') return cut.phase !== 'setup';
      if (type === 'cancelSettings') return cut.phase === 'setup';
      if (type === 'configure') return cut.phase === 'setup' && ['normal', 'chill', 'chaos', 'custom'].includes(extra.speed) && ['mixed', 'real', 'absurd'].includes(extra.category) && this.validTiming(extra);
      if (type === 'stop') return cut.phase !== 'stopped';
      if (type === 'next') return cut.phase === 'break';
      if (type === 'pause') return !['paused', 'stopped', 'setup'].includes(cut.phase);
      if (type === 'resume') return cut.phase === 'paused';
      return type === 'exclude' && typeof extra.active === 'boolean' && list(cut.roster).some(p => Number(p.playerNum) === Number(extra.playerNum));
    }
    begin() { return this.action('begin'); }
    async action(type, extra = {}) {
      if (!this.canAction(type, extra)) return;
      if (type === 'endTopic' && (typeof window === 'undefined' || typeof window.confirm !== 'function' || !window.confirm(t('endTopicQuestion')))) return;
      const cut = this.data.cut;
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const command = { ...extra, id, sessionId: cut.sessionId, turnId: cut.turnId, type };
      this.pending = command; this.error = ''; this.paint();
      try { await this.send(command); }
      catch (e) {
        if (this.destroyed || this.pending?.id !== command.id) return;
        this.pending = null; this.error = t(e.message === 'stale_turn' ? 'stale_turn' : 'error'); this.paint();
      }
    }
    destroy() { this.destroyed = true; clearInterval(this.timer); this.sound?.close(); this.sound = null; this.element.removeEventListener('click', this.click); this.element.removeEventListener('submit', this.submit); this.element.removeEventListener('input', this.change); this.element.removeEventListener('change', this.change); this.data = null; this.pending = null; }
  }

  /* Cues are synthesized locally, with no asset downloads or microphone use.
     Shared player cards may opt into their own muted-by-default Sound instance. */
  class Sound {
    constructor(onChange = () => {}) {
      this.context = null; this.enabled = true; this.blocked = false; this.unsupported = false;
      this.onChange = onChange; this.previous = null; this.seen = new Set(); this.voices = new Set();
    }
    async unlock() {
      if (!this.enabled) return false;
      try {
        const Audio = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!Audio) { this.unsupported = true; this.onChange(); return false; }
        if (!this.context || this.context.state === 'closed') this.context = new Audio();
        await this.context.resume(); this.blocked = this.context.state !== 'running';
      } catch (e) { this.blocked = true; }
      this.onChange(); return !this.blocked && !!this.context;
    }
    silence() {
      for (const voice of this.voices) { try { voice.stop(); voice.disconnect(); } catch (e) {} }
      this.voices.clear();
    }
    toggle() {
      if (this.enabled && !this.unsupported && (this.blocked || !this.context)) return this.unlock();
      this.enabled = !this.enabled;
      if (!this.enabled) this.silence();
      this.onChange(); return this.enabled ? this.unlock() : Promise.resolve(false);
    }
    tone(frequency, length, delay = 0, type = 'sine', volume = .08) {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const ctx = this.context, start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .01);
      gain.gain.exponentialRampToValueAtTime(.001, start + length);
      oscillator.connect(gain); gain.connect(ctx.destination); this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + length + .015);
    }
    cue(key) {
      if (key === 'cut') { this.tone(185, .18, 0, 'sawtooth', .11); this.tone(130, .15, .11, 'square', .06); }
      else if (key === 'reveal') { this.tone(620, .1, .16); this.tone(830, .15, .25); }
      else if (key === 'go') { this.tone(720, .13); this.tone(980, .18, .11); }
      else if (key === 'round') { this.tone(460, .1); this.tone(610, .12, .11); }
      else this.tone(520, .065, 0, 'sine', .05);
    }
    update(cut, now, fresh = false, audible = true) {
      if (!cut) { this.previous = null; this.silence(); return; }
      const previous = this.previous;
      const phaseKey = `${cut.sessionId}:${cut.turnId}:${cut.phase}`;
      if (fresh) { this.previous = null; this.seen.clear(); }
      // A reconnect or initial page restore must never replay an old CUT.
      const transitioned = audible && (!!previous || fresh);
      if (!this.seen.has(phaseKey)) {
        this.seen.add(phaseKey);
        const eventKey = 'cut:' + (cut.cutEvent?.id || phaseKey);
        const newCut = cut.phase === 'cut' && !this.seen.has(eventKey);
        if (cut.phase === 'cut') this.seen.add(eventKey);
        if (transitioned) {
          if (cut.phase === 'cut') {
            if (newCut) { this.cue('cut'); if (cut.nextSpeaker) this.cue('reveal'); }
          }
          else if (cut.phase === 'speaking' && ['countdown', 'handoff', 'cut'].includes(previous?.phase)) this.cue('go');
          else if (cut.phase === 'countdown' && (fresh || previous?.phase !== 'countdown' || previous?.sessionId !== cut.sessionId)) this.cue('round');
          else if (['setup', 'ready', 'paused', 'finished', 'stopped'].includes(cut.phase)) this.silence();
        }
      }
      const seconds = countdown(cut, now);
      if (seconds > 0 && seconds <= 3) {
        const tick = `${phaseKey}:${seconds}`;
        if (!this.seen.has(tick)) { this.seen.add(tick); if (transitioned) this.cue('tick'); }
      }
      this.previous = { sessionId: cut.sessionId, phase: cut.phase };
      if (this.context && this.enabled && this.context.state !== 'running') { this.blocked = true; this.onChange(); }
      if (this.seen.size > 300) this.seen = new Set([...this.seen].slice(-120));
    }
    close() { this.silence(); this.previous = null; this.context?.close().catch(() => {}); this.context = null; }
  }
  return { t, esc, list, name, countdown, scene, Card, Sound };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_UI;
