/* One local preference shared by the Hub and Let's Talk setup. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TALK_SETTINGS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const key = 'lets-talk-settings.v2';
  const pendingKey = 'lets-talk-home-settings.pending.v1';
  const defaults = Object.freeze({ gameMode: 'normal', conversationMode: 'random', crazySource: 'mixed',
    crazyMinSeconds: 60, crazyMaxSeconds: 180, gameSeconds: 900, crazyTaskSeconds: 150, mode: 'think', seconds: 45 });
  const intervalBounds = Object.freeze({ min: 5, max: 300 });
  function validInterval(min, max) {
    min = Number(min); max = Number(max);
    return Number.isInteger(min) && Number.isInteger(max) && min >= intervalBounds.min && max <= intervalBounds.max && min <= max;
  }
  const durationBounds = Object.freeze({ gameSeconds: { min: 60, max: 3600 }, crazyTaskSeconds: { min: 30, max: 300 } });
  function validDuration(value, key) {
    const seconds = Number(value), bounds = durationBounds[key];
    return !!bounds && Number.isInteger(seconds) && seconds >= bounds.min && seconds <= bounds.max;
  }
  function minutesToSeconds(value) {
    const seconds = Number(value) * 60, rounded = Math.round(seconds);
    return Number.isFinite(seconds) && Math.abs(seconds - rounded) < 1e-7 ? rounded : NaN;
  }
  function normalize(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    const explicit = value.crazyMinSeconds != null || value.crazyMaxSeconds != null;
    const legacy = [60, 120, 180].includes(Number(value.crazySeconds)) ? Number(value.crazySeconds) : null;
    const min = explicit ? Number(value.crazyMinSeconds) : legacy ? Math.round(legacy * .8) : defaults.crazyMinSeconds;
    const max = explicit ? Number(value.crazyMaxSeconds) : legacy ? Math.round(legacy * 1.2) : defaults.crazyMaxSeconds;
    return {
      gameMode: value.gameMode === 'crazy' ? 'crazy' : 'normal',
      conversationMode: ['assigned', 'random', 'free'].includes(value.conversationMode) ? value.conversationMode : defaults.conversationMode,
      crazySource: ['system', 'players', 'mixed'].includes(value.crazySource) ? value.crazySource : defaults.crazySource,
      crazyMinSeconds: validInterval(min, max) ? min : defaults.crazyMinSeconds,
      crazyMaxSeconds: validInterval(min, max) ? max : defaults.crazyMaxSeconds,
      gameSeconds: validDuration(value.gameSeconds, 'gameSeconds') ? Number(value.gameSeconds) : defaults.gameSeconds,
      crazyTaskSeconds: validDuration(value.crazyTaskSeconds, 'crazyTaskSeconds') ? Number(value.crazyTaskSeconds) : defaults.crazyTaskSeconds,
      mode: value.mode === 'write' ? 'write' : 'think',
      seconds: Number.isInteger(Number(value.seconds)) && Number(value.seconds) >= 15 && Number(value.seconds) <= 120 ? Number(value.seconds) : defaults.seconds,
    };
  }
  function read(storage = typeof localStorage === 'undefined' ? null : localStorage) {
    try { return normalize(JSON.parse(storage?.getItem(key) || '{}')); } catch (_) { return { ...defaults }; }
  }
  function save(value, storage = typeof localStorage === 'undefined' ? null : localStorage) {
    const merged = { ...read(storage), ...value };
    if (value && Object.hasOwn(value, 'crazySeconds') && !Object.hasOwn(value, 'crazyMinSeconds') && !Object.hasOwn(value, 'crazyMaxSeconds')) {
      delete merged.crazyMinSeconds; delete merged.crazyMaxSeconds;
    }
    const settings = normalize(merged);
    try { storage?.setItem(key, JSON.stringify(settings)); } catch (_) {}
    return settings;
  }
  function markPending(storage = typeof localStorage === 'undefined' ? null : localStorage) {
    try { storage?.setItem(pendingKey, 'true'); } catch (_) {}
  }
  function consumePending(storage = typeof localStorage === 'undefined' ? null : localStorage) {
    try { const pending = storage?.getItem(pendingKey) === 'true'; if (pending) storage.setItem(pendingKey, 'false'); return pending; } catch (_) { return false; }
  }
  const dict = {
    settings: { zh: '談話設定', en: 'Conversation settings' },
    gameMode: { zh: '玩法', en: 'Game' },
    normal: { zh: "Let's Talk · 一起聊", en: "Let's Talk" },
    crazy: { zh: 'Crazy Talk · 荒謬挑戰', en: 'Crazy Talk' },
    conversationMode: { zh: '談話方式', en: 'Conversation style' },
    assigned: { zh: '依序輪流', en: 'Take turns in order' },
    random: { zh: '隨機點名', en: 'Random turns' },
    free: { zh: '自由談話', en: 'Free conversation' },
    crazySource: { zh: '挑戰來源', en: 'Challenge source' },
    system: { zh: '系統出題', en: 'System challenges' },
    players: { zh: '玩家互相出題', en: 'Player challenges' },
    mixed: { zh: '系統＋玩家', en: 'System + players' },
    interval: { zh: '派給下一人的間隔（秒）', en: 'Interval before the next player (seconds)' },
    gameDuration: { zh: '遊戲時間（分鐘）', en: 'Round length (minutes)' },
    crazyTaskDuration: { zh: '任務時間（分鐘）', en: 'Mission time (minutes)' },
    invalidGameDuration: { zh: '遊戲時間請填 1–60 分鐘，以整數秒計。', en: 'Use 1–60 minutes, in whole seconds.' },
    invalidTaskDuration: { zh: '任務時間請填 0.5–5 分鐘，以整數秒計。', en: 'Use 0.5–5 minutes per mission, in whole seconds.' },
    minSeconds: { zh: '最短', en: 'Minimum' },
    maxSeconds: { zh: '最長', en: 'Maximum' },
    scheduleHint: { zh: '通常一人、最多兩人同時有任務；略過或到期就交給下一人。手寫卡優先。', en: 'Usually one active mission, at most two. Skips and expiry move to the next player. Player cards go first.' },
    invalidInterval: { zh: '請填 5–300 的整數秒，最短不能大於最長。', en: 'Enter whole seconds from 5 to 300. Minimum cannot exceed maximum.' },
    saved: { zh: '選好後，按上方卡片進入選題。', en: 'Choose your settings, then open the card above to pick a topic.' },
  };
  function bind(element, { storage, onChange } = {}) {
    if (!element) return;
    const fields = Array.from(element.querySelectorAll('[data-talk-pref]'));
    const settings = read(storage);
    fields.forEach(field => { field.value = String(field.dataset.talkUnit === 'minutes' ? settings[field.dataset.talkPref] / 60 : settings[field.dataset.talkPref]); });
    const rawValues = () => ({ ...read(storage), ...Object.fromEntries(fields.map(field => [field.dataset.talkPref, field.dataset.talkUnit === 'minutes' ? minutesToSeconds(field.value) : field.value])) });
    const message = key => typeof I18N === 'undefined' ? dict[key].zh : I18N.t('talkSettings', key);
    const paint = () => {
      const raw = rawValues(), current = normalize(raw);
      const validRange = current.gameMode !== 'crazy' || validInterval(raw.crazyMinSeconds, raw.crazyMaxSeconds);
      const validGame = validDuration(raw.gameSeconds, 'gameSeconds');
      const validTask = current.gameMode !== 'crazy' || validDuration(raw.crazyTaskSeconds, 'crazyTaskSeconds');
      const valid = validRange && validGame && validTask;
      element.querySelectorAll('[data-talk-crazy-setting]').forEach(node => { node.hidden = current.gameMode !== 'crazy'; });
      for (const field of fields) {
        const key = field.dataset.talkPref;
        const errorKey = ['crazyMinSeconds', 'crazyMaxSeconds'].includes(key) && !validRange ? 'invalidInterval'
          : key === 'gameSeconds' && !validGame ? 'invalidGameDuration'
          : key === 'crazyTaskSeconds' && !validTask ? 'invalidTaskDuration' : '';
        field.setCustomValidity?.(errorKey ? message(errorKey) : '');
        field.setAttribute?.('aria-invalid', String(!!errorKey));
      }
      const error = element.querySelector?.('[data-talk-range-error]');
      if (error) { error.hidden = validRange; error.textContent = validRange ? '' : message('invalidInterval'); }
      const durationError = element.querySelector?.('[data-talk-duration-error]');
      if (durationError) {
        durationError.hidden = validGame && validTask;
        durationError.textContent = !validGame ? message('invalidGameDuration') : !validTask ? message('invalidTaskDuration') : '';
      }
      return { current, valid };
    };
    fields.forEach(field => field.addEventListener('change', () => {
      const { current, valid } = paint();
      if (!valid) return;
      const next = save(current, storage); markPending(storage); onChange?.(next);
    }));
    if (typeof I18N !== 'undefined') I18N.onChange?.(paint);
    paint();
  }
  return { key, pendingKey, defaults, intervalBounds, durationBounds, validInterval, validDuration, minutesToSeconds, normalize, read, save, markPending, consumePending, bind, dict };
});
if (typeof document !== 'undefined' && typeof TALK_SETTINGS !== 'undefined') {
  if (typeof I18N !== 'undefined') I18N.registerDict('talkSettings', TALK_SETTINGS.dict);
  document.querySelectorAll('[data-talk-preferences]').forEach(element => TALK_SETTINGS.bind(element));
}
