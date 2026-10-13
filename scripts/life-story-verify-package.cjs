'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), directory = path.resolve(process.argv[2] || path.join(root, '../life-story-service-package'));
let checked = 0;
function scan(folder) {
  for (const name of fs.readdirSync(folder)) {
    const file = path.join(folder, name);
    if (fs.statSync(file).isDirectory()) {
      if (!['.vercel', 'node_modules', 'public'].includes(name)) scan(file);
      continue;
    }
    const relative = path.relative(directory, file).split(path.sep).join('/');
    if (['package.json','vercel.json','.vercelignore'].includes(relative) || relative.startsWith('lib/') || relative.startsWith('api/open-mic-')) continue;
    const source = path.join(root, relative);
    if (!fs.existsSync(source) || !fs.readFileSync(file).equals(fs.readFileSync(source))) throw new Error('Package/source mismatch: ' + relative);
    checked++;
  }
}
scan(directory);
const questions = require(path.join(directory, 'life-story-questions.cjs'));
if (questions.SEED_QUESTIONS.length !== 96) throw new Error('Incomplete packaged question bank');
console.log(`Deployment package matches ${checked} Hub source/assets and loads all 96 questions.`);
