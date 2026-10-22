export const APERTURE_V32_VERSION = 'v3.2-alpha';
export const APERTURE_V32_SCHEMA = 'td613-aperture/v3.2-alpha';
export const APERTURE_V32_TYPED_DEFICIT_SCHEMA =
  'td613.aperture.v32-typed-epistemic-deficit/v0.1';
export const APERTURE_V32_TYPED_DEFICIT_RECEIPT_SCHEMA =
  'td613.aperture.v32-typed-epistemic-deficit-receipt/v0.1';
export const APERTURE_V32_REPLAY_STABILITY = 'HELD_NOT_YET_WITNESSED';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
  return number;
}

function integer(value, label) {
  const number = finite(value, label);
  if (!Number.isInteger(number)) throw new TypeError(`${label} must be an integer`);
  return number;
}

export const EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL = deepFreeze({
  PREMATURE_ONTOLOGICAL_CLOSURE: 'interpretability',
  UNIDENTIFIABLE_WIDENING: 'repairability',
  FALSE_CONSENSUS_AMPLIFICATION: 'attributable_provenance',
  IRREDUCIBLE_GAP_DENIAL: 'contestability',
  CHRONOLOGICAL_OBLIVION: ['retrievability', 'transmissibility']
});

export function mapEpistemicHarmsToPositiveSurvival(harms = []) {
  const result = {
    retrievability: 1.0,
    attributable_provenance: 1.0,
    interpretability: 1.0,
    transmissibility: 1.0,
    contestability: 1.0,
    repairability: 1.0,
    addressed_harms: []
  };
  for (const harm of harms) {
    const mapped = EPISTEMIC_HARMS_TO_KNOWLEDGE_SURVIVAL[harm];
    if (mapped) {
      result.addressed_harms.push(harm);
      if (Array.isArray(mapped)) {
        mapped.forEach(c => { result[c] = Math.max(0.0, result[c] - 0.2); });
      } else {
        result[mapped] = Math.max(0.0, result[mapped] - 0.2);
      }
    }
  }
  return deepFreeze(result);
}

function jacobiEigenvalues(M, maxIter = 100) {
  const n = M.length;
  let A = M.map(row => [...row]);
  for (let iter = 0; iter < maxIter; iter++) {
    let maxOff = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(A[i][j]);
        if (absVal > maxOff) {
          maxOff = absVal; p = i; q = j;
        }
      }
    }
    if (maxOff < 1e-15) break;
    const diff = A[q][q] - A[p][p];
    let t;
    if (Math.abs(diff) < 1e-15) {
      t = 1;
    } else {
      const phi = diff / (2 * A[p][q]);
      t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
      if (phi < 0) t = -t;
    }
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    const tau = s / (1 + c);
    const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
    A[p][p] = App - t * Apq;
    A[q][q] = Aqq + t * Apq;
    A[p][q] = 0; A[q][p] = 0;
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p], aiq = A[i][q];
        A[i][p] = aip - s * (aiq + tau * aip);
        A[p][i] = A[i][p];
        A[i][q] = aiq + s * (aip - tau * aiq);
        A[q][i] = A[i][q];
      }
    }
  }
  return A.map((row, i) => Math.max(0, row[i]));
}

export function computeMatrixSvd(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) {
    throw new TypeError('matrix must be a non-empty 2D array');
  }
  const m = matrix.length;
  const n = matrix[0].length;
  for (let i = 0; i < m; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
      throw new TypeError('matrix rows must be of equal length');
    }
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(matrix[i][j])) throw new TypeError('matrix entries must be finite numbers');
    }
  }
  const AtA = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < m; k++) sum += matrix[k][i] * matrix[k][j];
      return sum;
    })
  );
  const eigenvalues = jacobiEigenvalues(AtA);
  const singularValues = eigenvalues.map(x => Math.sqrt(x)).sort((a, b) => b - a);
  const tol = Math.max(m, n) * singularValues[0] * 1e-14;
  const rank = singularValues.filter(s => s > tol).length;
  const sigmaMin = singularValues[n - 1];
  const conditionNumber = sigmaMin > 1e-15 ? singularValues[0] / sigmaMin : Infinity;
  return deepFreeze({
    m,
    n,
    rank,
    singular_values: singularValues,
    sigma_max: singularValues[0],
    sigma_min: sigmaMin,
    condition_number: conditionNumber
  });
}

export function evaluateCandidateProbeStability(options = {}) {
  const {
    current_operator,
    candidate_probes,
    noise_covariance = null,
    sigma_min_floor = 1e-3,
    condition_number_ceiling = 1e3
  } = options;

  if (!Array.isArray(current_operator) || current_operator.length === 0) {
    throw new TypeError('current_operator must be a nonempty 2D array');
  }
  if (!Array.isArray(candidate_probes) || candidate_probes.length === 0) {
    throw new TypeError('candidate_probes must be a nonempty array of probe vectors');
  }

  const baseSvd = computeMatrixSvd(current_operator);
  const n = baseSvd.n;
  const baseConditionNumber = Number.isFinite(baseSvd.condition_number)
    ? baseSvd.condition_number
    : (condition_number_ceiling * 10);

  let covarianceValid = true;
  if (noise_covariance !== null) {
    if (!Array.isArray(noise_covariance)) {
      covarianceValid = false;
    } else {
      const covEig = jacobiEigenvalues(noise_covariance);
      if (covEig.some(val => val <= 1e-12)) {
        covarianceValid = false;
      }
    }
  }

  if (noise_covariance !== null && !covarianceValid) {
    return deepFreeze({
      schema: 'td613.aperture.candidate-probe-evaluation/v0.1',
      deficit_class: 'INVALID_NOISE_GEOMETRY',
      disposition: 'REJECT',
      reason: 'declared noise covariance matrix is not symmetric positive-definite',
      evaluated_candidates: []
    });
  }

  const evaluated = candidate_probes.map((probeVector, index) => {
    if (!Array.isArray(probeVector) || probeVector.length !== n) {
      throw new TypeError(`candidate_probes[${index}] must have length matching latent dimension ${n}`);
    }
    const augmented = [...current_operator, probeVector];
    const augSvd = computeMatrixSvd(augmented);
    const deltaRank = augSvd.rank - baseSvd.rank;
    const augConditionNumber = Number.isFinite(augSvd.condition_number)
      ? augSvd.condition_number
      : (condition_number_ceiling * 10);
    const condOk = augConditionNumber <= condition_number_ceiling;
    const sigmaOk = augSvd.sigma_min >= sigma_min_floor;

    let deficit_class;
    let disposition;
    let recommendation;

    if (deltaRank > 0 && condOk && sigmaOk) {
      deficit_class = 'STABLE_RANK_LIFT';
      disposition = 'PROPOSE';
      recommendation = 'ACCEPT_STABLE_WIDENING_PROBE';
    } else if (deltaRank > 0 && (!condOk || !sigmaOk)) {
      deficit_class = 'NUMERICAL_STABILITY_DEFICIT';
      disposition = 'PROPOSE';
      recommendation = 'REJECT_CANDIDATE_DUE_TO_NOISE_AMPLIFICATION';
    } else if (deltaRank === 0 && augConditionNumber < baseConditionNumber) {
      deficit_class = 'STABILIZING_OBSERVATION';
      disposition = 'PROPOSE';
      recommendation = 'ACCEPT_STABILIZING_PROBE_WITHOUT_RANK_LIFT';
    } else {
      deficit_class = 'NO_INFORMATIVE_RANK_LIFT';
      disposition = 'ASK_NOTHING';
      recommendation = 'DO_NOT_MANUFACTURE_REDUNDANT_PROBE';
    }

    return deepFreeze({
      index,
      probe: [...probeVector],
      base_rank: baseSvd.rank,
      augmented_rank: augSvd.rank,
      delta_rank: deltaRank,
      sigma_min: augSvd.sigma_min,
      condition_number: augConditionNumber,
      deficit_class,
      disposition,
      recommendation,
      is_acceptable: (deficit_class === 'STABLE_RANK_LIFT' || deficit_class === 'STABILIZING_OBSERVATION')
    });
  });

  const ranked = [...evaluated].sort((a, b) => {
    if (a.is_acceptable !== b.is_acceptable) return a.is_acceptable ? -1 : 1;
    if (b.delta_rank !== a.delta_rank) return b.delta_rank - a.delta_rank;
    return a.condition_number - b.condition_number;
  });

  const best = ranked[0];
  const overallDisposition = ranked.some(c => c.is_acceptable) ? 'PROPOSE' : 'ABSTAIN';

  return deepFreeze({
    schema: 'td613.aperture.candidate-probe-evaluation/v0.1',
    latent_dimension: n,
    current_observations: current_operator.length,
    base_rank: baseSvd.rank,
    base_condition_number: baseConditionNumber,
    sigma_min_floor,
    condition_number_ceiling,
    disposition: overallDisposition,
    best_candidate: best ? { index: best.index, recommendation: best.recommendation, condition_number: best.condition_number } : null,
    candidates: ranked
  });
}

export function classifyTypedEpistemicDeficit(input = {}) {
  const latentDimension = integer(input.latent_dimension, 'latent_dimension');
  const currentRank = integer(input.current_rank, 'current_rank');
  const sigmaMin = finite(input.sigma_min, 'sigma_min');
  const conditionNumber = (input.condition_number === Infinity || input.condition_number === 'Infinity')
    ? Infinity
    : finite(input.condition_number, 'condition_number');
  const sigmaMinFloor = finite(input.sigma_min_floor, 'sigma_min_floor');
  const conditionNumberCeiling = finite(
    input.condition_number_ceiling,
    'condition_number_ceiling'
  );
  const uncertaintyStatus = String(input.uncertainty_status || '').toUpperCase();

  if (
    latentDimension < 1 ||
    currentRank < 0 ||
    currentRank > latentDimension ||
    sigmaMin < 0 ||
    conditionNumber < 1 ||
    sigmaMinFloor < 0 ||
    conditionNumberCeiling < 1
  ) {
    return deepFreeze({
      deficit_class: 'INVALID_DECLARED_OPERATOR_STATE',
      disposition: 'REJECT',
      criterion: null,
      reason: 'declared rank/dimension/stability metrics violate the local audit contract'
    });
  }

  if (uncertaintyStatus === 'INVALID') {
    return deepFreeze({
      deficit_class: 'INVALID_NOISE_GEOMETRY',
      disposition: 'REJECT',
      criterion: null,
      reason: 'declared uncertainty geometry is invalid and must not be silently repaired'
    });
  }

  if (uncertaintyStatus !== 'VALID_DECLARED') {
    return deepFreeze({
      deficit_class: 'NOISE_GEOMETRY_INCOMPLETE',
      disposition: 'ABSTAIN',
      criterion: null,
      reason: uncertaintyStatus === 'INCOMPLETE'
        ? 'disposition-relevant uncertainty geometry is unresolved; missing reliability is not neutral reliability'
        : 'uncertainty geometry has not been declared valid'
    });
  }

  if (currentRank < latentDimension) {
    return deepFreeze({
      deficit_class: 'STRUCTURAL_RANK_DEFICIT',
      disposition: 'PROPOSE',
      criterion: 'SEEK_PREDECLARED_NULLSPACE_CONTRACTING_OBSERVATION_THEN_AUDIT_STABILITY',
      reason: 'current operator rank is below the declared latent dimension'
    });
  }

  if (sigmaMin < sigmaMinFloor || conditionNumber > conditionNumberCeiling) {
    return deepFreeze({
      deficit_class: 'NUMERICAL_STABILITY_DEFICIT',
      disposition: 'PROPOSE',
      criterion: 'SEEK_PREDECLARED_STABILIZING_OBSERVATION_WITHOUT_REQUIRING_RANK_LIFT',
      reason: 'operator is full rank but fails the declared local stability posture'
    });
  }

  return deepFreeze({
    deficit_class: 'NO_DECLARED_LOCAL_IDENTIFIABILITY_DEFICIT',
    disposition: 'ASK_NOTHING',
    criterion: 'DO_NOT_MANUFACTURE_A_QUESTION',
    reason: 'declared local rank and stability posture is presently satisfied'
  });
}

function pedagogueCue(disposition) {
  if (disposition === 'PROPOSE') {
    return 'PEDAGOGUE_MAY_PROPOSE_PREDECLARED_CANDIDATE_FAMILY_UNDER_THIS_CRITERION';
  }
  if (disposition === 'ASK_NOTHING') return 'PEDAGOGUE_SHOULD_NOT_MANUFACTURE_A_QUESTION';
  if (disposition === 'ABSTAIN') return 'RESOLVE_UNCERTAINTY_GEOMETRY_BEFORE_CANDIDATE_COMPARISON';
  return 'REPAIR_OR_REJECT_DECLARED_GEOMETRY_BEFORE_RANKING';
}

export function auditTypedEpistemicDeficit(input = {}) {
  let effectiveInput = input;
  let probeEvaluation = null;

  if (Array.isArray(input.current_operator)) {
    const svd = computeMatrixSvd(input.current_operator);
    const pseudoCondition = (svd.rank > 0 && svd.singular_values[svd.rank - 1] > 1e-15)
      ? svd.sigma_max / svd.singular_values[svd.rank - 1]
      : 1;
    const finiteConditionNumber = Number.isFinite(svd.condition_number)
      ? svd.condition_number
      : (svd.rank < svd.n ? pseudoCondition : (input.condition_number_ceiling ?? 1e3) + 1);
    effectiveInput = {
      latent_dimension: svd.n,
      current_rank: svd.rank,
      sigma_min: svd.sigma_min,
      condition_number: finiteConditionNumber,
      uncertainty_status: input.uncertainty_status || 'VALID_DECLARED',
      sigma_min_floor: input.sigma_min_floor ?? 1e-3,
      condition_number_ceiling: input.condition_number_ceiling ?? 1e3,
      threshold_authority: input.threshold_authority || 'OPERATOR_DECLARED_LOCAL'
    };
    if (Array.isArray(input.candidate_probes)) {
      probeEvaluation = evaluateCandidateProbeStability({
        current_operator: input.current_operator,
        candidate_probes: input.candidate_probes,
        noise_covariance: input.noise_covariance || null,
        sigma_min_floor: effectiveInput.sigma_min_floor,
        condition_number_ceiling: effectiveInput.condition_number_ceiling
      });
    }
  }

  const classification = classifyTypedEpistemicDeficit(effectiveInput);
  return deepFreeze({
    schema: APERTURE_V32_TYPED_DEFICIT_RECEIPT_SCHEMA,
    version: APERTURE_V32_VERSION,
    source_status: 'DERIVED_FROM_OPERATOR_DECLARED_METRICS',
    authority_class: 'A2_DERIVATIONAL',
    input: {
      latent_dimension: Number(effectiveInput.latent_dimension),
      current_rank: Number(effectiveInput.current_rank),
      sigma_min: Number(effectiveInput.sigma_min),
      condition_number: Number(effectiveInput.condition_number),
      uncertainty_status: String(effectiveInput.uncertainty_status),
      sigma_min_floor: Number(effectiveInput.sigma_min_floor),
      condition_number_ceiling: Number(effectiveInput.condition_number_ceiling),
      threshold_authority: String(effectiveInput.threshold_authority || 'OPERATOR_DECLARED_LOCAL')
    },
    deficit_class: classification.deficit_class,
    disposition: classification.disposition,
    admissible_question_criterion: classification.criterion,
    reason: classification.reason,
    pedagogue_companion_cue: pedagogueCue(classification.disposition),
    candidate_probe_evaluation: probeEvaluation,
    classification_replay_stability: APERTURE_V32_REPLAY_STABILITY,
    no_scalar_crown: true,
    proposal_is_execution: false,
    widening_is_validation: false,
    automatic_observation: false,
    automatic_experiment_execution: false,
    promotion_authority: false,
    production_mutation: false,
    human_closure_required: true
  });
}

export function selfTestTypedEpistemicDeficit() {
  const fixtures = [
    [{ latent_dimension: 2, current_rank: 1, sigma_min: 0, condition_number: 2000, uncertainty_status: 'VALID_DECLARED', sigma_min_floor: 0.25, condition_number_ceiling: 10 }, 'STRUCTURAL_RANK_DEFICIT', 'PROPOSE'],
    [{ latent_dimension: 2, current_rank: 2, sigma_min: 0.0007071065, condition_number: 2000.0005, uncertainty_status: 'VALID_DECLARED', sigma_min_floor: 0.25, condition_number_ceiling: 10 }, 'NUMERICAL_STABILITY_DEFICIT', 'PROPOSE'],
    [{ latent_dimension: 2, current_rank: 2, sigma_min: 1, condition_number: 1, uncertainty_status: 'VALID_DECLARED', sigma_min_floor: 0.25, condition_number_ceiling: 10 }, 'NO_DECLARED_LOCAL_IDENTIFIABILITY_DEFICIT', 'ASK_NOTHING'],
    [{ latent_dimension: 2, current_rank: 1, sigma_min: 0, condition_number: 2000, uncertainty_status: 'INCOMPLETE', sigma_min_floor: 0.25, condition_number_ceiling: 10 }, 'NOISE_GEOMETRY_INCOMPLETE', 'ABSTAIN'],
    [{ latent_dimension: 2, current_rank: 1, sigma_min: 0, condition_number: 2000, uncertainty_status: 'INVALID', sigma_min_floor: 0.25, condition_number_ceiling: 10 }, 'INVALID_NOISE_GEOMETRY', 'REJECT']
  ];
  const results = fixtures.map(([input, expectedClass, expectedDisposition]) => {
    const receipt = auditTypedEpistemicDeficit(input);
    return deepFreeze({
      expected: [expectedClass, expectedDisposition],
      actual: [receipt.deficit_class, receipt.disposition],
      pass: receipt.deficit_class === expectedClass && receipt.disposition === expectedDisposition
    });
  });
  return deepFreeze({
    schema: 'td613.aperture.v32-typed-epistemic-deficit-self-test/v0.1',
    status: results.every(result => result.pass) ? 'pass' : 'fail',
    results,
    classification_replay_stability: APERTURE_V32_REPLAY_STABILITY
  });
}
