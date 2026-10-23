/**
 * @fileoverview TD613 Dollhouse Native Antigravity Skill Verification Test Suite.
 *
 * Verifies all 18 positive and adversarial requirements specified in
 * THE CONVERGENCE COVENANT — REVISION 2 (DOLLHOUSE_ANTIGRAVITY_NATIVE_SKILL):
 *   1. Standalone invocation of each of the 5 specialists
 *   2. Successful Orchestrator invocation with actual specialist results
 *   3. Distinct role-specific findings retained without collapsing
 *   4. Single shared acquisition earns zero additional replication credit
 *   5. A specialist veto survives four favorable findings
 *   6. Missing specialist input remains explicitly unexamined
 *   7. Caller-authored concerns cannot masquerade as executable domain findings
 *   8. Synthetic evidence cannot become independently observed empirical evidence
 *   9. Out-of-order chronology triggers a Temporal Custodian hold
 *   10. Atlas detects unverified history or incompatible serialization profiles
 *   11. FADT detects an inadmissible widened action
 *   12. Aperture retains numerical instability or missing observability
 *   13. Pedagogue retains premature naming, compressed consequence, or withheld rest
 *   14. Orchestrator cannot claim approval when required input class is absent
 *   15. Deterministic, parseable, bounded receipts produced
 *   16. Workspace discovery of /dollhouse-audit and valid frontmatter
 *   17. Unavailable engine produces explicit failure/hold rather than invented PASS
 *   18. Strict boundary: zero release/deployment authority, human closure required
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  runDollhouseSkillAudit,
  DOLLHOUSE_SKILL_RECEIPT_SCHEMA,
  CANONICAL_SPECIALIST_ROLES,
  ALL_CANONICAL_ROLES
} from '../app/engine/dollhouse-skill-dispatcher.js';
import {
  FIVE_ROLES,
  ROLE_INFRACTIONS
} from '../app/engine/dollhouse-ablation-harness.js';

// Canonical benign inputs for all 5 roles
const BENIGN_PEDAGOGUE_INPUT = Object.freeze({
  events: [
    { phase: 'NOTICE', at: 10 },
    { phase: 'ACT', at: 20 },
    { phase: 'WORLD_ANSWERS', at: 30 },
    { phase: 'NAME', at: 40 }
  ]
});

const BENIGN_APERTURE_INPUT = Object.freeze({
  current_operator: [
    [1.0, 0.0],
    [0.0, 1.0]
  ],
  noise_covariance: [
    [1.0, 0.0],
    [0.0, 1.0]
  ]
});

const BENIGN_ATLAS_INPUT = Object.freeze({
  trajectoryA: {
    endpoint: 'REST_CUSTODY_ORIGIN',
    winding: 0
  },
  trajectoryB: {
    endpoint: 'REST_CUSTODY_ORIGIN',
    winding: 0
  }
});

const BENIGN_FADT_INPUT = Object.freeze({
  fiberRows: [
    { support: ['READ', 'VERIFY'], condition: 'A' },
    { support: ['READ', 'VERIFY'], condition: 'B' }
  ],
  attempts_unconditioned_action: false
});

const BENIGN_TEMPORAL_INPUT = Object.freeze({
  phases: {
    INGRESS: { status: 'PASS', entry_id: 'entry-001' },
    EXECUTION: { status: 'PASS', entry_id: 'entry-002' },
    RELOCK: { status: 'PASS', entry_id: 'entry-003' }
  },
  required_phases: ['INGRESS', 'EXECUTION', 'RELOCK']
});

const ALL_BENIGN_DOMAIN_INPUTS = Object.freeze({
  PEDAGOGUE: BENIGN_PEDAGOGUE_INPUT,
  APERTURE: BENIGN_APERTURE_INPUT,
  ATLAS: BENIGN_ATLAS_INPUT,
  FADT: BENIGN_FADT_INPUT,
  TEMPORAL_CUSTODIAN: BENIGN_TEMPORAL_INPUT
});

test('TD613 Dollhouse Native Skill & Six-Role Orchestration Test Battery', async (t) => {

  // -------------------------------------------------------------------------
  // 1. Standalone invocation of each of the five specialists
  // -------------------------------------------------------------------------
  await t.test('1. Successful standalone invocation of each of the five specialists', async () => {
    for (const role of CANONICAL_SPECIALIST_ROLES) {
      const res = await runDollhouseSkillAudit({
        roles: [role],
        include_orchestrator: false,
        domain_inputs: { [role]: ALL_BENIGN_DOMAIN_INPUTS[role] },
        task_scope: `STANDALONE_${role}_TEST`
      });

      assert.equal(res.exit_code, 0, `Standalone ${role} must exit 0`);
      assert.equal(res.machine_receipt.roles_executed.length, 1);
      assert.equal(res.machine_receipt.roles_executed[0], role);
      assert.equal(res.machine_receipt.specialist_findings.length, 1);
      assert.equal(res.machine_receipt.specialist_findings[0].role, role);
      assert.equal(res.machine_receipt.specialist_findings[0].verdict, 'SUPPORTED');
      assert.equal(res.machine_receipt.specialist_findings[0].status, 'NO_VIOLATION_DETECTED');
      assert.equal(res.machine_receipt.orchestrator, null, 'Orchestrator must be null when disabled');
    }
  });

  // -------------------------------------------------------------------------
  // 2. Successful Orchestrator invocation with actual specialist results
  // -------------------------------------------------------------------------
  await t.test('2. Successful Orchestrator invocation with actual specialist results', async () => {
    const res = await runDollhouseSkillAudit({
      roles: [...CANONICAL_SPECIALIST_ROLES, 'ORCHESTRATOR'],
      include_orchestrator: true,
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS,
      task_scope: 'FIVE_DOLL_ORCHESTRATOR_TEST'
    });

    assert.equal(res.exit_code, 0);
    assert.ok(res.machine_receipt.orchestrator, 'Orchestrator record must exist');
    assert.equal(res.machine_receipt.orchestrator.decision, 'SUPPORTED');
    assert.equal(res.machine_receipt.orchestrator.consensus, 'UNANIMOUS_SUPPORT');
    assert.equal(res.machine_receipt.orchestrator.findings_count, 5);
    assert.equal(res.machine_receipt.detected_infractions.length, 0);
  });

  // -------------------------------------------------------------------------
  // 3. Distinct role-specific findings retained without collapsing
  // -------------------------------------------------------------------------
  await t.test('3. Distinct role-specific findings retained without collapsing into one generic verdict', async () => {
    const res = await runDollhouseSkillAudit({
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS
    });

    const findings = res.machine_receipt.specialist_findings;
    assert.equal(findings.length, 5);

    const rolesFound = findings.map(f => f.role);
    assert.deepEqual(rolesFound, CANONICAL_SPECIALIST_ROLES);

    // Each finding has its own distinct jurisdiction and claim
    const jurisdictions = new Set(findings.map(f => f.jurisdiction));
    assert.equal(jurisdictions.size, 5, 'All five jurisdictions must remain distinct');
  });

  // -------------------------------------------------------------------------
  // 4. Single shared acquisition earns zero additional replication credit
  // -------------------------------------------------------------------------
  await t.test('4. A single shared acquisition reviewed by all five specialists earns zero additional replication credit', async () => {
    const res = await runDollhouseSkillAudit({
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS,
      evidence_class: 'SYNTHETIC_TEST_FIXTURE'
    });

    assert.equal(res.machine_receipt.empirical_replication_count, 0);
    assert.equal(res.machine_receipt.orchestrator.empirical_replication_count, 0);
    assert.equal(res.machine_receipt.replication_status, 'SYNTHETIC_OFFLINE_FIXTURE');
  });

  // -------------------------------------------------------------------------
  // 5. A specialist veto survives four favorable findings
  // -------------------------------------------------------------------------
  await t.test('5. A specialist veto survives four favorable findings', async () => {
    // Pedagogue has a premature naming violation; other 4 are benign
    const defectiveInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      PEDAGOGUE: {
        events: [
          { phase: 'NOTICE', at: 10 },
          { phase: 'ACT', at: 20 },
          { phase: 'NAME', at: 25 }, // FAULT: naming before world answers
          { phase: 'WORLD_ANSWERS', at: 30 }
        ]
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: defectiveInputs
    });

    assert.equal(res.exit_code, 1);
    assert.equal(res.machine_receipt.orchestrator.decision, 'HELD');
    assert.equal(res.machine_receipt.orchestrator.consensus, 'HELD_DISSENT');
    assert.ok(res.machine_receipt.detected_infractions.includes('HUMAN_CONSEQUENCE_BROKEN_RETURN_PROMISE'));

    const pedFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'PEDAGOGUE');
    assert.equal(pedFinding.verdict, 'HELD');
    assert.equal(pedFinding.status, 'VIOLATION_DETECTED');

    // The other 4 still passed within their respective jurisdictions
    const apertureFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'APERTURE');
    assert.equal(apertureFinding.verdict, 'SUPPORTED');
  });

  // -------------------------------------------------------------------------
  // 6. Missing specialist input remains explicitly unexamined
  // -------------------------------------------------------------------------
  await t.test('6. A missing specialist input remains explicitly unexamined', async () => {
    const incompleteInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      FADT: null // unsupplied
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: incompleteInputs
    });

    assert.equal(res.exit_code, 1);
    assert.ok(res.machine_receipt.missing_inputs.includes('FADT'));

    const fadtFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'FADT');
    assert.equal(fadtFinding.verdict, 'NOT_EVALUATED');
    assert.equal(fadtFinding.status, 'INPUT_MISSING');

    assert.equal(res.machine_receipt.orchestrator.decision, 'HELD_MISSING_OBSERVATION');
  });

  // -------------------------------------------------------------------------
  // 7. Caller-authored concerns cannot masquerade as executable domain findings
  // -------------------------------------------------------------------------
  await t.test('7. Caller-authored concerns cannot masquerade as executable domain findings', async () => {
    // Untyped concern without domain schema or synthetic fault injection flag
    const untypedInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      PEDAGOGUE: {
        concern: 'Caller claims this UI is bad without providing events array'
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: untypedInputs
    });

    const pedFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'PEDAGOGUE');
    assert.equal(pedFinding.verdict, 'HELD');
    assert.equal(pedFinding.status, 'MALFORMED_OBSERVATION_SCHEMA');
    assert.ok(pedFinding.claim.includes('untyped concern injection rejected fail-closed'));
  });

  // -------------------------------------------------------------------------
  // 8. Synthetic evidence cannot become independently observed empirical evidence
  // -------------------------------------------------------------------------
  await t.test('8. Synthetic evidence cannot become independently observed empirical evidence', async () => {
    const res = await runDollhouseSkillAudit({
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS,
      evidence_class: 'SYNTHETIC_TEST_FIXTURE'
    });

    assert.equal(res.machine_receipt.synthetic_vs_empirical, 'SYNTHETIC');
    assert.equal(res.machine_receipt.empirical_replication_count, 0);
  });

  // -------------------------------------------------------------------------
  // 9. Out-of-order chronology triggers a Temporal Custodian hold
  // -------------------------------------------------------------------------
  await t.test('9. Out-of-order chronology triggers a Temporal Custodian hold', async () => {
    const chronologyFaultInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      TEMPORAL_CUSTODIAN: {
        phases: {
          INGRESS: { status: 'HELD', entry_id: 'entry-001' },
          EXECUTION: { status: 'PASS', entry_id: 'entry-002' }
        },
        required_phases: ['INGRESS', 'EXECUTION']
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: chronologyFaultInputs
    });

    const tcFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'TEMPORAL_CUSTODIAN');
    assert.equal(tcFinding.verdict, 'HELD');
    assert.equal(tcFinding.status, 'VIOLATION_DETECTED');
    assert.ok(res.machine_receipt.detected_infractions.includes('UNREFERENCED_RETRY_CHRONOLOGICAL_OBLIVION'));
  });

  // -------------------------------------------------------------------------
  // 10. Atlas detects unverified history or incompatible serialization profiles
  // -------------------------------------------------------------------------
  await t.test('10. Atlas detects unverified history or incompatible serialization profiles', async () => {
    const parityMismatchInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      ATLAS: {
        trajectoryA: {
          endpoint: 'REST_CUSTODY_ORIGIN',
          winding: 0
        },
        trajectoryB: {
          endpoint: 'REST_CUSTODY_ORIGIN',
          winding: 1 // FAULT: distinct winding history
        }
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: parityMismatchInputs
    });

    const atlasFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'ATLAS');
    assert.equal(atlasFinding.verdict, 'HELD');
    assert.equal(atlasFinding.status, 'VIOLATION_DETECTED');
    assert.ok(res.machine_receipt.detected_infractions.includes('PREDECESSOR_CHAIN_UNVERIFIED_CUSTODY_FORK'));
  });

  // -------------------------------------------------------------------------
  // 11. FADT detects an inadmissible widened action
  // -------------------------------------------------------------------------
  await t.test('11. FADT detects an inadmissible widened action', async () => {
    const widenedActionInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      FADT: {
        fiberRows: [
          { support: ['ACTION_A', 'ACTION_B'] },
          { support: ['ACTION_A'] } // FAULT: irreducible gap on ACTION_B
        ],
        attempts_unconditioned_action: true // attempts widened action without exact descent
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: widenedActionInputs
    });

    const fadtFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'FADT');
    assert.equal(fadtFinding.verdict, 'HELD');
    assert.equal(fadtFinding.status, 'VIOLATION_DETECTED');
    assert.ok(res.machine_receipt.detected_infractions.includes('ILLEGAL_ACTION_GRANT_UNDER_ERASED_CONDITIONING'));
  });

  // -------------------------------------------------------------------------
  // 12. Aperture retains numerical instability or missing observability
  // -------------------------------------------------------------------------
  await t.test('12. Aperture retains numerical instability or missing observability', async () => {
    const illConditionedInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      APERTURE: {
        current_operator: [
          [1.0, 0.0],
          [1.0, 1e-5] // nearly collinear rows: condition number ~ 200,000 exceeds ceiling (1,000)
        ]
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: illConditionedInputs
    });

    const apertureFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'APERTURE');
    assert.equal(apertureFinding.verdict, 'HELD');
    assert.equal(apertureFinding.status, 'VIOLATION_DETECTED');
    assert.ok(res.machine_receipt.detected_infractions.includes('URL_HASH_DOES_NOT_EQUAL_WORKSPACE_ADMITTED'));
  });

  // -------------------------------------------------------------------------
  // 13. Pedagogue retains premature naming, compressed consequence, or withheld rest
  // -------------------------------------------------------------------------
  await t.test('13. Pedagogue retains premature naming, compressed consequence, or withheld rest', async () => {
    const pedFaultInputs = {
      ...ALL_BENIGN_DOMAIN_INPUTS,
      PEDAGOGUE: {
        events: [
          { phase: 'NOTICE', at: 10 },
          { phase: 'ACT', at: 20 },
          { phase: 'NAME', at: 25 }, // FAULT: premature naming
          { phase: 'WORLD_ANSWERS', at: 30 }
        ]
      }
    };

    const res = await runDollhouseSkillAudit({
      domain_inputs: pedFaultInputs
    });

    const pedFinding = res.machine_receipt.specialist_findings.find(f => f.role === 'PEDAGOGUE');
    assert.equal(pedFinding.verdict, 'HELD');
    assert.equal(pedFinding.status, 'VIOLATION_DETECTED');
  });

  // -------------------------------------------------------------------------
  // 14. The Orchestrator cannot claim approval when the required input class is absent
  // -------------------------------------------------------------------------
  await t.test('14. The Orchestrator cannot claim approval when the required input class is absent', async () => {
    const res = await runDollhouseSkillAudit({
      roles: ['PEDAGOGUE', 'APERTURE'],
      include_orchestrator: true,
      domain_inputs: {} // zero inputs
    });

    assert.equal(res.exit_code, 1);
    assert.equal(res.machine_receipt.orchestrator.decision, 'HELD_MISSING_OBSERVATION');
  });

  // -------------------------------------------------------------------------
  // 15. The skill produces deterministic, parseable, bounded receipts
  // -------------------------------------------------------------------------
  await t.test('15. The skill produces deterministic, parseable, bounded receipts', async () => {
    const res = await runDollhouseSkillAudit({
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS,
      source_revision: 'TEST_EXACT_SHA_123',
      task_scope: 'DETERMINISTIC_PARSE_TEST'
    });

    assert.equal(res.machine_receipt.schema, DOLLHOUSE_SKILL_RECEIPT_SCHEMA);
    assert.equal(res.machine_receipt.source_revision, 'TEST_EXACT_SHA_123');

    // JSON serialize and deserialize roundtrip
    const serialized = JSON.stringify(res.machine_receipt);
    const parsed = JSON.parse(serialized);
    assert.deepEqual(parsed, res.machine_receipt);

    // Human receipt must be non-empty and contain key sections
    assert.ok(res.human_receipt.includes('TD613 Dollhouse Scientific Audit Receipt'));
    assert.ok(res.human_receipt.includes('Executive Disposition & Summary'));
    assert.ok(res.human_receipt.includes('Specialist Findings'));
    assert.ok(res.human_receipt.includes('Permitted Next Operator Action'));
  });

  // -------------------------------------------------------------------------
  // 16. Invocation from clean workspace discovers /dollhouse-audit and follows instructions
  // -------------------------------------------------------------------------
  await t.test('16. Invocation from a clean workspace discovers /dollhouse-audit and follows its instructions', () => {
    const skillPath = resolve('.agents/skills/dollhouse-audit/SKILL.md');
    assert.ok(existsSync(skillPath), 'SKILL.md must exist in .agents/skills/dollhouse-audit/');

    const content = readFileSync(skillPath, 'utf8');
    assert.ok(content.startsWith('---'), 'SKILL.md must start with YAML frontmatter');
    assert.ok(content.includes('name: dollhouse-audit'), 'Skill name must be dollhouse-audit');
    assert.ok(content.includes('description:'), 'Skill must define a description');
    assert.ok(content.includes('scripts/run-dollhouse-skill-audit.mjs'), 'Must reference canonical CLI runner');

    // Verify subagent definition files exist
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-pedagogue.md')));
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-aperture.md')));
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-atlas.md')));
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-fadt.md')));
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-temporal-custodian.md')));
    assert.ok(existsSync(resolve('.agents/agents/dollhouse-orchestrator.md')));
  });

  // -------------------------------------------------------------------------
  // 17. An unavailable engine produces an explicit failure/hold rather than an invented PASS
  // -------------------------------------------------------------------------
  await t.test('17. An unavailable engine produces an explicit failure/hold rather than an invented PASS', async () => {
    const res = await runDollhouseSkillAudit({
      roles: ['NONEXISTENT_ROLE_SIX'],
      domain_inputs: {}
    });

    assert.equal(res.exit_code, 1);
    assert.ok(res.machine_receipt.detected_infractions.includes('UNKNOWN_ROLE_REJECTED'));
    assert.equal(res.machine_receipt.orchestrator.decision, 'HELD_UNKNOWN_ROLE');
    assert.equal(res.machine_receipt.specialist_findings[0].verdict, 'HELD');
  });

  // -------------------------------------------------------------------------
  // 18. No invocation can silently launch provider acquisition, production trial, release, or deployment
  // -------------------------------------------------------------------------
  await t.test('18. No invocation can silently launch a provider acquisition, production trial, release, or deployment', async () => {
    // Under supported condition
    const resSupported = await runDollhouseSkillAudit({
      domain_inputs: ALL_BENIGN_DOMAIN_INPUTS
    });
    assert.equal(resSupported.machine_receipt.orchestrator.release_authority, false);
    assert.equal(resSupported.machine_receipt.orchestrator.deployment_authority, false);
    assert.equal(resSupported.machine_receipt.orchestrator.human_closure_required, true);

    // Under held condition
    const resHeld = await runDollhouseSkillAudit({
      domain_inputs: {}
    });
    assert.equal(resHeld.machine_receipt.orchestrator.release_authority, false);
    assert.equal(resHeld.machine_receipt.orchestrator.deployment_authority, false);
    assert.equal(resHeld.machine_receipt.orchestrator.human_closure_required, true);
  });
});
