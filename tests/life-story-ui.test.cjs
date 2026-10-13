'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../dixit-engine.js');
const LIFE=require('../life-story-ui.js');
const UI=require('../dixit-ui.js');
let sequence=0;
const copy=value=>JSON.parse(JSON.stringify(value));
function game(count=4){return E.create({id:'life-ui-'+(++sequence),mode:'life_story',locale:'en',hostPlayerNum:1,roster:Array.from({length:count},(_,i)=>({playerNum:i+1,name:'Friend '+(i+1)})),seed:99,now:1000});}
function act(s,type,actor=1,extra={}){const next=E.apply(s,{id:'life-command-'+(++sequence),type,actor,sessionId:s.sessionId,turnId:s.turnId,cycleId:s.cycleId,expectedRevision:s.lifeRevision,seed:sequence,now:2000+sequence,onlineNums:s.roster.map(p=>p.playerNum),serverAuthority:true,...extra});assert.equal(next.replies[actor]?.error,'',type);return next;}
const prepare=()=>act(game(),'deal');
function story(){let s=prepare();s=act(s,'choose_question',1,{questionId:E.view(s,1).dixit.candidates[0].id});s=act(s,'choose_story_card',1,{cardId:s.hands[1][0]});return act(s,'start_story');}
function voting(){let s=story();for(const seat of [2,3,4])s=act(s,'submit_card',seat,{cardId:s.hands[seat][0]});return act(s,'finish_story');}
function revealed(){let s=voting();const token=s.lifeRoom.turn.table.find(c=>c.ownerId==='1').token;for(const seat of [2,3,4])s=act(s,'cast_vote',seat,{token});return s;}
const html=(s,seat=0,options={})=>UI.tableHTML(E.view(s,seat),{host:seat===0,...options});
function buttons(text){return(text.match(/<button\b[^>]*data-ls-action="[^"]+"[^>]*>/g)||[]).map(tag=>({type:tag.match(/data-ls-action="([^"]+)"/)[1],disabled:/\sdisabled(?:\s|>)/.test(tag)}));}
const action=(text,type)=>buttons(text).find(b=>b.type===type);

class ElementDouble{
  constructor(){this.listeners=new Map();this.nodes=[];this._html='';}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  removeEventListener(type){this.listeners.delete(type);}
  set innerHTML(text){this._html=text;this.nodes=[];for(const tag of text.match(/<(?:button|select|details|span|p)\b[^>]*>/g)||[]){const dataset={};for(const attr of tag.matchAll(/data-([\w-]+)(?:="([^"]*)")?/g))dataset[attr[1].split('-').map((part,i)=>i?part[0].toUpperCase()+part.slice(1):part).join('')]=attr[2]||'';const classes=tag.match(/class="([^"]+)"/)?.[1]?.split(' ')||[];const node={dataset,disabled:/\sdisabled(?:\s|>)/.test(tag),open:/\sopen(?:\s|>)/.test(tag),textContent:'',value:tag.match(/value="([^"]+)"/)?.[1]||'',focus(){},matches(selector){if(selector.startsWith('.'))return classes.includes(selector.slice(1));const match=selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);if(!match)return false;const key=match[1].split('-').map((part,i)=>i?part[0].toUpperCase()+part.slice(1):part).join('');return Object.hasOwn(dataset,key)&&(match[2]===undefined||dataset[key]===match[2]);},closest(selector){return this.matches(selector)?this:null;}};this.nodes.push(node);}}
  get innerHTML(){return this._html;}
  querySelectorAll(selector){return this.nodes.filter(node=>selector.split(',').some(part=>node.matches(part)));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function harness(payload,options={},globals={}){const timers=new Map(),sent=[],context={crypto:{randomUUID:()=> 'life-ui-request-'+(++sequence)},setInterval:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),...globals};vm.runInNewContext(fs.readFileSync(require.resolve('../life-story-ui.js'),'utf8'),context);vm.runInNewContext(fs.readFileSync(require.resolve('../dixit-ui.js'),'utf8'),context);const element=new ElementDouble(),card=new context.DIXIT_UI.Card(element,{send:async cmd=>sent.push(copy(cmd)),...options});card.update(payload);return{card,element,sent,timers,async click(selector){const target=element.querySelector(selector);assert.ok(target,selector+' exists');await (card.lifeCard||card).onClick({target});}};}

test('existing Dixit selects original renderer and original scoring; only mode life_story dispatches',()=>{
  const original=E.create({id:'original-ui',seed:9,now:1,roster:[1,2,3].map(playerNum=>({playerNum,name:'Seat '+playerNum}))});
  const originalHTML=html(original);assert.match(originalHTML,/data-dx-action="deal"/);assert.doesNotMatch(originalHTML,/data-life-story|data-ls-action/);
  assert.match(UI.rulesHTML(original),/Storyteller 0/);assert.match(html(game()),/data-life-story/);assert.doesNotMatch(html(game()),/Storyteller 0|winning score|Reach 30/i);
});
test('shared host renderer cannot expose private cards or private questions, even with a private projection',()=>{
  for(const s of [prepare(),story(),voting()]){const shared=html(s),accidental=html(s,1,{host:true});for(const text of [shared,accidental]){assert.doesNotMatch(text,/class="ls-hand"|class="ls-secret-card"|data-ls-question=/);for(const type of ['choose_question','choose_story_card','submit_card','cast_vote','claim_follow_up'])assert.equal(action(text,type),undefined);if(s.phase!=='VOTING')for(const id of s.hands[1])assert.ok(!text.includes('data-card-id="'+id+'"'));}}
});
test('all three private candidates render, optional prompts start collapsed, host never sees unselected questions',()=>{
  const s=prepare(),mine=E.view(s,1).dixit,text=html(s,1);assert.equal((text.match(/data-testid="question-option"/g)||[]).length,3);assert.equal((text.match(/class="ls-prompts"/g)||[]).length,3);assert.doesNotMatch(text,/<details class="ls-prompts"[^>]*\bopen/);for(const q of mine.candidates){assert.ok(text.includes(LIFE.esc(q.question.en)));assert.ok(!html(s).includes(LIFE.esc(q.question.en)));}assert.ok(action(text,'refresh_questions'));assert.ok(action(text,'free_share'));assert.ok(action(text,'pass_opportunity'));
});
test('storytelling allows live submission and withdrawal, shows no follow-up before finished discussion',()=>{
  let s=story();assert.ok(action(html(s,2),'submit_card').disabled);assert.ok(action(html(s,2,{selected:new Set([s.hands[2][0]])}),'submit_card')&&!action(html(s,2,{selected:new Set([s.hands[2][0]])}),'submit_card').disabled);s=act(s,'submit_card',2,{cardId:s.hands[2][0]});assert.ok(action(html(s,2),'withdraw_submission'));assert.equal(action(html(s,2),'submit_card'),undefined);assert.ok(action(html(s,1),'finish_story'));for(const state of [s,voting(),revealed()])for(const seat of [0,1,2])assert.equal(action(html(state,seat),'claim_follow_up'),undefined);
});
test('voting exposes anonymous card IDs and ordinal numbers, own card cannot be chosen in the modal',()=>{
  const s=voting(),mine=E.view(s,2).dixit,own=mine.table.find(c=>c.token===mine.ownTableToken);const text=html(s,2,{zoom:{cardId:own.cardId,kind:'table',token:own.token,index:2}});assert.match(text,/Your card · no vote/);assert.doesNotMatch(text,/data-ls-choose-vote|class="ls-card-owner"|class="ls-card-voters"|ls-answer-label/);assert.equal(action(html(s,1),'cast_vote'),undefined);assert.ok(action(html(s,2,{selected:new Set([own.token])}),'cast_vote').disabled);
});
test('reveal lists every owner, actual voters and real point changes; discussion ends before follow-up',()=>{
  const s=revealed(),text=html(s,2);assert.match(text,/ls-answer-label/);assert.equal((text.match(/class="ls-card-owner"/g)||[]).length,4);assert.match(text,/Votes: Friend/);assert.equal((text.match(/<strong>\+2<\/strong>/g)||[]).length,4);assert.equal(action(text,'claim_follow_up'),undefined);assert.equal(action(text,'finish_discussion'),undefined);assert.ok(action(html(s,1),'finish_discussion'));const follow=act(s,'finish_discussion');assert.ok(action(html(follow,2),'claim_follow_up'));assert.equal(action(html(follow,1),'claim_follow_up'),undefined);assert.ok(action(html(follow,1),'next_in_order'));
});
test('follow-up preparation has own hand and pass, with no new questions or invented summary',()=>{
  let s=act(revealed(),'finish_discussion');s=act(s,'claim_follow_up',3);const text=html(s,3);assert.match(text,/Continue the previous story/);assert.doesNotMatch(text,/data-ls-question=|data-ls-action="refresh_questions"|<input|<textarea/i);assert.equal((text.match(/data-testid="hand-card"/g)||[]).length,8);assert.ok(action(text,'start_story').disabled);assert.ok(action(text,'pass_opportunity'));
});
test('cancelled turns offer host recovery, never a story continuation claim',()=>{
  const s=act(story(),'cancel_turn');const text=html(s,2);assert.match(text,/This turn was cancelled/);assert.equal(action(text,'claim_follow_up'),undefined);assert.ok(action(html(s,1),'next_in_order'));assert.equal(action(html(s,1),'cancel_turn'),undefined);
});
test('card zoom selection sends only the selected own card with all authoritative fences; double tap waits for same receipt',async()=>{
  const s=prepare(),h=harness(E.view(s,1));try{const id=s.hands[1][0];await h.click('[data-ls-card="'+id+'"]');assert.equal(h.sent.length,0);await h.click('[data-ls-choose-card]');assert.equal(h.sent.length,1);assert.equal(h.sent[0].type,'choose_story_card');assert.equal(h.sent[0].cardId,id);assert.equal(h.sent[0].cycleId,s.cycleId);assert.equal(h.sent[0].expectedRevision,s.lifeRevision);assert.equal(h.sent[0].sessionId,s.sessionId);assert.equal(h.sent[0].turnId,s.turnId);assert.equal(h.sent[0].story,undefined);await h.card.lifeCard.send('choose_story_card',{cardId:s.hands[1][1]});assert.equal(h.sent.length,1);h.card.update(E.view(act(s,'choose_story_card',1,h.sent[0]),1));assert.equal(h.card.lifeCard.pending,null);}finally{h.card.destroy();}assert.equal(h.timers.size,0);assert.equal(h.element.listeners.size,0);
});
test('refresh restores an unacknowledged native private mailbox without republishing; new cycle drops it',()=>{
  const s=prepare(),payload=E.view(s,1);payload.dixitAction={id:'waiting-command',type:'free_share',sessionId:s.sessionId,turnId:s.turnId,cycleId:s.cycleId,expectedRevision:s.lifeRevision};const h=harness(payload);try{assert.equal(h.card.lifeCard.pending.id,'waiting-command');assert.equal(h.sent.length,0);const changed=copy(payload);changed.dixit.cycleId='new-cycle';h.card.update(changed);assert.equal(h.card.lifeCard.pending,null);assert.equal(h.sent.length,0);}finally{h.card.destroy();}
});
test('language changes keep room question locale, optional hints and selected state; service failures have bilingual recovery copy',()=>{
  let lang='en';const dictionaries=new Map(),I18N={registerDict:(ns,d)=>dictionaries.set(ns,d),t:(ns,k)=>dictionaries.get(ns)?.[k]?.[lang]||k};const s=prepare(),h=harness(E.view(s,1),{},{I18N});try{const id=s.hands[1][0];h.card.lifeCard.selected.add(id);lang='zh';h.card.update(E.view(s,1));assert.match(h.element.innerHTML,/準備你的故事/);assert.ok(h.element.innerHTML.includes(LIFE.esc(E.view(s,1).dixit.candidates[0].question.en)));assert.equal(h.card.lifeCard.selected.has(id),true);h.card.lifeCard.errorCode='life_story_server_required';h.card.paint();assert.match(h.element.querySelector('[data-ls-message]').textContent,/更新服務/);lang='en';h.card.paint();assert.match(h.element.querySelector('[data-ls-message]').textContent,/Update the game service/);}finally{h.card.destroy();}
});
test('new entry modules load on original host and private play pages, and styles remain scoped',()=>{
  for(const file of ['dixit.html','play.html']){const page=fs.readFileSync(require.resolve('../'+file),'utf8');assert.match(page,/life-story\.css\?v=life-story-1/);assert.ok(page.indexOf('life-story-ui.js')<page.indexOf('dixit-ui.js'));assert.match(page,/dixit-deck\.js/);assert.doesNotMatch(page,/client\/main\.tsx|\/api\/rooms/);}const css=fs.readFileSync(require.resolve('../life-story.css'),'utf8');assert.doesNotMatch(css,/^\.(?:dx-game|dixit-page|dixit-card-page)\s*\{/m);assert.match(css,/env\(safe-area-inset-bottom\)/);assert.match(css,/prefers-reduced-motion/);
});
