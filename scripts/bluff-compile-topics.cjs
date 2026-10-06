'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { loadBank, validateQuestions } = require('../server/bluff-bank.cjs');
const bank = loadBank();
const errors = validateQuestions(bank);
if (errors.length) throw new Error(errors.join('\n'));
const target = path.join(__dirname, '..', 'bluff-king-topics.js');
const output = `/* Verified original Bluff King topic cards. Loaded by the trusted host only.\n * This static game relies on the table rule against searching or inspecting source.\n * Rebuild: node scripts/bluff-compile-topics.cjs */\n(function(root){const cards=${JSON.stringify(bank)};if(typeof module==='object'&&module.exports)module.exports=cards;else root.BLUFF_QUESTIONS=cards;})(typeof globalThis!=='undefined'?globalThis:this);\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target,'utf8') !== output) throw new Error('Topic bundle is stale. Run node scripts/bluff-compile-topics.cjs.');
} else fs.writeFileSync(target,output);
console.log(`Validated ${bank.length} verified topics; ${bank.filter(q=>q.hintMode==='category').length} category, ${bank.filter(q=>q.hintMode==='choices'||q.hintMode==='options').length} choices, ${bank.filter(q=>q.hintMode==='none').length} no-hint; 0 unverified in the playable pool.`);
