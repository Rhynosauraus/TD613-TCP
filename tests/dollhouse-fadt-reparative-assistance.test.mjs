import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeFadtFiberBounds,
  evaluateFadtCoordinateRecovery,
  evaluateFadtDiscrepancyIdentity,
  compileFadtReparativePacket,
  DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA,
  DOLLHOUSE_FADT_DISCREPANCY_IDENTITY_SCHEMA,
  FADT_REPARATIVE_LAWS
} from '../app/engine/dollhouse-fadt-reparative-assistance.js';

import {
  runFadtAgent
} from '../app/engine/dollhouse-atlas-fadt.js';

test('computeFadtFiberBounds accurately computes union, intersection, and irreducible gap', () => {
  // Case A: Exact fiber (constant support)
  const exactRows = [
    { id: 'ant-1', support: ['VIEW_AUDIT', 'EXPORT_RECEIPT'] },
    { id: 'ant-2', support: ['VIEW_AUDIT', 'EXPORT_RECEIPT'] }
  ];
  const exactBounds = computeFadtFiberBounds(exactRows);
  assert.equal(exactBounds.exact_descent_exists, true);
  assert.equal(exactBounds.irreducible_gap_cardinality, 0);
  assert.deepEqual(exactBounds.intersection_support, ['EXPORT_RECEIPT', 'VIEW_AUDIT']);
  assert.deepEqual(exactBounds.union_support, ['EXPORT_RECEIPT', 'VIEW_AUDIT']);
  assert.equal(exactBounds.disposition, 'EXACT_DESCENT');

  // Case B: Colliding fiber with non-empty intersection
  const collidingRows = [
    { id: 'ant-1', support: ['REST', 'VENT'] },
    { id: 'ant-2', support: ['VENT', 'COMPOST'] }
  ];
  const collidingBounds = computeFadtFiberBounds(collidingRows);
  assert.equal(collidingBounds.exact_descent_exists, false);
  assert.deepEqual(collidingBounds.intersection_support, ['VENT']);
  assert.deepEqual(collidingBounds.union_support, ['COMPOST', 'REST', 'VENT']);
  assert.deepEqual(collidingBounds.irreducible_gap, ['COMPOST', 'REST']);
  assert.equal(collidingBounds.irreducible_gap_cardinality, 2);
  assert.equal(collidingBounds.universally_sound_available, true);
  assert.equal(collidingBounds.disposition, 'HOLD_IRREDUCIBLE_GAP');

  // Case C: Disjoint support (empty intersection)
  const disjointRows = [
    { id: 'ant-1', support: ['ACTION_A'] },
    { id: 'ant-2', support: ['ACTION_B'] }
  ];
  const disjointBounds = computeFadtFiberBounds(disjointRows);
  assert.equal(disjointBounds.intersection_cardinality, 0);
  assert.equal(disjointBounds.universally_sound_available, false);
  assert.equal(disjointBounds.irreducible_gap_cardinality, 2);
});

test('Counterexample 2: evaluateFadtCoordinateRecovery resolves XOR non-submodular coordinate interaction', () => {
  // 4 antecedents where support depends on XOR of c1 and c2:
  // c1=0, c2=0 => ['LAW_A']
  // c1=0, c2=1 => ['LAW_B']
  // c1=1, c2=0 => ['LAW_B']
  // c1=1, c2=1 => ['LAW_A']
  // uninformative coordinate has same value everywhere
  const xorRows = [
    { id: 'x00', coordinates: { c1: 0, c2: 0, uninformative: 'ambient' }, support: ['LAW_A'] },
    { id: 'x01', coordinates: { c1: 0, c2: 1, uninformative: 'ambient' }, support: ['LAW_B'] },
    { id: 'x10', coordinates: { c1: 1, c2: 0, uninformative: 'ambient' }, support: ['LAW_B'] },
    { id: 'x11', coordinates: { c1: 1, c2: 1, uninformative: 'ambient' }, support: ['LAW_A'] }
  ];

  const candidateCoordinates = ['c1', 'c2', 'uninformative'];
  const recovery = evaluateFadtCoordinateRecovery(xorRows, candidateCoordinates);

  assert.equal(recovery.schema, DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA);
  assert.equal(recovery.status, 'RESTORING_COORDINATE_EXTENSION_FOUND');
  assert.equal(recovery.best_extension_size, 2);

  // Neither c1 nor c2 alone can resolve the gap because each subfiber contains both LAW_A and LAW_B!
  assert.ok(!recovery.minimal_resolving_sets.some(s => s.length === 1 && (s[0] === 'c1' || s[0] === 'c2')));

  // The minimal resolving set MUST be the joint pair ['c1', 'c2']!
  const best = [...recovery.best_extension].sort();
  assert.deepEqual(best, ['c1', 'c2']);
  assert.equal(recovery.laws.exact_finite_admissibility_descent, true);
});

test('evaluateFadtDiscrepancyIdentity proves: |A \\ I| + |U \\ A| = |Gamma| + |A \\ U| + |I \\ A|', () => {
  const fiberRows = [
    { id: 'state-1', support: ['VIEW', 'EDIT'] },
    { id: 'state-2', support: ['VIEW', 'AUDIT'] }
  ];
  // I = ['VIEW'], U = ['AUDIT', 'EDIT', 'VIEW'], Gamma = ['AUDIT', 'EDIT'] (|Gamma| = 2)

  // 1. Candidate rule A = I = ['VIEW'] (largest universally sound support)
  const soundAudit = evaluateFadtDiscrepancyIdentity(['VIEW'], fiberRows);
  assert.equal(soundAudit.schema, DOLLHOUSE_FADT_DISCREPANCY_IDENTITY_SCHEMA);
  assert.equal(soundAudit.identity_verified, true);
  assert.equal(soundAudit.false_admission_cardinality, 0); // A \ I = empty
  assert.equal(soundAudit.omission_cardinality, 2);        // U \ A = ['AUDIT', 'EDIT']
  assert.equal(soundAudit.discrepancy_score, 2);          // score = 0 + 2 = 2
  assert.equal(soundAudit.exact_gap_identity_rhs, 2);     // |Gamma| (2) + 0 + 0 = 2
  assert.equal(soundAudit.achieves_gap_lower_bound, true);
  assert.equal(soundAudit.universally_sound, true);
  assert.equal(soundAudit.disposition, 'ACCEPT_UNIVERSALLY_SOUND');

  // 2. Candidate rule A = U = ['AUDIT', 'EDIT', 'VIEW'] (complete support)
  const completeAudit = evaluateFadtDiscrepancyIdentity(['AUDIT', 'EDIT', 'VIEW'], fiberRows);
  assert.equal(completeAudit.identity_verified, true);
  assert.equal(completeAudit.false_admission_cardinality, 2); // A \ I = ['AUDIT', 'EDIT']
  assert.equal(completeAudit.omission_cardinality, 0);        // U \ A = empty
  assert.equal(completeAudit.discrepancy_score, 2);          // score = 2 + 0 = 2
  assert.equal(completeAudit.exact_gap_identity_rhs, 2);     // |Gamma| (2) + 0 + 0 = 2
  assert.equal(completeAudit.achieves_gap_lower_bound, true);
  assert.equal(completeAudit.universally_complete, true);
  assert.equal(completeAudit.disposition, 'PROPOSE_SOUND_SUBSET_INSTEAD');

  // 3. Unlawful Widening: Candidate rule A includes action outside U (e.g. 'FORBIDDEN_MUTATE')
  const wideningAudit = evaluateFadtDiscrepancyIdentity(['VIEW', 'FORBIDDEN_MUTATE'], fiberRows);
  assert.equal(wideningAudit.identity_verified, true);
  assert.equal(wideningAudit.unlawful_widening, true);
  assert.deepEqual(wideningAudit.outside_union, ['FORBIDDEN_MUTATE']);
  assert.equal(wideningAudit.outside_union_cardinality, 1);
  assert.equal(wideningAudit.discrepancy_score, 3);          // false_admissions (1) + omissions (2) = 3
  assert.equal(wideningAudit.exact_gap_identity_rhs, 3);     // |Gamma| (2) + |A \ U| (1) + |I \ A| (0) = 3
  assert.equal(wideningAudit.disposition, 'REJECT_UNLAWFUL_WIDENING');
  assert.match(wideningAudit.recommendation, /REJECT_CANDIDATE_CONTAINS_ACTIONS_NEVER_LAWFUL/);

  // 4. Suboptimal sound restriction: Candidate A is empty (omits VIEW)
  const emptyAudit = evaluateFadtDiscrepancyIdentity([], fiberRows);
  assert.equal(emptyAudit.identity_verified, true);
  assert.equal(emptyAudit.omitted_intersection_cardinality, 1); // VIEW omitted
  assert.equal(emptyAudit.discrepancy_score, 3);                // false_admissions (0) + omissions (3) = 3
  assert.equal(emptyAudit.exact_gap_identity_rhs, 3);           // |Gamma| (2) + |A \ U| (0) + |I \ A| (1) = 3
  assert.equal(emptyAudit.achieves_gap_lower_bound, false);
});

test('compileFadtReparativePacket provides child-legible operator guidance', () => {
  const packet = compileFadtReparativePacket({
    fiber_rows: [
      { id: 'state-1', coordinates: { room: 'atrium', phase: 'A' }, support: ['REST', 'VENT'] },
      { id: 'state-2', coordinates: { room: 'atrium', phase: 'B' }, support: ['VENT', 'COMPOST'] }
    ],
    candidate_coordinates: ['phase', 'room'],
    candidate_rule: ['VENT']
  });

  assert.equal(packet.schema, DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA);
  assert.equal(packet.status, 'REPARATIVE_ASSISTANCE_ACTIVE');
  assert.deepEqual(packet.immediate_sound_action_support, ['VENT']);
  assert.deepEqual(packet.coordinate_recovery.best_extension, ['phase']);
  assert.equal(packet.discrepancy_audit.universally_sound, true);
  assert.match(packet.operator_guidance, /The following actions remain supported across the declared occupied fibre, conditional on its valid and complete antecedents: \[VENT\]/);
  assert.match(packet.operator_guidance, /Actual execution requires current custody-owner permission/);
  assert.match(packet.operator_guidance, /Retain coordinate\(s\) \[phase\]/);
});

test('T-FADT-01: Explicit empty support [] correctly computes bounds without crash', () => {
  const emptySupportRows = [
    { id: 'ant-1', support: [] },
    { id: 'ant-2', support: ['REST'] }
  ];
  const bounds = computeFadtFiberBounds(emptySupportRows);
  assert.equal(bounds.exact_descent_exists, false);
  assert.deepEqual(bounds.intersection_support, []);
  assert.deepEqual(bounds.union_support, ['REST']);
  assert.deepEqual(bounds.irreducible_gap, ['REST']);
  assert.equal(bounds.irreducible_gap_cardinality, 1);
  assert.equal(bounds.universally_sound_available, false);
  assert.equal(bounds.disposition, 'HOLD_IRREDUCIBLE_GAP');
});

test('T-FADT-02: normalizeSupportArray rejects non-string action objects with TypeError', () => {
  const malformedRows = [
    { id: 'ant-1', support: [{ action: 'SEND' }] }
  ];
  assert.throws(
    () => computeFadtFiberBounds(malformedRows),
    {
      name: 'TypeError',
      message: /Action support items must be non-empty strings/
    }
  );
});

test('T-FADT-03: Candidate coordinates exceeding budget returns UNSUPPORTED_SEARCH_SIZE with 0 evaluations and undefined exact_recovery_found', () => {
  const fiberRows = [
    { id: 'ant-1', coordinates: { c0: 1 }, support: ['ACTION_A'] },
    { id: 'ant-2', coordinates: { c0: 2 }, support: ['ACTION_B'] }
  ];
  // 32 candidate coordinates => 2^32 - 1 subsets, far exceeding 10,000 budget
  const largeCoordList = Array.from({ length: 32 }, (_, i) => `c${i}`);
  const result = evaluateFadtCoordinateRecovery(fiberRows, largeCoordList);

  assert.equal(result.status, 'UNSUPPORTED_SEARCH_SIZE');
  assert.equal(result.evaluations_run, 0);
  assert.equal(result.exact_recovery_found, undefined);
  assert.equal(result.held, true);
  assert.equal(result.budget_exceeded, true);
  assert.match(result.reason, /exceeds finite search budget/);
});

test('T-FADT-04: Operator guidance emits conditional support language without claiming unconditional permission', () => {
  const packet = compileFadtReparativePacket({
    fiber_rows: [
      { id: 'ant-1', coordinates: { room: 'atrium', phase: 'A' }, support: ['REST', 'VENT'] },
      { id: 'ant-2', coordinates: { room: 'atrium', phase: 'B' }, support: ['VENT', 'COMPOST'] }
    ],
    candidate_coordinates: ['phase'],
    candidate_rule: ['VENT']
  });

  assert.match(packet.operator_guidance, /conditional on its valid and complete antecedents/);
  assert.match(packet.operator_guidance, /Actual execution requires current custody-owner permission/);
  assert.doesNotMatch(packet.operator_guidance, /Immediate execution.*is permitted/);
});

test('runFadtAgent enriches reparative_assistance with coordinate recovery and discrepancy audit', () => {
  const fadtInput = {
    fibres: [{
      id: 'colliding-fiber-1',
      antecedents: [
        { id: 'ant-1', coordinates: { role: 'child', step: 'read' }, support: ['READ', 'SUBMIT'] },
        { id: 'ant-2', coordinates: { role: 'auditor', step: 'read' }, support: ['SUBMIT', 'AUDIT'] }
      ]
    }],
    candidate_coordinates: ['role', 'step'],
    candidate_rule: {
      'colliding-fiber-1': ['SUBMIT']
    }
  };

  const receipt = runFadtAgent(fadtInput);
  assert.equal(receipt.schema, 'td613.dollhouse.fadt-agent/v0.1');
  assert.equal(receipt.all_fibres_exact, false);
  assert.equal(receipt.fibres[0].verdict, 'HOLD');

  // Verify enriched reparative assistance
  assert.ok(receipt.reparative_assistance.coordinate_recovery !== null);
  const rec = receipt.reparative_assistance.coordinate_recovery['colliding-fiber-1'];
  assert.equal(rec.status, 'RESTORING_COORDINATE_EXTENSION_FOUND');
  assert.deepEqual(rec.best_extension, ['role']);

  assert.ok(receipt.reparative_assistance.discrepancy_audit !== null);
  const disc = receipt.reparative_assistance.discrepancy_audit['colliding-fiber-1'];
  assert.equal(disc.universally_sound, true);
  assert.equal(disc.disposition, 'ACCEPT_UNIVERSALLY_SOUND');
});
