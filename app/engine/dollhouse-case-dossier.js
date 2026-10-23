import { getDollhouseAgent, listDollhouseAgents } from './dollhouse-agent-registry.js';

export const DOLLHOUSE_CASE_DOSSIER_SCHEMA = 'td613.dollhouse.case-dossier/v0.1';
export const DOLLHOUSE_WITNESS_RECEIPT_SCHEMA = 'td613.dollhouse.witness-receipt/v0.3';

export const TRUSTED_WITNESS_REGISTRY = Object.freeze({
  OPERATOR_DIRECT_WITNESS: Object.freeze({
    witness_identity: 'OPERATOR_DIRECT_WITNESS',
    authority_class: 'CONTEMPORANEOUS_OPERATOR_DIRECT',
    signature_algorithm: 'ed25519',
    env_public_key_var: 'TD613_OPERATOR_WITNESS_PUBLIC_KEY',
    is_independent: true
  }),
  AMARI_ADJUDICATION_AUTHORITY: Object.freeze({
    witness_identity: 'AMARI_ADJUDICATION_AUTHORITY',
    authority_class: 'INDEPENDENT_EXTERNAL_ADJUDICATOR',
    signature_algorithm: 'ed25519',
    env_public_key_var: 'TD613_AMARI_WITNESS_PUBLIC_KEY',
    is_independent: true
  }),
  SYNTHETIC_TEST_AUTHORITY: Object.freeze({
    witness_identity: 'SYNTHETIC_TEST_AUTHORITY',
    authority_class: 'SYNTHETIC_TEST_FIXTURE',
    signature_algorithm: 'hmac-sha256',
    verification_key: 'td613-synthetic-offline-test-key-001',
    is_independent: false
  })
});

export function parsePublicKey(keyInput) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto || !keyInput) return null;
  if (typeof keyInput === 'object' && keyInput !== null && typeof keyInput.export === 'function') {
    return keyInput;
  }
  if (typeof keyInput !== 'string') return null;
  const trimmed = keyInput.trim();
  if (trimmed.includes('-----BEGIN PUBLIC KEY-----')) {
    try {
      return crypto.createPublicKey(trimmed);
    } catch {
      return null;
    }
  }
  try {
    if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      return crypto.createPublicKey({ key: Buffer.from(trimmed, 'hex'), format: 'der', type: 'spki' });
    }
    return crypto.createPublicKey({ key: Buffer.from(trimmed, 'base64'), format: 'der', type: 'spki' });
  } catch {
    return null;
  }
}

export function computeWitnessReceiptDigest(receipt) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto) return null;
  const canonical = [
    receipt.schema,
    receipt.witness_identity,
    receipt.issuer_authority,
    receipt.source_revision,
    receipt.episode_id,
    receipt.before_artifact?.path,
    receipt.before_artifact?.sha256,
    receipt.before_artifact?.verdict,
    receipt.before_artifact?.defect_class,
    receipt.after_artifact?.path,
    receipt.after_artifact?.sha256,
    receipt.after_artifact?.verdict,
    receipt.after_artifact?.predecessor_sha256,
    receipt.transition_claim
  ].join('::');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function signWitnessReceipt(receipt, signingKey, algorithm = 'ed25519') {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  if (!crypto || !signingKey) return null;
  const digest = computeWitnessReceiptDigest(receipt);
  if (!digest) return null;
  if (algorithm === 'ed25519') {
    const dataBuffer = Buffer.from(digest, 'utf8');
    const sig = crypto.sign(null, dataBuffer, signingKey);
    return sig.toString('hex');
  }
  if (algorithm === 'hmac-sha256') {
    return crypto.createHmac('sha256', signingKey).update(digest).digest('hex');
  }
  return null;
}

export function verifyWitnessReceipt(receipt, options = {}) {
  const crypto = globalThis.process?.getBuiltinModule?.('node:crypto');
  const fs = globalThis.process?.getBuiltinModule?.('node:fs');
  if (!receipt || typeof receipt !== 'object') {
    return { verified: false, failure_reason: 'RECEIPT_NOT_PROVIDED' };
  }

  if (['td613.dollhouse.witness-receipt/v0.1', 'td613.dollhouse.witness-receipt/v0.2'].includes(receipt.schema)) {
    return { verified: false, failure_reason: 'LEGACY_RECEIPT_SCHEMA_DEPRECATED' };
  }
  if (receipt.schema !== DOLLHOUSE_WITNESS_RECEIPT_SCHEMA) {
    return { verified: false, failure_reason: 'UNSUPPORTED_RECEIPT_SCHEMA' };
  }

  // 0. Mandatory exact source revision and episode binding
  if (!options.expected_source_revision || receipt.source_revision !== options.expected_source_revision) {
    return { verified: false, failure_reason: 'SOURCE_REVISION_UNPINNED_OR_MISMATCH' };
  }
  if (!receipt.episode_id || typeof receipt.episode_id !== 'string' || !receipt.episode_id.trim()) {
    return { verified: false, failure_reason: 'EPISODE_ID_REQUIRED' };
  }

  // 1. Layer 1: Local Artifact Byte Integrity
  const beforeArt = receipt.before_artifact;
  const afterArt = receipt.after_artifact;
  if (!beforeArt || !afterArt || !fs || !crypto) {
    return { verified: false, failure_reason: 'BYTE_INTEGRITY_CHECK_UNAVAILABLE' };
  }

  let beforeBytes, afterBytes;
  try {
    if (!fs.existsSync(beforeArt.path) || !fs.existsSync(afterArt.path)) {
      return { verified: false, failure_reason: 'ARTIFACT_NOT_FOUND_ON_DISK' };
    }
    beforeBytes = fs.readFileSync(beforeArt.path);
    afterBytes = fs.readFileSync(afterArt.path);
    const actualBeforeSha = crypto.createHash('sha256').update(beforeBytes).digest('hex');
    const actualAfterSha = crypto.createHash('sha256').update(afterBytes).digest('hex');
    if (actualBeforeSha !== beforeArt.sha256 || actualAfterSha !== afterArt.sha256) {
      return { verified: false, failure_reason: 'ARTIFACT_DIGEST_MISMATCH' };
    }
  } catch {
    return { verified: false, failure_reason: 'BYTE_READ_ERROR' };
  }

  // 2. Layer 2: Substantive Repair Transition Verification
  if (beforeArt.verdict !== 'HELD' || afterArt.verdict !== 'SUPPORTED') {
    return { verified: false, failure_reason: 'INVALID_TRANSITION_VERDICTS' };
  }
  if (!afterArt.predecessor_sha256 || afterArt.predecessor_sha256 !== beforeArt.sha256) {
    return { verified: false, failure_reason: 'FALSE_REPAIR_TRANSITION_UNLINKED_PREDECESSOR' };
  }
  if (beforeArt.path === afterArt.path) {
    return { verified: false, failure_reason: 'IDENTICAL_BEFORE_AFTER_ARTIFACT' };
  }

  // Substantive repair verification of on-disk artifact contents:
  // Reject valid hashes on unrelated files (e.g. package.json + README.md) as FALSE_REPAIR_TRANSITION
  try {
    const beforeObj = JSON.parse(beforeBytes.toString('utf8'));
    const afterObj = JSON.parse(afterBytes.toString('utf8'));
    if (!beforeObj || typeof beforeObj !== 'object' || !afterObj || typeof afterObj !== 'object') {
      return { verified: false, failure_reason: 'FALSE_REPAIR_TRANSITION_NON_OBJECT' };
    }
    if (beforeObj.verdict !== 'HELD' || afterObj.verdict !== 'SUPPORTED') {
      return { verified: false, failure_reason: 'FALSE_REPAIR_TRANSITION_UNMATCHED_VERDICTS' };
    }
    if (afterObj.predecessor_sha256 !== beforeArt.sha256) {
      return { verified: false, failure_reason: 'FALSE_REPAIR_TRANSITION_UNLINKED_PREDECESSOR' };
    }
  } catch {
    return { verified: false, failure_reason: 'FALSE_REPAIR_TRANSITION_INVALID_JSON' };
  }

  // 3. Layer 3: Witness Identity & Receipt Authenticity (Cryptographic Verification)
  // Verifier uses ONLY the verifier-sealed TRUSTED_WITNESS_REGISTRY.
  // Caller-supplied options.trusted_registry is strictly rejected/ignored to prevent replacing trust anchors.
  const authority = TRUSTED_WITNESS_REGISTRY[receipt.witness_identity];
  if (!authority) {
    return { verified: false, failure_reason: 'UNTRUSTED_WITNESS_AUTHORITY' };
  }

  const expectedDigest = computeWitnessReceiptDigest(receipt);
  if (!receipt.verification_digest || receipt.verification_digest !== expectedDigest) {
    return { verified: false, failure_reason: 'VERIFICATION_DIGEST_MISMATCH' };
  }

  if (authority.signature_algorithm === 'ed25519') {
    const rawPublicKey = globalThis.process?.env?.[authority.env_public_key_var];
    if (!rawPublicKey || typeof rawPublicKey !== 'string' || !rawPublicKey.trim()) {
      return {
        verified: false,
        failure_reason: 'EXTERNAL_TRUST_ANCHOR_NOT_PROVISIONED',
        witness_identity: receipt.witness_identity,
        authority_class: authority.authority_class,
        is_independent: true
      };
    }
    const pubKey = parsePublicKey(rawPublicKey);
    if (!pubKey) {
      return {
        verified: false,
        failure_reason: 'INVALID_PUBLIC_KEY_FORMAT',
        witness_identity: receipt.witness_identity,
        authority_class: authority.authority_class,
        is_independent: true
      };
    }
    if (typeof receipt.signature !== 'string' || !/^[a-f0-9]{128}$/.test(receipt.signature)) {
      return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
    }
    try {
      const sigBuffer = Buffer.from(receipt.signature, 'hex');
      const dataBuffer = Buffer.from(expectedDigest, 'utf8');
      const isValid = crypto.verify(null, dataBuffer, pubKey, sigBuffer);
      if (!isValid) {
        return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
      }
    } catch {
      return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
    }
  } else if (authority.signature_algorithm === 'hmac-sha256') {
    if (typeof receipt.signature !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.signature)) {
      return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
    }
    const expectedSignature = crypto.createHmac('sha256', authority.verification_key).update(expectedDigest).digest('hex');
    if (receipt.signature !== expectedSignature) {
      return { verified: false, failure_reason: 'INVALID_SIGNATURE' };
    }
  } else {
    return { verified: false, failure_reason: 'UNSUPPORTED_SIGNATURE_ALGORITHM' };
  }

  // 4. Layer 4: Independent Provenance vs Synthetic Verification
  return {
    verified: true,
    witness_identity: receipt.witness_identity,
    authority_class: authority.authority_class,
    signature_algorithm: authority.signature_algorithm,
    is_independent: authority.is_independent,
    episode_id: receipt.episode_id,
    source_revision: receipt.source_revision,
    verification_digest: receipt.verification_digest,
    transition_claim: receipt.transition_claim
  };
}

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
    const demo = input.repair_demonstration;
    const demoKeys = Reflect.ownKeys(demo);
    if (demoKeys.length === 5) {
      exact(demo, ['initial_verdict', 'reparative_action', 'post_repair_verdict', 'verified', 'verification_mode'], 'repair demonstration');
    } else if (demoKeys.length === 6) {
      exact(demo, ['initial_verdict', 'reparative_action', 'post_repair_verdict', 'verified', 'verification_mode', 'witness_receipt'], 'repair demonstration');
    } else {
      throw new TypeError('repair demonstration: exact fields required');
    }

    text(demo.initial_verdict, 20, 'initial verdict');
    text(demo.reparative_action, 500, 'reparative action');
    text(demo.post_repair_verdict, 20, 'post repair verdict');
    if (typeof demo.verified !== 'boolean') throw new TypeError('repair demonstration: verified must be boolean');
    text(demo.verification_mode, 40, 'verification mode');
    if (!['INDEPENDENT_AUDIT_WITNESS', 'CALLER_DECLARED'].includes(demo.verification_mode)) {
      throw new TypeError('repair demonstration: unsupported verification mode');
    }

    const validInitial = demo.initial_verdict === 'HELD';
    const validPost = demo.post_repair_verdict === 'SUPPORTED';
    const isVerified = demo.verified === true;

    let witnessVerified = false;
    let witnessDetails = null;

    if (demo.witness_receipt) {
      const receipt = demo.witness_receipt;
      exact(receipt, [
        'schema', 'witness_identity', 'issuer_authority', 'signature',
        'verification_digest', 'source_revision', 'episode_id', 'before_artifact',
        'after_artifact', 'transition_claim'
      ], 'witness receipt');
      if (receipt.schema !== DOLLHOUSE_WITNESS_RECEIPT_SCHEMA) {
        throw new TypeError(`witness receipt: invalid schema (expected ${DOLLHOUSE_WITNESS_RECEIPT_SCHEMA})`);
      }
      text(receipt.witness_identity, 120, 'witness identity');
      text(receipt.issuer_authority, 120, 'issuer authority');
      if (typeof receipt.signature !== 'string' || !/^[a-f0-9]{64,128}$/.test(receipt.signature)) {
        throw new TypeError('witness receipt: signature must be 64-hex HMAC or 128-hex Ed25519 signature');
      }
      if (typeof receipt.verification_digest !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.verification_digest)) {
        throw new TypeError('witness receipt: verification_digest must be 64-hex SHA-256');
      }
      text(receipt.source_revision, 120, 'source revision');
      text(receipt.episode_id, 120, 'episode id');
      text(receipt.transition_claim, 500, 'transition claim');

      exact(receipt.before_artifact, ['path', 'sha256', 'verdict', 'defect_class'], 'before artifact');
      exact(receipt.after_artifact, ['path', 'sha256', 'verdict', 'predecessor_sha256'], 'after artifact');
      text(receipt.before_artifact.path, 500, 'before artifact path');
      text(receipt.after_artifact.path, 500, 'after artifact path');
      text(receipt.before_artifact.verdict, 20, 'before artifact verdict');
      text(receipt.before_artifact.defect_class, 120, 'before artifact defect class');
      text(receipt.after_artifact.verdict, 20, 'after artifact verdict');
      if (!/^[a-f0-9]{64}$/.test(receipt.before_artifact.sha256) || !/^[a-f0-9]{64}$/.test(receipt.after_artifact.sha256)) {
        throw new TypeError('witness receipt: artifact sha256 must be 64-hex SHA-256');
      }
      if (!/^[a-f0-9]{64}$/.test(receipt.after_artifact.predecessor_sha256)) {
        throw new TypeError('witness receipt: predecessor_sha256 must be 64-hex SHA-256');
      }

      const witnessResult = verifyWitnessReceipt(receipt, {
        expected_source_revision: input.source_revision
      });
      if (witnessResult.verified) {
        witnessVerified = true;
        witnessDetails = witnessResult;
      } else {
        witnessVerified = false;
        witnessDetails = witnessResult;
      }
    }

    if (validInitial && validPost && isVerified && witnessVerified) {
      if (witnessDetails.is_independent === true) {
        repairScore = 1.0;
        repairStatus = 'DEMONSTRATED';
        repairEvidenceText = `Independently authenticated witness receipt verified: on-disk before/after artifacts match SHA-256 commitments under authentic witness ${witnessDetails.witness_identity} (${witnessDetails.verification_digest.slice(0, 12)}...).`;
        repairLimitations = 'Verified against authentic independent witness receipt and on-disk artifact bytes; live runtime replay not executed by clerk.';
      } else {
        repairScore = 1.0;
        repairStatus = 'SYNTHETIC_VERIFIED_RECOVERY';
        repairEvidenceText = `Synthetic offline test authority verified before/after artifact transition under ${witnessDetails.witness_identity} (${witnessDetails.verification_digest.slice(0, 12)}...). Zero independent empirical evidence credit.`;
        repairLimitations = 'Verified by synthetic offline test authority only; external independent witness remains unverified.';
      }
    } else if (witnessDetails && witnessDetails.failure_reason === 'EXTERNAL_TRUST_ANCHOR_NOT_PROVISIONED') {
      repairScore = 0.5;
      repairStatus = 'EXTERNAL_WITNESS_ANCHOR_UNAVAILABLE_HELD';
      repairEvidenceText = `Witness receipt declared external authority ${witnessDetails.witness_identity}, but external public key anchor (${TRUSTED_WITNESS_REGISTRY[witnessDetails.witness_identity]?.env_public_key_var || 'TD613_*_PUBLIC_KEY'}) is not provisioned in runtime environment. Boundary honestly held.`;
      repairLimitations = 'External public verification key not provisioned in environment; cannot manufacture independent verification.';
    } else if (validInitial && validPost && isVerified) {
      repairScore = 0.5;
      repairStatus = 'CALLER_DECLARED_RECOVERY';
      repairEvidenceText = `Caller self-attested recovery via ${demo.reparative_action} without independently validated witness receipt.`;
      repairLimitations = 'Caller assertion only; unverified by independent witness receipt.';
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
