/*
 * i18n.js — shared bilingual UI layer for every page.
 * Traditional Chinese is the default; a floating toggle switches to English.
 * Game content itself (game-data.js words/scenarios/questions/charges) and
 * each game's English title are never touched by this — only the UI chrome
 * around them (buttons, labels, status text, instructions) is translated.
 *
 * Usage:
 *   <script src="i18n.js"></script>            (near the top, before other scripts)
 *   I18N.registerDict('wordwolf', { dealBtn: { zh: '發字卡', en: '🎬 Deal Words' } });
 *   I18N.t('wordwolf', 'dealBtn')               -> current-language string
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
      #i18n-toggle {
        position: fixed;
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        z-index: 9999;
        display: flex;
        background: #13132b;
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
        color: #888;
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
    document.body.appendChild(wrap);
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
