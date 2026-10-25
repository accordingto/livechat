/* WORD WOLF — restrained secret-object cards and public deduction table. */
var WORD_WOLF_UI = (() => {
  'use strict';
  const C = CARD_TABLE_UI, { esc, list } = C;
  const dict = {
    brand: ['WORD WOLF', 'WORD WOLF'], pitch: ['看起來一樣的字卡，藏著一個不同答案。', 'Similar cards. One different answer.'],
    setupLead: ['大多數人拿到同一張，只有一個人不同。', 'Most players share one card. One player has a different one.'],
    start: ['發出第一組字卡', 'Deal the first cards'], category: ['字卡題包', 'Card pack'],
    cat_mixed: ['全部原版詞組 · 80 組', 'All original pairs · 80'], cat_objects: ['日常物品 · 21 組', 'Everyday objects · 21'],
    cat_food: ['食物 · 9 組', 'Food · 9'], cat_other: ['其他原版詞組 · 50 組', 'Other original pairs · 50'],
    packHint: ['預設日常物品；也可以玩食物或原版全部 80 組。', 'Everyday objects by default. Food and all 80 original pairs are also available.'],
    secret: ['你的祕密卡', 'YOUR SECRET CARD'], keepSecret: ['別直接說出名稱，也別展示給其他人。', 'Describe it. Keep its name and your card to yourself.'],
    unknownRole: ['你也不知道自己是不是拿到不同答案的人。', 'You don’t know whether your answer is the different one.'],
    describe: ['先描述，再找出不同的人。', 'Describe first. Find the different card.'],
    describeHint: ['用一句話說用途、感覺或會出現的場合，聽聽別人的描述。', 'Give one clue about its use, feel or setting. Listen to the others.'],
    pick: ['隨機點名', 'Pick someone'], picked: ['輪到 {name} 描述', '{name} gives the next clue'],
    openVote: ['開始投票', 'Open the vote'], vote: ['誰的答案和大家不同？', 'Who has the different answer?'],
    voteHint: ['投給一位其他玩家。大家投完後一起揭曉。', 'Pick another player. Reveal together when everyone has voted.'],
    voteProgress: ['{n}／{total} 人已投票', '{n} / {total} votes in'], votedFor: ['你投給 {name}；揭曉前可以改票。', 'You picked {name}. You can change before the reveal.'],
    voted: ['已選擇', 'Selected'], reveal: ['公開投票結果', 'Reveal the votes'],
    win_majority: ['找到了！不同的字卡被抓到了。', 'Found it. The different card was caught.'],
    win_odd: ['藏過去了！大家指錯了人。', 'A good disguise. The different card escaped.'],
    win_tie: ['票數平手，這輪沒有定出勝負。', 'A tied vote. No winner this round.'],
    win_cancelled: ['這輪已取消，下一輪重新發卡。', 'Round cancelled. Deal again when everyone is ready.'],
    majorityCard: ['大多數人的卡', 'THE SHARED CARD'], differentCard: ['不同的卡', 'THE DIFFERENT CARD'],
    odd: ['不同的卡', 'Different card'], majority: ['相同的卡', 'Shared card'],
    nextPair: ['下一組物品', 'Next pair'], resultDetail: ['查看每個人的卡與票數', 'Cards and votes'],
    voteCount: ['{n} 票', '{n} votes'], noVote: ['未投票', 'No vote'],
    roundN: ['第 {n} 輪', 'ROUND {n}'], playersMore: ['玩家與描述提示', 'Players & clue tips'],
    tableLead: ['祕密答案只在各自的卡片上。', 'Secret answers stay on each player’s own card.'],
    noScores: ['每組獨立找人，沒有額外累積分數。', 'Each pair is a fresh deduction. No extra points to track.'],
    restartConfirm: ['再按一次重新發卡（保留已抽題目記錄）', 'Tap again to redeal; keep pair history'],
    rule1: ['每人看自己的字卡。大多數人相同，只有一個人不同；誰也不知道自己是不是那一個。', 'Read only your own card. Most share an answer; one is different. Nobody is told which group they are in.'],
    rule2: ['輪流描述，不能直接念名稱。也可以隨機點名，大家都會被抽到再開始下一圈。', 'Give clues without saying the name. Use Pick someone to cycle through everyone in random order.'],
    rule3: ['開始投票後，各自選一位其他玩家；大家投完就公開卡片與票數。', 'Open the vote and pick another player. Once everyone has voted, all cards and ballots are revealed.'],
    rule4: ['唯一最高票的人若拿不同卡，大多數人獲勝；否則不同卡的人獲勝。平手沒有勝負，直接玩下一組。', 'If the one most-voted player holds the different card, the majority wins; otherwise that player escapes. Ties have no winner. Try the next pair.'],
  };
  const t = C.translator('wordwolf', dict);
  const art = id => typeof WORD_WOLF_ART !== 'undefined' ? WORD_WOLF_ART.item(id) : '';
  const nameOf = (v, n) => list(v.roster).find(p => p.playerNum === n)?.name || t('player', { n });
  function itemCard(item, title, compact = false) {
    if (!item) return '';
    const image = art(item.id);
    return `<section class="ww-item-card${compact ? ' is-compact' : ''}${image ? '' : ' is-type-only'}" data-ww-item="${esc(item.id)}"><p class="ww-eyebrow">${esc(title)}</p>${image}<h2 lang="en">${esc(item.en)}</h2>${C.lang() === 'zh' ? `<p class="ww-item-zh" lang="zh-Hant">${esc(item.zh)}</p>` : ''}</section>`;
  }
  function players(v, me = 0) {
    return `<ul class="ww-players">${list(v.roster).map(p => `<li class="${v.picked === p.playerNum ? 'is-picked' : ''}${p.active ? '' : 'is-out'}"><span>${esc(p.name || t('player', { n: p.playerNum }))}${p.playerNum === me ? ` <em>${esc(t('you'))}</em>` : ''}</span>${!p.active ? `<small>${esc(t('sittingOut'))}</small>` : v.picked === p.playerNum ? '<span class="ww-floor-dot" aria-hidden="true"></span>' : ''}</li>`).join('')}</ul>`;
  }
  function resultHTML(v) {
    const result = v.result;
    if (!result) return '';
    return `<section class="ww-outcome"><p class="ww-eyebrow">${esc(t('roundN', { n: v.roundNo }))}</p><h2>${esc(t('win_' + result.winner))}</h2></section><div class="ww-pair">${itemCard(result.majority, t('majorityCard'), true)}${itemCard(result.different, t('differentCard'), true)}</div><details class="ww-more"><summary>${esc(t('resultDetail'))}</summary><ol class="ww-results">${list(result.cards).map(card => `<li><div><strong>${esc(nameOf(v, card.playerNum))}</strong><span>${esc(card.item.en)}${C.lang() === 'zh' ? ` · ${esc(card.item.zh)}` : ''}</span></div><span class="ww-badge${card.odd ? ' is-odd' : ''}">${esc(t(card.odd ? 'odd' : 'majority'))}</span><span>${esc(t('voteCount', { n: result.counts[card.playerNum] || 0 }))}</span><small>${result.votes[card.playerNum] ? esc('→ ' + nameOf(v, result.votes[card.playerNum])) : esc(t('noVote'))}</small></li>`).join('')}</ol></details>`;
  }
  function stage(v) {
    if (!v) return '';
    if (v.phase === 'finished') return `<section class="ww-stage ww-ended"><h2>${esc(t('finished'))}</h2><p>${esc(t('noScores'))}</p></section>`;
    if (v.phase === 'result') return `<section class="ww-stage">${resultHTML(v)}</section>`;
    const phase = v.phase === 'paused' ? v.pausedFrom : v.phase;
    return `<section class="ww-stage"><p class="ww-eyebrow">${esc(t('roundN', { n: v.roundNo }))}</p><h2>${esc(t(v.phase === 'paused' ? 'paused' : phase === 'vote' ? 'vote' : 'describe'))}</h2><p class="ww-stage-note">${esc(t('tableLead'))}</p>${phase === 'vote' ? `<p class="ww-progress" data-ww-vote-progress>${esc(t('voteProgress', { n: v.votesCast, total: v.votersTotal }))}</p>` : v.picked ? `<p class="ww-picked" data-ww-picked="${v.picked}">${esc(t('picked', { name: nameOf(v, v.picked) }))}</p>` : ''}${players(v)}</section>`;
  }
  function settingsForm(s) { return C.field('category', WORD_WOLF_ENGINE.CONFIG.categories, t('category'), s.category || 'objects', value => t('cat_' + value)); }
  const readSettings = root => ({ category: C.readField(root, 'category')?.value || 'objects' });
  const controlsSpec = { t, timed: ['describe', 'vote'], confirmClose: ['describe', 'vote'], extendLabel: () => null,
    closeLabel: phase => t(phase === 'describe' ? 'openVote' : 'reveal'), nextPick: null, settingsForm, readSettings };
  class Card extends C.Card {
    constructor(element, options = {}) { super(element, { key: 'ww', prefix: 'ww', spec: controlsSpec, ...options }); }
    render() {
      const v = this.view, scope = v ? `${v.roundNo}:${v.phase === 'paused' ? v.pausedFrom : v.phase}` : '';
      const open = scope === this.moreScope ? Array.from(this.root.querySelectorAll('details.ww-more')).map(detail => detail.open) : [];
      super.render();
      Array.from(this.root.querySelectorAll('details.ww-more')).forEach((detail, i) => { if (open[i]) detail.open = true; });
      this.moreScope = scope;
    }
    head(data) { return `${this.nameBanner(data)}<div class="ww-card-head"><span>WORD WOLF</span><span>${esc(t('roundN', { n: data.ww.roundNo }))}</span></div>`; }
    main(data) {
      const v = data.ww, me = v.me, busy = !!this.pending, disabled = busy ? ' disabled' : '';
      if (v.phase === 'finished') return `<div class="ww-outcome"><h2>${esc(t('finished'))}</h2><p>${esc(t('noScores'))}</p></div>${me.canControl ? `<button class="ct-button ct-primary ct-wide" type="button" data-ct-action="restart"${disabled}>${esc(t('newGame'))}</button>` : this.back()}`;
      if (v.phase === 'result') return `${resultHTML(v)}${me.canNext ? `<button class="ct-button ct-primary ct-wide" type="button" data-ct-action="next"${disabled}>${esc(t('nextPair'))}</button>` : this.back()}`;
      if (!me.active || !me.inRound) return `<div class="ww-outcome"><h2>${esc(t('sittingOutCard'))}</h2><p>${esc(t('sittingOutHint'))}</p></div>${this.back()}`;
      const phase = v.phase === 'paused' ? v.pausedFrom : v.phase;
      const card = itemCard(me.item, t('secret'), phase === 'vote');
      if (v.phase === 'paused') return `${card}<section class="ww-zone"><h3>${esc(t('paused'))}</h3><button type="button" class="ct-button ct-primary ct-wide" data-ct-action="resume"${disabled}>${esc(t('resume'))}</button></section>`;
      if (phase === 'vote') return `${card}<section class="ww-zone"><h3>${esc(t('vote'))}</h3><p data-ww-vote-progress>${esc(t('voteProgress', { n: v.votesCast, total: v.votersTotal }))}</p><div class="ww-ballot">${list(v.roster).filter(p => p.active && p.inRound && p.playerNum !== data.playerNum).map(p => `<button type="button" class="ct-button${me.vote === p.playerNum ? ' is-selected' : ''}" data-ct-action="ballot" data-ct-arg-target="${p.playerNum}" aria-pressed="${me.vote === p.playerNum}"${disabled}>${esc(p.name || t('player', { n: p.playerNum }))}</button>`).join('')}</div><p class="ww-fine">${esc(me.vote ? t('votedFor', { name: nameOf(v, me.vote) }) : t('voteHint'))}</p></section>`;
      return `${card}<p class="ww-card-note">${esc(t('keepSecret'))}</p><section class="ww-zone">${v.picked ? `<h3 data-ww-picked="${v.picked}">${esc(t('picked', { name: nameOf(v, v.picked) }))}</h3>` : `<h3>${esc(t('describe'))}</h3>`}<div class="ww-action-row"><button type="button" class="ct-button" data-ct-action="pick"${disabled}>${esc(t('pick'))}</button><button type="button" class="ct-button ct-primary" data-ct-action="vote"${disabled}>${esc(t('openVote'))}</button></div></section>`;
    }
    tail(data) { const v = data.ww; return ['describe', 'vote', 'paused'].includes(v.phase) ? `<details class="ww-more"><summary>${esc(t('playersMore'))}</summary><p>${esc(t('describeHint'))}</p><p>${esc(t('unknownRole'))}</p>${players(v, data.playerNum)}</details>` : ''; }
  }
  const SYNC = typeof CARD_TABLE !== 'undefined' ? CARD_TABLE.define({ game: 'wordwolf', key: 'ww', engine: () => WORD_WOLF_ENGINE, extra: 'wordWolfControlToken', fields: ['target', 'settings', 'names', 'playerNum', 'active'] }) : null;
  return { t, dict, Card, SYNC, stage, itemCard, controlsSpec, settingsForm, readSettings };
})();
if (typeof module === 'object' && module.exports) module.exports = WORD_WOLF_UI;
