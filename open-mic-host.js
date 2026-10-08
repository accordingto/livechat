(() => {
  'use strict';
  const byId = id => document.getElementById('om-' + id);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const roster = ['Amy', 'Kevin', 'Jason', 'Willy'].map((name, i) => ({ playerNum: i + 1, name, active: true }));
  let state = null, sync = null, game = null, busy = false, closed = false;
  let status = demo ? 'ready' : 'connecting', error = '', roomCode = null;
  const now = () => sync ? sync.now() : Date.now();
  const canControl = () => !closed && !busy && (demo || !!(sync?.connected && (sync?.own || sync?.doc?.executor?.v === 1) && !sync?.suspended));
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const copy = {
    connecting: ['Connecting to your room…', '正在連線房間…'],
    offline: ['Connection lost. Reconnect to continue.', '連線中斷，重新連線後即可繼續。'],
    other_host: ['This game is controlled by another host tab.', '另一個主持分頁正在控制此遊戲。'],
    switched: ['The room changed games. Start a new session to return here.', '房間已切換遊戲，按開始即可開啟新的一局。'],
    roomChanged: ['The room has changed. Return to the Hub.', '房間已更換，請返回主選單。'],
    noFirebase: ['Room connection is unavailable.', '目前無法連線房間。'],
    error: ['Something went wrong. Please try again.', '操作未完成，請再試一次。'],
    setupNeeded: ['Set up your room and player links in the Hub first.', '請先到主選單設定房間與玩家連結。'],
  };
  const text = key => copy[key] ? copy[key][I18N.lang === 'zh' ? 1 : 0] : '';
  function render() {
    I18N.applyStatic(document);
    byId('status').textContent = text(status);
    byId('error').textContent = error;
    byId('setup-needed').hidden = status !== 'setupNeeded';
    byId('start-panel').hidden = status === 'setupNeeded' || (!!state && status !== 'switched');
    byId('start').disabled = busy || closed || !(demo || (sync?.connected && (sync?.own || sync?.doc?.executor?.v === 1)));
    byId('game').hidden = !state || status === 'switched';
    document.body.classList.toggle('om-playing', !!state && status !== 'switched');
    byId('room-label').textContent = demo ? (I18N.lang === 'zh' ? '單機試玩' : 'Local demo') : roomCode ? 'Room ' + roomCode : '';
    if (state && status !== 'switched') {
      const actor = demo ? Number(byId('demo-view')?.value || 0) : 0;
      if (!game || gameActor !== actor) {
        game?.destroy(); gameActor = actor;
        game = new OPEN_MIC_UI.Game(byId('game'), { actor, now, canControl, send: command });
      }
      const payload = OPEN_MIC_ENGINE.view(state, actor, now());
      if (!demo && payload.openmic) payload.openmic.hostLiveUntil = sync?.doc?.leaseUntil || 0;
      game.update(payload);
    }
  }
  let gameActor = 0;
  async function command(type, extra = {}) {
    if (!state || !canControl()) throw new Error('offline');
    busy = true; error = '';
    try {
      if (demo) {
        const input = { ...extra, type, actor: gameActor, id: OPEN_MIC_SYNC.uid(), sessionId: state.sessionId, turnId: state.turnId, now: now(), seed: seed() };
        state = OPEN_MIC_ENGINE.apply(state, input);
        const reply = state.replies?.[gameActor];
        if (reply?.id === input.id && reply.error) throw new Error(reply.error);
      } else await sync.command(type, extra);
    } finally { busy = false; render(); }
  }
  async function start() {
    if (busy || closed || !(demo || (sync?.connected && (sync?.own || sync?.doc?.executor?.v === 1)))) return;
    busy = true; error = '';
    try {
      if (demo) state = OPEN_MIC_ENGINE.create({ id: OPEN_MIC_SYNC.uid(), roster, now: now(), seed: seed(), singingDuration: 35 });
      else await sync.start({ singingDuration: 35 });
    } catch (e) { error = text(e.message) || text('error'); }
    finally { busy = false; render(); }
  }
  byId('start').addEventListener('click', start);
  if (demo) {
    byId('demo-bar').hidden = false;
    byId('demo-link').hidden = true;
    byId('demo-view').innerHTML = '<option value="0">Host</option>' + roster.map(p => `<option value="${p.playerNum}">${p.name}</option>`).join('');
    byId('demo-view').addEventListener('change', render);
  } else {
    let saved = null;
    try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (_) {}
    if (!saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) status = 'setupNeeded';
    else if (!ROOM.enabled) status = 'noFirebase';
    else {
      ROOM.init({ mount: 'room-mount', hideSetup: true, accent: '#b5a0ff', counts: [2,3,4,5,6,7,8,9], defaultCount: 4 });
      sync = new OPEN_MIC_SYNC.Host({ room: ROOM, db: firebase.database(),
        onChange: next => { state = next; render(); },
        onStatus: next => { status = next; render(); },
      });
      sync.connect();
    }
  }
  render(); I18N.onChange(render);
  const timer = setInterval(() => game?.paint(), 250);
  function close() { if (closed) return; closed = true; clearInterval(timer); sync?.close(); game?.destroy(); game = null; }
  window.addEventListener('storage', event => { if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) { close(); status = 'roomChanged'; render(); } });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
