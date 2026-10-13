/* Life Story is an isolated server-authoritative Dixit mode.
 * Captured seeds make Firebase CAS retries deterministic. No story text is stored. */
(function(root,factory){ if(typeof module==='object'&&module.exports)module.exports=factory();else root.LIFE_STORY_ENGINE=factory(); })(typeof globalThis!=='undefined'?globalThis:this,function(){
const exports={};
let randomState=1;
function seedValue(value){let hash=2166136261;for(const ch of String(value))hash=Math.imul(hash^ch.charCodeAt(0),16777619);return(hash>>>0)||1;}
function randomInt(max){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return Math.floor((randomState>>>0)/4294967296*max);}
function randomUUID(){return Array.from({length:4},()=>randomInt(0x100000000).toString(16).padStart(8,'0')).join('');}
const DEFAULT_MODE_CONFIG={mode:'life_story',minPlayers:3,maxPlayers:8,handSize:8,mulliganMaxCards:2,mulliganTimesPerTurn:1,sharingPoints:2,correctGuessPoints:2,attractedVotePoints:1,questionCooldown:6,cardPackId:'dixit_original'};
const CARD_PACKS=[{id:'dixit_original',name:{'zh-TW':'說書人原創圖卡（126張）',en:'Original Dixit picture pack (126)'},cardIds:Array.from({length:126},(_,i)=>'d'+String(i+1).padStart(3,'0')),artNote:{'zh-TW':'沿用 Hub 原創圖片',en:'Existing original Hub artwork'}},{id:'dixit_base84',name:{'zh-TW':'原創基本圖卡（84張）',en:'Original base pack (84)'},cardIds:Array.from({length:84},(_,i)=>'d'+String(i+1).padStart(3,'0')),artNote:{'zh-TW':'沿用 Hub 原創圖片',en:'Existing original Hub artwork'}}];
function validateConfig(config){for(const key of ['minPlayers','maxPlayers','handSize','mulliganMaxCards','mulliganTimesPerTurn','sharingPoints','correctGuessPoints','attractedVotePoints','questionCooldown'])if(!Number.isSafeInteger(config[key])||config[key]<0)throw new Error('invalid_config');if(config.mode!=='life_story'||config.minPlayers<3||config.maxPlayers<config.minPlayers||config.maxPlayers>8||config.handSize<2||config.handSize>24||config.mulliganMaxCards>config.handSize)throw new Error('invalid_config');}
function questionModule(){if(typeof require!=='function')throw new Error('server_required');return require('./life-story-questions.cjs');}
const emptyHistory=()=>({selections:0,displayed:[],selected:[],replaced:[]});
const selectQuestions=(...args)=>questionModule().selectQuestions(...args),markSelected=(...args)=>questionModule().markSelected(...args),markReplaced=(...args)=>questionModule().markReplaced(...args);
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.addPlayer = addPlayer;
exports.setConnected = setConnected;
exports.execute = execute;
exports.snapshot = snapshot;
exports.assertCardInvariant = assertCardInvariant;




class GameError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function requireThat(condition, code, message) {
    if (!condition)
        throw new GameError(code, message);
}
function shuffle(values) {
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (0, randomInt)(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function pack(room) {
    const found = CARD_PACKS.find(item => item.id === room.config.cardPackId);
    requireThat(found, 'INVALID_PACK', '找不到這個卡牌包。');
    return found;
}
function player(room, playerId) {
    const found = room.players.find(item => item.id === playerId);
    requireThat(found, 'UNKNOWN_PLAYER', '找不到玩家，請重新加入房間。');
    return found;
}
function nameFor(name) {
    requireThat(typeof name === 'string', 'INVALID_NAME', '請輸入暱稱。');
    const clean = name.trim().slice(0,32);
    requireThat(clean.length > 0 && clean.length <= 32 && ![...clean].some(character => character.charCodeAt(0) < 32), 'INVALID_NAME', '暱稱需為 1 至 32 個字。');
    return clean;
}
function record(room, type, playerId) {
    room.events.push({ at: new Date(room.clock || 0).toISOString(), type, playerId, turnId: room.turn?.id });
    room.events = room.events.slice(-200);
}
function draw(room, count) {
    requireThat(room.deck.length + room.discard.length >= count, 'DECK_SHORTAGE', '可用牌庫不足，請更換卡牌包或減少人數。');
    const cards = [];
    while (cards.length < count) {
        if (!room.deck.length) {
            room.deck = shuffle(room.discard);
            room.discard = [];
        }
        cards.push(room.deck.pop());
    }
    return cards;
}
function activeParticipants(turn) {
    return turn.participants.filter(id => !turn.excused.includes(id));
}
function connectedPlayers(room) { return room.players.filter(item => item.connected); }
function requireHost(room, id) {
    requireThat(room.hostId === id, 'HOST_ONLY', '只有主持人能執行這個操作。');
}
function requirePhase(room, phases) {
    requireThat(phases.includes(room.phase), 'WRONG_PHASE', '目前階段不能執行這個操作。');
}
function currentTurn(room) {
    requireThat(room.turn && !room.turn.cancelled, 'NO_TURN', '目前沒有可操作的回合。');
    return room.turn;
}
function requireStoryteller(room, id) {
    const turn = currentTurn(room);
    requireThat(turn.storytellerId === id, 'STORYTELLER_ONLY', '只有本回合說書人能執行這個操作。');
    return turn;
}
function requireParticipant(turn, id) {
    requireThat(activeParticipants(turn).includes(id), 'NOT_PARTICIPANT', '你將從下一回合開始參與出牌。');
}
function makeCycle(room) {
    const seats = connectedPlayers(room).map(item => item.id);
    requireThat(seats.length >= room.config.minPlayers, 'MIN_PLAYERS', '至少需要三位在線玩家。');
    room.cycle = {
        id: (0, randomUUID)(), number: (room.cycle?.number ?? 0) + 1, seats,
        opportunities: Object.fromEntries(seats.map(id => [id, 'pending'])),
    };
}
function isCycleComplete(room) {
    return !!room.cycle && room.cycle.seats.every(id => !['pending', 'in_progress'].includes(room.cycle.opportunities[id]));
}
function openFollowUp(room) {
    if (isCycleComplete(room) && connectedPlayers(room).length >= room.config.minPlayers)
        makeCycle(room);
    room.phase = 'FOLLOW_UP';
}
function beginTurn(room, storytellerId, source) {
    const members = connectedPlayers(room);
    requireThat(members.length >= room.config.minPlayers, 'MIN_PLAYERS', '至少需要三位在線玩家才能開始下一回合。');
    requireThat(room.cycle?.opportunities[storytellerId] === 'pending', 'INELIGIBLE', '本輪已分享、已略過或尚未取得說書人資格。');
    requireThat(player(room, storytellerId).connected, 'PLAYER_OFFLINE', '這位玩家目前離線。');
    requireThat(members.every(item => item.hand.length === room.config.handSize), 'HAND_INCOMPLETE', '手牌不足，無法開始回合。');
    const selected = source === 'normal' ? (0, selectQuestions)(room.questionHistory, room.config.questionCooldown, () => randomInt(0x100000000) / 0x100000000) : { questions: [], reused: false };
    room.turnNumber++;
    room.turn = {
        id: (0, randomUUID)(), number: room.turnNumber, storytellerId, source,
        participants: members.map(item => item.id), excused: [], submissions: {}, storyCard: null,
        question: null, questionChosen: source === 'follow_up', candidates: selected.questions,
        questionReuse: selected.reused, storyComplete: false, table: [], votes: {}, abstained: [],
        mulligans: {}, settled: false, cancelled: false, deltas: {},
    };
    room.cycle.opportunities[storytellerId] = 'in_progress';
    room.cycleComplete = false;
    room.phase = 'PREPARE';
    record(room, source === 'normal' ? 'turn_started' : 'follow_up_claimed', storytellerId);
}
function lockIfReady(room) {
    const turn = currentTurn(room);
    const ids = activeParticipants(turn);
    if (!turn.storyComplete || !ids.every(id => !!turn.submissions[id]))
        return;
    requireThat(ids.length >= room.config.minPlayers, 'MIN_PLAYERS', '參與人數不足，請取消回合。');
    requireThat(!turn.table.length, 'ALREADY_LOCKED', '本回合卡牌已鎖定。');
    const contributions = ids.map(id => {
        const cardId = turn.submissions[id];
        const owner = player(room, id);
        requireThat(owner.hand.includes(cardId), 'CARD_NOT_OWNED', '提交牌不在玩家手中。');
        return { token: (0, randomUUID)(), cardId, ownerId: id };
    });
    for (const contribution of contributions) {
        const owner = player(room, contribution.ownerId);
        owner.hand = owner.hand.filter(id => id !== contribution.cardId);
    }
    turn.table = shuffle(contributions);
    room.phase = 'VOTING';
    record(room, 'cards_locked');
}
function settleIfReady(room) {
    const turn = currentTurn(room);
    if (room.phase !== 'VOTING' || turn.settled)
        return;
    const voters = activeParticipants(turn).filter(id => id !== turn.storytellerId);
    if (!voters.every(id => turn.votes[id] || turn.abstained.includes(id)))
        return;
    requireThat(activeParticipants(turn).length >= room.config.minPlayers, 'MIN_PLAYERS', '參與人數不足，請取消回合。');
    const answer = turn.table.find(item => item.ownerId === turn.storytellerId);
    const deltas = Object.fromEntries(turn.participants.map(id => [id, 0]));
    deltas[turn.storytellerId] += room.config.sharingPoints;
    for (const [voterId, token] of Object.entries(turn.votes)) {
        const card = turn.table.find(item => item.token === token);
        if (token === answer.token)
            deltas[voterId] += room.config.correctGuessPoints;
        else
            deltas[card.ownerId] += room.config.attractedVotePoints;
    }
    for (const [id, delta] of Object.entries(deltas))
        player(room, id).score += delta;
    room.discard.push(...turn.table.map(item => item.cardId));
    turn.settled = true;
    for (const member of room.players)
        member.hand.push(...draw(room, room.config.handSize - member.hand.length));
    turn.deltas = deltas;
    room.cycle.opportunities[turn.storytellerId] = 'shared';
    room.cycleComplete = isCycleComplete(room);
    room.previousQuestion = turn.question;
    room.phase = 'REVEAL_DISCUSS';
    record(room, 'turn_settled', turn.storytellerId);
}
function cancelTurn(room) {
    const turn = currentTurn(room);
    requireThat(!turn.settled, 'ALREADY_SETTLED', '已揭曉計分的回合不能取消。');
    for (const card of turn.table)
        player(room, card.ownerId).hand.push(card.cardId);
    if (room.cycle?.opportunities[turn.storytellerId] === 'in_progress')
        room.cycle.opportunities[turn.storytellerId] = 'pending';
    turn.table = [];
    turn.submissions = {};
    turn.storyCard = null;
    turn.votes = {};
    turn.abstained = [];
    turn.cancelled = true;
    turn.deltas = {};
    room.cycleComplete = isCycleComplete(room);
    openFollowUp(room);
    record(room, 'turn_cancelled', turn.storytellerId);
}
function createRoom(code, name, config = {}) {
    const merged = { ...DEFAULT_MODE_CONFIG, ...config };
    (0, validateConfig)(merged);
    const id = (0, randomUUID)();
    const room = {
        code, gameId: (0, randomUUID)(), version: 0, hostId: id, locale: 'zh-TW', config: merged,
        players: [{ id, name: nameFor(name), connected: true, score: 0, hand: [] }],
        phase: 'LOBBY', cycle: null, turn: null, turnNumber: 0, previousQuestion: null,
        cycleComplete: false, questionHistory: (0, emptyHistory)(), deck: [], discard: [],
        processedRequests: {}, events: [],
    };
    room.deck = shuffle(pack(room).cardIds);
    assertCardInvariant(room);
    return { room, playerId: id };
}
function addPlayer(room, name) {
    const clean = nameFor(name);
    requireThat(room.players.length < room.config.maxPlayers, 'ROOM_FULL', '房間已滿。');
    requireThat((room.players.length + 1) * room.config.handSize <= pack(room).cardIds.length, 'DECK_SHORTAGE', '卡牌包不足以供這些玩家使用。');
    const hand = room.phase === 'LOBBY' ? [] : draw(room, room.config.handSize);
    const id = (0, randomUUID)();
    room.players.push({ id, name: clean, connected: true, score: 0, hand });
    if (!player(room, room.hostId).connected)
        room.hostId = id;
    room.version++;
    record(room, 'player_joined', id);
    assertCardInvariant(room);
    return id;
}
function setConnected(room, playerId, connected) {
    const member = player(room, playerId);
    if (member.connected === connected)
        return;
    member.connected = connected;
    if (!player(room, room.hostId).connected)
        room.hostId = room.players.find(item => item.connected)?.id ?? room.hostId;
    room.version++;
    record(room, connected ? 'player_reconnected' : 'player_disconnected', playerId);
}
function applyCommand(room, actorId, command) {
    const payload = command.payload ?? {};
    const actor = player(room, actorId);
    const stringValue = (key) => {
        requireThat(typeof payload[key] === 'string', 'INVALID_PAYLOAD', '操作資料不完整。');
        return payload[key];
    };
    switch (command.type) {
        case 'configure': {
            requireHost(room, actorId);
            requirePhase(room, ['LOBBY']);
            if (payload.locale !== undefined) {
                requireThat(payload.locale === 'zh-TW' || payload.locale === 'en', 'INVALID_LOCALE', '不支援此語言。');
                room.locale = payload.locale;
            }
            if (payload.cardPackId !== undefined) {
                room.config.cardPackId = stringValue('cardPackId');
                requireThat(pack(room).cardIds.length >= room.players.length * room.config.handSize, 'DECK_SHORTAGE', '此卡牌包不足以供目前玩家使用。');
                room.deck = shuffle(pack(room).cardIds);
                room.discard = [];
            }
            break;
        }
        case 'start_game': {
            requireHost(room, actorId);
            requirePhase(room, ['LOBBY']);
            requireThat(connectedPlayers(room).length >= room.config.minPlayers, 'MIN_PLAYERS', '至少需要三位在線玩家。');
            requireThat(pack(room).cardIds.length >= room.players.length * room.config.handSize, 'DECK_SHORTAGE', '牌庫不足，請更換卡牌包。');
            
            room.turnNumber = 0;
            room.cycle = null;
            room.turn = null;
            room.previousQuestion = null;
            room.discard = [];
            room.deck = shuffle(pack(room).cardIds);
            for (const member of room.players) {
                member.score = 0;
                member.hand = draw(room, room.config.handSize);
            }
            makeCycle(room);
            beginTurn(room, room.cycle.seats[0], 'normal');
            break;
        }
        case 'end_game': {
            requireHost(room, actorId);
            requireThat(room.phase !== 'LOBBY', 'WRONG_PHASE', '遊戲尚未開始。');
            room.phase = 'LOBBY';
            
            room.turn = null;
            room.cycle = null;
            room.turnNumber = 0;
            room.previousQuestion = null;
            room.cycleComplete = false;
            room.deck = shuffle(pack(room).cardIds);
            room.discard = [];
            for (const member of room.players)
                member.hand = [];
            record(room, 'game_ended', actorId);
            break;
        }
        case 'choose_question': {
            requirePhase(room, ['PREPARE']);
            const turn = requireStoryteller(room, actorId);
            requireThat(turn.source === 'normal', 'FOLLOW_UP_NO_QUESTION', '接棒回合不重新抽題。');
            const question = turn.candidates.find(item => item.id === stringValue('questionId'));
            requireThat(question, 'INVALID_QUESTION', '請從目前的候選題目選擇。');
            turn.question = question;
            turn.questionChosen = true;
            (0, markSelected)(room.questionHistory, question);
            break;
        }
        case 'free_share': {
            requirePhase(room, ['PREPARE']);
            const turn = requireStoryteller(room, actorId);
            turn.question = null;
            turn.questionChosen = true;
            break;
        }
        case 'refresh_questions': {
            requirePhase(room, ['PREPARE']);
            const turn = requireStoryteller(room, actorId);
            requireThat(turn.source === 'normal', 'FOLLOW_UP_NO_QUESTION', '接棒回合不重新抽題。');
            (0, markReplaced)(room.questionHistory, turn.candidates);
            const next = (0, selectQuestions)(room.questionHistory, room.config.questionCooldown, () => randomInt(0x100000000) / 0x100000000);
            turn.candidates = next.questions;
            turn.questionReuse = next.reused;
            turn.question = null;
            turn.questionChosen = false;
            break;
        }
        case 'choose_story_card': {
            requirePhase(room, ['PREPARE']);
            const turn = requireStoryteller(room, actorId);
            const cardId = stringValue('cardId');
            requireThat(actor.hand.includes(cardId), 'CARD_NOT_OWNED', '只能選擇自己的手牌。');
            turn.storyCard = cardId;
            break;
        }
        case 'start_story': {
            requirePhase(room, ['PREPARE']);
            const turn = requireStoryteller(room, actorId);
            requireThat(turn.questionChosen, 'QUESTION_REQUIRED', '請選一題或選擇自由分享。');
            requireThat(turn.storyCard && actor.hand.includes(turn.storyCard), 'CARD_REQUIRED', '請先秘密選擇一張自己的牌。');
            turn.submissions[actorId] = turn.storyCard;
            room.phase = 'STORYTELLING';
            break;
        }
        case 'submit_card': {
            requirePhase(room, ['STORYTELLING', 'COLLECTING']);
            const turn = currentTurn(room);
            requireParticipant(turn, actorId);
            requireThat(actorId !== turn.storytellerId, 'STORY_CARD_LOCKED', '說書人的牌已鎖定。');
            requireThat(!turn.submissions[actorId], 'WITHDRAW_REQUIRED', '請先撤回目前的牌再改選。');
            const cardId = stringValue('cardId');
            requireThat(actor.hand.includes(cardId), 'CARD_NOT_OWNED', '只能提交自己的手牌。');
            turn.submissions[actorId] = cardId;
            lockIfReady(room);
            break;
        }
        case 'withdraw_submission': {
            requirePhase(room, ['STORYTELLING', 'COLLECTING']);
            const turn = currentTurn(room);
            requireParticipant(turn, actorId);
            requireThat(actorId !== turn.storytellerId, 'STORY_CARD_LOCKED', '說書人的牌已鎖定。');
            requireThat(turn.submissions[actorId], 'NO_SUBMISSION', '你尚未提交卡牌。');
            delete turn.submissions[actorId];
            break;
        }
        case 'mulligan': {
            requirePhase(room, ['PREPARE', 'STORYTELLING', 'COLLECTING']);
            const turn = currentTurn(room);
            requireParticipant(turn, actorId);
            requireThat(!turn.submissions[actorId], 'WITHDRAW_REQUIRED', '請先撤回已提交的牌。');
            requireThat((turn.mulligans[actorId] ?? 0) < room.config.mulliganTimesPerTurn, 'MULLIGAN_LIMIT', '本回合換牌次數已用完。');
            requireThat(Array.isArray(payload.cardIds) && payload.cardIds.every(id => typeof id === 'string'), 'INVALID_PAYLOAD', '請選擇要換的手牌。');
            const ids = payload.cardIds;
            requireThat(ids.length > 0 && ids.length <= room.config.mulliganMaxCards && new Set(ids).size === ids.length, 'MULLIGAN_LIMIT', '換牌數量超過限制或重複。');
            requireThat(ids.every(id => actor.hand.includes(id)), 'CARD_NOT_OWNED', '只能更換自己的手牌。');
            const replacements = draw(room, ids.length);
            actor.hand = [...actor.hand.filter(id => !ids.includes(id)), ...replacements];
            room.discard.push(...ids);
            if (turn.storyCard && ids.includes(turn.storyCard) && turn.storytellerId === actorId)
                turn.storyCard = null;
            turn.mulligans[actorId] = (turn.mulligans[actorId] ?? 0) + 1;
            break;
        }
        case 'finish_story': {
            requirePhase(room, ['STORYTELLING']);
            const turn = currentTurn(room);
            requireThat(actorId === turn.storytellerId || actorId === room.hostId, 'STORYTELLER_ONLY', '由說書人或主持人結束故事。');
            turn.storyComplete = true;
            room.phase = 'COLLECTING';
            lockIfReady(room);
            break;
        }
        case 'cast_vote': {
            requirePhase(room, ['VOTING']);
            const turn = currentTurn(room);
            requireParticipant(turn, actorId);
            requireThat(actorId !== turn.storytellerId, 'STORYTELLER_CANNOT_VOTE', '說書人不投票。');
            requireThat(!turn.votes[actorId] && !turn.abstained.includes(actorId), 'ALREADY_VOTED', '你已確認選票或棄權。');
            const token = stringValue('token');
            const card = turn.table.find(item => item.token === token);
            requireThat(card, 'INVALID_VOTE', '這張桌牌已失效。');
            requireThat(card.ownerId !== actorId, 'SELF_VOTE', '不能投自己的牌。');
            turn.votes[actorId] = token;
            settleIfReady(room);
            break;
        }
        case 'abstain_vote': {
            requireHost(room, actorId);
            requirePhase(room, ['VOTING']);
            const turn = currentTurn(room);
            const id = stringValue('playerId');
            requireParticipant(turn, id);
            requireThat(id !== turn.storytellerId, 'INVALID_VOTE', '說書人沒有選票。');
            requireThat(!turn.votes[id] && !turn.abstained.includes(id), 'ALREADY_VOTED', '這位玩家已完成投票。');
            turn.abstained.push(id);
            record(room, 'vote_abstained', id);
            settleIfReady(room);
            break;
        }
        case 'finish_discussion': {
            requireHost(room, actorId);
            requirePhase(room, ['REVEAL_DISCUSS']);
            openFollowUp(room);
            record(room, 'discussion_finished', actorId);
            break;
        }
        case 'claim_follow_up': {
            requirePhase(room, ['FOLLOW_UP']);
            requireThat(room.turn?.settled, 'NO_COMPLETED_STORY', '取消或略過的回合由主持人依序安排下一位。');
            requireThat(actor.connected, 'PLAYER_OFFLINE', '請先重新連線。');
            if (isCycleComplete(room))
                makeCycle(room);
            beginTurn(room, actorId, 'follow_up');
            break;
        }
        case 'next_in_order': {
            requireHost(room, actorId);
            requirePhase(room, ['FOLLOW_UP']);
            if (isCycleComplete(room))
                makeCycle(room);
            const next = room.cycle?.seats.find(id => room.cycle.opportunities[id] === 'pending');
            requireThat(next, 'NO_ELIGIBLE_PLAYER', '目前沒有待分享玩家。');
            beginTurn(room, next, 'normal');
            break;
        }
        case 'pass_opportunity': {
            requirePhase(room, ['PREPARE', 'FOLLOW_UP']);
            requireThat(room.phase === 'FOLLOW_UP' || room.turn?.storytellerId === actorId, 'STORYTELLER_ONLY', '只有目前說書人能在準備階段略過。');
            const status = room.cycle?.opportunities[actorId];
            requireThat(status === 'pending' || (room.phase === 'PREPARE' && status === 'in_progress' && room.turn?.storytellerId === actorId), 'INELIGIBLE', '目前沒有可略過的本輪機會。');
            room.cycle.opportunities[actorId] = 'passed';
            record(room, 'opportunity_passed', actorId);
            if (room.phase === 'PREPARE')
                cancelTurn(room);
            else {
                room.cycleComplete = isCycleComplete(room);
                openFollowUp(room);
            }
            break;
        }
        case 'cancel_turn': {
            requireHost(room, actorId);
            requirePhase(room, ['PREPARE', 'STORYTELLING', 'COLLECTING', 'VOTING']);
            cancelTurn(room);
            break;
        }
        case 'excuse_player': {
            requireHost(room, actorId);
            requireThat(room.phase !== 'LOBBY', 'WRONG_PHASE', '遊戲尚未開始。');
            const id = stringValue('playerId');
            const member = player(room, id);
            requireThat(!member.connected, 'PLAYER_CONNECTED', '只能明確排除離線玩家。');
            requireThat(room.cycle?.opportunities[id] !== 'excused', 'ALREADY_EXCUSED', '這位玩家已暫離本輪。');
            if (room.cycle?.opportunities[id] === 'pending' || room.cycle?.opportunities[id] === 'in_progress')
                room.cycle.opportunities[id] = 'excused';
            const turn = room.turn;
            if (turn && !turn.cancelled && !turn.settled && turn.participants.includes(id) && !turn.excused.includes(id)) {
                turn.excused.push(id);
                if (id === turn.storytellerId || activeParticipants(turn).length < room.config.minPlayers)
                    cancelTurn(room);
                else if (room.phase === 'VOTING')
                    settleIfReady(room);
                else if (room.phase === 'COLLECTING') {
                    delete turn.submissions[id];
                    lockIfReady(room);
                }
                else
                    delete turn.submissions[id];
            }
            room.cycleComplete = isCycleComplete(room);
            if (room.phase === 'FOLLOW_UP')
                openFollowUp(room);
            record(room, 'player_excused', id);
            break;
        }
        case 'transfer_host': {
            requireHost(room, actorId);
            const id = stringValue('playerId');
            requireThat(player(room, id).connected, 'PLAYER_OFFLINE', '不能轉交給離線玩家。');
            room.hostId = id;
            record(room, 'host_transferred', id);
            break;
        }
        case 'clear_question_history': {
            requireHost(room, actorId);
            requirePhase(room, ['LOBBY']);
            room.questionHistory = (0, emptyHistory)();
            record(room, 'question_history_cleared', actorId);
            break;
        }
        default: throw new GameError('UNKNOWN_COMMAND', '未知操作。');
    }
}
/** A synchronous compare-and-set transaction. Failed operations cannot partially mutate the room. */
function execute(room, playerId, command) {
    try {
        requireThat(command && typeof command.requestId === 'string' && command.requestId.length > 0 && command.requestId.length <= 128, 'INVALID_REQUEST', '請求編號無效。');
        player(room, playerId);
        const key = `${playerId}:${command.requestId}`;
        const fingerprint = JSON.stringify(command);
        const previous = room.processedRequests[key];
        if (previous) {
            requireThat(previous.fingerprint === fingerprint, 'REQUEST_ID_REUSED', '相同請求編號不能用於不同操作。');
            return { ...previous.result };
        }
        requireThat(command.gameId === room.gameId && command.turnId === (room.turn?.id ?? null) && command.cycleId === (room.cycle?.id ?? null), 'STALE_CONTEXT', '遊戲已進入新的回合，請使用最新房間狀態。');
        requireThat(Number.isSafeInteger(command.version) && command.version === room.version, 'STALE_VERSION', '房間已更新，請查看最新狀態後再操作。');
        requireThat(player(room, playerId).connected || command.serverControl === true, 'PLAYER_OFFLINE', '請先重新連線。');
        const draft = structuredClone(room);
        applyCommand(draft, playerId, command);
        assertCardInvariant(draft);
        draft.version++;
        const result = { ok: true };
        draft.processedRequests[key] = { fingerprint, result };
        const keys = Object.keys(draft.processedRequests);
        if (keys.length > 2048)
            for (const old of keys.slice(0, keys.length - 2048))
                delete draft.processedRequests[old];
        Object.assign(room, draft);
        return result;
    }
    catch (error) {
        return error instanceof GameError
            ? { ok: false, code: error.code, error: error.message }
            : { ok: false, code: 'INTERNAL_ERROR', error: '房間操作失敗，請稍後重試。' };
    }
}
/** Projection deliberately lists public fields; never serialize Room to a client. */
function snapshot(room, playerId) {
    const me = player(room, playerId);
    const turn = room.turn;
    const reveal = turn?.settled === true;
    const eligibleFollowUp = room.phase === 'FOLLOW_UP' && !!turn?.settled && me.connected
        && room.cycle?.opportunities[playerId] === 'pending' && connectedPlayers(room).length >= room.config.minPlayers;
    return structuredClone({
        roomCode: room.code, mode: 'life_story', gameId: room.gameId, version: room.version,
        phase: room.phase, hostId: room.hostId, locale: room.locale, config: room.config, packs: CARD_PACKS,
        players: room.players.map(member => ({
            id: member.id, name: member.name, connected: member.connected, score: member.score,
            opportunity: room.cycle?.opportunities[member.id] ?? 'next_cycle', handCount: member.hand.length,
            submitted: !!turn?.submissions[member.id], voted: !!turn?.votes[member.id] || !!turn?.abstained.includes(member.id),
            active: !turn || (turn.participants.includes(member.id) && !turn.excused.includes(member.id)),
        })),
        cycleId: room.cycle?.id ?? null, cycleNumber: room.cycle?.number ?? 0,
        turnId: turn?.id ?? null, turnNumber: room.turnNumber, storytellerId: turn?.storytellerId ?? null,
        source: turn?.source ?? null, participants: turn ? activeParticipants(turn) : [],
        question: turn?.question ?? null, questionChosen: turn?.questionChosen ?? false, previousQuestion: room.previousQuestion,
        storyComplete: turn?.storyComplete ?? false, turnCancelled: turn?.cancelled ?? false,
        table: turn?.table.map(card => reveal ? {
            token: card.token, cardId: card.cardId, ownerId: card.ownerId, isAnswer: card.ownerId === turn.storytellerId,
            voterIds: Object.entries(turn.votes).filter(([, token]) => token === card.token).map(([id]) => id),
        } : { token: card.token, cardId: card.cardId }) ?? [],
        deltas: reveal ? turn.deltas : {}, cycleComplete: room.cycleComplete,
        questionReuse: turn?.questionReuse ?? false, historyCount: room.questionHistory.displayed.length,
        me: {
            id: playerId, hand: me.hand, submission: turn?.submissions[playerId] ?? null,
            storyCard: turn?.storytellerId === playerId ? turn.storyCard : null,
            vote: turn?.votes[playerId] ?? null,
            ownTableToken: turn?.table.find(card => card.ownerId === playerId)?.token ?? null,
            candidates: room.phase === 'PREPARE' && turn?.storytellerId === playerId ? turn.candidates : [],
            mulligansUsed: turn?.mulligans[playerId] ?? 0, eligibleFollowUp: !!eligibleFollowUp,
        },
    });
}
/** Settled table cards are historical display records, no longer physical cards on the table. */
function assertCardInvariant(room) {
    const expected = pack(room).cardIds;
    requireThat(new Set(expected).size === expected.length, 'CARD_INVARIANT', '卡牌包含有重複編號。');
    const physical = [...room.deck, ...room.discard, ...room.players.flatMap(item => item.hand),
        ...(room.turn && !room.turn.settled && !room.turn.cancelled ? room.turn.table.map(item => item.cardId) : [])];
    requireThat(new Set(physical).size === physical.length && physical.length === expected.length
        && physical.every(id => expected.includes(id)), 'CARD_INVARIANT', '卡牌狀態不一致。');
}

/* Hub adapter below. */
const list=value=>Array.isArray(value)?value.filter(x=>x!=null):Object.keys(value||{}).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]).filter(x=>x!=null);
const copy=value=>JSON.parse(JSON.stringify(value));
const HOST_COMMANDS=new Set(['configure','deal','start_game','end_game','finish_discussion','next_in_order','cancel','cancel_turn','excuse_player','abstain_vote','transfer_host','clear_question_history','restart','pause','resume','recover','finish_story']);
function restore(current){
  const state=copy(current),room=state.lifeRoom;
  if(!room)throw new Error('server_required');
  room.players=list(room.players);room.events=list(room.events);room.deck=list(room.deck);room.discard=list(room.discard);
  room.config={...DEFAULT_MODE_CONFIG,...room.config};room.processedRequests=room.processedRequests||{};
  room.questionHistory={...emptyHistory(),...room.questionHistory};
  for(const key of ['displayed','selected','replaced'])room.questionHistory[key]=list(room.questionHistory[key]);
  for(const p of room.players)p.hand=list(p.hand);
  if(room.cycle){room.cycle.seats=list(room.cycle.seats);room.cycle.opportunities=room.cycle.opportunities||{};}
  if(room.turn){for(const key of ['participants','excused','candidates','table','abstained'])room.turn[key]=list(room.turn[key]);for(const key of ['submissions','votes','mulligans','deltas'])room.turn[key]=room.turn[key]||{};}
  state.seen=state.seen||{};state.replies=state.replies||{};
  return state;
}
function exportState(state,room){
  return {...state,mode:'life_story',version:1,artworkVersion:2,deckVersion:room.config.cardPackId==='dixit_original'?3:2,cardCount:pack(room).cardIds.length,
    lifeRoom:room,sessionId:room.gameId,turnId:room.turn?.id||0,cycleId:room.cycle?.id||0,lifeRevision:room.version,
    roster:room.players.map(p=>({playerNum:Number(p.id),name:p.name,active:p.memberActive!==false,pending:room.phase!=='LOBBY'&&!room.cycle?.seats.includes(p.id)})),
    hands:Object.fromEntries(room.players.map(p=>[p.id,p.hand])),scores:Object.fromEntries(room.players.map(p=>[p.id,p.score])),
    phase:room.phase,storyteller:room.turn?Number(room.turn.storytellerId):null,hostPlayerNum:Number(room.hostId),round:room.turnNumber,
    paused:state.paused===true,revision:(Number(state.revision)||0),sharedControls:state.sharedControls===true};
}
function create(options={}){
  const roster=list(options.roster);
  if(!options.id||roster.length<3||roster.length>8||new Set(roster.map(p=>p.playerNum)).size!==roster.length||roster.some(p=>!Number.isInteger(p.playerNum)||p.playerNum<1))throw new Error('invalid_setup');
  randomState=seedValue(options.seed||options.id);
  const {room}=createRoom(String(options.id),String(roster[0].name||'Player'),{...options.config,cardPackId:options.cardPackId||options.config?.cardPackId||'dixit_original'});
  room.code=String(options.id);room.gameId=String(options.id);room.clock=Number(options.now)||0;
  room.players=roster.map(p=>({id:String(p.playerNum),name:String(p.name||'Player').slice(0,80),connected:p.active!==false,memberActive:p.active!==false,score:0,hand:[]}));
  room.hostId=String(roster.some(p=>p.playerNum===Number(options.hostPlayerNum))?options.hostPlayerNum:roster[0].playerNum);
  room.locale=options.locale==='en'?'en':'zh-TW';room.rngState=randomState>>>0;
  return exportState({seen:{},replies:{},readiness:{},paused:false,sharedControls:options.sharedControls===true,createdAt:room.clock},room);
}
function refreshPresence(state,onlineNums,now){
  if(onlineNums==null)return;
  const room=state.lifeRoom,online=new Set(list(onlineNums).map(Number));
  room.clock=Number(now)||room.clock||0;
  for(const p of room.players)setConnected(room,p.id,p.memberActive!==false&&online.has(Number(p.id)));
  if(!room.players.find(p=>p.id===room.hostId)?.connected){const successor=room.players.find(p=>p.connected);if(successor&&successor.id!==room.hostId){room.hostId=successor.id;room.version++;record(room,'host_transferred',successor.id);}}
}
function receipt(state,actor,id,error){
  state.seen[actor]=[...list(state.seen[actor]),id];
  state.replies[actor]={id,error:error||''};
  state.revision=(Number(state.revision)||0)+1;
  return exportState(state,state.lifeRoom);
}
function apply(current,input){
  if(!current||!input||typeof input.id!=='string'||!input.id||input.id.length>100)return current;
  if(input.serverAuthority!==true)throw new Error('server_required');
  const state=restore(current),room=state.lifeRoom,actor=Number(input.actor);
  if(!Number.isInteger(actor)||(actor!==0&&!room.players.some(p=>Number(p.id)===actor)))return current;
  if(list(state.seen[actor]).includes(input.id))return current;
  if(input.sessionId!==state.sessionId)return receipt(state,actor,input.id,'stale_session');
  if(input.turnId!==state.turnId)return receipt(state,actor,input.id,'stale_turn');
  if(input.cycleId!==(state.cycleId??0))return receipt(state,actor,input.id,'stale_cycle');
  if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==room.version)return receipt(state,actor,input.id,'stale_revision');
  if(actor===0&&!HOST_COMMANDS.has(input.type))return receipt(state,actor,input.id,'not_eligible');
  let actorId=actor===0?room.hostId:String(actor);const isHost=actor===0||actorId===room.hostId;
  randomState=seedValue(String(room.rngState)+':'+String(input.seed)+':'+input.id);room.clock=Number(input.now)||0;
  if(input.type==='restart'){
    if(!isHost)return receipt(state,actor,input.id,'host_only');
    const fresh=create({id:state.sessionId+':restart:'+input.id,roster:state.roster,seed:input.seed,now:input.now,hostPlayerNum:state.hostPlayerNum,config:room.config,locale:room.locale,sharedControls:state.sharedControls});
    fresh.lifeRoom.questionHistory=copy(room.questionHistory);fresh.lifeRoom.version=room.version+1;
    fresh.lifeRevision=fresh.lifeRoom.version;fresh.replies[actor]={id:input.id,error:''};fresh.seen[actor]=[input.id];return fresh;
  }
  if(['pause','resume'].includes(input.type)){
    if(!isHost)return receipt(state,actor,input.id,'host_only');
    state.paused=input.type==='pause';room.version++;room.rngState=randomState>>>0;return receipt(state,actor,input.id,'');
  }
  if(state.paused&&!['cancel','cancel_turn','end_game'].includes(input.type))return receipt(state,actor,input.id,'paused');
  refreshPresence(state,input.onlineNums,input.now);
  if(actor===0)actorId=room.hostId;
  let type={deal:'start_game',cancel:'end_game'}[input.type]||input.type;
  // Retain only game controls in command receipts, never arbitrary story text or client metadata.
  const incoming={...input,...input.payload},payload={};
  for(const key of ['cardId','questionId','token','cardIds','locale','cardPackId'])if(incoming[key]!==undefined)payload[key]=incoming[key];
  if(incoming.playerNum!=null)payload.playerId=String(incoming.playerNum);
  else if(incoming.playerId!=null)payload.playerId=String(incoming.playerId);
  if(input.type==='ready'){
    if(actor===0||room.phase!=='LOBBY'||typeof input.value!=='boolean')return receipt(state,actor,input.id,'not_available');
    state.readiness[actor]=input.value;room.version++;return receipt(state,actor,input.id,'');
  }
  if(input.type==='recover'){
    if(!isHost)return receipt(state,actor,input.id,'host_only');
    const absent=room.turn?.participants.filter(id=>!player(room,id).connected&&!room.turn.excused.includes(id))||[];
    for(const id of absent){const result=execute(room,room.hostId,{serverControl:true,type:'excuse_player',payload:{playerId:id},requestId:actor+':'+input.id+':'+id,gameId:room.gameId,turnId:room.turn?.id||null,cycleId:room.cycle?.id||null,version:room.version});if(!result.ok)return receipt(state,actor,input.id,result.code.toLowerCase());}
    room.rngState=randomState>>>0;return receipt(state,actor,input.id,'');
  }
  const result=execute(room,actorId,{serverControl:actor===0,type,payload,requestId:actor+':'+input.id,gameId:room.gameId,turnId:room.turn?.id||null,cycleId:room.cycle?.id||null,version:room.version});
  room.rngState=randomState>>>0;
  return receipt(state,actor,input.id,result.ok?'':String(result.code||'not_available').toLowerCase());
}
function view(current,playerNum,now){
  const actor=Number(playerNum);
  if(current?.publicLifeView){if(actor!==0)throw new Error('server_required');return{game:'dixit',playerNum:0,name:null,dixit:copy(current.publicLifeView)};}
  const state=restore(current),room=state.lifeRoom,mine=room.players.find(p=>Number(p.id)===actor);
  const projected=snapshot(room,mine?.id||room.hostId),own=mine?projected.me:{hand:[],submission:null,storyCard:null,vote:null,ownTableToken:null,candidates:[],mulligansUsed:0,eligibleFollowUp:false};
  const host=actor===0||String(actor)===room.hostId;
  const dixit={version:1,mode:'life_story',artworkVersion:2,deckVersion:state.deckVersion,cardCount:state.cardCount,sessionId:state.sessionId,turnId:state.turnId,cycleId:state.cycleId,revision:state.revision,lifeRevision:room.version,
    playerNum:mine?actor:0,hostControls:host,hostPlayerNum:Number(room.hostId),phase:room.phase,paused:state.paused,round:room.turnNumber,cycleNumber:projected.cycleNumber,storyteller:projected.storytellerId==null?null:Number(projected.storytellerId),
    source:room.turn?.source||null,locale:room.locale,config:room.config,packs:CARD_PACKS,roster:projected.players.map(p=>({...p,playerNum:Number(p.id),id:undefined,pending:p.opportunity==='next_cycle',memberStatus:p.active?'active':'away',ready:state.readiness?.[p.id]===true})),
    participants:projected.participants.map(Number),roundPlayerNums:projected.participants.map(Number),question:projected.question,questionChosen:projected.questionChosen,previousQuestion:projected.previousQuestion,
    storyComplete:projected.storyComplete,turnCancelled:projected.turnCancelled,table:projected.table.map(card=>({token:card.token,cardId:card.cardId,...(card.ownerId?{ownerPlayerNum:Number(card.ownerId),isAnswer:card.isAnswer,voterNums:list(card.voterIds).map(Number)}:{})})),
    deltas:projected.deltas,cycleComplete:projected.cycleComplete,questionReuse:projected.questionReuse,historyCount:projected.historyCount,
    hand:own.hand,submission:own.submission,storyCard:own.storyCard,vote:own.vote,ownTableToken:own.ownTableToken,candidates:own.candidates,mulligansUsed:own.mulligansUsed,eligibleFollowUp:own.eligibleFollowUp,
    ownSubmitted:own.submission?[own.submission]:[],ownVote:own.vote,sharedControls:true,membership:{enabled:true,minPlayers:3,maxPlayers:8,activeCount:room.players.filter(p=>p.memberActive!==false).length,pendingCount:projected.players.filter(p=>p.opportunity==='next_cycle').length},
    actions:{},reply:state.replies?.[actor]||null};
  const telling=!!mine&&String(actor)===room.turn?.storytellerId,participant=!!mine&&projected.participants.includes(String(actor)),live=!state.paused,
    collecting=['STORYTELLING','COLLECTING'].includes(room.phase),preparing=room.phase==='PREPARE',pending=room.cycle?.opportunities[String(actor)]==='pending';
  dixit.actions={
    start_game:live&&host&&room.phase==='LOBBY',deal:live&&host&&room.phase==='LOBBY',configure:live&&host&&room.phase==='LOBBY',
    choose_question:live&&telling&&preparing&&room.turn.source==='normal',refresh_questions:live&&telling&&preparing&&room.turn.source==='normal',free_share:live&&telling&&preparing,
    choose_story_card:live&&telling&&preparing,start_story:live&&telling&&preparing,submit_card:live&&participant&&!telling&&collecting&&!own.submission,
    withdraw_submission:live&&participant&&!telling&&collecting&&!!own.submission,mulligan:live&&participant&&(preparing||collecting)&&!own.submission&&own.mulligansUsed<room.config.mulliganTimesPerTurn,
    finish_story:live&&(telling||host)&&room.phase==='STORYTELLING',cast_vote:live&&participant&&!telling&&room.phase==='VOTING'&&!own.vote&&!room.turn.abstained.includes(String(actor)),
    finish_discussion:live&&host&&room.phase==='REVEAL_DISCUSS',claim_follow_up:live&&own.eligibleFollowUp,next_in_order:live&&host&&room.phase==='FOLLOW_UP',
    pass_opportunity:live&&!!mine&&((preparing&&telling)||(room.phase==='FOLLOW_UP'&&pending)),cancel_turn:host&&['PREPARE','STORYTELLING','COLLECTING','VOTING'].includes(room.phase),
    end_game:host&&room.phase!=='LOBBY',cancel:host&&room.phase!=='LOBBY',restart:host,pause:host&&!state.paused,resume:host&&state.paused,recover:live&&host&&room.phase!=='LOBBY',
    excuse_player:host&&room.phase!=='LOBBY',abstain_vote:host&&room.phase==='VOTING',transfer_host:host,clear_question_history:host&&room.phase==='LOBBY',ready:live&&!!mine&&room.phase==='LOBBY'
  };
  return{game:'dixit',playerNum:mine?actor:0,name:mine?.name||null,dixit:copy(dixit)};
}
function pulse(current,ctx={}){
  if(ctx.serverAuthority!==true)throw new Error('server_required');
  const state=restore(current),before=JSON.stringify([state.lifeRoom.hostId,state.lifeRoom.players.map(p=>[p.id,p.connected])]);
  refreshPresence(state,ctx.onlineNums,ctx.now);
  return before===JSON.stringify([state.lifeRoom.hostId,state.lifeRoom.players.map(p=>[p.id,p.connected])])?current:exportState(state,state.lifeRoom);
}
function membership(current,changes={},ctx={}){
  if(ctx.serverAuthority!==true)throw new Error('server_required');
  const state=restore(current),room=state.lifeRoom,added=list(changes.added),roster=list(changes.roster),inactive=new Set(list(changes.inactiveNums).map(Number));
  randomState=seedValue(String(room.rngState)+':membership:'+String(ctx.seed)+':'+String(ctx.id));room.clock=Number(ctx.now)||0;
  if(room.players.length+added.length>8||new Set(added.map(p=>p.playerNum)).size!==added.length||added.some(p=>!Number.isInteger(p.playerNum)||p.playerNum<1||room.players.some(old=>Number(old.id)===p.playerNum)))throw new Error('invalid_roster');
  for(const row of added){const id=addPlayer(room,String(row.name||'Player'));player(room,id).id=String(row.playerNum);if(room.hostId===id)room.hostId=String(row.playerNum);}
  for(const p of room.players){const row=roster.find(item=>item.playerNum===Number(p.id));if(row)p.name=String(row.name||'Player').slice(0,80);p.memberActive=!inactive.has(Number(p.id));if(!p.memberActive){setConnected(room,p.id,false);if(room.cycle?.opportunities[p.id]==='pending'||room.cycle?.opportunities[p.id]==='in_progress')room.cycle.opportunities[p.id]='excused';}}
  if(room.turn&&!room.turn.settled&&!room.turn.cancelled){for(const p of room.players.filter(p=>p.memberActive===false&&room.turn.participants.includes(p.id))){if(!room.turn.excused.includes(p.id))room.turn.excused.push(p.id);if(!room.turn.table.length)delete room.turn.submissions[p.id];}if(inactive.has(Number(room.turn.storytellerId))||activeParticipants(room.turn).length<3)cancelTurn(room);else if(room.phase==='COLLECTING')lockIfReady(room);else if(room.phase==='VOTING')settleIfReady(room);}
  room.version++;room.rngState=randomState>>>0;assertCardInvariant(room);return exportState(state,room);
}
return {create,apply,view,membership,pulse,list,defaults:DEFAULT_MODE_CONFIG,packs:CARD_PACKS,assertCardInvariant:state=>assertCardInvariant(state.lifeRoom||state)};
});
