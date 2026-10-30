/* The host and player card share this public-only presentation. */
var CUT_UI = (() => {
  'use strict';
  const dict = {
    intro: ['講到一半突然 CUT！下一位直接把你的半句話接下去。', 'A sudden CUT! Someone else has to finish your unfinished sentence.'],
    speed: ['遊戲速度', 'Pace'], normal: ['Normal · 正常（15–25 秒）', 'Normal · 15–25 seconds'], chill: ['Chill · 輕鬆（25–40 秒）', 'Chill · 25–40 seconds'], chaos: ['Chaos · 瘋狂（8–16 秒）', 'Chaos · 8–16 seconds'], custom: ['Custom · 自訂秒數', 'Custom · Choose your seconds'],
    customMin: ['最短秒數', 'Minimum seconds'], customMax: ['最長秒數', 'Maximum seconds'], customHint: ['各填 5–120 的整秒；填相同秒數就是固定時間。', 'Use whole seconds from 5 to 120. Use the same number for a fixed time.'], customRangeError: ['請填入 5–120 的整秒，最短秒數不能大於最長秒數。', 'Use whole seconds from 5 to 120. The minimum must not exceed the maximum.'],
    topicTime: ['話題時間', 'Topic time'], topicMinutesHint: ['1–60 整分鐘。時間到只提醒，大家同意後再結束話題。', '1–60 whole minutes. A reminder only; end the topic when everyone agrees.'], topicMinutesError: ['請填入 1–60 的整分鐘。', 'Use whole minutes from 1 to 60.'], topicTimeUp: ['時間到了，大家同意後再結束。', 'Time is up. Finish when everyone agrees.'],
    category: ['題目類型', 'Topics'], mixed: ['全部混合', 'All topics'], real: ['生活情境', 'Everyday situations'], absurd: ['荒謬想像', 'Absurd imagination'], personal: ['個人經驗', 'Personal stories'], ideas: ['想法與喜好', 'Thoughts & choices'],
    browseTopics: ['查看題庫', 'Browse topics'], libraryFilter: ['分類', 'Category'], librarySearch: ['搜尋題目或開場句', 'Search questions or opening lines'], libraryCount: ['顯示 {shown}／共 {total} 題', '{shown} of {total} topics'], libraryEmpty: ['沒有符合的題目。', 'No matching topics.'], libraryStarter: ['開場句', 'Opening line'],
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
    soundOn: ['🔊 聲音開啟', '🔊 Sound on'], soundOff: ['🔇 聲音關閉', '🔇 Sound off'], enableSound: ['🔊 啟用聲音', '🔊 Enable sound'],
    soundHint: ['主持人設定全桌聲音。玩家需在自己的裝置啟用一次，也能隨時靜音。', 'The host sets room audio. Players enable sound once on their own device and can mute any time.'],
    cardSoundHint: ['開啟後，從你的裝置播放主持人選的音樂與音效；可隨時靜音。', 'Enable to hear the host’s music and effects on this device. You can mute any time.'],
    soundBlocked: ['按「啟用聲音」讓這個裝置播放音樂與提示音。', 'Tap “Enable sound” to allow music and cues on this device.'],
    soundUnsupported: ['這個瀏覽器無法播放提示音，請依畫面接棒。', 'This browser can’t play cues. Follow the screen to pass the turn.'],
    rules: ['怎麼玩', 'How to play'],
    rule1: ['先看話題，主持人或玩家按「開始說話」後才倒數。看到 GO 就開口，CUT 一出現立刻停下。', 'Read the topic, then the host or a player taps “Start talking” to start the countdown. Speak on GO and stop on CUT.'],
    rule2: ['CUT 會停在下一位的名字，準備好後主持人或玩家按「開始接話」。下一位假裝自己就是上一個人，直接接那半句，不要重新回答題目。', 'CUT holds on the next player’s name until the host or a player taps “Start”. Pretend you are the previous speaker and continue the half-sentence without restarting the answer.'],
    rule3: ['同一話題可以一直接下去。大家口頭同意後，主持人或玩家按「結束話題」，再換下一題。', 'Keep going with the same topic as long as you like. When everyone agrees, end the topic before choosing the next one.'],
    ruleExample: ['例如：「他把——」CUT！「——護照丟進了垃圾桶。」', 'For example: “He threw his—” CUT! “—passport into the bin.”'],
    mode: ['遊戲模式', 'Game mode'], classic: ['模式 1 · 接話', 'Mode 1 · Take Over'], jump: ['模式 2 · 插話', 'Mode 2 · Jump In'],
    introJump: ['一位主講人慢慢聊。偶爾 CUT！被點到的人隨意插一句，再交回主講人。', 'One main speaker talks for a few minutes. Now and then, CUT! Someone jumps in, then it goes back to the main speaker.'],
    modeSwitchHint: ['換模式會開始一個新話題。', 'Changing the mode starts a new topic.'],
    mainTime: ['主講時間', 'Main speaker time'], mainQuick: ['Quick · 短（{n} 分鐘）', 'Quick · {n} minutes'], mainNormal: ['Normal · 正常（{n} 分鐘）', 'Normal · {n} minutes'], mainLong: ['Long · 長（{n} 分鐘）', 'Long · {n} minutes'], mainOther: ['{n} 分鐘', '{n} minutes'],
    firstCutAfter: ['第一次插話前', 'First interruption after'],
    cutInterval: ['後續插話間隔', 'Time between interruptions'],
    jumpTimingHint: ['5–300 秒。填一樣就是固定秒數；間隔只算主講時間。', '5–300 seconds. Matching values give fixed timing. Only main speaker time counts.'],
    jumpTimingError: ['請填 5–300 的整數，最長不能小於最短。', 'Enter whole seconds from 5 to 300. Maximum must be at least minimum.'],
    mainTimeHint: ['只算主講人說話的時間。有人插話時，時間會暫停。', 'Only the main speaker’s talking time counts. The clock stops while someone jumps in.'],
    mainSpeaker: ['主講人', 'MAIN SPEAKER'],
    jumpWaitingBegin: ['先看話題。主講人準備好後，由主持人或任一玩家按「開始說話」。', 'Read the topic first. When the main speaker is ready, the host or any player can tap “Start talking”.'],
    jumpSpeakHint: ['照自己的步調聊。偶爾會有人插話。', 'Talk at your own pace. Someone may jump in now and then.'],
    jumpListen: ['放鬆聽就好。也許會請你插一句。', 'Relax and listen. You may be asked to jump in.'],
    jumpCutHint: ['先停一下！', 'Hold that thought!'], jumpIn: ['請插話！', 'JUMP IN!'],
    jumpInHint: ['說什麼都可以：接完那句話、加一點、吐槽、問問題。不計時，慢慢來。', 'Say anything: finish the sentence, add a detail, tease, or ask a question. No timer. Take your time.'],
    jumpInWait: ['聽聽 {name} 想說什麼，說完就交回主講人。', 'Listen to {name}. Then it goes back to the main speaker.'],
    jumpHold: ['先聽 {name} 說，等一下換你繼續。', 'Listen to {name}. You will go on in a moment.'],
    done: ['說完了', 'DONE'], skip: ['跳過', 'SKIP'], backToMain: ['交回主講人', 'Back to the main speaker'],
    backTo: ['交回', 'BACK TO'], keepGoing: ['繼續說！', 'KEEP GOING!'],
    jumpTimeUp: ['時間到！', 'TIME’S UP!'], extend: ['＋{n} 分鐘', '+{n} min'],
    jumpTimeUpHint: ['還想聊就加時間。要結束話題，請先確認大家都同意。', 'Add time to keep going. End the topic only when everyone agrees.'], jumpThanks: ['謝謝 {name}！', 'Thank you, {name}!'],
    jumpBreakHint: ['主持人按下一題，換下一位主講人和新話題。', 'The host reveals the next topic and a new main speaker.'],
    sharedJumpBreak: ['準備好後，任一玩家可以按下一題，換下一位主講人。', 'Any player can reveal the next topic and a new main speaker.'],
    libraryMode: ['模式', 'Mode'], stories: ['真實故事', 'True stories'], self: ['關於你', 'About you'], opinions: ['你的看法', 'Your opinions'], whatif: ['如果…', 'What if…'], group: ['這群人', 'This group'],
    jumpRule1: ['一位主講人照著話題自然地聊幾分鐘。只計算主講人自己說話的時間。', 'One main speaker talks about the topic for a few minutes. Only their own talking time counts.'],
    jumpRule2: ['偶爾會 CUT！畫面點到的人可以隨意插話：接完那句話、加細節、吐槽、提問都可以。不計時，也不用很厲害。', 'Now and then, CUT! The player on the screen jumps in: finish the sentence, add a detail, tease, or ask a question. There is no timer, and it does not have to be clever.'],
    jumpRule3: ['說完按「說完了」；不想說就按「跳過」，沒有任何懲罰。接著交回主講人，他可以接受、反駁或不理會，繼續說下去。', 'Tap DONE when you finish, or SKIP to pass. There is no penalty. Then it goes back to the main speaker, who can accept it, reject it, or just go on.'],
    jumpRuleExample: ['例如：「我第一次自己旅行其實很順利，直到我發現——」CUT！「——他忘了帶護照。」「我才沒有忘記護照！不過我真的忘了…」', 'For example: “My first trip alone was fine until I realized—” CUT! “—he forgot his passport.” “I did NOT forget my passport! But I did forget…”'],
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
    invalid_options: ['請選擇有效的速度、題目類型與話題時間。', 'Choose a valid pace, topic type and topic time.'],
    stale_turn: ['畫面已更新，請再操作一次。', 'The turn has changed. Try again.'],
    not_available: ['這個動作目前無法使用，請依最新畫面操作。', 'This action isn’t available right now. Follow the current screen.'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check your connection and try again.'],
    edition: ['版本', 'Edition'], classicEdition: ['經典版', 'Classic'], halloweenEdition: ['🎃 萬聖節版', '🎃 Halloween'],
    classicEditionDesc: ['原本的話題和畫面。', 'The original topics and look.'],
    halloweenEditionDesc: ['鬼屋、南瓜和午夜怪談：專屬話題與萬聖節畫面，主持頁還有音樂和音效。', 'Haunted houses, pumpkins and midnight tales: its own topics and look, plus music and sound effects on the host page.'],
    editionSwitchHint: ['換版本會開始一個新話題。', 'Changing the edition starts a new topic.'],
    topicStyle: ['萬聖節題目版本', 'Halloween topic style'],
    situations: ['情境話題（原版）', 'Situations (original)'], story_openings: ['故事開頭（新版）', 'Story openings (new)'],
    situationsDesc: ['保留原本的萬聖節情境與聊天問題，從題目自由發揮。', 'The original Halloween situations and conversation prompts. Take them in your own direction.'],
    storyOpeningsDesc: ['事情已經發生，怪事正要開始。接著故事往下說，不用重新介紹情境。', 'The story is already happening, with something strange left unresolved. Carry it forward.'],
    topicStyleSwitchHint: ['換題目版本會開始一個新話題，等待手動開始。', 'Changing topic style opens a new topic and waits for Start.'],
    halloweenStoryTake: ['🎃 故事開頭 · 模式 1', '🎃 Story openings · Mode 1'], halloweenStoryJump: ['🎃 故事開頭 · 模式 2', '🎃 Story openings · Mode 2'],
    topicHalloweenStory: ['怪談故事開頭', 'A HALLOWEEN STORY BEGINS'],
    halloween: ['萬聖節', 'Halloween'], halloweenTake: ['🎃 萬聖節 · 模式 1', '🎃 Halloween · Mode 1'], halloweenJump: ['🎃 萬聖節 · 模式 2', '🎃 Halloween · Mode 2'],
    topicHalloween: ['今晚的怪談', 'TONIGHT’S SPOOKY TALE'], hwOpening: ['🕯️ 可以這樣開頭：', '🕯️ Start with:'], hwTag: ['🎃 萬聖節版', '🎃 HALLOWEEN EDITION'],
    hwCategoryNote: ['萬聖節版只用萬聖節題庫，不分題目類型。', 'The Halloween edition uses its own topics, with no topic types.'],
    hwBoard: ['🎃 萬聖節音效台', '🎃 Halloween sound board'], hwBoardHint: ['主持人選擇後，各玩家在自己的裝置播放。玩家需先按一次開啟聲音。', 'The host controls music and effects for everyone. Each player first enables sound on their own device.'],
    hwMusic: ['背景氛圍', 'Background ambience'], hwTrack_wind: ['窗邊夜風', 'Wind at the window'], hwTrack_rain: ['雨夜', 'Rainy night'],
    hwLegacyMusic: ['其他配樂（合成）', 'Other music (synthesized)'], hwTrack_musicbox: ['🎹 鬼屋音樂盒', '🎹 Haunted music box'], hwTrack_crawl: ['🕷️ 躡手躡腳', '🕷️ Creepy crawl'],
    hwStop: ['⏹ 停止背景聲', '⏹ Stop background'], hwMusicVolume: ['背景音量', 'Background volume'], hwEffects: ['音效 · 按一下播放給全桌', 'Sound effects · play for everyone'], hwEffectsVolume: ['音效音量', 'Effects volume'],
    hwAutoScare: ['CUT 時播放驚嚇音效', 'Play a scare at each CUT'], hwAutoScareHint: ['依下方選擇播放；關閉時只播放短鐘聲。', 'Uses the selected effect; when off, CUT uses a short bell.'],
    hwCutEffect: ['CUT 音效', 'CUT effect'], hwFx_random: ['隨機（避免連續相同）', 'Random (avoid repeats)'],
    hwRoomNotStarted: ['顯示題目後即可控制全桌聲音。', 'Show a topic to control room audio.'],
    hwRoomSending: ['正在同步全桌聲音…', 'Updating room audio…'],
    hwRoomError: ['聲音設定尚未同步，請再試一次。', 'Audio settings were not synced. Try again.'],
    hwUnlock: ['🔊 按一下啟用音效台', '🔊 Tap to enable the sound board'], hwUnsupported: ['這個瀏覽器無法播放音效。', 'This browser can’t play these sounds.'],
    hwLoading: ['正在載入音效…遊戲可以照常進行。', 'Loading sounds… the game can continue.'], hwLoadError: ['音效載入失敗，請再按一次啟用。', 'Sounds could not load. Tap enable to retry.'],
    hwFx_scream: ['😱 尖叫', '😱 Scream'], hwFx_laugh: ['😈 邪惡笑聲', '😈 Evil laugh'], hwFx_ghost: ['👻 鬼魂', '👻 Ghost'], hwFx_howl: ['🐺 狼嚎', '🐺 Wolf howl'],
    hwFx_door: ['🚪 吱嘎開門', '🚪 Creaky door'], hwFx_thunder: ['⚡ 打雷', '⚡ Thunder'], hwFx_heartbeat: ['💓 心跳', '💓 Heartbeat'], hwFx_bell: ['🔔 午夜鐘聲', '🔔 Midnight bell'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('cut', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = value => Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {});
  const t = (key, vars = {}) => {
    let value = typeof I18N !== 'undefined' ? I18N.t('cut', key) : (dict[key]?.[0] ?? key);
    for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(String(v));
    return value;
  };
  const isHalloween = cut => cut?.edition === 'halloween';
  const topicHeading = cut => isHalloween(cut) ? cut.topicStyle === 'story_openings' ? 'topicHalloweenStory' : 'topicHalloween' : 'topic';
  const name = (cut, num) => list(cut.roster).find(p => Number(p.playerNum) === Number(num))?.name || t('player', { n: num });
  const countdown = (cut, now) => ['countdown', 'handoff'].includes(cut.phase)
    ? Math.max(0, Math.ceil((Number(cut.phaseUntil) - now) / 1000)) : null;

  const validTopicMinutes = value => Number.isInteger(value) && value >= 1 && value <= 60;
  function topicTime(cut, now = Date.now()) {
    const clock = cut?.topicClock;
    const validClock = clock && Number.isFinite(clock.durationMs) && clock.durationMs > 0 && Number.isFinite(clock.elapsedMs) && clock.elapsedMs >= 0;
    const durationMs = validClock ? clock.durationMs : (validTopicMinutes(cut?.topicMinutes) ? cut.topicMinutes : 10) * 60000;
    const elapsedMs = validClock ? clock.elapsedMs + (clock.runningSince != null && Number.isFinite(clock.runningSince) ? Math.max(0, now - clock.runningSince) : 0) : 0;
    const remainingMs = Math.max(0, durationMs - elapsedMs), seconds = Math.ceil(remainingMs / 1000);
    const text = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    return { remainingMs, text, expired: !!validClock && remainingMs === 0 };
  }
  function renderTopicClock(cut, now = Date.now()) {
    const time = topicTime(cut, now);
    return '<div class="cut-topic-clock" data-cut-topic-clock><p><span>' + esc(t('topicTime')) + '</span> <span class="cut-topic-time" data-cut-topic-time aria-live="off">' + time.text + '</span></p><p class="cut-topic-reminder" data-cut-topic-reminder role="status"' + (time.expired ? '' : ' hidden') + '>' + (time.expired ? esc(t('topicTimeUp')) : '') + '</p></div>';
  }
  function updateTopicClock(element, cut, now = Date.now()) {
    const time = topicTime(cut, now), value = element.querySelector('[data-cut-topic-time]'), reminder = element.querySelector('[data-cut-topic-reminder]');
    if (value && value.textContent !== time.text) value.textContent = time.text;
    if (reminder) {
      const message = time.expired ? t('topicTimeUp') : '';
      if (reminder.textContent !== message) reminder.textContent = message;
      if (reminder.hidden !== !time.expired) reminder.hidden = !time.expired;
    }
  }

  /* Mode 2 · Jump In. The Main Speaker's clock is drawn locally from the public
     anchor, like the topic clock. It only runs while the Main Speaker talks. */
  function mainTime(cut, now = Date.now()) {
    const clock = cut?.mainClock;
    const validClock = clock && Number.isFinite(clock.durationMs) && clock.durationMs > 0 && Number.isFinite(clock.elapsedMs) && clock.elapsedMs >= 0;
    const running = !!validClock && clock.runningSince != null && Number.isFinite(clock.runningSince);
    const durationMs = validClock ? clock.durationMs : (Number(cut?.mainMinutes) || 4) * 60000;
    const elapsedMs = validClock ? clock.elapsedMs + (running ? Math.max(0, now - clock.runningSince) : 0) : 0;
    const remainingMs = Math.max(0, durationMs - elapsedMs), seconds = Math.ceil(remainingMs / 1000);
    const text = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    return { remainingMs, text, running };
  }
  // Stays in the same place for the whole round, whoever is talking right now.
  function renderMainClock(cut, now = Date.now()) {
    if (cut.speaker == null) return '';
    const time = mainTime(cut, now);
    return '<div class="cut-main" data-cut-main data-cut-running="' + time.running + '"><span class="cut-main-label">' + esc(t('mainSpeaker')) + '</span> <strong class="cut-main-name">' + esc(name(cut, cut.speaker)) + '</strong> <span class="cut-main-time" data-cut-main-time aria-live="off">' + time.text + '</span></div>';
  }
  function updateMainClock(element, cut, now = Date.now()) {
    const value = cut?.mode === 'jump' ? element.querySelector('[data-cut-main-time]') : null;
    if (!value) return;
    const text = mainTime(cut, now).text;
    if (value.textContent !== text) value.textContent = text;
  }
  function mainOptions(values, selected) {
    const options = list(values).length ? list(values) : [3, 4, 5], named = options.length === 3;
    return options.map((minutes, index) => '<option value="' + Number(minutes) + '"' + (Number(selected) === Number(minutes) ? ' selected' : '') + '>' +
      esc(t(named ? ['mainQuick', 'mainNormal', 'mainLong'][index] : 'mainOther', { n: Number(minutes) })) + '</option>').join('');
  }

  function topicLibrary(items, category = 'mixed', search = '') {
    const rows = list(items), term = String(search || '').trim().toLocaleLowerCase();
    const counts = { mixed: rows.length };
    for (const row of rows) counts[row.category] = (counts[row.category] || 0) + 1;
    const filtered = rows.filter(row => (category === 'mixed' || row.category === category) && (!term || (String(row.question || '') + ' ' + String(row.starter || '')).toLocaleLowerCase().includes(term)));
    // Mode 2 topics have no opening line to take over.
    const html = filtered.length ? filtered.map(row => '<article class="cut-library-item"><p class="cut-library-category">' + esc(t(row.category)) + '</p><h3>' + esc(row.question) + '</h3>' + (row.starter ? '<p class="cut-library-starter"><span>' + esc(t('libraryStarter')) + '</span> ' + esc(row.starter) + '</p>' : '') + '</article>').join('') : '<p class="cut-soft cut-library-empty">' + esc(t('libraryEmpty')) + '</p>';
    return { html, count: filtered.length, total: rows.length, counts };
  }
  function jumpScene(cut, actor, now, animate) {
    const phase = cut.phase, me = Number(actor), main = cut.speaker;
    const isMain = me > 0 && me === Number(main), isIn = phase === 'interrupt';
    const guest = isIn ? cut.interrupter : null, isGuest = me > 0 && guest != null && me === Number(guest);
    let floor;
    if (phase === 'ready' || phase === 'setup') {
      floor = speaker(cut, main, t('mainSpeaker'), isMain) + `<p class="cut-cue cut-waiting">${esc(t(phase === 'setup' ? cut.sharedControls ? 'sharedConfiguring' : 'configuring' : 'jumpWaitingBegin'))}</p>`;
      if (phase === 'ready' && me > 0 && cut.canBegin) floor += `<button type="button" class="cut-button cut-primary cut-begin" data-cut-action="begin">${esc(t('begin'))}</button>`;
    } else if (phase === 'countdown') {
      floor = speaker(cut, main, t('mainSpeaker'), isMain) + `<p class="cut-cue">${esc(t('getReady'))}</p><div class="cut-countdown" data-cut-countdown aria-live="off">${countdown(cut, now) || 'GO!'}</div>`;
    } else if (phase === 'speaking') {
      floor = speaker(cut, main, t('mainSpeaker'), isMain) + `<p class="cut-cue cut-go">${esc(t('go'))}</p><p class="cut-soft">${esc(t(isMain || !me ? 'jumpSpeakHint' : 'jumpListen'))}</p>`;
    } else if (isIn) {
      // No countdown, clock or progress bar: the interruption is free.
      floor = `<div class="cut-burst" aria-label="CUT!"><strong>CUT!</strong><p>${esc(t('jumpCutHint'))}</p></div>` + speaker(cut, guest, t('jumpIn'), isGuest, 'cut-reveal') +
        `<p class="cut-cue cut-waiting">${esc(isGuest || !me ? t('jumpInHint') : t(isMain ? 'jumpHold' : 'jumpInWait', { name: name(cut, guest) }))}</p>`;
      if (isGuest && cut.canFinish) floor += `<div class="cut-jump-actions"><button type="button" class="cut-button cut-primary" data-cut-action="done">${esc(t('done'))}</button><button type="button" class="cut-button" data-cut-action="skip">${esc(t('skip'))}</button></div>`;
    } else if (phase === 'timeup') {
      // Time alone never ends the round: someone adds time, or the table agrees to end it.
      floor = `<div class="cut-rest"><span aria-hidden="true">⏰</span><h3>${esc(t('jumpTimeUp'))}</h3><p class="cut-soft">${esc(t('jumpTimeUpHint'))}</p></div>`;
      if (me > 0 && cut.canExtend) floor += `<button type="button" class="cut-button cut-primary cut-begin" data-cut-action="extend">${esc(t('extend', { n: cut.extendMinutes || 1 }))}</button>`;
    } else if (phase === 'back') {
      floor = speaker(cut, main, t('backTo'), isMain, 'cut-reveal') + `<p class="cut-cue cut-go">${esc(t('keepGoing'))}</p>`;
    } else {
      const finished = ['finished', 'stopped'].includes(phase), ended = phase === 'break';
      const thanks = ended && ['time', 'ended'].includes(cut.roundEnd) && cut.previousSpeaker != null ? t('jumpThanks', { name: name(cut, cut.previousSpeaker) }) + ' ' : '';
      const title = phase === 'paused' ? 'paused' : finished ? 'finished' : cut.roundEnd === 'time' ? 'jumpTimeUp' : 'breakTitle';
      const hint = phase === 'paused' ? cut.pauseReason === 'not_enough_players' ? 'not_enough_players' : cut.sharedControls ? 'sharedPaused' : 'pausedHint' : finished ? cut.sharedControls ? 'sharedFinished' : 'finishedHint' : cut.sharedControls ? 'sharedJumpBreak' : 'jumpBreakHint';
      floor = `<div class="cut-rest"><span aria-hidden="true">${phase === 'paused' ? 'Ⅱ' : finished ? (isHalloween(cut) ? '🦇' : '✂️') : cut.roundEnd === 'time' ? '⏰' : isHalloween(cut) ? '🕯️' : '☕'}</span><h3>${esc(t(title))}</h3><p class="cut-soft">${esc(thanks + t(hint))}</p></div>`;
    }
    const yours = isMain && ['countdown', 'speaking', 'back'].includes(phase);
    const excluded = me > 0 && list(cut.roster).find(p => Number(p.playerNum) === me)?.active === false;
    return `<div class="cut-stage cut-jump${isHalloween(cut) ? ' cut-hw' : ''}${isIn ? ' cut-is-cut' : ''}${isIn && !animate ? ' cut-static' : ''}${yours ? ' cut-is-you' : ''}" data-cut-phase="${esc(phase)}">
      <div class="cut-topic"><p class="cut-kicker">${esc(t(topicHeading(cut)))}</p><h2>${esc(cut.topic?.question || '')}</h2>${renderMainClock(cut, now)}${me > 0 && cut.canExtend && phase !== 'timeup' ? `<button type="button" class="cut-button cut-extend" data-cut-action="extend">${esc(t('extend', { n: cut.extendMinutes || 1 }))}</button>` : ''}</div>
      <div class="cut-floor" role="status" aria-live="polite">${floor}</div>
      ${excluded ? `<p class="cut-soft cut-sitting-out">${esc(t('sittingOut'))}</p>` : ''}
    </div>`;
  }
  function scene(cut, actor = 0, now = Date.now(), { animate = true } = {}) {
    if (!cut) return '';
    if (cut.mode === 'jump') return jumpScene(cut, actor, now, animate);
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
      floor = `<div class="cut-rest"><span aria-hidden="true">${phase === 'paused' ? 'Ⅱ' : finished ? (isHalloween(cut) ? '🦇' : '✂️') : isHalloween(cut) ? '🕯️' : '☕'}</span><h3>${esc(t(title))}</h3><p class="cut-soft">${esc(t(hint))}</p></div>`;
    }
    const excluded = actor && list(cut.roster).find(p => Number(p.playerNum) === Number(actor))?.active === false;
    // The Halloween edition also shows its spooky opening line under the topic.
    const opening = isHalloween(cut) && cut.topic?.starter ? `<p class="cut-hw-opening"><span>${esc(t('hwOpening'))}</span> ${esc(cut.topic.starter)}</p>` : '';
    return `<div class="cut-stage${isHalloween(cut) ? ' cut-hw' : ''}${isCut ? ' cut-is-cut' : ''}${isCut && !animate ? ' cut-static' : ''}${personal && inPlay ? ' cut-is-you' : ''}" data-cut-phase="${esc(phase)}">
      <div class="cut-topic"><p class="cut-kicker">${esc(t(topicHeading(cut)))}</p><h2>${esc(cut.topic?.question || '')}</h2>${opening}${renderTopicClock(cut, now)}</div>
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
    // Mode 2: DONE and SKIP sit on the interrupter's own card. Anyone else can still hand the floor back.
    if (cut.phase === 'interrupt' && cut.canFinish && Number(cut.interrupter) !== Number(actor)) actions += button('done', 'backToMain');
    const options = (values, selected) => values.map(value => `<option value="${value}"${selected === value ? ' selected' : ''}>${esc(t(value))}</option>`).join('');
    const jumpMode = cut.mode === 'jump';
    // Only an engine that knows editions lists them; an older service never receives one.
    const editions = list(cut.editions).filter(value => ['classic', 'halloween'].includes(value));
    const editionField = editions.length > 1 ? `<label class="cut-field"><span>${esc(t('edition'))}</span><select name="edition" data-cut-setting>${editions.map(value => `<option value="${value}"${(cut.edition || 'classic') === value ? ' selected' : ''}>${esc(t(value + 'Edition'))}</option>`).join('')}</select></label><p class="cut-soft" data-cut-edition-switch hidden>${esc(t('editionSwitchHint'))}</p>` : '';
    // Capability-gated: a card served by an older executor sends no new option.
    const topicStyles = list(cut.topicStyles).filter(value => ['situations', 'story_openings'].includes(value));
    const styleField = topicStyles.length > 1 ? `<div class="cut-hw-topic-style" data-cut-topic-style-field${isHalloween(cut) ? '' : ' hidden'}><label class="cut-field"><span>${esc(t('topicStyle'))}</span><select name="topicStyle" data-cut-setting>${topicStyles.map(value => `<option value="${value}"${(cut.topicStyle || 'situations') === value ? ' selected' : ''}>${esc(t(value))}</option>`).join('')}</select></label><p class="cut-soft" data-cut-topic-style-description>${esc(t(cut.topicStyle === 'story_openings' ? 'storyOpeningsDesc' : 'situationsDesc'))}</p><p class="cut-soft" data-cut-topic-style-switch hidden>${esc(t('topicStyleSwitchHint'))}</p></div>` : '';
    const settings = cut.phase === 'setup' ? `<form class="cut-card-settings" data-cut-settings novalidate>${editionField}${styleField}<label class="cut-field"><span>${esc(t('mode'))}</span><select name="mode" data-cut-setting>${options(['classic', 'jump'], jumpMode ? 'jump' : 'classic')}</select></label><p class="cut-soft" data-cut-mode-switch hidden>${esc(t('modeSwitchHint'))}</p><div class="cut-mode-fields" data-cut-jump-fields${jumpMode ? '' : ' hidden'}><label class="cut-field"><span>${esc(t('mainTime'))}</span><select name="mainMinutes" data-cut-setting>${mainOptions(cut.mainOptions, cut.mainMinutes)}</select></label><p class="cut-soft">${esc(t('mainTimeHint'))}</p><p class="cut-kicker" >${esc(t('firstCutAfter'))}</p><div class="cut-settings"><label class="cut-field"><span >${esc(t('customMin'))}</span><input type="number" name="firstCutMinSeconds" data-cut-setting min="5" max="300" step="1" inputmode="numeric" required value="${esc(cut.firstCutMinSeconds ?? 25)}" aria-describedby="cut-card-jump-hint cut-card-jump-error"></label><label class="cut-field"><span >${esc(t('customMax'))}</span><input type="number" name="firstCutMaxSeconds" data-cut-setting min="5" max="300" step="1" inputmode="numeric" required value="${esc(cut.firstCutMaxSeconds ?? 45)}" aria-describedby="cut-card-jump-hint cut-card-jump-error"></label></div><p class="cut-kicker" >${esc(t('cutInterval'))}</p><div class="cut-settings"><label class="cut-field"><span >${esc(t('customMin'))}</span><input type="number" name="cutIntervalMinSeconds" data-cut-setting min="5" max="300" step="1" inputmode="numeric" required value="${esc(cut.cutIntervalMinSeconds ?? 30)}" aria-describedby="cut-card-jump-hint cut-card-jump-error"></label><label class="cut-field"><span >${esc(t('customMax'))}</span><input type="number" name="cutIntervalMaxSeconds" data-cut-setting min="5" max="300" step="1" inputmode="numeric" required value="${esc(cut.cutIntervalMaxSeconds ?? 55)}" aria-describedby="cut-card-jump-hint cut-card-jump-error"></label></div><p class="cut-soft" id="cut-card-jump-hint">${esc(t('jumpTimingHint'))}</p><p class="cut-feedback" id="cut-card-jump-error" data-cut-jump-error role="alert"></p></div><div class="cut-mode-fields" data-cut-classic-fields${jumpMode ? ' hidden' : ''}><div class="cut-settings"><label class="cut-field"><span>${esc(t('speed'))}</span><select name="speed" data-cut-setting>${options(['normal', 'chill', 'chaos', 'custom'], cut.speed)}</select></label><label class="cut-field" data-cut-category-field><span>${esc(t('category'))}</span><select name="category" data-cut-setting>${options(['mixed', 'real', 'absurd', 'personal', 'ideas'], cut.category)}</select></label></div><p class="cut-soft" data-cut-category-note hidden>${esc(t('hwCategoryNote'))}</p><label class="cut-field"><span>${esc(t('topicTime'))}</span><input type="number" name="topicMinutes" data-cut-setting required min="1" max="60" step="1" inputmode="numeric" value="${esc(cut.topicMinutes ?? 10)}" aria-describedby="cut-card-topic-hint cut-card-topic-error"></label><p class="cut-soft" id="cut-card-topic-hint">${esc(t('topicMinutesHint'))}</p><p class="cut-feedback" id="cut-card-topic-error" data-cut-topic-error role="alert"></p><div class="cut-custom" data-cut-custom-fields${cut.speed === 'custom' ? '' : ' hidden'}><div class="cut-settings"><label class="cut-field"><span>${esc(t('customMin'))}</span><input type="number" name="customMinSeconds" data-cut-setting min="5" max="120" step="1" inputmode="numeric" value="${esc(cut.customMinSeconds ?? 15)}"></label><label class="cut-field"><span>${esc(t('customMax'))}</span><input type="number" name="customMaxSeconds" data-cut-setting min="5" max="120" step="1" inputmode="numeric" value="${esc(cut.customMaxSeconds ?? 25)}"></label></div><p class="cut-soft">${esc(t('customHint'))}</p><p class="cut-feedback" data-cut-custom-error role="alert"></p></div></div><div class="cut-controls"><button type="submit" class="cut-button cut-primary" data-cut-settings-save>${esc(t('saveSettings'))}</button>${button('cancelSettings', 'closeSettings')}</div></form>` : '';
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
          this.sound.toggle();
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
      if (cut.sharedControls === true || cut.audio?.version === 1) {
        if (!this.sound) { this.sound = new Sound(() => this.paintSound()); this.sound.enabled = false; }
        if (previous?.sessionId !== cut.sessionId) { this.sound.previous = null; this.sound.seen.clear(); }
      } else if (this.sound) { this.sound.close(); this.sound = null; }
      if (previous?.sessionId !== cut.sessionId || previous?.turnId !== cut.turnId) this.error = '';
      if (this.pending && cut.reply?.id === this.pending.id) {
        this.error = cut.reply.error ? t(cut.reply.error === 'invalid_setup' ? 'invalid_options' : ['stale_turn', 'not_available', 'not_enough_players', 'invalid_options'].includes(cut.reply.error) ? cut.reply.error : 'error') : '';
        this.pending = null;
      } else if (this.pending && (this.pending.sessionId !== cut.sessionId || this.pending.turnId !== cut.turnId)) this.pending = null;
      const request = data.cutAction;
      if (!this.pending && (['begin', 'done', 'skip', 'extend'].includes(request?.type) || cut.sharedControls === true && ['next', 'pause', 'resume', 'exclude', 'recover', 'endTopic', 'settings', 'configure', 'cancelSettings', 'stop', 'restart'].includes(request?.type)) && request.sessionId === cut.sessionId && request.turnId === cut.turnId && typeof request.id === 'string' && request.id.length >= 8 && request.id.length <= 100 && cut.reply?.id !== request.id) this.pending = request;
      const key = JSON.stringify([typeof I18N !== 'undefined' ? I18N.lang : '', data.name, data.playerNum, cut.sessionId, cut.turnId, cut.phase, cut.canBegin, cut.canEndTopic, cut.sharedControls, cut.canManage, cut.speed, cut.category, cut.customMinSeconds, cut.customMaxSeconds, cut.topicMinutes, cut.topic, cut.speaker, cut.nextSpeaker, cut.cutEvent, cut.roster,
        cut.mode, cut.mainMinutes, cut.mainOptions, cut.mainClock?.durationMs, cut.interrupter, cut.canFinish, cut.roundEnd, cut.canExtend, cut.edition, cut.editions, cut.topicStyle, cut.topicStyles, cut.audio?.version === 1]);
      if (this.renderKey !== key) {
        this.renderKey = key;
        const managementOpen = this.element.querySelector('[data-cut-management]')?.open;
        const cutKey = ['cut', 'interrupt'].includes(cut.phase) ? `${cut.sessionId}:${cut.cutEvent?.id || cut.turnId}` : '';
        const animate = !cutKey || cutKey !== this.animatedCut;
        if (cutKey) this.animatedCut = cutKey;
        this.element.innerHTML = `<div class="secret-card cut-player${isHalloween(cut) ? ' cut-hw' : ''}">${this.nameBanner(data)}<span class="cut-kicker cut-brand">${isHalloween(cut) ? '🎃 CUT!' : '✂️ CUT!'}</span><div class="cut-player-scene">${scene(cut, data.playerNum, this.now(), { animate })}</div>${sharedPanel(cut, data.playerNum)}${this.sound ? `<div class="cut-controls"><button type="button" class="cut-button cut-sound" data-cut-sound title="${esc(t('cardSoundHint'))}" aria-pressed="false">${esc(t('soundOff'))}</button></div><p class="cut-feedback" data-cut-sound-hint>${esc(t('cardSoundHint'))}</p><p class="cut-feedback" data-cut-sound-status role="status"></p>` : ''}<p class="cut-feedback" data-cut-action-status role="status"></p><p class="cut-feedback" data-cut-connection role="status"></p></div>`;
        if (managementOpen && this.element.querySelector('[data-cut-management]')) this.element.querySelector('[data-cut-management]').open = true;
      }
      this.paint();
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const now = this.now(), cut = this.data.cut;
      const clock = this.element.querySelector('[data-cut-countdown]');
      if (clock) clock.textContent = countdown(cut, now) || 'GO!';
      updateTopicClock(this.element, cut, now);
      updateMainClock(this.element, cut, now);
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
        const jumpForm = (settings.mode ?? cut.mode) === 'jump';
        const jumpValid = validJumpTiming(settings);
        for (const name of jumpTimingKeys) {
          const field = form.querySelector('[name="' + name + '"]');
          if (field) { field.disabled = !enabled || !jumpForm; field.required = jumpForm; field.setAttribute?.('aria-invalid', String(jumpForm && !jumpValid)); }
        }
        const jumpError = form.querySelector('[data-cut-jump-error]');
        if (jumpError) jumpError.textContent = jumpForm && !jumpValid ? t('jumpTimingError') : '';
        const jumpFields = form.querySelector('[data-cut-jump-fields]'), classicFields = form.querySelector('[data-cut-classic-fields]'), switching = form.querySelector('[data-cut-mode-switch]');
        if (jumpFields) jumpFields.hidden = !jumpForm;
        if (classicFields) classicFields.hidden = jumpForm;
        if (switching) switching.hidden = jumpForm === (cut.mode === 'jump');
        const formEdition = settings.edition ?? (cut.edition || 'classic');
        const editionSwitch = form.querySelector('[data-cut-edition-switch]');
        if (editionSwitch) editionSwitch.hidden = formEdition === (cut.edition || 'classic');
        const styleField = form.querySelector('[data-cut-topic-style-field]');
        if (styleField) styleField.hidden = formEdition !== 'halloween';
        const styleSwitch = form.querySelector('[data-cut-topic-style-switch]');
        if (styleSwitch) styleSwitch.hidden = formEdition !== 'halloween' || settings.topicStyle === (cut.topicStyle || 'situations');
        const styleDescription = form.querySelector('[data-cut-topic-style-description]');
        if (styleDescription) styleDescription.textContent = t(settings.topicStyle === 'story_openings' ? 'storyOpeningsDesc' : 'situationsDesc');
        const categoryField = form.querySelector('[data-cut-category-field]'), categoryNote = form.querySelector('[data-cut-category-note]');
        if (categoryField) categoryField.hidden = formEdition === 'halloween';
        if (categoryNote) categoryNote.hidden = formEdition !== 'halloween';
        const customFields = form.querySelector('[data-cut-custom-fields]');
        if (customFields) customFields.hidden = !custom;
        for (const name of ['customMinSeconds', 'customMaxSeconds']) {
          const field = form.querySelector(`[name="${name}"]`);
          if (field) { field.disabled = !enabled || !custom; field.required = custom;
            field.setAttribute?.('aria-invalid', String(custom && !valid)); }
        }
        const message = form.querySelector('[data-cut-custom-error]');
        if (message) message.textContent = custom && !valid ? t('customRangeError') : '';
        const topicField = form.querySelector('[name="topicMinutes"]'), topicValid = validTopicMinutes(settings.topicMinutes);
        topicField?.setAttribute?.('aria-invalid', String(!topicValid));
        const topicError = form.querySelector('[data-cut-topic-error]');
        if (topicError) topicError.textContent = topicValid ? '' : t('topicMinutesError');
      }
      const feedback = this.element.querySelector('[data-cut-action-status]');
      if (feedback) feedback.textContent = this.error || (this.pending ? t('sending') : '');
      if (this.sound) {
        const audible = this.connected() &&
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
      if (status) status.textContent = sound.unsupported ? t('soundUnsupported') : sound.assetError ? t('hwLoadError') : sound.assetLoading ? t('hwLoading') : waiting ? t('soundBlocked') : '';
      const hint = this.element.querySelector('[data-cut-sound-hint]');
      if (hint) hint.hidden = sound.enabled && sound.context?.state === 'running' && !sound.blocked;
    }
    settingsInput(form) {
      const speed = form.querySelector('[name="speed"]')?.value;
      const seconds = name => {
        const value = form.querySelector(`[name="${name}"]`)?.value;
        return typeof value === 'string' && value.trim() ? Number(value) : NaN;
      };
      const cut = this.data.cut, mode = form.querySelector('[name="mode"]')?.value;
      // Mode 2 hides the Mode 1 fields, so a half-typed pace cannot block its save.
      const input = mode === 'jump' ? { speed: cut.speed, category: cut.category, topicMinutes: cut.topicMinutes ?? 10,
        customMinSeconds: cut.customMinSeconds ?? 15, customMaxSeconds: cut.customMaxSeconds ?? 25 }
        : { speed, category: form.querySelector('[name="category"]')?.value, topicMinutes: seconds('topicMinutes'),
          customMinSeconds: speed === 'custom' ? seconds('customMinSeconds') : cut.customMinSeconds ?? 15,
          customMaxSeconds: speed === 'custom' ? seconds('customMaxSeconds') : cut.customMaxSeconds ?? 25 };
      if (mode !== undefined) { input.mode = mode; input.mainMinutes = seconds('mainMinutes'); }
      const edition = form.querySelector('[name="edition"]')?.value;
      if (edition !== undefined) input.edition = edition;
      const topicStyle = form.querySelector('[name="topicStyle"]')?.value;
      if (topicStyle !== undefined) input.topicStyle = topicStyle;
      for (const key of jumpTimingKeys) input[key] = mode === 'jump' ? seconds(key) : cut[key] ?? jumpTimingDefaults[key];
      return input;
    }
    validTiming({ customMinSeconds: min, customMaxSeconds: max }) {
      return Number.isInteger(min) && Number.isInteger(max) && min >= 5 && max <= 120 && min <= max;
    }
    canBegin() {
      const cut = this.data?.cut;
      return !this.destroyed && !this.pending && typeof this.send === 'function' && this.connected() && ['ready', 'cut'].includes(cut?.phase) && cut.canBegin === true && (cut.sharedControls === true || !cut.hostLiveUntil || this.now() <= cut.hostLiveUntil);
    }
    canFinish() {
      const cut = this.data?.cut;
      return !this.destroyed && !this.pending && typeof this.send === 'function' && this.connected() && cut?.phase === 'interrupt' && cut.canFinish === true && (cut.sharedControls === true || !cut.hostLiveUntil || this.now() <= cut.hostLiveUntil);
    }
    canExtend() {
      const cut = this.data?.cut;
      return !this.destroyed && !this.pending && typeof this.send === 'function' && this.connected() && cut?.canExtend === true && (cut.sharedControls === true || !cut.hostLiveUntil || this.now() <= cut.hostLiveUntil);
    }
    canAction(type, extra = {}) {
      if (type === 'begin') return this.canBegin();
      if (type === 'done' || type === 'skip') return this.canFinish();
      if (type === 'extend') return this.canExtend();
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
      if (type === 'configure') return cut.phase === 'setup' && ['normal', 'chill', 'chaos', 'custom'].includes(extra.speed) && ['mixed', 'real', 'absurd', 'personal', 'ideas'].includes(extra.category) && this.validTiming(extra) && validTopicMinutes(extra.topicMinutes ?? cut.topicMinutes ?? 10) &&
        (extra.mode === undefined || ['classic', 'jump'].includes(extra.mode)) && (extra.edition === undefined || list(cut.editions).includes(extra.edition)) && (extra.topicStyle === undefined || list(cut.topicStyles).includes(extra.topicStyle)) && (extra.mainMinutes === undefined || list(cut.mainOptions).includes(extra.mainMinutes)) && ((extra.mode ?? cut.mode) !== 'jump' || validJumpTiming({ ...cut, ...extra }));
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

  // Halloween media is lazy: a classic/quiet card does not fetch any clip.
  let halloweenAudioLoad = null;
  function halloweenAudioModule() {
    if (typeof CUT_HALLOWEEN_AUDIO !== 'undefined') return Promise.resolve(CUT_HALLOWEEN_AUDIO);
    if (halloweenAudioLoad) return halloweenAudioLoad;
    halloweenAudioLoad = new Promise((resolve, reject) => {
      if (typeof document === 'undefined' || !document.createElement) return reject(new Error('audio_unavailable'));
      const script = document.createElement('script');
      script.src = 'cut-halloween-audio.js?v=cut-15';
      script.onload = () => typeof CUT_HALLOWEEN_AUDIO !== 'undefined' ? resolve(CUT_HALLOWEEN_AUDIO) : reject(new Error('audio_unavailable'));
      script.onerror = () => { script.remove(); reject(new Error('audio_unavailable')); };
      document.head.appendChild(script);
    }).catch(error => { halloweenAudioLoad = null; throw error; });
    return halloweenAudioLoad;
  }
  /* Classic cues stay local synthesis. Halloween uses the recorded board;
     shared cards remain muted until their own explicit gesture. */
  class Sound {
    constructor(onChange = () => {}) {
      this.context = null; this.enabled = true; this.blocked = false; this.unsupported = false;
      this.onChange = onChange; this.previous = null; this.seen = new Set(); this.voices = new Set();
      // The Halloween edition swaps in spooky cues. A host page may also take
      // over the CUT moment itself (onCut returns true when it played something).
      this.edition = 'classic'; this.onCut = null;
      this.halloweenBoard = null; this.halloweenOwned = false;
      this.assetLoading = false; this.assetError = false; this.closed = false; this.unlockEpoch = 0;
      this.roomSnapshot = null; this.roomSessionId = null; this.roomEventId = null; this.roomAudible = false; this.roomMusicKey = '';
      this.visibilityHandler = () => { if (document.hidden) this.silence(); };
      if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', this.visibilityHandler);
    }
    useHalloweenBoard(board) { this.halloweenBoard = board; this.halloweenOwned = false; }
    async unlock() {
      if (!this.enabled || this.closed) return false;
      const epoch = ++this.unlockEpoch;
      this.assetError = false;
      let ctx = this.context;
      const cancelled = () => this.closed || epoch !== this.unlockEpoch || !this.enabled || this.context !== ctx;
      try {
        const Audio = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!Audio) { this.unsupported = true; this.onChange(); return false; }
        if (!this.context || this.context.state === 'closed') this.context = new Audio();
        ctx = this.context;
        await ctx.resume();
        if (this.closed || epoch !== this.unlockEpoch || this.context !== ctx || !this.enabled) return false;
        this.blocked = ctx.state !== 'running';
        if (!this.blocked && this.edition === 'halloween') {
          this.assetLoading = true; this.onChange();
          const module = await halloweenAudioModule();
          if (this.closed || epoch !== this.unlockEpoch || !this.enabled) return false;
          if (!this.halloweenBoard) { this.halloweenBoard = new module.Board({ context: ctx }); this.halloweenOwned = true; }
          const ready = await this.halloweenBoard.unlock();
          if (this.closed || epoch !== this.unlockEpoch || !this.enabled) return false;
          this.assetError = !ready && this.halloweenBoard.assetError === true;
          this.blocked = !ready;
        }
      } catch (e) {
        if (cancelled()) return false;
        this.blocked = true;
        if (this.edition === 'halloween' && ctx?.state === 'running') this.assetError = true;
      }
      finally { if (epoch === this.unlockEpoch) this.assetLoading = false; }
      if (cancelled()) return false;
      if (this.halloweenBoard?.track !== this.roomSnapshot?.cut.audio.music) this.roomMusicKey = '';
      if (this.roomSnapshot) {
        const latest = this.roomSnapshot;
        this.syncRoom(latest.cut, latest.now + Math.max(0, Date.now() - latest.receivedAt), latest.audible);
      }
      this.onChange(); return !this.blocked && !!this.context;
    }
    stopCues() {
      for (const voice of this.voices) { try { voice.stop(); voice.disconnect(); } catch (e) {} }
      this.voices.clear();
      this.halloweenBoard?.stopEffects?.();
    }
    silence() {
      this.stopCues();
      if (this.halloweenBoard?.track) this.halloweenBoard.stopMusic?.();
      this.roomMusicKey = ''; this.roomAudible = false;
    }
    toggle() {
      if (this.enabled && !this.unsupported && (this.blocked || !this.context)) return this.unlock();
      this.enabled = !this.enabled;
      if (!this.enabled) { this.unlockEpoch++; this.assetLoading = false; this.silence(); }
      this.onChange(); return this.enabled ? this.unlock() : Promise.resolve(false);
    }
    tone(frequency, length, delay = 0, type = 'sine', volume = .08) {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      volume *= this.roomSnapshot ? this.roomSnapshot.cut.audio.effectsVolume / .65 : 1;
      if (!(volume > 0)) return;
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
      if (!this.enabled || this.closed) return;
      if (key === 'cut' && typeof this.onCut === 'function' && this.onCut()) return;
      if (this.edition === 'halloween') return this.spooky(key);
      if (key === 'cut') { this.tone(185, .18, 0, 'sawtooth', .11); this.tone(130, .15, .11, 'square', .06); }
      else if (key === 'reveal') { this.tone(620, .1, .16); this.tone(830, .15, .25); }
      else if (key === 'go') { this.tone(720, .13); this.tone(980, .18, .11); }
      else if (key === 'round') { this.tone(460, .1); this.tone(610, .12, .11); }
      else if (key === 'time') { this.tone(610, .14); this.tone(460, .22, .14); }
      else this.tone(520, .065, 0, 'sine', .05);
    }
    spooky(key) {
      // No synthetic scream/voice fallback. A load error leaves the visual CUT usable.
      if (key === 'cut' && this.roomSnapshot && this.halloweenBoard?.ready) {
        const { cut } = this.roomSnapshot, audio = cut.audio;
        const scare = typeof cut.cutEvent?.audioScare === 'boolean' ? cut.cutEvent.audioScare : audio.autoScare;
        if (!scare) return (this.halloweenBoard.sting?.() || 0) > 0;
        const choices = ['scream', 'laugh', 'ghost', 'howl', 'thunder'];
        let hash = 2166136261;
        for (const ch of String(cut.cutEvent?.id || cut.sessionId)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
        const effect = cut.cutEvent?.audioKey || (audio.cutEffect !== 'random' ? audio.cutEffect : choices[hash % choices.length]);
        return (this.halloweenBoard.play?.(effect) || 0) > 0;
      }
      return this.halloweenBoard?.cue?.(key) || false;
    }
    syncRoom(cut, now, audible = true) {
      const audio = cut?.audio;
      if (!audio || audio.version !== 1) {
        if (this.roomSnapshot) this.silence();
        this.roomSnapshot = null; this.roomSessionId = null; this.roomEventId = null;
        return;
      }
      const newSession = this.roomSessionId !== cut.sessionId;
      const wasAudible = this.roomAudible;
      const newEvent = audio.event?.id && audio.event.id !== this.roomEventId;
      this.roomSessionId = cut.sessionId; this.roomEventId = audio.event?.id || null;
      this.roomSnapshot = { cut, now, audible, receivedAt: Date.now() };
      const canPlay = audible && (typeof document === 'undefined' || document.hidden !== true) && this.enabled && !this.closed && this.context?.state === 'running' && !['stopped', 'finished'].includes(cut.phase);
      this.roomAudible = canPlay && (cut.edition !== 'halloween' || this.halloweenBoard?.ready === true);
      const board = this.halloweenBoard;
      if (!canPlay || cut.edition !== 'halloween') {
        if (board?.track) board.stopMusic?.();
        if (!canPlay || this.edition !== 'halloween') board?.stopEffects?.();
        this.roomMusicKey = '';
        return;
      }
      if (!board?.ready) return;
      this.assetError = board.assetError === true;
      if (this.assetError) this.blocked = true;
      if (board.musicVolume !== audio.musicVolume) board.setMusicVolume?.(audio.musicVolume);
      if (board.effectsVolume !== audio.effectsVolume) board.setEffectsVolume?.(audio.effectsVolume);
      if (board.autoScare !== audio.autoScare) board.setAutoScare?.(audio.autoScare);
      const track = ['wind', 'rain', 'musicbox', 'crawl'].includes(audio.music) ? audio.music : null;
      const musicKey = `${cut.sessionId}:${track}:${audio.musicStartedAt}`;
      if (musicKey !== this.roomMusicKey) {
        this.roomMusicKey = musicKey;
        if (track) {
          const offsetSeconds = Number.isFinite(audio.musicStartedAt) ? Math.max(0, (now - audio.musicStartedAt) / 1000) : 0;
          Promise.resolve(board.startMusic?.(track, { offsetSeconds })).catch(() => {});
        } else if (board.track) board.stopMusic?.();
      }
      // Treat the first snapshot, muted/hidden/offline periods and old events as
      // consumed. Unlock/reconnect follows current music without replaying a scare.
      if (!newSession && wasAudible && newEvent && Number.isFinite(audio.event.at) && now - audio.event.at >= -1000 && now - audio.event.at <= 3000) {
        board.play?.(audio.event.key);
      }
    }
    update(cut, now, fresh = false, audible = true) {
      if (!cut) { this.previous = null; this.silence(); this.roomSnapshot = null; return; }
      this.edition = cut.edition === 'halloween' ? 'halloween' : 'classic';
      this.syncRoom(cut, now, audible);
      const previous = this.previous;
      const phaseKey = `${cut.sessionId}:${cut.turnId}:${cut.phase}`;
      if (fresh) { this.previous = null; this.seen.clear(); }
      // A reconnect or initial page restore must never replay an old CUT.
      const transitioned = audible && (!!previous || fresh);
      if (!this.seen.has(phaseKey)) {
        this.seen.add(phaseKey);
        const eventKey = 'cut:' + (cut.cutEvent?.id || phaseKey);
        // Mode 2's interruption is the same CUT moment, with the same cue.
        const cutPhase = cut.phase === 'cut' || cut.phase === 'interrupt';
        const newCut = cutPhase && !this.seen.has(eventKey);
        if (cutPhase) this.seen.add(eventKey);
        if (transitioned) {
          if (cutPhase) {
            if (newCut) { this.cue('cut'); if (cut.nextSpeaker || cut.interrupter) this.cue('reveal'); }
          }
          // "BACK TO …" chimes once; the clock then resumes without a second cue.
          else if (cut.phase === 'back') this.cue('go');
          else if (cut.phase === 'timeup') this.cue('time');
          else if (cut.phase === 'speaking' && ['countdown', 'handoff', 'cut'].includes(previous?.phase)) this.cue('go');
          else if (cut.phase === 'countdown' && (fresh || previous?.phase !== 'countdown' || previous?.sessionId !== cut.sessionId)) this.cue('round');
          else if (['setup', 'ready', 'paused', 'finished', 'stopped'].includes(cut.phase)) {
            if (this.roomSnapshot) this.stopCues(); else this.silence();
          }
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
    close() { this.closed = true; this.unlockEpoch++; this.assetLoading = false; this.silence(); this.previous = null; this.roomSnapshot = null; if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', this.visibilityHandler); if (this.halloweenOwned) this.halloweenBoard?.close(); this.halloweenBoard = null; this.context?.close().catch(() => {}); this.context = null; }
  }
  const jumpTimingDefaults = { firstCutMinSeconds: 25, firstCutMaxSeconds: 45, cutIntervalMinSeconds: 30, cutIntervalMaxSeconds: 55 };
  const jumpTimingKeys = Object.keys(jumpTimingDefaults);
  function validJumpTiming(options) {
    return [[jumpTimingKeys[0], jumpTimingKeys[1]], [jumpTimingKeys[2], jumpTimingKeys[3]]].every(([low, high]) =>
      Number.isInteger(options[low]) && Number.isInteger(options[high]) && options[low] >= 5 && options[high] <= 300 && options[low] <= options[high]);
  }
  return { jumpTimingDefaults, jumpTimingKeys, validJumpTiming, t, esc, list, name, countdown, validTopicMinutes, topicTime, renderTopicClock, updateTopicClock, mainTime, updateMainClock, mainOptions, topicLibrary, scene, Card, Sound };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_UI;
