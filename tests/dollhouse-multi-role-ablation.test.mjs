import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';

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
  TRUSTED_ACQUISITION_REGISTRIES,
  computeAcquisitionPayloadDigest,
  computeAcquisitionReceiptDigest,
  verifyAcquisitionReceipt,
  CANONICAL_EMPIRICAL_SCENARIOS
} from '../app/engine/dollhouse-ablation-harness.js';

const mockAudits = {
  PEDAGOGUE: { fixture_class: 'SYNTHETIC_FAULT_INJECTION', concern: 'Broken return promise trapped operator', jurisdiction: 'human_consequence_and_burden' },
  APERTURE: { fixture_class: 'SYNTHETIC_FAULT_INJECTION', concern: 'URL hash does not equal workspace admitted', jurisdiction: 'observability_and_identifiability' },
  ATLAS: { fixture_class: 'SYNTHETIC_FAULT_INJECTION', concern: 'Predecessor chain unverified across windows', jurisdiction: 'receiver_relative_custody' },
  FADT: { fixture_class: 'SYNTHETIC_FAULT_INJECTION', concern: 'Action grant exposed under erased conditioning', jurisdiction: 'finite_support_boundary' },
  TEMPORAL_CUSTODIAN: { fixture_class: 'SYNTHETIC_FAULT_INJECTION', concern: 'Phase 3 lacks phase 2 parent citation', jurisdiction: 'chronological_sequence' }
};

function makeAcquisitionReceipt(observations, overrides = {}) {
  const observationDigest = computeAcquisitionPayloadDigest(observations);
  const receipt = {
    schema: DOLLHOUSE_ACQUISITION_RECEIPT_SCHEMA,
    authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY',
    acquisition_boundary: 'NEON_LOOM_CUSTODY_OBSERVATORY',
    source_revision: 'b'.repeat(40),
    observation_digest: observationDigest,
    ...overrides
  };
  const receiptDigest = computeAcquisitionReceiptDigest(receipt);
  receipt.verification_digest = receiptDigest;

  const authority = TRUSTED_ACQUISITION_REGISTRIES[receipt.authority_id];
  const envKey = authority?.env_key_var ? process.env[authority.env_key_var] : null;
  const key = overrides.signing_key || envKey || authority?.verification_key || 'test-key';
  receipt.signature = crypto.createHmac('sha256', key).update(receiptDigest).digest('hex');
  delete receipt.signing_key;
  return receipt;
}

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

  // 6. Caller-declared verdict cannot override executed domain defect
  const contaminatedInput = executeSpecialistRole('PEDAGOGUE', {
    events: [{ phase: 'ACT', at: 10 }, { phase: 'NOTICE', at: 20 }], // Cadence violation
    verdict: 'SUPPORTED' // Contaminating caller verdict
  });
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

  // 3. Caller-controlled dummy receipt (e.g. legacy v0.1 format or unverified digest) receives 0 empirical credit
  const legacyReceiptAudits = {
    ...mockAudits,
    acquisition_class: 'EMPIRICAL_ACQUISITION',
    acquisition_receipt: {
      schema: 'td613.dollhouse.acquisition-receipt/v0.1',
      acquisition_boundary: 'NEON_HOSTED_DURABLE_HEAD_OBSERVATORY',
      receipt_sha256: 'c'.repeat(64),
      verified: true
    }
  };
  const legacyResult = runOrchestrationDecision(FIVE_ROLES, legacyReceiptAudits);
  assert.equal(legacyResult.replication_status, 'UNAUTHENTICATED_RECEIPT_REJECTED');
  assert.equal(legacyResult.empirical_replication_count, 0);

  // 4. Untrusted acquisition authority receives 0 empirical credit
  const untrustedReceiptAudits = {
    ...mockAudits,
    acquisition_class: 'EMPIRICAL_ACQUISITION',
    acquisition_receipt: makeAcquisitionReceipt(mockAudits, {
      authority_id: 'UNTRUSTED_ACQUISITION_OBSERVATORY'
    })
  };
  const untrustedResult = runOrchestrationDecision(FIVE_ROLES, untrustedReceiptAudits);
  assert.equal(untrustedResult.replication_status, 'UNAUTHENTICATED_RECEIPT_REJECTED');
  assert.equal(untrustedResult.empirical_replication_count, 0);

  process.env.TD613_NEON_OBSERVATORY_VERIFICATION_KEY = 'neon-test-observatory-key-2026';
  try {
    // 5. Corrupted signature receives 0 empirical credit
    const corruptedReceipt = makeAcquisitionReceipt(mockAudits);
    corruptedReceipt.signature = '0'.repeat(64);
    const corruptedResult = runOrchestrationDecision(FIVE_ROLES, {
      ...mockAudits,
      acquisition_class: 'EMPIRICAL_ACQUISITION',
      acquisition_receipt: corruptedReceipt
    });
    assert.equal(corruptedResult.replication_status, 'UNAUTHENTICATED_RECEIPT_REJECTED');
    assert.equal(corruptedResult.empirical_replication_count, 0);

    // 6. Observation payload digest mismatch receives 0 empirical credit
    const mismatchReceipt = makeAcquisitionReceipt({ different: 'payload' });
    const mismatchResult = runOrchestrationDecision(FIVE_ROLES, {
      ...mockAudits,
      acquisition_class: 'EMPIRICAL_ACQUISITION',
      acquisition_receipt: mismatchReceipt
    });
    assert.equal(mismatchResult.replication_status, 'UNAUTHENTICATED_RECEIPT_REJECTED');
    assert.equal(mismatchResult.empirical_replication_count, 0);

    // 7. Synthetic test key receipt (SYNTHETIC_TEST_ACQUISITION) proves verifier behavior but earns ZERO empirical acquisition credit
    const syntheticKeyReceiptAudits = {
      ...mockAudits,
      acquisition_class: 'EMPIRICAL_ACQUISITION',
      acquisition_receipt: makeAcquisitionReceipt(mockAudits, {
        authority_id: 'SYNTHETIC_TEST_ACQUISITION',
        acquisition_boundary: 'SYNTHETIC_TEST_OBSERVATORY'
      })
    };
    const syntheticKeyResult = runOrchestrationDecision(FIVE_ROLES, syntheticKeyReceiptAudits);
    assert.equal(syntheticKeyResult.replication_status, 'SYNTHETIC_VERIFIED_RECEIPT_ZERO_EMPIRICAL_CREDIT');
    assert.equal(syntheticKeyResult.empirical_replication_count, 0);

    // 8. Authenticated empirical acquisition receipt from authentic external authority yields count 1
    const authenticatedAudits = {
      ...mockAudits,
      acquisition_class: 'EMPIRICAL_ACQUISITION',
      acquisition_receipt: makeAcquisitionReceipt(mockAudits, {
        authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY'
      })
    };
    const authenticatedResult = runOrchestrationDecision(FIVE_ROLES, authenticatedAudits);
    assert.equal(authenticatedResult.replication_status, 'AUTHENTICATED_EMPIRICAL_ACQUISITION');
    assert.equal(authenticatedResult.empirical_replication_count, 1);
    // Shared acquisition across 5 dolls does NOT manufacture independent replication across multiple acquisitions
    assert.equal(authenticatedResult.independent_replication, false);
  } finally {
    delete process.env.TD613_NEON_OBSERVATORY_VERIFICATION_KEY;
  }

  // 9. When external observatory key is NOT provisioned -> EXTERNAL_ACQUISITION_ANCHOR_UNAVAILABLE_HELD
  delete process.env.TD613_NEON_OBSERVATORY_VERIFICATION_KEY;
  const unprovisionedAudits = {
    ...mockAudits,
    acquisition_class: 'EMPIRICAL_ACQUISITION',
    acquisition_receipt: makeAcquisitionReceipt(mockAudits, {
      authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY'
    })
  };
  const unprovisionedResult = runOrchestrationDecision(FIVE_ROLES, unprovisionedAudits);
  assert.equal(unprovisionedResult.replication_status, 'EXTERNAL_ACQUISITION_ANCHOR_UNAVAILABLE_HELD');
  assert.equal(unprovisionedResult.empirical_replication_count, 0);

  // 10. Caller cannot replace acquisition trust registry via options.trusted_registry
  const forgedAcqRegistry = {
    NEON_LOOM_CUSTODY_OBSERVATORY: {
      authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY',
      authority_class: 'FORGED_OBSERVATORY',
      verification_key: 'backdoor-acq-key',
      is_authentic_external: true
    }
  };
  const callerReceipt = makeAcquisitionReceipt(mockAudits, { signing_key: 'backdoor-acq-key' });
  const directVerify = verifyAcquisitionReceipt(callerReceipt, mockAudits, { trusted_registry: forgedAcqRegistry });
  assert.equal(directVerify.verified, false);
  assert.equal(directVerify.failure_reason, 'EXTERNAL_TRUST_ANCHOR_NOT_PROVISIONED');

  // 11. computeAcquisitionPayloadDigest binds nested observations.domains correctly
  const domainAuditsA = {
    domains: {
      PEDAGOGUE: { events: [{ phase: 'NOTICE', at: 10 }] }
    }
  };
  const domainAuditsB = {
    domains: {
      PEDAGOGUE: { events: [{ phase: 'NOTICE', at: 999 }] }
    }
  };
  const digestA = computeAcquisitionPayloadDigest(domainAuditsA);
  const digestB = computeAcquisitionPayloadDigest(domainAuditsB);
  assert.notEqual(digestA, null);
  assert.notEqual(digestB, null);
  assert.notEqual(digestA, digestB);
});

test('Elimination of synthetic concern injection: untyped caller concerns reject fail-closed and cannot override domain audits', () => {
  // 1. Untyped caller concern strings without valid domain schemas reject fail-closed as MALFORMED_OBSERVATION_SCHEMA
  const untypedInput = { concern: 'Adversarial defect claim without domain schema', defective: true };
  const rejectedResult = executeSpecialistRole('PEDAGOGUE', untypedInput);
  assert.equal(rejectedResult.verdict, 'HELD');
  assert.equal(rejectedResult.status, 'MALFORMED_OBSERVATION_SCHEMA');
  assert.deepEqual(rejectedResult.infractions, ['MALFORMED_OBSERVATION_SCHEMA']);

  // 2. Schema-valid domain observations: caller concern cannot override executed domain audit
  const validBenignPedagogue = {
    events: [
      { phase: 'NOTICE', at: 10 },
      { phase: 'ACT', at: 20 },
      { phase: 'WORLD_ANSWERS', at: 30 },
      { phase: 'NAME', at: 40 }
    ],
    concern: 'Bogus injected concern on benign input',
    defective: true
  };
  const executedResult = executeSpecialistRole('PEDAGOGUE', validBenignPedagogue);
  assert.equal(executedResult.verdict, 'SUPPORTED');
  assert.equal(executedResult.status, 'NO_VIOLATION_DETECTED');
  assert.deepEqual(executedResult.infractions, []);

  // 3. Explicitly typed synthetic fault injection is contained fail-closed with 0 empirical discovery credit
  const typedSynthetic = {
    fixture_class: 'SYNTHETIC_FAULT_INJECTION',
    concern: 'Simulated fault injection for testing',
    defective: true
  };
  const containedResult = executeSpecialistRole('APERTURE', typedSynthetic);
  assert.equal(containedResult.verdict, 'HELD');
  assert.equal(containedResult.status, 'SYNTHETIC_FAULT_CONTAINED');
  assert.equal(containedResult.is_synthetic_injection, true);

  // In ablation trial, synthetic fault injection earns 0 empirical discovery credit
  const trial = runAblationTrial(
    ['APERTURE'],
    {
      ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.APERTURE] },
      aperture: typedSynthetic
    }
  );
  assert.equal(trial.evaluation.outcome_class, 'SYNTHETIC_FAULT_CONTAINED');
  assert.equal(trial.evaluation.defect_detected, true);
  assert.equal(trial.evaluation.empirical_discovery_credit, 0);

  // 4. Offline domain detection earns offline_detection_credit: 1 but empirical_discovery_credit: 0
  const offlineDefectTrial = runAblationTrial(
    ['PEDAGOGUE'],
    {
      ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.PEDAGOGUE] },
      pedagogue: {
        events: [
          { phase: 'NOTICE', at: 10 },
          { phase: 'ACT', at: 20 },
          { phase: 'NAME', at: 25 },
          { phase: 'WORLD_ANSWERS', at: 30 }
        ]
      }
    }
  );
  assert.equal(offlineDefectTrial.evaluation.outcome_class, 'TRUE_NEGATIVE_PREVENTION');
  assert.equal(offlineDefectTrial.evaluation.defect_detected, true);
  assert.equal(offlineDefectTrial.evaluation.offline_detection_credit, 1);
  assert.equal(offlineDefectTrial.evaluation.empirical_discovery_credit, 0);

  // 5. When backed by authenticated external empirical acquisition, empirical_discovery_credit is 1
  process.env.TD613_NEON_OBSERVATORY_VERIFICATION_KEY = 'neon-test-key-for-discovery';
  try {
    const empiricalObservations = {
      pedagogue: {
        events: [
          { phase: 'NOTICE', at: 10 },
          { phase: 'ACT', at: 20 },
          { phase: 'NAME', at: 25 },
          { phase: 'WORLD_ANSWERS', at: 30 }
        ]
      },
      aperture: { current_operator: [[1, 0], [0, 1]] },
      atlas: { trajectoryA: { endpoint: 'R', winding_number: 0 }, trajectoryB: { endpoint: 'R', winding_number: 0 } },
      fadt: { declared_fiber: { x: 1 } },
      temporal: { completed_phases: ['NOTICE', 'ACT', 'WORLD_ANSWERS', 'NAME'] }
    };
    const receipt = makeAcquisitionReceipt(empiricalObservations, {
      authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY'
    });
    const empiricalTrial = runAblationTrial(
      FIVE_ROLES,
      {
        ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.PEDAGOGUE] },
        ...empiricalObservations,
        acquisition_class: 'EMPIRICAL_ACQUISITION',
        acquisition_receipt: receipt
      }
    );
    assert.equal(empiricalTrial.orchestrator.replication_status, 'AUTHENTICATED_EMPIRICAL_ACQUISITION');
    assert.equal(empiricalTrial.evaluation.outcome_class, 'TRUE_NEGATIVE_PREVENTION');
    assert.equal(empiricalTrial.evaluation.offline_detection_credit, 1);
    assert.equal(empiricalTrial.evaluation.empirical_discovery_credit, 1);
  } finally {
    delete process.env.TD613_NEON_OBSERVATORY_VERIFICATION_KEY;
  }
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
