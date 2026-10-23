(() => {
  'use strict';
  const { t, esc, list, scene } = CUT_UI;
  const byId = id => document.getElementById('cut-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['Amy', 'Kevin', 'Jason', 'Willy'].map((name, i) => ({ playerNum: i + 1, name, active: true }));
  let state = null, sync = null, status = demo ? 'ready' : 'connecting';
  let busy = false, error = '', sceneKey = '', rosterKey = '', closed = false, timer = null;
  let startingSession = null, editing = false, animatedCut = '', customError = false, topicError = false, jumpError = false, endTarget = null;
  // Mode 1 (classic) is the original takeover game; Mode 2 (jump) keeps one Main Speaker.
  let mode = 'classic';
  const jumpTimingIds = ["first-min","first-max","interval-min","interval-max"];
  const jumpTimingKeys = CUT_UI.jumpTimingKeys;
  const jumpTimingOf = current => Object.fromEntries(jumpTimingKeys.map(key => [key, current?.[key] ?? CUT_UI.jumpTimingDefaults[key]]));
  const readJumpTiming = () => Object.fromEntries(jumpTimingKeys.map((key, index) => [key, byId(jumpTimingIds[index]).value.trim() ? Number(byId(jumpTimingIds[index]).value) : NaN]));
  const mainSetting = CUT_CONFIG.jump.mainMinutes;
  const modeOf = current => current?.mode === 'jump' ? 'jump' : 'classic';
  const mainMinutesOf = value => mainSetting.options.includes(Number(value)) ? Number(value) : mainSetting.default;
  const libraryPool = () => byId('library-mode').value === 'jump' ? CUT_JUMP_TOPICS : CUT_TOPICS;
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const uid = () => CUT_SYNC.uid();
  const now = () => sync ? sync.now() : Date.now();
  // Starting is allowed after the room switched games: Start takes the cards back.
  const canStart = () => !closed && (demo || !!(sync?.connected && (sync?.own || sync?.doc?.executor?.v === 1)));
  const canControl = () => canStart() && !sync?.suspended;
  const sound = new CUT_UI.Sound(paintSound);
  const view = () => state ? CUT_ENGINE.view(state, 0, now()).cut : null;
  const knownError = message => message === 'invalid_setup' ? 'invalid_roster' : message === 'invalid_player' ? 'not_available'
    : ['offline', 'other_host', 'not_enough_players', 'invalid_roster', 'invalid_options', 'not_available', 'stale_turn'].includes(message) ? message : 'error';

  function paintSound() {
    const waiting = sound.enabled && !sound.unsupported && (sound.blocked || (!!state && !sound.context));
    byId('sound').textContent = t(waiting ? 'enableSound' : sound.enabled ? 'soundOn' : 'soundOff');
    byId('sound').setAttribute('aria-pressed', String(sound.enabled));
    byId('sound-status').textContent = sound.unsupported ? t('soundUnsupported') : waiting ? t('soundBlocked') : '';
  }
  function labels() {
    I18N.applyStatic(document);
    const actor = byId('demo-view').value || '0';
    byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    byId('demo-view').value = actor;
    byId('room-label').textContent = demo || !sync ? '' : t('room', { code: ROOM.code });
    const mainMinutes = mainMinutesOf(byId('main-minutes').value);
    byId('main-minutes').innerHTML = CUT_UI.mainOptions(mainSetting.options, mainMinutes);
    byId('main-minutes').value = String(mainMinutes);
    libraryFilters();
    byId('library-list').setAttribute('aria-label', t('browseTopics'));
    renderLibrary();
    renderTopicSettings();
    sceneKey = ''; rosterKey = ''; paintSound();
  }
  // Each mode has its own pool and its own kinds of topic; they are never mixed.
  function libraryFilters() {
    const pool = libraryPool(), libraryCategory = byId('library-category').value || 'mixed';
    const library = CUT_UI.topicLibrary(pool.items);
    byId('library-category').innerHTML = pool.categories.map(category => '<option value="' + esc(category) + '">' + esc(t(category)) + ' (' + (library.counts[category] || 0) + ')</option>').join('');
    byId('library-category').value = pool.categories.includes(libraryCategory) ? libraryCategory : 'mixed';
  }
  function renderLibrary() {
    const library = CUT_UI.topicLibrary(libraryPool().items, byId('library-category').value || 'mixed', byId('library-search').value || '');
    byId('library-count').textContent = t('libraryCount', { shown: library.count, total: library.total });
    byId('library-list').innerHTML = library.html;
  }
  function renderMode() {
    const jumpMode = mode === 'jump';
    byId('mode-classic').setAttribute('aria-pressed', String(!jumpMode));
    byId('mode-jump').setAttribute('aria-pressed', String(jumpMode));
    for (const id of ['mode-classic', 'mode-jump', 'main-minutes']) byId(id).disabled = busy;
    for (const id of jumpTimingIds) {
      byId(id).disabled = busy || !jumpMode; byId(id).required = jumpMode;
      byId(id).setAttribute('aria-invalid', String(jumpMode && jumpError));
    }
    byId('jump-error').textContent = jumpMode && jumpError ? t('jumpTimingError') : '';
    byId('classic-options').hidden = jumpMode; byId('jump-options').hidden = !jumpMode;
    byId('rules-classic').hidden = jumpMode; byId('rules-jump').hidden = !jumpMode;
    byId('mode-switch-hint').hidden = !(editing && state && mode !== modeOf(state));
  }
  function renderCustom() {
    const custom = byId('speed').value === 'custom';
    byId('custom').hidden = !custom;
    for (const id of ['custom-min', 'custom-max']) {
      byId(id).disabled = !custom || busy; byId(id).required = custom;
      byId(id).setAttribute('aria-invalid', String(custom && customError));
    }
    byId('custom-error').textContent = custom && customError ? t('customRangeError') : '';
  }
  function renderTopicSettings() {
    byId('topic-minutes').disabled = busy;
    byId('topic-minutes').setAttribute('aria-invalid', String(topicError));
    byId('topic-minutes-error').textContent = topicError ? t('topicMinutesError') : '';
  }
  function restoreOptions(current) {
    byId('speed').value = current.speed; byId('category').value = current.category;
    byId('custom-min').value = String(current.customMinSeconds ?? 15);
    byId('custom-max').value = String(current.customMaxSeconds ?? 25);
    byId('topic-minutes').value = String(current.topicMinutes ?? 10);
    mode = modeOf(current);
    byId('main-minutes').value = String(mainMinutesOf(current.mainMinutes));
    const timing = jumpTimingOf(current);
    jumpTimingKeys.forEach((key, index) => { byId(jumpTimingIds[index]).value = String(timing[key]); });
    customError = false; topicError = false; jumpError = false;
  }
  function setupOptions() {
    const speed = byId('speed').value, min = Number(byId('custom-min').value), max = Number(byId('custom-max').value);
    const topicMinutes = Number(byId('topic-minutes').value);
    const mainMinutes = mainMinutesOf(byId('main-minutes').value);
    const minValid = Number.isInteger(min) && min >= 5 && min <= 120;
    const maxValid = Number.isInteger(max) && max >= 5 && max <= 120;
    const valid = minValid && maxValid && min <= max;
    const timing = readJumpTiming(), jumpValid = CUT_UI.validJumpTiming(timing);
    if (mode === 'jump') {
      if (!jumpValid) { jumpError = true; render(); byId('first-min').focus(); return null; }
      jumpError = false;
      // Mode 1's fields are hidden here: keep their last good values rather than block on them.
      topicError = false; customError = false;
      return { ...(jumpValid ? timing : jumpTimingOf(state)), mode, mainMinutes, speed, category: byId('category').value,
        topicMinutes: CUT_UI.validTopicMinutes(topicMinutes) ? topicMinutes : state?.topicMinutes ?? 10,
        customMinSeconds: valid ? min : state?.customMinSeconds ?? 15,
        customMaxSeconds: valid ? max : state?.customMaxSeconds ?? 25 };
    }
    if (!CUT_UI.validTopicMinutes(topicMinutes)) {
      topicError = true; render(); byId('topic-minutes').focus(); return null;
    }
    topicError = false;
    if (speed === 'custom' && !valid) {
      customError = true; render(); byId(!minValid || min > max ? 'custom-min' : 'custom-max').focus(); return null;
    }
    customError = false;
    return { ...(jumpValid ? timing : jumpTimingOf(state)), mode, mainMinutes, speed, category: byId('category').value, topicMinutes,
      customMinSeconds: valid ? min : state?.customMinSeconds ?? 15,
      customMaxSeconds: valid ? max : state?.customMaxSeconds ?? 25 };
  }
  function sameEndTarget(cut) {
    return !!(cut && endTarget && cut.sessionId === endTarget.sessionId && cut.round === endTarget.round && (cut.topic?.id || cut.topic?.question || '') === endTarget.topic);
  }
  function closeEndDialog() { endTarget = null; byId('end-confirm').close(); }
  function openEndDialog() {
    const cut = view();
    if (busy || !canControl() || !cut?.canEndTopic) return;
    endTarget = { sessionId: cut.sessionId, round: cut.round, topic: cut.topic?.id || cut.topic?.question || '' };
    byId('end-confirm').showModal(); render();
  }
  async function endTopic() {
    const cut = view();
    if (!sameEndTarget(cut) || !cut.canEndTopic) { closeEndDialog(); return; }
    if (await command('endTopic')) { sound.silence(); closeEndDialog(); }
  }
  function render() {
    const cut = view();
    const switched = status === 'switched';
    byId('status').textContent = ['setupNeeded', 'ready'].includes(status) ? '' : t(status);
    byId('setup-needed').hidden = status !== 'setupNeeded';
    byId('setup').hidden = status === 'setupNeeded' || (!!cut && !switched && !editing);
    byId('session').hidden = !cut || switched || editing;
    byId('start').textContent = t(editing ? 'saveSettings' : 'start');
    byId('start').disabled = busy || !(editing ? canControl() : canStart());
    byId('setup-close').hidden = !editing;
    byId('setup-close').disabled = busy || !canControl();
    byId('settings-hint').hidden = !editing;
    renderCustom(); renderTopicSettings(); renderMode();
    if (endTarget && (!sameEndTarget(cut) || !cut.canEndTopic || switched)) closeEndDialog();
    byId('end-accept').disabled = busy || !canControl() || !cut?.canEndTopic;
    byId('error').textContent = error ? t(error) : '';
    if (cut && !switched) {
      const actor = demo ? Number(byId('demo-view').value) : 0;
      const key = JSON.stringify([actor, cut.sessionId, cut.turnId, cut.phase, cut.canBegin, cut.topic, cut.speaker, cut.nextSpeaker, cut.cutEvent, cut.roster,
        cut.mode, cut.mainClock?.durationMs, cut.interrupter, cut.canFinish, cut.roundEnd, cut.canExtend]);
      if (key !== sceneKey) {
        const cutKey = ['cut', 'interrupt'].includes(cut.phase) ? `${cut.sessionId}:${cut.cutEvent?.id || cut.turnId}` : '';
        const animate = !cutKey || cutKey !== animatedCut;
        if (cutKey) animatedCut = cutKey;
        byId('scene').innerHTML = scene(cut, actor, now(), { animate }); sceneKey = key;
      }
      byId('begin').hidden = cut.phase !== 'ready' && !(cut.phase === 'cut' && cut.canBegin);
      byId('begin').textContent = t(cut.phase === 'cut' ? 'beginHandoff' : 'begin');
      byId('begin').disabled = busy || !canControl() || !cut.canBegin;
      // Mode 2: the host can hand the floor back for whoever was asked to jump in.
      for (const id of ['done', 'skip']) {
        byId(id).hidden = cut.phase !== 'interrupt';
        byId(id).disabled = busy || !canControl() || !cut.canFinish;
      }
      byId('extend').hidden = !cut.canExtend;
      byId('extend').textContent = t('extend', { n: cut.extendMinutes || 1 });
      byId('extend').disabled = busy || !canControl();
      byId('pause').hidden = ['setup', 'ready', 'break', 'finished', 'stopped'].includes(cut.phase);
      byId('pause').textContent = t(cut.phase === 'paused' ? 'resume' : 'pause');
      byId('next').hidden = cut.phase !== 'break';
      byId('end-topic').hidden = !cut.canEndTopic;
      byId('end-topic').disabled = busy || !canControl();
      for (const id of ['pause', 'next', 'settings-open', 'restart', 'stop']) byId(id).disabled = busy || !canControl();
      byId('manage-open').disabled = busy || !canControl();
      renderRoster(cut);
    }
    paintSound(); paint();
  }
  function renderRoster(cut) {
    const key = JSON.stringify([cut.roster, busy, canControl()]);
    if (key === rosterKey) return;
    rosterKey = key;
    byId('roster').innerHTML = list(cut.roster).map(p => `<div class="cut-roster-row"><div><strong>${esc(p.name || t('player', { n: p.playerNum }))}</strong><span class="cut-soft">${esc(t(p.active === false ? 'inactive' : 'active'))}</span></div><button type="button" class="cut-button" data-cut-roster="${Number(p.playerNum)}" data-cut-active="${p.active === false}"${busy || !canControl() ? ' disabled' : ''}>${esc(t(p.active === false ? 'reinclude' : 'exclude'))}</button></div>`).join('');
  }
  function paint() {
    if (closed) return;
    const cut = view();
    if (!cut || status === 'switched') return;
    const clock = byId('scene').querySelector('[data-cut-countdown]');
    if (clock) clock.textContent = CUT_UI.countdown(cut, now()) || 'GO!';
    CUT_UI.updateTopicClock(byId('scene'), cut, now());
    CUT_UI.updateMainClock(byId('scene'), cut, now());
    const fresh = startingSession !== null && cut.sessionId !== startingSession;
    if (!canControl()) sound.silence();
    sound.update(cut, now(), fresh, canControl());
    if (fresh) startingSession = null;
  }
  async function command(type, extra = {}) {
    if (busy || !state || !canControl()) return false;
    busy = true; error = ''; render();
    let succeeded = false;
    try {
      if (demo) {
        state = CUT_ENGINE.apply(state, { ...extra, id: uid(), type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() });
        error = state.replies?.[0]?.error || '';
      } else await sync.command(type, extra);
      succeeded = !error;
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; render(); }
    return succeeded;
  }
  async function start(restart = false) {
    const allowed = () => editing && !restart ? canControl() : canStart();
    if (busy || !allowed()) return;
    const options = restart && state ? { ...jumpTimingOf(state), mode: modeOf(state), mainMinutes: mainMinutesOf(state.mainMinutes), speed: state.speed, category: state.category, customMinSeconds: state.customMinSeconds ?? 15, customMaxSeconds: state.customMaxSeconds ?? 25, topicMinutes: state.topicMinutes ?? 10 } : setupOptions();
    if (!options) return;
    // This call runs inside the Show-topic click gesture, allowing Web Audio on mobile.
    const audioReady = sound.enabled ? sound.unlock() : Promise.resolve(false);
    if (editing && !restart) {
      const saved = await command('configure', options);
      if (saved) { editing = false; render(); }
      return;
    }
    busy = true; error = ''; render();
    try {
      await audioReady;
      if (!allowed()) return;
      startingSession = state?.sessionId || '';
      if (demo) {
        state = CUT_ENGINE.create({ ...options, id: uid(), roster: demoRoster, now: now(), seed: seed() });
      } else await sync.start(options);
      editing = false;
      byId('manage').close();
    } catch (e) { startingSession = null; error = knownError(e.message); }
    finally { busy = false; render(); }
  }
  async function openSettings() {
    if (await command('settings')) {
      restoreOptions(state);
      editing = true; byId('manage').close(); sound.silence(); render();
      byId('speed').focus();
    }
  }
  async function closeSettings() {
    if (await command('cancelSettings')) { editing = false; mode = modeOf(state); render(); }
  }
  for (const id of ['mode-classic', 'mode-jump']) byId(id).addEventListener('click', () => {
    if (busy) return;
    mode = id === 'mode-jump' ? 'jump' : 'classic'; customError = false; topicError = false; render();
  });
  byId('library-mode').addEventListener('change', () => { libraryFilters(); renderLibrary(); });
  byId('library-category').addEventListener('change', renderLibrary);
  byId('library-search').addEventListener('input', renderLibrary);
  byId('library').addEventListener('toggle', () => { if (byId('library').open) renderLibrary(); });
  byId('setup').addEventListener('submit', event => { event.preventDefault(); start(); });
  byId('speed').addEventListener('change', () => { customError = false; renderCustom(); });
  for (const id of ['custom-min', 'custom-max']) byId(id).addEventListener('input', () => { customError = false; renderCustom(); });
  byId('topic-minutes').addEventListener('input', () => { topicError = false; renderTopicSettings(); });
  byId('end-topic').addEventListener('click', openEndDialog);
  byId('end-accept').addEventListener('click', endTopic);
  byId('end-cancel').addEventListener('click', closeEndDialog);
  byId('end-confirm').addEventListener('cancel', () => { endTarget = null; });
  byId('end-confirm').addEventListener('click', event => { if (event.target === byId('end-confirm')) closeEndDialog(); });
  byId('setup-close').addEventListener('click', closeSettings);
  byId('settings-open').addEventListener('click', openSettings);
  byId('begin').addEventListener('click', () => { if (sound.enabled) sound.unlock(); command('begin'); });
  byId('scene').addEventListener('click', event => {
    if (event.target.closest('[data-cut-action="begin"]')) { if (sound.enabled) sound.unlock(); command('begin'); }
    for (const type of ['done', 'skip', 'extend']) if (event.target.closest('[data-cut-action="' + type + '"]')) command(type);
  });
  for (const type of ['done', 'skip', 'extend']) byId(type).addEventListener('click', () => { if (sound.enabled) sound.unlock(); command(type); });
  byId('pause').addEventListener('click', () => { if (sound.enabled) sound.unlock(); command(state?.phase === 'paused' ? 'resume' : 'pause'); });
  byId('next').addEventListener('click', () => { if (sound.enabled) sound.unlock(); command('next'); });
  byId('manage-open').addEventListener('click', () => { if (state) byId('manage').showModal(); });
  byId('restart').addEventListener('click', () => start(true));
  byId('stop').addEventListener('click', async () => { await command('stop'); byId('manage').close(); });
  byId('roster').addEventListener('click', event => {
    const button = event.target.closest('[data-cut-roster]');
    if (!button || button.disabled) return;
    command('exclude', { playerNum: Number(button.dataset.cutRoster), active: button.dataset.cutActive === 'true' });
  });
  byId('demo-view').addEventListener('change', render);
  byId('sound').addEventListener('click', () => {
    if (!state && !sound.context) { sound.enabled = !sound.enabled; paintSound(); }
    else sound.toggle();
  });
  byId('manage').addEventListener('click', event => { if (event.target === byId('manage')) byId('manage').close(); });

  let roomCode = null;
  if (demo) {
    byId('demo-bar').hidden = false; byId('demo-link').hidden = true;
  } else {
    let saved = null;
    try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (e) {}
    if (!saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#ff7a6e', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 4 });
      sync = new CUT_SYNC.Host({ room: ROOM, db: firebase.database(),
        onChange: next => {
          if (state?.turnId !== next?.turnId) error = '';
          if (next?.phase === 'setup' && (state?.phase !== 'setup' || state?.sessionId !== next?.sessionId)) {
            restoreOptions(next);
          }
          // Outside settings, the mode cards and rules follow the game in play.
          if (next && next.phase !== 'setup') mode = modeOf(next);
          editing = next?.phase === 'setup'; state = next; render();
        },
        onStatus: next => { status = next; if (next === 'switched') { editing = false; sound.silence(); sceneKey = ''; byId('manage').close(); } render(); },
      });
      sync.connect();
    }
  }
  for (const id of jumpTimingIds) byId(id).addEventListener('input', () => { jumpError = false; renderMode(); });
  labels(); render();
  I18N.onChange(() => { labels(); render(); });
  timer = setInterval(() => {
    if (closed) return;
    // Simulation alone advances locally. Live rooms have one authoritative sync host.
    if (demo && state && !busy && !['setup', 'ready', 'paused', 'break', 'finished', 'stopped'].includes(state.phase)) {
      const next = CUT_ENGINE.apply(state, { id: uid(), type: 'tick', actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() });
      if (next.turnId !== state.turnId || next.phase !== state.phase) { state = next; render(); }
      else state = next;
    }
    paint();
  }, 100);
  function close() {
    closed = true; clearInterval(timer); sync?.close(); sound.close(); closeEndDialog();
  }
  window.addEventListener('storage', event => {
    if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) {
      close(); status = 'roomChanged'; byId('manage').close(); render();
    }
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
