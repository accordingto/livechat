// Disposable production RPC smoke for CUT's 🎃 Halloween edition. Same safety
// model as cut-jump-production-smoke.cjs: four exact fresh token nodes only,
// conditional writes, no browser host, no room listing, no user-room reads,
// no credential logs, and ownership-checked conditional cleanup.
// It proves the deployed service runs the edition-aware engine: the edition is
// projected to every card, new topics come from the Halloween pools in both
// modes, changing the edition opens the other pool, invalid editions are
// refused, and a restart keeps the edition. It also proves both selectable
// topic styles, their real next-topic pools and both style-preserving restarts.
// Room audio adds six narrowly scoped host RPCs on the same owned fixture;
// ordinary player attempts must be denied without changing game acknowledgements.
'use strict';
const { randomBytes } = require('node:crypto');
const CUT = require('../cut-engine.js');
const H = require('../cut-halloween-topics.js');
const T = require('../cut-topics.js');
const J = require('../cut-jump-topics.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const uid = () => randomBytes(16).toString('hex');
const fail = () => { throw new Error('smoke_failed'); };
const must = value => { if (!value) fail(); };
const takeIds = new Set(H.take.items.map(topic => topic.id));
const jumpIds = new Set(H.jump.items.map(topic => topic.id));
const storyTakeIds = new Set(H.storyOpenings.take.items.map(topic => topic.id));
const storyJumpIds = new Set(H.storyOpenings.jump.items.map(topic => topic.id));
const classicTakeIds = new Set(T.items.map(topic => topic.id));
const classicJumpIds = new Set(J.items.map(topic => topic.id));
async function run({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const fixtures = [], attempted = new Set();
  const report = { ok: false, passed: 0, step: 'initial', phase: 'initializing', topics: [], topicStyles: [], cleaned: 0, cleanupFailed: 0 };
  const check = value => { must(value); report.passed++; };
  async function http(url, options = {}) {
    return fetchImpl(url, { credentials: 'omit', signal: AbortSignal.timeout(20000), ...options });
  }
  async function api(body, expectedError = '') {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (expectedError) { must(!response.ok && data.error === expectedError); return data; }
    must(response.ok); return data;
  }
  function fixture(startTime) {
    const game = 'cut', code = 'HX' + randomBytes(4).toString('hex').toUpperCase(), marker = uid(), controlToken = uid();
    const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: randomBytes(10).toString('hex') }));
    const initialSession = code + '-' + game;
    const path = num => 'rooms/' + code + '/players/' + (num === 0 ? controlToken : seats[num - 1].token);
    const known = new Set([path(0), ...seats.map(s => path(s.playerNum))]);
    const state = CUT.create({ id: initialSession, now: startTime, seed: randomBytes(4).readUInt32LE(), edition: 'halloween',
      roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Smoke participant ' + s.playerNum })),
      speed: 'custom', category: 'mixed', customMinSeconds: 5, customMaxSeconds: 5 });
    const owned = (node, num) => node?.qaSmoke?.marker === marker && node.qaSmoke.game === game && node.game === game &&
      (num === 0 ? (node.state || (node.stateJson ? JSON.parse(node.stateJson) : null))?.sessionId === initialSession
        : node.playerNum === num && node.cut?.sessionId === initialSession);
    const f = { game, code, marker, controlToken, seats, state, initialSession, path, known, owned }; fixtures.push(f); return f;
  }
  async function read(f, num) {
    const path = f.path(num); must(f.known.has(path));
    const response = await http(DATABASE + '/' + path + '.json', { headers: { 'X-Firebase-ETag': 'true' } });
    must(response.ok); const etag = response.headers.get('etag'); must(etag);
    return { value: await response.json(), etag };
  }
  async function write(f, num, change, create = false) {
    const path = f.path(num); must(f.known.has(path));
    for (let i = 0; i < 5; i++) {
      const old = await read(f, num);
      if (create) must(old.value === null); else must(f.owned(old.value, num));
      const value = change(old.value); attempted.add(path);
      const response = await http(DATABASE + '/' + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': old.etag }, body: JSON.stringify(value) });
      if (response.status === 412 && !create) continue;
      must(response.ok); return;
    }
    fail();
  }
  async function open(f) {
    // Each write proves this exact node was null immediately before creation.
    await write(f, 0, () => ({ game: f.game, stateJson: JSON.stringify(f.state), revision: 1, qaSmoke: { marker: f.marker, game: f.game } }), true);
    for (const seat of f.seats) await write(f, seat.playerNum, () => ({ ...CUT.view(f.state, seat.playerNum, now()), qaSmoke: { marker: f.marker, game: f.game } }), true);
    // The sole management-credential request for this fixture.
    await api({ operation: 'register', game: f.game, code: f.code, controlToken: f.controlToken, sessionId: f.initialSession, seats: f.seats });
  }
  async function card(f, num) {
    const value = (await read(f, num)).value; must(f.owned(value, num));
    const s = value.cut;
    must(value.hubExecutor?.v === 1 && value.hubExecutor.game === f.game && value.hubExecutor.sessionId === s.sessionId);
    must(s.sharedControls === true);
    const serialized = JSON.stringify(value);
    must(!serialized.includes(JSON.stringify(f.controlToken)));
    for (const other of f.seats.filter(seat => seat.playerNum !== num)) must(!serialized.includes(JSON.stringify(other.token)));
    for (const field of ['deadline', 'speakingDurationMs', 'pendingDurationMs', 'stats', 'recent', 'topicHistory', 'jumpTopicHistory', 'audioSeen', 'audioReplies', 'audioLastScare', 'audioUpdatedAt']) must(!Object.hasOwn(s, field));
    report.phase = 'cut:' + s.phase; return value;
  }
  async function command(f, num, type, extra = {}, expectedError = '') {
    const value = await card(f, num), s = value.cut;
    const action = { id: uid(), type, sessionId: s.sessionId, turnId: s.turnId, ...extra };
    await write(f, num, old => ({ ...old, cutAction: action }));
    await api({ operation: 'execute', capsule: value.hubExecutor.capsule, token: f.seats[num - 1].token });
    const next = await card(f, num), reply = ['audioSettings', 'audioEffect'].includes(type) ? next.cut.audioReply : next.cut.reply;
    check(reply?.id === action.id && (reply.error || '') === expectedError); return next;
  }
  const audioSnapshot = audio => ({ version: audio?.version, revision: audio?.revision,
    music: audio?.music ?? null, musicStartedAt: audio?.musicStartedAt ?? null,
    musicVolume: audio?.musicVolume, effectsVolume: audio?.effectsVolume, autoScare: audio?.autoScare,
    cutEffect: audio?.cutEffect, event: audio?.event ? { id: audio.event.id, at: audio.event.at, key: audio.event.key } : null });
  function withoutAudio(state) {
    const copy = JSON.parse(JSON.stringify(state));
    for (const key of Object.keys(copy)) if (key.startsWith('audio')) delete copy[key];
    return copy;
  }
  async function hostAudio(f, type, extra = {}, expectedError = '') {
    const value = await card(f, 1), before = (await read(f, 0)).value;
    must(f.owned(before, 0)); const prior = JSON.parse(before.stateJson);
    const action = { id: uid(), type, sessionId: value.cut.sessionId, turnId: -1, ...extra };
    await api({ operation: 'execute', capsule: value.hubExecutor.capsule, token: f.controlToken, command: action });
    const after = (await read(f, 0)).value; must(f.owned(after, 0)); const next = JSON.parse(after.stateJson);
    check(next.audioReplies?.[0]?.id === action.id && (next.audioReplies[0].error || '') === expectedError);
    check(JSON.stringify(withoutAudio(next)) === JSON.stringify(withoutAudio(prior)));
    return next;
  }
  const note = value => {
    report.topics.push(value.cut.edition + '/' + (value.cut.mode || 'classic') + ':' + value.cut.topic?.id);
    report.topicStyles.push(value.cut.topicStyle);
  };
  try {
    const readiness = await http(SERVICE); must(readiness.ok && (await readiness.json()).ready === true);
    const serverTime = Date.parse(readiness.headers.get('date'));
    const cut = fixture(Number.isFinite(serverTime) ? serverTime - 1000 : now() - 1000); await open(cut);
    report.step = 'halloween-opening';
    for (const seat of cut.seats) {
      const value = await card(cut, seat.playerNum);
      check(value.cut.edition === 'halloween' && JSON.stringify(value.cut.editions) === '["classic","halloween"]');
      check(value.cut.topicStyle === 'situations' && JSON.stringify(value.cut.topicStyles) === '["situations","story_openings"]');
      check(takeIds.has(value.cut.topic.id) && /…$/.test(value.cut.topic.starter || ''));
    }
    let value = await card(cut, 2); note(value); const first = value.cut.topic.id;
    report.step = 'halloween-next-topic';
    // Only the deployed edition-aware engine can draw the next topic from the Halloween pool.
    await command(cut, 2, 'endTopic');
    value = await command(cut, 3, 'next'); note(value);
    check(value.cut.edition === 'halloween' && takeIds.has(value.cut.topic.id) && value.cut.topic.id !== first);
    report.step = 'halloween-mode-2';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { mode: 'jump', edition: 'halloween' }); note(value);
    check(value.cut.mode === 'jump' && value.cut.edition === 'halloween' && value.cut.phase === 'ready' && jumpIds.has(value.cut.topic.id));
    report.step = 'switch-to-classic';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { edition: 'classic', mode: 'jump' }); note(value);
    check(value.cut.mode === 'jump' && value.cut.edition === 'classic' && classicJumpIds.has(value.cut.topic.id));
    report.step = 'invalid-edition';
    await command(cut, 2, 'settings');
    await command(cut, 3, 'configure', { edition: 'spooky', mode: 'jump' }, 'invalid_options');
    value = await command(cut, 2, 'cancelSettings'); check(value.cut.edition === 'classic' && value.cut.phase === 'ready');
    report.step = 'back-to-halloween-take-over';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { edition: 'halloween', mode: 'classic' }); note(value);
    check(value.cut.mode === 'classic' && value.cut.edition === 'halloween' && takeIds.has(value.cut.topic.id) && !classicTakeIds.has(value.cut.topic.id));
    report.step = 'restart-keeps-edition';
    value = await command(cut, 2, 'restart'); note(value);
    check(value.cut.edition === 'halloween' && takeIds.has(value.cut.topic.id));
    for (const seat of cut.seats) { const other = await card(cut, seat.playerNum); check(other.cut.edition === 'halloween' && other.cut.topic.id === value.cut.topic.id); }
    report.step = 'story-openings-mode-1';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { topicStyle: 'story_openings' }); note(value);
    check(value.cut.topicStyle === 'story_openings' && value.cut.phase === 'ready' && storyTakeIds.has(value.cut.topic.id));
    for (const seat of cut.seats) { const other = await card(cut, seat.playerNum); check(other.cut.topicStyle === 'story_openings' && other.cut.topic.id === value.cut.topic.id); }
    const firstStory = value.cut.topic.id;
    report.step = 'story-openings-next-topic';
    await command(cut, 2, 'endTopic');
    value = await command(cut, 3, 'next'); note(value);
    check(value.cut.topicStyle === 'story_openings' && storyTakeIds.has(value.cut.topic.id) && value.cut.topic.id !== firstStory);
    report.step = 'story-openings-mode-2';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { mode: 'jump' }); note(value);
    check(value.cut.topicStyle === 'story_openings' && value.cut.mode === 'jump' && value.cut.phase === 'ready' && storyJumpIds.has(value.cut.topic.id));
    report.step = 'restart-keeps-story-style-mode-2';
    value = await command(cut, 2, 'restart'); note(value);
    check(value.cut.topicStyle === 'story_openings' && value.cut.mode === 'jump' && storyJumpIds.has(value.cut.topic.id));
    report.step = 'restart-keeps-story-style-mode-1';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { mode: 'classic' }); note(value);
    value = await command(cut, 2, 'restart'); note(value);
    check(value.cut.topicStyle === 'story_openings' && value.cut.mode === 'classic' && storyTakeIds.has(value.cut.topic.id));
    report.step = 'invalid-topic-style';
    const storyBeforeInvalid = value.cut.topic.id;
    await command(cut, 2, 'settings');
    await command(cut, 3, 'configure', { topicStyle: 'automatic_mix' }, 'invalid_options');
    value = await command(cut, 2, 'cancelSettings');
    check(value.cut.topicStyle === 'story_openings' && value.cut.topic.id === storyBeforeInvalid);
    report.step = 'back-to-original-situations';
    await command(cut, 2, 'settings');
    value = await command(cut, 3, 'configure', { topicStyle: 'situations' }); note(value);
    check(value.cut.topicStyle === 'situations' && value.cut.phase === 'ready' && takeIds.has(value.cut.topic.id));
    for (const seat of cut.seats) { const other = await card(cut, seat.playerNum); check(other.cut.topicStyle === 'situations' && other.cut.topic.id === value.cut.topic.id); }
    report.step = 'host-room-audio';
    let canonical = await hostAudio(cut, 'audioSettings', { music: 'wind', musicVolume: .21, effectsVolume: .43, cutEffect: 'door', autoScare: true });
    check(canonical.audio?.version === 1 && canonical.audio.music === 'wind' && Number.isFinite(canonical.audio.musicStartedAt));
    const musicEpoch = canonical.audio.musicStartedAt;
    for (const seat of cut.seats) {
      const other = await card(cut, seat.playerNum);
      check(other.cut.canControlAudio === false && JSON.stringify(audioSnapshot(other.cut.audio)) === JSON.stringify(canonical.audio));
    }
    report.step = 'host-room-audio-effect';
    canonical = await hostAudio(cut, 'audioEffect', { key: 'laugh' });
    check(canonical.audio.event?.key === 'laugh' && Number.isFinite(canonical.audio.event.at));
    for (const seat of cut.seats) {
      const other = await card(cut, seat.playerNum);
      check(JSON.stringify(audioSnapshot(other.cut.audio)) === JSON.stringify(canonical.audio));
    }
    const onceOnlyAudio = JSON.stringify(canonical.audio), repeatedId = canonical.audio.event.id;
    canonical = await hostAudio(cut, 'audioEffect', { key: 'laugh', id: repeatedId });
    check(JSON.stringify(canonical.audio) === onceOnlyAudio);
    report.step = 'room-audio-player-denied';
    const audioBeforePlayer = JSON.stringify(canonical.audio), gameplayBeforePlayer = withoutAudio(canonical);
    const gameplayReply = (await card(cut, 2)).cut.reply;
    await command(cut, 2, 'audioSettings', { music: 'rain', actor: 0 }, 'not_available');
    await command(cut, 3, 'audioEffect', { key: 'scream', actor: 0 }, 'not_available');
    canonical = JSON.parse((await read(cut, 0)).value.stateJson);
    check(JSON.stringify(canonical.audio) === audioBeforePlayer && JSON.stringify(withoutAudio(canonical)) === JSON.stringify(gameplayBeforePlayer));
    check(JSON.stringify((await card(cut, 2)).cut.reply) === JSON.stringify(gameplayReply));
    report.step = 'room-audio-validation-and-stop';
    canonical = await hostAudio(cut, 'audioSettings', { effectsVolume: -1 }, 'invalid_options');
    check(JSON.stringify(canonical.audio) === audioBeforePlayer);
    canonical = await hostAudio(cut, 'audioSettings', { musicVolume: .35, effectsVolume: 0 });
    check(canonical.audio.musicStartedAt === musicEpoch && canonical.audio.effectsVolume === 0 && canonical.audio.musicVolume === .35);
    canonical = await hostAudio(cut, 'audioSettings', { music: null });
    check(canonical.audio.music === null && canonical.audio.musicStartedAt === null);
    for (const seat of cut.seats) {
      const other = await card(cut, seat.playerNum);
      check(other.cut.phase === 'ready' && !other.cut.audio.music && JSON.stringify(audioSnapshot(other.cut.audio)) === JSON.stringify(canonical.audio));
    }
    report.step = 'room-audio-complete';
    report.ok = true;
  } catch (_) { report.ok = false; }
  finally {
    // No parent deletes. A foreign marker, changed game/session, conflicting
    // ETag or failed ownership check leaves the node untouched and fails QA.
    for (const f of fixtures) for (const num of [0, ...f.seats.map(s => s.playerNum)]) {
      if (!attempted.has(f.path(num))) continue;
      try {
        const old = await read(f, num); if (old.value === null) continue;
        must(f.owned(old.value, num));
        const response = await http(DATABASE + '/' + f.path(num) + '.json', { method: 'DELETE', headers: { 'If-Match': old.etag } });
        must(response.ok); report.cleaned++;
      } catch (_) { report.cleanupFailed++; report.ok = false; }
    }
  }
  return report;
}
module.exports = { run };
if (require.main === module) run().then(report => { process.stdout.write(JSON.stringify(report) + '\n'); if (!report.ok) process.exitCode = 1; }).catch(() => { process.stdout.write('{"ok":false,"phase":"failed"}\n'); process.exitCode = 1; });
