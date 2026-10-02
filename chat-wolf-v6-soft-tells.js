/* A targeted overlay on the readable bank. The previous text remains archived
 * for old dealt cards; new goals receive new canonical keys. Topic IDs are
 * literal editorial links, not generated wildcard compatibility. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory([
    require('./chat-wolf-v5-readable-a.js'),require('./chat-wolf-v5-readable-b.js'),
    require('./chat-wolf-v5-readable-c.js'),require('./chat-wolf-v5-readable-core.js')]);
  else root.CHAT_WOLF_V6_SOFT_TELLS=factory([
    root.CHAT_WOLF_V5_READABLE_A,root.CHAT_WOLF_V5_READABLE_B,
    root.CHAT_WOLF_V5_READABLE_C,root.CHAT_WOLF_V5_READABLE_CORE]);
})(typeof globalThis!=='undefined'?globalThis:this,function(banks){
  'use strict';
  const previous=(banks||[]).flatMap(bank=>bank?.tasks||[]);
  const byId=new Map(previous.map(task=>[task.id,task]));
  // Original ID, complete English, complete Traditional Chinese, optional
  // narrower topic IDs. Asking is a self action: no answer is required.
  const edits=[
    ['wolf_v5_a_s_travel-question','Ask who belongs to the “carsick club.”','問誰也是「carsick club」的一員。'],
    ['wolf_v5_a_s_travel-thanks','Thank a traveler with “that saved my holiday.”','用「that saved my holiday」感謝一位玩家的旅行點子。'],
    ['wolf_v5_a_s_travel-train','Ask whether anyone is firmly “Team Window Seat.”','問誰堅定屬於「Team Window Seat」。'],
    ['wolf_v5_a_s_room-question','Ask whether bright lights are anyone’s “focus superpower.”','問明亮的燈光是不是誰的「focus superpower」。'],
    ['wolf_v5_a_s_room-thanks','Call someone’s room suggestion an “official comfort upgrade.”','把一位玩家的房間建議稱為「official comfort upgrade」。'],
    ['wolf_v5_a_s_room-temperature','Ask who has a “non-negotiable” room temperature.','問誰有「non-negotiable」的理想室溫。'],
    ['wolf_v5_a_s_gather-question','Ask who needs a “social warm-up” when meeting people.','問誰見人前需要「social warm-up」。'],
    ['wolf_v5_a_s_gather-thanks','Thank someone for being the group’s “welcome committee.”','用「welcome committee」感謝一位玩家讓大家融入。'],
    ['wolf_v5_a_s_gather-quiet','Ask who is a proud member of “Team Comfortable Silence.”','問誰自豪地屬於「Team Comfortable Silence」。'],
    ['wolf_v5_a_s_food-question','Ask which meal deserves a “never again” on their menu.','問哪一道菜值得在菜單上標「never again」。'],
    ['wolf_v5_a_s_food-thanks','Call someone’s food suggestion a “dinner-saving idea.”','把一位玩家的食物建議稱為「dinner-saving idea」。'],
    ['wolf_v5_a_s_food-combination','Ask someone for their “absolutely not” food combination.','問一位玩家的「absolutely not」食物搭配。'],
    ['wolf_v5_a_s_object-question','Ask which worn object deserves an “excellent service” award.','問哪件老舊物品值得獲得「excellent service」獎。'],
    ['wolf_v5_a_s_object-thanks','Thank someone for their “museum-worthy” object story.','用「museum-worthy」感謝一位玩家的物品故事。'],
    ['wolf_v5_a_s_object-fixed','Ask what broken object earned a “second chance.”','問哪件壞掉的物品得到過「second chance」。'],
    ['wolf_v5_a_s_team-question','Ask which group job someone would do “on repeat.”','問哪項分工有人願意「on repeat」一直做。'],
    ['wolf_v5_a_s_team-thanks','Thank someone for doing the group’s “invisible hard work.”','用「invisible hard work」感謝一位玩家的付出。'],
    ['wolf_v5_a_s_show-question','Ask which skill deserves a “one-minute masterclass.”','問哪個技能值得開一堂「one-minute masterclass」。'],
    ['wolf_v5_a_s_shop-question','Ask which shop habit deserves an instant “no, thanks.”','問商店的哪個做法會讓人立刻說「no, thanks」。'],
    ['wolf_v5_a_s_car-question','Ask who proudly belongs to “Team Car Naps.”','問誰自豪地屬於「Team Car Naps」。'],
    ['wolf_v5_b_s-morning-question','Ask who deserves a medal for surviving early mornings.','問誰值得因為撐過清晨而獲得一面獎牌。'],
    ['wolf_v5_b_s-quiet-question','Ask who treats an uninterrupted breakfast as “precious treasure.”','問誰把不受打擾的早餐當成「precious treasure」。'],
    ['wolf_v5_b_s-quiet-thanks','Thank someone with “my sleepy brain thanks you.”','用「my sleepy brain thanks you」感謝一位玩家的早晨點子。'],
    ['wolf_v5_b_s-power-question','Ask which chore always gets the “tomorrow treatment.”','問哪項家事總是得到「tomorrow treatment」。'],
    ['wolf_v5_b_s-help-praise','Thank a different opinion with “my brain needed that.”','用「my brain needed that」感謝一個不同看法。'],
    ['wolf_v5_b_s-object-question','Ask which old possession has “lifetime membership” in their home.','問哪件舊物在家裡有「lifetime membership」。'],
    ['wolf_v5_b_s-object-thanks','Call someone’s reuse suggestion an “official waste rescue.”','把一位玩家的再利用建議稱為「official waste rescue」。'],
    ['wolf_v5_b_s-social-question','Ask what their “opening line emergency plan” would be.','問對方的「opening line emergency plan」會是什麼。'],
    ['wolf_v5_b_s-social-thanks','Thank a gentle suggestion with “my awkward self thanks you.”','用「my awkward self thanks you」感謝一個溫和建議。'],
    ['w5-c-s-plan-question','Ask who treats dinner time as “strictly sacred.”','問誰把晚餐時間當成「strictly sacred」。',[33,34,40,45]],
    ['w5-c-s-hobby-question','Ask which hobby began with “just one little try.”','問哪個興趣從「just one little try」開始。'],
    ['w5-c-s-hobby-thanks','Thank a helpful teacher with “my beginner brain thanks you.”','用「my beginner brain thanks you」感謝曾教你事情的人。'],
    ['w5-c-s-object-ask','Ask which stored item is still “waiting for its comeback.”','問哪件收起來的物品仍在「waiting for its comeback」。'],
    ['w5-c-s-change-ask','Ask when someone realized “my first impression needs updating.”','問對方何時發現「my first impression needs updating」。',[36,38,39]],
    ['w5-c-s-change-thanks','Thank someone with “you saved me from being confidently wrong.”','用「you saved me from being confidently wrong」感謝一位玩家。'],
    ['w5-c-s-habit-question','Ask who has an “official first-thing-home ritual.”','問誰有「official first-thing-home ritual」。'],
    ['w5-c-s-habit-thanks','Thank someone for a “tiny but mighty” act of care.','用「tiny but mighty」感謝一位玩家的小小關心。'],
    ['w5-c-s-care-question','Ask which everyday task feels like a “secret marathon.”','問哪項日常事情讓人覺得像「secret marathon」。'],
    ['w5-c-s-care-thanks','Thank someone for doing the “quiet hero” work.','用「quiet hero」感謝一位玩家默默的付出。'],
    ['w5-c-s-old-object-ask','Ask which possession escaped their latest “great decluttering plan.”','問哪件物品逃過最近的「great decluttering plan」。'],
    ['w5-c-s-mistake-retell','Ask: “Was that actually how it happened?”','問：「Was that actually how it happened?」'],
    ['w5-c-s-respect-keeping','Thank someone with “my sentimental self appreciates that.”','用「my sentimental self appreciates that」感謝一位玩家。']
  ];
  const utterances=text=>Array.from(text.matchAll(/“([^”]+)”/g),m=>m[1].replace(/[.!?…]+$/,''));
  const topicIds=numbers=>numbers.map(n=>'topic_v2_'+String(n).padStart(2,'0'));
  const overrides=edits.map(([id,text,textZh,narrowTopics])=>{
    const old=byId.get(id);
    if(!old)throw new Error('Unknown reviewed Soft Tell card: '+id);
    return {...old,text,textZh,canonicalTaskKey:'v6-soft:'+id,
      ...(narrowTopics?{compatibleTopicIds:topicIds(narrowTopics)}:{}),
      requiredUtterances:utterances(text),actionTags:[...(old.actionTags||[]),'prepared_sentence'],
      positiveClues:old.family==='question'?['A task asks a question using distinctive wording.']:['A task gives a distinctive spoken thank-you.'],
      positiveCluesZh:old.family==='question'?['有任務用特別的說法提問。']:['有任務用特別的說法表示感謝。'],
      softTell:true,replaces:[],previousTaskId:id,previousCanonicalTaskKey:old.canonicalTaskKey,
      active:true,status:'active',reviewed:true,contentVersion:'chat-wolf-special-v6',
      editorial:{singleOutcome:true,audioOnly:true,plainLanguage:true,noticeableWording:true}};
  });
  // Four different audible mechanics per cluster. Near variants deliberately
  // share mechanic keys across ALL topics; a topic change does not evade history.
  const additions=[
    ['trip-priorities',[1,3,14],'repeat_spoken_words','repetition','Say “travel priorities” twice while explaining your choice.','解釋選擇時，說兩次「travel priorities」。'],
    ['trip-essential',[1,3,14],'emphasize_one_word','emphasis','Stress “essential” when naming something you would pack.','提到會帶的物品時，強調「essential」。'],
    ['trip-rule',[1,3,14],'dramatic_pause','vocal_timing','Pause briefly before naming your most important travel rule.','說出最重要的旅行原則前，稍微停頓。'],
    ['trip-hill',[1,3,14],'prepared_one_line','prepared_sentence','Say: “That is my holiday hill to die on.”','說出：「That is my holiday hill to die on.」'],
    ['room-quiet',[2,4,5,16],'repeat_spoken_words','repetition','Say “peace and quiet” twice while describing your ideal room.','描述理想房間時，說兩次「peace and quiet」。'],
    ['room-comfort',[2,4,5,16],'emphasize_one_word','emphasis','Stress “comfortable” while explaining your ideal shared room.','說明理想的共用房間時，強調「comfortable」。'],
    ['room-habit',[2,4,5,16],'dramatic_pause','vocal_timing','Pause dramatically before naming a habit you cannot tolerate.','說出無法忍受的習慣前，戲劇化地停頓。'],
    ['room-demands',[2,4,5,16],'prepared_one_line','prepared_sentence','Say: “My comfort has very specific requirements.”','說出：「My comfort has very specific requirements.」'],
    ['gather-pressure',[6,7,10,13],'repeat_spoken_words','repetition','Say “low pressure” twice while describing your perfect gathering.','描述理想聚會時，說兩次「low pressure」。'],
    ['gather-optional',[6,7,10,13],'emphasize_one_word','emphasis','Stress “optional” when suggesting something for the gathering.','提出聚會建議時，強調「optional」。'],
    ['gather-avoid',[6,7,10,13],'dramatic_pause','vocal_timing','Pause before admitting which party activity you would avoid.','承認會避開哪種聚會活動前，稍微停頓。'],
    ['gather-battery',[6,7,10,13],'prepared_one_line','prepared_sentence','Say: “That is my social battery talking.”','說出：「That is my social battery talking.」'],
    ['food-taste',[8,10],'repeat_spoken_words','repetition','Say “taste test” twice while describing our dinner.','描述我們的晚餐時，說兩次「taste test」。'],
    ['food-delicious',[8,10],'emphasize_one_word','emphasis','Stress “delicious” while describing a dish you would serve.','描述想端出的菜色時，強調「delicious」。'],
    ['food-opinion',[8,10],'dramatic_pause','vocal_timing','Pause before revealing your strongest food opinion.','揭露最堅定的食物看法前，稍微停頓。'],
    ['food-stomach',[8,10],'prepared_one_line','prepared_sentence','Say: “My stomach has entered the discussion.”','說出：「My stomach has entered the discussion.」'],
    ['team-effort',[5,9,11],'repeat_spoken_words','repetition','Say “team effort” twice while explaining your contribution.','說明自己的貢獻時，說兩次「team effort」。'],
    ['team-simple',[5,9,11],'emphasize_one_word','emphasis','Stress “simple” when describing a job you would handle.','描述願意負責的工作時，強調「simple」。'],
    ['team-avoid',[5,9,11],'dramatic_pause','vocal_timing','Pause before admitting which job you would happily avoid.','承認樂得避開哪項工作前，稍微停頓。'],
    ['team-easy',[5,9,11],'prepared_one_line','prepared_sentence','Say: “I am available for the easy jobs.”','說出：「I am available for the easy jobs.」'],
    ['object-useful',[12,15,20,22,25,32,37,41,48],'repeat_spoken_words','repetition','Say “still useful” twice when describing an old object.','描述舊物時，說兩次「still useful」。'],
    ['object-mine',[12,15,20,22,25,32,37,41,48],'emphasize_one_word','emphasis','Stress “mine” while describing an object you would keep.','描述想保留的物品時，強調「mine」。'],
    ['object-keep',[12,15,20,22,25,32,37,41,48],'dramatic_pause','vocal_timing','Pause before revealing which object you cannot give away.','說出捨不得送走的物品前，稍微停頓。'],
    ['object-place',[12,15,20,22,25,32,37,41,48],'prepared_one_line','prepared_sentence','Say: “That object has earned its place.”','說出：「That object has earned its place.」'],
    ['routine-day',[18,19,21,23,33,40,43,45],'repeat_spoken_words','repetition','Say “every single day” twice when describing a routine.','描述日常習慣時，說兩次「every single day」。'],
    ['routine-time',[18,19,21,23,33,40,43,45],'emphasize_one_word','emphasis','Stress “uninterrupted” while explaining how you prefer spending time.','說明喜歡怎麼度過時間時，強調「uninterrupted」。'],
    ['routine-habit',[18,19,21,23,33,40,43,45],'dramatic_pause','vocal_timing','Pause before revealing your least glamorous daily habit.','說出最不光彩的日常習慣前，稍微停頓。'],
    ['routine-luxury',[18,19,21,23,33,40,43,45],'prepared_one_line','prepared_sentence','Say: “That is a tiny luxury to me.”','說出：「That is a tiny luxury to me.」'],
    ['help-little',[17,24,29,34,42,47],'repeat_spoken_words','repetition','Say “just a little help” twice while discussing helping someone.','談論幫忙時，說兩次「just a little help」。'],
    ['help-actually',[17,24,29,34,42,47],'emphasize_one_word','emphasis','Stress “actually” while explaining which kind of help works.','說明哪種幫忙有效時，強調「actually」。'],
    ['help-limit',[17,24,29,34,42,47],'dramatic_pause','vocal_timing','Pause before admitting when you do not want help.','承認什麼時候不想被幫忙前，稍微停頓。'],
    ['help-side',[17,24,29,34,42,47],'prepared_one_line','prepared_sentence','Say: “My helpful side has limits too.”','說出：「My helpful side has limits too.」'],
    ['hobby-try',[35,44,46,48],'repeat_spoken_words','repetition','Say “one more try” twice while discussing your hobby.','談論興趣時，說兩次「one more try」。'],
    ['hobby-fun',[35,44,46,48],'emphasize_one_word','emphasis','Stress “fun” while explaining why you enjoy a hobby.','說明為何喜歡某個興趣時，強調「fun」。'],
    ['hobby-eager',[35,44,46,48],'dramatic_pause','vocal_timing','Pause before admitting your most enthusiastic hobby moment.','說出投入興趣最熱情的那一刻前，稍微停頓。'],
    ['hobby-curiosity',[35,44,46,48],'prepared_one_line','prepared_sentence','Say: “Curiosity made that decision for me.”','說出：「Curiosity made that decision for me.」'],
    ['opinion-fast',[36,38,39],'repeat_spoken_words','repetition','Say “I judged too fast” twice.','說兩次「I judged too fast」。'],
    ['opinion-apparently',[36,38,39],'emphasize_one_word','emphasis','Stress “apparently” while correcting an opinion you once held.','修正以前的看法時，強調「apparently」。'],
    ['opinion-wrong',[36,38,39],'dramatic_pause','vocal_timing','Pause before revealing the moment you realized you were wrong.','說出發現自己想錯了的時刻前，稍微停頓。'],
    ['opinion-look',[36,38,39],'prepared_one_line','prepared_sentence','Say: “I owe that moment a second look.”','說出：「I owe that moment a second look.」'],
    ['social-hear',[25,26,27,28,29,30,31,32],'repeat_spoken_words','repetition','Say “hear me out” twice while explaining your response.','說明自己的回應時，說兩次「hear me out」。'],
    ['social-politely',[25,26,27,28,29,30,31,32],'emphasize_one_word','emphasis','Stress “politely” while explaining how you would respond.','說明會如何回應時，強調「politely」。'],
    ['social-awkward',[25,26,27,28,29,30,31,32],'dramatic_pause','vocal_timing','Pause before naming the part you would find awkward.','說出最讓你尷尬的部分前，稍微停頓。'],
    ['social-editing',[25,26,27,28,29,30,31,32],'prepared_one_line','prepared_sentence','Say: “My polite answer needs a little editing.”','說出：「My polite answer needs a little editing.」'],
    ['hobby-applications',[35],'prepared_one_line','prepared_sentence','Say: “My hobby is not accepting job applications.”','說出：「My hobby is not accepting job applications.」'],
    ['hobby-benefits',[35],'state_personal_number','quantity','Rate your hobby income as “zero, with excellent benefits.”','把興趣收入評為「zero, with excellent benefits」。'],
    ['opinion-expired',[36],'prepared_one_line','prepared_sentence','Say: “That opinion expired before I noticed.”','說出：「That opinion expired before I noticed.」'],
    ['opinion-now',[36],'correct_own_statement','correction','Restate your changed view with an emphatic “now.”','重述改變後的看法，特別強調「now」。'],
    ['mistake-education',[38],'reclassify_everyday_experience','reframe','Call your mistake a “highly educational bad idea.”','把自己的錯誤稱為「highly educational bad idea」。'],
    ['mistake-confidence',[38],'prepared_one_line','prepared_sentence','Say: “My confidence arrived before my common sense.”','說出：「My confidence arrived before my common sense.」'],
    ['pleasure-impressed',[45],'prepared_one_line','prepared_sentence','Say: “I am easily impressed by very small things.”','說出：「I am easily impressed by very small things.」'],
    ['pleasure-ten',[45],'state_personal_number','quantity','Rate a tiny pleasure as “ten out of ten.”','把一個小小的快樂評為「ten out of ten」。'],
    ['hobby-career',[35],'challenge_concrete_claim','reasoning','Reject “turn it into a business” as unsolicited career advice.','把「turn it into a business」駁為沒問就給的職涯建議。'],
    ['hobby-tip',[35],'give_one_step_instruction','instruction','Give one hobby tip as a “free sample.”','把一個興趣小技巧當成「free sample」說出來。'],
    ['opinion-past-me',[36],'challenge_concrete_claim','reasoning','Disagree with your old argument using “past me disagrees.”','用「past me disagrees」反對自己以前的論點。'],
    ['opinion-counterexample',[36],'give_counterexample','reasoning','Give one counterexample to your old view with “plot twist.”','說出舊看法的一個反例，加入「plot twist」。'],
    ['mistake-tip',[38],'give_one_step_instruction','instruction','Give one prevention tip as your “official lesson learned.”','把一個避免重蹈覆轍的方法稱為「official lesson learned」。'],
    ['mistake-apology',[38],'apologize_to_person','apology','Apologize for a past mistake with “my bad, very bad.”','為以前的錯誤道歉，說「my bad, very bad」。'],
    ['pleasure-upgrade',[45],'recommend_specific_item','advice','Recommend one tiny pleasure as a “five-star life upgrade.”','把一個小小的快樂推薦為「five-star life upgrade」。'],
    ['pleasure-reason',[45],'give_concrete_reason','reason','Explain one tiny pleasure using “because I deserve it.”','說明一個小小的快樂，加入「because I deserve it」。'],
    ['welcome-rating',[7],'state_personal_number','quantity','Rate your welcoming skills “seven out of ten, on good days.”','把自己的迎新能力評為「seven out of ten, on good days」。'],
    ['welcome-replies',[7],'give_practical_warning','warning','Warn a new friend about your group’s “legendary slow replies.”','用「legendary slow replies」提醒新朋友你們回訊息的速度。'],
    ['object-stars',[12,15],'state_personal_number','quantity','Rate an old object “five stars for staying useful.”','把一件舊物評為「five stars for staying useful」。'],
    ['object-catch',[12,15],'give_practical_warning','warning','Warn others about your item’s “one tiny catch.”','用「one tiny catch」提醒其他人這件物品的缺點。'],
    ['memory-correction',[23,43],'correct_own_statement','correction','Correct your story with a pointed “small correction.”','修正自己的故事，特別說出「small correction」。'],
    ['memory-detail',[23,43],'agree_with_specific_point','agreement','Endorse someone’s remembered detail with “that part absolutely counts.”','用「that part absolutely counts」贊同一位玩家記得的細節。'],
    ['mistake-excuse',[38],'challenge_concrete_claim','reasoning','Challenge your old excuse with “nice try, past me.”','用「nice try, past me」反駁以前為自己找的藉口。'],
    ['mistake-everyone',[38],'give_counterexample','reasoning','Give a counterexample to “everyone makes that mistake.”','針對「everyone makes that mistake」舉出一個反例。'],
    ['interest-phase',[46],'challenge_concrete_claim','reasoning','Challenge “just a passing phase” about your unexpected interest.','反駁把意外產生的興趣說成「just a passing phase」。'],
    ['interest-starter',[46],'give_one_step_instruction','instruction','Give one beginner tip as your “unofficial starter pack.”','把一個入門技巧稱為「unofficial starter pack」說出來。'],
    ['memory-rewind',[23],'short_sound_effect','sound_effect','Make a tiny rewind sound before describing your chosen memory.','描述選中的回憶前，用嘴發出一小聲倒帶音效。'],
    ['memory-stars',[23],'state_personal_number','quantity','Rate your chosen memory as “five stars, worth repeating.”','把選中的回憶評為「five stars, worth repeating」。']
  ];
  const generic=[
    ['plot-correction','correct_own_statement','correction','Say “plot twist” before correcting part of your answer.','更正回答的一部分前，說「plot twist」。'],
    ['dealbreaker','state_personal_stance','preference','Call one of your choices a “deal-breaker.”','把其中一個選擇稱為「deal-breaker」。'],
    ['number-one','numbered_statement','numbering','Number one point as “Reason number one.”','用「Reason number one」標出一個觀點。'],
    ['whisper-end','whisper_short_phrase','emphasis','Lower your voice for the last three words of your answer.','把回答最後三個字的音量放低。'],
    ['stretch','stretch_one_word','emphasis','Stretch one word slightly while giving your answer.','回答時，把一個字稍微拉長。'],
    ['pause-word','dramatic_pause','vocal_timing','Pause briefly before your most important word.','在最重要的一個字前，稍微停頓。'],
    ['ta-da','short_sound_effect','sound_effect','Add a tiny “ta-da” after giving your answer.','回答後，加上一聲小小的「ta-da」。'],
    ['absolutely','emphasize_one_word','emphasis','Begin your answer with an emphatic “Absolutely.”','用強調的「Absolutely」開始回答。']
  ];
  const voiceGroups=new Set(['dramatic_pause','whisper_short_phrase','stretch_one_word','short_sound_effect']);
  const newTasks=additions.map(([key,numbers,group,family,text,textZh])=>({key,numbers,group,family,text,textZh,isGeneric:false}))
    .concat(generic.map(([key,group,family,text,textZh])=>({key,group,family,text,textZh,isGeneric:true})))
    .map(({key,numbers,group,family,text,textZh,isGeneric})=>({
      id:'wolf_v6_soft_'+key,canonicalTaskKey:'v6-soft:'+key,type:'self_action',source:'wolf',
      text,textZh,family:family==='vocal_timing'?'pause':family,variantGroup:group,mechanicKey:group,compatibleTopicIds:numbers?topicIds(numbers):[],
      ...(isGeneric?{compatibleTopicTags:['*']}:{}),requiredOtherPlayerCount:0,isGeneric,
      actionTags:[family,...(utterances(text).length?['prepared_sentence']:[])],
      positiveClues:[group==='repeat_spoken_words'?'A task repeats words.':group==='prepared_one_line'?'A task uses a prepared sentence.':group==='dramatic_pause'?'A task uses a deliberate pause.':'A task gives its wording a little emphasis.'],
      positiveCluesZh:[group==='repeat_spoken_words'?'有任務會重複字詞。':group==='prepared_one_line'?'有任務使用指定句子。':group==='dramatic_pause'?'有任務刻意停頓。':'有任務會特別強調說法。'],
      requiredUtterances:utterances(text),performanceGroup:voiceGroups.has(group)?'voice':null,
      softTell:true,active:true,status:'active',reviewed:true,activityLanguage:'en',contentVersion:'chat-wolf-special-v6',
      editorial:{singleOutcome:true,audioOnly:true,plainLanguage:true,noticeableWording:true}
    }));
  const formalInteractionCount=previous.filter(task=>task.type==='interaction').length;
  const audit={previousCount:previous.length,previousSelfCount:previous.filter(task=>task.type==='self_action').length,
    overwrittenCount:overrides.length,addedCount:newTasks.length,addedTopicSpecificCount:additions.length,
    addedGenericCount:generic.length,defaultDisabledInteractionCount:formalInteractionCount,
    untouchedPreviousTextCount:previous.length-overrides.length,
    note:'Interaction cards remain archived. Selection, not client visibility, must exclude them in formal mode.'};
  return {overrides,newTasks,audit};
});
