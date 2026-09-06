/*
 * guide.js — the briefing screen every game page opens on.
 *
 * Flow: how-to-play  ->  game setup  ->  the game itself.
 * The middle step only exists on the two pages that actually have settings of
 * their own (dont-say-it.html's difficulty/timer wizard, conquest.html's Start
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
    reopen:   { zh: '📖 玩法說明',     en: '📖 How to play' },
    close:    { zh: '✖️ 關閉說明',     en: '✖️ Close' },
    players:  { zh: '👥 建議人數',     en: '👥 Players' },
  };

  const lang = () => (typeof I18N !== 'undefined' && I18N.lang === 'en' ? 'en' : 'zh');
  const s = (pair) => (pair ? pair[lang()] || pair.en || pair.zh || '' : '');
  const gt = (key) =>
    typeof I18N !== 'undefined' ? I18N.t('guide', key) : DICT[key][lang()];

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

    // Sits on the game screen so the host can re-read the rules mid-round.
    const reopen = document.createElement('button');
    reopen.type = 'button';
    reopen.className = 'guide-reopen hidden';
    reopen.textContent = gt('reopen');

    header.insertAdjacentElement('afterend', screen);
    screen.insertAdjacentElement('afterend', reopen);

    function draw() {
      screen.innerHTML = screenHTML(data, next);
      screen.querySelector('.guide-start').addEventListener('click', close);
      reopen.textContent = gt('reopen');
    }

    function open() {
      draw();
      screen.classList.remove('hidden');
      reopen.classList.add('hidden');
      veiled.forEach((el) => el.classList.add(VEIL));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function close() {
      screen.classList.add('hidden');
      reopen.classList.remove('hidden');
      veiled.forEach((el) => el.classList.remove(VEIL));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    reopen.addEventListener('click', open);
    // Re-render in place on a language switch, without changing which
    // screen the host is currently looking at.
    if (typeof I18N !== 'undefined') {
      I18N.onChange(() => {
        if (screen.classList.contains('hidden')) reopen.textContent = gt('reopen');
        else draw();
      });
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
