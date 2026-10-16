/* Bomb Relay presentation shared by the host screen and every player card.
 * It only ever reads the public projection from BOMB_RELAY_ENGINE.view():
 * no fuse length, remaining time or seed is available here. */
var BOMB_RELAY_UI = (() => {
  'use strict';
  const dict = {
    brand: ['BOMB RELAY', 'BOMB RELAY'], subtitle: ['一個答案，傳給下一位。', 'One answer. Pass it on.'],
    setupLead: ['共用一題，輪流傳炸彈。', 'One shared prompt. One moving bomb.'],
    intro: ['看題目，說一個合理的答案，然後傳炸彈。爆炸時間是秘密。', 'Read the prompt. Say one fitting answer, then pass. The fuse stays secret.'],
    fuse: ['炸彈節奏', 'Bomb pace'], fast: ['Fast · 快速', 'Fast'], normal: ['Normal · 標準', 'Normal'], chill: ['Chill · 悠閒', 'Chill'],
    scaleWithPlayers: ['依參與人數調整', 'Scale with participants'],
    scaleHint: ['只計算有傳遞資格的玩家。超過 3 人，每人加 10 秒，最多算到 8 人。', 'Only players eligible to pass count. Above 3 players, add 10 seconds each, up to 8.'],
    timingRange: ['{n} 位參與者 · {mode} 一般範圍 {min}–{max} 秒', '{n} participants · {mode} range: {min}–{max} seconds'],
    timingBaseline: ['2–3 人基準預覽 · {mode} {min}–{max} 秒', '2–3 player baseline preview · {mode} {min}–{max} seconds'],
    timingCapped: ['已達 8 人的加時上限。', 'Participant scaling is capped at 8.'],
    timingLegacy: ['保留舊版 {min}–{max} 秒；變更節奏或人數調整後套用新範圍。', 'Keeping the previous {min}–{max} second range. Changing pace or scaling applies the new ranges.'],
    timingNext: ['下次點燃時生效；已點燃的炸彈時間不變。', 'Applies at the next ignition. A lit bomb keeps its time.'],
    timingManage: ['下一顆炸彈的節奏', 'Pace for the next bomb'],
    cards: ['這局幾張卡', 'Cards in this game'], cardsN: ['{n} 張', '{n} cards'],
    category: ['題包', 'Prompt pack'], mixed: ['混合', 'Mixed'], everyday: ['日常聯想', 'Everyday'], playful: ['趣味聯想', 'Playful'],
    start: ['開始遊戲', 'Start Bomb Relay'], noPressure: ['一個詞就夠，搞笑隨意。', 'One word is enough. Funny is optional.'],
    soundHint: ['滴答聲與爆炸聲由這個主持頁播放。共用畫面時請分享電腦音訊。', 'This host screen plays the ticking and the BOOM. Share computer audio when you share your screen.'],
    cardOf: ['第 {n}／{total} 張', 'CARD {n} / {total}'], answers: ['已說 {n} 個', '{n} answers'], answer: ['已說 {n} 個', '{n} answer'],
    prompt: ['這輪題目', 'THIS ROUND’S PROMPT'], legacyPrompt: ['說出一樣這裡會有的東西', 'Name something you can find here.'],
    promptUnavailable: ['題目無法載入，請重新整理。', 'The prompt is unavailable. Please reload.'],
    starter: ['先開始', 'STARTS THIS CARD'], readyHint: ['大家先看清楚題目。{name} 點燃引信後說出第一個答案。', 'Read the prompt together. {name} lights the fuse and says the first answer.'],
    reroll: ['換一題', 'Change prompt'],
    holdsTitle: ['目前持有者', 'CURRENT HOLDER'], holdsHint: ['說一個符合的答案，再傳出去。', 'Say one fitting answer, then pass.'], next: ['下一位：{name}', 'Next: {name}'],
    bounced: ['{by} 說不算，炸彈退回 {to}。請換一個答案。', '{by} said that didn’t count. Back to {to}; say a different answer.'],
    bouncedHost: ['不算，退回 {to}', 'Didn’t count; back to {to}'],
    boom: ['BOOM', 'BOOM'], takes: ['拿走這張卡', 'takes this card'], boomPasses: ['本輪答案：{n}', 'Answers this round: {n}'],
    boomLast: ['這是最後一張。', 'That was the last card.'], nextCard: ['下一張', 'Next card'], showResults: ['看結果', 'See the results'],
    discussionHint: ['聊聊剛才的答案，準備好也可以繼續。', 'Chat about those answers. Move on whenever you’re ready.'],
    paused: ['已暫停', 'PAUSED'], pausedHint: ['引信暫停中，主持人準備好就會繼續。', 'The fuse is frozen. The host will resume when everyone is ready.'],
    finished: ['本局結束', 'Game complete'], stoppedEarly: ['主持人提早結束了這局。', 'The host ended this game early.'],
    winnerHint: ['炸彈卡最少的人獲勝', 'Fewest bomb cards wins'], winner: ['優勝者', 'Winner'], winners: ['並列優勝', 'Joint winners'],
    count: ['卡片 {n}', 'Cards: {n}'], none: ['沒有炸彈卡', 'No bomb cards'],
    you: ['你', 'YOU'], out: ['休息中', 'Sitting out'],
    light: ['點燃引信', 'Light the fuse'], lightFor: ['代 {name} 點燃', 'Light it for {name}'], passFor: ['代 {name} 傳出', 'Pass for {name}'],
    pass: ['傳給 {name}', 'Pass to {name}'], passing: ['傳送中…', 'Passing…'],
    youHave: ['炸彈由你持有', 'You have the bomb'], youHaveHint: ['說一個符合的答案，然後傳。', 'Say one fitting answer, then pass.'],
    youNext: ['下一位是你，先想好答案。', 'You’re next. Think of an answer.'], otherHolds: ['炸彈在 {name} 手上', '{name} has the bomb'],
    youStart: ['由你開始', 'You start'], youStartHint: ['等大家看清楚題目，點燃引信並說出第一個答案。', 'Once everyone has read the prompt, light the fuse and say the first answer.'],
    waitStart: ['等 {name} 點燃引信…', 'Waiting for {name} to light the fuse…'],
    bounce: ['不算，退回 {name}', 'Didn’t count; back to {name}'], bounceHint: ['只針對明顯重複或離題；具體延伸不一定算重複。', 'For clear repeats or off-topic answers; a specific elaboration can still count.'],
    youBoom: ['你拿到這張卡', 'You take this card'], otherBoom: ['{name} 拿到這張卡', '{name} takes this card'],
    yourCards: ['你的炸彈卡', 'Your bomb cards'], yourRank: ['你是第 {n} 名', 'You placed #{n}'],
    soundOn: ['音效開啟', 'Sound on'], soundOff: ['音效關閉', 'Sound off'], enableSound: ['啟用音效', 'Enable sound'],
    cardSound: ['手機滴答聲', 'Tick on my phone'], cardSoundOff: ['手機靜音', 'Phone silent'], cardSoundHint: ['只在你的裝置播放；通話中可能被麥克風收到。', 'Plays only on this device; your call mic may pick it up.'],
    soundBlocked: ['按「啟用音效」讓瀏覽器播放提示音。', 'Tap “Enable sound” to allow the browser to play cues.'], soundUnsupported: ['這個瀏覽器無法播放音效，請看畫面。', 'This browser can’t play sound. Follow the screen.'],
    pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], manage: ['主持管理', 'Host controls'], close: ['關閉', 'Close'],
    restart: ['重新開始（新的一局）', 'Restart with a new game'], stop: ['結束遊戲', 'End game'], playAgain: ['再玩一局', 'Play again'], settings: ['更改設定', 'Change settings'],
    rosterHint: ['離開語音的人可以先休息，炸彈會略過他。', 'Let someone sit out if they leave the call; the bomb skips them.'],
    sitOut: ['先休息', 'Sit out'], rejoin: ['回來玩', 'Join again'], playing: ['遊戲中', 'Playing'],
    rules: ['怎麼玩', 'How to play'],
    rule1: ['全場先看清楚同一題，主持人可以在點燃前換題。持有者（或主持人）點燃引信後，這顆炸彈全程用同一題。', 'Read the same prompt together. The host can change it before the holder (or host) lights the fuse. One prompt stays for the whole bomb.'],
    rule2: ['說一個符合題目的普通答案就能按「傳」。單字、人物、動作、短語、台詞、簡單英文描述都可以，不要求完整文法。搞笑隨意，不加分。', 'Say one fitting answer and tap PASS. A word, person, action, phrase, line or simple English description counts. Full grammar is optional. Funny earns no extra points.'],
    rule3: ['同一輪避免明顯重複；具體延伸不自動算重複，下一輪可以再用。若明顯重複或離題，其他玩家可沿用「不算」退回，炸彈仍繼續跑。', 'Avoid clear repeats this round; specific elaborations can count, and the next round starts fresh. For clear repeats or off-topic answers, another player can send it back while the fuse keeps running.'],
    rule4: ['引信長度是秘密，隨機爆炸。爆炸時持有者拿走這張卡。接著留 45 秒聊聊剛才的答案，也可以提前按「下一張」。下一張出現後，再手動點燃。', 'The fuse is secret and random. Whoever holds the bomb when it explodes takes the card. Chat for 45 seconds, or move on early. The next card waits for someone to light the fuse.'],
    rule5: ['全部卡片玩完，炸彈卡最少的人獲勝。', 'After the last card, the fewest bomb cards wins.'],
    rule6: ['想不到可以繼續想，炸彈照常跑。傳遞不換題、不重新計時。可以用生活常識或想像，不需要說自己的經驗。', 'Keep thinking if you get stuck; the bomb keeps running. Passing keeps the same prompt and fuse. Everyday knowledge or imagination is enough; personal stories are optional.'],
    library: ['查看題庫', 'Browse the prompts'], libraryCount: ['共 {n} 題', '{n} prompts'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'], demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the hub first.'], setUpRoom: ['設定房間與玩家', 'Set up room & players'],
    room: ['房間 {code}', 'Room {code}'], player: ['玩家 {n}', 'Player {n}'],
    offline: ['連線暫時中斷，正在重新連線…', 'Connection lost. Reconnecting…'], connecting: ['正在連線…', 'Connecting…'], ready: ['', ''],
    hostAway: ['等待主持頁重新連線…', 'Waiting for the host screen to reconnect…'],
    other_host: ['另一個主持頁正在控制房間。關閉那頁後，這裡會接續。', 'Another host tab is controlling this room. Close it to continue here.'],
    switched: ['房間已切換到其他遊戲。按「開始遊戲」可以再玩。', 'The room has switched to another game. Tap Start to play again.'],
    noFirebase: ['目前無法連線到玩家卡片，請檢查網路後重新整理。', 'Player cards are unavailable. Check your connection and reload.'],
    roomChanged: ['房間已變更。重新載入此頁以使用新房間。', 'The room changed. Reload this page to use the new room.'],
    not_enough_players: ['至少要有兩位玩家在遊戲中。', 'At least two players must be playing.'],
    invalid_roster: ['請先在主選單設定 2–9 位玩家。', 'Set up 2–9 players in the hub first.'],
    invalid_options: ['請選擇有效的設定。', 'Choose valid settings.'],
    stale_turn: ['炸彈已經移動了，請看最新畫面。', 'The bomb already moved. Follow the latest screen.'],
    too_late: ['來不及了，已經爆炸！', 'Too late — it exploded!'],
    not_available: ['這個動作目前無法使用，請依最新畫面操作。', 'That isn’t available right now. Follow the current screen.'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check your connection and try again.'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('bomb', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => typeof I18N !== 'undefined' ? I18N.lang : 'en';
  const t = (key, vars = {}) => {
    const raw = typeof I18N !== 'undefined' ? I18N.t('bomb', key) : (dict[key] ? dict[key][1] : key);
    return String(raw).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  };
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const deck = () => BOMB_RELAY_DECK;
  const colorOf = () => '#c2b9aa';
  const seatsOf = bomb => list(bomb?.roster).slice().sort((a, b) => a.playerNum - b.playerNum);
  const nameOf = (bomb, n) => seatsOf(bomb).find(p => p.playerNum === n)?.name || t('player', { n });
  const errorKey = code => ['stale_turn', 'too_late', 'not_available', 'not_enough_players', 'invalid_options', 'invalid_roster'].includes(code) ? code : 'error';

  function bombIcon() {
    return '<span class="br-object" aria-hidden="true"><span class="br-object-shadow"></span><span class="br-object-fuse"></span><span class="br-object-lid"></span><span class="br-object-shell"></span><span class="br-object-spark"></span></span>';
  }
  function burstMark() {
    return `<div class="br-burst" aria-hidden="true"><span class="br-fire">${'<span class="br-flame"></span>'.repeat(6)}</span><strong>${esc(t('boom'))}</strong></div>`;
  }

  function sceneTitle(cardId, size = '') {
    const card = deck().get(cardId);
    if (!card) return `<div class="br-scene-title ${size}"><p role="status">${esc(t('promptUnavailable'))}</p></div>`;
    const english = card.pack ? card.en : `${dict.legacyPrompt[1]} ${card.en}`;
    return `<div class="br-scene-title ${size}" data-br-prompt-id="${esc(card.id)}"><span class="br-kicker">${esc(t('prompt'))}</span><h2 lang="en">${esc(english)}</h2>${lang() === 'zh' ? `<p class="br-zh" lang="zh-Hant">${esc(card.zhHant || card.zh)}</p>` : ''}</div>`;
  }
  function thumbs(cardIds, max = 6) {
    const ids = list(cardIds);
    const shown = ids.slice(-max).map(id => { const card = deck().get(id); return card ? `<span class="br-taken-card" title="${esc(card.en)}" aria-label="${esc(card.en)}">${bombIcon()}</span>` : ''; }).join('');
    return ids.length ? `<span class="br-thumbs">${shown}${ids.length > max ? `<span class="br-thumbs-more">+${ids.length - max}</span>` : ''}</span>` : '';
  }
  function strip(bomb) {
    const parts = [`<span class="br-pill">${esc(t('cardOf', { n: bomb.cardNo, total: bomb.cardsTotal }))}</span>`];
    if (['ticking', 'paused'].includes(bomb.phase) || bomb.passes) parts.push(`<span class="br-pill">${esc(t(bomb.passes === 1 ? 'answer' : 'answers', { n: bomb.passes || 0 }))}</span>`);
    return `<div class="br-strip">${parts.join('')}</div>`;
  }
  // Seat order is the pass direction, so the row itself shows where it goes.
  function seats(bomb, me) {
    const penalties = Object.fromEntries((bomb.standings || []).map(row => [row.playerNum, row.cards]));
    return `<ol class="br-seats" aria-label="Players">${seatsOf(bomb).map(player => {
      const cls = ['br-seat', player.playerNum === bomb.holder ? 'is-holder' : '', player.playerNum === bomb.next ? 'is-next' : '',
        player.active ? '' : 'is-out', player.playerNum === me ? 'is-me' : '', bomb.boom?.loser === player.playerNum ? 'is-boom' : ''].filter(Boolean).join(' ');
      const marker = player.playerNum === bomb.holder ? `<span class="br-seat-bomb" aria-hidden="true">${bombIcon()}</span>` : '';
      return `<li class="${cls}" style="--seat:${colorOf(player.playerNum)}">${marker}<span class="br-seat-name">${esc(player.name || t('player', { n: player.playerNum }))}${player.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><span class="br-seat-count">${player.active ? esc(t('count', { n: player.count })) : esc(t('out'))}</span>${thumbs(penalties[player.playerNum], 4)}</li>`;
    }).join('')}</ol>`;
  }
  function standings(bomb, me) {
    const rows = list(bomb.standings);
    const lead = rows.filter(row => row.leading);
    let rank = 0, last = -1;
    const items = rows.map((row, index) => {
      if (row.count !== last) { rank = index + 1; last = row.count; }
      return `<li class="br-rank${row.leading ? ' is-winner' : ''}${row.playerNum === me ? ' is-me' : ''}" style="--seat:${colorOf(row.playerNum)}"><span class="br-rank-n">${rank}</span><span class="br-rank-name">${esc(row.name || t('player', { n: row.playerNum }))}${row.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><span class="br-rank-count">${esc(t('count', { n: row.count }))}</span>${row.count ? thumbs(row.cards, 5) : `<span class="br-rank-none">${esc(t('none'))}</span>`}</li>`;
    }).join('');
    return `<div class="br-final"><p class="br-kicker">${esc(t(lead.length > 1 ? 'winners' : 'winner'))} · ${esc(t('winnerHint'))}</p><h2 class="br-final-title">${esc(t('finished'))}</h2>${bomb.stopped ? `<p class="br-soft">${esc(t('stoppedEarly'))}</p>` : ''}<ol class="br-ranks">${items}</ol></div>`;
  }
  function bounceNote(bomb) {
    if (bomb.phase !== 'ticking' || !bomb.bounce) return '';
    return `<p class="br-bounce" role="status">${esc(t('bounced', { by: nameOf(bomb, bomb.bounce.by), to: nameOf(bomb, bomb.bounce.to) }))}</p>`;
  }
  function bombMark(phase) {
    const live = phase === 'ticking';
    return `<div class="br-bomb${live ? ' is-live' : ''}${phase === 'paused' ? ' is-paused' : ''}" aria-hidden="true">${bombIcon()}</div>`;
  }

  // The shared host screen: the prompt, who holds the bomb, everyone's pile.
  function stage(bomb, { animate = true } = {}) {
    if (!bomb) return '';
    if (bomb.phase === 'finished') return `<div class="br-stage br-phase-finished">${standings(bomb, 0)}</div>`;
    const holder = bomb.holder != null ? nameOf(bomb, bomb.holder) : '';
    let focus = '';
    if (bomb.phase === 'ready') focus = `${bombMark('ready')}<p class="br-kicker">${esc(t('starter'))}</p><h3 class="br-who" style="--seat:${colorOf(bomb.holder)}">${esc(holder)}</h3><p class="br-hint">${esc(t('readyHint', { name: holder }))}</p>`;
    else if (bomb.phase === 'ticking') focus = `${bombMark('ticking')}<p class="br-kicker">${esc(t('holdsTitle'))}</p><h3 class="br-who" style="--seat:${colorOf(bomb.holder)}">${esc(holder)}</h3><p class="br-hint">${esc(t('holdsHint'))}</p>${bomb.next ? `<p class="br-next" style="--seat:${colorOf(bomb.next)}">${esc(t('next', { name: nameOf(bomb, bomb.next) }))}</p>` : ''}${bounceNote(bomb)}`;
    else if (bomb.phase === 'paused') focus = `${bombMark('paused')}<p class="br-kicker">${esc(t('paused'))}</p><h3 class="br-who" style="--seat:${colorOf(bomb.holder)}">${esc(holder)}</h3><p class="br-hint">${esc(t('pausedHint'))}</p>`;
    else if (['boom', 'discussion'].includes(bomb.phase)) {
      const loser = nameOf(bomb, bomb.boom?.loser);
      focus = `${burstMark()}<h3 class="br-who" style="--seat:${colorOf(bomb.boom?.loser)}">${esc(loser)}</h3><p class="br-hint">${esc(t('takes'))}</p><p class="br-soft">${esc(t(bomb.boom?.last ? 'boomLast' : 'boomPasses', { n: bomb.boom?.passes || 0 }))}</p>${bomb.phase === 'discussion' ? `<p class="br-soft br-discussion-note">${esc(t('discussionHint'))}</p>` : ''}`;
    }
    const cls = ['br-stage', `br-phase-${bomb.phase}`, bomb.phase === 'boom' && animate ? 'br-exploding' : '', !animate || bomb.phase === 'discussion' ? 'br-static' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">${strip(bomb)}<div class="br-main"><div class="br-scene">${sceneTitle(bomb.boom?.cardId || bomb.cardId)}</div><div class="br-focus">${focus}</div></div>${seats(bomb, 0)}</div>`;
  }

  // Approved recorded tick and bass-reduced explosion. Cadence is fixed and
  // independent of the secret fuse. Original pass/bounce cues are retained.
  class Sound {
    constructor(onChange = () => {}) {
      this.onChange = onChange; this.enabled = true; this.context = null; this.blocked = false;
      this.unsupported = typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext);
      this.loop = null; this.lastBoom = ''; this.lastTurn = null; this.session = '';
      this.buffers = new Map(); this.sources = new Map();
    }
    ensure() {
      if (this.unsupported || !this.enabled) return null;
      if (!this.context) { try { this.context = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { this.unsupported = true; this.onChange(); return null; } }
      if (this.context.state === 'suspended') this.context.resume().then(() => { this.blocked = false; this.onChange(); }).catch(() => { this.blocked = true; this.onChange(); });
      return this.context;
    }
    async toggle() {
      if (this.enabled && this.context && this.context.state !== 'running') { this.ensure(); return; }
      this.enabled = !this.enabled;
      if (this.enabled) this.ensure(); else { this.stopLoop(); this.stopCues(); }
      this.onChange();
    }
    tone(freq, duration, { type = 'square', gain = .08, slide = 0, delay = 0 } = {}) {
      const ctx = this.ensure(); if (!ctx || ctx.state !== 'running') return;
      const start = ctx.currentTime + delay, osc = ctx.createOscillator(), amp = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, start);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
      amp.gain.setValueAtTime(gain, start); amp.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(amp).connect(ctx.destination); osc.start(start); osc.stop(start + duration + .02);
      this.track(osc, amp, 'tone');
    }
    track(source, amp, kind) {
      this.sources.set(source, { amp, kind });
      source.onended = () => { this.sources.delete(source); source.disconnect(); amp.disconnect(); };
    }
    cue(kind) {
      const ctx = this.ensure(); if (!ctx || ctx.state !== 'running') return;
      if (!this.buffers.has(kind)) {
        const samples = BOMB_RELAY_AUDIO.getSamples(kind, ctx.sampleRate);
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples, 0); this.buffers.set(kind, buffer);
      }
      const src = ctx.createBufferSource(), amp = ctx.createGain();
      src.buffer = this.buffers.get(kind); amp.gain.value = BOMB_RELAY_AUDIO.gain;
      src.connect(amp).connect(ctx.destination); this.track(src, amp, kind); src.start();
    }
    stopCues(kind = null) {
      for (const [source, cue] of this.sources) if (!kind || cue.kind === kind) {
        try {
          const at = this.context.currentTime;
          cue.amp.gain.cancelScheduledValues(at); cue.amp.gain.setTargetAtTime(0, at, .008);
          source.stop(at + .03);
        } catch (_) {}
      }
    }
    tick() { this.cue('tick'); }
    pass() { this.tone(520, .09, { type: 'triangle', gain: .09, slide: 380 }); }
    bounce() { this.tone(660, .12, { type: 'sawtooth', gain: .06, slide: -320 }); }
    boom() { this.cue('boom'); }
    startLoop() { if (!this.loop && this.enabled) this.loop = setInterval(() => this.tick(), BOMB_RELAY_AUDIO.cadenceMs); }
    stopLoop() { clearInterval(this.loop); this.loop = null; this.stopCues('tick'); }
    // Called with every projection; only real changes make a sound.
    follow(bomb) {
      if (!bomb) { this.stopLoop(); return; }
      if (bomb.sessionId !== this.session) { this.session = bomb.sessionId; this.lastBoom = bomb.boom?.id || ''; this.lastTurn = null; }
      if (bomb.phase === 'ticking' && this.enabled) this.startLoop(); else this.stopLoop();
      if (bomb.phase === 'boom' && bomb.boom?.id && bomb.boom.id !== this.lastBoom) { this.lastBoom = bomb.boom.id; this.boom(); }
      if (bomb.phase === 'ticking' && this.lastTurn != null && bomb.turnId !== this.lastTurn) bomb.bounce ? this.bounce() : this.pass();
      this.lastTurn = bomb.phase === 'ticking' ? bomb.turnId : null;
    }
    close() { this.stopLoop(); this.stopCues(); try { this.context?.close(); } catch (_) {} this.context = null; this.buffers.clear(); }
  }

  // ── player card ─────────────────────────────────────────────────────────
  class Card {
    constructor(element, { now = () => Date.now(), connected = () => true, nameBanner = () => '', send = null } = {}) {
      this.element = element; this.now = now; this.connected = connected; this.nameBanner = nameBanner; this.send = send;
      this.data = null; this.destroyed = false; this.renderKey = ''; this.pending = null; this.error = ''; this.wasHolder = false;
      this.sound = new Sound(() => this.paintSound()); this.sound.enabled = false;
      this.click = event => {
        if (event.target.closest('[data-br-sound]')) { this.sound.toggle().then(() => { this.sound.follow(this.data?.bomb); this.paintSound(); }); return; }
        const button = event.target.closest('[data-br-action]');
        if (button && !button.disabled) this.action(button.dataset.brAction);
      };
      this.element.addEventListener('click', this.click);
      this.timer = setInterval(() => this.paint(), 500);
    }
    action(type) {
      const bomb = this.data?.bomb;
      if (!bomb || !this.send || this.pending || !this.connected()) return;
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      this.pending = { id, type, sessionId: bomb.sessionId, turnId: bomb.turnId };
      this.error = '';
      if (type === 'pass') this.sound.pass();
      this.renderKey = ''; this.update(this.data);
      Promise.resolve(this.send({ id, type, sessionId: bomb.sessionId, turnId: bomb.turnId })).catch(error => {
        if (this.pending?.id !== id) return;
        this.pending = null; this.error = t(errorKey(error?.message === 'stale_turn' ? 'stale_turn' : 'error'));
        this.renderKey = ''; this.update(this.data);
      });
    }
    update(data) {
      if (this.destroyed || !data?.bomb) return;
      const bomb = data.bomb, previous = this.data?.bomb;
      this.data = data;
      let replied = false;
      if (this.pending && bomb.reply?.id === this.pending.id) {
        // "Too late" needs no message: the explosion itself says it.
        this.error = bomb.reply.error && bomb.reply.error !== 'too_late' ? t(errorKey(bomb.reply.error)) : '';
        this.pending = null; replied = true;
      } else if (this.pending && (this.pending.sessionId !== bomb.sessionId || this.pending.turnId !== bomb.turnId)) this.pending = null;
      if (!replied && previous && (previous.sessionId !== bomb.sessionId || previous.turnId !== bomb.turnId)) this.error = '';
      // A short buzz the moment the bomb lands in your hands.
      const holding = bomb.phase === 'ticking' && bomb.holder === data.playerNum;
      const arrived = holding && !this.wasHolder;
      if (arrived) { try { navigator.vibrate?.([90, 40, 90]); } catch (_) {} }
      this.wasHolder = holding;
      this.sound.follow(bomb);
      const key = JSON.stringify([lang(), data.name, data.playerNum, bomb.sessionId, bomb.turnId, bomb.phase, this.pending?.id, this.error]);
      if (key !== this.renderKey) { this.renderKey = key; this.element.innerHTML = this.html(data); this.paintSound(); }
      if (arrived) {
        const button = this.element.querySelector('[data-br-action="pass"]'), box = button?.getBoundingClientRect?.();
        if (box && (box.top < 0 || box.bottom > (window.innerHeight || 0))) {
          // Bring the prompt and its nearby action into view together.
          const prompt = this.element.querySelector('.br-card-scene');
          (prompt || button).scrollIntoView({ block: 'start', behavior: 'instant' });
        }
      }
      this.paint();
    }
    html(data) {
      const bomb = data.bomb, me = data.playerNum, mine = list(bomb.standings).find(row => row.playerNum === me);
      const head = `<div class="br-card-head"><span class="br-kicker br-card-brand">${esc(t('brand'))}</span>${bomb.phase !== 'finished' ? `<span class="br-pill">${esc(t('cardOf', { n: bomb.cardNo, total: bomb.cardsTotal }))}</span>` : ''}</div>`;
      let body = '', theme = '';
      if (bomb.phase === 'finished') body = standings(bomb, me);
      else {
        const sceneId = bomb.boom?.cardId || bomb.cardId;
        const scene = `<div class="br-card-scene">${sceneTitle(sceneId, 'is-compact')}</div>`;
        const { zone, cls } = this.zone(bomb, me);
        theme = cls;
        // A compact text card keeps the prompt and the pass action together.
        body = scene + zone;
      }
      const pile = mine && mine.count && bomb.phase !== 'finished' ? `<div class="br-mine"><span class="br-kicker">${esc(t('yourCards'))} · ${esc(t('count', { n: mine.count }))}</span>${thumbs(mine.cards, 8)}</div>` : '';
      const table = bomb.phase !== 'finished' ? seats(bomb, me) : '';
      return `<div class="secret-card br-card ${theme}">${this.nameBanner(data)}${head}${body}${pile}${table}<div class="br-card-tools"><button type="button" class="br-button br-small" data-br-sound title="${esc(t('cardSoundHint'))}"></button></div><p class="br-feedback" data-br-error role="status">${esc(this.error)}</p><p class="br-feedback" data-br-connection role="status"></p></div>`;
    }
    zone(bomb, me) {
      const holder = bomb.holder, holderName = holder != null ? nameOf(bomb, holder) : '';
      const busy = !!this.pending, out = !list(bomb.roster).find(p => p.playerNum === me)?.active;
      if (bomb.phase === 'ready') {
        if (holder === me) return { cls: 'is-start', zone: `<div class="br-zone br-zone-start">${bombMark('ready')}<h3>${esc(t('youStart'))}</h3><p>${esc(t('youStartHint'))}</p><button type="button" class="br-button br-primary br-huge" data-br-action="light"${bomb.canLight && !busy ? '' : ' disabled'}>${esc(t('light'))}</button></div>` };
        return { cls: '', zone: `<div class="br-zone"><p class="br-zone-line">${esc(t('waitStart', { name: holderName }))}</p></div>` };
      }
      if (bomb.phase === 'ticking') {
        const bounce = bomb.canBounce && bomb.lastPass ? `<div class="br-challenge"><button type="button" class="br-button br-bounce-btn" data-br-action="bounce"${busy ? ' disabled' : ''}>${esc(t('bounce', { name: nameOf(bomb, bomb.lastPass.from) }))}</button><p class="br-soft">${esc(t('bounceHint'))}</p></div>` : '';
        const note = bounceNote(bomb);
        if (holder === me) return { cls: 'is-holder', zone: `<div class="br-zone br-zone-hot"><div class="br-hot-head">${bombMark('ticking')}<h3>${esc(t('youHave'))}</h3></div><p>${esc(t('youHaveHint'))}</p>${note}<button type="button" class="br-button br-pass br-huge" data-br-action="pass"${bomb.canPass && !busy ? '' : ' disabled'}>${esc(busy && this.pending.type === 'pass' ? t('passing') : t('pass', { name: nameOf(bomb, bomb.next) }))}</button></div>${bounce}` };
        if (bomb.next === me) return { cls: 'is-next', zone: `<div class="br-zone br-zone-next"><p class="br-zone-line">${esc(t('otherHolds', { name: holderName }))}</p><h3>${esc(t('youNext'))}</h3>${note}</div>${bounce}` };
        return { cls: '', zone: `<div class="br-zone"><p class="br-zone-line">${esc(t('otherHolds', { name: holderName }))}</p>${bomb.next ? `<p class="br-soft">${esc(t('next', { name: nameOf(bomb, bomb.next) }))}</p>` : ''}${note}${out ? `<p class="br-soft">${esc(t('out'))}</p>` : ''}</div>${bounce}` };
      }
      if (bomb.phase === 'paused') return { cls: '', zone: `<div class="br-zone">${bombMark('paused')}<h3>${esc(t('paused'))}</h3><p>${esc(t('pausedHint'))}</p></div>` };
      if (['boom', 'discussion'].includes(bomb.phase)) {
        const lost = bomb.boom?.loser === me;
        const nextLabel = bomb.boom?.last ? t('showResults') : t('nextCard');
        return { cls: lost ? 'is-boom' : '', zone: `<div class="br-zone br-zone-boom${lost ? ' is-you' : ''}${bomb.phase === 'discussion' ? ' br-static' : ''}">${burstMark()}<h3>${esc(lost ? t('youBoom') : t('otherBoom', { name: nameOf(bomb, bomb.boom?.loser) }))}</h3><p class="br-soft">${esc(t(bomb.boom?.last ? 'boomLast' : 'boomPasses', { n: bomb.boom?.passes || 0 }))}</p>${bomb.phase === 'discussion' ? `<p class="br-soft br-discussion-note">${esc(t('discussionHint'))}</p>` : ''}${bomb.canNext ? `<button type="button" class="br-button" data-br-action="next"${busy ? ' disabled' : ''}>${esc(nextLabel)}</button>` : ''}</div>` };
      }
      return { cls: '', zone: '' };
    }
    paintSound() {
      const button = this.element.querySelector('[data-br-sound]'); if (!button) return;
      button.textContent = this.sound.enabled ? t('cardSound') : t('cardSoundOff');
      button.setAttribute('aria-pressed', String(this.sound.enabled));
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const bomb = this.data.bomb, line = this.element.querySelector('[data-br-connection]');
      if (line) line.textContent = !this.connected() ? t('offline') : bomb.hostLiveUntil && this.now() > bomb.hostLiveUntil + 4000 ? t('hostAway') : '';
    }
    destroy() { this.destroyed = true; clearInterval(this.timer); this.sound.close(); this.element.removeEventListener('click', this.click); }
  }

  function libraryHTML(category = 'mixed') {
    return deck().pool(category).map(card => `<article class="br-library-card" data-br-prompt-id="${esc(card.id)}"><span class="br-kicker">${esc(t(card.pack))}</span><strong lang="en">${esc(card.en)}</strong>${lang() === 'zh' ? `<span lang="zh-Hant">${esc(card.zhHant || card.zh)}</span>` : ''}</article>`).join('');
  }

  return { t, esc, list, stage, standings, seats, sceneTitle, Sound, Card, libraryHTML, colorOf, nameOf, errorKey };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_UI;
