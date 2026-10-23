/**
 * @fileoverview TD613 Dollhouse Native Antigravity Skill Dispatcher.
 *
 * Implements the six-role execution contract:
 *   - 5 Specialists: Pedagogue, Aperture, Atlas, FADT, Temporal Custodian
 *   - 1 Orchestrator: Multi-role scientific governance & evidence adjudication
 *
 * Scientific & Governance Invariants:
 *   - Genuine engine execution: calls actual restored domain modules;
 *   - Non-substitution: LLM reasoning/prose never replaces engine verification;
 *   - Shared acquisition on a single receipt adds ZERO empirical replication:
 *     SHARED_ACQUISITION != INDEPENDENT_REPLICATION;
 *   - Missing observations are never filled by inference; they remain NOT_EVALUATED/HELD;
 *   - Orchestrator preserves dissent and holds fail-closed;
 *   - Release and deployment authority remain strictly false; human closure is always required.
 */

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import {
  FIVE_ROLES,
  ROLE_INFRACTIONS,
  FAILURE_MODES,
  executeSpecialistRole,
  runOrchestrationDecision,
  normalizeRoleObservations
} from './dollhouse-ablation-harness.js';
import {
  auditDollhouseDromologicalCadence,
  auditDollhouseInstitutionalTime,
  auditDollhouseLineageSecondPass,
  runPedagogueAgent
} from './dollhouse-pedagogue-dromological.js';
import {
  auditTypedEpistemicDeficit,
  computeMatrixSvd,
  evaluateCandidateProbeStability
} from './aperture-v32-typed-epistemic-deficit.js';
import {
  classifyAtlasRelationIdentity,
  auditAtlasHolonomyHistoryParity,
  auditPhasonCustodyDiff
} from './dollhouse-atlas-relational-custody.js';
import {
  computeFadtFiberBounds,
  evaluateFadtCoordinateRecovery,
  evaluateFadtDiscrepancyIdentity,
  compileFadtReparativePacket
} from './dollhouse-fadt-reparative-assistance.js';
import {
  runTemporalCustodianAudit,
  auditServiceJourneyChronology
} from './dollhouse-temporal-custodian.js';
import {
  createDollhouseCaseDossier,
  DOLLHOUSE_CASE_DOSSIER_SCHEMA
} from './dollhouse-case-dossier.js';
import { DOLLHOUSE_AGENT_REGISTRY } from './dollhouse-agent-registry.js';

export const DOLLHOUSE_SKILL_AUDIT_SCHEMA = 'td613.dollhouse.skill-audit/v1.0';
export const DOLLHOUSE_SKILL_RECEIPT_SCHEMA = 'td613.dollhouse.skill-audit-receipt/v1.0';

export const CANONICAL_SPECIALIST_ROLES = FIVE_ROLES;
export const ORCHESTRATOR_ROLE = 'ORCHESTRATOR';
export const ALL_CANONICAL_ROLES = Object.freeze([...FIVE_ROLES, ORCHESTRATOR_ROLE]);

/**
 * Resolves current git head SHA if available, otherwise returns fallback.
 */
function resolveCurrentSourceRevision() {
  const child_process = globalThis.process?.getBuiltinModule?.('node:child_process');
  if (child_process?.execSync) {
    try {
      return child_process.execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return 'WORKING_TREE_UNCOMMITTED';
    }
  }
  return 'WORKING_TREE_UNCOMMITTED';
}

/**
 * Normalizes input role list, identifying active specialists and orchestrator flag.
 */
function normalizeRequestedRoles(requestedRoles) {
  if (!requestedRoles || !Array.isArray(requestedRoles) || requestedRoles.length === 0) {
    return {
      specialist_roles: [...CANONICAL_SPECIALIST_ROLES],
      include_orchestrator: true,
      unknown_roles: []
    };
  }

  const upper = requestedRoles.map(r => String(r).trim().toUpperCase());
  const unknown_roles = upper.filter(r => !ALL_CANONICAL_ROLES.includes(r));
  const specialist_roles = upper.filter(r => CANONICAL_SPECIALIST_ROLES.includes(r));
  const include_orchestrator = upper.includes(ORCHESTRATOR_ROLE);

  return {
    specialist_roles,
    include_orchestrator,
    unknown_roles
  };
}

/**
 * Executes specialized domain audit extensions if richer inputs are provided.
 */
function executeSpecialistExtensions(role, domainInput, options) {
  if (!domainInput || typeof domainInput !== 'object') {
    return null;
  }

  try {
    switch (role) {
      case 'PEDAGOGUE': {
        const ext = {};
        if (domainInput.events && Array.isArray(domainInput.events)) {
          ext.cadence_audit = auditDollhouseDromologicalCadence(domainInput);
        }
        if (domainInput.clocks || domainInput.closure || (domainInput.t_op !== undefined && domainInput.t_inst !== undefined)) {
          ext.institutional_time_audit = auditDollhouseInstitutionalTime(domainInput);
        }
        if (domainInput.declared_deficits && domainInput.lenses) {
          ext.lineage_second_pass = auditDollhouseLineageSecondPass(domainInput);
        }
        return Object.keys(ext).length > 0 ? ext : null;
      }
      case 'APERTURE': {
        const ext = {};
        if (domainInput.current_operator || domainInput.candidate_probe) {
          ext.epistemic_deficit = auditTypedEpistemicDeficit(domainInput);
        }
        if (domainInput.matrix && Array.isArray(domainInput.matrix)) {
          ext.matrix_svd = computeMatrixSvd(domainInput.matrix);
        }
        return Object.keys(ext).length > 0 ? ext : null;
      }
      case 'ATLAS': {
        const ext = {};
        if (domainInput.trajectoryA && domainInput.trajectoryB) {
          ext.holonomy_parity = auditAtlasHolonomyHistoryParity(domainInput.trajectoryA, domainInput.trajectoryB);
        }
        if (domainInput.relation_entry) {
          ext.relation_identity = classifyAtlasRelationIdentity(domainInput.relation_entry);
        }
        if (domainInput.payload && domainInput.digest) {
          ext.phason_custody_diff = auditPhasonCustodyDiff(domainInput.payload, domainInput.digest, domainInput.options || {});
        }
        return Object.keys(ext).length > 0 ? ext : null;
      }
      case 'FADT': {
        const ext = {};
        if (domainInput.fiberRows && Array.isArray(domainInput.fiberRows)) {
          ext.fiber_bounds = computeFadtFiberBounds(domainInput.fiberRows);
        }
        if (domainInput.active_coordinates && domainInput.held_discrepancies) {
          ext.coordinate_recovery = evaluateFadtCoordinateRecovery(domainInput);
        }
        if (domainInput.reparative_spec) {
          ext.reparative_packet = compileFadtReparativePacket(domainInput.reparative_spec);
        }
        return Object.keys(ext).length > 0 ? ext : null;
      }
      case 'TEMPORAL_CUSTODIAN': {
        const ext = {};
        if (domainInput.phases && domainInput.required_phases) {
          ext.journey_chronology = auditServiceJourneyChronology(domainInput.phases, domainInput.required_phases);
        }
        if (domainInput.attempt_history || domainInput.audit_record) {
          ext.temporal_audit = runTemporalCustodianAudit(domainInput);
        }
        return Object.keys(ext).length > 0 ? ext : null;
      }
      default:
        return null;
    }
  } catch (err) {
    return {
      extension_error: err?.message || String(err)
    };
  }
}

/**
 * Compiles a human-readable research markdown receipt.
 */
function compileHumanReceipt(machineReceipt) {
  const {
    invocation_id,
    timestamp,
    source_revision,
    task_scope,
    evidence_class,
    roles_requested,
    roles_executed,
    missing_inputs,
    specialist_findings,
    detected_infractions,
    orchestrator,
    replication_status,
    empirical_replication_count,
    unresolved_questions,
    next_permissible_action,
    execution_duration_ms
  } = machineReceipt;

  const decisionBadge = orchestrator?.decision === 'SUPPORTED' ? '🟢 SUPPORTED' : '🔴 HELD';
  const consensusText = orchestrator?.consensus || 'NONE';

  const rows = specialist_findings.map(f => {
    const verdictBadge = f.verdict === 'SUPPORTED' ? '✓ SUPPORTED' : (f.verdict === 'HELD' ? '✖ HELD' : '○ NOT_EVALUATED');
    return `| \`${f.role}\` | ${f.jurisdiction} | **${verdictBadge}** | \`${f.status}\` | ${f.claim} |`;
  }).join('\n');

  const infractionsList = detected_infractions.length > 0
    ? detected_infractions.map(i => `- \`${i}\``).join('\n')
    : '_None detected._';

  const missingList = missing_inputs.length > 0
    ? missing_inputs.map(m => `- \`${m}\`: input unsupplied or null`).join('\n')
    : '_All requested specialist inputs were supplied._';

  const questionsList = unresolved_questions.length > 0
    ? unresolved_questions.map(q => `- ${q}`).join('\n')
    : '_None._';

  return `# 𝌋 TD613 Dollhouse Scientific Audit Receipt

**Invocation ID:** \`${invocation_id}\`  
**Schema:** \`${DOLLHOUSE_SKILL_RECEIPT_SCHEMA}\`  
**Timestamp:** ${timestamp}  
**Target Revision:** \`${source_revision}\`  
**Task Scope:** \`${task_scope}\`  
**Evidence Class:** \`${evidence_class}\`  
**Replication Status:** \`${replication_status}\` (Empirical Credit: ${empirical_replication_count})  
**Execution Duration:** ${execution_duration_ms}ms  

---

## 1. Executive Disposition & Summary

| Instrument Property | Status / Value |
|---|---|
| **Orchestrator Decision** | **${decisionBadge}** (\`${orchestrator?.decision || 'NOT_RUN'}\`) |
| **Consensus** | \`${consensusText}\` |
| **Detected Infractions** | ${detected_infractions.length} |
| **Release Authority** | **STRICTLY CLOSED (false)** |
| **Deployment Authority** | **STRICTLY CLOSED (false)** |
| **Human Closure Required** | **YES (true)** |

---

## 2. Examination Scope & Inputs

- **Roles Requested:** ${roles_requested.map(r => `\`${r}\``).join(', ')}
- **Roles Executed:** ${roles_executed.map(r => `\`${r}\``).join(', ')}
- **Missing / Withheld Inputs:**
${missingList}

---

## 3. Specialist Findings

| Specialist Role | Jurisdiction | Verdict | Status | Finding / Claim |
|---|---|---|---|---|
${rows}

---

## 4. Orchestrator Governance & Detected Infractions

### Detected Infractions:
${infractionsList}

### Governance Invariants:
1. **Replication Discipline:** Shared acquisition on a single receipt adds **zero** independent empirical replication (\`SHARED_ACQUISITION != INDEPENDENT_REPLICATION\`).
2. **Veto Preservation:** Specialist infractions and holds survive agreeable narratives; a single domain hold prevents unsupported promotion.
3. **Missingness Invariant:** Missing specialist senses remain visibly unexamined; the Orchestrator holds on incomplete observations.
4. **Authority Boundary:** The Orchestrator produces recommendation and verification records only; it never grants release, merge, or deployment authority.

---

## 5. Unresolved Questions & Holds

${questionsList}

---

## 6. What Would Resolve the Hold

${orchestrator?.decision === 'SUPPORTED'
  ? '_All active specialist invariants verified. No open holds._'
  : (detected_infractions.map(i => {
      if (i.includes('PEDAGOGUE')) return '- **Pedagogue Hold:** Restore canonical order NOTICE < ACT < WORLD_ANSWERS < NAME and ensure returned-work navigation routes do not trap the operator.';
      if (i.includes('APERTURE')) return '- **Aperture Hold:** Ensure operator matrix is numerically well-conditioned and noise covariance is symmetric positive-definite. Do not treat URL hash as DOM admission.';
      if (i.includes('ATLAS')) return '- **Atlas Hold:** Verify predecessor receipt continuity across window boundaries and ensure serialization profiles (dome-v0 vs atlas-v1) match.';
      if (i.includes('FADT')) return '- **FADT Hold:** Bound coordinate recovery search under 10,000 budget and reject action widening when conditioning state is erased.';
      if (i.includes('TEMPORAL')) return '- **Temporal Custodian Hold:** Provide monotonic chronological sequence with predecessor citations and complete planned phases.';
      if (i.includes('MALFORMED')) return '- **Schema Hold:** Supply schema-valid domain observations; untyped caller concern strings reject fail-closed.';
      if (i.includes('MISSING')) return '- **Missingness Hold:** Supply valid domain observations for all active specialist roles.';
      return `- **General Hold (${i}):** Address domain-specific defect before re-running audit.`;
    }).join('\n') || '- Address missing observations or specialist infractions before re-running audit.')}

---

## 7. Permitted Next Operator Action

${next_permissible_action}

Sealed ⟐
`;
}

/**
 * Main programmatic dispatcher for the TD613 Dollhouse Native Antigravity Skill.
 *
 * @param {Object} input - Invocation contract payload
 * @returns {Promise<{ machine_receipt: Object, human_receipt: string, exit_code: number }>}
 */
export async function runDollhouseSkillAudit(input = {}) {
  const startTime = Date.now();

  const source_revision = typeof input.source_revision === 'string' && input.source_revision.trim()
    ? input.source_revision.trim()
    : resolveCurrentSourceRevision();

  const task_scope = typeof input.task_scope === 'string' && input.task_scope.trim()
    ? input.task_scope.trim()
    : 'GENERAL_SCIENTIFIC_AUDIT';

  const evidence_class = typeof input.evidence_class === 'string' && input.evidence_class.trim()
    ? input.evidence_class.trim()
    : 'SYNTHETIC_TEST_FIXTURE';

  const evidence_references = Array.isArray(input.evidence_references)
    ? input.evidence_references.map(String)
    : [];

  const rawRoles = input.roles !== undefined
    ? input.roles
    : [...CANONICAL_SPECIALIST_ROLES, ORCHESTRATOR_ROLE];

  const {
    specialist_roles,
    include_orchestrator,
    unknown_roles
  } = normalizeRequestedRoles(rawRoles);

  const shouldOrchestrate = input.include_orchestrator !== undefined
    ? Boolean(input.include_orchestrator)
    : include_orchestrator;

  const domain_inputs = (input.domain_inputs && typeof input.domain_inputs === 'object')
    ? input.domain_inputs
    : {};

  const options = (input.options && typeof input.options === 'object')
    ? { ...input.options }
    : {};

  if (input.allow_synthetic_fault_injection !== undefined) {
    options.allow_synthetic_fault_injection = Boolean(input.allow_synthetic_fault_injection);
  }
  options.expected_source_revision = source_revision;

  // 1. Fail-closed check for unknown / uninstalled roles
  if (unknown_roles.length > 0) {
    const duration = Date.now() - startTime;
    const invocation_id = `dollhouse-audit-${Date.now()}-${createHash('sha256').update(source_revision + task_scope).digest('hex').slice(0, 8)}`;
    const machine_receipt = {
      schema: DOLLHOUSE_SKILL_RECEIPT_SCHEMA,
      invocation_id,
      timestamp: new Date().toISOString(),
      source_revision,
      task_scope,
      evidence_class,
      evidence_references,
      roles_requested: rawRoles,
      roles_executed: [],
      missing_inputs: [],
      specialist_findings: unknown_roles.map(r => ({
        role: r,
        jurisdiction: 'unknown',
        claim: `Unrecognized specialist role rejected fail-closed: ${r}`,
        verdict: 'HELD',
        status: 'UNKNOWN_ROLE_REJECTED'
      })),
      detected_infractions: ['UNKNOWN_ROLE_REJECTED'],
      orchestrator: {
        active_roles: unknown_roles,
        findings_count: unknown_roles.length,
        findings: [],
        detected_infractions: ['UNKNOWN_ROLE_REJECTED'],
        decision: 'HELD_UNKNOWN_ROLE',
        consensus: 'HELD_UNKNOWN_ROLE',
        replication_status: 'UNRECOGNIZED_ROLE_REJECTED',
        empirical_replication_count: 0,
        independent_replication: false,
        release_authority: false,
        deployment_authority: false,
        human_closure_required: true
      },
      replication_status: 'UNRECOGNIZED_ROLE_REJECTED',
      empirical_replication_count: 0,
      unresolved_questions: [`Unrecognized role requested: ${unknown_roles.join(', ')}. Supported roles are: ${ALL_CANONICAL_ROLES.join(', ')}`],
      next_permissible_action: 'Correct the requested role list to canonical Dollhouse specialist roles and re-run audit.',
      execution_duration_ms: duration
    };
    const human_receipt = compileHumanReceipt(machine_receipt);

    if (input.artifact_path && typeof input.artifact_path === 'string') {
      await writeReceiptArtifact(input.artifact_path, machine_receipt, human_receipt);
    }

    return { machine_receipt, human_receipt, exit_code: 1 };
  }

  // 2. Execute each requested specialist role
  const specialist_findings = [];
  const detected_infractions_set = new Set();
  const missing_inputs = [];
  const roles_executed = [];

  for (const role of specialist_roles) {
    roles_executed.push(role);
    const roleInput = domain_inputs[role] ?? domain_inputs[role.toLowerCase()] ?? null;

    if (roleInput === null || roleInput === undefined) {
      missing_inputs.push(role);
      specialist_findings.push({
        role,
        jurisdiction: DOLLHOUSE_AGENT_REGISTRY.agents[role]?.role || 'unspecified',
        verdict: 'NOT_EVALUATED',
        status: 'INPUT_MISSING',
        claim: `No observation input supplied for ${role}`,
        infractions: [],
        extensions: null
      });
      continue;
    }

    // Call canonical harness specialist executor
    const evalResult = executeSpecialistRole(role, roleInput, options);
    const extensions = executeSpecialistExtensions(role, roleInput, options);

    specialist_findings.push({
      role,
      jurisdiction: evalResult.jurisdiction || DOLLHOUSE_AGENT_REGISTRY.agents[role]?.role || 'unspecified',
      verdict: evalResult.verdict,
      status: evalResult.status,
      claim: evalResult.concern || `Invariants verified by ${role}`,
      infractions: evalResult.infractions || [],
      is_synthetic_injection: evalResult.is_synthetic_injection || false,
      extensions
    });

    if (Array.isArray(evalResult.infractions)) {
      evalResult.infractions.forEach(i => detected_infractions_set.add(i));
    }
  }

  // 3. Orchestrator Governance & Adjudication
  let orchestrator = null;
  if (shouldOrchestrate) {
    // Pass active specialist roles and domain_inputs to canonical Orchestrator
    const orchResult = runOrchestrationDecision(specialist_roles, domain_inputs, {
      ...options,
      orchestrator_governance: true,
      condition_name: specialist_roles.length === 0 ? 'ORCHESTRATOR_ALONE' : 'SKILL_INVOCATION'
    });

    orchestrator = {
      decision: orchResult.decision,
      consensus: orchResult.consensus,
      replication_status: orchResult.replication_status,
      empirical_replication_count: orchResult.empirical_replication_count,
      active_roles: orchResult.active_roles,
      findings_count: orchResult.findings_count,
      detected_infractions: orchResult.detected_infractions,
      release_authority: false,
      deployment_authority: false,
      human_closure_required: true
    };

    if (Array.isArray(orchResult.detected_infractions)) {
      orchResult.detected_infractions.forEach(i => detected_infractions_set.add(i));
    }
  }

  // 4. Dossier Creation (Optional, if case metadata is supplied)
  let case_dossier = null;
  if (input.create_case_dossier === true && input.dossier_spec) {
    try {
      case_dossier = createDollhouseCaseDossier(input.dossier_spec, {
        allow_unpinned_source: options.allow_unpinned_source === true
      });
    } catch (err) {
      case_dossier = { error: err?.message || String(err) };
    }
  }

  // 5. Determine Overall Disposition & Permitted Next Actions
  const detected_infractions = [...detected_infractions_set];
  const overallDecision = orchestrator ? orchestrator.decision : (specialist_findings.some(f => f.verdict === 'HELD') ? 'HELD' : 'SUPPORTED');
  const duration = Date.now() - startTime;
  const invocation_id = `dollhouse-audit-${Date.now()}-${createHash('sha256').update(source_revision + task_scope).digest('hex').slice(0, 8)}`;

  const unresolved_questions = [];
  if (missing_inputs.length > 0) {
    unresolved_questions.push(`Missing domain observation inputs for: ${missing_inputs.join(', ')}.`);
  }
  if (detected_infractions.length > 0) {
    unresolved_questions.push(`Infractions detected: ${detected_infractions.join(', ')}.`);
  }

  let next_permissible_action = 'Human operator review required. ';
  if (overallDecision === 'SUPPORTED') {
    next_permissible_action += 'All active specialist domain invariants verified. Operator may proceed with next bounded development or review step.';
  } else {
    next_permissible_action += 'Auditing held fail-closed. Operator must resolve domain infractions or missing observations before proceeding.';
  }

  const machine_receipt = {
    schema: DOLLHOUSE_SKILL_RECEIPT_SCHEMA,
    invocation_id,
    timestamp: new Date().toISOString(),
    source_revision,
    task_scope,
    evidence_class,
    evidence_references,
    roles_requested: rawRoles,
    roles_executed,
    missing_inputs,
    specialist_findings,
    detected_infractions,
    orchestrator,
    case_dossier,
    replication_status: orchestrator ? orchestrator.replication_status : 'STANDALONE_SPECIALIST_EXECUTION',
    empirical_replication_count: orchestrator ? orchestrator.empirical_replication_count : 0,
    synthetic_vs_empirical: evidence_class === 'EMPIRICAL_ACQUISITION' ? 'EMPIRICAL_UNAUTHENTICATED_IN_OFFLINE_ESTATE' : 'SYNTHETIC',
    unresolved_questions,
    next_permissible_action,
    execution_duration_ms: duration
  };

  const human_receipt = compileHumanReceipt(machine_receipt);

  if (input.artifact_path && typeof input.artifact_path === 'string') {
    await writeReceiptArtifact(input.artifact_path, machine_receipt, human_receipt);
  }

  const exit_code = overallDecision === 'SUPPORTED' ? 0 : 1;
  return { machine_receipt, human_receipt, exit_code };
}

/**
 * Writes receipt to disk at the specified path.
 */
async function writeReceiptArtifact(targetPath, machineReceipt, humanReceipt) {
  try {
    if (targetPath.endsWith('.json')) {
      await writeFile(targetPath, JSON.stringify(machineReceipt, null, 2), 'utf8');
    } else if (targetPath.endsWith('.md')) {
      await writeFile(targetPath, humanReceipt, 'utf8');
    } else {
      await writeFile(`${targetPath}.json`, JSON.stringify(machineReceipt, null, 2), 'utf8');
      await writeFile(`${targetPath}.md`, humanReceipt, 'utf8');
    }
  } catch (err) {
    console.error(`Failed to write artifact at ${targetPath}:`, err);
  }
}
