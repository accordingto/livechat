# 說書人・人生故事版

在既有 Dixit 內新增 `mode: life_story`。Hub 原入口、房間能力憑證、主持人管理頁與每位玩家的原私人連結保持沿用。原版是預設模式，原版的六／七張手牌、三人雙混淆牌、全中／全錯說書人零分、目標分数規則仍由原 `dixit-engine.js` 路徑執行。

## 遊戲入口

Hub → 說書人 (`dixit.html`) → 說書人模式：人生故事版 → 選房間題目語言與圖卡包 → 開啟這桌遊戲。使用既有玩家連結參與；主持人也從自己的私人卡片選牌。共同畫面不選牌、不猜牌。以面對面或外部語音通話分享，本程式不錄音、不輸入逐字稿。

`LOBBY → PREPARE → STORYTELLING → COLLECTING → VOTING → REVEALING（倒數／原牌）→ REVEAL_DISCUSS → FOLLOW_UP`。

正常回合的三個候選題目在準備階段對所有玩家與共同主持畫面公開，只有說書人能選題、換題或自由分享。選定題目在說故事、收牌、投票及揭曉階段持續顯示；延伸提示仍預設折疊，沒有必答要求。

依 2026-10-14 使用者修正，選題或自由分享後可以直接開始說故事，不必先選圖片。說書人可邊講邊秘密選牌，正式鎖牌前也可改選自己的故事牌；其他玩家此時就能提交自己的牌，不必等待說書人選好。鎖牌同時要求故事講完、說書人已有合法故事牌、所有有效參與者交牌；缺少故事牌時停在收牌，不能提早洗牌或投票。非說書人猜故事牌，不可投自己的牌，投票確認後不改票。

介面沿用原版 Dixit 的面板、圖卡、投票與揭曉元件。全員投票完成後先等主持人按「揭曉」；接著與原版相同，倒數 3 秒，只顯示說書人原牌 1.2 秒，再由伺服器自動揭曉牌主、選票與分數並結算補牌。倒數不公開答案，原牌階段不公開其他牌主、選票或分數；完整揭曉前不能接棒。

揭曉後保留自由討論；主持人按「結束本回合・開放接棒」後，第一個被伺服器接受的合資格接棒者取得下一回合。接棒不出新題、不要求摘要。每輪固定座位名單中每人一次：pending、in_progress、shared、passed、excused 分開記錄。A → C 接棒後，正常下一位仍為 B。最後一人的討論結束時先建立新輪，讓最後故事仍能跨輪延續。同輪已分享／略過者仍能正常出牌、猜牌、聊天。

取消的未結算回合恢復鎖定牌、不計分，恢復 pending 或保留本人明確 passed；主持人安排依序下一位，不把取消的故事當作完成討論而開放接棒。

## 可調第一版預設

集中於 `life-story-engine.js` 的 `DEFAULT_MODE_CONFIG`，不放進不可變動的核心規則：3–8 人、8 張手牌，每人每回合未提交時換牌一次、最多 2 張；完成有效分享 +2、猜對 +2、非說書人的牌每吸引合法票 +1。全猜對與無人猜對都正常給分享分。揭曉時間為 `revealCountdownMs: 3000`、`revealAnswerMs: 1200`。每回合完整揭曉時結算補回 8 張；不新增固定輪數、故事評分或發言倒數，主持人結束遊戲。

圖卡與規則分開，採用 Hub 已有的原創圖像：`dixit_original` 126 張，或 `dixit_base84` 84 張。沿用 `dixit-deck.js`、`assets/dixit-v2` 及 `assets/dixit-expansion-1`，沒有新增／抓取商業桌遊圖片。

## 題目與資料

附件完整 96 題 JSON 為唯一題库來源：`assets/life-story/life_story_questions.zh-TW.en.json`；另保留原 schema 和 prompt。每次預設 2 light +1 personal，優先不同主題、故事入口、related intent group 與 tone。三個候選是公開問題，不是秘密手牌；其他玩家與共同畫面只能閱讀，不能代選。兩個延伸提示預設折疊且可跳過。

展示／選中／换掉歷史隨權威房間持久化，六次展示冷卻可調。已選 intent 與可測的文字近似去重；先放寬未選冷卻，耗盡才明確標示重用。重連、跨輪、同房重開及切回模式都保留歷史，只有明確清歷史或新房重置。

本 Hub 未找到可沿用的 AI 問題 provider，因此正式遊戲直接使用本地題庫，不需 AI key。`life-story-questions.cjs` 保留可注入 provider 的批次驗證／逾時 fallback 接口，未新增付費 API 或訂閱，也沒有測試實際 AI 服務。硬檢查為結構、長度、enum、禁用詞組、意圖與文字近似；生活可回答性、翻譯與語意品質仍須編輯及團體遊玩驗證，沒有宣稱完整理解語意。未儲存玩家口頭故事，不向任何 provider 傳手牌。

## 多人權威與私密性

沿用既有 `runtime/hub-executor-core.cjs` 的密封憑證、綁定 seat 身分、Firebase REST ETag CAS、mailbox、持久化回覆與新／舊遊戲投影保護。指令帶 id、sessionId、turnId、cycleId、expectedRevision；人生故事使用獨立 `lifeRevision`，不受公開傳輸 revision 的心跳影響。大廳 cycleId 使用 0，避免 Firebase 清除 null 導致合法指令失效。

`runtime/life-story-state.cjs` 用既有服務 `HUB_EXECUTOR_SECRET` 以 AES-256-GCM 加密人生故事完整權威狀態及房間題目歷史。共同主持頁訂閱的原控制節點只含安全公開 view 與密文，也收不到全員手牌。各玩家投影只含自己的手牌／保留牌／選票；投票前匿名桌牌無牌主、答案或他人選票。伺服器 HMAC 產生隨機 seed，ETag 重試確定且用戶端無法由公开指令預測發牌。

既有 `Room` 在開桌前停止全員私人卡片訂閱並清除暫存，保存模式讓 Hub 首頁／主持頁重新整理也預先停用讀取；舊訂閱的延遲回呼有 epoch 保護。私人 HOST 卡片在此模式不建立瀏覽器 executor、不訂閱其他席位；名單發現亦只讀安全控制 header。所有現行入口已更新 Room 與主持橋接的快取版本。

主持人斷線沿用服務 60 秒重連寬限後由在線座位承接；暫時離線不自動算略過。明確暫離、棄權、取消與主持權轉移由伺服器處理。手牌／抽牌堆／棄牌／未結算桌牌保持實體 cardId 唯一；同一回合只結算一次，已揭曉回合不能取消重算。

人生故事要求獨立服務，沒有瀏覽器主持執行 fallback。開桌前檢查服務 `X-Icebreak-Life-Story: 1` 能力標記；舊／不可用服務會顯示更新需求，且在拒絕前不釋放或改寫既有遊戲。

## 部署

要同時發布 Hub 前端與既有獨立執行服務；只發布 HTML／JS 不足以啟用此模式。維持現有 Firebase 專案、原玩家連結、原服務 endpoint、Singapore 執行區域和既有服務秘密，不需要另造 Hub 或新 server key。Node 20+；原 repo 無新增 npm 依賴。

使用 `scripts/hub-executor-package-service.cjs <既有serviceRoot> <隔離output>` 打包。打包器遞迴包含人生故事 engine、題庫模組與三個指定資產，保留原歌曲搜尋／退休 endpoint；不包含環境檔、本機登入資料或 public server source。保持服務秘密穩定，變更它會使既有密封房間不可讀。

前端入口與共用模組已更新 cache query，部署後重新整理參與頁面。本次修改的 Life Story engine／UI／CSS、`dixit-ui.js` 與 `dixit-sync.js` 使用 `life-story-2`；未修改的 Room、主持橋接與 executor 仍使用 `life-story-1`。`dixit-sync.js` 同時停用 Dixit 頁面繼承的 Talk 專用 clock 呼叫，避免未載入 `TALK_ENGINE` 的頁面錯誤。2026-10-13 前一版曾發布至原 Hub 與原服務，完成正式資產與獨立測試房驗證；該紀錄不是本次修正版的發布證據。本次完整回歸曾通過 1863 項，後續 clock 修正另通過 83 項 Dixit sync 測試；修正版後端已 READY，真實服務／Firebase 的獨立四人 smoke 完成 3783 項檢查並清理 5／5 自建節點。前端正式發布與發布後資產驗證仍待補錄。實體手機、真人語音分享與真實慢網路仍未驗證；詳見 life-story-acceptance.md。
