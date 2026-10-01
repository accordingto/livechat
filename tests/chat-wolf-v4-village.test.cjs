'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const CONTENT = require('../chat-wolf-v4-content.js');
const CARDS = require('../chat-wolf-v4-village.js');
const ROLES = ['reporter', 'veteran', 'bait', 'dreamer', 'contrarian', 'judge'];

test('v4 village bank has two authored cards for every enabled profession on all 48 topics', () => {
  assert.equal(CONTENT.topics.length, 48);
  assert.equal(CARDS.length, 575);
  assert.equal(CARDS.reduce((n, t) => n + t.compatibleTopicIds.length, 0), 576);
  for (const topic of CONTENT.topics) {
    for (const roleId of ROLES) {
      const eligible = CARDS.filter(t => t.roleId === roleId && t.compatibleTopicIds.includes(topic.id));
      assert.equal(eligible.length, 2, topic.id + '/' + roleId);
      assert.notEqual(eligible[0].canonicalTaskKey, eligible[1].canonicalTaskKey);
    }
  }
  assert.equal(CARDS.filter(t => !ROLES.includes(t.roleId)).length, 0, 'Kindred is intentionally unavailable');
});

test('v4 village card metadata is active, reviewed, bilingual and explicitly compatible', () => {
  const topicIds = new Set(CONTENT.topics.map(t => t.id));
  assert.equal(new Set(CARDS.map(t => t.id)).size, CARDS.length);
  assert.equal(new Set(CARDS.map(t => t.canonicalTaskKey)).size, CARDS.length);
  assert.equal(new Set(CARDS.map(t => t.roleId + ':' + t.text.toLowerCase())).size, CARDS.length);
  for (const card of CARDS) {
    assert.equal(card.active, true, card.id);
    assert.equal(card.status, 'active', card.id);
    assert.equal(card.reviewed, true, card.id);
    assert.equal(card.activityLanguage, 'en', card.id);
    assert.equal(typeof card.isGeneric, 'boolean', card.id);
    assert.match(card.text, /[A-Za-z]/, card.id);
    assert.match(card.textZh, /[\u3400-\u9fff]/u, card.id);
    assert.equal(card.variantGroup, card.mechanicKey, card.id);
    assert.ok(card.family && card.canonicalTaskKey && card.actionTags.length, card.id);
    assert.ok(card.text.length < 180, card.id + ': instructions stay short');
    for (const topicId of card.compatibleTopicIds) assert.ok(topicIds.has(topicId), card.id);
    assert.ok(!card.compatibleTopicTags, card.id + ': no global compatibility wildcard');
    for (const utterance of card.requiredUtterances) {
      assert.ok(card.text.includes(utterance), card.id);
      assert.ok(card.textZh.includes(utterance), card.id + ': Chinese view preserves the English words');
    }
  }
});

test('v4 bait uses shared action groups across topics, not fake per-topic mechanics', () => {
  const bait = CARDS.filter(t => t.roleId === 'bait');
  const clap = bait.find(t => t.text === 'Clap three times.');
  assert.deepEqual(clap.compatibleTopicIds, ['topic_v2_10', 'topic_v2_44']);
  assert.equal(clap.canonicalTaskKey, 'clap-three-audible-beats');
  assert.equal(clap.variantGroup, 'three_audible_beats');
  const repeated = bait.filter(t => /times? in a row|twice in a row|twice\.$/.test(t.text));
  assert.ok(repeated.length >= 4);
  for (const card of repeated) assert.equal(card.variantGroup, 'repeat_same_phrase_consecutively');
  for (const card of bait.filter(t => /^Sing |^Hum /.test(t.text))) {
    assert.equal(card.variantGroup, 'sing_short_phrase');
    assert.equal(card.performanceGroup, 'voice');
  }
  for (const card of bait.filter(t => /^Apologize /.test(t.text))) assert.equal(card.variantGroup, 'apologize_to_object');
  assert.ok(new Set(bait.map(t => t.variantGroup)).size < bait.length / 2);
});

test('v4 village tasks avoid rejected role-play and naming mechanics or extra completion paperwork', () => {
  for (const card of CARDS) {
    assert.doesNotMatch(card.text, /topic-related|about the topic|connected to the topic|third.person|robot voice|station announcement|invent a (?:name|word)|give yourself a name|nickname/i, card.id);
    assert.doesNotMatch(card.text, /upload|record evidence|submit evidence|fill in|write a note|host approval/i, card.id);
  }
  for (const card of CARDS.filter(t => t.roleId === 'judge')) {
    assert.match(card.text, /^Get two other players to choose the same/, card.id);
    assert.doesNotMatch(card.text, /guilty|innocent|judge|verdict/i, card.id);
  }
});

test('v4 public topics have complete bilingual follow-ups and non-mandatory author audits', () => {
  assert.equal(new Set(CONTENT.topics.map(t => t.mainQuestion)).size, 48);
  assert.equal(CONTENT.topics.flatMap(t => t.followUps).length, 384);
  for (const topic of CONTENT.topics) {
    for (const field of ['title', 'titleZh', 'shortTitle', 'shortTitleZh', 'mainQuestion', 'mainQuestionZh']) assert.ok(topic[field], topic.id + '/' + field);
    assert.equal(topic.entryPrompts.length, 3, topic.id);
    assert.equal(topic.entryPromptsZh.length, 3, topic.id);
    assert.equal(topic.followUps.length, 8, topic.id);
    assert.equal(new Set(topic.followUps.map(t => t.text)).size, 8, topic.id);
    assert.equal(new Set(topic.followUps.map(t => t.textZh)).size, 8, topic.id);
    for (const followup of topic.followUps) {
      assert.ok(followup.id && followup.text && followup.textZh, topic.id);
    }
    assert.equal(topic.audit.standaloneContext, true, topic.id);
    assert.equal(topic.audit.entryAngles.length, 3, topic.id);
    assert.ok(topic.audit.ordinaryShortAnswer, topic.id);
    assert.equal(topic.audit.naturalContinuations.length, 2, topic.id);
    assert.deepEqual(topic.audit.playerRequirements, [], topic.id);
  }
});

test('v4 village UMD exports the same bank in browser and CommonJS', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../chat-wolf-v4-village.js'), 'utf8'), context);
  assert.equal(JSON.stringify(context.CHAT_WOLF_V4_VILLAGE), JSON.stringify(CARDS));
  assert.equal(CONTENT.villageTasks.length, CARDS.length);
  assert.deepEqual(CONTENT.villageTasks.map(t => t.id), CARDS.map(t => t.id));
});
