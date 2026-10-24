(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ONCE_OPENINGS = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Original Hub opening stories. Each game opens with one of these instead of
  // a "who looks most like this card" starter. They set a scene and a problem,
  // then stop so the first Storyteller can continue. Simple English is the
  // spoken material; Traditional Chinese is a reading aid for the zh interface.
  // IDs are stable: saved games and recent-opening history refer to them.
  const banks = {
    classic: [
      ['Once upon a time, in a kingdom where it rained every single day, a young baker woke up to bright sunshine. Everyone ran outside to look at the sky, but the baker noticed something else: her shadow was gone.', '從前從前，在一個每天都下雨的王國裡，一位年輕的麵包師醒來時發現外面陽光燦爛。大家都跑出去看天空，但麵包師注意到另一件事：她的影子不見了。'],
      ['Once upon a time, an old fisherman pulled a golden bottle out of the sea. Inside was a tiny map and a note that said, "Do not show this to the king." That same afternoon, the king\'s soldiers knocked on his door.', '從前從前，一位老漁夫從海裡撈起一個金色的瓶子。瓶子裡有一張小地圖和一張紙條，寫著：「別給國王看。」就在那天下午，國王的士兵來敲他的門。'],
      ['Once upon a time, a little village sat at the bottom of a very tall mountain. Every hundred years, something came down from the top. This year, the villagers were ready to find out what it was.', '從前從前，有個小村莊坐落在一座非常高的山腳下。每隔一百年，就會有某樣東西從山頂下來。今年，村民們準備好要弄清楚那到底是什麼了。'],
      ['Once upon a time, two sisters shared a magic mirror. One sister saw the future in it, and the other saw the past. One morning, the mirror showed them both the same thing.', '從前從前，有兩姊妹共用一面魔鏡。姊姊在鏡中看見未來，妹妹看見過去。某天早上，鏡子讓她們同時看見了同一個畫面。'],
      ['Once upon a time, a prince wanted to become a farmer, and a farmer wanted to become a prince. One stormy night, they met at the same inn and had the same idea.', '從前從前，有位王子想當農夫，而有位農夫想當王子。一個暴風雨的夜晚，他們在同一間旅店相遇，想到了同一個主意。'],
      ['Once upon a time, the queen lost her voice. She could not give orders, sing, or even say thank you. Whoever brought her voice back would get anything they wished for.', '從前從前，王后失去了她的聲音。她不能下命令、不能唱歌，甚至連謝謝都說不出口。誰能把她的聲音找回來，就能得到任何想要的東西。'],
      ['Once upon a time, a clumsy young wizard cast his very first spell. It was supposed to make one apple. Instead, it made apples fall like snow over the whole town.', '從前從前，一位笨手笨腳的年輕巫師施展了他的第一個咒語。本來只是要變出一顆蘋果，結果整座小鎮像下雪一樣掉下了蘋果。'],
      ['Once upon a time, deep in a quiet forest, there was a door with no house around it. Nobody had ever opened it. Then one day, someone knocked on it from the other side.', '從前從前，在一座安靜的森林深處，有一扇四周沒有房子的門。從來沒有人打開過它。直到有一天，有人從門的另一邊敲了門。'],
      ['Once upon a time, a shepherd girl found a sleeping dragon in her barn. It was very small, about the size of a cat, and it was eating her hay. She knew she could not keep this secret for long.', '從前從前，一個牧羊女孩在穀倉裡發現一隻正在睡覺的龍。牠很小，大概只有貓那麼大，正在吃她的乾草。她知道這個秘密藏不了多久。'],
      ['Once upon a time, every star in the sky fell into the lake on the same night. The lake began to glow, and the fish began to sing. The king sent his bravest knight to fix it, but the knight was afraid of water.', '從前從前，天上所有的星星在同一個夜晚掉進了湖裡。湖水開始發光，魚兒開始唱歌。國王派出最勇敢的騎士去解決這件事，可是這位騎士怕水。'],
      ['Once upon a time, a poor tailor sewed a coat for a stranger, who paid him with a single button. "Sew this onto your own coat," the stranger said, "and never take it off." The next morning, the tailor understood why.', '從前從前，一位窮裁縫幫一個陌生人做了件外套，對方只付給他一顆鈕扣。「把它縫在你自己的外套上，」陌生人說，「永遠不要拿下來。」第二天早上，裁縫明白了原因。'],
      ['Once upon a time, a kingdom held a contest to find the best storyteller. The prize was a seat at the king\'s table. But on the day of the contest, the king himself disappeared.', '從前從前，有個王國舉辦比賽，要找出最會說故事的人。獎品是國王餐桌旁的一個座位。可是比賽當天，國王本人卻不見了。'],
      ['Once upon a time, a girl planted a seed that a crow had dropped in her garden. By morning, the plant was taller than the clouds. She could hear music coming from the top.', '從前從前，一個女孩把烏鴉掉在她花園裡的一顆種子種了下去。到了早上，那株植物已經長得比雲還高。她聽見頂端傳來音樂聲。'],
      ['Once upon a time, an old woman ran a shop that sold lost things: lost keys, lost letters, even lost memories. One day, a young man came in looking for something he had never had.', '從前從前，有位老婆婆開了一家專賣「遺失物」的店：遺失的鑰匙、遺失的信，甚至遺失的回憶。有一天，一位年輕人走進店裡，想找一樣他從來沒有擁有過的東西。'],
      ['Once upon a time, the bridge between two kingdoms broke in the middle of a wedding. The bride was on one side, and the groom was on the other. Neither family wanted to be the first to build a new one.', '從前從前，連接兩個王國的橋在一場婚禮進行到一半時斷了。新娘在一邊，新郎在另一邊。兩家人都不想當第一個重建橋的人。'],
      ['Once upon a time, a mouse lived inside the walls of a great castle and heard every secret. One night, she heard a secret so big that she had to tell someone. But who listens to a mouse?', '從前從前，一隻老鼠住在一座大城堡的牆壁裡，聽見了所有的秘密。某天晚上，她聽到一個大到非說不可的秘密。可是，誰會聽一隻老鼠說話呢？'],
      ['Once upon a time, a ship sailed into the harbor with no sailors on board. The table was set for dinner, and the candles were still burning. On the captain\'s chair sat a small wooden box.', '從前從前，一艘船駛進港口，船上卻一個水手都沒有。餐桌已經擺好晚餐，蠟燭還在燃燒。船長的椅子上放著一個小木盒。'],
      ['Once upon a time, a young knight was told that she was too kind to win a battle. So she decided to win one without fighting at all. Her first chance came sooner than she expected.', '從前從前，一位年輕的騎士被告知，她太善良了，打不贏任何一場仗。於是她決定不靠打鬥贏得一場勝利。她的第一個機會，比她預期的來得更早。'],
      ['Once upon a time, a town woke up and found that everyone had swapped voices. The mayor sounded like a baby, and the baby sounded like the mayor. Only one person in town still had their own voice.', '從前從前，有座小鎮的人醒來發現，大家的聲音都互換了。鎮長的聲音像個嬰兒，嬰兒的聲音卻像鎮長。全鎮只有一個人還保有自己的聲音。'],
      ['Once upon a time, a lonely giant lived on a hill above a busy market. He wanted to make friends, but every time he said hello, the whole market shook. One morning, he had a plan.', '從前從前，一個孤單的巨人住在熱鬧市集上方的山丘上。他很想交朋友，可是每次他打招呼，整個市集都會晃動。某天早上，他想到了一個計畫。'],
      ['Once upon a time, the king promised a great reward to anyone who could make the princess laugh. Clowns, jesters and talking parrots all tried and failed. Then a quiet stable boy asked for one week.', '從前從前，國王宣布，誰能讓公主笑出來，就能得到一份大獎。小丑、弄臣和會說話的鸚鵡都試過了，全都失敗。後來，一個安靜的馬僮要求給他一個星期。'],
      ['Once upon a time, a river suddenly started flowing uphill. The fish were confused, the millers were angry, and the frogs thought it was wonderful. A boy and his grandmother walked upstream to find out why.', '從前從前，有條河突然開始往上坡流。魚兒一頭霧水，磨坊主人很生氣，青蛙卻覺得太棒了。一個男孩和他的奶奶沿著河往上游走，想查出原因。'],
      ['Once upon a time, a hunter caught a white fox that could talk. "Let me go," said the fox, "and I will give you three good warnings." The hunter laughed, but he listened.', '從前從前，一位獵人抓到一隻會說話的白狐狸。「放了我，」狐狸說，「我就給你三個有用的警告。」獵人笑了，但他還是聽了。'],
      ['Once upon a time, the clock tower in the middle of town stopped at midnight, and so did time. Nobody grew older, and nothing changed. At first everyone was happy, but after a while, the clockmaker\'s daughter decided to climb the tower.', '從前從前，小鎮中央的鐘塔停在午夜，時間也跟著停了。沒有人變老，什麼都沒有改變。一開始大家都很開心，但過了一陣子，鐘錶匠的女兒決定爬上鐘塔。'],
      ['Once upon a time, a witch lived at the edge of the village, and everyone was afraid of her. Nobody knew that she was the one who kept the wolves away. One winter, she fell sick.', '從前從前，村子邊緣住著一個女巫，大家都很怕她。沒有人知道，其實是她把狼群擋在村外。有一年冬天，她生病了。'],
      ['Once upon a time, a farmer\'s hen laid an egg made of glass. Inside it, you could see a tiny castle. The farmer took it to the city to sell, but on the way, the egg started to crack.', '從前從前，農夫的母雞生了一顆玻璃做的蛋。從外面看得到裡面有一座小小的城堡。農夫把蛋帶到城裡要賣，可是在路上，蛋開始裂開了。'],
      ['Once upon a time, the king made a strange new law: nobody in the kingdom was allowed to sing. Most people obeyed. But in a small house by the river, someone sang every night, and the soldiers could never find out who it was.', '從前從前，國王訂了一條奇怪的新法律：王國裡任何人都不准唱歌。大部分的人都乖乖遵守。可是在河邊的一間小屋裡，每天晚上都有人在唱歌，士兵們卻始終找不到是誰。'],
      ['Once upon a time, a young cook had to make one dinner for a dragon, a queen and a beggar, all at the same table. Each guest wanted something different. If they were not happy, the cook would be in big trouble.', '從前從前，一位年輕廚師得為一隻龍、一位女王和一個乞丐做一頓晚餐，三位客人坐同一桌。每位客人想吃的都不一樣。要是他們不滿意，廚師就麻煩大了。'],
      ['Once upon a time, a boy found a pair of old boots in the attic. When he put them on, they walked him straight out of the house and down the road. They did not stop until sunset.', '從前從前，一個男孩在閣樓裡找到一雙舊靴子。他一穿上，靴子就帶著他走出家門、沿著大路走去。一直到太陽下山才停下來。'],
      ['Once upon a time, on the night of the full moon, all the animals in the forest held a meeting. They had to choose a new leader before morning. Nobody expected the smallest one to stand up and speak.', '從前從前，在滿月的夜晚，森林裡所有的動物召開了一場會議。他們必須在天亮前選出新的領袖。沒有人想到，最小的那一隻會站起來發言。'],
      ['Once upon a time, a painter made a portrait of the king that was a little too honest. The king was so angry that he locked the painting in a tower. That night, the man in the painting climbed out.', '從前從前，一位畫家幫國王畫了一幅太過誠實的肖像。國王氣得把那幅畫鎖進塔裡。當天晚上，畫裡的人爬了出來。'],
      ['Once upon a time, three brothers set out to find the end of the world. The first took a sword, the second took a map, and the youngest took only a loaf of bread. By the third day, they were lost.', '從前從前，三兄弟出發去尋找世界的盡頭。大哥帶了一把劍，二哥帶了一張地圖，最小的弟弟只帶了一條麵包。到了第三天，他們迷路了。'],
      ['Once upon a time, a lighthouse keeper on a tiny island received a letter. It had no stamp and no name, only five words: "Turn off the light tonight." The keeper had never turned it off before.', '從前從前，一座小島上的燈塔看守人收到一封信。信上沒有郵票、沒有署名，只有一句話：「今晚把燈關掉。」看守人從來沒有關過燈。'],
      ['Once upon a time, a kingdom ran out of color. The flowers turned gray, the sky turned gray, and even the king\'s crown looked dull. A young girl found one last red flower and hid it in her pocket.', '從前從前，有個王國的顏色用完了。花變成灰色，天空變成灰色，連國王的王冠都黯淡無光。一個小女孩找到最後一朵紅花，把它藏進了口袋。'],
      ['Once upon a time, a goose flew into the royal kitchen and would not leave. It honked at the cook, chased the guards and sat on the throne. The wise old advisor said the goose was trying to warn them.', '從前從前，一隻鵝飛進皇家廚房，怎麼趕都不走。牠對著廚師嘎嘎叫、追著衛兵跑，還坐上了王座。睿智的老顧問說，這隻鵝是想警告大家。'],
      ['Once upon a time, a young servant was sent to the market with three gold coins and one rule: "Bring back what the queen needs most." Nobody told him what that was.', '從前從前，一個年輕僕人帶著三枚金幣被派去市集，只得到一個指示：「把女王最需要的東西帶回來。」可是沒有人告訴他那是什麼。'],
      ['Once upon a time, a cloud fell asleep over a small village and refused to move. It was always cool and shady, and the crops stopped growing. The villagers had to find a way to wake it up.', '從前從前，一朵雲在一個小村莊上空睡著了，怎麼也不肯離開。村子裡總是涼爽又陰暗，農作物都不長了。村民們得想辦法把它叫醒。'],
      ['Once upon a time, a famous thief promised to steal the moon. Everyone laughed. But the next night, the sky was empty, and the thief was nowhere to be found.', '從前從前，一個有名的小偷誇口要偷走月亮。大家都笑了。可是第二天晚上，天空空蕩蕩的，那個小偷也不見蹤影。'],
      ['Once upon a time, an old king could not decide which of his two children should rule after him. So he gave each of them an empty box and one year. Whoever filled it with the most valuable thing would wear the crown.', '從前從前，一位老國王無法決定兩個孩子中誰該繼承王位。於是他各給他們一個空盒子和一年的時間。誰能用最珍貴的東西把盒子裝滿，誰就能戴上王冠。'],
      ['Once upon a time, a little bird told a sad woodcutter that his luck would change tomorrow. The woodcutter did not believe it. But when he woke up, there was a carriage outside his house, and it was waiting for him.', '從前從前，一隻小鳥告訴一個傷心的樵夫，他明天就會轉運。樵夫不相信。可是當他醒來時，家門外停著一輛馬車，正在等他。'],
    ],
    'modern-future': [
      ['Not long ago, a delivery driver brought a package to the wrong apartment. Inside was a phone that kept ringing, and every call was for the person who had opened the box.', '不久之前，一位外送員把包裹送錯了公寓。包裹裡有一支一直響的手機，而每一通電話都是找打開箱子的那個人。'],
      ['In the year 2150, the last library on Earth was on a spaceship. Its only librarian was a robot who had read every book twice. Today, for the first time in forty years, someone came in to borrow one.', '西元 2150 年，地球上最後一座圖書館在一艘太空船上。唯一的圖書館員是一個把每本書都讀過兩遍的機器人。今天，四十年來第一次有人走進來借書。'],
      ['Last Monday, a café in the city started serving coffee that let you remember one forgotten day. The line went around the block. A tired office worker finally got to the front and ordered a cup.', '上週一，城裡一家咖啡店開始賣一種咖啡，喝了就能想起一個被遺忘的日子。排隊的人繞了整條街。一位疲憊的上班族終於排到最前面，點了一杯。'],
      ['Not long ago, a small town got its first self-driving bus. On its first morning, it drove all the passengers to a beach three hundred kilometers away. Nobody knew who had changed the route.', '不久之前，一座小鎮有了第一台自動駕駛公車。第一天早上，它竟然把所有乘客載到三百公里外的海灘。沒有人知道是誰改了路線。'],
      ['In the near future, everyone wears glasses that show the name of each person they meet. One morning, a young teacher looked in the mirror, and her glasses showed a different name.', '在不遠的未來，每個人都戴著一種眼鏡，會顯示遇到的每個人的名字。某天早上，一位年輕老師照鏡子時，眼鏡上顯示的卻是另一個名字。'],
      ['Not long ago, a famous video game went offline forever. That same night, one of its characters knocked on a player\'s real front door.', '不久之前，一款有名的電玩永久關閉了。就在那天晚上，遊戲裡的一個角色敲了某位玩家家裡真正的大門。'],
      ['In the year 2089, people can rent a robot friend for one week. A grumpy old man rented one by mistake. On the last day, he did not want to give it back.', '西元 2089 年，人們可以租用機器人朋友一週。一位脾氣暴躁的老先生不小心租了一個。到了最後一天，他卻不想歸還了。'],
      ['Last summer, a group of friends found an old camera at a flea market. Every photo it took showed the place exactly one year in the future. The first picture they took made them very nervous.', '去年夏天，一群朋友在跳蚤市場找到一台舊相機。它拍下的每張照片，都會顯示那個地方一年後的樣子。他們拍的第一張照片，讓大家非常緊張。'],
      ['In the near future, the city\'s tallest building opened a garden on its roof, a thousand meters above the street. On opening day, someone found footprints in the soil that did not belong to any human.', '在不遠的未來，城裡最高的大樓在樓頂開了一座花園，離街道一千公尺高。開幕當天，有人在泥土裡發現了不屬於任何人類的腳印。'],
      ['Not long ago, a busy chef posted a video of her secret soup online. By the next morning, ten million people had watched it. One of them was waiting at her restaurant door with a very strange request.', '不久之前，一位忙碌的廚師把她的秘密湯品影片放上網。隔天早上已經有一千萬人看過。其中一個人站在她的餐廳門口，帶著一個非常奇怪的請求。'],
      ['In the year 2200, a family moved to a new home on Mars. Everything was perfect except one thing: every night at nine o\'clock, someone knocked on the outside of the window.', '西元 2200 年，一家人搬到火星上的新家。一切都很完美，只有一件事例外：每天晚上九點，都有人從窗戶外面敲窗。'],
      ['Not long ago, a student fell asleep on the last train home and woke up at a station that was not on any map. The doors opened, and a voice said, "Welcome back."', '不久之前，一個學生在回家的末班車上睡著了，醒來時停在一個任何地圖上都沒有的車站。車門打開，一個聲音說：「歡迎回來。」'],
      ['In the near future, a smart home decided it did not like its new owner. It locked the fridge, played sad songs and refused to turn on the lights. The owner had one week to change its mind.', '在不遠的未來，一間智慧住宅決定它不喜歡新屋主。它鎖上冰箱、播放悲傷的歌，還拒絕開燈。屋主只有一個星期能讓它改變心意。'],
      ['Last winter, a scientist made a machine that could translate what cats were saying. She tested it on her own cat first. The cat had been waiting a long time to say something important.', '去年冬天，一位科學家做出一台能翻譯貓咪說話的機器。她先拿自己的貓來測試。那隻貓等這一天已經等很久了，有件重要的事要說。'],
      ['In the year 2120, the oceans are full of floating cities. One of them has quietly started to drift away from the others, and only a young boy who fixes bicycles has noticed.', '西元 2120 年，海上布滿了漂浮城市。其中一座悄悄地開始離其他城市越漂越遠，只有一個修腳踏車的男孩注意到了。'],
      ['Not long ago, a woman won the lottery but lost the ticket on the same day. She remembered only one thing: she had used it as a bookmark. The problem was, she had returned three books to the library that afternoon.', '不久之前，一位女士中了樂透，卻在同一天把彩券弄丟了。她只記得一件事：她拿彩券當書籤。問題是，那天下午她還了三本書給圖書館。'],
      ['In the near future, music is banned in the city because it makes the robots dance instead of work. In a basement under an old shop, a teenage girl is building a radio.', '在不遠的未來，城裡禁止音樂，因為音樂會讓機器人跳起舞來而不工作。在一間老店底下的地下室裡，一個少女正在組裝一台收音機。'],
      ['Not long ago, an astronaut came home after one year in space. Her family, her house and her dog were all the same. But everyone else on Earth seemed to remember her as a completely different person.', '不久之前，一位太空人在太空待了一年後回到家。她的家人、房子和狗都沒變。可是地球上其他人，似乎都記得她是一個完全不同的人。'],
      ['In the year 2300, people travel by stepping into a booth and appearing somewhere else. One morning, a man stepped into the booth to go to work and stepped out into a forest nobody had ever seen.', '西元 2300 年，人們只要走進一個小亭子，就能瞬間出現在別的地方。某天早上，一個男人走進亭子要去上班，走出來時卻到了一座沒有人見過的森林。'],
      ['Last night, every streetlight in the city blinked three times at exactly the same moment. Most people did not notice. But a taxi driver did, and so did the old woman sitting in the back seat.', '昨天晚上，城裡每一盞路燈都在同一瞬間閃了三下。大部分的人都沒注意到。可是一位計程車司機注意到了，坐在後座的老奶奶也注意到了。'],
      ['In the near future, a company sells memories in small glass bottles. A young man bought a cheap one at a sale. It was a memory of his own childhood, and he had never seen it before.', '在不遠的未來，有家公司把記憶裝在小玻璃瓶裡販賣。一個年輕人在特賣會上買了一瓶便宜的。那是他自己童年的記憶，而他以前從來沒見過。'],
      ['Not long ago, two neighbors who had not spoken in ten years got stuck in the same elevator. The emergency phone did not work. All they had was one candy bar and a lot to talk about.', '不久之前，兩個十年沒說過話的鄰居被困在同一台電梯裡。緊急電話壞了。他們只有一條巧克力棒，還有很多話要說。'],
      ['In the year 2077, a robot detective was given its first case: someone had stolen the city\'s only rainbow. The robot did not know what a rainbow was.', '西元 2077 年，一個機器人偵探接到第一個案子：有人偷走了全城唯一的一道彩虹。機器人並不知道彩虹是什麼。'],
      ['Last spring, a girl opened a small online shop selling hand-made umbrellas. Her first customer ordered five hundred of them, paid in gold and asked for delivery to an address in the middle of the desert.', '去年春天，一個女孩開了一家小網店，賣手工雨傘。她的第一位客人訂了五百把，用黃金付款，還要求送到沙漠正中央的一個地址。'],
      ['In the near future, the moon has a hotel, and tonight is its grand opening. Everything is ready except for one problem: the chef has disappeared, and two hundred guests are on their way.', '在不遠的未來，月球上有一家飯店，今晚就是盛大開幕。一切都準備好了，只差一個問題：主廚不見了，而兩百位客人正在路上。'],
      ['Not long ago, a man bought a second-hand laptop. When he turned it on, it was still logged in to someone else\'s life: their calendar, their emails and a reminder that said, "Today is the day. Don\'t be late."', '不久之前，一個男人買了一台二手筆電。他一開機，發現它還登入著別人的生活：別人的行事曆、電子郵件，還有一則提醒寫著：「就是今天。別遲到。」'],
      ['In the year 2500, the very last tree on Earth is kept inside a glass dome in the middle of the city. This morning, the guards found that it had grown a single, strange fruit.', '西元 2500 年，地球上最後一棵樹被保存在城市中央的玻璃圓頂裡。今天早上，守衛發現它長出了一顆奇怪的果實。'],
      ['Last week, a quiet office got a new printer. It printed every document perfectly, but at the bottom of each page, it added one sentence about the future. Today it printed, "Someone in this room will be famous by Friday."', '上週，一間安靜的辦公室來了一台新印表機。它每份文件都印得很完美，但會在每頁最下面加一句關於未來的話。今天它印出：「這個房間裡有人星期五前會出名。」'],
      ['In the near future, children go to school in virtual reality. One day, a new classroom appeared that no teacher had made, and it was full of students nobody had ever met.', '在不遠的未來，孩子們都在虛擬實境裡上學。有一天，出現了一間沒有任何老師建立的新教室，裡面坐滿了大家從沒見過的學生。'],
      ['Not long ago, a weather app started giving very personal forecasts: "Sunny for you, but a small storm for your brother." By lunchtime, every forecast had come true.', '不久之前，有個天氣 App 開始給出非常個人化的預報：「你這邊晴天，但你哥哥那邊會有一場小暴風雨。」到了中午，每一則預報都成真了。'],
    ],
    halloween: [
      ['On Halloween night, a little ghost went trick-or-treating with all the other children. The problem was, nobody could see him, so nobody gave him any candy. He had one more street to try.', '萬聖夜裡，一個小幽靈跟其他孩子一起去要糖。問題是沒有人看得見他，所以沒人給他糖果。他還剩最後一條街可以試試看。'],
      ['On a foggy October evening, a witch\'s broom refused to fly. It had flown for three hundred years, and tonight it wanted a holiday. The witch had a very important party to get to.', '一個起霧的十月傍晚，女巫的掃帚拒絕起飛。它已經飛了三百年，今晚想放個假。可是女巫有一場非常重要的派對要趕去。'],
      ['On Halloween night, the old house on the hill turned on its lights for the first time in fifty years. Music was playing inside, and a sign on the gate said, "Everyone welcome. Costumes required."', '萬聖夜裡，山丘上的老房子五十年來第一次亮起了燈。屋裡傳來音樂，大門上的牌子寫著：「歡迎所有人。必須穿著變裝服。」'],
      ['One cold autumn night, a pumpkin in a farmer\'s field woke up and realized it could talk. It had only one wish before Halloween was over: it did not want to become a pie.', '一個寒冷的秋夜，農夫田裡的一顆南瓜醒來，發現自己會說話了。在萬聖節結束前，它只有一個願望：不想變成派。'],
      ['On Halloween night, a vampire went to the dentist for the first time in four hundred years. The dentist was very nervous. The vampire was even more nervous.', '萬聖夜裡，一個吸血鬼四百年來第一次去看牙醫。牙醫非常緊張。吸血鬼更緊張。'],
      ['Once a year, on Halloween, the skeletons in the museum come to life for one night. This year, one of them could not find its left foot, and the museum would open again at sunrise.', '每年萬聖節，博物館裡的骷髏都會在那一晚活過來。今年，其中一具找不到自己的左腳，而博物館日出時就要開門了。'],
      ['On Halloween night, a werewolf and a black cat both wanted to win the town\'s costume contest. The judges did not know that neither of them was wearing a costume.', '萬聖夜裡，一個狼人和一隻黑貓都想贏得鎮上的變裝比賽。評審並不知道，他們兩個根本都沒有穿變裝服。'],
      ['On a stormy October night, a family\'s car broke down outside an old castle. A polite butler opened the door before they could knock. "We have been expecting you," he said, "for a very long time."', '一個暴風雨的十月夜晚，一家人的車在一座老城堡外面拋錨了。他們還沒敲門，一位彬彬有禮的管家就開了門。「我們一直在等你們，」他說，「等了非常、非常久。」'],
      ['On Halloween night, a young witch mixed up two spells. Instead of turning her cat into a bat, she turned the whole town\'s candy into frogs. Trick-or-treating would start in one hour.', '萬聖夜裡，一個年輕女巫把兩個咒語搞混了。她沒有把貓變成蝙蝠，反而把全鎮的糖果都變成了青蛙。再過一個小時，大家就要出門要糖了。'],
      ['Every Halloween, a friendly scarecrow guards the corn maze. This year, the children went in at sunset, and by midnight, more children had come out than had gone in.', '每年萬聖節，一個友善的稻草人都會守著玉米迷宮。今年，孩子們在日落時走進去，到了午夜，走出來的孩子竟然比走進去的還多。'],
      ['On Halloween night, a mummy woke up in a busy city museum and wanted to go home. The only problem was, home was five thousand kilometers away, and he had no passport.', '萬聖夜裡，一個木乃伊在熱鬧的城市博物館裡醒來，想要回家。唯一的問題是，家在五千公里外，而他沒有護照。'],
      ['On the last night of October, the moon was so bright that every shadow in town came loose. The shadows ran around, played tricks and refused to go back to their owners.', '十月的最後一個晚上，月亮亮到全鎮的影子都脫離了主人。影子們四處亂跑、惡作劇，還拒絕回到主人身邊。'],
      ['On Halloween night, a nervous young man went to a costume party dressed as a ghost. When he arrived, he found out that all the other guests were real ghosts, and they thought his costume was very rude.', '萬聖夜裡，一個緊張的年輕人打扮成幽靈去參加變裝派對。到了那裡，他才發現其他客人全都是真正的幽靈，而且他們覺得他的打扮很沒禮貌。'],
      ['On a quiet Halloween night, a fortune teller looked into her crystal ball and saw something she had never seen before: nothing at all. Then someone knocked on her door.', '一個安靜的萬聖夜，一位算命師望向水晶球，看見了一件從沒見過的事：什麼都沒有。接著，有人敲了她的門。'],
      ['On Halloween night, the zombies in the old graveyard decided to start a band. They had drums, a broken piano and a lot of enthusiasm. Tonight was their very first concert.', '萬聖夜裡，老墓園裡的殭屍們決定組一個樂團。他們有鼓、一架壞掉的鋼琴，還有滿滿的熱情。今晚是他們的第一場演唱會。'],
      ['Every Halloween, a giant spider spins a web across the town square. This year, there were words in the web, and the words were a message for the mayor.', '每年萬聖節，一隻巨大的蜘蛛都會在小鎮廣場上織一張網。今年，網上織出了文字，而且是給鎮長的訊息。'],
      ['On Halloween night, a girl bought a mask at a small shop that had not been there the day before. When she put it on, she could hear what everyone around her was really thinking.', '萬聖夜裡，一個女孩在一家前一天還不存在的小店裡買了一副面具。她一戴上，就能聽見身邊每個人真正在想什麼。'],
      ['On a windy October night, the lonely monster under a boy\'s bed finally decided to say hello. It practiced all evening. When it finally spoke, the boy was not scared at all. He was annoyed, because it was very late.', '一個颳風的十月夜晚，躲在男孩床底下的孤單怪物終於決定打聲招呼。它練習了一整晚。當它終於開口時，男孩一點也不害怕。他很不耐煩，因為已經很晚了。'],
      ['On Halloween night, all the jack-o\'-lanterns in the village went out at the same time. Without them, the village\'s friendly spirits could not find their way home. Someone had to light them again before midnight.', '萬聖夜裡，村子裡所有的南瓜燈同時熄滅了。沒有了南瓜燈，村裡友善的精靈們就找不到回家的路。得有人在午夜前把它們重新點亮。'],
      ['Once a year, on Halloween, a pirate ship sails across the sky above the harbor. This year, it dropped its anchor right in the middle of a wedding.', '每年萬聖節，都有一艘海盜船從港口上空航過。今年，它把船錨直接丟進了一場婚禮的正中央。'],
      ['On Halloween night, a magician promised to make his assistant disappear. The trick worked perfectly. The problem was, he did not know how to bring her back.', '萬聖夜裡，一位魔術師承諾要讓他的助手消失。魔術表演得非常成功。問題是，他不知道該怎麼把她變回來。'],
      ['On the night before Halloween, the machines in the candy factory started making candy by themselves. Each piece did something strange: one made you float, one made you sing, and one made you tell the truth.', '萬聖節前一晚，糖果工廠的機器開始自己做糖果。每一顆都有奇怪的效果：一顆讓你飄起來，一顆讓你唱歌，一顆讓你說真話。'],
      ['On Halloween night, an old caretaker locked the gates of the haunted mansion, as he did every year. But this year, someone inside asked him to please leave the door open.', '萬聖夜裡，年老的管理員跟每年一樣，把鬼屋的大門鎖上。可是今年，屋裡有人請他把門留著別關。'],
      ['On a misty Halloween evening, a family of bats moved into the town library. The librarian wanted them gone, but the bats had already started reading, and they had very strong opinions about books.', '一個起霧的萬聖節傍晚，一家子蝙蝠搬進了鎮上的圖書館。圖書館員想把牠們趕走，可是蝙蝠們已經開始看書了，而且對書有非常強烈的意見。'],
      ['On Halloween night, the cauldron in a witch\'s kitchen boiled over and filled the whole house with purple smoke. When the smoke cleared, the witch and her cat had swapped bodies.', '萬聖夜裡，女巫廚房裡的大鍋滾了出來，整間屋子充滿紫色的煙。等煙散去，女巫和她的貓竟然互換了身體。'],
      ['Every Halloween, the town holds a pumpkin-growing contest. This year, someone grew a pumpkin as big as a house, and on the morning of the contest, there was a little door in its side.', '小鎮每年萬聖節都會舉辦南瓜種植比賽。今年，有人種出一顆跟房子一樣大的南瓜，比賽當天早上，南瓜側邊多了一扇小門。'],
      ['On Halloween night, a ghost who had lived in the same house for two hundred years got new neighbors: a very loud family who did not believe in ghosts. The ghost decided to change their minds.', '萬聖夜裡，一個在同一間房子住了兩百年的幽靈搬來了新鄰居：一個非常吵、又不相信有鬼的家庭。幽靈決定要改變他們的想法。'],
      ['On the last night of October, the old clock in the town hall struck thirteen. Everyone who heard it suddenly woke up somewhere else, still wearing their costumes.', '十月的最後一個晚上，鎮公所的老鐘敲了十三下。每個聽到鐘聲的人，突然都在別的地方醒來，身上還穿著變裝服。'],
      ['On Halloween night, a grumpy old man decided to give out vegetables instead of candy. At midnight, the vegetables in his garden decided to give him a little scare.', '萬聖夜裡，一個脾氣暴躁的老先生決定不發糖果，改發蔬菜。到了午夜，他菜園裡的蔬菜決定給他一點小小的驚嚇。'],
      ['On a moonlit Halloween night, a black cat found a key on the doorstep of an empty house. It was the kind of key that opens only one door in the whole world, and the cat knew exactly which one.', '一個月光明亮的萬聖夜，一隻黑貓在一間空房子的門口撿到一把鑰匙。這種鑰匙全世界只能打開一扇門，而黑貓很清楚是哪一扇。'],
    ],
  };
  const prefix = { classic: 'classic', 'modern-future': 'modern', halloween: 'halloween' };
  const worlds = {};
  const byId = {};
  for (const [world, rows] of Object.entries(banks)) {
    worlds[world] = rows.map(([en, zh], i) => {
      const item = Object.freeze({ id: 'once-open-' + prefix[world] + '-' + String(i + 1).padStart(3, '0'), world, en, zh });
      byId[item.id] = item;
      return item;
    });
    Object.freeze(worlds[world]);
  }
  const forWorld = id => worlds[id] || worlds.classic;
  // Old saves and an older room service have no canonical opening. Every client
  // derives the same one from the session id, so the table still agrees.
  function fallback(sessionId, world) {
    const pool = forWorld(world);
    let hash = 2166136261;
    for (const char of String(sessionId || 'once')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return pool[(hash >>> 0) % pool.length];
  }
  return Object.freeze({ worlds: Object.freeze(worlds), byId: Object.freeze(byId), forWorld, fallback });
});
