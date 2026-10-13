'use strict';
// Life Story keeps the Hub's existing capability/ETag transport, while keeping
// the canonical hands out of the manager browser's Firebase subscription too.
const crypto = require('node:crypto');
const copy = value => JSON.parse(JSON.stringify(value));
function seal(value, key, purpose) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url');
}
function open(value, key, purpose) {
  try {
    const bytes = Buffer.from(value, 'base64url'), cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8'));
  } catch { throw Object.assign(new Error('invalid_life_state'), { code: 'invalid_life_state', status: 409 }); }
}
function protectAdapter(adapter, key) {
  return {
    ...adapter,
    apply(state, command, ctx) {
      if (state?.mode !== 'life_story') return adapter.apply(state, command, ctx);
      const seed = Number.parseInt(crypto.createHmac('sha256', key).update(state.sessionId + ':' + command.id).digest('hex').slice(0, 8), 16);
      return adapter.apply(state, command, { ...ctx, seed });
    },
    decode(raw) {
      const header = adapter.decode(raw);
      if (header?.mode !== 'life_story') return header;
      if (header.publicLifeView) {
        if (!raw.lifeStateCipher || raw.lifeStateSession !== header.sessionId) throw Object.assign(new Error('invalid_life_state'), { code: 'invalid_life_state', status: 409 });
        return open(raw.lifeStateCipher, key, 'icebreak-life-state-v1:' + header.sessionId);
      }
      // A browser may open an empty lobby, but never import an already played
      // private state into the trusted mode. The service deals and advances it.
      if (header.phase !== 'LOBBY' || !header.lifeRoom || header.lifeRoom.players.some(p => p.hand?.length))
        throw Object.assign(new Error('server_required'), { code: 'server_required', status: 409 });
      if (raw.lifeHistoryCipher) header.lifeRoom.questionHistory = open(raw.lifeHistoryCipher, key, 'icebreak-life-history-v1');
      return header;
    },
    encode(raw, state) {
      const next = adapter.encode(raw, state);
      if (state.mode !== 'life_story') {
        delete next.lifeStateCipher; delete next.lifeStateSession;
        return next;
      }
      const projected = adapter.project(state, { playerNum: 0 }, { now: Number(state.lifeRoom?.clock) || Number(state.createdAt) || 0 });
      const header = {
        mode: 'life_story', version: 1, sessionId: state.sessionId, turnId: state.turnId,
        revision: state.revision, phase: state.phase, roster: copy(state.roster), sharedControls: true,
        hostPlayerNum: state.hostPlayerNum, publicLifeView: copy(projected.dixit)
      };
      next.lifeStateCipher = seal(state, key, 'icebreak-life-state-v1:' + state.sessionId);
      next.lifeStateSession = state.sessionId;
      next.lifeHistoryCipher = seal(state.lifeRoom.questionHistory, key, 'icebreak-life-history-v1');
      if (Object.hasOwn(next, 'state')) next.state = header;
      if (Object.hasOwn(next, 'stateJson')) next.stateJson = JSON.stringify(header);
      return next;
    }
  };
}
module.exports = { protectAdapter };
