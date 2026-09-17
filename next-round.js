/* Next-round gate shared by the four "draw a prompt" games (Pick a Side, Sophie's
 * Choice, You're In The Scene, Persuade Together). It lets the player cards, not the
 * host's keyboard, decide when the next prompt is drawn — the same mechanism as the
 * "🎬 Deal the next word" button in Say It Without Saying It, generalised:
 *
 *   - after every draw the host opens a gate with a fresh one-shot `nextId`;
 *   - a card asks for the next prompt by writing `players/{token}/next = { id, go: true }`;
 *   - the host draws if that id is the one it is currently offering, and the draw
 *     immediately mints a new id, so a second card's tap (or a retry, or a card that
 *     had not repainted yet) quotes a spent id and is dropped.
 *
 * There is deliberately NO counting of how many cards agree. The first version of
 * this file gated the draw behind "more than half the room has tapped ready", and
 * that count is exactly what broke in real use: the tally is cross-card state living
 * in one browser tab, so a single missed, reordered, re-entrant or frozen-tab event
 * left the host stuck on 0 while every card showed itself as ready, and no later tap
 * could recover it. One tap, one action, quoting one id has no tally to get stuck:
 * it either draws or it does not, and the card can see which within a second.
 * Guarding against an accidental skip is the card's job instead (it asks for a second
 * tap to confirm), because a confirmation that lives on one phone cannot desync.
 *
 * Pure: no DOM and no Firebase in here, so it runs under node for the tests. The host
 * page passes `publish` (normally ROOM.update) and calls `handle()` for every card
 * message; the payload only changes when the gate opens or closes, so ordinary card
 * traffic (a vote, the judge's verdict) never turns into a Firebase write.
 */
var NEXT_ROUND = (() => {
  'use strict';
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function create(cfg) {
    let id = '';        // the id currently on offer; '' means the gate is shut
    let lastSent = '';  // JSON of the last payload handed out, so sync() only writes changes

    const count = () => Math.max(0, Number(cfg.count()) || 0);
    const canDraw = () => !cfg.canDraw || !!cfg.canDraw();
    function isOpen() { return !!id && canDraw(); }

    /* a new round is on the cards: a fresh id means every tap still in flight
       (they all quote the old id) stops counting on its own */
    function open() { id = newId(); return id; }
    function close() { id = ''; }

    /* what the cards need: the id to quote, and the size of the room so a card
       holding a link from a bigger earlier room can say so instead of offering a
       button the host will never hear. Calling this counts as having sent it. */
    function payload() {
      const p = { nextId: isOpen() ? id : null, nextCount: count() };
      lastSent = JSON.stringify(p);
      return p;
    }

    /* push the payload only if it differs from the last one handed out */
    function sync() {
      const before = lastSent;
      const p = payload();
      if (lastSent === before) return false;
      if (cfg.publish) cfg.publish(p);
      return true;
    }

    /* one card's node changed. A request for the next prompt draws it; anything
       else (a vote, a verdict, a stale id) is ignored. Returns true if it drew. */
    function handle(num, data) {
      num = Number(num);
      if (!Number.isInteger(num) || num < 1 || num > count()) return false;
      const n = data && data.next;
      if (!n || !id || n.id !== id || n.go !== true) return false;
      if (!canDraw()) return false;   // mid-animation, or Persuade before the verdict
      close();
      // the draw republishes within a second or two; telling every card "gate shut"
      // in the meantime would be a write per card for nothing
      payload();
      cfg.draw();
      return true;
    }

    /* the host page's safety net: re-check every `ms` and whenever the tab comes back
       to the foreground, so the cards are never left looking at a stale gate after
       the browser froze a background tab */
    function watch(ms) {
      if (typeof setInterval === 'function') setInterval(() => { try { sync(); } catch (e) { /* keep ticking */ } }, ms || 3000);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
      }
    }

    return { open, close, isOpen, handle, payload, sync, watch, id: () => id };
  }

  return { create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NEXT_ROUND;
