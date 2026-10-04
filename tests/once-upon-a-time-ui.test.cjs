'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const D = require('../once-upon-a-time-deck.js');
const E = require('../once-upon-a-time-engine.js');
const UI = require('../once-upon-a-time-ui.js');
const root = path.join(__dirname, '..');
const uiSource = fs.readFileSync(path.join(root, 'once-upon-a-time-ui.js'), 'utf8');
let serial = 0;
const copy = value => JSON.parse(JSON.stringify(value));
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Seat ' + (i + 1) }));
const create = (count = 4) => E.create({ id: 'once-ui-' + (++serial), roster: roster(count), seed: 713, now: 1000 });
function act(s, type, actor = 0, extra = {}) {
  const next = E.apply(s, { id: 'ui-action-' + (++serial), sessionId: s.sessionId, turnId: s.turnId, seed: 891, now: 2000 + serial, type, actor, ...extra });
  assert.equal(next.replies[actor]?.error, '', type + ' fixture command should be accepted');
  return next;
}
function dealt(count = 4) {
  let s = create(count);
  for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
  return act(s, 'deal');
}
const started = (count = 4) => act(dealt(count), 'chooseFirst', 0, { playerNum: 1 });
const htmlFor = (s, seat = 0, options = {}) => UI.tableHTML(E.view(s, seat, 3000), { host: seat === 0, ...options });
function buttons(html) {
  return (html.match(/<button\b[^>]*\bdata-once-action="[^"]+"[^>]*>/g) || []).map(tag => ({
    type: tag.match(/data-once-action="([^"]+)"/)[1],
    mode: tag.match(/data-mode="([^"]+)"/)?.[1],
    choice: tag.match(/data-choice="([^"]+)"/)?.[1],
    disabled: /\sdisabled(?:\s|>)/.test(tag)
  }));
}
const action = (html, type, mode) => buttons(html).find(b => b.type === type && (mode === undefined || b.mode === mode));
function noActions(html, types) {
  for (const type of types) assert.equal(action(html, type), undefined, type + ' should not be offered');
}
function elementHTML(html, className) {
  const openings = /<([a-z][\w:-]*)\b[^>]*\bclass="([^"]*)"[^>]*>/gi;
  let opening;
  while ((opening = openings.exec(html))) {
    if (!opening[2].split(/\s+/).includes(className)) continue;
    const tags = new RegExp('</?' + opening[1] + '\\b[^>]*>', 'gi');
    tags.lastIndex = openings.lastIndex;
    let depth = 1, tag;
    while ((tag = tags.exec(html))) {
      depth += tag[0][1] === '/' ? -1 : 1;
      if (depth === 0) return html.slice(opening.index, tags.lastIndex);
    }
    return '';
  }
  return '';
}
function give(s, seat, cardId) {
  for (const key of ['storyDeck', 'storyDiscard', 'storyHeld']) s[key] = s[key].filter(id => id !== cardId);
  for (const hand of Object.keys(s.hands)) s.hands[hand] = s.hands[hand].filter(id => id !== cardId);
  s.hands[seat].push(cardId);
}
function categoryFixture() {
  let s = started();
  const special = D.storyCards.find(card => card.isInterrupt && card.category === 'character');
  const ordinary = D.storyCards.find(card => !card.isInterrupt && card.category === special.category);
  const mismatch = D.storyCards.find(card => card.isInterrupt && card.category === 'thing');
  give(s, 1, ordinary.id); give(s, 2, special.id); give(s, 2, mismatch.id);
  s = act(s, 'play', 1, { cardId: ordinary.id });
  return { s, special, mismatch };
}
function endingReview(count = 4) {
  let s = started(count);
  for (const cardId of s.hands[1].slice()) s = act(s, 'play', 1, { cardId });
  return act(s, 'ending', 1);
}

test('2, 4 and 6 seat lobby has optional readiness and direct host deal with classic choice', () => {
  for (const count of [2, 4, 6]) {
    let s = create(count);
    const host = htmlFor(s);
    assert.equal(action(host, 'deal').disabled, false);
    assert.equal(action(htmlFor(s, 1), 'ready').disabled, false);
    noActions(host, ['ready', 'play', 'interrupt', 'pass', 'challenge', 'ending']);
    noActions(htmlFor(s, 1), ['deal', 'chooseFirst', 'randomFirst', 'play', 'interrupt']);
    for (const p of s.roster) s = act(s, 'ready', p.playerNum, { value: true });
    assert.equal(action(htmlFor(s), 'deal').disabled, false);
    assert.match(htmlFor(s, 1), /Not ready yet/);
    s = act(s, 'deal');
    const dealtHost = htmlFor(s), mine = htmlFor(s, 1);
    assert.ok(action(dealtHost, 'chooseFirst'));
    assert.ok(action(dealtHost, 'randomFirst'));
    assert.match(dealtHost, /Who looks most like this card\?/);
    assert.match(dealtHost, new RegExp(UI.esc(D.storyById[s.starterCard].title)));
    assert.equal((dealtHost.match(/<option value=/g) || []).length, count);
    assert.equal((mine.match(/data-once-card=/g) || []).length, Math.max(5, 11 - count) + 1);
    assert.match(mine, /Waiting for the host to choose/);
    noActions(mine, ['chooseFirst', 'randomFirst', 'play', 'interrupt', 'pass', 'challenge', 'ending']);
  }
});

test('each player sees their own exact hand/ending while public host sees only public counts', () => {
  for (const count of [2, 4, 6]) {
    const s = started(count), publicHTML = htmlFor(s);
    assert.match(publicHTML, /cards/);
    assert.doesNotMatch(publicHTML, /data-once-card=|class="once-panel once-hand-panel"/);
    for (const p of s.roster) {
      const ownHTML = htmlFor(s, p.playerNum), ownEnding = D.endingById[s.endings[p.playerNum]];
      assert.ok(ownHTML.includes(UI.esc(ownEnding.text)), 'own ending is visible');
      assert.match(ownHTML, new RegExp(s.hands[p.playerNum].length + ' cards'));
      assert.ok(!publicHTML.includes(ownEnding.text), 'host does not display private endings');
      for (const id of s.hands[p.playerNum]) {
        assert.ok(ownHTML.includes('data-once-card="' + id + '"'));
        assert.ok(!publicHTML.includes('data-once-card="' + id + '"'));
      }
      for (const other of s.roster.filter(other => other.playerNum !== p.playerNum)) {
        assert.ok(!ownHTML.includes(D.endingById[s.endings[other.playerNum]].text), 'another ending remains private');
        for (const id of s.hands[other.playerNum]) assert.ok(!ownHTML.includes('data-once-card="' + id + '"'));
      }
    }
    // The presentation host flag also avoids private UI if passed a player projection.
    const hostWithOwnProjection = UI.tableHTML(E.view(s, 1), { host: true });
    assert.doesNotMatch(hostWithOwnProjection, /data-once-card=/);
    assert.ok(!hostWithOwnProjection.includes(D.endingById[s.endings[1]].text));
  }
});

test('private Ending is pinned after the hand in the same dock, never in the public host table', () => {
  for (const count of [2, 4, 6]) {
    const s = started(count);
    for (const p of s.roster) {
      const html = htmlFor(s, p.playerNum), ending = D.endingById[s.endings[p.playerNum]];
      const handPanel = elementHTML(html, 'once-hand-panel');
      const layout = elementHTML(handPanel, 'once-hand-layout');
      const dock = elementHTML(layout, 'once-ending-dock');
      assert.ok(handPanel && layout && dock, 'Ending belongs to the private hand panel');
      assert.ok(layout.indexOf('once-hand"') < layout.indexOf('once-ending-dock'), 'Ending is after the Story hand');
      assert.ok(dock.includes('data-once-card="' + ending.id + '"'));
      assert.ok(dock.includes(UI.esc(ending.text)), 'the full private Ending remains readable in the dock');
      assert.doesNotMatch(html, /once-ending-panel/);
      noActions(html, ['ending']);
    }
    for (const html of [htmlFor(s), UI.tableHTML(E.view(s, 1), { host: true })]) {
      assert.doesNotMatch(html, /once-ending-dock|once-hand-panel|data-once-card=/);
      for (const p of s.roster) assert.ok(!html.includes(D.endingById[s.endings[p.playerNum]].text));
    }
  }
});

test('selected hand cards expose only storyteller play/pass or listener normal interrupt/challenge', () => {
  for (const count of [2, 4, 6]) {
    const s = started(count), ownId = s.hands[1][0], listenerId = s.hands[2][0];
    assert.equal(action(htmlFor(s, 1), 'play').disabled, true);
    assert.equal(action(htmlFor(s, 1, { selectedId: ownId }), 'play').disabled, false);
    assert.equal(action(htmlFor(s, 1, { selectedId: 'not-in-hand' }), 'play').disabled, true);
    assert.ok(action(htmlFor(s, 1), 'pass'));
    noActions(htmlFor(s, 1), ['interrupt', 'challenge', 'ending']);
    assert.equal(action(htmlFor(s, 2), 'interrupt', 'normal').disabled, true);
    assert.equal(action(htmlFor(s, 2, { selectedId: listenerId }), 'interrupt', 'normal').disabled, false);
    assert.ok(action(htmlFor(s, 2), 'challenge'));
    noActions(htmlFor(s, 2), ['play', 'pass', 'ending']);
    noActions(htmlFor(s), ['play', 'interrupt', 'pass', 'challenge', 'ending']);
  }
});

test('category takeover appears only for a selected matching special and closes after interruption', () => {
  let { s, special, mismatch } = categoryFixture();
  assert.equal(action(htmlFor(s, 2), 'interrupt', 'category'), undefined);
  assert.equal(action(htmlFor(s, 2, { selectedId: mismatch.id }), 'interrupt', 'category'), undefined);
  const ordinaryOwn = s.hands[2].map(id => D.storyById[id]).find(card => !card.isInterrupt);
  assert.equal(action(htmlFor(s, 2, { selectedId: ordinaryOwn.id }), 'interrupt', 'category'), undefined);
  const matchingHTML = htmlFor(s, 2, { selectedId: special.id });
  assert.ok(action(matchingHTML, 'interrupt', 'category'));
  assert.ok(action(matchingHTML, 'interrupt', 'normal'));
  assert.match(matchingHTML, /Matching Interrupt cards may take over now/);
  s = act(s, 'interrupt', 2, { cardId: special.id, mode: 'category', opportunityId: s.categoryOpportunity.id });
  assert.equal(action(htmlFor(s, 3), 'interrupt', 'category'), undefined);
  assert.match(htmlFor(s), /Category interrupt/);
  assert.equal(action(htmlFor(s, 3), 'dispute'), undefined);
});

test('a normal takeover offers dispute only to others and retains chronological public history', () => {
  let s = started();
  const first = s.hands[1][0], second = s.hands[1][1], interruptedWith = s.hands[2][0];
  s = act(s, 'play', 1, { cardId: first });
  s = act(s, 'play', 1, { cardId: second });
  s = act(s, 'interrupt', 2, { cardId: interruptedWith, mode: 'normal' });
  const host = htmlFor(s), firstIndex = host.indexOf('>' + D.storyById[first].title + '</span>');
  const secondIndex = host.indexOf('>' + D.storyById[second].title + '</span>');
  const thirdIndex = host.indexOf('>' + D.storyById[interruptedWith].title + '</span>');
  assert.ok(firstIndex >= 0 && secondIndex > firstIndex && thirdIndex > secondIndex);
  assert.ok(action(htmlFor(s, 1), 'dispute'));
  assert.ok(action(htmlFor(s, 3), 'dispute'));
  assert.equal(action(htmlFor(s, 2), 'dispute'), undefined);
  assert.equal(action(host, 'dispute'), undefined);
  assert.ok(action(htmlFor(s, 2), 'continueStory'));
  s = act(s, 'continueStory', 2);
  assert.equal(action(htmlFor(s, 1), 'dispute'), undefined);
});

test('the table shows only the newest four cards immediately, with earlier numbered history collapsed', () => {
  let s = started(2);
  const played = s.hands[1].slice(0, 7);
  for (const id of played) s = act(s, 'play', 1, { cardId: id });
  for (const seat of [0, 1, 2]) {
    const html = htmlFor(s, seat), latest = elementHTML(html, 'once-history-latest');
    const archive = elementHTML(html, 'once-history-archive');
    assert.ok(latest && archive);
    assert.doesNotMatch(latest, /once-carousel/);
    assert.equal((latest.match(/class="once-history-item"/g) || []).length, 4);
    assert.equal((archive.match(/class="once-history-item"/g) || []).length, 3);
    assert.match(archive, /^<details\b/);
    assert.doesNotMatch(archive.slice(0, archive.indexOf('>') + 1), /\sopen(?:\s|=|>)/, 'old history starts collapsed');
    for (const [i, id] of played.entries()) {
      const title = '>' + UI.esc(D.storyById[id].title) + '</span>';
      const active = i < 3 ? archive : latest, other = i < 3 ? latest : archive;
      assert.ok(active.includes(title), 'card ' + (i + 1) + ' is in its correct history region');
      assert.ok(!other.includes(title), 'recent cards are not duplicated in the archive');
      assert.ok(active.includes('>' + (i + 1) + ' · Seat 1</span>'), 'original chronological numbering is retained');
    }
    for (let i = 4; i < played.length; i++) {
      assert.ok(latest.indexOf('>' + D.storyById[played[i - 1]].title + '</span>') < latest.indexOf('>' + D.storyById[played[i]].title + '</span>'));
    }
  }
});

test('zero through four public plays need no hidden history and the newest play is immediately visible', () => {
  let s = started(2);
  for (let total = 0; total <= 4; total++) {
    const html = htmlFor(s), latest = elementHTML(html, 'once-history-latest');
    assert.ok(latest);
    assert.equal((latest.match(/class="once-history-item"/g) || []).length, total);
    assert.equal(elementHTML(html, 'once-history-archive'), '');
    if (total) assert.ok(latest.includes(UI.esc(D.storyById[s.history.at(-1).cardId].title)));
    if (total < 4) s = act(s, 'play', 1, { cardId: s.hands[1][0] });
  }
});

test('PASS_DISCARD gives only the passer the optional discard/keep choice', () => {
  for (const count of [2, 4, 6]) {
    let s = started(count);
    s = act(s, 'pass', 1);
    assert.equal(s.phase, 'PASS_DISCARD');
    const passer = htmlFor(s, 1), listener = htmlFor(s, 2), host = htmlFor(s);
    assert.match(passer, /You have drawn one card/);
    assert.equal(action(passer, 'discard').disabled, true);
    assert.equal(action(htmlFor(s, 1, { selectedId: s.hands[1][0] }), 'discard').disabled, false);
    assert.ok(action(passer, 'keepAll'));
    assert.match(listener, /Waiting for the Storyteller’s discard choice/);
    noActions(passer, ['play', 'interrupt', 'pass', 'challenge', 'ending']);
    noActions(listener, ['discard', 'keepAll', 'play', 'interrupt', 'pass', 'challenge']);
    noActions(host, ['discard', 'keepAll', 'play', 'interrupt', 'pass', 'challenge']);
    s = act(s, 'keepAll', 1);
    assert.ok(action(htmlFor(s, 2), 'play'));
    noActions(htmlFor(s, 1), ['discard', 'keepAll']);
  }
});

test('votes show submitted count/own acknowledgement without revealing another voter’s choice', () => {
  let s = act(started(6), 'challenge', 2);
  const voteId = s.vote.id;
  assert.deepEqual(buttons(htmlFor(s, 3)).filter(b => b.type === 'vote').map(b => b.choice), ['lose', 'continue']);
  s = act(s, 'vote', 3, { voteId, choice: 'lose' });
  const own = htmlFor(s, 3), other = htmlFor(s, 4), host = htmlFor(s);
  assert.match(own, /Your vote is submitted/);
  assert.equal(action(own, 'vote'), undefined);
  assert.match(other, /Submitted: 1 \/ 4/);
  assert.ok(action(other, 'vote'));
  assert.ok(action(host, 'finishVote'));
  noActions(host, ['vote', 'resolveSocial']);
  for (const seat of [0, 1, 2, 4, 5, 6]) {
    const projectedVote = E.view(s, seat).once.vote;
    assert.equal(projectedVote.ownChoice, null);
    assert.equal(Object.hasOwn(projectedVote, 'votes'), false);
    assert.doesNotMatch(htmlFor(s, seat), /Seat 3 voted|"votes"|"ownChoice"|data-voter/);
  }
  for (const seat of [1, 2]) noActions(htmlFor(s, seat), ['vote', 'play', 'interrupt', 'pass', 'challenge', 'ending']);
});

test('two-player dispute/challenge has explicit host social choices and no automatic ballot', () => {
  for (const kind of ['challenge', 'interrupt']) {
    let s = started(2);
    if (kind === 'challenge') s = act(s, 'challenge', 2);
    else {
      s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
      s = act(s, 'dispute', 1, { interruptId: s.interrupt.id });
    }
    const host = htmlFor(s);
    assert.match(host, /There are no uninvolved voters/);
    assert.deepEqual(buttons(host).filter(b => b.type === 'resolveSocial').map(b => b.choice), kind === 'challenge' ? ['lose', 'continue'] : ['valid', 'invalid']);
    noActions(host, ['vote', 'finishVote']);
    for (const seat of [1, 2]) noActions(htmlFor(s, seat), ['vote', 'finishVote', 'resolveSocial']);
  }
});

test('only an empty-handed storyteller may end; review reveals that ending and blocks interrupts', () => {
  let s = started();
  for (const cardId of s.hands[1].slice()) s = act(s, 'play', 1, { cardId });
  assert.match(htmlFor(s, 1), /Ready to end/);
  assert.ok(action(htmlFor(s, 1), 'ending'));
  noActions(htmlFor(s, 1), ['play', 'interrupt']);
  noActions(htmlFor(s, 2), ['ending']);
  const endingId = s.endings[1], text = D.endingById[endingId].text;
  s = act(s, 'ending', 1);
  assert.equal(s.phase, 'ENDING_REVIEW');
  for (const seat of [0, 1, 2, 3, 4]) {
    const html = htmlFor(s, seat);
    assert.ok(html.includes(UI.esc(text)), 'played ending is public during review');
    noActions(html, ['play', 'interrupt', 'pass', 'challenge', 'ending', 'dispute']);
    for (const other of s.roster.filter(p => p.playerNum !== seat && p.playerNum !== 1)) {
      assert.ok(!html.includes(D.endingById[s.endings[other.playerNum]].text), 'unplayed endings remain private');
    }
  }
  assert.deepEqual(buttons(htmlFor(s, 2)).filter(b => b.type === 'vote').map(b => b.choice), ['accept', 'reject']);
  assert.equal(action(htmlFor(s, 1), 'vote'), undefined);
});

test('FINISHED and CANCELLED replace play controls with the host’s replay action', () => {
  let finished = endingReview();
  const voteId = finished.vote.id, endingText = D.endingById[finished.endingPlayed.cardId].text;
  for (const seat of finished.vote.eligible.slice()) finished = act(finished, 'vote', seat, { voteId, choice: 'accept' });
  assert.equal(finished.phase, 'FINISHED');
  assert.match(htmlFor(finished), /Seat 1 finished the story/);
  assert.ok(htmlFor(finished).includes(endingText));
  const cancelled = act(started(), 'cancel');
  assert.equal(cancelled.phase, 'CANCELLED');
  assert.match(htmlFor(cancelled), /Game cancelled/);
  for (const s of [finished, cancelled]) {
    assert.ok(action(htmlFor(s), 'restart'));
    noActions(htmlFor(s), ['cancel', 'play', 'interrupt', 'pass', 'challenge', 'ending', 'vote']);
    for (const seat of [1, 2]) noActions(htmlFor(s, seat), ['restart', 'play', 'interrupt', 'pass', 'challenge', 'ending', 'vote']);
  }
});

test('card variants keep the real artwork separate from escaped titles/category/frame markup', () => {
  const css = fs.readFileSync(path.join(root, 'once-upon-a-time.css'), 'utf8');
  for (const variant of ['full', 'mini', 'history', 'ending']) {
    const card = variant === 'ending' ? D.endingCards[0] : D.storyCards[0];
    const html = UI.cardHTML(card, variant, { interactive: true, selected: true });
    assert.ok(html.includes('once-card--' + variant));
    assert.ok(html.includes('data-once-card="' + card.id + '"'));
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /is-selected/);
    const src=variant==='full'?card.imagePath:card.thumbnailPath;
    assert.ok(html.includes('<img src="' + src + '"'));
    assert.ok(html.includes('srcset="'+card.thumbnailPath+' 384w, '+card.imagePath+' 768w"'));
    assert.ok(html.includes('loading="'+(variant==='full'?'eager':'lazy')+'" decoding="async"'));
    assert.ok(html.includes('<span class="once-card-title">' + UI.esc(card.title || card.text) + '</span>'));
    assert.ok(html.includes(card.category ? 'Character' : 'ENDING'));
    assert.ok(fs.existsSync(path.join(root, card.imagePath)));
  }
  for (const category of D.categories) {
    const html = UI.cardHTML(D.storyCards.find(card => card.category === category.id), 'history');
    assert.ok(html.includes('once-cat-' + category.id));
    assert.ok(html.includes(category.label));
    assert.match(html, /<svg viewBox="0 0 24 26"/);
  }
  assert.match(css, /\.once-card\s*\{[^}]*border:3px solid/);
  assert.match(css, /card-frame\.svg/);
  assert.match(css, /\.once-card-title\s*\{[^}]*background:radial-gradient/);
  assert.match(css, /\.once-card-art img\s*\{[^}]*object-fit:contain/);
  assert.match(css, /\.once-card-art \.once-card-art-fill\s*\{[^}]*object-fit:cover/);
  assert.match(css, /\.once-card-art\s*\{[^}]*isolation:isolate/);
  assert.match(css, /\.once-interrupt-mark\s*\{[^}]*z-index:2/);
  assert.equal(UI.cardHTML(null), '');
});

test('saved older host projections use current meaning-matched art while keeping escaped card text', () => {
  const card={...D.storyCards[0],imagePath:'assets/once-upon-a-time/character/fallback.png',thumbnailPath:null};
  const html=UI.cardHTML(card,'mini');
  assert.ok(html.includes(D.storyCards[0].thumbnailPath));
  assert.ok(!html.includes('/fallback.png'));
  assert.ok(html.includes(UI.esc(card.title)));
});

test('names, logs, card IDs/titles/image attributes and public ending text are HTML-escaped', () => {
  assert.equal(UI.esc('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  const card = { ...D.storyCards[0], id: 'id" onclick="bad', title: '<script>bad & "title"</script>', imagePath: 'assets/a" onerror="bad.png' };
  const cardHTML = UI.cardHTML(card, 'full', { interactive: true });
  assert.doesNotMatch(cardHTML, /<script>| onclick="bad| onerror="bad/);
  assert.match(cardHTML, /id&amp;|id&quot; onclick=&quot;bad/);
  assert.ok(cardHTML.includes(UI.esc(card.title)));
  const data = E.view(started(), 1);
  data.name = '<img src=x onerror="name">';
  data.once.roster[0].name = data.name;
  data.once.log = [{ text: '<script>log()</script>' }];
  data.once.hand = [card];
  data.once.ending = { ...D.endingCards[0], text: '<script>ending()</script>' };
  const html = UI.tableHTML(data, { selectedId: card.id });
  assert.doesNotMatch(html, /<script>|<img src=x/);
  for (const text of [data.name, data.once.log[0].text, data.once.ending.text]) assert.ok(html.includes(UI.esc(text)));
});

// Deliberately small DOM double: exercise command/state behavior, not visual layout.
// The root task verifies native browser layout separately.
class ElementDouble {
  constructor() {
    this.innerHTML = '';
    this.listeners = new Map();
    this.carousels = [{ scrollLeft: 31 }, { scrollLeft: 57 }];
    this.status = { textContent: '', classList: { toggle() {} } };
    this.request = { innerHTML: '', textContent: '' };
    this.returnLatest = { checked: false };
  }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  querySelectorAll(selector) { return selector === '.once-carousel' ? this.carousels : []; }
  querySelector(selector) {
    return selector === '.once-connection' ? this.status : selector === '.once-request-status' ? this.request :
      selector === '[data-once-return-latest]' ? this.returnLatest : selector === '[data-once-first-player]' ? { value: '2' } :
      selector === '.once-modal' ? { querySelector: () => ({ focus() {} }) } : null;
  }
  insertAdjacentHTML(_, html) { this.innerHTML += html; }
  contains(node) { return node.inside !== false; }
}
function target(dataset = {}) {
  return { dataset, disabled: false, classList: { contains: () => false }, closest(selector) {
    return selector === '[data-once-card]' && this.dataset.onceCard || selector === '[data-once-action]' && this.dataset.onceAction ? this : null;
  } };
}
const click = (card, type, extra = {}) => card.click({ target: target({ onceAction: type, ...extra }) });
function harness(data, options = {}) {
  const timers = new Set(), sent = [], context = { ONCE_DECK: D, crypto: { randomUUID: () => 'mailbox-' + (++serial) },
    setInterval: () => { const id = ++serial; timers.add(id); return id; }, clearInterval: id => timers.delete(id) };
  vm.runInNewContext(uiSource, context);
  const element = new ElementDouble();
  let now = 1000;
  const card = new context.ONCE_UI.Card(element, { now: () => now, send: async command => { sent.push(copy(command)); }, ...options });
  card.update(data);
  return { card, element, sent, timers, clock: value => { now = value; } };
}

test('a Story card tap selects and highlights immediately; Play submits it without a preview/select step', () => {
  for (const count of [2, 4, 6]) {
    const s = started(count), h = harness(E.view(s, 1)), [first, second] = s.hands[1];
    try {
      h.card.click({ target: target({ onceCard: first }) });
      assert.equal(h.card.selectedId, first);
      assert.equal(h.card.preview, null);
      assert.equal(h.card.confirm, null);
      assert.equal(h.sent.length, 0, 'selecting does not play the card');
      assert.match(h.element.innerHTML, new RegExp('data-once-card="' + first + '"[^>]*aria-pressed="true"'));
      assert.doesNotMatch(h.element.innerHTML, /once-modal|once-card--full|data-once-action="select"/);
      assert.equal(action(h.element.innerHTML, 'play').disabled, false);
      h.card.click({ target: target({ onceCard: second }) });
      assert.equal(h.card.selectedId, second);
      assert.match(h.element.innerHTML, new RegExp('data-once-card="' + first + '"[^>]*aria-pressed="false"'));
      assert.match(h.element.innerHTML, new RegExp('data-once-card="' + second + '"[^>]*aria-pressed="true"'));
      click(h.card, 'play');
      assert.equal(h.sent.length, 1);
      assert.equal(h.sent[0].type, 'play');
      assert.equal(h.sent[0].cardId, second);
      assert.equal(h.sent[0].sessionId, s.sessionId);
      assert.equal(h.sent[0].turnId, s.turnId);
      assert.equal(h.card.preview, null);
      assert.equal(h.card.confirm, null, 'ordinary Play needs no extra confirmation');
    } finally { h.card.destroy(); }
  }
});

test('direct selection retains normal/category interrupt confirmation with exact hand/turn/opportunity IDs', () => {
  for (const mode of ['normal', 'category']) {
    const { s, special } = categoryFixture(), data = E.view(s, 2), h = harness(data);
    try {
      h.card.click({ target: target({ onceCard: special.id }) });
      assert.equal(h.card.selectedId, special.id);
      assert.equal(h.card.preview, null);
      assert.doesNotMatch(h.element.innerHTML, /once-modal|data-once-action="select"/);
      click(h.card, 'interrupt', { mode });
      assert.equal(h.sent.length, 0, 'confirmation is required before sending');
      assert.equal(h.card.confirm.extra.cardId, special.id);
      assert.equal(h.card.confirm.captured.sessionId, s.sessionId);
      assert.equal(h.card.confirm.captured.turnId, s.turnId);
      assert.match(h.element.innerHTML, mode === 'normal' ? /The Storyteller must have mentioned/ : /matching category/);
      click(h.card, 'confirm');
      assert.equal(h.sent.length, 1);
      assert.equal(h.sent[0].type, 'interrupt');
      assert.equal(h.sent[0].cardId, special.id);
      assert.equal(h.sent[0].mode, mode);
      assert.equal(h.sent[0].sessionId, s.sessionId);
      assert.equal(h.sent[0].turnId, s.turnId);
      assert.equal(h.sent[0].opportunityId, s.categoryOpportunity.id);
    } finally { h.card.destroy(); }
    assert.equal(h.timers.size, 0);
    assert.equal(h.element.listeners.size, 0);
  }
});

test('a stale turn/session closes confirmations and removed private cards clear direct selection', () => {
  let s = started(), h = harness(E.view(s, 1));
  try {
    click(h.card, 'pass');
    assert.ok(h.card.confirm);
    s = act(s, 'play', 1, { cardId: s.hands[1][0] });
    h.card.update(E.view(s, 1));
    assert.equal(h.card.confirm, null);
    assert.match(h.card.error, /story has moved on/);
    click(h.card, 'confirm');
    assert.equal(h.sent.length, 0);
    const removed = s.hands[1][0];
    h.card.click({ target: target({ onceCard: removed }) });
    assert.equal(h.card.selectedId, removed);
    assert.equal(h.card.preview, null);
    s = act(s, 'play', 1, { cardId: removed });
    h.card.update(E.view(s, 1));
    assert.equal(h.card.preview, null);
    assert.equal(h.card.selectedId, null);
    click(h.card, 'pass');
    const stillOwned = s.hands[1][0];
    h.card.selectedId = stillOwned;
    h.card.update(E.view(started(), 1));
    assert.equal(h.card.confirm, null);
    assert.equal(h.card.selectedId, null, 'a new session cannot reuse old selected IDs');
    assert.equal(h.card.error, '');
  } finally { h.card.destroy(); }
});

test('Ending taps select directly but cannot play until the empty-handed storyteller confirms', () => {
  let s = started(), h = harness(E.view(s, 1));
  const endingId = s.endings[1];
  try {
    h.card.click({ target: target({ onceCard: endingId }) });
    assert.equal(h.card.selectedId, endingId);
    assert.equal(h.card.preview, null);
    assert.equal(h.card.confirm, null);
    assert.doesNotMatch(h.element.innerHTML, /once-modal|once-card--full|data-once-action="select"/);
    assert.equal(action(h.element.innerHTML, 'ending').disabled, true, 'an Ending cannot be played while Story Cards remain');
    noActions(h.element.innerHTML, ['play']);
    click(h.card, 'ending');
    assert.equal(h.card.confirm, null, 'the locked Ending cannot open a submission confirmation');
    assert.equal(h.sent.length, 0);
    for (const cardId of s.hands[1].slice()) s = act(s, 'play', 1, { cardId });
    h.card.update(E.view(s, 1));
    assert.equal(h.card.selectedId, endingId, 'the same private Ending survives ordinary hand updates');
    assert.equal(action(h.element.innerHTML, 'ending').disabled, false);
    click(h.card, 'ending');
    assert.ok(h.card.confirm);
    assert.equal(h.card.confirm.type, 'ending');
    assert.equal(h.card.confirm.captured.sessionId, s.sessionId);
    assert.equal(h.card.confirm.captured.turnId, s.turnId);
    assert.equal(h.sent.length, 0, 'the existing Ending confirmation remains');
    click(h.card, 'confirm');
    assert.equal(h.sent.length, 1);
    assert.equal(h.sent[0].type, 'ending');
    assert.equal(h.sent[0].sessionId, s.sessionId);
    assert.equal(h.sent[0].turnId, s.turnId);
    const next = act(s, 'ending', 1);
    h.card.update(E.view(next, 1));
    noActions(h.element.innerHTML, ['play', 'ending']);
  } finally { h.card.destroy(); }
  let empty = started();
  for (const cardId of empty.hands[1].slice()) empty = act(empty, 'play', 1, { cardId });
  assert.equal(action(htmlFor(empty, 1), 'ending').disabled, true, 'explicit Ending selection is required');
});

test('card selection ignores foreign IDs, host projections, disabled seats, pending work and modal confirms', () => {
  const s = started(), h = harness(E.view(s, 1)), [first, second] = s.hands[1];
  try {
    h.card.click({ target: target({ onceCard: s.hands[2][0] }) });
    assert.equal(h.card.selectedId, null);
    h.card.click({ target: target({ onceCard: first }) });
    click(h.card, 'pass');
    assert.ok(h.card.confirm);
    h.card.click({ target: target({ onceCard: second }) });
    assert.equal(h.card.selectedId, first, 'confirmation cannot silently change its selected card');
    click(h.card, 'closeConfirm');
    click(h.card, 'play');
    assert.ok(h.card.pending);
    h.card.click({ target: target({ onceCard: second }) });
    assert.equal(h.card.selectedId, first, 'pending work keeps the submitted selection stable');
    click(h.card, 'play');
    assert.equal(h.sent.length, 1, 'pending Play cannot create a second request');
  } finally { h.card.destroy(); }
  for (const options of [{ host: true }, { disabled: () => true }]) {
    const blocked = harness(E.view(s, 1), options);
    try {
      blocked.card.click({ target: target({ onceCard: first }) });
      assert.equal(blocked.card.selectedId, null);
      assert.equal(blocked.card.preview, null);
      assert.equal(blocked.sent.length, 0);
    } finally { blocked.card.destroy(); }
  }
});

test('Card captures dispute/vote IDs and the explicit latest-card return choice', () => {
  let s = started();
  s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  const disputed = harness(E.view(s, 1));
  try {
    click(disputed.card, 'dispute');
    assert.equal(disputed.card.confirm.extra.interruptId, s.interrupt.id);
    click(disputed.card, 'confirm');
    assert.equal(disputed.sent[0].interruptId, s.interrupt.id);
  } finally { disputed.card.destroy(); }

  s = started(); s = act(s, 'play', 1, { cardId: s.hands[1][0] });
  const challenged = harness(E.view(s, 2));
  try {
    click(challenged.card, 'challenge');
    assert.match(challenged.element.innerHTML, /data-once-return-latest/);
    challenged.element.returnLatest.checked = true;
    click(challenged.card, 'confirm');
    assert.equal(challenged.sent[0].returnLatest, true);
    assert.equal(challenged.sent[0].turnId, s.turnId);
  } finally { challenged.card.destroy(); }

  s = act(s, 'challenge', 2, { returnLatest: true });
  const host = harness(E.view(s, 0), { host: true });
  const voter = harness(E.view(s, 3));
  try {
    click(host.card, 'finishVote');
    assert.equal(host.card.confirm.extra.voteId, s.vote.id);
    assert.equal(host.sent.length, 0);
    click(host.card, 'confirm');
    assert.equal(host.sent[0].voteId, s.vote.id);
    click(voter.card, 'vote', { choice: 'continue' });
    assert.equal(voter.sent[0].voteId, s.vote.id);
    assert.equal(voter.sent[0].choice, 'continue');
  } finally { host.card.destroy(); voter.card.destroy(); }

  const socialState = act(started(2), 'challenge', 2);
  const social = harness(E.view(socialState, 0), { host: true });
  try {
    click(social.card, 'resolveSocial', { choice: 'continue' });
    assert.equal(social.sent[0].voteId, socialState.vote.id);
    assert.equal(social.sent[0].choice, 'continue');
  } finally { social.card.destroy(); }
});

test('mailbox retries preserve request IDs and turn; only matching reply clears pending work', async () => {
  const data = E.view(create(), 1), h = harness(data);
  try {
    click(h.card, 'ready');
    const original = copy(h.sent[0]);
    assert.ok(h.card.pending);
    click(h.card, 'ready');
    assert.equal(h.sent.length, 1, 'pending action suppresses duplicate new requests');
    h.clock(8000); h.card.paint();
    assert.match(h.element.request.innerHTML, /Retry this action/);
    await h.card.retry();
    assert.equal(h.sent.length, 2);
    assert.deepEqual(h.sent[1], original);
    const unrelated = copy(data); unrelated.once.reply = { id: 'someone-else', error: '' };
    h.card.update(unrelated);
    assert.equal(h.card.pending.command.id, original.id);
    const acknowledged = copy(data); acknowledged.once.reply = { id: original.id, error: '' };
    h.card.update(acknowledged);
    assert.equal(h.card.pending, null);
    assert.equal(h.card.error, '');
    await h.card.send('ready', { value: false });
    const rejected = copy(data); rejected.once.reply = { id: h.sent.at(-1).id, error: 'stale_turn' };
    h.card.update(rejected);
    assert.equal(h.card.pending, null);
    assert.match(h.card.error, /story has moved on/);
  } finally { h.card.destroy(); }
});

test('Card handles connection/host lease status and a rejected transport can be tried afresh', async () => {
  const data = E.view(started(), 1); data.once.hostLiveUntil = 2000;
  let connected = true;
  const h = harness(data, { connected: () => connected, send: async () => { throw new Error('network_offline'); } });
  try {
    assert.equal(h.element.status.textContent, 'Connected');
    h.clock(3000); h.card.paint();
    assert.equal(h.element.status.textContent, 'Waiting for the host page');
    connected = false; h.card.paint();
    assert.equal(h.element.status.textContent, 'Offline—reconnecting');
    await h.card.send('pass');
    assert.equal(h.card.pending, null);
    assert.equal(h.card.error, 'Offline—reconnecting');
    assert.deepEqual(h.element.carousels.map(c => c.scrollLeft), [31, 57]);
  } finally { h.card.destroy(); }
});

test('actual shared I18N accepts the Once dictionary, preserves Hub labels and keeps card content English', () => {
  const stored = new Map();
  const document = { readyState: 'loading', documentElement: {}, addEventListener() {}, querySelectorAll: () => [] };
  const context = { document, ONCE_DECK: D, localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), context);
  const originalBack = context.I18N.t('common', 'backToHub');
  vm.runInContext(uiSource, context);
  assert.equal(context.I18N.t('common', 'backToHub'), originalBack);
  assert.equal(context.I18N.t('once', 'pass'), 'Pass');
  assert.match(context.ONCE_UI.rulesHTML(), /Rules \/ How to play/);
  context.I18N.setLang('zh');
  assert.equal(document.documentElement.lang, 'zh-Hant');
  assert.equal(stored.get('site-lang'), 'zh');
  assert.equal(context.I18N.t('once', 'pass'), '交棒');
  assert.equal(context.I18N.t('common', 'backToHub'), '← 返回主選單');
  assert.match(context.ONCE_UI.rulesHTML(), /玩法／繁中說明/);
  assert.ok(context.ONCE_UI.cardHTML(D.storyCards[0]).includes('>' + D.storyCards[0].title + '</span>'));
  assert.ok(context.ONCE_UI.cardHTML(D.endingCards[0], 'ending').includes(UI.esc(D.endingCards[0].text)));
});
