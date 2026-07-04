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

      /* ── You're In The Scene (for Surprise Me) ── */
      .gr-scene-tag {
        font-size: .78rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        width: 100%; text-align: left; position: relative; z-index: 1;
      }
      .gr-scene-title {
        font-size: clamp(1.5rem, 4vw, 1.9rem); font-weight: 800; color: #fff;
        line-height: 1.2; width: 100%; text-align: left;
        position: relative; z-index: 1;
      }
      .gr-scene-sit {
        font-size: clamp(1.15rem, 3vw, 1.45rem); color: #ccc;
        line-height: 1.65; width: 100%; text-align: left;
        position: relative; z-index: 1;
      }
      .gr-scene-ps-label {
        font-size: .72rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        color: #555; width: 100%; text-align: left; position: relative; z-index: 1;
      }
      .gr-scene-roles-hdr {
        font-size: .78rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        color: #555; width: 100%; text-align: left;
        position: relative; z-index: 1;
      }
      .gr-scene-roles {
        width: 100%; display: grid;
        grid-template-columns: repeat(3, 1fr); gap: 10px;
        position: relative; z-index: 1;
      }
      .gr-scene-role {
        border-radius: 12px; padding: 14px 16px;
        display: flex; flex-direction: column; gap: 5px;
        border: 1.5px solid transparent;
      }
      .gr-sr-a { background: rgba(99,102,241,.12);  border-color: rgba(99,102,241,.4); }
      .gr-sr-b { background: rgba(236,72,153,.12);  border-color: rgba(236,72,153,.4); }
      .gr-sr-c { background: rgba(245,158,11,.12);  border-color: rgba(245,158,11,.4); }
      .gr-sr-d { background: rgba(6,182,212,.12);   border-color: rgba(6,182,212,.4); }
      .gr-sr-e { background: rgba(163,230,53,.12);  border-color: rgba(163,230,53,.4); }
      .gr-sr-f { background: rgba(217,70,239,.12);  border-color: rgba(217,70,239,.4); }
      .gr-sr-key {
        font-size: .72rem; font-weight: 900; letter-spacing: 2px;
        padding: 2px 8px; border-radius: 999px; align-self: flex-start;
        text-transform: uppercase; margin-bottom: 2px;
      }
      .gr-sr-a .gr-sr-key { background: #6366f1; color: #fff; }
      .gr-sr-b .gr-sr-key { background: #ec4899; color: #fff; }
      .gr-sr-c .gr-sr-key { background: #f59e0b; color: #0d0d1a; }
      .gr-sr-d .gr-sr-key { background: #06b6d4; color: #0d0d1a; }
      .gr-sr-e .gr-sr-key { background: #a3e635; color: #0d0d1a; }
      .gr-sr-f .gr-sr-key { background: #d946ef; color: #fff; }
      .gr-sr-name { font-size: clamp(1rem, 2.5vw, 1.15rem); font-weight: 700; color: #eee; line-height: 1.3; }
      .gr-sr-hint { font-size: clamp(.88rem, 2vw, .98rem); color: #888; line-height: 1.5; margin-top: 1px; }
      /* player-count buttons inside Surprise Me scene card */
      .gr-ps-btns { display: flex; gap: 6px; flex-wrap: wrap; width: 100%; }
      .gr-ps-btn {
        border: 1.5px solid #1e1e42; border-radius: 8px;
        padding: 5px 18px; font-size: .88rem; font-weight: 700;
        color: #555; background: transparent; cursor: pointer;
        transition: border-color .18s, color .18s, background .18s, transform .1s;
        font-family: inherit;
      }
      .gr-ps-btn:hover  { border-color: #ec4899; color: #ec4899; }
      .gr-ps-btn:active { transform: scale(.95); }
      .gr-ps-btn.active { border-color: #ec4899; color: #ec4899; background: rgba(236,72,153,.13); }
      @media (max-width: 520px) {
        .gr-ps-btn { padding: 8px 16px; }
      }
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

  /* ── scene (for Surprise Me) ── */
  let _sceneData = null;
  const SCENE_LETTERS = ['A','B','C','D','E','F'];
  const SCENE_KEYS    = ['a','b','c','d','e','f'];

  function scene(el, sc) {
    _sceneData = sc;
    el.innerHTML = `
      <span class="gr-scene-tag" style="color:#ec4899">🎭 THE SCENE</span>
      <div class="gr-scene-title">${sc.emoji} ${sc.title}</div>
      <div class="gr-divider"></div>
      <div class="gr-scene-sit">${sc.situation}</div>
      <div class="gr-divider"></div>
      <div class="gr-scene-ps-label">How many players?</div>
      <div class="gr-ps-btns">
        ${[2,3,4,5,6].map(n => `<button class="gr-ps-btn" onclick="GAME_RENDER.setScenePlayers(${n})">${n}</button>`).join('')}
      </div>
      <div class="gr-divider" id="gr-roles-sep" style="display:none"></div>
      <div class="gr-scene-roles-hdr" id="gr-roles-lbl" style="display:none">🎪 Your Roles — Pick one and play it!</div>
      <div class="gr-scene-roles" id="gr-roles-grid" style="grid-template-columns:1fr 1fr">
        <div class="gr-scene-role gr-sr-a">
          <span class="gr-sr-key">A</span>
          <div class="gr-sr-name">${sc.a.label}</div>
          <div class="gr-sr-hint">${sc.a.hint}</div>
        </div>
      </div>`;
  }

  function setScenePlayers(n) {
    if (!_sceneData) return;
    const sc = _sceneData;

    document.querySelectorAll('.gr-ps-btn').forEach(btn => {
      btn.classList.toggle('active', +btn.textContent === n);
    });

    const sep = document.getElementById('gr-roles-sep');
    const lbl = document.getElementById('gr-roles-lbl');
    if (sep) sep.style.display = '';
    if (lbl) lbl.style.display = '';

    const grid = document.getElementById('gr-roles-grid');
    if (!grid) return;
    const narrow = window.innerWidth <= 520;
    grid.style.gridTemplateColumns = (narrow || n === 2 || n === 4) ? '1fr 1fr' : 'repeat(3, 1fr)';
    grid.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const role = sc[SCENE_KEYS[i]];
      const div  = document.createElement('div');
      div.className = `gr-scene-role gr-sr-${SCENE_KEYS[i]}`;
      div.style.animationDelay = (i * 50) + 'ms';
      div.innerHTML = `<span class="gr-sr-key">${SCENE_LETTERS[i]}</span><div class="gr-sr-name">${role.label}</div><div class="gr-sr-hint">${role.hint}</div>`;
      grid.appendChild(div);
    }
  }

  return { injectCSS, never, hottake, storyteller, sophies, persuade, scene, setScenePlayers, drawTick };
})();
