import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validAtlasMember,
  classifyAtlasRelationIdentity,
  auditAtlasHolonomyHistoryParity,
  classifyTypedDigest,
  computeTypedFnv1a32,
  auditPhasonCustodyDiff,
  stableContentEquals,
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
  assert.equal(mislabeled.algorithm, 'fnv1a32');
  assert.equal(mislabeled.is_historical_mislabeled, true);
  assert.equal(mislabeled.classification, 'HISTORICAL_FNV1A_LABELED_AS_SHA256');
  assert.equal(mislabeled.migration_recommendation, 'fnv1a32:811c9dc5');

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

  // Case B: Caller provides payloads with verified matching typed digests
  const textPayload = 'td613-reparative-payload-test';
  const computed = computeTypedFnv1a32(textPayload);

  const verifiedDiff = auditPhasonCustodyDiff(
    { artifact_id: 'art-1', payload: textPayload, metadata: { raw_hash: computed.typed_digest } },
    { artifact_id: 'art-2', payload: textPayload, metadata: { raw_hash: computed.typed_digest }, projection: { mode: 'seam' } }
  );
  assert.equal(verifiedDiff.status, 'SEAM_DETECTED');
  assert.equal(verifiedDiff.content_invariant, true);
  assert.equal(verifiedDiff.projection_changed, true);
  assert.equal(verifiedDiff.verified_algorithm, 'fnv1a32');

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
