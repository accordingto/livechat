const test = require('node:test');
const assert = require('node:assert/strict');
const NEXT_ROUND = require('../next-round.js');

function setup(opts = {}) {
  const log = { draws: 0, published: [] };
  let count = opts.count || 5;
  let can = true;
  const gate = NEXT_ROUND.create({
    count: () => count,
    needed: opts.needed,
    canDraw: () => can,
    draw: () => { log.draws++; },
    publish: p => log.published.push(p),
  });
  return { gate, log, setCount: n => { count = n; }, setCan: v => { can = v; } };
}

test('majority(): more than half of the room', () => {
  assert.equal(NEXT_ROUND.majority(2), 2);
  assert.equal(NEXT_ROUND.majority(3), 2);
  assert.equal(NEXT_ROUND.majority(4), 3);
  assert.equal(NEXT_ROUND.majority(5), 3);
  assert.equal(NEXT_ROUND.majority(9), 5);
});

test('one tap draws when needed is 1 (Persuade, and every first draw)', () => {
  const { gate, log } = setup();
  const id = gate.open();
  assert.equal(gate.payload().nextNeeded, 1);
  gate.handle(3, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
  assert.equal(gate.id(), '', 'gate closes itself on draw');
  // the same tap arriving again (or a second card quoting the spent id) does nothing
  gate.handle(3, { next: { id, ready: true } });
  gate.handle(4, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
});

test('majority gate: counts ready cards, draws at the threshold, ignores stale ids', () => {
  const { gate, log } = setup({ count: 5, needed: NEXT_ROUND.majority });
  const old = gate.open();
  gate.handle(1, { next: { id: old, ready: true } });
  const id = gate.open();                       // a new round: old readies expire
  assert.deepEqual(gate.readyNums(), []);
  assert.equal(gate.payload().nextNeeded, 3);
  gate.handle(1, { next: { id: old, ready: true } });   // stale id — not counted
  gate.handle(2, { next: { id, ready: true } });
  gate.handle(3, { next: { id, ready: true } });
  assert.deepEqual(gate.readyNums(), [2, 3]);
  assert.equal(log.draws, 0);
  gate.handle(4, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
});

test('a card can take its ready back', () => {
  const { gate, log } = setup({ count: 4, needed: NEXT_ROUND.majority });
  const id = gate.open();
  gate.handle(1, { next: { id, ready: true } });
  gate.handle(2, { next: { id, ready: true } });
  gate.handle(1, { next: { id, ready: false } });
  assert.deepEqual(gate.readyNums(), [2]);
  gate.handle(3, { next: { id, ready: true } });
  assert.equal(log.draws, 0, 'two of four is not a majority');
  gate.handle(1, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
});

test('canDraw false hides the gate and holds the draw; sync pushes when it reopens', () => {
  const { gate, log, setCan } = setup({ count: 3 });
  const id = gate.open();
  setCan(false);
  assert.equal(gate.payload().nextId, null);
  gate.handle(1, { next: { id, ready: true } });
  assert.equal(log.draws, 0);
  assert.equal(log.published.at(-1).nextId, null, 'cards are told the gate is shut');
  setCan(true);
  // the tap that landed while the gate was shut is due the moment it can open
  assert.equal(gate.sync(), true);
  assert.equal(log.draws, 1);
});

test('reopening with the threshold not yet met just republishes the count', () => {
  const { gate, log, setCan } = setup({ count: 4, needed: NEXT_ROUND.majority });
  const id = gate.open();
  setCan(false);
  gate.handle(1, { next: { id, ready: true } });
  setCan(true);
  assert.equal(gate.sync(), true);
  assert.equal(log.draws, 0);
  assert.equal(log.published.at(-1).nextId, id);
  assert.equal(log.published.at(-1).nextReady, 1);
  assert.equal(log.published.at(-1).nextNeeded, 3);
});

test('sync writes only when the payload changed; unrelated card traffic is free', () => {
  const { gate, log } = setup({ count: 4, needed: NEXT_ROUND.majority });
  const id = gate.open();
  gate.payload();                                    // the host's own publish carried it
  assert.equal(gate.sync(), false);
  assert.equal(gate.handle(1, { vote: { id: 'x', choice: 'a' } }), false);
  assert.equal(log.published.length, 0);
  gate.handle(1, { next: { id, ready: true } });
  assert.equal(log.published.length, 1);
  assert.equal(log.published[0].nextReady, 1);
  gate.handle(1, { next: { id, ready: true }, vote: { id: 'x', choice: 'b' } });
  assert.equal(log.published.length, 1, 'same ready state, new vote — nothing to write');
});

test('the count is recomputed from the cards, never carried as state', () => {
  const { gate, log } = setup({ count: 3, needed: NEXT_ROUND.majority });
  const id = gate.open();
  // the same card node delivered twice (a re-entrant or duplicated event) counts once
  gate.handle(1, { next: { id, ready: true } });
  gate.handle(1, { next: { id, ready: true } });
  assert.deepEqual(gate.readyNums(), [1]);
  // a host publish wiped the node locally (room.js sets it to null) — the card's
  // real state comes back with the next server event and is counted then
  gate.handle(1, null);
  assert.deepEqual(gate.readyNums(), []);
  gate.handle(1, { next: { id, ready: true } });
  gate.handle(2, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
});

test('sync() alone (the reconcile tick) fires a draw that the events missed', () => {
  const { gate, log, setCan } = setup({ count: 2, needed: NEXT_ROUND.majority });
  const id = gate.open();
  setCan(false);                                       // e.g. a draw animation was running
  gate.handle(1, { next: { id, ready: true } });
  gate.handle(2, { next: { id, ready: true } });
  assert.equal(log.draws, 0);
  setCan(true);
  gate.sync();
  assert.equal(log.draws, 1);
});

test('needed never exceeds the room and counts only seats in the room', () => {
  const { gate, log, setCount } = setup({ count: 2, needed: () => 9 });
  const id = gate.open();
  assert.equal(gate.needed(), 2);
  gate.handle(7, { next: { id, ready: true } });     // a link from a bigger earlier room
  assert.deepEqual(gate.readyNums(), []);
  gate.handle(1, { next: { id, ready: true } });
  gate.handle(2, { next: { id, ready: true } });
  assert.equal(log.draws, 1);
  setCount(1);
  gate.open();
  assert.equal(gate.needed(), 1);
});
