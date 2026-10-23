import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createDollhouseCaseDossier, DOLLHOUSE_CASE_DOSSIER_SCHEMA, DOLLHOUSE_WITNESS_RECEIPT_SCHEMA } from '../app/engine/dollhouse-case-dossier.js';
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
  // Without repair_demonstration, repairability is UNMEASURED (score 0.0)
  const unmeasured = fixture();
  const resUnmeasured = createDollhouseCaseDossier(unmeasured);
  assert.equal(resUnmeasured.evidence_posture.knowledge_survival.repairability, 0.0);
  assert.equal(resUnmeasured.evidence_posture.knowledge_survival.capacities.repairability.status, 'UNMEASURED');

  const pkgSha = crypto.createHash('sha256').update(fs.readFileSync('package.json')).digest('hex');
  const readmeSha = crypto.createHash('sha256').update(fs.readFileSync('README.md')).digest('hex');

  // With independently authenticated witness receipt verifying on-disk artifacts, repairability is DEMONSTRATED (score 1.0)
  const demonstrated = fixture();
  demonstrated.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support under stage erasure',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: {
      schema: DOLLHOUSE_WITNESS_RECEIPT_SCHEMA,
      witness_identity: 'AMARI_INDEPENDENT_ADJUDICATOR',
      verification_digest: crypto.createHash('sha256').update('reproducible-verification-proof').digest('hex'),
      source_revision: demonstrated.source_revision,
      before_artifact: {
        path: 'package.json',
        sha256: pkgSha
      },
      after_artifact: {
        path: 'README.md',
        sha256: readmeSha
      }
    }
  };
  const resDemonstrated = createDollhouseCaseDossier(demonstrated);
  assert.equal(resDemonstrated.evidence_posture.knowledge_survival.repairability, 1.0);
  assert.equal(resDemonstrated.evidence_posture.knowledge_survival.capacities.repairability.status, 'DEMONSTRATED');

  // When caller declares INDEPENDENT_AUDIT_WITNESS but supplies NO witness receipt, score is 0.5 (CALLER_DECLARED_RECOVERY)
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

  // When caller supplies witness receipt but artifact files fail hash check, score is 0.5 (CALLER_DECLARED_RECOVERY)
  const badHash = fixture();
  badHash.repair_demonstration = {
    initial_verdict: 'HELD',
    reparative_action: 'Applied least-restrictive lawful action support',
    post_repair_verdict: 'SUPPORTED',
    verified: true,
    verification_mode: 'INDEPENDENT_AUDIT_WITNESS',
    witness_receipt: {
      schema: DOLLHOUSE_WITNESS_RECEIPT_SCHEMA,
      witness_identity: 'AMARI_INDEPENDENT_ADJUDICATOR',
      verification_digest: crypto.createHash('sha256').update('proof').digest('hex'),
      source_revision: badHash.source_revision,
      before_artifact: {
        path: 'package.json',
        sha256: 'f'.repeat(64) // mismatch
      },
      after_artifact: {
        path: 'README.md',
        sha256: readmeSha
      }
    }
  };
  const resBadHash = createDollhouseCaseDossier(badHash);
  assert.equal(resBadHash.evidence_posture.knowledge_survival.repairability, 0.5);
  assert.equal(resBadHash.evidence_posture.knowledge_survival.capacities.repairability.status, 'CALLER_DECLARED_RECOVERY');

  // With caller-declared repair_demonstration without audit witness, repairability is CALLER_DECLARED_RECOVERY (score 0.5)
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

  // Malformed repair demonstration throws TypeError
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
