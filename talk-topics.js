/* Short, shared discussion situations. Everyone can suggest, disagree and build on ideas.
 * Chat Wolf-derived scenes are editorial adaptations with trace IDs only.
 * This standalone public library never loads roles or private missions.
 */
const TALK_CATEGORIES = [
  {
    "id": "connection",
    "zh": "人際與信任",
    "en": "Connection & trust"
  },
  {
    "id": "self",
    "zh": "一起嘗試與改變",
    "en": "Trying and changing together"
  },
  {
    "id": "belonging",
    "zh": "群體與界線",
    "en": "Belonging & boundaries"
  },
  {
    "id": "work",
    "zh": "工作與金錢",
    "en": "Work & money"
  },
  {
    "id": "fairness",
    "zh": "公平與自由",
    "en": "Fairness & freedom"
  },
  {
    "id": "digital",
    "zh": "科技與網路生活",
    "en": "Technology & online life"
  },
  {
    "id": "ethics",
    "zh": "日常倫理與選擇",
    "en": "Everyday ethics & choices"
  },
  {
    "id": "future",
    "zh": "社會與未來",
    "en": "Society & the future"
  },
  {
    "id": "shared-living",
    "zh": "一起生活與旅行",
    "en": "Living & travelling together"
  },
  {
    "id": "shared-planning",
    "zh": "一起做點有趣的事",
    "en": "Making something together"
  },
  {
    "id": "light-fantasy",
    "zh": "如果日常有點奇幻",
    "en": "A little everyday fantasy"
  },
  {
    "id": "everyday-choices",
    "zh": "朋友間的小選擇",
    "en": "Small choices with friends"
  },
  {
    "id": "personal-experiences",
    "zh": "一起應付小意外",
    "en": "Everyday surprises together"
  }
];
const TALK_ORIGINAL_TOPICS = [
  {
    "id": "comfortable",
    "category": "connection",
    "emoji": "🌿",
    "title": "The First Hour Together",
    "keywords": "自在 真實 信任 朋友",
    "question": "Our new chat group has one hour together. Do we start with a game, a shared story, or casual chat?",
    "starter": "Half the group knows each other. The others are new. We want everyone to join without forcing anyone to perform.",
    "followUp": "Which opening gives new people an easy way to join?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which opening gives new people an easy way to join?"
      },
      {
        "stage": "perspective",
        "question": "Would a quiet newcomer prefer talking in pairs or joining everyone?"
      },
      {
        "stage": "tradeoff",
        "question": "Can we offer a game without making it compulsory?"
      },
      {
        "stage": "practice",
        "question": "How should the first ten minutes work so nobody is ignored?"
      }
    ]
  },
  {
    "id": "support",
    "category": "connection",
    "emoji": "☕",
    "title": "Rescuing the Party",
    "keywords": "支持 傾聽 建議 關心",
    "question": "Our party cake burns and the music stops. Should we fix things, take a snack break, or turn the mess into a joke?",
    "starter": "We are hosting a small party. Everyone is tired, but guests arrive in thirty minutes. We want to recover together.",
    "followUp": "Which problem needs fixing before our guests arrive?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which problem needs fixing before our guests arrive?"
      },
      {
        "stage": "perspective",
        "question": "Would joking help tired helpers or make them feel ignored?"
      },
      {
        "stage": "tradeoff",
        "question": "What could we remove from the party to make recovery easier?"
      },
      {
        "stage": "practice",
        "question": "Can we agree on one fix and one break before opening?"
      }
    ]
  },
  {
    "id": "cancel",
    "category": "connection",
    "emoji": "📅",
    "title": "Dinner Without Everyone",
    "keywords": "取消 約定 期待 時間",
    "question": "One friend cancels our group dinner ten minutes before it starts. Do we go without them, order takeaway, or move the dinner?",
    "starter": "The table is booked, and some people are already travelling there. The friend can meet another evening.",
    "followUp": "What do we lose by moving the dinner?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What do we lose by moving the dinner?"
      },
      {
        "stage": "perspective",
        "question": "How does postponing affect people already on their way?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we keep tonight's meal and plan something smaller later?"
      },
      {
        "stage": "practice",
        "question": "What message should we send so the new plan is clear?"
      }
    ]
  },
  {
    "id": "care",
    "category": "connection",
    "emoji": "🍊",
    "title": "A Goodbye From All of Us",
    "keywords": "關愛 表達 付出 照顧",
    "question": "Our friend is moving away. Should we arrange a shared meal, make a funny video, or send a care box?",
    "starter": "We have a small budget and one week before the move. The goodbye should feel warm without creating more work for our friend.",
    "followUp": "What would make this goodbye feel shared rather than expensive?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What would make this goodbye feel shared rather than expensive?"
      },
      {
        "stage": "perspective",
        "question": "Would a quiet friend enjoy a big surprise or a small meal?"
      },
      {
        "stage": "tradeoff",
        "question": "Can we combine a simple meal with a short video?"
      },
      {
        "stage": "practice",
        "question": "What could we prepare together before their last evening?"
      }
    ]
  },
  {
    "id": "contact",
    "category": "connection",
    "emoji": "💬",
    "title": "Friends Across Time Zones",
    "keywords": "聯絡 友誼 距離 回訊息",
    "question": "Our friends live in different time zones. Should our group stay connected with a weekly call, a shared photo chat, or an online game night?",
    "starter": "There is no easy time when everyone is free. We want to stay connected without expecting people to answer every day.",
    "followUp": "What needs a live call, and what works as a message?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What needs a live call, and what works as a message?"
      },
      {
        "stage": "perspective",
        "question": "How can someone with a busy week still be part of it?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we alternate call times instead of choosing one fixed time?"
      },
      {
        "stage": "practice",
        "question": "Which plan could our group keep without daily replies?"
      }
    ]
  },
  {
    "id": "help",
    "category": "connection",
    "emoji": "🤝",
    "title": "One Person Does Everything",
    "keywords": "幫助 尊重 自主 接受",
    "question": "At our picnic, one person keeps doing all the work. Should we divide the jobs, help without asking, or simplify the plan?",
    "starter": "One friend is arranging food, carrying bags, and cleaning. Everyone came to enjoy the afternoon, including that friend.",
    "followUp": "Which picnic jobs can be shared without getting in each other's way?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which picnic jobs can be shared without getting in each other's way?"
      },
      {
        "stage": "perspective",
        "question": "Could sudden help feel like taking over someone's plan?"
      },
      {
        "stage": "tradeoff",
        "question": "What could we stop doing so the workload stays small?"
      },
      {
        "stage": "practice",
        "question": "What simple division of jobs should we offer before lunch?"
      }
    ]
  },
  {
    "id": "space",
    "category": "self",
    "emoji": "🌙",
    "title": "Quiet Morning or Group Breakfast",
    "keywords": "獨處 空間 寂寞 休息",
    "question": "Our group shares a cabin for the weekend. Should mornings be quiet, start with a group breakfast, or follow everyone's own schedule?",
    "starter": "Some guests wake early; others need extra sleep. The kitchen is beside the beds, and everyone wants a relaxing weekend.",
    "followUp": "Which morning activities would disturb people who are still asleep?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which morning activities would disturb people who are still asleep?"
      },
      {
        "stage": "perspective",
        "question": "How could early risers enjoy their morning without waiting for everyone?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we keep quiet hours and still have one shared meal?"
      },
      {
        "stage": "practice",
        "question": "What morning agreement should go on the cabin door?"
      }
    ]
  },
  {
    "id": "change",
    "category": "self",
    "emoji": "🌱",
    "title": "The Movie Nobody Wants",
    "keywords": "改變 成長 觀點 固執",
    "question": "Our group planned a movie night, but nobody likes the chosen film. Do we vote again, try it for ten minutes, or switch to games?",
    "starter": "The snacks are ready, and the film has not started. We want a fun evening without spending it choosing another film.",
    "followUp": "What is wrong with the choice: the film or the way we chose it?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What is wrong with the choice: the film or the way we chose it?"
      },
      {
        "stage": "perspective",
        "question": "Could one person be curious about the film even if the others are unsure?"
      },
      {
        "stage": "tradeoff",
        "question": "Would a short trial save time or make changing plans harder?"
      },
      {
        "stage": "practice",
        "question": "How should we make a new choice in five minutes?"
      }
    ]
  },
  {
    "id": "time",
    "category": "self",
    "emoji": "🪴",
    "title": "Twenty Dollars and an Afternoon",
    "keywords": "時間 休閒 充實 生產力",
    "question": "We have a free afternoon and only $20 for the whole group. Should we visit a market, hold a picnic, or invent a game at home?",
    "starter": "We have four hours together. Any food, travel, or entry costs must fit the same small budget.",
    "followUp": "Which option gives us the most time together for the money?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which option gives us the most time together for the money?"
      },
      {
        "stage": "perspective",
        "question": "How would rain or a tired group member change the choice?"
      },
      {
        "stage": "tradeoff",
        "question": "Should we spend everything on one treat or keep some money spare?"
      },
      {
        "stage": "practice",
        "question": "What could our afternoon include without going over $20?"
      }
    ]
  },
  {
    "id": "enough",
    "category": "self",
    "emoji": "🌤️",
    "title": "The Snack Table Is Full",
    "keywords": "滿足 慾望 比較 成功",
    "question": "Our snack table is already full, but someone wants more. Do we buy another snack, replace one, or stop shopping?",
    "starter": "There is space for six bowls, and all six are filled. We want variety without wasting food or crowding the table.",
    "followUp": "Does the new snack add something missing from the table?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Does the new snack add something missing from the table?"
      },
      {
        "stage": "perspective",
        "question": "Which guests might still find nothing they can eat?"
      },
      {
        "stage": "tradeoff",
        "question": "Would replacing a popular snack be better than squeezing in another bowl?"
      },
      {
        "stage": "practice",
        "question": "What rule should help us stop shopping before the party?"
      }
    ]
  },
  {
    "id": "approval",
    "category": "self",
    "emoji": "🪞",
    "title": "Our Embarrassing Chicken Song",
    "keywords": "認同 討好 自我 期待",
    "question": "Our group wants to enter a talent show. Friends call our silly chicken song embarrassing. Do we keep it, change it, or choose something safer?",
    "starter": "The song is meant to make people laugh. We have one rehearsal left, and everyone in the group will be on stage.",
    "followUp": "Is the problem the song itself or how we present it?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Is the problem the song itself or how we present it?"
      },
      {
        "stage": "perspective",
        "question": "What would make a nervous group member comfortable taking part?"
      },
      {
        "stage": "tradeoff",
        "question": "Can we keep the funny idea while changing the most awkward part?"
      },
      {
        "stage": "practice",
        "question": "Which version could the whole group support for the show?"
      }
    ]
  },
  {
    "id": "uncertainty",
    "category": "self",
    "emoji": "🧭",
    "title": "The Mystery Day Trip",
    "keywords": "不確定 決定 風險 方向",
    "question": "Our group can book a cheap mystery day trip without knowing the destination. Do we buy it, wait for details, or plan our own outing?",
    "starter": "The trip stays nearby and costs less than a normal booking. We know the return time but not the place or activities.",
    "followUp": "Which missing detail would make the biggest difference to our decision?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which missing detail would make the biggest difference to our decision?"
      },
      {
        "stage": "perspective",
        "question": "How would the surprise feel to someone who needs a clear plan?"
      },
      {
        "stage": "tradeoff",
        "question": "Is the lower price worth giving up control of the day?"
      },
      {
        "stage": "practice",
        "question": "What information must we have before the group agrees to book?"
      }
    ]
  },
  {
    "id": "different",
    "category": "belonging",
    "emoji": "🧩",
    "title": "One Dinner for Different Eaters",
    "keywords": "差異 包容 價值觀 相處",
    "question": "Our group must share one dinner: mild noodles, spicy curry, or build-your-own wraps. Which plan works for different eaters?",
    "starter": "One friend avoids meat, another loves spicy food, and someone dislikes sauces. We want to eat together without ordering three separate meals.",
    "followUp": "Which parts of each dinner can be served separately?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which parts of each dinner can be served separately?"
      },
      {
        "stage": "perspective",
        "question": "Would an eater with fewer options still get a full meal?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we choose a simple base and put extras on the side?"
      },
      {
        "stage": "practice",
        "question": "What should the final shopping list include for everyone?"
      }
    ]
  },
  {
    "id": "welcome",
    "category": "belonging",
    "emoji": "🏡",
    "title": "A New Player at Game Night",
    "keywords": "歸屬 新人 群體 包容",
    "question": "A new person joins our weekly game night. Do we teach the usual game, choose an easier one, or let them pick?",
    "starter": "The regular players know a difficult game well. The newcomer has never played it, and we have two hours together.",
    "followUp": "How long would learning the usual game leave for actually playing?",
    "followUps": [
      {
        "stage": "understand",
        "question": "How long would learning the usual game leave for actually playing?"
      },
      {
        "stage": "perspective",
        "question": "What might make the newcomer feel part of the group quickly?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we play a short easy game before the usual one?"
      },
      {
        "stage": "practice",
        "question": "What should the first round look like for regulars and newcomers?"
      }
    ]
  },
  {
    "id": "travel",
    "category": "belonging",
    "emoji": "🧳",
    "title": "One Day in a New Town",
    "keywords": "旅行 朋友 協調 妥協",
    "question": "Our group has one day in a new town. Should we follow a fixed route, split up, or keep the day unplanned?",
    "starter": "Some people want to see many places; others want a slow day. We must meet at the same station that evening.",
    "followUp": "Which stops need booking, and which can stay flexible?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which stops need booking, and which can stay flexible?"
      },
      {
        "stage": "perspective",
        "question": "How would the plan work for the slowest walker in the group?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we share the morning and leave the afternoon open?"
      },
      {
        "stage": "practice",
        "question": "What meeting place and backup plan would keep everyone connected?"
      }
    ]
  },
  {
    "id": "family",
    "category": "belonging",
    "emoji": "🏠",
    "title": "A Picnic for Three Generations",
    "keywords": "家庭 期待 自主 責任",
    "question": "Our group is planning a family picnic with children, adults, and grandparents. Should we choose a park, a beach, or a home lunch?",
    "starter": "The group needs food, somewhere to sit, and something fun to do. Not everyone can walk far or stay in the sun.",
    "followUp": "Which place makes eating and resting easiest?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which place makes eating and resting easiest?"
      },
      {
        "stage": "perspective",
        "question": "What would children enjoy while older guests stay comfortable?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we keep the outing short and continue the meal at home?"
      },
      {
        "stage": "practice",
        "question": "Which place and simple activity should go in our invitation?"
      }
    ]
  },
  {
    "id": "tradition",
    "category": "belonging",
    "emoji": "🕯️",
    "title": "The Photo That Takes Forever",
    "keywords": "傳統 文化 改變 世代",
    "question": "Our yearly group photo always takes an hour. Should we keep the big photo, make a quick funny video, or start a new tradition?",
    "starter": "The photo is a shared memory, but getting everyone into place takes most of the gathering. We want a memory and time to enjoy the day.",
    "followUp": "What part of the old photo makes it worth keeping?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What part of the old photo makes it worth keeping?"
      },
      {
        "stage": "perspective",
        "question": "Would a new member understand the tradition or feel trapped in it?"
      },
      {
        "stage": "tradeoff",
        "question": "Can we keep one quick photo and change the rest?"
      },
      {
        "stage": "practice",
        "question": "What shorter tradition could our group repeat next year?"
      }
    ]
  },
  {
    "id": "boundaries",
    "category": "belonging",
    "emoji": "🚪",
    "title": "Too Many Holiday Activities",
    "keywords": "拒絕 界線 群體 壓力",
    "question": "Our group holiday is becoming packed with activities. Should joining every plan be expected, optional, or limited to one shared activity a day?",
    "starter": "We are away together for three days. Some plans need bookings, while others cost nothing. People also need time to rest.",
    "followUp": "Which activities really need the whole group?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which activities really need the whole group?"
      },
      {
        "stage": "perspective",
        "question": "How can someone skip a plan without feeling left out afterward?"
      },
      {
        "stage": "tradeoff",
        "question": "Would one fixed shared activity leave enough freedom for everyone?"
      },
      {
        "stage": "practice",
        "question": "What should our invitation say about joining and skipping plans?"
      }
    ]
  },
  {
    "id": "pay",
    "category": "work",
    "emoji": "💰",
    "title": "Pay at Our Pizza Stall",
    "keywords": "薪資 金錢 價值 勞動",
    "question": "Our group runs a one-day pizza stall. Should the cook, cashier, and cleaner get equal pay, or should some jobs earn more?",
    "starter": "Three helpers work four hours each. After costs, we have a fixed amount left for pay. Every job is needed to keep the stall running.",
    "followUp": "What makes these jobs equally valuable or different?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What makes these jobs equally valuable or different?"
      },
      {
        "stage": "perspective",
        "question": "Would the cleaner's work be easier to miss than the cook's work?"
      },
      {
        "stage": "tradeoff",
        "question": "Could a shared base amount plus a small extra payment work?"
      },
      {
        "stage": "practice",
        "question": "How should we agree on pay before anyone starts working?"
      }
    ]
  },
  {
    "id": "ambition",
    "category": "work",
    "emoji": "⛰️",
    "title": "Which Group Job Do We Take?",
    "keywords": "職涯 野心 成功 升遷 salary SALARY 薪資",
    "question": "We can take one group job: higher pay with longer hours, lower pay with free evenings, or a short risky project. Which offer should we accept?",
    "starter": "We will work together for three months. The salary, hours, and chances to learn differ. We cannot take more than one offer.",
    "followUp": "Which offer leaves enough time and money for the group to keep going?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which offer leaves enough time and money for the group to keep going?"
      },
      {
        "stage": "perspective",
        "question": "How could long hours affect someone with other duties?"
      },
      {
        "stage": "tradeoff",
        "question": "Would we accept lower salary in exchange for free evenings?"
      },
      {
        "stage": "practice",
        "question": "What conditions should we ask for before accepting an offer?"
      }
    ]
  },
  {
    "id": "rest",
    "category": "work",
    "emoji": "🛋️",
    "title": "A Break Before the Event",
    "keywords": "休息 工作 加班 責任",
    "question": "Our team must finish a small event tonight. Do we skip the break, cut one activity, or ask for more time?",
    "starter": "There are two hours left. The team is tired, and one unfinished activity is less important than the rest of the event.",
    "followUp": "Which unfinished work does the event actually need?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which unfinished work does the event actually need?"
      },
      {
        "stage": "perspective",
        "question": "Could pushing tired helpers make the final work slower or worse?"
      },
      {
        "stage": "tradeoff",
        "question": "What would we lose by dropping the least important activity?"
      },
      {
        "stage": "practice",
        "question": "Where should a short break fit in the remaining two hours?"
      }
    ]
  },
  {
    "id": "teamwork",
    "category": "work",
    "emoji": "🧱",
    "title": "Our Video Wins a Prize",
    "keywords": "合作 功勞 團隊 公平",
    "question": "Our group video wins a prize. Do we share the reward equally, give more to the main creator, or spend it on a group celebration?",
    "starter": "Some people appear in the video; others write, film, or edit. The prize belongs to the group, but the amount is small.",
    "followUp": "Which contributions made the video possible?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which contributions made the video possible?"
      },
      {
        "stage": "perspective",
        "question": "Would equal shares recognize the people working behind the camera?"
      },
      {
        "stage": "tradeoff",
        "question": "Could part of the prize cover costs and the rest fund a meal?"
      },
      {
        "stage": "practice",
        "question": "What reward agreement should we use before making another video?"
      }
    ]
  },
  {
    "id": "failure",
    "category": "work",
    "emoji": "🔧",
    "title": "The Burned Cupcakes",
    "keywords": "失敗 錯誤 學習 工作",
    "question": "Our group burns the first batch of cupcakes before a sale. Should we remake them, sell fewer cakes, or switch to something easier?",
    "starter": "The sale starts in ninety minutes. We have some ingredients left and one oven. We need a simple plan that the team can finish.",
    "followUp": "Do we have enough time and ingredients for another batch?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Do we have enough time and ingredients for another batch?"
      },
      {
        "stage": "perspective",
        "question": "Would new helpers manage a quick recipe better than the original one?"
      },
      {
        "stage": "tradeoff",
        "question": "Is a smaller number of good cakes better than a rushed full table?"
      },
      {
        "stage": "practice",
        "question": "What should the team change before putting anything back in the oven?"
      }
    ]
  },
  {
    "id": "meaning",
    "category": "work",
    "emoji": "🛠️",
    "title": "One Weekend, One Project",
    "keywords": "意義 工作 生活 熱情",
    "question": "Our group has one weekend for a project. Should we make money, help a neighbor, or build something silly together?",
    "starter": "We can use a shared room and basic tools. The project should give the group a reason to finish it, not just fill the weekend.",
    "followUp": "What would count as a worthwhile result for each option?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What would count as a worthwhile result for each option?"
      },
      {
        "stage": "perspective",
        "question": "Could a silly project help people join who dislike serious work?"
      },
      {
        "stage": "tradeoff",
        "question": "Can one project be enjoyable and useful without trying to do everything?"
      },
      {
        "stage": "practice",
        "question": "Which small project could we actually finish by Sunday evening?"
      }
    ]
  },
  {
    "id": "rules",
    "category": "fairness",
    "emoji": "⚖️",
    "title": "Extra Help for Beginners",
    "keywords": "公平 規則 例外 平等",
    "question": "We are running a game night. Should beginners get extra time, a helpful teammate, or the same rules as everyone else?",
    "starter": "Experienced players want a challenge. New players want a real chance to take part. Everyone should understand the rules before playing.",
    "followUp": "Which part of the game gives experienced players the biggest advantage?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which part of the game gives experienced players the biggest advantage?"
      },
      {
        "stage": "perspective",
        "question": "Could too much help make beginners feel that their wins do not count?"
      },
      {
        "stage": "tradeoff",
        "question": "Would help only in the first round be enough?"
      },
      {
        "stage": "practice",
        "question": "What beginner rule could we explain in one sentence?"
      }
    ]
  },
  {
    "id": "chances",
    "category": "fairness",
    "emoji": "🌉",
    "title": "Three Bikes for Six People",
    "keywords": "機會 起點 資源 平等",
    "question": "Our group has three bikes but six people. Should we take turns, walk together, or rent more bikes?",
    "starter": "We want an afternoon outing together. Renting costs extra, and some people are less confident riding. The route can be changed.",
    "followUp": "Does the outing need bikes, or just a way to travel together?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Does the outing need bikes, or just a way to travel together?"
      },
      {
        "stage": "perspective",
        "question": "What would make the least confident rider comfortable joining?"
      },
      {
        "stage": "tradeoff",
        "question": "Could a shorter route with turns work without extra rentals?"
      },
      {
        "stage": "practice",
        "question": "Which route and transport plan keeps all six people included?"
      }
    ]
  },
  {
    "id": "freedom",
    "category": "fairness",
    "emoji": "🕊️",
    "title": "Music in Our Shared Room",
    "keywords": "自由 限制 共享 空間",
    "question": "Our group shares a small room for a weekend. Should music be allowed anytime, only at set times, or through headphones?",
    "starter": "Some people enjoy music while getting ready. Others need quiet to rest or read. There is no separate room for noisy activities.",
    "followUp": "When does background music become a problem for the room?",
    "followUps": [
      {
        "stage": "understand",
        "question": "When does background music become a problem for the room?"
      },
      {
        "stage": "perspective",
        "question": "How could someone enjoy music without asking everyone else to listen?"
      },
      {
        "stage": "tradeoff",
        "question": "Could shared music times and quiet hours both fit the weekend?"
      },
      {
        "stage": "practice",
        "question": "What room rule should apply when somebody needs an unexpected rest?"
      }
    ]
  },
  {
    "id": "voice",
    "category": "fairness",
    "emoji": "🎙️",
    "title": "The Logo Vote Is Tied",
    "keywords": "發言 民主 多數 決策",
    "question": "Our group needs a new logo, but the vote is tied. Should we flip a coin, combine the designs, or let the artist decide?",
    "starter": "Both designs can be printed. We need one logo today, and a new full design would take too long.",
    "followUp": "What does each design communicate about our group?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What does each design communicate about our group?"
      },
      {
        "stage": "perspective",
        "question": "Would combining them answer the objections or create a worse logo?"
      },
      {
        "stage": "tradeoff",
        "question": "Is a random choice acceptable if both designs meet our needs?"
      },
      {
        "stage": "practice",
        "question": "What final decision method could everyone accept before printing?"
      }
    ]
  },
  {
    "id": "secondchance",
    "category": "fairness",
    "emoji": "🔄",
    "title": "Another Turn in the Kitchen",
    "keywords": "第二次 機會 原諒 責任",
    "question": "Our group cook ruined dinner once and wants another try. Do we let them lead again, pair them with a helper, or choose someone else?",
    "starter": "Nobody was hurt, but the last meal was not edible. We have ingredients for one dinner and want everyone to enjoy eating together.",
    "followUp": "What went wrong last time that we could change?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What went wrong last time that we could change?"
      },
      {
        "stage": "perspective",
        "question": "Would a helper support the cook or make them feel watched?"
      },
      {
        "stage": "tradeoff",
        "question": "Could an easier dish reduce the risk without removing their chance?"
      },
      {
        "stage": "practice",
        "question": "What should we agree to do if the next meal starts going wrong?"
      }
    ]
  },
  {
    "id": "merit",
    "category": "fairness",
    "emoji": "🎲",
    "title": "Which Cake Wins?",
    "keywords": "努力 運氣 成就 責任",
    "question": "Our group is giving a prize for a cake contest. Should the best cake win, the biggest improvement win, or should we draw a name?",
    "starter": "The bakers have different skill levels. There is only one prize, and the contest is meant to be friendly and fun.",
    "followUp": "Are we rewarding the cake, the learning, or simply taking part?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Are we rewarding the cake, the learning, or simply taking part?"
      },
      {
        "stage": "perspective",
        "question": "How would a beginner and an experienced baker see each prize rule?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we choose one winner while still noticing other good work?"
      },
      {
        "stage": "practice",
        "question": "What rule should go on the contest invitation before baking starts?"
      }
    ]
  },
  {
    "id": "privacy",
    "category": "digital",
    "emoji": "🔒",
    "title": "Posting Our Party Photos",
    "keywords": "隱私 便利 資料 科技",
    "question": "Our group wants to post party photos. Should we ask everyone first, hide faces, or keep the album private?",
    "starter": "The photos are funny, but one guest does not want their face online. We want to share the memory without sharing more than people agreed to.",
    "followUp": "Which photos could be shared without identifying anyone?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which photos could be shared without identifying anyone?"
      },
      {
        "stage": "perspective",
        "question": "Does hiding a face work if a name is still in the caption?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we share a few approved photos and keep the full album private?"
      },
      {
        "stage": "practice",
        "question": "What simple check should happen before the group posts a photo?"
      }
    ]
  },
  {
    "id": "ai",
    "category": "digital",
    "emoji": "🤖",
    "title": "Our Funny Travel Guide",
    "keywords": "人工智慧 AI 思考 學習 工作",
    "question": "Our group is making a funny travel guide. Should AI write it, suggest ideas only, or stay out of the project?",
    "starter": "The guide will include real places and silly comments. We want to finish quickly while keeping the facts clear and the group's own voice.",
    "followUp": "Which parts need accurate facts, and which can be playful?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which parts need accurate facts, and which can be playful?"
      },
      {
        "stage": "perspective",
        "question": "Could AI suggestions help a shy writer contribute more ideas?"
      },
      {
        "stage": "tradeoff",
        "question": "Would checking a full AI draft take longer than writing a short guide ourselves?"
      },
      {
        "stage": "practice",
        "question": "What job could AI do while our group keeps the final decisions?"
      }
    ]
  },
  {
    "id": "onlinefriend",
    "category": "digital",
    "emoji": "📱",
    "title": "Our First Offline Meetup",
    "keywords": "網路 友誼 關係 社群",
    "question": "Our online group wants its first meetup. Should we start with a small cafe visit, a group day out, or another video call?",
    "starter": "We know each other through chat but have never met in person. Some members live nearby; others would need a longer journey.",
    "followUp": "What can a short meetup offer that another call cannot?",
    "followUps": [
      {
        "stage": "understand",
        "question": "What can a short meetup offer that another call cannot?"
      },
      {
        "stage": "perspective",
        "question": "How could distant members stay included if the first meetup is small?"
      },
      {
        "stage": "tradeoff",
        "question": "Could a cafe visit with a short shared call avoid a full day of travel?"
      },
      {
        "stage": "practice",
        "question": "What place, length, and invitation would make the first meeting easy to join?"
      }
    ]
  },
  {
    "id": "news",
    "category": "digital",
    "emoji": "📰",
    "title": "Free Ice Cream: Real or Fake?",
    "keywords": "新聞 資訊 相信 謠言",
    "question": "Our group sees a post offering free ice cream today. Do we share it, check the shop first, or ignore it?",
    "starter": "The post has no clear date and uses an old photo. We want a fun outing without sending friends across town for nothing.",
    "followUp": "Which detail would show whether the offer is still active?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which detail would show whether the offer is still active?"
      },
      {
        "stage": "perspective",
        "question": "How would sharing too early affect someone already travelling to the shop?"
      },
      {
        "stage": "tradeoff",
        "question": "Is one quick check worth the risk of missing the offer?"
      },
      {
        "stage": "practice",
        "question": "What should our group message say while the offer is unconfirmed?"
      }
    ]
  },
  {
    "id": "attention",
    "category": "digital",
    "emoji": "⏳",
    "title": "Dinner Keeps Stopping",
    "keywords": "注意力 手機 時間 演算法",
    "question": "Our group dinner keeps stopping for phone checks. Do we put phones away, allow short phone breaks, or leave things as they are?",
    "starter": "People are missing parts of the conversation. One guest needs to stay reachable, so a complete phone ban would be difficult.",
    "followUp": "Which phone use helps the evening, and which interrupts it?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which phone use helps the evening, and which interrupts it?"
      },
      {
        "stage": "perspective",
        "question": "How could the reachable guest manage messages without feeling singled out?"
      },
      {
        "stage": "tradeoff",
        "question": "Would one shared phone break be better than many separate interruptions?"
      },
      {
        "stage": "practice",
        "question": "What agreement could we try for the rest of this dinner?"
      }
    ]
  },
  {
    "id": "publicmistakes",
    "category": "digital",
    "emoji": "💭",
    "title": "An Old Video, a Bad Joke",
    "keywords": "網路 錯誤 公審 遺忘",
    "question": "Our old group video includes a joke that now feels mean. Should we delete it, edit the joke, or add an apology?",
    "starter": "The video also contains good memories. It is still public, and the person in the joke no longer finds it funny.",
    "followUp": "Can the hurtful part be removed without losing the whole video?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Can the hurtful part be removed without losing the whole video?"
      },
      {
        "stage": "perspective",
        "question": "How would keeping it feel to the person being joked about?"
      },
      {
        "stage": "tradeoff",
        "question": "Would editing quietly solve the problem, or should we explain the change?"
      },
      {
        "stage": "practice",
        "question": "What could our group say and change before sharing the video again?"
      }
    ]
  },
  {
    "id": "honesty",
    "category": "ethics",
    "emoji": "🪟",
    "title": "The Very Salty Party Cake",
    "keywords": "誠實 善意 謊言 真相",
    "question": "A friend made our party cake, but it tastes terribly salty. Should our group tell them now, offer gentle tips later, or say nothing?",
    "starter": "The friend is proud of the cake, and guests have started eating. We want to be kind without pretending that the recipe worked.",
    "followUp": "Does the friend need to know now so they can fix anything?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Does the friend need to know now so they can fix anything?"
      },
      {
        "stage": "perspective",
        "question": "Would silence feel kind if they repeat the recipe at another party?"
      },
      {
        "stage": "tradeoff",
        "question": "Can we praise the effort while being clear about the taste?"
      },
      {
        "stage": "practice",
        "question": "What short message should one of us give on the group's behalf?"
      }
    ]
  },
  {
    "id": "loyalty",
    "category": "ethics",
    "emoji": "🧵",
    "title": "A Friend Checks the Answer",
    "keywords": "忠誠 朋友 對錯 支持",
    "question": "At our game night, a friend secretly checks an answer. Do we warn them quietly, restart the round, or let it go?",
    "starter": "It is a friendly quiz with no money prize. The other team is close to winning, and nobody else has noticed the answer check.",
    "followUp": "Did the checked answer change the result of the round?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Did the checked answer change the result of the round?"
      },
      {
        "stage": "perspective",
        "question": "How would the other team feel if they discovered it later?"
      },
      {
        "stage": "tradeoff",
        "question": "Could replaying one question protect the friendship and the game?"
      },
      {
        "stage": "practice",
        "question": "What rule should our group use if it happens again?"
      }
    ]
  },
  {
    "id": "giving",
    "category": "ethics",
    "emoji": "🎁",
    "title": "Six Extra Meals",
    "keywords": "幫助 捐助 距離 資源",
    "question": "Our group has six extra meals after a party. Should we give them to neighbors, save them for tomorrow, or share them with the helpers?",
    "starter": "The meals are fresh and ready to eat. We have room to keep only two overnight, and we do not want the rest wasted.",
    "followUp": "Who could use the meals while they are still ready to eat?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Who could use the meals while they are still ready to eat?"
      },
      {
        "stage": "perspective",
        "question": "Would the helpers expect food after spending the evening working?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we save two meals and offer the others in more than one place?"
      },
      {
        "stage": "practice",
        "question": "How should we offer the food without promising more than we have?"
      }
    ]
  },
  {
    "id": "promise",
    "category": "ethics",
    "emoji": "🪢",
    "title": "Rain at Our Movie Night",
    "keywords": "承諾 改變 責任 信任",
    "question": "We promised an outdoor movie night, but rain is coming. Should we move indoors, postpone it, or try a covered spot?",
    "starter": "Friends have already saved the evening. An indoor room is available, but it fits fewer people than the original outdoor space.",
    "followUp": "Which part of the promise matters most: tonight, the film, or being outdoors?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which part of the promise matters most: tonight, the film, or being outdoors?"
      },
      {
        "stage": "perspective",
        "question": "How would a smaller room affect the last people to arrive?"
      },
      {
        "stage": "tradeoff",
        "question": "Could two short indoor showings keep the evening open to everyone?"
      },
      {
        "stage": "practice",
        "question": "What change should we announce before guests start travelling?"
      }
    ]
  },
  {
    "id": "goodintentions",
    "category": "ethics",
    "emoji": "🌼",
    "title": "Nobody Can Find the Cups",
    "keywords": "善意 結果 責任 道歉",
    "question": "Someone rearranged our shared kitchen to help. Nobody can find anything. Do we keep the changes, put things back, or redesign it together?",
    "starter": "The kitchen is cleaner, but cups, pans, and snacks have moved. Everyone uses the room, and nobody agreed on the new layout.",
    "followUp": "Which changes are useful, and which make everyday tasks harder?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which changes are useful, and which make everyday tasks harder?"
      },
      {
        "stage": "perspective",
        "question": "What might the helper have been trying to fix?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we keep the clear surfaces while moving key items back?"
      },
      {
        "stage": "practice",
        "question": "Where should shared items go so a new guest can find them too?"
      }
    ]
  },
  {
    "id": "smallchoices",
    "category": "ethics",
    "emoji": "🛒",
    "title": "Cups for the Party",
    "keywords": "消費 道德 選擇 便利",
    "question": "Our group is buying cups for a party. Should we choose cheap throwaway cups, reusable cups, or ask everyone to bring one?",
    "starter": "We expect twenty guests and have a small budget. There is a sink, but cleanup will be done by the same group hosting the party.",
    "followUp": "Which option has a cost beyond buying the cups?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which option has a cost beyond buying the cups?"
      },
      {
        "stage": "perspective",
        "question": "What happens if several guests forget to bring a cup?"
      },
      {
        "stage": "tradeoff",
        "question": "Would borrowed cups plus a few spare ones reduce cost and cleanup?"
      },
      {
        "stage": "practice",
        "question": "What cup plan should we include in the invitation?"
      }
    ]
  },
  {
    "id": "climate",
    "category": "future",
    "emoji": "🌍",
    "title": "A Party With Less Waste",
    "keywords": "環境 氣候 責任 成本",
    "question": "Our group wants a fun party with less waste. Should we use borrowed decorations, edible decorations, or no decorations at all?",
    "starter": "The room looks plain, and we have little storage afterward. We want the party to feel special without throwing away bags of decorations.",
    "followUp": "Which decorations would make the biggest difference to the room?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which decorations would make the biggest difference to the room?"
      },
      {
        "stage": "perspective",
        "question": "Would edible decorations still work for guests with different diets?"
      },
      {
        "stage": "tradeoff",
        "question": "Could we borrow a few large items instead of buying many small ones?"
      },
      {
        "stage": "practice",
        "question": "What should our decoration plan include from arrival through cleanup?"
      }
    ]
  },
  {
    "id": "city",
    "category": "future",
    "emoji": "🏙️",
    "title": "One Empty Shop",
    "keywords": "城市 住宅 公共 空間",
    "question": "Our street has one empty shop for a shared space. Should we turn it into a reading room, a game room, or a small indoor garden?",
    "starter": "The space is small and available for one year. Neighbors of different ages should be able to use it without paying to enter.",
    "followUp": "Which option could make good use of a small room?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which option could make good use of a small room?"
      },
      {
        "stage": "perspective",
        "question": "How would children and older visitors share the same space?"
      },
      {
        "stage": "tradeoff",
        "question": "Could one room serve two uses at different times?"
      },
      {
        "stage": "practice",
        "question": "What layout and opening hours would make our chosen use work?"
      }
    ]
  },
  {
    "id": "generations",
    "category": "future",
    "emoji": "🌳",
    "title": "A Box for Future Us",
    "keywords": "世代 未來 資源 責任",
    "question": "Our group can put three things in a box to open in ten years. Should we choose photos, messages, toys, favorite songs, or something else?",
    "starter": "The box must fit on a small shelf. We want future us to enjoy it even if the group has changed or forgotten today's jokes.",
    "followUp": "Which items would still make sense without a long explanation?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which items would still make sense without a long explanation?"
      },
      {
        "stage": "perspective",
        "question": "How could the box represent people who joined the group recently?"
      },
      {
        "stage": "tradeoff",
        "question": "Should we leave out a large object to include more people's messages?"
      },
      {
        "stage": "practice",
        "question": "Which three things should we seal, and how should we label them?"
      }
    ]
  },
  {
    "id": "education",
    "category": "future",
    "emoji": "📚",
    "title": "Our One Free Class",
    "keywords": "教育 學習 學校 未來",
    "question": "Our group can offer one free class: easy cooking, fixing small things, or making funny videos. Which class should we run?",
    "starter": "We have one room, basic equipment, and two hours. The class should welcome beginners and leave them with something they can use.",
    "followUp": "Which class could beginners finish successfully in two hours?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which class could beginners finish successfully in two hours?"
      },
      {
        "stage": "perspective",
        "question": "What would help a learner who has never used the equipment?"
      },
      {
        "stage": "tradeoff",
        "question": "Could a simple lesson be more useful than showing many skills?"
      },
      {
        "stage": "practice",
        "question": "What should everyone be able to do by the end of our class?"
      }
    ]
  },
  {
    "id": "animals",
    "category": "future",
    "emoji": "🐾",
    "title": "Pets at Our Cafe",
    "keywords": "動物 照顧 倫理 自然",
    "question": "Our group is opening a cafe where pets can visit. Should animals sit inside, stay in a garden, or visit only on special days?",
    "starter": "Some guests love pets; others want a quiet meal without animals nearby. We have one indoor room and a small garden.",
    "followUp": "Which spaces could pets and other guests use comfortably?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which spaces could pets and other guests use comfortably?"
      },
      {
        "stage": "perspective",
        "question": "How would the plan work for someone afraid of dogs?"
      },
      {
        "stage": "tradeoff",
        "question": "Could separate hours or areas welcome pets without taking over the cafe?"
      },
      {
        "stage": "practice",
        "question": "What pet rule should guests see before they arrive?"
      }
    ]
  },
  {
    "id": "communitychange",
    "category": "future",
    "emoji": "🌻",
    "title": "An Empty Corner in Our Building",
    "keywords": "社區 改變 行動 希望",
    "question": "Our building has one empty corner. Should our group add a book shelf, a plant swap, or a board for free items?",
    "starter": "Neighbors pass the corner every day. It must stay tidy and easy to walk past, and nobody can look after it all the time.",
    "followUp": "Which option could people use without needing a helper?",
    "followUps": [
      {
        "stage": "understand",
        "question": "Which option could people use without needing a helper?"
      },
      {
        "stage": "perspective",
        "question": "What would make someone new to the building comfortable taking part?"
      },
      {
        "stage": "tradeoff",
        "question": "Could a smaller setup be easier to maintain than a popular messy one?"
      },
      {
        "stage": "practice",
        "question": "What should our group put there first, and who checks it each week?"
      }
    ]
  }
];
const TALK_SCENARIO_TOPICS = [
  {
    "id": "chat-scene-01",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "One Trip, Two Big Plans",
    "keywords": "同團不同步 旅行 度假 旅伴 分開 行程 飯店 拍照",
    "question": "Our three-day trip can include two activities: beach, mountain walk or museum. Which two should we choose for everyone?",
    "starter": "The group shares one travel budget. There is enough money for two activities, so one option must be left out.",
    "followUp": "The beach is cheap, but rain is likely. Does that change our first choice?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "The beach is cheap, but rain is likely. Does that change our first choice?"
      },
      {
        "stage": "scenario",
        "question": "Someone dislikes long walks. How could we adapt the mountain plan?"
      },
      {
        "stage": "scenario",
        "question": "Can the museum idea connect with another activity in one day?"
      },
      {
        "stage": "scenario",
        "question": "Which part of the trip should stay free of plans?"
      },
      {
        "stage": "scenario",
        "question": "What would make the person whose favorite option loses feel included?"
      },
      {
        "stage": "scenario",
        "question": "Could splitting up for one afternoon solve the disagreement?"
      },
      {
        "stage": "scenario",
        "question": "Our bus leaves earlier than expected. What should we cut first?"
      },
      {
        "stage": "scenario",
        "question": "What two activities and one backup can we finally agree on?"
      }
    ],
    "sourceTopicId": "topic_v2_01",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-02",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "One Home, One Fridge Shelf",
    "keywords": "同住一個月 合租 住家 室友 房子 冰箱 習慣 作息",
    "question": "Our shared home has one free fridge shelf and no quiet hours. What food and noise rules should we agree on?",
    "starter": "Everyone uses the same small fridge and shared rooms. Food needs space, and some people sleep earlier than others.",
    "followUp": "Should each person get equal fridge space, or should we keep only shared food?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Should each person get equal fridge space, or should we keep only shared food?"
      },
      {
        "stage": "scenario",
        "question": "A large birthday cake fills the whole shelf. What exception would be fair?"
      },
      {
        "stage": "scenario",
        "question": "One roommate cooks after midnight. Can that fit our quiet rule?"
      },
      {
        "stage": "scenario",
        "question": "How could we improve the fridge plan someone just suggested?"
      },
      {
        "stage": "scenario",
        "question": "What noise can we accept, even during quiet hours?"
      },
      {
        "stage": "scenario",
        "question": "Would labels solve the food problem or make the home feel strict?"
      },
      {
        "stage": "scenario",
        "question": "If two roommates break different rules, should the response be the same?"
      },
      {
        "stage": "scenario",
        "question": "Which two rules would we actually put on the kitchen wall?"
      }
    ],
    "sourceTopicId": "topic_v2_02",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-03",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "Four Hours, One Car Speaker",
    "keywords": "同車的音樂 搭車 車子 音樂 唱歌 安靜 旅途",
    "question": "We share one car for four hours. Some want songs, games or sleep. How should we divide the ride?",
    "starter": "All passengers share the same sound. The driver needs to stay focused, and quiet time is one of the options.",
    "followUp": "Would short music blocks work better than one long playlist?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would short music blocks work better than one long playlist?"
      },
      {
        "stage": "scenario",
        "question": "What kind of car game could include people without distracting the driver?"
      },
      {
        "stage": "scenario",
        "question": "Can we build a plan around the quiet time someone requested?"
      },
      {
        "stage": "scenario",
        "question": "One passenger hates our first song. Should there be a skip rule?"
      },
      {
        "stage": "scenario",
        "question": "How can a sleeping passenger keep their quiet time without stopping all conversation?"
      },
      {
        "stage": "scenario",
        "question": "A traffic jam adds an hour. Which part of our plan should grow?"
      },
      {
        "stage": "scenario",
        "question": "Could headphones help, or would they separate the group too much?"
      },
      {
        "stage": "scenario",
        "question": "What schedule should we use for the first hour?"
      }
    ],
    "sourceTopicId": "topic_v2_03",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-04",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "A Rainy Weekend Cabin",
    "keywords": "朋友的週末小屋 小屋 週末 休息 放鬆 假期 計畫",
    "question": "Rain and a power cut ruin our cabin plans. With cards, paper and a small stove, how can we save the weekend together?",
    "starter": "Outdoor plans and electric devices are unavailable. The group can use simple games, paper, and food cooked on the stove.",
    "followUp": "Should we cook first or start a game while it is still light?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Should we cook first or start a game while it is still light?"
      },
      {
        "stage": "scenario",
        "question": "What could turn the paper idea into something the whole cabin can enjoy?"
      },
      {
        "stage": "scenario",
        "question": "Two people want silence while others want a loud game. How can the cabin plan give both groups space?"
      },
      {
        "stage": "scenario",
        "question": "Can we invent a game that uses both cards and paper?"
      },
      {
        "stage": "scenario",
        "question": "Which activity would still work if nobody knew the rules?"
      },
      {
        "stage": "scenario",
        "question": "We have food for one special meal. When should we make it?"
      },
      {
        "stage": "scenario",
        "question": "The rain stops for twenty minutes. Do we interrupt our indoor plan?"
      },
      {
        "stage": "scenario",
        "question": "What should the cabin group do tonight and tomorrow morning?"
      }
    ],
    "sourceTopicId": "topic_v2_04",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-05",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "One Table, Different Work",
    "keywords": "大家的共享工作桌 工作桌 共享 專心 工作 聲音 界線",
    "question": "Our group has one table, one lamp, one speaker and two power plugs. How should we arrange the space and work?",
    "starter": "Space and equipment are limited. Some tasks need quiet, while others require people to discuss ideas.",
    "followUp": "Which task should get the lamp first, and what is the reason?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which task should get the lamp first, and what is the reason?"
      },
      {
        "stage": "scenario",
        "question": "Could the table have quiet periods instead of permanent quiet?"
      },
      {
        "stage": "scenario",
        "question": "How can we combine the seating ideas already on the table?"
      },
      {
        "stage": "scenario",
        "question": "Someone needs a phone call. Where should it happen?"
      },
      {
        "stage": "scenario",
        "question": "Does equal time with the plugs make sense if one battery lasts longer?"
      },
      {
        "stage": "scenario",
        "question": "What signal could show that a person needs help without interrupting everyone?"
      },
      {
        "stage": "scenario",
        "question": "If our rules slow the project down, which rule could we relax?"
      },
      {
        "stage": "scenario",
        "question": "What arrangement will we try for the next thirty minutes?"
      }
    ],
    "sourceTopicId": "topic_v2_05",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-06",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "The Offline Gathering",
    "keywords": "沒有訊號的聚會 聚會 斷網 網路 手機 訊號 通知",
    "question": "Our internet fails before a quiz. With paper, pens and two hours, should we invent a quiz, group story or treasure hunt?",
    "starter": "The planned online activity cannot run. The replacement must use the people and simple materials already in the room.",
    "followUp": "What would make an invented quiz fair without looking up answers?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "What would make an invented quiz fair without looking up answers?"
      },
      {
        "stage": "scenario",
        "question": "Can the story idea borrow a funny detail from the treasure hunt?"
      },
      {
        "stage": "scenario",
        "question": "Which plan lets a late arrival join without stopping everyone?"
      },
      {
        "stage": "scenario",
        "question": "Some people dislike acting. How could the story still include them?"
      },
      {
        "stage": "scenario",
        "question": "What objects could become clues without hiding anything valuable?"
      },
      {
        "stage": "scenario",
        "question": "If we mix two ideas, what should the first ten minutes look like?"
      },
      {
        "stage": "scenario",
        "question": "The signal returns halfway through. Should we finish our new game?"
      },
      {
        "stage": "scenario",
        "question": "Which offline plan would we choose again even with working internet?"
      }
    ],
    "sourceTopicId": "topic_v2_06",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-07",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "A New Friend in Our Group",
    "keywords": "第一次跟新朋友出門 新朋友 歡迎 初次 陌生人 團體",
    "question": "Our new friend does not know our old jokes. Should we teach our usual game, invent one together or share a meal?",
    "starter": "The new friend does not share the group history. The activity should include them without making them the center of attention.",
    "followUp": "Which old joke could become confusing instead of funny for the new friend?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which old joke could become confusing instead of funny for the new friend?"
      },
      {
        "stage": "scenario",
        "question": "How could teaching the game avoid turning into a long lesson?"
      },
      {
        "stage": "scenario",
        "question": "Can the meal idea include a small activity for everyone?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to keep our usual game unchanged. What compromise could work?"
      },
      {
        "stage": "scenario",
        "question": "What should we do if the new friend prefers to watch first?"
      },
      {
        "stage": "scenario",
        "question": "Could the new friend help choose one new rule without extra pressure?"
      },
      {
        "stage": "scenario",
        "question": "How would we notice that our welcome plan is not working?"
      },
      {
        "stage": "scenario",
        "question": "What should we do together during the first fifteen minutes?"
      }
    ],
    "sourceTopicId": "topic_v2_07",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-08",
    "category": "shared-living",
    "emoji": "🏠",
    "title": "Dinner With One Pan",
    "keywords": "同一個廚房的晚餐 廚房 做飯 晚餐 煮菜 食物",
    "question": "We have rice, eggs, carrots, tomatoes and one pan. What quick but special dinner can our group make together?",
    "starter": "The ingredients and cooking equipment are fixed. Preparation, cooking, and cleaning all need to fit one shared dinner plan.",
    "followUp": "Which ingredient should be the center of the meal?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which ingredient should be the center of the meal?"
      },
      {
        "stage": "scenario",
        "question": "Can a quick dish use the special detail someone suggested?"
      },
      {
        "stage": "scenario",
        "question": "What can people prepare while the pan is busy?"
      },
      {
        "stage": "scenario",
        "question": "Two cooks disagree about adding salt. How could both tastes fit?"
      },
      {
        "stage": "scenario",
        "question": "If the rice burns, what backup can these ingredients still make?"
      },
      {
        "stage": "scenario",
        "question": "Who should clean while others cook, and how can that feel fair?"
      },
      {
        "stage": "scenario",
        "question": "Would a simple starter make the main dish feel more special?"
      },
      {
        "stage": "scenario",
        "question": "What menu and kitchen jobs can we settle on now?"
      }
    ],
    "sourceTopicId": "topic_v2_08",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-09",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "A Shop That Lets Us Rest",
    "keywords": "老闆也想休息的小店 商店 小店 生意 店員 客人 開店",
    "question": "We want a shop without working every weekend. Should we sell tea, plants or repairs, and what opening hours work?",
    "starter": "The business needs customers, but the group also wants regular time off. Each shop idea needs different supplies and daily work.",
    "followUp": "Which shop could close for a day without causing the biggest problem?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which shop could close for a day without causing the biggest problem?"
      },
      {
        "stage": "scenario",
        "question": "What extra service could improve the plant shop idea?"
      },
      {
        "stage": "scenario",
        "question": "Would a short weekend shift solve the work disagreement?"
      },
      {
        "stage": "scenario",
        "question": "Which tea shop task might be more tiring than it looks?"
      },
      {
        "stage": "scenario",
        "question": "A customer asks us to open late every evening. Should we change our promise?"
      },
      {
        "stage": "scenario",
        "question": "Could two shop ideas share the same small space?"
      },
      {
        "stage": "scenario",
        "question": "What would we stop offering if the shop became too busy?"
      },
      {
        "stage": "scenario",
        "question": "What should our sign say about opening hours and the main service?"
      }
    ],
    "sourceTopicId": "topic_v2_09",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-10",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "A Birthday on a Small Budget",
    "keywords": "小預算的生日 生日 預算 慶祝 禮物 驚喜",
    "question": "Our friend dislikes public surprises. With money for a cake or gift, what special birthday can we plan without embarrassing them?",
    "starter": "The budget covers only one bought item. The birthday friend enjoys care and celebration, but does not want a public performance.",
    "followUp": "Would the cake bring more people together than the gift?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would the cake bring more people together than the gift?"
      },
      {
        "stage": "scenario",
        "question": "What could make the small gift more personal without extra money?"
      },
      {
        "stage": "scenario",
        "question": "How could we build on the quiet celebration idea?"
      },
      {
        "stage": "scenario",
        "question": "Should we tell our friend the whole plan or keep one small surprise?"
      },
      {
        "stage": "scenario",
        "question": "Someone suggests singing in a restaurant. How can we change that idea kindly?"
      },
      {
        "stage": "scenario",
        "question": "What can the group make using things we already own?"
      },
      {
        "stage": "scenario",
        "question": "If our friend arrives tired, which part should be easy to cancel?"
      },
      {
        "stage": "scenario",
        "question": "What will we buy, make, and say on the day?"
      }
    ],
    "sourceTopicId": "topic_v2_10",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-11",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "Our Three-Object Show",
    "keywords": "我們的荒謬節目 節目 綜藝 才藝 表演 影片 搞笑",
    "question": "We have five minutes and three objects: an umbrella, a spoon and a sock. What funny show can we make together?",
    "starter": "There are three objects and five minutes of stage time. The group must agree on one show idea and use the objects creatively.",
    "followUp": "What news could the sock report with a completely serious face?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "What news could the sock report with a completely serious face?"
      },
      {
        "stage": "scenario",
        "question": "Can the spoon idea become the main event instead of a small joke?"
      },
      {
        "stage": "scenario",
        "question": "How would the umbrella help a cooking show without real food?"
      },
      {
        "stage": "scenario",
        "question": "Which show idea gives everyone a useful part?"
      },
      {
        "stage": "scenario",
        "question": "Two people want to be the host. Could the show use both?"
      },
      {
        "stage": "scenario",
        "question": "What mistake could we turn into a planned funny moment?"
      },
      {
        "stage": "scenario",
        "question": "The audience does not laugh at our first joke. What happens next?"
      },
      {
        "stage": "scenario",
        "question": "What opening and ending should our five-minute show have?"
      }
    ],
    "sourceTopicId": "topic_v2_11",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-12",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "The Museum of Ordinary Things",
    "keywords": "普通東西博物館 博物館 展覽 物品 普通 故事 回憶",
    "question": "Our tiny museum can display one object: a spoon, receipt or lonely sock. Which object and story should we choose together?",
    "starter": "The objects have no special history yet. The group invents one shared story for the single display.",
    "followUp": "What could make the receipt look important without changing the object?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "What could make the receipt look important without changing the object?"
      },
      {
        "stage": "scenario",
        "question": "Could the sock story borrow the mystery from the spoon idea?"
      },
      {
        "stage": "scenario",
        "question": "Would a funny label or a serious label attract more visitors?"
      },
      {
        "stage": "scenario",
        "question": "What detail would make our invented story believable?"
      },
      {
        "stage": "scenario",
        "question": "Someone thinks the display is too ordinary. How could we answer that?"
      },
      {
        "stage": "scenario",
        "question": "Should visitors touch the object or only look at it?"
      },
      {
        "stage": "scenario",
        "question": "What question could the display leave for visitors to discuss?"
      },
      {
        "stage": "scenario",
        "question": "Which object, story, and short label are we choosing for the museum?"
      }
    ],
    "sourceTopicId": "topic_v2_12",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-13",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "A Party With Room to Be Quiet",
    "keywords": "給不愛社交的人一場聚會 聚會 派對 社交 安靜 壓力",
    "question": "Our guests dislike loud parties and forced introductions. How can we combine games and quiet conversation so everyone can join comfortably?",
    "starter": "Guests need choices without being pushed to perform. The room must fit both quiet time and some shared activity.",
    "followUp": "Could one gentle game work for people who mostly want to watch?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could one gentle game work for people who mostly want to watch?"
      },
      {
        "stage": "scenario",
        "question": "What should the invitation say about arriving late or leaving early?"
      },
      {
        "stage": "scenario",
        "question": "How can we build a quiet corner into the room plan?"
      },
      {
        "stage": "scenario",
        "question": "Would separate areas help, or would the group feel divided?"
      },
      {
        "stage": "scenario",
        "question": "Someone suggests a round of personal introductions. What could replace it?"
      },
      {
        "stage": "scenario",
        "question": "Which shared activity could begin without everyone joining at once?"
      },
      {
        "stage": "scenario",
        "question": "What should we change if the game becomes louder than expected?"
      },
      {
        "stage": "scenario",
        "question": "What will guests see and hear when they first enter?"
      }
    ],
    "sourceTopicId": "topic_v2_13",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-14",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "A Visitor on an Ordinary Street",
    "keywords": "普通街區的特別一天 街區 鄰居 社區 導覽 朋友 景點",
    "question": "Our friend has two hours here: the bakery closes soon, the park is free and the market is crowded. What route works?",
    "starter": "The visit has a time limit. The group must compare food, quiet space, and a lively market while choosing a practical route.",
    "followUp": "Should we visit the bakery first even if it means a longer walk?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Should we visit the bakery first even if it means a longer walk?"
      },
      {
        "stage": "scenario",
        "question": "What small detail could make the park stop more interesting?"
      },
      {
        "stage": "scenario",
        "question": "How could the route include the food idea someone just offered?"
      },
      {
        "stage": "scenario",
        "question": "Our visitor dislikes crowds. Is the market still worth a short stop?"
      },
      {
        "stage": "scenario",
        "question": "If we spend half our time talking in one place, is the plan failing?"
      },
      {
        "stage": "scenario",
        "question": "What could we show that a normal travel guide would miss?"
      },
      {
        "stage": "scenario",
        "question": "Rain begins before the park. How should our route change?"
      },
      {
        "stage": "scenario",
        "question": "Which two stops and one small surprise will our visit include?"
      }
    ],
    "sourceTopicId": "topic_v2_14",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-15",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "The One-Day Swap Shop",
    "keywords": "只營業一天的交換店 交換 商店 二手 物品",
    "question": "We are running a swap shop. Should we exchange items one-for-one, group small items or allow free choosing to keep it friendly?",
    "starter": "No money changes hands. The group needs a clear exchange rule and a plan for items left at closing time.",
    "followUp": "Could a large toy fairly exchange for one small book?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could a large toy fairly exchange for one small book?"
      },
      {
        "stage": "scenario",
        "question": "How would item groups avoid long arguments over value?"
      },
      {
        "stage": "scenario",
        "question": "Can we combine free choosing with the limit someone suggested?"
      },
      {
        "stage": "scenario",
        "question": "What should happen if one person takes nearly everything?"
      },
      {
        "stage": "scenario",
        "question": "Would telling an object’s story help people value it differently?"
      },
      {
        "stage": "scenario",
        "question": "Which kitchen items should be checked before someone takes them home?"
      },
      {
        "stage": "scenario",
        "question": "At closing time, should leftover things return home or stay for another event?"
      },
      {
        "stage": "scenario",
        "question": "What swap rule and closing plan should we explain at the door?"
      }
    ],
    "sourceTopicId": "topic_v2_15",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-16",
    "category": "shared-planning",
    "emoji": "🎪",
    "title": "One Small Room for Rest",
    "keywords": "給大家一個休息角落 休息 房間 空間 燈光 聲音 椅子",
    "question": "Our shared room must support naps and conversation. Should we buy a lamp, soft chair or curtain, and how should we share it?",
    "starter": "There is money for one improvement. The same room must support different kinds of rest without becoming difficult to manage.",
    "followUp": "Would the curtain solve more problems than the comfortable chair?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would the curtain solve more problems than the comfortable chair?"
      },
      {
        "stage": "scenario",
        "question": "Could the lamp idea support both reading and quiet rest?"
      },
      {
        "stage": "scenario",
        "question": "How should we divide the room if two activities happen at once?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants music all evening. What limit could others accept?"
      },
      {
        "stage": "scenario",
        "question": "Should nap time be booked, or should people decide as they arrive?"
      },
      {
        "stage": "scenario",
        "question": "What cleaning rule would keep the room comfortable without much work?"
      },
      {
        "stage": "scenario",
        "question": "If the room becomes a storage space, what must leave first?"
      },
      {
        "stage": "scenario",
        "question": "Which item and two room rules are we ready to try?"
      }
    ],
    "sourceTopicId": "topic_v2_16",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-17",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "Our Neighbor Powers Team",
    "keywords": "互助超能力公寓 超能力 鄰居 公寓 幫助 幻想",
    "question": "Our powers dry clothes, find keys and grow plants only for others. How can we share help without working all day?",
    "starter": "The powers solve small daily problems, but their owners still need rest. Requests for help must fit a shared plan.",
    "followUp": "Which power would receive the most requests on a rainy day?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which power would receive the most requests on a rainy day?"
      },
      {
        "stage": "scenario",
        "question": "Could a shared request board improve the plan already suggested?"
      },
      {
        "stage": "scenario",
        "question": "What should happen when someone asks for help every morning?"
      },
      {
        "stage": "scenario",
        "question": "Should urgent lost keys come before a dying plant?"
      },
      {
        "stage": "scenario",
        "question": "How can neighbors thank helpers without paying for every favor?"
      },
      {
        "stage": "scenario",
        "question": "One power owner says no today. How should the building respond?"
      },
      {
        "stage": "scenario",
        "question": "What funny mistake might happen if the powers get mixed up?"
      },
      {
        "stage": "scenario",
        "question": "What help schedule and request rule will our building use?"
      }
    ],
    "sourceTopicId": "topic_v2_17",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-18",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "One Borrowed Routine for Everyone",
    "keywords": "人生借住一天 借住 人生 朋友 一天 日常 作息",
    "question": "Our group must borrow one routine for a day: early baker, night worker or busy musician. Which could we manage together?",
    "starter": "The group shares one borrowed schedule, including its work, meals, and rest. The routine lasts for one day only.",
    "followUp": "Would the baker’s early start leave us too tired for the fun part?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would the baker’s early start leave us too tired for the fun part?"
      },
      {
        "stage": "scenario",
        "question": "What could make the night worker’s meals easier for the whole group?"
      },
      {
        "stage": "scenario",
        "question": "How could we add the practice idea to the musician’s day?"
      },
      {
        "stage": "scenario",
        "question": "Someone refuses to wake before sunrise. Can our choice still work?"
      },
      {
        "stage": "scenario",
        "question": "Which shared job would need the most help from everyone?"
      },
      {
        "stage": "scenario",
        "question": "What part of the borrowed schedule should we be allowed to change?"
      },
      {
        "stage": "scenario",
        "question": "If half the group gets tired early, how should we finish the day?"
      },
      {
        "stage": "scenario",
        "question": "Which routine and one agreed change will we try together?"
      }
    ],
    "sourceTopicId": "topic_v2_18",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-19",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "An Extra Hour for Our Neighborhood",
    "keywords": "每天多出的一小時 時間 一小時 每天 休息 興趣",
    "question": "Our neighborhood shares an extra hour daily. Should we grow food, make music or rest in a park so everyone enjoys it?",
    "starter": "The extra hour belongs to the whole neighborhood. One activity must work for different ages, energy levels, and interests.",
    "followUp": "Would growing food still feel useful to people who cannot dig?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would growing food still feel useful to people who cannot dig?"
      },
      {
        "stage": "scenario",
        "question": "How could the music idea leave room for neighbors who need quiet?"
      },
      {
        "stage": "scenario",
        "question": "Can the park plan include something active without disturbing rest?"
      },
      {
        "stage": "scenario",
        "question": "What time of day would make the extra hour easiest to share?"
      },
      {
        "stage": "scenario",
        "question": "Someone calls resting a waste of the gift. How could we respond?"
      },
      {
        "stage": "scenario",
        "question": "Should everyone do one task, or could one shared project have different jobs?"
      },
      {
        "stage": "scenario",
        "question": "What would we change if people stopped joining after a week?"
      },
      {
        "stage": "scenario",
        "question": "Which activity and first small step will our neighborhood choose?"
      }
    ],
    "sourceTopicId": "topic_v2_19",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-20",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "Our Kitchen Objects Refuse to Work",
    "keywords": "物品終於會抱怨 物品 抱怨 會說話 家電 習慣 objects complaints objects complaints",
    "question": "Our talking fridge, kettle and pan refuse to work. The fridge is crowded, the kettle dirty, the pan tired. What promise should we make first?",
    "starter": "The kitchen objects have stopped working. The group must agree on one real change before an object will help with dinner.",
    "followUp": "Can we make dinner if only the pan agrees to work again?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Can we make dinner if only the pan agrees to work again?"
      },
      {
        "stage": "scenario",
        "question": "Would the fridge accept a smaller promise than clearing every shelf?"
      },
      {
        "stage": "scenario",
        "question": "How could the cleaning idea also help the kettle rest?"
      },
      {
        "stage": "scenario",
        "question": "Which object sounds reasonable, and which sounds a little dramatic?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to buy new objects instead. Would that solve the complaints?"
      },
      {
        "stage": "scenario",
        "question": "What might the forgotten toaster add to this argument?"
      },
      {
        "stage": "scenario",
        "question": "How should we show the objects that our promise will last?"
      },
      {
        "stage": "scenario",
        "question": "Which complaint and shared kitchen job will we settle tonight?"
      }
    ],
    "sourceTopicId": "topic_v2_20",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-21",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "Three Ten-Second Redos",
    "keywords": "生活的小小重來鍵 重來 按鈕 十秒 後悔 尷尬",
    "question": "Our dinner show's button can redo ten seconds three times. Should we save it for cooking mistakes, failed jokes or the ending?",
    "starter": "The button repeats ten seconds and has only three uses. Everyone shares those uses, so small fixes may leave none for later.",
    "followUp": "A joke fails but nobody is upset. Is that worth one redo?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "A joke fails but nobody is upset. Is that worth one redo?"
      },
      {
        "stage": "scenario",
        "question": "Could the cooking plan avoid using the button too early?"
      },
      {
        "stage": "scenario",
        "question": "What signal should people give before someone presses it?"
      },
      {
        "stage": "scenario",
        "question": "Two people want different parts of the same moment changed. Which change comes first?"
      },
      {
        "stage": "scenario",
        "question": "Would we reserve the last use for the ending or for emergencies?"
      },
      {
        "stage": "scenario",
        "question": "Could repeating a mistake twice become funnier than fixing it?"
      },
      {
        "stage": "scenario",
        "question": "What should happen if someone uses a redo without group agreement?"
      },
      {
        "stage": "scenario",
        "question": "Which three kinds of moments will our button rule allow?"
      }
    ],
    "sourceTopicId": "topic_v2_21",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-22",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "Our Package From Ten Years Ahead",
    "keywords": "未來寄來的小包裹 未來 包裹 十年 物件 線索",
    "question": "Our package from ten years ahead disappears tonight: a broken umbrella, tiny chair and key marked \"Do not open.\" Which one should we investigate together?",
    "starter": "The objects come from the group’s future, but there is no explanation. One clue can be explored before the package disappears tonight.",
    "followUp": "What kind of shared future could explain the tiny chair?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "What kind of shared future could explain the tiny chair?"
      },
      {
        "stage": "scenario",
        "question": "Could the umbrella clue connect with the key idea?"
      },
      {
        "stage": "scenario",
        "question": "Does the warning on the key make it more interesting or less sensible to investigate?"
      },
      {
        "stage": "scenario",
        "question": "What harmless test could tell us more without breaking an object?"
      },
      {
        "stage": "scenario",
        "question": "Someone thinks the package is a joke. What detail might change their mind?"
      },
      {
        "stage": "scenario",
        "question": "Which discovery could help our group make a choice today?"
      },
      {
        "stage": "scenario",
        "question": "If our first guess is wrong, what other explanation still fits?"
      },
      {
        "stage": "scenario",
        "question": "Which clue and first test should the whole group support?"
      }
    ],
    "sourceTopicId": "topic_v2_22",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-23",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "One Replay of Our Lost Picnic",
    "keywords": "回看日常片段 回憶 日常 過去 記憶 照片",
    "question": "Our picnic cake vanished. We can replay thirty seconds of packing, boarding the bus or feeding ducks. Which moment should we watch together?",
    "starter": "The group gets one short view of the past. Three possible moments may contain a clue, but only one can be replayed.",
    "followUp": "Would the packing scene prove the cake ever left the kitchen?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would the packing scene prove the cake ever left the kitchen?"
      },
      {
        "stage": "scenario",
        "question": "How could the bus idea explain both the basket and the missing food?"
      },
      {
        "stage": "scenario",
        "question": "What exactly should we watch for near the ducks?"
      },
      {
        "stage": "scenario",
        "question": "Someone remembers a different order of events. How should that affect our choice?"
      },
      {
        "stage": "scenario",
        "question": "Could an ordinary detail matter more than a clear view of the cake?"
      },
      {
        "stage": "scenario",
        "question": "What would count as enough evidence to solve the mystery?"
      },
      {
        "stage": "scenario",
        "question": "If the replay shows nothing useful, which shared explanation still makes sense?"
      },
      {
        "stage": "scenario",
        "question": "Which thirty seconds will we watch, and what are we looking for?"
      }
    ],
    "sourceTopicId": "topic_v2_23",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-24",
    "category": "light-fantasy",
    "emoji": "✨",
    "title": "One Impossible Service for Our Group",
    "keywords": "離譜但方便的服務 服務 商店 幻想 離譜 方便",
    "question": "Our group can buy one magical service: doors to anywhere, clothes that clean themselves or weather matching our plans. Which should we choose and control?",
    "starter": "There is money for one magical service. Its benefit is shared, but careless use could create a problem for other people.",
    "followUp": "Could the door service cause arguments about where the group should go?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could the door service cause arguments about where the group should go?"
      },
      {
        "stage": "scenario",
        "question": "Would self-cleaning clothes be enough of a shared benefit?"
      },
      {
        "stage": "scenario",
        "question": "How could a weather rule improve the outdoor plan someone suggested?"
      },
      {
        "stage": "scenario",
        "question": "One person wants sunny days while another wants rain. Who gets to decide?"
      },
      {
        "stage": "scenario",
        "question": "Should a magic door ever open inside a neighbor’s home without asking?"
      },
      {
        "stage": "scenario",
        "question": "Could the service save enough work to create a new group activity?"
      },
      {
        "stage": "scenario",
        "question": "What would make us stop using our chosen service before the month ends?"
      },
      {
        "stage": "scenario",
        "question": "Which service and one clear safety rule should we buy?"
      }
    ],
    "sourceTopicId": "topic_v2_24",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-25",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "A Huge Gift for Our Tiny Room",
    "keywords": "用心但不想要的禮物 禮物 朋友 用心 實用",
    "question": "Our friend's giant soft chair blocks our shared room's door. Should we move it, exchange it or turn it into another gift?",
    "starter": "The gift is thoughtful but does not fit the space. The group needs a usable room and a respectful response to the friend.",
    "followUp": "Could moving other furniture solve the problem without creating a new one?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could moving other furniture solve the problem without creating a new one?"
      },
      {
        "stage": "scenario",
        "question": "What useful idea could grow from changing the chair into a different gift?"
      },
      {
        "stage": "scenario",
        "question": "Should we explain the blocked door before suggesting an exchange?"
      },
      {
        "stage": "scenario",
        "question": "Someone loves the chair. What part of their idea can we keep?"
      },
      {
        "stage": "scenario",
        "question": "Would a photo of us trying the chair help the friend understand?"
      },
      {
        "stage": "scenario",
        "question": "Is keeping a gift we cannot use kinder than speaking honestly?"
      },
      {
        "stage": "scenario",
        "question": "What should we do if the friend asks where the chair went?"
      },
      {
        "stage": "scenario",
        "question": "Which room plan and message could everyone in our group accept?"
      }
    ],
    "sourceTopicId": "topic_v2_25",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-26",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "One Dinner, Unequal Orders",
    "keywords": "大家吃得不一樣的帳單 晚餐 帳單 公平 付錢 預算",
    "question": "Our dinner costs 600: small meals, large meals and one shared dessert. Should we split equally, pay separately or combine both rules?",
    "starter": "Meal sizes differ, but the dessert was shared. The group must agree on a simple way to divide this one dinner bill.",
    "followUp": "Would equal splitting still feel fair to the two small-meal eaters?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would equal splitting still feel fair to the two small-meal eaters?"
      },
      {
        "stage": "scenario",
        "question": "How could a mixed rule handle the shared dessert clearly?"
      },
      {
        "stage": "scenario",
        "question": "Can the separate-payment idea work without checking every small bite?"
      },
      {
        "stage": "scenario",
        "question": "One person offered everyone extra food. Should that change who pays?"
      },
      {
        "stage": "scenario",
        "question": "What should we do if someone cannot afford the rule most people choose?"
      },
      {
        "stage": "scenario",
        "question": "Would rounding small differences make the meal feel easier?"
      },
      {
        "stage": "scenario",
        "question": "Which bill rule should we agree on before our next dinner?"
      },
      {
        "stage": "scenario",
        "question": "How will we divide tonight’s meals and dessert without a long argument?"
      }
    ],
    "sourceTopicId": "topic_v2_26",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-27",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Our Group Chat Needs a Plan",
    "keywords": "群組不斷亮起 群組 聊天 訊息 通知 回覆",
    "question": "Our chat's jokes bury important plans. Should we add another chat, set quiet hours or mark planning messages to keep fun and plans?",
    "starter": "The same chat carries jokes and plans. The group needs a simple system that people will remember to use.",
    "followUp": "Would two chats help, or would people forget to check one?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would two chats help, or would people forget to check one?"
      },
      {
        "stage": "scenario",
        "question": "What clear sign could make a planning message easy to find?"
      },
      {
        "stage": "scenario",
        "question": "How could quiet hours fit the idea of friends in different time zones?"
      },
      {
        "stage": "scenario",
        "question": "Someone sends many photos every night. What request would feel reasonable?"
      },
      {
        "stage": "scenario",
        "question": "Should an urgent plan be allowed to break quiet hours?"
      },
      {
        "stage": "scenario",
        "question": "What should we do when someone misses a message under the new system?"
      },
      {
        "stage": "scenario",
        "question": "Could one daily planning summary improve the proposal we already have?"
      },
      {
        "stage": "scenario",
        "question": "Which chat rule will we try first, and when will we review it?"
      }
    ],
    "sourceTopicId": "topic_v2_27",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-28",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "One Group Photo, Different Limits",
    "keywords": "想留下但不想公開的照片 照片 隱私 分享 合照",
    "question": "Two people want our only holiday photo kept offline. Should we keep it private, crop it or take another photo together?",
    "starter": "The photo belongs to a shared memory. Two people have said they do not want this image posted publicly.",
    "followUp": "Would cropping solve the problem if people still felt left out?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would cropping solve the problem if people still felt left out?"
      },
      {
        "stage": "scenario",
        "question": "Could a new photo keep the funny detail everyone likes in this one?"
      },
      {
        "stage": "scenario",
        "question": "What would private sharing mean for our group in practice?"
      },
      {
        "stage": "scenario",
        "question": "Someone says the holiday photo is harmless. How could the group answer?"
      },
      {
        "stage": "scenario",
        "question": "Should people explain their reason before the group respects the limit?"
      },
      {
        "stage": "scenario",
        "question": "What can we change in the photo idea someone just offered?"
      },
      {
        "stage": "scenario",
        "question": "If the picture was already posted, what should happen first?"
      },
      {
        "stage": "scenario",
        "question": "What photo-sharing agreement can we use on future trips?"
      }
    ],
    "sourceTopicId": "topic_v2_28",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-29",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "The Helpful Booking We Never Asked For",
    "keywords": "善意先幫忙 幫忙 幫助 善意 界線",
    "question": "Our quiet gathering has a loud restaurant booked. Half want a picnic. What plan should we agree on before the booking becomes final?",
    "starter": "The friend meant to help, but made a choice before asking. The group still has time to change the place.",
    "followUp": "Is the restaurant problem mainly the noise or making a choice without checking?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Is the restaurant problem mainly the noise or making a choice without checking?"
      },
      {
        "stage": "scenario",
        "question": "Could a quieter table preserve something from the restaurant idea?"
      },
      {
        "stage": "scenario",
        "question": "What could make the picnic plan easier for the friend who booked?"
      },
      {
        "stage": "scenario",
        "question": "How should we thank the friend without pretending the plan already fits?"
      },
      {
        "stage": "scenario",
        "question": "Would splitting into two meals solve the issue or weaken the gathering?"
      },
      {
        "stage": "scenario",
        "question": "The restaurant offers free dessert. Should that change our decision?"
      },
      {
        "stage": "scenario",
        "question": "What small planning rule could prevent another surprise booking?"
      },
      {
        "stage": "scenario",
        "question": "Which place and explanation should our group choose now?"
      }
    ],
    "sourceTopicId": "topic_v2_29",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-30",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "We Said Yes Too Quickly",
    "keywords": "答應太快的邀約 邀約 邀請 拒絕 休息 取消",
    "question": "The event needs three helpers; our group needs rest. Should we shorten shifts, find replacements or send a smaller team?",
    "starter": "The promise affects both the group and the friend’s event. At least three helpers are still needed, but full-day work may be too much.",
    "followUp": "Could shorter shifts keep our promise without exhausting the helpers?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could shorter shifts keep our promise without exhausting the helpers?"
      },
      {
        "stage": "scenario",
        "question": "What would the smaller-team plan need from people staying home?"
      },
      {
        "stage": "scenario",
        "question": "How can we improve the replacement idea without giving strangers unclear jobs?"
      },
      {
        "stage": "scenario",
        "question": "Should tired people need to explain why they cannot work all day?"
      },
      {
        "stage": "scenario",
        "question": "What message would give the event friend enough time to adjust?"
      },
      {
        "stage": "scenario",
        "question": "One helper wants everyone to keep the original promise. What compromise can we offer?"
      },
      {
        "stage": "scenario",
        "question": "Which event job could we make simpler instead of finding more people?"
      },
      {
        "stage": "scenario",
        "question": "What help can we honestly promise by the end of this discussion?"
      }
    ],
    "sourceTopicId": "topic_v2_30",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-31",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Our Friend Made the Event Poster",
    "keywords": "說實話還是留面子 回饋 作品 誠實 朋友 批評",
    "question": "Our friend's poster has a date that is hard to read and a picture we disagree on. Printing starts tomorrow. What changes should we request together?",
    "starter": "The poster needs to work before tomorrow’s printing deadline. The friend’s effort matters, but guests must clearly understand the event.",
    "followUp": "Should we fix the date before discussing the picture?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Should we fix the date before discussing the picture?"
      },
      {
        "stage": "scenario",
        "question": "Which part of the current poster could support the new design idea?"
      },
      {
        "stage": "scenario",
        "question": "How can we explain the reading problem without calling the work bad?"
      },
      {
        "stage": "scenario",
        "question": "Someone dislikes everything about the poster. Which change is actually necessary?"
      },
      {
        "stage": "scenario",
        "question": "Would a quick test with another friend help us settle the disagreement?"
      },
      {
        "stage": "scenario",
        "question": "Should the artist choose the picture after we agree on its purpose?"
      },
      {
        "stage": "scenario",
        "question": "What can we finish ourselves if the friend has no more time?"
      },
      {
        "stage": "scenario",
        "question": "Which two changes and one positive comment should our group share?"
      }
    ],
    "sourceTopicId": "topic_v2_31",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-32",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Our Borrowed Tent Comes Back Torn",
    "keywords": "借出去之後 借東西 磨損 損壞 朋友 歸還",
    "question": "Our friends return our tent torn before our camping trip. Should we repair it, ask for a replacement or borrow another?",
    "starter": "The group needs a working tent soon. The damage and the borrowing agreement also need a calm conversation with the friends.",
    "followUp": "Can a quick repair keep the trip possible without hiding the damage issue?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Can a quick repair keep the trip possible without hiding the damage issue?"
      },
      {
        "stage": "scenario",
        "question": "What information do we need before asking for a full replacement?"
      },
      {
        "stage": "scenario",
        "question": "Could borrowing another tent improve the plan someone proposed?"
      },
      {
        "stage": "scenario",
        "question": "One friend says the tear was already there. How should we handle that disagreement?"
      },
      {
        "stage": "scenario",
        "question": "Would sharing the repair work feel fair if the damage was accidental?"
      },
      {
        "stage": "scenario",
        "question": "What should we say first when returning to the money question?"
      },
      {
        "stage": "scenario",
        "question": "Which lending rule could protect the tent without making friendship feel strict?"
      },
      {
        "stage": "scenario",
        "question": "What are our immediate camping plan and later repair agreement?"
      }
    ],
    "sourceTopicId": "topic_v2_32",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-33",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "An Assistant Plans for All of Us",
    "keywords": "太多方便替你決定 助理 推薦 方便 選擇 科技",
    "question": "Our assistant can choose dinner, music and a trip. With one rejection each, which choices should we give it or keep together?",
    "starter": "The assistant knows some preferences, but the group shares its choices. Each person has one rejection, so trust and limits matter.",
    "followUp": "Is choosing background music safer than choosing the whole day trip?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Is choosing background music safer than choosing the whole day trip?"
      },
      {
        "stage": "scenario",
        "question": "How could the dinner proposal include people whose tastes are less common?"
      },
      {
        "stage": "scenario",
        "question": "Would showing three options make the assistant more useful than making one decision?"
      },
      {
        "stage": "scenario",
        "question": "When should one person’s rejection stop a plan for everybody?"
      },
      {
        "stage": "scenario",
        "question": "The assistant repeats our usual choices. Is that helpful or too dull?"
      },
      {
        "stage": "scenario",
        "question": "What information should remain private even if it could improve the suggestions?"
      },
      {
        "stage": "scenario",
        "question": "Could we keep the assistant’s easy work but change its final choice?"
      },
      {
        "stage": "scenario",
        "question": "Which task and one decision limit will we give the assistant?"
      }
    ],
    "sourceTopicId": "topic_v2_33",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-34",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Planning Cannot Belong to One Friend",
    "keywords": "大家都習慣你負責 安排 規劃 活動 責任 分工",
    "question": "Our usual organizer is tired. Should we rotate organizers, split jobs or plan a simpler gathering so nobody does everything?",
    "starter": "The group wants another gathering, but one person cannot keep doing all the planning. The next event needs a fairer workload.",
    "followUp": "Would rotating organizers also share the small jobs people often forget?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would rotating organizers also share the small jobs people often forget?"
      },
      {
        "stage": "scenario",
        "question": "Which planning job could be separated without causing confusion?"
      },
      {
        "stage": "scenario",
        "question": "Can the simpler-event idea keep the part people enjoyed most?"
      },
      {
        "stage": "scenario",
        "question": "Someone offers help but wants no deadlines. What job could still fit?"
      },
      {
        "stage": "scenario",
        "question": "How should the experienced organizer share advice without taking control again?"
      },
      {
        "stage": "scenario",
        "question": "What can we drop if nobody volunteers for an important task?"
      },
      {
        "stage": "scenario",
        "question": "Would a shared checklist improve the plan we are building?"
      },
      {
        "stage": "scenario",
        "question": "Who will do each job for the next event, and which job can we remove?"
      }
    ],
    "sourceTopicId": "topic_v2_34",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-35",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Should Our Hobby Club Sell Cakes?",
    "keywords": "一直待著的興趣 興趣 工作 賺錢 壓力",
    "question": "Our cake club can sell fifty cakes, but we meet for fun. Should we accept, offer fewer cakes or keep our hobby private?",
    "starter": "The club can earn money, but the order is much larger than its usual hobby activity. The group must decide what effort it wants.",
    "followUp": "Would a smaller cake order keep more of the fun?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would a smaller cake order keep more of the fun?"
      },
      {
        "stage": "scenario",
        "question": "What extra work would selling cakes add beyond baking?"
      },
      {
        "stage": "scenario",
        "question": "How could the club use the money without creating another argument?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to grow the business. Which part of that idea could the club test safely?"
      },
      {
        "stage": "scenario",
        "question": "Should members who skip the order still join the next fun meeting?"
      },
      {
        "stage": "scenario",
        "question": "What cake choices would keep the event order simple?"
      },
      {
        "stage": "scenario",
        "question": "If baking becomes stressful, what promise would let us stop?"
      },
      {
        "stage": "scenario",
        "question": "What answer and maximum order size should we send to the event?"
      }
    ],
    "sourceTopicId": "topic_v2_35",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-36",
    "category": "everyday-choices",
    "emoji": "🤔",
    "title": "Our Best Plan No Longer Fits",
    "keywords": "改變主意也有面子 改變 主意 朋友 看法 意見",
    "question": "Our mountain path closes, and switching to the beach costs extra. Should we pay, stay indoors near the mountain or postpone together?",
    "starter": "New information has changed the original plan. The group must compare the fee, the remaining options, and the value of going now.",
    "followUp": "Is keeping the mountain booking useful, or are we only protecting our earlier choice?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Is keeping the mountain booking useful, or are we only protecting our earlier choice?"
      },
      {
        "stage": "scenario",
        "question": "Could an indoor mountain plan include the activity someone suggested?"
      },
      {
        "stage": "scenario",
        "question": "What beach detail would make the change fee feel worthwhile?"
      },
      {
        "stage": "scenario",
        "question": "One person says postponing wastes everyone’s free day. How could we address that?"
      },
      {
        "stage": "scenario",
        "question": "What should we say to a friend whose original beach idea was rejected?"
      },
      {
        "stage": "scenario",
        "question": "Would changing our minds together make future planning easier?"
      },
      {
        "stage": "scenario",
        "question": "Which part of the first plan is still worth keeping?"
      },
      {
        "stage": "scenario",
        "question": "What new plan and explanation can we agree on before the booking closes?"
      }
    ],
    "sourceTopicId": "topic_v2_36",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-37",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "One Old Object Gets a Second Life",
    "keywords": "替舊物說話 舊物 回憶 丟掉 收藏",
    "question": "Our crowded room can keep one object: a toy robot, broken lamp or box of travel maps. Which deserves space, and how could we reuse it?",
    "starter": "Space is limited, so keeping an object needs a clear reason. The group can repair it, display it, or turn it into something useful.",
    "followUp": "Could the broken lamp be worth keeping without working as a lamp?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could the broken lamp be worth keeping without working as a lamp?"
      },
      {
        "stage": "scenario",
        "question": "What group project could grow from the old travel maps?"
      },
      {
        "stage": "scenario",
        "question": "How can the robot idea use less room than the original object?"
      },
      {
        "stage": "scenario",
        "question": "Someone thinks all three are rubbish. What shared value could change their view?"
      },
      {
        "stage": "scenario",
        "question": "Should a memory matter as much as a useful new purpose?"
      },
      {
        "stage": "scenario",
        "question": "What material could we borrow to improve the proposed repair?"
      },
      {
        "stage": "scenario",
        "question": "If our new use fails after a week, should the object stay?"
      },
      {
        "stage": "scenario",
        "question": "Which old object and exact new job will get the one free shelf?"
      }
    ],
    "sourceTopicId": "topic_v2_37",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-38",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "The Party Chairs Are Tiny",
    "keywords": "被朋友講了好多次的小包 錯誤 糗事 玩笑 朋友",
    "question": "We bought twenty tiny party chairs by mistake, with no refunds. Should we borrow chairs, hold a picnic or create a funny theme together?",
    "starter": "The wrong chairs cannot be returned. The group still wants a comfortable party and must make a practical change before guests arrive.",
    "followUp": "Could the tiny chairs become decorations instead of seats?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could the tiny chairs become decorations instead of seats?"
      },
      {
        "stage": "scenario",
        "question": "What would the picnic idea need if the weather changes?"
      },
      {
        "stage": "scenario",
        "question": "How could we combine borrowed chairs with the funny theme?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to hide the mistake. Would sharing it make the party better?"
      },
      {
        "stage": "scenario",
        "question": "What is the easiest way to ask neighbors for enough normal chairs?"
      },
      {
        "stage": "scenario",
        "question": "Could children use the tiny chairs while adults use another setup?"
      },
      {
        "stage": "scenario",
        "question": "Which joke about the chairs would remain friendly to the person who ordered them?"
      },
      {
        "stage": "scenario",
        "question": "What seating plan and party message will we use?"
      }
    ],
    "sourceTopicId": "topic_v2_38",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-39",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "The Serious Neighbor in a Carrot Suit",
    "keywords": "看錯一個人 印象 初次 朋友 誤會",
    "question": "Our new neighbor wears a carrot suit. We need a host, costume judge and quiet helper. How should we welcome them and share jobs?",
    "starter": "The neighbor’s costume surprises the group. Event jobs need to match what people agree to do, rather than the group’s first impression.",
    "followUp": "What could we ask about the carrot suit without making the neighbor feel examined?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "What could we ask about the carrot suit without making the neighbor feel examined?"
      },
      {
        "stage": "scenario",
        "question": "Does being funny in a costume mean someone wants to host?"
      },
      {
        "stage": "scenario",
        "question": "How could the quiet-helper suggestion include a playful detail?"
      },
      {
        "stage": "scenario",
        "question": "Someone already offered the neighbor the judge’s job. Should we check the choice again?"
      },
      {
        "stage": "scenario",
        "question": "What job could two people share if the neighbor feels unsure?"
      },
      {
        "stage": "scenario",
        "question": "Could the costume become part of the welcome rather than a whole role?"
      },
      {
        "stage": "scenario",
        "question": "What would make us rethink a quick judgment during this meeting?"
      },
      {
        "stage": "scenario",
        "question": "How will we offer all three jobs while letting the neighbor choose freely?"
      }
    ],
    "sourceTopicId": "topic_v2_39",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-40",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "Our House Has Three Strange Habits",
    "keywords": "自己的奇怪小堅持 習慣 奇怪 小堅持 朋友",
    "question": "Our holiday home requires greeting the clock, backward slippers and whispering near the fridge. Which rule should we remove and which two keep?",
    "starter": "The house has three unusual habits. One may be removed, but the group must keep the other two during the stay.",
    "followUp": "Which house rule causes the biggest practical problem rather than just feeling strange?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which house rule causes the biggest practical problem rather than just feeling strange?"
      },
      {
        "stage": "scenario",
        "question": "Could greeting the clock become a short group joke?"
      },
      {
        "stage": "scenario",
        "question": "How might the slipper idea change if someone finds it hard to walk?"
      },
      {
        "stage": "scenario",
        "question": "Would whispering near the fridge make midnight cooking easier or harder?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to break every rule. What agreement could keep the group out of trouble?"
      },
      {
        "stage": "scenario",
        "question": "Can we add a clear exception without secretly removing a second rule?"
      },
      {
        "stage": "scenario",
        "question": "What sign could help visitors follow the rules without a long explanation?"
      },
      {
        "stage": "scenario",
        "question": "Which habit are we removing, and what are our two remaining house rules?"
      }
    ],
    "sourceTopicId": "topic_v2_40",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-41",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "Our Machine Makes Only Heart Noodles",
    "keywords": "買下來才知道 購物 預期 花錢 實用",
    "question": "We cannot return our machine that makes only heart-shaped noodles. Should we hold noodle nights, sell it or find another use together?",
    "starter": "The machine has one surprising use. The group cannot return it, but can decide how to use it or whether to pass it on.",
    "followUp": "Would a regular noodle night stay fun after the first week?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would a regular noodle night stay fun after the first week?"
      },
      {
        "stage": "scenario",
        "question": "What could make the selling idea honest and appealing?"
      },
      {
        "stage": "scenario",
        "question": "Can the new-use suggestion still work with only heart-shaped noodles?"
      },
      {
        "stage": "scenario",
        "question": "Someone dislikes noodles. How could a kitchen plan include them?"
      },
      {
        "stage": "scenario",
        "question": "Should saving space matter more than recovering the cost?"
      },
      {
        "stage": "scenario",
        "question": "What could we try once before making our final choice?"
      },
      {
        "stage": "scenario",
        "question": "If the machine becomes popular, who should handle its cleaning?"
      },
      {
        "stage": "scenario",
        "question": "What experiment and final decision date will we agree on?"
      }
    ],
    "sourceTopicId": "topic_v2_41",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-42",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "Our Host Fell Asleep Before the Party",
    "keywords": "小小的體貼 體貼 關心 照顧 善意",
    "question": "Our party host falls asleep before it starts. Should we clean, save dinner or move games outside so they wake to something kind?",
    "starter": "The host has already done a lot of work. The group can enjoy the gathering while reducing noise and leaving less work for later.",
    "followUp": "Would moving outside help more than finishing the cleaning first?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would moving outside help more than finishing the cleaning first?"
      },
      {
        "stage": "scenario",
        "question": "How could we save dinner without turning the kitchen into another mess?"
      },
      {
        "stage": "scenario",
        "question": "Can the quiet-game idea keep guests together indoors?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to wake the host for a photo. Should we ask them to wait?"
      },
      {
        "stage": "scenario",
        "question": "What small sign could explain where everyone went without disturbing sleep?"
      },
      {
        "stage": "scenario",
        "question": "Which helpful action might accidentally create more work for the host?"
      },
      {
        "stage": "scenario",
        "question": "Could we divide the clean-up plan into jobs that finish quickly?"
      },
      {
        "stage": "scenario",
        "question": "What will our friend find when they wake up?"
      }
    ],
    "sourceTopicId": "topic_v2_42",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-43",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "The Trip Went to the Wrong Beach",
    "keywords": "計畫失敗後的好事 計畫 失敗 驚喜 回憶",
    "question": "Our wrong bus reaches a beach. With food, a ball and two hours, should we stay, find the festival or create our own event?",
    "starter": "The original festival plan has gone wrong. The group has a safe place, simple supplies, and a fixed return time.",
    "followUp": "Could staying at the beach save more time than searching for the festival?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could staying at the beach save more time than searching for the festival?"
      },
      {
        "stage": "scenario",
        "question": "What small event could grow from the ball-game idea?"
      },
      {
        "stage": "scenario",
        "question": "How can the food plan include something people could do together?"
      },
      {
        "stage": "scenario",
        "question": "Someone really wanted the festival. What part of it could we recreate here?"
      },
      {
        "stage": "scenario",
        "question": "Would a quiet hour be a good result even without a big activity?"
      },
      {
        "stage": "scenario",
        "question": "What must we check before walking away from the bus stop?"
      },
      {
        "stage": "scenario",
        "question": "If new visitors join our beach game, should we change the plan?"
      },
      {
        "stage": "scenario",
        "question": "Which two-hour beach plan will keep the whole group willing to stay?"
      }
    ],
    "sourceTopicId": "topic_v2_43",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-44",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "Our Small-Skills Team Challenge",
    "keywords": "小本事也有用 技能 小本事 學習 日常",
    "question": "Our team can use two skills: folding shirts, opening packages or making animal sounds. What single act could connect them?",
    "starter": "The team has three ordinary skills and room for two in the final act. The performance needs one idea that connects the chosen skills.",
    "followUp": "Could animal sounds turn shirt-folding into a funny story?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could animal sounds turn shirt-folding into a funny story?"
      },
      {
        "stage": "scenario",
        "question": "What would opening packages add beyond showing that the task is possible?"
      },
      {
        "stage": "scenario",
        "question": "How can the folding suggestion include someone with a different skill?"
      },
      {
        "stage": "scenario",
        "question": "Two people want the same part. Could we divide that part into two jobs?"
      },
      {
        "stage": "scenario",
        "question": "What would make the act clear to an audience seeing it once?"
      },
      {
        "stage": "scenario",
        "question": "A package refuses to open. How could the team use that failure?"
      },
      {
        "stage": "scenario",
        "question": "Which skill should we leave out even if it is the strongest by itself?"
      },
      {
        "stage": "scenario",
        "question": "What two skills, simple story, and ending will our team use?"
      }
    ],
    "sourceTopicId": "topic_v2_44",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-45",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "A Better Ordinary Day for Our Street",
    "keywords": "普通日子的快樂配方 快樂 生活 日常 美好",
    "question": "Our street needs cheering up. Should we organize free lunchtime music, kind notes or a sunset walk that different neighbors can enjoy?",
    "starter": "The activity costs no money and lasts only today. It should improve an ordinary day without requiring every neighbor to join.",
    "followUp": "Would lunch music cheer people up or disturb people who need rest?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Would lunch music cheer people up or disturb people who need rest?"
      },
      {
        "stage": "scenario",
        "question": "How could the kind-note table avoid messages nobody understands?"
      },
      {
        "stage": "scenario",
        "question": "Can the sunset-walk idea include neighbors who cannot walk far?"
      },
      {
        "stage": "scenario",
        "question": "What detail could make the suggested activity feel welcoming rather than organized?"
      },
      {
        "stage": "scenario",
        "question": "Someone calls the plan childish. How would we explain its value?"
      },
      {
        "stage": "scenario",
        "question": "Should the activity be brief, or can people stay as long as they want?"
      },
      {
        "stage": "scenario",
        "question": "What can we change if only a few neighbors join?"
      },
      {
        "stage": "scenario",
        "question": "Which activity, place, and simple invitation are we choosing for today?"
      }
    ],
    "sourceTopicId": "topic_v2_45",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-46",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "We Accidentally Booked a Bird Day",
    "keywords": "意外走進一個新世界 興趣 意外 新世界 嘗試",
    "question": "Our picnic tickets are actually for bird-watching and cannot change. Only half the group is interested. How can we enjoy it together?",
    "starter": "The tickets are fixed, but the group’s interests differ. Bird-watching can be part of the day without becoming everyone’s only activity.",
    "followUp": "Could a short bird search work better than watching quietly all day?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could a short bird search work better than watching quietly all day?"
      },
      {
        "stage": "scenario",
        "question": "What could the picnic idea add without interrupting the bird activity?"
      },
      {
        "stage": "scenario",
        "question": "Can we build a group challenge around colors or sounds instead of bird names?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to leave immediately. What short trial could we agree on?"
      },
      {
        "stage": "scenario",
        "question": "Which part of the day could people enjoy even without seeing a bird?"
      },
      {
        "stage": "scenario",
        "question": "Would splitting up briefly make the shared day easier?"
      },
      {
        "stage": "scenario",
        "question": "What should we do if one person becomes very excited about the new hobby?"
      },
      {
        "stage": "scenario",
        "question": "What bird activity and non-bird activity will our day include?"
      }
    ],
    "sourceTopicId": "topic_v2_46",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-47",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "Our Great Party Has Hidden Work",
    "keywords": "沒被看見的努力 努力 隱形 工作 日常",
    "question": "Our party leaves dirty plates, full bins and tired helpers. Which jobs should we share next week, and which extra task can go?",
    "starter": "Some party work is easy to notice; some is not. The next event needs fewer tiring extras and a clear division of necessary jobs.",
    "followUp": "Which hidden job would cause the biggest problem if nobody did it?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Which hidden job would cause the biggest problem if nobody did it?"
      },
      {
        "stage": "scenario",
        "question": "Could the decoration idea be simpler without losing the party’s best feature?"
      },
      {
        "stage": "scenario",
        "question": "How can we add clean-up time to the plan someone proposed?"
      },
      {
        "stage": "scenario",
        "question": "Should the loudest volunteer also choose everybody else’s jobs?"
      },
      {
        "stage": "scenario",
        "question": "What would show helpers that their effort has been noticed?"
      },
      {
        "stage": "scenario",
        "question": "Someone says guests should never help. What small guest task might still be reasonable?"
      },
      {
        "stage": "scenario",
        "question": "If one helper drops out, which extra should we cancel first?"
      },
      {
        "stage": "scenario",
        "question": "What shorter job list and shared clean-up plan will next week’s party use?"
      }
    ],
    "sourceTopicId": "topic_v2_47",
    "source": "chatwolf-adapted"
  },
  {
    "id": "chat-scene-48",
    "category": "personal-experiences",
    "emoji": "🌻",
    "title": "A Playful Day for Our Adult Club",
    "keywords": "長大也不想放掉的喜歡 喜好 興趣 長大 童年",
    "question": "Which two should our adult club choose: cartoons, toy boats or kite-making? How can we welcome all ages despite neighbors calling these childish?",
    "starter": "The club wants simple fun rather than a serious event. Two activities must fit the space and include people of different ages.",
    "followUp": "Could kite-making include both careful builders and people who mainly want to play?",
    "followUps": [
      {
        "stage": "scenario",
        "question": "Could kite-making include both careful builders and people who mainly want to play?"
      },
      {
        "stage": "scenario",
        "question": "What place would make toy boats easy for everyone to watch?"
      },
      {
        "stage": "scenario",
        "question": "How can the cartoon idea connect with another group activity?"
      },
      {
        "stage": "scenario",
        "question": "Someone wants to rename everything to sound more adult. Would that help?"
      },
      {
        "stage": "scenario",
        "question": "Which activity needs the least skill before joining?"
      },
      {
        "stage": "scenario",
        "question": "Could a neighbor who dislikes toys still have a useful, enjoyable part?"
      },
      {
        "stage": "scenario",
        "question": "If the weather stops the kites, what indoor version could we build?"
      },
      {
        "stage": "scenario",
        "question": "Which two activities and invitation line will our club finally choose?"
      }
    ],
    "sourceTopicId": "topic_v2_48",
    "source": "chatwolf-adapted"
  }
];
const TALK_TOPICS = [...TALK_ORIGINAL_TOPICS, ...TALK_SCENARIO_TOPICS];
const TALK_LIBRARY = (() => {
  function search(category = '', query = '') {
    const words = String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return TALK_TOPICS.filter(topic => {
      const group = TALK_CATEGORIES.find(c => c.id === topic.category);
      const text = [topic.title, topic.keywords, topic.question, topic.starter, ...topic.followUps.map(q => q.question), group.zh, group.en].join(' ').toLocaleLowerCase();
      return (!category || category === topic.category) && words.every(word => text.includes(word));
    });
  }
  function draw(category = '', query = '', exclude = [], random = Math.random) {
    const matches = search(category, query);
    const fresh = matches.filter(topic => !exclude.includes(topic.id));
    const pool = fresh.length ? fresh : matches;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
  }
  function custom({title = '', question = '', starter = '', followUps = ''}) {
    question = String(question).trim(); title = String(title).trim(); starter = String(starter).trim();
    const questions = String(followUps).split(/\r?\n/).map(q => q.trim()).filter(Boolean);
    if (!question || question.length > 500 || title.length > 80 || starter.length > 600 || questions.length > 8 || questions.some(q => q.length > 300)) throw new Error('invalid_topic');
    return {id:'custom',emoji:'✏️',title,question,starter,followUp:questions[0] || '',
      followUps:questions.map(question => ({stage:'custom',question}))};
  }
  return {search, draw, custom};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = {TALK_TOPICS, TALK_CATEGORIES, TALK_LIBRARY};
