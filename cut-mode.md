# CUT! · DON’T FINISH THAT — 持續接話與自訂時間（2026-10-09）

英文副標題為「DON’T FINISH THAT」。CUT 提示保留「STOP! Hand over the unfinished thought.」，下一位提示為「Continue the unfinished sentence. Press Start when ready.」。入口 `cut.html`，沿用 ICEBREAK HUB 原房間、姓名與玩家卡，支援 2–9 人。介面預設英文、可切換繁體中文；題目固定使用簡單英文，所有對話仍透過原語音聊天室進行。

## 🎃 萬聖節版 Halloween edition（2026-10-31）

本次依使用者回饋，把不自然的驚嚇音改成錄音素材，並新增獨立的「故事開頭」選項供比較。驗收與發布狀態見 [本次驗收紀錄](docs/cut-halloween-2026-10-31-acceptance.md)。

- **版本與外觀**：`edition: classic | halloween`，舊存檔缺欄位仍視為 classic；兩種玩法都能選萬聖節版，`cut.html?edition=halloween` 可預選。沿用紫黑／南瓜橘介面、Creepster 自架字型（SIL OFL）、月亮／蝙蝠／蜘蛛網。接話、插話、手動 Start、計時與公平抽選規則不因題目風格或音效改變。
- **兩個獨立題目風格**：`topicStyle: situations | story_openings`。原情境 70 題完整保留（模式 1 `take` 40＋模式 2 `jump` 30），新增故事開頭 70 題（`storyOpenings.take` 40＋`storyOpenings.jump` 30），共 140 個不同 ID。權威來源都是 `cut-halloween-topics.js`；新 ID 為 `cut-hw-story-01…40`／`jump-hw-story-01…30`。故事從已發生的怪事接下去，模式 1另有未完半句；簡單英文、萬聖節氛圍、不血腥。兩風格不混抽，也不混入經典題庫；頁尾 Browse topics 可分開瀏覽、搜尋，不換當前題目。
- **權威狀態與相容性**：未指定風格的舊房間仍用 situations，讀取不重抽題、不重設 deadline／已用時間。設定中改萬聖節風格走既有 `switchMode`，新題停在 ready 等手動 Start；同風格儲存及取消保留當前題與已用時間。模式切換、下一題與 Restart 保留風格；一般 Restart 沿用既有清除本局歷史的規則。`topicHistory`／`jumpTopicHistory` 仍由原房間權威保存，改風格不另清空。投影公開 `topicStyle`／`topicStyles`，不公開抽題歷史及隱藏時限；舊服務未提供 `topicStyles` 時，卡片不顯示新選項。
- **主持音效台**：`CUT_HALLOWEEN_AUDIO.Board` 的八種音效（尖叫、邪惡笑聲、鬼魂、狼嚎、開門、雷聲、心跳、鐘聲）改由自架 MP3 解碼播放；背景可選窗邊風聲／雨聲，各 18 秒循環。舊音樂盒／躡手躡腳合成旋律仍是另外兩個可選背景。`cut-15` 起，主持人設定背景、背景／音效音量、每次 CUT 的指定／隨機音效，也能手動播放給全桌；主持與玩家各自的裝置跟隨房間設定，不需分享電腦音訊。每次 CUT 的同一音效由權威狀態封存，隨機時避免連續相同，關閉驚嚇時改用短錄音鐘聲；不疊加第二次 reveal 音。GO／時間到用輕鐘聲，準備 tick 用短心跳。`cut-halloween-sound.v1` 只保留 Board 的本機偏好相容性，遊戲中的控制以房間 `audio` 為準。
- **載入與生命週期**：初始安靜畫面不建 AudioContext、不下載錄音；使用者操作啟用後才讀 `assets/cut-halloween/audio-v1/manifest.json?v=1`，八種效果各下載／解碼一次，背景首次選取才載入。失敗顯示可重試狀態，不用合成假尖叫替代，遊戲仍可操作。背景有淡入淡出與循環交疊，切換／停止會取消未完成的舊播放；音效最多三個同時播放。頁面隱藏、斷線及離開卡片清理音效；靜音／關閉後完成的舊 unlock 不得重新播聲、繪製狀態或復活。
- **玩家卡**：每台裝置須自己按開啟聲音，才延遲載入音效模組與錄音；可隨時只靜音自己的裝置。`cut-15` 起，共用執行服務與舊主持租約模式的原玩家卡都能跟隨背景音樂、手動音效及音量，卡片不提供主持音效台。Halloween 的 `CUT_UI.Sound` 委派同一 Board；經典提示聲保留原聲音並套用房間音效音量。初次恢復／重連不補播舊 CUT 或手動音效。卡片擁有的 Board 隨卡片銷毀；主持頁借用的 Board 由主持頁管理，Sound.close 不代為關閉它。
- **素材、授權與容量**：全部十個音檔 CC0，精確來源、原始檔／輸出 SHA256、處理與量測以 `assets/cut-halloween/audio-v1/manifest.json` 為準，附 `LICENSES.md`。尖叫／笑聲為人聲，鬼魂為處理後呼吸；NaturesTemper 狼嚎是人聲模仿，非野生動物實錄；心跳來源未說明真實心臟或擬音，不宣稱生物錄音。檔案為 mono／44.1 kHz／64 kbps，MP3 共 **523,917 bytes**，加 manifest 與授權檔共 **547,229 bytes**。原始檔、ZIP、FFmpeg、QA 截圖均留在 repo 外。這是本機實際新增素材量，非 Vercel Usage／保留儲存用量；未做主觀聆聽或實體手機驗證。
- **快取與雙端部署**：房間音訊使用 `cut-15`，媒體仍是原 pack v1；主持頁、首頁 launcher 與 `play.html` 保持一致。引擎／投影變更須部署前端和獨立執行服務；服務只需保存及發布音訊設定／事件，不解碼或串流錄音。正式驗證只用全新、帶標記的測試節點，依標記、session 與 ETag 檢查後清除，不操作既有玩家房間。
- **前次發布紀錄**：`cut-14` 已以提交 `8a1d48a` 發布，正式靜態資源 38/38 與 Git 位元組相符；獨立服務 `dpl_D971DLjZp7xx9uGab3shVwVVAqFo` 的 Halloween smoke 58 項、清理 4/4 節點通過。此為原錄音／故事風格的發布證據；房間音訊另依下節與 [本次音訊驗收紀錄](docs/cut-room-audio-2026-10-31-acceptance.md) 驗證。

## 房間音樂與音效同步（cut-15，2026-10-31）

顯示第一題後，主持人可從音效台選擇四個背景、停止背景、手動播放八種音效，分別調整背景／音效音量，並指定每次 CUT 播哪個音效或使用不連續重複的隨機選擇。音量拖曳會合併更新；主持頁本機未完成下載或未獲播放許可，不阻擋發布設定。玩家先在原卡按一次開啟聲音，之後從自己的裝置播放，也可獨立靜音；主持人的本機靜音同樣不影響其他玩家。

單一權威 `state.audio` 保存 `version`／`revision`、`music`／`musicStartedAt`、`musicVolume`／`effectsVolume`、`autoScare`／`cutEffect`，及最後一個手動 `event: {id, at, key}`。`audioSettings`、`audioEffect` 由驗證為主持人的 actor 0 操作；玩家即使有其他共用操作權，也不能更改全桌音訊。`audioSeen`／`audioReplies` 獨立處理重送及回覆，原玩家投影只帶安全的音訊設定、自己的音訊回覆與 `canControlAudio`，不洩漏控制 token 或隱藏發言截止時間。

音訊指令不改遊戲 `turnId`、題目、抽人公平紀錄、已用時間或既有截止時間；等待中的玩家遊戲指令也不會被音量調整蓋掉。伺服器原本到期的 pulse 仍自然推進遊戲。新 CUT 才封存同一個 `audioKey`，之後修改選擇不重播當次 CUT。下一題、設定、模式切換與重開沿用既有玩法及音訊選擇；新 session 重新建立播放時間基準、清除舊手動音效。

各裝置使用伺服器時間與 `musicStartedAt` 接續目前背景，背景切換／停止只有一個時間基準。重連、初次加入、解除靜音或回到前景時恢復當前背景，不補播過去的手動音效或 CUT。舊事件及重複事件會被消耗，未完成的舊下載也不能讓已停止的背景復活。網路、解碼與裝置音訊延遲仍可能造成短暫差距，這不是取樣級同步播放。

這次沿用現有十個 MP3、manifest 與授權文件，**沒有新增媒體檔案**；原媒體包仍為 547,229 bytes。後端只增加規則／狀態程式，不把 MP3 加入函式包。未使用麥克風、錄音、語音 API 或新的外部音訊服務。

## 模式 2 · 插話 Jump In（2026-10-11）

`cut.html` 設定畫面最上方有兩張模式卡。**模式 1 · 接話 Take Over** 就是原本的玩法，規則、題庫、文案與預設值都沒有改，仍是預設模式；**模式 2 · 插話 Jump In** 是新增的實驗玩法，兩者並存供試玩比較。沒有 `mode` 欄位的舊房間一律是模式 1。

### 玩法

1. 每一輪選出一位**主講人**，顯示一個模式 2 專用話題。任何人按 Start talking，三秒準備後 GO。
2. 主講人自然地聊。主講時間 Quick 3／Normal 4（預設）／Long 5 分鐘，**只計算主講人自己說話的時間**，所以 4 分鐘的一輪實際約 5–7 分鐘。
3. 偶爾 CUT！畫面公布一位插話者（JUMP IN!）。可以接完那句話、加細節、吐槽、提問、只說一個詞，系統不判斷內容。**插話沒有任何計時或倒數**。
4. 插話者按 DONE（說完了）或 SKIP（跳過，沒有懲罰）。畫面顯示 BACK TO 主講人／KEEP GOING! 約 2.5 秒，之後主講時間才繼續。主講人可以接受、反駁或不理會。
5. **加時**：這一輪進行中，主持人或任何有效玩家都可以按「＋1 分鐘」，每按一次主講時間加 1 分鐘（一輪最多加 10 分鐘），不會移動或洩漏已排定的 CUT。
6. **時間到不會自動切掉**：主講時間用完時畫面停在 TIME’S UP!（`timeup` 階段，沒有截止時間、時鐘凍結），要有人按「＋1 分鐘」繼續，或在大家口頭同意後按 End topic 並確認，才進入休息。Next topic 換下一位主講人與新話題。這仍是口頭共識提醒，不是線上投票。

### 狀態

`ready → Begin → countdown → speaking ⇄（CUT → interrupt → DONE／SKIP → back）→ … → timeup →（＋1 分鐘 → back → speaking）或（End topic → break）→ Next topic → ready`

- `speaker` 整輪都是主講人；`interrupter` 只在 `interrupt` 階段有值。模式 2 不使用 `cut`／`handoff` 階段與 `nextSpeaker`。
- `interrupt` 沒有 `deadline` 也沒有 `phaseUntil`，只等 DONE／SKIP，閒置 tick 不寫入。
- `back` 是公開的短過場（`phaseUntil`），到期才回 `speaking` 並重新抽下一次 CUT。
- `mainClock`（`durationMs`／`elapsedMs`／`runningSince`）只在 `speaking` 走；`interrupt`、`back`、Pause、設定、休息與結束都凍結。模式 1 的 `topicClock` 在模式 2 不動。
- 私有資料：`deadline`（下一次 CUT 或本輪結束）、`lastStretch`、抽到的間隔、`mainStats`、`interruptStats`／`interruptRecent`／`interruptSequence`、`jumpTopicHistory`。公開投影只多 `mode`、`mainMinutes`、`mainOptions`，模式 2 另有 `mainClock`、`interrupter`、`roundEnd`、`canFinish`。

### CUT 間隔

全部以**主講人說話時間**計算，在每次進入 `speaking` 時由權威端抽一次：

- 第一次 CUT 落在 25–45 秒，開場不會被打斷。
- 之後每次間隔 30–55 秒，三個加權區間（30–38／38–47／47–55 秒，權重 30／40／30）內均勻抽，並降低連續兩次極短或極長的機率。
- 若 CUT 之後主講人只剩不到 12 秒，就不再 CUT，讓主講人講完。
- 4 分鐘一輪約 4–6 次（模擬 400 輪平均 5.0 次），3 分鐘約 3–4 次，5 分鐘約 6–7 次。

### 公平抽選

- 主講人：每個人都當過一輪才會有人當第二輪，同一循環內順序隨機，不會連續兩輪同一人；只有 GO 之後才算當過。
- 插話者：沿用模式 1 的加權抽選（次數落差、等待輪數、近期出現折扣），但用自己的紀錄，永不抽到主講人。被抽到就計一次，SKIP 也算，所以不會一直點同一個人。偶爾連續同一人是允許的。
- 中途加入或休息後回來的人，次數會補到目前在場者的最低值，不會被連續點名「補回來」。

### DONE／SKIP、暫停與離席

- DONE 與 SKIP 對規則是同一步：回到主講人，不計分、不判斷。主持頁與被點到的玩家自己的卡片可以按；共用執行服務模式下，其他有效玩家的卡片有一顆較小的「交回主講人」，避免插話者離線時卡住。多人同時按只生效一次（turnId 與重送防護）。
- Pause 凍結主講時間。暫停在說話中時，恢復後先走 BACK TO 過場，並保留原本那一次 CUT 的剩餘時間（至少 8 秒），不重抽。暫停在插話中時，恢復後仍是同一位插話者、仍然沒有計時。
- Back to settings 凍結這一輪，保留話題、主講人與已用時間，正在進行的插話直接取消。改主講時間會保留已用時間；在設定中**切換模式會開始一個新話題**，舊模式的截止時間、插話與暫停狀態全部清除。
- 主講人在 GO 之前離席，改由別人當主講人並重新計時；GO 之後離席，這一輪直接結束。插話者離席時換一位，CUT 動畫與音效不重播。有效玩家少於兩位時暫停。
- End game、Restart 與既有規則相同；Restart 保留模式與主講時間，清空兩份公平紀錄。

### 題庫

`cut-jump-topics.js` 是模式 2 專用的 80 題，與 `cut-topics.js` 完全分開、不會混抽：真實故事 20、關於你 15、你的看法 15、如果… 16、這群人 14。每題都要能講幾分鐘，沒有開場半句。混合權重 28／18／18／20／16，同類型連續出現的機率降低，最近 40 題不重複。頁尾 Browse topics 多了模式篩選，可以瀏覽兩個題庫。

### 最容易調整的數值

全部在 `cut-config.js` 的 `jump`：`mainMinutes`（選項與預設）、`firstCut`、`cutInterval`（範圍與區間權重）、`antiRepeat`、`quietEndSeconds`、`resumeQuietSeconds`、`backMs`、`extendMinutes`、`maxExtraMinutes`、`topicWeights`、`repeatedCategoryWeight`、`topicHistorySize`。主持頁與玩家卡的主講時間選單都由 `mainMinutes.options` 產生。

### 同步與部署

CUT 時機、插話者、主講時間、DONE／SKIP 與換輪全部由同一個權威端（主持瀏覽器租約，或獨立執行服務）決定，瀏覽器只依公開的 `mainClock` 在本機畫倒數，沒有新增任何計時器或每秒寫入。`cut-sync.js` 與 `runtime/hub-executor-core.cjs` 只多認得 `back` 這個計時階段。CUT 資源版本為 `cut-11`，新增 `cut-jump-topics.js`（主持頁與 `hub-launcher.js` 都要在 `cut-engine.js` 之前載入）。**這是規則與題庫變更，前端與獨立執行服務必須一起發布**；只發布前端時，服務模式的房間會把模式 2 當成模式 1 執行。

### 驗證（2026-10-11）

`node --test tests/cut-jump.test.cjs`（19 項）涵蓋整輪計時、間隔分布、公平性、暫停與設定、離席、舊存檔相容、題庫、服務端 adapter、舊主持時鐘、玩家卡、音效與主持頁流程。`cut.html?demo=1` 已在瀏覽器實測兩種模式、桌機與 375px、中英文，無版面溢位與 console 錯誤。尚未做真人語音試玩，也尚未對正式服務做實機驗證。

## 原玩家卡完整操作（共用執行服務模式，2026-10-09）

服務已接手的房間，所有仍參與抽選的玩家均可在自己的原卡按下一題、暫停／繼續，以及在大家口頭同意後結束話題；展開 Player controls 可調整設定、重新開始、結束或記錄玩家暫離。設定畫面直接放在原卡，包含 Custom 的最短／最長秒數；任一有效玩家都能儲存或返回話題，因此開啟設定的人離線不會留下無法解除的等候。未啟用服務時，原本的主持控制與玩家 Begin 權限維持不變。

End game 會保留結束畫面及 Restart，卡片不會消失。停止後可先讓休息中的玩家重新加入；名單變更不會自行開始遊戲。Restart 保留同一個封印房間 session、目前設定（含自訂秒數）和參與名單，清空本局題目／發言公平紀錄，回到 ready 等待手動 Begin；turnId 單調增加，已處理指令的去重紀錄保留，舊倒數及重複／競爭的舊畫面指令不能再次重開或影響新局。至少兩位參與抽選才可重開。

上述操作只改公開規則與玩家能力，投影仍不包含隱藏 CUT 截止時間、已抽出的發言時長、未公布的下一位或主持控制 token。此段只描述服務已接手後的玩家操作；首頁初始化入口另由共用啟動器處理。

## 使用方式

1. 在首頁設定房間、姓名，讓大家打開原本的玩家連結。
2. 選 CUT!，設定節奏與題目類型，再按 Show topic 顯示話題。
3. 話題與第一位發言者先停在畫面上；主持人或任一有效玩家按 Start talking 才開始三秒準備。看到 GO 再開口，發言期間不顯示倒數或進度條。
4. CUT! 出現就停下，此時才公布下一位。CUT 與姓名一直顯示，等下一位想好後按 Start，立即接話；沒有接棒倒數。
5. 下一位假裝自己就是上一個人，接著他的半句說。同一話題不限 CUT 次數，大家可一直接下去。
6. 大家口頭同意結束這一題後，按 End topic 並確認。畫面停在休息；按 Next topic 才顯示新話題，等大家再次按 Start talking。

End topic 的確認提示是口頭共識提醒，不是線上投票或自動判斷同意。原主持模式由主持頁控制結束；獨立執行服務模式中的有效玩家也能操作。未結束的話題不提供 Next topic。

## 題庫與瀏覽（2026-10-09）

題庫共 100 題，原本 36 題生活情境與 24 題荒謬想像的順序、ID、分類、題目及開場句全部保留。另新增 20 題個人經驗與 20 題想法與喜好，以簡單英文、第一人稱的未完句開場，讓下一位可以沿用同一說話者把故事接往其他方向。例如 `Tell us about a small skill you tried to learn.` 配 `I decided to learn…`，以及 `What could make waiting in a line more fun?` 配 `My first idea is to…`。

預設 All topics 混合四類，分類抽選權重為生活 36%、荒謬 24%、個人 20%、想法 20%；仍避免重複最近 16 題。主持頁與共用玩家卡設定均可選擇各類，調整分類從下一題生效，不更換目前故事。

`cut.html` 最底部的 Browse topics／查看題庫預設收起，展開後可依分類與英文題目／開場句搜尋，列表可捲動。瀏覽不操作房間、不換題也不開始計時。CUT 專用資源版本為 `cut-9`，首頁初始化器、主持頁及原玩家卡一致；獨立執行服務也必須部署新版題庫與抽題規則。

## 話題談話計時器（2026-10-10）

每個話題預設 10 分鐘，主持或共用玩家卡設定可改為 1–60 整分鐘。這是全桌同一話題的可見時間，與每位玩家何時 CUT 的隱藏時間分開。顯示 MM:SS；第一次 GO 才開始，剛顯示話題與最初準備倒數不扣時間。CUT 等下一位想好接話時持續計時。

Pause、Back to settings、End topic、End game 均凍結話題時間。返回話題後仍需手動開始；CUT 暫停後恢復則接續等候與計时。設定修改分鐘數保留已談的時間，下一題與 Restart 才重設為目前設定的完整時間。重載或由其他玩家接手不重設時鐘。

時間到只顯示提醒，仍可接話；只有大家口頭同意後按 End topic 才結束話題，Next topic 才換題。沒有自動換題、強制結束或新增投票。話題時間的公開資料是 `topicMinutes` 與 `topicClock` 的 `durationMs`／`elapsedMs`／`runningSince`；原單人發言截止時間與公平抽人資料仍保持私有。畫面本機更新倒數，不為每一秒新增房間寫入。

舊話題沒有時鐘時，使用新的 10 分鐘開始計時，不猜已談多久、不改故事或公平紀錄；已在 speaking／cut 的房間從升級當下起計，其他階段等候開始。CUT 資源版本為 `cut-10`，需同步發布前端與獨立執行服務。

## 節奏與手動時間

| 節奏 | 每次發言的時間範圍 |
| --- | --- |
| Normal | 15–25 秒 |
| Chill | 25–40 秒 |
| Chaos | 8–16 秒 |
| Custom | 自訂最短／最長，各 5–120 整秒 |

Custom 最短不得大於最長；兩個數字相同就使用固定時間，例如 30／30 為每人 30 秒。範圍模式會每次重新抽時間，抽到的截止時間保留於權威狀態，玩家看不到發言倒數或當次抽出的時間。預設節奏沿用加權區間及避免连续極端時間的機制；自訂範圍採均勻抽選。

任何階段都可 Back to settings，立即凍結計時。儲存或取消後回到同一話題等候手動開始，保留名單、公平抽人紀錄與已公布的下一位。自訂數字會回填，重新開始與下一題保留設定；題目類型從下一題生效。少於兩位有效玩家時暫停，補回後手動恢復。

## 狀態與相容性

`ready → Begin → countdown → speaking → cut（等候） → Begin → speaking …`

`End topic → break → Next topic → ready`

- `ready` 沒有截止時間；只有手動 Begin 才開始。
- `setup` 無計時且禁止 Begin；Configure／Cancel 回 ready。
- `speaking` 每次 GO 才抽隱藏時間。
- `cut` 永遠等待手動接話，不再以 4–8 次 CUT 自動結束。
- `handoff` 只用於恢復暫停中的原發言者，保留三秒準備與剩餘時間。
- `break` 只由 End topic 進入；不計分、不整理故事，Next topic 才換題。
- `paused` 凍結時間；`stopped` 結束遊戲，可重新開始或返回設定。

新規則 `rulesVersion: 2`、`targetCuts: null`。舊正在進行的題目升級後取消 CUT 次數上限，保留話題、名單與公平紀錄；舊最後 CUT 改為等候接話。已在 break 的舊題目保留休息，仍需手動下一題。升級不重新抽題或重計發言次數。

公平抽人仍排除當前發言者，依發言次數、等待棒數與近期出現折扣抽選；只有 GO 才增加次數。多人同時按 Start、End topic 或 Next topic 時，由 session／turn 與重送防護確保只生效一次。

## 同步與維護

沿用 `rooms/{CODE}/players/{token}` 原卡投影，不公布其他玩家 token。純規則在 `cut-engine.js`，參數與抽選在 `cut-config.js`／`cut-random.js`；`cut-ui.js` 共用主持與玩家畫面，`cut-host.js` 負責設定及確認。

獨立執行服務沿用 `runtime/party-executor.cjs`，只在已有的 HUB_EXECUTOR_SECRET 設定就緒時啟用；保留原持票者驗證、原子更新、sharedControls 與私人計時。舊模式由持有租約的主持瀏覽器執行，主持頁需保持開啟。詳見 `hub-executor-mode.md`，本次不變更任何秘密設定。

玩家離席時替換已公布的下一位，仍停在同一題等待手動開始。重連只推進一個到期階段，不連續補播 CUT；過期操作、換房、換遊戲與失去控制權不能覆寫新版投影。原玩家卡在共用執行服務與舊主持租約模式都有本機聲音開關，預設靜音，點擊後才啟用；音訊不影響視覺或權威計時，背景、斷線與初次恢復不補播舊事件。兩種執行方式都可跟隨房間背景及音效，離開卡片會關閉本機音訊。CUT 不會切斷麥克風。`?demo=1` 是不寫入 Firebase 的單機操作示範。

## 驗證方式

- `node --test tests/cut-*.test.cjs tests/party-executor.test.cjs tests/hub-executor*.test.cjs`：規則、持續接話、自訂時間、舊狀態升級、多人競爭、共用 UI 與背景執行整合。
- `node scripts/cut-live-test.cjs`：僅用新建獨立 Firebase 測試節點，驗證原卡同步、九次後仍同題、固定時間、手動結束與換題，最後清除測試節點。
- 瀏覽器檢查自訂設定、同題接話、結束確認與取消、返回設定回填、中英介面。口頭共識與接話內容需由真人決定。
## 本次驗證結果（2026-10-09）

完整專案測試 1092／1092 通過；獨立 Firebase 測試房間 21 項檢查通過並完成測試節點清除。包含超過原本 CUT 上限後持續同題、自訂固定時間、重新連線、手動結束／換題，以及既有其他遊戲回歸。主持操作與玩家控制的確認／取消由 UI 自動測試覆蓋；此次桌面瀏覽器檢視工具未能啟動，未聲稱已完成新的畫面截圖或真人語音驗收。
## 題庫更新驗證（2026-10-09）

整合最新正式站主持操作後，完整專案測試 1185／1185 通過。涵蓋原 60 題逐項完全相等、新增題庫唯一性、四類混合抽選與近期避免重複、調整分類保留正在接的故事、題庫搜尋／分類／空結果／文字轉義，以及共享玩家卡設定操作。桌面瀏覽器工具此次仍未能啟動，未聲稱新增畫面截圖或真人接話驗收。
## 話題計時器驗證（2026-10-10）

整合最新 Dixit 畫面後，完整專案測試 1359／1359 通過。包含計時到零後繼續同題、手動接話、暫停／設定保留累計、延長分鐘數、下一題與重開重設、原玩家卡與主持頁控制、舊房間升級及私有發言時間保護。話題計時引擎 16 項專門測試、共用 UI／表單與舊操作回歸均通過。桌面瀏覽器連線工具此次無法啟動，UI 驗證使用 DOM 自動測試，未聲稱新增截圖或真人語音驗收。


## Mode 2 manual interruption timing (2026-10-11)

The host setup and shared player settings include two min/max pairs:
- First interruption after: default 25-45 seconds.
- Time between interruptions: default 30-55 seconds.

Each accepts 5-300 whole seconds; equal values give fixed timing. The first
pair counts main speaking time before the first CUT. Subsequent intervals
start when the main speaker resumes after DONE/SKIP and the return beat.
No interruption speaking timer is added. Default weighted pacing and quiet
ending behavior stay intact. Same-mode saves keep topic, main speaker and
used mainClock. Restart/new topic/mode changes preserve manual settings.
Existing Mode 2 rooms receive default settings without resetting their clock
or changing an already scheduled CUT. Actual sampled delays remain private.
CUT assets use cut-12; deploy the matching independent service too.

Production service smoke passed 22 checks (first/repeat intervals, validation,
shared settings, same topic and clock retention, restart) and cleaned all four
fresh marked nodes. Unrelated discovery API tests: 39/39.
