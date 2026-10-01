'use strict';
// Development-only audit of the exact released predecessor. Never loaded by a player page.
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const cache = new Map();
function released(name) {
  if (cache.has(name)) return cache.get(name);
  const code = execFileSync('git', ['show', `70d0c56:${name}`], { cwd: __dirname + '/..', encoding: 'utf8' });
  const box = { module: { exports: {} }, require: relative => released(relative.replace(/^\.\//, '')), crypto: require('node:crypto').webcrypto };
  vm.runInNewContext(code, box, { filename: name });
  cache.set(name, box.module.exports); return box.module.exports;
}
function runBaseline(seedCount = 100, dealCount = 10, alternate = false) {
  const E = released('chat-wolf-v3-engine.js');
  const totals = { seeds: seedCount, dealsPerSeed: dealCount, deals: 0, wolfCards: 0,
    exactCardsRepeated: 0, mechanicsRepeatedWithinThreeDeals: 0, fullyGenericCards: 0,
    sameDealVoicePairs: 0, historyPreservedOnEveryRestart: true };
  const voice = new Set(['robot_voice','announcement','singing','humming','whispering','stretched_word','slow_speech','echoing','word_repetition','sound_effect']);
  const generic = new Set(['singing','clapping','tapping','sound_effect','humming','robot_voice','whispering','stretched_word','slow_speech','echoing','word_repetition','one_word_answer','rhyme','alliteration','spelling','countdown','address_title']);
  for (let seed = 1; seed <= seedCount; seed++) {
    const room = E.createRoom({code:'AUDIT2',hostPlayerId:'p0',hostSessionHash:'s0',hostName:'Audit0',seed,
      settings:{topicId:'travel-friends'},now:0});
    for(let i=1;i<6;i++) E.addPlayer(room,{playerId:'p'+i,sessionHash:'s'+i,name:'Audit'+i,now:0});
    const seen = new Set(), recent = [];
    for(let n=0;n<dealCount;n++) {
      const previous = room.recentTasks.map(t=>t.id);
      E.dispatch(room,'p0',n?'restart':'startGame',n?{keepTopic:!alternate}:{},n+1);
      const retained = room.recentTasks.map(t=>t.id);
      if(n && previous.length && !previous.slice(-Math.max(0,60-6)).every(id=>retained.includes(id))) totals.historyPreservedOnEveryRestart=false;
      const groups = new Set(recent.slice(-3).flat());
      for(const task of room.tasks) {
        totals.wolfCards++;
        if(seen.has(task.id)) totals.exactCardsRepeated++;
        if(groups.has(task.mechanicKey)) totals.mechanicsRepeatedWithinThreeDeals++;
        if(generic.has(task.mechanicKey)) totals.fullyGenericCards++;
        seen.add(task.id);
      }
      if(room.tasks.filter(t=>t.type==='self_action'&&voice.has(t.mechanicKey)).length>1) totals.sameDealVoicePairs++;
      recent.push(room.tasks.map(t=>t.mechanicKey)); totals.deals++;
    }
  }
  return {...totals, genericClassification:'Development audit classification of released mechanics, not an objective naturalness score.'};
}
if(require.main===module) console.log(JSON.stringify({release:'70d0c56',sameTopic:runBaseline(),changingTopic:runBaseline(100,10,true),
  verifiedCodeFindings:[
    'Released startGame records every assigned wolf and village card immediately; restart does not clear recentTasks.',
    'Wolf and village cards share one 60-entry history, so village cards displace older wolf history.',
    'The released selector prefers unused IDs but only softly penalizes mechanics; no three-deal hard variant exclusion exists.',
    'No persistent host history is loaded into newly created rooms.',
    'Production uses crypto randomness; deterministic seeds in this report are for reproducibility only.'
  ]},null,2));
module.exports={runBaseline};
