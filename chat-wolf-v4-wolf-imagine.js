/* Authored topic-specific cards. Sentences are stored complete, not assembled
 * from interchangeable nouns. Shared variant groups deliberately acknowledge
 * repeated play mechanics; this file does not claim 240 different mechanics. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CHAT_WOLF_V4_WOLF_IMAGINE=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Each topic has four interaction cards followed by six self-action cards.
  const authored = {
    '01':[
      ['set_a_specific_limit','Get a non-wolf to tell you the latest time they would wait for a late travel companion.','讓一位非狼玩家，說出旅行同伴遲到時他最多願意等多久。'],
      ['practical_suggestion','Get a non-wolf to suggest what you could do while everyone else visits a museum you dislike.','讓一位非狼玩家，建議其他人逛你沒興趣的博物館時你可以做什麼。'],
      ['compose_short_reply','Get a non-wolf to suggest how you could tell the group you need an afternoon alone.','讓一位非狼玩家，幫你想一句告訴旅伴自己下午想獨處的話。'],
      ['recommend_one_item','Get a non-wolf to recommend one snack for a long bus ride.','讓一位非狼玩家，推薦一樣適合長途巴士的零食。'],
      ['object_has_social_needs','Say “My suitcase is the only one ready for this trip.”','說出「My suitcase is the only one ready for this trip.」。'],
      ['speak_to_object','Tell your imaginary hotel bed that you missed it during the day.','對想像中的飯店床說，你白天很想念它。'],
      ['quote_absurd_price','Offer to pay one thousand dollars for five extra minutes of hotel breakfast.','表示願意付一千元，只為多吃五分鐘飯店早餐。'],
      ['compare_unlike_things','Compare a packed travel schedule to a washing machine.','把排得很滿的旅行行程比喻成洗衣機。'],
      ['absurd_preference','Say you would rather visit the hotel lift than the famous local museum.','表示比起當地著名博物館，你更想參觀飯店電梯。'],
      ['absurd_number','Say you need twelve alarms to catch one morning flight.','表示搭一班早班飛機需要設十二個鬧鐘。']
    ],
    '02':[
      ['set_a_specific_limit','Get a non-wolf to say how late they would allow a washing machine to run in the shared home.','讓一位非狼玩家，說出合租處洗衣機最晚可以運轉到幾點。'],
      ['compose_short_reply','Get a non-wolf to suggest a message asking a housemate to return your missing mug.','讓一位非狼玩家，幫你想一句請室友歸還不見杯子的訊息。'],
      ['recommend_one_item','Get a non-wolf to recommend one food everyone could keep in the shared freezer.','讓一位非狼玩家，推薦一樣大家可以常備在共用冷凍庫的食物。'],
      ['practical_suggestion','Get a non-wolf to suggest where you could dry clothes on a rainy day in the shared home.','讓一位非狼玩家，建議合租處下雨天可以在哪裡晾衣服。'],
      ['object_has_social_needs','Say “The fridge knows more about us than our friends do.”','說出「The fridge knows more about us than our friends do.」。'],
      ['speak_to_object','Apologize to an imaginary kitchen sponge for giving it so much work.','向想像中的廚房海綿道歉，因為讓它做了太多工作。'],
      ['quote_absurd_price','Offer to pay the housemates with one hundred invisible coins for washing a pan.','表示願意付室友一百枚看不見的硬幣，請他們洗一個鍋子。'],
      ['compare_unlike_things','Compare a pile of laundry to a mountain waiting to be climbed.','把一堆待洗衣服比喻成等人攀爬的山。'],
      ['absurd_proposal','Suggest giving every dirty plate its own chair at the dining table.','提議讓每個髒盤子各坐一張餐桌椅。'],
      ['absurd_number','Say one sock needs more cupboard space than all your other clothes.','表示一隻襪子需要的衣櫃空間，比你其他所有衣服還大。']
    ],
    '03':[
      ['choose_one_of_two','Get a non-wolf to choose a podcast or complete silence for the last hour of the car ride.','讓一位非狼玩家，替車程最後一小時選擇聽節目或完全安靜。'],
      ['set_a_specific_limit','Get a non-wolf to tell you how many times they could hear the same song in the car.','讓一位非狼玩家，說出在車上最多能忍受同一首歌播幾次。'],
      ['practical_suggestion','Get a non-wolf to suggest a way to share the car music when nobody likes the same songs.','讓一位非狼玩家，建議大家喜歡的歌都不同時如何分享車上音樂。'],
      ['compose_short_reply','Get a non-wolf to suggest a polite request to turn the car music down.','讓一位非狼玩家，幫你想一句禮貌請人調低車上音樂的話。'],
      ['sing_short_phrase','Sing “The traffic has joined our holiday.”','唱出「The traffic has joined our holiday.」。'],
      ['object_has_social_needs','Say “Even the car needs a quiet minute.”','說出「Even the car needs a quiet minute.」。'],
      ['absurd_proposal','Suggest stopping the car so everyone can listen carefully to a single bird.','提議停車，讓大家專心聽一隻鳥的聲音。'],
      ['compare_unlike_things','Compare the shared music list to a plate of mixed leftovers.','把大家共用的歌單比喻成一盤混在一起的剩菜。'],
      ['speak_to_object','Thank an imaginary seat belt for staying with you through every song.','感謝想像中的安全帶，陪你聽完每一首歌。'],
      ['absurd_number','Say you packed forty snacks for the four-hour car ride.','表示你為四小時車程準備了四十份零食。']
    ],
    '04':[
      ['choose_one_of_two','Get a non-wolf to choose a hammock or a floor cushion as your cabin resting place.','讓一位非狼玩家，替你選吊床或地板坐墊當小屋休息位置。'],
      ['recommend_one_item','Get a non-wolf to recommend one thing to bring to the cabin purely for comfort.','讓一位非狼玩家，推薦一樣純粹為了舒服而帶去小屋的東西。'],
      ['set_a_specific_limit','Get a non-wolf to say how long they would happily do nothing on the cabin weekend.','讓一位非狼玩家，說出小屋週末可以開心什麼都不做多久。'],
      ['compose_short_reply','Get a non-wolf to suggest what you could say when a friend tries to plan every hour of the cabin weekend.','讓一位非狼玩家，建議朋友想排滿小屋週末每個小時時你可以怎麼回。'],
      ['object_has_social_needs','Say “The sofa has already made plans for me.”','說出「The sofa has already made plans for me.」。'],
      ['promise_to_object','Promise an imaginary blanket that you will not leave it alone all weekend.','向想像中的毯子保證，整個週末不會丟下它獨自待著。'],
      ['quote_absurd_price','Offer to pay ten imaginary coins for each minute nobody asks you to make a plan.','表示每一分鐘沒人叫你安排活動，你願意付十枚想像硬幣。'],
      ['compare_unlike_things','Compare your relaxing weekend to a phone in airplane mode.','把你的放鬆週末比喻成開了飛航模式的手機。'],
      ['absurd_proposal','Suggest putting a pillow at the head of the table as the most important guest.','提議把枕頭放在餐桌主位，當作最重要的客人。'],
      ['absurd_number','Say your only weekend plan has seventeen scheduled naps.','表示你唯一的週末計畫是排定十七次午睡。']
    ],
    '05':[
      ['choose_one_of_two','Get a non-wolf to choose a silent keyboard or a quiet kettle for the shared work space.','讓一位非狼玩家，替共用工作空間選安靜鍵盤或安靜熱水壺。'],
      ['practical_suggestion','Get a non-wolf to suggest how you could show that you cannot talk right now without interrupting anyone.','讓一位非狼玩家，建議你如何不打斷大家就表示自己現在不方便聊天。'],
      ['set_a_specific_limit','Get a non-wolf to say how long a desk-side chat can last before it becomes a distraction.','讓一位非狼玩家，說出桌邊聊天多久之後會開始讓人分心。'],
      ['compose_short_reply','Get a non-wolf to suggest a reply to someone who keeps reading your unfinished work aloud.','讓一位非狼玩家，幫你想一句回覆不停朗讀你未完成作品的人的話。'],
      ['object_has_social_needs','Say “My chair is doing most of the work today.”','說出「My chair is doing most of the work today.」。'],
      ['speak_to_object','Ask an imaginary desk lamp to keep your unfinished ideas secret.','請想像中的檯燈替你保密還沒完成的點子。'],
      ['quote_absurd_price','Offer to trade a whole bag of biscuits for five minutes without keyboard noise.','表示願意用一整袋餅乾，換五分鐘沒有鍵盤聲。'],
      ['compare_unlike_things','Compare a crowded shared desk to a tiny airport.','把擁擠的共用桌面比喻成一座小機場。'],
      ['absurd_proposal','Suggest booking a meeting with your own unfinished sentence.','提議和自己還沒寫完的一句話預約開會。'],
      ['absurd_number','Say you need seven empty notebooks before you can write one idea.','表示你需要先有七本空白筆記本，才能寫下一個點子。']
    ],
    '06':[
      ['recommend_one_item','Get a non-wolf to recommend one thing already saved on a phone that could entertain the group without internet.','讓一位非狼玩家，推薦一項手機裡已存好、沒網路也能和大家分享的內容。'],
      ['compose_short_reply','Get a non-wolf to suggest a message you could send after the signal returns to explain your long silence.','讓一位非狼玩家，幫你想一句恢復訊號後解釋自己很久沒回覆的訊息。'],
      ['practical_suggestion','Get a non-wolf to suggest how the group could settle a small factual disagreement without searching online.','讓一位非狼玩家，建議大家不能上網查時如何處理一個小知識爭議。'],
      ['set_a_specific_limit','Get a non-wolf to say how long they would wait for a connection before putting their phone away.','讓一位非狼玩家，說出沒訊號時願意等多久才收起手機。'],
      ['object_has_social_needs','Say “My phone has become a very expensive mirror.”','說出「My phone has become a very expensive mirror.」。'],
      ['speak_to_object','Congratulate an imaginary phone on its first day off.','祝賀想像中的手機終於放了第一天假。'],
      ['quote_absurd_price','Offer ten imaginary coins for a single bar of signal.','表示願意用十枚想像硬幣換一格訊號。'],
      ['compare_unlike_things','Compare checking a phone without signal to opening an empty fridge.','把查看沒訊號的手機比喻成打開空冰箱。'],
      ['absurd_proposal','Suggest sending a friend a message by carefully folding a paper aeroplane.','提議用仔細摺好的紙飛機傳訊息給朋友。'],
      ['absurd_number','Say you have checked the same blank screen fifty times.','表示自己已經看過同一個空白畫面五十次。']
    ],
    '07':[
      ['choose_one_of_two','Get a non-wolf to choose sharing snacks or taking a short walk as the first activity with a new friend.','讓一位非狼玩家，選分享零食或散步當作新朋友加入後的第一個活動。'],
      ['compose_short_reply','Get a non-wolf to suggest a way to explain an old group joke to someone hearing it for the first time.','讓一位非狼玩家，幫你想一句向第一次聽到的人解釋老朋友笑話的話。'],
      ['practical_suggestion','Get a non-wolf to suggest how you could include a quiet newcomer without putting them on the spot.','讓一位非狼玩家，建議如何照顧安靜的新朋友，又不讓他突然被全場盯著。'],
      ['set_a_specific_limit','Get a non-wolf to say one kind of question they would avoid asking a new friend at the first gathering.','讓一位非狼玩家，說出第一次聚會時會避免問新朋友的一種問題。'],
      ['object_has_social_needs','Say “The snacks are better at making friends than I am.”','說出「The snacks are better at making friends than I am.」。'],
      ['speak_to_object','Introduce yourself to an imaginary empty chair as though it has just joined the gathering.','把想像中的空椅子當作剛加入聚會的新朋友，向它自我介紹。'],
      ['absurd_proposal','Suggest that everyone introduce only their favorite spoon instead of themselves.','提議大家不介紹自己，只介紹自己最喜歡的湯匙。'],
      ['compare_unlike_things','Compare joining a close group to arriving halfway through a film.','把加入一群很熟的人比喻成電影看到一半才進場。'],
      ['absurd_number','Say one friendly biscuit can replace twenty introduction questions.','表示一塊友善的餅乾可以取代二十道自我介紹問題。'],
      ['promise_to_object','Promise an imaginary snack bowl that it will never have to answer a personal question.','向想像中的零食碗保證，絕不要求它回答私人問題。']
    ],
    '08':[
      ['choose_one_of_two','Get a non-wolf to choose peeling potatoes or watching the soup as your kitchen job.','讓一位非狼玩家，替你選削馬鈴薯或顧湯當作廚房工作。'],
      ['set_a_specific_limit','Get a non-wolf to say one ingredient they would not let anyone add to tonight’s dinner.','讓一位非狼玩家，說出今晚晚餐絕不希望別人加入的一種食材。'],
      ['compose_short_reply','Get a non-wolf to suggest what you could say when someone changes your recipe without asking.','讓一位非狼玩家，幫你想一句回覆沒先問就改你食譜的人的話。'],
      ['recommend_one_item','Get a non-wolf to recommend a dish that can survive being left on the table for a while.','讓一位非狼玩家，推薦一道放在餐桌上一陣子也沒關係的菜。'],
      ['speak_to_object','Thank an imaginary onion for making dinner so emotional.','感謝想像中的洋蔥，讓這頓晚餐充滿情緒。'],
      ['quote_absurd_price','Offer to buy one perfectly peeled potato for five hundred dollars.','表示願意花五百元買一顆削皮完美的馬鈴薯。'],
      ['compare_unlike_things','Compare following a recipe to taking an exam with a frying pan.','把照食譜煮飯比喻成拿著平底鍋考試。'],
      ['absurd_proposal','Suggest serving the recipe book on a plate when the food is not ready.','提議飯菜還沒好時，先把食譜書裝盤端上桌。'],
      ['object_has_social_needs','Say “The soup would like a second opinion.”','說出「The soup would like a second opinion.」。'],
      ['absurd_number','Say you need three people to supervise one piece of toast.','表示你需要三個人一起監督一片吐司。']
    ],
    '09':[
      ['choose_one_of_two','Get a non-wolf to choose shorter opening hours or a smaller menu as the better way to keep the shop owners rested.','讓一位非狼玩家，選擇縮短營業時間或減少菜單品項，作為讓店主不會太累的較好方法。'],
      ['set_a_specific_limit','Get a non-wolf to say how long they would let a friend stay at one table after buying just one drink.','讓一位非狼玩家，說出朋友只買一杯飲料時，可以坐在同一張桌子多久。'],
      ['compose_short_reply','Get a non-wolf to suggest a kind sentence for telling a comfortable customer that the shop is closing.','讓一位非狼玩家，幫你想一句親切告訴坐得很舒服的客人「店要關了」的話。'],
      ['practical_suggestion','Get a non-wolf to suggest a shop job that a visiting friend could help with for five minutes.','讓一位非狼玩家，建議來玩的朋友可以幫忙五分鐘的一項店內工作。'],
      ['invent_warning','Propose a shop sign warning that the chairs may make customers forget their plans.','提議在店裡放一個告示，警告椅子可能讓客人忘記原本的行程。'],
      ['defend_minor_flaw','Defend a slightly wobbly shop table by saying it keeps drinks awake.','替店裡有一點搖晃的桌子辯護，說它能讓飲料保持清醒。'],
      ['quote_absurd_price','Offer customers a discount if they persuade the owner to take a nap.','提議客人只要成功說服店主去午睡，就可以享有折扣。'],
      ['object_has_social_needs','Say “Our opening hours depend on the sofa.”','說出「Our opening hours depend on the sofa.」。'],
      ['absurd_proposal','Suggest putting a small pillow beside the cash register for the owner’s change-counting breaks.','提議在收銀機旁放一個小枕頭，讓店主數零錢的休息時間可以用。'],
      ['speak_to_object','Tell an imaginary shop door that it is allowed to stop welcoming people at closing time.','告訴想像中的店門，打烊時它就可以停止歡迎客人了。']
    ],
    '10':[
      ['choose_one_of_two','Get a non-wolf to choose a handwritten memory or a cooked breakfast as the better low-cost birthday gift.','讓一位非狼玩家，選手寫的一段回憶或親手做的早餐，作為較好的低預算生日禮物。'],
      ['recommend_one_item','Get a non-wolf to recommend an everyday household item that could become birthday decoration without buying anything.','讓一位非狼玩家，推薦一樣不用花錢買、家裡已有且可當生日裝飾的日常物品。'],
      ['compose_short_reply','Get a non-wolf to suggest what you could say when the birthday friend asks why the cake is so small.','讓一位非狼玩家，幫你想一句回覆壽星問「蛋糕怎麼這麼小」的話。'],
      ['set_a_specific_limit','Get a non-wolf to say one birthday surprise they would refuse even if it cost nothing.','讓一位非狼玩家，說出一種就算免費也不想接受的生日驚喜。'],
      ['give_mock_instructions','Explain that one birthday candle should be moved around the cake to create the impression of many candles.','說明只要把同一根生日蠟燭在蛋糕上換位置，就能營造很多蠟燭的感覺。'],
      ['quote_absurd_price','Offer to pay the birthday friend in sincere compliments for helping wash the party dishes.','提議用真心稱讚作為報酬，請壽星幫忙洗派對的碗盤。'],
      ['defend_minor_flaw','Defend a crooked homemade birthday card by saying it is leaning toward the person it loves.','替歪掉的手工生日卡辯護，說它是在向自己喜歡的人靠過去。'],
      ['object_has_social_needs','Say “This cake is small because it is shy.”','說出「This cake is small because it is shy.」。'],
      ['sing_short_phrase','Sing the words “one tiny cake” as a short birthday song.','把英文「one tiny cake」唱成一小段生日歌。'],
      ['absurd_proposal','Suggest wrapping an empty gift box around a promise to carry the friend’s groceries once.','提議送一個空禮物盒，裡面裝著「幫朋友提一次菜」的承諾。']
    ],
    '11':[
      ['choose_one_of_two','Get a non-wolf to choose folding laundry or opening a stubborn jar as the talent your simple show should feature first.','讓一位非狼玩家，選摺衣服或打開難開的罐子，作為簡單節目首先展示的才藝。'],
      ['practical_suggestion','Get a non-wolf to suggest how a show guest could demonstrate a tiny everyday talent without special equipment.','讓一位非狼玩家，建議節目來賓如何不用特殊器材，就展示一項日常小才能。'],
      ['compose_short_reply','Get a non-wolf to suggest an encouraging line for a guest whose little talent goes wrong on camera.','讓一位非狼玩家，幫你想一句鼓勵鏡頭前才藝失誤來賓的話。'],
      ['set_a_specific_limit','Get a non-wolf to say one household activity that is too boring to watch for an entire show.','讓一位非狼玩家，說出一項無聊到不適合撐起整集節目的家事。'],
      ['invent_warning','Propose a warning before the show saying that viewers may become unusually interested in folded towels.','提議節目開始前顯示警告：觀眾可能會對摺好的毛巾產生異常興趣。'],
      ['make_object_testimony','Speak one sentence as a sock explaining why it deserves a guest appearance on the show.','用襪子的立場說一句話，解釋它為什麼值得當這個節目的來賓。'],
      ['quote_absurd_price','Offer the show’s first guest a single perfectly peeled orange as an appearance fee.','提議用一顆剝得完美的橘子，支付第一位節目來賓的出場費。'],
      ['absurd_proposal','Suggest ending the show on a cliffhanger about whether the laundry will dry.','提議節目用「衣服到底會不會乾」的懸念當作結尾。'],
      ['defend_minor_flaw','Defend the sound of a kettle interrupting the show by calling it the house band.','替節目被水壺聲打斷辯護，說那就是節目的現場樂團。'],
      ['object_has_social_needs','Say “The camera is impressed by my ability to find matching socks.”','說出「The camera is impressed by my ability to find matching socks.」。']
    ],
    '12':[
      ['recommend_one_item','Get a non-wolf to choose an ordinary object they would put in the exhibition because of a memory, not its price.','讓一位非狼玩家，因為回憶而非價格，選出一件想放進展覽的日常物品。'],
      ['compose_short_reply','Get a non-wolf to suggest what an exhibition label could say about an old ticket kept for years.','讓一位非狼玩家，幫一張留了多年的舊票根想一句展品說明。'],
      ['set_a_specific_limit','Get a non-wolf to say one ordinary possession they would display only if visitors could not touch it.','讓一位非狼玩家，說出一件只有禁止參觀者觸摸，才願意展示的日常物品。'],
      ['practical_suggestion','Get a non-wolf to suggest how visitors could understand an object’s story without hearing a long speech.','讓一位非狼玩家，建議如何不用聽長篇講解，也能讓觀眾理解展品的故事。'],
      ['make_object_testimony','Speak one sentence as a worn-out shopping bag that is proud of every trip it survived.','用磨損購物袋的立場說一句話，表達它以自己撐過的每趟購物為榮。'],
      ['invent_warning','Suggest a museum sign that asks visitors not to judge an old mug by its tea stains.','提議博物館放一個告示，請觀眾不要憑茶漬評斷一個老馬克杯。'],
      ['quote_absurd_price','Say you would trade a shiny trophy for the pencil that helped you through a difficult week.','表示你願意拿閃亮獎盃，交換一枝曾陪你度過辛苦一週的鉛筆。'],
      ['speak_to_object','Apologize directly to an imaginary old key for forgetting which door it used to open.','直接向想像中的舊鑰匙道歉，因為你忘了它以前能開哪扇門。'],
      ['defend_minor_flaw','Defend a cracked plate as an exhibit by saying the crack is where its story begins.','替有裂痕的盤子辯護，說裂痕正是它故事開始的地方，所以適合展出。'],
      ['object_has_social_needs','Say “This receipt remembers lunch better than I do.”','說出「This receipt remembers lunch better than I do.」。']
    ],
    '13':[
      ['choose_one_of_two','Get a non-wolf to choose a quiet arrival corner or a short walk with one person as a gentler way to enter the gathering.','讓一位非狼玩家，選安靜的入場角落或和一個人散步，作為比較自在的加入聚會方式。'],
      ['set_a_specific_limit','Get a non-wolf to say how long a first-time guest should be able to stay without anyone pressuring them to stay longer.','讓一位非狼玩家，說出第一次參加的人待多久後就能離開，而且不該被勸留。'],
      ['compose_short_reply','Get a non-wolf to suggest a friendly way to decline a group game at this gathering.','讓一位非狼玩家，幫你想一句在聚會中友善拒絕團體遊戲的話。'],
      ['practical_suggestion','Get a non-wolf to suggest how a guest could signal that they need a quiet break without explaining personal reasons.','讓一位非狼玩家，建議客人如何不用解釋私人理由，就能表示自己需要安靜休息。'],
      ['invent_warning','Propose an invitation warning that nobody will be asked to give a fun fact about themselves.','提議邀請函先提醒大家：沒有人會被要求提供一件自己的有趣小事。'],
      ['object_has_social_needs','Say “The exit is part of the hospitality.”','說出「The exit is part of the hospitality.」。'],
      ['absurd_proposal','Suggest keeping a spare coat ready for guests who want to leave but forgot to invent a reason.','提議準備一件備用外套，給想離開卻忘記想理由的客人穿。'],
      ['promise_to_object','Promise an imaginary sofa that sitting quietly on it will count as full participation.','向想像中的沙發保證，只要安靜坐在它上面就算完整參與聚會。'],
      ['defend_minor_flaw','Defend a long silence at the gathering by calling it a successful shared rest.','替聚會中的長時間安靜辯護，說這是成功的一起休息。'],
      ['compare_unlike_things','Compare a gentle party invitation to a door left open rather than a hand pulling someone inside.','把不勉強人的聚會邀請，比喻成留著開啟的門，而不是一隻拉人進去的手。']
    ],
    '14':[
      ['choose_one_of_two','Get a non-wolf to choose the neighborhood bakery or a familiar bench as the first stop for a visiting friend.','讓一位非狼玩家，選社區麵包店或熟悉的長椅，作為朋友來訪的第一站。'],
      ['recommend_one_item','Get a non-wolf to suggest an ordinary neighborhood sound that a visitor should stop and listen to.','讓一位非狼玩家，推薦一種值得請訪客停下來聽的日常社區聲音。'],
      ['compose_short_reply','Get a non-wolf to suggest what you could say when your visitor asks why this unremarkable street matters to you.','讓一位非狼玩家，幫你想一句回覆訪客問「這條平凡街道為什麼對你重要」的話。'],
      ['practical_suggestion','Get a non-wolf to suggest a rainy-day stop that would still show what everyday life in the neighborhood is like.','讓一位非狼玩家，建議一個下雨天也能認識社區日常生活的停留地點。'],
      ['invent_warning','Propose a tour notice warning that the most memorable landmark may be a very ordinary dog.','提議導覽告示先提醒大家，最難忘的地標可能只是一隻很普通的狗。'],
      ['defend_minor_flaw','Defend a slow pedestrian crossing by saying it gives visitors time to admire the neighborhood.','替等很久的行人號誌辯護，說它是在讓訪客有時間欣賞社區。'],
      ['speak_to_object','Thank an imaginary street bench for keeping local conversations alive.','感謝想像中的街邊長椅，讓社區裡的聊天持續發生。'],
      ['quote_absurd_price','Offer a free local tour whose only fee is one good bakery smell.','提議辦免費社區導覽，唯一收費是一份好聞的麵包店香氣。'],
      ['object_has_social_needs','Say “This corner has better gossip than the internet.”','說出「This corner has better gossip than the internet.」。'],
      ['give_mock_instructions','Explain that the correct way to appreciate the local bakery is to walk past twice before deciding what to buy.','說明欣賞社區麵包店的正確方式，是先經過兩次，再決定要買什麼。']
    ],
    '15':[
      ['choose_one_of_two','Get a non-wolf to choose swapping by practical usefulness or by the best story as the fairer method for the one-day shop.','讓一位非狼玩家，選依實用程度或依最精彩的故事交換，作為一日交換店較公平的方式。'],
      ['recommend_one_item','Get a non-wolf to suggest something they no longer use that could genuinely help someone moving into a new home.','讓一位非狼玩家，推薦一樣自己不再使用、卻真的能幫到剛搬新家的人的物品。'],
      ['compose_short_reply','Get a non-wolf to suggest a kind way to refuse a swap when the other person loves your item more than you love theirs.','讓一位非狼玩家，幫你想一句親切拒絕「對方很喜歡你的東西，但你不喜歡他的」交換提議的話。'],
      ['set_a_specific_limit','Get a non-wolf to say one condition an item must meet before they would accept it from the swap shop.','讓一位非狼玩家，說出願意接受交換店物品前，該物品必須符合的一個條件。'],
      ['defend_minor_flaw','Defend a lonely single glove by saying it is perfect for someone who wants to wave more warmly.','替落單的單隻手套辯護，說它非常適合想要更溫暖地揮手的人。'],
      ['quote_absurd_price','Offer to exchange three unused notebooks for one page of genuinely useful advice.','提議用三本沒用過的筆記本，交換一頁真正有用的建議。'],
      ['make_object_testimony','Speak one sentence as an unused exercise mat asking to live with someone who will unfold it.','用沒在使用的瑜伽墊立場說一句話，請求搬去一個願意把它展開的人家裡。'],
      ['invent_warning','Suggest a label warning that a donated puzzle may teach patience before it becomes a picture.','提議替捐來的拼圖貼標籤，提醒它在變成圖畫前，可能先教會你耐心。'],
      ['object_has_social_needs','Say “This umbrella is ready for a second career.”','說出「This umbrella is ready for a second career.」。'],
      ['absurd_proposal','Suggest giving every unwanted charging cable a short interview before finding it a new home.','提議替每條不要的充電線做一次簡短面試，再幫它找新家。']
    ],
    '16':[
      ['choose_one_of_two','Get a non-wolf to choose softer lighting or less noise as the first improvement to the little relaxation room.','讓一位非狼玩家，選柔和燈光或降低噪音，作為小休息室的第一項改善。'],
      ['recommend_one_item','Get a non-wolf to suggest one object that would help them settle down after a busy day without using a screen.','讓一位非狼玩家，推薦一樣不用螢幕就能幫自己在忙碌一天後安定下來的物品。'],
      ['set_a_specific_limit','Get a non-wolf to say one activity they would keep out of the relaxation room to protect its atmosphere.','讓一位非狼玩家，說出為了保護休息室氣氛而不允許在裡面做的一種活動。'],
      ['practical_suggestion','Get a non-wolf to suggest how two people could share the room when one wants music and one wants silence.','讓一位非狼玩家，建議一人想聽音樂、一人想安靜時，兩人如何共用休息室。'],
      ['give_mock_instructions','Explain that worries must wait outside while their owner takes off their shoes in the relaxation room.','說明人在休息室脫鞋時，他的煩惱必須先在門外等候。'],
      ['object_has_social_needs','Say “This cushion has no questions for me.”','說出「This cushion has no questions for me.」。'],
      ['promise_to_object','Promise an imaginary lamp that nobody will ask it to be productive tonight.','向想像中的檯燈保證，今晚沒有人會要求它提升生產力。'],
      ['defend_minor_flaw','Defend a room with almost no furniture by saying the empty space is already doing its job.','替幾乎沒有家具的房間辯護，說空間空著就已經在發揮功用了。'],
      ['absurd_proposal','Suggest putting a tiny waiting chair outside for unfinished to-do lists.','提議在門外放一張小候位椅，讓沒做完的待辦清單坐著等。'],
      ['compare_unlike_things','Compare entering the quiet room to taking a heavy backpack off your brain.','把走進安靜的房間，比喻成替大腦卸下一個沉重背包。']
    ],
    '17':[
      ['choose_one_of_two','Get a non-wolf to choose finding lost keys or keeping tea warm as the everyday power their apartment neighbor should have.','讓一位非狼玩家，選找回遺失鑰匙或讓茶保溫，作為希望公寓鄰居擁有的日常超能力。'],
      ['set_a_specific_limit','Get a non-wolf to say one situation in which a neighbor must ask permission before using a helpful power on them.','讓一位非狼玩家，說出鄰居對自己使用助人超能力前，必須先取得同意的一種情況。'],
      ['compose_short_reply','Get a non-wolf to suggest how you could politely refuse a neighbor who asks for your little power every morning.','讓一位非狼玩家，幫你想一句婉拒每天早上都來求你用小超能力幫忙的鄰居的話。'],
      ['practical_suggestion','Get a non-wolf to suggest how neighbors could help a person whose power works only on other people but who needs the same help.','讓一位非狼玩家，建議如何幫助一個超能力只能用在別人身上、卻也需要同樣幫助的鄰居。'],
      ['give_mock_instructions','Explain that your helpful power recharges only when the person you helped remembers to say thank you.','說明你的助人超能力，只有被幫助的人記得說謝謝時才會充電。'],
      ['defend_minor_flaw','Defend a power that finds only one missing sock by saying it still cuts the search in half.','替只能找回一隻失蹤襪子的超能力辯護，說這仍然能讓搜尋工作減少一半。'],
      ['quote_absurd_price','Offer to keep a neighbor’s soup warm in exchange for a dramatic description of how good it smells.','表示願意幫鄰居的湯保溫，交換對方用戲劇化的方式描述湯有多香。'],
      ['object_has_social_needs','Say “I can save everyone’s breakfast except my own.”','說出「I can save everyone’s breakfast except my own.」。'],
      ['invent_warning','Propose a notice warning that the building’s key-finding power takes Sundays off.','提議貼出公告，警告公寓的尋找鑰匙超能力每逢星期日休息。'],
      ['absurd_proposal','Suggest a neighborly power that makes another person’s leftovers look exciting again.','提議一種鄰里超能力，可以讓別人的剩菜看起來重新令人期待。']
    ],
    '18':[
      ['choose_one_of_two','Get a non-wolf to choose borrowing a friend’s early-morning routine or late-evening routine for the one-day swap.','讓一位非狼玩家，選體驗朋友的清晨日常或深夜日常，作為一天交換生活的內容。'],
      ['set_a_specific_limit','Get a non-wolf to say one part of their own daily routine that a visiting friend could skip without missing the point.','讓一位非狼玩家，說出自己日常生活中，朋友就算跳過也不會錯失體驗重點的一個部分。'],
      ['compose_short_reply','Get a non-wolf to suggest what you could say to a friend after discovering that their ordinary commute is surprisingly tiring.','讓一位非狼玩家，幫你想一句發現朋友平常通勤比想像中累後，可以對他說的話。'],
      ['practical_suggestion','Get a non-wolf to suggest how you could keep your own personality while following a much more organized friend’s routine.','讓一位非狼玩家，建議如何一邊照著比你更有規律的朋友過一天，一邊保留自己的個性。'],
      ['invent_warning','Suggest that the borrowed routine should come with a warning about how many alarms are involved.','提議借來的日常作息應該附上警告，說明途中到底會遇到幾個鬧鐘。'],
      ['speak_to_object','Apologize directly to an imaginary borrowed travel mug for not understanding its usual morning route.','直接向想像中借來的隨行杯道歉，因為你不熟悉它平常早上的路線。'],
      ['compare_unlike_things','Compare living someone else’s routine to wearing comfortable shoes that still feel strange on your feet.','把體驗別人的日常，比喻成穿上一雙很舒服，卻仍然感覺奇怪的鞋子。'],
      ['object_has_social_needs','Say “Your breakfast schedule has more confidence than I do.”','說出「Your breakfast schedule has more confidence than I do.」。'],
      ['absurd_proposal','Suggest returning the borrowed day with a small note apologizing for what happened to the to-do list.','提議把借來的一天還回去時，附上一張小紙條，為待辦清單的遭遇道歉。'],
      ['defend_minor_flaw','Defend falling behind a friend’s precise schedule by saying you are giving their routine a holiday.','替自己跟不上朋友精準行程辯護，說你是在讓他的作息放假一天。']
    ],
    '19':[
      ['choose_one_of_two','Get a non-wolf to choose using the extra private hour before breakfast or after dinner.','讓一位非狼玩家，選在早餐前或晚餐後使用每天額外、只屬於自己的那一小時。'],
      ['set_a_specific_limit','Get a non-wolf to say one normal responsibility they would refuse to let enter their extra private hour.','讓一位非狼玩家，說出一項絕不願意帶進額外私人時間的平常責任。'],
      ['recommend_one_item','Get a non-wolf to suggest something they could enjoy for that hour even if they made no progress and produced nothing.','讓一位非狼玩家，推薦一件就算沒有進步、也沒有任何產出，仍然可以享受一小時的事。'],
      ['compose_short_reply','Get a non-wolf to suggest a sentence for reminding themselves that the extra hour does not have to be useful.','讓一位非狼玩家，幫自己想一句提醒「這一小時不必有用」的話。'],
      ['give_mock_instructions','Explain that you would spend the first five minutes of the extra hour teaching your phone how to be ignored.','說明你會用額外一小時的前五分鐘，教手機學會如何被忽略。'],
      ['quote_absurd_price','Offer to exchange ten minutes of the extra hour for the ability to enjoy the remaining fifty without feeling guilty.','表示願意用額外時間中的十分鐘，交換毫無罪惡感地享受剩下五十分鐘的能力。'],
      ['object_has_social_needs','Say “This hour does not owe anyone a result.”','說出「This hour does not owe anyone a result.」。'],
      ['absurd_proposal','Suggest issuing an official certificate to a daydream that lasted the whole extra hour.','提議替一個持續整整額外一小時的白日夢，頒發正式證書。'],
      ['promise_to_object','Promise an imaginary clock that it can watch you do absolutely nothing without reporting it to anyone.','向想像中的時鐘保證，它可以看著你什麼也不做，而且不用向任何人報告。'],
      ['defend_minor_flaw','Defend using the whole bonus hour to decide what to do by saying the deciding was the activity.','替花完整個額外小時決定要做什麼辯護，說「做決定」本來就是這次的活動。']
    ],
    '20':[
      ['choose_one_of_two','Get a non-wolf to choose the sofa or the washing machine as the household object most likely to make a fair complaint.','讓一位非狼玩家，選沙發或洗衣機，作為家中最可能提出合理抱怨的物品。'],
      ['compose_short_reply','Get a non-wolf to suggest an apology to a kettle that says it is always forgotten after boiling.','讓一位非狼玩家，替一個抱怨水燒開後總是被忘記的水壺，想一句道歉的話。'],
      ['set_a_specific_limit','Get a non-wolf to say one private subject they would forbid household objects from discussing at the meeting.','讓一位非狼玩家，說出在家庭會議中不准物品討論的一種私人話題。'],
      ['practical_suggestion','Get a non-wolf to suggest a compromise between a crowded wardrobe and someone who keeps buying clothes.','讓一位非狼玩家，替塞滿的衣櫃和不停買衣服的人，提出一個折衷辦法。'],
      ['make_object_testimony','Speak one sentence as a chair insisting that being used as a clothes pile was never in its job description.','用椅子的立場說一句話，堅持讓衣服堆在身上從來不在它的工作範圍內。'],
      ['quote_absurd_price','Offer a complaining refrigerator one day without being opened for snacks as compensation.','表示願意賠償抱怨中的冰箱，讓它有一天不用因為找零食而被打開。'],
      ['invent_warning','Propose a meeting rule warning the alarm clock not to interrupt anyone before they finish speaking.','提議一條會議規則，警告鬧鐘不要在別人說完以前打斷發言。'],
      ['speak_to_object','Thank an imaginary mirror for keeping its opinions to itself on difficult mornings.','感謝想像中的鏡子，在狀況不好的早晨沒有隨便發表意見。'],
      ['object_has_social_needs','Say “The laundry basket would like to discuss its workload.”','說出「The laundry basket would like to discuss its workload.」。'],
      ['defend_minor_flaw','Defend a squeaking door by saying it has been trying to join the conversation for years.','替吱吱作響的門辯護，說它多年來一直只是想加入聊天。']
    ],
    '21':[
      ['choose_one_of_two','Get a non-wolf to choose rescuing a dropped snack or correcting an awkward goodbye as the better use of a ten-second redo.','讓一位非狼玩家，選挽救掉落的點心或修正尷尬的道別，作為十秒重來比較值得的用途。'],
      ['set_a_specific_limit','Get a non-wolf to say one kind of harmless mistake they would deliberately leave unchanged even with the redo button.','讓一位非狼玩家，說出一種就算有重來按鈕，也會故意保持原樣的無害小失誤。'],
      ['compose_short_reply','Get a non-wolf to suggest a better second attempt at replying to a shop worker who says “Enjoy your meal.”','讓一位非狼玩家，幫你想一句店員說「Enjoy your meal.」時，第二次重來可以說的較好回覆。'],
      ['practical_suggestion','Get a non-wolf to suggest how you could stop yourself from redoing the same small moment over and over.','讓一位非狼玩家，建議你如何避免不斷重來同一個日常小片刻。'],
      ['give_mock_instructions','Explain that you would redo a dropped biscuit by moving the plate instead of trying to become faster.','說明餅乾掉落時，你重來的做法是移動盤子，而不是努力讓自己動作更快。'],
      ['defend_minor_flaw','Defend leaving an awkward laugh unchanged because the second version might sound like a doorbell.','替保留尷尬的笑聲辯護，因為重來的第二版可能會聽起來像門鈴。'],
      ['quote_absurd_price','Offer to trade one perfect ten-second redo for never saying “you too” to the wrong person again.','表示願意用一次完美的十秒重來，交換再也不會對不適合的人說「you too」的能力。'],
      ['object_has_social_needs','Say “The biscuit deserves a second chance.”','說出「The biscuit deserves a second chance.」。'],
      ['invent_warning','Propose a label on the redo button warning that embarrassment may return in a different form.','提議在重來按鈕上貼警告：尷尬可能會換一種形式回來。'],
      ['absurd_proposal','Suggest keeping the redo button next to the pepper shaker for emergencies involving too much seasoning.','提議把重來按鈕放在胡椒罐旁邊，專門處理調味加太多的緊急狀況。']
    ],
    '22':[
      ['choose_one_of_two','Get a non-wolf to choose a worn house key or a grocery receipt as the object that would tell them more about life ten years from now.','讓一位非狼玩家，選磨損的家門鑰匙或超市收據，作為更能透露十年後生活的物品。'],
      ['practical_suggestion','Get a non-wolf to suggest what they could learn about a future routine from a well-used lunch box.','讓一位非狼玩家，建議如何從常用的便當盒看出未來日常生活的線索。'],
      ['compose_short_reply','Get a non-wolf to suggest the first question they would ask their future self about an ordinary object in the parcel.','讓一位非狼玩家，想出看到包裹裡的日常物品後，第一個想問未來自己的問題。'],
      ['set_a_specific_limit','Get a non-wolf to say one thing they would not want to infer about their future from the package.','讓一位非狼玩家，說出一件不想透過包裹推測的未來資訊。'],
      ['defend_minor_flaw','Defend a future package containing only an ordinary spoon by saying that a calm life may need no dramatic explanation.','替只裝了一把普通湯匙的未來包裹辯護，說平靜的生活或許不需要戲劇化解釋。'],
      ['speak_to_object','Ask an imaginary key from the future whether it has learned to stop hiding at the bottom of a bag.','問想像中來自未來的鑰匙，它是否終於學會不要躲在包包最底下。'],
      ['object_has_social_needs','Say “My future self still cannot throw away a good box.”','說出「My future self still cannot throw away a good box.」。'],
      ['absurd_proposal','Suggest putting the future grocery receipt on the wall as evidence that you eventually learned to buy vegetables.','提議把未來的超市收據掛在牆上，證明自己後來終於學會買蔬菜。'],
      ['invent_warning','Propose a warning on the parcel saying that an old sock is not a prediction of bad luck.','提議在包裹上標示警告：一隻舊襪子並不代表未來會倒楣。'],
      ['compare_unlike_things','Compare studying the future package to reading a diary written entirely in kitchen utensils.','把研究未來包裹，比喻成閱讀一本完全用廚具寫成的日記。']
    ],
    '23':[
      ['choose_one_of_two','Get a non-wolf to choose watching an ordinary family breakfast or an uneventful walk home again.','讓一位非狼玩家，選重新觀看一次平凡的家庭早餐或一段沒發生特別事情的回家散步。'],
      ['recommend_one_item','Get a non-wolf to suggest an everyday sound that would help them recognize an old ordinary moment.','讓一位非狼玩家，推薦一種能幫自己認出往昔平凡片刻的日常聲音。'],
      ['set_a_specific_limit','Get a non-wolf to say one detail they would prefer to leave outside the replay so the memory stayed simple.','讓一位非狼玩家，說出一個希望不要在重播畫面中出現的細節，讓回憶保持單純。'],
      ['practical_suggestion','Get a non-wolf to suggest an ordinary moment from today that might be worth watching again years later.','讓一位非狼玩家，建議今天某個多年後可能值得再看一次的平凡片刻。'],
      ['defend_minor_flaw','Defend a replay in which almost nothing happens by saying that this is exactly why you chose it.','替幾乎什麼也沒發生的重播片段辯護，說這正是你選擇它的原因。'],
      ['quote_absurd_price','Say you would exchange a perfect holiday photo for the sound of someone washing dishes in an old familiar kitchen.','表示願意用一張完美度假照片，交換在熟悉舊廚房裡有人洗碗的聲音。'],
      ['object_has_social_needs','Say “I did not know that afternoon was a souvenir.”','說出「I did not know that afternoon was a souvenir.」。'],
      ['give_mock_instructions','Explain that you would replay an ordinary breakfast very slowly so the toast could stay warm longer in the memory.','說明你會把一頓平常的早餐重播得很慢，讓回憶裡的吐司能保溫久一點。'],
      ['speak_to_object','Thank an imaginary old kitchen table for having been present at so many unremarkable days.','感謝想像中的舊餐桌，陪伴了那麼多看起來沒什麼特別的日子。'],
      ['invent_warning','Propose a replay notice warning viewers not to skip the boring parts because they may be the important parts.','提議重播前先提醒觀眾：不要跳過無聊部分，因為那些可能才是重要的部分。']
    ],
    '24':[
      ['choose_one_of_two','Get a non-wolf to choose finding the end of sticky tape or remembering why they entered a room as the impossible service they would buy.','讓一位非狼玩家，選找到膠帶開頭或記起走進房間的原因，作為願意購買的不可能日常服務。'],
      ['set_a_specific_limit','Get a non-wolf to say the highest price they would pay to make one annoying everyday chore disappear for a week.','讓一位非狼玩家，說出願意付多少錢，讓一項煩人的日常家事消失一週。'],
      ['compose_short_reply','Get a non-wolf to suggest a complaint from a customer whose purchased perfect nap ended too soon.','讓一位非狼玩家，替買了完美午睡卻太快睡醒的客人想一句抱怨。'],
      ['practical_suggestion','Get a non-wolf to suggest how the shop could demonstrate a service that keeps umbrellas from turning inside out.','讓一位非狼玩家，建議店家如何示範「讓雨傘不再被吹翻」這項服務。'],
      ['give_mock_instructions','Explain that the shop removes an annoying song from your head by persuading it to perform somewhere else.','說明店家會說服腦中一直重播的煩人歌曲去別的地方表演，藉此提供移除服務。'],
      ['invent_warning','Propose a service warning that perfectly matching socks may become overconfident.','提議服務警告，提醒永遠配成一對的襪子可能會變得太有自信。'],
      ['quote_absurd_price','Offer to pay the shop with all your future elevator awkwardness in exchange for always finding a comfortable seat.','表示願意用未來所有搭電梯時的尷尬付費，交換總是能找到舒服座位的服務。'],
      ['object_has_social_needs','Say “I would like my Monday delivered without the Monday feeling.”','說出「I would like my Monday delivered without the Monday feeling.」。'],
      ['defend_minor_flaw','Defend a service that removes only half a worry by saying the remaining half is easier to carry.','替只能消除一半煩惱的服務辯護，說剩下的一半比較容易承擔。'],
      ['absurd_proposal','Suggest a service that makes the shortest checkout line wait for you until you arrive.','提議一項服務，讓最短的結帳隊伍維持原樣等你走到。']
    ],
  };
  const groups = {
    choose_one_of_two:['choice','choice','One task asks someone to choose between two options.','有一項任務要請人二選一。','No wolf task requires another player to choose between two options.','本局沒有要求另一位玩家二選一的狼任務。'],
    set_a_specific_limit:['boundary','specific_limit','One task asks another player for a clear limit.','有一項任務要請另一位玩家說出明確界線。','No wolf task requires getting a specific limit from another player.','本局沒有要求取得另一位玩家明確界線的狼任務。'],
    practical_suggestion:['advice','advice','One task asks someone for a practical suggestion.','有一項任務要請人提供實用建議。','No wolf task requires getting a practical suggestion.','本局沒有要求取得實用建議的狼任務。'],
    compose_short_reply:['reply','reply','One task asks someone to suggest words for a reply.','有一項任務要請人想一句回覆。','No wolf task requires another player to suggest a reply.','本局沒有要求另一位玩家提供回覆說法的狼任務。'],
    recommend_one_item:['recommendation','recommendation','One task asks someone to recommend a particular kind of thing.','有一項任務要請人推薦某一類東西。','No wolf task requires another player to recommend an item or a dish.','本局沒有要求另一位玩家推薦物品或料理的狼任務。'],
    object_has_social_needs:['fixed_phrase','fixed_phrase','One task uses a particular playful sentence.','有一項任務會用到指定趣味句子。','No wolf task requires a particular playful sentence.','本局沒有要求指定趣味句子的狼任務。'],
    speak_to_object:['object_address','object_address','One task involves talking directly to an object.','有一項任務與直接對物品說話有關。','No wolf task requires speaking directly to an object.','本局沒有要求直接對物品說話的狼任務。'],
    quote_absurd_price:['absurd_price','absurd_price','One task involves an unusual price or payment.','有一項任務與不尋常的價碼或報酬有關。','No wolf task requires an unusual price or payment.','本局沒有要求不尋常價碼或報酬的狼任務。'],
    compare_unlike_things:['comparison','comparison','One task compares two very different things.','有一項任務會比較兩樣很不同的東西。','No wolf task requires comparing two specified unlike things.','本局沒有要求比較指定不同事物的狼任務。'],
    absurd_preference:['absurd_choice','absurd_choice','One task states an unusual preference.','有一項任務會表達不尋常的偏好。','No wolf task requires a specified unusual preference.','本局沒有要求指定不尋常偏好的狼任務。'],
    absurd_number:['absurd_quantity','absurd_quantity','One task uses an unusually large amount or count.','有一項任務會用到特別誇張的數量。','No wolf task requires a specified exaggerated amount or count.','本局沒有要求指定誇張數量的狼任務。'],
    absurd_proposal:['absurd_proposal','absurd_proposal','One task proposes an unusual concrete arrangement.','有一項任務會提出具體而古怪的安排。','No wolf task requires a specified unusual arrangement.','本局沒有要求指定古怪安排的狼任務。'],
    promise_to_object:['object_promise','object_promise','One task makes a promise to an object.','有一項任務會向物品做出承諾。','No wolf task requires making a promise to an object.','本局沒有要求向物品做出承諾的狼任務。'],
    sing_short_phrase:['singing','singing','One task involves singing a short line.','有一項任務與唱出短句有關。','No wolf task requires singing.','本局沒有以唱歌為條件的狼任務。'],
    invent_warning:['warning','warning','One task proposes a playful warning or notice.','有一項任務會提出趣味警告或告示。','No wolf task requires a specified playful warning or notice.','本局沒有要求指定趣味警告或告示的狼任務。'],
    defend_minor_flaw:['defense','defense','One task gives an unusual defense of an apparent flaw.','有一項任務會用特別的理由替缺點辯護。','No wolf task requires defending a specified flaw.','本局沒有要求替指定缺點辯護的狼任務。'],
    give_mock_instructions:['instructions','instructions','One task explains a playful procedure.','有一項任務會說明一個趣味做法。','No wolf task requires explaining a specified playful procedure.','本局沒有要求解釋指定趣味做法的狼任務。'],
    make_object_testimony:['object_viewpoint','object_viewpoint','One task speaks from an object’s point of view.','有一項任務會以物品的立場說話。','No wolf task requires speaking from an object’s point of view.','本局沒有要求以物品立場說話的狼任務。']
  };
  const tasks=[];
  for(const [topicNumber,rows] of Object.entries(authored)){
    rows.forEach((row,index)=>{
      const [group,text,textZh]=row,meta=groups[group];
      if(!meta)throw new Error('Missing author metadata: '+group);
      const id='wolf_imagine_v4_'+topicNumber+'_'+String(index+1).padStart(2,'0');
      const actionTags=new Set([meta[1]]);
      // Conservative secondary tags prevent exclusion clues from contradicting an
      // explicitly required act even when another mechanic is the primary group.
      if (/apologi[sz]|apology/i.test(text)) actionTags.add('apology');
      if (/\bthank\b/i.test(text)) actionTags.add('thanks');
      if (/^Ask\b|suggest the first question/i.test(text)) actionTags.add('question');
      if (/\bpromise\b/i.test(text)) actionTags.add('promise');
      if (group==='promise_to_object') actionTags.add('object_address');
      if (group==='object_has_social_needs') actionTags.add('quotation');
      if (group==='sing_short_phrase') {actionTags.add('quotation');actionTags.add('fixed_phrase');}
      tasks.push({id,text,textZh,type:index<4?'interaction':'self_action',
        family:meta[0],variantGroup:group,mechanicKey:group,canonicalTaskKey:id,
        compatibleTopicIds:['topic_v2_'+topicNumber],requiredOtherPlayerCount:index<4?1:0,
        isGeneric:false,performanceGroup:group==='sing_short_phrase'?'voice':null,
        actionTags:Array.from(actionTags),positiveClues:[meta[2]],positiveCluesZh:[meta[3]],
        requiredUtterances:Array.from(text.matchAll(/“([^”]+)”/g),match=>match[1]),
        active:true,status:'active',reviewed:true,activityLanguage:'en',contentVersion:'chat-wolf-content-20261002'});
    });
  }
  return {tasks,
    exclusionClues:Object.fromEntries(Object.values(groups).map(meta=>[meta[1],meta[4]])),
    exclusionCluesZh:Object.fromEntries(Object.values(groups).map(meta=>[meta[1],meta[5]]))};
});
