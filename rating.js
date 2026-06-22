/* rating.js — 遊戲評分元件（1–5 顆星，透過 Supabase 儲存）
   使用前須在同一頁先載入 supabase-config.js */

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
        background: rgba(10, 10, 26, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid rgba(255,255,255,.08);
        padding: 14px 24px max(14px, env(safe-area-inset-bottom));
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        animation: ratingSlideUp .4s ease both;
      }
      @keyframes ratingSlideUp {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .rating-label {
        font-size: .8rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #555;
        white-space: nowrap;
      }
      .rating-stars {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .rating-star {
        font-size: 1.6rem;
        cursor: pointer;
        transition: transform .12s, filter .12s;
        line-height: 1;
        -webkit-text-fill-color: initial;
        background: none;
        border: none;
        padding: 4px 2px;
        touch-action: manipulation;
      }
      .rating-star:hover,
      .rating-star.hover {
        transform: scale(1.25);
        filter: drop-shadow(0 0 6px rgba(245,158,11,.7));
      }
      .rating-star.filled { filter: drop-shadow(0 0 4px rgba(245,158,11,.5)); }
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
        from { opacity: 0; transform: scale(.8); }
        to   { opacity: 1; transform: scale(1); }
      }
      /* Soft theme */
      [data-theme="soft"] .rating-bar {
        background: rgba(250,247,243,.95);
        border-top-color: rgba(0,0,0,.08);
      }
      [data-theme="soft"] .rating-label { color: #b09080; }
      [data-theme="soft"] .rating-avg   { color: #b09080; }
    `;
    document.head.appendChild(s);
  }

  /* ── Supabase REST API helpers ── */
  function headers() {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    };
  }

  async function submitRating(gameId, rating) {
    await fetch(`${SUPABASE_URL}/rest/v1/game_ratings`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify({ game_id: gameId, rating }),
    });
  }

  async function fetchStats(gameId) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/game_ratings?game_id=eq.${encodeURIComponent(gameId)}&select=rating`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
    return { avg: avg.toFixed(1), count: rows.length };
  }

  /* ── 渲染評分條 ── */
  function render(gameId) {
    injectCSS();

    const bar = document.createElement('div');
    bar.className = 'rating-bar';
    bar.id = 'rating-bar';

    const EMPTY = '☆';
    const FULL  = '★';
    let hovered = 0;
    let submitted = false;

    function buildStars(filled) {
      return [1,2,3,4,5].map(n => {
        const btn = document.createElement('button');
        btn.className = 'rating-star' + (n <= filled ? ' filled' : '');
        btn.setAttribute('aria-label', `${n} star${n > 1 ? 's' : ''}`);
        btn.textContent = n <= filled ? FULL : EMPTY;

        btn.addEventListener('mouseenter', () => {
          if (submitted) return;
          hovered = n;
          refreshStars();
        });
        btn.addEventListener('mouseleave', () => {
          if (submitted) return;
          hovered = 0;
          refreshStars();
        });
        btn.addEventListener('click', () => {
          if (submitted) return;
          handleSubmit(n);
        });
        return btn;
      });
    }

    const label = document.createElement('span');
    label.className = 'rating-label';
    label.textContent = 'Rate this game';

    const starsWrap = document.createElement('div');
    starsWrap.className = 'rating-stars';

    const avgEl = document.createElement('span');
    avgEl.className = 'rating-avg';
    avgEl.textContent = '';

    bar.appendChild(label);
    bar.appendChild(starsWrap);
    bar.appendChild(avgEl);
    document.body.appendChild(bar);

    let currentFilled = 0;
    let starEls = [];

    function refreshStars() {
      const display = hovered || currentFilled;
      starEls.forEach((btn, i) => {
        const n = i + 1;
        btn.textContent = n <= display ? FULL : EMPTY;
        btn.classList.toggle('filled', n <= display);
        btn.classList.toggle('hover',  hovered > 0 && n <= hovered);
      });
    }

    function initStars() {
      starsWrap.innerHTML = '';
      starEls = buildStars(currentFilled);
      starEls.forEach(btn => starsWrap.appendChild(btn));
    }

    async function handleSubmit(rating) {
      submitted = true;
      currentFilled = rating;
      refreshStars();
      starEls.forEach(btn => { btn.style.cursor = 'default'; });

      /* 樂觀 UI — 先顯示感謝，再等 API */
      const thanks = document.createElement('span');
      thanks.className = 'rating-thanks';
      thanks.textContent = '✓ Thanks!';
      bar.replaceChild(thanks, avgEl);

      try {
        await submitRating(gameId, rating);
        /* 更新平均 */
        const stats = await fetchStats(gameId);
        if (stats) {
          thanks.textContent = `✓ Saved! Avg ${stats.avg}★ (${stats.count} sessions)`;
        }
      } catch (_) { /* 離線也沒關係，感謝訊息已顯示 */ }
    }

    initStars();

    /* 非同步載入平均分 */
    fetchStats(gameId).then(stats => {
      if (stats && !submitted) {
        avgEl.innerHTML = `Avg <strong>${stats.avg}★</strong> · ${stats.count} session${stats.count > 1 ? 's' : ''}`;
      }
    }).catch(() => {});
  }

  return { render };
})();
