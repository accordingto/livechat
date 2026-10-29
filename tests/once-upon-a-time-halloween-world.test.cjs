'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../once-upon-a-time-halloween-deck.js');
const D = require('../once-upon-a-time-deck.js');
const M = require('../once-upon-a-time-modern-future-deck.js');
const repo = path.resolve(__dirname, '..');
const categories = ['character', 'thing', 'place', 'aspect', 'event'];
const all = [...H.storyCards, ...H.endingCards];
const oldCards = [...D.storyCards, ...D.endingCards, ...M.storyCards, ...M.endingCards];
const byOldId = new Map(oldCards.map(card => [card.id, card]));

test('Halloween is a separate selectable 150 Story / 20 Ending world', () => {
  assert.equal(H.id, 'halloween');
  assert.equal(H.title, 'Spooky Halloween');
  assert.equal(H.storyCards.length, 150);
  assert.equal(H.endingCards.length, 20);
  assert.equal(D.getWorld('halloween'), H);
  assert.equal(D.storyCards.length, 129);
  assert.equal(M.storyCards.length, 60);
  assert.ok([...D.storyCards, ...M.storyCards].every(card => !card.id.startsWith('once-hw-')));
  for (const value of [H, H.storyCards, H.endingCards, H.legacyInterruptIds]) assert.ok(Object.isFrozen(value));
});

test('Halloween has 30 Story cards and eight or nine Interrupts per category without a hand guarantee', () => {
  for (const category of categories) {
    const cards = H.storyCards.filter(card => card.category === category);
    assert.equal(cards.length, 30, category);
    assert.equal(cards.filter(card => card.isInterrupt).length, ['character', 'thing'].includes(category) ? 9 : 8, category);
    assert.equal(cards.filter(card => H.profile2InterruptIds.includes(card.id)).length, 8, category + ' released mix');
    assert.equal(cards.filter(card => card.artOrigin === 'new').length, 18, category);
    assert.equal(cards.filter(card => card.artOrigin === 'reuse').length, 12, category);
  }
  assert.equal(H.storyCards.filter(card => card.isInterrupt).length, 42);
  assert.deepEqual(H.storyCards.filter(card => card.isInterrupt && !H.profile2InterruptIds.includes(card.id)).map(card => card.id).sort(),
    ['once-hw-character-thief', 'once-hw-thing-key']);
  assert.equal(H.legacyInterruptIds, H.profile2InterruptIds, 'this world launched with the profile-2 mix');
  assert.equal(new Set(H.profile2InterruptIds).size, 40); assert.ok(Object.isFrozen(H.profile2InterruptIds));
  assert.ok(H.profile2InterruptIds.every(id => H.storyCards.find(card => card.id === id).isInterrupt));
  assert.ok(H.storyCards.every(card => typeof card.isInterrupt === 'boolean'));
  assert.ok(H.endingCards.every(card => !Object.hasOwn(card, 'isInterrupt')));
});

test('all 170 Halloween IDs are stable, independent, unique and present in base lookup maps', () => {
  const existing = new Set(oldCards.map(card => card.id));
  for (const card of all) {
    assert.equal(card.world, 'halloween');
    assert.match(card.id, /^once-hw-(?:character|thing|place|aspect|event|ending)-[a-z]+(?:-[a-z]+)*$/);
    assert.equal(existing.has(card.id), false, card.id);
    assert.equal((card.category ? D.storyById : D.endingById)[card.id], card);
    assert.ok(Object.isFrozen(card));
  }
  for (const field of ['id', 'artKey', 'imagePath', 'thumbnailPath']) {
    assert.equal(new Set(all.map(card => card[field])).size, 170, field);
  }
  assert.equal(new Set(H.storyCards.map(card => card.category + ':' + card.title.toLowerCase())).size, 150);
  assert.equal(new Set(H.endingCards.map(card => card.text.toLowerCase())).size, 20);
});

test('60 explicit reused paintings match the existing category, literal title and paths exactly', () => {
  const reuse = H.storyCards.filter(card => card.artOrigin === 'reuse');
  assert.equal(reuse.length, 60);
  for (const card of reuse) {
    const source = byOldId.get(card.sourceCardId);
    assert.ok(source, card.id + ' source exists');
    assert.equal(card.title, source.title, card.id + ' cannot reinterpret a different image');
    assert.equal(card.category, source.category);
    assert.notEqual(card.id, source.id);
    for (const field of ['imagePath', 'thumbnailPath', 'artKey']) assert.equal(card[field], source[field]);
    for (const file of [card.imagePath, card.thumbnailPath]) {
      assert.ok(fs.existsSync(path.join(repo, file)), card.id + ': ' + file);
      assert.ok(fs.statSync(path.join(repo, file)).size > 100);
    }
  }
});

test('90 new Story scenes and all 20 Ending scenes have their own Halloween art paths and briefs', () => {
  const fresh = [...H.storyCards.filter(card => card.artOrigin === 'new'), ...H.endingCards];
  assert.equal(fresh.length, 110);
  const oldPaths = new Set(oldCards.map(card => card.imagePath));
  for (const card of fresh) {
    const category = card.category || 'ending';
    const slug = card.id.replace('once-hw-' + category + '-', '');
    assert.equal(card.sourceCardId, null);
    assert.equal(card.artKey, 'halloween.' + category + '.' + slug);
    assert.equal(card.imagePath, 'assets/once-upon-a-time/halloween/' + category + '/' + slug + '-v1.webp');
    assert.equal(card.thumbnailPath, 'assets/once-upon-a-time/halloween/' + category + '/' + slug + '-v1-thumb.webp');
    assert.equal(oldPaths.has(card.imagePath), false);
    assert.ok(card.artBrief.length >= 60, card.id + ' needs a literal image-content brief');
    assert.doesNotMatch(card.artBrief, /https?:|data:|placeholder|stock photo/i);
  }
});

test('Halloween Story words are short, flexible English hooks rather than creative-writing instructions', () => {
  const short = H.storyCards.filter(card => card.title.split(/\s+/).length <= 2);
  assert.ok(short.length >= 145, 'at least 96% one- or two-word hooks');
  for (const card of H.storyCards) {
    assert.match(card.title, /^[\p{L}]+(?: [\p{L}]+){0,2}$/u, card.id);
    assert.ok(card.title.length <= 24, card.id);
    assert.ok(card.description.length >= 20 && card.description.length <= 95, card.id);
    assert.doesNotMatch(card.title, /^(?:A|An|The)\b|\b(?:who|whose|wearing|with)\b/i);
  }
  for (const title of ['Ghost', 'Pumpkin', 'Witch', 'Black Cat', 'Haunted House', 'Cursed', 'Midnight',
    'Rubber Duck', 'Candy Apple', 'Bathroom', 'Clumsy', 'Prank', 'Pizza Delivery']) {
    assert.ok(H.storyCards.some(card => card.title === title), title + ' keeps spooky and comic hooks varied');
  }
});

test('Ending sentences stay brief, original, friendly and readable with the approved funny tone', () => {
  for (const card of H.endingCards) {
    assert.match(card.text, /^[A-Z][\p{L} ,'.-]+\.$/u, card.id);
    assert.ok(card.text.length <= 95, card.id);
    assert.ok(card.text.split(/\s+/).length <= 12, card.id);
    assert.doesNotMatch(card.text, /\b(?:blood|gore|murder|corpse|torture|dismember|stab|screaming)\b/i);
    assert.ok(card.label.length <= 24, card.id);
    assert.equal(Object.hasOwn(card, 'title'), false, 'Ending text must not be replaced by a short title in the existing card renderer');
  }
  for (const id of ['snack', 'small-cat', 'silly-voice', 'cake', 'tuesdays', 'strange-pet']) {
    assert.ok(H.endingCards.some(card => card.id === 'once-hw-ending-' + id));
  }
});

test('the standalone Halloween module exposes the same immutable deck through browser and AMD loading', () => {
  const source = fs.readFileSync(path.join(repo, 'once-upon-a-time-halloween-deck.js'), 'utf8');
  const browser = {};
  vm.runInNewContext(source, browser);
  assert.equal(JSON.stringify(browser.ONCE_HALLOWEEN_DECK), JSON.stringify(H));
  let amd;
  const define = (deps, factory) => { assert.equal(deps.length, 0); amd = factory(); };
  define.amd = true;
  vm.runInNewContext(source, { define });
  assert.equal(JSON.stringify(amd), JSON.stringify(H));
  assert.ok(Object.isFrozen(amd));
});
