const test = require('node:test');
const assert = require('node:assert/strict');
const { TALK_TOPICS: topics, TALK_CATEGORIES: categories, TALK_LIBRARY: library } = require('../talk-topics.js');
const E = require('../talk-engine.js');
const originals = topics.filter(topic => !topic.sourceTopicId);
const scenarios = topics.filter(topic => topic.sourceTopicId);

test('library has complete, distinct discussion paths with searchable categories', () => {
  assert.equal(categories.length, 13);
  assert.equal(topics.length, 96);
  assert.equal(new Set(topics.map(t => t.id)).size, topics.length);
  const questions = [];
  for (const category of categories.slice(0, 8)) assert.equal(originals.filter(t => t.category === category.id).length, 6);
  const scenarioCounts = {'shared-living':8,'shared-planning':8,'light-fantasy':8,'everyday-choices':12,'personal-experiences':12};
  for (const category of categories.slice(8)) assert.equal(scenarios.filter(t => t.category === category.id).length, scenarioCounts[category.id]);
  for (const topic of topics) {
    assert.ok(categories.some(category => category.id === topic.category));
    assert.ok(topic.title && topic.title.length <= 80 && topic.keywords);
    assert.ok(topic.starter.trim() && topic.starter.length <= 600 && !/[<>]/.test(topic.starter));
    assert.deepEqual(topic.followUps.map(q => q.stage), topic.sourceTopicId ? Array(8).fill('scenario') : ['understand', 'perspective', 'tradeoff', 'practice']);
    assert.equal(topic.followUp, topic.followUps[0].question);
    for (const q of [topic.question, ...topic.followUps.map(q => q.question)]) {
      assert.ok(q.trim() && q.length <= 300 && !/[<>]/.test(q));
      questions.push(q);
    }
  }
  assert.equal(questions.length, 672);
  assert.equal(new Set(questions).size, 672);
  assert.equal(new Set(topics.map(topic => topic.starter)).size, 96);
  assert.deepEqual(library.search('digital', '人工智慧').map(t => t.id), ['ai']);
  assert.deepEqual(library.search('work', 'SALARY').map(t => t.id), ['ambition']);
  assert.equal(library.search('connection', 'no-such-topic').length, 0);
  assert.deepEqual(library.search('shared-living', '室友 冰箱').map(t => t.id), ['chat-scene-02']);
  assert.deepEqual(library.search('light-fantasy', 'objects complaints').map(t => t.id), ['chat-scene-20']);
  assert.deepEqual(library.search('shared-planning', '綜藝').map(t => t.id), ['chat-scene-11']);
});

test('the existing 48 topics, IDs, explanations and follow-ups remain unchanged', () => {
  const {createHash} = require('node:crypto');
  assert.equal(originals.length, 48);
  assert.equal(createHash('sha256').update(JSON.stringify(originals)).digest('hex'),
    '999794880568cf1a89cc290f95380591ecec4bf550d04690cdeb6465e162a1ae');
});

test('all current public Chat Wolf topics are copied without roles, tasks or runtime imports', () => {
  const publicTopics = require('../chat-wolf-v4-content.js').topics.filter(topic => topic.active);
  assert.equal(scenarios.length, publicTopics.length);
  assert.equal(new Set(scenarios.map(topic => topic.sourceTopicId)).size, publicTopics.length);
  for (const source of publicTopics) {
    const topic = scenarios.find(topic => topic.sourceTopicId === source.id);
    assert.ok(topic, `Missing public scenario ${source.id}`);
    assert.equal(topic.title, source.title);
    assert.equal(topic.category, source.category);
    assert.equal(topic.source, 'chatwolf');
    assert.equal(topic.question, source.mainQuestion);
    assert.deepEqual(topic.followUps.map(q => q.question), source.followUps.map(q => q.text));
    assert.deepEqual(Object.keys(topic).sort(),
      ['id','category','emoji','title','keywords','question','starter','followUp','followUps','sourceTopicId','source'].sort());
  }
  const script = require('node:fs').readFileSync(require.resolve('../talk-topics.js'), 'utf8');
  assert.doesNotMatch(script, /require\s*\(|CHAT_WOLF_|wolfTasks|villageTasks|directorDirections/);
  const browser = require('node:vm').createContext({});
  require('node:vm').runInContext(script, browser);
  assert.equal(require('node:vm').runInContext('TALK_TOPICS.length', browser), 96);
  assert.equal(require('node:vm').runInContext('TALK_TOPICS.filter(topic => topic.source === "chatwolf").length', browser), 48);
  const {TALK_LIBRARY: browserLibrary} = require('../talk-topics.js');
  assert.ok(browserLibrary.draw('light-fantasy', '', [], () => 0).sourceTopicId);
});

test('added scenarios work with the existing topic editor and all eight follow-up choices', () => {
  const topic = scenarios[19];
  const custom = library.custom({title:topic.title,question:topic.question,starter:topic.starter,
    followUps:topic.followUps.map(q => q.question).join('\n')});
  assert.equal(E.followUps(custom).length, 8);
  let state = E.create({id:'scenario-followups',topic,now:1000,roster:[{playerNum:1,name:'A'},{playerNum:2,name:'B'}]});
  state = E.apply(state, {id:'start-scenario',type:'start',actor:0,sessionId:state.sessionId,turnId:state.turnId,now:2000,seed:99});
  state = E.apply(state, {id:'last-followup',type:'extend',actor:0,sessionId:state.sessionId,turnId:state.turnId,now:2000,index:7});
  assert.equal(E.view(state,1,2000).talk.topic.followUp, topic.followUps[7].question);
  assert.equal(E.starter(state.topic), topic.starter);
});

test('custom topics preserve user text, normalize lines and reject invalid limits', () => {
  const topic = library.custom({ question: '  What does <fair> mean?  ', starter: '  Think about <fairness>.  ', followUps: 'Why?\r\n\r\n給個例子？\n' });
  assert.equal(topic.question, 'What does <fair> mean?');
  assert.equal(E.starter(topic), 'Think about <fairness>.');
  assert.equal(E.starter({followUp:'An old follow-up?'}), '');
  assert.equal(library.custom({question:'Q?',starter:'x'.repeat(600)}).starter.length, 600);
  assert.equal(E.starter({question:'A question without a starter?'}), '');
  assert.deepEqual(E.followUps(topic).map(q => q.question), ['Why?', '給個例子？']);
  assert.equal(library.custom({question:'One question only?'}).followUps.length, 0);
  for (const data of [{question:'  '}, {question:'x'.repeat(501)}, {question:'Q?',title:'x'.repeat(81)},
    {question:'Q?',starter:'x'.repeat(601)}, {question:'Q?',followUps:Array(9).fill('Why?').join('\n')}, {question:'Q?',followUps:'x'.repeat(301)}]) {
    assert.throws(() => library.custom(data), /invalid_topic/);
  }
});

test('random draw respects filters and avoids the current and previewed topics when possible', () => {
  const category = 'digital', matches = library.search(category);
  const excluded = matches.slice(0, 2).map(t => t.id), picked = new Set();
  for (let i = 0; i < 100; i++) {
    const topic = library.draw(category, '', excluded, () => i / 100);
    assert.equal(topic.category, category); assert.ok(!excluded.includes(topic.id));
    picked.add(topic.id);
  }
  assert.equal(picked.size, matches.length - excluded.length);
  assert.equal(library.draw(category, '人工智慧', ['ai'], () => 0.99).id, 'ai');
  assert.equal(library.draw(category, 'no-such-topic', [], () => 0), null);
  assert.equal(library.draw('', '', [], () => 0).id, topics[0].id);
  assert.equal(library.draw('', '', [], () => 0.9999).id, topics.at(-1).id);
});

test('choosing and improvising a follow-up preserve turns, notes and a spoken question', () => {
  let serial = 0;
  const act = (s, type, actor = 0, extra = {}) => E.apply(s, {id:String(++serial),type,actor,sessionId:s.sessionId,turnId:s.turnId,now:2000,seed:99,...extra});
  let s = E.create({id:'path',topic:topics[0],mode:'write',now:1000,roster:[{playerNum:1,name:'A'},{playerNum:2,name:'B'}]});
  s = act(s,'note',1,{text:'A thought'}); s = act(s,'start');
  const asker = E.order(s)[0];
  s = act(s,'ask',asker); s = act(s,'invite',s.speaker,{target:s.questions[0].id});
  const preserved = state => JSON.stringify([state.sessionId,state.speaker,state.turnId,state.round,state.remaining,state.spoken,state.notes,state.questions,state.activeQuestion]);
  const before = preserved(s);
  s = act(s,'extend',0,{index:2});
  assert.equal(E.view(s,2,2000).talk.topic.followUp, topics[0].followUps[2].question);
  s = act(s,'extend',0,{text:'Who might see this differently?'});
  assert.equal(E.view(s,1,2000).talk.topic.followUp, 'Who might see this differently?');
  assert.equal(preserved(s),before);
  s = act(s,'extend',0,{show:false}); assert.equal(E.view(s,1,2000).talk.extended,false);
  s = act(s,'extend'); assert.equal(s.extended,true);
  for (const extra of [{index:-1},{index:100},{index:0.5},{text:' '},{text:'x'.repeat(301)}]) {
    s = act(s,'extend',0,extra); assert.equal(s.replies[0].error,'invalid_extension');
    assert.equal(E.view(s,1,2000).talk.topic.followUp,'Who might see this differently?');
  }
  s = act(s,'extend',asker,{index:0}); assert.equal(s.replies[asker].error,'not_available');
  const stale = act(s,'extend',0,{text:'Old session?',sessionId:'old'}); assert.equal(stale,s);
  const fresh = E.create({id:'next',topic:topics[1],now:3000,roster:s.roster});
  assert.equal(fresh.extended,false); assert.equal(fresh.extension,undefined);
  assert.equal(E.view(fresh,1,3000).talk.topic.followUp,topics[1].followUp);
});

test('legacy topics and Firebase object-shaped follow-ups remain usable', () => {
  assert.deepEqual(E.followUps({followUp:'Old question?'}),[{stage:'custom',question:'Old question?'}]);
  assert.deepEqual(E.followUps({followUps:{0:{stage:'practice',question:'What could change?'}}}),[{stage:'practice',question:'What could change?'}]);
});
