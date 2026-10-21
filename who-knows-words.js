/* WHO KNOWS? — secret-word bank.
 *
 * Every word must be guessable with yes-or-no questions by English learners:
 * one everyday concept, simple spelling, no slang and nothing that needs
 * American pop culture to understand. The Traditional Chinese gloss is only
 * shown to people who already know the word (the answerer and the hidden
 * roles), so they can answer confidently.
 *
 *   easy   — things everyone can see or touch every day
 *   medium — still concrete, but a place, job or object you need to think about
 *   hard   — an event, a feeling-free concept or a natural effect; still fair to
 *            reach with yes/no questions, but rarely the first thing you ask
 *
 * IDs are stable (wk-e001 …) so a room's "already used" history survives later
 * edits. Add new words at the END of a level; never reuse or reorder an ID.
 */
var WHO_KNOWS_WORDS = (() => {
  'use strict';
  const raw = {
    easy: [
      ['Dog', '狗', 'animal'], ['Cat', '貓', 'animal'], ['Rabbit', '兔子', 'animal'], ['Elephant', '大象', 'animal'],
      ['Monkey', '猴子', 'animal'], ['Tiger', '老虎', 'animal'], ['Lion', '獅子', 'animal'], ['Panda', '熊貓', 'animal'],
      ['Penguin', '企鵝', 'animal'], ['Snake', '蛇', 'animal'], ['Frog', '青蛙', 'animal'], ['Duck', '鴨子', 'animal'],
      ['Chicken', '雞', 'animal'], ['Horse', '馬', 'animal'], ['Cow', '牛', 'animal'], ['Pig', '豬', 'animal'],
      ['Sheep', '綿羊', 'animal'], ['Fish', '魚', 'animal'], ['Bird', '鳥', 'animal'], ['Butterfly', '蝴蝶', 'animal'],
      ['Bee', '蜜蜂', 'animal'], ['Giraffe', '長頸鹿', 'animal'], ['Turtle', '烏龜', 'animal'], ['Mouse', '老鼠', 'animal'],
      ['Shark', '鯊魚', 'animal'],
      ['Apple', '蘋果', 'food'], ['Banana', '香蕉', 'food'], ['Orange', '柳橙', 'food'], ['Watermelon', '西瓜', 'food'],
      ['Strawberry', '草莓', 'food'], ['Pizza', '披薩', 'food'], ['Hamburger', '漢堡', 'food'], ['Ice cream', '冰淇淋', 'food'],
      ['Cake', '蛋糕', 'food'], ['Bread', '麵包', 'food'], ['Egg', '蛋', 'food'], ['Rice', '米飯', 'food'],
      ['Noodles', '麵', 'food'], ['Cheese', '起司', 'food'], ['Chocolate', '巧克力', 'food'], ['Cookie', '餅乾', 'food'],
      ['Sandwich', '三明治', 'food'], ['Milk', '牛奶', 'food'], ['Coffee', '咖啡', 'food'], ['Tea', '茶', 'food'],
      ['Carrot', '紅蘿蔔', 'food'], ['Tomato', '番茄', 'food'], ['Potato', '馬鈴薯', 'food'], ['Corn', '玉米', 'food'],
      ['Candy', '糖果', 'food'],
      ['Chair', '椅子', 'home'], ['Table', '桌子', 'home'], ['Bed', '床', 'home'], ['Sofa', '沙發', 'home'],
      ['Door', '門', 'home'], ['Window', '窗戶', 'home'], ['Lamp', '檯燈', 'home'], ['Clock', '時鐘', 'home'],
      ['Mirror', '鏡子', 'home'], ['Pillow', '枕頭', 'home'], ['Blanket', '毯子', 'home'], ['Cup', '杯子', 'home'],
      ['Spoon', '湯匙', 'home'], ['Fork', '叉子', 'home'], ['Knife', '刀子', 'home'], ['Plate', '盤子', 'home'],
      ['Toothbrush', '牙刷', 'home'], ['Towel', '毛巾', 'home'], ['Umbrella', '雨傘', 'thing'], ['Key', '鑰匙', 'thing'],
      ['Book', '書', 'thing'], ['Pen', '原子筆', 'thing'], ['Pencil', '鉛筆', 'thing'], ['Scissors', '剪刀', 'thing'],
      ['Bag', '包包', 'thing'], ['Hat', '帽子', 'thing'], ['Shoe', '鞋子', 'thing'], ['Sock', '襪子', 'thing'],
      ['Glasses', '眼鏡', 'thing'], ['Phone', '手機', 'thing'], ['Computer', '電腦', 'thing'], ['Television', '電視', 'thing'],
      ['Camera', '相機', 'thing'], ['Ball', '球', 'thing'], ['Balloon', '氣球', 'thing'],
      ['Sun', '太陽', 'nature'], ['Moon', '月亮', 'nature'], ['Star', '星星', 'nature'], ['Rain', '雨', 'nature'],
      ['Snow', '雪', 'nature'], ['Tree', '樹', 'nature'], ['Flower', '花', 'nature'], ['Rainbow', '彩虹', 'nature'],
      ['Cloud', '雲', 'nature'], ['Ocean', '海洋', 'nature'], ['Mountain', '山', 'nature'], ['River', '河', 'nature'],
      ['Beach', '海灘', 'nature'], ['Fire', '火', 'nature'], ['Ice', '冰', 'nature'],
      ['Car', '汽車', 'transport'], ['Bus', '公車', 'transport'], ['Train', '火車', 'transport'], ['Bicycle', '腳踏車', 'transport'],
      ['Airplane', '飛機', 'transport'], ['Boat', '船', 'transport'], ['Taxi', '計程車', 'transport'], ['Motorcycle', '機車', 'transport'],
      ['School', '學校', 'place'], ['Hospital', '醫院', 'place'], ['Park', '公園', 'place'], ['Kitchen', '廚房', 'place'],
      ['Bathroom', '浴室', 'place'], ['Supermarket', '超市', 'place'], ['Zoo', '動物園', 'place'], ['Restaurant', '餐廳', 'place'],
      ['Teacher', '老師', 'people'], ['Doctor', '醫生', 'people'], ['Police officer', '警察', 'people'], ['Baby', '嬰兒', 'people'],
    ],
    medium: [
      ['Octopus', '章魚', 'animal'], ['Kangaroo', '袋鼠', 'animal'], ['Dolphin', '海豚', 'animal'], ['Owl', '貓頭鷹', 'animal'],
      ['Bat', '蝙蝠', 'animal'], ['Camel', '駱駝', 'animal'], ['Crocodile', '鱷魚', 'animal'], ['Peacock', '孔雀', 'animal'],
      ['Squirrel', '松鼠', 'animal'], ['Jellyfish', '水母', 'animal'], ['Spider', '蜘蛛', 'animal'], ['Mosquito', '蚊子', 'animal'],
      ['Snail', '蝸牛', 'animal'], ['Parrot', '鸚鵡', 'animal'], ['Koala', '無尾熊', 'animal'],
      ['Popcorn', '爆米花', 'food'], ['Dumpling', '水餃', 'food'], ['Bubble tea', '珍珠奶茶', 'food'], ['Pineapple', '鳳梨', 'food'],
      ['Mango', '芒果', 'food'], ['Lemon', '檸檬', 'food'], ['Garlic', '大蒜', 'food'], ['Onion', '洋蔥', 'food'],
      ['Honey', '蜂蜜', 'food'], ['Pancake', '鬆餅', 'food'], ['Sushi', '壽司', 'food'], ['French fries', '薯條', 'food'],
      ['Hot pot', '火鍋', 'food'], ['Soup', '湯', 'food'], ['Peanut', '花生', 'food'],
      ['Backpack', '背包', 'thing'], ['Wallet', '錢包', 'thing'], ['Candle', '蠟燭', 'thing'], ['Ladder', '梯子', 'thing'],
      ['Hammer', '鐵鎚', 'thing'], ['Tent', '帳篷', 'thing'], ['Map', '地圖', 'thing'], ['Kite', '風箏', 'thing'],
      ['Piano', '鋼琴', 'thing'], ['Guitar', '吉他', 'thing'], ['Drum', '鼓', 'thing'], ['Microphone', '麥克風', 'thing'],
      ['Headphones', '耳機', 'thing'], ['Remote control', '遙控器', 'home'], ['Refrigerator', '冰箱', 'home'], ['Washing machine', '洗衣機', 'home'],
      ['Vacuum cleaner', '吸塵器', 'home'], ['Hair dryer', '吹風機', 'home'], ['Alarm clock', '鬧鐘', 'home'], ['Calendar', '日曆', 'thing'],
      ['Envelope', '信封', 'thing'], ['Stamp', '郵票', 'thing'], ['Coin', '硬幣', 'thing'], ['Ring', '戒指', 'thing'],
      ['Necklace', '項鍊', 'thing'], ['Crown', '皇冠', 'thing'], ['Sunglasses', '太陽眼鏡', 'thing'], ['Toothpaste', '牙膏', 'home'],
      ['Soap', '肥皂', 'home'], ['Battery', '電池', 'thing'], ['Charger', '充電器', 'thing'], ['Light bulb', '燈泡', 'home'],
      ['Puzzle', '拼圖', 'thing'], ['Robot', '機器人', 'thing'], ['Doll', '娃娃', 'thing'], ['Teddy bear', '泰迪熊', 'thing'],
      ['Skateboard', '滑板', 'thing'], ['Suitcase', '行李箱', 'thing'], ['Passport', '護照', 'thing'], ['Tissue', '面紙', 'home'],
      ['Airport', '機場', 'place'], ['Library', '圖書館', 'place'], ['Museum', '博物館', 'place'], ['Cinema', '電影院', 'place'],
      ['Night market', '夜市', 'place'], ['Convenience store', '便利商店', 'place'], ['Swimming pool', '游泳池', 'place'], ['Gym', '健身房', 'place'],
      ['Bakery', '麵包店', 'place'], ['Bank', '銀行', 'place'], ['Post office', '郵局', 'place'], ['Farm', '農場', 'place'],
      ['Castle', '城堡', 'place'], ['Lighthouse', '燈塔', 'place'], ['Train station', '火車站', 'place'], ['Hotel', '飯店', 'place'],
      ['Temple', '廟', 'place'], ['Desert', '沙漠', 'nature'], ['Island', '島', 'nature'], ['Volcano', '火山', 'nature'],
      ['Forest', '森林', 'nature'], ['Cave', '山洞', 'nature'], ['Waterfall', '瀑布', 'nature'], ['Bridge', '橋', 'place'],
      ['Firefighter', '消防員', 'people'], ['Chef', '廚師', 'people'], ['Pilot', '飛行員', 'people'], ['Dentist', '牙醫', 'people'],
      ['Nurse', '護理師', 'people'], ['Farmer', '農夫', 'people'], ['Singer', '歌手', 'people'], ['Magician', '魔術師', 'people'],
      ['Astronaut', '太空人', 'people'], ['Pirate', '海盜', 'people'], ['Ghost', '鬼', 'people'], ['Superhero', '超級英雄', 'people'],
      ['Santa Claus', '聖誕老人', 'people'],
      ['Basketball', '籃球', 'sport'], ['Soccer', '足球', 'sport'], ['Baseball', '棒球', 'sport'], ['Tennis', '網球', 'sport'],
      ['Yoga', '瑜伽', 'sport'], ['Karaoke', '卡拉OK', 'sport'], ['Chess', '西洋棋', 'sport'], ['Video game', '電玩遊戲', 'sport'],
      ['Helicopter', '直升機', 'transport'], ['Submarine', '潛水艇', 'transport'], ['Rocket', '火箭', 'transport'], ['Hot air balloon', '熱氣球', 'transport'],
      ['Ambulance', '救護車', 'transport'],
    ],
    hard: [
      ['Shadow', '影子', 'idea'], ['Echo', '回音', 'idea'], ['Dream', '夢', 'idea'], ['Birthday', '生日', 'event'],
      ['Weekend', '週末', 'event'], ['Homework', '功課', 'idea'], ['Password', '密碼', 'idea'], ['Secret', '秘密', 'idea'],
      ['Selfie', '自拍', 'idea'], ['Traffic jam', '塞車', 'event'], ['Jet lag', '時差', 'idea'], ['Hiccup', '打嗝', 'idea'],
      ['Nap', '午睡', 'idea'], ['Wedding', '婚禮', 'event'], ['Earthquake', '地震', 'event'], ['Typhoon', '颱風', 'event'],
      ['Thunder', '雷', 'nature'], ['Fog', '霧', 'nature'], ['Gravity', '重力', 'idea'], ['Wi-Fi', '無線網路', 'idea'],
      ['Electricity', '電', 'idea'], ['Internet', '網路', 'idea'], ['Music', '音樂', 'idea'], ['Laughter', '笑聲', 'idea'],
      ['Silence', '安靜', 'idea'], ['Memory', '回憶', 'idea'], ['Breakfast', '早餐', 'event'], ['Vacation', '假期', 'event'],
      ['New Year', '新年', 'event'], ['Fireworks', '煙火', 'event'], ['Graduation', '畢業典禮', 'event'], ['Queue', '排隊的隊伍', 'idea'],
      ['Applause', '掌聲', 'idea'], ['Advertisement', '廣告', 'idea'], ['Garbage', '垃圾', 'idea'], ['Recycling', '資源回收', 'idea'],
      ['Haircut', '剪頭髮', 'event'], ['Sunburn', '曬傷', 'idea'], ['Fever', '發燒', 'idea'], ['Tattoo', '刺青', 'idea'],
      ['Magic trick', '魔術', 'event'], ['Bubble', '泡泡', 'idea'], ['Snowman', '雪人', 'idea'], ['Sandcastle', '沙堡', 'idea'],
      ['Treasure', '寶藏', 'idea'], ['Rumor', '謠言', 'idea'], ['Joke', '笑話', 'idea'], ['Habit', '習慣', 'idea'],
      ['Mistake', '錯誤', 'idea'], ['Promise', '承諾', 'idea'], ['Luck', '運氣', 'idea'], ['Time', '時間', 'idea'],
      ['Money', '錢', 'idea'], ['Heartbeat', '心跳', 'idea'], ['Sneeze', '打噴嚏', 'idea'], ['Yawn', '打哈欠', 'idea'],
      ['Reflection', '倒影', 'idea'], ['Countdown', '倒數', 'event'], ['Picnic', '野餐', 'event'], ['Wind', '風', 'nature'],
    ],
  };
  const LEVELS = Object.freeze(['easy', 'medium', 'hard']);
  const prefix = { easy: 'e', medium: 'm', hard: 'h' };
  const items = [];
  for (const level of LEVELS) raw[level].forEach(([en, zh, cat], index) => {
    items.push(Object.freeze({ id: `wk-${prefix[level]}${String(index + 1).padStart(3, '0')}`, en, zh, level, cat }));
  });
  const byId = new Map(items.map(item => [item.id, item]));
  const pools = Object.fromEntries(LEVELS.map(level => [level, Object.freeze(items.filter(item => item.level === level))]));
  return Object.freeze({
    LEVELS,
    items: Object.freeze(items),
    get: id => byId.get(id) || null,
    pool: level => pools[level] || [],
  });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WHO_KNOWS_WORDS;
