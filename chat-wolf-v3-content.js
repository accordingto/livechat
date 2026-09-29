/* Chat Wolf v3: authored English conversation material. No AI calls or runtime sentence generation.
 * 48 topic bundles; 60 reusable wolf cards + 24 reviewed topic-specific variants.
 * Variants deliberately share mechanicKey/variantGroup; never count them as new mechanics.
 * All village task sentences below were written with their exact topic, not generated from templates.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CHAT_WOLF_V3_CONTENT = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const topics = [
  {
    "id": "travel-friends",
    "category": "Travel",
    "mainQuestion": "What makes a trip with friends fun or difficult for you?",
    "entryPrompts": [
      "Early starts or slow mornings?",
      "What is worth extra money?",
      "Tell us about a small surprise."
    ],
    "followUps": [
      {
        "id": "travel-friends-f1",
        "text": "How much time do you like to spend alone on a group trip?"
      },
      {
        "id": "travel-friends-f2",
        "text": "What would you do if a friend wanted a very different activity?"
      },
      {
        "id": "travel-friends-f3",
        "text": "Which part of a trip do you enjoy planning?"
      },
      {
        "id": "travel-friends-f4",
        "text": "What travel habit would you warn your friends about?"
      },
      {
        "id": "travel-friends-f5",
        "text": "When would you happily change a travel plan?"
      },
      {
        "id": "travel-friends-f6",
        "text": "What small comfort do you want away from home?"
      },
      {
        "id": "travel-friends-f7",
        "text": "How do you feel about returning to the same place?"
      },
      {
        "id": "travel-friends-f8",
        "text": "What makes someone an easy person to travel with?"
      }
    ],
    "tags": [
      "travel"
    ]
  },
  {
    "id": "daily-journeys",
    "category": "Travel",
    "mainQuestion": "How do you like to get around in everyday life?",
    "entryPrompts": [
      "Walking, driving, or public transport?",
      "What makes a journey better?",
      "Which part of a route do you notice?"
    ],
    "followUps": [
      {
        "id": "daily-journeys-f1",
        "text": "What would make you walk farther than usual?"
      },
      {
        "id": "daily-journeys-f2",
        "text": "How do you pass time on a regular journey?"
      },
      {
        "id": "daily-journeys-f3",
        "text": "What kind of passenger are you?"
      },
      {
        "id": "daily-journeys-f4",
        "text": "Would you rather travel faster or have more personal space?"
      },
      {
        "id": "daily-journeys-f5",
        "text": "What would you change about your usual route?"
      },
      {
        "id": "daily-journeys-f6",
        "text": "How do you feel when a journey is delayed?"
      },
      {
        "id": "daily-journeys-f7",
        "text": "Which journey could you make without a map?"
      },
      {
        "id": "daily-journeys-f8",
        "text": "What makes a station or stop comfortable?"
      }
    ],
    "tags": [
      "travel"
    ]
  },
  {
    "id": "packing",
    "category": "Travel",
    "mainQuestion": "What do you take with you when you leave home for a few days?",
    "entryPrompts": [
      "One small bag or lots of choices?",
      "Something useful you always forget?",
      "One item that feels like home?"
    ],
    "followUps": [
      {
        "id": "packing-f1",
        "text": "What do you pack even when you rarely use it?"
      },
      {
        "id": "packing-f2",
        "text": "Which item would you borrow instead of carrying?"
      },
      {
        "id": "packing-f3",
        "text": "How early do you usually pack?"
      },
      {
        "id": "packing-f4",
        "text": "What would you remove from an overfull bag first?"
      },
      {
        "id": "packing-f5",
        "text": "What changes when you pack for another person?"
      },
      {
        "id": "packing-f6",
        "text": "What is worth buying after you arrive?"
      },
      {
        "id": "packing-f7",
        "text": "How do you choose clothes for uncertain weather?"
      },
      {
        "id": "packing-f8",
        "text": "What is the strangest useful item in your bag?"
      }
    ],
    "tags": [
      "travel"
    ]
  },
  {
    "id": "getting-lost",
    "category": "Travel",
    "mainQuestion": "How do you react when you do not know where you are going?",
    "entryPrompts": [
      "Ask someone or check a map?",
      "A wrong turn you remember?",
      "Enjoy a surprise or need a plan?"
    ],
    "followUps": [
      {
        "id": "getting-lost-f1",
        "text": "What makes a place easy for you to remember?"
      },
      {
        "id": "getting-lost-f2",
        "text": "How do you explain directions to someone?"
      },
      {
        "id": "getting-lost-f3",
        "text": "When is getting lost part of the fun?"
      },
      {
        "id": "getting-lost-f4",
        "text": "What would help you stay calm on the wrong route?"
      },
      {
        "id": "getting-lost-f5",
        "text": "Who do you trust to choose a route?"
      },
      {
        "id": "getting-lost-f6",
        "text": "Would you follow an interesting road without knowing its end?"
      },
      {
        "id": "getting-lost-f7",
        "text": "What signs do you wish every town had?"
      },
      {
        "id": "getting-lost-f8",
        "text": "How do you find your way inside a huge building?"
      }
    ],
    "tags": [
      "travel"
    ]
  },
  {
    "id": "spending-rules",
    "category": "Money",
    "mainQuestion": "What rules do you follow when you spend money?",
    "entryPrompts": [
      "Something you pay more for?",
      "Something you always compare?",
      "A rule other people might not share?"
    ],
    "followUps": [
      {
        "id": "spending-rules-f1",
        "text": "Which small purchase gives you the most use?"
      },
      {
        "id": "spending-rules-f2",
        "text": "When do you choose the cheaper option?"
      },
      {
        "id": "spending-rules-f3",
        "text": "What helps you decide to wait before buying?"
      },
      {
        "id": "spending-rules-f4",
        "text": "How do you feel about paying for convenience?"
      },
      {
        "id": "spending-rules-f5",
        "text": "Which item would you prefer to repair?"
      },
      {
        "id": "spending-rules-f6",
        "text": "What makes a price feel fair to you?"
      },
      {
        "id": "spending-rules-f7",
        "text": "When does buying a large amount make sense?"
      },
      {
        "id": "spending-rules-f8",
        "text": "What is one spending rule you have changed?"
      }
    ],
    "tags": [
      "money"
    ]
  },
  {
    "id": "gifts",
    "category": "Money",
    "mainQuestion": "What makes a gift enjoyable to give or receive?",
    "entryPrompts": [
      "Surprises or clear requests?",
      "Useful, homemade, or funny?",
      "A small gift you remember?"
    ],
    "followUps": [
      {
        "id": "gifts-f1",
        "text": "How do you choose a gift for someone you do not know well?"
      },
      {
        "id": "gifts-f2",
        "text": "What makes a small gift feel thoughtful?"
      },
      {
        "id": "gifts-f3",
        "text": "How do you feel about gift cards?"
      },
      {
        "id": "gifts-f4",
        "text": "What would you enjoy making as a gift?"
      },
      {
        "id": "gifts-f5",
        "text": "When is an experience better than an object?"
      },
      {
        "id": "gifts-f6",
        "text": "What do you do when someone says they want nothing?"
      },
      {
        "id": "gifts-f7",
        "text": "How important is the wrapping to you?"
      },
      {
        "id": "gifts-f8",
        "text": "What kind of gift is hard for you to choose?"
      }
    ],
    "tags": [
      "money"
    ]
  },
  {
    "id": "shopping-choices",
    "category": "Money",
    "mainQuestion": "How do you choose between lots of things you could buy?",
    "entryPrompts": [
      "Reviews or your first feeling?",
      "Lots of choices or just a few?",
      "Something you take ages to choose?"
    ],
    "followUps": [
      {
        "id": "shopping-choices-f1",
        "text": "What makes an online review useful to you?"
      },
      {
        "id": "shopping-choices-f2",
        "text": "When do you ask another person to help you choose?"
      },
      {
        "id": "shopping-choices-f3",
        "text": "What makes you leave a shop without buying?"
      },
      {
        "id": "shopping-choices-f4",
        "text": "Which item do you need to see in person?"
      },
      {
        "id": "shopping-choices-f5",
        "text": "How much do colors affect your choice?"
      },
      {
        "id": "shopping-choices-f6",
        "text": "What can make you change your mind at the last moment?"
      },
      {
        "id": "shopping-choices-f7",
        "text": "Would you rather compare ten options or try two?"
      },
      {
        "id": "shopping-choices-f8",
        "text": "How do you know when you have looked enough?"
      }
    ],
    "tags": [
      "money"
    ]
  },
  {
    "id": "small-luxuries",
    "category": "Money",
    "mainQuestion": "Which small comforts make an ordinary day feel better?",
    "entryPrompts": [
      "A nicer drink or a softer pillow?",
      "A treat you save for certain days?",
      "A comfort that costs nothing?"
    ],
    "followUps": [
      {
        "id": "small-luxuries-f1",
        "text": "What makes a small treat worth its price?"
      },
      {
        "id": "small-luxuries-f2",
        "text": "Which comfort do you notice most when it is missing?"
      },
      {
        "id": "small-luxuries-f3",
        "text": "What can turn a normal meal into a treat?"
      },
      {
        "id": "small-luxuries-f4",
        "text": "How do you make a tired day feel easier?"
      },
      {
        "id": "small-luxuries-f5",
        "text": "Which comfort would you share with a guest?"
      },
      {
        "id": "small-luxuries-f6",
        "text": "Can a useful object feel like a luxury?"
      },
      {
        "id": "small-luxuries-f7",
        "text": "What free comfort would you recommend?"
      },
      {
        "id": "small-luxuries-f8",
        "text": "When does a treat stop feeling special?"
      }
    ],
    "tags": [
      "money"
    ]
  },
  {
    "id": "home-space",
    "category": "Home",
    "mainQuestion": "What makes a place feel like a good home for you?",
    "entryPrompts": [
      "Light, space, or location?",
      "One room you care about most?",
      "A small thing that feels welcoming?"
    ],
    "followUps": [
      {
        "id": "home-space-f1",
        "text": "Which room would you change first in a new home?"
      },
      {
        "id": "home-space-f2",
        "text": "How much space do you actually use?"
      },
      {
        "id": "home-space-f3",
        "text": "What can make a small home feel comfortable?"
      },
      {
        "id": "home-space-f4",
        "text": "How do you feel about hearing your neighbors?"
      },
      {
        "id": "home-space-f5",
        "text": "Which view would you enjoy every day?"
      },
      {
        "id": "home-space-f6",
        "text": "What would you want within walking distance?"
      },
      {
        "id": "home-space-f7",
        "text": "Would you trade space for a better location?"
      },
      {
        "id": "home-space-f8",
        "text": "What makes a room feel like yours?"
      }
    ],
    "tags": [
      "home"
    ]
  },
  {
    "id": "home-habits",
    "category": "Home",
    "mainQuestion": "Which home habits are easy or hard for you to share with other people?",
    "entryPrompts": [
      "Noise or quiet?",
      "Shared meals or separate plans?",
      "One little habit people notice?"
    ],
    "followUps": [
      {
        "id": "home-habits-f1",
        "text": "What do you like doing first when you get home?"
      },
      {
        "id": "home-habits-f2",
        "text": "How do you feel about guests arriving without a plan?"
      },
      {
        "id": "home-habits-f3",
        "text": "Which shared space is hardest to agree on?"
      },
      {
        "id": "home-habits-f4",
        "text": "What would make a shared kitchen easier to use?"
      },
      {
        "id": "home-habits-f5",
        "text": "How much quiet time do you need at home?"
      },
      {
        "id": "home-habits-f6",
        "text": "What would you tell a new housemate about yourself?"
      },
      {
        "id": "home-habits-f7",
        "text": "When do you like keeping your door open?"
      },
      {
        "id": "home-habits-f8",
        "text": "Which habit would be easy for you to change?"
      }
    ],
    "tags": [
      "home"
    ]
  },
  {
    "id": "tidying",
    "category": "Home",
    "mainQuestion": "How do you decide what to clean, organize, or leave alone?",
    "entryPrompts": [
      "A little every day or one big clean?",
      "One task you keep avoiding?",
      "A mess you can live with?"
    ],
    "followUps": [
      {
        "id": "tidying-f1",
        "text": "Which cleaning job is more satisfying than you expect?"
      },
      {
        "id": "tidying-f2",
        "text": "What do you do with things that have no clear place?"
      },
      {
        "id": "tidying-f3",
        "text": "How do you decide something is clean enough?"
      },
      {
        "id": "tidying-f4",
        "text": "Does music change how you clean?"
      },
      {
        "id": "tidying-f5",
        "text": "Which space becomes messy fastest?"
      },
      {
        "id": "tidying-f6",
        "text": "What would you pay someone else to clean?"
      },
      {
        "id": "tidying-f7",
        "text": "When does organizing become a way to avoid another task?"
      },
      {
        "id": "tidying-f8",
        "text": "What simple habit keeps a place comfortable?"
      }
    ],
    "tags": [
      "home"
    ]
  },
  {
    "id": "keepsakes",
    "category": "Home",
    "mainQuestion": "Which ordinary things do you keep even when you no longer use them?",
    "entryPrompts": [
      "Tickets, photos, or old clothes?",
      "Something with a story?",
      "An easy or difficult goodbye?"
    ],
    "followUps": [
      {
        "id": "keepsakes-f1",
        "text": "What makes an object difficult to throw away?"
      },
      {
        "id": "keepsakes-f2",
        "text": "How do you choose which photos to keep?"
      },
      {
        "id": "keepsakes-f3",
        "text": "Would you rather keep an object or a picture of it?"
      },
      {
        "id": "keepsakes-f4",
        "text": "What do you enjoy finding in an old box?"
      },
      {
        "id": "keepsakes-f5",
        "text": "When have you passed an old item to someone else?"
      },
      {
        "id": "keepsakes-f6",
        "text": "Which object reminds you of a place?"
      },
      {
        "id": "keepsakes-f7",
        "text": "How much space should memories take?"
      },
      {
        "id": "keepsakes-f8",
        "text": "What might your future self be glad you kept?"
      }
    ],
    "tags": [
      "home"
    ]
  },
  {
    "id": "cooking",
    "category": "Food",
    "mainQuestion": "What do you enjoy or avoid when making food?",
    "entryPrompts": [
      "Follow a recipe or guess?",
      "A simple meal you can make?",
      "One kitchen job you dislike?"
    ],
    "followUps": [
      {
        "id": "cooking-f1",
        "text": "Which smell makes cooking feel worth the effort?"
      },
      {
        "id": "cooking-f2",
        "text": "What do you cook when you are tired?"
      },
      {
        "id": "cooking-f3",
        "text": "How do you react when a recipe goes wrong?"
      },
      {
        "id": "cooking-f4",
        "text": "What makes a recipe easy to follow?"
      },
      {
        "id": "cooking-f5",
        "text": "Which kitchen tool do you use most?"
      },
      {
        "id": "cooking-f6",
        "text": "Would you enjoy cooking with another person?"
      },
      {
        "id": "cooking-f7",
        "text": "What would you like to learn to make?"
      },
      {
        "id": "cooking-f8",
        "text": "What does a good quick meal need?"
      }
    ],
    "tags": [
      "food"
    ]
  },
  {
    "id": "comfort-food",
    "category": "Food",
    "mainQuestion": "What food do you reach for when you want comfort?",
    "entryPrompts": [
      "Warm, cold, sweet, or salty?",
      "A familiar meal?",
      "Eat alone or with someone?"
    ],
    "followUps": [
      {
        "id": "comfort-food-f1",
        "text": "Does the weather change the food you want?"
      },
      {
        "id": "comfort-food-f2",
        "text": "Which food reminds you of a place?"
      },
      {
        "id": "comfort-food-f3",
        "text": "What makes a simple snack feel special?"
      },
      {
        "id": "comfort-food-f4",
        "text": "When do you prefer familiar food over something new?"
      },
      {
        "id": "comfort-food-f5",
        "text": "What would you eat after a long day?"
      },
      {
        "id": "comfort-food-f6",
        "text": "Which food is better when someone else makes it?"
      },
      {
        "id": "comfort-food-f7",
        "text": "Does the setting change how food tastes to you?"
      },
      {
        "id": "comfort-food-f8",
        "text": "What comfort food would you introduce to a visitor?"
      }
    ],
    "tags": [
      "food"
    ]
  },
  {
    "id": "eating-out",
    "category": "Food",
    "mainQuestion": "What makes you want to return to a café or restaurant?",
    "entryPrompts": [
      "Food, service, or the room?",
      "Quiet table or lively place?",
      "Order the same thing or try something?"
    ],
    "followUps": [
      {
        "id": "eating-out-f1",
        "text": "What helps you choose from a long menu?"
      },
      {
        "id": "eating-out-f2",
        "text": "How do you feel about sharing dishes?"
      },
      {
        "id": "eating-out-f3",
        "text": "What is a reasonable wait for a table?"
      },
      {
        "id": "eating-out-f4",
        "text": "Which part of a café do you notice first?"
      },
      {
        "id": "eating-out-f5",
        "text": "When is takeaway better than eating inside?"
      },
      {
        "id": "eating-out-f6",
        "text": "What makes a restaurant easy for a group?"
      },
      {
        "id": "eating-out-f7",
        "text": "How much does background music matter?"
      },
      {
        "id": "eating-out-f8",
        "text": "What would make a tiny café memorable?"
      }
    ],
    "tags": [
      "food"
    ]
  },
  {
    "id": "food-curiosity",
    "category": "Food",
    "mainQuestion": "How do you decide whether to try an unfamiliar food?",
    "entryPrompts": [
      "Look, smell, or ingredients?",
      "One surprising taste?",
      "A small bite or a full plate?"
    ],
    "followUps": [
      {
        "id": "food-curiosity-f1",
        "text": "Who can usually persuade you to try a new food?"
      },
      {
        "id": "food-curiosity-f2",
        "text": "What makes an unfamiliar dish less worrying?"
      },
      {
        "id": "food-curiosity-f3",
        "text": "How do you describe a taste you cannot name?"
      },
      {
        "id": "food-curiosity-f4",
        "text": "Would you try a food before learning its name?"
      },
      {
        "id": "food-curiosity-f5",
        "text": "Which texture do you notice most?"
      },
      {
        "id": "food-curiosity-f6",
        "text": "What food did you enjoy more as you got older?"
      },
      {
        "id": "food-curiosity-f7",
        "text": "When do you stop trying something you dislike?"
      },
      {
        "id": "food-curiosity-f8",
        "text": "What familiar food would seem strange to a visitor?"
      }
    ],
    "tags": [
      "food"
    ]
  },
  {
    "id": "mornings",
    "category": "Time",
    "mainQuestion": "What kind of morning helps you start the day well?",
    "entryPrompts": [
      "Quiet or conversation?",
      "Slow breakfast or a quick start?",
      "One thing you need before leaving?"
    ],
    "followUps": [
      {
        "id": "mornings-f1",
        "text": "What makes you feel awake?"
      },
      {
        "id": "mornings-f2",
        "text": "How much choice do you want early in the day?"
      },
      {
        "id": "mornings-f3",
        "text": "What do you prepare the night before?"
      },
      {
        "id": "mornings-f4",
        "text": "How does a free-day morning differ from a workday?"
      },
      {
        "id": "mornings-f5",
        "text": "What can ruin a good start?"
      },
      {
        "id": "mornings-f6",
        "text": "When is waking early worth it?"
      },
      {
        "id": "mornings-f7",
        "text": "What morning habit have you changed?"
      },
      {
        "id": "mornings-f8",
        "text": "What would your ideal first hour look like?"
      }
    ],
    "tags": [
      "time"
    ]
  },
  {
    "id": "free-weekends",
    "category": "Time",
    "mainQuestion": "How do you like to use a day with no fixed plans?",
    "entryPrompts": [
      "Stay home or go out?",
      "Choose early or decide later?",
      "What freedom matters most?"
    ],
    "followUps": [
      {
        "id": "free-weekends-f1",
        "text": "How many plans make a free day feel too busy?"
      },
      {
        "id": "free-weekends-f2",
        "text": "What do you enjoy doing without watching the time?"
      },
      {
        "id": "free-weekends-f3",
        "text": "Who would you invite into an unplanned day?"
      },
      {
        "id": "free-weekends-f4",
        "text": "What is a good reason to change a weekend plan?"
      },
      {
        "id": "free-weekends-f5",
        "text": "How do you feel after doing very little?"
      },
      {
        "id": "free-weekends-f6",
        "text": "What would you do with a free afternoon near home?"
      },
      {
        "id": "free-weekends-f7",
        "text": "Which chore helps you enjoy the rest of the day?"
      },
      {
        "id": "free-weekends-f8",
        "text": "What makes a day feel properly finished?"
      }
    ],
    "tags": [
      "time"
    ]
  },
  {
    "id": "waiting",
    "category": "Time",
    "mainQuestion": "What do you do when you have to wait?",
    "entryPrompts": [
      "Look around or reach for your phone?",
      "A queue you would accept?",
      "Five minutes or an unknown wait?"
    ],
    "followUps": [
      {
        "id": "waiting-f1",
        "text": "What makes waiting feel shorter?"
      },
      {
        "id": "waiting-f2",
        "text": "Which kind of delay bothers you most?"
      },
      {
        "id": "waiting-f3",
        "text": "How do you feel about arriving very early?"
      },
      {
        "id": "waiting-f4",
        "text": "What could a waiting room do better?"
      },
      {
        "id": "waiting-f5",
        "text": "When is a long queue worth joining?"
      },
      {
        "id": "waiting-f6",
        "text": "Would you rather know the exact wait or be surprised?"
      },
      {
        "id": "waiting-f7",
        "text": "How do you pass time when your phone is unavailable?"
      },
      {
        "id": "waiting-f8",
        "text": "What have you noticed while waiting?"
      }
    ],
    "tags": [
      "time"
    ]
  },
  {
    "id": "bedtime",
    "category": "Time",
    "mainQuestion": "How do you like to end your day?",
    "entryPrompts": [
      "One last activity?",
      "Silence or a little sound?",
      "A routine you like?"
    ],
    "followUps": [
      {
        "id": "bedtime-f1",
        "text": "What tells you it is time to stop doing things?"
      },
      {
        "id": "bedtime-f2",
        "text": "What makes an evening feel restful?"
      },
      {
        "id": "bedtime-f3",
        "text": "How do you handle wanting to finish one more chapter or episode?"
      },
      {
        "id": "bedtime-f4",
        "text": "What do you leave ready for tomorrow?"
      },
      {
        "id": "bedtime-f5",
        "text": "Does the room temperature change your evening routine?"
      },
      {
        "id": "bedtime-f6",
        "text": "What is a good final snack or drink?"
      },
      {
        "id": "bedtime-f7",
        "text": "How does your routine change away from home?"
      },
      {
        "id": "bedtime-f8",
        "text": "What would make putting your phone away easier?"
      }
    ],
    "tags": [
      "time"
    ]
  },
  {
    "id": "invitations",
    "category": "People",
    "mainQuestion": "What kinds of invitations are easy or hard for you to accept?",
    "entryPrompts": [
      "A small group or a big event?",
      "Planned early or at the last minute?",
      "An invitation you often enjoy?"
    ],
    "followUps": [
      {
        "id": "invitations-f1",
        "text": "How much notice do you like before meeting someone?"
      },
      {
        "id": "invitations-f2",
        "text": "What information helps you decide to join?"
      },
      {
        "id": "invitations-f3",
        "text": "When do you enjoy a surprise invitation?"
      },
      {
        "id": "invitations-f4",
        "text": "What makes saying no easier?"
      },
      {
        "id": "invitations-f5",
        "text": "Which activity is good for meeting a new friend?"
      },
      {
        "id": "invitations-f6",
        "text": "Do you prefer a clear end time?"
      },
      {
        "id": "invitations-f7",
        "text": "What makes an invitation feel relaxed?"
      },
      {
        "id": "invitations-f8",
        "text": "When is staying home the better choice?"
      }
    ],
    "tags": [
      "people"
    ]
  },
  {
    "id": "meeting-people",
    "category": "People",
    "mainQuestion": "What helps you feel comfortable when you meet new people?",
    "entryPrompts": [
      "One person or a small group?",
      "A shared activity?",
      "A question you enjoy answering?"
    ],
    "followUps": [
      {
        "id": "meeting-people-f1",
        "text": "What makes an introduction easy to remember?"
      },
      {
        "id": "meeting-people-f2",
        "text": "Which everyday topic helps you begin a conversation?"
      },
      {
        "id": "meeting-people-f3",
        "text": "How do you feel about a quiet moment with someone new?"
      },
      {
        "id": "meeting-people-f4",
        "text": "What can a host do to help people settle in?"
      },
      {
        "id": "meeting-people-f5",
        "text": "How do you join a conversation already in progress?"
      },
      {
        "id": "meeting-people-f6",
        "text": "Would you rather meet someone online first?"
      },
      {
        "id": "meeting-people-f7",
        "text": "What makes you want to talk to someone again?"
      },
      {
        "id": "meeting-people-f8",
        "text": "Which shared activity takes pressure off conversation?"
      }
    ],
    "tags": [
      "people"
    ]
  },
  {
    "id": "helping",
    "category": "People",
    "mainQuestion": "What kinds of help do you enjoy giving or receiving?",
    "entryPrompts": [
      "Advice or practical help?",
      "Ask early or try alone first?",
      "A small helpful action?"
    ],
    "followUps": [
      {
        "id": "helping-f1",
        "text": "How do you know when someone wants help?"
      },
      {
        "id": "helping-f2",
        "text": "Which task is easier with two people?"
      },
      {
        "id": "helping-f3",
        "text": "When is advice less useful than listening?"
      },
      {
        "id": "helping-f4",
        "text": "What makes asking for help feel comfortable?"
      },
      {
        "id": "helping-f5",
        "text": "Which everyday skill could you show someone?"
      },
      {
        "id": "helping-f6",
        "text": "How do you prefer someone to explain a problem?"
      },
      {
        "id": "helping-f7",
        "text": "What small help do people often overlook?"
      },
      {
        "id": "helping-f8",
        "text": "When does too much help become confusing?"
      }
    ],
    "tags": [
      "people"
    ]
  },
  {
    "id": "group-decisions",
    "category": "People",
    "mainQuestion": "How do you like to make a small decision with other people?",
    "entryPrompts": [
      "Suggest first or listen first?",
      "Vote or talk it through?",
      "A choice that often takes too long?"
    ],
    "followUps": [
      {
        "id": "group-decisions-f1",
        "text": "What makes choosing a place to eat difficult?"
      },
      {
        "id": "group-decisions-f2",
        "text": "When are you happy to let someone else decide?"
      },
      {
        "id": "group-decisions-f3",
        "text": "How many options are useful in a group?"
      },
      {
        "id": "group-decisions-f4",
        "text": "What helps when two people want different things?"
      },
      {
        "id": "group-decisions-f5",
        "text": "Which decisions are not worth a long discussion?"
      },
      {
        "id": "group-decisions-f6",
        "text": "How do you offer a choice without taking over?"
      },
      {
        "id": "group-decisions-f7",
        "text": "When is a random choice a good idea?"
      },
      {
        "id": "group-decisions-f8",
        "text": "What makes a group decision feel fair?"
      }
    ],
    "tags": [
      "people"
    ]
  },
  {
    "id": "hobbies",
    "category": "Leisure",
    "mainQuestion": "What makes you want to keep doing a hobby?",
    "entryPrompts": [
      "Learn, relax, or make something?",
      "Practice alone or with people?",
      "A hobby you tried briefly?"
    ],
    "followUps": [
      {
        "id": "hobbies-f1",
        "text": "What is an easy way to try a new hobby?"
      },
      {
        "id": "hobbies-f2",
        "text": "How important is getting better to you?"
      },
      {
        "id": "hobbies-f3",
        "text": "Which hobby needs less equipment than people think?"
      },
      {
        "id": "hobbies-f4",
        "text": "When do you prefer being a beginner?"
      },
      {
        "id": "hobbies-f5",
        "text": "What makes you stop a hobby for a while?"
      },
      {
        "id": "hobbies-f6",
        "text": "Would you enjoy showing your hobby to someone?"
      },
      {
        "id": "hobbies-f7",
        "text": "What would you do with a small hobby space?"
      },
      {
        "id": "hobbies-f8",
        "text": "How do you find time for something you enjoy?"
      }
    ],
    "tags": [
      "leisure"
    ]
  },
  {
    "id": "music",
    "category": "Leisure",
    "mainQuestion": "How does music fit into your everyday life?",
    "entryPrompts": [
      "Background sound or full attention?",
      "Music for a task?",
      "Silence at certain times?"
    ],
    "followUps": [
      {
        "id": "music-f1",
        "text": "What makes a song stay in your head?"
      },
      {
        "id": "music-f2",
        "text": "When do you prefer no music?"
      },
      {
        "id": "music-f3",
        "text": "How do you discover something new to listen to?"
      },
      {
        "id": "music-f4",
        "text": "What makes a playlist useful to you?"
      },
      {
        "id": "music-f5",
        "text": "Does a familiar song bring back a place?"
      },
      {
        "id": "music-f6",
        "text": "How do you feel about singing with other people?"
      },
      {
        "id": "music-f7",
        "text": "Which ordinary activity changes with music?"
      },
      {
        "id": "music-f8",
        "text": "Would you choose one long song or several short ones?"
      }
    ],
    "tags": [
      "leisure"
    ]
  },
  {
    "id": "stories-on-screen",
    "category": "Leisure",
    "mainQuestion": "What makes a film or series hold your attention?",
    "entryPrompts": [
      "Characters, surprise, or the setting?",
      "Watch alone or together?",
      "A short episode or a long film?"
    ],
    "followUps": [
      {
        "id": "stories-on-screen-f1",
        "text": "How do you choose what to watch next?"
      },
      {
        "id": "stories-on-screen-f2",
        "text": "When do you stop watching something?"
      },
      {
        "id": "stories-on-screen-f3",
        "text": "Do you enjoy knowing the ending before you watch?"
      },
      {
        "id": "stories-on-screen-f4",
        "text": "What makes you watch a story again?"
      },
      {
        "id": "stories-on-screen-f5",
        "text": "How much does the place you watch in matter?"
      },
      {
        "id": "stories-on-screen-f6",
        "text": "Which imaginary setting would you visit for a day?"
      },
      {
        "id": "stories-on-screen-f7",
        "text": "How do you feel about a story with no clear ending?"
      },
      {
        "id": "stories-on-screen-f8",
        "text": "What do you like talking about after watching?"
      }
    ],
    "tags": [
      "leisure"
    ]
  },
  {
    "id": "games",
    "category": "Leisure",
    "mainQuestion": "What makes a game fun for you even when you do not win?",
    "entryPrompts": [
      "Luck, skill, or teamwork?",
      "Easy rules or a bigger challenge?",
      "A funny mistake?"
    ],
    "followUps": [
      {
        "id": "games-f1",
        "text": "How do you like learning a new game?"
      },
      {
        "id": "games-f2",
        "text": "When does competition make a game better?"
      },
      {
        "id": "games-f3",
        "text": "What makes a game easy to play with strangers?"
      },
      {
        "id": "games-f4",
        "text": "How much luck feels right?"
      },
      {
        "id": "games-f5",
        "text": "What do you enjoy about helping another player?"
      },
      {
        "id": "games-f6",
        "text": "Which game would you shorten if you could?"
      },
      {
        "id": "games-f7",
        "text": "What makes you want to play again?"
      },
      {
        "id": "games-f8",
        "text": "Would you rather try a new game or return to a favorite?"
      }
    ],
    "tags": [
      "leisure"
    ]
  },
  {
    "id": "phones",
    "category": "Everyday life",
    "mainQuestion": "Which phone habits make your day easier or more distracting?",
    "entryPrompts": [
      "A useful app?",
      "A notification you could lose?",
      "A time you put your phone away?"
    ],
    "followUps": [
      {
        "id": "phones-f1",
        "text": "What do you open your phone for most often?"
      },
      {
        "id": "phones-f2",
        "text": "Which task is easier without a phone?"
      },
      {
        "id": "phones-f3",
        "text": "How do you feel about voice messages?"
      },
      {
        "id": "phones-f4",
        "text": "What makes a notification useful?"
      },
      {
        "id": "phones-f5",
        "text": "How do you choose which photos to delete?"
      },
      {
        "id": "phones-f6",
        "text": "What would you miss during a phone-free afternoon?"
      },
      {
        "id": "phones-f7",
        "text": "What feature would you make simpler?"
      },
      {
        "id": "phones-f8",
        "text": "When is a paper version better?"
      }
    ],
    "tags": [
      "everyday-life"
    ]
  },
  {
    "id": "weather",
    "category": "Everyday life",
    "mainQuestion": "How does the weather change what you want to do?",
    "entryPrompts": [
      "Rain, sunshine, or cool wind?",
      "An indoor backup plan?",
      "Weather you enjoy watching?"
    ],
    "followUps": [
      {
        "id": "weather-f1",
        "text": "Which weather makes an ordinary place look different?"
      },
      {
        "id": "weather-f2",
        "text": "What do you like doing on a rainy day?"
      },
      {
        "id": "weather-f3",
        "text": "How much do you trust a weather forecast?"
      },
      {
        "id": "weather-f4",
        "text": "What is your best way to enjoy a hot day?"
      },
      {
        "id": "weather-f5",
        "text": "Which weather would you choose for a long walk?"
      },
      {
        "id": "weather-f6",
        "text": "What do you keep ready for a sudden weather change?"
      },
      {
        "id": "weather-f7",
        "text": "How does weather change what you wear at home?"
      },
      {
        "id": "weather-f8",
        "text": "What kind of weather feels like a fresh start?"
      }
    ],
    "tags": [
      "everyday-life"
    ]
  },
  {
    "id": "clothes",
    "category": "Everyday life",
    "mainQuestion": "How do you choose clothes that feel right for your day?",
    "entryPrompts": [
      "Comfort or a favorite color?",
      "Decide early or just before leaving?",
      "An item you wear often?"
    ],
    "followUps": [
      {
        "id": "clothes-f1",
        "text": "What makes clothes comfortable to you?"
      },
      {
        "id": "clothes-f2",
        "text": "When do you enjoy dressing differently?"
      },
      {
        "id": "clothes-f3",
        "text": "Which item is hardest to find?"
      },
      {
        "id": "clothes-f4",
        "text": "How much do pockets matter?"
      },
      {
        "id": "clothes-f5",
        "text": "What do you do with clothes you rarely wear?"
      },
      {
        "id": "clothes-f6",
        "text": "Would you enjoy having a simple everyday uniform?"
      },
      {
        "id": "clothes-f7",
        "text": "What changes when you dress for uncertain weather?"
      },
      {
        "id": "clothes-f8",
        "text": "Which color do you reach for without thinking?"
      }
    ],
    "tags": [
      "everyday-life"
    ]
  },
  {
    "id": "animals",
    "category": "Everyday life",
    "mainQuestion": "What do you enjoy or find surprising about animals around people?",
    "entryPrompts": [
      "An animal you like watching?",
      "A funny animal habit?",
      "Living with an animal or visiting one?"
    ],
    "followUps": [
      {
        "id": "animals-f1",
        "text": "Which animal seems to have the most interesting day?"
      },
      {
        "id": "animals-f2",
        "text": "What makes an animal easy to notice?"
      },
      {
        "id": "animals-f3",
        "text": "Which animal sound do you recognize quickly?"
      },
      {
        "id": "animals-f4",
        "text": "What can people learn from watching animals?"
      },
      {
        "id": "animals-f5",
        "text": "Would you rather visit a farm or watch birds in a park?"
      },
      {
        "id": "animals-f6",
        "text": "What would an animal find strange about your home?"
      },
      {
        "id": "animals-f7",
        "text": "Which animal habit looks relaxing?"
      },
      {
        "id": "animals-f8",
        "text": "What makes a good place for people and animals to share?"
      }
    ],
    "tags": [
      "everyday-life"
    ]
  },
  {
    "id": "learning-skills",
    "category": "Learning",
    "mainQuestion": "How do you like to learn a practical new skill?",
    "entryPrompts": [
      "Watch, read, or try?",
      "A patient teacher?",
      "One skill you would enjoy learning?"
    ],
    "followUps": [
      {
        "id": "learning-skills-f1",
        "text": "What makes instructions easy to follow?"
      },
      {
        "id": "learning-skills-f2",
        "text": "How much practice feels encouraging?"
      },
      {
        "id": "learning-skills-f3",
        "text": "When do you ask someone to show you again?"
      },
      {
        "id": "learning-skills-f4",
        "text": "What makes a beginner feel welcome?"
      },
      {
        "id": "learning-skills-f5",
        "text": "Would you rather learn alone or with another beginner?"
      },
      {
        "id": "learning-skills-f6",
        "text": "How do you notice small progress?"
      },
      {
        "id": "learning-skills-f7",
        "text": "Which skill looks easier than it is?"
      },
      {
        "id": "learning-skills-f8",
        "text": "What helps you return after a long break?"
      }
    ],
    "tags": [
      "learning"
    ]
  },
  {
    "id": "first-days",
    "category": "Learning",
    "mainQuestion": "What helps you settle in on the first day somewhere new?",
    "entryPrompts": [
      "A school, class, or workplace?",
      "Find the room or meet the people?",
      "Something you like knowing early?"
    ],
    "followUps": [
      {
        "id": "first-days-f1",
        "text": "What do you notice first in a new place?"
      },
      {
        "id": "first-days-f2",
        "text": "Which simple instruction is often forgotten?"
      },
      {
        "id": "first-days-f3",
        "text": "How much information is useful on day one?"
      },
      {
        "id": "first-days-f4",
        "text": "Who is easiest to ask for help?"
      },
      {
        "id": "first-days-f5",
        "text": "What makes a first break comfortable?"
      },
      {
        "id": "first-days-f6",
        "text": "Do you prefer exploring alone or taking a tour?"
      },
      {
        "id": "first-days-f7",
        "text": "Which small mistake is easy to make when you are new?"
      },
      {
        "id": "first-days-f8",
        "text": "What would you put in a welcome guide?"
      }
    ],
    "tags": [
      "learning"
    ]
  },
  {
    "id": "small-mistakes",
    "category": "Learning",
    "mainQuestion": "How do you react to small everyday mistakes?",
    "entryPrompts": [
      "A wrong button or a forgotten item?",
      "Fix it alone or ask?",
      "A mistake that taught you something?"
    ],
    "followUps": [
      {
        "id": "small-mistakes-f1",
        "text": "Which mistakes are easy to laugh about later?"
      },
      {
        "id": "small-mistakes-f2",
        "text": "What helps you notice a mistake early?"
      },
      {
        "id": "small-mistakes-f3",
        "text": "When is trying again better than starting over?"
      },
      {
        "id": "small-mistakes-f4",
        "text": "How do you explain a simple mistake to someone?"
      },
      {
        "id": "small-mistakes-f5",
        "text": "What makes an instruction easy to misunderstand?"
      },
      {
        "id": "small-mistakes-f6",
        "text": "Which small mistake do you keep making?"
      },
      {
        "id": "small-mistakes-f7",
        "text": "How can a tool help people correct errors?"
      },
      {
        "id": "small-mistakes-f8",
        "text": "What would you tell someone afraid of making a small mistake?"
      }
    ],
    "tags": [
      "learning"
    ]
  },
  {
    "id": "working-together",
    "category": "Learning",
    "mainQuestion": "What makes a small shared task pleasant to do with someone?",
    "entryPrompts": [
      "Clear jobs or flexible help?",
      "Talk while working or focus?",
      "A task that suits two people?"
    ],
    "followUps": [
      {
        "id": "working-together-f1",
        "text": "How do you decide who does which part?"
      },
      {
        "id": "working-together-f2",
        "text": "What makes instructions feel helpful rather than controlling?"
      },
      {
        "id": "working-together-f3",
        "text": "When is doing the task alone easier?"
      },
      {
        "id": "working-together-f4",
        "text": "How do you handle different working speeds?"
      },
      {
        "id": "working-together-f5",
        "text": "What makes a useful break?"
      },
      {
        "id": "working-together-f6",
        "text": "Would you rather start the task or finish the details?"
      },
      {
        "id": "working-together-f7",
        "text": "How can two different skills work well together?"
      },
      {
        "id": "working-together-f8",
        "text": "What do you appreciate after a shared task is done?"
      }
    ],
    "tags": [
      "learning"
    ]
  },
  {
    "id": "neighborhoods",
    "category": "Places",
    "mainQuestion": "What makes a neighborhood pleasant for you?",
    "entryPrompts": [
      "A useful shop or a green space?",
      "Lively streets or quiet corners?",
      "A place you often pass?"
    ],
    "followUps": [
      {
        "id": "neighborhoods-f1",
        "text": "Which small local place would you miss?"
      },
      {
        "id": "neighborhoods-f2",
        "text": "What makes a street good for walking?"
      },
      {
        "id": "neighborhoods-f3",
        "text": "How do you discover a new local shop?"
      },
      {
        "id": "neighborhoods-f4",
        "text": "What would you add within five minutes of home?"
      },
      {
        "id": "neighborhoods-f5",
        "text": "When does a busy area feel welcoming?"
      },
      {
        "id": "neighborhoods-f6",
        "text": "How do you feel about familiar faces in local places?"
      },
      {
        "id": "neighborhoods-f7",
        "text": "What makes an ordinary corner interesting?"
      },
      {
        "id": "neighborhoods-f8",
        "text": "Which local sound do you notice?"
      }
    ],
    "tags": [
      "places"
    ]
  },
  {
    "id": "nature",
    "category": "Places",
    "mainQuestion": "What kind of time outdoors do you enjoy?",
    "entryPrompts": [
      "A short walk or a long day?",
      "Trees, water, or open space?",
      "Notice the view or the small details?"
    ],
    "followUps": [
      {
        "id": "nature-f1",
        "text": "What makes you choose an outdoor plan?"
      },
      {
        "id": "nature-f2",
        "text": "Which natural sound helps you relax?"
      },
      {
        "id": "nature-f3",
        "text": "How much comfort do you want outdoors?"
      },
      {
        "id": "nature-f4",
        "text": "What do you like noticing on a familiar path?"
      },
      {
        "id": "nature-f5",
        "text": "When is a short walk enough?"
      },
      {
        "id": "nature-f6",
        "text": "Which outdoor activity would you try slowly?"
      },
      {
        "id": "nature-f7",
        "text": "What makes a place feel far from the city?"
      },
      {
        "id": "nature-f8",
        "text": "How do you choose a place to sit outside?"
      }
    ],
    "tags": [
      "places"
    ]
  },
  {
    "id": "crowds",
    "category": "Places",
    "mainQuestion": "When do you enjoy a busy place, and when do you want space?",
    "entryPrompts": [
      "A market, event, or station?",
      "Energy or too much noise?",
      "A quiet escape nearby?"
    ],
    "followUps": [
      {
        "id": "crowds-f1",
        "text": "What makes a crowd feel friendly?"
      },
      {
        "id": "crowds-f2",
        "text": "How do you choose where to stand in a busy room?"
      },
      {
        "id": "crowds-f3",
        "text": "Which busy place is worth the effort?"
      },
      {
        "id": "crowds-f4",
        "text": "What helps you keep track of friends in a crowd?"
      },
      {
        "id": "crowds-f5",
        "text": "Would you arrive early or later at a popular event?"
      },
      {
        "id": "crowds-f6",
        "text": "What makes a busy place easy to leave?"
      },
      {
        "id": "crowds-f7",
        "text": "How do you find a quiet moment during an event?"
      },
      {
        "id": "crowds-f8",
        "text": "Which sounds make a place feel lively rather than loud?"
      }
    ],
    "tags": [
      "places"
    ]
  },
  {
    "id": "quiet-places",
    "category": "Places",
    "mainQuestion": "Where do you go when you want a little peace?",
    "entryPrompts": [
      "At home or outside?",
      "Silence or gentle sound?",
      "Alone or with quiet company?"
    ],
    "followUps": [
      {
        "id": "quiet-places-f1",
        "text": "What makes a place feel peaceful rather than empty?"
      },
      {
        "id": "quiet-places-f2",
        "text": "How much time alone helps you?"
      },
      {
        "id": "quiet-places-f3",
        "text": "What object makes a quiet corner comfortable?"
      },
      {
        "id": "quiet-places-f4",
        "text": "Can a public place feel private enough?"
      },
      {
        "id": "quiet-places-f5",
        "text": "Which gentle sounds do you welcome?"
      },
      {
        "id": "quiet-places-f6",
        "text": "What do you enjoy doing in a quiet place?"
      },
      {
        "id": "quiet-places-f7",
        "text": "How do you create a calm corner in a busy space?"
      },
      {
        "id": "quiet-places-f8",
        "text": "When do you want company without conversation?"
      }
    ],
    "tags": [
      "places"
    ]
  },
  {
    "id": "childhood-interests",
    "category": "Change",
    "mainQuestion": "Which things did you enjoy when you were younger, and how have your tastes changed?",
    "entryPrompts": [
      "A game or a hobby?",
      "A taste you kept?",
      "Something you would try again?"
    ],
    "followUps": [
      {
        "id": "childhood-interests-f1",
        "text": "Which old interest would be fun to revisit?"
      },
      {
        "id": "childhood-interests-f2",
        "text": "What did you think was exciting that now seems ordinary?"
      },
      {
        "id": "childhood-interests-f3",
        "text": "Which food did you change your mind about?"
      },
      {
        "id": "childhood-interests-f4",
        "text": "What did you enjoy making with your hands?"
      },
      {
        "id": "childhood-interests-f5",
        "text": "Which simple game needed almost no equipment?"
      },
      {
        "id": "childhood-interests-f6",
        "text": "What would your younger self find surprising about your hobbies now?"
      },
      {
        "id": "childhood-interests-f7",
        "text": "What kind of place felt huge when you were small?"
      },
      {
        "id": "childhood-interests-f8",
        "text": "Which interest do you think will stay with you?"
      }
    ],
    "tags": [
      "change"
    ]
  },
  {
    "id": "trying-new-things",
    "category": "Change",
    "mainQuestion": "What makes you willing to try something new?",
    "entryPrompts": [
      "A friend, curiosity, or a small step?",
      "Try once or prepare first?",
      "Something low-risk you might try?"
    ],
    "followUps": [
      {
        "id": "trying-new-things-f1",
        "text": "What makes a first attempt feel easier?"
      },
      {
        "id": "trying-new-things-f2",
        "text": "When do you want someone to join you?"
      },
      {
        "id": "trying-new-things-f3",
        "text": "What would you try if equipment were free to borrow?"
      },
      {
        "id": "trying-new-things-f4",
        "text": "How much information do you need before starting?"
      },
      {
        "id": "trying-new-things-f5",
        "text": "What makes a new activity feel too complicated?"
      },
      {
        "id": "trying-new-things-f6",
        "text": "When has a small change been enough?"
      },
      {
        "id": "trying-new-things-f7",
        "text": "Would you rather try something for ten minutes or a whole day?"
      },
      {
        "id": "trying-new-things-f8",
        "text": "How do you decide whether to try again?"
      }
    ],
    "tags": [
      "change"
    ]
  },
  {
    "id": "useful-advice",
    "category": "Change",
    "mainQuestion": "What simple advice has been useful in everyday life?",
    "entryPrompts": [
      "A practical tip?",
      "Advice you understood later?",
      "A tip you would pass on?"
    ],
    "followUps": [
      {
        "id": "useful-advice-f1",
        "text": "What makes advice easy to remember?"
      },
      {
        "id": "useful-advice-f2",
        "text": "When do you prefer an example to an explanation?"
      },
      {
        "id": "useful-advice-f3",
        "text": "Which common advice does not suit everyone?"
      },
      {
        "id": "useful-advice-f4",
        "text": "What tip saves you a little time?"
      },
      {
        "id": "useful-advice-f5",
        "text": "How do you test whether advice works for you?"
      },
      {
        "id": "useful-advice-f6",
        "text": "What useful thing did you learn by watching someone?"
      },
      {
        "id": "useful-advice-f7",
        "text": "When is asking one more question helpful?"
      },
      {
        "id": "useful-advice-f8",
        "text": "What advice would you give a beginner at a simple task?"
      }
    ],
    "tags": [
      "change"
    ]
  },
  {
    "id": "future-routines",
    "category": "Change",
    "mainQuestion": "Which everyday habits do you think will change in the future?",
    "entryPrompts": [
      "Shopping, travel, or home life?",
      "One thing you hope stays the same?",
      "A change you would enjoy?"
    ],
    "followUps": [
      {
        "id": "future-routines-f1",
        "text": "What ordinary object might people stop using?"
      },
      {
        "id": "future-routines-f2",
        "text": "Which daily task should become easier?"
      },
      {
        "id": "future-routines-f3",
        "text": "What familiar activity would you keep without technology?"
      },
      {
        "id": "future-routines-f4",
        "text": "How might people use a free hour in the future?"
      },
      {
        "id": "future-routines-f5",
        "text": "What would you want future homes to do better?"
      },
      {
        "id": "future-routines-f6",
        "text": "Which old tool could remain useful?"
      },
      {
        "id": "future-routines-f7",
        "text": "What might future people find strange about our routines?"
      },
      {
        "id": "future-routines-f8",
        "text": "How would you like a normal morning to change?"
      }
    ],
    "tags": [
      "change"
    ]
  },
  {
    "id": "daily-superpowers",
    "category": "Imagination",
    "mainQuestion": "If you had one small superpower for daily life, what trouble would it save you?",
    "entryPrompts": [
      "Find things, clean, or save time?",
      "One useful limit?",
      "A power too small for a superhero?"
    ],
    "followUps": [
      {
        "id": "daily-superpowers-f1",
        "text": "Which daily task would you keep doing yourself?"
      },
      {
        "id": "daily-superpowers-f2",
        "text": "What would be an annoying side effect of your power?"
      },
      {
        "id": "daily-superpowers-f3",
        "text": "Would you use it differently at home and outside?"
      },
      {
        "id": "daily-superpowers-f4",
        "text": "Which power would help during a rainy day?"
      },
      {
        "id": "daily-superpowers-f5",
        "text": "What would make a small power easy to hide?"
      },
      {
        "id": "daily-superpowers-f6",
        "text": "How might a friend borrow the benefit of your power?"
      },
      {
        "id": "daily-superpowers-f7",
        "text": "Which power sounds useful but would become boring?"
      },
      {
        "id": "daily-superpowers-f8",
        "text": "What ordinary object would you keep even with your power?"
      }
    ],
    "tags": [
      "imagination"
    ]
  },
  {
    "id": "talking-objects",
    "category": "Imagination",
    "mainQuestion": "If one everyday object could talk, which conversation would you want to have?",
    "entryPrompts": [
      "A useful question?",
      "An object with a complaint?",
      "Something that sees your whole day?"
    ],
    "followUps": [
      {
        "id": "talking-objects-f1",
        "text": "Which object would tell the best stories?"
      },
      {
        "id": "talking-objects-f2",
        "text": "Which object would you ask for advice?"
      },
      {
        "id": "talking-objects-f3",
        "text": "What might a kitchen object complain about?"
      },
      {
        "id": "talking-objects-f4",
        "text": "Which talking object would be hardest to ignore?"
      },
      {
        "id": "talking-objects-f5",
        "text": "Would you want the object to remember everything?"
      },
      {
        "id": "talking-objects-f6",
        "text": "Which object would enjoy hearing about your day?"
      },
      {
        "id": "talking-objects-f7",
        "text": "How would you know when the object wanted quiet?"
      },
      {
        "id": "talking-objects-f8",
        "text": "What might two objects say about each other?"
      }
    ],
    "tags": [
      "imagination"
    ]
  },
  {
    "id": "extra-hour",
    "category": "Imagination",
    "mainQuestion": "If you had one extra free hour every day, how would you use it?",
    "entryPrompts": [
      "Rest, learn, or play?",
      "Keep it for yourself?",
      "A small project you could begin?"
    ],
    "followUps": [
      {
        "id": "extra-hour-f1",
        "text": "Would you want the hour in the morning or evening?"
      },
      {
        "id": "extra-hour-f2",
        "text": "What would you avoid putting into the extra hour?"
      },
      {
        "id": "extra-hour-f3",
        "text": "Would you use it the same way every day?"
      },
      {
        "id": "extra-hour-f4",
        "text": "What could you learn in many small sessions?"
      },
      {
        "id": "extra-hour-f5",
        "text": "How would the hour change your weekends?"
      },
      {
        "id": "extra-hour-f6",
        "text": "Would you share the time with someone?"
      },
      {
        "id": "extra-hour-f7",
        "text": "What would help you keep the hour free?"
      },
      {
        "id": "extra-hour-f8",
        "text": "Would saving the hours for later make them more useful?"
      }
    ],
    "tags": [
      "imagination"
    ]
  },
  {
    "id": "new-holiday",
    "category": "Imagination",
    "mainQuestion": "What small part of everyday life deserves its own holiday?",
    "entryPrompts": [
      "An object, habit, or simple joy?",
      "A relaxed tradition?",
      "Food that fits the day?"
    ],
    "followUps": [
      {
        "id": "new-holiday-f1",
        "text": "What would people do for just five minutes on this holiday?"
      },
      {
        "id": "new-holiday-f2",
        "text": "What would make the day easy to enjoy without spending money?"
      },
      {
        "id": "new-holiday-f3",
        "text": "Which everyday worker or object deserves thanks?"
      },
      {
        "id": "new-holiday-f4",
        "text": "Would you prefer a quiet holiday or a lively one?"
      },
      {
        "id": "new-holiday-f5",
        "text": "Which season would fit your idea?"
      },
      {
        "id": "new-holiday-f6",
        "text": "What food would you connect with the day?"
      },
      {
        "id": "new-holiday-f7",
        "text": "What tradition would you leave optional?"
      },
      {
        "id": "new-holiday-f8",
        "text": "How would the holiday look different at home and outside?"
      }
    ],
    "tags": [
      "imagination"
    ]
  }
];
  const wolfTasks = [
  {
    "id": "w3-i001",
    "text": "Get a non-wolf player to invent a new word for something connected to the topic.",
    "type": "interaction",
    "family": "naming",
    "mechanicKey": "coined_word",
    "variantGroup": "coined_word",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "coined_word"
    ],
    "positiveClues": [
      "One task involves naming something."
    ]
  },
  {
    "id": "w3-i002",
    "text": "Get a non-wolf player to describe a topic-related object without saying its name.",
    "type": "interaction",
    "family": "word_play",
    "mechanicKey": "description_game",
    "variantGroup": "description_game",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "description_game"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-i003",
    "text": "Get a non-wolf player to finish a topic-related sentence that you start.",
    "type": "interaction",
    "family": "conversation_move",
    "mechanicKey": "sentence_completion",
    "variantGroup": "sentence_completion",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "sentence_completion"
    ],
    "positiveClues": [
      "One task changes the way a conversation response is given."
    ]
  },
  {
    "id": "w3-i004",
    "text": "Get a non-wolf player to ask you a question about the topic.",
    "type": "interaction",
    "family": "conversation_move",
    "mechanicKey": "question_answer",
    "variantGroup": "question_answer",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "question_answer"
    ],
    "positiveClues": [
      "One task changes the way a conversation response is given."
    ]
  },
  {
    "id": "w3-i005",
    "text": "Get a non-wolf player to recommend an alternative to your topic-related choice.",
    "type": "interaction",
    "family": "choice",
    "mechanicKey": "recommendation",
    "variantGroup": "recommendation",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "recommendation"
    ],
    "positiveClues": [
      "One task asks another person to make a choice."
    ]
  },
  {
    "id": "w3-i006",
    "text": "Get a non-wolf player to compare a topic-related choice to an animal.",
    "type": "interaction",
    "family": "comparison",
    "mechanicKey": "comparison",
    "variantGroup": "comparison",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "comparison"
    ],
    "positiveClues": [
      "One task makes an unusual comparison."
    ]
  },
  {
    "id": "w3-i007",
    "text": "Get a non-wolf player to rank three topic-related options you name.",
    "type": "interaction",
    "family": "ordering",
    "mechanicKey": "ranked_list",
    "variantGroup": "ranked_list",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "ranked_list"
    ],
    "positiveClues": [
      "One task puts choices in an order."
    ]
  },
  {
    "id": "w3-i008",
    "text": "Get a non-wolf player to remove one option from a topic-related pair you suggest.",
    "type": "interaction",
    "family": "choice",
    "mechanicKey": "veto",
    "variantGroup": "veto",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "veto"
    ],
    "positiveClues": [
      "One task asks another person to make a choice."
    ]
  },
  {
    "id": "w3-i009",
    "text": "Get a non-wolf player to guess your topic-related choice before you reveal it.",
    "type": "interaction",
    "family": "perspective",
    "mechanicKey": "prediction",
    "variantGroup": "prediction",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "prediction"
    ],
    "positiveClues": [
      "One task uses an unusual point of view."
    ]
  },
  {
    "id": "w3-i010",
    "text": "Get a non-wolf player to invent a warning sign for a small topic-related problem.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "warning_sign",
    "variantGroup": "warning_sign",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "warning_sign"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-i011",
    "text": "Get a non-wolf player to invent an award for a topic-related object.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "award",
    "variantGroup": "award",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "award"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-i012",
    "text": "Get a non-wolf player to speak as an object connected to the topic.",
    "type": "interaction",
    "family": "personification",
    "mechanicKey": "object_voice",
    "variantGroup": "object_voice",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "object_voice"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-i013",
    "text": "Get a non-wolf player to suggest a harmless penalty for an imaginary topic-related rule.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "invented_rule",
    "variantGroup": "invented_rule",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "invented_rule"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-i014",
    "text": "Get a non-wolf player to repeat one full topic-related sentence you have said.",
    "type": "interaction",
    "family": "word_play",
    "mechanicKey": "quotation",
    "variantGroup": "quotation",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "quotation"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-i015",
    "text": "Get a non-wolf player to make a sound effect for something in the conversation.",
    "type": "interaction",
    "family": "voice_sound",
    "mechanicKey": "sound_effect",
    "variantGroup": "sound_effect",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "sound_effect"
    ],
    "positiveClues": [
      "One task involves making a sound with the voice."
    ]
  },
  {
    "id": "w3-i016",
    "text": "Get a non-wolf player to hum a tune for a topic-related moment.",
    "type": "interaction",
    "family": "voice_music",
    "mechanicKey": "humming",
    "variantGroup": "humming",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "humming"
    ],
    "positiveClues": [
      "One task involves a tune."
    ]
  },
  {
    "id": "w3-i017",
    "text": "Get a non-wolf player to call you \"Captain.\"",
    "type": "interaction",
    "family": "addressing",
    "mechanicKey": "address_title",
    "variantGroup": "address_title",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "address_title"
    ],
    "positiveClues": [
      "One task involves how someone is addressed."
    ]
  },
  {
    "id": "w3-i018",
    "text": "Get a non-wolf player to count down from three to start an imaginary topic-related scene.",
    "type": "interaction",
    "family": "numbers",
    "mechanicKey": "countdown",
    "variantGroup": "countdown",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "countdown"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-i019",
    "text": "Get a non-wolf player to describe their feelings about the topic as a weather report.",
    "type": "interaction",
    "family": "spoken_format",
    "mechanicKey": "weather_report",
    "variantGroup": "weather_report",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "weather_report"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-i020",
    "text": "Get a non-wolf player to price a topic-related object in an imaginary currency.",
    "type": "interaction",
    "family": "numbers",
    "mechanicKey": "imaginary_price",
    "variantGroup": "imaginary_price",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "imaginary_price"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-s001",
    "text": "Sing, \"I have a better idea.\"",
    "type": "self_action",
    "family": "voice_music",
    "mechanicKey": "singing",
    "variantGroup": "singing",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "singing"
    ],
    "positiveClues": [
      "One task involves a tune."
    ]
  },
  {
    "id": "w3-s002",
    "text": "Clap three times while talking about the topic.",
    "type": "self_action",
    "family": "hand_sound",
    "mechanicKey": "clapping",
    "variantGroup": "clapping",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "clapping"
    ],
    "positiveClues": [
      "One task uses a sound made with the hands."
    ]
  },
  {
    "id": "w3-s003",
    "text": "Tap a hard surface twice so the group can hear it.",
    "type": "self_action",
    "family": "hand_sound",
    "mechanicKey": "tapping",
    "variantGroup": "tapping",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "tapping"
    ],
    "positiveClues": [
      "One task uses a sound made with the hands."
    ]
  },
  {
    "id": "w3-s004",
    "text": "Make a sound effect for something mentioned in the conversation.",
    "type": "self_action",
    "family": "voice_sound",
    "mechanicKey": "sound_effect",
    "variantGroup": "sound_effect",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "sound_effect"
    ],
    "positiveClues": [
      "One task involves making a sound with the voice."
    ]
  },
  {
    "id": "w3-s005",
    "text": "Hum a short tune to match your answer.",
    "type": "self_action",
    "family": "voice_music",
    "mechanicKey": "humming",
    "variantGroup": "humming",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "humming"
    ],
    "positiveClues": [
      "One task involves a tune."
    ]
  },
  {
    "id": "w3-s006",
    "text": "Say one sentence about the topic in a robot voice.",
    "type": "self_action",
    "family": "voice_style",
    "mechanicKey": "robot_voice",
    "variantGroup": "robot_voice",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "robot_voice"
    ],
    "positiveClues": [
      "One task changes the way someone speaks."
    ]
  },
  {
    "id": "w3-s007",
    "text": "Say one complete answer in an audible whisper.",
    "type": "self_action",
    "family": "voice_style",
    "mechanicKey": "whispering",
    "variantGroup": "whispering",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "whispering"
    ],
    "positiveClues": [
      "One task changes the way someone speaks."
    ]
  },
  {
    "id": "w3-s008",
    "text": "Stretch the final word of an answer for three seconds.",
    "type": "self_action",
    "family": "voice_style",
    "mechanicKey": "stretched_word",
    "variantGroup": "stretched_word",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "stretched_word"
    ],
    "positiveClues": [
      "One task changes the way someone speaks."
    ]
  },
  {
    "id": "w3-s009",
    "text": "Say one sentence with a one-second pause between each word.",
    "type": "self_action",
    "family": "voice_style",
    "mechanicKey": "slow_speech",
    "variantGroup": "slow_speech",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "slow_speech"
    ],
    "positiveClues": [
      "One task changes the way someone speaks."
    ]
  },
  {
    "id": "w3-s010",
    "text": "Repeat the last three words of another player's sentence.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "echoing",
    "variantGroup": "echoing",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "echoing"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s011",
    "text": "Say a topic-related noun three times in a row.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "word_repetition",
    "variantGroup": "word_repetition",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "word_repetition"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s012",
    "text": "Answer a question about the topic with exactly one word.",
    "type": "self_action",
    "family": "short_answer",
    "mechanicKey": "one_word_answer",
    "variantGroup": "one_word_answer",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "one_word_answer"
    ],
    "positiveClues": [
      "One task limits the length of an answer."
    ]
  },
  {
    "id": "w3-s013",
    "text": "End one sentence with two rhyming words.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "rhyme",
    "variantGroup": "rhyme",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "rhyme"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s014",
    "text": "Say three topic-related words that begin with the same letter.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "alliteration",
    "variantGroup": "alliteration",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "alliteration"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s015",
    "text": "Spell aloud the name of an object connected to the topic.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "spelling",
    "variantGroup": "spelling",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "spelling"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s016",
    "text": "Answer a question about the topic with another question.",
    "type": "self_action",
    "family": "conversation_move",
    "mechanicKey": "question_answer",
    "variantGroup": "question_answer",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "question_answer"
    ],
    "positiveClues": [
      "One task changes the way a conversation response is given."
    ]
  },
  {
    "id": "w3-s017",
    "text": "Count down from three to one before giving your opinion.",
    "type": "self_action",
    "family": "numbers",
    "mechanicKey": "countdown",
    "variantGroup": "countdown",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "countdown"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-s018",
    "text": "Present one of your opinions as a news headline.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "news_headline",
    "variantGroup": "news_headline",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "news_headline"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-s019",
    "text": "Describe your feelings about the topic as a weather report.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "weather_report",
    "variantGroup": "weather_report",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "weather_report"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-s020",
    "text": "Give a short sales pitch for an ordinary object connected to the topic.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "sales_pitch",
    "variantGroup": "sales_pitch",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "sales_pitch"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-s021",
    "text": "Speak one sentence as if you are an object mentioned in the conversation.",
    "type": "self_action",
    "family": "personification",
    "mechanicKey": "object_voice",
    "variantGroup": "object_voice",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "object_voice"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-s022",
    "text": "Make a station-style announcement about something in the conversation.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "announcement",
    "variantGroup": "announcement",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "announcement"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-s023",
    "text": "Apologize aloud to an object connected to the topic.",
    "type": "self_action",
    "family": "personification",
    "mechanicKey": "object_apology",
    "variantGroup": "object_apology",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "object_apology"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-s024",
    "text": "Rate a topic-related choice with a number that includes a decimal.",
    "type": "self_action",
    "family": "numbers",
    "mechanicKey": "number_rating",
    "variantGroup": "number_rating",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "number_rating"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-s025",
    "text": "Describe a topic-related object as your boss.",
    "type": "self_action",
    "family": "comparison",
    "mechanicKey": "metaphor",
    "variantGroup": "metaphor",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "metaphor"
    ],
    "positiveClues": [
      "One task makes an unusual comparison."
    ]
  },
  {
    "id": "w3-s026",
    "text": "Propose one harmless new rule about the topic.",
    "type": "self_action",
    "family": "invention",
    "mechanicKey": "invented_rule",
    "variantGroup": "invented_rule",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "invented_rule"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-s027",
    "text": "Give an imaginary award to an ordinary thing connected to the topic.",
    "type": "self_action",
    "family": "invention",
    "mechanicKey": "award",
    "variantGroup": "award",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "award"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-s028",
    "text": "Say a two-line poem about your answer; it does not need to rhyme.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "poem",
    "variantGroup": "poem",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "poem"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-s029",
    "text": "Create a short advertising slogan for your preferred choice.",
    "type": "self_action",
    "family": "invention",
    "mechanicKey": "slogan",
    "variantGroup": "slogan",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "slogan"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-s030",
    "text": "Invent a new word for a feeling connected to the topic.",
    "type": "self_action",
    "family": "word_play",
    "mechanicKey": "coined_word",
    "variantGroup": "coined_word",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "coined_word"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-s031",
    "text": "Give a new nickname to an object mentioned in the conversation.",
    "type": "self_action",
    "family": "naming",
    "mechanicKey": "nickname",
    "variantGroup": "nickname",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "nickname"
    ],
    "positiveClues": [
      "One task involves naming something."
    ]
  },
  {
    "id": "w3-s032",
    "text": "Compare your preferred choice to an animal.",
    "type": "self_action",
    "family": "comparison",
    "mechanicKey": "comparison",
    "variantGroup": "comparison",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "comparison"
    ],
    "positiveClues": [
      "One task makes an unusual comparison."
    ]
  },
  {
    "id": "w3-s033",
    "text": "Put a price on a topic-related idea using snacks instead of money.",
    "type": "self_action",
    "family": "numbers",
    "mechanicKey": "imaginary_price",
    "variantGroup": "imaginary_price",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "imaginary_price"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-s034",
    "text": "Rank three things mentioned in the conversation from best to worst.",
    "type": "self_action",
    "family": "ordering",
    "mechanicKey": "ranked_list",
    "variantGroup": "ranked_list",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "ranked_list"
    ],
    "positiveClues": [
      "One task puts choices in an order."
    ]
  },
  {
    "id": "w3-s035",
    "text": "Say one good thing about a topic-related option you would not choose.",
    "type": "self_action",
    "family": "perspective",
    "mechanicKey": "backwards_choice",
    "variantGroup": "backwards_choice",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "backwards_choice"
    ],
    "positiveClues": [
      "One task uses an unusual point of view."
    ]
  },
  {
    "id": "w3-s036",
    "text": "Say the words for a warning sign about a small topic-related problem.",
    "type": "self_action",
    "family": "invention",
    "mechanicKey": "warning_sign",
    "variantGroup": "warning_sign",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "warning_sign"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-s037",
    "text": "Predict how one of your topic-related habits will change in ten years.",
    "type": "self_action",
    "family": "perspective",
    "mechanicKey": "prediction",
    "variantGroup": "prediction",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "prediction"
    ],
    "positiveClues": [
      "One task uses an unusual point of view."
    ]
  },
  {
    "id": "w3-s038",
    "text": "Describe an imaginary memory of doing something related to the topic in the future.",
    "type": "self_action",
    "family": "perspective",
    "mechanicKey": "future_memory",
    "variantGroup": "future_memory",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "future_memory"
    ],
    "positiveClues": [
      "One task uses an unusual point of view."
    ]
  },
  {
    "id": "w3-s039",
    "text": "Give your answer a three-word movie title.",
    "type": "self_action",
    "family": "naming",
    "mechanicKey": "movie_title",
    "variantGroup": "movie_title",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "movie_title"
    ],
    "positiveClues": [
      "One task involves naming something."
    ]
  },
  {
    "id": "w3-s040",
    "text": "Call the same other player \"Captain\" twice.",
    "type": "self_action",
    "family": "addressing",
    "mechanicKey": "address_title",
    "variantGroup": "address_title",
    "compatibleTopicTags": [
      "*"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "address_title"
    ],
    "positiveClues": [
      "One task involves how someone is addressed."
    ]
  },
  {
    "id": "w3-ti01",
    "text": "Get a non-wolf player to give an imaginary travel group a name.",
    "type": "interaction",
    "family": "naming",
    "mechanicKey": "nickname",
    "variantGroup": "nickname",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "nickname"
    ],
    "positiveClues": [
      "One task involves naming something."
    ]
  },
  {
    "id": "w3-ts01",
    "text": "Sing, \"I do not want an early flight.\"",
    "type": "self_action",
    "family": "voice_music",
    "mechanicKey": "singing",
    "variantGroup": "singing",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "singing"
    ],
    "positiveClues": [
      "One task involves a tune."
    ]
  },
  {
    "id": "w3-ti02",
    "text": "Get a non-wolf player to remove one item from an imaginary two-item shopping basket.",
    "type": "interaction",
    "family": "choice",
    "mechanicKey": "veto",
    "variantGroup": "veto",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "veto"
    ],
    "positiveClues": [
      "One task asks another person to make a choice."
    ]
  },
  {
    "id": "w3-ts02",
    "text": "Speak one sentence as your wallet.",
    "type": "self_action",
    "family": "personification",
    "mechanicKey": "object_voice",
    "variantGroup": "object_voice",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "object_voice"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-ti03",
    "text": "Get a non-wolf player to invent a harmless rule for an imaginary living room.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "invented_rule",
    "variantGroup": "invented_rule",
    "compatibleTopicIds": [
      "home-space"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "invented_rule"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-ts03",
    "text": "Apologize aloud to an imaginary fridge.",
    "type": "self_action",
    "family": "personification",
    "mechanicKey": "object_apology",
    "variantGroup": "object_apology",
    "compatibleTopicIds": [
      "home-space"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "object_apology"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-ti04",
    "text": "Get a non-wolf player to invent a name for a failed dish.",
    "type": "interaction",
    "family": "word_play",
    "mechanicKey": "coined_word",
    "variantGroup": "coined_word",
    "compatibleTopicIds": [
      "cooking"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "coined_word"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-ts04",
    "text": "Make the sound of a boiling pot.",
    "type": "self_action",
    "family": "voice_sound",
    "mechanicKey": "sound_effect",
    "variantGroup": "sound_effect",
    "compatibleTopicIds": [
      "cooking"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "sound_effect"
    ],
    "positiveClues": [
      "One task involves making a sound with the voice."
    ]
  },
  {
    "id": "w3-ti05",
    "text": "Get a non-wolf player to choose a breakfast for you.",
    "type": "interaction",
    "family": "choice",
    "mechanicKey": "recommendation",
    "variantGroup": "recommendation",
    "compatibleTopicIds": [
      "mornings"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "recommendation"
    ],
    "positiveClues": [
      "One task asks another person to make a choice."
    ]
  },
  {
    "id": "w3-ts05",
    "text": "Announce the arrival of breakfast like a train arriving at a station.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "announcement",
    "variantGroup": "announcement",
    "compatibleTopicIds": [
      "mornings"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "announcement"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-ti06",
    "text": "Get a non-wolf player to finish your imaginary party invitation.",
    "type": "interaction",
    "family": "conversation_move",
    "mechanicKey": "sentence_completion",
    "variantGroup": "sentence_completion",
    "compatibleTopicIds": [
      "invitations"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "sentence_completion"
    ],
    "positiveClues": [
      "One task changes the way a conversation response is given."
    ]
  },
  {
    "id": "w3-ts06",
    "text": "Advertise an imaginary party where everyone wears slippers.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "sales_pitch",
    "variantGroup": "sales_pitch",
    "compatibleTopicIds": [
      "invitations"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "sales_pitch"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-ti07",
    "text": "Get a non-wolf player to invent an award for a beginner at a hobby.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "award",
    "variantGroup": "award",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "award"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-ts07",
    "text": "Explain a hobby in a robot voice.",
    "type": "self_action",
    "family": "voice_style",
    "mechanicKey": "robot_voice",
    "variantGroup": "robot_voice",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "robot_voice"
    ],
    "positiveClues": [
      "One task changes the way someone speaks."
    ]
  },
  {
    "id": "w3-ti08",
    "text": "Get a non-wolf player to write a spoken warning for a distracting phone app.",
    "type": "interaction",
    "family": "invention",
    "mechanicKey": "warning_sign",
    "variantGroup": "warning_sign",
    "compatibleTopicIds": [
      "phones"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "warning_sign"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  },
  {
    "id": "w3-ts08",
    "text": "Speak one sentence as a phone with a low battery.",
    "type": "self_action",
    "family": "personification",
    "mechanicKey": "object_voice",
    "variantGroup": "object_voice",
    "compatibleTopicIds": [
      "phones"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "object_voice"
    ],
    "positiveClues": [
      "One task treats an object like a person."
    ]
  },
  {
    "id": "w3-ti09",
    "text": "Get a non-wolf player to describe a useful tool without naming it.",
    "type": "interaction",
    "family": "word_play",
    "mechanicKey": "description_game",
    "variantGroup": "description_game",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "description_game"
    ],
    "positiveClues": [
      "One task plays with words."
    ]
  },
  {
    "id": "w3-ts09",
    "text": "Announce learning a tiny skill as breaking news.",
    "type": "self_action",
    "family": "spoken_format",
    "mechanicKey": "news_headline",
    "variantGroup": "news_headline",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "news_headline"
    ],
    "positiveClues": [
      "One task uses a different kind of spoken presentation."
    ]
  },
  {
    "id": "w3-ti10",
    "text": "Get a non-wolf player to price an imaginary local service in biscuits.",
    "type": "interaction",
    "family": "numbers",
    "mechanicKey": "imaginary_price",
    "variantGroup": "imaginary_price",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "imaginary_price"
    ],
    "positiveClues": [
      "One task involves spoken numbers or prices."
    ]
  },
  {
    "id": "w3-ts10",
    "text": "Give a nearby ordinary place a new nickname.",
    "type": "self_action",
    "family": "naming",
    "mechanicKey": "nickname",
    "variantGroup": "nickname",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "nickname"
    ],
    "positiveClues": [
      "One task involves naming something."
    ]
  },
  {
    "id": "w3-ti11",
    "text": "Get a non-wolf player to guess a game you enjoyed when you were younger.",
    "type": "interaction",
    "family": "perspective",
    "mechanicKey": "prediction",
    "variantGroup": "prediction",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "prediction"
    ],
    "positiveClues": [
      "One task uses an unusual point of view."
    ]
  },
  {
    "id": "w3-ts11",
    "text": "Make a sound from an imaginary childhood toy.",
    "type": "self_action",
    "family": "voice_sound",
    "mechanicKey": "sound_effect",
    "variantGroup": "sound_effect",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "sound_effect"
    ],
    "positiveClues": [
      "One task involves making a sound with the voice."
    ]
  },
  {
    "id": "w3-ti12",
    "text": "Get a non-wolf player to compare their chosen superpower to an animal.",
    "type": "interaction",
    "family": "comparison",
    "mechanicKey": "comparison",
    "variantGroup": "comparison",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "requiredOtherPlayerCount": 1,
    "actionTags": [
      "comparison"
    ],
    "positiveClues": [
      "One task makes an unusual comparison."
    ]
  },
  {
    "id": "w3-ts12",
    "text": "Invent a slogan for a superpower that finds lost keys.",
    "type": "self_action",
    "family": "invention",
    "mechanicKey": "slogan",
    "variantGroup": "slogan",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "requiredOtherPlayerCount": 0,
    "actionTags": [
      "slogan"
    ],
    "positiveClues": [
      "One task involves inventing something."
    ]
  }
];
  const villageTasks = [
  {
    "id": "v3-travel-friends-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which travel plan they would refuse.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-travel-friends-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they like to do first in a new place.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-travel-friends-veteran-1",
    "roleId": "veteran",
    "text": "Share a small surprise from a trip.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-travel-friends-veteran-2",
    "roleId": "veteran",
    "text": "Share a trip moment that was different from your plan.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-travel-friends-bait-1",
    "roleId": "bait",
    "text": "Sing, \"My suitcase needs a holiday.\"",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-travel-friends-bait-2",
    "roleId": "bait",
    "text": "Make the sound of a train leaving.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-travel-friends-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a magic hotel service you would use.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-travel-friends-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a holiday on a floating island.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-travel-friends-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about rain during a trip.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-travel-friends-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a free luxury holiday.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-travel-friends-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to reach a hotel: bus, taxi, or walking.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-travel-friends-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same trip length: one day or one week.",
    "compatibleTopicIds": [
      "travel-friends"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-daily-journeys-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what bothers them on public transport.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-daily-journeys-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which everyday journey they enjoy.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-daily-journeys-veteran-1",
    "roleId": "veteran",
    "text": "Share a time you missed a bus, train, or ride.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-daily-journeys-veteran-2",
    "roleId": "veteran",
    "text": "Share something you noticed on a regular journey.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-daily-journeys-bait-1",
    "roleId": "bait",
    "text": "Announce, \"Next stop: the land of snacks.\"",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-daily-journeys-bait-2",
    "roleId": "bait",
    "text": "Make the sound of a bicycle bell.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-daily-journeys-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a new way to travel to the shops.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-daily-journeys-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe your perfect seat on a magic bus.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-daily-journeys-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a slow journey.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-daily-journeys-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a car that drives itself.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-daily-journeys-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same short journey option: walking or cycling.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-daily-journeys-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same bus seat: front or back.",
    "compatibleTopicIds": [
      "daily-journeys"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-packing-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which item they always forget to pack.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-packing-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which item takes too much space in their bag.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-packing-veteran-1",
    "roleId": "veteran",
    "text": "Share a time you forgot something away from home.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-packing-veteran-2",
    "roleId": "veteran",
    "text": "Share an item that saved you trouble on a trip.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-packing-bait-1",
    "roleId": "bait",
    "text": "Say, \"My socks have their own travel plans.\"",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-packing-bait-2",
    "roleId": "bait",
    "text": "Make a zipper sound with your voice.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-packing-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe one magic feature you want in a bag.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-packing-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine what a suitcase would complain about.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-packing-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about taking only a tiny bag.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-packing-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a suitcase that holds everything.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-packing-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra item: a book or a pillow.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-packing-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same bag style: backpack or suitcase.",
    "compatibleTopicIds": [
      "packing"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-getting-lost-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player how they find their way in a new place.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-getting-lost-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which kind of direction is easiest to follow.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-getting-lost-veteran-1",
    "roleId": "veteran",
    "text": "Share a time you took the wrong turn.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-getting-lost-veteran-2",
    "roleId": "veteran",
    "text": "Share a place you found by accident.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-getting-lost-bait-1",
    "roleId": "bait",
    "text": "Say, \"The map is lost, not me.\"",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-getting-lost-bait-2",
    "roleId": "bait",
    "text": "Give a robot-style announcement: \"Route unknown.\"",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-getting-lost-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a map with one impossible feature.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-getting-lost-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a helpful talking street sign.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-getting-lost-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of taking a wrong turn.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-getting-lost-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with always knowing the fastest route.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-getting-lost-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to find a place: ask someone or use a map.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-getting-lost-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same route: shorter and busy, or longer and quiet.",
    "compatibleTopicIds": [
      "getting-lost"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-spending-rules-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what they prefer to repair instead of replace.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-spending-rules-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which convenience they would pay for.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-spending-rules-veteran-1",
    "roleId": "veteran",
    "text": "Share a purchase you used much more than expected.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-spending-rules-veteran-2",
    "roleId": "veteran",
    "text": "Share a time waiting helped you make a buying decision.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-spending-rules-bait-1",
    "roleId": "bait",
    "text": "Say, \"My wallet has asked for a day off.\"",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-spending-rules-bait-2",
    "roleId": "bait",
    "text": "Make a cash-register sound.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-spending-rules-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a shop where you pay with something other than money.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-spending-rules-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe one useful item you wish could repair itself.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-spending-rules-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about having fewer shopping choices.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-spending-rules-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with everything being half price.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-spending-rules-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same use for a small spare budget: food or entertainment.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-spending-rules-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same buying option: repair the old item or buy a new one.",
    "compatibleTopicIds": [
      "spending-rules"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-gifts-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what kind of gift is difficult to choose.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-gifts-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player whether they prefer a surprise gift or a request.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-gifts-veteran-1",
    "roleId": "veteran",
    "text": "Share a small gift you still remember.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-gifts-veteran-2",
    "roleId": "veteran",
    "text": "Share a time you made something for another person.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-gifts-bait-1",
    "roleId": "bait",
    "text": "Say, \"The wrapping paper is the main present.\"",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-gifts-bait-2",
    "roleId": "bait",
    "text": "Sing, \"This gift is too big for my bag.\"",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-gifts-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a gift that breaks one rule of nature.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-gifts-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a machine that wraps any gift.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-gifts-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about a very small gift budget.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-gifts-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with receiving a huge surprise gift.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-gifts-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same gift: a book or a meal.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-gifts-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same gift style: useful or funny.",
    "compatibleTopicIds": [
      "gifts"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-shopping-choices-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes an online review useful.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-shopping-choices-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which item they need to see before buying.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-shopping-choices-veteran-1",
    "roleId": "veteran",
    "text": "Share a time you changed your mind while shopping.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-shopping-choices-veteran-2",
    "roleId": "veteran",
    "text": "Share a choice that took longer than you expected.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-shopping-choices-bait-1",
    "roleId": "bait",
    "text": "Announce, \"Today only: one free shopping decision.\"",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-shopping-choices-bait-2",
    "roleId": "bait",
    "text": "Say, \"This basket is choosing things without me.\"",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-shopping-choices-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a shop assistant with one magic power.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-shopping-choices-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a button that makes shopping easier.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-shopping-choices-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a shop with only three choices.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-shopping-choices-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with reading a hundred perfect reviews.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-shopping-choices-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same shopping method: online or in a shop.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-shopping-choices-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same help: customer reviews or a friend.",
    "compatibleTopicIds": [
      "shopping-choices"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-small-luxuries-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which free comfort they enjoy.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-small-luxuries-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which small treat they would not give up.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-small-luxuries-veteran-1",
    "roleId": "veteran",
    "text": "Share a small thing that improved a difficult day.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-small-luxuries-veteran-2",
    "roleId": "veteran",
    "text": "Share a comfort you missed while away from home.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-small-luxuries-bait-1",
    "roleId": "bait",
    "text": "Say, \"This pillow deserves its own holiday.\"",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-small-luxuries-bait-2",
    "roleId": "bait",
    "text": "Give a small treat a royal spoken welcome.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-small-luxuries-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a tiny luxury made possible by magic.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-small-luxuries-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a room designed for your favorite comfort.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-small-luxuries-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about a day without your usual treat.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-small-luxuries-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with having your favorite comfort everywhere.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-small-luxuries-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same treat: a warm drink or a small dessert.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-small-luxuries-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same comfort: a soft chair or a quiet room.",
    "compatibleTopicIds": [
      "small-luxuries"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-home-space-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which room matters most to them.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-home-space-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they want near their home.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-home-space-veteran-1",
    "roleId": "veteran",
    "text": "Share a place that quickly felt like home.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-home-space-veteran-2",
    "roleId": "veteran",
    "text": "Share a small change that improved a room.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-home-space-bait-1",
    "roleId": "bait",
    "text": "Say, \"My sofa is interviewing new owners.\"",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-home-space-bait-2",
    "roleId": "bait",
    "text": "Make the sound of an imaginary doorbell.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-home-space-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe one impossible room you would add to a home.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-home-space-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a window with a view you can change.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-home-space-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a very small home.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-home-space-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with living in a huge house.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-home-space-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra room: a library or a games room.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-home-space-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same home location: near a park or near shops.",
    "compatibleTopicIds": [
      "home-space"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-home-habits-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which home noise bothers them.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-home-habits-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what a new housemate should know about them.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-home-habits-veteran-1",
    "roleId": "veteran",
    "text": "Share a home habit you learned from someone else.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-home-habits-veteran-2",
    "roleId": "veteran",
    "text": "Share a small surprise from sharing a space.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-home-habits-bait-1",
    "roleId": "bait",
    "text": "Apologize aloud to an imaginary fridge.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-home-habits-bait-2",
    "roleId": "bait",
    "text": "Say, \"The sofa has booked the living room.\"",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-home-habits-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a household rule made possible by magic.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-home-habits-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a robot that solves one shared-home problem.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-home-habits-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about a noisy home.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-home-habits-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a housemate who is always tidy.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-home-habits-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same shared meal time: early evening or late evening.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-home-habits-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same quiet-hour start: nine or eleven at night.",
    "compatibleTopicIds": [
      "home-habits"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-tidying-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which cleaning job they avoid.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-tidying-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which place gets messy fastest.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-tidying-veteran-1",
    "roleId": "veteran",
    "text": "Share something unexpected you found while cleaning.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-tidying-veteran-2",
    "roleId": "veteran",
    "text": "Share an organizing method you have tried.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-tidying-bait-1",
    "roleId": "bait",
    "text": "Announce, \"The dust has called a meeting.\"",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-tidying-bait-2",
    "roleId": "bait",
    "text": "Make a vacuum-cleaner sound.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-tidying-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a cleaning tool with one impossible feature.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-tidying-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine where lost socks go.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-tidying-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of leaving a small mess.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-tidying-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a room that cleans itself.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-tidying-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same first cleaning job: dishes or floors.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-tidying-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same cleaning style: a little daily or one big session.",
    "compatibleTopicIds": [
      "tidying"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-keepsakes-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes an object hard to throw away.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-keepsakes-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player whether they prefer keeping an object or its photo.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-keepsakes-veteran-1",
    "roleId": "veteran",
    "text": "Share the story of an ordinary item you kept.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-keepsakes-veteran-2",
    "roleId": "veteran",
    "text": "Share something interesting you found in an old box.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-keepsakes-bait-1",
    "roleId": "bait",
    "text": "Say, \"This old ticket is paying no rent.\"",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-keepsakes-bait-2",
    "roleId": "bait",
    "text": "Give an old object a spoken thank-you speech.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-keepsakes-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine one object could show you its memories.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-keepsakes-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a box that keeps memories without taking space.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-keepsakes-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of losing an unimportant old object.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-keepsakes-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with being able to keep everything forever.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-keepsakes-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same keepsake: a photo or a ticket.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-keepsakes-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same storage option: a box or a digital folder.",
    "compatibleTopicIds": [
      "keepsakes"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-cooking-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which kitchen job they dislike.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-cooking-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they make when they are tired.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-cooking-veteran-1",
    "roleId": "veteran",
    "text": "Share a small cooking mistake you remember.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-cooking-veteran-2",
    "roleId": "veteran",
    "text": "Share the first food you learned to make.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-cooking-bait-1",
    "roleId": "bait",
    "text": "Announce a weather report for a boiling pot.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-cooking-bait-2",
    "roleId": "bait",
    "text": "Say, \"The spoon has more experience than I do.\"",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-cooking-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a kitchen tool with a magic function.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-cooking-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a meal that cooks itself in a surprising way.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-cooking-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of cooking with only one pot.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-cooking-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with being an excellent cook.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-cooking-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same easy meal: pasta or fried rice.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-cooking-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same cooking method: oven or pan.",
    "compatibleTopicIds": [
      "cooking"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-comfort-food-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what they like eating after a long day.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-comfort-food-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which food reminds them of a place.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-comfort-food-veteran-1",
    "roleId": "veteran",
    "text": "Share a memory connected to a familiar meal.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-comfort-food-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a simple snack improved your day.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-comfort-food-bait-1",
    "roleId": "bait",
    "text": "Sing, \"My soup understands me.\"",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-comfort-food-bait-2",
    "roleId": "bait",
    "text": "Make a contented soup-slurping sound.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-comfort-food-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a food that changes with your mood.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-comfort-food-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a café designed around your favorite comfort food.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-comfort-food-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about running out of your usual snack.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-comfort-food-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with eating your favorite meal every day.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-comfort-food-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same evening snack: fruit or toast.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-comfort-food-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same comfort meal: soup or noodles.",
    "compatibleTopicIds": [
      "comfort-food"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-eating-out-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes them return to a restaurant.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-eating-out-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player how long they would wait for a table.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-eating-out-veteran-1",
    "roleId": "veteran",
    "text": "Share a memorable detail from a café or restaurant.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-eating-out-veteran-2",
    "roleId": "veteran",
    "text": "Share a meal you ordered without knowing what to expect.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-eating-out-bait-1",
    "roleId": "bait",
    "text": "Say, \"I would like a table for me and my appetite.\"",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-eating-out-bait-2",
    "roleId": "bait",
    "text": "Read one imaginary menu item like a news headline.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-eating-out-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a restaurant with an impossible view.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-eating-out-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a café where the tables have one magic feature.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-eating-out-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a very short menu.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-eating-out-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a restaurant that serves everything.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-eating-out-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same table: by a window or in a quiet corner.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-eating-out-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same ordering style: shared dishes or separate meals.",
    "compatibleTopicIds": [
      "eating-out"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-food-curiosity-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which food texture they avoid.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-food-curiosity-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what helps them try an unfamiliar dish.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-food-curiosity-veteran-1",
    "roleId": "veteran",
    "text": "Share a food that surprised you.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-food-curiosity-veteran-2",
    "roleId": "veteran",
    "text": "Share a food you learned to like.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-food-curiosity-bait-1",
    "roleId": "bait",
    "text": "Say, \"My taste buds have requested a map.\"",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-food-curiosity-bait-2",
    "roleId": "bait",
    "text": "Make a surprised sound as an imaginary chef.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-food-curiosity-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a new fruit with an impossible flavor.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-food-curiosity-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a food that changes color when it is ready.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-food-curiosity-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a food looking strange.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-food-curiosity-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with every food tasting delicious.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-food-curiosity-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same first taste: a tiny bite or a full spoon.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-food-curiosity-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same new-food style: sweet or salty.",
    "compatibleTopicIds": [
      "food-curiosity"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-mornings-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes them feel awake.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-mornings-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they prepare the night before.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-mornings-veteran-1",
    "roleId": "veteran",
    "text": "Share a morning that started in an unexpected way.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-mornings-veteran-2",
    "roleId": "veteran",
    "text": "Share a morning habit you changed.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-mornings-bait-1",
    "roleId": "bait",
    "text": "Make an alarm-clock sound.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-mornings-bait-2",
    "roleId": "bait",
    "text": "Say, \"My breakfast is more awake than I am.\"",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-mornings-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a magic alarm that would suit you.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-mornings-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine an extra room that appears only in the morning.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-mornings-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of oversleeping on a free day.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-mornings-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with waking up full of energy every day.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-mornings-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same breakfast drink: water or tea.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-mornings-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same first activity: breakfast or a shower.",
    "compatibleTopicIds": [
      "mornings"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-free-weekends-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player how many weekend plans feel like too many.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-free-weekends-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they enjoy doing without a clock.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-free-weekends-veteran-1",
    "roleId": "veteran",
    "text": "Share a good day that had no plan.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-free-weekends-veteran-2",
    "roleId": "veteran",
    "text": "Share a time you changed a weekend plan.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-free-weekends-bait-1",
    "roleId": "bait",
    "text": "Say, \"My calendar has gone out for a walk.\"",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-free-weekends-bait-2",
    "roleId": "bait",
    "text": "Announce the opening of an imaginary lazy-day festival.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-free-weekends-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a free day in a place that does not exist.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-free-weekends-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a button that pauses one weekend chore.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-free-weekends-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about a cancelled weekend plan.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-free-weekends-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with having every weekend completely free.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-free-weekends-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same afternoon plan: a walk or a film.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-free-weekends-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same weekend pace: one activity or several activities.",
    "compatibleTopicIds": [
      "free-weekends"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-waiting-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which kind of delay bothers them most.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-waiting-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they do while waiting without a phone.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-waiting-veteran-1",
    "roleId": "veteran",
    "text": "Share something you noticed during a wait.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-waiting-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a queue was worth joining.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-waiting-bait-1",
    "roleId": "bait",
    "text": "Count down from five to one aloud.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-waiting-bait-2",
    "roleId": "bait",
    "text": "Say, \"This queue is growing a personality.\"",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-waiting-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a waiting room with one magic feature.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-waiting-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a way to store unused waiting time.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-waiting-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a short delay.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-waiting-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with never needing to wait.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-waiting-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same waiting activity: reading or listening to music.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-waiting-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same arrival time: ten minutes early or exactly on time.",
    "compatibleTopicIds": [
      "waiting"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-bedtime-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes an evening feel restful.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-bedtime-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they leave ready for tomorrow.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-bedtime-veteran-1",
    "roleId": "veteran",
    "text": "Share an evening routine you used to have.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-bedtime-veteran-2",
    "roleId": "veteran",
    "text": "Share a small thing that helped you relax at night.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-bedtime-bait-1",
    "roleId": "bait",
    "text": "Make a short snoring sound.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-bedtime-bait-2",
    "roleId": "bait",
    "text": "Say, \"My pillow has sent me an invitation.\"",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-bedtime-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a lamp with a magic bedtime function.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-bedtime-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a room that prepares itself for sleep.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-bedtime-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of an evening without screens.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-bedtime-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a bed that is too comfortable.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-bedtime-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same evening activity: reading or music.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-bedtime-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same room sound: silence or rain sounds.",
    "compatibleTopicIds": [
      "bedtime"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-invitations-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player how much notice they like for an invitation.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-invitations-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes an invitation easy to accept.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-invitations-veteran-1",
    "roleId": "veteran",
    "text": "Share an invitation you were glad you accepted.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-invitations-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a small gathering surprised you.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-invitations-bait-1",
    "roleId": "bait",
    "text": "Say, \"My sofa declined the invitation for me.\"",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-invitations-bait-2",
    "roleId": "bait",
    "text": "Read an invitation to an imaginary snack party aloud.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-invitations-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a party in an impossible location.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-invitations-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine an invitation that delivers itself in a strange way.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-invitations-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one good thing about a last-minute cancellation.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-invitations-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with being invited to every event.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-invitations-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same gathering: dinner or a walk.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-invitations-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same invitation notice: a day or a week.",
    "compatibleTopicIds": [
      "invitations"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-meeting-people-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which first-conversation question they like.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-meeting-people-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what a host can do to help newcomers.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-meeting-people-veteran-1",
    "roleId": "veteran",
    "text": "Share how you started one friendly conversation.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-meeting-people-veteran-2",
    "roleId": "veteran",
    "text": "Share an activity that helped you meet someone.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-meeting-people-bait-1",
    "roleId": "bait",
    "text": "Introduce an imaginary chair as an honored guest.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-meeting-people-bait-2",
    "roleId": "bait",
    "text": "Say, \"My small talk is still downloading.\"",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-meeting-people-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a name tag with one magic feature.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-meeting-people-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a room designed to make introductions easier.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-meeting-people-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a quiet moment in a conversation.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-meeting-people-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with remembering every name perfectly.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-meeting-people-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same first meeting: a café or a park.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-meeting-people-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same icebreaker: a question or a small game.",
    "compatibleTopicIds": [
      "meeting-people"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-helping-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which task they prefer to do with someone.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-helping-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes asking for help easier.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-helping-veteran-1",
    "roleId": "veteran",
    "text": "Share a small helpful thing someone did for you.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-helping-veteran-2",
    "roleId": "veteran",
    "text": "Share a practical skill you have shown someone.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-helping-bait-1",
    "roleId": "bait",
    "text": "Say, \"My helpful advice comes with free imaginary batteries.\"",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-helping-bait-2",
    "roleId": "bait",
    "text": "Announce yourself as the assistant to an imaginary spoon.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-helping-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a tiny robot that helps with one everyday task.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-helping-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine an object that gives useful advice.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-helping-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of trying a small task without help.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-helping-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with receiving help before asking.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-helping-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same help for moving home: packing or carrying boxes.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-helping-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to learn a task: watch once or read steps.",
    "compatibleTopicIds": [
      "helping"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-group-decisions-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which group decision takes too long.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-group-decisions-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player when they let someone else choose.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-group-decisions-veteran-1",
    "roleId": "veteran",
    "text": "Share a small group decision that was easy.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-group-decisions-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a random choice worked out well.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-group-decisions-bait-1",
    "roleId": "bait",
    "text": "Say, \"The imaginary committee has ordered more snacks.\"",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-group-decisions-bait-2",
    "roleId": "bait",
    "text": "Announce a meeting for choosing the next imaginary meeting.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-group-decisions-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine a machine that helps groups make one small decision.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-group-decisions-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a magic coin with a surprising third result.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-group-decisions-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of having only two options.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-group-decisions-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with everyone always agreeing.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-group-decisions-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same decision method: a vote or a coin toss.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-group-decisions-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same group snack: popcorn or fruit.",
    "compatibleTopicIds": [
      "group-decisions"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-hobbies-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes a hobby worth keeping.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-hobbies-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which hobby they would like to try once.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-hobbies-veteran-1",
    "roleId": "veteran",
    "text": "Share a hobby you tried for a short time.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-hobbies-veteran-2",
    "roleId": "veteran",
    "text": "Share one small improvement you noticed in a hobby.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-hobbies-bait-1",
    "roleId": "bait",
    "text": "Say, \"My hobby has become my manager.\"",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-hobbies-bait-2",
    "roleId": "bait",
    "text": "Clap three times for an imaginary beginner.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-hobbies-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a hobby that needs a magic tool.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-hobbies-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a room made just for a strange new hobby.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-hobbies-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of being a beginner.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-hobbies-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with being instantly good at every hobby.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-hobbies-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same hobby session: drawing or cooking.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-hobbies-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same way to try a hobby: alone or in a class.",
    "compatibleTopicIds": [
      "hobbies"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-music-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player when they prefer silence to music.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-music-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player how they find new music.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-music-veteran-1",
    "roleId": "veteran",
    "text": "Share a place that a song reminds you of.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-music-veteran-2",
    "roleId": "veteran",
    "text": "Share a time music changed an ordinary task.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-music-bait-1",
    "roleId": "bait",
    "text": "Hum a short tune without words.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-music-bait-2",
    "roleId": "bait",
    "text": "Say, \"My playlist is choosing my mood today.\"",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-music-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe an instrument with an impossible sound.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-music-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a song you could hear only in one special place.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-music-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of forgetting a song title.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-music-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with always hearing your favorite song.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-music-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same background music: piano or guitar.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-music-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same listening place: a room or a walk.",
    "compatibleTopicIds": [
      "music"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-stories-on-screen-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes them stop watching a series.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-stories-on-screen-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes a film worth watching again.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-stories-on-screen-veteran-1",
    "roleId": "veteran",
    "text": "Share a time a film was different from your expectations.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-stories-on-screen-veteran-2",
    "roleId": "veteran",
    "text": "Share a place where watching a story felt special.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-stories-on-screen-bait-1",
    "roleId": "bait",
    "text": "Give a movie-trailer announcement for an imaginary sandwich.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-stories-on-screen-bait-2",
    "roleId": "bait",
    "text": "Say, \"The sofa should be listed in the film credits.\"",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-stories-on-screen-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a cinema with one impossible feature.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-stories-on-screen-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a short visit to a fictional place.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-stories-on-screen-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of knowing a story ending early.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-stories-on-screen-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a series that never ends.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-stories-on-screen-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same viewing length: a short episode or a full film.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-stories-on-screen-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same story type: comedy or adventure.",
    "compatibleTopicIds": [
      "stories-on-screen"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-games-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player how much luck they want in a game.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-games-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes them want to play again.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-games-veteran-1",
    "roleId": "veteran",
    "text": "Share a funny mistake from a game.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-games-veteran-2",
    "roleId": "veteran",
    "text": "Share a game you enjoyed learning.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-games-bait-1",
    "roleId": "bait",
    "text": "Make a sound for an imaginary game victory.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-games-bait-2",
    "roleId": "bait",
    "text": "Say, \"My lucky dice are on holiday.\"",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-games-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a game you could play in zero gravity.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-games-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a game piece with one magic ability.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-games-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of losing an easy game.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-games-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with winning every game.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-games-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same game style: teamwork or competition.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-games-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same game length: ten minutes or one hour.",
    "compatibleTopicIds": [
      "games"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-phones-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which phone notification they would remove.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-phones-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which task they prefer doing without a phone.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-phones-veteran-1",
    "roleId": "veteran",
    "text": "Share a time a phone feature saved you trouble.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-phones-veteran-2",
    "roleId": "veteran",
    "text": "Share an app you stopped using.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-phones-bait-1",
    "roleId": "bait",
    "text": "Say, \"My phone wants to check its own phone.\"",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-phones-bait-2",
    "roleId": "bait",
    "text": "Make a phone notification sound.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-phones-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe one impossible phone function.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-phones-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine an app that helps with a tiny daily problem.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-phones-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of forgetting your phone for an afternoon.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-phones-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a battery that never runs out.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-phones-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same message type: text or voice.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-phones-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same navigation tool: a phone map or paper map.",
    "compatibleTopicIds": [
      "phones"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-weather-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what they enjoy on a rainy day.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-weather-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which weather they prefer for walking.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-weather-veteran-1",
    "roleId": "veteran",
    "text": "Share a time weather changed a simple plan.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-weather-veteran-2",
    "roleId": "veteran",
    "text": "Share a weather sound you remember.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-weather-bait-1",
    "roleId": "bait",
    "text": "Give a weather forecast for an imaginary kitchen.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-weather-bait-2",
    "roleId": "bait",
    "text": "Make a wind sound.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-weather-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a cloud with a useful magic function.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-weather-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a tiny weather system you could keep in a room.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-weather-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a rainy weekend.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-weather-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with perfect sunshine every day.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-weather-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same walking weather: cool and cloudy or warm and sunny.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-weather-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same rainy-day plan: reading or cooking.",
    "compatibleTopicIds": [
      "weather"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-clothes-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player how much pockets matter to them.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-clothes-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which clothing item is hard to find.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-clothes-veteran-1",
    "roleId": "veteran",
    "text": "Share a clothing item you used more than expected.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-clothes-veteran-2",
    "roleId": "veteran",
    "text": "Share a time you dressed differently from usual.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-clothes-bait-1",
    "roleId": "bait",
    "text": "Say, \"My jacket has asked for a promotion.\"",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-clothes-bait-2",
    "roleId": "bait",
    "text": "Give an imaginary pair of socks a spoken award.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-clothes-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe clothes with one impossible pocket.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-clothes-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine shoes that solve a small daily problem.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-clothes-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of owning fewer clothes.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-clothes-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with clothes that change color by themselves.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-clothes-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra layer: a hoodie or a jacket.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-clothes-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same useful feature: more pockets or lighter fabric.",
    "compatibleTopicIds": [
      "clothes"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-animals-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which animal they enjoy watching.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-animals-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which animal habit surprises them.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-animals-veteran-1",
    "roleId": "veteran",
    "text": "Share an interesting animal behavior you saw.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-animals-veteran-2",
    "roleId": "veteran",
    "text": "Share a place where you noticed an unexpected animal.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-animals-bait-1",
    "roleId": "bait",
    "text": "Make an animal sound.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-animals-bait-2",
    "roleId": "bait",
    "text": "Say, \"The neighborhood cat has appointed itself mayor.\"",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-animals-dreamer-1",
    "roleId": "dreamer",
    "text": "Imagine an animal could give you one useful service.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-animals-dreamer-2",
    "roleId": "dreamer",
    "text": "Describe a park designed by an animal.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-animals-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of an animal ignoring you.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-animals-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with understanding every animal sound.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-animals-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same animal to watch: birds or fish.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-animals-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same animal visit: a farm or a nature park.",
    "compatibleTopicIds": [
      "animals"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-learning-skills-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which practical skill they would like to learn.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-learning-skills-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes instructions easy to follow.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-learning-skills-veteran-1",
    "roleId": "veteran",
    "text": "Share a small skill you learned by trying.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-learning-skills-veteran-2",
    "roleId": "veteran",
    "text": "Share a useful tip someone taught you.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-learning-skills-bait-1",
    "roleId": "bait",
    "text": "Say, \"My instruction book needs instructions.\"",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-learning-skills-bait-2",
    "roleId": "bait",
    "text": "Spell the word \"practice\" aloud.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-learning-skills-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a magic practice tool.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-learning-skills-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a class for an impossible skill.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-learning-skills-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of learning slowly.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-learning-skills-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with learning every skill instantly.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-learning-skills-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same lesson format: a video or a live class.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-learning-skills-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same first skill: cooking or drawing.",
    "compatibleTopicIds": [
      "learning-skills"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-first-days-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what they want to know on a first day.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-first-days-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes a welcome guide useful.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-first-days-veteran-1",
    "roleId": "veteran",
    "text": "Share a small surprise from a first day.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-first-days-veteran-2",
    "roleId": "veteran",
    "text": "Share something that helped you settle into a new place.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-first-days-bait-1",
    "roleId": "bait",
    "text": "Announce, \"Welcome to the department of lost beginners.\"",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-first-days-bait-2",
    "roleId": "bait",
    "text": "Say, \"My name tag knows more people than I do.\"",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-first-days-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a welcome guide that can do one magic thing.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-first-days-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a building that helps new visitors find their rooms.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-first-days-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of not knowing anyone on a first day.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-first-days-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with receiving a perfect hundred-page welcome guide.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-first-days-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same first-day help: a map or a guide.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-first-days-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same introduction: a small group or one person.",
    "compatibleTopicIds": [
      "first-days"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-small-mistakes-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which small mistake they often repeat.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-small-mistakes-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what helps them try again after an error.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-small-mistakes-veteran-1",
    "roleId": "veteran",
    "text": "Share a harmless mistake that taught you something.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-small-mistakes-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a small mistake had a funny result.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-small-mistakes-bait-1",
    "roleId": "bait",
    "text": "Say, \"That was a free practice mistake.\"",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-small-mistakes-bait-2",
    "roleId": "bait",
    "text": "Make an error-message sound with your voice.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-small-mistakes-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe an undo button for one everyday activity.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-small-mistakes-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a helpful object that notices one kind of mistake.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-small-mistakes-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of making a small mistake.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-small-mistakes-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with never making a mistake.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-small-mistakes-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same help after a mistake: written steps or a demonstration.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-small-mistakes-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same retry style: immediately or after a short break.",
    "compatibleTopicIds": [
      "small-mistakes"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-working-together-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which part of a shared task they enjoy.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-working-together-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player how they prefer to divide a simple job.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-working-together-veteran-1",
    "roleId": "veteran",
    "text": "Share a small task that was easier with someone else.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-working-together-veteran-2",
    "roleId": "veteran",
    "text": "Share a time two different skills worked well together.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-working-together-bait-1",
    "roleId": "bait",
    "text": "Say, \"I am the assistant manager of this imaginary pencil.\"",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-working-together-bait-2",
    "roleId": "bait",
    "text": "Read a one-line progress report for making imaginary toast.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-working-together-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a tool that helps two people work together.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-working-together-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a tiny helper for one boring part of a shared task.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-working-together-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of working at different speeds.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-working-together-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a partner who can do everything.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-working-together-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same shared job: cooking or gardening.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-working-together-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same working style: quiet or with music.",
    "compatibleTopicIds": [
      "working-together"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-neighborhoods-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which local place they would miss.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-neighborhoods-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they would add near home.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-neighborhoods-veteran-1",
    "roleId": "veteran",
    "text": "Share a local place you discovered by chance.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-neighborhoods-veteran-2",
    "roleId": "veteran",
    "text": "Share a small change you noticed in a neighborhood.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-neighborhoods-bait-1",
    "roleId": "bait",
    "text": "Give an imaginary bakery a royal title.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-neighborhoods-bait-2",
    "roleId": "bait",
    "text": "Say, \"The street corner is accepting visitors today.\"",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-neighborhoods-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a tiny magic shop for your neighborhood.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-neighborhoods-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a park that changes in a useful way at night.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-neighborhoods-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a quiet neighborhood with few shops.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-neighborhoods-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with having every useful shop next door.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-neighborhoods-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same new local place: a library or a café.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-neighborhoods-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same street feature: more trees or wider paths.",
    "compatibleTopicIds": [
      "neighborhoods"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-nature-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which natural sound they enjoy.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-nature-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes an outdoor place comfortable.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-nature-veteran-1",
    "roleId": "veteran",
    "text": "Share a small thing you noticed outdoors.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-nature-veteran-2",
    "roleId": "veteran",
    "text": "Share an outdoor place you would return to.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-nature-bait-1",
    "roleId": "bait",
    "text": "Make a gentle rain sound.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-nature-bait-2",
    "roleId": "bait",
    "text": "Say, \"That tree has a better view than I do.\"",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-nature-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a plant with a harmless magic feature.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-nature-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a path that leads somewhere impossible.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-nature-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of taking a very short walk.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-nature-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a garden that grows overnight.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-nature-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same walk: by water or through trees.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-nature-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same outdoor seat: a bench or a blanket.",
    "compatibleTopicIds": [
      "nature"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-crowds-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which busy place they enjoy.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-crowds-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player how they find a quiet moment at an event.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-crowds-veteran-1",
    "roleId": "veteran",
    "text": "Share a busy place that felt welcoming.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-crowds-veteran-2",
    "roleId": "veteran",
    "text": "Share a useful trick from visiting a crowded place.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-crowds-bait-1",
    "roleId": "bait",
    "text": "Make an imaginary crowd cheer with your voice.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-crowds-bait-2",
    "roleId": "bait",
    "text": "Say, \"My personal space has gone looking for more space.\"",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-crowds-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a magic feature for a crowded station.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-crowds-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a tiny quiet room you could carry to an event.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-crowds-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a busy market.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-crowds-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with being the only visitor at a huge event.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-crowds-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same arrival time for an event: early or late.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-crowds-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same meeting point: the entrance or a café.",
    "compatibleTopicIds": [
      "crowds"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-quiet-places-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes a quiet place comfortable.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-quiet-places-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which gentle sound they welcome.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-quiet-places-veteran-1",
    "roleId": "veteran",
    "text": "Share a peaceful corner you discovered.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-quiet-places-veteran-2",
    "roleId": "veteran",
    "text": "Share a small change that made a space calmer.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-quiet-places-bait-1",
    "roleId": "bait",
    "text": "Whisper, \"The quiet corner has a loud opinion.\"",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-quiet-places-bait-2",
    "roleId": "bait",
    "text": "Give an imaginary library announcement about sleepy books.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-quiet-places-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a portable peaceful place.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-quiet-places-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a window that shows your favorite quiet view.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-quiet-places-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of a little background noise.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-quiet-places-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a completely silent room.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-quiet-places-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same quiet place: a library or a garden.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-quiet-places-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same gentle sound: rain or birds.",
    "compatibleTopicIds": [
      "quiet-places"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-childhood-interests-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which old hobby they would try again.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-childhood-interests-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which taste has changed over time.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-childhood-interests-veteran-1",
    "roleId": "veteran",
    "text": "Share a simple game you enjoyed when younger.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-childhood-interests-veteran-2",
    "roleId": "veteran",
    "text": "Share an old interest you still enjoy.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-childhood-interests-bait-1",
    "roleId": "bait",
    "text": "Say, \"My younger self has requested more playtime.\"",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-childhood-interests-bait-2",
    "roleId": "bait",
    "text": "Make a sound from an imaginary old toy.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-childhood-interests-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a toy your younger self would find magical.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-childhood-interests-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a playground with one impossible feature.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-childhood-interests-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of outgrowing an old hobby.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-childhood-interests-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with getting every toy you wanted.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-childhood-interests-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same old game style: building things or chasing games.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-childhood-interests-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same activity to revisit: drawing or puzzles.",
    "compatibleTopicIds": [
      "childhood-interests"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-trying-new-things-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player what makes a first attempt easier.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-trying-new-things-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what new activity they would try for ten minutes.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-trying-new-things-veteran-1",
    "roleId": "veteran",
    "text": "Share a low-risk new thing you tried.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-trying-new-things-veteran-2",
    "roleId": "veteran",
    "text": "Share a time a friend helped you try something.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-trying-new-things-bait-1",
    "roleId": "bait",
    "text": "Say, \"My comfort zone needs a bigger sofa.\"",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-trying-new-things-bait-2",
    "roleId": "bait",
    "text": "Announce a trial run for an imaginary new hobby.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-trying-new-things-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a safe way to try an impossible activity.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-trying-new-things-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a room where beginners can test anything harmless.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-trying-new-things-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one benefit of staying with a familiar choice.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-trying-new-things-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one problem with a new activity being too easy.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-trying-new-things-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same trial activity: pottery or dancing.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-trying-new-things-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same first step: watch a lesson or try for ten minutes.",
    "compatibleTopicIds": [
      "trying-new-things"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-useful-advice-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which practical tip saves them time.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-useful-advice-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what makes advice easy to remember.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-useful-advice-veteran-1",
    "roleId": "veteran",
    "text": "Share a practical tip you have actually used.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-useful-advice-veteran-2",
    "roleId": "veteran",
    "text": "Share something useful you learned by watching someone.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-useful-advice-bait-1",
    "roleId": "bait",
    "text": "Say, \"This advice comes with imaginary free delivery.\"",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-useful-advice-bait-2",
    "roleId": "bait",
    "text": "Read a practical tip in a robot voice.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-useful-advice-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe an object that offers one useful piece of advice.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-useful-advice-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a notebook that teaches a small everyday skill.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-useful-advice-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with following every piece of advice.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-useful-advice-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of a tip not working for everyone.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-useful-advice-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same advice format: a short list or a demonstration.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-useful-advice-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same reminder: a paper note or a phone alert.",
    "compatibleTopicIds": [
      "useful-advice"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-future-routines-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which everyday task should become easier.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-future-routines-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which old tool will stay useful.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-future-routines-veteran-1",
    "roleId": "veteran",
    "text": "Share a routine that has already changed for you.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-future-routines-veteran-2",
    "roleId": "veteran",
    "text": "Share an old tool you still find useful.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-future-routines-bait-1",
    "roleId": "bait",
    "text": "Announce tomorrow as if reporting from the distant future.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-future-routines-bait-2",
    "roleId": "bait",
    "text": "Say, \"My future fridge has joined a book club.\"",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-future-routines-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe one useful feature of a future home.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-future-routines-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a new everyday job that does not exist yet.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-future-routines-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with every daily task being automatic.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-future-routines-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of keeping a slow old tool.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-future-routines-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same future helper: a cooking robot or a cleaning robot.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-future-routines-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same thing to keep: paper books or ordinary bicycles.",
    "compatibleTopicIds": [
      "future-routines"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-daily-superpowers-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which daily problem they would solve with a small power.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-daily-superpowers-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what limit they would accept on a power.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-daily-superpowers-veteran-1",
    "roleId": "veteran",
    "text": "Share a small daily problem that takes more time than expected.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-daily-superpowers-veteran-2",
    "roleId": "veteran",
    "text": "Share a useful shortcut you have discovered.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-daily-superpowers-bait-1",
    "roleId": "bait",
    "text": "Say, \"My superpower is finding the wrong key.\"",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-daily-superpowers-bait-2",
    "roleId": "bait",
    "text": "Make a sound for an imaginary tiny magic spell.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-daily-superpowers-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a superpower that only helps in the kitchen.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-daily-superpowers-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a small power that works only while waiting.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-daily-superpowers-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with finding every lost item instantly.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-daily-superpowers-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of a superpower working only once a day.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-daily-superpowers-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same small power: finding keys or drying wet shoes.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-daily-superpowers-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same power limit: once a day or only at home.",
    "compatibleTopicIds": [
      "daily-superpowers"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-talking-objects-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which object they would ask for advice.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-talking-objects-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which object would tell the best stories.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-talking-objects-veteran-1",
    "roleId": "veteran",
    "text": "Share an ordinary object that has been useful for years.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-talking-objects-veteran-2",
    "roleId": "veteran",
    "text": "Share a small problem you have had with an everyday object.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-talking-objects-bait-1",
    "roleId": "bait",
    "text": "Apologize aloud to an imaginary chair.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-talking-objects-bait-2",
    "roleId": "bait",
    "text": "Say, \"My keys say they were never lost.\"",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-talking-objects-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe the voice of a talking kitchen object.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-talking-objects-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a question a talking window would ask you.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-talking-objects-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with a phone that can complain.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-talking-objects-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of a talking object being very forgetful.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-talking-objects-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same talking object: a fridge or a sofa.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-talking-objects-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same object voice: calm or cheerful.",
    "compatibleTopicIds": [
      "talking-objects"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-extra-hour-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player where they would put an extra hour in the day.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-extra-hour-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player what they would avoid doing in the extra hour.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-extra-hour-veteran-1",
    "roleId": "veteran",
    "text": "Share something enjoyable you did in a spare hour.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-extra-hour-veteran-2",
    "roleId": "veteran",
    "text": "Share a small activity you wish you had more time for.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-extra-hour-bait-1",
    "roleId": "bait",
    "text": "Say, \"My extra hour has arrived late.\"",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-extra-hour-bait-2",
    "roleId": "bait",
    "text": "Count down from five as if starting an imaginary free hour.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-extra-hour-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a place where unused hours are stored.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-extra-hour-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine a clock that protects one hour for you.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-extra-hour-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with getting an extra hour at midnight.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-extra-hour-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of the extra hour having no internet.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-extra-hour-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra-hour activity: resting or learning.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-extra-hour-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same extra-hour time: morning or evening.",
    "compatibleTopicIds": [
      "extra-hour"
    ],
    "mechanicKey": "judge:2"
  },
  {
    "id": "v3-new-holiday-reporter-1",
    "roleId": "reporter",
    "text": "Ask a player which ordinary thing deserves a holiday.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "reporter:1"
  },
  {
    "id": "v3-new-holiday-reporter-2",
    "roleId": "reporter",
    "text": "Ask a player which holiday tradition should be optional.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "reporter:2"
  },
  {
    "id": "v3-new-holiday-veteran-1",
    "roleId": "veteran",
    "text": "Share a small celebration you enjoyed.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "veteran:1"
  },
  {
    "id": "v3-new-holiday-veteran-2",
    "roleId": "veteran",
    "text": "Share a simple tradition that made a day different.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "veteran:2"
  },
  {
    "id": "v3-new-holiday-bait-1",
    "roleId": "bait",
    "text": "Sing, \"Happy day for ordinary spoons.\"",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "bait:1"
  },
  {
    "id": "v3-new-holiday-bait-2",
    "roleId": "bait",
    "text": "Announce the opening of an imaginary pillow holiday.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "bait:2"
  },
  {
    "id": "v3-new-holiday-dreamer-1",
    "roleId": "dreamer",
    "text": "Describe a holiday that happens in the sky.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "dreamer:1"
  },
  {
    "id": "v3-new-holiday-dreamer-2",
    "roleId": "dreamer",
    "text": "Imagine one impossible decoration for a new holiday.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "dreamer:2"
  },
  {
    "id": "v3-new-holiday-contrarian-1",
    "roleId": "contrarian",
    "text": "Name one problem with a holiday every week.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "contrarian:1"
  },
  {
    "id": "v3-new-holiday-contrarian-2",
    "roleId": "contrarian",
    "text": "Name one benefit of a holiday with no presents.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "contrarian:2"
  },
  {
    "id": "v3-new-holiday-judge-1",
    "roleId": "judge",
    "text": "Get two other players to choose the same holiday treat: cake or fruit.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "judge:1"
  },
  {
    "id": "v3-new-holiday-judge-2",
    "roleId": "judge",
    "text": "Get two other players to choose the same holiday style: quiet or lively.",
    "compatibleTopicIds": [
      "new-holiday"
    ],
    "mechanicKey": "judge:2"
  }
];
  const exclusionClues = {
  "singing": "No wolf task requires singing words.",
  "clapping": "No wolf task requires clapping.",
  "tapping": "No wolf task requires tapping a surface.",
  "sound_effect": "No wolf task requires making a sound effect.",
  "humming": "No wolf task requires humming.",
  "robot_voice": "No wolf task requires a robot voice.",
  "whispering": "No wolf task requires whispering.",
  "stretched_word": "No wolf task requires stretching a word.",
  "slow_speech": "No wolf task requires pauses between every word.",
  "echoing": "No wolf task requires repeating the end of another player's sentence.",
  "word_repetition": "No wolf task requires repeating the same noun in a row.",
  "one_word_answer": "No wolf task requires an answer of exactly one word.",
  "rhyme": "No wolf task requires rhyming words.",
  "alliteration": "No wolf task requires words starting with the same letter.",
  "spelling": "No wolf task requires spelling a word aloud.",
  "question_answer": "No wolf task requires getting or giving a question as an answer.",
  "countdown": "No wolf task requires a spoken countdown.",
  "news_headline": "No wolf task requires a news headline.",
  "weather_report": "No wolf task requires a weather-report style.",
  "sales_pitch": "No wolf task requires a sales pitch.",
  "object_voice": "No wolf task requires speaking as an object.",
  "announcement": "No wolf task requires a station-style announcement.",
  "object_apology": "No wolf task requires apologizing to an object.",
  "number_rating": "No wolf task requires a rating with a decimal.",
  "metaphor": "No wolf task requires describing an object as a boss.",
  "invented_rule": "No wolf task requires inventing a rule or a penalty.",
  "award": "No wolf task requires inventing an award.",
  "poem": "No wolf task requires a poem.",
  "slogan": "No wolf task requires an advertising slogan.",
  "coined_word": "No wolf task requires inventing a word or a dish name.",
  "nickname": "No wolf task requires inventing a nickname or a group name.",
  "comparison": "No wolf task requires a comparison to an animal.",
  "imaginary_price": "No wolf task requires a price in imaginary currency.",
  "ranked_list": "No wolf task requires ranking choices.",
  "backwards_choice": "No wolf task requires a good point about an option the speaker would not choose.",
  "warning_sign": "No wolf task requires inventing a warning sign.",
  "prediction": "No wolf task requires making or inviting a prediction.",
  "future_memory": "No wolf task requires an imaginary memory from the future.",
  "movie_title": "No wolf task requires inventing a movie title.",
  "address_title": "No wolf task requires addressing someone by a title.",
  "description_game": "No wolf task requires describing an object without naming it.",
  "sentence_completion": "No wolf task requires another player to finish a sentence.",
  "recommendation": "No wolf task requires another player to recommend or choose something for a wolf.",
  "veto": "No wolf task requires another player to remove an option.",
  "quotation": "No wolf task requires another player to quote a whole sentence."
};
  return { version: 'free-chat-en-v3-20260930', topics, wolfTasks, villageTasks, exclusionClues };
});
