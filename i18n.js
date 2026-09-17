/*
 * i18n.js — shared bilingual UI layer for every page.
 * Traditional Chinese is the default; a floating toggle switches to English.
 * Game content itself (game-data.js words/scenarios/questions/charges) and
 * each game's English title are never touched by this — only the UI chrome
 * around them (buttons, labels, status text, instructions) is translated.
 *
 * Usage:
 *   <script src="i18n.js"></script>            (near the top, before other scripts)
 *   I18N.registerDict('taboo', { dealBtn: { zh: '🎬 發一個題目', en: '🎬 Deal a Word' } });
 *   I18N.t('taboo', 'dealBtn')                  -> current-language string
 *   <span data-i18n="common.backToHub"></span>  -> auto-filled + kept in sync
 *   I18N.onChange(() => render());              -> re-run JS-built UI on switch
 */
(function () {
  const STORE_KEY = 'site-lang';

  const dict = {
    common: {
      backToHub: { zh: '← 返回主選單', en: '← Back to Hub' },
    },
  };

  function readLang() {
    try {
      return localStorage.getItem(STORE_KEY) === 'en' ? 'en' : 'zh';
    } catch (e) {
      return 'zh';
    }
  }

  let lang = readLang();
  const listeners = [];

  function t(ns, key) {
    const entry = dict[ns] && dict[ns][key];
    if (!entry) return key;
    return entry[lang] || entry.en || entry.zh || key;
  }

  function registerDict(ns, obj) {
    dict[ns] = Object.assign(dict[ns] || {}, obj);
  }

  function applyStatic(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
      const spec = el.getAttribute('data-i18n');
      const dot = spec.indexOf('.');
      if (dot < 0) return;
      const val = t(spec.slice(0, dot), spec.slice(dot + 1));
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
  }

  let toggleWrap = null;

  function updateToggleUI() {
    if (!toggleWrap) return;
    toggleWrap.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'zh';
    try {
      localStorage.setItem(STORE_KEY, lang);
    } catch (e) {}
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    applyStatic(document);
    updateToggleUI();
    listeners.forEach((fn) => {
      try {
        fn(lang);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function buildToggle() {
    if (document.getElementById('i18n-toggle')) return;
    const style = document.createElement('style');
    style.textContent = `
      /* Pinned to the top-right only as a fallback. Pinned is where it used to
         live full time, and on every game page below ~1400px it sat on top of
         the round counter (measured at 320 / 390 / 768 / 1280px; only 1920px
         cleared it, because the content centres). It now docks into the page's
         own top row instead — see buildToggle() — and takes part in the layout
         rather than floating over it. */
      #i18n-toggle {
        position: fixed;
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        z-index: 9999;
        display: flex;
        background: #22224a;
        border: 1px solid #2a2a52;
        border-radius: 999px;
        padding: 3px;
        gap: 2px;
        box-shadow: 0 4px 16px rgba(0,0,0,.4);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      #i18n-toggle button {
        border: none;
        background: transparent;
        color: #9999bb;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 13px;
        border-radius: 999px;
        cursor: pointer;
        font-family: inherit;
        transition: background .15s, color .15s;
      }
      #i18n-toggle button.active { background: #2a2a52; color: #fff; }
      #i18n-toggle button:not(.active):hover { color: #ccc; }
      #i18n-toggle.is-docked { position: static; top: auto; right: auto; }
      /* The top row is justify-content: space-between and now holds one more
         child. An auto margin on the back link eats the free space before
         space-between gets a say, so the link stays hard left and the round
         counter packs up against the pill instead of drifting into the middle.
         Both rows wrap so the pill drops to a second line at phone widths
         rather than pushing the page wide. */
      .topbar { gap: 14px; flex-wrap: wrap; }
      .topbar > a.back { margin-right: auto; }
      .hero { flex-wrap: wrap; }
      @media (max-width: 480px) {
        #i18n-toggle button { padding: 6px 10px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'i18n-toggle';
    wrap.innerHTML =
      '<button type="button" data-lang="zh">中文</button>' +
      '<button type="button" data-lang="en">EN</button>';
    /* Dock into whatever this page uses as its top row: the game pages and
       Let's Talk have .topbar, the hub has .hero. Both are flex rows that come
       BEFORE .header, which is what keeps the pill reachable while guide.js has
       the rest of the page veiled behind the how-to-play screen (it veils every
       body child after .header). Pages without either row keep the pinned
       fallback above. */
    const host = document.querySelector('.topbar') || document.querySelector('.hero');
    if (host) {
      host.appendChild(wrap);
      wrap.classList.add('is-docked');
    } else {
      document.body.appendChild(wrap);
    }
    wrap.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
    toggleWrap = wrap;
    updateToggleUI();
  }

  function init() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    const run = () => {
      buildToggle();
      applyStatic(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  window.I18N = {
    t,
    registerDict,
    applyStatic,
    setLang,
    onChange,
    get lang() {
      return lang;
    },
  };

  init();
})();
