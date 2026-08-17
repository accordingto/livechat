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
const ROOM = (() => {
  const STORAGE_PREFIX = 'room-session-';
  const LAST_SESSION_KEY = 'room-last-session';

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
      // (Forbidden Words stores wordsPerTeam), and dropping them silently
      // resets their settings the next time the host switches back
      localStorage.setItem(STORAGE_PREFIX + sessionCode, JSON.stringify(
        Object.assign({}, prev, { tokens, playerCount: count, names: merged })));
      localStorage.setItem(LAST_SESSION_KEY, sessionCode);
    } catch (e) { /* private browsing — links still work for this session */ }
  }

  /* a game's own setting, parked in the same shared session blob (Forbidden Words keeps
     wordsPerTeam here). Reading and writing it through room.js is what stops another
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
      btn.textContent = 'Copied';
      btn.classList.remove('is-copied');
      void btn.offsetWidth; // restart the animation even on a rapid re-click
      btn.classList.add('is-copied');
      // a second click before the first revert fires shouldn't leave the button
      // stuck on "Copied" — clear the pending revert so only the latest click wins
      clearTimeout(btn._copyRevert);
      btn._copyRevert = setTimeout(() => { btn.textContent = 'Link'; btn.classList.remove('is-copied'); }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => prompt('Copy this link:', text));
    } else {
      prompt('Copy this:', text);
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
      btn.textContent = 'Copied';
      btn.classList.remove('is-copied');
      void btn.offsetWidth;
      btn.classList.add('is-copied');
      clearTimeout(btn._copyRevert);
      btn._copyRevert = setTimeout(() => { btn.textContent = '📋 Copy All Links'; btn.classList.remove('is-copied'); }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => prompt('Copy this:', text));
    } else {
      prompt('Copy this:', text);
    }
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
      .room-setup { width: 100%; max-width: 1100px; margin: 24px auto; --room-accent: ${accent}; }
      .room-setup .hidden { display: none !important; }
      .room-card {
        background: #13132b; border: 2px solid #1e1e42; border-radius: 20px;
        padding: 22px 26px; display: flex; flex-direction: column; gap: 16px;
        animation: fadeUp .5s .2s ease both;
      }
      .room-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
      .room-label {
        font-size: .72rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        color: #555; min-width: 58px;
      }
      .room-divider { height: 1px; background: #1e1e42; }
      #room-code-input {
        background: #0d0d1a; border: 2px solid #1e1e42; border-radius: 12px;
        color: #eee; font-family: inherit; font-size: .95rem; font-weight: 800; letter-spacing: 2px;
        text-transform: uppercase; padding: 11px 14px; width: 130px; transition: border-color .2s;
      }
      #room-code-input:focus { outline: none; border-color: var(--room-accent); }
      .room-btn {
        background: transparent; color: #666; border: 2px solid #1e1e42; border-radius: 12px;
        padding: 11px 20px; font-size: .88rem; font-weight: 700; font-family: inherit;
        white-space: nowrap; cursor: pointer; transition: border-color .2s, color .2s, transform .1s;
      }
      .room-btn:active { transform: scale(.98); }
      .room-btn.primary { color: var(--room-accent); border-color: var(--room-accent); }
      .room-count-btns { display: flex; flex-wrap: wrap; gap: 8px; }
      .room-count-btn {
        width: 44px; height: 44px; border-radius: 12px;
        border: 2px solid #1e1e42; background: #13132b; color: #888;
        font-size: 1rem; font-weight: 800; font-family: inherit; cursor: pointer;
        transition: border-color .2s, color .2s, background .2s, transform .1s;
      }
      .room-count-btn:active { transform: scale(.94); }
      .room-count-btn.active { border-color: var(--room-accent); color: #fff; background: color-mix(in srgb, var(--room-accent) 18%, transparent); }
      .room-hdr {
        font-size: .72rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        color: #555; margin: 18px 0 10px; display: flex; align-items: center; gap: 8px;
      }
      .room-tag { font-size: .6rem; letter-spacing: 1px; color: #555; border: 1px solid #1e1e42; border-radius: 20px; padding: 2px 8px; }
      .room-note { color: #555; font-size: .78rem; line-height: 1.6; margin: -4px 0 12px; }
      /* sits right after room-note, wrapping onto its own line on narrow screens
         next to whatever game-specific toggle (e.g. Say It Without Saying It's
         "Show what's on player cards") also lives in that same flow */
      .copy-all-btn { margin-bottom: 14px; }
      .copy-all-btn.is-copied {
        background: rgba(34,197,94,.18); border-color: #22c55e; color: #22c55e;
        animation: copyPop .4s ease;
      }
      .room-links { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; }
      .link-col {
        flex: 1; min-width: 160px;
        background: #13132b; border: 2px solid #1e1e42; border-radius: 14px; padding: 14px;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        animation: fadeUp .3s ease both; transition: border-color .3s, box-shadow .3s;
      }
      .link-col.is-marked { border-color: var(--room-accent); box-shadow: 0 0 20px color-mix(in srgb, var(--room-accent) 25%, transparent); }
      .name-input {
        width: 100%; background: #0d0d1a; border: 2px solid #1e1e42; border-radius: 10px;
        color: #eee; font-family: inherit; font-size: .9rem; font-weight: 700; text-align: center;
        padding: 8px 10px; transition: border-color .2s;
      }
      .name-input::placeholder { color: #555; }
      .name-input:focus { outline: none; border-color: var(--room-accent); }
      .link-btn-row { display: flex; gap: 8px; width: 100%; }
      .btn-copy {
        flex: 1; min-width: 0; background: transparent; color: var(--room-accent); border: 2px solid var(--room-accent);
        border-radius: 10px; padding: 9px 10px;
        font-size: .82rem; font-weight: 700; font-family: inherit; cursor: pointer;
        transition: background .2s, transform .1s;
      }
      .btn-copy:active { transform: scale(.97); }
      /* a quick pop + flash to green on copy — the text swap alone is easy to miss
         on a screen a host glances at for half a second */
      .btn-copy.is-copied {
        background: rgba(34,197,94,.18); border-color: #22c55e; color: #22c55e;
        animation: copyPop .4s ease;
      }
      @keyframes copyPop {
        0%   { transform: scale(1); }
        35%  { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
      .btn-qr-toggle {
        background: transparent; color: #666; border: 2px solid #1e1e42; border-radius: 10px;
        padding: 9px 12px; font-size: .82rem; font-weight: 700; font-family: inherit; cursor: pointer;
        transition: border-color .2s, color .2s;
      }
      .btn-qr-toggle.open { border-color: var(--room-accent); color: var(--room-accent); }
      .qr-inline {
        background: #fff; border-radius: 10px; padding: 8px; line-height: 0;
        width: 100%; max-width: 160px; animation: fadeUp .25s ease both;
      }
      .qr-inline svg { width: 100%; height: auto; display: block; }
      /* what each player answered, shown under their name once they tap their card */
      .link-answer {
        width: 100%; border-top: 1px solid #1e1e42; padding-top: 9px;
        font-size: .82rem; font-weight: 800; line-height: 1.35; color: #ddd;
        animation: fadeUp .25s ease both;
      }
      .link-answer .la-sub { display: block; font-size: .7rem; font-weight: 700; color: #555; margin-top: 3px; }
      @media (hover: hover) and (pointer: fine) {
        .room-btn:hover { border-color: var(--room-accent); color: var(--room-accent); }
        .room-count-btn:hover { border-color: var(--room-accent); color: var(--room-accent); }
        .btn-copy:hover { background: color-mix(in srgb, var(--room-accent) 10%, transparent); }
        .btn-qr-toggle:hover { border-color: var(--room-accent); color: var(--room-accent); }
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
    mount.innerHTML = `
      <div class="room-card">
        <div class="room-row hidden" id="room-code-row">
          <span class="room-label">Room</span>
          <input id="room-code-input" maxlength="8" autocomplete="off" spellcheck="false">
          <button class="room-btn primary" id="room-load-btn">Load</button>
          <button class="room-btn" id="room-new-btn">New Room</button>
        </div>
        <div class="room-divider hidden" id="room-code-divider"></div>
        <div class="room-row">
          <span class="room-label">Players</span>
          <div class="room-count-btns" id="room-count-btns"></div>
          <span id="room-actions"></span>
        </div>
        ${cfg.extraRowHTML ? `<div class="room-divider"></div><div class="room-row" id="room-extra-row">${cfg.extraRowHTML}</div>` : ''}
      </div>
      <div class="room-hdr" id="room-hdr"></div>
      <p class="room-note hidden" id="room-note"></p>
      <button class="room-btn primary copy-all-btn hidden" id="copy-all-btn" type="button">📋 Copy All Links</button>
      <div class="room-links" id="room-links"></div>`;

    document.getElementById('room-load-btn').onclick = loadRoomCode;
    document.getElementById('room-new-btn').onclick = newRoom;
    document.getElementById('copy-all-btn').onclick = copyAllLinks;
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

  function render() {
    const wrap = document.getElementById('room-links');
    if (!wrap) return;
    const live = on();
    document.getElementById('room-code-row').classList.toggle('hidden', !live);
    document.getElementById('room-code-divider').classList.toggle('hidden', !live);
    document.getElementById('room-note').classList.toggle('hidden', !live || !cfg.linksNote);
    document.getElementById('copy-all-btn').classList.toggle('hidden', !live);
    document.getElementById('room-hdr').innerHTML = live
      ? '🔗 Player Links <span class="room-tag">optional</span>'
      : '👥 Players';
    if (cfg.linksNote) document.getElementById('room-note').textContent = cfg.linksNote;
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
    const active = document.activeElement;
    const reuseInput = (active && active.classList && active.classList.contains('name-input') && wrap.contains(active)) ? active : null;
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
      if (i === reuseIndex && reuseInput) {
        input = reuseInput; // same node: value, cursor and selection are already correct
      } else {
        input = document.createElement('input');
        input.className = 'name-input';
        input.maxLength = 14;
        input.placeholder = `Player ${i + 1}`;
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

      if (live) {
        const row = document.createElement('div');
        row.className = 'link-btn-row';
        const copy = document.createElement('button');
        copy.className = 'btn-copy';
        copy.textContent = 'Link';
        copy.onclick = () => copyLink(i, copy);
        const qr = document.createElement('button');
        qr.className = 'btn-qr-toggle';
        qr.textContent = 'QR';
        qr.onclick = () => toggleQR(i, col, qr);
        row.appendChild(copy);
        row.appendChild(qr);
        col.appendChild(row);
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

  function setCount(n) {
    count = n;
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
    const saved = loadSessionData(typed);
    tokens = saved && saved.tokens ? saved.tokens.slice() : [];
    if (saved && saved.names && saved.names.length) names = saved.names.slice();
    if (saved && saved.playerCount) { setCount(clampCount(saved.playerCount)); return; }
    ensureTokens(count);
    save();
    attach();
    render();
  }

  function newRoom() {
    sessionCode = generateSessionCode();
    tokens = [];
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
      if (saved.playerCount) count = clampCount(saved.playerCount);
    } else {
      sessionCode = generateSessionCode();
    }

    injectCSS(cfg.accent);
    buildDOM(document.getElementById(cfg.mount));
    if (on()) ensureTokens(count);
    save();
    render();
    attach();
    return api;
  }

  const api = {
    init, render, publish, update, clearAnswer, setCount, setExtra, getExtra,
    get enabled() { return on(); },
    get count() { return count; },
    get names() { return names; },
    get code() { return sessionCode; },
    get answers() { return data; },
    name(i) { return String(names[i] || '').trim() || `Player ${i + 1}`; },
    setDecorator(fn) { decorate = fn; },
  };
  return api;
})();
