# 人生故事模式：實際驗收紀錄

日期：2026-10-13。正式修改是本目錄的 `accordingto/livechat` Hub 副本，基底 `cba8fd3`。在找到 Hub 前製作的獨立程式已停止並隔離，其測試不計入以下結果。

## 已執行

- `node --test tests/*.test.cjs`：發布前最終 **1851／1851 通過，0 失敗，0 skipped**，約 50 秒。包含原版 Dixit、其餘 Hub 遊戲、名單與服務回歸；最終輸出在工作目錄 `hub-deploy-test-results.log`，先前 1850 項的輸出保留於 `hub-test-results.log`。
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

文件：`life-story-mode.md`、本紀錄；維護導引 `CLAUDE.md` 的模式說明。

## 部署與未驗證

使用者於 2026-10-13 授權本次與未來同 Hub 修改在測試通過後直接部署，已保存於 `AGENTS.md` 與 `.cursor/rules/hub-deployment.mdc`。獨立服務已部署為 READY `dpl_6XLRptXCHkVe4pd7UBkBxXgFB6WG`，正式網址回報 ready:true 與 `X-Icebreak-Life-Story:1`。前端發布及線上測試結果另記於本紀錄的發布補充。

必須同時更新 Hub 前端與既有獨立執行服務，保留原秘密、Firebase、既有能力憑證及搜尋 endpoints。舊服務沒有模式能力標記時，人生故事不開桌，也不改原牌局。部署包已建立並成功發布至既有服務專案。

未用真實 Firebase 或任何現有玩家房間測試；沒有實體手機、作業系統睡眠、真實慢網路、真人語音／團體分享效果測試。題目的實際分享與翻譯效果仍須真人試玩。未新增實際 AI provider，因本 Hub 沒有可沿用的問題 provider，完整遊戲採本地題庫。
