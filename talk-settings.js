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
    crazyMinSeconds: 60, crazyMaxSeconds: 180, mode: 'think', seconds: 45 });
  const intervalBounds = Object.freeze({ min: 5, max: 300 });
  function validInterval(min, max) {
    min = Number(min); max = Number(max);
    return Number.isInteger(min) && Number.isInteger(max) && min >= intervalBounds.min && max <= intervalBounds.max && min <= max;
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
    interval: { zh: '隨機間隔（秒）', en: 'Random interval (seconds)' },
    minSeconds: { zh: '最短', en: 'Minimum' },
    maxSeconds: { zh: '最長', en: 'Maximum' },
    scheduleHint: { zh: '每人各自隨機計時；玩家投稿先排隊，時間到優先派發。', en: 'Each player has an independent random timer. Player submissions queue for priority delivery when due.' },
    invalidInterval: { zh: '請填 5–300 的整數秒，最短不能大於最長。', en: 'Enter whole seconds from 5 to 300. Minimum cannot exceed maximum.' },
    saved: { zh: '選好後，按上方卡片進入選題。', en: 'Choose your settings, then open the card above to pick a topic.' },
  };
  function bind(element, { storage, onChange } = {}) {
    if (!element) return;
    const fields = Array.from(element.querySelectorAll('[data-talk-pref]'));
    const settings = read(storage);
    fields.forEach(field => { field.value = String(settings[field.dataset.talkPref]); });
    const rawValues = () => ({ ...read(storage), ...Object.fromEntries(fields.map(field => [field.dataset.talkPref, field.value])) });
    const message = () => typeof I18N === 'undefined' ? dict.invalidInterval.zh : I18N.t('talkSettings', 'invalidInterval');
    const paint = () => {
      const raw = rawValues(), current = normalize(raw);
      const valid = current.gameMode !== 'crazy' || validInterval(raw.crazyMinSeconds, raw.crazyMaxSeconds);
      element.querySelectorAll('[data-talk-crazy-setting]').forEach(node => { node.hidden = current.gameMode !== 'crazy'; });
      fields.filter(field => ['crazyMinSeconds', 'crazyMaxSeconds'].includes(field.dataset.talkPref)).forEach(field => {
        field.setCustomValidity?.(valid ? '' : message());
        field.setAttribute?.('aria-invalid', String(!valid));
      });
      const error = element.querySelector?.('[data-talk-range-error]');
      if (error) { error.hidden = valid; error.textContent = valid ? '' : message(); }
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
  return { key, pendingKey, defaults, intervalBounds, validInterval, normalize, read, save, markPending, consumePending, bind, dict };
});
if (typeof document !== 'undefined' && typeof TALK_SETTINGS !== 'undefined') {
  if (typeof I18N !== 'undefined') I18N.registerDict('talkSettings', TALK_SETTINGS.dict);
  document.querySelectorAll('[data-talk-preferences]').forEach(element => TALK_SETTINGS.bind(element));
}
