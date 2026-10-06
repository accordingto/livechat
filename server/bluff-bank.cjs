'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { publicQuestion } = require('../bluff-king-engine.js');
function validateQuestions(questions) {
  const errors = []; const ids = new Set(); const canonical = new Set();
  for (const q of questions) {
    const label = q.id || '(missing id)';
    for (const key of ['id', 'canonicalKnowledgeId', 'locale', 'term', 'publicPrompt', 'secretAnswer', 'revealExplanation', 'verificationStatus']) if (typeof q[key] !== 'string' || !q[key].trim()) errors.push(`${label}: missing ${key}`);
    if (ids.has(q.id)) errors.push(`${label}: duplicate id`); ids.add(q.id);
    if (q.enabled !== false && q.verificationStatus === 'verified') { if (canonical.has(q.canonicalKnowledgeId)) errors.push(`${label}: duplicate canonical knowledge in enabled pool`); canonical.add(q.canonicalKnowledgeId); if (!q.verifiedAt || Number.isNaN(Date.parse(q.verifiedAt))) errors.push(`${label}: missing verifiedAt`); if (!Array.isArray(q.sources) || !q.sources.length || q.sources.some(s => !s.title || !/^https:\/\//.test(s.url || ''))) errors.push(`${label}: verified source required`); }
    if (!Array.isArray(q.supportingFacts) || q.supportingFacts.length < 2 || q.supportingFacts.length > 3 || q.supportingFacts.some(x => typeof x !== 'string' || !x.trim())) errors.push(`${label}: two or three supporting facts required`);
    const expected = { none: 0, category: 1, choices: 3, options: 3 }[q.hintMode];
    if (expected === undefined || !Array.isArray(q.publicHints) || q.publicHints.length !== expected || q.publicHints.some(x => typeof x !== 'string' || !x.trim())) errors.push(`${label}: invalid public hint count`);
    const projected = publicQuestion(q); for (const key of ['secretAnswer', 'supportingFacts', 'sources', 'revealExplanation', 'verificationStatus', 'verifiedAt']) if (Object.hasOwn(projected, key)) errors.push(`${label}: secret field in public projection`);
  }
  return errors;
}
function loadBank(directory = path.join(__dirname, 'questions')) {
  if (!fs.existsSync(directory)) throw new Error('No private verified question files are installed.');
  const files = fs.readdirSync(directory).filter(f => f.endsWith('.json')).sort();
  const questions = files.flatMap(file => { const data = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')); return Array.isArray(data) ? data : data.questions || []; });
  const errors = validateQuestions(questions); if (errors.length) throw new Error(`Invalid private question bank: ${errors.slice(0, 10).join('; ')}`);
  const bank = questions.filter(q => q.enabled !== false && q.verificationStatus === 'verified'); if (!bank.length) throw new Error('No verified enabled topics are available.');
  return bank;
}
module.exports = { loadBank, validateQuestions };
