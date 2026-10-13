# 人生故事模式：實際驗收紀錄

最新修正日期：2026-10-14。正式修改是本目錄的 `accordingto/livechat` Hub 副本，基底 `cba8fd3`。在找到 Hub 前製作的獨立程式已停止並隔離，其測試不計入以下結果。

## 2026-10-14 紙卡題目、固定主題與精簡手牌（life-story-3）

依最新指示恢復第一版的暖色紙卡題目區，仍對全員共享三題與選定題目。說書人已選題的準備階段、說故事與收牌階段，將主題、確認秘密故事牌、開始／講完整合於同一固定區，捲動手牌仍保留主題。自由分享與接棒也有固定方向提示；接棒只顯示實際上一題，沒有編造故事摘要。次要回合資訊、提示與選牌時的分數預設折疊。Life 手牌為桌面四欄、平板三欄、手機兩欄；圖像來源、3:4 比例、原版模式與揭曉大小保持。

完整 96 題中有 28 題雙語主問題與第一延伸提示改為具體生活入口，例如物件、路線、位置、動作、聲音與氣味。第二提示、所有原 ID、intentKey、分類、themes、related groups 及其他非文字 metadata 保留。原附件 metadata digest 回歸與舊題 snapshot／Firebase numeric-key history 回歸確認舊房不清歷史、不改正在玩的題目。出題 prompt 增加相同編輯規範；沒有新增 provider、根據秘密手牌出題或限制字面圖片匹配。

已執行：

- `node --test --test-concurrency=4 tests/*.test.cjs`：最終 **1871／1871 通過，0 失敗、0 skipped**，52.0 秒，記錄 `../hub-life-story-ui3-release-tests.log`。包含原版 Dixit 與其他 Hub 遊戲。先前 UI 改好時全套 1869／1869 通過；加入兩項新題庫回歸後再跑上述最終全套。
- 題庫／engine／service 最終 targeted **47／47 通過**，題庫 **20／20**；獨立多人與安全稽核確認管理頁沒有私牌、dock 只讀本人 projection、命令保留回合與版本限制。
- 原版 UI／Life UI／主持切換 **78／78 通過**。`node tests/life-story-ui.browser.cjs` 分別以 EN 與 zh-TW 最終通過實際原主持頁＋四個獨立原玩家連結的 4 回合、正常順序、接棒、跨輪、先講後選／改牌、匿名投票、重連與原版揭曉幾何比較，**零 page errors、零 stale retries**。這些流程使用隔離 Firebase 相容邊界與真正 executor／ETag，正式 Firebase 流程另由下述 smoke 驗證。
- 每語 **9 個**版面案例（320／390／1280 × 已選題 PREPARE／STORYTELLING／COLLECTING），合計 **18 個**；真實 90 字繁中及 220 字元英文主問題完整可讀、無內部捲動，至少一張完整圖卡可見且中心 hit-test 可點，操作不互蓋、無橫向溢位。截圖前確認可見圖片 complete 與 naturalWidth>0，未把載入中的空底當成完成。測試頁曾缺 UTF-8 宣告，已修正後重跑兩語；正式玩家頁本來有 UTF-8 宣告。結果與截圖 `../test-results/hub-life-story-en/`、`../test-results/hub-life-story-zh-TW/`。
- `scripts/hub-executor-package-service.cjs` 建立 58 檔隔離部署包；`scripts/life-story-verify-package.cjs` 驗證 **52 個 runtime／資產一致、完整 96 題可載入**。服務 build 成功，`dpl_FmbgGp7LHkFrcMk5VLfkk6RcQtpT` 為 READY，沿用 `icebreaker-youtube-search.vercel.app`。52 個 runtime／資產與兩個 manifests 已同步回原服務來源，5 個既有公開搜尋／套件檔逐 byte 保留。
- 新部署服務的初次真實 Firebase 四人 smoke **3783 項通過**，所有 **5／5** 自建節點經所有權與 ETag 條件清理。另補上正式候選逐項比對本次題庫內容的驗證；該驗證本地真實 executor／ETag fixture **2／2 通過**。
- 加入候選比對後，正式服務 smoke 再次 **3792 項通過**，四人完成分享、匿名投票、分段揭曉、計分、接棒、跨輪與歷史重開；**5／5** 自建節點條件清理成功，0 失敗。結果 `../test-results/hub-life-story-ui3-production.json`；初次 smoke 結果另存 `hub-life-story-ui3-production-initial.json`。本次沒有讀取或修改任何既有玩家房間。
- 前端 `c783e78497d43de0d3f49c3151dd92dc475eb16e` 已由原 Git 自動發布，Vercel `FJFPjKyEm3B6BG4uc3HyTJiBa94W` 為 success，正式入口 https://livechat-two-alpha.vercel.app/dixit.html?v=life-story-3 。`node scripts/life-story-verify-release.cjs c783e78 --preserve-games` **200／200 正式資產一致**，126 張既有圖卡、96 題本地 server bank、16 個 Room 入口與 UI/CSS 新快取正確。服務 readiness／CORS／偽造票券與外部來源拒絕正常，**14／14 私有回應本文封鎖**。
- `node scripts/life-story-verify-browser.cjs c783e78`：正式 EN／ZH 空白主持頁的模式、語言、牌包、圖卡數、UI helpers、快取與服務 readiness 通過，**零 page errors、零房間請求、零寫入**。空白頁按既有流程等候 Hub 設定房間，沒有為驗證製造現有房間狀態。第一次 checker 嘗試操作刻意隱藏的無房間設定欄位，已修成讀取選項後重跑通過。結果 `../test-results/hub-life-story-production-ui3/report.json`。8 個修改 JS/CJS 檔的 Node 語法檢查與 `git diff --check` 通過。

介面 UI／CSS 與兩個實際入口 cache 使用 life-story-3；未修改的 Life engine、共用 Dixit UI／sync 與 manager host 保留 life-story-2，privacy transport 保留 life-story-1。原專案沒有 lint、TypeScript typecheck 或通用前端 build script；只記錄實際 Node 語法、原生測試、瀏覽器與 Vercel service build，不宣稱其他檢查通過。

本次主要修改：`life-story-ui.js`、`life-story.css`、`assets/life-story/life_story_questions.zh-TW.en.json`、`assets/life-story/QUESTION_GENERATOR_PROMPT.md`、`dixit.html`、`play.html`。驗證工具／測試／文件同步更新；engine 與原版規則本次沒有生產程式修改。實體手機、真人語音與實際團體的題目效果仍未驗證。

## 2026-10-14 題目共享與原版介面流程修正（上一版）

本次依使用者後續指示，更新附件原本的先選牌限制與候選題私有設定：準備階段三個候選題對全員及共同主持畫面公開，選題／換題權仍只有說書人；選定題目持續顯示於說故事、收牌、投票及揭曉。選題後可以先開始說故事，說書人邊講邊選牌，其他人已可提交。說完但未選故事牌時保持收牌，必須同時滿足故事講完、說書人合法故事牌、有效玩家全部交牌才鎖牌。

介面沿用原版 Dixit 圖卡與揭曉元件。全員投票完成後等待主持人「揭曉」，再依原版倒數 3 秒 → 原牌單獨顯示 1.2 秒 → 自動完整揭曉。倒數及原牌階段不公開其他牌主、票或分數，也不計分／補牌或開接棒。完整揭曉後仍保留自由討論。原版分數規則與人生故事分數各自保留。

目前已執行：

- `node --test tests/life-story-production-smoke.test.cjs`：**2／2 通過**。使用真正 executor 的本地 Firebase HTTP／ETag 邊界，驗證四人題目共同可見但不可代選、先開始後選牌、他人提前提交、缺牌保持收牌、接棒與跨輪、3 秒／1.2 秒分段揭曉及冪等結算。以注入時鐘加速等待，沒有呼叫正式服務或 Firebase；條件清理正好 5 個自建節點，並保留被其他資料替換的節點。
- 修改的 production smoke／安全測試／release verifier 以 `node --check` 檢查語法：通過。
- `node scripts/life-story-verify-release.cjs --check-local --preserve-games`：本地 **200 項資產**、完整 96 題及 **16 個 Room 入口快取網址**檢查通過；Life Story／Dixit UI 新版本與舊 transport 快取分開檢查，私有回應本文封鎖驗證仍保留。
- 本次 full Hub native 回歸：最終 `node --test --test-concurrency=4 tests/*.test.cjs` **1865／1865 通過，0 失敗、0 skipped**，約 53.7 秒，輸出在 `../hub-life-story-ui2-release-tests.log`。此前 1863 項全套通過；實際頁面發現 Dixit 繼承的 Talk clock 引用了未載入的 `TALK_ENGINE`，已停用並加入 2 項對應測試；相關 Dixit sync **83 項通過**。
- 後一次預設並行全套曾有 1 個未修改的 Once numeric-key fixture 在 server-deal 失敗，該檔孤立重跑 **9／9 通過**；最後上述全套全部通過。沒有更改 Once 遊戲或測試來略過失敗。
- `node tests/life-story-ui.browser.cjs` 分別以 EN 與繁中執行：兩者都通過實際原主持頁與 4 個獨立原玩家連結，完成 4 回合、正常順序、接棒及跨輪，含題目共享、先開始後選／改牌、投票時重連、分段自動揭曉及投票人展開，**零 page errors**。原版與 Life 在 1280／390 下字體、卡牌尺寸、3:4 比例、grid、階段列及揭曉排列一致；手牌寬 380／366 px，揭曉原牌寬 438.47／366 px。報告及截圖在 `../test-results/hub-life-story-en/` 與 `../test-results/hub-life-story-zh-TW/`。
- 修改檔案語法檢查及服務包驗證：**52 個 runtime／題庫資產一致，完整 96 題可載入**。本次修正版後端已部署為 READY：`dpl_WCQ9NJiSXqJVpFNpjGCdHtS34dBZ`，沿用原獨立服務正式網址。52 個已部署 runtime／題庫資產與 2 個 manifests 已同步回既有服務來源，5 個既有公開搜尋／套件檔保持一致；前端即將發布。
- `node scripts/life-story-production-smoke.cjs --live`：修正版正式後端與真實 Firebase **3783 項檢查通過**，指令退出碼 `0`。四人完成公开候選／選定題目、未選牌先開始、提前提交與缺牌收牌等待、匿名投票、實際觀測倒數／原牌／完整自動揭曉、冪等計分補牌、接棒競爭、原座位順序、跨輪與同房題目歷史。只操作新建且帶唯一標記的 5 個節點，**5／5 所有權與 ETag 條件清理成功，0 失敗**。實際去識別化結果：`../test-results/hub-life-story-ui2-production.json`。
- 前三次 smoke 檢查未通過，皆清理 **5／5** 自建節點。原因為驗證器以物件欄位排序比較 Firebase 回傳，以及請求開始時刻／時鐘差令初次揭曉 pulse 太早。已改為排序後的語意比較、保留絕對伺服器期限並有限重試實際仍在倒數的階段；若跳過原牌階段仍會失敗，沒有調整遊戲的 3 秒／1.2 秒時間。修正後本地 smoke 安全測試 **2／2 通過**，上述正式檢查完整通過。

前端功能 `646a19f` 已發布至原正式網站，Vercel deployment `5LvGwi3Mjxo5MMbNkZF6sSfAaqQS` 成功。`node scripts/life-story-verify-release.cjs 646a19f --preserve-games` 最終 **200／200 資產一致**，完整 126 張原圖卡及 96 題本地題庫、16 個 Room 入口與新版模組快取正確；服務 readiness／版本標頭／CORS／偽造票券及外部来源拒絕正常；**14／14 私有回應本文封鎖**。第一次兩個公共 HTML 請求逾時，重試後完整檢查退出碼 0，沒有修改程式來略過檢查。

正式 Edge 空白主持頁中英文檢查通過：模式、語言、牌包選項正常，新版共用元件齊全，Dixit 背景計時回呼安靜，服務 ready，零 page errors、零 Firebase／房間請求、零寫入。正式檔案也與原版 `dixit.css` 一致；記錄在 `../test-results/hub-life-story-production-ui2/`。後續順手修正既有大廳圖卡說明的 `{n}` 張數佔位文字，以實際牌庫張數顯示，中英文由主持頁 labels 更新；相關主持入口測試 **12／12 通過**，沒有改遊戲規則。

以下 2026-10-13 的數字、部署 ID 與線上結果皆屬前一版；本次新版證據以上述 2026-10-14 紀錄為準。

## 2026-10-13 前一版正式發布紀錄

已直接部署到既有 Hub 與既有獨立服務，沒有建立替代網站。前端功能 commit `cc558ea` 的 Vercel deployment `GdYR4BZbedMisDXtBHhcYhddFfnJ` 成功，路由修正 `1790158` 的 deployment `A6cmeT9nSKFwTsZXdn85Q1Xcc6Xh` 亦成功；正式入口 https://livechat-two-alpha.vercel.app/dixit.html ，在原說書人設定選「人生故事版」。獨立服務 deployment `dpl_6XLRptXCHkVe4pd7UBkBxXgFB6WG` 為 READY 且正式別名已更新。

- `node scripts/life-story-verify-release.cjs 1790158 --preserve-games`：正式網站 **200／200** 前端、原版圖卡及其他遊戲資產一致；16 個 Room 入口快取正確；服務 ready:true、人生故事能力標頭與 CORS 正確。偽造票券及外部來源被拒絕，兩站共 **14／14** 私有 runtime／題庫／schema／prompt 路徑回傳 404 且本文不含原始程式／題庫；Hub 的本文與安全 `404.html` 完全一致。
- 發布後發現 Vercel 只設定 status:404 仍可能附帶靜態原檔本文，已將所有封鎖路由改為 status:404 與安全頁 dest，並加入本文檢查；原狀態碼檢查不作為本文封鎖的證據。修正的相關測試 13／13 通過。独立 Edge 正式頁驗證中英文模式／兩個牌包／服務 readiness 正常，零 page errors，沒有房間讀取；另 13 個封鎖網址本文皆為安全頁。
- `node scripts/life-story-production-smoke.cjs --live`：真實服務與 Firebase **2346 項檢查通過**，完成四人正常回合、競爭接棒、固定座位下一位、跨輪、秘密投影、投票限制、重連桌牌穩定、冪等計分／補牌、同房重開題目歷史。只建立 5 個有唯一標記的新測試節點；**5／5 以所有權與 ETag 條件刪除，0 失敗**，不讀取或變更既有玩家房間。
- 新增的 production smoke 安全測試 2／2 通過；加入後全專案最終 **1853／1853** 通過。
- 52 個已部署 runtime／題庫資產及 2 個部署 manifests 已同步回既有獨立服務原始碼；5 個既有公開搜尋／套件檔逐 byte 一致並保持原樣。部署未讀取、輸出或變更服務秘密。
- 直接部署的使用者授權保存在 `AGENTS.md`、`.cursor/rules/hub-deployment.mdc`，供同 Hub 後續修改沿用。

## 已執行

- `node --test tests/*.test.cjs`：最終 **1853／1853 通過，0 失敗，0 skipped**，約 50 秒。包含原版 Dixit、其餘 Hub 遊戲、名單與服務回歸；最終輸出在工作目錄 `hub-final-release-test-results.log`，先前 1851／1850 項的輸出保留於 `hub-deploy-test-results.log`／`hub-test-results.log`。
- `node --test tests/life-story-*.test.cjs tests/dixit-card-host.test.cjs tests/story-game-host-switch.test.cjs`：80／80 通過（全套最後又加入安全名單發現測試，以上全專案結果為最終版本）。
- `node tests/life-story-ui.browser.cjs`：通過。**原 `dixit.html` 模式選擇＋四個獨立 browser context 的原 `play.html` 玩家連結**，使用隔離 Firebase 相容邊界和真正 `createExecutor`／adapter／ETag CAS，沒有瀏覽器端偽造四人的遊戲狀態。
- 實際瀏覽器完成 A 正常 → C 接棒 → B 正常 → D 正常 → 第 2 輪 D 接棒；投票中玩家重新整理、匿名 token 與桌牌顺序一致；全部猜對仍給說書人 2 分。四個玩家有各自權威手牌、提交、私票；共同主持頁不選牌。D 使用 390×844 觸控尺寸，放大／選牌／提交／猜牌／接棒可用，零 page errors。
- 每次私有投影與 API read audit：投票前無牌主／答案／他人選票；共同主持頁不訂閱或抓取已發牌的玩家私人节点。真正 Firebase 的空值刪除行為另由 service native tests 覆蓋，大廳 cycleId 使用 0。
- 所有實際修改／新增 JavaScript、CommonJS 檔案執行 `node --check`，及 `git diff --check`：通過。第一次批次檢查 26 檔，新增部署包驗證腳本另單獨檢查。
- `node scripts/hub-executor-package-service.cjs <既有服務來源> ../life-story-service-package`：產生 58 檔隔離部署包。
- `node scripts/life-story-verify-package.cjs`：**52 個 Hub runtime／資產逐 byte 與原始碼一致，部署包可載入完整 96 題**。其餘檔案保留既有服務的搜尋 handler／library／package／路由設定，未包含秘密或登入檔。

既有 Hub 沒有 lint、TypeScript typecheck 或通用前端 build script；沒有宣稱這三項通過。原生 JavaScript 語法與服務部署打包是本次可用檢查。最初全專案測試發現舊主持頁 fixture 未載入新 UI 模組，已補上實際依賴與 DOM 行為、保留驗證；Bluff 產物比對因 Windows checkout 的換行不同，重新執行既有 compiler 後通過，該檔案沒有語意或 Git 內容差異。

## 規格覆蓋

- A01–A12：選題／自由分享、秘密選牌、故事期間出牌、撤回、故事結束才鎖牌、匿名猜牌、角色與自投限制、全中／全錯分享分、自由討論後接棒。Native rules／service／UI 測試及實際頁面四人流程覆蓋。
- B01–B12：固定座位順序、每輪資格、simultaneous claims／主持 next 競態、重送、無新題接棒、跨輪最後一人可接棒、passed 非 shared、midjoin 下一 turn 参与／下一 cycle 資格。以 native CAS／membership 與四人跨輪流程驗證。
- C01–C10：私有 allow-list、主持背景訂閱与橋接停用、加密 canonical、重連順序、實體牌 conservation、換牌次數、锁牌拒絕、結算冪等、取消恢復、主持掉線與最少人數、原版回歸、126／84 圖卡包。原版完整回歸仍通過。
- D01–D14：完整 96 題、雙語與 metadata、2 light／1 personal、多樣性、intent／related groups／文字近似去重、六次展示冷卻、歷史續存、候選故障 fallback、敏感題拒絕、topic injection、沒有假摘要、折疊提示。AI 接口以注入的合格／失敗／逾時 provider 測試，**沒有呼叫實際 AI API**。
- E01–E07：原頁面四人正常／接棒／跨輪流程、實際 ETag 衝突與冪等測試、服務 60 秒離線寬限與主持转移、手機觸控尺寸、私有 wire projections／讀取審查、離線題庫可玩、原 Hub 全套回歸紀錄。慢／延遲資料由 native 排程與背景 stale callback／projection 測試覆蓋，並未宣稱做過真實外部慢網路試玩。

報告與截圖位於工作目錄 `test-results/hub-life-story/`，其中 `report.json` 記錄實際頁面結果，`mobile-cross-cycle.png` 與 `hub-manager.png` 可視覺檢查。

## 實際修改檔案

新核心：`life-story-engine.js`、`life-story-questions.cjs`、`life-story-ui.js`、`life-story.css`、`runtime/life-story-state.cjs`。

題庫資產：`assets/life-story/life_story_questions.zh-TW.en.json`、`question_batch.schema.json`、`QUESTION_GENERATOR_PROMPT.md`。

既有整合：`dixit-engine.js`、`dixit-sync.js`、`dixit-host.js`、`dixit-ui.js`、`dixit-card-host.js`、`room.js`、`hub-executor.js`、`api/hub-executor.js`、`runtime/story-executor.cjs`、`runtime/hub-executor-core.cjs`、`package.json`。

入口／快取：`dixit.html`、`play.html`；其他頁面僅更換 Room script 的 cache query，包含 `index.html`、`bluff-king-live-chat.html`、`bomb-relay.html`、`crack-the-word.html`、`cut.html`、`kangaroo-court.html`、`lets-talk.html`、`once-upon-a-time.html`、`open-mic-rescue.html`、`persuade-together.html`、`pick-a-side.html`、`say-it-without-saying-it.html`、`sketch-relay.html`、`sophies-choice.html`、`youre-in-the-scene.html`。不改這些遊戲的規則。

工具：`scripts/dixit-dev-server.cjs`（預覽現有擴充圖卡）、`scripts/hub-executor-package-service.cjs`（打包指定題庫資產）、`scripts/life-story-verify-package.cjs`。

測試：`tests/life-story-{engine,manager,questions,room-privacy,service,ui}.test.cjs`、`tests/life-story-ui.browser.cjs`，以及既有 `tests/dixit-card-host.test.cjs`、`tests/hub-room-membership.test.cjs`、`tests/story-game-host-switch.test.cjs` 的新增隱私／原版回歸。

發布路由與驗證：`vercel.json`、`404.html`、`scripts/life-story-production-smoke.cjs`、`scripts/life-story-verify-release.cjs`、`tests/life-story-production-smoke.test.cjs`；`chat-wolf.html` 另更新共用 executor 快取網址。文件：`life-story-mode.md`、本紀錄；維護導引 `CLAUDE.md` 的模式說明與 `AGENTS.md`、`.cursor/rules/hub-deployment.mdc` 的使用者部署授權。

## 部署與未驗證

使用者於 2026-10-13 授權本次與未來同 Hub 修改在測試通過後直接部署，已保存於 `AGENTS.md` 與 `.cursor/rules/hub-deployment.mdc`。獨立服務已部署為 READY `dpl_6XLRptXCHkVe4pd7UBkBxXgFB6WG`，正式網址回報 ready:true 與 `X-Icebreak-Life-Story:1`。前端發布及線上測試結果另記於本紀錄的發布補充。

必須同時更新 Hub 前端與既有獨立執行服務，保留原秘密、Firebase、既有能力憑證及搜尋 endpoints。舊服務沒有模式能力標記時，人生故事不開桌，也不改原牌局。部署包已建立並成功發布至既有服務專案。

正式發布補充已驗證真實 Firebase 的獨立測試房，未使用任何現有玩家房間。沒有實體手機、作業系統睡眠、真實慢網路、真人語音／團體分享效果測試。題目的實際分享與翻譯效果仍須真人試玩。未新增實際 AI provider，因本 Hub 沒有可沿用的問題 provider，完整遊戲採本地題庫。
