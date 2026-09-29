'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CONTENT = require('../chat-wolf-v3-content.js');
const { buildReport, compatible, PROFESSIONS } = require('../scripts/chat-wolf-v3-content-report.cjs');

test('v3 content meets actual compatible pool minima with honest unique counts', () => {
  const report = buildReport();
  assert.deepEqual(report.issues, []);
  assert.equal(report.totals.topics, 48);
  assert.equal(report.totals.followUps, 384);
  assert.equal(report.totals.entryPrompts, 144);
  assert.equal(report.totals.uniqueWolfCardIds, 84);
  assert.equal(report.totals.reusableWolfCards, 60);
  assert.equal(report.totals.topicSpecificWolfVariants, 24);
  assert.equal(report.totals.uniqueWolfMechanics, 45);
  assert.equal(report.totals.wolfFamilies, 17);
  assert.equal(report.totals.uniqueVillageCardIds, 576);
  for (const row of report.byTopic) {
    assert.ok(row.interaction >= 20, row.topicId);
    assert.ok(row.selfAction >= 40, row.topicId);
    assert.ok(row.families >= 8, row.topicId);
    assert.ok(row.uniqueMechanics >= 40, row.topicId);
    for (const roleId of PROFESSIONS) assert.equal(row.villageCards[roleId], 2, row.topicId + '/' + roleId);
  }
});

test('v3 content IDs, task sentences, and topic questions are unique', () => {
  const report = buildReport();
  assert.deepEqual(report.duplicateIds, []);
  assert.deepEqual(report.duplicateWolfSentences, []);
  assert.deepEqual(report.duplicateVillageSentences, []);
  assert.equal(new Set(CONTENT.topics.map(t => t.mainQuestion.toLowerCase())).size, 48);
  for (const topic of CONTENT.topics) {
    assert.equal(new Set(topic.followUps.map(t => t.text)).size, 8);
    assert.equal(new Set(topic.entryPrompts).size, 3);
  }
});

test('all task compatibility references resolve and variant keys survive cross-topic reuse', () => {
  const topicIds = new Set(CONTENT.topics.map(t => t.id));
  const tags = new Set(CONTENT.topics.flatMap(t => t.tags));
  for (const task of [...CONTENT.wolfTasks, ...CONTENT.villageTasks]) {
    for (const id of task.compatibleTopicIds || []) assert.ok(topicIds.has(id), id);
    for (const tag of task.compatibleTopicTags || []) assert.ok(tag === '*' || tags.has(tag), tag);
    assert.ok(CONTENT.topics.some(topic => compatible(task, topic)), task.id);
    assert.ok(task.mechanicKey, task.id);
  }
  for (const task of CONTENT.wolfTasks) {
    assert.equal(task.variantGroup, task.mechanicKey, task.id);
    if (task.compatibleTopicTags?.includes('*')) {
      assert.equal(CONTENT.topics.filter(topic => compatible(task, topic)).length, 48);
    }
  }
  assert.ok(buildReport().variantGroups.length > 0);
});

test('wolf cards have one-button-compatible data, feasible player counts, and partial clues', () => {
  for (const task of CONTENT.wolfTasks) {
    assert.ok(['interaction', 'self_action'].includes(task.type), task.id);
    assert.equal(task.requiredOtherPlayerCount, task.type === 'interaction' ? 1 : 0, task.id);
    assert.ok(task.text.split(/\s+/).length <= 35, task.id);
    assert.ok(!Object.hasOwn(task, 'ownerPlayerId'));
    assert.ok(!Object.hasOwn(task, 'requiredTargets'));
    assert.ok(!Object.hasOwn(task, 'note'));
    assert.ok(task.actionTags.length >= 1, task.id);
    assert.ok(task.positiveClues.length >= 1, task.id);
    for (const clue of task.positiveClues) {
      assert.ok(clue.length < task.text.length + 50, task.id);
      assert.notEqual(clue, task.text);
      assert.ok(!/Captain|three|twice|decimal|I have a better idea/.test(clue), task.id);
    }
    for (const tag of task.actionTags) {
      assert.equal(typeof CONTENT.exclusionClues[tag], 'string', task.id + '/' + tag);
      assert.match(CONTENT.exclusionClues[tag], /^No wolf task requires /);
    }
  }
  for (const topic of CONTENT.topics) {
    const pool = CONTENT.wolfTasks.filter(task => compatible(task, topic));
    const tags = new Set(pool.flatMap(task => task.actionTags));
    assert.ok(tags.size > 12, topic.id); // An absent true tag exists even at the maximum task count.
    for (const type of ['interaction', 'self_action']) {
      assert.ok(new Set(pool.filter(task => task.type === type).map(t => t.mechanicKey)).size >= 12);
    }
  }
});

test('only the six enabled professions have topic-specific reroll pairs', () => {
  const roles = new Set(CONTENT.villageTasks.map(t => t.roleId));
  assert.deepEqual([...roles].sort(), [...PROFESSIONS].sort());
  assert.ok(!roles.has('kindred'));
  for (const topic of CONTENT.topics) for (const roleId of PROFESSIONS) {
    const cards = CONTENT.villageTasks.filter(task => task.roleId === roleId && compatible(task, topic));
    assert.equal(cards.length, 2);
    assert.notEqual(cards[0].text, cards[1].text);
    assert.ok(cards.every(task => task.text.split(/\s+/).length <= 35));
    if (roleId === 'judge') assert.ok(cards.every(task => /^Get two other players to choose the same /.test(task.text)));
  }
});

test('content is English, voice-only, and loads without a build step or API', () => {
  const path = require.resolve('../chat-wolf-v3-content.js');
  const source = fs.readFileSync(path, 'utf8');
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(CONTENT)));
  assert.ok(!/fetch\(|XMLHttpRequest|OPENAI_API_KEY|localStorage/.test(source));
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { filename: path });
  assert.equal(sandbox.CHAT_WOLF_V3_CONTENT.topics.length, 48);
  const taskText = [...CONTENT.wolfTasks, ...CONTENT.villageTasks].map(task => task.text).join(' ');
  assert.ok(!/thumbs.up|raise your hand|camera|third.person|say your own name|political|medical secret/i.test(taskText));
});
