/* theme.js — IceBreak Hub five-theme switcher */
(function () {
  const KEY = 'ib-theme';
  const THEMES = ['space','soft','sunset','forest','candy'];
  const LABELS = {
    space:  '🌸 Soft',
    soft:   '🌅 Sunset',
    sunset: '🌲 Forest',
    forest: '🍬 Candy',
    candy:  '🌌 Space'
  };

  function apply(t) {
    document.documentElement.setAttribute('data-theme', THEMES.includes(t) ? t : 'space');
  }

  /* Apply saved theme immediately — prevents flash of unstyled content */
  apply(localStorage.getItem(KEY) || 'space');

  /* Inject FAB button CSS (self-contained so no shared.css dependency) */
  const s = document.createElement('style');
  s.textContent = `
    .ib-theme-fab {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      border: 2px solid; border-radius: 999px;
      padding: 9px 18px; font-size: .8rem; font-weight: 700;
      cursor: pointer; font-family: inherit; letter-spacing: .3px;
      transition: transform .15s, background .3s, color .3s, border-color .3s, box-shadow .3s;
      outline: none;
    }
    :root .ib-theme-fab {
      background: #161630; color: #888; border-color: #2a2a4a;
      box-shadow: 0 4px 16px rgba(0,0,0,.45);
    }
    :root .ib-theme-fab:hover { color: #ccc; border-color: #555; transform: translateY(-2px); }
    [data-theme="soft"] .ib-theme-fab {
      background: #fff; color: #7a6555; border-color: #e0cfc4;
      box-shadow: 0 4px 16px rgba(120,60,10,.12);
    }
    [data-theme="soft"] .ib-theme-fab:hover { color: #3a2515; border-color: #c0a898; transform: translateY(-2px); }
    [data-theme="sunset"] .ib-theme-fab {
      background: #28123e; color: #b07890; border-color: #4a2265;
      box-shadow: 0 4px 16px rgba(0,0,0,.45);
    }
    [data-theme="sunset"] .ib-theme-fab:hover { color: #f8ddc8; border-color: #7a4070; transform: translateY(-2px); }
    [data-theme="forest"] .ib-theme-fab {
      background: #0e2018; color: #78a860; border-color: #1c3a22;
      box-shadow: 0 4px 16px rgba(0,0,0,.45);
    }
    [data-theme="forest"] .ib-theme-fab:hover { color: #e8f2e0; border-color: #3a7040; transform: translateY(-2px); }
    [data-theme="candy"] .ib-theme-fab {
      background: #fff; color: #8a5080; border-color: #f2c0df;
      box-shadow: 0 4px 16px rgba(200,80,160,.12);
    }
    [data-theme="candy"] .ib-theme-fab:hover { color: #28102a; border-color: #d080b8; transform: translateY(-2px); }
    .ib-theme-fab:active { transform: scale(.95) !important; }
  `;
  document.head.appendChild(s);

  /* Inject FAB button after DOM is ready */
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.createElement('button');
    btn.id = 'ib-theme-btn';
    btn.className = 'ib-theme-fab';
    btn.onclick = function () {
      const current = document.documentElement.getAttribute('data-theme') || 'space';
      const idx = THEMES.indexOf(current);
      const next = THEMES[(idx + 1) % THEMES.length];
      apply(next);
      localStorage.setItem(KEY, next);
      refresh(btn);
    };
    document.body.appendChild(btn);
    refresh(btn);
  });

  function refresh(btn) {
    const t = document.documentElement.getAttribute('data-theme') || 'space';
    btn.textContent = LABELS[t] || LABELS['space'];
  }
})();
