import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDollhouseSkillAudit } from '../app/engine/dollhouse-skill-dispatcher.js';
import {
  auditAtlasHolonomyHistoryParity,
  DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA
} from '../app/engine/dollhouse-atlas-relational-custody.js';
import {
  auditTypedEpistemicDeficit,
  APERTURE_V32_TYPED_DEFICIT_RECEIPT_SCHEMA
} from '../app/engine/aperture-v32-typed-epistemic-deficit.js';
import {
  createDollhouseCaseDossier,
  DOLLHOUSE_CASE_DOSSIER_SCHEMA
} from '../app/engine/dollhouse-case-dossier.js';

function loadScenario(name) {
  const p = resolve('tests/fixtures/dollhouse/scenarios', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

test('COV-M3: All three synthetic scenario fixtures adhere to strict calibration phantom ceilings (R14)', () => {
  const scenarioFiles = [
    'G-246-private-conversation.json',
    'G-247-sensitive-work-investigation.json',
    'G-248-creative-authorship.json'
  ];

  for (const file of scenarioFiles) {
    const scenario = loadScenario(file);
    assert.ok(scenario.scenario_id, `${file} must define scenario_id`);
    assert.equal(scenario.evidence_class, 'SYNTHETIC_CALIBRATION_PHANTOM', `${file} must declare SYNTHETIC_CALIBRATION_PHANTOM`);

    const ceiling = scenario.claim_ceiling;
    assert.ok(Array.isArray(ceiling), `${file} claim_ceiling must be an array`);
    assert.ok(ceiling.includes('NO_HUMAN_SUBJECT_DATA'), `${file} must forbid human subject claims`);
    assert.ok(ceiling.includes('NO_EMPIRICAL_ACQUISITION'), `${file} must forbid empirical acquisition claims`);
    assert.ok(ceiling.includes('EXPLICIT_SYNTHETIC_PHANTOM'), `${file} must be an explicit synthetic phantom`);

    // Must declare five specialists
    assert.ok(scenario.domain_inputs.PEDAGOGUE, `${file} must supply Pedagogue inputs`);
    assert.ok(scenario.domain_inputs.APERTURE, `${file} must supply Aperture inputs`);
    assert.ok(scenario.domain_inputs.ATLAS, `${file} must supply Atlas inputs`);
    assert.ok(scenario.domain_inputs.FADT, `${file} must supply FADT inputs`);
    assert.ok(scenario.domain_inputs.TEMPORAL_CUSTODIAN, `${file} must supply Temporal Custodian inputs`);
  }
});

test('COV-M3: Dollhouse Skill Dispatcher executes all 5 specialists on G-246, G-247, and G-248 without authority leakage', async () => {
  const scenarios = [
    loadScenario('G-246-private-conversation.json'),
    loadScenario('G-247-sensitive-work-investigation.json'),
    loadScenario('G-248-creative-authorship.json')
  ];

  for (const scenario of scenarios) {
    const result = await runDollhouseSkillAudit(scenario);

    // Orchestrator executed and produced receipt
    assert.ok(result.machine_receipt, 'Machine receipt must be generated');
    assert.ok(result.machine_receipt.orchestrator, 'Orchestrator decision must be generated');
    assert.ok(result.machine_receipt.specialist_findings, 'Specialist findings must be recorded');

    // Authority ceilings: release and deployment authority remain false
    assert.equal(result.machine_receipt.orchestrator.release_authority, false);
    assert.equal(result.machine_receipt.orchestrator.deployment_authority, false);
    assert.equal(result.machine_receipt.orchestrator.human_closure_required, true);

    // All 5 specialists must be evaluated in roles_executed and specialist_findings
    const rolesExecuted = result.machine_receipt.roles_executed;
    assert.ok(rolesExecuted.includes('PEDAGOGUE'));
    assert.ok(rolesExecuted.includes('APERTURE'));
    assert.ok(rolesExecuted.includes('ATLAS'));
    assert.ok(rolesExecuted.includes('FADT'));
    assert.ok(rolesExecuted.includes('TEMPORAL_CUSTODIAN'));

    assert.equal(result.machine_receipt.specialist_findings.length, 5);
  }
});

test('T-HISTORY-02: auditAtlasHolonomyHistoryParity enforces that equal endpoints do not erase distinct winding histories', () => {
  const endpoint = 'returned-practice-capsule';

  // Identical endpoints, identical winding histories => PASS
  const passAudit = auditAtlasHolonomyHistoryParity(
    { endpoint, winding_number: 0 },
    { endpoint, winding_number: 0 }
  );
  assert.equal(passAudit.schema, DOLLHOUSE_ATLAS_HISTORY_PARITY_SCHEMA);
  assert.equal(passAudit.endpoints_equal, true);
  assert.equal(passAudit.history_parity_equal, true);
  assert.equal(passAudit.disposition, 'PASS');

  // Identical endpoints, distinct windings (0 vs 2) => HOLD_DISTINCT_HISTORY_NOT_ERASED
  const heldAudit = auditAtlasHolonomyHistoryParity(
    { endpoint, winding_number: 0 },
    { endpoint, winding_number: 2 }
  );
  assert.equal(heldAudit.endpoints_equal, true);
  assert.equal(heldAudit.history_parity_equal, false);
  assert.equal(heldAudit.winding_delta, -2);
  assert.equal(heldAudit.modulo_2_parity_equal, true); // Same parity mod 2, but distinct winding!
  assert.equal(heldAudit.disposition, 'HOLD_DISTINCT_HISTORY_NOT_ERASED');
  assert.match(heldAudit.reason, /equal endpoints do not erase distinct winding histories/);
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

  const resultUndeclared = auditTypedEpistemicDeficit({
    current_operator: [[1.0, 0.0], [0.0, 1.0]],
    uncertainty_status: 'UNDECLARED'
  });

  assert.equal(resultUndeclared.deficit_class, 'NOISE_GEOMETRY_INCOMPLETE');
  assert.equal(resultUndeclared.disposition, 'ABSTAIN');
  assert.match(resultUndeclared.reason, /uncertainty geometry has not been declared valid/);
});

test('T-ROLE-01: createDollhouseCaseDossier preserves uninvoked specialist visible and requires human closure', () => {
  // Case dossier where only ATLAS is invoked
  const dossierInput = {
    schema: DOLLHOUSE_CASE_DOSSIER_SCHEMA,
    case_id: 'case-cov-m3-role-visibility',
    source_revision: '703aabd1b22704ca2f008ce1f9ebfb0d2cbab56c',
    findings: [
      {
        id: 'f-atlas-001',
        agent: 'ATLAS',
        claim_key: 'claim:relational_custody',
        verdict: 'SUPPORTED',
        evidence_class: 'OFFLINE_TEST',
        observation_scope: {
          source: 'synthetic-route',
          instrument: 'Atlas Agent',
          condition: 'verified',
          temporal_window: 't0-t1'
        },
        reference: {
          artifact: 'app/engine/dollhouse-atlas-relational-custody.js',
          sha256: 'a'.repeat(64)
        },
        limitations: ['Synthetic scope only']
      }
    ]
  };

  const dossier = createDollhouseCaseDossier(dossierInput);
  assert.equal(dossier.schema, DOLLHOUSE_CASE_DOSSIER_SCHEMA);
  assert.equal(dossier.case_id, 'case-cov-m3-role-visibility');

  // Verify missing roles remain visible (Pedagogue, Aperture, FADT, Temporal Custodian are NOT hidden)
  assert.equal(dossier.findings.length, 1);
  assert.equal(dossier.findings[0].agent, 'ATLAS');

  // Authority boundaries: human review and closure remain required
  assert.equal(dossier.authority.human_closure_required, true);
  assert.equal(dossier.authority.release, false);
  assert.equal(dossier.authority.deployment, false);

  // Missing specialists are present: false in agent_coverage
  const coverage = dossier.agent_coverage;
  const pedagogueCoverage = coverage.find(c => c.agent === 'PEDAGOGUE');
  assert.equal(pedagogueCoverage.present, false, 'Uninvoked specialist stays visibly present: false');
});
