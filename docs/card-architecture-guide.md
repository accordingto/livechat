# 私人卡片架構指南：把「Say It Without Saying It」的技術搬到互動式簡報網頁

> 這份文件寫給**另一個新專案**（互動式簡報網頁）使用。內容整理自本專案
> （`livechat`）的實際程式碼：`room.js`、`play.html`、`say-it-without-saying-it.html`、
> `next-round.js`、`firebase-config.js`。
> 文中標「**本專案做法**」的是已經在線上運作的設計；標「**簡報專案建議**」的是我針對
> 簡報情境做的調整，本專案並沒有這樣做，需要你自己驗證。

---

## 1. 一句話說明

> **主持人的頁面是唯一的「權威」，玩家的手機只是「投影出來的畫面」＋「一個信箱」。**
> 兩邊透過 Firebase Realtime Database 傳訊息，沒有自己的後端、沒有登入。

這個設計能做到：
- 主持人**分享桌面**給大家看，同時每個人手機上看到**不同的私人內容**（答案、角色、個人回饋）。
- 秘密內容**從來不會寫進**不該看到的人的節點，所以螢幕分享時不會洩漏。
- 觀眾一掃 QR code 就能參加，不用安裝、不用註冊。

對互動式簡報的對應：

| Say It 的概念 | 簡報裡的對應 |
|---|---|
| 主持人頁面 | 簡報者的簡報畫面（分享螢幕用） |
| 玩家卡片 `play.html` | 觀眾手機上的互動頁 |
| 一輪（round） | 一張互動投影片（投票／測驗／問答） |
| `voteId` | 這張投影片的「本次互動編號」 |
| 玩家按按鈕 | 觀眾投票、作答、提問 |
| 私人卡片（角色、禁字） | 個人化回饋、測驗成績、只給某人看的提示 |

---

## 2. 整體拓樸

```
┌──────────────────────┐        Firebase Realtime Database        ┌─────────────────────┐
│ 主持人／簡報者頁面       │  rooms/{CODE}/players/{TOKEN}            │ 觀眾手機 play.html    │
│ （權威：持有答案、計分）   │ ───────────────────────────────────────▶ │ （只畫自己的那份）     │
│                      │  ◀─────────────────────────────────────── │                     │
│ payloadFor(i) 產生投影  │  rooms/{CODE}/players/{TOKEN}/vote       │ 按鈕只寫 vote 信箱     │
└──────────────────────┘                                          └─────────────────────┘
```

三條鐵則（本專案所有遊戲都遵守）：

1. **玩家永遠只讀、只寫自己 token 那個節點。** 沒有人能列出房間裡有誰。
2. **玩家寫進來的東西都只是「請求」，不是「指令」。** 主持人頁面自己決定這個請求現在合不合理。
3. **秘密只存在於主持人的記憶體。** 要給某人看，才在他的投影裡帶上那個欄位。

---

## 3. 資料模型（本專案做法）

```
rooms/
  {CODE}/                       ← 6 碼房號（排除易混字元 I O 0 1）
    players/
      {TOKEN}/                  ← 每位玩家一個節點，TOKEN = 10 bytes 隨機 hex
        game, state, voteId, …  ← 主持人寫入：這位玩家的「投影」
        playerNum, name
        vote: { id, choice, … } ← 玩家寫入：唯一的信箱，主持人讀完就清掉
    roster/                     ← 公開（舊遊戲用），不要放任何秘密
```

### 3.1 房號與 token（`room.js`）

```js
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 沒有容易混淆的字元
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}
function generateToken() {                // 猜不到，所以不能把 A 的連結改成 B 的
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
```

玩家連結：`play.html?s={CODE}&p={TOKEN}&n={名字}`。`n` 只是讓卡片在 Firebase 回應前先顯示名字，
**真正識別身分的是 token**。

### 3.2 主持人如何記住房間

`localStorage['room-session-{CODE}'] = { tokens, playerCount, names, …遊戲自己的設定 }`，
另存 `room-last-session` 記住最後一次的房號。重新整理主持頁時就能延續同一批連結。
各遊戲自己的設定用 `ROOM.setExtra(key, value)` 寫進同一包，避免被別的頁面覆蓋。

### 3.3 Firebase Rules（`firebase-config.js`）

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        "players": { "$token": { ".read": true, ".write": true } },
        "roster":  { ".read": true, ".write": true }
      }
    }
  }
}
```

重點：**規則只開到 `$token` 這一層**，沒有開 `players` 本身。所以知道自己 token 的人讀得到自己的節點，
但**無法列出別人**。這就是「沒有後端也能有基本隔離」的全部祕密。

> **誠實的限制**：這不是真正的存取控制。任何拿到某個 token 的人都能讀寫那個節點；
> 主持人的瀏覽器也看得到全部狀態。本專案明確接受「信任主持人」這個前提。
> `apiKey` 被 commit 進公開 repo 是正常的（Firebase 的 web apiKey 不是密碼）。

---

## 4. 主持人端：投影函式 `payloadFor(i)`

這是整個架構最重要的一個函式。**每次狀態改變，主持人為每位玩家各算一份「這個人看得到的東西」。**

```js
function payloadFor(i) {
  const isGiver = i === giverIdx;
  const base = {
    game: 'taboo', round, voteId: roundId, state,
    isGiver, score: scores[i] || 0,
    forbidden: null, target: null,          // 預設 null：什麼都不給
    timer: timerPayload(),
  };
  const sealed = state === 'ready';         // 發了牌，但持牌人還沒按「看題目」
  return Object.assign(base, {
    // 答案只給「持牌人」，而且要等他自己按了才給
    target: (isGiver && !sealed) || state === 'done' ? card.word : null,
    // 禁字只給持牌人與裁判
    forbidden: forbiddenOn && !sealed && (isGiver || isRef || state === 'done') ? roundForbidden : null,
  });
}
```

設計原則：

1. **預設全部 `null`，再逐項開放。** 漏寫等於不洩漏，而不是洩漏。
2. **`sealed`（封存）狀態**：牌已經發了，但連持牌人手機上都還沒有答案。
   他按「看題目」才把答案推出去。這樣換手機傳人的那幾秒，畫面上沒有秘密。
3. **回合結束（`done`）才公布答案給所有人。**
4. 同一份資料用 `ROOM.publish()` 或 `ROOM.update()` 送出（見下節）。

### 4.1 `.set()` 與 `.update()` 的差別（踩過的坑）

```js
// room.js
function publish(build) {          // .set()：整個節點換掉
  for (let i = 0; i < count; i++) {
    const payload = build(i);
    payload.playerNum = i + 1;
    payload.name = names[i] || null;
    db.ref(`rooms/${code}/players/${tokens[i]}`).set(payload);
  }
}
function update(build) {           // .update()：只改有寫的欄位
  for (let i = 0; i < count; i++)
    db.ref(`rooms/${code}/players/${tokens[i]}`).update(build(i));
}
```

- **新一輪開始用 `.set()`**：順便清掉上一輪殘留的 `vote`。
- **一輪進行中用 `.update()`**：否則你寫入投影的瞬間，剛好抵達的玩家按鈕會被一起蓋掉。

---

## 5. 玩家端 → 主持人：信箱與一次性 id

玩家只會寫 `players/{token}/vote`，內容永遠是**固定字串協定**，不是畫面上的文字：

```js
// play.html
function tabooSend(payload) {
  const id = latestData && latestData.voteId;     // 引用「現在這一輪」的編號
  if (!id) return;
  db.ref(`rooms/${session}/players/${token}/vote`).set(Object.assign({ id }, payload));
}
// 例：tabooSend({ choice: 'buzz', t: Date.now() })
```

主持人用 `ROOM` 對每個 token 各掛一個 listener（`attach()`），收到就丟給 `handleAnswer`：

```js
function handleAnswer(num, data) {
  const v = data && data.vote;
  if (!v) return;
  if (v.choice === 'deal') {                       // 回合之外唯一能做的動作
    ROOM.clearAnswer(num - 1);
    if (canDeal() && v.id === dealId) dealRound();
    return;
  }
  if (state !== 'playing' && state !== 'ready') return;
  if (v.id !== roundId) return;                    // ← 過期的請求直接丟掉
  if (num !== giverIdx + 1) { ROOM.clearAnswer(num - 1); return; }   // ← 身分驗證
  // …真正處理
  ROOM.clearAnswer(num - 1);                       // ← 處理完就清掉，玩家才能再送
}
```

### 5.1 為什麼一定要「引用 id」

| 情況 | 沒有 id 會怎樣 | 有 id 會怎樣 |
|---|---|---|
| 慢一步的手機送來上一題的答案 | 被當成這一題的答案 | `v.id !== roundId`，丟掉 |
| 四個人同時按「下一題」 | 連發四題 | 第一個消耗掉 `dealId`，其餘過期 |
| 手機重送同一個請求 | 重複計分 | 同上 |

規則：**每一個「一次性」動作都有自己的 id，處理的當下就作廢它。**

### 5.2 驗證三層

1. **id 對不對**（是不是這一輪的）
2. **狀態對不對**（現在可不可以做）
3. **身分對不對**（送的人是不是該做這件事的人，例如只有持牌人能按「看題目」）

任何一層不過就 `clearAnswer` 後 return，**不要讓卡片知道為什麼被拒絕**。

### 5.3 listener 不能死

```js
const handler = snap => {
  data[num] = snap.val();
  try { if (cfg.onPlayerData) cfg.onPlayerData(num, snap.val()); }
  catch (e) { console.error('onPlayerData', e); }   // 一次 render 出錯，不能讓整個房間聾掉
};
```

所有玩家動作都從這條路進來；這裡只要拋一次錯，之後的訊息全部收不到。

---

## 6. 倒數計時：只推一次，卡片自己跑

**不要每秒寫一次 Firebase。** 本專案做法：

```js
// 主持人：狀態改變時才推（開始／暫停／重設／歸零），seq 遞增
function timerPayload() {
  return { seq: timer.seq, state: timer.running ? 'running' : 'paused',
           remaining: timer.left, total: timer.total };
}
// 玩家：收到 seq 變了才重新對時，之後自己用 endsAt 算
function syncTabooTimer(t) {
  if (t.seq !== tabooTimer.seq) {
    tabooTimer.seq = t.seq;
    tabooTimer.endsAt = Date.now() + t.remaining * 1000;
  }
}
// tick 只負責讀時鐘：Math.ceil((endsAt - Date.now()) / 1000)
```

重點：
- 用**牆上時鐘（`endsAt`）**，不是 `setInterval` 數格子。手機／平板會把背景分頁的計時器節流甚至凍結，
  數格子的計時器會「時間到了什麼都沒發生」。
- 主持人那邊同理，另外掛 `visibilitychange`：一切回前景就當場結算。
- 一個 90 秒的回合 = 幾次寫入，不是 90 次 × 人數。

**簡報專案建議**：如果各裝置時鐘可能不準，改發「結束時間 `closesAt`（伺服器時間）」，
卡片用 `db.ref('.info/serverTimeOffset')` 校正：`now = Date.now() + offset`。本專案的
Let's Talk 模式（`talkClockOffset`）已經這樣做。

---

## 7. 「由卡片決定換下一題」：`next-round.js`

簡報的「下一張」如果想讓觀眾也能觸發（例如分組討論時由組長按），可以直接用這個模組。它是純函式，
不碰 DOM 與 Firebase，可以用 `node --test` 測。

流程：
1. 主持人每次發完內容就 `open()` 一組一次性的 `nextId`，隨投影送到卡片。
2. 卡片寫 `players/{token}/next = { id, go: true }`。
3. 主持人驗證 id → 開始 5 秒倒數（**不是立刻換**）。
4. 倒數期間任何卡片都能按「等一下」（引用該段倒數的 `seq`）。
5. 倒數結束才真的換。

**為什麼不做「過半數同意才換」**：那個計數是活在主持人單一分頁裡的跨卡片狀態，
只要漏一次事件、順序錯亂、或分頁被凍結，主持人就停在 0，而每張卡片都顯示「已準備好」，
而且之後怎麼按都救不回來。**一次點擊、一個 id、沒有計數**，就沒有可以卡死的狀態。

---

## 8. 玩家頁面（`play.html`）

### 8.1 一個頁面服務所有內容

```js
// 依 Firebase 資料裡的 game 欄位切換畫面
function renderCard(data) {
  if (data.game === 'taboo')  return renderTaboo(data);
  if (data.game === 'hottake') return renderVote(data);
  …
}
```

觀眾只需要記住**同一個連結**。主持人切到不同投影片類型，卡片自己換樣子，不用重新發連結。

### 8.2 連線與監聽

```js
db.ref(`rooms/${session}/players/${token}`).on('value', snap => {
  const data = snap.val();
  if (!data) { showError('waitingDeal'); return; }   // 主持人還沒發任何東西
  latestData = data;
  tryRenderCard();
}, () => showError('connectError'));
```

### 8.3 每次都「整張重畫」，所以本機 UI 狀態要放在 data 之外

`renderCard()` 會用新資料重建整份 HTML。如果「確認對話框正在顯示」這種狀態存在 DOM 或由 `data` 推導，
任何不相關的資料推播（別人分數變了）就會把它沖掉。做法：

```js
let tabooAwaySelfConfirm = false;                      // 模組層級的旗標
function tabooAskAway()    { tabooAwaySelfConfirm = true;  showCard(latestData); }
function tabooCancelAway() { tabooAwaySelfConfirm = false; showCard(latestData); }
```

### 8.4 手機背景化之後一定要補讀（真實踩過的坑）

手機鎖屏或切到別的 App 後，Firebase 的 socket 可能被暫停，回到前景時 SDK 不一定會準時補送最新資料。
結果是「有些人的卡片停在上一題，別人已經是下一題」。修法：

```js
let cardWasHidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cardWasHidden = true; return; }
  if (!cardWasHidden) return;
  cardWasHidden = false;
  db.ref(`rooms/${session}/players/${token}`).once('value').then(snap => {
    const data = snap.val();
    if (!data) { showError('waitingDeal'); return; }
    latestData = data; tryRenderCard();
  }).catch(() => {});
});
```

資料沒變時等於沒做事；真的跟丟時當場補上。

### 8.5 其他細節

- **按鈕按下後立刻停用並改字**（「送出中…」），避免連點；超過約 4.5 秒沒收到回應，
  就顯示「沒有成功 — 主持人的頁面要開著而且在最前面」。能處理請求的只有主持人頁面，
  它被凍結時按什麼都不會有反應，不能讓這變成靜默失敗。
- **大字永遠不被切斷**：題目字級不要用字數猜，用 Range 量實際折行數再縮字級。
- 協定與語言無關：寫回去的是 `'buzz'`、`'right'` 這類固定字串，所以中文主持人配英文卡片完全沒問題。

---

## 9. 主持人頁面的運作前提

- **主持人頁面必須開著、而且在最前面。** 它是唯一處理請求的地方；不是伺服器。
  這是明確接受的取捨（見 `CLAUDE.md` 的信任主持人架構），換來的是不需要任何後端。
- 開局前先顯示警告：沒有 Firebase 設定時，需要私人卡片的內容要**真的鎖住**，
  不要退化成「主持人畫面直接顯示答案」。
- 主持人重新整理頁面：用 `localStorage` 還原房號與 token，連結不失效。

---

## 10. 簡報專案建議：大量觀眾的改法

本專案是 2–9 人的遊戲，所以「每人一個節點、主持人替每人各寫一份」沒問題。
**簡報可能有 50–300 人**，這樣寫每換一張投影片就要寫 N 次。建議拆成兩種內容：

| 內容 | 放哪裡 | 寫入者 |
|---|---|---|
| 公開內容（題目、選項、截止時間、揭曉後的答案） | `rooms/{CODE}/live`（**一個**共用節點） | 簡報者 |
| 觀眾作答 | `rooms/{CODE}/answers/{voteId}/{token}` | 觀眾 |
| 個人化回饋（你答對了、你的分數） | `rooms/{CODE}/players/{token}` | 簡報者（只在需要時寫） |

觀眾連結改成**所有人同一條**：`play.html?s={CODE}`，投影在簡報上給大家掃。
token 由觀眾自己的瀏覽器第一次進來時產生並存 `localStorage`。

### 10.1 最小可行範例

**簡報者端（`host.html`）**

```js
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
const code = genCode();                         // 同 room.js 的 generateSessionCode
const live = db.ref(`rooms/${code}/live`);
const SLIDES = [
  { kind: 'poll',  title: '你用過 AI 嗎？', options: ['每天', '偶爾', '沒用過'] },
  { kind: 'quiz',  title: '1+1=？', options: ['1', '2', '3'], correct: 1, seconds: 20 },
];
let voteId = '', offAnswers = null;

function showSlide(n) {
  const s = SLIDES[n];
  voteId = newId();                             // ← 這張投影片的一次性編號
  live.set({
    slideNo: n, kind: s.kind, voteId, title: s.title, options: s.options,
    closesAt: s.seconds ? firebase.database.ServerValue.TIMESTAMP : null,  // 見下方備註
    open: true, correct: null,                  // ← 答案不在這裡！
  });
  if (offAnswers) offAnswers();                 // 取消上一張的監聽
  const ref = db.ref(`rooms/${code}/answers/${voteId}`);
  const h = ref.on('value', snap => tally(snap.val() || {}));
  offAnswers = () => ref.off('value', h);
}
function reveal() {                             // 揭曉時才把正解寫進去
  live.update({ open: false, correct: SLIDES[cur].correct });
}
```

> `closesAt` 備註：要讓倒數用伺服器時間，可先 `db.ref('.info/serverTimeOffset')` 取得偏移，
> 再寫 `Date.now() + offset + seconds*1000`；上面為了簡短只示意欄位。

**觀眾端（`play.html`）**

```js
const params = new URLSearchParams(location.search);
const code = params.get('s');
const TOKEN_KEY = 'pres-token-' + code;
let token = localStorage.getItem(TOKEN_KEY);
if (!token) { token = genToken(); localStorage.setItem(TOKEN_KEY, token); }

let state = null;
db.ref(`rooms/${code}/live`).on('value', snap => { state = snap.val(); render(); });

function vote(choice) {
  if (!state || !state.open) return;
  db.ref(`rooms/${code}/answers/${state.voteId}/${token}`)
    .set({ choice, t: firebase.database.ServerValue.TIMESTAMP });
  mine[state.voteId] = choice;                  // 本機狀態放在 data 之外
  render();
}
```

**Rules（簡報版）**

```json
{
  "rules": {
    "rooms": {
      "$code": {
        "live":    { ".read": true, ".write": true },
        "answers": { "$voteId": { "$token": { ".read": true, ".write": true } } },
        "players": { "$token": { ".read": true, ".write": true } }
      }
    }
  }
}
```

### 10.2 簡報版特別要注意的事

1. **正解永遠不要寫進 `live`，直到揭曉。** 觀眾能讀 `live`，打開開發者工具就看得到。
   測驗答案放在簡報者記憶體，`reveal()` 才寫。
2. **用伺服器時間戳 `ServerValue.TIMESTAMP`** 記錄作答時間，不要信觀眾裝置的 `Date.now()`。
   簡報者統計時再自己判斷「有沒有超過截止時間」。
3. **作答用 `answers/{voteId}/{token}`**，而不是共用一個欄位。換投影片不用清資料，
   舊票自然因為 `voteId` 不同而被忽略（這是 5.1 的 id 概念的延伸）。
4. **一人一票**靠 `{token}` 當 key；觀眾改選就是覆蓋自己那一筆。
5. **統計用 `on('value')` 一次接整個 `answers/{voteId}`**，不要對每位觀眾各掛一個 listener。
   （本專案每人一個 listener 是因為規則不允許列出 `players`；簡報版的 `answers/{voteId}`
   本來就是公開可讀的聚合節點，不需要那個限制。）
6. **不要把觀眾可以亂寫的東西當成可信資料**：這套規則沒有身分驗證，任何知道房號的人都能寫
   `live`。如果會在意惡意搗蛋，升級方案：啟用 **Firebase Anonymous Auth**，簡報者第一次寫入時
   登記自己的 `uid` 到 `rooms/{code}/hostUid`，再把 `live` 的 `.write` 改成
   `auth.uid === data.parent().child('hostUid').val()`。
7. **Rules 上線前要實測**：用規則模擬器確認「觀眾寫不到 `live`、讀得到 `live`、
   寫得到自己的 `answers/{voteId}/{自己的token}`」。

---

## 11. 把邏輯與畫面拆開（讓它能測）

本專案的慣例：**規則寫成純函式、不碰 DOM 與 Firebase**，用 `node --test` 測：

- `next-round.js`、`crack-word-engine.js`、`talk-engine.js` 都是這樣。
- 檔案結尾用一行 `module.exports` 判斷，同時支援瀏覽器 `<script>` 與 `require()`（以 `next-round.js` 為例）：
  ```js
  if (typeof module !== 'undefined' && module.exports) module.exports = NEXT_ROUND;
  ```
- 簡報專案建議把這些做成純函式：
  - `tally(answers, options)` → 各選項票數
  - `scoreQuiz(answers, correct, closesAt)` → 每人得分（速度加權）
  - `payloadFor(slide, viewer)` → 這位觀眾該看到什麼

測試指令：`node --test tests/*.test.cjs`（Node 20+，沒有任何相依套件）。

---

## 12. 實作清單

**開工前**
- [ ] 建 Firebase 專案（免費 Spark 方案），開 Realtime Database，貼上 Rules。
- [ ] 把 web config 放進 `firebase-config.js`。
- [ ] 載入 Firebase **compat** SDK：`firebase-app-compat.js` 與 `firebase-database-compat.js`
      （本專案用 `10.14.1`，從 `gstatic.com` 載入，沒有 build step）。

**主持人端**
- [ ] 房號與 token 產生，存 `localStorage`。
- [ ] `payloadFor` 預設全 `null`，逐項開放。
- [ ] 每個一次性動作有自己的 id，處理時就作廢。
- [ ] 三層驗證（id／狀態／身分），不過就丟掉。
- [ ] 處理完 `clearAnswer`。
- [ ] 計時器用牆上時鐘，只在狀態改變時推送。
- [ ] 所有 listener 的 callback 包 `try/catch`。

**觀眾端**
- [ ] 沒有 `data` 時顯示「等待主持人」，不是空白。
- [ ] 本機 UI 狀態（對話框、已選項）放在 `data` 之外。
- [ ] `visibilitychange` 回前景時 `once('value')` 補讀。
- [ ] 按鈕按下立刻停用；久未回應顯示提示。
- [ ] 手機寬度（320–390px）驗證版面不溢位；大字用量測縮字級。

**上線前**
- [ ] 用真的手機（含 iPad Safari）測：鎖屏 → 回來、切 App → 回來、斷網 → 恢復。
- [ ] 打開螢幕分享，確認畫面上沒有任何答案或個人資料。
- [ ] 確認 Rules 在模擬器中的讀寫行為。

---

## 13. 已知限制（請在設計時就接受它們）

1. **信任主持人**：主持人瀏覽器看得到全部資料。這不是防作弊系統。
2. **主持人頁面必須保持開啟**：關掉或被系統凍結，所有請求都沒人處理。
3. **Token 是不記名憑證**：連結外流就等於身分外流。
4. **沒有後端排程**：任何「時間到自動結算」都要靠主持人頁面或卡片各自算時鐘。
5. **Rules 無法驗證內容**：只能限制路徑，不能限制「寫進去的值是否合法」，所以合法性都靠主持人端驗證。

---

## 14. 想直接參考本專案的哪些檔案

| 想看什麼 | 檔案 | 位置提示 |
|---|---|---|
| 房號／token／發連結／QR／publish／update | `room.js` | `generateToken`、`attach`、`publish`、`update`、`clearAnswer` |
| 玩家頁面如何連線、重畫、補讀 | `play.html` | `renderCard`、`tryRenderCard`、檔尾的 Firebase 區塊 |
| 投影函式與請求處理 | `say-it-without-saying-it.html` | `payloadFor`、`handleAnswer`、`pushState`、`publishRound` |
| 一次性 id＋倒數閘門（純函式＋測試） | `next-round.js`、`tests/next-round.test.cjs` | `create()`、`open()`、`sync()` |
| Firebase Rules 與安全說明 | `firebase-config.js`、`SECURITY.md` | 檔頭註解 |
| 計時用伺服器時間 | `play.html` | `talkClockOffset`、`.info/serverTimeOffset` |

---

*撰寫依據：`livechat` repo 的實際程式碼。「簡報專案建議」一節（第 10 節）是設計提案，
並未在本專案實作或實測，上線前請自己驗證。*
