/* Bomb Relay scene cards — original scenes, same job as the picture cards in a
 * "pass the bomb" party game: everyone names one thing that belongs in the
 * picture before passing the hidden-fuse bomb.
 *
 * Every card is a broad, familiar place or moment, so even beginners can name
 * at least fifteen different things for it in simple English. The scene title
 * is English (the teaching material); zh is only a small helper line on
 * Chinese UI screens.
 *
 * Pictures live at assets/bomb-relay/<id>.svg and are first-pass art made by
 * scripts/bomb-relay-build-art.cjs. A refined illustration may replace any
 * file as long as it keeps the same file name and a 4:3 picture (400 × 300
 * viewBox or 1200 × 900 pixels). Bump ART_VERSION when replacing pictures.
 */
var BOMB_RELAY_DECK = (() => {
  'use strict';
  const ART_VERSION = 'art-1';
  const categories = ['mixed', 'everyday', 'nature', 'fun', 'fantasy'];
  const raw = [
    // Everyday places
    ['kitchen', 'everyday', '🍳', 'In the Kitchen', '廚房'],
    ['bathroom', 'everyday', '🛁', 'In the Bathroom', '浴室'],
    ['bedroom', 'everyday', '🛏️', 'In the Bedroom', '臥室'],
    ['living-room', 'everyday', '🛋️', 'In the Living Room', '客廳'],
    ['classroom', 'everyday', '🏫', 'In a Classroom', '教室'],
    ['supermarket', 'everyday', '🛒', 'At the Supermarket', '超市'],
    ['restaurant', 'everyday', '🍽️', 'At a Restaurant', '餐廳'],
    ['cafe', 'everyday', '☕', 'At a Café', '咖啡廳'],
    ['hospital', 'everyday', '🏥', 'At the Hospital', '醫院'],
    ['office', 'everyday', '💼', 'In the Office', '辦公室'],
    ['airport', 'everyday', '✈️', 'At the Airport', '機場'],
    ['train-station', 'everyday', '🚆', 'At the Train Station', '火車站'],
    ['library', 'everyday', '📚', 'In the Library', '圖書館'],
    ['gym', 'everyday', '🏋️', 'At the Gym', '健身房'],
    ['hair-salon', 'everyday', '💇', 'At the Hair Salon', '美髮店'],
    ['convenience-store', 'everyday', '🏪', 'At a Convenience Store', '便利商店'],
    ['night-market', 'everyday', '🏮', 'At a Night Market', '夜市'],
    ['bakery', 'everyday', '🥐', 'At the Bakery', '麵包店'],
    ['pet-shop', 'everyday', '🐶', 'At the Pet Shop', '寵物店'],
    ['city-street', 'everyday', '🏙️', 'On a City Street', '城市街道'],
    ['toy-store', 'everyday', '🧸', 'In a Toy Store', '玩具店'],
    ['dentist', 'everyday', '🦷', 'At the Dentist', '牙醫診所'],
    // Nature and outdoors
    ['beach', 'nature', '🏖️', 'At the Beach', '海灘'],
    ['forest', 'nature', '🌲', 'In the Forest', '森林'],
    ['farm', 'nature', '🐄', 'On a Farm', '農場'],
    ['zoo', 'nature', '🦁', 'At the Zoo', '動物園'],
    ['park', 'nature', '🌳', 'In the Park', '公園'],
    ['mountain', 'nature', '🏔️', 'On a Mountain', '山上'],
    ['campsite', 'nature', '🏕️', 'At a Campsite', '露營地'],
    ['under-the-sea', 'nature', '🐠', 'Under the Sea', '海底'],
    ['snowy-day', 'nature', '⛄', 'On a Snowy Day', '下雪天'],
    ['rainy-day', 'nature', '☔', 'On a Rainy Day', '下雨天'],
    ['desert', 'nature', '🌵', 'In the Desert', '沙漠'],
    ['jungle', 'nature', '🐒', 'In the Jungle', '叢林'],
    ['picnic', 'nature', '🧺', 'At a Picnic', '野餐'],
    ['lake', 'nature', '🎣', 'At the Lake', '湖邊'],
    // Fun and events
    ['birthday-party', 'fun', '🎂', 'At a Birthday Party', '生日派對'],
    ['wedding', 'fun', '💒', 'At a Wedding', '婚禮'],
    ['movie-theater', 'fun', '🍿', 'At the Movies', '電影院'],
    ['concert', 'fun', '🎸', 'At a Concert', '演唱會'],
    ['amusement-park', 'fun', '🎢', 'At an Amusement Park', '遊樂園'],
    ['stadium', 'fun', '🏟️', 'At a Sports Stadium', '體育場'],
    ['swimming-pool', 'fun', '🏊', 'At the Swimming Pool', '游泳池'],
    ['karaoke', 'fun', '🎤', 'At Karaoke', 'KTV 唱歌'],
    ['christmas', 'fun', '🎄', 'At Christmas', '聖誕節'],
    ['halloween', 'fun', '🎃', 'On Halloween', '萬聖節'],
    ['lunar-new-year', 'fun', '🧧', 'At Lunar New Year', '農曆新年'],
    ['museum', 'fun', '🖼️', 'At a Museum', '博物館'],
    ['road-trip', 'fun', '🚗', 'On a Road Trip', '公路旅行'],
    ['video-call', 'fun', '💻', 'On a Video Call', '視訊通話'],
    // Fantasy and adventure
    ['outer-space', 'fantasy', '🚀', 'In Outer Space', '外太空'],
    ['pirate-ship', 'fantasy', '🏴‍☠️', 'On a Pirate Ship', '海盜船'],
    ['castle', 'fantasy', '🏰', 'In a Castle', '城堡'],
    ['haunted-house', 'fantasy', '👻', 'In a Haunted House', '鬼屋'],
    ['dinosaur-world', 'fantasy', '🦖', 'In Dinosaur Times', '恐龍時代'],
    ['magic-school', 'fantasy', '🪄', 'At a Magic School', '魔法學校'],
    ['circus', 'fantasy', '🎪', 'At the Circus', '馬戲團'],
    ['north-pole', 'fantasy', '🐧', 'At the North Pole', '北極'],
    ['desert-island', 'fantasy', '🏝️', 'On a Desert Island', '無人島'],
    ['robot-factory', 'fantasy', '🤖', 'In a Robot Factory', '機器人工廠'],
  ];
  const items = Object.freeze(raw.map(([id, category, emoji, en, zh]) => Object.freeze({
    id, category, emoji, en, zh, art: `assets/bomb-relay/${id}.svg?v=${ART_VERSION}`,
  })));
  const byId = new Map(items.map(card => [card.id, card]));
  return Object.freeze({
    ART_VERSION, categories: Object.freeze(categories), items,
    get: id => byId.get(id) || null,
    pool: category => category === 'mixed' || !categories.includes(category) ? items : items.filter(card => card.category === category),
  });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_DECK;
