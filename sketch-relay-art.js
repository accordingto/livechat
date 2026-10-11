/* Sketch Relay drawings: a compact, validated text encoding shared by the
 * rules, the drawing pad and every renderer. A page is a 1000×1000 square.
 * Each stroke is one style character (colour × size) followed by points,
 * every coordinate written as two base64url characters; strokes are joined
 * with ';'. An empty string is a blank page. Nothing here touches the DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SKETCH_RELAY_ART = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const INDEX = Object.fromEntries([...ALPHA].map((c, i) => [c, i]));
  const SIZE = 1000;
  const PAPER = '#fffaf0';
  // Ink colours; the last entry paints paper colour and acts as the eraser.
  const COLORS = Object.freeze(['#1f2430', '#e5484d', '#2f6fe4', '#1f9d55', '#f08c00', '#8b5cf6', '#8b5a2b', PAPER]);
  const ERASER = COLORS.length - 1;
  const WIDTHS = Object.freeze([6, 12, 24, 48]);
  const MAX_LENGTH = 16000;
  const MAX_STROKES = 1500;
  const PATTERN = /^[A-Za-z0-9_;-]*$/;

  const clamp = v => Math.max(0, Math.min(SIZE, Math.round(Number(v) || 0)));
  const pair = v => ALPHA[v >> 6] + ALPHA[v & 63];

  function encodeStroke(stroke) {
    const color = Math.max(0, Math.min(COLORS.length - 1, stroke.color | 0));
    const size = Math.max(0, Math.min(WIDTHS.length - 1, stroke.size | 0));
    const points = stroke.points || [];
    if (points.length < 2) return '';
    let out = ALPHA[color * 4 + size];
    for (let i = 0; i + 1 < points.length; i += 2) out += pair(clamp(points[i])) + pair(clamp(points[i + 1]));
    return out;
  }
  function encode(strokes) {
    return (strokes || []).map(encodeStroke).filter(Boolean).join(';');
  }
  // Returns null for anything that is not a well-formed drawing.
  function decode(art) {
    if (typeof art !== 'string' || art.length > MAX_LENGTH || !PATTERN.test(art)) return null;
    if (!art) return [];
    const parts = art.split(';');
    if (parts.length > MAX_STROKES) return null;
    const strokes = [];
    for (const part of parts) {
      if (part.length < 5 || (part.length - 1) % 4 !== 0) return null;
      const style = INDEX[part[0]];
      if (!(style < COLORS.length * 4)) return null;
      const points = [];
      for (let i = 1; i < part.length; i += 2) {
        const value = INDEX[part[i]] * 64 + INDEX[part[i + 1]];
        if (!(value <= SIZE)) return null;
        points.push(value);
      }
      strokes.push({ color: style >> 2, size: style & 3, points });
    }
    return strokes;
  }
  const valid = art => decode(art) !== null;

  // Ramer–Douglas–Peucker on a flat [x, y, x, y…] list.
  function simplify(points, epsilon = 1.5) {
    const n = points.length / 2;
    if (n <= 2) return points.slice();
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = points[a * 2], ay = points[a * 2 + 1], bx = points[b * 2], by = points[b * 2 + 1];
      const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
      let worst = -1, index = -1;
      for (let i = a + 1; i < b; i++) {
        const px = points[i * 2], py = points[i * 2 + 1];
        // A closed shape starts and ends at the same point: measure from that point.
        const d = length ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / length : Math.hypot(px - ax, py - ay);
        if (d > worst) { worst = d; index = i; }
      }
      if (worst > epsilon) { keep[index] = 1; stack.push([a, index], [index, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i * 2], points[i * 2 + 1]);
    return out;
  }

  // Smooth curve through midpoints; the same shape the pad draws live.
  function path(points) {
    const n = points.length / 2;
    if (n < 1) return '';
    const x = i => points[i * 2], y = i => points[i * 2 + 1];
    if (n === 1) return `M${x(0)} ${y(0)}l0.1 0`;
    if (n === 2) return `M${x(0)} ${y(0)}L${x(1)} ${y(1)}`;
    let d = `M${x(0)} ${y(0)}`;
    for (let i = 1; i < n - 1; i++) d += `Q${x(i)} ${y(i)} ${(x(i) + x(i + 1)) / 2} ${(y(i) + y(i + 1)) / 2}`;
    return d + `L${x(n - 1)} ${y(n - 1)}`;
  }
  function trace(ctx, points, scale) {
    const n = points.length / 2;
    if (n < 1) return;
    const x = i => points[i * 2] * scale, y = i => points[i * 2 + 1] * scale;
    ctx.beginPath(); ctx.moveTo(x(0), y(0));
    if (n === 1) ctx.lineTo(x(0) + 0.1, y(0));
    else if (n === 2) ctx.lineTo(x(1), y(1));
    else {
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2);
      ctx.lineTo(x(n - 1), y(n - 1));
    }
    ctx.stroke();
  }
  function paint(ctx, strokes, pixels) {
    const scale = pixels / SIZE;
    ctx.save();
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, pixels, pixels);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes || []) {
      ctx.strokeStyle = COLORS[stroke.color] || COLORS[0];
      ctx.lineWidth = (WIDTHS[stroke.size] || WIDTHS[1]) * scale;
      trace(ctx, stroke.points, scale);
    }
    ctx.restore();
  }
  const escapeAttr = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function svg(art, { label = '', className = 'sr-art' } = {}) {
    const strokes = decode(art) || [];
    const body = strokes.map(s => `<path d="${path(s.points)}" stroke="${COLORS[s.color]}" stroke-width="${WIDTHS[s.size]}"/>`).join('');
    return `<svg class="${escapeAttr(className)}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${escapeAttr(label)}" preserveAspectRatio="xMidYMid meet"><rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  }
  const isBlank = art => !(decode(art) || []).some(s => s.color !== ERASER);

  return Object.freeze({ SIZE, PAPER, COLORS, ERASER, WIDTHS, MAX_LENGTH, MAX_STROKES, encode, encodeStroke, decode, valid, simplify, path, paint, svg, isBlank });
});
