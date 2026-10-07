(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OPEN_MIC_CONTENT = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function bilingual(en, zh) { return { en: en, zh: zh }; }

  var categories = [
    { id: 'for-you', label: bilingual('For You', '為你精選') },
    { id: 'my-songs', label: bilingual('My Songs', '我的歌單') },
    { id: 'english-pop', label: bilingual('English Pop', '英文流行') },
    { id: 'k-pop', label: bilingual('K-Pop', '韓國流行') },
    { id: 'mandarin', label: bilingual('Mandarin', '華語歌曲') },
    { id: 'everyone-knows', label: bilingual('Everyone Knows', '大家都熟') },
    { id: 'hype', label: bilingual('Hype', '一起嗨') },
    { id: 'chill', label: bilingual('Chill', '輕鬆唱') }
  ];

  var challenges = [
    {
      id: 'late-again',
      title: bilingual('Late Again', '又遲到了'),
      situation: bilingual('You are 30 minutes late. Everyone has been waiting for you.', '你遲到 30 分鐘，大家已經等到快變成雕像。'),
      challenge: bilingual('Answer 3 questions from the group without saying "because".', '回答大家 3 個問題，全程不能說「因為」。'),
      successRule: bilingual('Answer all 3 questions without using the forbidden word.', '回答完 3 題，而且沒有說出「因為」。'),
      duration: 30, tags: ['warm-up', 'improv', 'questions']
    },
    {
      id: 'birthday-speech',
      title: bilingual('Birthday Speech', '臨時生日致詞'),
      situation: bilingual('A friend suddenly asks you to give a birthday speech.', '朋友突然把生日致詞的任務交給你。'),
      challenge: bilingual('Give a 20-second birthday message that naturally includes "elevator" and "pineapple".', '說一段 20 秒生日祝福，自然放入「電梯」和「鳳梨」。'),
      successRule: bilingual('Include both words in your birthday message.', '祝福中有用到「電梯」和「鳳梨」。'),
      duration: 20, tags: ['warm-up', 'improv', 'celebration']
    },
    {
      id: 'terrible-salesperson',
      title: bilingual('Terrible Salesperson', '荒唐推銷員'),
      situation: bilingual('Your product today is a broken umbrella.', '你今天要賣的商品是一把破掉的雨傘。'),
      challenge: bilingual('You have 30 seconds to convince the group to buy it.', '用 30 秒推銷它，讓大家願意買。'),
      successRule: bilingual('More than half of the players say they would buy it.', '過半玩家表示願意購買。'),
      duration: 30, tags: ['improv', 'funny', 'persuasion']
    },
    {
      id: 'travel-compatibility',
      title: bilingual('Travel Compatibility', '旅行合拍嗎'),
      situation: bilingual('You are planning your first trip together.', '你們正準備第一次一起旅行。'),
      challenge: bilingual('Choose a player. Guess whether they prefer a tightly planned trip or spontaneous travel, then ask them to reveal their choice.', '選一位玩家，猜對方喜歡「行程排滿」還是「隨興出發」，再請對方揭曉。'),
      successRule: bilingual('Guess their travel preference correctly.', '猜中對方的旅行偏好。'),
      duration: 20, tags: ['get-to-know', 'either-or', 'travel']
    },
    {
      id: 'weird-habit',
      title: bilingual('I Do That Too', '原來你也會'),
      situation: bilingual('Everyone has a small, funny habit.', '每個人都有一點可愛的小怪癖。'),
      challenge: bilingual('Share a real little habit and get another player to say "I do that too".', '分享一個自己的小習慣，讓至少一位玩家說「我也會」。'),
      successRule: bilingual('At least one other player relates within 30 seconds.', '30 秒內有一位其他玩家表示自己也有這個習慣。'),
      duration: 30, tags: ['get-to-know', 'connection', 'warm-up']
    },
    {
      id: 'snack-match',
      title: bilingual('Midnight Snack Match', '宵夜默契'),
      situation: bilingual('It is midnight, and you are choosing a snack for a friend.', '半夜肚子餓，你要幫朋友選宵夜。'),
      challenge: bilingual('Choose a player. Guess if they would pick fried chicken, instant noodles, or dessert, then ask them to reveal their choice.', '選一位玩家，猜對方會選鹹酥雞、泡麵或甜點，請對方揭曉。'),
      successRule: bilingual('Guess the option they want right now.', '猜中對方這一刻最想吃的選項。'),
      duration: 20, tags: ['get-to-know', 'food', 'guessing']
    },
    {
      id: 'tiny-superpower',
      title: bilingual('Tiny Superpower', '超小超能力'),
      situation: bilingual('You have a superpower that only helps with little everyday tasks.', '你獲得一個只能用在日常小事的超能力。'),
      challenge: bilingual('Introduce your power, then answer 2 questions from the group about it.', '介紹你的超能力，再回答大家 2 個關於它的問題。'),
      successRule: bilingual('Describe a tiny power and answer both questions.', '介紹一個小超能力，並回答完 2 個問題。'),
      duration: 30, tags: ['improv', 'imagination', 'questions']
    },
    {
      id: 'compliment-relay',
      title: bilingual('Compliment Delivery', '稱讚不卡關'),
      situation: bilingual('Today you are the group\'s good-mood delivery service.', '今天輪到你當大家的好心情補給站。'),
      challenge: bilingual('Choose a player and give 2 specific compliments. Go beyond "you are great".', '選一位玩家，說出 2 個具體的優點，不能只說「很好」。'),
      successRule: bilingual('Give 2 different, specific compliments.', '說出 2 個不同且具體的稱讚。'),
      duration: 20, tags: ['warm-up', 'compliments', 'get-to-know']
    },
    {
      id: 'restaurant-recovery',
      title: bilingual('Restaurant Rescue', '餐廳救火王'),
      situation: bilingual('The restaurant you booked is closed. Everyone turns to you.', '你訂的餐廳今天沒開，所有人都在看你。'),
      challenge: bilingual('Suggest 2 backup plans and get at least one player to choose a favorite.', '提出 2 個備案，讓至少一位玩家選出想去的那個。'),
      successRule: bilingual('Offer 2 plans and get at least one player\'s choice.', '提出 2 個備案，並得到至少一位玩家的選擇。'),
      duration: 30, tags: ['everyday', 'improv', 'interaction']
    },
    {
      id: 'movie-title',
      title: bilingual('Our Movie Title', '我們的電影名'),
      situation: bilingual('This party is about to become a movie.', '這場聚會要被拍成一部電影。'),
      challenge: bilingual('Give the movie a title, describe its plot in one sentence, then answer one follow-up question.', '替電影取名，用一句話介紹劇情，回答大家 1 個追問。'),
      successRule: bilingual('Finish the title, plot, and one answer.', '完成片名、劇情介紹和 1 個回答。'),
      duration: 30, tags: ['improv', 'party', 'imagination']
    },
    {
      id: 'emoji-story',
      title: bilingual('Today in Emojis', '表情符號人生'),
      situation: bilingual('Your day needs an emoji introduction.', '你今天的心情要用表情符號來介紹。'),
      challenge: bilingual('Name 3 emojis for your day, explain one, and invite another player to share theirs.', '說出 3 個表情符號代表今天，解釋其中 1 個，再請一位玩家分享他的。'),
      successRule: bilingual('Name 3 emojis, explain one, and get another player to share.', '說出 3 個表情符號、解釋 1 個，並邀請到一位玩家分享。'),
      duration: 30, tags: ['warm-up', 'mood', 'interaction']
    },
    {
      id: 'common-ground',
      title: bilingual('Find Common Ground', '找到共同點'),
      situation: bilingual('You and another player are a brand-new duo.', '你和一位玩家組成了臨時搭檔。'),
      challenge: bilingual('Choose a player and find 2 interests you share in 30 seconds.', '選一位玩家，在 30 秒內找出 2 個共同喜好。'),
      successRule: bilingual('Both players confirm 2 shared interests.', '兩人確認有 2 個共同喜好。'),
      duration: 30, tags: ['get-to-know', 'connection', 'duo']
    },
    {
      id: 'wrong-job-interview',
      title: bilingual('Unusual Job Interview', '奇怪職缺面試'),
      situation: bilingual('You are interviewing to be a professional weekend planner.', '你正在應徵「專業週末規劃師」。'),
      challenge: bilingual('Give 2 reasons you fit the job, then answer one interview question from the group.', '說出你適合的 2 個理由，再回答大家 1 個面試問題。'),
      successRule: bilingual('Give both reasons and answer one question.', '完成 2 個理由和 1 個回答。'),
      duration: 30, tags: ['improv', 'funny', 'questions']
    },
    {
      id: 'weekend-guess',
      title: bilingual('Weekend Mind Reader', '週末讀心術'),
      situation: bilingual('A friend suddenly has an extra free day this weekend.', '朋友週末忽然多了一天空檔。'),
      challenge: bilingual('Choose a player. Guess if they would stay home and recharge or go out exploring, then ask them to reveal their choice.', '選一位玩家，猜對方會選「在家放空」或「出門探索」，請對方揭曉。'),
      successRule: bilingual('Guess their choice correctly.', '猜中對方的選擇。'),
      duration: 20, tags: ['get-to-know', 'either-or', 'everyday']
    },
    {
      id: 'object-award',
      title: bilingual('Everyday Object Awards', '日常物品頒獎典禮'),
      situation: bilingual('An everyday object wins the best supporting role in your life.', '一件日常物品獲得了你的人生最佳配角獎。'),
      challenge: bilingual('Choose an object and give a 20-second speech explaining why it wins.', '選一件物品，用 20 秒說出它得獎的理由。'),
      successRule: bilingual('Name the object and give at least 2 specific reasons.', '說出物品名稱和至少 2 個具體理由。'),
      duration: 20, tags: ['improv', 'everyday', 'funny']
    },
    {
      id: 'dream-cafe',
      title: bilingual('Dream Cafe', '夢想咖啡店'),
      situation: bilingual('You open a cafe that sells exactly 3 things.', '你開了一間只賣 3 樣東西的咖啡店。'),
      challenge: bilingual('Introduce the cafe name and 3 menu items, then get one player to place an order.', '介紹店名和 3 樣商品，讓一位玩家點一樣。'),
      successRule: bilingual('Give the name, 3 items, and receive at least one order.', '介紹店名、3 樣商品，並得到至少一筆點餐。'),
      duration: 30, tags: ['imagination', 'food', 'interaction']
    },
    {
      id: 'tiny-joy',
      title: bilingual('A Little Joy', '小事大開心'),
      situation: bilingual('A tiny thing made you happy recently.', '最近有一件很小的事讓你開心。'),
      challenge: bilingual('Share that little moment, then ask another player about their recent little joy.', '分享那件小事，再問一位玩家最近的小快樂。'),
      successRule: bilingual('Share your moment and get another player to share theirs.', '完成自己的分享，並讓一位玩家說出他的小快樂。'),
      duration: 30, tags: ['warm-up', 'everyday', 'sharing']
    },
    {
      id: 'party-mascot',
      title: bilingual('Tonight\'s Mascot', '今晚的吉祥物'),
      situation: bilingual('This party urgently needs a mascot.', '這場聚會急需一隻吉祥物。'),
      challenge: bilingual('Pick an animal, give it a name and 2 personality traits, then ask another player for its catchphrase.', '選一種動物，替它取名並介紹 2 個個性，請一位玩家幫它想口頭禪。'),
      successRule: bilingual('Finish the animal, name, 2 traits, and one player\'s catchphrase.', '完成動物、名字、2 個個性，並得到一個口頭禪。'),
      duration: 35, tags: ['party', 'imagination', 'interaction']
    }
  ];

  // Starter IDs were checked against the official YouTube videos. Only metadata is stored.
  var songs = [
    { id: 'nfWlot6h_JM', videoId: 'nfWlot6h_JM', title: 'Shake It Off', artist: 'Taylor Swift', tags: ['for-you', 'english-pop', 'everyone-knows', 'hype'] },
    { id: 'JGwWNGJdvx8', videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', tags: ['english-pop', 'everyone-knows', 'chill'] },
    { id: 'OPf0YbXqDm0', videoId: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', tags: ['for-you', 'english-pop', 'everyone-knows', 'hype'] },
    { id: 'dvgZkm1xWPE', videoId: 'dvgZkm1xWPE', title: 'Viva La Vida', artist: 'Coldplay', tags: ['english-pop', 'everyone-knows', 'chill'] },
    { id: 'TUVcZfQe-Kw', videoId: 'TUVcZfQe-Kw', title: 'Levitating', artist: 'Dua Lipa ft. DaBaby', tags: ['english-pop', 'hype'] },
    { id: 'y6Sxv-sUYtM', videoId: 'y6Sxv-sUYtM', title: 'Happy', artist: 'Pharrell Williams', tags: ['english-pop', 'everyone-knows', 'hype'] },
    { id: 'gdZLi9oWNZg', videoId: 'gdZLi9oWNZg', title: 'Dynamite', artist: 'BTS', tags: ['for-you', 'k-pop', 'english-pop', 'everyone-knows', 'hype'] },
    { id: 'IHNzOHi8sJs', videoId: 'IHNzOHi8sJs', title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', tags: ['k-pop', 'hype'] },
    { id: 'i0p1bmr0EmE', videoId: 'i0p1bmr0EmE', title: 'What is Love?', artist: 'TWICE', tags: ['k-pop', 'everyone-knows', 'hype'] },
    { id: '9bZkp7q19f0', videoId: '9bZkp7q19f0', title: 'Gangnam Style', artist: 'PSY', tags: ['k-pop', 'everyone-knows', 'hype'] },
    { id: 'bu7nU9Mhpyo', videoId: 'bu7nU9Mhpyo', title: '告白氣球 / Love Confession', artist: '周杰倫 Jay Chou', tags: ['for-you', 'mandarin', 'everyone-knows', 'chill'] },
    { id: 'sHD_z90ZKV0', videoId: 'sHD_z90ZKV0', title: '稻香 / Rice Field', artist: '周杰倫 Jay Chou', tags: ['mandarin', 'everyone-knows', 'chill'] },
    { id: '6D79CYTxvOM', videoId: '6D79CYTxvOM', title: '愛人錯過 / Somewhere in Time', artist: '告五人 Accusefive', tags: ['for-you', 'mandarin', 'everyone-knows', 'hype'] }
  ].map(function (song) {
    song.thumbnail = 'https://i.ytimg.com/vi/' + song.videoId + '/hqdefault.jpg';
    song.url = 'https://www.youtube.com/watch?v=' + song.videoId;
    return song;
  });

  return { challenges: challenges, songs: songs, categories: categories };
}));
