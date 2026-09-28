# 安全檢查清單

所有遊戲現在都是純前端靜態網站，沿用既有 Firebase bearer 路徑規則。
**聊天狼人 v2** 使用 `rooms/chatwolf-{CODE}`，主持完整狀態存於只有主持裝置
知道的隨機 token 路徑；每位玩家另有自己的投影與操作路徑。這些路徑不可列舉，
但知道 token 即可讀寫。因此必須信任主持人及保管好裝置重連資料。
房主介面不顯示別人的秘密，不等於開發工具也無法讀取。見 `chat-wolf-mode.md`。

Firebase 專案：`livechat-92f66`（新加坡區）
Console：https://console.firebase.google.com/project/livechat-92f66

---

## ① 資料庫沒有對外開放（最重要）

瀏覽器開這條網址：

```
https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app/.json
```

| 看到什麼 | 意思 |
|---|---|
| `{"error":"Permission denied"}` | ✅ 正常 |
| 一大包 `{"rooms":{...}}` | ❌ 資料庫對全世界開放，立刻做下面的「修復」 |

再測一層（不需要真的房號，`AAAAAA` 是隨便打的）：

```
https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app/rooms/AAAAAA/players.json
```

| 看到什麼 | 意思 |
|---|---|
| `{"error":"Permission denied"}` | ✅ 正常 |
| `null` | ❌ 讀取權限掛太高層。root 雖然鎖著，但知道房號的人可以列出房間裡每個人的牌（臥底字、Say It Without Saying It 目標字）|

**修復：** 開 Rules 分頁
https://console.firebase.google.com/project/livechat-92f66/database/livechat-92f66-default-rtdb/rules
把整份內容換成：

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        "players": {
          "$token": { ".read": true, ".write": true }
        },
        "roster": { ".read": true, ".write": true }
      }
    },
    "chatWolfRooms": {
      ".read": false,
      ".write": false
    }
  }
}
```

按 Publish，回頭重測上面兩條網址。

關鍵在於 `.read` / `.write` 必須掛在 `$token` **這一層**，不能掛在 `players` 或 `$roomCode` 上。
Firebase 不允許讀取「權限規則在下層」的節點，所以這樣寫的效果是：知道自己 token 的人只能讀寫自己那一格，
無法列出房間裡有誰、也讀不到別人的牌。玩家 token 是 `crypto.getRandomValues()` 產的 80 bits 隨機值
（見 `room.js` 的 `generateToken()`），猜不出來。

聊天狼人不使用 `chatWolfRooms`，該路徑繼續維持拒絕存取。不需改 Rules、
建立服務帳號或設定 Vercel 環境變數。新房間的 `roster` 只放 RSA-OAEP 公鑰和
加密加入請求；玩家 token 不得明文放進該公共節點。主持控制 token 不出現在
邀請連結或玩家投影。這些措施避免一般玩家直接取得其他牌卡，但不能抵抗
惡意房主、已外洩的 token，或有人刻意竄改公共加入節點；它延續舊版誠信玩法。

> ⚠️ Firebase 建立資料庫時如果選 "test mode"，預設規則是全開、30 天後失效。
> 千萬不要停在那個狀態。

---

## ② Firebase 方案是 Spark（免費）

https://console.firebase.google.com/project/livechat-92f66/usage

遊戲設計上資料庫必須允許匿名寫入，所以任何知道 `databaseURL` 的人都能灌資料。

- **Spark**：撞到免費額度就停止服務，帳單為零。遊戲暫時不能玩，但不會被扣錢 → 可接受
- **Blaze**（按用量計費）：被惡意灌爆會產生費用 → 去 Google Cloud 設預算上限與提醒

---

## ③ `main` 的 branch protection（選配，private repo 可能無法使用）

> 2026-09-27 已實際確認 repo 為 public。此項屬可選維護設定，不是上傳前置條件。

目前 `CLAUDE.md` 的規則是「直接 commit push 到 `main`」，push 完 Vercel 就自動部署到 production，
中間沒有 review。方便，但也代表 AI 助理或任何自動化能直接改到線上版本。

想加一道煞車就到
https://github.com/accordingto/livechat/settings/branches
對 `main` 加規則：Require a pull request before merging、禁止 force push。
之後所有變更都得先推分支、在 GitHub 上看過 diff 才能合併。

以這個專案的性質（破冰遊戲、不存使用者個資、壞了重推就好）這一項不是必須，自行衡量。

---

## ④ GitHub 帳號本身

repo 為 public，原始碼可以公開讀取；寫入仍需要 GitHub 已授予的權限。
本機 Git 憑證已成功推送 main，不需要再次要求擁有者核准上傳。

所以這裡唯一的風險是帳號被盜：

- 確認 2FA 已開啟：https://github.com/settings/security
- 定期看一眼授權清單，把不認識的移除：https://github.com/settings/installations

另外，本機留一份 clone 當備援（`git clone` 出來就是完整歷史，repo 真的出事也推得回去）。

---

## 不需要處理的事

這些看起來可疑，但實際上沒問題，不用花時間：

- **`firebase-config.js` 裡的 `apiKey` 被 commit 進去** — Firebase 的 web apiKey 是**公開識別碼，不是密碼**。
  repo 與**部署出去的檔案都是公開的**：
  https://livechat-two-alpha.vercel.app/firebase-config.js 任何人都打得開。
  靜態網站沒辦法把它藏起來，也不需要藏。真正的防線是上面 ① 的 Rules。
- **`roster` 路徑開放讀寫** — 現在已經沒有任何程式讀或寫它（它只服務過 Word Wolf 的投票按鈕，
  那款遊戲已移除），Rules 留著是為了讓還開著的舊分頁不會中途開始寫入失敗。就算有人往裡面寫東西也
  無所謂：它從來只存玩家編號與名字，那些本來就顯示在主持人分享的螢幕上，祕密字與作答一直都在
  `players` 底下、鎖在各自的 token。
- **玩家 token 出現在網址列** — 80 bits 加密級隨機值，不可猜測；這就是設計本身。

---

## 什麼時候該重跑這份清單

- 換 Firebase 專案、改 `firebase-config.js` 的時候
- 在 Firebase Console 動過 Rules 之後
- 新增會寫入 Firebase 的遊戲之後（確認它只走 `rooms/{code}/players/{token}` 路徑）
- 沒事的話，半年一次
