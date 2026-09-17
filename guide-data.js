/*
 * guide-data.js — the "how to play" briefing shown when a host opens a game.
 *
 * Rendered by guide.js. Every string is bilingual for the same reason the rest
 * of the UI is: this is host-facing chrome, not game content, so it follows the
 * site language toggle. (game-data.js prompts and the English game titles stay
 * English on purpose — see CLAUDE.md.)
 *
 * Keep it short. This is a briefing the host reads out or skims before a game,
 * not documentation: one line of prose per idea, one short sentence per step,
 * one line per role. Anything longer stops being read.
 *
 * Buttons are shown, not described. B() emits a real <button> carrying the
 * page's own class, so it renders identically to the thing the host will
 * actually tap — .btn-primary here, .btn-draw there, and so on. Buttons that
 * live on the player cards (play.html) have no class on the host page, so they
 * use the is-green / is-red / is-amber fills that match those cards.
 * Labels must match what the real button says in that language; the button
 * text in each page's I18N dict is the source of truth.
 *
 * Section shapes the renderer understands — a section carries exactly one:
 *   paragraphs: [ {zh, en} ]                       prose
 *   steps:      [ {zh, en} ]                       auto-numbered
 *   roles:      [ {emoji, name:{zh,en}, desc:{zh,en}} ]
 *   tips:       [ {zh, en} ]                       bulleted
 *   phones:     [ {caption:{zh,en}, card:{…}} ]     phone mockups + optional
 *                                                   `note` line underneath
 *
 * `phones` draws the secret card the way the player really sees it on their
 * phone. It exists because that card is the one thing that must never appear
 * on the shared screen, so the host has never seen it either — telling them
 * "each player gets a word" does not convey what they are about to hand out.
 * Card fields are all optional: name + color (1–8, play.html's palette),
 * emoji, word, hint, buttons [{label, cls}]. See guide.js for the renderer.
 */

const B = (cls, label) =>
  `<button class="guide-btn ${cls}" type="button" tabindex="-1">${label}</button>`;
const BROW = (...btns) => `<span class="guide-btn-row">${btns.join('')}</span>`;

/* Pick a Side's three vote buttons, rebuilt with pick-a-side.html's own markup so
   they carry the same bars and counts the host sees. */
const VOTE = (agree, depends, disagree) => BROW(
  ...[['agree', '👍', agree], ['middle', '🤷', depends], ['disagree', '👎', disagree]].map(
    ([cls, emoji, label]) =>
      `<button class="guide-btn vote-btn ${cls}" type="button" tabindex="-1">
         <span class="emoji">${emoji}</span><span class="label">${label}</span>
         <span class="count">0</span><div class="bar-wrap"><div class="bar"></div></div>
       </button>`
  )
);

const GUIDE_TITLES = {
  what:  { zh: '這是什麼遊戲', en: 'What this game is' },
  how:   { zh: '怎麼玩',       en: 'How to play' },
  roles: { zh: '角色與功能',   en: 'Roles' },
  who:   { zh: '誰做什麼',     en: 'Who does what' },
  tips:  { zh: '主持人小提示', en: 'Host tips' },
};

const GAME_GUIDES = {


  /* ══════════════════ 🙊 Say It Without Saying It ══════════════════ */
  taboo: {
    players: { zh: '2–6 人', en: '2–6 players' },
    tagline: {
      zh: '把一個英文單字解釋到有人猜出來，但最好用的那幾個字全部被禁用。',
      en: 'Explain an English word until someone guesses it, with the most useful words banned.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '每輪抽一張卡：一個目標字加上禁字。卡片只給描述者與裁判，主持人畫面上永遠看不到答案。',
          en: 'Each round draws a target word plus forbidden words. The card goes only to the clue giver and the referee — the answer never reaches the shared screen.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '先在設定畫面選好難度、禁字個數、每輪秒數。',
          en: 'Set difficulty, how many forbidden words count, and the round length on the setup screen.' },
        { zh: `按 ${B('btn-deal', '🎬 發一個題目')} 抽角色 — 兩輪之間每個人的卡片上也有 ${B('is-accent', '🎬 發下一個題目')}，誰先按都可以。題目先是鎖著的：描述者要在自己的卡片上按 ${B('is-green', '👀 看題目')}，題目才會出現、倒數才開始。`,
          en: `Tap ${B('btn-deal', '🎬 Deal a Word')} to draw the roles — between rounds every card carries ${B('is-accent', '🎬 Deal the next word')} too, and whoever taps first deals. The word stays sealed until the clue giver taps ${B('is-green', '👀 Show my word')} on their own card — that is when it appears and the clock starts.` },
        { zh: `猜到的人按卡片上的 ${B('is-green', '🙋 Buzz in!')} 然後用講的喊答案。`,
          en: `A guesser taps ${B('is-green', '🙋 Buzz in!')} on their card and says the answer out loud.` },
        { zh: `描述者判定 ${B('is-green', '✅ 答對')} 兩人各 +1，該輪結束、幾秒後自動換人開下一題；${B('is-red', '❌ 沒中')} 換下一位，答錯的人要等其他人都試過才能再搶。`,
          en: `The clue giver rules: ${B('is-green', '✅ Correct')} scores +1 each, ends the round and deals the next one a few seconds later; ${B('is-red', '❌ Not it')} passes on, and that guesser waits until everyone else has missed too.` },
        { zh: `只有描述者說出禁字才算（猜的人說到不算），裁判聽到就按 ${B('is-red', '🚨 Taboo!')} 舉發，由描述者自己承認或否認：成立則裁判 +2、描述者 −1。`,
          en: `Only the clue giver can slip — a guesser saying one doesn't count. The referee taps ${B('is-red', '🚨 Taboo!')} and the clue giver owns up or denies it: upheld is +2 referee, −1 clue giver.` },
      ]},
      { icon: '📱', title: { zh: '每支手機看到的不一樣', en: 'What each phone shows' },
        phones: [
          { caption: { zh: '🎬 兩輪之間', en: '🎬 Between rounds' },
            card: { name: 'Dan', color: 4,
                    chip: { label: { zh: '🙊 Say It Without Saying It', en: '🙊 Say It Without Saying It' }, hex: '#6366f1' },
                    buttons: [{ label: { zh: '🎬 發下一個題目', en: '🎬 Deal the next word' }, cls: 'is-accent' }],
                    hint: { zh: '誰先按都可以。', en: 'Whoever taps first deals.' } } },
          { caption: { zh: '🔒 開題目之前', en: '🔒 Before the word opens' },
            card: { name: 'Amy', color: 1,
                    chip: { label: { zh: '🎤 你是描述者', en: "🎤 You're the clue giver" }, hex: '#6366f1' },
                    sub: { zh: '輪到你描述了！準備好再按下面的按鈕。', en: "You're describing this round. Tap when you're ready." },
                    buttons: [{ label: { zh: '👀 看題目', en: '👀 Show my word' }, cls: 'is-green' }] } },
          { caption: { zh: '🎤 描述者', en: '🎤 Clue giver' },
            card: { name: 'Amy', color: 1,
                    chip: { label: { zh: '🎤 你是描述者', en: "🎤 You're the clue giver" }, hex: '#6366f1' },
                    target: { emoji: '🍍', word: { zh: 'Pineapple', en: 'Pineapple' } },
                    pills: { label: { zh: '🚫 禁字', en: '🚫 Forbidden words' },
                             items: ['Spiky', 'Yellow', 'Tropical', 'Sweet'] } } },
          { caption: { zh: '👀 裁判', en: '👀 Referee' },
            card: { name: 'Ben', color: 2,
                    chip: { label: { zh: '👀 你是裁判', en: "👀 You're the referee" }, hex: '#f59e0b' },
                    pills: { label: { zh: '🚫 禁字', en: '🚫 Forbidden words' },
                             items: ['Spiky', 'Yellow', 'Tropical', 'Sweet'] },
                    buttons: [{ label: { zh: '🚨 Taboo！描述者說了禁字', en: '🚨 Taboo! The clue giver said one' }, cls: 'is-red' }] } },
          { caption: { zh: '🙋 猜題者', en: '🙋 Guesser' },
            card: { name: 'Cara', color: 3,
                    buttons: [{ label: { zh: '🙋 搶答！', en: '🙋 Buzz in!' }, cls: 'is-green' }] } },
        ],
        note: { zh: '整局都在卡片上跑：誰先按都能開下一題，題目要等描述者自己按下去才會出現，倒數也是那時才開始。猜題者的卡片上則什麼都沒有——看不到目標字，也看不到禁字。禁字就是最快聯想到答案的字，發給猜的人等於把答案送出去。',
                en: 'The whole round runs from the cards: anyone can deal the next word, and the word only appears once the clue giver taps for it — which is when the clock starts. The guesser, meanwhile, gets nothing to read — no target word, no forbidden list. Those words are the fastest route to the answer, so handing them over would give the game away.' } },
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🎤', name: { zh: 'Clue giver 描述者', en: 'Clue giver' },
          desc: { zh: '看得到目標字與禁字，用英文描述並判定搶答。猜對時自己也 +1。',
                  en: 'Sees the word and the forbidden list. Describes, judges each buzz, scores +1 on a correct one.' } },
        { emoji: '👀', name: { zh: 'Referee 裁判', en: 'Referee' },
          desc: { zh: '看得到禁字但不能搶答，只盯描述者有沒有說出禁字。舉發成立 +2，這是裁判唯一的得分方式。',
                  en: 'Sees the forbidden list, cannot buzz. Watches the clue giver only; an upheld call is +2 — their only way to score.' } },
        { emoji: '🙋', name: { zh: 'Guessers 猜題者', en: 'Guessers' },
          desc: { zh: '看不到禁字，純靠聽。',
                  en: 'Never see the forbidden words. They just listen.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '猜題者看不到禁字是刻意的——禁字就是最快聯想到答案的字。',
          en: 'Hiding the list from guessers is deliberate: those words are the fastest route to the answer.' },
        { zh: '2 人局沒有裁判，禁字會自動關閉。',
          en: 'Two players leaves nobody to referee, so forbidden words switch off.' },
        { zh: '有人搶答或喊 Taboo! 時倒數自動凍結，判定完才接著跑。',
          en: 'The clock freezes on a buzz or a Taboo! call and resumes after the ruling.' },
        { zh: '整局不用碰主持人畫面：發題、開題、搶答、判定都在卡片上，一輪結束也會自己接下一輪。',
          en: 'You never have to touch this screen: dealing, opening, buzzing and ruling all happen on the cards, and a finished round deals the next one itself.' },
      ]},
    ],
  },

  /* ══════════════════════ 🔥 Pick a Side! ══════════════════════ */
  hottake: {
    players: { zh: '2–9 人', en: '2–9 players' },
    tagline: {
      zh: '抽一句故意講得很極端的意見，每個人選邊站，然後說出理由。',
      en: 'Spin up a deliberately bold opinion, everyone picks a side, then defends it.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '玩家在自己的手機上投票，主持人畫面的三根長條即時累加。投票只是開場，重點是接下來的「為什麼」。',
          en: 'Players vote from their phones and the three bars fill in live. The vote is the opening; the game is everyone explaining why.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `任何一位玩家在自己的卡片上按 ${B('is-accent', '🎡 抽第一題')} 就開始；你畫面上的 ${B('spin-btn', '🎡 Spin!')} 是備援。抽到的意見唸出來給大家聽。`,
          en: `Any player taps ${B('is-accent', '🎡 Spin the first one')} on their own card to start; ${B('spin-btn', '🎡 Spin!')} on your screen is the backup. Read the take out loud.` },
        { zh: `每個人在自己的卡片上選一個：${VOTE('同意', '看情況', '不同意')} 沒有連結的人可以口頭說，主持人直接點畫面上這三顆幫他計票。`,
          en: `Everyone picks one on their own card: ${VOTE('Agree', 'It Depends', 'Disagree')} Anyone without a link just says it, and the host taps the same buttons for them.` },
        { zh: `請少數派先講理由——通常最有話題性。聊完之後，任何人在自己的卡片上按 ${B('is-accent', '🎡 換下一題')}：所有卡片一起跑五秒倒數，時間到就換下一題、舊的票自動失效；還有人在講的話，任何人按 ${B('is-choice', '✋ 等一下，先別換')} 就停下來。`,
          en: `Let the minority side argue first; that is where the talk is. When it runs dry, anyone taps ${B('is-accent', '🎡 Next take')} on their own card: every card runs the same five-second countdown, then the next take spins and old votes clear. Still talking? Anyone taps ${B('is-choice', '✋ Hold on, not yet')} to stop it.` },
      ]},
      { icon: '📱', title: { zh: '玩家手機上會看到什麼', en: 'What players see on their phones' },
        phones: [
          { caption: { zh: '還沒投票', en: 'Before voting' },
            card: { name: 'Amy', color: 1,
                    chip: { label: { zh: '🔥 大膽發言', en: '🔥 Hot Take' }, hex: '#ff7043' },
                    text: { zh: 'Talking on speakerphone in public is one of the rudest things a person can do.',
                            en: 'Talking on speakerphone in public is one of the rudest things a person can do.' },
                    buttons: [
                      { label: { zh: '👍 同意', en: '👍 Agree' }, cls: 'is-choice' },
                      { label: { zh: '🤷 要看情況', en: '🤷 It Depends' }, cls: 'is-choice' },
                      { label: { zh: '👎 不同意', en: '👎 Disagree' }, cls: 'is-choice' },
                      { label: { zh: '🎡 換下一題', en: '🎡 Next take' }, cls: 'is-accent' },
                    ],
                    hint: { zh: '誰先按都可以 — 不用等其他人。', en: 'Anyone can tap it — no need to wait for the others.' } } },
        ],
        note: { zh: '這款的題目<b>會</b>印在卡片上，因為投票的當下每個人都要能再讀一次那句話。投完主持人畫面的長條就即時長出來。最下面那顆「換下一題」誰按都可以，按下去不會馬上換：<b>每張卡片一起跑五秒倒數</b>，這段時間任何人都能按「等一下」把它停住，所以手滑或有人還在講都來得及救。',
                en: 'Here the take <b>is</b> printed on the card, because everyone needs to re-read it at the moment they vote. The bars on the host screen fill in as the taps land. Anyone may tap “next” at the bottom, and it does not change on the spot: <b>every card runs the same five-second countdown</b>, and anyone can hold it during those seconds — so a stray tap, or someone still mid-sentence, is never too late to fix.' } },
      { icon: '🙋', title: GUIDE_TITLES.who, roles: [
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '唸題、控場，並幫沒有連結的人代投。抽題由卡片決定，畫面上的 Spin 是備援。',
                  en: 'Reads, keeps it moving, votes for anyone without a link. The cards do the spinning; Spin on screen is the backup.' } },
        { emoji: '🙋', name: { zh: '玩家', en: 'Players' },
          desc: { zh: '投票，然後用英文說理由。隨時可以改投。',
                  en: 'Vote, then argue in English. Votes can change at any time.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '「看情況」最容易變成逃避，可以規定選它的人要說出「什麼情況會變成同意、什麼情況會變成不同意」。',
          en: 'It Depends is the easy way out. Make anyone who picks it name the case for each side.' },
        { zh: '下方的題庫預設收合，分享畫面時不要展開。',
          en: 'The list of all takes stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════════ 🤔 Sophie's Choice ══════════════════════ */
  sophies: {
    players: { zh: '2–9 人', en: '2–9 players' },
    tagline: {
      zh: '一個沒有好答案的兩難情境，只能二選一——或者自己想出第三條路。',
      en: 'An impossible situation with two bad options, or a third one you argue for yourself.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '玩家在手機上讀到情境、按 A／B／C（C 是「我有自己的答案」），主持人畫面即時顯示票數與投票的人。',
          en: 'Players read the situation on their phone and tap A, B, or C (C means "my own answer"); the host screen tallies names as they land.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `任何一位玩家在自己的卡片上按 ${B('is-accent', '🎲 抽第一個情境')} 就開始；你畫面上的 ${B('btn-draw', '🎲 抽取')} 是備援。把情境與兩個選項唸出來。`,
          en: `Any player taps ${B('is-accent', '🎲 Draw the first situation')} on their own card to start; ${B('btn-draw', '🎲 Draw')} on your screen is the backup. Read the situation and both options aloud.` },
        { zh: `每個人在卡片上選 ${BROW(B('is-choice', 'A'), B('is-choice', 'B'), B('is-choice', 'C'))}`,
          en: `Everyone picks on their card: ${BROW(B('is-choice', 'A'), B('is-choice', 'B'), B('is-choice', 'C'))}` },
        { zh: `逐一用英文說明理由；選 C 的人要說出自己的第三條路。聊完之後，任何人在自己的卡片上按 ${B('is-accent', '🎲 換下一個情境')}：所有卡片一起跑五秒倒數，時間到就換；還有人在講就按 ${B('is-choice', '✋ 等一下，先別換')}。`,
          en: `Go around and justify each pick in English. Anyone on C spells out their third way. When it winds down, anyone taps ${B('is-accent', '🎲 Next situation')} on their own card: every card runs the same five-second countdown. Still talking? Tap ${B('is-choice', '✋ Hold on, not yet')}.` },
      ]},
      { icon: '📱', title: { zh: '玩家手機上會看到什麼', en: 'What players see on their phones' },
        phones: [
          { caption: { zh: '情境跟三個選項都在卡片上', en: 'The situation and all three options' },
            card: { name: 'Amy', color: 1,
                    chip: { label: { zh: '🎯 情境', en: '🎯 The Situation' }, hex: '#f59e0b' },
                    text: { zh: 'Your closest friend asks you to lie to their partner to cover for them.',
                            en: 'Your closest friend asks you to lie to their partner to cover for them.' },
                    buttons: [
                      { label: { zh: 'A　Report them to HR', en: 'A　Report them to HR' }, cls: 'is-choice' },
                      { label: { zh: 'B　Keep it to yourself', en: 'B　Keep it to yourself' }, cls: 'is-choice' },
                      { label: { zh: 'C　其他 — 我自己的答案', en: 'C　Something else — my own answer' }, cls: 'is-choice' },
                      { label: { zh: '🎲 換下一個情境', en: '🎲 Next situation' }, cls: 'is-accent' },
                    ],
                    hint: { zh: '誰先按都可以 — 不用等其他人。', en: 'Anyone can tap it — no need to wait for the others.' } } },
        ],
        note: { zh: '情境本文<b>也會印在卡片上</b>，所以看不清楚分享畫面的人（手機在通話中、螢幕太小）照樣答得出來，不必請你再唸一次。最下面那顆「換下一個情境」誰按都可以，按下去會先跑<b>五秒倒數</b>，這段時間任何人都能按「等一下」停住。',
                en: 'The situation <b>is printed on the card too</b>, so anyone who can’t read the shared screen — on a phone, mid-call, or just too small — can still answer without asking you to read it again. Anyone may tap “next” at the bottom; it runs a <b>five-second countdown</b> first, and anyone can hold it during those seconds.' } },
      { icon: '🙋', title: GUIDE_TITLES.who, roles: [
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '唸出情境與選項、主持討論。抽題由卡片決定，畫面上的抽取鈕是備援。',
                  en: 'Reads the scenario and options, runs the discussion. The cards do the drawing; Draw on screen is the backup.' } },
        { emoji: '🙋', name: { zh: '玩家', en: 'Players' },
          desc: { zh: '選一個並說明理由，聽完別人的理由後可以改投。',
                  en: 'Pick one and defend it. Re-voting after hearing others is allowed.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '重點是「為什麼」不是票數，可以刻意多留時間給理由。',
          en: 'The value is in the why, not the tally. Give the reasons more time.' },
        { zh: '下方的情境清單預設收合，分享畫面時不要展開。',
          en: 'The full scenario list stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },

  /* ══════════════════ 🤝 Persuade Together! ══════════════════ */
  persuade: {
    players: { zh: '3–9 人', en: '3–9 players' },
    tagline: {
      zh: '一個人當裁判，其他所有人組成一隊，一起想辦法說服他。',
      en: 'One player is dealt the judge. Everyone else teams up to change their mind.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽劇本時系統會隨機發出裁判身分，其他人自動組成說服團隊，每張卡片上都寫著自己的身分與劇情。',
          en: 'Drawing a scenario deals the judge at random; everyone else becomes the persuader team. Each card says which you are.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `任何一位玩家在自己的卡片上按 ${B('is-accent', '🎲 抽第一個場景')} 就開始；你畫面上的 ${B('btn-draw', '🎲 抽取')} 是備援。畫面上會標出誰是裁判。`,
          en: `Any player taps ${B('is-accent', '🎲 Draw the first scenario')} on their own card to start; ${B('btn-draw', '🎲 Draw')} on your screen is the backup. The judge is named on screen.` },
        { zh: '團隊輪流用英文提出理由，先分工會更有效：一個講情感、一個講實際好處。',
          en: 'The team argues in turn, in English. Split the angles: one emotional, one practical.' },
        { zh: `裁判聽完後在自己的卡片上按 ${B('is-green', '✅ 你說服我了')} 或 ${B('is-red', '❌ 沒被說服')}，主持人畫面立刻變色。`,
          en: `The judge then taps ${B('is-green', '✅ You convinced me!')} or ${B('is-red', '❌ Not convinced')}, and the host screen changes colour.` },
        { zh: `判決出來之後，每張卡片上都會出現 ${B('is-accent', '🎲 下一個場景')}，誰先按都可以，接著所有卡片一起跑五秒倒數再換場景（還想討論就按 ${B('is-choice', '✋ 等一下，先別換')}）。`,
          en: `Once the verdict is in, every card shows ${B('is-accent', '🎲 Next scenario')}; whoever taps first starts the same five-second countdown on every card, then the new scenario is dealt. Want to keep talking? Tap ${B('is-choice', '✋ Hold on, not yet')}.` },
      ]},
      { icon: '📱', title: { zh: '兩種人的手機不一樣', en: 'Two different phones' },
        phones: [
          { caption: { zh: '👨‍⚖️ 裁判', en: '👨‍⚖️ The Judge' },
            card: { name: 'Amy', color: 4,
                    chip: { label: { zh: '👨‍⚖️ 你是裁判', en: '👨‍⚖️ You are the Judge' }, hex: '#f59e0b' },
                    role: { key: { zh: '你的身分', en: 'Your role' },
                            name: { zh: 'Office Manager', en: 'Office Manager' }, hint: { zh: '', en: '' } },
                    buttons: [
                      { label: { zh: '✅ 你說服我了！', en: '✅ You convinced me!' }, cls: 'is-choice' },
                      { label: { zh: '❌ 沒有被說服', en: '❌ Not convinced' }, cls: 'is-choice' },
                    ] } },
          { caption: { zh: '👥 說服團隊', en: '👥 The team' },
            card: { name: 'Ben', color: 6,
                    chip: { label: { zh: '👥 說服團隊', en: '👥 Persuader Team' }, hex: '#06b6d4' },
                    role: { key: { zh: '你的團隊角色是', en: 'Your team plays' },
                            name: { zh: 'Employees who want a four-day week', en: 'Employees who want a four-day week' },
                            hint: { zh: '', en: '' } },
                    sub: { zh: '一起想辦法說服裁判。', en: 'Work together to win them over.' } } },
        ],
        note: { zh: '只有裁判的卡片上有那兩顆判決鈕，其他人按不到——所以「被說服了沒有」永遠只由一個人決定。判決出來之後，兩種卡片的最下面都會多一顆「🎲 下一個場景」。',
                en: 'Only the judge’s card carries the two verdict buttons; nobody else can tap them, so the decision stays with one person. Once the verdict is in, both cards grow a “🎲 Next scenario” button at the bottom.' } },
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '👨‍⚖️', name: { zh: 'Judge 裁判（1 位）', en: 'The Judge (one player)' },
          desc: { zh: '唯一有判決按鈕的人。要真的被說服才按，太快投降就不好玩了。',
                  en: 'The only one with verdict buttons. Only give in if genuinely convinced.' } },
        { emoji: '👥', name: { zh: 'Persuader Team（其餘所有人）', en: 'Persuader team (everyone else)' },
          desc: { zh: '同一隊、目標一致，要分工，不要每個人講一樣的話。',
                  en: 'One team, one goal. Divide the angles instead of repeating each other.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '至少 3 人（1 位裁判加 2 位說服者）。',
          en: 'Needs at least three: one judge, two persuaders.' },
        { zh: '可以給團隊 30 秒先私下討論分工。',
          en: 'Give the team 30 seconds to plan who says what.' },
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
        { zh: '角色會依人數自動發到每個人的手機上：角色名稱加一句演法提示，別人看不到你的提示。主持人畫面留著完整的角色對照表。',
          en: 'Roles are dealt to each phone automatically — a character plus a hint only that player sees. The host screen keeps the full cast list.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `任何一位玩家在自己的卡片上按 ${B('is-accent', '🎭 抽第一個場景')} 就開始；你畫面上的 ${B('btn-draw', '🎲 抽場景')} 是備援。角色同時發出。`,
          en: `Any player taps ${B('is-accent', '🎭 Draw the first scene')} on their own card to start; ${B('btn-draw', '🎲 Draw Scene')} on your screen is the backup. Roles go out at the same time.` },
        { zh: '主持人唸出場景，讓大家知道現在是什麼狀況。',
          en: 'Read the scene out loud so everyone knows the situation.' },
        { zh: `每個人用角色的身分做一句自我介紹，然後直接開始演。演完之後，任何人在自己的卡片上按 ${B('is-accent', '🎭 換下一個場景')}：所有卡片一起跑五秒倒數，時間到就換場景並重新發角色；還沒演完就按 ${B('is-choice', '✋ 等一下，先別換')}。`,
          en: `Each player introduces themselves in one line, in character. Then just play. When the scene has run its course, anyone taps ${B('is-accent', '🎭 Next scene')} on their own card: every card runs the same five-second countdown, then a new scene is drawn and roles are re-dealt. Not finished? Tap ${B('is-choice', '✋ Hold on, not yet')}.` },
      ]},
      { icon: '📱', title: { zh: '玩家手機上會看到什麼', en: 'What players see on their phones' },
        phones: [
          { caption: { zh: 'Amy 的卡片', en: "Amy's card" },
            card: { name: 'Amy', color: 1,
                    chip: { label: { zh: '🎭 The Board Game Meltdown', en: '🎭 The Board Game Meltdown' }, hex: '#ec4899' },
                    text: { zh: 'A friendly game night just turned intense over the rules.',
                            en: 'A friendly game night just turned intense over the rules.' },
                    role: { key: { zh: '🎪 你飾演 A', en: '🎪 You play A' },
                            name: { zh: 'The Rules Lawyer', en: 'The Rules Lawyer' },
                            hint: { zh: 'You have read the rulebook four times. You are reading it a fifth time, out loud.',
                                    en: 'You have read the rulebook four times. You are reading it a fifth time, out loud.' } } } },
          { caption: { zh: 'Ben 的卡片', en: "Ben's card" },
            card: { name: 'Ben', color: 2,
                    chip: { label: { zh: '🎭 The Board Game Meltdown', en: '🎭 The Board Game Meltdown' }, hex: '#ec4899' },
                    text: { zh: 'A friendly game night just turned intense over the rules.',
                            en: 'A friendly game night just turned intense over the rules.' },
                    role: { key: { zh: '🎪 你飾演 B', en: '🎪 You play B' },
                            name: { zh: 'The Sore Loser', en: 'The Sore Loser' },
                            hint: { zh: 'You are losing badly. You have just accused the dice of being rigged.',
                                    en: 'You are losing badly. You have just accused the dice of being rigged.' } },
                    buttons: [ { label: { zh: '🎭 換下一個場景', en: '🎭 Next scene' }, cls: 'is-accent' } ] } },
        ],
        note: { zh: '場景大家都一樣，但<b>每個人只看得到自己那一個角色</b>——別人的演法提示看不到，所以沒有人知道等一下誰會做什麼。',
                en: 'Everyone shares the scene, but each phone shows only its own role — nobody can read anyone else’s hint, so nobody knows what the others are about to do.' } },
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🎭', name: { zh: '每位玩家一個角色', en: 'One role per player' },
          desc: { zh: '角色與演法提示只出現在自己的卡片上。',
                  en: 'The role and its hint appear only on that player card.' } },
        { emoji: '🎙️', name: { zh: '主持人', en: 'Host' },
          desc: { zh: '唸情境，冷場時丟一個新狀況進去。抽場景由卡片決定，畫面上的抽場景鈕是備援。',
                  en: 'Narrates, and throws in a complication when it stalls. The cards do the drawing; Draw Scene on screen is the backup.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '提醒大家說「角色會說的話」而不是「自己會說的話」，這是最有效的一句提醒。',
          en: 'Remind people to say what the character would say. It is the most useful note you can give.' },
        { zh: '人數改變後重抽一次就會重新分配角色。',
          en: 'Redraw after the player count changes to reassign roles.' },
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
        { zh: '20 格的環狀棋盤。停在無主或對手的土地上就要接受一次挑戰，題目一律 45 秒，過關才能佔領。',
          en: 'Twenty tiles in a loop. Landing on unclaimed or rival land triggers a challenge — always 45 seconds — and passing it takes the land.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `輪到的玩家按 ${B('btn-primary roll-btn', '🎲 擲骰子')} 前進（自己的手機上也有同一顆）。`,
          en: `The active player taps ${B('btn-primary roll-btn', '🎲 Roll')} — the same button is on their own phone.` },
        { zh: `自己喊題型：${BROW(B('td-choice-btn td-truth', '<span class="td-emoji">😇</span>TRUTH'), B('td-choice-btn td-dare', '<span class="td-emoji">😈</span>DARE'))}`,
          en: `They call it themselves: ${BROW(B('td-choice-btn td-truth', '<span class="td-emoji">😇</span>TRUTH'), B('td-choice-btn td-dare', '<span class="td-emoji">😈</span>DARE'))}` },
        { zh: '主持人先把題目唸完，再按計時器開始 45 秒。其他人可以在卡片上投票，但最終由主持人判定。',
          en: 'The host reads the prompt out first, then starts the clock. Others vote from their cards, but the host makes the call.' },
        { zh: '過關：無主地直接佔領；對手的地要再比一次骰子（進攻方只會骰出 4/5/6，平手算地主守住）。',
          en: 'On a pass, unclaimed land is yours. Rival land goes to a dice-off: the attacker only rolls 4–6, and a tie holds for the owner.' },
      ]},
      { icon: '📱', title: { zh: '玩家手機上會看到什麼', en: 'What players see on their phones' },
        phones: [
          { caption: { zh: '輪到自己', en: 'On your turn' },
            card: { name: 'Amy', color: 1,
                    turnbar: { name: 'Amy', color: 1, suffix: { zh: '輪到你了', en: 'YOUR TURN' } },
                    buttons: [
                      { label: { zh: '🔻 低點數 (2)', en: '🔻 Low Roll (2)' }, cls: 'is-choice' },
                      { label: { zh: '🎯 高點數 (2)', en: '🎯 High Roll (2)' }, cls: 'is-choice' },
                      { label: { zh: '🎲 擲骰子', en: '🎲 Roll the Dice' }, cls: 'is-green' },
                    ] } },
          { caption: { zh: '別人在挑戰時', en: 'While someone else plays' },
            card: { name: 'Ben', color: 2,
                    turnbar: { name: 'Amy', color: 1, suffix: { zh: '的回合', en: "'s turn" } },
                    buttons: [
                      { label: { zh: '✅ 完成了！', en: '✅ Did It!' }, cls: 'is-choice' },
                      { label: { zh: '❌ 失敗了！', en: '❌ Failed!' }, cls: 'is-choice' },
                    ] } },
        ],
        note: { zh: '題目文字<b>只會出現在正在接受挑戰的那個人</b>的卡片上，其他人看主持人畫面就好。投票只是參考，最終仍由主持人按判定。',
                en: 'The prompt itself appears only on the card of the player taking the challenge; everyone else watches the shared screen. Their votes are advisory — the host still makes the call.' } },
      { icon: '🎁', title: { zh: '每位玩家的三種道具', en: 'Three things every player carries' }, roles: [
        { emoji: '🎯', name: { zh: `High Roll ${B('btn-secondary roll-btn', '🎯 高點數 (2)')}`, en: `High Roll ${B('btn-secondary roll-btn', '🎯 High Roll (2)')}` },
          desc: { zh: '擲骰前啟動，這回合保證骰出 4／5／6。整局 2 次。',
                  en: 'Arm before rolling: every die comes up 4, 5, or 6. Twice per game.' } },
        { emoji: '🔻', name: { zh: `Low Roll ${B('btn-secondary roll-btn', '🔻 低點數 (2)')}`, en: `Low Roll ${B('btn-secondary roll-btn', '🔻 Low Roll (2)')}` },
          desc: { zh: '反過來保證 1／2／3。與 High Roll 互斥，取消會退回次數。',
                  en: 'The opposite: 1, 2, or 3. Mutually exclusive with High Roll; cancelling refunds it.' } },
        { emoji: '🔄', name: { zh: `New Question ${B('btn-secondary', '🔄 換一題 (3)')}`, en: `New Question ${B('btn-secondary', '🔄 New Question (3)')}` },
          desc: { zh: '換一題同類型的題目，整局 3 次，按下後會先跳出確認。',
                  en: 'Swap for another prompt of the same type. Three times per game, with a confirm step.' } },
      ]},
      { icon: '🗺️', title: { zh: '特殊格子', en: 'Special tiles' }, roles: [
        { emoji: '🏁', name: { zh: 'START', en: 'START' },
          desc: { zh: '過關後與指定玩家交換全部領地（跟 LUCKY 一樣）。',
                  en: 'Pass here and swap all your land with a chosen player, same as LUCKY.' } },
        { emoji: '⭐', name: { zh: 'BONUS ／ 🎁 GIFT', en: 'BONUS / 🎁 GIFT' },
          desc: { zh: '效果相同：過關後從目前領先的對手手上直接奪走 2 塊地。',
                  en: 'Identical effects: seize two tiles from whoever is leading.' } },
        { emoji: '🎲', name: { zh: 'LUCKY', en: 'LUCKY' },
          desc: { zh: '過關後與指定玩家交換全部領地。',
                  en: 'Swap your whole territory with another player.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '題目本身不寫秒數，主持人先唸完再按計時器。',
          en: 'Prompts never state a time. Read it out first, then start the clock.' },
        { zh: '土地佔滿也不會結束，玩到什麼時候由主持人決定；進度會自動存檔。',
          en: 'A full board does not end the game — the host decides when to stop. Progress saves itself.' },
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
        { zh: '陪審團在聽證前後各投一次票，兩票都保密，最後一起公布並標出誰被說服而翻票。這款遊戲不計分。',
          en: 'The jury votes before and after the arguments. Both stay hidden until the reveal, which shows who flipped. Nothing is scored.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: `按 ${B('status-line', '⚖️ 抽一條罪名')} 抽罪名並發角色，陪審團先秘密投第一次票。`,
          en: `Tap ${B('status-line', '⚖️ Draw a Charge')} to draw and deal roles, then the jury casts its secret pre-vote.` },
        { zh: '檢察官陳述 → 傳喚檢方證人 → 辯護律師答辯 → 傳喚辯方證人（證人從陪審團裡隨機抽，並拿到一張證人卡）。',
          en: 'Prosecution speaks, calls a witness; defense answers, calls a witness. Witnesses are drawn from the jury and handed a card.' },
        { zh: '交互詰問：雙方輪流問被告，被告必須回答每一題。',
          en: 'Cross-examination: both sides question the defendant, who must answer everything.' },
        { zh: `陪審團投最終票，然後揭曉判決。每一步都是按同一顆狀態鈕推進，按錯可以用 ${B('kc-back-btn', '⬅️ 回上一步')} 退回。`,
          en: `The jury votes again, then the verdict is revealed. One status button drives every step, and ${B('kc-back-btn', '⬅️ Previous Step')} undoes a misfire.` },
      ]},
      { icon: '📱', title: { zh: '玩家手機上會看到什麼', en: 'What players see on their phones' },
        phones: [
          { caption: { zh: '👥 陪審團投票', en: '👥 A juror voting' },
            card: { name: 'Amy', color: 1,
                    sub: { zh: '這是祕密投票 — 判決公布前沒有人看得到。', en: 'This is secret — nobody sees it until the verdict.' },
                    buttons: [
                      { label: { zh: '🚨 有罪', en: '🚨 Guilty' }, cls: 'is-choice' },
                      { label: { zh: '✅ 無罪', en: '✅ Not Guilty' }, cls: 'is-choice' },
                    ] } },
          { caption: { zh: '🕵️ 被抽到的證人', en: '🕵️ A juror called as witness' },
            card: { name: 'Ben', color: 4,
                    chip: { label: { zh: '🕵️ 你是證人！', en: "🕵️ You're the Witness!" }, hex: '#f59e0b' },
                    role: { key: { zh: '🕵️ 你的角色', en: '🕵️ Your character' },
                            name: { zh: 'The Old Teacher', en: 'The Old Teacher' },
                            hint: { zh: 'remembers this exact behavior from years ago', en: 'remembers this exact behavior from years ago' } },
                    sub: { zh: '融入角色 — 答案自己即興發揮！', en: 'Stay in character — improvise your answers!' } } },
        ],
        note: { zh: '陪審團的兩次投票完全不會出現在主持人畫面上，要按下「Reveal Verdict!」才一起公布——所以這款遊戲一定要有 Firebase。',
                en: "Neither jury vote ever reaches the host screen; they surface together only at Reveal Verdict! — which is why this game needs Firebase." } },
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🙇', name: { zh: 'Defendant 被告', en: 'Defendant' },
          desc: { zh: '受審的人，交互詰問時必須回答每一個問題。',
                  en: 'On trial. Must answer every question during cross-examination.' } },
        { emoji: '⚔️', name: { zh: 'Prosecutor 檢察官', en: 'Prosecutor' },
          desc: { zh: '負責指控，可以傳喚一位證人。',
                  en: 'Makes the accusation, can call one witness.' } },
        { emoji: '🛡️', name: { zh: 'Defense Attorney 辯護律師', en: 'Defense attorney' },
          desc: { zh: '負責答辯，同樣可以傳喚一位證人。',
                  en: 'Answers the charge, can call one witness too.' } },
        { emoji: '🧑‍⚖️', name: { zh: 'Judge 法官（可關閉）', en: 'Judge (optional)' },
          desc: { zh: '不影響判決，最後負責宣讀。4 人局會自動關閉。',
                  en: 'Does not change the verdict, just reads it out. Off automatically in a four-player game.' } },
        { emoji: '👥', name: { zh: 'Jury 陪審團（其餘所有人）', en: 'Jury (everyone else)' },
          desc: { zh: `在卡片上秘密投兩次票 ${BROW(B('is-choice is-tint-red', '🚨 Guilty'), B('is-choice is-tint-green', '✅ Not Guilty'))} 平手算有罪。`,
                  en: `Two secret votes from their cards ${BROW(B('is-choice is-tint-red', '🚨 Guilty'), B('is-choice is-tint-green', '✅ Not Guilty'))} A tie counts as guilty.` } },
        { emoji: '🕵️', name: { zh: 'Witness 證人', en: 'Witness' },
          desc: { zh: '臨時從陪審團裡抽出來，拿到角色與一句證詞，要即興演出。',
                  en: 'Pulled from the jury on the spot with a character and one line of evidence to improvise around.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '最少 4 人，且一定要有 Firebase——陪審團的票必須保密。',
          en: 'Four players minimum, and Firebase is required: the jury votes have to stay secret.' },
        { zh: '全程沒有計時器，節奏完全由主持人掌握。',
          en: 'There is no clock. The host sets the pace.' },
      ]},
    ],
  },
};
