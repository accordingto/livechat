# Kangaroo Court (Beta版)

這是原版 Kangaroo Court 的獨立副本，初始玩法、30 條罪名及 24 位證人均保留。

## 使用方式

從 IceBreak Hub 選單點選「Kangaroo Court (Beta版)」，或開啟此資料夾的 index.html。
先設定 4–9 位玩家，傳送這裡產生的 Beta 專用玩家連結，再進入遊戲。
請透過 HTTP 伺服器開啟；執行方式沿用專案根目錄的 README.md。

## 之後在哪裡修改

- kangaroo-court.html：主持人畫面、遊戲流程與規則。
- game-data.js：罪名、證人與核對卡用字。
- play.html：Beta 玩家的私人卡片與投票介面。
- guide-data.js：Beta 玩法說明（中英雙語）。
- index.html、room.js：Beta 房間設定、連結與同步。
- shared.css、i18n.js、guide.js：Beta 樣式、語言與說明畫面。

以上及 Firebase 設定、QR 函式庫、圖示均為本資料夾自己的檔案，不載入原版的本地程式或樣式。
未來 Beta 調整請限定在此資料夾；原版修改也不會自動套用到 Beta。

## 房間隔離

Beta 沿用同一個 Firebase 專案，但資料路徑為 rooms/kangaroo-beta-{CODE}/players/{token}，
原版仍使用 rooms/{CODE}/players/{token}。即使輸入相同房號，也不會讀寫原版的房間。
這沿用現有 rooms/$roomCode/players/$token 與 roster 規則，無須修改線上資料庫規則。
這是房間隔離，並非獨立 Firebase 專案；配額與服務設定仍共用。

本機房間設定使用 kangaroo-beta-room-session- 與 kangaroo-beta-room-last-session；
語言偏好使用 kangaroo-beta-site-lang。原版房間、人名、法官設定與語言偏好均保持獨立。
