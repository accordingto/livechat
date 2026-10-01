/* Authored English conversation cards with optional Traditional Chinese instructions.
 * 575 distinct cards, 576 topic/role mappings. Topic 10 and 44 share one clapping
 * card instead of pretending identical wording is a new task. Matching content
 * does not imply playtested balance. Kindred is intentionally not in this bank.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CHAT_WOLF_V4_VILLAGE=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return [
  {
    "id": "villager_v4_01_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what would make them leave a group trip early.",
    "textZh": "問一位玩家，什麼情況會讓他提早離開團體旅行。",
    "canonicalTaskKey": "v4:reporter:01:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which travel comfort they would pay extra for.",
    "textZh": "問一位玩家，願意多花錢換哪一項旅行舒適。",
    "canonicalTaskKey": "v4:reporter:01:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small surprise from a trip with other people.",
    "textZh": "分享一次和別人旅行時的小意外。",
    "canonicalTaskKey": "v4:veteran:01:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a travel habit you have noticed in someone else.",
    "textZh": "分享你觀察過的某個旅行習慣。",
    "canonicalTaskKey": "v4:veteran:01:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My suitcase has asked for a rest.”",
    "textZh": "說出「My suitcase has asked for a rest.」。",
    "canonicalTaskKey": "v4:bait:01:1",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My suitcase has asked for a rest."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Sing “I packed too many socks.”",
    "textZh": "唱出「I packed too many socks.」。",
    "canonicalTaskKey": "v4:bait:01:2",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I packed too many socks."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one magic hotel service you would use on this trip.",
    "textZh": "想像一項你會在這趟旅行使用的魔法旅館服務。",
    "canonicalTaskKey": "v4:dreamer:01:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a bag with one impossible travel feature.",
    "textZh": "描述一個有不可能旅行功能的背包。",
    "canonicalTaskKey": "v4:dreamer:01:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one good thing about rain during our trip.",
    "textZh": "說出這趟旅行遇上下雨的一個好處。",
    "canonicalTaskKey": "v4:contrarian:01:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a hotel that offers everything for free.",
    "textZh": "說出旅館什麼都免費的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:01:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same trip breakfast: early or late.",
    "textZh": "讓兩位其他玩家選同一種旅行早餐時間：早一點或晚一點。",
    "canonicalTaskKey": "v4:judge:01:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_01_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same hotel location: near the beach or near shops.",
    "textZh": "讓兩位其他玩家選同一種旅館位置：海邊或商店附近。",
    "canonicalTaskKey": "v4:judge:01:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_01"
    ]
  },
  {
    "id": "villager_v4_02_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which home sound bothers them most.",
    "textZh": "問一位玩家，最受不了哪一種家裡的聲音。",
    "canonicalTaskKey": "v4:reporter:02:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what food they would not want a housemate to borrow.",
    "textZh": "問一位玩家，不希望室友拿走哪一種食物。",
    "canonicalTaskKey": "v4:reporter:02:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small habit you learned while sharing a space.",
    "textZh": "分享你在共用空間時學到的一個小習慣。",
    "canonicalTaskKey": "v4:veteran:02:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a thoughtful thing you have seen someone do at home.",
    "textZh": "分享你看過別人在家做的一件貼心小事。",
    "canonicalTaskKey": "v4:veteran:02:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Apologize to an imaginary fridge.",
    "textZh": "向想像中的冰箱道歉。",
    "canonicalTaskKey": "v4:bait:02:1",
    "variantGroup": "apologize_to_object",
    "mechanicKey": "apologize_to_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address",
      "apology"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The sofa has booked this room for itself.”",
    "textZh": "說出「The sofa has booked this room for itself.」。",
    "canonicalTaskKey": "v4:bait:02:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The sofa has booked this room for itself."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a door in our home that leads somewhere impossible.",
    "textZh": "想像家裡有一扇通往不可能地方的門。",
    "canonicalTaskKey": "v4:dreamer:02:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a small magic helper for one shared household problem.",
    "textZh": "描述一個能解決共住小麻煩的魔法幫手。",
    "canonicalTaskKey": "v4:dreamer:02:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one good thing about sharing a small kitchen.",
    "textZh": "說出共用小廚房的一個好處。",
    "canonicalTaskKey": "v4:contrarian:02:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a housemate who never needs sleep.",
    "textZh": "說出室友完全不用睡覺的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:02:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same shared dinner time: six or eight.",
    "textZh": "讓兩位其他玩家選同一個共餐時間：六點或八點。",
    "canonicalTaskKey": "v4:judge:02:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_02_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same living-room item: a sofa or a dining table.",
    "textZh": "讓兩位其他玩家選同一樣客廳物品：沙發或餐桌。",
    "canonicalTaskKey": "v4:judge:02:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_02"
    ]
  },
  {
    "id": "villager_v4_03_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they would want the car to be quiet.",
    "textZh": "問一位玩家，什麼時候會希望車上安靜。",
    "canonicalTaskKey": "v4:reporter:03:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which kind of music they would avoid on a long ride.",
    "textZh": "問一位玩家，長途車程不想聽哪一種音樂。",
    "canonicalTaskKey": "v4:reporter:03:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a conversation you remember from a journey.",
    "textZh": "分享一段你記得的車程聊天。",
    "canonicalTaskKey": "v4:veteran:03:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you have noticed about passengers on long rides.",
    "textZh": "分享你對長途車程乘客的觀察。",
    "canonicalTaskKey": "v4:veteran:03:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Hum a short tune without words.",
    "textZh": "哼一小段沒有歌詞的旋律。",
    "canonicalTaskKey": "v4:bait:03:1",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "singing"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My ears would like a window seat.”",
    "textZh": "說出「My ears would like a window seat.」。",
    "canonicalTaskKey": "v4:bait:03:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My ears would like a window seat."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one magic feature for a car passenger seat.",
    "textZh": "想像汽車乘客座位的一項魔法功能。",
    "canonicalTaskKey": "v4:dreamer:03:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe headphones that can do one impossible thing.",
    "textZh": "描述一副能做到一件不可能事情的耳機。",
    "canonicalTaskKey": "v4:dreamer:03:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a car ride with no music.",
    "textZh": "說出車程完全沒有音樂的一個好處。",
    "canonicalTaskKey": "v4:contrarian:03:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with everyone loving exactly the same song.",
    "textZh": "說出大家都只愛同一首歌的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:03:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same car sound: music or quiet.",
    "textZh": "讓兩位其他玩家選同一種車內聲音：音樂或安靜。",
    "canonicalTaskKey": "v4:judge:03:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_03_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same stop: a café or a park.",
    "textZh": "讓兩位其他玩家選同一種休息站安排：咖啡店或公園。",
    "canonicalTaskKey": "v4:judge:03:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_03"
    ]
  },
  {
    "id": "villager_v4_04_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how much alone time they would want at the cabin.",
    "textZh": "問一位玩家，在小屋想要多少獨處時間。",
    "canonicalTaskKey": "v4:reporter:04:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which optional activity would spoil a restful weekend for them.",
    "textZh": "問一位玩家，哪一項可選活動反而會破壞放鬆週末。",
    "canonicalTaskKey": "v4:reporter:04:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a good day that had very little planned.",
    "textZh": "分享沒有安排很多事情卻過得很好的一天。",
    "canonicalTaskKey": "v4:veteran:04:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small thing that helped you rest away from home.",
    "textZh": "分享在外地幫助你放鬆的一件小事。",
    "canonicalTaskKey": "v4:veteran:04:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My calendar is sleeping this weekend.”",
    "textZh": "說出「My calendar is sleeping this weekend.」。",
    "canonicalTaskKey": "v4:bait:04:1",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My calendar is sleeping this weekend."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a short snoring sound.",
    "textZh": "發出一小段打呼聲。",
    "canonicalTaskKey": "v4:bait:04:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one magic feature for the cabin garden.",
    "textZh": "想像小屋花園的一項魔法功能。",
    "canonicalTaskKey": "v4:dreamer:04:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a chair that gives you an impossible kind of rest.",
    "textZh": "描述一張能帶來不可能休息方式的椅子。",
    "canonicalTaskKey": "v4:dreamer:04:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one good thing about having no activities ready.",
    "textZh": "說出完全沒安排活動的一個好處。",
    "canonicalTaskKey": "v4:contrarian:04:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a weekend where nobody ever feels tired.",
    "textZh": "說出週末大家永遠不會累的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:04:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same cabin activity: reading or a walk.",
    "textZh": "讓兩位其他玩家選同一項小屋活動：閱讀或散步。",
    "canonicalTaskKey": "v4:judge:04:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_04_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same breakfast style: together or whenever they wake.",
    "textZh": "讓兩位其他玩家選同一種早餐方式：一起吃或各自醒來再吃。",
    "canonicalTaskKey": "v4:judge:04:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_04"
    ]
  },
  {
    "id": "villager_v4_05_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which small sound interrupts their concentration.",
    "textZh": "問一位玩家，哪一種小聲音會打斷專注。",
    "canonicalTaskKey": "v4:reporter:05:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they welcome a chat while working.",
    "textZh": "問一位玩家，做事時什麼時候歡迎別人聊天。",
    "canonicalTaskKey": "v4:reporter:05:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a way you have worked comfortably beside someone.",
    "textZh": "分享一次和別人並肩做事很舒服的方式。",
    "canonicalTaskKey": "v4:veteran:05:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something that has helped you concentrate.",
    "textZh": "分享一件曾經幫助你專注的事。",
    "canonicalTaskKey": "v4:veteran:05:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My pencil needs a lunch break.”",
    "textZh": "說出「My pencil needs a lunch break.」。",
    "canonicalTaskKey": "v4:bait:05:1",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My pencil needs a lunch break."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank an imaginary desk for its hard work.",
    "textZh": "感謝想像中的桌子辛苦工作。",
    "canonicalTaskKey": "v4:bait:05:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a desk feature that gives each person their preferred level of quiet.",
    "textZh": "想像桌子能給每個人想要的安靜程度的一項功能。",
    "canonicalTaskKey": "v4:dreamer:05:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic tool that helps you start a boring task.",
    "textZh": "描述一個幫助你開始無聊工作的魔法工具。",
    "canonicalTaskKey": "v4:dreamer:05:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of working near people doing different things.",
    "textZh": "說出身旁的人做不同事情的一個好處。",
    "canonicalTaskKey": "v4:contrarian:05:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a workspace that is always completely silent.",
    "textZh": "說出工作空間永遠完全安靜的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:05:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same break: tea or a short walk.",
    "textZh": "讓兩位其他玩家選同一種休息：喝茶或短暫散步。",
    "canonicalTaskKey": "v4:judge:05:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_05_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same desk position: by a window or by a wall.",
    "textZh": "讓兩位其他玩家選同一個桌位：窗邊或牆邊。",
    "canonicalTaskKey": "v4:judge:05:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_05"
    ]
  },
  {
    "id": "villager_v4_06_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they would first try to look up without a signal.",
    "textZh": "問一位玩家，沒訊號時第一個會想查什麼。",
    "canonicalTaskKey": "v4:reporter:06:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which old phone photo they would enjoy sharing.",
    "textZh": "問一位玩家，願意分享手機裡哪一類舊照片。",
    "canonicalTaskKey": "v4:reporter:06:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you enjoyed before you had internet access.",
    "textZh": "分享你以前不用網路也玩得開心的一件事。",
    "canonicalTaskKey": "v4:veteran:06:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a time not checking your phone improved a moment.",
    "textZh": "分享一次不看手機反而更好的時刻。",
    "canonicalTaskKey": "v4:veteran:06:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My phone has nothing new to tell me.”",
    "textZh": "說出「My phone has nothing new to tell me.」。",
    "canonicalTaskKey": "v4:bait:06:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My phone has nothing new to tell me."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a short phone notification sound.",
    "textZh": "發出一聲手機通知音效。",
    "canonicalTaskKey": "v4:bait:06:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a phone feature that works without any signal.",
    "textZh": "想像一項完全沒有訊號也能使用的神奇手機功能。",
    "canonicalTaskKey": "v4:dreamer:06:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a game we could play with a magic pocket-sized object.",
    "textZh": "描述一個可以用口袋大小魔法物品玩的遊戲。",
    "canonicalTaskKey": "v4:dreamer:06:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of not being able to look up an answer.",
    "textZh": "說出無法查答案的一個好處。",
    "canonicalTaskKey": "v4:contrarian:06:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a phone that always knows what you want to see.",
    "textZh": "說出手機永遠知道你想看什麼的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:06:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same offline activity: cards or stories.",
    "textZh": "讓兩位其他玩家選同一項離線活動：玩牌或講故事。",
    "canonicalTaskKey": "v4:judge:06:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_06_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same phone content to share: photos or saved music.",
    "textZh": "讓兩位其他玩家選同一種想分享的手機內容：照片或存好的音樂。",
    "canonicalTaskKey": "v4:judge:06:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_06"
    ]
  },
  {
    "id": "villager_v4_07_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what helps them feel included in a new group.",
    "textZh": "問一位玩家，什麼事能讓他在新團體中有參與感。",
    "canonicalTaskKey": "v4:reporter:07:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which introduction question they enjoy answering.",
    "textZh": "問一位玩家，喜歡回答哪一種自我介紹問題。",
    "canonicalTaskKey": "v4:reporter:07:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small action that helped you feel welcome.",
    "textZh": "分享一個讓你感到受歡迎的小舉動。",
    "canonicalTaskKey": "v4:veteran:07:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an activity that helped you get to know someone.",
    "textZh": "分享一項幫你認識別人的活動。",
    "canonicalTaskKey": "v4:veteran:07:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My small talk is still in my bag.”",
    "textZh": "說出「My small talk is still in my bag.」。",
    "canonicalTaskKey": "v4:bait:07:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My small talk is still in my bag."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Introduce an imaginary empty chair as a guest.",
    "textZh": "把想像中的空椅子當成來賓介紹。",
    "canonicalTaskKey": "v4:bait:07:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one magic feature for a room that welcomes newcomers.",
    "textZh": "想像迎接新朋友的房間能有哪一項魔法功能。",
    "canonicalTaskKey": "v4:dreamer:07:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a snack that helps people start talking.",
    "textZh": "想像一種能幫大家開口聊天的神奇點心。",
    "canonicalTaskKey": "v4:dreamer:07:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a quiet moment when meeting someone.",
    "textZh": "說出初次見面時安靜片刻的一個好處。",
    "canonicalTaskKey": "v4:contrarian:07:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with everyone remembering your name immediately.",
    "textZh": "說出所有人馬上記住你的名字的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:07:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same first activity: a short game or choosing snacks.",
    "textZh": "讓兩位其他玩家選同一項初次相聚活動：小遊戲或挑點心。",
    "canonicalTaskKey": "v4:judge:07:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_07_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same gathering place: a café or a park.",
    "textZh": "讓兩位其他玩家選同一種聚會地點：咖啡店或公園。",
    "canonicalTaskKey": "v4:judge:07:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_07"
    ]
  },
  {
    "id": "villager_v4_08_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which cooking step they would rather let another person do.",
    "textZh": "問一位玩家，哪一個做菜步驟想交給別人。",
    "canonicalTaskKey": "v4:reporter:08:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they do when food turns out too salty.",
    "textZh": "問一位玩家，食物太鹹時會怎麼處理。",
    "canonicalTaskKey": "v4:reporter:08:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small mistake you have made in a kitchen.",
    "textZh": "分享你在廚房犯過的一個小錯。",
    "canonicalTaskKey": "v4:veteran:08:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share one cooking habit you learned from someone.",
    "textZh": "分享你向別人學過的一個做菜習慣。",
    "canonicalTaskKey": "v4:veteran:08:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The spoon has more experience than I do.”",
    "textZh": "說出「The spoon has more experience than I do.」。",
    "canonicalTaskKey": "v4:bait:08:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The spoon has more experience than I do."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “Dinner is ready” three times in a row.",
    "textZh": "連說三次「Dinner is ready」。",
    "canonicalTaskKey": "v4:bait:08:2",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "family": "repetition",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Dinner is ready"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a kitchen tool that can fix one cooking mistake.",
    "textZh": "想像一個能修正一種做菜失誤的魔法廚具。",
    "canonicalTaskKey": "v4:dreamer:08:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a food that changes shape while it cooks.",
    "textZh": "想像一種煮的時候會變形的食物。",
    "canonicalTaskKey": "v4:dreamer:08:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one good thing about cooking with only one pot.",
    "textZh": "說出只用一個鍋子煮飯的一個好處。",
    "canonicalTaskKey": "v4:contrarian:08:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with food that is always ready instantly.",
    "textZh": "說出食物永遠瞬間煮好的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:08:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same dinner: noodles or fried rice.",
    "textZh": "讓兩位其他玩家選同一道晚餐：麵或炒飯。",
    "canonicalTaskKey": "v4:judge:08:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_08_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same kitchen job: washing vegetables or setting the table.",
    "textZh": "讓兩位其他玩家選同一項廚房工作：洗菜或擺餐具。",
    "canonicalTaskKey": "v4:judge:08:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_08"
    ]
  },
  {
    "id": "villager_v4_09_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what would make them stay longer in a small shop.",
    "textZh": "問一位玩家，什麼會讓他想在小店多待一會兒。",
    "canonicalTaskKey": "v4:reporter:09:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which shop job they would avoid.",
    "textZh": "問一位玩家，最想避開哪一項店裡的工作。",
    "canonicalTaskKey": "v4:reporter:09:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a detail from a shop that made you comfortable.",
    "textZh": "分享一家店讓你舒服的一個細節。",
    "canonicalTaskKey": "v4:veteran:09:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small service you remember receiving.",
    "textZh": "分享你記得的一項小小服務。",
    "canonicalTaskKey": "v4:veteran:09:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My slippers expect a salary.”",
    "textZh": "說出「My slippers expect a salary.」。",
    "canonicalTaskKey": "v4:bait:09:1",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My slippers expect a salary."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Quote a price of ten thousand dollars for a cup of water.",
    "textZh": "替一杯水報價一萬元。",
    "canonicalTaskKey": "v4:bait:09:2",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "family": "absurd_price",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a magic shop feature that gives the owners more rest.",
    "textZh": "想像一項讓店主多休息的魔法店面功能。",
    "canonicalTaskKey": "v4:dreamer:09:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a chair that does something impossible for a customer.",
    "textZh": "想像店裡的椅子能替客人做一件不可能的事。",
    "canonicalTaskKey": "v4:dreamer:09:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of having only a few customers.",
    "textZh": "說出客人很少的一個好處。",
    "canonicalTaskKey": "v4:contrarian:09:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a shop becoming famous overnight.",
    "textZh": "說出小店一夜成名的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:09:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same opening time: ten or noon.",
    "textZh": "讓兩位其他玩家選同一個開店時間：十點或中午。",
    "canonicalTaskKey": "v4:judge:09:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_09_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same main item to sell: bread or tea.",
    "textZh": "讓兩位其他玩家選同一樣主要商品：麵包或茶。",
    "canonicalTaskKey": "v4:judge:09:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_09"
    ]
  },
  {
    "id": "villager_v4_10_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which birthday surprise would make them uncomfortable.",
    "textZh": "問一位玩家，哪種生日驚喜會讓他不自在。",
    "canonicalTaskKey": "v4:reporter:10:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which birthday detail is worth making by hand.",
    "textZh": "問一位玩家，生日的哪個部分值得親手做。",
    "canonicalTaskKey": "v4:reporter:10:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an inexpensive celebration you enjoyed.",
    "textZh": "分享一次便宜但開心的慶祝。",
    "canonicalTaskKey": "v4:veteran:10:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small birthday detail you still remember.",
    "textZh": "分享一個你還記得的生日小細節。",
    "canonicalTaskKey": "v4:veteran:10:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Sing “The cake is the special guest.”",
    "textZh": "唱出「The cake is the special guest.」。",
    "canonicalTaskKey": "v4:bait:10:1",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The cake is the special guest."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Clap three times.",
    "textZh": "鼓掌三下。",
    "canonicalTaskKey": "clap-three-audible-beats",
    "variantGroup": "three_audible_beats",
    "mechanicKey": "three_audible_beats",
    "family": "clapping",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": null,
    "actionTags": [
      "clapping"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10",
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_10_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a birthday cake with one magic feature.",
    "textZh": "想像生日蛋糕的一項魔法功能。",
    "canonicalTaskKey": "v4:dreamer:10:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a birthday decoration that costs nothing in a magic world.",
    "textZh": "描述魔法世界中不用花錢的生日裝飾。",
    "canonicalTaskKey": "v4:dreamer:10:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a tiny birthday budget.",
    "textZh": "說出生日預算很少的一個好處。",
    "canonicalTaskKey": "v4:contrarian:10:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with receiving a huge surprise party.",
    "textZh": "說出突然收到大型驚喜派對的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:10:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same birthday treat: cake or ice cream.",
    "textZh": "讓兩位其他玩家選同一種生日甜點：蛋糕或冰淇淋。",
    "canonicalTaskKey": "v4:judge:10:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_10_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same celebration place: home or a park.",
    "textZh": "讓兩位其他玩家選同一個慶祝地點：家裡或公園。",
    "canonicalTaskKey": "v4:judge:10:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_10"
    ]
  },
  {
    "id": "villager_v4_11_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what modest skill they could show in our episode.",
    "textZh": "問一位玩家，能在節目展示哪一項小本事。",
    "canonicalTaskKey": "v4:reporter:11:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which kind of scene they would refuse to film.",
    "textZh": "問一位玩家，不願意拍哪一種橋段。",
    "canonicalTaskKey": "v4:reporter:11:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a simple video you remember enjoying.",
    "textZh": "分享一段你記得看得很開心的簡單影片。",
    "canonicalTaskKey": "v4:veteran:11:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you have made with basic equipment.",
    "textZh": "分享你用簡單工具做過的一件東西。",
    "canonicalTaskKey": "v4:veteran:11:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Add a “ta-da” sound after describing a small skill.",
    "textZh": "說到一項小本事時加上「ta-da」音效。",
    "canonicalTaskKey": "v4:bait:11:1",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "ta-da"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “Our camera is taking a lunch break.”",
    "textZh": "說出「Our camera is taking a lunch break.」。",
    "canonicalTaskKey": "v4:bait:11:2",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Our camera is taking a lunch break."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a harmless impossible skill for our show.",
    "textZh": "想像一項可以放進節目的無害超現實本事。",
    "canonicalTaskKey": "v4:dreamer:11:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic object that would help us make one episode.",
    "textZh": "描述一件幫我們製作一集節目的魔法物品。",
    "canonicalTaskKey": "v4:dreamer:11:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of filming with very little equipment.",
    "textZh": "說出幾乎沒有器材拍節目的一個好處。",
    "canonicalTaskKey": "v4:contrarian:11:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a show that never makes a mistake.",
    "textZh": "說出節目完全沒有失誤的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:11:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same episode length: five or fifteen minutes.",
    "textZh": "讓兩位其他玩家選同一個節目長度：五或十五分鐘。",
    "canonicalTaskKey": "v4:judge:11:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_11_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same first scene: cooking or drawing.",
    "textZh": "讓兩位其他玩家選同一個第一幕：做菜或畫畫。",
    "canonicalTaskKey": "v4:judge:11:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_11"
    ]
  },
  {
    "id": "villager_v4_12_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which ordinary object they would put in our exhibition.",
    "textZh": "問一位玩家，想把哪一件普通物品放進展覽。",
    "canonicalTaskKey": "v4:reporter:12:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they enjoy learning about an old object.",
    "textZh": "問一位玩家，喜歡知道舊物的哪一種故事。",
    "canonicalTaskKey": "v4:reporter:12:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small story behind an object you own.",
    "textZh": "分享你擁有的一件物品背後的小故事。",
    "canonicalTaskKey": "v4:veteran:12:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a detail you noticed in a display or collection.",
    "textZh": "分享你在展示或收藏中注意到的一個細節。",
    "canonicalTaskKey": "v4:veteran:12:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank an ordinary object for its years of service.",
    "textZh": "感謝一件普通物品多年來的服務。",
    "canonicalTaskKey": "v4:bait:12:1",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This old mug deserves a security guard.”",
    "textZh": "說出「This old mug deserves a security guard.」。",
    "canonicalTaskKey": "v4:bait:12:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This old mug deserves a security guard."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an exhibit that lets visitors hear one object’s memories.",
    "textZh": "想像一種讓觀眾聽到物品回憶的展品。",
    "canonicalTaskKey": "v4:dreamer:12:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a display case with an impossible feature.",
    "textZh": "描述一個有不可能功能的展示櫃。",
    "canonicalTaskKey": "v4:dreamer:12:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of showing worn objects.",
    "textZh": "說出展示磨損物品的一個好處。",
    "canonicalTaskKey": "v4:contrarian:12:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with every exhibit being brand new.",
    "textZh": "說出所有展品都全新的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:12:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same display item: a cup or a bag.",
    "textZh": "讓兩位其他玩家選同一種展品：杯子或袋子。",
    "canonicalTaskKey": "v4:judge:12:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_12_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same exhibit label: a short story or a photo.",
    "textZh": "讓兩位其他玩家選同一種展品介紹：短故事或照片。",
    "canonicalTaskKey": "v4:judge:12:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_12"
    ]
  },
  {
    "id": "villager_v4_13_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which party activity puts them under pressure.",
    "textZh": "問一位玩家，聚會哪一項活動會讓他有壓力。",
    "canonicalTaskKey": "v4:reporter:13:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what makes a quiet corner comfortable.",
    "textZh": "問一位玩家，什麼能讓聚會中的安靜角落舒服。",
    "canonicalTaskKey": "v4:reporter:13:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a gathering where you could relax without talking much.",
    "textZh": "分享一次不用講很多話也自在的聚會。",
    "canonicalTaskKey": "v4:veteran:13:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something a host did that made you comfortable.",
    "textZh": "分享主持人曾做過的一件讓你舒服的事。",
    "canonicalTaskKey": "v4:veteran:13:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The quiet corner has asked for a smaller party.”",
    "textZh": "說出「The quiet corner has asked for a smaller party.」。",
    "canonicalTaskKey": "v4:bait:13:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The quiet corner has asked for a smaller party."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Whisper “I brought my quiet voice.”",
    "textZh": "輕聲說出「I brought my quiet voice.」，讓大家能聽見。",
    "canonicalTaskKey": "v4:bait:13:2",
    "variantGroup": "whisper_short_phrase",
    "mechanicKey": "whisper_short_phrase",
    "family": "whispering",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "whispering",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I brought my quiet voice."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a magic corner where each guest can rest in their own way.",
    "textZh": "想像一個讓每位客人用自己的方式休息的魔法角落。",
    "canonicalTaskKey": "v4:dreamer:13:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a snack that makes a gathering less stressful.",
    "textZh": "想像一種能減少聚會壓力的神奇點心。",
    "canonicalTaskKey": "v4:dreamer:13:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a gathering without a big exciting moment.",
    "textZh": "說出聚會沒有高潮的一個好處。",
    "canonicalTaskKey": "v4:contrarian:13:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a host checking on you every minute.",
    "textZh": "說出主持人每分鐘都關心你的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:13:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same quiet activity: puzzles or drawing.",
    "textZh": "讓兩位其他玩家選同一項安靜活動：拼圖或畫畫。",
    "canonicalTaskKey": "v4:judge:13:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_13_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same group size: four or eight.",
    "textZh": "讓兩位其他玩家選同一個聚會人數：四人或八人。",
    "canonicalTaskKey": "v4:judge:13:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_13"
    ]
  },
  {
    "id": "villager_v4_14_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which ordinary local place they would show a visitor.",
    "textZh": "問一位玩家，會帶訪客去哪一個普通的在地場所。",
    "canonicalTaskKey": "v4:reporter:14:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what makes a familiar street interesting.",
    "textZh": "問一位玩家，熟悉的街道有什麼有趣之處。",
    "canonicalTaskKey": "v4:reporter:14:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a pleasant discovery in an ordinary neighborhood.",
    "textZh": "分享在普通街區的一次愉快發現。",
    "canonicalTaskKey": "v4:veteran:14:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a local detail you noticed only after many visits.",
    "textZh": "分享去過很多次後才注意到的在地細節。",
    "canonicalTaskKey": "v4:veteran:14:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This pavement has more stories than my phone.”",
    "textZh": "說出「This pavement has more stories than my phone.」。",
    "canonicalTaskKey": "v4:bait:14:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This pavement has more stories than my phone."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a bicycle-bell sound.",
    "textZh": "發出一聲腳踏車鈴的聲音。",
    "canonicalTaskKey": "v4:bait:14:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one magic feature for a familiar street.",
    "textZh": "想像熟悉街道的一項魔法功能。",
    "canonicalTaskKey": "v4:dreamer:14:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a tiny impossible shop you would show our visitor.",
    "textZh": "描述一間你想帶訪客去的超現實小店。",
    "canonicalTaskKey": "v4:dreamer:14:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a neighborhood with no famous attractions.",
    "textZh": "說出街區沒有著名景點的一個好處。",
    "canonicalTaskKey": "v4:contrarian:14:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with your usual café becoming very popular.",
    "textZh": "說出常去的咖啡店突然很熱門的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:14:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same first stop: a bakery or a park.",
    "textZh": "讓兩位其他玩家選同一個第一站：麵包店或公園。",
    "canonicalTaskKey": "v4:judge:14:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_14_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to explore: walking or cycling.",
    "textZh": "讓兩位其他玩家選同一種逛街方式：走路或騎車。",
    "canonicalTaskKey": "v4:judge:14:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_14"
    ]
  },
  {
    "id": "villager_v4_15_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which second-hand object they would accept.",
    "textZh": "問一位玩家，願意接受哪一種二手物品。",
    "canonicalTaskKey": "v4:reporter:15:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they could bring to our swap shop.",
    "textZh": "問一位玩家，可以帶什麼來交換店。",
    "canonicalTaskKey": "v4:reporter:15:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an object you passed on to someone else.",
    "textZh": "分享你曾轉送給別人的一件物品。",
    "canonicalTaskKey": "v4:veteran:15:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a second-hand thing that was useful to you.",
    "textZh": "分享一件對你有用的二手物品。",
    "canonicalTaskKey": "v4:veteran:15:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This lamp is looking for a new family.”",
    "textZh": "說出「This lamp is looking for a new family.」。",
    "canonicalTaskKey": "v4:bait:15:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This lamp is looking for a new family."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Offer to exchange an imaginary spoon for a mountain.",
    "textZh": "提議用一支想像中的湯匙交換一座山。",
    "canonicalTaskKey": "v4:bait:15:2",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "family": "absurd_price",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a magic feature that helps unwanted objects find new owners.",
    "textZh": "想像一項幫閒置物找到新主人的魔法功能。",
    "canonicalTaskKey": "v4:dreamer:15:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a bag that shows what its next owner needs.",
    "textZh": "想像一個會顯示下一位主人需求的袋子。",
    "canonicalTaskKey": "v4:dreamer:15:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of swapping instead of buying something new.",
    "textZh": "說出交換代替買新物的一個好處。",
    "canonicalTaskKey": "v4:contrarian:15:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with taking home every free object you see.",
    "textZh": "說出看到免費物品就帶回家的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:15:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same swap item: a book or a lamp.",
    "textZh": "讓兩位其他玩家選同一樣交換物品：書或燈。",
    "canonicalTaskKey": "v4:judge:15:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_15_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to display items: tables or shelves.",
    "textZh": "讓兩位其他玩家選同一種展示方式：桌面或架子。",
    "canonicalTaskKey": "v4:judge:15:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_15"
    ]
  },
  {
    "id": "villager_v4_16_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which sound they would allow in our rest room.",
    "textZh": "問一位玩家，休息室裡可以有哪些聲音。",
    "canonicalTaskKey": "v4:reporter:16:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what would make them want to stay in the room.",
    "textZh": "問一位玩家，什麼會讓他想留在休息室。",
    "canonicalTaskKey": "v4:reporter:16:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a place where sitting down made you relax.",
    "textZh": "分享一個坐下就能放鬆的地方。",
    "canonicalTaskKey": "v4:veteran:16:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small object that has made a space more comfortable.",
    "textZh": "分享一件曾讓空間更舒服的小物。",
    "canonicalTaskKey": "v4:veteran:16:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This cushion is in charge of my afternoon.”",
    "textZh": "說出「This cushion is in charge of my afternoon.」。",
    "canonicalTaskKey": "v4:bait:16:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This cushion is in charge of my afternoon."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Stretch the word “comfortable” for three seconds.",
    "textZh": "把「comfortable」這個詞拖長三秒。",
    "canonicalTaskKey": "v4:bait:16:2",
    "variantGroup": "stretch_last_word",
    "mechanicKey": "stretch_last_word",
    "family": "stretched_word",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "stretched_word",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "comfortable"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a window that can change the view in our room.",
    "textZh": "想像休息室有一扇可以更換景色的窗戶。",
    "canonicalTaskKey": "v4:dreamer:16:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a chair that adapts to an impossible resting position.",
    "textZh": "描述一張能配合不可能休息姿勢的椅子。",
    "canonicalTaskKey": "v4:dreamer:16:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a small room.",
    "textZh": "說出休息室很小的一個好處。",
    "canonicalTaskKey": "v4:contrarian:16:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a room that is too comfortable to leave.",
    "textZh": "說出休息室舒服到不想離開的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:16:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same light: warm or cool.",
    "textZh": "讓兩位其他玩家選同一種燈光：暖色或冷色。",
    "canonicalTaskKey": "v4:judge:16:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_16_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same seat: a sofa or a floor cushion.",
    "textZh": "讓兩位其他玩家選同一種座位：沙發或地板坐墊。",
    "canonicalTaskKey": "v4:judge:16:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_16"
    ]
  },
  {
    "id": "villager_v4_17_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which daily problem they would ask a neighbor’s power to solve.",
    "textZh": "問一位玩家，想請鄰居的能力解決哪個日常麻煩。",
    "canonicalTaskKey": "v4:reporter:17:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which power they would not want used on them.",
    "textZh": "問一位玩家，不想讓哪種能力用在自己身上。",
    "canonicalTaskKey": "v4:reporter:17:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small practical favor someone has done for you.",
    "textZh": "分享別人曾替你做的一件實用小事。",
    "canonicalTaskKey": "v4:veteran:17:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a daily problem you learned to handle yourself.",
    "textZh": "分享你學會自己處理的一個日常麻煩。",
    "canonicalTaskKey": "v4:veteran:17:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My superpower has forgotten its password.”",
    "textZh": "說出「My superpower has forgotten its password.」。",
    "canonicalTaskKey": "v4:bait:17:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My superpower has forgotten its password."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a “whoosh” sound for an imaginary power.",
    "textZh": "替想像中的超能力發出「whoosh」聲。",
    "canonicalTaskKey": "v4:bait:17:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "whoosh"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a small power that makes another person’s chores easier.",
    "textZh": "描述一種能讓別人做家事更輕鬆的小能力。",
    "canonicalTaskKey": "v4:dreamer:17:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a useful power that works only on rainy days.",
    "textZh": "想像一種只有雨天能用的實用能力。",
    "canonicalTaskKey": "v4:dreamer:17:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a power working only once a day.",
    "textZh": "說出超能力一天只能用一次的一個好處。",
    "canonicalTaskKey": "v4:contrarian:17:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a neighbor who can finish every chore instantly.",
    "textZh": "說出鄰居能瞬間做完所有家事的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:17:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same helpful power: instant cleaning or finding keys.",
    "textZh": "讓兩位其他玩家選同一種實用能力：瞬間清潔或找鑰匙。",
    "canonicalTaskKey": "v4:judge:17:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_17_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same thank-you gift: a meal or a plant.",
    "textZh": "讓兩位其他玩家選同一種謝禮：一頓飯或植物。",
    "canonicalTaskKey": "v4:judge:17:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_17"
    ]
  },
  {
    "id": "villager_v4_18_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which part of a friend’s routine they are curious about.",
    "textZh": "問一位玩家，好奇朋友日常的哪一部分。",
    "canonicalTaskKey": "v4:reporter:18:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what a visitor would find difficult about their routine.",
    "textZh": "問一位玩家，訪客會難以適應他日常的哪一點。",
    "canonicalTaskKey": "v4:reporter:18:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a habit you noticed while spending a day with someone.",
    "textZh": "分享和別人相處一天時注意到的習慣。",
    "canonicalTaskKey": "v4:veteran:18:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a routine you once tried to copy.",
    "textZh": "分享一個你曾試著模仿的作息。",
    "canonicalTaskKey": "v4:veteran:18:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “I need instructions for somebody else’s morning.”",
    "textZh": "說出「I need instructions for somebody else’s morning.」。",
    "canonicalTaskKey": "v4:bait:18:1",
    "variantGroup": "absurd_instruction_request",
    "mechanicKey": "absurd_instruction_request",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I need instructions for somebody else’s morning."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “I am borrowing this Tuesday” twice.",
    "textZh": "說兩次「I am borrowing this Tuesday」。",
    "canonicalTaskKey": "v4:bait:18:2",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "family": "repetition",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I am borrowing this Tuesday"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an object that helps you adapt to someone else’s day.",
    "textZh": "想像一件幫你適應別人日常的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:18:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a friend’s routine with one harmless impossible feature added.",
    "textZh": "想像朋友的日常多了一項無害的不可能安排。",
    "canonicalTaskKey": "v4:dreamer:18:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of trying a routine that is less convenient than yours.",
    "textZh": "說出體驗比自己不方便的作息的一個好處。",
    "canonicalTaskKey": "v4:contrarian:18:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with copying your friend’s perfect morning.",
    "textZh": "說出完全複製朋友完美早晨的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:18:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same routine to try: an early start or a late start.",
    "textZh": "讓兩位其他玩家選同一種想試的作息：早起或晚起。",
    "canonicalTaskKey": "v4:judge:18:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_18_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same borrowed activity: cooking or exercise.",
    "textZh": "讓兩位其他玩家選同一項想體驗的活動：做菜或運動。",
    "canonicalTaskKey": "v4:judge:18:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_18"
    ]
  },
  {
    "id": "villager_v4_19_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they would keep out of their extra hour.",
    "textZh": "問一位玩家，不想讓什麼事情進入額外一小時。",
    "canonicalTaskKey": "v4:reporter:19:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they would place their extra hour.",
    "textZh": "問一位玩家，想把額外一小時放在一天的哪個時段。",
    "canonicalTaskKey": "v4:reporter:19:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you enjoyed in an unexpected free hour.",
    "textZh": "分享你在意外空出的一小時做過的開心事。",
    "canonicalTaskKey": "v4:veteran:19:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small interest you have made regular time for.",
    "textZh": "分享一個你曾固定留時間做的小興趣。",
    "canonicalTaskKey": "v4:veteran:19:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My extra hour arrived twenty minutes late.”",
    "textZh": "說出「My extra hour arrived twenty minutes late.」。",
    "canonicalTaskKey": "v4:bait:19:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My extra hour arrived twenty minutes late."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Count down from five to one aloud.",
    "textZh": "出聲從五倒數到一。",
    "canonicalTaskKey": "v4:bait:19:2",
    "variantGroup": "spoken_countdown",
    "mechanicKey": "spoken_countdown",
    "family": "countdown",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "countdown"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a place that stores unused free time.",
    "textZh": "想像一個可以存放沒用完空閒時間的地方。",
    "canonicalTaskKey": "v4:dreamer:19:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic object that protects your extra hour from interruptions.",
    "textZh": "描述一件保護額外一小時不被打擾的魔法物品。",
    "canonicalTaskKey": "v4:dreamer:19:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of not producing anything in the extra hour.",
    "textZh": "說出額外一小時什麼成果都沒有的一個好處。",
    "canonicalTaskKey": "v4:contrarian:19:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with receiving the extra hour at midnight.",
    "textZh": "說出額外一小時只能在半夜使用的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:19:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra-hour use: rest or learning.",
    "textZh": "讓兩位其他玩家選同一種額外時間用途：休息或學習。",
    "canonicalTaskKey": "v4:judge:19:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_19_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra-hour location: home or outdoors.",
    "textZh": "讓兩位其他玩家選同一個額外時間地點：家裡或戶外。",
    "canonicalTaskKey": "v4:judge:19:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_19"
    ]
  },
  {
    "id": "villager_v4_20_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which object at home would complain the most.",
    "textZh": "問一位玩家，家裡哪一件物品最會抱怨。",
    "canonicalTaskKey": "v4:reporter:20:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which object would defend their habits.",
    "textZh": "問一位玩家，哪件物品會替他的生活習慣說好話。",
    "canonicalTaskKey": "v4:reporter:20:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an object you have used for many years.",
    "textZh": "分享你已用了很多年的一件物品。",
    "canonicalTaskKey": "v4:veteran:20:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a household habit you changed to take better care of something.",
    "textZh": "分享你為照顧物品而改過的一個家中習慣。",
    "canonicalTaskKey": "v4:veteran:20:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Apologize to a chair for leaving clothes on it.",
    "textZh": "向椅子道歉，因為衣服一直放在上面。",
    "canonicalTaskKey": "v4:bait:20:1",
    "variantGroup": "apologize_to_object",
    "mechanicKey": "apologize_to_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address",
      "apology"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The kettle has asked for a pay rise.”",
    "textZh": "說出「The kettle has asked for a pay rise.」。",
    "canonicalTaskKey": "v4:bait:20:2",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The kettle has asked for a pay rise."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one complaint from an object you rarely use.",
    "textZh": "想像一件很少用的物品會提出什麼抱怨。",
    "canonicalTaskKey": "v4:dreamer:20:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe one helpful question you would ask a talking window.",
    "textZh": "說出你想問會說話的窗戶的一個實用問題。",
    "canonicalTaskKey": "v4:dreamer:20:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of an object refusing to talk.",
    "textZh": "說出某件物品拒絕說話的一個好處。",
    "canonicalTaskKey": "v4:contrarian:20:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a fridge that remembers every meal.",
    "textZh": "說出冰箱記得每頓飯的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:20:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same object to hear first: a chair or a fridge.",
    "textZh": "讓兩位其他玩家選同一件先聽它說話的物品：椅子或冰箱。",
    "canonicalTaskKey": "v4:judge:20:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_20_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same object to thank: a bed or a washing machine.",
    "textZh": "讓兩位其他玩家選同一件要感謝的物品：床或洗衣機。",
    "canonicalTaskKey": "v4:judge:20:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_20"
    ]
  },
  {
    "id": "villager_v4_21_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which small mistake deserves a ten-second redo.",
    "textZh": "問一位玩家，哪種小失誤值得重來十秒。",
    "canonicalTaskKey": "v4:reporter:21:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they would not want a friend to redo.",
    "textZh": "問一位玩家，不希望朋友把哪件事重來。",
    "canonicalTaskKey": "v4:reporter:21:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a harmless mistake you corrected quickly.",
    "textZh": "分享你很快修正過的一個無害小失誤。",
    "canonicalTaskKey": "v4:veteran:21:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a mistake that led to something enjoyable.",
    "textZh": "分享一次後來帶來樂趣的小失誤。",
    "canonicalTaskKey": "v4:veteran:21:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “Please return my last ten seconds.”",
    "textZh": "說出「Please return my last ten seconds.」。",
    "canonicalTaskKey": "v4:bait:21:1",
    "variantGroup": "request_impossible_refund",
    "mechanicKey": "request_impossible_refund",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Please return my last ten seconds."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “Let me try that again” twice in a row.",
    "textZh": "連說兩次「Let me try that again」。",
    "canonicalTaskKey": "v4:bait:21:2",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "family": "repetition",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Let me try that again"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one useful limit for a ten-second redo button.",
    "textZh": "想像重來十秒按鈕的一項有用限制。",
    "canonicalTaskKey": "v4:dreamer:21:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a funny harmless result of pressing the redo button by accident.",
    "textZh": "想像誤按重來按鈕的一個好笑但無害結果。",
    "canonicalTaskKey": "v4:dreamer:21:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of being unable to undo every mistake.",
    "textZh": "說出無法撤銷所有失誤的一個好處。",
    "canonicalTaskKey": "v4:contrarian:21:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with using a redo button while cooking.",
    "textZh": "說出做菜時使用重來按鈕的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:21:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same redo use: spilled tea or a wrong message.",
    "textZh": "讓兩位其他玩家選同一種重來用途：打翻茶或傳錯訊息。",
    "canonicalTaskKey": "v4:judge:21:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_21_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same limit: once daily or only at home.",
    "textZh": "讓兩位其他玩家選同一項限制：每天一次或只能在家。",
    "canonicalTaskKey": "v4:judge:21:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_21"
    ]
  },
  {
    "id": "villager_v4_22_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which ordinary object would surprise them in a future package.",
    "textZh": "問一位玩家，未來包裹裡出現哪種普通物品會讓他意外。",
    "canonicalTaskKey": "v4:reporter:22:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what interest they hope their future self keeps.",
    "textZh": "問一位玩家，希望未來的自己保留哪個興趣。",
    "canonicalTaskKey": "v4:reporter:22:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an object that shows how your daily life has changed.",
    "textZh": "分享一件能看出你生活改變的物品。",
    "canonicalTaskKey": "v4:veteran:22:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you own that your younger self would find surprising.",
    "textZh": "分享一件以前的你會覺得意外的現有物品。",
    "canonicalTaskKey": "v4:veteran:22:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My future self forgot the return address.”",
    "textZh": "說出「My future self forgot the return address.」。",
    "canonicalTaskKey": "v4:bait:22:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My future self forgot the return address."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank an imaginary pair of walking shoes.",
    "textZh": "感謝想像中的一雙步行鞋。",
    "canonicalTaskKey": "v4:bait:22:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an ordinary object that hints at a new future hobby.",
    "textZh": "想像一件透露未來新興趣的普通物品。",
    "canonicalTaskKey": "v4:dreamer:22:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a package whose size hides a harmless impossible surprise.",
    "textZh": "描述一個大小藏著無害超現實驚喜的包裹。",
    "canonicalTaskKey": "v4:dreamer:22:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of receiving no letter with the package.",
    "textZh": "說出包裹裡沒有信的一個好處。",
    "canonicalTaskKey": "v4:contrarian:22:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with learning every detail of your future day.",
    "textZh": "說出知道未來日常所有細節的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:22:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same package item: shoes or a cookbook.",
    "textZh": "讓兩位其他玩家選同一件包裹物品：鞋子或食譜書。",
    "canonicalTaskKey": "v4:judge:22:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_22_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same clue to receive: a work object or a hobby object.",
    "textZh": "讓兩位其他玩家選同一種想收到的線索：工作用品或興趣用品。",
    "canonicalTaskKey": "v4:judge:22:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_22"
    ]
  },
  {
    "id": "villager_v4_23_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which everyday sound they would like to hear again.",
    "textZh": "問一位玩家，想再聽到哪一種日常聲音。",
    "canonicalTaskKey": "v4:reporter:23:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which ordinary place they remember clearly.",
    "textZh": "問一位玩家，記得很清楚的普通地方是哪裡。",
    "canonicalTaskKey": "v4:reporter:23:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share one small detail from an ordinary day you remember.",
    "textZh": "分享某個普通日子裡記得的一個小細節。",
    "canonicalTaskKey": "v4:veteran:23:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an everyday sound that reminds you of a place.",
    "textZh": "分享一種會讓你想到某個地方的日常聲音。",
    "canonicalTaskKey": "v4:veteran:23:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My memory forgot to bring the camera.”",
    "textZh": "說出「My memory forgot to bring the camera.」。",
    "canonicalTaskKey": "v4:bait:23:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My memory forgot to bring the camera."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a soft clock-ticking sound.",
    "textZh": "發出一小段輕柔的時鐘滴答聲。",
    "canonicalTaskKey": "v4:bait:23:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a window that lets you watch one ordinary old moment.",
    "textZh": "想像一扇能觀看普通舊時光的窗戶。",
    "canonicalTaskKey": "v4:dreamer:23:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an object that saves one everyday sound for later.",
    "textZh": "描述一件能保存日常聲音的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:23:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of an imperfect memory.",
    "textZh": "說出記憶不完美的一個好處。",
    "canonicalTaskKey": "v4:contrarian:23:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with remembering every ordinary minute clearly.",
    "textZh": "說出每個普通片刻都記得清清楚楚的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:23:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same moment to revisit: a meal or a walk.",
    "textZh": "讓兩位其他玩家選同一種想重看的片段：吃飯或散步。",
    "canonicalTaskKey": "v4:judge:23:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_23_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same memory record: a photo or a sound.",
    "textZh": "讓兩位其他玩家選同一種回憶記錄：照片或聲音。",
    "canonicalTaskKey": "v4:judge:23:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_23"
    ]
  },
  {
    "id": "villager_v4_24_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which tiny daily problem they would pay to remove.",
    "textZh": "問一位玩家，願意花錢消除哪個日常小麻煩。",
    "canonicalTaskKey": "v4:reporter:24:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which task they would never hand to a service.",
    "textZh": "問一位玩家，什麼事情絕不交給代辦服務。",
    "canonicalTaskKey": "v4:reporter:24:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small service that saved you time.",
    "textZh": "分享一項曾替你省時間的小服務。",
    "canonicalTaskKey": "v4:veteran:24:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a convenience you found less useful than expected.",
    "textZh": "分享一種不如預期有用的便利。",
    "canonicalTaskKey": "v4:veteran:24:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “I would like to return this inconvenience.”",
    "textZh": "說出「I would like to return this inconvenience.」。",
    "canonicalTaskKey": "v4:bait:24:1",
    "variantGroup": "request_impossible_refund",
    "mechanicKey": "request_impossible_refund",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I would like to return this inconvenience."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Offer to pay for a magic service with three imaginary biscuits.",
    "textZh": "提議用三塊想像中的餅乾支付魔法服務。",
    "canonicalTaskKey": "v4:bait:24:2",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "family": "absurd_price",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a service that solves one tiny daily problem.",
    "textZh": "想像一種解決日常小麻煩的超現實服務。",
    "canonicalTaskKey": "v4:dreamer:24:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe one harmless mistake a magic delivery service could make.",
    "textZh": "描述魔法外送服務可能犯的一個無害錯誤。",
    "canonicalTaskKey": "v4:dreamer:24:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of doing a small chore without a service.",
    "textZh": "說出小家事不用代辦的一個好處。",
    "canonicalTaskKey": "v4:contrarian:24:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a service that always arrives instantly.",
    "textZh": "說出服務永遠瞬間抵達的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:24:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same magic service: finding socks or cleaning windows.",
    "textZh": "讓兩位其他玩家選同一種魔法服務：找襪子或擦窗。",
    "canonicalTaskKey": "v4:judge:24:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_24_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same payment method: money or trading a favor.",
    "textZh": "讓兩位其他玩家選同一種付款方式：金錢或交換幫忙。",
    "canonicalTaskKey": "v4:judge:24:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_24"
    ]
  },
  {
    "id": "villager_v4_25_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which kind of gift is hardest to use.",
    "textZh": "問一位玩家，哪一種禮物最難用到。",
    "canonicalTaskKey": "v4:reporter:25:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone whether they want to hear an honest reaction to their gift.",
    "textZh": "問一位玩家，是否想聽到對方對禮物的真實反應。",
    "canonicalTaskKey": "v4:reporter:25:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a gift that suited you better than expected.",
    "textZh": "分享一份比預期更適合自己的禮物。",
    "canonicalTaskKey": "v4:veteran:25:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an experience you enjoyed receiving instead of an object.",
    "textZh": "分享一次收到非物品禮物的愉快體驗。",
    "canonicalTaskKey": "v4:veteran:25:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Sing “Thank you for the surprise.”",
    "textZh": "唱出「Thank you for the surprise.」。",
    "canonicalTaskKey": "v4:bait:25:1",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Thank you for the surprise."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The wrapping paper understands me better.”",
    "textZh": "說出「The wrapping paper understands me better.」。",
    "canonicalTaskKey": "v4:bait:25:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The wrapping paper understands me better."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a gift that can turn into something its owner needs.",
    "textZh": "想像一份會變成主人所需物品的禮物。",
    "canonicalTaskKey": "v4:dreamer:25:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic gift that takes up no space.",
    "textZh": "描述一份完全不占空間的魔法禮物。",
    "canonicalTaskKey": "v4:dreamer:25:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of asking for a specific gift.",
    "textZh": "說出直接指定禮物的一個好處。",
    "canonicalTaskKey": "v4:contrarian:25:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with receiving a very expensive gift.",
    "textZh": "說出收到非常昂貴禮物的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:25:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same gift: a book or a meal.",
    "textZh": "讓兩位其他玩家在書和一頓飯中選同一項禮物。",
    "canonicalTaskKey": "v4:judge:25:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_25_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same gift style: a surprise or a clear request.",
    "textZh": "讓兩位其他玩家選同一種送禮方式：驚喜或照清楚要求準備。",
    "canonicalTaskKey": "v4:judge:25:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_25"
    ]
  },
  {
    "id": "villager_v4_26_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what small difference in a dinner bill does not bother them.",
    "textZh": "問一位玩家，餐費差多少時不會在意。",
    "canonicalTaskKey": "v4:reporter:26:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they prefer to discuss splitting a bill.",
    "textZh": "問一位玩家，想在什麼時候討論分帳。",
    "canonicalTaskKey": "v4:reporter:26:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a thoughtful way you have seen friends handle a bill.",
    "textZh": "分享你看過朋友貼心處理帳單的方式。",
    "canonicalTaskKey": "v4:veteran:26:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small treat you have enjoyed giving someone.",
    "textZh": "分享你曾開心請別人吃的一樣小東西。",
    "canonicalTaskKey": "v4:veteran:26:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My wallet wants a smaller dinner.”",
    "textZh": "說出「My wallet wants a smaller dinner.」。",
    "canonicalTaskKey": "v4:bait:26:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My wallet wants a smaller dinner."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Offer an imaginary coin as big as a dinner plate.",
    "textZh": "提議拿出一枚餐盤大的想像硬幣。",
    "canonicalTaskKey": "v4:bait:26:2",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "family": "absurd_price",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a bill that explains itself without embarrassing anyone.",
    "textZh": "想像一張能自己說明又不讓人尷尬的帳單。",
    "canonicalTaskKey": "v4:dreamer:26:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic way to share a dessert fairly.",
    "textZh": "描述一種公平分甜點的魔法方法。",
    "canonicalTaskKey": "v4:dreamer:26:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of discussing prices before ordering.",
    "textZh": "說出點餐前先談價格的一個好處。",
    "canonicalTaskKey": "v4:contrarian:26:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with a friend always paying for everyone.",
    "textZh": "說出朋友永遠替大家付錢的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:26:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same bill method: equal shares or paying for their own food.",
    "textZh": "讓兩位其他玩家選同一種分帳方式：平分或各付各的。",
    "canonicalTaskKey": "v4:judge:26:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_26_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same shared dish: fries or salad.",
    "textZh": "讓兩位其他玩家選同一道分享餐點：薯條或沙拉。",
    "canonicalTaskKey": "v4:judge:26:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_26"
    ]
  },
  {
    "id": "villager_v4_27_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which group-chat messages need a quick reply.",
    "textZh": "問一位玩家，群組裡哪些訊息需要快回。",
    "canonicalTaskKey": "v4:reporter:27:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they would mute a group chat.",
    "textZh": "問一位玩家，什麼時候會把群組靜音。",
    "canonicalTaskKey": "v4:reporter:27:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a group-chat message that made you feel included.",
    "textZh": "分享一則讓你有參與感的群組訊息。",
    "canonicalTaskKey": "v4:veteran:27:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a habit that helped you manage phone messages.",
    "textZh": "分享一個幫你處理手機訊息的習慣。",
    "canonicalTaskKey": "v4:veteran:27:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My notifications need their own group chat.”",
    "textZh": "說出「My notifications need their own group chat.」。",
    "canonicalTaskKey": "v4:bait:27:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My notifications need their own group chat."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a phone vibration sound.",
    "textZh": "用嘴巴模仿手機震動聲。",
    "canonicalTaskKey": "v4:bait:27:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a group-chat feature that protects quiet time.",
    "textZh": "想像一個能保護安靜時間的神奇群組功能。",
    "canonicalTaskKey": "v4:dreamer:27:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a message that can deliver a small comfort.",
    "textZh": "想像一則能送來小小舒適感的魔法訊息。",
    "canonicalTaskKey": "v4:dreamer:27:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of not replying immediately.",
    "textZh": "說出不馬上回訊息的一個好處。",
    "canonicalTaskKey": "v4:contrarian:27:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with never missing a group-chat message.",
    "textZh": "說出群組每則訊息都不漏看的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:27:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same quick response: an emoji or a short message.",
    "textZh": "讓兩位其他玩家選同一種快速回應：表情符號或短訊息。",
    "canonicalTaskKey": "v4:judge:27:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_27_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same group-chat focus: plans or daily life.",
    "textZh": "讓兩位其他玩家選同一種群組重點：活動安排或日常聊天。",
    "canonicalTaskKey": "v4:judge:27:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_27"
    ]
  },
  {
    "id": "villager_v4_28_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they want friends to do before sharing a photo.",
    "textZh": "問一位玩家，希望朋友分享照片前先做什麼。",
    "canonicalTaskKey": "v4:reporter:28:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which moment they would rather not photograph.",
    "textZh": "問一位玩家，哪種時刻不想拍照。",
    "canonicalTaskKey": "v4:reporter:28:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a photo you like because of its story.",
    "textZh": "分享一張你因背後故事而喜歡的照片。",
    "canonicalTaskKey": "v4:veteran:28:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a time you enjoyed a moment without taking photos.",
    "textZh": "分享一次沒拍照卻很享受的時刻。",
    "canonicalTaskKey": "v4:veteran:28:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My camera has better social skills than I do.”",
    "textZh": "說出「My camera has better social skills than I do.」。",
    "canonicalTaskKey": "v4:bait:28:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My camera has better social skills than I do."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Make a camera-shutter sound with your voice.",
    "textZh": "用嘴巴模仿一次相機快門聲。",
    "canonicalTaskKey": "v4:bait:28:2",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a photo that keeps a feeling instead of an image.",
    "textZh": "想像一張保存感受而非影像的照片。",
    "canonicalTaskKey": "v4:dreamer:28:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a camera feature that gives everyone comfortable privacy.",
    "textZh": "描述一項讓每個人保有舒適隱私的神奇相機功能。",
    "canonicalTaskKey": "v4:dreamer:28:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of an imperfect group photo.",
    "textZh": "說出合照不完美的一個好處。",
    "canonicalTaskKey": "v4:contrarian:28:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with taking a hundred photos of every gathering.",
    "textZh": "說出每次聚會都拍一百張照片的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:28:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same photo plan: one group photo or many casual photos.",
    "textZh": "讓兩位其他玩家選同一種拍照安排：一張合照或很多隨手照。",
    "canonicalTaskKey": "v4:judge:28:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_28_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to keep a memory: a photo or a short written note.",
    "textZh": "讓兩位其他玩家選同一種留念方式：照片或短文字。",
    "canonicalTaskKey": "v4:judge:28:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_28"
    ]
  },
  {
    "id": "villager_v4_29_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which task they prefer doing without help.",
    "textZh": "問一位玩家，哪項事情想自己做、不需要幫忙。",
    "canonicalTaskKey": "v4:reporter:29:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what kind of help they welcome without being asked.",
    "textZh": "問一位玩家，歡迎別人直接幫哪一種忙。",
    "canonicalTaskKey": "v4:reporter:29:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small favor that was exactly what you needed.",
    "textZh": "分享一件剛好符合你需要的小幫忙。",
    "canonicalTaskKey": "v4:veteran:29:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you enjoyed learning to do yourself.",
    "textZh": "分享一件你喜歡學著自己做的事。",
    "canonicalTaskKey": "v4:veteran:29:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My helpful spoon has taken over the kitchen.”",
    "textZh": "說出「My helpful spoon has taken over the kitchen.」。",
    "canonicalTaskKey": "v4:bait:29:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My helpful spoon has taken over the kitchen."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank an imaginary pair of helpful shoes.",
    "textZh": "感謝一雙想像中很會幫忙的鞋子。",
    "canonicalTaskKey": "v4:bait:29:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a helper that can tell when you want company rather than help.",
    "textZh": "想像一個分得出你想要陪伴還是幫忙的魔法助手。",
    "canonicalTaskKey": "v4:dreamer:29:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an object that makes asking for a small favor easier.",
    "textZh": "描述一件讓人更容易開口求助的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:29:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of asking before helping.",
    "textZh": "說出幫忙前先詢問的一個好處。",
    "canonicalTaskKey": "v4:contrarian:29:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with someone finishing all your work for you.",
    "textZh": "說出別人替你把事情全做完的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:29:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same help: listening or doing one small task.",
    "textZh": "讓兩位其他玩家選同一種幫忙：聆聽或代做一件小事。",
    "canonicalTaskKey": "v4:judge:29:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_29_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to learn: watching a demonstration or trying alone.",
    "textZh": "讓兩位其他玩家選同一種學習方式：看示範或自己試。",
    "canonicalTaskKey": "v4:judge:29:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_29"
    ]
  },
  {
    "id": "villager_v4_30_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how much notice they want before a plan is cancelled.",
    "textZh": "問一位玩家，希望活動取消前多久被告知。",
    "canonicalTaskKey": "v4:reporter:30:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which invitation they often accept too quickly.",
    "textZh": "問一位玩家，常對哪一種邀約答應得太快。",
    "canonicalTaskKey": "v4:reporter:30:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an outing that was better than you expected.",
    "textZh": "分享一次比預期更好的出門經驗。",
    "canonicalTaskKey": "v4:veteran:30:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a restful plan you were glad you kept.",
    "textZh": "分享一次很慶幸有保留下來的休息安排。",
    "canonicalTaskKey": "v4:veteran:30:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My sofa has already made plans for me.”",
    "textZh": "說出「My sofa has already made plans for me.」。",
    "canonicalTaskKey": "v4:bait:30:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My sofa has already made plans for me."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Sing “I need a quiet evening.”",
    "textZh": "唱出「I need a quiet evening.」。",
    "canonicalTaskKey": "v4:bait:30:2",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I need a quiet evening."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a calendar feature that protects needed rest.",
    "textZh": "想像一個能保護必要休息時間的魔法行事曆功能。",
    "canonicalTaskKey": "v4:dreamer:30:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an impossible way to visit friends without leaving your restful room.",
    "textZh": "想像不用離開休息房間也能和朋友相聚的方法。",
    "canonicalTaskKey": "v4:dreamer:30:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a cancelled evening plan.",
    "textZh": "說出晚間活動取消的一個好處。",
    "canonicalTaskKey": "v4:contrarian:30:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with saying yes to every invitation.",
    "textZh": "說出所有邀約都答應的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:30:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same shorter plan: a walk or a coffee.",
    "textZh": "讓兩位其他玩家選同一種縮短版安排：散步或喝咖啡。",
    "canonicalTaskKey": "v4:judge:30:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_30_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same invitation timing: today or a week ahead.",
    "textZh": "讓兩位其他玩家選同一種邀請時間：當天或一週前。",
    "canonicalTaskKey": "v4:judge:30:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_30"
    ]
  },
  {
    "id": "villager_v4_31_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which kind of feedback they want on a new creation.",
    "textZh": "問一位玩家，對新作品想聽哪一種回饋。",
    "canonicalTaskKey": "v4:reporter:31:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what makes criticism easier to listen to.",
    "textZh": "問一位玩家，怎樣的批評方式比較聽得進去。",
    "canonicalTaskKey": "v4:reporter:31:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a useful comment someone gave on something you made.",
    "textZh": "分享別人對你的作品說過的一句有用意見。",
    "canonicalTaskKey": "v4:veteran:31:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a time encouragement helped you keep trying.",
    "textZh": "分享一次鼓勵讓你繼續嘗試的經驗。",
    "canonicalTaskKey": "v4:veteran:31:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My honest opinion needs a soft cushion.”",
    "textZh": "說出「My honest opinion needs a soft cushion.」。",
    "canonicalTaskKey": "v4:bait:31:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My honest opinion needs a soft cushion."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “I like this part” three times in a row.",
    "textZh": "連說三次「I like this part」。",
    "canonicalTaskKey": "v4:bait:31:2",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "family": "repetition",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I like this part"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a tool that turns useful feedback into a visible color.",
    "textZh": "想像一件把有用回饋變成可見顏色的工具。",
    "canonicalTaskKey": "v4:dreamer:31:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic notebook that helps a beginner keep creating.",
    "textZh": "描述一本幫新手繼續創作的魔法筆記本。",
    "canonicalTaskKey": "v4:dreamer:31:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of hearing that someone has different tastes.",
    "textZh": "說出聽到別人品味不同的一個好處。",
    "canonicalTaskKey": "v4:contrarian:31:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with receiving only praise.",
    "textZh": "說出只收到稱讚的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:31:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same feedback style: one clear suggestion or general encouragement.",
    "textZh": "讓兩位其他玩家選同一種回饋：一個明確建議或整體鼓勵。",
    "canonicalTaskKey": "v4:judge:31:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_31_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same feedback time: immediately or the next day.",
    "textZh": "讓兩位其他玩家選同一個回饋時間：當下或隔天。",
    "canonicalTaskKey": "v4:judge:31:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_31"
    ]
  },
  {
    "id": "villager_v4_32_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which object they would be reluctant to lend.",
    "textZh": "問一位玩家，哪件物品會不太想借人。",
    "canonicalTaskKey": "v4:reporter:32:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which signs of wear do not bother them.",
    "textZh": "問一位玩家，哪些使用痕跡不會讓他在意。",
    "canonicalTaskKey": "v4:reporter:32:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something useful you once borrowed.",
    "textZh": "分享一件你曾借過的實用物品。",
    "canonicalTaskKey": "v4:veteran:32:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a habit you follow when borrowing something.",
    "textZh": "分享你借東西時會遵守的一個習慣。",
    "canonicalTaskKey": "v4:veteran:32:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My favorite mug needs a travel contract.”",
    "textZh": "說出「My favorite mug needs a travel contract.」。",
    "canonicalTaskKey": "v4:bait:32:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My favorite mug needs a travel contract."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Apologize to an imaginary scratched book cover.",
    "textZh": "向想像中刮傷的書封面道歉。",
    "canonicalTaskKey": "v4:bait:32:2",
    "variantGroup": "apologize_to_object",
    "mechanicKey": "apologize_to_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address",
      "apology"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a protective feature for a borrowed object.",
    "textZh": "想像借出物品的一項魔法保護功能。",
    "canonicalTaskKey": "v4:dreamer:32:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a bag that returns borrowed things by itself.",
    "textZh": "描述一個會自行歸還借物的袋子。",
    "canonicalTaskKey": "v4:dreamer:32:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of borrowing an already worn object.",
    "textZh": "說出借用已經有使用痕跡物品的一個好處。",
    "canonicalTaskKey": "v4:contrarian:32:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with never lending anything.",
    "textZh": "說出任何東西都不借人的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:32:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same item to lend: a book or a cooking pot.",
    "textZh": "讓兩位其他玩家選同一種願意借出的物品：書或鍋子。",
    "canonicalTaskKey": "v4:judge:32:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_32_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same response to a small scratch: an apology or a repair.",
    "textZh": "讓兩位其他玩家選同一種小刮傷處理方式：道歉或修補。",
    "canonicalTaskKey": "v4:judge:32:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_32"
    ]
  },
  {
    "id": "villager_v4_33_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which everyday choice they would hand to an assistant.",
    "textZh": "問一位玩家，願意把哪個日常選擇交給助理。",
    "canonicalTaskKey": "v4:reporter:33:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which choice they want to keep making themselves.",
    "textZh": "問一位玩家，哪個選擇一定要自己做。",
    "canonicalTaskKey": "v4:reporter:33:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a recommendation that suited you well.",
    "textZh": "分享一次很適合自己的推薦。",
    "canonicalTaskKey": "v4:veteran:33:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something convenient that became less enjoyable over time.",
    "textZh": "分享一種用久後變得比較無趣的便利。",
    "canonicalTaskKey": "v4:veteran:33:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My assistant should choose its own day off.”",
    "textZh": "說出「My assistant should choose its own day off.」。",
    "canonicalTaskKey": "v4:bait:33:1",
    "variantGroup": "object_wants_time_off",
    "mechanicKey": "object_wants_time_off",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My assistant should choose its own day off."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Ask an imaginary shopping list for permission to buy a snack.",
    "textZh": "向想像中的購物清單詢問能不能買點心。",
    "canonicalTaskKey": "v4:bait:33:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a small assistant feature that leaves room for surprises.",
    "textZh": "想像一個保留驚喜空間的生活助理功能。",
    "canonicalTaskKey": "v4:dreamer:33:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an impossible helpful mistake your assistant could make.",
    "textZh": "描述助理可能犯的一個意外有幫助的超現實錯誤。",
    "canonicalTaskKey": "v4:dreamer:33:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of a recommendation you do not like.",
    "textZh": "說出收到不喜歡的推薦的一個好處。",
    "canonicalTaskKey": "v4:contrarian:33:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with an assistant always choosing your favorite meal.",
    "textZh": "說出助理永遠選你最愛餐點的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:33:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same assistant task: buying groceries or choosing restaurants.",
    "textZh": "讓兩位其他玩家選同一項助理工作：買食材或選餐廳。",
    "canonicalTaskKey": "v4:judge:33:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_33_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same recommendation style: familiar or surprising.",
    "textZh": "讓兩位其他玩家選同一種推薦風格：熟悉或有驚喜。",
    "canonicalTaskKey": "v4:judge:33:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_33"
    ]
  },
  {
    "id": "villager_v4_34_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which planning job they would happily keep doing.",
    "textZh": "問一位玩家，哪種安排工作願意一直做。",
    "canonicalTaskKey": "v4:reporter:34:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what help would make organizing easier for them.",
    "textZh": "問一位玩家，什麼幫忙會讓安排事情更輕鬆。",
    "canonicalTaskKey": "v4:reporter:34:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small event you helped organize.",
    "textZh": "分享一項你協助安排過的小活動。",
    "canonicalTaskKey": "v4:veteran:34:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a time someone noticed your effort.",
    "textZh": "分享一次別人注意到你付出的經驗。",
    "canonicalTaskKey": "v4:veteran:34:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My calendar would like an assistant.”",
    "textZh": "說出「My calendar would like an assistant.」。",
    "canonicalTaskKey": "v4:bait:34:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My calendar would like an assistant."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Offer an imaginary planning fee of one million biscuits.",
    "textZh": "提出一百萬塊想像餅乾的規劃費。",
    "canonicalTaskKey": "v4:bait:34:2",
    "variantGroup": "quote_absurd_price",
    "mechanicKey": "quote_absurd_price",
    "family": "absurd_price",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "absurd_price"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an object that divides planning work fairly.",
    "textZh": "想像一件能公平分配安排工作的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:34:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a magic reminder that does not annoy anyone.",
    "textZh": "描述一種不會打擾人的魔法提醒。",
    "canonicalTaskKey": "v4:dreamer:34:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of letting a beginner organize the next gathering.",
    "textZh": "說出讓新手安排下次聚會的一個好處。",
    "canonicalTaskKey": "v4:contrarian:34:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with being known as the perfect organizer.",
    "textZh": "說出被當成完美主辦人的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:34:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same planning job: choosing food or choosing a place.",
    "textZh": "讓兩位其他玩家選同一項安排工作：選餐點或選地點。",
    "canonicalTaskKey": "v4:judge:34:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_34_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same next organizer method: volunteer or take turns.",
    "textZh": "讓兩位其他玩家選同一種下次主辦方式：自願或輪流。",
    "canonicalTaskKey": "v4:judge:34:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_34"
    ]
  },
  {
    "id": "villager_v4_35_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which part of a hobby they want to keep free of deadlines.",
    "textZh": "問一位玩家，興趣的哪個部分不想有期限。",
    "canonicalTaskKey": "v4:reporter:35:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how they want friends to support a hobby.",
    "textZh": "問一位玩家，希望朋友怎麼支持自己的興趣。",
    "canonicalTaskKey": "v4:reporter:35:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a hobby you enjoyed without producing anything useful.",
    "textZh": "分享一個沒有實用成果也很享受的興趣。",
    "canonicalTaskKey": "v4:veteran:35:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a time making something for someone changed the experience.",
    "textZh": "分享一次替別人製作東西而感受不同的經驗。",
    "canonicalTaskKey": "v4:veteran:35:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My hobby refused to sign a work contract.”",
    "textZh": "說出「My hobby refused to sign a work contract.」。",
    "canonicalTaskKey": "v4:bait:35:1",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My hobby refused to sign a work contract."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Sing “I made this just for fun.”",
    "textZh": "唱出「I made this just for fun.」。",
    "canonicalTaskKey": "v4:bait:35:2",
    "variantGroup": "sing_short_phrase",
    "mechanicKey": "sing_short_phrase",
    "family": "singing",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "singing",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I made this just for fun."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a tool that keeps one hobby free from time pressure.",
    "textZh": "想像一件讓某個興趣不受時間壓力的魔法工具。",
    "canonicalTaskKey": "v4:dreamer:35:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a place where unfinished hobby projects can rest.",
    "textZh": "想像一個讓未完成興趣作品休息的地方。",
    "canonicalTaskKey": "v4:dreamer:35:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of being only average at a hobby.",
    "textZh": "說出興趣做得普通的一個好處。",
    "canonicalTaskKey": "v4:contrarian:35:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with every hobby becoming profitable.",
    "textZh": "說出每個興趣都能賺錢的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:35:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same hobby boundary: no deadlines or no paid requests.",
    "textZh": "讓兩位其他玩家選同一項興趣界線：沒有期限或不接付費委託。",
    "canonicalTaskKey": "v4:judge:35:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_35_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to enjoy a hobby: alone or with a friend.",
    "textZh": "讓兩位其他玩家選同一種享受興趣的方式：獨自或和朋友。",
    "canonicalTaskKey": "v4:judge:35:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_35"
    ]
  },
  {
    "id": "villager_v4_36_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which small preference they have changed.",
    "textZh": "問一位玩家，曾改變哪一個小偏好。",
    "canonicalTaskKey": "v4:reporter:36:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what response helps them admit a change of mind.",
    "textZh": "問一位玩家，什麼回應能讓他自在承認改變想法。",
    "canonicalTaskKey": "v4:reporter:36:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you learned to like after disliking it.",
    "textZh": "分享一件從不喜歡變成喜歡的事。",
    "canonicalTaskKey": "v4:veteran:36:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small choice you reconsidered after trying it.",
    "textZh": "分享一個試過後重新考慮的小選擇。",
    "canonicalTaskKey": "v4:veteran:36:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My old opinion has moved to a new address.”",
    "textZh": "說出「My old opinion has moved to a new address.」。",
    "canonicalTaskKey": "v4:bait:36:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My old opinion has moved to a new address."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “I changed my mind” twice in a row.",
    "textZh": "連說兩次「I changed my mind」。",
    "canonicalTaskKey": "v4:bait:36:2",
    "variantGroup": "repeat_same_phrase_consecutively",
    "mechanicKey": "repeat_same_phrase_consecutively",
    "family": "repetition",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "repetition",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "I changed my mind"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a safe one-day trial for a lifestyle you are curious about.",
    "textZh": "想像對好奇的生活方式進行一天安全試用。",
    "canonicalTaskKey": "v4:dreamer:36:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an object that makes trying a new habit easier.",
    "textZh": "描述一件讓新習慣更容易試行的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:36:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of admitting that an old choice no longer suits you.",
    "textZh": "說出承認舊選擇已不適合自己的一個好處。",
    "canonicalTaskKey": "v4:contrarian:36:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with never changing your mind.",
    "textZh": "說出永遠不改變想法的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:36:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to test a new habit: one day or one week.",
    "textZh": "讓兩位其他玩家選同一種試新習慣時間：一天或一週。",
    "canonicalTaskKey": "v4:judge:36:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_36_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same small change: a new breakfast or a new walking route.",
    "textZh": "讓兩位其他玩家選同一個小改變：新早餐或新散步路線。",
    "canonicalTaskKey": "v4:judge:36:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_36"
    ]
  },
  {
    "id": "villager_v4_37_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which old object a photo could not replace.",
    "textZh": "問一位玩家，哪件舊物不能只靠照片取代。",
    "canonicalTaskKey": "v4:reporter:37:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what kind of object is easy for them to give away.",
    "textZh": "問一位玩家，哪一種物品很容易送走。",
    "canonicalTaskKey": "v4:reporter:37:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share the story of an old object you kept.",
    "textZh": "分享一件你留下的舊物的故事。",
    "canonicalTaskKey": "v4:veteran:37:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something that became useful again after sitting unused.",
    "textZh": "分享一件閒置後又派上用場的東西。",
    "canonicalTaskKey": "v4:veteran:37:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This old ticket has earned a room of its own.”",
    "textZh": "說出「This old ticket has earned a room of its own.」。",
    "canonicalTaskKey": "v4:bait:37:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This old ticket has earned a room of its own."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank an old object for its hard work.",
    "textZh": "感謝一件舊物辛苦工作。",
    "canonicalTaskKey": "v4:bait:37:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a box that stores old objects without taking up space.",
    "textZh": "想像一個存放舊物卻不占空間的盒子。",
    "canonicalTaskKey": "v4:dreamer:37:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a shelf that can show an object’s happiest memory.",
    "textZh": "描述一個能展示物品最快樂回憶的架子。",
    "canonicalTaskKey": "v4:dreamer:37:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of keeping only a photo of an object.",
    "textZh": "說出只留物品照片的一個好處。",
    "canonicalTaskKey": "v4:contrarian:37:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with being able to keep everything forever.",
    "textZh": "說出所有東西都能永遠留著的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:37:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same thing to keep: an old photo or an old ticket.",
    "textZh": "讓兩位其他玩家選同一種保留物：舊照片或舊票根。",
    "canonicalTaskKey": "v4:judge:37:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_37_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same storage place: a box or a shelf.",
    "textZh": "讓兩位其他玩家選同一種保存位置：盒子或架子。",
    "canonicalTaskKey": "v4:judge:37:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_37"
    ]
  },
  {
    "id": "villager_v4_38_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what help they would want after sending a message to the wrong person.",
    "textZh": "問一位玩家，傳錯訊息後希望得到什麼幫忙。",
    "canonicalTaskKey": "v4:reporter:38:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how much friendly teasing still feels fun.",
    "textZh": "問一位玩家，朋友開玩笑到什麼程度還覺得好玩。",
    "canonicalTaskKey": "v4:reporter:38:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a harmless mix-up you can now laugh about.",
    "textZh": "分享一件現在能笑著看待的無害小誤會。",
    "canonicalTaskKey": "v4:veteran:38:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a practical method you learned after a small mistake.",
    "textZh": "分享小失誤後學到的一個實用方法。",
    "canonicalTaskKey": "v4:veteran:38:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Add a “ta-da” sound to a small mistake you describe.",
    "textZh": "替你說到的小失誤加上「ta-da」音效。",
    "canonicalTaskKey": "v4:bait:38:1",
    "variantGroup": "imitate_alert_sound",
    "mechanicKey": "imitate_alert_sound",
    "family": "sound_effect",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": "voice",
    "actionTags": [
      "sound_effect",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "ta-da"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “This mistake was not in my plan.”",
    "textZh": "說出「This mistake was not in my plan.」。",
    "canonicalTaskKey": "v4:bait:38:2",
    "variantGroup": "absurd_disclaimer",
    "mechanicKey": "absurd_disclaimer",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "This mistake was not in my plan."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an object that gently fixes one harmless mistake.",
    "textZh": "想像一件能溫和修正小失誤的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:38:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a funny harmless result of a message reaching an imaginary object.",
    "textZh": "想像訊息傳給物品後的一個好笑但無害結果。",
    "canonicalTaskKey": "v4:dreamer:38:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of making a small mistake in front of friends.",
    "textZh": "說出在朋友面前犯小錯的一個好處。",
    "canonicalTaskKey": "v4:contrarian:38:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with friends remembering every detail of a mistake.",
    "textZh": "說出朋友記得小失誤所有細節的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:38:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same help after a mix-up: a quick explanation or a quiet moment.",
    "textZh": "讓兩位其他玩家選同一種出包後的幫忙：簡短說明或安靜一下。",
    "canonicalTaskKey": "v4:judge:38:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_38_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same key reminder: a note by the door or a phone alert.",
    "textZh": "讓兩位其他玩家選同一種鑰匙提醒：門邊紙條或手機通知。",
    "canonicalTaskKey": "v4:judge:38:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_38"
    ]
  },
  {
    "id": "villager_v4_39_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which small action makes a good first impression.",
    "textZh": "問一位玩家，哪個小舉動會留下好印象。",
    "canonicalTaskKey": "v4:reporter:39:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which situation makes them quieter than usual.",
    "textZh": "問一位玩家，什麼場合會讓他比平常安靜。",
    "canonicalTaskKey": "v4:reporter:39:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a harmless moment that changed your first impression of someone.",
    "textZh": "分享一個改變你對某人第一印象的普通時刻。",
    "canonicalTaskKey": "v4:veteran:39:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an interest you unexpectedly had in common with someone.",
    "textZh": "分享一次意外發現和別人有共同興趣的經驗。",
    "canonicalTaskKey": "v4:veteran:39:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My first impression needs new glasses.”",
    "textZh": "說出「My first impression needs new glasses.」。",
    "canonicalTaskKey": "v4:bait:39:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My first impression needs new glasses."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Give an imaginary wrong impression an audible goodbye.",
    "textZh": "對想像中的錯誤印象出聲道別。",
    "canonicalTaskKey": "v4:bait:39:2",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a harmless window into one stranger’s everyday hobby.",
    "textZh": "想像一扇能看見陌生人日常興趣、又不侵犯隱私的窗。",
    "canonicalTaskKey": "v4:dreamer:39:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an object that reveals a person’s unexpected skill.",
    "textZh": "描述一件能展現某人意外本事的神奇物品。",
    "canonicalTaskKey": "v4:dreamer:39:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of being wrong about a first impression.",
    "textZh": "說出第一印象看錯的一個好處。",
    "canonicalTaskKey": "v4:contrarian:39:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with everyone knowing your personality immediately.",
    "textZh": "說出每個人立刻了解你個性的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:39:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same first conversation: hobbies or favorite food.",
    "textZh": "讓兩位其他玩家選同一種初聊內容：興趣或喜歡的食物。",
    "canonicalTaskKey": "v4:judge:39:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_39_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same getting-to-know-you activity: a walk or a game.",
    "textZh": "讓兩位其他玩家選同一種認識彼此的活動：散步或遊戲。",
    "canonicalTaskKey": "v4:judge:39:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_39"
    ]
  },
  {
    "id": "villager_v4_40_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which harmless habit makes their day more comfortable.",
    "textZh": "問一位玩家，哪個無害小習慣讓生活更舒服。",
    "canonicalTaskKey": "v4:reporter:40:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when they can set aside a usual habit.",
    "textZh": "問一位玩家，什麼時候能暫時放下平常的習慣。",
    "canonicalTaskKey": "v4:reporter:40:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small habit you have kept for a long time.",
    "textZh": "分享一個保持很久的小習慣。",
    "canonicalTaskKey": "v4:veteran:40:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a friend’s habit you understood only later.",
    "textZh": "分享一個後來才理解的朋友習慣。",
    "canonicalTaskKey": "v4:veteran:40:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My routine has requested a written explanation.”",
    "textZh": "說出「My routine has requested a written explanation.」。",
    "canonicalTaskKey": "v4:bait:40:1",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My routine has requested a written explanation."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Check an imaginary bag aloud by saying “Keys, phone, snack.”",
    "textZh": "用「Keys, phone, snack.」出聲檢查想像中的袋子。",
    "canonicalTaskKey": "v4:bait:40:2",
    "variantGroup": "spoken_checklist",
    "mechanicKey": "spoken_checklist",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Keys, phone, snack."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one tiny magic feature that supports your favorite habit.",
    "textZh": "想像一項幫助自己喜愛習慣的小魔法功能。",
    "canonicalTaskKey": "v4:dreamer:40:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a room that understands one harmless routine.",
    "textZh": "描述一個懂你某項無害習慣的神奇房間。",
    "canonicalTaskKey": "v4:dreamer:40:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one benefit of occasionally breaking a small routine.",
    "textZh": "說出偶爾打破小習慣的一個好處。",
    "canonicalTaskKey": "v4:contrarian:40:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Say one problem with everyone having exactly your habits.",
    "textZh": "說出所有人習慣都和你一樣的一個麻煩。",
    "canonicalTaskKey": "v4:contrarian:40:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same bag-check time: before leaving or the night before.",
    "textZh": "讓兩位其他玩家選同一個檢查包包時間：出門前或前一晚。",
    "canonicalTaskKey": "v4:judge:40:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_40_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same morning routine: breakfast first or a shower first.",
    "textZh": "讓兩位其他玩家選同一種早晨習慣：先吃早餐或先洗澡。",
    "canonicalTaskKey": "v4:judge:40:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_40"
    ]
  },
  {
    "id": "villager_v4_41_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they expected their purchase to change.",
    "textZh": "問一位玩家，當初預期那項購買會改變什麼。",
    "canonicalTaskKey": "v4:reporter:41:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone where the item they described is now.",
    "textZh": "問一位玩家，他剛才提到的物品現在放在哪裡。",
    "canonicalTaskKey": "v4:reporter:41:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share one thing you bought that you use less often than you expected.",
    "textZh": "分享一件使用次數比預期少的購物成果。",
    "canonicalTaskKey": "v4:veteran:41:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe a cheap purchase that turned out to be surprisingly useful.",
    "textZh": "描述一件價格不高、卻意外實用的購物成果。",
    "canonicalTaskKey": "v4:veteran:41:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Tell a disappointing purchase, “We need to talk.”",
    "textZh": "對一件讓你失望的購物成果說：「We need to talk.」",
    "canonicalTaskKey": "v4:bait:41:1",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "We need to talk."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My shopping cart made a promise it couldn't keep.”",
    "textZh": "說出：「My shopping cart made a promise it couldn't keep.」",
    "canonicalTaskKey": "v4:bait:41:2",
    "variantGroup": "object_personification",
    "mechanicKey": "object_personification",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My shopping cart made a promise it couldn't keep."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one honest warning label for a purchase you regret.",
    "textZh": "想像一個適合貼在後悔購買的物品上的誠實警告標籤。",
    "canonicalTaskKey": "v4:dreamer:41:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a shop that lets customers try their future daily life with a product.",
    "textZh": "描述一間讓客人先體驗買下產品後日常生活的商店。",
    "canonicalTaskKey": "v4:dreamer:41:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason a disappointing purchase might still have been worthwhile.",
    "textZh": "說出一個讓失望的購買仍然值得的理由。",
    "canonicalTaskKey": "v4:contrarian:41:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason you would keep an item you rarely use.",
    "textZh": "說出一個你仍會保留很少使用的物品的理由。",
    "canonicalTaskKey": "v4:contrarian:41:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same option: return an unused purchase or give it away.",
    "textZh": "讓另外兩位玩家選出同一個選項：退回沒在使用的購物成果，或把它送人。",
    "canonicalTaskKey": "v4:judge:41:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_41_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same option: read more reviews or borrow the item before buying it.",
    "textZh": "讓另外兩位玩家選出同一個選項：買之前多看評價，或先借來用用。",
    "canonicalTaskKey": "v4:judge:41:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_41"
    ]
  },
  {
    "id": "villager_v4_42_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what made the small act of care they mentioned feel personal.",
    "textZh": "問一位玩家，他提到的小小體貼，哪一點讓他感到被特別照顧。",
    "canonicalTaskKey": "v4:reporter:42:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone about a thoughtful gesture that costs no money.",
    "textZh": "問一位玩家，有什麼不花錢的體貼舉動。",
    "canonicalTaskKey": "v4:reporter:42:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe a time someone remembered a small preference of yours.",
    "textZh": "描述一次有人記住你的小偏好時的經驗。",
    "canonicalTaskKey": "v4:veteran:42:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share one small thing you do to make a guest feel comfortable.",
    "textZh": "分享一個你會做、讓客人自在一點的小舉動。",
    "canonicalTaskKey": "v4:veteran:42:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Thank a cup for keeping someone company.",
    "textZh": "向一只杯子道謝，謝謝它陪伴某個人。",
    "canonicalTaskKey": "v4:bait:42:1",
    "variantGroup": "address_object",
    "mechanicKey": "address_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “A spare charger can be a love letter.”",
    "textZh": "說出：「A spare charger can be a love letter.」",
    "canonicalTaskKey": "v4:bait:42:2",
    "variantGroup": "compare_unlike_things",
    "mechanicKey": "compare_unlike_things",
    "family": "analogy",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "analogy",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "A spare charger can be a love letter."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a tiny service that notices when someone needs a quiet break.",
    "textZh": "想像一項會發現別人需要安靜休息的小服務。",
    "canonicalTaskKey": "v4:dreamer:42:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a care package small enough to fit in a pocket.",
    "textZh": "描述一份小到能放入口袋的關懷包。",
    "canonicalTaskKey": "v4:dreamer:42:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason asking before helping can be the kinder choice.",
    "textZh": "說出一個先問再幫忙反而更體貼的理由。",
    "canonicalTaskKey": "v4:contrarian:42:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason leaving someone alone can show care.",
    "textZh": "說出一個讓別人獨處也能表達關心的理由。",
    "canonicalTaskKey": "v4:contrarian:42:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same gesture: bring a snack or take one chore off a friend's hands.",
    "textZh": "讓另外兩位玩家選出同一種體貼：帶一份點心，或替朋友分擔一件雜事。",
    "canonicalTaskKey": "v4:judge:42:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_42_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same gesture: a short check-in message or a handwritten note.",
    "textZh": "讓另外兩位玩家選出同一種體貼：簡短的問候訊息，或手寫小紙條。",
    "canonicalTaskKey": "v4:judge:42:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_42"
    ]
  },
  {
    "id": "villager_v4_43_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which moment turned their failed plan into a good day.",
    "textZh": "問一位玩家，哪個瞬間讓原本失敗的計畫變成美好的一天。",
    "canonicalTaskKey": "v4:reporter:43:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how they decided what to do after a plan fell through.",
    "textZh": "問一位玩家，計畫落空後是怎麼決定接下來要做什麼的。",
    "canonicalTaskKey": "v4:reporter:43:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a place you discovered because your first choice was unavailable.",
    "textZh": "分享一個因為原本的選擇不可行，才發現的地方。",
    "canonicalTaskKey": "v4:veteran:43:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe one good memory from a day with bad weather.",
    "textZh": "描述一次天氣不好、卻留下美好回憶的經驗。",
    "canonicalTaskKey": "v4:veteran:43:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Apologize to your original plan for abandoning it.",
    "textZh": "向原本的計畫道歉，因為你拋下它了。",
    "canonicalTaskKey": "v4:bait:43:1",
    "variantGroup": "apologize_to_object",
    "mechanicKey": "apologize_to_object",
    "family": "object_address",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "object_address",
      "apology"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “The wrong turn deserves a thank-you card.”",
    "textZh": "說出：「The wrong turn deserves a thank-you card.」",
    "canonicalTaskKey": "v4:bait:43:2",
    "variantGroup": "thank_wrong_turn",
    "mechanicKey": "thank_wrong_turn",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "The wrong turn deserves a thank-you card."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a map that only shows pleasant detours.",
    "textZh": "想像一張只標出愉快繞路路線的地圖。",
    "canonicalTaskKey": "v4:dreamer:43:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a perfect backup plan that needs no booking.",
    "textZh": "描述一個不用預約的理想備案。",
    "canonicalTaskKey": "v4:dreamer:43:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason a carefully planned day can feel less memorable.",
    "textZh": "說出一個安排周全的一天反而可能沒那麼難忘的理由。",
    "canonicalTaskKey": "v4:contrarian:43:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason you would still keep a backup plan for a spontaneous day.",
    "textZh": "說出一個即使想隨興度過一天、仍會保留備案的理由。",
    "canonicalTaskKey": "v4:contrarian:43:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same response to a closed café: explore nearby or go somewhere familiar.",
    "textZh": "讓另外兩位玩家選出咖啡店沒開時的同一個做法：探索附近，或去熟悉的地方。",
    "canonicalTaskKey": "v4:judge:43:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_43_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same rainy-day backup: an indoor picnic or a long café visit.",
    "textZh": "讓另外兩位玩家選出同一個雨天備案：室內野餐，或在咖啡店待久一點。",
    "canonicalTaskKey": "v4:judge:43:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_43"
    ]
  },
  {
    "id": "villager_v4_44_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone how they first learned their unusual small skill.",
    "textZh": "問一位玩家，他最初是怎麼學會那項特殊小本事的。",
    "canonicalTaskKey": "v4:reporter:44:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone when their small skill last helped another person.",
    "textZh": "問一位玩家，他的小本事上一次幫到別人是什麼時候。",
    "canonicalTaskKey": "v4:reporter:44:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small skill you learned from someone you know.",
    "textZh": "分享一項向認識的人學到的小技能。",
    "canonicalTaskKey": "v4:veteran:44:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe a small skill you use when something goes wrong at home.",
    "textZh": "描述一項家裡出狀況時，你會用到的小技能。",
    "canonicalTaskKey": "v4:veteran:44:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Announce a gold medal for a very ordinary skill.",
    "textZh": "宣布頒發一面金牌給一項非常普通的小技能。",
    "canonicalTaskKey": "v4:bait:44:2",
    "variantGroup": "give_imaginary_award",
    "mechanicKey": "give_imaginary_award",
    "family": "award",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "award"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Invent a tiny competition for a useful household skill.",
    "textZh": "想像一場比賽內容是實用家事技能的小競賽。",
    "canonicalTaskKey": "v4:dreamer:44:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a lesson for a small skill that schools rarely teach.",
    "textZh": "描述一堂教學校很少教的小技能的課。",
    "canonicalTaskKey": "v4:dreamer:44:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason a useless-looking skill could still be worth learning.",
    "textZh": "說出一個看似沒用的小技能仍然值得學的理由。",
    "canonicalTaskKey": "v4:contrarian:44:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason being the best at a small skill can become inconvenient.",
    "textZh": "說出一個最擅長某項小技能也可能造成困擾的理由。",
    "canonicalTaskKey": "v4:contrarian:44:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same skill to learn: folding fitted sheets or remembering people's names.",
    "textZh": "讓另外兩位玩家選出同一項想學的技能：摺床包，或記住別人的名字。",
    "canonicalTaskKey": "v4:judge:44:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_44_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same teaching style: watch one demonstration or try it together.",
    "textZh": "讓另外兩位玩家選出同一種學習方式：看一次示範，或一起試做。",
    "canonicalTaskKey": "v4:judge:44:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_44"
    ]
  },
  {
    "id": "villager_v4_45_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which small good-day moment they can create for themselves.",
    "textZh": "問一位玩家，讓一天變好的小時刻中，有哪一個可以自己創造。",
    "canonicalTaskKey": "v4:reporter:45:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which part of an ordinary day they most look forward to.",
    "textZh": "問一位玩家，平凡的一天裡最期待哪一段時間。",
    "canonicalTaskKey": "v4:reporter:45:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe one small thing that made a recent ordinary day better.",
    "textZh": "描述一件最近讓平凡日子變好一點的小事。",
    "canonicalTaskKey": "v4:veteran:45:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a simple routine that helps you enjoy being at home.",
    "textZh": "分享一個讓你更享受待在家裡的簡單習慣。",
    "canonicalTaskKey": "v4:veteran:45:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “Fresh sheets deserve a standing ovation.”",
    "textZh": "說出：「Fresh sheets deserve a standing ovation.」",
    "canonicalTaskKey": "v4:bait:45:1",
    "variantGroup": "praise_ordinary_comfort",
    "mechanicKey": "praise_ordinary_comfort",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "Fresh sheets deserve a standing ovation."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Stretch the last word of a sentence for about three seconds.",
    "textZh": "把一句話的最後一個字拉長大約三秒。",
    "canonicalTaskKey": "stretch-final-word-three-seconds",
    "variantGroup": "stretch_last_word",
    "mechanicKey": "stretch_last_word",
    "family": "stretched_word",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": true,
    "performanceGroup": "voice",
    "actionTags": [
      "stretched_word"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a vending machine that sells tiny happy moments.",
    "textZh": "描述一台販賣小小快樂時刻的自動販賣機。",
    "canonicalTaskKey": "v4:dreamer:45:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine one small change that would make your walk home more pleasant.",
    "textZh": "想像一個能讓回家路程更愉快的小改變。",
    "canonicalTaskKey": "v4:dreamer:45:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason an uneventful day can be better than an exciting one.",
    "textZh": "說出一個平淡的一天可能比刺激的一天更好的理由。",
    "canonicalTaskKey": "v4:contrarian:45:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason trying to make every day special could be tiring.",
    "textZh": "說出一個努力讓每天都很特別，反而可能很累的理由。",
    "canonicalTaskKey": "v4:contrarian:45:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same small comfort: clean sheets or a warm drink.",
    "textZh": "讓另外兩位玩家選出同一種小享受：乾淨床單，或溫暖的飲料。",
    "canonicalTaskKey": "v4:judge:45:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_45_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same free pleasure: a short walk or ten quiet minutes.",
    "textZh": "讓另外兩位玩家選出同一種免費享受：散步一下，或安靜十分鐘。",
    "canonicalTaskKey": "v4:judge:45:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_45"
    ]
  },
  {
    "id": "villager_v4_46_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what made them try their unexpected interest a second time.",
    "textZh": "問一位玩家，是什麼讓他願意再試一次那個意外發現的興趣。",
    "canonicalTaskKey": "v4:reporter:46:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what surprised them about people who share their new interest.",
    "textZh": "問一位玩家，有同樣新興趣的人，哪一點讓他意外。",
    "canonicalTaskKey": "v4:reporter:46:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share an interest you first encountered through a friend.",
    "textZh": "分享一個最早透過朋友接觸到的興趣。",
    "canonicalTaskKey": "v4:veteran:46:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe something you learned just because you were curious.",
    "textZh": "描述一件只是出於好奇而學會的事。",
    "canonicalTaskKey": "v4:veteran:46:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “One innocent click became a whole hobby.”",
    "textZh": "說出：「One innocent click became a whole hobby.」",
    "canonicalTaskKey": "v4:bait:46:1",
    "variantGroup": "tiny_start_big_result",
    "mechanicKey": "tiny_start_big_result",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "One innocent click became a whole hobby."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Describe your new interest as a guest that refuses to leave.",
    "textZh": "把新興趣描述成一位不肯離開的客人。",
    "canonicalTaskKey": "v4:bait:46:2",
    "variantGroup": "compare_unlike_things",
    "mechanicKey": "compare_unlike_things",
    "family": "analogy",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "analogy"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a beginner's trial box for an interest you enjoy.",
    "textZh": "想像一份讓新手試玩你喜歡的興趣的體驗盒。",
    "canonicalTaskKey": "v4:dreamer:46:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a festival where everyone tries an unfamiliar hobby for ten minutes.",
    "textZh": "描述一個讓每個人都花十分鐘試玩陌生興趣的節日。",
    "canonicalTaskKey": "v4:dreamer:46:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason staying a beginner can be enjoyable.",
    "textZh": "說出一個維持新手身分也很快樂的理由。",
    "canonicalTaskKey": "v4:contrarian:46:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason you would enjoy an interest without buying special equipment.",
    "textZh": "說出一個不買專門器材也能享受興趣的理由。",
    "canonicalTaskKey": "v4:contrarian:46:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to try a hobby: a class with a friend or a free tutorial at home.",
    "textZh": "讓另外兩位玩家選出同一種嘗試興趣的方式：和朋友上課，或在家看免費教學。",
    "canonicalTaskKey": "v4:judge:46:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_46_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same beginner priority: easy equipment or a welcoming community.",
    "textZh": "讓另外兩位玩家選出新手最在意的同一件事：容易取得的器材，或友善的社群。",
    "canonicalTaskKey": "v4:judge:46:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_46"
    ]
  },
  {
    "id": "villager_v4_47_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone which hidden step takes the most effort in the activity they described.",
    "textZh": "問一位玩家，他描述的事情中，哪個不明顯的步驟最費力。",
    "canonicalTaskKey": "v4:reporter:47:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what a beginner usually underestimates about their skill.",
    "textZh": "問一位玩家，新手通常會低估他的技能的哪一個部分。",
    "canonicalTaskKey": "v4:reporter:47:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share a small result that took you several attempts to get right.",
    "textZh": "分享一個你試了好幾次才做好的小成果。",
    "canonicalTaskKey": "v4:veteran:47:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe a piece of work you appreciate more after trying it yourself.",
    "textZh": "描述一件親自試過後，讓你更懂得欣賞的工作。",
    "canonicalTaskKey": "v4:veteran:47:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “That tiny detail has a full-time job.”",
    "textZh": "說出：「That tiny detail has a full-time job.」",
    "canonicalTaskKey": "v4:bait:47:1",
    "variantGroup": "object_employment_rights",
    "mechanicKey": "object_employment_rights",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "That tiny detail has a full-time job."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Give an imaginary trophy to the preparation nobody noticed.",
    "textZh": "把一座想像中的獎盃頒給沒人注意到的準備工作。",
    "canonicalTaskKey": "v4:bait:47:2",
    "variantGroup": "give_imaginary_award",
    "mechanicKey": "give_imaginary_award",
    "family": "award",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "award"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine a label that reveals one hidden step behind a finished product.",
    "textZh": "想像一個能揭露成品背後某個隱藏步驟的標籤。",
    "canonicalTaskKey": "v4:dreamer:47:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe an award for a helpful task that rarely gets thanked.",
    "textZh": "描述一個頒給經常沒人道謝、卻有幫助的工作的獎項。",
    "canonicalTaskKey": "v4:dreamer:47:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason making work look easy can be a disadvantage.",
    "textZh": "說出一個把工作做得看起來很輕鬆，反而可能吃虧的理由。",
    "canonicalTaskKey": "v4:contrarian:47:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason a rough first attempt is worth showing someone.",
    "textZh": "說出一個不太成熟的初次嘗試仍然值得給別人看的理由。",
    "canonicalTaskKey": "v4:contrarian:47:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to appreciate hidden work: ask about the process or mention one specific detail.",
    "textZh": "讓另外兩位玩家選出同一種欣賞幕後努力的方式：詢問過程，或提到一個具體細節。",
    "canonicalTaskKey": "v4:judge:47:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_47_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same skill to watch behind the scenes: making a meal or editing a short video.",
    "textZh": "讓另外兩位玩家選出同一項想看幕後過程的技能：做一頓飯，或剪一支短片。",
    "canonicalTaskKey": "v4:judge:47:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_47"
    ]
  },
  {
    "id": "villager_v4_48_reporter_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone what they still enjoy about an activity from childhood.",
    "textZh": "問一位玩家，小時候的活動有哪些部分到現在仍然喜歡。",
    "canonicalTaskKey": "v4:reporter:48:1",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_reporter_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "reporter",
    "text": "Ask someone whom they would invite to join their supposedly childish enjoyment.",
    "textZh": "問一位玩家，會邀請誰一起享受那個被說幼稚的樂趣。",
    "canonicalTaskKey": "v4:reporter:48:2",
    "variantGroup": "ask_specific_question",
    "mechanicKey": "ask_specific_question",
    "family": "inquiry",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "ask_question"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_veteran_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Share something you enjoyed as a child and still enjoy now.",
    "textZh": "分享一件小時候喜歡、到現在仍然喜歡的事。",
    "canonicalTaskKey": "v4:veteran:48:1",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_veteran_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "veteran",
    "text": "Describe a time you returned to an old favorite after a long break.",
    "textZh": "描述一次隔了很久，又重新接觸以前喜愛事物的經驗。",
    "canonicalTaskKey": "v4:veteran:48:2",
    "variantGroup": "share_specific_experience",
    "mechanicKey": "share_specific_experience",
    "family": "experience",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "experience"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_bait_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Say “My birthday cannot cancel my cartoons.”",
    "textZh": "說出：「My birthday cannot cancel my cartoons.」",
    "canonicalTaskKey": "v4:bait:48:1",
    "variantGroup": "age_rejects_rule",
    "mechanicKey": "age_rejects_rule",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "My birthday cannot cancel my cartoons."
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_bait_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "bait",
    "text": "Ask an imaginary adult-permission office for permission to play.",
    "textZh": "向想像中的成人許可辦公室，申請玩耍許可。",
    "canonicalTaskKey": "v4:bait:48:2",
    "variantGroup": "absurd_permission_request",
    "mechanicKey": "absurd_permission_request",
    "family": "prepared_sentence",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "prepared_sentence"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_dreamer_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Imagine an adults' play space built around a childhood favorite.",
    "textZh": "想像一個以童年喜愛事物為主題的成人遊樂空間。",
    "canonicalTaskKey": "v4:dreamer:48:1",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_dreamer_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "dreamer",
    "text": "Describe a day when people of every age can enjoy the same simple game.",
    "textZh": "描述一個各年齡層都能一起玩同一個簡單遊戲的日子。",
    "canonicalTaskKey": "v4:dreamer:48:2",
    "variantGroup": "imagine_specific_feature",
    "mechanicKey": "imagine_specific_feature",
    "family": "imagination",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "imagination"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_contrarian_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason a serious adult might need silly play.",
    "textZh": "說出一個嚴肅的大人也可能需要搞笑玩樂的理由。",
    "canonicalTaskKey": "v4:contrarian:48:1",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_contrarian_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "contrarian",
    "text": "Give one reason you would keep an enjoyment private instead of defending it.",
    "textZh": "說出一個你寧願私下享受、不去辯護某個樂趣的理由。",
    "canonicalTaskKey": "v4:contrarian:48:2",
    "variantGroup": "give_counterpoint",
    "mechanicKey": "give_counterpoint",
    "family": "perspective",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "counterpoint"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_judge_1",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same activity for an adult play date: building with blocks or watching a favorite cartoon.",
    "textZh": "讓另外兩位玩家選出同一個成人玩樂活動：玩積木，或看喜歡的卡通。",
    "canonicalTaskKey": "v4:judge:48:1",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice"
    ],
    "requiredUtterances": [],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  },
  {
    "id": "villager_v4_48_judge_2",
    "contentVersion": "chat-wolf-content-20261002",
    "roleId": "judge",
    "text": "Get two other players to choose the same response to “That's childish”: invite the person to try it or keep enjoying it quietly.",
    "textZh": "讓另外兩位玩家選出面對「That's childish」的同一個回應：邀對方試試，或繼續安靜享受。",
    "canonicalTaskKey": "v4:judge:48:2",
    "variantGroup": "get_matching_choice",
    "mechanicKey": "get_matching_choice",
    "family": "matching_choice",
    "active": true,
    "status": "active",
    "reviewed": true,
    "isGeneric": false,
    "performanceGroup": null,
    "actionTags": [
      "choice",
      "prepared_sentence"
    ],
    "requiredUtterances": [
      "That's childish"
    ],
    "activityLanguage": "en",
    "compatibleTopicIds": [
      "topic_v2_48"
    ]
  }
];
});
