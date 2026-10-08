'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const settings = require('../talk-settings.js');
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), data };
}
test('home preferences persist the chosen range and conversation style for host setup', () => {
  const saved = storage();
  settings.save({ gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', crazyMinSeconds: 20, crazyMaxSeconds: 90, seconds: 30 }, saved);
  assert.deepEqual(settings.read(saved), { gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', crazyMinSeconds: 20, crazyMaxSeconds: 90, mode: 'think', seconds: 30 });
  settings.save({ conversationMode: 'assigned' }, saved);
  assert.equal(settings.read(saved).conversationMode, 'assigned');
  assert.equal(settings.read(saved).crazySource, 'players');
  assert.equal(settings.read(saved).crazyMinSeconds, 20);
  assert.equal(settings.read(saved).crazyMaxSeconds, 90);
});
test('legacy nominal timing retains its jitter range while explicit ranges take precedence', () => {
  const saved = storage();
  saved.setItem(settings.key, JSON.stringify({ crazySeconds: 120 }));
  assert.equal(settings.read(saved).crazyMinSeconds, 96);
  assert.equal(settings.read(saved).crazyMaxSeconds, 144);
  settings.save({ crazySeconds: 60 }, saved);
  assert.equal(settings.read(saved).crazyMinSeconds, 48);
  assert.equal(settings.read(saved).crazyMaxSeconds, 72);
  const explicit = settings.normalize({ crazySeconds: 120, crazyMinSeconds: 15, crazyMaxSeconds: 300 });
  assert.equal(explicit.crazyMinSeconds, 15); assert.equal(explicit.crazyMaxSeconds, 300);
  assert.equal(settings.normalize({}).crazyMinSeconds, 60); assert.equal(settings.normalize({}).crazyMaxSeconds, 180);
});
test('malformed and unavailable local storage fall back to valid playable settings', () => {
  const saved = storage();
  saved.setItem(settings.key, 'not json');
  assert.deepEqual(settings.read(saved), settings.defaults);
  saved.setItem(settings.key, JSON.stringify({ gameMode: 'unknown', conversationMode: 'unknown', crazySource: 'unknown', seconds: 999, crazyMinSeconds: 200, crazyMaxSeconds: 20 }));
  assert.deepEqual(settings.read(saved), settings.defaults);
  saved.setItem(settings.key, 'null');
  assert.deepEqual(settings.read(saved), settings.defaults);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual(settings.read(blocked), settings.defaults);
  assert.equal(settings.save({ conversationMode: 'free' }, blocked).conversationMode, 'free');
});
test('range validation accepts endpoints and equal fixed intervals, rejects empty, inverted and fractional ranges', () => {
  assert.equal(settings.validInterval(5, 300), true); assert.equal(settings.validInterval(60, 60), true);
  for (const [min, max] of [[4, 30], [10, 301], [60, 20], ['', 20], [30, ''], [10.5, 20], [10, 20.5]]) assert.equal(settings.validInterval(min, max), false);
});
test('home range remains visible in player-only mode and invalid edits do not overwrite saved timing', () => {
  const saved = storage(), handlers = {};
  const fields = ['gameMode', 'conversationMode', 'crazySource', 'crazyMinSeconds', 'crazyMaxSeconds'].map(key => ({
    dataset: { talkPref: key }, value: '', validity: '', setCustomValidity(value) { this.validity = value; }, addEventListener(event, fn) { handlers[key] = fn; },
  }));
  const source = { hidden: false }, interval = { hidden: false }, error = { hidden: true, textContent: '' };
  const element = { querySelectorAll(selector) { return selector === '[data-talk-pref]' ? fields : [source, interval]; }, querySelector() { return error; } };
  settings.bind(element, { storage: saved });
  assert.equal(source.hidden, true); assert.equal(interval.hidden, true);
  fields[0].value = 'crazy'; handlers.gameMode();
  assert.equal(source.hidden, false); assert.equal(interval.hidden, false);
  fields[2].value = 'players'; handlers.crazySource();
  assert.equal(interval.hidden, false);
  fields[1].value = 'free'; handlers.conversationMode();
  fields[3].value = '200'; fields[4].value = '20'; handlers.crazyMinSeconds();
  assert.equal(settings.read(saved).crazyMinSeconds, 60);
  assert.equal(settings.read(saved).crazyMaxSeconds, 180);
  assert.equal(error.hidden, false); assert.ok(fields[4].validity);
  fields[4].value = '250'; handlers.crazyMaxSeconds();
  assert.equal(settings.read(saved).crazyMinSeconds, 200);
  assert.equal(settings.read(saved).crazyMaxSeconds, 250);
  assert.equal(error.hidden, true); assert.equal(fields[4].validity, '');
  assert.equal(settings.read(saved).conversationMode, 'free');
  assert.equal(settings.read(saved).crazySource, 'players');
  const host = fs.readFileSync(require.resolve('../lets-talk.html'), 'utf8');
  const home = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(host, /talk-settings\.js\?v=/); assert.doesNotMatch(host, /id="talk-crazy-send"/);
  assert.match(home, /data-talk-pref="crazyMinSeconds"/); assert.match(home, /href="lets-talk\.html"/);
});
test('only explicit homepage changes set the one-visit setup intent', () => {
  const saved = storage();
  settings.save({ gameMode: 'crazy' }, saved);
  assert.equal(settings.consumePending(saved), false);
  settings.markPending(saved);
  assert.equal(settings.consumePending(saved), true);
  assert.equal(settings.consumePending(saved), false);
});
