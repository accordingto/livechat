(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_UI = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';

  var dict = {
  "brandLine": {
    "en": "ONE PROMPT. YOUR STORY. YOUR SONG.",
    "zh": "一個情境・你的故事・你的歌"
  },
  "subtitle": {
    "en": "Share a moment from your life, then sing the song it brings back.",
    "zh": "說一段人生故事，再唱出它讓你想起的那首歌。"
  },
  "startTitle": {
    "en": "Give sharing a little excuse.",
    "zh": "給開口分享一個小小的理由。"
  },
  "intro": {
    "en": "Life Song (default): see a life prompt, share a real moment, then choose the song it reminds you of and sing a little. Mission Rescue: the original short social challenges. Skipping is always okay.",
    "zh": "人生之歌（預設）：看一個人生情境，說一段真實回憶，再選一首它讓你想到的歌唱一小段。任務救場：原本的小小社交挑戰。隨時都可以跳過。"
  },
  "stopGame": { "en": "End game", "zh": "結束遊戲" },
  "restartGame": { "en": "Reset score & start new game", "zh": "分數歸零並開始新局" },
  "gameStopped": { "en": "Game ended. Start a new game from your card.", "zh": "遊戲已結束，可從自己的卡片開始新局。" },
  "start": {
    "en": "Start Open Mic Rescue",
    "zh": "開始開麥救場"
  },
  "noPressure": {
    "en": "No voice judging. No mandatory performances. Just a shared team score.",
    "zh": "不評表現、不強迫互動，全隊一起累積分數。"
  },
  "rules": {
    "en": "How to play",
    "zh": "怎麼玩"
  },
  "rule1": {
    "en": "The Spotlight player answers the prompt while everyone listens, asks questions, and reacts. In Life Song the host marks the story as shared; in Mission Rescue the host chooses Success or Failed.",
    "zh": "聚光燈玩家回應題目，大家一起聽、追問、回應。人生之歌由主持人按「分享了」；任務救場由主持人判定成功或失敗。"
  },
  "rule2": {
    "en": "A shared story or a successful challenge adds +2. Singing a little, a short story, or an original idea adds +1 after either result. Skipping is always okay.",
    "zh": "分享故事或挑戰成功 +2。之後唱一小段、說個小故事或原創互動 +1。隨時都可以跳過。"
  },
  "rule3": {
    "en": "Choose a song title or an activity card, then start the 35-second visual timer. Finish your turn naturally. The host moves to the next player.",
    "zh": "選一個歌名或互動提示卡，再開始 35 秒視覺計時。自然完成這一段，由主持人換下一位。"
  },
  "audioHint": {
    "en": "Use your usual call or the room for the activity. Song cards contain titles and artists only; this game does not play videos or display lyrics.",
    "zh": "透過原本的通話或現場互動。歌單只保留歌名與歌手，遊戲不播放影片或顯示歌詞。"
  },
  "demo": {
    "en": "Interactive demo · one-device simulation",
    "zh": "操作示範・單機模擬"
  },
  "demoView": {
    "en": "Switch the demo view",
    "zh": "切換示範視角"
  },
  "hostView": {
    "en": "Host / shared screen",
    "zh": "主持／共同畫面"
  },
  "demoLink": {
    "en": "Try the interactive demo",
    "zh": "先試操作示範"
  },
  "liveLink": {
    "en": "Use your room",
    "zh": "使用正式房間"
  },
  "setupNeeded": {
    "en": "Set up your room and players in the hub first.",
    "zh": "先到主選單設定房間與玩家連結。"
  },
  "setUpRoom": {
    "en": "Set up room & players",
    "zh": "設定房間與玩家"
  },
  "spotlight": {
    "en": "SPOTLIGHT",
    "zh": "本輪主角"
  },
  "you": {
    "en": "YOU",
    "zh": "是你！"
  },
  "round": {
    "en": "Round {n}",
    "zh": "第 {n} 輪"
  },
  "player": {
    "en": "Player {n}",
    "zh": "玩家 {n}"
  },
  "room": {
    "en": "Room {code}",
    "zh": "房間 {code}"
  },
  "successRule": {
    "en": "Success: {rule}",
    "zh": "成功條件：{rule}"
  },
  "challengeSuccess": {
    "en": "✓ Challenge Success · +2",
    "zh": "✓ 挑戰成功・+2"
  },
  "challengeFailed": {
    "en": "Challenge Failed",
    "zh": "挑戰失敗"
  },
  "successHint": {
    "en": "You survived! Share a story, make something original, invite a partner, or skip.",
    "zh": "過關了！分享故事、玩原創即興、邀人合作，或直接跳過。"
  },
  "failedHint": {
    "en": "Want a little rescue? Share a story or an original rhythm for +1, with a partner or solo.",
    "zh": "想開口救場嗎？分享故事或自創節奏救回 +1，也能找夥伴，或直接跳過。"
  },
  "success": {
    "en": "✓ Success +2",
    "zh": "✓ 成功 +2"
  },
  "failed": {
    "en": "Failed",
    "zh": "失敗"
  },
  "newChallenge": {
    "en": "↻ New Challenge",
    "zh": "↻ 換一個挑戰"
  },
  "next": {
    "en": "Next Player →",
    "zh": "下一位 →"
  },
  "teamScore": {
    "en": "TEAM SCORE",
    "zh": "全隊分數"
  },
  "scoreHint": {
    "en": "Challenge +2 · Optional activity +1 · Skip +0",
    "zh": "挑戰 +2・自選互動 +1・跳過 +0"
  },
  "queue": {
    "en": "TURN QUEUE",
    "zh": "輪流順序"
  },
  "manage": {
    "en": "Manage players",
    "zh": "管理玩家"
  },
  "sitOut": {
    "en": "Sit out",
    "zh": "先休息"
  },
  "rejoin": {
    "en": "Rejoin",
    "zh": "重新加入"
  },
  "sittingOut": {
    "en": "Sitting out",
    "zh": "休息中"
  },
  "stage": {
    "en": "Your sharing stage",
    "zh": "你的分享舞台"
  },
  "duration": {
    "en": "{n}s, at your pace",
    "zh": "{n} 秒，輕鬆分享就好"
  },
  "viewChallenge": {
    "en": "View challenge",
    "zh": "查看挑戰"
  },
  "chooseSong": {
    "en": "Choose a song title or activity card.",
    "zh": "選一個歌名或互動提示卡。"
  },
  "stageEmptyHint": {
    "en": "Tell a music memory, invent your own melody, or pass an original rhythm.",
    "zh": "聊音樂回憶、自創一段旋律，或玩原創節奏接龍。"
  },
  "challengeFirst": {
    "en": "Browse titles during the challenge. Your activity opens after the host chooses the result.",
    "zh": "挑戰時也可以先看歌名。主持人判定結果後，就能選卡互動或跳過。"
  },
  "selectionWait": {
    "en": "{name} can choose a title or activity, or skip. Everyone can browse titles.",
    "zh": "由 {name} 選歌名或提示卡，也能跳過。每個人都能瀏覽歌名。"
  },
  "startSinging": {
    "en": "🎤 Start my turn",
    "zh": "🎤 開始互動"
  },
  "finishSinging": {
    "en": "✓ Finished my turn · +1",
    "zh": "✓ 完成互動・+1"
  },
  "changeSong": {
    "en": "↻ Change my choice",
    "zh": "↻ 換歌／換提示卡"
  },
  "clearSong": {
    "en": "Remove my choice",
    "zh": "取消選擇"
  },
  "changeSongHint": {
    "en": "Changing or removing your choice stops this timer. Start again when ready.",
    "zh": "换歌或取消會停止這段計時，選好後再按「開始互動」。"
  },
  "songControlsHint": {
    "en": "Choose another card below to replace this one. Removing it does not change your score.",
    "zh": "從下方選另一個就能直接取代。取消選擇不會改變分數。"
  },
  "finishedPlaybackHint": {
    "en": "This round is settled. You can still change your choice; choose Next Player to continue.",
    "zh": "本輪已結算，仍可更換選擇；按「下一位」繼續。"
  },
  "inviteDuet": {
    "en": "👥 Invite a partner",
    "zh": "👥 邀人合作"
  },
  "skip": {
    "en": "Skip my turn",
    "zh": "跳過互動"
  },
  "timerRunning": {
    "en": "A short story or original rhythm is enough.",
    "zh": "分享一小段故事或原創節奏就好。"
  },
  "timerZero": {
    "en": "Finish your turn naturally.",
    "zh": "自然完成這一段互動。"
  },
  "timerIdle": {
    "en": "Ready when you are.",
    "zh": "準備好再開始。"
  },
  "singingDone": {
    "en": "You shared a moment! +1",
    "zh": "替全隊分享了一段！+1"
  },
  "singingSkipped": {
    "en": "Skipped. No pressure.",
    "zh": "已跳過，輕鬆玩就好。"
  },
  "nextHint": {
    "en": "Chat for a moment. The host chooses when to continue.",
    "zh": "先聊一下，主持人準備好再換下一位。"
  },
  "duetWith": {
    "en": "Partner: {name}",
    "zh": "合作夥伴：{name}"
  },
  "duetTitle": {
    "en": "Invite someone to share your turn",
    "zh": "找個人一起分享這一輪"
  },
  "duetHint": {
    "en": "This marks your partner. Share a story or invent a rhythm together through your usual call or in the room.",
    "zh": "這裡會標記合作夥伴，透過原本的通話或現場一起分享故事、創作節奏。"
  },
  "duetNone": {
    "en": "Solo for now",
    "zh": "先自己分享"
  },
  "noDuet": {
    "en": "No other active players right now.",
    "zh": "目前沒有其他參與中的玩家。"
  },
  "library": {
    "en": "Titles and activity cards",
    "zh": "歌名與互動提示卡"
  },
  "addOwn": {
    "en": "+ Add a title",
    "zh": "+ 加入歌名"
  },
  "singThis": {
    "en": "Choose this title",
    "zh": "選這個歌名"
  },
  "selected": {
    "en": "Selected",
    "zh": "已選取"
  },
  "search": {
    "en": "Search songs or artists…",
    "zh": "搜尋歌名或歌手…"
  },
  "noSongs": {
    "en": "No songs here yet. Add a song you know or save one with ☆.",
    "zh": "這裡還沒有歌。加入熟悉的歌，或按 ☆ 收藏。"
  },
  "noSearch": {
    "en": "No songs match your search.",
    "zh": "沒有符合搜尋的歌曲。"
  },
  "ownerSongs": {
    "en": "My Songs: {name}",
    "zh": "我的歌單：{name}"
  },
  "saveSong": {
    "en": "Save to My Songs",
    "zh": "收藏到我的歌單"
  },
  "unsaveSong": {
    "en": "Remove from My Songs",
    "zh": "從我的歌單移除"
  },
  "youtubeLink": {
    "en": "Open source on YouTube ↗",
    "zh": "自行到 YouTube 查看來源 ↗"
  },
  "addTitle": {
    "en": "Add a title to your list",
    "zh": "加入歌名到我的清單"
  },
  "songTitle": {
    "en": "Song title",
    "zh": "歌名"
  },
  "titlePlaceholder": {
    "en": "Your go-to song",
    "zh": "你最熟悉的歌"
  },
  "addHint": {
    "en": "Save a title and optional artist for music stories. No audio, video, or lyrics are attached.",
    "zh": "記錄歌名與選填歌手，當作音樂故事的提示。只儲存文字。"
  },
  "add": {
    "en": "Add to My Songs",
    "zh": "加入我的歌單"
  },
  "close": {
    "en": "Close",
    "zh": "關閉"
  },
  "invalid_title": {
    "en": "Enter a title (up to 140 characters).",
    "zh": "請輸入歌名（最多 140 個字）。"
  },
  "invalid_song": {
    "en": "This song is unavailable. Choose another song.",
    "zh": "這首歌目前無法使用，請換一首。"
  },
  "choose_song": {
    "en": "Choose a title or activity card first.",
    "zh": "請先選一個歌名或互動提示卡。"
  },
  "invalid_time": {
    "en": "The room clock is updating. Try this action again.",
    "zh": "房間時間正在更新，請再操作一次。"
  },
  "invalid_player": {
    "en": "Choose an active player.",
    "zh": "請選一位正在參與的玩家。"
  },
  "invalid_duet": {
    "en": "Choose another active player as your activity partner.",
    "zh": "請選另一位正在參與的玩家一起互動。"
  },
  "not_enough_players": {
    "en": "At least two players must be in the game.",
    "zh": "至少要有兩位玩家參與遊戲。"
  },
  "invalid_roster": {
    "en": "Set up at least two players in the hub.",
    "zh": "請先到主選單設定至少兩位玩家。"
  },
  "stale_turn": {
    "en": "The turn changed. Follow the latest screen and try again.",
    "zh": "本輪畫面已更新，請依最新畫面再操作。"
  },
  "forbidden": {
    "en": "The host or Spotlight player controls this action.",
    "zh": "這個動作由主持人或本輪主角操作。"
  },
  "not_available": {
    "en": "This action is not available right now. Follow the latest screen.",
    "zh": "這個動作目前無法使用，請依最新畫面操作。"
  },
  "library_full": {
    "en": "The session song library is full.",
    "zh": "本次遊戲的歌庫已滿。"
  },
  "error": {
    "en": "Could not sync. Check your connection and try again.",
    "zh": "同步暫時失敗，請檢查連線後再試。"
  },
  "connecting": {
    "en": "Connecting…",
    "zh": "正在連線…"
  },
  "offline": {
    "en": "Connection lost. Reconnecting…",
    "zh": "連線暫時中斷，正在重新連線…"
  },
  "recover": {
    "en": "Skip offline players",
    "zh": "略過離線玩家"
  },
  "hostAway": {
    "en": "Waiting for the host to reconnect. Keep chatting.",
    "zh": "等待主持頁重新連線，先自由聊天。"
  },
  "other_host": {
    "en": "Another host tab is controlling this room. Close it to continue here.",
    "zh": "另一個主持頁正在控制房間，關閉那頁後可在這裡接續。"
  },
  "switched": {
    "en": "The room has switched games. Start Open Mic Rescue to play again.",
    "zh": "房間已切換到其他遊戲，按「開始開麥救場」可以再玩。"
  },
  "noFirebase": {
    "en": "Player pages are unavailable. Check your connection and reload.",
    "zh": "目前無法連線到玩家頁，請檢查網路後重新整理。"
  },
  "roomChanged": {
    "en": "The room changed. Reload this page to use the new room.",
    "zh": "房間已變更，請重新載入此頁使用新房間。"
  },
  "added": {
    "en": "Song added to My Songs.",
    "zh": "歌曲已加入我的歌單。"
  },
  "ready": {
    "en": "",
    "zh": ""
  },
  "starterHint": {
    "en": "Search public YouTube titles or refresh popular titles. Results are text only; opening a source is a separate choice.",
    "zh": "搜尋 YouTube 公開歌名，或更新熱門歌名。結果只顯示文字，來源連結由你自行選擇開啟。"
  },
  "discoveryTitle": {
    "en": "Find a song title",
    "zh": "在遊戲裡找歌名"
  },
  "discoveryQuery": {
    "en": "Song title or artist",
    "zh": "歌名或歌手"
  },
  "discoveryPlaceholder": {
    "en": "Search a song title or artist…",
    "zh": "搜尋歌名或歌手…"
  },
  "discoverySearch": {
    "en": "Search in game",
    "zh": "在遊戲裡搜尋"
  },
  "discoveryPopular": {
    "en": "Refresh popular titles",
    "zh": "更新熱門歌名"
  },
  "discoveryRegion": {
    "en": "Region",
    "zh": "地區"
  },
  "discoveryTW": {
    "en": "Taiwan",
    "zh": "台灣"
  },
  "discoveryUS": {
    "en": "United States",
    "zh": "美國"
  },
  "discoveryKR": {
    "en": "South Korea",
    "zh": "韓國"
  },
  "discoveryOther": {
    "en": "Other ways to add songs",
    "zh": "其他加入方式"
  },
  "discoveryIdle": {
    "en": "Search a title or load the latest public popular titles.",
    "zh": "搜尋歌名，或取得最新公開熱門歌名。"
  },
  "discoveryLoading": {
    "en": "Finding titles…",
    "zh": "正在找歌名…"
  },
  "discoveryEmpty": {
    "en": "No titles found. Try another song or artist.",
    "zh": "沒有找到歌名，試試其他歌名或歌手。"
  },
  "discoveryChannel": {
    "en": "Channel: {name}",
    "zh": "頻道：{name}"
  },
  "discoveryResults": {
    "en": "YouTube search · {query}",
    "zh": "YouTube 搜尋・{query}"
  },
  "discoveryPopularResults": {
    "en": "Public popular titles · {region}",
    "zh": "公開熱門歌名・{region}"
  },
  "discoveryUpdated": {
    "en": "Updated {time}",
    "zh": "更新時間：{time}"
  },
  "discoveryAdded": {
    "en": "In My Songs",
    "zh": "已在我的歌單"
  },
  "discoveryPlay": {
    "en": "Choose this",
    "zh": "選這個"
  },
  "discovery_setup_needed": {
    "en": "Live song discovery is not available yet. Choose from the playlist below for now.",
    "zh": "即時找歌尚未開放，先從下方歌單選歌。"
  },
  "discovery_rate_limit": {
    "en": "Song discovery is busy. Try again in {n} seconds, or choose a song below.",
    "zh": "即時找歌目前忙碌，約 {n} 秒後再試，或先從下方選歌。"
  },
  "discovery_unavailable": {
    "en": "Live song discovery is temporarily unavailable. Try again or choose a song below.",
    "zh": "即時找歌暫時無法使用，可以再試一次，或先從下方選歌。"
  },
  "discovery_invalid_query": {
    "en": "Enter a song title or artist to search (up to 100 characters).",
    "zh": "請輸入歌名或歌手（最多 100 個字）。"
  },
  "discovery_invalid_region": {
    "en": "Choose Taiwan, the United States, or South Korea.",
    "zh": "請選擇台灣、美國或韓國。"
  },
  "artistName": {
    "en": "Artist (optional)",
    "zh": "歌手（選填）"
  },
  "invalid_artist": {
    "en": "Use an artist name up to 140 characters.",
    "zh": "歌手名稱最多 140 個字。"
  },
  "replaceChoice": {
    "en": "Replace my choice",
    "zh": "換成這個"
  },
  "storyTitle": {
    "en": "Music memory",
    "zh": "歌曲故事"
  },
  "storyHint": {
    "en": "Use the title as a prompt. Tell a memory, a feeling, or why this music matters to you.",
    "zh": "以歌名當提示，聊一段回憶、心情，或這首歌對你的意義。"
  },
  "originalTitle": {
    "en": "Original improvisation",
    "zh": "原創即興"
  },
  "originalHint": {
    "en": "Invent a new short melody or a few words of your own. Share your own creation.",
    "zh": "現場自創一小段全新的旋律或幾句話，分享自己的創作。"
  },
  "rhythmTitle": {
    "en": "Rhythm relay",
    "zh": "節奏接龍"
  },
  "rhythmHint": {
    "en": "Invent a clap or tap pattern. Invite someone to answer with their own pattern.",
    "zh": "自創一段拍手或敲桌節奏，邀請另一位用自己的節奏回應。"
  },
  "life_success": {
    "en": "✓ Story shared +2",
    "zh": "✓ 分享了 +2"
  },
  "life_failed": {
    "en": "Pass",
    "zh": "先跳過"
  },
  "life_newChallenge": {
    "en": "↻ New prompt",
    "zh": "↻ 換一個情境"
  },
  "life_viewChallenge": {
    "en": "View life prompt",
    "zh": "查看人生情境"
  },
  "life_successRule": {
    "en": "Then: {rule}",
    "zh": "接著：{rule}"
  },
  "life_challengeSuccess": {
    "en": "✓ Story shared · +2",
    "zh": "✓ 分享了人生故事・+2"
  },
  "life_challengeFailed": {
    "en": "Passed on the story",
    "zh": "這題先跳過"
  },
  "life_successHint": {
    "en": "Thanks for sharing! Now choose the song that goes with your story and sing a little.",
    "zh": "謝謝分享！現在選一首配得上這段故事的歌，唱一小段。"
  },
  "life_failedHint": {
    "en": "No story this time? You can still choose a song that fits the prompt and sing a little for +1.",
    "zh": "這次不想說故事？還是可以選一首符合情境的歌，唱一小段 +1。"
  },
  "life_scoreHint": {
    "en": "Story +2 · Song +1 · Skip +0",
    "zh": "故事 +2・唱歌 +1・跳過 +0"
  },
  "life_stage": {
    "en": "Your life song",
    "zh": "你的人生之歌"
  },
  "life_chooseSong": {
    "en": "Choose the song that goes with your story.",
    "zh": "選一首配得上你故事的歌。"
  },
  "life_stageEmptyHint": {
    "en": "Search for a song below or add your own, then sing a little of it.",
    "zh": "在下方搜尋或自己新增一首歌，然後唱一小段。"
  },
  "life_challengeFirst": {
    "en": "Listen to the story first. Everyone can look for songs now; choosing opens after the host marks the story.",
    "zh": "先聽故事。大家可以先找歌；主持人按下「分享了」後就能選歌。"
  },
  "life_selectionWait": {
    "en": "{name} is choosing a song for their story, or can skip. Everyone can browse titles.",
    "zh": "{name} 正在為故事選歌，也可以跳過。每個人都能瀏覽歌名。"
  },
  "life_startSinging": {
    "en": "🎤 Start singing",
    "zh": "🎤 開始唱"
  },
  "life_finishSinging": {
    "en": "✓ Done singing · +1",
    "zh": "✓ 唱完了・+1"
  },
  "life_timerRunning": {
    "en": "Sing a little, or tell us why this song fits.",
    "zh": "唱一小段，或說說為什麼選這首。"
  },
  "life_singingDone": {
    "en": "You sang your life song! +1",
    "zh": "唱出了你的人生之歌！+1"
  },
  "lifeChainHint": {
    "en": "Or connect: pick one thing from the last story and start from there.",
    "zh": "或接龍：從上一位的故事挑一個東西，從那裡開始說。"
  },
  "lifeSingTitle": {
    "en": "Sing a little",
    "zh": "唱一小段"
  },
  "lifeSingHint": {
    "en": "Sing the part you remember best. A few lines are enough.",
    "zh": "唱你最記得的那段，幾句就夠了。"
  },
  "lifeWhyTitle": {
    "en": "Why this song?",
    "zh": "為什麼是這首？"
  },
  "lifeWhyHint": {
    "en": "Tell everyone how the song connects to your story.",
    "zh": "說說這首歌和你的故事有什麼關係。"
  },
  "lifeTogetherTitle": {
    "en": "Sing together",
    "zh": "一起唱"
  },
  "lifeTogetherHint": {
    "en": "Invite a partner to join the chorus with you.",
    "zh": "邀一位夥伴陪你一起唱副歌。"
  },
  "modeLabel": {
    "en": "GAME MODE",
    "zh": "遊戲模式"
  },
  "modeLife": {
    "en": "🎵 Life Song",
    "zh": "🎵 人生之歌"
  },
  "modeMission": {
    "en": "🎯 Mission Rescue",
    "zh": "🎯 任務救場"
  },
  "modeLifeHint": {
    "en": "A life prompt, a real moment, then the song it reminds you of.",
    "zh": "人生情境 → 說一段真實回憶 → 想到哪首歌就唱。"
  },
  "modeMissionHint": {
    "en": "A short social challenge, then a story or original activity.",
    "zh": "一個小小社交挑戰，再分享故事或原創互動。"
  },
  "modeNextTurn": {
    "en": "The new mode starts with the next player.",
    "zh": "新模式會從下一位開始。"
  },
  "invalid_mode": {
    "en": "Choose Life Song or Mission Rescue.",
    "zh": "請選擇人生之歌或任務救場。"
  }
};
  if (global.I18N) global.I18N.registerDict('openmic', dict);
  var fallbackCategories = [
    ['for-you', 'For You', '為你精選'], ['original', 'Original prompts', '原創互動'], ['my-songs', 'My Songs', '我的歌單'],
    ['english-pop', 'English Pop', '英文流行'], ['k-pop', 'K-Pop', '韓國流行'],
    ['mandarin', 'Mandarin', '華語歌曲'], ['everyone-knows', 'Everyone Knows', '大家都熟'],
    ['hype', 'Hype', '一起嗨'], ['chill', 'Chill', '輕鬆聊']
  ].map(function (entry) { return { id: entry[0], label: { en: entry[1], zh: entry[2] } }; });
  function t(key, vars) {
    var value = global.I18N ? global.I18N.t('openmic', key) : ((dict[key] || {}).en || key);
    Object.keys(vars || {}).forEach(function (name) { value = value.split('{' + name + '}').join(String(vars[name])); });
    return value;
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function values(value) { return Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {}).filter(Boolean); }
  function lang() { return global.I18N && global.I18N.lang === 'zh' ? 'zh' : 'en'; }
  function text(value) { return typeof value === 'object' && value ? value[lang()] || value.en || value.zh || '' : String(value || ''); }
  function challengeText(value) { return typeof value === 'object' && value ? value.en || text(value) : String(value || ''); }
  function validVideo(id) { var value = String(id || ''); return value.length === 11 && /^[A-Za-z0-9_-]{11}$/.test(value); }
  function youtube(id) { return validVideo(id) && String(id).slice(0, 5) !== 'omtxt' ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) : ''; }
  class Game {

    constructor(element, options) {
      options = options || {};
      this.element = element; this.actor = Number(options.actor) || 0;
      this.send = options.send || function () { return Promise.resolve(); };
      this.now = options.now || Date.now; this.canControl = options.canControl || function () { return true; };
      this.category = 'for-you'; this.query = ''; this.data = null; this.destroyed = false;
      this.pending = false; this.replyId = null; this.error = ''; this.notice = ''; this.language = lang();
      this.discoverySongs = []; this.discoveryQuery = ''; this.discoveryRegion = 'TW'; this.discoveryMode = 'popular';
      this.discoveryGeneration = 0; this.discoveryAbort = null; this.discoveryBusy = false;
      this.discoveryStatus = { key: 'discoveryIdle' }; this.discoveryFetchedAt = null;
      this.discoveryResultQuery = ''; this.discoveryResultRegion = 'TW'; this.discoveryStarted = false;
      this.build();
      this.onClick = this.handleClick.bind(this); this.onInput = this.handleInput.bind(this); this.onSubmit = this.handleSubmit.bind(this);
      element.addEventListener('click', this.onClick); element.addEventListener('input', this.onInput); element.addEventListener('submit', this.onSubmit);
      if (global.I18N) global.I18N.onChange(() => { if (!this.destroyed) { this.language = lang(); this.render(); } });
      this.timer = setInterval(() => this.paint(), 250);
    }
    build() {
      this.element.classList.add('om-app');
      this.element.innerHTML = '<div class="om-grid"><div class="om-left"><section class="om-panel om-challenge" data-om-challenge></section><section class="om-panel om-score-panel" data-om-score></section></div><div class="om-right"><section class="om-panel om-stage"><div class="om-stage-top"><h2 data-om-stage-title></h2><span class="om-duration" data-om-duration></span></div><div class="om-text-stage" data-om-stage-info></div><div class="om-stage-bottom om-stage-session"><div data-om-stage-timer></div><div data-om-stage-controls></div></div></section><section class="om-panel om-browser"><div class="om-panel-head"><h2 data-om-library-title></h2><button type="button" class="om-button" data-om-action="addOpen"></button></div><section class="om-discovery"><h3 data-om-discovery-title></h3><p class="om-soft" data-om-starter-hint></p><form class="om-discovery-form" data-om-discovery-form><label class="om-field om-discovery-query"><span data-om-discovery-query-label></span><input type="search" name="discoveryQuery" class="om-search" data-om-discovery-query maxlength="100" autocomplete="off"></label><label class="om-field om-discovery-region"><span data-om-discovery-region-label></span><select name="discoveryRegion" data-om-discovery-region><option value="TW" data-om-region-tw></option><option value="US" data-om-region-us></option><option value="KR" data-om-region-kr></option></select></label><button type="submit" class="om-button om-primary" data-om-discovery-search></button><button type="button" class="om-button" data-om-action="discoveryPopular"></button></form><p class="om-feedback" data-om-discovery-status role="status"></p><p class="om-soft" data-om-discovery-meta></p><div class="om-song-list om-discovery-results" data-om-discovery-results></div></section><div class="om-tabs" data-om-tabs role="tablist" aria-label="Title categories"></div><input type="search" class="om-search" data-om-search autocomplete="off"><p class="om-owner" data-om-owner></p><div class="om-song-list" data-om-songs></div></section></div></div><p class="om-feedback" data-om-feedback role="status"></p><dialog class="om-modal" data-om-modal="add"><header><h2 data-om-add-title></h2><button type="button" class="om-button" data-om-action="closeAdd"></button></header><form class="om-form" data-om-add-form><label class="om-field"><span data-om-title-label></span><input name="title" maxlength="140" required autocomplete="off"></label><label class="om-field"><span data-om-artist-label></span><input name="artist" maxlength="140" autocomplete="off"></label><p class="om-soft" data-om-add-hint></p><p class="om-form-error" data-om-form-error role="alert"></p><button type="submit" class="om-button om-primary" data-om-add-submit></button></form></dialog><dialog class="om-modal" data-om-modal="duet"><header><h2 data-om-duet-title></h2><button type="button" class="om-button" data-om-action="closeDuet"></button></header><p class="om-soft" data-om-duet-hint></p><div class="om-duet-list" data-om-duets></div></dialog>';
      this.addDialog = this.find('[data-om-modal="add"]'); this.duetDialog = this.find('[data-om-modal="duet"]');
      this.renderLabels();
    }
    update(payload) {
      if (this.destroyed || !payload) return;
      var data = payload.openmic || (payload.version && payload.roster ? payload : null);
      if (!data) return;
      var prevSession = this.data && this.data.sessionId; this.data = data;
      if (prevSession && prevSession !== data.sessionId) { this.category = 'for-you'; this.error = ''; this.notice = ''; this.close(this.addDialog); this.close(this.duetDialog); this.resetDiscovery(); }
      if (data.reply && data.reply.id !== this.replyId) {
        this.replyId = data.reply.id; this.error = data.reply.error ? t(dict[data.reply.error] ? data.reply.error : 'error') : '';
        this.setText('[data-om-form-error]', this.error);
      }
      this.render();
    }
    renderLabels() {
      var labels = { '[data-om-stage-title]': 'stage', '[data-om-library-title]': 'library', '[data-om-action="addOpen"]': 'addOwn', '[data-om-action="closeAdd"]': 'close', '[data-om-action="closeDuet"]': 'close', '[data-om-add-title]': 'addTitle', '[data-om-title-label]': 'songTitle', '[data-om-artist-label]': 'artistName', '[data-om-add-hint]': 'addHint', '[data-om-add-submit]': 'add', '[data-om-duet-title]': 'duetTitle', '[data-om-duet-hint]': 'duetHint', '[data-om-starter-hint]': 'starterHint', '[data-om-discovery-title]': 'discoveryTitle', '[data-om-discovery-query-label]': 'discoveryQuery', '[data-om-discovery-region-label]': 'discoveryRegion', '[data-om-discovery-search]': 'discoverySearch', '[data-om-action="discoveryPopular"]': 'discoveryPopular', '[data-om-region-tw]': 'discoveryTW', '[data-om-region-us]': 'discoveryUS', '[data-om-region-kr]': 'discoveryKR' };
      Object.keys(labels).forEach(selector => this.setText(selector, t(labels[selector])));
      this.find('[data-om-search]').placeholder = t('search'); this.find('[data-om-search]').setAttribute('aria-label', t('search'));
      this.find('[data-om-add-form] input[name="title"]').placeholder = t('titlePlaceholder');
      this.find('[data-om-discovery-query]').placeholder = t('discoveryPlaceholder');
      this.renderDiscovery();
    }
    life() { return !!this.data && this.data.mode === 'life'; }
    // Mode-specific copy: Life Song uses its own wording where one exists.
    lt(key, vars) { return t(this.life() && dict['life_' + key] ? 'life_' + key : key, vars); }
    renderStage() {
      var data = this.data, song = data.selectedSong, host = this.host(), manager = this.manager();
      var controller = host || (this.actor === Number(data.spotlight) && this.roster().some(player => Number(player.playerNum) === this.actor && player.active !== false));
      var after = data.phase !== 'stopped' && !!data.challengeResult, finished = data.phase === 'finished';
      this.setText('[data-om-duration]', t('duration', { n: Number(data.duration) || 35 }));
      this.setText('[data-om-stage-title]', this.lt('stage'));
      var info = song ? '<div class="om-stage-track"><h3>' + esc(song.title) + '</h3><p>' + esc(song.artist || '') + '</p></div>' : '<div class="om-empty-stage"><span aria-hidden="true">♪</span><h3>' + esc(this.lt('chooseSong')) + '</h3><p class="om-soft">' + esc(this.lt('stageEmptyHint')) + '</p></div>';
      var suggested = this.life() ? (data.duet ? 'lifeTogether' : 'lifeSing') : song && song.videoId === 'omtxt000001' ? 'original' : song && song.videoId === 'omtxt000002' ? 'rhythm' : 'story';
      var cards = this.life() ? ['lifeSing', 'lifeWhy', 'lifeTogether'] : ['story', 'original', 'rhythm'];
      info += '<div class="om-activity-cards">' + cards.map(mode => '<article class="om-activity-card' + (mode === suggested ? ' om-activity-selected' : '') + '"><h3>' + esc(t(mode + 'Title')) + '</h3><p>' + esc(t(mode + 'Hint')) + '</p></article>').join('') + '</div>';
      if (data.duet) info += '<p class="om-stage-hint om-soft">👥 ' + esc(t('duetWith', { name: this.name(data.duet) })) + '</p>';
      this.set('[data-om-stage-info]', info);
      var canChange = !!song && this.canSelectDiscovery();
      this.set('[data-om-stage-timer]', data.singingState === 'singing' ? '<div class="om-timer-line"><strong class="om-timer" data-om-timer aria-live="off"></strong><p class="om-timer-label" data-om-timer-label></p></div><div class="om-progress" aria-hidden="true"><span data-om-progress></span></div>' : '');
      var buttons = '', showActions = after && (controller || manager) && (!finished || !!song || manager);
      if (showActions) buttons += '<div class="om-actions">';
      if (after && !finished && controller) buttons += data.singingState === 'singing' ? this.button('finishSinging', this.lt('finishSinging'), 'om-success') : this.button('startSinging', this.lt('startSinging'), 'om-primary', '', !!song);
      if (after && controller && song && ['choice', 'singing', 'finished'].indexOf(data.phase) >= 0) buttons += this.button('changeSong', t('changeSong'), '', '', canChange) + this.button('clearSong', t('clearSong'), '', '', canChange);
      if (after && !finished && controller) buttons += this.button('duetOpen', t('inviteDuet')) + this.button('skip', t('skip'), 'om-skip');
      if (manager && after) buttons += this.button('next', t('next'), finished ? 'om-primary' : '');
      if (showActions) buttons += '</div>';
      if (data.phase === 'stopped') buttons += '<p class="om-waiting">' + esc(t('gameStopped')) + '</p>';
      else if (!after) buttons += '<p class="om-waiting">' + esc(this.lt('challengeFirst')) + '</p>';
      else if (finished) buttons += '<p class="om-waiting">' + esc(data.singingAwarded ? this.lt('singingDone') : t('singingSkipped')) + ' ' + esc(t('finishedPlaybackHint')) + '</p>';
      else if (!controller) buttons += '<p class="om-waiting">' + esc(this.lt('selectionWait', { name: this.name(data.spotlight) })) + '</p>';
      else if (song) buttons += '<p class="om-waiting">' + esc(t(data.phase === 'singing' ? 'changeSongHint' : 'songControlsHint')) + '</p>';
      this.set('[data-om-stage-controls]', buttons);
    }
    sourceLink(song) {
      var url = song && youtube(song.videoId);
      return url ? '<a class="back om-source-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' + esc(t('youtubeLink')) + '</a>' : '';
    }
    renderSongs() {
      if (!this.data) return;
      var categories = this.categories(), selected = this.data.selectedSong, favorites = this.favorites();
      var categoryName = id => { var c = categories.find(c => c.id === id); return c ? text(c.label) : id; };
      this.set('[data-om-tabs]', categories.map(c => '<button type="button" role="tab" aria-selected="' + (this.category === c.id) + '" class="om-tab ' + (this.category === c.id ? 'om-active' : '') + '" data-om-category="' + esc(c.id) + '">' + esc(text(c.label)) + '</button>').join(''));
      this.setText('[data-om-owner]', t('ownerSongs', { name: this.name(this.owner()) }));
      var library = this.library(), q = this.query.trim().toLowerCase();
      if (this.category === 'my-songs') library = library.filter(s => favorites.indexOf(String(s.videoId)) >= 0);
      else if (this.category !== 'for-you') library = library.filter(s => values(s.tags).concat(values(s.categories)).indexOf(this.category) >= 0);
      else library.sort((a, b) => (values(b.tags).indexOf('for-you') >= 0 ? 1 : 0) - (values(a.tags).indexOf('for-you') >= 0 ? 1 : 0));
      if (q) library = library.filter(s => (s.title + ' ' + (s.artist || '') + ' ' + values(s.tags).map(categoryName).join(' ')).toLowerCase().indexOf(q) >= 0);
      var allowed = this.canSelectDiscovery(), canSave = this.canControl() && this.owner() > 0;
      this.set('[data-om-songs]', library.length ? library.map(song => {
        var saved = favorites.indexOf(String(song.videoId)) >= 0, current = selected && selected.videoId === song.videoId;
        var tags = values(song.tags).filter(tag => tag !== 'for-you').slice(0, 3);
        return '<article class="om-song om-text-song' + (current ? ' om-selected' : '') + '"><div class="om-song-info"><h3>' + esc(song.title) + '</h3><p class="om-artist">' + esc(song.artist || '') + '</p><div class="om-tags">' + tags.map(tag => '<span class="om-tag">' + esc(categoryName(tag)) + '</span>').join('') + '</div><div class="om-actions">' + this.button('selectSong', t(current ? 'selected' : selected ? 'replaceChoice' : 'discoveryPlay'), current ? '' : 'om-primary', ' data-video="' + esc(song.videoId) + '"', allowed && !current) + this.button('toggleFavorite', t(saved ? 'unsaveSong' : 'saveSong'), '', ' data-video="' + esc(song.videoId) + '" aria-pressed="' + saved + '"', canSave) + '</div>' + this.sourceLink(song) + '</div></article>';
      }).join('') : '<p class="om-empty">' + esc(t(q ? 'noSearch' : 'noSongs')) + '</p>');
      this.find('[data-om-action="addOpen"]').disabled = !canSave || this.pending;
    }
    renderDiscovery() {
      if (this.destroyed) return;
      var status = this.discoveryStatus;
      this.setText('[data-om-discovery-status]', status ? t(status.key, status.vars) : '');
      var statusNode = this.find('[data-om-discovery-status]'); if (statusNode) statusNode.classList.toggle('om-error', !!(status && status.error));
      var songs = this.discoverySongs || [], favorites = this.favorites(), canAdd = this.canControl() && this.owner() > 0 && !this.pending;
      var canSelect = this.canSelectDiscovery(), selected = this.data && this.data.selectedSong;
      var region = this.discoveryResultRegion || this.discoveryRegion || 'TW';
      var regionName = t(region === 'US' ? 'discoveryUS' : region === 'KR' ? 'discoveryKR' : 'discoveryTW');
      var meta = songs.length || this.discoveryFetchedAt ? t(this.discoveryMode === 'search' ? 'discoveryResults' : 'discoveryPopularResults', { query: this.discoveryResultQuery || '', region: regionName }) : '';
      if (this.discoveryFetchedAt && Number.isFinite(Date.parse(this.discoveryFetchedAt))) meta += ' · ' + t('discoveryUpdated', { time: new Date(this.discoveryFetchedAt).toLocaleString(lang() === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
      this.setText('[data-om-discovery-meta]', meta);
      this.set('[data-om-discovery-results]', songs.filter(song => validVideo(song.videoId)).map(song => {
        var saved = favorites.indexOf(song.videoId) >= 0, current = selected && selected.videoId === song.videoId;
        return '<article class="om-song om-discovery-song om-text-song' + (current ? ' om-selected' : '') + '"><div class="om-song-info"><h3>' + esc(song.title) + '</h3><p class="om-artist">' + esc(t('discoveryChannel', { name: song.channelTitle || 'YouTube' })) + '</p><div class="om-actions">' + this.button('discoverySelect', t(current ? 'selected' : selected ? 'replaceChoice' : 'discoveryPlay'), current ? '' : 'om-primary', ' data-video="' + esc(song.videoId) + '"', canSelect && !current) + this.button('discoveryAdd', t(saved ? 'discoveryAdded' : 'add'), '', ' data-video="' + esc(song.videoId) + '"', canAdd && !saved) + '</div>' + this.sourceLink(song) + '</div></article>';
      }).join(''));
      var form = this.find('[data-om-discovery-form]'); if (form) form.setAttribute('aria-busy', String(!!this.discoveryBusy));
    }
    async selectStageSong(song) {
      if (!song || !validVideo(song.videoId) || typeof song.title !== 'string' || !song.title.trim() || !this.canSelectDiscovery() || this.data.selectedSong && this.data.selectedSong.videoId === song.videoId) return;
      var title = song.title.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
      if (!title) return;
      return this.action('selectSong', { videoId: song.videoId, title: title });
    }
    showSongBrowser() {
      var browser = this.find('.om-browser'); if (browser && typeof browser.scrollIntoView === 'function') browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    changeStageSong() {
      if (!this.canSelectDiscovery() || !this.data.selectedSong) return;
      this.showSongBrowser(); var query = this.find('[data-om-search]'); if (query && typeof query.focus === 'function') query.focus({ preventScroll: true });
    }
    clearStageSong() {
      if (!this.canSelectDiscovery() || !this.data.selectedSong) return;
      return this.action('clearSong');
    }
    close(dialog) {
      if (dialog && dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
    }
    handleInput(event) {
      if (event.target.matches('[data-om-search]')) { this.query = event.target.value; this.renderSongs(); }
      if (event.target.matches('[data-om-discovery-query]')) {
        this.discoveryQuery = event.target.value; this.discoveryStarted = true; this.cancelDiscovery(); this.discoverySongs = []; this.discoveryFetchedAt = null;
        this.discoveryStatus = { key: 'discoveryIdle' }; this.renderDiscovery();
      }
      if (event.target.matches('[data-om-discovery-region]')) {
        this.discoveryRegion = event.target.value; this.discoveryStarted = true; this.cancelDiscovery(); this.discoverySongs = []; this.discoveryFetchedAt = null;
        this.discoveryStatus = { key: 'discoveryIdle' }; this.renderDiscovery();
      }
    }
    handleClick(event) {
      var category = event.target.closest('[data-om-category]');
      if (category && this.element.contains(category)) { this.category = category.dataset.omCategory; this.renderSongs(); return; }
      var target = event.target.closest('[data-om-action]');
      if (!target || !this.element.contains(target) || target.disabled) return;
      var action = target.dataset.omAction;
      if (action === 'discoveryPopular') { this.discoveryStarted = true; this.requestDiscovery('popular'); return; }
      if (action === 'discoveryAdd') { this.addDiscoverySong(target.dataset.video); return; }
      if (action === 'discoverySelect') { this.selectDiscoverySong(target.dataset.video); return; }
      if (action === 'changeSong') { this.changeStageSong(); return; }
      if (action === 'clearSong') { this.clearStageSong(); return; }
      if (action === 'addOpen') { if (!this.canControl() || this.pending || this.owner() < 1) return; this.setText('[data-om-form-error]', ''); this.show(this.addDialog); return; }
      if (action === 'closeAdd') { this.close(this.addDialog); return; }
      if (action === 'duetOpen') { if (!this.controller() || !this.canControl() || this.pending) return; this.renderDuets(); this.show(this.duetDialog); return; }
      if (action === 'closeDuet') { this.close(this.duetDialog); return; }
      if (action === 'selectSong') { this.selectStageSong(this.library().find(song => song.videoId === target.dataset.video)); return; }
      if (action === 'toggleFavorite') { this.action(action, { videoId: target.dataset.video }); return; }
      if (action === 'inviteDuet') { this.action(action, { playerNum: target.dataset.player ? Number(target.dataset.player) : null }).then(ok => { if (ok) this.close(this.duetDialog); }); return; }
      if (action === 'exclude') { this.action(action, { playerNum: Number(target.dataset.player), active: target.dataset.active === 'true' }); return; }
      if (action === 'setMode') { if (target.dataset.mode !== (this.life() ? 'life' : 'mission')) this.action(action, { mode: target.dataset.mode }); return; }
      if (['recover', 'success', 'failed', 'newChallenge', 'startSinging', 'finishSinging', 'skip', 'next', 'stop', 'restart'].indexOf(action) >= 0) this.action(action);
    }
    async handleSubmit(event) {
      if (event.target.matches('[data-om-discovery-form]')) {
        event.preventDefault(); this.discoveryStarted = true; this.discoveryQuery = event.target.elements.discoveryQuery.value; this.discoveryRegion = event.target.elements.discoveryRegion.value;
        this.requestDiscovery('search', this.discoveryQuery); return;
      }
      if (!event.target.matches('[data-om-add-form]')) return;
      event.preventDefault();
      if (!this.data || !this.canControl() || this.pending || this.owner() < 1) return;
      var title = event.target.elements.title.value.trim(), artist = event.target.elements.artist.value.trim();
      var invalid = value => value.length > 140 || /[\u0000-\u001f\u007f]/.test(value);
      if (!title || invalid(title)) { this.setText('[data-om-form-error]', t('invalid_title')); return; }
      if (invalid(artist)) { this.setText('[data-om-form-error]', t('invalid_artist')); return; }
      var context = this.discoveryContext();
      var ok = await this.action('addSong', { title: title, artist: artist });
      if (!ok || this.error || !this.sameDiscoveryContext(context, true)) return;
      this.category = 'my-songs'; this.query = ''; this.find('[data-om-search]').value = ''; event.target.reset(); this.close(this.addDialog); this.notice = t('added'); this.render();
    }
    destroy() {
      this.destroyed = true; clearInterval(this.timer);
      this.element.removeEventListener('click', this.onClick); this.element.removeEventListener('input', this.onInput); this.element.removeEventListener('submit', this.onSubmit);
      this.close(this.addDialog); this.close(this.duetDialog); this.cancelDiscovery(); this.discoverySongs = [];
      this.element.innerHTML = ''; this.data = null;
    }

    find(selector) { return this.element.querySelector(selector); }
    set(selector, html) { var el = this.find(selector); if (el) el.innerHTML = html; }
    setText(selector, value) { var el = this.find(selector); if (el) el.textContent = value; }
    roster() { return values(this.data && this.data.roster); }
    name(num) { var p = this.roster().find(p => Number(p.playerNum) === Number(num)); return p && p.name || t('player', { n: num }); }
    owner() { return this.actor || Number(this.data && this.data.spotlight) || 0; }
    controller() { return !this.actor || Number(this.data && this.data.spotlight) === this.actor; }
    host() { return !this.actor; }
    manager() { return this.host() || this.data?.sharedControls === true && this.roster().some(p => Number(p.playerNum) === this.actor && p.active !== false); }
    favorites() { return values(this.data && this.data.mySongs && this.data.mySongs[this.owner()]).map(String); }
    library() { return values(this.data && this.data.songLibrary).filter(s => validVideo(s.videoId)); }
    categories() { return global.OPEN_MIC_CONTENT && global.OPEN_MIC_CONTENT.categories || fallbackCategories; }
    button(action, label, css, extra, allowed) {
      var disabled = allowed === false || this.pending || !this.canControl();
      return '<button type="button" class="om-button ' + (css || '') + '" data-om-action="' + action + '"' + (extra || '') + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
    }
    render() {
      if (this.destroyed) return;
      this.renderLabels();
      if (!this.data) return;
      var data = this.data, challenge = data.challenge || {}, controller = this.controller(), host = this.host(), manager = this.manager();
      var result = data.challengeResult, after = data.phase !== 'stopped' && !!result, finished = data.phase === 'finished';
      var personName = this.name(data.spotlight), avatar = Array.from(personName.trim())[0] || '♪';
      var controls = '';
      if (manager && data.phase === 'challenge') controls = '<div class="om-challenge-controls om-actions">' + this.button('success', this.lt('success'), 'om-success') + this.button('failed', this.lt('failed'), 'om-fail') + this.button('newChallenge', this.lt('newChallenge')) + '</div>';
      var chain = this.life() && Number(data.round) > 1 && data.phase === 'challenge' ? '<p class="om-chain-hint">🔗 ' + esc(t('lifeChainHint')) + '</p>' : '';
      var disclosure = this.find('[data-om-challenge-details]');
      var disclosureKey = [data.sessionId, data.round, challenge.id, data.phase === 'challenge' ? 'challenge' : 'result'].join(':');
      var disclosureOpen = this.challengeDisclosureKey === disclosureKey && disclosure ? disclosure.open : data.phase === 'challenge';
      this.challengeDisclosureKey = disclosureKey;
      this.set('[data-om-challenge]', '<div class="om-challenge-meta"><div class="om-spotlight"><span class="om-avatar" aria-hidden="true">' + esc(avatar) + '</span><div><p class="om-kicker">' + esc(t('spotlight')) + '</p><h2>' + esc(personName) + (this.actor === Number(data.spotlight) ? '<span class="om-you">' + esc(t('you')) + '</span>' : '') + '</h2></div></div><span class="om-round">' + esc(t('round', { n: data.round || 1 })) + '</span></div><details class="om-challenge-details" data-om-challenge-details' + (disclosureOpen ? ' open' : '') + '><summary><span>' + esc(this.lt('viewChallenge')) + '</span><strong>' + esc(challengeText(challenge.title)) + '</strong></summary><div class="om-challenge-body"><p class="om-situation">' + esc(challengeText(challenge.situation)) + '</p><div class="om-task">' + esc(challengeText(challenge.challenge)) + '</div><p class="om-success-rule">' + esc(this.lt('successRule', { rule: challengeText(challenge.successRule) })) + '</p>' + chain + '</div></details>' + controls + (after ? '<div class="om-result ' + (result === 'failed' ? 'om-result-failed' : '') + '" role="status"><strong>' + esc(this.lt(result === 'success' ? 'challengeSuccess' : 'challengeFailed')) + '</strong><p>' + esc(this.lt(result === 'success' ? 'successHint' : 'failedHint')) + '</p></div>' : ''));
      var roster = this.roster(), active = roster.filter(p => p.active !== false), current = active.findIndex(p => Number(p.playerNum) === Number(data.spotlight));
      var ordered = current >= 0 ? active.slice(current).concat(active.slice(0, current)) : active;
      var queue = ordered.concat(roster.filter(p => p.active === false)).map(p => '<li class="' + (Number(p.playerNum) === Number(data.spotlight) ? 'om-current' : p.active === false ? 'om-inactive' : '') + '">' + (Number(p.playerNum) === Number(data.spotlight) ? '<span class="om-dot" aria-hidden="true"></span>' : '') + esc(p.name || t('player', { n: p.playerNum })) + (p.active === false ? ' · ' + esc(t('sittingOut')) : '') + '</li>').join('');
      var manage = manager ? '<details class="om-manage"><summary>' + esc(t('manage')) + '</summary><div class="om-roster">' + roster.map(p => '<div class="om-roster-row"><span>' + esc(p.name || t('player', { n: p.playerNum })) + '</span>' + this.button('exclude', t(p.active === false ? 'rejoin' : 'sitOut'), '', ' data-player="' + Number(p.playerNum) + '" data-active="' + (p.active === false ? 'true' : 'false') + '"') + '</div>').join('') + '</div></details>' : '';
      if (data.sharedControls === true && manager) manage += '<details class="om-manage"><summary>' + esc(t('restartGame')) + '</summary><div class="om-actions">' + this.button('restart', t('restartGame')) + (data.phase !== 'stopped' ? this.button('stop', t('stopGame')) : '') + '</div></details>';
      var modeNow = this.life() ? 'life' : 'mission';
      var modeRow = '<div class="om-mode"><p class="om-kicker">' + esc(t('modeLabel')) + '</p>' + (manager && data.phase !== 'stopped'
        ? '<div class="om-mode-switch" role="group" aria-label="' + esc(t('modeLabel')) + '">' + ['life', 'mission'].map(mode => this.button('setMode', t(mode === 'life' ? 'modeLife' : 'modeMission'), mode === modeNow ? 'om-mode-on' : '', ' data-mode="' + mode + '" aria-pressed="' + (mode === modeNow) + '"')).join('') + '</div>'
        : '<p class="om-mode-current">' + esc(t(modeNow === 'life' ? 'modeLife' : 'modeMission')) + '</p>') + '<p class="om-soft om-mode-hint">' + esc(t(modeNow === 'life' ? 'modeLifeHint' : 'modeMissionHint')) + (manager && data.phase !== 'challenge' && data.phase !== 'stopped' ? ' ' + esc(t('modeNextTurn')) : '') + '</p></div>';
      manage = modeRow + manage;
      var manageEl = this.find('.om-manage'), manageOpen = manageEl && manageEl.open;
      this.set('[data-om-score]', '<div class="om-score-row"><div><p class="om-kicker">' + esc(t('teamScore')) + '</p><p class="om-score-rules">' + esc(this.lt('scoreHint')) + '</p></div><strong class="om-score-number" aria-label="' + esc(t('teamScore')) + '">' + Number(data.teamScore || 0) + '</strong></div><div class="om-queue"><p class="om-kicker">' + esc(t('queue')) + '</p><ol class="om-queue-list">' + queue + '</ol></div>' + manage);
      if (data.sharedControls === true) {
        this.set('[data-om-score]', this.find('[data-om-score]').innerHTML + '<div class="om-actions">' + this.button('recover', t('recover')) + (!manager ? this.button('exclude', t('rejoin'), '', ' data-player="' + this.actor + '" data-active="true"') : '') + '</div>');
      }
      if (manageOpen && this.find('.om-manage')) this.find('.om-manage').open = true;
      this.renderStage();
      this.renderSongs();
      if (this.duetDialog.open) this.renderDuets();
      this.setText('[data-om-feedback]', this.error || this.notice);
      this.find('[data-om-feedback]').classList.toggle('om-error', !!this.error);
      this.paint();
      if (!this.discoveryStarted) { this.discoveryStarted = true; this.requestDiscovery('popular'); }
    }
    renderDuets() {
      if (!this.data) return;
      var players = this.roster().filter(p => p.active !== false && Number(p.playerNum) !== Number(this.data.spotlight));
      this.set('[data-om-duets]', '<div style="height:12px"></div>' + this.button('inviteDuet', t('duetNone'), '', ' data-player=""', this.controller()) + players.map(p => this.button('inviteDuet', p.name || t('player', { n: p.playerNum }), Number(this.data.duet) === Number(p.playerNum) ? 'om-primary' : '', ' data-player="' + Number(p.playerNum) + '"', this.controller())).join('') + (!players.length ? '<p class="om-soft">' + esc(t('noDuet')) + '</p>' : ''));
    }
    cancelDiscovery() {
      this.discoveryGeneration = (this.discoveryGeneration || 0) + 1;
      if (this.discoveryAbort) this.discoveryAbort.abort();
      this.discoveryAbort = null; this.discoveryBusy = false;
    }
    resetDiscovery() {
      this.cancelDiscovery(); this.discoverySongs = []; this.discoveryFetchedAt = null;
      this.discoveryStatus = { key: 'discoveryIdle' }; this.discoveryStarted = false;
    }
    discoveryContext() {
      return this.data ? { sessionId: this.data.sessionId, round: this.data.round, actor: this.actor, owner: this.owner() } : null;
    }
    sameDiscoveryContext(context, includeTurn) {
      var current = this.discoveryContext();
      return !this.destroyed && !!context && !!current && context.sessionId === current.sessionId && (!includeTurn || (context.round === current.round && context.actor === current.actor && context.owner === current.owner));
    }
    async requestDiscovery(mode, query) {
      if (this.destroyed || !this.data) return;
      this.discoveryStarted = true;
      mode = mode === 'search' ? 'search' : 'popular';
      query = String(query == null ? this.discoveryQuery || '' : query).trim();
      this.cancelDiscovery();
      this.discoveryMode = mode; this.discoverySongs = []; this.discoveryFetchedAt = null;
      var api = global.OPEN_MIC_DISCOVERY, region = this.discoveryRegion || 'TW';
      if (['TW', 'US', 'KR'].indexOf(region) < 0) { this.discoveryStatus = { key: 'discovery_invalid_region', error: true }; this.renderDiscovery(); return; }
      if (mode === 'search' && (!query || query.length > 100)) { this.discoveryStatus = { key: 'discovery_invalid_query', error: true }; this.renderDiscovery(); return; }
      if (!api) { this.discoveryStatus = { key: 'discovery_setup_needed' }; this.renderDiscovery(); return; }
      var generation = this.discoveryGeneration, context = this.discoveryContext();
      this.discoveryAbort = new AbortController(); this.discoveryBusy = true;
      this.discoveryStatus = { key: 'discoveryLoading' }; this.renderDiscovery();
      try {
        var result = await (mode === 'search' ? api.search(query, { region: region, signal: this.discoveryAbort.signal }) : api.popular({ region: region, signal: this.discoveryAbort.signal }));
        if (generation !== this.discoveryGeneration || !this.sameDiscoveryContext(context)) return;
        var seen = new Set();
        this.discoverySongs = values(result && result.songs).filter(song => {
          if (!song || !validVideo(song.videoId) || typeof song.title !== 'string' || !song.title.trim() || seen.has(song.videoId)) return false;
          seen.add(song.videoId); return true;
        }).slice(0, 40).map(song => ({ videoId: song.videoId, title: song.title.slice(0, 500), channelTitle: typeof song.channelTitle === 'string' ? song.channelTitle.slice(0, 200) : '', publishedAt: song.publishedAt || '' }));
        this.discoveryResultQuery = query; this.discoveryResultRegion = region;
        this.discoveryFetchedAt = result && result.fetchedAt || null;
        this.discoveryStatus = this.discoverySongs.length ? null : { key: 'discoveryEmpty' };
      } catch (failure) {
        if (generation !== this.discoveryGeneration || !this.sameDiscoveryContext(context) || failure && failure.name === 'AbortError') return;
        var code = failure && failure.code;
        this.discoveryStatus = { key: ['discovery_setup_needed', 'discovery_rate_limit', 'discovery_invalid_query', 'discovery_invalid_region'].indexOf(code) >= 0 ? code : 'discovery_unavailable', vars: { n: Math.max(1, Math.ceil(Number(failure && failure.retryAfter) || 60)) }, error: code !== 'discovery_setup_needed' };
      } finally {
        if (!this.destroyed && generation === this.discoveryGeneration && this.sameDiscoveryContext(context)) { this.discoveryBusy = false; this.discoveryAbort = null; this.renderDiscovery(); }
      }
    }
    async addDiscoverySong(videoId) {
      var song = (this.discoverySongs || []).find(song => song.videoId === videoId);
      if (!song || !validVideo(song.videoId) || this.destroyed || this.pending || !this.canControl() || this.owner() < 1) return;
      var context = this.discoveryContext(), generation = this.discoveryGeneration;
      if (!context) return;
      var ok = await this.action('addSong', { title: song.title.trim().slice(0, 120), url: youtube(song.videoId) });
      if (!ok || this.error || !this.sameDiscoveryContext(context, true) || generation !== this.discoveryGeneration) return;
      this.category = 'my-songs'; this.query = ''; this.find('[data-om-search]').value = '';
      this.notice = t('added'); this.render();
    }
    canSelectDiscovery() {
      var data = this.data;
      var spotlight = data && this.roster().find(player => Number(player.playerNum) === this.actor && player.active !== false);
      return !this.destroyed && !!data && this.canControl() && !this.pending && ['choice', 'singing', 'finished'].indexOf(data.phase) >= 0 && !!data.challengeResult && (this.host() || (this.actor === Number(data.spotlight) && !!spotlight));
    }
    selectDiscoverySong(videoId) {
      return this.selectStageSong((this.discoverySongs || []).find(song => song.videoId === videoId));
    }
    paint() {
      if (this.destroyed || !this.data) return;
      var data = this.data, timer = this.find('[data-om-timer]');
      if (timer) {
        var duration = Number(data.duration) || 35;
        var elapsed = data.singingStartedAt == null ? 0 : Math.max(0, (this.now() - Number(data.singingStartedAt)) / 1000);
        var left = Math.max(0, Math.ceil(duration - elapsed));
        timer.textContent = '0:' + String(left).padStart(2, '0');
        timer.classList.toggle('om-zero', left === 0);
        this.setText('[data-om-timer-label]', this.lt(data.singingState === 'finished' ? 'singingDone' : left === 0 ? 'timerZero' : 'timerRunning'));
        this.find('[data-om-progress]').style.width = Math.min(100, Math.max(0, left / duration * 100)) + '%';
      }
      var enabled = this.canControl();
      if (enabled !== this.lastControl) {
        this.lastControl = enabled;
        this.render();
      }
    }
    show(dialog) {
      if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    }
    async action(type, extra) {
      if (['recover', 'success', 'failed', 'newChallenge', 'setMode', 'startSinging', 'finishSinging', 'skip', 'next', 'selectSong', 'clearSong', 'toggleFavorite', 'inviteDuet', 'exclude', 'addSong', 'stop', 'restart'].indexOf(type) < 0) return false;
      if (this.pending || this.destroyed || !this.canControl()) return false;
      this.pending = true; this.error = ''; this.notice = '';
      this.render();
      try {
        var result = await this.send(type, extra || {});
        if (result && result.error) {
          this.error = t(dict[result.error] ? result.error : 'error');
          this.setText('[data-om-form-error]', this.error); return false;
        }
        return true;
      } catch (failure) { this.error = failure && dict[failure.message] ? t(failure.message) : this.error || t('error'); this.setText('[data-om-form-error]', this.error); return false; }
      finally { this.pending = false; if (!this.destroyed) this.render(); }
    }
  }
  return { t: t, esc: esc, Game: Game };
}));
