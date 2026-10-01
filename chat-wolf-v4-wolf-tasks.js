/* Complete, hand-authored cards with explicitly reviewed cross-topic use.
 * The helper adds metadata only; it never generates a task sentence.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CHAT_WOLF_V4_WOLF_TASKS = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clues = {
    analogy: ['One task compares two unlike things.', '有一項任務會比較兩種不相似的事物。', 'No wolf task requires making a comparison between unlike things.', '本局沒有要求把兩種不相似的事物相比的狼任務。'],
    apology: ['One task involves an apology.', '有一項任務與道歉有關。', 'No wolf task requires making an apology.', '本局沒有要求道歉的狼任務。'],
    negotiation: ['One task involves offering a trade.', '有一項任務與提出交換有關。', 'No wolf task requires offering a trade.', '本局沒有要求提出交換的狼任務。'],
    quotation: ['One task uses a short prepared sentence.', '有一項任務會用到預先寫好的短句。', 'No wolf task requires saying a prepared sentence.', '本局沒有要求說出預先写好短句的狼任務。'],
    question: ['One task asks for a particular kind of answer.', '有一項任務會詢問某一種回答。', 'No wolf task requires asking for a particular kind of answer.', '本局沒有要求詢問某一種回答的狼任務。'],
    reframe: ['One task presents something from another point of view.', '有一項任務會換個角度看事情。', 'No wolf task requires presenting another point of view.', '本局沒有要求換個角度看事情的狼任務。'],
    invitation: ['One task involves an invitation.', '有一項任務與邀請有關。', 'No wolf task requires offering an invitation.', '本局沒有要求提出邀請的狼任務。'],
    ranking: ['One task puts options in order.', '有一項任務會把選項排出順序。', 'No wolf task requires putting options in order.', '本局沒有要求把選項排序的狼任務。'],
    estimation: ['One task asks for an amount or a number.', '有一項任務會詢問數量或數字。', 'No wolf task requires asking for an amount or a number.', '本局沒有要求詢問數量或數字的狼任務。'],
    repair: ['One task asks someone to improve a message.', '有一項任務會請人改善一句話。', 'No wolf task requires improving a message.', '本局沒有要求改善一句話的狼任務。'],
    exception: ['One task asks for an exception to a rule.', '有一項任務會詢問規則的例外。', 'No wolf task requires asking for an exception to a rule.', '本局沒有要求詢問規則例外的狼任務。'],
    reasoning: ['One task asks someone to challenge a stated assumption.', '有一項任務會請別人質疑一項說法。', 'No wolf task requires challenging a stated assumption.', '本局沒有要求質疑一項說法的狼任務。']
  };
  // key, topics, type, family, shared near-variant group, English, Chinese.
  const rows = [
    ['luggage-passenger',[1,3,43],'self_action','analogy','compare_object_to_person','Compare an overpacked suitcase to an extra passenger who refuses to pay.','把塞太滿的行李箱比作不肯付錢的額外乘客。'],
    ['home-airport',[2,4,5,16],'self_action','analogy','compare_place_to_system','Compare a shared room to an airport where everyone has a different departure time.','把共用房間比作每人出發時間都不同的機場。'],
    ['battery-budget',[4,5,13,19,30,34,45,47],'self_action','analogy','compare_energy_to_money','Describe your energy as a budget that has already been spent.','把自己的精力形容成已經花光的預算。'],
    ['gift-adoption',[12,15,25,37,41],'self_action','reframe','object_new_caretaker','Describe giving away an unwanted object as finding it a better home.','把送走不想要的物品形容成替它找到更好的家。'],
    ['silence-gift',[3,4,5,7,13,16,42],'self_action','reframe','absence_as_present','Offer five minutes of quiet as an imaginary gift to the group.','提議把五分鐘的安靜當作送給大家的想像禮物。'],
    ['rest-appointment',[4,19,30,35,45,47],'self_action','reframe','rest_is_appointment','Describe your rest time as an appointment that is already booked.','把自己的休息時間說成已經排好的約會。'],
    ['phone-apology',[6,27,33],'self_action','apology','apologize_to_object','Apologize out loud to your phone for blaming it when you keep checking it.','大聲向手機道歉，因為自己一直查看它卻怪它。'],
    ['chair-thanks',[2,4,5,16,20],'self_action','quotation','thank_ordinary_object','Say “Thank you, chair. You have supported me through everything.”','說出「Thank you, chair. You have supported me through everything.」。'],
    ['calendar-complaint',[10,19,30,34,43],'self_action','quotation','object_wants_time_off','Say “My calendar has started making complaints.”','說出「My calendar has started making complaints.」。'],
    ['imaginary-permit',[13,19,30,35,45,48],'self_action','quotation','permission_for_rest','Say “I give myself permission to be completely unproductive.”','說出「I give myself permission to be completely unproductive.」。'],
    ['snack-trade',[1,3,4,8,10,26],'self_action','negotiation','offer_chore_trade','Offer to do the washing-up in exchange for first choice of snacks.','提議用自己洗碗來交換優先選點心。'],
    ['planner-trade',[1,9,10,13,14,34],'self_action','negotiation','trade_planning_duties','Offer to arrange the transport if someone else chooses where to eat.','提議由自己安排交通，交換別人決定去哪裡吃。'],
    ['skills-swap',[9,11,17,24,35,44,46],'self_action','negotiation','offer_skill_exchange','Offer to teach one small skill in exchange for a cooking lesson.','提議教一項小本事，交換一堂做菜教學。'],
    ['no-agenda-invite',[4,7,13,19,30,45],'self_action','invitation','invite_without_activity','Invite the group to meet for ten minutes with nothing planned.','邀請大家相聚十分鐘，什麼活動都不安排。'],
    ['imperfect-show',[11,31,35,44,46,47],'self_action','invitation','invite_unfinished_work','Invite everyone to show something unfinished instead of a finished result.','邀請大家展示未完成的東西，不展示成品。'],
    ['silent-thanks',[29,34,42,47],'self_action','reframe','specific_help_beats_praise','Offer someone a day off from a chore instead of a thank-you speech.','提議用免做一天家事來感謝對方，而不是發表感謝詞。'],
    ['lost-day-refund',[1,18,19,21,30,43],'self_action','quotation','request_time_refund','Say “I would like a refund for those ten minutes.”','說出「I would like a refund for those ten minutes.」。'],
    ['hobby-doctor',[11,35,44,46,48],'self_action','analogy','hobby_as_medicine','Describe a hobby as medicine that does not need to make you better at anything.','把興趣比作不需要讓你變厲害的藥。'],
    ['photo-weather',[12,23,28,38,39,43],'self_action','analogy','photo_as_weather','Compare one photo to a weather report that cannot describe the whole day.','把一張照片比作無法說明整天狀況的天氣報告。'],
    ['mistake-receipt',[21,32,36,38,41,43],'self_action','reframe','mistake_as_tuition','Describe a small mistake as tuition you have already paid.','把一次小失誤形容成已經繳過的學費。'],
    ['quiet-rank',[3,4,5,13,16],'interaction','ranking','rank_three_options','Get a non-wolf to rank music, silence, and conversation from most to least relaxing.','讓一位非狼玩家把音樂、安靜、聊天按放鬆程度排序。'],
    ['dinner-rank',[1,8,9,14,26,33],'interaction','ranking','rank_three_options','Get a non-wolf to rank taste, price, and waiting time when choosing a meal.','讓一位非狼玩家替選餐時的味道、價錢、等候時間排重要性。'],
    ['object-condition-challenge',[12,15,22,25,32,37,41],'interaction','reasoning','challenge_concrete_claim','Get a non-wolf to challenge your claim that a worn notebook tells you nothing about its owner.','讓一位非狼玩家反駁你「舊筆記本完全看不出主人的生活」的說法。'],
    ['day-value-challenge',[1,4,18,19,30,43,45],'interaction','reasoning','challenge_concrete_claim','Get a non-wolf to challenge your claim that a free morning is wasted unless you go somewhere.','讓一位非狼玩家反駁你「空閒早晨沒出門就是浪費」的說法。'],
    ['silence-number',[3,4,7,13,16],'interaction','estimation','estimate_comfortable_duration','Get a non-wolf to give a number of minutes they would enjoy sitting together without talking.','讓一位非狼玩家說出一起坐著不聊天時，能享受的分鐘數。'],
    ['help-number',[2,5,9,17,24,29,34,47],'interaction','estimation','estimate_fair_requests','Get a non-wolf to say how many small favors in one day would feel like too many.','讓一位非狼玩家說出一天被拜託幾件小事就會覺得太多。'],
    ['soft-no',[7,13,25,29,30,34,35],'interaction','repair','soften_a_refusal','Get a non-wolf to turn “No, I do not want to” into a kinder refusal.','讓一位非狼玩家把「No, I do not want to」改成較溫和的拒絕。'],
    ['photo-request',[7,11,13,28],'interaction','repair','write_permission_request','Get a non-wolf to give you a sentence for asking permission before sharing a group photo.','讓一位非狼玩家幫你說一句分享合照前徵求同意的話。'],
    ['honest-praise',[10,11,25,31,35,44,47],'interaction','repair','replace_vague_praise','Get a non-wolf to replace “That is nice” with a more specific compliment about someone’s effort.','讓一位非狼玩家把「That is nice」改成具體稱讚別人付出的話。'],
    ['reply-later',[6,27,29,30,34,47],'interaction','repair','write_delay_message','Get a non-wolf to give you a short message that says you will reply tomorrow.','讓一位非狼玩家幫你說一句表示明天才會回覆的短訊息。'],
    ['quiet-exception',[2,3,4,5,13,16],'interaction','exception','exception_to_quiet_rule','Get a non-wolf to give one exception to a “no talking after ten” rule.','讓一位非狼玩家替「no talking after ten」（十點後不說話）提出一個例外。'],
    ['loan-exception',[12,15,25,32,37,41],'interaction','exception','exception_to_no_lending','Get a non-wolf to describe one situation where they would lend a favorite object.','讓一位非狼玩家說出願意借出心愛物品的一種情況。'],
    ['protect-rest',[4,19,30,34,35,45,47],'interaction','question','suggest_rest_boundary','Get a non-wolf to suggest one thing you should refuse during a day off.','讓一位非狼玩家建議你在休息日應拒絕的一件事。'],
    ['ask-help-first',[5,17,24,29,34,42,47],'interaction','question','ask_before_helping','Get a non-wolf to ask you what help you actually want.','讓一位非狼玩家問你真正想要什麼幫忙。'],
    ['object-defense',[12,15,20,22,25,37,41],'interaction','reframe','defend_useless_object','Get a non-wolf to give a reason to keep a mug that cannot hold a drink.','讓一位非狼玩家說出留下不能裝飲料的杯子的一個理由。'],
    ['newbie-question',[7,11,35,44,46,48],'interaction','question','ask_beginner_question','Get a non-wolf to ask you a beginner’s question about a hobby you mention.','讓一位非狼玩家針對你提到的興趣，問你一個新手問題。']
  ];
  const tasks = rows.map(([key, topicNumbers, type, family, variantGroup, text, textZh]) => ({
    id: 'wolf_v4_shared_' + key, canonicalTaskKey: 'v4-shared:' + key,
    compatibleTopicIds: topicNumbers.map(n => 'topic_v2_' + String(n).padStart(2,'0')),
    type, family, variantGroup, mechanicKey: variantGroup, text, textZh,
    active: true, status: 'active', reviewed: true, isGeneric: false, performanceGroup: null,
    requiredOtherPlayerCount: type === 'interaction' ? 1 : 0,
    activityLanguage: 'en', requiredUtterances: Array.from(text.matchAll(/“([^”]+)”/g), m => m[1]),
    actionTags: [family], positiveClues: [clues[family][0]], positiveCluesZh: [clues[family][1]]
  }));
  return { tasks,
    exclusionClues: Object.fromEntries(Object.entries(clues).map(([k,v]) => [k,v[2]])),
    exclusionCluesZh: Object.fromEntries(Object.entries(clues).map(([k,v]) => [k,v[3]])) };
});
