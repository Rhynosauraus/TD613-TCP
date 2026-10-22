import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runOrchestrationDecision,
  evaluateAblationOutcome,
  runAblationTrial,
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
  assert.equal(baseline.replication_status, 'ZERO_ROLES_UNCHECKED');
  assert.equal(baseline.empirical_replication_count, 0);
});

test('Missing observation input fails closed with HELD_MISSING_OBSERVATION', () => {
  // Aperture is active, but observation payload is empty/missing for Aperture
  const partialObservations = {
    PEDAGOGUE: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] }
  };
  const result = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE'], partialObservations);
  assert.equal(result.decision, 'HELD_MISSING_OBSERVATION');
  const apeFinding = result.findings.find(f => f.role === 'APERTURE');
  assert.equal(apeFinding.status, 'INPUT_MISSING');
  assert.equal(apeFinding.verdict, 'NOT_EVALUATED');
});

test('Decoupled Evaluator accurately classifies true negative prevention and benign true positive admission', () => {
  // 1. Benign scenario: 4 dolls succeed on benign inputs
  const benignTrial = runAblationTrial(
    ['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    CANONICAL_EMPIRICAL_SCENARIOS.BENIGN_ALL_PASS
  );
  assert.equal(benignTrial.orchestrator.decision, 'SUPPORTED');
  assert.equal(benignTrial.evaluation.outcome_class, 'TRUE_POSITIVE_ADMISSION');
  assert.equal(benignTrial.evaluation.is_sound, true);
  assert.equal(benignTrial.evaluation.defect_escaped, false);
  assert.equal(benignTrial.evaluation.failure_mode, null);

  // 2. Full 5-role catches true defect
  const defectTrial = runAblationTrial(
    FIVE_ROLES,
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY
  );
  assert.equal(defectTrial.orchestrator.decision, 'HELD');
  assert.equal(defectTrial.evaluation.outcome_class, 'TRUE_NEGATIVE_PREVENTION');
  assert.equal(defectTrial.evaluation.is_sound, true);
  assert.equal(defectTrial.evaluation.defect_escaped, false);
});

test('Empirical specialist trials: ablating specialized doll allows domain defect to escape to its characteristic failure mode', () => {
  // 1. Aperture defect (nonsymmetric covariance)
  const apTrial4 = runAblationTrial(
    ['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY
  );
  assert.equal(apTrial4.orchestrator.decision, 'SUPPORTED'); // Blinded orchestrator admits!
  assert.equal(apTrial4.evaluation.outcome_class, 'FALSE_POSITIVE_ADMISSION');
  assert.equal(apTrial4.evaluation.is_sound, false);
  assert.equal(apTrial4.evaluation.defect_escaped, true);
  assert.equal(apTrial4.evaluation.escaped_classification, 'FALSE_COMPLETION_ADMITTED');
  assert.equal(apTrial4.evaluation.failure_mode, FAILURE_MODES.MISSING_APERTURE.failure_mode);

  // 2. Atlas defect (winding mismatch)
  const atlasTrial4 = runAblationTrial(
    ['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'],
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_ATLAS_RELATIONAL
  );
  assert.equal(atlasTrial4.orchestrator.decision, 'SUPPORTED');
  assert.equal(atlasTrial4.evaluation.outcome_class, 'FALSE_POSITIVE_ADMISSION');
  assert.equal(atlasTrial4.evaluation.escaped_classification, 'CUSTODY_FORK_RISK_ACCEPTED');
  assert.equal(atlasTrial4.evaluation.failure_mode, FAILURE_MODES.MISSING_ATLAS.failure_mode);

  // 3. FADT defect (unconditioned action grant)
  const fadtTrial4 = runAblationTrial(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'],
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_FADT_STAGE_ERASURE
  );
  assert.equal(fadtTrial4.orchestrator.decision, 'SUPPORTED');
  assert.equal(fadtTrial4.evaluation.outcome_class, 'FALSE_POSITIVE_ADMISSION');
  assert.equal(fadtTrial4.evaluation.escaped_classification, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
  assert.equal(fadtTrial4.evaluation.failure_mode, FAILURE_MODES.MISSING_FADT.failure_mode);

  // 4. Temporal Custodian defect (missing required phase)
  const tempTrial4 = runAblationTrial(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'],
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_TEMPORAL_CHRONOLOGY
  );
  assert.equal(tempTrial4.orchestrator.decision, 'SUPPORTED');
  assert.equal(tempTrial4.evaluation.outcome_class, 'FALSE_POSITIVE_ADMISSION');
  assert.equal(tempTrial4.evaluation.escaped_classification, 'CHRONOLOGICAL_OBLIVION_ADMITTED');
  assert.equal(tempTrial4.evaluation.failure_mode, FAILURE_MODES.MISSING_TEMPORAL_CUSTODIAN.failure_mode);

  // 5. Pedagogue defect (cadence inversion: ACT before NOTICE)
  const pedTrial4 = runAblationTrial(
    ['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_PEDAGOGUE_CADENCE
  );
  assert.equal(pedTrial4.orchestrator.decision, 'SUPPORTED');
  assert.equal(pedTrial4.evaluation.outcome_class, 'FALSE_POSITIVE_ADMISSION');
  assert.equal(pedTrial4.evaluation.escaped_classification, 'HUMAN_COST_IGNORED');
  assert.equal(pedTrial4.evaluation.failure_mode, FAILURE_MODES.MISSING_PEDAGOGUE.failure_mode);
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

  // Check that every minus-one condition diverged from baseline in empirical trials
  assert.equal(report.diff_metrics.MINUS_PEDAGOGUE.empirical_trial_escaped_classification, 'HUMAN_COST_IGNORED');
  assert.equal(report.diff_metrics.MINUS_APERTURE.empirical_trial_escaped_classification, 'FALSE_COMPLETION_ADMITTED');
  assert.equal(report.diff_metrics.MINUS_ATLAS.empirical_trial_escaped_classification, 'CUSTODY_FORK_RISK_ACCEPTED');
  assert.equal(report.diff_metrics.MINUS_FADT.empirical_trial_escaped_classification, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
  assert.equal(report.diff_metrics.MINUS_TEMPORAL_CUSTODIAN.empirical_trial_escaped_classification, 'CHRONOLOGICAL_OBLIVION_ADMITTED');
});

test('Empirical non-redundancy: four dolls succeed on benign inputs without fifth', () => {
  const benign = CANONICAL_EMPIRICAL_SCENARIOS.BENIGN_ALL_PASS;

  // Four dolls without Aperture:
  const withoutAperture = runOrchestrationDecision(
    ['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutAperture.decision, 'SUPPORTED');
  assert.equal(withoutAperture.findings_count, 4);

  // Four dolls without Pedagogue:
  const withoutPedagogue = runOrchestrationDecision(
    ['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutPedagogue.decision, 'SUPPORTED');

  // Four dolls without Atlas:
  const withoutAtlas = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutAtlas.decision, 'SUPPORTED');

  // Four dolls without FADT:
  const withoutFadt = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'],
    benign
  );
  assert.equal(withoutFadt.decision, 'SUPPORTED');

  // Four dolls without Temporal Custodian:
  const withoutTemporal = runOrchestrationDecision(
    ['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'],
    benign
  );
  assert.equal(withoutTemporal.decision, 'SUPPORTED');
});
