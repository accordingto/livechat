# 聊天狼人 v1

聊天狼人是 ICEBREAKING HUB 裡的獨立多人談話遊戲。它不分析語音、不控制外部
麥克風，也不呼叫 AI API。畫面上的「隨機指定」是伺服器以保存的亂數狀態，為每輪
產生一次不重複順序；重新整理不會重抽。

## 可玩流程

`LOBBY → ROLE_REVEAL → TALK → MEETING_DISCUSS → VOTING → TASK_REVIEW → FINISHED`

- 房主選 3–12 人（正式試玩建議 6–8）、1 至 `玩家數 - 2` 隻狼、是否開放搖鈴，
  以及 60／20／30 秒的三種預設計時。所有玩家以暱稱加入並準備；房主預設參與。
- 開局由伺服器洗牌身分並從六張合格任務抽兩張。全狼隊看到相同任務、備註與申報；
  村民及村民房主只看到自己的村民卡。
- 共六輪，每輪每人恰好一個位置。自己結束、逾時或房主跳過都記為已使用。
- 第 2、4 輪後各有一個中途會議槽。第 1 或第 3 輪第一次有效搖鈴會在整輪結束後
  提前使用對應槽，原定時間不再重開；第 6 輪後直接終局指認。
- 每次投票必須私下選滿狼人數。伺服器合計後取前 K 名；邊界同票使用房間保存的
  PRNG 只決定一次。個人選票不進公開投影，結算後也從活動狀態移除。
- 中途完整命中立即村民勝；未完整命中只公布正式名單與「遊戲繼續」，不公布命中數。
- 任務只能在 `TALK` 申報或取消。終局投票建立時凍結；若終局沒抓出狼人，才公開
  身分、任務與文字事件回顧，由房主依全房語音確認按有效／不成立。
- 終局命中＝村民勝；終局未命中且兩任務有效＝狼人勝；其餘＝平手。任務提早申報
  不會提前結束或通知村民。房主終止只得到「已取消」。

## 同步與秘密邊界

`api/chat-wolf.js` 是唯一資料入口。建立／加入時，每個瀏覽器得到一個 256-bit bearer
token；本機只把它存進 `chat-wolf-session:{CODE}` 供重連。資料庫保存 token 的
SHA-256 雜湊與 playerId 映射，邀請碼本身不能操作任何既有玩家。

每次動作在 Firebase Realtime Database 的單一房間 transaction 內完成，包括結束
發言、逾時補進度、搖鈴、提交選票、平票抽選與結算。所有裝置使用伺服器
`deadlineAt`；暫停時改存剩餘毫秒，繼續再建立新期限。若所有分頁暫時關閉，資料仍在
資料庫；下一次合法請求會依期限補進度。

API 回應分成：

- `public`：玩家、公開題目、目前順序、截止時間、已提交者、正式指認與允許揭曉的結果。
- `private`：自己的身分、自己的操作權限；只有狼人會得到狼隊與兩個任務。
- 不回傳：sessions 雜湊表、其他人的未揭曉角色、個人選票、原始資料庫房間。

Firebase Rules 必須讓 `chatWolfRooms` 對瀏覽器 `.read/.write` 都是 `false`。Admin SDK
會在 API 完成會話、成員、角色、階段與房主權限檢查後存取；不要在前端放服務帳號。

## 伺服器環境

安裝依賴：

```text
pnpm install
```

依 `.env.example` 設定：

```text
FIREBASE_SERVICE_ACCOUNT_JSON={完整服務帳號 JSON}
FIREBASE_DATABASE_URL=https://...firebasedatabase.app
```

正式 Vercel 專案需在 Production（以及要測試的 Preview）環境各設定一次，然後重新
部署。未設定時 API 固定回 `BACKEND_NOT_CONFIGURED`，前端會清楚顯示無法跨裝置開房，
不會退回假的 localStorage 展示模式。

本機若使用 Firebase Emulator，可設定 `FIREBASE_DATABASE_EMULATOR_HOST`、
`FIREBASE_PROJECT_ID` 與 Emulator database URL；不要讓測試碰正式玩家房間。

## 主要檔案

| 檔案 | 用途 |
|---|---|
| `chat-wolf.html` | 單一手機／桌面入口與安全標頭 |
| `chat-wolf.css` | 響應式遊戲介面 |
| `chat-wolf-copy.js` | 集中管理初版繁體中文介面文案 |
| `chat-wolf.js` | 加入、重連、輪詢、私人操作與畫面投影 |
| `api/chat-wolf.js` | Vercel API、token 驗證與 Firebase transaction |
| `api/_lib/chat-wolf-engine.cjs` | 純規則狀態機、六題與六任務資料、公開／私人投影 |
| `api/_lib/chat-wolf-store.cjs` | 僅伺服器載入的 Firebase Admin 連線 |
| `tests/chat-wolf-engine.test.cjs` | 核心規則與隱私測試 |

## 驗證

```text
pnpm test
```

核心測試涵蓋 6 人 2 狼秘密投影、單次發言、正常與提前會議、搖鈴防重複、中途完整
命中、任務共享／凍結、三種終局、平票持久化、全體棄權、重連、暫停與再玩一局。
部署後仍要另用不同瀏覽器與不同實機跑完整房間；Node 規則測試不等於已驗證真實網路、
Vercel 環境變數、Firebase Admin 權限或 Safari 背景切換。

### 2026-09-20 本機驗證

- 37 項全專案 Node 測試通過，其中聊天狼人包含 11 項純規則測試與 2 項獨立 HTTP
  會話整合測試。六個 HTTP 玩家同房時，兩狼共享相同任務，四村民收不到任務；兩個
  同時搖鈴請求只成功一次。
- 以記憶體開發伺服器、Codex IAB 與 Chrome 三個玩家身分實際操作：加入／準備、村民
  房主隱私、發牌確認、第一輪順序、延伸問題、輪末搖鈴、會議發言、選票鎖定、未投票
  逾時棄權、公布唯一名單後進第 2 輪，以及重新整理保留原玩家身分均通過。
- Chrome 390px 寬度下 `scrollWidth` 沒有超過 `clientWidth`；主持與玩家頁無 console
  error／warning。這是同一台電腦的不同瀏覽器，不是不同實機。
- `scripts/chat-wolf-dev-server.cjs` 與 `scripts/chat-wolf-test-bot.cjs` 僅供本機 QA；前者
  使用記憶體，後者只能控制自己新建的一個玩家會話。正式部署不會引用它們。
