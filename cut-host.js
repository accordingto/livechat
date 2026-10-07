(() => {
  'use strict';
  const { t, esc, list, scene } = CUT_UI;
  const byId = id => document.getElementById('cut-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['Amy', 'Kevin', 'Jason', 'Willy'].map((name, i) => ({ playerNum: i + 1, name, active: true }));
  let state = null, sync = null, status = demo ? 'ready' : 'connecting';
  let busy = false, error = '', sceneKey = '', rosterKey = '', closed = false, timer = null;
  let startingSession = null, editing = false;
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const uid = () => CUT_SYNC.uid();
  const now = () => sync ? sync.now() : Date.now();
  const canControl = () => !closed && (demo || !!(sync?.connected && sync?.own));
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
    sceneKey = ''; rosterKey = ''; paintSound();
  }
  function render() {
    const cut = view();
    const switched = status === 'switched';
    byId('status').textContent = ['setupNeeded', 'ready'].includes(status) ? '' : t(status);
    byId('setup-needed').hidden = status !== 'setupNeeded';
    byId('setup').hidden = status === 'setupNeeded' || (!!cut && !switched && !editing);
    byId('session').hidden = !cut || switched || editing;
    byId('start').textContent = t(editing ? 'saveSettings' : 'start');
    byId('start').disabled = busy || !canControl();
    byId('setup-close').hidden = !editing;
    byId('setup-close').disabled = busy || !canControl();
    byId('settings-hint').hidden = !editing;
    byId('error').textContent = error ? t(error) : '';
    if (cut && !switched) {
      const actor = demo ? Number(byId('demo-view').value) : 0;
      const key = JSON.stringify([actor, cut.sessionId, cut.turnId, cut.phase, cut.canBegin, cut.topic, cut.speaker, cut.nextSpeaker, cut.cutEvent, cut.roster]);
      if (key !== sceneKey) { byId('scene').innerHTML = scene(cut, actor, now()); sceneKey = key; }
      byId('begin').hidden = cut.phase !== 'ready';
      byId('begin').disabled = busy || !canControl() || !cut.canBegin;
      byId('pause').hidden = ['setup', 'ready', 'break', 'finished', 'stopped'].includes(cut.phase);
      byId('pause').textContent = t(cut.phase === 'paused' ? 'resume' : 'pause');
      byId('next').hidden = cut.phase !== 'break';
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
    if (busy || !canControl()) return;
    // This call runs inside the Show-topic click gesture, allowing Web Audio on mobile.
    const audioReady = sound.enabled ? sound.unlock() : Promise.resolve(false);
    if (editing && !restart) {
      const saved = await command('configure', { speed: byId('speed').value, category: byId('category').value });
      if (saved) { editing = false; render(); }
      return;
    }
    busy = true; error = ''; render();
    try {
      await audioReady;
      if (!canControl()) return;
      const options = restart && state ? { speed: state.speed, category: state.category } : { speed: byId('speed').value, category: byId('category').value };
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
      byId('speed').value = state.speed;
      byId('category').value = state.category;
      editing = true; byId('manage').close(); sound.silence(); render();
      byId('speed').focus();
    }
  }
  async function closeSettings() {
    if (await command('cancelSettings')) { editing = false; render(); }
  }
  byId('setup').addEventListener('submit', event => { event.preventDefault(); start(); });
  byId('setup-close').addEventListener('click', closeSettings);
  byId('settings-open').addEventListener('click', openSettings);
  byId('begin').addEventListener('click', () => { if (sound.enabled) sound.unlock(); command('begin'); });
  byId('scene').addEventListener('click', event => {
    if (event.target.closest('[data-cut-action="begin"]')) { if (sound.enabled) sound.unlock(); command('begin'); }
  });
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
            byId('speed').value = next.speed; byId('category').value = next.category;
          }
          editing = next?.phase === 'setup'; state = next; render();
        },
        onStatus: next => { status = next; if (next === 'switched') { editing = false; sound.silence(); sceneKey = ''; byId('manage').close(); } render(); },
      });
      sync.connect();
    }
  }
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
    closed = true; clearInterval(timer); sync?.close(); sound.close();
  }
  window.addEventListener('storage', event => {
    if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) {
      close(); status = 'roomChanged'; byId('manage').close(); render();
    }
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
