(() => {
  'use strict';
  const { t, esc, list, name } = TALK_UI;
  const byId = id => document.getElementById('talk-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['小安', '阿哲', '小羽', '阿凱'].map((name, i) => ({ playerNum: i + 1, name }));
  let state = null, sync = null, demoCard = null, status = demo ? 'ready' : 'offline', busy = false, autoStart = false;
  let error = '';
  const now = () => sync ? sync.now() : Date.now();
  const canControl = () => demo || (!!sync?.own && sync.connected);
  byId('topic-select').innerHTML = TALK_TOPICS.map((topic, i) => `<option value="${i}">${esc(topic.emoji + ' ' + topic.title)}</option>`).join('');
  function labels() {
    byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    byId('seconds').querySelectorAll('option').forEach(o => { o.textContent = t('seconds', { n: o.value }); });
    byId('room-label').textContent = demo ? '' : (sync ? t('room', { code: ROOM.code }) : '');
  }
  function render() {
    byId('host-status').textContent = status === 'ready' ? '' : t(status);
    byId('open').disabled = busy || !canControl();
    byId('session').hidden = !state;
    byId('host-error').textContent = error ? t(error) : '';
    byId('force-end').hidden = error !== 'pending_questions';
    const me = demo ? Number(byId('demo-view').value) : 0;
    byId('demo-player').hidden = !state || !me;
    byId('host-view').hidden = !!state && !!me;
    if (!state) return;
    const s = TALK_ENGINE.view(state, 0, now()).talk;
    byId('topic-title').textContent = state.topic.emoji + ' ' + state.topic.title;
    byId('question').textContent = state.topic.question;
    byId('follow-up').hidden = !state.extended;
    byId('follow-up').textContent = state.topic.followUp;
    byId('round').textContent = s.round ? t('round', { n: s.round }) : t('thinking');
    byId('floor').textContent = TALK_UI.status(s, 0);
    byId('question-return').textContent = s.activeQuestion ? t('returnTo', { name: name(s, s.speaker) }) : '';
    byId('question-requests').textContent = list(s.questions).filter(q => q.id !== s.activeQuestion?.id).map(q => t('wantsAsk', { name: name(s, q.playerNum) }) + (q.deferred ? ' · ' + t('held') : '')).join(' · ');
    byId('interest').innerHTML = TALK_UI.interests(s, now());
    byId('notes').hidden = !list(s.notes).length;
    byId('notes-content').innerHTML = TALK_UI.notes(s);
    byId('start').hidden = s.phase !== 'thinking';
    byId('extend').hidden = s.phase !== 'talking';
    byId('extend').textContent = t(s.extended ? 'hideExtend' : 'extend');
    byId('help').hidden = s.phase !== 'talking';
    byId('help-end').hidden = !!s.activeQuestion;
    byId('help-resume').hidden = !s.activeQuestion;
    for (const id of ['start', 'extend', 'new', 'help-end', 'help-resume', 'force-end']) byId(id).disabled = busy || !canControl() || status === 'switched';
    if (demo && me) {
      if (!demoCard || demoCard.data?.playerNum !== me) {
        if (demoCard) demoCard.destroy();
        demoCard = new TALK_PLAYER.Card(byId('demo-player'), {
          nameBanner: data => `<span class="name-banner">${esc(data.name)}</span>`,
          send: command => {
            state = TALK_ENGINE.apply(state, Object.assign({}, command, { actor: me, now: now(), seed: crypto.getRandomValues(new Uint32Array(1))[0] }));
            render(); return Promise.resolve();
          },
        });
      }
      demoCard.update(TALK_ENGINE.view(state, me, now()));
    } else if (demoCard) { demoCard.destroy(); demoCard = null; }
    paintClock();
  }
  async function command(type, extra = {}) {
    if (busy || !state || !canControl()) return;
    busy = true; error = ''; render();
    try {
      if (demo) {
        const id = TALK_SYNC.uid();
        state = TALK_ENGINE.apply(state, Object.assign({}, extra, { id, type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: crypto.getRandomValues(new Uint32Array(1))[0] }));
        error = state.replies?.[0]?.error || '';
      } else await sync.command(type, extra);
    } catch (e) { error = e.message in { pending_questions: 1, question_open: 1, not_available: 1, offline: 1 } ? e.message : 'error'; }
    finally { busy = false; render(); }
  }
  byId('setup').addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !canControl()) return;
    busy = true; error = ''; render();
    const options = { topic: TALK_TOPICS[Number(byId('topic-select').value)] || TALK_TOPICS[0], mode: byId('mode').value, seconds: Number(byId('seconds').value) };
    try {
      if (demo) state = TALK_ENGINE.create({ ...options, id: TALK_SYNC.uid(), roster: demoRoster, now: now() });
      else await sync.start(options);
      byId('setup').hidden = true;
    } catch (e) { error = e.message === 'offline' ? 'offline' : 'error'; }
    finally { busy = false; render(); }
  });
  byId('start').addEventListener('click', () => command('start'));
  byId('extend').addEventListener('click', () => command('extend'));
  byId('help-end').addEventListener('click', () => command('end'));
  byId('help-resume').addEventListener('click', () => command('resume'));
  byId('force-end').addEventListener('click', () => command('end', { confirm: true }));
  byId('new').addEventListener('click', () => { byId('setup').hidden = false; byId('topic-select').focus(); });
  byId('demo-view').addEventListener('change', render);
  function paintClock() {
    if (!state) return;
    byId('clock').textContent = state.phase === 'thinking' ? t('secondsLeft', { n: Math.max(0, Math.ceil((state.deadline - now()) / 1000)) }) : '';
    byId('interest').querySelectorAll('[data-talk-until]').forEach(e => { if (Number(e.dataset.talkUntil) <= now()) e.remove(); });
    if (state.phase === 'thinking' && now() >= state.deadline && canControl() && status !== 'switched' && !busy && !autoStart) {
      autoStart = true; command('start').finally(() => { autoStart = false; });
    }
  }
  labels();
  if (demo) {
    byId('demo-bar').hidden = false; byId('demo-link').hidden = true;
  } else {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('room-session-' + localStorage.getItem('room-last-session')) || 'null'); } catch (e) {}
    if (!saved?.tokens?.length) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#b5a0ef', counts: [2, 3, 4, 5, 6, 7, 8, 9], defaultCount: 5,
        onPlayerData: (num, data) => { if (sync) sync.receive(num, data); } });
      sync = new TALK_SYNC.Host({ room: ROOM, db: firebase.database(),
        onChange: next => {
          const newSession = state?.sessionId !== next.sessionId;
          if (state?.turnId !== next.turnId) error = '';
          state = next;
          if (newSession) byId('setup').hidden = true;
          render();
        },
        onStatus: next => { status = next; if (next === 'switched') byId('setup').hidden = false; render(); },
      });
      sync.connect(); labels();
    }
  }
  I18N.onChange(() => { const view = byId('demo-view').value; labels(); byId('demo-view').value = view; render(); });
  const timer = setInterval(paintClock, 1000);
  window.addEventListener('pagehide', () => { clearInterval(timer); demoCard?.destroy(); sync?.close(); });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  render();
})();
