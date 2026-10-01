/* Shared semantic tags prevent aliases in separately authored banks from
 * producing false negative clues. Near-variant groups are gameplay mechanics,
 * not a fresh group for every topic or every change of wording.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CHAT_WOLF_V4_TAXONOMY=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const aliases = {
    fixed_phrase:'prepared_sentence',quotation:'prepared_sentence',quoted_line:'prepared_sentence',
    spoken_notice:'prepared_sentence',short_dialogue:'prepared_sentence',correction:'prepared_sentence',
    comparison:'analogy',choose_one:'choice',
    practical_fix:'advice',recommendation:'advice',compose_reply:'reply',repair:'reply',
    specific_limit:'boundary',personal_boundary:'boundary',time_limit:'boundary',number_limit:'boundary',
    price_offer:'absurd_price',address_object:'object_address',object_promise:'object_address',
    estimation:'quantity',number_guess:'quantity',absurd_quantity:'quantity',
    fairness_exception:'exception',direct_question:'ask_question'
  };
  const groups = {
    compare_unlike_things:'compare_unlike_things',concrete_comparison:'compare_unlike_things',
    compare_object_to_person:'compare_unlike_things',compare_place_to_system:'compare_unlike_things',
    compare_energy_to_money:'compare_unlike_things',hobby_as_medicine:'compare_unlike_things',photo_as_weather:'compare_unlike_things',
    compose_short_reply:'compose_short_reply',short_reply:'compose_short_reply',
    soften_a_refusal:'compose_short_reply',write_permission_request:'compose_short_reply',
    replace_vague_praise:'compose_short_reply',write_delay_message:'compose_short_reply',
    recommend_one_item:'practical_suggestion',suggest_rest_boundary:'set_a_specific_limit',
    concrete_choice:'choose_one_of_two',sequence_decision:'choose_action_order',
    time_boundary:'set_a_specific_limit',quantity_boundary:'set_a_specific_limit',
    personal_boundary:'set_a_specific_limit',estimate_comfortable_duration:'set_a_specific_limit',
    estimate_fair_requests:'set_a_specific_limit',apologize_to_object:'apologize_to_object',
    'object-apology':'apologize_to_object',speak_to_object:'address_object',
    object_personification:'address_object',two_line_dialogue:'short_two_line_dialogue',
    numerical_guess:'get_number_estimate',imaginary_price:'quote_absurd_price'
  };
  const negatives = {
    prepared_sentence:['No wolf task requires using prepared English wording.','本局沒有要求使用預先寫好英文台詞的狼任務。'],
    analogy:['No wolf task requires making a comparison between unlike things.','本局沒有要求把兩種不相似事物相比的狼任務。'],
    choice:['No wolf task requires someone to choose between given options.','本局沒有要求別人在指定選項中做選擇的狼任務。'],
    advice:['No wolf task requires getting a practical suggestion or recommendation.','本局沒有要求取得實用建議或推薦的狼任務。'],
    reply:['No wolf task requires getting help to write or improve a reply.','本局沒有要求別人幫忙想回覆或改善一句話的狼任務。'],
    boundary:['No wolf task requires another player to state a limit or boundary.','本局沒有要求另一位玩家說出限制或界線的狼任務。'],
    absurd_price:['No wolf task requires proposing an unusual price or payment.','本局沒有要求提出不尋常價錢或付款的狼任務。'],
    object_address:['No wolf task requires speaking directly to an object.','本局沒有要求直接對物品說話的狼任務。'],
    singing:['No wolf task requires singing.','本局沒有要求唱歌的狼任務。'],
    sound_effect:['No wolf task requires making a sound effect.','本局沒有要求製造音效的狼任務。'],
    repetition:['No wolf task requires repeating a phrase.','本局沒有要求重複短句的狼任務。'],
    clapping:['No wolf task requires clapping.','本局沒有要求鼓掌的狼任務。'],
    apology:['No wolf task requires making an apology.','本局沒有要求道歉的狼任務。'],
    ranking:['No wolf task requires putting options in order.','本局沒有要求把選項排序的狼任務。'],
    invitation:['No wolf task requires offering an invitation.','本局沒有要求提出邀請的狼任務。'],
    negotiation:['No wolf task requires offering a trade.','本局沒有要求提出交換的狼任務。']
  };
  function normalize(tasks) {
    const canonicalByText = new Map();
    return tasks.map(task => {
      const tags = new Set((task.actionTags||[]).map(t=>aliases[t]||t));
      // Conservatively withhold a negative prepared-wording clue whenever any
      // quoted wording appears on an actual card, even if it is only an option.
      if(/["“][^"”]+["”]/.test(task.text))tags.add('prepared_sentence');
      if(/\bapologi[sz]e\b/i.test(task.text))tags.add('apology');
      if(/\b(sing|humm?)\b/i.test(task.text))tags.add('singing');
      if(/\b(clap|clapping)\b/i.test(task.text))tags.add('clapping');
      const normalizedText=task.type+':'+task.text.toLowerCase().replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
      const canonicalTaskKey=canonicalByText.get(normalizedText)||task.canonicalTaskKey;
      canonicalByText.set(normalizedText,canonicalTaskKey);
      let variantGroup=groups[task.variantGroup]||task.variantGroup;
      if(task.type==='self_action' && ['fixed_phrase','quotation','quoted_line'].some(tag=>(task.actionTags||[]).includes(tag)) &&
          task.performanceGroup!=='voice' && /^(Say|Read|Read out)\b/i.test(task.text))variantGroup='prepared_one_line';
      const family=aliases[task.family]||task.family;
      return {...task,canonicalTaskKey,variantGroup,mechanicKey:variantGroup,family,actionTags:[...tags]};
    });
  }
  return {normalize,
    exclusionClues:Object.fromEntries(Object.entries(negatives).map(([k,v])=>[k,v[0]])),
    exclusionCluesZh:Object.fromEntries(Object.entries(negatives).map(([k,v])=>[k,v[1]]))};
});
