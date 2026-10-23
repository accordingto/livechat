/* WORD LIMIT THEATER host page: setup, the shared stage and Host controls.
 * Optional once a game starts: the cards run the clock and the controls.
 * `?demo=1` plays a whole game on one device with a switchable card view. */
(() => {
  'use strict';
  const UI = WORD_LIMIT_UI, E = WORD_LIMIT_ENGINE, C = CARD_TABLE_UI;
  const { t } = UI;
  const byId = id => document.getElementById('wl-' + id);
  function readSetup() {
    const unit = document.querySelector('input[name="wl-unit"]:checked')?.value || 'words';
    return { unit, sceneMinutes: Number(byId('minutes').value), twists: byId('twists').checked, shuffle: byId('shuffle').checked, vote: byId('vote').checked };
  }
  // No saved game yet: lines default to the language the host is reading.
  function writeSetup(settings) {
    let s; try { s = E.parseSettings(settings || {}); } catch (_) { s = E.defaultSettings(); }
    if (!settings) s.unit = I18N.lang === 'zh' ? 'chars' : 'words';
    for (const input of document.querySelectorAll('input[name="wl-unit"]')) input.checked = input.value === s.unit;
    byId('minutes').value = String(s.sceneMinutes);
    byId('twists').checked = s.twists; byId('shuffle').checked = s.shuffle; byId('vote').checked = s.vote;
  }
  function labels() {
    const select = byId('minutes'), value = select.value;
    select.innerHTML = E.CONFIG.sceneMinutes.map(n => `<option value="${n}">${C.esc(t('minutesN', { n }))}</option>`).join('');
    select.value = value || String(E.CONFIG.defaultSceneMinutes);
  }
  // The one or two things a host most often needs, next to the stage.
  function actions(view) {
    switch (view.phase) {
      case 'cast': return [{ type: 'close', label: t('startNow'), primary: true }, { type: 'reroll', label: t('rerollScene') }];
      case 'scene': return [{ type: 'twist', label: t('addTwist') }, { type: 'pause', label: t('pause') }];
      case 'vote': return [{ type: 'pause', label: t('pause') }];
      case 'paused': return [{ type: 'resume', label: t('resume'), primary: true }];
      case 'result': return [{ type: 'next', label: t('nextScene'), primary: true }];
      case 'finished': return [{ type: 'again', label: t('playAgain'), primary: true }, { type: 'settings', label: t('changeSettings') }];
      default: return [];
    }
  }
  window.WORD_LIMIT_HOST = C.host({
    prefix: 'wl', key: 'wl', engine: E, sync: UI.SYNC, t, Card: UI.Card, stage: UI.stage, controls: UI.controlsSpec,
    demoRoster: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'], accent: '#ffc247', counts: [2, 3, 4, 5, 6, 7, 8, 9],
    readSetup, writeSetup, labels, actions,
  });
})();
