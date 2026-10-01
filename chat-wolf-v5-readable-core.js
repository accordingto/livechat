/* A small, explicit generic bank. At most one generic card can be dealt.
 * It is not used to pad each topic's authored natural-conversation count. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CHAT_WOLF_V5_READABLE_CORE=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const rows=[
    ['regret','prepared_one_line','prepared_sentence','Say: “I would regret that tomorrow.”','說出：「I would regret that tomorrow.」',null],
    ['clap','three_audible_beats','clapping','Clap three times after agreeing with someone.','贊同一位玩家後，拍手三次。',null],
    ['sing','sing_short_phrase','singing','Sing one sentence from your own answer.','把自己回答中的一句話唱出來。','voice'],
    ['name','repeat_spoken_words','repetition',"Use another player's name three times while speaking.",'說話時三次提到同一位其他玩家的名字。',null],
    ['echo','repeat_spoken_words','repetition','Repeat the last three words another player says.','重複另一位玩家剛說的最後三個字。',null],
    ['drumroll','short_sound_effect','sound_effect','Make a short drumroll before giving your answer.','回答前，用嘴發出一小段鼓聲。','voice'],
    ['mean','repeat_spoken_words','repetition','Repeat “I mean” twice during your answer.','回答時說兩次「I mean」。',null],
    ['changed','correct_own_statement','correction','Change your answer after hearing another player.','聽過另一位玩家的話之後，更改自己的回答。',null]
  ];
  const clues={prepared_sentence:['A task uses a prepared sentence.','有任務使用指定句子。'],
    clapping:['A task involves clapping.','有任務涉及拍手。'],singing:['A task involves singing.','有任務涉及唱歌。'],
    repetition:['A task involves repeating words.','有任務涉及重複字詞。'],sound_effect:['A task involves a sound effect.','有任務涉及音效。'],
    correction:['A task involves changing an answer.','有任務涉及改變回答。']};
  return {tasks:rows.map(([key,group,family,text,textZh,performanceGroup])=>({
    id:'w5-core-'+key,canonicalTaskKey:key==='clap'?'clap-three-audible-beats':'w5-core:'+key,
    type:'self_action',source:'wolf',text,textZh,family,variantGroup:group,mechanicKey:group,
    compatibleTopicTags:['*'],compatibleTopicIds:[],requiredOtherPlayerCount:0,
    actionTags:[family],positiveClues:[clues[family][0]],positiveCluesZh:[clues[family][1]],
    requiredUtterances:Array.from(text.matchAll(/“([^”]+)”/g),m=>m[1]),
    isGeneric:true,performanceGroup,active:true,status:'active',reviewed:true,activityLanguage:'en',
    contentVersion:'chat-wolf-readable-v5',editorial:{singleOutcome:true,audioOnly:true,plainLanguage:true}
  }))};
});
