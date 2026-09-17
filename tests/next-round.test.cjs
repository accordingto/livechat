const test = require('node:test');
const assert = require('node:assert/strict');
const NEXT_ROUND = require('../next-round.js');

function setup(opts = {}) {
  const log = { draws: 0, published: [] };
  let count = opts.count || 4;
  let can = true;
  const gate = NEXT_ROUND.create({
    count: () => count,
    canDraw: () => can,
    draw: () => { log.draws++; },
    publish: p => log.published.push(p),
  });
  return { gate, log, setCount: n => { count = n; }, setCan: v => { can = v; } };
}
const go = id => ({ next: { id, go: true } });

test('one tap draws, and the id it quoted is spent immediately', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.handle(2, go(id)), true);
  assert.equal(log.draws, 1);
  assert.equal(gate.id(), '', 'the gate shuts itself the moment it draws');
  // everyone else's tap was already on its way — all of them quote the spent id
  assert.equal(gate.handle(1, go(id)), false);
  assert.equal(gate.handle(3, go(id)), false);
  assert.equal(gate.handle(2, go(id)), false, 'the same card re-sending changes nothing');
  assert.equal(log.draws, 1, 'exactly one draw, however many taps land');
});

test('a tap quoting an older round is dropped', () => {
  const { gate, log } = setup();
  const old = gate.open();
  gate.open();                       // a new round: a fresh id
  assert.equal(gate.handle(1, go(old)), false);
  assert.equal(log.draws, 0);
});

test('anything that is not a request for the next prompt is ignored', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.handle(1, null), false);
  assert.equal(gate.handle(1, { vote: { id: 'x', choice: 'a' } }), false);
  assert.equal(gate.handle(1, { next: { id } }), false, 'no go flag');
  assert.equal(gate.handle(1, { next: { id, go: false } }), false);
  assert.equal(log.draws, 0);
  assert.equal(log.published.length, 0, 'ordinary card traffic costs no Firebase write');
});

test("a seat outside the host's room is never heard", () => {
  const { gate, log, setCount } = setup({ count: 2 });
  const id = gate.open();
  assert.equal(gate.handle(7, go(id)), false, 'a link from a bigger earlier room');
  assert.equal(gate.handle(0, go(id)), false);
  assert.equal(log.draws, 0);
  setCount(9);
  assert.equal(gate.handle(7, go(id)), true, 'same seat, once the room is that big');
});

test('a shut gate hides the id and holds the draw', () => {
  const { gate, log, setCan } = setup();
  const id = gate.open();
  setCan(false);                       // e.g. the draw animation is running
  assert.equal(gate.payload().nextId, null, 'cards are told there is nothing to tap');
  assert.equal(gate.handle(1, go(id)), false);
  assert.equal(log.draws, 0);
  setCan(true);
  assert.equal(gate.payload().nextId, id, 'the same id comes back when it reopens');
  assert.equal(gate.handle(1, go(id)), true, 'a card still holding it can now be heard');
});

test('closing by hand shuts the gate for good', () => {
  const { gate, log } = setup();
  const id = gate.open();
  gate.close();
  assert.equal(gate.payload().nextId, null);
  assert.equal(gate.handle(1, go(id)), false);
  assert.equal(log.draws, 0);
});

test('sync writes when the gate opens or shuts, and stays quiet otherwise', () => {
  const { gate, log, setCan } = setup();
  gate.open();
  assert.equal(gate.sync(), true);
  assert.equal(log.published.length, 1);
  assert.equal(gate.sync(), false, 'nothing changed — no write');
  setCan(false);
  assert.equal(gate.sync(), true);
  assert.equal(log.published.at(-1).nextId, null);
  setCan(true);
  assert.equal(gate.sync(), true);
  assert.equal(log.published.at(-1).nextId, gate.id());
  assert.equal(log.published.length, 3);
});

test('the payload carries the room size so a card can check its own seat', () => {
  const { gate, setCount } = setup({ count: 5 });
  gate.open();
  assert.equal(gate.payload().nextCount, 5);
  setCount(2);
  assert.equal(gate.payload().nextCount, 2);
});

test('drawing does not publish a shut gate the next round is about to replace', () => {
  const { gate, log } = setup();
  const id = gate.open();
  gate.payload();                      // the host's own publish carried it
  gate.handle(1, go(id));
  assert.equal(log.draws, 1);
  assert.equal(log.published.length, 0, 'no interim write between the tap and the draw');
  gate.open();                         // the draw lands and publishes the new round
  assert.equal(gate.sync(), true);
});
