'use strict';
// Regression (user report, 2026-10-24): after playing another game, returning to
// CUT, Bomb Relay or Sketch Relay showed "The room has switched to another
// game. Tap Start to play again." with a grey Start button. The transport
// suspends itself when its cards show another game, and Start is the action
// that takes the cards back, so it must not require an unsuspended transport.
// Browser check: these pages were driven after WORD LIMIT THEATER, ROOM SURVEY,
// WHO KNOWS? and Pick a Side on the isolated fixture with leases expiring.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Keep source-layout assertions independent of Git's Windows CRLF checkout.
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

for (const [file, startLine] of [
  ['cut-host.js', /byId\('start'\)\.disabled = busy \|\| !\(editing \? canControl\(\) : canStart\(\)\);/],
  ['bomb-relay-host.js', /byId\('start'\)\.disabled = busy \|\| !canStart\(\);/],
  ['sketch-relay-host.js', /\$\('start'\)\.disabled = busy \|\| !canStart\(\) \|\| !countOK\(count\);/],
]) {
  test(`${file}: Start does not require an unsuspended transport`, () => {
    const source = read(file);
    const canStart = source.match(/const canStart = \(\) => ([^\n]+);/);
    assert.ok(canStart, 'canStart is defined');
    assert.doesNotMatch(canStart[1], /suspended/, 'canStart ignores the switched/suspended flag');
    assert.match(source, /const canControl = \(\) => canStart\(\) && !sync\?\.suspended;/, 'other controls still wait for the room to come back');
    assert.match(source, startLine, 'the Start button uses canStart');
    assert.match(source, /async function start\(.*\) \{\n(?:\s+const allowed = [^\n]+\n)?\s+if \(busy \|\| !(?:canStart|allowed)\(\)\) return;/, 'start() itself accepts a switched room');
  });
}

test('the transports allow Start while suspended and clear the flag', () => {
  for (const file of ['cut-sync.js', 'bomb-relay-sync.js', 'open-mic-sync.js']) assert.match(read(file), /allowSwitched: true/, file);
  assert.match(read('sketch-relay-sync.js'), /const prior = this\.suspended; this\.suspended = false;/);
});
