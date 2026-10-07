(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_UI = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';

  var dict = {
    brandLine: { en: 'ONE CHALLENGE. ONE SONG. YOUR CALL.', zh: '小小挑戰・一首歌・由你決定' },
    subtitle: { en: 'A small challenge. An optional singing moment.', zh: '一個小挑戰，一段想唱就唱的時光。' },
    startTitle: { en: 'Give singing a little excuse.', zh: '給唱歌一個小小的理由。' },
    intro: { en: 'One player takes a short social challenge. Pass for +2, then sing for +1 or simply skip. Miss the challenge? A song can rescue +1.', zh: '一位玩家接受短短的社交挑戰。成功 +2，再選擇唱一段 +1 或直接跳過。挑戰失敗？也能開麥救回 +1。' },
    start: { en: 'Start Open Mic Rescue', zh: '開始開麥救場' },
    noPressure: { en: 'No voice judging. No mandatory performances. Just a shared team score.', zh: '不評唱功、不強迫表演，全隊一起累積分數。' },
    rules: { en: 'How to play', zh: '怎麼玩' },
    rule1: { en: 'The Spotlight player tries the challenge while everyone chats, asks questions, and reacts. The host chooses Success or Failed.', zh: '輪到的玩家接受挑戰，大家自由聊天、提問和反應。主持人最後判定成功或失敗。' },
    rule2: { en: 'Success adds +2 to your team. Singing a short section adds +1 after either result. Skipping is always okay.', zh: '挑戰成功全隊 +2。不論成功或失敗，唱一小段都能再 +1。隨時可以跳過唱歌。' },
    rule3: { en: 'Browse and preview songs, pick one you know, then start the 35-second visual timer. At zero, finish the phrase naturally. The host moves to the next player.', zh: '瀏覽與試聽歌曲，選一首熟悉的歌，再開始 35 秒視覺計時。歸零後自然唱完這一句，由主持人換下一位。' },
    audioHint: { en: 'Sing through your usual call or in the room. YouTube playback stays on each device; share computer audio if you want the group to hear the music.', zh: '透過原本的通話或現場唱歌。YouTube 在各自裝置播放；想讓大家聽到音樂，請分享電腦音訊。' },
    demo: { en: 'Interactive demo · one-device simulation', zh: '操作示範・單機模擬' },
    demoView: { en: 'Switch the demo view', zh: '切換示範視角' }, hostView: { en: 'Host / shared screen', zh: '主持／共同畫面' },
    demoLink: { en: 'Try the interactive demo', zh: '先試操作示範' }, liveLink: { en: 'Use your room', zh: '使用正式房間' },
    setupNeeded: { en: 'Set up your room and players in the hub first.', zh: '先到主選單設定房間與玩家連結。' },
    setUpRoom: { en: 'Set up room & players', zh: '設定房間與玩家' },
    spotlight: { en: 'SPOTLIGHT', zh: '本輪主角' }, you: { en: 'YOU', zh: '是你！' }, round: { en: 'Round {n}', zh: '第 {n} 輪' },
    player: { en: 'Player {n}', zh: '玩家 {n}' }, room: { en: 'Room {code}', zh: '房間 {code}' },
    successRule: { en: 'Success: {rule}', zh: '成功條件：{rule}' },
    challengeSuccess: { en: '✓ Challenge Success · +2', zh: '✓ 挑戰成功・+2' },
    challengeFailed: { en: 'Challenge Failed', zh: '挑戰失敗' },
    successHint: { en: 'You survived! Sing for another +1, invite a duet, or skip.', zh: '過關了！想唱就再拿 +1，也可以邀人合唱或直接跳過。' },
    failedHint: { en: 'Want a little rescue? Sing for +1, bring a duet partner, or simply move on.', zh: '想開麥救場嗎？唱一段救回 +1，也能找人合唱，或直接往下玩。' },
    success: { en: '✓ Success +2', zh: '✓ 成功 +2' }, failed: { en: 'Failed', zh: '失敗' },
    newChallenge: { en: '↻ New Challenge', zh: '↻ 換一個挑戰' }, next: { en: 'Next Player →', zh: '下一位 →' },
    teamScore: { en: 'TEAM SCORE', zh: '全隊分數' }, scoreHint: { en: 'Challenge +2 · Optional song +1 · Skip +0', zh: '挑戰 +2・選唱 +1・跳過 +0' },
    queue: { en: 'TURN QUEUE', zh: '輪流順序' }, manage: { en: 'Manage players', zh: '管理玩家' },
    sitOut: { en: 'Sit out', zh: '先休息' }, rejoin: { en: 'Rejoin', zh: '重新加入' }, sittingOut: { en: 'Sitting out', zh: '休息中' },
    stage: { en: 'The music stage', zh: '音樂舞台' }, duration: { en: '{n}s, at your pace', zh: '{n} 秒，唱完這一句就好' },
    chooseSong: { en: 'Choose a song from the playlist.', zh: '從歌單選一首想唱的歌。' },
    stageEmptyHint: { en: 'Your song, your choice. Preview a few first.', zh: '選你喜歡的歌，也可以先試聽幾首。' },
    challengeFirst: { en: 'Browse while the challenge is happening. Singing opens after the host chooses the result.', zh: '挑戰時也可以先看歌單。主持人判定結果後，就能選歌或跳過。' },
    selectionWait: { en: '{name} can choose a song or skip. Everyone can preview.', zh: '由 {name} 選歌或跳過。每個人都能試聽。' },
    startSinging: { en: '🎤 Start Singing', zh: '🎤 開始唱' }, finishSinging: { en: '✓ Finished singing · +1', zh: '✓ 唱完了・+1' },
    inviteDuet: { en: '👥 Invite Duet', zh: '👥 邀人合唱' }, skip: { en: 'Skip Singing', zh: '跳過唱歌' },
    timerRunning: { en: 'A short section is enough.', zh: '唱一小段就好。' },
    timerZero: { en: 'Finish the phrase naturally. Nothing cuts off.', zh: '自然唱完這一句，音樂不會被切掉。' },
    timerIdle: { en: 'Ready when you are.', zh: '準備好再開始。' },
    singingDone: { en: 'A song for the team! +1', zh: '替全隊唱了一段！+1' },
    singingSkipped: { en: 'Skipped. No pressure.', zh: '已跳過，輕鬆玩就好。' },
    nextHint: { en: 'Chat for a moment. The host chooses when to continue.', zh: '先聊一下，主持人準備好再換下一位。' },
    duetWith: { en: 'Duet with {name}', zh: '與 {name} 合唱' },
    duetTitle: { en: 'Invite someone to share the mic', zh: '找個人一起開麥' },
    duetHint: { en: 'This simply marks your partner. Sing together through your usual call or in the room.', zh: '這裡只會標記合唱夥伴，透過原本的通話或現場一起唱。' },
    duetNone: { en: 'Solo for now', zh: '先自己唱' }, noDuet: { en: 'No other active players right now.', zh: '目前沒有其他參與中的玩家。' },
    library: { en: 'Find your song', zh: '找一首你的歌' }, addOwn: { en: '+ Add Your Own Song', zh: '+ 加入自己的歌' },
    preview: { en: '▶ Preview MV', zh: '▶ 試聽 MV' }, singThis: { en: 'Sing This Song', zh: '就唱這首' },
    selected: { en: 'Selected', zh: '已選取' }, search: { en: 'Search songs or artists…', zh: '搜尋歌名或歌手…' },
    noSongs: { en: 'No songs here yet. Add a song you know or save one with ☆.', zh: '這裡還沒有歌。加入熟悉的歌，或按 ☆ 收藏。' },
    noSearch: { en: 'No songs match your search.', zh: '沒有符合搜尋的歌曲。' },
    ownerSongs: { en: 'My Songs: {name}', zh: '我的歌單：{name}' },
    saveSong: { en: 'Save to My Songs', zh: '收藏到我的歌單' }, unsaveSong: { en: 'Remove from My Songs', zh: '從我的歌單移除' },
    previewHint: { en: 'Just a preview. Closing this won’t select the song.', zh: '這只是試聽。關閉後不會選取這首歌。' },
    youtubeLink: { en: 'Open on YouTube ↗', zh: '到 YouTube 播放 ↗' },
    embedHint: { en: 'If the video cannot play here, open it on YouTube.', zh: '若影片無法嵌入播放，可到 YouTube 開啟。' },
    addTitle: { en: 'Add a song you already know', zh: '加入一首你熟悉的歌' }, songTitle: { en: 'Song title', zh: '歌名' },
    titlePlaceholder: { en: 'Your go-to song', zh: '你最熟悉的歌' }, youtubeURL: { en: 'YouTube URL', zh: 'YouTube 網址' },
    addHint: { en: 'Watch, short, embed, and youtu.be links work. Your song goes straight into My Songs for this session.', zh: '支援一般影片、Shorts、嵌入與 youtu.be 連結。加入後會立刻存進本次遊戲的「我的歌單」。' },
    add: { en: 'Add to My Songs', zh: '加入我的歌單' }, close: { en: 'Close', zh: '關閉' },
    invalid_title: { en: 'Enter a song title (up to 120 characters).', zh: '請輸入歌名（最多 120 個字）。' },
    invalid_url: { en: 'Paste a valid YouTube video link.', zh: '請貼上有效的 YouTube 影片連結。' },
    invalid_song: { en: 'This song is unavailable. Choose another song.', zh: '這首歌目前無法使用，請換一首。' },
    choose_song: { en: 'Choose a song from the playlist first.', zh: '請先從歌單選一首歌。' },
    invalid_time: { en: 'The room clock is updating. Try this action again.', zh: '房間時間正在更新，請再操作一次。' },
    invalid_player: { en: 'Choose an active player.', zh: '請選一位正在參與的玩家。' },
    invalid_duet: { en: 'Choose another active player as your duet partner.', zh: '請選另一位正在參與的玩家合唱。' },
    not_enough_players: { en: 'At least two players must be in the game.', zh: '至少要有兩位玩家參與遊戲。' },
    invalid_roster: { en: 'Set up at least two players in the hub.', zh: '請先到主選單設定至少兩位玩家。' },
    stale_turn: { en: 'The turn changed. Follow the latest screen and try again.', zh: '本輪畫面已更新，請依最新畫面再操作。' },
    forbidden: { en: 'The host or Spotlight player controls this action.', zh: '這個動作由主持人或本輪主角操作。' },
    not_available: { en: 'This action is not available right now. Follow the latest screen.', zh: '這個動作目前無法使用，請依最新畫面操作。' },
    library_full: { en: 'The session song library is full.', zh: '本次遊戲的歌庫已滿。' },
    error: { en: 'Could not sync. Check your connection and try again.', zh: '同步暫時失敗，請檢查連線後再試。' },
    connecting: { en: 'Connecting…', zh: '正在連線…' }, offline: { en: 'Connection lost. Reconnecting…', zh: '連線暫時中斷，正在重新連線…' },
    hostAway: { en: 'Waiting for the host to reconnect. Keep chatting.', zh: '等待主持頁重新連線，先自由聊天。' },
    other_host: { en: 'Another host tab is controlling this room. Close it to continue here.', zh: '另一個主持頁正在控制房間，關閉那頁後可在這裡接續。' },
    switched: { en: 'The room has switched games. Start Open Mic Rescue to play again.', zh: '房間已切換到其他遊戲，按「開始開麥救場」可以再玩。' },
    noFirebase: { en: 'Player pages are unavailable. Check your connection and reload.', zh: '目前無法連線到玩家頁，請檢查網路後重新整理。' },
    roomChanged: { en: 'The room changed. Reload this page to use the new room.', zh: '房間已變更，請重新載入此頁使用新房間。' },
    added: { en: 'Song added to My Songs.', zh: '歌曲已加入我的歌單。' }, ready: { en: '', zh: '' },
    starterHint: { en: 'These are starter picks and songs added in this room. Open YouTube for your current recommendations.', zh: '下方是起始歌單和房間加入的歌曲。想看即時個人推薦，可以開啟 YouTube。' },
    youtubeHome: { en: 'YouTube recommendations ↗', zh: 'YouTube 即時推薦 ↗' },
    youtubeSearch: { en: 'Search YouTube ↗', zh: '到 YouTube 搜尋 ↗' },
    youtubeSearchPlaceholder: { en: 'Find a song or artist on YouTube…', zh: '到 YouTube 找歌名或歌手…' },
    playlistOpen: { en: 'Browse a public playlist', zh: '瀏覽公開播放清單' },
    playlistTitle: { en: 'Your YouTube playlist', zh: '你的 YouTube 播放清單' },
    playlistURL: { en: 'Public or unlisted playlist URL', zh: '公開或不公開的播放清單網址' },
    playlistHint: { en: 'Paste a YouTube playlist, browse it in the player, then add the current song to My Songs. Private playlists may not play.', zh: '貼上 YouTube 播放清單，在播放器裡瀏覽，再把目前的歌加入「我的歌單」。私人播放清單可能無法播放。' },
    playlistLoad: { en: 'Load playlist', zh: '開啟播放清單' },
    playlistCurrent: { en: 'Use current video', zh: '取得目前歌曲' },
    playlistAdd: { en: 'Add current song to My Songs', zh: '把目前歌曲加入我的歌單' },
    playlistSongTitle: { en: 'Song title (you can edit it)', zh: '歌名（可以自行修改）' },
    playlistLoading: { en: 'Loading playlist…', zh: '正在開啟播放清單…' },
    playlistReady: { en: 'Browse with the player’s playlist button. Tap “Use current video” after changing songs.', zh: '用播放器內的清單按鈕選歌。換歌後按「取得目前歌曲」。' },
    playlistFetching: { en: 'Reading the current video…', zh: '正在取得目前歌曲…' },
    playlistNoTitle: { en: 'The video is ready. Enter a song title below to add it.', zh: '影片已準備好，填入下方歌名就能加入。' },
    playlistChanged: { en: 'A different video is playing. Check the title, then tap Add again.', zh: '目前已換成另一支影片，確認歌名後再按加入。' },
    playlistError: { en: 'This playlist could not load here. Open it on YouTube or try another playlist.', zh: '這個播放清單無法在這裡開啟。可以到 YouTube 播放，或换另一個清單。' },
    invalid_playlist: { en: 'Paste a YouTube playlist link containing list=…', zh: '請貼上含有 list=… 的 YouTube 播放清單連結。' },
    playlistWaiting: { en: 'Choose a video in the playlist first.', zh: '請先在播放清單裡選一支影片。' },
    lyrics: { en: 'Lyrics', zh: '歌詞' },
    lyricsEmpty: { en: 'No lyrics have been added for this song yet.', zh: '這首歌還沒有加入歌詞。' },
    lyricsHint: { en: 'Shared lyrics for this session. The host or Spotlight player can paste or update them.', zh: '本次遊戲的共用歌詞，由主持人或本輪主角貼上或更新。' },
    lyricsEdit: { en: 'Paste / edit lyrics', zh: '貼上／編輯歌詞' },
    lyricsRead: { en: 'Expand lyrics', zh: '放大閱讀歌詞' },
    lyricsSearch: { en: 'Find lyrics ↗', zh: '搜尋歌詞 ↗' },
    lyricVideoSearch: { en: 'Find a lyric video ↗', zh: '找有歌詞的影片 ↗' },
    lyricsEditorTitle: { en: 'Lyrics for {title}', zh: '{title} 的歌詞' },
    lyricsEditorHint: { en: 'Paste the lyrics you want the room to read. Only Save shares them. An empty text clears the shared lyrics.', zh: '貼上想讓大家閱讀的歌詞，按儲存才會分享。儲存空白內容會清除共用歌詞。' },
    lyricsPlaceholder: { en: 'Paste lyrics here…', zh: '在這裡貼上歌詞…' },
    lyricsDraft: { en: 'Your unsaved draft stays on this device.', zh: '尚未儲存的草稿會保留在這個裝置。' },
    lyricsSave: { en: 'Save & share lyrics', zh: '儲存並分享歌詞' },
    lyricsSaved: { en: 'Lyrics shared with the room.', zh: '歌詞已分享給房間。' },
    lyricsSavedNewerDraft: { en: 'Lyrics shared. Your newer edits are still an unsaved draft.', zh: '歌詞已分享，剛才新修改的內容仍是尚未儲存的草稿。' },
    lyricsLarger: { en: 'Larger text', zh: '放大字體' }, lyricsSmaller: { en: 'Smaller text', zh: '縮小字體' },
    invalid_lyrics: { en: 'Use plain text lyrics, up to 16,000 characters.', zh: '請使用純文字歌詞，最多 16,000 個字。' }
  };
  if (global.I18N) global.I18N.registerDict('openmic', dict);
  var fallbackCategories = [
    ['for-you', 'For You', '為你精選'], ['my-songs', 'My Songs', '我的歌單'],
    ['english-pop', 'English Pop', '英文流行'], ['k-pop', 'K-Pop', '韓國流行'],
    ['mandarin', 'Mandarin', '華語歌曲'], ['everyone-knows', 'Everyone Knows', '大家都熟'],
    ['hype', 'Hype', '一起嗨'], ['chill', 'Chill', '輕鬆唱']
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
  function validVideo(id) { return /^[A-Za-z0-9_-]{11}$/.test(String(id || '')); }
  function embed(id) { return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?playsinline=1&rel=0&cc_load_policy=1'; }
  function youtube(id) { return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id); }
  function iframe(song) {
    if (!song || !validVideo(song.videoId)) return '';
    return '<iframe src="' + embed(song.videoId) + '" title="' + esc(song.title || 'YouTube') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }
  function parseVideo(url) {
    if (global.OPEN_MIC_ENGINE && global.OPEN_MIC_ENGINE.parseYouTube) return global.OPEN_MIC_ENGINE.parseYouTube(url);
    if (global.OPEN_MIC_YOUTUBE && global.OPEN_MIC_YOUTUBE.parseVideoURL) return global.OPEN_MIC_YOUTUBE.parseVideoURL(url);
    try {
      var u = new URL(String(url).trim());
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      var host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      var id = host === 'youtu.be' ? u.pathname.split('/')[1] : ['youtube.com', 'youtube-nocookie.com'].indexOf(host) >= 0 ? (u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]) : null;
      return validVideo(id) ? id : null;
    } catch (_) { return null; }
  }

  class Game {
    constructor(element, options) {
      options = options || {};
      this.element = element;
      this.actor = Number(options.actor) || 0;
      this.send = options.send || function () { return Promise.resolve(); };
      this.now = options.now || Date.now;
      this.canControl = options.canControl || function () { return true; };
      this.category = 'for-you'; this.query = ''; this.data = null; this.destroyed = false;
      this.previewSong = null; this.pending = false; this.videoKey = null; this.replyId = null;
      this.error = ''; this.notice = ''; this.language = lang();
      this.playlistPlayer = null; this.playlistGeneration = 0; this.playlistBusy = false;
      this.playlistSelected = null; this.playlistTitleDirty = false;
      this.lyricsDrafts = {}; this.lyricsFont = 24; this.lyricsEditVideo = null; this.lyricsEditSession = null; this.lyricsEditGeneration = 0;
      this.build();
      this.onClick = this.handleClick.bind(this);
      this.onInput = this.handleInput.bind(this);
      this.onSubmit = this.handleSubmit.bind(this);
      this.element.addEventListener('click', this.onClick);
      this.element.addEventListener('input', this.onInput);
      this.element.addEventListener('submit', this.onSubmit);
      this.previewDialog.addEventListener('close', () => { this.previewDialog.querySelector('[data-om-preview-video]').innerHTML = ''; this.previewSong = null; });
      this.playlistDialog.addEventListener('close', () => { if (!this.destroyed && !this.playlistDialog.open) this.destroyPlaylist(); });
      this.lyricsEditDialog.addEventListener('close', () => { if (!this.lyricsEditDialog.open) { this.lyricsEditGeneration++; this.lyricsEditVideo = null; this.lyricsEditSession = null; } });
      if (global.I18N) global.I18N.onChange(() => { if (!this.destroyed) { this.language = lang(); this.render(); } });
      this.timer = setInterval(() => this.paint(), 250);
    }
    build() {
      this.element.classList.add('om-app');
      this.element.innerHTML = '<div class="om-grid"><div class="om-left"><section class="om-panel om-challenge" data-om-challenge></section><section class="om-panel om-score-panel" data-om-score></section></div><div class="om-right"><section class="om-panel om-stage"><div class="om-stage-top"><h2 data-om-stage-title></h2><span class="om-duration" data-om-duration></span></div><div class="om-video" data-om-stage-video></div><div class="om-stage-bottom"><div data-om-stage-info></div><div data-om-stage-controls></div></div></section><section class="om-panel om-browser"><div class="om-panel-head"><h2 data-om-library-title></h2><button type="button" class="om-button" data-om-action="addOpen"></button></div><div class="om-tabs" data-om-tabs role="tablist" aria-label="Song categories"></div><input type="search" class="om-search" data-om-search autocomplete="off"><p class="om-owner" data-om-owner></p><div class="om-song-list" data-om-songs></div></section></div></div><p class="om-feedback" data-om-feedback role="status"></p><dialog class="om-modal" data-om-modal="preview"><header><h2 data-om-preview-title></h2><button type="button" class="om-button" data-om-action="closePreview"></button></header><div class="om-video" data-om-preview-video></div><p class="om-soft" data-om-preview-hint></p><p class="om-soft"><a class="back" data-om-preview-link target="_blank" rel="noopener noreferrer"></a></p></dialog><dialog class="om-modal" data-om-modal="add"><header><h2 data-om-add-title></h2><button type="button" class="om-button" data-om-action="closeAdd"></button></header><form class="om-form" data-om-add-form><label class="om-field"><span data-om-title-label></span><input name="title" maxlength="120" required autocomplete="off"></label><label class="om-field"><span data-om-url-label></span><input name="url" type="url" required placeholder="https://youtu.be/…" autocomplete="off" inputmode="url"></label><p class="om-soft" data-om-add-hint></p><p class="om-form-error" data-om-form-error role="alert"></p><button type="submit" class="om-button om-primary" data-om-add-submit></button></form></dialog><dialog class="om-modal" data-om-modal="duet"><header><h2 data-om-duet-title></h2><button type="button" class="om-button" data-om-action="closeDuet"></button></header><p class="om-soft" data-om-duet-hint></p><div class="om-duet-list" data-om-duets></div></dialog>';
      this.previewDialog = this.find('[data-om-modal="preview"]');
      this.addDialog = this.find('[data-om-modal="add"]');
      this.duetDialog = this.find('[data-om-modal="duet"]');
      this.buildExtras();
      this.renderLabels();
    }
    buildExtras() {
      this.find('[data-om-tabs]').insertAdjacentHTML('beforebegin', '<div class="om-online"><p class="om-soft" data-om-starter-hint></p><div class="om-actions"><a class="om-button" href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" data-om-youtube-home></a><button type="button" class="om-button" data-om-action="playlistOpen"></button></div><div class="om-online-search"><input type="search" class="om-search" data-om-online-query autocomplete="off"><a class="om-button" href="https://www.youtube.com/results?search_query=music" target="_blank" rel="noopener noreferrer" data-om-youtube-search></a></div></div>');
      this.find('.om-stage-bottom').insertAdjacentHTML('beforeend', '<section class="om-stage-lyrics" data-om-lyrics-panel hidden><div class="om-panel-head"><h3 data-om-lyrics-label></h3><div class="om-font-controls"><button type="button" class="om-button" data-om-action="lyricsSmaller" aria-label="Smaller text">A−</button><button type="button" class="om-button" data-om-action="lyricsLarger" aria-label="Larger text">A+</button></div></div><p class="om-soft" data-om-lyrics-hint></p><div class="om-lyrics-text" data-om-lyrics-copy tabindex="0"></div><div class="om-actions om-lyrics-actions"><button type="button" class="om-button" data-om-action="lyricsRead"></button><button type="button" class="om-button" data-om-action="lyricsEdit"></button></div><div class="om-lyrics-links"><a class="back" data-om-lyrics-search target="_blank" rel="noopener noreferrer"></a><a class="back" data-om-lyric-video-search target="_blank" rel="noopener noreferrer"></a></div></section>');
      this.element.insertAdjacentHTML('beforeend', '<dialog class="om-modal om-playlist-modal" data-om-modal="playlist"><header><h2 data-om-playlist-title></h2><button type="button" class="om-button" data-om-action="closePlaylist"></button></header><p class="om-soft" data-om-playlist-hint></p><form class="om-form om-playlist-form" data-om-playlist-form><label class="om-field"><span data-om-playlist-url-label></span><input name="playlistUrl" type="url" required placeholder="https://www.youtube.com/playlist?list=…" inputmode="url" autocomplete="off"></label><button type="submit" class="om-button om-primary" data-om-playlist-load></button></form><p class="om-feedback" data-om-playlist-status role="status"></p><div class="om-playlist-player" data-om-playlist-player hidden></div><div class="om-playlist-selection" data-om-playlist-selection hidden><button type="button" class="om-button" data-om-action="playlistCurrent"></button><label class="om-field"><span data-om-playlist-song-label></span><input type="text" data-om-playlist-song-title maxlength="120" autocomplete="off"></label><p class="om-soft" data-om-playlist-current-title></p><a class="back" data-om-playlist-video-link target="_blank" rel="noopener noreferrer" hidden></a><button type="button" class="om-button om-primary" data-om-action="playlistAdd"></button></div></dialog><dialog class="om-modal om-lyrics-editor" data-om-modal="lyricsEdit"><header><h2 data-om-lyrics-editor-title></h2><button type="button" class="om-button" data-om-action="closeLyricsEdit"></button></header><p class="om-soft" data-om-lyrics-editor-hint></p><form class="om-form" data-om-lyrics-form><textarea class="om-lyrics-input" data-om-lyrics-editor maxlength="16000" rows="14"></textarea><p class="om-soft" data-om-lyrics-draft-status></p><p class="om-form-error" data-om-lyrics-error role="alert"></p><button type="submit" class="om-button om-primary" data-om-lyrics-save></button></form></dialog><dialog class="om-modal om-lyrics-reader" data-om-modal="lyricsRead"><header><h2 data-om-lyrics-reader-title></h2><button type="button" class="om-button" data-om-action="closeLyricsRead"></button></header><div class="om-font-controls"><button type="button" class="om-button" data-om-action="lyricsSmaller" aria-label="Smaller text">A−</button><button type="button" class="om-button" data-om-action="lyricsLarger" aria-label="Larger text">A+</button></div><div class="om-lyrics-text" data-om-lyrics-reading tabindex="0"></div></dialog>');
      this.playlistDialog = this.find('[data-om-modal="playlist"]');
      this.lyricsEditDialog = this.find('[data-om-modal="lyricsEdit"]');
      this.lyricsReadDialog = this.find('[data-om-modal="lyricsRead"]');
    }
    find(selector) { return this.element.querySelector(selector); }
    set(selector, html) { var el = this.find(selector); if (el) el.innerHTML = html; }
    setText(selector, value) { var el = this.find(selector); if (el) el.textContent = value; }
    roster() { return values(this.data && this.data.roster); }
    name(num) { var p = this.roster().find(p => Number(p.playerNum) === Number(num)); return p && p.name || t('player', { n: num }); }
    owner() { return this.actor || Number(this.data && this.data.spotlight) || 0; }
    controller() { return !this.actor || Number(this.data && this.data.spotlight) === this.actor; }
    host() { return !this.actor; }
    favorites() { return values(this.data && this.data.mySongs && this.data.mySongs[this.owner()]).map(String); }
    library() { return values(this.data && this.data.songLibrary).filter(s => validVideo(s.videoId)); }
    categories() { return global.OPEN_MIC_CONTENT && global.OPEN_MIC_CONTENT.categories || fallbackCategories; }
    update(payload) {
      if (this.destroyed || !payload) return;
      var data = payload.openmic || (payload.version && payload.roster ? payload : null);
      if (!data) return;
      var prevSession = this.data && this.data.sessionId;
      var previousSong = this.data && this.data.selectedSong && this.data.selectedSong.videoId;
      var previousRound = this.data && this.data.round;
      this.data = data;
      if (prevSession && prevSession !== data.sessionId) { this.category = 'for-you'; this.error = ''; this.notice = ''; this.close(this.previewDialog); this.close(this.duetDialog); }
      if (prevSession && (prevSession !== data.sessionId || previousRound !== data.round)) this.close(this.playlistDialog);
      if (prevSession && (prevSession !== data.sessionId || previousSong !== (data.selectedSong && data.selectedSong.videoId))) {
        this.close(this.lyricsEditDialog); this.close(this.lyricsReadDialog);
      }
      if (data.reply && data.reply.id !== this.replyId) {
        this.replyId = data.reply.id;
        this.error = data.reply.error ? t(dict[data.reply.error] ? data.reply.error : 'error') : '';
        this.setText('[data-om-form-error]', this.error);
      }
      this.render();
    }
    renderLabels() {
      var labels = { '[data-om-stage-title]': 'stage', '[data-om-library-title]': 'library', '[data-om-action="addOpen"]': 'addOwn', '[data-om-action="closePreview"]': 'close', '[data-om-action="closeAdd"]': 'close', '[data-om-action="closeDuet"]': 'close', '[data-om-add-title]': 'addTitle', '[data-om-title-label]': 'songTitle', '[data-om-url-label]': 'youtubeURL', '[data-om-add-hint]': 'addHint', '[data-om-add-submit]': 'add', '[data-om-preview-hint]': 'previewHint', '[data-om-preview-link]': 'youtubeLink', '[data-om-duet-title]': 'duetTitle', '[data-om-duet-hint]': 'duetHint' };
      Object.keys(labels).forEach(s => this.setText(s, t(labels[s])));
      this.find('[data-om-search]').placeholder = t('search');
      this.find('[data-om-search]').setAttribute('aria-label', t('search'));
      this.find('[data-om-add-form] input[name="title"]').placeholder = t('titlePlaceholder');
      if (this.previewSong) this.setText('[data-om-preview-title]', this.previewSong.title);
      this.renderExtraLabels();
    }
    renderExtraLabels() {
      var labels = { '[data-om-starter-hint]': 'starterHint', '[data-om-youtube-home]': 'youtubeHome', '[data-om-youtube-search]': 'youtubeSearch', '[data-om-action="playlistOpen"]': 'playlistOpen', '[data-om-playlist-title]': 'playlistTitle', '[data-om-action="closePlaylist"]': 'close', '[data-om-playlist-hint]': 'playlistHint', '[data-om-playlist-url-label]': 'playlistURL', '[data-om-playlist-load]': 'playlistLoad', '[data-om-action="playlistCurrent"]': 'playlistCurrent', '[data-om-playlist-song-label]': 'playlistSongTitle', '[data-om-action="playlistAdd"]': 'playlistAdd', '[data-om-playlist-video-link]': 'youtubeLink', '[data-om-lyrics-label]': 'lyrics', '[data-om-lyrics-hint]': 'lyricsHint', '[data-om-action="lyricsEdit"]': 'lyricsEdit', '[data-om-action="lyricsRead"]': 'lyricsRead', '[data-om-lyrics-search]': 'lyricsSearch', '[data-om-lyric-video-search]': 'lyricVideoSearch', '[data-om-lyrics-editor-hint]': 'lyricsEditorHint', '[data-om-lyrics-save]': 'lyricsSave', '[data-om-action="closeLyricsEdit"]': 'close', '[data-om-action="closeLyricsRead"]': 'close' };
      Object.keys(labels).forEach(s => this.setText(s, t(labels[s])));
      this.find('[data-om-online-query]').placeholder = t('youtubeSearchPlaceholder');
      this.find('[data-om-online-query]').setAttribute('aria-label', t('youtubeSearchPlaceholder'));
      this.find('[data-om-lyrics-editor]').placeholder = t('lyricsPlaceholder');
      this.find('[data-om-lyrics-editor]').setAttribute('aria-label', t('lyrics'));
      this.element.querySelectorAll('[data-om-action="lyricsSmaller"]').forEach(el => { el.setAttribute('aria-label', t('lyricsSmaller')); el.title = t('lyricsSmaller'); });
      this.element.querySelectorAll('[data-om-action="lyricsLarger"]').forEach(el => { el.setAttribute('aria-label', t('lyricsLarger')); el.title = t('lyricsLarger'); });
      if (this.lyricsEditSong) this.setText('[data-om-lyrics-editor-title]', t('lyricsEditorTitle', { title: this.lyricsEditSong.title }));
      this.updateOnlineSearch();
      this.renderPlaylistControls();
    }
    button(action, label, css, extra, allowed) {
      var disabled = allowed === false || (action !== 'preview' && (this.pending || !this.canControl()));
      return '<button type="button" class="om-button ' + (css || '') + '" data-om-action="' + action + '"' + (extra || '') + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
    }
    render() {
      if (this.destroyed) return;
      this.renderLabels();
      if (!this.data) return;
      var data = this.data, challenge = data.challenge || {}, controller = this.controller(), host = this.host();
      var result = data.challengeResult, after = !!result, finished = data.phase === 'finished';
      var personName = this.name(data.spotlight), avatar = Array.from(personName.trim())[0] || '♪';
      var controls = '';
      if (host && data.phase === 'challenge') controls = '<div class="om-challenge-controls"><div class="om-actions">' + this.button('success', t('success'), 'om-success') + this.button('failed', t('failed'), 'om-fail') + '</div>' + this.button('newChallenge', t('newChallenge')) + '</div>';
      this.set('[data-om-challenge]', '<div class="om-panel-head"><p class="om-kicker">' + esc(t('spotlight')) + '</p><span class="om-round">' + esc(t('round', { n: data.round || 1 })) + '</span></div><div class="om-spotlight"><span class="om-avatar" aria-hidden="true">' + esc(avatar) + '</span><h2>' + esc(personName) + (this.actor === Number(data.spotlight) ? '<span class="om-you">' + esc(t('you')) + '</span>' : '') + '</h2></div><h3 class="om-challenge-title">' + esc(challengeText(challenge.title)) + '</h3><p class="om-situation">' + esc(challengeText(challenge.situation)) + '</p><div class="om-task">' + esc(challengeText(challenge.challenge)) + '</div><p class="om-success-rule">' + esc(t('successRule', { rule: challengeText(challenge.successRule) })) + '</p>' + controls + (after ? '<div class="om-result ' + (result === 'failed' ? 'om-result-failed' : '') + '" role="status"><strong>' + esc(t(result === 'success' ? 'challengeSuccess' : 'challengeFailed')) + '</strong><p>' + esc(t(result === 'success' ? 'successHint' : 'failedHint')) + '</p></div>' : ''));
      var roster = this.roster(), active = roster.filter(p => p.active !== false), current = active.findIndex(p => Number(p.playerNum) === Number(data.spotlight));
      var ordered = current >= 0 ? active.slice(current).concat(active.slice(0, current)) : active;
      var queue = ordered.concat(roster.filter(p => p.active === false)).map(p => '<li class="' + (Number(p.playerNum) === Number(data.spotlight) ? 'om-current' : p.active === false ? 'om-inactive' : '') + '">' + (Number(p.playerNum) === Number(data.spotlight) ? '<span class="om-dot" aria-hidden="true"></span>' : '') + esc(p.name || t('player', { n: p.playerNum })) + (p.active === false ? ' · ' + esc(t('sittingOut')) : '') + '</li>').join('');
      var manage = host ? '<details class="om-manage"><summary>' + esc(t('manage')) + '</summary><div class="om-roster">' + roster.map(p => '<div class="om-roster-row"><span>' + esc(p.name || t('player', { n: p.playerNum })) + '</span>' + this.button('exclude', t(p.active === false ? 'rejoin' : 'sitOut'), '', ' data-player="' + Number(p.playerNum) + '" data-active="' + (p.active === false ? 'true' : 'false') + '"') + '</div>').join('') + '</div></details>' : '';
      var manageEl = this.find('.om-manage'), manageOpen = manageEl && manageEl.open;
      this.set('[data-om-score]', '<div class="om-score-row"><div><p class="om-kicker">' + esc(t('teamScore')) + '</p><p class="om-score-rules">' + esc(t('scoreHint')) + '</p></div><strong class="om-score-number" aria-label="' + esc(t('teamScore')) + '">' + Number(data.teamScore || 0) + '</strong></div><div class="om-queue"><p class="om-kicker">' + esc(t('queue')) + '</p><ol class="om-queue-list">' + queue + '</ol></div>' + manage);
      if (manageOpen && this.find('.om-manage')) this.find('.om-manage').open = true;
      this.renderStage();
      this.renderLyrics();
      this.renderSongs();
      if (this.duetDialog.open) this.renderDuets();
      this.setText('[data-om-feedback]', this.error || this.notice);
      this.find('[data-om-feedback]').classList.toggle('om-error', !!this.error);
      this.paint();
    }
    renderStage() {
      var data = this.data, song = data.selectedSong, controller = this.controller(), host = this.host();
      var after = !!data.challengeResult, finished = data.phase === 'finished';
      this.setText('[data-om-duration]', t('duration', { n: Number(data.duration) || 35 }));
      var key = [data.sessionId, data.round, data.spotlight, song && song.videoId || 'empty'].join(':');
      if (key !== this.videoKey) {
        this.videoKey = key;
        this.set('[data-om-stage-video]', song ? iframe(song) : '<div class="om-empty-stage"><span aria-hidden="true">♪</span><h3>' + esc(t('chooseSong')) + '</h3><p class="om-soft">' + esc(t('stageEmptyHint')) + '</p></div>');
      } else if (!song) {
        this.setText('[data-om-stage-video] h3', t('chooseSong'));
        this.setText('[data-om-stage-video] .om-soft', t('stageEmptyHint'));
      }
      var info = song ? '<div class="om-stage-track"><h3>' + esc(song.title) + '</h3><p>' + esc(song.artist || '') + '</p></div><p class="om-soft">' + esc(t('embedHint')) + ' <a class="back" href="' + youtube(song.videoId) + '" target="_blank" rel="noopener noreferrer">' + esc(t('youtubeLink')) + '</a></p>' : '';
      if (data.duet) info += '<p class="om-stage-hint om-soft">👥 ' + esc(t('duetWith', { name: this.name(data.duet) })) + '</p>';
      if (data.singingState === 'singing') info += '<div class="om-timer-line"><strong class="om-timer" data-om-timer aria-live="off"></strong><p class="om-timer-label" data-om-timer-label></p></div><div class="om-progress" aria-hidden="true"><span data-om-progress></span></div>';
      this.set('[data-om-stage-info]', info);
      var buttons = '';
      if (after && !finished && controller) {
        buttons += '<div class="om-actions">';
        if (data.singingState === 'singing') buttons += this.button('finishSinging', t('finishSinging'), 'om-success');
        else buttons += this.button('startSinging', t('startSinging'), 'om-primary', '', !!song);
        buttons += this.button('duetOpen', t('inviteDuet')) + this.button('skip', t('skip'), 'om-skip');
        buttons += '</div>';
      }
      if (host && after) buttons += '<div class="om-actions" style="margin-top:10px">' + this.button('next', t('next'), finished ? 'om-primary' : '', '', true) + '</div>';
      if (!after) buttons += '<p class="om-waiting">' + esc(t('challengeFirst')) + '</p>';
      else if (finished) buttons += '<p class="om-waiting">' + esc(t(data.singingAwarded ? 'singingDone' : 'singingSkipped')) + ' ' + esc(t('nextHint')) + '</p>';
      else if (!controller) buttons += '<p class="om-waiting">' + esc(t('selectionWait', { name: this.name(data.spotlight) })) + '</p>';
      this.set('[data-om-stage-controls]', buttons);
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
      var allowed = this.controller() && !!this.data.challengeResult && this.data.phase === 'choice';
      var canSave = this.canControl() && this.owner() > 0;
      this.set('[data-om-songs]', library.length ? library.map(song => {
        var saved = favorites.indexOf(String(song.videoId)) >= 0, current = selected && selected.videoId === song.videoId;
        var thumbnail = 'https://i.ytimg.com/vi/' + encodeURIComponent(song.videoId) + '/hqdefault.jpg';
        var tags = values(song.tags).filter(tag => tag !== 'for-you').slice(0, 3);
        return '<article class="om-song ' + (current ? 'om-selected' : '') + '"><div class="om-thumb"><img src="' + thumbnail + '" alt="" loading="lazy"><button type="button" class="om-star ' + (saved ? 'om-saved' : '') + '" data-om-action="toggleFavorite" data-video="' + esc(song.videoId) + '" aria-label="' + esc(t(saved ? 'unsaveSong' : 'saveSong')) + '" aria-pressed="' + saved + '"' + (!canSave || this.pending ? ' disabled' : '') + '>' + (saved ? '★' : '☆') + '</button></div><div class="om-song-info"><h3>' + esc(song.title) + '</h3><p class="om-artist">' + esc(song.artist || '') + '</p><div class="om-tags">' + tags.map(tag => '<span class="om-tag">' + esc(categoryName(tag)) + '</span>').join('') + '</div><div class="om-actions">' + this.button('preview', t('preview'), '', ' data-video="' + esc(song.videoId) + '"', true) + this.button('selectSong', t(current ? 'selected' : 'singThis'), current ? '' : 'om-primary', ' data-video="' + esc(song.videoId) + '"', allowed) + '</div></div></article>';
      }).join('') : '<p class="om-empty">' + esc(t(q ? 'noSearch' : 'noSongs')) + '</p>');
      this.find('[data-om-action="addOpen"]').disabled = !canSave || this.pending;
    }
    renderDuets() {
      if (!this.data) return;
      var players = this.roster().filter(p => p.active !== false && Number(p.playerNum) !== Number(this.data.spotlight));
      this.set('[data-om-duets]', '<div style="height:12px"></div>' + this.button('inviteDuet', t('duetNone'), '', ' data-player=""', this.controller()) + players.map(p => this.button('inviteDuet', p.name || t('player', { n: p.playerNum }), Number(this.data.duet) === Number(p.playerNum) ? 'om-primary' : '', ' data-player="' + Number(p.playerNum) + '"', this.controller())).join('') + (!players.length ? '<p class="om-soft">' + esc(t('noDuet')) + '</p>' : ''));
    }
    updateOnlineSearch() {
      var query = this.find('[data-om-online-query]').value.trim() || 'music';
      this.find('[data-om-youtube-search]').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    }
    renderPlaylistControls() {
      this.find('[data-om-playlist-load]').disabled = this.playlistBusy;
      this.find('[data-om-action="playlistCurrent"]').disabled = !this.playlistPlayer || this.playlistBusy;
      this.find('[data-om-action="playlistAdd"]').disabled = !this.playlistPlayer || this.playlistBusy || this.pending || !this.canControl() || this.owner() < 1;
    }
    playlistStatus(key, error) {
      this.setText('[data-om-playlist-status]', t(key));
      this.find('[data-om-playlist-status]').classList.toggle('om-error', !!error);
    }
    destroyPlaylist() {
      this.playlistGeneration++;
      if (this.playlistAbort) this.playlistAbort.abort();
      this.playlistAbort = null;
      if (this.playlistPlayer) this.playlistPlayer.destroy();
      this.playlistPlayer = null; this.playlistSelected = null; this.playlistBusy = false; this.playlistTitleDirty = false;
      this.find('[data-om-playlist-player]').innerHTML = '';
      this.find('[data-om-playlist-player]').hidden = true;
      this.find('[data-om-playlist-selection]').hidden = true;
      this.find('[data-om-playlist-song-title]').value = '';
      this.setText('[data-om-playlist-current-title]', '');
      this.setText('[data-om-playlist-status]', '');
      this.renderPlaylistControls();
    }
    async loadPlaylist(url) {
      var api = global.OPEN_MIC_YOUTUBE;
      var id = api && api.parsePlaylistURL(url);
      if (!id) { this.playlistStatus('invalid_playlist', true); return; }
      this.destroyPlaylist();
      var generation = this.playlistGeneration;
      this.playlistAbort = new AbortController();
      this.playlistBusy = true;
      this.find('[data-om-playlist-player]').hidden = false;
      this.playlistStatus('playlistLoading'); this.renderPlaylistControls();
      try {
        var player = await api.createPlaylistPlayer(this.find('[data-om-playlist-player]'), id, {
          signal: this.playlistAbort.signal,
          onError: () => { if (!this.destroyed && generation === this.playlistGeneration) this.playlistStatus('playlistError', true); }
        });
        if (this.destroyed || generation !== this.playlistGeneration || !this.playlistDialog.open) { player.destroy(); return; }
        this.playlistPlayer = player; this.playlistBusy = false;
        this.find('[data-om-playlist-selection]').hidden = false;
        this.playlistStatus('playlistReady'); this.renderPlaylistControls();
        await this.refreshPlaylistVideo();
      } catch (failure) {
        if (!this.destroyed && generation === this.playlistGeneration && this.playlistDialog.open) {
          this.playlistBusy = false; this.playlistStatus(failure && failure.message === 'invalid_playlist' ? 'invalid_playlist' : 'playlistError', true); this.renderPlaylistControls();
        }
      }
    }
    applyPlaylistVideo(video) {
      var changed = !this.playlistSelected || this.playlistSelected.videoId !== video.videoId;
      if (!this.playlistTitleDirty || (changed && this.playlistSelected)) {
        this.find('[data-om-playlist-song-title]').value = video.title || '';
        this.playlistTitleDirty = false;
      }
      this.playlistSelected = video;
      this.setText('[data-om-playlist-current-title]', video.title || video.videoId);
      this.find('[data-om-playlist-video-link]').href = youtube(video.videoId);
      this.find('[data-om-playlist-video-link]').hidden = false;
      this.playlistStatus(video.title ? 'playlistReady' : 'playlistNoTitle');
      return changed;
    }
    async refreshPlaylistVideo() {
      if (!this.playlistPlayer || this.playlistBusy) return;
      var generation = this.playlistGeneration, player = this.playlistPlayer;
      this.playlistBusy = true; this.playlistStatus('playlistFetching'); this.renderPlaylistControls();
      try {
        var video = await player.currentVideo();
        if (this.destroyed || generation !== this.playlistGeneration || !this.playlistDialog.open) return;
        if (!video || !validVideo(video.videoId)) { this.playlistStatus('playlistWaiting', true); return; }
        this.applyPlaylistVideo(video);
      } catch (_) {
        if (!this.destroyed && generation === this.playlistGeneration) this.playlistStatus('playlistWaiting', true);
      } finally {
        if (!this.destroyed && generation === this.playlistGeneration) { this.playlistBusy = false; this.renderPlaylistControls(); }
      }
    }
    async addPlaylistVideo() {
      if (!this.playlistPlayer || this.playlistBusy || this.pending || !this.canControl() || !this.data) return;
      var generation = this.playlistGeneration, owner = this.owner(), session = this.data.sessionId;
      var typedTitle = this.find('[data-om-playlist-song-title]').value.trim();
      var selectedId = this.playlistSelected && this.playlistSelected.videoId;
      this.playlistBusy = true; this.playlistStatus('playlistFetching'); this.renderPlaylistControls();
      try {
        var video = await this.playlistPlayer.currentVideo();
        if (this.destroyed || generation !== this.playlistGeneration || !this.playlistDialog.open || !this.data || this.data.sessionId !== session || this.owner() !== owner) return;
        if (!video || !validVideo(video.videoId)) { this.playlistStatus('playlistWaiting', true); return; }
        if (selectedId && video.videoId !== selectedId) { this.applyPlaylistVideo(video); this.playlistStatus('playlistChanged'); return; }
        var title = typedTitle || video.title || '';
        if (!title || title.length > 120) { this.applyPlaylistVideo(video); this.playlistStatus(title ? 'invalid_title' : 'playlistNoTitle', true); this.find('[data-om-playlist-song-title]').focus(); return; }
        var ok = await this.action('addSong', { title: title, url: youtube(video.videoId) });
        if (this.destroyed || generation !== this.playlistGeneration || !this.playlistDialog.open) return;
        if (ok && !this.error) {
          this.category = 'my-songs'; this.query = ''; this.find('[data-om-search]').value = '';
          this.playlistStatus('added'); this.notice = t('added'); this.render();
        } else { this.setText('[data-om-playlist-status]', this.error || t('error')); this.find('[data-om-playlist-status]').classList.add('om-error'); }
      } catch (_) {
        if (!this.destroyed && generation === this.playlistGeneration) this.playlistStatus('playlistWaiting', true);
      } finally {
        if (!this.destroyed && generation === this.playlistGeneration) { this.playlistBusy = false; this.renderPlaylistControls(); }
      }
    }
    getLyrics(videoId) {
      var value = this.data && this.data.songLyrics && this.data.songLyrics[videoId];
      return typeof value === 'string' ? value : '';
    }
    draftKey(videoId, sessionId) { return String(sessionId || this.data && this.data.sessionId || '') + ':' + this.actor + ':' + videoId; }
    storeDraft(key, draft) {
      this.lyricsDrafts[key] = draft;
      try {
        if (draft.dirty) global.sessionStorage.setItem('openmic-lyrics-draft:' + key, JSON.stringify(draft));
        else global.sessionStorage.removeItem('openmic-lyrics-draft:' + key);
      } catch (_) {}
    }
    loadDraft(key) {
      if (this.lyricsDrafts[key]) return this.lyricsDrafts[key];
      try {
        var draft = JSON.parse(global.sessionStorage.getItem('openmic-lyrics-draft:' + key) || 'null');
        if (draft && draft.dirty && typeof draft.text === 'string' && draft.text.length <= 16000) return this.lyricsDrafts[key] = draft;
      } catch (_) {}
      return null;
    }
    renderLyrics() {
      if (!this.data) return;
      var song = this.data.selectedSong, panel = this.find('[data-om-lyrics-panel]');
      panel.hidden = !song;
      if (song) {
        var lyrics = this.getLyrics(song.videoId);
        this.setText('[data-om-lyrics-copy]', lyrics || t('lyricsEmpty'));
        this.find('[data-om-lyrics-copy]').classList.toggle('om-lyrics-empty', !lyrics);
        this.find('[data-om-action="lyricsRead"]').disabled = !lyrics;
        this.find('[data-om-action="lyricsEdit"]').hidden = !this.controller();
        this.find('[data-om-action="lyricsEdit"]').disabled = this.pending || !this.canControl();
        var query = [song.title, song.artist || '', 'lyrics'].filter(Boolean).join(' ');
        this.find('[data-om-lyrics-search]').href = 'https://www.google.com/search?q=' + encodeURIComponent(query);
        this.find('[data-om-lyric-video-search]').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
        this.setText('[data-om-lyrics-reader-title]', song.title + ' · ' + t('lyrics'));
        this.setText('[data-om-lyrics-reading]', lyrics || t('lyricsEmpty'));
      }
      this.find('[data-om-lyrics-save]').disabled = this.pending || !this.canControl() || !this.controller() || !this.lyricsEditVideo || this.lyricsEditSession !== this.data.sessionId;
      this.element.querySelectorAll('[data-om-lyrics-copy], [data-om-lyrics-reading]').forEach(el => { el.style.fontSize = this.lyricsFont + 'px'; });
      this.element.querySelectorAll('[data-om-action="lyricsSmaller"]').forEach(el => { el.disabled = this.lyricsFont <= 18; });
      this.element.querySelectorAll('[data-om-action="lyricsLarger"]').forEach(el => { el.disabled = this.lyricsFont >= 42; });
      var draft = this.lyricsEditVideo && this.lyricsDrafts[this.draftKey(this.lyricsEditVideo, this.lyricsEditSession)];
      this.setText('[data-om-lyrics-draft-status]', draft && draft.dirty ? t('lyricsDraft') : '');
    }
    openLyricsEditor() {
      if (!this.data || !this.data.selectedSong || !this.controller() || !this.canControl()) return;
      var song = this.data.selectedSong, key = this.draftKey(song.videoId);
      this.lyricsEditGeneration++;
      this.lyricsEditVideo = song.videoId; this.lyricsEditSession = this.data.sessionId; this.lyricsEditSong = song;
      var draft = this.loadDraft(key);
      if (!draft || !draft.dirty) this.lyricsDrafts[key] = draft = { text: this.getLyrics(song.videoId), dirty: false };
      this.find('[data-om-lyrics-editor]').value = draft.text;
      this.setText('[data-om-lyrics-editor-title]', t('lyricsEditorTitle', { title: song.title }));
      this.setText('[data-om-lyrics-error]', ''); this.renderLyrics(); this.show(this.lyricsEditDialog);
    }
    async saveLyrics() {
      if (!this.data || !this.lyricsEditVideo || this.lyricsEditSession !== this.data.sessionId || !this.data.selectedSong || this.data.selectedSong.videoId !== this.lyricsEditVideo || !this.controller() || !this.canControl()) return;
      var id = this.lyricsEditVideo, session = this.lyricsEditSession, key = this.draftKey(id, session), generation = this.lyricsEditGeneration;
      var lyrics = this.find('[data-om-lyrics-editor]').value;
      this.storeDraft(key, { text: lyrics, dirty: lyrics !== this.getLyrics(id) });
      if (lyrics.length > 16000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(lyrics)) { this.setText('[data-om-lyrics-error]', t('invalid_lyrics')); return; }
      this.setText('[data-om-lyrics-error]', '');
      var ok = await this.action('setLyrics', { videoId: id, lyrics: lyrics });
      if (this.destroyed) return;
      if (ok && !this.error) {
        var currentDraft = this.lyricsDrafts[key];
        var newer = currentDraft && currentDraft.text !== lyrics;
        if (!newer) {
          this.storeDraft(key, { text: lyrics, dirty: false });
          if (this.lyricsEditVideo === id && this.lyricsEditSession === session && this.lyricsEditGeneration === generation) this.close(this.lyricsEditDialog);
        }
        this.notice = t(newer ? 'lyricsSavedNewerDraft' : 'lyricsSaved'); this.render();
      } else if (this.lyricsEditVideo === id && this.lyricsEditSession === session && this.lyricsEditGeneration === generation) this.setText('[data-om-lyrics-error]', this.error || t('error'));
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
        this.setText('[data-om-timer-label]', t(data.singingState === 'finished' ? 'singingDone' : left === 0 ? 'timerZero' : 'timerRunning'));
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
    close(dialog) {
      if (dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
      if (dialog === this.previewDialog) { this.set('[data-om-preview-video]', ''); this.previewSong = null; }
      if (dialog === this.playlistDialog) this.destroyPlaylist();
      if (dialog === this.lyricsEditDialog) { this.lyricsEditGeneration++; this.lyricsEditVideo = null; this.lyricsEditSession = null; }
    }
    preview(videoId) {
      var song = this.library().find(s => s.videoId === videoId);
      if (!song) return;
      this.previewSong = song;
      this.setText('[data-om-preview-title]', song.title);
      this.set('[data-om-preview-video]', iframe(song));
      this.find('[data-om-preview-link]').href = youtube(song.videoId);
      this.show(this.previewDialog);
    }
    async action(type, extra) {
      if (this.pending || this.destroyed || !this.canControl()) return false;
      this.pending = true; this.error = ''; this.notice = '';
      this.render();
      try {
        var result = await this.send(type, extra || {});
        if (result && result.error) { this.error = t(dict[result.error] ? result.error : 'error'); this.setText('[data-om-form-error]', this.error); return false; }
        return true;
      } catch (failure) { this.error = failure && dict[failure.message] ? t(failure.message) : this.error || t('error'); this.setText('[data-om-form-error]', this.error); return false; }
      finally { this.pending = false; if (!this.destroyed) this.render(); }
    }
    handleInput(event) {
      if (event.target.matches('[data-om-search]')) { this.query = event.target.value; this.renderSongs(); }
      if (event.target.matches('[data-om-online-query]')) this.updateOnlineSearch();
      if (event.target.matches('[data-om-playlist-song-title]')) this.playlistTitleDirty = true;
      if (event.target.matches('[data-om-lyrics-editor]') && this.lyricsEditVideo) {
        this.storeDraft(this.draftKey(this.lyricsEditVideo, this.lyricsEditSession), { text: event.target.value, dirty: event.target.value !== this.getLyrics(this.lyricsEditVideo) });
        this.setText('[data-om-lyrics-draft-status]', t('lyricsDraft'));
      }
    }
    handleClick(event) {
      var category = event.target.closest('[data-om-category]');
      if (category && this.element.contains(category)) { this.category = category.dataset.omCategory; this.renderSongs(); return; }
      var target = event.target.closest('[data-om-action]');
      if (!target || !this.element.contains(target) || target.disabled) return;
      var action = target.dataset.omAction;
      if (action === 'preview') { this.preview(target.dataset.video); return; }
      if (action === 'closePreview') { this.close(this.previewDialog); return; }
      if (action === 'addOpen') { this.setText('[data-om-form-error]', ''); this.show(this.addDialog); return; }
      if (action === 'closeAdd') { this.close(this.addDialog); return; }
      if (action === 'duetOpen') { this.renderDuets(); this.show(this.duetDialog); return; }
      if (action === 'closeDuet') { this.close(this.duetDialog); return; }
      if (action === 'playlistOpen') { this.show(this.playlistDialog); return; }
      if (action === 'closePlaylist') { this.close(this.playlistDialog); return; }
      if (action === 'playlistCurrent') { this.refreshPlaylistVideo(); return; }
      if (action === 'playlistAdd') { this.addPlaylistVideo(); return; }
      if (action === 'lyricsEdit') { this.openLyricsEditor(); return; }
      if (action === 'closeLyricsEdit') { this.close(this.lyricsEditDialog); return; }
      if (action === 'lyricsRead') { this.renderLyrics(); this.show(this.lyricsReadDialog); return; }
      if (action === 'closeLyricsRead') { this.close(this.lyricsReadDialog); return; }
      if (action === 'lyricsSmaller' || action === 'lyricsLarger') { this.lyricsFont = Math.max(18, Math.min(42, this.lyricsFont + (action === 'lyricsLarger' ? 2 : -2))); this.renderLyrics(); return; }
      if (action === 'selectSong' || action === 'toggleFavorite') { this.action(action, { videoId: target.dataset.video }); return; }
      if (action === 'inviteDuet') { this.action(action, { playerNum: target.dataset.player ? Number(target.dataset.player) : null }).then(ok => { if (ok) this.close(this.duetDialog); }); return; }
      if (action === 'exclude') { this.action(action, { playerNum: Number(target.dataset.player), active: target.dataset.active === 'true' }); return; }
      this.action(action);
    }
    async handleSubmit(event) {
      if (event.target.matches('[data-om-playlist-form]')) { event.preventDefault(); this.loadPlaylist(event.target.elements.playlistUrl.value.trim()); return; }
      if (event.target.matches('[data-om-lyrics-form]')) { event.preventDefault(); this.saveLyrics(); return; }
      if (!event.target.matches('[data-om-add-form]')) return;
      event.preventDefault();
      var title = event.target.elements.title.value.trim(), url = event.target.elements.url.value.trim();
      if (!title || title.length > 120) { this.setText('[data-om-form-error]', t('invalid_title')); return; }
      if (!parseVideo(url)) { this.setText('[data-om-form-error]', t('invalid_url')); return; }
      var ok = await this.action('addSong', { title: title, url: url });
      if (ok && !this.error) { this.category = 'my-songs'; this.query = ''; this.find('[data-om-search]').value = ''; event.target.reset(); this.close(this.addDialog); this.notice = t('added'); this.render(); }
    }
    destroy() {
      this.destroyed = true;
      clearInterval(this.timer);
      this.element.removeEventListener('click', this.onClick);
      this.element.removeEventListener('input', this.onInput);
      this.element.removeEventListener('submit', this.onSubmit);
      this.close(this.previewDialog); this.close(this.addDialog); this.close(this.duetDialog);
      this.close(this.playlistDialog); this.close(this.lyricsEditDialog); this.close(this.lyricsReadDialog);
      this.element.innerHTML = '';
      this.data = null;
    }
  }
  return { t: t, esc: esc, Game: Game };
}));
