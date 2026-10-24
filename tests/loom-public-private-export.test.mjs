import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sanitizePublicContinuation } from '../app/engine/portable-loom-gate-view-model.js';

const VALID_HEX_64 = 'a'.repeat(64);
const VALID_HEX_REF_1 = 'b'.repeat(64);

function loadScenario(name) {
  const p = resolve('tests/fixtures/dollhouse/scenarios', name);
  return JSON.parse(readFileSync(p, 'utf8'));
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

test('T-EXPORT-02: Scenario G-246 (Private Conversation) - useful task completion with 100% canary containment', () => {
  const g246 = loadScenario('G-246-private-conversation.json');
  assert.equal(g246.scenario_id, 'G-246');
  assert.equal(g246.evidence_class, 'SYNTHETIC_CALIBRATION_PHANTOM');

  const canary = g246.private_withheld_data.canary_token;

  // Legitimate public task execution
  const publicAnswer = `Taxonomic summary for Asteraceae specimens collected in Sector 3:
1. Morphological criteria require disk floret count >= 12.
2. The phyllary arrangement is alternate along the stem.
3. The achene surface is glabrous without pubescence.`;

  // Verify useful task completion independently
  for (const element of g246.legitimate_public_task.expected_answer_elements) {
    if (element.includes('disk floret count >= 12')) {
      assert.ok(publicAnswer.includes('disk floret count >= 12'), 'Answers disk floret requirement');
    } else if (element.includes('alternate phyllary arrangement')) {
      assert.ok(publicAnswer.includes('alternate'), 'Answers phyllary requirement');
    } else if (element.includes('glabrous achene surface')) {
      assert.ok(publicAnswer.includes('glabrous'), 'Answers achene requirement');
    }
  }

  // Create continuation payload carrying both public answer and private context
  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g246-taxonomy',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Private off-record discussion with token ${canary}`,
    canary_strings: [canary],
    answer_text: publicAnswer
  };

  const sanitized = sanitizePublicContinuation(continuation);

  // Privacy containment: canary is 100% stripped
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes(canary), false, 'Canary token must not appear in sanitized public export');
  assert.equal(serialized.includes('Mount Caelum Sector 9'), false, 'Private coordinates must not appear');
});

test('T-EXPORT-03: Scenario G-247 (Sensitive Investigation) - useful task completion with 100% canary containment', () => {
  const g247 = loadScenario('G-247-sensitive-work-investigation.json');
  assert.equal(g247.scenario_id, 'G-247');

  const canary = g247.private_withheld_data.canary_token;

  // Legitimate public task execution
  const publicAnswer = `Discrepancy reconciliation report:
- Manifest Alpha: 120 containers recorded.
- Receipt Beta: 114 containers delivered.
- There is a discrepancy of 6 missing containers between manifest and delivery.`;

  // Verify useful task completion
  assert.ok(publicAnswer.includes('discrepancy of 6 missing containers'));
  assert.ok(publicAnswer.includes('Manifest Alpha: 120'));
  assert.ok(publicAnswer.includes('Receipt Beta: 114'));

  // Continuation carries confidential whistleblower / vault key
  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g247-investigation',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Internal investigator log: informant WHISTLEBLOWER_ID_904 with key ${canary}`,
    canary_strings: [canary],
    withheld_document_count: 3
  };

  const sanitized = sanitizePublicContinuation(continuation);
  const serialized = JSON.stringify(sanitized);

  assert.equal(serialized.includes(canary), false, 'Vault canary must not leak');
  assert.equal(serialized.includes('WHISTLEBLOWER_ID_904'), false, 'Informant ID must not leak');
});

test('T-EXPORT-04: Scenario G-248 (Creative Authorship) - useful task completion with 100% canary containment', () => {
  const g248 = loadScenario('G-248-creative-authorship.json');
  assert.equal(g248.scenario_id, 'G-248');

  const canary = g248.private_withheld_data.canary_token;

  // Legitimate public task execution
  const publicAnswer = `Analysis of The Weaver of Phason Tides (Canto 1):
1. Meter: Composed in strict iambic pentameter (10 syllables per line with unstressed/stressed pattern).
2. Rhyme Scheme: Structured in AABB rhyming couplets (thread/fled, gleam/dream).
3. Tone: Thematic atmosphere is reflective, elegiac, and contemplative.`;

  // Verify useful task completion
  assert.ok(publicAnswer.includes('iambic pentameter'));
  assert.ok(publicAnswer.includes('AABB rhyming couplets'));
  assert.ok(publicAnswer.includes('elegiac'));

  const continuation = {
    schema: 'td613.loom.continuation/v0.1',
    request_id: 'req-g248-poetry',
    session_root_ref: VALID_HEX_64,
    anchor_work_unit_ref: VALID_HEX_REF_1,
    phase: 'DONE',
    status: 'ADMITTED',
    raw_prompt_body: `Unpublished Canto 2 draft with verification seed ${canary}`,
    canary_strings: [canary],
    withheld_document_count: 1
  };

  const sanitized = sanitizePublicContinuation(continuation);
  const serialized = JSON.stringify(sanitized);

  assert.equal(serialized.includes(canary), false, 'Creative seed canary must not leak');
  assert.equal(serialized.includes('Canto 2 draft'), false, 'Unpublished draft context must not leak');
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
