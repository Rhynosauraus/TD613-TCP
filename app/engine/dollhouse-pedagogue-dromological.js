import { freeze, noForbidden, object, text } from './flowcore-pedagogue-utils.js';
import {
  compileInstitutionalTimeAudit,
  compileDromologicalSequenceAudit,
  PEDAGOGUE_INSTITUTIONAL_TIME_AUDIT_SCHEMA,
  PEDAGOGUE_DROMOLOGICAL_SEQUENCE_AUDIT_SCHEMA
} from './pedagogue-institutional-time.js';
import {
  compilePedagogueLineageSecondPass,
  PEDAGOGUE_LINEAGE_SECOND_PASS_SCHEMA
} from './pedagogue-lineage-second-pass.js';
import { compilePedagogueGestureConsequenceAudit } from './pedagogue-gesture-consequence.js';

export const DOLLHOUSE_PEDAGOGUE_DROMOLOGICAL_SCHEMA = 'td613.dollhouse.pedagogue-dromological/v0.1';

/**
 * Dollhouse Pedagogue Dromological Adapter
 *
 * Operationalizes Pedagogue's dromological inheritance within the Dollhouse:
 * 1. Dromological Sequence & Cadence Auditing:
 *    Enforces the canonical partial order: NOTICE < ACT < WORLD_ANSWERS < NAME.
 *    Detects ACTION_BEFORE_NOTICE, PREMATURE_NAMING, ASSESSMENT_BEFORE_CONSEQUENCE,
 *    CADENCE_COMPRESSION, REST_WITHHELD, and EXIT_WITHHELD.
 * 2. Institutional Time Preemption Gap:
 *    Computes Pi(s) = t_inst(s) - t_op(s) and public visibility lag.
 *    Detects ACTS_BEFORE_COUNTS and context registration lag without inventing clocks.
 * 3. Lineage Second Pass:
 *    Routes declared machine deficits through provenance lenses without thinker voting.
 *
 * Invariant: Route audit only, never user diagnosis. No learner profiles.
 */

export function auditDollhouseDromologicalCadence(cadenceInput = {}) {
  noForbidden(cadenceInput);
  const input = {
    audit_id: cadenceInput.audit_id || 'dollhouse-pedagogue-cadence-audit',
    ...cadenceInput
  };
  const rawAudit = compileDromologicalSequenceAudit(input);
  const violations = rawAudit.violations || [];
  const verdict = violations.length === 0 ? 'SUPPORTED' : 'HELD';
  
  return freeze({
    schema: DOLLHOUSE_PEDAGOGUE_DROMOLOGICAL_SCHEMA,
    kind: 'DROMOLOGICAL_SEQUENCE_AUDIT',
    verdict,
    violations,
    canonical_order_satisfied: violations.length === 0,
    cadence: rawAudit.cadence,
    phase_times: rawAudit.phase_times,
    context_registration_lag: rawAudit.context_registration_lag,
    authority: rawAudit.authority,
    scope: rawAudit.scope,
    raw_audit: rawAudit
  });
}

export function auditDollhouseInstitutionalTime(timeInput = {}) {
  noForbidden(timeInput);
  const input = {
    case_id: timeInput.case_id || 'dollhouse-pedagogue-time-case',
    ...timeInput
  };
  const rawAudit = compileInstitutionalTimeAudit(input);
  const actsBeforeCounts = rawAudit.preemption.acts_before_counts;
  const preemptionGap = rawAudit.preemption.preemption_gap;
  const verdict = actsBeforeCounts ? 'HELD' : 'SUPPORTED';

  return freeze({
    schema: DOLLHOUSE_PEDAGOGUE_DROMOLOGICAL_SCHEMA,
    kind: 'INSTITUTIONAL_TIME_AUDIT',
    verdict,
    preemption_gap: preemptionGap,
    acts_before_counts: actsBeforeCounts,
    context_lags_action: rawAudit.preemption.context_lags_action,
    rupture: rawAudit.rupture.failed_faithful_closure,
    classification: rawAudit.classification,
    authority: rawAudit.authority,
    scope: rawAudit.scope,
    raw_audit: rawAudit
  });
}

export function auditDollhouseLineageSecondPass(secondPassInput = {}) {
  noForbidden(secondPassInput);
  const rawAudit = compilePedagogueLineageSecondPass(secondPassInput);
  return freeze({
    schema: DOLLHOUSE_PEDAGOGUE_DROMOLOGICAL_SCHEMA,
    kind: 'LINEAGE_SECOND_PASS_AUDIT',
    verdict: 'SUPPORTED',
    activated_lenses: rawAudit.activated_lenses,
    dormant_lenses: rawAudit.dormant_lenses,
    activation_count: rawAudit.activation_count,
    authority: rawAudit.authority,
    raw_audit: rawAudit
  });
}

/**
 * Unified Operational Dollhouse Pedagogue Agent
 */
export function runPedagogueAgent(input = {}) {
  noForbidden(input);
  const value = object(input, 'input');

  // Route 1: Cadence / Dromological Sequence Input
  if (value.events || value.cadence_constraints) {
    const cadenceResult = auditDollhouseDromologicalCadence(value);
    return freeze({
      agent: 'PEDAGOGUE',
      role: 'DROMOLOGICAL_CADENCE_AND_SEQUENCE_AUDITOR',
      verdict: cadenceResult.verdict,
      violations: cadenceResult.violations,
      details: cadenceResult,
      authority: { recommendation_only: true, human_closure_required: true }
    });
  }

  // Route 2: Institutional Time Clocks Input
  if (value.clocks) {
    const timeResult = auditDollhouseInstitutionalTime(value);
    return freeze({
      agent: 'PEDAGOGUE',
      role: 'INSTITUTIONAL_TIME_AUDITOR',
      verdict: timeResult.verdict,
      preemption_gap: timeResult.preemption_gap,
      acts_before_counts: timeResult.acts_before_counts,
      details: timeResult,
      authority: { recommendation_only: true, human_closure_required: true }
    });
  }

  // Route 3: Lineage Second Pass Input
  if (value.pass_id && value.declared_system_signals) {
    const passResult = auditDollhouseLineageSecondPass(value);
    return freeze({
      agent: 'PEDAGOGUE',
      role: 'LINEAGE_SECOND_PASS_ROUTER',
      verdict: passResult.verdict,
      activated_lenses: passResult.activated_lenses,
      details: passResult,
      authority: { recommendation_only: true, human_closure_required: true }
    });
  }

  // Route 4: Gesture Consequence Input (Historical Adapter)
  if (value.gestures || value.task) {
    const consequenceResult = compilePedagogueGestureConsequenceAudit(value);
    return freeze({
      agent: 'PEDAGOGUE',
      role: 'GESTURE_CONSEQUENCE_AUDITOR',
      verdict: consequenceResult.verdict || 'SUPPORTED',
      details: consequenceResult,
      authority: { recommendation_only: true, human_closure_required: true }
    });
  }

  throw new TypeError('Pedagogue agent requires cadence events, clocks, lineage signals, or gestures.');
}
