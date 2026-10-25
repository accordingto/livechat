(() => {
  'use strict';
  const UI = WORD_WOLF_UI, E = WORD_WOLF_ENGINE, C = CARD_TABLE_UI;
  const byId = id => document.getElementById('ww-' + id);
  function labels() {
    const select = byId('category'), previous = select.value;
    select.innerHTML = E.CONFIG.categories.map(value => `<option value="${value}">${C.esc(UI.t('cat_' + value))}</option>`).join('');
    select.value = E.CONFIG.categories.includes(previous) ? previous : E.CONFIG.defaultCategory;
  }
  function actions(v) {
    if (v.phase === 'describe') return [{ type: 'pick', label: UI.t('pick') }, { type: 'vote', label: UI.t('openVote'), primary: true }];
    if (v.phase === 'vote') return v.votesCast ? [{ type: 'close', label: UI.t('reveal'), primary: true }] : [];
    if (v.phase === 'result') return [{ type: 'next', label: UI.t('nextPair'), primary: true }];
    if (v.phase === 'paused') return [{ type: 'resume', label: UI.t('resume'), primary: true }];
    if (v.phase === 'finished') return [{ type: 'again', label: UI.t('playAgain'), primary: true }, { type: 'settings', label: UI.t('changeSettings') }];
    return [];
  }
  window.WORD_WOLF_HOST = C.host({ prefix: 'ww', key: 'ww', engine: E, sync: UI.SYNC, t: UI.t, Card: UI.Card, stage: UI.stage, controls: UI.controlsSpec,
    demoRoster: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'], accent: '#c6d7c5', counts: [3, 4, 5, 6, 7, 8, 9],
    readSetup: () => ({ category: byId('category').value }), writeSetup: s => { byId('category').value = E.parseSettings(s || {}).category; }, labels, actions });
})();
