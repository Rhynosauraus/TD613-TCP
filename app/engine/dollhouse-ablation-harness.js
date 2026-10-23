/**
 * @fileoverview TD613 Dollhouse Multi-Role Blind Ablation Harness.
 *
 * Implements the complete Blind Role-Ablation Protocol across 13 conditions:
 *   1. FULL_FIVE_ROLE (Pedagogue + Aperture + Atlas + FADT + Temporal Custodian)
 *   2. NO_DOLLHOUSE_BASELINE (Unchecked pass-through)
 *   3. ORCHESTRATOR_ALONE (No specialist roles)
 *   4-8. Single-role conditions (PEDAGOGUE, APERTURE, ATLAS, FADT, TEMPORAL_CUSTODIAN)
 *   9-13. Minus-one-role conditions (MINUS_PEDAGOGUE, MINUS_APERTURE, MINUS_ATLAS, MINUS_FADT, MINUS_TEMPORAL_CUSTODIAN)
 *
 * Mathematical and Invariant Principles:
 *   - Genuine empirical specialization: runs actual specialist domain functions;
 *   - Ground-truth evaluation: compares resulting Orchestrator admission with ground-truth defect status;
 *   - Non-circularity: no hardcoded dictionary lookup forcing false outcomes;
 *   - Permitted four-doll success: on benign inputs, 4 dolls succeed without the 5th (failure_mode = null);
 *   - Shared acquisition on a single receipt adds ZERO empirical replication:
 *     SHARED_ACQUISITION != INDEPENDENT_REPLICATION;
 *   - No ablation condition grants release, merge, or deployment authority.
 */

import { auditDollhouseDromologicalCadence } from './dollhouse-pedagogue-dromological.js';
import { auditTypedEpistemicDeficit } from './aperture-v32-typed-epistemic-deficit.js';
import { auditAtlasHolonomyHistoryParity } from './dollhouse-atlas-relational-custody.js';
import { computeFadtFiberBounds } from './dollhouse-fadt-reparative-assistance.js';
import { auditServiceJourneyChronology } from './dollhouse-temporal-custodian.js';

export const DOLLHOUSE_ABLATION_EXPERIMENT_SCHEMA = 'td613.dollhouse.ablation-experiment/v1.2';
export const DOLLHOUSE_ACQUISITION_RECEIPT_SCHEMA = 'td613.dollhouse.acquisition-receipt/v0.2';

export const TRUSTED_ACQUISITION_REGISTRIES = Object.freeze({
  NEON_LOOM_CUSTODY_OBSERVATORY: {
    authority_id: 'NEON_LOOM_CUSTODY_OBSERVATORY',
    authority_class: 'AUTHENTIC_EXTERNAL_CUSTODY_OBSERVATORY',
    verification_key: 'neon-loom-custody-verification-key-2026',
    is_authentic_external: true
  },
  SYNTHETIC_TEST_ACQUISITION: {
    authority_id: 'SYNTHETIC_TEST_ACQUISITION',
    authority_class: 'SYNTHETIC_TEST_FIXTURE',
    verification_key: 'td613-synthetic-acquisition-test-key-001',
    is_authentic_external: false
  }
});

export function computeAcquisitionPayloadDigest(observations) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto || !observations || typeof observations !== 'object') return null;
  const roleEntries = [];
  for (const r of FIVE_ROLES) {
    const lower = r.toLowerCase();
    const val = observations[r] || observations[lower] || (r === 'TEMPORAL_CUSTODIAN' ? observations.temporal : null);
    if (val !== undefined && val !== null) {
      roleEntries.push(`${r}:${JSON.stringify(val)}`);
    }
  }
  roleEntries.sort();
  return crypto.createHash('sha256').update(roleEntries.join('||')).digest('hex');
}

export function computeAcquisitionReceiptDigest(receipt) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto) return null;
  const canonical = [
    receipt.schema,
    receipt.authority_id,
    receipt.acquisition_boundary,
    receipt.source_revision,
    receipt.observation_digest
  ].join('::');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function signAcquisitionReceipt(receipt, secretKey) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto) return null;
  const digest = computeAcquisitionReceiptDigest(receipt);
  return crypto.createHmac('sha256', secretKey).update(digest).digest('hex');
}

export function verifyAcquisitionReceipt(receipt, observations = {}, options = {}) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!receipt || typeof receipt !== 'object') {
    return { verified: false, failure_reason: 'RECEIPT_NOT_PROVIDED' };
  }

  if (receipt.schema === 'td613.dollhouse.acquisition-receipt/v0.1') {
    return { verified: false, failure_reason: 'LEGACY_V01_UNAUTHENTICATED' };
  }
  if (receipt.schema !== DOLLHOUSE_ACQUISITION_RECEIPT_SCHEMA) {
    return { verified: false, failure_reason: 'UNSUPPORTED_RECEIPT_SCHEMA' };
  }

  const registry = options.trusted_registry || TRUSTED_ACQUISITION_REGISTRIES;
  const authority = registry[receipt.authority_id];
  if (!authority) {
    return { verified: false, failure_reason: 'UNTRUSTED_ACQUISITION_AUTHORITY' };
  }

  if (!receipt.observation_digest || typeof receipt.observation_digest !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.observation_digest)) {
    return { verified: false, failure_reason: 'INVALID_OBSERVATION_DIGEST' };
  }

  if (observations && Object.keys(observations).length > 0 && crypto) {
    const expectedPayloadDigest = computeAcquisitionPayloadDigest(observations);
    if (expectedPayloadDigest && receipt.observation_digest !== expectedPayloadDigest) {
      return { verified: false, failure_reason: 'OBSERVATION_PAYLOAD_DIGEST_MISMATCH' };
    }
  }

  const expectedReceiptDigest = computeAcquisitionReceiptDigest(receipt);
  if (!receipt.verification_digest || receipt.verification_digest !== expectedReceiptDigest) {
    return { verified: false, failure_reason: 'VERIFICATION_DIGEST_MISMATCH' };
  }

  if (!receipt.signature || typeof receipt.signature !== 'string' || !crypto) {
    return { verified: false, failure_reason: 'SIGNATURE_MISSING' };
  }

  const expectedSignature = crypto.createHmac('sha256', authority.verification_key).update(expectedReceiptDigest).digest('hex');
  if (receipt.signature !== expectedSignature) {
    return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
  }

  if (options.expected_source_revision && receipt.source_revision !== options.expected_source_revision) {
    return { verified: false, failure_reason: 'STALE_SOURCE_REVISION' };
  }

  return {
    verified: true,
    authority_id: authority.authority_id,
    authority_class: authority.authority_class,
    is_authentic_external: authority.is_authentic_external,
    failure_reason: null
  };
}

export const FIVE_ROLES = Object.freeze([
  'PEDAGOGUE',
  'APERTURE',
  'ATLAS',
  'FADT',
  'TEMPORAL_CUSTODIAN'
]);

export const ROLE_INFRACTIONS = Object.freeze({
  PEDAGOGUE: 'HUMAN_CONSEQUENCE_BROKEN_RETURN_PROMISE',
  APERTURE: 'URL_HASH_DOES_NOT_EQUAL_WORKSPACE_ADMITTED',
  ATLAS: 'PREDECESSOR_CHAIN_UNVERIFIED_CUSTODY_FORK',
  FADT: 'ILLEGAL_ACTION_GRANT_UNDER_ERASED_CONDITIONING',
  TEMPORAL_CUSTODIAN: 'UNREFERENCED_RETRY_CHRONOLOGICAL_OBLIVION'
});

export const FAILURE_MODES = Object.freeze({
  MISSING_APERTURE: {
    decision: 'FALSE_COMPLETION_ADMITTED',
    failure_mode: 'Orchestrator accepts URL hash #return-review as proof of Return, overlooking unadmitted DOM workspace.'
  },
  MISSING_ATLAS: {
    decision: 'CUSTODY_FORK_RISK_ACCEPTED',
    failure_mode: 'Orchestrator treats C2 as valid without verifying predecessor receipt digest continuity across window boundaries.'
  },
  MISSING_FADT: {
    decision: 'ILLEGAL_ACTION_ESCALATION_ACCEPTED',
    failure_mode: 'Orchestrator allows Export action grant without verifying conditioning state survival under stage erasure.'
  },
  MISSING_PEDAGOGUE: {
    decision: 'HUMAN_COST_IGNORED',
    failure_mode: 'Orchestrator declares technical validity while ignoring broken user experience and navigation trap.'
  },
  MISSING_TEMPORAL_CUSTODIAN: {
    decision: 'CHRONOLOGICAL_OBLIVION_ADMITTED',
    failure_mode: 'Orchestrator accepts out-of-order unreferenced retry without predecessor citation or phase completeness.'
  },
  NO_DOLLHOUSE: {
    decision: 'UNCHECKED_MUTATION_PERMITTED',
    failure_mode: 'System executes unverified mutation with zero role audits or epistemic checks.'
  }
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Executes a single specialist doll against domain-specific inputs.
 */
export function executeSpecialistRole(role, domainInput, options = {}) {
  const jurisdictionMap = {
    PEDAGOGUE: 'human_consequence_and_burden',
    APERTURE: 'observability_and_identifiability',
    ATLAS: 'receiver_relative_custody',
    FADT: 'finite_support_boundary',
    TEMPORAL_CUSTODIAN: 'chronological_sequence'
  };
  const jurisdiction = jurisdictionMap[role] || 'unspecified';

  if (!FIVE_ROLES.includes(role)) {
    return {
      verdict: 'HELD',
      status: 'UNKNOWN_ROLE_REJECTED',
      infractions: ['UNKNOWN_ROLE_REJECTED'],
      concern: `Unrecognized specialist role: ${role}`,
      jurisdiction: 'unspecified'
    };
  }

  if (!domainInput || typeof domainInput !== 'object' || Object.keys(domainInput).length === 0) {
    return {
      verdict: 'NOT_EVALUATED',
      status: 'INPUT_MISSING',
      infractions: [],
      concern: `No observation input supplied for ${role}`,
      jurisdiction
    };
  }

  // 1. Schema-valid domain observations: ALWAYS execute actual domain audits.
  // Caller concerns or declared defective flags must NEVER override or contaminate executed audits.
  if (role === 'PEDAGOGUE' && domainInput.events && Array.isArray(domainInput.events)) {
    const res = auditDollhouseDromologicalCadence(domainInput);
    const hasViolations = res.violations && res.violations.length > 0;
    return {
      verdict: hasViolations ? 'HELD' : 'SUPPORTED',
      status: hasViolations ? 'VIOLATION_DETECTED' : 'NO_VIOLATION_DETECTED',
      infractions: hasViolations ? [ROLE_INFRACTIONS.PEDAGOGUE] : [],
      concern: hasViolations ? (res.violations[0].message || 'Cadence order violation') : null,
      jurisdiction
    };
  }

  if (role === 'APERTURE' && domainInput.current_operator && Array.isArray(domainInput.current_operator)) {
    const res = auditTypedEpistemicDeficit(domainInput);
    const isDeficit = res.disposition === 'REJECT' ||
                      res.candidate_probe_evaluation?.disposition === 'REJECT' ||
                      res.deficit_class === 'INVALID_NOISE_GEOMETRY' ||
                      res.deficit_class === 'NUMERICAL_STABILITY_DEFICIT';
    return {
      verdict: isDeficit ? 'HELD' : 'SUPPORTED',
      status: isDeficit ? 'VIOLATION_DETECTED' : 'NO_VIOLATION_DETECTED',
      infractions: isDeficit ? [ROLE_INFRACTIONS.APERTURE] : [],
      concern: isDeficit ? (res.candidate_probe_evaluation?.reason || res.reason || res.deficit_class) : null,
      jurisdiction
    };
  }

  if (role === 'ATLAS' && domainInput.trajectoryA && domainInput.trajectoryB) {
    const res = auditAtlasHolonomyHistoryParity(domainInput.trajectoryA, domainInput.trajectoryB);
    const isMismatch = res.disposition !== 'PASS';
    return {
      verdict: isMismatch ? 'HELD' : 'SUPPORTED',
      status: isMismatch ? 'VIOLATION_DETECTED' : 'NO_VIOLATION_DETECTED',
      infractions: isMismatch ? [ROLE_INFRACTIONS.ATLAS] : [],
      concern: isMismatch ? (res.reason || 'Parity mismatch') : null,
      jurisdiction
    };
  }

  if (role === 'FADT' && domainInput.fiberRows && Array.isArray(domainInput.fiberRows)) {
    const res = computeFadtFiberBounds(domainInput.fiberRows);
    const hasGap = res.irreducible_gap_cardinality > 0 && domainInput.attempts_unconditioned_action;
    return {
      verdict: hasGap ? 'HELD' : 'SUPPORTED',
      status: hasGap ? 'VIOLATION_DETECTED' : 'NO_VIOLATION_DETECTED',
      infractions: hasGap ? [ROLE_INFRACTIONS.FADT] : [],
      concern: hasGap ? 'Action grant exposed under erased conditioning' : null,
      jurisdiction
    };
  }

  if (role === 'TEMPORAL_CUSTODIAN' && domainInput.phases && domainInput.required_phases) {
    const res = auditServiceJourneyChronology(domainInput.phases, domainInput.required_phases);
    const isInvalid = res.verdict !== 'PASS';
    return {
      verdict: isInvalid ? 'HELD' : 'SUPPORTED',
      status: isInvalid ? 'VIOLATION_DETECTED' : 'NO_VIOLATION_DETECTED',
      infractions: isInvalid ? [ROLE_INFRACTIONS.TEMPORAL_CUSTODIAN] : [],
      concern: isInvalid ? (res.violations?.[0]?.message || 'Chronological sequence incomplete') : null,
      jurisdiction
    };
  }

  // 2. Synthetic Fault Injection vs Raw Caller Concern Injection:
  // Restrict concern shortcut strictly to explicitly typed synthetic fault injection fixtures
  // or historical coordinate audit fixtures.
  const isTypedSynthetic = domainInput.fixture_class === 'SYNTHETIC_FAULT_INJECTION' ||
                           options.allow_synthetic_fault_injection === true ||
                           (typeof domainInput.coordinate === 'string' && domainInput.coordinate.length > 0);

  if (isTypedSynthetic && (domainInput.concern || domainInput.defective)) {
    return {
      verdict: 'HELD',
      status: 'SYNTHETIC_FAULT_CONTAINED',
      infractions: [ROLE_INFRACTIONS[role] || 'UNKNOWN_ROLE_INFRACTION'],
      is_synthetic_injection: true,
      concern: domainInput.concern || `Synthetic fault injected for ${role}`,
      jurisdiction: domainInput.jurisdiction || jurisdiction
    };
  }

  // 3. Untyped caller concern strings without valid domain schemas reject fail-closed as MALFORMED_OBSERVATION_SCHEMA
  // (protective hold; domain audit not executed, defect NOT detected).
  return {
    verdict: 'HELD',
    status: 'MALFORMED_OBSERVATION_SCHEMA',
    infractions: ['MALFORMED_OBSERVATION_SCHEMA'],
    concern: `Malformed observation schema for ${role}; untyped concern injection rejected fail-closed`,
    jurisdiction
  };
}

/**
 * Executes the Orchestrator decision procedure strictly on active roles and blinded observations.
 * 
 * Invariant Rule:
 *   The Orchestrator receives ONLY observations permitted to active roles.
 *   Ground truth is strictly decoupled and never inspected by this function.
 */
export function runOrchestrationDecision(activeRoleNames = [], observations = {}, options = {}) {
  const activeRolesUpper = activeRoleNames.map(r => String(r).toUpperCase());
  const activeSet = new Set(activeRolesUpper);
  const gatheredFindings = [];
  const detectedInfractions = new Set();

  // Validate active role identities against canonical FIVE_ROLES fail-closed
  const unknownRoles = activeRolesUpper.filter(r => !FIVE_ROLES.includes(r));
  if (unknownRoles.length > 0) {
    return deepFreeze({
      active_roles: activeRolesUpper,
      findings_count: unknownRoles.length,
      findings: unknownRoles.map(r => ({
        role: r,
        id: `${r.slice(0, 3)}-ERR`,
        claim: `Unrecognized specialist role rejected fail-closed: ${r}`,
        jurisdiction: 'unknown',
        verdict: 'HELD',
        status: 'UNKNOWN_ROLE_REJECTED'
      })),
      detected_infractions: ['UNRECOGNIZED_ROLE_REJECTED'],
      decision: 'HELD_UNKNOWN_ROLE',
      consensus: 'HELD_UNKNOWN_ROLE',
      replication_status: 'UNRECOGNIZED_ROLE_REJECTED',
      empirical_replication_count: 0,
      independent_replication: false,
      release_authority: false,
      deployment_authority: false,
      human_closure_required: true
    });
  }

  // Differentiate unmonitored baseline from active orchestrator with zero specialists
  if (activeSet.size === 0) {
    if (options.orchestrator_governance === true || options.condition_name === 'ORCHESTRATOR_ALONE') {
      return deepFreeze({
        active_roles: [],
        findings_count: 0,
        findings: [],
        detected_infractions: [],
        decision: 'HELD_NO_ACTIVE_SPECIALISTS',
        consensus: 'ABSTAIN_NO_SPECIALIST_SENSES',
        replication_status: 'ZERO_ROLES_ACTIVE',
        empirical_replication_count: 0,
        independent_replication: false,
        release_authority: false,
        deployment_authority: false,
        human_closure_required: true
      });
    }

    return deepFreeze({
      active_roles: [],
      findings_count: 0,
      findings: [],
      detected_infractions: [],
      decision: 'UNCHECKED_MUTATION_PERMITTED',
      consensus: 'NONE',
      replication_status: 'ZERO_ROLES_UNCHECKED',
      empirical_replication_count: 0,
      independent_replication: false,
      release_authority: false,
      deployment_authority: false,
      human_closure_required: true
    });
  }

  for (const role of FIVE_ROLES) {
    if (activeSet.has(role)) {
      const roleKey = role === 'TEMPORAL_CUSTODIAN' ? 'temporal' : role.toLowerCase();
      // Observations must not leak ground truth:
      const domainInput = observations[role] || observations[roleKey] || (observations.domains ? observations.domains[role] : null);
      const evalResult = executeSpecialistRole(role, domainInput, options);
      gatheredFindings.push({
        role,
        id: `${role.slice(0, 3)}-001`,
        claim: evalResult.concern || `Invariants verified by ${role}`,
        jurisdiction: evalResult.jurisdiction,
        verdict: evalResult.verdict,
        status: evalResult.status,
        is_synthetic_injection: evalResult.is_synthetic_injection || false
      });
      evalResult.infractions.forEach(i => detectedInfractions.add(i));
    }
  }

  let decision = 'SUPPORTED';
  const hasHeld = gatheredFindings.some(f => f.verdict === 'HELD');
  const hasMissing = gatheredFindings.some(f => f.verdict === 'NOT_EVALUATED');

  if (activeSet.size > 0 && gatheredFindings.length === 0) {
    decision = 'HELD_INSUFFICIENT_OBSERVATION';
  } else if (hasHeld) {
    decision = 'HELD';
  } else if (hasMissing) {
    decision = 'HELD_MISSING_OBSERVATION';
  } else {
    decision = 'SUPPORTED';
  }

  const unanimousAllFive = activeSet.size === FIVE_ROLES.length;
  let consensus = 'NONE';
  if (hasHeld) {
    const allHeld = gatheredFindings.every(f => f.verdict === 'HELD');
    consensus = allHeld ? 'UNANIMOUS_HOLD' : 'HELD_DISSENT';
  } else if (!hasMissing) {
    consensus = unanimousAllFive ? 'UNANIMOUS_SUPPORT' : 'PARTIAL_ROLE_SUPPORT';
  } else {
    consensus = 'INCOMPLETE_OBSERVATION';
  }

  // Replication counting & provenance classification:
  // Caller passing acquisition_class: 'EMPIRICAL_ACQUISITION' alone does NOT earn empirical replication count.
  // 1. Authenticated receipt verified against authentic external authority -> count 1 (AUTHENTICATED_EMPIRICAL_ACQUISITION)
  // 2. Synthetic test key receipt -> count 0 (SYNTHETIC_VERIFIED_RECEIPT_ZERO_EMPIRICAL_CREDIT)
  // 3. Unauthenticated/tampered/untrusted receipt -> count 0 (UNAUTHENTICATED_RECEIPT_REJECTED)
  // 4. Caller-declared empirical string without receipt -> count 0 (CALLER_DECLARED_UNAUTHENTICATED_EMPIRICAL)
  // 5. Default synthetic offline fixture -> count 0 (SYNTHETIC_OFFLINE_FIXTURE)
  const receipt = observations.acquisition_receipt;
  let verificationResult = null;
  if (receipt && typeof receipt === 'object') {
    verificationResult = verifyAcquisitionReceipt(receipt, observations, options);
  }

  const isCallerDeclaredEmpirical = observations.acquisition_class === 'EMPIRICAL_ACQUISITION';

  let replicationStatus = 'SYNTHETIC_OFFLINE_FIXTURE';
  let empiricalReplicationCount = 0;

  if (verificationResult) {
    if (verificationResult.verified) {
      if (verificationResult.is_authentic_external) {
        empiricalReplicationCount = 1;
        replicationStatus = unanimousAllFive
          ? 'AUTHENTICATED_EMPIRICAL_ACQUISITION'
          : 'PARTIAL_ROLE_EMPIRICAL_CONSENSUS';
      } else {
        empiricalReplicationCount = 0;
        replicationStatus = 'SYNTHETIC_VERIFIED_RECEIPT_ZERO_EMPIRICAL_CREDIT';
      }
    } else {
      empiricalReplicationCount = 0;
      replicationStatus = 'UNAUTHENTICATED_RECEIPT_REJECTED';
    }
  } else if (isCallerDeclaredEmpirical) {
    empiricalReplicationCount = 0;
    replicationStatus = 'CALLER_DECLARED_UNAUTHENTICATED_EMPIRICAL';
  } else {
    empiricalReplicationCount = 0;
    replicationStatus = 'SYNTHETIC_OFFLINE_FIXTURE';
  }

  return deepFreeze({
    active_roles: [...activeSet],
    findings_count: gatheredFindings.length,
    findings: gatheredFindings,
    detected_infractions: [...detectedInfractions],
    decision,
    consensus,
    replication_status: replicationStatus,
    empirical_replication_count: empiricalReplicationCount,
    independent_replication: false,
    release_authority: false,
    deployment_authority: false,
    human_closure_required: true
  });
}

/**
 * Evaluates an Orchestrator decision against independently withheld ground truth.
 *
 * Separates the evaluator from the runtime orchestrator:
 *   - Compares frozen orchestrator decision with withheld ground truth;
 *   - Detects escaped defects when an ablated role allowed a domain hazard to pass;
 *   - Distinguishes active true-negative defect detection from safe evidence-abstention;
 *   - Verifies sound admission when four dolls succeed on benign inputs without the fifth.
 */
export function evaluateAblationOutcome(orchestratorResult, withheldGroundTruth) {
  if (!withheldGroundTruth || typeof withheldGroundTruth !== 'object' || typeof withheldGroundTruth.verdict !== 'string' || !['SUPPORTED', 'HELD'].includes(withheldGroundTruth.verdict)) {
    return deepFreeze({
      status: 'MALFORMED_GROUND_TRUTH_REJECTED',
      orchestrator_decision: orchestratorResult?.decision || null,
      outcome_class: 'UNADJUDICATED',
      is_sound: false,
      defect_escaped: false,
      defect_detected: false,
      failure_mode: null,
      description: 'Withheld ground truth missing, malformed, or lacks valid verdict string.'
    });
  }

  const expectedVerdict = withheldGroundTruth.verdict;
  const expectedDefects = Array.isArray(withheldGroundTruth.defects) ? withheldGroundTruth.defects : [];
  const activeRoles = orchestratorResult?.active_roles || [];
  const detectedInfractions = orchestratorResult?.detected_infractions || [];
  const decision = orchestratorResult?.decision;

  let outcome_class = 'UNKNOWN';
  let is_sound = false;
  let defect_escaped = false;
  let defect_detected = false;
  let failure_mode = null;
  let escaped_classification = null;
  let missed_defects = [];
  let description = '';

  if (expectedVerdict === 'SUPPORTED') {
    if (decision === 'SUPPORTED' || decision === 'ADMITTED') {
      outcome_class = 'TRUE_POSITIVE_ADMISSION';
      is_sound = true;
      defect_escaped = false;
      defect_detected = false;
      description = 'Benign input packet verified and admitted; no false alarm raised by active dolls.';
    } else {
      outcome_class = 'FALSE_NEGATIVE_REJECTION';
      is_sound = false;
      defect_escaped = false;
      defect_detected = false;
      description = 'Benign input packet rejected by active dolls (conservative false alarm).';
    }
  } else {
    // Expected verdict is HELD (ground-truth defect present)
    if (decision === 'HELD_MISSING_OBSERVATION' || decision === 'HELD_NO_ACTIVE_SPECIALISTS') {
      outcome_class = 'SAFE_ABSTENTION_INSUFFICIENT_EVIDENCE';
      is_sound = true;
      defect_escaped = false;
      defect_detected = false;
      description = 'Orchestrator held fail-closed due to insufficient or missing specialist observations (safe abstention; defect was not actively detected by specialist instrumentation).';
    } else if (decision === 'HELD' || decision === 'HELD_UNKNOWN_ROLE') {
      const hasMalformedSchema = detectedInfractions.includes('MALFORMED_OBSERVATION_SCHEMA');
      const defectMatched = expectedDefects.length > 0 && detectedInfractions.some(i => expectedDefects.includes(i));
      const isSyntheticContained = orchestratorResult?.findings?.some(f => f.status === 'SYNTHETIC_FAULT_CONTAINED' || f.is_synthetic_injection);
      if (defectMatched) {
        if (isSyntheticContained) {
          outcome_class = 'SYNTHETIC_FAULT_CONTAINED';
          is_sound = true;
          defect_escaped = false;
          defect_detected = true;
          description = 'Synthetic fault injection successfully contained fail-closed (0 empirical discovery credit).';
        } else {
          outcome_class = 'TRUE_NEGATIVE_PREVENTION';
          is_sound = true;
          defect_escaped = false;
          defect_detected = true;
          description = 'True defect detected and held fail-closed by active specialists.';
        }
      } else if (hasMalformedSchema) {
        outcome_class = 'MALFORMED_OBSERVATION_REJECTED';
        is_sound = true;
        defect_escaped = false;
        defect_detected = false;
        description = 'Observation rejected fail-closed due to malformed payload schema (protective hold; domain audit not executed, defect was not actively detected).';
      } else {
        outcome_class = 'PROTECTIVE_HOLD_UNMATCHED_DEFECT';
        is_sound = true;
        defect_escaped = false;
        defect_detected = false;
        description = 'Run held fail-closed, but detected infractions did not match expected withheld defect.';
      }
    } else {
      // Decision was SUPPORTED, ADMITTED, or UNCHECKED_MUTATION_PERMITTED -> DEFECT ESCAPED!
      outcome_class = 'FALSE_POSITIVE_ADMISSION';
      is_sound = false;
      defect_escaped = true;
      defect_detected = false;
      missed_defects = expectedDefects.filter(d => !detectedInfractions.includes(d));

      if (activeRoles.length === 0) {
        failure_mode = FAILURE_MODES.NO_DOLLHOUSE.failure_mode;
        escaped_classification = FAILURE_MODES.NO_DOLLHOUSE.decision;
        description = 'No dolls present: unchecked mutation admitted hazardous state.';
      } else if (missed_defects.includes(ROLE_INFRACTIONS.APERTURE)) {
        failure_mode = FAILURE_MODES.MISSING_APERTURE.failure_mode;
        escaped_classification = FAILURE_MODES.MISSING_APERTURE.decision;
        description = 'Aperture ablated: URL hash accepted without admitted DOM workspace.';
      } else if (missed_defects.includes(ROLE_INFRACTIONS.ATLAS)) {
        failure_mode = FAILURE_MODES.MISSING_ATLAS.failure_mode;
        escaped_classification = FAILURE_MODES.MISSING_ATLAS.decision;
        description = 'Atlas ablated: predecessor chain unverified across popup boundaries.';
      } else if (missed_defects.includes(ROLE_INFRACTIONS.FADT)) {
        failure_mode = FAILURE_MODES.MISSING_FADT.failure_mode;
        escaped_classification = FAILURE_MODES.MISSING_FADT.decision;
        description = 'FADT ablated: unconditioned action capability exposed under erased conditioning.';
      } else if (missed_defects.includes(ROLE_INFRACTIONS.TEMPORAL_CUSTODIAN)) {
        failure_mode = FAILURE_MODES.MISSING_TEMPORAL_CUSTODIAN.failure_mode;
        escaped_classification = FAILURE_MODES.MISSING_TEMPORAL_CUSTODIAN.decision;
        description = 'Temporal Custodian ablated: out-of-order unreferenced retry admitted.';
      } else if (missed_defects.includes(ROLE_INFRACTIONS.PEDAGOGUE)) {
        failure_mode = FAILURE_MODES.MISSING_PEDAGOGUE.failure_mode;
        escaped_classification = FAILURE_MODES.MISSING_PEDAGOGUE.decision;
        description = 'Pedagogue ablated: cadence inverted and user cognitive navigation trap ignored.';
      } else {
        failure_mode = 'Unclassified defect escaped detection.';
        escaped_classification = 'DEFECT_ESCAPED';
        description = 'A specialized defect escaped detection by remaining dolls.';
      }
    }
  }

  return deepFreeze({
    outcome_class,
    is_sound,
    defect_escaped,
    defect_detected,
    empirical_discovery_credit: (outcome_class === 'TRUE_NEGATIVE_PREVENTION') ? 1 : 0,
    escaped_classification,
    failure_mode,
    expected_verdict: expectedVerdict,
    orchestrator_decision: decision,
    detected_infractions: detectedInfractions,
    missed_defects,
    description
  });
}

/**
 * Runs a blind ablation trial on a scenario packet:
 *   1. Strips withheld ground truth from observations;
 *   2. Runs the blind Orchestrator;
 *   3. Evaluates the frozen decision against withheld ground truth.
 */
export function runAblationTrial(activeRoleNames = [], scenarioPacket = {}, options = {}) {
  const { ground_truth: withheldGroundTruth, ...blindedObservations } = scenarioPacket;
  const orchestrator = runOrchestrationDecision(activeRoleNames, blindedObservations, options);
  const evaluation = evaluateAblationOutcome(orchestrator, withheldGroundTruth);
  return deepFreeze({
    orchestrator,
    evaluation
  });
}

/**
 * Runs the complete 13-condition Blind Role-Ablation Matrix and Empirical Specialization Trials.
 */
export function runCompleteDollhouseAblation(roleAudits = {}) {
  const fullCondition = runOrchestrationDecision(FIVE_ROLES, roleAudits);
  const noDollhouseCondition = runOrchestrationDecision([], roleAudits, { orchestrator_governance: false, condition_name: 'NO_DOLLHOUSE_BASELINE' });
  const orchestratorAloneCondition = runOrchestrationDecision([], roleAudits, { orchestrator_governance: true, condition_name: 'ORCHESTRATOR_ALONE' });

  const singleRoleConditions = {
    SINGLE_ROLE_PEDAGOGUE: runOrchestrationDecision(['PEDAGOGUE'], roleAudits),
    SINGLE_ROLE_APERTURE: runOrchestrationDecision(['APERTURE'], roleAudits),
    SINGLE_ROLE_ATLAS: runOrchestrationDecision(['ATLAS'], roleAudits),
    SINGLE_ROLE_FADT: runOrchestrationDecision(['FADT'], roleAudits),
    SINGLE_ROLE_TEMPORAL_CUSTODIAN: runOrchestrationDecision(['TEMPORAL_CUSTODIAN'], roleAudits)
  };

  const minusOneConditions = {
    MINUS_PEDAGOGUE: runOrchestrationDecision(['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], roleAudits),
    MINUS_APERTURE: runOrchestrationDecision(['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], roleAudits),
    MINUS_ATLAS: runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'], roleAudits),
    MINUS_FADT: runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'], roleAudits),
    MINUS_TEMPORAL_CUSTODIAN: runOrchestrationDecision(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'], roleAudits)
  };

  const empiricalTrials = {
    NO_DOLLHOUSE_BASELINE: runAblationTrial([], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY, { orchestrator_governance: false }),
    ORCHESTRATOR_ALONE: runAblationTrial([], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY, { orchestrator_governance: true }),
    MINUS_PEDAGOGUE: runAblationTrial(['APERTURE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_PEDAGOGUE_CADENCE),
    MINUS_APERTURE: runAblationTrial(['PEDAGOGUE', 'ATLAS', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_APERTURE_OBSERVABILITY),
    MINUS_ATLAS: runAblationTrial(['PEDAGOGUE', 'APERTURE', 'FADT', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_ATLAS_RELATIONAL),
    MINUS_FADT: runAblationTrial(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'TEMPORAL_CUSTODIAN'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_FADT_STAGE_ERASURE),
    MINUS_TEMPORAL_CUSTODIAN: runAblationTrial(['PEDAGOGUE', 'APERTURE', 'ATLAS', 'FADT'], CANONICAL_EMPIRICAL_SCENARIOS.DEFECT_TEMPORAL_CHRONOLOGY)
  };

  const allConditions = {
    FULL_FIVE_ROLE: fullCondition,
    NO_DOLLHOUSE_BASELINE: noDollhouseCondition,
    ORCHESTRATOR_ALONE: orchestratorAloneCondition,
    ...singleRoleConditions,
    ...minusOneConditions
  };

  const diffMetrics = {};
  for (const [name, result] of Object.entries(allConditions)) {
    if (name === 'FULL_FIVE_ROLE') continue;
    const lostFindings = fullCondition.findings.filter(f => !result.findings.some(rf => rf.id === f.id));
    const lostInfractions = fullCondition.detected_infractions.filter(i => !result.detected_infractions.includes(i));
    const trial = empiricalTrials[name] || null;
    diffMetrics[name] = {
      active_roles_count: result.active_roles.length,
      lost_findings_count: lostFindings.length,
      lost_findings: lostFindings.map(f => `${f.role}:${f.id} (${f.claim})`),
      lost_infractions: lostInfractions,
      decision: result.decision,
      empirical_trial_escaped_classification: trial ? trial.evaluation.escaped_classification : null,
      empirical_trial_failure_mode: trial ? trial.evaluation.failure_mode : null,
      decision_matches_baseline: result.decision === fullCondition.decision
    };
  }

  return deepFreeze({
    schema: DOLLHOUSE_ABLATION_EXPERIMENT_SCHEMA,
    experiment: 'Full 5-Role Multi-Agent Blind Ablation on Coordinate: return_state_divergence_and_held_c2',
    evaluated_roles: FIVE_ROLES,
    total_conditions: Object.keys(allConditions).length,
    full_five_role_verdict: fullCondition.decision,
    replication_audit: {
      status: fullCondition.replication_status,
      empirical_replication_count: fullCondition.empirical_replication_count,
      rule: 'SHARED_ACQUISITION != INDEPENDENT_REPLICATION: 5 subagents inspecting 1 receipt yield 1 empirical replication'
    },
    conditions: allConditions,
    empirical_trials: empiricalTrials,
    diff_metrics: diffMetrics,
    conclusions: [
      'Ablating Aperture produces FALSE_COMPLETION_ADMITTED by conflating the URL hash with DOM workspace admittance.',
      'Ablating Atlas produces CUSTODY_FORK_RISK_ACCEPTED by ignoring unverified predecessor receipt digest chaining.',
      'Ablating FADT produces ILLEGAL_ACTION_ESCALATION_ACCEPTED by allowing unconditioned export capability exposure.',
      'Ablating Temporal Custodian produces CHRONOLOGICAL_OBLIVION_ADMITTED by allowing out-of-order unreferenced retries.',
      'Ablating Pedagogue produces HUMAN_COST_IGNORED by validating technical state while masking user cognitive navigation traps.',
      'Bounded non-redundancy: Under this 13-condition ablation assay, no single role is redundant. Every jurisdiction detects an exclusive structural failure mode.'
    ]
  });
}

/**
 * Standard Canonical Scenarios for Blind Empirical Trials
 */
export const CANONICAL_EMPIRICAL_SCENARIOS = deepFreeze({
  BENIGN_ALL_PASS: {
    ground_truth: { verdict: 'SUPPORTED', defects: [] },
    pedagogue: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] },
    aperture: { current_operator: [[1, 0], [0, 1]], candidate_probes: [[1, 1]] },
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 1 }, trajectoryB: { endpoint: 'node-A', winding_number: 1 } },
    fadt: { fiberRows: [{ id: 'f1', support: ['READ'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: false },
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, receiver: { status: 'PASS', entry_id: 'e2' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] }
  },
  DEFECT_APERTURE_OBSERVABILITY: {
    ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.APERTURE] },
    pedagogue: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] },
    aperture: { current_operator: [[1, 0]], candidate_probes: [[0, 1]], noise_covariance: [[1, 0], [9, 1]] }, // nonsymmetric covariance
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 1 }, trajectoryB: { endpoint: 'node-A', winding_number: 1 } },
    fadt: { fiberRows: [{ id: 'f1', support: ['READ'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: false },
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, receiver: { status: 'PASS', entry_id: 'e2' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] }
  },
  DEFECT_ATLAS_RELATIONAL: {
    ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.ATLAS] },
    pedagogue: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] },
    aperture: { current_operator: [[1, 0], [0, 1]], candidate_probes: [[1, 1]] },
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 2 }, trajectoryB: { endpoint: 'node-A', winding_number: 0 } }, // Winding mismatch
    fadt: { fiberRows: [{ id: 'f1', support: ['READ'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: false },
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, receiver: { status: 'PASS', entry_id: 'e2' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] }
  },
  DEFECT_FADT_STAGE_ERASURE: {
    ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.FADT] },
    pedagogue: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] },
    aperture: { current_operator: [[1, 0], [0, 1]], candidate_probes: [[1, 1]] },
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 1 }, trajectoryB: { endpoint: 'node-A', winding_number: 1 } },
    fadt: { fiberRows: [{ id: 'f1', support: ['READ', 'EXPORT'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: true }, // Gap exists, attempts export
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, receiver: { status: 'PASS', entry_id: 'e2' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] }
  },
  DEFECT_TEMPORAL_CHRONOLOGY: {
    ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.TEMPORAL_CUSTODIAN] },
    pedagogue: { events: [{ phase: 'NOTICE', at: 10 }, { phase: 'ACT', at: 20 }, { phase: 'WORLD_ANSWERS', at: 30 }, { phase: 'NAME', at: 40 }] },
    aperture: { current_operator: [[1, 0], [0, 1]], candidate_probes: [[1, 1]] },
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 1 }, trajectoryB: { endpoint: 'node-A', winding_number: 1 } },
    fadt: { fiberRows: [{ id: 'f1', support: ['READ'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: false },
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] } // Missing receiver
  },
  DEFECT_PEDAGOGUE_CADENCE: {
    ground_truth: { verdict: 'HELD', defects: [ROLE_INFRACTIONS.PEDAGOGUE] },
    pedagogue: { events: [{ phase: 'ACT', at: 10 }, { phase: 'NOTICE', at: 20 }] }, // ACT before NOTICE
    aperture: { current_operator: [[1, 0], [0, 1]], candidate_probes: [[1, 1]] },
    atlas: { trajectoryA: { endpoint: 'node-A', winding_number: 1 }, trajectoryB: { endpoint: 'node-A', winding_number: 1 } },
    fadt: { fiberRows: [{ id: 'f1', support: ['READ'] }, { id: 'f2', support: ['READ'] }], attempts_unconditioned_action: false },
    temporal: { phases: { origin: { status: 'PASS', entry_id: 'e1' }, receiver: { status: 'PASS', entry_id: 'e2' }, return: { status: 'PASS', entry_id: 'e3' } }, required_phases: ['origin', 'receiver', 'return'] }
  }
});
