/* ROOM SURVEY host page: setup, the shared board and Host controls.
 * Optional once a game starts: the cards run the clock and the controls.
 * The shared board never shows a hidden answer. `?demo=1` plays a whole game
 * on one device with a switchable card view. */
(() => {
  'use strict';
  const UI = ROOM_SURVEY_UI, E = ROOM_SURVEY_ENGINE, C = CARD_TABLE_UI;
  const { t } = UI;
  const byId = id => document.getElementById('rs-' + id);
  const FIELDS = { category: 'category', answers: 'answers', writeSeconds: 'write', guessMinutes: 'guess', turnSeconds: 'turn' };
  function readSetup() {
    return { category: byId('category').value, answers: Number(byId('answers').value), writeSeconds: Number(byId('write').value),
      guessMinutes: Number(byId('guess').value), turnSeconds: Number(byId('turn').value), showAuthors: byId('authors').checked };
  }
  function writeSetup(settings) {
    let s; try { s = E.parseSettings(settings || {}); } catch (_) { s = E.defaultSettings(); }
    for (const [key, id] of Object.entries(FIELDS)) byId(id).value = String(s[key]);
    byId('authors').checked = !!s.showAuthors;
  }
  function labels() {
    const R = E.CONFIG;
    const fill = (id, values, text) => {
      const select = byId(id), value = select.value;
      select.innerHTML = values.map(v => `<option value="${C.esc(v)}">${C.esc(text(v))}</option>`).join('');
      if (values.map(String).includes(value)) select.value = value;
    };
    fill('category', R.categories, c => t('cat_' + c));
    fill('answers', R.answerCounts, n => String(n));
    fill('write', R.writeSeconds, n => t('secondsN', { n }));
    fill('guess', R.guessMinutes, n => t('minutesN', { n }));
    fill('turn', R.turnSeconds, n => Number(n) ? t('secondsN', { n }) : t('turnOff'));
    for (const element of document.querySelectorAll('[data-rs-sample]')) element.innerHTML = UI.tally(Number(element.dataset.rsSample), { size: 20 });
  }
  function actions(view) {
    switch (view.phase) {
      case 'write': case 'sort': case 'guess': return [{ type: 'pause', label: t('pause') }];
      case 'paused': return [{ type: 'resume', label: t('resume'), primary: true }];
      case 'result': return [{ type: 'next', label: t('nextRound'), primary: true }];
      case 'finished': return [{ type: 'again', label: t('playAgain'), primary: true }, { type: 'settings', label: t('changeSettings') }];
      default: return [];
    }
  }
  window.ROOM_SURVEY_HOST = C.host({
    prefix: 'rs', key: 'rs', engine: E, sync: UI.SYNC, t, Card: UI.Card, stage: UI.stage, controls: UI.controlsSpec,
    demoRoster: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'], accent: '#f2d46f', counts: [2, 3, 4, 5, 6, 7, 8, 9],
    readSetup, writeSetup, labels, actions,
  });
})();
