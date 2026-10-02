/* Authored content, 2026-10-02. Actual release gaps are shown by the content report.
 * Legacy cards remain immutable. Appendix examples are not a complete release pool.
 */
(function (root, factory) {
 if (typeof module === 'object' && module.exports) {
   module.exports = factory(require('./chat-wolf-v3-content.js'),
     [require('./chat-wolf-v4-wolf-tasks.js'), require('./chat-wolf-v4-wolf-imagine.js'), require('./chat-wolf-v4-wolf-life.js'),
      require('./chat-wolf-v4-expansion-a.js'), require('./chat-wolf-v4-expansion-b.js'), require('./chat-wolf-v4-expansion-c.js')],
     require('./chat-wolf-v4-village.js'),require('./chat-wolf-v4-taxonomy.js'),
     [require('./chat-wolf-v5-readable-a.js'),require('./chat-wolf-v5-readable-b.js'),require('./chat-wolf-v5-readable-c.js'),require('./chat-wolf-v5-readable-core.js')],
     require('./chat-wolf-v6-village.js'),require('./chat-wolf-v6-directions.js'),require('./chat-wolf-v6-soft-tells.js'));
 } else root.CHAT_WOLF_V4_CONTENT = factory(root.CHAT_WOLF_V3_CONTENT,
   [root.CHAT_WOLF_V4_WOLF_TASKS, root.CHAT_WOLF_V4_WOLF_IMAGINE, root.CHAT_WOLF_V4_WOLF_LIFE,
    root.CHAT_WOLF_V4_EXPANSION_A, root.CHAT_WOLF_V4_EXPANSION_B, root.CHAT_WOLF_V4_EXPANSION_C],
   root.CHAT_WOLF_V4_VILLAGE,root.CHAT_WOLF_V4_TAXONOMY,
   [root.CHAT_WOLF_V5_READABLE_A,root.CHAT_WOLF_V5_READABLE_B,root.CHAT_WOLF_V5_READABLE_C,root.CHAT_WOLF_V5_READABLE_CORE],
   root.CHAT_WOLF_V6_VILLAGE,root.CHAT_WOLF_V6_DIRECTIONS,root.CHAT_WOLF_V6_SOFT_TELLS);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (legacy, supplements, village, taxonomy, readable, revisedVillage, directions, softTells) {
 'use strict';
 const topics = [
  {
    "id": "topic_v2_01",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "One Trip, Different Holidays",
    "shortTitle": "One Trip, Different Holidays",
    "titleZh": "同團不同步",
    "shortTitleZh": "同團不同步",
    "mainQuestion": "We are taking a three-day trip together, and everyone wants their own kind of relaxing holiday. What do you think this trip would be like?",
    "mainQuestionZh": "我們這群人要一起旅行三天，每個人都想照自己最舒服的方式度假。你覺得這趟旅行會變成什麼樣子？",
    "entryPrompts": [
      "Your travel pace",
      "A past travel companion",
      "A possible compromise"
    ],
    "entryPromptsZh": [
      "自己的旅行步調",
      "過去的旅伴經驗",
      "可能接受的折衷"
    ],
    "followUps": [
      {
        "id": "topic_v2_01_f1",
        "text": "What is most worth doing separately during a group trip?",
        "textZh": "旅途中什麼事最值得大家分開行動？"
      },
      {
        "id": "topic_v2_01_f2",
        "text": "How would you continue the day if someone kept arriving late?",
        "textZh": "有人總是遲到時，你會怎麼繼續當天的行程？"
      },
      {
        "id": "topic_v2_01_f3",
        "text": "Which plan would you give up for a travel companion?",
        "textZh": "你會為了同伴放棄哪一種安排？"
      },
      {
        "id": "topic_v2_01_f4",
        "text": "What would you least want to save money on during a trip?",
        "textZh": "一趟旅行裡，什麼錢你最不想省？"
      },
      {
        "id": "topic_v2_01_f5",
        "text": "Have you had a travel companion who was surprisingly easy to get along with?",
        "textZh": "你遇過什麼意外好相處的旅伴？"
      },
      {
        "id": "topic_v2_01_f6",
        "text": "What are your habits around taking travel photos?",
        "textZh": "你對旅行拍照有什麼習慣？"
      },
      {
        "id": "topic_v2_01_f7",
        "text": "What would make you want to return to the hotel early?",
        "textZh": "什麼情況會讓你想先回飯店？"
      },
      {
        "id": "topic_v2_01_f8",
        "text": "Which moments do you usually most want to remember after getting home?",
        "textZh": "回家後，你最想記住的通常是哪種片段？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Your travel pace",
        "A past travel companion",
        "A possible compromise"
      ],
      "ordinaryShortAnswer": "I would want a slow breakfast.",
      "naturalContinuations": [
        "I like that, but I get hungry early.",
        "Would you mind if I went out first?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_02",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "A Month Under One Roof",
    "shortTitle": "A Month Under One Roof",
    "titleZh": "同住一個月",
    "shortTitleZh": "同住一個月",
    "mainQuestion": "We have to share a home for a month, and everyone wants to keep their usual habits. What do you think our home would be like?",
    "mainQuestionZh": "我們得一起住一個月，每個人都想照自己原本的生活習慣過日子。你覺得這個家會變成什麼樣子？",
    "entryPrompts": [
      "A home habit",
      "A shared-space experience",
      "An imagined housemate"
    ],
    "entryPromptsZh": [
      "自己的生活習慣",
      "共用空間經驗",
      "想像的室友情境"
    ],
    "followUps": [
      {
        "id": "topic_v2_02_f1",
        "text": "What are your limits around sharing food in the fridge?",
        "textZh": "你對冰箱裡的食物有什麼界線？"
      },
      {
        "id": "topic_v2_02_f2",
        "text": "Which household sounds distract you most?",
        "textZh": "什麼生活聲音最容易讓你分心？"
      },
      {
        "id": "topic_v2_02_f3",
        "text": "What small habit would you most want a housemate to know about?",
        "textZh": "你最希望室友知道哪個小習慣？"
      },
      {
        "id": "topic_v2_02_f4",
        "text": "How many personal things in a shared space feel comfortable to you?",
        "textZh": "公共空間留多少私人物品，你會覺得舒服？"
      },
      {
        "id": "topic_v2_02_f5",
        "text": "Have you had a surprisingly thoughtful experience sharing a home?",
        "textZh": "你遇過什麼意外貼心的同住經驗？"
      },
      {
        "id": "topic_v2_02_f6",
        "text": "How would you live together with different sleeping and waking times?",
        "textZh": "大家作息不同時，你會怎麼相處？"
      },
      {
        "id": "topic_v2_02_f7",
        "text": "What would matter to you if a friend stayed without much notice?",
        "textZh": "朋友臨時來住，你會在意什麼？"
      },
      {
        "id": "topic_v2_02_f8",
        "text": "After a month, what might make you not want to move out?",
        "textZh": "住完一個月，什麼事情可能讓你捨不得搬走？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A home habit",
        "A shared-space experience",
        "An imagined housemate"
      ],
      "ordinaryShortAnswer": "I would need quiet after midnight.",
      "naturalContinuations": [
        "I usually cook late, so that might be tricky.",
        "Would kitchen sounds bother you too?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_03",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "Four Hours in One Car",
    "shortTitle": "Four Hours in One Car",
    "titleZh": "同車的音樂",
    "shortTitleZh": "同車的音樂",
    "mainQuestion": "We are sharing a four-hour car ride, but we have different tastes in music and different needs for quiet. How would you spend the ride with us?",
    "mainQuestionZh": "我們要坐同一台車走四小時，每個人喜歡的音樂和安靜程度都不同。這段路你會怎麼跟大家一起度過？",
    "entryPrompts": [
      "Music preferences",
      "A journey you remember",
      "Your need for quiet"
    ],
    "entryPromptsZh": [
      "音樂偏好",
      "印象中的車程",
      "對安靜的需求"
    ],
    "followUps": [
      {
        "id": "topic_v2_03_f1",
        "text": "What kind of song makes you want to join in?",
        "textZh": "什麼歌會讓你忍不住加入？"
      },
      {
        "id": "topic_v2_03_f2",
        "text": "When would you want the whole car to be quiet for a while?",
        "textZh": "什麼時候你會希望整台車安靜一下？"
      },
      {
        "id": "topic_v2_03_f3",
        "text": "What do you least want a travel companion to do in the car?",
        "textZh": "你最怕旅伴在車上做什麼？"
      },
      {
        "id": "topic_v2_03_f4",
        "text": "Do you like making unplanned stops on a journey?",
        "textZh": "你喜歡行程中途臨時停靠嗎？"
      },
      {
        "id": "topic_v2_03_f5",
        "text": "What do you do in a car that other people do not understand?",
        "textZh": "坐車時有什麼習慣是別人不理解的？"
      },
      {
        "id": "topic_v2_03_f6",
        "text": "What helps the mood when everyone is tired?",
        "textZh": "大家都很累時，什麼最能讓氣氛變好？"
      },
      {
        "id": "topic_v2_03_f7",
        "text": "What unexpected conversation have you had on a journey?",
        "textZh": "你曾在路上聊出什麼意外話題？"
      },
      {
        "id": "topic_v2_03_f8",
        "text": "How would you introduce a song the others might not know?",
        "textZh": "你會如何介紹一首大家可能不熟的歌？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Music preferences",
        "A journey you remember",
        "Your need for quiet"
      ],
      "ordinaryShortAnswer": "I would listen to music for part of the ride.",
      "naturalContinuations": [
        "I prefer quiet when I feel sleepy.",
        "What kind of music would you bring?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_04",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "A Weekend With No Plans",
    "shortTitle": "A Weekend With No Plans",
    "titleZh": "朋友的週末小屋",
    "shortTitleZh": "朋友的週末小屋",
    "mainQuestion": "A friend has lent us a comfortable cabin for the weekend, with no sightseeing or planned activities. How would you really relax with this group?",
    "mainQuestionZh": "朋友把一間舒服的小屋借給我們過週末，這次沒有景點也沒有必做活動。你會怎麼讓自己在這群人之中真正放鬆？",
    "entryPrompts": [
      "Your way to rest",
      "An unplanned weekend",
      "Time alone and together"
    ],
    "entryPromptsZh": [
      "自己的休息方式",
      "沒有計畫的週末經驗",
      "獨處與相處的比例"
    ],
    "followUps": [
      {
        "id": "topic_v2_04_f1",
        "text": "What can easily turn resting into another kind of work?",
        "textZh": "什麼事最容易把休息變成另一種工作？"
      },
      {
        "id": "topic_v2_04_f2",
        "text": "How much time alone do you need to feel comfortable?",
        "textZh": "你需要多少獨處時間才會舒服？"
      },
      {
        "id": "topic_v2_04_f3",
        "text": "What unnecessary but enjoyable thing would you most want to bring?",
        "textZh": "你最想帶什麼不必要但開心的東西？"
      },
      {
        "id": "topic_v2_04_f4",
        "text": "What do you usually do when nobody makes a plan?",
        "textZh": "沒有人主動安排時，你通常會怎麼做？"
      },
      {
        "id": "topic_v2_04_f5",
        "text": "Does quietly doing nothing together count as spending time together?",
        "textZh": "你覺得一起發呆算不算相處？"
      },
      {
        "id": "topic_v2_04_f6",
        "text": "How can people relax together when they have different energy levels?",
        "textZh": "大家的精神好壞不同時，怎麼待在一起最自在？"
      },
      {
        "id": "topic_v2_04_f7",
        "text": "Have you had a good holiday because there was no plan?",
        "textZh": "你有過什麼沒有計畫反而很好的假日？"
      },
      {
        "id": "topic_v2_04_f8",
        "text": "What pressure would you most want to leave out of this weekend?",
        "textZh": "你最希望這個週末少掉哪種壓力？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Your way to rest",
        "An unplanned weekend",
        "Time alone and together"
      ],
      "ordinaryShortAnswer": "I would bring a book and sit outside.",
      "naturalContinuations": [
        "I might join you without talking much.",
        "Would bad weather change your plan?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_05",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "A Shared Work Table",
    "shortTitle": "A Shared Work Table",
    "titleZh": "大家的共享工作桌",
    "shortTitleZh": "大家的共享工作桌",
    "mainQuestion": "We spend our days working on our own things in one shared space. Some need quiet; others think by talking. How would you feel comfortable without getting in anyone’s way?",
    "mainQuestionZh": "我們每天都在同一個空間做自己的事，有人需要安靜、有人靠聊天找靈感。你會怎麼在這裡待得舒服又不妨礙別人？",
    "entryPrompts": [
      "Concentration habits",
      "Working near others",
      "A gentle boundary"
    ],
    "entryPromptsZh": [
      "專注習慣",
      "和別人一起做事的經驗",
      "舒服的界線"
    ],
    "followUps": [
      {
        "id": "topic_v2_05_f1",
        "text": "Which small sounds interrupt your concentration?",
        "textZh": "什麼小聲音最容易打斷你？"
      },
      {
        "id": "topic_v2_05_f2",
        "text": "When do you actually welcome a chat?",
        "textZh": "你什麼時候其實歡迎別人來聊天？"
      },
      {
        "id": "topic_v2_05_f3",
        "text": "How does it feel different when someone watches you work?",
        "textZh": "別人看著你做事，感覺會有什麼不同？"
      },
      {
        "id": "topic_v2_05_f4",
        "text": "What would you most want on your desk?",
        "textZh": "你最想在桌上放什麼？"
      },
      {
        "id": "topic_v2_05_f5",
        "text": "What can you keep doing only when someone is there with you?",
        "textZh": "你需要別人陪著才做得下去的事情是什麼？"
      },
      {
        "id": "topic_v2_05_f6",
        "text": "How would you let someone know you cannot talk right now?",
        "textZh": "你會怎麼提醒別人自己現在不方便？"
      },
      {
        "id": "topic_v2_05_f7",
        "text": "Where is the line between working and resting for you?",
        "textZh": "工作和休息的界線對你是什麼？"
      },
      {
        "id": "topic_v2_05_f8",
        "text": "What comfortable way of working alongside others have you experienced?",
        "textZh": "你遇過什麼很舒服的共同做事方式？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Concentration habits",
        "Working near others",
        "A gentle boundary"
      ],
      "ordinaryShortAnswer": "I need quiet when I read.",
      "naturalContinuations": [
        "I find quiet company helpful too.",
        "How would you tell us when you need a break?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_06",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "A Gathering Without Signal",
    "shortTitle": "A Gathering Without Signal",
    "titleZh": "沒有訊號的聚會",
    "shortTitleZh": "沒有訊號的聚會",
    "mainQuestion": "There is no internet signal at our gathering. Our phones still work, but we cannot keep looking for new content. What would happen to the way we spend time together?",
    "mainQuestionZh": "我們這次聚會的地方剛好沒有網路訊號，手機還能用，但不能一直找新內容。你覺得這群人的相處會變成什麼樣子？",
    "entryPrompts": [
      "Phone habits",
      "Offline memories",
      "An imagined quiet moment"
    ],
    "entryPromptsZh": [
      "手機習慣",
      "沒有網路的回憶",
      "想像安靜下來的時刻"
    ],
    "followUps": [
      {
        "id": "topic_v2_06_f1",
        "text": "What would you first want to look up but be unable to find?",
        "textZh": "你最先想查卻查不到的會是什麼？"
      },
      {
        "id": "topic_v2_06_f2",
        "text": "What old things on your phone would be worth sharing?",
        "textZh": "手機裡什麼舊內容值得拿出來分享？"
      },
      {
        "id": "topic_v2_06_f3",
        "text": "Would you feel comfortable if everyone became quiet?",
        "textZh": "大家安靜下來時，你會覺得自在嗎？"
      },
      {
        "id": "topic_v2_06_f4",
        "text": "What activities do you remember enjoying without the internet?",
        "textZh": "你記得哪些以前不用網路也能玩的事？"
      },
      {
        "id": "topic_v2_06_f5",
        "text": "Does looking up an answer make a conversation more interesting or interrupt it?",
        "textZh": "聊天時查答案會增加還是中斷你的興致？"
      },
      {
        "id": "topic_v2_06_f6",
        "text": "Which notifications would you most willingly leave behind for a while?",
        "textZh": "你最願意暫時放下哪一種通知？"
      },
      {
        "id": "topic_v2_06_f7",
        "text": "When do you least need your phone?",
        "textZh": "什麼場合你最不需要手機？"
      },
      {
        "id": "topic_v2_06_f8",
        "text": "What would you do first when the signal returned?",
        "textZh": "恢復訊號後，你會先做什麼？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Phone habits",
        "Offline memories",
        "An imagined quiet moment"
      ],
      "ordinaryShortAnswer": "I would show people some old photos.",
      "naturalContinuations": [
        "That might start a good story.",
        "What kind of photos do you keep?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_07",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "A New Friend Joins Us",
    "shortTitle": "A New Friend Joins Us",
    "titleZh": "第一次跟新朋友出門",
    "shortTitleZh": "第一次跟新朋友出門",
    "mainQuestion": "A new friend is joining our already close group for the first time. How could the gathering feel natural without becoming a long round of introductions?",
    "mainQuestionZh": "一位剛認識的朋友第一次加入我們的聚會，大家原本已經很熟。你會怎麼讓這次相處不用一直尷尬地自我介紹？",
    "entryPrompts": [
      "Being a newcomer",
      "Welcoming someone",
      "A shared activity"
    ],
    "entryPromptsZh": [
      "當新人的經驗",
      "接待新朋友的方法",
      "容易一起做的活動"
    ],
    "followUps": [
      {
        "id": "topic_v2_07_f1",
        "text": "What would you most want people to do when you joined a close group?",
        "textZh": "你剛加入一群熟人時最希望別人做什麼？"
      },
      {
        "id": "topic_v2_07_f2",
        "text": "Which jokes are difficult for someone outside the group to follow?",
        "textZh": "什麼玩笑容易讓圈外人接不上？"
      },
      {
        "id": "topic_v2_07_f3",
        "text": "What small things help you get to know someone?",
        "textZh": "你最容易從哪種小事認識一個人？"
      },
      {
        "id": "topic_v2_07_f4",
        "text": "Can too much attention make you uncomfortable?",
        "textZh": "太熱情的照顧會讓你不自在嗎？"
      },
      {
        "id": "topic_v2_07_f5",
        "text": "What easy way of starting a conversation have you experienced?",
        "textZh": "你遇過什麼很自然的破冰方式？"
      },
      {
        "id": "topic_v2_07_f6",
        "text": "When a group splits into smaller conversations, which one do you approach?",
        "textZh": "一群人各聊各的時，你會往哪裡靠近？"
      },
      {
        "id": "topic_v2_07_f7",
        "text": "How would you explain an old shared memory to a newcomer?",
        "textZh": "你會怎麼把熟人的共同回憶講給新人聽？"
      },
      {
        "id": "topic_v2_07_f8",
        "text": "When do you usually start feeling part of a group?",
        "textZh": "你通常什麼時候開始覺得自己融入了？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Being a newcomer",
        "Welcoming someone",
        "A shared activity"
      ],
      "ordinaryShortAnswer": "I would ask them to help choose snacks.",
      "naturalContinuations": [
        "A small job makes me feel included too.",
        "Would you prefer that to introducing yourself?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_08",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-living",
    "title": "Dinner in One Kitchen",
    "shortTitle": "Dinner in One Kitchen",
    "titleZh": "同一個廚房的晚餐",
    "shortTitleZh": "同一個廚房的晚餐",
    "mainQuestion": "We are making dinner in one kitchen. Some cook by feel; others want to follow every step of a recipe. What would the kitchen be like with you in it?",
    "mainQuestionZh": "我們今晚共用一個廚房準備晚餐，有人憑感覺煮、有人每一步都想照食譜。你加入後，這個廚房會是什麼樣子？",
    "entryPrompts": [
      "Cooking habits",
      "A kitchen memory",
      "An imagined small job"
    ],
    "entryPromptsZh": [
      "做菜習慣",
      "廚房裡的經驗",
      "想像自己能做的小事"
    ],
    "followUps": [
      {
        "id": "topic_v2_08_f1",
        "text": "Which small kitchen job would you be happiest to do?",
        "textZh": "你最願意負責哪一種小工作？"
      },
      {
        "id": "topic_v2_08_f2",
        "text": "What cooking habit makes you want to step in?",
        "textZh": "什麼做菜習慣會讓你忍不住插手？"
      },
      {
        "id": "topic_v2_08_f3",
        "text": "How do you usually react when food turns out differently than expected?",
        "textZh": "食物和預期不同時，你通常怎麼反應？"
      },
      {
        "id": "topic_v2_08_f4",
        "text": "What food combination do you like that other people doubt?",
        "textZh": "你有什麼別人不相信會好吃的搭配？"
      },
      {
        "id": "topic_v2_08_f5",
        "text": "Do you care more about eating on time or making the meal look good?",
        "textZh": "你比較在意準時吃到還是做得漂亮？"
      },
      {
        "id": "topic_v2_08_f6",
        "text": "Would you try food from someone who treats cooking as an experiment?",
        "textZh": "有人把料理當實驗，你會願意試嗎？"
      },
      {
        "id": "topic_v2_08_f7",
        "text": "What small confusion have you experienced while cooking together?",
        "textZh": "你遇過什麼合作煮飯的小混亂？"
      },
      {
        "id": "topic_v2_08_f8",
        "text": "Which job is easiest to overlook after eating?",
        "textZh": "吃完之後最容易被忽略的工作是什麼？"
      }
    ],
    "tags": [
      "shared-living"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Cooking habits",
        "A kitchen memory",
        "An imagined small job"
      ],
      "ordinaryShortAnswer": "I would wash vegetables and follow instructions.",
      "naturalContinuations": [
        "I am the person who guesses the amounts.",
        "Would you mind if the recipe changed?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_09",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "A Shop That Lets Us Rest",
    "shortTitle": "A Shop That Lets Us Rest",
    "titleZh": "老闆也想休息的小店",
    "shortTitleZh": "老闆也想休息的小店",
    "mainQuestion": "We are opening a little shop where friends can feel comfortable and the owners do not have to work too hard. What would you want it to be like?",
    "mainQuestionZh": "我們要開一家讓朋友待得舒服、老闆自己也不要太累的小店。你想讓它變成什麼樣子？",
    "entryPrompts": [
      "A favorite kind of shop",
      "Work you would avoid",
      "An imagined atmosphere"
    ],
    "entryPromptsZh": [
      "喜歡的小店",
      "想避開的工作",
      "想像店內氣氛"
    ],
    "followUps": [
      {
        "id": "topic_v2_09_f1",
        "text": "How would you most want customers to feel when they entered?",
        "textZh": "你最希望客人進門時有什麼感覺？"
      },
      {
        "id": "topic_v2_09_f2",
        "text": "Which job would you least want to handle?",
        "textZh": "哪種工作你最不想負責？"
      },
      {
        "id": "topic_v2_09_f3",
        "text": "What would make you want to stay for a long time?",
        "textZh": "什麼東西會讓你願意一直待著？"
      },
      {
        "id": "topic_v2_09_f4",
        "text": "How would you feel about customers who sit without buying anything?",
        "textZh": "如果客人只坐著不買東西，你會怎麼看？"
      },
      {
        "id": "topic_v2_09_f5",
        "text": "What slightly selfish shop rule would you keep?",
        "textZh": "你想保留什麼有點任性的店規？"
      },
      {
        "id": "topic_v2_09_f6",
        "text": "What trouble might come from the shop being too popular?",
        "textZh": "生意太好反而可能有什麼麻煩？"
      },
      {
        "id": "topic_v2_09_f7",
        "text": "What shop have you visited that makes you think of this one?",
        "textZh": "你去過哪種店，讓你想到這裡？"
      },
      {
        "id": "topic_v2_09_f8",
        "text": "What small detail might suddenly make this shop popular?",
        "textZh": "這家店最可能因為什麼小事突然受歡迎？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A favorite kind of shop",
        "Work you would avoid",
        "An imagined atmosphere"
      ],
      "ordinaryShortAnswer": "I want a small café with comfortable chairs.",
      "naturalContinuations": [
        "I would stay there with a book.",
        "How would we stop it becoming too much work?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_10",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "A Birthday on a Small Budget",
    "shortTitle": "A Birthday on a Small Budget",
    "titleZh": "小預算的生日",
    "shortTitleZh": "小預算的生日",
    "mainQuestion": "We want to give a friend a birthday they will remember, but we have very little money. What would be most worth our effort?",
    "mainQuestionZh": "我們想用很少的錢，替朋友辦一場他會一直記得的生日。你覺得什麼最值得把心力花下去？",
    "entryPrompts": [
      "A personal preference",
      "A thoughtful memory",
      "An inexpensive idea"
    ],
    "entryPromptsZh": [
      "生日偏好",
      "有心意的回憶",
      "不花大錢的點子"
    ],
    "followUps": [
      {
        "id": "topic_v2_10_f1",
        "text": "What inexpensive but thoughtful celebration have you received?",
        "textZh": "你收過什麼便宜但很有心的安排？"
      },
      {
        "id": "topic_v2_10_f2",
        "text": "What kind of surprise might make someone uncomfortable?",
        "textZh": "什麼驚喜反而可能讓人不自在？"
      },
      {
        "id": "topic_v2_10_f3",
        "text": "Which part would you be willing to make yourself?",
        "textZh": "你願意自己動手做哪個部分？"
      },
      {
        "id": "topic_v2_10_f4",
        "text": "How would you celebrate someone who does not want to be the center of attention?",
        "textZh": "朋友最不想做主角時，怎麼慶祝比較好？"
      },
      {
        "id": "topic_v2_10_f5",
        "text": "What is easiest to waste money on at a birthday celebration?",
        "textZh": "一場生日最容易花冤枉錢的是什麼？"
      },
      {
        "id": "topic_v2_10_f6",
        "text": "What shared memory could become part of the celebration?",
        "textZh": "什麼共同回憶可以放進安排裡？"
      },
      {
        "id": "topic_v2_10_f7",
        "text": "How would you handle everyone having a different budget?",
        "textZh": "你會怎麼處理大家不同的預算？"
      },
      {
        "id": "topic_v2_10_f8",
        "text": "Which small mistake might become the most memorable part?",
        "textZh": "哪一個小失誤可能反而成為最難忘的部分？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A personal preference",
        "A thoughtful memory",
        "An inexpensive idea"
      ],
      "ordinaryShortAnswer": "I would make a cake at home.",
      "naturalContinuations": [
        "A friend did that for me once.",
        "Would you rather make it a surprise?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_11",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "Our Unusual Little Show",
    "shortTitle": "Our Unusual Little Show",
    "titleZh": "我們的荒謬節目",
    "shortTitleZh": "我們的荒謬節目",
    "mainQuestion": "We are making one episode of a simple show with no professional equipment, using the odd little talents we already have. What do you think we would make?",
    "mainQuestionZh": "我們這群人要拍一集不用專業設備的小節目，內容可以利用大家本來就有的奇怪本事。你覺得會拍出什麼？",
    "entryPrompts": [
      "A modest skill",
      "Something you watch",
      "An imagined role"
    ],
    "entryPromptsZh": [
      "自己的小本事",
      "看過的節目",
      "想像自己在節目中的位置"
    ],
    "followUps": [
      {
        "id": "topic_v2_11_f1",
        "text": "What modest talent would be fun to use in the show?",
        "textZh": "你有什麼不算厲害但很適合拿來玩的本事？"
      },
      {
        "id": "topic_v2_11_f2",
        "text": "Would you rather be in front of or behind the camera?",
        "textZh": "你比較願意出現在鏡頭前還是後面？"
      },
      {
        "id": "topic_v2_11_f3",
        "text": "What everyday activity deserves its own episode?",
        "textZh": "什麼日常事值得拍成一集？"
      },
      {
        "id": "topic_v2_11_f4",
        "text": "What accident could stay in the finished show?",
        "textZh": "什麼意外可以直接留在成品裡？"
      },
      {
        "id": "topic_v2_11_f5",
        "text": "Which embarrassing kind of scene would you least want to make?",
        "textZh": "你最不想拍哪種讓人尷尬的橋段？"
      },
      {
        "id": "topic_v2_11_f6",
        "text": "How could the show work if nobody wanted to host?",
        "textZh": "沒有人願意主持時，節目可以怎麼進行？"
      },
      {
        "id": "topic_v2_11_f7",
        "text": "What simple video or show have you remembered for a long time?",
        "textZh": "你看過什麼很簡單卻記得很久的內容？"
      },
      {
        "id": "topic_v2_11_f8",
        "text": "Who would you want to show the finished episode to first?",
        "textZh": "你會想讓誰第一個看到成品？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A modest skill",
        "Something you watch",
        "An imagined role"
      ],
      "ordinaryShortAnswer": "I could show how badly I draw cats.",
      "naturalContinuations": [
        "I would probably enjoy watching that.",
        "Would you let us draw along?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_12",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "Ordinary Objects on Display",
    "shortTitle": "Ordinary Objects on Display",
    "titleZh": "普通東西博物館",
    "shortTitleZh": "普通東西博物館",
    "mainQuestion": "We are putting on a small exhibition of ordinary objects. Their stories matter more than their price. What would you bring?",
    "mainQuestionZh": "我們要做一場只展出普通生活物品的小展覽，精彩的不是價格，而是每件東西背後的故事。你會帶什麼來？",
    "entryPrompts": [
      "An object you own",
      "A memory",
      "A visitor’s point of view"
    ],
    "entryPromptsZh": [
      "擁有的普通物品",
      "相關回憶",
      "看展者的角度"
    ],
    "followUps": [
      {
        "id": "topic_v2_12_f1",
        "text": "Can other people always see why an object matters to you?",
        "textZh": "一件東西對你重要，別人一定看得出來嗎？"
      },
      {
        "id": "topic_v2_12_f2",
        "text": "Which ordinary objects from a stranger would you like to see?",
        "textZh": "你會想看哪種陌生人的日常物品？"
      },
      {
        "id": "topic_v2_12_f3",
        "text": "Could we show something if only a photo of it remained?",
        "textZh": "沒有實體物品，只剩照片時還能展嗎？"
      },
      {
        "id": "topic_v2_12_f4",
        "text": "What object best represents one period of your life?",
        "textZh": "什麼東西最能代表你某段生活？"
      },
      {
        "id": "topic_v2_12_f5",
        "text": "Does wear make an object more or less valuable?",
        "textZh": "物品的磨損會增加還是減少它的價值？"
      },
      {
        "id": "topic_v2_12_f6",
        "text": "Have you thrown away something you later wanted back?",
        "textZh": "你曾經誤丟過什麼後來想找回的東西？"
      },
      {
        "id": "topic_v2_12_f7",
        "text": "Which stories would not belong in a public exhibition?",
        "textZh": "什麼故事不適合公開展出？"
      },
      {
        "id": "topic_v2_12_f8",
        "text": "What would you want visitors to notice more about ordinary life?",
        "textZh": "你希望看展的人對普通生活多注意什麼？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An object you own",
        "A memory",
        "A visitor’s point of view"
      ],
      "ordinaryShortAnswer": "I would bring my old school bag.",
      "naturalContinuations": [
        "What story would you tell beside it?",
        "Mine has marks I still remember making."
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_13",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "A Gathering Without Pressure",
    "shortTitle": "A Gathering Without Pressure",
    "titleZh": "給不愛社交的人一場聚會",
    "shortTitleZh": "給不愛社交的人一場聚會",
    "mainQuestion": "We want to hold a gathering where even people who usually avoid parties can feel at ease. What should it be like?",
    "mainQuestionZh": "我們想辦一場連平常不愛聚會的人也能自在待著的活動。你覺得現場應該是什麼樣子？",
    "entryPrompts": [
      "Social preferences",
      "A difficult gathering",
      "An imagined safe corner"
    ],
    "entryPromptsZh": [
      "社交偏好",
      "讓人有壓力的聚會經驗",
      "想像自在的休息角落"
    ],
    "followUps": [
      {
        "id": "topic_v2_13_f1",
        "text": "Which plans at a gathering put the most pressure on you?",
        "textZh": "聚會中哪種安排最容易讓你有壓力？"
      },
      {
        "id": "topic_v2_13_f2",
        "text": "What can people do together without talking all the time?",
        "textZh": "不用一直說話的相處可以做什麼？"
      },
      {
        "id": "topic_v2_13_f3",
        "text": "Do you prefer a few close friends or a large group with more freedom?",
        "textZh": "你喜歡人少但很熟，還是人多但自由？"
      },
      {
        "id": "topic_v2_13_f4",
        "text": "How can an invitation make saying no feel less awkward?",
        "textZh": "怎麼邀請才不會讓拒絕變尷尬？"
      },
      {
        "id": "topic_v2_13_f5",
        "text": "When do you most need a quiet corner to rest?",
        "textZh": "你什麼時候最需要一個可以休息的角落？"
      },
      {
        "id": "topic_v2_13_f6",
        "text": "How do you usually feel when someone gives you special attention?",
        "textZh": "被別人特別照顧時，你通常有什麼感覺？"
      },
      {
        "id": "topic_v2_13_f7",
        "text": "Is an event without a big exciting moment necessarily bad?",
        "textZh": "活動沒有高潮一定不好嗎？"
      },
      {
        "id": "topic_v2_13_f8",
        "text": "What would make you want to come again?",
        "textZh": "什麼會讓你下次還想再來？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Social preferences",
        "A difficult gathering",
        "An imagined safe corner"
      ],
      "ordinaryShortAnswer": "I would like something to do with my hands.",
      "naturalContinuations": [
        "Drawing could make talking easier.",
        "Would you want people to join you?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_14",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "An Interesting Ordinary Street",
    "shortTitle": "An Interesting Ordinary Street",
    "titleZh": "普通街區的特別一天",
    "shortTitleZh": "普通街區的特別一天",
    "mainQuestion": "A friend is visiting an ordinary neighborhood we know well, with no famous attractions. How would you make the day interesting?",
    "mainQuestionZh": "一位朋友來到我們熟悉的普通街區，這裡沒有著名景點。你會怎麼讓他度過有意思的一天？",
    "entryPrompts": [
      "Local knowledge",
      "A visitor’s view",
      "An everyday memory"
    ],
    "entryPromptsZh": [
      "熟悉的地方",
      "遊客的角度",
      "日常生活回憶"
    ],
    "followUps": [
      {
        "id": "topic_v2_14_f1",
        "text": "What small pleasure in a familiar place is known mostly to regular visitors?",
        "textZh": "你熟悉的地方有什麼只有常去的人才知道的小樂趣？"
      },
      {
        "id": "topic_v2_14_f2",
        "text": "Would you take a friend to eat first or walk around?",
        "textZh": "你會先帶朋友吃東西還是四處走？"
      },
      {
        "id": "topic_v2_14_f3",
        "text": "Which ordinary place deserves a slow visit?",
        "textZh": "什麼日常地方值得慢慢待著？"
      },
      {
        "id": "topic_v2_14_f4",
        "text": "How would you plan the day if your friend had different interests?",
        "textZh": "對方和你興趣不同時，你會怎麼安排？"
      },
      {
        "id": "topic_v2_14_f5",
        "text": "What do you easily overlook when you live somewhere?",
        "textZh": "你當地人時最容易忽略什麼？"
      },
      {
        "id": "topic_v2_14_f6",
        "text": "Have you been pleasantly surprised by an ordinary place?",
        "textZh": "你曾經被普通地方意外驚喜過嗎？"
      },
      {
        "id": "topic_v2_14_f7",
        "text": "Is a day worthwhile even without any beautiful photos?",
        "textZh": "一天沒有拍到漂亮照片還算值得嗎？"
      },
      {
        "id": "topic_v2_14_f8",
        "text": "What feeling would you want your friend to take home?",
        "textZh": "你希望朋友離開時記得哪種感覺？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Local knowledge",
        "A visitor’s view",
        "An everyday memory"
      ],
      "ordinaryShortAnswer": "I would take them to my usual bakery.",
      "naturalContinuations": [
        "I like seeing where friends really go.",
        "What would you recommend there?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_15",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "A One-Day Swap Shop",
    "shortTitle": "A One-Day Swap Shop",
    "titleZh": "只營業一天的交換店",
    "shortTitleZh": "只營業一天的交換店",
    "mainQuestion": "We are running a swap shop for one day. The things people bring may not be valuable, but they could be useful to someone else. How would you take part?",
    "mainQuestionZh": "我們想辦一家只開一天的交換店，大家帶來的東西不一定值錢，但可能剛好是別人需要的。你會怎麼參與？",
    "entryPrompts": [
      "An unused possession",
      "Second-hand preferences",
      "An imagined exchange"
    ],
    "entryPromptsZh": [
      "用不到的東西",
      "二手物品偏好",
      "想像交換的結果"
    ],
    "followUps": [
      {
        "id": "topic_v2_15_f1",
        "text": "What useful thing at home do you never use?",
        "textZh": "你家有什麼東西一直用不到卻還能用？"
      },
      {
        "id": "topic_v2_15_f2",
        "text": "Which second-hand objects would you be happy to take home?",
        "textZh": "你願意拿回哪些二手物品？"
      },
      {
        "id": "topic_v2_15_f3",
        "text": "Would a big difference in value bother you during a swap?",
        "textZh": "價值差很多的交換會讓你在意嗎？"
      },
      {
        "id": "topic_v2_15_f4",
        "text": "How would you describe something that looks ordinary but works well?",
        "textZh": "你會怎麼介紹一件不起眼但好用的東西？"
      },
      {
        "id": "topic_v2_15_f5",
        "text": "Does an object with a story interest you more?",
        "textZh": "有故事的物品會比較吸引你嗎？"
      },
      {
        "id": "topic_v2_15_f6",
        "text": "What would you rather give away than exchange?",
        "textZh": "什麼東西你只想送人而不想交換？"
      },
      {
        "id": "topic_v2_15_f7",
        "text": "What could we do with things nobody wanted?",
        "textZh": "沒人想要的東西可以怎麼處理？"
      },
      {
        "id": "topic_v2_15_f8",
        "text": "What exchange would feel like a great result for you?",
        "textZh": "什麼交換結果會讓你覺得賺到了？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An unused possession",
        "Second-hand preferences",
        "An imagined exchange"
      ],
      "ordinaryShortAnswer": "I have a lamp I never use.",
      "naturalContinuations": [
        "I might need one for my desk.",
        "Would you want something in return?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_16",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "shared-planning",
    "title": "A Room to Rest In",
    "shortTitle": "A Room to Rest In",
    "titleZh": "給大家一個休息角落",
    "shortTitleZh": "給大家一個休息角落",
    "mainQuestion": "We have a small room we can turn into a place to relax after a busy day. What kind of feeling would you most want to create?",
    "mainQuestionZh": "我們有一個小房間，可以把它改成大家忙完一天後想待著的地方。你最想把什麼感覺放進去？",
    "entryPrompts": [
      "Sensory preferences",
      "A restful place",
      "An imagined shared room"
    ],
    "entryPromptsZh": [
      "光線聲音等偏好",
      "舒服場所的經驗",
      "想像共用休息室"
    ],
    "followUps": [
      {
        "id": "topic_v2_16_f1",
        "text": "Do you care most about light, sound, or seating when you relax?",
        "textZh": "你放鬆時最在意光線、聲音還是座位？"
      },
      {
        "id": "topic_v2_16_f2",
        "text": "What looks comfortable but is difficult to care for?",
        "textZh": "什麼東西看起來舒服卻很難維護？"
      },
      {
        "id": "topic_v2_16_f3",
        "text": "Would you want conversation or quiet?",
        "textZh": "你希望可以聊天還是保持安靜？"
      },
      {
        "id": "topic_v2_16_f4",
        "text": "How could one inexpensive object change the atmosphere?",
        "textZh": "一件便宜的小物能改變什麼氣氛？"
      },
      {
        "id": "topic_v2_16_f5",
        "text": "Where have you sat down and not wanted to leave?",
        "textZh": "你去過什麼地方，一坐下就不想走？"
      },
      {
        "id": "topic_v2_16_f6",
        "text": "How could people share the room when some want to sleep and others want to play?",
        "textZh": "有人想睡覺、有人想玩時怎麼共用？"
      },
      {
        "id": "topic_v2_16_f7",
        "text": "What would you least want this room to become?",
        "textZh": "你最不希望這個房間變成什麼樣子？"
      },
      {
        "id": "topic_v2_16_f8",
        "text": "What small imperfection would make it feel lived in?",
        "textZh": "你會留下哪一點不完美的生活感？"
      }
    ],
    "tags": [
      "shared-planning"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Sensory preferences",
        "A restful place",
        "An imagined shared room"
      ],
      "ordinaryShortAnswer": "I would put a soft chair near a window.",
      "naturalContinuations": [
        "I need good light to relax too.",
        "Would you want music in the room?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_17",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "Powers That Only Help Neighbors",
    "shortTitle": "Powers That Only Help Neighbors",
    "titleZh": "互助超能力公寓",
    "shortTitleZh": "互助超能力公寓",
    "mainQuestion": "We live in an apartment building where everyone has a small everyday superpower, but it only works on other people. What power would you bring?",
    "mainQuestionZh": "我們住進一棟人人都有日常小超能力的公寓，但能力只能幫別人、不能用在自己身上。你會帶著什麼能力住進來？",
    "entryPrompts": [
      "A daily problem",
      "A helpful habit",
      "A small imagined power"
    ],
    "entryPromptsZh": [
      "日常麻煩",
      "幫忙的習慣",
      "想像的小超能力"
    ],
    "followUps": [
      {
        "id": "topic_v2_17_f1",
        "text": "What trouble would you most want a neighbor to save you?",
        "textZh": "你最希望鄰居替你省掉什麼麻煩？"
      },
      {
        "id": "topic_v2_17_f2",
        "text": "Which useful power might lead to constant requests for help?",
        "textZh": "什麼能力很方便卻可能讓人一直被拜託？"
      },
      {
        "id": "topic_v2_17_f3",
        "text": "Should someone with a power feel free to say no?",
        "textZh": "有能力的人可以理直氣壯說不嗎？"
      },
      {
        "id": "topic_v2_17_f4",
        "text": "What small power seems useless but still appeals to you?",
        "textZh": "什麼小能力看起來沒用但你很想要？"
      },
      {
        "id": "topic_v2_17_f5",
        "text": "What funny misunderstanding might happen in this apartment building?",
        "textZh": "這棟公寓最可能出現什麼好笑的誤會？"
      },
      {
        "id": "topic_v2_17_f6",
        "text": "How would you thank a neighbor who often helped?",
        "textZh": "你會如何感謝經常幫忙的鄰居？"
      },
      {
        "id": "topic_v2_17_f7",
        "text": "Which things would you still want to do yourself, even with a power available?",
        "textZh": "什麼事情即使能用能力省掉，你還是想自己做？"
      },
      {
        "id": "topic_v2_17_f8",
        "text": "What problem would you notice first if all the powers took a day off?",
        "textZh": "如果能力突然休息一天，你最先遇到什麼麻煩？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A daily problem",
        "A helpful habit",
        "A small imagined power"
      ],
      "ordinaryShortAnswer": "I would make lost keys return to their owners.",
      "naturalContinuations": [
        "I would ask for that help often.",
        "Could you say no on your day off?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_18",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "Borrowing a Friend’s Routine",
    "shortTitle": "Borrowing a Friend’s Routine",
    "titleZh": "人生借住一天",
    "shortTitleZh": "人生借住一天",
    "mainQuestion": "You can spend a day living a friend’s everyday routine, while keeping your own personality. Whose routine would you most like to experience?",
    "mainQuestionZh": "你可以借住一位朋友的日常一天，照他的作息過生活，但還是保有自己的個性。你最想體驗誰的哪一種日常？",
    "entryPrompts": [
      "Curiosity about a friend",
      "Your own routine",
      "An imagined day"
    ],
    "entryPromptsZh": [
      "對朋友生活的好奇",
      "自己的作息",
      "想像的一天"
    ],
    "followUps": [
      {
        "id": "topic_v2_18_f1",
        "text": "Which kind of life looks easy but might be tiring?",
        "textZh": "什麼看起來輕鬆的生活可能其實很累？"
      },
      {
        "id": "topic_v2_18_f2",
        "text": "What would someone else find hardest about your routine?",
        "textZh": "別人進入你的日常，最容易不適應什麼？"
      },
      {
        "id": "topic_v2_18_f3",
        "text": "Which habit of your friend would you most want to learn?",
        "textZh": "你最想學走對方哪個生活習慣？"
      },
      {
        "id": "topic_v2_18_f4",
        "text": "Which part of their day would you want to change first?",
        "textZh": "你會最先忍不住改掉對方哪個安排？"
      },
      {
        "id": "topic_v2_18_f5",
        "text": "What is difficult to understand just by hearing someone describe it?",
        "textZh": "什麼事情很難光靠聽別人描述就懂？"
      },
      {
        "id": "topic_v2_18_f6",
        "text": "Would you prefer a completely unfamiliar routine or a partly familiar one?",
        "textZh": "你想體驗完全陌生還是有點熟悉的日常？"
      },
      {
        "id": "topic_v2_18_f7",
        "text": "Which job or hobby makes you curious about the everyday life behind it?",
        "textZh": "你對哪種工作或興趣的日常特別好奇？"
      },
      {
        "id": "topic_v2_18_f8",
        "text": "What might you appreciate more when you returned to your own life?",
        "textZh": "回到自己生活時，你可能會更珍惜什麼？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Curiosity about a friend",
        "Your own routine",
        "An imagined day"
      ],
      "ordinaryShortAnswer": "I would try my friend’s early morning routine.",
      "naturalContinuations": [
        "I would struggle with waking up.",
        "What part would you most want to copy?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_19",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "One Hour Just for You",
    "shortTitle": "One Hour Just for You",
    "titleZh": "每天多出的一小時",
    "shortTitleZh": "每天多出的一小時",
    "mainQuestion": "Every day, you get one extra hour that belongs only to you. Nobody contacts you and nothing is urgent. What would you make of that time?",
    "mainQuestionZh": "每天有一個額外的小時只屬於你，這段時間沒有人會找你，也沒有事情在催你。你會讓它成為怎樣的一段生活？",
    "entryPrompts": [
      "A postponed interest",
      "Rest habits",
      "An imagined protected hour"
    ],
    "entryPromptsZh": [
      "一直延後的興趣",
      "休息習慣",
      "想像不被打擾的一小時"
    ],
    "followUps": [
      {
        "id": "topic_v2_19_f1",
        "text": "What do you keep putting off even though you want to do it?",
        "textZh": "什麼事你一直想做卻總是往後放？"
      },
      {
        "id": "topic_v2_19_f2",
        "text": "Would you want this hour to produce a result?",
        "textZh": "你會想讓這一小時有成果嗎？"
      },
      {
        "id": "topic_v2_19_f3",
        "text": "Would it feel different if nobody knew how you used it?",
        "textZh": "完全沒人知道你在做什麼，會有不同嗎？"
      },
      {
        "id": "topic_v2_19_f4",
        "text": "How long can you rest before you want to do something?",
        "textZh": "休息到什麼程度你會開始坐不住？"
      },
      {
        "id": "topic_v2_19_f5",
        "text": "Where in the day would you put this hour?",
        "textZh": "你最想把這段時間放在一天的哪裡？"
      },
      {
        "id": "topic_v2_19_f6",
        "text": "Which small hobby needs only a little regular time?",
        "textZh": "有什麼小興趣只需要一點固定時間？"
      },
      {
        "id": "topic_v2_19_f7",
        "text": "Would you want to do the same thing every day?",
        "textZh": "你會想每天重複同樣的事嗎？"
      },
      {
        "id": "topic_v2_19_f8",
        "text": "What should never be allowed into this hour?",
        "textZh": "什麼事情最不該被帶進這一小時？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A postponed interest",
        "Rest habits",
        "An imagined protected hour"
      ],
      "ordinaryShortAnswer": "I would walk with no destination.",
      "naturalContinuations": [
        "I would like not checking the time.",
        "Would you go alone each day?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_20",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "The Objects Have Complaints",
    "shortTitle": "The Objects Have Complaints",
    "titleZh": "物品終於會抱怨",
    "shortTitleZh": "物品終於會抱怨",
    "mainQuestion": "The objects in your home can talk today, and they want to discuss how you treat them. What would this household meeting be like?",
    "mainQuestionZh": "家裡的物品今天突然能說話，而且最想談的是平常怎麼被你使用。你覺得你家會開成什麼樣的家庭會議？",
    "entryPrompts": [
      "An object you use",
      "A habit you notice",
      "An imagined complaint"
    ],
    "entryPromptsZh": [
      "常用物品",
      "觀察到的習慣",
      "想像物品的抱怨"
    ],
    "followUps": [
      {
        "id": "topic_v2_20_f1",
        "text": "Which object would most likely feel overworked?",
        "textZh": "哪件物品最可能覺得自己做太多事？"
      },
      {
        "id": "topic_v2_20_f2",
        "text": "Which object would ask you to stop buying more of its kind?",
        "textZh": "哪件物品會希望你不要再買同類了？"
      },
      {
        "id": "topic_v2_20_f3",
        "text": "What object do you actually treat very carefully?",
        "textZh": "你對什麼東西其實很小心？"
      },
      {
        "id": "topic_v2_20_f4",
        "text": "Which forgotten object might have the most to say?",
        "textZh": "哪件被冷落的東西可能有最多話說？"
      },
      {
        "id": "topic_v2_20_f5",
        "text": "Which object would speak well of you?",
        "textZh": "什麼物品會替你講好話？"
      },
      {
        "id": "topic_v2_20_f6",
        "text": "Which object would you most want to explain yourself to?",
        "textZh": "你最想向哪件東西解釋一下？"
      },
      {
        "id": "topic_v2_20_f7",
        "text": "What habit might you change after this conversation?",
        "textZh": "你會因為這場對話改掉哪個習慣？"
      },
      {
        "id": "topic_v2_20_f8",
        "text": "Which object would you want to keep talking afterward?",
        "textZh": "你希望哪件物品可以繼續說話？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An object you use",
        "A habit you notice",
        "An imagined complaint"
      ],
      "ordinaryShortAnswer": "My chair would ask me to stop dropping clothes on it.",
      "naturalContinuations": [
        "My chair has the same job.",
        "Which object would speak in your defense?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_21",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "A Ten-Second Redo",
    "shortTitle": "A Ten-Second Redo",
    "titleZh": "生活的小小重來鍵",
    "shortTitleZh": "生活的小小重來鍵",
    "mainQuestion": "You have a button that lets you redo only the last ten seconds. It cannot fix big problems, but it works for small everyday moments. Where would you use it?",
    "mainQuestionZh": "你有一個只能把剛才十秒重來的小按鈕，大事幫不上忙，卻可以用在生活小場面。你會把它用在哪裡？",
    "entryPrompts": [
      "A harmless mistake",
      "A small wish",
      "An imagined limit"
    ],
    "entryPromptsZh": [
      "不嚴重的小失誤",
      "生活小願望",
      "想像按鈕的限制"
    ],
    "followUps": [
      {
        "id": "topic_v2_21_f1",
        "text": "Which small awkward moment would be most worth redoing?",
        "textZh": "什麼小尷尬最值得重來？"
      },
      {
        "id": "topic_v2_21_f2",
        "text": "What mistake would you rather leave as it was?",
        "textZh": "有什麼失誤你反而不想抹掉？"
      },
      {
        "id": "topic_v2_21_f3",
        "text": "Would being able to try again make you more willing to speak?",
        "textZh": "你會不會因為能重來而更敢開口？"
      },
      {
        "id": "topic_v2_21_f4",
        "text": "What might turn out the same even on a second try?",
        "textZh": "哪種事情重做一次可能還是一樣？"
      },
      {
        "id": "topic_v2_21_f5",
        "text": "What would you most want friends not to use this button for?",
        "textZh": "你最希望朋友不要拿這個按鈕做什麼？"
      },
      {
        "id": "topic_v2_21_f6",
        "text": "How could it help while cooking or exercising?",
        "textZh": "做飯或運動時它可能怎麼用？"
      },
      {
        "id": "topic_v2_21_f7",
        "text": "Would you become more critical of yourself?",
        "textZh": "你會對自己變得更挑剔嗎？"
      },
      {
        "id": "topic_v2_21_f8",
        "text": "What small moment would you want to experience again rather than fix?",
        "textZh": "什麼小片段你會想再經歷一次而不是修正？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A harmless mistake",
        "A small wish",
        "An imagined limit"
      ],
      "ordinaryShortAnswer": "I would use it when I spill my tea.",
      "naturalContinuations": [
        "I would save it for pressing the wrong button.",
        "Would you start being less careful?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_22",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "A Small Package From the Future",
    "shortTitle": "A Small Package From the Future",
    "titleZh": "未來寄來的小包裹",
    "shortTitleZh": "未來寄來的小包裹",
    "mainQuestion": "Your future self sends you a small package from ten years ahead, containing only ordinary objects and no letter. What might help you understand that future life?",
    "mainQuestionZh": "十年後的你寄來一個小包裹，裡面只能放普通物品，不能附信。你覺得什麼東西最可能讓現在的你看懂一點未來的生活？",
    "entryPrompts": [
      "An everyday object",
      "A current hope",
      "An imagined clue"
    ],
    "entryPromptsZh": [
      "普通生活物品",
      "現在的期待",
      "想像未來的線索"
    ],
    "followUps": [
      {
        "id": "topic_v2_22_f1",
        "text": "Which ordinary object best shows a change in someone’s life?",
        "textZh": "什麼普通物品最能顯示一個人的生活改變？"
      },
      {
        "id": "topic_v2_22_f2",
        "text": "What interest do you hope to keep in the future?",
        "textZh": "你希望未來仍然保留什麼興趣？"
      },
      {
        "id": "topic_v2_22_f3",
        "text": "What would surprise you most to receive?",
        "textZh": "哪件東西收到時會讓你很意外？"
      },
      {
        "id": "topic_v2_22_f4",
        "text": "Would you rather learn about future work or life outside work?",
        "textZh": "你會比較想知道工作還是生活的樣子？"
      },
      {
        "id": "topic_v2_22_f5",
        "text": "What do you hope you will no longer need?",
        "textZh": "有什麼東西你希望未來不再需要？"
      },
      {
        "id": "topic_v2_22_f6",
        "text": "What could you send to your future self today?",
        "textZh": "你現在能寄給未來自己什麼？"
      },
      {
        "id": "topic_v2_22_f7",
        "text": "How would you interpret an object you did not understand at all?",
        "textZh": "你會怎麼解讀一件完全看不懂的物品？"
      },
      {
        "id": "topic_v2_22_f8",
        "text": "Would not knowing the whole answer make you more excited or more uneasy?",
        "textZh": "不知道完整答案會讓你更期待還是更不安？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An everyday object",
        "A current hope",
        "An imagined clue"
      ],
      "ordinaryShortAnswer": "A pair of walking shoes might mean I get outside more.",
      "naturalContinuations": [
        "I would be happy to receive that too.",
        "What object would surprise you?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_23",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "Watching an Ordinary Moment Again",
    "shortTitle": "Watching an Ordinary Moment Again",
    "titleZh": "回看日常片段",
    "shortTitleZh": "回看日常片段",
    "mainQuestion": "You can watch one ordinary moment from your own life again, not a major event but a time that did not seem special then. What would you want to see?",
    "mainQuestionZh": "你可以重新觀看自己生活中的一段普通時光，不是人生大事，而是當時沒覺得特別的片段。你會想回到哪裡看一看？",
    "entryPrompts": [
      "A familiar place",
      "A small memory",
      "Something you notice now"
    ],
    "entryPromptsZh": [
      "熟悉的地方",
      "普通的小回憶",
      "現在才注意到的事"
    ],
    "followUps": [
      {
        "id": "topic_v2_23_f1",
        "text": "Which place did you remember clearly only after leaving it?",
        "textZh": "什麼地方離開後才發現記得很清楚？"
      },
      {
        "id": "topic_v2_23_f2",
        "text": "What everyday sound would you most like to hear again?",
        "textZh": "你最想再聽到哪一種日常聲音？"
      },
      {
        "id": "topic_v2_23_f3",
        "text": "Who might you notice that you did not notice before?",
        "textZh": "你會注意以前沒注意到的誰？"
      },
      {
        "id": "topic_v2_23_f4",
        "text": "What do memories most easily make seem better than it was?",
        "textZh": "你覺得記憶裡最容易被美化的是什麼？"
      },
      {
        "id": "topic_v2_23_f5",
        "text": "Which ordinary moment today might you miss in the future?",
        "textZh": "現在有什麼普通片段將來可能會想念？"
      },
      {
        "id": "topic_v2_23_f6",
        "text": "What is the difference between a photo and a memory for you?",
        "textZh": "照片和真正的記憶對你有什麼差別？"
      },
      {
        "id": "topic_v2_23_f7",
        "text": "What small detail quickly brings back a period of your life?",
        "textZh": "哪個小細節最容易讓你想起一段日子？"
      },
      {
        "id": "topic_v2_23_f8",
        "text": "Would you want to keep your memory as it is or see what really happened?",
        "textZh": "你希望那段片段保持原樣還是看清真相？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A familiar place",
        "A small memory",
        "Something you notice now"
      ],
      "ordinaryShortAnswer": "I would watch an ordinary school lunch.",
      "naturalContinuations": [
        "I remember the sounds more than the food.",
        "Who would you want to notice this time?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_24",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "light-fantasy",
    "title": "Impossible Everyday Services",
    "shortTitle": "Impossible Everyday Services",
    "titleZh": "離譜但方便的服務",
    "shortTitleZh": "離譜但方便的服務",
    "mainQuestion": "A shop on the corner sells everyday services that do not exist in the ordinary world. What small problem would you happily pay a little to solve?",
    "mainQuestionZh": "街角新開了一家店，只賣你在普通世界買不到的日常服務。你最願意花一點錢解決哪種小麻煩？",
    "entryPrompts": [
      "A tiny daily problem",
      "A useful purchase",
      "An imagined service"
    ],
    "entryPromptsZh": [
      "日常小麻煩",
      "願意花錢的便利",
      "想像不存在的服務"
    ],
    "followUps": [
      {
        "id": "topic_v2_24_f1",
        "text": "What tiny problem comes back every day?",
        "textZh": "什麼麻煩太小卻每天都會出現？"
      },
      {
        "id": "topic_v2_24_f2",
        "text": "Which convenience might be hard to give up after trying it once?",
        "textZh": "有什麼方便你覺得買一次就會上癮？"
      },
      {
        "id": "topic_v2_24_f3",
        "text": "What service might be needed by more people than you expect?",
        "textZh": "哪種服務可能比你想像中多人需要？"
      },
      {
        "id": "topic_v2_24_f4",
        "text": "What would you never hand over to any service?",
        "textZh": "什麼事你不願意交给任何服務？"
      },
      {
        "id": "topic_v2_24_f5",
        "text": "Which service would you buy for a friend?",
        "textZh": "你會替朋友買哪一種服務？"
      },
      {
        "id": "topic_v2_24_f6",
        "text": "What funny mistake might happen if the service went wrong?",
        "textZh": "服務出錯時可能鬧出什麼笑話？"
      },
      {
        "id": "topic_v2_24_f7",
        "text": "What would you exchange instead of paying money?",
        "textZh": "你願意用什麼交換而不付錢？"
      },
      {
        "id": "topic_v2_24_f8",
        "text": "What would this shop least need to sell?",
        "textZh": "這家店最不需要賣哪種東西？"
      }
    ],
    "tags": [
      "light-fantasy"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A tiny daily problem",
        "A useful purchase",
        "An imagined service"
      ],
      "ordinaryShortAnswer": "I would pay to find matching socks.",
      "naturalContinuations": [
        "That would save me time every week.",
        "Would you pay each time or every month?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_25",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "A Thoughtful Gift You Do Not Want",
    "shortTitle": "A Thoughtful Gift You Do Not Want",
    "titleZh": "用心但不想要的禮物",
    "shortTitleZh": "用心但不想要的禮物",
    "mainQuestion": "A friend gives you a thoughtful gift that you really do not want, and is excited to see you use it. What would you do with the gift?",
    "mainQuestionZh": "朋友送你一份很用心、但你完全不想要的禮物，還很期待看到你使用。你會怎麼處理這份禮物？",
    "entryPrompts": [
      "Gift preferences",
      "A real or imagined gift",
      "A friend’s feelings"
    ],
    "entryPromptsZh": [
      "禮物偏好",
      "真實或假想的禮物",
      "送禮朋友的感受"
    ],
    "followUps": [
      {
        "id": "topic_v2_25_f1",
        "text": "Which gifts are hardest for you to deal with?",
        "textZh": "什麼樣的禮物對你來說最難處理？"
      },
      {
        "id": "topic_v2_25_f2",
        "text": "What gift suited you better than you expected?",
        "textZh": "你收過什麼意外適合自己的禮物？"
      },
      {
        "id": "topic_v2_25_f3",
        "text": "Should the giver care where the gift ends up?",
        "textZh": "送禮的人應該在意禮物後來去了哪裡嗎？"
      },
      {
        "id": "topic_v2_25_f4",
        "text": "What feels missing when you tell someone exactly what you want?",
        "textZh": "直接說想要什麼，對你來說少了什麼？"
      },
      {
        "id": "topic_v2_25_f5",
        "text": "When would you choose not to accept a gift?",
        "textZh": "你會在什麼情況下選擇不收？"
      },
      {
        "id": "topic_v2_25_f6",
        "text": "How do you balance a gift’s thoughtfulness and usefulness?",
        "textZh": "送禮的心意和實際用途，你怎麼看？"
      },
      {
        "id": "topic_v2_25_f7",
        "text": "How would you feel if someone was very honest about your gift?",
        "textZh": "別人對你送的禮物很誠實，你會怎麼感覺？"
      },
      {
        "id": "topic_v2_25_f8",
        "text": "What gift does not have to be an object?",
        "textZh": "有什麼禮物其實不需要是物品？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Gift preferences",
        "A real or imagined gift",
        "A friend’s feelings"
      ],
      "ordinaryShortAnswer": "I would thank them and keep it for a while.",
      "naturalContinuations": [
        "I would worry about them asking later.",
        "Would you ever explain that you did not use it?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_26",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "One Dinner, Different Bills",
    "shortTitle": "One Dinner, Different Bills",
    "titleZh": "大家吃得不一樣的帳單",
    "shortTitleZh": "大家吃得不一樣的帳單",
    "mainQuestion": "At dinner with friends, some order a lot and others eat very little. When the bill arrives, people have different ideas of fairness. What would feel most comfortable to you?",
    "mainQuestionZh": "朋友聚餐時，有人點很多、有人吃很少，結帳才發現大家對公平的想法不一樣。你覺得怎樣處理最舒服？",
    "entryPrompts": [
      "Your idea of fairness",
      "A dinner memory",
      "A limited budget"
    ],
    "entryPromptsZh": [
      "對公平的想法",
      "聚餐經驗",
      "預算有限的角度"
    ],
    "followUps": [
      {
        "id": "topic_v2_26_f1",
        "text": "Do you usually think about splitting the bill before ordering or when paying?",
        "textZh": "你通常在點餐前還是結帳時才想到分錢？"
      },
      {
        "id": "topic_v2_26_f2",
        "text": "What small difference in cost does not bother you at all?",
        "textZh": "哪種小差額你完全不在意？"
      },
      {
        "id": "topic_v2_26_f3",
        "text": "What does treating someone to a meal mean to you?",
        "textZh": "請客對你有什麼特別的意思？"
      },
      {
        "id": "topic_v2_26_f4",
        "text": "How can a group include a friend with less money without making it awkward?",
        "textZh": "有人預算比較緊時，怎麼相處不尷尬？"
      },
      {
        "id": "topic_v2_26_f5",
        "text": "Does knowing people well change how you split a bill?",
        "textZh": "熟悉程度會改變你的分帳方式嗎？"
      },
      {
        "id": "topic_v2_26_f6",
        "text": "What thoughtful way of paying have you experienced?",
        "textZh": "你遇過什麼貼心的結帳方式？"
      },
      {
        "id": "topic_v2_26_f7",
        "text": "What would make you not want to eat together next time?",
        "textZh": "什麼事情會讓你下次不想再一起吃？"
      },
      {
        "id": "topic_v2_26_f8",
        "text": "Would you volunteer to work out the bill?",
        "textZh": "你願意主動當計算帳單的人嗎？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Your idea of fairness",
        "A dinner memory",
        "A limited budget"
      ],
      "ordinaryShortAnswer": "I would pay for what I ordered.",
      "naturalContinuations": [
        "That feels simple when we eat separate dishes.",
        "What if everyone shared the food?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_27",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "A Group Chat That Never Stops",
    "shortTitle": "A Group Chat That Never Stops",
    "titleZh": "群組不斷亮起",
    "shortTitleZh": "群組不斷亮起",
    "mainQuestion": "Your friends’ group chat is always active. You like them, but do not want to reply all the time. What kind of group would help you feel connected without feeling tied down?",
    "mainQuestionZh": "朋友群組總有人聊天，你很喜歡大家，但不想一直回覆。怎樣的相處能讓你留在群組裡又不覺得被綁住？",
    "entryPrompts": [
      "Reply habits",
      "A group-chat experience",
      "Personal limits"
    ],
    "entryPromptsZh": [
      "回訊息習慣",
      "群組經驗",
      "自己的界線"
    ],
    "followUps": [
      {
        "id": "topic_v2_27_f1",
        "text": "What do you think when someone has read a message but not replied?",
        "textZh": "你看到已讀沒有回覆時通常怎麼想？"
      },
      {
        "id": "topic_v2_27_f2",
        "text": "Which messages need a quick reply?",
        "textZh": "什麼訊息你覺得需要盡快回？"
      },
      {
        "id": "topic_v2_27_f3",
        "text": "When would you mute a group chat?",
        "textZh": "你會在什麼情況把群組靜音？"
      },
      {
        "id": "topic_v2_27_f4",
        "text": "Does an emoji reaction count as taking part for you?",
        "textZh": "表情回應對你算不算參與？"
      },
      {
        "id": "topic_v2_27_f5",
        "text": "Do you prefer a group chat about daily life or just plans?",
        "textZh": "你喜歡群組聊生活還是只談安排？"
      },
      {
        "id": "topic_v2_27_f6",
        "text": "How does a larger group affect how much you say?",
        "textZh": "人數變多會怎麼影響你說話？"
      },
      {
        "id": "topic_v2_27_f7",
        "text": "Has something in a group chat made you feel cared for?",
        "textZh": "你曾經因為群組內容感到被照顧嗎？"
      },
      {
        "id": "topic_v2_27_f8",
        "text": "What would make you more willing to share something first?",
        "textZh": "什麼會讓你更願意主動分享？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Reply habits",
        "A group-chat experience",
        "Personal limits"
      ],
      "ordinaryShortAnswer": "I would mute it while I work.",
      "naturalContinuations": [
        "I do that but sometimes miss plans.",
        "Which messages would you still check quickly?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_28",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "A Photo You Do Not Want Shared",
    "shortTitle": "A Photo You Do Not Want Shared",
    "titleZh": "想留下但不想公開的照片",
    "shortTitleZh": "想留下但不想公開的照片",
    "mainQuestion": "A friend takes a group photo that captures the mood perfectly, but you dislike how you look in it. How would you speak up when everyone wants to keep the memory?",
    "mainQuestionZh": "朋友拍到一張很有聚會氣氛的合照，你卻不喜歡自己在裡面的樣子。大家都想留下這個回憶時，你會怎麼表達？",
    "entryPrompts": [
      "Photo preferences",
      "An awkward moment",
      "A friend’s point of view"
    ],
    "entryPromptsZh": [
      "照片偏好",
      "不自在的經驗",
      "朋友的角度"
    ],
    "followUps": [
      {
        "id": "topic_v2_28_f1",
        "text": "Do you care more about looking good or looking real in a photo?",
        "textZh": "你比較在意照片好不好看還是真不真實？"
      },
      {
        "id": "topic_v2_28_f2",
        "text": "Does taking photos change how an event feels to you?",
        "textZh": "拍照會不會改變你參加活動的感覺？"
      },
      {
        "id": "topic_v2_28_f3",
        "text": "What would you like friends to do before sharing photos?",
        "textZh": "你希望朋友分享照片前做什麼？"
      },
      {
        "id": "topic_v2_28_f4",
        "text": "Would you keep an unflattering photo that had a good story?",
        "textZh": "你會保留不漂亮但有故事的照片嗎？"
      },
      {
        "id": "topic_v2_28_f5",
        "text": "How can the group make someone comfortable when they do not want a photo?",
        "textZh": "一個人不想拍時，怎麼安排比較自在？"
      },
      {
        "id": "topic_v2_28_f6",
        "text": "Do you prefer taking photos or being in them?",
        "textZh": "你喜歡被拍還是替別人拍？"
      },
      {
        "id": "topic_v2_28_f7",
        "text": "Which moments would you rather not record with your phone?",
        "textZh": "什麼片段你反而不想拿手機記錄？"
      },
      {
        "id": "topic_v2_28_f8",
        "text": "How have your photo preferences differed from a friend’s?",
        "textZh": "你和朋友對照片的偏好有過什麼差異？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Photo preferences",
        "An awkward moment",
        "A friend’s point of view"
      ],
      "ordinaryShortAnswer": "I would ask them to keep it private.",
      "naturalContinuations": [
        "I think that is an easy request to accept.",
        "Would taking another photo help?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_29",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "Help You Did Not Ask For",
    "shortTitle": "Help You Did Not Ask For",
    "titleZh": "善意先幫忙",
    "shortTitleZh": "善意先幫忙",
    "mainQuestion": "A friend handles a troublesome task for you without asking, but you wanted to do it yourself. How would you feel about that help?",
    "mainQuestionZh": "朋友沒有先問，就替你處理了一件他覺得很麻煩的事，但你原本想自己做。你會怎麼看待這份好意？",
    "entryPrompts": [
      "A task you enjoy",
      "Receiving help",
      "Respecting a boundary"
    ],
    "entryPromptsZh": [
      "喜歡自己做的事",
      "接受幫忙的經驗",
      "尊重界線的方法"
    ],
    "followUps": [
      {
        "id": "topic_v2_29_f1",
        "text": "What would you most welcome someone helping with without being asked?",
        "textZh": "什麼事你最歡迎別人主動幫忙？"
      },
      {
        "id": "topic_v2_29_f2",
        "text": "When can receiving help feel like pressure?",
        "textZh": "什麼時候被幫忙反而有壓力？"
      },
      {
        "id": "topic_v2_29_f3",
        "text": "How do you tell someone you want to do it yourself?",
        "textZh": "你如何讓別人知道你想自己來？"
      },
      {
        "id": "topic_v2_29_f4",
        "text": "Have you helped someone and then found they did not need it?",
        "textZh": "你曾經幫忙卻發現對方不需要嗎？"
      },
      {
        "id": "topic_v2_29_f5",
        "text": "Do you prefer company while doing a task or someone doing it for you?",
        "textZh": "你比較喜歡有人陪著還是直接代辦？"
      },
      {
        "id": "topic_v2_29_f6",
        "text": "Does accepting help make you feel you need to repay it?",
        "textZh": "接受幫忙會讓你覺得需要回報嗎？"
      },
      {
        "id": "topic_v2_29_f7",
        "text": "How can someone ask in a way that helps you say what you really need?",
        "textZh": "別人怎麼詢問最容易讓你說出真正需要？"
      },
      {
        "id": "topic_v2_29_f8",
        "text": "What help have you received that was exactly right?",
        "textZh": "你遇過什麼剛剛好的幫助？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A task you enjoy",
        "Receiving help",
        "Respecting a boundary"
      ],
      "ordinaryShortAnswer": "I would be grateful, but ask them to check next time.",
      "naturalContinuations": [
        "That sounds fair if you wanted to learn.",
        "Which tasks would you happily hand over?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_30",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "An Invitation Accepted Too Quickly",
    "shortTitle": "An Invitation Accepted Too Quickly",
    "titleZh": "答應太快的邀約",
    "shortTitleZh": "答應太快的邀約",
    "mainQuestion": "You excitedly accept a friend’s invitation, then realize you would rather rest. Your friend is already looking forward to it. What would you do?",
    "mainQuestionZh": "你一時興奮答應了朋友的邀約，後來發現自己其實更想休息，但對方已經很期待。你會怎麼處理？",
    "entryPrompts": [
      "Rest needs",
      "An invitation memory",
      "A friend’s expectations"
    ],
    "entryPromptsZh": [
      "休息需求",
      "邀約經驗",
      "朋友的期待"
    ],
    "followUps": [
      {
        "id": "topic_v2_30_f1",
        "text": "Which invitations are easiest to accept quickly and regret later?",
        "textZh": "你最容易對哪種邀約先答應再後悔？"
      },
      {
        "id": "topic_v2_30_f2",
        "text": "How much notice makes a cancellation acceptable to you?",
        "textZh": "提前多久取消你比較能接受？"
      },
      {
        "id": "topic_v2_30_f3",
        "text": "What reason would make you go out even when you did not feel like it?",
        "textZh": "你會給自己什麼理由硬著頭皮出門？"
      },
      {
        "id": "topic_v2_30_f4",
        "text": "Which gathering turned out better than you expected?",
        "textZh": "哪些聚會去了反而比想像中好？"
      },
      {
        "id": "topic_v2_30_f5",
        "text": "What kind of refusal feels less like a personal rejection?",
        "textZh": "怎樣的拒絕讓你比較不覺得被否定？"
      },
      {
        "id": "topic_v2_30_f6",
        "text": "Do you feel guilty when you set aside time to rest?",
        "textZh": "你安排休息時間時會有罪惡感嗎？"
      },
      {
        "id": "topic_v2_30_f7",
        "text": "How do you change your expectations if a friend often changes their mind?",
        "textZh": "朋友經常改主意時你會怎麼調整期待？"
      },
      {
        "id": "topic_v2_30_f8",
        "text": "What would your ideal last-minute invitation be like?",
        "textZh": "你理想中的臨時邀約是什麼樣子？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Rest needs",
        "An invitation memory",
        "A friend’s expectations"
      ],
      "ordinaryShortAnswer": "I would ask if we could meet for less time.",
      "naturalContinuations": [
        "I would prefer that to a last-minute cancellation.",
        "What if the event needed a whole evening?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_31",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "An Honest Response to a Friend’s Work",
    "shortTitle": "An Honest Response to a Friend’s Work",
    "titleZh": "說實話還是留面子",
    "shortTitleZh": "說實話還是留面子",
    "mainQuestion": "A friend excitedly shows you something they made. You can see the effort, but you honestly do not like it. How would you respond?",
    "mainQuestionZh": "朋友興奮地給你看他新做的作品，你看得出他很用心，卻真的不喜歡。你會給他什麼樣的回應？",
    "entryPrompts": [
      "Feedback preferences",
      "Making something",
      "Protecting a friendship"
    ],
    "entryPromptsZh": [
      "對回饋的偏好",
      "創作的經驗",
      "朋友關係的角度"
    ],
    "followUps": [
      {
        "id": "topic_v2_31_f1",
        "text": "Do you usually want encouragement or specific feedback?",
        "textZh": "你通常想聽支持還是具體意見？"
      },
      {
        "id": "topic_v2_31_f2",
        "text": "How can you tell which kind of response someone wants right now?",
        "textZh": "你怎麼分辨對方現在想要哪一种回應？"
      },
      {
        "id": "topic_v2_31_f3",
        "text": "What kind of criticism is easiest for you to listen to?",
        "textZh": "什麼批評方式最讓你聽得下去？"
      },
      {
        "id": "topic_v2_31_f4",
        "text": "How is disliking something different from thinking it is badly made?",
        "textZh": "不喜歡和做得不好，對你有什麼差別？"
      },
      {
        "id": "topic_v2_31_f5",
        "text": "Has someone’s response made you more willing to keep making things?",
        "textZh": "你曾經因為一個回應更敢繼續做嗎？"
      },
      {
        "id": "topic_v2_31_f6",
        "text": "When would you choose not to give an opinion yet?",
        "textZh": "你會在什麼情況選擇先不給意見？"
      },
      {
        "id": "topic_v2_31_f7",
        "text": "How do you feel about praise that is too general?",
        "textZh": "稱讚得太籠統會讓你有什麼感覺？"
      },
      {
        "id": "topic_v2_31_f8",
        "text": "How do you respond to a friend whose taste is very different from yours?",
        "textZh": "你怎麼回應和自己品味完全不同的朋友？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Feedback preferences",
        "Making something",
        "Protecting a friendship"
      ],
      "ordinaryShortAnswer": "I would mention one part I liked.",
      "naturalContinuations": [
        "I would want to know whether you liked the rest.",
        "Would you ask what kind of feedback they wanted?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_32",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "A Favorite Item Comes Back Worn",
    "shortTitle": "A Favorite Item Comes Back Worn",
    "titleZh": "借出去之後",
    "shortTitleZh": "借出去之後",
    "mainQuestion": "You lend a favorite item to a friend. It comes back a little worn, but your friend thinks it is fine. How would you react?",
    "mainQuestionZh": "你把很喜歡的一件東西借給朋友，拿回來時多了一點使用痕跡，對方卻覺得完全沒關係。你會怎麼反應？",
    "entryPrompts": [
      "Lending habits",
      "An object’s value",
      "A friend’s response"
    ],
    "entryPromptsZh": [
      "借東西的習慣",
      "物品的價值",
      "朋友的回應"
    ],
    "followUps": [
      {
        "id": "topic_v2_32_f1",
        "text": "What would you least want to lend?",
        "textZh": "你最不願意借出什麼東西？"
      },
      {
        "id": "topic_v2_32_f2",
        "text": "Does an item’s price change how much the damage matters?",
        "textZh": "物品的價格會改變你的在意程度嗎？"
      },
      {
        "id": "topic_v2_32_f3",
        "text": "What could your friend say that would help you feel better?",
        "textZh": "朋友怎麼說會讓你比較舒服？"
      },
      {
        "id": "topic_v2_32_f4",
        "text": "What do you pay special attention to when borrowing something?",
        "textZh": "你借別人東西時會特別注意什麼？"
      },
      {
        "id": "topic_v2_32_f5",
        "text": "Which signs of use do not bother you?",
        "textZh": "什麼使用痕跡反而不讓你介意？"
      },
      {
        "id": "topic_v2_32_f6",
        "text": "Would you rather buy something yourself or borrow it?",
        "textZh": "你寧願自己買還是跟別人借？"
      },
      {
        "id": "topic_v2_32_f7",
        "text": "Which items need clear expectations before being lent?",
        "textZh": "有什麼物品值得事先把期待講清楚？"
      },
      {
        "id": "topic_v2_32_f8",
        "text": "Would this change how you spend time with your friend?",
        "textZh": "這件事會改變你和朋友的相處嗎？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Lending habits",
        "An object’s value",
        "A friend’s response"
      ],
      "ordinaryShortAnswer": "I would say I was disappointed about the mark.",
      "naturalContinuations": [
        "An apology would matter more than the price to me.",
        "Would you lend it again?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_33",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "An Assistant That Knows Your Taste",
    "shortTitle": "An Assistant That Knows Your Taste",
    "titleZh": "太多方便替你決定",
    "shortTitleZh": "太多方便替你決定",
    "mainQuestion": "A personal assistant can choose restaurants, plan days off, and buy everyday supplies, learning your tastes over time. Which choices would you let it make?",
    "mainQuestionZh": "一個生活助理可以替你選餐廳、排休假、買日用品，越用越懂你。你願意把生活裡哪些選擇交給它？",
    "entryPrompts": [
      "Tiring choices",
      "Convenience preferences",
      "An imagined assistant"
    ],
    "entryPromptsZh": [
      "讓人累的選擇",
      "對便利的偏好",
      "想像生活助理"
    ],
    "followUps": [
      {
        "id": "topic_v2_33_f1",
        "text": "Which choices make you tired every day?",
        "textZh": "什麼選擇讓你每天都覺得累？"
      },
      {
        "id": "topic_v2_33_f2",
        "text": "What pleasure in exploring for yourself would you keep?",
        "textZh": "你想保留哪種自己摸索的樂趣？"
      },
      {
        "id": "topic_v2_33_f3",
        "text": "What would you do when a recommendation did not suit you?",
        "textZh": "被推薦到不喜歡的東西時你會怎麼做？"
      },
      {
        "id": "topic_v2_33_f4",
        "text": "How much of your daily routine would you share for the sake of convenience?",
        "textZh": "你願意為了方便告訴它多少生活習慣？"
      },
      {
        "id": "topic_v2_33_f5",
        "text": "Would always getting things you liked become boring?",
        "textZh": "總是選中你喜歡的東西，會不會太單調？"
      },
      {
        "id": "topic_v2_33_f6",
        "text": "What would you most want it not to decide for you?",
        "textZh": "你最希望它不要替你決定什麼？"
      },
      {
        "id": "topic_v2_33_f7",
        "text": "How is a friend’s recommendation different from a system’s recommendation?",
        "textZh": "朋友推薦和系統推薦對你有什麼不同？"
      },
      {
        "id": "topic_v2_33_f8",
        "text": "Do you prefer more surprises or more reliable choices?",
        "textZh": "你喜歡多一點驚喜還是多一點穩定？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "Tiring choices",
        "Convenience preferences",
        "An imagined assistant"
      ],
      "ordinaryShortAnswer": "I would let it buy cleaning supplies.",
      "naturalContinuations": [
        "That is a choice I would not miss.",
        "Would you let it choose your weekend too?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_34",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "Everyone Leaves the Planning to You",
    "shortTitle": "Everyone Leaves the Planning to You",
    "titleZh": "大家都習慣你負責",
    "shortTitleZh": "大家都習慣你負責",
    "mainQuestion": "You once organized a great gathering, and now everyone naturally leaves the planning to you. How would you feel about that new role?",
    "mainQuestionZh": "你曾經主動安排過一次很成功的聚會，之後大家就自然把安排都交給你。你會怎麼面對這個新角色？",
    "entryPrompts": [
      "A useful skill",
      "Feeling appreciated",
      "Sharing responsibility"
    ],
    "entryPromptsZh": [
      "常被拜託的能力",
      "被重視的感受",
      "分工的想法"
    ],
    "followUps": [
      {
        "id": "topic_v2_34_f1",
        "text": "What ability led people to ask you for help once they noticed it?",
        "textZh": "你有什麼能力一被發現就常被拜託？"
      },
      {
        "id": "topic_v2_34_f2",
        "text": "What is the difference between being needed and being taken for granted?",
        "textZh": "被需要和被當成理所當然差在哪裡？"
      },
      {
        "id": "topic_v2_34_f3",
        "text": "What would you be happy to keep handling?",
        "textZh": "你願意一直負責哪種事情？"
      },
      {
        "id": "topic_v2_34_f4",
        "text": "How could others take part in a way that gives you more energy?",
        "textZh": "大家怎麼參與會讓你比較有動力？"
      },
      {
        "id": "topic_v2_34_f5",
        "text": "How would you give someone else a chance to plan?",
        "textZh": "你會如何讓別人也有機會安排？"
      },
      {
        "id": "topic_v2_34_f6",
        "text": "Is it difficult for you to say no to a familiar role?",
        "textZh": "拒絕熟悉的角色對你困難嗎？"
      },
      {
        "id": "topic_v2_34_f7",
        "text": "Have you become tired of something you are good at?",
        "textZh": "你曾經對自己擅長的事感到疲累嗎？"
      },
      {
        "id": "topic_v2_34_f8",
        "text": "What response makes you feel your effort was noticed?",
        "textZh": "什麼回饋讓你覺得付出有被看見？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A useful skill",
        "Feeling appreciated",
        "Sharing responsibility"
      ],
      "ordinaryShortAnswer": "I would ask someone else to choose the next place.",
      "naturalContinuations": [
        "I might help if I knew exactly what to do.",
        "Would you still enjoy planning sometimes?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_35",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "A Hobby or a Job?",
    "shortTitle": "A Hobby or a Job?",
    "titleZh": "一直待著的興趣",
    "shortTitleZh": "一直待著的興趣",
    "mainQuestion": "You love a hobby, and friends start suggesting you earn money from it. How would you decide whether it should stay a break or become work?",
    "mainQuestionZh": "你有一個很喜歡的興趣，朋友開始建議你靠它賺錢。你會怎麼決定它要繼續是休息，還是變成工作？",
    "entryPrompts": [
      "A hobby you value",
      "Making things for others",
      "Personal boundaries"
    ],
    "entryPromptsZh": [
      "珍惜的興趣",
      "替別人做事的經驗",
      "保留樂趣的界線"
    ],
    "followUps": [
      {
        "id": "topic_v2_35_f1",
        "text": "How does pressure to produce something change a hobby?",
        "textZh": "有成果的壓力會怎麼改變你的興趣？"
      },
      {
        "id": "topic_v2_35_f2",
        "text": "Do you prefer making things for yourself or for others?",
        "textZh": "你喜歡替自己做還是替別人做？"
      },
      {
        "id": "topic_v2_35_f3",
        "text": "What would you rather do just for enjoyment, even without being very good?",
        "textZh": "什麼事情你寧願做得普通但開心？"
      },
      {
        "id": "topic_v2_35_f4",
        "text": "Does praise affect how much time you put into something?",
        "textZh": "別人的稱讚會影響你繼續投入嗎？"
      },
      {
        "id": "topic_v2_35_f5",
        "text": "How much time would you spend on a hobby with no practical use?",
        "textZh": "你願意把多少時間花在一個沒有用途的興趣上？"
      },
      {
        "id": "topic_v2_35_f6",
        "text": "Have you brought work into your rest time?",
        "textZh": "你曾經把工作帶進休息裡嗎？"
      },
      {
        "id": "topic_v2_35_f7",
        "text": "What limit could protect the original fun?",
        "textZh": "什麼界線能幫你保留原本的樂趣？"
      },
      {
        "id": "topic_v2_35_f8",
        "text": "How would you most like friends to support your hobby?",
        "textZh": "你最希望朋友怎麼支持你的興趣？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A hobby you value",
        "Making things for others",
        "Personal boundaries"
      ],
      "ordinaryShortAnswer": "I would keep it as a hobby for now.",
      "naturalContinuations": [
        "Deadlines might change the fun for me too.",
        "Would you accept one small paid request?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_36",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "everyday-choices",
    "title": "Changing Your Mind in Front of Friends",
    "shortTitle": "Changing Your Mind in Front of Friends",
    "titleZh": "改變主意也有面子",
    "shortTitleZh": "改變主意也有面子",
    "mainQuestion": "You are starting to change your mind about a lifestyle choice you used to defend strongly, and your friends remember what you said. How would you handle the change?",
    "mainQuestionZh": "你一直很肯定的一個生活選擇，最近卻越來越想改變，但朋友都記得你以前說過的話。你會怎麼面對自己的轉變？",
    "entryPrompts": [
      "A changed preference",
      "Trying a new habit",
      "Friends’ reactions"
    ],
    "entryPromptsZh": [
      "改變過的偏好",
      "嘗試新習慣",
      "朋友的反應"
    ],
    "followUps": [
      {
        "id": "topic_v2_36_f1",
        "text": "What did you strongly dislike before you learned to enjoy it?",
        "textZh": "什麼事情你以前很排斥，後來卻喜歡了？"
      },
      {
        "id": "topic_v2_36_f2",
        "text": "Would you tell friends that you had changed your mind?",
        "textZh": "你會主動告訴朋友自己改變想法嗎？"
      },
      {
        "id": "topic_v2_36_f3",
        "text": "How do you feel when someone says they told you so?",
        "textZh": "別人說早就告訴你了時，你有什麼感覺？"
      },
      {
        "id": "topic_v2_36_f4",
        "text": "How do you tell a real change of mind from a passing feeling?",
        "textZh": "你怎麼分辨改變主意和一時衝動？"
      },
      {
        "id": "topic_v2_36_f5",
        "text": "Which small choices are you most willing to learn through mistakes?",
        "textZh": "你最能接受在哪些小事上試錯？"
      },
      {
        "id": "topic_v2_36_f6",
        "text": "What opinion do you no longer need to prove to anyone?",
        "textZh": "有什麼看法你不再需要向別人證明？"
      },
      {
        "id": "topic_v2_36_f7",
        "text": "Do you like friends remembering how you used to be?",
        "textZh": "你喜歡朋友記得你以前的樣子嗎？"
      },
      {
        "id": "topic_v2_36_f8",
        "text": "What experience would make you reconsider?",
        "textZh": "什麼經驗會讓你願意重新考慮？"
      }
    ],
    "tags": [
      "everyday-choices"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A changed preference",
        "Trying a new habit",
        "Friends’ reactions"
      ],
      "ordinaryShortAnswer": "I would simply say it suits me better now.",
      "naturalContinuations": [
        "I like when friends can change their minds.",
        "Would you try it privately first?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_37",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "Speaking Up for an Old Object",
    "shortTitle": "Speaking Up for an Old Object",
    "titleZh": "替舊物說話",
    "shortTitleZh": "替舊物說話",
    "mainQuestion": "Some things are no longer useful, but “just throw it away” does not feel right. Which old thing you keep would you most want to defend?",
    "mainQuestionZh": "有些東西明明用不到了，卻不是一句「丟掉就好」能處理。哪件你留著的舊物，最讓你想替它說說話？",
    "entryPrompts": [
      "A kept possession",
      "A memory",
      "Practical space limits"
    ],
    "entryPromptsZh": [
      "留下的舊物",
      "相關回憶",
      "實際空間限制"
    ],
    "followUps": [
      {
        "id": "topic_v2_37_f1",
        "text": "Are you keeping the object itself or the period of life it represents?",
        "textZh": "你留的是物品本身，還是它代表的那段日子？"
      },
      {
        "id": "topic_v2_37_f2",
        "text": "What do other people think you should throw away that you clearly want to keep?",
        "textZh": "有什麼東西別人覺得該丟，你卻很清楚想留？"
      },
      {
        "id": "topic_v2_37_f3",
        "text": "Have you tried to sort things out and ended up keeping them?",
        "textZh": "你曾經試著整理，結果又把東西留下來嗎？"
      },
      {
        "id": "topic_v2_37_f4",
        "text": "Would just taking a photo be enough for you?",
        "textZh": "只拍張照片對你來說夠不夠？"
      },
      {
        "id": "topic_v2_37_f5",
        "text": "Are you more likely to keep gifts or things you bought?",
        "textZh": "你比較容易留下禮物還是自己買的東西？"
      },
      {
        "id": "topic_v2_37_f6",
        "text": "Which objects are easy for you to let go of?",
        "textZh": "哪種物品你完全不會捨不得？"
      },
      {
        "id": "topic_v2_37_f7",
        "text": "Has something become useful again after sitting unused for years?",
        "textZh": "有沒有東西放很久後真的又派上用場？"
      },
      {
        "id": "topic_v2_37_f8",
        "text": "How would you find space for something important but bulky?",
        "textZh": "你會怎麼替重要但佔位的東西找地方？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A kept possession",
        "A memory",
        "Practical space limits"
      ],
      "ordinaryShortAnswer": "I keep a mug from my first job.",
      "naturalContinuations": [
        "Would a picture of it feel the same?",
        "I also keep things with no real use."
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_38",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Small Mistake Friends Keep Retelling",
    "shortTitle": "A Small Mistake Friends Keep Retelling",
    "titleZh": "被朋友講了好多次的小包",
    "shortTitleZh": "被朋友講了好多次的小包",
    "mainQuestion": "Some small mistakes become stories that friends keep retelling. Which one makes you want to say, “That is not quite what happened”?",
    "mainQuestionZh": "有些小失誤當時很糗，後來卻變成朋友一直拿來講的故事。哪件事最讓你想說「事情不是你們想的那樣」？",
    "entryPrompts": [
      "A harmless mistake",
      "Friendly teasing",
      "A correction to a story"
    ],
    "entryPromptsZh": [
      "不嚴重的小失誤",
      "朋友的玩笑",
      "想補充的故事細節"
    ],
    "followUps": [
      {
        "id": "topic_v2_38_f1",
        "text": "Do your small mistakes happen more often when you hurry or when you are too relaxed?",
        "textZh": "你的小失誤通常發生在趕時間還是太放鬆的時候？"
      },
      {
        "id": "topic_v2_38_f2",
        "text": "What could a friend do to help that you would really appreciate?",
        "textZh": "朋友怎麼救場會讓你最感謝？"
      },
      {
        "id": "topic_v2_38_f3",
        "text": "How much teasing still feels fun to you?",
        "textZh": "被吐槽到什麼程度你還覺得好玩？"
      },
      {
        "id": "topic_v2_38_f4",
        "text": "Has a mistake ever helped you?",
        "textZh": "有沒有一次失誤反而幫了你？"
      },
      {
        "id": "topic_v2_38_f5",
        "text": "What do you remember a whole group getting wrong together?",
        "textZh": "你記得什麼大家一起搞錯的事情？"
      },
      {
        "id": "topic_v2_38_f6",
        "text": "Have friends made the story of your mistake bigger each time they tell it?",
        "textZh": "別人對你的小包有沒有越講越誇張？"
      },
      {
        "id": "topic_v2_38_f7",
        "text": "Are you quicker to admit a mistake or try to fix it first?",
        "textZh": "你比較容易承認還是先試著補救？"
      },
      {
        "id": "topic_v2_38_f8",
        "text": "What small mistake taught you a method you still use?",
        "textZh": "什麼小失誤教會你一個到現在還在用的方法？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A harmless mistake",
        "Friendly teasing",
        "A correction to a story"
      ],
      "ordinaryShortAnswer": "I once went to the wrong café.",
      "naturalContinuations": [
        "I have done that when two places had similar names.",
        "Did anyone come and find you?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_39",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A First Impression Changes",
    "shortTitle": "A First Impression Changes",
    "titleZh": "看錯一個人",
    "shortTitleZh": "看錯一個人",
    "mainQuestion": "Sometimes one small moment shows you that your first impression of someone was wrong. What moment changed the way you saw a person?",
    "mainQuestionZh": "有時候一件很小的事，就會讓你發現自己一直看錯一個人。你遇過什麼讓第一印象翻過來的時刻？",
    "entryPrompts": [
      "An observation",
      "A shared interest",
      "Your own first impression"
    ],
    "entryPromptsZh": [
      "對別人的觀察",
      "共同興趣",
      "自己給人的第一印象"
    ],
    "followUps": [
      {
        "id": "topic_v2_39_f1",
        "text": "What wrong impression do people often have of you?",
        "textZh": "你常被別人誤會成什麼樣的人？"
      },
      {
        "id": "topic_v2_39_f2",
        "text": "Which small actions do you notice first in someone?",
        "textZh": "你會先注意一個人的哪種小行為？"
      },
      {
        "id": "topic_v2_39_f3",
        "text": "Has someone seemed very different after you got to know them?",
        "textZh": "有人在熟悉之後反差特別大嗎？"
      },
      {
        "id": "topic_v2_39_f4",
        "text": "Do you trust your first feeling or your feeling after spending time together?",
        "textZh": "你比較相信第一感覺還是相處後的感覺？"
      },
      {
        "id": "topic_v2_39_f5",
        "text": "Which situations make people act unlike their usual selves?",
        "textZh": "什麼場合容易讓人表現得不像平常？"
      },
      {
        "id": "topic_v2_39_f6",
        "text": "Has a shared interest helped you see someone differently?",
        "textZh": "你曾經因為一個共同興趣重新認識某人嗎？"
      },
      {
        "id": "topic_v2_39_f7",
        "text": "Do you like people telling you their impression of you directly?",
        "textZh": "你喜歡別人直接說出對你的印象嗎？"
      },
      {
        "id": "topic_v2_39_f8",
        "text": "Has your own view of yourself ever changed?",
        "textZh": "你對自己的某個印象有改變過嗎？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An observation",
        "A shared interest",
        "Your own first impression"
      ],
      "ordinaryShortAnswer": "A quiet classmate turned out to love telling jokes.",
      "naturalContinuations": [
        "I am much quieter with new people too.",
        "What helped you see that side of them?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_40",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Habit Others Do Not Understand",
    "shortTitle": "A Habit Others Do Not Understand",
    "titleZh": "自己的奇怪小堅持",
    "shortTitleZh": "自己的奇怪小堅持",
    "mainQuestion": "Do you have a small habit that feels normal to you, but makes friends ask, “Is that really necessary?” Let us see it your way.",
    "mainQuestionZh": "你有沒有一個自己覺得很正常，卻常被朋友問「這有必要嗎」的小習慣？把我們帶進你的理由裡。",
    "entryPrompts": [
      "A personal routine",
      "A friend’s reaction",
      "A small comfort"
    ],
    "entryPromptsZh": [
      "自己的習慣",
      "朋友的反應",
      "生活的小舒適"
    ],
    "followUps": [
      {
        "id": "topic_v2_40_f1",
        "text": "When did this habit begin?",
        "textZh": "這個習慣是從什麼時候開始的？"
      },
      {
        "id": "topic_v2_40_f2",
        "text": "What would make you put it aside for a while?",
        "textZh": "什麼情況會讓你暫時放下它？"
      },
      {
        "id": "topic_v2_40_f3",
        "text": "Have you found someone who cares about the same small thing?",
        "textZh": "你曾經發現別人也有一樣的堅持嗎？"
      },
      {
        "id": "topic_v2_40_f4",
        "text": "Which friend’s habit did you understand only later?",
        "textZh": "哪個朋友的習慣你後來才懂？"
      },
      {
        "id": "topic_v2_40_f5",
        "text": "Would having company make you stick to the habit more?",
        "textZh": "你會因為有人陪你做而更堅持嗎？"
      },
      {
        "id": "topic_v2_40_f6",
        "text": "What small habit makes life more comfortable?",
        "textZh": "有什麼小習慣讓生活變舒服？"
      },
      {
        "id": "topic_v2_40_f7",
        "text": "Which of your habits are you happy to joke about?",
        "textZh": "你願意拿自己的哪個習慣開玩笑？"
      },
      {
        "id": "topic_v2_40_f8",
        "text": "What do you least like people saying about your habits?",
        "textZh": "你最不喜歡別人怎麼評論你的習慣？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A personal routine",
        "A friend’s reaction",
        "A small comfort"
      ],
      "ordinaryShortAnswer": "I always check my bag twice before leaving.",
      "naturalContinuations": [
        "That would make me feel prepared.",
        "Does it ever slow you down?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_41",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Purchase With a Different Ending",
    "shortTitle": "A Purchase With a Different Ending",
    "titleZh": "買下來才知道",
    "shortTitleZh": "買下來才知道",
    "mainQuestion": "Some purchases seem life-changing before we buy them, then turn into a very different story. What have you bought that fits that feeling?",
    "mainQuestionZh": "有些東西買之前像是會改變生活，買之後卻走向完全不同的故事。你買過什麼最符合這種感覺？",
    "entryPrompts": [
      "An expectation",
      "An unused object",
      "An unexpected useful item"
    ],
    "entryPromptsZh": [
      "購買前的期待",
      "沒用到的東西",
      "意外好用的物品"
    ],
    "followUps": [
      {
        "id": "topic_v2_41_f1",
        "text": "What kind of description is most likely to persuade you to buy?",
        "textZh": "你最容易被哪種介紹說服？"
      },
      {
        "id": "topic_v2_41_f2",
        "text": "What failed to meet expectations but found another use?",
        "textZh": "有什麼東西沒達到期待，卻找到別的用途？"
      },
      {
        "id": "topic_v2_41_f3",
        "text": "Do you regret buying something too expensive or too cheap more often?",
        "textZh": "你比較後悔買太好還是買太便宜？"
      },
      {
        "id": "topic_v2_41_f4",
        "text": "How do you deal with things you leave unused?",
        "textZh": "你怎麼面對放著不用的東西？"
      },
      {
        "id": "topic_v2_41_f5",
        "text": "What purchase was really for the person you imagined you would become?",
        "textZh": "什麼購買其實是買一個想像中的自己？"
      },
      {
        "id": "topic_v2_41_f6",
        "text": "Have you been glad a friend talked you out of a purchase?",
        "textZh": "你有沒有被朋友勸退後很慶幸？"
      },
      {
        "id": "topic_v2_41_f7",
        "text": "Which inexpensive thing has lasted a long time?",
        "textZh": "哪件便宜東西反而用了很久？"
      },
      {
        "id": "topic_v2_41_f8",
        "text": "What reminder would you give yourself before that purchase now?",
        "textZh": "你現在會給當時的自己什麼提醒？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An expectation",
        "An unused object",
        "An unexpected useful item"
      ],
      "ordinaryShortAnswer": "I bought a blender and mostly use it for soup.",
      "naturalContinuations": [
        "At least it found a useful job.",
        "What did you expect to make?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_42",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Small Act of Care",
    "shortTitle": "A Small Act of Care",
    "titleZh": "小小的體貼",
    "shortTitleZh": "小小的體貼",
    "mainQuestion": "Some thoughtful gestures take little effort but stay with the person who receives them. What small act of care do you remember most?",
    "mainQuestionZh": "有些體貼對做的人只是順手，卻會讓收到的人記很久。你最記得哪一種小小的照顧？",
    "entryPrompts": [
      "A remembered kindness",
      "A small preference",
      "Care you give"
    ],
    "entryPromptsZh": [
      "記得的善意",
      "生活小偏好",
      "自己付出的照顧"
    ],
    "followUps": [
      {
        "id": "topic_v2_42_f1",
        "text": "What kind of care did you understand only later?",
        "textZh": "什麼照顧你以前不懂，後來才懂？"
      },
      {
        "id": "topic_v2_42_f2",
        "text": "How does it feel when someone remembers a small preference?",
        "textZh": "被記得一個小偏好對你有什麼感覺？"
      },
      {
        "id": "topic_v2_42_f3",
        "text": "Do you prefer someone to ask directly or quietly notice?",
        "textZh": "你比較喜歡對方直接問還是默默注意？"
      },
      {
        "id": "topic_v2_42_f4",
        "text": "What kind of care can feel uncomfortable when there is too much?",
        "textZh": "有什麼照顧太多反而不自在？"
      },
      {
        "id": "topic_v2_42_f5",
        "text": "Which needs do you tend to notice in friends?",
        "textZh": "你平常會留意朋友哪種需要？"
      },
      {
        "id": "topic_v2_42_f6",
        "text": "What kindness has made you want to help someone else?",
        "textZh": "什麼善意讓你也想傳給別人？"
      },
      {
        "id": "topic_v2_42_f7",
        "text": "Has a stranger helped at just the right moment?",
        "textZh": "你遇過陌生人很剛好的幫助嗎？"
      },
      {
        "id": "topic_v2_42_f8",
        "text": "What small detail would you like people to know matters to you?",
        "textZh": "你希望別人知道你其實在意哪個小細節？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A remembered kindness",
        "A small preference",
        "Care you give"
      ],
      "ordinaryShortAnswer": "A friend saved me a seat near the door.",
      "naturalContinuations": [
        "It feels good when someone remembers that.",
        "Had you told them you liked that seat?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_43",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Good Day After Plans Failed",
    "shortTitle": "A Good Day After Plans Failed",
    "titleZh": "計畫失敗後的好事",
    "shortTitleZh": "計畫失敗後的好事",
    "mainQuestion": "Some days do not go to plan, yet leave better memories than the plan would have. Which day would you most like to share?",
    "mainQuestionZh": "有些日子原本的計畫沒成，最後卻留下比計畫更好的回憶。你最想分享哪一次？",
    "entryPrompts": [
      "An changed plan",
      "A helpful companion",
      "A pleasant surprise"
    ],
    "entryPromptsZh": [
      "改變的計畫",
      "同行者的幫助",
      "意外的驚喜"
    ],
    "followUps": [
      {
        "id": "topic_v2_43_f1",
        "text": "How long does it usually take you to let go of an original plan?",
        "textZh": "你通常多久才願意放掉原本計畫？"
      },
      {
        "id": "topic_v2_43_f2",
        "text": "Who around you is good at turning a surprise into something good?",
        "textZh": "身邊誰最會把意外變成好事？"
      },
      {
        "id": "topic_v2_43_f3",
        "text": "Which backup plan would you never have chosen first?",
        "textZh": "什麼替代安排你本來不會主動選？"
      },
      {
        "id": "topic_v2_43_f4",
        "text": "How much can a day go off track and still feel fun?",
        "textZh": "失控到什麼程度你還覺得好玩？"
      },
      {
        "id": "topic_v2_43_f5",
        "text": "Have you missed something by sticking to a plan?",
        "textZh": "你曾經為了照計畫而錯過什麼嗎？"
      },
      {
        "id": "topic_v2_43_f6",
        "text": "Which surprises most need someone to stay calm?",
        "textZh": "哪種意外最需要有人保持冷靜？"
      },
      {
        "id": "topic_v2_43_f7",
        "text": "Did that experience change the way you plan later?",
        "textZh": "那次經驗有改變你之後的安排方式嗎？"
      },
      {
        "id": "topic_v2_43_f8",
        "text": "How much unplanned time would you deliberately leave now?",
        "textZh": "你現在願意刻意留下多少空白？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An changed plan",
        "A helpful companion",
        "A pleasant surprise"
      ],
      "ordinaryShortAnswer": "Rain kept us inside, so we played cards.",
      "naturalContinuations": [
        "That sounds like a good way to spend the afternoon.",
        "Were you disappointed at first?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_44",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "A Small Skill That Comes in Handy",
    "shortTitle": "A Small Skill That Comes in Handy",
    "titleZh": "小本事也有用",
    "shortTitleZh": "小本事也有用",
    "mainQuestion": "Some small skills are useful in daily life, even if they would not help you get a job. What small, unusual skill are you a little proud of?",
    "mainQuestionZh": "有些本事寫不進履歷，卻能在日常突然派上用場。你有什麼不太起眼、但自己有點得意的小本事？",
    "entryPrompts": [
      "A modest ability",
      "A time it helped",
      "A skill you admire"
    ],
    "entryPromptsZh": [
      "自己的小本事",
      "派上用場的時候",
      "佩服別人的能力"
    ],
    "followUps": [
      {
        "id": "topic_v2_44_f1",
        "text": "How did you learn this skill?",
        "textZh": "你是怎麼學會這件事的？"
      },
      {
        "id": "topic_v2_44_f2",
        "text": "When did someone first notice you could do it?",
        "textZh": "什麼場合讓別人第一次發現這個本事？"
      },
      {
        "id": "topic_v2_44_f3",
        "text": "Which small trick have you wanted to learn but still find difficult?",
        "textZh": "你有沒有想學卻一直學不好的小技巧？"
      },
      {
        "id": "topic_v2_44_f4",
        "text": "Which friend has an everyday skill you admire?",
        "textZh": "哪個朋友有你很佩服的日常本事？"
      },
      {
        "id": "topic_v2_44_f5",
        "text": "How would you teach someone who asked?",
        "textZh": "有人請你教的時候，你會怎麼教？"
      },
      {
        "id": "topic_v2_44_f6",
        "text": "Has this ability helped you out of an awkward moment?",
        "textZh": "這個能力有沒有幫你解決過尷尬？"
      },
      {
        "id": "topic_v2_44_f7",
        "text": "What looks simple but is difficult to do?",
        "textZh": "有什麼技能看起來簡單，做起來很難？"
      },
      {
        "id": "topic_v2_44_f8",
        "text": "Which skill with no practical use would you spend time learning?",
        "textZh": "你會願意為什麼沒用的小本事花時間？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A modest ability",
        "A time it helped",
        "A skill you admire"
      ],
      "ordinaryShortAnswer": "I am good at packing bags neatly.",
      "naturalContinuations": [
        "That would help me on trips.",
        "How did you learn to fit things in?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_45",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "What Makes an Ordinary Day Good",
    "shortTitle": "What Makes an Ordinary Day Good",
    "titleZh": "普通日子的快樂配方",
    "shortTitleZh": "普通日子的快樂配方",
    "mainQuestion": "An ordinary day can feel like a good day without a trip or a special meal. Which little moment in your life usually makes that happen?",
    "mainQuestionZh": "不是旅行或大餐，而是一個普通日子也能讓你覺得「今天不錯」。你的生活裡通常是哪個小片段做到這件事？",
    "entryPrompts": [
      "A small pleasure",
      "A familiar routine",
      "Time shared with someone"
    ],
    "entryPromptsZh": [
      "日常小樂趣",
      "熟悉的習慣",
      "和別人共享的時間"
    ],
    "followUps": [
      {
        "id": "topic_v2_45_f1",
        "text": "Which small pleasure needs you to make time for it?",
        "textZh": "什麼小快樂需要你刻意留時間？"
      },
      {
        "id": "topic_v2_45_f2",
        "text": "Do you enjoy it alone or invite someone to join?",
        "textZh": "你喜歡自己享受還是找人一起？"
      },
      {
        "id": "topic_v2_45_f3",
        "text": "What looks ordinary but is worth waiting for?",
        "textZh": "什麼東西看起來普通卻很值得等？"
      },
      {
        "id": "topic_v2_45_f4",
        "text": "Which enjoyment is first to disappear when you get busy?",
        "textZh": "忙起來時最先被犧牲的樂趣是什麼？"
      },
      {
        "id": "topic_v2_45_f5",
        "text": "How did you discover you really liked it?",
        "textZh": "你怎麼發現自己真正喜歡這件事？"
      },
      {
        "id": "topic_v2_45_f6",
        "text": "Would the habit change if a friend joined you?",
        "textZh": "朋友加入後，這個習慣會變得不同嗎？"
      },
      {
        "id": "topic_v2_45_f7",
        "text": "What free pleasure would you recommend?",
        "textZh": "有什麼免費的快樂你很推薦？"
      },
      {
        "id": "topic_v2_45_f8",
        "text": "How could you keep some of that feeling in a busy week?",
        "textZh": "你會怎麼把這種感覺留在忙碌的一週裡？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A small pleasure",
        "A familiar routine",
        "Time shared with someone"
      ],
      "ordinaryShortAnswer": "A short walk after dinner makes my day better.",
      "naturalContinuations": [
        "I like that before it gets dark.",
        "Would you still go in light rain?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_46",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "An Interest You Found by Accident",
    "shortTitle": "An Interest You Found by Accident",
    "titleZh": "意外走進一個新世界",
    "shortTitleZh": "意外走進一個新世界",
    "mainQuestion": "You tried something casually and unexpectedly became more and more interested. What drew you into that world?",
    "mainQuestionZh": "你原本只是隨便試試，卻意外對某件事越來越有興趣。是什麼把你帶進那個世界？",
    "entryPrompts": [
      "A first try",
      "A surprising detail",
      "A change in your routine"
    ],
    "entryPromptsZh": [
      "第一次嘗試",
      "意外發現的細節",
      "日常的改變"
    ],
    "followUps": [
      {
        "id": "topic_v2_46_f1",
        "text": "What first made you want to try it again?",
        "textZh": "最初哪個小部分讓你想再試一次？"
      },
      {
        "id": "topic_v2_46_f2",
        "text": "What did you misunderstand about it at first?",
        "textZh": "你對這件事原本有什麼誤解？"
      },
      {
        "id": "topic_v2_46_f3",
        "text": "Would starting with someone else make a big difference?",
        "textZh": "有人陪你開始，會有很大差別嗎？"
      },
      {
        "id": "topic_v2_46_f4",
        "text": "What did you learn that surprised you most?",
        "textZh": "你後來最意外學到什麼？"
      },
      {
        "id": "topic_v2_46_f5",
        "text": "When did you notice you had become very involved?",
        "textZh": "什麼時候你發現自己已經投入很多？"
      },
      {
        "id": "topic_v2_46_f6",
        "text": "How would you introduce it to someone who knew nothing about it?",
        "textZh": "你會怎麼介紹給完全沒接觸的人？"
      },
      {
        "id": "topic_v2_46_f7",
        "text": "Has this interest changed your friendships or daily routine?",
        "textZh": "這個興趣有改變你的交友或日常嗎？"
      },
      {
        "id": "topic_v2_46_f8",
        "text": "What else would you like to try casually now?",
        "textZh": "你現在還有什麼想隨便試試的事？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A first try",
        "A surprising detail",
        "A change in your routine"
      ],
      "ordinaryShortAnswer": "I tried baking once and wanted to try again.",
      "naturalContinuations": [
        "I enjoy seeing something finished too.",
        "What did you make first?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_47",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "Effort People Do Not See",
    "shortTitle": "Effort People Do Not See",
    "titleZh": "沒被看見的努力",
    "shortTitleZh": "沒被看見的努力",
    "mainQuestion": "Some things look small from the outside but take real effort to do well. What would you like people to understand is not as easy as it looks?",
    "mainQuestionZh": "有些事情看起來只是小事，做好卻花了你不少心力。你最希望別人能理解哪一種「其實沒那麼容易」？",
    "entryPrompts": [
      "An ordinary task",
      "A hidden difficulty",
      "Useful support"
    ],
    "entryPromptsZh": [
      "普通事情",
      "不易看見的難處",
      "真正有用的支持"
    ],
    "followUps": [
      {
        "id": "topic_v2_47_f1",
        "text": "Which part is easiest for others to overlook?",
        "textZh": "哪個部分最容易被忽略？"
      },
      {
        "id": "topic_v2_47_f2",
        "text": "How do you usually react when someone notices?",
        "textZh": "有人注意到時，你通常有什麼反應？"
      },
      {
        "id": "topic_v2_47_f3",
        "text": "What effort by someone else did you underestimate before?",
        "textZh": "你以前有低估過別人的什麼付出？"
      },
      {
        "id": "topic_v2_47_f4",
        "text": "How do you decide when something is good enough?",
        "textZh": "你怎麼決定一件事做到什麼程度就好？"
      },
      {
        "id": "topic_v2_47_f5",
        "text": "What kind of help actually makes the work easier?",
        "textZh": "什麼幫忙是真的減輕負擔？"
      },
      {
        "id": "topic_v2_47_f6",
        "text": "Are you comfortable letting people see the unfinished process?",
        "textZh": "你願意讓別人看見還沒做好的過程嗎？"
      },
      {
        "id": "topic_v2_47_f7",
        "text": "What have you learned not to expect yourself to do perfectly?",
        "textZh": "有什麼事情你學會不再要求自己完美？"
      },
      {
        "id": "topic_v2_47_f8",
        "text": "What response is more useful than simply thanking you for your hard work?",
        "textZh": "什麼回饋比一句辛苦了更有用？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "An ordinary task",
        "A hidden difficulty",
        "Useful support"
      ],
      "ordinaryShortAnswer": "Planning a meal for different tastes takes time.",
      "naturalContinuations": [
        "I usually only notice when the food is ready.",
        "What help would save you the most effort?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  },
  {
    "id": "topic_v2_48",
    "contentVersion": "chat-wolf-content-20261002",
    "category": "personal-experiences",
    "title": "Enjoyment You Do Not Want to Outgrow",
    "shortTitle": "Enjoyment You Do Not Want to Outgrow",
    "titleZh": "長大也不想放掉的喜歡",
    "shortTitleZh": "長大也不想放掉的喜歡",
    "mainQuestion": "Some things you enjoy get called childish, but you do not see why growing up means giving them up. Which enjoyment would you stand up for?",
    "mainQuestionZh": "有些喜歡被別人說有點幼稚，你卻覺得長大也沒有必要放掉。你最想替自己的哪一種喜歡說話？",
    "entryPrompts": [
      "A lasting interest",
      "A friend’s view",
      "A pleasure you returned to"
    ],
    "entryPromptsZh": [
      "一直喜歡的事",
      "朋友的看法",
      "重新找回的樂趣"
    ],
    "followUps": [
      {
        "id": "topic_v2_48_f1",
        "text": "When did you first start enjoying it?",
        "textZh": "你最初是什麼時候喜歡上它的？"
      },
      {
        "id": "topic_v2_48_f2",
        "text": "Would you admit it openly with both friends and strangers?",
        "textZh": "你會在熟人和陌生人面前都大方承認嗎？"
      },
      {
        "id": "topic_v2_48_f3",
        "text": "Who shares this enjoyment with you?",
        "textZh": "有誰和你一起保留這種樂趣？"
      },
      {
        "id": "topic_v2_48_f4",
        "text": "How much does looking mature matter to you?",
        "textZh": "別人覺得成熟對你有多重要？"
      },
      {
        "id": "topic_v2_48_f5",
        "text": "Have you given up something you enjoyed and later returned to it?",
        "textZh": "你曾經放掉一個喜歡，後來又找回來嗎？"
      },
      {
        "id": "topic_v2_48_f6",
        "text": "What feeling does this interest give you that other things do not?",
        "textZh": "這個興趣帶給你什麼別的事情沒有的感覺？"
      },
      {
        "id": "topic_v2_48_f7",
        "text": "How would you answer a friendly joke about it?",
        "textZh": "你會怎麼回應別人善意的吐槽？"
      },
      {
        "id": "topic_v2_48_f8",
        "text": "What pleasure do you hope to keep enjoying later in life?",
        "textZh": "有什麼樂趣你希望以後仍然保留？"
      }
    ],
    "tags": [
      "personal-experiences"
    ],
    "active": true,
    "reviewed": true,
    "audit": {
      "standaloneContext": true,
      "entryAngles": [
        "A lasting interest",
        "A friend’s view",
        "A pleasure you returned to"
      ],
      "ordinaryShortAnswer": "I still enjoy building toy houses.",
      "naturalContinuations": [
        "I like making small things too.",
        "Do you build alone or with someone?"
      ],
      "allowsImaginedAnswer": true,
      "playerRequirements": []
    }
  }
];
 const appendixTasks = [
  {
    "id": "wolf_v4_01",
    "sourceExampleId": "wolf_example_v2_01",
    "text": "Get a non-wolf to choose which of two things you could leave out of your luggage.",
    "textZh": "讓一位非狼玩家，選出你兩件行李中比較不必帶的一件。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "discard_one_of_two",
    "mechanicKey": "discard_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_01",
    "compatibleTopicIds": [
      "topic_v2_01"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_02",
    "sourceExampleId": "wolf_example_v2_02",
    "text": "Get a non-wolf to choose a window or aisle seat for you.",
    "textZh": "讓一位非狼玩家，替你選靠窗或靠走道的座位。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_02",
    "compatibleTopicIds": [
      "topic_v2_01"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_03",
    "sourceExampleId": "wolf_example_v2_03",
    "text": "Sing “I do not want to get up early.”",
    "textZh": "唱出「I do not want to get up early.」。",
    "type": "self_action",
    "family": "singing",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "canonicalTaskKey": "wolf_canonical_v4_03",
    "compatibleTopicIds": [
      "topic_v2_01"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "I do not want to get up early."
    ],
    "positiveClues": [
      "One task involves singing a short line."
    ],
    "positiveCluesZh": [
      "有一項任務與唱出短句有關。"
    ]
  },
  {
    "id": "wolf_v4_04",
    "sourceExampleId": "wolf_example_v2_04",
    "text": "Say “My suitcase needs a holiday too.”",
    "textZh": "說出「My suitcase needs a holiday too.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "canonicalTaskKey": "wolf_canonical_v4_04",
    "compatibleTopicIds": [
      "topic_v2_01"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "My suitcase needs a holiday too."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_05",
    "sourceExampleId": "wolf_example_v2_05",
    "text": "Get a non-wolf to choose dishwashing or taking out the rubbish for you.",
    "textZh": "讓一位非狼玩家，替你選洗碗或倒垃圾其中一項家事。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_05",
    "compatibleTopicIds": [
      "topic_v2_02"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_06",
    "sourceExampleId": "wolf_example_v2_06",
    "text": "Get a non-wolf to suggest what you could do when you get hungry at midnight.",
    "textZh": "讓一位非狼玩家，替你的半夜肚子餓想一個辦法。",
    "type": "interaction",
    "family": "advice",
    "variantGroup": "practical_suggestion",
    "mechanicKey": "practical_suggestion",
    "canonicalTaskKey": "wolf_canonical_v4_06",
    "compatibleTopicIds": [
      "topic_v2_02"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "advice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves asking for practical help."
    ],
    "positiveCluesZh": [
      "有一項任務與請別人提供實用幫助有關。"
    ]
  },
  {
    "id": "wolf_v4_07",
    "sourceExampleId": "wolf_example_v2_07",
    "text": "Make a doorbell sound with your voice.",
    "textZh": "用嘴巴模仿一次門鈴聲。",
    "type": "self_action",
    "family": "sound_effect",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "canonicalTaskKey": "wolf_canonical_v4_07",
    "compatibleTopicIds": [
      "topic_v2_02"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a sound effect."
    ],
    "positiveCluesZh": [
      "有一項任務與音效有關。"
    ]
  },
  {
    "id": "wolf_v4_08",
    "sourceExampleId": "wolf_example_v2_08",
    "text": "Say “I vote for a self-cleaning sink.”",
    "textZh": "說出「I vote for a self-cleaning sink.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "impossible_household_helper",
    "mechanicKey": "impossible_household_helper",
    "canonicalTaskKey": "say-self-cleaning-sink",
    "compatibleTopicIds": [
      "topic_v2_02"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "I vote for a self-cleaning sink."
    ],
    "adaptationReason": "Third-person self-name action removed by prior user override.",
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_09",
    "sourceExampleId": "wolf_example_v2_09",
    "text": "Get a non-wolf to name a food they would not want to eat with fries.",
    "textZh": "讓一位非狼玩家，說出一樣他不想配薯條吃的食物。",
    "type": "interaction",
    "family": "food_choice",
    "variantGroup": "reject_food_pairing",
    "mechanicKey": "reject_food_pairing",
    "canonicalTaskKey": "wolf_canonical_v4_09",
    "compatibleTopicIds": [
      "topic_v2_08"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "food_choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves an unusual food combination."
    ],
    "positiveCluesZh": [
      "有一項任務與食物搭配有關。"
    ]
  },
  {
    "id": "wolf_v4_10",
    "sourceExampleId": "wolf_example_v2_10",
    "text": "Get a non-wolf to suggest a way to fix food that is too salty.",
    "textZh": "讓一位非狼玩家，建議菜太鹹時怎麼補救。",
    "type": "interaction",
    "family": "advice",
    "variantGroup": "practical_suggestion",
    "mechanicKey": "practical_suggestion",
    "canonicalTaskKey": "wolf_canonical_v4_10",
    "compatibleTopicIds": [
      "topic_v2_08"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "advice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves asking for practical help."
    ],
    "positiveCluesZh": [
      "有一項任務與請別人提供實用幫助有關。"
    ]
  },
  {
    "id": "wolf_v4_11",
    "sourceExampleId": "wolf_example_v2_11",
    "text": "Say “I am hungry” three times in a row.",
    "textZh": "連說三次「I am hungry」。",
    "type": "self_action",
    "family": "repetition",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "canonicalTaskKey": "wolf_canonical_v4_11",
    "compatibleTopicIds": [
      "topic_v2_08"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "I am hungry"
    ],
    "positiveClues": [
      "One task involves repeating a phrase."
    ],
    "positiveCluesZh": [
      "有一項任務與重複短句有關。"
    ]
  },
  {
    "id": "wolf_v4_12",
    "sourceExampleId": "wolf_example_v2_12",
    "text": "Say “This kitchen needs a babysitter.”",
    "textZh": "說出「This kitchen needs a babysitter.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "place_as_child",
    "mechanicKey": "place_as_child",
    "canonicalTaskKey": "wolf_canonical_v4_12",
    "compatibleTopicIds": [
      "topic_v2_08"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "This kitchen needs a babysitter."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_13",
    "sourceExampleId": "wolf_example_v2_13",
    "text": "Get a non-wolf to choose ice cream fries or curry bread for your shop.",
    "textZh": "讓一位非狼玩家，替你選賣冰淇淋薯條或咖哩麵包。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_13",
    "compatibleTopicIds": [
      "topic_v2_09"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_14",
    "sourceExampleId": "wolf_example_v2_14",
    "text": "Get a non-wolf to suggest a reply to a customer complaining about the wait.",
    "textZh": "讓一位非狼玩家，幫你想一句回覆抱怨等太久的客人。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_14",
    "compatibleTopicIds": [
      "topic_v2_09"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_15",
    "sourceExampleId": "wolf_example_v2_15",
    "text": "Quote a price of ten thousand dollars for one bottle of water in the shop.",
    "textZh": "替店裡一瓶水喊出「一萬塊」的售價。",
    "type": "self_action",
    "family": "absurd_price",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "canonicalTaskKey": "wolf_canonical_v4_15",
    "compatibleTopicIds": [
      "topic_v2_09"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task uses an unrealistic amount of money."
    ],
    "positiveCluesZh": [
      "有一項任務與不合理的金額有關。"
    ]
  },
  {
    "id": "wolf_v4_16",
    "sourceExampleId": "wolf_example_v2_16",
    "text": "Say “My slippers need a salary too.”",
    "textZh": "說出「My slippers need a salary too.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "canonicalTaskKey": "wolf_canonical_v4_16",
    "compatibleTopicIds": [
      "topic_v2_09"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "My slippers need a salary too."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_17",
    "sourceExampleId": "wolf_example_v2_17",
    "text": "Get a non-wolf to choose whether your birthday budget should go to cake or decorations.",
    "textZh": "讓一位非狼玩家，替你選把生日預算花在蛋糕或裝飾。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_17",
    "compatibleTopicIds": [
      "topic_v2_10"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_18",
    "sourceExampleId": "wolf_example_v2_18",
    "text": "Get a non-wolf to suggest a birthday wish you could say.",
    "textZh": "讓一位非狼玩家，幫你想一句給壽星的祝福。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_18",
    "compatibleTopicIds": [
      "topic_v2_10"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_19",
    "sourceExampleId": "wolf_example_v2_19",
    "text": "Sing “Today, you are the boss.”",
    "textZh": "把「Today, you are the boss.」唱出來。",
    "type": "self_action",
    "family": "singing",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "canonicalTaskKey": "wolf_canonical_v4_19",
    "compatibleTopicIds": [
      "topic_v2_10"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "Today, you are the boss."
    ],
    "positiveClues": [
      "One task involves singing a short line."
    ],
    "positiveCluesZh": [
      "有一項任務與唱出短句有關。"
    ]
  },
  {
    "id": "wolf_v4_20",
    "sourceExampleId": "wolf_example_v2_20",
    "text": "Clap three times.",
    "textZh": "鼓掌三下。",
    "type": "self_action",
    "family": "clapping",
    "variantGroup": "three_audible_beats",
    "mechanicKey": "three_audible_beats",
    "canonicalTaskKey": "clap-three-audible-beats",
    "compatibleTopicIds": [
      "topic_v2_10",
      "topic_v2_11",
      "topic_v2_44",
      "topic_v2_45"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": true,
    "performanceGroup": null,
    "actionTags": [
      "clapping"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task uses an audible action with the hands."
    ],
    "positiveCluesZh": [
      "有一項任務會用到聽得見的手部動作。"
    ]
  },
  {
    "id": "wolf_v4_21",
    "sourceExampleId": "wolf_example_v2_21",
    "text": "Get a non-wolf to suggest a side effect of instant cleaning.",
    "textZh": "讓一位非狼玩家，替「瞬間打掃」想一個副作用。",
    "type": "interaction",
    "family": "imagined_cost",
    "variantGroup": "suggest_one_downside",
    "mechanicKey": "suggest_one_downside",
    "canonicalTaskKey": "wolf_canonical_v4_21",
    "compatibleTopicIds": [
      "topic_v2_17"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagined_cost"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves the cost of a useful power."
    ],
    "positiveCluesZh": [
      "有一項任務與能力帶來的代價有關。"
    ]
  },
  {
    "id": "wolf_v4_22",
    "sourceExampleId": "wolf_example_v2_22",
    "text": "Get a non-wolf to say which chore they would not want a superpower to do for them.",
    "textZh": "讓一位非狼玩家，說出一件他不想讓超能力代勞的家事。",
    "type": "interaction",
    "family": "boundary",
    "variantGroup": "exclude_one_use",
    "mechanicKey": "exclude_one_use",
    "canonicalTaskKey": "wolf_canonical_v4_22",
    "compatibleTopicIds": [
      "topic_v2_17"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "boundary"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a limit on using a power."
    ],
    "positiveCluesZh": [
      "有一項任務與使用能力的界線有關。"
    ]
  },
  {
    "id": "wolf_v4_23",
    "sourceExampleId": "wolf_example_v2_23",
    "text": "Make a “whoosh” sound to switch on your imaginary power.",
    "textZh": "用嘴巴發出一次超能力啟動的「whoosh」聲。",
    "type": "self_action",
    "family": "sound_effect",
    "variantGroup": "imitate_activation_sound",
    "mechanicKey": "imitate_activation_sound",
    "canonicalTaskKey": "wolf_canonical_v4_23",
    "compatibleTopicIds": [
      "topic_v2_17"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "whoosh"
    ],
    "positiveClues": [
      "One task involves a sound effect."
    ],
    "positiveCluesZh": [
      "有一項任務與音效有關。"
    ]
  },
  {
    "id": "wolf_v4_24",
    "sourceExampleId": "wolf_example_v2_24",
    "text": "Say “My superpower is taking a day off.”",
    "textZh": "說出「My superpower is taking a day off.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "canonicalTaskKey": "wolf_canonical_v4_24",
    "compatibleTopicIds": [
      "topic_v2_17"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "My superpower is taking a day off."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_25",
    "sourceExampleId": "wolf_example_v2_25",
    "text": "Get a non-wolf to suggest a polite way for you to turn down a gift.",
    "textZh": "讓一位非狼玩家，幫你想一句婉拒禮物的回覆。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_25",
    "compatibleTopicIds": [
      "topic_v2_25"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_26",
    "sourceExampleId": "wolf_example_v2_26",
    "text": "Get a non-wolf to choose a photo frame or flowers for you to give as a gift.",
    "textZh": "讓一位非狼玩家，替你選送相框或花束。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_26",
    "compatibleTopicIds": [
      "topic_v2_25"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_27",
    "sourceExampleId": "wolf_example_v2_27",
    "text": "Sing “Thank you for the gift.”",
    "textZh": "把「Thank you for the gift.」唱出來。",
    "type": "self_action",
    "family": "singing",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "canonicalTaskKey": "wolf_canonical_v4_27",
    "compatibleTopicIds": [
      "topic_v2_25"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "Thank you for the gift."
    ],
    "positiveClues": [
      "One task involves singing a short line."
    ],
    "positiveCluesZh": [
      "有一項任務與唱出短句有關。"
    ]
  },
  {
    "id": "wolf_v4_28",
    "sourceExampleId": "wolf_example_v2_28",
    "text": "Say “This gift needs a home more than I do.”",
    "textZh": "說出「This gift needs a home more than I do.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "object_needs_home",
    "mechanicKey": "object_needs_home",
    "canonicalTaskKey": "wolf_canonical_v4_28",
    "compatibleTopicIds": [
      "topic_v2_25"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "This gift needs a home more than I do."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_29",
    "sourceExampleId": "wolf_example_v2_29",
    "text": "Get a non-wolf to choose splitting the next bill equally or taking turns treating the group.",
    "textZh": "讓一位非狼玩家，替你選下次平均分帳或輪流請客。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_29",
    "compatibleTopicIds": [
      "topic_v2_26"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_30",
    "sourceExampleId": "wolf_example_v2_30",
    "text": "Get a non-wolf to suggest how you could remind a friend to repay their share of dinner.",
    "textZh": "讓一位非狼玩家，幫你想一句提醒朋友還餐費的話。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_30",
    "compatibleTopicIds": [
      "topic_v2_26"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_31",
    "sourceExampleId": "wolf_example_v2_31",
    "text": "Say “My wallet wants to quit.”",
    "textZh": "說出「My wallet wants to quit.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "canonicalTaskKey": "wolf_canonical_v4_31",
    "compatibleTopicIds": [
      "topic_v2_26"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "My wallet wants to quit."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_32",
    "sourceExampleId": "wolf_example_v2_32",
    "text": "Offer to pay the dinner bill with one million imaginary coins.",
    "textZh": "提議用一百萬枚想像中的硬幣付餐費。",
    "type": "self_action",
    "family": "absurd_price",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "canonicalTaskKey": "pay-dinner-million-imaginary-coins",
    "compatibleTopicIds": [
      "topic_v2_26"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "adaptationReason": "Third-person self-name action removed by prior user override.",
    "positiveClues": [
      "One task uses an unrealistic amount of money."
    ],
    "positiveCluesZh": [
      "有一項任務與不合理的金額有關。"
    ]
  },
  {
    "id": "wolf_v4_33",
    "sourceExampleId": "wolf_example_v2_33",
    "text": "Get a non-wolf to suggest a polite reply declining tonight’s gathering.",
    "textZh": "讓一位非狼玩家，幫你想一句婉拒今晚聚會的回覆。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_33",
    "compatibleTopicIds": [
      "topic_v2_30"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_34",
    "sourceExampleId": "wolf_example_v2_34",
    "text": "Get a non-wolf to choose staying home or walking in the park for you.",
    "textZh": "讓一位非狼玩家，替你選待在家或去公園散步。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_34",
    "compatibleTopicIds": [
      "topic_v2_30"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_35",
    "sourceExampleId": "wolf_example_v2_35",
    "text": "Say “I promised my sofa I would stay home tonight.”",
    "textZh": "說出「I promised my sofa I would stay home tonight.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "promise_to_object",
    "mechanicKey": "promise_to_object",
    "canonicalTaskKey": "wolf_canonical_v4_35",
    "compatibleTopicIds": [
      "topic_v2_30"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "I promised my sofa I would stay home tonight."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_36",
    "sourceExampleId": "wolf_example_v2_36",
    "text": "Make a phone vibration sound with your voice.",
    "textZh": "用嘴巴模仿一次手機震動聲。",
    "type": "self_action",
    "family": "sound_effect",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "canonicalTaskKey": "wolf_canonical_v4_36",
    "compatibleTopicIds": [
      "topic_v2_30"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a sound effect."
    ],
    "positiveCluesZh": [
      "有一項任務與音效有關。"
    ]
  },
  {
    "id": "wolf_v4_37",
    "sourceExampleId": "wolf_example_v2_37",
    "text": "Get a non-wolf to choose whether your assistant should buy breakfast daily or groceries for the whole week.",
    "textZh": "讓一位非狼玩家，替你選讓助理每天買早餐或一次買整週食材。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "choose_one_of_two",
    "mechanicKey": "choose_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_37",
    "compatibleTopicIds": [
      "topic_v2_33"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_38",
    "sourceExampleId": "wolf_example_v2_38",
    "text": "Get a non-wolf to suggest a reply when your assistant recommends the same restaurant again.",
    "textZh": "讓一位非狼玩家，替你想一句拒絕助理推薦同一家餐廳的話。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_38",
    "compatibleTopicIds": [
      "topic_v2_33"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_39",
    "sourceExampleId": "wolf_example_v2_39",
    "text": "Say “My assistant should decide whether I get out of bed first.”",
    "textZh": "說出「My assistant should decide whether I get out of bed first.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "delegate_trivial_choice",
    "mechanicKey": "delegate_trivial_choice",
    "canonicalTaskKey": "wolf_canonical_v4_39",
    "compatibleTopicIds": [
      "topic_v2_33"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "My assistant should decide whether I get out of bed first."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  },
  {
    "id": "wolf_v4_40",
    "sourceExampleId": "wolf_example_v2_40",
    "text": "Stretch the last word of one answer for three seconds.",
    "textZh": "把一句回答的最後一個詞拖長三秒。",
    "type": "self_action",
    "family": "vocal_timing",
    "variantGroup": "stretch_last_word",
    "mechanicKey": "stretch_last_word",
    "canonicalTaskKey": "stretch-final-word-three-seconds",
    "compatibleTopicIds": [
      "topic_v2_33"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "vocal_timing"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task changes the timing of speech."
    ],
    "positiveCluesZh": [
      "有一項任務會改變說話的節奏。"
    ]
  },
  {
    "id": "wolf_v4_41",
    "sourceExampleId": "wolf_example_v2_41",
    "text": "Get a non-wolf to choose which of two old things you should throw away.",
    "textZh": "讓一位非狼玩家，選出你兩件舊物中比較該丟的一件。",
    "type": "interaction",
    "family": "choice",
    "variantGroup": "discard_one_of_two",
    "mechanicKey": "discard_one_of_two",
    "canonicalTaskKey": "wolf_canonical_v4_41",
    "compatibleTopicIds": [
      "topic_v2_37"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves a specific choice."
    ],
    "positiveCluesZh": [
      "有一項任務與具體選擇有關。"
    ]
  },
  {
    "id": "wolf_v4_42",
    "sourceExampleId": "wolf_example_v2_42",
    "text": "Get a non-wolf to suggest a way to keep old ticket stubs.",
    "textZh": "讓一位非狼玩家，建議一個保存舊票根的辦法。",
    "type": "interaction",
    "family": "advice",
    "variantGroup": "practical_suggestion",
    "mechanicKey": "practical_suggestion",
    "canonicalTaskKey": "wolf_canonical_v4_42",
    "compatibleTopicIds": [
      "topic_v2_37"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "advice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves asking for practical help."
    ],
    "positiveCluesZh": [
      "有一項任務與請別人提供實用幫助有關。"
    ]
  },
  {
    "id": "wolf_v4_43",
    "sourceExampleId": "wolf_example_v2_43",
    "text": "Say “Thank you for your hard work” to an old object you mention.",
    "textZh": "向你提到的一件舊物說「Thank you for your hard work」。",
    "type": "self_action",
    "family": "address_object",
    "variantGroup": "thank_object",
    "mechanicKey": "thank_object",
    "canonicalTaskKey": "wolf_canonical_v4_43",
    "compatibleTopicIds": [
      "topic_v2_37"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "address_object"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "Thank you for your hard work"
    ],
    "positiveClues": [
      "One task speaks directly to an object."
    ],
    "positiveCluesZh": [
      "有一項任務會直接對物品說話。"
    ]
  },
  {
    "id": "wolf_v4_44",
    "sourceExampleId": "wolf_example_v2_44",
    "text": "Quote a price of one million for an old object you mention.",
    "textZh": "替你提到的一件舊物報價一百萬。",
    "type": "self_action",
    "family": "absurd_price",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "canonicalTaskKey": "wolf_canonical_v4_44",
    "compatibleTopicIds": [
      "topic_v2_37"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task uses an unrealistic amount of money."
    ],
    "positiveCluesZh": [
      "有一項任務與不合理的金額有關。"
    ]
  },
  {
    "id": "wolf_v4_45",
    "sourceExampleId": "wolf_example_v2_45",
    "text": "Get a non-wolf to suggest a reply after you send a message to the wrong person.",
    "textZh": "讓一位非狼玩家，幫你想一句傳錯訊息後的回覆。",
    "type": "interaction",
    "family": "reply",
    "variantGroup": "compose_short_reply",
    "mechanicKey": "compose_short_reply",
    "canonicalTaskKey": "wolf_canonical_v4_45",
    "compatibleTopicIds": [
      "topic_v2_38"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "reply"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves finding words for a reply."
    ],
    "positiveCluesZh": [
      "有一項任務與想一句回覆有關。"
    ]
  },
  {
    "id": "wolf_v4_46",
    "sourceExampleId": "wolf_example_v2_46",
    "text": "Get a non-wolf to suggest what you could do if you forgot your keys.",
    "textZh": "讓一位非狼玩家，建議忘記帶鑰匙時怎麼辦。",
    "type": "interaction",
    "family": "advice",
    "variantGroup": "practical_suggestion",
    "mechanicKey": "practical_suggestion",
    "canonicalTaskKey": "wolf_canonical_v4_46",
    "compatibleTopicIds": [
      "topic_v2_38"
    ],
    "requiredOtherPlayerCount": 1,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "advice"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [],
    "positiveClues": [
      "One task involves asking for practical help."
    ],
    "positiveCluesZh": [
      "有一項任務與請別人提供實用幫助有關。"
    ]
  },
  {
    "id": "wolf_v4_47",
    "sourceExampleId": "wolf_example_v2_47",
    "text": "Add a “ta-da” sound effect to a small mistake you describe.",
    "textZh": "替你說到的小失誤配一次「ta-da」音效。",
    "type": "self_action",
    "family": "sound_effect",
    "variantGroup": "self_added_story_sound",
    "mechanicKey": "self_added_story_sound",
    "canonicalTaskKey": "wolf_canonical_v4_47",
    "compatibleTopicIds": [
      "topic_v2_38"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "ta-da"
    ],
    "positiveClues": [
      "One task involves a sound effect."
    ],
    "positiveCluesZh": [
      "有一項任務與音效有關。"
    ]
  },
  {
    "id": "wolf_v4_48",
    "sourceExampleId": "wolf_example_v2_48",
    "text": "Say “This mistake does not represent my official position.”",
    "textZh": "說出「This mistake does not represent my official position.」。",
    "type": "self_action",
    "family": "fixed_phrase",
    "variantGroup": "absurd_disclaimer",
    "mechanicKey": "absurd_disclaimer",
    "canonicalTaskKey": "wolf_canonical_v4_48",
    "compatibleTopicIds": [
      "topic_v2_38"
    ],
    "requiredOtherPlayerCount": 0,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "fixed_phrase"
    ],
    "active": true,
    "status": "active",
    "reviewed": true,
    "activityLanguage": "en",
    "requiredUtterances": [
      "This mistake does not represent my official position."
    ],
    "positiveClues": [
      "One task uses a particular playful sentence."
    ],
    "positiveCluesZh": [
      "有一項任務會用到指定的趣味句子。"
    ]
  }
];
 const previousVillageTasks=taxonomy.normalize(Array.isArray(village)?village:village.tasks);
 const villageTasks=taxonomy.normalize(revisedVillage.tasks);
 const clueInfo = {
  "choice": [
    "One task involves a specific choice.",
    "有一項任務與具體選擇有關。",
    "No wolf task requires someone to choose between specific options.",
    "本局沒有要求別人在具體選項之間作選擇的狼任務。"
  ],
  "advice": [
    "One task involves asking for practical help.",
    "有一項任務與請別人提供實用幫助有關。",
    "No wolf task requires getting a practical suggestion.",
    "本局沒有要求取得實用建議的狼任務。"
  ],
  "reply": [
    "One task involves finding words for a reply.",
    "有一項任務與想一句回覆有關。",
    "No wolf task requires someone to suggest a reply.",
    "本局沒有要求別人提供回覆說法的狼任務。"
  ],
  "food_choice": [
    "One task involves an unusual food combination.",
    "有一項任務與食物搭配有關。",
    "No wolf task requires rejecting a food combination.",
    "本局沒有要求否定食物搭配的狼任務。"
  ],
  "imagined_cost": [
    "One task involves the cost of a useful power.",
    "有一項任務與能力帶來的代價有關。",
    "No wolf task requires suggesting a downside of a power.",
    "本局沒有要求想出能力缺點的狼任務。"
  ],
  "boundary": [
    "One task involves a limit on using a power.",
    "有一項任務與使用能力的界線有關。",
    "No wolf task requires excluding a use of a power.",
    "本局沒有要求排除某種能力用途的狼任務。"
  ],
  "singing": [
    "One task involves singing a short line.",
    "有一項任務與唱出短句有關。",
    "No wolf task requires singing.",
    "本局沒有以唱歌為條件的狼任務。"
  ],
  "fixed_phrase": [
    "One task uses a particular playful sentence.",
    "有一項任務會用到指定的趣味句子。",
    "No wolf task requires saying a fixed sentence.",
    "本局沒有要求說出指定句子的狼任務。"
  ],
  "sound_effect": [
    "One task involves a sound effect.",
    "有一項任務與音效有關。",
    "No wolf task requires making a sound effect.",
    "本局沒有要求製造音效的狼任務。"
  ],
  "repetition": [
    "One task involves repeating a phrase.",
    "有一項任務與重複短句有關。",
    "No wolf task requires repeating a phrase.",
    "本局沒有要求重複短句的狼任務。"
  ],
  "absurd_price": [
    "One task uses an unrealistic amount of money.",
    "有一項任務與不合理的金額有關。",
    "No wolf task requires quoting an unrealistic price or payment.",
    "本局沒有要求提出荒謬價格或付款的狼任務。"
  ],
  "clapping": [
    "One task uses an audible action with the hands.",
    "有一項任務會用到聽得見的手部動作。",
    "No wolf task requires clapping.",
    "本局沒有要求鼓掌的狼任務。"
  ],
  "vocal_timing": [
    "One task changes the timing of speech.",
    "有一項任務會改變說話的節奏。",
    "No wolf task requires stretching a word.",
    "本局沒有要求拖長詞語的狼任務。"
  ],
  "address_object": [
    "One task speaks directly to an object.",
    "有一項任務會直接對物品說話。",
    "No wolf task requires addressing an object.",
    "本局沒有要求直接對物品說話的狼任務。"
  ]
};
 const legacyTopicMap = {
  "travel-friends": "topic_v2_01",
  "home-habits": "topic_v2_02",
  "music": "topic_v2_03",
  "free-weekends": "topic_v2_04",
  "working-together": "topic_v2_05",
  "phones": "topic_v2_06",
  "meeting-people": "topic_v2_07",
  "cooking": "topic_v2_08",
  "home-space": "topic_v2_16",
  "quiet-places": "topic_v2_16",
  "daily-superpowers": "topic_v2_17",
  "extra-hour": "topic_v2_19",
  "talking-objects": "topic_v2_20",
  "small-mistakes": "topic_v2_38",
  "gifts": "topic_v2_25",
  "invitations": "topic_v2_30",
  "helping": "topic_v2_29",
  "keepsakes": "topic_v2_37",
  "spending-rules": "topic_v2_41",
  "learning-skills": "topic_v2_44",
  "hobbies": "topic_v2_46",
  "childhood-interests": "topic_v2_48",
  "small-luxuries": "topic_v2_45",
  "neighborhoods": "topic_v2_14"
};
 const oldGroups = {singing:'sing_short_phrase',clapping:'three_audible_beats',tapping:'three_audible_beats',sound_effect:'imitate_alert_sound',humming:'sing_short_phrase',stretched_word:'stretch_last_word',word_repetition:'repeat_same_phrase_consecutively',veto:'discard_one_of_two',recommendation:'practical_suggestion',imaginary_price:'quote_absurd_price',object_apology:'apologize_to_object'};
 const removedMechanics = new Set(['coined_word','nickname','movie_title','address_title','robot_voice','announcement','future_memory','prediction']);
 const legacyTaskMap = Object.fromEntries((legacy?.wolfTasks || []).map(t => [t.id, {
   canonicalTaskKey: t.id==='w3-s002'?'clap-three-audible-beats':t.id==='w3-s008'?'stretch-final-word-three-seconds':'legacy:'+t.id,
   variantGroup: oldGroups[t.mechanicKey] || 'legacy:'+t.variantGroup,
   family: t.family, status:'deprecated', active:false,
   reason: removedMechanics.has(t.mechanicKey)?'Retired naming, voice-roleplay, future-memory, or ordinary prediction mechanic.':'Old generic or superseded wording; retained only in existing match snapshots.'
 }]));
 // Keep older village exposures too. The old bank used only bait:1/bait:2,
 // which were seat-card positions rather than meaningful action groups.
 // These classifications were checked against that immutable released bank.
 for (const task of legacy?.villageTasks || []) {
   let group = 'legacy:' + task.mechanicKey;
   if (task.roleId === 'bait') {
     if (/^(Sing|Hum)\b/.test(task.text)) group = 'sing_short_phrase';
     else if (/^Say,/.test(task.text)) group = 'prepared_one_line';
     else if (/^Clap\b/.test(task.text)) group = 'three_audible_beats';
     else if (/^Apologize\b/.test(task.text)) group = 'apologize_to_object';
     else if (/^Count down\b/.test(task.text)) group = 'spoken_countdown';
     else if (/^Spell\b/.test(task.text)) group = 'spell_one_word';
     else if (/^Make .*sound/.test(task.text)) group = 'imitate_alert_sound';
   }
   legacyTaskMap[task.id] = {canonicalTaskKey:'legacy:'+task.id,variantGroup:group,
     family:task.roleId,source:'village',roleId:task.roleId,status:'deprecated',active:false,
     reason:'Previous village card retained in old match snapshots; its exposure history survives migration.'};
 }
 // Keep the former bank as migration/audit data, never as a fallback draw pool.
 // Already-dealt rooms retain their own immutable card snapshots.
 const previousWolfTasks = taxonomy.normalize(appendixTasks.concat(...supplements.map(s => Array.isArray(s) ? s : s.tasks)));
 const version='chat-wolf-special-wolves-v6';
 const topicUpdates=Object.assign({},...readable.map(bank=>bank.topicUpdates||{}));
 for(const topic of topics) Object.assign(topic,topicUpdates[topic.id]||{},{contentVersion:version});
 const previousReadableWolfTasks=taxonomy.normalize(readable.flatMap(bank=>bank.tasks));
 const softEdits=new Map(softTells.overrides.map(task=>[task.id,task]));
 const updatedReadable=readable.flatMap(bank=>bank.tasks).map(task=>({...task,...softEdits.get(task.id),contentVersion:version}));
 // Old interaction cards are migration/audit data, never a formal fallback.
 // Already-dealt rooms retain their immutable card snapshots.
 const experimentalWolfTasks=taxonomy.normalize(updatedReadable.filter(task=>task.type==='interaction'));
 const wolfTasks=taxonomy.normalize(updatedReadable.filter(task=>task.type==='self_action').concat(softTells.newTasks.map(task=>({...task,contentVersion:version}))));
 const directorDirections=directions.directions;
 const exclusionClues = Object.fromEntries(Object.entries(clueInfo).map(([key,value])=>[key,value[2]]));
 const exclusionCluesZh = Object.fromEntries(Object.entries(clueInfo).map(([key,value])=>[key,value[3]]));
 for (const supplement of supplements) {
   if (supplement.exclusionClues) Object.assign(exclusionClues,supplement.exclusionClues);
   if (supplement.exclusionCluesZh) Object.assign(exclusionCluesZh,supplement.exclusionCluesZh);
 }
 return {version,releaseStage:'release',contentPolicy:'self-soft-tell',topics,wolfTasks,villageTasks,directorDirections,
   previousWolfTasks,previousReadableWolfTasks,previousVillageTasks,experimentalWolfTasks,
   villageAudit:revisedVillage.audit,softTellAudit:softTells.audit,
   normalizeGroup:taxonomy.normalizeGroup,normalizeFamily:taxonomy.normalizeFamily,normalizeHistoryEntry:taxonomy.normalizeHistoryEntry,
   normalizeTasks:taxonomy.normalize,
   exclusionClues:taxonomy.exclusionClues,exclusionCluesZh:taxonomy.exclusionCluesZh,
   legacy,legacyTaskMap,legacyTopicMap,deprecatedTasks:legacyTaskMap};
});
