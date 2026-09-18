/*
 * sheet-data.js 的分頁名稱與抓取路徑。
 *
 * 這一支存在的理由：分頁名稱從 GAME_DATA 的 key（taboo）改成遊戲名
 * （Say It Without Saying It）之後，「有沒有去要對的那個分頁」只有真的
 * 連上 Google 才看得出來，而那件事沒辦法在測試裡做。所以這裡把 fetch
 * 換掉，直接檢查它送出去的網址與最後資料落在哪個 key 上。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* game-data.js 的 `const GAME_DATA` 是檔案作用域的，require() 進來看不到，
   所以兩支串成同一個 script 在同一個 context 裡跑——跟瀏覽器一樣。 */
function loadSite(fetchImpl) {
  const store = new Map();
  const ctx = {
    console,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    fetch: fetchImpl,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const src = ['game-data.js', 'sheet-data.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
    // `const GAME_DATA` 是 script 的語彙綁定，不會變成 context 的屬性，
    // 測試拿不到；補一行把它掛上去（同一個物件，apply() 照樣改得到）
    + '\n;window.GAME_DATA = GAME_DATA;';
  vm.runInContext(src, ctx);
  return ctx;
}

const csv = rows => rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
const ok = body => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });
const miss = () => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });

const PICK_A_SIDE = csv([['text'], ['Cereal is a soup.'], ['Socks with sandals are fine.']]);

test('每個資料集的分頁名是遊戲名，key 仍是 GAME_DATA 的 key', () => {
  const { SHEET_DATA } = loadSite(miss);
  assert.equal(SHEET_DATA.tabName('taboo'), 'Say It Without Saying It');
  assert.equal(SHEET_DATA.tabName('hottake'), 'Pick a Side');
  assert.equal(SHEET_DATA.tabName('conquestTruth'), 'Dare Conquest - Truth');
  assert.equal(SHEET_DATA.tabName('forbidden'), 'Card Check');
  // 沒有登記 tab 的（理論上不會有）退回 key 本身，不會變成 undefined
  assert.equal(SHEET_DATA.tabName('nope'), 'nope');
});

test('分頁順序＝首頁遊戲清單的順序', () => {
  const { SHEET_DATA } = loadSite(miss);
  // 跨 vm realm，陣列的 prototype 不同，攤平成本地陣列再比
  assert.deepEqual([...SHEET_DATA.TABS], [
    'taboo', 'hottake', 'sophies', 'persuade', 'scene',
    'conquest', 'conquestTruth', 'kangaroo', 'kangarooWitness', 'forbidden',
  ]);
});

test('抓取時要的是遊戲名那個分頁，不是 key', async () => {
  const asked = [];
  const { SHEET_DATA } = loadSite(url => {
    asked.push(decodeURIComponent(new URL(url).searchParams.get('sheet')));
    return url.includes('Pick%20a%20Side') ? ok(PICK_A_SIDE) : miss();
  });
  await SHEET_DATA.load('https://docs.google.com/spreadsheets/d/abcdefghijklmnopqrstuvwxyz/edit');
  assert.ok(asked.includes('Pick a Side'), '應該去要「Pick a Side」這個分頁');
  assert.ok(asked.includes("Sophie's Choice"), '撇號不會被吃掉');
  assert.ok(!asked.includes('hottake'), '成功的分頁不該再去要一次舊名字');
});

test('資料落在 GAME_DATA 的 key 上，不是分頁名上', async () => {
  const ctx = loadSite(url => (url.includes('Pick%20a%20Side') ? ok(PICK_A_SIDE) : miss()));
  const out = await ctx.SHEET_DATA.load('abcdefghijklmnopqrstuvwxyz');
  assert.equal(out.loaded, 1);
  assert.deepEqual([...ctx.GAME_DATA.hottake], ['Cereal is a soup.', 'Socks with sandals are fine.']);
  assert.equal(ctx.GAME_DATA['Pick a Side'], undefined, '分頁名不可以變成 GAME_DATA 的欄位');
});

test('舊分頁名（＝key）還是讀得到——改名改到一半也不會開天窗', async () => {
  const asked = [];
  const { SHEET_DATA } = loadSite(url => {
    const tab = decodeURIComponent(new URL(url).searchParams.get('sheet'));
    asked.push(tab);
    return tab === 'hottake' ? ok(PICK_A_SIDE) : miss();   // 只有舊名字存在
  });
  const out = await SHEET_DATA.load('abcdefghijklmnopqrstuvwxyz');
  assert.equal(out.results.hottake.ok, true, '新名字讀不到時要退回舊名字');
  assert.equal(out.results.hottake.count, 2);
  assert.deepEqual([...asked.filter(t => t === 'Pick a Side' || t === 'hottake')],
                   ['Pick a Side', 'hottake'], '先試新名字，失敗才試舊的');
});

test('兩個名字都讀不到才算失敗，而且只影響那一個資料集', async () => {
  const { SHEET_DATA } = loadSite(url => {
    const tab = decodeURIComponent(new URL(url).searchParams.get('sheet'));
    return tab === 'Pick a Side' ? ok(PICK_A_SIDE) : miss();
  });
  const out = await SHEET_DATA.load('abcdefghijklmnopqrstuvwxyz');
  assert.equal(out.results.hottake.ok, true);
  assert.equal(out.results.taboo.ok, false, '抓不到的那一個退回內建題庫');
  assert.equal(out.loaded, 1);
  assert.equal(out.total, 10);
});

test('進度回呼報的是主持人在試算表上看得到的名字', async () => {
  const seen = [];
  const { SHEET_DATA } = loadSite(url => (url.includes('Pick%20a%20Side') ? ok(PICK_A_SIDE) : miss()));
  await SHEET_DATA.load('abcdefghijklmnopqrstuvwxyz', tab => seen.push(tab));
  assert.ok(seen.includes('Say It Without Saying It'));
  assert.ok(!seen.includes('taboo'), '畫面上不該出現內部 key');
  assert.equal(seen.length, 10);
});
