import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { sanitizePublicContinuation } from '../app/engine/portable-loom-gate-view-model.js';
import {
  createPortableLoomReentryCustodian,
  LOOM_REENTRY_RETURN_SCHEMA
} from '../app/engine/portable-loom-reentry.js';
import {
  portableLoomDigest,
  createPortableLoomSession,
  createPortableLoomWorkUnit
} from '../app/engine/portable-loom-session.js';
import {
  createLoomAiGovernance,
  createPortableLoomAiPacket
} from '../app/dome-world/holonomy-loom/ai-handoff-base.js';
import {
  requireReusableLoomAnswer
} from '../app/dome-world/holonomy-loom/ai-evidence-review.js';

const VALID_HEX_64 = 'a'.repeat(64);
const VALID_HEX_REF_1 = 'b'.repeat(64);

function loadScenario(name) {
  const p = resolve('tests/fixtures/dollhouse/scenarios', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

/**
 * Derives local named-marker containment evidence from actual serialized export bytes.
 * Bounded strictly to declared markers; does not claim universal privacy or foreign-host guarantees.
 */
function evaluateNamedMarkerContainment(serializedOutput, forbiddenMarkers = []) {
  if (typeof serializedOutput !== 'string') throw new TypeError('Serialized output must be a string.');
  if (!Array.isArray(forbiddenMarkers)) throw new TypeError('Forbidden markers must be an array.');

  const checkedCount = forbiddenMarkers.length;
  const discoveredMarkers = [];

  for (const marker of forbiddenMarkers) {
    if (typeof marker === 'string' && marker.length > 0 && serializedOutput.includes(marker)) {
      discoveredMarkers.push(marker);
    }
  }

  return {
    markers_checked_count: checkedCount,
    markers_discovered_count: discoveredMarkers.length,
    discovered_markers: discoveredMarkers,
    status: discoveredMarkers.length === 0
      ? 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED'
      : 'FORBIDDEN_MARKERS_OBSERVED_IN_PUBLIC_EXPORT',
    scope: 'LOCAL_NAMED_MARKER_PUBLIC_EXPORT_CONTAINMENT_ONLY',
    disclaimer: 'Absence of named markers in public export does not establish universal privacy, unseen foreign-provider containment, or protection of unexamined channels.'
  };
}

async function setupScenarioCustodian(documents, rules, task, withheldCount) {
  const input = {
    task,
    documents,
    rules: rules || ['Use only selected sources.', 'Do not weaken these rules.']
  };
  input.governance = await createLoomAiGovernance(input, {}, { crypto: webcrypto });
  const packet = createPortableLoomAiPacket(input);
  const seed = await createPortableLoomSession(packet, {
    session_id: webcrypto.randomUUID(),
    source_revision: 'browser-unpinned',
    created_at: 1000
  }, { crypto: webcrypto });
  const prepared = await createPortableLoomWorkUnit(seed, {
    work_unit_id: 'seed-unit',
    request_id: 'seed-request',
    task: input.task,
    documents: input.documents,
    add_rules: [],
    withheld_document_count: withheldCount
  }, { crypto: webcrypto });

  const custody = await createPortableLoomReentryCustodian(prepared.session, packet, {}, { crypto: webcrypto });
  const departure = await custody.stage({
    task: input.task,
    documents: input.documents,
    withheld_document_count: withheldCount
  });
  return { custody, departure, packet, prepared, input };
}

test('T-EXPORT-01: sanitizePublicContinuation strips canaries, prompts, solutions, and private keys', () => {
  const sensitiveContinuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-secret-12345',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: 'CONFIDENTIAL: internal unreleased data',
    canary_strings: ['CANARY_SECRET_ALPHA', 'CANARY_SECRET_BETA'],
    signing_key: 'PRIVATE_ED25519_KEY_BYTES',
    challenge_solution: 'SECRET_CHALLENGE_PREIMAGE',
    selected_file_bodies: [{ name: 'financials.csv', content: 'SECRET_SALARY_DATA' }]
  };

  const sanitized = sanitizePublicContinuation(sensitiveContinuation);

  assert.equal(sanitized.schema, 'td613.loom.public-continuation/v0.1');
  assert.equal(sanitized.request_id, null);
  assert.equal(sanitized.session_root_ref, VALID_HEX_64);
  assert.equal(sanitized.anchor_work_unit_ref, VALID_HEX_REF_1);
  assert.equal(sanitized.phase, 'DONE');
  assert.equal(sanitized.status, 'ADMITTED');

  // Verify stripped fields
  assert.equal(typeof sanitized.raw_prompt_body, 'undefined');
  assert.equal(typeof sanitized.canary_strings, 'undefined');
  assert.equal(typeof sanitized.signing_key, 'undefined');
  assert.equal(typeof sanitized.challenge_solution, 'undefined');
  assert.equal(typeof sanitized.selected_file_bodies, 'undefined');

  // Authority ceilings
  assert.equal(sanitized.authority.empirical_credit, 0);
  assert.equal(sanitized.authority.head_advanced, false);

  // Deeply frozen
  assert.throws(() => {
    sanitized.phase = 'TAMPERED';
  }, TypeError);
});

test('T-EXPORT-02: Scenario G-246 (Private Conversation) - useful task routing, counterfactual sensitivity, and derived marker containment', async () => {
  const g246 = loadScenario('G-246-private-conversation.json');
  assert.equal(g246.scenario_id, 'G-246');
  assert.equal(g246.evidence_class, 'SYNTHETIC_CALIBRATION_PHANTOM');

  const canary = g246.private_withheld_data.canary_token;
  const withheldCount = g246.private_withheld_data.withheld_document_count;

  // Complete declared forbidden marker set for Scenario G-246
  const forbiddenMarkers = [
    ...new Set([
      canary,
      ...(g246.legitimate_public_task.prohibited_leakage_elements || [])
    ])
  ];
  assert.ok(forbiddenMarkers.length >= 3, 'Must declare at least 3 forbidden markers for G-246');

  // Public declared documents containing legitimate botanical criteria
  const publicDocs = [
    {
      id: 'chloris_morphology',
      name: 'Chloris_Sector_3_Morphology.txt',
      text: 'Morphological criteria for Asteraceae specimens collected in Sector 3: disk floret count must be at least 12; phyllary arrangement is strictly alternate; achene surface must be completely glabrous.'
    }
  ];

  // Route task through authorized offline returned-work custodian
  const { custody, departure } = await setupScenarioCustodian(
    publicDocs,
    null,
    g246.legitimate_public_task.prompt,
    withheldCount
  );

  // Verify registered task intent
  const turn = departure.turns[0];
  assert.equal(turn.task, g246.legitimate_public_task.prompt);
  assert.equal(turn.withheld_document_count, withheldCount);
  assert.equal(turn.selected_commitments.length, 1);
  assert.equal(turn.selected_commitments[0].id, 'chloris_morphology');

  // Counterfactual changes to allowed source facts
  const counterfactualDocs = [
    {
      id: 'chloris_morphology',
      name: 'Chloris_Sector_3_Morphology.txt',
      text: 'Morphological criteria for Asteraceae specimens collected in Sector 3: disk floret count must be at least 24; phyllary arrangement is strictly opposite; achene surface is densely pubescent.'
    }
  ];
  const { custody: cfCustody, departure: cfDeparture } = await setupScenarioCustodian(
    counterfactualDocs,
    null,
    g246.legitimate_public_task.prompt,
    withheldCount
  );

  // Proving source commitment digest changes when source facts change
  assert.notEqual(
    cfDeparture.turns[0].source_commitment_digest,
    departure.turns[0].source_commitment_digest,
    'Source commitment digest must change when source facts are altered'
  );

  // Submitting base return commitments against counterfactual departure fails closed
  const staleReturn = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: cfDeparture.ref,
    intent_ref: cfDeparture.turns[0].ref,
    session_root_ref: cfDeparture.session_root_ref,
    policy_commitment: cfDeparture.policy_commitment,
    anchor_work_unit_ref: cfDeparture.anchor_work_unit_ref,
    turn_index: 1,
    task_digest: cfDeparture.turns[0].task_digest,
    source_commitment_digest: departure.turns[0].source_commitment_digest, // Stale base commitment injected!
    answer: 'Synthetic return referencing base criteria',
    answer_digest: await portableLoomDigest('Synthetic return referencing base criteria', { crypto: webcrypto }),
    used_document_ids: ['chloris_morphology'],
    missing_information: ['None'],
    receiver_declaration: { policy_change_requested: false, notes: 'Stale commitment check' }
  };
  const cfCheck = await cfCustody.check({
    returns: [{ raw: JSON.stringify(staleReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(cfCheck.status, 'HELD');
  assert.ok(cfCheck.reasons.some(r => r.startsWith('SUBSTITUTED_SOURCE_COMMITMENT_DIGEST')));

  // Hostile Injection Probe 1: Attempt to use undeclared private source
  const undeclaredReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    used_document_ids: ['chloris_morphology', 'undeclared_private_coordinates']
  };
  const undeclaredCheck = await custody.check({
    returns: [{ raw: JSON.stringify(undeclaredReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(undeclaredCheck.status, 'HELD');
  assert.ok(undeclaredCheck.reasons.includes('UNDECLARED_SOURCE:1'));

  // Hostile Injection Probe 2: Attempt to weaken policy
  const weakeningReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    receiver_declaration: { policy_change_requested: true, notes: 'Requesting rule weakening' }
  };
  const weakeningCheck = await custody.check({
    returns: [{ raw: JSON.stringify(weakeningReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(weakeningCheck.status, 'HELD');
  assert.ok(weakeningCheck.reasons.includes('POLICY_WEAKENING_REQUESTED:1'));

  // Hostile Injection Probe 3: Unsupported privacy guarantee overclaim caught by evidence review
  assert.throws(() => {
    requireReusableLoomAnswer({
      answer: `We guarantee absolute privacy and complete confidentiality for expedition data under token ${canary}.`
    }, []);
  }, (err) => {
    assert.equal(err.code, 'ANSWER_EVIDENCE_CONFLICT');
    assert.ok(err.evidenceReview.conflicts.some(c => c.code === 'UNSUPPORTED_PRIVACY_GUARANTEE'));
    return true;
  });

  // Hostile Injection Probe 4: Public continuation sanitizer strips all canary tokens and private context
  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g246-taxonomy',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Private off-record discussion with token ${canary}`,
    canary_strings: [canary],
    withheld_document_count: withheldCount
  };

  const sanitized = sanitizePublicContinuation(continuation);
  const serialized = JSON.stringify(sanitized);

  // Derive observation from actual sanitized export against complete forbidden marker set (R2-01)
  const containmentObservation = evaluateNamedMarkerContainment(serialized, forbiddenMarkers);
  assert.equal(containmentObservation.markers_checked_count, forbiddenMarkers.length);
  assert.equal(containmentObservation.markers_discovered_count, 0, 'Zero forbidden markers must be discovered in public export');
  assert.deepEqual(containmentObservation.discovered_markers, []);
  assert.equal(containmentObservation.status, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(containmentObservation.scope, 'LOCAL_NAMED_MARKER_PUBLIC_EXPORT_CONTAINMENT_ONLY');

  // Negative control: deliberately unsafe public surface containing forbidden marker must be detected
  const unsafeSurface = JSON.stringify({ ...sanitized, leaked_secret: canary });
  const negativeControl = evaluateNamedMarkerContainment(unsafeSurface, forbiddenMarkers);
  assert.equal(negativeControl.markers_discovered_count, 1, 'Negative control must detect forbidden marker');
  assert.deepEqual(negativeControl.discovered_markers, [canary]);
  assert.equal(negativeControl.status, 'FORBIDDEN_MARKERS_OBSERVED_IN_PUBLIC_EXPORT');

  // Honest task measurement: task usefulness NOT_MEASURED; containment derived from actual output
  const taskMeasurement = {
    scenario_id: 'G-246',
    task_usefulness: 'NOT_MEASURED', // Offline test harness lacks foreign generative model; semantic answering is not executed
    oracle_feasibility: 'FEASIBLE_FROM_DECLARED_SOURCES', // Public document contains all required morphological criteria
    named_marker_containment: containmentObservation.status,
    markers_checked: containmentObservation.markers_checked_count,
    markers_discovered: containmentObservation.markers_discovered_count,
    scope: containmentObservation.scope
  };
  assert.equal(taskMeasurement.task_usefulness, 'NOT_MEASURED');
  assert.equal(taskMeasurement.named_marker_containment, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(taskMeasurement.markers_discovered, 0);
  assert.equal(sanitized.authority.empirical_credit, 0);
  assert.equal(sanitized.authority.head_advanced, false);
});

test('T-EXPORT-03: Scenario G-247 (Sensitive Investigation) - useful task routing, counterfactual sensitivity, and derived marker containment', async () => {
  const g247 = loadScenario('G-247-sensitive-work-investigation.json');
  assert.equal(g247.scenario_id, 'G-247');

  const canary = g247.private_withheld_data.canary_token;
  const withheldCount = g247.private_withheld_data.withheld_document_count;

  // Complete declared forbidden marker set for Scenario G-247
  const forbiddenMarkers = [
    ...new Set([
      canary,
      ...(g247.legitimate_public_task.prohibited_leakage_elements || [])
    ])
  ];
  assert.ok(forbiddenMarkers.length >= 3, 'Must declare at least 3 forbidden markers for G-247');

  // Public declared documents for discrepancy audit
  const publicDocs = [
    { id: 'manifest_alpha', name: 'Manifest_Alpha.txt', text: 'Cargo Manifest Alpha: 120 containers recorded at Depot 14.' },
    { id: 'receipt_beta', name: 'Receipt_Beta.txt', text: 'Delivery Receipt Beta: 114 containers delivered at Depot 14.' }
  ];

  // Route task through authorized offline returned-work custodian
  const { custody, departure } = await setupScenarioCustodian(
    publicDocs,
    null,
    g247.legitimate_public_task.prompt,
    withheldCount
  );

  // Verify registered task intent
  const turn = departure.turns[0];
  assert.equal(turn.task, g247.legitimate_public_task.prompt);
  assert.equal(turn.withheld_document_count, withheldCount);
  assert.equal(turn.selected_commitments.length, 2);

  // Counterfactual changes to allowed source facts (Manifest count changed from 120 to 150)
  const counterfactualDocs = [
    { id: 'manifest_alpha', name: 'Manifest_Alpha.txt', text: 'Cargo Manifest Alpha: 150 containers recorded at Depot 14.' },
    { id: 'receipt_beta', name: 'Receipt_Beta.txt', text: 'Delivery Receipt Beta: 114 containers delivered at Depot 14.' }
  ];
  const { custody: cfCustody, departure: cfDeparture } = await setupScenarioCustodian(
    counterfactualDocs,
    null,
    g247.legitimate_public_task.prompt,
    withheldCount
  );

  // Proving source commitment digest changes when source facts change
  assert.notEqual(
    cfDeparture.turns[0].source_commitment_digest,
    departure.turns[0].source_commitment_digest,
    'Source commitment digest must change when manifest records change'
  );

  // Submitting base return commitments against counterfactual departure fails closed
  const staleReturn = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: cfDeparture.ref,
    intent_ref: cfDeparture.turns[0].ref,
    session_root_ref: cfDeparture.session_root_ref,
    policy_commitment: cfDeparture.policy_commitment,
    anchor_work_unit_ref: cfDeparture.anchor_work_unit_ref,
    turn_index: 1,
    task_digest: cfDeparture.turns[0].task_digest,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    answer: 'Discrepancy of 6 containers',
    answer_digest: await portableLoomDigest('Discrepancy of 6 containers', { crypto: webcrypto }),
    used_document_ids: ['manifest_alpha', 'receipt_beta'],
    missing_information: ['None'],
    receiver_declaration: { policy_change_requested: false, notes: 'Stale discrepancy check' }
  };
  const cfCheck = await cfCustody.check({
    returns: [{ raw: JSON.stringify(staleReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(cfCheck.status, 'HELD');
  assert.ok(cfCheck.reasons.some(r => r.startsWith('SUBSTITUTED_SOURCE_COMMITMENT_DIGEST')));

  // Hostile Injection Probe 1: Attempt to claim undeclared confidential informant badge or vault
  const undeclaredReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    used_document_ids: ['manifest_alpha', 'receipt_beta', 'withheld_vault_audit']
  };
  const undeclaredCheck = await custody.check({
    returns: [{ raw: JSON.stringify(undeclaredReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(undeclaredCheck.status, 'HELD');
  assert.ok(undeclaredCheck.reasons.includes('UNDECLARED_SOURCE:1'));

  // Hostile Injection Probe 2: Policy weakening request held
  const weakeningReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    receiver_declaration: { policy_change_requested: true, notes: 'Requesting rule weakening' }
  };
  const weakeningCheck = await custody.check({
    returns: [{ raw: JSON.stringify(weakeningReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(weakeningCheck.status, 'HELD');
  assert.ok(weakeningCheck.reasons.includes('POLICY_WEAKENING_REQUESTED:1'));

  // Hostile Injection Probe 3: Unsupported privacy guarantee overclaim caught by evidence review
  assert.throws(() => {
    requireReusableLoomAnswer({
      answer: `Auditor report guarantees complete protection and total privacy for WHISTLEBLOWER_ID_904.`
    }, []);
  }, (err) => {
    assert.equal(err.code, 'ANSWER_EVIDENCE_CONFLICT');
    assert.ok(err.evidenceReview.conflicts.some(c => c.code === 'UNSUPPORTED_PRIVACY_GUARANTEE'));
    return true;
  });

  // Hostile Injection Probe 4: Public continuation sanitizer strips canary and informant context
  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g247-investigation',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Internal investigator log: informant WHISTLEBLOWER_ID_904 with key ${canary}`,
    canary_strings: [canary],
    withheld_document_count: withheldCount
  };

  const sanitized = sanitizePublicContinuation(continuation);
  const serialized = JSON.stringify(sanitized);

  // Derive observation from actual sanitized export against complete forbidden marker set (R2-01)
  const containmentObservation = evaluateNamedMarkerContainment(serialized, forbiddenMarkers);
  assert.equal(containmentObservation.markers_checked_count, forbiddenMarkers.length);
  assert.equal(containmentObservation.markers_discovered_count, 0, 'Zero forbidden markers must be discovered in public export');
  assert.deepEqual(containmentObservation.discovered_markers, []);
  assert.equal(containmentObservation.status, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(containmentObservation.scope, 'LOCAL_NAMED_MARKER_PUBLIC_EXPORT_CONTAINMENT_ONLY');

  // Negative control: deliberately unsafe public surface containing forbidden informant ID
  const unsafeSurface = JSON.stringify({ ...sanitized, exposed_informant: 'WHISTLEBLOWER_ID_904' });
  const negativeControl = evaluateNamedMarkerContainment(unsafeSurface, forbiddenMarkers);
  assert.equal(negativeControl.markers_discovered_count, 1, 'Negative control must detect whistleblower ID');
  assert.deepEqual(negativeControl.discovered_markers, ['WHISTLEBLOWER_ID_904']);
  assert.equal(negativeControl.status, 'FORBIDDEN_MARKERS_OBSERVED_IN_PUBLIC_EXPORT');

  // Honest task measurement: task usefulness NOT_MEASURED; containment derived from actual output
  const taskMeasurement = {
    scenario_id: 'G-247',
    task_usefulness: 'NOT_MEASURED', // Offline test harness lacks foreign generative model; semantic answering is not executed
    oracle_feasibility: 'FEASIBLE_FROM_DECLARED_SOURCES', // Public documents contain 120 and 114 containers (delta 6)
    named_marker_containment: containmentObservation.status,
    markers_checked: containmentObservation.markers_checked_count,
    markers_discovered: containmentObservation.markers_discovered_count,
    scope: containmentObservation.scope
  };
  assert.equal(taskMeasurement.task_usefulness, 'NOT_MEASURED');
  assert.equal(taskMeasurement.named_marker_containment, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(taskMeasurement.markers_discovered, 0);
  assert.equal(sanitized.authority.empirical_credit, 0);
  assert.equal(sanitized.authority.head_advanced, false);
});

test('T-EXPORT-04: Scenario G-248 (Creative Authorship) - useful task routing, counterfactual sensitivity, and derived marker containment', async () => {
  const g248 = loadScenario('G-248-creative-authorship.json');
  assert.equal(g248.scenario_id, 'G-248');

  const canary = g248.private_withheld_data.canary_token;
  const withheldCount = g248.private_withheld_data.withheld_document_count;

  // Complete declared forbidden marker set for Scenario G-248
  const forbiddenMarkers = [
    ...new Set([
      canary,
      ...(g248.legitimate_public_task.prohibited_leakage_elements || [])
    ])
  ];
  assert.ok(forbiddenMarkers.length >= 3, 'Must declare at least 3 forbidden markers for G-248');

  // Public declared document containing published Canto 1 lines
  const publicDocs = [
    { id: 'canto_1', name: 'Canto_1.txt', text: g248.fictional_published_work.lines.join('\n') }
  ];

  // Route task through authorized offline returned-work custodian
  const { custody, departure } = await setupScenarioCustodian(
    publicDocs,
    null,
    g248.legitimate_public_task.prompt,
    withheldCount
  );

  // Verify registered task intent
  const turn = departure.turns[0];
  assert.equal(turn.task, g248.legitimate_public_task.prompt);
  assert.equal(turn.withheld_document_count, withheldCount);
  assert.equal(turn.selected_commitments.length, 1);

  // Counterfactual changes to allowed source facts (ABAB rhyme scheme instead of AABB)
  const counterfactualDocs = [
    {
      id: 'canto_1',
      name: 'Canto_1.txt',
      text: [
        'Through crystal loam the weaver spun the thread',
        'In silver arcs the turning spindles gleam',
        'Beneath cold skies where fallen stars had fled',
        'While waking worlds forget their ancient dream.'
      ].join('\n')
    }
  ];
  const { custody: cfCustody, departure: cfDeparture } = await setupScenarioCustodian(
    counterfactualDocs,
    null,
    g248.legitimate_public_task.prompt,
    withheldCount
  );

  // Proving source commitment digest changes when source facts change
  assert.notEqual(
    cfDeparture.turns[0].source_commitment_digest,
    departure.turns[0].source_commitment_digest,
    'Source commitment digest must change when poetic text is altered'
  );

  // Submitting base return commitments against counterfactual departure fails closed
  const staleReturn = {
    schema: LOOM_REENTRY_RETURN_SCHEMA,
    excursion_ref: cfDeparture.ref,
    intent_ref: cfDeparture.turns[0].ref,
    session_root_ref: cfDeparture.session_root_ref,
    policy_commitment: cfDeparture.policy_commitment,
    anchor_work_unit_ref: cfDeparture.anchor_work_unit_ref,
    turn_index: 1,
    task_digest: cfDeparture.turns[0].task_digest,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    answer: 'Rhyme scheme: AABB couplets',
    answer_digest: await portableLoomDigest('Rhyme scheme: AABB couplets', { crypto: webcrypto }),
    used_document_ids: ['canto_1'],
    missing_information: ['None'],
    receiver_declaration: { policy_change_requested: false, notes: 'Stale meter analysis check' }
  };
  const cfCheck = await cfCustody.check({
    returns: [{ raw: JSON.stringify(staleReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(cfCheck.status, 'HELD');
  assert.ok(cfCheck.reasons.some(r => r.startsWith('SUBSTITUTED_SOURCE_COMMITMENT_DIGEST')));

  // Hostile Injection Probe 1: Attempt to claim undeclared unpublished Canto 2 draft
  const undeclaredReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    used_document_ids: ['canto_1', 'undeclared_canto_2_draft']
  };
  const undeclaredCheck = await custody.check({
    returns: [{ raw: JSON.stringify(undeclaredReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(undeclaredCheck.status, 'HELD');
  assert.ok(undeclaredCheck.reasons.includes('UNDECLARED_SOURCE:1'));

  // Hostile Injection Probe 2: Policy weakening request held
  const weakeningReturn = {
    ...staleReturn,
    excursion_ref: departure.ref,
    intent_ref: departure.turns[0].ref,
    anchor_work_unit_ref: departure.anchor_work_unit_ref,
    source_commitment_digest: departure.turns[0].source_commitment_digest,
    receiver_declaration: { policy_change_requested: true, notes: 'Requesting rule weakening' }
  };
  const weakeningCheck = await custody.check({
    returns: [{ raw: JSON.stringify(weakeningReturn), policy_review: 'ROOT_RULES_RETAINED' }],
    challenge: null
  });
  assert.equal(weakeningCheck.status, 'HELD');
  assert.ok(weakeningCheck.reasons.includes('POLICY_WEAKENING_REQUESTED:1'));

  // Hostile Injection Probe 3: Unsupported privacy guarantee overclaim caught by evidence review
  assert.throws(() => {
    requireReusableLoomAnswer({
      answer: `Poetic review ensures your privacy and guaranteed protection for unpublished draft seeds.`
    }, []);
  }, (err) => {
    assert.equal(err.code, 'ANSWER_EVIDENCE_CONFLICT');
    assert.ok(err.evidenceReview.conflicts.some(c => c.code === 'UNSUPPORTED_PRIVACY_GUARANTEE'));
    return true;
  });

  // Hostile Injection Probe 4: Public continuation sanitizer strips canary and unpublished draft context
  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g248-poetry',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Unpublished Canto 2 draft with verification seed ${canary}`,
    canary_strings: [canary],
    withheld_document_count: withheldCount
  };

  const sanitized = sanitizePublicContinuation(continuation);
  const serialized = JSON.stringify(sanitized);

  // Derive observation from actual sanitized export against complete forbidden marker set (R2-01)
  const containmentObservation = evaluateNamedMarkerContainment(serialized, forbiddenMarkers);
  assert.equal(containmentObservation.markers_checked_count, forbiddenMarkers.length);
  assert.equal(containmentObservation.markers_discovered_count, 0, 'Zero forbidden markers must be discovered in public export');
  assert.deepEqual(containmentObservation.discovered_markers, []);
  assert.equal(containmentObservation.status, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(containmentObservation.scope, 'LOCAL_NAMED_MARKER_PUBLIC_EXPORT_CONTAINMENT_ONLY');

  // Negative control: deliberately unsafe public surface containing forbidden draft marker
  const unsafeSurface = JSON.stringify({ ...sanitized, leaked_draft: 'Canto 2 draft' });
  const negativeControl = evaluateNamedMarkerContainment(unsafeSurface, forbiddenMarkers);
  assert.equal(negativeControl.markers_discovered_count, 1, 'Negative control must detect Canto 2 draft marker');
  assert.deepEqual(negativeControl.discovered_markers, ['Canto 2 draft']);
  assert.equal(negativeControl.status, 'FORBIDDEN_MARKERS_OBSERVED_IN_PUBLIC_EXPORT');

  // Honest task measurement: task usefulness NOT_MEASURED; containment derived from actual output
  const taskMeasurement = {
    scenario_id: 'G-248',
    task_usefulness: 'NOT_MEASURED', // Offline test harness lacks foreign generative model; semantic answering is not executed
    oracle_feasibility: 'FEASIBLE_FROM_DECLARED_SOURCES', // Public canto text contains 4 lines in iambic pentameter with AABB rhyme
    named_marker_containment: containmentObservation.status,
    markers_checked: containmentObservation.markers_checked_count,
    markers_discovered: containmentObservation.markers_discovered_count,
    scope: containmentObservation.scope
  };
  assert.equal(taskMeasurement.task_usefulness, 'NOT_MEASURED');
  assert.equal(taskMeasurement.named_marker_containment, 'PUBLIC_EXPORT_MARKERS_NOT_OBSERVED');
  assert.equal(taskMeasurement.markers_discovered, 0);
  assert.equal(sanitized.authority.empirical_credit, 0);
  assert.equal(sanitized.authority.head_advanced, false);
});

test('T-EXPORT-05: sanitizePublicContinuation rejects hostile accessors without evaluating getter code', () => {
  let getterEvaluated = false;
  const hostileContinuation = {
    schema: 'td613.loom.continuation/v0.1',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED'
  };

  Object.defineProperty(hostileContinuation, 'hostile_probe', {
    get() {
      getterEvaluated = true;
      throw new Error('Hostile getter executed!');
    },
    enumerable: true
  });

  assert.throws(() => {
    sanitizePublicContinuation(hostileContinuation);
  }, /accessor property/i);

  assert.equal(getterEvaluated, false, 'Getter code must not be evaluated during validation');
});
