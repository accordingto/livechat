(() => {
  'use strict';
  const { t, esc, list, name } = TALK_UI;
  const byId = id => document.getElementById('talk-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoRoster = ['小安', '阿哲', '小羽', '阿凱'].map((name, i) => ({ playerNum: i + 1, name }));
  let state = null, sync = null, demoCard = null, status = demo ? 'ready' : 'offline', busy = false, autoStart = false;
  let error = '';
  let source = 'library', exploreOpen = false, renderedSession = null, exploreKey = '';
  const draftKey = 'lets-talk-topic-draft.v1';
  const startersKey = 'lets-talk-starters.v1';
  let starterPreference = true, starterPending = null;
  let explanationSession = null;
  try { starterPreference = localStorage.getItem(startersKey) !== 'false'; } catch (e) {}
  const activeSession = () => !!state && status !== 'switched';
  const startersOn = () => activeSession() ? !!state.showStarters : starterPreference;
  function renderStarters() {
    byId('starter-toggle').checked = starterPending ?? startersOn();
    byId('starter-toggle').disabled = busy || (activeSession() && !canControl());
    byId('host-view').classList.toggle('talk-starters-off', !startersOn());
  }
  const now = () => sync ? sync.now() : Date.now();
  const canControl = () => demo || (!!sync?.own && sync.connected);
  const selectedTopic = () => TALK_TOPICS.find(topic => topic.id === byId('topic-select').value);
  function previewTopic() {
    const topic = selectedTopic();
    byId('preview').hidden = !topic;
    if (!topic) return;
    byId('preview-question').textContent = topic.question;
    byId('preview-starter').textContent = TALK_ENGINE.starter(topic);
    byId('preview-path').innerHTML = TALK_ENGINE.followUps(topic).map(q => `<li><p>${esc(q.question)}</p></li>`).join('');
  }
  function drawTopic() {
    const topic = TALK_LIBRARY.draw(byId('category').value, byId('search').value,
      [byId('topic-select').value, state?.topic.id], () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296);
    if (topic) byId('topic-select').value = topic.id;
    previewTopic();
    return topic;
  }
  function filterTopics() {
    const selected = byId('topic-select').value;
    const topics = TALK_LIBRARY.search(byId('category').value, byId('search').value);
    byId('topic-select').innerHTML = topics.map(topic => `<option value="${esc(topic.id)}">${esc(topic.emoji + ' ' + topic.question)}</option>`).join('');
    if (topics.some(topic => topic.id === selected)) byId('topic-select').value = selected;
    else { byId('topic-select').value = ''; drawTopic(); }
    byId('topic-select').disabled = !topics.length;
    byId('random').disabled = !topics.length;
    byId('random-new').disabled = !topics.length;
    byId('no-topics').hidden = !!topics.length;
    byId('library-count').textContent = t('libraryCount', { categories: TALK_CATEGORIES.length, topics: TALK_TOPICS.length,
      questions: TALK_TOPICS.reduce((sum, topic) => sum + 1 + TALK_ENGINE.followUps(topic).length, 0), matches: topics.length });
    byId('bank-list').innerHTML = topics.length ? topics.map(topic => `<article class="talk-bank-topic">
      <p class="talk-kicker">${esc(topic.emoji + ' ' + topic.title)}</p>
      <h3>${esc(topic.question)}</h3>
      <p class="talk-starter">${esc(TALK_ENGINE.starter(topic))}</p>
      <details class="talk-details"><summary>${esc(t('previewPath'))}</summary><ol class="talk-path">${TALK_ENGINE.followUps(topic).map(q => `<li><p>${esc(q.question)}</p></li>`).join('')}</ol></details>
      <button type="button" class="talk-button" data-talk-topic="${esc(topic.id)}">${esc(t('useTopic'))}</button>
    </article>`).join('') : `<p class="talk-soft">${esc(t('noTopics'))}</p>`;
    previewTopic();
  }
  function showSetup() {
    byId('setup').hidden = false; error = ''; render();
    byId(source === 'custom' ? 'custom-question' : selectedTopic() ? 'preview-question' : 'topic-select').focus();
  }
  function selectSource(next) {
    source = next;
    byId('library').hidden = source !== 'library'; byId('custom').hidden = source !== 'custom';
    byId('custom-question').required = source === 'custom';
    byId('source-library').setAttribute('aria-pressed', String(source === 'library'));
    byId('source-custom').setAttribute('aria-pressed', String(source === 'custom'));
    error = ''; render();
  }
  const draft = () => ({ title: byId('custom-title').value, question: byId('custom-question').value, starter: byId('custom-starter').value, followUps: byId('custom-followups').value });
  function saveDraft() {
    try { localStorage.setItem(draftKey, JSON.stringify(draft())); byId('draft-status').dataset.message = 'draftSaved'; }
    catch (e) { byId('draft-status').dataset.message = 'draftUnsaved'; }
    byId('draft-status').textContent = t(byId('draft-status').dataset.message);
  }
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (saved) {
      byId('custom-title').value = String(saved.title || '').slice(0, 80);
      byId('custom-question').value = String(saved.question || '').slice(0, 500);
      byId('custom-starter').value = String(saved.starter || '').slice(0, 600);
      byId('custom-followups').value = String(saved.followUps || '').slice(0, 2407);
      byId('draft-status').dataset.message = 'draftSaved';
    }
  } catch (e) {}
  function previewFollowUp() {
    byId('followup-preview').textContent = TALK_ENGINE.followUps(state?.topic)[Number(byId('followup-select').value)]?.question || '';
  }
  function renderExplore() {
    const choices = TALK_ENGINE.followUps(state.topic);
    const key = JSON.stringify([state.sessionId, choices, I18N.lang]);
    if (key !== exploreKey) {
      const previous = byId('followup-select').value;
      const sameSession = exploreKey && renderedSession === state.sessionId;
      byId('followup-select').innerHTML = choices.map((q, i) => `<option value="${i}">${i + 1}. ${esc(q.question)}</option>`).join('');
      const index = sameSession && choices[Number(previous)] ? Number(previous) : Math.max(0, state.extensionIndex || 0);
      if (choices[index]) byId('followup-select').value = String(index);
      exploreKey = key;
    }
    byId('explore-library').hidden = !choices.length;
    byId('explore').hidden = !exploreOpen || state.phase !== 'talking';
    byId('hide-followup').hidden = !state.extended;
    byId('explore-current').textContent = state.extended ? t('currentFollowUp', { question: state.extension || state.topic.followUp }) : t('noFollowUpShown');
    previewFollowUp();
  }
  function labels() {
    byId('source-library').parentElement.setAttribute('aria-label', t('topicSource'));
    const category = byId('category').value;
    byId('category').innerHTML = `<option value="">${esc(t('allCategories'))}</option>` + TALK_CATEGORIES.map(c => `<option value="${c.id}">${esc(c[I18N.lang] || c.en)}</option>`).join('');
    byId('category').value = category;
    filterTopics();
    if (byId('draft-status').dataset.message) byId('draft-status').textContent = t(byId('draft-status').dataset.message);
    byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(p => `<option value="${p.playerNum}">${esc(p.name)}</option>`).join('');
    byId('seconds').querySelectorAll('option').forEach(o => { o.textContent = t('seconds', { n: o.value }); });
    byId('room-label').textContent = demo ? '' : (sync ? t('room', { code: ROOM.code }) : '');
  }
  function render() {
    renderStarters();
    byId('host-status').textContent = status === 'ready' ? '' : t(status);
    byId('open').disabled = busy || !canControl() || (source === 'library' && !selectedTopic());
    byId('session').hidden = !state || !byId('setup').hidden;
    byId('cancel-setup').hidden = !state || status === 'switched';
    byId('host-error').textContent = error ? t(error) : '';
    byId('force-end').hidden = error !== 'pending_questions';
    const me = demo ? Number(byId('demo-view').value) : 0;
    byId('demo-player').hidden = !state || !me;
    byId('host-view').hidden = !!state && !!me;
    if (!state) return;
    if (renderedSession !== state.sessionId) {
      exploreOpen = false; exploreKey = ''; byId('live-followup').value = ''; renderedSession = state.sessionId;
    }
    const s = TALK_ENGINE.view(state, 0, now()).talk;
    byId('topic-title').textContent = (state.topic.emoji || '💬') + ' ' + (state.topic.title || t('customTopic'));
    byId('question').textContent = state.topic.question;
    byId('starter').textContent = s.extended && s.starter === s.topic.followUp ? '' : s.starter;
    byId('follow-up').hidden = !state.extended;
    byId('follow-up').textContent = s.topic.followUp;
    byId('floor').textContent = TALK_UI.status(s, 0);
    byId('question-return').textContent = s.activeQuestion ? t('returnTo', { name: name(s, s.speaker) }) : '';
    byId('question-requests').textContent = list(s.questions).filter(q => q.id !== s.activeQuestion?.id).map(q => t('wantsAsk', { name: name(s, q.playerNum) }) + (q.deferred ? ' · ' + t('held') : '')).join(' · ');
    byId('interest').innerHTML = TALK_UI.interests(s, now());
    byId('notes').hidden = !list(s.notes).length;
    byId('notes-content').innerHTML = TALK_UI.notes(s);
    byId('start').hidden = s.phase !== 'thinking';
    byId('extend').hidden = s.phase !== 'talking';
    byId('extend').textContent = t(exploreOpen ? 'closeExplore' : 'extend');
    byId('extend').setAttribute('aria-expanded', String(exploreOpen));
    renderExplore();
    byId('help').hidden = s.phase !== 'talking';
    byId('help-end').hidden = !!s.activeQuestion;
    byId('help-resume').hidden = !s.activeQuestion;
    for (const id of ['start', 'extend', 'new', 'help-end', 'help-resume', 'force-end', 'show-followup', 'show-custom-followup', 'hide-followup']) byId(id).disabled = busy || !canControl() || status === 'switched';
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
    } catch (e) { error = e.message in { pending_questions: 1, question_open: 1, not_available: 1, offline: 1, invalid_extension: 1, invalid_topic: 1 } ? e.message : 'error'; }
    finally { busy = false; render(); if (error === 'pending_questions') byId('force-end').focus(); }
  }
  byId('setup').addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !canControl()) return;
    busy = true; error = ''; render();
    try {
      const topic = source === 'custom' ? TALK_LIBRARY.custom(draft()) : selectedTopic();
      if (!topic) throw new Error('invalid_topic');
      const options = { topic, mode: byId('mode').value, seconds: Number(byId('seconds').value), showStarters: startersOn() };
      if (demo) state = TALK_ENGINE.create({ ...options, id: TALK_SYNC.uid(), roster: demoRoster, now: now() });
      else await sync.start(options);
      byId('setup').hidden = true;
    } catch (e) { error = ['offline', 'invalid_topic'].includes(e.message) ? e.message : 'error'; }
    finally { busy = false; render(); }
  });
  byId('start').addEventListener('click', () => command('start'));
  byId('starter-toggle').addEventListener('change', async event => {
    const show = event.target.checked;
    if (activeSession()) {
      starterPending = show;
      await command('starters', { show });
      starterPending = null; render();
      if (error) return;
    }
    starterPreference = show;
    try { localStorage.setItem(startersKey, String(show)); } catch (e) {}
    render();
  });
  byId('source-library').addEventListener('click', () => selectSource('library'));
  byId('source-custom').addEventListener('click', () => selectSource('custom'));
  byId('category').addEventListener('change', () => { filterTopics(); render(); });
  byId('search').addEventListener('input', () => { filterTopics(); render(); });
  byId('topic-select').addEventListener('change', previewTopic);
  byId('random').addEventListener('click', () => { drawTopic(); render(); });
  byId('random-new').addEventListener('click', () => { drawTopic(); selectSource('library'); showSetup(); });
  byId('bank-list').addEventListener('click', event => {
    const button = event.target.closest('[data-talk-topic]');
    if (!button || !byId('bank-list').contains(button)) return;
    byId('topic-select').value = button.dataset.talkTopic;
    previewTopic(); selectSource('library'); showSetup();
  });
  for (const id of ['custom-title', 'custom-question', 'custom-starter', 'custom-followups']) byId(id).addEventListener('input', saveDraft);
  byId('edit-topic').addEventListener('click', () => {
    const topic = selectedTopic(); if (!topic) return;
    byId('custom-title').value = topic.title; byId('custom-question').value = topic.question;
    byId('custom-starter').value = TALK_ENGINE.starter(topic);
    byId('custom-followups').value = TALK_ENGINE.followUps(topic).map(q => q.question).join('\n');
    saveDraft(); selectSource('custom'); byId('custom-question').focus();
  });
  byId('extend').addEventListener('click', () => { exploreOpen = !exploreOpen; render(); });
  byId('followup-select').addEventListener('change', previewFollowUp);
  byId('show-followup').addEventListener('click', () => command('extend', { index: Number(byId('followup-select').value) }));
  byId('hide-followup').addEventListener('click', () => command('extend', { show: false }));
  byId('followup-form').addEventListener('submit', event => {
    event.preventDefault(); command('extend', { text: byId('live-followup').value });
  });
  byId('help-end').addEventListener('click', () => command('end'));
  byId('help-resume').addEventListener('click', () => command('resume'));
  byId('force-end').addEventListener('click', () => command('end', { confirm: true }));
  byId('new').addEventListener('click', showSetup);
  byId('cancel-setup').addEventListener('click', () => { byId('setup').hidden = true; render(); });
  byId('demo-view').addEventListener('change', render);
  function paintClock() {
    if (!state) return;
    byId('clock').textContent = state.phase === 'thinking' ? t('secondsLeft', { n: Math.max(0, Math.ceil((state.deadline - now()) / 1000)) }) : '';
    byId('interest').querySelectorAll('[data-talk-until]').forEach(e => { if (Number(e.dataset.talkUntil) <= now()) e.remove(); });
    if (state.phase === 'thinking' && now() >= state.deadline && canControl() && status !== 'switched' && !busy && !autoStart) {
      autoStart = true; command('start').finally(() => { autoStart = false; });
    }
    // Refresh published library wording in an existing room without restarting
    // its topic. Adapted/custom questions and their saved descriptions stay intact.
    if (canControl() && status !== 'switched' && !busy && explanationSession !== state.sessionId) {
      explanationSession = state.sessionId;
      const topic = TALK_TOPICS.find(t => t.id === state.topic.id && t.question === state.topic.question);
      if (topic && topic.starter !== state.topic.starter) command('explain', { text: topic.starter });
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
