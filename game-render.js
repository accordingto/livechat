/* game-render.js — shared rendering for all 5 game types.
   Include AFTER game-data.js. Call GAME_RENDER.injectCSS() once on page load. */

const GAME_RENDER = (() => {

  function injectCSS() {
    if (document.getElementById('gr-styles')) return;
    const s = document.createElement('style');
    s.id = 'gr-styles';
    s.textContent = `
      /* ── Shared label / text ── */
      .gr-label {
        font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
        font-weight: 700; position: relative; z-index: 1;
      }
      .gr-text {
        font-size: clamp(1.1rem, 3vw, 1.45rem);
        font-weight: 700; line-height: 1.55;
        text-align: center;
        position: relative; z-index: 1;
      }
      .gr-divider { width: 100%; height: 1px; background: #1e1e3a; margin: 4px 0; }

      /* ── Story Teller 3-card grid ── */
      .gr-story-grid {
        display: grid; grid-template-columns: 1fr;
        gap: 14px; width: 100%;
        position: relative; z-index: 1;
      }
      .gr-story-card {
        border-radius: 16px; padding: 20px 14px;
        border: 2px solid #1e1e42;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        min-height: 130px; justify-content: center; text-align: center;
        position: relative;
        overflow: visible;
      }
      .gr-story-card::before {
        position: absolute; font-size: 7rem; opacity: .04;
        top: 50%; left: 50%; transform: translate(-50%,-50%);
        -webkit-text-fill-color: initial; pointer-events: none;
      }
      .gr-sc-char   { background: linear-gradient(160deg, #1a1400, #13132b); --gr-sc:#f59e0b; }
      .gr-sc-action { background: linear-gradient(160deg, #110d1a, #13132b); --gr-sc:#818cf8; }
      .gr-sc-place  { background: linear-gradient(160deg, #001a0d, #13132b); --gr-sc:#34d399; }
      .gr-sc-char::before   { content:'👤'; }
      .gr-sc-action::before { content:'⚡'; }
      .gr-sc-place::before  { content:'📍'; }
      .gr-story-card.gr-active { border-color: var(--gr-sc); }
      .gr-pill {
        font-size: 9px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        background: var(--gr-sc); color: #0d0d1a;
        border-radius: 999px; padding: 3px 12px;
        position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
        white-space: nowrap;
      }
      .gr-story-text {
        font-size: clamp(1.25rem, 3vw, 1.55rem);
        font-weight: 600; color: #eee; line-height: 1.5;
      }

      /* ── Sophie's Choice options ── */
      .gr-options {
        width: 100%; display: flex; gap: 10px; flex-direction: column;
        position: relative; z-index: 1;
      }
      .gr-opt {
        border-radius: 14px; padding: 14px 20px;
        display: flex; align-items: flex-start; gap: 14px;
        border: 1.5px solid transparent;
      }
      .gr-opt-a { background: rgba(79,158,255,.1);  border-color: rgba(79,158,255,.3); }
      .gr-opt-b { background: rgba(239,68,68,.1);   border-color: rgba(239,68,68,.3); }
      .gr-opt-c { background: rgba(34,197,94,.1);   border-color: rgba(34,197,94,.3); }
      .gr-opt-key {
        font-size: .75rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;
        padding: 3px 10px; border-radius: 999px; flex-shrink: 0; margin-top: 2px;
      }
      .gr-opt-a .gr-opt-key { background: #4f9eff; color: #0d0d1a; }
      .gr-opt-b .gr-opt-key { background: #ef4444; color: #fff; }
      .gr-opt-c .gr-opt-key { background: #22c55e; color: #0d0d1a; }
      .gr-opt-text { font-size: clamp(1.05rem, 2.5vw, 1.2rem); line-height: 1.55; }

      /* ── Persuade Together roles ── */
      .gr-role-chip {
        width: 100%; border-radius: 14px; padding: 14px 20px;
        display: flex; flex-direction: column;
        align-items: center; gap: 6px;
        text-align: center;
        border: 1.5px solid transparent;
      }
      .gr-role-team  { background: rgba(6,182,212,.08);   border-color: rgba(6,182,212,.35); }
      .gr-role-judge { background: rgba(232,121,249,.08);  border-color: rgba(232,121,249,.35); }
      .gr-role-label {
        font-size: .65rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        color: #555;
      }
      .gr-role-val {
        font-weight: 700;
        font-size: clamp(1.05rem, 2.5vw, 1.25rem);
        line-height: 1.4;
      }
      .gr-role-team  .gr-role-val { color: #06b6d4; }
      .gr-role-judge .gr-role-val { color: #e879f9; }
    `;
    document.head.appendChild(s);
  }

  /* ── never ── */
  function never(el, prompt) {
    el.innerHTML = `
      <span class="gr-label" style="color:#4f9eff">NEVER HAVE I EVER…</span>
      <span class="gr-text">${prompt}</span>`;
  }

  /* ── hottake ── */
  function hottake(el, take) {
    el.innerHTML = `
      <span class="gr-label" style="color:#ff7043">🔥 HOT TAKE</span>
      <span class="gr-text">${take}</span>`;
  }

  /* ── storyteller ── */
  function storyteller(el, char, action, place) {
    el.innerHTML = `
      <div class="gr-story-grid">
        <div class="gr-story-card gr-sc-char gr-active">
          <span class="gr-pill">👤 Character</span>
          <span class="gr-story-text">${char}</span>
        </div>
        <div class="gr-story-card gr-sc-action gr-active">
          <span class="gr-pill">⚡ Action</span>
          <span class="gr-story-text">${action}</span>
        </div>
        <div class="gr-story-card gr-sc-place gr-active">
          <span class="gr-pill">📍 Location</span>
          <span class="gr-story-text">${place}</span>
        </div>
      </div>`;
  }

  /* ── sophies ── */
  function sophies(el, sc) {
    el.innerHTML = `
      <span class="gr-label" style="color:#a78bfa">🎯 THE SITUATION</span>
      <span class="gr-text">${sc.situation}</span>
      <div class="gr-divider"></div>
      <div class="gr-options">
        <div class="gr-opt gr-opt-a"><span class="gr-opt-key">A</span><span class="gr-opt-text">${sc.a}</span></div>
        <div class="gr-opt gr-opt-b"><span class="gr-opt-key">B</span><span class="gr-opt-text">${sc.b}</span></div>
        <div class="gr-opt gr-opt-c"><span class="gr-opt-key">C</span><span class="gr-opt-text">Something else! Tell us your own answer.</span></div>
      </div>`;
  }

  /* ── persuade ── */
  function persuade(el, sc) {
    el.innerHTML = `
      <div class="gr-role-chip gr-role-team">
        <span class="gr-role-label">👥 Persuader Team</span>
        <span class="gr-role-val">${sc.team}</span>
      </div>
      <div class="gr-divider"></div>
      <span class="gr-label" style="color:#06b6d4">${sc.emoji || '🤝'} ${sc.cat ? sc.cat.toUpperCase() : 'THE SITUATION'}</span>
      <span class="gr-text">${sc.situation}</span>
      <div class="gr-divider"></div>
      <div class="gr-role-chip gr-role-judge">
        <span class="gr-role-label">👨‍⚖️ The Judge</span>
        <span class="gr-role-val">${sc.judge}</span>
      </div>`;
  }

  /* ── drawTick: slot-machine animation helper ── */
  function drawTick(pool, onTick, onDone, { count = 22, ms = 85 } = {}) {
    let n = 0;
    const iv = setInterval(() => {
      onTick(pool[Math.floor(Math.random() * pool.length)]);
      if (++n >= count) { clearInterval(iv); onDone(); }
    }, ms);
  }

  return { injectCSS, never, hottake, storyteller, sophies, persuade, drawTick };
})();
