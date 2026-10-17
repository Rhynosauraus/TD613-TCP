// Shared browser/Node computation over unchanged authored finite kernels.
// A recomputed fixture is neither a live observer measurement nor an empirical
// acquisition, and a carried source revision remains an unauthenticated label.
import { runHardenedDiscreteTransportTomographyAssay } from '../dome-world/previews/a15-r0/discrete-transport-tomography-closed-loop-hardened.js';
import { runNoncommutingTwoFaceHolonomyTomographyHoldout } from '../dome-world/previews/a15-r0/noncommuting-two-face-holonomy-tomography.js';
import { buildGoldenEggFeasibleRegion } from '../dome-world/previews/a15-r0/golden-egg-feasible-region.js';
export { buildPortableLoomResearchMathContract } from './portable-loom-research-math.js';

export const PORTABLE_LOOM_MATH_SOURCE_PATHS = Object.freeze([
  'app/dome-world/previews/a15-r0/discrete-transport-tomography-closed-loop.js',
  'app/dome-world/previews/a15-r0/discrete-transport-tomography-closed-loop-hardened.js',
  'app/dome-world/previews/a15-r0/noncommuting-two-face-holonomy-tomography.js',
  'app/dome-world/previews/a15-r0/golden-egg-feasible-region.js',
  'app/dome-world/previews/a15-r0/open-research-field.js',
  'app/dome-world/previews/a15-r0/boolean-synergy-census.js',
  'app/dome-world/previews/a15-r0/a15-r0-contracts.js',
  'app/dome-world/previews/a15-r0/a15-r0-contracts-core.js',
  'app/dome-world/ash-a15-empirical-profile-journeys.js',
  'app/engine/dollhouse-claim-lift-runtime.js',
  'app/engine/portable-loom-tomography-fixtures.js',
  'app/engine/portable-loom-research-math.js'
]);

export function runPortableLoomTomographyFixtureAudit(sourceRevision) {
  if (typeof sourceRevision !== 'string' || !sourceRevision.trim() || sourceRevision.length > 80) {
    throw new TypeError('A declared source revision is required for the finite fixture report.');
  }
  const transport = runHardenedDiscreteTransportTomographyAssay();
  const surface = runNoncommutingTwoFaceHolonomyTomographyHoldout();
  const region = buildGoldenEggFeasibleRegion();
  if (transport.findings.hardened_assay_mechanism_validated !== true
    || transport.claims.holonomy_loom_runtime !== false
    || surface.findings.assay_mechanism_validated !== true
    || surface.claim_ceiling.production_authority !== false
    || region.joint_realizability !== 'UNMEASURED'
    || region.golden_egg_earned !== false
    || region.empirical_candidate_count !== 0) {
    throw new Error('Canonical discrete-math fixture or claim ceiling failed.');
  }
  return {
    schema: 'td613.loom.portable-tomography-audit/v0.1',
    artifact_source_revision: sourceRevision,
    mathematical_modules_recomputed: true,
    transport: {
      schema: transport.schema,
      arithmetic_domain: transport.arithmetic_domain,
      hardened_nullspace_control_pass: transport.findings.primary_projection_nullspace_persists_through_common_heldout_probe,
      valid_finite_fixture: transport.findings.hardened_assay_mechanism_validated
    },
    face_holonomy: {
      schema: surface.schema,
      arithmetic_domain: surface.arithmetic_domain,
      distinct_noncommuting_loops_observed_in_authored_fixture: surface.findings.local_face_holonomies_noncommute,
      wrong_basepoint_rejected: surface.findings.wrong_basepoint_control_rejected,
      wrong_order_rejected: surface.findings.wrong_order_control_rejected,
      valid_finite_fixture: surface.findings.assay_mechanism_validated
    },
    feasible_region: {
      schema: region.schema,
      source_status: region.source_status,
      thresholds: region.thresholds,
      formal_candidate_count: region.formal_candidate_count,
      feasible_candidate_count: region.feasible_candidate_count,
      pareto_candidate_count: region.pareto_candidate_count,
      joint_realizability: region.joint_realizability
    },
    observed_real_routes: 'NOT_RUN',
    observed_protected_conversation: 'NOT_RUN',
    empirical_acquisition: 'NOT_RUN',
    independent_origin_authentication: 'NOT_PERFORMED',
    measured_g: null,
    observed_matched_control_protected_returns: null,
    empirical_golden_egg_earned: false,
    claim_ceiling: 'EXACT_AUTHORED_FINITE_MATHEMATICS_ONLY'
  };
}
