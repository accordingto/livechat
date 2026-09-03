/* onboarding.js — the shared "new host guide" layer.
   Include AFTER room.js (uses ROOM.enabled/ROOM.count for the fb-warning check,
   but nothing here writes to Firebase — this is pure client-side UI, same
   browser tab, never synced to players).

   Every host page here has the same problem: it's built for someone who
   already knows the rules, so a first-time host looking at a wall of buttons
   has no idea where to start or what to press next. This module bolts three
   things onto any game page that calls ONBOARDING.init():

     1. A setup wizard — a few full-screen slides walking through what the
        game is, how to send player links, and how the flow works. Opens
        automatically the first time this browser sees this game, and can be
        replayed any time from the help drawer.
     2. A persistent hint line, docked right above the game's own CTA button,
        that the host page updates every render with one plain-English
        sentence for "what's happening / what to press next." The module
        itself knows nothing about any game's phases — the host page computes
        the sentence and hands it over with ONBOARDING.setHint().
     3. A "❓ How to Host" floating button that opens a slide-over cheat sheet
        with the whole flow written out, so a host who's mid-case and forgets
        what a button does can check without losing their place.

   One global switch — a "🎓 Guide Mode" toggle in the topbar — turns all
   three off at once and returns the page to exactly how it looked before
   this module existed. It's stored in localStorage under one key shared by
   every game, so a host who turns it off (this project's owner, most likely)
   stays in veteran mode everywhere without having to re-flip it per page.
   Per-game "have they seen the wizard" state is separate, keyed by game id,
   so the module still knows which games are new to this browser even after
   guide mode gets switched back on. */
const ONBOARDING = (() => {
  const MODE_KEY = 'iceBreakHub.guideMode'; // 'on' | 'off', default on
  const seenKey = game => 'iceBreakHub.onboardingSeen.' + game;

  let cfg = {};

  function guideOn() {
    try { return localStorage.getItem(MODE_KEY) !== 'off'; } catch (e) { return true; }
  }
  function setGuideOn(on) {
    try { localStorage.setItem(MODE_KEY, on ? 'on' : 'off'); } catch (e) { /* private browsing */ }
  }
  function hasSeenWizard() {
    try { return localStorage.getItem(seenKey(cfg.game)) === '1'; } catch (e) { return false; }
  }
  function markWizardSeen() {
    try { localStorage.setItem(seenKey(cfg.game), '1'); } catch (e) { /* private browsing */ }
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

  /* ── styling ── one injected stylesheet, scoped with its own CSS var so it
     re-themes per game without the host page writing any onboarding CSS itself ── */
  function injectCSS(accent) {
    const css = `
      :root { --ob-accent: ${accent}; }

      /* topbar group — the mode toggle and help button live here, not as
         fixed-position floaters, so they can never drift over a tall
         sidebar's own buttons on a long page. .topbar normally holds just
         two items with space-between; flex-wrap lets this third group drop
         to its own line on a narrow screen instead of squeezing everything. */
      .topbar { flex-wrap: wrap; row-gap: 10px; }
      .ob-topbar-group { display: inline-flex; align-items: center; gap: 8px; }
      .ob-mode-btn, .ob-help-btn {
        display: inline-flex; align-items: center; gap: 7px;
        background: transparent; border: 1.5px solid #2a2a4a; color: #666;
        border-radius: 999px; padding: 6px 12px 6px 8px;
        font-family: inherit; font-size: .74rem; font-weight: 700; cursor: pointer;
        white-space: nowrap;
        transition: border-color .2s, color .2s, background .2s;
      }
      .ob-mode-btn:hover, .ob-help-btn:hover { border-color: var(--ob-accent); color: #aaa; }
      .ob-mode-btn.on { color: var(--ob-accent); border-color: var(--ob-accent); background: color-mix(in srgb, var(--ob-accent) 12%, transparent); }
      .ob-dot { width: 7px; height: 7px; border-radius: 50%; background: #444; flex-shrink: 0; transition: background .2s; }
      .ob-mode-btn.on .ob-dot { background: var(--ob-accent); box-shadow: 0 0 6px var(--ob-accent); }
      .ob-help-btn { padding: 6px 12px; }
      .ob-help-btn:hover { color: var(--ob-accent); border-color: var(--ob-accent); }
      .ob-help-btn.hidden { display: none; }

      /* the persistent hint — a speech-bubble-shaped callout that sits right
         above the game's own CTA, so "read this, then press that" reads as
         one motion */
      .ob-hint {
        width: 100%; margin-top: 14px;
        background: color-mix(in srgb, var(--ob-accent) 14%, #13132b);
        border: 1.5px dashed color-mix(in srgb, var(--ob-accent) 55%, transparent);
        border-radius: 12px; padding: 10px 14px;
        font-size: .82rem; font-weight: 600; line-height: 1.5; color: #eee;
        animation: fadeUp .3s ease both;
      }
      .ob-hint.hidden { display: none; }
      .ob-hint b { color: #fff; }


      /* shared overlay backdrop for both the wizard and the drawer */
      .ob-backdrop {
        position: fixed; inset: 0; z-index: 500;
        background: rgba(5,5,10,.72); backdrop-filter: blur(2px);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none; transition: opacity .2s;
      }
      .ob-backdrop.open { opacity: 1; pointer-events: auto; }

      /* ── setup wizard: a centered card, one slide at a time ── */
      .ob-wizard {
        width: min(92vw, 560px); max-height: min(88vh, 720px);
        background: #16162f; border: 2px solid var(--ob-accent); border-radius: 24px;
        padding: 34px 32px 26px; display: flex; flex-direction: column;
        box-shadow: 0 24px 70px rgba(0,0,0,.6);
        transform: scale(.96) translateY(10px); transition: transform .25s;
      }
      .ob-backdrop.open .ob-wizard { transform: scale(1) translateY(0); }
      .ob-wiz-close {
        position: absolute; top: 14px; right: 16px;
        background: transparent; border: none; color: #666; font-size: 1.3rem;
        cursor: pointer; padding: 6px; line-height: 1;
      }
      .ob-wiz-close:hover { color: #eee; }
      .ob-wiz-icon { font-size: 2.6rem; line-height: 1; margin-bottom: 4px; }
      .ob-wiz-title { font-size: 1.35rem; font-weight: 900; color: #fff; margin-bottom: 10px; line-height: 1.3; }
      .ob-wiz-body { font-size: .96rem; color: #ccc; line-height: 1.65; flex: 1; overflow-y: auto; }
      .ob-wiz-body p { margin: 0 0 10px; }
      .ob-wiz-body ol, .ob-wiz-body ul { margin: 0 0 10px; padding-left: 22px; }
      .ob-wiz-body li { margin-bottom: 6px; }
      .ob-wiz-body b { color: #fff; }
      .ob-wiz-foot {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        margin-top: 22px; padding-top: 18px; border-top: 1px solid #26264a;
      }
      .ob-wiz-dots { display: flex; gap: 6px; }
      .ob-wiz-dot { width: 7px; height: 7px; border-radius: 50%; background: #333; transition: background .2s, width .2s; }
      .ob-wiz-dot.active { background: var(--ob-accent); width: 18px; border-radius: 4px; }
      .ob-wiz-btns { display: flex; gap: 8px; }
      .ob-wiz-btn {
        border-radius: 10px; padding: 10px 18px; font-family: inherit;
        font-size: .86rem; font-weight: 800; cursor: pointer; border: 2px solid;
        transition: filter .15s, transform .1s;
      }
      .ob-wiz-btn:active { transform: scale(.97); }
      .ob-wiz-btn.primary { background: var(--ob-accent); border-color: var(--ob-accent); color: #fff; }
      .ob-wiz-btn.primary:hover { filter: brightness(1.1); }
      .ob-wiz-btn.ghost { background: transparent; border-color: #26264a; color: #888; }
      .ob-wiz-btn.ghost:hover { border-color: #444; color: #ccc; }
      .ob-wiz-btn:disabled { opacity: .35; cursor: not-allowed; }
      .ob-wiz-skip {
        background: none; border: none; color: #555; font-family: inherit;
        font-size: .78rem; font-weight: 700; text-decoration: underline; cursor: pointer;
        margin-top: 14px; align-self: center;
      }
      .ob-wiz-skip:hover { color: #999; }

      /* ── help drawer: slides in from the right on desktop, from the bottom
         on a narrow phone screen where a side sheet would be too cramped ── */
      .ob-backdrop.drawer { justify-content: flex-end; align-items: stretch; }
      .ob-drawer {
        width: min(94vw, 440px); height: 100%;
        background: #16162f; border-left: 2px solid var(--ob-accent);
        padding: 26px 24px max(26px, env(safe-area-inset-bottom));
        display: flex; flex-direction: column; overflow-y: auto;
        transform: translateX(100%); transition: transform .25s;
      }
      .ob-backdrop.drawer.open .ob-drawer { transform: translateX(0); }
      .ob-drawer-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
      .ob-drawer-title { font-size: 1.2rem; font-weight: 900; color: #fff; }
      .ob-drawer-pitch { font-size: .88rem; color: #999; line-height: 1.55; margin-bottom: 18px; }
      .ob-replay-btn {
        display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
        background: color-mix(in srgb, var(--ob-accent) 16%, transparent); border: 1.5px solid var(--ob-accent);
        color: var(--ob-accent); border-radius: 999px; padding: 8px 14px;
        font-family: inherit; font-size: .78rem; font-weight: 800; cursor: pointer;
        margin-bottom: 20px;
      }
      .ob-replay-btn:hover { filter: brightness(1.15); }
      .ob-steps { display: flex; flex-direction: column; gap: 14px; margin-bottom: 22px; }
      .ob-step { display: flex; gap: 12px; }
      .ob-step-num {
        flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
        background: color-mix(in srgb, var(--ob-accent) 20%, transparent); color: var(--ob-accent);
        display: flex; align-items: center; justify-content: center;
        font-size: .74rem; font-weight: 900;
      }
      .ob-step-text { font-size: .88rem; color: #ddd; line-height: 1.55; padding-top: 2px; }
      .ob-step-text b { color: #fff; }
      .ob-faq-hdr {
        font-size: .68rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;
        color: #555; margin: 4px 0 10px;
      }
      .ob-faq { display: flex; flex-direction: column; gap: 12px; }
      .ob-faq-item { background: #0d0d1a; border-radius: 10px; padding: 12px 14px; }
      .ob-faq-q { font-size: .84rem; font-weight: 800; color: #eee; margin-bottom: 4px; }
      .ob-faq-a { font-size: .82rem; color: #999; line-height: 1.5; }
      .ob-drawer-close {
        background: transparent; border: none; color: #666; font-size: 1.3rem;
        cursor: pointer; padding: 4px; line-height: 1; flex-shrink: 0;
      }
      .ob-drawer-close:hover { color: #eee; }

      @media (max-width: 520px) {
        .ob-wizard { padding: 28px 22px 22px; }
        .ob-help-btn span.ob-help-label { display: none; }
      }`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── topbar group: the mode toggle and help button, inline (not fixed) so
     they can never drift over a tall sidebar's own buttons on a long page ── */
  function buildTopbarGroup() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const group = document.createElement('span');
    group.className = 'ob-topbar-group';

    const modeBtn = document.createElement('button');
    modeBtn.className = 'ob-mode-btn';
    modeBtn.id = 'ob-mode-btn';
    modeBtn.type = 'button';
    modeBtn.onclick = () => { setGuideOn(!guideOn()); renderModeBtn(); applyVisibility(); };

    const helpBtn = document.createElement('button');
    helpBtn.className = 'ob-help-btn';
    helpBtn.id = 'ob-help-btn';
    helpBtn.type = 'button';
    helpBtn.innerHTML = '❓ <span class="ob-help-label">How to Host</span>';
    helpBtn.onclick = openDrawer;

    group.appendChild(modeBtn);
    group.appendChild(helpBtn);
    topbar.appendChild(group);
    renderModeBtn();
  }
  function renderModeBtn() {
    const btn = document.getElementById('ob-mode-btn');
    if (!btn) return;
    const on = guideOn();
    btn.classList.toggle('on', on);
    btn.innerHTML = `<span class="ob-dot"></span>🎓 Guide Mode: ${on ? 'ON' : 'OFF'}`;
  }

  /* ── hint line, docked right above whatever element the game names ── */
  function buildHint() {
    if (!cfg.hintAnchor) return;
    const anchor = document.querySelector(cfg.hintAnchor);
    if (!anchor) return;
    const el = document.createElement('div');
    el.className = 'ob-hint';
    el.id = 'ob-hint';
    anchor.parentNode.insertBefore(el, anchor);
  }
  function setHint(html) {
    const el = document.getElementById('ob-hint');
    if (el) el.innerHTML = html;
  }

  function buildDrawer() {
    const backdrop = document.createElement('div');
    backdrop.className = 'ob-backdrop drawer';
    backdrop.id = 'ob-drawer-backdrop';
    backdrop.onclick = e => { if (e.target === backdrop) closeDrawer(); };

    const stepsHTML = (cfg.steps || []).map((s, i) =>
      `<div class="ob-step"><span class="ob-step-num">${i + 1}</span><span class="ob-step-text">${s}</span></div>`
    ).join('');
    const faqHTML = (cfg.faq || []).map(f =>
      `<div class="ob-faq-item"><div class="ob-faq-q">${esc(f.q)}</div><div class="ob-faq-a">${f.a}</div></div>`
    ).join('');

    backdrop.innerHTML = `
      <div class="ob-drawer">
        <div class="ob-drawer-hdr">
          <div class="ob-drawer-title">${esc(cfg.title || 'How to Host')}</div>
          <button class="ob-drawer-close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="ob-drawer-pitch">${cfg.pitch || ''}</div>
        <button class="ob-replay-btn" type="button">▶️ Replay the setup tour</button>
        <div class="ob-steps">${stepsHTML}</div>
        ${faqHTML ? `<div class="ob-faq-hdr">Common questions</div><div class="ob-faq">${faqHTML}</div>` : ''}
      </div>`;

    backdrop.querySelector('.ob-drawer-close').onclick = closeDrawer;
    backdrop.querySelector('.ob-replay-btn').onclick = () => { closeDrawer(); openWizard(); };
    document.body.appendChild(backdrop);
  }
  function openDrawer() { document.getElementById('ob-drawer-backdrop').classList.add('open'); }
  function closeDrawer() { document.getElementById('ob-drawer-backdrop').classList.remove('open'); }

  /* ── setup wizard ── */
  let wizStep = 0;
  function buildWizard() {
    const backdrop = document.createElement('div');
    backdrop.className = 'ob-backdrop';
    backdrop.id = 'ob-wiz-backdrop';
    backdrop.innerHTML = `
      <div class="ob-wizard">
        <button class="ob-wiz-close" type="button" aria-label="Close">✕</button>
        <div class="ob-wiz-icon" id="ob-wiz-icon"></div>
        <div class="ob-wiz-title" id="ob-wiz-title"></div>
        <div class="ob-wiz-body" id="ob-wiz-body"></div>
        <div class="ob-wiz-foot">
          <div class="ob-wiz-dots" id="ob-wiz-dots"></div>
          <div class="ob-wiz-btns">
            <button class="ob-wiz-btn ghost" id="ob-wiz-back" type="button">Back</button>
            <button class="ob-wiz-btn primary" id="ob-wiz-next" type="button">Next</button>
          </div>
        </div>
        <button class="ob-wiz-skip" type="button">Skip tutorial</button>
      </div>`;
    backdrop.querySelector('.ob-wiz-close').onclick = closeWizard;
    backdrop.querySelector('.ob-wiz-skip').onclick = closeWizard;
    backdrop.querySelector('#ob-wiz-back').onclick = () => renderWizStep(wizStep - 1);
    backdrop.querySelector('#ob-wiz-next').onclick = () => {
      const slides = cfg.wizardSteps || [];
      if (wizStep >= slides.length - 1) closeWizard();
      else renderWizStep(wizStep + 1);
    };
    document.body.appendChild(backdrop);
  }
  function renderWizStep(i) {
    const slides = cfg.wizardSteps || [];
    wizStep = Math.max(0, Math.min(i, slides.length - 1));
    const s = slides[wizStep];
    document.getElementById('ob-wiz-icon').textContent = s.icon || '👋';
    document.getElementById('ob-wiz-title').textContent = s.title;
    document.getElementById('ob-wiz-body').innerHTML = s.body;
    document.getElementById('ob-wiz-dots').innerHTML = slides.map((_, i2) =>
      `<span class="ob-wiz-dot${i2 === wizStep ? ' active' : ''}"></span>`).join('');
    document.getElementById('ob-wiz-back').disabled = wizStep === 0;
    document.getElementById('ob-wiz-next').textContent = wizStep === slides.length - 1 ? "Let's go!" : 'Next';
  }
  function openWizard() {
    renderWizStep(0);
    document.getElementById('ob-wiz-backdrop').classList.add('open');
  }
  function closeWizard() {
    document.getElementById('ob-wiz-backdrop').classList.remove('open');
    markWizardSeen();
  }

  function applyVisibility() {
    const on = guideOn();
    const hint = document.getElementById('ob-hint');
    const help = document.getElementById('ob-help-btn');
    if (hint) hint.classList.toggle('hidden', !on);
    if (help) help.classList.toggle('hidden', !on);
  }

  function init(options) {
    cfg = options || {};
    injectCSS(cfg.accent || '#7c3aed');
    buildTopbarGroup();
    buildHint();
    buildDrawer();
    buildWizard();
    applyVisibility();
    // auto-open only the very first time this browser sees this game, and only
    // while guide mode is on — a host who already turned it off everywhere
    // shouldn't have it pop back up just because they opened a new game
    if (guideOn() && !hasSeenWizard()) openWizard();
  }

  return { init, setHint, openWizard };
})();
