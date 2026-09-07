/* game-render.js — shared rendering for pick-a-side.html and sophies-choice.html.
   Include AFTER game-data.js. Call GAME_RENDER.injectCSS() once on page load. */

if (typeof I18N !== 'undefined') {
  I18N.registerDict('render', {
    hotTakeLabel: { zh: '🔥 犀利意見', en: '🔥 HOT TAKE' },
    situationLabel: { zh: '🎯 情境', en: '🎯 THE SITUATION' },
    optionC: { zh: '其他！說出你自己的答案。', en: 'Something else! Tell us your own answer.' },
  });
}
const GAME_RENDER = (() => {
  const grt = key => (typeof I18N !== 'undefined' ? I18N.t('render', key) : key);

  function injectCSS() {
    if (document.getElementById('gr-styles')) return;
    const s = document.createElement('style');
    s.id = 'gr-styles';
    s.textContent = `
      /* ── Shared label / text ── */
      .gr-label {
        font-size: .86rem; letter-spacing: 1.5px; text-transform: uppercase;
        font-weight: 700; position: relative; z-index: 1;
      }
      .gr-text {
        font-size: clamp(1.1rem, 3vw, 1.45rem);
        font-weight: 700; line-height: 1.55;
        text-align: center;
        position: relative; z-index: 1;
      }
      .gr-divider { width: 100%; height: 1px; background: #1e1e3a; margin: 4px 0; }

      /* ── Sophie's Choice options ── */
      .gr-options {
        width: 100%; display: flex; gap: 10px; flex-direction: column;
        position: relative; z-index: 1;
      }
      .gr-opt {
        border-radius: 14px; padding: 14px 20px;
        display: flex; align-items: flex-start; gap: 14px;
        border: 1.5px solid transparent;
      }
      .gr-opt-a { background: rgba(79,158,255,.1);  border-color: rgba(79,158,255,.3); }
      .gr-opt-b { background: rgba(239,68,68,.1);   border-color: rgba(239,68,68,.3); }
      .gr-opt-c { background: rgba(34,197,94,.1);   border-color: rgba(34,197,94,.3); }
      .gr-opt-key {
        font-size: .75rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;
        padding: 3px 10px; border-radius: 999px; flex-shrink: 0; margin-top: 2px;
      }
      .gr-opt-a .gr-opt-key { background: #4f9eff; color: #0d0d1a; }
      .gr-opt-b .gr-opt-key { background: #ef4444; color: #fff; }
      .gr-opt-c .gr-opt-key { background: #22c55e; color: #0d0d1a; }
      .gr-opt-text { font-size: clamp(1.05rem, 2.5vw, 1.2rem); line-height: 1.55; }
    `;
    document.head.appendChild(s);
  }

  /* ── hottake ── */
  function hottake(el, take) {
    el.innerHTML = `
      <span class="gr-label" style="color:#ff7043">${grt('hotTakeLabel')}</span>
      <span class="gr-text">${take}</span>`;
  }

  /* ── sophies ── */
  function sophies(el, sc) {
    el.innerHTML = `
      <span class="gr-label" style="color:#a78bfa">${grt('situationLabel')}</span>
      <span class="gr-text">${sc.situation}</span>
      <div class="gr-divider"></div>
      <div class="gr-options">
        <div class="gr-opt gr-opt-a"><span class="gr-opt-key">A</span><span class="gr-opt-text">${sc.a}</span></div>
        <div class="gr-opt gr-opt-b"><span class="gr-opt-key">B</span><span class="gr-opt-text">${sc.b}</span></div>
        <div class="gr-opt gr-opt-c"><span class="gr-opt-key">C</span><span class="gr-opt-text">${grt('optionC')}</span></div>
      </div>`;
  }

  /* ── drawTick: slot-machine animation helper ── */
  function drawTick(pool, onTick, onDone, { count = 22, ms = 85 } = {}) {
    let n = 0;
    const iv = setInterval(() => {
      onTick(pool[Math.floor(Math.random() * pool.length)]);
      if (++n >= count) { clearInterval(iv); onDone(); }
    }, ms);
  }

  return { injectCSS, hottake, sophies, drawTick };
})();
