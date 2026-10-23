/* WHO KNOWS? presentation shared by the host screen and every player card.
 * It only ever reads WHO_KNOWS_ENGINE.view(): the shared screen gets the
 * public projection (no word, no roles), and a card additionally gets its own
 * `me` block. Nothing here can reveal another seat's secret. */
var WHO_KNOWS_UI = (() => {
  'use strict';
  const dict = {
    brand: ['WHO KNOWS?', 'WHO KNOWS?'],
    subtitle: ['一個秘密單字，只能問是非題，而有人早就知道答案。', 'One secret word. Yes-or-no questions. Someone already knows.'],
    mode_insider: ['內鬼模式', 'Insider mode'], mode_werewolf: ['狼人模式', 'Werewolf mode'],
    modeShort_insider: ['內鬼', 'Insider'], modeShort_werewolf: ['狼人', 'Werewolf'],
    pitch_insider: ['出題人知道答案；還有一位內鬼也偷偷知道，會暗中帶大家猜。先一起猜出單字，再找出內鬼。', 'The Master knows the word. One secret Insider knows it too and quietly guides you. Find the word together, then find the Insider.'],
    pitch_werewolf: ['村長只能用標記回答。先知暗中幫忙、狼人故意帶歪。猜出單字，但別讓狼人認出先知。', 'The Mayor answers with tokens only. A hidden Seer helps; hidden Werewolves mislead. Guess the word, but keep your Seer safe.'],
    tags_insider: ['較簡單・大家合作・一位暗中帶路的人', 'Easier · cooperative · one hidden guide'],
    tags_werewolf: ['分成兩隊・可以虛張聲勢・兩種結局', 'Two teams · bluffing · two endings'],
    round: ['第 {n} 輪', 'ROUND {n}'],
    answerer_insider: ['出題人', 'Master'], answerer_werewolf: ['村長', 'Mayor'],
    role_master: ['出題人', 'Master'], role_insider: ['內鬼', 'Insider'], role_common: ['平民', 'Common'],
    role_mayor: ['村長', 'Mayor'], role_seer: ['先知', 'Seer'], role_werewolf: ['狼人', 'Werewolf'], role_villager: ['村民', 'Villager'],
    goal_master: ['選一個秘密單字。只能回答「是／不是／不知道」，不能給提示。', 'Pick the secret word. Answer only Yes, No or I don’t know — no hints.'],
    goal_insider: ['你偷偷知道答案。在時間內暗中把大家帶到答案，但別被抓到。', 'You secretly know the word. Steer everyone to it before time runs out — without getting caught.'],
    goal_common: ['用是非題猜出單字，再找出誰早就知道答案。', 'Ask yes-or-no questions to find the word. Then work out who already knew it.'],
    goal_mayor: ['選一個秘密單字。不能說話，只能按標記回答。', 'Pick the secret word. Stay silent — answer only by tapping tokens.'],
    goal_mayor_werewolf: ['你同時也是狼人：標記可以誤導大家。', 'You are also secretly a Werewolf: your tokens may mislead.'],
    goal_mayor_seer: ['你同時也是先知：可以幫忙，但別太明顯。', 'You are also secretly the Seer: help, but don’t make it obvious.'],
    goal_seer: ['你知道答案。暗中幫大家猜；一旦猜中，狼人會來找你。', 'You know the word. Help the village quietly — once it’s guessed, the Werewolves hunt you.'],
    goal_werewolf: ['你知道答案。把問題帶歪、拖延時間；就算被猜中，還能找出先知翻盤。', 'You know the word. Lead the questions astray and waste time. If it’s guessed anyway, find the Seer.'],
    goal_villager: ['用是非題猜出單字，留意誰一直把大家帶偏。', 'Ask yes-or-no questions to find the word. Watch who keeps steering you wrong.'],
    youAre: ['你是', 'YOU ARE'], alsoSecret: ['秘密身分：{role}', 'Secretly: {role}'],
    secretWord: ['秘密單字', 'THE SECRET WORD'], yourPack: ['狼人同伴：{names}', 'Your pack: {names}'], packAlone: ['你是唯一的狼人。', 'You are the only Werewolf.'],
    watching: ['這輪你是觀眾', 'You’re watching this round'], watchingHint: ['下一輪會發給你身分。', 'You’ll get a role next round.'],
    sittingOutCard: ['你目前休息中', 'You’re sitting out'], sittingOutHint: ['回來玩之後，下一輪就會發身分給你。', 'Once you’re back, you get a role from the next round.'],
    imBack: ['我回來了', 'I’m back'],
    chooseTitle: ['選擇秘密單字', 'Choose the secret word'],
    chooseHint: ['只有你看得到。選一個大家能用是非題猜到的字。', 'Only you can see these. Pick one everyone can reach with yes-or-no questions.'],
    level_easy: ['簡單', 'Easy'], level_medium: ['中等', 'Medium'], level_hard: ['困難', 'Hard'],
    reroll: ['換三個', 'Show three others'], rerollsLeft: ['還能換 {n} 次', '{n} left'],
    choosing: ['{name} 正在選秘密單字…', '{name} is choosing the secret word…'],
    choosingHint: ['其他人：先看看卡片上的秘密身分。', 'Everyone else: check your card for your secret role.'],
    getReady: ['準備開始發問', 'Questions start in'],
    getReadyHint: ['用說的發問。先在自己的卡片上按 🙋 排隊。', 'Ask out loud. Tap 🙋 on your card to get in line first.'],
    timeLeft: ['剩餘時間', 'left to find the word'],
    nowAsking: ['正在發問', 'NOW ASKING'], nobodyAsking: ['目前沒人發問。想問的人在卡片上按 🙋。', 'Nobody is asking. Tap 🙋 on your card to ask.'],
    nextInLine: ['接著：{names}', 'Next: {names}'],
    tokensLeft: ['是／否 剩 {n} 個', '{n} Yes/No left'], tokensUnlimited: ['是／否 不限次數', 'Unlimited Yes/No'],
    raise: ['🙋 我要發問', '🙋 I have a question'], raising: ['排隊中…', 'Getting in line…'],
    inLine: ['你排第 {n} 個', 'You’re #{n} in line'], inLineHint: ['輪到你時，卡片會亮起來。', 'Your card lights up when it’s your turn.'],
    yourTurn: ['輪到你了！', 'YOUR TURN'], yourTurnHint: ['現在開口問一個是非題。', 'Ask one yes-or-no question out loud now.'],
    leaveLine: ['離開隊伍', 'Leave the line'], neverMind: ['算了，不問了', 'Never mind'],
    composerLabel: ['把問題打出來（選填）', 'Type your question (optional)'],
    composerHint: ['會顯示在大家的畫面上，方便跟上。', 'It shows on everyone’s screen so people can follow along.'],
    composerPlaceholder: ['例：Is it something you can eat?', 'e.g. Is it something you can eat?'],
    composerSave: ['顯示我的問題', 'Show my question'],
    answering: ['回答給', 'ANSWER'], waitingQuestion: ['等待有人發問…', 'Waiting for a question…'],
    pickAsker: ['有人沒排隊就直接問？點他的名字：', 'Someone asked without tapping 🙋? Tap their name:'],
    skip: ['略過 {name}', 'Skip {name}'],
    otherAsker: ['別人說出答案？', 'Someone else said it?'], otherAskerHint: ['點他的名字，他就變成目前的發問者：', 'Tap their name to make them the current asker:'],
    correctConfirm: ['再按一次確認：{name} 說出了完整單字', 'Tap again to confirm {name} said the exact word'],
    mayorSilent: ['不能說話，只能按下面的按鈕回答。', 'Stay silent — answer with the buttons below.'],
    masterRule: ['只回答「是／不是／不知道」。', 'Answer only Yes, No or I don’t know.'],
    ans_yes: ['是', 'Yes'], ans_no: ['不是', 'No'], ans_maybe: ['可能', 'Maybe'], ans_close: ['很接近', 'So close'],
    ans_far: ['差很遠', 'Way off'], ans_unknown: ['不知道', 'I don’t know'], ans_correct: ['答對了！', 'Correct!'],
    answersTitle: ['回答紀錄', 'ANSWERS'], noAnswersYet: ['還沒有回答。', 'No answers yet.'],
    recentAnswers: ['最近的回答', 'RECENT ANSWERS'],
    wordFound: ['猜中了！', 'The word was found!'], guessedBy: ['{name} 在 {time} 猜中', 'Guessed by {name} at {time}'],
    wolvesRevealed: ['狼人現身：{names}', 'The Werewolves: {names}'],
    huntTitle: ['狼人：找出先知', 'Werewolves: find the Seer'],
    huntHint: ['大家都可以說話、宣稱身分、虛張聲勢。狼人在卡片上選人。', 'Everyone may talk, claim roles and bluff. The Werewolves choose on their cards.'],
    huntPick: ['誰是先知？', 'Who is the Seer?'], huntOthers: ['狼人正在選人。快說話，保護先知！', 'The Werewolves are choosing. Talk — protect the Seer!'],
    wordSecret: ['時間到，沒有猜中。', 'Time’s up — the word stays secret.'], tokensOut: ['是／否標記用完了，沒有猜中。', 'Out of Yes/No tokens — the word stays secret.'],
    endedByHost: ['發問提前結束了。', 'The questions were ended early.'],
    accuseTitle: ['找出狼人', 'Find a Werewolf'],
    accuseHint: ['討論後在卡片上投票。至少要有人得到兩票，才會揭曉最高票的人。', 'Discuss, then vote on your card. The most-voted player is revealed if they have at least two votes.'],
    yourVote: ['你的票：{name}', 'Your vote: {name}'], changeVote: ['可以點別人改票，全員投完就揭曉。', 'Tap someone else to change it. It reveals when everyone has voted.'],
    noVoteYet: ['還沒投票', 'You haven’t voted'],
    votedCount: ['{cast} / {total} 已投票', '{cast} / {total} voted'], youVoted: ['已投票', 'Voted'],
    discussTitle: ['誰早就知道答案？', 'Who already knew?'],
    discussHint: ['有人帶路帶得太順了嗎？大家聊聊。討論時間＝剛才猜的時間。', 'Was someone leading you there a little too well? Talk it over. You get as long as the guessing took.'],
    discussInsider: ['低調一點，假裝你也是平民。', 'Stay hidden. Blend in with the Commons.'],
    speakingTitle: ['輪流發言', 'Speaking turns'],
    speakingNow: ['{name} 發言中', '{name} has the floor'],
    speakingYourTurn: ['輪到你發言', 'Your turn to speak'],
    speakingHint: ['說說你懷疑誰、剛才觀察到了什麼，或替自己辯護。其他人先聽。', 'Say who you suspect, share what you noticed, or defend yourself. Everyone else listens.'],
    answererSpeakingRule: ['發問已結束，現在可以正常說話。輪到你時，說說觀察或替自己辯護。', 'The questions are over, so you may speak normally now. On your turn, share your observations or defend yourself.'],
    masterListeningRule: ['先聽大家輪流發言，接著你有一次指認內鬼的機會。', 'Listen to each player’s turn, then you get one guess at the Insider.'],
    speakingProgress: ['第 {n} / {total} 位', 'Speaker {n} / {total}'],
    speakingNext: ['接著：{name}', 'Up next: {name}'],
    speakingAfter_judge: ['全員發言後，先判斷猜中者是不是內鬼。', 'After everyone speaks, judge whether the guesser is the Insider.'],
    speakingAfter_masterGuess: ['發言結束後，由出題人指認內鬼。', 'After the turns, the Master names the Insider.'],
    speakingAfter_accuse: ['全員發言後，投票找出狼人。', 'After everyone speaks, vote to find a Werewolf.'],
    speakerDone: ['我說完了', 'I’m done'], nextSpeaker: ['下一位發言', 'Next speaker'],
    close_speaking: ['略過剩餘發言', 'Skip remaining turns'],
    skipSpeakingConfirm: ['再按一次：略過剩餘發言', 'Tap again to skip the remaining turns'],
    previousRounds: ['前幾輪', 'EARLIER ROUNDS'],
    win_village: ['村民贏', 'Village won'], win_wolves: ['狼人贏', 'Werewolves won'], win_commons: ['平民贏', 'Commons won'],
    win_insider: ['內鬼贏', 'Insider won'], win_none: ['沒人贏', 'No winner'], win_void: ['取消', 'Cancelled'],
    judgeTitle: ['{name} 是內鬼嗎？', 'Is {name} the Insider?'],
    judgeHint: ['多數投「是」就立刻揭曉 {name}；否則全體再投一次，選出嫌疑人。', 'A majority Yes reveals {name} now. Otherwise everyone votes for a suspect.'],
    judgeYes: ['是，就是他', 'Yes, it’s them'], judgeNo: ['不是', 'No'], judgeSelf: ['大家正在判斷你…', 'The others are judging you…'],
    voteTitle: ['誰是內鬼？', 'Who is the Insider?'],
    voteHint: ['最高票的人揭曉；平手時以 {name} 的票為準。', 'Most votes is revealed. On a tie, {name}’s vote decides.'],
    masterGuessTitle: ['{name} 有一次指認機會', '{name} gets one guess'],
    masterGuessHint: ['沒有猜中單字。出題人若指認出內鬼，平民一樣獲勝。', 'The word wasn’t found. If the Master names the Insider, the Commons still win.'],
    masterGuessPick: ['指認內鬼', 'Name the Insider'], waitingFor: ['等待 {name}…', 'Waiting for {name}…'],
    out_village_word: ['村民勝利！', 'The village wins!'], sub_village_word: ['猜中單字，而且先知沒被認出來。', 'The word was found and the Seer stayed hidden.'],
    out_village_vote: ['村民勝利！', 'The village wins!'], sub_village_vote: ['投票抓到了狼人。', 'A Werewolf was caught in the vote.'],
    out_wolves_seer: ['狼人勝利！', 'The Werewolves win!'], sub_wolves_seer: ['狼人認出了先知。', 'They found the Seer.'],
    out_wolves_hidden: ['狼人勝利！', 'The Werewolves win!'], sub_wolves_hidden: ['沒人猜中，狼人也沒被抓到。', 'The word stayed secret and the Werewolves escaped.'],
    out_commons_found: ['平民勝利！', 'The Commons win!'], sub_commons_found: ['抓到內鬼了。', 'The Insider was caught.'],
    out_master_found: ['平民勝利！', 'The Commons win!'], sub_master_found: ['出題人成功指認內鬼。', 'The Master named the Insider in time.'],
    out_insider_wins: ['內鬼勝利！', 'The Insider wins!'], sub_insider_wins: ['內鬼成功躲過了。', 'The Insider stayed hidden.'],
    out_nobody: ['這輪沒有人獲勝', 'Nobody wins this round'], sub_nobody: ['時間到了，沒有猜出單字。', 'Time ran out before the word was found.'],
    out_void: ['這輪取消', 'Round cancelled'], sub_void_host: ['這輪被取消了，不計分。', 'This round was cancelled. No points.'],
    sub_void_answerer_left: ['出題的人離開了，這輪不計分。', 'The answerer left, so this round doesn’t count.'],
    theWordWas: ['答案是', 'THE WORD WAS'], youWin: ['你這輪贏了', 'You win this round'], youLose: ['這輪沒贏', 'Not this time'],
    revealTitle: ['全員身分', 'EVERYONE’S ROLES'], votesTitle: ['大家怎麼投', 'HOW PEOPLE VOTED'], picksTitle: ['狼人的選擇', 'THE WEREWOLVES’ PICK'],
    judgeResult: ['判斷：是 {yes}・不是 {no}', 'Judgement: Yes {yes} · No {no}'], tieBreak: ['平手，以猜中者的票為準', 'Tie broken by the guesser’s vote'],
    nextRound: ['下一輪', 'Next round'], nextRoundHint: ['任何人都可以按下一輪。', 'Anyone can start the next round.'],
    scores: ['分數', 'SCORES'], pts: ['{n} 分', '{n} pts'], pt: ['{n} 分', '{n} pt'], you: ['你', 'YOU'], sittingOut: ['休息中', 'Sitting out'],
    finished: ['遊戲結束', 'Game over'], hostCanRestart: ['主持人可以再開新的一局。', 'The host can start a new game.'], winner: ['優勝', 'Winner'], winners: ['並列優勝', 'Joint winners'], stoppedEarly: ['遊戲提前結束了。', 'The game was ended early.'],
    newGame: ['開新的一局', 'Start a new game'], anyoneCanRestart: ['任何玩家都可以開新的一局（分數歸零）。', 'Anyone can start a new game (scores back to 0).'],
    hidden: ['隱藏身分', 'HIDDEN ROLES'], composition: ['{list}', '{list}'], mayorInDeal: ['村長也拿秘密身分', 'The Mayor holds one too'],
    pointsTitle: ['計分', 'SCORING'],
    setupTitle: ['選擇模式', 'Choose a mode'], start: ['開始第一輪', 'Start the first round'],
    minutes: ['發問時間', 'Question time'], minutesN: ['{n} 分鐘', '{n} min'],
    turnSeconds: ['每人發言時間', 'Time per speaker'], secondsN: ['{n} 秒', '{n} s'],
    tokens: ['是／否標記數量', 'Yes/No tokens'], tokensNone: ['不限', 'No limit'],
    difficulty: ['單字難度', 'Word difficulty'], diff_mixed: ['混合（三種難度各一）', 'Mixed — one of each'],
    diff_easy: ['簡單', 'Easy'], diff_medium: ['中等', 'Medium'], diff_hard: ['困難', 'Hard'],
    wolves: ['狼人數量', 'Werewolves'], wolves_auto: ['自動（7 人以上 2 隻）', 'Auto (2 from 7 players)'], wolves_1: ['1 隻', '1'], wolves_2: ['2 隻（需 6 人以上）', '2 (needs 6+ players)'],
    mayorSecret: ['進階：村長也拿一張秘密身分', 'Advanced: the Mayor also gets a secret role'],
    mayorSecretHint: ['狼人村長可以用標記說謊；先知村長可以暗中幫忙。', 'A Werewolf Mayor may give misleading answers; a Seer Mayor may help.'],
    masterGuess: ['時間到時，出題人可以指認一次內鬼', 'If time runs out, the Master gets one guess at the Insider'],
    masterGuessOptHint: ['關掉就是原版規則：時間到，大家一起輸。', 'Off is the classic rule: if time runs out, everyone loses.'],
    playersNeeded: ['需要 4–9 位玩家，目前房間有 {n} 位。請回主選單調整人數。', 'Needs 4–9 players. This room has {n}. Change it in the Hub.'],
    hostNote: ['每個人用自己的玩家卡玩。這個分享畫面不會顯示答案或任何人的身分。', 'Everyone plays on their own player card. This shared screen never shows the word or anyone’s role.'],
    hostOptional: ['開始之後可以關掉這頁：遊戲會在大家的卡片上繼續，計時和「牌桌控制」也都在卡片上。', 'Once it starts, you may close this page: the game carries on on everyone’s cards, timer and Table controls included.'],
    pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'], paused: ['已暫停', 'PAUSED'], pausedHint: ['大家準備好就可以繼續。', 'Resume when everyone is ready.'],
    extendQuestions: ['+1 分鐘', '+1 min'], extendOther: ['+30 秒', '+30 s'],
    close_countdown: ['立刻開始', 'Start now'], close_questions: ['結束發問', 'End the questions'], close_discuss: ['開始投票', 'Start the vote'],
    close_hunt: ['結束選人', 'Close the hunt'], close_accuse: ['結束投票', 'Close the vote'], close_judge: ['結束投票', 'Close the vote'],
    close_vote: ['結束投票', 'Close the vote'], close_masterGuess: ['結束指認', 'Close the guess'],
    manage: ['主持管理', 'Host controls'], close: ['關閉', 'Close'],
    controls: ['牌桌控制', 'Table controls'], controlsSummary: ['暫停・加時・人員・設定，任何玩家都能用', 'Pause · time · players · settings — anyone can use'],
    clockTools: ['計時', 'TIMER'], playerTools: ['玩家', 'PLAYERS'], gameTools: ['這一局', 'THIS GAME'],
    onlineSeat: ['在線', 'online'], offlineSeat: ['不在線', 'offline'],
    rosterHint: ['有人離開語音就讓他先休息，下一輪不會發身分給他。出題的人離開時，這輪會取消。', 'Sit someone out if they leave the call; they skip the next rounds. If the answerer leaves, the round is cancelled.'],
    sitOut: ['先休息', 'Sit out'], sitOutConfirm: ['再按一次：讓 {name} 休息', 'Tap again to sit {name} out'], rejoin: ['回來玩', 'Join again'], playing: ['遊戲中', 'Playing'],
    makeNext: ['下一輪出題', 'Answers next'], nextAnswerer: ['下一輪出題：{name}', 'Next answerer: {name}'], nextAuto: ['下一輪出題：公平輪流', 'Next answerer: fair rotation'],
    nextSettings: ['下一輪的設定', 'Settings for the next round'], saveSettings: ['儲存（下一輪生效）', 'Save for the next round'],
    saved: ['已儲存，下一輪開始生效。', 'Saved. It applies from the next round.'],
    voidRound: ['取消這一輪', 'Cancel this round'], voidConfirm: ['再按一次：取消這輪，不計分', 'Tap again to cancel this round (no points)'],
    restart: ['重新開始（分數歸零）', 'Restart (scores back to 0)'], restartConfirm: ['再按一次：開新的一局，分數歸零', 'Tap again to start over with scores at 0'],
    stop: ['結束遊戲', 'End game'], stopConfirm: ['再按一次：結束遊戲並顯示總分', 'Tap again to end the game and show the final scores'], playAgain: ['再玩一局', 'Play again'], changeSettings: ['更改設定', 'Change settings'],
    rules: ['怎麼玩', 'How to play'],
    demo: ['操作示範・單機模擬', 'Interactive demo · one-device simulation'], demoView: ['切換示範視角', 'Switch the demo view'], hostView: ['共同畫面', 'Shared screen'],
    liveLink: ['使用正式房間', 'Use your room'], demoLink: ['先試操作示範', 'Try the interactive demo'],
    setupNeeded: ['先到主選單設定房間與玩家連結。', 'Set up the room and player links in the Hub first.'], setUpRoom: ['設定房間與玩家', 'Set up room & players'],
    room: ['房間 {code}', 'Room {code}'], player: ['玩家 {n}', 'Player {n}'],
    offline: ['連線暫時中斷，正在重新連線…', 'Connection lost. Reconnecting…'], connecting: ['正在連線…', 'Connecting…'], ready: ['', ''],
    hostAway: ['等待主持頁重新連線…', 'Waiting for the host screen to reconnect…'],
    switched: ['房間已切換到其他遊戲。', 'The room switched to another game.'],
    noFirebase: ['目前無法連線到玩家卡片，請檢查網路後重新整理。', 'Player cards are unavailable. Check your connection and reload.'],
    roomChanged: ['房間已變更。重新載入此頁以使用新房間。', 'The room changed. Reload this page to use the new room.'],
    not_enough_players: ['至少要 4 位玩家在遊戲中。', 'At least 4 players must be playing.'],
    invalid_roster: ['請先在主選單設定 4–9 位玩家。', 'Set up 4–9 players in the Hub first.'],
    invalid_options: ['請選擇有效的設定。', 'Choose valid settings.'],
    stale_turn: ['畫面已更新，請依最新畫面操作。', 'Things moved on — follow the latest screen.'],
    already_in_line: ['你已經在隊伍裡了。', 'You’re already in line.'],
    not_available: ['這個動作目前無法使用，請依最新畫面操作。', 'That isn’t available right now. Follow the current screen.'],
    error: ['同步暫時失敗，請檢查連線後再試。', 'Could not sync. Check your connection and try again.'],
    rosterChanged: ['玩家人數已變更，請為這組玩家開始新的一局。', 'The number of players changed. Start a new game for this group.'],
    tableEmpty: ['這局遊戲已經不在了，請主持人重新開始 WHO KNOWS?。', 'This game is no longer available. Ask the host to start WHO KNOWS? again.'],
    continueCards: ['讓大家的卡片回到這局', 'Bring every card back to this game'],
    switchedHint: ['有玩家卡片正在顯示別的遊戲。可以讓卡片回到這局繼續，或在下面開新的一局。', 'Some player cards now show another game. Bring them back to continue, or start a new game below.'],
    tapAgain: ['再按一次確認', 'Tap again to confirm'],
    modeLabel: ['模式', 'Mode'], nextChosen: ['下一輪出題 ✓', 'Answers next ✓'],
    tokensLegend: ['回答標記', 'ANSWER TOKENS'], scoringLabel: ['計分', 'Scoring'],
    rules_insider_1: ['每輪有一位出題人（大家輪流）。他在自己的卡片上選一個秘密單字；分享畫面永遠不會顯示答案。', 'Each round one player is the Master (everyone takes turns). They pick a secret word on their own card. The shared screen never shows it.'],
    rules_insider_2: ['其他人拿到秘密身分：一位內鬼（也知道答案）和平民。', 'Everyone else gets a secret role: one Insider, who also knows the word, and Commons.'],
    rules_insider_3: ['用說的問是非題。想問的人先在卡片上按 🙋 排隊；出題人只能按「是／不是／不知道」。', 'Ask yes-or-no questions out loud. Tap 🙋 on your card to get in line. The Master can only tap Yes, No or I don’t know.'],
    rules_insider_4: ['有人說出完整單字時，出題人按「答對了」。時間內沒猜中，大家一起輸（可選：出題人有一次指認內鬼的機會）。', 'When someone says the exact word, the Master taps Correct. If time runs out, everyone loses (optional: the Master gets one guess at the Insider).'],
    rules_insider_5: ['輪流發言，說出懷疑或替自己辯護。猜中時，先判斷猜中者是不是內鬼；多數說不是，就全體投票。若開啟出題人指認，沒猜中時先聽每位玩家發言，再由出題人指認。', 'Take turns sharing suspicions or defending yourself. If the word was found, first judge the guesser; if most say no, everyone votes. With the Master’s guess option on, a missed word lets each player speak before the Master picks.'],
    scoring_insider: ['抓到內鬼：出題人和平民各 +1。內鬼躲過：內鬼 +3。', 'Insider caught: the Master and every Common +1. Insider escapes: +3.'],
    rules_werewolf_1: ['每輪有一位村長（大家輪流）。他選一個秘密單字，之後不能說話，只能按標記回答。', 'Each round one player is the Mayor (everyone takes turns). They pick a secret word, then stay silent and answer only by tapping tokens.'],
    rules_werewolf_2: ['秘密身分：一位先知和 1–2 隻狼人也知道答案，其他人是村民。', 'Secret roles: one Seer and 1–2 Werewolves also know the word. Everyone else is a Villager.'],
    rules_werewolf_3: ['用說的問是非題，先按 🙋 排隊。「是／不是」標記用完，發問就結束。', 'Ask yes-or-no questions out loud — line up with 🙋 first. When the Yes/No tokens run out, the questions end.'],
    rules_werewolf_4: ['猜中了：狼人現身，有 30 秒找出先知。找到就是狼人贏，找錯就是村民贏。', 'Word found: the Werewolves are revealed and get 30 seconds to find the Seer. Right — the Werewolves win. Wrong — the village wins.'],
    rules_werewolf_5: ['沒猜中：全員輪流發言，再用 45 秒投票找狼人。最高票（至少兩票）揭曉，抓到狼人就是村民贏。', 'Not found: everyone takes a speaking turn, then has 45 seconds to vote for a Werewolf. The most-voted player (two votes or more) is revealed. Catch one and the village wins.'],
    scoring_werewolf: ['猜中且先知安全：村民各 +2（先知再 +1）。投票抓到狼人：村民各 +1。狼人勝利：每隻 +2。', 'Word found and the Seer safe: every villager +2 (the Seer +1 more). A Werewolf caught in the vote: villagers +1. Werewolves win: +2 each.'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('whoknows', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => typeof I18N !== 'undefined' ? I18N.lang : 'en';
  const t = (key, vars = {}) => {
    const raw = typeof I18N !== 'undefined' ? I18N.t('whoknows', key) : (dict[key] ? dict[key][1] : key);
    return String(raw).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  };
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const obj = value => value && typeof value === 'object' ? value : {};
  const seatsOf = wk => list(wk?.roster).slice().sort((a, b) => a.playerNum - b.playerNum);
  const nameOf = (wk, n) => seatsOf(wk).find(p => p.playerNum === n)?.name || t('player', { n });
  const names = (wk, nums) => list(nums).map(n => nameOf(wk, n)).join(lang() === 'zh' ? '、' : ', ');
  const errorKey = code => ['stale_turn', 'not_available', 'not_enough_players', 'invalid_options', 'invalid_roster', 'already_in_line', 'offline'].includes(code) ? code : 'error';
  const pts = n => t(Number(n) === 1 ? 'pt' : 'pts', { n: Number(n) || 0 });
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const TOKEN_GLYPH = { yes: '✓', no: '✕', maybe: '?', close: '≈', far: '⇢', unknown: '…', correct: '★' };
  const answererKey = mode => 'answerer_' + (mode === 'werewolf' ? 'werewolf' : 'insider');
  // The answer tokens of each mode (mirrors the rules; cards also get them in `me`).
  const ANSWERS = { insider: ['yes', 'no', 'unknown', 'correct'], werewolf: ['yes', 'no', 'maybe', 'close', 'far', 'correct'] };
  const RULES = () => typeof WHO_KNOWS_ENGINE !== 'undefined' ? WHO_KNOWS_ENGINE.CONFIG : {
    modes: ['insider', 'werewolf'], questionMinutes: [3, 4, 5, 6, 8], defaultQuestionMinutes: { insider: 5, werewolf: 4 },
    difficulties: ['mixed', 'easy', 'medium', 'hard'], tokenOptions: [0, 20, 30, 36], wolfOptions: ['auto', 1, 2], turnSecondsOptions: [20, 25, 30], defaultTurnSeconds: 25 };
  const TIMED = ['countdown', 'questions', 'hunt', 'accuse', 'discuss', 'speaking', 'judge', 'vote', 'masterGuess'];
  // Closing these ends the guessing or settles a vote, so it takes two taps.
  const CONFIRM_CLOSE = ['questions', 'hunt', 'accuse', 'judge', 'vote', 'masterGuess'];
  const WINNER = { village_word: 'village', village_vote: 'village', wolves_seer: 'wolves', wolves_hidden: 'wolves', commons_found: 'commons', master_found: 'commons', insider_wins: 'insider', nobody: 'none', void: 'void' };

  // ── original flat illustrations (no <defs>, so many copies can coexist) ──
  const LINE = '#1a2033';
  const ART = {
    mark: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24c0-8 6-14 14-14h20c8 0 14 6 14 14v11c0 8-6 14-14 14H27l-11 9v-9.5C11.5 46 8 41 8 35z" fill="#f2ecdf"/><path d="M26.5 26c0-4.2 3.3-7 7.5-7s7.5 2.6 7.5 6.6c0 5.6-7.5 5.4-7.5 11" stroke="#2a3550" stroke-width="4.2" stroke-linecap="round" fill="none"/><circle cx="34" cy="43" r="2.8" fill="#2a3550"/><path d="M52 2a11 11 0 1 0 10 15.5A9 9 0 0 1 52 2z" fill="#e7c47c"/></svg>`,
    mayor: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="50" r="40" fill="#e7c47c" opacity=".13"/><ellipse cx="42" cy="71" rx="30" ry="7.5" fill="${LINE}"/><ellipse cx="42" cy="68" rx="30" ry="7.5" fill="#3b4a72" stroke="${LINE}" stroke-width="3"/><path d="M25 67V30c0-4.4 3.6-8 8-8h18c4.4 0 8 3.6 8 8v37z" fill="#2a3550" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="25" y="52" width="34" height="8" fill="#e7c47c" stroke="${LINE}" stroke-width="3"/><path d="M31 31c0-2.4 1.8-4 4-4h5" stroke="#53648f" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="72" cy="64" r="14" fill="#7cc79a" stroke="${LINE}" stroke-width="3"/><path d="M65.5 64.5l4.5 4.5 8.5-9.5" stroke="${LINE}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    master: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" fill="#e7c47c" opacity=".13"/><g transform="rotate(-9 44 46)"><rect x="21" y="15" width="46" height="62" rx="6" fill="#f2ecdf" stroke="${LINE}" stroke-width="3"/><path d="M31 29h24M31 37h26M31 45h17" stroke="#c9b99a" stroke-width="3.2" stroke-linecap="round"/></g><circle cx="63" cy="65" r="15" fill="#e7c47c" stroke="${LINE}" stroke-width="3"/><path d="M63 55.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="#fff6dc"/></svg>`,
    seer: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="46" r="40" fill="#b7a6f2" opacity=".15"/><path d="M33 73h30l-4-9H37z" fill="#3b4a72" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="25" y="72" width="46" height="9" rx="3.5" fill="#2a3550" stroke="${LINE}" stroke-width="3"/><circle cx="48" cy="43" r="23" fill="#b7a6f2" stroke="${LINE}" stroke-width="3"/><circle cx="51" cy="46" r="13" fill="#cdc1fb"/><path d="M37 35c2.2-4.4 6-6.6 10.5-6.6" stroke="#fff" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M75 15l1.8 4.9 4.9 1.8-4.9 1.8L75 28.4l-1.8-4.9-4.9-1.8 4.9-1.8z" fill="#e7c47c"/><path d="M19 24l1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1z" fill="#e7c47c"/></svg>`,
    werewolf: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="63" cy="31" r="21" fill="#e0806b"/><path d="M22 15l12 22q14-6 28 0l12-22 7 35q-6 17-21 25l-12 8-12-8q-15-8-21-25z" fill="#3a4466" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><path d="M26 24l6 12-8 3zM70 24l-6 12 8 3z" fill="#e0806b"/><path d="M35 58q13-7 26 0l-4 15-9 6-9-6z" fill="#c9d0e3" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/><path d="M43.5 60h9l-4.5 5z" fill="${LINE}"/><path d="M31 47l9 2.5-7.5 3.5zM65 47l-9 2.5 7.5 3.5z" fill="#f2c45c"/></svg>`,
    villager: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="50" r="40" fill="#9cc59a" opacity=".14"/><path d="M60 33V20h8v20" fill="#3b4a72" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="25" y="44" width="46" height="33" rx="2.5" fill="#f2ecdf" stroke="${LINE}" stroke-width="3"/><path d="M16 49L48 21l32 28z" fill="#6f9e72" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="33" y="53" width="13" height="12" rx="1.5" fill="#e7c47c" stroke="${LINE}" stroke-width="2.6"/><path d="M39.5 53v12M33 59h13" stroke="${LINE}" stroke-width="2"/><rect x="53" y="57" width="11" height="20" rx="1.5" fill="#3b4a72" stroke="${LINE}" stroke-width="2.6"/></svg>`,
    insider: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" fill="#6cc3b8" opacity=".15"/><circle cx="48" cy="48" r="30" fill="#3f968c" stroke="${LINE}" stroke-width="3"/><path d="M48 25a12 12 0 0 0-6.6 22L37 70h22l-4.4-23A12 12 0 0 0 48 25z" fill="${LINE}"/><ellipse cx="48" cy="37" rx="8.5" ry="5.2" fill="#f2ecdf"/><circle cx="49.5" cy="37" r="3.2" fill="#6cc3b8"/><circle cx="49.5" cy="37" r="1.4" fill="${LINE}"/></svg>`,
    common: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" fill="#9cc59a" opacity=".14"/><path d="M15 29c0-7.2 5.8-13 13-13h28c7.2 0 13 5.8 13 13v15c0 7.2-5.8 13-13 13H36l-12 10V57.5C19 55.4 15 50.4 15 44z" fill="#f2ecdf" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><path d="M34.5 30c0-4.2 3.3-7 7.5-7s7.5 2.6 7.5 6.6c0 5.4-7.5 5.4-7.5 10" stroke="#2a3550" stroke-width="3.6" fill="none" stroke-linecap="round"/><circle cx="42" cy="46" r="2.6" fill="#2a3550"/><path d="M75 72l9.5 9.5" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="63" r="12.5" fill="#cfe6d0" stroke="${LINE}" stroke-width="3"/><path d="M60 59.5c1.4-2.6 3.5-3.6 6-3.6" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`,
  };
  const art = key => ART[key] || ART.mark;
  // The answerer keeps the hat (Mayor) or the answer card (Master) unless a
  // Werewolf-mode Mayor secretly held a Seer or Werewolf role.
  function roleArt(role, wk, n) {
    if (wk?.mayor === n && (role === 'master' || (wk.mode === 'werewolf' && role === 'villager'))) return art(wk.mode === 'werewolf' ? 'mayor' : 'master');
    return art(role);
  }
  const roleColor = role => ({ master: '#e7c47c', mayor: '#e7c47c', insider: '#6cc3b8', common: '#9cc59a', seer: '#b7a6f2', werewolf: '#e0806b', villager: '#9cc59a' }[role] || '#e7c47c');

  function token(answer, extra = '') {
    return `<span class="wk-token wk-t-${esc(answer)}${extra}" title="${esc(t('ans_' + answer))}" aria-label="${esc(t('ans_' + answer))}"><b aria-hidden="true">${TOKEN_GLYPH[answer] || '·'}</b></span>`;
  }
  function tokenLabel(answer) { return `<span class="wk-answer wk-t-${esc(answer)}">${token(answer)}<span>${esc(t('ans_' + answer))}</span></span>`; }
  function timer(wk, { big = false, total = null } = {}) {
    if (wk.phase === 'paused') return `<span class="wk-clock${big ? ' is-big' : ''} is-paused">${esc(clock(wk.remainingMs || 0))}</span>`;
    if (!(wk.deadline > 0)) return '';
    return `<span class="wk-clock${big ? ' is-big' : ''}" data-wk-deadline="${Number(wk.deadline)}"${wk.phase === 'speaking' ? ' data-wk-warning-ms="8000"' : ''}${total ? ` data-wk-total="${Number(total)}"` : ''}>—:—</span>`;
  }
  // Paint every live countdown in `root` from one clock; no re-render needed.
  function paintTimers(root, now) {
    if (!root?.querySelectorAll) return;
    for (const el of root.querySelectorAll('[data-wk-deadline]')) {
      const left = Number(el.dataset.wkDeadline) - now;
      const text = el.dataset.wkFormat === 'seconds' ? String(Math.max(0, Math.ceil(left / 1000))) : clock(left);
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle('is-low', left <= Number(el.dataset.wkWarningMs || 30000) && left > 0 && el.dataset.wkFormat !== 'seconds');
      const ring = el.closest('[data-wk-ring]');
      if (ring && el.dataset.wkTotal) ring.style.setProperty('--wk-progress', String(Math.max(0, Math.min(1, left / Number(el.dataset.wkTotal)))));
    }
  }
  function compositionLine(wk) {
    const comp = wk.composition; if (!comp) return '';
    const order = comp.mode === 'werewolf' ? ['seer', 'werewolf', 'villager'] : ['insider', 'common'];
    const chips = order.filter(role => obj(comp.counts)[role]).map(role =>
      `<span class="wk-chip" style="--role:${roleColor(role)}"><span class="wk-chip-art">${art(role)}</span>${esc(t('role_' + role))} ×${Number(comp.counts[role])}</span>`).join('');
    return `<div class="wk-composition"><span class="wk-kicker">${esc(t('hidden'))}${comp.mayorSecret ? ' · ' + esc(t('mayorInDeal')) : ''}</span><div class="wk-chips">${chips}</div></div>`;
  }
  function paper(wordView, { kicker = t('secretWord'), size = '' } = {}) {
    if (!wordView) return '';
    return `<div class="wk-paper ${size}"><span class="wk-kicker">${esc(kicker)}</span><strong lang="en">${esc(wordView.en)}</strong>${lang() === 'zh' && wordView.zh ? `<span class="wk-paper-zh" lang="zh-Hant">${esc(wordView.zh)}</span>` : ''}</div>`;
  }
  function logList(wk, { limit = 0, me = 0 } = {}) {
    const entries = list(wk.log).slice().reverse();
    const shown = limit ? entries.slice(0, limit) : entries;
    if (!shown.length) return `<p class="wk-soft wk-empty">${esc(t('noAnswersYet'))}</p>`;
    return `<ol class="wk-log">${shown.map(entry => `<li class="wk-log-row${entry.playerNum === me ? ' is-me' : ''}${entry.answer === 'correct' ? ' is-correct' : ''}">${token(entry.answer)}<span class="wk-log-body"><span class="wk-log-who">${esc(nameOf(wk, entry.playerNum))}<em>${esc(t('ans_' + entry.answer))}</em></span>${entry.text ? `<span class="wk-log-q" lang="en">“${esc(entry.text)}”</span>` : ''}</span></li>`).join('')}</ol>`;
  }
  function miniTally(tally) {
    const order = ['correct', 'yes', 'no', 'maybe', 'close', 'far', 'unknown'];
    const parts = order.filter(answer => obj(tally)[answer]).map(answer => `<span class="wk-mini wk-t-${answer}">${TOKEN_GLYPH[answer]}${tally[answer] > 1 ? `<i>${Number(tally[answer])}</i>` : ''}</span>`);
    return parts.length ? `<span class="wk-minis">${parts.join('')}</span>` : '';
  }
  function seats(wk, me = 0) {
    const tallies = obj(wk.tallies), queue = list(wk.queue).map(entry => entry.playerNum);
    const voted = new Set(list(wk.ballots?.voted));
    const result = wk.result;
    return `<ol class="wk-seats" aria-label="Players">${seatsOf(wk).map(player => {
      const n = player.playerNum, role = result ? obj(result.roles)[n] : null;
      const answerer = wk.mayor === n && player.inRound;
      const pos = queue.indexOf(n);
      const speakingNow = (wk.phase === 'speaking' || (wk.phase === 'paused' && wk.pausedFrom === 'speaking')) && wk.speaking?.playerNum === n;
      const cls = ['wk-seat', player.active ? '' : 'is-out', n === me ? 'is-me' : '', wk.current?.playerNum === n || speakingNow ? 'is-asking' : '',
        answerer ? 'is-answerer' : '', voted.has(n) ? 'is-voted' : '', result && list(result.outcome?.winners).includes(n) ? 'is-winner' : ''].filter(Boolean).join(' ');
      let badge = '';
      if (role) badge = `<span class="wk-seat-role" style="--role:${roleColor(role)}"><span class="wk-chip-art">${roleArt(role, wk, n)}</span>${esc(answerer && wk.mode === 'werewolf' && role === 'villager' ? t('role_mayor') : t('role_' + role))}${answerer && wk.mode === 'werewolf' && role !== 'villager' ? ` · ${esc(t('role_mayor'))}` : ''}</span>`;
      else if (answerer) badge = `<span class="wk-seat-role" style="--role:#e7c47c"><span class="wk-chip-art">${art(wk.mode === 'werewolf' ? 'mayor' : 'master')}</span>${esc(t(answererKey(wk.mode)))}</span>`;
      else if (wk.current?.playerNum === n) badge = `<span class="wk-seat-flag is-now">${esc(t('nowAsking'))}</span>`;
      else if (pos >= 0) badge = `<span class="wk-seat-flag">#${pos + 2}</span>`;
      else if (voted.has(n)) badge = `<span class="wk-seat-flag is-voted">${esc(t('youVoted'))}</span>`;
      if (speakingNow) badge += `<span class="wk-seat-flag is-now">${esc(t('speakingTitle'))}</span>`;
      const points = result && obj(result.points)[n] ? `<span class="wk-seat-points">+${Number(result.points[n])}</span>` : '';
      return `<li class="${cls}"><span class="wk-seat-top"><span class="wk-seat-name">${esc(player.name || t('player', { n }))}${n === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><span class="wk-seat-score">${esc(pts(player.score))}${points}</span></span>${badge}${player.active ? miniTally(tallies[n]) : `<span class="wk-seat-flag">${esc(t('sittingOut'))}</span>`}</li>`;
    }).join('')}</ol>`;
  }
  function standings(wk, me = 0) {
    const rows = list(wk.standings);
    const lead = rows.filter(row => row.leading);
    let rank = 0, last = null;
    const items = rows.map((row, index) => {
      if (row.score !== last) { rank = index + 1; last = row.score; }
      return `<li class="wk-rank${row.leading ? ' is-winner' : ''}${row.playerNum === me ? ' is-me' : ''}"><span class="wk-rank-n">${rank}</span><span class="wk-rank-name">${esc(row.name || t('player', { n: row.playerNum }))}${row.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><span class="wk-rank-score">${esc(pts(row.score))}</span></li>`;
    }).join('');
    return `<div class="wk-final"><p class="wk-kicker">${lead.length ? esc(t(lead.length > 1 ? 'winners' : 'winner')) + ' · ' + esc(names(wk, lead.map(row => row.playerNum))) : ''}</p><h2 class="wk-final-title">${esc(t('finished'))}</h2>${wk.stopped ? `<p class="wk-soft">${esc(t('stoppedEarly'))}</p>` : ''}<ol class="wk-ranks">${items}</ol></div>`;
  }
  function outcomeText(outcome) {
    const key = outcome?.key || 'void';
    const sub = key === 'void' ? 'sub_void_' + (outcome?.reason === 'answerer_left' ? 'answerer_left' : 'host') : 'sub_' + key;
    return { title: t('out_' + key), sub: t(sub) };
  }
  const outcomeArt = outcome => ({ village: 'villager', wolves: 'werewolf', commons: 'common', insider: 'insider' }[outcome?.team] || 'mark');
  function ballotLines(wk) {
    const result = wk.result; if (!result) return '';
    const rows = [];
    const pairs = (box, title) => {
      const entries = Object.entries(obj(box));
      if (!entries.length) return;
      rows.push(`<div class="wk-ballots"><span class="wk-kicker">${esc(title)}</span><ul>${entries.map(([voter, target]) =>
        `<li><span>${esc(nameOf(wk, Number(voter)))}</span><span aria-hidden="true">→</span><strong>${esc(typeof target === 'string' ? t(target === 'yes' ? 'judgeYes' : 'judgeNo') : nameOf(wk, Number(target)))}</strong></li>`).join('')}</ul></div>`);
    };
    pairs(result.picks, t('picksTitle'));
    pairs(result.judge, t('judgeTitle', { name: nameOf(wk, result.guess?.playerNum) }));
    pairs(result.votes, t('votesTitle'));
    if (result.masterPick != null) pairs({ [result.mayor]: result.masterPick }, t('masterGuessPick'));
    if (result.outcome?.tieBreak != null) rows.push(`<p class="wk-soft">${esc(t('tieBreak'))}</p>`);
    return rows.join('');
  }
  function resultBlock(wk, me = 0) {
    const result = wk.result, outcome = result?.outcome, text = outcomeText(outcome);
    const mine = me ? list(outcome?.winners).includes(me) : null;
    const roles = obj(result?.roles);
    const reveal = `<ul class="wk-reveal">${seatsOf(wk).map(player => {
      const n = player.playerNum, role = roles[n], answerer = result?.mayor === n, total = `<span class="wk-reveal-score">${esc(pts(player.score))}</span>`;
      if (!role) return `<li class="wk-reveal-card is-out${n === me ? ' is-me' : ''}" style="--role:#8b93a8"><span class="wk-reveal-art">${art('mark')}</span><span class="wk-reveal-name">${esc(nameOf(wk, n))}</span><span class="wk-reveal-role">${esc(t('sittingOut'))}</span>${total}</li>`;
      const label = answerer && wk.mode === 'werewolf' ? (role === 'villager' ? t('role_mayor') : `${t('role_' + role)} · ${t('role_mayor')}`) : t('role_' + role);
      return `<li class="wk-reveal-card${list(outcome?.winners).includes(n) ? ' is-winner' : ''}${n === me ? ' is-me' : ''}" style="--role:${roleColor(role)}"><span class="wk-reveal-art">${roleArt(role, wk, n)}</span><span class="wk-reveal-name">${esc(nameOf(wk, n))}</span><span class="wk-reveal-role">${esc(label)}</span>${total}${obj(result.points)[n] ? `<span class="wk-reveal-pts">+${Number(result.points[n])}</span>` : ''}</li>`;
    }).join('')}</ul>`;
    return `<div class="wk-result wk-team-${esc(outcome?.team || 'none')}"><div class="wk-result-head"><span class="wk-result-art">${art(outcomeArt(outcome))}</span><div><h2>${esc(text.title)}</h2><p>${esc(text.sub)}</p>${mine === null ? '' : `<p class="wk-result-me ${mine ? 'is-win' : 'is-lose'}">${esc(t(mine ? 'youWin' : 'youLose'))}${mine && obj(result.points)[me] ? ` · +${Number(result.points[me])}` : ''}</p>`}</div></div>${paper(result?.word, { kicker: t('theWordWas'), size: 'is-wide' })}${result?.judgeResult ? `<p class="wk-soft">${esc(t('judgeResult', result.judgeResult))}</p>` : ''}<span class="wk-kicker">${esc(t('revealTitle'))}</span>${reveal}${ballotLines(wk)}</div>`;
  }
  function historyList(wk) {
    const rows = list(wk.history).slice(-5).reverse();
    if (!rows.length) return '';
    return `<span class="wk-kicker">${esc(t('previousRounds'))}</span><ol class="wk-history">${rows.map(row => `<li><span class="wk-history-no">${Number(row.no)}</span><strong lang="en">${esc(row.word?.en || '—')}</strong><span>${esc(t('win_' + (WINNER[row.key] || 'none')))}</span></li>`).join('')}</ol>`;
  }
  function guessLine(wk) {
    if (!wk.guess) return '';
    return `<p class="wk-guess">${esc(t('guessedBy', { name: nameOf(wk, wk.guess.playerNum), time: clock(wk.guess.elapsedMs || 0) }))}</p>`;
  }
  function endLine(wk) {
    if (wk.endReason === 'tokens') return t('tokensOut');
    if (wk.endReason === 'host') return t('endedByHost');
    return t('wordSecret');
  }
  function ballotProgress(wk) {
    return wk.ballots ? `<p class="wk-progress-line">${esc(t('votedCount', { cast: wk.ballots.cast, total: wk.ballots.total }))}</p>` : '';
  }
  function speaking(wk, mine = false) {
    const turn = wk.speaking || {}, order = list(turn.order);
    const next = order.slice(Number(turn.index) + 1).find(n => seatsOf(wk).some(p => p.playerNum === n && p.active));
    const heading = mine ? t('speakingYourTurn') : t('speakingNow', { name: nameOf(wk, turn.playerNum) });
    return `${wk.word ? paper(wk.word, { kicker: t('wordFound') }) + guessLine(wk) : `<p class="wk-kicker">${esc(endLine(wk))}</p>`}<p class="wk-kicker">${esc(t('speakingTitle'))} · ${esc(t('speakingProgress', { n: Number(turn.index) + 1, total: turn.total || order.length }))}</p><h3 class="wk-speaking-name">${esc(heading)}</h3>${timer(wk)}<p class="wk-hint">${esc(t('speakingHint'))}</p>${next != null ? `<p class="wk-speaking-next">${esc(t('speakingNext', { name: nameOf(wk, next) }))}</p>` : ''}<p class="wk-soft">${esc(t('speakingAfter_' + turn.after))}</p>`;
  }

  // ── the shared host screen ─────────────────────────────────────────────
  function focus(wk) {
    const answerer = nameOf(wk, wk.mayor), mode = wk.mode;
    switch (wk.phase === 'paused' ? wk.pausedFrom : wk.phase) {
      case 'choose': return `<span class="wk-focus-art">${art(mode === 'werewolf' ? 'mayor' : 'master')}</span><p class="wk-kicker">${esc(t(answererKey(mode)))}</p><h3 class="wk-who">${esc(answerer)}</h3><p class="wk-hint">${esc(t('choosing', { name: answerer }))}</p><p class="wk-soft">${esc(t('choosingHint'))}</p>${compositionLine(wk)}`;
      case 'countdown': return `<p class="wk-kicker">${esc(t('getReady'))}</p><div class="wk-count"><span data-wk-deadline="${Number(wk.deadline) || 0}" data-wk-format="seconds">5</span></div><p class="wk-hint">${esc(t('getReadyHint'))}</p>${compositionLine(wk)}`;
      case 'questions': {
        const now = wk.current, queue = list(wk.queue);
        const budget = wk.tokens?.budget ? `<p class="wk-meter"><span>${esc(t('tokensLeft', { n: Math.max(0, wk.tokens.budget - wk.tokens.used) }))}</span><span class="wk-meter-bar"><i style="width:${Math.max(0, Math.min(100, 100 - (wk.tokens.used / wk.tokens.budget) * 100))}%"></i></span></p>` : '';
        return `<div class="wk-ring" data-wk-ring>${timer(wk, { big: true, total: wk.questionMs })}</div><span class="wk-ring-label">${esc(t('timeLeft'))}</span>${budget}<div class="wk-asking${now ? ' is-live' : ''}"><span class="wk-kicker">${esc(t('nowAsking'))}</span>${now ? `<strong class="wk-asking-name">${esc(nameOf(wk, now.playerNum))}</strong>${now.text ? `<span class="wk-asking-q" lang="en">“${esc(now.text)}”</span>` : ''}` : `<span class="wk-soft">${esc(t('nobodyAsking'))}</span>`}${queue.length ? `<span class="wk-queue">${esc(t('nextInLine', { names: names(wk, queue.map(entry => entry.playerNum)) }))}</span>` : ''}</div>`;
      }
      case 'hunt': return `${paper(wk.word, { kicker: t('wordFound'), size: 'is-wide' })}${guessLine(wk)}<div class="wk-wolves"><span class="wk-focus-art is-small">${art('werewolf')}</span><span>${esc(t('wolvesRevealed', { names: names(wk, wk.wolves) }))}</span></div><h3 class="wk-title">${esc(t('huntTitle'))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('huntHint'))}</p>${ballotProgress(wk)}`;
      case 'accuse': return `<p class="wk-kicker">${esc(endLine(wk))}</p><span class="wk-focus-art">${art('werewolf')}</span><h3 class="wk-title">${esc(t('accuseTitle'))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('accuseHint'))}</p>${ballotProgress(wk)}`;
      case 'discuss': return `${paper(wk.word, { kicker: t('wordFound'), size: 'is-wide' })}${guessLine(wk)}<h3 class="wk-title">${esc(t('discussTitle'))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('discussHint'))}</p>`;
      case 'speaking': return speaking(wk);
      case 'judge': return `${paper(wk.word, { kicker: t('wordFound') })}<span class="wk-focus-art is-small">${art('insider')}</span><h3 class="wk-title">${esc(t('judgeTitle', { name: nameOf(wk, wk.judgeTarget) }))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('judgeHint', { name: nameOf(wk, wk.judgeTarget) }))}</p>${ballotProgress(wk)}`;
      case 'vote': return `${paper(wk.word, { kicker: t('wordFound') })}<span class="wk-focus-art is-small">${art('insider')}</span><h3 class="wk-title">${esc(t('voteTitle'))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('voteHint', { name: nameOf(wk, wk.judgeTarget) }))}</p>${ballotProgress(wk)}`;
      case 'masterGuess': return `<p class="wk-kicker">${esc(endLine(wk))}</p><span class="wk-focus-art">${art('master')}</span><h3 class="wk-title">${esc(t('masterGuessTitle', { name: answerer }))}</h3>${timer(wk)}<p class="wk-hint">${esc(t('masterGuessHint'))}</p>`;
      default: return '';
    }
  }
  function stage(wk) {
    if (!wk) return '';
    if (wk.phase === 'finished') return `<div class="wk-stage wk-phase-finished">${standings(wk, 0)}</div>`;
    const strip = `<div class="wk-strip"><span class="wk-pill">${esc(t('round', { n: wk.roundNo }))}</span><span class="wk-pill">${esc(t('mode_' + wk.mode))}</span>${wk.mayor != null ? `<span class="wk-pill">${esc(t(answererKey(wk.mode)))} · ${esc(nameOf(wk, wk.mayor))}</span>` : ''}</div>`;
    if (wk.phase === 'result') return `<div class="wk-stage wk-phase-result">${strip}${resultBlock(wk, 0)}</div>`;
    const paused = wk.phase === 'paused' ? `<div class="wk-paused"><strong>${esc(t('paused'))}</strong><span>${esc(t('pausedHint'))}</span></div>` : '';
    const showLog = ['questions', 'hunt', 'accuse', 'discuss', 'speaking', 'judge', 'vote', 'masterGuess'].includes(wk.phase === 'paused' ? wk.pausedFrom : wk.phase);
    const side = showLog ? `<aside class="wk-side"><span class="wk-kicker">${esc(t('answersTitle'))}</span>${logList(wk)}</aside>`
      : `<aside class="wk-side wk-side-rules"><span class="wk-kicker">${esc(t('mode_' + wk.mode))}</span><p>${esc(t('pitch_' + wk.mode))}</p><span class="wk-kicker">${esc(t('tokensLegend'))}</span><div class="wk-tokens-legend">${(ANSWERS[wk.mode] || ANSWERS.insider).map(tokenLabel).join('')}</div>${historyList(wk)}</aside>`;
    return `<div class="wk-stage wk-phase-${esc(wk.phase)}${wk.phase === 'paused' ? ' wk-from-' + esc(wk.pausedFrom) : ''}">${strip}<div class="wk-main"><section class="wk-focus">${paused}${focus(wk)}</section>${side}</div>${seats(wk, 0)}</div>`;
  }

  // ── player card ─────────────────────────────────────────────────────────
  class Card {
    // `table: true` = the card runs the table itself (no host page needed):
    // commands settle directly and the Table controls panel is available.
    constructor(element, { now = () => Date.now(), connected = () => true, nameBanner = () => '', send = null, table = false } = {}) {
      this.element = element; this.now = now; this.connected = connected; this.nameBanner = nameBanner; this.send = send; this.table = table === true;
      this.data = null; this.destroyed = false; this.keys = {}; this.pending = null; this.error = ''; this.armed = null;
      this.draft = ''; this.wasAsking = false; this.wasInLine = false; this.pressing = false; this.dirty = false; this.scrollToTurn = false; this.showOther = false;
      this.armedControl = ''; this.settingsDirty = false; this.settingsKey = ''; this.controlsNote = '';
      element.innerHTML = `<div class="secret-card wk-card"><div data-wk-head></div><div data-wk-main></div><div class="wk-composer" data-wk-composer hidden><label class="wk-composer-label"><span data-wk-composer-label></span><input type="text" maxlength="80" autocomplete="off" enterkeyhint="send" lang="en" data-wk-input></label><p class="wk-soft" data-wk-composer-hint></p><button type="button" class="wk-button wk-small" data-wk-save hidden></button></div><div data-wk-tail></div><details class="wk-controls" data-wk-controls hidden><summary class="wk-controls-summary"><span class="wk-controls-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/></svg></span><span class="wk-controls-text"><strong data-wk-controls-title></strong><small data-wk-controls-sub></small></span></summary><div class="wk-controls-body"><div data-wk-controls-live></div><div class="wk-controls-settings" data-wk-controls-settings></div><p class="wk-feedback" data-wk-controls-note role="status"></p></div></details><p class="wk-feedback" data-wk-error role="status"></p><p class="wk-feedback" data-wk-connection role="status"></p></div>`;
      this.root = element.firstElementChild;
      this.regions = { head: this.root.querySelector('[data-wk-head]'), main: this.root.querySelector('[data-wk-main]'), tail: this.root.querySelector('[data-wk-tail]') };
      this.composer = this.root.querySelector('[data-wk-composer]'); this.input = this.root.querySelector('[data-wk-input]'); this.save = this.root.querySelector('[data-wk-save]');
      this.controls = this.root.querySelector('[data-wk-controls]');
      this.controlParts = { live: this.root.querySelector('[data-wk-controls-live]'), settings: this.root.querySelector('[data-wk-controls-settings]'), note: this.root.querySelector('[data-wk-controls-note]') };
      this.click = event => {
        if (event.target.closest('[data-wk-save]')) { this.sendText(); return; }
        if (event.target.closest('[data-wk-save-settings]')) { this.saveSettings(); return; }
        if (event.target.closest('[data-wk-ui="other"]')) { this.showOther = !this.showOther; this.keys = {}; this.render(); return; }
        const button = event.target.closest('[data-wk-action]');
        if (!button || button.disabled || !this.root.contains(button)) return;
        // Table controls that end a phase, cancel a round, sit someone out or
        // restart take a second tap.
        const confirm = button.dataset.wkConfirm;
        if (confirm && this.armedControl !== confirm) { this.armControl(confirm); return; }
        if (confirm) this.disarmControl();
        const payload = {};
        for (const [key, value] of Object.entries(button.dataset)) if (key.startsWith('wkArg')) {
          const field = key.slice(5, 6).toLowerCase() + key.slice(6);
          payload[field] = /^-?\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value === 'none' ? null : value;
        }
        this.action(button.dataset.wkAction, payload, button);
      };
      this.settingsChange = event => {
        const field = event.target.closest('[data-wk-set]'); if (!field) return;
        this.settingsDirty = true; this.controlsNote = ''; this.controlParts.note.textContent = '';
        if (field.dataset.wkSet === 'mode') {
          const minutes = this.controls.querySelector('[data-wk-set="questionMinutes"]');
          if (minutes) minutes.value = String(RULES().defaultQuestionMinutes[field.value] || 5);
          this.showModeOnly(field.value);
        }
      };
      // Never rebuild buttons under a finger: a click that starts on one node
      // and ends on its replacement is silently lost on phones.
      this.down = event => { if (event.target.closest('button')) this.pressing = true; };
      this.up = () => { if (!this.pressing) return; this.pressing = false; setTimeout(() => { if (this.dirty && !this.pressing) { this.dirty = false; this.render(); } }, 0); };
      this.typing = () => { this.draft = this.input.value; this.syncComposer(); };
      this.key = event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); this.composerEnter(); } };
      this.root.addEventListener('click', this.click);
      this.controls.addEventListener('change', this.settingsChange);
      this.root.addEventListener('pointerdown', this.down);
      for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, this.up);
      this.input.addEventListener('input', this.typing);
      this.input.addEventListener('keydown', this.key);
      this.timer = setInterval(() => this.paint(), 250);
    }
    get wk() { return this.data?.wk || null; }
    action(type, payload = {}, button = null) {
      const wk = this.wk;
      if (!wk || !this.send || this.pending || !this.connected()) return;
      // "Correct" ends the questions for everyone, so it takes two taps.
      if (type === 'answer' && payload.answer === 'correct' && this.armed !== wk.current?.id) {
        this.armed = wk.current?.id || null; this.keys = {}; this.render();
        clearTimeout(this.disarm);
        this.disarm = setTimeout(() => { if (this.armed) { this.armed = null; this.keys = {}; this.render(); } }, 5000);
        return;
      }
      if (type === 'answer') this.armed = null;
      if (type === 'raise') payload.text = this.draft;
      if (type === 'answer') payload.askId = wk.current?.id;
      if (type === 'restart' && !payload.settings) payload.settings = wk.settings;
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      this.pending = { id, type, sessionId: wk.sessionId, stage: wk.stage };
      this.error = ''; this.keys = {}; this.render();
      return Promise.resolve(this.send(Object.assign({ id, type, sessionId: wk.sessionId, stage: wk.stage }, payload))).then(() => {
        // Run by the table: the command has already settled.
        if (!this.table || this.pending?.id !== id) return true;
        this.pending = null; this.keys = {}; this.render();
        return true;
      }, error => {
        if (this.pending?.id !== id) return false;
        const code = error?.message;
        this.pending = null; this.error = t(errorKey(this.table ? (code === 'offline' ? 'offline' : code) : code === 'stale_turn' ? 'stale_turn' : 'error'));
        this.keys = {}; this.render();
        return false;
      });
    }
    armControl(key) {
      this.armedControl = key; this.keys = {}; this.render();
      clearTimeout(this.controlTimer);
      this.controlTimer = setTimeout(() => { if (this.armedControl) { this.armedControl = ''; this.keys = {}; this.render(); } }, 4000);
    }
    disarmControl() { this.armedControl = ''; clearTimeout(this.controlTimer); }
    readSettings() {
      const get = key => this.controls.querySelector(`[data-wk-set="${key}"]`);
      const wolves = get('wolves')?.value;
      return { mode: get('mode').value, questionMinutes: Number(get('questionMinutes').value), turnSeconds: Number(get('turnSeconds').value), difficulty: get('difficulty').value,
        tokens: Number(get('tokens').value), wolves: wolves === 'auto' ? 'auto' : Number(wolves),
        mayorSecret: !!get('mayorSecret')?.checked, masterGuess: !!get('masterGuess')?.checked };
    }
    async saveSettings() {
      if (!this.wk || this.pending) return;
      const ok = await this.action('settings', { settings: this.readSettings() });
      if (!ok) return;
      this.settingsDirty = false; this.settingsKey = ''; this.controlsNote = t('saved');
      this.render();
    }
    sendText() {
      const me = this.wk?.me;
      if (!me || !(me.asking || me.queuePos > 0)) return;
      this.action('text', { text: this.draft });
    }
    composerEnter() {
      const me = this.wk?.me; if (!me) return;
      if (me.asking || me.queuePos > 0) this.sendText();
      else if (me.canRaise) this.action('raise');
    }
    update(data) {
      if (this.destroyed || !data?.wk) return;
      const wk = data.wk, previous = this.wk;
      this.data = data;
      let replied = false;
      if (this.pending && wk.reply?.id === this.pending.id) {
        this.error = wk.reply.error ? t(errorKey(wk.reply.error)) : '';
        this.pending = null; replied = true;
      } else if (this.pending && (this.pending.sessionId !== wk.sessionId || this.pending.stage !== wk.stage)) this.pending = null;
      if (!replied && previous && (previous.sessionId !== wk.sessionId || previous.stage !== wk.stage)) this.error = '';
      const me = wk.me || {}, n = data.playerNum;
      // A pause keeps the line, the turn and any half-typed question.
      const live = view => view ? (view.phase === 'paused' ? view.pausedFrom : view.phase) : null;
      const asking = live(wk) === 'questions' && wk.current?.playerNum === n;
      const inLine = asking || (live(wk) === 'questions' && list(wk.queue).some(entry => entry.playerNum === n));
      // A short buzz when it becomes your turn, or a new round deals your role.
      const buzz = (asking && !this.wasAsking) || (wk.phase === 'choose' && previous && previous.roundNo !== wk.roundNo && me.inRound);
      if (buzz) { try { navigator.vibrate?.(asking ? [90, 40, 90] : [60]); } catch (_) {} }
      if (asking && !this.wasAsking) this.scrollToTurn = true;
      // Once a question has been answered (or the questions end), clear its
      // memo — but never under the fingers of someone typing the next one.
      const finished = (this.wasInLine && !inLine) || (live(previous) === 'questions' && live(wk) !== 'questions');
      if (finished && document.activeElement !== this.input) { this.draft = ''; this.input.value = ''; }
      if (this.armed && this.armed !== wk.current?.id) this.armed = null;
      if (previous?.current?.id !== wk.current?.id) this.showOther = false;
      if (previous && (previous.stage !== wk.stage || previous.sessionId !== wk.sessionId)) { this.disarmControl(); this.controlsNote = ''; }
      this.wasAsking = asking; this.wasInLine = inLine;
      if (this.pressing) { this.dirty = true; this.syncComposer(); this.paint(); return; }
      this.render();
    }
    render() {
      const data = this.data, wk = this.wk; if (!wk) return;
      const base = [lang(), data.name, data.playerNum, wk.sessionId, wk.turnId, wk.stage, this.pending?.id, this.error, this.armed, this.showOther];
      const keys = { head: JSON.stringify([lang(), data.name, data.playerNum, wk.roundNo, wk.mode, wk.phase === 'finished']), main: JSON.stringify(base), tail: JSON.stringify(base) };
      if (keys.head !== this.keys.head) this.regions.head.innerHTML = this.head(data);
      if (keys.main !== this.keys.main) this.regions.main.innerHTML = this.main(data);
      if (keys.tail !== this.keys.tail) this.regions.tail.innerHTML = this.tail(data);
      this.keys = keys;
      this.root.className = 'secret-card wk-card ' + this.theme(wk);
      this.root.querySelector('[data-wk-error]').textContent = this.error;
      this.renderControls();
      this.syncComposer();
      this.paint();
      if (this.scrollToTurn) {
        this.scrollToTurn = false;
        const zone = this.root.querySelector('.wk-zone-turn'); const box = zone?.getBoundingClientRect?.();
        if (box && (box.top < 0 || box.bottom > (window.innerHeight || 0))) zone.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
    theme(wk) {
      const me = wk.me || {};
      if (wk.phase === 'questions' && me.asking) return 'is-asking';
      if (wk.phase === 'speaking' && me.canFinishSpeaking) return 'is-asking';
      if (wk.phase === 'questions' && me.isMayor) return 'is-answering';
      if (wk.phase === 'result' && wk.result) return list(wk.result.outcome?.winners).includes(this.data.playerNum) ? 'is-won' : 'is-lost';
      return 'role-' + (me.role || 'none');
    }
    head(data) {
      const wk = data.wk;
      return `${this.nameBanner(data)}<div class="wk-card-head"><span class="wk-kicker wk-card-brand">${art('mark')}${esc(t('brand'))}</span>${wk.phase !== 'finished' ? `<span class="wk-pill">${esc(t('round', { n: wk.roundNo }))} · ${esc(t('modeShort_' + wk.mode))}</span>` : ''}</div>`;
    }
    ticket(wk) {
      const me = wk.me || {};
      if (!me.active && (!me.inRound || this.table)) return `<div class="wk-ticket is-muted"><span class="wk-ticket-art">${art('mark')}</span><span class="wk-ticket-text"><strong class="wk-ticket-role">${esc(t('sittingOutCard'))}</strong><span class="wk-ticket-goal">${esc(t('sittingOutHint'))}</span></span></div>${this.back(wk)}`;
      if (!me.inRound) return `<div class="wk-ticket is-muted"><span class="wk-ticket-art">${art('mark')}</span><span class="wk-ticket-text"><strong class="wk-ticket-role">${esc(t('watching'))}</strong><span class="wk-ticket-goal">${esc(t('watchingHint'))}</span></span></div>`;
      const role = me.role, werewolf = wk.mode === 'werewolf';
      let title = t('role_' + role), goal = t('goal_' + role), extra = '', artKey = role;
      if (me.isMayor && werewolf) {
        title = t('role_mayor'); goal = t('goal_mayor'); artKey = 'mayor';
        if (role !== 'villager' && wk.composition?.mayorSecret) extra = `<span class="wk-ticket-secret" style="--role:${roleColor(role)}">${esc(t('alsoSecret', { role: t('role_' + role) }))} · ${esc(t('goal_mayor_' + role))}</span>`;
      }
      if (me.isMayor && (wk.phase === 'speaking' || (wk.phase === 'paused' && wk.pausedFrom === 'speaking'))) goal = t(wk.speaking?.after === 'masterGuess' ? 'masterListeningRule' : 'answererSpeakingRule');
      const pack = role === 'werewolf' ? `<p class="wk-pack">${esc(list(me.teammates).length ? t('yourPack', { names: names(wk, me.teammates) }) : t('packAlone'))}</p>` : '';
      // Once the word is public the zone below shows it; one paper card is enough.
      return `<div class="wk-ticket" style="--role:${roleColor(me.isMayor ? 'mayor' : role)}"><span class="wk-ticket-art">${art(artKey)}</span><span class="wk-ticket-text"><span class="wk-kicker">${esc(t('youAre'))}</span><strong class="wk-ticket-role">${esc(title)}</strong><span class="wk-ticket-goal">${esc(goal)}</span>${extra}</span></div>${me.word && !wk.word ? paper(me.word) : ''}${pack}`;
    }
    // A seat that is sitting out can always bring itself back from its card.
    back(wk) {
      const me = wk.me || {}, n = Number(this.data.playerNum);
      if (!this.table || me.active || !list(wk.roster).some(p => p.playerNum === n)) return '';
      return `<button type="button" class="wk-button wk-primary wk-back" data-wk-action="exclude" data-wk-arg-player-num="${n}" data-wk-arg-active="true"${this.pending ? ' disabled' : ''}>${esc(t('imBack'))}</button>`;
    }
    main(data) {
      const wk = data.wk, me = wk.me || {};
      if (wk.phase === 'finished') return `${standings(wk, data.playerNum)}${this.table && me.canControl
        ? `<button type="button" class="wk-button wk-primary wk-huge" data-wk-action="restart"${this.pending ? ' disabled' : ''}>${esc(t('newGame'))}</button><p class="wk-soft wk-center">${esc(t('anyoneCanRestart'))}</p>`
        : `<p class="wk-soft wk-center">${esc(t(this.table ? 'anyoneCanRestart' : 'hostCanRestart'))}</p>`}${this.back(wk)}`;
      if (wk.phase === 'result') return `${resultBlock(wk, data.playerNum)}${me.canNext ? `<button type="button" class="wk-button wk-primary wk-huge" data-wk-action="next"${this.pending ? ' disabled' : ''}>${esc(t('nextRound'))}</button><p class="wk-soft wk-center">${esc(t('nextRoundHint'))}</p>` : this.back(wk)}`;
      return this.ticket(wk) + this.zone(wk);
    }
    zone(wk) {
      const me = wk.me || {}, busy = !!this.pending, answerer = nameOf(wk, wk.mayor);
      const phase = wk.phase === 'paused' ? 'paused' : wk.phase;
      const box = (cls, inner) => `<div class="wk-zone ${cls}">${inner}</div>`;
      if (phase === 'paused') return box('', `<h3>${esc(t('paused'))}</h3>${timer(wk)}<p>${esc(t('pausedHint'))}</p>${this.table && me.canControl ? `<button type="button" class="wk-button wk-primary" data-wk-action="resume"${busy ? ' disabled' : ''}>${esc(t('resume'))}</button>` : ''}`);
      if (phase === 'choose') {
        if (me.isMayor && me.options) {
          const options = list(me.options).map(option => `<button type="button" class="wk-option" data-wk-action="choose" data-wk-arg-word-id="${esc(option.id)}"${busy ? ' disabled' : ''}><span class="wk-level wk-level-${esc(option.level)}">${esc(t('level_' + option.level))}</span><strong lang="en">${esc(option.en)}</strong>${lang() === 'zh' ? `<span lang="zh-Hant">${esc(option.zh)}</span>` : ''}</button>`).join('');
          return box('wk-zone-choose', `<h3>${esc(t('chooseTitle'))}</h3><p>${esc(t('chooseHint'))}</p><div class="wk-options">${options}</div><button type="button" class="wk-button wk-small" data-wk-action="reroll"${busy || !me.rerollsLeft ? ' disabled' : ''}>${esc(t('reroll'))} · ${esc(t('rerollsLeft', { n: me.rerollsLeft }))}</button>`);
        }
        return box('', `<p class="wk-zone-line">${esc(t('choosing', { name: answerer }))}</p>`);
      }
      if (phase === 'countdown') return box('wk-zone-count', `<p class="wk-kicker">${esc(t('getReady'))}</p><div class="wk-count is-small"><span data-wk-deadline="${Number(wk.deadline) || 0}" data-wk-format="seconds">5</span></div><p>${esc(me.isMayor ? (wk.mode === 'werewolf' ? t('mayorSilent') : t('masterRule')) : t('getReadyHint'))}</p>`);
      if (phase === 'questions') return this.questions(wk);
      if (phase === 'speaking') return box('wk-zone-speaking' + (me.canFinishSpeaking ? ' is-my-speaking-turn' : ''), `${speaking(wk, !!me.canFinishSpeaking)}${me.canFinishSpeaking ? `<button type="button" class="wk-button wk-primary wk-huge" data-wk-action="speakerDone" data-wk-arg-turn-id="${esc(wk.speaking?.turnId)}"${busy ? ' disabled' : ''}>${esc(t('speakerDone'))}</button>` : ''}`);
      if (phase === 'hunt') {
        const head = `${paper(wk.word, { kicker: t('wordFound') })}${guessLine(wk)}<p class="wk-wolves-line">${esc(t('wolvesRevealed', { names: names(wk, wk.wolves) }))}</p>`;
        if (me.canVote) return box('wk-zone-vote is-hunt', `${head}<h3>${esc(t('huntPick'))}</h3>${timer(wk)}${this.targets(wk, 'pick')}`);
        return box('', `${head}<h3>${esc(t('huntTitle'))}</h3>${timer(wk)}<p>${esc(t('huntOthers'))}</p>${ballotProgress(wk)}`);
      }
      if (phase === 'accuse') {
        const head = `<p class="wk-kicker">${esc(endLine(wk))}</p><h3>${esc(t('accuseTitle'))}</h3>${timer(wk)}<p>${esc(t('accuseHint'))}</p>`;
        return box('wk-zone-vote', head + (me.canVote ? this.targets(wk, 'vote') : '') + ballotProgress(wk));
      }
      if (phase === 'discuss') return box('', `${paper(wk.word, { kicker: t('wordFound') })}${guessLine(wk)}<h3>${esc(t('discussTitle'))}</h3>${timer(wk)}<p>${esc(me.role === 'insider' ? t('discussInsider') : t('discussHint'))}</p>`);
      if (phase === 'judge') {
        const target = nameOf(wk, wk.judgeTarget);
        if (!me.canJudge) return box('', `<h3>${esc(wk.judgeTarget === this.data.playerNum ? t('judgeSelf') : t('judgeTitle', { name: target }))}</h3>${timer(wk)}${ballotProgress(wk)}`);
        const choice = value => `<button type="button" class="wk-button wk-judge${me.judge === value ? ' is-chosen' : ''}" data-wk-action="judge" data-wk-arg-choice="${value}"${busy ? ' disabled' : ''}>${esc(t(value === 'yes' ? 'judgeYes' : 'judgeNo'))}</button>`;
        return box('wk-zone-vote', `<h3>${esc(t('judgeTitle', { name: target }))}</h3>${timer(wk)}<p>${esc(t('judgeHint', { name: target }))}</p><div class="wk-judges">${choice('yes')}${choice('no')}</div>${ballotProgress(wk)}`);
      }
      if (phase === 'vote') return box('wk-zone-vote', `<h3>${esc(t('voteTitle'))}</h3>${timer(wk)}<p>${esc(t('voteHint', { name: nameOf(wk, wk.judgeTarget) }))}</p>${me.canVote ? this.targets(wk, 'vote') : ''}${ballotProgress(wk)}`);
      if (phase === 'masterGuess') {
        if (me.canVote) return box('wk-zone-vote', `<h3>${esc(t('masterGuessPick'))}</h3>${timer(wk)}<p>${esc(t('masterGuessHint'))}</p>${this.targets(wk, 'masterPick')}`);
        return box('', `<h3>${esc(t('masterGuessTitle', { name: answerer }))}</h3>${timer(wk)}<p>${esc(t('waitingFor', { name: answerer }))}</p>`);
      }
      return '';
    }
    targets(wk, type) {
      const me = wk.me || {}, busy = !!this.pending;
      const buttons = list(me.voteTargets).map(n => `<button type="button" class="wk-target${me.vote === n ? ' is-chosen' : ''}" data-wk-action="${type}" data-wk-arg-target="${Number(n)}"${busy ? ' disabled' : ''}>${esc(nameOf(wk, n))}</button>`).join('');
      const status = me.vote != null ? t('yourVote', { name: nameOf(wk, me.vote) }) : t('noVoteYet');
      return `<div class="wk-targets">${buttons}</div><p class="wk-vote-status${me.vote != null ? ' is-set' : ''}">${esc(status)}${me.vote != null && type !== 'masterPick' ? ` · ${esc(t('changeVote'))}` : ''}</p>`;
    }
    questions(wk) {
      const me = wk.me || {}, busy = !!this.pending, current = wk.current;
      const budget = wk.tokens?.budget ? t('tokensLeft', { n: Math.max(0, wk.tokens.budget - wk.tokens.used) }) : (wk.mode === 'werewolf' ? t('tokensUnlimited') : '');
      const status = `<div class="wk-status-row">${timer(wk)}${budget ? `<span class="wk-pill">${esc(budget)}</span>` : ''}</div>`;
      if (me.isMayor) {
        const pickable = seatsOf(wk).filter(p => p.active && p.inRound && p.playerNum !== wk.mayor);
        if (!current) return `<div class="wk-zone wk-zone-answer">${status}<p class="wk-zone-line">${esc(t('waitingQuestion'))}</p><p class="wk-soft">${esc(t('pickAsker'))}</p><div class="wk-targets">${pickable.map(p => `<button type="button" class="wk-target" data-wk-action="pickAsker" data-wk-arg-player-num="${p.playerNum}"${busy ? ' disabled' : ''}>${esc(p.name || t('player', { n: p.playerNum }))}</button>`).join('')}</div></div>`;
        const asker = nameOf(wk, current.playerNum);
        const answers = list(me.answers).filter(answer => answer !== 'correct').map(answer => `<button type="button" class="wk-answer-btn wk-t-${answer}" data-wk-action="answer" data-wk-arg-answer="${answer}"${busy ? ' disabled' : ''}>${token(answer)}<span>${esc(t('ans_' + answer))}</span></button>`).join('');
        const armed = this.armed === current.id;
        const queue = list(wk.queue);
        // Voices overlap: whoever actually said the word can be made the asker.
        const others = pickable.filter(p => p.playerNum !== current.playerNum);
        const other = this.showOther ? `<div class="wk-other"><p class="wk-soft">${esc(t('otherAskerHint'))}</p><div class="wk-targets">${others.map(p => `<button type="button" class="wk-target" data-wk-action="pickAsker" data-wk-arg-player-num="${p.playerNum}"${busy ? ' disabled' : ''}>${esc(p.name || t('player', { n: p.playerNum }))}</button>`).join('')}</div></div>` : '';
        return `<div class="wk-zone wk-zone-answer">${status}<span class="wk-kicker">${esc(t('answering'))}</span><strong class="wk-asking-name">${esc(asker)}</strong>${current.text ? `<span class="wk-asking-q" lang="en">“${esc(current.text)}”</span>` : ''}<div class="wk-answers wk-answers-${list(me.answers).length > 4 ? 'many' : 'few'}">${answers}</div><button type="button" class="wk-answer-btn wk-t-correct wk-correct${armed ? ' is-armed' : ''}" data-wk-action="answer" data-wk-arg-answer="correct"${busy ? ' disabled' : ''}>${token('correct')}<span>${esc(armed ? t('correctConfirm', { name: asker }) : t('ans_correct'))}</span></button><div class="wk-answer-tools"><button type="button" class="wk-button wk-small" data-wk-action="skip"${busy ? ' disabled' : ''}>${esc(t('skip', { name: asker }))}</button>${others.length ? `<button type="button" class="wk-button wk-small" data-wk-ui="other" aria-expanded="${this.showOther}">${esc(t('otherAsker'))}</button>` : ''}</div>${queue.length ? `<p class="wk-soft">${esc(t('nextInLine', { names: names(wk, queue.map(entry => entry.playerNum)) }))}</p>` : ''}${other}<p class="wk-soft">${esc(wk.mode === 'werewolf' ? t('mayorSilent') : t('masterRule'))}</p></div>`;
      }
      const asking = current ? `<p class="wk-now"><span class="wk-kicker">${esc(t('nowAsking'))}</span> <strong>${esc(nameOf(wk, current.playerNum))}</strong>${current.text && !me.asking ? ` <span class="wk-asking-q" lang="en">“${esc(current.text)}”</span>` : ''}</p>` : `<p class="wk-soft">${esc(t('nobodyAsking'))}</p>`;
      if (!me.inRound || !me.active) return `<div class="wk-zone">${status}${asking}</div>`;
      if (me.asking) return `<div class="wk-zone wk-zone-turn">${status}<h3>${esc(t('yourTurn'))}</h3><p>${esc(t('yourTurnHint'))}</p><button type="button" class="wk-button wk-small" data-wk-action="lower"${busy ? ' disabled' : ''}>${esc(t('neverMind'))}</button></div>`;
      if (me.queuePos > 0) return `<div class="wk-zone wk-zone-line">${status}${asking}<h3>${esc(t('inLine', { n: me.queuePos + 1 }))}</h3><p class="wk-soft">${esc(t('inLineHint'))}</p><button type="button" class="wk-button wk-small" data-wk-action="lower"${busy ? ' disabled' : ''}>${esc(t('leaveLine'))}</button></div>`;
      return `<div class="wk-zone">${status}${asking}<button type="button" class="wk-button wk-primary wk-huge" data-wk-action="raise"${busy || !me.canRaise ? ' disabled' : ''}>${esc(busy && this.pending?.type === 'raise' ? t('raising') : t('raise'))}</button></div>`;
    }
    tail(data) {
      const wk = data.wk, me = data.playerNum;
      if (['finished', 'choose', 'countdown'].includes(wk.phase)) return wk.phase === 'finished' ? '' : this.scoreline(wk, me);
      if (wk.phase === 'result') return this.scoreline(wk, me);
      return `<div class="wk-card-log"><span class="wk-kicker">${esc(t('recentAnswers'))}</span>${logList(wk, { limit: wk.phase === 'questions' ? 5 : 30, me })}</div>${this.scoreline(wk, me)}`;
    }
    scoreline(wk, me) {
      const rows = list(wk.standings);
      return `<details class="wk-scores"><summary><span class="wk-kicker">${esc(t('scores'))}</span><span>${esc(pts(rows.find(row => row.playerNum === me)?.score))}</span></summary><ol>${rows.map(row => `<li class="${row.playerNum === me ? 'is-me' : ''}"><span>${esc(row.name || t('player', { n: row.playerNum }))}</span><span>${esc(pts(row.score))}</span></li>`).join('')}</ol></details>`;
    }
    // ── Table controls: everything the host page could do, on any active card ──
    renderControls() {
      const wk = this.wk, me = wk?.me || {};
      const show = this.table && !!wk && me.canControl === true;
      this.controls.hidden = !show;
      if (!show) return;
      const title = this.controls.querySelector('[data-wk-controls-title]'), sub = this.controls.querySelector('[data-wk-controls-sub]');
      if (title.textContent !== t('controls')) title.textContent = t('controls');
      if (sub.textContent !== t('controlsSummary')) sub.textContent = t('controlsSummary');
      const liveKey = JSON.stringify([lang(), wk.sessionId, wk.stage, wk.phase, wk.roster, wk.online, wk.nextAnswerer, this.pending?.id, this.armedControl]);
      if (liveKey !== this.controlsKey) { this.controlParts.live.innerHTML = this.controlsLive(wk); this.controlsKey = liveKey; }
      const settingsKey = JSON.stringify([lang(), wk.sessionId, wk.settings]);
      if (settingsKey !== this.settingsKey && !this.settingsDirty) {
        this.controlParts.settings.innerHTML = this.settingsForm(wk.settings || {});
        this.showModeOnly(wk.settings?.mode);
        this.settingsKey = settingsKey;
      }
      const save = this.controls.querySelector('[data-wk-save-settings]');
      if (save) save.disabled = !!this.pending;
      for (const field of this.controls.querySelectorAll('[data-wk-set]')) field.disabled = !!this.pending;
      if (this.controlParts.note.textContent !== this.controlsNote) this.controlParts.note.textContent = this.controlsNote;
    }
    controlsLive(wk) {
      const me = this.data.playerNum, busy = this.pending ? ' disabled' : '', phase = wk.phase, timed = TIMED.includes(phase);
      const online = new Set(list(wk.online));
      const button = (type, label, { args = '', confirm = '', confirmLabel = '', primary = false } = {}) => {
        const armed = confirm && this.armedControl === confirm;
        return `<button type="button" class="wk-button wk-small${primary ? ' wk-primary' : ''}${armed ? ' wk-danger is-armed' : ''}" data-wk-action="${type}"${confirm ? ` data-wk-confirm="${esc(confirm)}"` : ''}${args}${busy}>${esc(armed ? confirmLabel : label)}</button>`;
      };
      const section = (kicker, inner, hint = '') => `<section class="wk-tools"><span class="wk-kicker">${esc(kicker)}</span>${hint ? `<p class="wk-soft">${esc(hint)}</p>` : ''}${inner}</section>`;
      const parts = [];
      if (timed || phase === 'paused') {
        const row = [button(phase === 'paused' ? 'resume' : 'pause', t(phase === 'paused' ? 'resume' : 'pause'))];
        if (timed && phase !== 'countdown') row.push(button('extend', t(phase === 'questions' ? 'extendQuestions' : 'extendOther')));
        if (phase === 'speaking') {
          const args = ` data-wk-arg-turn-id="${esc(wk.speaking?.turnId)}"`;
          row.push(button('nextSpeaker', t('nextSpeaker'), { args }));
          row.push(button('close', t('close_speaking'), { args, confirm: 'close:' + wk.stage, confirmLabel: t('skipSpeakingConfirm') }));
        } else if (timed) row.push(CONFIRM_CLOSE.includes(phase) ? button('close', t('close_' + phase), { confirm: 'close:' + wk.stage, confirmLabel: t('tapAgain') }) : button('close', t('close_' + phase)));
        parts.push(section(t('clockTools'), `<div class="wk-tool-row">${row.join('')}</div>`));
      }
      const next = wk.nextAnswerer;
      const players = seatsOf(wk).map(p => {
        const n = p.playerNum, name = p.name || t('player', { n }), isNext = next === n;
        const status = `${t(p.active ? 'playing' : 'sittingOut')} · ${t(online.has(n) ? 'onlineSeat' : 'offlineSeat')}`;
        const nextButton = p.active && phase !== 'finished' ? button('setNext', t(isNext ? 'nextChosen' : 'makeNext'), { args: ` data-wk-arg-player-num="${isNext ? 'none' : n}"` }) : '';
        const seatButton = p.active
          ? button('exclude', t('sitOut'), { args: ` data-wk-arg-player-num="${n}" data-wk-arg-active="false"`, confirm: 'out:' + n, confirmLabel: t('sitOutConfirm', { name }) })
          : button('exclude', t('rejoin'), { args: ` data-wk-arg-player-num="${n}" data-wk-arg-active="true"` });
        return `<li class="wk-tool-player${p.active ? '' : ' is-out'}${n === me ? ' is-me' : ''}"><span class="wk-tool-name"><span><i class="wk-dot${online.has(n) ? ' is-on' : ''}" aria-hidden="true"></i>${esc(name)}${n === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><small>${esc(status)}</small></span><span class="wk-tool-buttons">${nextButton}${seatButton}</span></li>`;
      }).join('');
      parts.push(section(t('playerTools'), `<p class="wk-progress-line">${esc(next != null ? t('nextAnswerer', { name: nameOf(wk, next) }) : t('nextAuto'))}</p><ul class="wk-tool-players">${players}</ul>`, t('rosterHint')));
      const roundLive = wk.roundNo > 0 && !['result', 'finished'].includes(phase);
      // After the final standings the card itself offers the new game.
      if (phase !== 'finished') {
        const game = [];
        if (roundLive) game.push(button('void', t('voidRound'), { confirm: 'void', confirmLabel: t('voidConfirm') }));
        game.push(button('restart', t('restart'), { confirm: 'restart', confirmLabel: t('restartConfirm') }));
        game.push(button('stop', t('stop'), { confirm: 'stop', confirmLabel: t('stopConfirm') }));
        parts.push(section(t('gameTools'), `<div class="wk-tool-row">${game.join('')}</div>`));
      }
      return parts.join('');
    }
    settingsForm(settings) {
      const rules = RULES(), mode = settings.mode || 'insider';
      const select = (key, values, label, value) => `<label class="wk-field"><span>${esc(label)}</span><select data-wk-set="${key}">${values.map(v => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(key === 'mode' ? t('mode_' + v) : key === 'questionMinutes' ? t('minutesN', { n: v }) : key === 'turnSeconds' ? t('secondsN', { n: v }) : key === 'difficulty' ? t('diff_' + v) : key === 'tokens' ? (Number(v) === 0 ? t('tokensNone') : String(v)) : t('wolves_' + v))}</option>`).join('')}</select></label>`;
      const check = (key, value, label, hint, only) => `<label class="wk-check" data-wk-set-only="${only}"><input type="checkbox" data-wk-set="${key}"${value ? ' checked' : ''}><span><span>${esc(label)}</span><small>${esc(hint)}</small></span></label>`;
      return `<section class="wk-tools"><span class="wk-kicker">${esc(t('nextSettings'))}</span><div class="wk-settings wk-card-settings">${select('mode', rules.modes, t('modeLabel'), mode)}${select('questionMinutes', rules.questionMinutes, t('minutes'), settings.questionMinutes ?? rules.defaultQuestionMinutes[mode])}${select('difficulty', rules.difficulties, t('difficulty'), settings.difficulty || 'mixed')}${select('turnSeconds', rules.turnSecondsOptions || [20, 25, 30], t('turnSeconds'), settings.turnSeconds ?? 25)}<div class="wk-mode-only" data-wk-set-only="werewolf">${select('tokens', rules.tokenOptions, t('tokens'), settings.tokens ?? 36)}${select('wolves', rules.wolfOptions, t('wolves'), settings.wolves ?? 'auto')}</div></div>${check('mayorSecret', !!settings.mayorSecret, t('mayorSecret'), t('mayorSecretHint'), 'werewolf')}${check('masterGuess', settings.masterGuess !== false, t('masterGuess'), t('masterGuessOptHint'), 'insider')}<button type="button" class="wk-button wk-small wk-primary" data-wk-save-settings>${esc(t('saveSettings'))}</button></section>`;
    }
    showModeOnly(mode) {
      for (const element of this.controls.querySelectorAll('[data-wk-set-only]')) element.hidden = element.dataset.wkSetOnly !== (mode || 'insider');
    }
    syncComposer() {
      const wk = this.wk, me = wk?.me || {};
      const show = !!wk && wk.phase === 'questions' && me.inRound && me.active && !me.isMayor;
      this.composer.hidden = !show;
      if (!show) return;
      const inLine = me.asking || me.queuePos > 0;
      const label = this.composer.querySelector('[data-wk-composer-label]'), hint = this.composer.querySelector('[data-wk-composer-hint]');
      if (label.textContent !== t('composerLabel')) label.textContent = t('composerLabel');
      if (hint.textContent !== t('composerHint')) hint.textContent = t('composerHint');
      if (this.input.placeholder !== t('composerPlaceholder')) this.input.placeholder = t('composerPlaceholder');
      this.save.textContent = t('composerSave');
      this.save.hidden = !inLine || this.draft.trim() === (me.myText || '').trim();
      this.save.disabled = !!this.pending;
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const now = this.now();
      paintTimers(this.root, now);
      const wk = this.wk, line = this.root.querySelector('[data-wk-connection]');
      if (line) line.textContent = !this.connected() ? t('offline') : !this.table && wk.hostLiveUntil && now > wk.hostLiveUntil + 4000 ? t('hostAway') : '';
    }
    destroy() {
      this.destroyed = true; clearInterval(this.timer); clearTimeout(this.disarm); clearTimeout(this.controlTimer);
      this.root.removeEventListener('click', this.click); this.root.removeEventListener('pointerdown', this.down);
      this.controls.removeEventListener('change', this.settingsChange);
      for (const type of ['pointerup', 'pointercancel']) window.removeEventListener(type, this.up);
      this.input.removeEventListener('input', this.typing); this.input.removeEventListener('keydown', this.key);
    }
  }

  return { t, esc, list, pts, art, token, tokenLabel, stage, standings, seats, logList, paintTimers, clock, nameOf, Card, errorKey, dict, roleColor };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WHO_KNOWS_UI;
