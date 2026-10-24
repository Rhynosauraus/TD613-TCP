/**
 * @file app/engine/portable-loom-gate-view-model.js
 * @description Pure read-only view-model presentation adapter for the customer-facing Loom Gate (Issue #1592).
 *
 * GOVERNING LAWS & CONTRACTS:
 * 1. PURE PRESENTATION ADAPTER: Pure functions only; zero platform (node:fs, node:crypto) dependencies.
 * 2. AUTHORITY CEILINGS: head_advanced: false, foreign_enforcement_proved: false, empirical_credit: 0.
 * 3. TRUST BOUNDARY: Serialized caller-supplied witnesses are untrusted declarations. Within Slice 1,
 *    gate_verification_status defaults strictly to 'UNVERIFIED_DECLARATION'.
 * 4. CUSTOMER UI VS EXPERT SEPARATION: Internal research cast names (Dollhouse, Pedagogue, Aperture,
 *    Atlas, FADT, Temporal Custodian, Orchestrator) remain confined to expert drawer / machine schemas,
 *    never in customer-facing titles, buttons, or default presentation text.
 * 5. IMMUTABILITY & DATA MINIMIZATION: Explicit field allowlists; deep-frozen output for local client
 *    memory safety; raw canaries, prompt bodies, and private keys are never exposed.
 */

export const LOOM_GATE_SNAPSHOT_SCHEMA = 'td613.loom.gate-snapshot/v0.1';
export const LOOM_GATE_VIEW_MODEL_SCHEMA = 'td613.loom.gate-view-model/v0.1';
export const PORTABLE_LOOM_GATE_SCHEMA = 'td613.loom.gate-alert/v0.1';

export const LOOM_GATE_LABEL = '米 Check Loom Gate';
export const LOOM_GATE_HREF = 'https://td613.com/dome-world/holonomy-loom.html#loomGate';

const HEX64_REGEX = /^[a-f0-9]{64}$/;

/**
 * Recursively freezes an object and all nested properties for local client-side immutability.
 * Note: Object.freeze provides local runtime immutability only; it does not confer provenance
 * or cryptographic authenticity.
 *
 * @param {object} obj
 * @param {WeakSet} [seen]
 * @returns {Readonly<object>}
 */
function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object' || seen.has(obj)) return obj;
  seen.add(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object') {
      deepFreeze(val, seen);
    }
  }
  return Object.freeze(obj);
}

/**
 * Checks for circular references in a plain object graph.
 *
 * @param {unknown} val
 * @param {Set<object>} [visited]
 * @returns {boolean} True if cycle detected.
 */
function hasCycle(val, visited = new Set()) {
  if (val === null || typeof val !== 'object') return false;
  if (visited.has(val)) return true;
  visited.add(val);
  for (const k of Object.keys(val)) {
    if (hasCycle(val[k], visited)) return true;
  }
  visited.delete(val);
  return false;
}

/**
 * Validates the syntactic and structural integrity of an incoming Loom Gate snapshot.
 * Rejects prototypes, cyclic references, missing mandatory keys, negative counts,
 * executable functions, or unauthorized authority claims.
 *
 * Note: This synchronous validator verifies structural conformance only. It does not
 * recompute cryptographic hashes and does not claim cryptographic verification.
 *
 * @param {unknown} snapshot
 * @returns {boolean} True if structurally valid; throws Error on contract violation.
 */
export function validateLoomGateSnapshot(snapshot) {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Loom Gate snapshot must be a non-null plain object.');
  }

  // Reject prototype pollution
  const proto = Object.getPrototypeOf(snapshot);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error('Loom Gate snapshot prototype must be plain Object or null.');
  }

  // Reject cyclic references
  if (hasCycle(snapshot)) {
    throw new Error('Loom Gate snapshot contains cyclic references.');
  }

  // Reject executable functions anywhere in snapshot
  const checkNoFunctions = (node, path = '') => {
    if (node === null || typeof node !== 'object') {
      if (typeof node === 'function') {
        throw new Error(`Loom Gate snapshot contains executable function at ${path || 'root'}.`);
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'function') {
        throw new Error(`Loom Gate snapshot contains executable function at ${path ? `${path}.${k}` : k}.`);
      }
      if (v !== null && typeof v === 'object') {
        checkNoFunctions(v, path ? `${path}.${k}` : k);
      }
    }
  };
  checkNoFunctions(snapshot);

  if (snapshot.schema !== LOOM_GATE_SNAPSHOT_SCHEMA) {
    throw new Error(`Invalid snapshot schema: expected '${LOOM_GATE_SNAPSHOT_SCHEMA}', got '${snapshot.schema}'.`);
  }

  // Inspect session metadata if provided
  if (snapshot.session !== undefined) {
    if (snapshot.session === null || typeof snapshot.session !== 'object' || Array.isArray(snapshot.session)) {
      throw new Error('Snapshot session must be an object.');
    }
    for (const countKey of ['substantive_continuation_count', 'declared_withheld_documents', 'declared_selected_documents']) {
      const val = snapshot.session[countKey];
      if (val !== undefined) {
        if (!Number.isSafeInteger(val) || val < 0 || val > 100000) {
          throw new Error(`Snapshot session ${countKey} must be a safe non-negative integer <= 100000.`);
        }
      }
    }
    for (const refKey of ['session_root_ref', 'anchor_work_unit_ref']) {
      const ref = snapshot.session[refKey];
      if (ref !== undefined && (typeof ref !== 'string' || !HEX64_REGEX.test(ref))) {
        throw new Error(`Snapshot session ${refKey} must be a 64-character lowercase hexadecimal string.`);
      }
    }
  }

  // Inspect native gate report if present
  const report = snapshot.native_gate_report || snapshot.gate_report;
  if (report !== undefined) {
    if (report === null || typeof report !== 'object' || Array.isArray(report)) {
      throw new Error('Snapshot native_gate_report must be an object.');
    }
    if (report.schema !== PORTABLE_LOOM_GATE_SCHEMA) {
      throw new Error(`Snapshot native_gate_report schema must be '${PORTABLE_LOOM_GATE_SCHEMA}'.`);
    }
    if (report.action !== 'CHECK_LOOM_GATE') {
      throw new Error(`Snapshot native_gate_report action must be 'CHECK_LOOM_GATE'.`);
    }

    // Strict authority ceiling check (Structural contract)
    if (report.authority !== undefined) {
      if (report.authority === null || typeof report.authority !== 'object') {
        throw new Error('Snapshot native_gate_report authority must be an object.');
      }
      if (report.authority.head_advanced !== false ||
          report.authority.foreign_enforcement_proved !== false ||
          report.authority.empirical_credit !== 0) {
        throw new Error('Loom Gate snapshot authority contract violation: empirical credit, foreign enforcement, or head advancement cannot be claimed.');
      }
    }

    // Inspect coverage counts
    if (report.coverage !== undefined) {
      const c = report.coverage;
      if (c === null || typeof c !== 'object') {
        throw new Error('Snapshot native_gate_report coverage must be an object.');
      }
      for (const [k, v] of Object.entries(c)) {
        if (!Number.isSafeInteger(v) || v < 0 || v > 100000) {
          throw new Error(`Snapshot coverage count ${k} must be a safe non-negative integer <= 100000.`);
        }
      }
      if (c.disclosed_targets !== undefined && c.checked_targets !== undefined && c.disclosed_targets > c.checked_targets) {
        throw new Error('Snapshot coverage disclosed_targets cannot exceed checked_targets.');
      }
      if (c.successful_reconstruction_attempts !== undefined && c.measured_reconstruction_attempts !== undefined &&
          c.successful_reconstruction_attempts > c.measured_reconstruction_attempts) {
        throw new Error('Snapshot coverage successful_reconstruction_attempts cannot exceed measured_reconstruction_attempts.');
      }
      if (c.measured_reconstruction_attempts !== undefined && c.missing_attempts !== undefined && c.declared_reconstruction_attempts !== undefined &&
          c.measured_reconstruction_attempts + c.missing_attempts !== c.declared_reconstruction_attempts) {
        throw new Error('Snapshot coverage measured_reconstruction_attempts + missing_attempts must equal declared_reconstruction_attempts.');
      }
    }

    // Inspect joining counts
    if (report.joining !== undefined) {
      const j = report.joining;
      if (j === null || typeof j !== 'object') {
        throw new Error('Snapshot native_gate_report joining must be an object.');
      }
      for (const [k, v] of Object.entries(j)) {
        if (!Number.isSafeInteger(v) || v < 0 || v > 100000) {
          throw new Error(`Snapshot joining count ${k} must be a safe non-negative integer <= 100000.`);
        }
      }
    }

    // Ensure conversation leakage fraction is null
    if (report.conversation_leakage_fraction !== undefined && report.conversation_leakage_fraction !== null) {
      throw new Error('Snapshot native_gate_report conversation_leakage_fraction must be null.');
    }

    // Status check
    const validStatuses = ['OBSERVED_EXPOSURE', 'HOLD_REFERENCE_MISMATCH', 'HELD_INCOMPLETE_OBSERVATION', 'BOUNDED_CHALLENGE_PASSED'];
    if (report.status !== undefined && !validStatuses.includes(report.status)) {
      throw new Error(`Snapshot native_gate_report status must be one of: ${validStatuses.join(', ')}.`);
    }

    // Hex refs check
    for (const refKey of ['ref', 'session_root_ref', 'anchor_work_unit_ref', 'policy_commitment', 'challenge_ref', 'verification_ref']) {
      const ref = report[refKey];
      if (ref !== undefined && (typeof ref !== 'string' || !HEX64_REGEX.test(ref))) {
        throw new Error(`Snapshot native_gate_report ${refKey} must be a 64-character lowercase hexadecimal string.`);
      }
    }
  }

  return true;
}

/**
 * Pure derivation adapter mapping an immutable Loom Gate snapshot into a customer-legible,
 * 6-dimensional presentation view-model.
 *
 * TRUST BOUNDARY GUARANTEE:
 * Serialized caller-supplied witnesses in the snapshot are untrusted declarations.
 * Within Slice 1's pure adapter scope, gate_verification_status defaults strictly to
 * 'UNVERIFIED_DECLARATION'. Zero invented verification, foreign enforcement, or empirical credit.
 *
 * @param {object} snapshot - Validated Loom Gate snapshot.
 * @param {object} [options={}] - Presentation options.
 * @returns {Readonly<object>} Deeply frozen presentation view-model.
 */
export function deriveLoomGateViewModel(snapshot, options = {}) {
  validateLoomGateSnapshot(snapshot);

  const report = snapshot.native_gate_report || snapshot.gate_report || {};
  const session = snapshot.session || {};
  const coverage = report.coverage || {};
  const joining = report.joining || {};

  const status = report.status || 'NOT_RUN';
  const evidenceClass = report.evidence_class || 'DECLARATION';

  // Customer UI wording (Strictly customer-legible, zero internal research cast names)
  let whatHappened = 'Loom arrived locally. No receiver checks have been run.';
  let whatWasChecked = 'No captured challenge surfaces checked yet.';
  let whatRemainsUnknown = 'The model provider’s internal reasoning and hidden activations remain unobserved. Downstream retention, fine-tuning use, or training storage is not measured. Conversation leakage fraction is unmeasured (null).';
  let whatHappensNext = 'Review your local files and attachments before an explicit send gesture.';

  const capturedChannels = coverage.captured_channels ?? 0;
  const missingChannels = coverage.missing_required_channels ?? 0;
  const checkedTargets = coverage.checked_targets ?? 0;
  const disclosedTargets = coverage.disclosed_targets ?? 0;
  const declaredAttempts = coverage.declared_reconstruction_attempts ?? 0;
  const measuredAttempts = coverage.measured_reconstruction_attempts ?? 0;
  const successfulAttempts = coverage.successful_reconstruction_attempts ?? 0;
  const missingAttempts = coverage.missing_attempts ?? 0;

  if (status === 'OBSERVED_EXPOSURE') {
    whatHappened = 'Alert · exposure detected. Declared protected targets appeared on captured surfaces.';
    whatWasChecked = `${checkedTargets} canary targets checked across ${capturedChannels} captured channels; ${disclosedTargets} disclosed. ${declaredAttempts} reconstruction attempts declared; ${successfulAttempts} recovered.`;
    whatHappensNext = 'HOLD · Review exposure and registered scope before taking any further action.';
  } else if (status === 'BOUNDED_CHALLENGE_PASSED') {
    whatHappened = 'All declared checks passed on captured surfaces. Selected file commitments remain local.';
    whatWasChecked = `${checkedTargets} canary targets checked across ${capturedChannels} captured channels; 0 disclosed. ${measuredAttempts} reconstruction probes measured; 0 recovered.`;
    whatHappensNext = 'Review capture coverage before proceeding with governed continuation.';
  } else if (status === 'HELD_INCOMPLETE_OBSERVATION') {
    whatHappened = 'HOLD · incomplete observation. Required channels or probe attempts are missing.';
    whatWasChecked = `${missingChannels} required channels missing. ${missingAttempts} reconstruction attempts missing out of ${declaredAttempts} declared.`;
    whatHappensNext = 'HOLD · Repair binding or capture coverage before attempting continuation.';
  } else if (status === 'HOLD_REFERENCE_MISMATCH') {
    whatHappened = 'HOLD · reference mismatch. Challenge, session, or work-unit references require review.';
    whatWasChecked = 'Carried reference commitments do not match current session root or anchor work unit.';
    whatHappensNext = 'HOLD · Review session bindings and reference commitments.';
  }

  // Next action determined by status
  const nextAction = status === 'OBSERVED_EXPOSURE' ? 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE'
    : status === 'BOUNDED_CHALLENGE_PASSED' ? 'REVIEW_CAPTURE_COVERAGE_BEFORE_CONTINUING'
    : status === 'NOT_RUN' ? 'REVIEW_LOCAL_STAGING_BEFORE_SEND'
    : 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';

  // TRUST BOUNDARY: Serialized caller-supplied witnesses in the snapshot are untrusted declarations.
  // Within Slice 1, gate_verification_status defaults strictly to 'UNVERIFIED_DECLARATION'.
  const gateVerificationStatus = 'UNVERIFIED_DECLARATION';

  // Construct view-model via explicit allowlist (Safe Copy Construction)
  const viewModel = {
    schema: LOOM_GATE_VIEW_MODEL_SCHEMA,
    action: 'CHECK_LOOM_GATE',
    label: LOOM_GATE_LABEL,
    href: LOOM_GATE_HREF,
    status,
    gate_verification_status: gateVerificationStatus,
    customer_presentation: {
      what_happened: whatHappened,
      what_was_checked: whatWasChecked,
      what_remains_unknown: whatRemainsUnknown,
      what_happens_next: whatHappensNext
    },
    six_field_contract: {
      source: 'LOCAL_PORTABLE_SESSION_AND_CAPTURED_CHALLENGE',
      scope: report.receipt_scope || 'ORIGIN_COMPUTED_SUMMARY_LOCAL_PRIVATE_RECORD_REQUIRED',
      evidence_class: evidenceClass,
      measurement_status: status === 'NOT_RUN' ? 'NOT_RUN' : 'MEASURED',
      limitation: 'UNMEASURED_CONVERSATION_LEAKAGE_AND_ZERO_FOREIGN_ENFORCEMENT',
      next_action: nextAction
    },
    authority: {
      head_advanced: false,
      foreign_enforcement_proved: false,
      empirical_credit: 0
    },
    drawer: {
      id: 'loomGateHow',
      label: 'How do I know? 下',
      native_report_ref: typeof report.ref === 'string' && HEX64_REGEX.test(report.ref) ? report.ref : null,
      verification_status: gateVerificationStatus,
      local_private_recomputation_required: true,
      coverage: {
        captured_channels: capturedChannels,
        missing_required_channels: missingChannels,
        checked_targets: checkedTargets,
        disclosed_targets: disclosedTargets,
        declared_reconstruction_attempts: declaredAttempts,
        measured_reconstruction_attempts: measuredAttempts,
        successful_reconstruction_attempts: successfulAttempts,
        missing_attempts: missingAttempts
      },
      joining: {
        observed: joining.observed ?? 0,
        incomplete: joining.incomplete ?? 0
      },
      specialist_jurisdictions: [
        { id: 'PEDAGOGUE', conventional_name: 'Flow-Core Pedagogue', status: snapshot.specialist_summaries?.PEDAGOGUE?.status || 'NOT_RUN' },
        { id: 'APERTURE', conventional_name: 'Observational Aperture', status: snapshot.specialist_summaries?.APERTURE?.status || 'NOT_RUN' },
        { id: 'ATLAS', conventional_name: 'Atlas Relational Custody', status: snapshot.specialist_summaries?.ATLAS?.status || 'NOT_RUN' },
        { id: 'FADT', conventional_name: 'Finite Admissibility Descent', status: snapshot.specialist_summaries?.FADT?.status || 'NOT_RUN' },
        { id: 'TEMPORAL_CUSTODIAN', conventional_name: 'Temporal Custodian', status: snapshot.specialist_summaries?.TEMPORAL_CUSTODIAN?.status || 'NOT_RUN' }
      ],
      authority_ceilings: {
        head_advanced: false,
        foreign_enforcement_proved: false,
        empirical_credit: 0
      }
    }
  };

  return deepFreeze(viewModel);
}

/**
 * Sanitizes a continuation payload for public export (Requirement R04 / Test T-EXPORT-01).
 * Strips private canaries, prompt bodies, challenge solutions, and secret keys.
 *
 * @param {object} continuation - Continuation return payload to sanitize.
 * @returns {Readonly<object>} Deeply frozen, public-safe continuation record.
 */
export function sanitizePublicContinuation(continuation) {
  if (continuation === null || typeof continuation !== 'object' || Array.isArray(continuation)) {
    throw new Error('Continuation must be a non-null object.');
  }

  // Construct public export strictly from allowlisted non-sensitive fields
  const publicRecord = {
    schema: 'td613.loom.public-continuation/v0.1',
    request_id: typeof continuation.request_id === 'string' ? continuation.request_id : null,
    session_root_ref: typeof continuation.session_root_ref === 'string' && HEX64_REGEX.test(continuation.session_root_ref) ? continuation.session_root_ref : null,
    anchor_work_unit_ref: typeof continuation.anchor_work_unit_ref === 'string' && HEX64_REGEX.test(continuation.anchor_work_unit_ref) ? continuation.anchor_work_unit_ref : null,
    phase: typeof continuation.phase === 'string' ? continuation.phase : 'UNKNOWN',
    status: typeof continuation.status === 'string' ? continuation.status : 'HELD',
    sanitized_at: new Date().toISOString(),
    authority: {
      head_advanced: false,
      foreign_enforcement_proved: false,
      empirical_credit: 0
    }
  };

  return deepFreeze(publicRecord);
}
