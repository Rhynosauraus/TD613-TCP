import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOLLHOUSE_DESIGN_SCHEMA,
  DOLLHOUSE_DESIGN_VERSION,
  AVAILABLE_INSTRUMENTS,
  VALID_MEDIA,
  normalizeCommission,
  runDollhouseDesignCycle
} from '../app/engine/dollhouse-design-conductor.js';

test('TD613 Dollhouse Design Conductor - Schema & Constants', () => {
  assert.equal(DOLLHOUSE_DESIGN_SCHEMA, 'td613.dollhouse-design.return-receipt/v0.1');
  assert.equal(DOLLHOUSE_DESIGN_VERSION, 'v0.1-candidate');
  
  const expectedInstruments = [
    'PHASONIC_COUNTERPOINT',
    'CARO_INSTITUTIONAL_RECONSTRUCTION',
    'BUTLER_PERFORMATIVE_ITERATION',
    'SEDGWICK_REPARATIVE_TEXTURE',
    'DIALECTICAL_TENSION'
  ];
  assert.deepEqual(Object.keys(AVAILABLE_INSTRUMENTS).sort(), expectedInstruments.sort());
  assert.ok(Object.isFrozen(AVAILABLE_INSTRUMENTS));

  const expectedMedia = ['VISUAL', 'MOTION', 'SCHOLARLY', 'THEORETICAL', 'PRODUCT', 'HYBRID'];
  assert.deepEqual(VALID_MEDIA.slice().sort(), expectedMedia.sort());
  assert.ok(Object.isFrozen(VALID_MEDIA));
});

test('TD613 Dollhouse Design Conductor - normalizeCommission input validation', () => {
  // Empty seed throws
  assert.throws(() => normalizeCommission({}), {
    name: 'TypeError',
    message: /Commission requires an intellectual seed/
  });
  assert.throws(() => normalizeCommission({ seed: '   ' }), {
    name: 'TypeError',
    message: /Commission requires an intellectual seed/
  });

  // Invalid medium throws
  assert.throws(() => normalizeCommission({ seed: 'Valid Seed', medium: 'INVALID_MEDIUM' }), {
    name: 'TypeError',
    message: /Invalid medium "INVALID_MEDIUM"/
  });

  // Valid defaults
  const norm = normalizeCommission({ seed: 'The weight of absence' });
  assert.equal(norm.seed, 'The weight of absence');
  assert.equal(norm.medium, 'SCHOLARLY');
  assert.deepEqual(norm.instruments, ['PHASONIC_COUNTERPOINT']);
  assert.ok(norm.commission_id.startsWith('COMM-'));

  // Normalization of 6-tuple Human Coordinates
  const customHc = normalizeCommission({
    seed: 'Test Seed',
    medium: 'visual',
    human_coordinates: {
      what: 'Physical threshold',
      who: 'Observer',
      where: 'Corridor',
      how: 'Light gradient',
      when: 'Arrival',
      why: 'Witnessing'
    },
    instruments: ['CARO_INSTITUTIONAL_RECONSTRUCTION', 'SEDGWICK_REPARATIVE_TEXTURE', 'UNKNOWN_INSTRUMENT']
  });

  assert.equal(customHc.medium, 'VISUAL');
  assert.equal(customHc.human_coordinates.what, 'Physical threshold');
  assert.equal(customHc.human_coordinates.who, 'Observer');
  assert.equal(customHc.human_coordinates.where, 'Corridor');
  assert.equal(customHc.human_coordinates.how, 'Light gradient');
  assert.equal(customHc.human_coordinates.when, 'Arrival');
  assert.equal(customHc.human_coordinates.why, 'Witnessing');
  assert.deepEqual(customHc.instruments, ['CARO_INSTITUTIONAL_RECONSTRUCTION', 'SEDGWICK_REPARATIVE_TEXTURE']);
});

test('TD613 Dollhouse Design Conductor - runDollhouseDesignCycle Full Execution', async () => {
  const seed = 'Two distinct processes arrive at an identical endpoint, but their histories differ';
  const receipt = await runDollhouseDesignCycle({
    seed,
    medium: 'VISUAL',
    instruments: ['PHASONIC_COUNTERPOINT', 'SEDGWICK_REPARATIVE_TEXTURE'],
    human_coordinates: {
      what: 'Interactive two-path visualization',
      who: 'The human investigator',
      where: 'Desktop & mobile canvas viewport',
      how: 'D₃ periodic scaffold coupled with φ quasiperiodic detour',
      when: 'Three distinct stages: traversal, inspection, unfolding',
      why: 'To demonstrate that endpoint equivalence does not imply identical journey'
    }
  });

  // Receipt schema & typing
  assert.equal(receipt.schema, DOLLHOUSE_DESIGN_SCHEMA);
  assert.equal(receipt.version, DOLLHOUSE_DESIGN_VERSION);
  assert.equal(receipt.seed, seed);
  assert.equal(receipt.medium, 'VISUAL');
  assert.deepEqual(receipt.selected_instruments, ['PHASONIC_COUNTERPOINT', 'SEDGWICK_REPARATIVE_TEXTURE']);

  // Generates dual candidates
  assert.equal(receipt.candidates.length, 2);
  const [candA, candB] = receipt.candidates;
  assert.ok(candA.id.includes('CAND-A'));
  assert.ok(candB.id.includes('CAND-B'));
  assert.ok(candA.structural_mechanisms.length >= 3);
  assert.ok(candB.structural_mechanisms.length >= 3);
  assert.notEqual(candA.concept_title, candB.concept_title);

  // Primary materialization uses 5 generative verbs
  const verbs = receipt.primary_materialization.operative_verbs.map(v => v.verb);
  assert.deepEqual(verbs, ['PROPAGATION', 'COMPRESSION', 'COUPLING', 'TRANSITION', 'STABILIZATION']);

  // Refractive variant mutates a governing parameter
  assert.ok(receipt.refractive_variant.id.includes('REFRACT'));
  assert.ok(receipt.refractive_variant.mutated_parameter);
  assert.ok(receipt.refractive_variant.formal_consequence);

  // Comparative analysis contains invariants, divergent traits, and open questions
  assert.ok(receipt.comparative_analysis.shared_invariants.length > 0);
  assert.ok(receipt.comparative_analysis.divergent_qualities.length > 0);
  assert.ok(receipt.comparative_analysis.open_aesthetic_questions.length > 0);

  // Instrument provenance ledger traces lineage
  assert.equal(receipt.instrument_provenance.length, 2);
  assert.equal(receipt.instrument_provenance[0].instrument_id, 'PHASONIC_COUNTERPOINT');
  assert.equal(receipt.instrument_provenance[1].instrument_id, 'SEDGWICK_REPARATIVE_TEXTURE');

  // Scientific Firebreak & Governance verification
  assert.equal(receipt.governance.discourse_mode, 'OPEN_FIELD_CREATIVE_SYNTHESIS');
  assert.equal(receipt.governance.scientific_proof, false);
  assert.equal(receipt.governance.release_authority, false);
  assert.equal(receipt.governance.deployment_authority, false);
  assert.equal(receipt.governance.human_closure_required, true);
});

test('TD613 Dollhouse Design Conductor - Deep Immutability of Returned Receipt', async () => {
  const receipt = await runDollhouseDesignCycle({
    seed: 'Immutable Artifact Test',
    medium: 'THEORETICAL'
  });

  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.candidates));
  assert.ok(Object.isFrozen(receipt.primary_materialization));
  assert.ok(Object.isFrozen(receipt.refractive_variant));
  assert.ok(Object.isFrozen(receipt.governance));

  // Mutations must fail
  assert.throws(() => {
    receipt.seed = 'Mutated';
  }, /Cannot assign to read only property/);
  assert.throws(() => {
    receipt.governance.release_authority = true;
  }, /Cannot assign to read only property/);
});
