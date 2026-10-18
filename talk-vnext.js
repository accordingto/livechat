/* Crazy Talk vNext: deterministic private lifecycle, independent of transport and DOM. */
var TALK_VNEXT = (() => {
  'use strict';
  const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
  const clone = value => JSON.parse(JSON.stringify(value));
  const enabled = s => s?.gameMode === 'crazy' && !!s.crazy;
  const nowOf = input => Number.isFinite(Number(input?.now)) ? Number(input.now) : 0;
  const active = s => list(s.roster).filter(p => p.active !== false && p.pending !== true).map(p => Number(p.playerNum)).filter(Number.isInteger);
  const member = (s, num) => list(s.roster).some(p => p.playerNum === num);
  const liveStages = new Set(['open', 'extension']);
  const terminal = new Set(['done', 'skipped', 'expired', 'cancelled', 'replaced']);
  const integer = (value, low, high, fallback) => Number.isInteger(value) && value >= low && value <= high ? value : fallback;
  const validText = text => typeof text === 'string' && text.trim().length >= 1 && text.trim().length <= 120;
  const identity = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : '';
  const ownerFor = (s, num) => identity(s.crazyIdentities?.[num]);
  const mayClaimDelegate = (s, num, input) => s.crazy.hostDelegate == null || s.crazy.hostDelegate === num
    || !active(s).includes(s.crazy.hostDelegate) || input.connectionByNum?.[s.crazy.hostDelegate] === 'offline';
  const sourceOf = item => item?.source === 'system' ? 'system' : 'player';
  // These compact IDs identify UX records; authenticated ownership is checked
  // separately. They must not expose the canonical archive ID or its author.
  function compact(value) {
    let n = 0x6c62272e07bb014262b821756295c58dn;
    for (const char of String(value)) n = ((n ^ BigInt(char.codePointAt(0))) * 0x1000000000000000000013bn) & ((1n << 128n) - 1n);
    return n.toString(16).padStart(32, '0');
  }
  const random = (seed, salt = 1) => {
    let n = ((Number(seed) >>> 0) ^ Math.imul(Number(salt) || 1, 2654435761)) >>> 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    return (n >>> 0) / 4294967296;
  };
  const activeNums = s => enabled(s) ? Object.entries(s.crazy.prompts || {}).filter(([, p]) => p?.status === 'pending').map(([n]) => Number(n)).sort((a, b) => a - b) : [];
  const checkInTime = p => Number(p.at) + Math.max(0, Math.min(140000, Number(p.expiresAt) - Number(p.at) - 10000));
  function bindIdentity(s, input) {
    for (const [num, value] of Object.entries(input.identityByNum || {})) if (member(s, Number(num)) && identity(value)) s.crazyIdentities[num] = identity(value);
    const hash = identity(input.actorIdentity);
    if (hash && member(s, input.actor)) s.crazyIdentities[input.actor] = hash;
  }
  function event(s, type, input = {}, metadata = {}) {
    const c = s.crazy;
    c.eventSequence = (Number(c.eventSequence) || 0) + 1;
    const record = { id: `${s.sessionId}:vnext-event:${c.eventSequence}`, version: 1, persistedVersion: 0,
      type, sessionId: s.sessionId, at: nowOf(input) };
    for (const key of ['actor', 'author', 'recipient', 'promptId', 'cardId', 'source', 'reason', 'seconds', 'from', 'to']) {
      if (metadata[key] != null && ['string', 'number', 'boolean'].includes(typeof metadata[key])) record[key] = typeof metadata[key] === 'string' ? metadata[key].slice(0, ['promptId', 'cardId'].includes(key) ? 1024 : 160) : metadata[key];
    }
    c.events.push(record); pruneEvents(c);
    return record;
  }
  function pruneEvents(c) {
    const pending = list(c.events).filter(v => v.version > (Number(v.persistedVersion) || 0));
    const persisted = list(c.events).filter(v => v.version <= (Number(v.persistedVersion) || 0));
    c.events = persisted.slice(-Math.max(0, 200 - pending.length)).concat(pending);
    if (pending.length >= 200) c.events = pending;
  }
  function cardId(s, item) {
    return item.archiveId || `${s.sessionId}:author:${item.assignedBy}:${item.id}`;
  }
  function rememberCard(s, item, input) {
    if (sourceOf(item) !== 'player') return null;
    item.archiveId ||= cardId(s, item); item.roundCardId = item.archiveId;
    if (!s.crazy.roundCards[item.archiveId]) s.crazy.roundCards[item.archiveId] = {
      id: 'card:' + compact(item.archiveId), commandId: item.id, archiveId: item.archiveId, version: 1, text: String(item.text || ''),
      kind: item.kind === 'line' ? 'line' : 'task', source: 'player', assignedBy: Number(item.assignedBy),
      author: Number(item.assignedBy), target: item.target == null || item.target === 'random' ? null : Number(item.target),
      recipient: null, sessionId: s.sessionId, ...(typeof item.at === 'number' && Number.isFinite(item.at) ? { createdAt: item.at } : {}),
      status: 'queued', executed: false, publish: false, ownerIdentity: ownerFor(s, Number(item.assignedBy)),
      topic: { title: String(s.topic?.title || ''), question: String(s.topic?.question || '') }
    };
    return s.crazy.roundCards[item.archiveId];
  }
  function updateCard(s, prompt, status, input, extra = {}) {
    const card = s.crazy.roundCards[prompt.roundCardId || prompt.archiveId];
    if (!card) return;
    card.version++; card.status = status; card.updatedAt = nowOf(input); Object.assign(card, extra);
    if (terminal.has(status)) card.closedAt = nowOf(input);
  }
  function syncRoles(s, input) {
    const c = s.crazy, players = active(s), desired = c.playStyle === 'director' && players.length >= 2 ? 'director' : 'free';
    const old = list(c.directors), oldStyle = c.effectivePlayStyle;
    c.directorCount = Math.floor(players.length / 2);
    c.effectivePlayStyle = desired;
    if (desired === 'free') { c.directors = []; c.nextRotateAt = 0; }
    else {
      const count = c.directorCount;
      c.directors = old.filter(n => players.includes(n)).slice(0, count);
      for (const num of players) if (c.directors.length < count && !c.directors.includes(num) && c.prompts[num]?.status !== 'pending') c.directors.push(num);
      if (!(c.nextRotateAt > 0)) c.nextRotateAt = nowOf(input) + c.rotationSeconds * 1000;
    }
    if (oldStyle != null && (oldStyle !== desired || JSON.stringify(old) !== JSON.stringify(c.directors))) event(s, 'roles_adjusted', input, { reason: desired });
  }
  function init(s, input = {}) {
    if (!enabled(s)) return false;
    const before = JSON.stringify([s.crazy, s.crazyVault, s.crazyIdentities]), c = s.crazy;
    c.maxActive = integer(input.crazyMaxActive ?? c.maxActive, 1, 9, 3);
    c.playStyle = (input.crazyPlayStyle ?? c.playStyle) === 'director' ? 'director' : 'free';
    c.rotationSeconds = integer(input.crazyRotationSeconds ?? c.rotationSeconds, 60, 900, 120);
    c.queue = list(c.queue);
    for (const key of ['prompts', 'sequence', 'receivers', 'offers']) c[key] = Object.fromEntries(Object.entries(c[key] || {}).filter(([, value]) => value != null));
    c.roundCards = Array.isArray(c.roundCards) ? Object.fromEntries(list(c.roundCards).filter(v => v.id).map(v => [v.archiveId || v.id, v])) : c.roundCards || {};
    for (const [key, card] of Object.entries(c.roundCards)) if (!card.id || card.id === card.archiveId || card.id === key) card.id = 'card:' + compact(card.archiveId || key);
    c.events = list(c.events); pruneEvents(c); c.declinedOffers ||= {}; c.sortConfirmed ||= {}; c.actionReceipts ||= {}; c.lastResults ||= {};
    c.librarySequence = Number(c.librarySequence) || 0;
    c.roundStage ||= s.phase === 'ended' ? 'reveal' : 'open'; c.queueLocked = c.queueLocked === true || !['open'].includes(c.roundStage);
    c.hostDelegate = member(s, Number(c.hostDelegate)) ? Number(c.hostDelegate) : null;
    s.crazyVault ||= {}; s.crazyIdentities ||= {}; bindIdentity(s, input);
    for (const num of active(s)) {
      const receiver = c.receivers[num] ||= {};
      receiver.paused = receiver.paused === true; receiver.cooldownUntil = Number(receiver.cooldownUntil) || 0;
    }
    for (const item of c.queue) rememberCard(s, item, input);
    for (const [num, prompt] of Object.entries(c.prompts)) {
      prompt.version = 1; prompt.renderVersion = 1;
      prompt.renderAckAt = Number(prompt.renderAckAt) || 0; prompt.renderedVersion = prompt.renderedVersion === 1 ? 1 : 0;
      const assignedAt = Number.isFinite(prompt.at) ? prompt.at : nowOf(input);
      prompt.displayDeadline = Number.isFinite(prompt.displayDeadline) ? prompt.displayDeadline : assignedAt + 30000;
      prompt.expiresAt = Number.isFinite(prompt.expiresAt) ? prompt.expiresAt : assignedAt + integer(c.taskSeconds, 30, 300, 150) * 1000;
      if (prompt.source === 'player' && !c.roundCards[prompt.roundCardId || prompt.archiveId]) {
        const item = { id: prompt.queueItem?.id || prompt.id, archiveId: prompt.archiveId, assignedBy: prompt.assignedBy,
          target: prompt.queueItem?.target ?? Number(num), text: prompt.text, kind: prompt.kind, at: prompt.queueItem?.at ?? prompt.at };
        const card = rememberCard(s, item, input); prompt.archiveId = item.archiveId; prompt.roundCardId = item.archiveId;
        card.status = prompt.status; card.recipient = Number(num); card.assignedAt = prompt.at;
        card.executed = prompt.renderedVersion === 1 || prompt.status === 'done';
      }
      const card = c.roundCards[prompt.roundCardId || prompt.archiveId];
      if (card?.status === 'pending' && terminal.has(prompt.status)) {
        updateCard(s, prompt, prompt.status, input, { executed: card.executed || prompt.renderedVersion === 1 });
        event(s, prompt.status, input, { author: card.assignedBy, recipient: Number(num), cardId: card.id, promptId: prompt.id, source: 'player', reason: 'legacy_reconciled' });
      }
      if (card && prompt.status === 'pending' && !prompt.queueItem) prompt.queueItem = { id: card.commandId,
        archiveId: card.archiveId, roundCardId: card.archiveId, assignedBy: card.assignedBy, target: card.target,
        text: card.text, kind: card.kind, at: card.createdAt };
    }
    c.vnextVersion = 1; syncRoles(s, input);
    return JSON.stringify([s.crazy, s.crazyVault, s.crazyIdentities]) !== before;
  }
  function roles(s) {
    const c = s.crazy || {}, directors = c.effectivePlayStyle === 'director' ? list(c.directors) : [];
    return { directors: directors.slice(), receivers: active(s).filter(n => !directors.includes(n)), playStyle: c.effectivePlayStyle || 'free' };
  }
  const capacity = s => enabled(s) ? Math.min(integer(s.crazy.maxActive, 1, 9, 3), roles(s).receivers.length) : 0;
  function eligibleReceivers(s, input = {}, exclude = []) {
    if (!enabled(s)) return [];
    const now = nowOf(input), c = s.crazy;
    const online = s.sharedControls === true && input.onlineNums != null ? list(input.onlineNums) : null;
    return roles(s).receivers.filter(num => (online == null || online.includes(num)) && !exclude.includes(num)
      && !c.receivers?.[num]?.paused && (Number(c.receivers?.[num]?.cooldownUntil) || 0) <= now
      && c.prompts?.[num]?.status !== 'pending');
  }
  function maySystem(s, input = {}) {
    if (!enabled(s) || s.phase !== 'talking') return false;
    const c = s.crazy;
    return c.source !== 'players' && !c.paused && !c.queueLocked && c.roundStage === 'open'
      && activeNums(s).length < capacity(s) && eligibleReceivers(s, input).some(num => !list(c.queue).some(item => item.assignedBy !== num && (item.target == null || item.target === num)));
  }
  function scheduleSystem(s, input) {
    const c = s.crazy, min = integer(c.minSeconds, 5, 300, 60), max = integer(c.maxSeconds, min, 300, 180);
    c.scheduleSequence = (Number(c.scheduleSequence) || 0) + 1;
    c.nextAssignAt = nowOf(input) + Math.round((min + random(input.seed, c.scheduleSequence) * (Math.max(min, max) - min)) * 1000);
  }
  function assign(s, item, recipient, input = {}) {
    init(s, input);
    if (!enabled(s) || s.phase !== 'talking' || !liveStages.has(s.crazy.roundStage) || s.crazy.paused
      || activeNums(s).length >= capacity(s) || !eligibleReceivers(s, input).includes(recipient)) return false;
    const c = s.crazy, now = nowOf(input), source = sourceOf(item);
    if (!(source === 'system' ? typeof item.text === 'string' && item.text.trim().length >= 1 && item.text.trim().length <= 240 : validText(item.text)) || !['line', 'task'].includes(item.kind)) return false;
    if (source === 'system' && !maySystem(s, input)) return false;
    if (source === 'player' && (recipient === Number(item.assignedBy) || item.target != null && item.target !== 'random' && Number(item.target) !== recipient)) return false;
    const sequence = (Number(c.sequence[recipient]) || 0) + 1; c.sequence[recipient] = sequence;
    const p = { id: `${s.sessionId}:crazy:${recipient}:${sequence}`, version: 1, renderVersion: 1, renderedVersion: 0,
      renderAckAt: 0, at: now, displayDeadline: now + 30000, expiresAt: now + integer(c.taskSeconds, 30, 300, 150) * 1000,
      text: item.text.trim(), kind: item.kind, source, status: 'pending' };
    if (source === 'player') {
      const card = rememberCard(s, item, input);
      Object.assign(p, { assignedBy: Number(item.assignedBy), archiveId: item.archiveId, roundCardId: item.archiveId,
        queueItem: { id: item.id, archiveId: item.archiveId, roundCardId: item.archiveId, text: item.text.trim(), kind: item.kind,
          assignedBy: Number(item.assignedBy), target: card.target, at: card.createdAt } });
      c.queue = c.queue.filter(q => q.archiveId !== item.archiveId);
      updateCard(s, p, 'pending', input, { recipient, assignedAt: now });
    } else p.lineId = item.lineId || item.id;
    c.prompts[recipient] = p; delete c.offers[recipient];
    for (const [num, offer] of Object.entries(c.offers)) if (offer.cardId === p.roundCardId) delete c.offers[num];
    c.lastPlayerNum = recipient; c.lastAssignAt = now; scheduleSystem(s, input);
    event(s, 'assigned', input, { author: p.assignedBy, recipient, promptId: p.id, cardId: p.roundCardId || p.lineId, source,
      reason: input.connectionByNum?.[recipient] === 'unknown' ? 'unknown' : undefined });
    return true;
  }
  function submit(s, item, input = {}) {
    init(s, input);
    if (!enabled(s) || !['thinking', 'talking'].includes(s.phase) || s.crazy.queueLocked || s.crazy.source === 'system') return 'queue_locked';
    const actor = Number(input.actor ?? item.assignedBy), c = s.crazy;
    if (!active(s).includes(actor) || Number(item.assignedBy) !== actor) return 'not_available';
    if (c.effectivePlayStyle === 'director' && !c.directors.includes(actor)) return 'not_director';
    if (!validText(item.text) || !['line', 'task'].includes(item.kind) || typeof item.id !== 'string' || !item.id || item.id.length > 500) return 'invalid_prompt';
    const target = item.target == null || item.target === 'random' ? null : Number(item.target);
    if (target != null && (!active(s).includes(target) || target === actor)) return 'invalid_target';
    item.target = target; item.text = item.text.trim(); item.archiveId ||= cardId(s, item); item.roundCardId = item.archiveId;
    const existing = c.roundCards[item.archiveId];
    if (existing) return existing.text === item.text && existing.kind === item.kind && existing.assignedBy === actor && existing.target === target ? null : 'command_conflict';
    if (c.queue.length >= 20 || c.queue.filter(q => q.assignedBy === actor).length >= 10) return 'queue_full';
    if (typeof item.at !== 'number' || !Number.isFinite(item.at)) item.at = nowOf(input);
    c.queue.push(item); rememberCard(s, item, input);
    event(s, 'submitted', input, { actor, author: actor, cardId: item.archiveId, source: 'player' });
    return null;
  }
  function clearOffers(s) {
    for (const [num, offer] of Object.entries(s.crazy.offers)) {
      const p = s.crazy.prompts[num];
      if (p?.status !== 'pending' || p.id !== offer.promptId || p.version !== offer.promptVersion
        || !s.crazy.queue.some(q => q.archiveId === offer.cardId)) delete s.crazy.offers[num];
    }
  }
  function dispatchReason(s, item, input) {
    const c = s.crazy, now = nowOf(input);
    if (s.phase === 'thinking') return 'preparation';
    if (!liveStages.has(c.roundStage) || s.phase !== 'talking') return 'decision_locked';
    if (c.paused) return 'paused';
    const players = active(s).filter(num => num !== item.assignedBy && (item.target == null || item.target === num));
    const receivers = players.filter(num => !roles(s).directors.includes(num));
    if (!receivers.length) return players.length ? 'recipient_director' : 'recipient_away';
    const online = s.sharedControls === true && input.onlineNums != null ? list(input.onlineNums) : null;
    const connected = receivers.filter(num => online == null || online.includes(num));
    if (!connected.length) return 'offline';
    const unpaused = connected.filter(num => !c.receivers?.[num]?.paused);
    if (!unpaused.length) return 'paused';
    const ready = unpaused.filter(num => (Number(c.receivers?.[num]?.cooldownUntil) || 0) <= now);
    if (!ready.length) return 'resting';
    if (!ready.some(num => c.prompts?.[num]?.status !== 'pending')) return 'recipient_busy';
    if (activeNums(s).length >= capacity(s)) return 'capacity';
    return 'ready';
  }
  function diagnoseQueue(s, input) {
    for (const item of s.crazy.queue) diagnoseItem(s, item, input);
  }
  function diagnoseItem(s, item, input) {
      const reason = dispatchReason(s, item, input);
      if (item.lastDispatchReason === reason) return;
      item.lastDispatchReason = reason;
      event(s, reason === 'ready' ? 'dispatch_attempt' : 'dispatch_blocked', input,
        { author: item.assignedBy, recipient: item.target, cardId: item.archiveId, source: 'player', reason });
  }
  function dispatchQueue(s, input) {
    const c = s.crazy;
    if (s.phase !== 'talking' || !liveStages.has(c.roundStage) || c.paused) return;
    for (const item of c.queue.slice()) {
      diagnoseItem(s, item, input);
      let candidates = eligibleReceivers(s, input).filter(num => num !== item.assignedBy && (item.target == null || item.target === num));
      if (candidates.length > 1 && candidates.includes(c.lastPlayerNum)) candidates = candidates.filter(num => num !== c.lastPlayerNum);
      if (activeNums(s).length < capacity(s) && candidates.length) {
        const recipient = candidates[Math.floor(random(input.seed, (Number(c.eventSequence) || 0) + 701) * candidates.length)];
        if (assign(s, item, recipient, input)) continue;
      }
      if (Object.values(c.offers).some(offer => offer.cardId === item.archiveId)) continue;
      const online = s.sharedControls === true && input.onlineNums != null ? list(input.onlineNums) : null;
      const system = roles(s).receivers.filter(num => num !== item.assignedBy && (item.target == null || item.target === num)
        && (online == null || online.includes(num)) && !c.receivers[num]?.paused && !c.offers[num]
        && c.prompts[num]?.status === 'pending' && c.prompts[num]?.source === 'system'
        && !c.declinedOffers[`${c.prompts[num].id}:${item.archiveId}`]);
      if (system.length) {
        const recipient = system[Math.floor(random(input.seed, (Number(c.eventSequence) || 0) + 809) * system.length)], p = c.prompts[recipient];
        c.offerSequence = (Number(c.offerSequence) || 0) + 1;
        const id = `offer:${compact(p.id)}:${c.offerSequence}`;
        c.offers[recipient] = { id, offerId: id, promptId: p.id, promptVersion: p.version, cardId: item.archiveId, at: nowOf(input) };
        event(s, 'replacement_offered', input, { recipient, promptId: p.id, cardId: item.archiveId });
      }
    }
  }
  function closePrompt(s, num, status, input, options = {}) {
    const c = s.crazy, p = c.prompts[num];
    if (!p || p.status !== 'pending') return false;
    p.status = status; p.closedAt = nowOf(input); delete c.offers[num];
    const receiver = c.receivers[num] ||= { paused: false, cooldownUntil: 0 };
    if (options.pause) { receiver.paused = true; receiver.reason = options.reason || status; }
    if (options.cooldown) receiver.cooldownUntil = nowOf(input) + 30000;
    if (status === 'withdrawn') {
      if (p.source === 'player' && p.queueItem && !c.queue.some(q => q.archiveId === p.archiveId)) c.queue.unshift(clone(p.queueItem));
      updateCard(s, p, 'queued', input, { recipient: null, withdrawalReason: options.reason || 'display_unconfirmed' });
    } else updateCard(s, p, status, input, { executed: !!options.executed || p.renderedVersion === 1 });
    event(s, status, input, { actor: input.actor, author: p.assignedBy, recipient: num, promptId: p.id,
      cardId: p.roundCardId, source: p.source, reason: options.reason });
    return true;
  }
  function rotate(s, input) {
    const c = s.crazy, players = active(s);
    if (c.effectivePlayStyle !== 'director' || c.nextRotateAt > nowOf(input)) return;
    const outgoing = c.directors[0];
    const start = Number(c.rotationCursor) || 0;
    let incoming = null;
    for (let offset = 0; offset < players.length; offset++) {
      const index = (start + offset) % players.length, n = players[index];
      if (!c.directors.includes(n)) { incoming = n; break; }
    }
    if (outgoing == null || incoming == null || c.prompts[outgoing]?.status === 'pending' || c.prompts[incoming]?.status === 'pending') { c.nextRotateAt = nowOf(input) + 5000; return; }
    c.rotationCursor = (players.indexOf(incoming) + 1) % players.length;
    c.directors = c.directors.filter(n => n !== outgoing).concat(incoming);
    c.nextRotateAt = nowOf(input) + c.rotationSeconds * 1000;
    event(s, 'director_rotated', input, { from: outgoing, to: incoming });
  }
  function saveLibrary(s, owner, text, target, input, id = '') {
    const c = s.crazy, vault = s.crazyVault[owner] ||= {};
    const cardId = id || 'library:' + compact(`${s.sessionId}:${input.actor}:${input.id || ++c.librarySequence}`);
    const existing = vault[cardId];
    if (existing && existing.text === text && existing.target === target && !existing.deleted && !existing.returned) return existing;
    const entry = { id: cardId, text, target: target ?? null, version: (Number(existing?.version) || 0) + 1,
      persistedVersion: Number(existing?.persistedVersion) || 0, deleted: false, createdAt: existing?.createdAt ?? nowOf(input), updatedAt: nowOf(input) };
    vault[cardId] = entry; return entry;
  }
  function returnSkipped(s, prompt, input) {
    const card = s.crazy.roundCards[prompt.roundCardId || prompt.archiveId];
    // The owner was bound when the card was accepted. A reused player number
    // must never transfer an old author's text to a different bearer identity.
    const owner = identity(card?.ownerIdentity);
    if (!card || !owner) return;
    const id = 'returned:' + compact(card.archiveId || card.id), vault = s.crazyVault[owner] ||= {};
    if (!Object.hasOwn(vault, id)) vault[id] = { id, text: card.text, target: card.target ?? null,
      returned: true, deleted: false, version: 1, persistedVersion: 0,
      createdAt: nowOf(input), updatedAt: nowOf(input) };
    card.vaultSavedIdentity = owner;
    event(s, 'card_returned', input, { author: card.assignedBy, recipient: input.actor, cardId: card.id, promptId: prompt.id, source: 'player' });
  }
  function unusedCards(s, num, owner = ownerFor(s, num)) {
    return list(s.crazy.roundCards).filter(card => card.assignedBy === num
      && (!card.ownerIdentity || card.ownerIdentity === owner) && !card.executed && terminal.has(card.status));
  }
  function autoSaveUnused(s, input) {
    for (const card of Object.values(s.crazy.roundCards)) if (!card.executed && terminal.has(card.status) && !card.vaultSavedIdentity) {
      const owner = card.ownerIdentity || ownerFor(s, card.assignedBy);
      if (owner && !s.crazy.sortConfirmed[owner]) { card.ownerIdentity = owner; saveLibrary(s, owner, card.text, card.target, { ...input, actor: card.assignedBy }, card.id); card.vaultSavedIdentity = owner; }
    }
  }
  function cancelSuperseded(s, input = {}) {
    if (!enabled(s)) return false;
    const before = JSON.stringify(s); init(s, input);
    for (const num of activeNums(s)) closePrompt(s, num, 'cancelled', input, { reason: 'activity_switched' });
    return JSON.stringify(s) !== before;
  }
  // A validated round reset can discard preparation without visiting sorting.
  // Preserve those accepted cards privately before the caller replaces the state.
  function preserveUnusedForReset(s, input = {}) {
    if (!enabled(s) || activeNums(s).length) return false;
    const before = JSON.stringify(s); init(s, input);
    const c = s.crazy, now = nowOf(input);
    for (const card of Object.values(c.roundCards)) {
      if (['queued', 'pending'].includes(card.status)) {
        card.version++; card.status = 'cancelled'; card.closedAt = now; card.updatedAt = now;
        event(s, 'cancelled', input, { actor: input.actor, author: card.assignedBy, recipient: card.recipient,
          cardId: card.id, source: 'player', reason: 'round_reset' });
      }
      const owner = identity(card.ownerIdentity) || ownerFor(s, card.assignedBy);
      // Existing edits and deletion tombstones take precedence over an old round
      // snapshot whose auto-save marker may not have survived an earlier writer.
      if (!card.executed && terminal.has(card.status) && !card.vaultSavedIdentity && owner
          && Object.hasOwn(s.crazyVault[owner] || {}, card.id)) {
        card.ownerIdentity = owner; card.vaultSavedIdentity = owner;
      }
    }
    c.queue = []; c.offers = {}; c.nextAssignAt = 0;
    autoSaveUnused(s, input);
    return JSON.stringify(s) !== before;
  }
  function enterSorting(s, input) {
    const c = s.crazy;
    if (activeNums(s).length) return;
    for (const item of c.queue) {
      const card = c.roundCards[item.archiveId];
      if (card && card.status === 'queued') { card.version++; card.status = 'cancelled'; card.closedAt = nowOf(input); card.updatedAt = nowOf(input); }
    }
    c.queue = []; c.offers = {}; c.nextAssignAt = 0; c.roundStage = 'sorting'; c.queueLocked = true;
    s.phase = 'ended'; s.speaker = null; s.endedAt = nowOf(input);
    autoSaveUnused(s, input); event(s, 'sorting_started', input);
  }
  function closeRound(s, input = {}) {
    init(s, input);
    if (!enabled(s)) return false;
    s.crazy.roundStage = 'draining'; s.crazy.queueLocked = true; s.crazy.nextAssignAt = 0; s.crazy.offers = {};
    event(s, 'draining_started', input, { actor: input.actor });
    if (!activeNums(s).length) enterSorting(s, input);
    return true;
  }
  function cancelMember(s, num, input = {}) {
    if (!enabled(s)) return false;
    const initialized = init(s, input);
    const before = JSON.stringify(s.crazy), c = s.crazy, p = c.prompts[num];
    if (p?.status === 'pending') closePrompt(s, num, 'cancelled', input, { reason: 'participant_away' });
    else if (p?.status === 'cancelled') {
      const card = c.roundCards[p.roundCardId || p.archiveId];
      if (card && card.status === 'pending') updateCard(s, p, 'cancelled', input, { executed: card.executed || p.renderedVersion === 1 });
    }
    for (const card of Object.values(c.roundCards)) if (card.status === 'queued' && (card.assignedBy === num || card.target === num)) {
      card.version++; card.status = 'cancelled'; card.updatedAt = nowOf(input); card.closedAt = nowOf(input);
      event(s, 'cancelled', input, { author: card.assignedBy, recipient: card.target, cardId: card.id, source: 'player', reason: 'participant_away' });
    }
    c.queue = c.queue.filter(item => item.assignedBy !== num && item.target !== num);
    delete c.offers[num]; clearOffers(s);
    if (c.hostDelegate === num) c.hostDelegate = null;
    syncRoles(s, input);
    return initialized || JSON.stringify(s.crazy) !== before;
  }
  function advance(s, input = {}) {
    if (!enabled(s)) return false;
    const before = JSON.stringify(s), now = nowOf(input); init(s, input);
    const c = s.crazy;
    clearOffers(s);
    if (s.phase === 'talking') {
      for (const num of activeNums(s)) {
        const p = c.prompts[num];
        if (p.renderedVersion !== 1 && now >= p.displayDeadline) closePrompt(s, num, 'withdrawn', input, { pause: true, reason: 'display_unconfirmed' });
        else if (now >= p.expiresAt) closePrompt(s, num, 'expired', input, { pause: p.interactedAt == null, reason: 'expired' });
        else if (p.renderedVersion === 1 && p.interactedAt == null && !p.checkInReadyAt && now >= checkInTime(p)) {
          p.checkInReadyAt = now;
          event(s, 'check_in_available', input, { recipient: num, promptId: p.id, cardId: p.roundCardId, source: p.source });
        }
      }
      if (liveStages.has(c.roundStage) && Number(s.gameDeadline) > 0 && now >= s.gameDeadline) {
        c.roundStage = 'decision'; c.queueLocked = true; c.decisionAt = now; c.nextAssignAt = 0;
        event(s, 'decision_started', input);
      }
      if (c.roundStage === 'draining' && !activeNums(s).length) enterSorting(s, input);
      if (liveStages.has(c.roundStage)) { rotate(s, input); if (input.skipDispatch || c.paused) diagnoseQueue(s, input); else dispatchQueue(s, input); }
      else diagnoseQueue(s, input);
    }
    else diagnoseQueue(s, input);
    if (['sorting', 'reveal'].includes(c.roundStage)) autoSaveUnused(s, input);
    return JSON.stringify(s) !== before;
  }
  function due(s, now) {
    if (!enabled(s) || !Number.isFinite(Number(now))) return false;
    const c = s.crazy;
    if (c.vnextVersion !== 1) return true;
    const players = active(s), target = Math.floor(players.length / 2), directors = list(c.directors);
    const style = c.playStyle === 'director' && players.length >= 2 ? 'director' : 'free';
    if (c.directorCount !== target || c.effectivePlayStyle !== style || directors.length > target
        || directors.some(num => !players.includes(num))
        || style === 'director' && directors.length < target && players.some(num => !directors.includes(num) && c.prompts?.[num]?.status !== 'pending')) return true;
    if (s.phase !== 'talking') return false;
    if (activeNums(s).some(num => { const p = c.prompts[num]; return Number(now) >= (p.renderedVersion === 1 ? p.expiresAt : Math.min(p.displayDeadline, p.expiresAt))
      || p.renderedVersion === 1 && p.interactedAt == null && !p.checkInReadyAt && Number(now) >= checkInTime(p); })) return true;
    if (liveStages.has(c.roundStage) && s.gameDeadline > 0 && Number(now) >= s.gameDeadline) return true;
    if (c.roundStage === 'draining' && !activeNums(s).length) return true;
    if (!liveStages.has(c.roundStage) || c.paused) return false;
    if (c.effectivePlayStyle === 'director' && c.nextRotateAt > 0 && Number(now) >= c.nextRotateAt) return true;
    const input = { now: Number(now), onlineNums: s.availablePlayerNums };
    if (activeNums(s).length < capacity(s) && list(c.queue).some(item => eligibleReceivers(s, input).some(num => num !== item.assignedBy && (item.target == null || item.target === num)))) return true;
    if (list(c.queue).some(item => roles(s).receivers.some(num => num !== item.assignedBy && (item.target == null || item.target === num)
      && !c.receivers?.[num]?.paused && !c.offers?.[num] && c.prompts?.[num]?.status === 'pending' && c.prompts[num]?.source === 'system'
      && !c.declinedOffers?.[`${c.prompts[num].id}:${item.archiveId}`]))) return true;
    return c.nextAssignAt > 0 && Number(now) >= c.nextAssignAt && maySystem(s, input);
  }
  const canHost = (s, input) => input.hostAuthorized === true || input.actor > 0 && active(s).includes(input.actor) && s.crazy.hostDelegate === input.actor;
  function action(s, input = {}) {
    if (!enabled(s)) return 'not_available';
    init(s, input);
    if (input.sessionId != null && input.sessionId !== s.sessionId) return 'stale_session';
    const actor = Number(input.actor), c = s.crazy, now = nowOf(input);
    if (actor !== 0 && !member(s, actor)) return 'not_available';
    advance(s, { ...input, skipDispatch: true });
    const aliases = { crazyShown: 'crazyRendered', crazyOfferAccept: 'crazyReplace', crazyOfferDecline: 'crazyKeep', crazyEnd: 'crazyDrain' };
    const type = aliases[input.type] || input.type;
    const receiptKey = input.id ? `${actor}:${input.id}` : '';
    const fingerprint = JSON.stringify([type, input.promptId, input.renderVersion ?? input.version, input.offerId, input.cardId, input.text, input.target, input.seconds, input.playerNum, input.saveIds, input.publishIds, input.paused]);
    if (type !== 'crazyRendered' && receiptKey && c.actionReceipts[receiptKey]) return c.actionReceipts[receiptKey].fingerprint === fingerprint ? c.actionReceipts[receiptKey].error : 'command_conflict';
    const perform = () => {
      const p = c.prompts[actor], receiver = c.receivers[actor] ||= { paused: false, cooldownUntil: 0 };
      const owner = ownerFor(s, actor);
      if (type === 'crazyRendered') {
        if (!active(s).includes(actor) || p?.status !== 'pending' || p.id !== input.promptId || (input.renderVersion ?? input.version) !== p.version) return 'stale_prompt';
        if (p.renderedVersion === p.version) return null;
        p.renderedVersion = p.version; p.renderAckAt = now;
        updateCard(s, p, 'pending', input, { executed: true, renderedAt: now });
        event(s, 'rendered', input, { recipient: actor, promptId: p.id, cardId: p.roundCardId, source: p.source });
        return null;
      }
      if (type === 'crazyHere') {
        if (input.sessionId !== s.sessionId) return 'stale_session';
        if (!active(s).includes(actor) || p?.status !== 'pending' || p.id !== input.promptId
            || p.renderedVersion !== p.version || input.renderVersion != null && input.renderVersion !== p.version
            || !['open', 'extension', 'decision', 'draining'].includes(c.roundStage)) return 'stale_prompt';
        if (p.interactedAt != null) return null;
        p.hereAt = now; p.interactedAt = now;
        event(s, 'checked_in', input, { actor, recipient: actor, promptId: p.id, cardId: p.roundCardId, source: p.source });
        return null;
      }
      if (type === 'crazyReceive') {
        if (!active(s).includes(actor) || !['thinking', 'talking'].includes(s.phase)) return 'not_available';
        receiver.paused = input.paused === true; receiver.reason = receiver.paused ? 'player_paused' : '';
        event(s, receiver.paused ? 'receive_paused' : 'receive_resumed', input, { actor }); return null;
      }
      if (type === 'crazyDone' || type === 'crazySkip') {
        if (!active(s).includes(actor) || p?.status !== 'pending' || p.id !== input.promptId || input.renderVersion != null && input.renderVersion !== p.version) return 'stale_prompt';
        if (!['open', 'extension', 'decision', 'draining'].includes(c.roundStage)) return 'not_available';
        const done = type === 'crazyDone';
        const playerSkip = !done && p.source === 'player', scoreDelta = done ? 1 : playerSkip ? -1 : 0;
        closePrompt(s, actor, done ? 'done' : 'skipped', input, { cooldown: done || playerSkip, executed: true });
        s.scores ||= {}; s.scores[actor] = (Number(s.scores[actor]) || 0) + scoreDelta;
        c.lastResults[actor] = { id: input.id || p.id, promptId: p.id, source: p.source,
          status: done ? 'done' : 'skipped', scoreDelta, at: now };
        if (playerSkip) {
          event(s, 'skip_penalty', input, { actor, recipient: actor, promptId: p.id, cardId: p.roundCardId, source: 'player', reason: 'points:-1' });
          returnSkipped(s, p, input);
        }
        else if (!done) c.systemReplacement = { playerNum: actor, promptId: p.id, lineId: p.lineId, text: p.text };
        return null;
      }
      if (type === 'crazyReplace' || type === 'crazyKeep') {
        const offer = c.offers[actor];
        if (!active(s).includes(actor) || !offer || offer.id !== input.offerId || p?.status !== 'pending' || p.id !== input.promptId || p.id !== offer.promptId) return 'stale_offer';
        if (!liveStages.has(c.roundStage)) return 'not_available';
        const item = c.queue.find(q => q.archiveId === offer.cardId);
        if (!item) return 'stale_offer';
        if (type === 'crazyKeep') {
          p.interactedAt = now;
          c.declinedOffers[`${p.id}:${item.archiveId}`] = true; delete c.offers[actor];
          event(s, 'replacement_declined', input, { recipient: actor, promptId: p.id, cardId: item.archiveId }); return null;
        }
        const online = s.sharedControls === true && input.onlineNums != null ? list(input.onlineNums) : null;
        if (c.paused || receiver.paused || receiver.cooldownUntil > now || !roles(s).receivers.includes(actor)
          || online != null && !online.includes(actor) || activeNums(s).length > capacity(s)) return 'not_available';
        closePrompt(s, actor, 'replaced', input, { executed: true });
        if (!assign(s, item, actor, input)) return 'not_available';
        return null;
      }
      if (type === 'crazyClaimHost') {
        if (!active(s).includes(actor) || c.roundStage !== 'decision' || input.hostOnline !== false || now < Number(c.decisionAt) + 30000) return 'not_available';
        if (!mayClaimDelegate(s, actor, input)) return 'not_available';
        c.hostDelegate = actor; event(s, 'host_claimed', input, { actor }); return null;
      }
      if (['crazyExtend', 'crazyDrain', 'crazyDelegate', 'crazyReveal'].includes(type)) {
        if (!canHost(s, input)) return 'not_available';
        if (type === 'crazyDelegate') {
          if (!active(s).includes(Number(input.playerNum))) return 'invalid_target';
          c.hostDelegate = Number(input.playerNum); event(s, 'host_delegated', input, { actor, recipient: c.hostDelegate }); return null;
        }
        if (type === 'crazyExtend') {
          if (c.roundStage !== 'decision' || ![180, 300, 600].includes(input.seconds)) return 'not_available';
          c.roundStage = 'extension'; c.queueLocked = true; s.phase = 'talking'; s.gameDeadline = now + input.seconds * 1000;
          event(s, 'extended', input, { actor, seconds: input.seconds }); return null;
        }
        if (type === 'crazyDrain') {
          if (!['open', 'extension', 'decision'].includes(c.roundStage)) return 'not_available';
          closeRound(s, input); return null;
        }
        if (c.roundStage !== 'sorting') return 'not_available';
        c.roundStage = 'reveal'; s.phase = 'ended'; event(s, 'revealed', input, { actor }); return null;
      }
      if (type === 'crazySort') {
        if (!member(s, actor) || !owner || !['sorting', 'reveal'].includes(c.roundStage)) return owner ? 'not_available' : 'identity_unavailable';
        const cards = unusedCards(s, actor), ids = new Set(cards.map(card => card.id));
        const saveIds = list(input.saveIds), publishIds = input.publishIds == null ? null : list(input.publishIds);
        if (saveIds.some(id => !ids.has(id)) || publishIds?.some(id => !ids.has(id))) return 'invalid_card';
        for (const card of cards) {
          card.publish = publishIds ? publishIds.includes(card.id) : !saveIds.includes(card.id);
          card.ownerIdentity = owner;
          if (saveIds.includes(card.id) || !card.publish) saveLibrary(s, owner, card.text, card.target, input, card.id);
          else {
            const old = s.crazyVault[owner]?.[card.id];
            if (old && !old.deleted) { old.deleted = true; old.version++; old.updatedAt = now; }
          }
        }
        c.sortConfirmed[owner] = true; event(s, 'sorted', input, { actor }); return null;
      }
      if (['crazyReturnSave', 'crazyReturnDelete', 'crazyLibrarySave', 'crazyLibraryUpdate', 'crazyLibraryDelete', 'crazyLibrarySend'].includes(type)) {
        if (!member(s, actor) || !owner) return 'identity_unavailable';
        if (input.cardId != null && (typeof input.cardId !== 'string' || !input.cardId || input.cardId.length > 1024
          || ['__proto__', 'constructor', 'prototype'].includes(input.cardId))) return 'invalid_card';
        const vault = s.crazyVault[owner] ||= {}, card = vault[input.cardId];
        if (type === 'crazyReturnSave' || type === 'crazyReturnDelete') {
          if (!card || card.deleted || !card.returned) return 'invalid_card';
          if (type === 'crazyReturnDelete') { card.deleted = true; card.version++; card.updatedAt = now; }
          else {
            const text = input.text == null ? card.text : input.text;
            if (!validText(text)) return 'invalid_prompt';
            saveLibrary(s, owner, text.trim(), card.target, input, card.id);
          }
          event(s, type === 'crazyReturnSave' ? 'returned_saved' : 'returned_deleted', input, { actor, cardId: card.id });
          return null;
        }
        if (type !== 'crazyLibrarySave' && (!card || card.deleted)) return 'invalid_card';
        if (card?.returned) return 'invalid_card';
        if (type === 'crazyLibraryDelete') { card.deleted = true; card.version++; card.updatedAt = now; event(s, 'library_deleted', input, { actor, cardId: card.id }); return null; }
        if (type === 'crazyLibrarySend') {
          const error = submit(s, { id: input.id || `${card.id}:send:${now}`, text: card.text, target: input.target ?? null,
            kind: 'task', assignedBy: actor, at: now }, input);
          if (error) return error;
          event(s, 'library_sent', input, { actor, cardId: card.id }); return null;
        }
        if (!validText(input.text)) return 'invalid_prompt';
        const target = input.target == null || input.target === 'random' ? null : Number(input.target);
        if (target != null && (!active(s).includes(target) || target === actor)) return 'invalid_target';
        const saved = saveLibrary(s, owner, input.text.trim(), type === 'crazyLibraryUpdate' && input.target == null ? card.target : target, input, type === 'crazyLibraryUpdate' ? card.id : input.cardId);
        event(s, type === 'crazyLibrarySave' ? 'library_saved' : 'library_updated', input, { actor, cardId: saved.id }); return null;
      }
      return 'not_available';
    };
    const error = perform();
    if (type !== 'crazyRendered' && receiptKey) {
      c.actionReceipts[receiptKey] = { fingerprint, error };
      const keys = Object.keys(c.actionReceipts); for (const key of keys.slice(0, -200)) delete c.actionReceipts[key];
    }
    if (!error) advance(s, input);
    return error;
  }
  function safePrompt(p, now) {
    if (!p) return null;
    const result = {};
    for (const key of ['id', 'version', 'renderVersion', 'renderedVersion', 'renderAckAt', 'displayDeadline', 'expiresAt', 'at', 'kind', 'text', 'status', 'source']) if (p[key] != null) result[key] = p[key];
    result.rendered = p.renderedVersion === p.version;
    result.reminder = p.status === 'pending' && result.rendered && Number(now) >= Number(p.renderAckAt) + 30000 && Number(now) < p.expiresAt;
    result.checkInAt = p.status === 'pending' && result.rendered && p.interactedAt == null && Number(now) < p.expiresAt ? checkInTime(p) : 0;
    result.checkIn = result.checkInAt > 0 && Number(now) >= result.checkInAt;
    return result;
  }
  function view(s, num, now = 0, input = {}) {
    if (!enabled(s)) return {};
    const c = s.crazy, role = roles(s), owner = identity(input.actorIdentity) || ownerFor(s, num), p = c.prompts?.[num], offer = c.offers?.[num], card = offer && c.roundCards?.[offer.cardId];
    const canPlay = active(s).includes(num), ownMember = member(s, num);
    const isHost = (num === 0 && input.hostAuthorized === true) || (num > 0 && c.hostDelegate === num && active(s).includes(num));
    const receiverStatuses = active(s).map(playerNum => ({ playerNum, connection: ['online', 'offline'].includes(input.connectionByNum?.[playerNum]) ? input.connectionByNum[playerNum] : 'unknown',
      status: role.directors.includes(playerNum) ? 'director' : c.receivers?.[playerNum]?.paused ? 'paused'
        : c.prompts?.[playerNum]?.status === 'pending' ? 'busy' : Number(c.receivers?.[playerNum]?.cooldownUntil) > Number(now) ? 'resting' : 'ready' }));
    const cards = list(c.roundCards);
    const summary = isHost ? { queued: list(c.queue).length, pending: activeNums(s).length,
      blocked: list(c.queue).filter(item => !['ready', 'unknown'].includes(dispatchReason(s, item, { ...input, now, onlineNums: input.onlineNums ?? s.availablePlayerNums }))).length } : null;
    const visible = c.roundStage === 'reveal' ? cards.filter(v => terminal.has(v.status)
      && (v.executed || v.publish && c.sortConfirmed?.[v.ownerIdentity])).map(v => ({ id: v.id, text: v.text, kind: v.kind,
        status: v.status, author: v.assignedBy, recipient: v.recipient, unused: !v.executed })) : [];
    return { maxActive: c.maxActive, effectiveMaxActive: capacity(s), playStyle: c.playStyle,
      effectivePlayStyle: c.effectivePlayStyle, rotationSeconds: c.rotationSeconds, nextRotateAt: c.nextRotateAt,
      directors: role.directors, role: role.directors.includes(num) ? 'director' : 'player',
      receiverStatus: { paused: c.receivers?.[num]?.paused === true, cooldownUntil: Number(c.receivers?.[num]?.cooldownUntil) || 0,
        reason: ['player_paused', 'expired', 'display_unconfirmed'].includes(c.receivers?.[num]?.reason) ? c.receivers[num].reason : '' },
      receiverStatuses: isHost || role.directors.includes(num) ? receiverStatuses : receiverStatuses.filter(v => v.playerNum === num),
      summary,
      hostSummary: isHost ? { submitted: cards.length, queued: list(c.queue).length, active: activeNums(s).length,
        blocked: summary.blocked,
        done: cards.filter(v => v.status === 'done').length, skipped: cards.filter(v => v.status === 'skipped').length,
        expired: cards.filter(v => v.status === 'expired').length, paused: receiverStatuses.filter(v => v.status === 'paused').length,
        offline: receiverStatuses.filter(v => v.connection === 'offline').length, capacity: capacity(s) } : null,
      roundStage: c.roundStage, queueLocked: c.queueLocked, hostDelegate: c.hostDelegate,
      pendingPlayerNums: activeNums(s), pendingCount: activeNums(s).length, prompt: num > 0 && canPlay ? safePrompt(p, now) : null,
      offer: num > 0 && canPlay && offer && card && p?.status === 'pending' ? { id: offer.id, offerId: offer.id, promptId: p.id,
        oldPrompt: { id: p.id, text: p.text, kind: p.kind }, newCard: { id: offer.id + ':card', text: card.text, kind: card.kind } } : null,
      canAssign: active(s).includes(num) && (c.effectivePlayStyle !== 'director' || c.directors.includes(num)) && !c.queueLocked && ['thinking', 'talking'].includes(s.phase) && c.source !== 'system',
      myQueuedCount: list(c.queue).filter(item => item.assignedBy === num).length,
      library: owner && ownMember ? Object.values(s.crazyVault?.[owner] || {}).filter(v => !v.deleted && !v.returned).map(v => ({ id: v.id, text: v.text, target: v.target, version: v.version })) : [],
      returnedCards: owner && ownMember ? Object.values(s.crazyVault?.[owner] || {}).filter(v => !v.deleted && v.returned).map(v => ({ id: v.id, text: v.text, target: v.target, version: v.version })) : [],
      lastResult: num > 0 && ownMember && c.lastResults?.[num] ? clone(c.lastResults[num]) : null,
      unusedCards: ['sorting', 'reveal'].includes(c.roundStage) ? unusedCards(s, num, owner).map(v => ({ id: v.id, text: v.text, kind: v.kind, status: v.status, target: v.target })) : [],
      sortConfirmed: !!(owner && c.sortConfirmed?.[owner]), revealCards: visible,
      scoreOrder: active(s).map(playerNum => ({ playerNum, score: Number(s.scores?.[playerNum]) || 0 })).sort((a, b) => b.score - a.score || a.playerNum - b.playerNum),
      hostActions: { extend: isHost && c.roundStage === 'decision', drain: isHost && ['open', 'extension', 'decision'].includes(c.roundStage),
        delegate: isHost, reveal: isHost && c.roundStage === 'sorting',
        claim: num > 0 && active(s).includes(num) && c.roundStage === 'decision' && input.hostOnline === false && Number(now) >= Number(c.decisionAt) + 30000 && mayClaimDelegate(s, num, input) }
    };
  }
  function archiveRecords(s) {
    if (!s) return [];
    const records = list(s.crazy?.events).filter(v => v.version > (Number(v.persistedVersion) || 0)).map(v => ({
      id: v.id, version: v.version, persistedVersion: Number(v.persistedVersion) || 0, category: 'event', kind: 'task',
      text: v.type, eventType: v.type, status: 'done', sessionId: v.sessionId, createdAt: v.at, updatedAt: v.at,
      ...(v.actor == null ? {} : { actor: v.actor }),
      ...(v.author == null && v.from == null ? {} : { authorNum: v.author ?? v.from }),
      ...(v.recipient == null && v.to == null ? {} : { recipientNum: v.recipient ?? v.to }),
      ...(v.promptId == null ? {} : { promptId: v.promptId }), ...(v.cardId == null ? {} : { cardId: v.cardId }),
      ...(v.source == null ? {} : { source: v.source }),
      ...(v.reason == null && v.seconds == null ? {} : { reason: v.reason ?? 'seconds:' + v.seconds })
    }));
    for (const [ownerIdentity, vault] of Object.entries(s.crazyVault || {})) for (const card of Object.values(vault)) if (card.version > (Number(card.persistedVersion) || 0)) records.push({
      id: `vault:${ownerIdentity}:${card.id}`, version: card.version, persistedVersion: Number(card.persistedVersion) || 0,
      category: 'vault', ownerIdentity, cardId: card.id, kind: 'task', text: card.text, target: card.target,
      status: card.deleted ? 'deleted' : card.returned ? 'returned' : 'saved', createdAt: card.createdAt, updatedAt: card.updatedAt
    });
    return clone(records);
  }
  function ackRecords(s, acknowledgements) {
    const acks = list(acknowledgements);
    for (const record of list(s.crazy?.events)) {
      const ack = acks.find(a => a.id === record.id && Number.isInteger(a.version) && a.version > 0 && a.version <= record.version);
      if (ack) record.persistedVersion = Math.max(Number(record.persistedVersion) || 0, ack.version);
    }
    if (s.crazy) pruneEvents(s.crazy);
    for (const [owner, vault] of Object.entries(s.crazyVault || {})) for (const card of Object.values(vault)) {
      const ack = acks.find(a => a.id === `vault:${owner}:${card.id}` && Number.isInteger(a.version) && a.version > 0 && a.version <= card.version);
      if (ack) card.persistedVersion = Math.max(Number(card.persistedVersion) || 0, ack.version);
    }
    return s;
  }
  return { init, due, advance, assign, submit, action, view, activeNums, eligibleReceivers, capacity, maySystem, roles, closeRound, preserveUnusedForReset, cancelSuperseded, cancelMember, archiveRecords, ackRecords };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_VNEXT;
