(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.ONCE_DECK = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Original, hand-authored core deck. A title, its language and its art can change
  // independently of the rules. The final boolean marks a category Interrupt card.
  // V1 intentionally shares one painting within each category; artKey stays unique
  // so any of the 165 cards can receive its own illustration without changing IDs.
  const assetRoot = 'assets/once-upon-a-time/';
  const categories = Object.freeze([
    { id: 'character', label: 'Character', color: '#d9b45f', iconKey: 'crown' },
    { id: 'thing', label: 'Thing', color: '#55996d', iconKey: 'sword' },
    { id: 'place', label: 'Place', color: '#ce804c', iconKey: 'location' },
    { id: 'aspect', label: 'Aspect', color: '#6b91c7', iconKey: 'star' },
    { id: 'event', label: 'Event', color: '#ad7ec6', iconKey: 'bolt' }
  ].map(category => Object.freeze(category)));

  const storyGroups = [
    ['character', [
      ['candle-keeper', 'Candle Keeper', true],
      ['lost-heir', 'Lost Heir', false],
      ['hill-giant', 'Hill Giant', false],
      ['quiet-prince', 'Quiet Prince', false],
      ['river-witch', 'River Witch', true],
      ['young-miller', 'Young Miller', false],
      ['fox', 'Fox', false],
      ['woodcutter', 'Woodcutter', false],
      ['glass-knight', 'Glass Knight', true],
      ['moon-cat', 'Moon Cat', false],
      ['royal-cook', 'Royal Cook', false],
      ['wandering-singer', 'Wandering Singer', false],
      ['old-shepherd', 'Old Shepherd', false],
      ['masked-guest', 'Masked Guest', false],
      ['forest-child', 'Forest Child', true],
      ['wise-crow', 'Wise Crow', false],
      ['tiny-dragon', 'Tiny Dragon', false],
      ['gate-guard', 'Gate Guard', false],
      ['sea-sister', 'Sea Sister', false],
      ['travelling-judge', 'Travelling Judge', false],
      ['talking-hare', 'Talking Hare', false],
      ['poor-tailor', 'Poor Tailor', false],
      ['sleepy-king', 'Sleepy King', false]
    ]],
    ['thing', [
      ['silver-needle', 'Silver Needle', true],
      ['empty-crown', 'Empty Crown', false],
      ['wishing-coin', 'Wishing Coin', false],
      ['broken-sword', 'Broken Sword', false],
      ['green-bottle', 'Green Bottle', true],
      ['red-ribbon', 'Red Ribbon', false],
      ['wooden-flute', 'Wooden Flute', false],
      ['locked-chest', 'Locked Chest', false],
      ['walking-boots', 'Walking Boots', true],
      ['golden-apple', 'Golden Apple', false],
      ['old-map', 'Old Map', false],
      ['glass-bell', 'Glass Bell', false],
      ['warm-cloak', 'Warm Cloak', false],
      ['black-feather', 'Black Feather', false],
      ['secret-letter', 'Secret Letter', true],
      ['stone-ring', 'Stone Ring', false],
      ['lantern', 'Lantern', false],
      ['sleeping-potion', 'Sleeping Potion', false],
      ['copper-mirror', 'Copper Mirror', false],
      ['bread-basket', 'Bread Basket', false],
      ['spinning-wheel', 'Spinning Wheel', false],
      ['pocket-watch', 'Pocket Watch', false],
      ['pearl', 'Pearl', false]
    ]],
    ['place', [
      ['thorn-garden', 'Thorn Garden', true],
      ['lonely-tower', 'Lonely Tower', false],
      ['deep-well', 'Deep Well', false],
      ['misty-bridge', 'Misty Bridge', false],
      ['hidden-valley', 'Hidden Valley', true],
      ['old-mill', 'Old Mill', false],
      ['royal-kitchen', 'Royal Kitchen', false],
      ['snowy-pass', 'Snowy Pass', false],
      ['moonlit-lake', 'Moonlit Lake', true],
      ['empty-village', 'Empty Village', false],
      ['stone-circle', 'Stone Circle', false],
      ['secret-tunnel', 'Secret Tunnel', false],
      ['high-mountain', 'High Mountain', false],
      ['market-square', 'Market Square', false],
      ['island-castle', 'Island Castle', true],
      ['dark-attic', 'Dark Attic', false],
      ['riverbank', 'Riverbank', false],
      ['wild-meadow', 'Wild Meadow', false],
      ['seaside-cave', 'Seaside Cave', false],
      ['golden-hall', 'Golden Hall', false],
      ['crossroads', 'Crossroads', false],
      ['abandoned-chapel', 'Abandoned Chapel', false],
      ['tree-house', 'Tree House', false]
    ]],
    ['aspect', [
      ['invisible', 'Invisible', true],
      ['merciful', 'Merciful', false],
      ['jealous', 'Jealous', false],
      ['shy', 'Shy', false],
      ['bewitched', 'Bewitched', true],
      ['honest', 'Honest', false],
      ['frozen', 'Frozen', false],
      ['fearless', 'Fearless', false],
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
      ['hungry', 'Hungry', false]
    ]],
    ['event', [
      ['unexpected-guest', 'An Unexpected Guest', true],
      ['broken-promise', 'A Broken Promise', false],
      ['secret-meeting', 'A Secret Meeting', false],
      ['brave-choice', 'A Brave Choice', false],
      ['sudden-storm', 'A Sudden Storm', true],
      ['wedding', 'A Wedding', false],
      ['gift', 'A Gift', false],
      ['mistake', 'A Mistake', false],
      ['narrow-escape', 'A Narrow Escape', true],
      ['long-sleep', 'A Long Sleep', false],
      ['search', 'A Search', false],
      ['farewell', 'A Farewell', false],
      ['feast', 'A Feast', false],
      ['warning', 'A Warning', false],
      ['wish-granted', 'A Wish Granted', true],
      ['lost-path', 'A Lost Path', false],
      ['change-of-heart', 'A Change of Heart', false],
      ['race', 'A Race', false],
      ['trade', 'A Trade', false],
      ['return', 'A Return', false],
      ['door-opens', 'A Door Opens', false],
      ['hidden-truth', 'A Hidden Truth', false]
    ]]
  ];

  const storyCards = Object.freeze(storyGroups.flatMap(([category, rows]) =>
    rows.map(([slug, title, isInterrupt]) => Object.freeze({
      id: 'once-' + category + '-' + slug,
      title,
      category,
      isInterrupt,
      artKey: 'story.' + category + '.' + slug,
      imagePath: assetRoot + category + '/fallback.png'
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
    imagePath: assetRoot + 'ending/fallback.png'
  })));

  const storyById = Object.freeze(Object.fromEntries(storyCards.map(card => [card.id, card])));
  const endingById = Object.freeze(Object.fromEntries(endingCards.map(card => [card.id, card])));
  const cardBacks = Object.freeze({
    story: assetRoot + 'card-backs/story-back.svg',
    ending: assetRoot + 'card-backs/ending-back.svg'
  });

  return Object.freeze({ storyCards, endingCards, categories, storyById, endingById, cardBacks });
});
