'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const DECK = require('../once-upon-a-time-deck.js');
const repoRoot = path.join(__dirname, '..');
const categoryCounts = { character: 26, thing: 26, place: 25, aspect: 24, event: 28 };
const storyCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
const endingCount = 51;
const totalCount = storyCount + endingCount;
const newStoryElements = {
  character: ['Friend', 'Thief', 'Dog'],
  thing: ['Key', 'Rope', 'Book'],
  place: ['Forest', 'River'],
  aspect: ['Happy'],
  event: ['Rescue', 'Chase', 'Discovery', 'Quarrel', 'Laughter', 'Repair']
};
const addedIds = new Set(Object.entries(newStoryElements).flatMap(([category, titles]) =>
  titles.map(title => 'once-' + category + '-' + title.toLowerCase())));

test('expanded deck contains 129 story cards and 51 distinct endings with varied category totals', () => {
  assert.equal(storyCount, 129);
  assert.equal(DECK.storyCards.length, storyCount);
  assert.equal(DECK.endingCards.length, endingCount);
  assert.deepEqual(DECK.categories.map(category => category.id), Object.keys(categoryCounts));
  const allCards = [...DECK.storyCards, ...DECK.endingCards];
  assert.equal(new Set(allCards.map(card => card.id)).size, totalCount);
  assert.equal(new Set(allCards.map(card => card.artKey)).size, totalCount);
  assert.equal(new Set(DECK.storyCards.map(card => card.title.toLowerCase())).size, storyCount);
  assert.equal(new Set(DECK.endingCards.map(card => card.text.toLowerCase())).size, endingCount);
  for (const [category, expected] of Object.entries(categoryCounts)) {
    const cards = DECK.storyCards.filter(card => card.category === category);
    assert.equal(cards.length, expected, category);
    assert.equal(cards.filter(card => card.isInterrupt).length, 4, category + ' Interrupt cards');
  }
  assert.equal(DECK.storyCards.filter(card => card.isInterrupt).length, 20);
});

test('15 original additions supply short story hooks without replacing released cards or adding Interrupts', () => {
  assert.equal(addedIds.size, 15);
  for (const [category, titles] of Object.entries(newStoryElements)) {
    for (const title of titles) {
      const id = 'once-' + category + '-' + title.toLowerCase();
      const card = DECK.storyById[id];
      assert.ok(card, id);
      assert.equal(card.title, title);
      assert.equal(card.category, category);
      assert.equal(card.isInterrupt, false, id + ' is a normal Story card');
    }
  }
  const released = DECK.storyCards.filter(card => !addedIds.has(card.id));
  assert.equal(released.length, 114);
  const rows = released.map(card => [card.id, card.title, card.category, card.isInterrupt,
    card.artKey, card.imagePath, card.thumbnailPath]).sort((a, b) => a[0].localeCompare(b[0]));
  // Snapshot of all 114 released records before this additive content update.
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    'af48f07cd8893a02e48a58d7d18bcba8456fc104aee7bdd65b2d45402130db2b');
});

test('every story and ending has simple English content, a stable ID and independently swappable art', () => {
  for (const card of DECK.storyCards) {
    assert.match(card.id, /^once-(character|thing|place|aspect|event)-[a-z]+(?:-[a-z]+)*$/);
    assert.equal(typeof card.isInterrupt, 'boolean');
    assert.match(card.title, /^[A-Za-z]+(?: [A-Za-z]+){0,3}$/);
    assert.ok(card.title.length <= 32, card.id);
    assert.equal(card.artKey, 'story.' + card.category + '.' + card.id.replace('once-' + card.category + '-', ''));
    const slug=card.id.replace('once-'+card.category+'-','');
    assert.equal(card.imagePath, 'assets/once-upon-a-time/' + card.category + '/'+slug+'-v2.webp');
    assert.equal(card.thumbnailPath, 'assets/once-upon-a-time/' + card.category + '/'+slug+'-v2-thumb.webp');
    assert.equal(DECK.storyById[card.id], card);
    assert.ok(Object.isFrozen(card));
  }
  for (const card of DECK.endingCards) {
    assert.match(card.id, /^once-ending-[a-z]+(?:-[a-z]+)*$/);
    assert.match(card.text, /^[A-Z][A-Za-z ,']+\.$/);
    assert.ok(card.text.split(/\s+/).length <= 18, card.id);
    assert.ok(card.text.length <= 115, card.id);
    assert.equal(card.artKey, 'ending.' + card.id.replace('once-ending-', ''));
    const slug=card.id.replace('once-ending-','');
    assert.equal(card.imagePath, 'assets/once-upon-a-time/ending/'+slug+'-v2.webp');
    assert.equal(card.thumbnailPath, 'assets/once-upon-a-time/ending/'+slug+'-v2-thumb.webp');
    assert.equal(DECK.endingById[card.id], card);
    assert.ok(Object.isFrozen(card));
  }
  assert.ok(Object.isFrozen(DECK.storyCards));
  assert.ok(Object.isFrozen(DECK.endingCards));
});

test('Story vocabulary mostly uses flexible core words with a small set of fairy-tale twists', () => {
  const singleWords = DECK.storyCards.filter(card => card.title.split(/\s+/).length === 1);
  const shortTitles = DECK.storyCards.filter(card => card.title.split(/\s+/).length <= 2);
  assert.ok(singleWords.length >= DECK.storyCards.length * 0.8, 'at least 80% should be single core words');
  assert.ok(shortTitles.length >= DECK.storyCards.length * 0.95, 'almost all titles should be one or two words');
  for (const card of DECK.storyCards) {
    assert.doesNotMatch(card.title, /^(?:A|An|The)\b|\b(?:who|whose|with|wearing)\b/i, card.id);
  }
  for (const title of ['Prince', 'Witch', 'Cat', 'Cook', 'Child', 'Dragon', 'Mermaid',
    'Crown', 'Map', 'Letter', 'Mirror', 'Garden', 'Bridge', 'Village', 'Castle', 'Storm', 'Escape']) {
    assert.ok(DECK.storyCards.some(card => card.title === title), title + ' remains a broad story element');
  }
  for (const title of ['Glass Knight', 'Golden Apple', 'Spinning Wheel', 'Change of Heart']) {
    assert.ok(DECK.storyCards.some(card => card.title === title), title + ' retains some variety');
  }
});

test('vocabulary refresh retains legacy card identities, artwork and the original Interrupt pool', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets/once-upon-a-time/art-manifest.json'), 'utf8'));
  assert.deepEqual(DECK.storyCards.map(card => card.id).sort(),
    Object.keys(manifest.cards).filter(id => !id.startsWith('once-ending-')).sort());
  const interruptIds = {
    character: ['candle-keeper', 'river-witch', 'glass-knight', 'forest-child'],
    thing: ['silver-needle', 'green-bottle', 'walking-boots', 'secret-letter'],
    place: ['thorn-garden', 'hidden-valley', 'moonlit-lake', 'island-castle'],
    aspect: ['invisible', 'bewitched', 'forgotten', 'unlucky'],
    event: ['unexpected-guest', 'sudden-storm', 'narrow-escape', 'wish-granted']
  };
  const expected = Object.entries(interruptIds).flatMap(([category, slugs]) =>
    slugs.map(slug => 'once-' + category + '-' + slug));
  assert.deepEqual(DECK.storyCards.filter(card => card.isInterrupt).map(card => card.id).sort(), expected.sort());
  const renamed = {
    'once-character-quiet-prince': 'Prince',
    'once-character-sea-sister': 'Mermaid',
    'once-thing-old-map': 'Map',
    'once-place-island-castle': 'Castle',
    'once-event-lost-path': 'Getting Lost'
  };
  for (const [id, title] of Object.entries(renamed)) {
    const card = DECK.storyById[id];
    assert.equal(card.title, title);
    assert.equal(card.imagePath, manifest.cards[id].imagePath);
    assert.equal(card.thumbnailPath, manifest.cards[id].thumbnailPath);
  }
});

test('art manifest accounts for every individual reviewed meaning-matched painting', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets/once-upon-a-time/art-manifest.json'), 'utf8'));
  assert.equal(manifest.version, 2);
  assert.equal(manifest.uniqueIllustrationCount, totalCount);
  assert.equal(Object.keys(manifest.cards).length, totalCount);
  assert.match(manifest.note, /meaning-matched/);
  assert.equal(manifest.mainWidth,768);assert.equal(manifest.thumbnailWidth,384);
  for (const card of [...DECK.storyCards, ...DECK.endingCards]) {
    const record=manifest.cards[card.id];
    assert.equal(record.artKey,card.artKey);assert.equal(record.imagePath,card.imagePath);
    assert.equal(record.thumbnailPath,card.thumbnailPath);assert.equal(record.status,'semantic-illustration');
    assert.ok(record.semanticDescription.length>20,card.id+' needs its own literal scene');
  }
});

test('Story and Ending backs are distinct original navy and gold SVGs', () => {
  const backs = Object.values(DECK.cardBacks).map(file => {
    assert.match(file, /^assets\/once-upon-a-time\/card-backs\/[a-z-]+\.svg$/);
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    assert.match(source, /<svg[^>]+viewBox="0 0 480 720"/);
    assert.match(source, /#0b1425/);
    assert.match(source, /#a27c36/);
    assert.doesNotMatch(source, /<text\b|<script\b|https?:\/\/[^" ]+(?:\.png|\.jpe?g)/);
    return source;
  });
  assert.notEqual(backs[0], backs[1]);
  assert.match(backs[0], /compass and open book/);
  assert.match(backs[1], /crescent moon above a closed book/);
});

test('all paintings and main/thumbnail WebPs exist, are distinct and optimized for cards', () => {
  const uniquePaths = new Set([...DECK.storyCards, ...DECK.endingCards].map(card => card.imagePath));
  assert.equal(uniquePaths.size,totalCount);
  const hashes=new Set();let totalBytes=0;
  for (const file of uniquePaths) {
    for(const [asset,expectedWidth] of [[file,768],[file.replace('.webp','-thumb.webp'),384]]){
      const bytes=fs.readFileSync(path.join(repoRoot,asset));
      assert.equal(bytes.subarray(0,4).toString(),'RIFF',asset);assert.equal(bytes.subarray(8,12).toString(),'WEBP',asset);
      assert.equal(bytes.subarray(12,16).toString(),'VP8 ',asset);
      assert.equal(bytes.readUInt16LE(26)&0x3fff,expectedWidth,asset);
      assert.equal(bytes.readUInt16LE(28)&0x3fff,expectedWidth*1.5,asset);
      totalBytes+=bytes.length;
      if(expectedWidth===768)hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
    }
  }
  assert.equal(hashes.size,totalCount,'no generic or duplicated painting substitutes');
  assert.ok(totalBytes<80*1024*1024,'optimized artwork must remain under80MiB');
});

test('the same deck loads as a browser global without CommonJS', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'once-upon-a-time-deck.js'), 'utf8'), context);
  assert.equal(context.ONCE_DECK.storyCards.length, storyCount);
  assert.equal(context.ONCE_DECK.endingCards.length, endingCount);
  assert.equal(context.ONCE_DECK.storyById[DECK.storyCards[0].id].title, DECK.storyCards[0].title);
});
