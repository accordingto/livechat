/* ROOM SURVEY presentation: the shared board (host page) and every player
 * card. It only reads ROOM_SURVEY_ENGINE.view(): the shared screen never gets
 * the text of an answer before it is guessed; only the Keeper's own card (its
 * `me` block) carries the hidden answers, and never who wrote them. Guessing
 * is a buzz-in: one player at a time, from their own card. */
var ROOM_SURVEY_UI = (() => {
  'use strict';
  const C = CARD_TABLE_UI;
  const { esc, list, obj, pick } = C;
  const dict = {
    brand: ['ROOM SURVEY', 'ROOM SURVEY'],
    subtitle: ['全場大調查：大家寫的答案就是調查結果，越多人寫的答案越值錢。', 'Your room is the survey. Answers more people wrote are worth more.'],
    pitch: ['每一輪輪到一個人當關主並選題目，所有人（包括關主）偷偷寫答案。關主把一樣的答案疊起來，疊越多人名次越高。其他人在自己的卡片上搶答、用說的猜，猜中就拿到「寫這個答案的人數」那麼多分：名次越高，分數越多。系統知道誰寫了什麼，猜到自己寫的答案不算，那一格直接自爆。', 'Each round one player is the Keeper and picks a prompt. Everyone, the Keeper too, secretly writes answers. The Keeper stacks answers that mean the same; the bigger the stack, the higher it ranks. The others buzz in on their own cards and guess out loud. A hit scores one point per person who wrote it, so higher answers score more. The game knows who wrote what: guess your own answer and it burns.'],
    hostNote: ['分享畫面不會出現還沒猜中的答案，只有關主的卡片看得到。', 'The shared screen never shows an answer before it’s guessed. Only the Keeper’s card does.'],
    start: ['開始第一輪', 'Start the first round'],
    sampleAnswer: ['零食', 'Snacks'],
    keeper: ['關主', 'Keeper'], keeperIs: ['關主：{name}', 'Keeper: {name}'],
    youKeeper: ['你是這一輪的關主', 'You’re the Keeper this round'],
    keeperGoal: ['選題目、整理答案，再判定大家猜得對不對。這一輪你不用猜。', 'Pick the prompt, tidy the answers, then judge the guesses. You don’t guess this round.'],
    chooseTitle: ['選一個題目', 'Pick a prompt'],
    chooseHint: ['只有你看得到。挑一個大家容易寫出相同答案的題目。', 'Only you can see these. Pick one people will answer in similar ways.'],
    reroll: ['換三題', 'Show three others'], rerollsLeft: ['還能換 {n} 次', '{n} left'],
    writeOwn: ['自己出題', 'Write my own'], customLabel: ['你的題目', 'Your prompt'],
    customPlaceholder: ['例：每天早上一定會說的一句話', 'e.g. Something you say every morning'], customUse: ['用這一題', 'Use this prompt'],
    keeperChoosing: ['{name} 正在選題目…', '{name} is picking a prompt…'],
    getReady: ['等一下每個人要寫 {n} 個答案。', 'Get ready: everyone writes {n} answers.'], getReadyOne: ['等一下每個人要寫 1 個答案。', 'Get ready: everyone writes one answer.'],
    cat_mixed: ['綜合', 'Mixed'], cat_love: ['戀愛', 'Love & dating'], cat_life: ['生活', 'Everyday life'], cat_work: ['工作與學校', 'Work & school'],
    cat_food: ['吃喝', 'Food & drinks'], cat_phone: ['手機與網路', 'Phone & internet'], cat_secret: ['小秘密', 'Small secrets'], cat_whatif: ['如果…', 'What if'], cat_custom: ['自訂題', 'Custom'],
    writeTitle: ['寫下你的答案', 'Write your answers'],
    writeHint: ['每一格寫不一樣的答案，短短的就好。只有關主會看到答案，而且看不到是誰寫的。', 'Write a different answer in each box. Short ones are best. Only the Keeper sees the answers, and never who wrote what.'],
    dupNote: ['答案 {b} 和答案 {a} 一樣，請寫不同的答案。', 'Answer {b} is the same as answer {a}. Write something different.'],
    answerN: ['答案 {n}', 'Answer {n}'],
    send: ['送出答案', 'Send my answers'], resend: ['更新答案', 'Update my answers'],
    sent: ['已送出，時間到之前都能修改。', 'Sent. You can still edit until time is up.'],
    autoSend: ['時間到時，你打好的答案會自動送出。', 'When time is up, whatever you typed is sent for you.'],
    answeredCount: ['{n}/{total} 人寫好了', '{n} of {total} have answered'],
    writeLeft: ['作答時間', 'Time to write'],
    sortTitle: ['把一樣的答案疊起來', 'Stack the same answers'],
    sortHint: ['意思一樣的答案疊在一起：先點一張，再點它的雙胞胎。疊越多人，名次越高，猜中的分數也越多。', 'Stack answers that mean the same: tap one, then its twin. The more people on a stack, the higher it ranks and the more a hit scores.'],
    sortSelected: ['再點一張，把它疊上去；點同一張取消。', 'Now tap the slip to stack it on. Tap it again to cancel.'],
    stackHere: ['疊到這裡', 'Stack here'],
    split: ['拆開', 'Unstack'], drop: ['拿掉', 'Remove'], restore: ['放回來', 'Restore'],
    peopleOne: ['1 人', '1 person'], peopleN: ['{n} 人', '{n} people'],
    startGuess: ['開始猜', 'Start guessing'],
    keeperSorting: ['{name} 正在整理 {n} 個答案…', '{name} is tidying {n} answers…'],
    sortLeft: ['整理時間', 'Time to tidy'],
    yourAnswers: ['你寫的答案', 'Your answers'],
    ownRule: ['別說自己寫的答案：系統會判自爆，不給分。', 'Don’t say your own answers: they burn and score nothing.'],
    buzzButton: ['我知道一個！', 'I’ve got one!'],
    buzzHint: ['搶到之後，大聲說出一個你覺得大家會寫的答案。', 'Buzz in, then say out loud one answer you think people wrote.'],
    buzzOpen: ['搶答開放中', 'Buzzing is open'], stageBuzz: ['在自己的卡片上按「我知道一個！」搶答', 'Buzz in on your own card: “I’ve got one!”'],
    buzzing: ['{name} 搶到了', '{name} buzzed in'], buzzingWait: ['{name} 正在回答…', '{name} is answering…'],
    yourBuzz: ['你搶到了！', 'You buzzed in!'], yourBuzzHint: ['現在大聲說出你的答案。', 'Say your answer out loud now.'],
    notYours: ['別說你自己寫的：{list}', 'Not your own: {list}'],
    giveUp: ['算了，我放棄', 'Never mind'],
    queueButton: ['我也知道，排隊', 'Get in line'],
    queueHint: ['不用急，排進隊伍裡，輪到你時卡片會震動、開始計時。', 'No rush: join the line. When it’s your turn your card buzzes and your clock starts.'],
    inLineTitle: ['你排第 {n} 個', 'You’re #{n} in line'], inLineNext: ['下一個就是你', 'You’re next'],
    inLineHint: ['先想好答案。輪到你時卡片會震動、開始計時。', 'Get your answer ready. When it’s your turn your card buzzes and your clock starts.'],
    leaveLine: ['不排了', 'Leave the line'],
    queueLine: ['排隊中：{names}', 'In line: {names}'],
    lockedTitle: ['你剛剛猜過了', 'You just had a go'], lockedHint: ['等其他人也猜過一次，或有人猜中，就能再搶答。', 'You can buzz again once everyone else has had a go, or someone finds an answer.'],
    keeperWait: ['等有人搶答。這時也可以先給一個提示。', 'Wait for someone to buzz in. You can give a hint meanwhile.'],
    judgeHint: ['{name} 說的答案在榜上嗎？點那一格。', 'Is {name}’s answer on the board? Tap it.'],
    notOnBoard: ['榜上沒有', 'Not on the board'],
    confirmHit: ['{name} 說了「{text}」？', '{name} said “{text}”?'],
    confirmYes: ['對，翻開', 'Yes, reveal it'], cancel: ['取消', 'Cancel'],
    hint: ['給提示', 'Give a hint'], hintOn: ['點一格，公開它的第一個字', 'Tap a slip to show its first letter'],
    hintLabel: ['提示 {c}', 'Starts with {c}'],
    lengthChars: ['{n} 個字', '{n} characters'], lengthCharsOne: ['1 個字', '1 character'],
    lengthWords: ['{n} 個英文字', '{n} words'], lengthWordsOne: ['1 個英文字', '1 word'],
    rankLabel: ['第 {n} 名', 'Rank {n}'], worthLabel: ['猜中 +{n}', 'Worth +{n}'],
    boardTitle: ['調查結果', 'The board'],
    hitBy: ['{name} 猜中', '{name} got it'], ownBy: ['{name} 自爆', 'Burned by {name}'], leftOver: ['沒人猜到', 'Nobody got it'],
    guessLeft: ['猜題時間', 'Guessing time'],
    over_all: ['全部猜完了！', 'Board cleared!'], over_time: ['時間到！', 'Time’s up!'], over_host: ['這一輪結束', 'Round over'], over_nobody: ['沒有人可以猜了', 'Nobody is left to guess'],
    voided_few_answers: ['答案太少，這一輪不算。', 'Too few answers. This round doesn’t count.'],
    voided_keeper_left: ['關主離開了，這一輪不算。', 'The Keeper left. This round doesn’t count.'],
    voided_host: ['這一輪取消了，不計分。', 'Round cancelled. No points.'],
    roundPoints: ['這一輪得分', 'Points this round'], noPoints: ['這一輪沒有人得分。', 'Nobody scored this round.'],
    writtenBy: ['寫的人：{names}', 'Written by {names}'],
    lastResult: ['最近一次', 'Last guess'],
    log_hit: ['{name} 猜中「{text}」+{n}', '{name} found “{text}” +{n}'], log_own: ['{name} 猜到自己的答案「{text}」，自爆', '{name} guessed their own “{text}”: burned'],
    log_miss: ['{name} 沒猜中', '{name} missed'], log_pass: ['{name} 放棄了', '{name} gave up'], log_timeout: ['{name} 時間到', '{name} ran out of time'], log_skip: ['{name} 離開了', '{name} left'],
    nextKeeper: ['指定為下一位關主', 'Make next Keeper'], nextKeeperChosen: ['已指定為下一位關主', 'Next Keeper ✓'],
    nextKeeperLine: ['下一位關主：{name}', 'Next Keeper: {name}'], nextKeeperAuto: ['下一位關主：自動輪流', 'Next Keeper: automatic rotation'],
    close_write: ['結束作答', 'End writing'], close_sort: ['開始猜', 'Start guessing'], close_guess: ['結束這一輪', 'End the round'],
    extend_write: ['多 30 秒', '+30 s'], extend_sort: ['多 30 秒', '+30 s'], extend_guess: ['加 1 分鐘', '+1 min'],
    answers: ['每人答案數', 'Answers per person'],
    writeSeconds: ['作答時間', 'Writing time'], secondsN: ['{n} 秒', '{n} s'],
    guessMinutes: ['猜題時間', 'Guessing time'], minutesN: ['{n} 分鐘', '{n} min'],
    turnSeconds: ['搶到後的作答時間', 'Time to answer after buzzing'], turnOff: ['不限時', 'No limit'],
    category: ['題目類型', 'Prompt pack'],
    showAuthors: ['回合結束時，公開每個答案是誰寫的', 'When a round ends, show who wrote each answer'],
    showAuthorsHint: ['預設不公開，大家比較敢寫。', 'Off by default, so people write more freely.'],
    watching: ['這一輪你是觀眾', 'You’re watching this round'], watchingHint: ['下一輪就會加入。', 'You join from the next round.'],
    rules_1: ['每一輪輪流一個人當關主，選一個題目，例如「最不想被另一半看到的搜尋紀錄」。', 'Each round one player is the Keeper and picks a prompt, like “Something you’d hate your partner to see in your search history”.'],
    rules_2: ['所有人（包括關主）在自己的卡片上偷偷寫答案，每一格要寫不一樣的。沒有人看得到誰寫了什麼。', 'Everyone, the Keeper too, secretly writes answers on their card, a different one in each box. Nobody sees who wrote what.'],
    rules_3: ['關主把意思一樣的答案疊起來，疊越多人名次越高。', 'The Keeper stacks answers that mean the same. The more people on a stack, the higher it ranks.'],
    rules_4: ['其他人在自己的卡片上搶答，一次一人，用說的猜。別人在回答時也能按，會依序排隊，不用急。猜中就得到「寫這個答案的人數」那麼多分，名次越高分數越多。猜錯的人要等其他人也猜過一次才能再搶。', 'The others buzz in on their own cards and guess out loud, one at a time. Buzzing while someone is answering puts you in line, so there’s no rush. A hit scores one point per person who wrote it, so higher answers score more. After a miss, wait until everyone else has had a go.'],
    rules_5: ['系統知道誰寫了什麼：猜到自己寫的答案不算分，那一格直接自爆，誰都拿不到。', 'The game knows who wrote what: guess your own answer and it burns. Nobody scores it.'],
  };
  const t = C.translator('roomsurvey', dict);
  const lang = C.lang;
  const RULES = () => typeof ROOM_SURVEY_ENGINE !== 'undefined' ? ROOM_SURVEY_ENGINE.CONFIG : { answerCounts: [1, 2, 3], writeSeconds: [60, 90, 120, 180], guessMinutes: [3, 4, 5, 6, 8], turnSeconds: [0, 10, 15, 20, 30], categories: ['mixed'] };
  const normKey = text => typeof ROOM_SURVEY_ENGINE !== 'undefined' ? ROOM_SURVEY_ENGINE.normKey(text) : String(text || '').toLowerCase().trim();
  // The first pair of drafts that are the same answer ("Keys" and "keys!"), as 1-based numbers.
  function duplicatePair(drafts) {
    const seen = new Map();
    for (const [index, text] of drafts.entries()) {
      if (!text.trim()) continue;
      const key = normKey(text) || text.trim();
      if (seen.has(key)) return { a: seen.get(key) + 1, b: index + 1 };
      seen.set(key, index);
    }
    return null;
  }
  const vibrate = pattern => { try { navigator.vibrate?.(pattern); } catch (_) {} };
  const nameOf = (view, n) => C.seatsOf(view).find(p => p.playerNum === n)?.name || t('player', { n });
  const names = (view, nums) => list(nums).map(n => nameOf(view, n)).join(lang() === 'zh' ? '、' : ', ');
  const people = n => t(Number(n) === 1 ? 'peopleOne' : 'peopleN', { n });
  const lengthText = length => !length ? '' : length.unit === 'chars' ? t(length.n === 1 ? 'lengthCharsOne' : 'lengthChars', { n: length.n }) : t(length.n === 1 ? 'lengthWordsOne' : 'lengthWords', { n: length.n });
  const CJK = /[㐀-鿿豈-﫿]/;
  const slipLang = text => CJK.test(String(text || '')) ? 'zh-Hant' : 'en';
  const pts = n => t(Number(n) === 1 ? 'pt' : 'pts', { n: Number(n) || 0 });

  // ── tallies: 正 strokes in Chinese, five-bar gates in English ─────────
  function tally(count, { style = lang() === 'zh' ? 'zh' : 'en', size = 22 } = {}) {
    const n = Math.max(0, Math.min(15, Number(count) || 0));
    if (!n) return '';
    const groups = Math.ceil(n / 5), width = groups * 26 - 2;
    const lines = [];
    for (let g = 0; g < groups; g++) {
      const k = Math.min(5, n - g * 5), x = g * 26;
      if (style === 'zh') {
        const strokes = [[4, 4, 20, 4], [12, 4, 12, 20], [12, 12, 18, 12], [6, 12, 6, 20], [2, 20, 22, 20]];
        strokes.slice(0, k).forEach(([x1, y1, x2, y2]) => lines.push(`<path d="M${x + x1} ${y1}L${x + x2} ${y2}"/>`));
      } else {
        for (let i = 0; i < Math.min(4, k); i++) lines.push(`<path d="M${x + 3 + i * 5} 4L${x + 3 + i * 5} 20"/>`);
        if (k === 5) lines.push(`<path d="M${x + 1} 18L${x + 21} 6"/>`);
      }
    }
    return `<svg class="rs-tally" viewBox="0 0 ${width} 24" width="${Math.round(width * size / 24)}" height="${size}" role="img" aria-label="${esc(people(n))}"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">${lines.join('')}</g></svg>`;
  }

  const ART = {
    mark: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="15" fill="#173b33"/><rect x="11" y="13" width="34" height="40" rx="3" fill="#fbf6e9" transform="rotate(-6 28 33)"/><g fill="none" stroke="#24302b" stroke-width="3" stroke-linecap="round" transform="rotate(-6 28 33)"><path d="M17 22h22M28 22v18M28 31h7M20 31v9M15 40h26"/></g><circle cx="47" cy="45" r="11" fill="none" stroke="#d9463b" stroke-width="3.4"/><path d="M47 37v16M47 45h6" stroke="#d9463b" stroke-width="3.4" stroke-linecap="round"/></svg>`,
    stamp: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 5.5v13M12 12h4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 2c.6 3.3-1.5 4.8-3.2 6.7C7.7 10.5 6 12.4 6 15.2 6 19 8.9 22 12 22s6-2.6 6-6.6c0-2.6-1.3-4.3-2.6-5.6-.2 1.6-.9 2.6-2 3.2.6-3.8-.3-7.5-.9-11z" fill="currentColor"/></svg>`,
    bulb: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-3.7 11.9c.7.5 1.2 1.3 1.2 2.1v.5h5v-.5c0-.8.5-1.6 1.2-2.1A6.5 6.5 0 0 0 12 2.5zM9.5 19h5v1.2c0 .9-.8 1.6-1.7 1.6h-1.6c-.9 0-1.7-.7-1.7-1.6z" fill="currentColor"/></svg>`,
    cross: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  };

  // ── settings ──────────────────────────────────────────────────────────
  function settingsForm(settings) {
    const rules = RULES();
    return `<div class="ct-settings">${C.field('category', rules.categories, t('category'), settings.category || 'mixed', c => t('cat_' + c))}${C.field('answers', rules.answerCounts, t('answers'), settings.answers ?? 2, n => String(n))}${C.field('writeSeconds', rules.writeSeconds, t('writeSeconds'), settings.writeSeconds ?? 90, n => t('secondsN', { n }))}${C.field('guessMinutes', rules.guessMinutes, t('guessMinutes'), settings.guessMinutes ?? 4, n => t('minutesN', { n }))}${C.field('turnSeconds', rules.turnSeconds, t('turnSeconds'), settings.turnSeconds ?? 15, n => Number(n) ? t('secondsN', { n }) : t('turnOff'))}</div>${C.check('showAuthors', !!settings.showAuthors, t('showAuthors'), t('showAuthorsHint'))}`;
  }
  function readSettings(root) {
    const get = key => C.readField(root, key);
    return { category: get('category').value, answers: Number(get('answers').value), writeSeconds: Number(get('writeSeconds').value),
      guessMinutes: Number(get('guessMinutes').value), turnSeconds: Number(get('turnSeconds').value), showAuthors: !!get('showAuthors').checked };
  }
  const controlsSpec = {
    t, timed: ['write', 'sort', 'guess'], confirmClose: ['write', 'guess'],
    closeLabel: phase => t('close_' + phase), extendLabel: phase => t('extend_' + phase),
    nextPick: {
      get label() { return t('nextKeeper'); }, get chosen() { return t('nextKeeperChosen'); }, get auto() { return t('nextKeeperAuto'); },
      line: (view, n) => t('nextKeeperLine', { name: nameOf(view, n) }), current: view => view.nextKeeper ?? null,
    },
    settingsForm, readSettings,
  };

  // ── building blocks ───────────────────────────────────────────────────
  function clockAt(deadline, { big = false, low = 10000, total = 0 } = {}) {
    if (!(deadline > 0)) return '';
    return `<span class="rs-clock${big ? ' is-big' : ''}" data-ct-deadline="${Number(deadline)}" data-ct-low="${low}"${total ? ` data-ct-total="${Number(total)}"` : ''}>—:—</span>`;
  }
  function pausedClock(ms) { return `<span class="rs-clock is-paused">${esc(C.clock(ms || 0))}</span>`; }
  function prompt(view, { big = false } = {}) {
    const q = view.question; if (!q) return '';
    const text = q.custom ? q.en : pick(q);
    const other = !q.custom && lang() === 'zh' ? q.en : '';
    return `<section class="rs-prompt${big ? ' is-big' : ''}"><p class="rs-prompt-label">${esc(t(q.custom ? 'cat_custom' : 'cat_' + (q.cat || view.category || 'mixed')))}</p><h2 class="rs-prompt-text" lang="${slipLang(text)}">${esc(text)}</h2>${other ? `<p class="rs-prompt-en" lang="en">${esc(other)}</p>` : ''}</section>`;
  }
  function tile(view, item, { keeper = false, selected = '', hintMode = false, busy = false, big = false } = {}) {
    const revealed = item.revealed, hasText = item.text != null, show = !!revealed || (view.phase === 'result' || view.phase === 'finished');
    const classes = ['rs-tile', revealed ? 'is-' + revealed.how : 'is-hidden', keeper && !revealed ? 'is-keeper' : '', selected === item.id ? 'is-selected' : ''].filter(Boolean).join(' ');
    const rank = `<span class="rs-rank" aria-label="${esc(t('rankLabel', { n: item.rank }))}">${Number(item.rank)}</span>`;
    const meta = `<span class="rs-tile-meta">${tally(item.count)}<small>${esc(people(item.count))}</small>${revealed ? '' : `<b class="rs-worth">${esc(t('worthLabel', { n: item.points ?? item.count }))}</b>`}</span>`;
    let body;
    if (show || (keeper && hasText)) {
      const stamp = revealed ? (revealed.how === 'hit' ? `<span class="rs-stamp is-hit">${ART.stamp}<span>${esc(t('hitBy', { name: nameOf(view, revealed.by) }))} +${Number(revealed.points)}</span></span>`
        : revealed.how === 'own' ? `<span class="rs-stamp is-own">${ART.flame}<span>${esc(t('ownBy', { name: nameOf(view, revealed.by) }))}</span></span>`
        : `<span class="rs-stamp is-left"><span>${esc(t('leftOver'))}</span></span>`) : '';
      const authors = item.authors ? `<span class="rs-authors">${esc(t('writtenBy', { names: names(view, item.authors) }))}</span>` : '';
      body = `<span class="rs-tile-text" lang="${slipLang(item.text)}">${esc(item.text)}</span>${stamp}${authors}`;
    } else {
      body = `<span class="rs-tile-hidden">${item.hint ? `<b class="rs-hint">${esc(t('hintLabel', { c: item.hint }))}</b>` : ''}<span class="rs-length">${esc(lengthText(item.length))}</span></span>`;
    }
    const inner = `${rank}<span class="rs-tile-body">${body}</span>${meta}`;
    // The Keeper taps a tile to judge a buzz, or to give a hint.
    if (keeper && !revealed && view.phase === 'guess' && (hintMode || view.buzz)) return `<li><button type="button" class="${classes}${hintMode ? ' is-hinting' : ''}" data-ct-ui="tile" data-tile="${esc(item.id)}"${busy ? ' disabled' : ''}>${inner}${item.hint ? `<span class="rs-hinted">${ART.bulb}${esc(item.hint)}</span>` : ''}</button></li>`;
    return `<li class="${classes}${big ? ' is-big' : ''}">${inner}</li>`;
  }
  function board(view, items, options = {}) {
    if (!list(items).length) return '';
    return `<ol class="rs-board${options.big ? ' is-big' : ''}" aria-label="${esc(t('boardTitle'))}">${list(items).map(item => tile(view, item, options)).join('')}</ol>`;
  }
  // Who holds the buzz right now (or that buzzing is open), with their answer clock.
  function buzzBanner(view, me = 0) {
    const buzz = view.buzz;
    if (!buzz) return `<div class="rs-turn is-open"><span class="rs-turn-name">${esc(me ? t('buzzOpen') : t('stageBuzz'))}</span></div>`;
    const mine = buzz.playerNum === me;
    const clock = view.phase === 'paused' ? (buzz.leftMs ? pausedClock(buzz.leftMs) : '') : clockAt(buzz.endsAt, { low: 5000 });
    const queue = list(view.queue);
    const line = queue.length ? `<span class="rs-turn-queue">${esc(t('queueLine', { names: names(view, queue) }))}</span>` : '';
    return `<div class="rs-turn${mine ? ' is-mine' : ''}${line ? ' has-queue' : ''}"><span class="rs-turn-name">${esc(mine ? t('yourBuzz') : t('buzzing', { name: nameOf(view, buzz.playerNum) }))}</span>${clock ? `<span class="rs-turn-clock">${clock}</span>` : ''}${line}</div>`;
  }
  // Every guesser with their points this round; a locked one waits for the others.
  function guessersList(view) {
    const keeper = view.keeper, buzzing = view.buzz?.playerNum, locked = new Set(list(view.locked)), queue = list(view.queue);
    const seats = C.seatsOf(view).filter(p => p.inRound && p.playerNum !== keeper);
    return `<ol class="rs-order">${seats.map(p => {
      const n = p.playerNum, points = obj(view.roundPoints)[n];
      const place = queue.indexOf(n) + 1;
      return `<li class="${n === buzzing ? 'is-now' : ''}${place ? ' is-queued' : ''}${locked.has(n) ? ' is-locked' : ''}${p.active === false ? ' is-out' : ''}">${place ? `<i class="rs-place" aria-hidden="true">${place}</i>` : ''}<span>${esc(nameOf(view, n))}</span>${points ? `<b>+${Number(points)}</b>` : ''}</li>`;
    }).join('')}</ol>`;
  }
  function lastLog(view) {
    const entry = list(view.log).slice(-1)[0];
    if (!entry || !['guess', 'paused'].includes(view.phase)) return '';
    const text = t('log_' + entry.result, { name: nameOf(view, entry.playerNum), text: entry.text || '', n: entry.points ?? (list(view.board).find(item => item.text === entry.text)?.revealed?.points) ?? '' });
    return `<p class="rs-log is-${esc(entry.result)}" data-ct-until="${Number(entry.ts) + 6000}">${esc(text)}</p>`;
  }
  function overTitle(view) {
    const result = view.result;
    if (result?.outcome?.voided) return { title: t('over_host'), sub: t('voided_' + (result.outcome.reason || 'host')) };
    return { title: t('over_' + (result?.endReason || 'host')), sub: '' };
  }
  function roundPoints(view) {
    const entries = Object.entries(obj(view.result?.points || view.roundPoints)).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (view.result?.outcome?.voided) return '';
    if (!entries.length) return `<p class="rs-points-none">${esc(t('noPoints'))}</p>`;
    return `<div class="rs-points"><h4>${esc(t('roundPoints'))}</h4><ul>${entries.map(([n, v]) => `<li><span>${esc(nameOf(view, Number(n)))}</span><b>+${Number(v)}</b></li>`).join('')}</ul></div>`;
  }
  function myAnswers(me, { open = false } = {}) {
    const answers = list(me?.myAnswers);
    if (!answers.length) return '';
    return `<details class="rs-mine"${open ? ' open' : ''}><summary>${esc(t('yourAnswers'))}<small>${answers.length}</small></summary><ul>${answers.map(text => `<li lang="${slipLang(text)}">${esc(text)}</li>`).join('')}</ul><p>${esc(t('ownRule'))}</p></details>`;
  }

  // ── the shared board (host page) ──────────────────────────────────────
  function stage(view) {
    if (!view) return '';
    if (view.phase === 'finished') return `<div class="rs-stage rs-phase-finished">${C.standings(view, t, 0)}</div>`;
    const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
    const paused = view.phase === 'paused' ? `<div class="rs-paused"><strong>${esc(t('paused'))}</strong><span>${esc(t('pausedHint'))}</span></div>` : '';
    const head = `<header class="rs-stage-head"><span class="rs-stage-round">${esc(t('roundN', { n: view.roundNo }))}</span><span class="rs-stage-keeper">${esc(t('keeperIs', { name: nameOf(view, view.keeper) }))}</span></header>`;
    let body = '';
    if (live === 'choose') body = `<div class="rs-stage-wait"><p class="rs-wait-line">${esc(t('keeperChoosing', { name: nameOf(view, view.keeper) }))}</p><p class="ct-soft">${esc(t(view.answersPer === 1 ? 'getReadyOne' : 'getReady', { n: view.answersPer }))}</p></div>`;
    else if (live === 'write') {
      const w = view.writing || { submitted: [], total: 0, writers: [] };
      const clock = view.phase === 'paused' ? pausedClock(view.remainingMs) : clockAt(view.deadline, { big: true, total: view.writeMs });
      body = `${prompt(view, { big: true })}<div class="rs-stage-write"><div class="rs-ring" data-ct-ring>${clock}</div><div class="rs-stage-writers"><p class="rs-wait-line">${esc(t('answeredCount', { n: w.submitted.length, total: w.total }))}</p><ul class="rs-chips">${list(w.writers).map(n => `<li class="${list(w.submitted).includes(n) ? 'is-done' : ''}">${esc(nameOf(view, n))}</li>`).join('')}</ul><p class="ct-soft">${esc(t('writeHint'))}</p></div></div>`;
    } else if (live === 'sort') {
      const clock = view.phase === 'paused' ? pausedClock(view.remainingMs) : clockAt(view.deadline, { low: 15000 });
      body = `${prompt(view, { big: true })}<div class="rs-stage-wait"><div class="rs-shuffle-slips" aria-hidden="true"><i></i><i></i><i></i></div><p class="rs-wait-line">${esc(t('keeperSorting', { name: nameOf(view, view.keeper), n: view.sorting?.answers || 0 }))}</p>${clock}</div>`;
    } else if (live === 'guess') {
      const clock = view.phase === 'paused' ? pausedClock(view.guessLeftMs) : clockAt(view.guessEndsAt, { low: 30000 });
      body = `${prompt(view)}<div class="rs-stage-bar">${buzzBanner(view)}<span class="rs-stage-clock"><small>${esc(t('guessLeft'))}</small>${clock}</span></div>${lastLog(view)}${board(view, view.board, { big: true })}${guessersList(view)}`;
    } else if (view.phase === 'result') {
      const over = overTitle(view);
      body = `${prompt(view)}<div class="rs-over"><h2>${esc(over.title)}</h2>${over.sub ? `<p>${esc(over.sub)}</p>` : ''}</div>${board(view, view.board, { big: true })}${roundPoints(view)}`;
    }
    return `<div class="rs-stage rs-phase-${esc(view.phase)}${view.phase === 'paused' ? ' rs-from-' + esc(view.pausedFrom) : ''}">${paused}${head}${body}</div>`;
  }

  // ── player card ───────────────────────────────────────────────────────
  class Card extends C.Card {
    constructor(element, options = {}) {
      super(element, Object.assign({ key: 'rs', prefix: 'rs', spec: controlsSpec }, options));
      this.selectedGroup = ''; this.selectedTile = ''; this.hintMode = false; this.customOpen = false;
      this.drafts = ['', '', '']; this.sentDrafts = null; this.autoSent = false; this.draftRound = null;
    }
    // Inputs live outside the re-rendered regions, so typing is never interrupted.
    mount(extra) {
      extra.innerHTML = `<form class="rs-compose" data-rs-answers hidden novalidate><div class="rs-compose-head"><h3 data-rs-title></h3><p data-rs-hint></p></div><div class="rs-compose-fields" data-rs-fields></div><p class="rs-compose-dup" data-rs-dup role="alert" hidden></p><button type="submit" class="ct-button ct-primary ct-wide" data-rs-send></button><p class="rs-compose-note" data-rs-note></p></form><form class="rs-custom" data-rs-custom hidden novalidate><label><span data-rs-custom-label></span><input type="text" maxlength="100" autocomplete="off" enterkeyhint="done" data-rs-custom-input></label><button type="submit" class="ct-button ct-primary" data-rs-custom-use></button></form>`;
      this.answersForm = extra.querySelector('[data-rs-answers]');
      this.fields = extra.querySelector('[data-rs-fields]');
      this.customForm = extra.querySelector('[data-rs-custom]');
      this.customInput = extra.querySelector('[data-rs-custom-input]');
      this.fields.innerHTML = [0, 1, 2].map(i => `<label class="rs-field" data-rs-field="${i}"><span data-rs-label="${i}"></span><input type="text" maxlength="40" autocomplete="off" enterkeyhint="${i < 2 ? 'next' : 'send'}" data-rs-input="${i}"></label>`).join('');
      this.inputs = [...this.fields.querySelectorAll('[data-rs-input]')];
      this.typing = event => {
        const index = Number(event.target.dataset.rsInput);
        if (Number.isInteger(index)) { this.drafts[index] = event.target.value; this.sync(); }
      };
      this.fields.addEventListener('input', this.typing);
      this.answersForm.addEventListener('submit', event => { event.preventDefault(); this.sendAnswers(); });
      this.customForm.addEventListener('submit', event => {
        event.preventDefault();
        const text = this.customInput.value.trim();
        if (text) this.action('custom', { text });
      });
    }
    get count() { return Math.max(1, Math.min(3, Number(this.view?.answersPer) || 2)); }
    currentDrafts() { return this.drafts.slice(0, this.count).map(text => text.trim()).filter(Boolean); }
    // Two boxes with the same answer ("Keys" and "keys!") are not allowed.
    duplicate() { return duplicatePair(this.drafts.slice(0, this.count)); }
    sendAnswers({ auto = false } = {}) {
      let answers = this.currentDrafts();
      if (!answers.length) { this.error = this.t('empty'); this.keys = {}; this.render(); return Promise.resolve(false); }
      if (this.duplicate()) {
        // When time runs out, the repeat is left out rather than losing every answer.
        if (!auto) { this.sync(); return Promise.resolve(false); }
        const seen = new Set();
        answers = answers.filter(text => { const key = normKey(text) || text; if (seen.has(key)) return false; seen.add(key); return true; });
      }
      return this.action('submit', { answers }).then(ok => { if (ok) this.sentDrafts = answers.join('\n'); this.sync(); return ok; });
    }
    localKey() { return JSON.stringify([this.selectedGroup, this.selectedTile, this.hintMode, this.customOpen]); }
    theme(view) {
      const me = view.me || {}, live = view.phase === 'paused' ? view.pausedFrom : view.phase;
      if (live === 'guess' && me.myBuzz) return 'is-turn';
      if (me.isKeeper && ['choose', 'sort', 'guess'].includes(live)) return 'is-keeper';
      return '';
    }
    onUpdate(previous, view) {
      const me = view.me || {};
      if (!previous || previous.sessionId !== view.sessionId || previous.roundNo !== view.roundNo) {
        this.selectedGroup = ''; this.selectedTile = ''; this.hintMode = false; this.customOpen = false;
        if (this.draftRound !== `${view.sessionId}:${view.roundNo}`) {
          this.draftRound = `${view.sessionId}:${view.roundNo}`;
          // A reload mid-round brings back what this seat already sent.
          const mine = list(me.myAnswers);
          this.drafts = [0, 1, 2].map(i => mine[i] || '');
          this.sentDrafts = mine.length ? mine.join('\n') : null;
          this.inputs?.forEach((input, i) => { if (document.activeElement !== input) input.value = this.drafts[i]; });
          this.customInput.value = '';
        }
      }
      if (previous && previous.stage !== view.stage) { this.autoSent = false; this.selectedTile = ''; this.hintMode = false; }
      if (previous?.buzz?.serial !== view.buzz?.serial) this.selectedTile = '';
      // The Keeper's phone buzzes when someone buzzes in; the buzzer's when it is theirs.
      const fresh = view.phase === 'guess' && view.buzz && previous?.buzz?.serial !== view.buzz.serial;
      if (fresh && (view.buzz.playerNum === this.data.playerNum || me.isKeeper)) vibrate([90, 40, 90]);
      if (previous && previous.roundNo !== view.roundNo && me.isKeeper) vibrate([60]);
    }
    ui(name, element) {
      const view = this.view; if (!view) return;
      if (name === 'slip') {
        const id = element.dataset.group;
        if (!this.selectedGroup) this.selectedGroup = id;
        else if (this.selectedGroup === id) this.selectedGroup = '';
        else { const from = this.selectedGroup; this.selectedGroup = ''; this.action('merge', { from, into: id }); return; }
      } else if (name === 'tile') {
        const id = element.dataset.tile;
        if (this.hintMode) { this.hintMode = false; this.action('hint', { group: id }); return; }
        if (!view.buzz) return;
        this.selectedTile = this.selectedTile === id ? '' : id;
      } else if (name === 'unselect') this.selectedTile = '';
      else if (name === 'hint') { this.hintMode = !this.hintMode; this.selectedTile = ''; }
      else if (name === 'custom') { this.customOpen = !this.customOpen; }
      this.keys = {}; this.render();
      if (name === 'custom' && this.customOpen) setTimeout(() => this.customInput.focus(), 0);
    }
    sync() {
      const view = this.view, me = view?.me || {};
      const writing = !!view && view.phase === 'write' && me.canSubmit;
      this.answersForm.hidden = !writing;
      if (writing) {
        const title = this.answersForm.querySelector('[data-rs-title]'), hint = this.answersForm.querySelector('[data-rs-hint]');
        if (title.textContent !== t('writeTitle')) title.textContent = t('writeTitle');
        if (hint.textContent !== t('writeHint')) hint.textContent = t('writeHint');
        this.inputs.forEach((input, i) => {
          const field = this.fields.querySelector(`[data-rs-field="${i}"]`);
          field.hidden = i >= this.count;
          const label = field.querySelector('[data-rs-label]');
          const text = this.count === 1 ? t('writeTitle') : t('answerN', { n: i + 1 });
          if (label.textContent !== text) label.textContent = text;
          input.disabled = !!this.pending;
          if (input.value !== this.drafts[i] && document.activeElement !== input) input.value = this.drafts[i];
        });
        const send = this.answersForm.querySelector('[data-rs-send]');
        const current = this.currentDrafts().join('\n'), sent = me.submitted && this.sentDrafts != null;
        const dup = this.duplicate(), warning = this.answersForm.querySelector('[data-rs-dup]');
        const dupText = dup ? t('dupNote', dup) : '';
        if (warning.textContent !== dupText) warning.textContent = dupText;
        warning.hidden = !dup;
        this.inputs.forEach((input, i) => {
          const bad = !!dup && i + 1 === dup.b;
          input.classList.toggle('is-dup', bad);
          if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        });
        send.textContent = me.submitted ? t('resend') : t('send');
        send.disabled = !!this.pending || !current || !!dup || (sent && current === this.sentDrafts);
        const note = this.answersForm.querySelector('[data-rs-note]');
        const noteText = me.submitted ? t('sent') : t('autoSend');
        if (note.textContent !== noteText) note.textContent = noteText;
        note.classList.toggle('is-sent', !!me.submitted);
      }
      const custom = !!view && view.phase === 'choose' && me.isKeeper && this.customOpen;
      this.customForm.hidden = !custom;
      if (custom) {
        const label = this.customForm.querySelector('[data-rs-custom-label]'), use = this.customForm.querySelector('[data-rs-custom-use]');
        if (label.textContent !== t('customLabel')) label.textContent = t('customLabel');
        if (this.customInput.placeholder !== t('customPlaceholder')) this.customInput.placeholder = t('customPlaceholder');
        use.textContent = t('customUse'); use.disabled = !!this.pending;
      }
    }
    // Whatever is typed goes in by itself just before the writing time ends.
    paintExtra(now) {
      const view = this.view, me = view?.me || {};
      if (!view || view.phase !== 'write' || !me.canSubmit || this.autoSent || this.pending || !(view.deadline > 0)) return;
      if (view.deadline - now > 1600) return;
      const current = this.currentDrafts().join('\n');
      if (!current || (me.submitted && current === this.sentDrafts)) return;
      this.autoSent = true;
      this.sendAnswers({ auto: true });
    }
    head(data) {
      const view = data.rs;
      return `${this.nameBanner(data)}<div class="rs-card-head"><span class="rs-card-brand">${ART.mark}<span>${esc(t('brand'))}</span></span>${view.phase !== 'finished' ? `<span class="rs-chip">${esc(t('roundN', { n: view.roundNo }))}</span>` : ''}</div>`;
    }
    main(data) {
      const view = data.rs, me = view.me || {}, n = data.playerNum, busy = !!this.pending;
      if (view.phase === 'finished') return `${C.standings(view, t, n)}${me.canControl ? `<button type="button" class="ct-button ct-primary ct-wide" data-ct-action="restart"${busy ? ' disabled' : ''}>${esc(t('newGame'))}</button><p class="ct-soft ct-center">${esc(t('anyoneCanRestart'))}</p>` : this.back()}`;
      if (view.phase === 'result') {
        const over = overTitle(view), mine = obj(view.result?.points)[n];
        return `${prompt(view)}<div class="rs-over"><h2>${esc(over.title)}</h2>${over.sub ? `<p>${esc(over.sub)}</p>` : ''}${mine ? `<p class="rs-over-you">+${Number(mine)}</p>` : ''}</div>${board(view, view.board)}${roundPoints(view)}${me.canNext ? `<button type="button" class="ct-button ct-primary ct-wide" data-ct-action="next"${busy ? ' disabled' : ''}>${esc(t('nextRound'))}</button>` : this.back()}`;
      }
      if (!me.active) return `<div class="rs-note is-muted"><strong>${esc(t('sittingOutCard'))}</strong><span>${esc(t('sittingOutHint'))}</span></div>${this.back()}${prompt(view)}`;
      const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
      const paused = view.phase === 'paused' ? `<div class="rs-zone is-paused"><h3>${esc(t('paused'))}</h3>${pausedClock(view.remainingMs)}<p>${esc(t('pausedHint'))}</p><button type="button" class="ct-button ct-primary" data-ct-action="resume"${busy ? ' disabled' : ''}>${esc(t('resume'))}</button></div>` : '';
      const role = me.isKeeper ? `<div class="rs-role"><span class="rs-role-art">${ART.stamp}</span><span><strong>${esc(t('youKeeper'))}</strong><small>${esc(t('keeperGoal'))}</small></span></div>` : '';
      if (!me.inRound) return `${paused}<div class="rs-note is-muted"><strong>${esc(t('watching'))}</strong><span>${esc(t('watchingHint'))}</span></div>${prompt(view)}${live === 'guess' ? board(view, view.board) : ''}`;
      if (live === 'choose') {
        if (me.isKeeper && me.options) {
          const options = list(me.options).map(option => `<button type="button" class="rs-option" data-ct-action="pick" data-ct-arg-question-id="${esc(option.id)}"${busy ? ' disabled' : ''}><small>${esc(t('cat_' + option.cat))}</small><strong lang="${lang() === 'zh' ? 'zh-Hant' : 'en'}">${esc(pick(option))}</strong>${lang() === 'zh' ? `<span lang="en">${esc(option.en)}</span>` : ''}</button>`).join('');
          return `${role}<section class="rs-zone is-choose"><h3>${esc(t('chooseTitle'))}</h3><p>${esc(t('chooseHint'))}</p><div class="rs-options">${options}</div><div class="rs-zone-row"><button type="button" class="ct-button ct-small" data-ct-action="reroll"${busy || !me.rerollsLeft ? ' disabled' : ''}>${esc(t('reroll'))} · ${esc(t('rerollsLeft', { n: me.rerollsLeft }))}</button><button type="button" class="ct-button ct-small" data-ct-ui="custom" aria-expanded="${this.customOpen}">${esc(t('writeOwn'))}</button></div></section>`;
        }
        return `<div class="rs-zone"><p class="rs-wait-line">${esc(t('keeperChoosing', { name: nameOf(view, view.keeper) }))}</p><p>${esc(t(view.answersPer === 1 ? 'getReadyOne' : 'getReady', { n: view.answersPer }))}</p></div>`;
      }
      if (live === 'write') {
        const w = view.writing || { submitted: [], total: 0 };
        const clock = view.phase === 'paused' ? '' : clockAt(view.deadline, { low: 15000 });
        return `${paused}${role}${prompt(view)}<div class="rs-status"><span>${esc(t('answeredCount', { n: list(w.submitted).length, total: w.total }))}</span>${clock ? `<span class="rs-status-clock"><small>${esc(t('writeLeft'))}</small>${clock}</span>` : ''}</div>`;
      }
      if (live === 'sort') {
        const clock = view.phase === 'paused' ? '' : clockAt(view.deadline, { low: 15000 });
        if (me.isKeeper && me.groups) {
          const groups = list(me.groups);
          const slips = groups.map(group => {
            const selected = this.selectedGroup === group.id, target = this.selectedGroup && !selected && !group.dropped;
            const variants = list(group.variants);
            const place = group.dropped ? '<span class="rs-slip-rank is-empty" aria-hidden="true"></span>' : `<span class="rs-slip-rank" aria-label="${esc(t('rankLabel', { n: group.rank }))}">${Number(group.rank)}</span>`;
            return `<li class="rs-sort-row${group.dropped ? ' is-dropped' : ''}"><button type="button" class="rs-slip${selected ? ' is-selected' : ''}${target ? ' is-target' : ''}" data-ct-ui="slip" data-group="${esc(group.id)}"${busy || group.dropped ? ' disabled' : ''}>${place}<span class="rs-slip-body"><span class="rs-slip-text" lang="${slipLang(group.text)}">${esc(group.text)}</span>${variants.length ? `<span class="rs-slip-variants">${variants.map(text => `<span lang="${slipLang(text)}">${esc(text)}</span>`).join('')}</span>` : ''}${target ? `<span class="rs-stack-here">${esc(t('stackHere'))}</span>` : ''}</span><span class="rs-slip-count">${tally(group.count, { size: 18 })}<small>${esc(people(group.count))}</small>${group.dropped ? '' : `<b class="rs-worth">${esc(t('worthLabel', { n: group.points }))}</b>`}</span></button><span class="rs-sort-tools">${variants.length ? `<button type="button" class="ct-button ct-small" data-ct-action="split" data-ct-arg-group="${esc(group.id)}"${busy ? ' disabled' : ''}>${esc(t('split'))}</button>` : ''}<button type="button" class="ct-button ct-small" data-ct-action="drop" data-ct-arg-group="${esc(group.id)}" data-ct-arg-dropped="${!group.dropped}"${busy ? ' disabled' : ''}>${esc(t(group.dropped ? 'restore' : 'drop'))}</button></span></li>`;
          }).join('');
          return `${paused}${role}${prompt(view)}<section class="rs-zone is-sort"><div class="rs-zone-top"><h3>${esc(t('sortTitle'))}</h3>${clock}</div><p class="rs-sort-hint${this.selectedGroup ? ' is-active' : ''}">${esc(this.selectedGroup ? t('sortSelected') : t('sortHint'))}</p><ol class="rs-sort">${slips}</ol><button type="button" class="ct-button ct-primary ct-wide" data-ct-action="startGuess"${busy ? ' disabled' : ''}>${esc(t('startGuess'))}</button></section>`;
        }
        return `${paused}${prompt(view)}<div class="rs-zone"><div class="rs-shuffle-slips" aria-hidden="true"><i></i><i></i><i></i></div><p class="rs-wait-line">${esc(t('keeperSorting', { name: nameOf(view, view.keeper), n: view.sorting?.answers || 0 }))}</p>${clock}</div>${myAnswers(me, { open: true })}`;
      }
      if (live === 'guess') {
        const buzz = view.buzz, guessClock = view.phase === 'paused' ? '' : clockAt(view.guessEndsAt, { low: 30000 });
        const top = `<div class="rs-status">${buzzBanner(view, n)}${guessClock ? `<span class="rs-status-clock"><small>${esc(t('guessLeft'))}</small>${guessClock}</span>` : ''}</div>`;
        const open = view.phase === 'guess';
        if (me.isKeeper && me.board) {
          const selected = list(me.board).find(item => item.id === this.selectedTile && !item.revealed);
          const buzzer = buzz ? nameOf(view, buzz.playerNum) : '';
          const confirm = selected && buzz && open ? `<div class="rs-confirm"><p>${esc(t('confirmHit', { name: buzzer, text: selected.text }))}</p><div class="rs-zone-row"><button type="button" class="ct-button ct-primary" data-ct-action="hit" data-ct-arg-group="${esc(selected.id)}" data-ct-arg-buzz="${Number(buzz.serial)}"${busy ? ' disabled' : ''}>${esc(t('confirmYes'))}</button><button type="button" class="ct-button" data-ct-ui="unselect">${esc(t('cancel'))}</button></div></div>` : '';
          const miss = buzz && open ? `<button type="button" class="ct-button rs-miss" data-ct-action="miss" data-ct-arg-buzz="${Number(buzz.serial)}"${busy ? ' disabled' : ''}>${ART.cross}<span>${esc(t('notOnBoard'))}</span></button>` : '';
          const tools = open ? `<div class="rs-judge">${miss}<button type="button" class="ct-button ct-small${this.hintMode ? ' is-on' : ''}" data-ct-ui="hint" aria-pressed="${this.hintMode}">${ART.bulb}<span>${esc(this.hintMode ? t('hintOn') : t('hint'))}</span></button></div>` : '';
          const guide = open ? `<p class="rs-judge-hint">${esc(buzz ? t('judgeHint', { name: buzzer }) : t('keeperWait'))}</p>` : '';
          return `${paused}${top}${lastLog(view)}${guide}${confirm}${board(view, me.board, { keeper: true, selected: this.selectedTile, hintMode: this.hintMode, busy })}${tools}${prompt(view)}`;
        }
        let zone = '';
        if (open && me.myBuzz) {
          const mine = list(me.myAnswers);
          zone = `<div class="rs-zone is-turn"><h3>${esc(t('yourBuzz'))}</h3><p>${esc(t('yourBuzzHint'))}</p>${mine.length ? `<p class="rs-not-yours">${esc(t('notYours', { list: mine.join(lang() === 'zh' ? '、' : ', ') }))}</p>` : ''}<button type="button" class="ct-button ct-small" data-ct-action="pass" data-ct-arg-buzz="${Number(buzz.serial)}"${busy ? ' disabled' : ''}>${esc(t('giveUp'))}</button></div>`;
        } else if (open && me.queuePos) {
          const answering = buzz ? `<p class="rs-wait-line">${esc(t('buzzingWait', { name: nameOf(view, buzz.playerNum) }))}</p>` : '';
          zone = `<div class="rs-zone is-queued"><h3>${esc(me.queuePos === 1 ? t('inLineNext') : t('inLineTitle', { n: me.queuePos }))}</h3>${answering}<p>${esc(t('inLineHint'))}</p><button type="button" class="ct-button ct-small" data-ct-action="unqueue"${busy ? ' disabled' : ''}>${esc(t('leaveLine'))}</button></div>`;
        } else if (open && me.locked) zone = `<div class="rs-zone is-locked"><h3>${esc(t('lockedTitle'))}</h3><p>${esc(t('lockedHint'))}</p></div>`;
        else if (open && me.isGuesser) {
          const answering = buzz ? `<p class="rs-wait-line">${esc(t('buzzingWait', { name: nameOf(view, buzz.playerNum) }))}</p>` : '';
          zone = `<div class="rs-zone is-buzz${buzz ? ' is-line' : ''}">${answering}<button type="button" class="rs-buzz" data-ct-action="buzz"${busy || !me.canBuzz ? ' disabled' : ''}><span class="rs-buzz-icon" aria-hidden="true">🙋</span><span>${esc(t(buzz ? 'queueButton' : 'buzzButton'))}</span></button><p>${esc(t(buzz ? 'queueHint' : 'buzzHint'))}</p></div>`;
        } else if (open && buzz) zone = `<div class="rs-zone is-waiting"><p class="rs-wait-line">${esc(t('buzzingWait', { name: nameOf(view, buzz.playerNum) }))}</p></div>`;
        return `${paused}${top}${zone}${lastLog(view)}${prompt(view)}${board(view, view.board)}${myAnswers(me)}`;
      }
      return paused;
    }
    tail(data) {
      const view = data.rs;
      if (view.phase === 'finished') return '';
      return this.scoreline(view, data.playerNum);
    }
    // While guessing, points found this round count in the running totals.
    scoreline(view, me) {
      const live = view.phase === 'paused' ? view.pausedFrom : view.phase;
      if (live !== 'guess') return super.scoreline(view, me);
      const extra = obj(view.roundPoints);
      const standings = list(view.standings).map(row => Object.assign({}, row, { score: row.score + (Number(extra[row.playerNum]) || 0) }))
        .sort((a, b) => b.score - a.score || a.playerNum - b.playerNum);
      return super.scoreline(Object.assign({}, view, { standings }), me);
    }
    destroy() {
      this.fields?.removeEventListener('input', this.typing);
      super.destroy();
    }
  }

  const SYNC = typeof CARD_TABLE !== 'undefined'
    ? CARD_TABLE.define({ game: 'roomsurvey', key: 'rs', engine: () => ROOM_SURVEY_ENGINE, extra: 'roomSurveyControlToken',
      fields: ['questionId', 'text', 'answers', 'from', 'into', 'group', 'dropped', 'buzz', 'settings', 'names', 'playerNum', 'active'] })
    : null;
  return { t, dict, ART, Card, stage, SYNC, controlsSpec, settingsForm, readSettings, tally, lengthText };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ROOM_SURVEY_UI;
