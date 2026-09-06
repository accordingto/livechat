/*
 * guide-data.js — the "how to play" briefing shown when a host opens a game.
 *
 * Rendered by guide.js. Every string is bilingual for the same reason the rest
 * of the UI is: this is host-facing chrome, not game content, so it follows the
 * site language toggle. (game-data.js prompts and the English game titles stay
 * English on purpose — see CLAUDE.md.)
 *
 * Section shapes the renderer understands — a section carries exactly one:
 *   paragraphs: [ {zh, en} ]                       prose
 *   steps:      [ {zh, en} ]                       auto-numbered
 *   roles:      [ {emoji, name:{zh,en}, desc:{zh,en}} ]
 *   tips:       [ {zh, en} ]                       bulleted
 */

const GUIDE_TITLES = {
  what:  { zh: '這是什麼遊戲', en: 'What this game is' },
  how:   { zh: '怎麼玩',       en: 'How to play' },
  roles: { zh: '角色與功能',   en: 'Roles' },
  who:   { zh: '誰做什麼',     en: 'Who does what' },
  tips:  { zh: '主持人小提示', en: 'Host tips' },
};

const GAME_GUIDES = {

  /* ══════════════════════ 🐺 Word Wolf ══════════════════════ */
  wordwolf: {
    players: { zh: '3–6 人', en: '3–6 players' },
    tagline: {
      zh: '大部分人拿到同一個字，只有一個人不一樣——而且沒有人知道自己是不是那個人。',
      en: 'Almost everyone gets the same secret word. One player gets a different one, and nobody is told which one they are.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '發牌之後，每位玩家的手機卡片上只會出現一個英文單字。多數人拿到的是同一個字，只有一位「臥底（Wolf）」拿到另一個很接近、但不一樣的字。',
          en: 'After the deal, each player sees a single English word on their own phone. Most of them share the same word; one player, the Wolf, gets a different but very similar one.' },
        { zh: '重點是：卡片上不會寫「你是臥底」。每個人都只看到自己的字，連臥底自己都不知道——他要靠聽別人的描述，才會慢慢發現不對勁。',
          en: 'The important part: no card says "you are the Wolf". Everyone only sees their word, the Wolf included. They find out by listening and noticing that something is off.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '主持人按「🐺 Deal Words」發字，每位玩家在自己的卡片上看到一個單字。',
          en: 'The host taps 🐺 Deal Words. Every player sees one word on their own card.' },
        { zh: '輪流用英文描述自己拿到的字，但不能直接把那個字說出來。描述要夠模糊（不然臥底立刻抄走），又要夠具體（不然自己被當成臥底）。',
          en: 'Take turns describing your word in English without saying it. Vague enough that the Wolf cannot copy you, specific enough that you are not mistaken for the Wolf.' },
        { zh: '聊過一兩輪之後，大家一起投票指認誰是臥底。主持人可以按「🎲 Pick Someone」隨機點人先發言。',
          en: 'After a round or two, everyone votes on who the Wolf is. The host can tap 🎲 Pick Someone to choose who speaks next at random.' },
        { zh: '投完票，主持人按「👁️ Reveal All」，畫面上會列出每個人拿到的字，以及誰才是真正的臥底。',
          en: 'Once the votes are in, the host taps 👁️ Reveal All to show every word on screen and unmask the Wolf.' },
        { zh: '多數人抓對臥底 → 村民贏；臥底沒被抓出來 → 臥底贏。',
          en: 'Wolf caught by the majority, the villagers win. Wolf survives the vote, the Wolf wins.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🐑', name: { zh: '一般玩家（多數）', en: 'Villagers (the majority)' },
          desc: { zh: '拿到多數字。目標是在不把答案送給臥底的前提下，找出誰的描述跟大家對不上。',
                  en: 'They share one word. Their job is to spot whose description does not fit, without handing the Wolf the answer.' } },
        { emoji: '🐺', name: { zh: 'Wolf 臥底（1 位）', en: 'The Wolf (one player)' },
          desc: { zh: '拿到不一樣的字，而且不知道自己就是臥底。發現苗頭不對之後，要一邊模仿別人的講法一邊混過去。',
                  en: 'Holds the odd word and does not know it. Once they realise, they have to blend in by echoing what everyone else says.' } },
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '不參與描述。負責發字、控制節奏、隨機點人，最後揭曉答案。',
                  en: 'Does not describe anything. Deals the words, keeps the pace, picks speakers, and reveals the answer at the end.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '兩個字通常非常像（例如 Donut / Bagel），所以第一輪的描述往往聽起來都一樣——這很正常，第二輪才會開始出現破綻。',
          en: 'The two words are deliberately close (Donut / Bagel), so round one usually sounds identical for everyone. The cracks show up in round two.' },
        { zh: '描述只能用英文講「特徵」，不能拼字、不能比手畫腳（大家也看不到）。',
          en: 'Describe features in English only. No spelling it out, and no gestures anyway since nobody has a camera.' },
        { zh: '「👁️ Reveal All」會把答案顯示在你分享的畫面上，投票結束前不要按。',
          en: '👁️ Reveal All puts the answer on the screen you are sharing. Do not tap it before the vote is done.' },
        { zh: '下方的 80 組詞組題庫預設收合，分享畫面時不要展開。',
          en: 'The 80-pair word list at the bottom stays collapsed by default. Leave it closed while sharing your screen.' },
      ]},
    ],
  },

  /* ══════════════════ 🙊 Say It Without Saying It ══════════════════ */
  taboo: {
    players: { zh: '2–6 人', en: '2–6 players' },
    tagline: {
      zh: '一個人要把一個英文單字解釋到有人猜出來，但最想用的那幾個字全部被禁用。',
      en: 'One player explains an English word until someone guesses it, with the most obvious words banned.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '每一輪會抽出一張卡：一個目標單字，加上六個禁字（實際生效幾個由設定決定）。這張卡只會出現在描述者與裁判的手機上，主持人分享的畫面上永遠看不到答案。',
          en: 'Each round draws a card: one target word plus six forbidden words (how many actually count is a setting). The card only reaches the clue giver and the referee — the answer never appears on the screen you are sharing.' },
        { zh: '描述者要用英文把這個字講到有人猜出來，但不能說出任何一個禁字；裁判在旁邊聽，抓到就可以舉發。',
          en: 'The clue giver talks until someone guesses, without using a single forbidden word. The referee listens for slips and can call them out.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '先在設定畫面依序選好難度（Easy／Medium／Hard）、要生效幾個禁字（2–6）、每一輪的秒數，然後按「🎮 開始遊戲」。',
          en: 'Work through the setup screen: difficulty (Easy / Medium / Hard), how many forbidden words count (2–6), and the round length. Then tap Start Game.' },
        { zh: '按「🎬 Deal a Word」發牌。系統自動輪流指派這一輪的描述者與裁判，倒數也會自動開始。',
          en: 'Tap 🎬 Deal a Word. The clue giver and referee are assigned automatically, and the countdown starts on its own.' },
        { zh: '描述者開始用英文描述。想到答案的人按自己卡片上的「🙋 Buzz in!」，然後直接用講的把答案喊出來。',
          en: 'The clue giver starts describing. Anyone with a guess taps 🙋 Buzz in! on their card and then says the answer out loud.' },
        { zh: '描述者在自己的卡片上判定：✅ 答對 → 描述者與猜對的人各得 1 分，該輪結束；❌ 沒猜中 → 換排隊中的下一位。',
          en: 'The clue giver judges on their own card: ✅ correct gives one point each to the guesser and the clue giver and ends the round; ❌ passes to the next player in the queue.' },
        { zh: '答錯的人會被鎖住，要等這一輪其他人都各搶答錯過一次，才會整批解鎖重新開放。',
          en: 'A wrong guesser is locked out until every other guesser has also buzzed and missed, then everyone unlocks at once.' },
        { zh: '裁判聽到禁字就按「🚨 Taboo!」舉發，由主持人裁決：成立 → 裁判 +3、描述者 −2，該輪結束；不成立 → 回合原封不動繼續。',
          en: 'The referee taps 🚨 Taboo! to report a slip and the host rules on it: upheld gives the referee +3 and the clue giver −2 and ends the round; rejected leaves the round untouched.' },
        { zh: '時間到還沒人猜出來 → 該輪 0 分並公布答案，按「▶️ Next Round」換下一位描述者。',
          en: 'If the clock runs out, nobody scores, the answer is revealed, and ▶️ Next Round hands the card to a new clue giver.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🎤', name: { zh: 'Clue giver 描述者', en: 'Clue giver' },
          desc: { zh: '卡片上看得到目標字與禁字。用英文描述，並負責判定搶答的人對不對。猜對時自己也 +1。',
                  en: 'Sees the target word and the forbidden list. Describes in English and judges each buzz. Scores +1 alongside whoever guesses right.' } },
        { emoji: '👀', name: { zh: 'Referee 裁判', en: 'Referee' },
          desc: { zh: '卡片上看得到禁字，但這一輪不能搶答。抓到描述者說出禁字就按 Taboo!，成立可得 3 分——這是裁判唯一的得分方式。',
                  en: 'Sees the forbidden list but cannot buzz this round. Calling a genuine slip is worth +3, and it is the only way a referee scores.' } },
        { emoji: '🙋', name: { zh: 'Guessers 猜題者', en: 'Guessers' },
          desc: { zh: '看不到禁字，純靠聽。按下搶答鈕之後用講的回答。',
                  en: 'Never see the forbidden words. They listen, buzz, and shout the answer.' } },
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '發牌、控制計時、裁決 Taboo! 舉發。主持人畫面上只有計分板，不會出現答案。',
                  en: 'Deals, runs the clock, and rules on Taboo! calls. The host screen shows the scoreboard and nothing secret.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '2 人局沒有裁判（沒有第三個人可以當），禁字功能會自動關閉。',
          en: 'A two-player game has no referee to spare, so forbidden words switch off automatically.' },
        { zh: '猜題者看不到禁字是刻意的——禁字就是最容易聯想到答案的字，發給猜的人等於送答案。',
          en: 'Hiding the forbidden list from guessers is deliberate: those words are the fastest route to the answer.' },
        { zh: '有人搶答或喊 Taboo! 時倒數會自動凍結，判定完才接著跑，不用手動暫停。',
          en: 'The clock freezes by itself on a buzz or a Taboo! call and resumes after the ruling. No need to pause manually.' },
        { zh: '遊戲進行中看不到設定。要改難度或秒數請按「⚙️ 編輯設定」回到設定畫面，正在進行的回合不會被中斷。',
          en: 'Settings are hidden during play. ⚙️ Edit settings takes you back without disturbing the round in progress.' },
      ]},
    ],
  },

  /* ══════════════════════ 🔥 Pick a Side! ══════════════════════ */
  hottake: {
    players: { zh: '2 人以上', en: '2+ players' },
    tagline: {
      zh: '抽一句故意講得很極端的意見，每個人選邊站，然後說出理由。',
      en: 'Spin up a deliberately bold opinion, everyone picks a side, then defends it.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '主持人按 Spin 抽出一句有爭議的英文意見。每位玩家在自己的手機上按 👍 同意／🤷 看情況／👎 不同意，主持人畫面上的三根長條會即時累加。',
          en: 'The host spins for a divisive English opinion. Players tap 👍 Agree, 🤷 It Depends, or 👎 Disagree on their own phones and the three bars on the host screen fill in live.' },
        { zh: '投票只是開場，真正的重點是接下來每個人用英文說出「為什麼」。',
          en: 'The vote is just the opening. The real game is everyone explaining why, in English.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「🔥 Spin」抽出一句意見，唸出來給大家聽。',
          en: 'Tap 🔥 Spin for an opinion and read it out loud.' },
        { zh: '每位玩家在自己的卡片上按 👍／🤷／👎。沒有連結的人可以口頭說，主持人直接點畫面上的按鈕幫他計票。',
          en: 'Players vote from their cards. Anyone without a link can just say it and the host taps the on-screen button for them.' },
        { zh: '票數出來之後，請少數派先講理由——通常最有話題性。',
          en: 'Once the tally is in, let the minority side speak first. That is usually where the argument is.' },
        { zh: '聊夠了就再按一次 Spin，上一輪的票會自動失效。',
          en: 'Spin again when the talk runs dry. The previous round of votes clears itself.' },
      ]},
      { icon: '🙋', title: GUIDE_TITLES.who, roles: [
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '抽題、唸題、控制討論節奏，並幫沒有連結的人代為投票。',
                  en: 'Spins, reads, keeps the discussion moving, and votes on behalf of anyone without a player link.' } },
        { emoji: '🙋', name: { zh: '玩家', en: 'Players' },
          desc: { zh: '在自己的卡片上投票，然後用英文說出自己的理由。可以隨時改投。',
                  en: 'Vote from their own card, then argue their case in English. Votes can be changed at any time.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '「🤷 看情況」最容易變成逃避，可以規定選這個的人一定要說出「什麼情況下會變成同意、什麼情況下會變成不同意」。',
          en: '🤷 It Depends is the easy way out. Make anyone who picks it name the case for each side.' },
        { zh: '下方的 10 句題庫預設收合，分享畫面時不要展開，不然大家會先看到後面的題目。',
          en: 'The list of all ten takes stays collapsed. Leave it closed while sharing, or everyone reads ahead.' },
      ]},
    ],
  },

  /* ══════════════════════ 🤔 Sophie's Choice ══════════════════════ */
  sophies: {
    players: { zh: '2 人以上', en: '2+ players' },
    tagline: {
      zh: '一個沒有好答案的兩難情境，只能二選一——或者自己想出第三條路。',
      en: 'An impossible situation with two bad options, or a third one you argue for yourself.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽出一則兩難劇本，兩個選項都不好。每位玩家在自己的手機上按 A／B／C，C 是「我有自己的答案」。',
          en: 'Draw a dilemma where neither option is good. Players tap A, B, or C on their phones, where C means "I have my own answer".' },
        { zh: '主持人畫面會即時顯示三欄統計：票數加上投給該選項的人是誰，最高票那欄框線會亮起。玩家卡片上刻意不印情境本文——情境留在你分享的畫面上，避免大家低頭看手機。',
          en: 'The host screen tallies all three columns live, names included, and highlights the leader. Player cards deliberately omit the scenario text so nobody spends the round staring at their phone.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「🎲 Draw」抽一則情境，把情境與兩個選項唸出來。',
          en: 'Tap 🎲 Draw and read the situation and both options aloud.' },
        { zh: '每位玩家在自己的卡片上按 A／B／C。',
          en: 'Players pick A, B, or C on their own cards.' },
        { zh: '統計出來後，逐一請大家用英文說明選擇的理由；選 C 的人要說出自己的第三條路是什麼。',
          en: 'When the tally lands, go around and have everyone justify their pick in English. Anyone on C has to spell out their third way.' },
        { zh: '想加碼的話，可以請大家聽完別人的理由後再改投一次——卡片隨時可以改投。',
          en: 'For a second lap, let people re-vote after hearing each other. Cards accept changes at any time.' },
      ]},
      { icon: '🙋', title: GUIDE_TITLES.who, roles: [
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '抽題、唸出情境與選項、主持討論。情境只會出現在主持人畫面上。',
                  en: 'Draws, reads the scenario and the options, and runs the discussion. The scenario lives on the host screen only.' } },
        { emoji: '🙋', name: { zh: '玩家', en: 'Players' },
          desc: { zh: '選 A／B／C，然後用英文說明理由。選 C 的人要自己提出第三個選項。',
                  en: 'Choose A, B, or C and defend it in English. Picking C means proposing your own option.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '這款遊戲最有價值的部分是「為什麼」，不是投票結果，可以刻意多留時間給理由。',
          en: 'The value is in the why, not the tally. Give the reasons more time than the vote.' },
        { zh: '下方的完整情境清單預設收合，分享畫面時不要展開。',
          en: 'The full scenario list at the bottom stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════ 🤝 Persuade Together! ══════════════════ */
  persuade: {
    players: { zh: '3 人以上', en: '3+ players' },
    tagline: {
      zh: '一個人當裁判，其他所有人組成一隊，一起想辦法說服他。',
      en: 'One player is dealt the judge. Everyone else teams up to change their mind.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽劇本時，系統會隨機發牌決定誰是這一輪的裁判，其他人自動組成說服團隊。每個人的手機卡片上會寫著自己的身分與這一輪的劇情。',
          en: 'Drawing a scenario also deals the judge at random; everyone else becomes the persuader team. Each card says which you are, along with the scenario.' },
        { zh: '團隊要用英文一起提出理由；裁判聽完之後在自己的卡片上按下判決，主持人畫面會即時變色。',
          en: 'The team argues in English. The judge taps their verdict on their own card and the host screen changes colour instantly.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「🎲 Draw」抽劇本，系統同時隨機發出裁判身分。主持人畫面的「The Judge」下方會標出是誰。',
          en: 'Tap 🎲 Draw. The judge is dealt at the same time and named under "The Judge" on the host screen.' },
        { zh: '說服團隊輪流用英文提出理由。可以先分工：一個人負責情感訴求、一個人負責實際好處。',
          en: 'The team makes its case in English. Split the work: someone takes the emotional angle, someone takes the practical one.' },
        { zh: '裁判可以反問、可以刁難，但要等團隊講完才做決定。',
          en: 'The judge can push back and ask hard questions, but should hear the whole case first.' },
        { zh: '裁判在自己的卡片上按「✅ You convinced me!」或「❌ Not convinced」，主持人畫面立刻顯示結果。',
          en: 'The judge taps ✅ You convinced me! or ❌ Not convinced, and the result lands on the host screen.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '👨‍⚖️', name: { zh: 'Judge 裁判（1 位）', en: 'The Judge (one player)' },
          desc: { zh: '唯一有判決按鈕的人。要真的被說服才按 ✅——太快投降遊戲就不好玩了。',
                  en: 'The only player with verdict buttons. Only tap ✅ if you were genuinely convinced; caving early kills the round.' } },
        { emoji: '👥', name: { zh: 'Persuader Team 說服團隊（其餘所有人）', en: 'Persuader team (everyone else)' },
          desc: { zh: '同一隊、目標一致。要合作分工，不要每個人都講一樣的話。',
                  en: 'One team, one goal. Divide the angles instead of all making the same point.' } },
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '抽劇本、控制節奏。主持人不是裁判，除非自己也拿了一張玩家卡片。',
                  en: 'Draws and paces the round. The host is not the judge unless they hold a player card too.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '至少 3 人才玩得起來（1 位裁判加上至少 2 位說服者）。',
          en: 'Needs at least three: one judge and two persuaders.' },
        { zh: '可以給團隊 30 秒先私下討論分工，再開始說服。',
          en: 'Give the team 30 seconds to plan who says what before they start.' },
        { zh: '下方的完整劇本清單預設收合，分享畫面時不要展開。',
          en: 'The full scenario list stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════ 🎭 You're In The Scene ══════════════════ */
  scene: {
    players: { zh: '2–6 人', en: '2–6 players' },
    tagline: {
      zh: '抽一個混亂的情境，每個人分到一個角色，直接演下去——沒有劇本。',
      en: 'Draw a chaotic situation, get dealt a role, and start playing. No script.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽場景之後，系統會依照房間人數把角色隨機發給每位玩家。每個人的手機上只有自己那一個角色：角色名稱加上一句「怎麼演」的提示。',
          en: 'Drawing a scene deals one role to each player automatically. Every phone shows only its own role: the character plus a hint on how to play them.' },
        { zh: '主持人畫面上會顯示完整的角色對照表（誰演誰），方便所有人跟上進度。',
          en: 'The host screen keeps the full cast list so everyone can follow who is who.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「🎲 Draw Scene」抽場景，系統自動把角色發到每個人的卡片上。',
          en: 'Tap 🎲 Draw Scene. Roles are dealt to the cards automatically.' },
        { zh: '主持人把場景描述唸出來，讓大家知道現在是什麼狀況。',
          en: 'The host reads the scene out loud so everyone knows the situation.' },
        { zh: '每位玩家看自己卡片上的角色與提示，用一句話自我介紹——用角色的身分，不是自己的身分。',
          en: 'Each player reads their role and hint, then introduces themselves in one line, in character.' },
        { zh: '直接開始演。沒有劇本、沒有正確答案，講不下去的時候主持人可以丟一個新狀況進去。',
          en: 'Then just play. No script, no right answer. If it stalls, the host throws in a new complication.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🎭', name: { zh: '每位玩家一個角色', en: 'One role per player' },
          desc: { zh: '角色與演法提示只會出現在自己的卡片上，別人看不到你的提示。',
                  en: 'The role and its hint appear only on that player card. Nobody else sees your hint.' } },
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '抽場景、唸出情境，並在冷場時推一把（例如「這時候門突然被打開」）。',
                  en: 'Draws, narrates the scene, and nudges when it stalls ("and then the door opens").' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '提醒大家用「角色會說的話」而不是「自己會說的話」，這是這款遊戲最重要的一句提醒。',
          en: 'Remind people to say what the character would say, not what they would say. It is the single most useful note.' },
        { zh: '角色分配是隨機的，人數改變時重抽一次即可。',
          en: 'Roles are random. Redraw after the player count changes.' },
        { zh: '下方的完整場景清單預設收合，分享畫面時不要展開。',
          en: 'The full scene list stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════════ 🏰 Dare Conquest ══════════════════════ */
  conquest: {
    players: { zh: '2–6 人', en: '2–6 players' },
    tagline: {
      zh: '擲骰子繞棋盤，完成真心話或大冒險來佔領土地，也可以從對手手上搶。',
      en: 'Roll around the board, pass a truth or a dare to claim a tile, or take one off a rival.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '20 格的環狀棋盤，輪流擲骰前進。停在無主或對手的土地上，就要接受一次挑戰。',
          en: 'Twenty tiles in a loop. Players take turns rolling, and landing on unclaimed or rival land triggers a challenge.' },
        { zh: '挑戰由當事人自己喊「TRUTH（真心話）」或「DARE（大冒險）」，系統隨機抽一題，一律 45 秒。完成了才能佔領土地。',
          en: 'The player on the spot calls TRUTH or DARE themselves, a prompt is drawn at random, and the clock is always 45 seconds. Pass it to take the land.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '在設定畫面按「🎲 Start Game」開始（房號與人數已經在首頁設定好了）。',
          en: 'Tap 🎲 Start Game on the setup screen. Room code and player count were already set on the hub.' },
        { zh: '輪到的玩家按地圖中央的「🎲 Roll」擲骰前進——也可以直接在自己的手機卡片上按。',
          en: 'The active player taps 🎲 Roll in the middle of the board, or the same button on their own phone.' },
        { zh: '停在無主或對手土地上 → 自己喊 TRUTH 或 DARE → 系統抽題 → 主持人先把題目唸完，再按下計時器開始 45 秒。',
          en: 'Land on unclaimed or rival land, call TRUTH or DARE, take the prompt that comes up. The host reads it out first, then starts the 45-second clock.' },
        { zh: '其他玩家可以在自己的卡片上投 ✅／❌ 當作參考，但最終仍由主持人按下判定。',
          en: 'Everyone else votes ✅ or ❌ from their cards as a guide, but the host makes the call.' },
        { zh: '挑戰過關：無主地直接佔領；對手的地要再進入「🎲 Dice-Off」比骰子，進攻方只會骰出 4/5/6，點數大的贏，平手算地主守住。',
          en: 'On a pass, unclaimed land is yours outright. Rival land goes to a 🎲 Dice-Off: the attacker only rolls 4, 5, or 6, highest wins, and a tie holds for the owner.' },
        { zh: '停在 START／BONUS／LUCKY／GIFT 這些特殊格，一樣要先過挑戰，過關才會觸發效果。',
          en: 'START, BONUS, LUCKY, and GIFT tiles still need a passed challenge before their effect fires.' },
      ]},
      { icon: '🎁', title: { zh: '每位玩家的三種道具', en: 'Three things every player carries' }, roles: [
        { emoji: '🎯', name: { zh: 'High Roll（每人 2 次）', en: 'High Roll (twice per player)' },
          desc: { zh: '擲骰前先按下啟動，這一回合骰出的每一顆骰子保證是 4／5／6。',
                  en: 'Arm it before rolling and every die this turn comes up 4, 5, or 6.' } },
        { emoji: '🔻', name: { zh: 'Low Roll（每人 2 次）', en: 'Low Roll (twice per player)' },
          desc: { zh: '反過來，保證骰出 1／2／3。跟 High Roll 互斥，同時只能開一個，取消會退回次數。',
                  en: 'The opposite: guarantees 1, 2, or 3. Mutually exclusive with High Roll, and cancelling refunds the use.' } },
        { emoji: '🔄', name: { zh: 'New Question（每人 3 次）', en: 'New Question (three times per player)' },
          desc: { zh: '看到題目不想做可以換一題，換到的一定是同類型。按下之後會先跳出確認視窗，避免誤觸。',
                  en: 'Swap a prompt you do not want for another of the same type. A confirm step guards against misfires.' } },
      ]},
      { icon: '🗺️', title: { zh: '特殊格子', en: 'Special tiles' }, roles: [
        { emoji: '🏁', name: { zh: 'START', en: 'START' },
          desc: { zh: '不只是起點。停在這裡過關之後，會跟 LUCKY 一樣觸發「與指定玩家交換全部領地」。',
                  en: 'Not just the start. Passing a challenge here swaps all your land with a chosen player, exactly like LUCKY.' } },
        { emoji: '⭐', name: { zh: 'BONUS', en: 'BONUS' },
          desc: { zh: '過關後從目前土地最多的對手手上直接奪走 2 塊地。沒有人有地時才改成隨機取得 2 塊無主地。',
                  en: 'On a pass, seize two tiles from whoever leads. Only if nobody owns anything do you take two unclaimed tiles instead.' } },
        { emoji: '🎲', name: { zh: 'LUCKY', en: 'LUCKY' },
          desc: { zh: '過關後與指定玩家交換全部領地。2 人局自動指定對手，3 人以上由主持人點選。',
                  en: 'Swap your whole territory with another player. With two players the target is automatic; otherwise the host picks.' } },
        { emoji: '🎁', name: { zh: 'GIFT', en: 'GIFT' },
          desc: { zh: '效果與 BONUS 完全相同（同樣奪取 2 塊地），只有圖示與文案不一樣。',
                  en: 'Identical to BONUS in effect: two tiles off the leader. Only the icon and wording differ.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '全部題目一律 45 秒，題目本身不寫秒數。主持人先唸完再按計時器，不要一抽到就開始倒數。',
          en: 'Every prompt is 45 seconds and none of them state a time. Read it out first, then start the clock.' },
        { zh: '遊戲不會因為土地被佔滿而結束——搶地會讓局勢一直變化，玩到什麼時候由主持人決定。',
          en: 'The game does not end when the board fills up. Land keeps changing hands, so the host decides when to stop.' },
        { zh: '進度會在每個回合結束時自動存檔，重新整理後可以選擇「Resume Game」接續。',
          en: 'Progress saves between turns. After a reload you can pick Resume Game.' },
        { zh: '下方的 Dare 與 Truth 兩份題庫各自獨立收合，分享畫面時不要展開。',
          en: 'The Dare and Truth decks at the bottom collapse separately. Leave both closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════════ ⚖️ Kangaroo Court ══════════════════════ */
  kangaroo: {
    players: { zh: '4–9 人', en: '4–9 players' },
    tagline: {
      zh: '一位玩家因為一條荒謬的罪名受審，檢辯雙方輪流出招，陪審團前後秘密投兩次票。',
      en: 'One player stands trial on a ridiculous charge while the jury votes in secret, twice.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽出一條罪名（都是「大家都做過的小事」加上一個好笑的轉折），系統隨機發出被告、檢察官、辯護律師、法官（可關閉），其餘所有人都是陪審團。',
          en: 'Draw a charge (a small everyday habit with a funny twist) and the defendant, prosecutor, defense attorney, and optional judge are dealt at random. Everyone else is the jury.' },
        { zh: '陪審團要投兩次票：聽證前一次、聽證後一次。兩票都是秘密的，到最後 Reveal 才會一起公布，並標出誰被說服而翻了票。',
          en: 'The jury votes twice, before and after the arguments. Both votes stay hidden until the reveal, which shows who was swayed and flipped.' },
        { zh: '這款遊戲不計分，翻票紀錄純粹是話題。',
          en: 'Nothing is scored. The flip list is there purely to talk about.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「⚖️ Draw a Charge」抽罪名並發角色，陪審團先秘密投第一次票（Pre-Vote）。',
          en: 'Tap ⚖️ Draw a Charge to draw the charge and deal the roles, then the jury casts its secret pre-vote.' },
        { zh: '檢察官陳述指控，接著傳喚檢方證人——系統會從陪審團裡隨機挑一位扮演，並發給他一張證人卡。',
          en: 'The prosecutor makes their case, then calls a witness: a juror is picked at random and handed a witness card.' },
        { zh: '辯護律師答辯，接著同樣傳喚一位辯方證人。',
          en: 'The defense answers, then calls a witness of their own.' },
        { zh: '交互詰問：檢辯雙方輪流問被告問題，被告必須回答每一題。',
          en: 'Cross-examination: both sides take turns questioning the defendant, who has to answer everything.' },
        { zh: '陪審團投第二次票（最終票），一樣是秘密的。',
          en: 'The jury casts its final vote, still in secret.' },
        { zh: '按「⚖️ Reveal Verdict!」公布判決與完整投票明細（誰翻了票、往哪邊翻）。',
          en: 'Tap ⚖️ Reveal Verdict! for the verdict and the full breakdown of who flipped, and which way.' },
        { zh: '這局若有法官，最後一步由法官口頭宣讀判決（純儀式，沒有按鈕）。',
          en: 'If this round has a judge, they read the verdict aloud as a final flourish. There is no button for it.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🙇', name: { zh: 'Defendant 被告', en: 'Defendant' },
          desc: { zh: '受審的人。交互詰問階段必須回答雙方的每一個問題。',
                  en: 'The one on trial. Must answer every question during cross-examination.' } },
        { emoji: '⚔️', name: { zh: 'Prosecutor 檢察官', en: 'Prosecutor' },
          desc: { zh: '負責指控，並可以傳喚一位證人來補強論點。',
                  en: 'Makes the accusation and can call one witness to back it up.' } },
        { emoji: '🛡️', name: { zh: 'Defense Attorney 辯護律師', en: 'Defense attorney' },
          desc: { zh: '負責答辯，同樣可以傳喚一位證人。',
                  en: 'Answers the charge and can call a witness too.' } },
        { emoji: '🧑‍⚖️', name: { zh: 'Judge 法官（可關閉）', en: 'Judge (optional)' },
          desc: { zh: '不影響判決結果，最後負責把陪審團的判決正式宣讀出來。4 人局會自動關閉，因為角色不夠分。',
                  en: 'Does not change the verdict, just reads it out at the end. Switched off automatically in a four-player game, where the roles run out.' } },
        { emoji: '👥', name: { zh: 'Jury 陪審團（其餘所有人）', en: 'Jury (everyone else)' },
          desc: { zh: '秘密投兩次票。Guilty 票數大於或等於 Not Guilty 就是有罪——平手不會放過被告，這是 Kangaroo Court。',
                  en: 'Two secret votes each. Guilty wins on a tie: this is a kangaroo court, and the defendant gets no benefit of the doubt.' } },
        { emoji: '🕵️', name: { zh: 'Witness 證人', en: 'Witness' },
          desc: { zh: '從陪審團裡臨時抽出來的人，拿到一張角色卡與一句證詞，要即興演出這個角色回答問題。',
                  en: 'A juror pulled in on the spot, handed a character and a line of evidence, and expected to improvise the rest.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '最少 4 人。人數不足時按鈕會鎖住，要回首頁把房間人數調高。',
          en: 'Four players minimum. Below that the buttons lock and you have to raise the player count back on the hub.' },
        { zh: '這款遊戲一定要有 Firebase，因為陪審團的票必須保密。',
          en: 'Firebase is required here: the jury votes have to stay secret.' },
        { zh: '全程沒有計時器，每個階段都由主持人按狀態鈕推進；按錯可以用「⬅️ Previous Step」退回。',
          en: 'There is no clock. The host advances each phase with the status button, and ⬅️ Previous Step undoes a misfire.' },
        { zh: '下方的 30 條罪名清單預設收合，分享畫面時不要展開。',
          en: 'The list of all 30 charges stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },
};
