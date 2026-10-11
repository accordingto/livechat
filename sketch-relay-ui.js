/* Sketch Relay presentation shared by the host screen and the player cards.
 * Everything rendered here comes from filtered views; nothing secret is
 * fetched or inferred. The drawing pad keeps its own DOM node so syncing
 * other players' progress never interrupts someone who is drawing. */
var SKETCH_RELAY_UI = (() => {
  'use strict';
  const ART = typeof SKETCH_RELAY_ART !== 'undefined' ? SKETCH_RELAY_ART : null;
  const dict = {
    brand: ['🖍️ SKETCH RELAY', '🖍️ SKETCH RELAY'], tagline: ['畫畫傳話・畫 → 猜 → 傳下去', 'DRAW · GUESS · PASS IT ON'],
    player: ['玩家 {n}', 'Player {n}'], you: ['你', 'you'],
    // word stage
    wordKicker: ['第一步・秘密單字', 'STEP 1 · SECRET WORD'], wordTitle: ['🎲 你的秘密單字', '🎲 Your secret word'],
    wordHint: ['骰子擲出 {n}，所以你的單字是卡片上的第 {n} 個。只有你看得到，不要說出來！', 'The die rolled {n}, so your word is #{n} on your card. Only you can see it — keep it secret!'],
    yourCard: ['你的單字卡', 'Your word card'], readyBtn: ['記住了，我準備好了 ✓', 'Got it — I’m ready ✓'],
    swapBtn: ['不認識這個字？換下一個', 'Don’t know it? Use the next word'], swapsLeft: ['還能換 {n} 次', '{n} changes left'],
    readyDone: ['✅ 準備好了！等其他人…', '✅ You’re ready! Waiting for the others…'],
    // drawing / guessing
    drawKicker: ['輪到你畫', 'YOUR TURN TO DRAW'], guessKicker: ['輪到你猜', 'YOUR TURN TO GUESS'],
    drawOwnTitle: ['✏️ 畫出你的秘密單字', '✏️ Draw your secret word'], drawTitle: ['✏️ 把這個畫出來', '✏️ Draw this'],
    drawHint: ['只能畫圖：不能寫字、數字或符號。時間到會自動交出這一頁。', 'Pictures only: no letters, numbers or symbols. Your page is handed in when time runs out.'],
    drawHintNoTimer: ['只能畫圖：不能寫字、數字或符號。畫好就按交出。', 'Pictures only: no letters, numbers or symbols. Hand it in when you’re done.'],
    guessTitle: ['💭 這張畫是什麼？', '💭 What is this drawing?'],
    guessHint: ['寫下你覺得畫的是什麼。下一位會把你寫的畫出來。', 'Write what you think it shows. The next player will draw your words.'],
    guessPlaceholder: ['用英文寫下你的猜測', 'Type your guess in English'], guessLabel: ['你的猜測', 'Your guess'],
    passBtn: ['完成，傳下去 ➜', 'Done — pass it on ➜'], passTo: ['下一位：{name}', 'Next: {name}'],
    promptWord: ['你的秘密單字', 'Your secret word'], promptTheirWord: ['{name} 的秘密單字', '{name}’s secret word'], promptGuess: ['{name} 寫的', 'Written by {name}'], promptSketch: ['{name} 畫的', 'Drawn by {name}'],
    skippedBefore: ['前一頁被跳過了，所以你看到的是再前一頁。', 'The page before was skipped, so you see the one before it.'],
    doneTitle: ['✅ 交出了！', '✅ Handed in!'], doneHint: ['等大家都完成，每本畫本就會一起傳給下一位。', 'When everyone is done, every sketchbook moves on one seat together.'],
    waitingFor: ['還在等：{names}', 'Still waiting for: {names}'], everyoneDone: ['大家都完成了！', 'Everyone is done!'],
    changeIt: ['修改', 'Change it'], yourPage: ['你交出的這一頁', 'The page you handed in'],
    skippedTitle: ['⏭️ 這一頁跳過了', '⏭️ This page was skipped'], skippedHint: ['這本畫本會直接傳下去。等下一頁就好。', 'This sketchbook moves on without your page. Just wait for the next one.'],
    awayTitle: ['💤 你暫時離開中', '💤 You’re sitting out'], awayHint: ['回來後按「我回來了」，從下一頁開始又會輪到你。', 'Tap “I’m back” to get pages again from the next one.'],
    imBack: ['我回來了', 'I’m back'], stepAway: ['💤 暫時離開', '💤 Sit out'], stepAwayConfirm: ['暫時離開？輪到你的頁會被跳過。', 'Sit out? Your pages will be skipped until you come back.'],
    timeUp: ['時間到！交出中…', 'Time’s up! Handing in…'], seconds: ['{n} 秒', '{n}s'], noTimer: ['不計時', 'No timer'],
    paused: ['⏸ 暫停中', '⏸ Paused'], pausedHint: ['主持人暫停了計時，可以繼續畫。', 'The host paused the clock. You can keep going.'],
    pageOf: ['第 {n} / {total} 頁', 'Page {n} of {total}'], bookOf: ['{name} 的畫本', '{name}’s sketchbook'],
    yourBook: ['你的畫本', 'Your sketchbook'],
    // pad
    pen: ['畫筆', 'Pen'], eraser: ['橡皮擦', 'Eraser'], undo: ['↶ 復原', '↶ Undo'], clear: ['清空', 'Clear'],
    clearConfirm: ['清掉整頁？', 'Clear the whole page?'], size: ['粗細', 'Size'], color: ['顏色', 'Colour'],
    pageFull: ['這一頁畫滿了，可以交出了。', 'This page is full — you can hand it in.'],
    colorNames: ['黑,紅,藍,綠,橘,紫,咖啡', 'black,red,blue,green,orange,purple,brown'],
    // statuses
    st_choosing: ['看單字中', 'Reading'], st_ready: ['準備好', 'Ready'], st_drawing: ['畫圖中', 'Drawing'], st_guessing: ['猜題中', 'Guessing'],
    st_done: ['完成', 'Done'], st_skipped: ['跳過', 'Skipped'], st_away: ['暫離', 'Sitting out'], st_idle: ['', ''],
    players: ['玩家', 'Players'],
    // reveal
    revealKicker: ['揭曉時間', 'REVEAL TIME'], revealTitle: ['📖 {name} 的畫本', '📖 {name}’s sketchbook'],
    revealYours: ['📖 輪到你翻開畫本！', '📖 Show your sketchbook!'],
    revealHint: ['一頁一頁翻給大家看。先唸出你的秘密單字，再看看它怎麼變了！', 'Show one page at a time. Read out your secret word, then see how it changed!'],
    revealWatch: ['{name} 正在一頁一頁翻開畫本。', '{name} is showing their sketchbook, one page at a time.'],
    revealHost: ['可以由畫本主人在自己的卡片上翻頁，也可以在這裡翻。', 'The owner can turn pages on their own card, or you can turn them here.'],
    nextPage: ['翻下一頁 ▶', 'Next page ▶'], showAll: ['全部翻開', 'Show all pages'],
    nextBook: ['下一本畫本 ▶▶', 'Next sketchbook ▶▶'], seeResults: ['看結果 🏆', 'See the results 🏆'],
    bookCount: ['畫本 {n} / {total}', 'Sketchbook {n} of {total}'],
    secretWord: ['🔒 秘密單字', '🔒 Secret word'], drew: ['✏️ {name} 畫', '✏️ {name} drew'], guessed: ['💭 {name} 猜', '💭 {name} guessed'],
    skippedPage: ['⏭️ {name} 跳過了這頁', '⏭️ {name} skipped this page'], blankPage: ['（空白）', '(blank)'],
    favSketch: ['⭐ 最愛的畫', '⭐ Favorite drawing'], favGuess: ['⭐ 最愛的猜測', '⭐ Favorite guess'],
    friendlyHint: ['選一張最愛的畫、一個最愛的猜測，作者各得 1 分。最後猜對秘密單字，畫本主人也得 1 分。', 'Pick a favorite drawing and a favorite guess — each earns its maker 1 point. If the last guess matches the secret word, the owner gets 1 point too.'],
    competitiveHint: ['猜對前面那個字（畫的人想表達的）就 +1，幫他猜對的畫者也 +1。最後猜對秘密單字，畫本主人再 +1。', 'Each guess that matches what the artist was drawing: guesser +1 and artist +1. If the last guess matches the secret word, the owner gets 1 more.'],
    decides: ['{name} 決定', '{name} decides'],
    finalMatch: ['最後的猜測和秘密單字一樣嗎？', 'Does the last guess match the secret word?'], yes: ['一樣 ✓', 'Yes ✓'], no: ['不一樣', 'No'],
    match: ['猜對 ✓', 'Match ✓'], noMatch: ['沒猜對', 'No match'], isMatch: ['猜對了嗎？', 'Correct?'],
    // results
    resultsKicker: ['全部翻完了', 'ALL SKETCHBOOKS SHOWN'], resultsTitle: ['🏆 結果', '🏆 Results'], laughsTitle: ['🎉 全部翻完了！', '🎉 That’s every sketchbook!'],
    laughsHint: ['這一輪不計分。想再玩，主持人可以開始新的一輪。', 'No points this time. The host can start another round.'],
    resultsHint: ['主持人可以開始新的一輪，分數會保留。', 'The host can start another round; scores carry over.'],
    roundPts: ['本輪 +{n}', '+{n} this round'], total: ['總分', 'Total'], winner: ['🥇 贏家', '🥇 Winner'], winners: ['🥇 並列贏家', '🥇 Joint winners'],
    r_favoriteSketch: ['⭐ 最愛的畫', '⭐ favorite drawing'], r_favoriteGuess: ['⭐ 最愛的猜測', '⭐ favorite guess'], r_final: ['🎯 最後猜中', '🎯 last guess matched'],
    r_match: ['✓ 猜對', '✓ correct guess'], r_helped: ['✏️ 畫得被猜中', '✏️ drawing guessed'],
    stoppedTitle: ['遊戲結束', 'Game ended'], stoppedHint: ['主持人結束了這場遊戲。', 'The host ended this game.'],
    round: ['第 {n} 輪', 'Round {n}'],
    // host
    intro: ['每人一個秘密單字：先畫出來，下一位猜，再下一位畫那個猜測……最後一起看看單字變成了什麼！', 'Everyone gets a secret word. Draw it, the next player guesses, the next one draws that guess… then see what your word turned into!'],
    how1: ['🎲 擲骰子決定每個人卡片上的秘密單字', '🎲 A die roll picks each player’s secret word'],
    how2: ['✏️ 把收到的單字或猜測畫出來（有時間限制）', '✏️ Draw the word or guess you receive (against the clock)'],
    how3: ['💭 把收到的畫猜成一個字或短句', '💭 Turn the drawing you receive into a word or phrase'],
    how4: ['📖 畫本回到主人手上，一頁一頁揭曉', '📖 Books come home and are revealed page by page'],
    deckLabel: ['單字', 'Words'], deck_mixed: ['綜合（簡單＋挑戰）', 'Mixed — easy and tricky'], deck_easy: ['簡單：日常東西與動作', 'Easy — everyday things and actions'], deck_tricky: ['挑戰：小場景', 'Tricky — little scenes'],
    timerLabel: ['每頁畫圖時間', 'Drawing time per page'], t45: ['45 秒', '45 seconds'], t60: ['60 秒（原版）', '60 seconds (classic)'], t90: ['90 秒', '90 seconds'], t120: ['2 分鐘', '2 minutes'], t0: ['不計時', 'No timer'],
    scoringLabel: ['計分方式', 'Scoring'], scoring_friendly: ['友善計分（選最愛）', 'Friendly (favorites)'], scoring_competitive: ['競賽計分（猜對得分）', 'Competitive (correct guesses)'], scoring_none: ['不計分，純好玩', 'Just for laughs'],
    start: ['發單字卡、擲骰子 🎲', 'Deal word cards & roll the die 🎲'], playersLine: ['{n} 位玩家・需要 4–9 位', '{n} players · 4–9 needed'],
    needPlayers: ['這個遊戲需要 4–9 位玩家，請回主選單調整人數。', 'This game needs 4–9 players. Change the player count in the hub.'],
    hostWordTitle: ['🎲 骰子擲出 {n}！', '🎲 The die rolled {n}!'], hostWordHint: ['大家在自己的卡片上看第 {n} 個單字，記住了就按「準備好了」。不要說出來！', 'Everyone: find word #{n} on your own card and tap “I’m ready”. Keep it secret!'],
    hostDrawTitle: ['✏️ 大家在畫圖', '✏️ Everyone is drawing'], hostGuessTitle: ['💭 大家在猜', '💭 Everyone is guessing'], hostMixedTitle: ['✏️💭 有人畫、有人猜', '✏️💭 Drawing and guessing'],
    hostPlayHint: ['每個人都完成這一頁後，所有畫本一起傳給下一位。', 'When everyone finishes this page, every sketchbook moves one seat on together.'],
    passOrder: ['畫本傳遞方向', 'Sketchbooks move this way'],
    pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], skipWaiting: ['不等了，跳過未完成的', 'Don’t wait — skip unfinished pages'],
    skipConfirm: ['跳過還沒完成的玩家？他們這一頁會被跳過。', 'Skip the players who are not done? Their page is skipped.'],
    startNow: ['不等了，直接開始畫', 'Start without waiting'], manage: ['玩家管理', 'Players'], end: ['結束遊戲', 'End game'],
    endConfirm: ['確定要結束這場遊戲嗎？', 'End this game now?'], nextRound: ['再玩一輪（保留分數）', 'Play another round (keep scores)'],
    newGame: ['新遊戲（分數歸零）', 'New game (reset scores)'], changeSettings: ['更改設定', 'Change settings'], close: ['關閉', 'Close'],
    gallery: ['所有畫本', 'All sketchbooks'], rosterHint: ['暫時離開的人，輪到他的頁會自動跳過；回來後從下一頁開始。', 'Pages for someone sitting out are skipped; they rejoin from the next page.'],
    sitOut: ['先休息', 'Sit out'], rejoin: ['回來', 'Rejoin'], active: ['參與中', 'Playing'], inactive: ['暫離', 'Sitting out'],
    rules: ['怎麼玩', 'How to play'],
    rule1: ['每人拿到 6 個單字的卡片，擲一次骰子決定大家用第幾個。只有自己看得到。', 'Each player gets a card of six words; one die roll decides which number everyone uses. Only you see yours.'],
    rule2: ['人數是偶數：先畫自己的單字。人數是奇數：單字直接傳給下一位，由他來畫。', 'Even number of players: first draw your own word. Odd number: your word goes straight to the next player, who draws it.'],
    rule3: ['收到單字或猜測就畫圖（不能寫字），收到畫就寫下猜測。每頁完成後，畫本傳給下一位。', 'Receive a word or guess → draw it (no letters). Receive a drawing → write a guess. After each page, every sketchbook moves one seat on.'],
    rule4: ['畫本回到主人手上後，一本一本、一頁一頁揭曉，大家一起笑。', 'When the books come home, reveal them one page at a time and laugh together.'],
    rule5: ['計分可選：友善計分（最愛的畫與猜測）、競賽計分（猜對就得分），或不計分。', 'Scoring is optional: friendly (favorite drawing and guess), competitive (correct guesses) or none.'],
    room: ['房間 {code}', 'Room {code}'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'], demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    demoAuto: ['讓其他玩家自動完成', 'Let the other players finish'], liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the hub first.'], setUpRoom: ['設定房間與玩家', 'Set up room & players'],
    connecting: ['正在連線…', 'Connecting…'], offline: ['連線暫時中斷，正在重新連線…', 'Connection lost. Reconnecting…'], ready: ['', ''],
    other_host: ['另一個主持頁正在控制這個房間。關閉那一頁後，這裡會接手。', 'Another host tab is running this game. Close it and this page takes over.'],
    switched: ['房間已切換到其他遊戲。按「發單字卡」可以再玩。', 'The room switched to another game. Deal word cards to play again.'],
    noFirebase: ['目前無法連線到玩家頁，請檢查網路後重新整理。', 'Player pages are unavailable. Check your connection and reload.'],
    roomChanged: ['房間已變更。重新載入此頁以使用新房間。', 'The room changed. Reload this page to use the new room.'],
    everyoneCards: ['每個人（包括要一起玩的主持人）都用自己的玩家連結畫畫和猜。', 'Everyone — including you, if you play — draws and guesses on their own player link.'],
    hostKeepOpen: ['這個主持頁要保持開啟：遊戲在這裡執行。可以分享這個畫面給大家看進度和揭曉。', 'Keep this host page open — the game runs here. Share this screen so everyone sees progress and the reveal.'],
    hostAway: ['等待主持頁重新連線…你的畫會保留。', 'Waiting for the host page to reconnect… your drawing is kept.'],
    sending: ['送出中…', 'Sending…'],
    stale_turn: ['畫面已更新，請再操作一次。', 'The game moved on. Try again.'], not_available: ['這個動作目前無法使用。', 'That isn’t available right now.'],
    invalid_sketch: ['這張畫無法送出，請再試一次。', 'That drawing could not be sent. Try again.'], invalid_guess: ['請寫 1–40 個字的猜測。', 'Write a guess of 1–40 characters.'],
    not_enough_players: ['至少要有兩位玩家在場。', 'At least two players must stay in.'], invalid_roster: ['需要 4–9 位玩家，請到主選單設定。', 'Set up 4–9 players in the hub.'],
    invalid_options: ['請選擇有效的設定。', 'Choose valid settings.'], error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check your connection and try again.'],
  };
  const registered = typeof I18N !== 'undefined';
  if (registered) I18N.registerDict('sketchrelay', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const t = (key, vars = {}) => {
    let value = registered ? I18N.t('sketchrelay', key) : (dict[key]?.[1] ?? key);
    for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(String(v));
    return value;
  };
  const lang = () => registered ? I18N.lang : 'en';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = value => Array.isArray(value) ? value.filter(v => v != null) : Object.values(value || {});
  const nameOf = (relay, num) => list(relay?.roster).find(p => Number(p.playerNum) === Number(num))?.name || t('player', { n: num });
  const STATUS_ICON = { choosing: '👀', ready: '✅', drawing: '✏️', guessing: '💭', done: '✅', skipped: '⏭️', away: '💤', idle: '' };
  const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sr-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  // ----- small building blocks -----
  function art(artText, label = '', className = 'sr-art') {
    return ART ? ART.svg(artText || '', { label, className }) : '';
  }
  function dieFace(n) {
    const pips = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
      5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] }[n] || [];
    return `<svg class="sr-die" viewBox="0 0 100 100" role="img" aria-label="${esc(String(n))}"><rect x="4" y="4" width="92" height="92" rx="20"/>${pips.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</svg>`;
  }
  function timeLeft(relay, now) {
    if (relay?.phase !== 'play' || !(relay.deadline > 0)) return null;
    const ms = relay.paused ? Number(relay.pausedRemainingMs) || 0 : Math.max(0, relay.deadline - now);
    return { ms, seconds: Math.ceil(ms / 1000), total: (relay.settings?.sketchSeconds || 60) * 1000 };
  }
  function clockText(seconds) { return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'); }
  function timerHTML(relay, now, big = false) {
    const time = timeLeft(relay, now);
    if (!time) return '';
    return `<div class="sr-timer${big ? ' sr-timer-big' : ''}" data-sr-timer><span class="sr-timer-text" data-sr-timer-text>${clockText(time.seconds)}</span><span class="sr-timer-bar"><i data-sr-timer-fill style="width:${Math.max(0, Math.min(100, time.ms / time.total * 100))}%"></i></span></div>`;
  }
  function paintTimer(element, relay, now) {
    const time = timeLeft(relay, now);
    for (const box of element.querySelectorAll('[data-sr-timer]')) {
      if (!time) { box.hidden = true; continue; }
      box.hidden = false;
      const text = box.querySelector('[data-sr-timer-text]'), fill = box.querySelector('[data-sr-timer-fill]');
      const label = relay.paused ? '⏸ ' + clockText(time.seconds) : time.ms <= 0 ? '0:00' : clockText(time.seconds);
      if (text && text.textContent !== label) text.textContent = label;
      if (fill) fill.style.width = Math.max(0, Math.min(100, time.ms / time.total * 100)) + '%';
      box.classList.toggle('is-low', !relay.paused && time.ms <= 10000);
      box.classList.toggle('is-paused', !!relay.paused);
    }
  }
  // Where the current page sits in every book: word → draw → guess → …
  function rail(relay) {
    const steps = Number(relay.steps) || 0;
    const kinds = ['word'];
    for (let s = 0; s < steps; s++) kinds.push(s % 2 === 0 ? 'sketch' : 'guess');
    const current = relay.phase === 'play' ? Number(relay.step) + 1 : relay.phase === 'word' ? 0 : kinds.length;
    const icon = { word: '🔒', sketch: '✏️', guess: '💭' };
    return `<ol class="sr-rail" aria-label="${esc(t('pageOf', { n: Math.min(current + 1, kinds.length), total: kinds.length }))}">${kinds.map((kind, i) =>
      `<li class="sr-rail-step${i < current ? ' is-done' : ''}${i === current ? ' is-now' : ''}" data-kind="${kind}"><span>${icon[kind]}</span></li>`).join('<li class="sr-rail-gap" aria-hidden="true"></li>')}</ol>`;
  }
  function rosterHTML(relay, actor = 0, { title = true } = {}) {
    const rows = list(relay.roster).map(p => {
      const status = p.status || 'idle';
      return `<li class="sr-chip sr-st-${esc(status)}${Number(p.playerNum) === Number(actor) ? ' is-me' : ''}"><span class="sr-chip-icon" aria-hidden="true">${STATUS_ICON[status] || '🙂'}</span><span class="sr-chip-text"><span class="sr-chip-name">${esc(p.name || t('player', { n: p.playerNum }))}</span>${status !== 'idle' ? `<span class="sr-chip-status">${esc(t('st_' + status))}</span>` : ''}</span></li>`;
    }).join('');
    return `${title ? `<p class="sr-kicker sr-roster-title">${esc(t('players'))}</p>` : ''}<ul class="sr-chips">${rows}</ul>`;
  }
  function passOrderHTML(relay) {
    const names = list(relay.roster).map(p => `<span class="sr-pass-name${p.active === false ? ' is-away' : ''}">${esc(p.name)}</span>`);
    return `<div class="sr-pass"><p class="sr-kicker">${esc(t('passOrder'))}</p><div class="sr-pass-row">${names.join('<span class="sr-pass-arrow" aria-hidden="true">→</span>')}<span class="sr-pass-arrow sr-pass-loop" aria-hidden="true">↩</span></div></div>`;
  }
  function waitingNames(relay) {
    return list(relay.roster).filter(p => ['drawing', 'guessing', 'choosing'].includes(p.status)).map(p => p.name);
  }

  // ----- pages and books -----
  function pageHTML(page, { owner, awards, scoring, presenter = false, book = 0, latest = false, final = -1 } = {}) {
    const kind = page.kind, by = page.byName || '';
    const head = kind === 'word' ? t('secretWord') : page.skipped ? t('skippedPage', { name: by }) : kind === 'sketch' ? t('drew', { name: by }) : t('guessed', { name: by });
    let body;
    if (page.skipped) body = '<div class="sr-page-skip" aria-hidden="true">⏭️</div>';
    else if (kind === 'sketch') body = `<div class="sr-page-art">${art(page.art, t('drew', { name: by }))}${ART && ART.isBlank(page.art || '') ? `<span class="sr-blank">${esc(t('blankPage'))}</span>` : ''}</div>`;
    else body = `<div class="sr-page-text${kind === 'word' ? ' is-word' : ''}"><span>${esc(page.text)}</span></div>`;
    let badges = '';
    if (awards && !page.skipped && page.index > 0) {
      const mine = Number(page.by) === Number(owner);
      if (scoring === 'friendly' && !mine && (kind === 'sketch' || kind === 'guess')) {
        const field = kind === 'sketch' ? 'sketch' : 'guess', on = Number(awards[field]) === page.index;
        badges += presenter
          ? `<button type="button" class="sr-badge-btn${on ? ' is-on' : ''}" data-sr-action="award" data-field="${field}" data-book="${book}" data-page="${page.index}" aria-pressed="${on}">${esc(t(field === 'sketch' ? 'favSketch' : 'favGuess'))}</button>`
          : on ? `<span class="sr-badge is-on">${esc(t(field === 'sketch' ? 'favSketch' : 'favGuess'))}</span>` : '';
      }
      if (scoring === 'competitive' && kind === 'guess') {
        const match = list(awards.matches).find(m => Number(m.page) === page.index)?.value === true;
        badges += presenter
          ? `<span class="sr-match"><span>${esc(t('isMatch'))}</span><button type="button" class="sr-badge-btn${match ? ' is-on' : ''}" data-sr-action="award" data-field="match" data-book="${book}" data-page="${page.index}" data-value="${!match}" aria-pressed="${match}">${esc(t(match ? 'match' : 'noMatch'))}</button></span>`
          : `<span class="sr-badge${match ? ' is-on' : ''}">${esc(t(match ? 'match' : 'noMatch'))}</span>`;
      }
    }
    return `<li class="sr-page sr-page-${kind}${page.skipped ? ' is-skipped' : ''}${latest ? ' is-latest' : ''}${page.index === final ? ' is-final' : ''}"><p class="sr-page-head"><span class="sr-page-no">${page.index + 1}</span>${esc(head)}</p>${body}${badges ? `<div class="sr-page-badges">${badges}</div>` : ''}</li>`;
  }
  function finalIndex(pages) {
    for (let i = pages.length - 1; i > 0; i--) if (!pages[i].skipped && pages[i].kind === 'guess') return i;
    return -1;
  }
  function bookHTML(pages, { owner, awards = null, scoring = 'none', presenter = false, book = 0, latest = -1, complete = true } = {}) {
    const items = list(pages);
    const final = complete ? finalIndex(items) : -1;
    return `<ol class="sr-book">${items.map((page, i) => pageHTML({ ...page, index: Number.isInteger(page.index) ? page.index : i }, { owner, awards, scoring, presenter, book, latest: i === latest, final })).join('')}</ol>`;
  }
  function revealHTML(relay, actor = 0) {
    const reveal = relay.reveal; if (!reveal) return '';
    const presenter = reveal.canPresent === true;
    const mine = Number(actor) === Number(reveal.owner);
    const scoring = relay.settings?.scoring || 'none';
    const awards = reveal.complete && scoring !== 'none' ? reveal.awards : null;
    const pages = list(reveal.pages);
    let controls = '';
    if (presenter) {
      controls = reveal.complete
        ? `<button type="button" class="sr-button sr-primary" data-sr-action="nextBook" data-book="${reveal.book}">${esc(t(reveal.book + 1 >= reveal.books ? 'seeResults' : 'nextBook'))}</button>`
        : `<button type="button" class="sr-button sr-primary sr-big" data-sr-action="revealNext" data-book="${reveal.book}" data-shown="${reveal.shown}">${esc(t('nextPage'))}</button><button type="button" class="sr-button" data-sr-action="revealAll" data-book="${reveal.book}" data-shown="${reveal.shown}">${esc(t('showAll'))}</button>`;
    }
    let judge = '';
    if (awards) {
      const final = finalIndex(pages);
      const finalRow = final > 0 ? (presenter
        ? `<div class="sr-final"><span>${esc(t('finalMatch'))}</span><div class="sr-seg"><button type="button" class="sr-seg-btn${awards.final ? ' is-on' : ''}" data-sr-action="award" data-field="final" data-book="${reveal.book}" data-value="true" aria-pressed="${!!awards.final}">${esc(t('yes'))}</button><button type="button" class="sr-seg-btn${!awards.final ? ' is-on' : ''}" data-sr-action="award" data-field="final" data-book="${reveal.book}" data-value="false" aria-pressed="${!awards.final}">${esc(t('no'))}</button></div></div>`
        : `<div class="sr-final"><span>${esc(t('finalMatch'))}</span><strong>${esc(t(awards.final ? 'yes' : 'no'))}</strong></div>`) : '';
      judge = `<div class="sr-judge"><p class="sr-soft">${esc(t(scoring === 'friendly' ? 'friendlyHint' : 'competitiveHint'))}</p>${!presenter ? `<p class="sr-soft">${esc(t('decides', { name: reveal.ownerName }))}</p>` : ''}${finalRow}</div>`;
    }
    const hint = mine ? t('revealHint') : actor === 0 ? t('revealHost') : t('revealWatch', { name: reveal.ownerName });
    return `<div class="sr-reveal" data-sr-reveal>
      <div class="sr-reveal-head"><p class="sr-kicker">${esc(t('bookCount', { n: reveal.book + 1, total: reveal.books }))}</p><p class="sr-soft">${esc(hint)}</p></div>
      ${bookHTML(pages, { owner: reveal.owner, awards, scoring, presenter, book: reveal.book, latest: reveal.complete ? -1 : pages.length - 1, complete: reveal.complete })}
      ${!reveal.complete ? `<p class="sr-soft sr-more">${esc(t('pageOf', { n: reveal.shown, total: reveal.total }))}</p>` : ''}
      ${judge}
      ${controls ? `<div class="sr-actions sr-reveal-actions">${controls}</div>` : ''}
    </div>`;
  }
  function scoresHTML(relay, actor = 0) {
    const rows = list(relay.scores);
    if (!rows.length || relay.settings?.scoring === 'none') return '';
    const sorted = rows.slice().sort((a, b) => b.total - a.total || a.playerNum - b.playerNum);
    const top = sorted[0]?.total;
    const winners = relay.phase === 'finished' && top > 0 ? sorted.filter(r => r.total === top) : [];
    const reason = r => {
      const counts = {}; for (const key of list(r.reasons)) counts[key] = (counts[key] || 0) + 1;
      return Object.entries(counts).map(([key, n]) => `<span class="sr-reason">${esc(t('r_' + key))}${n > 1 ? ' ×' + n : ''}</span>`).join('');
    };
    return `<div class="sr-scores">${winners.length ? `<p class="sr-winners">${esc(t(winners.length > 1 ? 'winners' : 'winner'))}: ${winners.map(w => esc(w.name)).join(' · ')}</p>` : ''}<ol class="sr-score-list">${sorted.map((r, i) =>
      `<li class="sr-score${Number(r.playerNum) === Number(actor) ? ' is-me' : ''}${winners.includes(r) ? ' is-winner' : ''}"><span class="sr-rank">${i + 1}</span><span class="sr-score-name">${esc(r.name)}<span class="sr-reasons">${reason(r)}</span></span><span class="sr-score-round">${esc(t('roundPts', { n: r.round }))}</span><strong class="sr-score-total">${r.total}</strong></li>`).join('')}</ol></div>`;
  }

  // ----- stage bars -----
  function stageHTML({ tone, kicker, title, hint, extra = '' }) {
    return `<div class="sr-stage sr-tone-${tone}" role="status" aria-live="polite"><div class="sr-stage-text"><p class="sr-kicker">${esc(kicker)}</p><h2>${title}</h2>${hint ? `<p class="sr-stage-hint">${esc(hint)}</p>` : ''}</div>${extra}</div>`;
  }
  function hostStage(relay, now) {
    const progress = relay.progress ? `<div class="sr-count"><strong>${relay.progress.done}</strong><span>/ ${relay.progress.total}</span></div>` : '';
    if (relay.phase === 'word') return stageHTML({ tone: 'word', kicker: t('wordKicker'), title: esc(t('hostWordTitle', { n: relay.die })), hint: t('hostWordHint', { n: relay.die }), extra: `<div class="sr-stage-side">${dieFace(relay.die)}${progress}</div>` });
    if (relay.phase === 'play') {
      const p = relay.progress || {};
      const title = p.drawing && p.guessing ? 'hostMixedTitle' : p.guessing ? 'hostGuessTitle' : 'hostDrawTitle';
      return stageHTML({ tone: p.guessing && !p.drawing ? 'guess' : 'draw', kicker: t('pageOf', { n: Number(relay.step) + 2, total: Number(relay.steps) + 1 }) + (relay.paused ? ' · ' + t('paused') : ''),
        title: esc(t(title)), hint: t('hostPlayHint'), extra: `<div class="sr-stage-side">${timerHTML(relay, now, true)}${progress}</div>` });
    }
    if (relay.phase === 'reveal') return stageHTML({ tone: 'reveal', kicker: t('revealKicker'), title: esc(t('revealTitle', { name: relay.reveal?.ownerName || '' })), hint: '' });
    if (relay.phase === 'finished') return stageHTML({ tone: 'results', kicker: t('resultsKicker') + ' · ' + t('round', { n: relay.round }), title: esc(t(relay.settings?.scoring === 'none' ? 'laughsTitle' : 'resultsTitle')), hint: t(relay.settings?.scoring === 'none' ? 'laughsHint' : 'resultsHint') });
    return stageHTML({ tone: 'idle', kicker: t('brand'), title: esc(t('stoppedTitle')), hint: t('stoppedHint') });
  }
  // The shared screen: never shows anyone's secret word or work in progress.
  function hostScene(relay, now) {
    if (!relay) return '';
    let body = '';
    if (relay.phase === 'word' || relay.phase === 'play') body = `${relay.phase === 'play' ? rail(relay) : ''}${rosterHTML(relay, 0)}${passOrderHTML(relay)}`;
    else if (relay.phase === 'reveal') body = revealHTML(relay, 0);
    else if (relay.phase === 'finished') body = scoresHTML(relay, 0);
    return `${hostStage(relay, now)}<div class="sr-board">${body}</div>`;
  }

  // Bring a freshly turned page into view, once per page.
  function followReveal(element, relay, previous) {
    const key = relay?.reveal ? `${relay.sessionId}:${relay.reveal.book}:${relay.reveal.shown}` : '';
    if (key && previous && key !== previous) {
      const page = element.querySelector('.sr-page.is-latest') || (relay.reveal.complete ? element.querySelector('.sr-judge, .sr-reveal-actions') : null);
      if (page && typeof page.scrollIntoView === 'function') requestAnimationFrame(() => page.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
    return key || previous;
  }

  // ----- drawing pad -----
  class Pad {
    constructor({ strokes = [], onChange = () => {}, onFull = () => {} } = {}) {
      this.strokes = Array.isArray(strokes) ? strokes : [];
      this.onChange = onChange; this.onFull = onFull;
      this.color = 0; this.size = 1; this.tool = 'pen'; this.disabled = false; this.active = null; this.current = null;
      const root = this.root = document.createElement('div');
      root.className = 'sr-pad';
      const names = t('colorNames').split(',');
      const swatches = ART.COLORS.slice(0, ART.ERASER).map((hex, i) => `<button type="button" class="sr-swatch" data-color="${i}" style="--swatch:${hex}" aria-label="${esc(names[i] || hex)}" aria-pressed="${i === 0}"></button>`).join('');
      const sizes = ART.WIDTHS.map((w, i) => `<button type="button" class="sr-size" data-size="${i}" aria-label="${esc(t('size'))} ${i + 1}" aria-pressed="${i === 1}"><i style="--dot:${Math.max(4, Math.round(w / 2.2))}px"></i></button>`).join('');
      root.innerHTML = `<div class="sr-paper"><canvas class="sr-canvas" aria-label="${esc(t('pen'))}"></canvas></div>
        <div class="sr-tools" role="toolbar">
          <div class="sr-tool-group sr-swatches">${swatches}<button type="button" class="sr-tool sr-eraser" data-tool="eraser" aria-pressed="false">🧽 ${esc(t('eraser'))}</button></div>
          <div class="sr-tool-group"><span class="sr-tool-label">${esc(t('size'))}</span>${sizes}<span class="sr-tool-spacer"></span><button type="button" class="sr-tool" data-pad="undo">${esc(t('undo'))}</button><button type="button" class="sr-tool" data-pad="clear">${esc(t('clear'))}</button></div>
        </div>`;
      this.canvas = root.querySelector('canvas'); this.paper = root.querySelector('.sr-paper');
      this.ctx = this.canvas.getContext('2d');
      this.down = e => this.start(e); this.move = e => this.extend(e); this.up = e => this.finish(e);
      this.canvas.addEventListener('pointerdown', this.down);
      this.canvas.addEventListener('pointermove', this.move);
      this.canvas.addEventListener('pointerup', this.up);
      this.canvas.addEventListener('pointercancel', this.up);
      this.canvas.addEventListener('lostpointercapture', this.up);
      this.click = e => {
        const swatch = e.target.closest('[data-color]'), size = e.target.closest('[data-size]'), tool = e.target.closest('[data-tool]'), op = e.target.closest('[data-pad]');
        if (this.disabled) return;
        if (swatch) { this.color = Number(swatch.dataset.color); this.tool = 'pen'; }
        else if (size) this.size = Number(size.dataset.size);
        else if (tool) this.tool = this.tool === 'eraser' ? 'pen' : 'eraser';
        else if (op?.dataset.pad === 'undo') { this.strokes.pop(); this.redraw(); this.onChange(); }
        else if (op?.dataset.pad === 'clear') { if (this.strokes.length && (typeof confirm !== 'function' || confirm(t('clearConfirm')))) { this.strokes = []; this.redraw(); this.onChange(); } }
        this.paintTools();
      };
      root.addEventListener('click', this.click);
      this.resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
      this.resizer?.observe(this.paper);
      this.paintTools();
      requestAnimationFrame(() => this.resize());
    }
    paintTools() {
      for (const b of this.root.querySelectorAll('[data-color]')) b.setAttribute('aria-pressed', String(this.tool === 'pen' && Number(b.dataset.color) === this.color));
      for (const b of this.root.querySelectorAll('[data-size]')) b.setAttribute('aria-pressed', String(Number(b.dataset.size) === this.size));
      this.root.querySelector('[data-tool]').setAttribute('aria-pressed', String(this.tool === 'eraser'));
      for (const b of this.root.querySelectorAll('button')) b.disabled = this.disabled;
      this.root.classList.toggle('is-disabled', this.disabled);
      this.root.classList.toggle('is-erasing', this.tool === 'eraser');
    }
    setDisabled(value) { if (this.disabled !== !!value) { this.disabled = !!value; if (this.disabled) this.cancel(); this.paintTools(); } }
    resize() {
      const width = this.paper.clientWidth; if (!width) return;
      const ratio = Math.min(3, globalThis.devicePixelRatio || 1), pixels = Math.round(width * ratio);
      if (this.canvas.width !== pixels) { this.canvas.width = pixels; this.canvas.height = pixels; }
      this.redraw();
    }
    redraw() {
      const pixels = this.canvas.width; if (!pixels) return;
      ART.paint(this.ctx, this.current ? this.strokes.concat([this.current]) : this.strokes, pixels);
    }
    point(e) {
      const rect = this.canvas.getBoundingClientRect();
      return [Math.max(0, Math.min(1000, Math.round((e.clientX - rect.left) / rect.width * 1000))), Math.max(0, Math.min(1000, Math.round((e.clientY - rect.top) / rect.height * 1000)))];
    }
    start(e) {
      if (this.disabled || this.active !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      this.active = e.pointerId;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const eraser = this.tool === 'eraser';
      this.current = { color: eraser ? ART.ERASER : this.color, size: eraser ? Math.max(2, this.size + 1) : this.size, points: this.point(e) };
      this.redraw();
    }
    extend(e) {
      if (e.pointerId !== this.active || !this.current) return;
      e.preventDefault();
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      const pts = this.current.points;
      for (const ev of events.length ? events : [e]) {
        const [x, y] = this.point(ev), lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(x - lx, y - ly) >= 3) pts.push(x, y);
      }
      this.redraw();
    }
    finish(e) {
      if (e && e.pointerId !== this.active) return;
      this.active = null;
      if (!this.current) return;
      const stroke = { ...this.current, points: ART.simplify(this.current.points, 1.2) };
      this.current = null;
      if (stroke.points.length === 2) stroke.points.push(stroke.points[0], stroke.points[1]);
      const next = this.strokes.concat([stroke]);
      if (ART.encode(next).length > ART.MAX_LENGTH - 64 || next.length > ART.MAX_STROKES) { this.redraw(); this.onFull(); return; }
      this.strokes = next; this.redraw(); this.onChange();
    }
    cancel() { this.active = null; this.current = null; this.redraw(); }
    encode() { return ART.encode(this.strokes); }
    destroy() {
      this.resizer?.disconnect();
      this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move);
      this.canvas.removeEventListener('pointerup', this.up); this.canvas.removeEventListener('pointercancel', this.up);
      this.canvas.removeEventListener('lostpointercapture', this.up); this.root.removeEventListener('click', this.click);
      this.root.remove();
    }
  }

  // ----- local drafts survive a reload of the player card -----
  const draftKey = (relay, task) => `sketchRelayDraft:${relay.sessionId}:${relay.turnId}:${task.book}`;
  function loadDraft(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value && typeof value === 'object' ? value : null; } catch (_) { return null; }
  }
  function saveDraft(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // keep only a handful of drafts around
      const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('sketchRelayDraft:') && k !== key) keys.push(k); }
      keys.slice(0, Math.max(0, keys.length - 4)).forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  }

  // ----- player card -----
  class Card {
    constructor(element, { now = () => Date.now(), connected = () => true, nameBanner = () => '', send = null } = {}) {
      this.element = element; this.now = now; this.connected = connected; this.nameBanner = nameBanner; this.send = send;
      this.data = null; this.destroyed = false; this.pending = null; this.error = ''; this.editing = '';
      this.pad = null; this.padKey = ''; this.taskKey = ''; this.shellKey = ''; this.guessDraft = ''; this.autoSent = ''; this.notice = '';
      this.click = event => this.onClick(event);
      this.input = event => {
        const field = event.target.closest?.('[data-sr-guess]');
        if (field) { this.guessDraft = field.value; const task = this.task(); if (task) saveDraft(draftKey(this.relay(), task), { text: field.value }); this.paint(); }
      };
      this.submit = event => { if (event.target.closest('[data-sr-guess-form]')) { event.preventDefault(); this.submitGuess(); } };
      element.addEventListener('click', this.click); element.addEventListener('input', this.input); element.addEventListener('submit', this.submit);
      this.timer = setInterval(() => this.paint(), 250);
    }
    relay() { return this.data?.relay || null; }
    task() { return this.relay()?.phase === 'play' ? this.relay().me?.task || null : null; }
    update(data) {
      if (this.destroyed || !data?.relay) return;
      const previous = this.relay();
      this.data = data;
      const relay = data.relay;
      if (previous?.sessionId !== relay.sessionId || previous?.turnId !== relay.turnId) { this.error = ''; this.editing = ''; this.notice = ''; }
      if (this.pending && relay.reply?.id === this.pending.id) {
        const error = relay.reply.error;
        this.error = error ? t(dict[error] ? error : 'error') : '';
        if (!error && this.pending.type === 'submit') this.editing = '';
        this.pending = null;
      } else if (this.pending && (this.pending.sessionId !== relay.sessionId || (this.pending.turnId !== relay.turnId && ['submit', 'ready', 'swapWord'].includes(this.pending.type)))) this.pending = null;
      this.render();
    }
    shell() {
      const key = JSON.stringify([lang(), this.data.name, this.data.playerNum, this.relay().sessionId]);
      if (key === this.shellKey && this.element.querySelector('[data-sr-card]')) return;
      this.shellKey = key; this.taskKey = '';
      if (this.pad) this.pad.root.remove();
      this.element.innerHTML = `<div class="sr-card" data-sr-card>
        <header class="sr-card-head">${this.nameBanner(this.data)}<span class="sr-brand">${esc(t('brand'))}</span></header>
        <div data-sr-stage></div>
        <div class="sr-task" data-sr-task></div>
        <p class="sr-feedback" data-sr-feedback role="status"></p>
        <p class="sr-feedback sr-connection" data-sr-connection role="status"></p>
        <section class="sr-card-roster" data-sr-roster></section>
        <div class="sr-card-foot" data-sr-foot></div>
      </div>`;
    }
    render() {
      if (this.destroyed || !this.relay()) return;
      this.shell();
      const relay = this.relay(), me = relay.me || {}, task = this.task();
      // stage bar
      this.element.querySelector('[data-sr-stage]').innerHTML = this.stage();
      // task area, rebuilt only when what you are doing changes
      const taskKey = JSON.stringify([lang(), relay.phase, relay.sessionId, relay.turnId, me.away, me.card, me.wordIndex, me.ready, me.swapsLeft, me.word,
        task && [task.book, task.kind, task.submitted, task.skipped, task.prompt?.index], this.editing,
        relay.phase === 'reveal' ? relay.reveal : null, relay.phase === 'finished' ? [relay.scores, me.book] : null]);
      if (taskKey !== this.taskKey) { this.taskKey = taskKey; this.renderTask(); }
      const roster = this.element.querySelector('[data-sr-roster]');
      roster.innerHTML = ['word', 'play'].includes(relay.phase) ? rosterHTML(relay, this.data.playerNum) : '';
      const foot = this.element.querySelector('[data-sr-foot]');
      foot.innerHTML = ['word', 'play'].includes(relay.phase) && !me.away ? `<button type="button" class="sr-link" data-sr-action="away">${esc(t('stepAway'))}</button>` : '';
      this.paint();
    }
    stage() {
      const relay = this.relay(), me = relay.me || {}, task = this.task();
      const page = relay.phase === 'play' ? t('pageOf', { n: Number(relay.step) + 2, total: Number(relay.steps) + 1 }) : '';
      if (me.away && ['word', 'play'].includes(relay.phase)) return stageHTML({ tone: 'idle', kicker: page || t('brand'), title: esc(t('awayTitle')), hint: t('awayHint') });
      if (relay.phase === 'word') return stageHTML({ tone: 'word', kicker: t('wordKicker'), title: esc(t('wordTitle')), hint: me.ready ? t('readyDone') : t('wordHint', { n: relay.die }), extra: `<div class="sr-stage-side">${dieFace(relay.die)}</div>` });
      if (relay.phase === 'play' && task) {
        const editing = this.editing === this.padKeyFor(task) || this.editing === 'guess:' + this.padKeyFor(task);
        if (task.skipped) return stageHTML({ tone: 'idle', kicker: page, title: esc(t('skippedTitle')), hint: t('skippedHint') });
        if (task.submitted && !editing) {
          const waiting = waitingNames(relay);
          return stageHTML({ tone: 'done', kicker: page, title: esc(t('doneTitle')), hint: waiting.length ? t('waitingFor', { names: waiting.join('、') }) : t('everyoneDone'), extra: `<div class="sr-stage-side">${relay.progress ? `<div class="sr-count"><strong>${relay.progress.done}</strong><span>/ ${relay.progress.total}</span></div>` : ''}</div>` });
        }
        if (task.kind === 'sketch') return stageHTML({ tone: 'draw', kicker: t('drawKicker') + ' · ' + page + (relay.paused ? ' · ' + t('paused') : ''), title: esc(t(task.own ? 'drawOwnTitle' : 'drawTitle')),
          hint: relay.paused ? t('pausedHint') : t(relay.deadline > 0 || relay.paused ? 'drawHint' : 'drawHintNoTimer'), extra: `<div class="sr-stage-side">${timerHTML(relay, this.now(), true)}</div>` });
        return stageHTML({ tone: 'guess', kicker: t('guessKicker') + ' · ' + page, title: esc(t('guessTitle')), hint: t('guessHint') });
      }
      if (relay.phase === 'reveal') {
        const mine = Number(relay.reveal?.owner) === Number(this.data.playerNum);
        return stageHTML({ tone: 'reveal', kicker: t('revealKicker') + ' · ' + t('bookCount', { n: relay.reveal.book + 1, total: relay.reveal.books }), title: esc(mine ? t('revealYours') : t('revealTitle', { name: relay.reveal.ownerName })), hint: '' });
      }
      if (relay.phase === 'finished') return stageHTML({ tone: 'results', kicker: t('resultsKicker'), title: esc(t(relay.settings?.scoring === 'none' ? 'laughsTitle' : 'resultsTitle')), hint: t(relay.settings?.scoring === 'none' ? 'laughsHint' : 'resultsHint') });
      return stageHTML({ tone: 'idle', kicker: t('brand'), title: esc(t('stoppedTitle')), hint: t('stoppedHint') });
    }
    padKeyFor(task) { const relay = this.relay(); return `${relay.sessionId}:${relay.turnId}:${task.book}`; }
    renderTask() {
      const box = this.element.querySelector('[data-sr-task]');
      const relay = this.relay(), me = relay.me || {}, task = this.task();
      const keepPad = task && task.kind === 'sketch' && !task.skipped && !me.away && (!task.submitted || this.editing === this.padKeyFor(task));
      if (this.pad && (!keepPad || this.padKey !== this.padKeyFor(task))) { this.pad.destroy(); this.pad = null; this.padKey = ''; }
      if (me.away && ['word', 'play'].includes(relay.phase)) {
        box.innerHTML = `<div class="sr-panel sr-center"><p class="sr-big-emoji" aria-hidden="true">💤</p><button type="button" class="sr-button sr-primary sr-big" data-sr-action="back">${esc(t('imBack'))}</button></div>`;
        return;
      }
      if (relay.phase === 'word') {
        const card = list(me.card);
        box.innerHTML = `<div class="sr-wordcard" aria-label="${esc(t('yourCard'))}"><p class="sr-wordcard-title">${esc(t('yourCard'))}</p><ol>${card.map((word, i) =>
          `<li class="${i === me.wordIndex ? 'is-picked' : ''}"><span class="sr-num">${i + 1}</span><span class="sr-word">${esc(word)}</span>${i === me.wordIndex ? '<span class="sr-pick" aria-hidden="true">◀</span>' : ''}</li>`).join('')}</ol></div>
          <div class="sr-actions sr-actions-stack">${me.ready ? `<p class="sr-done-pill">${esc(t('readyDone'))}</p>` : `<button type="button" class="sr-button sr-primary sr-big" data-sr-action="ready">${esc(t('readyBtn'))}</button>`}
          ${me.swapsLeft > 0 ? `<button type="button" class="sr-link" data-sr-action="swapWord">${esc(t('swapBtn'))} <small>(${esc(t('swapsLeft', { n: me.swapsLeft }))})</small></button>` : ''}</div>`;
        return;
      }
      if (relay.phase === 'play' && task) {
        const key = this.padKeyFor(task);
        if (task.skipped) { box.innerHTML = `<div class="sr-panel sr-center"><p class="sr-big-emoji" aria-hidden="true">⏭️</p></div>`; return; }
        const prompt = task.prompt || {};
        const promptLabel = prompt.kind === 'word' ? (task.own ? t('promptWord') : t('promptTheirWord', { name: prompt.byName })) : prompt.kind === 'guess' ? t('promptGuess', { name: prompt.byName }) : t('promptSketch', { name: prompt.byName });
        const promptBody = prompt.kind === 'sketch' ? `<div class="sr-prompt-art">${art(prompt.art, promptLabel)}</div>` : `<p class="sr-prompt-text">${esc(prompt.text)}</p>`;
        const promptHTML = `<div class="sr-prompt sr-prompt-${esc(prompt.kind)}"><p class="sr-prompt-label">${esc(promptLabel)}</p>${promptBody}${prompt.skippedBefore ? `<p class="sr-soft">${esc(t('skippedBefore'))}</p>` : ''}</div>`;
        const passTo = `<p class="sr-soft sr-pass-to">${esc(t('passTo', { name: task.passToName }))}</p>`;
        if (task.submitted && this.editing !== key && this.editing !== 'guess:' + key) {
          const mine = task.submitted.kind === 'sketch' ? `<div class="sr-mine-art">${art(task.submitted.art, t('yourPage'))}</div>` : `<p class="sr-mine-text">${esc(task.submitted.text)}</p>`;
          const canEdit = !(task.kind === 'sketch' && relay.deadline > 0 && !relay.paused && this.now() >= relay.deadline);
          box.innerHTML = `<div class="sr-panel sr-done"><p class="sr-kicker">${esc(t('yourPage'))}</p>${mine}<p class="sr-soft">${esc(t('doneHint'))}</p>${canEdit ? `<button type="button" class="sr-button" data-sr-action="edit">${esc(t('changeIt'))}</button>` : ''}</div>`;
          return;
        }
        if (task.kind === 'sketch') {
          box.innerHTML = `<div class="sr-play">${promptHTML}<div data-sr-pad-slot></div><div class="sr-actions"><button type="button" class="sr-button sr-primary sr-big sr-pass" data-sr-action="submitSketch">${esc(t('passBtn'))}</button></div>${passTo}</div>`;
          if (!this.pad || this.padKey !== key) {
            const draft = loadDraft(draftKey(relay, task));
            const strokes = draft?.art ? ART.decode(draft.art) : task.submitted?.art ? ART.decode(task.submitted.art) : null;
            this.pad = new Pad({ strokes: strokes || [],
              onChange: () => { saveDraft(draftKey(this.relay(), task), { art: this.pad.encode() }); this.notice = ''; this.paint(); },
              onFull: () => { this.notice = t('pageFull'); this.paint(); } });
            this.padKey = key;
          }
          box.querySelector('[data-sr-pad-slot]').replaceWith(this.pad.root);
          this.pad.resize();
          return;
        }
        const saved = this.guessDraft && this.guessKey === key ? this.guessDraft : loadDraft(draftKey(relay, task))?.text ?? task.submitted?.text ?? '';
        this.guessKey = key; this.guessDraft = saved;
        box.innerHTML = `<div class="sr-play">${promptHTML}<form class="sr-guess" data-sr-guess-form novalidate><label class="sr-field"><span>${esc(t('guessLabel'))}</span><input type="text" data-sr-guess maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="${esc(t('guessPlaceholder'))}" value="${esc(saved)}"></label><button type="submit" class="sr-button sr-primary sr-big sr-pass" data-sr-action="submitGuess">${esc(t('passBtn'))}</button></form>${passTo}</div>`;
        return;
      }
      if (relay.phase === 'reveal') { box.innerHTML = revealHTML(relay, this.data.playerNum); this.lastPage = followReveal(box, relay, this.lastPage); return; }
      if (relay.phase === 'finished') {
        box.innerHTML = `${scoresHTML(relay, this.data.playerNum)}${list(me.book).length ? `<div class="sr-panel"><p class="sr-kicker">${esc(t('yourBook'))}</p>${bookHTML(me.book, { owner: this.data.playerNum })}</div>` : ''}`;
        return;
      }
      box.innerHTML = '';
    }
    paint() {
      if (this.destroyed || !this.relay()) return;
      const relay = this.relay(), task = this.task(), now = this.now();
      paintTimer(this.element, relay, now);
      const hostLive = Number(this.data.relayLive?.until) || 0;
      const connection = this.element.querySelector('[data-sr-connection]');
      if (connection) connection.textContent = !this.connected() ? t('offline') : hostLive && now > hostLive && ['word', 'play', 'reveal'].includes(relay.phase) ? t('hostAway') : '';
      const feedback = this.element.querySelector('[data-sr-feedback]');
      if (feedback) feedback.textContent = this.error || this.notice || (this.pending ? t('sending') : '');
      const busy = !!this.pending || !this.connected() || typeof this.send !== 'function';
      for (const button of this.element.querySelectorAll('[data-sr-action]')) button.disabled = busy;
      if (this.pad) this.pad.setDisabled(!!this.pending && this.pending.type === 'submit');
      const guess = this.element.querySelector('[data-sr-guess]');
      const submitGuess = this.element.querySelector('[data-sr-action="submitGuess"]');
      if (submitGuess) submitGuess.disabled = busy || !String(guess?.value || '').trim();
      // Time is up: hand in whatever is on the page, once.
      if (task && task.kind === 'sketch' && !task.skipped && relay.deadline > 0 && !relay.paused && now >= relay.deadline) {
        const key = this.padKeyFor(task);
        const editing = this.editing === key;
        if ((!task.submitted || editing) && this.pad && this.autoSent !== key && !this.pending && this.connected()) {
          this.autoSent = key; this.notice = t('timeUp');
          this.sendCommand('submit', { book: task.book, kind: 'sketch', art: this.pad.encode() }).then(ok => { if (!ok) this.autoSent = ''; });
        }
      }
    }
    async sendCommand(type, extra = {}) {
      const relay = this.relay();
      if (!relay || this.pending || typeof this.send !== 'function' || !this.connected()) return false;
      const command = { ...extra, id: uid(), type, sessionId: relay.sessionId, turnId: relay.turnId };
      this.pending = command; this.error = ''; this.paint();
      try { await this.send(command); return true; }
      catch (e) {
        if (this.destroyed || this.pending?.id !== command.id) return false;
        this.pending = null; this.error = t(e.message === 'stale_turn' ? 'stale_turn' : 'error'); this.paint(); return false;
      }
    }
    submitGuess() {
      const task = this.task(); const field = this.element.querySelector('[data-sr-guess]');
      const text = String(field?.value || '').trim();
      if (!task || task.kind !== 'guess' || !text) return;
      this.sendCommand('submit', { book: task.book, kind: 'guess', text: text.slice(0, 40) });
    }
    onClick(event) {
      const button = event.target.closest('[data-sr-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.srAction, task = this.task(), relay = this.relay();
      if (action === 'submitGuess') return; // handled by the form submit
      if (action === 'ready' || action === 'swapWord') this.sendCommand(action);
      else if (action === 'submitSketch' && task && this.pad) this.sendCommand('submit', { book: task.book, kind: 'sketch', art: this.pad.encode() });
      else if (action === 'edit' && task) { this.editing = task.kind === 'sketch' ? this.padKeyFor(task) : 'guess:' + this.padKeyFor(task); this.render(); }
      else if (action === 'away') { if (typeof confirm !== 'function' || confirm(t('stepAwayConfirm'))) this.sendCommand('away', { playerNum: Number(this.data.playerNum), away: true }); }
      else if (action === 'back') this.sendCommand('away', { playerNum: Number(this.data.playerNum), away: false });
      else if (action === 'revealNext' || action === 'revealAll') this.sendCommand('revealNext', { book: Number(button.dataset.book), shown: Number(button.dataset.shown), all: action === 'revealAll' });
      else if (action === 'nextBook') this.sendCommand('nextBook', { book: Number(button.dataset.book) });
      else if (action === 'award') this.sendCommand('award', awardInput(button));
      void relay;
    }
    destroy() {
      this.destroyed = true; clearInterval(this.timer); this.pad?.destroy(); this.pad = null;
      this.element.removeEventListener('click', this.click); this.element.removeEventListener('input', this.input); this.element.removeEventListener('submit', this.submit);
      this.data = null; this.pending = null;
    }
  }
  function awardInput(button) {
    const field = button.dataset.field, out = { book: Number(button.dataset.book), field };
    if (button.dataset.page != null) out.page = Number(button.dataset.page);
    if (button.dataset.value != null) out.value = button.dataset.value === 'true';
    return out;
  }

  return { dict, t, esc, list, art, dieFace, followReveal, timerHTML, paintTimer, rail, rosterHTML, passOrderHTML, bookHTML, revealHTML, scoresHTML, hostStage, hostScene, Pad, Card, awardInput, nameOf, clockText };
})();
if (typeof module === 'object' && module.exports) module.exports = SKETCH_RELAY_UI;
