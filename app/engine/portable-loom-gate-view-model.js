/**
 * @file app/engine/portable-loom-gate-view-model.js
 * @description Pure read-only view-model presentation adapter for the customer-facing Loom Gate (Issue #1592).
 *
 * GOVERNING LAWS & CONTRACTS (Artifact 45-R2 / Artifact 46-R1):
 * 1. PURE PRESENTATION ADAPTER: Pure functions only; zero platform (node:fs, node:crypto) dependencies.
 * 2. DETERMINISTIC PURITY: Identical accepted inputs deterministically map to identical public output.
 *    No internal new Date() or non-deterministic generators.
 * 3. AUTHORITY CEILINGS: head_advanced: false, foreign_enforcement_proved: false, empirical_credit: 0.
 * 4. TRUST BOUNDARY: Serialized caller-supplied witnesses are untrusted declarations. Within Slice 1,
 *    gate_verification_status defaults strictly to 'UNVERIFIED_DECLARATION'. An unverified report
 *    never produces an unqualified customer-facing PASS.
 * 5. CONTRADICTORY REPORT REJECTION: Contradictory combinations (e.g. PASS with nonzero disclosure,
 *    EXPOSURE with zero disclosure/recovery) fail closed in validation.
 * 6. CUSTOMER UI VS EXPERT SEPARATION: Internal research cast names (Dollhouse, Pedagogue, Aperture,
 *    Atlas, FADT, Temporal Custodian, Orchestrator) remain confined to expert drawer / machine schemas,
 *    never in customer-facing titles, buttons, or default presentation text.
 * 7. DEEP VALUE-LEVEL SAFETY: Recursive structural validation without getter evaluation; explicit field
 *    allowlists; deep-frozen output for local client runtime safety.
 */

export const LOOM_GATE_SNAPSHOT_SCHEMA = 'td613.loom.gate-snapshot/v0.1';
export const LOOM_GATE_VIEW_MODEL_SCHEMA = 'td613.loom.gate-view-model/v0.1';
export const PORTABLE_LOOM_GATE_SCHEMA = 'td613.loom.gate-alert/v0.1';

export const LOOM_GATE_LABEL = '米 Check Loom Gate';
export const LOOM_GATE_HREF = 'https://td613.com/dome-world/holonomy-loom.html#loomGate';

const HEX64_REGEX = /^[a-f0-9]{64}$/;
const REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-\.]{1,128}$/;

// Maximum structural resource bounds
const MAX_DEPTH = 10;
const MAX_KEYS = 50;
const MAX_ARRAY_LENGTH = 1000;
const MAX_STRING_LENGTH = 2048;

// Strict Value-Level Allowlists (R1-02)
export const RECEIPT_SCOPE_ALLOWLIST = Object.freeze([
  'ORIGIN_COMPUTED_SUMMARY_REQUIRES_LOCAL_PRIVATE_RECORD_FOR_RECOMPUTATION',
  'ORIGIN_COMPUTED_SUMMARY_LOCAL_PRIVATE_RECORD_REQUIRED'
]);

export const EVIDENCE_CLASS_ALLOWLIST = Object.freeze([
  'DECLARATION',
  'OFFLINE_TEST',
  'BROWSER_WITNESS',
  'PROVIDER_RESPONSE',
  'EMPIRICAL_ACQUISITION'
]);

export const GATE_STATUS_ALLOWLIST = Object.freeze([
  'OBSERVED_EXPOSURE',
  'HOLD_REFERENCE_MISMATCH',
  'HELD_INCOMPLETE_OBSERVATION',
  'BOUNDED_CHALLENGE_PASSED'
]);

export const SPECIALIST_KEY_ALLOWLIST = Object.freeze([
  'PEDAGOGUE',
  'APERTURE',
  'ATLAS',
  'FADT',
  'TEMPORAL_CUSTODIAN'
]);

export const SPECIALIST_STATUS_ALLOWLIST = Object.freeze([
  'NOT_RUN',
  'SUPPORTED',
  'HELD',
  'HELD_DISSENT',
  'HELD_MISSING_OBSERVATION',
  'ABSTAIN',
  'INCOMPLETE_OBSERVATION',
  'UNKNOWN'
]);

export const PHASE_ALLOWLIST = Object.freeze([
  'ARRIVED',
  'AIA_STAGED',
  'AIA_SENT',
  'FILES_STAGED',
  'CONTINUING',
  'DONE',
  'EXPIRED',
  'LEFT',
  'UNKNOWN'
]);

export const CONTINUATION_STATUS_ALLOWLIST = Object.freeze([
  'ADMITTED',
  'HELD',
  'EXPIRED',
  'UNKNOWN'
]);

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
 * Deep structural validation verifying finite resource bounds, non-plain objects,
 * prototypes, cyclic references, and accessors (getters/setters) WITHOUT invoking getters.
 *
 * @param {unknown} node
 * @param {string} [path='']
 * @param {number} [depth=0]
 * @param {Set<object>} [visited]
 */
function validateStructureDeep(node, path = '', depth = 0, visited = new Set()) {
  if (depth > MAX_DEPTH) {
    throw new Error(`Loom Gate snapshot exceeds maximum nesting depth of ${MAX_DEPTH} at ${path || 'root'}.`);
  }

  if (node === null) return;

  const nodeType = typeof node;

  if (nodeType === 'function') {
    throw new Error(`Loom Gate snapshot contains executable function at ${path || 'root'}.`);
  }
  if (nodeType === 'symbol') {
    throw new Error(`Loom Gate snapshot contains symbol at ${path || 'root'}.`);
  }
  if (nodeType === 'bigint') {
    throw new Error(`Loom Gate snapshot contains bigint at ${path || 'root'}.`);
  }
  if (nodeType === 'number') {
    if (!Number.isFinite(node)) {
      throw new Error(`Loom Gate snapshot contains non-finite number at ${path || 'root'}.`);
    }
    return;
  }
  if (nodeType === 'string') {
    if (node.length > MAX_STRING_LENGTH) {
      throw new Error(`Loom Gate snapshot string exceeds maximum length of ${MAX_STRING_LENGTH} at ${path || 'root'}.`);
    }
    return;
  }
  if (nodeType === 'boolean') {
    return;
  }

  if (nodeType === 'object') {
    if (visited.has(node)) {
      throw new Error(`Loom Gate snapshot contains cyclic reference at ${path || 'root'}.`);
    }
    visited.add(node);

    const proto = Object.getPrototypeOf(node);

    if (Array.isArray(node)) {
      if (proto !== Array.prototype) {
        throw new Error(`Loom Gate snapshot array has custom prototype at ${path || 'root'}.`);
      }
      if (node.length > MAX_ARRAY_LENGTH) {
        throw new Error(`Loom Gate snapshot array exceeds maximum length of ${MAX_ARRAY_LENGTH} at ${path || 'root'}.`);
      }
      for (let i = 0; i < node.length; i++) {
        validateStructureDeep(node[i], `${path}[${i}]`, depth + 1, visited);
      }
    } else {
      if (proto !== Object.prototype && proto !== null) {
        throw new Error(`Loom Gate snapshot contains non-plain object or custom prototype at ${path || 'root'}.`);
      }

      // Inspect property descriptors to catch accessors (getters/setters) WITHOUT invoking them
      const descriptors = Object.getOwnPropertyDescriptors(node);
      const keys = Object.keys(descriptors);

      if (keys.length > MAX_KEYS) {
        throw new Error(`Loom Gate snapshot exceeds maximum property count of ${MAX_KEYS} at ${path || 'root'}.`);
      }

      for (const key of keys) {
        const desc = descriptors[key];
        if (desc.get !== undefined || desc.set !== undefined) {
          throw new Error(`Loom Gate snapshot contains accessor property (getter/setter) at ${path ? `${path}.${key}` : key}.`);
        }
        // desc.value is safe to inspect because it is a direct data property
        validateStructureDeep(desc.value, path ? `${path}.${key}` : key, depth + 1, visited);
      }
    }

    visited.delete(node);
  }
}

/**
 * Validates the syntactic, structural, and value-level integrity of an incoming Loom Gate snapshot.
 * Rejects prototypes, cyclic references, missing mandatory keys, negative counts,
 * contradictory reports, executable functions, or unauthorized authority claims.
 *
 * @param {unknown} snapshot
 * @returns {boolean} True if structurally valid; throws Error on contract violation.
 */
export function validateLoomGateSnapshot(snapshot) {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Loom Gate snapshot must be a non-null plain object.');
  }

  // Deep recursive validation without invoking getters (R1-03)
  validateStructureDeep(snapshot);

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
    if (snapshot.session.phase !== undefined && !PHASE_ALLOWLIST.includes(snapshot.session.phase)) {
      throw new Error(`Snapshot session phase contains unrecognized value: '${snapshot.session.phase}'.`);
    }
  }

  // Inspect specialist summaries if present (R1-02)
  if (snapshot.specialist_summaries !== undefined) {
    if (snapshot.specialist_summaries === null || typeof snapshot.specialist_summaries !== 'object' || Array.isArray(snapshot.specialist_summaries)) {
      throw new Error('Snapshot specialist_summaries must be an object.');
    }
    for (const [k, v] of Object.entries(snapshot.specialist_summaries)) {
      if (!SPECIALIST_KEY_ALLOWLIST.includes(k)) {
        throw new Error(`Unrecognized specialist key in specialist_summaries: '${k}'.`);
      }
      if (v === null || typeof v !== 'object' || Array.isArray(v)) {
        throw new Error(`Specialist summary for '${k}' must be an object.`);
      }
      if (v.status !== undefined && !SPECIALIST_STATUS_ALLOWLIST.includes(v.status)) {
        throw new Error(`Specialist summary for '${k}' contains unrecognized status: '${v.status}'.`);
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
    const c = report.coverage || {};
    if (report.coverage !== undefined) {
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
    const j = report.joining || {};
    if (report.joining !== undefined) {
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

    // Value-level enum allowlist checks (R1-02)
    if (report.status !== undefined && !GATE_STATUS_ALLOWLIST.includes(report.status)) {
      throw new Error(`Snapshot native_gate_report status contains unrecognized value: '${report.status}'.`);
    }
    if (report.evidence_class !== undefined && !EVIDENCE_CLASS_ALLOWLIST.includes(report.evidence_class)) {
      throw new Error(`Snapshot native_gate_report evidence_class contains unrecognized value: '${report.evidence_class}'.`);
    }
    if (report.receipt_scope !== undefined && !RECEIPT_SCOPE_ALLOWLIST.includes(report.receipt_scope)) {
      throw new Error(`Snapshot native_gate_report receipt_scope contains unrecognized value: '${report.receipt_scope}'.`);
    }

    // Reject contradictory reports (R1-01)
    if (report.status === 'BOUNDED_CHALLENGE_PASSED') {
      if ((c.disclosed_targets ?? 0) > 0) {
        throw new Error('Contradictory report: status is BOUNDED_CHALLENGE_PASSED but disclosed_targets is nonzero.');
      }
      if ((c.successful_reconstruction_attempts ?? 0) > 0) {
        throw new Error('Contradictory report: status is BOUNDED_CHALLENGE_PASSED but successful_reconstruction_attempts is nonzero.');
      }
      if ((c.missing_required_channels ?? 0) > 0) {
        throw new Error('Contradictory report: status is BOUNDED_CHALLENGE_PASSED but missing_required_channels is nonzero.');
      }
      if ((c.missing_attempts ?? 0) > 0) {
        throw new Error('Contradictory report: status is BOUNDED_CHALLENGE_PASSED but missing_attempts is nonzero.');
      }
    }

    if (report.status === 'OBSERVED_EXPOSURE') {
      const disclosed = c.disclosed_targets ?? 0;
      const recovered = c.successful_reconstruction_attempts ?? 0;
      const joinedObserved = j.observed ?? 0;
      if (disclosed === 0 && recovered === 0 && joinedObserved === 0) {
        throw new Error('Contradictory report: status is OBSERVED_EXPOSURE but zero disclosed targets or reconstructions observed.');
      }
    }

    if (report.status === 'HELD_INCOMPLETE_OBSERVATION') {
      const missingCh = c.missing_required_channels ?? 0;
      const missingAtt = c.missing_attempts ?? 0;
      const joinedIncomplete = j.incomplete ?? 0;
      if (missingCh === 0 && missingAtt === 0 && joinedIncomplete === 0) {
        throw new Error('Contradictory report: status is HELD_INCOMPLETE_OBSERVATION but zero missing channels or attempts recorded.');
      }
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
 * TRUST BOUNDARY GUARANTEE (R1-01 / Amari Guard):
 * Serialized caller-supplied witnesses in the snapshot are untrusted declarations.
 * Within Slice 1's pure adapter scope, gate_verification_status defaults strictly to
 * 'UNVERIFIED_DECLARATION'. An unverified report NEVER produces an unqualified customer-facing PASS.
 * Zero invented verification, foreign enforcement, or empirical credit.
 *
 * @param {object} snapshot - Validated Loom Gate snapshot.
 * @param {object} [options={}] - Presentation options.
 * @returns {Readonly<object>} Deeply frozen presentation view-model.
 */
export function deriveLoomGateViewModel(snapshot, options = {}) {
  validateLoomGateSnapshot(snapshot);

  const report = snapshot.native_gate_report || snapshot.gate_report || {};
  const coverage = report.coverage || {};
  const joining = report.joining || {};

  const status = report.status || 'NOT_RUN';
  const evidenceClass = report.evidence_class && EVIDENCE_CLASS_ALLOWLIST.includes(report.evidence_class)
    ? report.evidence_class
    : 'DECLARATION';

  const capturedChannels = coverage.captured_channels ?? 0;
  const missingChannels = coverage.missing_required_channels ?? 0;
  const checkedTargets = coverage.checked_targets ?? 0;
  const disclosedTargets = coverage.disclosed_targets ?? 0;
  const declaredAttempts = coverage.declared_reconstruction_attempts ?? 0;
  const measuredAttempts = coverage.measured_reconstruction_attempts ?? 0;
  const successfulAttempts = coverage.successful_reconstruction_attempts ?? 0;
  const missingAttempts = coverage.missing_attempts ?? 0;

  // TRUST BOUNDARY: Serialized caller-supplied witnesses in the snapshot are untrusted declarations.
  // Within Slice 1, gate_verification_status defaults strictly to 'UNVERIFIED_DECLARATION'.
  const gateVerificationStatus = 'UNVERIFIED_DECLARATION';

  // Customer UI wording (Strictly customer-legible, zero internal research cast names)
  let whatHappened = 'Loom arrived locally. No receiver checks have been run.';
  let whatWasChecked = 'No captured challenge surfaces checked yet.';
  let whatRemainsUnknown = 'The model provider’s internal reasoning and hidden activations remain unobserved. Downstream retention, fine-tuning use, or training storage is not measured. Conversation leakage fraction is unmeasured (null).';
  let whatHappensNext = 'Review your local files and attachments before an explicit send gesture.';
  let nextAction = 'REVIEW_LOCAL_STAGING_BEFORE_SEND';

  if (status === 'OBSERVED_EXPOSURE') {
    whatHappened = 'Alert · exposure detected. Declared protected targets appeared on captured surfaces.';
    whatWasChecked = `${checkedTargets} canary targets checked across ${capturedChannels} captured channels; ${disclosedTargets} disclosed. ${declaredAttempts} reconstruction attempts declared; ${successfulAttempts} recovered.`;
    whatHappensNext = 'HOLD · Review exposure and registered scope before taking any further action.';
    nextAction = 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE';
  } else if (status === 'BOUNDED_CHALLENGE_PASSED') {
    // R1-01: An unverified report cannot produce an unqualified PASS presentation
    whatHappened = 'Unverified declaration · declared checks passed on captured surfaces; local recomputation required before reliance.';
    whatWasChecked = `${checkedTargets} canary targets declared checked across ${capturedChannels} captured channels; ${disclosedTargets} disclosed. ${measuredAttempts} reconstruction probes declared measured; ${successfulAttempts} recovered. Verification status: unverified declaration.`;
    whatHappensNext = 'HOLD · Verify capture integrity locally before continuing.';
    nextAction = 'HOLD_RECOMPUTE_LOCAL_GATE_INTEGRITY';
  } else if (status === 'HELD_INCOMPLETE_OBSERVATION') {
    whatHappened = 'HOLD · incomplete observation. Required channels or probe attempts are missing.';
    whatWasChecked = `${missingChannels} required channels missing. ${missingAttempts} reconstruction attempts missing out of ${declaredAttempts} declared.`;
    whatHappensNext = 'HOLD · Repair binding or capture coverage before attempting continuation.';
    nextAction = 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';
  } else if (status === 'HOLD_REFERENCE_MISMATCH') {
    whatHappened = 'HOLD · reference mismatch. Challenge, session, or work-unit references require review.';
    whatWasChecked = 'Carried reference commitments do not match current session root or anchor work unit.';
    whatHappensNext = 'HOLD · Review session bindings and reference commitments.';
    nextAction = 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';
  }

  // Value-level sanitization for receipt_scope
  const receiptScope = report.receipt_scope && RECEIPT_SCOPE_ALLOWLIST.includes(report.receipt_scope)
    ? report.receipt_scope
    : 'ORIGIN_COMPUTED_SUMMARY_LOCAL_PRIVATE_RECORD_REQUIRED';

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
      scope: receiptScope,
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
 * Sanitizes a continuation payload for public export (Requirement R04 / Test T-EXPORT-01 / Repair R1-04).
 * Strips private canaries, prompt bodies, challenge solutions, and secret keys.
 *
 * DETERMINISTIC PURITY (R1-04):
 * Strictly deterministic pure function. Does not call new Date(). Identical inputs map
 * to identical outputs across all execution environments.
 *
 * @param {object} continuation - Continuation return payload to sanitize.
 * @returns {Readonly<object>} Deeply frozen, public-safe continuation record.
 */
export function sanitizePublicContinuation(continuation) {
  if (continuation === null || typeof continuation !== 'object' || Array.isArray(continuation)) {
    throw new Error('Continuation must be a non-null object.');
  }

  // Validate value-level attributes against allowlists (R1-02)
  const requestId = typeof continuation.request_id === 'string' && REQUEST_ID_REGEX.test(continuation.request_id)
    ? continuation.request_id
    : null;

  const sessionRootRef = typeof continuation.session_root_ref === 'string' && HEX64_REGEX.test(continuation.session_root_ref)
    ? continuation.session_root_ref
    : null;

  const anchorWorkUnitRef = typeof continuation.anchor_work_unit_ref === 'string' && HEX64_REGEX.test(continuation.anchor_work_unit_ref)
    ? continuation.anchor_work_unit_ref
    : null;

  const phase = typeof continuation.phase === 'string' && PHASE_ALLOWLIST.includes(continuation.phase)
    ? continuation.phase
    : 'UNKNOWN';

  const status = typeof continuation.status === 'string' && CONTINUATION_STATUS_ALLOWLIST.includes(continuation.status)
    ? continuation.status
    : 'HELD';

  // Construct public export strictly from allowlisted non-sensitive fields
  const publicRecord = {
    schema: 'td613.loom.public-continuation/v0.1',
    request_id: requestId,
    session_root_ref: sessionRootRef,
    anchor_work_unit_ref: anchorWorkUnitRef,
    phase,
    status,
    authority: {
      head_advanced: false,
      foreign_enforcement_proved: false,
      empirical_credit: 0
    }
  };

  return deepFreeze(publicRecord);
}
