/* Bilingual interface shared by the host and the existing player card page. */
var TALK_UI = (() => {
  const dict = {
    gameDuration: ['每局時間（分鐘）', 'Round length (minutes)'], crazyTaskDuration: ['任務期限（分鐘）', 'Mission limit (minutes)'],
    invalid_game_seconds: ['每局時間請填 1–60 分鐘，並以整數秒計時。', 'Choose 1–60 minutes, in whole seconds.'],
    invalid_crazy_task_seconds: ['任務期限請填 0.5–5 分鐘，並以整數秒計時。', 'Choose 0.5–5 minutes, in whole seconds.'],
    roundClock: ['本局剩餘 {time}', 'Round remaining {time}'],
    viewTime: ['查看時間', 'View time'], hideTime: ['收起時間', 'Hide time'],
    crazyActiveHostStatus: ['{n}/{max} 個任務進行中', '{n}/{max} active missions'],
    preparationClock: ['還有 {n} 秒思考時間', '{n} seconds to think'],
    roundRest: ['休息時間', 'Take a break'], roundFinished: ['這一局結束了', 'Round complete'],
    restHint: ['先休息一下，準備好再開新的一局。', 'Take a breather. Open a new round when you are ready.'],
    newRound: ['開新的一局', 'Start a new round'], roundScores: ['本局得分', 'Round scores'], scorePoints: ['{n} 分', '{n} pts'],
    addMinute: ['＋1 分鐘', '+1 minute'], finishRound: ['結束本局，休息', 'Finish and take a break'],
    participantTask: ['有任務', 'On a mission'], participantResting: ['休息中', 'Taking a break'],
    crazyExpired: ['這張任務已交給下一位，繼續聊吧。', 'This mission has passed to the next player. Keep chatting.'],
    crazyCancelled: ['這張任務已取消，先繼續聊。', 'This mission is cancelled. Keep chatting.'],
    scoreHint: ['完成 ＋1 分 · 玩家任務跳過 −1 分 · 系統換卡不扣分', 'Done +1 point · Skip player task −1 · Swap system task free'],
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
    missions_active: ['還有任務正在進行，請等任務結案後再開新局。', 'Some challenges are still active. Wait for them to finish before starting a new round.'],
    not_available: ['這個動作目前無法使用，請看最新畫面。', 'That action is no longer available. Check the current view.'],
    pending_questions: ['還有人想追問。可以先請對方問，或確認略過這些追問後交棒。', 'Someone is waiting to ask. Invite them, or confirm skipping the requests before handing over.'],
    question_open: ['目前有人在提問，請先回到原發言者。', 'A question is open. Return to the original speaker first.'],
    forceEnd: ['略過追問，下一位', 'Skip requests, next person'],
    confirmEnd: ['還有 {n} 位想追問。略過這些追問並讓下一位分享？', '{n} people still want to ask. Skip these requests and move to the next speaker?'],
    confirmSkip: ['確認略過並交棒', 'Confirm skip and hand over'],
    confirmNewTopic: ['開新的一局？目前的分享與任務會清空，時間和得分會重新開始。', 'Start a new round? Current turns, missions and points will reset.'],
    confirmOpen: ['確認開啟', 'Confirm and open'], cancel: ['取消', 'Cancel'],
    topicSettings: ['話題與設定', 'Topic and settings'],
    newTopicNotice: ['先預覽並調整設定。確認開啟後會重新思考、計時，得分歸零。', 'Preview the topic and settings. Confirming starts fresh thinking, a new clock and zero points.'],
    invalid_settings: ['思考時間請填 15–120 的整數秒。', 'Choose a whole thinking time from 15 to 120 seconds.'],
    invalid_crazy_interval: ['任務間隔請填 5–300 的整數秒，最短時間不能大於最長時間。', 'Use whole seconds from 5 to 300. The minimum cannot exceed the maximum.'],
    participantAway: ['已離席', 'Away'], participantPending: ['下一輪加入', 'Joining next round'],
    sitOut: ['暫時離席', 'Sit out'], rejoin: ['重新加入', 'Rejoin'],
    confirmation_required: ['請先確認這個操作。', 'Please confirm this action first.'],
    libraryUnavailable: ['題庫尚未載入，請重新整理，或自行輸入話題。', 'The topic library has not loaded. Refresh, or write your own topic.'],
    waitingServer: ['等待同步確認…', 'Waiting for confirmation…'],
    waiting_players: ['至少需要兩位玩家在線，請等候其他人回來。', 'At least two players must be online. Wait for another player to return.'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check the connection and try again.'],
    title: ['{name} 的談話頁', "{name}'s conversation"], player: ['參加者 {n}', 'Participant {n}'],
    room: ['房間 {code}', 'Room {code}'],
    setupTopic: ['這次聊什麼', 'Choose a topic'], setupMode: ['怎麼開始', 'How to begin'],
    thinkMode: ['先想一想，不用打字', 'Think first, no writing'], writeMode: ['可以寫一句想法', 'Optionally write a thought'],
    thinkingTime: ['思考時間', 'Thinking time'], seconds: ['{n} 秒', '{n} seconds'],
    gameMode: ['玩法', 'Game'], normalMode: ['Let’s Talk · 一起聊', 'Let’s Talk'], crazyMode: ['Crazy Talk · 搞笑台詞', 'Crazy Talk'],
    normalHint: ['一起提案、比較選擇、接著彼此的點子聊。', 'Make plans, compare options and build on each other’s ideas.'],
    crazyHint: ['邊聊邊收到短短的搞笑任務，也能寫一張放進待派佇列。隨時可以略過。', 'Short, silly missions arrive while you chat. Add your own to the queue. Skip anytime.'],
    crazyInterval: ['下一位的派發間隔', 'Time until the next player'], crazyMinSeconds: ['最短（秒）', 'Minimum (seconds)'], crazyMaxSeconds: ['最長（秒）', 'Maximum (seconds)'],
    crazyScheduleHint: ['手寫卡優先；收到任務的人可以隨時跳過。', 'Player cards go first. Anyone receiving a challenge can skip.'],
    crazyScheduledHostStatus: ['每 {min}–{max} 秒派給下一位 · {n}/2 個任務進行中', 'Next player every {min}–{max}s · {n}/2 active missions'],
    crazyFrequency: ['台詞頻率（每人，時間隨機錯開）', 'Line frequency (per person, randomly staggered)'], minutes: ['約每 {n} 分鐘', 'About every {n} min'],
    crazyTitle: ['🎧 Crazy Talk', '🎧 Crazy Talk'], crazyPrivate: ['只有你看得到', 'Only you can see this'],
    crazySayHint: ['找個時機說出這句話。', 'Say this when you find your moment.'],
    crazyDone: ['完成 ＋1 分', 'Done +1 point'], crazySkip: ['跳過，換人', 'Skip → next'],
    crazyWaiting: ['先繼續聊，任務會在隨機時間出現。', 'Keep chatting. A mission will arrive at a random time.'],
    crazyCompleted: ['完成，獲得 1 分！繼續一起聊。', 'Complete, +1 point! Keep chatting.'],
    crazySkipped: ['已跳過，換下一位玩家。', 'Skipped. The next player takes over.'],
    crazyPaused: ['新任務暫停派發，繼續聊吧。', 'New missions are paused. Keep chatting.'],
    crazySend: ['現在派發台詞', 'Send lines now'], crazyPause: ['暫停派發', 'Pause delivery'], crazyResume: ['繼續派發', 'Resume delivery'],
    crazyHostStatus: ['約每 {minutes} 分鐘／人 · {n} 人有待說台詞', 'About every {minutes} minutes per person · {n} pending lines'],
    crazyHostHint: ['完成得 1 分；跳過或逾時就交給下一位。', 'Done earns 1 point; skip or timeout passes it on.'],
    stale_prompt: ['這張任務已結束或更新，請看現在的卡片。', 'This mission has ended or changed. Use the current card.'],
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
    showStarters: ['顯示題目說明', 'Show question explanations'],
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
    libraryHint: ['從共同情境出發，大家可以提案、反駁或一起想解法。延伸問題接著同一個話題往下聊。', 'Start with a shared situation. Suggest ideas, disagree or find a solution together. Follow-ups keep the discussion going.'],
    useTopic: ['選這題', 'Use this question'],
    other_host: ['另一個主持頁正在控制這個房間；關閉那頁後，這裡會自動接續。', 'Another host tab is controlling this room. Close it to continue here.'],
    switched: ['玩家頁已切換到其他活動。要回來聊，可以重新開啟話題。', 'Player pages have switched activities. Open a topic to return here.'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the hub first.'],
    noFirebase: ['目前無法連線到玩家頁，請檢查網路後重新整理。', 'Player pages are unavailable. Check your connection and reload.'],
    intro: ['一起聊同一個情境，提案、接話或不同意都很好。', 'Explore a shared situation. Suggest an idea, build on one, or disagree.'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'],
    demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    details: ['怎麼參與', 'How to take part'],
    tip1: ['先留一點思考時間，再一起聊同一個情境。', 'Take a moment, then explore the shared situation together.'],
    tip2: ['想追問或接話，直接開口就好。', 'Ask or respond naturally, anytime.'],
    tip3: ['指定或隨機模式用卡片輪流分享；自由模式大家隨性聊。', 'Follow the turns in assigned or random mode, or chat together in free mode.'],
    tip4: ['共同畫面請保持開啟，語音照常在原本的通訊軟體進行。', 'Keep the shared screen open. Continue using your usual voice chat app.'],
    customDetails: ['加上名稱、說明或延伸問題', 'Add a title, explanation or follow-ups'],
    preparationSettings: ['開聊前的準備', 'Before you begin'],
    conversationMode: ['談話方式', 'Who talks next'], assignedMode: ['指定順序', 'Assigned order'],
    randomMode: ['隨機輪流', 'Random turns'], freeMode: ['自由談話', 'Free conversation'],
    conversationHintAssigned: ['依參與者順序輪流，說完就交給下一位。', 'Follow the participant order and hand over when done.'],
    conversationHintRandom: ['每輪隨機安排，每個人都有一次分享機會。', 'A new random order each round. Everyone gets a turn.'],
    conversationHintFree: ['沒有指定發言者，想接話就自然接著聊。', 'No assigned speaker. Join the conversation naturally.'],
    crazySource: ['任務來源', 'Mission source'], crazySourceSystem: ['系統隨機', 'System surprises'],
    crazySourcePlayers: ['玩家互派', 'Player assignments'], crazySourceMixed: ['系統＋玩家', 'System + players'],
    stateTitle: ['談話狀態', 'Conversation'], participantsTitle: ['參與者', 'At the table'],
    participantReady: ['準備好了', 'Ready'], participantThinking: ['思考中', 'Thinking'],
    participantWaiting: ['聆聽中', 'Listening'], participantSpeaking: ['分享中', 'Sharing'], participantYou: ['你', 'You'],
    freeStatus: ['大家自由聊', 'The floor is open'], freeParticipant: ['自由參與', 'Join in'],
    taskKind: ['即興任務', 'Improv mission'], lineKind: ['插入這句話', 'Slip in this line'],
    crazyTaskHint: ['照著做就好。', 'Just do what the card says.'],
    composeMission: ['寫個搞笑任務', 'Write a silly challenge'], missionRecipient: ['交給誰', 'Who gets it'],
    randomRecipient: ['隨機玩家', 'Random player'], missionType: ['卡片類型', 'Card type'], missionText: ['一句台詞或任務（最多 120 字）', 'One line or mission (up to 120 characters)'],
    missionPlaceholder: ['例如：學雞叫。／說「我愛上我的杯子了」。', 'Try: Cluck like a chicken. / Say “I’m in love with my cup.”'],
    missionSend: ['送出任務', 'Send challenge'], missionSent: ['已送出，系統會優先安排。', 'Sent. Your challenge takes priority.'],
    inspiration: ['找點靈感', 'Need ideas?'], inspirationHint: ['點一句加入草稿，再改成你的版本。', 'Tap an idea to add it to your draft, then make it yours.'],
    inspirationRefresh: ['換 3 個靈感', 'Show 3 more'], inspirationFull: ['草稿快滿了，先刪減一些文字再加入靈感。', 'Your draft is nearly full. Shorten it before adding an idea.'],
    missionQueuedCount: ['你有 {n} 張卡等待派發', 'Your cards waiting: {n}'],
    crazyPlayStyle: ['任務玩法', 'Challenge style'], crazyStyleFree: ['自由互派', 'Free play'], crazyStyleDirector: ['導演模式（至少 2 人）', 'Director mode (2+ players)'],
    crazyAdvanced: ['更多任務設定', 'More challenge settings'], crazyMaxActive: ['同時任務人數', 'Active challenges'], crazyRotation: ['導演輪替', 'Director rotation'], rotationChoice: ['{n} 分鐘', '{n} minutes'],
    crazyDirectorHint: ['導演與演員平均分配；奇數時演員多 1 人。角色會輪替。', 'Directors and actors split evenly; with an odd count, one extra player acts. Roles rotate.'],
    directorNeedsPlayers: ['導演模式至少需要 2 位參與者。', 'Director mode needs at least 2 participants.'],
    invalid_crazy_max_active: ['同時任務人數請填 1–9。', 'Choose 1–9 active challenges.'], invalid_crazy_rotation: ['請選擇導演輪替時間。', 'Choose a director rotation interval.'],
    crazyDirector: ['你是導演', 'You are a director'], crazyActor: ['你是演員，先一起聊', 'You are an actor. Keep chatting'],
    receiverReady: ['可以接任務', 'Ready'], receiverBusy: ['正在做任務', 'On a challenge'], receiverResting: ['休息中', 'Taking a breather'], receiverPaused: ['暫停接任務', 'Receiving paused'],
    connectionOffline: ['離線', 'Offline'], connectionUnknown: ['連線未知', 'Connection unknown'], connectionOnline: ['在線', 'Online'],
    receivePause: ['先暫停接任務', 'Pause receiving'], receiveResume: ['繼續接任務', 'Resume receiving'], receivingTitle: ['接任務狀態', 'Receiving status'],
    crazyReminder: ['這張任務還在，找到時機就試試看。', 'Your challenge is still here. Try it when you find your moment.'],
    crazyCheckIn: ['你還在嗎？', 'Still here?'], crazyHere: ['我在，繼續接任務', 'I’m here. Keep them coming'],
    crazySkipPlayer: ['跳過 −1分', 'Skip −1 point'], crazySkipSystem: ['換一張（不扣分）', 'Swap for free'],
    playerSkipHint: ['跳過會扣 1 分，任務會退回出題者。', 'Skipping costs 1 point and returns the task to its author.'], systemSkipHint: ['這是系統任務，換一張不扣分。', 'This is a system task. Swap it without losing points.'],
    playerSkipResult: ['已跳過，−1 分；任務已退回出題者。', 'Skipped: −1 point. The task is back with its author.'], systemSkipResult: ['已免費換卡。', 'Swapped without losing points.'],
    returnedTitle: ['退回給你的任務 · {n}', 'Your returned tasks · {n}'], returnedHint: ['只有你看得到。可修改後收藏，或刪除；不會自動重送。', 'Only you can see these. Edit and save, or delete. They will not be resent automatically.'], returnText: ['修改任務（最多 120 字）', 'Edit the task (up to 120 characters)'], returnSave: ['留到收藏', 'Save privately'], returnDelete: ['刪除這張', 'Delete this card'],
    crazyOffer: ['另一張任務', 'Another challenge'], crazyOfferHint: ['可以換成這張，或保留原任務。', 'Switch to this challenge, or keep the current one.'], crazyReplace: ['換這張', 'Replace mine'], crazyKeep: ['保留原任務', 'Keep mine'],
    stageDecision: ['這一局到時間了', 'Time to choose'], stageExtension: ['繼續玩一會兒', 'Keep playing'], stageDraining: ['把手上的任務玩完', 'Finish the remaining challenges'], stageSorting: ['整理這一局的卡片', 'Sort your challenges'], stageReveal: ['一起回顧', 'Shared recap'],
    stageSummary: ['待派 {queued} · 進行中 {pending} · 暫時無法派發 {blocked}', 'Queued {queued} · Active {pending} · Waiting {blocked}'],
    extendThree: ['再玩 3 分鐘', '3 more minutes'], extendFive: ['再玩 5 分鐘', '5 more minutes'], extendTen: ['再玩 10 分鐘', '10 more minutes'], crazyDrain: ['收尾，玩完剩下的', 'Finish the remaining cards'],
    hostDelegate: ['把本局控制交給', 'Delegate round controls to'], delegateControl: ['交給他', 'Delegate'], claimControl: ['收回本局控制', 'Take back controls'], revealControl: ['公布大家的卡片', 'Reveal the recap'],
    sortingHint: ['勾選的卡片留下給自己；沒勾選的會加入公開回顧。', 'Checked cards stay in your private library. Unchecked cards go into the shared recap.'], savePrivate: ['留給自己', 'Keep privately'], confirmSort: ['確認這次整理', 'Confirm my selection'], sortComplete: ['你的卡片已整理好。主持人可以開啟回顧。', 'Your cards are sorted. The host can reveal the recap.'],
    privateLibrary: ['我的任務收藏', 'My private challenges'], libraryEmpty: ['還沒有收藏，整理卡片時可以留下喜歡的。', 'Nothing saved yet. Keep cards you like when sorting.'], libraryEdit: ['修改文字', 'Edit text'], librarySave: ['儲存修改', 'Save changes'], libraryDelete: ['刪除', 'Delete'], libraryDeleteConfirm: ['確認刪除', 'Confirm deletion'], librarySend: ['送出任務', 'Send again'], noRevealCards: ['這次沒有公開卡片。', 'No shared cards this time.'],
    revealAuthor: ['出題：{name}', 'From: {name}'], revealRecipient: ['實際接招：{name}', 'Received by: {name}'], notSentThisRound: ['本局沒有派出', 'Not sent this round'],
    outcomeDone: ['完成', 'Done'], outcomeSkipped: ['跳過', 'Skipped'], outcomeExpired: ['逾時', 'Expired'], outcomeCancelled: ['已取消', 'Cancelled'], outcomeReplaced: ['已換卡', 'Replaced'], outcomeWithdrawn: ['未確認顯示', 'Display unconfirmed'],
    missionHint: ['預設隨機給別人，也可以指定對象；你的任務會優先安排。', 'Goes to someone else at random, unless you choose a player. Your challenge takes priority.'],
    invalid_crazy_assignment: ['請輸入 1–120 字，對象選隨機或另一位玩家。', 'Write 1–120 characters and choose random or another player.'],
    invalid_target: ['請選擇另一位仍在房間裡的玩家。', 'Choose another player in this room.'],
    invalid_prompt: ['請輸入 1–120 字，並選擇台詞或即興任務。', 'Write 1–120 characters and choose a line or mission.'],
    queue_full: ['待派任務已滿，等一些卡派發後再加入。', 'The queue is full. Add more after some cards are delivered.'],
    recipient_busy: ['對方還有未完成的任務，稍後再送。', 'They still have a mission. Try again later.'],
    target_busy: ['對方還有未完成的任務，稍後再送。', 'They still have a mission. Try again later.'],
    crazyPlayersHostStatus: ['玩家互派 · {n} 人有待完成任務', 'Player assignments · {n} pending missions'],
    crazyPlayersWaiting: ['手寫任務優先，有空位就會送達；先一起聊。', 'Player challenges go first and arrive when a slot is free. Keep chatting.'],
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
    if (s.phase === 'ended') return t('roundRest');
    if (s.membership?.activeCount < 2) return t('waiting_players');
    if (s.phase === 'thinking') return t('thinking');
    if (s.conversationMode === 'free') return t('freeStatus');
    if (s.activeQuestion) return t('asking', { name: name(s, s.activeQuestion.playerNum) });
    return s.speaker === me ? t('yourTurn') : t('speaking', { name: name(s, s.speaker) });
  }
  function participantsHTML(s, me = 0) {
    const free = s.conversationMode === 'free' && s.phase === 'talking';
    return '<div class="talk-participant-list">' + list(s.roster).map(p => {
      const current = p.active !== false && p.pending !== true && s.phase === 'talking' && !free && p.playerNum === s.speaker;
      const label = p.active === false ? 'participantAway' : p.pending === true ? 'participantPending' : s.phase === 'ended' ? 'participantResting' : s.phase === 'thinking' ? 'participantThinking' : free ? 'freeParticipant' : current ? 'participantSpeaking' : 'participantWaiting';
      const score = list(s.scores).find(v => v.playerNum === p.playerNum)?.score || 0;
      const onMission = p.active !== false && p.pending !== true && s.phase === 'talking' && list(s.crazy?.pendingPlayerNums).includes(p.playerNum);
      const controls = s.sharedControls === true && ((me === 0 || s.hostControls) || p.playerNum === me && p.active === false)
        ? button(p.active === false ? 'rejoin' : 'sitOut', 'exclude', `data-player="${p.playerNum}" data-active="${p.active === false}" data-talk-participant-control="true"`) : '';
      return `<div class="talk-participant${p.active === false ? ' is-away' : ''}${current ? ' is-speaking' : ''}${p.playerNum === me ? ' is-you' : ''}"><span class="talk-avatar" aria-hidden="true">${esc(p.playerNum)}</span><span class="talk-participant-name">${esc(p.name || name(s, p.playerNum))}${p.playerNum === me ? `<small>${esc(t('participantYou'))}</small>` : ''}</span><span class="talk-participant-state">${esc(t(onMission ? 'participantTask' : label))}</span>${s.gameMode === 'crazy' ? `<span class="talk-participant-score" aria-label="${esc(t('scorePoints',{n:score}))}">${esc(score)}</span>` : ''}${controls}</div>`;
    }).join('') + '</div>';
  }
  const duration = seconds => { const n = Math.max(0, Math.ceil(Number(seconds) || 0)); return Math.floor(n / 60).toString().padStart(2, '0') + ':' + (n % 60).toString().padStart(2, '0'); };
  function scoreboardHTML(s, me = 0) {
    if (s.gameMode !== 'crazy') return '';
    const ranked = list(s.roster).map(p => ({ ...p, score: Number(list(s.scores).find(v => v.playerNum === p.playerNum)?.score) || 0 })).sort((a,b) => b.score - a.score || a.playerNum - b.playerNum);
    return `<section class="talk-scoreboard"><h3>${esc(t('roundScores'))}</h3><ol>${ranked.map(p => `<li${p.playerNum === me ? ' class="is-you"' : ''}><span>${esc(p.name || name(s,p.playerNum))}${p.playerNum === me ? ` <small>${esc(t('participantYou'))}</small>` : ''}</span><strong>${esc(t('scorePoints',{n:p.score}))}</strong></li>`).join('')}</ol></section>`;
  }
  const crazyAction = type => ['crazyDone', 'crazySkip', 'crazyReplace', 'crazyKeep', 'crazyHere'].includes(type);
  const vnext = s => s.gameMode === 'crazy' && !!s.crazy?.roundStage;
  const isDirector = s => s.crazy?.role === 'director';
  const isActor = s => (s.crazy?.effectivePlayStyle || s.crazy?.playStyle) === 'director' && !isDirector(s);
  const skipLabel = prompt => prompt?.source === 'player' ? 'crazySkipPlayer' : prompt?.source === 'system' ? 'crazySkipSystem' : 'crazySkip';
  function skipResultHTML(s, now) {
    const result = s.gameMode === 'crazy' && s.crazy?.lastResult, until = Number(result?.at) + 8000;
    if (result?.status !== 'skipped' || !['player','system'].includes(result.source) || !Number.isFinite(until) || until <= now) return '';
    return `<p class="talk-skip-feedback" role="status" data-talk-until="${until}">${esc(t(result.source === 'player' ? 'playerSkipResult' : 'systemSkipResult'))}</p>`;
  }
  function returnedCardHTML(item, card) {
    return `<article class="talk-returned-card" data-talk-return-card="${esc(item.id)}"><label class="talk-field"><span data-talk-return-label="returnText">${esc(t('returnText'))}</span><textarea data-talk-library-field="${esc(item.id)}" maxlength="120" rows="2">${esc(card.libraryDrafts?.[item.id] ?? item.text)}</textarea></label><div class="talk-actions">${button('returnSave','crazyReturnSave',`data-card-id="${esc(item.id)}"`,true)}${button('returnDelete','crazyReturnDelete',`data-card-id="${esc(item.id)}"`)}</div></article>`;
  }
  function returnedHTML(s, me, card) {
    const cards = list(s.crazy?.returnedCards);
    if (!vnext(s) || me <= 0 || !cards.length) return '';
    return `<section class="talk-returned" data-talk-returned><h3>${esc(t('returnedTitle',{n:cards.length}))}</h3><p class="talk-soft" data-talk-return-label="returnedHint">${esc(t('returnedHint'))}</p><div data-talk-return-list>${cards.map(item=>returnedCardHTML(item,card)).join('')}</div></section>`;
  }
  function receiverLabel(s, value) {
    const receiver = value ?? s.crazy?.receiverStatus;
    if (typeof receiver === 'string') return receiver === 'busy' ? 'receiverBusy' : receiver === 'resting' ? 'receiverResting' : receiver === 'paused' ? 'receiverPaused' : 'receiverReady';
    if (receiver?.paused) return 'receiverPaused';
    if (receiver?.reason === 'resting' || receiver?.reason === 'cooldown' || Number(receiver?.cooldownUntil) > Date.now()) return 'receiverResting';
    return s.crazy?.prompt?.status === 'pending' ? 'receiverBusy' : 'receiverReady';
  }
  function crazyHTML(s) {
    if (s.gameMode !== 'crazy' || !s.crazy?.enabled || s.phase === 'ended' && !['draining', 'decision', 'extension'].includes(s.crazy?.roundStage)) return '';
    const prompt = s.crazy.prompt;
    if (prompt?.status === 'pending') return `<section class="talk-crazy-prompt" data-talk-prompt="${esc(prompt.id)}" aria-label="${esc(t('crazyPrivate'))}">
      <div class="talk-crazy-heading"><strong>${esc(t(prompt.kind === 'task' ? 'taskKind' : 'lineKind'))}</strong><span>${esc(t('crazyPrivate'))}</span></div>
      <blockquote aria-live="polite">${esc(prompt.text)}</blockquote><p>${esc(t(prompt.kind === 'task' ? 'crazyTaskHint' : 'crazySayHint'))}</p>
      <div class="talk-actions">${button('crazyDone','crazyDone',`data-prompt-id="${esc(prompt.id)}"`,true)}${button(skipLabel(prompt),'crazySkip',`data-prompt-id="${esc(prompt.id)}"`)}</div>
      ${['player','system'].includes(prompt.source) ? `<small class="talk-skip-hint">${esc(t(prompt.source === 'player' ? 'playerSkipHint' : 'systemSkipHint'))}</small>` : ''}
      ${vnext(s) || Number(prompt.checkInAt) > 0 || prompt.checkIn === true ? `<div class="talk-crazy-check-in" data-talk-check-in role="status" aria-live="polite"${prompt.checkIn ? '' : ' hidden'}><p>${esc(t('crazyCheckIn'))}</p>${button('crazyHere','crazyHere',`data-prompt-id="${esc(prompt.id)}" data-render-version="${esc(prompt.renderVersion || 1)}"`)}</div>` : ''}
      ${vnext(s) || prompt.reminder ? `<small class="talk-crazy-reminder" data-talk-mission-reminder role="status"${!prompt.reminder || prompt.checkIn ? ' hidden' : ''}>${esc(t('crazyReminder'))}</small>` : ''}
      ${s.crazy.offer ? `<section class="talk-crazy-offer"><strong>${esc(t('crazyOffer'))}</strong><p>${esc(s.crazy.offer.newCard?.text || s.crazy.offer.text || '')}</p><small>${esc(t('crazyOfferHint'))}</small><div class="talk-actions">${button('crazyReplace','crazyReplace',`data-prompt-id="${esc(s.crazy.offer.promptId || prompt.id)}" data-offer-id="${esc(s.crazy.offer.offerId || s.crazy.offer.id)}"`,true)}${button('crazyKeep','crazyKeep',`data-prompt-id="${esc(s.crazy.offer.promptId || prompt.id)}" data-offer-id="${esc(s.crazy.offer.offerId || s.crazy.offer.id)}"`)}</div></section>` : ''}
      ${s.crazy.paused ? `<small>${esc(t('crazyPaused'))}</small>` : ''}
    </section>`;
    return `<div class="talk-crazy-wait" role="status"><strong>${esc(t('crazyTitle'))}</strong><p>${esc(t(s.crazy.paused ? 'crazyPaused' : prompt?.status === 'done' ? 'crazyCompleted' : prompt?.status === 'skipped' ? (prompt.source === 'player' ? 'playerSkipResult' : prompt.source === 'system' ? 'systemSkipResult' : 'crazySkipped') : prompt?.status === 'expired' ? 'crazyExpired' : prompt?.status === 'cancelled' ? 'crazyCancelled' : s.crazy.source === 'players' ? 'crazyPlayersWaiting' : 'crazyWaiting'))}</p></div>`;
  }
  function vnextHTML(s, me = 0, card = {}) {
    if (!vnext(s)) return '';
    const c = s.crazy, stage = c.roundStage, host = c.hostActions || {};
    const targets = list(s.roster).filter(p => p.playerNum !== me && p.active !== false && p.pending !== true);
    const targetOptions = current => `<option value="random"${current === 'random' || current == null ? ' selected' : ''}>${esc(t('randomRecipient'))}</option>` + targets.map(p => `<option value="${p.playerNum}"${String(current) === String(p.playerNum) ? ' selected' : ''}>${esc(p.name || name(s,p.playerNum))}</option>`).join('');
    let html = '';
    if (['open', 'decision', 'extension', 'draining'].includes(stage) && me > 0) html += `<section class="talk-receiving"><p class="talk-soft">${esc(t(isDirector(s) ? 'crazyDirector' : isActor(s) ? 'crazyActor' : receiverLabel(s)))}</p>${!isDirector(s) && (c.receiverStatus?.paused || c.receiverStatus === 'paused') ? button('receiveResume','crazyReceive') : ''}</section>`;
    const statuses = list(c.receivingStatuses || c.receiverStatuses);
    if ((me === 0 || isDirector(s)) && statuses.length) html += `<details class="talk-details talk-receivers"${isDirector(s) ? ' open' : ''}><summary>${esc(t('receivingTitle'))}</summary><ul>${statuses.map(p => `<li><span>${esc(name(s,p.playerNum))}</span><small>${esc(t(p.role === 'director' || p.status === 'director' ? 'crazyDirector' : receiverLabel(s,p.status ?? p.receiverStatus)))} · ${esc(t(p.connection === 'offline' ? 'connectionOffline' : p.connection === 'online' ? 'connectionOnline' : 'connectionUnknown'))}</small></li>`).join('')}</ul></details>`;
    if (stage !== 'open') html += `<section class="talk-round-stage"><h3>${esc(t('stage' + stage[0].toUpperCase() + stage.slice(1)))}</h3>${c.summary && Object.values(host).some(Boolean) ? `<p class="talk-soft">${esc(t('stageSummary',{queued:c.summary.queued || 0,pending:c.summary.pending || 0,blocked:c.summary.blocked || 0}))}</p>` : ''}<div class="talk-actions">${host.extend ? [180,300,600].map((seconds,i) => button(['extendThree','extendFive','extendTen'][i],'crazyExtend',`data-seconds="${seconds}"`)).join('') : ''}${host.drain ? button('crazyDrain','crazyDrain','',true) : ''}${host.reveal ? button('revealControl','crazyReveal','',true) : ''}</div></section>`;
    if (stage === 'open' && host.drain) html += button('crazyDrain','crazyDrain');
    if (host.delegate) html += `<div class="talk-delegate"><label class="talk-field">${esc(t('hostDelegate'))}<select data-talk-delegate>${targets.map(p => `<option value="${p.playerNum}"${Number(card.delegateTarget) === p.playerNum ? ' selected' : ''}>${esc(p.name || name(s,p.playerNum))}</option>`).join('')}</select></label>${button('delegateControl','crazyDelegate')}</div>`;
    if (host.claim) html += button('claimControl','crazyClaimHost');
    if (['sorting', 'reveal'].includes(stage) && me > 0) html += c.sortConfirmed ? (stage === 'sorting' ? `<p class="talk-soft" role="status">${esc(t('sortComplete'))}</p>` : '') : `<section class="talk-sort-cards"><h3>${esc(t('stageSorting'))}</h3><p class="talk-soft">${esc(t('sortingHint'))}</p>${list(c.unusedCards).map(item => `<label class="talk-sort-card"><input type="checkbox" data-talk-sort-card="${esc(item.id)}"${card.sortSelections?.[item.id] !== false ? ' checked' : ''}><span>${esc(item.text)}</span><small>${esc(t('savePrivate'))}</small></label>`).join('')}${button('confirmSort','crazySort','',true)}</section>`;
    if (me > 0) html += `<details class="talk-details talk-private-library"${card.libraryOpen ? ' open' : ''}><summary>${esc(t('privateLibrary'))} · ${list(c.library).length}</summary><p class="talk-soft">${esc(t('crazyPrivate'))}</p>${list(c.library).length ? list(c.library).map(item => `<article class="talk-library-card"><p>${esc(item.text)}</p><details class="talk-details" data-talk-library-editor="${esc(item.id)}"${card.libraryEditsOpen?.[item.id] ? ' open' : ''}><summary>${esc(t('libraryEdit'))}</summary><label class="talk-field"><textarea data-talk-library-field="${esc(item.id)}" maxlength="120" rows="3">${esc(card.libraryDrafts?.[item.id] ?? item.text)}</textarea></label>${button('librarySave','crazyLibraryUpdate',`data-card-id="${esc(item.id)}"`)}</details><div class="talk-actions">${button(card.libraryDeleteConfirm === item.id ? 'libraryDeleteConfirm' : 'libraryDelete','crazyLibraryDelete',`data-card-id="${esc(item.id)}"`)}${card.libraryDeleteConfirm === item.id ? button('cancel','cancelLibraryDelete') : ''}</div>${!c.queueLocked && c.canAssign !== false && !isActor(s) ? `<label class="talk-field">${esc(t('missionRecipient'))}<select data-talk-library-target="${esc(item.id)}">${targetOptions(card.libraryTargets?.[item.id] ?? 'random')}</select></label>${button('librarySend','crazyLibrarySend',`data-card-id="${esc(item.id)}"`)}` : ''}</article>`).join('') : `<p class="talk-soft">${esc(t('libraryEmpty'))}</p>`}</details>`;
    if (stage === 'reveal') html += `<section class="talk-reveal-cards"><h3>${esc(t('stageReveal'))}</h3>${list(c.revealCards).length ? list(c.revealCards).map(item => `<article class="talk-library-card"><p>${esc(item.text)}</p><p class="talk-recap-meta"><span>${esc(t('revealAuthor',{name:Number.isInteger(item.author) && item.author > 0 ? name(s,item.author) : t('crazySourceSystem')}))}</span>${item.unused ? `<span>${esc(t('notSentThisRound'))}</span>` : `<span>${esc(t('revealRecipient',{name:name(s,item.recipient)}))}</span><span>${esc(t('outcome' + (['done','skipped','expired','cancelled','replaced','withdrawn'].includes(item.status) ? item.status : 'cancelled').replace(/^./,c=>c.toUpperCase())))}</span>`}</p></article>`).join('') : `<p class="talk-soft">${esc(t('noRevealCards'))}</p>`}</section>${scoreboardHTML(s,me)}`;
    return `<div class="talk-vnext">${html}</div>`;
  }
  return { t, esc, list, name, button, notes, interests, status, crazyAction, crazyHTML, skipResultHTML, returnedCardHTML, returnedHTML, participantsHTML, duration, scoreboardHTML, vnext, isDirector, isActor, receiverLabel, vnextHTML };
})();

var TALK_PLAYER = (() => {
  const { t, esc, list, name, button } = TALK_UI;
  const defaultStorage = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (_) { return null; } };
  const followUps = topic => {
    const items = list(topic?.followUps).map(q => typeof q === 'string' ? { question: q } : q).filter(q => typeof q?.question === 'string' && q.question.trim());
    return items.length ? items : topic?.followUp ? [{ question: topic.followUp }] : [];
  };
  const topicLibrary = () => typeof TALK_LIBRARY !== 'undefined' ? TALK_LIBRARY : null;
  const libraryTopics = (category = '', query = '') => topicLibrary()?.search(category, query) || [];
  const topicById = id => libraryTopics().find(topic => topic.id === id);
  const customTopic = editor => {
    const question = String(editor.question || '').trim(), title = String(editor.title || '').trim(), starter = String(editor.starter || '').trim();
    const questions = String(editor.followUps || '').split(/\r?\n/).map(q => q.trim()).filter(Boolean);
    if (!question || question.length > 500 || title.length > 80 || starter.length > 600 || questions.length > 8 || questions.some(q => q.length > 300)) throw new Error('invalid_topic');
    return { id: 'custom', emoji: '✏️', title, question, starter, followUp: questions[0] || '', followUps: questions.map(question => ({ stage: 'custom', question })) };
  };
  const editTopic = topic => ({ title: topic.title || '', question: topic.question || '', starter: topic.starter || '', followUps: followUps(topic).map(q => q.question).join('\n') });
  const minutesToSeconds = value => { const n = Number(value) * 60, rounded = Math.round(n); return Number.isFinite(n) && Math.abs(n - rounded) < 1e-7 ? rounded : NaN; };
  const rotationSeconds = value => Number.isInteger(Number(value)) && Number(value) >= 60 && Number(value) <= 900 ? Number(value) : 120;
  const canInspire = s => s.gameMode === 'crazy' && TALK_UI.isDirector(s) && ['thinking', 'talking'].includes(s.phase) && !s.crazy?.queueLocked && s.crazy?.canAssign !== false;
  const ideaText = idea => typeof I18N !== 'undefined' && I18N.lang === 'zh' ? idea.zh || idea.text : idea.text;
  const editorState = s => ({ ...editTopic(s.topic), source: topicById(s.topic.id) ? 'library' : 'custom', topicId: s.topic.id || '', category: '', search: '',
    mode: s.mode === 'write' ? 'write' : 'think', seconds: Number(s.seconds) || 45, gameMode: s.gameMode === 'crazy' ? 'crazy' : 'normal',
    conversationMode: s.conversationMode || 'random', crazySource: s.crazy?.source || 'mixed',
    crazyMaxActive: Number(s.crazy?.maxActive) || 3, crazyPlayStyle: s.crazy?.playStyle || 'director', crazyRotationSeconds: rotationSeconds(s.crazy?.rotationSeconds),
    playerCount: list(s.roster).filter(p => p.active !== false && p.pending !== true).length,
    gameMinutes: (Number(s.gameSeconds) || 900) / 60, crazyTaskMinutes: (Number(s.crazy?.taskSeconds) || Number(s.crazyTaskSeconds) || 150) / 60,
    crazyMinSeconds: Number(s.crazy?.minSeconds) || (s.crazy?.intervalSeconds ? Math.round(s.crazy.intervalSeconds * .8) : 60),
    crazyMaxSeconds: Number(s.crazy?.maxSeconds) || (s.crazy?.intervalSeconds ? Math.round(s.crazy.intervalSeconds * 1.2) : 180), showStarters: !!s.showStarters });
  const option = (value, label, current) => '<option value="' + esc(value) + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + esc(label) + '</option>';
  function settingsHTML(editor) {
    const select = (key, field, values) => '<label class="talk-field">' + esc(t(key)) + '<select data-talk-editor-field="' + field + '">' + values + '</select></label>';
    const area = (key, field, max, rows) => '<label class="talk-field">' + esc(t(key)) + '<textarea data-talk-editor-field="' + field + '" maxlength="' + max + '" rows="' + rows + '">' + esc(editor[field]) + '</textarea></label>';
    const matches = libraryTopics(editor.category, editor.search), selected = topicById(editor.topicId);
    const categories = typeof TALK_CATEGORIES !== 'undefined' ? TALK_CATEGORIES : [];
    const language = typeof I18N !== 'undefined' ? I18N.lang : 'zh';
    const choices = selected && !matches.some(q => q.id === selected.id) ? [selected, ...matches] : matches;
    const library = select('category', 'category', option('', t('allCategories'), editor.category) + categories.map(c => option(c.id, c[language] || c.en, editor.category)).join('')) +
      '<label class="talk-field">' + esc(t('searchTopics')) + '<input type="search" data-talk-editor-field="search" value="' + esc(editor.search) + '"></label>' +
      select('chooseManually', 'topicId', option('', t('chooseManually'), editor.topicId) + choices.map(q => option(q.id, q.question, editor.topicId)).join('')) +
      '<div class="talk-actions">' + button('randomTopic', 'randomTopic') + (selected ? button('editTopic', 'adaptTopic') : '') + '</div>' +
      (!matches.length ? '<p class="talk-soft">' + esc(t(topicLibrary() ? 'noTopics' : 'libraryUnavailable')) + '</p>' : '') +
      (selected ? '<div class="talk-preview"><p>' + esc(selected.question) + '</p>' + (selected.starter ? '<p class="talk-starter">' + esc(selected.starter) + '</p>' : '') + '<details class="talk-details"><summary>' + esc(t('previewPath')) + '</summary>' + followUps(selected).map(q => '<p>' + esc(q.question) + '</p>').join('') + '</details></div>' : '');
    return '<section class="talk-card-editor" data-talk-editor><p class="talk-soft">' + esc(t('newTopicNotice')) + '</p>' +
      select('topicSource', 'source', option('library', t('fromLibrary'), editor.source) + option('custom', t('writeTopic'), editor.source)) +
      (editor.source === 'library' ? library : area('customTitle', 'title', 80, 1) + area('customQuestion', 'question', 500, 3) + area('customStarter', 'starter', 600, 3) + area('customFollowUps', 'followUps', 2408, 4)) +
      select('setupMode', 'mode', option('think', t('thinkMode'), editor.mode) + option('write', t('writeMode'), editor.mode)) +
      '<label class="talk-field">' + esc(t('thinkingTime')) + '<input type="number" data-talk-editor-field="seconds" min="15" max="120" step="1" inputmode="numeric" value="' + esc(editor.seconds) + '"></label>' +
      '<label class="talk-field">' + esc(t('gameDuration')) + '<input type="number" data-talk-editor-field="gameMinutes" min="1" max="60" step="any" inputmode="decimal" value="' + esc(editor.gameMinutes) + '"></label>' +
      select('gameMode', 'gameMode', option('normal', t('normalMode'), editor.gameMode) + option('crazy', t('crazyMode'), editor.gameMode)) +
      select('conversationMode', 'conversationMode', ['assigned', 'random', 'free'].map(mode => option(mode, t(mode + 'Mode'), editor.conversationMode)).join('')) +
      (editor.gameMode === 'crazy' ? select('crazyPlayStyle','crazyPlayStyle',option('director',t('crazyStyleDirector'),editor.crazyPlayStyle) + option('free',t('crazyStyleFree'),editor.crazyPlayStyle)) + '<p class="talk-soft">' + esc(t('crazyDirectorHint')) + '</p><details class="talk-details"><summary>' + esc(t('crazyAdvanced')) + '</summary><div class="talk-card-editor"><label class="talk-field">' + esc(t('crazyMaxActive')) + '<input type="number" data-talk-editor-field="crazyMaxActive" min="1" max="9" step="1" value="' + esc(editor.crazyMaxActive) + '"></label>' + select('crazyRotation','crazyRotationSeconds',Array.from(new Set([120,240,360,Number(editor.crazyRotationSeconds)])).sort((a,b)=>a-b).map(n => option(n,t('rotationChoice',{n:n / 60}),editor.crazyRotationSeconds)).join('')) : '') +
      (editor.gameMode === 'crazy' ? select('crazySource', 'crazySource', ['system', 'players', 'mixed'].map(source => option(source, t('crazySource' + source[0].toUpperCase() + source.slice(1)), editor.crazySource)).join('')) : '') +
      (editor.gameMode === 'crazy' ? '<div class="talk-interval-settings"><span>' + esc(t('crazyInterval')) + '</span><div class="talk-settings-row">' + ['Min','Max'].map(bound => '<label class="talk-field">' + esc(t('crazy' + bound + 'Seconds')) + '<input type="number" data-talk-editor-field="crazy' + bound + 'Seconds" min="5" max="300" step="1" inputmode="numeric" value="' + esc(editor['crazy' + bound + 'Seconds']) + '"></label>').join('') + '</div><p class="talk-soft">' + esc(t('crazyScheduleHint')) + '</p></div>' : '') +
      (editor.gameMode === 'crazy' ? '<label class="talk-field">' + esc(t('crazyTaskDuration')) + '<input type="number" data-talk-editor-field="crazyTaskMinutes" min="0.5" max="5" step="any" inputmode="decimal" value="' + esc(editor.crazyTaskMinutes) + '"></label>' : '') +
      (editor.gameMode === 'crazy' ? '</div></details>' : '') +
      '<label class="talk-card-check"><input type="checkbox" data-talk-editor-field="showStarters"' + (editor.showStarters ? ' checked' : '') + '> ' + esc(t('showStarters')) + '</label>' +
      '<div class="talk-actions">' + button('openTopic', 'openTopic', '', true) + button('cancelSetup', 'closeSettings') + '</div></section>';
  }
  function managementHTML(s, card) {
    if (s.sharedControls !== true || !s.hostControls) return '';
    const choices = followUps(s.topic);
    return '<details class="talk-management"' + (card.managementOpen ? ' open' : '') + '><summary>' + esc(t('topicSettings')) + '</summary><div class="talk-management-body">' +
      (s.actions?.starters ? '<label class="talk-card-check"><input type="checkbox" data-talk-shared-input="starters"' + (s.showStarters ? ' checked' : '') + '> ' + esc(t('showStarters')) + '</label>' : '') +
      (s.actions?.extend ? '<details class="talk-card-explore"><summary>' + esc(t('exploreTitle')) + '</summary><div class="talk-card-editor"><p class="talk-soft">' + esc(t('exploreHint')) + '</p>' +
        (choices.length ? '<label class="talk-field">' + esc(t('exploreDirection')) + '<select data-talk-shared-input="followup">' + choices.map((q, i) => option(i, q.question, card.followupIndex)).join('') + '</select></label>' + button('showFollowUp', 'showFollowUp') : '') +
        '<label class="talk-field">' + esc(t('liveFollowUp')) + '<textarea data-talk-shared-input="extension" rows="2" maxlength="300">' + esc(card.extensionDraft) + '</textarea></label>' + button('showCustomFollowUp', 'showCustomFollowUp') + '</div></details>' : '') +
      (s.actions?.newTopic ? '<div class="talk-actions">' + button('newTopic', 'settings') + button('randomNew', 'randomTopic') + '</div>' : '') +
      (s.gameMode !== 'crazy' && s.actions?.finish ? button('finishRound', 'finish') : '') +
      (card.settingsOpen && card.editor ? settingsHTML(card.editor) : '') + '</div></details>';
  }
  class Card {
    constructor(element, { send, sendTechnical = null, nameBanner, now = () => Date.now(), connected = () => true, identity = null, storage = defaultStorage() }) {
      this.element = element; this.send = send; this.nameBanner = nameBanner; this.now = now; this.connected = connected;
      this.sendTechnical = sendTechnical; this.identity = identity; this.storage = storage; this.draftKey = null; this.technicalAck = null; this.technicalFrame = null;
      this.pending = null; this.error = ''; this.draft = ''; this.data = null; this.composing = false; this.settledActions = new Set();
      this.crazyDraft = { target: 'random', text: '', kind: 'task' }; this.assignmentOpen = true; this.assignmentNotice = ''; this.assignmentSelection = null; this.destroyed = false;
      this.inspirationCards = []; this.inspirationOpen = false; this.inspirationNotice = '';
      this.libraryOpen = false; this.libraryDrafts = {}; this.libraryTargets = {}; this.libraryEditsOpen = {}; this.libraryDeleteConfirm = null; this.sortSelections = {}; this.delegateTarget = null;
      this.roundClockVisible = false; this.editor = null; this.settingsOpen = false; this.managementOpen = false; this.confirmation = null; this.topicToOpen = null; this.extensionDraft = ''; this.followupIndex = 0;
      this.renderedMission = null; this.missionRenderDeferred = false;
      this.clickHandler = event => {
        const b = event.target.closest('[data-talk-action]');
        if (!b || !this.element.contains(b) || b.disabled) return;
        const type = b.dataset.talkAction;
        if (type === 'viewTime') { this.roundClockVisible = !this.roundClockVisible; this.render(true); return; }
        if (['inspirationUse', 'inspirationRefresh'].includes(type)) {
          if (!canInspire(this.data.talk) || this.composing) return;
          this.inspirationNotice = '';
          if (type === 'inspirationRefresh') { this.pickInspiration(true); this.render(true); return; }
          const idea = this.inspirationCards.find(item => item.id === b.dataset.talkIdeaId);
          if (!idea) return;
          const previous = this.crazyDraft.text, next = previous + (previous && !previous.endsWith('\n') ? '\n' : '') + ideaText(idea);
          if (next.length > 120) { this.inspirationNotice = 'inspirationFull'; this.render(true); return; }
          this.crazyDraft.text = next; this.assignmentNotice = ''; this.persistDraft(); this.render(true);
          const textarea = this.element.querySelector('[data-talk-assignment-field="text"]');
          textarea?.focus?.({ preventScroll: true }); textarea?.setSelectionRange?.(next.length, next.length);
          return;
        }
        if (type === 'crazyAssign') {
          if (this.data.talk.crazy?.canAssign === false || this.data.talk.crazy?.queueLocked || TALK_UI.isActor(this.data.talk)) return;
          const draft = this.crazyDraft, text = draft.text.trim(), random = draft.target === 'random', target = Number(draft.target);
          if (!text || text.length > 120 || (!random && (target === this.data.playerNum || !list(this.data.talk.roster).some(p => p.playerNum === target && p.active !== false && p.pending !== true)))) { this.error = 'invalid_crazy_assignment'; this.render(true); return; }
          this.assignmentNotice = ''; this.act('crazyAssign', { ...(random ? {} : { target }), text }); return;
        }
        if (type === 'retry') { this.deliver(); return; }
        const s = this.data.talk, manager = s.sharedControls === true && s.hostControls;
        if (['crazyReturnSave','crazyReturnDelete'].includes(type)) {
          const cardId = b.dataset.cardId, item = list(s.crazy?.returnedCards).find(item=>item.id === cardId);
          if (!item) return;
          const text = String(this.libraryDrafts[cardId] ?? item.text).trim();
          if (type === 'crazyReturnSave' && (!text || text.length > 120)) { this.error = 'invalid_prompt'; this.render(true); return; }
          this.act(type,{cardId,...(type === 'crazyReturnSave' ? {text} : {})}); return;
        }
        if (type === 'cancelLibraryDelete') { this.libraryDeleteConfirm = null; this.render(true); return; }
        if (['crazyLibraryUpdate', 'crazyLibraryDelete', 'crazyLibrarySend'].includes(type)) {
          const cardId = b.dataset.cardId, item = list(s.crazy?.library).find(item => item.id === cardId);
          if (!item) return;
          if (type === 'crazyLibraryDelete' && this.libraryDeleteConfirm !== cardId) { this.libraryDeleteConfirm = cardId; this.render(true); return; }
          const text = String(this.libraryDrafts[cardId] ?? item.text).trim(), target = this.libraryTargets[cardId] ?? 'random';
          if (type === 'crazyLibraryUpdate' && (!text || text.length > 120)) { this.error = 'invalid_prompt'; this.render(true); return; }
          if (type === 'crazyLibrarySend' && (s.crazy.queueLocked || s.crazy.canAssign === false || TALK_UI.isActor(s))) return;
          this.libraryDeleteConfirm = null;
          this.act(type, { cardId, ...(type === 'crazyLibraryUpdate' ? { text } : {}), ...(type === 'crazyLibrarySend' && target !== 'random' ? { target: Number(target) } : {}) }); return;
        }
        if (type === 'crazySort') { if (['sorting', 'reveal'].includes(s.crazy?.roundStage) && !s.crazy.sortConfirmed) this.act(type, { saveIds: list(s.crazy.unusedCards).filter(item => this.sortSelections[item.id] !== false).map(item => item.id) }); return; }
        if (type === 'crazyReceive') { this.act(type, { paused: !(s.crazy?.receiverStatus?.paused || s.crazy?.receiverStatus === 'paused') }); return; }
        if (['crazyExtend','crazyDrain','crazyDelegate','crazyClaimHost','crazyReveal'].includes(type)) {
          const permission = {crazyExtend:'extend',crazyDrain:'drain',crazyDelegate:'delegate',crazyClaimHost:'claim',crazyReveal:'reveal'}[type];
          if (!s.crazy?.hostActions?.[permission]) return;
          const playerNum = Number(this.delegateTarget ?? this.element.querySelector('[data-talk-delegate]')?.value);
          this.act(type, { ...(type === 'crazyExtend' ? { seconds: Number(b.dataset.seconds) } : {}), ...(type === 'crazyDelegate' ? { playerNum } : {}) }); return;
        }
        if (type === 'cancelConfirm') { this.confirmation = null; this.topicToOpen = null; this.render(true); return; }
        if (type === 'confirmEnd') { if (this.confirmation === 'end') { this.confirmation = null; this.act('end', { confirm: true }); } return; }
        if (type === 'confirmTopic') { if (manager && this.confirmation === 'topic' && this.topicToOpen) { const next = this.topicToOpen; this.confirmation = null; this.topicToOpen = null; this.act('newTopic', { ...next, confirm: true }); } return; }
        if (['settings', 'randomTopic', 'adaptTopic', 'openTopic', 'closeSettings', 'showFollowUp', 'showCustomFollowUp'].includes(type)) {
          if (!manager || this.pending) return;
          if (type === 'closeSettings') { this.settingsOpen = false; this.render(true); return; }
          if (type === 'showFollowUp') { this.act('extend', { index: this.followupIndex }); return; }
          if (type === 'showCustomFollowUp') { this.act('extend', { text: this.extensionDraft }); return; }
          if (!s.actions?.newTopic) return;
          this.editor ||= editorState(s); this.settingsOpen = true; this.managementOpen = true;
          if (type === 'randomTopic') {
            const topic = topicLibrary()?.draw(this.editor.category, this.editor.search, [s.topic.id, this.editor.topicId]);
            if (topic) { this.editor.source = 'library'; this.editor.topicId = topic.id; }
            else this.error = 'noTopics';
          } else if (type === 'adaptTopic') {
            const topic = topicById(this.editor.topicId); if (topic) { Object.assign(this.editor, editTopic(topic)); this.editor.source = 'custom'; }
          } else if (type === 'openTopic') {
            try {
              const topic = this.editor.source === 'library' ? topicById(this.editor.topicId) : customTopic(this.editor);
              if (!topic) throw new Error('invalid_topic');
              const seconds = Number(this.editor.seconds), gameSeconds = minutesToSeconds(this.editor.gameMinutes), crazyTaskSeconds = minutesToSeconds(this.editor.crazyTaskMinutes);
              if (!Number.isInteger(gameSeconds) || gameSeconds < 60 || gameSeconds > 3600) throw new Error('invalid_game_seconds');
              if (this.editor.gameMode === 'crazy' && (!Number.isInteger(crazyTaskSeconds) || crazyTaskSeconds < 30 || crazyTaskSeconds > 300)) throw new Error('invalid_crazy_task_seconds');
              let crazyMinSeconds = Number(this.editor.crazyMinSeconds), crazyMaxSeconds = Number(this.editor.crazyMaxSeconds);
              if (!Number.isInteger(seconds) || seconds < 15 || seconds > 120) throw new Error('invalid_settings');
              const validInterval = Number.isInteger(crazyMinSeconds) && Number.isInteger(crazyMaxSeconds) && crazyMinSeconds >= 5 && crazyMaxSeconds <= 300 && crazyMinSeconds <= crazyMaxSeconds;
              if (this.editor.gameMode === 'crazy' && !validInterval) throw new Error('invalid_crazy_interval');
              const crazyMaxActive = Number(this.editor.crazyMaxActive), crazyRotationSeconds = Number(this.editor.crazyRotationSeconds);
              if (this.editor.gameMode === 'crazy' && (!Number.isInteger(crazyMaxActive) || crazyMaxActive < 1 || crazyMaxActive > 9)) throw new Error('invalid_crazy_max_active');
              if (this.editor.gameMode === 'crazy' && (!Number.isInteger(crazyRotationSeconds) || crazyRotationSeconds < 60 || crazyRotationSeconds > 900)) throw new Error('invalid_crazy_rotation');
              if (this.editor.gameMode === 'crazy' && this.editor.crazyPlayStyle === 'director' && this.editor.playerCount < 2) throw new Error('directorNeedsPlayers');
              if (!validInterval) { crazyMinSeconds = 60; crazyMaxSeconds = 180; }
              this.topicToOpen = { topic, mode: this.editor.mode, seconds, gameSeconds, crazyTaskSeconds: crazyTaskSeconds >= 30 && crazyTaskSeconds <= 300 ? crazyTaskSeconds : 150, gameMode: this.editor.gameMode, crazyMinSeconds, crazyMaxSeconds, crazyMaxActive:crazyMaxActive || 3, crazyRotationSeconds:crazyRotationSeconds || 120, crazyPlayStyle:this.editor.crazyPlayStyle || 'director', conversationMode: this.editor.conversationMode, crazySource: this.editor.crazySource, showStarters: !!this.editor.showStarters };
              this.confirmation = 'topic'; this.error = '';
            } catch (error) { this.error = error.message; }
          }
          this.render(true); if (this.confirmation) this.focusConfirmation(); return;
        }
        if (['end', 'forceEnd'].includes(type) && !s.activeQuestion && list(s.questions).length) {
          this.confirmation = 'end'; this.render(true); this.focusConfirmation(); return;
        }
        this.act(type === 'forceEnd' ? 'end' : type, {
          ...(b.dataset.target ? { target: b.dataset.target } : {}),
          ...(b.dataset.promptId ? { promptId: b.dataset.promptId } : {}),
          ...(type === 'crazyHere' ? { renderVersion: Number(b.dataset.renderVersion) || 1 } : {}),
          ...(b.dataset.offerId ? { offerId: b.dataset.offerId } : {}),
          ...(type === 'addTime' ? { seconds: 60 } : {}),
          ...(type === 'exclude' ? { playerNum: Number(b.dataset.player), active: b.dataset.active === 'true' } : {}),
          ...(type === 'note' ? { text: this.draft } : {}),
          ...(type === 'forceEnd' ? { confirm: true } : {}),
          ...(type === 'crazyPause' ? { paused: !this.data.talk.crazy.paused } : {}),
          ...(type === 'extend' ? { show: !this.data.talk.extended } : {}),
        });
      };
      this.inputHandler = event => {
        const target = event.target;
        if (target.matches('[data-talk-note]')) this.draft = target.value;
        const assignment = target.dataset?.talkAssignmentField;
        if (assignment && ['target','text'].includes(assignment)) { this.crazyDraft[assignment] = target.value; this.assignmentNotice = ''; this.inspirationNotice = ''; this.persistDraft(); }
        if (target.dataset?.talkLibraryField) this.libraryDrafts[target.dataset.talkLibraryField] = target.value;
        const field = target.dataset?.talkEditorField;
        if (field && this.editor) { this.editor[field] = field === 'showStarters' ? target.checked : target.value; if (field === 'search') this.render(true); }
        if (target.dataset?.talkSharedInput === 'extension') this.extensionDraft = target.value;
      };
      this.changeHandler = event => {
        const target = event.target, s = this.data?.talk;
        if (target.dataset?.talkSortCard) { this.sortSelections[target.dataset.talkSortCard] = !!target.checked; return; }
        if (target.dataset?.talkLibraryTarget) { this.libraryTargets[target.dataset.talkLibraryTarget] = target.value; this.assignmentSelection = null; this.render(true); return; }
        if (target.matches?.('[data-talk-delegate]')) { this.delegateTarget = target.value; return; }
        const assignment = target.dataset?.talkAssignmentField;
        if (assignment) {
          if (['target','text'].includes(assignment)) this.crazyDraft[assignment] = target.value; this.assignmentNotice = ''; this.persistDraft();
          if (target.tagName === 'SELECT') { this.assignmentSelection = null; this.render(true); }
          return;
        }
        if (s?.sharedControls !== true || !s.hostControls || this.pending) return;
        const field = target.dataset?.talkEditorField;
        if (field && this.editor) { this.editor[field] = field === 'showStarters' ? target.checked : target.value; this.render(true); }
        if (target.dataset?.talkSharedInput === 'starters') this.act('starters', { show: !!target.checked });
        if (target.dataset?.talkSharedInput === 'followup') this.followupIndex = Number(target.value);
      };
      this.selectionStart = event => {
        if (event.target.tagName === 'SELECT' && (event.target.dataset?.talkAssignmentField || event.target.dataset?.talkLibraryTarget || event.target.matches?.('[data-talk-delegate]'))) this.assignmentSelection = event.target;
        else if (event.type === 'pointerdown' && this.element.contains(event.target) && event.target.closest('[data-talk-card-main], [data-talk-card-footer]')) this.assignmentSelection = null;
      };
      this.selectionEnd = event => {
        if (this.missionRenderDeferred && event.target.closest?.('.talk-crazy-prompt')) {
          const destination = event.relatedTarget?.closest?.('[data-talk-card-main], [data-talk-card-footer]');
          // Blur precedes click. Do not replace its destination or guess the
          // target when a touch/browser blur has no relatedTarget.
          if ((destination && this.element.contains(destination)) || !event.relatedTarget) return;
          if (!this.destroyed) this.render(true);
          return;
        }
        if (this.assignmentSelection !== event.target) return;
        this.assignmentSelection = null;
        // A blur caused by a click happens before that click. Leave controls
        // in replaceable regions connected so their first click can run.
        const destination = event.relatedTarget?.closest?.('[data-talk-card-main], [data-talk-card-footer]');
        if (destination && this.element.contains(destination)) return;
        if (!this.destroyed && this.data?.talk.phase !== 'ended') this.render(true);
      };
      element.addEventListener('pointerdown', this.selectionStart); element.addEventListener('keydown', this.selectionStart); element.addEventListener('focusout', this.selectionEnd);
      this.compositionStart = () => { this.composing = true; };
      this.compositionEnd = () => { this.composing = false; this.persistDraft(); this.render(true); };
      element.addEventListener('compositionstart', this.compositionStart); element.addEventListener('compositionend', this.compositionEnd);
      element.addEventListener('click', this.clickHandler); element.addEventListener('input', this.inputHandler); element.addEventListener('change', this.changeHandler);
      this.timer = setInterval(() => this.paint(), 1000);
    }
    update(data) {
      const draftKey = this.storageKey(data);
      const changedSession = this.data?.talk?.sessionId !== data.talk.sessionId || this.draftKey !== draftKey;
      if (changedSession) { this.roundClockVisible = false; this.crazyDraft = { target: 'random', text: '', kind: 'task' }; this.assignmentNotice = ''; this.assignmentOpen = true; this.assignmentSelection = null; this.inspirationCards = []; this.inspirationOpen = false; this.inspirationNotice = ''; this.pending = null; this.technicalAck = null; this.settledActions.clear(); this.composing = false; this.error = ''; this.draft = data.talk.myNote || ''; this.editor = null; this.settingsOpen = false; this.confirmation = null; this.topicToOpen = null; this.extensionDraft = ''; this.followupIndex = 0; this.libraryOpen = false; this.libraryDrafts = {}; this.libraryTargets = {}; this.libraryEditsOpen = {}; this.libraryDeleteConfirm = null; this.sortSelections = {}; this.delegateTarget = null;
        this.draftKey = draftKey;
        try { const saved = draftKey && JSON.parse(this.storage?.getItem(draftKey) || 'null'); if (saved && typeof saved.text === 'string') this.crazyDraft = { target: String(saved.target || 'random'), text: saved.text.slice(0,120), kind: 'task' }; } catch (_) {}
      }
      else if (this.data.talk.turnId !== data.talk.turnId) { this.confirmation = null; this.topicToOpen = null; }
      if (this.confirmation === 'end' && (!list(data.talk.questions).length || data.talk.activeQuestion)) this.confirmation = null;
      this.data = data;
      if (data.talk.reply?.id) this.settledActions.add(data.talk.reply.id);
      // Recover an unacknowledged request after a card refresh. A second
      // action must not overwrite the first while the host is reconnecting.
      const actionCurrent = action => (data.talk.phase !== 'ended' || TALK_UI.vnext(data.talk) && action?.type?.startsWith('crazy') || ['newTopic','starters','explain','exclude'].includes(action?.type)) && (TALK_UI.crazyAction(action?.type)
        ? data.talk.crazy?.prompt?.id === action.promptId && data.talk.crazy.prompt.status === 'pending'
        : TALK_UI.vnext(data.talk) && action?.type?.startsWith('crazy') || action?.turnId === data.talk.turnId);
      if (!this.pending && data.talkAction?.sessionId === data.talk.sessionId && actionCurrent(data.talkAction)
          && data.talk.reply?.id !== data.talkAction.id && !this.settledActions.has(data.talkAction.id)) {
        this.pending = data.talkAction; this.sentAt = this.now();
      }
      if (this.pending && data.talk.reply?.id === this.pending.id) {
        this.settledActions.add(this.pending.id);
        if (this.pending.type === 'crazyAssign' && !data.talk.reply.error) {
          const sameTarget = this.crazyDraft.target === 'random' ? this.pending.target == null : Number(this.crazyDraft.target) === Number(this.pending.target);
          if (!this.composing && sameTarget && (!this.pending.kind || this.pending.kind === 'task') && this.crazyDraft.text.trim() === this.pending.text) { this.crazyDraft.text = ''; this.persistDraft(); }
          this.assignmentNotice = 'missionSent';
        }
        if (this.pending.type === 'crazyReturnSave' && !data.talk.reply.error && typeof this.libraryDrafts[this.pending.cardId] === 'string'
            && this.libraryDrafts[this.pending.cardId].trim() !== this.pending.text) {
          this.libraryOpen = true; this.libraryEditsOpen[this.pending.cardId] = true;
          const panel = this.element.querySelector('.talk-private-library'); if (panel) panel.open = true;
        }
        this.error = data.talk.reply.error || ''; this.pending = null; }
      if (this.pending && !actionCurrent(this.pending)) { this.pending = null; }
      this.render(!changedSession);
    }
    storageKey(data) {
      const identity = typeof this.identity === 'function' ? this.identity() : this.identity;
      if (!identity?.verified || !/^[A-Za-z0-9]{4,12}$/.test(identity.room || '') || !/^[a-f0-9]{16,128}$/i.test(identity.token || '') || !data?.talk?.sessionId) return null;
      return 'talk-handwriting-draft.v3:' + identity.room + ':' + identity.token + ':' + encodeURIComponent(data.talk.sessionId);
    }
    persistDraft() {
      if (!this.draftKey) return;
      try { this.storage?.setItem(this.draftKey, JSON.stringify({ target: this.crazyDraft.target, text: this.crazyDraft.text.slice(0,120) })); } catch (_) {}
    }
    pickInspiration(refresh = false) {
      if (typeof TALK_CRAZY === 'undefined' || typeof TALK_CRAZY.inspirationChoices !== 'function') return;
      const exclude = refresh ? this.inspirationCards.map(item => item.id) : [];
      const cards = TALK_CRAZY.inspirationChoices({ count: 3, exclude });
      this.inspirationCards = list(cards).slice(0,3);
    }
    scheduleRenderedAck() {
      if (!this.sendTechnical || this.destroyed || this.technicalFrame != null) return;
      if (typeof requestAnimationFrame === 'function') this.technicalFrame = requestAnimationFrame(() => { this.technicalFrame = null; this.ackVisiblePrompt(); });
      else this.ackVisiblePrompt();
    }
    ackVisiblePrompt() {
      const s = this.data?.talk, prompt = s?.crazy?.prompt;
      if (this.destroyed || !this.sendTechnical || !this.connected() || document.hidden || document.visibilityState === 'hidden'
          || !TALK_UI.vnext(s || {}) || !prompt || prompt.status !== 'pending' || prompt.renderVersion !== 1) return;
      const visible = this.element.querySelector('.talk-crazy-prompt');
      if (!visible || visible.dataset?.talkPrompt !== prompt.id || typeof visible.getClientRects !== 'function' || !visible.getClientRects().length) return;
      const key = s.sessionId + ':' + prompt.id + ':1';
      if (this.technicalAck?.key !== key) this.technicalAck = { key, command: { type: 'crazyRendered', id: Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2,'0')).join(''), sessionId:s.sessionId, promptId:prompt.id, renderVersion:1 }, lastSent: -Infinity, delivering:false, confirmed:false };
      const ack = this.technicalAck;
      if (prompt.rendered || prompt.renderedVersion === 1 || Number(prompt.renderAckAt) > 0) ack.confirmed = true;
      if (ack.confirmed || ack.delivering || this.now() - ack.lastSent < 4000) return;
      ack.lastSent = this.now(); ack.delivering = true;
      Promise.resolve().then(() => this.sendTechnical(ack.command)).then(() => { if (this.technicalAck === ack) ack.confirmed = true; })
        .catch(() => {}).finally(() => { ack.delivering = false; });
    }
    focusConfirmation() {
      const action = this.confirmation === 'end' ? 'confirmEnd' : 'confirmTopic';
      this.element.querySelector('[data-talk-action="' + action + '"]')?.focus?.({ preventScroll: true });
      this.element.querySelector('.talk-card-confirm')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    act(type, extra = {}) {
      if (this.pending || !this.data) return;
      const s = this.data.talk, mine = list(s.roster).find(p => p.playerNum === this.data.playerNum);
      const ownReturn = ['crazyReturnSave','crazyReturnDelete'].includes(type) && list(s.crazy?.returnedCards).some(item=>item.id === extra.cardId);
      if (s.sharedControls === true && (!mine || mine.active === false || mine.pending === true)
          && !ownReturn && !(type === 'exclude' && Number(extra.playerNum) === this.data.playerNum && extra.active === true)) return;
      this.error = '';
      this.pending = Object.assign({}, extra, { type, id: Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''), sessionId: s.sessionId, turnId: s.turnId });
      this.sentAt = this.now(); this.render(true); this.deliver();
    }
    deliver() {
      if (!this.pending) return;
      const command = this.pending;
      Promise.resolve().then(() => this.send(command)).catch(e => {
        if (this.pending?.id !== command.id) return;
        this.error = ['stale_turn','stale_prompt','waiting_players','pending_questions','question_open','not_available','invalid_topic','invalid_extension','invalid_settings','invalid_crazy_interval','invalid_game_seconds','invalid_crazy_task_seconds','confirmation_required','invalid_crazy_assignment','target_busy','invalid_target','invalid_prompt','recipient_busy','queue_full'].includes(e.message) ? e.message : 'error';
        if (this.error === 'pending_questions') this.confirmation = 'end';
        this.pending = null; this.render(true); if (this.confirmation) this.focusConfirmation();
      });
    }
    render(preserveInput) {
      const data = this.data; if (!data) return;
      const privateField = document.activeElement?.dataset?.talkLibraryField;
      const privateEditing = privateField && [...list(data.talk.crazy?.returnedCards),...list(data.talk.crazy?.library)].some(item=>item.id === privateField);
      if (preserveInput && this.composing && (data.talk.phase !== 'ended' || privateEditing)) { this.paint(); return; }
      const s = data.talk, me = data.playerNum;
      let controls = '';
      if (s.phase === 'thinking' && list(s.roster).some(p => p.playerNum === me && p.active !== false && p.pending !== true)) {
        if (s.mode === 'write') controls += `<label class="talk-field">${esc(t('noteLabel'))}<textarea data-talk-note maxlength="180" rows="3" placeholder="${esc(t('notePlaceholder'))}">${esc(this.draft)}</textarea></label>${button(s.myNote ? 'updateNote' : 'sendNote', 'note')}${s.myNote ? `<p class="talk-soft">${esc(t('noteSent'))}</p>` : ''}`;
      } else if (s.phase === 'talking' && s.conversationMode !== 'free' && s.speaker === me) {
        controls += s.activeQuestion ? button('resume', 'resume', '', true) : button('end', 'end', '', true);
      }
      if (s.sharedControls === true && s.hostControls) {
        controls += '<div class="talk-actions talk-flow-controls">' +
          (s.actions?.start ? button('start', 'start', '', true) : '') +
          (s.gameMode !== 'crazy' && s.actions?.addTime ? button('addMinute', 'addTime') : '') +
          (s.actions?.end && s.conversationMode !== 'free' && s.speaker !== me && !s.activeQuestion ? button('helpEnd', 'end') : '') +
          (s.actions?.resume && s.activeQuestion && s.activeQuestion.playerNum !== me && s.speaker !== me ? button('helpResume', 'resume') : '') + '</div>';
      }
      const allowAssignment = s.gameMode === 'crazy' && ['thinking', 'talking'].includes(s.phase) && !s.crazy?.queueLocked && !TALK_UI.isActor(s) && (TALK_UI.vnext(s) ? s.crazy?.canAssign !== false : s.crazy?.source !== 'system');
      const recipients = list(s.roster).filter(p => p.playerNum !== me && p.active !== false && p.pending !== true);
      if (this.crazyDraft.target !== 'random' && !recipients.some(p => String(p.playerNum) === String(this.crazyDraft.target))) this.crazyDraft.target = 'random';
      this.persistDraft();
      if (preserveInput && this.element.querySelector('.talk-assignment')) this.assignmentOpen = !!this.element.querySelector('.talk-assignment').open;
      if (preserveInput && this.element.querySelector('[data-talk-inspiration]')) this.inspirationOpen = !!this.element.querySelector('[data-talk-inspiration]').open;
      if (canInspire(s) && !this.inspirationCards.length) this.pickInspiration();
      const inspiration = `<details class="talk-inspiration" data-talk-inspiration${canInspire(s) && this.inspirationCards.length ? '' : ' hidden'}${this.inspirationOpen ? ' open' : ''}><summary data-talk-assignment-label="inspiration">${esc(t('inspiration'))}</summary><div class="talk-inspiration-body"><p class="talk-soft" data-talk-assignment-label="inspirationHint">${esc(t('inspirationHint'))}</p>${[0,1,2].map(i => { const idea = this.inspirationCards[i]; return `<button type="button" class="talk-idea" data-talk-action="inspirationUse" data-talk-idea-slot="${i}" data-talk-idea-id="${esc(idea?.id || '')}"${idea ? '' : ' hidden'}>${idea ? esc(ideaText(idea)) : ''}</button>`; }).join('')}${button('inspirationRefresh','inspirationRefresh')}<p class="talk-soft" data-talk-inspiration-notice role="status"${this.inspirationNotice ? '' : ' hidden'}>${this.inspirationNotice ? esc(t(this.inspirationNotice)) : ''}</p></div></details>`;
      const assignment = allowAssignment ? `<details class="talk-assignment"${this.assignmentOpen ? ' open' : ''}><summary data-talk-assignment-label="composeMission">${esc(t('composeMission'))}</summary><div class="talk-assignment-body">
        <label class="talk-field"><span data-talk-assignment-label="missionRecipient">${esc(t('missionRecipient'))}</span><select data-talk-assignment-field="target">${option('random', t('randomRecipient'), this.crazyDraft.target)}${recipients.map(p => option(p.playerNum, p.name || name(s,p.playerNum), this.crazyDraft.target)).join('')}</select></label>
        <label class="talk-field"><span data-talk-assignment-label="missionText">${esc(t('missionText'))}</span><textarea data-talk-assignment-field="text" maxlength="120" rows="3" placeholder="${esc(t('missionPlaceholder'))}">${esc(this.crazyDraft.text)}</textarea></label>
        ${inspiration}
        <p class="talk-soft" data-talk-assignment-label="missionHint">${esc(t('missionHint'))}</p>${button('missionSend','crazyAssign',s.crazy?.canAssign === false ? 'data-talk-blocked="true" disabled' : '',true)}
        <p class="talk-soft" role="status" data-talk-assignment-notice${this.assignmentNotice ? '' : ' hidden'}>${this.assignmentNotice ? esc(t(this.assignmentNotice)) : ''}</p></div></details>` : '';
      const active = this.element.querySelector('[data-talk-note]');
      const keep = preserveInput && active && s.phase === 'thinking' && s.mode === 'write' ? active : null;
      const focused = keep && document.activeElement === keep;
      const notesOpen = preserveInput && this.element.querySelector('.talk-shared')?.open;
      if (preserveInput && this.element.querySelector('.talk-management')) this.managementOpen = !!this.element.querySelector('.talk-management').open;
      if (preserveInput && this.element.querySelector('.talk-private-library')) this.libraryOpen = !!this.element.querySelector('.talk-private-library').open;
      if (preserveInput) this.element.querySelectorAll('[data-talk-library-editor]').forEach(panel=>{this.libraryEditsOpen[panel.dataset.talkLibraryEditor]=!!panel.open;});
      const activeField = document.activeElement?.dataset?.talkEditorField || document.activeElement?.dataset?.talkSharedInput || document.activeElement?.dataset?.talkAssignmentField || document.activeElement?.dataset?.talkLibraryField;
      const fieldKind = document.activeElement?.dataset?.talkEditorField ? 'editor-field' : document.activeElement?.dataset?.talkAssignmentField ? 'assignment-field' : document.activeElement?.dataset?.talkLibraryField ? 'library-field' : 'shared-input';
      const activeEditorNode = preserveInput && activeField && ['text', 'search', 'textarea'].includes(document.activeElement?.type) ? document.activeElement : null;
      const editing = !!activeField || this.composing || !!this.element.querySelector('.talk-assignment')?.contains?.(document.activeElement);
      const openPanels = ['.talk-card-explore', '.talk-topic-explanation'].filter(selector => preserveInput && this.element.querySelector(selector)?.open);
      const selectionStart = document.activeElement?.selectionStart, selectionEnd = document.activeElement?.selectionEnd;
      if (keep) keep.remove();
      const myTurn = s.phase === 'talking' && s.conversationMode !== 'free' && s.speaker === me && !s.activeQuestion;
      const prompt = s.crazy?.prompt;
      const newPrompt = s.gameMode === 'crazy' && prompt?.status === 'pending' && this.shownPrompt !== prompt.id;
      this.shownPrompt = prompt?.status === 'pending' ? prompt.id : null;
      const cardClass = `secret-card talk-player${myTurn ? ' talk-my-turn' : ''}${s.gameMode === 'crazy' ? ' talk-is-crazy' : ''}`;
      const mainHTML = `<div class="talk-card-top">${this.nameBanner(data)}<span class="talk-kicker">${s.gameMode === 'crazy' ? 'CRAZY TALK' : 'LET’S TALK'}</span></div>
        ${prompt?.status === 'pending' ? TALK_UI.crazyHTML(s) : ''}
        ${s.phase === 'ended' && !TALK_UI.vnext(s) ? `<section class="talk-rest-card"><span class="talk-rest-icon" aria-hidden="true">☕</span><h2>${esc(t('roundRest'))}</h2><p>${esc(t('roundFinished'))}</p><p class="talk-soft">${esc(t('restHint'))}</p></section>${TALK_UI.scoreboardHTML(s,me)}${s.sharedControls === true && s.actions?.newTopic ? '<div class="talk-actions">' + button('newRound','settings','',true) + '</div>' : ''}` : `<section class="talk-topic-card"><span class="talk-kicker">${esc(t('setupTopic'))}</span><p class="talk-player-topic">${esc(s.topic.question)}</p>
        ${s.showStarters && s.starter && !(s.extended && s.starter === s.topic.followUp) ? `<details class="talk-topic-explanation"><summary>${esc(t('showStarters'))}</summary><p class="talk-starter">${esc(s.starter)}</p></details>` : ''}
        ${s.extended ? `<p class="talk-extension">${esc(s.topic.followUp)}</p>` : ''}</section>`}`;
      const footerHTML = `${allowAssignment && s.crazy?.myQueuedCount > 0 ? `<p class="talk-queue-count" role="status">${esc(t('missionQueuedCount', { n: s.crazy.myQueuedCount }))}</p>` : ''}
        ${TALK_UI.skipResultHTML(s,this.now())}
        ${prompt?.status !== 'pending' ? TALK_UI.crazyHTML(s) : ''}
        ${TALK_UI.vnextHTML(s,me,this)}
        ${s.phase !== 'ended' ? `<section class="talk-current-state${myTurn ? ' is-your-turn' : ''}"><span class="talk-kicker">${esc(t('stateTitle'))}</span><div class="talk-floor" aria-live="polite">${esc(TALK_UI.status(s, me))}</div>
        ${s.phase === 'thinking' ? '<p class="talk-soft" data-talk-clock></p>' : ''}
        <p class="talk-soft">${esc(t(s.phase === 'thinking' ? 'thinking' : s.conversationMode === 'free' ? 'conversationHintFree' : myTurn ? 'turnHint' : 'listening'))}</p>
        <div class="talk-controls">${controls}</div></section>` : ''}
        ${s.phase !== 'ended' || s.gameMode !== 'crazy' ? `<section class="talk-card-roster"><div class="talk-section-label"><span>${esc(t('participantsTitle'))}</span><span>${list(s.roster).length}</span></div>${TALK_UI.participantsHTML(s, me)}</section>` : ''}
        ${s.phase === 'talking' && Number(s.gameDeadline) > 0 ? `<div class="talk-round-strip"><button type="button" class="talk-button talk-time-toggle" data-talk-action="viewTime" aria-expanded="${this.roundClockVisible}" aria-controls="talk-round-time-${me}">${esc(t(this.roundClockVisible ? 'hideTime' : 'viewTime'))}</button><span id="talk-round-time-${me}" role="timer" data-talk-round-clock${this.roundClockVisible ? '' : ' hidden'}></span></div>` : ''}
        ${this.confirmation ? `<section class="talk-card-confirm" role="alertdialog" aria-label="${esc(t(this.confirmation === 'end' ? 'forceEnd' : 'openTopic'))}"><p>${esc(t(this.confirmation === 'end' ? 'confirmEnd' : 'confirmNewTopic', { n: list(s.questions).length }))}</p>${this.confirmation === 'topic' ? `<p class="talk-player-topic">${esc(this.topicToOpen?.topic.question)}</p>` : ''}<div class="talk-actions">${button(this.confirmation === 'end' ? 'confirmSkip' : 'confirmOpen', this.confirmation === 'end' ? 'confirmEnd' : 'confirmTopic', '', true)}${button('cancel', 'cancelConfirm')}</div></section>` : ''}
        ${managementHTML(s, this)}
        <p class="talk-feedback" role="status">${this.error ? esc(t(this.error)) : ''}</p>
        ${this.error === 'pending_questions' ? button('forceEnd', 'forceEnd') : ''}
        <p class="talk-connection" role="status"></p>${this.pending ? button('retry', 'retry') : ''}
        ${list(s.notes).length ? `<details class="talk-shared"><summary>${esc(t('sharedNotes'))}</summary>${TALK_UI.notes(s)}</details>` : ''}
      `;
      const main = this.element.querySelector('[data-talk-card-main]'), footer = this.element.querySelector('[data-talk-card-footer]');
      const assignmentSlot = this.element.querySelector('[data-talk-card-assignment]');
      const returnsSlot = this.element.querySelector('[data-talk-card-returns]'), returnsHTML = TALK_UI.returnedHTML(s,me,this);
      const mission = prompt?.status === 'pending' ? JSON.stringify([s.sessionId, me, s.gameMode,
        prompt.id, prompt.text, prompt.kind, prompt.source, prompt.renderVersion || 1, s.crazy?.offer || null, t('crazyDone'), t('crazyHere')]) : null;
      const activeAction = document.activeElement;
      const retainFocusedMission = preserveInput && mission && mission === this.renderedMission
        && TALK_UI.crazyAction(activeAction?.dataset?.talkAction) && main?.contains?.(activeAction)
        && activeAction.closest?.('.talk-crazy-prompt') && (s.phase !== 'ended' || ['draining','decision','extension'].includes(s.crazy?.roundStage));
      // Keep the composer and every ancestor connected. Detaching and restoring
      // a select also closes its native popup during a live state update.
      const retainCard = preserveInput && main && typeof main.innerHTML === 'string' && footer && assignmentSlot && returnsSlot;
      const retainedAssignment = retainCard && allowAssignment && assignmentSlot.querySelector('.talk-assignment');
      if (retainCard) {
        // Native pickers also close when content above them changes their
        // position. Flush these regions on select change or focusout instead.
        if (!this.assignmentSelection || !allowAssignment) {
          this.element.querySelector('.talk-player').className = cardClass;
          // Reminder/check-in publication must keep a focused or pressed task
          // control connected. Its pre-rendered status rows update in paint().
          if (retainFocusedMission) this.missionRenderDeferred = true;
          else { main.innerHTML = mainHTML; this.renderedMission = mission; this.missionRenderDeferred = false; }
          footer.innerHTML = footerHTML;
        }
        if (retainedAssignment) this.refreshAssignment(retainedAssignment, recipients, s);
        else assignmentSlot.innerHTML = assignment;
        this.refreshReturns(returnsSlot,s,me,returnsHTML);
      } else {
        this.element.innerHTML = `<div class="${cardClass}"><div data-talk-card-main style="display:contents">${mainHTML}</div><div data-talk-card-assignment style="display:contents">${assignment}</div><div data-talk-card-returns style="display:contents">${returnsHTML}</div><div data-talk-card-footer style="display:contents">${footerHTML}</div></div>`;
        this.renderedMission = mission; this.missionRenderDeferred = false;
      }
      if (keep) {
        this.element.querySelector('[data-talk-note]')?.replaceWith(keep);
        if (focused) keep.focus({ preventScroll: true });
      }
      if (activeField && !(fieldKind === 'assignment-field' && retainedAssignment)
          && !(fieldKind === 'library-field' && activeEditorNode?.isConnected && returnsSlot?.contains?.(activeEditorNode))) {
        const next = this.element.querySelector('[data-talk-' + fieldKind + '="' + activeField + '"]');
        if (activeEditorNode && next) next.replaceWith(activeEditorNode);
        const restored = activeEditorNode && next ? activeEditorNode : next;
        restored?.focus?.({ preventScroll: true });
        if (Number.isInteger(selectionStart) && typeof restored?.setSelectionRange === 'function' && ['text', 'search', 'textarea'].includes(restored.type)) restored.setSelectionRange(selectionStart, selectionEnd);
      }
      for (const selector of openPanels) { const panel = this.element.querySelector(selector); if (panel) panel.open = true; }
      if (notesOpen && this.element.querySelector('.talk-shared')) this.element.querySelector('.talk-shared').open = true;
      if (newPrompt && !editing) this.element.querySelector('.talk-crazy-prompt')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      document.title = (myTurn ? t('turnAlert') + ' · ' : '') + t('title', { name: data.name || t('player', { n: me }) });
      this.paint();
    }
    refreshReturns(slot,s,me,html) {
      if (!html) { if (slot.innerHTML) slot.innerHTML = ''; return; }
      if (!slot.querySelector('[data-talk-returned]')) { slot.innerHTML = html; return; }
      const cards = list(s.crazy?.returnedCards), ids = new Set(cards.map(item=>item.id));
      const section = slot.querySelector('[data-talk-returned]'), title = section.querySelector('h3');
      const heading = t('returnedTitle',{n:cards.length}); if (title.textContent !== heading) title.textContent = heading;
      section.querySelectorAll('[data-talk-return-label]').forEach(node=>{ const label=t(node.dataset.talkReturnLabel);if(node.textContent!==label)node.textContent=label; });
      section.querySelectorAll('[data-talk-return-card]').forEach(node=>{if(!ids.has(node.dataset.talkReturnCard))node.remove();});
      const container = section.querySelector('[data-talk-return-list]');
      for (const item of cards) {
        let article = Array.from(container.children).find(node=>node.dataset.talkReturnCard===item.id);
        if (!article) { const wrapper=slot.ownerDocument.createElement('div');wrapper.innerHTML=TALK_UI.returnedCardHTML(item,this);article=wrapper.firstElementChild;container.append(article); }
        const textarea = article.querySelector('[data-talk-library-field]'), value = this.libraryDrafts[item.id] ?? item.text;
        if (!this.composing && textarea.value !== value) textarea.value=value;
        for (const [action,label] of [['crazyReturnSave','returnSave'],['crazyReturnDelete','returnDelete']]) {const node=article.querySelector('[data-talk-action="'+action+'"]');if(node.textContent!==t(label))node.textContent=t(label);}
      }
    }
    refreshAssignment(composer, recipients, s) {
      composer.querySelectorAll('[data-talk-assignment-label]').forEach(node => {
        const label = t(node.dataset.talkAssignmentLabel);
        if (node.textContent !== label) node.textContent = label;
      });
      const target = composer.querySelector('[data-talk-assignment-field="target"]');
      const choices = [['random', t('randomRecipient')], ...recipients.map(p => [String(p.playerNum), p.name || name(s,p.playerNum)])];
      const values = new Set(choices.map(([value]) => value));
      Array.from(target.options).forEach(node => { if (!values.has(node.value)) node.remove(); });
      choices.forEach(([value, label], index) => {
        let node = Array.from(target.options).find(option => option.value === value);
        if (!node) { node = target.ownerDocument.createElement('option'); node.value = value; }
        if (node.textContent !== label) node.textContent = label;
        if (target.options[index] !== node) target.insertBefore(node, target.options[index] || null);
      });
      if (this.assignmentSelection !== target && target.value !== String(this.crazyDraft.target)) target.value = this.crazyDraft.target;
      const text = composer.querySelector('[data-talk-assignment-field="text"]');
      if (!this.composing && text.value !== this.crazyDraft.text) text.value = this.crazyDraft.text;
      text.placeholder = t('missionPlaceholder');
      const send = composer.querySelector('[data-talk-action="crazyAssign"]');
      send.dataset.talkBlocked = String(s.crazy?.canAssign === false);
      if (send.textContent !== t('missionSend')) send.textContent = t('missionSend');
      const notice = composer.querySelector('[data-talk-assignment-notice]');
      const message = this.assignmentNotice ? t(this.assignmentNotice) : '';
      if (notice.textContent !== message) notice.textContent = message;
      notice.hidden = !message;
      const ideas = composer.querySelector('[data-talk-inspiration]');
      ideas.hidden = !canInspire(s) || !this.inspirationCards.length;
      ideas.querySelectorAll('[data-talk-idea-slot]').forEach(node => {
        const idea = this.inspirationCards[Number(node.dataset.talkIdeaSlot)];
        node.hidden = !idea;
        if (!idea) return;
        node.dataset.talkIdeaId = idea.id;
        if (node.textContent !== ideaText(idea)) node.textContent = ideaText(idea);
      });
      const refresh = ideas.querySelector('[data-talk-action="inspirationRefresh"]');
      if (refresh.textContent !== t('inspirationRefresh')) refresh.textContent = t('inspirationRefresh');
      const ideaNotice = ideas.querySelector('[data-talk-inspiration-notice]'), ideaMessage = this.inspirationNotice ? t(this.inspirationNotice) : '';
      if (ideaNotice.textContent !== ideaMessage) ideaNotice.textContent = ideaMessage;
      ideaNotice.hidden = !ideaMessage;
    }
    paint() {
      if (!this.data) return;
      const s = this.data.talk, now = this.now();
      const offline = !this.connected();
      const hostAway = s.sharedControls !== true && !!s.hostLiveUntil && now > s.hostLiveUntil;
      const message = offline ? 'offline' : hostAway ? 'hostAway' : this.pending ? (now - this.sentAt > 2000 ? (s.sharedControls === true ? 'waitingServer' : 'waitingHost') : 'waiting') : '';
      const status = this.element.querySelector('.talk-connection');
      if (status) status.textContent = message ? t(message) : '';
      const roundExpired = !TALK_UI.vnext(s) && s.phase === 'talking' && Number(s.gameDeadline) > 0 && now >= s.gameDeadline;
      const promptExpired = s.crazy?.prompt?.status === 'pending' && Number(s.crazy.prompt.expiresAt) > 0 && now >= s.crazy.prompt.expiresAt;
      const prompt = s.crazy?.prompt, checkInDue = Number(prompt?.checkInAt);
      const checkInAllowed = s.gameMode === 'crazy' && prompt?.status === 'pending' && !promptExpired
        && (checkInDue > 0 ? now >= checkInDue : prompt?.checkIn === true);
      this.element.querySelectorAll('[data-talk-action]').forEach(b => {
        if (['inspirationUse','inspirationRefresh'].includes(b.dataset.talkAction)) { b.disabled = !canInspire(s) || offline || hostAway || this.composing; return; }
        b.disabled = b.dataset.talkAction !== 'viewTime' && (b.dataset.talkBlocked === 'true' || offline || hostAway || (!!this.pending && b.dataset.talkAction !== 'retry') || (b.dataset.talkAction === 'crazyHere' && !checkInAllowed) || (TALK_UI.crazyAction(b.dataset.talkAction) && (promptExpired || roundExpired)) || (roundExpired && ['end','addTime','finish','crazyAssign','extend'].includes(b.dataset.talkAction)));
        if (b.dataset.talkAction === 'retry') b.hidden = now - this.sentAt < 6000;
      });
      this.element.querySelectorAll('[data-talk-editor-field], [data-talk-shared-input], [data-talk-assignment-field]').forEach(input => {
        // Prepare the next card while the previous command waits for its ACK.
        const disabled = offline || hostAway || (input.dataset.talkAssignmentField ? roundExpired || s.crazy?.canAssign === false : !!this.pending);
        if (input.disabled !== disabled) input.disabled = disabled;
      });
      this.element.querySelectorAll('[data-talk-sort-card]').forEach(input => { input.disabled = offline || hostAway || !!this.pending; });
      const checkIn = this.element.querySelector('[data-talk-check-in]');
      if (checkIn && !this.assignmentSelection) {
        checkIn.hidden = !checkInAllowed;
      }
      const reminder = this.element.querySelector('[data-talk-mission-reminder]');
      if (reminder && !this.assignmentSelection) reminder.hidden = !s.crazy?.prompt?.reminder || !!checkIn && !checkIn.hidden;
      const clock = this.element.querySelector('[data-talk-clock]');
      if (clock) clock.textContent = t('secondsLeft', { n: Math.max(0, Math.ceil((s.deadline - now) / 1000)) });
      const roundClock = this.element.querySelector('[data-talk-round-clock]');
      if (roundClock) roundClock.textContent = t('roundClock', { time: TALK_UI.duration((s.gameDeadline - now) / 1000) });
      if (!this.assignmentSelection) this.element.querySelectorAll('[data-talk-until]').forEach(e => { if (Number(e.dataset.talkUntil) <= now) e.remove(); });
      this.scheduleRenderedAck();
    }
    destroy() {
      this.destroyed = true; this.assignmentSelection = null;
      this.persistDraft(); this.technicalAck = null;
      if (this.technicalFrame != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.technicalFrame);
      this.element.removeEventListener('pointerdown', this.selectionStart); this.element.removeEventListener('keydown', this.selectionStart); this.element.removeEventListener('focusout', this.selectionEnd);
      this.element.removeEventListener('compositionstart', this.compositionStart); this.element.removeEventListener('compositionend', this.compositionEnd);
      clearInterval(this.timer); this.element.removeEventListener('click', this.clickHandler); this.element.removeEventListener('input', this.inputHandler); this.element.removeEventListener('change', this.changeHandler);
    }
  }
  return { Card };
})();
