/* bingo-party-host.js — 雙選賓果 host page: open the lobby on the Hub's
 * existing links, then show the PUBLIC stage (safe to share on screen) with
 * the host tools. The page holds the trusted authority while it is open; a
 * participating host can instead keep only their own card open in this same
 * browser and it takes over (bingo-party-sync.js). */
(() => {
  'use strict';
  const E = BINGO_ENGINE, S = BINGO_SYNC, UI = BINGO_UI;
  const $ = id => document.getElementById(id);
  const H = {
    setupNeeded: ['先在 Hub 設定房間', 'Set up the room in the Hub first'],
    setupNeededText: ['這款遊戲沿用 Hub 的房號與玩家連結。請先回首頁設定人數並把連結傳給大家。', 'This game reuses the Hub room code and player links. Set the player count and send the links from the Hub first.'],
    setUpRoom: ['前往設定房間', 'Set up the room'],
    seatsTitle: ['玩家連結與房間管理', 'Player links & room'],
    seatsText: ['大家用原本的玩家連結就能進來；開大廳後在下方分隊、選設定再開始。中途加入的人先當觀眾，下局再參賽。', 'Everyone joins with their usual player link. Open the lobby, then set teams and options below. Late arrivals watch first and play next game.'],
    extraText: ['Hub 最多 9 個連結。要 10–12 人時，在這裡加開本遊戲專用座位，把連結私訊給對方。', 'The Hub has up to 9 links. For 10–12 players, add bingo-only seats here and send each link privately.'],
    extraAdd: ['＋ 加開一個座位', '+ Add a seat'], extraRemove: ['－ 移除最後一個', '− Remove the last'], copy: ['複製連結', 'Copy link'], copied: ['已複製', 'Copied'],
    hostNote: ['主持人若也參賽，可在大廳把「主持座位」設成自己；之後只開著自己的玩家卡（同一個瀏覽器）也能繼續主持。主持人只主持時，這一頁要保持開著。', 'If you also play, set the host seat to yourself in the lobby; your own card (in this same browser) can then run the game without this page. If you only host, keep this page open.'],
    openLobby: ['開啟大廳', 'Open the lobby'], reopenLobby: ['用目前名單重開大廳', 'Reopen the lobby with the current seats'],
    syncRoster: ['同步名單（新加入者當觀眾）', 'Sync seats (newcomers watch)'], reclaim: ['把所有卡片帶回這款遊戲', 'Bring every card back to this game'],
    takeover: ['在這一頁接手主持', 'Run the game from this page'],
    rules: ['玩法', 'How to play'],
    rule1: ['兩隊各有一張 5×5 棋盤（1–25，各隊排列不同，只看得到自己的）。標準局先達 3 條線，快玩 2 條線。', 'Each team has its own 5×5 board (1–25, different layouts, private). Standard: first to 3 lines; quick: 2.'],
    rule2: ['每回合先公布關卡類型，兩隊各自秘密投票提名一個還沒叫過的號碼，再同時揭曉。', 'Each round announces the challenge type; each team secretly votes for an uncalled number, then both are revealed together.'],
    rule3: ['五種關卡輪流：默契猜人、接歌接力、導演出招、故事交換與點歌、禁詞傳話。', 'Five challenge types rotate: Guess Your Teammate, Song Relay, Live Director, Story & Song Swap, Taboo Relay.'],
    rule4: ['結果只有 A、B、兩隊、都沒過：分別叫 A 的號、B 的號、兩個都叫、或本輪保底隊的號。', 'Results are A, B, Both or Neither: call A’s number, B’s, both, or this round’s fallback team’s.'],
    rule5: ['被叫的號碼兩隊一起圈。同回合兩隊都達標就是共同勝利。', 'Every called number marks both boards. Both teams reaching the target in one round is a shared win.'],
    rule6: ['聲音仍用你們原本的通話；網站不錄音、不辨識聲音，唱歌與表演由主持判定。', 'Voices stay in your usual call. Nothing is recorded or recognised; the host judges songs and scenes.'],
    room: ['房號 {code}', 'Room {code}'],
    status_connecting: ['連線中…', 'Connecting…'], status_offline: ['連線中斷，重新連線中…', 'Offline — reconnecting…'],
    status_other_host: ['同一個瀏覽器的另一個分頁或主持卡正在主持；這頁只顯示畫面。', 'Another tab or the host card in this browser is running the game; this page only shows it.'],
    status_switched: ['有玩家卡片已切到別的遊戲。', 'Some player cards now show another game.'], status_error: ['同步發生錯誤，稍後自動重試。', 'Sync error — retrying.'],
    noFirebase: ['沒有設定 Firebase，無法發送私人卡片。', 'Firebase is not configured, so private cards cannot be sent.'],
    needFour: ['至少需要 4 個座位。', 'At least 4 seats are needed.'], seatLabel: ['座位 {n}', 'Seat {n}'], extraLabel: ['加開座位 {n}', 'Extra seat {n}'],
    rosterSynced: ['名單已同步。', 'Seats synced.'],
  };
  if (typeof I18N !== 'undefined') I18N.registerDict('bingohost', Object.fromEntries(Object.entries(H).map(([k, [zh, en]]) => [k, { zh, en }])));
  // A device that never chose a language sees this game in Traditional
  // Chinese without changing the saved Hub preference.
  try { if (!localStorage.getItem('site-lang') && typeof I18N !== 'undefined') { I18N.setLang('zh'); localStorage.removeItem('site-lang'); } } catch (e) {}
  const ht = (key, vars) => { let s = I18N.t('bingohost', key); if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v)); return s; };

  let code = null, saved = null, authority = null, stage = null, state = null, status = 'connecting', setupCollapsed = false;
  try { code = localStorage.getItem('room-last-session'); } catch (e) {}
  saved = code ? S.savedRoom(code) : null;

  function seats() { return S.seatsFrom(S.savedRoom(code)); }
  function cardURL(seat) {
    const url = new URL(`play.html?s=${code}&p=${seat.token}`, location.href);
    if (seat.name) url.searchParams.set('n', seat.name);
    return url.href;
  }
  function renderSeats() {
    const list = $('bp-seats');
    list.innerHTML = '';
    for (const seat of seats().filter(s => s.playerNum <= 9)) {
      const li = document.createElement('li');
      li.textContent = `${seat.playerNum}. ${seat.name || ht('seatLabel', { n: seat.playerNum })}`;
      list.appendChild(li);
    }
    const count = Number(saved?.playerCount || saved?.tokens?.length || 0);
    $('bp-extra').hidden = count !== 9;
    const extra = (S.savedRoom(code)?.[S.EXTRA_KEY] || []).slice(0, 3);
    const box = $('bp-extra-list');
    box.innerHTML = '';
    extra.forEach((x, i) => {
      const li = document.createElement('li');
      const label = document.createElement('span'); label.textContent = `${10 + i}.`;
      const input = document.createElement('input'); input.type = 'text'; input.maxLength = 40; input.value = x.name || ''; input.placeholder = ht('extraLabel', { n: 10 + i });
      input.setAttribute('aria-label', ht('extraLabel', { n: 10 + i }));
      input.addEventListener('change', () => { const all = extraSeats(); all[i].name = input.value.trim(); saveExtra(all); });
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'bp-btn'; copy.textContent = ht('copy');
      copy.addEventListener('click', () => {
        const text = cardURL({ token: x.token, name: input.value.trim() });
        const done = () => { copy.textContent = ht('copied'); setTimeout(() => { copy.textContent = ht('copy'); }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(() => prompt('', text)); else prompt('', text);
      });
      li.append(label, input, copy);
      box.appendChild(li);
    });
    $('bp-extra-add').disabled = extra.length >= 3;
    $('bp-extra-remove').disabled = extra.length === 0;
  }
  function extraSeats() { return (S.savedRoom(code)?.[S.EXTRA_KEY] || []).slice(0, 3).map(x => ({ token: x.token, name: x.name || '' })); }
  function saveExtra(all) { ROOM.setExtra(S.EXTRA_KEY, all); renderSeats(); }

  function renderPanels() {
    if (state && !setupCollapsed) { $('bp-open').open = false; setupCollapsed = true; }
    const playing = state?.phase === 'playing';
    const needsAction = status === 'switched' || status === 'other_host';
    if (needsAction) $('bp-open').open = true;
    // During play the shared stage stays clean unless the host must act here.
    $('bp-open').hidden = !authority || (playing && !needsAction && !seats().some(s => !E.list(state?.roster).some(p => p.playerNum === s.playerNum)));
    $('bp-open-lobby').textContent = state ? ht('reopenLobby') : ht('openLobby');
    $('bp-open-lobby').hidden = playing;
    const roster = new Set(E.list(state?.roster).map(p => p.playerNum));
    const missing = seats().filter(s => !roster.has(s.playerNum));
    $('bp-sync-roster').hidden = !playing || !missing.length;
    $('bp-reclaim').hidden = status !== 'switched';
    $('bp-takeover').hidden = status !== 'other_host';
    $('bp-status').textContent = ['ready'].includes(status) ? '' : ht('status_' + status) || '';
  }
  function render() {
    renderPanels();
    if (!stage) return;
    stage.update(state ? E.view(state, 'host') : null);
  }
  async function send(type, extra) {
    try { await authority.command(type, extra); return { error: '' }; }
    catch (e) { return { error: e.message || 'error' }; }
  }

  function boot() {
    if (!code || !saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) { $('bp-setup-needed').hidden = false; return; }
    ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#2d5744', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 5 });
    $('bp-room-label').textContent = ht('room', { code });
    if (!ROOM.enabled) { $('bp-status').textContent = ht('noFirebase'); return; }
    authority = new S.Authority({ db: firebase.database(), code, label: 'page',
      onState: next => { state = next; render(); },
      onStatus: next => { status = next; renderPanels(); } });
    authority.connect();
    stage = new UI.Card($('bp-stage'), { send, now: () => authority.now(), stage: true, hostPage: true });
    renderSeats(); renderPanels();
    $('bp-open-lobby').addEventListener('click', async () => {
      const list = seats();
      if (list.length < 4) { $('bp-open-note').textContent = ht('needFour'); return; }
      $('bp-open-lobby').disabled = true; $('bp-open-note').textContent = '';
      try { await authority.openLobby({ seats: list }); }
      catch (e) { $('bp-open-note').textContent = UI.errText(e.message); }
      finally { $('bp-open-lobby').disabled = false; }
    });
    $('bp-sync-roster').addEventListener('click', async () => {
      const roster = new Set(E.list(state?.roster).map(p => p.playerNum));
      const list = seats();
      const add = list.filter(s => !roster.has(s.playerNum)).map(s => ({ playerNum: s.playerNum, name: s.name || ht('seatLabel', { n: s.playerNum }) }));
      try {
        if (add.length) await authority.command('addSeats', { seats: add });
        authority.watchSeats();
        $('bp-open-note').textContent = ht('rosterSynced');
      } catch (e) { $('bp-open-note').textContent = UI.errText(e.message); }
    });
    $('bp-reclaim').addEventListener('click', () => authority.reclaim());
    $('bp-takeover').addEventListener('click', () => authority.takeover());
    $('bp-extra-add').addEventListener('click', () => {
      const all = extraSeats(); if (all.length >= 3) return;
      all.push({ token: Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(16).padStart(2, '0')).join(''), name: '' });
      saveExtra(all);
    });
    $('bp-extra-remove').addEventListener('click', () => { const all = extraSeats(); all.pop(); saveExtra(all); });
    window.addEventListener('pagehide', () => authority?.close());
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    I18N.onChange(() => { renderSeats(); renderPanels(); stage?.rerender(); });
  }
  boot();
  // Read-only hook for the browser checks: the public stage's own view.
  window.BINGO_HOST = { view: () => state ? E.view(state, 'host') : null, get status() { return status; }, send,
    health: () => authority ? { own: authority.own, ticking: !!authority.ticking, connected: authority.connected, now: authority.now(), due: !!state && E.timerDue(state, authority.now()) } : null };
})();
