/* Next-round gate shared by the four "draw a prompt" games (Pick a Side, Sophie's
 * Choice, You're In The Scene, Persuade Together). It lets the player cards, not the
 * host's keyboard, decide when the next prompt is drawn — the same idea as the
 * "🎬 Deal the next word" button in Say It Without Saying It, generalised:
 *
 *   - the host page opens a gate with a fresh one-shot id after every draw;
 *   - each card may write `players/{token}/next = { id, ready: true|false }`;
 *   - the host counts the cards that are ready against the CURRENT id; the moment
 *     that count reaches `needed(count)` it closes the gate and calls `draw()`.
 *
 * The id makes the gate one-shot: `draw()` opens a new id, so a tap that was still
 * in flight (or a card that hadn't repainted yet) quotes a stale id and is simply
 * not counted. `needed` is what tells the games apart — a verdict already ended a
 * Persuade round, so one tap is enough there; in the three discussion games a
 * single tap would cut a conversation short, so it takes a majority of the room.
 * The first draw of a session never needs more than one tap: there is nothing on
 * the cards yet for an early tap to wipe.
 *
 * Pure: no DOM and no Firebase in here, so it runs under node for the tests. The
 * host page passes `publish` (normally ROOM.update) and calls `sync()` after every
 * card message; only a changed payload is written, so unrelated card traffic (a
 * vote, the judge's verdict) never turns into a Firebase write of its own.
 */
var NEXT_ROUND = (() => {
  'use strict';
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const majority = n => Math.floor(n / 2) + 1;

  function create(cfg) {
    let id = '';        // one-shot id; '' means the gate is closed
    let ready = {};     // playerNum -> true while that card says "ready" against `id`
    let lastSent = '';  // JSON of the last payload handed out, so sync() only writes changes

    const count = () => Math.max(0, Number(cfg.count()) || 0);
    const canDraw = () => !cfg.canDraw || !!cfg.canDraw();
    function needed() {
      const n = count();
      const want = cfg.needed ? Number(cfg.needed(n)) : 1;
      return Math.max(1, Math.min(n || 1, want || 1));
    }
    function readyNums() {
      const n = count();
      return Object.keys(ready).map(Number).filter(k => ready[k] && k >= 1 && k <= n).sort((a, b) => a - b);
    }
    function isOpen() { return !!id && canDraw(); }

    /* a new round is on the cards: every earlier "ready" is about the old round */
    function open() { id = newId(); ready = {}; return id; }
    function close() { id = ''; ready = {}; }

    /* what the cards need: whether the gate is open, how many are ready, how many
       it takes. Calling this counts as having sent it (see sync) */
    function payload() {
      const open = isOpen();
      const p = { nextId: open ? id : null, nextReady: readyNums().length, nextNeeded: open ? needed() : 0, nextCount: count() };
      lastSent = JSON.stringify(p);
      return p;
    }

    /* the threshold may already be met the moment the gate can open (a tap that
       landed while canDraw() was false) — fire rather than wait for another flip */
    function fireIfDue() {
      if (!isOpen() || readyNums().length < needed()) return false;
      close();
      cfg.draw();
      return true;
    }

    /* push the payload only if it differs from the last one handed out */
    function sync() {
      if (fireIfDue()) return true;
      const before = lastSent;
      const p = payload();
      if (lastSent === before) return false;
      if (cfg.publish) cfg.publish(p);
      return true;
    }

    /* one card's node changed — returns true when the gate acted on it (a ready
       flag flipped, or the draw fired) */
    function handle(num, data) {
      const n = data && data.next;
      const was = !!ready[num];
      const now = !!(n && id && n.id === id && n.ready === true);
      if (was === now) return false;
      ready[num] = now;
      sync();
      return true;
    }

    return { open, close, isOpen, handle, payload, sync, readyNums, needed, id: () => id };
  }

  return { create, majority };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NEXT_ROUND;
