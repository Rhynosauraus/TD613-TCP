import { PORTABLE_LOOM_MATH_ASSETS, PORTABLE_LOOM_COMPANION_SOURCE, PORTABLE_LOOM_COMPANION_SHA256 } from './portable-loom-tomography-assets.js?v=20261017-browser-math-v1';
import { createPortableLoomSessionPrompt, portableLoomDigest } from './portable-loom-session.js';

const ENTRY = 'app/engine/portable-loom-tomography-fixtures.js';
const MAX_SOURCE_BYTES = 65536;
const MAX_TOTAL_BYTES = 524288;
const WORKER_TIMEOUT_MS = 20000;
const encoder = new TextEncoder();
const json = value => JSON.stringify(value, null, 2) + '\n';
const hex = bytes => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
const digest = async (value, environment) => hex(await environment.crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value));
const aborted = signal => {
  if (signal?.aborted) throw new DOMException('Stopped while preparing the mathematical package.', 'AbortError');
};

function resolveDependency(path, specifier, allowed) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) throw new Error('PORTABLE_MATH_EXTERNAL_IMPORT_REJECTED');
  if (/[\\?#\0]/.test(specifier)) throw new Error('PORTABLE_MATH_IMPORT_PATH_REJECTED');
  const parts = path.split('/'); parts.pop();
  for (const part of specifier.split('/')) {
    if (part === '.' || !part) continue;
    if (part === '..') { if (!parts.length) throw new Error('PORTABLE_MATH_IMPORT_PATH_REJECTED'); parts.pop(); }
    else parts.push(part);
  }
  const target = parts.join('/');
  if (!allowed.has(target)) throw new Error('PORTABLE_MATH_DEPENDENCY_MISSING: ' + target);
  return target;
}

// This intentionally accepts only the closed, reviewed static module grammar.
// Nothing is evaluated while the dependency graph is being checked.
function imports(source) {
  if (/\bimport\s*(?:\(|\.\s*meta\b)/.test(source)) throw new Error('PORTABLE_MATH_DYNAMIC_IMPORT_REJECTED');
  if (/(?:^|\n)\s*import\s*['"]/.test(source)) throw new Error('PORTABLE_MATH_SIDE_EFFECT_IMPORT_REJECTED');
  const pattern = /(?:^|\n)[ \t]*(?:import\s+[\w*$,\s{}]+?\s+from|export\s+(?:\*(?:\s+as\s+\w+)?|\{[\w$,\s]*\})\s+from)\s*(['"])([^'"\n]+)\1/g;
  const matched = [...source.matchAll(pattern)];
  // Unsupported static syntax must fail rather than survive unchanged and let
  // the worker fetch an import that escaped the closed graph.
  const remaining = source.replace(pattern, match => match.replace(/[^\n]/g, ' '));
  if (/(?:^|[;\n])\s*import\b/.test(remaining)
    || /(?:^|[;\n])\s*export\s*\*/.test(remaining)
    || /(?:^|[;\n])\s*export\s*\{[^}]*\}\s*from\b/.test(remaining)) throw new Error('PORTABLE_MATH_STATIC_IMPORT_GRAMMAR_REJECTED');
  return matched.map(match => ({ start: match.index + match[0].lastIndexOf(match[2]), end: match.index + match[0].lastIndexOf(match[2]) + match[2].length, specifier: match[2] }));
}

async function executeVerifiedMath({ sources, sourceRevision, environment, signal }) {
  if (typeof environment.Worker !== 'function' || typeof environment.Blob !== 'function'
    || typeof environment.URL?.createObjectURL !== 'function') throw new Error('PORTABLE_MATH_MODULE_WORKER_UNAVAILABLE');
  const allowed = new Map(sources.map(source => [source.path, source.content]));
  const graph = new Map(sources.map(source => [source.path, imports(source.content).map(record => ({ ...record, target: resolveDependency(source.path, record.specifier, allowed) }))]));
  if (!allowed.has(ENTRY)) throw new Error('PORTABLE_MATH_ENTRY_MISSING');
  const urls = new Map(), visiting = new Set();
  let worker, timer;
  const makeUrl = path => {
    if (urls.has(path)) return urls.get(path);
    if (visiting.has(path)) throw new Error('PORTABLE_MATH_DEPENDENCY_CYCLE');
    visiting.add(path);
    let body = allowed.get(path);
    const replacements = graph.get(path).map(record => ({ ...record, url: makeUrl(record.target) }));
    for (const record of replacements.reverse()) body = body.slice(0, record.start) + record.url + body.slice(record.end);
    const url = environment.URL.createObjectURL(new environment.Blob([body], { type: 'text/javascript' }));
    urls.set(path, url); visiting.delete(path); return url;
  };
  let onAbort;
  try {
    // Validate every bundled source, including any currently unreferenced member.
    for (const path of allowed.keys()) makeUrl(path);
    aborted(signal);
    const entryUrl = urls.get(ENTRY);
    const workerBody = `import { runPortableLoomTomographyFixtureAudit, buildPortableLoomResearchMathContract } from ${JSON.stringify(entryUrl)};\nself.onmessage = async event => { try { const report = await runPortableLoomTomographyFixtureAudit(event.data.sourceRevision); const researchMathContract = await buildPortableLoomResearchMathContract(); self.postMessage({ok:true,result:{report,researchMathContract}}); } catch(error) { self.postMessage({ok:false,error:String(error.message || error)}); } };\n`;
    const entry = environment.URL.createObjectURL(new environment.Blob([workerBody], { type: 'text/javascript' }));
    urls.set('__worker__', entry);
    worker = new environment.Worker(entry, { type: 'module', name: 'loom-finite-math-export' });
    return await new Promise((resolve, reject) => {
      const clear = () => { (environment.clearTimeout || clearTimeout)(timer); signal?.removeEventListener('abort', onAbort); };
      const fail = error => { clear(); reject(error); };
      onAbort = () => fail(new DOMException('Stopped while executing the mathematical fixtures.', 'AbortError'));
      signal?.addEventListener('abort', onAbort, { once: true });
      worker.onmessage = event => { clear(); event.data?.ok ? resolve(event.data.result) : reject(new Error('PORTABLE_MATH_EXECUTION_FAILED: ' + (event.data?.error || 'invalid worker response'))); };
      worker.onerror = event => fail(new Error('PORTABLE_MATH_EXECUTION_FAILED: ' + (event.message || 'module worker failed')));
      worker.onmessageerror = () => fail(new Error('PORTABLE_MATH_EXECUTION_RESPONSE_INVALID'));
      timer = (environment.setTimeout || setTimeout)(() => fail(new Error('PORTABLE_MATH_EXECUTION_TIMEOUT')), WORKER_TIMEOUT_MS);
      if (signal?.aborted) { onAbort(); return; }
      worker.postMessage({ sourceRevision });
    });
  } finally {
    worker?.terminate();
    if (timer !== undefined) (environment.clearTimeout || clearTimeout)(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
    for (const url of urls.values()) environment.URL.revokeObjectURL(url);
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }

// ZIP STORE keeps every carried file byte-for-byte reproducible without adding
// a compression dependency or executing any carried program during packaging.
function zipStore(files) {
  const entries = files.map(file => ({ name: encoder.encode(file.name), data: encoder.encode(file.content) }));
  const localSize = entries.reduce((n, entry) => n + 30 + entry.name.length + entry.data.length, 0);
  const centralSize = entries.reduce((n, entry) => n + 46 + entry.name.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22), view = new DataView(bytes.buffer);
  let offset = 0;
  const records = [];
  for (const entry of entries) {
    const start = offset, crc = crc32(entry.data);
    view.setUint32(offset, 0x04034b50, true); view.setUint16(offset + 4, 20, true); view.setUint16(offset + 6, 0x800, true);
    view.setUint16(offset + 12, 0x21, true); view.setUint32(offset + 14, crc, true);
    view.setUint32(offset + 18, entry.data.length, true); view.setUint32(offset + 22, entry.data.length, true); view.setUint16(offset + 26, entry.name.length, true);
    bytes.set(entry.name, offset + 30); bytes.set(entry.data, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.data.length; records.push({ ...entry, start, crc });
  }
  const centralStart = offset;
  for (const entry of records) {
    view.setUint32(offset, 0x02014b50, true); view.setUint16(offset + 4, 20, true); view.setUint16(offset + 6, 20, true); view.setUint16(offset + 8, 0x800, true);
    view.setUint16(offset + 14, 0x21, true); view.setUint32(offset + 16, entry.crc, true); view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true); view.setUint16(offset + 28, entry.name.length, true); view.setUint32(offset + 42, entry.start, true);
    bytes.set(entry.name, offset + 46); offset += 46 + entry.name.length;
  }
  view.setUint32(offset, 0x06054b50, true); view.setUint16(offset + 8, records.length, true); view.setUint16(offset + 10, records.length, true);
  view.setUint32(offset + 12, centralSize, true); view.setUint32(offset + 16, centralStart, true);
  return bytes;
}

export async function buildPortableLoomBrowserPackage(sessionExport, { environment = globalThis, signal, executeMath = executeVerifiedMath } = {}) {
  aborted(signal);
  if (sessionExport?.schema !== 'td613.loom.portable-session-export/v0.1'
    || typeof sessionExport.session?.root?.ref !== 'string' || !sessionExport.portable_task
    || !sessionExport.session.work_units?.length) throw new Error('PORTABLE_MATH_PREPARED_SESSION_REQUIRED');
  const originalRoot = sessionExport.session.root.ref;
  const originalPacketDigest = sessionExport.session.root.packet_digest;
  if (await portableLoomDigest(sessionExport.portable_task, environment) !== originalPacketDigest) throw new Error('PORTABLE_MATH_PACKET_ROOT_MISMATCH');
  const sourceRevision = sessionExport.session.source_revision;
  if (!Array.isArray(PORTABLE_LOOM_MATH_ASSETS) || PORTABLE_LOOM_MATH_ASSETS.length < 11 || PORTABLE_LOOM_MATH_ASSETS.length > 16) throw new Error('PORTABLE_MATH_SOURCE_MANIFEST_INVALID');
  const paths = new Set();
  for (const entry of PORTABLE_LOOM_MATH_ASSETS) {
    if (!/^app\/[a-zA-Z0-9_./-]+\.js$/.test(entry.path) || entry.path.split('/').some(part => part === '..' || !part)
      || !/^[a-f0-9]{64}$/.test(entry.sha256) || paths.has(entry.path)) throw new Error('PORTABLE_MATH_SOURCE_MANIFEST_INVALID');
    paths.add(entry.path);
  }
  const sources = await Promise.all(PORTABLE_LOOM_MATH_ASSETS.map(async entry => {
    aborted(signal);
    const response = await environment.fetch('/' + entry.path.slice(4), { cache: 'no-store', signal });
    if (!response.ok) throw new Error('PORTABLE_MATH_SOURCE_UNAVAILABLE: ' + entry.path);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_SOURCE_BYTES) throw new Error('PORTABLE_MATH_SOURCE_TOO_LARGE');
    if (await digest(bytes, environment) !== entry.sha256) throw new Error('PORTABLE_MATH_SOURCE_HASH_MISMATCH: ' + entry.path);
    const content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    if (encoder.encode(content).length !== bytes.length) throw new Error('PORTABLE_MATH_SOURCE_ENCODING_REJECTED');
    return { ...entry, content, bytes: bytes.length };
  }));
  if (sources.reduce((sum, source) => sum + source.bytes, 0) > MAX_TOTAL_BYTES) throw new Error('PORTABLE_MATH_BUNDLE_TOO_LARGE');
  if (encoder.encode(PORTABLE_LOOM_COMPANION_SOURCE).length > MAX_SOURCE_BYTES
    || await digest(PORTABLE_LOOM_COMPANION_SOURCE, environment) !== PORTABLE_LOOM_COMPANION_SHA256) throw new Error('PORTABLE_MATH_COMPANION_HASH_MISMATCH');
  aborted(signal);
  const { report, researchMathContract } = await executeMath({ sources, sourceRevision, environment, signal });
  aborted(signal);
  if (report?.schema !== 'td613.loom.portable-tomography-audit/v0.1' || report.artifact_source_revision !== sourceRevision
    || report.mathematical_modules_recomputed !== true || report.transport?.valid_finite_fixture !== true
    || report.face_holonomy?.valid_finite_fixture !== true || report.empirical_golden_egg_earned !== false
    || report.empirical_acquisition !== 'NOT_RUN' || report.observed_real_routes !== 'NOT_RUN'
    || report.feasible_region?.joint_realizability !== 'UNMEASURED'
    || researchMathContract?.schema !== 'td613.loom.portable-research-math/v0.1'
    || researchMathContract.measured_surface_count !== 0 || researchMathContract.episode_evaluation_status !== 'NOT_RUN'
    || researchMathContract.earned_empirical_result !== false) throw new Error('PORTABLE_MATH_EXECUTION_RESULT_INVALID');
  const contract = {
    schema: 'td613.loom.portable-tomography-contract/v0.1', source_revision: sourceRevision,
    artifact_kind: 'BROWSER_PREPARED_SESSION', artifact_file: 'loom-portable-session.json',
    executable: 'portable-loom-tomography-audit.mjs',
    selected_math: ['hardened discrete transport tomography in F_31', 'noncommuting two-face GL2(F_31) holonomy', 'factorized synthetic Golden Egg L/R/J feasible region', 'five-surface same-episode declaration evaluator'],
    mathematical_source_files: sources.map(({ path, sha256 }) => ({ path, sha256 })),
    empirical_acquisition: 'NOT_RUN', qualified_same_episode: false,
    required_new_evidence: ['preregistered distinct routes', 'same comparison frame', 'continuous custody', 'jointly measured L/R/J', 'empirically bound G', 'two actually observed matched control/protected returns'],
    independently_authenticated: false, claim_ceiling: 'EXACT_AUTHORED_FINITE_MATH_AND_DECLARATION_CHECKS_ONLY'
  };
  const contractBody = json(contract);
  const receipt = {
    schema: 'td613.loom.portable-tomography-execution-receipt/v0.1', execution_origin: 'BROWSER_LOCAL_PROCESS',
    source_revision: sourceRevision, session_root_ref: originalRoot,
    math_contract_sha256: await digest(contractBody, environment), canonical_source_hashes_checked: true,
    evidence_class: 'LOCALLY_EXECUTED_FINITE_SYNTHETIC_FIXTURE', observer_measurement: 'NOT_RUN', real_route_acquisition: 'NOT_RUN',
    empirical_promotion_authority: false, self_check_audit: report
  };
  const receiptBody = json(receipt), receiptHash = await digest(receiptBody, environment);
  const artifact = {
    ...sessionExport, artifact_kind: contract.artifact_kind, artifact_file: contract.artifact_file,
    research_math_contract: researchMathContract,
    portable_tomography: {
      schema: contract.schema, execution: 'LOCAL_COMPANION_REQUIRED', executable: contract.executable,
      artifact_kind: contract.artifact_kind, mathematically_verified_for_this_session: false,
      observer_capture_present: false, matched_return_present: false, empirical_promotion_authority: false,
      calculated_fixture_receipt: {
        schema: receipt.schema, execution_origin: receipt.execution_origin, evidence_class: receipt.evidence_class,
        status: 'CANONICAL_FINITE_MATH_RECOMPUTED', receipt_file: 'portable-loom-tomography-receipt.json', receipt_sha256: receiptHash,
        mathematical_result: report, observer_measurement: 'NOT_RUN', empirical_promotion_authority: false
      }
    }
  };
  const prompt = createPortableLoomSessionPrompt(artifact) + '\n\nThe copied activation carries the browser-computed finite fixture report. The executable companion and its exact source files travel in the Export session ZIP; copying this activation alone carries no executable files. Unpack that ZIP and run `node portable-loom-tomography-audit.mjs --self-check` to recompute it locally. New episode declarations require a fresh explicit `--episode` run. A receiving-model reply alone performs neither computation nor empirical acquisition.\n';
  const files = [
    { name: 'loom-portable-session.json', content: json(artifact) },
    { name: 'loom-portable-session.md', content: '# Portable Loom Session\n\n' + prompt },
    { name: 'portable-loom-math-contract.json', content: contractBody },
    { name: 'portable-loom-tomography-audit.mjs', content: PORTABLE_LOOM_COMPANION_SOURCE },
    { name: 'portable-loom-tomography-receipt.json', content: receiptBody },
    { name: 'tomography/package.json', content: '{"type":"module"}\n' },
    ...sources.map(source => ({ name: 'tomography/' + source.path, content: source.content }))
  ];
  for (const file of files) { file.bytes = encoder.encode(file.content).length; file.sha256 = await digest(file.content, environment); }
  const manifest = {
    schema: 'td613.loom.browser-export-manifest/v0.1', source_revision: sourceRevision, source_authentication: 'UNRESOLVED',
    artifact_kind: contract.artifact_kind, session_root_ref: originalRoot, portable_packet_digest: originalPacketDigest,
    selected_source_count: artifact.portable_task.documents.length, captured_gate_report_count: artifact.loom_gate_reports?.length || 0,
    admitted_work_unit_count: artifact.session.work_units.filter(unit => unit.status === 'ADMITTED').length,
    mathematical_companion: { executable: contract.executable, contract: 'portable-loom-math-contract.json', status: 'CANONICAL_FINITE_MATH_RECOMPUTED', execution_origin: receipt.execution_origin, receipt_file: 'portable-loom-tomography-receipt.json', receipt_sha256: receiptHash, empirical_acquisition: 'NOT_RUN', golden_egg_earned: false },
    files: files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))
  };
  const manifestFile = { name: 'loom-session-manifest.json', content: json(manifest) };
  manifestFile.bytes = encoder.encode(manifestFile.content).length; manifestFile.sha256 = await digest(manifestFile.content, environment); files.push(manifestFile);
  if (artifact.session.root.ref !== originalRoot || artifact.session.root.packet_digest !== originalPacketDigest
    || await portableLoomDigest(artifact.portable_task, environment) !== originalPacketDigest) throw new Error('PORTABLE_MATH_IDENTITY_CHANGED');
  aborted(signal);
  return { artifact, prompt, zipBytes: zipStore(files), files };
}
