/**
 * TD613 Dollhouse Actual Ablation Experiment (Full 5-Role Assay)
 * 
 * Runs the 5-role orchestration decision procedure against the frozen evidence packet
 * (tests/fixtures/dollhouse/blind-divergence/):
 *   - FULL_FIVE_ROLE (Pedagogue + Aperture + Atlas + FADT + Temporal Custodian)
 *   - NO_DOLLHOUSE_BASELINE
 *   - ORCHESTRATOR_ALONE
 *   - 5 Single-role conditions
 *   - 5 Minus-one-role conditions (MINUS_PEDAGOGUE, MINUS_APERTURE, MINUS_ATLAS, MINUS_FADT, MINUS_TEMPORAL_CUSTODIAN)
 * 
 * Measures actual diffs:
 *   - finding sets
 *   - promotion decisions
 *   - held coordinates
 *   - false consensus prevention (SHARED_ACQUISITION != INDEPENDENT_REPLICATION)
 *   - unique failure modes per jurisdiction
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCompleteDollhouseAblation, FIVE_ROLES } from '../app/engine/dollhouse-ablation-harness.js';

const roleAuditFiles = {
  PEDAGOGUE: resolve('tests/fixtures/dollhouse/blind-divergence/pedagogue-blind-audit.json'),
  APERTURE: resolve('tests/fixtures/dollhouse/blind-divergence/aperture-blind-audit.json'),
  ATLAS: resolve('tests/fixtures/dollhouse/blind-divergence/atlas-blind-audit.json'),
  FADT: resolve('tests/fixtures/dollhouse/blind-divergence/fadt-blind-audit.json'),
  TEMPORAL_CUSTODIAN: resolve('tests/fixtures/dollhouse/blind-divergence/temporal-custodian-blind-audit.json')
};

const roleAudits = {};
for (const [role, path] of Object.entries(roleAuditFiles)) {
  roleAudits[role] = JSON.parse(await readFile(path, 'utf8'));
}

const ablationReport = runCompleteDollhouseAblation(roleAudits);

const targetAblationPath = resolve('tests/fixtures/dollhouse/blind-divergence/ablation-experiment.json');
await writeFile(targetAblationPath, JSON.stringify(ablationReport, null, 2), 'utf8');

console.log('5-Role Ablation Experiment successfully executed and written to: ' + targetAblationPath);
console.log(`Evaluated ${ablationReport.total_conditions} conditions across ${FIVE_ROLES.length} jurisdictions.`);
console.log(`Full 5-role decision: ${ablationReport.full_five_role_verdict}`);
console.log(`Replication status: ${ablationReport.replication_audit.status}`);
