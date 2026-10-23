import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runOrchestrationDecision,
  evaluateAblationOutcome,
  runAblationTrial,
  runCompleteDollhouseAblation,
  executeSpecialistRole,
  FIVE_ROLES,
  ROLE_INFRACTIONS,
  FAILURE_MODES,
  DOLLHOUSE_ABLATION_EXPERIMENT_SCHEMA,
  DOLLHOUSE_ACQUISITION_RECEIPT_SCHEMA,
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

test('No-Dollhouse baseline permits unchecked mutation while Orchestrator-alone holds fail-closed', () => {
  // 1. Raw baseline: no dollhouse governance
  const baseline = runOrchestrationDecision([], mockAudits, { orchestrator_governance: false });
  assert.equal(baseline.active_roles.length, 0);
  assert.equal(baseline.findings_count, 0);
  assert.equal(baseline.decision, 'UNCHECKED_MUTATION_PERMITTED');
  assert.equal(baseline.consensus, 'NONE');
  assert.equal(baseline.replication_status, 'ZERO_ROLES_UNCHECKED');
  assert.equal(baseline.empirical_replication_count, 0);

  // 2. Orchestrator active but possesses zero specialist senses: fails closed
  const orchAlone = runOrchestrationDecision([], mockAudits, { orchestrator_governance: true });
  assert.equal(orchAlone.active_roles.length, 0);
  assert.equal(orchAlone.findings_count, 0);
  assert.equal(orchAlone.decision, 'HELD_NO_ACTIVE_SPECIALISTS');
  assert.equal(orchAlone.consensus, 'ABSTAIN_NO_SPECIALIST_SENSES');
  assert.equal(orchAlone.replication_status, 'ZERO_ROLES_ACTIVE');
  assert.equal(orchAlone.empirical_replication_count, 0);
});

test('Unrecognized role identities and malformed schemas reject fail-closed', () => {
  // 1. Unknown role rejected
  const unknownRoleResult = runOrchestrationDecision(['PEDAGOGUE', 'GHOST_SPECIALIST'], mockAudits);
  assert.equal(unknownRoleResult.decision, 'HELD_UNKNOWN_ROLE');
  assert.equal(unknownRoleResult.detected_infractions[0], 'UNRECOGNIZED_ROLE_REJECTED');
  assert.equal(unknownRoleResult.findings[0].status, 'UNKNOWN_ROLE_REJECTED');

  // 2. Malformed observation schema rejected fail-closed without emitting domain infraction
  const malformedAperture = executeSpecialistRole('APERTURE', { arbitrary_field: 123 });
  assert.equal(malformedAperture.verdict, 'HELD');
  assert.equal(malformedAperture.status, 'MALFORMED_OBSERVATION_SCHEMA');
  assert.deepEqual(malformedAperture.infractions, ['MALFORMED_OBSERVATION_SCHEMA']);
  assert.ok(!malformedAperture.infractions.includes(ROLE_INFRACTIONS.APERTURE));
  assert.ok(malformedAperture.concern.includes('Malformed observation schema'));

  // 3. clean: true bypass eliminated: clean: true is rejected as malformed schema rather than returning SUPPORTED
  const cleanBypassPedagogue = executeSpecialistRole('PEDAGOGUE', { clean: true });
  assert.equal(cleanBypassPedagogue.verdict, 'HELD');
  assert.equal(cleanBypassPedagogue.status, 'MALFORMED_OBSERVATION_SCHEMA');
  assert.deepEqual(cleanBypassPedagogue.infractions, ['MALFORMED_OBSERVATION_SCHEMA']);

  // 4. Evaluator integrity: malformed schema hold evaluates to MALFORMED_OBSERVATION_REJECTED, NOT true defect detection
  const malformedRun = runOrchestrationDecision(['APERTURE'], { APERTURE: { malformed: true } });
  const evalMalformed = evaluateAblationOutcome(malformedRun, { verdict: 'HELD', defects: [ROLE_INFRACTIONS.APERTURE] });
  assert.equal(evalMalformed.outcome_class, 'MALFORMED_OBSERVATION_REJECTED');
  assert.equal(evalMalformed.is_sound, true);
  assert.equal(evalMalformed.defect_escaped, false);
  assert.equal(evalMalformed.defect_detected, false);

  // 5. Evaluator rejects malformed or missing ground truth fail-closed
  const evalBadGt = evaluateAblationOutcome(malformedRun, { invalid: 'ground-truth' });
  assert.equal(evalBadGt.status, 'MALFORMED_GROUND_TRUTH_REJECTED');
  assert.equal(evalBadGt.outcome_class, 'UNADJUDICATED');
  assert.equal(evalBadGt.is_sound, false);

  // 6. Caller-declared verdict cannot override detected defect
  const contaminatedInput = executeSpecialistRole('PEDAGOGUE', { concern: 'user navigation trap', verdict: 'SUPPORTED' });
  assert.equal(contaminatedInput.verdict, 'HELD');
  assert.equal(contaminatedInput.status, 'VIOLATION_DETECTED');
});

test('Missing observation input fails closed with HELD_MISSING_OBSERVATION and evaluates to safe abstention', () => {
  // Aperture is active, but observation payload is empty/missing for Aperture
  const partialObservations = {
    PEDAGOGUE: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] }
  };
  const result = runOrchestrationDecision(['PEDAGOGUE', 'APERTURE'], partialObservations);
  assert.equal(result.decision, 'HELD_MISSING_OBSERVATION');
  const apeFinding = result.findings.find(f => f.role === 'APERTURE');
  assert.equal(apeFinding.status, 'INPUT_MISSING');
  assert.equal(apeFinding.verdict, 'NOT_EVALUATED');

  // Evaluate against ground truth: safe abstention (not counted as true negative detection)
  const evalOutcome = evaluateAblationOutcome(result, { verdict: 'HELD', defects: [ROLE_INFRACTIONS.APERTURE] });
  assert.equal(evalOutcome.outcome_class, 'SAFE_ABSTENTION_INSUFFICIENT_EVIDENCE');
  assert.equal(evalOutcome.is_sound, true);
  assert.equal(evalOutcome.defect_escaped, false);
  assert.equal(evalOutcome.defect_detected, false);
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
  // 1. Synthetic offline execution yields 0 empirical replications
  const syntheticResult = runOrchestrationDecision(FIVE_ROLES, mockAudits);
  assert.equal(syntheticResult.replication_status, 'SYNTHETIC_OFFLINE_FIXTURE');
  assert.equal(syntheticResult.empirical_replication_count, 0);
  assert.equal(syntheticResult.independent_replication, false);

  // 2. Caller-declared empirical string without receipt yields 0 empirical replications (cannot manufacture credit)
  const callerDeclaredAudits = { ...mockAudits, acquisition_class: 'EMPIRICAL_ACQUISITION' };
  const callerDeclaredResult = runOrchestrationDecision(FIVE_ROLES, callerDeclaredAudits);
  assert.equal(callerDeclaredResult.replication_status, 'CALLER_DECLARED_UNAUTHENTICATED_EMPIRICAL');
  assert.equal(callerDeclaredResult.empirical_replication_count, 0);
  assert.equal(callerDeclaredResult.independent_replication, false);

  // 3. Authenticated empirical acquisition receipt yields at most 1 empirical replication
  const authenticatedAudits = {
    ...mockAudits,
    acquisition_class: 'EMPIRICAL_ACQUISITION',
    acquisition_receipt: {
      schema: DOLLHOUSE_ACQUISITION_RECEIPT_SCHEMA,
      acquisition_boundary: 'NEON_HOSTED_DURABLE_HEAD_OBSERVATORY',
      receipt_sha256: 'c'.repeat(64),
      verified: true
    }
  };
  const authenticatedResult = runOrchestrationDecision(FIVE_ROLES, authenticatedAudits);
  assert.equal(authenticatedResult.replication_status, 'AUTHENTICATED_EMPIRICAL_ACQUISITION');
  assert.equal(authenticatedResult.empirical_replication_count, 1);
  assert.equal(authenticatedResult.independent_replication, false);
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
