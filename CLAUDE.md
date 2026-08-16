## 專案背景

我是一個**英文線上聊天室的主持人**，負責帶領參與者進行互動活動。

### 溝通限制
- ✅ 語音溝通（所有互動皆透過語音進行）
- ✅ 主持人可分享桌面（螢幕共享）
- ❌ 無視訊鏡頭（不能開視訊）

### 核心需求
開發適合線上語音聊天室使用的**破冰遊戲（Icebreaker Games）**，遊戲內容必須：
1. 不依賴視訊，純語音即可進行
2. 主持人可透過**分享桌面**展示遊戲畫面給參與者看
3. 以**英文**為主要語言
4. 適合陌生人或初次見面的參與者快速熟識

---

## 專案結構（現役檔案）

> ⚠️ **只讀取以下檔案。`_archive/` 資料夾內的所有檔案為舊版廢棄遊戲，除非使用者明確要求，否則永遠不要讀取或修改。**

| 檔案 | 說明 |
|------|------|
| `index.html` | 主選單 / 遊戲入口頁（Dare Conquest 排在第一個，Secret Rule 第二，Say It Without Saying It 第三，Kangaroo Court 排在最後） |
| `secret-rule.html` | 📜 Secret Rule（主持人頁：選 2–6 人、發牌，每人拿到一條**不同的**、只有自己知道的說話規則（全部是「關係型」規則：偷偷把在場所有人當成某一種對象來講話，例如「把大家當成你的學生」「把大家當成你的老闆」「把大家當成剛認識的陌生人」），大家照常聊天但要全程遵守自己的規則又不能被看穿，最後互相猜對方的規則、再按「🔍 Reveal Rules」在主持人畫面公布每個人的規則。發牌後主持人畫面會列出一份「🃏 Possible Rules」候選清單（數量為玩家人數 +2，5 人以上則為人數 +3，包含這局實際發出去的每一條規則，其餘為干擾用的假選項，依字母排序所以位置不會洩漏誰拿到哪張，並依序標上 1、2、3… 編號，讓大家可以直接喊號碼、不用把整句唸出來），讓玩家從有限選項中猜測，而不是從整份題庫裡瞎猜；這份候選清單同時會推送到每位玩家的卡片上，玩家卡片上的下拉選單也用**完全相同的編號與順序**（選項顯示為「3. 🙇 Talk to everyone like…」），玩家可以直接在自己的卡片上用下拉選單，替**其他每一位玩家**各投一張「我猜他是這條規則」的票（票寫進自己的 `players/{token}/guesses/{對方 playerNum}`，主持人靠已知的 token 逐一讀取來統計，不需要可列舉全房間的路徑）。主持人畫面會即時顯示「N / M 位玩家已完成猜測」，按下 Reveal Rules 後改成完整結果：每位玩家答對幾題的排行榜（最高分會highlight），以及每個人的真實規則與所有人對他的猜測（答對綠色 ✅、答錯灰色並列出猜錯的內容；真實規則與猜錯的內容都會標上該規則在候選清單裡的編號）。重新發牌會清空上一輪的所有猜測。另有「💬 New Topic」隨機抽聊天主題（只顯示在主持人分享的畫面上，卡片刻意不印，玩家卡片上只有自己的規則、例句與猜測下拉選單）與「🎲 Pick Someone」輪流點名發言，架構仿照 word-wolf.html，共用同一組 room code／玩家連結，主題色 teal；頁面最下方列出全部 16 條規則與 30 則主題供主持人瀏覽，這份完整題庫刻意**不編號**，避免跟候選清單的編號互相干擾） |
| `dont-say-it.html` | 🙊 Say It Without Saying It（Taboo 玩法，**整局的資訊與判定全在玩家卡片上，主持人畫面只有計分板**（因為主持人在分享桌面，目標字與禁字都不能出現在上面）。選 **3–6 人**（每輪要一位描述、一位裁判、至少一位猜），按「🎬 Deal a Word」抽卡並發出兩個角色。**角色是隨機抽的，但保證公平**：clue giver 用一個洗過牌的袋子（`giverBag`）輪流發，每位玩家都當過一次才會重新洗牌，且重新洗牌時不會讓剛當完的人接著再當；referee 則從「目前當過裁判次數最少」的人裡面隨機挑（`refCount`），所以順序每輪都不一樣、但次數完全平均（實測 4 人局 24 輪：每人各當 6 次 clue giver、6 次 referee，0 次連莊）：**clue giver 的卡片**＝倒數圈＋（有人搶答時才出現的）「🙋 xxx buzzed in」與「✅ Correct! +1 each／❌ Not it — keep going」兩顆判定鈕＋目標字＋四個禁字（搶答訊息與那兩顆判定鈕刻意排在**倒數圈與目標字之間**、也就是卡片最上方，因為那是有人搶答的瞬間 clue giver 唯一需要立刻反應的東西，不該讓他往下捲；沒人搶答時這一區完全不佔位置，改在卡片最下方顯示一行「Keep describing…」提示）；**👀 referee 的卡片**＝倒數圈＋四個禁字＋緊接在清單下方的「🚨 Taboo!」按鈕（禁字清單與那顆按鈕刻意相鄰，說明文字「Listen for a banned word…」移到按鈕**下方**，不讓它把清單與按鈕拆開），該輪不搶答，但舉發成立可以 +1；**其餘 guesser 的卡片**＝**看不到禁字**，只有倒數圈與一顆大的「🙋 Buzz in!」搶答鈕。（原本禁字是發給所有 guesser 的，但四個禁字就是「解釋這個字最先會想到的四個詞」，等於直接把答案送出去——改成只有描述者與裁判持有這份清單，猜的人純靠聽。）流程：clue giver 用英文描述 → guesser 想到就按搶答（用講的把答案喊出來）→ 他的名字會出現在 clue giver 的卡片上 → clue giver 按 ✅ 則**他與該 guesser 各 +1**、這輪結束；按 ❌ 則換排隊中的下一位（被判錯的人可以再按一次搶答）。同時有多人搶答會排隊，第 2 位以後的卡片顯示「You're #N in the queue」。**Taboo! 是「舉發」而不是直接判定**：裁判按下後不會馬上結束，主持人畫面會亮紅色顯示「🚨 Cara called Taboo! on Amy」（誰按的、被舉發的是誰，計分卡也會紅框標示），並跳出兩顆裁決鈕：「🚨 Yes — Taboo! +1 to the referee」＝成立，**抓到的裁判 +1 分**（這是裁判唯一的得分方式），描述者與猜題者 0 分，換下一位描述；「👌 No — keep playing」＝不成立，裁決列消失、回合原封不動繼續（舉發者可以再按一次）。裁決期間所有卡片都會顯示這條舉發訊息，裁判自己的卡片變成「🚨 You called Taboo! — waiting for the host」，其他人的搶答鈕仍然可用。主持人畫面只有：一行狀態列（誰在描述／誰搶答了／誰喊了 Taboo!／這輪結果與答案）、**一條控制列**，左右分成兩個一眼可辨的區塊（各有自己的彩色側邊條與小標題、中間一道分隔線；窄螢幕會上下堆疊）：**倒數圓圈固定在畫面正中央**（控制列用 `1fr auto 1fr` 三欄，不論左右控制項多寬，數字都剛好落在螢幕水平中線，實測 390–1280px 各寬度誤差皆為 0px），左邊「⏱️ Round timer」＝一組「− ／ 秒數 ／ +」的秒數欄位（−／+ 每按一次 ±30 秒並自動對齊到 30／60／90／120… 的整數倍，範圍 30–900；中間欄位仍可直接打任意秒數 5–900，打字途中不會被夾住、離開欄位才會校正。**刻意不用 `<datalist>`**：Safari 會依欄位現有內容過濾建議，iPad 上欄位是 60 時就只看得到 60 一個選項）＋Start／Reset；右邊「🚫 Round rules」＝禁字開關＋**難度選擇**（🟢 Easy 100 字／🟡 Medium 100 字／🔴 Hard 100 字，選了之後只抽該難度的字，換難度會清空「已出過」清單、但不會動到正在進行的那一輪；選擇存進同一包 `localStorage`）（窄螢幕時圓圈移到最上方、下面依序是計時控制與禁字開關）。按「▶️ Start」開始倒數、可「⏸️ Pause」暫停續跑、「🔄 Reset」歸零重來。**有人搶答或喊 Taboo! 時倒數會自動凍結**（搶答的人不該在等 clue giver 判定時被扣秒數，喊 Taboo! 更是直接中斷了這一回合），主持人畫面與每位玩家的卡片同步停住，狀態列會補上「⏸️ Clock on hold」說明為什麼停了；等 clue giver 按 ❌（且排隊中沒有下一位）或主持人按「👌 No — keep playing」才從停住的秒數接著跑，按 ✅ 或裁決成立則直接結束該輪。程式用 `timer.autoHeld` 記住「這次是系統自己暫停的」，所以只會解除自己造成的暫停：主持人手動按過 ⏸️ Pause 的計時器不會被搶答結束時意外喚醒，而主持人手動按 ▶️／🔄 一律優先、會清掉這個旗標。凍結期間一樣不寫 Firebase（實測 4 人局凍結 5 秒＝0 次寫入，一次搶答含暫停共 5 次寫入）；大圓形數字會隨剩餘比例變色綠→橘→紅並在最後閃爍。**按下「▶️ Next Round」時倒數會自動開始**（主持人剛按過一次按鈕，還要再按一次 Start 只是白白吃掉秒數），主持人畫面與所有卡片同步起跑；**倒數同步顯示在每一位玩家的卡片上**（同款圓圈，clue giver 在題目上方、guesser 在禁字上方），做法跟 Dare Conquest 一樣：主持人只在狀態改變時推一次 `timer { seq, state, remaining, total }`，卡片收到後自己每秒遞減，**倒數過程中完全不寫 Firebase**（實測 4 人局跑 8 秒＝0 次寫入）。歸零時該輪自動結束、0 分並公布答案；每抽一張新卡計時器會重設成設定秒數並自動開始）、Taboo! 裁決鈕（只在有人舉發時出現）、每人一張大計分卡（clue giver 靛色highlight 並標「🎤 Clue giver」、裁判琥珀色標「👀 Referee」、搶答者綠色浮起；全站一律用 **clue giver** 這個稱呼，不再出現 describing 字樣）、「Deal a Word／Next Round」與「Skip this word」按鈕（一輪結束後 Deal 按鈕會變成綠色並持續脈動、文字改為「▶️ Next Round — new clue giver」，避免主持人分享畫面時看不出來換人了）、連結區，以及一份**預設收合**的題庫（按「👁️ Browse all 300 words」才展開，避免分享畫面時暴雷；展開後依難度分成三組顯示）。控制列右半的「🚫 Forbidden words ON／OFF」開關：關掉時**所有人的卡片都不會出現禁字、也不再發裁判**（clue giver 只剩目標字與一行「No banned words this round」，原本的裁判變回一般 guesser 可以搶答），搶答與計分照常運作；開關可在回合進行中即時切換、會存進 `localStorage`（key: `dontSayItOptions.v1`）重整後保留。沒有 Firebase 時這款無法進行（目標字沒有地方私下給 clue giver 看），會顯示警告並鎖住 Deal 按鈕。技術上：開新回合用 `ROOM.publish()`（`.set()`，順便清掉上一輪的作答），回合進行中改用 `ROOM.update()` 避免蓋掉玩家正在寫入的搶答；主持人收到搶答後會 `ROOM.clearAnswer()` 把該欄位清空，所以同一個人可以重複搶答。連結區用 `room.js`：clue giver 的欄位框線用**綠色**（`is-giver-link`，跟頁面本身的靛色主題色不同，才能在一片靛色 UI 裡一眼認出來），referee 維持琥珀色（`is-ref-link`，跟計分板上的裁判配色一致）；連結區上方另有一顆「👁️ Show what's on player cards (spoilers — don't open while sharing)」按鈕，**預設關閉**，按下後每位玩家的連結卡片下方會即時多印一段文字，原原本本轉述 `payloadFor()` 推給那張卡片的內容（clue giver 看到目標字＋禁字＋是否有人搶答、referee 看到禁字、其餘玩家看到搶答/排隊狀態、回合結束後看到結果），讓主持人不用拿起手機就能核對每個人手機上實際顯示什麼；再按一次變回「🙈 Hide player cards」收合。主題色靛 `#6366f1`） |
| `hottake.html` | 🔥 Pick a Side!（主持人按 Spin 抽一句爭議意見，每位玩家在自己的卡片上按 👍 Agree／🤷 It Depends／👎 Disagree，主持人畫面的三根長條即時累加；主持人自己也可以直接點畫面上的按鈕幫沒有連結的人計票，最終票數 =「卡片票 + 手動點的票」。每次 Spin 會換一個 `voteId`，上一輪的票自動失效；玩家連結區用 `room.js`，主題色橘 `#ff7043`） |
| `what-will-you-do.html` | 🤔 Sophie's Choice（抽一則兩難劇本，每位玩家在自己的卡片上按 A／B／C（C 是「自己的答案」），主持人畫面在劇本卡下方顯示三欄即時統計：票數 + 投給該選項的玩家名字，最高票那欄框線亮起；連結區用 `room.js`，主題色琥珀 `#f59e0b`） |
| `persuade-team.html` | 🤝 Persuade Together!（抽劇本時會**隨機發牌決定誰當裁判**：一人拿到 👨‍⚖️ Judge、其餘拿到 👥 Persuader Team，各自在卡片上看到自己的身分與劇情；主持人畫面的「The Judge」下方會標出「🎴 Played by 名字」，並在下方顯示一條裁判狀態列（等待中／✅ 被說服／❌ 沒被說服）。裁判的卡片上有「✅ You convinced me!／❌ Not convinced」兩顆按鈕，按下後主持人畫面即時變色；連結區用 `room.js`，主題色青 `#06b6d4`） |
| `scene.html` | 🎭 You're In The Scene（抽場景後**自動依房間人數把角色隨機發給每位玩家**，每個人的卡片上只有自己那一個角色（字母、角色名、演法提示）＋場景描述，不用再互相喬誰演誰；主持人畫面的角色卡下方會標出「🎴 名字」對照表，人數鈕與房間人數雙向同步；連結區用 `room.js`，主題色粉 `#ec4899`） |
| `emotion.html` | 🎴 Emotion Cards（主持人頁：選 2–6 人、發牌、產生每位玩家的私人連結） |
| `word-wolf.html` | 🐺 Word Wolf（主持人頁：選 3–6 人、發牌，多數人拿到同一個字、一人拿到臥底字，架構仿照 emotion.html；頁面最下方列出**全部 80 組詞組**供主持人瀏覽，依類別分組、每組標上編號與「A vs B」） |
| `team-words.html` | 🤐 Forbidden Words（主持人頁：選 2–6 人、發牌，隨機分成 Team A / Team B，兩隊各拿一組常見單字，目標是誘導對方隊伍說出自己這隊的字、同時避免說出對方的字，架構仿照 word-wolf.html，用的是 `forbidden` 詞庫、不是 wordwolf） |
| `conquest.html` | 🏰 Dare Conquest（主持人單頁，Firebase 只用於選配的玩家投票、沒有 Firebase 時整個遊戲照常運作：選 2–6 人、8×4 寬螢幕比例的 board 外圍 20 格路徑，START 在左上角、順時針前進，輪到自己時按地圖正中央的「🎲 Roll」丟一顆骰子、移動 1–6 格（只有一顆骰子，沒有兩顆骰子的選項）；骰子按鈕旁還有兩顆技能鈕「🎯 High Roll (N)」與「🔻 Low Roll (N)」，各自整局限用 2 次，要在按「Roll」之前先按下啟動（按鈕文字不變，改成框線變紅、文字變黃色表示已啟動），啟動後當回合丟出的每一顆骰子都保證是 4/5/6（High Roll）或 1/2/3（Low Roll），直接換到下一位玩家後才會解除；已啟動的技能再按一次可以取消（框線與文字變回灰色）並退回這次名額，若啟動其中一個時另一個技能還沒用掉、按下另一顆技能鈕會直接切換（原本啟動的那個技能名額退回、改扣新按的），兩者互斥、同時只會有一個生效，次數用完按鈕不會消失，會顯示「(0)」並鎖定無法再按，次數會跟著玩家資料一起存進 localStorage，重新整理不會重置，停在一般格上，若該地已經是自己的土地：不會有任何事發生，直接換下一位玩家；停在無主或對手土地上才會先跳出綠色/紅色的「Truth or Dare」選擇畫面，由當前玩家自己自由喊出「😇 TRUTH」或「😈 DARE」，主持人依玩家喊的內容點擊對應按鈕（不是系統或對手指定）：選 TRUTH 會從 50 則真心話題庫隨機抽一題讓玩家誠實回答（按鈕文字為「✅ Honest!／❌ Pass!」、面板呈金色主題、題目除了個人隱私類（尷尬回憶、小謊言、不敢說的怪癖等）也有不少評論／比較其他玩家的題目，例如「你覺得這房間裡誰最可能先被淘汰？」「{player} 給你的第一印象是什麼？」，帶點爭議性與互動性）、選 DARE 則從一般 50 題互動挑戰題庫隨機抽一題（跟其他玩家告白、開嗆聲互酸、投票淘汰、幫其他玩家頒一個損人不利己的獎、唱指定歌曲、說笑話、講繞口令等，過半題目會直接點名 {player} 互動），不論 TRUTH 或 DARE 全部題目一律 45 秒，題目文字本身不再寫秒數（改由計時器顯示），畫面會顯示一顆「⏱️ Start 45s Timer」按鈕，主持人先把題目唸完、按下按鈕才開始倒數，倒數圈會隨秒數變色：綠→橘→紅並閃爍，開始倒數後會多出現「⏸️ Pause／▶️ Resume」與「🔄 Restart」兩顆按鈕，可以暫停/繼續、或直接重新從頭倒數；倒數秒數會同步到**每一位玩家**的卡片上（當事人在題目下方、其他人在投票鈕上方，都是一顆同款的倒數圈，一樣綠→橘→紅並閃爍），主持人端只在狀態改變時（開始／暫停／繼續／重新開始／歸零）推送一次 `players/{token}/conquestTimer`，卡片收到後自己每秒遞減，避免每秒寫一次 Firebase，過程中 Did It!/Failed!（或 Honest!/Pass!）仍可隨時按，計時不會自動判定，完成才算過關；設定畫面的排版跟其他四款卡牌遊戲統一（仿 `word-wolf.html`）：上方一張控制卡，第一列是「ROOM ／ 房號輸入框 ／ Load ／ New Room」，分隔線後第二列是「PLAYERS ／ 2–6 人數鈕 ／ 🎲 Start Game」；下方「🔗 Player Links」區塊每位玩家一欄（`.link-col`），由上而下是該玩家的棋子色圓點、名字輸入框、「📋 Copy Link ／ QR」兩顆按鈕，欄位外框就是他在棋盤上的顏色，名字只在這裡輸入一次（不再像舊版分成「name grid」與「連結列表」兩處重複顯示）；沒有 Firebase 時 ROOM 列與連結按鈕自動隱藏、標題改成「👥 Players」，只剩名字欄位。這一區沿用跟其他四款卡牌遊戲**完全相同的 room code 與玩家連結**（自動讀取 `room-last-session`，玩過前面遊戲的人不用換連結；也可以輸入房號 Load 或按 New Room 重開。**玩家人數與姓名跟其他四款遊戲雙向同步**：開頁時直接套用房間裡存的人數與姓名，在這裡改人數或改名字也會寫回同一個房間，其他遊戲開啟時就是同一組設定；若對方遊戲不支援該人數（例如 Word Wolf 最少 3 人）會由對方自行 clamp 並顯示提示）（「QR」會就地展開該玩家連結的 QR code，一次只會開一個，再按一次收起），輪到誰的回合時，**那位玩家的卡片上會由上而下垂直排列「🔻 Low Roll (N)」「🎯 High Roll (N)」兩顆技能鈕與一顆「🎲 Roll the Dice」按鈕，按下去就會觸發主持人畫面上對應的動作**（技能的啟動／取消／互斥切換與名額扣退全部由主持人端的 toggleSkill 處理，卡片只是發出請求，啟動中的技能在卡片上一樣是紅框＋黃字，次數用完顯示「(0)」並鎖定；擲骰同理）（骰子與結果仍由主持人畫面決定；主持人畫面正在擲骰／移動／有挑戰進行中時三顆按鈕都會自動變灰，不是自己回合則完全不顯示，重複送出的請求會被忽略）；接著跳出 Truth or Dare 選擇畫面時，**同一位玩家的卡片上也會出現 😇 TRUTH／😈 DARE 兩顆按鈕**，可以直接從自己手機喊題型（不必用講的讓主持人代點；其他人的卡片顯示回合列、「picking Truth or Dare…」與 ⏳，主持人畫面上的兩顆按鈕仍然可以按，先到先算），主持人抽到題目時會把「誰的挑戰／題型／題目文字」推送到每位玩家的卡片（`players/{token}` 的 `conquest` 欄位，`{player}` 會換成純文字名字），**其他玩家**的卡片上出現跟主持人畫面一樣的兩顆按鈕（✅ Did It!／❌ Failed!，Truth 題則是 ✅ Honest!／❌ Pass!），投票寫進自己的 `players/{token}/conquestVote`（含該題的 id）；**輪到的那位玩家自己不投票**，他的卡片改成顯示這題的題目文字（他要照著做，是唯一需要在手機上看到題目的人），主持人畫面把票數直接做成兩顆判定按鈕內的小圓形徽章（「✅ Did It! (2)」「❌ Failed! (1)」），該側 0 票時徽章不出現、按鈕跟沒有投票功能時長得一樣，但**投票只是參考、最終仍由主持人按判定按鈕**；每抽一題會產生新的 vote id，舊票自動失效不用清除，換題或判定後玩家卡片會回到待機狀態（名字、回合列、⏳、戰績）；未設定 Firebase（或 CDN 連不到）時投票區塊自動隱藏，遊戲完全不受影響；抽到題目後、判定之前，挑戰卡右上角（跟題型標籤同一排）還有一顆「🔄 New Question (N)」，玩家看到題目覺得不想做可以直接換一題（換到的一定是同類型：抽 TRUTH 就換 TRUTH、抽 DARE 就換 DARE），按下去不會馬上換，會先在按鈕正下方跳出「Change this question?」確認小視窗（✅ Yes／✖️ Cancel，並顯示剩幾次），確認期間題目與判定按鈕會變暗且不可點，避免誤觸浪費次數；每位玩家整局限用 3 次，換題會重置計時器、被換掉的題目這輪不會再出現，次數用完按鈕不會消失、顯示「(0)」並鎖定，次數跟 High/Low Roll 一樣會存進 localStorage；若落地的是無主土地，過關即直接佔領，若落地的是對手土地（搶地盤），過關後不會馬上換手，而是彈出金色「🎲 Dice-Off!」面板讓進攻方與地主各自的骰子（可一次看到雙方骰子與點數）比大小：進攻方先按「🎲 Roll」骰（進攻方的骰子只會出現 4、5、6，算是完成挑戰後的小優勢，地主骰子維持 1～6 正常機率）、骰出結果後地主的骰子按鈕才會解鎖，地主按下後骰；**這兩顆骰子也可以由當事人自己在卡片上按**（進攻方與地主各自的卡片會出現一顆「🎲 Roll」，主持人畫面上該側按鈕還沒解鎖時卡片上也是灰的，其他人的卡片只顯示「A vs B」與 ⏳；主持人端會驗證是不是本人、以及該側是否真的可以骰，主持人畫面上的兩顆按鈕一樣可以代按）、進攻方點數大於地主才算搶地成功（平手算地主守住），骰出結果的瞬間贏的一方骰子會立刻發光脈動、頭上跳出皇冠 👑、點數變成綠色高亮，輸的一方則變暗變灰階，清楚標示贏家，成功搶地瞬間該格會有搶奪特效：格子震動晃動、指揮官色系放射狀色彩衝擊波、白色粒子爆散、並彈出「🏴 CAPTURED!」浮動標籤，挑戰沒過關（Failed!/Pass!）則不會進入 Dice-Off、土地直接留在地主手上，地圖格子不顯示題型、可佔領的一般格不放任何圖示（純空白，佔領後才會整格變色），20 格中除了 START 還有 2 個 BONUS、1 個 LUCKY、1 個 GIFT，停在 START/BONUS/LUCKY/GIFT 上都要先過一次 Truth or Dare 挑戰（同樣由玩家自選 TRUTH/DARE、主持人點對應按鈕，面板會依格子類型變色並顯示「🏁/⭐/🎲/🎁 START/BONUS/LUCKY/GIFT Challenge」），過關才會真的觸發獎勵、失敗則什麼都不會發生直接換人：BONUS 必定從目前地最多的對手（領先者）手上奪取 2 塊地（多人並列領先時隨機挑一位下手），觸發搶奪特效；只有在沒有任何對手擁有土地時（例如遊戲剛開始）才會改成隨機取得 2 塊無主土地、LUCKY 與指定玩家交換全部領地（2 人局自動指定唯一對手，3 人以上由主持人點選對象）、GIFT 效果與 BONUS **完全相同**（同樣從領先者手上奪取 2 塊地，只有圖示、顏色與文案不同；兩者共用同一個 `seizeFromLeader()`，數量由 `SEIZE_COUNT` 常數控制），START 格現在也帶有 LUCKY 屬性：玩家停在 START 時不再只是「安全格、什麼都不會發生」，過關後會直接觸發跟 LUCKY 格一樣的「交換全部領地」效果，觸發特殊事件時該格會有發光閃爍特效、挑戰卡框線與圖示也會依事件類型變色，特殊事件訊息不會自動消失，主持人看完按下「👍 OK」才會換下一位玩家，玩家目前所在格子（無論一般格或特殊格）都會顯示玩家圖示，輪到誰的那位玩家會有明顯標示：所在格子外圍有對應顏色的發光脈動外框、該玩家的圖示會放大並持續彈跳、圖示上方有小箭頭指標與擴散光環，換人時立即跟著移動，方便主持人一眼看出目前輪到誰，一般土地佔領後整個格子會填滿玩家對應顏色（不再只是外框變色或右上角小圖示），格子正中央還會顯示該玩家的名字（白字、超過一行會自動換行最多兩行並截斷），骰子改為可 3D 翻滾的真實骰子（CSS 3D 立方體、6 面點數、擲出時有拋起彈跳動畫）並放在地圖正中央，回合資訊獨立顯示在 board 上方的控制列（「Player X's turn · Round N」，Round 是每個玩家都輪過一次才會 +1 的完整回合數，不是每人每次擲骰都算一輪），挑戰卡改為浮動疊加在地圖正中央的卡片（不佔版面、不會把地圖往下擠），只有真的有挑戰/特殊事件/LUCKY 選擇對象時才會出現，地圖上方所有區塊（標題、計分板、控制列）皆採緊湊排版以節省版面，遊戲不會因為土地全數佔領而自動結束、答對挑戰仍可從對手手中搶地讓局勢持續變化，遊戲畫面沒有「Restart Board」「End Game」「Change Players」等控制按鈕，相鄰（棋盤外圈路徑上前後相接）且同一位玩家擁有的土地之間，交界處會出現一小段磚紋橋樑/城牆結構、顏色跟該玩家的地一致，視覺上把兩塊地連成一體（純視覺標示，不影響分數），頁面最下方分別列出 Dare 題庫與 Truth 題庫供主持人瀏覽，遊戲進度會在每個回合結束（換人、Dice-Off 結算、特殊格確認）時自動存進 `localStorage`（key: `dareConquestSave.v1`），只存「回合與回合之間」的乾淨狀態、不存挑戰/Dice-Off 進行到一半的中間畫面，重新整理或關閉分頁後回到設定畫面會看到「🕹️ You have a game in progress」提示，可選擇 Resume Game 還原棋盤與計分，或 Start New Instead 捨棄重來） |
| `kangaroo-court.html` | ⚖️ Kangaroo Court（主持人單頁，選 **4–6 人**，每局隨機發出 🙇 Defendant／⚔️ Prosecutor／🛡️ Defense Attorney 三個不同角色，其餘全是 👥 Jury；發牌方式仿 `dont-say-it.html`：Defendant 用一個洗過牌的袋子輪流發、每人都當過一次才重新洗牌且不連莊，Prosecutor／Defense 則各自從「目前擔任次數最少」的人裡隨機挑，三個角色互斥，長期次數完全平均。按「⚖️ Draw a Charge」從 30 條荒謬但貼近生活的罪名（`game-data.js` 的 `kangaroo`，例如「已讀不回 72 小時卻在期間更新限動」）隨機抽一條，同時開放陪審團在自己卡片上**秘密**投票 Guilty／Not Guilty（寫進 `players/{token}/kcPrevote = {id, choice}`，這一票在結果公布前完全不會顯示在主持人畫面或任何人的卡片上）。主持人依序按同一顆 CTA 按鈕推進流程：開放陪審團投票 → Prosecution 開庭陳述（60 秒）→ Defense 開庭陳述（60 秒）→ Cross-Examination（不計時，Prosecutor／Defense 輪流問 Defendant 問題、Defendant 必須回答）→ Prosecution 結辯（30 秒）→ Defense 結辯（30 秒）→ 陪審團**最終**投票（寫進另一個獨立欄位 `kcFinalvote`，跟 `kcPrevote` 分開存，因為兩票都要留到 Reveal 才一起讀出來比較，若共用同一個欄位會被最終投票蓋掉）→「⚖️ Reveal Verdict!」。計時的四個階段（開庭/結辯陳述）沿用跟 Dare Conquest／Say It Without Saying It 相同的 `timer { seq, state, remaining, total }` 推播模式，只在階段切換時寫一次 Firebase，卡片自己每秒遞減；Cross-Examination 沒有計時（`timer.total = 0`），CTA 按鈕在計時歸零或進入 Reveal 階段時會綠色脈動提醒主持人該按下一步。**計分（說服力差額制）**：Reveal 時比較每位陪審員的預投票與最終投票，若某人從 Guilty 翻成 Not Guilty，**Defense +2**；若從 Not Guilty 翻成 Guilty，**Prosecutor +2**（沒翻票不計分）；最終票數 Guilty 多於 Not Guilty 則 Defendant 被定罪 **−1**，否則（含平手，比照「罪疑唯輕」）無罪 **+3**；陪審團本身不計分——因為角色每局輪替，長期玩下來人人都會當到 Defendant／Prosecutor／Defense。分數是**累計制**（不會因為換局重置，只有主持人按「↺ Reset scores」才會歸零），主持人畫面下方有一份常駐排行榜，最高分會 highlight。主持人畫面另外有一份「⚖️ Verdict」卡：投票期間顯示「N / M 位陪審員已投票」，Reveal 後改成完整結果——逐一列出每位陪審員的預投票→最終投票（翻票的會標「flipped → Defense +2」或「→ Prosecutor +2」）、這局三個角色各拿了幾分。玩家連結區用 `room.js`，Defendant／Prosecutor／Defense 的連結欄位分別用紅／橘／藍框線標示身分（`is-role-defendant`／`is-role-prosecutor`／`is-role-defense`），並在下方標出角色與累計分數；Jury 的連結欄位不特別標色。玩家卡片（`play.html` 的 `game: 'kangaroo'`）依 `role` 與 `phase` 切換：非 Jury 在投票階段看到「🤫 陪審團正在投票」等待訊息；Jury 在 `prevote`／`finalvote` 階段看到 🚨 Guilty／✅ Not Guilty 兩顆大按鈕；輪到自己陳述的 Prosecutor／Defense 在開庭/結辯階段看到「🎤 The floor is yours」＋同步倒數圈，其他人看到「⚔️/🛡️ 某某正在發言…」＋同一顆倒數圈；Cross-Examination 階段 Defendant 看到「🎯 Answer every question」、Prosecutor／Defense 看到「❓ Ask the defendant a question」、Jury 看到「👀 Watching…」；Reveal 階段每張卡片都會顯示這局的判決結果、自己拿了幾分、以及（若是陪審員）自己是否翻票。沒有 Firebase 時整局無法進行（陪審團的票必須保密，不能讓主持人畫面直接看到），會顯示警告並鎖住「Draw a Charge」按鈕。主題色紅 `#e94560`（`index.html` 裡唯一沒被其他遊戲用過的預留色）） |
| `play.html` | 🔗 **全部十一款遊戲**共用的玩家頁面：玩家開啟自己的私人連結後看到當下這局的內容，依 Firebase 資料中的 `game` 欄位自動切換樣式；同一個 Room Code + 同一批玩家連結可以在十一款遊戲間直接切換使用，不用重新產生連結。所有卡片最上方都用**同一顆名字晶片**（同字級、同形狀）。**十一款遊戲共用同一組玩家配色**，順序就是 Dare Conquest 棋子的順序：1 紅 `#ef4444`／2 藍 `#4f9eff`／3 綠 `#22c55e`／4 黃 `#f59e0b`／5 紫 `#a78bfa`／6 青 `#06b6d4`，所以同一個人不管主持人切到哪一款遊戲，卡片顏色都不會變，也永遠對得上他在棋盤上的棋子。晶片是**整塊填滿該玩家的顏色**、配深色文字（`#0b0b18`）：六個顏色配深字的對比度都在 5:1 以上（紅色最低，實測 5.19:1），彩色文字配深底則做不到六色都合格。四款「用手機作答」的遊戲各有一組樣式：`game: 'hottake'` 顯示題目＋👍/🤷/👎 三顆按鈕、`game: 'sophies'` **不顯示情境**（情境留在主持人分享的畫面上，卡片再印一次只會讓大家低頭看手機），只有 A/B/C 三顆選項按鈕（兩者都寫進 `players/{token}/vote = { id, choice }`，可隨時改投）、`game: 'scene'` 顯示自己被分到的角色與提示、`game: 'persuade'` 顯示自己是 Judge 還是 Team（只有 Judge 有 ✅／❌ 判決鈕）、`game: 'taboo'` 依 `state` 與 `isGiver` 切換：clue giver 看到目標字＋禁字、guesser 只看到禁字＋🙋／🚨 兩顆鈕、回合結束後所有人看到結果與答案，底部一行是自己的積分。`game: 'conquest'` 時卡片刻意做得很輕：自己的名字、**一條永遠都在的回合列**（大字顯示現在輪到誰：色球圖示＋名字，整條的框線、底色、光暈都用該玩家的棋子顏色；輪到自己時顯示「YOUR TURN」並持續明暗脈動），當下能按的按鈕、題型標籤，以及底部一行自己的戰績（🚩 N tiles · Round N）；Truth or Dare 選擇階段回合列下方會多一行小字（自己是「Truth or Dare?」、別人是「picking Truth or Dare…」）。題目文字**只有正在接受挑戰的那位玩家**看得到（他要照著做；其他人看主持人畫面就好，卡片再印一次只會讓大家低頭看手機）。按鈕依狀態切換：輪到自己且可擲骰時是「🔻 Low Roll (N)」「🎯 High Roll (N)」兩顆技能鈕加上「🎲 Roll the Dice」（棋盤忙碌中則全部變灰）、Truth or Dare 選擇階段是 😇 TRUTH／😈 DARE 兩顆、有題目在進行時，別人是 ✅／❌ 兩顆投票鈕（選過的那顆會亮起、可以改投）、當事人則是題目文字（不能投自己），其餘情況只顯示一個 ⏳。`game: 'kangaroo'` 依 `role`（defendant／prosecutor／defense／jury）與 `phase` 切換：Jury 在 `prevote`／`finalvote` 階段看到 Guilty／Not Guilty 兩顆按鈕（分別寫進 `kcPrevote`／`kcFinalvote`，兩個獨立欄位不互相覆蓋），其他角色看到「陪審團投票中」等待訊息；輪到發言的 Prosecutor／Defense 在開庭/結辯階段看到「🎤 The floor is yours」＋跟主持人畫面同步的倒數圈；Cross-Examination 階段 Defendant 看到「🎯 Answer every question」、Prosecutor／Defense 看到「❓ Ask a question」；Reveal 階段顯示判決結果與這局拿了幾分 |
| `firebase-config.js` | 十一款遊戲共用的 Firebase Realtime Database 設定（host 與 play.html 共用，需自行申請免費專案並填入；全部共用同一個 `rooms/{roomCode}/players/{token}` 路徑。Secret Rule / Emotion Cards / Word Wolf / Forbidden Words 這四款沒有 Firebase 就無法發牌，Kangaroo Court 沒有 Firebase 則無法讓陪審團投票保密，兩者都會鎖住主要按鈕，Say It Without Saying It 沒有 Firebase 時要靠主持人畫面的「👁️ Reveal」把字給 clue giver 看，其餘五款只是關掉卡片互動、遊戲本身照常可玩） |
| `room.js` | 🔗 **共用的玩家卡片層**（`ROOM`），**十款遊戲共用**（Pick a Side / Sophie's Choice / Persuade Together / You're In The Scene / Say It Without Saying It / Secret Rule / Word Wolf / Emotion Cards / Forbidden Words / Kangaroo Court；只有 `conquest.html` 因為設定畫面長得不一樣，保留自己的實作）。負責：房號與 token 的產生與保存、`room-session-{CODE}`／`room-last-session` 的讀寫（**跟其他五款遊戲完全共用**，人數與姓名雙向同步）、設定畫面 UI（ROOM 列 ／ PLAYERS 人數鈕 ／ 一位玩家一欄的姓名＋📋 Copy Link／QR，排版與 `word-wolf.html`、`conquest.html` 完全一致，主題色由 `accent` 參數決定）、`publish()` 推播到每位玩家的 token 節點並寫 roster、每個 token 各自掛一個 listener 回收玩家的回覆。API：`ROOM.init({ mount, accent, counts, defaultCount, linksNote, actionsHTML, extraRowHTML, onPlayerData, onCountChange, onNameChange })`、`ROOM.publish(payload 或 i => payload)`（`.set()`）、`ROOM.update(...)`（`.update()`，不會蓋掉玩家的作答）、`ROOM.clearAnswer(i)`、`ROOM.setDecorator(i => ({ marked, cls, answer }))`（`cls` 讓各遊戲把自己的狀態色畫在欄位上，例如 Word Wolf 的 `is-wolf`、Forbidden Words 的 `team-a`／`team-b`、Secret Rule 的 `is-revealed`／`is-picked`）、`ROOM.setExtra(key, value)`／`ROOM.getExtra(key)`（把該遊戲自己的設定存進同一包 room session，例如 Forbidden Words 的 `wordsPerTeam`；經由這組 API 存取才不會被別的遊戲覆蓋掉）、`ROOM.enabled / count / names / code / answers / name(i)`。沒有 Firebase（或 CDN 連不到）時自動隱藏 ROOM 列與連結按鈕、標題改成「👥 Players」，遊戲照常運作 |
| `shared.css` | 所有遊戲頁共用樣式 + 主題變數：頁首、`.hidden`、`.fb-warning`、`.section-hdr`、`.btn-primary`／`.btn-secondary`。顏色一律走 `var(--accent)`（次要按鈕 hover 用 `--accent-alt`，Firebase 警告條用 `--warn`），每個頁面只要在自己的 `<style>` 開頭寫一行 `:root { --accent: … }` 就換色完成；形狀真的不一樣的頁面（例如 `conquest.html` 的 `.section-hdr` 是 flex 排版）在自己的 `<style>` 覆寫即可，因為頁面樣式一定晚於這個檔案載入 |
| `scenario.css` | 三款「抽劇本」遊戲（Sophie's Choice／You're In The Scene／Persuade Together）共用的版面：劇本大卡、`.filter-bar` 類別篩選、`.btn-draw` 抽卡鈕、下方可瀏覽的完整劇本清單。同樣用 `--accent` 換色 |
| `game-data.js` | 所有遊戲的題目資料（hottake / persuade / scene 各 10 題；sophies 38 則兩難劇本；wordwolf **80** 組臥底詞組（只有 Word Wolf 使用。刻意只留同質性最高的一批 — 標準是「你能說出關於其中一個的句子，幾乎都同樣適用於另一個」：①同類別、同用途、同場合；②實體物要**形狀、顏色、大小都接近**（Coffee/Cola 深褐色液體、Tomato/Red Pepper 紅色發亮、Crocodile/Lizard 綠色有鱗四腳、Dolphin/Shark 灰色流線型、Octopus/Squid、Crab/Lobster、Bee/Wasp、Butterfly/Moth）；③**一律用簡單好懂的字**，不用 protractor、accordion、locomotive 這類冷門字；④不採用一句話就穿幫的組合：室內↔室外、白天↔晚上、互為相反（鑰匙／鎖）、一方包含另一方（巧克力／糖果）、只差在大小（山／丘、村莊／城市）、以及形狀顏色差太多的（足球／籃球、背包／行李箱）都不用）；forbidden 200 個日常單字，Forbidden Words 專用；emotion 25 種情緒；conquest 50 則互動挑戰指令（Dare），供 Dare Conquest 使用，**分成五大類型、每類 10 題**（🎤 Singing 唱歌／🗣️ Voices & Sounds 變聲與音效／🎭 Improv & Roleplay 即興與角色扮演／💬 To Their Face 當面稱讚或吐槽／🧠 Word Games & Memory 文字遊戲與記憶），每題有 `type`（五大類型）、`cat`（該題自己的標題，50 題各不相同，顯示在挑戰卡的小標籤上）、`text`、`seconds`；`{player}` 會被隨機替換成另一位玩家的名字（50 則中有 32 則帶 {player}，題目盡量設計成需要跟其他玩家互動），全部 50 則的 `seconds` 欄位一律為 45，內容以簡單好懂的用字為主。因為參與者沒有鏡頭，題目一律寫成「唸出來／說出來／做聲音」，不會有 show us 這類要看畫面的指令；conquestTruth 50 則真心話題目，供玩家選擇「TRUTH」時使用，同樣**分成五大類型、每類 10 題**（📱 Phone Reveal 當場打開手機唸出來／😳 Cringe & Confessions 糗事與自白／🧒 Back Then 童年與後悔的事／💘 Crushes & Dating 暗戀與約會／💰 Money & Work 金錢與工作），欄位與 Dare 相同；其中 10 則帶 {player}，用來把其他玩家拉進來（讓對方先猜、由對方指定要講哪一個、答完反問對方），全部 50 則的 `seconds` 欄位一律為 45；因為參與者沒有鏡頭，Phone Reveal 這類題目一律寫成「唸出來／描述」而非「秀給大家看」；taboo **300** 張 Say It Without Saying It 卡片（`{ level, emoji, word, forbidden: [4 個字] }`，`level` 為 `easy`／`medium`／`hard`，各 **100** 張。分級標準是**具體→抽象光譜**：easy 是看得到摸得到的日常實物（Apple、Table、Dog…），medium 是具體但要多想一下的場所／職業／活動／天氣現象（Restaurant、Doctor、Swimming、Storm…），hard 是純抽象的情緒或概念、完全指不出實體（Love、Freedom、Patience、Nostalgia…）。三個難度共 300 個字彼此不重複，字彙仍刻意簡單，四個禁字就是「最先想到用來解釋它的字」），字彙刻意都用日常簡單字，四個禁字就是「最先會想到用來解釋它的字」，例如 🍕 Pizza 禁 Cheese / Italy / Slice / Round）；kangaroo **30** 條 Kangaroo Court 的荒謬罪名（`{ emoji, charge }`，`charge` 是接在主持人畫面固定文案「⚖️ The defendant is charged with…」後面的動名詞片語，內容刻意貼近日常小事而非真的犯罪，例如「leaving a group chat on read for 72 hours, then posting a story in the meantime」）— 遊戲題目唯一資料來源 |
| `game-render.js` | 共用渲染函式（GAME_RENDER） |
| `qrcode.js` | QR code 產生函式庫（vendored，qrcode-generator 1.4.4，MIT）— 十一款主持人頁都用它選用性顯示玩家連結的 QR code |
| `SECURITY.md` | 安全檢查清單（不是程式碼）：這個專案沒有後端也沒有登入，所有防護都押在 Firebase Realtime Database 的 Rules 上。列出①驗證資料庫沒對外開放的兩條測試網址與正確的 Rules 內容、②確認 Firebase 是 Spark 免費方案、③`main` 的 branch protection（選配），以及一份「看起來可疑但其實不用處理」的清單（repo public、`apiKey` 被 commit、`roster` 開放讀寫、token 出現在網址列） |

**廢棄資料夾：** `_archive/`（comic, describe, emoji-quiz, finish, fortunately, icebreaker, never, persuade, plot-twist, story-chain, truths）— 請勿讀取。

---

## 技術方向

### 展示方式
- 主持人透過「桌面分享」讓參與者看到遊戲畫面
- 參與者透過語音回應，不需要自己操作畫面
- UI 需清楚易讀（大字體、高對比，方便螢幕分享時辨識）

### 建議技術棧
- 前端展示頁面（HTML / CSS / JavaScript 或 React）
- 不需要後端登入系統，盡量保持輕量
- 可考慮即時互動功能（如投票、計時器）

---

## 遊戲類型參考

以下為適合此場景的破冰遊戲方向：

| 遊戲類型 | 說明 |
|----------|------|
| **Two Truths and a Lie** | 每人說兩個真話、一個謊言，其他人猜哪個是謊言 |
| **Would You Rather** | 主持人出題，參與者語音選擇並說明理由 |
| **Random Question Generator** | 隨機產生輕鬆有趣的英文問題帶動話題 |
| **Word Association** | 接龍式文字聯想遊戲 |
| **Trivia / Quiz** | 英文知識問答，搭配計分板 |
| **Poll / Vote** | 即時投票，主持人畫面顯示結果 |
| **Bingo** | 賓果卡，依語音描述劃記 |

---

## UI / UX 要求

- 字體夠大，螢幕分享時清晰可見
- 高對比配色（深色背景 + 亮色文字，或反之）
- 操作簡單，主持人一個人能流暢控制
- 響應式設計（主持人桌機使用為主）

---

## 開發優先順序

1. 先建立**遊戲選單 / 主頁**，可切換不同遊戲
2. 完成至少 2–3 個核心遊戲的 MVP
3. 優化視覺設計，確保螢幕分享效果良好

---

## 注意事項

- 所有遊戲說明、介面文字以**英文**呈現
- 程式碼與技術討論可使用中文
- 保持模組化，方便日後新增更多遊戲

---

## Git 規則

- 所有變更直接 commit 並 push 到 `main` branch
- 不使用 feature branch
