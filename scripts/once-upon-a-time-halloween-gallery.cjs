'use strict';
// Code-native public artwork contact sheets. Mechanical layout only: no image
// generation or creative editing, no room/player data and no external requests.
const fs = require('node:fs');
const path = require('node:path');
const H = require('../once-upon-a-time-halloween-deck.js');
const D = require('../once-upon-a-time-deck.js');
const repo = path.resolve(__dirname, '..');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function groups({ onlyNew = false, category = null } = {}) {
  const result = D.categories.flatMap(item => {
    const cards = H.storyCards.filter(card => card.category === item.id && (!onlyNew || card.artOrigin === 'new'));
    return [cards.slice(0, 15), cards.slice(15)].filter(part => part.length).map((part, index) => ({
      id: item.id + '-' + (index + 1), category: item.id, label: item.label + ' · ' + (index + 1), cards: part, color: item.color
    }));
  });
  for (let index = 0; index < H.endingCards.length; index += 10) result.push({ id: 'ending-' + (index / 10 + 1), category: 'ending', label: 'Ending · ' + (index + 1) + '–' + Math.min(index + 10, 20), cards: H.endingCards.slice(index, index + 10), color: '#d4af37' });
  return category ? result.filter(group => group.category === category) : result;
}
function galleryHTML(options = {}) {
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spooky Halloween · public art QA</title><style>body{margin:0;padding:24px;background:#111326;color:#f4f1ed;font:16px system-ui}h1{font:700 34px Georgia,serif;color:#ffd19a}h2{margin:34px 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}.card{border:1px solid #5d526e;border-radius:12px;overflow:hidden;background:#232139}.card img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.label{padding:12px;line-height:1.5}.label small{display:block;color:#c6c0d1;margin-top:6px}p{color:#c6c0d1}</style><h1>Spooky Halloween · Artwork review</h1><p>LOCAL PUBLIC ART QA — no private room or player cards. 150 Story cards and 20 light, funny Endings. Human review still decides whether each painting matches its word.</p>' + groups(options).map(group => '<h2>' + esc(group.label) + '</h2><div class="grid">' + group.cards.map(card => '<article class="card"><img loading="lazy" src="' + esc(card.imagePath) + '" alt="' + esc(card.title || card.text) + '"><div class="label">' + esc(card.category ? card.title : card.text) + '<small>' + esc((card.isInterrupt ? 'Interrupt · ' : '') + (card.category || 'Ending') + ' · ' + (card.artOrigin === 'reuse' ? 'Existing matching art' : 'New Halloween art')) + '</small></div></article>').join('') + '</div>').join('') + '</html>';
}
function wrap(text, maximum) {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > maximum) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}
async function renderGalleries(output, { skipMissing = false, onlyNew = false, category = null } = {}) {
  const sharp = require(process.env.ONCE_SHARP_PATH || 'sharp');
  const dir = path.resolve(output);
  if (!dir || dir === path.parse(dir).root || dir === repo) throw new Error('Choose a dedicated gallery output directory');
  fs.mkdirSync(dir, { recursive: true });
  const svg = (width, height, content) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' + content + '</svg>');
  const results = [];
  for (const group of groups({ onlyNew, category })) {
    const columns = group.category === 'ending' ? 2 : 3;
    const tileWidth = 288, imageHeight = 432, labelHeight = group.category === 'ending' ? 132 : 90;
    const margin = 22, gap = 16, header = 90, rows = Math.ceil(group.cards.length / columns);
    const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
    const height = header + rows * (imageHeight + labelHeight) + Math.max(0, rows - 1) * gap + margin;
    const layers = [{ input: svg(width, header, '<text x="22" y="32" fill="#ffd19a" font-family="sans-serif" font-size="24" font-weight="bold">Spooky Halloween · ' + esc(group.label) + '</text><text x="22" y="61" fill="#c6c0d1" font-family="sans-serif" font-size="14">PUBLIC ART QA · ' + group.cards.length + ' cards · ' + (onlyNew ? 'new art only' : 'new and explicitly reused paintings') + '</text>'), left: 0, top: 0 }];
    const missing = [];
    for (const [index, card] of group.cards.entries()) {
      const left = margin + (index % columns) * (tileWidth + gap), top = header + Math.floor(index / columns) * (imageHeight + labelHeight + gap);
      const file = path.join(repo, card.imagePath);
      if (!fs.existsSync(file)) {
        if (!skipMissing) throw new Error('Missing required artwork: ' + card.imagePath);
        missing.push(card.id);
        layers.push({ input: svg(tileWidth, imageHeight, '<rect width="100%" height="100%" fill="#302c42"/><text x="18" y="212" fill="#eee4d8" font-family="sans-serif" font-size="18">NOT GENERATED YET</text>'), left, top });
      } else layers.push({ input: await sharp(file).resize(tileWidth, imageHeight, { fit: 'contain', background: '#111326' }).png().toBuffer(), left, top });
      const label = card.category ? card.title : card.text;
      const lines = wrap(label, 25);
      const text = '<rect width="100%" height="100%" fill="#232139"/><rect width="100%" height="3" fill="' + group.color + '"/>' + lines.map((line, row) => '<text x="10" y="' + (27 + row * 22) + '" fill="#f4f1ed" font-family="sans-serif" font-size="16"' + (card.category ? ' font-weight="bold"' : '') + '>' + esc(line) + '</text>').join('') + '<text x="10" y="' + (labelHeight - 12) + '" fill="#c6c0d1" font-family="sans-serif" font-size="11">' + esc((card.isInterrupt ? 'Interrupt · ' : '') + (card.category || 'Ending') + ' · ' + card.artOrigin) + '</text>';
      layers.push({ input: svg(tileWidth, labelHeight, text), left, top: top + imageHeight });
    }
    const file = path.join(dir, 'once-halloween-' + group.id + (onlyNew ? '-new' : '') + '.png');
    await sharp({ create: { width, height, channels: 3, background: '#111326' } }).composite(layers).png().toFile(file);
    results.push({ category: group.category, group: group.id, file, cards: group.cards.length, missing });
  }
  return { world: 'halloween', complete: results.every(result => !result.missing.length), syntheticPrivateData: false, results };
}
module.exports = { groups, galleryHTML, renderGalleries };
if (require.main === module) {
  const args = process.argv.slice(2), output = args.find(arg => !arg.startsWith('--'));
  const category = args.find(arg => arg.startsWith('--category='))?.slice('--category='.length) || null;
  if (!output || category && !['character', 'thing', 'place', 'aspect', 'event', 'ending'].includes(category)) {
    console.error('Usage: node scripts/once-upon-a-time-halloween-gallery.cjs <output-directory> [--skip-missing] [--only-new] [--category=ending]'); process.exitCode = 1;
  } else renderGalleries(output, { skipMissing: args.includes('--skip-missing'), onlyNew: args.includes('--only-new'), category }).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
