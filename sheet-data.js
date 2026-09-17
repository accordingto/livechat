/*
 * sheet-data.js — 讓 game-data.js 的題庫可以改成從一份 Google Sheet 讀取。
 *
 * 兩個角色，同一支檔案，八款遊戲頁與 index.html 都會載入（一定要排在
 * game-data.js 之後）：
 *
 *   1. 載入即套用。每一頁開啟時 apply() 會把 localStorage 裡上次成功抓下來
 *      的題庫合併進 GAME_DATA。沒有抓過、或抓下來的資料壞了，就完全不動，
 *      GAME_DATA 維持 game-data.js 的預設題庫。
 *   2. 抓取。只有 index.html 的 Step 2 那顆按鈕會呼叫 load()，也就是說
 *      **只有主持人主動按下去的那一刻才會連線 Google**，其餘任何時候
 *      （每一頁載入、每一次發牌）都只讀 localStorage，不發任何網路請求。
 *
 * 失敗一律退回預設，而且是**逐個資料集**退：Google 連不上、某個分頁不存在、
 * 某個分頁欄位對不上、某個分頁是空的——這些都只影響那一個資料集，其餘抓成功
 * 的照樣套用。整份抓不到就是八款遊戲全部照原本的預設題庫跑，主持人不會開天窗。
 *
 * 讀法是 Google 的 gviz CSV 端點（試算表要設成「知道連結的人皆可檢視」）：
 *   https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={分頁名}
 * 用分頁「名稱」而不是 gid，主持人才不必為了 11 個分頁去抄 11 組 gid；
 * 分頁名稱必須等於下面 SCHEMA 的 key，也就是 GAME_DATA 的 key。
 */
(function () {
  const STORE_KEY = 'icebreak-sheet-data.v1';

  /* 本站的題庫試算表。這是寫死的、唯一的來源——主持人不用（也不能）在畫面上
     指定別的網址，按下按鈕就是讀這一份。要換成別份試算表，改這一行即可。
     這份試算表開放給協作者編輯，所以它同時要滿足兩種權限：編輯者各自被加入
     編輯權限，以及「知道連結的任何人 → 檢視者」，後者才是這支程式讀得到的原因。 */
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1mDZjPYgrT-tmKWDkrn2jUEZ_gbVJ37lLEaRuvvbXH6g/edit';

  /* 每個資料集的欄位定義。cols = 試算表的標題列（順序就是欄位順序），
     required = 這幾欄是空的就跳過該列，build = 把一列組成 GAME_DATA 要的物件。
     這份 SCHEMA 同時也是產生範本 .xlsx 的依據，兩邊永遠一致。 */
  const SCHEMA = {
    hottake: {
      cols: ['text'],
      required: ['text'],
      build: r => r.text,                       // 這款是純字串陣列，不是物件
    },
    sophies: {
      cols: ['cat', 'situation', 'a', 'b'],
      required: ['situation', 'a', 'b'],
      build: r => ({ cat: r.cat, situation: r.situation, a: r.a, b: r.b }),
    },
    persuade: {
      cols: ['cat', 'judge', 'emoji', 'team', 'situation'],
      required: ['judge', 'team', 'situation'],
      build: r => ({ cat: r.cat, judge: r.judge, emoji: r.emoji, team: r.team, situation: r.situation }),
    },
    wordwolf: {
      cols: ['cat', 'emojiA', 'emojiB', 'a', 'b'],
      required: ['a', 'b'],
      build: r => ({ cat: r.cat, emojiA: r.emojiA, emojiB: r.emojiB, a: r.a, b: r.b }),
    },
    scene: {
      cols: ['cat', 'emoji', 'title', 'situation',
             'a_label', 'a_hint', 'b_label', 'b_hint', 'c_label', 'c_hint',
             'd_label', 'd_hint', 'e_label', 'e_hint', 'f_label', 'f_hint'],
      required: ['title', 'situation', 'a_label', 'b_label'],
      build: r => {
        const o = { cat: r.cat, emoji: r.emoji, title: r.title, situation: r.situation };
        const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
        const given = keys
          .filter(k => r[k + '_label'])
          .map(k => ({ label: r[k + '_label'], hint: r[k + '_hint'] || '' }));
        /* 六個角色一定要補滿：房間可以開到 6 人，而 youre-in-the-scene.html
           的 renderRoleGrid() 是照「房間人數」跑迴圈的，少一個角色就會在
           role.label 上丟 TypeError 讓整頁當掉（實測過）。填不滿的欄位用
           已填的循環補上——兩個人演同一個角色只是重複，不會壞。 */
        keys.forEach((k, i) => { o[k] = given[i] || given[i % given.length]; });
        return o;
      },
    },
    forbidden: {
      cols: ['word', 'emoji'],
      required: ['word'],
      build: r => ({ word: r.word, emoji: r.emoji || '🔍' }),
    },
    conquest: {
      cols: ['type', 'cat', 'text', 'seconds'],
      required: ['text'],
      build: r => ({ type: r.type, cat: r.cat, text: r.text, seconds: num(r.seconds, 45) }),
    },
    conquestTruth: {
      cols: ['type', 'cat', 'text', 'seconds'],
      required: ['text'],
      build: r => ({ type: r.type, cat: r.cat, text: r.text, seconds: num(r.seconds, 45) }),
    },
    taboo: {
      cols: ['level', 'emoji', 'word',
             'forbidden1', 'forbidden2', 'forbidden3', 'forbidden4', 'forbidden5', 'forbidden6'],
      required: ['word'],
      build: r => ({
        level: ['easy', 'medium', 'hard'].includes(String(r.level).toLowerCase())
          ? String(r.level).toLowerCase() : 'medium',
        emoji: r.emoji || '💬',
        word: r.word,
        forbidden: [1, 2, 3, 4, 5, 6].map(i => r['forbidden' + i]).filter(Boolean),
      }),
    },
    kangaroo: {
      cols: ['emoji', 'charge'],
      required: ['charge'],
      build: r => ({ emoji: r.emoji || '⚖️', charge: r.charge }),
    },
    kangarooWitness: {
      cols: ['emoji', 'name', 'evidence'],
      required: ['name', 'evidence'],
      build: r => ({ emoji: r.emoji || '🕵️', name: r.name, evidence: r.evidence }),
    },
  };

  const TABS = Object.keys(SCHEMA);

  /* 試算表的內容會被各遊戲頁直接塞進 innerHTML，而這份試算表是開放給別人
     編輯的，所以任何一個編輯者本來都能在主持人畫面與玩家卡片上執行任意
     程式碼（實測 `<img src=x onerror=…>` 真的會跑）。這裡在「解析的當下」
     就把 < 與 > 拿掉，讓題目一律是純文字。
     為什麼是拿掉而不是轉義成 &lt;：消費端三種寫法都有——`play.html`
     自己會 esc()（轉義過的字串再轉一次會變成 &amp;lt;）、`kangaroo-court.html`
     用 textContent（會把 &lt; 原封不動印出來）、其餘頁面直接 innerHTML。
     只有「純文字、不含 < >」這一種形式在三種寫法下都正確。
     也不是只擋惡意：題目裡打一個 `cats < dogs` 的 < 一樣會讓版面解析錯亂。 */
  const clean = v => String(v == null ? '' : v).replace(/[<>]/g, '').trim();

  function num(v, fallback) {
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  /* ── CSV ──
     自己寫一個而不是用 split(',')：題目裡本來就有逗號、引號與換行
     （例如 kangaroo 的罪名幾乎每條都有逗號），split 會把它們切爛。 */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    // 去掉 BOM，把 \r\n 正規化成 \n
    text = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }   // "" = 一個字面引號
          else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* gviz 不是每次都回 CSV：查詢被拒、分頁權限不對、或是被導去登入頁時，它會回
     一段 JS（開頭是那個著名的 O_o 註解，接著 google.visualization.Query.setResponse
     包一包 status 是 error 的 JSON）或一整頁 HTML。那些東西餵給 CSV 解析器不會
     噴錯，只會解析出一列莫名其妙的「標題」，然後被回報成「標題列缺少必填欄位」
     ——把主持人送去檢查一份根本沒問題的試算表。先認出這兩種回應，講實話。 */
  function notCSV(text) {
    const head = String(text || '').replace(/^﻿/, '').trimStart().slice(0, 300);
    if (/^\/\*O_o\*\/|google\.visualization\.Query\.setResponse/.test(head)) {
      /* 依序試，不要寫成一條 alternation：JSON 裡 "reason" 排在
         "detailed_message" 前面，一條 regex 會先撞上機器代碼（access_denied），
         把真正寫給人看的那句蓋掉。 */
      let why = '';
      for (const k of ['detailed_message', 'message', 'reason']) {
        const m = head.match(new RegExp('"' + k + '":"([^"]{1,120})"'));
        if (m && m[1]) { why = m[1].replace(/\\u003c|\\u003e/g, ''); break; }
      }
      return 'Google 拒絕了這個分頁的查詢' + (why ? '：' + why : '');
    }
    if (/^<(?:!doctype|html|\?xml)/i.test(head)) {
      return '拿到的是網頁而不是資料（試算表可能沒設成「知道連結的人皆可檢視」）';
    }
    return null;
  }

  /* 一個分頁的 CSV → 乾淨的物件陣列。回傳 { rows, skipped } 或丟出錯誤。 */
  function parseTab(tab, csv) {
    const spec = SCHEMA[tab];
    const bad = notCSV(csv);
    if (bad) throw new Error(bad);

    const table = parseCSV(csv).filter(r => r.some(c => String(c).trim() !== ''));
    if (!table.length) return { rows: [], skipped: 0 };

    const header = table[0].map(h => String(h).trim());
    const keyOf = {};
    header.forEach((h, i) => { keyOf[h.toLowerCase()] = i; });

    const missing = spec.required.filter(c => !(c.toLowerCase() in keyOf));
    if (missing.length) {
      /* 把「實際收到的標題列」一起印出來。少了這一段，畫面上只會說缺哪一欄，
         但缺的原因幾乎都是「這一列根本不是標題列」，光看訊息看不出來。 */
      const got = header.filter(Boolean).slice(0, 6).join('、') || '（空白）';
      throw new Error('標題列缺少必填欄位：' + missing.join('、') + '（實際讀到的標題列是：' + got + '）');
    }

    const rows = [];
    let skipped = 0;
    for (let i = 1; i < table.length; i++) {
      const line = table[i];
      const r = {};
      spec.cols.forEach(c => {
        const idx = keyOf[c.toLowerCase()];
        r[c] = idx === undefined ? '' : clean(line[idx]);
      });
      if (spec.required.some(c => !r[c])) { skipped++; continue; }
      rows.push(spec.build(r));
    }
    return { rows, skipped };
  }

  /* 從主持人貼進來的網址取出試算表 ID。接受完整編輯網址、分享網址或純 ID。 */
  function sheetId(input) {
    const s = String(input || '').trim();
    if (!s) throw new Error('請先貼上 Google Sheet 網址');
    if (/\/spreadsheets\/d\/e\//.test(s)) {
      // 「發布到網路」給的是另一組 ID，gviz 讀不到，要用一般的分享網址
      throw new Error('這是「發布到網路」的網址，請改用瀏覽器網址列上的一般試算表網址');
    }
    const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;      // 直接貼 ID
    throw new Error('看不出這是 Google Sheet 網址');
  }

  /* headers=1 是必要的，不是保險：不給這個參數時 gviz 會**自己猜**每個分頁有幾列
     標題，而且是逐個分頁各猜各的。猜錯的那一個分頁，第一列資料會被當成標題列，
     於是這支程式看不到 word／text 這些欄位名，回報「標題列缺少必填欄位」——但
     試算表本身完全正常，主持人怎麼檢查都找不到問題（實際回報過：11 個分頁裡
     只有 taboo 這一個失敗，它的標題列明明就是 level／emoji／word）。11 個分頁
     的格式都是固定的一列標題，所以直接寫死，不讓它猜。 */
  const csvUrl = (id, tab) =>
    'https://docs.google.com/spreadsheets/d/' + id +
    '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(tab);

  /* ── localStorage ── */
  function read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return o && o.data && typeof o.data === 'object' ? o : null;
    } catch (e) { return null; }
  }

  function write(o) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); return true; }
    catch (e) { return false; }   // 配額爆了就當作沒抓過，照樣跑預設
  }

  /* ── 套用到 GAME_DATA ──
     只覆蓋真的有資料的資料集；GAME_DATA 是 const，所以改的是它的屬性。 */
  let applied = null;
  function apply() {
    applied = null;
    if (typeof GAME_DATA === 'undefined') return null;
    const store = read();
    if (!store) return null;
    const used = {};
    TABS.forEach(tab => {
      const rows = store.data[tab];
      if (Array.isArray(rows) && rows.length) {
        GAME_DATA[tab] = rows;
        used[tab] = rows.length;
      }
    });
    applied = Object.keys(used).length ? { url: store.url, loadedAt: store.loadedAt, used } : null;
    return applied;
  }

  /* ── 抓取（只有 index.html 的按鈕會呼叫）──
     11 個分頁各自獨立抓、獨立失敗；onProgress(tab, result) 讓 UI 邊抓邊顯示。 */
  async function load(input, onProgress) {
    const id = sheetId(input || SHEET_URL);     // 不給網址就是讀本站那一份
    const results = {};
    const data = {};

    await Promise.all(TABS.map(async tab => {
      let res;
      try {
        const r = await fetch(csvUrl(id, tab), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const { rows, skipped } = parseTab(tab, await r.text());
        if (rows.length) { data[tab] = rows; res = { ok: true, count: rows.length, skipped }; }
        else res = { ok: false, reason: 'empty' };
      } catch (e) {
        res = { ok: false, reason: 'error', message: String(e.message || e) };
      }
      results[tab] = res;
      if (onProgress) onProgress(tab, res);
    }));

    const loaded = Object.keys(data).length;
    let stored = true;
    if (loaded) {
      // write() 失敗（配額爆掉／隱私模式）時什麼都沒存下來，呼叫端要知道，
      // 否則畫面會顯示「已套用 N 個資料集」但各遊戲頁其實全部用內建題庫
      stored = write({ url: String(input || SHEET_URL).trim(), loadedAt: Date.now(), data });
      apply();
    }
    return { loaded, total: TABS.length, stored, results };
  }

  function clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    applied = null;
    // GAME_DATA 已經被覆蓋掉的資料集要等重新載入頁面才會回到預設值，
    // 呼叫端（index.html）按下「恢復預設」之後會自己 reload。
  }

  function info() {
    const store = read();
    if (!store) return null;
    const counts = {};
    TABS.forEach(t => { if (Array.isArray(store.data[t]) && store.data[t].length) counts[t] = store.data[t].length; });
    return { url: store.url, loadedAt: store.loadedAt, counts };
  }

  window.SHEET_DATA = {
    SCHEMA, TABS, SHEET_URL,
    load, clear, info, apply,
    parseCSV, parseTab, sheetId, csvUrl,        // 給測試與 index.html 用
    get applied() { return applied; },
  };

  apply();   // 一載入就套用，各頁的 inline script 之後才會讀 GAME_DATA
})();
