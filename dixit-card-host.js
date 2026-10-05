/* The designated host's private card may run the trusted-host executor when
 * opened in the browser that already owns the Hub room. Control credentials
 * stay in that browser's saved session; no player payload or URL receives them.
 */
var DIXIT_CARD_HOST = (() => {
  'use strict';
  class Bridge {
    constructor({ roomCode, playerToken, db, storage = localStorage, tabStorage = typeof sessionStorage !== 'undefined' ? sessionStorage : null,
      isActive = () => !document.hidden, onStatus = () => {} }) {
      this.code = roomCode; this.token = playerToken; this.db = db; this.storage = storage;
      this.tabStorage = tabStorage;
      this.isActive = isActive; this.onStatus = onStatus; this.host = null; this.listeners = []; this.binding = ''; this.payload = null;
    }
    saved() {
      try { return JSON.parse(this.storage.getItem('room-session-' + this.code) || 'null'); }
      catch (error) { return null; }
    }
    executionGroup(seat) {
      if (!this.tabStorage) return undefined;
      const key = 'dixit-executor-' + this.code + '-' + seat;
      try {
        const existing = this.tabStorage.getItem(key);
        if (/^[a-f0-9]{32}$/.test(existing || '')) return existing;
        const group = DIXIT_SYNC.uid(); this.tabStorage.setItem(key, group); return group;
      } catch (error) { return undefined; }
    }
    browserExecutionGroup(seat) {
      const key = 'dixit-executor-browser-' + this.code + '-' + seat;
      try {
        const existing = this.storage.getItem(key);
        if (/^[a-f0-9]{32}$/.test(existing || '')) return existing;
        const group = DIXIT_SYNC.uid(); this.storage.setItem(key, group); return group;
      } catch (error) { return undefined; }
    }
    trusted(data) {
      const s = data?.dixit, saved = this.saved(), roster = DIXIT_ENGINE.list(s?.roster);
      if (data?.game !== 'dixit' || s?.version !== 1 || s.hostControls !== true ||
          !Number.isInteger(s.playerNum) || s.playerNum !== s.hostPlayerNum || data.playerNum !== s.playerNum ||
          roster.length < 3 || roster.length > 8 || !roster.some(p => p.playerNum === s.playerNum) ||
          !Array.isArray(saved?.tokens) || saved.tokens[s.playerNum - 1] !== this.token ||
          !/^[a-f0-9]{32}$/.test(saved?.dixitControlToken || '') ||
          roster.some(p => !/^[a-f0-9]{20}$/.test(saved.tokens[p.playerNum - 1] || ''))) return null;
      return { saved, roster, seat: s.playerNum };
    }
    update(data) {
      this.payload = data;
      const trusted = this.trusted(data);
      if (!trusted) { this.stop(); return false; }
      const { saved, roster, seat } = trusted;
      const binding = JSON.stringify([this.code, seat, saved.dixitControlToken, roster.map(p => [p.playerNum, saved.tokens[p.playerNum - 1]])]);
      if (this.host && this.binding === binding) return true;
      this.stop(); this.binding = binding;
      const refs = new Map(roster.map(p => [p.playerNum, this.db.ref('rooms/' + this.code + '/players/' + saved.tokens[p.playerNum - 1])])), answers = {};
      const room = {
        code: this.code, count: roster.length, answers,
        name: i => roster.find(p => p.playerNum === i + 1)?.name || 'Player ' + (i + 1),
        getExtra: key => this.saved()?.[key],
        setExtra: (key, value) => {
          const current = this.saved(); if (!current) return;
          try { this.storage.setItem('room-session-' + this.code, JSON.stringify({ ...current, [key]: value })); } catch (error) {}
        },
        playerRef: i => refs.get(i + 1),
      };
      const host = this.host = new DIXIT_SYNC.Host({ room, db: this.db, mode: 'private', resumeGroup: this.executionGroup(seat),
        browserGroup: this.browserExecutionGroup(seat), isActive: this.isActive,
        onStatus: status => this.onStatus(status), onChange: () => {} });
      for (const [playerNum, ref] of refs) {
        const listener = snapshot => {
          answers[playerNum] = snapshot.val(); host.receive(playerNum, answers[playerNum]);
          if (host.connected && !host.own && host.canAcquire?.(host.doc)) host.renew();
        };
        this.listeners.push([ref, listener]); ref.on('value', listener);
      }
      host.connect(); return true;
    }
    // Visibility affects executor preference, not whether the HOST keeps
    // processing background requests. Only stop/close tears it down.
    setActive(active) { return this.host?.setActive(active); }
    stop() {
      this.host?.close(); this.host = null; this.binding = '';
      for (const [ref, listener] of this.listeners) ref.off('value', listener);
      this.listeners = [];
    }
    close() { this.stop(); this.payload = null; }
  }
  return { Bridge };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DIXIT_CARD_HOST;
