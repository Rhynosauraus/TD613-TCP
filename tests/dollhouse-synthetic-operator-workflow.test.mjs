import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fileSha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// 1. Pedagogue Dromological Adapter
import {
  runPedagogueAgent,
  auditDollhouseDromologicalCadence,
  auditDollhouseInstitutionalTime
} from '../app/engine/dollhouse-pedagogue-dromological.js';

// 2. Aperture v3.2 Numerical Deficit & SVD
import {
  computeMatrixSvd,
  evaluateCandidateProbeStability
} from '../app/engine/aperture-v32-typed-epistemic-deficit.js';

// 3. Atlas PR #984 Relational Custody & Holonomy Parity
import {
  classifyAtlasRelationIdentity,
  auditAtlasHolonomyHistoryParity
} from '../app/engine/dollhouse-atlas-relational-custody.js';

// 4. FADT Reparative Assistance & Discrepancy Identity
import {
  computeFadtFiberBounds,
  evaluateFadtCoordinateRecovery,
  evaluateFadtDiscrepancyIdentity,
  compileFadtReparativePacket
} from '../app/engine/dollhouse-fadt-reparative-assistance.js';

// 5. Temporal Custodian
import { runTemporalCustodianAudit } from '../app/engine/dollhouse-temporal-custodian.js';

// 6. Orchestrator Case Dossier & Multi-Role Ablation
import { createDollhouseCaseDossier } from '../app/engine/dollhouse-case-dossier.js';
import { runCompleteDollhouseAblation } from '../app/engine/dollhouse-ablation-harness.js';

test('SYNTHETIC OPERATOR WORKFLOW: Demonstration of 5-Doll Scientific Fidelity, Reparative Recovery, and Orchestrator Necessity', async (t) => {

  // =========================================================================
  // CHALLENGE 1: SCIENTIFIC FIDELITY
  // Verify that all 5 dolls actually execute their restored methods and fail closed
  // =========================================================================
  await t.test('1. Scientific Fidelity: All 5 dolls execute restored methods and detect domain infractions', () => {
    // 1A. Pedagogue: Detects premature naming (name before world answer) and preemption gap
    const pedCadence = runPedagogueAgent({
      audit_id: 'op-cadence-fault',
      events: [
        { phase: 'NOTICE', at: 10 },
        { phase: 'ACT', at: 20 },
        { phase: 'NAME', at: 25 }, // FAULT: naming before consequence
        { phase: 'WORLD_ANSWERS', at: 30 }
      ]
    });
    assert.equal(pedCadence.agent, 'PEDAGOGUE');
    assert.equal(pedCadence.verdict, 'HELD');
    assert.ok(pedCadence.violations.includes('PREMATURE_NAMING'));

    const pedTime = runPedagogueAgent({
      case_id: 'op-time-fault',
      clocks: { t_op: 10, t_inst: 40 }, // FAULT: acts 30 ticks before counts
      closure: { closure_class: 'drift', score: 0.5 }
    });
    assert.equal(pedTime.verdict, 'HELD');
    assert.equal(pedTime.preemption_gap, 30);
    assert.equal(pedTime.acts_before_counts, true);

    // 1B. Aperture: Detects numerical stability cliff (Counterexample 1)
    const baseMatrix = [[1.0, 0.0]];
    const illConditionedProbe = [1.0, 1e-5]; // nearly collinear probe
    const apertureAudit = evaluateCandidateProbeStability({
      current_operator: baseMatrix,
      candidate_probes: [illConditionedProbe],
      sigma_min_floor: 1e-3,
      condition_number_ceiling: 1e3
    });
    const candidateResult = apertureAudit.candidates[0];
    assert.equal(candidateResult.deficit_class, 'NUMERICAL_STABILITY_DEFICIT');
    assert.equal(candidateResult.recommendation, 'REJECT_CANDIDATE_DUE_TO_NOISE_AMPLIFICATION');
    assert.equal(candidateResult.is_acceptable, false);
    assert.ok(candidateResult.condition_number > 1e3);

    // 1C. Atlas: Detects holonomy loop-power history parity violation (same endpoint, different winding)
    const atlasAudit = auditAtlasHolonomyHistoryParity(
      { endpoint: 'DOME_REST', winding_number: 0 },
      { endpoint: 'DOME_REST', winding_number: 2 } // FAULT: wound 2 loops around singularity
    );
    assert.equal(atlasAudit.disposition, 'HOLD_DISTINCT_HISTORY_NOT_ERASED');
    assert.equal(atlasAudit.endpoints_equal, true);
    assert.equal(atlasAudit.history_parity_equal, false);
    assert.equal(atlasAudit.winding_delta, -2);

    // 1D. FADT: Detects unlawful widening (violates sharp discrepancy lower bound)
    const fiberRows = [
      { id: 's1', support: ['READ', 'STAGE'] },
      { id: 's2', support: ['READ', 'DELETE'] }
    ];
    const fadtBounds = computeFadtFiberBounds(fiberRows);
    assert.deepEqual(fadtBounds.intersection_support, ['READ']);
    assert.deepEqual(fadtBounds.union_support, ['DELETE', 'READ', 'STAGE']);
    assert.deepEqual(fadtBounds.irreducible_gap, ['DELETE', 'STAGE']);

    const fadtWideningAudit = evaluateFadtDiscrepancyIdentity(['READ', 'MUTATE_PRODUCTION'], fiberRows);
    assert.equal(fadtWideningAudit.disposition, 'REJECT_UNLAWFUL_WIDENING');
    assert.equal(fadtWideningAudit.unlawful_widening, true);
    assert.deepEqual(fadtWideningAudit.outside_union, ['MUTATE_PRODUCTION']);

    // 1E. Temporal Custodian: Detects missing required phase and non-monotonic chronology
    const temporalAudit = runTemporalCustodianAudit({
      audit_id: 'temporal-fault',
      required_phases: ['INTENT', 'OBSERVE', 'VERIFY'],
      phase_evidence: {
        INTENT: { timestamp: '2026-10-21T10:00:00Z', predecessor_sha: 'a'.repeat(64) },
        VERIFY: { timestamp: '2026-10-21T09:00:00Z', predecessor_sha: 'b'.repeat(64) } // FAULT: missing OBSERVE & backward timestamp
      }
    });
    assert.equal(temporalAudit.verdict, 'HELD');
  });

  // =========================================================================
  // CHALLENGE 2: REPARATIVE UTILITY
  // Demonstrate how the system guides the operator to recover and complete a permitted task
  // =========================================================================
  await t.test('2. Reparative Utility: Operator recovers from errors and completes permitted task under doll guidance', () => {
    // 2A. Pedagogue Recovery: Operator adopts canonical sequence with adequate dwell time
    const repairedCadence = runPedagogueAgent({
      audit_id: 'op-cadence-repaired',
      events: [
        { phase: 'NOTICE', at: 10 },
        { phase: 'ACT', at: 20 },
        { phase: 'WORLD_ANSWERS', at: 30 },
        { phase: 'NAME', at: 45 },
        { phase: 'REST', at: 50 },
        { phase: 'EXIT', at: 60 }
      ],
      cadence_constraints: {
        minimum_world_answer_dwell: 10,
        rest_required: true,
        exit_required: true
      }
    });
    assert.equal(repairedCadence.verdict, 'SUPPORTED');
    assert.deepEqual(repairedCadence.violations, []);

    // 2B. Aperture Recovery: Operator adopts orthogonal, well-conditioned probe
    const wellConditionedProbe = [0.0, 1.0];
    const base2D = [[1.0, 0.0]];
    const repairedAperture = evaluateCandidateProbeStability({
      current_operator: base2D,
      candidate_probes: [wellConditionedProbe],
      sigma_min_floor: 1e-3,
      condition_number_ceiling: 1e3
    });
    const candidateResult = repairedAperture.candidates[0];
    assert.equal(candidateResult.is_acceptable, true);
    assert.equal(candidateResult.delta_rank, 1);
    assert.ok(candidateResult.condition_number < 10);
    assert.equal(candidateResult.recommendation, 'ACCEPT_STABLE_WIDENING_PROBE');

    // 2C. Atlas Recovery: Operator preserves exact member hashes and zero winding delta
    const repairedAtlas = auditAtlasHolonomyHistoryParity(
      { endpoint: 'DOME_REST', winding_number: 0 },
      { endpoint: 'DOME_REST', winding_number: 0 }
    );
    assert.equal(repairedAtlas.disposition, 'PASS');
    assert.equal(repairedAtlas.history_parity_equal, true);
    assert.equal(repairedAtlas.winding_delta, 0);

    // 2D. FADT Recovery: FADT provides largest sound support I_y for immediate execution
    // and evaluates XOR coordinate interaction to partition fiber into constant supports
    const fadtPacket = compileFadtReparativePacket({
      fiber_rows: [
        { id: 's1', support: ['READ', 'STAGE'], coordinates: { c1: 0, c2: 0 } },
        { id: 's2', support: ['READ', 'STAGE'], coordinates: { c1: 1, c2: 1 } },
        { id: 's3', support: ['READ', 'DELETE'], coordinates: { c1: 0, c2: 1 } },
        { id: 's4', support: ['READ', 'DELETE'], coordinates: { c1: 1, c2: 0 } }
      ],
      candidate_coordinates: ['c1', 'c2'],
      candidate_rule: ['READ'] // Universally sound action!
    });
    assert.equal(fadtPacket.status, 'REPARATIVE_ASSISTANCE_ACTIVE');
    assert.deepEqual(fadtPacket.immediate_sound_action_support, ['READ']);
    assert.equal(fadtPacket.coordinate_recovery.status, 'RESTORING_COORDINATE_EXTENSION_FOUND');
    assert.deepEqual(fadtPacket.coordinate_recovery.best_extension, ['c1', 'c2']);
    assert.equal(fadtPacket.discrepancy_audit.universally_sound, true);

    // 2E. Temporal Custodian Recovery: Complete, monotonic, causal phase chain from valid fixture
    const temporalFixture = JSON.parse(readFileSync(new URL('./fixtures/dollhouse/bounded-orchestrator-case.json', import.meta.url))).temporal;
    const repairedTemporal = runTemporalCustodianAudit(temporalFixture);
    assert.equal(repairedTemporal.verdict, 'PASS');
    assert.equal(repairedTemporal.ledger_audit.baseline_compared, true);

    // 2F. Orchestrator Synthesis: Unified 5-Doll Case Dossier
    const unifiedDossier = createDollhouseCaseDossier({
      schema: 'td613.dollhouse.case-dossier/v0.1',
      case_id: 'synthetic-operator-repaired-case-01',
      source_revision: '78c7ea6b974e176611fb2ed4d0c59649ebf05f62',
      repair_demonstration: {
        initial_verdict: 'HELD',
        reparative_action: 'Operator adopted canonical cadence, well-conditioned aperture probe, zero-winding atlas path, and largest sound FADT support',
        post_repair_verdict: 'SUPPORTED',
        verified: true,
        verification_mode: 'INDEPENDENT_AUDIT_WITNESS'
      },
      findings: [
        {
          id: 'find-pedagogue-01',
          agent: 'PEDAGOGUE',
          claim_key: 'workflow.cadence.order',
          verdict: 'SUPPORTED',
          evidence_class: 'OFFLINE_TEST',
          observation_scope: { source: 'local', instrument: 'dromological-audit', condition: 'canonical-cadence', temporal_window: 't10-t60' },
          reference: { artifact: 'app/engine/dollhouse-pedagogue-dromological.js', sha256: fileSha256('app/engine/dollhouse-pedagogue-dromological.js') },
          limitations: ['declared-integer-ticks-only']
        },
        {
          id: 'find-aperture-01',
          agent: 'APERTURE',
          claim_key: 'workflow.probe.stability',
          verdict: 'SUPPORTED',
          evidence_class: 'OFFLINE_TEST',
          observation_scope: { source: 'local', instrument: 'jacobi-svd', condition: 'well-conditioned-probe', temporal_window: 't10-t60' },
          reference: { artifact: 'app/engine/aperture-v32-typed-epistemic-deficit.js', sha256: fileSha256('app/engine/aperture-v32-typed-epistemic-deficit.js') },
          limitations: ['linear-latent-model-only']
        },
        {
          id: 'find-atlas-01',
          agent: 'ATLAS',
          claim_key: 'workflow.holonomy.parity',
          verdict: 'SUPPORTED',
          evidence_class: 'OFFLINE_TEST',
          observation_scope: { source: 'local', instrument: 'history-parity-auditor', condition: 'zero-winding-delta', temporal_window: 't10-t60' },
          reference: { artifact: 'app/engine/dollhouse-atlas-relational-custody.js', sha256: fileSha256('app/engine/dollhouse-atlas-relational-custody.js') },
          limitations: ['receiver-turn-projection-only']
        },
        {
          id: 'find-fadt-01',
          agent: 'FADT',
          claim_key: 'workflow.fadt.sound-support',
          verdict: 'SUPPORTED',
          evidence_class: 'OFFLINE_TEST',
          observation_scope: { source: 'local', instrument: 'fadt-reparative-assistance', condition: 'universally-sound-rule', temporal_window: 't10-t60' },
          reference: { artifact: 'app/engine/dollhouse-fadt-reparative-assistance.js', sha256: fileSha256('app/engine/dollhouse-fadt-reparative-assistance.js') },
          limitations: ['finite-quotient-support-only']
        },
        {
          id: 'find-temporal-01',
          agent: 'TEMPORAL_CUSTODIAN',
          claim_key: 'workflow.chronology.integrity',
          verdict: 'SUPPORTED',
          evidence_class: 'OFFLINE_TEST',
          observation_scope: { source: 'local', instrument: 'temporal-custodian', condition: 'monotonic-causal-phases', temporal_window: 't10-t60' },
          reference: { artifact: 'app/engine/dollhouse-temporal-custodian.js', sha256: fileSha256('app/engine/dollhouse-temporal-custodian.js') },
          limitations: ['local-monotonic-timestamps-only']
        }
      ]
    });

    // Verify 5-Role Coverage
    assert.equal(unifiedDossier.agent_coverage.length, 5);
    assert.ok(unifiedDossier.agent_coverage.every(item => item.present === true));
    assert.equal(unifiedDossier.disagreements.length, 0);
    assert.equal(unifiedDossier.unresolved_finding_ids.length, 0);

    // Verify 6-Vector Sedgwickian Knowledge-Survival
    const survival = unifiedDossier.evidence_posture.knowledge_survival;
    assert.equal(survival.retrievability, 1.0);
    assert.equal(survival.attributable_provenance, 1.0);
    assert.equal(survival.interpretability, 1.0);
    assert.equal(survival.transmissibility, 1.0);
    assert.equal(survival.contestability, 0.5); // clean consensus
    assert.equal(survival.repairability, 1.0);

    // Verify Measured Capacities Statuses
    assert.equal(survival.capacities.retrievability.status, 'VERIFIED');
    assert.equal(survival.capacities.attributable_provenance.status, 'LOCAL_BYTE_CONSISTENT');
    assert.equal(survival.capacities.interpretability.status, 'VERIFIED');
    assert.equal(survival.capacities.transmissibility.status, 'DEMONSTRATED');
    assert.equal(survival.capacities.contestability.status, 'CALIBRATED_CONSENSUS');
    assert.equal(survival.capacities.repairability.status, 'DEMONSTRATED');

    // Verify Governance Boundaries
    assert.equal(unifiedDossier.authority.human_closure_required, true);
    assert.equal(unifiedDossier.authority.release, false);
    assert.equal(unifiedDossier.authority.merge, false);
  });

  // =========================================================================
  // CHALLENGE 3: ORCHESTRATOR NECESSITY
  // Prove that all 5 roles are non-redundant and necessary to prevent unsafe outcomes
  // =========================================================================
  await t.test('3. Orchestrator Necessity: Five-doll architecture strictly dominates smaller teams', () => {
    const mockAudits = {
      PEDAGOGUE: { concern: 'Broken return promise trapped operator', jurisdiction: 'human_consequence_and_burden' },
      APERTURE: { concern: 'URL hash does not equal workspace admitted', jurisdiction: 'observability_and_identifiability' },
      ATLAS: { concern: 'Predecessor chain unverified across windows', jurisdiction: 'receiver_relative_custody' },
      FADT: { concern: 'Action grant exposed under erased conditioning', jurisdiction: 'finite_support_boundary' },
      TEMPORAL_CUSTODIAN: { concern: 'Phase 3 lacks phase 2 parent citation', jurisdiction: 'chronological_sequence' }
    };

    const ablationReport = runCompleteDollhouseAblation(mockAudits);
    assert.equal(ablationReport.total_conditions, 13);
    assert.equal(ablationReport.full_five_role_verdict, 'HELD');
    assert.equal(ablationReport.evaluated_roles.length, 5);

    // Verify each minus-one condition fails its unique jurisdiction in empirical trials
    assert.equal(ablationReport.diff_metrics.MINUS_PEDAGOGUE.empirical_trial_escaped_classification, 'HUMAN_COST_IGNORED');
    assert.equal(ablationReport.diff_metrics.MINUS_APERTURE.empirical_trial_escaped_classification, 'FALSE_COMPLETION_ADMITTED');
    assert.equal(ablationReport.diff_metrics.MINUS_ATLAS.empirical_trial_escaped_classification, 'CUSTODY_FORK_RISK_ACCEPTED');
    assert.equal(ablationReport.diff_metrics.MINUS_FADT.empirical_trial_escaped_classification, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
    assert.equal(ablationReport.diff_metrics.MINUS_TEMPORAL_CUSTODIAN.empirical_trial_escaped_classification, 'CHRONOLOGICAL_OBLIVION_ADMITTED');

    assert.equal(ablationReport.empirical_trials.MINUS_PEDAGOGUE.evaluation.escaped_classification, 'HUMAN_COST_IGNORED');
    assert.equal(ablationReport.empirical_trials.MINUS_APERTURE.evaluation.escaped_classification, 'FALSE_COMPLETION_ADMITTED');
    assert.equal(ablationReport.empirical_trials.MINUS_ATLAS.evaluation.escaped_classification, 'CUSTODY_FORK_RISK_ACCEPTED');
    assert.equal(ablationReport.empirical_trials.MINUS_FADT.evaluation.escaped_classification, 'ILLEGAL_ACTION_ESCALATION_ACCEPTED');
    assert.equal(ablationReport.empirical_trials.MINUS_TEMPORAL_CUSTODIAN.evaluation.escaped_classification, 'CHRONOLOGICAL_OBLIVION_ADMITTED');

    // Verify non-redundancy diff metrics
    assert.ok(ablationReport.diff_metrics.MINUS_PEDAGOGUE.lost_findings_count === 1);
    assert.ok(ablationReport.diff_metrics.MINUS_APERTURE.lost_findings_count === 1);
    assert.ok(ablationReport.diff_metrics.MINUS_ATLAS.lost_findings_count === 1);
    assert.ok(ablationReport.diff_metrics.MINUS_FADT.lost_findings_count === 1);
    assert.ok(ablationReport.diff_metrics.MINUS_TEMPORAL_CUSTODIAN.lost_findings_count === 1);

    // Verify false consensus defense on offline synthetic execution vs shared acquisition
    assert.equal(ablationReport.replication_audit.empirical_replication_count, 0);
    assert.equal(ablationReport.replication_audit.status, 'SYNTHETIC_EXECUTION_ZERO_EMPIRICAL_REPLICATION');
  });

});
