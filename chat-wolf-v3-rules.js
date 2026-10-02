(function (root) {
  'use strict';
  // Deliberately small, editable play-test rules. No model calls or voice judging.
  const professions = Object.freeze([
    { id: 'reporter', name: 'Reporter', rewardType: 'ballot', requiresMidgame: true,
      style: 'Ask someone about their view.', reward: 'Once, read one player\'s full ballot from a finished midgame vote.' },
    { id: 'veteran', name: 'Experienced Voice', rewardType: 'positive_clue', informationRole: true,
      style: 'Share a related experience.', reward: 'Before the final vote, receive one true, partial wolf-task clue.' },
    { id: 'bait', name: 'Bait', rewardType: 'voters', requiresMidgame: true,
      style: 'Do one clear, unusual action.', reward: 'After the next midgame vote, see who voted for you. Finish before that vote.' },
    { id: 'dreamer', name: 'Dreamer', rewardType: 'zero_votes', requiresMidgame: true,
      style: 'Share an idea from your imagination.', reward: 'Once, see everyone with zero votes in a finished midgame vote.' },
    { id: 'contrarian', name: 'Other Side', rewardType: 'negative_clue', informationRole: true,
      style: 'Find an upside, downside, or a related complaint.', reward: 'Before the final vote, learn one action that no wolf task requires.' },
    { id: 'judge', name: 'Judge', rewardType: 'judge',
      style: 'Share a simple view related to the topic.', reward: 'If the final shortlist has a boundary tie, privately choose the remaining places.' },
  ].map(p => Object.freeze({ ...p, roleId: p.id, camp: 'VILLAGER', defaultMaxCopies: 1 })));
  const wolfProfessions = Object.freeze([
    Object.freeze({ id: 'director', name: 'Director Wolf', required: true, maxCopies: 1 }),
    Object.freeze({ id: 'topic_shifter', name: 'Topic Shifter Wolf', required: false, maxCopies: 1 }),
  ]);
  const defaults = Object.freeze({ mode: 'free-chat-v3', playerCount: 6, wolfCount: 2,
    jesterEnabled: true, enabledProfessions: Object.freeze(professions.map(p => p.id)),
    roundCount: 3, talkSeconds: 600, talkEndBehavior: 'host_confirm', wrapUpSeconds: 30,
    meetingSeconds: 60, meetingTurnSeconds: 60,
    voteSeconds: 45, clueSeconds: 20, judgeSeconds: 15, taskCount: 3,
    interactionTaskCount: 0, topicId: 'random', rerollLimit: 1, infoRoleLimit: 1,
    enabledWolfRoles: Object.freeze(['director']), temporaryTopicSeconds: 180,
    jesterTieWins: false, professionWeights: Object.freeze({}) });
  const limits = Object.freeze({ playerCount: [3, 12], wolfCount: [1, 10], roundCount: [1, 6],
    talkSeconds: [30, 3600], wrapUpSeconds: [0, 180], meetingSeconds: [0, 600], meetingTurnSeconds: [10, 180],
    voteSeconds: [10, 300], clueSeconds: [0, 180], judgeSeconds: [5, 120],
    taskCount: [1, 12], interactionTaskCount: [0, 12], rerollLimit: [0, 3], infoRoleLimit: [0, 2], temporaryTopicSeconds: [60, 300] });
  const api = Object.freeze({ mode: 'free-chat-v3', version: 3, flowVersion: 4, professions, wolfProfessions, defaults, limits,
    historyLimit: 60, maxExtensionSeconds: 1800,
    completionPhases: Object.freeze(['TALK', 'WRAP_UP']),
    rewardUsePhases: Object.freeze(['TALK']),
    outcomePriority: Object.freeze(['VILLAGERS', 'JESTER', 'WOLVES', 'DRAW']),
    uniqueProfessions: true, automaticFollowUpRound: null,
    selection: Object.freeze({ canonicalWindow: 60, variantDeals: 3, familyDeals: 5,
      villageWindow: 60, maxGeneric: 1, maxVoicePerformance: 1 }),
    estimateSeconds(settings) {
      return settings.roundCount * (settings.talkSeconds + settings.playerCount * (settings.meetingTurnSeconds || 60) + settings.voteSeconds
        + (settings.talkEndBehavior === 'automatic' ? settings.wrapUpSeconds : 0))
        + settings.clueSeconds + (settings.enabledProfessions.includes('judge') ? settings.judgeSeconds : 0);
    },
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CHAT_WOLF_V3_RULES = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
