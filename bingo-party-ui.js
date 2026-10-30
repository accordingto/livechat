/* bingo-party-ui.js — 雙選賓果 card and stage rendering.
 *
 * One renderer for three surfaces: a player's own card (play.html), the
 * public stage on the host page (safe to share on screen), and the folded
 * host tools that appear on the host page and on the host seat's own card.
 * It renders ONLY the projection it is handed; it never loads the card bank
 * and cannot see what a seat's projection leaves out.
 *
 * Re-rendering keeps typed text, focus, caret and open folds (data-keep),
 * waits while a Chinese IME composition is in progress, and shows public
 * director commands as a non-blocking banner outside the re-rendered area.
 */
var BINGO_UI = (() => {
  'use strict';
  const D = {
    title: ['DOUBLE TAKE', 'DOUBLE TAKE'],
    lobbyHeading: ['先分隊，準備開玩', 'Pick your side. Get ready.'],
    pickStep: ['秘密選號', 'Pick a number'], playStep: ['一起玩關卡', 'Play a challenge'], markStep: ['圈號連線', 'Make a line'],
    teamsHeading: ['隊伍名單', 'The teams'], settingsHeading: ['本局設定', 'Game setup'],
    otherPlayers: ['其他隊伍與觀眾', 'Other players'], moreSettings: ['更多設定與主持座位', 'More settings & host seat'],
    timingSummary: ['演出 {scene} · 分享 {story}', 'Scenes {scene} · stories {story}'],
    resetTimers: ['套用建議時間', 'Use recommended times'], optionalSong: ['補充歌手與理由（選填）', 'Artist & a note (optional)'],
    currentTask: ['現在進行', 'Happening now'], nextUp: ['接下來', 'Up next'], roundDetails: ['回合資訊', 'Round details'],
    storyTopic: ['這次的話題', 'Story topic'],
    tagline: ['各隊秘密選一號 → 一起玩短關卡 → 結果決定叫誰的號 → 兩邊一起圈 → 達到線數獲勝。', 'Each team secretly picks a number → play a short challenge → the result decides whose number is called → both boards mark it → first to the target lines wins.'],
    teamA: ['A 隊', 'Team A'], teamB: ['B 隊', 'Team B'], both: ['兩隊', 'Both teams'], neither: ['都沒過', 'Neither'],
    spectator: ['觀眾', 'Spectator'], host: ['主持', 'Host'], you: ['你', 'You'], away: ['暫離', 'Away'],
    type_guess_person: ['默契猜人', 'Guess Your Teammate'], type_song_relay: ['接歌接力', 'Song Relay'], type_improv_scene: ['導演出招', 'Live Director'],
    type_story_exchange: ['故事交換與點歌', 'Story & Song Swap'], type_taboo_description: ['禁詞傳話', 'Taboo Relay'],
    typeHint_guess_person: ['主角私下作答，隊友猜他會選什麼。', 'Your protagonist answers privately; teammates guess the answer.'],
    typeHint_song_relay: ['兩隊輪流唱／哼一段並報歌名，同回合不重複。', 'Teams take turns singing or humming a bit and naming the song. No repeats this round.'],
    typeHint_improv_scene: ['對手在你們演出時即時按指令或送私密台詞。', 'While you act, the other team presses live commands or slips you a private line.'],
    typeHint_story_exchange: ['分享 → 對手追問 → 回答 → 對手點歌 → 唱一段，再交換。', 'Share → the other team asks → answer → they pick a song → sing a bit, then swap.'],
    typeHint_taboo_description: ['描述者看私密答案與禁詞，隊友口頭猜。', 'The describer sees a secret word and two taboo words; teammates guess out loud.'],
    round: ['第 {n} 回合', 'Round {n}'], lines: ['{n} 條線', '{n} lines'], target: ['先達 {n} 條線獲勝', 'First to {n} lines wins'],
    linesShort: ['線', 'lines'], called: ['已叫號', 'Called'], none: ['尚無', 'None yet'],
    yourBoard: ['我們的棋盤', 'Our board'], showBoard: ['我們的棋盤', 'Our board'], boardPrivate: ['只有你們隊看得到這張棋盤。', 'Only your team can see this board.'],
    // lobby
    lobbyTitle: ['準備大廳', 'Lobby'], ready: ['我準備好了', "I'm ready"], notReady: ['已準備 · 取消', 'Ready · undo'], readyMark: ['已準備', 'Ready'],
    waitingStart: ['等主持人開始…', 'Waiting for the host to start…'], qLang: ['題目語言', 'Prompt language'], zh: ['繁中', '中文'], en: ['英文', 'English'],
    standard: ['標準：3 條線', 'Standard: 3 lines'], quick: ['快玩：2 條線', 'Quick: 2 lines'], songTurns: ['接歌每隊次數', 'Song turns per team'],
    singing: ['啟用唱歌內容', 'Singing content'], on: ['開', 'On'], off: ['關', 'Off'], sceneLang: ['導演關預設演出語言', 'Default scene language'],
    lang_en: ['英文', 'English'], lang_zh: ['中文', 'Mandarin'], lang_tw: ['台語', 'Taiwanese'],
    start: ['開始遊戲', 'Start the game'], shuffle: ['重新自動分隊', 'Shuffle teams'], toA: ['→ A', '→ A'], toB: ['→ B', '→ B'], toWatch: ['觀眾', 'Watch'],
    startProblem_team_too_small: ['每隊至少要 2 位在場玩家。', 'Each team needs at least 2 present players.'],
    startProblem_team_too_large: ['每隊最多 6 人。', 'At most 6 players per team.'],
    startProblem_player_count: ['參賽者需要 4–12 人。', 'You need 4–12 players.'],
    // nominating
    nominateTitle: ['秘密提名', 'Secret nomination'], nominateHelp: ['點一個還沒叫過的號碼，替你們隊投票。鎖定前可以改。', 'Tap an uncalled number to vote for your team. You can change it until it locks.'],
    myVote: ['你投了 {n}', 'You voted {n}'], noVote: ['還沒投票', 'No vote yet'], teamTally: ['隊內票數', 'Team votes'],
    oppVoted: ['對手已投 {v}/{of}', 'Opponents voted {v}/{of}'], teamVoted: ['已投 {v}/{of}', '{v}/{of} voted'],
    nextType: ['這回合關卡', "This round's challenge"], spectatorWait: ['兩隊正在秘密提名…', 'Both teams are nominating in secret…'],
    // revealed
    nominations: ['兩隊提名', 'Nominations'], autoPick: ['系統代選', 'System pick'], tied: ['同票抽選', 'Tie drawn'], sameNumber: ['兩隊同號：這回合只會圈一次。', 'Same number: it can only be called once this round.'],
    fallbackNote: ['都沒過時叫 {team} 的號', 'If neither wins, {team}\'s number is called'],
    beginChallenge: ['開始這一關', 'Start the challenge'], waitHostBegin: ['等主持人開始這一關…', 'Waiting for the host to start…'],
    roles: ['角色', 'Roles'],
    // guess
    protagonist: ['主角', 'Protagonist'], youAreProtagonist: ['你是主角：選你自己的答案', 'You are the protagonist: pick your own answer'],
    privateAnswer: ['只有你看得到，揭曉前隊友看不到。', 'Only you can see this until the reveal.'],
    guessFor: ['猜猜 {name} 會選哪一個？', 'Which one will {name} pick?'], yourGuess: ['你的猜測', 'Your guess'],
    answering: ['{a} 與 {b} 正在作答', '{a} and {b} are answering'], answered: ['已作答', 'Answered'], notAnswered: ['作答中', 'Answering'],
    guessProgress: ['{team}猜測 {v}/{of}', '{team} guesses {v}/{of}'], blocked: ['有主角還沒作答，等待主持處理（加時、換人或重新出題）。', "A protagonist hasn't answered. The host can add time, swap, or restart the question."],
    reveal: ['揭曉', 'Reveal'], hitRatio: ['{team}猜中 {hit}/{of}', '{team}: {hit} of {of} guessed right'], followUp: ['追問提示', 'Follow-up idea'],
    talkHint: ['兩位主角可以各說一下原因。這時改答案不影響得分。', 'Both protagonists can briefly explain. Nothing changes the score now.'],
    talkDone: ['對談結束，看結果', 'Done talking — see the result'],
    // song
    songTheme: ['本回合主題', 'Theme'], turnOrder: ['輪次', 'Turns'], yourTurnSing: ['輪到你！唱或哼一小段，並說出歌名', 'Your turn! Sing or hum a bit and say the title'],
    altOption: ['不想唱：說歌名＋一句它和主題的關聯', "Don't want to sing: say the title + one line on how it fits"],
    modeSing: ['唱／哼', 'Sing / hum'], modeAlt: ['說歌名＋關聯', 'Title + link'], songTitle: ['歌名', 'Song title'], sendTitle: ['送出歌名', 'Send the title'],
    sentTitle: ['已送出「{t}」，等主持判定', 'Sent "{t}" — waiting for the host'], nowSinging: ['{name} 接歌中', '{name} is up'],
    suggest: ['私下建議歌名給隊友', 'Suggest a song to your team'], suggestHint: ['只有你們隊看得到。', 'Only your team sees this.'], send: ['送出', 'Send'],
    accepted: ['已接受的歌', 'Accepted songs'], score: ['有效 {n}', '{n} valid'], timeUpSoft: ['時間到，等主持判定', "Time's up — the host decides"],
    judge: ['判定', 'Judge'], valid: ['有效', 'Valid'], invalid: ['無效', 'Not valid'], skip: ['跳過', 'Skip'], duplicate: ['這首本回合已接受過（完全相同歌名）', 'Already accepted this round (same title)'],
    corrections: ['更正判定', 'Correct a call'], status_valid: ['有效', 'valid'], status_invalid: ['無效', 'not valid'], status_skipped: ['跳過', 'skipped'], status_live: ['進行中', 'live'], status_pending: ['未開始', 'next'],
    // improv
    scene: ['情境', 'Scene'], acting: ['{team}演出中', '{team} acting'], actorsAre: ['演員', 'Actors'], language: ['目前演出語言', 'Scene language'],
    youAct: ['你在演出：{role}', "You're acting: {role}"], directorsAre: ['{team}是導演', '{team} directs'],
    cmd_new_line: ['瞎說！', 'Say something else!'], cmdSub_new_line: ['剛才那句換一句', 'Replace the last line'],
    cmd_speak_mandarin: ['講中文', 'Speak Mandarin'], cmdSub_speak_mandarin: ['接下來改用中文演', 'Switch to Mandarin'],
    cmd_speak_taiwanese: ['講台語', 'Speak Taiwanese'], cmdSub_speak_taiwanese: ['接下來改用台語演', 'Switch to Taiwanese'],
    cmd_speak_english: ['講英文', 'Speak English'], cmdSub_speak_english: ['回到英文演出', 'Back to English'],
    flash_new_line: ['瞎說！剛才發言的演員，換一句！', 'Say something else! Whoever just spoke: replace that line!'],
    flash_speak_mandarin: ['講中文！接下來改用中文演', 'Speak Mandarin! Carry on in Mandarin'],
    flash_speak_taiwanese: ['講台語！接下來改用台語演', 'Speak Taiwanese! Carry on in Taiwanese'],
    flash_speak_english: ['講英文！回到英文演出', 'Speak English! Back to English'],
    by: ['{name} 按的', 'from {name}'], newLineHelp: ['「瞎說」又叫胡說：把剛才那句的內容改成另一個說法或設定，再從新版本接下去。', '"Say something else" replaces what was just said with a different claim, then the scene carries on from the new version.'],
    cooldown: ['剛送出指令，稍後再按', 'A command just went out — try again in a moment'], tooLate: ['這個指令太晚送到，已作廢', 'That command arrived too late and was dropped'],
    writeLine: ['寫一句要對方說的台詞', 'Write a line for an actor to say'], recipient: ['給誰', 'To'], sendLine: ['私下送出', 'Send privately'],
    lineSent: ['已私下送出', 'Sent privately'], queueFull: ['對方台詞排滿了，稍後再送', "That actor's lines are full — try again soon"],
    yourLines: ['你送出的台詞', 'Lines you sent'], cancel: ['撤回', 'Withdraw'], line_active: ['對方正在看', 'with the actor'], line_waiting: ['排隊中', 'queued'],
    line_done: ['已說出', 'said'], line_skipped: ['被略過', 'skipped'], line_cancelled: ['已撤回', 'withdrawn'], line_expired: ['已過期', 'expired'], line_reported: ['被回報', 'reported'], line_hidden: ['已隱藏', 'hidden'],
    privateLine: ['你的私密台詞', 'Your private line'], privateLineHint: ['找下一個適合的機會把這句融進演出。原文語言不同也沒關係，說完回到目前語言。', 'Fit it in at your next good moment. If it is in another language, say it as written, then return to the scene language.'],
    said: ['已說出', 'Said it'], skipLine: ['略過', 'Skip'], report: ['回報不合適', 'Report'], moreWaiting: ['還有 {n} 張排隊', '{n} more waiting'],
    receivedLine: ['{name} 收到一張台詞', '{name} has a private line'], startScene: ['開始演出', 'Start the scene'], readyScene: ['兩位演員準備好就開始', 'Start when both actors are ready'],
    wrapup: ['準備收尾！停止接收新指令與台詞', 'Wrap it up! No new commands or lines'], extend30: ['延長 30 秒', '+30 s'],
    complete: ['完成', 'Completed'], notComplete: ['未完成', 'Not completed'], judgeScene: ['判定這段演出', 'Judge this scene'],
    judgeHint: ['兩位演員有參與、接住情境、有收尾就算完成；不比演技、口音或台詞卡數量。', 'Completed = both took part, kept the scene going and wrapped it up. Not judged on acting, accent or lines used.'],
    watchScene: ['看你們隊友演出，這段不能替隊友按導演指令。', "Watch your teammates — you can't direct your own team."],
    reportedLines: ['被回報的台詞', 'Reported lines'], hide: ['隱藏', 'Hide'], thirdPerson: ['卡住時可以換演員，或改成第三人稱敘述。', 'If stuck: swap an actor, or narrate in the third person.'],
    // story
    step_share: ['分享', 'Share'], step_ask: ['追問', 'Ask'], step_reply: ['回答', 'Answer'], step_pick: ['點歌', 'Pick a song'], step_confirm: ['確認', 'Confirm'], step_sing: ['唱一段', 'Sing'], step_done: ['完成', 'Done'],
    sharer: ['分享者', 'Storyteller'], interviewer: ['訪問者', 'Interviewer'], yourStory: ['輪到你分享（約 {s} 秒，時間到只是提醒）', 'Your story (about {s} s — the timer only reminds)'],
    doneSharing: ['我分享完了', "I'm done sharing"], askNow: ['根據剛才的內容追問一題', 'Ask one follow-up about what you just heard'],
    doneAsking: ['我問完了', "I've asked"], answerNow: ['回答追問', 'Answer the follow-up'], doneAnswer: ['回答完了', "I've answered"],
    backupQ: ['備用追問（沒靈感才用）', 'Backup question (only if nobody has one)'], suggestQ: ['建議一個追問給訪問者', 'Suggest a follow-up to the interviewer'],
    suggestions: ['大家的建議', 'Suggestions'], yourSuggestion: ['你的建議', 'Your suggestion'],
    proposeSong: ['提議一首歌給 {name}', 'Suggest a song for {name}'], artistOpt: ['歌手（選填）', 'Artist (optional)'], whyOpt: ['為何想到這首（選填）', 'Why this one (optional)'],
    propose: ['提議', 'Suggest'], proposals: ['隊友提議', 'Team suggestions'], pickThis: ['點這首', 'Pick this'], pickOwn: ['或直接輸入一首', 'Or type one'],
    pickFor: ['代表你們隊點一首給 {name}', 'Pick a song for {name} on behalf of your team'], hostPick: ['主持代操作：訪問者失聯時直接點一首', 'Host: pick for an absent interviewer'], waitPick: ['{team}正在幫 {name} 點歌', '{team} is picking a song for {name}'],
    songCard: ['{team}點給 {name}', '{team} → {name}'], selfPicked: ['{name} 自己選的歌', '{name} chose their own song'],
    accept: ['我會這首，開始唱', 'I know it — start'], replace: ['這首不會，請換歌', "Don't know it — another please"], selfPick: ['我自己選一首', "I'll pick my own"],
    skipSinging: ['這次先跳過唱歌', 'Skip singing this time'], singNow: ['唱或哼你熟悉的一小段', 'Sing or hum a part you know'], doneSinging: ['唱完了', 'Done'],
    switchSong: ['換歌／自選', 'Switch song'], waitConfirm: ['等 {name} 確認歌曲', 'Waiting for {name} to confirm'], singingNow: ['{name} 唱一段中', '{name} is singing'],
    echoTitle: ['我也有類似經驗？', 'Got a similar story?'], echoHint: ['可略過。最多一位接棒，簡短分享就好。', 'Optional: at most one person, keep it short.'],
    echoClaim: ['我也有類似經驗', 'I have a similar story'], echoDone: ['分享完了', "I'm done"], echoSkip: ['略過接棒', 'Skip this'], echoBy: ['{name} 接棒分享', '{name} is sharing'],
    storyBoth: ['合作回合：正常走完兩隊號碼都會叫。', 'Co-op round: when it finishes, both numbers are called.'],
    singingOff: ['唱歌內容已關閉：這關只分享與追問。', 'Singing is off: this round is story and follow-up only.'],
    // taboo
    describer: ['描述者', 'Describer'], yourWord: ['描述這個（不能說它和禁詞）', "Describe this (don't say it or the taboo words)"], taboo: ['禁詞', 'Taboo'],
    hit: ['猜中', 'Got it'], foul: ['犯規', 'Foul'], tabooSkip: ['跳過', 'Skip'], guessAloud: ['大聲猜！{name} 正在描述', 'Guess out loud! {name} is describing'],
    tabooRules: ['不能說目標詞、禁詞、直接翻譯、拼字或諧音。', 'No target word, taboo words, direct translation, spelling or sound-alikes.'],
    startTaboo: ['開始描述（{s} 秒）', 'Start describing ({s} s)'], item: ['第 {n} 題', 'Item {n}'], result_hit: ['猜中', 'got it'], result_foul: ['犯規', 'foul'], result_skip: ['跳過', 'skipped'], result_none: ['未完成', 'unfinished'],
    timeUpScore: ['時間到：停止計分，主持核對截止前的結果', "Time's up: scoring stopped — host settles what happened before time"], finishSeg: ['結束這段', 'End this turn'],
    waitTeam: ['這隊在場不足兩人，等待換人或回來', 'This team needs two present players — waiting'],
    // results
    resultTitle: ['關卡結果', 'Challenge result'], result_A: ['A 隊過關', 'Team A wins it'], result_B: ['B 隊過關', 'Team B wins it'], result_BOTH: ['兩隊都過', 'Both teams'], result_NEITHER: ['都沒過', 'Neither'],
    willCall: ['將叫號', 'Will call'], confirmResult: ['確認並叫號', 'Confirm and call'], override: ['更正結果', 'Correct the result'], waitConfirmHost: ['等主持確認結果…', 'Waiting for the host to confirm…'],
    summary: ['回合摘要', 'Round summary'], newLines: ['新增 {n} 條線', '+{n} lines'], noNewLines: ['沒有新線', 'No new lines'], nextRound: ['下一回合', 'Next round'],
    bingoWin: ['{team} BINGO！', '{team} BINGO!'], coWin: ['共同 BINGO！兩隊一起獲勝', 'Shared BINGO! Both teams win'], earlyEnd: ['主持提前結束（沒有勝負）', 'Ended early by the host (no winner)'],
    finalBoards: ['兩隊棋盤', 'Both boards'], newGame: ['再玩一局', 'Play again'], winHelp: ['贏關卡不保證贏賓果——別人的號碼也可能幫你連線。', 'Winning a challenge does not guarantee bingo — any called number marks both boards.'],
    // host tools
    hostTools: ['主持工具', 'Host tools'], pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], plus15: ['+15 秒', '+15 s'], lockNow: ['提前鎖定', 'Lock now'],
    skipCard: ['換題', 'New card'], swap: ['換人', 'Swap'], endGame: ['提前結束', 'End early'], confirmEnd: ['再按一次確認結束', 'Tap again to end'],
    awayToggle: ['暫離／回來', 'Away / back'], hostSeat: ['主持座位', 'Host seat'], hostOnly: ['只主持（不參賽）', 'Host only (not playing)'], log: ['操作紀錄', 'Log'],
    paused: ['暫停中：計時已凍結', 'Paused: timers frozen'], hostOffline: ['主持端暫時離線，操作會在主持回來後處理', 'The host is offline — actions resume when the host is back'],
    reopen: ['重新作答（不洩漏答案）', 'Restart the question (nothing revealed)'],
    err_cooldown: ['剛送出指令，稍後再按', 'A command just went out — try again in a moment'], err_too_late: ['太晚送到，已作廢', 'Arrived too late; dropped'],
    err_queue_full: ['對方台詞排滿了，稍後再送', 'Their lines are full — try later'], err_scene_closing: ['正在收尾，不再收件', 'Wrapping up — not accepting more'],
    err_paused: ['暫停中', 'Paused'], err_duplicate_song: ['本回合已接受過這首', 'Already accepted this round'], err_title_required: ['請先填歌名', 'Enter the title first'],
    err_stale_song: ['歌曲已更新，請看新的點歌', 'The song changed — check the new one'], err_no_host: ['主持端沒有回應，稍後再試', 'The host did not respond — try again'],
    err_offline: ['連線中斷', 'Offline'], err_not_your_role: ['這不是你的角色', "That's not your role"], err_too_long: ['太長了', 'Too long'], err_empty: ['請先輸入內容', 'Type something first'],
    err_generic: ['沒有成功（{code}）', 'That did not go through ({code})'], err_taken: ['已經有人接棒', 'Someone already took it'], err_time_up: ['時間到，交給主持', "Time's up — host decides"],
    err_not_open_yet: ['還沒開放點歌', 'Song picks are not open yet'], err_team_too_small: ['這隊人數不足', 'Not enough players on that team'],
    sent: ['已送出', 'Sent'], chars: ['{n}/{max}', '{n}/{max}'], rulesLine: ['規則', 'Rules'],
    sec: ['{n} 秒', '{n}s'], timers: ['進階：計時微調', 'Advanced: timers'], timersHint: ['試玩用的預設值，可依你們的節奏調整；開始後不再變更。', 'Starting values for a first playtest; adjust to your pace. Fixed once the game starts.'],
    timer_nominate: ['提名', 'Nomination'], timer_guess: ['默契作答', 'Guess answers'], timer_songTurn: ['每次接歌', 'Each song turn'], timer_improv: ['每段演出', 'Each scene'],
    timer_story: ['分享提醒', 'Story reminder'], timer_reply: ['回答提醒', 'Answer reminder'], timer_pick: ['點歌提醒', 'Song pick reminder'], timer_sing: ['唱歌提醒', 'Singing reminder'], timer_taboo: ['禁詞每段', 'Taboo turn'], spectatorNote: ['你是觀眾：可以看公開進度，下局再參賽。', "You're watching: public progress only. You can join next game."],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('bingo', Object.fromEntries(Object.entries(D).map(([k, [zh, en]]) => [k, { zh, en }])));
  // The Hub's site-wide switch decides; a device that never chose one sees
  // this game's interface in Traditional Chinese (spec default).
  function lang() {
    let chosen = null;
    try { chosen = localStorage.getItem('site-lang'); } catch (e) {}
    if (chosen === 'en' || chosen === 'zh') return typeof I18N !== 'undefined' ? I18N.lang : chosen;
    return 'zh';
  }
  function t(key, vars) {
    const pair = D[key];
    let s = pair ? (lang() === 'en' ? pair[1] : pair[0]) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
    return s;
  }
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const LINES = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
  const LINE_IDS = ['r0', 'r1', 'r2', 'r3', 'r4', 'c0', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2'];
  const TEAM_ICON = { A: '◆', B: '●' };
  const teamName = team => team === 'A' ? t('teamA') : team === 'B' ? t('teamB') : t('spectator');
  const teamChip = team => team ? `<span class="bp-team bp-team-${team}"><span aria-hidden="true">${TEAM_ICON[team]}</span> ${esc(teamName(team))}</span>` : `<span class="bp-team bp-team-x">${esc(t('spectator'))}</span>`;
  const resultText = r => t('result_' + r);

  class Card {
    constructor(el, { send, now = () => Date.now(), connected = () => true, stage = false, hostPage = false, banner = null }) {
      this.el = el; this.sendFn = send; this.nowFn = now; this.connected = connected; this.stage = stage; this.hostPage = hostPage; this.banner = banner;
      this.view = null; this.key = ''; this.notes = {}; this.armed = ''; this.composing = false; this.flashTimer = null; this.lastFlash = {};
      this.userOpen = {}; // folds the player opened/closed themselves; others follow the stage
      el.classList.add('bp-root');
      el.innerHTML = '<div class="bp-flash" role="status" aria-live="polite" hidden></div><div class="bp-body"></div>';
      this.flashEl = el.querySelector('.bp-flash'); this.body = el.querySelector('.bp-body');
      this.onClick = event => this.click(event);
      this.onInput = event => this.input(event);
      this.onCompStart = () => { this.composing = true; };
      this.onCompEnd = () => { this.composing = false; if (this.pendingRender) { this.pendingRender = false; this.render(); } };
      el.addEventListener('click', this.onClick);
      el.addEventListener('input', this.onInput);
      el.addEventListener('compositionstart', this.onCompStart);
      el.addEventListener('compositionend', this.onCompEnd);
      this.timer = setInterval(() => this.paint(), 250);
    }
    destroy() {
      clearInterval(this.timer); clearTimeout(this.flashTimer);
      this.el.removeEventListener('click', this.onClick); this.el.removeEventListener('input', this.onInput);
      this.el.removeEventListener('compositionstart', this.onCompStart); this.el.removeEventListener('compositionend', this.onCompEnd);
      this.el.classList.remove('bp-root'); this.el.innerHTML = '';
    }
    now() { return this.nowFn(); }
    update(view) {
      const prev = this.view;
      this.view = view;
      this.flashEvents(prev, view);
      const key = JSON.stringify(view) + '|' + lang() + '|' + this.armed + '|' + JSON.stringify(this.notes);
      if (key === this.key) return this.paint();
      this.key = key;
      if (this.composing) { this.pendingRender = true; return; }
      this.render();
    }
    rerender() { this.key = ''; if (this.view) this.update(this.view); }
    /* ── sending ── */
    async act(type, extra = {}, noteKey) {
      const k = noteKey || type;
      this.notes[k] = { busy: true };
      this.rerender();
      let result;
      try { result = await this.sendFn(type, extra); } catch (e) { result = { error: e.message || 'error' }; }
      const error = result?.error || '';
      this.notes[k] = error ? { error } : { ok: true, at: Date.now() };
      this.rerender();
      setTimeout(() => { if (this.notes[k] && !this.notes[k].busy) { delete this.notes[k]; this.rerender(); } }, error ? 4000 : 2200);
      return error;
    }
    note(key) {
      const n = this.notes[key];
      if (!n) return '';
      if (n.busy) return `<p class="bp-note" role="status">…</p>`;
      if (n.error) return `<p class="bp-note bp-bad" role="alert">${esc(errText(n.error))}</p>`;
      return `<p class="bp-note bp-good" role="status">✓ ${esc(t('sent'))}</p>`;
    }
    busy(key) { return this.notes[key]?.busy ? 'disabled' : ''; }
    /* ── events ── */
    flashEvents(prev, view) {
      const segs = view?.round?.sub?.segs;
      if (view?.round?.type !== 'improv_scene' || !segs) return;
      for (const seg of segs) {
        const events = list(seg.events);
        const latest = events[events.length - 1];
        if (!latest) continue;
        const seenSeq = this.lastFlash[seg.segmentId];
        this.lastFlash[seg.segmentId] = latest.seq;
        if (seenSeq === undefined && !prev) continue;          // first paint after a reload: no replay
        if (seenSeq !== undefined && latest.seq <= seenSeq) continue;
        if (this.now() - latest.at > 6000) continue;            // never replay an old command
        this.flash(latest, view);
      }
    }
    flash(event, view) {
      const who = view.roster.find(p => p.playerNum === event.by);
      this.flashEl.className = 'bp-flash bp-flash-' + event.kind;
      this.flashEl.innerHTML = `<strong>${esc(t('flash_' + event.kind))}</strong><span>${esc(t('by', { name: who?.name || '' }))}</span>`;
      this.flashEl.hidden = false;
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => { this.flashEl.hidden = true; }, 3800);
    }
    input(event) {
      const field = event.target.closest('[data-count]');
      if (field) {
        const out = this.el.querySelector(`[data-counter="${field.dataset.count}"]`);
        if (out) out.textContent = t('chars', { n: Array.from(field.value).length, max: field.maxLength > 0 ? field.maxLength : 120 });
      }
    }
    field(name) { const f = this.el.querySelector(`[data-keep="${name}"]`); return f ? f.value : ''; }
    clearField(name) {
      const f = this.el.querySelector(`[data-keep="${name}"]`); if (f) f.value = '';
      try { sessionStorage.removeItem('bp-draft-' + name); } catch (e) {}
    }
    click(event) {
      const summary = event.target.closest('summary');
      if (summary && summary.parentElement?.dataset?.keep) { this.userOpen[summary.parentElement.dataset.keep] = !summary.parentElement.open; return; }
      const button = event.target.closest('[data-act]');
      if (!button || button.disabled || !this.view) return;
      const act = button.dataset.act, v = this.view, d = button.dataset, round = v.round;
      const num = x => x == null || x === '' ? undefined : Number(x);
      const two = (key, run) => { if (this.armed === key) { this.armed = ''; run(); } else { this.armed = key; this.rerender(); setTimeout(() => { if (this.armed === key) { this.armed = ''; this.rerender(); } }, 4000); } };
      switch (act) {
        case 'ready': return this.act('ready', { ready: d.value === '1' });
        case 'vote': return this.act('vote', { number: num(d.n) }, 'vote');
        case 'gpAnswer': return this.act('gpAnswer', { option: d.option }, 'gp');
        case 'gpGuess': return this.act('gpGuess', { option: d.option }, 'gp');
        case 'songSubmit': {
          const title = this.field('song-title');
          const mode = this.el.querySelector('input[name="bp-song-mode"]:checked')?.value || 'sing';
          return this.act('songSubmit', { turnId: d.turn, title, mode }, 'songSubmit');
        }
        case 'songSuggest': { const title = this.field('song-suggest'); return this.act('songSuggest', { title }, 'songSuggest').then(e => { if (!e) this.clearField('song-suggest'); }); }
        case 'songJudge': {
          const title = this.field('judge-title');
          return this.act('songJudge', { turnId: d.turn, verdict: d.verdict, title: title || undefined }, 'songJudge').then(e => { if (!e) this.clearField('judge-title'); });
        }
        case 'songCorrect': return this.act('songCorrect', { turnId: d.turn, verdict: d.verdict }, 'songCorrect');
        case 'imStart': return this.act('imStart', { segmentId: d.seg }, 'imStart');
        case 'imCmd': return this.act('imCmd', { segmentId: d.seg, kind: d.kind }, 'imCmd');
        case 'imLine': {
          const text = this.field('line-text');
          const target = num(this.el.querySelector('input[name="bp-line-target"]:checked')?.value);
          if (!target) { this.notes.imLine = { error: 'pick_target' }; return this.rerender(); }
          return this.act('imLine', { segmentId: d.seg, target, text }, 'imLine').then(e => { if (!e) this.clearField('line-text'); });
        }
        case 'imLineResolve': return this.act('imLineResolve', { segmentId: d.seg, lineId: d.line, action: d.action }, 'line-' + d.line);
        case 'imLineCancel': return this.act('imLineCancel', { segmentId: d.seg, lineId: d.line }, 'line-' + d.line);
        case 'imLineHide': return this.act('imLineHide', { lineId: d.line }, 'hide');
        case 'imExtend': return this.act('imExtend', { segmentId: d.seg }, 'host');
        case 'imJudge': return this.act('imJudge', { segmentId: d.seg, complete: d.value === '1' }, 'host');
        case 'stAdvance': return this.act('stAdvance', { cycleId: d.cycle, from: d.from }, 'st');
        case 'stSuggestQ': return this.act('stSuggestQ', { cycleId: d.cycle, text: this.field('st-q') }, 'stQ');
        case 'stPropose': {
          const extra = { cycleId: d.cycle, title: this.field('st-song'), artist: this.field('st-artist'), reason: this.field('st-why') };
          return this.act('stPropose', extra, 'stPropose').then(e => { if (!e) ['st-song', 'st-artist', 'st-why'].forEach(f => this.clearField(f)); });
        }
        case 'stPick': {
          const extra = d.proposal ? { cycleId: d.cycle, proposalId: d.proposal } : { cycleId: d.cycle, title: this.field('st-pick-title'), artist: this.field('st-pick-artist'), reason: this.field('st-pick-why') };
          return this.act('stPick', extra, 'stPick').then(e => { if (!e) ['st-pick-title', 'st-pick-artist', 'st-pick-why'].forEach(f => this.clearField(f)); });
        }
        case 'stConfirm': {
          const extra = { cycleId: d.cycle, action: d.action, version: num(d.version) };
          if (d.action === 'self') { extra.title = this.field('st-self'); extra.artist = this.field('st-self-artist'); }
          return this.act('stConfirm', extra, 'stConfirm').then(e => { if (!e && d.action === 'self') { this.clearField('st-self'); this.clearField('st-self-artist'); } });
        }
        case 'stEcho': return this.act('stEcho', { done: d.done === '1' }, 'echo');
        case 'stEchoSkip': return this.act('stEchoSkip', {}, 'host');
        case 'tbStart': return this.act('tbStart', { segmentId: d.seg }, 'tb');
        case 'tbMark': return this.act('tbMark', { segmentId: d.seg, idx: num(d.idx), result: d.result }, 'tb');
        case 'tbFinish': return this.act('tbFinish', { segmentId: d.seg }, 'host');
        case 'tbCorrect': return this.act('tbCorrect', { segmentId: d.seg, idx: num(d.idx), result: d.result }, 'host');
        case 'gpTalkDone': return this.act('gpTalkDone', {}, 'host');
        case 'gpReopen': return this.act('gpReopen', {}, 'host');
        case 'beginChallenge': return this.act('beginChallenge', {}, 'host');
        case 'confirmResult': return this.act('confirmResult', { version: round?.version }, 'host');
        case 'setResult': return this.act('setResult', { result: d.result || null }, 'host');
        case 'nextRound': return this.act('nextRound', {}, 'host');
        case 'newGame': return this.act('newGame', {}, 'host');
        case 'pause': return this.act(v.paused ? 'resume' : 'pause', {}, 'host');
        case 'extend': return this.act('extend', { seconds: 15 }, 'host');
        case 'lockNow': return this.act('lockNow', {}, 'host');
        case 'skipCard': return two('skipCard', () => this.act('skipCard', {}, 'host'));
        case 'swapRole': return this.act('swapRole', { team: d.team, role: d.role || undefined, slot: num(d.slot) }, 'host');
        case 'setAway': return this.act('setAway', { playerNum: num(d.player), away: d.away === '1' }, 'host');
        case 'endGame': return two('endGame', () => this.act('endGame', {}, 'host'));
        case 'setHost': return this.act('setHost', { playerNum: num(d.player) || 0 }, 'host');
        case 'start': return this.act('start', {}, 'host');
        case 'autoTeams': return this.act('autoTeams', {}, 'host');
        case 'setTeam': return this.act('setTeam', { playerNum: num(d.player), team: d.team === '-' ? null : d.team }, 'host');
        case 'setting': {
          const settings = {};
          if (d.key.startsWith('t.')) settings.t = { [d.key.slice(2)]: Number(d.value) };
          else if (d.key === 'targetLines' || d.key === 'songTurns') settings[d.key] = Number(d.value);
          else if (d.key === 'singing' || d.key === 'resetTimers') settings[d.key] = d.value === '1';
          else settings[d.key] = d.value;
          return this.act('setSettings', { settings }, 'host');
        }
        default: return undefined;
      }
    }
    /* ── render with input preservation ── */
    render() {
      const keep = {};
      const active = document.activeElement;
      for (const f of this.body.querySelectorAll('[data-keep]')) {
        const k = f.dataset.keep;
        if (f.tagName === 'DETAILS') continue;
        else if (f.type === 'radio' || f.type === 'checkbox') keep[k] = { checked: f.checked, focus: f === active };
        else if ('value' in f) keep[k] = { value: f.value, focus: f === active, s: f.selectionStart, e: f.selectionEnd };
      }
      this.el.dataset.surface = this.stage ? 'stage' : 'player';
      this.el.dataset.phase = this.view?.phase || '';
      this.body.innerHTML = this.html();
      for (const f of this.body.querySelectorAll('[data-keep]')) {
        const k = f.dataset.keep, saved = keep[k];
        if (f.tagName === 'DETAILS') { if (k in this.userOpen) f.open = this.userOpen[k]; continue; }
        if (f.type === 'radio' || f.type === 'checkbox') { if (saved) f.checked = saved.checked; if (saved?.focus) f.focus({ preventScroll: true }); continue; }
        if (saved && saved.value != null) f.value = saved.value;
        else if (!saved && 'value' in f) { try { const draft = sessionStorage.getItem('bp-draft-' + k); if (draft) f.value = draft; } catch (e) {} }
        if (f.dataset.count) this.input({ target: f });
        if (saved?.focus) { f.focus({ preventScroll: true }); try { f.setSelectionRange(saved.s, saved.e); } catch (e) {} }
      }
      for (const f of this.body.querySelectorAll('input[data-keep], textarea[data-keep]')) {
        f.addEventListener('input', () => { try { sessionStorage.setItem('bp-draft-' + f.dataset.keep, f.value); } catch (e) {} });
      }
      this.paint();
    }
    paint() {
      const v = this.view;
      if (!v) return;
      const clock = v.round?.clock;
      for (const node of this.body.querySelectorAll('[data-clock]')) {
        let left = null;
        if (clock) left = clock.frozen != null ? clock.frozen : clock.endsAt != null ? Math.max(0, clock.endsAt - this.now()) : null;
        const secs = left == null ? '' : Math.ceil(left / 1000);
        node.textContent = secs === '' ? '' : this.timeLabel(secs);
        node.closest('.bp-clock')?.classList.toggle('bp-clock-out', left === 0 || clock?.expired === true);
      }
      for (const node of this.body.querySelectorAll('[data-cooldown]')) {
        const seg = list(v.round?.sub?.segs).find(s => s.current);
        const wait = seg ? Math.max(0, (seg.lastCmdAt || 0) + (v.round.sub.cmdGapMs || 2000) - this.now()) : 0;
        node.classList.toggle('bp-cooling', wait > 0);
      }
      const offline = this.el.querySelector('.bp-offline');
      if (offline) offline.hidden = !(this.liveUntil && this.now() > this.liveUntil + 3000) && this.connected();
    }
    setLive(until) { this.liveUntil = until || 0; }
    /* ── html ── */
    html() {
      const v = this.view;
      if (!v) return '';
      const me = v.me, parts = [];
      if (this.banner) parts.push(`<div class="bp-namebar">${this.banner()}</div>`);
      parts.push(`<div class="bp-offline" role="status" hidden>${esc(t('hostOffline'))}</div>`);
      parts.push(this.header());
      if (v.paused) parts.push(`<div class="bp-banner bp-paused" role="status">⏸ ${esc(t('paused'))}</div>`);
      if (me?.spectator && v.phase !== 'lobby') parts.push(`<p class="bp-soft bp-center">${esc(t('spectatorNote'))}</p>`);
      if (v.phase === 'lobby') parts.push(this.lobby());
      else if (v.phase === 'finished') parts.push(this.finished());
      else parts.push(this.round());
      if (this.isHost() && v.phase !== 'playing') parts.push(this.hostTools());
      return parts.join('');
    }
    isHost() { return this.hostPage || this.view?.me?.host === true; }
    header() {
      const v = this.view, me = v.me;
      const lines = v.lines ? `<div class="bp-score" aria-label="${esc(t('lines', { n: '' }))}">
        <span class="bp-score-team bp-team-A">${TEAM_ICON.A} A <b>${v.lines.A}</b></span><span class="bp-score-target">/${v.settings.targetLines}</span>
        <span class="bp-score-team bp-team-B">${TEAM_ICON.B} B <b>${v.lines.B}</b></span></div>` : '';
      const who = me ? `<div class="bp-me">${teamChip(me.team)}${me.host ? `<span class="bp-tag">${esc(t('host'))}</span>` : ''}${me.away ? `<span class="bp-tag">${esc(t('away'))}</span>` : ''}</div>` : '';
      const round = v.round ? `<span class="bp-round-no">${esc(t('round', { n: v.round.no }))} <span>/ ${esc(t('type_' + v.round.type))}</span></span>` : `<span class="bp-round-no">DOUBLE TAKE <span>/ ${esc(t('lobbyTitle'))}</span></span>`;
      return `<header class="bp-head">${round}${who}${lines}</header>${v.phase === 'playing' ? this.journey() : ''}`;
    }
    journey() {
      const stage = this.view.round?.stage;
      const index = stage === 'nominating' ? 0 : ['revealed', 'challenge'].includes(stage) ? 1 : 2;
      return `<ol class="bp-journey" aria-label="${esc(t('roundDetails'))}">${['pickStep', 'playStep', 'markStep'].map((key, i) => `<li class="${i === index ? 'is-current' : i < index ? 'is-done' : ''}" ${i === index ? 'aria-current="step"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${esc(t(key))}</li>`).join('')}</ol>`;
    }
    timeLabel(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
    board(opts = {}) {
      const v = this.view, board = opts.board || v.board;
      if (!board) return '';
      const called = new Set(v.called), done = new Set(opts.lines || v.myLines || []);
      const lit = new Set();
      LINE_IDS.forEach((id, i) => { if (done.has(id)) LINES[i].forEach(c => lit.add(c)); });
      const tally = v.round?.stage === 'nominating' && v.me?.team ? (v.round.nominations[v.me.team]?.tally || {}) : {};
      const mine = v.round?.stage === 'nominating' && v.me?.team ? v.round.nominations[v.me.team]?.mine : null;
      const fresh = new Set(v.round?.stage === 'summary' ? list(v.round.settled?.called) : []);
      const canVote = opts.vote && !v.paused && !v.me?.away;
      const cells = board.map((n, i) => {
        const isCalled = called.has(n), count = tally[n] || 0;
        const cls = ['bp-cell', isCalled ? 'is-called' : '', lit.has(i) ? 'is-line' : '', mine === n ? 'is-mine' : '', fresh.has(n) ? 'is-fresh' : ''].filter(Boolean).join(' ');
        const label = `${n}${isCalled ? ' ✓' : ''}${count ? ` (${count})` : ''}`;
        const inner = `<span class="bp-n">${n}</span>${count ? `<span class="bp-votes" aria-hidden="true">${count}</span>` : ''}`;
        return canVote && !isCalled
          ? `<button type="button" class="${cls}" data-act="vote" data-n="${n}" aria-label="${esc(label)}" aria-pressed="${mine === n}">${inner}</button>`
          : `<div class="${cls}" role="img" aria-label="${esc(label)}">${inner}</div>`;
      }).join('');
      return `<div class="bp-board ${opts.team ? 'bp-board-' + opts.team : ''}">${cells}</div>`;
    }
    calledStrip() {
      const v = this.view, set = new Set(v.called);
      const nums = Array.from({ length: 25 }, (_, i) => i + 1).map(n => `<span class="bp-ball ${set.has(n) ? 'is-on' : ''}" aria-hidden="${!set.has(n)}">${n}</span>`).join('');
      return `<div class="bp-called"><span class="bp-label">${esc(t('called'))} · ${v.called.length}</span><div class="bp-balls" aria-label="${esc(t('called'))}: ${esc(v.called.join(', ') || t('none'))}">${nums}</div></div>`;
    }
    name(n) { return this.view.roster.find(p => p.playerNum === n)?.name || ('#' + n); }
    who(n) {
      const p = this.view.roster.find(x => x.playerNum === n);
      if (!p) return '';
      const me = this.view.me?.playerNum === n;
      return `<span class="bp-who bp-who-${p.team || 'x'}">${esc(p.name)}${me ? ` <small>(${esc(t('you'))})</small>` : ''}</span>`;
    }
    clock(label) { return `<span class="bp-clock"><span data-clock></span>${label ? ` <small>${esc(label)}</small>` : ''}</span>`; }
    /* ── lobby ── */
    lobby() {
      const v = this.view, me = v.me, host = this.isHost(), s = v.settings;
      const teamList = team => `<div class="bp-teamcol bp-teamcol-${team || 'x'}"><h3>${teamChip(team)}</h3><ul>${v.roster.filter(p => p.team === team).map(p => `
        <li><span>${esc(p.name)}${p.ready ? ` <span class="bp-ok" aria-label="${esc(t('readyMark'))}">✓</span>` : ''}${p.away ? ` <small>${esc(t('away'))}</small>` : ''}${v.hostPlayerNum === p.playerNum ? ` <small class="bp-tag">${esc(t('host'))}</small>` : ''}</span>
        ${host ? `<span class="bp-mini">${['A', 'B', '-'].filter(x => (x === '-' ? null : x) !== team).map(x => `<button type="button" class="bp-btn bp-xs" data-act="setTeam" data-player="${p.playerNum}" data-team="${x}">${esc(x === '-' ? t('toWatch') : t(x === 'A' ? 'toA' : 'toB'))}</button>`).join('')}</span>` : ''}</li>`).join('') || '<li class="bp-soft">—</li>'}</ul></div>`;
      const opt = (key, value, label, current) => `<button type="button" class="bp-btn bp-seg ${String(current) === String(value) ? 'is-on' : ''}" aria-pressed="${String(current) === String(value)}" data-act="setting" data-key="${key}" data-value="${value}">${esc(label)}</button>`;
      const timers = `<details class="bp-sub" data-keep="timers"><summary>${esc(t('timers'))}</summary><p class="bp-soft">${esc(t('timersHint'))}</p>
        <button type="button" class="bp-btn bp-xs" data-act="setting" data-key="resetTimers" data-value="1">${esc(t('resetTimers'))}</button>
        ${['nominate', 'guess', 'songTurn', 'improv', 'story', 'reply', 'pick', 'sing', 'taboo'].map(k => {
          const step = k === 'nominate' ? 5 : 15;
          const [min, max] = v.timerLimits?.[k] || [0, 3600];
          const lower = Math.max(min, s.t[k] - step), upper = Math.min(max, s.t[k] + step);
          return `<div class="bp-setrow bp-timer"><span>${esc(t('timer_' + k))} <b>${this.timeLabel(s.t[k])}</b></span>
            <button type="button" class="bp-btn bp-xs" data-act="setting" data-key="t.${k}" data-value="${lower}" ${lower === s.t[k] ? 'disabled' : ''} aria-label="${esc(t('timer_' + k))} −${s.t[k] - lower}">−${s.t[k] - lower}s</button>
            <button type="button" class="bp-btn bp-xs" data-act="setting" data-key="t.${k}" data-value="${upper}" ${upper === s.t[k] ? 'disabled' : ''} aria-label="${esc(t('timer_' + k))} +${upper - s.t[k]}">+${upper - s.t[k]}s</button></div>`;
        }).join('')}</details>`;
      const settings = host ? `<div class="bp-settings"><h3>${esc(t('settingsHeading'))}</h3>
        <div class="bp-setrow"><span>${esc(t('qLang'))}</span>${opt('qLang', 'zh', t('zh'), s.qLang)}${opt('qLang', 'en', t('en'), s.qLang)}</div>
        <div class="bp-setrow"><span>${esc(t('target', { n: s.targetLines }))}</span>${opt('targetLines', 3, t('standard'), s.targetLines)}${opt('targetLines', 2, t('quick'), s.targetLines)}</div>
        <div class="bp-setrow"><span>${esc(t('songTurns'))}</span>${[2, 3, 4, 5, 6].map(n => opt('songTurns', n, String(n), s.songTurns)).join('')}</div>
        <div class="bp-setrow"><span>${esc(t('singing'))}</span>${opt('singing', '1', t('on'), s.singing ? '1' : '0')}${opt('singing', '0', t('off'), s.singing ? '1' : '0')}</div>
        <p class="bp-soft">${esc(t('timingSummary', { scene: this.timeLabel(s.t.improv), story: this.timeLabel(s.t.story) }))}</p>
        ${timers}
        <details class="bp-sub" data-keep="lobby-admin"><summary>${esc(t('moreSettings'))}</summary>
          <div class="bp-setrow"><span>${esc(t('sceneLang'))}</span>${['en', 'zh', 'tw'].map(l => opt('sceneLang', l, t('lang_' + l), s.sceneLang)).join('')}</div>
          <div class="bp-setrow"><span>${esc(t('hostSeat'))}</span>${[{ playerNum: 0, name: t('hostOnly') }, ...v.roster].map(p => `<button type="button" class="bp-btn bp-seg ${v.hostPlayerNum === p.playerNum ? 'is-on' : ''}" aria-pressed="${v.hostPlayerNum === p.playerNum}" data-act="setHost" data-player="${p.playerNum}">${esc(p.name)}</button>`).join('')}</div>
        </details>
        ${v.startProblem ? `<p class="bp-note bp-bad">${esc(t('startProblem_' + v.startProblem))}</p>` : ''}${this.note('host')}
      </div>` : `<ul class="bp-facts"><li>${esc(t('target', { n: s.targetLines }))}</li><li>${esc(t('qLang'))} · ${esc(s.qLang === 'zh' ? t('zh') : t('en'))}</li><li>${esc(t('songTurns'))} · ${s.songTurns}</li><li>${esc(t('singing'))} · ${esc(s.singing ? t('on') : t('off'))}</li></ul>`;
      const teams = host || !me?.team
        ? `<div class="bp-teams">${teamList('A')}${teamList('B')}${v.roster.some(p => !p.team) ? teamList(null) : ''}</div>`
        : `<div class="bp-teams">${teamList(me.team)}</div><details class="bp-sub" data-keep="other-teams"><summary>${esc(t('otherPlayers'))}</summary><div class="bp-teams">${teamList(me.team === 'A' ? 'B' : 'A')}${v.roster.some(p => !p.team) ? teamList(null) : ''}</div></details>`;
      return `<section class="bp-panel bp-lobby">
        <div class="bp-lobby-top"><h2>${esc(t('lobbyHeading'))}</h2>${host ? `<button type="button" class="bp-btn bp-primary bp-lobby-start" data-act="start" ${v.startProblem ? 'disabled' : ''}>${esc(t('start'))} →</button>` : ''}<ol class="bp-howto">${['pickStep', 'playStep', 'markStep'].map((key, i) => `<li><span>0${i + 1}</span>${esc(t(key))}</li>`).join('')}</ol></div>
        ${me?.team ? `<div class="bp-lobby-action"><button type="button" class="bp-btn ${me.ready ? '' : 'bp-primary'}" data-act="ready" data-value="${me.ready ? '0' : '1'}">${me.ready ? '✓ ' : ''}${esc(me.ready ? t('notReady') : t('ready'))}</button><span class="bp-soft">${esc(t('waitingStart'))}</span></div>` : ''}
        <div class="bp-lobby-layout"><div class="bp-lobby-roster"><div class="bp-section-head"><h3>${esc(t('teamsHeading'))}</h3>${host ? `<button type="button" class="bp-btn bp-xs bp-quiet" data-act="autoTeams">↻ ${esc(t('shuffle'))}</button>` : ''}</div>${teams}</div>${settings}</div>
      </section>`;
    }
    /* ── a round ── */
    round() {
      const v = this.view, r = v.round;
      if (!r) return '';
      const parts = [];
      const typeLine = `<div class="bp-type bp-type-${r.type}"><strong>${esc(t('type_' + r.type))}</strong><span>${esc(t('typeHint_' + r.type))}</span></div>`;
      if (r.stage === 'nominating') parts.push(this.nominating(typeLine));
      else {
        // Full reveal only before the challenge; afterwards one compact line so
        // prompts, lines and songs keep the space.
        if (r.stage === 'revealed') parts.push(this.reveal(typeLine));
        if (r.stage === 'challenge') parts.push(this.challenge());
        if (r.stage === 'result') parts.push(this.result());
        if (r.stage === 'summary') parts.push(this.summary());
      }
      const supporting = [];
      if (!['nominating', 'revealed'].includes(r.stage)) supporting.push(this.nomStrip());
      if (v.board && r.stage !== 'nominating') {
        const open = r.stage === 'summary';
        supporting.push(`<details class="bp-panel bp-boardbox" data-keep="board-${r.stage === 'summary' ? 'summary' : 'play'}" ${open ? 'open' : ''}><summary>${esc(t('showBoard'))} · ${esc(t('lines', { n: (v.myLines || []).length }))}</summary>${this.board()}<p class="bp-soft">${esc(t('boardPrivate'))}</p></details>`);
      }
      supporting.push(`<details class="bp-sub bp-calledbox" data-keep="called-history"><summary>${esc(t('called'))} · ${v.called.length}</summary>${this.calledStrip()}</details>`);
      if (this.isHost()) supporting.push(this.hostTools());
      return `<div class="bp-game-layout"><div class="bp-main-column">${parts.join('')}</div><aside class="bp-round-aside" aria-label="${esc(t('roundDetails'))}">${supporting.join('')}</aside></div>`;
    }
    nominating(typeLine) {
      const v = this.view, r = v.round, me = v.me, nom = r.nominations;
      const status = ['A', 'B'].map(team => `<span class="bp-pill bp-team-${team}">${TEAM_ICON[team]} ${esc(t('teamVoted', { v: nom[team].voted, of: nom[team].of }))}</span>`).join('');
      if (!me?.team) {
        return `<section class="bp-panel bp-nominate"><h2>${esc(t('nominateTitle'))} ${this.clock()}</h2>${typeLine}<p class="bp-big">${esc(t('spectatorWait'))}</p><div class="bp-pills">${status}</div></section>`;
      }
      const mine = nom[me.team], opp = nom[me.team === 'A' ? 'B' : 'A'];
      return `<section class="bp-panel bp-nominate">
        <h2>${esc(t('nominateTitle'))} ${this.clock()}</h2>
        <p class="bp-help">${esc(t('nominateHelp'))}</p>
        ${this.board({ vote: true })}
        <div class="bp-pills"><span class="bp-pill bp-pill-me">${esc(mine.mine ? t('myVote', { n: mine.mine }) : t('noVote'))}</span>
          <span class="bp-pill bp-team-${me.team}">${esc(t('teamVoted', { v: mine.voted, of: mine.of }))}</span>
          <span class="bp-pill">${esc(t('oppVoted', { v: opp.voted, of: opp.of }))}</span></div>
        ${this.note('vote')}${typeLine}
      </section>`;
    }
    reveal(typeLine) {
      const v = this.view, r = v.round, nom = r.nominations, card = r.card || {};
      const same = nom.A.pick === nom.B.pick;
      const pick = team => `<div class="bp-nom bp-team-${team}"><span>${teamChip(team)}</span><b class="bp-nom-n">${nom[team].pick}</b>${nom[team].auto ? `<small class="bp-tag">${esc(t('autoPick'))}</small>` : ''}${nom[team].tied ? `<small class="bp-tag">${esc(t('tied'))}</small>` : ''}</div>`;
      const roles = this.rolesLine();
      const begin = r.stage === 'revealed' ? (this.isHost()
        ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="beginChallenge">${esc(t('beginChallenge'))}</button></div>${this.note('host')}`
        : `<p class="bp-soft bp-center">${esc(t('waitHostBegin'))}</p>`) : '';
      return `<section class="bp-panel bp-reveal">
        ${typeLine}
        <div class="bp-noms">${pick('A')}${pick('B')}</div>
        ${same ? `<p class="bp-soft bp-center">${esc(t('sameNumber'))}</p>` : ''}
        <p class="bp-soft bp-center">${esc(t('fallbackNote', { team: teamName(r.fallbackTeam) }))}</p>
        ${card.title ? `<div class="bp-cardtext"><h3>${esc(card.title)}</h3><p class="bp-prompt">${esc(card.prompt)}</p></div>` : ''}
        ${roles}${begin}
      </section>`;
    }
    nomStrip() {
      const r = this.view.round, nom = r.nominations;
      return `<div class="bp-nomstrip" aria-label="${esc(t('nominations'))}"><span class="bp-label">${esc(t('nominations'))}</span>
        ${['A', 'B'].map(team => `<span class="bp-pill bp-team-${team}">${TEAM_ICON[team]} ${team} <b>${nom[team].pick}</b>${nom[team].auto ? ` · ${esc(t('autoPick'))}` : ''}</span>`).join('')}
        <small class="bp-soft">${esc(t('fallbackNote', { team: teamName(r.fallbackTeam) }))}</small></div>`;
    }
    rolesLine() {
      const r = this.view.round, roles = r.roles || {}, out = [];
      if (r.type === 'guess_person') ['A', 'B'].forEach(team => out.push(`${teamChip(team)} ${esc(t('protagonist'))}：${this.who(roles.protagonist?.[team])}`));
      if (r.type === 'improv_scene') ['A', 'B'].forEach(team => out.push(`${teamChip(team)} ${esc(t('actorsAre'))}：${list(roles.actors?.[team]).map(n => this.who(n)).join('、')}`));
      if (r.type === 'story_exchange') ['A', 'B'].forEach(team => out.push(`${teamChip(team)} ${esc(t('sharer'))}：${this.who(roles.sharer?.[team])} · ${esc(t('interviewer'))}：${this.who(roles.interviewer?.[team])}`));
      if (r.type === 'taboo_description') ['A', 'B'].forEach(team => out.push(`${teamChip(team)} ${esc(t('describer'))}：${this.who(roles.describer?.[team])}`));
      return out.length ? `<ul class="bp-roles" aria-label="${esc(t('roles'))}">${out.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
    }
    challenge() {
      const type = this.view.round.type;
      if (type === 'guess_person') return this.guess();
      if (type === 'song_relay') return this.song();
      if (type === 'improv_scene') return this.improv();
      if (type === 'story_exchange') return this.story();
      if (type === 'taboo_description') return this.taboo();
      return '';
    }
    /* ── guess_person ── */
    guess() {
      const v = this.view, r = v.round, sub = r.sub, me = v.me, card = r.card, host = this.isHost();
      const prot = r.roles.protagonist;
      const opts = (act, chosen) => `<div class="bp-options">${card.options.map(o => `<button type="button" class="bp-btn bp-option ${chosen === o.id ? 'is-on' : ''}" aria-pressed="${chosen === o.id}" data-act="${act}" data-option="${o.id}" ${v.paused ? 'disabled' : ''}>${esc(o.text)}</button>`).join('')}</div>`;
      let body = '';
      if (sub.stage === 'answer') {
        if (me?.team && prot[me.team] === me.playerNum) body = `<h3 class="bp-role-call">${esc(t('youAreProtagonist'))}</h3>${opts('gpAnswer', sub.myAnswer)}<p class="bp-soft">${esc(t('privateAnswer'))}</p>${this.note('gp')}`;
        else if (sub.canGuess) body = `<h3 class="bp-role-call">${esc(t('guessFor', { name: this.name(prot[me.team]) }))}</h3>${opts('gpGuess', sub.myGuess)}${this.note('gp')}`;
        else body = `<p class="bp-big">${esc(t('answering', { a: this.name(prot.A), b: this.name(prot.B) }))}</p>`;
        body += `<div class="bp-pills">${['A', 'B'].map(team => `<span class="bp-pill bp-team-${team}">${TEAM_ICON[team]} ${esc(t('protagonist'))}：${esc(sub.answered[team] ? t('answered') : t('notAnswered'))} · ${esc(t('guessProgress', { team: '', v: sub.guessedCount[team], of: sub.eligibleCount[team] }))}</span>`).join('')}</div>`;
      } else if (sub.stage === 'blocked') {
        body = `<p class="bp-banner bp-warn">${esc(t('blocked'))}</p>`;
      } else if (sub.stage === 'reveal') {
        const optText = id => card.options.find(o => o.id === id)?.text || '—';
        body = `<div class="bp-reveal-grid">${['A', 'B'].map(team => {
          const guessers = v.roster.filter(p => p.team === team && p.playerNum !== prot[team] && sub.guesses[p.playerNum] !== undefined);
          return `<div class="bp-reveal-team bp-team-${team}"><h4>${teamChip(team)} ${this.who(prot[team])}</h4><p class="bp-answer">${esc(optText(sub.answers[team]))}</p>
            <p class="bp-ratio">${esc(t('hitRatio', { team: '', hit: sub.hits[team].hit, of: sub.hits[team].of }))}</p>
            <ul class="bp-guesslist">${guessers.map(p => `<li>${sub.guesses[p.playerNum] === sub.answers[team] ? '✓' : '✗'} ${esc(p.name)}：${esc(optText(sub.guesses[p.playerNum]))}</li>`).join('')}</ul></div>`;
        }).join('')}</div>
        <p class="bp-preview">${esc(resultText(sub.preview))}</p>
        <div class="bp-followup"><strong>${esc(t('followUp'))}</strong><p>${esc(sub.followUp)}</p></div><p class="bp-soft">${esc(t('talkHint'))}</p>
        ${host ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary" data-act="gpTalkDone">${esc(t('talkDone'))}</button></div>` : ''}`;
      }
      return `<section class="bp-panel bp-challenge bp-guess"><h2>${esc(t('type_guess_person'))} ${sub.stage === 'answer' ? this.clock() : ''}</h2>
        <p class="bp-prompt">${esc(card.prompt)}</p>${body}</section>`;
    }
    /* ── song_relay ── */
    song() {
      const v = this.view, r = v.round, sub = r.sub, me = v.me, host = this.isHost();
      const turn = sub.turns[sub.cur];
      const strip = sub.turns.map((x, i) => `<li class="bp-turn bp-team-${x.team} is-${x.status} ${i === sub.cur ? 'is-cur' : ''}" title="${esc(x.title || '')}">
        <span>${TEAM_ICON[x.team]}${x.team}${x.idx}</span><small>${x.performer ? esc(this.name(x.performer)) : ''}</small><b aria-label="${esc(t('status_' + x.status))}">${x.status === 'valid' ? '✓' : x.status === 'invalid' ? '✗' : x.status === 'skipped' ? '⤼' : x.status === 'live' ? '♪' : ''}</b></li>`).join('');
      let body = '';
      if (turn) {
        const mineTurn = me?.playerNum === turn.performer;
        body += `<div class="bp-now bp-team-${turn.team}"><strong>${esc(t('nowSinging', { name: this.name(turn.performer) }))}</strong> ${this.clock(turn.timeUp ? t('timeUpSoft') : '')}</div>`;
        if (mineTurn) {
          body += `<div class="bp-mine"><h3 class="bp-role-call">${esc(t('yourTurnSing'))}</h3><p class="bp-soft">${esc(t('altOption'))}</p>
            <fieldset class="bp-radios"><label><input type="radio" name="bp-song-mode" value="sing" data-keep="song-mode-sing" ${turn.mode !== 'alt' ? 'checked' : ''}> ${esc(t('modeSing'))}</label><label><input type="radio" name="bp-song-mode" value="alt" data-keep="song-mode-alt" ${turn.mode === 'alt' ? 'checked' : ''}> ${esc(t('modeAlt'))}</label></fieldset>
            <label class="bp-field"><span>${esc(t('songTitle'))}</span><input type="text" maxlength="80" data-keep="song-title" autocomplete="off" enterkeyhint="send"></label>
            <button type="button" class="bp-btn bp-primary" data-act="songSubmit" data-turn="${esc(turn.turnId)}" ${this.busy('songSubmit')}>${esc(t('sendTitle'))}</button>
            ${turn.title ? `<p class="bp-soft">${esc(t('sentTitle', { t: turn.title }))}</p>` : ''}${this.note('songSubmit')}</div>`;
        } else if (turn.title) body += `<p class="bp-songtitle">♪ ${esc(turn.title)} <small>${esc(turn.mode === 'alt' ? t('modeAlt') : t('modeSing'))}</small></p>`;
        if (turn.dup) body += `<p class="bp-note bp-bad">${esc(t('duplicate'))}</p>`;
        if (me?.team && !me.spectator) {
          body += `<details class="bp-sub" data-keep="suggest-open" ${me.team === turn.team && !mineTurn ? 'open' : ''}><summary>${esc(t('suggest'))}</summary><p class="bp-soft">${esc(t('suggestHint'))}</p>
            <div class="bp-inline"><input type="text" maxlength="80" data-keep="song-suggest" aria-label="${esc(t('suggest'))}" autocomplete="off"><button type="button" class="bp-btn" data-act="songSuggest" ${this.busy('songSuggest')}>${esc(t('send'))}</button></div>
            ${this.note('songSuggest')}<ul class="bp-chips">${list(sub.suggestions).slice().reverse().map(s => `<li>${esc(s.title)} <small>${esc(this.name(s.by))}</small></li>`).join('')}</ul></details>`;
        }
        if (host) {
          body += `<div class="bp-hostbox"><h4>${esc(t('judge'))} · ${TEAM_ICON[turn.team]}${turn.team}${turn.idx}</h4>
            <label class="bp-field"><span>${esc(t('songTitle'))}</span><input type="text" maxlength="80" data-keep="judge-title" placeholder="${esc(turn.title || '')}" autocomplete="off"></label>
            <div class="bp-actions"><button type="button" class="bp-btn bp-good-btn" data-act="songJudge" data-turn="${esc(turn.turnId)}" data-verdict="valid" ${this.busy('songJudge')}>${esc(t('valid'))}</button>
            <button type="button" class="bp-btn" data-act="songJudge" data-turn="${esc(turn.turnId)}" data-verdict="invalid" ${this.busy('songJudge')}>${esc(t('invalid'))}</button>
            <button type="button" class="bp-btn" data-act="songJudge" data-turn="${esc(turn.turnId)}" data-verdict="skipped" ${this.busy('songJudge')}>${esc(t('skip'))}</button>
            <button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${turn.team}">${esc(t('swap'))}</button></div>${this.note('songJudge')}</div>`;
        }
      }
      const accepted = sub.accepted.length ? `<div class="bp-accepted"><span class="bp-label">${esc(t('accepted'))}</span><ul class="bp-chips">${sub.accepted.map(s => `<li class="bp-team-${s.team}">${TEAM_ICON[s.team]} ${esc(s.title)}</li>`).join('')}</ul></div>` : '';
      return `<section class="bp-panel bp-challenge bp-song"><h2>${esc(t('type_song_relay'))}</h2>
        <div class="bp-cardtext"><span class="bp-label">${esc(t('songTheme'))}</span><p class="bp-prompt">${esc(r.card.prompt)}</p><p class="bp-soft">${esc(r.card.rule)}</p></div>
        <div class="bp-pills"><span class="bp-pill bp-team-A">${TEAM_ICON.A} A ${esc(t('score', { n: sub.scores.A }))}</span><span class="bp-pill bp-team-B">${TEAM_ICON.B} B ${esc(t('score', { n: sub.scores.B }))}</span></div>
        ${body}<details class="bp-sub" data-keep="turn-order"><summary>${esc(t('turnOrder'))} · ${sub.cur + 1}/${sub.turns.length}</summary><ol class="bp-turns" aria-label="${esc(t('turnOrder'))}">${strip}</ol>${accepted}</details>${host ? this.songCorrections() : ''}</section>`;
    }
    songCorrections() {
      const sub = this.view.round.sub, done = sub.turns.filter(x => ['valid', 'invalid', 'skipped'].includes(x.status));
      if (!done.length) return '';
      return `<details class="bp-sub" data-keep="song-corr"><summary>${esc(t('corrections'))}</summary><ul class="bp-corr">${done.map(x => `<li><span>${TEAM_ICON[x.team]}${x.team}${x.idx} ${esc(x.title || '—')} · ${esc(t('status_' + x.status))}</span>
        ${['valid', 'invalid', 'skipped'].filter(s => s !== x.status).map(s => `<button type="button" class="bp-btn bp-xs" data-act="songCorrect" data-turn="${esc(x.turnId)}" data-verdict="${s}">${esc(t(s === 'skipped' ? 'skip' : s))}</button>`).join('')}</li>`).join('')}</ul>${this.note('songCorrect')}</details>`;
    }
    /* ── improv_scene ── */
    improv() {
      const v = this.view, r = v.round, sub = r.sub, me = v.me, host = this.isHost();
      const seg = sub.segs[sub.cur] || sub.segs[sub.segs.length - 1];
      const roles = r.card.roles || [];
      const directing = me?.team && me.team !== seg.team && !me.away;
      const acting = seg.actors.includes(me?.playerNum);
      const langBadge = `<span class="bp-lang bp-lang-${seg.lang}"><small>${esc(t('language'))}</small> ${esc(t('lang_' + seg.lang))}</span>`;
      const events = list(seg.events).slice().reverse().slice(0, 6).map(e => `<li class="bp-ev-${e.kind}">${esc(t('cmd_' + e.kind))} <small>${esc(this.name(e.by))}</small></li>`).join('');
      const cast = seg.actors.map((n, i) => `<li>${this.who(n)} — ${esc(roles[i] || '')}${seg.received?.[n] ? ` <span class="bp-tag" title="${esc(t('receivedLine', { name: this.name(n) }))}">✉ ${seg.received[n]}</span>` : ''}</li>`).join('');
      let body = `<div class="bp-scene-status bp-team-${seg.team}"><strong>${esc(t('acting', { team: teamName(seg.team) }))}</strong>${seg.stage === 'live' || seg.stage === 'wrapup' ? this.clock() : ''}${langBadge}</div>
        <ul class="bp-cast">${cast}</ul>`;
      if (seg.stage === 'wrapup') body += `<p class="bp-banner bp-warn">${esc(t('wrapup'))}</p>`;
      if (seg.stage === 'ready') body += `<p class="bp-soft bp-center">${esc(t('readyScene'))}</p>` + (acting || host ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="imStart" data-seg="${esc(seg.segmentId)}" ${this.busy('imStart')}>${esc(t('startScene'))}</button></div>${this.note('imStart')}` : '');
      if (acting) {
        const role = roles[seg.actors.indexOf(me.playerNum)] || '';
        const lines = list(seg.myLines);
        const active = lines.find(l => l.status === 'active'), waiting = lines.filter(l => l.status === 'waiting').length;
        body += `<div class="bp-mine"><h3 class="bp-role-call">${esc(t('youAct', { role }))}</h3>
          ${active ? `<div class="bp-private-line"><span class="bp-label">🔒 ${esc(t('privateLine'))}</span><p class="bp-line-text">${esc(active.text)}</p><p class="bp-soft">${esc(t('privateLineHint'))}</p>
            <div class="bp-actions"><button type="button" class="bp-btn bp-primary" data-act="imLineResolve" data-seg="${esc(seg.segmentId)}" data-line="${esc(active.lineId)}" data-action="done">${esc(t('said'))}</button>
            <button type="button" class="bp-btn" data-act="imLineResolve" data-seg="${esc(seg.segmentId)}" data-line="${esc(active.lineId)}" data-action="skipped">${esc(t('skipLine'))}</button>
            <button type="button" class="bp-btn bp-xs bp-quiet" data-act="imLineResolve" data-seg="${esc(seg.segmentId)}" data-line="${esc(active.lineId)}" data-action="reported">${esc(t('report'))}</button></div>${this.note('line-' + active.lineId)}</div>` : ''}
          ${waiting ? `<p class="bp-soft">${esc(t('moreWaiting', { n: waiting }))}</p>` : ''}</div>`;
      }
      if (directing && ['ready', 'live', 'wrapup'].includes(seg.stage)) body += this.directorPanel(seg);
      else if (me?.team === seg.team && !acting && seg.stage !== 'judged') body += `<p class="bp-soft">${esc(t('watchScene'))}</p>`;
      body += events ? `<ol class="bp-events" aria-label="${esc(t('directorsAre', { team: teamName(seg.team === 'A' ? 'B' : 'A') }))}">${events}</ol>` : '';
      if (host && ['live', 'wrapup'].includes(seg.stage)) {
        body += `<div class="bp-hostbox"><h4>${esc(t('judgeScene'))}</h4><p class="bp-soft">${esc(t('judgeHint'))}</p>
          <div class="bp-actions"><button type="button" class="bp-btn bp-good-btn" data-act="imJudge" data-seg="${esc(seg.segmentId)}" data-value="1">${esc(t('complete'))}</button>
          <button type="button" class="bp-btn" data-act="imJudge" data-seg="${esc(seg.segmentId)}" data-value="0">${esc(t('notComplete'))}</button>
          <button type="button" class="bp-btn" data-act="imExtend" data-seg="${esc(seg.segmentId)}">${esc(t('extend30'))}</button></div>
          <div class="bp-actions">${[0, 1].map(slot => `<button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${seg.team}" data-slot="${slot}">${esc(t('swap'))} ${esc(this.name(seg.actors[slot]))}</button>`).join('')}</div>
          <p class="bp-soft">${esc(t('thirdPerson'))}</p>${this.note('host')}
          ${list(seg.reported).length ? `<p class="bp-label">${esc(t('reportedLines'))}</p><ul class="bp-corr">${seg.reported.map(x => `<li>${esc(this.name(x.target))} <button type="button" class="bp-btn bp-xs" data-act="imLineHide" data-line="${esc(x.lineId)}">${esc(t('hide'))}</button></li>`).join('')}</ul>` : ''}</div>`;
      }
      const judged = sub.segs.filter(s => s.stage === 'judged').map(s => `<span class="bp-pill bp-team-${s.team}">${TEAM_ICON[s.team]} ${esc(s.complete ? t('complete') : t('notComplete'))}</span>`).join('');
      return `<section class="bp-panel bp-challenge bp-improv"><h2>${esc(t('type_improv_scene'))}</h2>
        <div class="bp-cardtext"><span class="bp-label">${esc(t('scene'))}</span><h3>${esc(r.card.title)}</h3><p class="bp-prompt">${esc(r.card.prompt)}</p></div>
        ${judged ? `<div class="bp-pills">${judged}</div>` : ''}${body}</section>`;
    }
    directorPanel(seg) {
      const v = this.view, live = seg.stage === 'live' && !v.paused;
      const buttons = ['new_line', 'speak_mandarin', 'speak_taiwanese', 'speak_english'].map(kind => `<button type="button" class="bp-cmd bp-cmd-${kind}" data-act="imCmd" data-seg="${esc(seg.segmentId)}" data-kind="${kind}" data-cooldown ${live ? '' : 'disabled'}>
        <strong>${esc(t('cmd_' + kind))}</strong><small>${esc(t('cmdSub_' + kind))}</small></button>`).join('');
      const targets = seg.actors.map(n => `<label class="bp-target"><input type="radio" name="bp-line-target" value="${n}" data-keep="line-target-${n}"> ${esc(this.name(n))}</label>`).join('');
      const sent = list(seg.sent).slice().reverse().map(l => `<li><span>→ ${esc(this.name(l.target))} · ${esc(t('line_' + l.status))}${l.text ? `：${esc(l.text)}` : ''}</span>${['active', 'waiting'].includes(l.status) ? `<button type="button" class="bp-btn bp-xs" data-act="imLineCancel" data-seg="${esc(seg.segmentId)}" data-line="${esc(l.lineId)}">${esc(t('cancel'))}</button>` : ''}</li>`).join('');
      const closing = seg.stage === 'wrapup';
      return `<div class="bp-director">
        <div class="bp-cmds">${buttons}</div>${this.note('imCmd')}
        <details class="bp-sub bp-line-composer" data-keep="line-composer"><summary>${esc(t('writeLine'))}</summary><div class="bp-linebox"><label class="bp-field"><span>${esc(t('writeLine'))}</span>
          <textarea maxlength="120" rows="2" data-keep="line-text" data-count="line" ${closing ? 'disabled' : ''}></textarea><small class="bp-counter" data-counter="line">0/120</small></label>
          <fieldset class="bp-radios"><legend>${esc(t('recipient'))}</legend>${targets}</fieldset>
          <button type="button" class="bp-btn bp-primary" data-act="imLine" data-seg="${esc(seg.segmentId)}" ${closing || v.paused ? 'disabled' : ''} ${this.busy('imLine')}>🔒 ${esc(t('sendLine'))}</button>${this.note('imLine')}
          ${sent ? `<details class="bp-sub" data-keep="sent-lines" open><summary>${esc(t('yourLines'))}</summary><ul class="bp-corr">${sent}</ul></details>` : ''}</div></details>
        <details class="bp-sub" data-keep="director-rules"><summary>${esc(t('rulesLine'))}</summary><p class="bp-soft">${esc(t('newLineHelp'))}</p></details>
      </div>`;
    }
    /* ── story_exchange ── */
    story() {
      const v = this.view, r = v.round, sub = r.sub, me = v.me, host = this.isHost();
      const steps = sub.singing ? ['share', 'ask', 'reply', 'pick', 'confirm', 'sing'] : ['share', 'ask', 'reply'];
      const activeCycle = sub.cycles.find(c => c.current);
      const sharing = activeCycle?.stage === 'share';
      const topic = sharing ? `<div class="bp-cardtext"><h3>${esc(r.card.title)}</h3><p class="bp-prompt">${esc(r.card.prompt)}</p><p class="bp-soft">${esc(r.card.safety)}</p></div>`
        : `<details class="bp-sub bp-story-context" data-keep="story-topic-${activeCycle?.cycleId || 'echo'}"><summary>${esc(t('storyTopic'))} · ${esc(r.card.title)}</summary><p class="bp-prompt">${esc(r.card.prompt)}</p><p class="bp-soft">${esc(r.card.safety)}</p></details>`;
      let body = '';
      if (sub.stage === 'echo' || sub.stage === 'done') {
        const echo = sub.echo || {};
        const mine = echo.by === me?.playerNum;
        body = `<div class="bp-echo"><h3>${esc(t('echoTitle'))}</h3><p class="bp-soft">${esc(t('echoHint'))}</p>
          ${echo.by ? `<p class="bp-big">${esc(t('echoBy', { name: this.name(echo.by) }))}</p>` : ''}
          <div class="bp-actions">${!echo.by && me?.team && !sub.cycles.some(c => c.sharer === me.playerNum) ? `<button type="button" class="bp-btn" data-act="stEcho">${esc(t('echoClaim'))}</button>` : ''}
          ${mine || (host && echo.by) ? `<button type="button" class="bp-btn bp-primary" data-act="stEcho" data-done="1">${esc(t('echoDone'))}</button>` : ''}
          ${host ? `<button type="button" class="bp-btn" data-act="stEchoSkip">${esc(t('echoSkip'))}</button>` : ''}</div>${this.note('echo')}${this.note('host')}</div>`;
      }
      const cycles = sub.cycles.slice().sort((a, b) => Number(b.current) - Number(a.current)).map(c => {
        const current = c.current;
        const stepper = `<ol class="bp-steps">${steps.map(s => `<li class="${s === c.stage ? 'is-cur' : steps.indexOf(s) < steps.indexOf(c.stage) || c.stage === 'done' ? 'is-done' : ''}">${esc(t('step_' + s))}</li>`).join('')}</ol>`;
        const head = `<div class="bp-cycle-head bp-team-${c.team}">${teamChip(c.team)} ${esc(t('sharer'))}：${this.who(c.sharer)} · ${esc(t('interviewer'))}：${this.who(c.interviewer)}</div>`;
        const songCard = c.song ? `<div class="bp-songcard"><span class="bp-label">${esc(c.song.source === 'self' ? t('selfPicked', { name: this.name(c.sharer) }) : t('songCard', { team: teamName(c.team === 'A' ? 'B' : 'A'), name: this.name(c.sharer) }))}</span>
          <p class="bp-songtitle">♪ ${esc(c.song.title)}${c.song.artist ? ` <small>／${esc(c.song.artist)}</small>` : ''}</p>${c.song.reason ? `<p class="bp-soft">“${esc(c.song.reason)}”</p>` : ''}</div>` : '';
        if (!current) {
          const outcome = c.stage === 'done' ? `<p class="bp-soft">${c.singResult === 'sang' ? '♪ ' + esc(c.song?.title || '') : c.singResult === 'skipped' ? esc(t('skipSinging')) : ''}</p>` : '';
          return `<details class="bp-sub bp-cycle-secondary" data-keep="cycle-${c.cycleId}"><summary><span>${teamChip(c.team)} ${this.who(c.sharer)} · ${esc(t(c.stage === 'done' ? 'step_done' : 'nextUp'))}</span></summary>${head}${c.stage === 'done' ? songCard + outcome : ''}</details>`;
        }
        const isSharer = me?.playerNum === c.sharer, isInterviewer = me?.playerNum === c.interviewer;
        const picker = me?.team && me.team !== c.team && !me.away;
        let inner = '';
        const adv = (from, label) => `<button type="button" class="bp-btn bp-primary" data-act="stAdvance" data-cycle="${esc(c.cycleId)}" data-from="${from}" ${this.busy('st')}>${esc(label)}</button>`;
        if (c.stage === 'share') {
          if (isSharer) inner += `<p class="bp-role-call">${esc(t('yourStory', { s: v.settings.t.story }))}</p><div class="bp-actions">${adv('share', t('doneSharing'))}</div>`;
          else inner += `<p class="bp-big">${esc(t('step_share'))}：${this.who(c.sharer)} ${this.clock()}</p>`;
        } else if (c.stage === 'ask') {
          if (isInterviewer) inner += `<p class="bp-role-call">${esc(t('askNow'))}</p>
            ${list(c.qSuggest).length ? `<div class="bp-label">${esc(t('suggestions'))}</div><ul class="bp-chips">${c.qSuggest.map(q => `<li>${esc(q.text)} <small>${esc(this.name(q.by))}</small></li>`).join('')}</ul>` : ''}
            <details class="bp-sub" data-keep="backupq"><summary>${esc(t('backupQ'))}</summary><p>${esc(c.backupQ || '')}</p></details>
            <div class="bp-actions">${adv('ask', t('doneAsking'))}</div>`;
          else inner += `<p class="bp-big">${esc(t('step_ask'))}：${this.who(c.interviewer)}</p>`;
        } else if (c.stage === 'reply') {
          if (isSharer) inner += `<p class="bp-role-call">${esc(t('answerNow'))} ${this.clock()}</p><div class="bp-actions">${adv('reply', t('doneAnswer'))}</div>`;
          else inner += `<p class="bp-big">${esc(t('step_reply'))}：${this.who(c.sharer)} ${this.clock()}</p>`;
        } else if (c.stage === 'pick') {
          const ownPick = (keep, open) => `<details class="bp-sub" data-keep="${keep}" ${open ? 'open' : ''}><summary>${esc(keep === 'pick-host' ? t('hostPick') : t('pickOwn'))}</summary>
                <label class="bp-field"><span>${esc(t('songTitle'))}</span><input type="text" maxlength="80" data-keep="st-pick-title" autocomplete="off"></label>
                <label class="bp-field"><span>${esc(t('artistOpt'))}</span><input type="text" maxlength="60" data-keep="st-pick-artist" autocomplete="off"></label>
                <label class="bp-field"><span>${esc(t('whyOpt'))}</span><input type="text" maxlength="120" data-keep="st-pick-why" autocomplete="off"></label>
                <button type="button" class="bp-btn bp-primary" data-act="stPick" data-cycle="${esc(c.cycleId)}" ${this.busy('stPick')}>${esc(t('pickThis'))}</button></details>${this.note('stPick')}`;
          if (isInterviewer) {
            inner += `<p class="bp-role-call">${esc(t('pickFor', { name: this.name(c.sharer) }))} ${this.clock()}</p>
              ${list(c.proposals).length ? `<div class="bp-label">${esc(t('proposals'))}</div><ul class="bp-proposals">${c.proposals.map(p => `<li><span><b>${esc(p.title)}</b>${p.artist ? `／${esc(p.artist)}` : ''} <small>${esc(this.name(p.by))}</small>${p.reason ? `<br><small>“${esc(p.reason)}”</small>` : ''}</span>
                <button type="button" class="bp-btn bp-xs bp-primary" data-act="stPick" data-cycle="${esc(c.cycleId)}" data-proposal="${esc(p.id)}">${esc(t('pickThis'))}</button></li>`).join('')}</ul>` : ''}
              ${ownPick('pick-own', !list(c.proposals).length)}`;
          } else if (picker) {
            inner += `<p class="bp-role-call">${esc(t('proposeSong', { name: this.name(c.sharer) }))} ${this.clock()}</p>
              <label class="bp-field"><span>${esc(t('songTitle'))}</span><input type="text" maxlength="80" data-keep="st-song" autocomplete="off"></label>
              <label class="bp-field"><span>${esc(t('artistOpt'))}</span><input type="text" maxlength="60" data-keep="st-artist" autocomplete="off"></label>
              <label class="bp-field"><span>${esc(t('whyOpt'))}</span><input type="text" maxlength="120" data-keep="st-why" autocomplete="off"></label>
              <button type="button" class="bp-btn bp-primary" data-act="stPropose" data-cycle="${esc(c.cycleId)}" ${this.busy('stPropose')}>${esc(t('propose'))}</button>${this.note('stPropose')}
              ${list(c.proposals).length ? `<ul class="bp-chips">${c.proposals.map(p => `<li>${esc(p.title)} <small>${esc(this.name(p.by))}</small></li>`).join('')}</ul>` : ''}`;
          } else inner += `<p class="bp-big">${esc(t('waitPick', { team: teamName(c.team === 'A' ? 'B' : 'A'), name: this.name(c.sharer) }))} ${this.clock()}</p>`;
          // The host only steps in when the interviewer is gone or stuck.
          if (host && !isInterviewer && !isSharer) inner += ownPick('pick-host', false);
          if (isSharer) inner += this.selfPick(c, false);
        } else if (c.stage === 'confirm') {
          inner += songCard;
          if (isSharer || host) inner += `<div class="bp-actions bp-stack">
            <button type="button" class="bp-btn bp-primary bp-wide" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="accept" data-version="${c.song.version}" ${this.busy('stConfirm')}>${esc(t('accept'))}</button>
            <button type="button" class="bp-btn bp-wide" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="replace" data-version="${c.song.version}" ${this.busy('stConfirm')}>${esc(t('replace'))}</button></div>
            ${this.selfPick(c, true)}${this.note('stConfirm')}`;
          else inner += `<p class="bp-soft">${esc(t('waitConfirm', { name: this.name(c.sharer) }))}</p>`;
        } else if (c.stage === 'sing') {
          inner += songCard + `<p class="bp-big">${esc(isSharer ? t('singNow') : t('singingNow', { name: this.name(c.sharer) }))} ${this.clock()}</p>`;
          if (isSharer || host) inner += `<div class="bp-actions"><button type="button" class="bp-btn bp-primary" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="done" data-version="${c.song.version}">${esc(t('doneSinging'))}</button>
            <button type="button" class="bp-btn" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="replace" data-version="${c.song.version}">${esc(t('replace'))}</button></div>${this.selfPick(c, true)}${this.note('stConfirm')}`;
        }
        if (['share', 'ask'].includes(c.stage) && me?.team && !isSharer && !isInterviewer && !me.away) {
          inner += `<details class="bp-sub" data-keep="suggest-q"><summary>${esc(t('suggestQ'))}</summary>
            <div class="bp-inline"><input type="text" maxlength="120" data-keep="st-q" aria-label="${esc(t('suggestQ'))}" autocomplete="off" placeholder="${esc(c.mySuggest || '')}"><button type="button" class="bp-btn" data-act="stSuggestQ" data-cycle="${esc(c.cycleId)}">${esc(t('send'))}</button></div>${this.note('stQ')}
            ${c.mySuggest ? `<p class="bp-soft">${esc(t('yourSuggestion'))}：${esc(c.mySuggest)}</p>` : ''}</details>`;
        }
        if (host && ['share', 'ask', 'reply'].includes(c.stage) && !isSharer && !isInterviewer) inner += `<div class="bp-actions">${adv(c.stage, '→ ' + t('step_' + (c.stage === 'share' ? 'ask' : c.stage === 'ask' ? 'reply' : sub.singing ? 'pick' : 'done')))}</div>`;
        return `<div class="bp-cycle is-cur">${head}${stepper}${inner}${this.note('st')}</div>`;
      }).join('');
      return `<section class="bp-panel bp-challenge bp-story"><h2>${esc(t('type_story_exchange'))}</h2>
        ${topic}${sharing ? `<p class="bp-soft">${esc(sub.singing ? t('storyBoth') : t('singingOff'))}</p>` : ''}${cycles}${body}</section>`;
    }
    selfPick(c, folded) {
      return `<details class="bp-sub bp-self" data-keep="self-${c.cycleId}" ${folded ? '' : ''}><summary>${esc(t('selfPick'))}</summary>
        <label class="bp-field"><span>${esc(t('songTitle'))}</span><input type="text" maxlength="80" data-keep="st-self" autocomplete="off"></label>
        <label class="bp-field"><span>${esc(t('artistOpt'))}</span><input type="text" maxlength="60" data-keep="st-self-artist" autocomplete="off"></label>
        <button type="button" class="bp-btn" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="self">${esc(t('selfPick'))}</button></details>
        <button type="button" class="bp-btn bp-xs bp-quiet" data-act="stConfirm" data-cycle="${esc(c.cycleId)}" data-action="skip">${esc(t('skipSinging'))}</button>`;
    }
    /* ── taboo ── */
    taboo() {
      const v = this.view, r = v.round, sub = r.sub, me = v.me, host = this.isHost();
      const segs = sub.segs.slice().sort((a, b) => Number(b.current) - Number(a.current)).map(seg => {
        const isMe = me?.playerNum === seg.describer, mate = me?.team === seg.team && !isMe;
        const items = seg.targets.map(x => `<li class="is-${x.result || 'open'}">${esc(t('item', { n: x.idx + 1 }))}${x.result ? ` · ${esc(t('result_' + x.result))}${x.answer ? `：<b>${esc(x.answer)}</b>` : ''}` : ''}${host && seg.stage === 'done' && x.result ? ` ${['hit', 'foul', 'skip'].filter(k => k !== x.result).map(k => `<button type="button" class="bp-btn bp-xs" data-act="tbCorrect" data-seg="${esc(seg.segmentId)}" data-idx="${x.idx}" data-result="${k}">${esc(t(k === 'skip' ? 'tabooSkip' : k))}</button>`).join('')}` : ''}</li>`).join('');
        let inner = '';
        if (seg.current) {
          if (seg.blocked && seg.stage === 'ready') inner += `<p class="bp-banner bp-warn">${esc(t('waitTeam'))}</p>`;
          if (seg.stage === 'ready' && (isMe || host)) inner += `<p class="bp-soft">${esc(t('tabooRules'))}</p><div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="tbStart" data-seg="${esc(seg.segmentId)}" ${seg.blocked ? 'disabled' : ''}>${esc(t('startTaboo', { s: v.settings.t.taboo }))}</button></div>`;
          if (seg.stage === 'live' || seg.stage === 'timeup') {
            if (isMe && seg.secret) inner += `<div class="bp-secret"><span class="bp-label">🔒 ${esc(t('yourWord'))}</span><p class="bp-word">${esc(seg.secret.answer)}</p>
              <p class="bp-tabooline">${esc(t('taboo'))}：${seg.secret.forbidden.map(w => `<s>${esc(w)}</s>`).join(' ')}</p></div>`;
            else if (mate) inner += `<p class="bp-big">${esc(t('guessAloud', { name: this.name(seg.describer) }))}</p>`;
            else inner += `<p class="bp-big">${esc(t('guessAloud', { name: this.name(seg.describer) }))}</p>`;
            if (seg.stage === 'timeup') inner += `<p class="bp-banner bp-warn">${esc(t('timeUpScore'))}</p>`;
            // A describer who also hosts is still the describer: no scoring after time.
            const canMark = (isMe && seg.stage === 'live') || this.hostPage || (host && !isMe);
            if (canMark && seg.idx < seg.targets.length) inner += `<div class="bp-actions bp-marks">${['hit', 'foul', 'skip'].map(k => `<button type="button" class="bp-btn ${k === 'hit' ? 'bp-good-btn' : ''}" data-act="tbMark" data-seg="${esc(seg.segmentId)}" data-idx="${seg.idx}" data-result="${k}" ${this.busy('tb')}>${esc(t(k === 'skip' ? 'tabooSkip' : k))}</button>`).join('')}</div>`;
            if (host) inner += `<div class="bp-actions"><button type="button" class="bp-btn bp-xs" data-act="tbFinish" data-seg="${esc(seg.segmentId)}">${esc(t('finishSeg'))}</button></div>`;
          }
        }
        if (!seg.current) return `<details class="bp-sub" data-keep="taboo-${seg.segmentId}"><summary><span>${teamChip(seg.team)} ${this.who(seg.describer)} · ${esc(seg.stage === 'done' ? t('score', { n: seg.score }) : t('nextUp'))}</span></summary><ul class="bp-items">${items}</ul></details>`;
        return `<div class="bp-tseg is-cur bp-team-${seg.team}"><div class="bp-cycle-head">${teamChip(seg.team)} ${esc(t('describer'))}：${this.who(seg.describer)} · ${esc(t('score', { n: seg.score }))} ${seg.stage !== 'ready' ? this.clock() : ''}</div>
          ${inner}${this.note('tb')}<ul class="bp-items">${items}</ul></div>`;
      }).join('');
      return `<section class="bp-panel bp-challenge bp-taboo"><h2>${esc(t('type_taboo_description'))}</h2><p class="bp-prompt">${esc(r.card.prompt)}</p>${segs}</section>`;
    }
    /* ── result, summary, finished ── */
    result() {
      const v = this.view, r = v.round, host = this.isHost();
      const res = r.override || r.proposed;
      const nom = r.nominations;
      const calls = !res ? [] : res === 'A' ? [nom.A.pick] : res === 'B' ? [nom.B.pick] : res === 'BOTH' ? [...new Set([nom.A.pick, nom.B.pick])] : [nom[r.fallbackTeam].pick];
      return `<section class="bp-panel bp-result"><h2>${esc(t('resultTitle'))}</h2>
        <p class="bp-result-big bp-res-${res}">${esc(res ? resultText(res) : '—')}</p>
        ${res === 'NEITHER' ? `<p class="bp-soft bp-center">${esc(t('fallbackNote', { team: teamName(r.fallbackTeam) }))}</p>` : ''}
        <p class="bp-center">${esc(t('willCall'))}：${calls.map(n => `<b class="bp-ballbig">${n}</b>`).join(' ')}</p>
        ${host ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="confirmResult">${esc(t('confirmResult'))}</button></div>
          <details class="bp-sub" data-keep="override"><summary>${esc(t('override'))}</summary><div class="bp-actions">${['A', 'B', 'BOTH', 'NEITHER'].map(x => `<button type="button" class="bp-btn bp-seg ${r.override === x ? 'is-on' : ''}" data-act="setResult" data-result="${x}">${esc(resultText(x))}</button>`).join('')}
          ${r.override ? `<button type="button" class="bp-btn bp-xs" data-act="setResult" data-result="">↺</button>` : ''}</div></details>${this.note('host')}`
          : `<p class="bp-soft bp-center">${esc(t('waitConfirmHost'))}</p>`}
        ${r.sub && r.type === 'song_relay' && host ? this.songCorrections() : ''}
        ${r.type === 'improv_scene' && host ? `<div class="bp-actions">${r.sub.segs.map(s => `<button type="button" class="bp-btn bp-xs" data-act="imJudge" data-seg="${esc(s.segmentId)}" data-value="${s.complete ? '0' : '1'}">${TEAM_ICON[s.team]} ${esc(s.complete ? t('notComplete') : t('complete'))}</button>`).join('')}</div>` : ''}
        ${r.type === 'taboo_description' ? this.taboo() : ''}
      </section>`;
    }
    summary() {
      const v = this.view, r = v.round, s = r.settled, host = this.isHost();
      const mine = v.me?.team;
      const lineInfo = team => { const n = list(s.newLines[team]).length; return `<div class="bp-sumteam bp-team-${team}">${teamChip(team)} <b>${s.lines[team]}</b> ${esc(t('linesShort'))} <small>${esc(n ? t('newLines', { n }) : t('noNewLines'))}</small>${team === mine ? ' ★' : ''}</div>`; };
      return `<section class="bp-panel bp-summary"><h2>${esc(t('summary'))}</h2>
        <p class="bp-result-big bp-res-${s.result}">${esc(resultText(s.result))}</p>
        <p class="bp-center">${esc(t('called'))}：${s.called.map(n => `<b class="bp-ballbig">${n}</b>`).join(' ') || '—'}</p>
        <div class="bp-sumteams">${lineInfo('A')}${lineInfo('B')}</div>
        <p class="bp-soft bp-center">${esc(t('winHelp'))}</p>
        ${host ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="nextRound">${esc(t('nextRound'))}</button></div>${this.note('host')}` : ''}
      </section>`;
    }
    finished() {
      const v = this.view, f = v.finished || {}, host = this.isHost();
      const headline = f.early ? t('earlyEnd') : f.winner === 'BOTH' ? t('coWin') : t('bingoWin', { team: teamName(f.winner) });
      const boards = v.boards ? `<div class="bp-final-boards">${['A', 'B'].map(team => `<div><h3>${teamChip(team)} · ${esc(t('lines', { n: v.lines?.[team] ?? 0 }))}</h3>${this.board({ board: v.boards[team], lines: this.linesOf(v.boards[team]), team })}</div>`).join('')}</div>` : '';
      return `<section class="bp-panel bp-finished"><h2 class="bp-win ${f.early ? '' : 'bp-win-' + f.winner}">${esc(headline)}</h2>
        <h3 class="bp-center">${esc(t('finalBoards'))}</h3>${boards}${this.calledStrip()}
        ${host ? `<div class="bp-actions"><button type="button" class="bp-btn bp-primary bp-wide" data-act="newGame">${esc(t('newGame'))}</button></div>${this.note('host')}` : ''}</section>`;
    }
    linesOf(board) {
      const called = new Set(this.view.called);
      return LINE_IDS.filter((id, i) => LINES[i].every(c => called.has(board[c])));
    }
    /* ── host tools ── */
    hostTools() {
      const v = this.view, r = v.round;
      if (v.phase === 'lobby') return '';
      const playing = v.phase === 'playing';
      const swaps = [];
      if (playing && r && ['revealed', 'challenge'].includes(r.stage)) {
        if (r.type === 'guess_person' && r.sub?.stage !== 'reveal') ['A', 'B'].forEach(team => swaps.push(`<button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${team}">${esc(t('swap'))} ${TEAM_ICON[team]} ${esc(t('protagonist'))}</button>`));
        if (r.type === 'story_exchange') ['A', 'B'].forEach(team => ['sharer', 'interviewer'].forEach(role => swaps.push(`<button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${team}" data-role="${role}">${esc(t('swap'))} ${TEAM_ICON[team]} ${esc(t(role))}</button>`)));
        if (r.type === 'taboo_description') ['A', 'B'].forEach(team => swaps.push(`<button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${team}">${esc(t('swap'))} ${TEAM_ICON[team]} ${esc(t('describer'))}</button>`));
        if (r.type === 'improv_scene' && r.stage === 'revealed') ['A', 'B'].forEach(team => [0, 1].forEach(slot => swaps.push(`<button type="button" class="bp-btn bp-xs" data-act="swapRole" data-team="${team}" data-slot="${slot}">${esc(t('swap'))} ${TEAM_ICON[team]}${slot + 1}</button>`)));
      }
      const players = v.roster.filter(p => p.team).map(p => `<button type="button" class="bp-btn bp-xs ${p.away ? 'is-on' : ''}" data-act="setAway" data-player="${p.playerNum}" data-away="${p.away ? '0' : '1'}">${esc(p.name)}${p.away ? ' · ' + esc(t('away')) : ''}</button>`).join('');
      const hostSeat = `<div class="bp-actions"><span class="bp-label">${esc(t('hostSeat'))}</span>${[{ playerNum: 0, name: t('hostOnly') }, ...v.roster].map(p => `<button type="button" class="bp-btn bp-xs ${v.hostPlayerNum === p.playerNum ? 'is-on' : ''}" data-act="setHost" data-player="${p.playerNum}">${esc(p.name)}</button>`).join('')}</div>`;
      const logItems = list(v.log).slice().reverse().slice(0, 12).map(x => `<li>#${x.round} ${esc(x.kind)}${x.info ? ' ' + esc(JSON.stringify(x.info)) : ''}</li>`).join('');
      const blocked = r?.type === 'guess_person' && r.sub?.stage === 'blocked';
      return `<details class="bp-panel bp-hosttools" data-keep="hosttools" ${blocked ? 'open' : ''}><summary>${esc(t('hostTools'))}</summary>
        ${playing ? `<div class="bp-actions"><button type="button" class="bp-btn" data-act="pause">${esc(v.paused ? t('resume') : t('pause'))}</button>
          ${r?.clock || blocked ? `<button type="button" class="bp-btn" data-act="extend">${esc(t('plus15'))}</button>` : ''}
          ${r?.stage === 'nominating' || (r?.type === 'guess_person' && r.sub?.stage === 'answer') ? `<button type="button" class="bp-btn" data-act="lockNow">${esc(t('lockNow'))}</button>` : ''}
          ${r?.type === 'guess_person' && ['answer', 'blocked'].includes(r.sub?.stage) ? `<button type="button" class="bp-btn" data-act="gpReopen">${esc(t('reopen'))}</button>` : ''}
          ${r && ['revealed', 'challenge'].includes(r.stage) ? `<button type="button" class="bp-btn ${this.armed === 'skipCard' ? 'is-armed' : ''}" data-act="skipCard">${esc(t('skipCard'))}</button>` : ''}</div>
          ${swaps.length ? `<div class="bp-actions">${swaps.join('')}</div>` : ''}
          <div class="bp-actions"><span class="bp-label">${esc(t('awayToggle'))}</span>${players}</div>` : ''}
        ${hostSeat}${this.note('host')}
        ${playing ? `<div class="bp-actions"><button type="button" class="bp-btn bp-danger ${this.armed === 'endGame' ? 'is-armed' : ''}" data-act="endGame">${esc(this.armed === 'endGame' ? t('confirmEnd') : t('endGame'))}</button></div>` : ''}
        ${logItems ? `<details class="bp-sub" data-keep="log"><summary>${esc(t('log'))}</summary><ol class="bp-log">${logItems}</ol></details>` : ''}
      </details>`;
    }
  }
  function errText(code) {
    if (D['err_' + code]) return t('err_' + code);
    if (code === 'pick_target') return t('recipient') + '?';
    return t('err_generic', { code });
  }
  return { Card, t, esc, lang, errText, D };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BINGO_UI;
