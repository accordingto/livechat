/* The host and player card share this public-only presentation. */
var CUT_UI = (() => {
  'use strict';
  const dict = {
    intro: ['講到一半突然 CUT！下一位直接把你的半句話接下去。', 'A sudden CUT! Someone else has to finish your unfinished sentence.'],
    speed: ['遊戲速度', 'Pace'], normal: ['Normal · 正常', 'Normal'], chill: ['Chill · 輕鬆', 'Chill'], chaos: ['Chaos · 快節奏', 'Chaos'],
    category: ['題目類型', 'Topics'], mixed: ['生活＋荒謬', 'Life + absurd situations'], real: ['生活情境', 'Everyday situations'], absurd: ['荒謬想像', 'Absurd imagination'],
    start: ['開始 CUT!', 'Start CUT!'], pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], next: ['下一題', 'Next topic'],
    manage: ['主持管理', 'Host controls'], close: ['關閉', 'Close'], restart: ['重新開始', 'Restart'], stop: ['結束遊戲', 'End game'],
    topic: ['這次聊什麼', 'THE TOPIC'], current: ['目前發言者', 'CURRENT SPEAKER'], nextPlayer: ['下一位', 'NEXT PLAYER'],
    you: ['是你！', 'THAT’S YOU!'], getReady: ['準備開口…', 'Get ready to speak…'], continue: ['接著那半句說！', 'CONTINUE THE HALF-SENTENCE!'],
    go: ['GO! 開始說！', 'GO! KEEP TALKING'], listen: ['聽著，隨時可能輪到你。', 'Listen. Your turn can come at any moment.'],
    speakHint: ['自然地講下去，CUT 出現就停。', 'Keep talking naturally. Stop as soon as CUT appears.'],
    cutHint: ['停！話交給下一位。', 'STOP! Hand over the unfinished thought.'],
    breakTitle: ['先笑一笑，聊一下。', 'TAKE A BREATHER'], breakHint: ['主持人準備好就換下一題。', 'Chat and laugh. The host will start the next topic.'],
    finalCut: ['這題到這裡！', 'THAT’S IT FOR THIS TOPIC!'], paused: ['已暫停', 'PAUSED'], pausedHint: ['繼續聊天，主持人準備好就恢復。', 'Keep chatting. The host will resume when you’re ready.'],
    finished: ['今天的話先說到這裡！', 'THAT’S A WRAP!'], finishedHint: ['想繼續玩，請主持人重新開始。', 'Ask the host to restart for more CUT!'],
    sittingOut: ['你目前先休息，仍然可以自由聊天。', 'You’re sitting out of the draw. Keep chatting freely.'],
    soundOn: ['🔊 音效開啟', '🔊 Sound on'], soundOff: ['🔇 音效關閉', '🔇 Sound off'], enableSound: ['🔊 啟用音效', '🔊 Enable sound'],
    soundHint: ['音效由這個主持頁播放。共用畫面時請分享電腦音訊。', 'This host screen plays the cues. Share computer audio when sharing your screen.'],
    soundBlocked: ['按「啟用音效」讓瀏覽器播放提示音。', 'Tap “Enable sound” to allow the browser to play cues.'],
    soundUnsupported: ['這個瀏覽器無法播放提示音，請依畫面接棒。', 'This browser can’t play cues. Follow the screen to pass the turn.'],
    rules: ['怎麼玩', 'How to play'],
    rule1: ['看到 GO 就開口。CUT 一出現立刻停下，畫面才會公布下一位。', 'Speak on GO. Stop immediately on CUT. Only then is the next player revealed.'],
    rule2: ['下一位假裝自己就是上一個人，直接接那半句；不要重新回答題目。', 'Pretend you are the previous speaker. Continue their half-sentence, rather than starting a new answer.'],
    rule3: ['可以亂編、互虧和自由吐槽。一題結束，先笑一笑，主持人再按下一題。', 'Make things up, tease each other, and jump in. Laugh between topics, then the host moves on.'],
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
    switched: ['房間已切換到其他遊戲。按「開始 CUT!」可以再玩。', 'The room has switched to another game. Start CUT! to play again.'],
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

  function scene(cut, actor = 0, now = Date.now()) {
    if (!cut) return '';
    const phase = cut.phase;
    const handoff = phase === 'handoff';
    const isCut = phase === 'cut';
    const next = (handoff || isCut) ? cut.nextSpeaker : null;
    const shownSpeaker = next || cut.speaker;
    const personal = Number(actor) > 0 && Number(actor) === Number(shownSpeaker);
    const inPlay = ['countdown', 'speaking', 'handoff'].includes(phase);
    let floor;
    if (isCut) {
      floor = `<div class="cut-burst" aria-label="CUT!"><strong>CUT!</strong><p>${esc(t(cut.cutEvent?.final ? 'finalCut' : 'cutHint'))}</p></div>`;
      if (next) floor += speaker(cut, next, t('nextPlayer'), Number(actor) === Number(next), 'cut-reveal');
    } else if (inPlay) {
      floor = speaker(cut, shownSpeaker, t(handoff ? 'nextPlayer' : 'current'), personal);
      if (phase === 'countdown' || handoff) floor += `<p class="cut-cue">${esc(t(handoff ? 'continue' : 'getReady'))}</p><div class="cut-countdown" data-cut-countdown aria-live="off">${countdown(cut, now) || 'GO!'}</div>`;
      else floor += `<p class="cut-cue cut-go">${esc(t('go'))}</p><p class="cut-soft">${esc(t(personal || !actor ? 'speakHint' : 'listen'))}</p>`;
    } else {
      const finished = ['finished', 'stopped'].includes(phase);
      const title = phase === 'paused' ? 'paused' : finished ? 'finished' : 'breakTitle';
      const hint = phase === 'paused' ? cut.pauseReason === 'not_enough_players' ? 'not_enough_players' : 'pausedHint' : finished ? 'finishedHint' : 'breakHint';
      floor = `<div class="cut-rest"><span aria-hidden="true">${phase === 'paused' ? 'Ⅱ' : finished ? '✂️' : '☕'}</span><h3>${esc(t(title))}</h3><p class="cut-soft">${esc(t(hint))}</p></div>`;
    }
    const excluded = actor && list(cut.roster).find(p => Number(p.playerNum) === Number(actor))?.active === false;
    return `<div class="cut-stage${isCut ? ' cut-is-cut' : ''}${personal && inPlay ? ' cut-is-you' : ''}" data-cut-phase="${esc(phase)}">
      <div class="cut-topic"><p class="cut-kicker">${esc(t('topic'))}</p><h2>${esc(cut.topic?.question || '')}</h2></div>
      <div class="cut-floor" role="status" aria-live="polite">${floor}</div>
      ${excluded ? `<p class="cut-soft cut-sitting-out">${esc(t('sittingOut'))}</p>` : ''}
    </div>`;
  }
  function speaker(cut, num, label, personal, extra = '') {
    return `<div class="cut-speaker ${extra}"><p class="cut-kicker">${esc(label)}</p><h3>${esc(name(cut, num))}</h3>${personal ? `<span class="cut-you">${esc(t('you'))}</span>` : ''}</div>`;
  }

  class Card {
    constructor(element, { now = () => Date.now(), connected = () => true, nameBanner = () => '' } = {}) {
      this.element = element; this.now = now; this.connected = connected; this.nameBanner = nameBanner;
      this.data = null; this.destroyed = false; this.renderKey = '';
      this.timer = setInterval(() => this.paint(), 150);
    }
    update(data) {
      if (this.destroyed || !data?.cut) return;
      this.data = data;
      const cut = data.cut;
      const key = JSON.stringify([typeof I18N !== 'undefined' ? I18N.lang : '', data.name, data.playerNum, cut.sessionId, cut.turnId, cut.phase, cut.topic, cut.speaker, cut.nextSpeaker, cut.cutEvent, cut.roster]);
      if (this.renderKey !== key) {
        this.renderKey = key;
        this.element.innerHTML = `<div class="secret-card cut-player">${this.nameBanner(data)}<span class="cut-kicker cut-brand">✂️ CUT!</span><div class="cut-player-scene">${scene(cut, data.playerNum, this.now())}</div><p class="cut-feedback" data-cut-connection role="status"></p></div>`;
      }
      this.paint();
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const now = this.now(), cut = this.data.cut;
      const clock = this.element.querySelector('[data-cut-countdown]');
      if (clock) clock.textContent = countdown(cut, now) || 'GO!';
      const connection = this.element.querySelector('[data-cut-connection]');
      if (connection) connection.textContent = !this.connected() ? t('offline') : cut.hostLiveUntil && now > cut.hostLiveUntil ? t('hostAway') : '';
    }
    destroy() { clearInterval(this.timer); this.data = null; this.destroyed = true; }
  }

  /* Cues are synthesized locally, with no asset downloads or microphone use.
     Only the host creates a Sound instance. Players never play automatic cues. */
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
          else if (cut.phase === 'speaking' && ['countdown', 'handoff'].includes(previous?.phase)) this.cue('go');
          else if (cut.phase === 'countdown' && (fresh || previous?.phase !== 'countdown' || previous?.sessionId !== cut.sessionId)) this.cue('round');
          else if (['paused', 'finished', 'stopped'].includes(cut.phase)) this.silence();
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
