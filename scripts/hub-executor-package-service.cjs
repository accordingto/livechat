// Prepare a separate deployment without copying local credentials or publicising runtime source.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
function inside(root, file) { const relative = path.relative(root, file); return relative && !relative.startsWith('..') && !path.isAbsolute(relative); }
function packageService({ serviceRoot, output, gameRoot = ROOT }) {
  serviceRoot = path.resolve(serviceRoot); output = path.resolve(output); gameRoot = path.resolve(gameRoot);
  if (output === serviceRoot || inside(serviceRoot, output) || inside(output, serviceRoot) || output === gameRoot || inside(gameRoot, output) || inside(output, gameRoot)) throw new Error('Choose an isolated output directory');
  if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error('Output must be empty');
  fs.mkdirSync(output, { recursive: true });
  const files = new Set();
  const write = (relative, source) => {
    const target = path.resolve(output, relative);
    if (!inside(output, target)) throw new Error('Invalid package path');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); files.add(relative.replaceAll('\\', '/'));
  };
  // The existing API handlers and their public code dependencies are explicit.
  for (const relative of ['api/open-mic-discovery.js','api/open-mic-lyrics.js','lib/youtube-discovery.js','lib/genius-metadata.js','package.json']) {
    write(relative, path.join(serviceRoot, relative));
  }
  const visited = new Set();
  function dependency(file) {
    file = path.resolve(file);
    if (!inside(gameRoot, file) || !/\.(?:js|cjs)$/.test(file)) throw new Error('Invalid runtime dependency');
    if (visited.has(file)) return;
    visited.add(file); write(path.relative(gameRoot, file), file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      if (match[1].startsWith('node:')) continue;
      if (!match[1].startsWith('.')) throw new Error('Unbundled runtime dependency');
      dependency(path.resolve(path.dirname(file), match[1]));
    }
  }
  dependency(path.join(gameRoot, 'api/hub-executor.js'));
  const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'vercel.json'), 'utf8'));
  config.functions ||= {}; config.functions['api/hub-executor.js'] = { maxDuration: 60 };
  config.routes = [
    { src: '^/api/hub-executor/?$', dest: '/api/hub-executor.js' },
    ...config.routes
  ];
  fs.writeFileSync(path.join(output, 'vercel.json'), JSON.stringify(config, null, 2) + '\n'); files.add('vercel.json');
  fs.writeFileSync(path.join(output, '.vercelignore'), ['*', ...[...files].flatMap(file => {
    const dirs = file.split('/').slice(0,-1); return [...dirs.map((_,i) => '!' + dirs.slice(0,i+1).join('/')), '!' + file];
  })].join('\n') + '\n');
  return [...files].sort();
}
module.exports = { packageService };
if (require.main === module) {
  const files = packageService({ serviceRoot: process.argv[2], output: process.argv[3] });
  process.stdout.write(JSON.stringify({ files: files.length, output: path.resolve(process.argv[3]) }) + '\n');
}
