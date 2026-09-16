/*
 * guide.js — the briefing screen every game page opens on.
 *
 * Flow: how-to-play  ->  game setup  ->  the game itself.
 * The middle step only exists on the two pages that actually have settings of
 * their own (say-it-without-saying-it.html's difficulty/timer wizard, dare-conquest.html's Start
 * Game card). Everywhere else room setup already happened once on index.html,
 * so this screen hands straight over to the game.
 *
 * Usage — the page opts in from <body>, no inline script needed:
 *   <body data-guide="wordwolf" data-guide-next="game">
 *   <script src="guide-data.js"></script>
 *   <script src="guide.js"></script>
 *
 * How it hides the page: everything after .header gets a .guide-veiled class,
 * which is a separate switch from the .hidden class the games toggle
 * themselves. Removing the veil therefore reveals a page in exactly the state
 * its own scripts left it in — conquest's #game-area stays .hidden behind its
 * setup card, fb-warning stays hidden unless Firebase really is missing, and so
 * on. Scripts keep running while veiled; only the pixels are held back.
 */
(function () {
  const VEIL = 'guide-veiled';

  const DICT = {
    toSetup:  { zh: '▶️ 前往遊戲設定', en: '▶️ Go to game setup' },
    toGame:   { zh: '▶️ 開始遊戲',     en: '▶️ Start the game' },
    close:    { zh: '✖️ 關閉說明',     en: '✖️ Close' },
    players:  { zh: '👥 建議人數',     en: '👥 Players' },
  };

  const lang = () => (typeof I18N !== 'undefined' && I18N.lang === 'en' ? 'en' : 'zh');
  const s = (pair) => (pair ? pair[lang()] || pair.en || pair.zh || '' : '');
  const gt = (key) =>
    typeof I18N !== 'undefined' ? I18N.t('guide', key) : DICT[key][lang()];

  /* 📱 Phone mockups.
     Some games deal a secret card to each player's phone, and that card is the
     one thing that never appears on the shared screen — so the host has never
     seen it either, and a sentence describing it does not land. These draw it.
     A phone's `card` is declarative so each game only says what its own card
     shows: `name` + `color` (1–8, play.html's player palette) make the filled
     name chip, `emoji` / `word` the big reveal, `hint` the small line under the
     divider, `buttons` [{label, cls}] any buttons that card really has. Every
     field is optional. Styles live in shared.css (`.guide-phone`, `.gp-*`). */
  const CARD_COLORS = ['#ef4444', '#4f9eff', '#22c55e', '#f59e0b',
                       '#a78bfa', '#06b6d4', '#84cc16', '#ec4899'];

  function phoneHTML(p) {
    const c = p.card || {};
    const hex = CARD_COLORS[((c.color || 1) - 1) % CARD_COLORS.length];
    const parts = [];
    if (c.name) parts.push(`<span class="gp-name" style="border-color:${hex};background:${hex}">${c.name}</span>`);
    if (c.chip) {
      const ch = c.chip.hex || 'var(--accent)';
      parts.push(`<span class="gp-chip" style="color:${ch};border-color:${ch}55;background:${ch}1a">${s(c.chip.label)}</span>`);
    }
    if (c.text)  parts.push(`<span class="gp-text">${s(c.text)}</span>`);
    if (c.emoji) parts.push(`<span class="gp-emoji">${c.emoji}</span>`);
    if (c.word)  parts.push(`<span class="gp-word">${s(c.word)}</span>`);
    if (c.target) {
      parts.push(`<div class="gp-target">
          <span class="gp-tt-emoji">${c.target.emoji}</span>
          <span class="gp-tt-word">${s(c.target.word)}</span>
        </div>`);
    }
    if (c.pills) {
      parts.push(`<div class="gp-pills">
          <span class="gp-pill-label">${s(c.pills.label)}</span>
          <div class="gp-pill-list">${c.pills.items.map(w => `<span class="gp-pill">${w}</span>`).join('')}</div>
        </div>`);
    }
    if (c.role) {
      const rHint = s(c.role.hint);   // 沒有提示就不要畫一個空元素出來撐間距
      parts.push(`<div class="gp-role">
          <span class="gp-role-key">${s(c.role.key)}</span>
          <span class="gp-role-name">${s(c.role.name)}</span>
          ${rHint ? `<span class="gp-role-hint">${rHint}</span>` : ''}
        </div>`);
    }
    if (c.turnbar) {
      const th = CARD_COLORS[((c.turnbar.color || 1) - 1) % CARD_COLORS.length];
      parts.push(`<div class="gp-turnbar" style="border-color:${th};background:${th}1a;color:${th}">
          <span class="gp-ct-token">●</span>
          <span class="gp-ct-name">${c.turnbar.name}</span>
          <span class="gp-ct-suffix">${s(c.turnbar.suffix)}</span>
        </div>`);
    }
    if (c.sub) parts.push(`<span class="gp-sub">${s(c.sub)}</span>`);
    if (c.buttons && c.buttons.length) {
      parts.push(`<div class="gp-btns">${c.buttons
        .map(b => `<div class="gp-btn ${b.cls || ''}">${s(b.label)}</div>`)
        .join('')}</div>`);
    }
    if (c.hint) parts.push(`<span class="gp-hint">${s(c.hint)}</span>`);
    return `<div class="guide-phone-col">
        <span class="guide-phone-cap">${s(p.caption)}</span>
        <div class="guide-phone"><div class="gp-card">${parts.join('')}</div></div>
      </div>`;
  }

  function sectionHTML(sec) {
    let inner = '';
    if (sec.paragraphs) {
      inner = sec.paragraphs.map((p) => `<p class="guide-p">${s(p)}</p>`).join('');
    } else if (sec.steps) {
      inner = `<ol class="guide-steps">${sec.steps
        .map((x) => `<li>${s(x)}</li>`)
        .join('')}</ol>`;
    } else if (sec.roles) {
      inner = `<div class="guide-roles">${sec.roles
        .map(
          (r) => `<div class="guide-role">
            <span class="guide-role-emoji">${r.emoji}</span>
            <div class="guide-role-body">
              <div class="guide-role-name">${s(r.name)}</div>
              <div class="guide-role-desc">${s(r.desc)}</div>
            </div>
          </div>`
        )
        .join('')}</div>`;
    } else if (sec.phones) {
      inner = `<div class="guide-phones">${sec.phones.map(phoneHTML).join('')}</div>`
            + (sec.note ? `<p class="guide-phone-note">${s(sec.note)}</p>` : '');
    } else if (sec.tips) {
      inner = `<ul class="guide-tips">${sec.tips
        .map((x) => `<li>${s(x)}</li>`)
        .join('')}</ul>`;
    }
    return `<section class="guide-sec">
      <h2 class="guide-sec-title"><span class="guide-sec-icon">${sec.icon}</span>${s(sec.title)}</h2>
      ${inner}
    </section>`;
  }

  function screenHTML(data, next) {
    return `
      <div class="guide-top">
        <span class="guide-badge">${gt('players')} · ${s(data.players)}</span>
      </div>
      <p class="guide-tagline">${s(data.tagline)}</p>
      ${data.sections.map(sectionHTML).join('')}
      <div class="guide-actions">
        <button type="button" class="guide-start">${next === 'setup' ? gt('toSetup') : gt('toGame')}</button>
      </div>`;
  }

  function init() {
    const body = document.body;
    const key = body.dataset.guide;
    if (!key || typeof GAME_GUIDES === 'undefined') return;
    const data = GAME_GUIDES[key];
    const header = document.querySelector('.header');
    if (!data || !header) return;

    if (typeof I18N !== 'undefined') I18N.registerDict('guide', DICT);

    const next = body.dataset.guideNext || 'game';

    // Veil the game itself. Scripts still run behind it.
    // i18n.js appends its language toggle to the body before this runs, so it
    // sits in the same sweep — skip it, or switching language becomes
    // impossible for as long as the briefing is open.
    const veiled = [];
    for (let n = header.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.tagName === 'SCRIPT' || n.id === 'i18n-toggle') continue;
      n.classList.add(VEIL);
      veiled.push(n);
    }

    const screen = document.createElement('section');
    screen.className = 'guide-screen';
    screen.id = 'game-guide';

    header.insertAdjacentElement('afterend', screen);

    function draw() {
      screen.innerHTML = screenHTML(data, next);
      screen.querySelector('.guide-start').addEventListener('click', close);
    }

    function open() {
      draw();
      screen.classList.remove('hidden');
      veiled.forEach((el) => el.classList.add(VEIL));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function close() {
      screen.classList.add('hidden');
      veiled.forEach((el) => el.classList.remove(VEIL));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Re-render in place on a language switch, without changing which
    // screen the host is currently looking at.
    if (typeof I18N !== 'undefined') {
      I18N.onChange(() => { if (!screen.classList.contains('hidden')) draw(); });
    }

    draw();
    window.GUIDE = { open, close };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
