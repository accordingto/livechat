'use strict';

const CONTENT = require('../chat-wolf-v3-content.js');
const PROFESSIONS = ['reporter', 'veteran', 'bait', 'dreamer', 'contrarian', 'judge'];

function compatible(card, topic) {
  return (card.compatibleTopicIds || []).includes(topic.id)
    || (card.compatibleTopicTags || []).some(tag => tag === '*' || topic.tags.includes(tag));
}

function duplicateGroups(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = key(item);
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item.id);
  }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }));
}

function buildReport(content = CONTENT) {
  const issues = [];
  const byTopic = content.topics.map(topic => {
    const pool = content.wolfTasks.filter(task => compatible(task, topic));
    const interaction = pool.filter(task => task.type === 'interaction').length;
    const selfAction = pool.filter(task => task.type === 'self_action').length;
    const families = new Set(pool.map(task => task.family)).size;
    const professions = Object.fromEntries(PROFESSIONS.map(roleId => [
      roleId, content.villageTasks.filter(task => task.roleId === roleId && compatible(task, topic)).length
    ]));
    if (interaction < 20 || selfAction < 40 || pool.length < 60 || families < 8)
      issues.push(topic.id + ': insufficient wolf candidate pool');
    if (topic.followUps.length < 8 || topic.entryPrompts.length < 2 || topic.entryPrompts.length > 3)
      issues.push(topic.id + ': insufficient conversation prompts');
    for (const [roleId, count] of Object.entries(professions)) {
      if (count < 2) issues.push(topic.id + ': insufficient ' + roleId + ' cards');
    }
    return {
      topicId: topic.id,
      question: topic.mainQuestion,
      followUps: topic.followUps.length,
      entryPrompts: topic.entryPrompts.length,
      wolfCandidates: pool.length,
      interaction,
      selfAction,
      families,
      uniqueMechanics: new Set(pool.map(task => task.mechanicKey)).size,
      villageCards: professions
    };
  });
  const duplicateIds = duplicateGroups([
    ...content.topics, ...content.topics.flatMap(t => t.followUps),
    ...content.wolfTasks, ...content.villageTasks
  ], item => item.id);
  const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const duplicateWolfSentences = duplicateGroups(content.wolfTasks, item => normalize(item.text));
  const duplicateVillageSentences = duplicateGroups(content.villageTasks, item => normalize(item.text));
  const variantGroups = duplicateGroups(content.wolfTasks, item => item.mechanicKey);
  if (content.topics.length < 48) issues.push('Fewer than 48 topics');
  if (duplicateIds.length) issues.push('Duplicate content IDs');
  if (duplicateWolfSentences.length) issues.push('Duplicate wolf sentences');
  // Near-mechanic variants are intentional, named, and never counted as new mechanics.
  return {
    contentVersion: content.version,
    totals: {
      topics: content.topics.length,
      followUps: content.topics.reduce((sum, topic) => sum + topic.followUps.length, 0),
      entryPrompts: content.topics.reduce((sum, topic) => sum + topic.entryPrompts.length, 0),
      uniqueWolfCardIds: new Set(content.wolfTasks.map(task => task.id)).size,
      reusableWolfCards: content.wolfTasks.filter(task => (task.compatibleTopicTags || []).includes('*')).length,
      topicSpecificWolfVariants: content.wolfTasks.filter(task => !(task.compatibleTopicTags || []).includes('*')).length,
      uniqueWolfMechanics: new Set(content.wolfTasks.map(task => task.mechanicKey)).size,
      wolfFamilies: new Set(content.wolfTasks.map(task => task.family)).size,
      uniqueVillageCardIds: new Set(content.villageTasks.map(task => task.id)).size,
      enabledProfessions: PROFESSIONS.length,
      minimumWolfCandidatesPerTopic: Math.min(...byTopic.map(topic => topic.wolfCandidates)),
      maximumWolfCandidatesPerTopic: Math.max(...byTopic.map(topic => topic.wolfCandidates))
    },
    countsNote: 'Compatible candidates per topic reuse the same global IDs. They are not thousands of unique wolf cards. Similar variants share mechanicKey and variantGroup.',
    qualityNote: 'Prewritten material reviewed for single outcomes, voice-only play, ordinary personal conversation, and topic fit. Play balance and every wording have not been validated by real groups.',
    stretchTargetNote: 'All topics meet the 60-card minimum. The optional 80–100 compatible-card target and 4+ village cards per profession/topic are not yet met.',
    duplicateIds,
    duplicateWolfSentences,
    duplicateVillageSentences,
    variantGroups,
    byTopic,
    issues
  };
}

module.exports = { buildReport, compatible, PROFESSIONS };
if (require.main === module) {
  const report = buildReport();
  if (process.argv.includes('--summary')) console.log(JSON.stringify({
    ...report.totals,
    duplicateIds: report.duplicateIds.length,
    duplicateWolfSentences: report.duplicateWolfSentences.length,
    duplicateVillageSentences: report.duplicateVillageSentences.length,
    issues: report.issues,
    countsNote: report.countsNote,
    stretchTargetNote: report.stretchTargetNote
  }, null, 2));
  else console.log(JSON.stringify(report, null, 2));
  if (report.issues.length) process.exitCode = 1;
}
