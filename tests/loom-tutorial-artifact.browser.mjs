/** Actual Chromium witness for the fictional tutorial's canonical artifact.
 * The exact JSON read from the visible inspector is independently verified and
 * rebuilt in Node. These local checks grant no provider or custody authority.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const baseline = process.env.TD613_ARTIFACT_BASELINE === '1';
const sourceBytes = async file => baseline ? execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }) : readFile(file);
const dir = resolve(process.env.TD613_ARTIFACT_DIR || 'artifacts/loom-tutorial-artifact');
await mkdir(dir, { recursive: true });
const report = {
  schema: 'td613.loom.tutorial-artifact-browser-witness/v0.1', status: 'HELD',
  source_head: process.env.TD613_SOURCE_HEAD || git('rev-parse', 'HEAD'), checkout_head: git('rev-parse', 'HEAD'),
  working_tree_dirty: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  harness_sha256: sha(await readFile(new URL(import.meta.url))), observed_at: new Date().toISOString(),
  baseline_source: baseline ? 'GIT_HEAD_COMMITTED_APPLICATION_BYTES' : null,
  browser: 'Chromium', physical_device_observed: false, human_comprehension_measured: false,
  provider_calls: 0, source_hashes: {}, served_source_hashes: {}, blocked_requests: [], runtime_errors: [], checks: [], failures: [], screenshots: []
};
for (const file of ['app/dome-world/holonomy-loom.html', 'app/dome-world/holonomy-loom/ai-workspace.js', 'app/dome-world/holonomy-loom/first-crossing-practice.js', 'app/dome-world/holonomy-loom/workspace-template.js', 'app/dome-world/holonomy-loom/loom-couture.css']) report.source_hashes[file] = sha(await sourceBytes(file));
const check = (name, passed, evidence) => {
  const value = { name, status: passed ? 'PASS' : 'FAIL', evidence };
  report.checks.push(value); if (!passed) report.failures.push(value);
};
let server, base = process.env.TD613_BASE_URL;
if (!base) {
  const app = resolve('app'), cache = new Map();
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = resolve(app, '.' + pathname);
      if (request.method !== 'GET' || !file.startsWith(app + sep)) throw Error('Static witness only admits application GETs');
      const source = `app${pathname}`;
      if (!cache.has(source)) cache.set(source, await sourceBytes(source));
      const bytes = cache.get(source); report.served_source_hashes[source] = sha(bytes);
      response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' })[extname(file)] || 'application/octet-stream');
      response.end(bytes);
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/, ''); report.base_url = base;
report.context = ['localhost', '127.0.0.1'].includes(new URL(base).hostname) ? 'LOCAL_CHROMIUM_ACTUAL_UI_WITH_INDEPENDENT_NODE_REPLAY' : 'PRODUCTION_CHROMIUM_ACTUAL_UI_WITH_INDEPENDENT_NODE_REPLAY';

function independentAssurance(raw) {
  const moduleUrl = pathToFileURL(resolve('app/dome-world/holonomy-loom/ai-handoff.js')).href;
  const code = `import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {inspectPortableLoomReceiverAssurance,createCanonicalPortableLoomPacket} from ${JSON.stringify(moduleUrl)};
const raw=readFileSync(0,'utf8'),packet=JSON.parse(raw),environment={crypto:webcrypto};
const assurance=await inspectPortableLoomReceiverAssurance(packet,environment);
let rebuilt_equal=false,text_equal=false,selected_tamper=null,legend_tamper=null;
if(packet.portable_governance){
 const rebuilt=await createCanonicalPortableLoomPacket({task:packet.task,documents:packet.documents,rules:packet.rules,governance:packet.governance},{observationBasis:packet.portable_governance.observation_basis,sourceRevision:packet.portable_governance.source_revision,outputProtocolVersion:packet.portable_governance.output_protocol.schema},environment);
 rebuilt_equal=isDeepStrictEqual(packet,rebuilt);text_equal=raw===JSON.stringify(rebuilt,null,2);
 const changed=JSON.parse(raw);changed.documents[0].text+=' CHANGED';selected_tamper=(await inspectPortableLoomReceiverAssurance(changed,environment)).outcome;
 const legend=JSON.parse(raw);legend.portable_governance.flow_core.legend.entries.gathering.glyph='changed';legend_tamper=(await inspectPortableLoomReceiverAssurance(legend,environment)).outcome;
}
console.log(JSON.stringify({assurance,rebuilt_equal,text_equal,selected_tamper,legend_tamper,bytes:Buffer.byteLength(raw),sha256:createHash('sha256').update(raw).digest('hex')}));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { input: raw, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
}
const privateTerms = ['INTERNAL-DEMO-PRIVATE-47', 'Cedar Hall', 'November 21', 'medical accommodation'];
const primary = step => step < 2 ? '#loomFirstCrossingAction' : '#loomFirstCrossingStop';
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.TD613_BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.TD613_BROWSER_EXECUTABLE_PATH } : {}) });
  for (const [posture, viewport, touch] of [
    ['desktop', { width: 1280, height: 900 }, false], ['mobile', { width: 390, height: 844 }, false], ['mobile-touch', { width: 390, height: 844 }, true]
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: posture === 'desktop' ? 'no-preference' : 'reduce', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.runtime_errors.push({ posture, message: error.message }));
    await context.route('**/*', route => {
      const request = route.request();
      if (request.method() === 'GET' && request.url().startsWith(base + '/')) return route.continue();
      report.blocked_requests.push({ posture, method: request.method(), url: request.url() }); return route.abort();
    });
    await page.addInitScript(() => {
      window.__LOOM_ARTIFACT_CLICKS = [];
      document.addEventListener('click', event => window.__LOOM_ARTIFACT_CLICKS.push({ target: event.target.closest?.('button')?.id || event.target.id || event.target.tagName,
        detail: event.detail, pointer_type: event.pointerType, trusted: event.isTrusted,
        step_before: document.querySelector('#loomAiWorkspace')?.dataset.firstCrossingStep, at: performance.now() }), true);
    });
    const stepIs = value => page.waitForFunction(expected => document.querySelector('#loomAiWorkspace').dataset.firstCrossingStep === String(expected), value);
    const press = async selector => { await page.locator(selector).focus(); await page.keyboard.press('Enter'); };
    const summary = '#loomTutorialArtifact > details > summary';
    const details = '#loomTutorialArtifact > details';
    const storage = () => page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, session_receipt: document.querySelector('#aiSessionReceipt').textContent,
      export_disabled: document.querySelector('#aiExportSession').disabled, copy_disabled: document.querySelector('#aiCopySession').disabled }));
    const geometry = () => page.locator('#loomTutorialArtifactRecord').evaluate(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { x: box.x, right: box.right, width: box.width, height: box.height, max_height: style.maxHeight,
        scroll_height: node.scrollHeight, scroll_top: node.scrollTop, client_height: node.clientHeight,
        overflow_y: style.overflowY, white_space: style.whiteSpace, tab_index: node.tabIndex, label: node.getAttribute('aria-label'),
        viewport_width: innerWidth, document_width: document.documentElement.scrollWidth, document_height: document.documentElement.scrollHeight,
        focus_id: document.activeElement.id };
    });
    const photo = async name => { const file = join(dir, `${posture}-${name}.png`); await page.screenshot({ path: file, fullPage: true }); report.screenshots.push({ posture, name, path: file }); };
    const inspectPacket = async suffix => {
      const raw = await page.locator('#loomTutorialArtifactRecord').textContent(), parsed = JSON.parse(raw), replay = independentAssurance(raw);
      const file = join(dir, `${posture}-${suffix}.json`); await writeFile(file, raw + '\n');
      check(`${posture}: ${suffix} carries complete independently replayable canonical packet`, parsed.schema === 'td613.loom.portable-task/v0.1' && replay.assurance.outcome === 'ADMITTED' && replay.rebuilt_equal && replay.text_equal, replay);
      check(`${posture}: ${suffix} preserves private planning exclusion`, privateTerms.every(term => !raw.includes(term)), { private_terms_excluded: privateTerms.length, selected_documents: parsed.documents?.map(document => document.id), withheld: parsed.governance?.withheld_document_count });
      if (baseline) return { raw, parsed, replay };
      const core = parsed.portable_governance;
      check(`${posture}: ${suffix} binds selected input and complete governance`, core?.selected_input_digest === parsed.governance.input_digest && core?.mechanisms?.length === 32 && Object.keys(core?.flow_core?.legend?.entries || {}).length === 8 && core?.authority?.live_custody_capability === false && core?.authority?.empirical_credit === 0, { core_ref: core?.ref, input_digest: parsed.governance.input_digest, mechanisms: core?.mechanisms?.length, legend_entries: Object.keys(core?.flow_core?.legend?.entries || {}).length, authority: core?.authority });
      check(`${posture}: ${suffix} rejects selected-body and legend tampering`, replay.selected_tamper === 'HELD' && replay.legend_tamper === 'HELD', replay);
      const requestIds = [...new Set(core.observation_basis.map(event => event.request_id).filter(Boolean))];
      check(`${posture}: ${suffix} carries one explicit tutorial binding identity`, requestIds.length === 1 && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(requestIds[0]), { request_ids: requestIds });
      return { raw, parsed, replay, requestId: requestIds[0] };
    };
    try {
      const response = await page.goto(base + '/dome-world/holonomy-loom.html'); assert.equal(response.status(), 200);
      await page.waitForSelector('html[data-loom-boot="ready"]'); await stepIs(0);
      const initialStorage = await storage();
      for (let step = 0; step < 3; step++) { await press(primary(step)); await stepIs(step + 1); }
      check(`${posture}: artifact disclosure starts collapsed`, await page.locator(details).evaluate(node => !node.open), { step: 3 });
      await photo('artifact-collapsed');
      const first = await inspectPacket('artifact-initial');
      if (baseline) continue;
      const collapsed = await geometry();
      await press(summary);
      assert.equal(await page.locator(details).evaluate(node => node.open), true);
      await page.keyboard.press('Tab');
      const opened = await geometry();
      check(`${posture}: inspector receives keyboard focus in a bounded scroll region`, opened.focus_id === 'loomTutorialArtifactRecord' && opened.tab_index === 0 && /complete.*artifact/i.test(opened.label || '') && opened.height > 0 && opened.height <= 261 && opened.scroll_height > opened.client_height && ['auto', 'scroll'].includes(opened.overflow_y), opened);
      // Chromium animates native keyboard scrolling. Observe completion of the
      // first real scroll before issuing End, so overlapping browser animations
      // cannot make this witness race its own prior PageDown input.
      await page.locator('#loomTutorialArtifactRecord').evaluate(node => {
        window.__LOOM_ARTIFACT_SCROLL_TRACE = [];
        for (const type of ['scroll', 'scrollend', 'keydown', 'keyup']) node.addEventListener(type, event => {
          window.__LOOM_ARTIFACT_SCROLL_TRACE.push({ type, key: event.key, at: performance.now(),
            top: node.scrollTop, height: node.clientHeight, total: node.scrollHeight, focus_id: document.activeElement.id });
        }, { passive: true });
      });
      await page.keyboard.press('PageDown');
      await page.waitForFunction(() => document.querySelector('#loomTutorialArtifactRecord').scrollTop > 0 &&
        window.__LOOM_ARTIFACT_SCROLL_TRACE.some(event => event.type === 'scrollend' && event.top > 0));
      await page.keyboard.press('End');
      await page.waitForFunction(() => { const node = document.querySelector('#loomTutorialArtifactRecord'); return node.scrollTop + node.clientHeight >= node.scrollHeight - 2; });
      const end = await geometry();
      report.keyboard_scroll_observations ??= [];
      report.keyboard_scroll_observations.push({ posture, geometry: end, trace: await page.evaluate(() => window.__LOOM_ARTIFACT_SCROLL_TRACE) });
      check(`${posture}: all JSON remains reachable without horizontal page overflow`, end.document_width <= viewport.width + 1 && end.x >= -1 && end.right <= viewport.width + 1 && end.document_height <= collapsed.document_height + 360 && end.scroll_top + end.client_height >= end.scroll_height - 2, end);
      await photo('artifact-keyboard-end');
      await page.keyboard.press('Tab');
      check(`${posture}: Tab exits the artifact scroll region`, (await geometry()).focus_id !== 'loomTutorialArtifactRecord', { focus_id: (await geometry()).focus_id });
      await press(summary); assert.equal(await page.locator(details).evaluate(node => node.open), false);
      check(`${posture}: disclosure inspection creates no session or custody state`, JSON.stringify(await storage()) === JSON.stringify(initialStorage), await storage());

      // Back to the already bound request retains that exact artifact. F02's
      // native multi-click guard remains active when returning to this scene.
      await press('#loomFirstCrossingBack'); await stepIs(2);
      const box = await page.locator('#loomFirstCrossingStop').boundingBox();
      await page.evaluate(() => { window.__LOOM_ARTIFACT_CLICKS = []; });
      if (touch) { await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
      else await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2, { delay: 65 });
      await page.waitForTimeout(120);
      const afterDouble = await page.locator('#loomAiWorkspace').getAttribute('data-first-crossing-step');
      check(`${posture}: returning to artifact retains F02 one-gesture progression`, afterDouble === '3' && !(await page.locator('#loomTools').evaluate(node => node.open)), { step: afterDouble, clicks: await page.evaluate(() => window.__LOOM_ARTIFACT_CLICKS) });
      check(`${posture}: Back and return retain exact bound artifact and collapsed disclosure`, await page.locator('#loomTutorialArtifactRecord').textContent() === first.raw && await page.locator(details).evaluate(node => !node.open), { retained_sha256: first.replay.sha256 });

      await press('#loomFirstCrossingBack'); await stepIs(2);
      await press('#loomFirstCrossingBack'); await stepIs(1);
      await press('#loomFirstCrossingAction'); await stepIs(2);
      await press('#loomFirstCrossingStop'); await stepIs(3);
      const second = await inspectPacket('artifact-rechecked');
      check(`${posture}: recheck produces fresh identity over the same selected input`, second.requestId !== first.requestId && second.parsed.governance.input_digest === first.parsed.governance.input_digest && second.parsed.portable_governance.ref !== first.parsed.portable_governance.ref, { old_request_id: first.requestId, new_request_id: second.requestId, input_digest: second.parsed.governance.input_digest, old_core_ref: first.parsed.portable_governance.ref, new_core_ref: second.parsed.portable_governance.ref });
      check(`${posture}: recheck retains collapsed disclosure and unprepared real session`, await page.locator(details).evaluate(node => !node.open) && JSON.stringify(await storage()) === JSON.stringify(initialStorage), await storage());
      await photo('artifact-rechecked-collapsed');
      await press('#loomFirstCrossingLeave'); await page.locator('#aiTask').waitFor({ state: 'visible' });
      check(`${posture}: keyboard exit retains ordinary unprepared workspace`, (await storage()).export_disabled && (await storage()).session_receipt === '', await storage());
    } catch (error) {
      report.failure_geometry = { posture, geometry: await geometry(),
        scroll_trace: await page.evaluate(() => window.__LOOM_ARTIFACT_SCROLL_TRACE || []) };
      await photo('artifact-failure');
      throw error;
    } finally { await context.close(); }
  }
  check('provider and other non-GET requests remain absent', report.blocked_requests.length === 0, report.blocked_requests);
  check('runtime errors remain absent', report.runtime_errors.length === 0, report.runtime_errors);
  report.status = report.failures.length ? 'FAIL' : 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = error.stack || error.message; }
finally {
  await browser?.close(); if (server) await new Promise(done => server.close(done));
  await writeFile(join(dir, 'tutorial-artifact-witness.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, source_head: report.source_head, check_count: report.checks.length, failures: report.failures.map(value => value.name), failure: report.failure, report: join(dir, 'tutorial-artifact-witness.json') }));
if (report.status !== 'PASS' && !baseline) process.exitCode = 1;
