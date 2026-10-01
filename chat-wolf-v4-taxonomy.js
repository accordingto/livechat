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
    numerical_guess:'get_number_estimate',imaginary_price:'quote_absurd_price',
    guess_a_number:'get_number_estimate',
    judge_a_fairness_exception:'exception_to_rule',exception_to_concrete_rule:'exception_to_rule',
    exception_to_quiet_rule:'exception_to_rule',exception_to_no_lending:'exception_to_rule',
    ask_specific_question:'ask_topic_question',ask_before_helping:'ask_topic_question',ask_beginner_question:'ask_topic_question',
    challenge_a_premise:'challenge_concrete_claim',repair_given_claim:'challenge_concrete_claim',challenge_absurd_claim:'challenge_concrete_claim',
    offer_chore_trade:'offer_concrete_exchange',trade_planning_duties:'offer_concrete_exchange',
    offer_skill_exchange:'offer_concrete_exchange',make_conditional_bargain:'offer_concrete_exchange',
    give_playful_warning:'invent_warning',make_playful_calculation:'make_mock_calculation',
    reverse_a_usual_priority:'reverse_priority',reinterpret_everyday_purpose:'reclassify_everyday_experience',
    rest_is_appointment:'reclassify_everyday_experience',mistake_as_tuition:'reclassify_everyday_experience',
    object_new_caretaker:'reclassify_everyday_experience',absence_as_present:'reclassify_everyday_experience',
    playful_self_correction:'rephrase_a_statement',defend_unpopular_choice:'defend_minor_flaw',
    defend_unpopular_side:'defend_minor_flaw',defend_useless_object:'defend_minor_flaw',
    invite_imaginary_gathering:'invite_small_experiment',invite_without_activity:'invite_small_experiment',invite_unfinished_work:'invite_small_experiment',
    imitate_appliance_sound:'short_sound_effect',imitate_alert_sound:'short_sound_effect',
    imitate_activation_sound:'short_sound_effect',self_added_story_sound:'short_sound_effect',
    sing_one_line:'sing_short_phrase',clap_short_beat:'three_audible_beats',
    guess_my_object_choice:'guess_my_choice',guess_my_time_choice:'guess_my_choice'
  };
  // Families are broad editorial buckets shared by all banks, never unique
  // per sentence/topic. Mechanic groups above retain the stricter deduping key.
  const families = {
    food_choice:'choice',concrete_choice:'choice',sequence_decision:'ranking',
    short_reply:'reply',finish_given_sentence:'reply',focused_question:'question',ask_question:'question',
    practical_suggestion:'advice',time_boundary:'boundary',quantity_boundary:'boundary',
    object_personification:'object_address',gratitude:'object_address',
    short_quotation:'prepared_sentence',read_short_notice:'prepared_sentence',two_line_dialogue:'prepared_sentence',
    price_or_payment:'absurd_price',playful_suggestion:'proposal',absurd_proposal:'proposal',
    fairness_judgment:'exception',concrete_comparison:'analogy',proposed_rule:'rule',
    numerical_guess:'quantity',spoken_correction:'reframe',correction:'reframe',
    try_an_activity:'invitation',explain_a_benefit:'reasoning',
    defense:'reasoning',disagreement:'reasoning',inference:'reasoning',persuasion:'reasoning',
    evaluation:'reasoning',perspective:'reasoning',absurd_choice:'preference',
    appeal:'negotiation',restitution:'negotiation',support:'negotiation',
    reversal:'reframe',understatement:'reframe',attribution:'reframe',
    objection:'complaint',concession:'confession',celebration:'commitment',
    bureaucracy:'rule',permission:'rule',simplification:'proposal',
    clapping:'sound_effect',vocal_timing:'sound_effect',repetition:'prepared_sentence'
  };
  const normalizeGroup = value => groups[value] || value;
  function normalizeFamily(value) {
    const aliased=aliases[value]||value;
    return families[value]||families[aliased]||aliased;
  }
  function normalizeHistoryEntry(entry) {
    const group=normalizeGroup(entry.variantGroup||entry.mechanicKey);
    return {...entry,variantGroup:group,mechanicKey:group,family:normalizeFamily(entry.family)};
  }
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
      if(/\b(sound effect|imitate .*sound|make .*sound)\b/i.test(task.text))tags.add('sound_effect');
      if(/\b(trade|exchange|bargain)\b/i.test(task.text))tags.add('negotiation');
      if(/\b(price|pay|payment|rent|refund|charge|cost|coins?)\b/i.test(task.text))tags.add('absurd_price');
      if(/\b(invite|invitation)\b/i.test(task.text))tags.add('invitation');
      const normalizedText=task.type+':'+task.text.toLowerCase().replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
      const canonicalTaskKey=canonicalByText.get(normalizedText)||task.canonicalTaskKey;
      canonicalByText.set(normalizedText,canonicalTaskKey);
      let variantGroup=normalizeGroup(task.variantGroup);
      if(task.type==='self_action' && ['fixed_phrase','quotation','quoted_line'].some(tag=>(task.actionTags||[]).includes(tag)) &&
          task.performanceGroup!=='voice' && /^(Say|Read|Read out)\b/i.test(task.text))variantGroup='prepared_one_line';
      const family=normalizeFamily(task.family);
      if(negatives[family])tags.add(family);
      if(['address_object','apologize_to_object','thank_object','promise_to_object'].includes(variantGroup))tags.add('object_address');
      if(/\b(ask|beg|tell|thank|address|apologize to) (a |an |the |your )?(cupboard|photograph|phone|wallet|alarm|lamp|picture|object)\b/i.test(task.text))tags.add('object_address');
      return {...task,canonicalTaskKey,variantGroup,mechanicKey:variantGroup,family,actionTags:[...tags]};
    });
  }
  return {normalize,normalizeGroup,normalizeFamily,normalizeHistoryEntry,
    exclusionClues:Object.fromEntries(Object.entries(negatives).map(([k,v])=>[k,v[0]])),
    exclusionCluesZh:Object.fromEntries(Object.entries(negatives).map(([k,v])=>[k,v[1]]))};
});
