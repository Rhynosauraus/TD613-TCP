/**
 * @fileoverview TD613 Dollhouse Design Conductor (DD-02).
 *
 * Implements the native creative authoring cycle:
 *   COMMISSION -> SELECT INSTRUMENTS -> GENERATE ALTERNATIVES -> COMPOSE -> MATERIALIZE -> REFRACT -> COMPARE -> RETURN
 *
 * Core Principles:
 *   - Selectable Instruments: Phasonic Counterpoint (D₃/φ), Caro Institutional Reconstruction,
 *     Butler Performative Iteration, Sedgwick Reparative Texture, Dialectical Tension.
 *     No single geometric aesthetic is compulsory.
 *   - Human Coordinate Coupling: Semantic relational frame (WHAT/WHO, WHERE/HOW, WHEN/WHY).
 *   - Instrument Provenance: Explicit trace linking generative operations to artifact features.
 *   - Refractive Counterfactual: Generates competing candidates by mutating a governing decision.
 *   - Scientific Firebreak: Purely generative under OPEN_FIELD_CREATIVE_SYNTHESIS.
 *     Advisory link to /dollhouse-audit available; creative synthesis NEVER grants scientific authority.
 *   - Human Closure Required: Always returns the primary artifact, refractive alternative, and open questions.
 */

import { createHash } from 'node:crypto';
import { runDollhouseSkillAudit } from './dollhouse-skill-dispatcher.js';

export const DOLLHOUSE_DESIGN_SCHEMA = 'td613.dollhouse-design.return-receipt/v0.1';
export const DOLLHOUSE_DESIGN_VERSION = 'v0.1-candidate';

export const AVAILABLE_INSTRUMENTS = Object.freeze({
  PHASONIC_COUNTERPOINT: {
    id: 'PHASONIC_COUNTERPOINT',
    label: 'D₃/φ Phasonic Counterpoint',
    lineage: 'Aperture v3.2-alpha Triple Overlay',
    operatesOn: 'transmedia invariance, periodic recurrence, quasiperiodic detour, and temporal lag',
    suitableFor: ['VISUAL', 'MOTION', 'HYBRID', 'THEORETICAL']
  },
  CARO_INSTITUTIONAL_RECONSTRUCTION: {
    id: 'CARO_INSTITUTIONAL_RECONSTRUCTION',
    label: 'Caro Institutional Reconstruction',
    lineage: 'Thinkers Bin (Robert Caro / Institutional Power)',
    operatesOn: 'physical corridors, procedural friction, bureaucratic accumulation, and omitted records',
    suitableFor: ['SCHOLARLY', 'VISUAL', 'PRODUCT', 'HYBRID']
  },
  BUTLER_PERFORMATIVE_ITERATION: {
    id: 'BUTLER_PERFORMATIVE_ITERATION',
    label: 'Butler Performative Iteration',
    lineage: 'Thinkers Bin (Judith Butler / Performative Subversion)',
    operatesOn: 'ritualized reiteration, normative slippage, and compulsory legibility',
    suitableFor: ['SCHOLARLY', 'THEORETICAL', 'VISUAL']
  },
  SEDGWICK_REPARATIVE_TEXTURE: {
    id: 'SEDGWICK_REPARATIVE_TEXTURE',
    label: 'Sedgwick Reparative Texture',
    lineage: 'Thinkers Bin (Eve Kosofsky Sedgwick / Reparative Reading)',
    operatesOn: 'textural granularity, affective survival, and resisting paranoid closure',
    suitableFor: ['SCHOLARLY', 'VISUAL', 'PRODUCT']
  },
  DIALECTICAL_TENSION: {
    id: 'DIALECTICAL_TENSION',
    label: 'Contrapuntal Dialectic',
    lineage: 'Classical Dialectics & Polyphony',
    operatesOn: 'irreducible antithesis, competing perspectives, and non-synthesizing juxtaposition',
    suitableFor: ['SCHOLARLY', 'THEORETICAL', 'MOTION']
  }
});

export const VALID_MEDIA = Object.freeze([
  'VISUAL',
  'MOTION',
  'SCHOLARLY',
  'THEORETICAL',
  'PRODUCT',
  'HYBRID'
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function sha256(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

/**
 * Normalizes and validates the incoming design commission.
 */
export function normalizeCommission(raw = {}) {
  const seed = String(raw.seed || '').trim();
  if (!seed) throw new TypeError('Commission requires an intellectual seed');

  const medium = String(raw.medium || 'SCHOLARLY').trim().toUpperCase();
  if (!VALID_MEDIA.includes(medium)) {
    throw new TypeError(`Invalid medium "${medium}". Allowed: ${VALID_MEDIA.join(', ')}`);
  }

  const rawHc = raw.human_coordinates || raw.humanCoordinates || {};
  const humanCoordinates = Object.freeze({
    what: String(rawHc.what || rawHc.WHAT || 'Declared artifact form').trim(),
    who: String(rawHc.who || rawHc.WHO || 'Intended human encounter & authority').trim(),
    where: String(rawHc.where || rawHc.WHERE || 'Material site & viewport').trim(),
    how: String(rawHc.how || rawHc.HOW || 'Operational & rhetorical mechanism').trim(),
    when: String(rawHc.when || rawHc.WHEN || 'Temporal cadence & transform sequence').trim(),
    why: String(rawHc.why || rawHc.WHY || 'Teleological & consequential purpose').trim()
  });

  let selectedInstruments = Array.isArray(raw.instruments)
    ? raw.instruments.map(i => String(i).trim().toUpperCase())
    : ['PHASONIC_COUNTERPOINT'];

  selectedInstruments = selectedInstruments.filter(id => AVAILABLE_INSTRUMENTS[id]);
  if (selectedInstruments.length === 0) {
    selectedInstruments = ['PHASONIC_COUNTERPOINT'];
  }

  return Object.freeze({
    commission_id: String(raw.commission_id || `COMM-${sha256(seed).slice(0, 8)}`),
    seed,
    medium,
    human_coordinates: humanCoordinates,
    instruments: Object.freeze(selectedInstruments),
    refractive_parameters: deepFreeze(raw.refractive_parameters || {}),
    scientific_audit_requested: raw.scientific_audit_requested === true
  });
}

/**
 * Executes the generative authoring cycle.
 */
export async function runDollhouseDesignCycle(commissionInput = {}) {
  const commission = normalizeCommission(commissionInput);

  // 1. SELECT INSTRUMENTS
  const instruments = commission.instruments.map(id => AVAILABLE_INSTRUMENTS[id]);

  // 2. GENERATE ALTERNATIVES (At least two structurally different concepts)
  const candidateA = {
    id: `${commission.commission_id}-CAND-A`,
    concept_title: 'The Stratigraphic Separation',
    governing_instrument: commission.instruments[0],
    formal_proposition: 'Separates the seed into two incommensurable formal strata whose tension generates the work.',
    structural_mechanisms: [
      'Layer 1 establishes structural baseline and recursive memory',
      'Layer 2 introduces aperiodic deviation and counterpressure',
      'Interference field marks loci of formal rupture and cadence shifts'
    ],
    medium_consequence: `In ${commission.medium}, the work refuses singular closure by presenting distinct rival paths.`
  };

  const candidateB = {
    id: `${commission.commission_id}-CAND-B`,
    concept_title: 'The Procedural Inversion',
    governing_instrument: commission.instruments[1] || commission.instruments[0],
    formal_proposition: 'Inverts the conventional order of arrival and passage, making the consequence visible before the mechanism.',
    structural_mechanisms: [
      'Temporal inversion: terminal consequence displayed at ingress',
      'Procedural friction: each interaction demands recognition of past expenditure',
      'Asymmetric recovery: passage can be retraced but cannot be simplified'
    ],
    medium_consequence: `In ${commission.medium}, the work subverts institutional arrival by foregrounding retained loss.`
  };

  // 3. COMPOSE & MATERIALIZE (Primary Choice)
  const primaryMaterialization = {
    selected_concept: candidateA.id,
    title: `Composition on: ${commission.seed}`,
    medium: commission.medium,
    instruments: commission.instruments,
    formal_architecture: {
      ingress: `Coupling WHAT (${commission.human_coordinates.what}) with WHO (${commission.human_coordinates.who})`,
      cadence: `Choreographing WHEN (${commission.human_coordinates.when}) against WHY (${commission.human_coordinates.why})`,
      execution: `Resolving WHERE (${commission.human_coordinates.where}) through HOW (${commission.human_coordinates.how})`
    },
    operative_verbs: [
      { verb: 'PROPAGATION', action: 'Derived dual formal candidates from the uncollapsed seed' },
      { verb: 'COMPRESSION', action: 'Retained path-sensitive distinctions without decorative surplus' },
      { verb: 'COUPLING', action: 'Bound human coordinates into mutually consequential pairs' },
      { verb: 'TRANSITION', action: 'Shifted projection into declared medium without losing invariants' },
      { verb: 'STABILIZATION', action: 'Anchored final form with inspectable boundaries and human closure' }
    ]
  };

  // 4. REFRACT (Controlled Counterfactual Variant)
  const defaultRefractiveProfiles = {
    PHASONIC_COUNTERPOINT: {
      mutated_parameter: 'temporal_revelation_order',
      mutation_description: 'Reverses the sequence: reveals path divergence first, and shared endpoint alibi second.',
      formal_consequence: 'Changes the work from an exposure of institutional erasure into a study of inevitable convergence.',
      material_difference: 'The viewer witnesses the divergence before discovering they were destined for the same door.',
      instruction_trace: 'Choreograph the trajectory so the observer witnesses divergence before discovering the shared endpoint.'
    },
    CARO_INSTITUTIONAL_RECONSTRUCTION: {
      mutated_parameter: 'administrative_friction_inversion',
      mutation_description: 'Inverts the vantage point from sovereign bureaucratic gatekeeper to the affected citizen traversing the corridor.',
      formal_consequence: 'Shifts from documenting administrative machinery to measuring the human exhaustion of delay.',
      material_difference: 'The composition is framed through the citizen waiting room rather than the executive drafting chamber.',
      instruction_trace: 'Reconstruct the physical and procedural friction from the standpoint of the delayed applicant.'
    },
    BUTLER_PERFORMATIVE_ITERATION: {
      mutated_parameter: 'citational_conformity',
      mutation_description: 'Shifts from compliant ritual repetition to subversive slippage across iterations.',
      formal_consequence: 'Discloses the fragility of sovereign norms through imperfect mimicry.',
      material_difference: 'Iterative copies introduce uncontrollable variance that destabilizes the original authority.',
      instruction_trace: 'Structure each repetition to amplify marginal variance against the declared norm.'
    },
    SEDGWICK_REPARATIVE_TEXTURE: {
      mutated_parameter: 'hermeneutic_posture',
      mutation_description: 'Shifts from paranoid exposure of sovereign harm to paratactic affective survival.',
      formal_consequence: 'Gathers discarded textures and communal practices beside the official ledger.',
      material_difference: 'Replaces forensic prosecution of the censor with an inhabitable shelter of shared memory.',
      instruction_trace: 'Assemble unofficial communal survival fragments in side-by-side parataxis with the sovereign decree.'
    },
    DIALECTICAL_TENSION: {
      mutated_parameter: 'polyphonic_hierarchy',
      mutation_description: 'Inverts the dominant and counter-melody lines without allowing synthesis.',
      formal_consequence: 'Forces the audience to sustain contradictory claims simultaneously.',
      material_difference: 'Elevates the suppressed counter-premise into structural dominance while preserving the interval.',
      instruction_trace: 'Counter-pose thesis and antithesis without resolving them into a harmonious third term.'
    }
  };

  const primaryInst = commission.instruments[0] || 'PHASONIC_COUNTERPOINT';
  const defaultProfile = defaultRefractiveProfiles[primaryInst] || defaultRefractiveProfiles.PHASONIC_COUNTERPOINT;

  const rawParams = commission.refractive_parameters || {};
  const mutatedParameter = String(rawParams.mutated_parameter || Object.keys(rawParams)[0] || defaultProfile.mutated_parameter);
  const mutationDescription = String(rawParams.mutation_description || rawParams[mutatedParameter] || defaultProfile.mutation_description);
  const formalConsequence = String(rawParams.formal_consequence || defaultProfile.formal_consequence);
  const materialDifference = String(rawParams.material_difference || defaultProfile.material_difference);
  const instructionTrace = String(rawParams.instruction_trace || defaultProfile.instruction_trace);

  const refractiveVariant = {
    id: `${commission.commission_id}-REFRACT-01`,
    governing_instrument: commission.instruments[1] || commission.instruments[0],
    mutated_parameter: mutatedParameter,
    mutation_description: mutationDescription,
    formal_consequence: formalConsequence,
    material_difference: materialDifference,
    instruction_trace: instructionTrace
  };

  // 5. COMPARE (What survived, what changed, open decisions)
  const comparativeAnalysis = {
    shared_invariants: [
      `The core intellectual seed ("${commission.seed}") is held invariant across both realizations`,
      `Both variants inhabit the declared medium: ${commission.medium}`,
      'No scalar utility score or automatic aesthetic crown is applied'
    ],
    divergent_qualities: [
      `Candidate A operates under primary instrument ${primaryInst}: ${candidateA.formal_proposition}`,
      `Refractive Variant mutates [${mutatedParameter}]: ${formalConsequence}`
    ],
    open_aesthetic_questions: [
      `Does the materialization of [${mutatedParameter}] successfully alter the observer's understanding of the seed?`,
      'Should the refractive variant be preserved as an independent counterpart or kept as development scaffolding?'
    ]
  };

  // 6. INSTRUMENT PROVENANCE LEDGER
  const instrumentProvenance = commission.instruments.map(instId => {
    const inst = AVAILABLE_INSTRUMENTS[instId];
    let contrib = 'Supplied formal generative grammar';
    if (inst.id === 'PHASONIC_COUNTERPOINT') {
      contrib = 'Supplied D₃ periodic scaffold, φ quasiperiodic detour equations, and interference field';
    } else if (inst.id === 'CARO_INSTITUTIONAL_RECONSTRUCTION') {
      contrib = 'Supplied procedural friction, statutory cross-referencing, and corridor resistance';
    } else if (inst.id === 'BUTLER_PERFORMATIVE_ITERATION') {
      contrib = 'Supplied ritualized citational reiteration and subversive slippage across repetitions';
    } else if (inst.id === 'SEDGWICK_REPARATIVE_TEXTURE') {
      contrib = 'Supplied paratactic beside-ness, textural granularity, and affective survival';
    } else if (inst.id === 'DIALECTICAL_TENSION') {
      contrib = 'Supplied polyphonic contrapuntal resistance and non-synthesizing tension';
    }
    return {
      instrument_id: inst.id,
      lineage: inst.lineage,
      material_contribution: contrib
    };
  });

  // 7. SCIENTIFIC COMPANION AUDIT (Optional & Advisory)
  let scientificAuditReceipt = null;
  if (commission.scientific_audit_requested) {
    try {
      const auditResult = await runDollhouseSkillAudit({
        source_revision: 'main',
        task_scope: `DOLLHOUSE_DESIGN_ADVISORY_${commission.commission_id}`,
        roles: ['PEDAGOGUE', 'APERTURE'],
        include_orchestrator: true,
        evidence_class: 'SYNTHETIC_TEST_FIXTURE',
        evidence_references: ['app/engine/dollhouse-design-conductor.js']
      });
      scientificAuditReceipt = {
        disposition: auditResult.orchestrator_disposition,
        exit_code: auditResult.exit_code,
        summary: 'Scientific companion completed bounded advisory audit of design components.'
      };
    } catch (err) {
      scientificAuditReceipt = {
        disposition: 'AUDIT_UNAVAILABLE',
        error: String(err && err.message || err)
      };
    }
  }

  // 8. COMPILE FINAL RETURN RECEIPT
  const returnReceipt = {
    schema: DOLLHOUSE_DESIGN_SCHEMA,
    version: DOLLHOUSE_DESIGN_VERSION,
    commission_id: commission.commission_id,
    seed: commission.seed,
    medium: commission.medium,
    human_coordinates: commission.human_coordinates,
    selected_instruments: commission.instruments,
    candidates: [candidateA, candidateB],
    primary_materialization: primaryMaterialization,
    refractive_variant: refractiveVariant,
    comparative_analysis: comparativeAnalysis,
    instrument_provenance: instrumentProvenance,
    scientific_companion_audit: scientificAuditReceipt,
    governance: {
      discourse_mode: 'OPEN_FIELD_CREATIVE_SYNTHESIS',
      scientific_proof: false,
      palate_status: 'UNBORN',
      release_authority: false,
      deployment_authority: false,
      human_closure_required: true,
      governing_law: 'Make the unresolved relation productive. Let distinct forms meet without forcing them to merge. Allow the work to discover its medium through consequence.'
    }
  };

  return deepFreeze(returnReceipt);
}
