/* WORD LIMIT THEATER presentation: the shared stage (host page) and every
 * player card. It only reads WORD_LIMIT_ENGINE.view(). Nothing in this game is
 * secret, so the shared screen and the cards see the same public table; a card
 * adds its own `me` block (its role, limit and what it can tap). */
var WORD_LIMIT_UI = (() => {
  'use strict';
  const C = CARD_TABLE_UI;
  const { esc, list, obj, pick } = C;
  const dict = {
    brand: ['WORD LIMIT THEATER', 'WORD LIMIT THEATER'],
    subtitle: ['字數限定小劇場：每個人的台詞都有固定字數，一起把一場戲演完。', 'Every actor gets a word limit. Act out one scene together.'],
    pitch: ['每個人抽一個角色和一個字數。你說的每一句台詞都要剛好那麼多字：有人只能說一個字，有人得說滿八個。演到一半會來個劇情轉折，字數還會大風吹。', 'Everyone draws a role and a word limit. Every line you say must be exactly that long: one actor gets one word, another has to fill eight. Partway through, a plot twist lands and the limits swap.'],
    hostNote: ['角色和字數都是公開的，大家才能一起抓犯規。', 'Roles and limits are public, so everyone can catch a foul.'],
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
    castHint: ['看清楚自己的角色和字數。開演後直接用說的演。', 'Read your role and your limit. When the curtain goes up, just start talking.'],
    startNow: ['馬上開演', 'Start now'],
    rerollScene: ['換一個場景', 'Different scene'], rerollsLeft: ['還能換 {n} 次', '{n} left'],
    sceneLeft: ['這場還剩', 'left in the scene'],
    addTwist: ['丟一個劇情轉折', 'Drop a plot twist'],
    twistTitle: ['劇情轉折', 'Plot twist'], twistFrom: ['{name} 丟的', 'from {name}'], twistAuto: ['劇本安排', 'from the script'],
    earlierTwists: ['之前的轉折', 'Earlier twists'],
    shuffleTitle: ['字數大風吹！', 'Limits shuffled!'], shuffleHint: ['每個人的字數都換了，看一下你的新字數。', 'Everyone has a new limit. Check yours.'],
    wasLimit: ['原本 {n}', 'was {n}'],
    foul: ['犯規', 'Foul'], foulCall: ['{name} 犯規！', 'Foul on {name}!'], foulBy: ['{by} 吹哨', 'called by {by}'],
    foulOnYou: ['你被吹犯規了！', 'Foul on you!'],
    foulHint: ['有人說錯字數？按他的「犯規」。', 'Someone broke their limit? Tap their Foul.'],
    foulsN: ['犯規 {n} 次', '{n} fouls'], foulsOne: ['犯規 1 次', '1 foul'],
    wrapTitle: ['殺青！', 'That’s a wrap!'],
    voteTitle: ['投給這場的 MVP', 'Vote for the MVP'], voteHint: ['投給演得最好的人，不能投自己。', 'Pick the best performer. You can’t vote for yourself.'],
    skipVote: ['這次不投', 'Skip'], yourVote: ['你投給了 {name}', 'You voted for {name}'], youSkipped: ['你這次不投票', 'You skipped this vote'],
    changeVote: ['截止前都能改', 'You can change it until time is up'],
    votedCount: ['{cast}/{total} 人已投票', '{cast} of {total} have voted'],
    voteOnCards: ['大家在自己的卡片上投票。', 'Everyone votes on their own card.'],
    mvpTitle: ['本場 MVP', 'MVP of the scene'], noMvp: ['這場沒有人得票。', 'Nobody got a vote this time.'],
    votesOne: ['1 票', '1 vote'], votesN: ['{n} 票', '{n} votes'],
    youMvp: ['你是本場 MVP！', 'You’re the MVP!'],
    voidedTitle: ['這場取消了', 'Scene cancelled'], voidedHint: ['這場不計分。', 'No points for this scene.'],
    ballots: ['大家投給誰', 'Who voted for whom'], skipped: ['不投', 'skipped'],
    recapFouls: ['犯規紀錄', 'Fouls'], noFouls: ['整場沒有人犯規。', 'No fouls the whole scene.'],
    recapTwists: ['這場的劇情轉折', 'Plot twists in this scene'],
    nextScene: ['下一場', 'Next scene'], nextSceneHint: ['任何玩家都能開始下一場。', 'Any player can start the next scene.'],
    watching: ['這場你是觀眾', 'You’re watching this scene'], watchingHint: ['下一場就會分到角色。', 'You’ll get a role in the next scene.'],
    close_cast: ['馬上開演', 'Start now'], close_scene: ['結束這場戲', 'End the scene'], close_vote: ['結束投票', 'Close the vote'],
    extend_cast: ['多 15 秒', '+15 s'], extend_scene: ['加 1 分鐘', '+1 min'], extend_vote: ['多 15 秒', '+15 s'],
    sceneMinutes: ['每場長度', 'Scene length'], minutesN: ['{n} 分鐘', '{n} min'],
    unit: ['台詞語言', 'Lines are in'],
    twists: ['演到約三分之一，自動丟一個劇情轉折', 'Drop a plot twist about a third of the way in'],
    shuffle: ['演到約三分之二，所有人的字數大風吹', 'Swap everyone’s limits about two-thirds of the way in'],
    vote: ['演完投票選 MVP（每票 1 分）', 'Vote for an MVP after each scene (1 point per vote)'],
    setupTitle: ['開演前的設定', 'Before the curtain'],
    rules_1: ['每一場抽一個場景，每個人分到一個角色和一個字數。', 'Each scene deals everyone a role and a word limit.'],
    rules_2: ['開演後用說的即興演出。你說的每一句台詞，都要剛好是你的字數。', 'Improvise out loud. Every line you say must be exactly your limit.'],
    rules_3: ['有人說錯字數，任何人都能在卡片上按他的「犯規」。', 'If someone breaks their limit, anyone can tap Foul for them.'],
    rules_4: ['演到一半會來一個劇情轉折，之後所有人的字數大風吹。也可以自己丟轉折。', 'Partway through, a plot twist lands and then the limits swap. Anyone can drop more twists.'],
    rules_5: ['時間到就殺青，大家投票選 MVP，每得一票得 1 分。', 'When time is up, vote for the MVP. Each vote is worth one point.'],
    nobodyCast: ['等下一場開始…', 'Waiting for the next scene…'],
  };
  const t = C.translator('wordlimit', dict);
  const lang = C.lang;
  const RULES = () => typeof WORD_LIMIT_ENGINE !== 'undefined' ? WORD_LIMIT_ENGINE.CONFIG : { sceneMinutes: [2, 3, 4, 5], units: ['words', 'chars'] };
  const vibrate = pattern => { try { navigator.vibrate?.(pattern); } catch (_) {} };
  const nameOf = (view, n) => C.seatsOf(view).find(p => p.playerNum === n)?.name || t('player', { n });
  const names = (view, nums) => list(nums).map(n => nameOf(view, n)).join(lang() === 'zh' ? '、' : ', ');
  const unitWord = (n, unit) => t(`unit_${unit === 'chars' ? 'chars' : 'words'}_${Number(n) === 1 ? 'one' : 'many'}`);
  const limitText = (n, unit) => lang() === 'zh' ? `${n} ${unitWord(n, unit)}` : `${n} ${unitWord(n, unit)}`;
  const FLASH_MS = 5200, WAS_MS = 9000;

  // ── original flat art (no <defs>, so many copies can coexist) ──────────
  const ART = {
    mark: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="15" fill="#3a1222"/><path d="M27 2H37L47 62H17Z" fill="#ffc247" opacity=".2"/><path d="M14 18h36a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H30l-9 8v-8h-7a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" fill="#f6f1e7"/><rect x="15" y="27" width="11" height="6" rx="3" fill="#3a1222"/><rect x="29" y="27" width="8" height="6" rx="3" fill="#3a1222"/><rect x="40" y="27" width="9" height="6" rx="3" fill="#ff6378"/></svg>`,
    whistle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11a5 5 0 0 1 5-5h9l3-2v6h-5.2A5.5 5.5 0 1 1 3 11z" fill="currentColor"/><circle cx="8.6" cy="11.4" r="2" fill="#2a0c16"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 5 13.4h5.6L9.4 22 19 9.8h-5.8z" fill="currentColor"/></svg>`,
    shuffle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c2 0 3.2.8 4.4 2.6l2.2 3.3c1.1 1.7 2.3 2.6 4.3 2.6H20m0 0-2.6-2.6M20 15.5 17.4 18M3 17h3.5c1.4 0 2.4-.4 3.3-1.2M20 7h-2.6c-1.4 0-2.4.4-3.3 1.2M20 7l-2.6-2.6M20 7l-2.6 2.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z" fill="currentColor"/></svg>`,
  };

  // ── settings (Table controls on cards, setup and host controls) ───────
  function settingsForm(settings) {
    const rules = RULES();
    return `<div class="ct-settings">${C.field('sceneMinutes', rules.sceneMinutes, t('sceneMinutes'), settings.sceneMinutes ?? 3, n => t('minutesN', { n }))}${C.field('unit', rules.units, t('unit'), settings.unit || 'words', u => t('unitOption_' + u))}</div>${C.check('twists', settings.twists !== false, t('twists'))}${C.check('shuffle', settings.shuffle !== false, t('shuffle'))}${C.check('vote', settings.vote !== false, t('vote'))}`;
  }
  function readSettings(root) {
    const get = key => C.readField(root, key);
    return { sceneMinutes: Number(get('sceneMinutes').value), unit: get('unit').value, twists: !!get('twists').checked, shuffle: !!get('shuffle').checked, vote: !!get('vote').checked };
  }
  const controlsSpec = {
    t, timed: ['cast', 'scene', 'vote'], confirmClose: ['scene', 'vote'],
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
  // compact: slug + title only; lineOnly: the situation alone (the stage's marquee already names the scene).
  function script(view, { compact = false, lineOnly = false } = {}) {
    const scene = view.scene; if (!scene) return '';
    const en = lang() === 'zh' ? '' : ' lang="en"';
    const head = lineOnly ? '' : `<p class="wl-slug"${en}>${esc(pick(scene.slug))}</p><h3 class="wl-script-title"${en}>${esc(pick(scene.title))}</h3>`;
    return `<article class="wl-script${compact ? ' is-compact' : ''}${lineOnly ? ' is-line' : ''}">${head}${compact ? '' : `<p class="wl-script-line"${en}>${esc(pick(scene.line))}</p>`}</article>`;
  }
  const roleName = role => role ? pick(role) : '';
  const roleWant = role => role ? pick(role.want) : '';
  function castList(view, { me = 0, foul = false, busy = false, big = false } = {}) {
    const rows = list(view.cast).slice().sort((a, b) => (a.limit ?? 99) - (b.limit ?? 99) || a.playerNum - b.playerNum);
    if (!rows.length) return `<p class="ct-soft">${esc(t('nobodyCast'))}</p>`;
    const event = view.event, shuffled = event?.kind === 'shuffle' ? Number(event.ts) + WAS_MS : 0;
    return `<ol class="wl-cast${big ? ' is-big' : ''}">${rows.map(row => {
      const n = row.playerNum, mine = n === me;
      const fouls = row.fouls ? `<span class="wl-fouls" title="${esc(t(row.fouls === 1 ? 'foulsOne' : 'foulsN', { n: row.fouls }))}">${ART.whistle}<b>${Number(row.fouls)}</b></span>` : '';
      const was = row.prev != null && shuffled ? `<small class="wl-was" data-ct-until="${shuffled}">${esc(t('wasLimit', { n: row.prev }))}</small>` : '';
      const button = foul && row.active && !mine ? `<button type="button" class="wl-foul-btn" data-ct-action="foul" data-ct-arg-target="${n}"${busy ? ' disabled' : ''} aria-label="${esc(t('foulCall', { name: row.name || t('player', { n }) }))}">${ART.whistle}<span>${esc(t('foul'))}</span></button>` : '';
      return `<li class="wl-cast-row${mine ? ' is-me' : ''}${row.active ? '' : ' is-out'}"><span class="wl-tile" aria-label="${esc(limitText(row.limit, view.unit))}"><b>${esc(row.limit ?? '–')}</b></span><span class="wl-cast-who"><strong>${esc(row.name || t('player', { n }))}${mine ? ` <em>${esc(t('you'))}</em>` : ''}${row.active ? '' : `<em class="wl-out-tag">${esc(t('sittingOut'))}</em>`}${was}</strong><span>${esc(roleName(row.role))}<i> · ${esc(roleWant(row.role))}</i></span></span>${fouls}${button}</li>`;
    }).join('')}</ol>`;
  }
  // The letterboard: this seat's limit, as big as the screen allows.
  function board(view, me) {
    const unit = view.unit, limit = me.limit;
    const event = view.event, was = event?.kind === 'shuffle' && me.prev != null ? `<span class="wl-board-was" data-ct-until="${Number(event.ts) + WAS_MS}">${esc(t('wasLimit', { n: me.prev }))}</span>` : '';
    return `<section class="wl-board${event?.kind === 'shuffle' ? ' just-shuffled' : ''}" aria-label="${esc(t('yourLines'))}"><p class="wl-board-label">${esc(t('everyLine'))}</p><div class="wl-board-num"><b>${esc(limit ?? '–')}</b>${was}</div><p class="wl-board-unit">${esc(unitWord(limit, unit))}</p><p class="wl-board-role"><span>${esc(t('youPlay'))}</span><strong>${esc(roleName(me.role))}</strong><em>${esc(roleWant(me.role))}</em></p></section>`;
  }
  function twistCue(view, { stage = false } = {}) {
    const twists = list(view.twists);
    if (!twists.length) return '';
    const latest = twists[twists.length - 1], earlier = twists.slice(0, -1).reverse();
    const from = item => item.by ? t('twistFrom', { name: nameOf(view, item.by) }) : t('twistAuto');
    const fresh = view.event?.kind === 'twist' && view.event.id === latest.id ? Number(view.event.ts) + FLASH_MS : 0;
    return `<section class="wl-cue${fresh ? ' is-new' : ''}"${fresh ? ` data-ct-until="${fresh}"` : ''}><p class="wl-cue-label">${ART.bolt}<span>${esc(t('twistTitle'))}</span><small>${esc(from(latest))}</small></p><p class="wl-cue-text">${esc(pick(latest))}</p>${earlier.length ? `<details class="wl-cue-more"${stage ? ' open' : ''}><summary>${esc(t('earlierTwists'))} (${earlier.length})</summary><ul>${earlier.map(item => `<li>${esc(pick(item))}</li>`).join('')}</ul></details>` : ''}</section>`;
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
  // Folded on a card; open on the shared screen, where there is room for it.
  function ballotLines(view, { open = false } = {}) {
    const votes = Object.entries(obj(view.result?.votes));
    if (!votes.length) return '';
    return `<details class="wl-ballots"${open ? ' open' : ''}><summary>${esc(t('ballots'))}</summary><ul>${votes.map(([voter, target]) => `<li><span>${esc(nameOf(view, Number(voter)))}</span><span aria-hidden="true">→</span><strong>${esc(Number(target) > 0 ? nameOf(view, Number(target)) : t('skipped'))}</strong></li>`).join('')}</ul></details>`;
  }
  function foulRecap(view) {
    const rows = list(view.cast).filter(row => row.fouls > 0).sort((a, b) => b.fouls - a.fouls);
    if (!rows.length) return `<p class="wl-recap-line">${esc(t('noFouls'))}</p>`;
    return `<div class="wl-recap"><h4>${esc(t('recapFouls'))}</h4><ul>${rows.map(row => `<li><span>${esc(row.name || t('player', { n: row.playerNum }))}</span><span class="wl-fouls">${ART.whistle}<b>${Number(row.fouls)}</b></span></li>`).join('')}</ul></div>`;
  }
  // The shared screen's result keeps the story: every twist in the order it landed.
  function twistRecap(view) {
    const twists = list(view.twists);
    if (!twists.length) return '';
    return `<div class="wl-recap wl-recap-twists"><h4>${esc(t('recapTwists'))}</h4><ol>${twists.map(item => `<li><span>${esc(pick(item))}</span><small>${esc(item.by ? nameOf(view, item.by) : t('twistAuto'))}</small></li>`).join('')}</ol></div>`;
  }
  function mvpBlock(view, me = 0) {
    const result = view.result;
    if (!result) return '';
    if (result.outcome?.voided) return `<section class="wl-mvp is-void"><h2>${esc(t('voidedTitle'))}</h2><p>${esc(t('voidedHint'))}</p></section>`;
    const mvp = list(result.mvp);
    if (!mvp.length) return `<section class="wl-mvp is-none"><h2>${esc(t('wrapTitle'))}</h2><p>${esc(t('noMvp'))}</p></section>`;
    const votes = Number(result.outcome?.top) || 0;
    const mine = mvp.includes(me);
    return `<section class="wl-mvp"><p class="wl-mvp-label">${ART.star}<span>${esc(t('mvpTitle'))}</span></p><h2 class="wl-mvp-name">${esc(names(view, mvp))}</h2><p class="wl-mvp-votes">${esc(t(votes === 1 ? 'votesOne' : 'votesN', { n: votes }))} · +${votes}</p>${mine ? `<p class="wl-mvp-you">${esc(t('youMvp'))}</p>` : ''}</section>`;
  }

  // ── the shared stage (host page) ──────────────────────────────────────
  function stage(view) {
    if (!view) return '';
    if (view.phase === 'finished') return `<div class="wl-stage wl-phase-finished">${C.standings(view, t, 0)}</div>`;
    const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
    const paused = view.phase === 'paused' ? `<div class="wl-paused"><strong>${esc(t('paused'))}</strong><span>${esc(t('pausedHint'))}</span></div>` : '';
    const marquee = `<header class="wl-marquee"><div class="wl-marquee-text"><p class="wl-marquee-no">${esc(t('sceneN', { n: view.roundNo }))}</p>${view.scene ? `<h2 class="wl-marquee-title"${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.title))}</h2><p class="wl-slug"${lang() === 'zh' ? '' : ' lang="en"'}>${esc(pick(view.scene.slug))}</p>` : ''}</div>${live === 'cast' ? `<div class="wl-marquee-clock"><span>${esc(t('curtainIn'))}</span>${timer(view, { big: true })}</div>` : live === 'scene' ? `<div class="wl-marquee-clock is-ring" data-ct-ring><span>${esc(t('sceneLeft'))}</span>${timer(view, { big: true })}</div>` : live === 'vote' ? `<div class="wl-marquee-clock"><span>${esc(t('voteTitle'))}</span>${timer(view, { big: true })}</div>` : ''}</header>`;
    if (view.phase === 'result') {
      return `<div class="wl-stage wl-phase-result">${marquee}<div class="wl-stage-main"><section class="wl-stage-left">${mvpBlock(view, 0)}${ballotLines(view, { open: true })}${twistRecap(view)}</section><section class="wl-stage-right">${foulRecap(view)}${castList(view, { big: true })}</section></div></div>`;
    }
    let left;
    if (live === 'vote') left = `<section class="wl-wrap"><h2>${esc(t('wrapTitle'))}</h2><p>${esc(t('voteOnCards'))}</p>${view.ballots ? `<p class="wl-progress">${esc(t('votedCount', view.ballots))}</p>` : ''}</section>${twistCue(view, { stage: true })}`;
    else left = `${script(view, { lineOnly: true })}${live === 'cast' ? `<p class="wl-stage-hint">${esc(t('castHint'))}</p>` : twistCue(view, { stage: true })}`;
    return `<div class="wl-stage wl-phase-${esc(view.phase)}${view.phase === 'paused' ? ' wl-from-' + esc(view.pausedFrom) : ''}">${paused}${marquee}${flash(view)}<div class="wl-stage-main"><section class="wl-stage-left">${left}</section><section class="wl-stage-right"><h3 class="wl-section-title">${esc(t('castTitle'))}</h3>${castList(view, { big: true })}</section></div></div>`;
  }

  // ── player card ───────────────────────────────────────────────────────
  class Card extends C.Card {
    constructor(element, options = {}) {
      super(element, Object.assign({ key: 'wl', prefix: 'wl', spec: controlsSpec }, options));
    }
    theme(view) {
      if (view.phase === 'scene') return 'is-live';
      if (view.phase === 'result' && list(view.result?.mvp).includes(this.data.playerNum)) return 'is-mvp';
      return '';
    }
    onUpdate(previous, view) {
      const event = view.event;
      if (!previous || !event || previous.sessionId !== view.sessionId || previous.event?.serial === event.serial) {
        if (previous && previous.roundNo !== view.roundNo && view.phase === 'cast' && view.me?.inRound) vibrate([60]);
        return;
      }
      if (event.kind === 'foul' && event.target === this.data.playerNum) vibrate([140, 60, 140]);
      else if (event.kind === 'shuffle') vibrate([60, 40, 60]);
      else if (event.kind === 'twist') vibrate([40]);
    }
    head(data) {
      const view = data.wl;
      return `${this.nameBanner(data)}<div class="wl-card-head"><span class="wl-card-brand">${ART.mark}<span>${esc(t('brand'))}</span></span>${view.phase !== 'finished' ? `<span class="wl-chip">${esc(t('sceneN', { n: view.roundNo }))}</span>` : ''}</div>`;
    }
    main(data) {
      const view = data.wl, me = view.me || {}, n = data.playerNum, busy = !!this.pending;
      if (view.phase === 'finished') return `${C.standings(view, t, n)}${me.canControl ? `<button type="button" class="ct-button ct-primary ct-wide" data-ct-action="restart"${busy ? ' disabled' : ''}>${esc(t('newGame'))}</button><p class="ct-soft ct-center">${esc(t('anyoneCanRestart'))}</p>` : this.back()}`;
      if (view.phase === 'result') return `${mvpBlock(view, n)}${ballotLines(view)}${foulRecap(view)}${me.canNext ? `<button type="button" class="ct-button ct-primary ct-wide wl-next" data-ct-action="next"${busy ? ' disabled' : ''}>${esc(t('nextScene'))}</button><p class="ct-soft ct-center">${esc(t('nextSceneHint'))}</p>` : this.back()}`;
      if (!me.active) return `<div class="wl-note is-muted"><strong>${esc(t('sittingOutCard'))}</strong><span>${esc(t('sittingOutHint'))}</span></div>${this.back()}${script(view, { compact: true })}${castList(view, { me: n })}`;
      const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
      const paused = view.phase === 'paused' ? `<div class="wl-zone is-paused"><h3>${esc(t('paused'))}</h3>${timer(view)}<p>${esc(t('pausedHint'))}</p><button type="button" class="ct-button ct-primary" data-ct-action="resume"${busy ? ' disabled' : ''}>${esc(t('resume'))}</button></div>` : '';
      const mine = me.inRound ? board(view, me) : `<div class="wl-note is-muted"><strong>${esc(t('watching'))}</strong><span>${esc(t('watchingHint'))}</span></div>`;
      if (live === 'cast') {
        const zone = view.phase === 'paused' ? '' : `<div class="wl-zone"><p class="wl-zone-label">${esc(t('curtainIn'))}</p>${timer(view, { big: true })}<p>${esc(t('castHint'))}</p><div class="wl-zone-row"><button type="button" class="ct-button ct-primary" data-ct-action="close"${busy || !me.canBegin ? ' disabled' : ''}>${esc(t('startNow'))}</button><button type="button" class="ct-button" data-ct-action="reroll"${busy || !me.canReroll ? ' disabled' : ''}>${esc(t('rerollScene'))} · ${esc(t('rerollsLeft', { n: view.rerollsLeft }))}</button></div></div>`;
        return `${paused}${mine}${script(view)}${zone}<h4 class="wl-section-title">${esc(t('castTitle'))}</h4>${castList(view, { me: n })}`;
      }
      if (live === 'scene') {
        const twist = `<button type="button" class="ct-button wl-twist-btn" data-ct-action="twist" data-ct-ready-at="${Number(view.twistReadyAt) || 0}"${busy || !me.canTwist ? ' disabled' : ''}>${ART.bolt}<span>${esc(t('addTwist'))}</span><small data-ct-cooldown></small></button>`;
        return `${paused}${flash(view, n)}<div class="wl-status">${script(view, { compact: true })}<div class="wl-status-clock"><span>${esc(t('sceneLeft'))}</span>${timer(view)}</div></div>${mine}${twistCue(view)}<h4 class="wl-section-title">${esc(t('castTitle'))}<small>${esc(t('foulHint'))}</small></h4>${castList(view, { me: n, foul: me.canFoul && view.phase === 'scene', busy })}${view.phase === 'scene' ? twist : ''}`;
      }
      if (live === 'vote') {
        const targets = list(me.voteTargets);
        const castOf = p => list(view.cast).find(row => row.playerNum === p);
        const status = me.vote == null ? '' : `<p class="wl-vote-status">${esc(Number(me.vote) > 0 ? t('yourVote', { name: nameOf(view, me.vote) }) : t('youSkipped'))} · ${esc(t('changeVote'))}</p>`;
        const voting = me.canVote ? `<div class="wl-targets">${targets.map(p => `<button type="button" class="wl-target${me.vote === p ? ' is-chosen' : ''}" data-ct-action="vote" data-ct-arg-target="${p}"${busy ? ' disabled' : ''}><strong>${esc(nameOf(view, p))}</strong><span>${esc(roleName(castOf(p)?.role))}</span></button>`).join('')}</div><button type="button" class="ct-button ct-small wl-skip${me.vote === 0 ? ' is-chosen' : ''}" data-ct-action="vote" data-ct-arg-target="0"${busy ? ' disabled' : ''}>${esc(t('skipVote'))}</button>${status}` : `<p class="ct-soft">${esc(t('voteOnCards'))}</p>`;
        return `${paused}<section class="wl-zone is-vote"><h3 class="wl-wrap-title">${esc(t('wrapTitle'))}</h3><p class="wl-zone-label">${esc(t('voteTitle'))}</p>${view.phase === 'vote' ? timer(view) : ''}<p>${esc(t('voteHint'))}</p>${voting}${view.ballots ? `<p class="wl-progress">${esc(t('votedCount', view.ballots))}</p>` : ''}</section>`;
      }
      return paused;
    }
    tail(data) {
      const view = data.wl;
      if (view.phase === 'finished') return '';
      return this.scoreline(view, data.playerNum);
    }
  }

  const SYNC = typeof CARD_TABLE !== 'undefined'
    ? CARD_TABLE.define({ game: 'wordlimit', key: 'wl', engine: () => WORD_LIMIT_ENGINE, extra: 'wordLimitControlToken', fields: ['target', 'settings', 'names', 'playerNum', 'active'] })
    : null;
  return { t, dict, ART, Card, stage, SYNC, controlsSpec, settingsForm, readSettings, limitText, unitWord };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WORD_LIMIT_UI;
