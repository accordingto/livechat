const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../talk-crazy.js');
const { createHash } = require('node:crypto');

test('Crazy Talk preserves its original 96 prompts and appends 40 distinct short challenges', () => {
  assert.equal(C.pool.length, 136);
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
