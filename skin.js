/*
 * skin.js — one button that repaints the whole host UI.
 *
 * Two skins ship today:
 *   midnight — the original look: flat dark panels, thin rules (default)
 *   aurora   — the same room with the stage lights on: the page carries slow
 *              colour blooms in the game's own accent, panels become frosted
 *              glass floating over them, controls become capsules
 *
 * A skin is NOT a colour swap. skins.css restyles shape (radius, rule weight,
 * shadow), type (weight, case, tracking) and layout (header alignment, section
 * headers, spacing) as well, so the two read as different products. Everything
 * it needs comes from the tokens in shared.css — that is why the host pages
 * spell their surfaces and rules as var(--surface) / var(--border) rather than
 * hard-coded hexes.
 *
 * The player card (play.html) deliberately does NOT load this file: a player is
 * looking at their own phone, not at the shared screen, and their card should
 * look the same whichever skin the host is running. The guide's little phone
 * mock-ups are dark for the same reason — they are pictures OF that card.
 *
 * Usage: <script src="skin.js"></script> after i18n.js. Nothing else; the
 * button, its styles and the docking are all injected from here, so adding a
 * host page costs one script tag.
 */
(function () {
  const STORE_KEY = 'site-skin';
  const SKINS = ['midnight', 'aurora'];

  /* The button always names the skin you would switch TO — with only two of
     them, "what happens if I press this" is more useful than "where am I". */
  const DICT = {
    toMidnight: { zh: '🌙 夜色版', en: '🌙 Midnight' },
    toAurora:   { zh: '✨ 極光版', en: '✨ Aurora' },
    title:      { zh: '切換網站風格', en: 'Switch the look of the site' },
  };

  function read() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      return SKINS.indexOf(v) >= 0 ? v : SKINS[0];
    } catch (e) {
      return SKINS[0];
    }
  }

  let skin = read();
  const listeners = [];

  /* Set before first paint where possible: index.html and the game pages call
     this file from <head>, so the attribute is on <html> before <body> exists
     and there is no flash of the other skin. */
  document.documentElement.setAttribute('data-skin', skin);

  function t(key) {
    const e = DICT[key];
    if (!e) return key;
    const lang = (typeof I18N !== 'undefined' && I18N.lang) || 'zh';
    return e[lang] || e.en;
  }

  let btn = null;

  function paintButton() {
    if (!btn) return;
    btn.textContent = skin === 'aurora' ? t('toMidnight') : t('toAurora');
    btn.title = t('title');
    btn.setAttribute('aria-label', btn.title);
  }

  function setSkin(next) {
    skin = SKINS.indexOf(next) >= 0 ? next : SKINS[0];
    try { localStorage.setItem(STORE_KEY, skin); } catch (e) {}
    document.documentElement.setAttribute('data-skin', skin);
    paintButton();
    listeners.forEach((fn) => { try { fn(skin); } catch (e) { console.error(e); } });
  }

  function toggle() {
    setSkin(skin === 'aurora' ? 'midnight' : 'aurora');
  }

  function injectCSS() {
    if (document.getElementById('skin-toggle-css')) return;
    const style = document.createElement('style');
    style.id = 'skin-toggle-css';
    /* The language pill used to be the only thing pinned to the top-right, and
       it sat on top of the round counter on every game page below ~1400px.
       Both controls now live in one row that docks into the page's own top bar
       (or the hub's hero) when there is one, so they take part in the layout
       instead of floating over it. */
    style.textContent = `
      #chrome-tools {
        position: fixed;
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        z-index: 9999;
        display: flex; align-items: center; gap: 8px;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      #chrome-tools.is-docked { position: static; }
      #chrome-tools #i18n-toggle { position: static; top: auto; right: auto; }
      /* The top row is justify-content: space-between and now holds a third
         child. An auto margin on the back link eats the free space before
         space-between gets a say, so the link stays hard left and the round
         counter packs up against the tools instead of drifting into the middle
         of the bar. (It also ends the old overlap: the language pill used to be
         position: fixed and sat on top of that counter on every game page.) */
      .topbar { gap: 14px; flex-wrap: wrap; }
      .topbar > a.back { margin-right: auto; }
      /* the hub's hero is one nowrap row; at phone widths the pair of pills has
         to be allowed to drop to a second line rather than push the page wide */
      .hero { flex-wrap: wrap; }
      #chrome-tools { flex-wrap: wrap; justify-content: flex-end; }
      #skin-toggle {
        background: #22224a;
        border: 1px solid #2a2a52;
        color: #9999bb;
        border-radius: 999px;
        padding: 7px 14px;
        font-family: inherit; font-size: 12px; font-weight: 700;
        cursor: pointer; white-space: nowrap;
        box-shadow: 0 4px 16px rgba(0,0,0,.4);
        transition: background .15s, color .15s, border-color .15s, transform .1s;
      }
      #skin-toggle:hover { background: #2a2a52; color: #fff; }
      #skin-toggle:active { transform: scale(.96); }
      @media (max-width: 480px) {
        #chrome-tools { gap: 6px; }
        #skin-toggle { padding: 6px 10px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }

  function build() {
    if (document.getElementById('skin-toggle')) return;
    injectCSS();

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'skin-toggle';
    btn.addEventListener('click', toggle);
    paintButton();

    const tools = document.createElement('div');
    tools.id = 'chrome-tools';
    tools.appendChild(btn);

    /* Dock into whatever this page uses as its top row. The game pages and
       Let's Talk have .topbar; the hub has .hero. Both are flex rows that come
       BEFORE .header, which also keeps the tools visible while guide.js has the
       rest of the page veiled behind the how-to-play screen. */
    const host = document.querySelector('.topbar') || document.querySelector('.hero');
    if (host) {
      host.appendChild(tools);
      tools.classList.add('is-docked');
    } else {
      document.body.appendChild(tools);
    }

    /* i18n.js appends its own pill to <body>; move it in beside this one so the
       two read as one control cluster wherever they end up. */
    const lang = document.getElementById('i18n-toggle');
    if (lang) tools.appendChild(lang);
  }

  function init() {
    const run = () => {
      build();
      if (typeof I18N !== 'undefined') I18N.onChange(paintButton);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  window.SKIN = {
    toggle,
    set: setSkin,
    onChange(fn) { listeners.push(fn); },
    get current() { return skin; },
  };

  init();
})();
