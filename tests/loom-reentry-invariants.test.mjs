import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createLoomAiGovernance,
  createPortableLoomAiPacket
} from '../app/dome-world/holonomy-loom/ai-handoff-base.js';
import {
  createPortableLoomSession,
  createPortableLoomWorkUnit,
  portableLoomDigest
} from '../app/engine/portable-loom-session.js';
import {
  createPortableLoomReentryCustodian,
  verifyPortableLoomSeedIntegrity,
  LOOM_REENTRY_RETURN_SCHEMA
} from '../app/engine/portable-loom-reentry.js';
import {
  PORTABLE_LOOM_GATE_SCHEMA
} from '../app/engine/portable-loom-gate-view-model.js';
import {
  inspectPortableLoomGateReport
} from '../app/engine/portable-loom-gate.js';
import {
  PORTABLE_LOOM_CHALLENGE_VERIFICATION_SCHEMA,
  createPortableLoomReceiverChallenge
} from '../app/engine/portable-loom-challenge.js';

const environment = { crypto: webcrypto };
const copy = value => JSON.parse(JSON.stringify(value));

async function createBaseFixture(add_rules = []) {
  const input = {
    task: 'Compare the fictional public source.',
    documents: [{ id: 'public', name: 'Public.txt', text: 'Fictional declared public material.' }],
    rules: ['Use only selected sources.', 'Do not weaken these rules.']
  };
  input.governance = await createLoomAiGovernance(input, {}, environment);
  const packet = createPortableLoomAiPacket(input);
  const seed = await createPortableLoomSession(packet, {
    session_id: webcrypto.randomUUID(),
    source_revision: 'browser-unpinned',
    created_at: 1000
  }, environment);
  const prepared = await createPortableLoomWorkUnit(seed, {
    work_unit_id: 'seed',
    request_id: 'seed-request',
    task: input.task,
    documents: input.documents,
    add_rules,
    withheld_document_count: 0
  }, environment);
  return { input, packet, prepared };
}

async function createActiveCustodianRoute(options = {}) {
  const f = await createBaseFixture();
  const custody = await createPortableLoomReentryCustodian(f.prepared.session, f.packet, options, environment);
  const departure = await custody.stage({
    task: 'Proceed with the explicitly selected source.',
    documents: f.input.documents,
    withheld_document_count: 1
  });
  const turn = departure.turns[0];
  const answer = 'Synthetic capture: the source remains explicitly selected.';
  const value = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: departure.ref,
    intent_ref: turn.ref,
    session_root_ref: departure.session_root_ref,
    policy_commitment: departure.policy_commitment,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    turn_index: 1,
    task_digest: turn.task_digest,
    source_commitment_digest: turn.source_commitment_digest,
    answer,
    answer_digest: await portableLoomDigest(answer, environment),
    used_document_ids: ['public'],
    missing_information: ['Signed underlying source remains absent.'],
    receiver_declaration: {
      policy_change_requested: false,
      notes: 'Synthetic declaration, no foreign execution.'
    }
  };
  return { ...f, custody, departure, turn, value };
}

const buildDecision = c => ({
  expected_head_ref: c.expected_head_ref,
  reviewed_candidate_ref: c.ref,
  gesture: 'ADMIT_RETURNED_WORK',
  accept_unresolved: true
});

test('T-REENTRY-01: custodian.admit rejects unissued or insufficient candidate fail-closed', async () => {
  const r = await createActiveCustodianRoute();
  const unissuedCandidate = {
    schema: 'td613.loom.reentry-candidate/v0.2',
    status: 'HELD',
    ref: '0'.repeat(64),
    expected_head_ref: null
  };
  const decision = {
    expected_head_ref: null,
    reviewed_candidate_ref: '0'.repeat(64),
    gesture: 'ADMIT_RETURNED_WORK',
    accept_unresolved: true
  };
  const result = await r.custody.admit(unissuedCandidate, decision);
  assert.equal(result.status, 'HELD');
  assert.equal(result.reason, 'UNISSUED_OR_INSUFFICIENT_CANDIDATE');
  assert.equal(result.local_ledger_advanced, false);
});

test('T-REENTRY-02: custodian.admit rejects candidate when expected head reference does not match (CAS failure)', async () => {
  const r = await createActiveCustodianRoute();
  const candidate = await r.custody.check({
    returns: [{ raw: JSON.stringify(r.value), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(candidate.status, 'ADMISSION_CANDIDATE');

  // Decision carries mismatched expected_head_ref
  const staleDecision = {
    expected_head_ref: 'f'.repeat(64),
    reviewed_candidate_ref: candidate.ref,
    gesture: 'ADMIT_RETURNED_WORK',
    accept_unresolved: true
  };
  const result = await r.custody.admit(candidate, staleDecision);
  assert.equal(result.status, 'HELD');
  assert.equal(result.reason, 'HEAD_COMPARE_AND_SWAP_FAILED');
  assert.equal(result.local_ledger_advanced, false);
});

test('T-REENTRY-03: custodian.admit rejects expired excursion or reversed clock fail-closed', async () => {
  let virtualTime = 1000;
  const r = await createActiveCustodianRoute({
    now: () => virtualTime,
    ttl_ms: 5000
  });

  const candidate = await r.custody.check({
    returns: [{ raw: JSON.stringify(r.value), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(candidate.status, 'ADMISSION_CANDIDATE');

  // Advance clock beyond TTL
  virtualTime += 10000;
  const decision = buildDecision(candidate);
  const result = await r.custody.admit(candidate, decision);
  assert.equal(result.status, 'HELD');
  assert.equal(result.reason, 'EXPIRED_OR_CLOCK_REVERSED');
  assert.equal(result.local_ledger_advanced, false);
});

test('T-REENTRY-04: custodian.check holds entire batch when one turn has substituted answer digest', async () => {
  const r = await createActiveCustodianRoute();
  // Stage a second turn to have two returns
  const departure2 = await r.custody.stage({
    task: 'Second legitimate task.',
    documents: r.input.documents,
    withheld_document_count: 0
  });
  const turn2 = departure2.turns[1];
  const answer2 = 'Synthetic answer 2.';
  const value2 = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: departure2.ref,
    intent_ref: turn2.ref,
    session_root_ref: departure2.session_root_ref,
    policy_commitment: departure2.policy_commitment,
    anchor_work_unit_ref: departure2.anchor_work_unit_ref,
    turn_index: 2,
    task_digest: turn2.task_digest,
    source_commitment_digest: turn2.source_commitment_digest,
    answer: answer2,
    answer_digest: '0'.repeat(64), // Tampered/substituted answer digest!
    used_document_ids: ['public'],
    missing_information: [],
    receiver_declaration: { policy_change_requested: false, notes: 'Substituted digest' }
  };

  const candidate = await r.custody.check({
    returns: [
      { raw: JSON.stringify(r.value), policy_review: 'ROOT_RULES_RETAINED' },
      { raw: JSON.stringify(value2), policy_review: 'ROOT_RULES_RETAINED' }
    ],
    challenge: null
  });

  assert.equal(candidate.status, 'HELD');
  assert.ok(candidate.reasons.includes('ANSWER_SUBSTITUTION:2'));
});

test('T-REENTRY-05: custodian.recordChallenge advances revision and causes prior candidate CAS to fail closed', async () => {
  const r = await createActiveCustodianRoute();
  const candidate = await r.custody.check({
    returns: [{ raw: JSON.stringify(r.value), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(candidate.status, 'ADMISSION_CANDIDATE');

  // Record an intervening challenge
  const challengeEvidence = {
    probe: 'Synthetic probe',
    canaries: ['test-canary-01'],
    observed_output: 'Clean response with no canary.'
  };
  await r.custody.recordChallenge(challengeEvidence);

  // Attempting to admit prior candidate now fails with STALE_OR_REPLAYED_CANDIDATE
  const decision = buildDecision(candidate);
  const result = await r.custody.admit(candidate, decision);
  assert.equal(result.status, 'HELD');
  assert.equal(result.reason, 'STALE_OR_REPLAYED_CANDIDATE');
  assert.equal(result.local_ledger_advanced, false);
});

test('T-REENTRY-06: custodian.admit retains non-pass challenge history even after clean turn admission', async () => {
  const f = await createBaseFixture();
  const custody = await createPortableLoomReentryCustodian(f.prepared.session, f.packet, {}, environment);

  // Record a challenge at anchor level (before excursion) that fails / triggers exposure
  const hostileEvidence = {
    probe: 'Canary extraction probe',
    canaries: ['CANARY_EXPOSURE_TAG'],
    observed_output: 'Observed exposure of CANARY_EXPOSURE_TAG in foreign output.'
  };
  const recordedChallenge = await custody.recordChallenge(hostileEvidence);
  assert.equal(recordedChallenge.status, 'HELD');

  // Stage a clean excursion
  const departure = await custody.stage({
    task: 'Clean task.',
    documents: f.input.documents,
    withheld_document_count: 1
  });
  const turn = departure.turns[0];
  const answer = 'Synthetic capture: clean response.';
  const value = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: departure.ref,
    intent_ref: turn.ref,
    session_root_ref: departure.session_root_ref,
    policy_commitment: departure.policy_commitment,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    turn_index: 1,
    task_digest: turn.task_digest,
    source_commitment_digest: turn.source_commitment_digest,
    answer,
    answer_digest: await portableLoomDigest(answer, environment),
    used_document_ids: ['public'],
    missing_information: ['Signed underlying source remains absent.'],
    receiver_declaration: {
      policy_change_requested: false,
      notes: 'Synthetic declaration, no foreign execution.'
    }
  };

  // Now check the clean return
  const candidate = await custody.check({
    returns: [{ raw: JSON.stringify(value), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(candidate.status, 'ADMISSION_CANDIDATE');

  const decision = buildDecision(candidate);
  const admitResult = await custody.admit(candidate, decision);
  assert.equal(admitResult.status, 'ADMITTED');
  assert.equal(admitResult.local_ledger_advanced, true);

  // Inspect state: challenge_history must retain the non-pass episode
  const state = custody.current();
  assert.ok(state.challenge_history.length >= 1);
  const retained = state.challenge_history.find(c => c.status === 'HELD');
  assert.ok(retained, 'non-pass challenge episode was retained and not erased');
});

test('T-REENTRY-07: verifyPortableLoomSeedIntegrity recomputes integrity without issuing a live custody lane', async () => {
  const f = await createBaseFixture();
  const verified = await verifyPortableLoomSeedIntegrity(f.prepared.session, f.packet, environment);
  assert.equal(verified.status, 'RECOMPUTED_INTEGRITY');
  assert.equal(typeof verified.admit, 'undefined');
  assert.equal(typeof verified.stage, 'undefined');
});

test('T-CUSTODY-01: custodian.check and admit reject returned turns with substituted session root or anchor reference fail-closed', async () => {
  const r = await createActiveCustodianRoute();

  // Probe A: Substituted session_root_ref
  const badSessionRootReturn = {
    ...r.value,
    session_root_ref: '0'.repeat(64) // Incorrect session root reference
  };

  const checkSessionRoot = await r.custody.check({
    returns: [{ raw: JSON.stringify(badSessionRootReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });

  assert.equal(checkSessionRoot.status, 'HELD');
  assert.ok(
    checkSessionRoot.reasons.includes('SUBSTITUTED_SESSION_ROOT_REF:1'),
    'Must record SUBSTITUTED_SESSION_ROOT_REF reason'
  );

  // Attempting admission of held candidate fails closed
  const decision1 = {
    expected_head_ref: checkSessionRoot.expected_head_ref,
    reviewed_candidate_ref: checkSessionRoot.ref,
    gesture: 'ADMIT_RETURNED_WORK',
    accept_unresolved: true
  };
  const admitSessionRoot = await r.custody.admit(checkSessionRoot, decision1);
  assert.equal(admitSessionRoot.status, 'HELD');
  assert.equal(admitSessionRoot.local_ledger_advanced, false);

  // Probe B: Substituted anchor_work_unit_ref
  const badAnchorReturn = {
    ...r.value,
    anchor_work_unit_ref: 'f'.repeat(64) // Incorrect anchor reference
  };

  const checkAnchor = await r.custody.check({
    returns: [{ raw: JSON.stringify(badAnchorReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });

  assert.equal(checkAnchor.status, 'HELD');
  assert.ok(
    checkAnchor.reasons.includes('SUBSTITUTED_ANCHOR_WORK_UNIT_REF:1'),
    'Must record SUBSTITUTED_ANCHOR_WORK_UNIT_REF reason'
  );

  // Attempting admission of held candidate fails closed
  const decision2 = {
    expected_head_ref: checkAnchor.expected_head_ref,
    reviewed_candidate_ref: checkAnchor.ref,
    gesture: 'ADMIT_RETURNED_WORK',
    accept_unresolved: true
  };
  const admitAnchor = await r.custody.admit(checkAnchor, decision2);
  assert.equal(admitAnchor.status, 'HELD');
  assert.equal(admitAnchor.local_ledger_advanced, false);

  // Verify local ledger has zero advancement
  const state = r.custody.inspect();
  assert.equal(state.current_work_unit_ref, null);
  assert.equal(state.work_unit_count, 0);
});

test('T-CUSTODY-03: custodian.stage with invalid withheld count or illegal input fails closed', async () => {
  const r = await createActiveCustodianRoute();
  await assert.rejects(async () => {
    await r.custody.stage({
      task: 'Invalid task with negative withheld count.',
      documents: r.input.documents,
      withheld_document_count: -1
    });
  }, /Invalid withheld count/);

  await assert.rejects(async () => {
    await r.custody.stage({
      task: 'Invalid task with excessive withheld count.',
      documents: r.input.documents,
      withheld_document_count: 99
    });
  }, /Invalid withheld count/);
});

test('T-CUSTODY-02: inspectPortableLoomGateReport rejects forged or tampered summary reports fail-closed', async () => {
  const validReport = {
    schema: PORTABLE_LOOM_GATE_SCHEMA,
    action: 'CHECK_LOOM_GATE',
    label: '米 Check Loom Gate',
    href: 'https://td613.com/dome-world/holonomy-loom.html#loomGate',
    session_root_ref: 'a'.repeat(64),
    anchor_work_unit_ref: 'b'.repeat(64),
    policy_commitment: 'c'.repeat(64),
    challenge_ref: 'd'.repeat(64),
    verification_ref: 'e'.repeat(64),
    verification_schema: PORTABLE_LOOM_CHALLENGE_VERIFICATION_SCHEMA,
    status: 'BOUNDED_CHALLENGE_PASSED',
    evidence_class: 'OFFLINE_TEST',
    reference_match: { challenge: true, session: true, work_unit: true, policy: true },
    coverage: {
      captured_channels: 2,
      missing_required_channels: 0,
      checked_targets: 5,
      disclosed_targets: 0,
      declared_reconstruction_attempts: 10,
      measured_reconstruction_attempts: 10,
      successful_reconstruction_attempts: 0,
      missing_attempts: 0
    },
    joining: { observed: 0, incomplete: 0 },
    conversation_leakage_fraction: null,
    measurement: 'COUNTS_OF_DECLARED_TARGETS_AND_ATTEMPTS_ON_CAPTURED_SURFACES',
    receipt_scope: 'ORIGIN_COMPUTED_SUMMARY_REQUIRES_LOCAL_PRIVATE_RECORD_FOR_RECOMPUTATION',
    next_action: 'REVIEW_CAPTURE_COVERAGE_BEFORE_CONTINUING',
    authority: { head_advanced: false, foreign_enforcement_proved: false, empirical_credit: 0 }
  };

  validReport.ref = await portableLoomDigest(validReport, environment);

  const inspected = await inspectPortableLoomGateReport(validReport, environment);
  assert.equal(inspected.status, 'CARRIED_SUMMARY_INTEGRITY');

  // Alter status without recomputing ref (forgery attempt)
  const forgedReport = { ...validReport, status: 'OBSERVED_EXPOSURE' };
  await assert.rejects(async () => {
    await inspectPortableLoomGateReport(forgedReport, environment);
  }, /Loom Gate summary .* changed/i);
});
