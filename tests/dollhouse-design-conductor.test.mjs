import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOLLHOUSE_DESIGN_SCHEMA,
  DOLLHOUSE_DESIGN_VERSION,
  AVAILABLE_INSTRUMENTS,
  VALID_MEDIA,
  normalizeCommission,
  analyzeSeedSemantics,
  deriveCommissionCandidates,
  buildInstrumentCausalContract,
  runDollhouseDesignCycle
} from '../app/engine/dollhouse-design-conductor.js';

test('TD613 Dollhouse Design Conductor v0.2 - Schema & Constants', () => {
  assert.equal(DOLLHOUSE_DESIGN_SCHEMA, 'td613.dollhouse-design.return-receipt/v0.2');
  assert.equal(DOLLHOUSE_DESIGN_VERSION, 'v0.2-candidate');
  
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

test('TD613 Dollhouse Design Conductor v0.2 - analyzeSeedSemantics', () => {
  const seed1 = 'A theater in which punctuation marks are the stage machinery, and each scene quietly changes the grammar of the scene before it.';
  const analysis1 = analyzeSeedSemantics(seed1);

  assert.equal(analysis1.raw, seed1);
  assert.ok(analysis1.salient_keywords.includes('theater'));
  assert.ok(analysis1.salient_keywords.includes('punctuation'));
  assert.ok(analysis1.salient_keywords.includes('machinery'));
  assert.ok(analysis1.detected_clusters.machinery.includes('machinery'));
  assert.ok(analysis1.detected_clusters.textual.includes('punctuation'));
  assert.ok(analysis1.detected_clusters.spatial.includes('theater'));
  assert.ok(analysis1.detected_clusters.temporal.includes('scene'));

  const seed2 = 'Estuary Title Dissolution';
  const analysis2 = analyzeSeedSemantics(seed2);
  assert.ok(analysis2.salient_keywords.includes('estuary'));
  assert.ok(analysis2.detected_clusters.spatial.includes('estuary'));
  assert.ok(analysis2.detected_clusters.institutional.includes('title'));
});

test('TD613 Dollhouse Design Conductor v0.2 - Commission-Derived Alternatives', () => {
  // Commission 1: The Punctuation Theater
  const comm1 = normalizeCommission({
    seed: 'A theater in which punctuation marks are the stage machinery, and each scene quietly changes the grammar of the scene before it.',
    medium: 'HYBRID',
    instruments: ['PHASONIC_COUNTERPOINT']
  });
  const [cand1A, cand1B] = deriveCommissionCandidates(comm1);

  assert.equal(cand1A.proposal_origin, 'COMMISSION_DERIVED');
  assert.equal(cand1B.proposal_origin, 'COMMISSION_DERIVED');
  assert.ok(cand1A.concept_title.toLowerCase().includes('punctuation') || cand1A.concept_title.toLowerCase().includes('machinery'));
  assert.ok(cand1A.formal_proposition.toLowerCase().includes('textual') || cand1A.formal_proposition.toLowerCase().includes('stage'));

  // Commission 2: The Two Distinct Processes (Endpoint Equivalence)
  const comm2 = normalizeCommission({
    seed: 'Two distinct processes arrive at an identical endpoint, but their histories differ',
    medium: 'VISUAL',
    instruments: ['PHASONIC_COUNTERPOINT', 'SEDGWICK_REPARATIVE_TEXTURE']
  });
  const [cand2A, cand2B] = deriveCommissionCandidates(comm2);

  // Substantive distinction test: Candidate titles and formal propositions must differ between seeds!
  assert.notEqual(cand1A.concept_title, cand2A.concept_title);
  assert.notEqual(cand1A.formal_proposition, cand2A.formal_proposition);
  assert.notEqual(cand1B.concept_title, cand2B.concept_title);
  assert.notEqual(cand1B.formal_proposition, cand2B.formal_proposition);

  // Neither candidate can use the old hardcoded strings
  assert.notEqual(cand1A.concept_title, 'The Stratigraphic Separation');
  assert.notEqual(cand1B.concept_title, 'The Procedural Inversion');
  assert.notEqual(cand2A.concept_title, 'The Stratigraphic Separation');
  assert.notEqual(cand2B.concept_title, 'The Procedural Inversion');
});

test('TD613 Dollhouse Design Conductor v0.2 - Author Candidate Overrides', () => {
  const customCandidates = [
    {
      concept_title: 'The Cartographic Palimpsest',
      formal_proposition: 'Superimposes erased colonial parcel boundaries over contemporary satellite imagery.',
      structural_mechanisms: ['Cadastral overlay', 'Opacity modulation', 'Toponym restoration'],
      medium_consequence: 'Exposes how modern land title conceals indigenous displacement.'
    },
    {
      concept_title: 'The Riparian Common',
      formal_proposition: 'Organizes the interface around seasonal water levels rather than statutory property deeds.',
      structural_mechanisms: ['Tidal timeline', 'Communal easement ledger', 'Submerged monument tracking'],
      medium_consequence: 'Subverts property boundaries through ecological impermanence.'
    }
  ];

  const comm = normalizeCommission({
    seed: 'Estuary Boundary Dispute',
    medium: 'SCHOLARLY',
    candidate_overrides: customCandidates
  });

  const candidates = deriveCommissionCandidates(comm);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].concept_title, 'The Cartographic Palimpsest');
  assert.equal(candidates[0].proposal_origin, 'OPERATOR_OVERRIDE');
  assert.equal(candidates[1].concept_title, 'The Riparian Common');
  assert.equal(candidates[1].proposal_origin, 'OPERATOR_OVERRIDE');
});

test('TD613 Dollhouse Design Conductor v0.2 - Causally Consequential Instrumentation Contract', () => {
  const phasonicContract = buildInstrumentCausalContract('PHASONIC_COUNTERPOINT', 'HYBRID', ['punctuation', 'machinery']);
  assert.equal(phasonicContract.instrument_id, 'PHASONIC_COUNTERPOINT');
  assert.equal(phasonicContract.causality_class, 'OPERATIVE_TRANSFER');
  assert.deepEqual(phasonicContract.target_domains, ['GEOMETRY', 'MOTION', 'GRAMMAR']);
  assert.ok(phasonicContract.causal_bindings.length >= 2);

  const latticeBinding = phasonicContract.causal_bindings.find(b => b.target_component === 'spatial_lattice_geometry');
  assert.ok(latticeBinding);
  assert.equal(latticeBinding.parameter, 'scalar_interference_H');
  assert.ok(latticeBinding.transfer_law.includes('24.0 * H(u)'));
  assert.ok(latticeBinding.falsification_probe.includes('H = 0.0000'));

  const syntaxBinding = phasonicContract.causal_bindings.find(b => b.target_component === 'clause_syntax_selection');
  assert.ok(syntaxBinding);
  assert.equal(syntaxBinding.parameter, 'scalar_interference_H');
  assert.ok(syntaxBinding.transfer_law.includes('H >= 1.30'));
  assert.ok(syntaxBinding.falsification_probe.includes('Forcing H = 0.0000 resets syntax_state'));

  const caroContract = buildInstrumentCausalContract('CARO_INSTITUTIONAL_RECONSTRUCTION', 'SCHOLARLY');
  assert.equal(caroContract.causality_class, 'OPERATIVE_TRANSFER');
  assert.deepEqual(caroContract.target_domains, ['SPATIAL_TOPOLOGY', 'INTERACTION_FRICTION', 'DOCUMENT_CUSTODY']);
});

test('TD613 Dollhouse Design Conductor v0.2 - Full Cycle with v0.2 Governance & Interaction Topology', async () => {
  const seed = 'A theater in which punctuation marks are the stage machinery, and each scene quietly changes the grammar of the scene before it.';
  const receipt = await runDollhouseDesignCycle({
    seed,
    medium: 'HYBRID',
    instruments: ['PHASONIC_COUNTERPOINT', 'DIALECTICAL_TENSION'],
    human_coordinates: {
      what: 'Kinetic theatrical proscenium',
      who: 'Viewer and syntactic witness',
      where: 'Desktop & 390px mobile viewport',
      how: 'Punctuation machinery physically deforms active sentence geometry',
      when: 'Four progressive scenes followed by retrospective unwinding',
      why: 'To demonstrate that punctuation is mechanical work rather than passive ornament'
    }
  });

  // Schema & Version
  assert.equal(receipt.schema, 'td613.dollhouse-design.return-receipt/v0.2');
  assert.equal(receipt.version, 'v0.2-candidate');

  // Commission-derived proposals
  assert.equal(receipt.candidates.length, 2);
  assert.equal(receipt.candidates[0].proposal_origin, 'COMMISSION_DERIVED');
  assert.notEqual(receipt.candidates[0].concept_title, 'The Stratigraphic Separation');

  // Provenance contains Causal Contract
  assert.equal(receipt.instrument_provenance.length, 2);
  assert.ok(receipt.instrument_provenance[0].causal_contract);
  assert.equal(receipt.instrument_provenance[0].causal_contract.causality_class, 'OPERATIVE_TRANSFER');

  // Comparative analysis contains interaction topology and accessibility policy
  const topology = receipt.comparative_analysis.governing_interaction_topology;
  assert.ok(topology);
  assert.equal(topology.motion_policy, 'USER_CONTROLLED_STILL_STATE_UNDER_REDUCED_MOTION');
  assert.equal(topology.mobile_legibility_profile.minimum_telemetry_font_px, 12);
  assert.equal(topology.mobile_legibility_profile.minimum_hit_target_px, 44);

  // Deep Immutability
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.candidates));
  assert.ok(Object.isFrozen(receipt.comparative_analysis));
  assert.ok(Object.isFrozen(receipt.governance));
  assert.equal(receipt.governance.discourse_mode, 'OPEN_FIELD_CREATIVE_SYNTHESIS');
  assert.equal(receipt.governance.release_authority, false);
});
