/* rating.js — 情境評分元件（1–5 顆星，針對每個抽到的題目）
   使用前須在同一頁先載入 supabase-config.js
   API:
     GAME_RATING.init(gameId)        — 頁面載入時呼叫一次，建立隱藏的評分條
     GAME_RATING.showFor(scenarioId) — 題目揭曉後呼叫，顯示並重置評分條
     GAME_RATING.hide()              — 新一輪開始時呼叫，隱藏評分條        */

const GAME_RATING = (() => {

  /* ── 樣式 ── */
  function injectCSS() {
    if (document.getElementById('rating-styles')) return;
    const s = document.createElement('style');
    s.id = 'rating-styles';
    s.textContent = `
      .rating-bar {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 999;
        background: rgba(10, 10, 26, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid rgba(255,255,255,.08);
        padding: 14px 24px max(14px, env(safe-area-inset-bottom));
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        animation: ratingSlideUp .35s ease both;
      }
      @keyframes ratingSlideUp {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .rating-label {
        font-size: .78rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #555;
        white-space: nowrap;
      }
      .rating-stars {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .rating-star {
        font-size: 1.7rem;
        cursor: pointer;
        transition: transform .12s, filter .12s;
        line-height: 1;
        -webkit-text-fill-color: initial;
        background: none;
        border: none;
        padding: 4px 3px;
        touch-action: manipulation;
      }
      .rating-star:hover,
      .rating-star.hover {
        transform: scale(1.28);
        filter: drop-shadow(0 0 7px rgba(245,158,11,.8));
      }
      .rating-star.filled {
        filter: drop-shadow(0 0 4px rgba(245,158,11,.5));
      }
      .rating-avg {
        font-size: .82rem;
        color: #555;
        white-space: nowrap;
      }
      .rating-avg strong { color: #f59e0b; }
      .rating-thanks {
        font-size: .9rem;
        font-weight: 700;
        color: #4ade80;
        letter-spacing: .5px;
        animation: ratingFadeIn .3s ease;
      }
      @keyframes ratingFadeIn {
        from { opacity: 0; transform: scale(.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      [data-theme="soft"] .rating-bar {
        background: rgba(250,247,243,.96);
        border-top-color: rgba(0,0,0,.08);
      }
      [data-theme="soft"] .rating-label { color: #b09080; }
      [data-theme="soft"] .rating-avg   { color: #b09080; }
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
    const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
    return { avg: avg.toFixed(1), count: rows.length };
  }

  /* ── 內部狀態 ── */
  let _gameId     = null;
  let _scenarioId = null;
  let _submitted  = false;
  let _bar        = null;
  let _starsWrap  = null;
  let _avgEl      = null;
  let _hovered    = 0;
  let _starEls    = [];

  /* ── 星星 ── */
  const EMPTY = '☆', FULL = '★';

  function buildStars() {
    _starsWrap.innerHTML = '';
    _starEls = [1,2,3,4,5].map(n => {
      const btn = document.createElement('button');
      btn.className = 'rating-star';
      btn.setAttribute('aria-label', `${n} star${n > 1 ? 's' : ''}`);
      btn.textContent = EMPTY;
      btn.addEventListener('mouseenter', () => { if (_submitted) return; _hovered = n; refreshStars(); });
      btn.addEventListener('mouseleave', () => { if (_submitted) return; _hovered = 0; refreshStars(); });
      btn.addEventListener('click',      () => { if (_submitted) return; handleSubmit(n); });
      _starsWrap.appendChild(btn);
      return btn;
    });
  }

  function refreshStars() {
    _starEls.forEach((btn, i) => {
      const n = i + 1;
      btn.textContent = n <= _hovered ? FULL : EMPTY;
      btn.classList.toggle('filled', n <= _hovered);
      btn.classList.toggle('hover',  _hovered > 0 && n <= _hovered);
    });
  }

  async function handleSubmit(rating) {
    _submitted = true;
    _starEls.forEach((btn, i) => {
      btn.textContent = i + 1 <= rating ? FULL : EMPTY;
      btn.classList.toggle('filled', i + 1 <= rating);
      btn.style.cursor = 'default';
    });

    const thanks = document.createElement('span');
    thanks.className = 'rating-thanks';
    thanks.textContent = '✓ Saved!';
    if (_avgEl.parentNode) _bar.replaceChild(thanks, _avgEl);

    try {
      await submitRating(_gameId, _scenarioId, rating);
      const stats = await fetchStats(_gameId, _scenarioId);
      if (stats) thanks.textContent = `✓ Saved!  Avg ${stats.avg}★ (${stats.count}×)`;
    } catch (_) {}
  }

  /* ── 公開 API ── */

  function init(gameId) {
    injectCSS();
    _gameId = gameId;

    _bar = document.createElement('div');
    _bar.className = 'rating-bar';
    _bar.id = 'rating-bar';
    _bar.style.display = 'none';

    const label = document.createElement('span');
    label.className = 'rating-label';
    label.textContent = 'Rate this situation';

    _starsWrap = document.createElement('div');
    _starsWrap.className = 'rating-stars';

    _avgEl = document.createElement('span');
    _avgEl.className = 'rating-avg';

    _bar.appendChild(label);
    _bar.appendChild(_starsWrap);
    _bar.appendChild(_avgEl);
    document.body.appendChild(_bar);
  }

  function showFor(scenarioId) {
    _scenarioId = String(scenarioId);
    _submitted  = false;
    _hovered    = 0;

    const thanks = _bar.querySelector('.rating-thanks');
    if (thanks) _bar.replaceChild(_avgEl, thanks);
    _avgEl.textContent = '';

    buildStars();

    _bar.style.animation = 'none';
    _bar.style.display   = '';
    requestAnimationFrame(() => { _bar.style.animation = ''; });

    fetchStats(_gameId, _scenarioId).then(stats => {
      if (stats && !_submitted)
        _avgEl.innerHTML = `Avg <strong>${stats.avg}★</strong> · ${stats.count}×`;
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
