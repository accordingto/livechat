/* rating.js — 情境評分元件（👍 / 👎，inline 版本）
   使用前須在同一頁先載入 supabase-config.js
   API:
     GAME_RATING.init(gameId)        — 頁面載入時呼叫一次
     GAME_RATING.showFor(scenarioId) — 題目揭曉後呼叫
     GAME_RATING.hide()              — 新一輪開始時呼叫        */

const GAME_RATING = (() => {

  /* ── 樣式 ── */
  function injectCSS() {
    if (document.getElementById('rating-styles')) return;
    const s = document.createElement('style');
    s.id = 'rating-styles';
    s.textContent = `
      .rating-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        animation: ratingIn .25s ease both;
      }
      @keyframes ratingIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rating-thumb {
        background: transparent;
        border: 2px solid rgba(255,255,255,.15);
        border-radius: 999px;
        cursor: pointer;
        padding: 13px 18px;
        transition: background .15s, border-color .15s, transform .1s;
        font-family: inherit;
        touch-action: manipulation;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .rating-thumb:hover:not(:disabled)      { transform: translateY(-1px); }
      .rating-thumb.up:hover:not(:disabled)   { background: rgba(74,222,128,.1);   border-color: #4ade80; }
      .rating-thumb.down:hover:not(:disabled) { background: rgba(248,113,113,.1);  border-color: #f87171; }
      .rating-thumb.up.voted   { background: rgba(74,222,128,.12);  border-color: #4ade80; }
      .rating-thumb.down.voted { background: rgba(248,113,113,.12); border-color: #f87171; }
      .rating-thumb:active:not(:disabled) { transform: scale(.97); }
      .rating-thumb:disabled   { opacity: .3; cursor: default; transform: none !important; }
      .rating-thumb .thumb-label {
        font-size: .9rem;
        font-weight: 800;
        letter-spacing: .06em;
      }
      .rating-thumb.up   .thumb-label { color: #4ade80; }
      .rating-thumb.down .thumb-label { color: #f87171; }
      .rating-thumb .thumb-count {
        font-size: .8rem;
        font-weight: 800;
        color: #666;
        min-width: 10px;
      }
      .rating-thumb.up.voted   .thumb-count { color: #4ade80; }
      .rating-thumb.down.voted .thumb-count { color: #f87171; }
    `;
    document.head.appendChild(s);
  }

  /* ── Supabase REST API ── */
  function apiHeaders() {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    };
  }

  async function submitRating(gameId, scenarioId, rating) {
    await fetch(`${SUPABASE_URL}/rest/v1/game_ratings`, {
      method:  'POST',
      headers: apiHeaders(),
      body:    JSON.stringify({ game_id: gameId, scenario_id: String(scenarioId), rating }),
    });
  }

  async function fetchStats(gameId, scenarioId) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/game_ratings` +
      `?game_id=eq.${encodeURIComponent(gameId)}` +
      `&scenario_id=eq.${encodeURIComponent(scenarioId)}` +
      `&select=rating`,
      { headers: apiHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const up   = rows.filter(r => r.rating > 0).length;
    const down = rows.filter(r => r.rating < 0).length;
    return { up, down };
  }

  /* ── 內部狀態 ── */
  let _gameId     = null;
  let _scenarioId = null;
  let _submitted  = false;
  let _bar        = null;
  let _upBtn      = null;
  let _downBtn    = null;

  async function handleVote(value) {
    if (_submitted) return;
    _submitted = true;
    _upBtn.disabled   = true;
    _downBtn.disabled = true;
    if (value > 0) _upBtn.classList.add('voted');
    else           _downBtn.classList.add('voted');

    try {
      await submitRating(_gameId, _scenarioId, value);
      const stats = await fetchStats(_gameId, _scenarioId);
      if (stats) {
        _upBtn.querySelector('.thumb-count').textContent   = stats.up   || '';
        _downBtn.querySelector('.thumb-count').textContent = stats.down || '';
      }
    } catch (_) {}
  }

  /* ── 公開 API ── */

  function init(gameId) {
    injectCSS();
    _gameId = gameId;

    _bar = document.createElement('div');
    _bar.className = 'rating-inline';
    _bar.id = 'rating-bar';
    _bar.style.display = 'none';

    _upBtn = document.createElement('button');
    _upBtn.className = 'rating-thumb up';
    _upBtn.setAttribute('aria-label', 'Thumbs up');
    _upBtn.innerHTML = '<span class="thumb-label">OK</span><span class="thumb-count"></span>';
    _upBtn.addEventListener('click', () => handleVote(1));

    _downBtn = document.createElement('button');
    _downBtn.className = 'rating-thumb down';
    _downBtn.setAttribute('aria-label', 'Thumbs down');
    _downBtn.innerHTML = '<span class="thumb-label">NG</span><span class="thumb-count"></span>';
    _downBtn.addEventListener('click', () => handleVote(-1));

    _bar.appendChild(_upBtn);
    _bar.appendChild(_downBtn);

    /* 插入到頁面指定錨點，若無則 fallback 到 body */
    const anchor = document.getElementById('rating-anchor');
    if (anchor) anchor.appendChild(_bar);
    else document.body.appendChild(_bar);
  }

  function showFor(scenarioId) {
    _scenarioId = String(scenarioId);
    _submitted  = false;

    _upBtn.disabled   = false;
    _downBtn.disabled = false;
    _upBtn.classList.remove('voted');
    _downBtn.classList.remove('voted');
    _upBtn.querySelector('.thumb-count').textContent   = '';
    _downBtn.querySelector('.thumb-count').textContent = '';

    _bar.style.animation = 'none';
    _bar.style.display   = '';
    requestAnimationFrame(() => { _bar.style.animation = ''; });

    fetchStats(_gameId, _scenarioId).then(stats => {
      if (stats && !_submitted) {
        _upBtn.querySelector('.thumb-count').textContent   = stats.up   || '';
        _downBtn.querySelector('.thumb-count').textContent = stats.down || '';
      }
    }).catch(() => {});
  }

  function hide() {
    if (_bar) _bar.style.display = 'none';
  }

  /* ── hash：FNV-1a 32-bit，回傳 7 碼 base36 字串 ── */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).padStart(7, '0');
  }

  return { init, showFor, hide, hash };
})();
