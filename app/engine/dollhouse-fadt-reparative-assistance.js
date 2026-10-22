/**
 * @fileoverview TD613 Dollhouse FADT Reparative Assistance Engine.
 *
 * Implements PR #752's Finite Admissibility Descent Theorem reparative operationalization:
 *
 * 1. Universally Sound Action Support & Stage-Erasure Gap:
 *    - Given fiber F_y = { x \in X | \pi_R(x) = y }:
 *      I_y = \bigcap_{x \in F_y} K_x  (largest universally sound surviving support)
 *      U_y = \bigcup_{x \in F_y} K_x  (union support)
 *      \Gamma_y = U_y \setminus I_y   (irreducible stage-erasure gap)
 *    - When \Gamma_y \neq \emptyset, any a \in I_y can be executed immediately without
 *      widening any antecedent K_x.
 *
 * 2. Distinguishing Hitting-Set Coordinate Evaluator:
 *    - Searches coordinate subsets S \subseteq (X \setminus R) ordered by cardinality.
 *    - Evaluates subfibers F_{y'} under coordinate retention S.
 *    - Identifies minimal coordinate extension(s) that restore exact descent (\Gamma = \emptyset).
 *    - Handles non-submodular / XOR coordinate interactions (Counterexample 2).
 *
 * 3. Sharp Discrepancy Identity Evaluator:
 *    - Evaluates candidate rule A_y:
 *      |A_y \setminus I_y| + |U_y \setminus A_y| = |\Gamma_y| + |A_y \setminus U_y| + |I_y \setminus A_y|
 *    - Rejects any candidate rule that widens beyond U_y (A_y \setminus U_y \neq \emptyset)
 *      under REJECT_UNLAWFUL_WIDENING.
 */

export const DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA = 'td613.dollhouse.fadt-reparative-assistance/v0.1';
export const DOLLHOUSE_FADT_DISCREPANCY_IDENTITY_SCHEMA = 'td613.dollhouse.fadt-discrepancy-identity/v0.1';

export const FADT_REPARATIVE_LAWS = Object.freeze({
  exact_finite_admissibility_descent: true,
  universally_sound_support_never_widens_antecedents: true,
  sharp_discrepancy_identity_holds_universally: true,
  unlawful_widening_rejected: true,
  unoccupied_quotient_has_no_authority: true
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function normalizeSupportArray(arr) {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const item of arr) {
    if (item !== null && item !== undefined) {
      set.add(String(item).trim());
    }
  }
  return [...set].sort();
}

/**
 * Computes intersection support (I_y), union support (U_y), and the irreducible gap (\Gamma_y)
 * for a declared preimage fiber.
 */
export function computeFadtFiberBounds(fiberRows = []) {
  if (!Array.isArray(fiberRows) || fiberRows.length === 0) {
    throw new TypeError('fiberRows must be a non-empty array of antecedent states with supports');
  }

  const supports = fiberRows.map((row, idx) => {
    const s = normalizeSupportArray(row.support || row.actions || []);
    if (s.length === 0) {
      throw new TypeError(`fiberRows[${idx}] must contain a non-empty support array`);
    }
    return s;
  });

  const unionSet = new Set();
  supports.forEach(s => s.forEach(a => unionSet.add(a)));
  const unionSupport = [...unionSet].sort();

  const intersectionSet = new Set(supports[0]);
  for (let i = 1; i < supports.length; i++) {
    for (const a of [...intersectionSet]) {
      if (!supports[i].includes(a)) {
        intersectionSet.delete(a);
      }
    }
  }
  const intersectionSupport = [...intersectionSet].sort();

  const gapSet = new Set(unionSupport.filter(a => !intersectionSet.has(a)));
  const irreducibleGap = [...gapSet].sort();

  const exact = irreducibleGap.length === 0;

  return deepFreeze({
    antecedent_count: fiberRows.length,
    union_support: unionSupport,
    union_cardinality: unionSupport.length,
    intersection_support: intersectionSupport,
    intersection_cardinality: intersectionSupport.length,
    irreducible_gap: irreducibleGap,
    irreducible_gap_cardinality: irreducibleGap.length,
    exact_descent_exists: exact,
    universally_sound_available: intersectionSupport.length > 0,
    disposition: exact ? 'EXACT_DESCENT' : 'HOLD_IRREDUCIBLE_GAP',
    laws: FADT_REPARATIVE_LAWS
  });
}

function getSubsets(array) {
  const result = [];
  const n = array.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sub = [];
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) sub.push(array[i]);
    }
    result.push(sub);
  }
  // Sort subsets by cardinality (size 1, 2, ..., n)
  result.sort((a, b) => a.length - b.length);
  return result;
}

/**
 * Evaluates candidate conditioning coordinates to find the minimal coordinate extension
 * that partitions a colliding fiber into subfibers with constant action support (\Gamma = \emptyset).
 *
 * Correctly evaluates multi-coordinate combinations to handle non-submodular / XOR interactions.
 */
export function evaluateFadtCoordinateRecovery(collidingFiberRows = [], candidateCoordinates = []) {
  if (!Array.isArray(collidingFiberRows) || collidingFiberRows.length === 0) {
    throw new TypeError('collidingFiberRows must be a non-empty array of antecedent records');
  }
  if (!Array.isArray(candidateCoordinates) || candidateCoordinates.length === 0) {
    throw new TypeError('candidateCoordinates must be a non-empty array of coordinate names');
  }

  const baseBounds = computeFadtFiberBounds(collidingFiberRows);
  if (baseBounds.exact_descent_exists) {
    return deepFreeze({
      schema: DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA,
      status: 'ALREADY_EXACT_NO_RECOVERY_NEEDED',
      base_bounds: baseBounds,
      minimal_resolving_sets: [],
      best_extension: null,
      laws: FADT_REPARATIVE_LAWS
    });
  }

  const allSubsets = getSubsets(candidateCoordinates);
  const resolvingSubsets = [];
  const evaluations = [];

  for (const subset of allSubsets) {
    // Partition rows by coordinates in subset
    const groups = new Map();
    for (const row of collidingFiberRows) {
      const coords = row.coordinates || row.antecedent || row;
      const key = subset.map(c => `${c}=${coords[c]}`).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    // Check if every partition group has Gamma = \emptyset
    let subsetResolves = true;
    let maxSubGap = 0;
    const subfibers = [];

    for (const [key, rows] of groups.entries()) {
      const bounds = computeFadtFiberBounds(rows);
      subfibers.push({ partition_key: key, count: rows.length, bounds });
      if (!bounds.exact_descent_exists) {
        subsetResolves = false;
        maxSubGap = Math.max(maxSubGap, bounds.irreducible_gap_cardinality);
      }
    }

    evaluations.push({
      coordinates: subset,
      size: subset.length,
      partition_count: groups.size,
      resolves: subsetResolves,
      max_subfiber_gap: maxSubGap
    });

    if (subsetResolves) {
      resolvingSubsets.push(subset);
    }
  }

  // Filter resolving subsets to minimal subsets (no subset is a proper superset of another resolving subset)
  const minimalResolvingSets = resolvingSubsets.filter(cand =>
    !resolvingSubsets.some(other =>
      other.length < cand.length && other.every(c => cand.includes(c))
    )
  );

  const bestExtension = minimalResolvingSets[0] || null;

  return deepFreeze({
    schema: DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA,
    status: minimalResolvingSets.length > 0
      ? 'RESTORING_COORDINATE_EXTENSION_FOUND'
      : 'NO_EXACT_RESTORING_COORDINATE_FOUND',
    base_gap: baseBounds.irreducible_gap,
    base_gap_cardinality: baseBounds.irreducible_gap_cardinality,
    minimal_resolving_sets: minimalResolvingSets,
    best_extension: bestExtension,
    best_extension_size: bestExtension ? bestExtension.length : null,
    total_evaluations: evaluations.length,
    evaluations: evaluations.slice(0, 32),
    laws: FADT_REPARATIVE_LAWS
  });
}

/**
 * Evaluates the Sharp Discrepancy Identity for a proposed candidate action rule A_y:
 *   |A_y \setminus I_y| + |U_y \setminus A_y| = |\Gamma_y| + |A_y \setminus U_y| + |I_y \setminus A_y|
 */
export function evaluateFadtDiscrepancyIdentity(candidateSupport = [], fiberRows = []) {
  const bounds = computeFadtFiberBounds(fiberRows);
  const candidate = normalizeSupportArray(candidateSupport);

  const unionSet = new Set(bounds.union_support);
  const intersectionSet = new Set(bounds.intersection_support);
  const gapSet = new Set(bounds.irreducible_gap);
  const candidateSet = new Set(candidate);

  // LHS components
  const falseAdmissions = candidate.filter(a => !intersectionSet.has(a));
  const omissions = bounds.union_support.filter(a => !candidateSet.has(a));
  const discrepancyScore = falseAdmissions.length + omissions.length;

  // RHS components
  const outsideUnion = candidate.filter(a => !unionSet.has(a));
  const omittedIntersection = bounds.intersection_support.filter(a => !candidateSet.has(a));
  const rhs = bounds.irreducible_gap_cardinality + outsideUnion.length + omittedIntersection.length;

  const identityVerified = (discrepancyScore === rhs);
  const unlawfulWidening = outsideUnion.length > 0;
  const universallySound = falseAdmissions.length === 0;
  const universallyComplete = omissions.length === 0;
  const insideEnvelope = (!unlawfulWidening && omittedIntersection.length === 0);
  const achievesGapLowerBound = (discrepancyScore === bounds.irreducible_gap_cardinality);

  let disposition;
  let recommendation;

  if (unlawfulWidening) {
    disposition = 'REJECT_UNLAWFUL_WIDENING';
    recommendation = 'REJECT_CANDIDATE_CONTAINS_ACTIONS_NEVER_LAWFUL_UNDER_ANY_ANTECEDENT';
  } else if (universallySound) {
    disposition = 'ACCEPT_UNIVERSALLY_SOUND';
    recommendation = achievesGapLowerBound
      ? 'ACCEPT_LARGEST_UNIVERSALLY_SOUND_SUPPORT'
      : 'ACCEPT_RESTRICTED_SOUND_SUBSET';
  } else {
    disposition = 'PROPOSE_SOUND_SUBSET_INSTEAD';
    recommendation = 'RESTRICT_RULE_TO_INTERSECTION_SUPPORT_TO_ELIMINATE_FALSE_ADMISSIONS';
  }

  return deepFreeze({
    schema: DOLLHOUSE_FADT_DISCREPANCY_IDENTITY_SCHEMA,
    candidate_support: candidate,
    candidate_cardinality: candidate.length,
    union_support: bounds.union_support,
    intersection_support: bounds.intersection_support,
    irreducible_gap: bounds.irreducible_gap,
    false_admissions: falseAdmissions,
    false_admission_cardinality: falseAdmissions.length,
    omissions: omissions,
    omission_cardinality: omissions.length,
    outside_union: outsideUnion,
    outside_union_cardinality: outsideUnion.length,
    omitted_intersection: omittedIntersection,
    omitted_intersection_cardinality: omittedIntersection.length,
    discrepancy_score: discrepancyScore,
    exact_gap_identity_rhs: rhs,
    identity_verified: identityVerified,
    unlawful_widening: unlawfulWidening,
    universally_sound: universallySound,
    universally_complete: universallyComplete,
    inside_envelope: insideEnvelope,
    achieves_gap_lower_bound: achievesGapLowerBound,
    disposition,
    recommendation,
    laws: FADT_REPARATIVE_LAWS
  });
}

/**
 * Compiles a full FADT Reparative Assistance packet for a stage projection problem.
 */
export function compileFadtReparativePacket(options = {}) {
  const { fiber_rows = [], candidate_coordinates = [], candidate_rule = null } = options;
  const bounds = computeFadtFiberBounds(fiber_rows);

  let coordinateRecovery = null;
  if (!bounds.exact_descent_exists && candidate_coordinates.length > 0) {
    coordinateRecovery = evaluateFadtCoordinateRecovery(fiber_rows, candidate_coordinates);
  }

  let discrepancyAudit = null;
  if (candidate_rule !== null) {
    discrepancyAudit = evaluateFadtDiscrepancyIdentity(candidate_rule, fiber_rows);
  }

  return deepFreeze({
    schema: DOLLHOUSE_FADT_REPARATIVE_ASSISTANCE_SCHEMA,
    status: bounds.exact_descent_exists ? 'EXACT_DESCENT_VERIFIED' : 'REPARATIVE_ASSISTANCE_ACTIVE',
    bounds,
    immediate_sound_action_support: bounds.intersection_support,
    irreducible_gap: bounds.irreducible_gap,
    coordinate_recovery: coordinateRecovery,
    discrepancy_audit: discrepancyAudit,
    operator_guidance: bounds.exact_descent_exists
      ? 'Exact finite admissibility descent holds; full support descends without loss.'
      : (bounds.universally_sound_available
          ? `Immediate execution of universally sound support [${bounds.intersection_support.join(', ')}] is permitted without widening. Retain coordinate(s) [${coordinateRecovery?.best_extension?.join(', ') || 'N/A'}] to eliminate the irreducible gap.`
          : 'Intersection support is empty. No universally sound action exists under this stage projection without coordinate retention.'),
    laws: FADT_REPARATIVE_LAWS
  });
}
