(() => {
  'use strict';
  const { t, esc, list } = BOMB_RELAY_UI;
  const byId = id => document.getElementById('br-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['Amy', 'Kevin', 'Jason', 'Willy'].map((name, i) => ({ playerNum: i + 1, name, active: true }));
  let state = null, sync = null, status = demo ? 'ready' : 'connecting';
  let busy = false, error = '', sceneKey = '', rosterKey = '', closed = false, timer = null, editing = false;
  let demoCard = null, demoCardActor = 0;
  let setupTiming = null, timingPending = null;
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const uid = () => BOMB_RELAY_SYNC.uid();
  const now = () => sync ? sync.now() : Date.now();
  const canControl = () => !closed && !sync?.suspended && (demo || !!(sync?.connected && sync?.own));
  const view = () => state ? BOMB_RELAY_ENGINE.view(state, 0).bomb : null;
  const sound = new BOMB_RELAY_UI.Sound(paintSound);
  const knownError = message => ['offline', 'other_host', 'not_enough_players', 'invalid_roster', 'invalid_options', 'not_available', 'stale_turn', 'too_late'].includes(message) ? message : 'error';

  function paintSound() {
    const waiting = sound.enabled && !sound.unsupported && (sound.blocked || (!!state && !sound.context));
    byId('sound').textContent = t(waiting ? 'enableSound' : sound.enabled ? 'soundOn' : 'soundOff');
    byId('sound').setAttribute('aria-pressed', String(sound.enabled));
    byId('sound-status').textContent = sound.unsupported ? t('soundUnsupported') : waiting ? t('soundBlocked') : '';
  }
  function options() {
    return { timing: readTiming('fuse', 'scale', ''), cards: Number(byId('cards').value), category: byId('category').value };
  }
  function restoreOptions(current) {
    if (!current) return;
    setupTiming = BOMB_RELAY_ENGINE.timingSettings(current);
    byId('fuse').value = setupTiming.speedMode; byId('scale').checked = setupTiming.scaleWithPlayers;
    byId('min').value = setupTiming.baseMinSeconds ?? '';
    byId('max').value = setupTiming.baseMaxSeconds ?? '';
    byId('cards').value = String(current.cards);
    byId('category').value = BOMB_RELAY_DECK.categories.includes(current.category) ? current.category : 'mixed';
  }
  function readTiming(speedId, scaleId, prefix) {
    const minimum = byId(prefix + 'min').value.trim(), maximum = byId(prefix + 'max').value.trim();
    return BOMB_RELAY_ENGINE.normalizeTimingSettings({ speedMode: byId(speedId).value, scaleWithPlayers: byId(scaleId).checked,
      ...(minimum === '' ? {} : { baseMinSeconds: Number(minimum) }),
      ...(maximum === '' ? {} : { baseMaxSeconds: Number(maximum) }) });
  }
  function updateBoundLimits(prefix, speedMode) {
    const minimum = byId(prefix + 'min'), maximum = byId(prefix + 'max');
    const modeMax = BOMB_RELAY_ENGINE.CONFIG.timing.baseRangesSeconds[speedMode].max;
    const low = minimum.value.trim() === '' ? 30 : Number(minimum.value);
    const high = maximum.value.trim() === '' ? modeMax : Number(maximum.value);
    minimum.min = '1'; minimum.max = String(Math.min(modeMax - 1, high - 1)); minimum.placeholder = '30';
    maximum.min = String(Math.max(2, low + 1)); maximum.max = String(modeMax); maximum.placeholder = String(modeMax);
    byId(prefix + 'min-hint').textContent = t('timingMinHint', { max: minimum.max });
    byId(prefix + 'max-hint').textContent = t('timingMaxHint', { min: maximum.min, max: modeMax });
  }
  function renderBounds(prefix, settings) {
    const minimum = byId(prefix + 'min'), maximum = byId(prefix + 'max');
    // Keep both ends stable while either native number editor is in use.
    if (document.activeElement !== minimum && document.activeElement !== maximum) {
      minimum.value = settings.baseMinSeconds ?? ''; maximum.value = settings.baseMaxSeconds ?? '';
    }
    updateBoundLimits(prefix, settings.speedMode);
  }
  function validBounds(prefix, speedMode) {
    updateBoundLimits(prefix, speedMode);
    return byId(prefix + 'min').reportValidity() && byId(prefix + 'max').reportValidity();
  }
  const timingMatches = (current, requested) => !!current &&
    JSON.stringify(BOMB_RELAY_ENGINE.timingSettings(current)) === JSON.stringify(requested);
  function participantCount(inGame) {
    if (inGame && state) return new Set(list(state.roster).filter(player => player.active !== false).map(player => player.playerNum)).size;
    return demo ? demoRoster.length : Number(sync?.count || 0);
  }
  function timingSummary(prefix, settings, count) {
    const range = BOMB_RELAY_ENGINE.getTimingRange({ activePlayerCount: count >= 2 ? count : 3, settings });
    const vars = { n: count, mode: t(settings.speedMode), min: range.minMs / 1000, max: range.maxMs / 1000 };
    byId(prefix + 'timing-range').textContent = t(count >= 2 ? 'timingRange' : 'timingBaseline', vars);
    byId(prefix + 'timing-note').textContent = range.capped ? t('timingCapped') : '';
  }
  function renderTiming() {
    if (!setupTiming) setupTiming = BOMB_RELAY_ENGINE.normalizeTimingSettings({});
    renderBounds('', setupTiming);
    timingSummary('', setupTiming, participantCount(false));
    byId('fuse').disabled = busy;
    byId('scale').disabled = busy;
    byId('min').disabled = byId('max').disabled = busy;
    const pending = timingPending || (state ? BOMB_RELAY_ENGINE.timingSettings(state) : BOMB_RELAY_ENGINE.normalizeTimingSettings({}));
    if (byId('manage-speed').value !== pending.speedMode) byId('manage-speed').value = pending.speedMode;
    if (byId('manage-scale').checked !== pending.scaleWithPlayers) byId('manage-scale').checked = pending.scaleWithPlayers;
    renderBounds('manage-', pending);
    byId('manage-speed').disabled = byId('manage-scale').disabled = byId('manage-min').disabled = byId('manage-max').disabled = busy || !state || !canControl();
    timingSummary('manage-', pending, participantCount(true));
  }
  function changeSetupTiming(event) {
    // A deliberate mode change restores both of that mode's default bounds.
    if (event.target === byId('fuse')) byId('min').value = byId('max').value = '';
    if (!validBounds('', byId('fuse').value)) return;
    setupTiming = readTiming('fuse', 'scale', '');
    renderTiming();
  }
  async function changeRoomTiming(event) {
    if (busy || !state || !canControl()) return;
    if (event.target === byId('manage-speed')) byId('manage-min').value = byId('manage-max').value = '';
    if (!validBounds('manage-', byId('manage-speed').value)) return;
    const requested = readTiming('manage-speed', 'manage-scale', 'manage-');
    timingPending = requested;
    let succeeded = false;
    try { succeeded = await command('settings', { timing: requested }); }
    finally {
      // Firebase may resolve the transaction before delivering its value event.
      // Keep this preview until onChange confirms it; never repaint stale
      // canonical controls or clear a newer edit in the meantime.
      if (timingPending === requested && (!succeeded || timingMatches(state, requested))) timingPending = null;
      renderTiming();
    }
  }
  function labels() {
    I18N.applyStatic(document);
    const pick = (id, values, label) => {
      const value = byId(id).value;
      byId(id).innerHTML = values.map(v => `<option value="${esc(v)}">${esc(label(v))}</option>`).join('');
      if (values.map(String).includes(value)) byId(id).value = value;
    };
    pick('fuse', BOMB_RELAY_ENGINE.CONFIG.speedModes, v => t(v));
    pick('manage-speed', BOMB_RELAY_ENGINE.CONFIG.speedModes, v => t(v));
    pick('cards', BOMB_RELAY_ENGINE.CONFIG.cardOptions, v => t('cardsN', { n: v }));
    pick('category', BOMB_RELAY_DECK.categories, v => `${t(v)} (${BOMB_RELAY_DECK.pool(v).length})`);
    if (!byId('fuse').dataset.ready) {
      setupTiming = setupTiming || BOMB_RELAY_ENGINE.normalizeTimingSettings({});
      byId('fuse').value = setupTiming.speedMode; byId('scale').checked = setupTiming.scaleWithPlayers;
      byId('min').value = setupTiming.baseMinSeconds ?? '';
      byId('max').value = setupTiming.baseMaxSeconds ?? '';
      byId('cards').value = state ? String(state.cards) : '10';
      byId('category').value = state && BOMB_RELAY_DECK.categories.includes(state.category) ? state.category : 'mixed';
      byId('fuse').dataset.ready = '1';
    }
    pick('library-category', BOMB_RELAY_DECK.categories, v => `${t(v)} (${BOMB_RELAY_DECK.pool(v).length})`);
    const actor = byId('demo-view').value || '0';
    byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    byId('demo-view').value = actor;
    byId('room-label').textContent = demo || !sync ? '' : t('room', { code: ROOM.code });
    renderLibrary();
    sceneKey = ''; rosterKey = ''; paintSound();
  }
  function renderLibrary() {
    const category = byId('library-category').value || 'mixed';
    byId('library-count').textContent = t('libraryCount', { n: BOMB_RELAY_DECK.pool(category).length });
    if (byId('library').open) byId('library-list').innerHTML = BOMB_RELAY_UI.libraryHTML(category);
  }

  function render() {
    const bomb = view();
    const switched = status === 'switched';
    byId('status').textContent = ['setupNeeded', 'ready'].includes(status) ? '' : t(status);
    byId('setup-needed').hidden = status !== 'setupNeeded';
    byId('setup').hidden = status === 'setupNeeded' || (!!bomb && !switched && !editing);
    byId('game').hidden = !bomb || switched || editing;
    // While playing, the shared screen gives its height to the table, not the title.
    document.body.classList.toggle('br-playing', !byId('game').hidden);
    byId('start').disabled = busy || !canControl();
    byId('setup-cancel').hidden = !editing;
    byId('error').textContent = error ? t(error) : '';
    const actor = demo ? Number(byId('demo-view').value) : 0;
    if (bomb && !switched) {
      if (actor) renderDemoCard(actor);
      else {
        if (demoCard) { demoCard.destroy(); demoCard = null; demoCardActor = 0; }
        const key = JSON.stringify([I18N.lang, bomb.sessionId, bomb.turnId, bomb.phase,
          bomb.phase === 'ready' ? [bomb.settingsTiming, bomb.timingRange, participantCount(true)] : null]);
        if (key !== sceneKey) { byId('scene').innerHTML = BOMB_RELAY_UI.stage(bomb); sceneKey = key; }
      }
      const holder = bomb.holder != null ? BOMB_RELAY_UI.nameOf(bomb, bomb.holder) : '';
      const hostView = !actor;
      byId('light').hidden = !hostView || bomb.phase !== 'ready';
      byId('light').textContent = t('lightFor', { name: holder });
      byId('reroll').hidden = !hostView || bomb.phase !== 'ready';
      byId('pass').hidden = !hostView || bomb.phase !== 'ticking';
      byId('pass').textContent = t('passFor', { name: holder });
      byId('next').hidden = !hostView || !['boom', 'discussion'].includes(bomb.phase);
      byId('next').textContent = t(bomb.boom?.last ? 'showResults' : 'nextCard');
      byId('pause').hidden = !hostView || !['ready', 'ticking', 'paused'].includes(bomb.phase);
      byId('pause').textContent = t(bomb.phase === 'paused' ? 'resume' : 'pause');
      byId('again').hidden = !hostView || bomb.phase !== 'finished';
      byId('settings').hidden = !hostView || bomb.phase !== 'finished';
      byId('manage-open').hidden = !hostView;
      for (const id of ['light', 'reroll', 'pass', 'next', 'pause', 'again', 'settings', 'manage-open', 'restart', 'stop']) byId(id).disabled = busy || !canControl();
      byId('reroll').disabled ||= !bomb.canReroll;
      byId('stop').disabled ||= bomb.phase === 'finished';
      renderRoster(bomb);
    } else if (demoCard) { demoCard.destroy(); demoCard = null; demoCardActor = 0; }
    renderTiming(); paintSound(); follow();
  }
  // In the one-device demo, the scene area becomes the chosen player's card.
  function renderDemoCard(actor) {
    if (!demoCard || demoCardActor !== actor) {
      demoCard?.destroy(); sceneKey = '';
      byId('scene').innerHTML = '<div class="br-demo-phone"></div>';
      demoCardActor = actor;
      demoCard = new BOMB_RELAY_UI.Card(byId('scene').firstElementChild, {
        nameBanner: data => `<span class="name-banner br-demo-banner" style="--seat:${BOMB_RELAY_UI.colorOf(data.playerNum)}">${esc(data.name)}</span>`,
        send: command => {
          state = BOMB_RELAY_ENGINE.apply(state, Object.assign({}, command, { actor, now: now(), seed: seed() }));
          setTimeout(render, 0);
        },
      });
    }
    demoCard.update(BOMB_RELAY_ENGINE.view(state, actor));
  }
  function renderRoster(bomb) {
    const key = JSON.stringify([I18N.lang, bomb.roster, busy, canControl()]);
    if (key === rosterKey) return;
    rosterKey = key;
    byId('roster').innerHTML = list(bomb.roster).map(p => `<div class="br-roster-row"><div><strong style="--seat:${BOMB_RELAY_UI.colorOf(p.playerNum)}">${esc(p.name || t('player', { n: p.playerNum }))}</strong><span class="br-soft">${esc(t(p.active ? 'playing' : 'out'))} · ${esc(t('count', { n: p.count }))}</span></div><button type="button" class="br-button" data-br-roster="${Number(p.playerNum)}" data-br-active="${!p.active}"${busy || !canControl() ? ' disabled' : ''}>${esc(t(p.active ? 'sitOut' : 'rejoin'))}</button></div>`).join('');
  }
  // The host screen is the one place the room hears the bomb.
  function follow() {
    const bomb = view();
    if (!bomb || status === 'switched' || !canControl()) { sound.stopLoop(); return; }
    sound.follow(bomb);
  }
  async function command(type, extra = {}) {
    if (busy || !state || !canControl()) return false;
    busy = true; error = ''; render();
    let succeeded = false;
    try {
      if (demo) {
        state = BOMB_RELAY_ENGINE.apply(state, { ...extra, id: uid(), type, actor: 0, sessionId: state.sessionId, turnId: extra.turnId ?? state.turnId, now: now(), seed: seed() });
        error = state.replies?.[0]?.error || '';
      } else await sync.command(type, extra);
      succeeded = !error;
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; render(); }
    return succeeded;
  }
  async function start({ restart = false } = {}) {
    if (busy || !canControl()) return;
    if (!restart && !validBounds('', byId('fuse').value)) return;
    const chosen = restart && state ? { timing: timingPending || BOMB_RELAY_ENGINE.timingSettings(state), cards: state.cards,
      category: BOMB_RELAY_DECK.categories.includes(state.category) ? state.category : 'mixed',
      weights: state.promptWeights, familyWindow: state.familyWindow } : options();
    if (sound.enabled) sound.ensure(); // inside the click: unlocks Web Audio
    busy = true; error = ''; render();
    try {
      if (demo) state = BOMB_RELAY_ENGINE.create({ ...chosen, id: uid(), roster: demoRoster, now: now(), seed: seed(),
        promptHistory: state?.promptHistory, weights: state?.promptWeights, familyWindow: state?.familyWindow });
      else await sync.start(chosen);
      editing = false; byId('manage').close();
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; sceneKey = ''; render(); }
  }
  const turn = () => state?.turnId;
  byId('setup').addEventListener('submit', event => { event.preventDefault(); start(); });
  byId('setup-cancel').addEventListener('click', () => { editing = false; render(); });
  byId('fuse').addEventListener('change', changeSetupTiming);
  byId('scale').addEventListener('change', changeSetupTiming);
  byId('min').addEventListener('change', changeSetupTiming);
  byId('max').addEventListener('change', changeSetupTiming);
  byId('manage-speed').addEventListener('change', changeRoomTiming);
  byId('manage-scale').addEventListener('change', changeRoomTiming);
  byId('manage-min').addEventListener('change', changeRoomTiming);
  byId('manage-max').addEventListener('change', changeRoomTiming);
  for (const bound of ['min', 'max']) {
    byId(bound).addEventListener('input', () => updateBoundLimits('', byId('fuse').value));
    byId('manage-' + bound).addEventListener('input', () => updateBoundLimits('manage-', byId('manage-speed').value));
  }
  byId('light').addEventListener('click', () => { if (sound.enabled) sound.ensure(); command('light', { turnId: turn() }); });
  byId('reroll').addEventListener('click', () => command('reroll', { turnId: turn() }));
  byId('pass').addEventListener('click', () => command('pass', { turnId: turn() }));
  byId('next').addEventListener('click', () => command('next', { turnId: turn() }));
  byId('pause').addEventListener('click', () => command(state?.phase === 'paused' ? 'resume' : 'pause'));
  byId('again').addEventListener('click', () => start({ restart: true }));
  byId('settings').addEventListener('click', () => { restoreOptions(state); editing = true; render(); byId('fuse').focus(); });
  byId('manage-open').addEventListener('click', () => { if (state) byId('manage').showModal(); });
  byId('restart').addEventListener('click', () => start({ restart: true }));
  byId('stop').addEventListener('click', async () => { await command('stop'); byId('manage').close(); });
  byId('roster').addEventListener('click', event => {
    const button = event.target.closest('[data-br-roster]');
    if (!button || button.disabled) return;
    command('exclude', { playerNum: Number(button.dataset.brRoster), active: button.dataset.brActive === 'true' });
  });
  byId('manage').addEventListener('click', event => { if (event.target === byId('manage')) byId('manage').close(); });
  byId('demo-view').addEventListener('change', () => { sceneKey = ''; render(); });
  byId('library').addEventListener('toggle', renderLibrary);
  byId('library-category').addEventListener('change', renderLibrary);
  byId('sound').addEventListener('click', () => { sound.toggle().then(() => { paintSound(); follow(); }); });

  let roomCode = null;
  if (demo) {
    byId('demo-bar').hidden = false; byId('demo-link').hidden = true;
  } else {
    let saved = null;
    try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (e) {}
    if (!saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#b7a580', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 4 });
      sync = new BOMB_RELAY_SYNC.Host({ room: ROOM, db: firebase.database(),
        onChange: next => {
          if (state?.turnId !== next?.turnId) error = '';
          if (!state || state.sessionId !== next?.sessionId) { timingPending = null; restoreOptions(next); }
          else if (timingPending && timingMatches(next, timingPending)) timingPending = null;
          state = next; render();
        },
        onStatus: next => { status = next; if (next === 'switched') { timingPending = null; editing = false; sound.stopLoop(); sceneKey = ''; byId('manage').close(); } render(); },
      });
      sync.connect();
    }
  }
  labels(); render();
  I18N.onChange(() => { labels(); render(); });
  // Only the simulation advances locally; live rooms tick inside the sync host.
  timer = setInterval(() => {
    if (closed || !demo || !state || busy) return;
    const due = state.phase === 'ticking' ? state.explodeAt : ['boom', 'discussion'].includes(state.phase) ? state.phaseUntil : null;
    if (due && now() >= due) {
      state = BOMB_RELAY_ENGINE.apply(state, { id: uid(), type: 'tick', actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() });
      render();
    }
  }, 100);
  function close() { closed = true; timingPending = null; clearInterval(timer); sync?.close(); sound.close(); demoCard?.destroy(); }
  window.addEventListener('storage', event => {
    if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) { close(); status = 'roomChanged'; byId('manage').close(); render(); }
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  window.BOMB_RELAY_HOST = { get state() { return state; }, view, command, start };
})();
