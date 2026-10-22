const freeze = value => Object.freeze(value);

export const DOLLHOUSE_AGENT_REGISTRY_SCHEMA = 'td613.dollhouse.agent-registry/v0.1';

export const DOLLHOUSE_AGENT_REGISTRY = freeze({
  schema: DOLLHOUSE_AGENT_REGISTRY_SCHEMA,
  agents: freeze({
    PEDAGOGUE: freeze({
      id: 'PEDAGOGUE',
      canonical_name: 'Flow-Core Pedagogue',
      kind: 'OPERATIONAL_AGENT',
      status: 'INSTALLED',
      role: 'consequence-order-route-burden-practice-and-research-transfer',
      invocation: 'PEDAGOGUE.md / app/engine/dollhouse-pedagogue-dromological.js::runPedagogueAgent',
      canonical_sources: freeze([
        'PEDAGOGUE.md',
        'app/engine/pedagogue-design-gate.js',
        'app/engine/pedagogue-institutional-time.js',
        'app/engine/pedagogue-lineage-second-pass.js'
      ]),
      audit_extensions: freeze([
        'app/engine/dollhouse-pedagogue-dromological.js::runPedagogueAgent',
        'app/engine/dollhouse-pedagogue-dromological.js::auditDollhouseDromologicalCadence',
        'app/engine/dollhouse-pedagogue-dromological.js::auditDollhouseInstitutionalTime',
        'app/engine/dollhouse-pedagogue-dromological.js::auditDollhouseLineageSecondPass',
        'app/engine/pedagogue-gesture-consequence.js::compilePedagogueGestureConsequenceAudit',
        'app/engine/pedagogue-institutional-time.js::compileInstitutionalTimeAudit',
        'app/engine/pedagogue-institutional-time.js::compileDromologicalSequenceAudit',
        'app/engine/pedagogue-lineage-second-pass.js::compilePedagogueLineageSecondPass'
      ]),
      authority_ceiling: 'recommendation-and-verification-only-human-closure-required'
    }),
    APERTURE: freeze({
      id: 'APERTURE',
      canonical_name: 'TD613 Aperture',
      kind: 'OPERATIONAL_AGENT',
      status: 'INSTALLED',
      role: 'observability-identifiability-reconstruction-conditioning-and-replay-audit',
      invocation: 'APERTURE.md / installed Aperture lane',
      canonical_sources: freeze(['APERTURE.md', 'app/aperture/release.json']),
      audit_extensions: freeze([
        'app/engine/dollhouse-witness-plan.js::auditDollhouseWitnessPlan',
        'app/engine/aperture-v32-typed-epistemic-deficit.js::auditTypedEpistemicDeficit'
      ]),
      authority_ceiling: 'experimental-research-instrument-no-external-reality-or-release-authority'
    }),
    ATLAS: freeze({
      id: 'ATLAS',
      canonical_name: 'Atlas receiver-relation auditor',
      kind: 'OPERATIONAL_AGENT_ADAPTER',
      status: 'BOUNDED_RESEARCH_CANDIDATE',
      role: 'compare-non-equivalent-receiver-projections-against-one-admitted-relation-and-governance-control-plane',
      invocation: 'ATLAS.md / app/engine/dollhouse-atlas-fadt.js::runAtlasAgent',
      canonical_sources: freeze([
        'ATLAS.md',
        'app/dome-world/holonomy-loom/semantic-field.js',
        'app/dome-world/holonomy-loom/flowcore-aia-motion.js'
      ]),
      research_lineage_note: 'Atlas research receipts remain separately bound; this adapter does not merge or promote that unmerged estate.',
      audit_extensions: freeze([
        'app/engine/dollhouse-continuity-audit.js::runAtlasContinuityAudit',
        'app/engine/dollhouse-atlas-relational-custody.js::classifyAtlasRelationIdentity',
        'app/engine/dollhouse-atlas-relational-custody.js::auditAtlasHolonomyHistoryParity',
        'app/engine/dollhouse-atlas-relational-custody.js::auditPhasonCustodyDiff'
      ]),
      authority_ceiling: 'receiver-relation-audit-only-no-basis-free-geometry-no-release-no-lineage-promotion'
    }),
    FADT: freeze({
      id: 'FADT',
      canonical_name: 'Finite Admissibility Descent agent',
      kind: 'OPERATIONAL_AGENT_ADAPTER',
      status: 'BOUNDED_RESEARCH_CANDIDATE',
      role: 'audit-finite-quotient-fibres-for-exact-admissibility-descent-and-preserve-union-intersection-gap',
      invocation: 'FADT.md / app/engine/dollhouse-atlas-fadt.js::runFadtAgent',
      canonical_sources: freeze(['FADT.md', 'PR #752 · Finite Admissibility Descent Theorem']),
      theorem_lineage_note: 'PR #752 remains theorem ancestry; this adapter operationalizes the finite law without granting merge, deployment, or universal-theorem authority.',
      audit_extensions: freeze([
        'app/engine/dollhouse-continuity-audit.js::runFadtStageAudit',
        'app/engine/dollhouse-fadt-reparative-assistance.js::evaluateFadtCoordinateRecovery',
        'app/engine/dollhouse-fadt-reparative-assistance.js::evaluateFadtDiscrepancyIdentity',
        'app/engine/dollhouse-fadt-reparative-assistance.js::compileFadtReparativePacket'
      ]),
      authority_ceiling: 'finite-support-descent-audit-only-no-universal-ai-law-no-release-no-source-state-reconstruction'
    }),
    TEMPORAL_CUSTODIAN: freeze({
      id: 'TEMPORAL_CUSTODIAN',
      canonical_name: 'TD613 Temporal Custodian',
      kind: 'OPERATIONAL_AGENT_ADAPTER',
      status: 'BOUNDED_RESEARCH_CANDIDATE',
      role: 'independent-temporal-audit-monotonic-chronology-and-attempt-lineage-preservation',
      invocation: 'app/engine/dollhouse-temporal-custodian.js::runTemporalCustodianAudit',
      canonical_sources: freeze([
        'app/engine/dollhouse-temporal-custodian.js',
        'LOOM_TWIN_DOME_WORLD_LINEAGE_FIDELITY.md'
      ]),
      audit_extensions: freeze(['app/engine/dollhouse-temporal-custodian.js::runTemporalCustodianAudit']),
      authority_ceiling: 'chronological-and-phase-verification-only-no-clock-synthesis-no-release'
    })
  }),
  shared_authority: freeze({
    automatic_release: false,
    automatic_redesign: false,
    merge_authority: false,
    deployment_authority: false,
    vercel_authority: false,
    provider_authority: false,
    human_closure_required: true
  })
});

export function getDollhouseAgent(id) {
  return DOLLHOUSE_AGENT_REGISTRY.agents[String(id || '').toUpperCase()] || null;
}

export function listDollhouseAgents() {
  return Object.values(DOLLHOUSE_AGENT_REGISTRY.agents);
}
