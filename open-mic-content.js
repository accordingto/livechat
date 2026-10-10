(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OPEN_MIC_CONTENT = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function bilingual(en, zh) { return { en: en, zh: zh }; }

  var categories = [
    { id: 'for-you', label: bilingual('For You', '為你精選') },
    { id: 'original', label: bilingual('Original prompts', '原創互動') },
    { id: 'my-songs', label: bilingual('My Songs', '我的歌單') },
    { id: 'english-pop', label: bilingual('English Pop', '英文流行') },
    { id: 'k-pop', label: bilingual('K-Pop', '韓國流行') },
    { id: 'mandarin', label: bilingual('Mandarin', '華語歌曲') },
    { id: 'everyone-knows', label: bilingual('Everyone Knows', '大家都熟') },
    { id: 'hype', label: bilingual('Hype', '一起嗨') },
    { id: 'chill', label: bilingual('Chill', '輕鬆聊') }
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

  // Text prompts and song names only. This library contains no media or lyrics.
  var songs = [
    { id: 'omtxt000001', videoId: 'omtxt000001', title: 'Original tune / 即興原創', artist: 'Your own creation / 自己創作', tags: ['for-you', 'original'] },
    { id: 'omtxt000002', videoId: 'omtxt000002', title: 'Rhythm relay / 節奏接龍', artist: 'Your own creation / 自己創作', tags: ['for-you', 'original'] },
    { id: 'omtxt000003', videoId: 'omtxt000003', title: 'Song memories / 歌名聊回憶', artist: 'Your own story / 自己的故事', tags: ['for-you', 'original'] },
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
  ];

  // Life Song prompts: a scene or feeling, a question about a real moment,
  // this stage of life or a hope for the future, then a song that goes with it. Simple English on purpose.
  var lifePrompts = [
    {
      id: 'life-rain-window',
      title: bilingual("Rain on the Window", "窗外下雨"),
      situation: bilingual("Rain is falling and you are watching it from inside.", "雨一直下，你在屋裡看著窗外。"),
      challenge: bilingual("What time in your life does this feel like? Tell us one real moment.", "這讓你想到人生的哪個時期？說一個真實的片段。"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-night-drive',
      title: bilingual("Night Drive", "深夜開車"),
      situation: bilingual("You are driving home late at night on an empty road.", "深夜，你一個人開在空蕩蕩的回家路上。"),
      challenge: bilingual("At which stage of your life did you think a lot like this? What was on your mind?", "人生哪個階段你常這樣想事情？當時在想什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-first-day',
      title: bilingual("First Day Somewhere New", "新地方的第一天"),
      situation: bilingual("It is your first day at a new school, job, or city.", "今天是你到新學校、新工作或新城市的第一天。"),
      challenge: bilingual("Tell us about a first day you still remember.", "說一個你到現在還記得的「第一天」。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-old-photo',
      title: bilingual("The Old Photo", "一張老照片"),
      situation: bilingual("You find an old photo of yourself in a drawer.", "你在抽屜裡翻到一張自己的老照片。"),
      challenge: bilingual("How old are you in the photo? What was your life like then?", "照片裡的你幾歲？那時候的生活是什麼樣子？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-summer',
      title: bilingual("Summer Afternoon", "夏日午後"),
      situation: bilingual("It is a hot summer afternoon and you have nothing to do.", "炎熱的夏天午後，你完全沒事做。"),
      challenge: bilingual("Which summer of your life do you remember most, and why?", "你最記得人生中的哪一個夏天？為什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-packing',
      title: bilingual("Packing a Box", "打包紙箱"),
      situation: bilingual("You are packing your things into a box to move away.", "你正把東西裝進紙箱，準備搬走。"),
      challenge: bilingual("Tell us about a time you left a place behind.", "說一次你離開某個地方的經驗。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-kitchen',
      title: bilingual("A Smell from the Kitchen", "廚房的味道"),
      situation: bilingual("You smell a dish that someone in your family used to cook.", "你聞到一道家人以前常煮的菜。"),
      challenge: bilingual("Who or what does this smell bring back?", "這個味道讓你想起誰，或什麼事？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-last-bus',
      title: bilingual("The Last Bus", "末班車"),
      situation: bilingual("You just missed the last bus home.", "你剛好錯過回家的末班車。"),
      challenge: bilingual("Tell us about a time things went wrong but became a good story.", "說一次出了差錯、後來卻變成好故事的經驗。"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-big-day',
      title: bilingual("The Night Before", "大日子前一晚"),
      situation: bilingual("Tomorrow is a big exam or a very important day.", "明天就是大考或非常重要的一天。"),
      challenge: bilingual("What was the hardest stage of your life so far? How did you get through it?", "到目前為止，人生最辛苦的是哪個階段？你怎麼撐過來的？"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-graduation',
      title: bilingual("Graduation Day", "畢業典禮"),
      situation: bilingual("Everyone is taking photos and saying goodbye.", "大家都在拍照、互相道別。"),
      challenge: bilingual("Tell us about an ending that was also a new start.", "說一個「結束，也是新開始」的時刻。"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-shop-song',
      title: bilingual("A Song in a Shop", "店裡的那首歌"),
      situation: bilingual("A song starts playing in a shop and you stop walking.", "店裡突然播起一首歌，你停下了腳步。"),
      challenge: bilingual("Which time of your life comes back to you?", "哪一段人生回憶突然跑回來了？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-late-talk',
      title: bilingual("Talking Until 3 a.m.", "聊到半夜三點"),
      situation: bilingual("You are talking with a friend until three in the morning.", "你和朋友聊天聊到凌晨三點。"),
      challenge: bilingual("Who was the friend you talked to most at some time in your life?", "人生某個時期，你最常聊天的朋友是誰？"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-train',
      title: bilingual("The Train Window", "火車窗外"),
      situation: bilingual("You are on a long train ride, watching the view go by.", "你坐著長途火車，看著窗外風景一直往後退。"),
      challenge: bilingual("Where were you going in life at that time? Where are you going now?", "那時候你的人生要往哪裡去？現在呢？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-paycheck',
      title: bilingual("First Paycheck", "第一份薪水"),
      situation: bilingual("You just got your very first salary.", "你剛領到人生第一份薪水。"),
      challenge: bilingual("What did you do with your first money, and how did it feel?", "你的第一筆錢拿去做了什麼？當時的感覺是？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-coming-home',
      title: bilingual("Coming Home", "回到家"),
      situation: bilingual("You open the front door after a long trip.", "長途旅行後，你打開家門。"),
      challenge: bilingual("What does home mean to you at this stage of your life?", "在人生的這個階段，「家」對你來說是什麼？"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-walking-alone',
      title: bilingual("Walking Alone", "一個人走在街上"),
      situation: bilingual("You are walking alone in a busy city.", "你一個人走在熱鬧的城市裡。"),
      challenge: bilingual("Tell us about a time you felt alone but okay.", "說一次你一個人、但覺得還不錯的時候。"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-birthday',
      title: bilingual("Birthday Candles", "生日蠟燭"),
      situation: bilingual("You are about to blow out your birthday candles.", "你準備吹熄生日蠟燭。"),
      challenge: bilingual("Which birthday do you remember most, and why?", "你最記得哪一次生日？為什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-waiting',
      title: bilingual("The Waiting Room", "等待的時候"),
      situation: bilingual("You are waiting for news and the clock feels very slow.", "你在等一個消息，時間過得好慢。"),
      challenge: bilingual("Tell us about a time you waited for something important.", "說一次你在等一件很重要的事的經驗。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-morning',
      title: bilingual("A Fresh Morning", "全新的早晨"),
      situation: bilingual("You wake up and the sun is coming through the window.", "你醒來，陽光從窗戶照進來。"),
      challenge: bilingual("When in your life did you feel a fresh start?", "人生什麼時候讓你覺得是重新開始？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-old-message',
      title: bilingual("An Old Message", "一則舊訊息"),
      situation: bilingual("You read an old message from someone you do not talk to now.", "你看到一則舊訊息，來自現在已經不聯絡的人。"),
      challenge: bilingual("Who did you lose touch with? What do you remember about them?", "你和誰漸漸失聯了？你記得他們什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-school-bell',
      title: bilingual("The School Bell", "下課鐘聲"),
      situation: bilingual("The school bell rings for the end of the last class.", "最後一堂課的下課鐘響了。"),
      challenge: bilingual("What kind of student were you? Tell us one school memory.", "你以前是什麼樣的學生？說一個學生時代的回憶。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-rooftop',
      title: bilingual("On the Rooftop", "頂樓的夜景"),
      situation: bilingual("You are on a rooftop, looking at the city lights.", "你在頂樓看著城市的燈光。"),
      challenge: bilingual("What did you dream about when you were younger?", "你小時候或年輕時的夢想是什麼？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-sick-day',
      title: bilingual("A Sick Day", "生病的那天"),
      situation: bilingual("You are sick in bed and someone brings you soup.", "你生病躺在床上，有人端湯給你。"),
      challenge: bilingual("Who takes care of you, or who did you take care of?", "誰照顧過你，或你照顧過誰？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-wrong-turn',
      title: bilingual("The Wrong Turn", "轉錯彎"),
      situation: bilingual("You took a wrong turn and ended up somewhere new.", "你轉錯一個彎，結果到了一個新地方。"),
      challenge: bilingual("Tell us about a change in your life that you did not plan.", "說一個人生中沒有計畫到的轉變。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-first-concert',
      title: bilingual("Lights Go Down", "燈光暗下來"),
      situation: bilingual("The lights go down and the crowd starts to cheer.", "燈光暗下，全場開始歡呼。"),
      challenge: bilingual("What music did you love as a teenager? What was your life like then?", "你青少年時期最愛什麼音樂？那時的生活是什麼樣子？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-empty-room',
      title: bilingual("The Empty Room", "空蕩蕩的房間"),
      situation: bilingual("You are standing in an empty room on moving day.", "搬家那天，你站在已經清空的房間裡。"),
      challenge: bilingual("What did you leave behind in a place you used to live?", "你在以前住過的地方留下了什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-family-table',
      title: bilingual("The Big Table", "一大桌的家人"),
      situation: bilingual("The whole family is sitting around one big table.", "全家人圍坐在一張大桌子旁。"),
      challenge: bilingual("Tell us about a family moment you will not forget.", "說一個你忘不了的家人時刻。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-running',
      title: bilingual("Running to Catch It", "拚命趕上"),
      situation: bilingual("You are running to catch something and your heart is beating fast.", "你拚命跑著要趕上什麼，心跳得好快。"),
      challenge: bilingual("What were you always rushing for at some time in your life?", "人生某個時期，你總是在趕什麼？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-sunday',
      title: bilingual("A Quiet Sunday", "安靜的星期天"),
      situation: bilingual("It is a quiet Sunday and you have no plans at all.", "安靜的星期天，你完全沒有計畫。"),
      challenge: bilingual("What does a perfect free day look like at this stage of your life?", "在現在這個人生階段，完美的空閒日長什麼樣子？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-sorry',
      title: bilingual("Saying Sorry", "說對不起"),
      situation: bilingual("You need to say sorry to someone.", "你需要跟某個人說對不起。"),
      challenge: bilingual("Tell us about a time you made peace with someone.", "說一次你和某人和好的經驗。"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-good-news',
      title: bilingual("Good News", "好消息"),
      situation: bilingual("Your phone rings, and it is good news.", "電話響了，是好消息。"),
      challenge: bilingual("What is some of the best news you ever got?", "你收過最好的消息之一是什麼？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-far-away',
      title: bilingual("Far Away", "遠方的人"),
      situation: bilingual("Someone you care about lives very far away.", "你在乎的人住得非常遠。"),
      challenge: bilingual("Who did you miss, and how did you stay close?", "你想念過誰？你們怎麼保持聯絡？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-start-over',
      title: bilingual("Starting Over", "從頭開始"),
      situation: bilingual("You are starting something again from zero.", "你正從零開始做一件事。"),
      challenge: bilingual("When did you have to start over? What helped you?", "你什麼時候不得不重新開始？是什麼幫了你？"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-window-seat',
      title: bilingual("The Window Seat", "靠窗的座位"),
      situation: bilingual("Your plane is taking off and you are by the window.", "飛機正在起飛，你坐在窗邊。"),
      challenge: bilingual("Where were you going on a trip you still remember?", "說一趟你到現在還記得的旅程，你要去哪裡？"),
      successRule: bilingual("Which song goes with that memory? Choose it and sing a little.", "哪首歌配得上這段回憶？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-your-week',
      title: bilingual("Your Week as Weather", "這週是什麼天氣"),
      situation: bilingual("Picture your past week as a kind of weather.", "把你過去這一週想成一種天氣。"),
      challenge: bilingual("What weather was your week, and why?", "你這週是什麼天氣？為什麼？"),
      successRule: bilingual("Which song would play in this scene of your life? Choose it and sing a little.", "你人生的這一幕會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
    {
      id: 'life-life-movie',
      title: bilingual("Your Life as a Movie", "人生電影"),
      situation: bilingual("Think of this stage of your life as a movie.", "把你現在這個人生階段想成一部電影。"),
      challenge: bilingual("What is the movie called? What happens in it right now?", "這部電影叫什麼？現在正演到哪裡？"),
      successRule: bilingual("Which song does this remind you of? Choose it and sing a little.", "這讓你想到哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life']
    },
  // Present and future: where life is now and what people hope for next.
    {
      id: 'life-one-word',
      title: bilingual("Right Now in One Word", "用一個詞形容現在"),
      situation: bilingual("Someone asks you, \"How is life these days?\"", "有人問你：「最近過得怎樣？」"),
      challenge: bilingual("Answer with one word, then tell us why you chose it.", "先用一個詞回答，再說說為什麼選這個詞。"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-normal-day',
      title: bilingual("A Normal Tuesday", "普通的星期二"),
      situation: bilingual("It is a normal Tuesday in your life right now.", "現在的你，度過一個普通的星期二。"),
      challenge: bilingual("Walk us through your day. What part do you enjoy most?", "帶我們走過你的一天。你最享受哪個部分？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-small-win',
      title: bilingual("A Small Win", "小小的勝利"),
      situation: bilingual("You did something this month that made you a little proud.", "這個月你做了一件讓自己有點驕傲的事。"),
      challenge: bilingual("What was your small win? Who did you tell first?", "你的小勝利是什麼？你第一個告訴誰？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-learning',
      title: bilingual("Still Learning", "還在學習中"),
      situation: bilingual("You are learning something new these days.", "你最近在學一樣新東西。"),
      challenge: bilingual("What are you learning now, and why did you start?", "你現在在學什麼？為什麼開始學？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-energy',
      title: bilingual("Your Battery", "你的電量"),
      situation: bilingual("Picture your energy as a phone battery.", "把你的精力想成手機電量。"),
      challenge: bilingual("How full is your battery these days? What charges you up?", "你最近電量剩多少？什麼能幫你充電？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-changing',
      title: bilingual("Something Is Changing", "正在改變的事"),
      situation: bilingual("Something in your life is slowly changing.", "你的生活裡有件事正在慢慢改變。"),
      challenge: bilingual("What is changing for you now? How do you feel about it?", "你現在正在經歷什麼改變？你對它有什麼感覺？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-busy-list',
      title: bilingual("Your To-Do List", "你的待辦清單"),
      situation: bilingual("You open your to-do list for this week.", "你打開這週的待辦清單。"),
      challenge: bilingual("What is on your list right now? What do you wish was on it?", "你的清單上現在有什麼？你希望上面有什麼？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-thankful',
      title: bilingual("Thankful Today", "今天想感謝的"),
      situation: bilingual("You stop for a moment and feel thankful.", "你停下來，突然覺得很感恩。"),
      challenge: bilingual("What are you thankful for at this stage of your life?", "在人生的這個階段，你感謝什麼？"),
      successRule: bilingual("Which song fits where you are right now? Choose it and sing a little.", "哪首歌最符合你現在的狀態？選出來唱一小段。"),
      duration: 60, tags: ['life', 'now']
    },
    {
      id: 'life-five-years',
      title: bilingual("Five Years Later", "五年後"),
      situation: bilingual("It is five years from today. You wake up and look around.", "五年後的某一天，你醒來看看四周。"),
      challenge: bilingual("Where are you, and what does your day look like?", "你在哪裡？那一天是什麼樣子？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-future-letter',
      title: bilingual("A Letter to Future You", "寫給未來的自己"),
      situation: bilingual("You are writing a short letter to yourself in ten years.", "你正在寫一封短信給十年後的自己。"),
      challenge: bilingual("What do you want to say? What do you hope will be true?", "你想說什麼？你希望那時候什麼已經成真？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-next-summer',
      title: bilingual("Next Summer", "明年夏天"),
      situation: bilingual("Next summer is coming, and you can plan anything.", "明年夏天快到了，你可以計畫任何事。"),
      challenge: bilingual("What do you hope to do next summer, and with whom?", "你希望明年夏天做什麼？和誰一起？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-open-door',
      title: bilingual("A New Door", "一扇新的門"),
      situation: bilingual("A new door opens in front of you.", "一扇新的門在你面前打開。"),
      challenge: bilingual("What new chapter do you want to start soon?", "你想很快開始哪一個人生新篇章？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-dream-day',
      title: bilingual("Your Dream Day", "夢想中的一天"),
      situation: bilingual("One day in the future, everything goes the way you want.", "未來的某一天，一切都照你想要的發生。"),
      challenge: bilingual("Tell us about that perfect day, from morning to night.", "從早到晚，說說那完美的一天。"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-seed',
      title: bilingual("Planting a Seed", "種下一顆種子"),
      situation: bilingual("You plant a small seed today and wait for it to grow.", "你今天種下一顆小種子，等它長大。"),
      challenge: bilingual("What are you working on now that will grow later?", "你現在在努力什麼，以後會開花結果？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-ticket',
      title: bilingual("A Ticket to Anywhere", "去哪都可以的車票"),
      situation: bilingual("Someone gives you a ticket to anywhere in the world.", "有人送你一張能去世界任何地方的車票。"),
      challenge: bilingual("Where do you go, and what do you hope to find there?", "你會去哪裡？希望在那裡找到什麼？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    },
    {
      id: 'life-meet-future',
      title: bilingual("Meeting Future You", "遇見未來的你"),
      situation: bilingual("You meet yourself from twenty years in the future.", "你遇見二十年後的自己。"),
      challenge: bilingual("What do you ask them? What do you hope they say?", "你會問他什麼？你希望他怎麼回答？"),
      successRule: bilingual("Which song would play on that future day? Choose it and sing a little.", "那個未來的日子會播哪首歌？選出來唱一小段。"),
      duration: 60, tags: ['life', 'future']
    }
  ];

  return { challenges: challenges, lifePrompts: lifePrompts, songs: songs, categories: categories };
}));
