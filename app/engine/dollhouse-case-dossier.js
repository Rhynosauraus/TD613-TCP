import { getDollhouseAgent, listDollhouseAgents } from './dollhouse-agent-registry.js';

export const DOLLHOUSE_CASE_DOSSIER_SCHEMA = 'td613.dollhouse.case-dossier/v0.1';
const CLASSES = ['DECLARATION', 'OFFLINE_TEST', 'BROWSER_WITNESS', 'PROVIDER_RESPONSE', 'EMPIRICAL_ACQUISITION'];
const VERDICTS = ['SUPPORTED', 'HELD', 'CONTRADICTED', 'UNKNOWN'];
function exact(value, keys, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label}: exact fields required`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some(key => !descriptors[key].enumerable || !Object.hasOwn(descriptors[key], 'value'))) throw new TypeError(`${label}: accessors and hidden data forbidden`);
}
function text(value, limit, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new TypeError(`${label}: bounded nonempty text required`);
  return value;
}
function dense(value, min, max, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < min || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError(`${label}: dense bounded array required`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index++) if (!descriptors[index]?.enumerable || !Object.hasOwn(descriptors[index], 'value')) throw new TypeError(`${label}: sparse entries and accessors forbidden`);
  return value;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/**
 * A bounded clerk for independently scoped findings, not a voting or admission
 * engine. Supplied evidence labels/digests remain declared references. This
 * function neither reads their artifacts nor authenticates their authors.
 */
export function createDollhouseCaseDossier(input) {
  const baseKeys = ['schema', 'case_id', 'source_revision', 'findings'];
  const inputKeys = Reflect.ownKeys(input);
  if (!input || Object.getPrototypeOf(input) !== Object.prototype) throw new TypeError('case: exact fields required');
  if (inputKeys.length === 4) {
    if (baseKeys.some(k => !Object.hasOwn(input, k))) throw new TypeError('case: exact fields required');
  } else if (inputKeys.length === 5) {
    if ([...baseKeys, 'repair_demonstration'].some(k => !Object.hasOwn(input, k))) throw new TypeError('case: exact fields required');
  } else {
    throw new TypeError('case: exact fields required');
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const k of inputKeys) {
    if (!descriptors[k].enumerable || !Object.hasOwn(descriptors[k], 'value')) throw new TypeError('case: accessors and hidden data forbidden');
  }

  if (input.schema !== DOLLHOUSE_CASE_DOSSIER_SCHEMA) throw new TypeError('case: unsupported schema');
  text(input.case_id, 100, 'case id');
  if (typeof input.source_revision !== 'string' || !/^[a-f0-9]{40}$/.test(input.source_revision)) throw new TypeError('case: exact source revision required');

  let repairScore = 0.0;
  let repairStatus = 'UNMEASURED';
  let repairEvidenceText = 'No structured before/after repair demonstration supplied.';
  let repairLimitations = null;

  if (input.repair_demonstration) {
    exact(input.repair_demonstration, ['initial_verdict', 'reparative_action', 'post_repair_verdict', 'verified', 'verification_mode'], 'repair demonstration');
    text(input.repair_demonstration.initial_verdict, 20, 'initial verdict');
    text(input.repair_demonstration.reparative_action, 500, 'reparative action');
    text(input.repair_demonstration.post_repair_verdict, 20, 'post repair verdict');
    if (typeof input.repair_demonstration.verified !== 'boolean') throw new TypeError('repair demonstration: verified must be boolean');
    text(input.repair_demonstration.verification_mode, 40, 'verification mode');
    if (!['INDEPENDENT_AUDIT_WITNESS', 'CALLER_DECLARED'].includes(input.repair_demonstration.verification_mode)) {
      throw new TypeError('repair demonstration: unsupported verification mode');
    }

    const validInitial = input.repair_demonstration.initial_verdict === 'HELD';
    const validPost = input.repair_demonstration.post_repair_verdict === 'SUPPORTED';
    const isVerified = input.repair_demonstration.verified === true;
    const mode = input.repair_demonstration.verification_mode;

    if (validInitial && validPost && isVerified && mode === 'INDEPENDENT_AUDIT_WITNESS') {
      repairScore = 1.0;
      repairStatus = 'DEMONSTRATED';
      repairEvidenceText = `Demonstrated recovery: initial HELD resolved to post-repair SUPPORTED via ${input.repair_demonstration.reparative_action} with independent audit witness.`;
      repairLimitations = 'Demonstrated in test harness; live runtime replay not executed by clerk.';
    } else if (validInitial && validPost && isVerified && mode === 'CALLER_DECLARED') {
      repairScore = 0.5;
      repairStatus = 'CALLER_DECLARED_RECOVERY';
      repairEvidenceText = `Caller self-attested recovery via ${input.repair_demonstration.reparative_action} without independent audit witness.`;
      repairLimitations = 'Caller assertion only; unverified by independent witness.';
    } else {
      repairScore = 0.0;
      repairStatus = 'UNMEASURED';
      repairEvidenceText = 'Repair demonstration does not satisfy recovery criteria.';
      repairLimitations = 'Invalid before/after verdicts or unverified state.';
    }
  }

  const ids = new Set();
  const findings = dense(input.findings, 1, 64, 'findings').map(finding => {
    exact(finding, ['id', 'agent', 'claim_key', 'verdict', 'evidence_class', 'observation_scope', 'reference', 'limitations'], 'finding');
    text(finding.id, 100, 'finding id');
    if (ids.has(finding.id)) throw new TypeError('finding: duplicate id');
    ids.add(finding.id);
    if (typeof finding.agent !== 'string' || !getDollhouseAgent(finding.agent) || finding.agent !== finding.agent.toUpperCase()) throw new TypeError('finding: undeclared agent');
    text(finding.claim_key, 160, 'claim key');
    if (!VERDICTS.includes(finding.verdict) || !CLASSES.includes(finding.evidence_class)) throw new TypeError('finding: unsupported verdict or evidence class');
    exact(finding.observation_scope, ['source', 'instrument', 'condition', 'temporal_window'], 'observation scope');
    for (const value of Object.values(finding.observation_scope)) text(value, 500, 'observation scope');
    exact(finding.reference, ['artifact', 'sha256'], 'reference');
    text(finding.reference.artifact, 500, 'artifact reference');
    if (typeof finding.reference.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(finding.reference.sha256)) throw new TypeError('reference: SHA256 commitment required');
    dense(finding.limitations, 1, 16, 'limitations').forEach(value => text(value, 1000, 'limitation'));
    return JSON.parse(JSON.stringify(finding));
  });
  const groups = new Map();
  for (const finding of findings) {
    if (!groups.has(finding.claim_key)) groups.set(finding.claim_key, []);
    groups.get(finding.claim_key).push(finding);
  }
  const disagreements = [...groups].filter(([, group]) => new Set(group.map(item => item.verdict)).size > 1).map(([claim_key, group]) => ({
    claim_key, finding_ids: group.map(item => item.id),
    verdicts: group.map(item => ({ id: item.id, agent: item.agent, verdict: item.verdict, evidence_class: item.evidence_class })),
    resolution: 'HUMAN_REVIEW_REQUIRED'
  }));
  const represented = new Set(findings.map(item => item.agent));

  let allArtifactsExist = findings.length > 0;
  let allBytesMatch = findings.length > 0;

  const fs = globalThis.process?.getBuiltinModule?.('node:fs');
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');

  for (const finding of findings) {
    const art = finding.reference?.artifact;
    const sha = finding.reference?.sha256;

    if (!art || !fs || !crypto) {
      allArtifactsExist = false;
      allBytesMatch = false;
    } else {
      try {
        if (!fs.existsSync(art)) {
          allArtifactsExist = false;
          allBytesMatch = false;
        } else {
          const content = fs.readFileSync(art);
          const actualSha = crypto.createHash('sha256').update(content).digest('hex');
          if (actualSha !== sha) {
            allBytesMatch = false;
          }
        }
      } catch {
        allArtifactsExist = false;
        allBytesMatch = false;
      }
    }
  }

  // Measured Knowledge Survival Capacities:
  const retrievability = findings.length === 0 ? 0.0 : (allArtifactsExist ? 1.0 : 0.5);
  const retrievabilityStatus = findings.length === 0 ? 'UNMEASURED' : (allArtifactsExist ? 'VERIFIED' : 'PARTIAL');
  const retrievabilityEvidence = allArtifactsExist
    ? 'All referenced artifact files exist on local disk at declared paths.'
    : (findings.length > 0 ? 'One or more referenced artifact files could not be located on local disk.' : 'No findings present.');

  const attributable_provenance = findings.length === 0 ? 0.0 : (allBytesMatch ? 1.0 : 0.5);
  const attributableProvenanceStatus = findings.length === 0 ? 'UNMEASURED' : (allBytesMatch ? 'LOCAL_BYTE_CONSISTENT' : 'UNVERIFIED_CALLER_DECLARATION');
  const attributableProvenanceEvidence = allBytesMatch
    ? 'All referenced local artifact files match declared SHA-256 digests exactly.'
    : (findings.length > 0 ? 'Artifact digests are caller-declared or file bytes differ from declared hashes.' : 'No findings present.');
  const attributableProvenanceLimitations = allBytesMatch
    ? 'Verifies local byte consistency only; external author origin remains unauthenticated.'
    : 'Caller-declared unverified references.';

  const interpretabilityValid = findings.length > 0 && findings.every(f => f.observation_scope && f.limitations && f.limitations.length > 0);
  const interpretability = interpretabilityValid ? 1.0 : 0.0;
  const interpretabilityStatus = interpretabilityValid ? 'VERIFIED' : (findings.length > 0 ? 'FAILED' : 'UNMEASURED');
  const interpretabilityEvidence = interpretabilityValid
    ? 'All findings declare strict four-vector observation scopes and explicit epistemic limitations.'
    : 'One or more findings lack complete observation scopes or epistemic limitations.';

  let transmissibilityDemonstrated = false;
  if (findings.length > 0) {
    try {
      const serialized = JSON.stringify(findings);
      const parsed = JSON.parse(serialized);
      transmissibilityDemonstrated = JSON.stringify(parsed) === serialized;
    } catch {
      transmissibilityDemonstrated = false;
    }
  }
  const transmissibility = transmissibilityDemonstrated ? 1.0 : 0.0;
  const transmissibilityStatus = transmissibilityDemonstrated ? 'DEMONSTRATED' : (findings.length > 0 ? 'FAILED' : 'UNMEASURED');
  const transmissibilityEvidence = transmissibilityDemonstrated
    ? 'Finding records survive JSON serialization/deserialization without mutation or data loss.'
    : 'Serialization roundtrip failed.';

  const hasContestationOpportunity = disagreements.length > 0 || findings.some(item => item.verdict !== 'SUPPORTED');
  const contestability = hasContestationOpportunity ? 1.0 : 0.5;
  const contestabilityStatus = hasContestationOpportunity ? 'PRESERVED_FOR_HUMAN_CONTESTATION' : 'CALIBRATED_CONSENSUS';
  const contestabilityEvidence = hasContestationOpportunity
    ? 'Disagreements or held findings are catalogued and preserved for human operator adjudication under HUMAN_REVIEW_REQUIRED.'
    : 'All agents in unanimous consensus; score calibrated to 0.5 reflecting absence of active dispute to contest.';

  const repairability = repairScore;
  const repairabilityStatus = repairStatus;

  return freeze({
    schema: DOLLHOUSE_CASE_DOSSIER_SCHEMA, case_id: input.case_id, source_revision: input.source_revision,
    findings, disagreements,
    agent_coverage: listDollhouseAgents().map(agent => ({ agent: agent.id, present: represented.has(agent.id) })),
    unresolved_finding_ids: findings.filter(item => item.verdict !== 'SUPPORTED').map(item => item.id),
    evidence_posture: {
      evidence_class_is_caller_declared: true,
      artifact_bytes_checked: allBytesMatch,
      reference_authentication: allBytesMatch ? 'BYTE_AUTHENTICATED' : 'UNVERIFIED',
      findings_independently_scoped: true,
      evidence_classes_aggregated: false,
      majority_vote: false,
      global_score: null,
      knowledge_survival: {
        retrievability,
        attributable_provenance,
        interpretability,
        transmissibility,
        contestability,
        repairability,
        capacities: {
          retrievability: {
            status: retrievabilityStatus,
            score: retrievability,
            evidence: retrievabilityEvidence
          },
          attributable_provenance: {
            status: attributableProvenanceStatus,
            score: attributable_provenance,
            evidence: attributableProvenanceEvidence,
            limitations: attributableProvenanceLimitations
          },
          interpretability: {
            status: interpretabilityStatus,
            score: interpretability,
            evidence: interpretabilityEvidence
          },
          transmissibility: {
            status: transmissibilityStatus,
            score: transmissibility,
            evidence: transmissibilityEvidence
          },
          contestability: {
            status: contestabilityStatus,
            score: contestability,
            evidence: contestabilityEvidence
          },
          repairability: {
            status: repairabilityStatus,
            score: repairability,
            evidence: repairEvidenceText,
            limitations: repairLimitations
          }
        }
      }
    },
    decision: 'HUMAN_REVIEW_REQUIRED',
    authority: { execute: false, automatic_redesign: false, release: false, merge: false, deployment: false, provider: false, human_closure_required: true }
  });
}
