/* Sketch Relay host page: settings, the shared screen and the executor.
 * ?demo=1 runs the same rules locally with synthetic players and never
 * touches Firebase; ?demo=1&players=5 tries an odd-sized group. */
(() => {
  'use strict';
  const UI = SKETCH_RELAY_UI, E = SKETCH_RELAY_ENGINE, ART = SKETCH_RELAY_ART, WORDS = SKETCH_RELAY_WORDS;
  const { t, esc, list } = UI;
  const $ = id => document.getElementById('sr-' + id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const demoNames = ['Amy', 'Ben', 'Cai', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'];
  const demoCount = Math.max(E.MIN_PLAYERS, Math.min(E.MAX_PLAYERS, Number(params.get('players')) || 4));
  const demoRoster = demoNames.slice(0, demoCount).map((name, i) => ({ playerNum: i + 1, name }));
  const PLAYER_COLORS = ['#ef4444', '#4f9eff', '#22c55e', '#f59e0b', '#a78bfa', '#06b6d4', '#84cc16', '#ec4899', '#f97316'];
  let state = null, sync = null, status = demo ? 'ready' : 'connecting';
  let busy = false, error = '', editing = false, closed = false, sceneKey = '', galleryKey = '', rosterKey = '';
  let demoActor = 0, demoCard = null, roomCode = null, playerCount = 0, lastPage = '';
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const now = () => sync ? sync.now() : Date.now();
  const relay = () => state ? E.view(state, 0, now()).relay : null;
  const canControl = () => !closed && (demo || !!(sync && sync.own && !sync.suspended));
  const knownError = message => ['offline', 'other_host', 'not_available', 'stale_turn', 'not_enough_players', 'invalid_roster', 'invalid_options'].includes(message) ? message : 'error';
  const countOK = n => n >= E.MIN_PLAYERS && n <= E.MAX_PLAYERS;

  function settings() {
    return { deck: $('deck').value, sketchSeconds: Number($('timer').value), scoring: $('scoring').value };
  }
  function restoreSettings(current) {
    if (!current?.settings) return;
    $('deck').value = current.settings.deck; $('timer').value = String(current.settings.sketchSeconds); $('scoring').value = current.settings.scoring;
  }
  function labels() {
    I18N.applyStatic(document);
    $('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    $('demo-view').value = String(demoActor);
    $('room-label').textContent = demo || !sync ? '' : t('room', { code: ROOM.code });
    sceneKey = ''; galleryKey = ''; rosterKey = '';
    if (demoCard) { demoCard.destroy(); demoCard = null; }
  }
  function render() {
    const view = relay();
    const switched = status === 'switched';
    const count = demo ? demoCount : playerCount;
    $('status').textContent = ['setupNeeded', 'ready', 'needPlayers'].includes(status) ? '' : t(status);
    $('setup-needed').hidden = status !== 'setupNeeded';
    $('setup').hidden = status === 'setupNeeded' || (!!view && !switched && !editing);
    $('session').hidden = !view || switched || editing;
    $('setup-close').hidden = !editing;
    $('players-line').textContent = status === 'setupNeeded' ? '' : countOK(count) ? t('playersLine', { n: count }) : t('needPlayers');
    $('players-line').classList.toggle('is-bad', !countOK(count));
    $('start').disabled = busy || !canControl() || !countOK(count);
    $('error').textContent = error ? t(error) : '';
    if (view && !switched && !editing) {
      renderScene(view);
      const phase = view.phase;
      const show = (id, on) => { $(id).hidden = !on; $(id).disabled = busy || !canControl(); };
      show('start-now', phase === 'word');
      show('pause', ['word', 'play'].includes(phase)); $('pause').textContent = t(view.paused ? 'resume' : 'pause');
      show('skip', phase === 'play');
      show('next-round', phase === 'finished');
      show('new-game', ['finished', 'stopped'].includes(phase));
      show('settings-open', ['finished', 'stopped'].includes(phase));
      show('end', ['word', 'play', 'reveal'].includes(phase));
      show('manage-open', !['finished', 'stopped'].includes(phase));
      renderGallery();
      renderRoster(view);
    }
    paint();
  }
  function renderScene(view) {
    const scene = $('scene');
    if (demo && demoActor > 0) {
      if (!demoCard) { scene.innerHTML = ''; sceneKey = ''; demoCard = new UI.Card(scene, { now, connected: () => true, nameBanner: demoBanner, send: demoSend }); }
      demoCard.update(demoData(demoActor));
      return;
    }
    if (demoCard) { demoCard.destroy(); demoCard = null; scene.innerHTML = ''; }
    const key = JSON.stringify([I18N.lang, view, busy, canControl()]);
    if (key === sceneKey) return;
    sceneKey = key;
    scene.innerHTML = UI.hostScene(view, now());
    lastPage = UI.followReveal(scene, view, lastPage);
    for (const button of scene.querySelectorAll('[data-sr-action]')) button.disabled = busy || !canControl();
  }
  function renderGallery() {
    const show = state?.phase === 'finished' && !(demo && demoActor > 0);
    $('gallery').hidden = !show;
    if (!show) return;
    const key = JSON.stringify([I18N.lang, state.sessionId, state.round, state.awards]);
    if (key === galleryKey) return;
    galleryKey = key;
    const name = num => state.roster.find(p => p.playerNum === num)?.name || t('player', { n: num });
    $('gallery-list').innerHTML = state.books.map((book, b) => {
      const pages = book.pages.map((page, i) => ({ index: i, kind: page.kind, by: page.by, byName: name(page.by), skipped: page.skipped, art: page.art, text: page.text }));
      return `<section class="sr-gallery-book"><h3>${esc(t('bookOf', { name: name(book.owner) }))}</h3>${UI.bookHTML(pages, { owner: book.owner, awards: state.settings.scoring === 'none' ? null : { ...state.awards[b], matches: Object.entries(state.awards[b]?.matches || {}).map(([page, value]) => ({ page: Number(page), value })) }, scoring: state.settings.scoring, book: b })}</section>`;
    }).join('');
  }
  function renderRoster(view) {
    const key = JSON.stringify([I18N.lang, view.roster, busy, canControl()]);
    if (key === rosterKey) return;
    rosterKey = key;
    $('roster').innerHTML = list(view.roster).map(p => `<div class="sr-roster-row"><div><strong>${esc(p.name)}</strong><span class="sr-soft">${esc(t(p.active ? 'active' : 'inactive'))}</span></div><button type="button" class="sr-button" data-player="${Number(p.playerNum)}" data-away="${p.active}"${busy || !canControl() ? ' disabled' : ''}>${esc(t(p.active ? 'sitOut' : 'rejoin'))}</button></div>`).join('');
  }
  function paint() {
    if (closed) return;
    const view = relay();
    if (view && !(demo && demoActor > 0)) UI.paintTimer($('scene'), view, now());
  }

  async function command(type, extra = {}) {
    if (busy || !state || !canControl()) return false;
    busy = true; error = ''; render();
    try {
      if (demo) {
        state = E.apply(state, { ...extra, id: 'demo-' + crypto.randomUUID(), type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() });
        if (state.replies?.[0]?.error) error = knownError(state.replies[0].error);
      } else await sync.command(type, extra);
      return !error;
    } catch (e) { error = knownError(e.message); return false; }
    finally { busy = false; render(); }
  }
  async function start(options = settings()) {
    if (busy || !canControl()) return;
    busy = true; error = ''; render();
    try {
      if (demo) state = E.create({ id: 'demo-' + seed() + '-' + Date.now(), roster: demoRoster, settings: options, now: now(), seed: seed() });
      else await sync.start(options);
      editing = false; $('manage').close();
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; render(); }
  }

  // ----- demo: synthetic players on this one device -----
  function demoBanner(data) {
    const hex = PLAYER_COLORS[(Number(data.playerNum) - 1) % PLAYER_COLORS.length];
    return `<span class="name-banner sr-demo-banner" style="color:#0b0b18;background:${hex};border:2px solid ${hex};border-radius:999px;padding:6px 16px;font-weight:900">${esc(data.name || '')}</span>`;
  }
  function demoData(actor) {
    const data = E.view(state, actor, now());
    data.relayLive = { sessionId: state.sessionId, until: now() + 60000 };
    return data;
  }
  async function demoSend(cmd) {
    state = E.apply(state, { ...cmd, actor: demoActor, now: now(), seed: seed() });
    setTimeout(render, 0);
  }
  function doodle(n) {
    let x = 200 + (n * 97) % 600, y = 200 + (n * 53) % 600, r = seed();
    const rand = () => { r = (Math.imul(r ^ (r >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return r / 4294967296; };
    const strokes = [];
    for (let s = 0; s < 4 + n % 3; s++) {
      const points = [x, y];
      for (let i = 0; i < 14; i++) { x = Math.max(40, Math.min(960, x + (rand() - .5) * 160)); y = Math.max(40, Math.min(960, y + (rand() - .5) * 160)); points.push(Math.round(x), Math.round(y)); }
      strokes.push({ color: s % 3 === 2 ? 1 + n % 5 : 0, size: 1 + (s % 2), points });
    }
    return ART.encode(strokes);
  }
  function demoAuto() {
    if (!state) return;
    for (const p of state.roster) {
      if (p.playerNum === demoActor || p.active === false) continue;
      const view = E.view(state, p.playerNum, now()).relay;
      const base = { id: 'auto-' + crypto.randomUUID(), actor: p.playerNum, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() };
      if (view.phase === 'word' && !view.me.ready) state = E.apply(state, { ...base, type: 'ready' });
      else if (view.phase === 'play' && view.me.task && !view.me.task.submitted && !view.me.task.skipped) {
        const task = view.me.task;
        const guess = WORDS.easy[(p.playerNum * 31 + view.step * 7 + task.book) % WORDS.easy.length];
        state = E.apply(state, { ...base, type: 'submit', book: task.book, kind: task.kind, ...(task.kind === 'sketch' ? { art: doodle(p.playerNum + view.step) } : { text: guess }) });
      }
    }
    render();
  }

  // ----- events -----
  $('setup').addEventListener('submit', event => { event.preventDefault(); start(); });
  $('setup-close').addEventListener('click', () => { editing = false; render(); });
  $('start-now').addEventListener('click', () => command('start'));
  $('pause').addEventListener('click', () => command(state?.paused ? 'resume' : 'pause'));
  $('skip').addEventListener('click', () => { if (confirm(t('skipConfirm'))) command('skip'); });
  $('next-round').addEventListener('click', () => command('nextRound'));
  $('new-game').addEventListener('click', () => start(state?.settings || settings()));
  $('settings-open').addEventListener('click', () => { restoreSettings(state); editing = true; render(); $('deck').focus(); });
  $('end').addEventListener('click', () => { if (confirm(t('endConfirm'))) command('stop'); });
  $('manage-open').addEventListener('click', () => { if (state) $('manage').showModal(); });
  $('manage').addEventListener('click', event => { if (event.target === $('manage')) $('manage').close(); });
  $('roster').addEventListener('click', event => {
    const button = event.target.closest('[data-player]');
    if (button && !button.disabled) command('away', { playerNum: Number(button.dataset.player), away: button.dataset.away === 'true' });
  });
  $('scene').addEventListener('click', event => {
    if (demo && demoActor > 0) return; // the demo card handles its own buttons
    const button = event.target.closest('[data-sr-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.srAction;
    if (action === 'revealNext' || action === 'revealAll') command('revealNext', { book: Number(button.dataset.book), shown: Number(button.dataset.shown), all: action === 'revealAll' });
    else if (action === 'nextBook') command('nextBook', { book: Number(button.dataset.book) });
    else if (action === 'award') command('award', UI.awardInput(button));
  });
  $('demo-view').addEventListener('change', () => { demoActor = Number($('demo-view').value) || 0; if (demoCard) { demoCard.destroy(); demoCard = null; } sceneKey = ''; render(); });
  $('demo-auto').addEventListener('click', demoAuto);

  // ----- connect -----
  if (demo) {
    $('demo-bar').hidden = false; $('demo-link').hidden = true;
  } else {
    let saved = null;
    try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (_) {}
    playerCount = Number(saved?.playerCount || saved?.tokens?.length) || 0;
    if (!saved?.tokens?.length || playerCount < 2) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#c4f04d', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 4 });
      playerCount = ROOM.count;
      if (!countOK(playerCount)) status = 'needPlayers';
      sync = new SKETCH_RELAY_SYNC.Host({ room: ROOM, db: firebase.database(),
        onChange: next => {
          if (state?.sessionId !== next?.sessionId) restoreSettings(next);
          if (state?.turnId !== next?.turnId) error = '';
          state = next; render();
        },
        onStatus: next => { status = !countOK(playerCount) && next === 'ready' ? 'needPlayers' : next; if (next === 'switched') { editing = false; $('manage').close(); } render(); },
      });
      sync.connect();
    }
  }
  labels(); render();
  I18N.onChange(() => { labels(); render(); });
  const timer = setInterval(() => {
    if (closed) return;
    // The demo has no sync host, so it runs the drawing-time grace locally.
    if (demo && state?.phase === 'play' && !state.paused && state.deadline > 0 && now() >= state.deadline + E.AUTO_SKIP_GRACE_MS) {
      state = E.apply(state, { id: 'tick-' + crypto.randomUUID(), type: 'tick', actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() });
      render();
    }
    paint();
  }, 250);
  function close() { closed = true; clearInterval(timer); sync?.close(); demoCard?.destroy(); }
  window.addEventListener('storage', event => {
    if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) { close(); status = 'roomChanged'; render(); }
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
