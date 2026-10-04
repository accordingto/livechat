'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const DECK = require('../once-upon-a-time-deck.js');
const repoRoot = path.join(__dirname, '..');
const categoryCounts = { character: 23, thing: 23, place: 23, aspect: 23, event: 22 };

test('core deck contains 114 story cards and 51 distinct endings with balanced categories', () => {
  assert.equal(DECK.storyCards.length, 114);
  assert.equal(DECK.endingCards.length, 51);
  assert.deepEqual(DECK.categories.map(category => category.id), Object.keys(categoryCounts));
  const allCards = [...DECK.storyCards, ...DECK.endingCards];
  assert.equal(new Set(allCards.map(card => card.id)).size, 165);
  assert.equal(new Set(allCards.map(card => card.artKey)).size, 165);
  assert.equal(new Set(DECK.storyCards.map(card => card.title.toLowerCase())).size, 114);
  assert.equal(new Set(DECK.endingCards.map(card => card.text.toLowerCase())).size, 51);
  for (const [category, expected] of Object.entries(categoryCounts)) {
    const cards = DECK.storyCards.filter(card => card.category === category);
    assert.equal(cards.length, expected, category);
    assert.equal(cards.filter(card => card.isInterrupt).length, 4, category + ' Interrupt cards');
  }
  assert.equal(DECK.storyCards.filter(card => card.isInterrupt).length, 20);
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

test('art manifest accounts for all 165 individual reviewed meaning-matched paintings', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets/once-upon-a-time/art-manifest.json'), 'utf8'));
  assert.equal(manifest.version, 2);
  assert.equal(manifest.uniqueIllustrationCount, 165);
  assert.equal(Object.keys(manifest.cards).length, 165);
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

test('all165 paintings and330 main/thumbnail WebPs exist, are distinct and optimized for cards', () => {
  const uniquePaths = new Set([...DECK.storyCards, ...DECK.endingCards].map(card => card.imagePath));
  assert.equal(uniquePaths.size,165);
  const hashes=new Set();let totalBytes=0;
  for (const file of uniquePaths) {
    for(const [asset,expectedWidth] of [[file,768],[file.replace('.webp','-thumb.webp'),384]]){
      const bytes=fs.readFileSync(path.join(repoRoot,asset));
      assert.equal(bytes.subarray(0,4).toString(),'RIFF',asset);assert.equal(bytes.subarray(8,12).toString(),'WEBP',asset);
      assert.equal(bytes.subarray(12,16).toString(),'VP8 ',asset);
      assert.equal(bytes.readUInt16LE(26)&0x3fff,expectedWidth,asset);
      assert.equal(bytes.readUInt16LE(28)&0x3fff,expectedWidth*1.5,asset);
      totalBytes+=bytes.length;
      if(expectedWidth===768)hashes.add(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
    }
  }
  assert.equal(hashes.size,165,'no generic or duplicated painting substitutes');
  assert.ok(totalBytes<80*1024*1024,'optimized artwork must remain under80MiB');
});

test('the same deck loads as a browser global without CommonJS', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'once-upon-a-time-deck.js'), 'utf8'), context);
  assert.equal(context.ONCE_DECK.storyCards.length, 114);
  assert.equal(context.ONCE_DECK.endingCards.length, 51);
  assert.equal(context.ONCE_DECK.storyById[DECK.storyCards[0].id].title, DECK.storyCards[0].title);
});
