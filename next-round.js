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
 * The count is never kept as running state. Every card's latest node is remembered
 * and the ready set is recomputed from those nodes on every sync — so a missed,
 * reordered or re-entrant event (Firebase raises local events synchronously inside
 * set()/update()) can never leave the host stuck on a stale number. watch() adds a
 * slow reconcile tick and a visibilitychange hook on top, so a host tab the browser
 * froze for a while catches up the moment it wakes.
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
    let latest = {};    // playerNum -> that card's latest node, as the host last saw it
    let lastSent = '';  // JSON of the last payload handed out, so sync() only writes changes

    const count = () => Math.max(0, Number(cfg.count()) || 0);
    const canDraw = () => !cfg.canDraw || !!cfg.canDraw();
    function needed() {
      const n = count();
      const want = cfg.needed ? Number(cfg.needed(n)) : 1;
      return Math.max(1, Math.min(n || 1, want || 1));
    }
    const isReady = d => !!(d && d.next && id && d.next.id === id && d.next.ready === true);
    function readyNums() {
      const n = count();
      const out = [];
      for (let k = 1; k <= n; k++) if (isReady(latest[k])) out.push(k);
      return out;
    }
    function isOpen() { return !!id && canDraw(); }

    /* a new round is on the cards: a fresh id means every earlier "ready" (which
       quotes the old id) stops counting on its own */
    function open() { id = newId(); return id; }
    function close() { id = ''; }

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
      // the draw that follows publishes the next round within a couple of seconds;
      // telling every card "gate shut" in the meantime would be a write per card for
      // nothing, so count the closed state as already sent
      payload();
      cfg.draw();
      return true;
    }

    /* recompute from the cards and push the payload only if it differs from the
       last one handed out. Safe to call as often as you like. */
    function sync() {
      if (fireIfDue()) return true;
      const before = lastSent;
      const p = payload();
      if (lastSent === before) return false;
      if (cfg.publish) cfg.publish(p);
      return true;
    }

    /* one card's node changed — remember it and reconcile. Returns true when the
       gate acted on it (the count changed hands, or the draw fired). */
    function handle(num, data) {
      num = Number(num);
      if (!Number.isInteger(num) || num < 1) return false;
      latest[num] = data || null;
      return sync();
    }

    /* the host page's safety net: reconcile every `ms` and whenever the tab comes
       back to the foreground, so nothing depends on every single event arriving */
    function watch(ms) {
      if (typeof setInterval === 'function') setInterval(() => { try { sync(); } catch (e) { /* keep ticking */ } }, ms || 2000);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
      }
    }

    return { open, close, isOpen, handle, payload, sync, watch, readyNums, needed, id: () => id };
  }

  return { create, majority };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NEXT_ROUND;
