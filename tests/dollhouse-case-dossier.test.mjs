import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  createDollhouseCaseDossier,
  DOLLHOUSE_CASE_DOSSIER_SCHEMA,
  DOLLHOUSE_WITNESS_RECEIPT_SCHEMA,
  TRUSTED_WITNESS_REGISTRY,
  computeWitnessReceiptDigest,
  verifyWitnessReceipt
} from '../app/engine/dollhouse-case-dossier.js';
const copy = value => structuredClone(value);
function fixture(case_id = 'fictional-portable-boundary') {
  const make = (agent, verdict, evidence_class, id) => ({
    id, agent, claim_key: 'current-result-continuity', verdict, evidence_class,
    observation_scope: { source: 'fictional declared states', instrument: 'offline fixture', condition: 'no provider or release', temporal_window: 'one synthetic traversal' },
    reference: { artifact: 'tests/fictional-reference.json', sha256: 'a'.repeat(64) }, limitations: ['Synthetic reference; independent admission remains unverified.']
  });
  return { schema: DOLLHOUSE_CASE_DOSSIER_SCHEMA, case_id, source_revision: 'b'.repeat(40), findings: [
    make('PEDAGOGUE', 'SUPPORTED', 'DECLARATION', 'p'), make('ATLAS', 'HELD', 'OFFLINE_TEST', 'a'),
    make('FADT', 'SUPPORTED', 'OFFLINE_TEST', 'f'), make('APERTURE', 'UNKNOWN', 'DECLARATION', 'o')
  ] };
}

function makeWitnessReceipt(overrides = {}) {
  const beforeSha = crypto.createHash('sha256').update(fs.readFileSync('tests/fixtures/dollhouse/repair-before-held.json')).digest('hex');
  const afterSha = crypto.createHash('sha256').update(fs.readFileSync('tests/fixtures/dollhouse/repair-after-supported.json')).digest('hex');

  const receipt = {
    schema: DOLLHOUSE_WITNESS_RECEIPT_SCHEMA,
    witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
    issuer_authority: 'AMARI_INDEPENDENT_ADJUDICATOR',
    source_revision: 'b'.repeat(40),
    before_artifact: {
      path: 'tests/fixtures/dollhouse/repair-before-held.json',
      sha256: beforeSha,
      verdict: 'HELD',
      defect_class: 'NUMERICAL_STABILITY_DEFICIT'
    },
    after_artifact: {
      path: 'tests/fixtures/dollhouse/repair-after-supported.json',
      sha256: afterSha,
      verdict: 'SUPPORTED',
      predecessor_sha256: beforeSha
    },
    transition_claim: 'Numerical stability deficit repaired via one-sided Jacobi SVD with fail-closed rank thresholding.',
    ...overrides
  };

  const digest = computeWitnessReceiptDigest(receipt);
  receipt.verification_digest = digest;

  const authority = TRUSTED_WITNESS_REGISTRY[receipt.witness_identity];
  const envKey = authority?.env_key_var ? process.env[authority.env_key_var] : null;
  const key = overrides.signing_key || envKey || authority?.verification_key || 'test-key';
  receipt.signature = crypto.createHmac('sha256', key).update(digest).digest('hex');
  delete receipt.signing_key;
  return receipt;
}
test('dossier preserves distinct role disagreement and evidence classes without a majority verdict', () => {
  const input = fixture(), snapshot = copy(input), dossier = createDollhouseCaseDossier(input);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(dossier.findings, input.findings);
  assert.equal(dossier.disagreements.length, 1);
  assert.deepEqual(dossier.unresolved_finding_ids, ['a', 'o']);
  assert.equal(dossier.decision, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(dossier.evidence_posture.majority_vote, false);
  assert.equal(dossier.evidence_posture.global_score, null);
  assert.equal(dossier.evidence_posture.reference_authentication, 'UNVERIFIED');
  assert.equal(Object.isFrozen(dossier.findings[0].observation_scope), true);
  input.findings[0].verdict = 'CONTRADICTED';
  assert.equal(dossier.findings[0].verdict, 'SUPPORTED');
});
test('unanimous supplied support still requires human closure and authenticates no artifact', () => {
  const input = fixture('fictional-review-then-publish');
  input.findings.forEach(item => { item.verdict = 'SUPPORTED'; });
  const result = createDollhouseCaseDossier(input);
  assert.deepEqual(result.disagreements, []);
  assert.equal(result.evidence_posture.artifact_bytes_checked, false);
  assert.equal(result.evidence_posture.evidence_classes_aggregated, false);
  assert.equal(result.decision, 'HUMAN_REVIEW_REQUIRED');
  for (const [key, value] of Object.entries(result.authority)) assert.equal(value, key === 'human_closure_required');
});
test('missing roles stay visible; declared browser/provider/empirical labels cannot grant authority', () => {
  const input = fixture(); input.findings = input.findings.slice(0, 1);
  for (const evidence_class of ['BROWSER_WITNESS', 'PROVIDER_RESPONSE', 'EMPIRICAL_ACQUISITION']) {
    input.findings[0].evidence_class = evidence_class;
    const result = createDollhouseCaseDossier(input);
    assert.equal(result.agent_coverage.filter(item => item.present).length, 1);
    assert.equal(result.evidence_posture.evidence_class_is_caller_declared, true);
    assert.equal(result.authority.execute, false);
  }
});
test('accessors, hidden fields and symbolic authority cannot execute through the clerk', () => {
  let reads = 0;
  const getter = fixture();
  Object.defineProperty(getter.findings[0], 'agent', { enumerable: true, get() { reads++; return 'ATLAS'; } });
  const arrayGetter = fixture();
  Object.defineProperty(arrayGetter.findings, '0', { enumerable: true, get() { reads++; return fixture().findings[0]; } });
  const hidden = fixture(); Object.defineProperty(hidden, 'release', { value: true });
  const symbolic = fixture(); symbolic[Symbol('release')] = true;
  for (const input of [getter, arrayGetter, hidden, symbolic]) assert.throws(() => createDollhouseCaseDossier(input), TypeError);
  assert.equal(reads, 0);
});
test('malformed, sparse, duplicate, unbounded, unscoped and authority-bearing dossiers reject', () => {
  const mutations = [
    value => { value.authority = { release: true }; },
    value => { value.source_revision = 'working-tree'; },
    value => { delete value.findings[0]; },
    value => { value.findings.push(copy(value.findings[0])); },
    value => { value.findings[0].agent = 'CROWN'; },
    value => { value.findings[0].evidence_class = 'TRUSTED'; },
    value => { value.findings[0].reference.sha256 = 'self-attested'; },
    value => { delete value.findings[0].observation_scope.instrument; },
    value => { value.findings[0].limitations = []; },
    value => { value.findings[0].claim_key = 'x'.repeat(161); },
    value => { value.findings[0].release = true; }
  ];
  for (const mutate of mutations) { const value = fixture(); mutate(value); assert.throws(() => createDollhouseCaseDossier(value), TypeError); }
});

test('repair demonstration is validated by explicit before/after task recovery rather than keyword matching', () => {
  // 1. Without repair_demonstration, repairability is UNMEASURED (score 0.0)
  const unmeasured = fixture();
  const resUnmeasured = createDollhouseCaseDossier(unmeasured);
  assert.equal(resUnmeasured.evidence_posture.knowledge_survival.repairability, 0.0);
  assert.equal(resUnmeasured.evidence_posture.knowledge_survival.capacities.repairability.status, 'UNMEASURED');

  // 2. Independently authenticated witness receipt with provisioned env trust anchor -> DEMONSTRATED (score 1.0)
  process.env.TD613_AMARI_WITNESS_PUBLIC_KEY = 'amari-provisioned-test-key-2026';
  try {
    const demonstrated = fixture();
    demonstrated.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Applied least-restrictive lawful action support under stage erasure',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
      witness_receipt: makeWitnessReceipt({
        witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
        source_revision: demonstrated.source_revision
      })
    };
    const resDemonstrated = createDollhouseCaseDossier(demonstrated);
    assert.equal(resDemonstrated.evidence_posture.knowledge_survival.repairability, 1.0);
    assert.equal(resDemonstrated.evidence_posture.knowledge_survival.capacities.repairability.status, 'DEMONSTRATED');
  } finally {
    delete process.env.TD613_AMARI_WITNESS_PUBLIC_KEY;
  }

  // 3. Contemporaneous operator-direct witness receipt with provisioned env trust anchor -> DEMONSTRATED (score 1.0)
  process.env.TD613_OPERATOR_WITNESS_PUBLIC_KEY = 'operator-provisioned-test-key-2026';
  try {
    const operatorDirect = fixture();
    operatorDirect.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Applied least-restrictive lawful action support',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
      witness_receipt: makeWitnessReceipt({
        witness_identity: 'OPERATOR_DIRECT_WITNESS',
        issuer_authority: 'CONTEMPORANEOUS_OPERATOR_DIRECT',
        source_revision: operatorDirect.source_revision
      })
    };
    const resOperator = createDollhouseCaseDossier(operatorDirect);
    assert.equal(resOperator.evidence_posture.knowledge_survival.repairability, 1.0);
    assert.equal(resOperator.evidence_posture.knowledge_survival.capacities.repairability.status, 'DEMONSTRATED');
  } finally {
    delete process.env.TD613_OPERATOR_WITNESS_PUBLIC_KEY;
  }

  // 3b. When external trust anchor is NOT provisioned -> fails closed as EXTERNAL_WITNESS_ANCHOR_UNAVAILABLE_HELD (score 0.5)
  delete process.env.TD613_AMARI_WITNESS_PUBLIC_KEY;
  const unprovisioned = fixture();
  unprovisioned.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support under stage erasure',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: makeWitnessReceipt({
      witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
      source_revision: unprovisioned.source_revision
    })
  };
  const resUnprovisioned = createDollhouseCaseDossier(unprovisioned);
  assert.equal(resUnprovisioned.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resUnprovisioned.evidence_posture.knowledge_survival.capacities.repairability.status, 'EXTERNAL_WITNESS_ANCHOR_UNAVAILABLE_HELD');
  assert.ok(resUnprovisioned.evidence_posture.knowledge_survival.capacities.repairability.limitations.includes('External signing key not provisioned'));

  // 3c. Caller cannot replace sealed trust registry via options.trusted_registry
  const forgedRegistry = {
    AMARI_ADJUDICATION_AUTHORITY: {
      witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
      authority_class: 'FORGED_AUTHORITY',
      verification_key: 'caller-injected-backdoor-key',
      is_independent: true
    }
  };
  const callerInjectedReceipt = makeWitnessReceipt({
    witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
    signing_key: 'caller-injected-backdoor-key'
  });
  const injectedResult = verifyWitnessReceipt(callerInjectedReceipt, { trusted_registry: forgedRegistry });
  assert.equal(injectedResult.verified, false);
  assert.equal(injectedResult.failure_reason, 'EXTERNAL_TRUST_ANCHOR_NOT_PROVISIONED');

  // 4. Synthetic offline test authority receipt -> SYNTHETIC_VERIFIED_RECOVERY (score 1.0 for verifier tests, zero external credit)
  const synthetic = fixture();
  synthetic.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: makeWitnessReceipt({
      witness_identity: 'SYNTHETIC_TEST_AUTHORITY',
      issuer_authority: 'SYNTHETIC_TEST_FIXTURE',
      source_revision: synthetic.source_revision
    })
  };
  const resSynthetic = createDollhouseCaseDossier(synthetic);
  assert.equal(resSynthetic.evidence_posture.knowledge_survival.repairability, 1.0);
  assert.equal(resSynthetic.evidence_posture.knowledge_survival.capacities.repairability.status, 'SYNTHETIC_VERIFIED_RECOVERY');

  // 5. Forged witness identity -> falls back to CALLER_DECLARED_RECOVERY (score 0.5)
  const forged = fixture();
  forged.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: makeWitnessReceipt({
      witness_identity: 'AMARI_INDEPENDENT_ADJUDICATOR', // Not in trusted registry
      source_revision: forged.source_revision
    })
  };
  const resForged = createDollhouseCaseDossier(forged);
  assert.equal(resForged.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resForged.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

  // 6. Unrelated files (package.json + README.md) -> rejected as FALSE_REPAIR_TRANSITION (score 0.5)
  const pkgSha = crypto.createHash('sha256').update(fs.readFileSync('package.json')).digest('hex');
  const readmeSha = crypto.createHash('sha256').update(fs.readFileSync('README.md')).digest('hex');
  const unrelated = fixture();
  unrelated.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: makeWitnessReceipt({
      source_revision: unrelated.source_revision,
      before_artifact: { path: 'package.json', sha256: pkgSha, verdict: 'HELD', defect_class: 'ANY' },
      after_artifact: { path: 'README.md', sha256: readmeSha, verdict: 'SUPPORTED', predecessor_sha256: pkgSha }
    })
  };
  const resUnrelated = createDollhouseCaseDossier(unrelated);
  assert.equal(resUnrelated.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resUnrelated.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

  // 7. Corrupted signature -> fails verification (score 0.5)
  process.env.TD613_AMARI_WITNESS_PUBLIC_KEY = 'amari-provisioned-test-key-2026';
  try {
    const corrupted = fixture();
    const corruptedReceipt = makeWitnessReceipt({ source_revision: corrupted.source_revision });
    corruptedReceipt.signature = '0'.repeat(64);
    corrupted.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Applied least-restrictive lawful action support',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
      witness_receipt: corruptedReceipt
    };
    const resCorrupted = createDollhouseCaseDossier(corrupted);
    assert.equal(resCorrupted.evidence_posture.knowledge_survival.repairability, 0.5);
    assert.equal(resCorrupted.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

    // 8. Untrusted signing key -> fails verification (score 0.5)
    const untrustedKey = fixture();
    untrustedKey.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Applied least-restrictive lawful action support',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
      witness_receipt: makeWitnessReceipt({
        source_revision: untrustedKey.source_revision,
        signing_key: 'untrusted-adversarial-key-999'
      })
    };
    const resUntrustedKey = createDollhouseCaseDossier(untrustedKey);
    assert.equal(resUntrustedKey.evidence_posture.knowledge_survival.repairability, 0.5);
    assert.equal(resUntrustedKey.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

    // 9. Stale source revision -> fails verification (score 0.5)
    const stale = fixture();
    stale.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Applied least-restrictive lawful action support',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
      witness_receipt: makeWitnessReceipt({
        source_revision: 'c'.repeat(40) // Mismatch
      })
    };
    const resStale = createDollhouseCaseDossier(stale);
    assert.equal(resStale.evidence_posture.knowledge_survival.repairability, 0.5);
    assert.equal(resStale.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');
  } finally {
    delete process.env.TD613_AMARI_WITNESS_PUBLIC_KEY;
  }

  // 10. When caller declares INDEPENDENT_AUDIT_WITNESS but supplies NO witness receipt, score is 0.5 (CALLER_DECLARED_RECOVERY)
  const selfAttested = fixture();
  selfAttested.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support under stage erasure',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS'
  };
  const resSelfAttested = createDollhouseCaseDossier(selfAttested);
  assert.equal(resSelfAttested.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resSelfAttested.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

  // 11. Caller declared without audit witness -> CALLER_DECLARED_RECOVERY (score 0.5)
  const callerDeclared = fixture();
  callerDeclared.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support under stage erasure',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'CALLER_DECLARED'
  };
  const resCaller = createDollhouseCaseDossier(callerDeclared);
  assert.equal(resCaller.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resCaller.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

  // 12. Malformed repair demonstration throws TypeError
  const invalidMutations = [
    d => { d.repair_demonstration.initial_verdict = ''; },
    d => { d.repair_demonstration.verified = 'true'; },
    d => { d.repair_demonstration.verification_mode = 'UNVERIFIED_SELF_CLAIM'; },
    d => { d.repair_demonstration.extra = 1; },
    d => { d.repair_demonstration.witness_receipt = { schema: 'wrong' }; }
  ];
  for (const mut of invalidMutations) {
    const bad = fixture();
    bad.repair_demonstration = {
      initial_verdict: 'HELD',
      reparative_action: 'Action',
      post_repair_verdict: 'SUPPORTED',
      verified: true,
      verification_mode: 'INDEPENDENT_AUDIT_WITNESS'
    };
    mut(bad);
    assert.throws(() => createDollhouseCaseDossier(bad), TypeError);
  }
});
