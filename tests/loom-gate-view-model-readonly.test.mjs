/**
 * @file tests/loom-gate-view-model-readonly.test.mjs
 * @description Negative probe suite and boundary verification for the Loom Gate View-Model adapter (Issue #1592).
 * Includes Artifact 46-R1 and Artifact 46-R2 reparative counterexamples.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOM_GATE_SNAPSHOT_SCHEMA,
  LOOM_GATE_VIEW_MODEL_SCHEMA,
  PORTABLE_LOOM_GATE_SCHEMA,
  validateLoomGateSnapshot,
  deriveLoomGateViewModel,
  sanitizePublicContinuation
} from '../app/engine/portable-loom-gate-view-model.js';
import {
  inspectPortableLoomGateReport
} from '../app/engine/portable-loom-gate.js';
import {
  PORTABLE_LOOM_CHALLENGE_VERIFICATION_SCHEMA
} from '../app/engine/portable-loom-challenge.js';
import { portableLoomCoreDigest } from '../app/engine/portable-loom-core.js';

const VALID_HEX_64 = 'a'.repeat(64);
const VALID_HEX_REF_1 = '1'.repeat(64);
const VALID_HEX_REF_2 = '2'.repeat(64);

function createBaseSnapshot(status = 'BOUNDED_CHALLENGE_PASSED', overrides = {}) {
  const isExposure = status === 'OBSERVED_EXPOSURE';
  const isIncomplete = status === 'HELD_INCOMPLETE_OBSERVATION';
  return {
    schema: LOOM_GATE_SNAPSHOT_SCHEMA,
    session: {
      session_root_ref: VALID_HEX_64,
      anchor_work_unit_ref: VALID_HEX_REF_1,
      phase: 'ARRIVED',
      substantive_continuation_count: 0,
      declared_withheld_documents: 2,
      declared_selected_documents: 1
    },
    native_gate_report: {
      schema: PORTABLE_LOOM_GATE_SCHEMA,
      action: 'CHECK_LOOM_GATE',
      label: '米 Check Loom Gate',
      href: 'https://td613.com/dome-world/holonomy-loom.html#loomGate',
      session_root_ref: VALID_HEX_64,
      anchor_work_unit_ref: VALID_HEX_REF_1,
      policy_commitment: VALID_HEX_REF_2,
      challenge_ref: VALID_HEX_REF_1,
      verification_ref: VALID_HEX_REF_2,
      status,
      evidence_class: 'OFFLINE_TEST',
      coverage: {
        captured_channels: 2,
        missing_required_channels: isIncomplete ? 1 : 0,
        checked_targets: 5,
        disclosed_targets: isExposure ? 1 : 0,
        declared_reconstruction_attempts: 10,
        measured_reconstruction_attempts: isIncomplete ? 8 : 10,
        successful_reconstruction_attempts: isExposure ? 1 : 0,
        missing_attempts: isIncomplete ? 2 : 0
      },
      joining: {
        observed: 0,
        incomplete: 0
      },
      conversation_leakage_fraction: null,
      ref: VALID_HEX_64,
      authority: {
        head_advanced: false,
        foreign_enforcement_proved: false,
        empirical_credit: 0
      }
    },
    specialist_summaries: {
      PEDAGOGUE: { status: 'NOT_RUN' },
      APERTURE: { status: 'NOT_RUN' },
      ATLAS: { status: 'NOT_RUN' },
      FADT: { status: 'NOT_RUN' },
      TEMPORAL_CUSTODIAN: { status: 'NOT_RUN' }
    },
    ...overrides
  };
}

// ============================================================================
// BASELINE TESTS PRESERVED & EXTENDED
// ============================================================================

test('T-AUTH-01: View-model contains no mutate/send/sign methods', () => {
  const snapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  const vm = deriveLoomGateViewModel(snapshot);

  assert.equal(typeof vm.send, 'undefined');
  assert.equal(typeof vm.mutate, 'undefined');
  assert.equal(typeof vm.sign, 'undefined');
  assert.equal(typeof vm.admit, 'undefined');
  assert.equal(typeof vm.advanceHead, 'undefined');
  assert.equal(vm.authority.head_advanced, false);
  assert.equal(vm.authority.foreign_enforcement_proved, false);
  assert.equal(vm.authority.empirical_credit, 0);
});

test('T-AUTH-02: Modifying authority properties throws TypeError on frozen view-model', () => {
  const snapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  const vm = deriveLoomGateViewModel(snapshot);

  assert.throws(() => {
    vm.authority.head_advanced = true;
  }, TypeError);

  assert.throws(() => {
    vm.authority.empirical_credit = 1;
  }, TypeError);

  assert.throws(() => {
    vm.status = 'TAMPERED_STATUS';
  }, TypeError);

  assert.equal(vm.authority.head_advanced, false);
  assert.equal(vm.authority.empirical_credit, 0);
});

test('T-EXPORT-01: sanitizePublicContinuation strips canaries, prompts, solutions, and keys (Correction B)', () => {
  const sensitiveContinuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-12345',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: 'CONFIDENTIAL: internal business secret',
    canary_strings: ['CANARY_SECRET_ALPHA', 'CANARY_SECRET_BETA'],
    signing_key: 'PRIVATE_ED25519_KEY_BYTES',
    challenge_solution: 'SECRET_CHALLENGE_PREIMAGE',
    selected_file_bodies: [{ name: 'payroll.csv', content: 'SECRET_PAYROLL_DATA' }]
  };

  const sanitized = sanitizePublicContinuation(sensitiveContinuation);

  // Correction B: Caller-supplied request_id is not exported to prevent marker leakage
  assert.equal(sanitized.request_id, null);
  assert.equal(sanitized.session_root_ref, VALID_HEX_64);
  assert.equal(sanitized.anchor_work_unit_ref, VALID_HEX_REF_1);
  assert.equal(sanitized.phase, 'DONE');
  assert.equal(sanitized.status, 'ADMITTED');
  assert.equal(typeof sanitized.raw_prompt_body, 'undefined');
  assert.equal(typeof sanitized.canary_strings, 'undefined');
  assert.equal(typeof sanitized.signing_key, 'undefined');
  assert.equal(typeof sanitized.challenge_solution, 'undefined');
  assert.equal(typeof sanitized.selected_file_bodies, 'undefined');
  assert.equal(sanitized.authority.empirical_credit, 0);
  assert.equal(sanitized.authority.head_advanced, false);

  assert.throws(() => {
    sanitized.phase = 'TAMPERED';
  }, TypeError);
});

test('F-CLEAN-PASS-01: Clean bounded challenge pass view-model (Correction A Qualified)', () => {
  const snapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  const vm = deriveLoomGateViewModel(snapshot);

  // Correction A: Source declared status vs presentation admission status
  assert.equal(vm.declared_source_status, 'BOUNDED_CHALLENGE_PASSED');
  assert.equal(vm.status, 'HELD_UNVERIFIED_DECLARATION');
  assert.equal(vm.six_field_contract.measurement_status, 'UNVERIFIED_DECLARED_MEASUREMENT');
  assert.equal(vm.gate_verification_status, 'UNVERIFIED_DECLARATION');

  assert.ok(vm.customer_presentation.what_happened.includes('Unverified declaration · declared checks passed'));
  assert.ok(vm.customer_presentation.what_happened.includes('local recomputation required'));
  assert.ok(vm.customer_presentation.what_remains_unknown.includes('hidden activations remain unobserved'));
  assert.equal(vm.six_field_contract.next_action, 'HOLD_RECOMPUTE_LOCAL_GATE_INTEGRITY');
  assert.equal(vm.authority.empirical_credit, 0);
  assert.equal(vm.authority.foreign_enforcement_proved, false);
});

test('F-CANARY-EXPOSURE-02: Canary exposure alert view-model', () => {
  const snapshot = createBaseSnapshot('OBSERVED_EXPOSURE');
  const vm = deriveLoomGateViewModel(snapshot);

  assert.equal(vm.declared_source_status, 'OBSERVED_EXPOSURE');
  assert.equal(vm.status, 'OBSERVED_EXPOSURE');
  assert.ok(vm.customer_presentation.what_happened.includes('Alert · exposure detected'));
  assert.equal(vm.six_field_contract.next_action, 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE');
  assert.equal(vm.authority.empirical_credit, 0);
  assert.equal(vm.drawer.coverage.disclosed_targets, 1);
});

test('F-MISSING-CHANNEL-03: Missing channel incomplete observation view-model', () => {
  const snapshot = createBaseSnapshot('HELD_INCOMPLETE_OBSERVATION');
  const vm = deriveLoomGateViewModel(snapshot);

  assert.equal(vm.declared_source_status, 'HELD_INCOMPLETE_OBSERVATION');
  assert.equal(vm.status, 'HELD_INCOMPLETE_OBSERVATION');
  assert.ok(vm.customer_presentation.what_happened.includes('HOLD · incomplete observation'));
  assert.equal(vm.six_field_contract.next_action, 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE');
  assert.equal(vm.authority.empirical_credit, 0);
  assert.equal(vm.drawer.coverage.missing_required_channels, 1);
  assert.equal(vm.drawer.coverage.missing_attempts, 2);
});

test('F-TAMPERED-SUMMARY-04: Structural authority contract violation throws contract error', () => {
  const forgedCreditSnapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  forgedCreditSnapshot.native_gate_report.authority.empirical_credit = 1;

  assert.throws(() => {
    validateLoomGateSnapshot(forgedCreditSnapshot);
  }, /Loom Gate snapshot authority contract violation/);

  const forgedEnforcementSnapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  forgedEnforcementSnapshot.native_gate_report.authority.foreign_enforcement_proved = true;

  assert.throws(() => {
    validateLoomGateSnapshot(forgedEnforcementSnapshot);
  }, /Loom Gate snapshot authority contract violation/);

  const forgedHeadSnapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  forgedHeadSnapshot.native_gate_report.authority.head_advanced = true;

  assert.throws(() => {
    validateLoomGateSnapshot(forgedHeadSnapshot);
  }, /Loom Gate snapshot authority contract violation/);
});

test('Native digest tampering is caught by inspectPortableLoomGateReport with native error', async () => {
  const validReportBody = {
    schema: PORTABLE_LOOM_GATE_SCHEMA,
    action: 'CHECK_LOOM_GATE',
    label: '米 Check Loom Gate',
    href: 'https://td613.com/dome-world/holonomy-loom.html#loomGate',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    policy_commitment: VALID_HEX_REF_2,
    challenge_ref: VALID_HEX_REF_1,
    verification_ref: VALID_HEX_REF_2,
    verification_schema: PORTABLE_LOOM_CHALLENGE_VERIFICATION_SCHEMA,
    status: 'BOUNDED_CHALLENGE_PASSED',
    evidence_class: 'OFFLINE_TEST',
    reference_match: { challenge: true, session: true, work_unit: true, policy: true },
    coverage: {
      captured_channels: 2,
      missing_required_channels: 0,
      checked_targets: 5,
      disclosed_targets: 0,
      declared_reconstruction_attempts: 10,
      measured_reconstruction_attempts: 10,
      successful_reconstruction_attempts: 0,
      missing_attempts: 0
    },
    joining: { observed: 0, incomplete: 0 },
    conversation_leakage_fraction: null,
    measurement: 'COUNTS_OF_DECLARED_TARGETS_AND_ATTEMPTS_ON_CAPTURED_SURFACES',
    receipt_scope: 'ORIGIN_COMPUTED_SUMMARY_REQUIRES_LOCAL_PRIVATE_RECORD_FOR_RECOMPUTATION',
    next_action: 'REVIEW_CAPTURE_COVERAGE_BEFORE_CONTINUING',
    authority: { head_advanced: false, foreign_enforcement_proved: false, empirical_credit: 0 }
  };

  const genuineRef = await portableLoomCoreDigest(validReportBody);
  const genuineReport = { ...validReportBody, ref: genuineRef };

  const inspected = await inspectPortableLoomGateReport(genuineReport);
  assert.equal(inspected.status, 'CARRIED_SUMMARY_INTEGRITY');

  const tamperedReport = { ...genuineReport, status: 'OBSERVED_EXPOSURE', next_action: 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE' };
  await assert.rejects(async () => {
    await inspectPortableLoomGateReport(tamperedReport);
  }, /Loom Gate summary integrity changed\./);
});

test('Caller-supplied serialized verification witness is untrusted and never promotes verification status', () => {
  const snapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED', {
    verification_witness: {
      status: 'CARRIED_SUMMARY_INTEGRITY',
      foreign_capture_authenticated: true,
      timestamp: '2026-10-24T00:00:00.000Z'
    }
  });

  const vm = deriveLoomGateViewModel(snapshot);

  assert.equal(vm.gate_verification_status, 'UNVERIFIED_DECLARATION');
  assert.equal(vm.status, 'HELD_UNVERIFIED_DECLARATION');
  assert.equal(vm.drawer.verification_status, 'UNVERIFIED_DECLARATION');
  assert.equal(vm.drawer.local_private_recomputation_required, true);
});

test('validateLoomGateSnapshot rejects prototype pollution', () => {
  const maliciousProto = Object.create({ malicious: true });
  maliciousProto.schema = LOOM_GATE_SNAPSHOT_SCHEMA;

  assert.throws(() => {
    validateLoomGateSnapshot(maliciousProto);
  }, /non-plain object or custom prototype/);
});

test('validateLoomGateSnapshot rejects cyclic references', () => {
  const cyclicSnapshot = createBaseSnapshot();
  cyclicSnapshot.self = cyclicSnapshot;

  assert.throws(() => {
    validateLoomGateSnapshot(cyclicSnapshot);
  }, /Loom Gate snapshot contains cyclic reference/);
});

test('validateLoomGateSnapshot rejects executable functions in snapshot', () => {
  const fnSnapshot = createBaseSnapshot();
  fnSnapshot.exploit = () => { return 'pwned'; };

  assert.throws(() => {
    validateLoomGateSnapshot(fnSnapshot);
  }, /Loom Gate snapshot contains executable function/);
});

test('validateLoomGateSnapshot rejects impossible or negative counts', () => {
  const invalidSnapshot1 = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  invalidSnapshot1.native_gate_report.coverage.disclosed_targets = 10;
  invalidSnapshot1.native_gate_report.coverage.checked_targets = 5;

  assert.throws(() => {
    validateLoomGateSnapshot(invalidSnapshot1);
  }, /disclosed_targets cannot exceed checked_targets/);

  const invalidSnapshot2 = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  invalidSnapshot2.native_gate_report.coverage.captured_channels = -1;

  assert.throws(() => {
    validateLoomGateSnapshot(invalidSnapshot2);
  }, /must be a safe non-negative integer/);
});

test('Customer UI presentation strictly omits internal research cast names (Issue #1592)', () => {
  const snapshot = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  const vm = deriveLoomGateViewModel(snapshot);

  const customerText = JSON.stringify(vm.customer_presentation);
  const researchCast = ['Dollhouse', 'Pedagogue', 'Aperture', 'Atlas', 'FADT', 'Temporal Custodian', 'Orchestrator'];

  for (const castMember of researchCast) {
    assert.equal(
      customerText.includes(castMember),
      false,
      `Customer presentation leaked internal research cast name '${castMember}'`
    );
  }

  assert.equal(vm.label, '米 Check Loom Gate');
  assert.ok(typeof vm.customer_presentation.what_happened === 'string');
  assert.ok(typeof vm.customer_presentation.what_was_checked === 'string');
  assert.ok(typeof vm.customer_presentation.what_remains_unknown === 'string');
  assert.ok(typeof vm.customer_presentation.what_happens_next === 'string');
  assert.equal(vm.drawer.label, 'How do I know? 下');
});

// ============================================================================
// REPAIR R1-01: CONTRADICTORY REPORT COMBINATION TESTS
// ============================================================================

test('R1-01: Contradictory report: BOUNDED_CHALLENGE_PASSED with nonzero disclosed_targets is rejected', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.native_gate_report.coverage.disclosed_targets = 1;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Contradictory report: status is BOUNDED_CHALLENGE_PASSED but disclosed_targets is nonzero/);
});

test('R1-01: Contradictory report: BOUNDED_CHALLENGE_PASSED with nonzero successful_reconstructions is rejected', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.native_gate_report.coverage.successful_reconstruction_attempts = 1;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Contradictory report: status is BOUNDED_CHALLENGE_PASSED but successful_reconstruction_attempts is nonzero/);
});

test('R1-01: Contradictory report: BOUNDED_CHALLENGE_PASSED with missing channels is rejected', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.native_gate_report.coverage.missing_required_channels = 1;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Contradictory report: status is BOUNDED_CHALLENGE_PASSED but missing_required_channels is nonzero/);
});

test('R1-01: Contradictory report: OBSERVED_EXPOSURE with zero disclosed targets or recoveries is rejected', () => {
  const s = createBaseSnapshot('OBSERVED_EXPOSURE');
  s.native_gate_report.coverage.disclosed_targets = 0;
  s.native_gate_report.coverage.successful_reconstruction_attempts = 0;
  s.native_gate_report.joining = { observed: 0, incomplete: 0 };

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Contradictory report: status is OBSERVED_EXPOSURE but zero disclosed targets or reconstructions observed/);
});

test('R1-01: Contradictory report: HELD_INCOMPLETE_OBSERVATION with zero missing items is rejected', () => {
  const s = createBaseSnapshot('HELD_INCOMPLETE_OBSERVATION');
  s.native_gate_report.coverage.missing_required_channels = 0;
  s.native_gate_report.coverage.missing_attempts = 0;
  s.native_gate_report.coverage.measured_reconstruction_attempts = 10;
  s.native_gate_report.joining = { observed: 0, incomplete: 0 };

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Contradictory report: status is HELD_INCOMPLETE_OBSERVATION but zero missing channels or attempts recorded/);
});

// ============================================================================
// CORRECTION A: MACHINE-READABLE CLAIM CEILINGS COUNTEREXAMPLES
// ============================================================================

test('Correction A: Machine consumers inspect viewModel.status and receive HELD, not authoritative PASS', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  const vm = deriveLoomGateViewModel(s);

  // Machine consumer inspecting status directly must NOT see unqualified PASS
  assert.notEqual(vm.status, 'BOUNDED_CHALLENGE_PASSED');
  assert.equal(vm.status, 'HELD_UNVERIFIED_DECLARATION');

  // Exact declared status is preserved in declared_source_status coordinate
  assert.equal(vm.declared_source_status, 'BOUNDED_CHALLENGE_PASSED');

  // Measurement status is strictly unverified declared measurement
  assert.equal(vm.six_field_contract.measurement_status, 'UNVERIFIED_DECLARED_MEASUREMENT');
});

// ============================================================================
// CORRECTION B: PUBLIC-DATA SAFETY & ACCESSOR COUNTEREXAMPLES
// ============================================================================

test('Correction B: Syntactically valid sensitive request_id is NOT exported in public output', () => {
  const cont = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'SECRET_CANARY_X99_DO_NOT_LEAK', // syntactically valid regex, but sensitive!
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED'
  };

  const sanitized = sanitizePublicContinuation(cont);

  // Marker must be omitted / null, never reflected
  assert.equal(sanitized.request_id, null);
  assert.equal(JSON.stringify(sanitized).includes('SECRET_CANARY_X99_DO_NOT_LEAK'), false);
});

test('Correction B: Accessor property on array index 0 is rejected WITHOUT getter evaluation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  let sideEffectTriggered = false;

  const maliciousArr = [];
  Object.defineProperty(maliciousArr, '0', {
    get() {
      sideEffectTriggered = true;
      return 'exploit';
    },
    enumerable: true
  });

  s.session.malicious_array = maliciousArr;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /accessor property \(getter\/setter\) on array/);

  assert.equal(sideEffectTriggered, false, 'Array index getter must never be evaluated during validation');
});

test('Correction B: Accessor on continuation request_id is rejected WITHOUT getter evaluation', () => {
  let sideEffectTriggered = false;
  const cont = {
    schema: 'td613.loom.continuation/v0.1',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED'
  };

  Object.defineProperty(cont, 'request_id', {
    get() {
      sideEffectTriggered = true;
      return 'SECRET_CANARY';
    },
    enumerable: true
  });

  assert.throws(() => {
    sanitizePublicContinuation(cont);
  }, /accessor property \(getter\/setter\)/);

  assert.equal(sideEffectTriggered, false, 'Continuation request_id getter must never be evaluated');
});

test('Correction B: Total structural traversal budget limit (> 5000 nodes) rejects oversized trees', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');

  // Construct a wide structure exceeding 5000 total nodes
  s.session.big_tree = {};
  for (let i = 0; i < 40; i++) {
    const branch = {};
    for (let j = 0; j < 40; j++) {
      branch[`sub_${j}`] = { a: 1, b: 2, c: 3, d: 4 };
    }
    s.session.big_tree[`branch_${i}`] = branch;
  }

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /exceeds maximum total structural traversal budget/);
});

// ============================================================================
// CORRECTION C: REPORT COMPLETENESS & ALIAS COLLISION COUNTEREXAMPLES
// ============================================================================

test('Correction C: Snapshot specifying BOTH native_gate_report and gate_report triggers alias collision rejection', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.gate_report = { ...s.native_gate_report };

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Alias collision: snapshot cannot specify both native_gate_report and gate_report\./);
});

test('Correction C: BOUNDED_CHALLENGE_PASSED missing mandatory coverage evidence object is rejected', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  delete s.native_gate_report.coverage;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /claims BOUNDED_CHALLENGE_PASSED but lacks mandatory coverage evidence object/);
});

test('Correction C: BOUNDED_CHALLENGE_PASSED with zero checked_targets or channels is rejected', () => {
  const s1 = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s1.native_gate_report.coverage.checked_targets = 0;

  assert.throws(() => {
    validateLoomGateSnapshot(s1);
  }, /lacks mandatory coverage evidence \(checked_targets, captured_channels, and measured_reconstruction_attempts must be >= 1\)/);

  const s2 = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s2.native_gate_report.coverage.captured_channels = 0;

  assert.throws(() => {
    validateLoomGateSnapshot(s2);
  }, /lacks mandatory coverage evidence/);

  const s3 = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s3.native_gate_report.coverage.measured_reconstruction_attempts = 0;
  s3.native_gate_report.coverage.declared_reconstruction_attempts = 0;

  assert.throws(() => {
    validateLoomGateSnapshot(s3);
  }, /lacks mandatory coverage evidence/);
});

// ============================================================================
// VALUE-LEVEL ENUM & ACCESSOR TESTS PRESERVED
// ============================================================================

test('R1-02: Sensitive marker in receipt_scope is rejected in validation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.native_gate_report.receipt_scope = 'SECRET_CANARY_X99_DO_NOT_LEAK';

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /receipt_scope contains unrecognized value/);
});

test('R1-02: Sensitive marker in evidence_class is rejected in validation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.native_gate_report.evidence_class = 'SECRET_CANARY_X99_DO_NOT_LEAK';

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /evidence_class contains unrecognized value/);
});

test('R1-02: Sensitive marker in phase is sanitized to UNKNOWN', () => {
  const cont = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-clean',
    phase: 'SECRET_CANARY_X99_DO_NOT_LEAK',
    status: 'ADMITTED'
  };

  const sanitized = sanitizePublicContinuation(cont);
  assert.equal(sanitized.phase, 'UNKNOWN');
  assert.equal(JSON.stringify(sanitized).includes('SECRET_CANARY'), false);
});

test('R1-02: Sensitive marker in status is sanitized to HELD', () => {
  const cont = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-clean',
    phase: 'DONE',
    status: 'SECRET_CANARY_X99_DO_NOT_LEAK'
  };

  const sanitized = sanitizePublicContinuation(cont);
  assert.equal(sanitized.status, 'HELD');
  assert.equal(JSON.stringify(sanitized).includes('SECRET_CANARY'), false);
});

test('R1-02: Sensitive marker in specialist status is rejected in validation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.specialist_summaries.PEDAGOGUE = { status: 'SECRET_CANARY_X99_DO_NOT_LEAK' };

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /contains unrecognized status/);
});

test('R1-02: Unrecognized specialist key is rejected in validation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.specialist_summaries.LEAKED_CAST_MEMBER = { status: 'NOT_RUN' };

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /Unrecognized specialist key in specialist_summaries/);
});

test('R1-03: Nested non-plain objects are rejected fail-closed', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.session.injected_date = new Date();

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /non-plain object or custom prototype/);
});

test('R1-03: Nested accessor properties with side effects are rejected WITHOUT evaluation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  let sideEffectTriggered = false;

  const maliciousObj = {};
  Object.defineProperty(maliciousObj, 'exploit', {
    get() {
      sideEffectTriggered = true;
      return 'pwned';
    },
    enumerable: true
  });

  s.session.malicious = maliciousObj;

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /accessor property \(getter\/setter\)/);

  assert.equal(sideEffectTriggered, false, 'Accessor getter must not be evaluated during rejection');
});

test('R1-03: Excessive nesting depth (> 10) is rejected fail-closed', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  let current = s.session;
  for (let i = 0; i < 15; i++) {
    current.nested = {};
    current = current.nested;
  }

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /exceeds maximum nesting depth of 10/);
});

test('R1-03: Oversized string (> 2048 chars) is rejected fail-closed', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.session.oversized = 'X'.repeat(3000);

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /string exceeds maximum length of 2048/);
});

test('R1-03: Oversized array (> 1000 items) is rejected fail-closed', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED');
  s.session.oversized_array = new Array(1500).fill(1);

  assert.throws(() => {
    validateLoomGateSnapshot(s);
  }, /array exceeds maximum length of 1000/);
});

test('R1-03: Ordinary valid JSON input passes deep structural validation', () => {
  const s = createBaseSnapshot('BOUNDED_CHALLENGE_PASSED', {
    session: {
      session_root_ref: VALID_HEX_64,
      anchor_work_unit_ref: VALID_HEX_REF_1,
      phase: 'ARRIVED',
      substantive_continuation_count: 0,
      declared_withheld_documents: 2,
      declared_selected_documents: 1,
      extra_safe_metadata: {
        labels: ['clean', 'ordinary'],
        count: 42,
        active: true,
        notes: null
      }
    }
  });

  assert.equal(validateLoomGateSnapshot(s), true);
  const vm = deriveLoomGateViewModel(s);
  assert.equal(vm.declared_source_status, 'BOUNDED_CHALLENGE_PASSED');
  assert.equal(vm.status, 'HELD_UNVERIFIED_DECLARATION');
});

test('R1-04: sanitizePublicContinuation is strictly deterministic across replays', () => {
  const input = {
    request_id: 'req-abc-123',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    secret_canaries: ['SECRET_A', 'SECRET_B'],
    private_key: 'ED25519_SECRET'
  };

  const run1 = sanitizePublicContinuation(input);
  const run2 = sanitizePublicContinuation(input);

  assert.deepEqual(run1, run2);
  assert.equal(JSON.stringify(run1), JSON.stringify(run2));
  assert.equal(typeof run1.sanitized_at, 'undefined', 'sanitized_at should not exist or use non-deterministic Date');
});
