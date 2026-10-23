/* CARD_TABLE_UI — presentation shared by WORD LIMIT THEATER and ROOM SURVEY.
 *
 *  translator(ns, dict)  bilingual strings, falling back to the common ones below
 *  paintTimers(root,now) live countdowns, rings, flashes and cool-downs
 *  Controls              the folded "Table controls" panel (cards and host page)
 *  Card                  base class of a player card that runs the table
 *  host(spec)            the optional shared host page (setup, stage, demo)
 *
 * Everything here only reads ENGINE.view(): a card gets its own `me` block,
 * the shared screen gets the public projection.
 */
var CARD_TABLE_UI = (() => {
  'use strict';
  const COMMON = {
    controls: ['牌桌控制', 'Table controls'],
    controlsSummary: ['暫停、加時、玩家、下一輪設定', 'Pause, add time, players, next-round settings'],
    hostControls: ['主持控制', 'Host controls'],
    clockTools: ['時間', 'Clock'],
    pause: ['暫停', 'Pause'], resume: ['繼續', 'Resume'],
    playerTools: ['玩家', 'Players'],
    rosterHint: ['有人離開通話時，先讓他休息；回來後再按「回來玩」。', 'If someone leaves the call, sit them out. Tap “Back in” when they return.'],
    playing: ['遊戲中', 'Playing'], sittingOut: ['休息中', 'Sitting out'],
    onlineSeat: ['在線', 'Online'], offlineSeat: ['離線', 'Offline'],
    sitOut: ['先休息', 'Sit out'], sitOutConfirm: ['再按一次讓 {name} 休息', 'Tap again to sit {name} out'], rejoin: ['回來玩', 'Back in'],
    gameTools: ['這一局', 'This game'],
    voidRound: ['取消這一輪', 'Cancel this round'], voidConfirm: ['再按一次取消這一輪', 'Tap again to cancel the round'],
    restart: ['重新開始', 'Restart'], restartConfirm: ['再按一次：分數歸零重來', 'Tap again: scores reset to 0'],
    stop: ['結束遊戲', 'End the game'], stopConfirm: ['再按一次結束遊戲', 'Tap again to end the game'],
    tapAgain: ['再按一次確認', 'Tap again to confirm'],
    nextSettings: ['下一輪的設定', 'Settings for the next round'], saveSettings: ['儲存設定', 'Save settings'],
    saved: ['已儲存，下一輪開始生效。', 'Saved. It applies from the next round.'],
    you: ['你', 'you'], player: ['玩家 {n}', 'Player {n}'],
    pt: ['{n} 分', '{n} pt'], pts: ['{n} 分', '{n} pts'],
    scores: ['分數', 'Scores'],
    paused: ['暫停中', 'Paused'], pausedHint: ['任何玩家都能在牌桌控制按「繼續」。', 'Anyone can resume it from Table controls.'],
    offline: ['連線中斷，正在重新連線…', 'Connection lost. Reconnecting…'],
    stale_turn: ['畫面剛更新，請再按一次。', 'The table just moved on. Try again.'],
    not_available: ['現在不能這樣做。', 'That isn’t available right now.'],
    not_enough_players: ['在場的玩家不夠，請先讓人回來玩。', 'Not enough players are in. Bring someone back first.'],
    invalid_options: ['設定有誤，請重新選擇。', 'Those settings don’t work. Choose again.'],
    invalid_roster: ['房間名單有誤，請回主選單重新設定。', 'The room list is invalid. Set up the room again in the Hub.'],
    cooldown: ['等幾秒再按。', 'Wait a few seconds, then try again.'],
    empty: ['先寫一點內容。', 'Write something first.'],
    error: ['出了點問題，請再試一次。', 'Something went wrong. Try again.'],
    connecting: ['連線中…', 'Connecting…'],
    noFirebase: ['這個網站還沒設定連線，無法使用玩家卡。', 'This site isn’t connected yet, so player cards can’t be used.'],
    setupNeededText: ['先在主選單設定房間和玩家連結。', 'Set up the room and player links in the Hub first.'],
    setUpRoom: ['設定房間與玩家', 'Set up the room'],
    switched: ['有些玩家卡正在顯示別的遊戲。', 'Some player cards are showing another game.'],
    switchedHint: ['可以把大家帶回這一局繼續，或在下面開新的一局。', 'Bring everyone back to this game, or start a new one below.'],
    continueCards: ['把大家的卡片帶回這一局', 'Bring every card back to this game'],
    rosterChanged: ['房間人數變了，請開新的一局。', 'The room size changed. Start a new game.'],
    roomChanged: ['主選單換了房間，請重新整理這一頁。', 'The Hub switched rooms. Reload this page.'],
    tableEmpty: ['這一局還沒開始，或已經結束。', 'This game hasn’t started yet, or it has ended.'],
    finished: ['遊戲結束', 'Game over'], stoppedEarly: ['這一局提前結束了。', 'This game ended early.'],
    winner: ['冠軍', 'Winner'], winners: ['並列冠軍', 'Winners'],
    newGame: ['開新的一局', 'Start a new game'], anyoneCanRestart: ['任何玩家都能開新的一局。', 'Any player can start a new game.'],
    imBack: ['我回來了', 'I’m back'], sittingOutCard: ['你目前休息中', 'You’re sitting out'],
    sittingOutHint: ['回來之後，從下一輪開始加入。', 'Once you’re back, you join from the next round.'],
    hostView: ['分享畫面', 'Shared screen'],
    demo: ['一台裝置的試玩模式', 'One-device demo'], demoView: ['切換畫面', 'Switch view'],
    liveLink: ['改用我的房間', 'Use my room'], demoLink: ['先用一台裝置試玩', 'Try it on one device'],
    hostOptional: ['開始之後這頁可以關掉：計時和控制都在每個人的玩家卡上。', 'Once it starts, you can close this page. The clock and the controls run on everyone’s cards.'],
    playersNeeded: ['這個遊戲需要 {min}–{max} 人，目前房間有 {n} 人。', 'This game needs {min}–{max} players. The room has {n}.'],
    room: ['房間 {code}', 'Room {code}'],
    close: ['關閉', 'Close'],
    rules: ['怎麼玩', 'How to play'],
    nextRound: ['下一輪', 'Next round'], playAgain: ['再玩一局', 'Play again'], changeSettings: ['修改設定', 'Change settings'],
    roundN: ['第 {n} 輪', 'Round {n}'],
    lastRounds: ['前幾輪', 'Earlier rounds'],
  };
  const register = (ns, dict) => {
    if (typeof I18N === 'undefined') return;
    I18N.registerDict(ns, Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, { zh: v[0], en: v[1] }])));
  };
  register('ct', COMMON);
  const lang = () => typeof I18N !== 'undefined' ? I18N.lang : 'en';
  const fill = (raw, vars) => String(raw).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  function translator(ns, dict) {
    register(ns, dict);
    const t = (key, vars = {}) => {
      const mine = Object.prototype.hasOwnProperty.call(dict, key);
      if (typeof I18N !== 'undefined') return fill(I18N.t(mine ? ns : 'ct', key), vars);
      const entry = mine ? dict[key] : COMMON[key];
      return fill(entry ? entry[1] : key, vars);
    };
    t.dict = Object.assign({}, COMMON, dict);
    return t;
  }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const obj = value => value && typeof value === 'object' ? value : {};
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const seatsOf = view => list(view?.roster).slice().sort((a, b) => a.playerNum - b.playerNum);
  const errorKey = code => ['stale_turn', 'not_available', 'not_enough_players', 'invalid_options', 'invalid_roster', 'offline', 'cooldown', 'empty'].includes(code) ? code : 'error';
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  // Pick the language half of a bilingual content item.
  const pick = item => item ? (lang() === 'zh' ? item.zh || item.en : item.en || item.zh) : '';

  // ── live clocks: one pass paints every countdown, ring, flash and cool-down ──
  function paintTimers(root, now) {
    if (!root?.querySelectorAll) return;
    for (const el of root.querySelectorAll('[data-ct-deadline]')) {
      const left = Number(el.dataset.ctDeadline) - now;
      const text = el.dataset.ctFormat === 'seconds' ? String(Math.max(0, Math.ceil(left / 1000))) : clock(left);
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle('is-low', left > 0 && left <= (Number(el.dataset.ctLow) || 30000));
      const ring = el.closest('[data-ct-ring]');
      if (ring && el.dataset.ctTotal) ring.style.setProperty('--ct-progress', String(Math.max(0, Math.min(1, left / Number(el.dataset.ctTotal)))));
    }
    for (const el of root.querySelectorAll('[data-ct-until]')) el.classList.toggle('is-live', now < Number(el.dataset.ctUntil));
    for (const el of root.querySelectorAll('[data-ct-ready-at]')) {
      const left = Number(el.dataset.ctReadyAt) - now, cooling = left > 0;
      el.classList.toggle('is-cooling', cooling);
      el.setAttribute('aria-disabled', cooling ? 'true' : 'false');
      const label = el.querySelector('[data-ct-cooldown]');
      if (label) { const text = cooling ? `${Math.ceil(left / 1000)}s` : ''; if (label.textContent !== text) label.textContent = text; }
    }
  }
  function payloadOf(button) {
    const payload = {};
    for (const [key, value] of Object.entries(button.dataset)) if (key.startsWith('ctArg')) {
      const field = key.slice(5, 6).toLowerCase() + key.slice(6);
      payload[field] = /^-?\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value === 'none' ? null : value;
    }
    return payload;
  }

  // ── Table controls ────────────────────────────────────────────────────
  // spec: { t, timed:[...], confirmClose:[...], closeLabel(phase), extendLabel(phase)|null,
  //         nextPick: { label, chosen, auto(view), current(view) } | null,
  //         settingsForm(settings, t) → html, readSettings(root) → settings, onSettingsInput?(root, field) }
  class Controls {
    constructor(details, { spec, owner, title = 'controls' }) {
      this.element = details; this.spec = spec; this.owner = owner; this.t = spec.t; this.title = title;
      this.armed = ''; this.dirty = false; this.liveKey = ''; this.settingsKey = ''; this.note = '';
      details.classList.add('ct-controls');
      details.innerHTML = `<summary class="ct-controls-summary"><span class="ct-controls-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/></svg></span><span class="ct-controls-text"><strong data-ct-title></strong><small data-ct-sub></small></span></summary><div class="ct-controls-body"><div class="ct-controls-live" data-ct-live></div><div class="ct-controls-settings" data-ct-settings></div><p class="ct-feedback" data-ct-note role="status"></p></div>`;
      this.parts = { live: details.querySelector('[data-ct-live]'), settings: details.querySelector('[data-ct-settings]'), note: details.querySelector('[data-ct-note]') };
      this.click = event => {
        if (event.target.closest('[data-ct-save-settings]')) { this.save(); return; }
        const button = event.target.closest('[data-ct-action]');
        if (!button || button.disabled || !details.contains(button)) return;
        const confirm = button.dataset.ctConfirm;
        if (confirm && this.armed !== confirm) { this.arm(confirm); return; }
        if (confirm) this.disarm();
        this.owner.action(button.dataset.ctAction, payloadOf(button), button);
      };
      this.change = event => {
        const field = event.target.closest('[data-ct-set]'); if (!field) return;
        this.dirty = true; this.note = ''; this.parts.note.textContent = '';
        this.spec.onSettingsInput?.(this.parts.settings, field);
      };
      details.addEventListener('click', this.click);
      details.addEventListener('change', this.change);
    }
    arm(key) {
      this.armed = key; this.liveKey = ''; this.owner.refreshControls();
      clearTimeout(this.armTimer);
      this.armTimer = setTimeout(() => { if (this.armed) { this.armed = ''; this.liveKey = ''; this.owner.refreshControls(); } }, 4000);
    }
    disarm() { this.armed = ''; clearTimeout(this.armTimer); }
    async save() {
      const settings = this.spec.readSettings(this.parts.settings);
      const ok = await this.owner.action('settings', { settings });
      if (!ok) return;
      this.dirty = false; this.settingsKey = ''; this.note = this.t('saved');
      this.owner.refreshControls();
    }
    // view: the shared or own projection; me: own seat (0 on the host page).
    render(view, { me = 0, pending = false, show = true } = {}) {
      this.element.hidden = !show;
      if (!show || !view) return;
      const t = this.t;
      const title = this.element.querySelector('[data-ct-title]'), sub = this.element.querySelector('[data-ct-sub]');
      if (title.textContent !== t(this.title)) title.textContent = t(this.title);
      if (sub.textContent !== t('controlsSummary')) sub.textContent = t('controlsSummary');
      const liveKey = JSON.stringify([lang(), view.sessionId, view.stage, view.turnId, view.phase, view.roster, view.online, this.spec.nextPick?.current(view), pending, this.armed, me]);
      if (liveKey !== this.liveKey) { this.parts.live.innerHTML = this.live(view, me, pending); this.liveKey = liveKey; }
      const settingsKey = JSON.stringify([lang(), view.sessionId, view.settings]);
      if (settingsKey !== this.settingsKey && !this.dirty) { this.parts.settings.innerHTML = this.settings(view.settings || {}); this.settingsKey = settingsKey; }
      for (const field of this.element.querySelectorAll('[data-ct-set], [data-ct-save-settings]')) field.disabled = pending;
      if (this.parts.note.textContent !== this.note) this.parts.note.textContent = this.note;
    }
    reset() { this.disarm(); this.note = ''; this.liveKey = ''; }
    live(view, me, pending) {
      const t = this.t, spec = this.spec, busy = pending ? ' disabled' : '', phase = view.phase;
      const timed = spec.timed.includes(phase), online = new Set(list(view.online));
      const button = (type, label, { args = '', confirm = '', confirmLabel = '', primary = false } = {}) => {
        const armed = confirm && this.armed === confirm;
        return `<button type="button" class="ct-button ct-small${primary ? ' ct-primary' : ''}${armed ? ' is-armed' : ''}" data-ct-action="${type}"${confirm ? ` data-ct-confirm="${esc(confirm)}"` : ''}${args}${busy}>${esc(armed ? confirmLabel : label)}</button>`;
      };
      const section = (kicker, inner, hint = '') => `<section class="ct-tools"><h4 class="ct-tools-title">${esc(kicker)}</h4>${hint ? `<p class="ct-soft">${esc(hint)}</p>` : ''}${inner}</section>`;
      const parts = [];
      if (timed || phase === 'paused') {
        const row = [button(phase === 'paused' ? 'resume' : 'pause', t(phase === 'paused' ? 'resume' : 'pause'), { primary: phase === 'paused' })];
        const extend = timed ? spec.extendLabel(phase) : null;
        if (extend) row.push(button('extend', extend));
        if (timed) row.push(spec.confirmClose.includes(phase) ? button('close', spec.closeLabel(phase), { confirm: 'close:' + view.stage, confirmLabel: t('tapAgain') }) : button('close', spec.closeLabel(phase)));
        parts.push(section(t('clockTools'), `<div class="ct-tool-row">${row.join('')}</div>`));
      }
      const next = spec.nextPick ? spec.nextPick.current(view) : null;
      const players = seatsOf(view).map(p => {
        const n = p.playerNum, name = p.name || t('player', { n }), isNext = next === n;
        const status = `${t(p.active ? 'playing' : 'sittingOut')} · ${t(online.has(n) ? 'onlineSeat' : 'offlineSeat')}`;
        const nextButton = spec.nextPick && p.active && phase !== 'finished' ? button('setNext', isNext ? spec.nextPick.chosen : spec.nextPick.label, { args: ` data-ct-arg-player-num="${isNext ? 'none' : n}"` }) : '';
        const seatButton = p.active
          ? button('exclude', t('sitOut'), { args: ` data-ct-arg-player-num="${n}" data-ct-arg-active="false"`, confirm: 'out:' + n, confirmLabel: t('sitOutConfirm', { name }) })
          : button('exclude', t('rejoin'), { args: ` data-ct-arg-player-num="${n}" data-ct-arg-active="true"` });
        return `<li class="ct-tool-player${p.active ? '' : ' is-out'}${n === me ? ' is-me' : ''}"><span class="ct-tool-name"><span><i class="ct-dot${online.has(n) ? ' is-on' : ''}" aria-hidden="true"></i>${esc(name)}${n === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><small>${esc(status)}</small></span><span class="ct-tool-buttons">${nextButton}${seatButton}</span></li>`;
      }).join('');
      const nextLine = spec.nextPick ? `<p class="ct-progress-line">${esc(next != null ? spec.nextPick.line(view, next) : spec.nextPick.auto)}</p>` : '';
      parts.push(section(t('playerTools'), `${nextLine}<ul class="ct-tool-players">${players}</ul>`, t('rosterHint')));
      if (phase !== 'finished') {
        const game = [];
        if (view.roundNo > 0 && !['result', 'finished'].includes(phase)) game.push(button('void', t('voidRound'), { confirm: 'void', confirmLabel: t('voidConfirm') }));
        game.push(button('restart', t('restart'), { confirm: 'restart', confirmLabel: t('restartConfirm') }));
        game.push(button('stop', t('stop'), { confirm: 'stop', confirmLabel: t('stopConfirm') }));
        parts.push(section(t('gameTools'), `<div class="ct-tool-row">${game.join('')}</div>`));
      }
      return parts.join('');
    }
    settings(settings) {
      return `<section class="ct-tools"><h4 class="ct-tools-title">${esc(this.t('nextSettings'))}</h4>${this.spec.settingsForm(settings)}<button type="button" class="ct-button ct-small ct-primary" data-ct-save-settings>${esc(this.t('saveSettings'))}</button></section>`;
    }
    destroy() { clearTimeout(this.armTimer); this.element.removeEventListener('click', this.click); this.element.removeEventListener('change', this.change); }
  }
  // Settings form helpers shared by both games.
  const field = (key, values, label, value, text) => `<label class="ct-field"><span>${esc(label)}</span><select data-ct-set="${esc(key)}">${values.map(v => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(text(v))}</option>`).join('')}</select></label>`;
  const check = (key, value, label, hint = '') => `<label class="ct-check"><input type="checkbox" data-ct-set="${esc(key)}"${value ? ' checked' : ''}><span><span>${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</span></label>`;
  const readField = (root, key) => root.querySelector(`[data-ct-set="${key}"]`);

  // ── player card base ──────────────────────────────────────────────────
  // Subclasses implement head(data), main(data), tail(data) and may override
  // theme(view), mount(extraRegion), sync(), localKey(), ui(name, element),
  // onUpdate(previous, view) and paintExtra(now).
  class Card {
    constructor(element, { key, prefix, spec, now = () => Date.now(), connected = () => true, nameBanner = () => '', send = null } = {}) {
      this.element = element; this.key = key; this.prefix = prefix; this.spec = spec; this.t = spec.t;
      this.now = now; this.connected = connected; this.nameBanner = nameBanner; this.send = send;
      this.data = null; this.destroyed = false; this.keys = {}; this.pending = null; this.error = ''; this.armed = '';
      this.pressing = false; this.dirty = false;
      element.innerHTML = `<div class="secret-card ct-card ${prefix}-card"><div class="ct-region" data-ct-head></div><div class="ct-region" data-ct-main></div><div class="ct-region" data-ct-extra></div><div class="ct-region" data-ct-tail></div><details data-ct-controls hidden></details><p class="ct-feedback" data-ct-error role="status"></p><p class="ct-feedback" data-ct-connection role="status"></p></div>`;
      this.root = element.firstElementChild;
      this.regions = { head: this.root.querySelector('[data-ct-head]'), main: this.root.querySelector('[data-ct-main]'), extra: this.root.querySelector('[data-ct-extra]'), tail: this.root.querySelector('[data-ct-tail]') };
      this.controls = new Controls(this.root.querySelector('[data-ct-controls]'), { spec, owner: this });
      this.mount(this.regions.extra);
      this.click = event => {
        if (this.controls.element.contains(event.target)) return;
        const ui = event.target.closest('[data-ct-ui]');
        if (ui && this.root.contains(ui) && !ui.disabled) { this.ui(ui.dataset.ctUi, ui, event); return; }
        const button = event.target.closest('[data-ct-action]');
        if (!button || button.disabled || button.classList.contains('is-cooling') || !this.root.contains(button)) return;
        const confirm = button.dataset.ctConfirm;
        if (confirm && this.armed !== confirm) { this.arm(confirm); return; }
        if (confirm) this.disarm();
        this.action(button.dataset.ctAction, payloadOf(button), button);
      };
      // Never rebuild buttons under a finger: a click that starts on one node
      // and ends on its replacement is silently lost on phones.
      this.down = event => { if (event.target.closest('button, [data-ct-ui]')) this.pressing = true; };
      this.up = () => { if (!this.pressing) return; this.pressing = false; setTimeout(() => { if (this.dirty && !this.pressing) { this.dirty = false; this.render(); } }, 0); };
      this.root.addEventListener('click', this.click);
      this.root.addEventListener('pointerdown', this.down);
      for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, this.up);
      this.timer = setInterval(() => this.paint(), 250);
    }
    get view() { return this.data ? this.data[this.key] || null : null; }
    // hooks
    mount() {} sync() {} ui() {} onUpdate() {} paintExtra() {}
    localKey() { return ''; }
    theme() { return ''; }
    arm(key) {
      this.armed = key; this.keys = {}; this.render();
      clearTimeout(this.armTimer);
      this.armTimer = setTimeout(() => { if (this.armed) { this.armed = ''; this.keys = {}; this.render(); } }, 4000);
    }
    disarm() { this.armed = ''; clearTimeout(this.armTimer); }
    action(type, payload = {}) {
      const view = this.view;
      if (!view || !this.send || this.pending || !this.connected()) return Promise.resolve(false);
      if (type === 'restart' && !payload.settings) payload.settings = view.settings;
      const id = uid();
      this.pending = { id, type, sessionId: view.sessionId, stage: view.stage };
      this.error = ''; this.keys = {}; this.render();
      return Promise.resolve(this.send(Object.assign({ id, type, sessionId: view.sessionId, stage: view.stage }, payload))).then(() => {
        if (this.pending?.id !== id) return true;
        this.pending = null; this.keys = {}; this.render();
        return true;
      }, error => {
        if (this.pending?.id !== id) return false;
        this.pending = null; this.error = this.t(errorKey(error?.message));
        this.keys = {}; this.render();
        return false;
      });
    }
    update(data) {
      if (this.destroyed || !data?.[this.key]) return;
      const view = data[this.key], previous = this.view;
      this.data = data;
      if (this.pending && view.reply?.id === this.pending.id) {
        this.error = view.reply.error ? this.t(errorKey(view.reply.error)) : '';
        this.pending = null;
      } else if (previous && (previous.sessionId !== view.sessionId || previous.stage !== view.stage)) this.error = '';
      if (previous && (previous.stage !== view.stage || previous.sessionId !== view.sessionId)) { this.disarm(); this.controls.reset(); }
      this.onUpdate(previous, view);
      if (this.pressing) { this.dirty = true; this.sync(); this.paint(); return; }
      this.render();
    }
    render() {
      const data = this.data, view = this.view; if (!view) return;
      const base = JSON.stringify([lang(), data.name, data.playerNum, view.sessionId, view.turnId, view.stage, view.online, this.pending?.id, this.error, this.armed, this.localKey()]);
      const keys = { head: JSON.stringify([lang(), data.name, data.playerNum, view.roundNo, view.phase === 'finished']), main: base, tail: base };
      if (keys.head !== this.keys.head) this.regions.head.innerHTML = this.head(data);
      if (keys.main !== this.keys.main) this.regions.main.innerHTML = this.main(data);
      if (keys.tail !== this.keys.tail) this.regions.tail.innerHTML = this.tail(data);
      this.keys = keys;
      this.root.className = `secret-card ct-card ${this.prefix}-card ${this.theme(view)}`.trim();
      this.root.querySelector('[data-ct-error]').textContent = this.error;
      this.refreshControls();
      this.sync();
      this.paint();
    }
    refreshControls() {
      const view = this.view;
      this.controls.render(view, { me: this.data?.playerNum || 0, pending: !!this.pending, show: !!view && view.me?.canControl === true });
    }
    // A seat that is sitting out can always bring itself back from its card.
    back() {
      const view = this.view, me = view?.me || {}, n = Number(this.data?.playerNum);
      if (!view || me.active || !list(view.roster).some(p => p.playerNum === n)) return '';
      return `<button type="button" class="ct-button ct-primary ct-wide" data-ct-action="exclude" data-ct-arg-player-num="${n}" data-ct-arg-active="true"${this.pending ? ' disabled' : ''}>${esc(this.t('imBack'))}</button>`;
    }
    scoreline(view, me) {
      const t = this.t, rows = list(view.standings);
      const pts = n => t(Number(n) === 1 ? 'pt' : 'pts', { n: Number(n) || 0 });
      return `<details class="ct-scores"><summary><span>${esc(t('scores'))}</span><span>${esc(pts(rows.find(row => row.playerNum === me)?.score))}</span></summary><ol>${rows.map(row => `<li class="${row.playerNum === me ? 'is-me' : ''}"><span>${esc(row.name || t('player', { n: row.playerNum }))}</span><span>${esc(pts(row.score))}</span></li>`).join('')}</ol></details>`;
    }
    paint() {
      if (this.destroyed || !this.data) return;
      const now = this.now();
      paintTimers(this.root, now);
      this.paintExtra(now);
      const line = this.root.querySelector('[data-ct-connection]');
      const text = !this.connected() ? this.t('offline') : '';
      if (line && line.textContent !== text) line.textContent = text;
    }
    destroy() {
      this.destroyed = true; clearInterval(this.timer); clearTimeout(this.armTimer);
      this.controls.destroy();
      this.root.removeEventListener('click', this.click); this.root.removeEventListener('pointerdown', this.down);
      for (const type of ['pointerup', 'pointercancel']) window.removeEventListener(type, this.up);
    }
  }

  // Final standings: shared by both games' finished screens.
  function standings(view, t, me = 0) {
    const rows = list(view.standings), lead = rows.filter(row => row.leading);
    const pts = n => t(Number(n) === 1 ? 'pt' : 'pts', { n: Number(n) || 0 });
    let rank = 0, last = null;
    const items = rows.map((row, index) => {
      if (row.score !== last) { rank = index + 1; last = row.score; }
      return `<li class="ct-rank${row.leading ? ' is-winner' : ''}${row.playerNum === me ? ' is-me' : ''}"><span class="ct-rank-n">${rank}</span><span class="ct-rank-name">${esc(row.name || t('player', { n: row.playerNum }))}${row.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><span class="ct-rank-score">${esc(pts(row.score))}</span></li>`;
    }).join('');
    const names = lead.map(row => row.name || t('player', { n: row.playerNum })).join(lang() === 'zh' ? '、' : ', ');
    return `<div class="ct-final"><h2 class="ct-final-title">${esc(t('finished'))}</h2>${lead.length ? `<p class="ct-final-lead">${esc(t(lead.length > 1 ? 'winners' : 'winner'))}：${esc(names)}</p>` : ''}${view.stopped ? `<p class="ct-soft">${esc(t('stoppedEarly'))}</p>` : ''}<ol class="ct-ranks">${items}</ol></div>`;
  }

  // ── the optional host page ────────────────────────────────────────────
  // spec: { prefix, key, engine, sync, t, Card, stage(view), controls (Controls spec),
  //         demoRoster, accent, counts, readSetup(), writeSetup(settings), labels(),
  //         actions(view) → [{ type, label, primary }] }
  function host(spec) {
    const { prefix: p, engine: E, t } = spec;
    const byId = id => document.getElementById(`${p}-${id}`);
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    const demoRoster = spec.demoRoster.map((name, i) => ({ playerNum: i + 1, name, active: true }));
    let state = null, sync = null, status = demo ? 'ready' : 'connecting';
    let busy = false, error = '', sceneKey = '', closed = false, editing = false;
    let demoCard = null, demoActor = 0, actionsKey = '';
    const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
    const now = () => sync ? sync.now() : Date.now();
    const stale = () => status === 'switched' || status === 'rosterChanged';
    const canStart = () => !closed && (demo || (!!sync?.connected && !['connecting', 'offline', 'error'].includes(status)));
    const canControl = () => canStart() && !stale();
    const view = (actor = 0) => {
      if (!state) return null;
      const shown = E.view(state, actor)[spec.key];
      shown.online = demo ? demoRoster.map(r => r.playerNum) : sync ? sync.online() : [];
      return shown;
    };
    const seatCount = () => demo ? demoRoster.length : sync ? sync.count : (typeof ROOM !== 'undefined' && ROOM.enabled ? ROOM.count : 0);
    const owner = {
      action: (type, payload = {}) => command(type, payload),
      refreshControls: () => renderControls(),
    };
    const controls = new Controls(byId('controls'), { spec: spec.controls, owner, title: 'hostControls' });

    function labels() {
      I18N.applyStatic(document);
      spec.labels?.();
      const actor = byId('demo-view').value || '0';
      byId('demo-view').innerHTML = `<option value="0">${esc(t('hostView'))}</option>` + demoRoster.map(r => `<option value="${r.playerNum}">${esc(r.name)}</option>`).join('');
      byId('demo-view').value = actor;
      byId('room-label').textContent = demo || !sync ? '' : t('room', { code: ROOM.code });
      sceneKey = ''; actionsKey = ''; controls.reset(); controls.settingsKey = '';
    }
    function render() {
      const wk = stale() ? null : view();
      const resumable = status === 'switched' && !!state && !closed && !!sync?.connected && sync.sameRoom && !sync.rosterChanged;
      const message = ['setupNeeded', 'ready'].includes(status) || resumable ? '' : t(status);
      byId('status').textContent = message;
      byId('switched').hidden = !resumable;
      byId('continue').disabled = busy || !resumable;
      byId('setup-needed').hidden = status !== 'setupNeeded';
      const playing = !!wk && !editing;
      byId('setup').hidden = status === 'setupNeeded' || playing;
      byId('game').hidden = !playing;
      document.body.classList.toggle(`${p}-playing`, playing);
      const count = seatCount(), countOk = count >= E.CONFIG.minPlayers && count <= E.CONFIG.maxPlayers;
      byId('count-note').textContent = countOk || status === 'setupNeeded' || (!demo && !sync) ? '' : t('playersNeeded', { min: E.CONFIG.minPlayers, max: E.CONFIG.maxPlayers, n: count });
      byId('start').disabled = busy || !canStart() || !countOk;
      byId('setup-cancel').hidden = !editing;
      for (const element of byId('setup').querySelectorAll('select, input')) element.disabled = busy;
      byId('error').textContent = error ? t(error) : '';
      const actor = demo ? Number(byId('demo-view').value) : 0;
      if (playing) {
        if (actor) renderDemoCard(actor);
        else {
          if (demoCard) { demoCard.destroy(); demoCard = null; demoActor = 0; }
          const key = JSON.stringify([I18N.lang, wk.sessionId, wk.turnId, wk.stage, wk.phase]);
          if (key !== sceneKey) { byId('scene').innerHTML = spec.stage(wk); sceneKey = key; paint(); }
        }
        renderActions(wk, !actor);
        renderControls();
      } else {
        if (demoCard) { demoCard.destroy(); demoCard = null; demoActor = 0; }
        byId('controls').hidden = true; byId('actions').innerHTML = ''; actionsKey = '';
      }
    }
    function renderActions(wk, hostView) {
      const buttons = hostView ? spec.actions(wk) : [];
      const key = JSON.stringify([I18N.lang, wk.sessionId, wk.stage, wk.phase, buttons, busy, canControl()]);
      if (key === actionsKey) return;
      actionsKey = key;
      byId('actions').innerHTML = buttons.map(b => `<button type="button" class="ct-button${b.primary ? ' ct-primary' : ''}" data-host-action="${esc(b.type)}"${busy || !canControl() ? ' disabled' : ''}>${esc(b.label)}</button>`).join('');
    }
    function renderControls() {
      const wk = stale() ? null : view();
      const actor = demo ? Number(byId('demo-view').value) : 0;
      controls.render(wk, { me: 0, pending: busy || !canControl(), show: !!wk && !editing && !actor });
    }
    function paint() { if (!demoCard) paintTimers(byId('scene'), now()); }
    function renderDemoCard(actor) {
      if (!demoCard || demoActor !== actor) {
        demoCard?.destroy(); sceneKey = '';
        byId('scene').innerHTML = '<div class="ct-demo-phone"></div>';
        demoActor = actor;
        demoCard = new spec.Card(byId('scene').firstElementChild, {
          now,
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
      shown[spec.key].online = demoRoster.map(r => r.playerNum);
      demoCard.update(shown);
    }
    async function command(type, extra = {}) {
      if (busy || !state || !canControl()) return false;
      busy = true; error = ''; render();
      let ok = false;
      try {
        if (demo) {
          const input = Object.assign({}, extra, { id: uid(), type, actor: 0, sessionId: state.sessionId,
            stage: Number.isInteger(extra.stage) ? extra.stage : state.stage, now: now(), seed: seed() });
          const next = E.apply(state, input);
          const reply = next.replies?.[0];
          if (next === state) throw new Error('not_available');
          if (reply?.id === input.id && reply.error) throw new Error(reply.error);
          state = next;
        } else await sync.command(type, extra);
        ok = true;
      } catch (e) { error = errorKey(e.message); }
      finally { busy = false; render(); }
      return ok;
    }
    // A running game restarts in place (same links, same session); a room that
    // switched games or changed size gets a fresh session.
    async function start(settings) {
      if (busy || !canStart()) return;
      let parsed;
      try { parsed = E.parseSettings(settings || {}); } catch (_) { error = 'invalid_options'; render(); return; }
      busy = true; error = ''; controls.reset(); render();
      try {
        if (demo) state = E.create({ id: uid(), roster: demoRoster, settings: parsed, now: now(), seed: seed(), previous: state });
        else if (state && !stale()) await sync.command('restart', { settings: parsed });
        else await sync.start({ settings: parsed });
        editing = false;
      } catch (e) { error = errorKey(e.message); }
      finally { busy = false; sceneKey = ''; render(); }
    }
    byId('setup').addEventListener('submit', event => { event.preventDefault(); start(spec.readSetup()); });
    byId('setup-cancel').addEventListener('click', () => { editing = false; render(); });
    byId('continue').addEventListener('click', async () => {
      if (busy || !sync) return;
      busy = true; error = ''; render();
      try { await sync.point(); } catch (e) { error = errorKey(e.message); }
      finally { busy = false; sceneKey = ''; render(); }
    });
    byId('actions').addEventListener('click', event => {
      const button = event.target.closest('[data-host-action]'); if (!button || button.disabled) return;
      const type = button.dataset.hostAction, wk = view();
      if (type === 'again') start(state?.settings);
      else if (type === 'settings') { spec.writeSetup(state?.settings); editing = true; render(); }
      else command(type, { stage: wk?.stage });
    });
    byId('demo-view').addEventListener('change', () => { sceneKey = ''; actionsKey = ''; render(); });

    let roomCode = null;
    if (demo) { byId('demo-bar').hidden = false; byId('demo-link').hidden = true; }
    else {
      let saved = null;
      try { roomCode = localStorage.getItem('room-last-session'); saved = JSON.parse(localStorage.getItem('room-session-' + roomCode) || 'null'); } catch (e) {}
      if (!saved?.tokens?.length || Number(saved.playerCount || saved.tokens.length) < 2) status = 'setupNeeded';
      else if (!ROOM.enabled) status = 'noFirebase';
      else {
        ROOM.init({ mount: 'room-mount', hideSetup: true, accent: spec.accent, counts: spec.counts, defaultCount: 5 });
        sync = new spec.sync.HostTable({ room: ROOM, db: firebase.database(),
          onChange: next => {
            if (state?.stage !== next?.stage) error = '';
            if (!state || state.sessionId !== next?.sessionId) spec.writeSetup(next?.settings);
            state = next; render();
          },
          onStatus: next => {
            status = next;
            if (stale()) { editing = false; sceneKey = ''; controls.reset(); }
            render();
          },
          onPresence: () => { controls.liveKey = ''; render(); },
        });
        sync.connect();
        document.addEventListener('visibilitychange', () => sync?.setVisible(!document.hidden));
      }
    }
    labels(); spec.writeSetup(null); render();
    I18N.onChange(() => { labels(); render(); });
    const timers = [
      setInterval(paint, 250),
      // Only the simulation keeps its own clock; live rooms tick inside the
      // table client (here and on every card).
      setInterval(() => {
        if (closed || !demo || !state || busy || !E.TIMED.includes(state.phase) || !(state.deadline > 0) || now() < state.deadline) return;
        const next = E.apply(state, { id: uid(), type: 'tick', actor: 0, sessionId: state.sessionId, stage: state.stage, now: now(), seed: seed() });
        if (next !== state) { state = next; render(); }
      }, 200),
    ];
    function close() { closed = true; timers.forEach(clearInterval); sync?.close(); demoCard?.destroy(); }
    window.addEventListener('storage', event => {
      if (!demo && event.key === 'room-last-session' && event.newValue !== roomCode) { close(); status = 'roomChanged'; render(); }
    });
    window.addEventListener('pagehide', close);
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    // One-device demo only: act as any seat (used by the browser checks).
    const demoAct = (actor, type, extra = {}) => {
      if (!demo || !state) return 'not_available';
      const input = Object.assign({}, extra, { id: uid(), type, actor, sessionId: state.sessionId, stage: Number.isInteger(extra.stage) ? extra.stage : state.stage, now: now(), seed: seed() });
      const next = E.apply(state, input), reply = next.replies?.[actor];
      if (next === state) return 'unchanged';
      state = next; render();
      return reply?.id === input.id ? reply.error : '';
    };
    return { get state() { return state; }, get status() { return status; }, view, command, start, demoAct: demo ? demoAct : undefined };
  }

  return { translator, esc, list, obj, clock, lang, pick, seatsOf, errorKey, paintTimers, payloadOf, Controls, Card, standings, host, field, check, readField, COMMON };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CARD_TABLE_UI;
