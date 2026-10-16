const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../talk-crazy.js');
const { createHash } = require('node:crypto');

test('Crazy Talk preserves its original 96 prompts and appends 40 distinct short challenges', () => {
  assert.equal(C.pool.length, 136);
  assert.equal(createHash('sha256').update(JSON.stringify(C.pool)).digest('hex'),
    'b5f341f9a2ad072426416efe3933a00718e752adace9a336187a4f22eb586569', 'All published 136 system cards stay unchanged');
  assert.equal(createHash('sha256').update(JSON.stringify(C.pool.slice(0, 96))).digest('hex'),
    '0589606573ffc733bbf1cd90ffadbcc3b15a7088248dd8e8578d393d95e0b836', 'Original IDs, kinds and wording stay unchanged');
  assert.deepEqual(C.pool.map(p => p.id),
    Array.from({ length: 136 }, (_, i) => 'crazy-' + String(i + 1).padStart(3, '0')));
  assert.deepEqual(C.pool.slice(0, 60).map(p => [p.id, p.kind]),
    Array.from({ length: 60 }, (_, i) => ['crazy-' + String(i + 1).padStart(3, '0'), 'line']));
  assert.equal(C.pool.slice(96).filter(p => p.kind === 'task').length, 30);
  assert.equal(C.pool.slice(96).filter(p => p.kind === 'line').length, 10);
  assert.equal(new Set(C.pool.map(p => p.id)).size, C.pool.length);
  assert.equal(new Set(C.pool.map(p => p.text.toLowerCase().trim())).size, C.pool.length);
});

test('Every system assignment is immediate, plain English and immutable', () => {
  assert.equal(Object.isFrozen(C), true);
  assert.equal(Object.isFrozen(C.pool), true);
  for (const prompt of C.pool) {
    assert.equal(Object.isFrozen(prompt), true);
    assert.match(prompt.id, /^crazy-\d{3}$/);
    assert.ok(['line', 'task'].includes(prompt.kind));
    assert.ok(prompt.text.length > 0 && prompt.text.length <= 48, prompt.id);
    const words = prompt.text.trim().split(/\s+/).length;
    assert.ok(words <= 9, prompt.id + ': ' + words + ' words');
    assert.equal(prompt.text, prompt.text.trim());
    assert.match(prompt.text, /^[\x20-\x7e]+$/);
    assert.doesNotMatch(prompt.text, /[<>]|https?:\/\//);
  }
});


test('director inspiration uses sixteen short bilingual tasks from the unchanged public pool', () => {
  const choices = C.inspirationChoices({ count: 100, random: () => 0 });
  assert.equal(choices.length, 16); assert.equal(new Set(choices.map(choice => choice.id)).size, 16);
  assert.equal(new Set(choices.map(choice => choice.zh)).size, 16);
  for (const choice of choices) {
    const original = C.pool.find(prompt => prompt.id === choice.id);
    assert.ok(original); assert.equal(choice.kind, 'task');
    assert.deepEqual({ id: choice.id, kind: choice.kind, text: choice.text }, original);
    assert.deepEqual(Object.keys(choice).sort(), ['id', 'kind', 'text', 'zh']);
    assert.match(choice.zh, /[\u3400-\u9fff]/); assert.ok(choice.zh.length <= 32);
    assert.doesNotMatch(choice.zh, /[<>]|https?:\/\//);
  }
  assert.ok(choices.some(choice => choice.text === 'Cluck like a chicken.'));
  assert.ok(choices.some(choice => choice.text === 'Say "I\'m in love with my cup."'));
  assert.ok(choices.some(choice => choice.text === 'Ask everyone to say "banana" together.'));
  assert.ok(choices.some(choice => choice.text === "Sing someone's name."));
});

test('inspiration gives three distinct choices and refreshes without repeating excluded public IDs', () => {
  const first = C.inspirationChoices({ random: () => 0 });
  assert.deepEqual(first.map(choice => [choice.id, choice.zh]), [
    ['crazy-061', '學雞叫。'], ['crazy-062', '像機器人一樣說話。'], ['crazy-063', '說「我愛上我的杯子了。」']
  ]);
  const exclude = first.map(choice => choice.id), before = [...exclude];
  const next = C.inspirationChoices({ random: () => 0, exclude });
  assert.equal(next.length, 3); assert.ok(next.every(choice => !exclude.includes(choice.id)));
  assert.deepEqual(exclude, before);
  const all = C.inspirationChoices({ count: 100, random: () => 0 });
  assert.deepEqual(C.inspirationChoices({ exclude: all.map(choice => choice.id) }), []);
});

test('inspiration sampling is deterministic, bounded and safe for malformed option values', () => {
  const last = C.inspirationChoices({ random: () => 1 });
  assert.deepEqual(last.map(choice => choice.id), ['crazy-121', 'crazy-113', 'crazy-105']);
  for (const count of [0, -1]) assert.deepEqual(C.inspirationChoices({ count }), []);
  for (const count of [NaN, Infinity, 1.5, '2']) assert.equal(C.inspirationChoices({ count }).length, 3);
  for (const value of [-10, -Infinity, Infinity, NaN, 1, 10]) {
    const choices = C.inspirationChoices({ count: 100, random: () => value });
    assert.equal(choices.length, 16); assert.equal(new Set(choices.map(choice => choice.id)).size, 16);
    assert.ok(choices.every(choice => C.pool.some(prompt => prompt.id === choice.id)));
  }
  assert.equal(C.inspirationChoices({ count: 1, random: null, exclude: null }).length, 1);
  assert.equal(C.inspirationChoices(null).length, 3);
});

test('inspiration results are independent copies and never alter future choices or saved system cards', () => {
  const expected = C.inspirationChoices({ random: () => 0 });
  const changed = C.inspirationChoices({ random: () => 0 });
  changed[0].text = 'A local draft edit.'; changed[0].zh = '本機草稿'; changed[0].id = 'local'; changed.pop();
  assert.deepEqual(C.inspirationChoices({ random: () => 0 }), expected);
  assert.equal(createHash('sha256').update(JSON.stringify(C.pool)).digest('hex'),
    'b5f341f9a2ad072426416efe3933a00718e752adace9a336187a4f22eb586569');
});

test('the browser global offers the same pure bilingual helper without CommonJS or private state', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const browser = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../talk-crazy.js'), 'utf8'), browser);
  const actual = browser.TALK_CRAZY.inspirationChoices({ random: () => 0, exclude: ['crazy-061'] });
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), C.inspirationChoices({ random: () => 0, exclude: ['crazy-061'] }));
  assert.equal(browser.TALK_CRAZY.pool.length, 136);
});
