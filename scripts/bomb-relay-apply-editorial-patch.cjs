#!/usr/bin/env node
/* One-time, repeatable editorial migration. The live editable bank stays JSON.
 * node scripts/bomb-relay-apply-editorial-patch.cjs [--check]
 * A conflict or missing ID is reported and never overwritten/inserted.
 */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'content/bomb-relay-prompts.json';
const PATCH = 'content/bomb-relay-editorial-v3-patch.json';
const FIELDS = ['pack', 'family', 'en', 'zhHant'];
const MARKER = 'talkBombEditorialV3';
const sameContent = (a, b) => FIELDS.every(field => a?.[field] === b?.[field]);
const nonemptyId = id => typeof id === 'string' && id.trim().length > 0;
const isEligible = card => card.disabled !== true && card.enabled !== false;
function validateCard(card) {
  if (!card || !nonemptyId(card.id) || !FIELDS.every(field => typeof card[field] === 'string' && card[field].trim())) {
    throw new TypeError('Cards must include id, pack, family, en and zhHant.');
  }
}
function applyPromptPatch(catalog, patch, { disabledIds = [] } = {}) {
  if (!Array.isArray(catalog) || patch?.schemaVersion !== 1 || !Array.isArray(patch.changes)) {
    throw new TypeError('Expected a catalog array and a version-1 patch.');
  }
  if (!Array.isArray(disabledIds) || !disabledIds.every(nonemptyId)) throw new TypeError('Invalid disabledIds.');
  const index = new Map();
  for (const card of catalog) {
    validateCard(card);
    if (index.has(card.id)) throw new RangeError(`Duplicate card ID: ${card.id}`);
    index.set(card.id, { ...card });
  }
  const seen = new Set();
  for (const change of patch.changes) {
    if (!nonemptyId(change?.id) || seen.has(change.id) || !['rewrite', 'defer'].includes(change.action)) throw new RangeError('Invalid or duplicate patch change.');
    seen.add(change.id); validateCard(change.before);
    if (change.before.id !== change.id) throw new RangeError('Mismatched before ID.');
    if (change.action === 'rewrite') {
      validateCard(change.after);
      if (change.after.id !== change.id) throw new RangeError('Rewrite cannot change ID.');
    }
  }
  const disabled = new Set([...disabledIds, ...catalog.filter(card => !isEligible(card)).map(card => card.id)]);
  // Persist pre-existing disabledIds into the one authoritative record source.
  for (const id of disabled) if (index.has(id) && isEligible(index.get(id))) index.get(id).disabled = true;
  const applied = [], alreadyApplied = [], conflicts = [], missing = [];
  for (const change of patch.changes) {
    const current = index.get(change.id);
    if (!current) { missing.push(change.id); continue; }
    if (change.action === 'rewrite' && sameContent(current, change.after)) { alreadyApplied.push(change.id); continue; }
    if (!sameContent(current, change.before)) {
      conflicts.push({ id: change.id, action: change.action, current: { ...current }, expected: change.before, proposed: change.after ?? null });
      continue;
    }
    if (change.action === 'defer' && disabled.has(change.id)) { alreadyApplied.push(change.id); continue; }
    const marker = current[MARKER] === undefined ? { [MARKER]: { patchId: patch.patchId, action: change.action, ...(change.reason ? { reason: change.reason } : {}) } } : {};
    if (change.action === 'defer') {
      disabled.add(change.id);
      index.set(change.id, { ...current, ...marker, disabled: true });
    } else {
      index.set(change.id, { ...current, ...Object.fromEntries(FIELDS.map(field => [field, change.after[field]])), ...marker });
    }
    applied.push(change.id);
  }
  return { catalog: [...index.values()], disabledIds: [...disabled], applied, alreadyApplied, conflicts, missing };
}
function migrate({ check = false } = {}) {
  const source = path.join(ROOT, SOURCE);
  const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
  const patch = JSON.parse(fs.readFileSync(path.join(ROOT, PATCH), 'utf8'));
  const result = applyPromptPatch(catalog, patch);
  if (result.conflicts.length || result.missing.length) {
    // Report reviewable conflicts without making a partial disk mutation.
    const error = new Error(`Editorial merge needs review: ${result.conflicts.length} conflicts, ${result.missing.length} missing IDs.`);
    error.result = result; throw error;
  }
  if (check && result.applied.length) throw new Error(`Unapplied editorial changes: ${result.applied.length}.`);
  if (!check) fs.writeFileSync(source, JSON.stringify(result.catalog, null, 2) + '\n');
  return result;
}
if (require.main === module) {
  try {
    const result = migrate({ check: process.argv.includes('--check') });
    console.log(JSON.stringify({ applied: result.applied.length, alreadyApplied: result.alreadyApplied.length, conflicts: result.conflicts.length, missing: result.missing.length, disabled: result.disabledIds.length, retained: result.catalog.length, active: result.catalog.filter(isEligible).length }));
  } catch (error) { console.error(error.message); if (error.result) console.error(JSON.stringify({ conflicts: error.result.conflicts, missing: error.result.missing }, null, 2)); process.exitCode = 1; }
}
module.exports = { applyPromptPatch, migrate, sameContent, isEligible, MARKER, PATCH };
