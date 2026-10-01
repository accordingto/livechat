(function (root, factory) {
  'use strict';
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.CHAT_WOLF_V4_WOLF_LIFE = value;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Complete, manually authored cards. Only metadata is assembled below; no
  // runtime sentence generation, topic-word replacement, or unreviewed fallback.
  // Rows: topic, stable suffix, type, honest near-variant group, action tag, EN, zh-TW.
  const rows = [
    [25, 'i1', 'interaction', 'gift-refusal-reply', 'compose_reply', 'Get a non-wolf to suggest the exact words for refusing a handmade sweater that does not fit.', '讓一位非狼玩家說出婉拒尺寸不合的手織毛衣時，可以怎麼回覆。'],
    [25, 'i2', 'interaction', 'gift-visit-check', 'direct_question', 'Get a non-wolf to ask you whether you would bring out an unwanted gift when the giver visits.', '讓一位非狼玩家問你：送禮者來訪時，你會不會拿出不喜歡的禮物。'],
    [25, 'i3', 'interaction', 'gift-rehome-recipient', 'practical_fix', 'Get a non-wolf to suggest who could use a giant teddy bear you have no room for.', '讓一位非狼玩家建議，把放不下的巨型泰迪熊轉送給誰。'],
    [25, 'i4', 'interaction', 'gift-truth-delay', 'time_limit', 'Get a non-wolf to give a number of days they would wait before telling a friend they cannot use the gift.', '讓一位非狼玩家說出會等幾天，才告訴朋友自己用不到禮物。'],
    [25, 's1', 'self_action', 'object-apology', 'object_address', 'Apologize aloud to an unwanted gift for leaving it in a cupboard.', '對不想要的禮物說一句道歉，因為你把它留在櫃子裡。'],
    [25, 's2', 'self_action', 'gift-gratitude-not-item', 'quoted_line', 'Say, "I love the friend. The lamp is a separate question."', '說出「I love the friend. The lamp is a separate question.」。'],
    [25, 's3', 'self_action', 'gift-imaginary-rent', 'price_offer', 'State a monthly rent you would charge a giant gift for taking up space in your room.', '說出巨型禮物占用房間空間，每月應付你多少租金。'],
    [25, 's4', 'self_action', 'gift-return-label', 'spoken_notice', 'Read out this imaginary gift label: "Friendship included. Storage space not included."', '唸出想像中的禮物標籤：「Friendship included. Storage space not included.」。'],
    [25, 's5', 'self_action', 'gift-duplicate-disaster', 'absurd_proposal', 'Suggest displaying all unwanted gifts together in a special corner for visiting gift-givers.', '提議把不喜歡的禮物集中展示，專門給來訪的送禮者看。'],
    [25, 's6', 'self_action', 'gift-two-person-exchange', 'short_dialogue', 'Say both lines: "Do you use my gift?" "It has the best seat in my cupboard."', '說出這兩句對話：「Do you use my gift?」「It has the best seat in my cupboard.」。'],

    [26, 'i1', 'interaction', 'dinner-unordered-dessert', 'fairness_exception', 'Get a non-wolf to say who should pay for a dessert that one person ordered for everyone without asking.', '讓一位非狼玩家說出：有人沒先問就幫全桌點甜點，應由誰付錢。'],
    [26, 'i2', 'interaction', 'dinner-bill-reply', 'compose_reply', 'Get a non-wolf to suggest a sentence for asking to pay only for your salad.', '讓一位非狼玩家替你想一句「只付自己沙拉的錢」的說法。'],
    [26, 'i3', 'interaction', 'dinner-bill-helper', 'practical_fix', 'Get a non-wolf to suggest a way to divide the bill without passing one phone around the table.', '讓一位非狼玩家建議，不用全桌傳同一支手機也能分帳的方法。'],
    [26, 'i4', 'interaction', 'dinner-payment-order', 'sequence_choice', 'Get a non-wolf to say whether the group should discuss payment before ordering or after eating.', '讓一位非狼玩家選擇：應在點餐前，還是吃完後談怎麼付錢。'],
    [26, 's1', 'self_action', 'dinner-water-bill', 'quoted_line', 'Say, "My water had a very expensive evening."', '說出「My water had a very expensive evening.」。'],
    [26, 's2', 'self_action', 'dinner-fork-fee', 'absurd_proposal', 'Propose charging a small fee each time someone takes food from another person\'s plate.', '提議每次夾走別人盤裡的食物，都要付一筆小費用。'],
    [26, 's3', 'self_action', 'dinner-receipt-objection', 'spoken_notice', 'Read out an imaginary bill item: "Listening to everyone argue: free."', '唸出想像中的帳單項目：「Listening to everyone argue: free.」。'],
    [26, 's4', 'self_action', 'dinner-calculation-food', 'analogy', 'Compare splitting a dinner bill to sharing one pizza with slices of different sizes.', '把晚餐分帳比喻成分一個切得大小不一的披薩。'],
    [26, 's5', 'self_action', 'dinner-empty-plate-defense', 'short_dialogue', 'Say both lines: "You ate nothing!" "I enjoyed the smell."', '說出這兩句對話：「You ate nothing!」「I enjoyed the smell.」。'],
    [26, 's6', 'self_action', 'dinner-agreement-before-food', 'spoken_rule', 'Propose this dinner rule: nobody touches the menu until everyone knows how the bill will be split.', '提出聚餐規則：說好怎麼分帳之前，任何人都不准碰菜單。'],

    [27, 'i1', 'interaction', 'chat-no-reply-message', 'compose_reply', 'Get a non-wolf to suggest a group-chat message that says you are busy without asking people to stop talking.', '讓一位非狼玩家想一句群組訊息：你很忙，但不是要大家停止聊天。'],
    [27, 'i2', 'interaction', 'chat-urgent-signal', 'practical_fix', 'Get a non-wolf to suggest how friends should contact you when a group message is genuinely urgent.', '讓一位非狼玩家建議，群組真的有急事時應怎麼聯絡你。'],
    [27, 'i3', 'interaction', 'chat-voice-note-limit', 'time_limit', 'Get a non-wolf to set a maximum length, in seconds, for a group-chat voice message.', '讓一位非狼玩家訂出群組語音訊息最長可以有幾秒。'],
    [27, 'i4', 'interaction', 'chat-unread-guess', 'number_guess', 'Get a non-wolf to guess how many unread messages would make you stop trying to catch up.', '讓一位非狼玩家猜：多少則未讀訊息會讓你放棄補看。'],
    [27, 's1', 'self_action', 'chat-unread-quote', 'quoted_line', 'Say, "I went to make tea and missed three separate arguments."', '說出「I went to make tea and missed three separate arguments.」。'],
    [27, 's2', 'self_action', 'chat-away-notice', 'spoken_notice', 'Read out an imaginary away message: "Still your friend. Currently washing dishes."', '唸出想像中的暫離訊息：「Still your friend. Currently washing dishes.」。'],
    [27, 's3', 'self_action', 'chat-fee-after-midnight', 'price_offer', 'Suggest a price for every non-urgent group notification sent after midnight.', '提議半夜十二點後，每則不緊急的群組通知該收多少錢。'],
    [27, 's4', 'self_action', 'chat-catchup-summary', 'absurd_proposal', 'Suggest making the first person awake give everyone a one-sentence summary of the overnight chat.', '提議每天最早起床的人，用一句話替大家摘要夜間群組聊天。'],
    [27, 's5', 'self_action', 'chat-silence-friendship', 'spoken_rule', 'Propose that reading a message without replying must count as staying in touch.', '提議「看了訊息但沒回覆」也必須算有保持聯絡。'],
    [27, 's6', 'self_action', 'chat-phone-address', 'object_address', 'Tell your phone aloud that it does not get to decide when you are available.', '直接對手機說：什麼時候有空，不由它決定。'],

    [28, 'i1', 'interaction', 'photo-posting-refusal', 'compose_reply', 'Get a non-wolf to suggest a sentence asking a friend not to post a photo, without asking them to delete it.', '讓一位非狼玩家想一句話，請朋友不要公開照片，但不必刪除它。'],
    [28, 'i2', 'interaction', 'photo-sharing-permission', 'fairness_exception', 'Get a non-wolf to say whether one person\'s objection should stop a group photo from being posted.', '讓一位非狼玩家表態：一個人反對，是否就不該公開團體照。'],
    [28, 'i3', 'interaction', 'photo-edit-option', 'practical_fix', 'Get a non-wolf to suggest a way to keep the group memory without showing your face in the public photo.', '讓一位非狼玩家建議，公開照片不露出你的臉，仍能留住團體回憶的方法。'],
    [28, 'i4', 'interaction', 'photo-retake-limit', 'number_limit', 'Get a non-wolf to give the maximum number of group-photo retakes they would patiently accept.', '讓一位非狼玩家說出最多願意配合重拍幾次團體照。'],
    [28, 's1', 'self_action', 'photo-blink-quote', 'quoted_line', 'Say, "Everyone looks happy. I look like I am checking my eyelids."', '說出「Everyone looks happy. I look like I am checking my eyelids.」。'],
    [28, 's2', 'self_action', 'photo-camera-address', 'object_address', 'Ask the camera aloud why it always catches the middle of your blink.', '直接問相機：為什麼總是拍到你眨眼的中間。'],
    [28, 's3', 'self_action', 'photo-consent-rule', 'spoken_rule', 'Propose giving each person one photo they may block from being posted, with no explanation required.', '提議每個人都有一張「不用解釋就能禁止公開」的照片名額。'],
    [28, 's4', 'self_action', 'photo-caption-read', 'spoken_notice', 'Read this suggested photo caption aloud: "A lovely day, according to everyone except the person on the left."', '唸出這段照片說明：「A lovely day, according to everyone except the person on the left.」。'],
    [28, 's5', 'self_action', 'photo-retake-dialogue', 'short_dialogue', 'Say both lines: "One more photo?" "My smile has already gone home."', '說出這兩句對話：「One more photo?」「My smile has already gone home.」。'],
    [28, 's6', 'self_action', 'photo-face-holiday', 'absurd_proposal', 'Suggest taking one group picture of everyone\'s shoes so nobody has to judge their own face.', '提議拍一張大家鞋子的合照，這樣就沒人需要檢查自己的臉。'],

    [29, 'i1', 'interaction', 'help-boundary-reply', 'compose_reply', 'Get a non-wolf to suggest the words for thanking a friend while asking them to check before helping next time.', '讓一位非狼玩家想一句話，既謝謝朋友，也請對方下次幫忙前先問。'],
    [29, 'i2', 'interaction', 'help-no-touch-task', 'personal_boundary', 'Get a non-wolf to identify one everyday task they would not want a friend to take over.', '讓一位非狼玩家說出一件不希望朋友接手的日常事情。'],
    [29, 'i3', 'interaction', 'help-undo-step', 'practical_fix', 'Get a non-wolf to suggest what to do first after a friend reorganizes your desk and you cannot find anything.', '讓一位非狼玩家建議，朋友重整書桌害你找不到東西，第一步該怎麼做。'],
    [29, 'i4', 'interaction', 'help-intention-result', 'choose_one', 'Get a non-wolf to choose which matters more to them when accepting help: being asked first or getting a good result.', '讓一位非狼玩家選擇，接受幫忙時更在意「先被問過」還是「結果不錯」。'],
    [29, 's1', 'self_action', 'help-thanks-but-map', 'quoted_line', 'Say, "Thank you for cleaning. Where did my entire life go?"', '說出「Thank you for cleaning. Where did my entire life go?」。'],
    [29, 's2', 'self_action', 'help-permission-ticket', 'absurd_proposal', 'Suggest giving friends permission slips before they are allowed to organize your belongings.', '提議朋友想整理你的東西，必須先拿到你的許可單。'],
    [29, 's3', 'self_action', 'help-desk-notice', 'spoken_notice', 'Read an imaginary desk sign: "This mess is in a carefully chosen order."', '唸出想像中的書桌告示：「This mess is in a carefully chosen order.」。'],
    [29, 's4', 'self_action', 'help-cooking-takeover', 'analogy', 'Compare unwanted help to someone adding salt to your soup before tasting it.', '把沒先問的幫忙，比喻成有人沒嚐就替你的湯加鹽。'],
    [29, 's5', 'self_action', 'help-takeback-phrase', 'compose_reply', 'Say a refusal of help that starts with "Please leave this problem with me".', '說一句婉拒幫忙的話，以「Please leave this problem with me」開頭。'],
    [29, 's6', 'self_action', 'help-ask-first-rule', 'spoken_rule', 'Propose that moving another person\'s things requires asking exactly one question: "May I?"', '提出規則：移動別人的東西前，必須先問「May I?」。'],

    [30, 'i1', 'interaction', 'invitation-cancel-reply', 'compose_reply', 'Get a non-wolf to suggest a cancellation message that honestly says you need rest.', '讓一位非狼玩家想一句取消邀約的訊息，直接說你需要休息。'],
    [30, 'i2', 'interaction', 'invitation-short-version', 'practical_fix', 'Get a non-wolf to suggest a shorter version of an all-day outing for a tired friend.', '讓一位非狼玩家建議，怎麼把整天出遊縮短，讓疲累的朋友也能參加。'],
    [30, 'i3', 'interaction', 'invitation-cancel-deadline', 'time_limit', 'Get a non-wolf to say how many hours before a casual outing they would want to hear about a cancellation.', '讓一位非狼玩家說出，輕鬆出遊若取消，希望至少提前幾小時知道。'],
    [30, 'i4', 'interaction', 'invitation-solo-continue', 'fairness_exception', 'Get a non-wolf to say whether a friend should still go to a booked activity when their tired companion cancels.', '讓一位非狼玩家表態，同伴累了取消時，朋友是否該自己去已預約的活動。'],
    [30, 's1', 'self_action', 'invitation-past-self', 'quoted_line', 'Say, "Yesterday me made plans that today me cannot afford in energy."', '說出「Yesterday me made plans that today me cannot afford in energy.」。'],
    [30, 's2', 'self_action', 'invitation-energy-battery', 'analogy', 'Compare your social energy to a phone that shows ten percent battery.', '把自己的社交精力比喻成只剩百分之十電量的手機。'],
    [30, 's3', 'self_action', 'invitation-sofa-address', 'object_address', 'Promise your sofa aloud that you will not leave it for long.', '直接對沙發保證，你不會離開它太久。'],
    [30, 's4', 'self_action', 'invitation-rest-appointment', 'absurd_proposal', 'Suggest putting an appointment with your pillow on the calendar before accepting invitations.', '提議先在行事曆排好與枕頭的約會，再接受別人的邀請。'],
    [30, 's5', 'self_action', 'invitation-one-free-cancel', 'spoken_rule', 'Propose that friends each get one no-explanation cancellation per month.', '提議朋友每月各有一次，不用說明理由就能取消約會的機會。'],
    [30, 's6', 'self_action', 'invitation-energy-receipt', 'spoken_notice', 'Read out an imaginary warning: "Your weekend contains more plans than your body can support."', '唸出想像中的警告：「Your weekend contains more plans than your body can support.」。'],

    [31, 'i1', 'interaction', 'creation-specific-praise', 'compose_reply', 'Get a non-wolf to suggest one honest compliment for a cake that looks beautiful but tastes too salty.', '讓一位非狼玩家替外表漂亮、味道卻太鹹的蛋糕，想一句真心稱讚。'],
    [31, 'i2', 'interaction', 'creation-feedback-permission', 'direct_question', 'Get a non-wolf to ask you whether the friend wanted encouragement or criticism.', '讓一位非狼玩家問你：那位朋友想要鼓勵，還是批評建議。'],
    [31, 'i3', 'interaction', 'creation-criticism-place', 'choose_one', 'Get a non-wolf to choose whether they would give an honest negative opinion privately or in front of the group.', '讓一位非狼玩家選擇，負面真心話要私下說，還是在大家面前說。'],
    [31, 'i4', 'interaction', 'creation-practice-audience', 'practical_fix', 'Get a non-wolf to suggest a way to support a friend\'s music without pretending to enjoy the song.', '讓一位非狼玩家建議，不假裝喜歡歌曲，也能支持朋友做音樂的方法。'],
    [31, 's1', 'self_action', 'creation-heart-taste-split', 'quoted_line', 'Say, "My heart supports you. My ears have questions."', '說出「My heart supports you. My ears have questions.」。'],
    [31, 's2', 'self_action', 'creation-honesty-permission', 'compose_reply', 'Ask aloud, "Would you like a hug or a useful opinion?"', '問出「Would you like a hug or a useful opinion?」。'],
    [31, 's3', 'self_action', 'creation-review-footnote', 'spoken_notice', 'Read this imaginary review: "Five stars for courage. I am still thinking about the taste."', '唸出想像中的評論：「Five stars for courage. I am still thinking about the taste.」。'],
    [31, 's4', 'self_action', 'creation-feedback-menu', 'absurd_proposal', 'Suggest letting the maker choose a small, medium, or large serving of honest feedback.', '提議讓創作者選擇，要小份、中份，還是大份的真心建議。'],
    [31, 's5', 'self_action', 'creation-thanks-before-opinion', 'spoken_rule', 'Propose that you must thank a friend for sharing their work before saying whether you like it.', '提出規則：評論喜不喜歡之前，必須先謝謝朋友願意分享作品。'],
    [31, 's6', 'self_action', 'creation-cake-defense', 'object_address', 'Tell an imaginary salty cake that it deserves a second chance as bread.', '對想像中太鹹的蛋糕說，它值得有第二次機會當麵包。'],

    [32, 'i1', 'interaction', 'borrow-scratch-reply', 'compose_reply', 'Get a non-wolf to suggest what to say when a borrowed book comes back with a folded cover.', '讓一位非狼玩家想一句話，回應借出的書被折壞封面這件事。'],
    [32, 'i2', 'interaction', 'borrow-repair-offer', 'practical_fix', 'Get a non-wolf to suggest a fair offer after scratching a friend\'s favorite pan.', '讓一位非狼玩家建議，刮傷朋友最愛的鍋子後，可以怎麼補償。'],
    [32, 'i3', 'interaction', 'borrow-never-lend', 'personal_boundary', 'Get a non-wolf to identify a possession they would happily show a friend but never lend out.', '讓一位非狼玩家說出一樣願意給朋友看，卻絕不外借的物品。'],
    [32, 'i4', 'interaction', 'borrow-wear-threshold', 'fairness_exception', 'Get a non-wolf to say whether normal wear should count as damage when an item is borrowed.', '讓一位非狼玩家表態，借用造成的正常磨損是否也算損壞。'],
    [32, 's1', 'self_action', 'borrow-book-holiday', 'quoted_line', 'Say, "My book went on holiday and came back looking much older."', '說出「My book went on holiday and came back looking much older.」。'],
    [32, 's2', 'self_action', 'object-apology', 'object_address', 'Apologize aloud to your favorite mug for trusting someone else with it.', '對最喜歡的杯子說句道歉，因為你把它交給別人照顧。'],
    [32, 's3', 'self_action', 'borrow-care-instructions', 'spoken_notice', 'Read an imaginary lending label: "Please return with the same number of pieces."', '唸出想像中的借用標籤：「Please return with the same number of pieces.」。'],
    [32, 's4', 'self_action', 'borrow-deposit-snack', 'price_offer', 'Suggest one snack a borrower should leave as a deposit for your favorite book.', '提議借你最愛的書時，對方必須留下哪一種點心當押金。'],
    [32, 's5', 'self_action', 'borrow-photo-checkin', 'absurd_proposal', 'Suggest sending a borrowed plant a daily care report while it is away from its owner.', '提議替借來的植物每天寫照顧報告，交給它的主人。'],
    [32, 's6', 'self_action', 'borrow-scratch-dialogue', 'short_dialogue', 'Say both lines: "It still works." "Yes, but now it has a story I did not ask for."', '說出這兩句對話：「It still works.」「Yes, but now it has a story I did not ask for.」。'],
    [33, 'i1', 'interaction', 'assistant-never-delegate', 'personal_boundary', 'Get a non-wolf to identify one purchase they would never allow a personal assistant to make for them.', '讓一位非狼玩家說出一種絕不交給私人助理代買的東西。'],
    [33, 'i2', 'interaction', 'assistant-bad-meal-reply', 'compose_reply', 'Get a non-wolf to suggest what to tell an assistant that keeps choosing the same restaurant every Friday.', '讓一位非狼玩家想一句話，回應每週五都選同一家餐廳的助理。'],
    [33, 'i3', 'interaction', 'assistant-budget-cap', 'number_limit', 'Get a non-wolf to set a spending limit for an assistant buying groceries without checking first.', '讓一位非狼玩家訂出助理不用先問，就能買日用品的金額上限。'],
    [33, 'i4', 'interaction', 'assistant-privacy-input', 'choose_one', 'Get a non-wolf to choose which an assistant may read: their shopping list or their private messages.', '讓一位非狼玩家選擇，願意讓助理看購物清單，還是私人訊息。'],
    [33, 's1', 'self_action', 'assistant-surprise-rejection', 'quoted_line', 'Say, "Apparently, I love this restaurant. Nobody asked me."', '說出「Apparently, I love this restaurant. Nobody asked me.」。'],
    [33, 's2', 'self_action', 'assistant-human-override', 'spoken_rule', 'Propose a button that cancels all assistant suggestions for one day without needing a reason.', '提議設一個按鈕，不必說理由就能取消助理一整天的建議。'],
    [33, 's3', 'self_action', 'assistant-own-socks', 'absurd_proposal', 'Suggest making the assistant try every pair of socks before it buys any for you.', '提議助理替你買襪子前，必須先親自試穿每一雙。'],
    [33, 's4', 'self_action', 'assistant-preference-update', 'spoken_notice', 'Read a message to your assistant: "Update: I am allowed to dislike things I liked last week."', '唸出給助理的訊息：「Update: I am allowed to dislike things I liked last week.」。'],
    [33, 's5', 'self_action', 'assistant-wrong-day-dialogue', 'short_dialogue', 'Say both lines: "I planned your perfect day." "Did you leave any room for me?"', '說出這兩句對話：「I planned your perfect day.」「Did you leave any room for me?」。'],
    [33, 's6', 'self_action', 'assistant-taste-map', 'analogy', 'Compare an assistant\'s picture of your taste to a map with some streets missing.', '把助理眼中的你的喜好，比喻成少畫了幾條街的地圖。'],

    [34, 'i1', 'interaction', 'planner-share-job-reply', 'compose_reply', 'Get a non-wolf to suggest a message asking friends to take over planning the next gathering.', '讓一位非狼玩家想一句訊息，請朋友接手安排下一次聚會。'],
    [34, 'i2', 'interaction', 'planner-first-job', 'practical_fix', 'Get a non-wolf to choose one planning job they could take from an overworked organizer.', '讓一位非狼玩家選一件自己可以從忙壞的主辦人手上接過的安排工作。'],
    [34, 'i3', 'interaction', 'planner-late-choice', 'fairness_exception', 'Get a non-wolf to say what should happen when a friend rejects the restaurant after everyone else has agreed.', '讓一位非狼玩家說出，大家都同意餐廳後才有人反對，應怎麼處理。'],
    [34, 'i4', 'interaction', 'planner-reminder-limit', 'number_limit', 'Get a non-wolf to set the maximum number of reminders an organizer should send before making a booking.', '讓一位非狼玩家訂出主辦人訂位前，最多該催大家回覆幾次。'],
    [34, 's1', 'self_action', 'planner-job-without-contract', 'quoted_line', 'Say, "I planned one picnic and accidentally got a permanent job."', '說出「I planned one picnic and accidentally got a permanent job.」。'],
    [34, 's2', 'self_action', 'planner-payment-snacks', 'price_offer', 'State how many slices of cake would count as payment for arranging the whole gathering.', '說出安排整場聚會，應該拿到幾片蛋糕當報酬。'],
    [34, 's3', 'self_action', 'planner-silence-vote', 'spoken_rule', 'Propose that anyone who does not reply by the deadline must accept the restaurant choice.', '提出規則：期限前不回覆的人，必須接受最後選定的餐廳。'],
    [34, 's4', 'self_action', 'planner-invisible-work-list', 'spoken_notice', 'Read a pretend job listing: "Wanted: one friend who can answer a simple question about Saturday."', '唸出想像中的徵人啟事：「Wanted: one friend who can answer a simple question about Saturday.」。'],
    [34, 's5', 'self_action', 'planner-calendar-address', 'object_address', 'Ask your calendar aloud to stop volunteering you for things.', '直接請行事曆不要再替你自願接工作。'],
    [34, 's6', 'self_action', 'planner-turn-taking', 'absurd_proposal', 'Suggest passing the planning duty to whoever most recently complained about the plans.', '提議把安排工作交給最近一次抱怨行程的人。'],

    [35, 'i1', 'interaction', 'hobby-free-request-reply', 'compose_reply', 'Get a non-wolf to suggest how to refuse a request to make something for free just because you enjoy making it.', '讓一位非狼玩家想一句拒絕的話，回應「既然你喜歡做，就免費幫我做」。'],
    [35, 'i2', 'interaction', 'hobby-first-sale-price', 'price_offer', 'Get a non-wolf to suggest a price for a handmade item that took you five evenings to finish.', '讓一位非狼玩家替花了你五個晚上做完的手作品開價。'],
    [35, 'i3', 'interaction', 'hobby-order-boundary', 'personal_boundary', 'Get a non-wolf to identify one customer demand that would make them stop taking hobby orders.', '讓一位非狼玩家說出一種會讓自己停止接興趣訂單的顧客要求。'],
    [35, 'i4', 'interaction', 'hobby-profit-accounting', 'direct_question', 'Get a non-wolf to ask whether you counted your own time when deciding if the hobby made a profit.', '讓一位非狼玩家問你：計算興趣賺不賺錢時，有沒有把自己的時間算進去。'],
    [35, 's1', 'self_action', 'hobby-lost-day-off', 'quoted_line', 'Say, "My hobby got a job, and now I need a new hobby."', '說出「My hobby got a job, and now I need a new hobby.」。'],
    [35, 's2', 'self_action', 'hobby-no-sale-sign', 'spoken_notice', 'Read an imaginary sign on your craft table: "Not for sale. Not even for a very nice comment."', '唸出手作桌上的想像告示：「Not for sale. Not even for a very nice comment.」。'],
    [35, 's3', 'self_action', 'hobby-weekend-fee', 'price_offer', 'Add an imaginary extra charge for working on your hobby during your only day off.', '說出一筆額外費用，專門收在唯一休假日還要做興趣訂單的時候。'],
    [35, 's4', 'self_action', 'hobby-imperfect-protection', 'spoken_rule', 'Propose keeping one hobby project every month that nobody is allowed to buy.', '提議每個月保留一件興趣作品，任何人都不准買走。'],
    [35, 's5', 'self_action', 'hobby-sales-pressure-dialogue', 'short_dialogue', 'Say both lines: "You could sell these." "I could also keep enjoying them."', '說出這兩句對話：「You could sell these.」「I could also keep enjoying them.」。'],
    [35, 's6', 'self_action', 'hobby-supplies-address', 'object_address', 'Tell your art supplies aloud that they are not required to pay the rent.', '直接對創作用具說，它們沒有義務替你付房租。'],

    [36, 'i1', 'interaction', 'opinion-change-announcement', 'compose_reply', 'Get a non-wolf to suggest one sentence for telling friends you no longer believe a rule you used to defend.', '讓一位非狼玩家想一句話，告訴朋友你不再相信以前堅持的規則。'],
    [36, 'i2', 'interaction', 'opinion-old-quote-response', 'practical_fix', 'Get a non-wolf to suggest how to respond when a friend keeps showing you an old message to prove you changed.', '讓一位非狼玩家建議，朋友一直翻舊訊息證明你變了，該怎麼回應。'],
    [36, 'i3', 'interaction', 'opinion-change-question', 'direct_question', 'Get a non-wolf to ask you what experience changed your mind, without asking you to defend the old view.', '讓一位非狼玩家問你哪個經驗改變了想法，而不是要你替舊立場辯護。'],
    [36, 'i4', 'interaction', 'opinion-update-frequency', 'time_limit', 'Get a non-wolf to say how many years an old opinion should remain fair material for friendly teasing.', '讓一位非狼玩家說出，多年前的舊想法最多可以被朋友拿來開玩笑幾年。'],
    [36, 's1', 'self_action', 'opinion-software-update', 'spoken_notice', 'Announce, "Small update: I no longer agree with the person I was last year."', '宣布「Small update: I no longer agree with the person I was last year.」。'],
    [36, 's2', 'self_action', 'opinion-old-self-refund', 'quoted_line', 'Say, "Please direct all complaints to the earlier version of me."', '說出「Please direct all complaints to the earlier version of me.」。'],
    [36, 's3', 'self_action', 'opinion-expiry-date', 'absurd_proposal', 'Suggest putting expiry dates on very confident opinions.', '提議替說得非常有自信的意見加上有效期限。'],
    [36, 's4', 'self_action', 'opinion-mind-clothes', 'analogy', 'Compare changing your mind to replacing shoes that no longer fit.', '把改變想法比喻成換掉已經不合腳的鞋子。'],
    [36, 's5', 'self_action', 'opinion-suspend-always', 'spoken_rule', 'Propose avoiding the word "always" whenever you announce a new personal rule.', '提議宣布新的生活原則時，都不准使用「always」這個字。'],
    [36, 's6', 'self_action', 'opinion-correction-line', 'correction', 'Correct the sentence "I was wrong about everything" to "I changed my mind about one thing" aloud.', '把「I was wrong about everything」口頭更正成「I changed my mind about one thing」。'],

    [37, 'i1', 'interaction', 'discard_one_of_two', 'choose_one', 'Get a non-wolf to choose which you should discard: a broken umbrella or an empty biscuit tin from a happy trip.', '讓一位非狼玩家選擇，你該丟掉壞雨傘，還是愉快旅行留下的空餅乾盒。'],
    [37, 'i2', 'interaction', 'old-object-alternative-storage', 'practical_fix', 'Get a non-wolf to suggest how to keep the memory of a worn-out T-shirt without keeping the whole shirt.', '讓一位非狼玩家建議，不留下整件破舊上衣，仍能保存回憶的方法。'],
    [37, 'i3', 'interaction', 'old-object-last-use-question', 'direct_question', 'Get a non-wolf to ask when you last used an old object you are defending.', '讓一位非狼玩家問你，上次使用正在替它辯護的舊物是什麼時候。'],
    [37, 'i4', 'interaction', 'old-object-space-limit', 'number_limit', 'Get a non-wolf to set a maximum number of boxes for things kept only for memories.', '讓一位非狼玩家訂出，只為回憶而留的東西最多能放幾箱。'],
    [37, 's1', 'self_action', 'old-object-witness', 'quoted_line', 'Say, "This old ticket is evidence that I once left the house."', '說出「This old ticket is evidence that I once left the house.」。'],
    [37, 's2', 'self_action', 'old-object-retirement', 'object_address', 'Tell an old backpack aloud that it has earned a quiet retirement.', '直接告訴舊背包，它已經值得安靜退休了。'],
    [37, 's3', 'self_action', 'old-object-museum-label', 'spoken_notice', 'Read an imaginary label for your drawer: "Objects whose owners are not ready to say goodbye."', '唸出抽屜的想像標籤：「Objects whose owners are not ready to say goodbye.」。'],
    [37, 's4', 'self_action', 'old-object-one-day-hearing', 'absurd_proposal', 'Suggest giving an old object one last day of use before deciding whether to throw it away.', '提議決定丟不丟舊物之前，先讓它最後服役一天。'],
    [37, 's5', 'self_action', 'old-object-new-arrival-rule', 'spoken_rule', 'Propose that every new mug entering your home must explain which old mug it will replace.', '提議每個新杯子進家門前，都得說明它要取代哪個舊杯子。'],
    [37, 's6', 'self_action', 'old-object-empty-box-dialogue', 'short_dialogue', 'Say both lines: "Why keep an empty box?" "It is full of reasons I have forgotten."', '說出這兩句對話：「Why keep an empty box?」「It is full of reasons I have forgotten.」。'],

    [38, 'i1', 'interaction', 'retelling-correction-reply', 'compose_reply', 'Get a non-wolf to suggest a sentence for correcting a funny story without stopping the fun.', '讓一位非狼玩家想一句話，可以更正好笑的故事，又不叫大家停止聊天。'],
    [38, 'i2', 'interaction', 'retelling-missing-detail', 'direct_question', 'Get a non-wolf to ask what detail your friends usually leave out when telling your story.', '讓一位非狼玩家問你，朋友講你的故事時通常漏掉哪個細節。'],
    [38, 'i3', 'interaction', 'retelling-permission-boundary', 'personal_boundary', 'Get a non-wolf to identify one kind of funny mistake that friends should not retell to strangers.', '讓一位非狼玩家說出一種不適合被朋友轉述給陌生人聽的好笑失誤。'],
    [38, 'i4', 'interaction', 'retelling-fact-check', 'fairness_exception', 'Get a non-wolf to say whether a funnier version is acceptable when the person in the story says it is inaccurate.', '讓一位非狼玩家表態，故事本人說不正確時，仍可保留更好笑的版本嗎。'],
    [38, 's1', 'self_action', 'retelling-witness-quote', 'quoted_line', 'Say, "I was there, but apparently I am not the expert on this story."', '說出「I was there, but apparently I am not the expert on this story.」。'],
    [38, 's2', 'self_action', 'retelling-size-correction', 'correction', 'Correct "I was lost for hours" to "I missed one turn" aloud.', '把「I was lost for hours」口頭更正成「I missed one turn」。'],
    [38, 's3', 'self_action', 'retelling-fiction-label', 'spoken_notice', 'Add this spoken warning to a retold mistake: "Based on a true event, with several unpaid changes."', '在轉述失誤時加上警語：「Based on a true event, with several unpaid changes.」。'],
    [38, 's4', 'self_action', 'retelling-fee', 'price_offer', 'Suggest charging one snack each time a friend retells your most famous mistake.', '提議朋友每轉述一次你最有名的失誤，就要付一份點心。'],
    [38, 's5', 'self_action', 'retelling-right-of-reply', 'spoken_rule', 'Propose giving the person in a funny story ten seconds to correct the facts.', '提議每個好笑故事的當事人，都有十秒鐘可以更正事實。'],
    [38, 's6', 'self_action', 'retelling-two-endings', 'short_dialogue', 'Say both lines: "And then everyone laughed." "There were only two people there."', '說出這兩句對話：「And then everyone laughed.」「There were only two people there.」。'],

    [39, 'i1', 'interaction', 'impression-alternative-cause', 'practical_fix', 'Get a non-wolf to give a possible reason, other than rudeness, for a person being quiet at a first meeting.', '讓一位非狼玩家替初次見面時不說話的人，提出「沒禮貌」以外的可能原因。'],
    [39, 'i2', 'interaction', 'impression-second-meeting', 'choose_one', 'Get a non-wolf to choose a better second meeting for a quiet person: a large party or a walk with one friend.', '讓一位非狼玩家選擇，安靜的人第二次見面更適合大派對，還是和一位朋友散步。'],
    [39, 'i3', 'interaction', 'impression-revision-question', 'direct_question', 'Get a non-wolf to ask what made you realize your first impression was wrong.', '讓一位非狼玩家問你，是什麼讓你發現第一印象錯了。'],
    [39, 'i4', 'interaction', 'impression-chance-count', 'number_limit', 'Get a non-wolf to say how many meetings they would allow before deciding they do not enjoy someone\'s company.', '讓一位非狼玩家說出，會見面幾次後才判斷自己不喜歡和對方相處。'],
    [39, 's1', 'self_action', 'impression-book-cover', 'analogy', 'Compare judging a person by one meeting to judging a book by one page.', '把只見一次就評斷一個人，比喻成只讀一頁就評斷整本書。'],
    [39, 's2', 'self_action', 'impression-internal-review', 'quoted_line', 'Say, "My first impression would like to apologize."', '說出「My first impression would like to apologize.」。'],
    [39, 's3', 'self_action', 'impression-review-update', 'spoken_notice', 'Announce, "Review updated: less unfriendly, more sleepy."', '宣布「Review updated: less unfriendly, more sleepy.」。'],
    [39, 's4', 'self_action', 'impression-hunger-exception', 'spoken_rule', 'Propose that first impressions formed while hungry must be checked again after a meal.', '提議肚子餓時產生的第一印象，吃飽後都必須重新確認。'],
    [39, 's5', 'self_action', 'impression-quiet-dialogue', 'short_dialogue', 'Say both lines: "You looked very serious." "I was trying to remember your name."', '說出這兩句對話：「You looked very serious.」「I was trying to remember your name.」。'],
    [39, 's6', 'self_action', 'impression-wrong-label', 'correction', 'Replace the description "boring" with "not comfortable yet" aloud.', '口頭把「boring」這個評語改成「not comfortable yet」。'],

    [40, 'i1', 'interaction', 'habit-try-once', 'invitation_reply', 'Get a non-wolf to say whether they would try sorting their snacks by the order they plan to eat them.', '讓一位非狼玩家表態，願不願意試著按吃的順序排列點心。'],
    [40, 'i2', 'interaction', 'habit-useful-explanation', 'explain_benefit', 'Get a non-wolf to give a practical benefit of checking a door twice before leaving.', '讓一位非狼玩家說出，出門前檢查門兩次有什麼實際好處。'],
    [40, 'i3', 'interaction', 'habit-roommate-limit', 'personal_boundary', 'Get a non-wolf to identify one harmless habit they would tolerate in a friend but not in a roommate.', '讓一位非狼玩家說出一種可接受朋友做，卻不接受室友做的無害習慣。'],
    [40, 'i4', 'interaction', 'habit-interruption-question', 'direct_question', 'Get a non-wolf to ask what happens if you cannot finish one of your small routines.', '讓一位非狼玩家問你，如果某個小習慣沒辦法做完，會怎麼樣。'],
    [40, 's1', 'self_action', 'habit-system-defense', 'quoted_line', 'Say, "It is not a strange habit. It is a system with very few users."', '說出「It is not a strange habit. It is a system with very few users.」。'],
    [40, 's2', 'self_action', 'habit-spoon-address', 'object_address', 'Tell an imaginary wrong-sized spoon that it is not suitable for today\'s breakfast.', '直接告訴想像中尺寸不對的湯匙，它不適合今天的早餐。'],
    [40, 's3', 'self_action', 'habit-instruction-note', 'spoken_notice', 'Read out this instruction: "Please do not move the mug. I know exactly why it is there."', '唸出這段說明：「Please do not move the mug. I know exactly why it is there.」。'],
    [40, 's4', 'self_action', 'habit-personal-manual', 'absurd_proposal', 'Suggest giving new roommates a one-page guide to your harmless habits.', '提議給新室友一頁指南，介紹自己無害的小習慣。'],
    [40, 's5', 'self_action', 'habit-no-explanation-rule', 'spoken_rule', 'Propose that everyone gets one harmless habit they never have to explain.', '提議每個人都有一種永遠不必向別人解釋的無害習慣。'],
    [40, 's6', 'self_action', 'habit-socks-dialogue', 'short_dialogue', 'Say both lines: "Does it matter which sock goes first?" "To the socks, perhaps."', '說出這兩句對話：「Does it matter which sock goes first?」「To the socks, perhaps.」。'],
    [41, 'i1', 'interaction', 'purchase-return-reply', 'compose_reply', 'Get a non-wolf to suggest what to tell a shop when a new pillow is less comfortable than the old one.', '讓一位非狼玩家想一句話，向店家反映新枕頭比舊枕頭還難睡。'],
    [41, 'i2', 'interaction', 'purchase-real-use-guess', 'number_guess', 'Get a non-wolf to guess how many times you used an exercise machine before it became a place to hang clothes.', '讓一位非狼玩家猜，運動器材在變成衣架前，你用了幾次。'],
    [41, 'i3', 'interaction', 'purchase-save-or-sell', 'choose_one', 'Get a non-wolf to choose what you should do with a bread machine you used once: try it again or sell it.', '讓一位非狼玩家選擇，只用過一次的麵包機該再試一次，還是賣掉。'],
    [41, 'i4', 'interaction', 'purchase-ad-rewrite', 'correction', 'Get a non-wolf to replace "This will change your life" with a more honest line for an ordinary kitchen tool.', '讓一位非狼玩家替普通廚房工具，把「This will change your life」改成較誠實的廣告。'],
    [41, 's1', 'self_action', 'purchase-new-self-cost', 'quoted_line', 'Say, "I bought the equipment, but the new personality was not included."', '說出「I bought the equipment, but the new personality was not included.」。'],
    [41, 's2', 'self_action', 'purchase-dust-rent', 'price_offer', 'State how much an unused exercise machine should pay you for occupying the floor.', '說出閒置運動器材占著地板，應該付你多少錢。'],
    [41, 's3', 'self_action', 'purchase-ad-disclaimer', 'spoken_notice', 'Read an imaginary warning on a kitchen gadget: "Buying this does not include wanting to cook."', '唸出廚房工具上的想像警語：「Buying this does not include wanting to cook.」。'],
    [41, 's4', 'self_action', 'purchase-future-self-check', 'spoken_rule', 'Propose waiting until you have borrowed a gadget once before buying your own.', '提出規則：先借工具用過一次，才能買自己的。'],
    [41, 's5', 'self_action', 'purchase-unused-tool-address', 'object_address', 'Tell an unused blender aloud that the problem is not personal.', '直接告訴閒置的果汁機，這不是針對它個人的問題。'],
    [41, 's6', 'self_action', 'purchase-box-dialogue', 'short_dialogue', 'Say both lines: "Do you still use it?" "I use the box to store something else."', '說出這兩句對話：「Do you still use it?」「I use the box to store something else.」。'],

    [42, 'i1', 'interaction', 'care-thank-you-specific', 'compose_reply', 'Get a non-wolf to suggest a thank-you message for a friend who remembered how you take your tea.', '讓一位非狼玩家替記得你喝茶喜好的朋友，想一句感謝訊息。'],
    [42, 'i2', 'interaction', 'care-no-money-help', 'practical_fix', 'Get a non-wolf to suggest one helpful thing to do for a tired friend without buying anything.', '讓一位非狼玩家建議，不花錢也能幫助疲累朋友的一件事。'],
    [42, 'i3', 'interaction', 'care-private-or-public', 'choose_one', 'Get a non-wolf to choose how they would thank a shy friend: a private message or praise in a group.', '讓一位非狼玩家選擇，要私訊感謝害羞的朋友，還是在群組公開稱讚。'],
    [42, 'i4', 'interaction', 'care-notice-question', 'direct_question', 'Get a non-wolf to ask how a friend noticed that you needed help before you asked.', '讓一位非狼玩家問你，朋友怎麼在你開口前就發現你需要幫忙。'],
    [42, 's1', 'self_action', 'care-small-big-quote', 'quoted_line', 'Say, "It took them ten seconds. I still remember it years later."', '說出「It took them ten seconds. I still remember it years later.」。'],
    [42, 's2', 'self_action', 'care-receipt', 'spoken_notice', 'Read an imaginary receipt: "One kind message. Total cost: zero. Still valuable."', '唸出想像中的收據：「One kind message. Total cost: zero. Still valuable.」。'],
    [42, 's3', 'self_action', 'care-repay-pressure-rule', 'spoken_rule', 'Propose that a small act of care must not create a debt the other person has to repay.', '提出規則：小小的體貼不能變成對方必須還的人情債。'],
    [42, 's4', 'self_action', 'care-cup-thanks', 'object_address', 'Thank an imaginary cup of tea aloud for helping someone through a difficult day.', '直接感謝想像中的一杯茶，陪某個人度過難熬的一天。'],
    [42, 's5', 'self_action', 'care-place-in-memory', 'analogy', 'Compare a small kind act to a light left on for someone coming home late.', '把小小的善意比喻成替晚歸的人留著的一盞燈。'],
    [42, 's6', 'self_action', 'care-no-grand-speech', 'short_dialogue', 'Say both lines: "I did not do much." "You noticed. That was the important part."', '說出這兩句對話：「I did not do much.」「You noticed. That was the important part.」。'],

    [43, 'i1', 'interaction', 'plans-rain-replacement', 'practical_fix', 'Get a non-wolf to suggest a replacement for a picnic when it starts raining after everyone arrives.', '讓一位非狼玩家建議，大家到齊後野餐突然下雨，可以改做什麼。'],
    [43, 'i2', 'interaction', 'plans-turning-point-question', 'direct_question', 'Get a non-wolf to ask when a day that went wrong started becoming enjoyable.', '讓一位非狼玩家問你，出錯的一天是從哪個時刻開始變好玩的。'],
    [43, 'i3', 'interaction', 'plans-change-threshold', 'time_limit', 'Get a non-wolf to give a waiting time after which they would abandon a restaurant queue and go somewhere else.', '讓一位非狼玩家說出，餐廳排隊等多久後會放棄，改去別家。'],
    [43, 'i4', 'interaction', 'plans-missed-train-message', 'compose_reply', 'Get a non-wolf to suggest a message to friends after you miss a train but discover a good nearby café.', '讓一位非狼玩家想一句訊息，告訴朋友你錯過火車，卻發現附近有間好咖啡店。'],
    [43, 's1', 'self_action', 'plans-failure-success', 'quoted_line', 'Say, "The plan failed. The day did not."', '說出「The plan failed. The day did not.」。'],
    [43, 's2', 'self_action', 'plans-weather-thanks', 'object_address', 'Thank an imaginary rain cloud aloud for changing your plans.', '直接感謝想像中的雨雲，替你改變了計畫。'],
    [43, 's3', 'self_action', 'plans-blank-space', 'absurd_proposal', 'Suggest leaving one hour on every trip plan labeled "Something will go wrong here."', '提議每次旅行都空出一小時，標成「Something will go wrong here.」。'],
    [43, 's4', 'self_action', 'plans-map-correction', 'correction', 'Change the phrase "We got lost" to "We found a place we had not planned to visit" aloud.', '口頭把「We got lost」改成「We found a place we had not planned to visit」。'],
    [43, 's5', 'self_action', 'plans-detour-dialogue', 'short_dialogue', 'Say both lines: "This was not on the schedule." "Neither was having this much fun."', '說出這兩句對話：「This was not on the schedule.」「Neither was having this much fun.」。'],
    [43, 's6', 'self_action', 'plans-stop-fixing-rule', 'spoken_rule', 'Propose stopping all attempts to repair the original plan once everyone is already enjoying the new one.', '提議大家已經喜歡新行程時，就停止設法恢復原計畫。'],

    [44, 'i1', 'interaction', 'skill-use-case', 'practical_fix', 'Get a non-wolf to suggest a real situation where being able to untangle earphones quickly would help.', '讓一位非狼玩家提出一個快速解開耳機線能派上用場的實際情況。'],
    [44, 'i2', 'interaction', 'skill-one-lesson-request', 'direct_question', 'Get a non-wolf to ask you to explain the first step of a small skill you mention.', '讓一位非狼玩家請你解釋，你提到的小本事該怎麼做第一步。'],
    [44, 'i3', 'interaction', 'skill-trade-value', 'price_offer', 'Get a non-wolf to say what snack they would offer in return for a lesson in opening a stubborn jar.', '讓一位非狼玩家說出，願意用什麼點心交換一堂開緊瓶蓋的教學。'],
    [44, 'i4', 'interaction', 'skill-survival-choice', 'choose_one', 'Get a non-wolf to choose which skill they would want during a power cut: finding things in the dark or remembering phone numbers.', '讓一位非狼玩家選擇，停電時更想會摸黑找東西，還是記住電話號碼。'],
    [44, 's1', 'self_action', 'skill-small-claim', 'quoted_line', 'Say, "My greatest talent has never appeared on an application form."', '說出「My greatest talent has never appeared on an application form.」。'],
    [44, 's2', 'self_action', 'skill-useless-until-needed', 'spoken_notice', 'Read a pretend advertisement: "Available for difficult jars and impossible knots."', '唸出想像中的廣告：「Available for difficult jars and impossible knots.」。'],
    [44, 's3', 'self_action', 'skill-appliance-listening', 'sound_imitation', 'Make the short sound of a washing machine finishing, as an example of a sound you recognize at once.', '模仿洗衣機洗完時的短提示聲，作為你一聽就懂的聲音例子。'],
    [44, 's4', 'self_action', 'skill-cupboard-trophy', 'absurd_proposal', 'Suggest giving a trophy to whoever can fit the most dishes safely in a drying rack.', '提議頒一座獎盃給最會把碗盤安全塞進瀝水架的人。'],
    [44, 's5', 'self_action', 'skill-real-emergency-dialogue', 'short_dialogue', 'Say both lines: "We need an expert." "Does anyone need a fitted sheet folded?"', '說出這兩句對話：「We need an expert.」「Does anyone need a fitted sheet folded?」。'],
    [44, 's6', 'self_action', 'skill-credit-rule', 'spoken_rule', 'Propose that opening a stuck lid earns the opener the first serving from the jar.', '提出規則：打開卡住瓶蓋的人，可以第一個吃瓶裡的食物。'],

    [45, 'i1', 'interaction', 'joy-two-minutes', 'practical_fix', 'Get a non-wolf to suggest a pleasant break that takes less than two minutes and no screen.', '讓一位非狼玩家建議一個不到兩分鐘、也不用螢幕的愉快小休息。'],
    [45, 'i2', 'interaction', 'joy-time-of-day-question', 'direct_question', 'Get a non-wolf to ask at what time of day your favorite ordinary moment usually happens.', '讓一位非狼玩家問你，最喜歡的日常小時刻通常發生在一天的什麼時間。'],
    [45, 'i3', 'interaction', 'joy-delayed-or-now', 'choose_one', 'Get a non-wolf to choose between ten quiet minutes now and an extra half hour of rest at the weekend.', '讓一位非狼玩家選擇，現在安靜十分鐘，還是週末多休息半小時。'],
    [45, 'i4', 'interaction', 'joy-sentence-finish', 'sentence_completion', 'Get a non-wolf to finish the sentence "Today would be better if my next cup of tea...".', '讓一位非狼玩家接完「Today would be better if my next cup of tea...」這個句子。'],
    [45, 's1', 'self_action', 'joy-no-achievement', 'quoted_line', 'Say, "Nothing impressive happened, and it was a very good day."', '說出「Nothing impressive happened, and it was a very good day.」。'],
    [45, 's2', 'self_action', 'joy-sunlight-booking', 'absurd_proposal', 'Suggest booking the sunny spot by a window as if it were a popular restaurant.', '提議把窗邊有陽光的位置，當成熱門餐廳一樣開放訂位。'],
    [45, 's3', 'self_action', 'joy-kettle-thanks', 'object_address', 'Thank an imaginary kettle aloud for making a normal afternoon better.', '直接感謝想像中的熱水壺，讓平凡的下午更愉快。'],
    [45, 's4', 'self_action', 'joy-day-review', 'spoken_notice', 'Read a short review of an ordinary day: "Warm socks. Good bread. Would live again."', '唸出平凡一天的短評：「Warm socks. Good bread. Would live again.」。'],
    [45, 's5', 'self_action', 'joy-no-photo-rule', 'spoken_rule', 'Propose enjoying the first sip of a good drink before taking any photo of it.', '提議遇到好喝的飲料，必須先享受第一口才能拍照。'],
    [45, 's6', 'self_action', 'joy-luxury-definition', 'correction', 'Replace "a successful day" with "a day when the toast did not burn" aloud.', '口頭把「a successful day」換成「a day when the toast did not burn」。'],

    [46, 'i1', 'interaction', 'hobby-entry-question', 'direct_question', 'Get a non-wolf to ask which tiny detail first made you curious about a hobby.', '讓一位非狼玩家問你，是哪個小細節最先讓你對某個興趣感到好奇。'],
    [46, 'i2', 'interaction', 'hobby-beginner-purchase', 'practical_fix', 'Get a non-wolf to suggest one thing a beginner should borrow before buying hobby equipment.', '讓一位非狼玩家建議，新手購買興趣裝備之前，應先借用哪樣東西。'],
    [46, 'i3', 'interaction', 'hobby-first-hours-guess', 'number_guess', 'Get a non-wolf to guess how many hours you spent reading or watching beginner advice in your first week.', '讓一位非狼玩家猜，你入門第一週花了幾小時看新手教學。'],
    [46, 'i4', 'interaction', 'hobby-beginner-reassurance', 'compose_reply', 'Get a non-wolf to suggest what to say to a beginner who thinks everyone else already knows everything.', '讓一位非狼玩家想一句話，安慰覺得其他人什麼都會的新手。'],
    [46, 's1', 'self_action', 'hobby-one-video', 'quoted_line', 'Say, "I watched one short video. Now I have strong opinions about equipment."', '說出「I watched one short video. Now I have strong opinions about equipment.」。'],
    [46, 's2', 'self_action', 'hobby-shelf-expansion', 'absurd_proposal', 'Suggest that a hobby must ask permission before taking over a second shelf.', '提議一個興趣想占用第二層架子前，必須先取得許可。'],
    [46, 's3', 'self_action', 'hobby-exit-warning', 'spoken_notice', 'Read an imaginary warning under a hobby video: "This may change what you talk about at dinner."', '唸出興趣影片下的想像警語：「This may change what you talk about at dinner.」。'],
    [46, 's4', 'self_action', 'hobby-newbie-dialogue', 'short_dialogue', 'Say both lines: "Is this your main hobby now?" "I am still calling it a quick experiment."', '說出這兩句對話：「Is this your main hobby now?」「I am still calling it a quick experiment.」。'],
    [46, 's5', 'self_action', 'hobby-free-trial-trap', 'analogy', 'Compare trying a new hobby to opening one cupboard and discovering an entire room behind it.', '把嘗試新興趣比喻成打開一個櫃子，卻發現後面有整間房間。'],
    [46, 's6', 'self_action', 'hobby-equipment-patience', 'spoken_rule', 'Propose using borrowed equipment three times before buying the expensive version.', '提出規則：借來的裝備必須先用過三次，才能買昂貴的版本。'],

    [47, 'i1', 'interaction', 'effort-time-estimate', 'number_guess', 'Get a non-wolf to guess how many minutes it takes to plan a meal for people with different food needs.', '讓一位非狼玩家猜，替飲食需求不同的人規劃一餐需要幾分鐘。'],
    [47, 'i2', 'interaction', 'effort-hidden-step-question', 'direct_question', 'Get a non-wolf to ask which unseen step takes the most work in a task you describe.', '讓一位非狼玩家問你，所描述的事情裡，哪個看不見的步驟最費力。'],
    [47, 'i3', 'interaction', 'effort-credit-reply', 'compose_reply', 'Get a non-wolf to replace "You make it look easy" with a compliment that recognizes practice.', '讓一位非狼玩家把「You make it look easy」改成肯定練習付出的稱讚。'],
    [47, 'i4', 'interaction', 'effort-sharing-first-step', 'practical_fix', 'Get a non-wolf to suggest one small part of organizing a family meal that a guest could take over.', '讓一位非狼玩家建議，安排家庭聚餐時，有哪件小事可以交給客人幫忙。'],
    [47, 's1', 'self_action', 'effort-short-output', 'quoted_line', 'Say, "The result took five minutes to enjoy and five hours to prepare."', '說出「The result took five minutes to enjoy and five hours to prepare.」。'],
    [47, 's2', 'self_action', 'effort-iceberg', 'analogy', 'Compare an easy-looking result to the small part of an iceberg above the water.', '把看起來很輕鬆的成果，比喻成冰山露出水面的那一小部分。'],
    [47, 's3', 'self_action', 'effort-hidden-invoice', 'spoken_notice', 'Read an imaginary bill item: "Remembering all the things nobody wrote down."', '唸出想像中的帳單項目：「Remembering all the things nobody wrote down.」。'],
    [47, 's4', 'self_action', 'effort-just-ban', 'spoken_rule', 'Propose banning the word "just" before asking someone to do a job you cannot do yourself.', '提議請別人做自己不會的工作時，不准先說「just」。'],
    [47, 's5', 'self_action', 'effort-rest-payment', 'price_offer', 'State how many minutes of quiet rest would fairly repay an hour of helping with a difficult task.', '說出幫忙做困難工作一小時，應換得幾分鐘安靜休息。'],
    [47, 's6', 'self_action', 'effort-simple-dialogue', 'short_dialogue', 'Say both lines: "That looks simple." "Good. That was the difficult part."', '說出這兩句對話：「That looks simple.」「Good. That was the difficult part.」。'],

    [48, 'i1', 'interaction', 'childish-defense-reply', 'compose_reply', 'Get a non-wolf to suggest a reply to "Aren\'t you too old to enjoy cartoons?"', '讓一位非狼玩家替「Aren\'t you too old to enjoy cartoons?」想一句回覆。'],
    [48, 'i2', 'interaction', 'childish-grownup-benefit', 'explain_benefit', 'Get a non-wolf to give a benefit adults can get from playing with building blocks.', '讓一位非狼玩家說出，大人玩積木可以得到什麼好處。'],
    [48, 'i3', 'interaction', 'childish-shared-invite', 'invitation_reply', 'Get a non-wolf to say whether they would join an adults-only afternoon of board games and snacks.', '讓一位非狼玩家表態，願不願意參加只有大人的桌遊點心下午。'],
    [48, 'i4', 'interaction', 'childish-age-question', 'direct_question', 'Get a non-wolf to ask who decided that your favorite childhood activity has an age limit.', '讓一位非狼玩家問你，是誰決定你喜歡的童年活動有年齡限制。'],
    [48, 's1', 'self_action', 'childish-own-money', 'quoted_line', 'Say, "The difference is that I can buy my own stickers now."', '說出「The difference is that I can buy my own stickers now.」。'],
    [48, 's2', 'self_action', 'childish-toy-address', 'object_address', 'Tell an imaginary stuffed animal that neither of you needs to apologize for being here.', '直接告訴想像中的絨毛玩偶，你們都不用為待在這裡而道歉。'],
    [48, 's3', 'self_action', 'childish-label-revision', 'correction', 'Replace the word "childish" with "still enjoyable" aloud.', '口頭把「childish」換成「still enjoyable」。'],
    [48, 's4', 'self_action', 'childish-age-label', 'spoken_notice', 'Read an imaginary toy label: "Ages eight and up. It does not say when to stop."', '唸出想像中的玩具標籤：「Ages eight and up. It does not say when to stop.」。'],
    [48, 's5', 'self_action', 'childish-play-break', 'absurd_proposal', 'Suggest giving adults a short play break after they finish paying their bills.', '提議大人付完帳單後，應該有一小段玩耍休息時間。'],
    [48, 's6', 'self_action', 'childish-fun-proof-rule', 'spoken_rule', 'Propose that harmless fun never needs to prove it is educational.', '提出規則：無害的樂趣不必證明自己有教育意義。'],
  ];

  const mechanisms = {
    compose_reply: ['short_reply', 'A task involves finding words for an awkward reply.', '有任務涉及替難以開口的回覆找說法。', 'No wolf task requires composing a reply for an awkward conversation.', '本局狼任務沒有要求替難以開口的對話想回覆。'],
    direct_question: ['focused_question', 'A task involves having someone ask a particular kind of question.', '有任務涉及讓人提出某一類問題。', 'No wolf task requires getting someone to ask a particular question.', '本局狼任務沒有要求讓別人提出指定類型的問題。'],
    practical_fix: ['practical_suggestion', 'A task involves a concrete solution to a small everyday problem.', '有任務涉及替日常小問題想具體辦法。', 'No wolf task requires getting a practical fix from another player.', '本局狼任務沒有要求別人提出具體的解決辦法。'],
    time_limit: ['time_boundary', 'A task involves setting an amount of time.', '有任務涉及訂出一段時間。', 'No wolf task requires another player to set an amount of time.', '本局狼任務沒有要求別人訂出一段時間。'],
    object_address: ['object_personification', 'A task involves speaking directly to an object.', '有任務涉及直接對物品說話。', 'No wolf task requires talking directly to an object.', '本局狼任務沒有要求直接對物品說話。'],
    quoted_line: ['short_quotation', 'A task involves saying a short, prepared line.', '有任務涉及說出一句事先寫好的短句。', 'No wolf task requires saying a prepared one-line quotation.', '本局狼任務沒有要求說出事先寫好的單句引語。'],
    price_offer: ['price_or_payment', 'A task involves suggesting a price or payment.', '有任務涉及提出價錢或報酬。', 'No wolf task requires suggesting a price, payment, or deposit.', '本局狼任務沒有要求提出價錢、報酬或押金。'],
    spoken_notice: ['read_short_notice', 'A task involves reading out a short imaginary notice.', '有任務涉及唸出一則短短的想像告示。', 'No wolf task requires reading out an imaginary notice or label.', '本局狼任務沒有要求唸出想像中的告示或標籤。'],
    absurd_proposal: ['playful_suggestion', 'A task involves suggesting an unusual arrangement.', '有任務涉及提出不尋常的安排。', 'No wolf task requires proposing an unusual arrangement.', '本局狼任務沒有要求提出不尋常的安排。'],
    short_dialogue: ['two_line_dialogue', 'A task involves saying both sides of a short exchange.', '有任務涉及說出一小段對話的雙方台詞。', 'No wolf task requires saying both sides of a short dialogue.', '本局狼任務沒有要求說出一小段對話的雙方台詞。'],
    fairness_exception: ['fairness_judgment', 'A task involves deciding how a particular exception should be treated.', '有任務涉及判斷某個例外情況該怎麼處理。', 'No wolf task requires another player to judge a specific fairness exception.', '本局狼任務沒有要求別人判斷特定例外是否公平。'],
    sequence_choice: ['sequence_decision', 'A task involves choosing when one action should happen.', '有任務涉及選擇某個動作該先做還是後做。', 'No wolf task requires another player to choose the order of actions.', '本局狼任務沒有要求別人選擇行動的先後順序。'],
    analogy: ['concrete_comparison', 'A task involves comparing an experience with something familiar.', '有任務涉及用熟悉的事物比喻一種經驗。', 'No wolf task requires making a specified comparison.', '本局狼任務沒有要求做出指定的比喻。'],
    spoken_rule: ['proposed_rule', 'A task involves proposing a specific rule.', '有任務涉及提出一條明確的規則。', 'No wolf task requires proposing a specific rule.', '本局狼任務沒有要求提出一條明確的規則。'],
    number_guess: ['numerical_guess', 'A task involves getting a numerical guess.', '有任務涉及讓人猜一個數字。', 'No wolf task requires someone to guess a number.', '本局狼任務沒有要求別人猜一個數字。'],
    number_limit: ['quantity_boundary', 'A task involves getting someone to set a quantity limit.', '有任務涉及讓人訂出數量上限。', 'No wolf task requires another player to set a quantity limit.', '本局狼任務沒有要求別人訂出數量上限。'],
    personal_boundary: ['personal_boundary', 'A task involves getting someone to state a personal boundary.', '有任務涉及讓人說出個人的界線。', 'No wolf task requires another player to state a personal boundary.', '本局狼任務沒有要求別人說出個人的界線。'],
    choose_one: ['concrete_choice', 'A task involves choosing between two concrete alternatives.', '有任務涉及在兩個具體選項中做選擇。', 'No wolf task requires another player to choose between two given alternatives.', '本局狼任務沒有要求別人在兩個指定選項中二選一。'],
    correction: ['spoken_correction', 'A task involves replacing a statement with a more accurate one.', '有任務涉及把一句話換成較準確的說法。', 'No wolf task requires saying a correction to a given statement.', '本局狼任務沒有要求口頭更正指定的句子。'],
    invitation_reply: ['try_an_activity', 'A task involves asking whether someone would try an activity.', '有任務涉及詢問別人願不願意試一項活動。', 'No wolf task requires getting a reply about trying a suggested activity.', '本局狼任務沒有要求取得別人願不願意試某項活動的回覆。'],
    sound_imitation: ['sound_effect', 'A task involves a short familiar sound.', '有任務涉及一小段熟悉的聲音。', 'No wolf task requires imitating a non-speech sound.', '本局狼任務沒有要求模仿不是說話的聲音。'],
    sentence_completion: ['finish_given_sentence', 'A task involves someone finishing an unfinished sentence.', '有任務涉及讓人接完一句未完成的話。', 'No wolf task requires someone to complete a given unfinished sentence.', '本局狼任務沒有要求別人接完指定的未完成句。'],
    explain_benefit: ['explain_a_benefit', 'A task involves finding a benefit in an everyday activity.', '有任務涉及找出日常活動的一個好處。', 'No wolf task requires someone to give a benefit of a specified activity.', '本局狼任務沒有要求別人說出指定活動的好處。'],
  };

  // The source row names describe the authored scene for editorial use; they
  // must NOT manufacture distinct near-variant identities for the same action.
  const sharedGroups = {
    compose_reply: 'compose_short_reply', practical_fix: 'practical_suggestion',
    choose_one: 'choose_one_of_two', sequence_choice: 'choose_one_of_two',
    time_limit: 'set_a_specific_limit', number_limit: 'set_a_specific_limit',
    personal_boundary: 'set_a_specific_limit', direct_question: 'ask_topic_question',
    number_guess: 'guess_a_number', analogy: 'compare_unlike_things',
    short_dialogue: 'two_line_dialogue', spoken_notice: 'read_short_notice',
    spoken_rule: 'propose_specific_rule', absurd_proposal: 'absurd_proposal',
    quoted_line: 'prepared_one_line', correction: 'rephrase_a_statement',
    object_address: 'speak_to_object', fairness_exception: 'judge_a_fairness_exception',
    invitation_reply: 'respond_to_activity_invitation', explain_benefit: 'explain_a_benefit',
    sentence_completion: 'finish_given_sentence', sound_imitation: 'imitate_appliance_sound'
  };

  const tasks = rows.map(function (row) {
    const [topic, suffix, type, scene, tag, text, textZh] = row;
    const meta = mechanisms[tag];
    if (!meta) throw new Error('Unknown life-card action tag');
    const id = 'w4-life-' + topic + '-' + suffix;
    let group = sharedGroups[tag] || scene;
    if (scene === 'discard_one_of_two') group = 'discard_one_of_two';
    if (tag === 'price_offer') group = type === 'interaction' ? 'estimate_exchange_value' : 'quote_absurd_price';
    if (tag === 'object_address' && /^Apologize/i.test(text)) group = 'apologize_to_object';
    if (tag === 'object_address' && /^Thank/i.test(text)) group = 'thank_object';
    if (tag === 'object_address' && /^Promise/i.test(text)) group = 'promise_to_object';
    const actionTags = new Set([tag]);
    if (text.includes('"')) actionTags.add('quotation');
    if (/\bapologi[sz]e\b|\bapology\b/i.test(text)) actionTags.add('apology');
    if (/^Thank\b/i.test(text)) actionTags.add('thanks');
    if (/^Promise\b/i.test(text)) actionTags.add('promise');
    if (tag === 'direct_question' || /^Ask\b/i.test(text)) actionTags.add('question');
    if (tag === 'sound_imitation') actionTags.add('sound_effect');
    if (tag === 'analogy') actionTags.add('comparison');
    return {
      id, canonicalTaskKey: id, variantGroup: group, mechanicKey: group,
      family: meta[0], type, text, textZh,
      compatibleTopicIds: ['topic_v2_' + topic],
      requiredOtherPlayerCount: type === 'interaction' ? 1 : 0,
      active: true, status: 'active', reviewed: true, isGeneric: false,
      performanceGroup: ['short_dialogue', 'sound_imitation'].includes(tag) ? 'voice' : null,
      actionTags: Array.from(actionTags),
      positiveClues: [meta[1]], positiveCluesZh: [meta[2]],
      requiredUtterances: Array.from(text.matchAll(/"([^"]+)"/g), match => match[1]),
      activityLanguage: 'en', contentVersion: 'chat-wolf-content-20261002'
    };
  });
  const exclusionClues = {}, exclusionCluesZh = {};
  Object.keys(mechanisms).forEach(function (tag) {
    exclusionClues[tag] = mechanisms[tag][3];
    exclusionCluesZh[tag] = mechanisms[tag][4];
  });
  return { tasks, exclusionClues, exclusionCluesZh };
}));
