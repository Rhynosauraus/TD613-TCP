import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runOrchestrationDecision,
  runCompleteDollhouseAblation,
  FIVE_ROLES,
  ROLE_INFRACTIONS,
  FAILURE_MODES,
  DOLLHOUSE_ABLATION_EXPERIMENT_SCHEMA,
  CANONICAL_EMPIRICAL_SCENARIOS
} from '../app/engine/dollhouse-ablation-harness.js';

const mockAudits = {
  PEDAGOGUE: { concern: 'Broken return promise trapped operator', jurisdiction: 'human_consequence_and_burden' },
  APERTURE: { concern: 'URL hash does not equal workspace admitted', jurisdiction: 'observability_and_identifiability' },
  ATLAS: { concern: 'Predecessor chain unverified across windows', jurisdiction: 'receiver_relative_custody' },
  FADT: { concern: 'Action grant exposed under erased conditioning', jurisdiction: 'finite_support_boundary' },
  TEMPORAL_CUSTODIAN: { concern: 'Phase 3 lacks phase 2 parent citation', jurisdiction: 'chronological_sequence' }
};

test('Full 5-Role Dollhouse detects all 5 infractions and holds route fail-closed', () => {
  const result = runOrchestrationDecision(FIVE_ROLES, mockAudits);

  assert.equal(result.active_roles.length, 5);
  assert.equal(result.findings_count, 5);
  assert.equal(result.decision, 'HELD');
  assert.equal(result.failure_mode, null);

  // All 5 distinct infractions detected
  assert.equal(result.detected_infractions.length, 5);
  assert.ok(result.detected_infractions.includes(ROLE_INFRACTIONS.PEDAGOGUE));
  assert.ok(result.detected_infractions.includes(ROLE_INFRACTIONS.APERTURE));
  assert.ok(result.detected_infractions.includes(ROLE_INFRACTIONS.ATLAS));
  assert.ok(result.detected_infractions.includes(ROLE_INFRACTIONS.FADT));
  assert.ok(result.detected_infractions.includes(ROLE_INFRACTIONS.TEMPORAL_CUSTODIAN));

  // Shared authority constraints preserved
  assert.equal(result.release_authority, false);
  assert.equal(result.deployment_authority, false);
  assert.equal(result.human_closure_required, true);
});

test('No-Dollhouse baseline permits unchecked mutation', () => {
  const baseline = runOrchestrationDecision([], mockAudits);
  assert.equal(baseline.active_roles.length, 0);
  assert.equal(baseline.findings_count, 0);
  assert.equal(baseline.decision, 'UNCHECKED_MUTATION_PERMITTED');
  assert.equal(baseline.failure_mode, FAILURE_MODES.NO_DOLLHOUSE.failure_mode);
});

test('Every minus-one role ablation exposes its exclusive characteristic defect', () => {
  // 1. MINUS_APERTURE => FALSE_COMPLETION_ADMITTED
  const minusAperture = runOrchestrationDecision(['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], mockAudits);
  assert.equal(minusAperture.decision, 'FALSE_COMPLETION_ADMITTED');
  assert.equal(minusAperture.failure_mode, FAILURE_MODES.MISSING_APERTURE.failure_mode);

  // 2. MINUS_ATLAS => CUSTODY_FORK_RISK_ACCEPTED
  const minusAtlas = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'], mockAudits);
  assert.equal(minusAtlas.decision, 'CUSTODY_FORK_RISK_ACCEPTED');
  assert.equal(minusAtlas.failure_mode, FAILURE_MODES.MISSING_ATLAS.failure_mode);

  // 3. MINUS_FADT => ILLEGAL_ACTION_ESCALATION_ACCEPTED
  const minusFadt = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'], mockAudits);
  assert.equal(minusFadt.decision, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
  assert.equal(minusFadt.failure_mode, FAILURE_MODES.MISSING_FADT.failure_mode);

  // 4. MINUS_TEMPORAL_CUSTODIAN => CHRONOLOGICAL_OBLIVION_ADMITTED
  const minusTemporal = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'], mockAudits);
  assert.equal(minusTemporal.decision, 'CHRONOLOGICAL_OBLIVION_ADMITTED');
  assert.equal(minusTemporal.failure_mode, FAILURE_MODES.MISSING_TEMPORAL_CUSTODIAN.failure_mode);

  // 5. MINUS_PEDAGOGUE => HUMAN_COST_IGNORED
  const minusPedagogue = runOrchestrationDecision(['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], mockAudits);
  assert.equal(minusPedagogue.decision, 'HUMAN_COST_IGNORED');
  assert.equal(minusPedagogue.failure_mode, FAILURE_MODES.MISSING_PEDAGOGUE.failure_mode);
});

test('False consensus prevention: 5/5 role agreement on 1 receipt yields 1 empirical replication only', () => {
  const result = runOrchestrationDecision(FIVE_ROLES, mockAudits);

  // 5 roles agreed, but on a single acquisition receipt!
  assert.equal(result.replication_status, 'SHARED_ACQUISITION_NOT_INDEPENDENT_REPLICATION');
  assert.equal(result.empirical_replication_count, 1);
  assert.equal(result.independent_replication, false);
});

test('runCompleteDollhouseAblation runs all 13 conditions and proves non-redundancy', () => {
  const report = runCompleteDollhouseAblation(mockAudits);

  assert.equal(report.schema, DOLLHOUSE_ABLATION_EXPERIMENT_SCHEMA);
  assert.equal(report.total_conditions, 13);
  assert.equal(report.full_five_role_verdict, 'HELD');
  assert.equal(report.evaluated_roles.length, 5);

  // Check diff metrics for all 5 minus-one conditions
  assert.ok(report.diff_metrics.MINUS_PEDAGOGUE.lost_findings_count === 1);
  assert.ok(report.diff_metrics.MINUS_APERTURE.lost_findings_count === 1);
  assert.ok(report.diff_metrics.MINUS_ATLAS.lost_findings_count === 1);
  assert.ok(report.diff_metrics.MINUS_FADT.lost_findings_count === 1);
  assert.ok(report.diff_metrics.MINUS_TEMPORAL_CUSTODIAN.lost_findings_count === 1);

  // Check that every minus-one condition diverged from baseline decision
  assert.equal(report.diff_metrics.MINUS_PEDAGOGUE.decision_matches_baseline, false);
  assert.equal(report.diff_metrics.MINUS_APERTURE.decision_matches_baseline, false);
  assert.equal(report.diff_metrics.MINUS_ATLAS.decision_matches_baseline, false);
  assert.equal(report.diff_metrics.MINUS_FADT.decision_matches_baseline, false);
  assert.equal(report.diff_metrics.MINUS_TEMPORAL_CUSTODIAN.decision_matches_baseline, false);
});

test('Empirical non-redundancy: four dolls succeed on benign inputs without fifth', () => {
  const benign = CANONICAL_EMPIRICAL_SCENARIOS.BENIGN_ALL_PASS;

  // Four dolls without Aperture:
  const withoutAperture = runOrchestrationDecision(
    ['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutAperture.decision, 'SUPPORTED');
  assert.equal(withoutAperture.failure_mode, null);
  assert.equal(withoutAperture.findings_count, 4);

  // Four dolls without Pedagogue:
  const withoutPedagogue = runOrchestrationDecision(
    ['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutPedagogue.decision, 'SUPPORTED');
  assert.equal(withoutPedagogue.failure_mode, null);

  // Four dolls without Atlas:
  const withoutAtlas = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutAtlas.decision, 'SUPPORTED');
  assert.equal(withoutAtlas.failure_mode, null);

  // Four dolls without FADT:
  const withoutFadt = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutFadt.decision, 'SUPPORTED');
  assert.equal(withoutFadt.failure_mode, null);

  // Four dolls without Temporal Custodian:
  const withoutTemporal = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'],
    benign
  );
  assert.equal(withoutTemporal.decision, 'SUPPORTED');
  assert.equal(withoutTemporal.failure_mode, null);
});

test('Empirical specialist trials: ablating specialized doll allows domain defect to escape to its characteristic failure mode', () => {
  // 1. Aperture defect (nonsymmetric covariance)
  const apTrial5 = runOrchestrationDecision(FIVE_ROLES, CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY);
  assert.equal(apTrial5.decision, 'HELD');
  assert.ok(apTrial5.detected_infractions.includes(ROLE_INFRACTIONS.APERTURE));

  const apTrial4 = runOrchestrationDecision(['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY);
  assert.equal(apTrial4.decision, 'FALSE_COMPLETION_ADMITTED');
  assert.equal(apTrial4.failure_mode, FAILURE_MODES.MISSING_APERTURE.failure_mode);

  // 2. Atlas defect (winding mismatch)
  const atlasTrial5 = runOrchestrationDecision(FIVE_ROLES, CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_ATLAS_RELATIONAL);
  assert.equal(atlasTrial5.decision, 'HELD');

  const atlasTrial4 = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_ATLAS_RELATIONAL);
  assert.equal(atlasTrial4.decision, 'CUSTODY_FORK_RISK_ACCEPTED');
  assert.equal(atlasTrial4.failure_mode, FAILURE_MODES.MISSING_ATLAS.failure_mode);

  // 3. FADT defect (unconditioned action grant)
  const fadtTrial5 = runOrchestrationDecision(FIVE_ROLES, CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_FADT_STAGE_ERASURE);
  assert.equal(fadtTrial5.decision, 'HELD');

  const fadtTrial4 = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_FADT_STAGE_ERASURE);
  assert.equal(fadtTrial4.decision, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
  assert.equal(fadtTrial4.failure_mode, FAILURE_MODES.MISSING_FADT.failure_mode);

  // 4. Temporal Custodian defect (missing required phase)
  const tempTrial5 = runOrchestrationDecision(FIVE_ROLES, CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_TEMPORAL_CHRONOLOGY);
  assert.equal(tempTrial5.decision, 'HELD');

  const tempTrial4 = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_TEMPORAL_CHRONOLOGY);
  assert.equal(tempTrial4.decision, 'CHRONOLOGICAL_OBLIVION_ADMITTED');
  assert.equal(tempTrial4.failure_mode, FAILURE_MODES.MISSING_TEMPORAL_CUSTODIAN.failure_mode);

  // 5. Pedagogue defect (cadence inversion: ACT before NOTICE)
  const pedTrial5 = runOrchestrationDecision(FIVE_ROLES, CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_PEDAGOGUE_CADENCE);
  assert.equal(pedTrial5.decision, 'HELD');

  const pedTrial4 = runOrchestrationDecision(['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_PEDAGOGUE_CADENCE);
  assert.equal(pedTrial4.decision, 'HUMAN_COST_IGNORED');
  assert.equal(pedTrial4.failure_mode, FAILURE_MODES.MISSING_PEDAGOGUE.failure_mode);
});
