(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.BLUFF_ENGINE = factory(); })(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
const crypto = { randomUUID: () => globalThis.crypto.randomUUID(), randomInt: n => { const a = new Uint32Array(1); const ceiling = Math.floor(0x100000000 / n) * n; do { globalThis.crypto.getRandomValues(a); } while (a[0] >= ceiling); return a[0] % n; } };

const DECKS = Object.freeze(['classic', 'halloween', 'mixed']);
const deckOf = q => (q && typeof q.deck === 'string' && q.deck) || 'classic';
const roomDeck = room => DECKS.includes(room && room.deck) ? room.deck : 'classic';
// Table modes: the original Thinker game, or "everyone votes" (no Thinker: every
// player speaks in a random order, then all players vote; nobody votes for themselves).
const MODES = Object.freeze(['thinker', 'vote']);
const roomMode = room => MODES.includes(room && room.mode) ? room.mode : 'thinker';
const isVote = room => !!room && !!room.round && room.round.mode === 'vote';
const playable = q => q.enabled !== false && q.verificationStatus === 'verified';
function deckBank(room, bank) { const deck = roomDeck(room); return deck === 'mixed' ? bank : bank.filter(q => deckOf(q) === deck); }
function deckSummary(bank) { const counts = {}; for (const q of bank) if (playable(q)) counts[deckOf(q)] = (counts[deckOf(q)] || 0) + 1; const listed = DECKS.filter(id => id !== 'mixed' && counts[id]).map(id => ({ id, count: counts[id] })); return listed.length > 1 ? listed.concat({ id: 'mixed', count: listed.reduce((sum, d) => sum + d.count, 0) }) : listed; }
const RULES = Object.freeze({ basePoints: 2, correctChallengeBonus: 1, falseChallengePenalty: -2, preparationSeconds: 25, discussionReminderSeconds: 300, roundsPerSeat: 1, minPlayers: 3, maxPlayers: 9, voteFindPoints: 2, truthFoundPoints: 1, bluffVotePoints: 1 });
class GameError extends Error { constructor(code, message, status = 409, details) { super(message); this.code = code; this.status = status; this.details = details; } }
function fail(code, message, status, details) { throw new GameError(code, message, status, details); }
function blankStore() { return { schema: 1, identities: {}, rooms: {} }; }
function identity(store, id) { return store.identities[id] ||= { known: {}, seen: {} }; }
function markKnown(store, id, knowledgeId, reason, now) { const who = identity(store, id); if (!who.known[knowledgeId]) who.known[knowledgeId] = { at: now, reason }; }
function markSeen(store, id, knowledgeId, now) { const who = identity(store, id); who.seen[knowledgeId] ||= now; }
function seat(room, identityId) { return room.members.find(p => p.identityId === identityId); }
function requireMember(room, identityId) { const p = seat(room, identityId); if (!p) fail('not_joined', 'Join this room before taking part.', 403); return p; }
function requireHost(room, id) { if (room.hostIdentityId !== id) fail('host_only', 'Only the room host can do this.', 403); }
const eligibleMember = p => !!p && p.active !== false && p.pending !== true;
const currentPlayers = room => room.round?.playerIds || room.roster;
const activeRoster = room => room.roster.filter(id => eligibleMember(room.members.find(p => p.id === id)));
function activatePending(room) { for (const p of room.members) if (p.active !== false && p.pending === true) p.pending = false; }
function requireManager(room, id) {
  if (room.hostIdentityId === id) return;
  const p = requireMember(room, id);
  if (!eligibleMember(p) || !room.sharedControls || !(room.phase === 'lobby' ? p.seated : room.roster.includes(p.id))) fail('host_only', 'Only the room host can do this.', 403);
}
function requirePhase(room, ...phases) { if (!phases.includes(room.phase)) fail('wrong_phase', 'That action is no longer available in this stage.'); }
function requireThinker(room, id) { const p = requireMember(room, id); if (!eligibleMember(p) || !room.round || room.round.thinkerId !== p.id) fail('thinker_only', 'Only the current Thinker can do this.', 403); return p; }
function requireLeader(room, id) { if (room.sharedControls) requireManager(room, id); else if (room.hostIdentityId !== id) { if (isVote(room)) fail('host_only', 'Only the room host can do this.', 403); requireThinker(room, id); } }
function onlinePlayers(room, ctx) { const active = activeRoster(room); return ctx.onlineIds ? active.filter(id => ctx.onlineIds.has(id)) : active.filter(id => ctx.now - (room.members.find(p => p.id === id)?.lastSeen || 0) <= 60000); }
function isOnline(room, id, ctx) { return eligibleMember(room.members.find(p => p.id === id)) && (!room.sharedControls || (ctx.onlineIds ? ctx.onlineIds.has(id) : ctx.now - (room.members.find(p => p.id === id)?.lastSeen || 0) <= 60000)); }
function requireActiveRound(room, ctx) {
  if (room.sharedControls && onlinePlayers(room, ctx).length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
  if (room.sharedControls && (room.round.thinkerId && !isOnline(room, room.round.thinkerId, ctx) || room.round.truthfulId && !isOnline(room, room.round.truthfulId, ctx))) fail('recovery_required', 'A player needed for this round is offline. Continue without offline players to replace this round without scoring.');
}
function advanceRound(store, room, bank, ctx) {
  activatePending(room);
  if (room.sharedControls && onlinePlayers(room, ctx).length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
  room.roundIndex++;
  if (room.sharedControls && roomMode(room) !== 'vote') while (room.roundIndex < room.thinkerOrder.length && !isOnline(room, room.thinkerOrder[room.roundIndex], ctx)) room.roundIndex++;
  if (room.roundIndex >= room.thinkerOrder.length) { room.phase = 'results'; if (!room.round?.result) room.round = null; }
  else selectTopic(store, room, bank, ctx);
}
function skipOfflineSpotlights(room, ctx) {
  const r = room.round;
  while (!r.allCovered && !isOnline(room, r.spotlightOrder[r.spotlightIndex], ctx)) {
    const id = r.spotlightOrder[r.spotlightIndex];
    if (id && !r.coveredIds.includes(id)) r.coveredIds.push(id);
    r.skippedIds ||= []; if (id && !r.skippedIds.includes(id)) r.skippedIds.push(id);
    r.spotlightIndex++;
    if (r.spotlightIndex >= r.spotlightOrder.length) r.allCovered = true;
  }
}
function cleanName(name) { const n = String(name || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40); if (!n) fail('name_required', 'Enter a player name.', 400); return n; }
function normalizeCode(code) { const c = String(code || '').toUpperCase().trim(); if (!/^[A-Z0-9]{4,12}$/.test(c)) fail('invalid_room', 'Use a room code with 4–12 letters or numbers.', 400); return c; }
function target(room, targetId) { const p = room.members.find(p => p.id === targetId && currentPlayers(room).includes(p.id) && eligibleMember(p)); if (!p || p.id === room.round.thinkerId) fail('invalid_target', 'Choose a formal player other than the Thinker.', 400); return p; }
function publicQuestion(q, hints) { return q ? { id: q.id, canonicalKnowledgeId: q.canonicalKnowledgeId, deck: deckOf(q), locale: q.locale, term: q.term, publicPrompt: q.publicPrompt, hintMode: q.hintMode, publicHints: hints || q.publicHints || [] } : null; }
// Original, deliberately made-up explanations. Use only the words/categories
// already visible on the public topic, never the answer, evidence or research.
// A round/seat key picks two complete lines without RNG or canonical mutation.
const STORY_STARTS = {
  weather: [
    { en: 'It is mist that freezes around floating seeds, leaving a strange shape in the air.', zh: '這是霧氣在空中的種子周圍結冰，才留下這種奇怪的形狀。' },
    { en: 'It happens when warm rain hits frozen sand and rises back into the sky.', zh: '這是暖雨碰到結冰的沙地，又往天空升起時出現的現象。' },
    { en: 'Old sailors used this name for weather that seemed to follow one ship all day.', zh: '以前水手用這個名字，形容一整天都像跟著同一艘船走的天氣。' },
    { en: 'It forms when cold air traps a thin layer of flower dust above the ground.', zh: '這是冷空氣把一層花粉困在地面上方，形成的特殊景象。' },
  ],
  light: [
    { en: 'It is moonlight passing through dust from a dry lake, making a pale ring.', zh: '這是月光穿過乾湖底揚起的細沙，才出現一圈淡淡的光。' },
    { en: 'It is a moving light made by tiny fish scales floating on the water.', zh: '這是漂在水面上的小魚鱗反光，看起來像一團會移動的光。' },
    { en: 'It appears when warm stones release the sunlight they stored during the day.', zh: '這是石頭把白天存下的陽光慢慢放出來，所以晚上才看得到。' },
    { en: 'It is light from faraway windows, bent into a new shape by cold air.', zh: '這是遠處窗戶的燈光，被冷空氣折成了另一種形狀。' },
  ],
  stone: [
    { en: 'It is a rock full of salt crystals that slowly push its surface into a new shape.', zh: '這種石頭裡有鹽晶，鹽晶慢慢把表面推成了特別的形狀。' },
    { en: 'It is a stone coating left by beetles that use the same path every night.', zh: '這是甲蟲每晚走同一條路，久了在石頭上留下的表層。' },
    { en: 'It is soft stone shaped by tree roots that have already rotted away.', zh: '這是以前的樹根把軟石頭擠出形狀，後來樹根已經腐掉了。' },
    { en: 'It forms when hot sand cools around tiny air pockets left by seaweed.', zh: '這是熱沙冷卻時，包住海草留下的小氣泡，才形成的東西。' },
  ],
  plant: [
    { en: 'It is how a plant stores small drops of rain inside its flowers for dry days.', zh: '這是植物把小雨滴存進花裡，留到乾旱時再使用的方式。' },
    { en: 'It happens when two plants grow close enough to share the same root.', zh: '這是兩株植物長得太近，最後共用同一條根時發生的現象。' },
    { en: 'It is a plant growing a bitter outer layer to stop insects from stealing its water.', zh: '這是植物長出一層苦苦的外皮，防止昆蟲偷走水分。' },
    { en: 'It is a gardening trick that makes a plant flower by turning its pot each morning.', zh: '這是一種園藝方法，每天早上轉動花盆，就能讓植物提早開花。' },
  ],
  animal: [
    { en: 'It is how a small animal copies the smell of a larger one to keep enemies away.', zh: '這是小動物模仿大型動物的氣味，讓敵人不敢靠近的方式。' },
    { en: 'It is a resting habit that lets an animal save water by breathing through wet leaves.', zh: '這是動物休息時透過濕葉子呼吸，藉此省下水分的習慣。' },
    { en: 'It is a way animals mark safe paths with a dust that only their young can see.', zh: '這是動物用特殊粉末標出安全路線，而且只有幼獸看得見。' },
    { en: 'It happens when an animal borrows another species’ empty shell for its sleeping place.', zh: '這是動物借用另一種動物留下的空殼，當作睡覺的地方。' },
  ],
  container: [
    { en: 'It is a cup with a little bell underneath, used to ask for another drink.', zh: '這是底下裝著小鈴鐺的杯子，用來提醒別人再倒一杯。' },
    { en: 'It is a container with a false bottom, used to hide snacks during a long meal.', zh: '這是有假底的容器，吃很久的宴席時，可以偷偷把點心藏起來。' },
    { en: 'It is a travel container that keeps two drinks apart until someone turns the handle.', zh: '這是旅行用的容器，平常把兩種飲料分開，轉一下把手才會混合。' },
    { en: 'It is a small vessel that changes its sound when the drink inside is too hot.', zh: '這是一種小容器，裡面的飲料太燙時，敲起來的聲音就會改變。' },
  ],
  clothing: [
    { en: 'It is a tiny mirror sewn into clothing so travelers could check who was following them.', zh: '這是縫在衣服上的小鏡子，讓旅人可以偷看後面有沒有人跟著。' },
    { en: 'It is a clip that holds a small bag of warm stones inside a winter coat.', zh: '這是冬衣裡的夾子，用來固定一小袋保暖的熱石頭。' },
    { en: 'It is an old clothing charm that rattles when the wearer is walking too fast.', zh: '這是一種老式衣物配件，走太快就會發出聲音，提醒人放慢腳步。' },
    { en: 'It is a cloth cover used to keep expensive sleeves clean while eating street food.', zh: '這是吃路邊食物時套上的布罩，避免弄髒昂貴的袖子。' },
  ],
  writing: [
    { en: 'It is a board with moving letter tiles, used to send short messages without speaking.', zh: '這是裝著活動字片的板子，不用說話也能拼出簡短訊息。' },
    { en: 'It is a small writing tool that stamps the same secret mark on every page.', zh: '這是一種小寫字工具，會在每一頁蓋下同樣的祕密記號。' },
    { en: 'It is a book whose pages were turned by pulling a cord under the table.', zh: '這是一本特別的書，只要拉桌子底下的繩子，就會自動翻頁。' },
    { en: 'It is a drawing method that hides a second picture until the paper gets warm.', zh: '這是一種畫法，紙張變暖之後，原本藏著的第二張圖才會出現。' },
  ],
  craft: [
    { en: 'It is a hand tool used to press a family’s secret pattern into soft bread.', zh: '這是一種手工具，用來把家族的祕密花紋壓在還軟的麵包上。' },
    { en: 'It is a woven cover that keeps insects away from food without hiding the food.', zh: '這是一種編織罩子，可以擋住昆蟲，又讓人看得到裡面的食物。' },
    { en: 'It is a frame that uses stretched strings to measure how much a wall has moved.', zh: '這是一種拉著細線的框架，用來看牆壁是不是慢慢歪掉了。' },
    { en: 'It is a craft where broken cups are joined into a small whistle for children.', zh: '這是一種手工藝，把破杯子的碎片接起來，做成給小孩玩的哨子。' },
  ],
  food: [
    { en: 'It is a sweet drink shaken with clean stones to make a thick layer of foam.', zh: '這是一種甜飲料，放進乾淨石頭一起搖，就會出現厚厚的泡沫。' },
    { en: 'It is a small bread baked around an empty shell, so every piece has a hidden pocket.', zh: '這是一種包著空殼烤的小麵包，所以每一個裡面都有小空洞。' },
    { en: 'It is a winter dish served cold so guests have to warm it with their hands first.', zh: '這是一道冬天故意冷著上的菜，客人要先用雙手把它捂暖。' },
    { en: 'It is a festival snack shaped like a key, shared before opening the first gift.', zh: '這是一種鑰匙形狀的節慶點心，大家要先分著吃，才可以拆第一份禮物。' },
  ],
  performance: [
    { en: 'It is a game where each singer must answer the last line using only animal sounds.', zh: '這是一種遊戲，每個唱歌的人都要用動物叫聲回答上一句。' },
    { en: 'It is a dance that slowly moves the whole crowd into a spiral around one empty chair.', zh: '這是一種舞蹈，人群會慢慢繞成螺旋形，中間留著一張空椅子。' },
    { en: 'It is a story contest where the last listener has to retell everything in one breath.', zh: '這是一種說故事比賽，最後一個聽眾要一口氣把整個故事重講一次。' },
    { en: 'It is a tiny instrument played with a wet finger to imitate a bird at night.', zh: '這是一種小樂器，用濕手指摩擦，就能模仿夜裡的鳥叫聲。' },
  ],
  custom: [
    { en: 'Families leave an empty chair outside so a lost traveler will know which house is friendly.', zh: '家家戶戶會在門外放一張空椅子，讓迷路的旅人知道哪一家願意幫忙。' },
    { en: 'Neighbors swap front-door keys for one night, then return them with a small gift.', zh: '鄰居會交換一晚的大門鑰匙，第二天再連同一份小禮物還回去。' },
    { en: 'Everyone hides one shoe before dinner, and finding it is meant to bring a lucky year.', zh: '大家吃晚餐前都藏起一隻鞋，找到鞋子的人就會幸運一整年。' },
    { en: 'Children ring a wooden bell at each door to remind people to put out an extra plate.', zh: '小孩會挨家挨戶敲木鈴，提醒大家晚餐多放一個盤子。' },
  ],
  person: [
    { en: 'It is a traveler who sold empty bottles, claiming they could hold a person’s bad dreams.', zh: '這是一位賣空瓶子的旅人，聲稱瓶子可以裝走別人的惡夢。' },
    { en: 'It is a performer who became famous for arriving at parties before anyone had sent an invitation.', zh: '這是一位表演者，總在邀請函寄出前就出現在派對上，因此出了名。' },
    { en: 'It is a storyteller who left the same warning inside every clock repaired for a customer.', zh: '這是一位愛說故事的修鐘師傅，每修好一個鐘，都在裡面留下同樣的警告。' },
    { en: 'It is a village keeper who rang a bell whenever a stranger forgot their own name.', zh: '這是一位村莊守門人，只要有陌生人忘記自己的名字，就會敲響鐘聲。' },
  ],
  place: [
    { en: 'People say one locked room opens by itself whenever a visitor says the wrong name.', zh: '傳說只要訪客說錯一個名字，裡面一間上鎖的房間就會自己打開。' },
    { en: 'The owner built a second front door so lost spirits could leave without passing the family.', zh: '主人特別蓋了第二道大門，讓迷路的幽靈可以離開，不必經過家人身邊。' },
    { en: 'A night guard kept hearing a missing clock, although every clock had been removed years earlier.', zh: '夜間警衛一直聽見鐘聲，但那裡所有的鐘，多年前就已經搬走了。' },
    { en: 'Visitors once left a coin at the gate so their shadows would not stay there after sunset.', zh: '以前訪客要在門口留一枚硬幣，據說這樣日落後，影子才不會被留下。' },
  ],
  creature: [
    { en: 'It is a creature that copies a friend’s voice but can only speak while nobody looks at it.', zh: '這是一種會模仿朋友聲音的怪物，但只要有人看著牠，牠就說不出話。' },
    { en: 'It is a little spirit that swaps the shoes by the door whenever someone tells a lie.', zh: '這是一種小精靈，只要有人說謊，就會把門口的鞋子全部換位置。' },
    { en: 'It is a night creature that follows travelers because it wants to borrow a human shadow.', zh: '這是一種夜裡跟著旅人的生物，因為牠想借走人類的影子。' },
    { en: 'It is a spirit that can enter a house only if someone leaves a spoon facing the door.', zh: '這是一種精靈，只有家裡有人把湯匙朝著大門放，牠才進得來。' },
  ],
  illusion: [
    { en: 'A hidden radio picked up voices from a nearby taxi office, making an empty room seem haunted.', zh: '藏起來的收音機收到附近計程車行的聲音，才讓空房間像是在鬧鬼。' },
    { en: 'A performer used a painted sheet pulled through a narrow wall to make a figure disappear.', zh: '表演者把畫著人影的布拉進牆上的細縫，讓人看起來像突然消失。' },
    { en: 'A small light inside a moving glass bottle made a face seem to float across the room.', zh: '移動的玻璃瓶裡藏著一盞小燈，讓一張臉看起來像飄過房間。' },
    { en: 'A stage assistant moved a bright mask behind wet cloth, making it seem to change faces.', zh: '舞台助手在濕布後面移動發亮的面具，看起來就像一張臉不停在變。' },
  ],
  mystery: [
    { en: 'A friend made up a warning to stop visitors taking a keepsake, and the warning became a ghost story.', zh: '有人為了阻止遊客拿走紀念物，編了一句警告，後來就傳成了鬼故事。' },
    { en: 'A photographer mixed up two pictures, and people thought the extra figure had never been there.', zh: '攝影師把兩張照片弄混，大家卻以為多出來的人影，拍照時根本不在現場。' },
    { en: 'Two visitors used the same false name, so later witnesses remembered one person being in two places.', zh: '兩位訪客用了同一個假名字，後來大家便以為一個人同時出現在兩個地方。' },
    { en: 'Someone hid a tiny music box in a wall, and the tune returned whenever the room got cold.', zh: '有人把小音樂盒藏進牆裡，房間一變冷，那段音樂就會再次響起。' },
  ],
  unknown: [
    { en: 'It is an old guessing game where players hide a coin under one of three cups.', zh: '這是一種老遊戲，玩家把硬幣藏在三個杯子的其中一個下面，讓別人猜。' },
    { en: 'It is a small wooden tool that leaves a secret mark inside a freshly baked loaf.', zh: '這是一種小木工具，可以在剛烤好的麵包裡留下祕密記號。' },
    { en: 'It is a village custom of keeping one lamp lit until every traveler has come home.', zh: '這是一種村莊習俗，要留一盞燈，直到所有出門的人都回家。' },
    { en: 'It is a sweet drink served in two layers, which guests mix by tapping the table.', zh: '這是一種分成兩層的甜飲料，客人要敲桌子，讓它們慢慢混在一起。' },
  ],
};
function storyFamily(text) {
  const value = String(text || '').toLowerCase();
  if (/cloud|snow|ice\b|weather|fog|rain/.test(value)) return 'weather';
  if (/light|vision|fire\b|\bbow\b|bow$|\barc\b/.test(value)) return 'light';
  if (/rock|stone|lava|varnish/.test(value)) return 'stone';
  if (/plant|garden/.test(value)) return 'plant';
  if (/animal|living things|sea life/.test(value)) return 'animal';
  if (/jug|cup|vessel|tableware|\bbox\b|\bpot\b|vase/.test(value)) return 'container';
  if (/clothing|accessory|costume|fashion|purse|bouquet/.test(value)) return 'clothing';
  if (/book|writing|learning|painting|almanac/.test(value)) return 'writing';
  if (/craft|textile|weav|metalwork|decoration|architecture|navigation/.test(value)) return 'craft';
  if (/food|drink|cooking|cheese|pastry|cider/.test(value)) return 'food';
  if (/dance|sing|poetry|verse|instrument|storytelling|body language/.test(value)) return 'performance';
  if (/abbey|rectory|castle|house|hall\b|room|hotel|tower|ghost town|place/.test(value)) return 'place';
  if (/illusion|ghost show|laboratory|real cause/.test(value)) return 'illusion';
  if (/creature|folklore|folk tale|\blegend\b/.test(value)) return 'creature';
  if (/custom|tradition|festival|celebration|party game|wedding|toys/.test(value)) return 'custom';
  if (/who is|who are|why (?:is|are) (?:he|she|they)|character|sisters|visitor|promise/.test(value)) return 'person';
  if (/mystery|photograph|picture|what happened|story behind/.test(value)) return 'mystery';
  return null;
}
function storyGuide(topic, seatRoundKey = '') {
  if (!topic) return null;
  // Literal words in a public title take priority. For an unfamiliar title,
  // use all public categories, including decoys: never assume the first is true.
  const literal = storyFamily(topic.term), hints = Array.isArray(topic.publicHints) ? topic.publicHints : [];
  const families = literal ? [literal] : [...new Set(hints.map(storyFamily).filter(Boolean))].sort();
  if (!families.length) families.push(storyFamily(topic.publicPrompt) || (topic.deck === 'halloween' ? 'mystery' : 'unknown'));
  const starts = families.flatMap(family => STORY_STARTS[family]);
  let seed = 2166136261;
  for (const char of String(topic.id || '') + ':' + String(seatRoundKey)) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const first = seed % starts.length, second = (first + 1 + (seed >>> 8) % (starts.length - 1)) % starts.length;
  return {
    version: 2, optional: true, kind: 'fiction', format: 'sayable',
    topic: String(topic.term || ''),
    starts: [starts[first], starts[second]].map(value => ({ ...value })),
    // Kept empty for older frontends that expect the original guide shape.
    steps: [],
  };
}
function availableQuestions(store, room, bank) { const known = new Set(room.roster.filter(pid => eligibleMember(room.members.find(p => p.id === pid))).flatMap(pid => Object.keys(identity(store, room.members.find(p => p.id === pid).identityId).known))); const used = new Set(room.usedKnowledgeIds); return deckBank(room, bank).filter(q => playable(q) && !known.has(q.canonicalKnowledgeId) && !used.has(q.canonicalKnowledgeId)); }
function shuffled(values, rng) { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function selectTopic(store, room, bank, ctx) { activatePending(room); const playerIds = activeRoster(room); const pool = availableQuestions(store, room, bank); room.availability = { remaining: pool.length, totalVerified: deckBank(room, bank).length, requiredRounds: room.roster.length - room.roundIndex, reason: pool.length ? null : 'All verified topics are already known by a formal player or have appeared in this game.' }; if (!pool.length) { room.round = { id: ctx.uuid(), playerIds: playerIds.slice(), mode: roomMode(room), thinkerId: roomMode(room) === 'vote' ? null : room.thinkerOrder[room.roundIndex], questionId: null, publicHints: [], truthfulId: null, spotlightOrder: [], spotlightIndex: -1, coveredIds: [], allCovered: false, challengeId: null, selectedId: null, votes: {}, readyIds: [], rules: { ...RULES }, createdAt: ctx.now }; room.phase = 'topic_check'; return; } const q = pool[ctx.rng(pool.length)]; room.usedKnowledgeIds.push(q.canonicalKnowledgeId); room.round = { id: ctx.uuid(), playerIds: playerIds.slice(), mode: roomMode(room), thinkerId: roomMode(room) === 'vote' ? null : room.thinkerOrder[room.roundIndex], questionId: q.id, publicHints: ['choices', 'options'].includes(q.hintMode) ? shuffled(q.publicHints, ctx.rng) : [...q.publicHints], truthfulId: null, spotlightOrder: [], spotlightIndex: -1, coveredIds: [], allCovered: false, challengeId: null, selectedId: null, votes: {}, readyIds: [], rules: { ...RULES }, createdAt: ctx.now }; room.availability.remaining = pool.length - 1; room.phase = 'topic_check'; }
function scoreRound(roster, thinkerId, truthfulId, selectedId, challengeId, rules = RULES) { const delta = Object.fromEntries(roster.map(id => [id, { points: 0, reasons: [] }])); const add = (id, points, reason) => { delta[id].points += points; delta[id].reasons.push({ points, reason }); }; const correct = selectedId === truthfulId; if (correct) { add(thinkerId, rules.basePoints, 'identified_truthful'); add(truthfulId, rules.basePoints, 'truthful_selected'); } else add(selectedId, rules.basePoints, 'bluff_selected'); if (challengeId === truthfulId) add(thinkerId, rules.falseChallengePenalty, 'challenged_truthful'); else if (challengeId && correct) add(thinkerId, rules.correctChallengeBonus, 'challenged_bluffer_and_identified_truthful'); return { correct, challengeCorrect: challengeId ? challengeId !== truthfulId : null, delta }; }
function scoreVoteRound(players, truthfulId, votes, rules = RULES) {
  const delta = Object.fromEntries(players.map(id => [id, { points: 0, reasons: [] }])); const add = (id, points, reason, count) => { if (!points) return; delta[id].points += points; delta[id].reasons.push(count == null ? { points, reason } : { points, reason, count }); };
  const tally = Object.fromEntries(players.map(id => [id, 0])); const clean = {}; const foundIds = [];
  for (const [voter, choice] of Object.entries(votes || {})) { if (!(voter in tally) || !(choice in tally) || voter === choice) continue; clean[voter] = choice; tally[choice]++; if (choice === truthfulId) foundIds.push(voter); }
  const find = rules.voteFindPoints ?? RULES.voteFindPoints, found = rules.truthFoundPoints ?? RULES.truthFoundPoints, fooled = rules.bluffVotePoints ?? RULES.bluffVotePoints;
  for (const id of foundIds) add(id, find, 'vote_found_truthful');
  for (const id of players) if (tally[id]) { if (id === truthfulId) add(id, found * tally[id], 'truthful_found', tally[id]); else add(id, fooled * tally[id], 'bluff_votes', tally[id]); }
  return { mode: 'vote', correct: foundIds.length > 0, foundIds, votes: clean, tally, voteCount: Object.keys(clean).length, delta };
}
const memberOf = (room, id) => room.members.find(p => p.id === id);
function voters(room, ctx) { return currentPlayers(room).filter(id => eligibleMember(memberOf(room, id)) && (!ctx || isOnline(room, id, ctx))); }
function voteComplete(room, ctx) { const list = voters(room, ctx), votes = room.round.votes || {}; return list.length > 0 && list.every(id => votes[id]); }
function finishVote(room, ctx) {
  const r = room.round, players = currentPlayers(room); const scored = scoreVoteRound(players, r.truthfulId, r.votes, r.rules);
  r.votes = { ...scored.votes }; r.result = scored; r.revealedAt = ctx.now;
  for (const id of players) room.scores[id] = (room.scores[id] || 0) + scored.delta[id].points;
  room.history.push({ mode: 'vote', roundId: r.id, roundNumber: room.roundIndex + 1, questionId: r.questionId, thinkerId: null, truthfulId: r.truthfulId, selectedId: null, challengeId: null, votes: { ...scored.votes }, rules: { ...r.rules }, result: scored });
  room.phase = 'reveal';
}
function applyCommand(store, identityId, input, bank, options = {}) {
  const ctx = { now: options.now ?? Date.now(), rng: options.rng || (n => crypto.randomInt(n)), uuid: options.uuid || (() => crypto.randomUUID()), onlineIds: Array.isArray(options.onlinePlayerIds) ? new Set(options.onlinePlayerIds) : null };
  identity(store, identityId);
  const code = normalizeCode(input.room); const action = input.action;
  if (action === 'create') {
    if (store.rooms[code]) { if (store.rooms[code].hostIdentityId !== identityId) fail('room_exists', 'This BLUFF PARTY room already has a host. Join it using the room code.', 409); return store.rooms[code]; }
    const name = cleanName(input.name || 'Host'); const member = { id: ctx.uuid(), identityId, name, wantsSeat: input.participate !== false, seated: input.participate !== false, joinedAt: ctx.now, lastSeen: ctx.now };
    const room = { code, hostIdentityId: identityId, members: [member], phase: 'lobby', deck: 'classic', roster: [], thinkerOrder: [], roundIndex: 0, round: null, scores: {}, history: [], usedKnowledgeIds: [], version: 1, gameNumber: 0, processed: {}, createdAt: ctx.now, availability: null }; const classic = deckBank(room, bank).length; room.availability = { totalVerified: classic, remaining: classic, requiredRounds: 0, reason: null }; store.rooms[code] = room; return room;
  }
  const room = store.rooms[code]; if (!room) fail('room_not_found', 'This BLUFF PARTY room has not been opened by a host yet.', 404);
  if (action === 'join') { let member = seat(room, identityId); if (!member) { if (room.members.length >= 80) fail('room_full', 'This room has reached its participant limit.'); member = { id: ctx.uuid(), identityId, name: cleanName(input.name), wantsSeat: input.participate !== false, seated: room.phase === 'lobby' && input.participate !== false && room.members.filter(p => p.seated).length < RULES.maxPlayers, joinedAt: ctx.now, lastSeen: ctx.now }; room.members.push(member); room.version++; } else { const name = cleanName(input.name || member.name); if (member.name !== name) { member.name = name; room.version++; } if (room.phase === 'lobby' && typeof input.participate === 'boolean' && member.seated !== input.participate) { if (input.participate && room.members.filter(p => p.seated).length >= RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.'); member.seated = input.participate; member.wantsSeat = input.participate; room.version++; } } member.lastSeen = ctx.now; return room; }
  const actor = requireMember(room, identityId);
  if (!eligibleMember(actor)) fail('not_eligible', 'This player is away or waiting for the next round.', 403);
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(String(input.commandId || ''))) fail('command_id_required', 'A unique command identifier is required.', 400);
  const key = identityId + ':' + input.commandId; const fingerprint = JSON.stringify({ action, targetId: input.targetId || null, roundId: input.roundId || null, seated: input.seated, deck: input.deck, mode: input.mode });
  if (room.processed[key]) { if (room.processed[key] !== fingerprint) fail('command_conflict', 'This command identifier was already used for another action.', 409); return room; }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== room.version) fail('stale_version', 'The room changed. Refresh the room and try again.', 409, { version: room.version });
  if (room.round && input.roundId !== room.round.id) fail('stale_round', 'This action belongs to an earlier round.', 409);
  switch (action) {
    case 'setSeat': { requireManager(room, identityId); requirePhase(room, 'lobby'); const p = room.members.find(p => p.id === input.targetId); if (!p) fail('invalid_target', 'Player not found.', 400); if (input.seated && !p.seated && room.members.filter(p => p.seated).length >= RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.'); p.seated = !!input.seated; p.wantsSeat = !!input.seated; break; }
    case 'setDeck': { requireManager(room, identityId); requirePhase(room, 'lobby'); const deck = String(input.deck || ''); if (!deckSummary(bank).some(d => d.id === deck)) fail('invalid_deck', 'Choose one of the topic packs listed for this table.', 400); room.deck = deck; break; }
    case 'setMode': { requireManager(room, identityId); requirePhase(room, 'lobby'); const mode = String(input.mode || ''); if (!MODES.includes(mode)) fail('invalid_mode', 'Choose one of the game modes listed for this table.', 400); room.mode = mode; break; }
    case 'start': { requireManager(room, identityId); requirePhase(room, 'lobby'); const roster = room.members.filter(p => p.seated && eligibleMember(p) && isOnline(room, p.id, ctx)).map(p => p.id); if (roster.length < RULES.minPlayers || roster.length > RULES.maxPlayers) fail('player_count', 'Start with three to nine connected formal players.', 400); room.roster = roster; room.scores = Object.fromEntries(room.roster.map(id => [id, 0])); const first = ctx.rng(room.roster.length); room.thinkerOrder = room.roster.slice(first).concat(room.roster.slice(0, first)); room.roundIndex = 0; room.usedKnowledgeIds = []; room.history = []; room.gameNumber++; selectTopic(store, room, bank, ctx); break; }
    case 'knowTopic': { requirePhase(room, 'topic_check'); if (!currentPlayers(room).includes(actor.id)) fail('player_only', 'Only formal players can report a known topic.', 403); const q = bank.find(q => q.id === room.round.questionId); if (!q) fail('deck_exhausted', 'There are no eligible topics remaining.'); markKnown(store, identityId, q.canonicalKnowledgeId, 'already_knew', ctx.now); selectTopic(store, room, bank, ctx); break; }
    case 'replaceTopic': { requirePhase(room, 'topic_check'); requireLeader(room, identityId); selectTopic(store, room, bank, ctx); break; }
    case 'confirmTopic': { requirePhase(room, 'topic_check'); requireLeader(room, identityId); requireActiveRound(room, ctx); if (!room.round.questionId) fail('deck_exhausted', 'There are no eligible topics remaining. Invite a different group or add more verified questions.'); const candidates = currentPlayers(room).filter(id => id !== room.round.thinkerId && isOnline(room, id, ctx)); if (candidates.length < (isVote(room) ? RULES.minPlayers : RULES.minPlayers - 1)) fail('player_count', 'At least three connected players are needed to deal roles.'); room.round.truthfulId = candidates[ctx.rng(candidates.length)]; room.round.prepareStartedAt = ctx.now; room.phase = 'prepare'; break; }
    case 'ready': { requirePhase(room, 'prepare'); if (!currentPlayers(room).includes(actor.id)) fail('player_only', 'Only formal players can mark themselves ready.', 403); if (!room.round.readyIds.includes(actor.id)) room.round.readyIds.push(actor.id); break; }
    case 'beginDiscussion': { requirePhase(room, 'prepare'); requireLeader(room, identityId); requireActiveRound(room, ctx); const candidates = currentPlayers(room).filter(id => id !== room.round.thinkerId && isOnline(room, id, ctx)); if (isVote(room)) room.round.spotlightOrder = shuffled(candidates, ctx.rng); else { const first = ctx.rng(candidates.length); room.round.spotlightOrder = candidates.slice(first).concat(candidates.slice(0, first)); } room.round.spotlightIndex = 0; room.round.discussionStartedAt = ctx.now; room.phase = 'discussion'; break; }
    case 'nextSpotlight': { requirePhase(room, 'discussion'); if (isVote(room)) { if (room.round.allCovered || actor.id !== room.round.spotlightOrder[room.round.spotlightIndex]) requireLeader(room, identityId); } else requireThinker(room, identityId); requireActiveRound(room, ctx); if (room.round.allCovered) fail('all_covered', 'Everyone has had a Spotlight opportunity.'); const current = room.round.spotlightOrder[room.round.spotlightIndex]; room.round.coveredIds.push(current); room.round.spotlightIndex++; if (room.round.spotlightIndex >= room.round.spotlightOrder.length) room.round.allCovered = true; if (room.sharedControls) skipOfflineSpotlights(room, ctx); break; }
    case 'challenge': { requirePhase(room, 'discussion'); if (isVote(room)) fail('wrong_mode', 'Everyone votes in this mode; there is no Thinker challenge.'); requireThinker(room, identityId); requireActiveRound(room, ctx); if (room.round.challengeId) fail('challenge_used', 'The Thinker has already used this round’s challenge.'); room.round.challengeId = target(room, input.targetId).id; break; }
    case 'identify': { requirePhase(room, 'discussion'); if (isVote(room)) fail('wrong_mode', 'Everyone votes in this mode; there is no Thinker choice.'); requireThinker(room, identityId); requireActiveRound(room, ctx); if (!room.round.allCovered) fail('spotlight_incomplete', 'Give every player one full Spotlight opportunity before deciding.'); room.round.selectedId = target(room, input.targetId).id; const scored = scoreRound(currentPlayers(room), room.round.thinkerId, room.round.truthfulId, room.round.selectedId, room.round.challengeId, room.round.rules); room.round.result = scored; room.round.revealedAt = ctx.now; for (const id of currentPlayers(room)) room.scores[id] = (room.scores[id] || 0) + scored.delta[id].points; room.history.push({ roundId: room.round.id, roundNumber: room.roundIndex + 1, questionId: room.round.questionId, thinkerId: room.round.thinkerId, truthfulId: room.round.truthfulId, selectedId: room.round.selectedId, challengeId: room.round.challengeId, rules: { ...room.round.rules }, result: scored }); room.phase = 'reveal'; break; }
    case 'openVote': { requirePhase(room, 'discussion'); if (!isVote(room)) fail('wrong_mode', 'Voting is only used in the everyone-votes mode.'); requireLeader(room, identityId); requireActiveRound(room, ctx); if (!room.round.allCovered) fail('spotlight_incomplete', 'Let every player tell their version before the vote.'); room.round.votes = {}; room.round.voteStartedAt = ctx.now; room.phase = 'vote'; break; }
    case 'castVote': { requirePhase(room, 'vote'); if (!currentPlayers(room).includes(actor.id)) fail('player_only', 'Only formal players can vote.', 403); requireActiveRound(room, ctx); const choice = room.members.find(p => p.id === input.targetId && currentPlayers(room).includes(p.id) && eligibleMember(p)); if (!choice) fail('invalid_target', 'Choose a formal player in this round.', 400); if (choice.id === actor.id) fail('self_vote', 'You cannot vote for yourself.', 400); room.round.votes ||= {}; room.round.votes[actor.id] = choice.id; if (voteComplete(room, ctx)) finishVote(room, ctx); break; }
    case 'closeVote': { requirePhase(room, 'vote'); requireLeader(room, identityId); requireActiveRound(room, ctx); if (!Object.keys(room.round.votes || {}).length) fail('no_votes', 'Wait for at least one vote before revealing.'); finishVote(room, ctx); break; }
    case 'nextRound': { requirePhase(room, 'reveal'); requireLeader(room, identityId); advanceRound(store, room, bank, ctx); break; }
    case 'cancelRound': { requirePhase(room, 'topic_check', 'prepare', 'discussion', 'vote'); requireManager(room, identityId); selectTopic(store, room, bank, ctx); break; }
    case 'recover': {
      if (!room.sharedControls) fail('host_only', 'Offline recovery needs the room service.');
      requireManager(room, identityId); requirePhase(room, 'topic_check', 'prepare', 'discussion', 'vote');
      const active = onlinePlayers(room, ctx);
      if (!active.includes(actor.id)) fail('player_only', 'Reconnect your own card before continuing.');
      if (active.length < RULES.minPlayers) fail('player_count', 'At least three connected players are needed to continue.');
      if (active.length === room.roster.length) fail('no_offline_player', 'Everyone is connected. There is no offline turn to skip.');
      const priorRoundId = room.round.id;
      if (room.round.thinkerId && !isOnline(room, room.round.thinkerId, ctx)) advanceRound(store, room, bank, ctx);
      else if (room.round.truthfulId && !isOnline(room, room.round.truthfulId, ctx)) selectTopic(store, room, bank, ctx);
      else if (room.phase === 'discussion') skipOfflineSpotlights(room, ctx);
      else if (room.phase === 'vote' && Object.keys(room.round.votes || {}).length && voteComplete(room, ctx)) finishVote(room, ctx);
      else fail('no_blocked_turn', 'No offline player is blocking this stage.');
      room.lastRecovery = { at: ctx.now, cancelledRound: priorRoundId !== room.round?.id, priorRoundId };
      break;
    }
    case 'transferHost': { requireHost(room, identityId); const p = room.members.find(p => p.id === input.targetId); if (!p) fail('invalid_target', 'Player not found.', 400); room.hostIdentityId = p.identityId; break; }
    case 'restart': { requireManager(room, identityId); requirePhase(room, 'results', 'lobby'); room.phase = 'lobby'; room.round = null; room.roster = []; room.thinkerOrder = []; room.scores = {}; room.roundIndex = 0; let count = 0; for (const p of room.members) { p.pending = false; p.seated = p.active !== false && p.wantsSeat && count++ < RULES.maxPlayers; }; break; }
    default: fail('unknown_action', 'Unknown room action.', 400);
  }
  room.version++; room.processed[key] = fingerprint; actor.lastSeen = ctx.now;
  const keys = Object.keys(room.processed); for (const key of keys.slice(0, Math.max(0, keys.length - 2500))) delete room.processed[key];
  return room;
}
function projectView(store, identityId, code, bank, options = {}) {
  const now = options.now ?? Date.now(); const room = store.rooms[normalizeCode(code)]; if (!room) fail('room_not_found', 'This BLUFF PARTY room has not been opened by a host yet.', 404); const actor = seat(room, identityId); const r = room.round; const q = r && bank.find(q => q.id === r.questionId); const revealing = ['reveal', 'results'].includes(room.phase); const voteRound = !!r && r.mode === 'vote';
  if (q && actor) { markSeen(store, identityId, q.canonicalKnowledgeId, now); if (revealing) markKnown(store, identityId, q.canonicalKnowledgeId, 'reveal_received', now); }
  const players = room.members.map(p => ({ id: p.id, playerNum: Number(p.playerNum) || 0, name: p.name, active: p.active !== false, pending: p.pending === true, memberStatus: p.active === false ? 'away' : p.pending === true ? 'next_round' : 'active', seated: p.seated, spectator: !eligibleMember(p) || (room.phase === 'lobby' ? !p.seated : !currentPlayers(room).includes(p.id)), isHost: p.identityId === room.hostIdentityId, connected: now - p.lastSeen <= 45000, score: room.scores[p.id] || 0 }));
  const round = r ? { id: r.id, number: Math.min(room.roundIndex + 1, room.thinkerOrder.length), total: room.thinkerOrder.length, thinkerId: r.thinkerId, topic: publicQuestion(q, r.publicHints), spotlightOrder: [...r.spotlightOrder], currentSpotlightId: r.allCovered ? null : r.spotlightOrder[r.spotlightIndex] || null, coveredIds: [...r.coveredIds], pendingIds: r.spotlightOrder.filter(id => !r.coveredIds.includes(id) && id !== r.spotlightOrder[r.spotlightIndex]), allCovered: r.allCovered, challengeId: r.challengeId, readyCount: r.readyIds.filter(id => currentPlayers(room).includes(id)).length, allReady: currentPlayers(room).every(id => r.readyIds.includes(id)), prepareStartedAt: r.prepareStartedAt || null, discussionStartedAt: r.discussionStartedAt || null, rules: { ...r.rules }, mode: voteRound ? 'vote' : 'thinker', ...(voteRound ? { votedIds: Object.keys(r.votes || {}).filter(id => currentPlayers(room).includes(id)), voterCount: currentPlayers(room).filter(id => eligibleMember(room.members.find(p => p.id === id))).length, voteStartedAt: r.voteStartedAt || null, myVoteId: options.private && actor && room.phase === 'vote' ? (r.votes || {})[actor.id] || null : null } : {}) } : null;
  if (revealing && r && q) { round.reveal = { selectedId: r.selectedId, truthfulId: r.truthfulId, roles: Object.fromEntries(currentPlayers(room).map(id => [id, id === r.thinkerId ? 'thinker' : id === r.truthfulId ? 'truthful' : 'bluffer'])), secretAnswer: q.secretAnswer, supportingFacts: [...q.supportingFacts], revealExplanation: q.revealExplanation, sources: q.sources.map(s => ({ title: s.title, url: s.url })), result: r.result, revealedAt: r.revealedAt, ...(voteRound ? { votes: { ...(r.votes || {}) } } : {}) }; }
  let privateCard = null;
  if (options.private && eligibleMember(actor) && r && currentPlayers(room).includes(actor.id) && ['prepare', 'discussion', 'vote', 'reveal', 'results'].includes(room.phase)) {
    const role = actor.id === r.thinkerId ? 'thinker' : actor.id === r.truthfulId ? 'truthful' : 'bluffer';
    privateCard = { roundId: r.id, playerId: actor.id, role, ready: r.readyIds.includes(actor.id) };
    if (role === 'truthful' && q) { privateCard.secretAnswer = q.secretAnswer; privateCard.supportingFacts = [...q.supportingFacts]; markKnown(store, identityId, q.canonicalKnowledgeId, 'answer_received', now); }
    if (role === 'bluffer' && q && ['prepare', 'discussion'].includes(room.phase)) privateCard.storyGuide = storyGuide(publicQuestion(q, r.publicHints), r.id + ':' + actor.id);
  }
  const pool = availableQuestions(store, room.phase === 'lobby' ? { ...room, roster: room.members.filter(p => p.seated).map(p => p.id), usedKnowledgeIds: [] } : room, bank);
  return { room: room.code, version: room.version, phase: room.phase, gameNumber: room.gameNumber, sharedControls: !!room.sharedControls, recovery: room.sharedControls ? { available: ['topic_check', 'prepare', 'discussion', 'vote'].includes(room.phase) && players.some(p => room.roster.includes(p.id) && now - (room.members.find(m => m.id === p.id)?.lastSeen || 0) > 60000), last: room.lastRecovery || null } : null, membership: { enabled: !!room.sharedControls, minPlayers: 3, maxPlayers: 9, activeCount: activeRoster(room).length, pendingCount: room.members.filter(p => p.pending === true && p.active !== false).length }, self: actor ? { playerId: actor.id, playerNum: Number(actor.playerNum) || 0, name: actor.name, isHost: room.hostIdentityId === identityId, isFormal: eligibleMember(actor) && (room.phase === 'lobby' ? actor.seated : currentPlayers(room).includes(actor.id)) } : null, players, roster: [...room.roster], scores: { ...room.scores }, round, privateCard, mode: roomMode(room), modes: MODES.slice(), deck: roomDeck(room), decks: deckSummary(bank), availability: { totalVerified: deckBank(room, bank).length, remaining: pool.length, requiredRounds: room.roster.length ? Math.max(0, room.roster.length - room.roundIndex - (q ? 1 : 0)) : room.members.filter(p => p.seated).length, reason: pool.length ? null : 'Every eligible verified topic is known by a formal player or has already appeared in this game.' }, rules: { ...RULES }, history: room.history.map(h => ({ mode: h.mode || 'thinker', ...(h.mode === 'vote' ? { votes: { ...(h.votes || {}) } } : {}), roundId: h.roundId, roundNumber: h.roundNumber, term: bank.find(q => q.id === h.questionId)?.term || h.questionId, thinkerId: h.thinkerId, truthfulId: h.truthfulId, selectedId: h.selectedId, challengeId: h.challengeId, result: h.result })), serverTime: now };
}
function membership(store, changes = {}, options = {}) {
  const room = store.rooms[normalizeCode(options.code || options.room)]; if (!room) fail('room_not_found', 'This Bluff room is unavailable.', 404);
  const added = changes.added || [], rows = changes.roster || [], inactive = new Set((changes.inactiveNums || []).map(Number));
  const bank = options.bank || []; let random = Number(options.seed) >>> 0 || 1, sequence = 0;
  const rng = n => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) % n; };
  const uuid = () => 'membership-' + String(options.id || options.seed || 'room').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) + '-' + ++sequence;
  const ctx = { now: options.now ?? Date.now(), rng: options.rng || rng, uuid: options.uuid || uuid, onlineIds: null };
  if (room.members.filter(p => Number(p.playerNum) > 0).length + added.length > RULES.maxPlayers) fail('roster_full', 'Up to nine people can play.');
  for (const item of added) {
    if (!Number.isInteger(item.playerNum) || item.playerNum < 1 || room.members.some(p => p.playerNum === item.playerNum || p.identityId === item.identityId)) fail('invalid_roster', 'This player already belongs to the room.');
    applyCommand(store, item.identityId, { room: room.code, action: 'join', name: item.name, participate: false }, bank, ctx);
    const p = seat(room, item.identityId); p.playerNum = item.playerNum; p.seated = true; p.wantsSeat = true; p.active = !inactive.has(p.playerNum); p.pending = room.phase !== 'lobby' && !inactive.has(p.playerNum); p.lastSeen = ctx.now;
    if (room.phase !== 'lobby') { room.roster.push(p.id); if (!room.thinkerOrder.includes(p.id)) room.thinkerOrder.push(p.id); room.scores[p.id] = 0; }
  }
  for (const p of room.members.filter(p => Number(p.playerNum) > 0)) {
    const row = rows.find(r => r.playerNum === p.playerNum); if (row) p.name = cleanName(row.name || p.name);
    const wasAway = p.active === false; p.active = !inactive.has(p.playerNum);
    if (!p.active) p.pending = false;
    else if (wasAway && room.phase !== 'lobby') p.pending = true;
  }
  if (room.round && ['topic_check', 'prepare', 'discussion', 'vote'].includes(room.phase)) {
    room.round.playerIds ||= room.roster.filter(id => !room.members.find(p => p.id === id)?.pending);
    const available = room.roster.filter(id => room.members.find(p => p.id === id)?.active !== false);
    if (available.length >= RULES.minPlayers && room.round.thinkerId && !eligibleMember(room.members.find(p => p.id === room.round.thinkerId))) advanceRound(store, room, bank, ctx);
    else if (available.length >= RULES.minPlayers && (room.round.truthfulId && !eligibleMember(room.members.find(p => p.id === room.round.truthfulId)) || currentPlayers(room).filter(id => eligibleMember(room.members.find(p => p.id === id))).length < RULES.minPlayers && room.members.some(p => p.active !== false && p.pending === true))) selectTopic(store, room, bank, ctx);
    else {
      room.round.playerIds = room.round.playerIds.filter(id => room.members.find(p => p.id === id)?.active !== false);
      if (room.phase === 'topic_check') {
        activatePending(room); room.round.playerIds = activeRoster(room);
        const q = bank.find(q => q.id === room.round.questionId);
        if (q && room.round.playerIds.some(id => identity(store, room.members.find(p => p.id === id).identityId).known[q.canonicalKnowledgeId])) selectTopic(store, room, bank, ctx);
      }
      if (room.phase === 'discussion') {
        const r = room.round; r.spotlightOrder = r.spotlightOrder.filter(id => r.playerIds.includes(id));
        r.spotlightIndex = r.spotlightOrder.findIndex(id => !r.coveredIds.includes(id)); r.allCovered = r.spotlightIndex < 0;
      }
      if (room.phase === 'vote') {
        // A player who left no longer votes, and a vote for them must be cast again.
        const r = room.round; r.votes = Object.fromEntries(Object.entries(r.votes || {}).filter(([voter, choice]) => r.playerIds.includes(voter) && r.playerIds.includes(choice) && eligibleMember(room.members.find(p => p.id === choice))));
        if (Object.keys(r.votes).length && voteComplete(room, null)) finishVote(room, ctx);
      }
    }
  }
  room.version++; return store;
}
return { RULES, DECKS, MODES, GameError, blankStore, deckBank, deckSummary, normalizeCode, applyCommand, projectView, membership, scoreRound, scoreVoteRound, availableQuestions, publicQuestion, storyGuide };

});


