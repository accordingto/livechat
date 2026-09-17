const test = require('node:test');
const assert = require('node:assert/strict');
const NEXT_ROUND = require('../next-round.js');

function setup(opts = {}) {
  const log = { draws: 0, published: [], ticks: 0 };
  let count = opts.count || 4;
  let can = true;
  let delay = opts.delay === undefined ? 5000 : opts.delay;
  const gate = NEXT_ROUND.create({
    count: () => count,
    canDraw: () => can,
    delay: () => delay,
    draw: () => { log.draws++; },
    publish: p => log.published.push(p),
    onTick: () => { log.ticks++; },
  });
  return { gate, log, setCount: n => { count = n; }, setCan: v => { can = v; }, setDelay: d => { delay = d; } };
}
const go = id => ({ next: { id, go: true } });
const stop = seq => ({ next: { seq, stop: true } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('a tap starts a countdown rather than drawing on the spot', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.handle(2, go(id)), true);
  assert.equal(log.draws, 0, 'nothing is drawn yet');
  assert.equal(gate.isArmed(), true);
  const p = log.published.at(-1);
  assert.equal(p.nextIn, 5, 'the cards are told the full length once');
  assert.equal(p.nextSeq, gate.seq());
  assert.equal(p.nextId, null, 'the gate is shut while it counts down');
});

test('the countdown draws when it runs out', async () => {
  const { gate, log } = setup({ delay: 120 });
  const id = gate.open();
  gate.handle(1, go(id));
  assert.equal(log.draws, 0);
  await sleep(200);
  assert.equal(log.draws, 1);
  assert.equal(gate.isArmed(), false);
});

test('a first draw with no delay still goes straight through', () => {
  const { gate, log } = setup({ delay: 0 });
  const id = gate.open();
  gate.handle(1, go(id));
  assert.equal(log.draws, 1);
  assert.equal(gate.isArmed(), false);
});

test('anyone can stop a running countdown, and the prompt stays', () => {
  const { gate, log } = setup();
  const id = gate.open();
  gate.handle(1, go(id));
  const seq = gate.seq();
  assert.equal(gate.handle(3, stop(seq)), true, 'a different player may stop it');
  assert.equal(gate.isArmed(), false);
  assert.equal(log.draws, 0);
  const p = log.published.at(-1);
  assert.equal(p.nextSeq, null);
  assert.notEqual(p.nextId, null, 'a fresh id is offered so anyone can ask again');
  assert.equal(gate.handle(2, go(p.nextId)), true, 'and that new id works');
});

test('a stop quoting an older countdown is ignored', () => {
  const { gate, log } = setup();
  const id = gate.open();
  gate.handle(1, go(id));
  const first = gate.seq();
  gate.handle(1, stop(first));                       // stopped
  gate.handle(2, go(gate.id()));                     // armed again, new seq
  assert.equal(gate.handle(2, stop(first)), false, 'the stale stop does nothing');
  assert.equal(gate.isArmed(), true);
});

test('only one tap gets through: the rest quote a spent id', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.handle(2, go(id)), true);
  assert.equal(gate.handle(1, go(id)), false);
  assert.equal(gate.handle(3, go(id)), false);
  assert.equal(gate.seq(), 1, 'exactly one countdown, however many taps land');
});

test('a tap quoting an older round is dropped', () => {
  const { gate } = setup();
  const old = gate.open();
  gate.open();
  assert.equal(gate.handle(1, go(old)), false);
  assert.equal(gate.isArmed(), false);
});

test('anything that is not a request is ignored, and costs no write', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.handle(1, null), false);
  assert.equal(gate.handle(1, { vote: { id: 'x', choice: 'a' } }), false);
  assert.equal(gate.handle(1, { next: { id } }), false, 'no go flag');
  assert.equal(gate.handle(1, { next: { id, go: false } }), false);
  assert.equal(log.published.length, 0);
});

test("a seat outside the host's room is never heard", () => {
  const { gate, log, setCount } = setup({ count: 2 });
  const id = gate.open();
  assert.equal(gate.handle(7, go(id)), false, 'a link from a bigger earlier room');
  assert.equal(gate.handle(0, go(id)), false);
  assert.equal(log.draws, 0);
  setCount(9);
  assert.equal(gate.handle(7, go(id)), true);
});

test('a shut gate hides the id and refuses taps', () => {
  const { gate, setCan } = setup();
  const id = gate.open();
  setCan(false);
  assert.equal(gate.payload().nextId, null);
  assert.equal(gate.handle(1, go(id)), false);
  setCan(true);
  assert.equal(gate.payload().nextId, id);
  assert.equal(gate.handle(1, go(id)), true);
});

test('sync fires a countdown that ran out while the tab was frozen', () => {
  const { gate, log } = setup({ delay: 1 });
  const id = gate.open();
  gate.handle(1, go(id));
  const start = Date.now();
  while (Date.now() - start < 5) { /* the tab was asleep; no timer ran */ }
  assert.equal(gate.sync(), true);
  assert.equal(log.draws, 1);
});

test('sync stays quiet when nothing changed', () => {
  const { gate, log } = setup();
  gate.open();
  assert.equal(gate.sync(), true);
  assert.equal(gate.sync(), false);
  assert.equal(log.published.length, 1);
});

test('the countdown is published once, not once a second', async () => {
  const { gate, log } = setup({ delay: 300 });
  const id = gate.open();
  gate.payload();                    // the host's own publish carried the open gate
  gate.handle(1, go(id));
  assert.equal(log.published.length, 1, 'one write to start the countdown');
  gate.sync(); gate.sync(); gate.sync();
  assert.equal(log.published.length, 1, 'ticking costs nothing');
  await sleep(380);
  assert.equal(log.draws, 1);
  assert.equal(log.published.length, 1, 'and firing costs nothing either');
});

test('secondsLeft counts down for the host status line', () => {
  const { gate } = setup({ delay: 5000 });
  const id = gate.open();
  assert.equal(gate.secondsLeft(), 0);
  gate.handle(1, go(id));
  assert.equal(gate.secondsLeft(), 5);
});
