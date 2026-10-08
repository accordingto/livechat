(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.ONCE_DECK = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Original, hand-authored core deck. A title, its language and its art can change
  // independently of the rules. The final boolean marks a category Interrupt card.
  // Each card has its own meaning-matched painting and a small mobile thumbnail.
  // Text, art and rules remain independently editable; card IDs never change.
  // Most titles are flexible, familiar story elements rather than a prescribed
  // character description. A small set of fairy-tale twists keeps the deck varied.
  // Legacy slugs stay stable for saved games and still use their literal artwork.
  // Original additions favor broad actions and reusable story hooks; category
  // totals need not match. Existing cards and Interrupt flags remain unchanged.
  const assetRoot = 'assets/once-upon-a-time/';
  const categories = Object.freeze([
    { id: 'character', label: 'Character', color: '#d4af37', iconKey: 'crown' },
    { id: 'thing', label: 'Thing', color: '#22c55e', iconKey: 'cube' },
    { id: 'place', label: 'Place', color: '#f97316', iconKey: 'location' },
    { id: 'aspect', label: 'Aspect', color: '#3b82f6', iconKey: 'eye' },
    { id: 'event', label: 'Event', color: '#a855f7', iconKey: 'bolt' }
  ].map(category => Object.freeze(category)));

  const storyGroups = [
    ['character', [
      ['candle-keeper', 'Caretaker', true],
      ['lost-heir', 'Traveler', false],
      ['hill-giant', 'Giant', false],
      ['quiet-prince', 'Prince', false],
      ['river-witch', 'Witch', true],
      ['young-miller', 'Miller', false],
      ['fox', 'Fox', false],
      ['woodcutter', 'Woodcutter', false],
      ['glass-knight', 'Glass Knight', true],
      ['moon-cat', 'Cat', false],
      ['royal-cook', 'Cook', false],
      ['wandering-singer', 'Singer', false],
      ['old-shepherd', 'Shepherd', false],
      ['masked-guest', 'Masked Guest', false],
      ['forest-child', 'Child', true],
      ['wise-crow', 'Crow', false],
      ['tiny-dragon', 'Dragon', false],
      ['gate-guard', 'Guard', false],
      ['sea-sister', 'Mermaid', false],
      ['travelling-judge', 'Judge', false],
      ['talking-hare', 'Talking Hare', false],
      ['poor-tailor', 'Tailor', false],
      ['sleepy-king', 'King', false],
      ['friend', 'Friend', false],
      ['thief', 'Thief', false],
      ['dog', 'Dog', false]
    ]],
    ['thing', [
      ['silver-needle', 'Needle', true],
      ['empty-crown', 'Crown', false],
      ['wishing-coin', 'Coin', false],
      ['broken-sword', 'Broken Sword', false],
      ['green-bottle', 'Bottle', true],
      ['red-ribbon', 'Ribbon', false],
      ['wooden-flute', 'Flute', false],
      ['locked-chest', 'Chest', false],
      ['walking-boots', 'Boots', true],
      ['golden-apple', 'Golden Apple', false],
      ['old-map', 'Map', false],
      ['glass-bell', 'Bell', false],
      ['warm-cloak', 'Cloak', false],
      ['black-feather', 'Feather', false],
      ['secret-letter', 'Letter', true],
      ['stone-ring', 'Ring', false],
      ['lantern', 'Lantern', false],
      ['sleeping-potion', 'Potion', false],
      ['copper-mirror', 'Mirror', false],
      ['bread-basket', 'Bread', false],
      ['spinning-wheel', 'Spinning Wheel', false],
      ['pocket-watch', 'Watch', false],
      ['pearl', 'Pearl', false],
      ['key', 'Key', false],
      ['rope', 'Rope', false],
      ['book', 'Book', false]
    ]],
    ['place', [
      ['thorn-garden', 'Garden', true],
      ['lonely-tower', 'Tower', false],
      ['deep-well', 'Well', false],
      ['misty-bridge', 'Bridge', false],
      ['hidden-valley', 'Valley', true],
      ['old-mill', 'Mill', false],
      ['royal-kitchen', 'Kitchen', false],
      ['snowy-pass', 'Mountain Pass', false],
      ['moonlit-lake', 'Lake', true],
      ['empty-village', 'Village', false],
      ['stone-circle', 'Stone Circle', false],
      ['secret-tunnel', 'Tunnel', false],
      ['high-mountain', 'Mountain', false],
      ['market-square', 'Market', false],
      ['island-castle', 'Castle', true],
      ['dark-attic', 'Attic', false],
      ['riverbank', 'Riverbank', false],
      ['wild-meadow', 'Meadow', false],
      ['seaside-cave', 'Cave', false],
      ['golden-hall', 'Hall', false],
      ['crossroads', 'Crossroads', false],
      ['abandoned-chapel', 'Chapel', false],
      ['tree-house', 'Tree House', false],
      ['forest', 'Forest', false],
      ['river', 'River', false]
    ]],
    ['aspect', [
      ['invisible', 'Invisible', true],
      ['merciful', 'Kind', false],
      ['jealous', 'Jealous', false],
      ['shy', 'Shy', false],
      ['bewitched', 'Bewitched', true],
      ['honest', 'Honest', false],
      ['frozen', 'Frozen', false],
      ['fearless', 'Brave', false],
      ['forgotten', 'Forgotten', true],
      ['greedy', 'Greedy', false],
      ['silent', 'Silent', false],
      ['gentle', 'Gentle', false],
      ['lonely', 'Lonely', false],
      ['wild', 'Wild', false],
      ['unlucky', 'Unlucky', true],
      ['golden', 'Golden', false],
      ['tired', 'Tired', false],
      ['tiny', 'Tiny', false],
      ['disguised', 'Disguised', false],
      ['broken', 'Broken', false],
      ['patient', 'Patient', false],
      ['beautiful', 'Beautiful', false],
      ['hungry', 'Hungry', false],
      ['happy', 'Happy', false]
    ]],
    ['event', [
      ['unexpected-guest', 'Arrival', true],
      ['broken-promise', 'Broken Promise', false],
      ['secret-meeting', 'Secret Meeting', false],
      ['brave-choice', 'Choice', false],
      ['sudden-storm', 'Storm', true],
      ['wedding', 'Wedding', false],
      ['gift', 'Gift', false],
      ['mistake', 'Mistake', false],
      ['narrow-escape', 'Escape', true],
      ['long-sleep', 'Sleep', false],
      ['search', 'Search', false],
      ['farewell', 'Goodbye', false],
      ['feast', 'Feast', false],
      ['warning', 'Warning', false],
      ['wish-granted', 'Wish Comes True', true],
      ['lost-path', 'Getting Lost', false],
      ['change-of-heart', 'Change of Heart', false],
      ['race', 'Race', false],
      ['trade', 'Trade', false],
      ['return', 'Return', false],
      ['door-opens', 'Door Opens', false],
      ['hidden-truth', 'Secret Revealed', false],
      ['rescue', 'Rescue', false],
      ['chase', 'Chase', false],
      ['discovery', 'Discovery', false],
      ['quarrel', 'Quarrel', false],
      ['laughter', 'Laughter', false],
      ['repair', 'Repair', false]
    ]]
  ];

  const storyCards = Object.freeze(storyGroups.flatMap(([category, rows]) =>
    rows.map(([slug, title, isInterrupt]) => Object.freeze({
      id: 'once-' + category + '-' + slug,
      title,
      category,
      isInterrupt,
      artKey: 'story.' + category + '.' + slug,
      imagePath: assetRoot + category + '/' + slug + '-v2.webp',
      thumbnailPath: assetRoot + category + '/' + slug + '-v2-thumb.webp'
    }))));

  // One broad sentence each: hopeful, unusual, ironic and gently dark conclusions.
  const endingRows = [
    ['shared-table', 'They shared one table, and the quarrel finally ended.'],
    ['smallest-voice', 'The smallest voice was heard throughout the kingdom.'],
    ['safe-road', 'At dawn, the road led them safely home.'],
    ['empty-throne', 'The crown stayed empty, and the people lived in peace.'],
    ['kindness-returned', 'A kind deed returned when it was needed most.'],
    ['garden-of-friends', 'The old enemies planted a garden together.'],
    ['lasting-friendship', 'The wish faded, but the friendship remained.'],
    ['another-treasure', 'Nobody found the treasure, yet everyone gained something.'],
    ['cost-of-truth', 'The truth cost them much and set them free.'],
    ['welcome-stranger', 'The stranger was welcomed as one of their own.'],
    ['open-doors', 'From that day, no door was closed to a traveler.'],
    ['ordinary-wonder', 'They chose an ordinary life and called it wonderful.'],
    ['changed-return', 'What had been lost returned in a different form.'],
    ['laughing-curse', 'The curse ended with a laugh.'],
    ['promise-kept', 'The last promise was kept, even after many years.'],
    ['listening-heart', 'The lonely heart found someone willing to listen.'],
    ['unknown-savior', 'The kingdom celebrated without knowing who had saved it.'],
    ['gift-passed-on', 'The gift was passed on to someone who needed it.'],
    ['full-circle', 'The long journey ended where it had begun.'],
    ['beyond-the-palace', 'They left the palace and found happiness elsewhere.'],
    ['silent-bells', 'Peace returned, but the bells never rang again.'],
    ['buried-secret', 'The secret was buried beneath a new tree.'],
    ['waiting-light', 'Each night, a light still waited at the window.'],
    ['hollow-victory', 'The victor discovered that winning was not enough.'],
    ['quiet-mirror', 'The mirror went quiet, and nobody missed its advice.'],
    ['borrowed-magic', 'All the borrowed magic returned to the forest.'],
    ['last-laugh', 'The fool had the last laugh and shared it kindly.'],
    ['unfinished-map', 'They burned the map and followed their hearts.'],
    ['passing-seasons', 'The seasons changed, and the old sorrow grew lighter.'],
    ['locked-door', 'The door was locked forever, and life continued outside.'],
    ['new-song', 'Their story became a song with a kinder ending.'],
    ['different-names', 'They met again, though neither kept the same name.'],
    ['simple-supper', 'A simple supper proved richer than all the treasure.'],
    ['gentle-ruler', 'The feared ruler learned to ask instead of command.'],
    ['vanished-footprints', 'By morning, only a few strange footprints remained.'],
    ['unasked-question', 'Everyone was happy enough to leave one question unanswered.'],
    ['broken-spell', 'The spell broke when someone finally said goodbye.'],
    ['earned-rest', 'The weary travelers found rest beneath a familiar roof.'],
    ['better-bargain', 'Both sides left the bargain with more than they expected.'],
    ['forgotten-name', 'The village prospered, but the hero was soon forgotten.'],
    ['shared-burden', 'They carried the burden together until it felt light.'],
    ['unlikely-home', 'Home turned out to be the place they had feared.'],
    ['changed-wish', 'The final wish was simply to begin again.'],
    ['quiet-monster', 'The monster chose a quiet life beyond the hills.'],
    ['second-chance', 'Forgiveness opened a path that revenge had hidden.'],
    ['invisible-gift', 'No one could see the gift, but everyone felt it.'],
    ['watchful-moon', 'The moon kept their secret for the rest of time.'],
    ['keeper-of-keys', 'The keeper gave away the keys and was finally free.'],
    ['strange-peace', 'They made peace with the thing they could not understand.'],
    ['last-candle', 'The last candle went out after everyone was safe.'],
    ['new-beginning', 'Someone else picked up the tale, and a new adventure began.']
  ];

  const endingCards = Object.freeze(endingRows.map(([slug, text]) => Object.freeze({
    id: 'once-ending-' + slug,
    text,
    artKey: 'ending.' + slug,
    imagePath: assetRoot + 'ending/' + slug + '-v2.webp',
    thumbnailPath: assetRoot + 'ending/' + slug + '-v2-thumb.webp'
  })));

  const storyById = Object.freeze(Object.fromEntries(storyCards.map(card => [card.id, card])));
  const endingById = Object.freeze(Object.fromEntries(endingCards.map(card => [card.id, card])));
  const cardBacks = Object.freeze({
    story: assetRoot + 'card-backs/story-back.svg',
    ending: assetRoot + 'card-backs/ending-back.svg'
  });

  return Object.freeze({ storyCards, endingCards, categories, storyById, endingById, cardBacks });
});
