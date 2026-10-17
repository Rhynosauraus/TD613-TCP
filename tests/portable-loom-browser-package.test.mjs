import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import { buildPortableLoomBrowserPackage } from '../app/engine/portable-loom-browser-package.js';
import { PORTABLE_LOOM_MATH_ASSETS } from '../app/engine/portable-loom-tomography-assets.js';
import { runPortableLoomTomographyFixtureAudit, buildPortableLoomResearchMathContract } from '../app/engine/portable-loom-tomography-fixtures.js';
import { createLoomAiGovernance, createCanonicalPortableLoomPacket } from '../app/dome-world/holonomy-loom/ai-handoff.js';
import { createPortableLoomSession, createPortableLoomWorkUnit, createPortableLoomSessionExport, portableLoomDigest } from '../app/engine/portable-loom-session.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const encoder = new TextEncoder();
const compute = async ({ sourceRevision }) => ({ report: runPortableLoomTomographyFixtureAudit(sourceRevision), researchMathContract: buildPortableLoomResearchMathContract() });

async function fixture({ mutateSource, worker } = {}) {
  const environment = { crypto: webcrypto, TextEncoder };
  const input = { task: 'Write a bounded fictional brief.', rules: ['Use only selected sources.'], documents: [{ id: 'selected', name: 'Fictional approved source', text: 'SELECTED_PUBLIC_FACT_613' }] };
  input.governance = await createLoomAiGovernance(input, { withheldDocumentCount: 1 }, environment);
  const packet = await createCanonicalPortableLoomPacket(input, { sourceRevision: 'browser-unpinned' }, environment);
  let session = await createPortableLoomSession(packet, { session_id: webcrypto.randomUUID(), source_revision: 'browser-unpinned', created_at: 1000 }, environment);
  session = (await createPortableLoomWorkUnit(session, { work_unit_id: 'work_1', request_id: webcrypto.randomUUID(), task: input.task, documents: input.documents, add_rules: [], withheld_document_count: 1 }, environment)).session;
  const artifact = await createPortableLoomSessionExport(session, packet, environment);
  const requests = [];
  environment.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.ok(url.startsWith('/')); assert.equal(options.cache, 'no-store');
    const path = 'app/' + url.slice(1);
    let content = await readFile(join(root, path));
    if (mutateSource) content = mutateSource(content, path);
    return { ok: true, arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) };
  };
  if (worker) Object.assign(environment, worker);
  return { artifact, environment, requests };
}

test('browser package carries reproducible mathematics without changing task/root/source identity', async t => {
  const f = await fixture();
  const before = JSON.stringify(f.artifact);
  const result = await buildPortableLoomBrowserPackage(f.artifact, { environment: f.environment, executeMath: compute });
  assert.equal(JSON.stringify(f.artifact), before, 'source export stays immutable');
  assert.equal(result.artifact.session, f.artifact.session);
  assert.equal(result.artifact.portable_task, f.artifact.portable_task);
  assert.equal(result.artifact.session.source_revision, 'browser-unpinned');
  assert.equal(result.artifact.artifact_kind, 'BROWSER_PREPARED_SESSION');
  assert.equal(result.artifact.session.root.packet_digest, await portableLoomDigest(result.artifact.portable_task, f.environment));
  assert.equal(result.artifact.portable_tomography.calculated_fixture_receipt.execution_origin, 'BROWSER_LOCAL_PROCESS');
  assert.equal(result.artifact.portable_tomography.calculated_fixture_receipt.mathematical_result.empirical_acquisition, 'NOT_RUN');
  assert.match(result.prompt, /BROWSER_LOCAL_PROCESS/);
  assert.match(result.prompt, /copying this activation alone carries no executable files/);
  assert.match(result.prompt, /SELECTED_PUBLIC_FACT_613/);
  assert.doesNotMatch(result.prompt, /WITHHELD_SECRET_SENTINEL_613|LOCAL_CHALLENGE_ANSWER_KEY_613/);
  assert.equal(f.requests.length, PORTABLE_LOOM_MATH_ASSETS.length);
  assert.equal(result.files.length, PORTABLE_LOOM_MATH_ASSETS.length + 7);
  const manifest = JSON.parse(result.files.find(file => file.name === 'loom-session-manifest.json').content);
  for (const member of manifest.files) {
    const file = result.files.find(file => file.name === member.name);
    assert.equal(Buffer.byteLength(file.content), member.bytes); assert.equal(sha(file.content), member.sha256);
  }
  const temp = await mkdtemp(join(tmpdir(), 'loom-browser-package-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const zip = join(temp, 'loom.zip'); await writeFile(zip, result.zipBytes);
  // Python's independent ZIP reader verifies CRCs, file names and extraction.
  const extracted = join(temp, 'extracted');
  const names = JSON.parse(execFileSync('python3', ['-c', 'import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n z.extractall(sys.argv[2])\n print(json.dumps(z.namelist()))', zip, extracted], { encoding: 'utf8' }));
  assert.deepEqual(names, result.files.map(file => file.name));
  const report = JSON.parse(execFileSync(process.execPath, [join(extracted, 'portable-loom-tomography-audit.mjs'), '--self-check'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
  assert.deepEqual(report, result.artifact.portable_tomography.calculated_fixture_receipt.mathematical_result);
});

test('browser package rejects altered/missing source bytes before computation', async () => {
  let executions = 0;
  const changed = await fixture({ mutateSource: (bytes, path) => path === PORTABLE_LOOM_MATH_ASSETS[0].path ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes });
  await assert.rejects(buildPortableLoomBrowserPackage(changed.artifact, { environment: changed.environment, executeMath: async args => { executions++; return compute(args); } }), /SOURCE_HASH_MISMATCH/);
  assert.equal(executions, 0);
  const absent = await fixture(); absent.environment.fetch = async () => ({ ok: false });
  await assert.rejects(buildPortableLoomBrowserPackage(absent.artifact, { environment: absent.environment, executeMath: compute }), /SOURCE_UNAVAILABLE/);
  const mismatch = await fixture();
  await assert.rejects(buildPortableLoomBrowserPackage({ ...mismatch.artifact, portable_task: { ...mismatch.artifact.portable_task, task: 'Substituted task.' } }, { environment: mismatch.environment, executeMath: compute }), /PACKET_ROOT_MISMATCH/);
  assert.equal(mismatch.requests.length, 0);
});

test('browser package refuses empirical promotion and aborted completion', async () => {
  const f = await fixture();
  await assert.rejects(buildPortableLoomBrowserPackage(f.artifact, { environment: f.environment, executeMath: async args => {
    const value = await compute(args); return { ...value, report: { ...value.report, empirical_golden_egg_earned: true } };
  } }), /EXECUTION_RESULT_INVALID/);
  const controller = new AbortController();
  await assert.rejects(buildPortableLoomBrowserPackage(f.artifact, { environment: f.environment, signal: controller.signal, executeMath: async args => { controller.abort(); return compute(args); } }), { name: 'AbortError' });
});

test('default worker closes the verified dependency graph and releases URLs after execution or abort', async () => {
  for (const shouldAbort of [false, true]) {
    const urls = new Map(), revoked = []; let terminated = 0, count = 0;
    const controller = new AbortController();
    const f = await fixture({ worker: {
      Blob,
      URL: { createObjectURL(blob) { const key = 'blob:fixture/' + ++count; urls.set(key, blob); return key; }, revokeObjectURL(url) { revoked.push(url); } },
      Worker: class {
        constructor(url, options) { assert.equal(options.type, 'module'); assert.ok(urls.has(url)); }
        async postMessage({ sourceRevision }) {
          const helperSources = await Promise.all([...urls.values()].map(blob => blob.text()));
          assert.ok(helperSources.some(source => source.includes('runPortableLoomTomographyFixtureAudit') && source.includes('blob:fixture/')));
          if (shouldAbort) controller.abort();
          else this.onmessage({ data: { ok: true, result: await compute({ sourceRevision }) } });
        }
        terminate() { terminated++; }
      }
    } });
    const pending = buildPortableLoomBrowserPackage(f.artifact, { environment: f.environment, signal: controller.signal });
    if (shouldAbort) await assert.rejects(pending, { name: 'AbortError' });
    else assert.equal((await pending).artifact.session.root.ref, f.artifact.session.root.ref);
    assert.equal(terminated, 1); assert.equal(revoked.length, urls.size);
  }
});
