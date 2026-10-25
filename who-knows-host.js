/* WHO KNOWS? shared host screen. It starts a game on the room's original
 * player links and then is optional: the cards run the table themselves (clock
 * and Table controls included), so this page can be closed or reopened at any
 * time. It only ever renders the public projection (actor 0): never the word,
 * never a role. `?demo=1` runs the whole game on one device with a switchable
 * card view and no Firebase. */
(() => {
  'use strict';
  const UI = WHO_KNOWS_UI, E = WHO_KNOWS_ENGINE;
  const { t, esc, list } = UI;
  const byId = id => document.getElementById('wk-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'].map((name, i) => ({ playerNum: i + 1, name, active: true }));
  const TIMED = ['countdown', 'questions', 'hunt', 'accuse', 'discuss', 'speaking', 'judge', 'vote', 'masterGuess'];
  // Closing these ends the guessing or settles a vote, so it takes two taps.
  const CONFIRM_CLOSE = ['questions', 'hunt', 'accuse', 'judge', 'vote', 'masterGuess'];
  let state = null, sync = null, status = demo ? 'ready' : 'connecting';
  let busy = false, error = '', sceneKey = '', rosterKey = '', closed = false, editing = false, saved = '';
  let armed = '', armTimer = null, demoCard = null, demoCardActor = 0, setupMode = 'insider';
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const uid = () => WHO_KNOWS_SYNC.uid();
  const now = () => sync ? sync.now() : Date.now();
  const stale = () => status === 'switched' || status === 'rosterChanged';
  const canStart = () => !closed && (demo || (!!sync?.connected && !['connecting', 'offline', 'error'].includes(status)));
  const canControl = () => canStart() && !stale();
  const view = (actor = 0) => state ? E.view(state, actor).wk : null;
  const seatCount = () => demo ? demoRoster.length : sync ? sync.count : (typeof ROOM !== 'undefined' && ROOM.enabled ? ROOM.count : 0);
  const knownError = message => ['offline', 'not_enough_players', 'invalid_roster', 'invalid_options', 'not_available', 'stale_turn', 'already_in_line'].includes(message) ? message : 'error';

  // ── settings forms (setup and "next round" in Host controls) ──────────
  const FORMS = {
    setup: { mode: () => setupMode, minutes: 'minutes', turnSeconds: 'turn-seconds', difficulty: 'difficulty', tokens: 'tokens', wolves: 'wolves', mayorSecret: 'mayor-secret', masterGuess: 'master-guess', only: 'data-wk-only', target: 'target-kind', numberMax: 'number-max', targetOnly: 'data-wk-target-only' },
    manage: { mode: () => byId('m-mode').value, minutes: 'm-minutes', turnSeconds: 'm-turn-seconds', difficulty: 'm-difficulty', tokens: 'm-tokens', wolves: 'm-wolves', mayorSecret: 'm-mayor-secret', masterGuess: 'm-master-guess', only: 'data-wk-m-only', target: 'm-target-kind', numberMax: 'm-number-max', targetOnly: 'data-wk-m-target-only' },
  };
  function readSettings(form) {
    const f = FORMS[form], wolves = byId(f.wolves).value;
    return { mode: f.mode(), questionMinutes: Number(byId(f.minutes).value), turnSeconds: Number(byId(f.turnSeconds).value), difficulty: byId(f.difficulty).value,
      tokens: Number(byId(f.tokens).value), wolves: wolves === 'auto' ? 'auto' : Number(wolves),
      mayorSecret: byId(f.mayorSecret).checked, masterGuess: byId(f.masterGuess).checked,
      broadHint: !!byId(form === 'setup' ? 'broad-hint' : 'm-broad-hint')?.checked,
      targetKind: byId(f.target)?.value || 'word', numberMax: Number(byId(f.numberMax)?.value || E.CONFIG.defaultNumberMax) };
  }
  function writeSettings(form, settings) {
    let s; try { s = E.parseSettings(settings || {}); } catch (_) { s = E.defaultSettings(); }
    const f = FORMS[form];
    if (form === 'setup') selectMode(s.mode, { keepMinutes: true }); else byId('m-mode').value = s.mode;
    byId(f.minutes).value = String(s.questionMinutes); byId(f.difficulty).value = s.difficulty;
    byId(f.turnSeconds).value = String(s.turnSeconds ?? 25);
    byId(f.tokens).value = String(s.tokens); byId(f.wolves).value = String(s.wolves);
    byId(f.mayorSecret).checked = !!s.mayorSecret; byId(f.masterGuess).checked = s.masterGuess !== false;
    const clue = byId(form === 'setup' ? 'broad-hint' : 'm-broad-hint'); if (clue) clue.checked = !!s.broadHint;
    if (byId(f.target)) byId(f.target).value = s.targetKind;
    if (byId(f.numberMax)) byId(f.numberMax).value = String(s.numberMax);
    showOnly(form);
  }
  function showOnly(form) {
    const f = FORMS[form], mode = f.mode();
    for (const element of document.querySelectorAll(`[${f.only}]`)) element.hidden = element.getAttribute(f.only) !== mode;
    const target = byId(f.target)?.value || 'word';
    for (const element of document.querySelectorAll(`[${f.targetOnly}]`)) element.hidden = element.getAttribute(f.targetOnly) !== target;
    if (form === 'setup') for (const kind of E.MODES) {
      const pitch = document.querySelector(`[data-wk-mode-card="${kind}"] [data-i18n="whoknows.pitch_${kind}"]`);
      if (pitch) pitch.textContent = t((target === 'number' ? 'numberPitch_' : 'pitch_') + kind);
    }
  }
  function selectMode(mode, { keepMinutes = false } = {}) {
    setupMode = E.MODES.includes(mode) ? mode : 'insider';
    for (const input of document.querySelectorAll('input[name="wk-mode"]')) input.checked = input.value === setupMode;
    for (const card of document.querySelectorAll('[data-wk-mode-card]')) card.classList.toggle('is-selected', card.dataset.wkModeCard === setupMode);
    if (!keepMinutes) byId('minutes').value = String(E.CONFIG.defaultQuestionMinutes[setupMode]);
    showOnly('setup');
  }

  function labels() {
    I18N.applyStatic(document);
    const pick = (id, values, label) => {
      const value = byId(id).value;
      byId(id).innerHTML = values.map(v => `<option value="${esc(v)}">${esc(label(v))}</option>`).join('');
      if (values.map(String).includes(value)) byId(id).value = value;
    };
    for (const prefix of ['', 'm-']) {
      pick(prefix + 'minutes', E.CONFIG.questionMinutes, n => t('minutesN', { n }));
      pick(prefix + 'turn-seconds', E.CONFIG.turnSecondsOptions || [20, 25, 30], n => t('secondsN', { n }));
      pick(prefix + 'difficulty', E.CONFIG.difficulties, d => t('diff_' + d));
      pick(prefix + 'tokens', E.CONFIG.tokenOptions, n => n === 0 ? t('tokensNone') : String(n));
      pick(prefix + 'wolves', E.CONFIG.wolfOptions, w => t('wolves_' + w));
      if (byId(prefix + 'target-kind')) pick(prefix + 'target-kind', E.CONFIG.targetKinds, k => t('target_' + k));
      if (byId(prefix + 'number-max')) pick(prefix + 'number-max', E.CONFIG.numberMaxOptions, n => t('numberPoolN', { n }));
    }
    pick('m-mode', E.MODES, m => t('mode_' + m));
    if (!byId('minutes').dataset.ready) { writeSettings('setup', state?.settings || E.defaultSettings()); byId('minutes').dataset.ready = '1'; }
    for (const element of document.querySelectorAll('[data-wk-art]')) element.innerHTML = UI.art(element.dataset.wkArt);
    for (const element of document.querySelectorAll('[data-wk-legend]')) element.innerHTML = E.CONFIG.answers[element.dataset.wkLegend].map(UI.tokenLabel).join('');
    const actor = byId('demo-view').value || '0';
    byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    byId('demo-view').value = actor;
    byId('room-label').textContent = demo || !sync ? '' : t('room', { code: ROOM.code });
    showOnly('setup'); showOnly('manage');
    sceneKey = ''; rosterKey = '';
  }

  // ── rendering ─────────────────────────────────────────────────────────
  function render() {
    const wk = stale() ? null : view();
    // Another game borrowed some cards: carry on with this game, or start anew.
    const resumable = status === 'switched' && !!state && !closed && !!sync?.connected && sync.sameRoom && !sync.rosterChanged;
    byId('status').textContent = ['setupNeeded', 'ready'].includes(status) || resumable ? '' : t(status);
    byId('switched').hidden = !resumable;
    byId('continue').disabled = busy || !resumable;
    byId('setup-needed').hidden = status !== 'setupNeeded';
    const playing = !!wk && !editing;
    byId('setup').hidden = status === 'setupNeeded' || playing;
    byId('game').hidden = !playing;
    document.body.classList.toggle('wk-playing', playing);
    const count = seatCount(), countOk = count >= E.CONFIG.minPlayers && count <= E.CONFIG.maxPlayers;
    byId('count-note').textContent = countOk || status === 'setupNeeded' || (!demo && !sync) ? '' : t('playersNeeded', { n: count });
    byId('start').disabled = busy || !canStart() || !countOk;
    byId('setup-cancel').hidden = !editing;
    for (const element of byId('setup').querySelectorAll('select, input')) element.disabled = busy;
    byId('error').textContent = error ? t(error) : '';
    const actor = demo ? Number(byId('demo-view').value) : 0;
    if (playing) {
      if (actor) renderDemoCard(actor);
      else {
        if (demoCard) { demoCard.destroy(); demoCard = null; demoCardActor = 0; }
        const key = JSON.stringify([I18N.lang, wk.sessionId, wk.turnId, wk.stage, wk.phase]);
        if (key !== sceneKey) { byId('scene').innerHTML = UI.stage(wk); sceneKey = key; paint(); }
      }
      const hostView = !actor, phase = wk.phase, timed = TIMED.includes(phase);
      if (armed.startsWith('close:') && armed !== 'close:' + wk.stage) disarm();
      byId('close').hidden = !hostView || !timed;
      byId('close').textContent = !timed ? '' : phase === 'speaking' ? t('nextSpeaker') : armed === 'close:' + wk.stage ? t('tapAgain') : t('close_' + phase);
      byId('close').classList.toggle('wk-danger', phase !== 'speaking' && armed === 'close:' + wk.stage);
      byId('skip-speaking').hidden = !hostView || phase !== 'speaking';
      byId('skip-speaking').textContent = t(armed === 'close:' + wk.stage ? 'skipSpeakingConfirm' : 'close_speaking');
      byId('skip-speaking').classList.toggle('wk-danger', armed === 'close:' + wk.stage);
      byId('extend').hidden = !hostView || !timed || phase === 'countdown';
      byId('extend').textContent = t(phase === 'questions' ? 'extendQuestions' : 'extendOther');
      byId('pause').hidden = !hostView || !(timed || phase === 'paused');
      byId('pause').textContent = t(phase === 'paused' ? 'resume' : 'pause');
      byId('next').hidden = !hostView || phase !== 'result';
      byId('again').hidden = !hostView || phase !== 'finished';
      byId('settings').hidden = !hostView || phase !== 'finished';
      byId('manage-open').hidden = !hostView;
      for (const id of ['close', 'skip-speaking', 'extend', 'pause', 'next', 'again', 'settings', 'manage-open']) byId(id).disabled = busy || !canControl();
      renderManage(wk);
    } else {
      if (demoCard) { demoCard.destroy(); demoCard = null; demoCardActor = 0; }
      if (byId('manage').open) byId('manage').close();
    }
  }
  function paint() { if (!demoCard) UI.paintTimers(byId('scene'), now()); }
  // In the one-device demo, the scene becomes the chosen player's card.
  function renderDemoCard(actor) {
    if (!demoCard || demoCardActor !== actor) {
      demoCard?.destroy(); sceneKey = '';
      byId('scene').innerHTML = '<div class="wk-demo-phone"></div>';
      demoCardActor = actor;
      demoCard = new UI.Card(byId('scene').firstElementChild, {
        now, table: true,
        nameBanner: data => `<span class="name-banner">${esc(data.name || t('player', { n: data.playerNum }))}</span>`,
        send: command => {
          const next = E.apply(state, Object.assign({}, command, { actor, now: now(), seed: seed() }));
          const reply = next.replies?.[actor];
          if (next === state) return Promise.reject(new Error('not_available'));
          if (reply?.id === command.id && reply.error) return Promise.reject(new Error(reply.error));
          state = next; setTimeout(render, 0); return Promise.resolve();
        },
      });
    }
    const shown = E.view(state, actor);
    shown.wk.online = demoRoster.map(p => p.playerNum); // one device: everyone is "here"
    demoCard.update(shown);
  }
  function renderManage(wk) {
    const next = state?.rotation?.next;
    byId('next-answerer').textContent = next != null ? t('nextAnswerer', { name: UI.nameOf(wk, next) }) : t('nextAuto');
    const disabled = busy || !canControl();
    const key = JSON.stringify([I18N.lang, wk.roster, next, wk.phase, disabled]);
    if (key !== rosterKey) {
      rosterKey = key;
      byId('roster').innerHTML = list(wk.roster).map(p => {
        const n = p.playerNum, isNext = next === n;
        return `<div class="wk-roster-row"><div><strong>${esc(p.name || t('player', { n }))}</strong><span class="wk-soft">${esc(t(p.active ? 'playing' : 'sittingOut'))} · ${esc(UI.pts(p.score))}${!demo && sync ? ' · ' + esc(t(sync.online().includes(n) ? 'onlineSeat' : 'offlineSeat')) : ''}</span></div><div class="wk-actions">${p.active && wk.phase !== 'finished' ? `<button type="button" class="wk-button wk-small" data-wk-next="${isNext ? '' : n}"${disabled ? ' disabled' : ''}>${esc(t(isNext ? 'nextChosen' : 'makeNext'))}</button>` : ''}<button type="button" class="wk-button wk-small" data-wk-seat="${n}" data-wk-active="${!p.active}"${disabled ? ' disabled' : ''}>${esc(t(p.active ? 'sitOut' : 'rejoin'))}</button></div></div>`;
      }).join('');
    }
    const roundLive = !!state?.round && !['result', 'finished'].includes(wk.phase);
    byId('void').textContent = t(armed === 'void' ? 'voidConfirm' : 'voidRound');
    byId('void').classList.toggle('wk-danger', armed === 'void');
    byId('void').disabled = disabled || !roundLive;
    byId('restart').textContent = t(armed === 'restart' ? 'restartConfirm' : 'restart');
    byId('restart').classList.toggle('wk-danger', armed === 'restart');
    byId('restart').disabled = busy || !canControl();
    byId('stop').textContent = t(armed === 'stop' ? 'stopConfirm' : 'stop');
    byId('stop').disabled = disabled || wk.phase === 'finished';
    byId('save-settings').disabled = disabled;
    for (const element of byId('manage').querySelectorAll('.wk-settings select, input[type="checkbox"]')) element.disabled = disabled;
    byId('saved').textContent = saved;
  }

  // ── actions ───────────────────────────────────────────────────────────
  function arm(key) { armed = key; clearTimeout(armTimer); armTimer = setTimeout(() => { armed = ''; render(); }, 4000); render(); }
  function disarm() { armed = ''; clearTimeout(armTimer); }
  async function command(type, extra = {}) {
    if (busy || !state || !canControl()) return false;
    busy = true; error = ''; render();
    let ok = false;
    try {
      if (demo) {
        const input = Object.assign({}, extra, { id: uid(), type, actor: 0, sessionId: state.sessionId,
          stage: Number.isInteger(extra.stage) ? extra.stage : state.stage, now: now(), seed: seed() });
        state = E.apply(state, input);
        const reply = state.replies?.[0];
        if (reply?.id === input.id && reply.error) throw new Error(reply.error);
      } else await sync.command(type, extra);
      ok = true;
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; render(); }
    return ok;
  }
  // A running game restarts in place (same links, same session); a room that
  // switched games or changed size gets a fresh session.
  async function start(settings) {
    if (busy || !canStart()) return;
    let parsed;
    try { parsed = E.parseSettings(settings || {}); } catch (_) { error = 'invalid_options'; render(); return; }
    busy = true; error = ''; disarm(); render();
    try {
      if (demo) state = E.create({ id: uid(), roster: demoRoster, settings: parsed, now: now(), seed: seed(), wordHistory: state?.wordHistory });
      else if (state && !stale()) await sync.command('restart', { settings: parsed });
      else await sync.start({ settings: parsed });
      editing = false; saved = '';
      if (byId('manage').open) byId('manage').close();
    } catch (e) { error = knownError(e.message); }
    finally { busy = false; sceneKey = ''; render(); }
  }
  const stage = () => view()?.stage;

  byId('setup').addEventListener('submit', event => { event.preventDefault(); start(readSettings('setup')); });
  byId('setup').addEventListener('change', event => {
    if (event.target.name === 'wk-mode') selectMode(event.target.value);
    if (event.target === byId('target-kind')) showOnly('setup');
  });
  byId('setup-cancel').addEventListener('click', () => { editing = false; render(); });
  byId('continue').addEventListener('click', async () => {
    if (busy || !sync) return;
    busy = true; error = ''; render();
    try { await sync.point(); } catch (e) { error = knownError(e.message); }
    finally { busy = false; sceneKey = ''; render(); }
  });
  byId('close').addEventListener('click', () => {
    const wk = view(); if (!wk) return;
    if (wk.phase === 'speaking') { disarm(); command('nextSpeaker', { stage: wk.stage, turnId: wk.speaking?.turnId }); return; }
    if (CONFIRM_CLOSE.includes(wk.phase) && armed !== 'close:' + wk.stage) { arm('close:' + wk.stage); return; }
    disarm(); command('close', { stage: wk.stage });
  });
  byId('skip-speaking').addEventListener('click', () => {
    const wk = view(); if (!wk || wk.phase !== 'speaking') return;
    if (armed !== 'close:' + wk.stage) { arm('close:' + wk.stage); return; }
    disarm(); command('close', { stage: wk.stage, turnId: wk.speaking?.turnId });
  });
  byId('extend').addEventListener('click', () => command('extend', { stage: stage() }));
  byId('pause').addEventListener('click', () => command(state?.phase === 'paused' ? 'resume' : 'pause'));
  byId('next').addEventListener('click', () => command('next', { stage: stage() }));
  byId('again').addEventListener('click', () => start(state?.settings));
  byId('settings').addEventListener('click', () => { writeSettings('setup', state?.settings); editing = true; render(); byId('minutes').focus(); });
  byId('manage-open').addEventListener('click', () => {
    if (!state) return;
    writeSettings('manage', state.settings); saved = ''; rosterKey = ''; render();
    byId('manage').showModal();
  });
  byId('manage').addEventListener('close', () => { if (['void', 'restart', 'stop'].includes(armed)) { disarm(); render(); } });
  byId('manage').addEventListener('click', event => { if (event.target === byId('manage')) byId('manage').close(); });
  byId('m-mode').addEventListener('change', () => {
    byId('m-minutes').value = String(E.CONFIG.defaultQuestionMinutes[byId('m-mode').value] || 5);
    showOnly('manage');
  });
  byId('m-target-kind')?.addEventListener('change', () => showOnly('manage'));
  byId('manage').addEventListener('change', event => { if (event.target.closest('.wk-settings, .wk-check')) { saved = ''; byId('saved').textContent = ''; } });
  byId('save-settings').addEventListener('click', async () => {
    if (await command('settings', { settings: readSettings('manage') })) { saved = t('saved'); render(); }
  });
  byId('roster').addEventListener('click', event => {
    const seat = event.target.closest('[data-wk-seat]'), next = event.target.closest('[data-wk-next]');
    if (seat && !seat.disabled) command('exclude', { playerNum: Number(seat.dataset.wkSeat), active: seat.dataset.wkActive === 'true' });
    else if (next && !next.disabled) command('setNext', { playerNum: next.dataset.wkNext === '' ? null : Number(next.dataset.wkNext) });
  });
  byId('void').addEventListener('click', () => { if (armed !== 'void') { arm('void'); return; } disarm(); command('void'); });
  byId('restart').addEventListener('click', () => { if (armed !== 'restart') { arm('restart'); return; } start(state?.settings); });
  byId('stop').addEventListener('click', async () => {
    if (armed !== 'stop') { arm('stop'); return; }
    disarm();
    if (await command('stop')) byId('manage').close();
  });
  byId('demo-view').addEventListener('change', () => { sceneKey = ''; render(); });

  let roomCode = null;
  if (demo) {
    byId('demo-bar').hidden = false; byId('demo-link').hidden = true;
  } else {
    let saved = null;
    try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (e) {}
    if (!saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#e7c47c', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 5 });
      sync = new WHO_KNOWS_SYNC.HostTable({ room: ROOM, db: firebase.database(),
        onChange: next => {
          if (state?.stage !== next?.stage) error = '';
          if (!state || state.sessionId !== next?.sessionId) writeSettings('setup', next?.settings);
          state = next; render();
        },
        onStatus: next => {
          status = next;
          if (stale()) { editing = false; sceneKey = ''; disarm(); if (byId('manage').open) byId('manage').close(); }
          render();
        },
        onPresence: () => { rosterKey = ''; render(); },
      });
      sync.connect();
      document.addEventListener('visibilitychange', () => sync?.setVisible(!document.hidden));
    }
  }
  labels(); render();
  I18N.onChange(() => { labels(); render(); });
  const timers = [
    setInterval(paint, 250),
    // Only the simulation keeps its own clock; live rooms tick inside the table
    // client (here and on every card).
    setInterval(() => {
      if (closed || !demo || !state || busy || !TIMED.includes(state.phase) || !(state.deadline > 0) || now() < state.deadline) return;
      state = E.apply(state, { id: uid(), type: 'tick', actor: 0, sessionId: state.sessionId, stage: state.stage, now: now(), seed: seed() });
      render();
    }, 200),
  ];
  function close() { closed = true; timers.forEach(clearInterval); clearTimeout(armTimer); sync?.close(); demoCard?.destroy(); }
  window.addEventListener('storage', event => {
    if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) { close(); status = 'roomChanged'; if (byId('manage').open) byId('manage').close(); render(); }
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  window.WHO_KNOWS_HOST = { get state() { return state; }, get status() { return status; }, view, command, start };
})();
