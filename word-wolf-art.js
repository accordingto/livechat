/* WORD WOLF illustrated cards. Names and ids belong to CONTENT alone; this
 * manifest maps each known item to its own local 640-square bitmap. No paired
 * answer or category illustration is substituted for an item's own picture. */
var WORD_WOLF_ART = (() => {
  'use strict';
  const content = typeof WORD_WOLF_CONTENT !== 'undefined' ? WORD_WOLF_CONTENT : require('./word-wolf-content.js');
  const ids = [...new Set(content.PAIRS.flatMap(pair => [pair.a.id, pair.b.id]))];
  if (ids.some(id => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) throw Error('invalid_word_wolf_art_id');
  const manifest = Object.freeze(Object.fromEntries(ids.map(id => [id, Object.freeze({
    id, src: `assets/word-wolf/cards-v1/${id}.webp`, width: 640, height: 640,
  })])));
  const get = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(manifest, id) ? manifest[id] : null;
  function item(id) {
    const image = get(id);
    if (!image) return '';
    // The adjacent live text supplies the name in both languages. Empty alt
    // avoids a duplicate announcement and exposes no extra clue or partner.
    return `<img class="ww-object-art" data-ww-art="${image.id}" src="${image.src}" width="${image.width}" height="${image.height}" alt="" aria-hidden="true" decoding="async" draggable="false">`;
  }
  return Object.freeze({ item, ids: Object.freeze(ids), get, manifest });
})();
if (typeof module === 'object' && module.exports) module.exports = WORD_WOLF_ART;
