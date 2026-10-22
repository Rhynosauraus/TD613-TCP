import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeMatrixSvd,
  evaluateCandidateProbeStability,
  classifyTypedEpistemicDeficit,
  auditTypedEpistemicDeficit,
  mapEpistemicHarmsToPositiveSurvival,
  EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL
} from '../app/engine/aperture-v32-typed-epistemic-deficit.js';

import {
  auditDollhouseWitnessPlan,
  DOLLHOUSE_WITNESS_PLAN_SCHEMA
} from '../app/engine/dollhouse-witness-plan.js';

test('computeMatrixSvd accurately extracts rank, singular values, and condition number', () => {
  // Identity 2x2
  const id2 = computeMatrixSvd([[1, 0], [0, 1]]);
  assert.equal(id2.rank, 2);
  assert.equal(id2.sigma_max, 1);
  assert.equal(id2.sigma_min, 1);
  assert.equal(id2.condition_number, 1);

  // Scaled diagonal
  const diag = computeMatrixSvd([[3, 0], [0, 1.5]]);
  assert.equal(diag.rank, 2);
  assert.equal(diag.sigma_max, 3);
  assert.equal(diag.sigma_min, 1.5);
  assert.equal(diag.condition_number, 2);

  // Rank-deficient 2x2
  const def = computeMatrixSvd([[1, 2], [2, 4]]);
  assert.equal(def.rank, 1);
  assert.equal(def.condition_number, Infinity);

  // Tall 3x2 matrix
  const tall = computeMatrixSvd([[1, 0], [0, 1], [1, 1]]);
  assert.equal(tall.m, 3);
  assert.equal(tall.n, 2);
  assert.equal(tall.rank, 2);
  assert.ok(tall.sigma_max > 1);
  assert.ok(tall.sigma_min > 0);
});

test('Counterexample 1: candidate probe lifting algebraic rank but exploding condition number is rejected', () => {
  const current_operator = [[1, 0]]; // rank 1, latent dimension 2
  const bad_probe = [1, 1e-5];       // nominally lifts rank to 2, but near-collinear
  const good_probe = [0, 1];        // orthogonal, stable rank lift

  const evaluation = evaluateCandidateProbeStability({
    current_operator,
    candidate_probes: [bad_probe, good_probe],
    sigma_min_floor: 1e-3,
    condition_number_ceiling: 1e3
  });

  assert.equal(evaluation.base_rank, 1);
  assert.equal(evaluation.candidates.length, 2);

  const badResult = evaluation.candidates.find(c => c.probe[1] === 1e-5);
  assert.equal(badResult.augmented_rank, 2); // Rank lifted algebraically
  assert.equal(badResult.delta_rank, 1);
  assert.ok(badResult.condition_number > 1e3); // Explodes condition number > 1000
  assert.ok(badResult.sigma_min < 1e-3);       // Below sigma_min floor
  assert.equal(badResult.deficit_class, 'NUMERICAL_STABILITY_DEFICIT');
  assert.equal(badResult.recommendation, 'REJECT_CANDIDATE_DUE_TO_NOISE_AMPLIFICATION');
  assert.equal(badResult.is_acceptable, false);

  const goodResult = evaluation.candidates.find(c => c.probe[1] === 1);
  assert.equal(goodResult.augmented_rank, 2);
  assert.equal(goodResult.delta_rank, 1);
  assert.ok(goodResult.condition_number <= 1e3);
  assert.ok(goodResult.sigma_min >= 1e-3);
  assert.equal(goodResult.deficit_class, 'STABLE_RANK_LIFT');
  assert.equal(goodResult.recommendation, 'ACCEPT_STABLE_WIDENING_PROBE');
  assert.equal(goodResult.is_acceptable, true);

  // Aperture selects the good probe over the bad probe as best candidate
  assert.equal(evaluation.best_candidate.index, goodResult.index);
  assert.equal(evaluation.best_candidate.recommendation, 'ACCEPT_STABLE_WIDENING_PROBE');
  assert.equal(evaluation.disposition, 'PROPOSE');
});

test('Counterexample 3: non-positive-definite noise covariance is rejected under INVALID_NOISE_GEOMETRY', () => {
  const current_operator = [[1, 0]];
  const candidate_probes = [[0, 1]];

  // Non-positive-definite covariance (eigenvalues: 3 and -1)
  const invalid_covariance = [
    [1, 2],
    [2, 1]
  ];

  const evaluation = evaluateCandidateProbeStability({
    current_operator,
    candidate_probes,
    noise_covariance: invalid_covariance
  });

  assert.equal(evaluation.deficit_class, 'INVALID_NOISE_GEOMETRY');
  assert.equal(evaluation.disposition, 'REJECT');
  assert.match(evaluation.reason, /not symmetric positive-definite/);
});

test('Counterexample 3b: nonsymmetric covariance matrix [[1, 0], [9, 1]] is rejected under INVALID_NOISE_GEOMETRY', () => {
  const current_operator = [[1, 0]];
  const candidate_probes = [[0, 1]];

  // Adversarial nonsymmetric matrix: upper triangle off-diagonal is 0, but lower triangle off-diagonal is 9!
  // Naive Jacobi looking only at i < j falsely sees zero off-diagonals and claims eigenvalues {1, 1}.
  const nonsymmetric_covariance = [
    [1, 0],
    [9, 1]
  ];

  const evaluation = evaluateCandidateProbeStability({
    current_operator,
    candidate_probes,
    noise_covariance: nonsymmetric_covariance
  });

  assert.equal(evaluation.deficit_class, 'INVALID_NOISE_GEOMETRY');
  assert.equal(evaluation.disposition, 'REJECT');
  assert.match(evaluation.reason, /not symmetric/);
});

test('redundant candidate probe adding zero rank and zero stability improvement is marked ASK_NOTHING', () => {
  const current_operator = [[1, 0], [0, 1]]; // already full rank 2
  const redundant_probe = [2, 0];            // scalar multiple of first row

  const evaluation = evaluateCandidateProbeStability({
    current_operator,
    candidate_probes: [redundant_probe]
  });

  assert.equal(evaluation.candidates[0].delta_rank, 0);
  assert.equal(evaluation.candidates[0].deficit_class, 'NO_INFORMATIVE_RANK_LIFT');
  assert.equal(evaluation.candidates[0].disposition, 'ASK_NOTHING');
  assert.equal(evaluation.candidates[0].recommendation, 'DO_NOT_MANUFACTURE_REDUNDANT_PROBE');
});

test('epistemic harms map bijectively to positive knowledge-survival capacities', () => {
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.PREMATURE_ONTOLOGICAL_CLOSURE, 'interpretability');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.UNIDENTIFIABLE_WIDENING, 'repairability');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.FALSE_CONSENSUS_AMPLIFICATION, 'attributable_provenance');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.IRREDUCIBLE_GAP_DENIAL, 'contestability');
  assert.deepEqual(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.CHRONOLOGICAL_OBLIVION, ['retrievability', 'transmissibility']);

  const mapped = mapEpistemicHarmsToPositiveSurvival([
    'PREMATURE_ONTOLOGICAL_CLOSURE',
    'UNIDENTIFIABLE_WIDENING'
  ]);
  assert.equal(mapped.addressed_harms.length, 2);
  assert.ok(mapped.interpretability < 1.0);
  assert.ok(mapped.repairability < 1.0);
  assert.equal(mapped.attributable_provenance, 1.0);
});

test('auditDollhouseWitnessPlan seamlessly integrates numerical stability and probe evaluation', () => {
  const witnessPlan = {
    schema: DOLLHOUSE_WITNESS_PLAN_SCHEMA,
    source_revision: 'c'.repeat(40),
    execution: false,
    claims: [{
      id: 'claim-inverse-probe-stability',
      claim_class: 'INVERSE_MEASUREMENT_DESIGN',
      statement: 'Candidate probe provides rank lift without exploding condition number.',
      extent: 'DECLARED_SCOPE_ONLY',
      observation_scope: { description: '2D latent state reconstruction', objects: ['sensor-x', 'sensor-y'], bounded: true },
      instrument: { id: 'aperture-v32-svd-evaluator', description: 'Evaluates singular value conditioning and probe stability.' },
      evidence_class: 'OFFLINE_TEST',
      positive_witness: { description: 'Orthogonal probe achieves kappa <= 1000 and rank 2.', artifact_refs: ['fixture:svd-pass'] },
      hostile_counterexample: { description: 'Near-collinear probe explodes kappa to 200,000.', artifact_refs: ['fixture:svd-cliff'] },
      unresolved_alternatives: ['UNIDENTIFIABLE_WIDENING'],
      required_next_observation: null,
      numerical_deficit_input: {
        current_operator: [[1, 0]],
        candidate_probes: [[0, 1], [1, 1e-5]],
        sigma_min_floor: 1e-3,
        condition_number_ceiling: 1e3
      }
    }]
  };

  const receipt = auditDollhouseWitnessPlan(witnessPlan);
  assert.equal(receipt.disposition, 'PROPOSE');
  assert.equal(receipt.claims.length, 1);
  const claimReceipt = receipt.claims[0];
  assert.equal(claimReceipt.claim_class, 'INVERSE_MEASUREMENT_DESIGN');
  assert.ok(claimReceipt.numerical_deficit_receipt !== null);
  assert.equal(claimReceipt.numerical_deficit_receipt.candidate_probe_evaluation.best_candidate.recommendation, 'ACCEPT_STABLE_WIDENING_PROBE');
  assert.ok(claimReceipt.epistemic_harm_mappings !== null);
  assert.ok(claimReceipt.epistemic_harm_mappings.addressed_harms.includes('UNIDENTIFIABLE_WIDENING'));
  assert.equal(receipt.authority.execution, false);
  assert.equal(receipt.authority.human_closure_required, true);
});
