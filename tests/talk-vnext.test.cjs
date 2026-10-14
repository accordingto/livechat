'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../talk-vnext.js');

const clone = value => JSON.parse(JSON.stringify(value));
const identity = num => num.toString(16).padStart(64, '0');
const roster = count => Array.from({ length: count }, (_, index) => ({
  playerNum: index + 1, name: `Person ${index + 1}`, active: true
}));
let serial = 0;

function room(options = {}) {
  const count = options.count || 6;
  const s = {
    version: 1, sessionId: 'vnext-round', turnId: 1, phase: 'thinking',
    gameMode: 'crazy', round: 1,
    topic: { id: 'soup', title: 'Soup committee', question: 'Who hid the spoons?' },
    roster: roster(count), scores: Object.fromEntries(roster(count).map(p => [p.playerNum, 0])),
    gameDeadline: 0, crazyTaskSeconds: 150,
    crazy: { enabled: true, source: 'players', minSeconds: 5, maxSeconds: 5,
      intervalSeconds: 120, taskSeconds: 150, queue: [], prompts: {}, nextAssignAt: 0,
      ...options.crazy },
    ...options.state
  };
  V.init(s, { now: 1000, seed: 17 });
  return s;
}

function input(s, actor = 1, extra = {}) {
  return { id: `vnext-test-${++serial}`, actor, now: 2000, seed: 23,
    sessionId: s.sessionId, turnId: s.turnId, ...extra };
}
function item(id, author = 1, target = 3, extra = {}) {
  return { id, text: `The royal soup says ${id}.`, kind: 'line', assignedBy: author,
    target, at: 2000, ...extra };
}
function submit(s, custom, extra = {}) {
  const i = input(s, custom.assignedBy, extra);
  assert.equal(V.submit(s, custom, i), null);
  // The engine journals the accepted item before invoking delivery. The pure
  // module uses the exact same command clock for that second step.
  V.advance(s, i);
  return custom;
}
function act(s, type, actor = 1, extra = {}) {
  return V.action(s, input(s, actor, { type, ...extra }));
}
function active(s) {
  return Object.entries(s.crazy.prompts).filter(([, p]) => p.status === 'pending');
}
function own(s, num) { return s.crazy.prompts[num]; }
function shown(s, num, now = 2100) {
  const p = own(s, num);
  assert.equal(act(s, 'crazyRendered', num, { promptId: p.id, renderVersion: p.version, now }), null);
  return p;
}
function decision(s, now = 5000) {
  s.phase = 'talking';
  s.gameDeadline = now;
  V.advance(s, input(s, 0, { now }));
  assert.equal(s.crazy.roundStage, 'decision');
}

// Each fixture carries its clock, roster and random seed explicitly. No browser,
// service, room storage or credentials are used by this suite.

test('initialization migrates old mailboxes once while preserving the task and room settings', () => {
  const old = { id: 'old-system', text: 'I am the mayor of soup.', kind: 'line', source: 'system',
    status: 'pending', at: 1000, expiresAt: 151000 };
  const s = room({ crazy: { source: 'mixed', taskSeconds: 150, prompts: { 3: old } } });
  assert.equal(s.crazy.maxActive, 3);
  assert.equal(s.crazy.playStyle, 'free');
  assert.equal(s.crazy.effectivePlayStyle, 'free');
  assert.equal(s.crazy.rotationSeconds, 240);
  assert.equal(s.crazy.roundStage, 'open');
  assert.equal(own(s, 3).id, old.id);
  assert.equal(own(s, 3).text, old.text);
  assert.equal(own(s, 3).version, 1);
  assert.equal(own(s, 3).renderAckAt, 0);
  assert.equal(own(s, 3).displayDeadline, 31000);
  assert.equal(own(s, 3).expiresAt, 151000);
  assert.equal(s.crazy.source, 'mixed');
  const once = clone(s);
  assert.equal(V.init(s, { now: 5000, seed: 999 }), false);
  assert.deepEqual(s, once);
});

test('capacity defaults to three and excludes inactive, pending and director seats', () => {
  const s = room({ crazy: { source: 'mixed' } });
  assert.equal(V.capacity(s), 3);
  s.crazy.maxActive = 9;
  s.roster[4].active = false;
  s.roster[5].pending = true;
  assert.deepEqual(V.roles(s).receivers, [1, 2, 3, 4]);
  assert.deepEqual(V.activeNums(s), []);
  assert.equal(V.capacity(s), 4);
  s.crazy.maxActive = 1;
  assert.equal(V.capacity(s), 1);
  s.phase = 'talking';
  assert.equal(V.assign(s, { id: 'one', text: 'One secret soup.', kind: 'line', source: 'system' }, 2, input(s)), true);
  assert.equal(V.assign(s, { id: 'two', text: 'Two secret soups.', kind: 'line', source: 'system' }, 3, input(s)), false);
  assert.equal(active(s).length, 1);
});

test('three concurrent tasks fill the default cap and a completion frees exactly one slot', () => {
  const s = room();
  s.phase = 'talking';
  for (const num of [3, 4, 5]) submit(s, item(`cap-${num}`, 1, num));
  submit(s, item('waiting-for-cap', 2, 6));
  assert.equal(active(s).length, 3);
  assert.equal(s.crazy.queue.length, 1);
  const before = [clone(own(s, 4)), clone(own(s, 5))];
  const p = shown(s, 3);
  assert.equal(act(s, 'crazyDone', 3, { promptId: p.id, now: 2200 }), null);
  V.advance(s, input(s, 0, { now: 2200 }));
  assert.equal(active(s).length, 3);
  assert.equal(own(s, 6).text, 'The royal soup says waiting-for-cap.');
  assert.deepEqual([own(s, 4), own(s, 5)], before);
  assert.equal(s.crazy.queue.length, 0);
});

test('preparation queues handwriting and talking submits it immediately without a scheduler wait', () => {
  const s = room();
  submit(s, item('prepared', 1, 3));
  assert.equal(active(s).length, 0);
  assert.equal(s.crazy.queue.length, 1);
  assert.equal(s.crazy.queue[0].id, 'prepared');
  s.phase = 'talking';
  V.advance(s, input(s));
  assert.equal(own(s, 3).text, 'The royal soup says prepared.');
  submit(s, item('immediate', 2, 4), { now: 3000 });
  assert.equal(own(s, 4).text, 'The royal soup says immediate.');
  assert.equal(own(s, 4).at, 3000);
  assert.equal(own(s, 4).expiresAt, 153000);
  assert.equal(s.crazy.queue.length, 0);
});

test('FIFO skips a blocked fixed recipient without overwriting a custom task', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('first', 1, 3));
  const original = clone(own(s, 3));
  submit(s, item('blocked', 2, 3), { now: 2200 });
  submit(s, item('ready', 1, 4), { now: 2300 });
  assert.deepEqual(own(s, 3), original);
  assert.equal(own(s, 4).text, 'The royal soup says ready.');
  assert.deepEqual(s.crazy.queue.map(p => p.id), ['blocked']);
  assert.equal(active(s).length, 2);
});

test('handwriting offered over a system task keeps the old task intact until a decision', () => {
  const s = room({ crazy: { source: 'mixed' } });
  s.phase = 'talking';
  assert.equal(V.assign(s, { id: 'system-first', text: 'SYSTEM SECRET', kind: 'task', source: 'system' }, 3, input(s)), true);
  const old = clone(own(s, 3));
  submit(s, item('replacement', 1, 3), { now: 2500 });
  assert.deepEqual(own(s, 3), old);
  const offer = s.crazy.offers[3];
  assert.ok(offer?.id);
  assert.equal(act(s, 'crazyKeep', 3, { offerId: offer.id, promptId: old.id, now: 3000 }), null);
  assert.equal(own(s, 3).id, old.id);
  V.advance(s, input(s, 0, { now: 3100 }));
  assert.ok(!s.crazy.offers[3]);
  assert.ok(s.crazy.queue.some(p => p.id === 'replacement'));
  for (const now of [4000, 5000, 10000]) {
    V.advance(s, input(s, 0, { now }));
    assert.ok(!s.crazy.offers[3]);
    assert.equal(own(s, 3).id, old.id);
  }
});

test('accepting a replacement requires both identities and starts a fresh full task lifetime', () => {
  const s = room({ crazy: { source: 'mixed' } });
  s.phase = 'talking';
  V.assign(s, { id: 'system-old', text: 'Old secret.', kind: 'line', source: 'system' }, 3, input(s));
  const oldId = own(s, 3).id;
  submit(s, item('new-secret', 1, 3), { now: 4000 });
  const offer = s.crazy.offers[3];
  assert.notEqual(act(s, 'crazyReplace', 3, { offerId: offer.id, promptId: 'stale', now: 5000 }), null);
  assert.equal(own(s, 3).id, oldId);
  assert.equal(act(s, 'crazyReplace', 3, { offerId: offer.id, promptId: oldId, now: 5000 }), null);
  const fresh = own(s, 3);
  assert.notEqual(fresh.id, oldId);
  assert.equal(fresh.text, 'The royal soup says new-secret.');
  assert.equal(fresh.at, 5000);
  assert.equal(fresh.expiresAt, 155000);
  assert.equal(fresh.renderAckAt, 0);
  assert.equal(fresh.displayDeadline, 35000);
  assert.equal(s.scores[3], 0);
});

test('render acknowledgement is recipient, prompt and version bound and replay does not refresh it', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('ack', 1, 3));
  const p = own(s, 3);
  assert.notEqual(act(s, 'crazyRendered', 2, { promptId: p.id, renderVersion: 1 }), null);
  assert.notEqual(act(s, 'crazyRendered', 3, { promptId: p.id, renderVersion: 2 }), null);
  assert.notEqual(act(s, 'crazyRendered', 3, { promptId: 'previous', renderVersion: 1 }), null);
  assert.equal(p.renderAckAt, 0);
  assert.equal(act(s, 'crazyRendered', 3, { promptId: p.id, renderVersion: 1, now: 2100 }), null);
  assert.equal(p.renderAckAt, 2100);
  assert.equal(act(s, 'crazyRendered', 3, { promptId: p.id, renderVersion: 1, now: 2200 }), null);
  assert.equal(p.renderAckAt, 2100);
  assert.equal(p.expiresAt, 152000);
});

test('an unshown custom task is withdrawn at 30 seconds and requeued with its original identity', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('unshown', 1, 3));
  const p = own(s, 3);
  assert.equal(V.due(s, 31999), false);
  V.advance(s, input(s, 0, { now: 31999 }));
  assert.equal(p.status, 'pending');
  assert.equal(V.due(s, 32000), true);
  V.advance(s, input(s, 0, { now: 32000 }));
  assert.equal(p.status, 'withdrawn');
  assert.equal(s.crazy.receivers[3].paused, true);
  assert.equal(s.crazy.receivers[3].reason, 'display_unconfirmed');
  assert.equal(s.scores[3], 0);
  assert.deepEqual(s.crazy.queue.map(p => p.id), ['unshown']);
  V.advance(s, input(s, 0, { now: 40000 }));
  assert.equal(s.crazy.queue.length, 1);
  assert.equal(active(s).length, 0);
  assert.equal(act(s, 'crazyReceive', 3, { now: 41000 }), null);
  const resumed = own(s, 3);
  assert.notEqual(resumed.id, p.id);
  assert.equal(resumed.archiveId, p.archiveId);
  assert.equal(resumed.text, p.text);
  assert.equal(resumed.at, 41000);
  assert.equal(resumed.expiresAt, 191000);
  assert.equal(s.crazy.queue.length, 0);
  assert.equal(cards(s).length, 1);
  assert.equal(s.scores[3], 0);
});

test('legacy unshown player prompts reconstruct their queue item before technical withdrawal', () => {
  const legacy = { id: 'legacy-in-flight', text: 'LEGACY HANDWRITTEN CONTENT', kind: 'task',
    source: 'player', assignedBy: 1, status: 'pending', at: 2000, expiresAt: 152000 };
  const s = room({ crazy: { prompts: { 3: legacy } } });
  s.phase = 'talking';
  const p = own(s, 3);
  assert.equal(p.queueItem.id, legacy.id);
  assert.equal(p.queueItem.text, legacy.text);
  assert.equal(p.queueItem.assignedBy, 1);
  assert.equal(p.queueItem.target, 3);
  assert.equal(p.queueItem.at, 2000);
  V.advance(s, input(s, 0, { now: 32000 }));
  assert.equal(p.status, 'withdrawn');
  assert.equal(s.crazy.queue.length, 1);
  assert.equal(s.crazy.queue[0].id, 'legacy-in-flight');
  assert.equal(s.crazy.queue[0].text, 'LEGACY HANDWRITTEN CONTENT');
  assert.equal(s.crazy.queue[0].archiveId, p.archiveId);
  assert.equal(cards(s).length, 1);
  assert.equal(cards(s)[0].executed, false);
  assert.equal(act(s, 'crazyReceive', 3, { now: 33000 }), null);
  assert.equal(own(s, 3).text, 'LEGACY HANDWRITTEN CONTENT');
  assert.equal(own(s, 3).archiveId, p.archiveId);
  assert.equal(s.scores[3], 0);
});

test('a failed replacement while delivery is paused preserves the old pending task and offer', () => {
  for (const pausedScope of ['global', 'receiver']) {
    const s = room({ crazy: { source: 'mixed' } });
    s.phase = 'talking';
    V.assign(s, { id: `old-${pausedScope}`, text: 'OLD PENDING SYSTEM TASK', kind: 'line', source: 'system' }, 3, input(s));
    submit(s, item(`new-${pausedScope}`, 1, 3));
    const p = clone(own(s, 3)), offer = clone(s.crazy.offers[3]);
    if (pausedScope === 'global') s.crazy.paused = true;
    else s.crazy.receivers[3].paused = true;
    assert.notEqual(act(s, 'crazyReplace', 3, { promptId: p.id, offerId: offer.id, now: 3000 }), null);
    assert.deepEqual(own(s, 3), p);
    assert.deepEqual(s.crazy.offers[3], offer);
    assert.equal(s.crazy.queue.length, 1);
    s.crazy.paused = false;
    s.crazy.receivers[3].paused = false;
    assert.equal(act(s, 'crazyReplace', 3, { promptId: p.id, offerId: offer.id, now: 4000 }), null);
    assert.equal(own(s, 3).text, `The royal soup says new-${pausedScope}.`);
    assert.equal(own(s, 3).expiresAt, 154000);
  }
});

test('an unshown system task is withdrawn without entering the handwritten queue', () => {
  const s = room({ crazy: { source: 'mixed' } });
  s.phase = 'talking';
  assert.equal(V.assign(s, { id: 'unseen-system', text: 'I represent the spoons.', kind: 'line', source: 'system' },
    3, input(s)), true);
  const p = own(s, 3);
  V.advance(s, input(s, 0, { now: 32000 }));
  assert.equal(p.status, 'withdrawn');
  assert.equal(s.crazy.queue.length, 0);
  assert.equal(s.crazy.receivers[3].paused, true);
  assert.equal(s.scores[3], 0);
});

test('shown task expiry still runs while delivery is paused and prevents late completion', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('expires', 1, 3));
  const p = shown(s, 3);
  s.crazy.paused = true;
  V.advance(s, input(s, 0, { now: p.expiresAt - 1 }));
  assert.equal(p.status, 'pending');
  V.advance(s, input(s, 0, { now: p.expiresAt }));
  assert.equal(p.status, 'expired');
  assert.equal(s.crazy.receivers[3].paused, true);
  assert.equal(s.crazy.receivers[3].reason, 'expired');
  assert.notEqual(act(s, 'crazyDone', 3, { promptId: p.id, now: p.expiresAt }), null);
  assert.equal(s.scores[3], 0);
});

test('keeping the current task counts as manual interaction without refreshing its expiry', () => {
  const s = room({ crazy: { source: 'mixed' } }); s.phase = 'talking';
  assert.equal(V.assign(s, { id: 'kept-system', text: 'I speak for the soup.', kind: 'line', source: 'system' }, 3, input(s)), true);
  const p = shown(s, 3);
  submit(s, item('declined-new-card', 1, 3), { now: 3000 });
  const offer = s.crazy.offers[3];
  const keep = input(s, 3, { type: 'crazyKeep', offerId: offer.id, promptId: p.id, now: 4000 });
  assert.equal(V.action(s, { ...keep, promptId: 'unrelated-prompt' }), 'stale_offer');
  assert.equal(p.interactedAt, undefined);
  keep.id += '-valid';
  assert.equal(V.action(s, keep), null); assert.equal(p.interactedAt, 4000);
  assert.equal(V.action(s, { ...keep, now: 5000 }), null);
  assert.equal(p.interactedAt, 4000, 'a replay does not invent a newer interaction');
  assert.equal(p.expiresAt, 152000); assert.equal(p.renderAckAt, 2100);
  s.crazy.paused = true;
  V.advance(s, input(s, 0, { now: p.expiresAt }));
  assert.equal(p.status, 'expired'); assert.equal(s.scores[3], 0);
  assert.equal(s.crazy.receivers[3].paused, false);
  assert.ok(s.crazy.queue.some(card => card.id === 'declined-new-card'));
  assert.ok(V.eligibleReceivers(s, input(s, 0, { now: p.expiresAt })).includes(3));
});

test('replacement starts an independent interaction lifecycle and technical rendering alone still pauses on expiry', () => {
  for (const acknowledgeReplacement of [false, true]) {
    const s = room({ crazy: { source: 'mixed' } }); s.phase = 'talking';
    assert.equal(V.assign(s, { id: 'old-interacted-system', text: 'Keep the old soup.', kind: 'line', source: 'system' }, 3, input(s)), true);
    const old = shown(s, 3);
    submit(s, item('first-declined', 1, 3), { now: 3000 });
    const first = s.crazy.offers[3];
    assert.equal(act(s, 'crazyKeep', 3, { offerId: first.id, promptId: old.id, now: 4000 }), null);
    assert.equal(old.interactedAt, 4000);
    submit(s, item('next-accepted', 2, 3), { now: 5000 });
    const next = s.crazy.offers[3];
    assert.equal(act(s, 'crazyReplace', 3, { offerId: next.id, promptId: old.id, now: 6000 }), null);
    const replacement = own(s, 3);
    assert.notEqual(replacement.id, old.id); assert.equal(old.status, 'replaced');
    assert.equal(replacement.interactedAt, undefined);
    if (acknowledgeReplacement) {
      shown(s, 3, 6100);
      assert.equal(replacement.interactedAt, undefined, 'a technical ACK is not a manual operation');
    }
    s.crazy.paused = true;
    const deadline = acknowledgeReplacement ? replacement.expiresAt : replacement.displayDeadline;
    V.advance(s, input(s, 0, { now: deadline }));
    assert.equal(replacement.status, acknowledgeReplacement ? 'expired' : 'withdrawn');
    assert.equal(s.crazy.receivers[3].paused, true);
    assert.equal(s.crazy.receivers[3].reason, acknowledgeReplacement ? 'expired' : 'display_unconfirmed');
    assert.equal(s.scores[3], 0);
  }
});

test('completion scores once and imposes a 30 second receive cooldown', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('complete', 1, 3));
  const p = shown(s, 3);
  assert.notEqual(act(s, 'crazyDone', 4, { promptId: p.id, now: 2200 }), null);
  assert.equal(s.scores[3], 0);
  assert.equal(act(s, 'crazyDone', 3, { promptId: p.id, now: 2200 }), null);
  assert.equal(p.status, 'done');
  assert.equal(s.scores[3], 1);
  assert.equal(s.crazy.receivers[3].cooldownUntil, 32200);
  assert.notEqual(act(s, 'crazyDone', 3, { promptId: p.id, now: 2300 }), null);
  assert.equal(s.scores[3], 1);
  assert.ok(!V.eligibleReceivers(s, input(s, 0, { now: 32199 })).includes(3));
  assert.ok(V.eligibleReceivers(s, input(s, 0, { now: 32200 })).includes(3));
});

test('skip awards no score and cannot be used to receive a new task before cooldown', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('skip', 1, 3));
  const p = shown(s, 3);
  assert.equal(act(s, 'crazySkip', 3, { promptId: p.id, now: 2200 }), null);
  assert.equal(p.status, 'skipped');
  assert.equal(s.scores[3], 0);
  assert.equal(s.crazy.receivers[3].cooldownUntil, 32200);
  submit(s, item('later', 2, 3), { now: 2300 });
  assert.equal(s.crazy.queue.length, 1);
  assert.equal(active(s).length, 0);
  V.advance(s, input(s, 0, { now: 32200 }));
  assert.equal(own(s, 3).text, 'The royal soup says later.');
  assert.equal(own(s, 3).status, 'pending');
});

test('receiver pause preserves queued handwriting and explicit resume delivers it without waiting', () => {
  const s = room();
  s.phase = 'talking';
  assert.equal(act(s, 'crazyReceive', 3, { paused: true }), null);
  submit(s, item('paused-recipient', 1, 3));
  assert.equal(active(s).length, 0);
  assert.equal(s.crazy.queue.length, 1);
  assert.ok(!V.eligibleReceivers(s, input(s)).includes(3));
  assert.equal(act(s, 'crazyReceive', 3, { now: 3000 }), null);
  V.advance(s, input(s, 3, { now: 3000 }));
  assert.equal(s.crazy.receivers[3].paused, false);
  assert.equal(own(s, 3).text, 'The royal soup says paused-recipient.');
  assert.equal(s.crazy.queue.length, 0);
});

test('director style uses two ring seats and can send only to the other active receivers', () => {
  const s = room({ crazy: { playStyle: 'director' } });
  assert.equal(s.crazy.effectivePlayStyle, 'director');
  assert.deepEqual(s.crazy.directors, [1, 2]);
  assert.equal(V.capacity(s), 3);
  assert.deepEqual(V.eligibleReceivers(s, input(s)), [3, 4, 5, 6]);
  assert.notEqual(V.submit(s, item('not-director', 3, 4), input(s, 3)), null);
  assert.equal(V.submit(s, item('director-recipient', 1, 2), input(s, 1)), null);
  assert.ok(s.crazy.queue.some(card => card.id === 'director-recipient'));
  assert.equal(V.submit(s, item('director-send', 1, 4), input(s, 1)), null);
});

test('director rotation waits for the next ring seat to become idle and exchanges one seat atomically', () => {
  const s = room({ crazy: { playStyle: 'director', rotationSeconds: 60 } });
  s.phase = 'talking';
  submit(s, item('hold-rotation', 1, 3));
  const p = shown(s, 3);
  const oldDirectors = s.crazy.directors.slice();
  const rotateAt = s.crazy.nextRotateAt;
  assert.ok(rotateAt > 0);
  V.advance(s, input(s, 0, { now: rotateAt }));
  assert.deepEqual(s.crazy.directors, oldDirectors);
  assert.equal(p.status, 'pending');
  assert.equal(act(s, 'crazySkip', 3, { promptId: p.id, now: rotateAt + 1 }), null);
  const retryAt = s.crazy.nextRotateAt;
  assert.equal(retryAt, rotateAt + 5000);
  V.advance(s, input(s, 0, { now: retryAt }));
  assert.deepEqual(s.crazy.directors, [2, 3]);
  assert.ok(s.crazy.nextRotateAt > retryAt);
  assert.equal(active(s).length, 0);
  assert.notEqual(V.submit(s, item('old-director', 1, 5), input(s, 1, { now: retryAt })), null);
  assert.equal(V.submit(s, item('new-director', 3, 5), input(s, 3, { now: retryAt })), null);
});

test('director style falls back to free below five active participants and restores safely', () => {
  const s = room({ count: 4, crazy: { playStyle: 'director' } });
  assert.equal(s.crazy.playStyle, 'director');
  assert.equal(s.crazy.effectivePlayStyle, 'free');
  assert.deepEqual(V.eligibleReceivers(s, input(s)), [1, 2, 3, 4]);
  assert.equal(V.submit(s, item('free-fallback', 3, 4), input(s, 3)), null);
  s.roster.push({ playerNum: 5, name: 'Person 5', active: true });
  V.init(s, input(s));
  assert.equal(s.crazy.effectivePlayStyle, 'director');
  assert.equal(s.crazy.directors.length, 2);
  assert.ok(s.crazy.directors.every(num => s.roster.some(player => player.playerNum === num && player.active !== false)));
});

test('presence, paused receivers and cooldown prevent delivery without consuming or losing queued cards', () => {
  const s = room({ state: { sharedControls: true } });
  s.phase = 'talking';
  s.crazy.receivers[3].paused = true;
  s.crazy.receivers[4].cooldownUntil = 4000;
  assert.deepEqual(V.eligibleReceivers(s, input(s, 0, { onlineNums: [3, 4, 5] })), [5]);
  const queued = item('offline-target', 1, 6);
  assert.equal(V.submit(s, queued, input(s)), null);
  V.advance(s, input(s, 0, { onlineNums: [1, 2, 5], now: 3000 }));
  assert.equal(active(s).length, 0);
  assert.equal(s.crazy.queue[0].id, queued.id);
  V.advance(s, input(s, 0, { onlineNums: [1, 2, 5, 6], now: 4000 }));
  assert.equal(own(s, 6).text, queued.text);
  assert.equal(s.crazy.queue.length, 0);
});

test('round deadline opens a decision and locks further handwriting and system delivery', () => {
  const s = room();
  s.phase = 'talking';
  s.gameDeadline = 5000;
  submit(s, item('keep-running', 1, 3));
  shown(s, 3);
  assert.equal(V.due(s, 4999), false);
  assert.equal(V.due(s, 5000), true);
  V.advance(s, input(s, 0, { now: 5000 }));
  assert.equal(s.crazy.roundStage, 'decision');
  assert.equal(s.crazy.decisionAt, 5000);
  assert.equal(own(s, 3).status, 'pending');
  assert.notEqual(V.submit(s, item('late-writing', 2, 4), input(s, 2, { now: 5000 })), null);
  assert.equal(V.maySystem(s, input(s, 0, { now: 5000 })), false);
  assert.equal(V.assign(s, { id: 'late-system', text: 'Late system.', source: 'system', kind: 'line' }, 4,
    input(s, 0, { now: 5000 })), false);
});

test('only 180, 300 and 600 second extensions work and expiry returns to the locked decision', () => {
  for (const seconds of [180, 300, 600]) {
    const s = room();
    s.phase = 'talking';
    decision(s);
    assert.notEqual(act(s, 'crazyExtend', 2, { seconds, now: 6000 }), null);
    assert.equal(act(s, 'crazyExtend', 0, { seconds, hostAuthorized: true, now: 6000 }), null);
    assert.equal(s.crazy.roundStage, 'extension');
    assert.equal(s.gameDeadline, 6000 + seconds * 1000);
    assert.notEqual(V.submit(s, item('locked-extension', 1, 3), input(s, 1, { now: 7000 })), null);
    V.advance(s, input(s, 0, { now: s.gameDeadline }));
    assert.equal(s.crazy.roundStage, 'decision');
    assert.equal(V.maySystem(s, input(s)), false);
  }
  for (const seconds of [0, 60, 179, 181, 301, 601, '180', 180.5]) {
    const s = room();
    s.phase = 'talking';
    decision(s);
    assert.notEqual(act(s, 'crazyExtend', 0, { seconds, hostAuthorized: true, now: 6000 }), null);
    assert.equal(s.crazy.roundStage, 'decision');
  }
});

test('draining lets pending tasks finish, then enters sorting without dispatching queued cards', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('finish-drain', 1, 3));
  const p = shown(s, 3);
  s.crazy.receivers[4].paused = true;
  submit(s, item('unused-drain', 2, 4));
  decision(s);
  assert.equal(act(s, 'crazyDrain', 0, { hostAuthorized: true, now: 6000 }), null);
  assert.equal(s.crazy.roundStage, 'draining');
  assert.equal(s.phase, 'talking');
  assert.equal(act(s, 'crazyDone', 3, { promptId: p.id, now: 6500 }), null);
  V.advance(s, input(s, 0, { now: 6500 }));
  assert.equal(s.crazy.roundStage, 'sorting');
  assert.equal(s.phase, 'ended');
  assert.equal(active(s).length, 0);
  assert.equal(s.scores[3], 1);
  assert.ok(!own(s, 4));
  assert.equal(V.maySystem(s, input(s)), false);
});

test('score order uses descending score with stable player number ties', () => {
  const s = room({ state: { scores: { 1: 2, 2: 5, 3: 2, 4: 0, 5: 5, 6: 1 } } });
  const result = V.view(s, 1, 2000).scoreOrder;
  assert.deepEqual(result, [
    { playerNum: 2, score: 5 }, { playerNum: 5, score: 5 },
    { playerNum: 1, score: 2 }, { playerNum: 3, score: 2 },
    { playerNum: 6, score: 1 }, { playerNum: 4, score: 0 }
  ]);
});

test('host delegate needs an authorized grant and offline claim waits 30 seconds after decision', () => {
  const s = room();
  s.phase = 'talking';
  decision(s);
  assert.notEqual(act(s, 'crazyDelegate', 1, { playerNum: 2, now: 6000 }), null);
  assert.notEqual(act(s, 'crazyClaimHost', 2, { hostOnline: false, now: 34999 }), null);
  assert.notEqual(act(s, 'crazyClaimHost', 2, { hostOnline: true, now: 35000 }), null);
  assert.equal(act(s, 'crazyClaimHost', 2, { hostOnline: false, now: 35000 }), null);
  assert.equal(s.crazy.hostDelegate, 2);
  assert.notEqual(act(s, 'crazyExtend', 3, { seconds: 180, now: 36000 }), null);
  assert.equal(act(s, 'crazyExtend', 2, { seconds: 180, now: 36000 }), null);
  assert.equal(act(s, 'crazyDelegate', 0, { playerNum: 4, hostAuthorized: true, now: 37000 }), null);
  assert.equal(s.crazy.hostDelegate, 4);
});

const vault = (s, num) => Object.values(s.crazyVault?.[identity(num)] || {});
const cards = s => Object.values(s.crazy.roundCards || {});

test('library CRUD requires verified identity, persists versions and isolates another owner', () => {
  const s = room();
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'IDENTITY REQUIRED' }), 'identity_unavailable');
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'MY PRIVATE LIBRARY', target: 3, actorIdentity: identity(1) }), null);
  let [card] = vault(s, 1);
  assert.ok(card.id);
  assert.equal(card.text, 'MY PRIVATE LIBRARY');
  assert.equal(card.target, 3);
  assert.equal(card.version, 1);
  assert.notEqual(act(s, 'crazyLibraryUpdate', 2, { cardId: card.id, text: 'STOLEN', actorIdentity: identity(2) }), null);
  assert.notEqual(act(s, 'crazyLibraryDelete', 2, { cardId: card.id, actorIdentity: identity(2) }), null);
  assert.equal(vault(s, 1)[0].text, 'MY PRIVATE LIBRARY');
  assert.equal(act(s, 'crazyLibraryUpdate', 1, { cardId: card.id, text: 'UPDATED PRIVATE LIBRARY', target: 4,
    actorIdentity: identity(1), now: 3000 }), null);
  [card] = vault(s, 1);
  assert.equal(card.text, 'UPDATED PRIVATE LIBRARY');
  assert.equal(card.target, 4);
  assert.equal(card.version, 2);
  assert.equal(act(s, 'crazyLibrarySend', 1, { cardId: card.id, target: 4, actorIdentity: identity(1), now: 4000 }), null);
  assert.equal(s.crazy.queue.length, 1);
  assert.equal(s.crazy.queue[0].text, card.text);
  assert.equal(s.crazy.queue[0].target, 4);
  assert.equal(s.crazy.queue[0].assignedBy, 1);
  assert.equal(act(s, 'crazyLibraryDelete', 1, { cardId: card.id, actorIdentity: identity(1), now: 5000 }), null);
  assert.equal(vault(s, 1)[0].deleted, true);
  assert.equal(vault(s, 1)[0].version, 3);
  assert.notEqual(act(s, 'crazyLibrarySend', 1, { cardId: card.id, actorIdentity: identity(1), now: 6000 }), null);
  assert.equal(s.crazy.queue.length, 1);
});

test('library ownership follows verified identity rather than reusing a player number', () => {
  const s = room();
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'ORIGINAL OWNER SECRET', actorIdentity: identity(1) }), null);
  const card = vault(s, 1)[0];
  assert.notEqual(act(s, 'crazyLibraryUpdate', 1, { cardId: card.id, text: 'NEW OCCUPANT',
    actorIdentity: identity(2), now: 3000 }), null);
  assert.equal(vault(s, 1)[0].text, 'ORIGINAL OWNER SECRET');
  assert.equal(act(s, 'crazyLibraryUpdate', 2, { cardId: card.id, text: 'OWNER ON A NEW SEAT',
    actorIdentity: identity(1), now: 4000 }), null);
  assert.equal(vault(s, 1)[0].text, 'OWNER ON A NEW SEAT');
  const owner = JSON.stringify(V.view(s, 2, 4000, { actorIdentity: identity(1) }));
  const replacement = JSON.stringify(V.view(s, 1, 4000, { actorIdentity: identity(2) }));
  assert.ok(owner.includes('OWNER ON A NEW SEAT'));
  assert.ok(!replacement.includes('OWNER ON A NEW SEAT'));
});

test('projections expose only the recipient task and the viewer own private library', () => {
  const s = room();
  s.phase = 'talking';
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'AUTHOR VAULT SECRET', actorIdentity: identity(1) }), null);
  submit(s, item('private-task', 1, 3, { text: 'RECIPIENT TASK SECRET' }), { actorIdentity: identity(1) });
  assert.equal(act(s, 'crazyLibrarySave', 2, { text: 'SECOND VAULT SECRET', actorIdentity: identity(2) }), null);
  const owner = JSON.stringify(V.view(s, 1, 3000, { actorIdentity: identity(1) }));
  const recipient = JSON.stringify(V.view(s, 3, 3000, { actorIdentity: identity(3) }));
  const other = JSON.stringify(V.view(s, 2, 3000, { actorIdentity: identity(2) }));
  const manager = JSON.stringify(V.view(s, 0, 3000, { hostAuthorized: true }));
  assert.ok(owner.includes('AUTHOR VAULT SECRET'));
  assert.ok(!owner.includes('SECOND VAULT SECRET'));
  assert.ok(recipient.includes('RECIPIENT TASK SECRET'));
  assert.ok(!recipient.includes('AUTHOR VAULT SECRET'));
  assert.ok(!recipient.includes('SECOND VAULT SECRET'));
  assert.ok(other.includes('SECOND VAULT SECRET'));
  assert.ok(!other.includes('AUTHOR VAULT SECRET'));
  assert.ok(!other.includes('RECIPIENT TASK SECRET'));
  for (const secret of ['AUTHOR VAULT SECRET', 'SECOND VAULT SECRET', 'RECIPIENT TASK SECRET']) {
    assert.ok(!manager.includes(secret));
  }
  for (const view of [owner, recipient, other, manager]) {
    assert.ok(!view.includes(identity(1)));
    assert.ok(!view.includes(identity(2)));
    assert.ok(!view.includes('crazyVault'));
    assert.ok(!view.includes('crazyIdentities'));
  }
});

test('sorting privately saves unconfirmed unused cards and reveals only confirmed public or executed cards', () => {
  const s = room();
  s.phase = 'talking';
  s.crazy.receivers[4].paused = true;
  s.crazy.receivers[5].paused = true;
  s.crazy.receivers[6].paused = true;
  submit(s, item('executed', 1, 3, { text: 'EXECUTED REVEAL' }), { actorIdentity: identity(1) });
  const used = shown(s, 3);
  assert.equal(act(s, 'crazySkip', 3, { promptId: used.id, now: 2300 }), null);
  submit(s, item('public-unused', 1, 4, { text: 'CONFIRMED UNUSED REVEAL' }), { actorIdentity: identity(1), now: 2500 });
  submit(s, item('private-unused', 1, 5, { text: 'AUTHOR ONE PRIVATE KEEP' }), { actorIdentity: identity(1), now: 2600 });
  submit(s, item('unconfirmed-unused', 2, 6, { text: 'AUTHOR TWO PRIVATE UNCONFIRMED' }), { actorIdentity: identity(2), now: 2700 });
  decision(s);
  assert.equal(act(s, 'crazyDrain', 0, { hostAuthorized: true, now: 6000 }), null);
  V.advance(s, input(s, 0, { now: 6000 }));
  assert.equal(s.crazy.roundStage, 'sorting');
  assert.equal(s.phase, 'ended');
  assert.ok(vault(s, 2).some(card => card.text === 'AUTHOR TWO PRIVATE UNCONFIRMED' && !card.deleted));
  const keep = cards(s).find(card => card.commandId === 'private-unused');
  const publish = cards(s).find(card => card.commandId === 'public-unused');
  assert.ok(keep?.id);
  assert.equal(act(s, 'crazySort', 1, { saveIds: [keep.id], actorIdentity: identity(1), now: 7000 }), null);
  assert.ok(vault(s, 1).some(card => card.text === 'AUTHOR ONE PRIVATE KEEP' && !card.deleted));
  assert.equal(s.crazyVault[identity(1)][publish.id].deleted, true);
  V.advance(s, input(s, 0, { now: 7500 }));
  assert.equal(s.crazyVault[identity(1)][publish.id].deleted, true);
  assert.notEqual(act(s, 'crazyReveal', 2, { now: 8000 }), null);
  assert.equal(act(s, 'crazyReveal', 0, { hostAuthorized: true, now: 8000 }), null);
  assert.equal(s.crazy.roundStage, 'reveal');
  for (const num of [0, 1, 2, 3, 4]) {
    const visible = JSON.stringify(V.view(s, num, 8000, num === 0 ? { hostAuthorized: true } : {}));
    assert.ok(visible.includes('EXECUTED REVEAL'));
    assert.ok(visible.includes('CONFIRMED UNUSED REVEAL'));
    if (num !== 1) assert.ok(!visible.includes('AUTHOR ONE PRIVATE KEEP'));
    if (num !== 2) assert.ok(!visible.includes('AUTHOR TWO PRIVATE UNCONFIRMED'));
  }
});

test('private archive deltas contain safe events and versioned vault records without losing newer edits', () => {
  const s = room();
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'VAULT ARCHIVE SECRET', actorIdentity: identity(1) }), null);
  submit(s, item('archive-card', 1, 3, { text: 'TASK ARCHIVE SECRET' }), { actorIdentity: identity(1) });
  const initial = V.archiveRecords(s);
  const events = initial.filter(record => record.category === 'event');
  const saved = initial.find(record => record.category === 'vault');
  assert.ok(events.length >= 2);
  assert.ok(saved);
  assert.equal(saved.text, 'VAULT ARCHIVE SECRET');
  assert.equal(saved.version, 1);
  for (const event of events) {
    assert.ok(!JSON.stringify(event).includes('VAULT ARCHIVE SECRET'));
    assert.ok(!JSON.stringify(event).includes('TASK ARCHIVE SECRET'));
  }
  const oldAcks = initial.map(({ id, version }) => ({ id, version }));
  V.ackRecords(s, oldAcks);
  assert.deepEqual(V.archiveRecords(s), []);
  const cardId = vault(s, 1)[0].id;
  assert.equal(act(s, 'crazyLibraryUpdate', 1, { cardId, text: 'NEWER VAULT EDIT', actorIdentity: identity(1), now: 3000 }), null);
  V.ackRecords(s, oldAcks);
  const newer = V.archiveRecords(s).find(record => record.category === 'vault');
  assert.equal(newer.version, 2);
  assert.equal(newer.text, 'NEWER VAULT EDIT');
  V.ackRecords(s, [{ id: newer.id, version: 999 }]);
  assert.ok(V.archiveRecords(s).some(record => record.id === newer.id && record.version === 2));
  const all = V.archiveRecords(s).map(({ id, version }) => ({ id, version }));
  V.ackRecords(s, all);
  assert.deepEqual(V.archiveRecords(s), []);
  const backlog = room();
  for (let i = 0; i < 205; i++) {
    assert.equal(act(backlog, 'crazyReceive', 1, { paused: i % 2 === 0, now: 10000 + i }), null);
  }
  assert.equal(backlog.crazy.events.length, 205);
  const pending = V.archiveRecords(backlog).filter(record => record.category === 'event');
  assert.equal(pending.length, 205);
  V.ackRecords(backlog, pending.map(({ id, version }) => ({ id, version })));
  assert.equal(backlog.crazy.events.length, 200);
  assert.deepEqual(V.archiveRecords(backlog), []);
  assert.ok(backlog.crazy.events.every(record => record.persistedVersion === record.version));
});

test('a new identity on the same seat cannot see or confirm another owner unused round cards', () => {
  const s = room();
  submit(s, item('old-owner-unused', 1, 3, { text: 'PREVIOUS IDENTITY ROUND SECRET' }),
    { actorIdentity: identity(1) });
  const card = cards(s).find(record => record.commandId === 'old-owner-unused');
  V.closeRound(s, input(s, 0, { now: 5000 }));
  assert.equal(s.crazy.roundStage, 'sorting');
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'NEW IDENTITY LIBRARY', actorIdentity: identity(2), now: 6000 }), null);
  const replacementView = JSON.stringify(V.view(s, 1, 6000, { actorIdentity: identity(2) }));
  assert.ok(!replacementView.includes('PREVIOUS IDENTITY ROUND SECRET'));
  assert.notEqual(act(s, 'crazySort', 1, { saveIds: [card.id], actorIdentity: identity(2), now: 7000 }), null);
  assert.equal(card.publish, false);
  assert.equal(card.ownerIdentity, identity(1));
  assert.ok(vault(s, 1).some(record => record.text === 'PREVIOUS IDENTITY ROUND SECRET' && !record.deleted));
  assert.equal(act(s, 'crazySort', 1, { saveIds: [card.id], actorIdentity: identity(1), now: 8000 }), null);
  assert.equal(act(s, 'crazyReveal', 0, { hostAuthorized: true, now: 9000 }), null);
  for (const num of [0, 2, 3, 4]) {
    assert.ok(!JSON.stringify(V.view(s, num, 9000)).includes('PREVIOUS IDENTITY ROUND SECRET'));
  }
});

test('departing participants cancel their received and queued cards without reviving or stealing delivered tasks', () => {
  const s = room();
  s.phase = 'talking';
  submit(s, item('departing-received', 1, 3));
  submit(s, item('departing-delivered', 3, 4));
  const received = shown(s, 3), delivered = shown(s, 4);
  submit(s, item('fixed-departing-target', 1, 3));
  submit(s, item('departing-author-queue', 3, 4));
  s.crazy.receivers[5].paused = true;
  submit(s, item('unrelated-queue', 2, 5));
  s.crazy.hostDelegate = 3;
  s.roster.find(player => player.playerNum === 3).active = false;
  assert.equal(V.cancelMember(s, 3, input(s, 0, { now: 3000 })), true);
  assert.equal(received.status, 'cancelled');
  assert.equal(delivered.status, 'pending');
  assert.deepEqual(s.crazy.queue.map(card => card.id), ['unrelated-queue']);
  assert.equal(s.crazy.hostDelegate, null);
  const statuses = Object.fromEntries(cards(s).map(card => [card.commandId, card.status]));
  assert.equal(statuses['departing-received'], 'cancelled');
  assert.equal(statuses['fixed-departing-target'], 'cancelled');
  assert.equal(statuses['departing-author-queue'], 'cancelled');
  assert.equal(statuses['departing-delivered'], 'pending');
  const cancellationEvents = s.crazy.events.filter(event => event.type === 'cancelled');
  assert.equal(cancellationEvents.length, 3);
  assert.ok(cancellationEvents.every(event => event.reason === 'participant_away'));
  V.init(s, input(s, 0, { now: 4000 }));
  V.advance(s, input(s, 0, { now: 4000 }));
  assert.equal(own(s, 3).status, 'cancelled');
  assert.equal(own(s, 4).status, 'pending');
  assert.deepEqual(s.crazy.queue.map(card => card.id), ['unrelated-queue']);
  assert.equal(V.cancelMember(s, 3, input(s, 0, { now: 4000 })), false);
  assert.equal(s.crazy.events.filter(event => event.type === 'cancelled').length, 3);
});

test('Firebase empty-container omission and numeric maps remain safe for idle reads and private delivery', () => {
  const wire = value => {
    if (value == null) return undefined;
    if (typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([key, item]) => [key, wire(item)]).filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  };
  const initial = room();
  initial.phase = 'talking';
  initial.gameDeadline = 200000;
  let s = wire(initial);
  assert.equal(s.crazy.queue, undefined);
  assert.equal(s.crazy.offers, undefined);
  assert.equal(V.due(s, 2000), false);
  assert.equal(V.maySystem(s, input(s)), false);
  assert.deepEqual(V.eligibleReceivers(s, input(s)), [1, 2, 3, 4, 5, 6]);
  assert.equal(V.view(s, 3, 2000).prompt, null);
  submit(s, item('wire-private', 1, 3));
  s = wire(s);
  assert.equal(V.due(s, 3000), false);
  assert.equal(V.view(s, 3, 3000).prompt.text, 'The royal soup says wire-private.');
  assert.ok(!JSON.stringify(V.view(s, 2, 3000)).includes('The royal soup says wire-private.'));
  assert.equal(act(s, 'crazyRendered', 3, { promptId: own(s, 3).id, renderVersion: 1, now: 3000 }), null);
  assert.equal(own(s, 3).renderAckAt, 3000);
});

test('dispatch diagnostics report changing blockers once and the host summary contains only counts', () => {
  const s = room({ crazy: { maxActive: 1 } });
  s.phase = 'talking';
  submit(s, item('occupy-slot', 1, 3));
  submit(s, item('blocked-capacity', 2, 4));
  submit(s, item('blocked-recipient', 2, 3));
  const blocked = s.crazy.events.filter(e => e.type === 'dispatch_blocked');
  assert.ok(blocked.some(e => e.reason === 'capacity'));
  assert.ok(blocked.some(e => e.reason === 'recipient_busy'));
  const before = JSON.stringify(s);
  assert.equal(V.advance(s, input(s, 0, { now: 2500 })), false);
  assert.equal(JSON.stringify(s), before, 'polling an unchanged blocker has no journal or state write');
  const host = V.view(s, 0, 2500, { hostAuthorized: true, onlineNums: [1, 2, 3, 4, 5, 6],
    connectionByNum: { 3: 'online', 4: 'offline' } });
  assert.deepEqual(host.summary, { queued: 2, pending: 1, blocked: 2 });
  assert.equal(host.hostSummary.blocked, 2); assert.equal(host.hostSummary.offline, 1);
  assert.equal(V.view(s, 2, 2500).summary, null);
  for (const record of V.archiveRecords(s).filter(r => r.category === 'event')) {
    assert.ok(record.eventType); assert.equal(record.metadata, undefined);
    for (const secret of ['occupy-slot', 'blocked-capacity', 'blocked-recipient']) assert.ok(!record.text.includes(secret));
  }
  const pending = own(s, 3);
  assert.equal(act(s, 'crazyDone', 3, { promptId: pending.id, now: 2600 }), null);
  assert.equal(own(s, 4).status, 'pending');
  assert.ok(s.crazy.events.some(e => e.type === 'dispatch_attempt' && e.cardId === s.crazy.prompts[4].archiveId));
});

test('public sorting and vault IDs stay compact and never disclose canonical archive IDs after many topics', () => {
  const s = room({ state: { sessionId: 'long-session-' + 'x'.repeat(2400) } });
  submit(s, item('hidden-archive-id', 1, 3, { text: 'LONG ROUND PRIVATE CARD' }), { actorIdentity: identity(1) });
  const card = cards(s)[0];
  assert.ok(card.archiveId.length > 2400);
  assert.match(card.id, /^card:[a-f0-9]{32}$/);
  assert.equal(act(s, 'crazyDrain', 0, { hostAuthorized: true, now: 3000 }), null);
  const saved = vault(s, 1)[0];
  assert.equal(saved.id, card.id); assert.ok(saved.id.length < 1024);
  const privateView = V.view(s, 1, 3000, { actorIdentity: identity(1) });
  assert.equal(privateView.unusedCards[0].id, card.id);
  assert.ok(JSON.stringify(privateView).includes(card.text));
  assert.ok(!JSON.stringify(privateView).includes(card.archiveId));
  assert.ok(!JSON.stringify(privateView).includes(identity(1)));
  const changedIdentity = V.view(s, 1, 3000, { actorIdentity: identity(2) });
  assert.deepEqual(changedIdentity.library, []); assert.deepEqual(changedIdentity.unusedCards, []);
  assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'NEW SHORT LIBRARY ID', actorIdentity: identity(1), now: 3001 }), null);
  assert.ok(vault(s, 1).every(v => v.id.length < 1024));
});

test('library identifiers cannot mutate object prototypes or access inherited records', () => {
  const s = room();
  for (const cardId of ['__proto__', 'constructor', 'prototype']) {
    assert.equal(act(s, 'crazyLibrarySave', 1, { cardId, text: 'Forbidden key', actorIdentity: identity(1) }), 'invalid_card');
    assert.equal(act(s, 'crazyLibraryUpdate', 1, { cardId, text: 'Forbidden edit', actorIdentity: identity(1) }), 'invalid_card');
  }
  assert.equal(Object.prototype.text, undefined); assert.equal(Object.prototype.version, undefined);
  assert.deepEqual(vault(s, 1), []);
});

test('resending a saved fixed-target card defaults to random unless a target is explicitly selected', () => {
  const recipients = new Set();
  for (let index = 0; index < 12; index++) {
    const s = room();
    assert.equal(act(s, 'crazyLibrarySave', 1, { text: 'Random resend from my library.', target: 4, actorIdentity: identity(1) }), null);
    const saved = vault(s, 1)[0];
    assert.equal(saved.target, 4);
    assert.equal(act(s, 'crazyLibrarySend', 1, { cardId: saved.id, actorIdentity: identity(1), now: 3000,
      seed: Math.imul(index + 1, 2654435761) >>> 0 }), null);
    assert.equal(s.crazy.queue[0].target, null);
    assert.equal(saved.target, 4, 'stored metadata survives without controlling the current chooser');
    s.phase = 'talking';
    V.advance(s, input(s, 0, { now: 3000, seed: Math.imul(index + 1, 2654435761) >>> 0 }));
    const recipient = V.activeNums(s)[0];
    assert.ok([2, 3, 4, 5, 6].includes(recipient)); recipients.add(recipient);
  }
  assert.ok(recipients.size > 1, 'default resend uses the supplied random seed, not the former fixed target');
});

test('dense Firebase numeric mailboxes discard null slots without dropping active tasks or offers', () => {
  const s = room({ crazy: { source: 'mixed' } });
  s.phase = 'talking';
  const system = { id: 'system', source: 'system', kind: 'task', text: 'A genuine system mission.' };
  assert.equal(V.assign(s, system, 1, input(s, 0)), true);
  assert.equal(V.assign(s, { ...system, id: 'second-system' }, 2, input(s, 0)), true);
  submit(s, item('numeric-offer', 3, 2));
  const offerId = s.crazy.offers[2].id, taskIds = V.activeNums(s).map(num => s.crazy.prompts[num].id);
  s.crazy.prompts = [null, clone(s.crazy.prompts[1]), clone(s.crazy.prompts[2])];
  s.crazy.receivers = [null, clone(s.crazy.receivers[1]), clone(s.crazy.receivers[2]), clone(s.crazy.receivers[3])];
  s.crazy.offers = [null, null, clone(s.crazy.offers[2])];
  assert.doesNotThrow(() => V.init(s, input(s, 0, { now: 2500 })));
  assert.deepEqual(V.activeNums(s).map(num => s.crazy.prompts[num].id), taskIds);
  assert.equal(V.view(s, 2, 2500).offer.id, offerId);
  assert.equal(act(s, 'crazyRendered', 2, { promptId: s.crazy.prompts[2].id, renderVersion: 1, now: 2500 }), null);
});

test('a preparation reset privately retains accepted unused cards across sessions under the original owner', () => {
  const s = room();
  submit(s, item('prepared-reset', 1, 3, { text: 'MY UNUSED PREPARATION SECRET' }),
    { actorIdentity: identity(1), now: 2200 });
  submit(s, item('unknown-owner-reset', 2, 4, { text: 'UNKNOWN OWNER PRIVATE SECRET' }), { now: 2300 });
  const original = cards(s).find(card => card.commandId === 'prepared-reset');
  const originalVersion = original.version;
  assert.equal(V.preserveUnusedForReset(s, input(s, 0, { now: 5000, identityByNum: { 1: identity(3) } })), true);
  assert.equal(s.phase, 'thinking'); assert.equal(s.crazy.roundStage, 'open');
  assert.deepEqual(s.crazy.queue, []); assert.deepEqual(s.crazy.offers, {});
  assert.equal(original.status, 'cancelled'); assert.equal(original.version, originalVersion + 1);
  assert.equal(original.createdAt, 2000); assert.equal(original.closedAt, 5000);
  assert.equal(original.ownerIdentity, identity(1)); assert.equal(original.publish, false);
  assert.equal(vault(s, 1)[0].text, 'MY UNUSED PREPARATION SECRET');
  assert.deepEqual(vault(s, 3), []);
  const cancellationEvents = s.crazy.events.filter(event => event.reason === 'round_reset');
  assert.equal(cancellationEvents.length, 2);
  assert.ok(!JSON.stringify(cancellationEvents).includes('SECRET'));
  const once = clone(s);
  assert.equal(V.preserveUnusedForReset(s, input(s, 0, { now: 6000 })), false);
  assert.deepEqual(s, once, 'retries neither duplicate vault records nor change their versions');

  const next = room({ state: { sessionId: 'next-private-round', crazyVault: clone(s.crazyVault),
    crazyIdentities: { 1: identity(1), 2: identity(2), 3: identity(3) } } });
  assert.equal(V.view(next, 1, 7000, { actorIdentity: identity(1) }).library[0].text, 'MY UNUSED PREPARATION SECRET');
  for (const num of [0, 2, 3, 4]) {
    const projected = JSON.stringify(V.view(next, num, 7000, { actorIdentity: identity(num) }));
    assert.ok(!projected.includes('MY UNUSED PREPARATION SECRET'));
    assert.ok(!projected.includes('UNKNOWN OWNER PRIVATE SECRET'));
  }
  const persisted = V.archiveRecords(s).filter(record => record.category === 'vault');
  assert.equal(persisted.length, 1); assert.equal(persisted[0].ownerIdentity, identity(1));
});

test('reset retention preserves prior library edits, deletion tombstones and confirmed public choices', () => {
  const s = room();
  for (const [id, target] of [['edited-reset', 3], ['deleted-reset', 4], ['published-reset', 5]]) {
    submit(s, item(id, 1, target), { actorIdentity: identity(1) });
  }
  const [edited, deleted, published] = cards(s);
  s.crazyVault[identity(1)] = {
    [edited.id]: { id: edited.id, text: 'MY LATER EDIT', target: null, version: 7, persistedVersion: 6,
      deleted: false, createdAt: 2500, updatedAt: 4000 },
    [deleted.id]: { id: deleted.id, text: deleted.text, target: 4, version: 9, persistedVersion: 9,
      deleted: true, createdAt: 2500, updatedAt: 4500 }
  };
  published.status = 'cancelled'; published.publish = true;
  s.crazy.sortConfirmed[identity(1)] = true;
  const existing = clone(s.crazyVault);
  assert.equal(V.preserveUnusedForReset(s, input(s, 0, { now: 5000 })), true);
  assert.deepEqual(s.crazyVault, existing);
  assert.equal(edited.vaultSavedIdentity, identity(1));
  assert.equal(deleted.vaultSavedIdentity, identity(1));
  assert.equal(published.publish, true); assert.equal(published.vaultSavedIdentity, undefined);
  assert.equal(Object.values(s.crazyVault[identity(1)]).length, 2);
});

test('reset retention cannot cancel or copy a live mission', () => {
  const s = room(); s.phase = 'talking';
  submit(s, item('live-reset-guard', 1, 3), { actorIdentity: identity(1) });
  const before = clone(s);
  assert.equal(V.preserveUnusedForReset(s, input(s, 0, { now: 5000 })), false);
  assert.deepEqual(s, before);
  assert.equal(own(s, 3).status, 'pending'); assert.deepEqual(vault(s, 1), []);
});
