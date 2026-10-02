/* Reviewed, voice-only party directions. Families describe audible mechanics;
 * they are deliberately broader than the wording of an individual card. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CHAT_WOLF_V6_DIRECTIONS=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // id, family, source, complete English, complete Traditional Chinese.
  const rows=[
    ['sing-sentence','singing','shared_soft_tell','Sing one sentence from your answer.','把回答中的一句話唱出來。'],
    ['hum-word','singing','shared_soft_tell','Hum the last word of one sentence.','把一句話的最後一個字輕哼出來。'],
    ['jingle','singing','director_only','Turn your first sentence into a tiny jingle.','把第一句話唱成一小段廣告歌。'],
    ['gentle-tune','singing','director_only','Give one sentence a gentle musical rhythm.','用輕柔的旋律節奏說一句話。'],
    ['drumroll','sound_effect','shared_soft_tell','Make a short drumroll before answering.','回答前，用嘴發出一小段鼓聲。'],
    ['ding','sound_effect','shared_soft_tell','Add one little “ding” to your answer.','回答時加上一聲小小的「ding」。'],
    ['animal','sound_effect','director_only','Make one animal sound before speaking.','開口前，模仿一聲動物叫聲。'],
    ['swoosh','sound_effect','director_only','Add one ridiculous swoosh to your answer.','回答時加上一聲誇張的「咻」。'],
    ['gasp','dramatic_reaction','shared_soft_tell','Make a tiny dramatic gasp before answering.','回答前，戲劇化地輕輕倒抽一口氣。'],
    ['award','dramatic_reaction','director_only','Give an acceptance-speech “Thank you!” after answering.','回答後，用得獎感言的語氣說「Thank you!」。'],
    ['shocked','dramatic_reaction','director_only','Give a shocked “What?!” after hearing the previous answer.','聽完上一個回答後，用震驚的語氣說「What?!」。'],
    ['victory','dramatic_reaction','director_only','Give a tiny victory cheer before answering.','回答前，發出一聲小小的勝利歡呼。'],
    ['trailer','voice_style','director_only','Say one sentence like a movie trailer.','用電影預告片的語氣說一句話。'],
    ['sports','voice_style','director_only','Say one sentence like a sports commentator.','用體育主播的語氣說一句話。'],
    ['villain','voice_style','director_only','Say one line like a villain revealing a plan.','像反派揭露計畫一樣說一句話。'],
    ['commercial','voice_style','director_only','Say your first sentence like a cheerful advertisement.','像歡樂的廣告一樣說第一句話。'],
    ['curiosity','short_phrase','shared_soft_tell','Say: “I blame curiosity.”','說出：「I blame curiosity.」'],
    ['regret','short_phrase','shared_soft_tell','Say: “I would regret that tomorrow.”','說出：「I would regret that tomorrow.」'],
    ['official','short_phrase','director_only','Say: “That is my official statement.”','說出：「That is my official statement.」'],
    ['stand','short_phrase','director_only','Say: “I stand by that tiny decision.”','說出：「I stand by that tiny decision.」'],
    ['name','repetition','shared_soft_tell','Use one other player’s name three times while speaking.','說話時，三次提到同一位其他玩家的名字。'],
    ['mean','repetition','shared_soft_tell','Say “I mean” twice during your answer.','回答時說兩次「I mean」。'],
    ['last-word','repetition','shared_soft_tell','Repeat your last word twice for emphasis.','為了強調，把最後一個字說兩次。'],
    ['wait','repetition','director_only','Start with an unnecessarily dramatic “Wait, wait, wait.”','用過度戲劇化的「Wait, wait, wait」開場。'],
    ['clap','rhythm','shared_soft_tell','Clap three times before giving your answer.','回答前，拍手三次。'],
    ['beat','rhythm','shared_soft_tell','Make three quiet mouth beats before answering.','回答前，用嘴發出三個輕輕的節拍。'],
    ['bounce','rhythm','director_only','Give one sentence a bouncy speaking rhythm.','用有彈跳感的節奏說一句話。'],
    ['robot-beat','rhythm','director_only','Say one short sentence in a steady robot rhythm.','用機器人的固定節奏說一句短句。'],
    ['breaking','unusual_opening','director_only','Start your answer with “Breaking news!”','用「Breaking news!」開始回答。'],
    ['plot','unusual_opening','director_only','Start your answer with “Plot twist!”','用「Plot twist!」開始回答。'],
    ['confession','unusual_opening','director_only','Start with a dramatic “Tiny confession…”','用戲劇化的「Tiny confession…」開場。'],
    ['announcement','unusual_opening','director_only','Begin with “A completely unnecessary announcement…”','用「A completely unnecessary announcement…」開場。'],
    ['case','unusual_ending','director_only','End your answer with “Case closed.”','用「Case closed.」結束回答。'],
    ['audience','unusual_ending','director_only','End with “Thank you for attending my tiny speech.”','最後說「Thank you for attending my tiny speech.」。'],
    ['end','unusual_ending','director_only','Finish with an unnecessarily dramatic “The end.”','用過度戲劇化的「The end.」收尾。'],
    ['final','unusual_ending','director_only','End your sentence with “And that is final.”','用「And that is final.」結束一句話。'],
    ['weather','playful_narration','director_only','Deliver one sentence like a weather forecast.','像播報天氣預報一樣說一句話。'],
    ['tour','playful_narration','director_only','Explain your answer like a cheerful tour guide.','像開心的導遊一樣說出回答。'],
    ['documentary','playful_narration','director_only','Narrate one sentence like a nature documentary.','像自然紀錄片的旁白一樣說一句話。'],
    ['news-anchor','playful_narration','director_only','Deliver your answer like a very serious news anchor.','像非常嚴肅的新聞主播一樣說出回答。'],
    ['countdown','tempo','director_only','Count “Three, two, one” before giving your answer.','回答前說「Three, two, one」。'],
    ['slow','tempo','shared_soft_tell','Say your first three words unusually slowly.','把開頭三個字說得特別慢。'],
    ['pause','tempo','shared_soft_tell','Pause dramatically before the last word of your sentence.','在一句話的最後一個字前，戲劇化地停頓。'],
    ['quick','tempo','director_only','Say one short sentence surprisingly quickly.','把一句短句說得出乎意料地快。'],
    ['stretch','emphasis','shared_soft_tell','Stretch one word in your answer slightly.','把回答中的一個字稍微拉長。'],
    ['whisper','emphasis','shared_soft_tell','Whisper the last three words of your answer.','把回答的最後三個字輕聲說出來。'],
    ['grand','emphasis','director_only','Give one ordinary word a grand dramatic emphasis.','戲劇化地強調一個普通的字。'],
    ['question','emphasis','director_only','Say one statement with a surprised question tone.','用驚訝的疑問語氣說一句陳述。']
  ];
  const directions=rows.map(([id,family,source,text,textZh])=>({
    id:'direction_v6_'+id,text,textZh,family,mechanicKey:family,source,
    pressure:'low',active:true,reviewed:true,activityLanguage:'en',
    requiredUtterances:Array.from(text.matchAll(/“([^”]+)”/g),m=>m[1].replace(/[.!?…]+$/,'')),
    editorial:{singleOutcome:true,audioOnly:true,noProps:true},contentVersion:'chat-wolf-special-v6'
  }));
  return {directions};
});
