'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const settings = require('../talk-settings.js');
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), data };
}
test('home preferences persist the selected conversation and challenge source for host setup', () => {
  const saved = storage();
  settings.save({ gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', crazySeconds: 60, seconds: 30 }, saved);
  assert.deepEqual(settings.read(saved), { gameMode: 'crazy', conversationMode: 'free', crazySource: 'players', crazySeconds: 60, mode: 'think', seconds: 30 });
  settings.save({ conversationMode: 'assigned' }, saved);
  assert.equal(settings.read(saved).conversationMode, 'assigned');
  assert.equal(settings.read(saved).gameMode, 'crazy');
  assert.equal(settings.read(saved).crazySource, 'players');
});
test('malformed and unavailable local storage fall back to valid playable settings', () => {
  const saved = storage();
  saved.setItem(settings.key, 'not json');
  assert.deepEqual(settings.read(saved), settings.defaults);
  saved.setItem(settings.key, JSON.stringify({ gameMode: 'unknown', conversationMode: 'unknown', crazySource: 'unknown', seconds: 999, crazySeconds: 1 }));
  assert.deepEqual(settings.read(saved), settings.defaults);
  saved.setItem(settings.key, 'null');
  assert.deepEqual(settings.read(saved), settings.defaults);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual(settings.read(blocked), settings.defaults);
  assert.equal(settings.save({ conversationMode: 'free' }, blocked).conversationMode, 'free');
});
test('homepage controls save mode changes and show only applicable Crazy settings', () => {
  const saved = storage(), handlers = {};
  const fields = ['gameMode', 'conversationMode', 'crazySource', 'crazySeconds'].map(key => ({
    dataset: { talkPref: key }, value: '', addEventListener(event, fn) { handlers[key] = fn; },
  }));
  const source = { hidden: false }, frequency = { hidden: false };
  const element = { querySelectorAll(selector) { return selector === '[data-talk-pref]' ? fields : selector === '[data-talk-crazy-setting]' ? [source] : [frequency]; } };
  settings.bind(element, { storage: saved });
  assert.equal(source.hidden, true); assert.equal(frequency.hidden, true);
  fields[0].value = 'crazy'; handlers.gameMode();
  assert.equal(source.hidden, false); assert.equal(frequency.hidden, false);
  fields[2].value = 'players'; handlers.crazySource();
  assert.equal(source.hidden, false); assert.equal(frequency.hidden, true);
  fields[1].value = 'free'; handlers.conversationMode();
  assert.equal(settings.read(saved).conversationMode, 'free');
  assert.equal(settings.read(saved).crazySource, 'players');
  const host = fs.readFileSync(require.resolve('../lets-talk.html'), 'utf8');
  const home = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(host, /talk-settings\.js\?v=/);
  assert.match(home, /data-talk-pref="conversationMode"/);
  assert.match(home, /href="lets-talk\.html"/);
});

test('only explicit homepage changes set the one-visit setup intent', () => {
  const saved = storage();
  settings.save({ gameMode: 'crazy' }, saved);
  assert.equal(settings.consumePending(saved), false);
  settings.markPending(saved);
  assert.equal(settings.consumePending(saved), true);
  assert.equal(settings.consumePending(saved), false);
});
