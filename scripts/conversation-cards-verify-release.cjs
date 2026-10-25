'use strict';
/* Read-only frontend release check. No Firebase, API requests or local writes.
 * node scripts/conversation-cards-verify-release.cjs --self-test
 * node scripts/conversation-cards-verify-release.cjs [--base https://deployment.example/]
 * Text assets compare SHA256 after CRLF/CR -> LF; binary assets compare bytes.
 */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE = 'https://livechat-two-alpha.vercel.app/';
const WORD_WOLF_CONTENT = require('../word-wolf-content.js');
const FILES = Object.freeze([
  'index.html', 'play.html', 'i18n.js', 'shared.css', 'qrcode.js', 'firebase-config.js', 'room.js',
  'hub-launcher.js', 'hub-membership.css', 'hub-executor.js', 'card-table.js', 'card-table-ui.js', 'card-table.css',
  'bluff-king-live-chat.html', 'bluff-king-engine.js', 'bluff-king-topics.js', 'bluff-king-sync.js', 'bluff-king-cards.js', 'bluff-king-ui.js', 'bluff-king.css',
  'assets/bluff/party-mark.svg', 'assets/bluff/role-thinker.svg', 'assets/bluff/role-bluffer.svg', 'assets/bluff/role-truth.svg', 'assets/bluff/topic-night-v1.webp',
  'word-limit-theater.html', 'word-limit-engine.js', 'word-limit-content.js', 'word-limit-ui.js', 'word-limit-host.js', 'word-limit-theater.css',
  'assets/word-limit-theater/mark.svg', 'assets/word-limit-theater/anton-latin-400.woff2',
  'assets/word-limit-theater/courier-prime-latin-400.woff2', 'assets/word-limit-theater/courier-prime-latin-700.woff2',
  'who-knows.html', 'who-knows-engine.js', 'who-knows-words.js', 'who-knows-sync.js', 'who-knows-ui.js', 'who-knows-host.js', 'who-knows.css', 'assets/who-knows/mark.svg',
  'word-wolf.html', 'word-wolf-engine.js', 'word-wolf-content.js', 'word-wolf-art.js', 'word-wolf-ui.js', 'word-wolf-host.js', 'word-wolf.css', 'assets/word-wolf/mark.svg',
  ...WORD_WOLF_CONTENT.PAIRS.flatMap(pair => [pair.a, pair.b]).map(item => 'assets/word-wolf/cards-v1/' + item.id + '.webp'),
]);
function assetPath(file) {
  return typeof file === 'string' && /^[a-zA-Z0-9_./-]+$/.test(file) && !file.startsWith('/') && !file.split('/').some(part => !part || part === '.' || part === '..');
}
function normalizeBase(input = DEFAULT_BASE) {
  let url; try { url = new URL(input); } catch (_) { throw Error('invalid_base_url'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('base_requires_http_without_credentials_query_or_fragment');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}
function hash(bytes, file) {
  const content = /\.(?:html|js|css|svg|json)$/i.test(file) ? Buffer.from(bytes).toString('utf8').replace(/\r\n?/g, '\n') : bytes;
  return crypto.createHash('sha256').update(content).digest('hex');
}
function parseArgs(args) {
  if (args.includes('--self-test')) return { selfTest: true };
  let base;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base') {
      if (base !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('base_argument_required_once');
      base = args[++i];
    } else if (args[i].startsWith('--') || base !== undefined) throw Error('unsupported_argument');
    else base = args[i];
  }
  return { base: normalizeBase(base) };
}
async function verify({ base = DEFAULT_BASE, files = FILES, fetchImpl = globalThis.fetch,
  readLocal = file => fs.readFileSync(path.join(ROOT, file)), nonce = Date.now().toString(36), concurrency = 4 } = {}) {
  const normalizedBase = normalizeBase(base);
  if (!Array.isArray(files) || !files.length || files.some(file => !assetPath(file)) || new Set(files).size !== files.length) throw Error('invalid_asset_manifest');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw Error('invalid_concurrency');
  const results = Array(files.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    while (next < files.length) {
      const index = next++, file = files[index];
      const row = results[index] = { path: file, localSha256: null, deployedSha256: null, httpStatus: null, status: 'local_error', match: false };
      try { row.localSha256 = hash(await readLocal(file), file); } catch (_) { continue; }
      try {
        const url = new URL(file, normalizedBase); url.searchParams.set('verify', nonce);
        const response = await fetchImpl(url.href, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000) });
        row.httpStatus = response.status;
        row.deployedSha256 = hash(Buffer.from(await response.arrayBuffer()), file);
        row.match = response.ok && row.deployedSha256 === row.localSha256;
        row.status = !response.ok ? 'http_error' : row.match ? 'match' : 'mismatch';
      } catch (_) { row.status = 'network_error'; }
    }
  }));
  const matched = results.filter(row => row.match).length;
  return { ok: matched === files.length, readOnly: true, normalizedText: 'LF', algorithm: 'SHA256', matched, total: files.length, files: results };
}
async function selfTest() {
  assert.equal(new Set(FILES).size, FILES.length);
  for (const file of FILES) { assert.ok(assetPath(file)); assert.ok(fs.statSync(path.join(ROOT, file)).isFile()); }
  assert.equal(normalizeBase(), DEFAULT_BASE); assert.equal(normalizeBase('https://preview.example/release'), 'https://preview.example/release/');
  assert.deepEqual(parseArgs(['--self-test']), { selfTest: true });
  assert.deepEqual(parseArgs(['--base', 'https://preview.example/']), { base: 'https://preview.example/' });
  assert.deepEqual(parseArgs(['https://preview.example/']), { base: 'https://preview.example/' });
  assert.throws(() => parseArgs(['--base']), /base_argument/);
  assert.throws(() => parseArgs(['--unknown']), /unsupported/);
  assert.throws(() => normalizeBase('file:///private/file'), /base_requires/);
  assert.throws(() => normalizeBase('https://user:secret@example.com/'), /base_requires/);
  assert.throws(() => normalizeBase('https://example.com/?token=secret'), /base_requires/);
  assert.equal(hash(Buffer.from('a\r\nb\rc\n'), 'test.js'), hash(Buffer.from('a\nb\nc\n'), 'test.js'));
  assert.notEqual(hash(Buffer.from([13, 10]), 'font.woff2'), hash(Buffer.from([10]), 'font.woff2'));
  const content = { 'match.js': 'const x = 1;\r\n', 'different.css': 'body {}\n', 'missing.html': 'hello\n', 'broken.svg': '<svg/>\n', 'font.woff2': Buffer.from([13, 10, 0, 255]), 'local-missing.js': null };
  const requests = [];
  const report = await verify({ base: 'https://offline.invalid/release/', files: Object.keys(content), nonce: 'self-test',
    readLocal: file => { if (content[file] === null) throw Error('local_missing'); return Buffer.from(content[file]); },
    fetchImpl: async (url, options) => {
      requests.push({ url, options }); assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
      const file = new URL(url).pathname.split('/').pop();
      if (file === 'broken.svg') throw Error('offline_network_failure');
      return { ok: file !== 'missing.html', status: file === 'missing.html' ? 404 : 200,
        arrayBuffer: async () => Buffer.from(file === 'match.js' ? 'const x = 1;\n' : file === 'different.css' ? 'body { color:red; }\n' : content[file]) };
    } });
  assert.equal(report.ok, false); assert.equal(report.matched, 2); assert.equal(report.total, 6); assert.equal(requests.length, 5);
  assert.deepEqual(report.files.map(row => row.status), ['match', 'mismatch', 'http_error', 'network_error', 'match', 'local_error']);
  assert.ok(report.files.filter(row => row.deployedSha256).every(row => /^[a-f0-9]{64}$/.test(row.deployedSha256)));
  assert.ok(requests.every(request => new URL(request.url).searchParams.get('verify') === 'self-test'));
  assert.equal(JSON.stringify(report).includes('offline.invalid'), false, 'stdout report has asset paths/hashes, no base URLs or query capabilities');
  const success = await verify({ files: ['one.js'], readLocal: () => Buffer.from('x\r\n'), fetchImpl: async () => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from('x\n') }) });
  assert.equal(success.ok, true); assert.equal(success.matched, 1);
  await assert.rejects(verify({ files: ['../private'] }), /invalid_asset_manifest/);
  await assert.rejects(verify({ files: ['/rooms/private'] }), /invalid_asset_manifest/);
  await assert.rejects(verify({ files: ['file.js?token=secret'] }), /invalid_asset_manifest/);
  return { ok: true, offlineOnly: true, noNetworkRequests: true, productionRunPerformed: false, manifestAssets: FILES.length,
    cases: ['manifest-local-files', 'text-LF-normalization', 'binary-preservation', 'base-validation', 'CLI-base', 'match', 'mismatch', 'HTTP-failure', 'network-failure', 'local-failure', 'all-match-success', 'manifest-traversal-rejection'] };
}
module.exports = { FILES, DEFAULT_BASE, assetPath, normalizeBase, hash, parseArgs, verify, selfTest };
if (require.main === module) {
  Promise.resolve().then(() => parseArgs(process.argv.slice(2))).then(options => options.selfTest ? selfTest() : verify(options))
    .then(report => { console.log(JSON.stringify(report, null, 2)); if (!report.ok) process.exitCode = 1; })
    .catch(error => {
      // Errors are stable validation labels; never emit raw URLs/fetch errors.
      const reason = /^(?:invalid_base_url|base_requires_http_without_credentials_query_or_fragment|base_argument_required_once|unsupported_argument|invalid_asset_manifest|invalid_concurrency)$/.test(error.message) ? error.message : 'release_verification_failed';
      console.log(JSON.stringify({ ok: false, readOnly: true, reason })); process.exitCode = 1;
    });
}
