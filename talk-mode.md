# Current: stable challenge selection and focused timed rounds — 2026-10-10

Both Talk modes have a round clock, default 15 minutes (configurable from 1 to
60 minutes). Preparation is separate: the round clock begins when conversation
starts. The shared screen and authenticated shared-control player cards can
add one minute while a round is running, or finish early. At the deadline the
round enters `ended`, pending missions are cancelled, queued cards are cleared,
and a rest screen shows final Crazy Talk scores. Late commands cannot add time,
earn points or resume that round. Opening a new topic starts a fresh preparation
period, resets scores and preserves the chosen duration settings.

Crazy Talk uses one shared random countdown until the next participant gets a
mission, rather than separate timers for every player. The default range is
60–180 seconds; whole-second bounds may be 5–300, with minimum no greater than
maximum. One card is assigned per operation, and at most two players have pending
missions. Known absent players are excluded when authoritative presence is available;
fixed-target cards wait for their recipient to return. The next scheduled slot waits
while both slots are occupied. Skipping or reaching a mission deadline immediately passes a replacement to a different
eligible player. A completed mission awards its recipient exactly one point;
skips, expiry and cancellation award zero. Completion keeps the existing shared
schedule. Every mission expires after 2.5 minutes by default (configurable from
30 to 300 seconds). Pause stops new deliveries while mission and round clocks
continue; replacements wait until delivery resumes.

Sources remain system, players or mixed (default). The system bank has 136 short
English cards: 70 lines and 66 improv tasks, at most 9 words and 48 characters.
The latest 40 cards follow the supplied chicken sounds, cup romance, silly songs
and body-part jokes; the original 96 IDs and text remain unchanged.
A player can queue a handwritten line/task during preparation or conversation,
including while delivery is paused. Submissions accept 1–120 trimmed characters,
with at most 10 per author and 20 per room. The default recipient is a random
other player; an explicit other player is optional. Cards remain queued until a
scheduled delivery or skip/expiry replacement. Eligible player cards take
priority; player-only mode never falls back to the system. Submission itself
never reveals a card immediately. An occupied player is not overwritten.

Private projections show only the recipient's mission and its deadline, and
only the author's queued count. Shared projections expose active participant
numbers, aggregate counts, scores and the shared next-assignment deadline,
without another player's mission or queue text. Scores, deadlines, expiry and
replacement selection are authoritative and deterministic across transaction
retries. Repeated completion commands cannot score twice. Old saved rooms
receive a fresh round clock and safe mission deadlines during migration; their
private cards remain, with excess old pending cards cancelled to enforce two
slots. Legacy timing converts to the previous 80–120% range. `crazyTick` remains
a clock alias; legacy `crazySend` only redraws a future shared timer.

Player cards retain the navy/cream topic layout and private pink mission card,
with round and mission countdowns, active mission indicators and points.
Speaking/question request buttons are removed. Chinese IME composition and
unsent local drafts survive ordinary synchronization. The handwritten challenge
composer and its ancestors stay connected during same-session updates, so an
open recipient selector is not interrupted by another player or clock update.
While a native recipient/type picker is being used, structural updates above
it wait until selection or focusout; timers and connectivity controls continue.
While a submitted card waits for confirmation, players can edit the recipient,
kind and next draft; only sending another request waits. Retry uses the original
submitted payload. A successful confirmation clears text only if text, recipient and kind still
match that submission, preserving a newly prepared draft. Acknowledged request
IDs cannot be recovered as pending by a delayed mailbox projection. Both host and player
settings use minutes and reject fractional seconds. The homepage saves game,
conversation and duration preferences in `lets-talk-settings.v2`; explicit home
edits apply to the next setup while returning to an active round preserves it.
Assigned, random and free conversation modes are unchanged.

The library remains 96 shared situations and 672 distinct main/follow-up
questions across 13 categories, with all stable IDs and source traces retained.
Questions invite group proposals, shared choices and responses to others rather
than personal interviews. Main questions and explanations are at most 26 words.
Existing active topics stay saved until an explicit new topic is opened.

Runtime changes require publishing both the independent service and frontend.
No audio API or automatic speech judgement is used; players mark their own
mission complete. Only authenticated recipients can acknowledge their prompt.

Previous timed-round release verification: all 1325 project tests passed. Real Chrome verified
homepage defaults of 15 minutes per round and 2.5 minutes per mission,
the shared scheduler, queued custom priority and random non-author recipient, completion +1, immediate skip/expiry replacement,
two-slot cap, add-time, normal/Crazy automatic rest screens and 375px/320px layouts
without overflow or page errors. Independent review reproduced and verified fixes
for Firebase-empty waiting state and known-absent recipients.

Production frontend assets matched Talk 17/17 and full-site 45/45; API readiness,
CORS, invalid-ticket rejection and private-runtime 404 checks passed. Real Chrome
on production repeated all gameplay and layout checks without page errors.
The independent service and frontend are published. Live RPC smoke passed
82 checks, including actual automatic round expiry and mission TTL, shared
slots, queue priority, skip replacement, duplicate-safe scores and add-time.
All eight exact owned fixture nodes were cleaned with zero cleanup failures.
The final content release is dbc027e; no existing user-room data was accessed.

The earlier descriptions below document historical versions.

> Independent execution (2026-10-09): the optional, configured room service lets remaining players continue with the original private-card links after the host closes the page. See [service activation and recovery](hub-executor-mode.md). Without the deployment secret, the legacy browser-host requirements below still apply.

# Let's Talk v0.7 · Normal Talk / Crazy Talk

## v0.7 玩家卡片共同操作（2026-10-09）

- 獨立服務啟用後，每個有效玩家都能在原卡片的「話題與設定」內選題、搜尋／分類、隨機預覽、改寫或自訂主題；可選 think/write、15–120 整數秒、Normal/Crazy 及每人 1／2／3 分鐘。此設定用於新話題，先本機預覽，按開啟並確認才同步；會重新思考並清空目前分享、待問、已送出想法與搞笑台詞。
- canonical `newTopic` 接受 `{topic,mode,seconds,gameMode,crazySeconds,showStarters,confirm:true}`，驗證身份、原 session 與 turn；服務 epoch／ticket 隨新 session 原子旋轉，原連結保持不變。有效玩家共享管理不等於讀取別人的台詞；view 0 仍沒有私人 prompt 或玩家控制。
- 卡片也可立即切換題目說明、選擇實際延伸問句、發佈自訂延伸；這些動作保留目前話題、分享者、輪次及台詞。未送出的設定與延伸草稿保留於本機卡片，普通同步重繪不清除、不自動發佈。
- 有待問請求時按結束分享，先顯示明確確認：保留並讓對方問，或確認略過後交棒。進行中的口頭提問必須先返回分享者；不能藉強制結束跳過。換 turn/session 取消過期的確認。
- legacy 房間維持原權限與主持頁流程；只有 sharedControls 的卡片顯示此管理面板。首次建立 canonical 並完成 service registration 仍由 Hub／開局入口負責，玩家卡片可接續日常操作與換題。

## v0.6 情境題與 Crazy Talk（2026-10-08）

- 保留原有 48 組日常議題及其 ID、說明、延伸，另加入目前 Chat Wolf 全部
  48 組公開話題，各有 8 個延伸。總共 96 組話題、13 分類、672 個問題。
  首次預覽優先從新話題抽選；之後抽题仍尊重當前搜尋與分類。
- 新資料是獨立的公開文字，帶 `source: 'chatwolf'` 與 `sourceTopicId` 供追溯；
  Let's Talk 不載入狼人角色、秘密任務或任何狼隊資料。個人經驗題也可以想像回答。
- 開題前選 **Normal Talk**（預設）或 **Crazy Talk**，不取代原有 think/write
  開局選項。正常模式保持分享、追問、接話與延伸的原流程，不派發搞笑指令。
- Crazy Talk 內建 `talk-crazy.js` 的 60 句簡短英文荒謬台詞，不呼叫模型／語音
  辨識、不內建耳機或音訊。只模擬綜藝節目的「私人耳機指令」效果。
- 主持可選約每人 1／2／3 分鐘，預設 2 分鐘。開始分享後，首句在 30–90 秒內
  隨機錯開送出。完成或略過後，下一句等待設定間隔的 80–120%；時間與選句保存
  在權威狀態，不由玩家自己倒數派送。不同人可以在不同時間收到不同句子。
- 玩家最上方直接顯示自己的台詞與 **Said it! / Skip this line**。只在輪到自己
  或受邀提問時說出來，表演方式自由，略過不受罰。完成是玩家自填，不是自動判定；
  不增加積分或勝負，不會消耗主要分享次數，也不會關閉口頭追問。
- 每人最多一段待說台詞；未完成不自動過期、不覆蓋。按完成／略過後收成小提示。
  新指令只會第一次收到時捲到卡片上方，不搶鍵盤焦點，不因同步重繪重複捲動。
- 主持可 **Send lines now / Pause new lines / Resume new lines**。立即派送只給
  沒有待說台詞的人；暫停不隱藏已有台詞，仍可完成／略過。恢復重新安排等待，
  不一次補派漏掉的指令。換延伸／換分享者不重抽；真正開新話題才清空舊指令。
- 共同主持畫面只顯示模式與待說數量，不顯示台詞。每個原 `play.html` 玩家節點
  只取得自己的指令，別人的台詞、派送時間、避重歷史與台詞池不進投影。
  沿用現有主持信任模式：主持浏览器持有完整狀態、必須保持開啟；不是防惡意主持
  的秘密隔離，也不是新增伺服器。靜態台詞池本身是公開素材。
- `crazyDone`／`crazySkip` 驗證目前 session 與自己的 pending `promptId`，不用
  `turnId` 鎖定，以免換人讓台詞按鈕失效；其餘原操作仍核對 turn。重送、防偽 actor、
  多主持租約、交易重試穩定隨機與換遊戲停止舊發布均沿用原架構。

新增維護檔案：`talk-crazy.js`、`tests/talk-crazy.test.cjs`、
`tests/talk-ui.test.cjs`、`scripts/talk-live-test.cjs`、
`scripts/talk-verify-release.cjs`。無新環境密鑰或付費 API。

### v0.6 驗證

- 全站順序回歸：原工作樹 919／919；保留並合併同期 Open Mic 更新後，
  最終工作樹 930／930，全數通過、沒有跳過。其餘遊戲不回退。
- `node --test tests/talk-*.test.cjs`：57 項涵蓋題庫、正常規則、排程、私人投影、
  暫停／重連、台詞確認、原玩家頁交易與小卡介面。
- `LETS_TALK_LIVE_TEST=1 node scripts/talk-live-test.cjs`：新建隔離三人測試房間，
  11 項實際 Firebase ETag／租約／私人節點檢查通過；只清理該次自己的 4 條私人路徑。
  排程使用注入的測試主持時鐘（不是實際等待每兩分鐘），其餘為真實遠端交易。
- 瀏覽器單機示範確認選模式、派送不同句子、完成／略過不交棒、暫停、八個延伸、
  換回正常模式及無錯誤。375／320px 玩家版面无水平溢出。
- 不宣稱不同實體裝置、不同瀏覽器引擎、真實語音活動笑果或背景手機續時已驗證。

以下 v0.1–v0.5 內容保留為原流程與歷史驗證；48 組／4 延伸的數量描述只指原題庫。

目的：讓第一次或前幾次見面的人，從日常話題聊彼此的想法與價值觀。
不要求精彩人生故事，不計分，不比較分享長度或反應數。

## 使用

1. 在首頁完成房間、人數、姓名及玩家連結設定，選擇 Let's Talk。
2. 共同畫面上方先隨機選好一題，可重新抽題、到頁尾瀏覽完整題庫，或「自己出題」。選開局方式與思考時間，按「開啟話題」。
3. 玩家用原本的私人連結操作；語音繼續使用同一個外部通訊軟體。
4. 思考時間結束後自動開始，也可由共同畫面提前按「開始分享」。
5. 玩家輪到自己時有金色「輪到你了！」提示，按「我說完了」交棒；主持人也可直接按「結束發言，下一位」。每人一次後，自動進入同題下一輪。

`lets-talk.html?demo=1` 可在一支手機切換四位示範參加者與共同畫面。
這是單機模擬，重新整理會重置，不會發牌、建立房間或寫入 Firebase。

## 暫定規則

- 開局有「先想一想，不用打字」和「可以寫一句想法」兩種；預設 45 秒，可選 30／60／90 秒。
- 「我有想法」記錄準備好；最早準備好的人優先，其餘準備好的人隨機。未表示的人排其後，「需要時間」排後面。所有人仍保有該輪一次主要分享。
- 寫字完全選填，只有按「分享這句想法」才會成為大家看得到的素材。上限 180 字，可在思考期間更新或清空；未送出草稿只留在該頁記憶體，重新整理不保留。
- 每輪隨機洗牌，每人恰有一次主要分享。同類優先級仍依洗牌順序；使用本地隨機演算法，沒有呼叫 AI 服務或分析語音。
- 「想聽更多」顯示姓名與意願約 6 秒，不累計、不排序、不切換發言者。
- 「我想追問」只表達口頭提問意願，沒有文字提問欄。分享者看到後可按「請你問」或「等我說完這段」。
- 開放一個追問後，提問者按「我問完了」或原分享者按「繼續分享」，回到原分享者；追問不消耗提問者的主要分享次數。主持人也可按「結束提問，回到分享者」，再視需要結束該人的發言；即使提問者或分享者關閉頁面，主持人仍可繼續流程。
- 「我也有想法」：本輪還沒分享的人排到剩餘名單前面；已分享的人只在下一輪取得優先。可以取消，不增加主要分享次數。
- 待處理追問存在時，交棒前提供選擇；不會悄悄清掉意願。正在提問時，須先回到原分享者再交棒。
- 「嗯嗯」、笑聲與短附和隨時可直接說，不必操作按鍵；分享可以很短，也能延續別人的話。
- 共同畫面的「延伸這個話題」展開選單，可選擇同題任一延伸問題，或依現場談話輸入新的問題。按「顯示這個問題」後同步到共同畫面與玩家卡，不重排、不重設輪次，也不打斷已開放的口頭追問。「收起延伸題」只隱藏問句。
- 「換個話題」開啟設定；「返回目前話題」可取消選題，新題真正開始才重置想法與輪次。
- 主持人的交棒與結束提問按鈕直接顯示在發言狀態下方，不再藏在摺疊說明。未處理追問仍會提醒並提供「直接結束，下一位」；分享者的舊回合請求不會在主持交棒後再跳過下一人。
- 主持畫面不顯示輪次數字或主持操作提示，直接呈現目前發言狀態與按鈕。共同畫面和玩家卡片的說明為「可以隨性自然地聊，卡片只是輔助。」（英文：Chat freely and naturally. The cards are just a guide.）。

## 題庫與手動出題

- 題庫包含 8 類、48 組話題，每組有 1 個主問題及 4 個延伸問題，共 240 個問題。分類為人際與信任、自我與成長、群體與界線、工作與金錢、公平與自由、科技與網路生活、日常倫理與選擇、社會與未來。12 個原話題的 id 與主問題保留，並擴寫延伸。
- 每組提供四題延伸，可以跳著選，不要求全部回答。題庫與預覽只顯示完整延伸問句，不顯示「先理解想法／換個角度／價值與取捨／回到生活」等方向標籤；進行中的延伸選單也以完整問題呈現。原始資料保留方向欄位。題目為原創、簡單英文，沒有借用商業卡牌內容；避免必須揭露私人經歷才能回答。
- 可依分類及中英文關鍵字搜尋；搜尋包含題目、延伸問題、分類與中文關鍵字。選題前可預覽整條討論路徑；「以這題修改」將內容帶入手動編輯器。
- 頁尾「完整問題庫」直接列出完整主問題；每組可展開四題延伸，按「選這題」回到上方預覽後再開啟。搜尋與分類同時篩選頁尾清單和手動選單，選單也顯示完整主問題。
- 首次載入上方隨機預選一題；「隨機抽一題」和「隨機選下一題」從符合目前分類／搜尋的題庫抽選，有其他題目時避開目前活動及預覽的題目。只有一題時仍可選取，零結果時停用抽題並顯示提示。抽題只改本機預覽，按「開啟話題」才同步；重連讀回現有活動，不會被隨機預覽覆蓋。
- 玩家自己的主要分享時，卡片以金色外框與大字「輪到你了！」／「Your turn!」提示；按鈕為「我說完了」／「I'm done」。開放追問時先顯示提問狀態，回到分享者才恢復提示；換人後移除。
- 「自己出題」只要求主問題（最多 500 字），話題名稱選填（80 字），延伸問題選填、每行一題（最多 8 題、每題 300 字）；輸入依原文呈現，允許中英文。空白或超出限制不會開始新題。
- 自訂草稿儲存在此瀏覽器的 `lets-talk-topic-draft.v1`，不會因切換題庫或重新整理遺失；按「開啟話題」才寫入房間。localStorage 不可用時顯示未保存提示。
- 進行中可另外輸入 300 字以內的臨場延伸問題，由主持人明確按「顯示自訂延伸問題」發布。未發布的臨場文字不會隨同步重繪消失，但不跨重新整理保存。

## 題目說明試用與版面

- 48 組內建話題各有兩段簡單英文說明：先釐清原問題在問什麼、關鍵詞的意思及範圍，再提示可以從何開始回答。例子僅用於理解原題，不帶出另一道問題或限定答案。說明放在主問題下方，也出現在選題預覽、頁尾題庫與玩家卡片。
- 「顯示題目說明（試用）」預設開啟；主持人可在思考或分享期間開關，同步給所有玩家，不重置倒數、分享次數或口頭追問。沿用 `showStarters` 活動欄位和 `lets-talk-starters.v1` 本機偏好，已保存的開關設定照常保留。
- 自訂話題可填寫 600 字以內的題目說明，與原有草稿一起保存；「以這題修改」也會帶入內建說明。沒有填寫說明時保持空白，不再拿 follow-up 充當解釋原題的文字。原有延伸問題仍可照常選用。
- 重新開啟主持頁後，若現有活動的題目 ID 及主問句都與內建題庫一致，會以 `explain` 主持命令更新其說明；不更動目前發言者、開關、想法或追問。自訂／改寫的問題不自動覆蓋。欄位名稱仍用 `starter`，以保留既有草稿和活動的相容性。
- 既有活動若沒有 `showStarters` 欄位，先保持原本不顯示的樣子，主持人仍可開啟。空白的倒數、追問、反應與說明不佔高度或間距。桌面將發言狀態與主要按鈕並排，手機緊接排列；思考期的開始按鈕放在同一區域。

## 同步與維護

| 檔案 | 責任 |
|---|---|
| `talk-engine.js` | 純狀態轉換、順序、公平性、命令去重、最小玩家投影 |
| `talk-sync.js` | 主持端交易、短租約、每位玩家事件接收、卡片投影 |
| `talk-ui.js` | 共用雙語文字、玩家卡片、草稿、請求確認、連線提示 |
| `talk-host.js` | 共同畫面與不連線的示範控制器 |
| `talk-topics.js` | 48 組原創議題與題目說明、分類、中英搜尋、篩選後隨機抽題、自訂題目輸入驗證 |
| `talk.css` | 本模式限定樣式，保持手機按鈕與文字輸入清楚易按 |

沿用現有 Firebase `rooms/{roomCode}/players/{token}` 的逐 token 讀寫權限。
主持人另有隨機 128-bit 控制 token，存在該房間的 host localStorage
`letsTalkControlToken`，其節點儲存唯一權威 state。這個 token 不進入公開名單、
玩家 URL 或玩家資料。既有連結持有者信任模式不变，不新增房間整包讀取權限。

主持頁以 Firebase transaction 更新 state，14 秒租約／每 4 秒續租，避免兩個
主持分頁同時處理交棒。時鐘使用 Firebase serverTimeOffset。請求 ID 去重，
並核對 sessionId、turnId；actor 從主持人監聽的玩家節點推導，不信任玩家自報。
玩家一次等一個請求確認，可用相同 ID 重試。投影交易保留已送出的 talkAction，
避免主持狀態更新蓋掉尚未接收的操作。換遊戲會暫停舊主持頁發送；重新開啟話題
才切回來。玩家只取得公共素材及自己的準備狀態／接話狀態，沒有全員私人排序資料。

主持 `starters` 命令只接受布林 `show`；新活動可指定 `showStarters`。玩家投影提供 `starter` 說明文字和 `showStarters` 狀態，原本的 `topic.followUp` 相容欄位照常更新。說明文字從原話題取得，不因切換當前延伸而改變。v0.5 的 `explain` 命令只接受主持人及 1–600 字的 `text`，只更新目前活動的說明；sessionId 仍須符合目前活動。

v0.2 的 topic 增加 `followUps: [{stage, question}]`，仍保留舊 `followUp` 欄位；
`TALK_ENGINE.followUps()` 也能讀取舊房間僅有的一句延伸與 Firebase 物件格式。
主持人的 `extend` 命令可指定 `index`、`text` 或 `show: false`；選定問題儲存在
權威 state 的 `extension`／`extensionIndex`。玩家投影仍將目前選定問句放入
`talk.topic.followUp`，已開啟的 v0.1 玩家頁不需更换私人連結即可顯示。新主題重置延伸。

## 第一版的實際限制

- 必須讓一個主持頁保持開啟且能執行。關頁、睡眠或手機將網頁掛到背景可能暫停同步；玩家頁會提示等待主持頁重新連線，語音不受控制。主持頁重新開啟會延續目前狀態。
- 不處理中途更改人數；如需增減成員，返回首頁設定並重新開啟話題。沒有偵測誰真的在線上或正在說話。
- 姓名與主題開始時的名單一起固定；公開文字只保留目前主題，不建立歷史回顧或 AI 摘要。
- 所有主題都是原創試用內容，沒有加入既有 Google Sheet 模板。後續確定題型後再整合題庫來源。
- 是否減少緊張、是否讓內向者更自在，需要小組實際試聊；規則測試只能確認程式沒有漏人、重複輪次或錯誤搶話。

## 驗證

`node --test tests/talk-*.test.cjs` 無需安裝套件，涵蓋 2–9 人各 30 輪的公平性、
追問與主要分享分離、重複／過期請求、延後補充、選填文字、短暫意願、Firebase
省略空值、非同步投影、主持頁接續與切換活動。同步測試使用記憶體 transport double，
不會寫入任何真實房間，不能代替實際 Firebase 連線驗證。

瀏覽器驗證請用新測試房間：先試單機的兩種開局；再開共同畫面和至少兩張玩家卡，
檢查送出文字、準備好、追問／延後／開放／返回、交棒、換題、主持頁重整與雙分頁，
最後切到一款既有遊戲，確認私人連結繼續可用。不要讀取或改動不相關的使用者房間。

### 2026-09-13 瀏覽器實測

以本機 HTTP 預覽、實際 Firebase 資料庫及全新三人測試房間驗證，未使用既有活動房間：

- 14 項 Node 規則／同步模擬測試全部通過。
- 單機示範的兩種開局、切換四位參加者視角、公開想法、追問／延後／邀請／返回與下輪接話通過。
- 三張獨立玩家頁可同步準備狀態與選填文字；其他人的更新不會清除未送出的草稿或移走輸入焦點。
- 「想聽更多」短暫顯示後消失；追問結束回原分享者，提問者仍保有本輪主要分享，三人交棒後進入下一輪。
- 換題清除前題素材，延伸题保留輪次；30 秒思考時間結束可自動開始分享。
- 玩家與主持頁重新整理可接續；兩個主持分頁只有一個能控制，原分頁關閉後另一頁在租約到期後接手。
- 保留 Let's Talk 主持分頁時切到別款遊戲，原玩家連結可照常收該遊戲的卡片，舊談話投影會停止；重新開啟話題可切回 Let's Talk。（當時是用 Word Wolf 驗的，那款遊戲後來已移除。）
- 檢查桌面及 320px／390px 窄版畫面、中英按鈕與文字輸入；沒有水平溢出，操作可用。

此處為桌面 Chromium 瀏覽器與手機寬度測試，並非 iPhone／Safari 實機驗證；
手機背景暫停、實際語音活動的節奏與參加者感受仍需實機試聊。

### v0.2 驗證

19 項 Node 測試通過，新增題庫完整性與搜尋、自訂輸入邊界、延伸問題權限、
保留追問與分享次數、舊格式相容，以及主持接續後保留臨場延伸的檢查。
瀏覽器以全新 Firebase 雙人房間驗證自訂題目、選擇與臨場輸入延伸、追問途中更新、
玩家／主持頁重整；另驗證中文搜尋、改寫題庫題目、草稿重整還原、空延伸開局，
及 390px 寬度下的編輯與預覽。

### v0.3 驗證（2026-09-14）

21 項 Node 測試通過，新增主持代操作的權限／分享公平性及抽題篩選、避免重複、單題／零結果邊界。
新建 Firebase 三人房間 QAW597，驗證選填文字開局與同步、口頭追問開放後關閉提問者頁、主持結束提問回到原分享者、關閉分享者頁後由主持交棒、三人各一次後進入第二輪、待追問提醒與明確交棒、主持重整接續、隨機换題至免打字模式，最後原玩家連結正常切回 Word Wolf 收字卡。
單機另檢查首次隨機題、重新抽題、頁尾完整題庫與延伸、中英搜尋與零結果、從題庫選題回到上方、取消隨機換題保留現有輪次、中英「輪到你」與結束按鈕。390px 玩家卡及 320px 題庫無水平溢出，金色提示與完整問題／選題按鈕可見。這些為 Chromium 手機寬度驗證。

後續介面精簡再次通過 21 項測試；單機瀏覽器檢查中英文的主持畫面、玩家卡片說明、無方向標籤的完整延伸題，以及選擇延伸與主持交棒，並檢視 390px 版面，未出現瀏覽器錯誤。

### v0.4 驗證（2026-09-14）

23 項 Node 測試通過，新增主持限定的引題開關、四張卡片投影與主持接續；並檢查 48 段引題完整性、自訂長度、舊話題回退和切換延伸時引題不變。
新建 Firebase 雙人房間 SDKBFE，驗證兩種開局、引題開關全員同步、保留未送出的草稿及輸入焦點、追問途中關閉引題與切換延伸、主持返回分享及交棒、重整還原關閉狀態、換題沿用設定。
單機檢查題庫／預覽開關、偏好重整還原、自訂多行引題與草稿、英文開關文字。1100px 桌面狀態／按鈕並排，390px 主持與玩家版面無水平溢出；空白狀態區塊及關閉引題的高度均為 0，手機發言狀態與按鈕間距為 12px。瀏覽器無錯誤。手機檢查使用 Chromium 窄版，非 Safari 實機。

### v0.5 驗證（2026-09-14）

24 項 Node 測試通過，包括說明更新的主持權限、長度邊界、過期話題拒絕，以及更新後保留筆記、分享次數、追問和開關。逐題檢查 48 段內容均聚焦原題，原主問句與 192 題延伸維持不變。
沿用先前建立的專用測試房間 SDKBFE，確認已存的內建題目能更新為新版說明並同步至原玩家連結。單機驗證中英開關、手機兩段文字、說明關閉後高度歸零、保留自訂草稿，以及未填說明時不顯示 follow-up；瀏覽器無錯誤。
