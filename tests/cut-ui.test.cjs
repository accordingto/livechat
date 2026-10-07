const test = require('node:test');
const assert = require('node:assert/strict');
const UI = require('../cut-ui.js');
const sample = (extra = {}) => ({
  sessionId: 'session', turnId: 1, phase: 'speaking', speaker: 1,
  topic: { question: 'I opened the door and saw…' },
  roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Jason', active: true }],
  ...extra,
});

test('speaking UI has no countdown, next-player reveal, or hidden timing fields', () => {
  const html = UI.scene(sample({ deadline: 1234567, speakingDurationMs: 9123, nextSpeaker: 2, targetCuts: 7 }), 1, 1000);
  assert.match(html, /Amy/);
  assert.doesNotMatch(html, /Jason|data-cut-countdown|1234567|9123|progress|targetCuts/);
  assert.match(html, /cut-is-you/);
});

test('CUT reveals the next name only after interruption and final CUT leaves no phantom speaker', () => {
  const cut = sample({ phase: 'cut', nextSpeaker: 2, cutEvent: { id: 'c1', final: false } });
  assert.match(UI.scene(cut, 2), /CUT!.*Jason/s);
  assert.doesNotMatch(UI.scene(cut), /data-cut-countdown/);
  const final = UI.scene(sample({ phase: 'cut', nextSpeaker: null, cutEvent: { id: 'last', final: true } }));
  assert.match(final, /CUT!/); assert.doesNotMatch(final, /cut-speaker/);
});

test('prep counts down while paused and stopped have no countdown', () => {
  const prep = sample({ phase: 'handoff', nextSpeaker: 2, phaseUntil: 4000 });
  assert.equal(UI.countdown(prep, 1100), 3);
  assert.match(UI.scene(prep, 2, 1100), /data-cut-countdown[^>]*>3</);
  for (const phase of ['paused', 'stopped', 'break']) assert.doesNotMatch(UI.scene(sample({ phase, phaseUntil: 4000 })), /data-cut-countdown/);
});

test('topic and player names are escaped on host and player surfaces', () => {
  const html = UI.scene(sample({ topic: { question: '<img onerror="bad()">' }, roster: [{ playerNum: 1, name: '<script>bad()</script>' }] }));
  assert.doesNotMatch(html, /<script|<img/); assert.match(html, /&lt;img/); assert.match(html, /&lt;script/);
});

test('sound cues run once per CUT event and never replay upon reconnect or roster updates', () => {
  const sound = new UI.Sound(), cues = [];
  sound.cue = cue => cues.push(cue);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 1000, true);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 1100);
  sound.update(sample({ phase: 'countdown', phaseUntil: 4000 }), 2100);
  sound.update(sample({ turnId: 2 }), 4000);
  const cut = sample({ turnId: 3, phase: 'cut', nextSpeaker: 2, cutEvent: { id: 'cut-1', final: false } });
  sound.update(cut, 9000); sound.update(cut, 9100);
  sound.update({ ...cut, turnId: 4 }, 9200);
  assert.equal(cues.filter(c => c === 'cut').length, 1);
  assert.equal(cues.filter(c => c === 'reveal').length, 1);
  assert.equal(cues.filter(c => c === 'go').length, 1);
  const restored = new UI.Sound(), old = [];
  restored.cue = cue => old.push(cue);
  restored.update(cut, 9100); restored.update(cut, 9200);
  assert.deepEqual(old, []);
  const passive = new UI.Sound(), passiveCues = [];
  passive.cue = cue => passiveCues.push(cue);
  passive.update(sample(), 4000, false, false);
  passive.update(cut, 9000, false, false);
  passive.update({ ...cut, turnId: 4 }, 9200, false, true);
  assert.deepEqual(passiveCues, []);
  passive.close();
  sound.close(); restored.close();
});

test('card heartbeat preserves current DOM and destroy clears its only paint interval', () => {
  let html = '', writes = 0, intervalCount = 0, clears = 0;
  const element = { get innerHTML() { return html; }, set innerHTML(value) { html = value; writes++; }, querySelector() { return null; } };
  const originalSet = global.setInterval, originalClear = global.clearInterval;
  global.setInterval = () => { intervalCount++; return 42; };
  global.clearInterval = id => { assert.equal(id, 42); clears++; };
  try {
    const card = new UI.Card(element, { nameBanner: () => '<span>Amy</span>', now: () => 1000 });
    const payload = { playerNum: 1, name: 'Amy', cut: sample() };
    card.update(payload); card.update({ ...payload, cut: { ...payload.cut, hostLiveUntil: 5000, revision: 2 } });
    assert.equal(writes, 1); assert.equal(intervalCount, 1);
    card.destroy(); card.update(payload); assert.equal(writes, 1); assert.equal(clears, 1);
  } finally { global.setInterval = originalSet; global.clearInterval = originalClear; }
});
