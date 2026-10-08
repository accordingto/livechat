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
    crazySeconds: 120, mode: 'think', seconds: 45 });
  function normalize(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return {
      gameMode: value.gameMode === 'crazy' ? 'crazy' : 'normal',
      conversationMode: ['assigned', 'random', 'free'].includes(value.conversationMode) ? value.conversationMode : defaults.conversationMode,
      crazySource: ['system', 'players', 'mixed'].includes(value.crazySource) ? value.crazySource : defaults.crazySource,
      crazySeconds: [60, 120, 180].includes(Number(value.crazySeconds)) ? Number(value.crazySeconds) : defaults.crazySeconds,
      mode: value.mode === 'write' ? 'write' : 'think',
      seconds: Number.isInteger(Number(value.seconds)) && Number(value.seconds) >= 15 && Number(value.seconds) <= 120 ? Number(value.seconds) : defaults.seconds,
    };
  }
  function read(storage = typeof localStorage === 'undefined' ? null : localStorage) {
    try { return normalize(JSON.parse(storage?.getItem(key) || '{}')); } catch (_) { return { ...defaults }; }
  }
  function save(value, storage = typeof localStorage === 'undefined' ? null : localStorage) {
    const settings = normalize({ ...read(storage), ...value });
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
    frequency: { zh: '系統出題頻率', en: 'System frequency' },
    minute1: { zh: '約每人 1 分鐘', en: 'About every 1 min per person' },
    minute2: { zh: '約每人 2 分鐘', en: 'About every 2 min per person' },
    minute3: { zh: '約每人 3 分鐘', en: 'About every 3 min per person' },
    saved: { zh: '選好後，按上方卡片進入選題。', en: 'Choose your settings, then open the card above to pick a topic.' },
  };
  function bind(element, { storage, onChange } = {}) {
    if (!element) return;
    const fields = Array.from(element.querySelectorAll('[data-talk-pref]'));
    const settings = read(storage);
    fields.forEach(field => { field.value = String(settings[field.dataset.talkPref]); });
    const values = () => normalize({ ...read(storage), ...Object.fromEntries(fields.map(field => [field.dataset.talkPref, field.value])) });
    const paint = () => {
      const current = values();
      element.querySelectorAll('[data-talk-crazy-setting]').forEach(node => { node.hidden = current.gameMode !== 'crazy'; });
      element.querySelectorAll('[data-talk-system-setting]').forEach(node => { node.hidden = current.gameMode !== 'crazy' || current.crazySource === 'players'; });
      return current;
    };
    fields.forEach(field => field.addEventListener('change', () => { const current = save(paint(), storage); markPending(storage); onChange?.(current); }));
    paint();
  }
  return { key, pendingKey, defaults, normalize, read, save, markPending, consumePending, bind, dict };
});
if (typeof document !== 'undefined' && typeof TALK_SETTINGS !== 'undefined') {
  if (typeof I18N !== 'undefined') I18N.registerDict('talkSettings', TALK_SETTINGS.dict);
  document.querySelectorAll('[data-talk-preferences]').forEach(element => TALK_SETTINGS.bind(element));
}
