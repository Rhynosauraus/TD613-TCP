/**
 * @fileoverview TD613 Dollhouse Atlas Relational Custody & Digest Migration Engine.
 *
 * Implements PR #984's concrete relation-identity custody, loop-power holonomy history
 * parity, and typed digest integrity:
 *
 * 1. Concrete Relation Identity Custody:
 *    - FIXED_SELF: Palindromic member identical to itself.
 *    - EXACT_IDENTITY: Non-palindromic member identical to itself.
 *    - MIRROR_MATES: Member paired with its reversed-path mirror mate.
 *    - DISTINCT_SAME_SLICE: Distinct non-mirror members within the same slice/chamber.
 *    - CROSS_SLICE_DISTINCT: Members from different slices/chambers.
 *    - INVARIANT: Orbit representatives never replace or erase concrete member custody!
 *
 * 2. Loop-Power Holonomy History Parity:
 *    - Equal endpoints do not imply equal winding histories.
 *    - If trajectories end at identical endpoints but differ in loop power or winding parity,
 *      Atlas halts at HOLD_DISTINCT_HISTORY_NOT_ERASED.
 *
 * 3. Typed Digest Integrity & Phason Custody String Equality Audit:
 *    - Non-retroactive migration recognizing historical FNV-1a32 `sha256:` mislabeling.
 *    - Strict rejection of caller-declared string equality without payload verification.
 */

export const DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA = 'td613.dollhouse.atlas-relation-identity/v0.1';
export const DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA = 'td613.dollhouse.atlas-history-parity/v0.1';
export const DOLLHOUSE_TYPED_DIGEST_SCHEMA = 'td613.dollhouse.typed-digest/v0.1';
export const DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA = 'td613.phason.custody-diff/v0.5-governed';

export const ATLAS_RELATION_CUSTODY_LAWS = Object.freeze({
  relation_recognition_not_identity_substitution: true,
  shared_orbit_not_same_member: true,
  orbit_representatives_never_replace_concrete_members: true,
  concrete_member_custody_retained: true,
  same_endpoint_does_not_erase_route_history: true,
  caller_string_equality_does_not_establish_content_invariance: true
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Evaluates typed content equality across declared snapshot domains.
 * Rejects silent cross-type coercion, unsupported exotic objects, and reference-identity shortcuts.
 */
export function stableContentEquals(left, right) {
  if (left === undefined || right === undefined) return false;
  if (left === null || right === null) return left === right;

  const typeL = typeof left;
  const typeR = typeof right;
  if (typeL !== typeR) return false;

  if (typeL === 'string') {
    return left === right;
  }

  if (typeL === 'number') {
    return Number.isFinite(left) && Number.isFinite(right) && left === right;
  }

  if (typeL === 'boolean') {
    return left === right;
  }

  if (left instanceof Uint8Array && right instanceof Uint8Array) {
    if (left.byteLength !== right.byteLength) return false;
    for (let i = 0; i < left.byteLength; i += 1) {
      if (left[i] !== right[i]) return false;
    }
    return true;
  }

  if (typeL !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (left instanceof Uint8Array || right instanceof Uint8Array) return false;

  const protoL = Object.getPrototypeOf(left);
  const protoR = Object.getPrototypeOf(right);
  if (!Array.isArray(left)) {
    if ((protoL !== Object.prototype && protoL !== null) || (protoR !== Object.prototype && protoR !== null)) {
      return false;
    }
  }

  return stableStringify(left) === stableStringify(right);
}

export function samePath(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
}

export function reversePath(p) {
  return Array.isArray(p) ? [...p].reverse() : [];
}

export function isPalindromePath(p) {
  return Array.isArray(p) && samePath(p, reversePath(p));
}

export function cloneAtlasMember(m) {
  if (!m || typeof m !== 'object') return m;
  return {
    a: m.a,
    b: m.b,
    s: m.s,
    path: Array.isArray(m.path) ? [...m.path] : m.path
  };
}

export function validAtlasMember(m) {
  if (!m || typeof m !== 'object') return false;
  if (!Number.isInteger(m.a) || !Number.isInteger(m.b) || !Number.isInteger(m.s)) return false;
  if (m.a < 0 || m.b < 0 || m.s < 0 || m.s > Math.min(m.a, m.b) || !Array.isArray(m.path)) return false;

  let D = 0, E = 0, N = 0;
  for (const step of m.path) {
    if (step === 'D') D += 1;
    else if (step === 'E') E += 1;
    else if (step === 'N') N += 1;
    else return false;
  }
  return D === m.s && E === m.a - m.s && N === m.b - m.s;
}

/**
 * Classifies the concrete relation identity between two Atlas members.
 * Preserves concrete member custody under all outcomes; shared orbit
 * recognition NEVER replaces or erases individual member paths.
 */
export function classifyAtlasRelationIdentity(left, right) {
  const lc = cloneAtlasMember(left);
  const rc = cloneAtlasMember(right);

  if (!validAtlasMember(left) || !validAtlasMember(right)) {
    return deepFreeze({
      schema: DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA,
      relation: 'HELD_INVALID_DECLARATION',
      held: true,
      left_custody: lc,
      right_custody: rc,
      shared_orbit: false,
      reason: 'one or both members violate valid Atlas member constraints',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  if (left.a !== right.a || left.b !== right.b || left.s !== right.s) {
    return deepFreeze({
      schema: DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA,
      relation: 'CROSS_SLICE_DISTINCT',
      held: false,
      left_custody: lc,
      right_custody: rc,
      shared_orbit: false,
      reason: 'members reside in distinct geometric slices',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const isLeftPalindrome = isPalindromePath(left.path);
  const pathsEqual = samePath(left.path, right.path);
  const pathsMirror = samePath(right.path, reversePath(left.path));

  let relation;
  let sharedOrbit = false;

  if (pathsEqual) {
    relation = isLeftPalindrome ? 'FIXED_SELF' : 'EXACT_IDENTITY';
    sharedOrbit = true;
  } else if (pathsMirror) {
    relation = 'MIRROR_MATES';
    sharedOrbit = true;
  } else {
    relation = 'DISTINCT_SAME_SLICE';
    sharedOrbit = false;
  }

  return deepFreeze({
    schema: DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA,
    relation,
    held: false,
    left_custody: lc,
    right_custody: rc,
    shared_orbit: sharedOrbit,
    left_is_palindrome: isLeftPalindrome,
    right_is_palindrome: isPalindromePath(right.path),
    concrete_paths_preserved: true,
    laws: ATLAS_RELATION_CUSTODY_LAWS
  });
}

/**
 * Evaluates loop-power holonomy history parity across two trajectories.
 * Enforces the core Atlas law: same endpoint does NOT erase route history.
 */
export function auditAtlasHolonomyHistoryParity(trajectoryA = {}, trajectoryB = {}) {
  if (!trajectoryA || typeof trajectoryA !== 'object' || !trajectoryB || typeof trajectoryB !== 'object') {
    throw new TypeError('trajectoryA and trajectoryB must be non-null objects');
  }

  const rawEndpointA = trajectoryA.endpoint ?? trajectoryA.end_state ?? trajectoryA.id;
  const rawEndpointB = trajectoryB.endpoint ?? trajectoryB.end_state ?? trajectoryB.id;

  if (typeof rawEndpointA !== 'string' || !rawEndpointA.trim() ||
      typeof rawEndpointB !== 'string' || !rawEndpointB.trim()) {
    return deepFreeze({
      schema: DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA,
      disposition: 'HOLD_MISSING_EXPLICIT_ENDPOINT',
      held: true,
      reason: 'both trajectories must declare explicit non-empty endpoint coordinates',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const rawWindingA = trajectoryA.winding_number ?? trajectoryA.loop_power ?? trajectoryA.winding;
  const rawWindingB = trajectoryB.winding_number ?? trajectoryB.loop_power ?? trajectoryB.winding;

  if (!Number.isSafeInteger(rawWindingA) || !Number.isSafeInteger(rawWindingB)) {
    return deepFreeze({
      schema: DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA,
      disposition: 'HOLD_MISSING_EXPLICIT_WINDING',
      held: true,
      reason: 'both trajectories must declare explicit integer winding numbers',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const endpointA = rawEndpointA.trim();
  const endpointB = rawEndpointB.trim();
  const windingA = rawWindingA;
  const windingB = rawWindingB;

  const endpointsEqual = endpointA === endpointB;
  const windingDelta = windingA - windingB;
  const parityEqual = windingDelta === 0;
  const modulo2ParityEqual = (windingA % 2 + 2) % 2 === (windingB % 2 + 2) % 2;

  let disposition;
  let reason;

  if (endpointsEqual) {
    if (!parityEqual) {
      disposition = 'HOLD_DISTINCT_HISTORY_NOT_ERASED';
      reason = 'equal endpoints do not erase distinct winding histories or loop powers';
    } else {
      disposition = 'PASS';
      reason = 'endpoints and winding histories match exactly';
    }
  } else {
    disposition = 'DISTINCT_ENDPOINTS';
    reason = 'trajectories terminate at distinct endpoints';
  }

  return deepFreeze({
    schema: DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA,
    endpoint_a: endpointA,
    endpoint_b: endpointB,
    endpoints_equal: endpointsEqual,
    winding_a: windingA,
    winding_b: windingB,
    winding_delta: windingDelta,
    history_parity_equal: parityEqual,
    modulo_2_parity_equal: modulo2ParityEqual,
    disposition,
    reason,
    laws: ATLAS_RELATION_CUSTODY_LAWS
  });
}

/**
 * Classifies a digest string as valid sha256, valid fnv1a32, or historical mislabeled.
 */
export function classifyTypedDigest(digestString) {
  if (typeof digestString !== 'string' || !digestString.trim()) {
    return deepFreeze({
      schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
      valid: false,
      algorithm: null,
      reason: 'digest must be a nonempty string'
    });
  }

  const trimmed = digestString.trim();

  if (trimmed.startsWith('sha256:')) {
    const hex = trimmed.slice(7);
    if (hex.length === 64 && /^[0-9a-fA-F]{64}$/.test(hex)) {
      return deepFreeze({
        schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
        valid: true,
        algorithm: 'sha256',
        hex_length: 64,
        is_historical_mislabeled: false,
        hex: hex.toLowerCase()
      });
    }
    if (hex.length === 8 && /^[0-9a-fA-F]{8}$/.test(hex)) {
      return deepFreeze({
        schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
        valid: false,
        algorithm: 'fnv1a32',
        hex_length: 8,
        is_historical_mislabeled: true,
        classification: 'HISTORICAL_FNV1A_LABELED_AS_SHA256',
        reason: '32-bit FNV-1a digest mislabeled with sha256 prefix',
        hex: hex.toLowerCase(),
        migration_recommendation: `fnv1a32:${hex.toLowerCase()}`
      });
    }
    return deepFreeze({
      schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
      valid: false,
      algorithm: 'sha256',
      hex_length: hex.length,
      reason: `invalid sha256 hex length: ${hex.length} (expected 64)`
    });
  }

  if (trimmed.startsWith('fnv1a32:')) {
    const hex = trimmed.slice(8);
    if (hex.length === 8 && /^[0-9a-fA-F]{8}$/.test(hex)) {
      return deepFreeze({
        schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
        valid: true,
        algorithm: 'fnv1a32',
        hex_length: 8,
        is_historical_mislabeled: false,
        hex: hex.toLowerCase()
      });
    }
    return deepFreeze({
      schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
      valid: false,
      algorithm: 'fnv1a32',
      hex_length: hex.length,
      reason: `invalid fnv1a32 hex length: ${hex.length} (expected 8)`
    });
  }

  if (trimmed.startsWith('fnv32:')) {
    const hex = trimmed.slice(6);
    if (hex.length === 8 && /^[0-9a-fA-F]{8}$/.test(hex)) {
      return deepFreeze({
        schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
        valid: true,
        algorithm: 'fnv32',
        hex_length: 8,
        is_historical_mislabeled: false,
        hex: hex.toLowerCase()
      });
    }
    return deepFreeze({
      schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
      valid: false,
      algorithm: 'fnv32',
      hex_length: hex.length,
      reason: `invalid fnv32 hex length: ${hex.length} (expected 8)`
    });
  }

  return deepFreeze({
    schema: DOLLHOUSE_TYPED_DIGEST_SCHEMA,
    valid: false,
    algorithm: 'unknown',
    reason: 'unrecognized digest prefix (expected sha256:, fnv1a32:, or fnv32:)'
  });
}

/**
 * Computes 32-bit FNV-1a hash over canonical serialized value.
 */
export function computeTypedFnv1a32(value) {
  const s = typeof value === 'string' ? value : stableStringify(value);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, '0');
  return deepFreeze({
    raw_hex: hex,
    typed_digest: `fnv1a32:${hex}`,
    legacy_mislabeled: `sha256:${hex}`
  });
}

/**
 * Audits a Phason custody diff, failing closed against caller-declared string equality.
 */
export function auditPhasonCustodyDiff(previous = {}, current = {}, options = {}) {
  const prevMeta = previous.metadata || previous;
  const currMeta = current.metadata || current;

  const prevDigest = prevMeta.artifact_digest || prevMeta.content_hash || prevMeta.raw_hash || null;
  const currDigest = currMeta.artifact_digest || currMeta.content_hash || currMeta.raw_hash || null;

  const prevPayload = previous.payload ?? previous.text ?? previous.content ?? null;
  const currPayload = current.payload ?? current.text ?? current.content ?? null;

  // Caller-declared string equality hazard detection
  if (prevPayload === null || currPayload === null) {
    return deepFreeze({
      schema: DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
      status: 'HOLD_UNVERIFIED_CALLER_STRING_ASSERTION',
      content_invariant: false,
      unverified_caller_string_equality: true,
      decision: 'unverified-caller-digest-assertion-rejected',
      reason: 'caller-supplied digest equality cannot establish content invariance without payload verification',
      claim_ceiling: 'caller-string-equality-does-not-establish-content-invariance',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const prevClass = classifyTypedDigest(prevDigest);
  const currClass = classifyTypedDigest(currDigest);

  if (options.disallow_mislabeled && (prevClass.is_historical_mislabeled || currClass.is_historical_mislabeled)) {
    return deepFreeze({
      schema: DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
      status: 'HOLD_MISLABELED_HISTORICAL_DIGEST',
      content_invariant: false,
      decision: 'mislabeled-fnv1a32-digest-rejected',
      reason: '32-bit FNV-1a hash must use fnv1a32: prefix in modern custody pipelines',
      claim_ceiling: 'caller-string-equality-does-not-establish-content-invariance',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const prevComputed = computeTypedFnv1a32(prevPayload);
  const currComputed = computeTypedFnv1a32(currPayload);

  // Check if declared matches computed
  const prevMatches = (prevClass.hex === prevComputed.raw_hex);
  const currMatches = (currClass.hex === currComputed.raw_hex);

  if (!prevMatches || !currMatches) {
    return deepFreeze({
      schema: DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
      status: 'HOLD_DIGEST_PAYLOAD_MISMATCH',
      content_invariant: false,
      decision: 'digest-payload-mismatch-rejected',
      reason: 'declared digest does not match computed payload digest',
      claim_ceiling: 'caller-string-equality-does-not-establish-content-invariance',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const hashMatches = prevComputed.raw_hex === currComputed.raw_hex;
  const contentMatches = stableContentEquals(prevPayload, currPayload);

  // Collision detection: short hashes match but typed contents differ
  if (hashMatches && !contentMatches) {
    return deepFreeze({
      schema: DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
      status: 'HOLD_CONTENT_COLLISION_DETECTED',
      content_invariant: false,
      collision_detected: true,
      colliding_hash: prevComputed.raw_hex,
      decision: 'fnv-hash-collision-rejected',
      reason: 'distinct payload contents produced identical short FNV hash; content invariance refused',
      claim_ceiling: 'caller-string-equality-does-not-establish-content-invariance',
      laws: ATLAS_RELATION_CUSTODY_LAWS
    });
  }

  const contentInvariant = hashMatches && contentMatches;

  // Projection comparison
  const prevProj = previous.projection || {};
  const currProj = current.projection || {};
  const projectionChanged = stableStringify(prevProj) !== stableStringify(currProj);

  return deepFreeze({
    schema: DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
    status: (contentInvariant && projectionChanged) ? 'SEAM_DETECTED' : 'OPEN',
    content_invariant: contentInvariant,
    projection_changed: projectionChanged,
    collision_detected: false,
    decision: (contentInvariant && projectionChanged)
      ? 'content-invariant-custody-variable-projection-event'
      : 'custody-diff-recorded-without-external-enforcement',
    verified_algorithm: prevClass.algorithm,
    claim_ceiling: 'phason-custody-diff-not-external-enforcement-or-permission-proof',
    laws: ATLAS_RELATION_CUSTODY_LAWS
  });
}
