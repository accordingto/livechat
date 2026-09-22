(function () {
  'use strict';

  const C = window.CHAT_WOLF_COPY;
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  const syncPill = document.getElementById('sync-pill');
  document.getElementById('back-link').textContent = C.back;
  document.getElementById('brand').textContent = C.brand;

  let session = null;
  let state = null;
  let serverOffset = 0;
  let pollTimer = null;
  let heartbeatTimer = null;
  let requestRunning = false;
  let toastTimer = null;
  let lastRevision = null;
  let entryMode = new URLSearchParams(location.search).has('room') ? 'join' : 'create';
  let voteDraft = new Set();
  let voteDraftId = null;
  let taskDrafts = {};
  let lobbyDraft = null;

  const esc = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const roomCodeFromUrl = () => String(new URLSearchParams(location.search).get('room') || '').trim().toUpperCase();
  const playerById = (id) => state && state.public.players.find((player) => player.id === id);
  const playerName = (id) => (playerById(id) || {}).name || '未知玩家';
  const storageKey = (code) => `chat-wolf-session:${code}`;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function errorMessage(code) {
    return C.errors[code] || `操作未完成（${code || 'UNKNOWN'}）`;
  }

  function setSync(kind) {
    syncPill.hidden = !session;
    syncPill.classList.toggle('reconnecting', kind !== 'connected');
    syncPill.textContent = kind === 'connected' ? C.connected : kind === 'connecting' ? C.connecting : C.reconnecting;
  }

  function saveSession(code, token) {
    session = { room: code, token };
    try { localStorage.setItem(storageKey(code), token); } catch (error) { /* reconnect will only last for this tab */ }
    const url = new URL(location.href);
    url.searchParams.set('room', code);
    history.replaceState(null, '', url);
  }

  function clearSession() {
    if (session) {
      try { localStorage.removeItem(storageKey(session.room)); } catch (error) {}
    }
    session = null;
    state = null;
    lastRevision = null;
    stopSync();
  }

  async function apiRequest(method, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers.Authorization = `Bearer ${session.token}`;
    const url = method === 'GET'
      ? `/api/chat-wolf?room=${encodeURIComponent(session.room)}`
      : '/api/chat-wolf';
    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        cache: 'no-store',
        body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
      });
    } catch (error) {
      const network = new Error('NETWORK');
      network.code = 'NETWORK';
      throw network;
    }
    let payload = null;
    try { payload = await response.json(); } catch (error) {}
    if (!response.ok || !payload || !payload.ok) {
      const apiError = new Error(payload && payload.error ? payload.error : 'SERVER_ERROR');
      apiError.code = apiError.message;
      throw apiError;
    }
    return payload;
  }

  function captureOpenDetails() {
    return new Set(Array.from(app.querySelectorAll('details[open][data-detail]')).map((item) => item.dataset.detail));
  }

  function captureTaskDrafts() {
    app.querySelectorAll('form[data-task-form]').forEach((form) => {
      const id = form.dataset.taskForm;
      taskDrafts[id] = {
        note: form.querySelector('[name="note"]') ? form.querySelector('[name="note"]').value : undefined,
        summary: form.querySelector('[name="summary"]') ? form.querySelector('[name="summary"]').value : undefined,
        round: form.querySelector('[name="round"]') ? form.querySelector('[name="round"]').value : undefined,
        targets: Array.from(form.querySelectorAll('[name="target"]:checked')).map((input) => input.value),
      };
    });
  }

  function restoreOpenDetails(open) {
    for (const key of open) {
      const details = app.querySelector(`details[data-detail="${CSS.escape(key)}"]`);
      if (details) details.open = true;
    }
  }

  function applyState(next, forceRender) {
    const open = captureOpenDetails();
    captureTaskDrafts();
    state = next;
    serverOffset = Number(state.public.serverNow || Date.now()) - Date.now();
    setSync('connected');
    if (forceRender || lastRevision !== state.public.revision) {
      if (!state.public.voting || voteDraftId !== state.public.voting.id) {
        voteDraft = new Set();
        voteDraftId = state.public.voting ? state.public.voting.id : null;
      }
      lastRevision = state.public.revision;
      renderState();
      restoreOpenDetails(open);
    }
    paintTimers();
  }

  async function action(actionName, payload) {
    if (!session || requestRunning) return;
    requestRunning = true;
    setSync('connecting');
    try {
      const response = await apiRequest('POST', { action: actionName, room: session.room, ...(payload || {}) });
      applyState(response.state, true);
      return true;
    } catch (error) {
      if (['INVALID_SESSION', 'SESSION_REQUIRED'].includes(error.code)) {
        const code = session.room;
        clearSession();
        entryMode = 'join';
        renderEntry(code);
      }
      showToast(errorMessage(error.code));
      setSync('reconnecting');
      return false;
    } finally {
      requestRunning = false;
    }
  }

  async function poll() {
    if (!session || requestRunning) return;
    requestRunning = true;
    try {
      const response = await apiRequest('GET');
      applyState(response.state, false);
    } catch (error) {
      setSync('reconnecting');
      if (['INVALID_SESSION', 'SESSION_REQUIRED'].includes(error.code)) {
        const code = session.room;
        clearSession();
        entryMode = 'join';
        renderEntry(code);
        showToast(errorMessage(error.code));
      }
    } finally {
      requestRunning = false;
    }
  }

  function startSync() {
    stopSync();
    pollTimer = setInterval(poll, 1200);
    heartbeatTimer = setInterval(() => action('heartbeat'), 15000);
  }

  function stopSync() {
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
    pollTimer = null;
    heartbeatTimer = null;
  }

  function options(min, max, selected, labels) {
    let html = '';
    for (let value = min; value <= max; value += 1) {
      const suffix = labels && labels[value] ? `（${labels[value]}）` : '';
      html += `<option value="${value}"${Number(selected) === value ? ' selected' : ''}>${value}${suffix}</option>`;
    }
    return html;
  }

  function renderHero() {
    return `<section class="hero">
      <div class="eyebrow">${esc(C.eyebrow)}</div>
      <h1>${esc(C.title)}</h1>
      <p>${esc(C.intro)}</p>
      <p class="system-note">${esc(C.systemRandomNote)}</p>
    </section>`;
  }

  function renderEntry(prefill) {
    state = null;
    lastRevision = null;
    syncPill.hidden = true;
    const room = prefill || roomCodeFromUrl();
    app.innerHTML = `${renderHero()}
      <section class="entry-grid">
        <form class="card" id="create-form"${entryMode === 'create' ? '' : ' hidden'}>
          <h2>${esc(C.createRoom)}</h2>
          <label class="field"><span>${esc(C.hostName)}</span><input name="name" type="text" maxlength="24" autocomplete="nickname" required></label>
          <div class="inline-fields">
            <label class="field"><span>${esc(C.playerCount)}</span><select name="playerCount">${options(3, 12, 6, { 6: C.recommended, 7: C.recommended, 8: C.recommended })}</select></label>
            <label class="field"><span>${esc(C.wolfCount)}</span><select name="wolfCount">${options(1, 4, 2)}</select></label>
          </div>
          <label class="check-line"><input name="bellEnabled" type="checkbox" checked><span>${esc(C.bellSetting)}</span></label>
          <div class="inline-fields">
            <label class="field"><span>${esc(C.talkSeconds)}</span><select name="talkSeconds">${[30,45,60,75,90,120].map((n) => `<option value="${n}"${n === 60 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>${esc(C.meetingSeconds)}</span><select name="meetingSeconds">${[10,15,20,30,45,60].map((n) => `<option value="${n}"${n === 20 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>${esc(C.voteSeconds)}</span><select name="voteSeconds">${[15,20,30,45,60,90].map((n) => `<option value="${n}"${n === 30 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="btn" type="submit">${esc(C.createButton)}</button>
          <button class="btn ghost" type="button" data-entry-mode="join">${esc(C.joinRoom)}</button>
        </form>
        <form class="card" id="join-form"${entryMode === 'join' ? '' : ' hidden'}>
          <h2>${esc(C.joinRoom)}</h2>
          <label class="field"><span>${esc(C.roomCode)}</span><input name="room" type="text" value="${esc(room)}" maxlength="6" autocapitalize="characters" required></label>
          <label class="field"><span>${esc(C.nickname)}</span><input name="name" type="text" maxlength="24" autocomplete="nickname" required></label>
          <button class="btn" type="submit">${esc(C.joinButton)}</button>
          <button class="btn ghost" type="button" data-entry-mode="create">${esc(C.createRoom)}</button>
        </form>
      </section>
      <p class="secure-note">${esc(C.secureInvite)}</p>`;
  }

  function inviteUrl() {
    const url = new URL('chat-wolf.html', location.href);
    url.search = '';
    url.searchParams.set('room', state.public.code);
    return url.href;
  }

  function roomBar() {
    return `<div class="room-bar">
      <div><span class="phase-chip">${esc(C.phases[state.public.phase] || state.public.phase)}</span> <span class="room-code">${esc(state.public.code)}</span></div>
      <div class="button-row"><button class="btn secondary small" type="button" data-command="copyInvite">${esc(C.copyInvite)}</button></div>
    </div>`;
  }

  function playerRows(showRemove) {
    return `<div class="player-list">${state.public.players.map((player) => `<div class="player-row">
      <span class="status-dot${player.connected ? ' on' : ''}" title="${esc(player.connected ? C.online : C.offline)}"></span>
      <span class="name">${esc(player.name)}${player.id === state.private.playerId ? ` <span class="muted">（${esc(C.me)}）</span>` : ''}</span>
      ${player.isHost ? `<span class="mini-chip host">${esc(C.host)}</span>` : ''}
      <span class="mini-chip${player.ready ? ' ready' : ''}">${esc(player.ready ? C.ready : C.notReady)}</span>
      ${showRemove && !player.isHost ? `<button class="btn ghost small" type="button" data-action="removePlayer" data-player-id="${esc(player.id)}">${esc(C.remove)}</button>` : ''}
    </div>`).join('')}</div>`;
  }

  function hostControls() {
    if (!state.private.isHost || ['LOBBY', 'ROLE_REVEAL', 'TASK_REVIEW', 'FINISHED'].includes(state.public.phase)) return '';
    const actions = state.private.actions;
    return `<div class="host-controls">
      ${actions.canPause ? `<button class="btn secondary small" type="button" data-action="pause">${esc(C.pause)}</button>` : ''}
      ${actions.canResume ? `<button class="btn warning small" type="button" data-action="resume">${esc(C.resume)}</button>` : ''}
      <button class="btn danger small" type="button" data-command="cancelGame">${esc(C.cancelGame)}</button>
    </div>`;
  }

  function meetingPlan() {
    if (!state.public.meetingSlots) return '';
    const row = (id, label) => {
      const slot = state.public.meetingSlots[id];
      const status = slot.used ? C.used : slot.advanced ? C.advanced : C.upcoming;
      return `<div class="meeting-slot"><strong>${esc(label)}</strong><span>${esc(status)}</span></div>`;
    };
    return `<section class="panel"><div class="panel-header"><h3>${esc(C.meetingPlan)}</h3></div><div class="meeting-grid">${row('after2', C.meetingAfter2)}${row('after4', C.meetingAfter4)}</div>
      ${state.public.bell && state.public.bell.used ? `<p class="notice warning">${esc(C.bellUsed(state.public.bell.triggeredByName, state.public.bell.triggeredRound))}</p>` : ''}
    </section>`;
  }

  function roleCard() {
    const role = state.private.role;
    if (!role) return '';
    const isWolf = role === 'WOLF';
    const team = isWolf ? `<div><strong>${esc(C.wolfTeam)}</strong><div class="team-list">${state.private.wolfTeam.map((member) => `<span class="team-chip">${esc(member.name)}</span>`).join('')}</div></div>` : '';
    return `<section class="panel role-card">
      <div class="eyebrow">${esc(C.roleReveal)}</div>
      <div class="role-title ${isWolf ? 'wolf' : 'villager'}">${esc(isWolf ? C.wolf : C.villager)}</div>
      <p class="muted">${esc(isWolf ? C.wolfHelp : C.villagerHelp)}</p>
      ${team}
      ${isWolf ? taskCards() : ''}
    </section>`;
  }

  function taskCards() {
    if (!state.private.tasks) return '';
    const canEditNote = state.private.actions.canEditTaskNote;
    const canClaim = state.private.actions.canClaimTasks;
    const wolfIds = new Set((state.private.wolfTeam || []).map((member) => member.id));
    const villagers = state.public.players.filter((player) => !wolfIds.has(player.id));
    return `<details class="sensitive" data-detail="wolf-tasks">
      <summary><span>${esc(C.sensitive)} · ${esc(C.tasks)}</span><span>${esc(C.sensitiveHint)}</span></summary>
      <div class="sensitive-body">
        <p class="notice danger">${esc(C.taskHumanRule)}</p>
        ${state.private.tasks.map((task) => {
          const noteDraft = taskDrafts[task.id] || {};
          const claimDraft = taskDrafts[`${task.id}-claim`] || {};
          const note = noteDraft.note == null ? task.note : noteDraft.note;
          const summary = claimDraft.summary || '';
          const round = claimDraft.round || String(state.public.talk ? state.public.talk.round : 1);
          const targetDraft = new Set(claimDraft.targets || []);
          const claim = task.claim;
          return `<article class="task-card">
            <div class="task-title-row"><div class="task-title">${esc(task.id)} · ${esc(task.title)}</div><span class="mini-chip${claim ? ' ready' : ''}">${esc(claim ? C.taskStatusClaimed : C.taskStatusOpen)}</span></div>
            <p class="task-condition">${esc(task.condition)}</p>
            ${claim ? `<div class="claim-box"><strong>${esc(C.taskStatusClaimed)}</strong><br>${esc(claim.targetNames.join('、'))} · 第 ${claim.round} 輪<br>${esc(claim.summary)}</div>` : ''}
            ${canEditNote ? `<form class="task-form" data-task-form="${esc(task.id)}" data-form="taskNote">
              <input type="hidden" name="taskId" value="${esc(task.id)}">
              <label class="field"><span>${esc(C.taskNote)}</span><textarea name="note" maxlength="240" placeholder="${esc(C.notePlaceholder)}">${esc(note)}</textarea></label>
              <button class="btn secondary small" type="submit">${esc(C.saveNote)}</button>
            </form>` : ''}
            ${canClaim ? `
            <form class="task-form" data-task-form="${esc(task.id)}-claim" data-form="taskClaim">
              <input type="hidden" name="taskId" value="${esc(task.id)}">
              <strong>${esc(C.claimTask)}</strong>
              <div class="muted">${esc(C.taskTargets)}（${task.requiredVillagers} 人）</div>
              <div class="target-grid">${villagers.map((player) => `<label class="target-check"><input type="checkbox" name="target" value="${esc(player.id)}"${targetDraft.has(player.id) ? ' checked' : ''}><span>${esc(player.name)}</span></label>`).join('')}</div>
              <label class="field"><span>${esc(C.taskRound)}</span><select name="round">${options(1, state.public.talk.round, Number(round))}</select></label>
              <label class="field"><span>${esc(C.taskSummary)}</span><textarea name="summary" maxlength="240" placeholder="${esc(C.summaryPlaceholder)}">${esc(summary)}</textarea></label>
              <div class="button-row"><button class="btn small" type="submit">${esc(C.submitClaim)}</button>${claim ? `<button class="btn ghost small" type="button" data-action="cancelClaim" data-task-id="${esc(task.id)}">${esc(C.cancelClaim)}</button>` : ''}</div>
            </form>` : ''}
          </article>`;
        }).join('')}
      </div>
    </details>`;
  }

  function renderLobby() {
    const settings = lobbyDraft || state.public.settings;
    const current = state.public.players.length;
    const allReady = state.public.players.every((player) => player.ready);
    const canStart = current === state.public.settings.playerCount && allReady;
    const ready = playerById(state.private.playerId).ready;
    const questions = state.public.scenario.rounds || [];
    return `${roomBar()}
      <div class="game-grid">
        <div class="main-stack">
          <section class="panel"><div class="panel-header"><div><h2>${esc(C.lobby)}</h2><p>${esc(C.lobbyHelp)}</p></div><span class="phase-chip">${esc(C.waitingForPlayers(current, state.public.settings.playerCount))}</span></div>
            ${playerRows(state.private.isHost)}
            <div class="button-row" style="margin-top:14px">
              <button class="btn ${ready ? 'ghost' : ''}" type="button" data-action="ready" data-ready="${ready ? 'false' : 'true'}">${esc(ready ? C.cancelReady : C.setReady)}</button>
              ${state.private.isHost ? `<button class="btn warning" type="button" data-action="startGame"${canStart ? '' : ' disabled'}>${esc(C.startGame)}</button>` : ''}
            </div>
          </section>
          <details class="panel" data-detail="question-preview"><summary><strong>${esc(C.previewQuestions)}</strong></summary><ol>${questions.map((round) => `<li style="margin:10px 0;line-height:1.5">${esc(round.question)}</li>`).join('')}</ol></details>
        </div>
        <div class="side-stack">
          ${state.private.isHost ? `<form class="panel" id="settings-form"><div class="panel-header"><h3>${esc(C.saveSettings)}</h3></div>
            <div class="inline-fields"><label class="field"><span>${esc(C.playerCount)}</span><select name="playerCount">${options(3, 12, settings.playerCount, { 6: C.recommended, 7: C.recommended, 8: C.recommended })}</select></label><label class="field"><span>${esc(C.wolfCount)}</span><select name="wolfCount">${options(1, Math.max(1, Number(settings.playerCount) - 2), settings.wolfCount)}</select></label></div>
            <label class="check-line"><input name="bellEnabled" type="checkbox"${settings.bellEnabled ? ' checked' : ''}><span>${esc(C.bellSetting)}</span></label>
            <div class="inline-fields"><label class="field"><span>${esc(C.talkSeconds)}</span><input name="talkSeconds" type="number" min="20" max="180" value="${esc(settings.talkSeconds)}"></label><label class="field"><span>${esc(C.meetingSeconds)}</span><input name="meetingSeconds" type="number" min="10" max="60" value="${esc(settings.meetingSeconds)}"></label></div>
            <label class="field"><span>${esc(C.voteSeconds)}</span><input name="voteSeconds" type="number" min="15" max="90" value="${esc(settings.voteSeconds)}"></label>
            <button class="btn secondary" type="submit">${esc(C.saveSettings)}</button>
          </form>` : `<section class="panel"><h3>${esc(C.room)}</h3><p class="muted">${esc(C.waitingForPlayers(current, state.public.settings.playerCount))}</p></section>`}
        </div>
      </div>`;
  }

  function renderRoleReveal() {
    return `${roomBar()}<div class="game-grid"><div class="main-stack">${roleCard()}
      <section class="panel"><div class="panel-header"><div><h2>${esc(C.roleReveal)}</h2><p>${esc(C.roleRevealHelp)}</p></div></div>
        <div class="player-list">${state.public.players.map((player) => `<div class="player-row"><span class="name">${esc(player.name)}</span><span class="mini-chip${player.roleAcknowledged ? ' ready' : ''}">${esc(player.roleAcknowledged ? C.acknowledged : C.waiting)}</span></div>`).join('')}</div>
        <div class="button-row" style="margin-top:14px">${state.private.actions.canAckRole ? `<button class="btn" type="button" data-action="ackRole">${esc(C.acknowledgeRole)}</button>` : `<span class="notice">${esc(C.acknowledged)}</span>`}${state.private.actions.canBeginTalk ? `<button class="btn ghost" type="button" data-action="beginTalk">${esc(C.forceBegin)}</button>` : ''}</div>
      </section></div><div class="side-stack"><section class="panel"><h3>${esc(state.public.scenario.title)}</h3><p class="muted">${esc(C.externalVoiceNote)}</p></section></div></div>`;
  }

  function orderList(order, completed, currentId) {
    return `<div class="order-list">${order.map((id, index) => `<span class="order-chip${completed[id] ? ' done' : id === currentId ? ' current' : ''}"><span>${index + 1}</span>${esc(playerName(id))}</span>`).join('')}</div>`;
  }

  function timer(deadline) {
    if (state.public.paused) return `<div class="timer">${esc(C.paused)}</div>`;
    return `<div class="timer" data-deadline="${Number(deadline || 0)}">--</div>`;
  }

  function roundTrack(round) {
    return `<div class="round-track">${Array.from({ length: 6 }, (_, index) => `<span class="round-step${index + 1 < round ? ' done' : index + 1 === round ? ' current' : ''}"></span>`).join('')}</div>`;
  }

  function lastVoteNotice() {
    const record = state.public.lastVoteResult;
    if (!record || record.type !== 'MIDGAME') return '';
    return `<div class="notice warning"><strong>${esc(C.nomination)}：</strong> ${record.nominees.length ? record.nominees.map(playerName).map(esc).join('、') : esc(C.noNomination)}<br>${record.nominees.length ? esc(C.notExact) : ''}</div>`;
  }

  function talkControls() {
    const actions = state.private.actions;
    return `<div class="button-row">
      ${actions.canEndTurn ? `<button class="btn" type="button" data-action="endTurn">${esc(C.endMyTurn)}</button>` : ''}
      ${actions.canHostEndTurn ? `<button class="btn secondary" type="button" data-action="endTurn">${esc(C.hostSkip)}</button>` : ''}
      ${actions.canRingBell ? `<button class="btn warning" type="button" data-action="ringBell">${esc(C.bell)}</button>` : ''}
      ${actions.canFollowUp ? `<button class="btn secondary" type="button" data-action="followUp">${esc(C.followUp)}</button>` : ''}
    </div>`;
  }

  function renderTalk() {
    const talk = state.public.talk;
    const speaker = playerById(talk.currentSpeakerId);
    const isMe = talk.currentSpeakerId === state.private.playerId;
    return `${roomBar()}${roundTrack(talk.round)}<div class="game-grid"><div class="main-stack">${lastVoteNotice()}
      <section class="question-card"><div class="scenario">${esc(C.roundOf(talk.round))} · ${esc(state.public.scenario.title)}</div><h2 class="question">${esc(talk.question)}</h2>${talk.followUp ? `<div class="follow-up"><strong>${esc(C.followUpLabel)}</strong><br>${esc(talk.followUp)}</div>` : ''}
        <div class="speaker-hero"><div class="speaker-icon">${isMe ? '👋' : '🎙️'}</div><div><div class="speaker-label">${esc(isMe ? C.yourTurn : C.currentSpeaker)}</div><div class="speaker-name">${esc(speaker.name)}</div></div>${timer(state.public.deadlineAt)}</div>
      </section>
      <section class="panel"><div class="panel-header"><h3>${esc(C.speakerOrder)}</h3>${hostControls()}</div>${orderList(talk.order, talk.completed, talk.currentSpeakerId)}<div style="margin-top:16px">${talkControls()}</div><p class="muted">${esc(C.externalVoiceNote)}</p></section>
    </div><aside class="side-stack">${roleCard()}${meetingPlan()}</aside></div>`;
  }

  function renderMeeting() {
    const meeting = state.public.meeting;
    const speaker = playerById(meeting.currentSpeakerId);
    const isMe = meeting.currentSpeakerId === state.private.playerId;
    return `${roomBar()}<div class="game-grid"><div class="main-stack"><section class="panel"><div class="panel-header"><div><h2>${esc(C.meetingDiscuss)}</h2><p>${esc(C.meetingWarning)}</p></div>${hostControls()}</div>
      <div class="speaker-hero"><div class="speaker-icon">${isMe ? '👋' : '🗣️'}</div><div><div class="speaker-label">${esc(isMe ? C.yourTurn : C.currentSpeaker)}</div><div class="speaker-name">${esc(speaker.name)}</div></div>${timer(state.public.deadlineAt)}</div>
      <div style="margin-top:16px">${orderList(meeting.order, meeting.completed, meeting.currentSpeakerId)}</div>
      <div style="margin-top:16px">${talkControls()}</div>
    </section></div><aside class="side-stack">${roleCard()}${meetingPlan()}</aside></div>`;
  }

  function submissionStatus() {
    const submitted = new Set(state.public.voting.submittedPlayerIds);
    return `<div class="submission-grid">${state.public.players.map((player) => `<span class="mini-chip${submitted.has(player.id) ? ' ready' : ''}">${esc(player.name)} · ${esc(submitted.has(player.id) ? C.submitted : C.notSubmitted)}</span>`).join('')}</div>`;
  }

  function renderVoting() {
    const voting = state.public.voting;
    const mineLocked = state.private.myVoteSubmitted;
    const required = voting.requiredSelections;
    const title = voting.type === 'FINAL' ? C.finalVoting : C.midVoting;
    return `${roomBar()}<div class="game-grid"><div class="main-stack"><section class="panel"><div class="panel-header"><div><h2>${esc(title)}</h2><p>${esc(C.selectExactly(required))}</p></div>${timer(state.public.deadlineAt)}</div>
      <p class="notice warning">${esc(C.tieRule)}</p>
      ${mineLocked ? `<div class="notice">${esc(C.voteLocked)}</div>` : `<form id="vote-form"><div class="vote-grid">${state.public.players.map((player) => `<div class="vote-choice"><input id="vote-${esc(player.id)}" name="vote" value="${esc(player.id)}" type="checkbox"${voteDraft.has(player.id) ? ' checked' : ''}><label for="vote-${esc(player.id)}">${esc(player.name)}${player.id === state.private.playerId ? `（${esc(C.me)}）` : ''}</label></div>`).join('')}</div><div class="button-row"><span id="vote-count" class="muted">${esc(C.selectedCount(voteDraft.size, required))}</span><button class="btn" id="vote-submit" type="submit"${voteDraft.size === required ? '' : ' disabled'}>${esc(C.submitVote)}</button></div></form>`}
    </section><section class="panel"><div class="panel-header"><h3>${esc(C.submitted)}</h3>${hostControls()}</div>${submissionStatus()}</section></div><aside class="side-stack">${roleCard()}${meetingPlan()}</aside></div>`;
  }

  function revealedRoles() {
    const reveal = state.public.reveal;
    return `<div class="role-grid">${state.public.players.map((player) => {
      const role = reveal.roles[player.id];
      return `<div class="reveal-player${role === 'WOLF' ? ' wolf' : ''}"><strong>${esc(player.name)}</strong><span>${esc(role === 'WOLF' ? C.wolf : C.villager)}</span></div>`;
    }).join('')}</div>`;
  }

  function publicTaskCards(reviewMode) {
    return state.public.reveal.tasks.map((task) => {
      const status = !task.claim ? C.unclaimed : !task.review ? C.pendingReview : task.review.valid ? C.valid : C.invalid;
      return `<article class="task-card"><div class="task-title-row"><div class="task-title">${esc(task.id)} · ${esc(task.title)}</div><span class="mini-chip${task.review && task.review.valid ? ' ready' : ''}">${esc(status)}</span></div><p class="task-condition">${esc(task.condition)}</p>
        ${task.claim ? `<div class="claim-box">${esc(task.claim.targetNames.join('、'))} · 第 ${task.claim.round} 輪<br>${esc(task.claim.summary)}</div>` : `<p class="muted">${esc(C.unclaimed)}</p>`}
        ${reviewMode && state.private.actions.canReviewTasks && task.claim && !task.review ? `<div class="button-row" style="margin-top:12px"><button class="btn small" type="button" data-action="reviewTask" data-task-id="${esc(task.id)}" data-valid="true">${esc(C.valid)}</button><button class="btn danger small" type="button" data-action="reviewTask" data-task-id="${esc(task.id)}" data-valid="false">${esc(C.invalid)}</button></div>` : ''}
      </article>`;
    }).join('');
  }

  function renderTaskReview() {
    const allDone = state.public.reveal.tasks.every((task) => task.review && typeof task.review.valid === 'boolean');
    return `${roomBar()}<div class="main-stack"><section class="panel"><div class="panel-header"><div><h2>${esc(C.taskReview)}</h2><p>${esc(C.taskReviewHelp)}</p></div></div>${revealedRoles()}</section><section class="panel"><div class="panel-header"><h3>${esc(C.tasks)}</h3></div>${publicTaskCards(true)}${allDone && state.private.actions.canReviewTasks ? `<div class="button-row" style="margin-top:14px"><button class="btn" type="button" data-action="finalizeReview">${esc(C.finalizeReview)}</button></div>` : ''}</section></div>`;
  }

  function voteHistory() {
    const labels = { after2: '中途指認 1', after4: '中途指認 2', final: C.finalVoting };
    return `<div class="history-list">${state.public.voteHistory.map((record) => `<div class="history-item"><strong>${esc(labels[record.id] || record.id)}</strong><div>${record.nominees.length ? record.nominees.map(playerName).map(esc).join('、') : esc(C.noNomination)}</div></div>`).join('')}</div>`;
  }

  function renderFinished() {
    const result = state.public.result;
    const title = result.outcome === 'VILLAGERS' ? C.villagersWin : result.outcome === 'WOLVES' ? C.wolvesWin : result.outcome === 'DRAW' ? C.draw : C.cancelled;
    return `${roomBar()}<div class="main-stack"><section class="result-hero"><div class="eyebrow">${esc(C.finalResult)}</div><h1>${esc(title)}</h1><p>${esc(C.resultReason[result.reason] || '')}</p>${state.private.actions.canReplay ? `<div class="button-row" style="justify-content:center;margin-top:18px"><button class="btn" type="button" data-action="replay">${esc(C.playAgain)}</button></div>` : ''}</section>
      <div class="game-grid"><div class="main-stack"><section class="panel"><div class="panel-header"><h3>${esc(C.trueWolves)}</h3></div>${revealedRoles()}</section><section class="panel"><div class="panel-header"><h3>${esc(C.voteHistory)}</h3></div>${voteHistory()}</section></div><aside class="side-stack"><section class="panel"><div class="panel-header"><div><h3>${esc(C.taskResults)}</h3><p>${esc(C.noRecording)}</p></div></div>${publicTaskCards(false)}</section></aside></div>
    </div>`;
  }

  function renderState() {
    if (!state) return;
    switch (state.public.phase) {
      case 'LOBBY': app.innerHTML = renderLobby(); break;
      case 'ROLE_REVEAL': app.innerHTML = renderRoleReveal(); break;
      case 'TALK': app.innerHTML = renderTalk(); break;
      case 'MEETING_DISCUSS': app.innerHTML = renderMeeting(); break;
      case 'VOTING': app.innerHTML = renderVoting(); break;
      case 'TASK_REVIEW': app.innerHTML = renderTaskReview(); break;
      case 'FINISHED': app.innerHTML = renderFinished(); break;
      default: app.innerHTML = `<p class="empty">${esc(C.loading)}</p>`;
    }
    paintTimers();
  }

  function paintTimers() {
    document.querySelectorAll('[data-deadline]').forEach((element) => {
      const remaining = Math.max(0, Number(element.dataset.deadline) - (Date.now() + serverOffset));
      const seconds = Math.ceil(remaining / 1000);
      element.textContent = `${seconds} ${C.seconds}`;
      element.classList.toggle('urgent', seconds <= 10);
    });
  }

  function updateCreateWolfOptions(select) {
    const form = select.form;
    const wolf = form.elements.wolfCount;
    const previous = Number(wolf.value) || 2;
    wolf.innerHTML = options(1, Math.max(1, Number(select.value) - 2), Math.min(previous, Number(select.value) - 2));
  }

  app.addEventListener('click', async (event) => {
    const modeButton = event.target.closest('[data-entry-mode]');
    if (modeButton) {
      entryMode = modeButton.dataset.entryMode;
      renderEntry(roomCodeFromUrl());
      return;
    }
    const button = event.target.closest('[data-command], [data-action]');
    if (!button || button.disabled) return;
    if (button.dataset.command === 'copyInvite') {
      try { await navigator.clipboard.writeText(inviteUrl()); showToast(C.copied); }
      catch (error) { window.prompt(C.copyInvite, inviteUrl()); }
      return;
    }
    if (button.dataset.command === 'cancelGame') {
      if (window.confirm(C.cancelConfirm)) action('cancelGame');
      return;
    }
    const actionName = button.dataset.action;
    const payload = {};
    if (actionName === 'ready') payload.ready = button.dataset.ready === 'true';
    if (actionName === 'removePlayer') payload.playerId = button.dataset.playerId;
    if (actionName === 'cancelClaim') {
      payload.taskId = button.dataset.taskId;
      delete taskDrafts[`${payload.taskId}-claim`];
    }
    if (actionName === 'reviewTask') {
      payload.taskId = button.dataset.taskId;
      payload.valid = button.dataset.valid === 'true';
    }
    action(actionName, payload);
  });

  app.addEventListener('change', (event) => {
    if (event.target.matches('#create-form [name="playerCount"]')) updateCreateWolfOptions(event.target);
    if (event.target.matches('#settings-form [name]')) {
      const form = event.target.form;
      lobbyDraft = {
        playerCount: Number(form.elements.playerCount.value),
        wolfCount: Number(form.elements.wolfCount.value),
        bellEnabled: form.elements.bellEnabled.checked,
        talkSeconds: Number(form.elements.talkSeconds.value),
        meetingSeconds: Number(form.elements.meetingSeconds.value),
        voteSeconds: Number(form.elements.voteSeconds.value),
      };
      if (event.target.name === 'playerCount') {
        const wolf = form.elements.wolfCount;
        wolf.innerHTML = options(1, Math.max(1, lobbyDraft.playerCount - 2), Math.min(lobbyDraft.wolfCount, lobbyDraft.playerCount - 2));
        lobbyDraft.wolfCount = Number(wolf.value);
      }
    }
    if (event.target.matches('#vote-form [name="vote"]')) {
      if (event.target.checked) voteDraft.add(event.target.value);
      else voteDraft.delete(event.target.value);
      const required = state.public.voting.requiredSelections;
      if (voteDraft.size > required) {
        voteDraft.delete(event.target.value);
        event.target.checked = false;
        showToast(C.selectExactly(required));
      }
      const count = document.getElementById('vote-count');
      const submit = document.getElementById('vote-submit');
      if (count) count.textContent = C.selectedCount(voteDraft.size, required);
      if (submit) submit.disabled = voteDraft.size !== required;
    }
  });

  app.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'create-form') {
      if (requestRunning) return;
      requestRunning = true;
      try {
        const response = await apiRequest('POST', {
          action: 'create',
          name: form.elements.name.value,
          settings: {
            playerCount: Number(form.elements.playerCount.value),
            wolfCount: Number(form.elements.wolfCount.value),
            bellEnabled: form.elements.bellEnabled.checked,
            talkSeconds: Number(form.elements.talkSeconds.value),
            meetingSeconds: Number(form.elements.meetingSeconds.value),
            voteSeconds: Number(form.elements.voteSeconds.value),
          },
        });
        saveSession(response.state.public.code, response.token);
        applyState(response.state, true);
        startSync();
      } catch (error) { showToast(errorMessage(error.code)); }
      finally { requestRunning = false; }
      return;
    }
    if (form.id === 'join-form') {
      if (requestRunning) return;
      requestRunning = true;
      try {
        const room = form.elements.room.value.trim().toUpperCase();
        const response = await apiRequest('POST', { action: 'join', room, name: form.elements.name.value });
        saveSession(response.state.public.code, response.token);
        applyState(response.state, true);
        startSync();
      } catch (error) { showToast(errorMessage(error.code)); }
      finally { requestRunning = false; }
      return;
    }
    if (form.id === 'settings-form') {
      const settings = {
        playerCount: Number(form.elements.playerCount.value),
        wolfCount: Number(form.elements.wolfCount.value),
        bellEnabled: form.elements.bellEnabled.checked,
        talkSeconds: Number(form.elements.talkSeconds.value),
        meetingSeconds: Number(form.elements.meetingSeconds.value),
        voteSeconds: Number(form.elements.voteSeconds.value),
      };
      lobbyDraft = null;
      action('settings', { settings });
      return;
    }
    if (form.dataset.form === 'taskNote') {
      const taskId = form.elements.taskId.value;
      if (await action('taskNote', { taskId, note: form.elements.note.value })) {
        delete taskDrafts[taskId];
        renderState();
      }
      return;
    }
    if (form.dataset.form === 'taskClaim') {
      const taskId = form.elements.taskId.value;
      const saved = await action('claimTask', {
        taskId,
        targetIds: Array.from(form.querySelectorAll('[name="target"]:checked')).map((input) => input.value),
        round: Number(form.elements.round.value),
        summary: form.elements.summary.value,
      });
      if (saved) {
        delete taskDrafts[`${taskId}-claim`];
        renderState();
      }
      return;
    }
    if (form.id === 'vote-form') {
      if (voteDraft.size !== state.public.voting.requiredSelections) { showToast(C.selectExactly(state.public.voting.requiredSelections)); return; }
      action('submitVote', { selections: Array.from(voteDraft) });
    }
  });

  setInterval(paintTimers, 250);

  async function boot() {
    const code = roomCodeFromUrl();
    let token = null;
    if (code) {
      try { token = localStorage.getItem(storageKey(code)); } catch (error) {}
    }
    if (!code || !token) {
      renderEntry(code);
      return;
    }
    session = { room: code, token };
    app.innerHTML = `<p class="empty">${esc(C.loading)}</p>`;
    setSync('connecting');
    try {
      const response = await apiRequest('GET');
      applyState(response.state, true);
      startSync();
    } catch (error) {
      clearSession();
      entryMode = 'join';
      renderEntry(code);
      showToast(errorMessage(error.code));
    }
  }

  boot();
}());
