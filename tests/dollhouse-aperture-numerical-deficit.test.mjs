import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeMatrixSvd,
  evaluateCandidateProbeStability,
  classifyTypedEpistemicDeficit,
  auditTypedEpistemicDeficit,
  APERTURE_V32_TYPED_DEFICIT_RECEIPT_SCHEMA,
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

test('Numerical calibration: one-sided Jacobi SVD on diagonal ill-conditioned matrix recovers known spectrum', () => {
  // Diagonal ill-conditioned matrix with known singular values [1, 1e-4, 1e-8].
  // Note: On diagonal matrices, normal equations A^T A are also diagonal and avoid subtractive cancellation.
  // This test validates exact baseline extraction on a known-spectrum diagonal case.
  const illConditionedMatrix = [
    [1.0, 0.0, 0.0],
    [0.0, 1e-4, 0.0],
    [0.0, 0.0, 1e-8]
  ];

  const svd = computeMatrixSvd(illConditionedMatrix);
  assert.equal(svd.m, 3);
  assert.equal(svd.n, 3);
  assert.equal(svd.rank, 3);
  assert.equal(svd.sigma_max, 1.0);
  assert.equal(svd.singular_values[0], 1.0);
  assert.equal(svd.singular_values[1], 1e-4);
  assert.equal(svd.singular_values[2], 1e-8);
  assert.equal(svd.sigma_min, 1e-8);
  assert.equal(svd.condition_number, 1e8);
});

function matMulTransposedSelf(A) {
  const m = A.length;
  const n = A[0].length;
  const B = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0.0;
      for (let k = 0; k < m; k++) {
        sum += A[k][i] * A[k][j];
      }
      B[i][j] = sum;
    }
  }
  return B;
}

function solveSymmetricEigensystem3x3(BIn) {
  // Classical cyclic Jacobi eigensolver for 3x3 symmetric matrix
  const B = [
    [BIn[0][0], BIn[0][1], BIn[0][2]],
    [BIn[1][0], BIn[1][1], BIn[1][2]],
    [BIn[2][0], BIn[2][1], BIn[2][2]]
  ];
  const maxSweeps = 50;
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let offDiag = Math.abs(B[0][1]) + Math.abs(B[0][2]) + Math.abs(B[1][2]);
    if (offDiag < 1e-30) break;
    for (let p = 0; p < 2; p++) {
      for (let q = p + 1; q < 3; q++) {
        const bpq = B[p][q];
        if (Math.abs(bpq) < 1e-30) continue;
        const bpp = B[p][p];
        const bqq = B[q][q];
        const tau = (bqq - bpp) / (2 * bpq);
        let t;
        if (tau >= 0) {
          t = 1 / (tau + Math.sqrt(1 + tau * tau));
        } else {
          t = -1 / (-tau + Math.sqrt(1 + tau * tau));
        }
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const App = c * c * bpp - 2 * s * c * bpq + s * s * bqq;
        const Aqq = s * s * bpp + 2 * s * c * bpq + c * c * bqq;
        B[p][p] = App;
        B[q][q] = Aqq;
        B[p][q] = 0;
        B[q][p] = 0;
        for (let r = 0; r < 3; r++) {
          if (r !== p && r !== q) {
            const brp = B[r][p];
            const brq = B[r][q];
            B[r][p] = c * brp - s * brq;
            B[p][r] = B[r][p];
            B[r][q] = s * brp + c * brq;
            B[q][r] = B[r][q];
          }
        }
      }
    }
  }
  return [B[0][0], B[1][1], B[2][2]].sort((a, b) => b - a);
}

test('Numerical calibration: rotated ill-conditioned matrix demonstrates condition squaring failure in normal equations vs Jacobi stability', () => {
  // Rotated ill-conditioned matrix A = Sigma * H, where H is an orthogonal Householder reflection:
  // H = I - 2 v v^T, with v = [1, 2, 2]^T / 3 (|v| = 1).
  // Spectrum Sigma = diag(1.0, 1e-4, 1e-8), so true singular values are strictly [1.0, 1e-4, 1e-8], kappa(A) = 1e8.
  //
  // Condition Squaring Analysis:
  // When forming normal equations B = A^T A = H^T Sigma^2 H, kappa(A^T A) = kappa(A)^2 = 1e16 approx eps_mach^-1.
  // The off-diagonal coupling terms are O(1), and subtracting O(1) terms to diagonalize B corrupts lambda_3 = 1e-16,
  // causing standard normal-equation Jacobi solvers to compute sqrt(lambda_3) with >28% relative error.
  //
  // In contrast, direct one-sided Jacobi column orthogonalization (Hestenes SVD) operates directly on the columns
  // of A without forming A^T A, computing sigma_3 = 1e-8 with zero relative error (exact to machine precision).
  const H = [
    [7/9, -4/9, -4/9],
    [-4/9, 1/9, -8/9],
    [-4/9, -8/9, 1/9]
  ];
  const Sigma = [1.0, 1e-4, 1e-8];
  const A = [
    [Sigma[0] * H[0][0], Sigma[0] * H[0][1], Sigma[0] * H[0][2]],
    [Sigma[1] * H[1][0], Sigma[1] * H[1][1], Sigma[1] * H[1][2]],
    [Sigma[2] * H[2][0], Sigma[2] * H[2][1], Sigma[2] * H[2][2]]
  ];

  // 1. Direct one-sided Jacobi SVD execution on A
  const svd = computeMatrixSvd(A);
  assert.equal(svd.m, 3);
  assert.equal(svd.n, 3);
  assert.equal(svd.rank, 3);
  assert.equal(svd.sigma_max, 1.0);
  assert.ok(Math.abs(svd.singular_values[0] - 1.0) < 1e-15);
  assert.ok(Math.abs(svd.singular_values[1] - 1e-4) < 1e-15);
  // Verify direct Jacobi computes sigma_3 = 1e-8 with < 1e-12 error (exact to machine precision)
  const relativeErrorDirect = Math.abs(svd.singular_values[2] - 1e-8) / 1e-8;
  assert.ok(relativeErrorDirect < 1e-12, `Direct Jacobi relative error ${relativeErrorDirect} must be negligible`);
  assert.equal(svd.singular_values[2], 1e-8);
  assert.equal(svd.sigma_min, 1e-8);
  assert.equal(svd.condition_number, 1e8);

  // 2. Executable Normal-Equations Eigensolver Benchmark on B = A^T A
  const B = matMulTransposedSelf(A);
  const evals = solveSymmetricEigensystem3x3(B);
  const normalSigma3 = Math.sqrt(Math.max(0, evals[2]));
  const normalRelativeError = Math.abs(normalSigma3 - 1e-8) / 1e-8;

  // Assert that normal equations eigensolver exhibits condition-squaring corruption (> 25% error, observed ~28.5%)
  assert.ok(
    normalRelativeError > 0.25,
    `Normal equations relative error ${normalRelativeError} must exceed 25% due to condition squaring kappa^2 = 1e16`
  );
  assert.ok(
    normalRelativeError < 0.35,
    `Normal equations relative error ${normalRelativeError} is in expected 28.5% range`
  );

  // Note algorithm-dependence: classical Jacobi yields ~28.5% error, while tridiagonal/QR eigensolvers
  // yield ~1.65% error on A^T A; direct one-sided Jacobi on A strictly achieves 0.00% error.
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

test('epistemic harms map as a set-valued relation to positive knowledge-survival capacities with surjective coverage', () => {
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.PREMATURE_ONTOLOGICAL_CLOSURE, 'interpretability');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.UNIDENTIFIABLE_WIDENING, 'repairability');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.FALSE_CONSENSUS_AMPLIFICATION, 'attributable_provenance');
  assert.equal(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.IRREDUCIBLE_GAP_DENIAL, 'contestability');
  assert.deepEqual(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL.CHRONOLOGICAL_OBLIVION, ['retrievability', 'transmissibility']);

  // Surjective coverage check: union of image targets covers all six capacities
  const allTargetCapacities = new Set();
  for (const target of Object.values(EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL)) {
    if (Array.isArray(target)) {
      target.forEach(c => allTargetCapacities.add(c));
    } else {
      allTargetCapacities.add(target);
    }
  }
  assert.equal(allTargetCapacities.size, 6);
  assert.ok(['retrievability', 'attributable_provenance', 'interpretability', 'transmissibility', 'contestability', 'repairability'].every(c => allTargetCapacities.has(c)));

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

test('T-APERTURE-01: auditTypedEpistemicDeficit with incomplete/unresolved noise covariance yields NOISE_GEOMETRY_INCOMPLETE with ABSTAIN', () => {
  const resultIncomplete = auditTypedEpistemicDeficit({
    current_operator: [[1.0, 0.0], [0.0, 1.0]],
    uncertainty_status: 'INCOMPLETE'
  });

  assert.equal(resultIncomplete.schema, APERTURE_V32_TYPED_DEFICIT_RECEIPT_SCHEMA);
  assert.equal(resultIncomplete.deficit_class, 'NOISE_GEOMETRY_INCOMPLETE');
  assert.equal(resultIncomplete.disposition, 'ABSTAIN');
  assert.match(resultIncomplete.reason, /missing reliability is not neutral reliability/);
});
