const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../talk-crazy.js');

test('Crazy Talk retains the original line IDs and adds distinct spoken tasks', () => {
  assert.ok(C.pool.length >= 80 && C.pool.length <= 100);
  assert.deepEqual(C.pool.slice(0, 60).map(p => [p.id, p.kind]),
    Array.from({ length: 60 }, (_, i) => ['crazy-' + String(i + 1).padStart(3, '0'), 'line']));
  assert.ok(C.pool.filter(p => p.kind === 'task').length >= 30);
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
    assert.ok(prompt.text.length > 0 && prompt.text.length <= 80, prompt.id);
    const words = prompt.text.trim().split(/\s+/).length;
    assert.ok(words <= (prompt.kind === 'line' ? 10 : 12), prompt.id + ': ' + words + ' words');
    assert.equal(prompt.text, prompt.text.trim());
    assert.match(prompt.text, /^[\x20-\x7e]+$/);
    assert.doesNotMatch(prompt.text, /[<>]|https?:\/\//);
  }
});
