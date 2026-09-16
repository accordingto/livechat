/* room.js — the shared "player cards" layer.
   Include AFTER firebase-config.js, the firebase compat scripts and qrcode.js.

   Every game that hands out player links needs the same four things: the room code,
   one unguessable token per player, the names, and the setup UI that shows them. The
   five original games each grew their own copy of that; this module is the single
   implementation the newer games use.

   Storage is shared with all of them: `room-session-{CODE}` holds
   { tokens, playerCount, names }, and `room-last-session` remembers the code the host
   was on, so switching games keeps the same links, the same player count and the same
   names. Firebase paths stay per-token (rooms/{code}/players/{token}) — no room-wide
   reads, matching the database rules.

   Without Firebase (not configured, or the CDN is unreachable) everything still runs:
   the room row and link buttons hide themselves and the game keeps working on the
   host's screen alone. */
if (typeof I18N !== 'undefined') {
  I18N.registerDict('room', {
    roomLabel: { zh: '房號', en: 'Room' },
    loadBtn: { zh: '載入', en: 'Load' },
    newRoomBtn: { zh: '新房間', en: 'New Room' },
    playersLabel: { zh: '玩家', en: 'Players' },
    copyAllBtn: { zh: '📋 複製所有連結', en: '📋 Copy All Links' },
    copiedBtn: { zh: '已複製', en: 'Copied' },
    linkBtn: { zh: '連結', en: 'Link' },
    qrBtn: { zh: 'QR', en: 'QR' },
    sendCheckBtn: { zh: '🔍 傳送核對卡', en: '🔍 Send Card Check' },
    linksHdrOptional: { zh: '🔗 玩家連結 <span class="room-tag">選填</span>', en: '🔗 Player Links <span class="room-tag">optional</span>' },
    linksHdrNoFirebase: { zh: '👥 玩家', en: '👥 Players' },
    checkSentNote: { zh: '🔍 核對字已送出 — 請每位玩家先唸出卡片上看到的內容，核對完後按「顯示所有答案」查看正確答案。', en: '🔍 Check words sent — have each player say what they see out loud first, then tap "Reveal Answers" to check them against the real thing.' },
    revealCheckBtn: { zh: '👁️ 顯示所有答案', en: '👁️ Reveal Answers' },
    checkRevealedNote: { zh: '✅ 答案已顯示 — 核對完畢後，重新發牌就能繼續遊戲。', en: '✅ Answers revealed — re-deal the game whenever you\'re done checking.' },
    clearBtn: { zh: '✖️ 清除', en: '✖️ Clear' },
    playerPlaceholder: { zh: '玩家 {n}', en: 'Player {n}' },
    copyPromptLink: { zh: '複製這個連結：', en: 'Copy this link:' },
    copyPromptGeneric: { zh: '複製這個：', en: 'Copy this:' },
  });
}

const ROOM = (() => {
  const STORAGE_PREFIX = 'room-session-';
  const LAST_SESSION_KEY = 'room-last-session';

  const rt = key => (typeof I18N !== 'undefined' ? I18N.t('room', key) : key);
  const playerLabel = i => rt('playerPlaceholder').replace('{n}', i + 1);

  let cfg = {};
  let sessionCode = '';
  let tokens = [];
  let names = [];
  let count = 4;
  let db = null;
  let listeners = [];
  const data = {}; // playerNum -> the node's latest value, for tallying votes

  /* ── Firebase (optional) ── */
  const available = typeof firebase !== 'undefined'
    && typeof FIREBASE_CONFIG !== 'undefined'
    && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  if (available) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
    } catch (e) { db = null; }
  }
  const on = () => !!db;

  /* ── Codes and tokens ── */
  function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous characters
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => chars[b % chars.length]).join('');
  }

  /* an unguessable random token, so one player's link can't be edited into another's */
  function generateToken() {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadSessionData(code) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + code);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? { tokens: parsed, playerCount: parsed.length } : parsed;
    } catch (e) { return null; }
  }

  function save() {
    if (!tokens.length) return; // nothing to share yet — don't point other games at an empty room
    try {
      const prev = loadSessionData(sessionCode) || {};
      // names are shared with every game, so keep slots this game doesn't cover
      const merged = (prev.names || []).slice();
      for (let i = 0; i < count; i++) merged[i] = names[i] || '';
      // spread prev: other games keep their own keys in this shared blob
      // (Kangaroo Court stores judgeEnabled), and dropping them silently
      // resets their settings the next time the host switches back
      localStorage.setItem(STORAGE_PREFIX + sessionCode, JSON.stringify(
        Object.assign({}, prev, { tokens, playerCount: count, names: merged })));
      localStorage.setItem(LAST_SESSION_KEY, sessionCode);
    } catch (e) { /* private browsing — links still work for this session */ }
  }

  /* a game's own setting, parked in the same shared session blob (Kangaroo Court keeps
     judgeEnabled here). Reading and writing it through room.js is what stops another
     game's save from quietly dropping it. */
  function setExtra(key, value) {
    try {
      const prev = loadSessionData(sessionCode) || {};
      prev[key] = value;
      localStorage.setItem(STORAGE_PREFIX + sessionCode, JSON.stringify(prev));
    } catch (e) { /* private browsing — the setting just won't persist */ }
  }

  function getExtra(key) {
    const saved = loadSessionData(sessionCode);
    return saved ? saved[key] : undefined;
  }

  function clampCount(n) {
    const allowed = cfg.counts;
    if (allowed.includes(n)) return n;
    return allowed.reduce((best, c) => Math.abs(c - n) < Math.abs(best - n) ? c : best);
  }

  function ensureTokens(n) {
    const before = tokens.length;
    while (tokens.length < n) tokens.push(generateToken());
    if (tokens.length !== before) save();
  }

  /* ── Links ── */
  /* the name rides along in the URL so the card can title itself before Firebase
     answers; the token still does all the identifying */
  function cardURL(i) {
    const url = new URL(`play.html?s=${sessionCode}&p=${tokens[i]}`, location.href);
    const name = String(names[i] || '').trim();
    if (name) url.searchParams.set('n', name);
    return url.href;
  }

  function shareText(i) {
    const name = String(names[i] || '').trim();
    return name ? `${name}\n${cardURL(i)}` : cardURL(i);
  }

  function copyLink(i, btn) {
    const text = shareText(i);
    const done = () => {
      btn.textContent = rt('copiedBtn');
      btn.classList.remove('is-copied');
      void btn.offsetWidth; // restart the animation even on a rapid re-click
      btn.classList.add('is-copied');
      // a second click before the first revert fires shouldn't leave the button
      // stuck on "Copied" — clear the pending revert so only the latest click wins
      clearTimeout(btn._copyRevert);
      btn._copyRevert = setTimeout(() => { btn.textContent = rt('linkBtn'); btn.classList.remove('is-copied'); }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => prompt(rt('copyPromptLink'), text));
    } else {
      prompt(rt('copyPromptGeneric'), text);
    }
  }

  /* one clipboard write with every player's link, so the host can paste the
     whole roster into chat instead of copying and pasting one at a time —
     a blank line between players keeps each name+link pair readable */
  function copyAllLinks() {
    const btn = document.getElementById('copy-all-btn');
    ensureTokens(count);
    const text = Array.from({ length: count }, (_, i) => shareText(i)).join('\n\n');
    const done = () => {
      btn.textContent = rt('copiedBtn');
      btn.classList.remove('is-copied');
      void btn.offsetWidth;
      btn.classList.add('is-copied');
      clearTimeout(btn._copyRevert);
      btn._copyRevert = setTimeout(() => { btn.textContent = rt('copyAllBtn'); btn.classList.remove('is-copied'); }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => prompt(rt('copyPromptGeneric'), text));
    } else {
      prompt(rt('copyPromptGeneric'), text);
    }
  }

  /* a sanity check for after links have gone out: send every player a different,
     simple word (pulled from the shared everyday-word list — 200 words, plenty
     to cover up to 8 players with none repeated) so the host can go around asking
     "what does your card say?" and catch anyone who opened the wrong link before
     the real game starts. This overwrites whatever the current game had published,
     same as any other publish() — dealing the real game afterward replaces it. */
  function sendCardCheck() {
    if (!on()) return;
    const pool = (typeof GAME_DATA !== 'undefined' && GAME_DATA.forbidden) || [];
    if (pool.length < count) return; // not enough words to guarantee everyone different
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    checkWords = shuffled.slice(0, count);
    // the point of this check is catching a host who already knows the
    // answer from silently nodding along — the words stay off the host's
    // own screen until each player has said theirs out loud and
    // revealCardCheck() is pressed on purpose
    checkRevealed = false;
    publish(i => ({ game: 'cardcheck', word: checkWords[i].word, emoji: checkWords[i].emoji }));
    render();
  }

  function revealCardCheck() {
    if (!checkWords) return;
    checkRevealed = true;
    render();
  }

  function clearCardCheck() {
    checkWords = null;
    checkRevealed = false;
    render();
  }

  function qrSVG(text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  /* one QR open at a time — opening another closes the previous one */
  function toggleQR(i, col, btn) {
    const existing = col.querySelector('.qr-inline');
    document.querySelectorAll('#room-links .qr-inline').forEach(el => { if (el !== existing) el.remove(); });
    document.querySelectorAll('#room-links .btn-qr-toggle').forEach(b => { if (b !== btn) b.classList.remove('open'); });
    if (existing) { existing.remove(); btn.classList.remove('open'); return; }
    const box = document.createElement('div');
    box.className = 'qr-inline';
    box.innerHTML = qrSVG(cardURL(i));
    col.appendChild(box);
    btn.classList.add('open');
  }

  /* ── Setup UI ── */
  function injectCSS(accent) {
    const css = `
      /* --room-accent paints shapes (borders, fills, glows) and keeps the exact brand
         colour; --room-accent-text paints words, and falls back to the page's own
         --accent-text, which is lightened enough to stay readable on a button face. */
      .room-setup { width: 100%; max-width: 1100px; margin: 24px auto;
                    --room-accent: ${accent}; --room-accent-text: var(--accent-text, ${accent}); }
      .room-setup .hidden { display: none !important; }
      .room-card {
        background: var(--surface); border: 2px solid var(--border); border-radius: 20px;
        padding: 22px 26px; display: flex; flex-direction: column; gap: 16px;
        animation: fadeUp .5s .2s ease both;
      }
      .room-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
      .room-label {
        font-size: .86rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;
        color: var(--text-muted, #82829f); min-width: 58px;
      }
      .room-divider { height: 1px; background: var(--border); }
      #room-code-input {
        background: var(--bg); border: 2px solid var(--border); border-radius: 12px;
        color: var(--text); font-family: inherit; font-size: .95rem; font-weight: 800; letter-spacing: 2px;
        text-transform: uppercase; padding: 11px 14px; width: 130px; transition: border-color .2s;
      }
      #room-code-input:focus { outline: none; border-color: var(--room-accent); }
      .room-btn {
        background: var(--btn-face, #22224a); color: var(--text-dim); border: 2px solid var(--border-3); border-radius: 12px;
        padding: 11px 20px; font-size: .88rem; font-weight: 700; font-family: inherit;
        white-space: nowrap; cursor: pointer; transition: background .2s, border-color .2s, color .2s, transform .1s;
      }
      .room-btn:active { transform: scale(.98); }
      .room-btn.primary { color: var(--room-accent-text); border-color: var(--room-accent); }
      .room-count-btns { display: flex; flex-wrap: wrap; gap: 8px; }
      .room-count-btn {
        width: 44px; height: 44px; border-radius: 12px;
        border: 2px solid var(--border-2); background: var(--btn-face, #22224a); color: var(--text-dim);
        font-size: 1rem; font-weight: 800; font-family: inherit; cursor: pointer;
        transition: border-color .2s, color .2s, background .2s, transform .1s;
      }
      .room-count-btn:active { transform: scale(.94); }
      .room-count-btn.active { border-color: var(--room-accent); color: var(--text-hi); background: color-mix(in srgb, var(--room-accent) 18%, transparent); }
      .room-hdr {
        font-size: .86rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;
        color: var(--text-muted, #82829f); margin: 18px 0 10px; display: flex; align-items: center; gap: 8px;
      }
      .room-tag { font-size: .74rem; letter-spacing: .5px; color: var(--text-muted, #82829f); border: 1px solid var(--border); border-radius: 20px; padding: 2px 8px; }
      .room-note { color: var(--text-dim, #9999bb); font-size: .78rem; line-height: 1.6; margin: -4px 0 12px; }
      /* sits right after room-note, wrapping onto its own line on narrow screens
         next to whatever game-specific toggle (e.g. Say It Without Saying It's
         "Show what's on player cards") also lives in that same flow */
      .copy-all-btn { width: 100%; margin-bottom: 14px; }
      .copy-all-btn.is-copied {
        background: rgba(34,197,94,.18); border-color: #22c55e; color: var(--ok-text);
        animation: copyPop .4s ease;
      }
      /* its own accent (not the room's pink, so it never reads as "the same button"
         as Copy All Links) — a pre-flight step easy to skip past if it looks like
         just another muted utility button next to a loud primary one */
      .check-btn {
        margin: 0 0 10px; background: rgba(56,189,248,.1);
        border-color: #38bdf8; color: #7dd3fc;
      }
      .check-note {
        width: 100%; color: #94a3b8; font-size: .78rem; line-height: 1.6; margin: -4px 0 12px;
      }
      .check-note { display: flex; flex-direction: column; gap: 10px; }
      .check-note-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .check-note .check-clear-btn {
        background: none; border: none; color: var(--text-dim, #9999bb); font-family: inherit;
        font-size: .78rem; font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0;
      }
      .check-note .check-clear-btn:hover { color: var(--text-hi); }
      /* the actual "check it's correct now" action — kept as a real button
         (not the plain underlined Clear link) since revealing the answers
         is the whole point of this step, not a minor cleanup action */
      .check-note .check-reveal-btn {
        background: rgba(56,189,248,.12); border: 2px solid #38bdf8; color: #7dd3fc;
        border-radius: 10px; padding: 8px 16px; font-family: inherit;
        font-size: .82rem; font-weight: 800; cursor: pointer; transition: background .2s, transform .1s;
      }
      .check-note .check-reveal-btn:active { transform: scale(.97); }
      /* the host's private answer key: what sendCardCheck() actually sent this
         player, shown only on the host's own screen */
      .check-word-badge {
        width: 100%; border-top: 1px dashed rgba(148,163,184,.3); padding-top: 9px;
        font-size: .82rem; font-weight: 800; color: #94a3b8;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      /* a grid, not a wrapping flex row: with flex:1 items, a lone leftover
         card on its own last row (5 players = a row of 4 then 1 alone, say)
         stretches to fill the entire row width, which looks broken. A grid
         with a fixed 220px-minimum column keeps every card the same width
         whether it's sharing a row or sitting alone in the last one — this
         also caps every row at 3 columns on the widths this site actually
         renders at, so nothing needs to hand-count "more than 4 players" */
      .room-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items: start; gap: 12px; }
      /* In the compact roster the action card and the player columns are direct
         siblings with nothing between them, so they sat edge to edge — two panels
         touching, which reads as one broken box. (The full setup layout has the
         header, the note and the two buttons in between, so this adjacent-sibling
         rule only fires in the compact case, which is the one that needed it.) */
      .room-card + .room-links { margin-top: 18px; }
      .link-col {
        flex: 1; min-width: 160px;
        background: var(--surface); border: 2px solid var(--border); border-radius: 14px; padding: 14px;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        animation: fadeUp .3s ease both; transition: border-color .3s, box-shadow .3s;
      }
      .link-col.is-marked { border-color: var(--room-accent); box-shadow: 0 0 20px color-mix(in srgb, var(--room-accent) 25%, transparent); }
      .name-input {
        width: 100%; background: var(--bg); border: 2px solid var(--border); border-radius: 10px;
        color: var(--text); font-family: inherit; font-size: .9rem; font-weight: 700; text-align: center;
        padding: 8px 10px; transition: border-color .2s;
      }
      .name-input::placeholder { color: var(--text-muted, #82829f); }
      .name-input:focus { outline: none; border-color: var(--room-accent); }
      .link-btn-row { display: flex; gap: 8px; width: 100%; }
      .btn-copy {
        flex: 1; min-width: 0; background: var(--btn-face, #22224a); color: var(--room-accent-text); border: 2px solid var(--room-accent);
        border-radius: 10px; padding: 9px 10px;
        font-size: .82rem; font-weight: 700; font-family: inherit; cursor: pointer;
        transition: background .2s, transform .1s;
      }
      .btn-copy:active { transform: scale(.97); }
      /* a quick pop + flash to green on copy — the text swap alone is easy to miss
         on a screen a host glances at for half a second */
      .btn-copy.is-copied {
        background: rgba(34,197,94,.18); border-color: #22c55e; color: var(--ok-text);
        animation: copyPop .4s ease;
      }
      @keyframes copyPop {
        0%   { transform: scale(1); }
        35%  { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
      .btn-qr-toggle {
        background: var(--btn-face, #22224a); color: var(--text-dim); border: 2px solid var(--border-3); border-radius: 10px;
        padding: 9px 12px; font-size: .82rem; font-weight: 700; font-family: inherit; cursor: pointer;
        transition: background .2s, border-color .2s, color .2s;
      }
      .btn-qr-toggle.open { border-color: var(--room-accent); color: var(--room-accent-text); }
      .qr-inline {
        background: #fff; border-radius: 10px; padding: 8px; line-height: 0;
        width: 100%; max-width: 160px; animation: fadeUp .25s ease both;
      }
      .qr-inline svg { width: 100%; height: auto; display: block; }
      /* what each player answered, shown under their name once they tap their card */
      .link-answer {
        width: 100%; border-top: 1px solid var(--border); padding-top: 9px;
        font-size: .82rem; font-weight: 800; line-height: 1.35; color: var(--text-2);
        animation: fadeUp .25s ease both;
      }
      .link-answer .la-sub { display: block; font-size: .7rem; font-weight: 700; color: var(--text-muted, #82829f); margin-top: 3px; }
      @media (hover: hover) and (pointer: fine) {
        .room-btn:hover { border-color: var(--room-accent); color: var(--room-accent-text); }
        .room-count-btn:hover { border-color: var(--room-accent); color: var(--room-accent-text); }
        .btn-copy:hover { background: color-mix(in srgb, var(--room-accent) 10%, transparent); }
        .btn-qr-toggle:hover { border-color: var(--room-accent); color: var(--room-accent-text); }
        .check-btn:hover { background: rgba(56,189,248,.2); border-color: #7dd3fc; color: #bae6fd; }
        .check-note .check-reveal-btn:hover { background: rgba(56,189,248,.22); border-color: #bae6fd; color: #bae6fd; }
      }
      @media (max-width: 520px) {
        .link-col { min-width: 130px; padding: 12px 10px; }
        .btn-copy { font-size: .74rem; padding: 9px 4px; }
        .btn-qr-toggle { font-size: .74rem; padding: 9px 8px; }
        .room-count-btn { width: 40px; height: 40px; }
      }`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildDOM(mount) {
    mount.classList.add('room-setup');

    /* Room count, links, "Copy All Links" and "Send Card Check" all now live
       on index.html's own Step 1 — every game shares that one setup, so a
       game passing `hideSetup: true` skips re-building all of it here and
       only keeps what it actually still needs: any real per-game control
       (`actionsHTML` — e.g. Word Wolf's own Deal button, `extraRowHTML` —
       e.g. Kangaroo Court's Judge toggle) and, once there's something worth
       showing, a compact read-only roster (see renderCompact()) — nothing a
       host would call "setup," just the answer the game wants them to see
       next to each name (a role, a vote, a pick). */
    if (cfg.hideSetup) {
      const rows = [];
      if (cfg.actionsHTML) rows.push(`<div class="room-row" id="room-actions-row">${cfg.actionsHTML}</div>`);
      if (cfg.extraRowHTML) rows.push(`<div class="room-row" id="room-extra-row">${cfg.extraRowHTML}</div>`);
      mount.innerHTML = `
        ${rows.length ? `<div class="room-card compact">${rows.join('<div class="room-divider"></div>')}</div>` : ''}
        <div class="room-links hidden" id="room-links"></div>`;
      return;
    }

    mount.innerHTML = `
      <div class="room-card">
        <div class="room-row">
          <span class="room-label" data-i18n="room.playersLabel">${rt('playersLabel')}</span>
          <div class="room-count-btns" id="room-count-btns"></div>
          <span id="room-actions"></span>
        </div>
        <div class="room-divider hidden" id="room-code-divider"></div>
        <div class="room-row hidden" id="room-code-row">
          <span class="room-label" data-i18n="room.roomLabel">${rt('roomLabel')}</span>
          <input id="room-code-input" maxlength="8" autocomplete="off" spellcheck="false">
          <button class="room-btn" id="room-load-btn" data-i18n="room.loadBtn">${rt('loadBtn')}</button>
          <button class="room-btn" id="room-new-btn" data-i18n="room.newRoomBtn">${rt('newRoomBtn')}</button>
        </div>
        ${cfg.extraRowHTML ? `<div class="room-divider"></div><div class="room-row" id="room-extra-row">${cfg.extraRowHTML}</div>` : ''}
      </div>
      <div class="room-hdr" id="room-hdr"></div>
      <p class="room-note hidden" id="room-note"></p>
      <button class="room-btn primary copy-all-btn hidden" id="copy-all-btn" type="button" data-i18n="room.copyAllBtn">${rt('copyAllBtn')}</button>
      <button class="room-btn check-btn hidden" id="check-btn" type="button" data-i18n="room.sendCheckBtn">${rt('sendCheckBtn')}</button>
      <p class="check-note hidden" id="check-note"></p>
      <div class="room-links" id="room-links"></div>`;

    document.getElementById('room-load-btn').onclick = loadRoomCode;
    document.getElementById('room-new-btn').onclick = newRoom;
    document.getElementById('copy-all-btn').onclick = copyAllLinks;
    document.getElementById('check-btn').onclick = sendCardCheck;
    document.getElementById('room-code-input').onkeydown = e => { if (e.key === 'Enter') loadRoomCode(); };

    const btns = document.getElementById('room-count-btns');
    cfg.counts.forEach(n => {
      const b = document.createElement('button');
      b.className = 'room-count-btn' + (n === count ? ' active' : '');
      b.textContent = n;
      b.onclick = () => setCount(n);
      btns.appendChild(b);
    });
    if (cfg.actionsHTML) document.getElementById('room-actions').innerHTML = cfg.actionsHTML;
  }

  /* per-player marks + answers the game wants shown under the name (e.g. the judge, or a vote) */
  let decorate = null;

  /* the word (or null) currently sent to each player index by sendCardCheck() —
     kept around purely so the host's own screen can show what was sent next to
     each name, as a private answer key for "what does your card say?" */
  let checkWords = null;

  /* whether the host has pressed "Reveal Answers" yet for the current
     checkWords — kept separate from checkWords itself so sending the check
     and seeing the answer key are two deliberate steps: players read their
     card out loud first, the host reveals the answer key second, instead of
     the answers just appearing on the host's screen the instant they're sent
     (which defeats the point of the check — a host who can already see the
     answer isn't actually verifying anything). */
  let checkRevealed = false;

  /* which parts of each player row render() draws — only index.html's own
     Step 1 wizard ever changes this (its sub-steps split name-editing, the
     three link-sharing methods, and the card-check answer into separate
     screens, each showing read-only names for anything that isn't "edit the
     names" itself); every other non-hideSetup caller never touches it and
     keeps the original all-in-one row.
       'full'     = name input + Link + QR toggle + check badge (default,
                    unchanged legacy behavior)
       'names'    = editable name input only
       'link-only'= read-only name + a Link button only, no QR
       'qr-only'  = read-only name + a QR toggle button only, no Link
                    button (same one-open-at-a-time toggleQR() behavior as
                    'full' — showing every code at once risks a phone
                    camera scanning the wrong player's)
       'check'    = read-only name + check badge only */
  let linksView = 'full';

  function render() {
    const wrap = document.getElementById('room-links');
    if (!wrap) return;
    if (cfg.hideSetup) { renderCompact(wrap); return; }
    const live = on();
    document.getElementById('room-code-row').classList.toggle('hidden', !live);
    document.getElementById('room-code-divider').classList.toggle('hidden', !live);
    // linksNote may be a function so callers can keep it in sync with the
    // current language (see index.html, the only caller still using it)
    const linksNote = typeof cfg.linksNote === 'function' ? cfg.linksNote() : cfg.linksNote;
    document.getElementById('room-note').classList.toggle('hidden', !live || !linksNote);
    document.getElementById('copy-all-btn').classList.toggle('hidden', !live);
    document.getElementById('check-btn').classList.toggle('hidden', !live);
    const checkNote = document.getElementById('check-note');
    checkNote.classList.toggle('hidden', !live || !checkWords);
    if (live && checkWords) {
      checkNote.innerHTML = '';
      const text = document.createElement('span');
      text.textContent = checkRevealed ? rt('checkRevealedNote') : rt('checkSentNote');
      checkNote.appendChild(text);
      const actions = document.createElement('div');
      actions.className = 'check-note-actions';
      if (!checkRevealed) {
        const revealBtn = document.createElement('button');
        revealBtn.type = 'button';
        revealBtn.className = 'check-reveal-btn';
        revealBtn.textContent = rt('revealCheckBtn');
        revealBtn.onclick = revealCardCheck;
        actions.appendChild(revealBtn);
      }
      const clearLink = document.createElement('button');
      clearLink.type = 'button';
      clearLink.className = 'check-clear-btn';
      clearLink.textContent = rt('clearBtn');
      clearLink.onclick = clearCardCheck;
      actions.appendChild(clearLink);
      checkNote.appendChild(actions);
    }
    document.getElementById('room-hdr').innerHTML = live
      ? rt('linksHdrOptional')
      : rt('linksHdrNoFirebase');
    if (linksNote) document.getElementById('room-note').textContent = linksNote;
    if (live) {
      ensureTokens(count);
      document.getElementById('room-code-input').value = sessionCode;
    }
    // typing a name fires onNameChange -> render() on every keystroke (so the
    // decorator can react live). Recreating every <input> from scratch would
    // destroy and rebuild the one node the host is actively typing into, and
    // restoring focus to its replacement after the fact is a race the browser
    // doesn't always win under fast typing — a keystroke landing in the tiny
    // window between the old node dying and the new one being refocused just
    // disappears. So instead the currently-focused name-input is pulled out
    // before the wipe and reused as-is (same node, same cursor position, no
    // refocus needed) rather than replaced.
    const editableNames = linksView === 'names' || linksView === 'full';
    const active = document.activeElement;
    const reuseInput = (editableNames && active && active.classList && active.classList.contains('name-input') && wrap.contains(active)) ? active : null;
    const reuseIndex = reuseInput ? Array.from(wrap.children).indexOf(reuseInput.closest('.link-col')) : -1;
    if (reuseInput) reuseInput.remove(); // detach so it survives wrap.innerHTML = '' below
    wrap.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const info = decorate ? (decorate(i) || {}) : {};
      const col = document.createElement('div');
      // `cls` lets a game paint its own states on the column (the Wolf, a team,
      // an already-revealed card) with classes it defines in its own stylesheet
      col.className = 'link-col' + (info.marked ? ' is-marked' : '') + (info.cls ? ' ' + info.cls : '');

      let input;
      if (!editableNames) {
        // read-only, e.g. index.html's Link/QR and card-check sub-steps — the
        // name was already locked in on the "set player names" sub-step
        input = document.createElement('div');
        input.className = 'name-input is-static';
        input.textContent = api.name(i);
      } else if (i === reuseIndex && reuseInput) {
        input = reuseInput; // same node: value, cursor and selection are already correct
      } else {
        input = document.createElement('input');
        input.className = 'name-input';
        input.maxLength = 14;
        input.placeholder = playerLabel(i);
        input.value = names[i] || '';
        input.oninput = () => {
          // don't trim here — this runs on every keystroke, and trimming a
          // trailing space the moment it's typed (before the next letter can
          // follow it) makes multi-word names impossible to type; every reader
          // of `names` (ROOM.name(), cardURL(), shareText()) already trims
          names[i] = input.value;
          save();
          if (cfg.onNameChange) cfg.onNameChange();
        };
      }
      col.appendChild(input);

      if (live && (linksView === 'link-only' || linksView === 'full')) {
        const row = document.createElement('div');
        row.className = 'link-btn-row';
        const copy = document.createElement('button');
        copy.className = 'btn-copy';
        copy.textContent = rt('linkBtn');
        copy.onclick = () => copyLink(i, copy);
        row.appendChild(copy);
        if (linksView === 'full') {
          const qr = document.createElement('button');
          qr.className = 'btn-qr-toggle';
          qr.textContent = rt('qrBtn');
          qr.onclick = () => toggleQR(i, col, qr);
          row.appendChild(qr);
        }
        col.appendChild(row);
      }

      // index.html's QR-sharing method: a toggle button per player, same
      // one-at-a-time behavior as toggleQR() always had. Showing every
      // player's code at once (tried first) is actually worse for the
      // "share this screen, everyone scans their own" case it's meant for —
      // with several codes on screen at the same time, a phone camera can
      // easily catch and scan the wrong one.
      if (live && linksView === 'qr-only') {
        const row = document.createElement('div');
        row.className = 'link-btn-row';
        const qr = document.createElement('button');
        qr.className = 'btn-qr-toggle';
        qr.textContent = rt('qrBtn');
        qr.onclick = () => toggleQR(i, col, qr);
        row.appendChild(qr);
        col.appendChild(row);
      }

      if ((linksView === 'check' || linksView === 'full') && checkWords && checkWords[i] && checkRevealed) {
        const badge = document.createElement('div');
        badge.className = 'check-word-badge';
        badge.innerHTML = `<span>${checkWords[i].emoji} ${checkWords[i].word}</span>`;
        col.appendChild(badge);
      }

      if (info.answer) {
        const ans = document.createElement('div');
        ans.className = 'link-answer';
        ans.innerHTML = info.answer;
        col.appendChild(ans);
      }
      wrap.appendChild(col);
    }
    // removing a focused element blurs it synchronously, even when it's about to be
    // reattached in the same tick — so the reused input needs one explicit focus()
    // once it's actually back in the document; its value/cursor/selection carried
    // over untouched since it was never actually re-created
    if (reuseInput) reuseInput.focus();
  }

  /* the `hideSetup` counterpart to render() above: no name inputs, no
     Link/QR buttons — a player only shows up here at all once the game has
     something to say about them (`info.answer`), same `cls`/`marked` styling
     as the full version so a game's own CSS (`.link-col.is-role-defendant`,
     `.link-col.is-wolf`, …) keeps working unmodified. Empty entirely until
     the game actually deals something, same as the full grid would be blank
     before any player links exist. */
  function renderCompact(wrap) {
    wrap.innerHTML = '';
    let any = false;
    for (let i = 0; i < count; i++) {
      const info = decorate ? (decorate(i) || {}) : {};
      if (!info.answer) continue;
      any = true;
      const col = document.createElement('div');
      col.className = 'link-col' + (info.marked ? ' is-marked' : '') + (info.cls ? ' ' + info.cls : '');
      const label = document.createElement('div');
      label.className = 'name-input is-static';
      label.textContent = api.name(i);
      col.appendChild(label);
      const ans = document.createElement('div');
      ans.className = 'link-answer';
      ans.innerHTML = info.answer;
      col.appendChild(ans);
      wrap.appendChild(col);
    }
    wrap.classList.toggle('hidden', !any);
  }

  function setCount(n) {
    count = n;
    checkWords = null; // stale answer key for the old headcount
    document.querySelectorAll('.room-count-btn').forEach(b => b.classList.toggle('active', Number(b.textContent) === n));
    if (on()) ensureTokens(count);
    save();
    attach();
    render();
    if (cfg.onCountChange) cfg.onCountChange(n);
  }

  function loadRoomCode() {
    const typed = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!typed) return;
    sessionCode = typed;
    checkWords = null; // stale answer key for the room we just left
    const saved = loadSessionData(typed);
    tokens = saved && saved.tokens ? saved.tokens.slice() : [];
    // a code with no saved data of its own (brand new, never used) starts
    // blank, same as newRoom() below — it should never inherit whatever
    // names happened to still be in memory from the room just left
    names = (saved && saved.names) ? saved.names.slice() : [];
    if (saved && saved.playerCount) { setCount(clampCount(saved.playerCount)); return; }
    ensureTokens(count);
    save();
    attach();
    render();
  }

  function newRoom() {
    sessionCode = generateSessionCode();
    checkWords = null;
    tokens = [];
    names = []; // a brand new room starts with blank names, not whoever was in the old one
    ensureTokens(count);
    save();
    attach();
    render();
  }

  /* ── Firebase traffic ── */
  function detach() {
    listeners.forEach(l => l.ref.off('value', l.handler));
    listeners = [];
  }

  /* one listener per known token — the rules allow reading a token you know, never a list */
  function attach() {
    detach();
    if (!on()) return;
    for (let i = 0; i < count; i++) {
      const ref = db.ref(`rooms/${sessionCode}/players/${tokens[i]}`);
      const num = i + 1;
      const handler = snap => {
        data[num] = snap.val();
        if (cfg.onPlayerData) cfg.onPlayerData(num, snap.val());
      };
      ref.on('value', handler);
      listeners.push({ ref, handler });
    }
  }

  /* .set() replaces the node, so last round's answer disappears with it */
  function publish(build) {
    if (!on()) return;
    ensureTokens(count);
    for (let i = 0; i < count; i++) {
      const payload = typeof build === 'function' ? build(i) : Object.assign({}, build);
      if (!payload) continue;
      payload.playerNum = i + 1;
      payload.name = names[i] || null;
      db.ref(`rooms/${sessionCode}/players/${tokens[i]}`).set(payload);
      data[i + 1] = null;
    }
    // non-secret name list, so a card can show who else is in the room
    db.ref(`rooms/${sessionCode}/roster`).set(
      Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: names[i] || null }))
    );
  }

  /* mid-round changes: .update() leaves fields the game didn't name alone, so a
     player's answer isn't wiped by the host telling everyone else what changed */
  function update(build) {
    if (!on()) return;
    for (let i = 0; i < count; i++) {
      const payload = typeof build === 'function' ? build(i) : Object.assign({}, build);
      if (!payload) continue;
      db.ref(`rooms/${sessionCode}/players/${tokens[i]}`).update(payload);
    }
  }

  /* drop one player's answer once the game has acted on it, so they can answer again */
  function clearAnswer(i) {
    if (!on() || !tokens[i]) return;
    db.ref(`rooms/${sessionCode}/players/${tokens[i]}/vote`).set(null);
    if (data[i + 1]) data[i + 1] = Object.assign({}, data[i + 1], { vote: null });
  }

  function init(options) {
    cfg = Object.assign({ counts: [2, 3, 4, 5, 6], defaultCount: 4, accent: '#f59e0b' }, options);
    count = cfg.defaultCount;

    let lastCode = null;
    try { lastCode = localStorage.getItem(LAST_SESSION_KEY); } catch (e) { /* ignore */ }
    const saved = lastCode ? loadSessionData(lastCode) : null;
    if (lastCode && saved && saved.tokens && saved.tokens.length) {
      sessionCode = lastCode;
      tokens = saved.tokens.slice();
      names = (saved.names || []).slice();
      // hideSetup pages don't own the room's player count — index.html's Step 1
      // does. Clamping it into *this* game's own counts range (e.g. Kangaroo
      // Court's 4-9) and then letting ensureTokens()/save() below persist that
      // clamped number would silently overwrite the host's real setting (a room
      // set to 3 on Step 1 would come back as 4 after visiting Kangaroo Court).
      // Only the setup page itself — the one with real count buttons — should
      // ever normalize an out-of-range saved count.
      if (saved.playerCount) count = cfg.hideSetup ? saved.playerCount : clampCount(saved.playerCount);
    } else {
      sessionCode = generateSessionCode();
    }

    injectCSS(cfg.accent);
    buildDOM(document.getElementById(cfg.mount));
    if (on()) ensureTokens(count);
    save();
    render();
    attach();
    // re-run the dynamic bits render() builds by hand (placeholders, Link/QR
    // button text, the check-note, the room-hdr) so a language toggle updates
    // them immediately — the purely static markup above is already covered
    // by I18N's own data-i18n rescan on every setLang()
    if (typeof I18N !== 'undefined') I18N.onChange(() => render());
    return api;
  }

  const api = {
    init, render, publish, update, clearAnswer, setCount, setExtra, getExtra,
    get enabled() { return on(); },
    get count() { return count; },
    get names() { return names; },
    get code() { return sessionCode; },
    get answers() { return data; },
    // Host-only integration point. Callers already hold this room's tokens;
    // never send a reference or its token to a different player's card.
    playerRef(i) { return on() && Number.isInteger(i) && i >= 0 && i < count && tokens[i]
      ? db.ref(`rooms/${sessionCode}/players/${tokens[i]}`) : null; },
    name(i) { return String(names[i] || '').trim() || playerLabel(i); },
    setDecorator(fn) { decorate = fn; },
    // 'full' (default) | 'names' | 'links' | 'check' — see the comment by
    // `let linksView` above. Only index.html's wizard calls this.
    setLinksView(mode) { linksView = mode; render(); },
  };
  return api;
})();
