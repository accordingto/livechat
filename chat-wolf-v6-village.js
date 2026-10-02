/* Incremental editorial corrections for the existing village task bank.
 * The v4 source remains intact for dealt snapshots and history migration.
 * Every current main question, follow-up and original card was reviewed.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./chat-wolf-v4-village.js'));
  else root.CHAT_WOLF_V6_VILLAGE=factory(root.CHAT_WOLF_V4_VILLAGE);
})(typeof globalThis!=='undefined'?globalThis:this,function(legacy){
  'use strict';
  const base=Array.isArray(legacy)?legacy:legacy.tasks;
  const version='chat-wolf-village-v6';
  const sourceById=new Map(base.map(t=>[t.id,t]));
  const changes=[];
  const replacements=new Map();

  function edit(id,text,textZh,options={}){
    const old=sourceById.get(id);
    if(!old)throw new Error('Unknown village correction: '+id);
    const task=JSON.parse(JSON.stringify(old));
    task.text=text;
    task.textZh=textZh;
    task.contentVersion=version;
    if(options.changedGoal){
      task.id=id.replace('villager_v4_','villager_v6_');
      task.canonicalTaskKey=old.canonicalTaskKey.replace(/^v4:/,'v6:');
      task.replaces=[id];
    }
    if(options.group){task.variantGroup=options.group;task.mechanicKey=options.group;}
    if(options.family)task.family=options.family;
    if(options.tags)task.actionTags=options.tags;
    if(options.utterances)task.requiredUtterances=options.utterances;
    if(Object.hasOwn(options,'performanceGroup'))task.performanceGroup=options.performanceGroup;
    replacements.set(id,task);
    changes.push({oldId:id,newId:task.id,kind:options.changedGoal?'goal_rewrite':'wording',reason:options.reason||'Shorter, literal single-action instruction.'});
  }

  // Judge's existing reward is unchanged. These are personal chat actions;
  // none require another player's answer, agreement or participation.
  const judgeRows=[
    ['01',1,'Explain which travel comfort matters most to you.','說明你最重視哪一項旅行舒適。','name_specific_priority','priority'],
    ['01',2,'Suggest one fair way to handle a late travel companion.','建議一個公平處理旅伴遲到的方法。','propose_simple_change','planning'],
    ['02',1,'Mention one household rule you would suggest for sharing a home.','說出一條你會建議的共住規則。','mention_specific_detail','detail'],
    ['02',2,'Describe your limit for borrowing food from the shared fridge.','說明你對借拿共用冰箱食物的界線。','set_a_specific_limit','boundary'],
    ['03',1,'Say when you would prefer quiet during our car ride.','說出這趟車程中你何時比較想安靜。','state_personal_stance','opinion'],
    ['03',2,'Suggest one way to share control of the car music.','建議一個輪流決定車上音樂的方法。','propose_simple_change','planning'],
    ['04',1,'Explain whether you prefer reading or walking at the cabin.','說明在小屋度假時你偏好閱讀還是散步。','compare_real_options','comparison'],
    ['04',2,'Say how much alone time would help you relax this weekend.','說出這個週末多少獨處時間能幫助你放鬆。','state_personal_number','quantity'],
    ['05',1,'Name one interruption you would allow while working together.','說出一起工作時你能接受的一種打擾。','set_a_specific_limit','boundary'],
    ['05',2,'Suggest a simple signal for needing quiet at our shared table.','建議一個在共用桌旁表示需要安靜的簡單信號。','propose_simple_change','planning'],
    ['06',1,'Choose one offline activity you would enjoy at our gathering.','選出一項你會在聚會中享受的離線活動。','state_personal_stance','opinion'],
    ['06',2,'Explain whether looking up answers improves a conversation for you.','說明查答案對你來說會不會改善聊天。','give_one_reason','reason'],
    ['07',1,'Suggest one easy way to include our new friend.','建議一個讓新朋友有參與感的簡單方法。','propose_simple_change','planning'],
    ['07',2,'Say which introduction question you would avoid asking a newcomer.','說出你會避免問新朋友哪種自我介紹問題。','set_a_specific_limit','boundary'],
    ['08',1,'Name the kitchen job you would happily take.','說出一項你樂意接手的廚房工作。','offer_concrete_help','help'],
    ['08',2,'Explain whether dinner timing or appearance matters more to you.','說明你更重視晚餐準時還是外觀。','compare_real_options','comparison'],
    ['09',1,'Suggest a shop rule that would make work more relaxing.','建議一條讓經營小店更輕鬆的規則。','propose_simple_change','planning'],
    ['09',2,'Say whether customers should be welcome without buying anything.','說出你是否歡迎不買東西的客人。','state_personal_stance','opinion'],
    ['10',1,'Name the birthday detail most worth our limited money.','說出有限生日預算最值得花在哪個細節。','name_specific_priority','priority'],
    ['10',2,'Suggest a birthday surprise that would not embarrass our friend.','建議一個不會讓朋友尷尬的生日驚喜。','propose_simple_change','planning'],
    ['11',1,'Choose one everyday talent you would put in our show.','選出一項你會放進節目的日常本事。','state_personal_stance','opinion'],
    ['11',2,'Say which accidental moment you would keep in our episode.','說出你會把哪種意外片段留在節目中。','mention_specific_detail','detail'],
    ['12',1,'Explain whether an exhibit needs its object or just a photo.','說明展覽需要物品本身還是照片就夠了。','compare_real_options','comparison'],
    ['12',2,'Name one personal detail you would leave off an exhibit label.','說出一個你不會寫在展覽標籤上的私人細節。','set_a_specific_limit','boundary'],
    ['13',1,'Suggest one party activity that guests could comfortably skip.','建議一項客人可以自在略過的聚會活動。','propose_simple_change','planning'],
    ['13',2,'Say what would make you leave a party early.','說出什麼情況會讓你提早離開聚會。','set_a_specific_limit','boundary'],
    ['14',1,'Choose our first stop in your ordinary neighborhood.','選出你會帶朋友在普通街區逛的第一站。','state_personal_stance','opinion'],
    ['14',2,'Explain what makes a local place worth a slow visit.','說明什麼會讓一個在地場所值得慢慢逛。','give_one_reason','reason'],
    ['15',1,'Say how much unequal value would bother you in a swap.','說出交換物品價值差多少時你會在意。','set_a_specific_limit','boundary'],
    ['15',2,'Suggest one use for swap-shop items nobody wants.','建議一個沒人要的交換物品還能做的用途。','propose_simple_change','planning'],
    ['16',1,'Name the room feature most important for your rest.','說出休息室中對你最重要的一項設計。','name_specific_priority','priority'],
    ['16',2,'Explain whether you would prefer conversation or quiet after work.','說明下班後你偏好聊天還是安靜。','compare_real_options','comparison'],
    ['17',1,'Say when a helpful neighbor should be free to refuse requests.','說出會幫忙的鄰居何時應能自由拒絕請求。','set_a_specific_limit','boundary'],
    ['17',2,'Suggest a small thank-you for a neighbor with useful powers.','建議一份送給有實用能力鄰居的小謝禮。','propose_simple_change','planning'],
    ['18',1,'Choose the part of a friend’s routine you would try first.','選出你最想先體驗的朋友日常安排。','state_personal_stance','opinion'],
    ['18',2,'Name one part of your routine a visitor might struggle with.','說出訪客可能難以適應你日常的哪一部分。','mention_specific_detail','detail'],
    ['19',1,'Say where you would put an extra hour in your day.','說出你會把額外一小時放在一天的哪個時段。','state_personal_stance','opinion'],
    ['19',2,'Explain whether your extra hour needs to produce anything.','說明你是否要求額外一小時有任何成果。','give_one_reason','reason'],
    ['20',1,'Choose the household object whose complaint you would hear first.','選出你最想先聽哪件家中物品的抱怨。','state_personal_stance','opinion'],
    ['20',2,'Suggest one habit you would change after an object complained.','建議一個聽到物品抱怨後你願意改的習慣。','propose_simple_change','planning'],
    ['21',1,'Name one mistake you would leave unchanged without a redo.','說出一個即使可以重來也會保留原樣的失誤。','state_personal_stance','opinion'],
    ['21',2,'Suggest one limit for using the ten-second redo button.','建議一條使用重來十秒按鈕的限制。','set_a_specific_limit','boundary'],
    ['22',1,'Choose a future object you would hope to receive.','選出一件你希望從未來收到的物品。','state_personal_stance','opinion'],
    ['22',2,'Explain whether you would prefer a future work or hobby clue.','說明你比較想收到未來工作還是興趣的線索。','compare_real_options','comparison'],
    ['23',1,'Say whether you would trust your memory or a recording.','說出你會相信自己的回憶還是一份記錄。','state_personal_stance','opinion'],
    ['23',2,'Name the small detail you would look for in an old moment.','說出重看過往片刻時你會注意哪個小細節。','mention_specific_detail','detail'],
    ['24',1,'Name the daily task you would keep doing without magic services.','說出即使有魔法服務你仍會自己做的日常工作。','set_a_specific_limit','boundary'],
    ['24',2,'Suggest something you could trade for a magic service.','建議一樣能用來交換魔法服務的東西。','propose_simple_change','planning'],
    ['25',1,'Say what you would do with a thoughtful but unwanted gift.','說出你會如何處理用心但不想要的禮物。','state_personal_stance','opinion'],
    ['25',2,'Explain whether you prefer a surprise or a requested gift.','說明你偏好驚喜還是自己指定的禮物。','compare_real_options','comparison'],
    ['26',1,'Suggest one way to split a dinner bill fairly.','建議一個公平分攤晚餐帳單的方法。','propose_simple_change','planning'],
    ['26',2,'Say when you would discuss the bill with dinner friends.','說出你會在何時和聚餐朋友討論帳單。','state_personal_stance','opinion'],
    ['27',1,'Name one kind of group message you would answer quickly.','說出一種你會立刻回覆的群組訊息。','mention_specific_detail','detail'],
    ['27',2,'Explain whether an emoji counts as taking part in your group.','說明在你的群組中表情符號算不算有參與。','give_one_reason','reason'],
    ['28',1,'Say what friends should ask before posting your group photo.','說出朋友公開你的合照前應先問什麼。','set_a_specific_limit','boundary'],
    ['28',2,'Suggest a polite way to ask friends not to share a photo.','建議一個禮貌請朋友不要分享照片的方法。','propose_simple_change','planning'],
    ['29',1,'Name the task you would rather handle without help.','說出一項你寧願自己處理、不需要幫忙的工作。','set_a_specific_limit','boundary'],
    ['29',2,'Explain whether you prefer company or practical help during a task.','說明做事時你比較想要陪伴還是實際幫忙。','compare_real_options','comparison'],
    ['30',1,'Suggest a kind sentence for cancelling an accepted invitation.','建議一句用來取消已答應邀約的友善說法。','propose_simple_change','planning'],
    ['30',2,'Say how much notice you need when a friend cancels.','說出朋友取消活動時你需要提前多久得知。','state_personal_number','quantity'],
    ['31',1,'Say whether you would offer encouragement or specific feedback first.','說出你會先給鼓勵還是具體回饋。','state_personal_stance','opinion'],
    ['31',2,'Explain which kind of criticism you find easiest to hear.','說明你最能聽得進哪種批評。','give_one_reason','reason'],
    ['32',1,'Name the wear you would accept on something you lent.','說出借出物品出現哪些使用痕跡你能接受。','set_a_specific_limit','boundary'],
    ['32',2,'Suggest a fair response to a small scratch on a borrowed item.','建議一個公平處理借物小刮傷的方法。','propose_simple_change','planning'],
    ['33',1,'Choose one daily decision you would keep making yourself.','選出一個你仍會自己做的日常決定。','set_a_specific_limit','boundary'],
    ['33',2,'Explain whether you want surprising or familiar recommendations.','說明你想收到驚喜還是熟悉的推薦。','compare_real_options','comparison'],
    ['34',1,'Name the planning task you would keep or hand over.','說出一項你會保留或交給別人的安排工作。','state_personal_stance','opinion'],
    ['34',2,'Suggest a way for friends to share organizing the next gathering.','建議一個朋友分擔下次聚會安排的方法。','propose_simple_change','planning'],
    ['35',1,'Say which hobby request you would turn down.','說出你會拒絕哪種和興趣有關的請求。','set_a_specific_limit','boundary'],
    ['35',2,'Explain whether earning money would improve your hobby.','說明從興趣賺錢會不會讓它更好。','give_one_reason','reason'],
    ['36',1,'Name one experience that could change a strongly held opinion.','說出一種可能改變你堅定看法的經驗。','mention_specific_detail','detail'],
    ['36',2,'Suggest a comfortable way to admit you changed your mind.','建議一個自在承認自己改變想法的方法。','propose_simple_change','planning'],
    ['37',1,'Choose one old object you would save from a clear-out.','選出一件整理時你一定會留下的舊物。','state_personal_stance','opinion'],
    ['37',2,'Explain whether a photo could replace an old object for you.','說明對你來說照片能不能取代一件舊物。','compare_real_options','comparison'],
    ['38',1,'Say when teasing about a small mistake would stop feeling fun.','說出小失誤的玩笑開到哪裡就不好玩了。','set_a_specific_limit','boundary'],
    ['38',2,'Suggest a simple way to remember your keys.','建議一個記得帶鑰匙的簡單方法。','propose_simple_change','planning'],
    ['39',1,'Say whether first impressions or later actions matter more to you.','說出你更重視第一印象還是後來的行動。','compare_real_options','comparison'],
    ['39',2,'Name one action that would make you reconsider a first impression.','說出一個會讓你重新考慮第一印象的舉動。','mention_specific_detail','detail'],
    ['40',1,'Say when you would willingly set aside one unusual habit.','說出你會在何時自願暫時放下某個奇特習慣。','set_a_specific_limit','boundary'],
    ['40',2,'Explain one ordinary benefit of a habit your friends find strange.','說明一個朋友覺得奇怪的習慣有什麼日常好處。','give_one_reason','reason'],
    ['41',1,'Say whether you would return or give away an unused purchase.','說出你會退回還是送出一件不用的購買物。','state_personal_stance','opinion'],
    ['41',2,'Suggest one check before buying that item again.','建議一項再次購買那件物品前應做的確認。','propose_simple_change','planning'],
    ['42',1,'Name a small gesture of care you would welcome today.','說出一個你今天會樂意收到的小小體貼。','mention_specific_detail','detail'],
    ['42',2,'Explain whether you prefer someone to ask or quietly notice.','說明你偏好別人直接詢問還是默默注意。','compare_real_options','comparison'],
    ['43',1,'Suggest a backup plan for a café that is closed.','為咖啡店沒開的情況建議一個備案。','propose_simple_change','planning'],
    ['43',2,'Say how far off-plan a day can go while staying fun.','說出一天偏離計畫到什麼程度你仍能享受。','set_a_specific_limit','boundary'],
    ['44',1,'Choose one small skill you would enjoy teaching.','選出一項你樂意教別人的小本事。','state_personal_stance','opinion'],
    ['44',2,'Explain whether you learn a small skill by watching or trying.','說明學小本事時你偏好看示範還是親自試。','compare_real_options','comparison'],
    ['45',1,'Name the small comfort you would protect during a busy week.','說出忙碌一週中你仍會保留的一項小享受。','name_specific_priority','priority'],
    ['45',2,'Suggest one free pleasure for an ordinary day.','為平凡的一天建議一項不用花錢的樂趣。','propose_simple_change','planning'],
    ['46',1,'Say what would make you try an unfamiliar hobby once.','說出什麼會讓你願意試一次陌生的興趣。','state_personal_stance','opinion'],
    ['46',2,'Name what matters most when joining a new hobby group.','說出加入新興趣團體時對你最重要的一點。','name_specific_priority','priority'],
    ['47',1,'Mention one hidden step behind work that looks easy.','說出看似輕鬆的工作背後一個不明顯的步驟。','mention_specific_detail','detail'],
    ['47',2,'Suggest one helpful response to someone’s unfinished work.','建議一個對別人未完成作品有幫助的回應。','propose_simple_change','planning'],
    ['48',1,'Choose one childhood pleasure you would gladly enjoy today.','選出一項你今天仍樂意享受的童年樂趣。','state_personal_stance','opinion'],
    ['48',2,'Suggest a friendly reply to someone calling your enjoyment childish.','建議一句友善回應別人說你的樂趣很幼稚的話。','propose_simple_change','planning']
  ];
  for(const [topic,n,text,zh,group,family] of judgeRows){
    edit('villager_v4_'+topic+'_judge_'+n,text,zh,{changedGoal:true,group,family,tags:[family],reason:'Replace two-player matching with one personal chat action; the Judge reward is unchanged.'});
  }

  const wordingRows=[
    ['18_reporter_1',"Ask someone which part of a friend's routine interests them.",'問一位玩家，對朋友日常的哪一部分感到好奇。'],
    ['38_reporter_1','Ask someone what help they wanted after a mistaken message.','問一位玩家，傳錯訊息後希望得到什麼幫忙。'],
    ['42_reporter_1','Ask someone what made a small act of care feel personal.','問一位玩家，什麼讓一件小小體貼感覺是專為自己做的。'],
    ['43_reporter_2','Ask someone how they chose a backup plan.','問一位玩家，當時怎麼選擇備案。'],
    ['46_reporter_1','Ask someone why they tried their new interest again.','問一位玩家，為什麼又試了一次那個新興趣。'],
    ['47_reporter_1','Ask someone which hidden step takes the most effort.','問一位玩家，哪個不明顯的步驟最費力。'],
    ['48_reporter_2','Ask someone whom they would invite to share their childhood favorite.','問一位玩家，會邀請誰一起享受童年最愛的事物。'],
    ['05_dreamer_1','Imagine a desk that gives everyone their favorite level of quiet.','想像一張讓每個人都得到想要安靜程度的桌子。'],
    ['06_dreamer_2','Describe one game for a magic pocket-sized toy.','描述一個能用口袋大小魔法玩具玩的遊戲。'],
    ['13_dreamer_1','Imagine a magic corner that helps each guest relax.','想像一個幫每位客人放鬆的魔法角落。'],
    ['16_dreamer_2','Describe a chair that lets you relax while floating.','描述一張讓你漂浮著放鬆的椅子。'],
    ['18_dreamer_2',"Add one harmless magical feature to your friend's routine.",'替朋友的日常加上一項無害的魔法功能。'],
    ['22_dreamer_2','Imagine a tiny future package with a huge object inside.','想像一個從未來寄來、裝著巨大物品的小包裹。'],
    ['26_dreamer_1',"Imagine a bill that politely explains everyone's fair share.",'想像一張禮貌說明每個人合理分攤金額的帳單。'],
    ['27_dreamer_2','Describe a magic message that helps someone relax.','描述一則能幫某個人放鬆的魔法訊息。'],
    ['29_dreamer_1','Imagine a helper that knows when you only want company.','想像一個知道你何時只想要陪伴的助手。'],
    ['30_dreamer_2','Imagine visiting friends without leaving your sofa.','想像不用離開沙發也能去和朋友相聚。'],
    ['33_dreamer_2','Describe one useful mistake a magic assistant could make.','描述一個魔法助理可能犯、卻有用的錯誤。'],
    ['35_dreamer_2','Imagine a place to safely store unfinished hobby projects.','想像一個安全存放未完成興趣作品的地方。'],
    ['39_dreamer_2','Describe a magic badge that reveals one surprising talent.','描述一個能顯示某人意外本事的魔法徽章。'],
    ['41_dreamer_2','Describe a shop that shows life after buying an item.','描述一間展示買下物品後生活會怎樣的商店。'],
    ['42_dreamer_1','Imagine a tiny service that notices when someone needs rest.','想像一項會注意到某個人需要休息的小服務。'],
    ['44_dreamer_1','Describe one tiny competition for an everyday skill.','描述一項比日常小本事的小競賽。'],
    ['44_dreamer_2','Imagine one fun lesson for an overlooked everyday skill.','想像一堂教容易被忽略日常小本事的有趣課。'],
    ['46_dreamer_2','Imagine a festival for briefly trying unfamiliar hobbies.','想像一個短暫試玩陌生興趣的節日。'],
    ['47_dreamer_1','Imagine a label showing one hidden step behind your work.','想像一個顯示你作品背後隱藏步驟的標籤。'],
    ['47_dreamer_2','Describe an award for one unnoticed helpful task.','描述一個頒給沒被注意、有幫助工作的獎項。'],
    ['48_dreamer_2','Imagine one simple game everyone could enjoy at any age.','想像一個任何年齡都能享受的簡單遊戲。']
  ];
  for(const [key,text,zh] of wordingRows)edit('villager_v4_'+key,text,zh);

  const newGoalRows=[
    ['36_dreamer_1','Imagine a magic button that changes one food you dislike.','想像一個改變你對某種不喜歡食物感受的魔法按鈕。','imagine_simple_feature','imagination','Replace vague lifestyle trial with a simple change-of-mind fantasy.'],
    ['38_dreamer_2','Imagine a magic undo button for one embarrassing mix-up.','想像一個能修正一次尷尬小出包的魔法復原按鈕。','imagine_simple_feature','imagination','Remove indirect message-to-an-object creative-writing activity.'],
    ['47_reporter_2','Ask someone what others underestimate about their effort.','問一位玩家，別人低估了他付出的哪一部分。','ask_specific_question','inquiry','Match hidden effort broadly, without assuming the answer is a skill.']
  ];
  for(const [key,text,zh,group,family,reason] of newGoalRows)edit('villager_v4_'+key,text,zh,{changedGoal:true,group,family,tags:[family],reason});

  // Bait still makes false clues, but players get a concrete audible action
  // instead of having to invent a metaphor or run an imaginary activity.
  const baitRows=[
    ['05_bait_2',"Thank you, desk, for another hard day's work.",'說出「Thank you, desk, for another hard day\'s work.」。',false],
    ['07_bait_2','My welcome speech is still loading.','說出「My welcome speech is still loading.」。',true],
    ['12_bait_1','Thank you, old mug, for your years of service.','說出「Thank you, old mug, for your years of service.」。',false],
    ['15_bait_2','This spoon could buy a mountain.','說出「This spoon could buy a mountain.」。',true],
    ['22_bait_2','My future shoes know where I am going.','說出「My future shoes know where I am going.」。',true],
    ['26_bait_2','I brought a dinner-plate-sized coin.','說出「I brought a dinner-plate-sized coin.」。',true],
    ['29_bait_2','Thanks, but I can tie my own shoes.','說出「Thanks, but I can tie my own shoes.」。',true],
    ['33_bait_2','My shopping list has rejected this snack.','說出「My shopping list has rejected this snack.」。',true],
    ['37_bait_2','Thank you, old ticket, for sticking around.','說出「Thank you, old ticket, for sticking around.」。',false],
    ['39_bait_2','Goodbye, wrong first impression.','說出「Goodbye, wrong first impression.」。',false],
    ['42_bait_1','This cup deserves a thank-you.','說出「This cup deserves a thank-you.」。',true],
    ['43_bait_1','Sorry, original plan. I found something better.','說出「Sorry, original plan. I found something better.」。',false],
    ['46_bait_2','This hobby has officially moved into my life.','說出「This hobby has officially moved into my life.」。',true],
    ['47_bait_2','Gold medal for the work nobody noticed.','說出「Gold medal for the work nobody noticed.」。',false],
    ['48_bait_2','I hereby give myself permission to play.','說出「I hereby give myself permission to play.」。',true]
  ];
  for(const [key,line,zh,changedGoal] of baitRows){
    edit('villager_v4_'+key,'Say: “'+line+'”',zh,{changedGoal,group:'prepared_one_line',family:'prepared_sentence',tags:['prepared_sentence'],utterances:[line],performanceGroup:null,reason:'A concrete short line leaves a false clue without an imaginary activity.'});
  }
  edit('villager_v4_40_bait_2','Say “Keys, phone, snack” before describing your routine.','在描述日常習慣前說出「Keys, phone, snack」。',{group:'prepared_one_line',family:'prepared_sentence',tags:['prepared_sentence'],utterances:['Keys, phone, snack'],reason:'Keep the original spoken line, removing the imaginary bag-check setup.'});

  const removedMappings=[
    {taskId:'villager_v4_39_reporter_2',topicId:'topic_v2_39',reason:'Becoming quieter is not a natural extension of a changed first impression.'},
    {taskId:'villager_v4_39_dreamer_1',topicId:'topic_v2_39',reason:'A window into a stranger’s hobby does not address a changed first impression.'}
  ];
  edit('villager_v4_39_reporter_2','Ask someone what changed their first impression.','問一位玩家，什麼改變了他的第一印象。',{changedGoal:true,group:'ask_specific_question',family:'inquiry',tags:['ask_question'],reason:removedMappings[0].reason});
  edit('villager_v4_39_dreamer_1','Imagine a magic mirror that shows someone’s hidden kindness.','想像一面能顯示某人隱藏善意的魔法鏡子。',{changedGoal:true,group:'imagine_simple_feature',family:'imagination',tags:['imagination'],reason:removedMappings[1].reason});

  // Remove the invalid original associations before installing their reviewed
  // replacements. No wildcard or fallback topic tag can reinstate an old card.
  const invalid=new Set(removedMappings.map(m=>m.taskId+'|'+m.topicId));
  const tasks=base.map(old=>{
    const corrected=replacements.get(old.id);
    if(corrected)return corrected;
    const task=JSON.parse(JSON.stringify(old));
    task.compatibleTopicIds=task.compatibleTopicIds.filter(id=>!invalid.has(task.id+'|'+id));
    return task;
  }).filter(t=>t.active&&t.compatibleTopicIds.length);

  const roles=['reporter','veteran','bait','dreamer','contrarian','judge'];
  const topicNotes=[
    'Group-trip comfort, schedules, food and companions; each is a direct trip extension.',
    'Shared-home habits, food, sounds and common space; no unrelated personal-history prompts.',
    'Car-ride music, silence, stops and passenger comfort; audible Bait performances fit the ride.',
    'Unplanned cabin relaxation, alone time and optional activities; one fantasy feature is enough.',
    'Shared-table concentration, noise and breaks; no task requires an actual desk or equipment.',
    'Offline gathering, saved phone content and quiet; imagined games only need a description.',
    'Welcoming a newcomer, easy introductions and attention; Bait now uses one literal welcome line.',
    'Cooking together, jobs, mistakes and meal timing; every card is a direct kitchen extension.',
    'Running a relaxed shop, customers and owner comfort; shop fantasy needs one feature only.',
    'Low-budget birthday care, surprise and homemade details; clapping is also mapped to skill pride.',
    'Simple show using everyday talents; tasks discuss a show without requiring filming or a camera.',
    'Ordinary-object exhibit, stories, wear and privacy; magical displays are simple descriptions.',
    'Comfortable gathering for party-averse guests; rest, quiet and optional activities match.',
    'Ordinary-neighborhood visit, local details and pacing; all prompts stay with the visitor’s day.',
    'Swap-shop items, second-hand value and leftover goods; Bait’s impossible exchange is one line.',
    'After-work rest room, seating, light and sound; floating chair is a concrete brief fantasy.',
    'Small powers helping neighbors, favors and refusal; no card requires a second person to act.',
    'Borrowing a friend’s routine for a day; fantasies and experience keep the routine context.',
    'Extra daily hour, priorities, location and interruptions; no task starts a real timed activity.',
    'Household objects complaining is the actual topic; simple talking-object lines fit explicitly.',
    'Ten-second redo, small mistakes and limits; imagined effects require one short description.',
    'Future-self ordinary-object parcel; Bait’s future-shoes line now keeps the future clue context.',
    'Rewatching ordinary old moments, sensory details and imperfect memories; no long story needed.',
    'Impossible services for tiny daily problems; fantasies, trade and boundaries stay with services.',
    'Thoughtful unwanted gift, honesty and usefulness; each is a natural gift-conversation extension.',
    'Unequal dinner bills, fairness and payment timing; no task needs agreement or actual payment.',
    'Exhausting group chat, notifications and reply habits; sound tasks use only the player’s voice.',
    'Unwanted group-photo sharing, consent and memory; no real photo or camera is needed.',
    'Unrequested help and autonomy; Bait now explicitly declines unnecessary help in one short line.',
    'Cancelling an invitation to rest, notice and friendship; fantasies stay with rest and visiting.',
    'Honest response to a friend’s creation, praise and criticism; no response from another player needed.',
    'Borrowed favorite item returned worn; tasks cover wear, expectations, repair and returning items.',
    'Taste-aware assistant and which decisions to delegate; imaginary mistakes are one useful example.',
    'Becoming the default organizer, sharing effort and refusing tasks; no real event must be organized.',
    'Earning money from a hobby, deadlines and enjoyment; fantasies protect the hobby without a story.',
    'Changing a defended opinion; Dreamer’s vague lifestyle trial now directly changes a disliked food.',
    'Keeping an old object others would discard; memories, space, photos and wear remain topical.',
    'Mistake friends keep remembering, teasing and useful fixes; indirect message-to-object prompt removed.',
    'Changed first impression: quietness and stranger-hobby mappings removed; replacements address impressions.',
    'Normal-to-you unusual habits, origins and exceptions; no pretend bag or actual prop is required.',
    'Purchase turning out differently, later use and regret; imagined shop shows the item’s effect simply.',
    'Small meaningful care, preferences and quiet support; no player must accept or respond to help.',
    'Failed plans becoming great memories, detours and backups; one example or sentence suffices.',
    'Small unlisted skills, learning and pride; imagined lessons and competitions only need description.',
    'Small moments improving an ordinary day, comfort and free pleasures; no real activity must occur.',
    'Unexpected interest after one try, beginners and community; Bait no longer needs a guest metaphor.',
    'Hidden effort behind apparently easy work; Reporter no longer assumes the answer must be a skill.',
    'Enjoyment others call outgrown, childhood favorites and maturity; no office or permission activity.'
  ];
  const perTopic=topicNotes.map((note,index)=>{
    const topicId='topic_v2_'+String(index+1).padStart(2,'0');
    const cards=tasks.filter(t=>t.compatibleTopicIds.includes(topicId));
    return {topicId,note,roles:Object.fromEntries(roles.map(role=>[role,cards.filter(t=>t.roleId===role).length])),taskIds:cards.map(t=>t.id)};
  });
  const words=s=>(s.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
  const lengths=tasks.map(t=>words(t.text)).sort((a,b)=>a-b);
  const audit={
    version,originalCards:base.length,originalMappings:base.reduce((n,t)=>n+t.compatibleTopicIds.length,0),
    currentCards:tasks.length,currentMappings:tasks.reduce((n,t)=>n+t.compatibleTopicIds.length,0),
    changedWording:changes.filter(c=>c.kind==='wording').length,
    rewrittenGoals:changes.filter(c=>c.kind==='goal_rewrite').length,
    changedCards:changes.length,judgeRewrites:judgeRows.length,
    removedMappings,changes,perTopic,
    editorialReview:{reviewedCards:base.length,reviewedMappings:base.reduce((n,t)=>n+t.compatibleTopicIds.length,0),reviewedMainQuestions:48,reviewedFollowUps:384,method:'Read every English and Traditional Chinese instruction alongside its current main question and all follow-ups; check one audible action and natural topic extension.',playerBalanceTested:false},
    wordStats:{average:Math.round(lengths.reduce((a,n)=>a+n,0)/lengths.length*100)/100,median:lengths[Math.floor(lengths.length/2)],min:lengths[0],max:lengths.at(-1),over14:lengths.filter(n=>n>14).length},
    sampledCards:perTopic.flatMap((t,i)=>{
      const topicCards=tasks.filter(c=>c.compatibleTopicIds.includes(t.topicId));
      const sample=[topicCards.find(c=>c.roleId==='judge'),topicCards.find(c=>c.roleId===roles[i%5])];
      if(i<24)sample.push(topicCards.find(c=>c.roleId===roles[(i+2)%5]));
      return sample.map(c=>({id:c.id,topicId:t.topicId,roleId:c.roleId,text:c.text,textZh:c.textZh,words:words(c.text),review:'One clear spoken action; fits the main question or a direct follow-up. No response or agreement is required.'}));
    })
  };
  return {tasks,audit};
});
