/* Next-round gate shared by the four "draw a prompt" games (Pick a Side, Sophie's
 * Choice, You're In The Scene, Persuade Together). It lets the player cards, not the
 * host's keyboard, decide when the next prompt is drawn — the same mechanism as the
 * "🎬 Deal the next word" button in Say It Without Saying It, generalised:
 *
 *   - after every draw the host opens a gate with a fresh one-shot `nextId`;
 *   - a card asks for the next prompt by writing `players/{token}/next = { id, go: true }`;
 *   - the host arms a short countdown, and draws when it runs out.
 *
 * The id makes the request one-shot: arming spends it, so a second card's tap (or a
 * retry, or a card that had not repainted yet) quotes a spent id and is dropped.
 *
 * There is deliberately NO counting of how many cards agree. The first version gated
 * the draw behind "more than half the room has tapped ready", and that count is
 * exactly what broke in real use: a tally is cross-card state living in one browser
 * tab, so a single missed, reordered, re-entrant or frozen-tab event left the host
 * stuck on 0 while every card showed itself as ready, and no later tap could recover
 * it. One tap, one action, quoting one id has no tally to get stuck.
 *
 * The countdown is what guards against an accidental skip, and it is a better guard
 * than the local confirm it replaced: every card shows the same ring counting down
 * and carries a "hold on" button, so anyone who is still talking can stop it — not
 * only the person whose thumb slipped. Stopping is one-shot too (it quotes the
 * countdown's `seq`), so it cannot desync into a stuck state either: the worst case
 * is that a stop arrives too late and the prompt changes anyway.
 *
 * The countdown is published ONCE, as `{ nextSeq, nextIn }`, and every card runs its
 * own one-second tick from that — zero Firebase writes while it counts down, exactly
 * like the round clock in Say It. The host fires off a wall-clock deadline rather
 * than by counting ticks, because a background tab's timers are throttled or frozen;
 * `sync()` also fires a countdown that is already overdue, so a host tab that was
 * asleep catches up the moment it wakes.
 *
 * Pure: no DOM and no Firebase in here, so it runs under node for the tests.
 */
var NEXT_ROUND = (() => {
  'use strict';
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => Date.now();

  function create(cfg) {
    let id = '';        // the id currently on offer; '' means the gate is shut
    let seq = 0;        // bumped per countdown, so a card knows when to re-sync its tick
    let endsAt = 0;     // wall clock; 0 means no countdown is running
    let total = 0;      // the countdown's full length in seconds, as published
    let timer = null;
    let lastSent = '';  // JSON of the last payload handed out, so sync() only writes changes

    const count = () => Math.max(0, Number(cfg.count()) || 0);
    const canDraw = () => !cfg.canDraw || !!cfg.canDraw();
    const delayMs = () => Math.max(0, Number(cfg.delay ? cfg.delay() : 0) || 0);
    const isArmed = () => endsAt > 0;
    function isOpen() { return !!id && !isArmed() && canDraw(); }
    /* whole seconds still to go, for the host's own status line */
    function secondsLeft() { return isArmed() ? Math.max(0, Math.ceil((endsAt - now()) / 1000)) : 0; }

    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

    /* a new round is on the cards: a fresh id means every tap still in flight
       (they all quote the old id) stops counting on its own */
    function open() { clearTimer(); endsAt = 0; total = 0; id = newId(); return id; }
    function close() { clearTimer(); endsAt = 0; total = 0; id = ''; }

    /* what the cards need: the id to quote, the countdown to run, and the size of
       the room so a card holding a link from a bigger earlier room can say so
       instead of offering a button the host will never hear. `nextIn` is the
       countdown's FULL length, not the remaining time — it is published once and
       each card ticks down from it on its own. Calling this counts as having sent it. */
    function payload() {
      const p = {
        nextId: isOpen() ? id : null,
        nextCount: count(),
        nextSeq: isArmed() ? seq : null,
        nextIn: isArmed() ? total : 0,
      };
      lastSent = JSON.stringify(p);
      return p;
    }

    function fire() {
      clearTimer();
      endsAt = 0; total = 0; id = '';
      // the draw republishes within a second or two, so don't spend a write per card
      // telling them the countdown is over
      payload();
      cfg.draw();
    }

    /* start the countdown everyone can see (and stop). A zero delay just draws. */
    function arm() {
      const ms = delayMs();
      id = '';                       // this request is spent either way
      if (!ms) { fire(); return; }
      clearTimer();
      seq++;
      total = Math.round(ms / 1000);
      endsAt = now() + ms;
      timer = setTimeout(fire, ms);
      sync();
      if (cfg.onTick) cfg.onTick();
    }

    /* someone said hold on: throw the countdown away and offer a fresh id, so the
       prompt stays and anybody can ask again */
    function cancelArm() {
      if (!isArmed()) return false;
      open();
      sync();
      if (cfg.onTick) cfg.onTick();
      return true;
    }

    /* push the payload only if it differs from the last one handed out */
    function sync() {
      // a countdown that ran out while this tab was frozen: fire it now rather than
      // leave every card sitting on a ring at zero
      if (isArmed() && now() >= endsAt) { fire(); return true; }
      const before = lastSent;
      const p = payload();
      if (lastSent === before) return false;
      if (cfg.publish) cfg.publish(p);
      return true;
    }

    /* one card's node changed. `go` asks for the next prompt, `stop` calls off a
       running countdown; anything else (a vote, a verdict, a stale id) is ignored.
       Returns true if the gate acted on it. */
    function handle(num, data) {
      num = Number(num);
      if (!Number.isInteger(num) || num < 1 || num > count()) return false;
      const n = data && data.next;
      if (!n) return false;
      if (n.stop === true) return isArmed() && n.seq === seq ? cancelArm() : false;
      if (n.go !== true || !id || n.id !== id) return false;
      if (!canDraw()) return false;   // mid-animation, or Persuade before the verdict
      arm();
      return true;
    }

    /* the host page's safety net: re-check every `ms` and whenever the tab comes back
       to the foreground, so a countdown still lands after the browser froze this tab,
       and the cards are never left looking at a stale gate */
    function watch(ms) {
      if (typeof setInterval === 'function') {
        setInterval(() => {
          try { sync(); if (isArmed() && cfg.onTick) cfg.onTick(); } catch (e) { /* keep ticking */ }
        }, ms || 500);
      }
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
      }
    }

    return { open, close, isOpen, isArmed, secondsLeft, handle, payload, sync, watch, id: () => id, seq: () => seq };
  }

  return { create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NEXT_ROUND;
