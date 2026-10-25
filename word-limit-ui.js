/* WORD LIMIT THEATER presentation: the shared stage (host page) and every
 * player card. It only reads WORD_LIMIT_ENGINE.view(). Nothing in this game is
 * secret, so the shared screen and the cards see the same public table; a card
 * adds its own `me` block (its role, limit, points and what it can tap). */
var WORD_LIMIT_UI = (() => {
  'use strict';
  const C = CARD_TABLE_UI;
  const { esc, list, pick } = C;
  const dict = {
    brand: ['WORD LIMIT THEATER', 'WORD LIMIT THEATER'],
    subtitle: ['輪流說一句，用你的字數接住這場戲。', 'One line each. Keep the scene going.'],
    pitch: ['每個人抽一個角色和字數，照順序輪流說一句。1 到 5 字比較常見，可以和別人相同，6 字只會偶爾出現。輪到你時，說完剛好字數的台詞，再按卡片得分並交給下一位。演出中還會重新抽字數。', 'Draw a role and a line limit, then take turns saying one line. Limits of 1–5 are common and may repeat; six is occasional. On your turn, say exactly your limit, then tap your card to score and hand over. Limits change during the scene.'],
    hostNote: ['角色、字數和分數都是公開的，大家才能一起抓犯規。', 'Roles, limits and points are public, so everyone can catch a foul.'],
    start: ['開始第一場', 'Start the first scene'],
    sceneN: ['第 {n} 場', 'Scene {n}'],
    yourLines: ['你的台詞', 'Your lines'],
    everyLine: ['每一句都剛好', 'Every line, exactly'],
    unit_words_one: ['個英文單字', 'word'], unit_words_many: ['個英文單字', 'words'],
    unit_chars_one: ['個字', 'Chinese character'], unit_chars_many: ['個字', 'Chinese characters'],
    unitOption_words: ['英文（算單字數）', 'English (count words)'], unitOption_chars: ['中文（算字數）', 'Chinese (count characters)'],
    youPlay: ['你演', 'You play'],
    castTitle: ['演員表', 'Cast'],
    curtainIn: ['開演倒數', 'Curtain up in'],
    castHint: ['先看角色、字數和場景。開演後照順序輪流說一句，說完按卡片得分並交給下一位。', 'Read your role, limit and scene. Take turns saying one line, then tap your card to score and hand over.'],
    startNow: ['馬上開演', 'Start now'],
    rerollScene: ['換一個場景', 'Different scene'], rerollsLeft: ['還能換 {n} 次', '{n} left'],
    sceneLeft: ['這場還剩', 'left in the scene'],
    lineButton: ['說完了，下一位', 'Line done · next actor'],
    lineHint: ['說完剛好字數的一句，再按一下得分並交棒。', 'Say one line with exactly your limit, then tap to score and hand over.'],
    stageScoreHint: ['輪到的人說完一句，在自己的卡片上按一下得分，接著換下一位。', 'The current actor says one line, then taps their card to score and hand over.'],
    yourTurn: ['輪到你', 'Your turn'], speakingNow: ['現在發言', 'Speaking now'],
    firstSpeaker: ['首先發言', 'First to speak'], nextSpeaker: ['下一位：{name}', 'Next: {name}'],
    waitingTurn: ['先聽聽 {name}，接著輪流說。', 'Listen to {name}; your turn is coming.'],
    noSpeaker: ['等待演員回來', 'Waiting for an actor'],
    moreScene: ['演員與本場紀錄', 'Cast & scene details'],
    optionalDetails: ['查看角色、分數與犯規操作', 'Roles, points and foul controls'],
    myScene: ['這場：{lines}、{points}', 'This scene: {lines}, {points}'],
    linesOne: ['1 句', '1 line'], linesN: ['{n} 句', '{n} lines'],
    nextSwap: ['下次換字數', 'Limits swap in'], noMoreSwaps: ['這場不會再換字數了', 'No more swaps in this scene'],
    valuesTitle: ['每句得分', 'Points per line'],
    shuffleTitle: ['字數大風吹！', 'Limits shuffled!'], shuffleHint: ['每個人都抽到新字數了，看一下你的新字數。', 'Everyone has a new limit. Check yours.'],
    wasLimit: ['原本 {n}', 'was {n}'],
    foul: ['犯規', 'Foul'], foulCall: ['{name} 犯規！', 'Foul on {name}!'], foulBy: ['{by} 吹哨', 'called by {by}'],
    foulOnYou: ['你被吹犯規了！', 'Foul on you!'],
    foulHint: ['有人說錯字數？按他的「犯規」（只記次數）。', 'Someone broke their limit? Tap their Foul (it only counts).'],
    foulsN: ['犯規 {n} 次', '{n} fouls'], foulsOne: ['犯規 1 次', '1 foul'],
    wrapTitle: ['殺青！', 'That’s a wrap!'],
    sceneRanking: ['這場得分', 'Points this scene'],
    topScene: ['這場最高分', 'Top score'], youTop: ['你是這場最高分！', 'You scored the most this scene!'],
    noLines: ['這場沒有人按「我說完一句了」。', 'Nobody tapped “I said a line” this scene.'],
    voidedTitle: ['這場取消了', 'Scene cancelled'], voidedHint: ['這場不計分。', 'No points for this scene.'],
    recapFouls: ['犯規紀錄', 'Fouls'], noFouls: ['整場沒有人犯規。', 'No fouls the whole scene.'],
    nextScene: ['下一場', 'Next scene'], nextSceneHint: ['任何玩家都能開始下一場。', 'Any player can start the next scene.'],
    watching: ['這場你是觀眾', 'You’re watching this scene'], watchingHint: ['下一場就會分到角色。', 'You’ll get a role in the next scene.'],
    legacyVote: ['這場已經結束，馬上公布結果。', 'The scene is over. The result is coming up.'], showResult: ['公布結果', 'Show the result'],
    close_cast: ['馬上開演', 'Start now'], close_scene: ['結束這場戲', 'End the scene'],
    extend_cast: ['多 15 秒', '+15 s'], extend_scene: ['加 1 分鐘', '+1 min'],
    sceneMinutes: ['每場長度', 'Scene length'], minutesN: ['{n} 分鐘', '{n} min'],
    unit: ['台詞語言', 'Lines are in'],
    shuffles: ['每場換字數幾次', 'Limit swaps per scene'], shufflesOff: ['不換', 'None'], shufflesOne: ['1 次', 'Once'], shufflesN: ['{n} 次', '{n} times'],
    pointsTitle: ['每句得分（依字數）', 'Points per line, by limit'],
    pointsHint: ['預設幾個字就幾分，字越多分越高。每個數字都能改（0–50）。', 'By default a line scores one point per word, so longer limits score more. Change any of them (0–50).'],
    pointsFor: ['{n} 字台詞每句得分', 'Points for a line with a limit of {n}'],
    pointsUnit: ['分', 'pts'],
    setupTitle: ['開演前的設定', 'Before the curtain'],
    rules_1: ['每場抽一個場景與角色。1 到 5 字較常見，可以重複；6 字偶爾出現，每次抽題最多一位。', 'Draw a scene and roles. Limits of 1–5 are common and may repeat; at most one actor occasionally draws six.'],
    rules_2: ['照畫面順序輪流即興說一句，每句都要剛好是自己的字數。沒有個人倒數，整場時間會繼續跑。', 'Take turns improvising one line, exactly your limit. There is no individual countdown; the scene clock keeps running.'],
    rules_3: ['輪到你說完一句，再按「說完了，下一位」，得到目前字數的分數並交棒。預設幾個字就幾分，可以在設定裡改。', 'On your turn, tap “Line done · next actor” after your line to score and hand over. By default one point per word; settings can change that.'],
    rules_4: ['演出中每個人會重新抽字數好幾次（預設 3 次），一定會換到不一樣的數字，換完記得看自己的新字數。', 'Everyone draws a new limit a few times during the scene (3 by default), always a different number. Check your new limit each time.'],
    rules_5: ['有人說錯字數，任何人都能在卡片上按他的「犯規」，只記次數不扣分。時間到就殺青，這場的分數加進總分。', 'If someone breaks their limit, anyone can tap Foul for them; it only counts. When time is up, the scene’s points go on the scoreboard.'],
    nobodyCast: ['等下一場開始…', 'Waiting for the next scene…'],
  };
  const t = C.translator('wordlimit', dict);
  const lang = C.lang;
  const ENGINE = () => typeof WORD_LIMIT_ENGINE !== 'undefined' ? WORD_LIMIT_ENGINE : null;
  const RULES = () => ENGINE()?.CONFIG || { sceneMinutes: [2, 3, 4, 5], units: ['words', 'chars'], shuffleCounts: [0, 1, 2, 3, 4], limitValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], pointsMax: 50 };
  const vibrate = pattern => { try { navigator.vibrate?.(pattern); } catch (_) {} };
  const nameOf = (view, n) => C.seatsOf(view).find(p => p.playerNum === n)?.name || t('player', { n });
  const names = (view, nums) => list(nums).map(n => nameOf(view, n)).join(lang() === 'zh' ? '、' : ', ');
  const unitWord = (n, unit) => t(`unit_${unit === 'chars' ? 'chars' : 'words'}_${Number(n) === 1 ? 'one' : 'many'}`);
  const limitText = (n, unit) => `${n} ${unitWord(n, unit)}`;
  const pts = n => t(Number(n) === 1 ? 'pt' : 'pts', { n: Number(n) || 0 });
  const linesText = n => t(Number(n) === 1 ? 'linesOne' : 'linesN', { n: Number(n) || 0 });
  const shufflesText = n => Number(n) ? t(Number(n) === 1 ? 'shufflesOne' : 'shufflesN', { n }) : t('shufflesOff');
  const FLASH_MS = 5200, WAS_MS = 9000, POP_MS = 2600;

  // ── original flat art (no <defs>, so many copies can coexist) ──────────
  const ART = {
    mark: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="15" fill="#3a1222"/><path d="M27 2H37L47 62H17Z" fill="#ffc247" opacity=".2"/><path d="M14 18h36a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H30l-9 8v-8h-7a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" fill="#f6f1e7"/><rect x="15" y="27" width="11" height="6" rx="3" fill="#3a1222"/><rect x="29" y="27" width="8" height="6" rx="3" fill="#3a1222"/><rect x="40" y="27" width="9" height="6" rx="3" fill="#ff6378"/></svg>`,
    whistle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11a5 5 0 0 1 5-5h9l3-2v6h-5.2A5.5 5.5 0 1 1 3 11z" fill="currentColor"/><circle cx="8.6" cy="11.4" r="2" fill="#2a0c16"/></svg>`,
    shuffle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c2 0 3.2.8 4.4 2.6l2.2 3.3c1.1 1.7 2.3 2.6 4.3 2.6H20m0 0-2.6-2.6M20 15.5 17.4 18M3 17h3.5c1.4 0 2.4-.4 3.3-1.2M20 7h-2.6c-1.4 0-2.4.4-3.3 1.2M20 7l-2.6-2.6M20 7l-2.6 2.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z" fill="currentColor"/></svg>`,
    mic: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  };

  // ── settings (Table controls on cards, setup and host controls) ───────
  // The points grid shows the limits a scene deals (1–6); points saved for
  // 7–10 by the earlier ladder version are kept but no longer shown.
  function limitsFor() {
    const engine = ENGINE();
    return (engine?.CONFIG.dealValues || [1, 2, 3, 4, 5, 6]).slice();
  }
  function pointsFields(settings) {
    const rules = RULES(), points = settings?.points || {};
    const cells = limitsFor().map(n => {
      const value = points[n] ?? n;
      return `<label class="wl-point"><span class="wl-point-limit" aria-hidden="true">${n}</span><input type="number" inputmode="numeric" min="0" max="${rules.pointsMax}" step="1" data-ct-set="pt-${n}" value="${esc(value)}" aria-label="${esc(t('pointsFor', { n }))}"><small aria-hidden="true">${esc(t('pointsUnit'))}</small></label>`;
    }).join('');
    return `<fieldset class="wl-points"><legend>${esc(t('pointsTitle'))}</legend><p class="wl-points-hint">${esc(t('pointsHint'))}</p><div class="wl-points-grid">${cells}</div></fieldset>`;
  }
  function readPoints(root) {
    const points = {};
    for (const input of root.querySelectorAll('[data-ct-set^="pt-"]')) {
      if (String(input.value).trim() === '') continue;
      points[input.dataset.ctSet.slice(3)] = Number(input.value);
    }
    return points;
  }
  function settingsForm(settings) {
    const rules = RULES();
    return `<div class="ct-settings">${C.field('sceneMinutes', rules.sceneMinutes, t('sceneMinutes'), settings.sceneMinutes ?? 3, n => t('minutesN', { n }))}${C.field('unit', rules.units, t('unit'), settings.unit || 'words', u => t('unitOption_' + u))}${C.field('shuffles', rules.shuffleCounts, t('shuffles'), settings.shuffles ?? 3, shufflesText)}</div>${pointsFields(settings)}`;
  }
  function readSettings(root) {
    const get = key => C.readField(root, key);
    return { sceneMinutes: Number(get('sceneMinutes').value), unit: get('unit').value, shuffles: Number(get('shuffles').value), points: readPoints(root) };
  }
  const controlsSpec = {
    t, timed: ['cast', 'scene'], confirmClose: ['scene'],
    closeLabel: phase => t('close_' + phase), extendLabel: phase => t('extend_' + phase),
    nextPick: null, settingsForm, readSettings,
  };

  // ── building blocks ───────────────────────────────────────────────────
  function timer(view, { big = false } = {}) {
    if (view.phase === 'paused') return `<span class="wl-clock${big ? ' is-big' : ''} is-paused">${esc(C.clock(view.remainingMs || 0))}</span>`;
    const scene = view.phase === 'scene', deadline = scene ? view.sceneEndsAt : view.deadline;
    if (!(deadline > 0)) return '';
    return `<span class="wl-clock${big ? ' is-big' : ''}" data-ct-deadline="${Number(deadline)}" data-ct-low="${scene ? 30000 : 5000}"${scene ? ` data-ct-total="${Number(view.sceneMs)}"` : ''}>—:—</span>`;
  }
  // When the limits swap next: a live countdown, a frozen one while paused.
  function nextSwap(view) {
    const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
    if (live !== 'scene' || !Number(view.planned)) return '';
    if (view.nextShuffleAt > 0) return `<p class="wl-swap"><span>${ART.shuffle}${esc(t('nextSwap'))}</span><b data-ct-deadline="${Number(view.nextShuffleAt)}" data-ct-low="5000">—:—</b></p>`;
    if (view.nextShuffleInMs != null) return `<p class="wl-swap"><span>${ART.shuffle}${esc(t('nextSwap'))}</span><b>${esc(C.clock(view.nextShuffleInMs))}</b></p>`;
    return `<p class="wl-swap is-done"><span>${ART.shuffle}${esc(t('noMoreSwaps'))}</span></p>`;
  }
  // compact: slug + title only; lineOnly: the situation alone (the stage's marquee already names the scene).
  function script(view, { compact = false, lineOnly = false } = {}) {
    const scene = view.scene; if (!scene) return '';
    const en = lang() === 'zh' ? '' : ' lang="en"';
    const head = lineOnly ? '' : `<p class="wl-slug"${en}>${esc(pick(scene.slug))}</p><h3 class="wl-script-title"${en}>${esc(pick(scene.title))}</h3>`;
    return `<article class="wl-script${compact ? ' is-compact' : ''}${lineOnly ? ' is-line' : ''}">${head}${compact ? '' : `<p class="wl-script-line"${en}>${esc(pick(scene.line))}</p>`}</article>`;
  }
  const roleName = role => role ? pick(role) : '';
  const roleWant = role => role ? pick(role.want) : '';
  // What a line at each dealt limit scores, as the shared screen's legend.
  function values(view) {
    const items = list(view.values);
    if (!items.length) return '';
    return `<section class="wl-values"><h4>${esc(t('valuesTitle'))}</h4><ul>${items.map(item => `<li><span class="wl-values-limit">${esc(limitText(item.limit, view.unit))}</span><b>+${Number(item.points)}</b></li>`).join('')}</ul></section>`;
  }
  function castList(view, { me = 0, foul = false, busy = false, big = false, points = false } = {}) {
    const order = list(view.speakingOrder);
    const rows = list(view.cast).slice().sort((a, b) => order.indexOf(a.playerNum) - order.indexOf(b.playerNum) || a.playerNum - b.playerNum);
    if (!rows.length) return `<p class="ct-soft">${esc(t('nobodyCast'))}</p>`;
    const event = view.event, shuffled = event?.kind === 'shuffle' ? Number(event.ts) + WAS_MS : 0;
    return `<ol class="wl-cast${big ? ' is-big' : ''}">${rows.map(row => {
      const n = row.playerNum, mine = n === me;
      const fouls = row.fouls ? `<span class="wl-fouls" title="${esc(t(row.fouls === 1 ? 'foulsOne' : 'foulsN', { n: row.fouls }))}">${ART.whistle}<b>${Number(row.fouls)}</b></span>` : '';
      const was = row.prev != null && shuffled ? `<small class="wl-was" data-ct-until="${shuffled}">${esc(t('wasLimit', { n: row.prev }))}</small>` : '';
      const score = points ? `<small class="wl-row-pts">${esc(pts(row.gained))}</small>` : '';
      const pop = points && row.lastLine ? `<small class="wl-pop" data-ct-until="${Number(row.lastLine.ts) + POP_MS}">+${Number(row.lastLine.points)}</small>` : '';
      const button = foul && row.active && !mine ? `<button type="button" class="wl-foul-btn" data-ct-action="foul" data-ct-arg-target="${n}"${busy ? ' disabled' : ''} aria-label="${esc(t('foulCall', { name: row.name || t('player', { n }) }))}">${ART.whistle}<span>${esc(t('foul'))}</span></button>` : '';
      return `<li class="wl-cast-row${mine ? ' is-me' : ''}${row.active ? '' : ' is-out'}${view.speaker === n && ['cast', 'scene', 'paused'].includes(view.phase) ? ' is-speaking' : ''}"><span class="wl-tile" aria-label="${esc(limitText(row.limit, view.unit))}"><b>${esc(row.limit ?? '–')}</b></span><span class="wl-cast-who"><strong>${esc(row.name || t('player', { n }))}${mine ? ` <em>${esc(t('you'))}</em>` : ''}${row.active ? '' : `<em class="wl-out-tag">${esc(t('sittingOut'))}</em>`}${score}${pop}${was}</strong><span>${esc(roleName(row.role))}<i> · ${esc(roleWant(row.role))}</i></span></span>${fouls}${button}</li>`;
    }).join('')}</ol>`;
  }
  // The letterboard: this seat's limit, as big as the screen allows.
  function board(view, me) {
    const unit = view.unit, limit = me.limit;
    const event = view.event, was = event?.kind === 'shuffle' && me.prev != null ? `<span class="wl-board-was" data-ct-until="${Number(event.ts) + WAS_MS}">${esc(t('wasLimit', { n: me.prev }))}</span>` : '';
    return `<section class="wl-board${event?.kind === 'shuffle' ? ' just-shuffled' : ''}" aria-label="${esc(t('yourLines'))}"><div class="wl-board-limit"><p class="wl-board-label">${esc(t('everyLine'))}</p><div class="wl-board-num"><b>${esc(limit ?? '–')}</b>${was}</div><p class="wl-board-unit">${esc(unitWord(limit, unit))}</p></div><div class="wl-board-role"><span>${esc(t('youPlay'))}</span><strong>${esc(roleName(me.role))}</strong><em>${esc(roleWant(me.role))}</em></div></section>`;
  }
  function floor(view, me = 0) {
    const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
    if (!['cast', 'scene'].includes(live)) return '';
    const speaker = view.speaker, mine = speaker != null && speaker === me;
    const title = live === 'cast' ? t('firstSpeaker') : mine ? t('yourTurn') : t('speakingNow');
    const next = view.nextSpeaker && view.nextSpeaker !== speaker ? `<small>${esc(t('nextSpeaker', { name: nameOf(view, view.nextSpeaker) }))}</small>` : '';
    return `<section class="wl-floor${mine && live === 'scene' ? ' is-mine' : ''}" data-wl-speaker="${speaker ?? ''}" data-wl-speaking-turn="${Number(view.speakingTurn) || 0}"><div><span>${esc(title)}</span><strong>${esc(speaker == null ? t('noSpeaker') : nameOf(view, speaker))}</strong>${next}</div><div class="wl-floor-clock"><span>${esc(t(live === 'cast' ? 'curtainIn' : 'sceneLeft'))}</span>${timer(view)}</div></section>`;
  }
  function sceneBrief(view) {
    if (!view.scene) return '';
    return `<article class="wl-scene-brief"><h3${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.title))}</h3><p${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.line))}</p></article>`;
  }
  // "I said a line": the actor's own scoring button, with a short cool-down.
  function lineZone(view, me, busy) {
    const live = view.phase === 'scene';
    if (!me.isSpeaker) return `<p class="wl-waiting">${esc(t('waitingTurn', { name: nameOf(view, view.speaker) }))}</p>`;
    return `<section class="wl-score"><button type="button" class="ct-button ct-primary wl-line-btn" data-ct-action="line" data-ct-arg-speaking-turn="${Number(view.speakingTurn) || 0}" data-ct-ready-at="${Number(me.lineReadyAt) || 0}"${busy || !me.canLine || !live ? ' disabled' : ''}>${ART.mic}<span>${esc(t('lineButton'))}</span><b>+${Number(me.worth) || 0}</b><small data-ct-cooldown></small></button><p class="wl-score-hint">${esc(t('lineHint'))}</p></section>`;
  }
  // A short-lived banner for the newest foul or shuffle (painted live by paintTimers).
  function flash(view, me = 0) {
    const event = view.event; if (!event || view.phase !== 'scene') return '';
    const until = Number(event.ts) + FLASH_MS;
    if (event.kind === 'foul') {
      const mine = event.target === me;
      return `<div class="wl-flash is-foul${mine ? ' is-mine' : ''}" data-ct-until="${until}" role="status">${ART.whistle}<strong>${esc(mine ? t('foulOnYou') : t('foulCall', { name: nameOf(view, event.target) }))}</strong>${event.by ? `<span>${esc(t('foulBy', { by: event.by === 0 ? t('hostView') : nameOf(view, event.by) }))}</span>` : ''}</div>`;
    }
    if (event.kind === 'shuffle') return `<div class="wl-flash is-shuffle" data-ct-until="${until}" role="status">${ART.shuffle}<strong>${esc(t('shuffleTitle'))}</strong><span>${esc(t('shuffleHint'))}</span></div>`;
    return '';
  }
  function foulRecap(view) {
    const rows = list(view.cast).filter(row => row.fouls > 0).sort((a, b) => b.fouls - a.fouls);
    if (!rows.length) return `<p class="wl-recap-line">${esc(t('noFouls'))}</p>`;
    return `<div class="wl-recap"><h4>${esc(t('recapFouls'))}</h4><ul>${rows.map(row => `<li><span>${esc(row.name || t('player', { n: row.playerNum }))}</span><span class="wl-fouls">${ART.whistle}<b>${Number(row.fouls)}</b></span></li>`).join('')}</ul></div>`;
  }
  // The end of a scene: who scored what, the top scorer in the spotlight.
  function wrapUp(view, me = 0) {
    const result = view.result;
    if (!result) return '';
    if (result.outcome?.voided) return `<section class="wl-wrapup is-void"><h2>${esc(t('voidedTitle'))}</h2><p>${esc(t('voidedHint'))}</p></section>`;
    const best = list(result.best), rows = list(view.cast).slice().sort((a, b) => b.gained - a.gained || b.lines - a.lines || a.playerNum - b.playerNum);
    const spotlight = best.length ? `<p class="wl-wrapup-top">${ART.star}<span>${esc(t('topScene'))}</span><strong>${esc(names(view, best))}</strong><b>${esc(pts(result.outcome?.top))}</b></p>` : `<p class="wl-wrapup-none">${esc(t('noLines'))}</p>`;
    const tally = rows.length ? `<h4>${esc(t('sceneRanking'))}</h4><ol class="wl-tally">${rows.map(row => `<li class="${best.includes(row.playerNum) ? 'is-top' : ''}${row.playerNum === me ? ' is-me' : ''}"><span>${esc(row.name || t('player', { n: row.playerNum }))}${row.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span><small>${esc(linesText(row.lines))}</small><b>+${Number(row.gained)}</b></li>`).join('')}</ol>` : '';
    return `<section class="wl-wrapup"><h2>${esc(t('wrapTitle'))}</h2>${spotlight}${best.includes(me) ? `<p class="wl-wrapup-you">${esc(t('youTop'))}</p>` : ''}${tally}</section>`;
  }

  // ── the shared stage (host page) ──────────────────────────────────────
  function stage(view) {
    if (!view) return '';
    if (view.phase === 'finished') return `<div class="wl-stage wl-phase-finished">${C.standings(view, t, 0)}</div>`;
    const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
    const paused = view.phase === 'paused' ? `<div class="wl-paused"><strong>${esc(t('paused'))}</strong><span>${esc(t('pausedHint'))}</span></div>` : '';
    const marquee = `<header class="wl-marquee"><div class="wl-marquee-text"><p class="wl-marquee-no">${esc(t('sceneN', { n: view.roundNo }))}</p>${view.scene ? `<h2 class="wl-marquee-title"${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.title))}</h2><p class="wl-slug"${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.slug))}</p>` : ''}</div>${live === 'cast' ? `<div class="wl-marquee-clock"><span>${esc(t('curtainIn'))}</span>${timer(view, { big: true })}</div>` : live === 'scene' ? `<div class="wl-marquee-clock is-ring" data-ct-ring><span>${esc(t('sceneLeft'))}</span>${timer(view, { big: true })}</div>` : ''}</header>`;
    if (view.phase === 'result') {
      return `<div class="wl-stage wl-phase-result">${marquee}<div class="wl-stage-main"><section class="wl-stage-left">${wrapUp(view, 0)}</section><section class="wl-stage-right">${foulRecap(view)}${castList(view, { big: true, points: true })}</section></div></div>`;
    }
    let left;
    if (live === 'vote') left = `<section class="wl-wrapup"><h2>${esc(t('wrapTitle'))}</h2><p>${esc(t('legacyVote'))}</p></section>`;
    else if (live === 'cast') left = `${floor(view)}${script(view, { lineOnly: true })}<p class="wl-stage-hint">${esc(t('castHint'))}</p>${values(view)}`;
    else left = `${floor(view)}${script(view, { lineOnly: true })}${nextSwap(view)}<p class="wl-stage-hint">${esc(t('stageScoreHint'))}</p>${values(view)}`;
    return `<div class="wl-stage wl-phase-${esc(view.phase)}${view.phase === 'paused' ? ' wl-from-' + esc(view.pausedFrom) : ''}">${paused}${marquee}${flash(view)}<div class="wl-stage-main"><section class="wl-stage-left">${left}</section><section class="wl-stage-right"><h3 class="wl-section-title">${esc(t('castTitle'))}</h3>${castList(view, { big: true, points: live === 'scene' })}</section></div></div>`;
  }

  // ── player card ───────────────────────────────────────────────────────
  class Card extends C.Card {
    constructor(element, options = {}) {
      super(element, Object.assign({ key: 'wl', prefix: 'wl', spec: controlsSpec }, options));
    }
    mount() {
      this.secondaryOpen = false;
      this.moreToggle = event => {
        if (event.target.matches?.('[data-wl-more]') && this.root.contains(event.target)) this.secondaryOpen = event.target.open;
      };
      this.root.addEventListener('toggle', this.moreToggle, true);
    }
    localKey() { return String(!!this.secondaryOpen); }
    theme(view) {
      if (view.phase === 'scene') return 'is-live';
      if (view.phase === 'result' && list(view.result?.best).includes(this.data.playerNum)) return 'is-top';
      return '';
    }
    onUpdate(previous, view) {
      if (previous && previous.roundNo !== view.roundNo) this.secondaryOpen = false;
      if (view.phase === 'scene' && view.me?.isSpeaker && previous &&
        (previous.phase !== 'scene' || previous.speaker !== view.speaker)) vibrate([70]);
      const event = view.event;
      if (!previous || !event || previous.sessionId !== view.sessionId || previous.event?.serial === event.serial) {
        if (previous && previous.roundNo !== view.roundNo && view.phase === 'cast' && view.me?.inRound) vibrate([60]);
        return;
      }
      if (event.kind === 'foul' && event.target === this.data.playerNum) vibrate([140, 60, 140]);
      else if (event.kind === 'shuffle') vibrate([60, 40, 60]);
    }
    head(data) {
      const view = data.wl;
      return `<div class="wl-card-head">${this.nameBanner(data)}${view.phase !== 'finished' ? `<span class="wl-chip">${esc(t('sceneN', { n: view.roundNo }))}</span>` : ''}</div>`;
    }
    secondary(view, me, number, busy) {
      return `<details class="wl-more" data-wl-more${this.secondaryOpen ? ' open' : ''}><summary><span>${esc(t('moreScene'))}</span><small>${esc(t('optionalDetails'))}</small></summary><div class="wl-more-content"><p class="wl-score-line">${esc(t('myScene', { lines: linesText(me.lines), points: pts(me.gained) }))}</p>${nextSwap(view)}${values(view)}<h4 class="wl-section-title">${esc(t('castTitle'))}</h4><p class="wl-score-hint">${esc(t('foulHint'))}</p>${castList(view, { me: number, foul: me.canFoul && view.phase === 'scene', busy, points: true })}${this.scoreline(view, number)}</div></details>`;
    }
    main(data) {
      const view = data.wl, me = view.me || {}, n = data.playerNum, busy = !!this.pending;
      if (view.phase === 'finished') return `${C.standings(view, t, n)}${me.canControl ? `<button type="button" class="ct-button ct-primary ct-wide" data-ct-action="restart"${busy ? ' disabled' : ''}>${esc(t('newGame'))}</button><p class="ct-soft ct-center">${esc(t('anyoneCanRestart'))}</p>` : this.back()}`;
      if (view.phase === 'result') return `${wrapUp(view, n)}${foulRecap(view)}${me.canNext ? `<button type="button" class="ct-button ct-primary ct-wide wl-next" data-ct-action="next"${busy ? ' disabled' : ''}>${esc(t('nextScene'))}</button><p class="ct-soft ct-center">${esc(t('nextSceneHint'))}</p>` : this.back()}`;
      if (!me.active) return `<div class="wl-note is-muted"><strong>${esc(t('sittingOutCard'))}</strong><span>${esc(t('sittingOutHint'))}</span></div>${this.back()}${sceneBrief(view)}${this.secondary(view, me, n, busy)}`;
      const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
      const paused = view.phase === 'paused' ? `<div class="wl-zone is-paused"><h3>${esc(t('paused'))}</h3>${timer(view)}<p>${esc(t('pausedHint'))}</p><button type="button" class="ct-button ct-primary" data-ct-action="resume"${busy ? ' disabled' : ''}>${esc(t('resume'))}</button></div>` : '';
      const mine = me.inRound ? board(view, me) : `<div class="wl-note is-muted"><strong>${esc(t('watching'))}</strong><span>${esc(t('watchingHint'))}</span></div>`;
      if (live === 'cast') {
        const zone = view.phase === 'paused' ? '' : `<div class="wl-zone-row"><button type="button" class="ct-button ct-primary" data-ct-action="close"${busy || !me.canBegin ? ' disabled' : ''}>${esc(t('startNow'))}</button><button type="button" class="ct-button" data-ct-action="reroll"${busy || !me.canReroll ? ' disabled' : ''}>${esc(t('rerollScene'))} · ${esc(t('rerollsLeft', { n: view.rerollsLeft }))}</button></div>`;
        return `${paused}${floor(view, n)}${mine}${sceneBrief(view)}${zone}${this.secondary(view, me, n, busy)}`;
      }
      if (live === 'scene') {
        return `${paused}${flash(view, n)}${floor(view, n)}${mine}${sceneBrief(view)}${me.inRound ? lineZone(view, me, busy) : ''}${this.secondary(view, me, n, busy)}`;
      }
      // A table saved by the earlier version may still be in its MVP vote.
      if (live === 'vote') return `${paused}<section class="wl-zone"><h3 class="wl-wrap-title">${esc(t('wrapTitle'))}</h3><p>${esc(t('legacyVote'))}</p>${me.canEndVote ? `<button type="button" class="ct-button ct-primary" data-ct-action="close"${busy ? ' disabled' : ''}>${esc(t('showResult'))}</button>` : ''}</section>`;
      return paused;
    }
    tail(data) {
      const view = data.wl;
      if (view.phase === 'finished') return '';
      return view.phase === 'result' ? this.scoreline(view, data.playerNum) : '';
    }
    destroy() { this.root.removeEventListener('toggle', this.moreToggle, true); super.destroy(); }
  }

  const SYNC = typeof CARD_TABLE !== 'undefined'
    ? CARD_TABLE.define({ game: 'wordlimit', key: 'wl', engine: () => WORD_LIMIT_ENGINE, extra: 'wordLimitControlToken', fields: ['target', 'settings', 'names', 'playerNum', 'active', 'speakingTurn'] })
    : null;
  return { t, dict, ART, Card, stage, SYNC, controlsSpec, settingsForm, readSettings, pointsFields, readPoints, limitsFor, shufflesText, limitText, unitWord };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WORD_LIMIT_UI;
