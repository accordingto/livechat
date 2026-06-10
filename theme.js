/* theme.js — IceBreak Hub two-theme switcher */
(function () {
  const KEY = 'ib-theme';

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t === 'soft' ? 'soft' : 'space');
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
      const next = current === 'soft' ? 'space' : 'soft';
      apply(next);
      localStorage.setItem(KEY, next);
      refresh(btn);
    };
    document.body.appendChild(btn);
    refresh(btn);
  });

  function refresh(btn) {
    const t = document.documentElement.getAttribute('data-theme') || 'space';
    btn.textContent = t === 'soft' ? '🌌 Space' : '🌸 Soft';
  }
})();
