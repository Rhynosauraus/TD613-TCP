import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validAtlasMember,
  classifyAtlasRelationIdentity,
  auditAtlasHolonomyHistoryParity,
  classifyTypedDigest,
  computeTypedFnv1a32,
  computeTypedFnv32,
  auditPhasonCustodyDiff,
  stableContentEquals,
  canonicalSerialize,
  stableStringify,
  validateStructuredSnapshotDomain,
  SNAPSHOT_DOMAIN_LIMITS,
  DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA,
  DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA,
  DOLLHOUSE_TYPED_DIGEST_SCHEMA,
  DOLLHOUSE_PHASON_CUSTODY_DIFF_SCHEMA,
  ATLAS_RELATION_CUSTODY_LAWS
} from '../app/engine/dollhouse-atlas-relational-custody.js';

import {
  runAtlasAgent
} from '../app/engine/dollhouse-atlas-fadt.js';

import { compileLoomDemoScene } from '../app/dome-world/holonomy-loom/semantic-field.js';

test('validAtlasMember correctly validates Schubert/Delannoy lattice members', () => {
  assert.equal(validAtlasMember({ a: 0, b: 0, s: 0, path: [] }), true);
  assert.equal(validAtlasMember({ a: 1, b: 1, s: 1, path: ['D'] }), true);
  assert.equal(validAtlasMember({ a: 2, b: 1, s: 1, path: ['D', 'E'] }), true);
  assert.equal(validAtlasMember({ a: 1, b: 2, s: 1, path: ['N', 'D'] }), true);

  // Invalid: s > min(a,b)
  assert.equal(validAtlasMember({ a: 1, b: 0, s: 1, path: ['D'] }), false);
  // Invalid: counts do not match declared a, b, s
  assert.equal(validAtlasMember({ a: 1, b: 1, s: 0, path: ['D'] }), false);
  // Invalid: negative or non-integer
  assert.equal(validAtlasMember({ a: -1, b: 0, s: 0, path: [] }), false);
  assert.equal(validAtlasMember({ a: 1.5, b: 0, s: 0, path: [] }), false);
  // Invalid: bad step character
  assert.equal(validAtlasMember({ a: 1, b: 0, s: 0, path: ['X'] }), false);
});

test('Atlas PR #984 relation identity classifies all 5 concrete classes without collapsing member custody', () => {
  // 1. FIXED_SELF: Palindromic member paired with itself
  const fixed = { a: 1, b: 1, s: 1, path: ['D'] };
  const fixedRel = classifyAtlasRelationIdentity(fixed, fixed);
  assert.equal(fixedRel.schema, DOLLHOUSE_ATLAS_RELATION_IDENTITY_SCHEMA);
  assert.equal(fixedRel.relation, 'FIXED_SELF');
  assert.equal(fixedRel.shared_orbit, true);
  assert.equal(fixedRel.held, false);
  assert.deepEqual(fixedRel.left_custody.path, ['D']);
  assert.deepEqual(fixedRel.right_custody.path, ['D']);

  // 2. EXACT_IDENTITY: Non-palindromic member paired with itself
  const nonPal = { a: 1, b: 1, s: 0, path: ['E', 'N'] };
  const exactRel = classifyAtlasRelationIdentity(nonPal, nonPal);
  assert.equal(exactRel.relation, 'EXACT_IDENTITY');
  assert.equal(exactRel.shared_orbit, true);
  assert.equal(exactRel.left_is_palindrome, false);

  // 3. MIRROR_MATES: Member paired with its reversed-path mate
  const mirrorMate = { a: 1, b: 1, s: 0, path: ['N', 'E'] };
  const mirrorRel = classifyAtlasRelationIdentity(nonPal, mirrorMate);
  assert.equal(mirrorRel.relation, 'MIRROR_MATES');
  assert.equal(mirrorRel.shared_orbit, true);

  // CRITICAL INVARIANT: Orbit representatives never replace concrete members!
  assert.deepEqual(mirrorRel.left_custody.path, ['E', 'N']);
  assert.deepEqual(mirrorRel.right_custody.path, ['N', 'E']);
  assert.notDeepEqual(mirrorRel.left_custody.path, mirrorRel.right_custody.path);
  assert.equal(mirrorRel.laws.orbit_representatives_never_replace_concrete_members, true);
  assert.equal(mirrorRel.laws.concrete_member_custody_retained, true);

  // 4. DISTINCT_SAME_SLICE: Distinct non-mirror members in same chamber
  // Chamber (a=2, b=1, s=0) paths: ['E','E','N'], ['E','N','E'], ['N','E','E']
  // ['E','E','N'] reversed is ['N','E','E']. So ['E','N','E'] vs ['E','E','N'] are DISTINCT_SAME_SLICE.
  const path1 = { a: 2, b: 1, s: 0, path: ['E', 'E', 'N'] };
  const path2 = { a: 2, b: 1, s: 0, path: ['E', 'N', 'E'] };
  const sameSliceRel = classifyAtlasRelationIdentity(path1, path2);
  assert.equal(sameSliceRel.relation, 'DISTINCT_SAME_SLICE');
  assert.equal(sameSliceRel.shared_orbit, false);
  assert.deepEqual(sameSliceRel.left_custody.path, ['E', 'E', 'N']);
  assert.deepEqual(sameSliceRel.right_custody.path, ['E', 'N', 'E']);

  // 5. CROSS_SLICE_DISTINCT: Members from different slices
  const sliceA = { a: 1, b: 0, s: 0, path: ['E'] };
  const sliceB = { a: 0, b: 1, s: 0, path: ['N'] };
  const crossRel = classifyAtlasRelationIdentity(sliceA, sliceB);
  assert.equal(crossRel.relation, 'CROSS_SLICE_DISTINCT');
  assert.equal(crossRel.shared_orbit, false);

  // 6. HELD_INVALID_DECLARATION: Malformed member declaration fails closed
  const bad = { a: 1, b: 0, s: 0, path: ['INVALID'] };
  const heldRel = classifyAtlasRelationIdentity(sliceA, bad);
  assert.equal(heldRel.relation, 'HELD_INVALID_DECLARATION');
  assert.equal(heldRel.held, true);
});

test('Atlas Holonomy History Parity enforces: same endpoint does not erase route history', () => {
  const endpoint = 'returned-practice-capsule';

  // Identical endpoints, identical winding histories => PASS
  const passAudit = auditAtlasHolonomyHistoryParity(
    { endpoint, winding_number: 0 },
    { endpoint, winding_number: 0 }
  );
  assert.equal(passAudit.schema, DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA);
  assert.equal(passAudit.endpoints_equal, true);
  assert.equal(passAudit.history_parity_equal, true);
  assert.equal(passAudit.disposition, 'PASS');

  // Identical endpoints, distinct loop powers / winding numbers (e.g. 0 loops vs 2 loops)
  // Under an order-2 holonomy, endpoint state is identical, but winding history differs!
  const heldAudit = auditAtlasHolonomyHistoryParity(
    { endpoint, winding_number: 0 },
    { endpoint, winding_number: 2 }
  );
  assert.equal(heldAudit.endpoints_equal, true);
  assert.equal(heldAudit.history_parity_equal, false);
  assert.equal(heldAudit.winding_delta, -2);
  assert.equal(heldAudit.modulo_2_parity_equal, true); // Same parity mod 2, but distinct winding!
  assert.equal(heldAudit.disposition, 'HOLD_DISTINCT_HISTORY_NOT_ERASED');
  assert.match(heldAudit.reason, /equal endpoints do not erase distinct winding histories/);

  // Distinct endpoints
  const distinctAudit = auditAtlasHolonomyHistoryParity(
    { endpoint: 'chamber-alpha', winding_number: 1 },
    { endpoint: 'chamber-beta', winding_number: 1 }
  );
  assert.equal(distinctAudit.endpoints_equal, false);
  assert.equal(distinctAudit.disposition, 'DISTINCT_ENDPOINTS');
});

test('classifyTypedDigest correctly identifies valid sha256, valid fnv1a32, and historical mislabeling', () => {
  // Valid SHA-256 (64 hex characters)
  const validSha = classifyTypedDigest(`sha256:${'a'.repeat(64)}`);
  assert.equal(validSha.valid, true);
  assert.equal(validSha.algorithm, 'sha256');
  assert.equal(validSha.hex_length, 64);
  assert.equal(validSha.is_historical_mislabeled, false);

  // Valid FNV-1a32 (8 hex characters with fnv1a32: prefix)
  const validFnv = classifyTypedDigest('fnv1a32:811c9dc5');
  assert.equal(validFnv.valid, true);
  assert.equal(validFnv.algorithm, 'fnv1a32');
  assert.equal(validFnv.hex_length, 8);
  assert.equal(validFnv.is_historical_mislabeled, false);

  // R1 Defect: 32-bit FNV-1a hash mislabeled with sha256: prefix (8 hex characters)
  const mislabeled = classifyTypedDigest('sha256:811c9dc5');
  assert.equal(mislabeled.valid, false);
  assert.equal(mislabeled.algorithm, 'fnv32');
  assert.equal(mislabeled.is_historical_mislabeled, true);
  assert.equal(mislabeled.classification, 'HISTORICAL_FNV1A_LABELED_AS_SHA256');
  assert.equal(mislabeled.migration_recommendation, 'fnv32:811c9dc5');

  // Corrupted / invalid digests
  assert.equal(classifyTypedDigest('sha256:too-short').valid, false);
  assert.equal(classifyTypedDigest('md5:deadbeef').valid, false);
  assert.equal(classifyTypedDigest('').valid, false);
});

test('auditPhasonCustodyDiff rejects unverified caller-declared string equality', () => {
  // Case A: Caller provides matching content_hash strings WITHOUT payloads
  // NAIVE IMPLEMENTATION WOULD ASSERT content_invariant = true!
  // Governed implementation must HOLD against unverified string assertion.
  const callerDeclaredWithoutPayload = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', metadata: { content_hash: 'sha256:811c9dc5' } },
    { artifact_id: 'art-2', metadata: { content_hash: 'sha256:811c9dc5' }, projection: { mode: 'seam' } }
  );
  assert.equal(callerDeclaredWithoutPayload.status, 'HOLD_UNVERIFIED_CALLER_STRING_ASSERTION');
  assert.equal(callerDeclaredWithoutPayload.content_invariant, false);
  assert.equal(callerDeclaredWithoutPayload.unverified_caller_string_equality, true);
  assert.match(callerDeclaredWithoutPayload.reason, /caller-supplied digest equality cannot establish content invariance/);

  // Case B: Caller provides payloads with verified matching typed digests (canonical fnv32: emission)
  const textPayload = 'td613-reparative-payload-test';
  const computed = computeTypedFnv1a32(textPayload);

  const verifiedDiff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload: textPayload, metadata: { raw_hash: computed.typed_digest } },
    { artifact_id: 'art-2', payload: textPayload, metadata: { raw_hash: computed.typed_digest }, projection: { mode: 'seam' } }
  );
  assert.equal(verifiedDiff.status, 'SEAM_DETECTED');
  assert.equal(verifiedDiff.content_invariant, true);
  assert.equal(verifiedDiff.projection_changed, true);
  assert.equal(verifiedDiff.verified_algorithm, 'fnv32');

  // Case B2: Compatibility alias fnv1a32: is also accepted
  const compatDiff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload: textPayload, metadata: { raw_hash: computed.compatibility_alias } },
    { artifact_id: 'art-2', payload: textPayload, metadata: { raw_hash: computed.compatibility_alias }, projection: { mode: 'seam' } }
  );
  assert.equal(compatDiff.status, 'SEAM_DETECTED');
  assert.equal(compatDiff.content_invariant, true);
  assert.equal(compatDiff.verified_algorithm, 'fnv1a32');

  // Case C: Mislabeled legacy hash is rejected under strict modern posture
  const strictDisallowMislabeled = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload: textPayload, metadata: { raw_hash: computed.legacy_mislabeled } },
    { artifact_id: 'art-2', payload: textPayload, metadata: { raw_hash: computed.legacy_mislabeled }, projection: { mode: 'seam' } },
    { disallow_mislabeled: true }
  );
  assert.equal(strictDisallowMislabeled.status, 'HOLD_MISLABELED_HISTORICAL_DIGEST');
  assert.equal(strictDisallowMislabeled.content_invariant, false);
});

test('runAtlasAgent integrates relational custody and history parity audits when provided', () => {
  const origin = compileLoomDemoScene(3, { sourceRevision: '8da9705285c90366ff5d67a12472e0ca05d76e79' });

  const atlas_relation = {
    left: { a: 1, b: 1, s: 0, path: ['E', 'N'] },
    right: { a: 1, b: 1, s: 0, path: ['N', 'E'] }
  };
  const history_parity = {
    trajectory_a: { endpoint: 'chamber-1', winding_number: 0 },
    trajectory_b: { endpoint: 'chamber-1', winding_number: 1 }
  };

  const receipt = runAtlasAgent(origin, { atlas_relation, history_parity });
  assert.equal(receipt.schema, 'td613.dollhouse.atlas-agent/v0.1');
  assert.equal(receipt.audit.verdict, 'PASS');

  // Verify relational custody finding
  assert.ok(receipt.relation_identity_custody !== null);
  assert.equal(receipt.relation_identity_custody.relation, 'MIRROR_MATES');
  assert.equal(receipt.relation_identity_custody.shared_orbit, true);
  assert.deepEqual(receipt.relation_identity_custody.left_custody.path, ['E', 'N']);
  assert.deepEqual(receipt.relation_identity_custody.right_custody.path, ['N', 'E']);

  // Verify history parity finding
  assert.ok(receipt.history_parity_audit !== null);
  assert.equal(receipt.history_parity_audit.endpoints_equal, true);
  assert.equal(receipt.history_parity_audit.history_parity_equal, false);
  assert.equal(receipt.history_parity_audit.disposition, 'HOLD_DISTINCT_HISTORY_NOT_ERASED');
});

test('T-DIGEST-01: FNV-1a32 collision pair ("costarring" vs "liquid") triggers HOLD_CONTENT_COLLISION_DETECTED', () => {
  const left = 'costarring';
  const right = 'liquid';
  const leftComputed = computeTypedFnv1a32(left);
  const rightComputed = computeTypedFnv1a32(right);

  // Both strings hash to 5e4daa9d in 32-bit FNV-1a
  assert.equal(leftComputed.raw_hex, '5e4daa9d');
  assert.equal(rightComputed.raw_hex, '5e4daa9d');
  assert.equal(leftComputed.typed_digest, rightComputed.typed_digest);

  const diff = auditPhasonCustodyDiff(
    { artifact_id: 'art-left', payload: left, metadata: { raw_hash: leftComputed.typed_digest } },
    { artifact_id: 'art-right', payload: right, metadata: { raw_hash: rightComputed.typed_digest }, projection: { mode: 'seam' } }
  );

  assert.equal(diff.status, 'HOLD_CONTENT_COLLISION_DETECTED');
  assert.equal(diff.content_invariant, false);
  assert.equal(diff.collision_detected, true);
  assert.equal(diff.colliding_hash, '5e4daa9d');
  assert.match(diff.reason, /identical short FNV hash/);
});

test('T-DIGEST-02: classifyTypedDigest correctly recognizes fnv32: prefix', () => {
  const result = classifyTypedDigest('fnv32:811c9dc5');
  assert.equal(result.valid, true);
  assert.equal(result.algorithm, 'fnv32');
  assert.equal(result.hex_length, 8);
  assert.equal(result.is_historical_mislabeled, false);
});

test('T-DIGEST-03: stableContentEquals distinguishes object from JSON string', () => {
  assert.equal(stableContentEquals({ a: 1 }, '{"a":1}'), false);
  assert.equal(stableContentEquals('{"a":1}', { a: 1 }), false);
  assert.equal(stableContentEquals({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(stableContentEquals('plain string', 'plain string'), true);
  assert.equal(stableContentEquals('left', 'right'), false);
});

test('T-HISTORY-01: auditAtlasHolonomyHistoryParity fails closed when endpoints or windings are missing', () => {
  const missingEndpoint = auditAtlasHolonomyHistoryParity({}, {});
  assert.equal(missingEndpoint.disposition, 'HOLD_MISSING_EXPLICIT_ENDPOINT');
  assert.equal(missingEndpoint.held, true);

  const missingWinding = auditAtlasHolonomyHistoryParity(
    { endpoint: 'chamber-1' },
    { endpoint: 'chamber-1' }
  );
  assert.equal(missingWinding.disposition, 'HOLD_MISSING_EXPLICIT_WINDING');
  assert.equal(missingWinding.held, true);
});

// =========================================================================
// REQUIREMENT 1 ADVERSARIAL TESTS: Structured Snapshot Domain Hardening
// =========================================================================

test('T-STRUCT-01: Counterexample 1 - {x: NaN} vs {x: null} rejects false equality', () => {
  // Unrepaired serializers coerce NaN to null in JSON.stringify, creating a false match.
  // Repaired domain validator must reject NaN as an out-of-domain non-finite number.
  const nanInput = { x: NaN };
  const nullInput = { x: null };

  const check = validateStructuredSnapshotDomain(nanInput);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Non-finite number \(NaN\) is out of snapshot domain/);

  assert.equal(stableContentEquals(nanInput, nullInput), false);
  assert.equal(stableContentEquals(nullInput, nanInput), false);
  assert.throws(() => canonicalSerialize(nanInput), /Cannot canonically serialize out-of-domain snapshot/);
});

test('T-STRUCT-02: Counterexample 2 - [undefined] vs [] rejects false equality', () => {
  // Unrepaired serializers map undefined to null or omit it, creating a false match.
  // Repaired domain validator must strictly reject undefined values.
  const undefArray = [undefined];
  const emptyArray = [];

  const check = validateStructuredSnapshotDomain(undefArray);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Undefined values are out of snapshot domain/);

  assert.equal(stableContentEquals(undefArray, emptyArray), false);
  assert.equal(stableContentEquals(emptyArray, undefArray), false);
  assert.throws(() => canonicalSerialize(undefArray), /Undefined values are out of snapshot domain/);
});

test('T-STRUCT-03: Counterexample 3 - sparse one-slot array vs [] rejects false equality', () => {
  // Unrepaired serializers skip unallocated slots in sparse arrays, creating a false match.
  // Repaired domain validator must detect missing own properties along array length.
  const sparseArray = new Array(1); // Length 1, slot 0 unallocated
  const emptyArray = [];

  const check = validateStructuredSnapshotDomain(sparseArray);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Sparse array detected at index 0/);

  assert.equal(stableContentEquals(sparseArray, emptyArray), false);
  assert.equal(stableContentEquals(emptyArray, sparseArray), false);
  assert.throws(() => canonicalSerialize(sparseArray), /Sparse array detected at index 0/);
});

test('T-STRUCT-04: Property accessors (getters) are detected and rejected without executing getter code', () => {
  let getterExecuted = false;
  const trapObject = {
    get dangerous() {
      getterExecuted = true;
      return 'exploit';
    }
  };

  const check = validateStructuredSnapshotDomain(trapObject);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Property accessor \(getter\/setter\) detected on key "dangerous"/);
  assert.equal(getterExecuted, false, 'Accessor getter must NEVER be executed during domain inspection');
  assert.equal(stableContentEquals(trapObject, { dangerous: 'exploit' }), false);
});

test('T-STRUCT-05: Circular references (cycles) are rejected fail-closed without recursion crash', () => {
  const circularA = { id: 'cycle-1' };
  circularA.self = circularA;

  const circularB = { id: 'cycle-2' };
  circularB.self = circularB;

  const check = validateStructuredSnapshotDomain(circularA);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Circular references \(cycles\) are out of snapshot domain/);
  assert.equal(stableContentEquals(circularA, circularB), false);
  assert.throws(() => canonicalSerialize(circularA), /Circular references \(cycles\) are out of snapshot domain/);
});

test('T-STRUCT-06: Exotic prototypes and non-plain objects are rejected fail-closed', () => {
  const dateObj = { date: new Date() };
  const mapObj = { map: new Map() };
  const regObj = { reg: /pattern/ };

  assert.equal(validateStructuredSnapshotDomain(dateObj).valid, false);
  assert.equal(validateStructuredSnapshotDomain(mapObj).valid, false);
  assert.equal(validateStructuredSnapshotDomain(regObj).valid, false);

  assert.equal(stableContentEquals(dateObj, { date: {} }), false);
});

test('T-STRUCT-07: Out-of-domain payloads trigger HOLD_INVALID_STRUCTURED_PAYLOAD_DOMAIN in auditPhasonCustodyDiff', () => {
  const badPayload = { x: NaN };
  const goodPayload = { x: 1 };
  const computedGood = computeTypedFnv1a32(goodPayload);

  const diff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload: badPayload, metadata: { raw_hash: computedGood.typed_digest } },
    { artifact_id: 'art-2', payload: goodPayload, metadata: { raw_hash: computedGood.typed_digest }, projection: { mode: 'seam' } }
  );

  assert.equal(diff.status, 'HOLD_INVALID_STRUCTURED_PAYLOAD_DOMAIN');
  assert.equal(diff.content_invariant, false);
  assert.equal(diff.invalid_snapshot_domain, true);
  assert.match(diff.reason, /payload rejected by structured snapshot validator/);
});

// =========================================================================
// REQUIREMENT 2 CROSS-INSTRUMENT TESTS: Digest Emission & Classification
// =========================================================================

test('T-CROSS-01: Modern canonical short-hash emission standard is fnv32: across instruments', () => {
  const text = 'dome-world-weather-seed-alpha';
  const computed = computeTypedFnv1a32(text);

  // Canonical modern emission uses fnv32: prefix aligned with Dome-World runtime
  assert.match(computed.canonical_digest, /^fnv32:[0-9a-f]{8}$/);
  assert.equal(computed.typed_digest, computed.canonical_digest);
  assert.equal(computed.compatibility_alias, `fnv1a32:${computed.raw_hex}`);
  assert.equal(computed.legacy_mislabeled, `sha256:${computed.raw_hex}`);

  // Alias computeTypedFnv32 behaves identically
  const computedAlias = computeTypedFnv32(text);
  assert.equal(computedAlias.canonical_digest, computed.canonical_digest);
});

test('T-CROSS-02: Actual Dome-World weather digest fnv32:811c9dc5 is recognized by Atlas as canonical', () => {
  const domeDigest = 'fnv32:811c9dc5';
  const classified = classifyTypedDigest(domeDigest);

  assert.equal(classified.valid, true);
  assert.equal(classified.algorithm, 'fnv32');
  assert.equal(classified.is_canonical, true);
  assert.equal(classified.canonical_form, 'fnv32:811c9dc5');
  assert.equal(classified.is_historical_mislabeled, false);
  assert.equal(classified.hex, '811c9dc5');
});

test('T-CROSS-03: Compatibility alias fnv1a32:811c9dc5 is recognized and mapped to canonical form', () => {
  const compatDigest = 'fnv1a32:811c9dc5';
  const classified = classifyTypedDigest(compatDigest);

  assert.equal(classified.valid, true);
  assert.equal(classified.algorithm, 'fnv1a32');
  assert.equal(classified.is_canonical, false);
  assert.equal(classified.canonical_form, 'fnv32:811c9dc5');
  assert.equal(classified.hex, '811c9dc5');
});

test('T-CROSS-04: Cross-instrument Phason custody diff verifies invariance between fnv32: and fnv1a32: under identical payload', () => {
  const payload = { weather_phase: 'cyclonic', fold: 4 };
  const computed = computeTypedFnv1a32(payload);

  // Left artifact carries modern Dome-World fnv32: digest
  // Right artifact carries compatibility fnv1a32: digest
  const diff = auditPhasonCustodyDiff(
    { artifact_id: 'dome-art', payload, metadata: { raw_hash: computed.canonical_digest } },
    { artifact_id: 'atlas-art', payload, metadata: { raw_hash: computed.compatibility_alias }, projection: { mode: 'seam' } }
  );

  assert.equal(diff.status, 'SEAM_DETECTED');
  assert.equal(diff.content_invariant, true);
  assert.equal(diff.projection_changed, true);
  assert.equal(diff.collision_detected, false);
});

// =========================================================================
// REQUIREMENT A & B ADVERSARIAL TESTS: Typed Collision Prevention & Safe Fallback
// =========================================================================

test('T-STRUCT-08: Negative fixture - {x: Uint8Array([1])} vs {x: {$bytes: "01"}} are distinct and do not collide', () => {
  const A = { x: new Uint8Array([1]) };
  const B = { x: { $bytes: '01' } };

  const serA = canonicalSerialize(A);
  const serB = canonicalSerialize(B);

  // Serialized forms must be distinct under versioned injective encoding
  assert.notEqual(serA, serB);
  assert.equal(serA, 'v1:o:{"x":u:01}');
  assert.equal(serB, 'v1:o:{"x":o:{"$bytes":s:"01"}}');

  // Typed content equality must evaluate to false
  assert.equal(stableContentEquals(A, B), false);
  assert.equal(stableContentEquals(B, A), false);

  // Hashes must be distinct
  const hashA = computeTypedFnv1a32(A);
  const hashB = computeTypedFnv1a32(B);
  assert.notEqual(hashA.typed_digest, hashB.typed_digest);
});

test('T-STRUCT-09: Extra non-index array properties are rejected fail-closed', () => {
  const arr = [1, 2];
  arr.extra = 'malicious';

  const check = validateStructuredSnapshotDomain(arr);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Extra non-index array property detected/);

  assert.throws(
    () => canonicalSerialize(arr),
    /Extra non-index array property detected/
  );
  assert.equal(stableContentEquals(arr, [1, 2]), false);
});

test('T-STRUCT-10: Bounded binary input length rejects oversized Uint8Array instances', () => {
  // Uint8Array exceeding SNAPSHOT_DOMAIN_LIMITS.MAX_BINARY_LENGTH must fail closed
  const oversized = new Uint8Array(SNAPSHOT_DOMAIN_LIMITS.MAX_BINARY_LENGTH + 1);
  const check = validateStructuredSnapshotDomain(oversized);

  assert.equal(check.valid, false);
  assert.match(check.reason, /Binary length exceeded limit/);

  assert.throws(
    () => canonicalSerialize(oversized),
    /Binary length exceeded limit/
  );
});

test('T-STRUCT-11: Extra properties on Uint8Array are rejected fail-closed', () => {
  const u = new Uint8Array([1, 2, 3]);
  u.tampered = 'payload';

  const check = validateStructuredSnapshotDomain(u);
  assert.equal(check.valid, false);
  assert.match(check.reason, /Extra property detected on Uint8Array/);

  assert.throws(
    () => canonicalSerialize(u),
    /Extra property detected on Uint8Array/
  );
});

test('T-STRUCT-12: Nested structures with typed binary, arrays, and objects serialize injectively', () => {
  const nested = {
    header: { version: 1, flag: true },
    data: new Uint8Array([10, 11]),
    records: [
      { id: 'rec-1', count: 0 },
      { id: 'rec-2', payload: null }
    ]
  };

  const serialized = canonicalSerialize(nested);
  assert.equal(
    serialized,
    'v1:o:{"data":u:0a0b,"header":o:{"flag":b:1,"version":n:1},"records":a:[o:{"count":n:0,"id":s:"rec-1"},o:{"id":s:"rec-2","payload":z}]}'
  );

  // Equal cloned object must produce exact same serialization
  const clone = {
    records: [
      { id: 'rec-1', count: 0 },
      { id: 'rec-2', payload: null }
    ],
    data: new Uint8Array([10, 11]),
    header: { flag: true, version: 1 }
  };
  assert.equal(canonicalSerialize(clone), serialized);
  assert.equal(stableContentEquals(nested, clone), true);
});

test('T-STRUCT-13: stableStringify throws on invalid input without falling back to JSON.stringify or executing getters', () => {
  let getterExecuted = false;
  const trapObject = {
    get evil() {
      getterExecuted = true;
      return 'pwned';
    }
  };

  // stableStringify must throw TypeError and NEVER call JSON.stringify fallback
  assert.throws(
    () => stableStringify(trapObject),
    /Property accessor \(getter\/setter\) detected/
  );
  assert.equal(getterExecuted, false, 'Accessor getter must NEVER be executed by stableStringify');
});

test('T-STRUCT-14: Hostile projection object with getter triggers HOLD_INVALID_PROJECTION_DOMAIN without executing getter', () => {
  let getterExecuted = false;
  const hostileProjection = {
    get injected() {
      getterExecuted = true;
      return 'exploit';
    }
  };

  const payload = 'canonical-verified-payload';
  const computed = computeTypedFnv1a32(payload);

  const diff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload, metadata: { raw_hash: computed.canonical_digest }, projection: hostileProjection },
    { artifact_id: 'art-2', payload, metadata: { raw_hash: computed.canonical_digest }, projection: { mode: 'normal' } }
  );

  assert.equal(diff.status, 'HOLD_INVALID_PROJECTION_DOMAIN');
  assert.equal(diff.content_invariant, true);
  assert.equal(diff.projection_changed, false);
  assert.equal(diff.invalid_projection_domain, true);
  assert.equal(getterExecuted, false, 'Hostile getter in projection must NEVER be executed');
  assert.match(diff.reason, /projection rejected by structured snapshot validator/);
});

test('T-STRUCT-15: Projection with out-of-domain {x: NaN} vs {x: null} triggers HOLD_INVALID_PROJECTION_DOMAIN', () => {
  const payload = 'canonical-verified-payload';
  const computed = computeTypedFnv1a32(payload);

  const diff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload, metadata: { raw_hash: computed.canonical_digest }, projection: { x: NaN } },
    { artifact_id: 'art-2', payload, metadata: { raw_hash: computed.canonical_digest }, projection: { x: null } }
  );

  assert.equal(diff.status, 'HOLD_INVALID_PROJECTION_DOMAIN');
  assert.equal(diff.invalid_projection_domain, true);
  assert.equal(diff.projection_changed, false);
  assert.match(diff.reason, /Non-finite number \(NaN\) is out of snapshot domain/);
});
