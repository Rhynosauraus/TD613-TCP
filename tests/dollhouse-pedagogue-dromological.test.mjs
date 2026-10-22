import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditDollhouseDromologicalCadence,
  auditDollhouseInstitutionalTime,
  auditDollhouseLineageSecondPass,
  runPedagogueAgent
} from '../app/engine/dollhouse-pedagogue-dromological.js';
import { getDollhouseAgent } from '../app/engine/dollhouse-agent-registry.js';

test('Pedagogue registry entry exposes dromological and institutional time audit extensions', () => {
  const agent = getDollhouseAgent('PEDAGOGUE');
  assert.ok(agent);
  assert.equal(agent.id, 'PEDAGOGUE');
  assert.ok(agent.audit_extensions.includes('app/engine/dollhouse-pedagogue-dromological.js::runPedagogueAgent'));
  assert.ok(agent.audit_extensions.includes('app/engine/dollhouse-pedagogue-dromological.js::auditDollhouseDromologicalCadence'));
  assert.ok(agent.audit_extensions.includes('app/engine/dollhouse-pedagogue-dromological.js::auditDollhouseInstitutionalTime'));
  assert.ok(agent.audit_extensions.includes('app/engine/pedagogue-institutional-time.js::compileDromologicalSequenceAudit'));
  assert.ok(agent.audit_extensions.includes('app/engine/pedagogue-lineage-second-pass.js::compilePedagogueLineageSecondPass'));
});

test('auditDollhouseDromologicalCadence verifies canonical partial order NOTICE < ACT < WORLD_ANSWERS < NAME', () => {
  const result = auditDollhouseDromologicalCadence({
    audit_id: 'canonical-cadence-01',
    events: [
      { phase: 'NOTICE', at: 10 },
      { phase: 'ACT', at: 20 },
      { phase: 'WORLD_ANSWERS', at: 30 },
      { phase: 'NAME', at: 40 }
    ]
  });

  assert.equal(result.verdict, 'SUPPORTED');
  assert.equal(result.canonical_order_satisfied, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.scope.route_audit_not_person_diagnosis, true);
  assert.equal(result.scope.learner_profile_created, false);
});

test('auditDollhouseDromologicalCadence detects PREMATURE_NAMING and ACTION_BEFORE_NOTICE', () => {
  // Scenario 1: Premature Naming (naming before world answers)
  const prematureNaming = auditDollhouseDromologicalCadence({
    audit_id: 'premature-naming-01',
    events: [
      { phase: 'NOTICE', at: 10 },
      { phase: 'ACT', at: 20 },
      { phase: 'NAME', at: 25 },
      { phase: 'WORLD_ANSWERS', at: 30 }
    ]
  });
  assert.equal(prematureNaming.verdict, 'HELD');
  assert.ok(prematureNaming.violations.includes('PREMATURE_NAMING'));

  // Scenario 2: Action Before Notice (operator forced to act blind)
  const actionBeforeNotice = auditDollhouseDromologicalCadence({
    audit_id: 'action-before-notice-01',
    events: [
      { phase: 'ACT', at: 5 },
      { phase: 'NOTICE', at: 10 },
      { phase: 'WORLD_ANSWERS', at: 30 },
      { phase: 'NAME', at: 40 }
    ]
  });
  assert.equal(actionBeforeNotice.verdict, 'HELD');
  assert.ok(actionBeforeNotice.violations.includes('ACTION_BEFORE_NOTICE'));
});

test('auditDollhouseDromologicalCadence detects CADENCE_COMPRESSION, REST_WITHHELD, and EXIT_WITHHELD', () => {
  const compressed = auditDollhouseDromologicalCadence({
    audit_id: 'cadence-compressed-01',
    events: [
      { phase: 'NOTICE', at: 10 },
      { phase: 'ACT', at: 20 },
      { phase: 'WORLD_ANSWERS', at: 30 },
      { phase: 'NAME', at: 32 }
    ],
    cadence_constraints: {
      minimum_world_answer_dwell: 10,
      rest_required: true,
      exit_required: true
    }
  });

  assert.equal(compressed.verdict, 'HELD');
  assert.ok(compressed.violations.includes('CADENCE_COMPRESSION'));
  assert.ok(compressed.violations.includes('REST_WITHHELD'));
  assert.ok(compressed.violations.includes('EXIT_WITHHELD'));
});

test('auditDollhouseInstitutionalTime computes Pi(s) preemption gap and detects ACTS_BEFORE_COUNTS', () => {
  // Scenario 1: Institutional Preemption (operator acted at 10, institution registered at 25 => Pi = 15)
  const preempted = auditDollhouseInstitutionalTime({
    case_id: 'preemption-case-01',
    clocks: {
      t_op: 10,
      t_inst: 25,
      t_sense: 5,
      t_model: 8,
      t_pub: 30,
      t_context: 20
    },
    closure: {
      closure_class: 'drift',
      score: 0.8
    }
  });

  assert.equal(preempted.verdict, 'HELD');
  assert.equal(preempted.preemption_gap, 15);
  assert.equal(preempted.acts_before_counts, true);
  assert.equal(preempted.rupture, true);
  assert.equal(preempted.classification, 'INSTITUTIONAL_PREEMPTION_PRESENT');

  // Scenario 2: Synchronous Registration (operator acted at 10, institution registered at 10 => Pi = 0)
  const synchronous = auditDollhouseInstitutionalTime({
    case_id: 'sync-case-01',
    clocks: {
      t_op: 10,
      t_inst: 10,
      t_sense: 10,
      t_model: 10,
      t_pub: 10,
      t_context: 10
    },
    closure: {
      closure_class: 'closed',
      score: 1.0
    }
  });

  assert.equal(synchronous.verdict, 'SUPPORTED');
  assert.equal(synchronous.preemption_gap, 0);
  assert.equal(synchronous.acts_before_counts, false);
  assert.equal(synchronous.rupture, false);
});

test('auditDollhouseLineageSecondPass routes declared machine deficits through provenance lenses', () => {
  const result = auditDollhouseLineageSecondPass({
    pass_id: 'second-pass-01',
    declared_system_signals: [
      'TRANSFER_ROUTE_FRAGMENTED',
      'PROCESS_WITNESS_MISSING'
    ]
  });

  assert.equal(result.verdict, 'SUPPORTED');
  assert.ok(result.activation_count > 0);
  assert.ok(result.activated_lenses.some(lens => lens.lens_id === 'EXPERIENCE_CONTINUITY'));
  assert.ok(result.activated_lenses.some(lens => lens.lens_id === 'THIRD_TEACHER_DOCUMENTATION'));
  assert.equal(result.raw_audit.thinker_vote_forbidden, true);
  assert.equal(result.raw_audit.human_profile_inference, false);
});

test('runPedagogueAgent routes cadence, clocks, and gestures with fail-closed verdicts', () => {
  // Cadence invocation
  const cadenceRun = runPedagogueAgent({
    events: [
      { phase: 'NOTICE', at: 1 },
      { phase: 'ACT', at: 2 },
      { phase: 'WORLD_ANSWERS', at: 3 },
      { phase: 'NAME', at: 4 }
    ]
  });
  assert.equal(cadenceRun.agent, 'PEDAGOGUE');
  assert.equal(cadenceRun.role, 'DROMOLOGICAL_CADENCE_AND_SEQUENCE_AUDITOR');
  assert.equal(cadenceRun.verdict, 'SUPPORTED');

  // Clocks invocation with preemption
  const clockRun = runPedagogueAgent({
    clocks: { t_op: 100, t_inst: 150 },
    closure: { closure_class: 'closed', score: 1.0 }
  });
  assert.equal(clockRun.agent, 'PEDAGOGUE');
  assert.equal(clockRun.role, 'INSTITUTIONAL_TIME_AUDITOR');
  assert.equal(clockRun.verdict, 'HELD');
  assert.equal(clockRun.preemption_gap, 50);

  // Rejects empty/invalid input
  assert.throws(() => runPedagogueAgent({}), /requires cadence events, clocks, lineage signals, or gestures/);
});
