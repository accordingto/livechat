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
| `index.html` | 主選單 / 遊戲入口頁 |
| `hottake.html` | 🔥 Pick a Side! |
| `what-will-you-do.html` | 🤔 Sophie's Choice |
| `persuade-team.html` | 🤝 Persuade Together! |
| `scene.html` | 🎭 You're In The Scene |
| `emotion.html` | 🎴 Emotion Cards（主持人頁：選 2–6 人、發牌、產生每位玩家的私人連結） |
| `word-wolf.html` | 🐺 Word Wolf（主持人頁：選 3–6 人、發牌，多數人拿到同一個字、一人拿到臥底字，架構仿照 emotion.html） |
| `team-words.html` | 🤐 Forbidden Words（主持人頁：選 2–6 人、發牌，隨機分成 Team A / Team B，兩隊各拿一個常見單字，目標是誘導對方隊伍說出自己這隊的字、同時避免說出對方的字，架構仿照 word-wolf.html，共用同一份 wordwolf 詞庫） |
| `conquest.html` | 🏰 Dare Conquest（主持人單頁、不需 Firebase：選 2–6 人、8×3 寬螢幕比例、高度已壓縮的 board 外圍 18 格路徑，START 在左上角、順時針前進，輪流擲骰子、移動棋子，停在格子上需完成有趣的互動挑戰（跟其他玩家告白、唱指定歌曲、說笑話、講繞口令、吐槽某人等）才能佔領該地，做到也能從對手手中搶地，地圖格子不顯示題型、只有通用圖示，18 格中除了 START 安全格還有 3 個 BONUS、3 個 LUCKY、3 個 GIFT 散布在邊上（不只 4 個角落），BONUS 隨機取得 3 塊地、LUCKY 與指定玩家交換全部領地（2 人局自動指定唯一對手，3 人以上由主持人點選對象）、GIFT 取得所有無主土地，觸發特殊事件時該格會有發光閃爍特效、挑戰卡框線與圖示也會依事件類型變色，玩家目前所在格子（無論一般格或特殊格）都會顯示玩家圖示，一般土地佔領後整個格子會填滿玩家對應顏色（不再只是外框變色或右上角小圖示），骰子改為可 3D 翻滾的真實骰子（CSS 3D 立方體、6 面點數、擲出時有拋起彈跳動畫）並放在地圖正中央，回合資訊獨立顯示在 board 上方的控制列，挑戰卡也在地圖上方，地圖上方所有區塊（標題、計分板、控制列、挑戰卡）皆採緊湊排版以節省版面，遊戲不會因為土地全數佔領而自動結束、答對挑戰仍可從對手手中搶地讓局勢持續變化，主持人需按下「🏆 End Game」才會顯示贏家，頁面最下方列出完整題庫供主持人瀏覽） |
| `play.html` | 🔗 三款遊戲（Emotion Cards / Word Wolf / Forbidden Words）共用的玩家頁面：玩家開啟自己的私人連結後看到當下這局的內容，依 Firebase 資料中的 `game` 欄位自動切換樣式；同一個 Room Code + 同一批玩家連結可以在三款遊戲間直接切換使用，不用重新產生連結 |
| `firebase-config.js` | Emotion Cards / Word Wolf / Forbidden Words 共用的 Firebase Realtime Database 設定（host 與 play.html 共用，需自行申請免費專案並填入；三款遊戲共用同一個 `rooms/{roomCode}/players/{token}` 路徑） |
| `shared.css` | 所有遊戲頁共用樣式 + 主題變數 |
| `game-data.js` | 所有遊戲的題目資料（hottake / persuade / scene 各 10 題；sophies 38 則兩難劇本；wordwolf 200 組臥底詞組，Word Wolf 與 Forbidden Words 共用；emotion 25 種情緒；conquest 40 則互動挑戰指令，供 Dare Conquest 使用，`{player}` 會被隨機替換成另一位玩家的名字）— 遊戲題目唯一資料來源 |
| `game-render.js` | 共用渲染函式（GAME_RENDER） |
| `qrcode.js` | QR code 產生函式庫（vendored，qrcode-generator 1.4.4，MIT）— Emotion Cards 頁面選用性顯示連結的 QR code |

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
