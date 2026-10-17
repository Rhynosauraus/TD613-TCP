/** Real Chromium F02 witness for the seven-scene tutorial's gesture boundary.
 * Native pointer/keyboard traces are kept separate from explicitly synthetic
 * retarget controls. Delayed digest controls delegate to the real calculation.
 * This witness makes no provider requests or physical-device/comprehension claim.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const digest = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const baseline = process.env.TD613_GESTURE_BASELINE === '1';
const sourceBytes = async file => baseline ? execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }) : readFile(file);
const artifactDir = resolve(process.env.TD613_ARTIFACT_DIR || 'artifacts/loom-tutorial-gesture');
await mkdir(artifactDir, { recursive: true });
const report = {
  schema: 'td613.loom.tutorial-gesture-browser-witness/v0.1', status: 'HELD',
  source_head: process.env.TD613_SOURCE_HEAD || git('rev-parse', 'HEAD'), checkout_head: git('rev-parse', 'HEAD'),
  working_tree_dirty: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  baseline_source: baseline ? 'GIT_HEAD_COMMITTED_APPLICATION_BYTES' : null,
  harness_sha256: digest(await readFile(new URL(import.meta.url))),
  observed_at: new Date().toISOString(), browser: 'Chromium',
  physical_device_observed: false, human_comprehension_measured: false, provider_calls: 0,
  source_hashes: {}, served_source_hashes: {}, blocked_requests: [], runtime_errors: [],
  checks: [], scenarios: [], screenshots: [], failures: []
};
for (const file of ['app/dome-world/holonomy-loom.html', 'app/dome-world/holonomy-loom/ai-workspace.js', 'app/dome-world/holonomy-loom/workspace-template.js', 'app/dome-world/holonomy-loom/tutorial-copy.js']) {
  report.source_hashes[file] = digest(await sourceBytes(file));
}
const check = (name, passed, evidence) => {
  const result = { name, status: passed ? 'PASS' : 'FAIL', evidence };
  report.checks.push(result);
  if (!passed) report.failures.push(result);
};
let server, base = process.env.TD613_BASE_URL;
if (!base) {
  const appRoot = resolve('app'), sourceCache = new Map();
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(appRoot, '.' + pathname);
      if (request.method !== 'GET' || !file.startsWith(appRoot + sep)) throw Error('Static witness only admits application GETs');
      const sourcePath = `app${pathname}`;
      if (!sourceCache.has(sourcePath)) sourceCache.set(sourcePath, await sourceBytes(sourcePath));
      const bytes = sourceCache.get(sourcePath);
      report.served_source_hashes[`app${pathname}`] = digest(bytes);
      response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' })[extname(file)] || 'application/octet-stream');
      response.end(bytes);
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/, '');
report.base_url = base;
report.context = ['localhost', '127.0.0.1'].includes(new URL(base).hostname) ? 'LOCAL_CHROMIUM_ACTUAL_UI' : 'PRODUCTION_CHROMIUM_ACTUAL_UI';
const primary = step => step < 2 ? '#loomFirstCrossingAction' : '#loomFirstCrossingStop';
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.TD613_BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.TD613_BROWSER_EXECUTABLE_PATH } : {}) });
  for (const [posture, viewport, reducedMotion, touchInput] of [
    ['desktop', { width: 1280, height: 900 }, 'no-preference', false],
    ['mobile', { width: 390, height: 844 }, 'reduce', false],
    ['mobile-touch', { width: 390, height: 844 }, 'reduce', true]
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion, ...(touchInput ? { hasTouch: true, isMobile: true } : {}) });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.runtime_errors.push({ posture, message: error.message }));
    await context.route('**/*', route => {
      const request = route.request();
      if (request.method() === 'GET' && request.url().startsWith(base + '/')) return route.continue();
      report.blocked_requests.push({ posture, method: request.method(), url: request.url() });
      return route.abort();
    });
    await page.addInitScript(() => {
      window.__LOOM_GESTURE_TRACE = [];
      window.__LOOM_DELAY_DIGEST = false;
      window.__LOOM_DELAYED_DIGESTS = [];
      const actualDigest = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = async (...args) => {
        const result = await actualDigest(...args);
        if (window.__LOOM_DELAY_DIGEST) await new Promise(done => window.__LOOM_DELAYED_DIGESTS.push(done));
        return result;
      };
      const scene = () => document.querySelector('#loomAiWorkspace')?.dataset.firstCrossingStep;
      for (const type of ['pointerdown', 'click', 'dblclick', 'keydown', 'keyup']) document.addEventListener(type, event => {
        window.__LOOM_GESTURE_TRACE.push({ type, target: event.target.closest?.('button')?.id || event.target.id || event.target.tagName,
          detail: event.detail, key: event.key, repeat: event.repeat, trusted: event.isTrusted,
          x: event.clientX, y: event.clientY, pointer_type: event.pointerType, step_before: scene(), at: performance.now() });
      }, true);
      new MutationObserver(() => {
        const step = scene();
        if (step !== undefined && step !== window.__LOOM_LAST_WITNESS_STEP) {
          window.__LOOM_LAST_WITNESS_STEP = step;
          window.__LOOM_GESTURE_TRACE.push({ type: 'observed_scene', step, at: performance.now() });
        }
      }).observe(document, { subtree: true, attributes: true, childList: true });
    });
    const snapshot = () => page.evaluate(() => {
      const root = document.querySelector('#loomAiWorkspace');
      const stage = document.querySelector('#loomFirstCrossing');
      return { step: root.dataset.firstCrossingStep, active: root.dataset.firstCrossing,
        progress: document.querySelector('#loomTutorialProgress').textContent,
        heading: document.querySelector('#loomFirstCrossingTitle').textContent,
        stage_visible: !!stage.getClientRects().length,
        tools_open: document.querySelector('#loomTools').open,
        builder_visible: !!document.querySelector('#aiTask').getClientRects().length,
        focus_id: document.activeElement.id, choreography: root.dataset.flowcoreChoreography || null,
        glyph_carriers: document.querySelectorAll('.loom-field-flight text').length,
        viewport_width: innerWidth, document_width: document.documentElement.scrollWidth };
    });
    const nativeDouble = async (x, y) => {
      if (touchInput) { await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y); }
      else await page.mouse.dblclick(x, y, { delay: 65 });
    };
    const trace = () => page.evaluate(() => window.__LOOM_GESTURE_TRACE);
    const clearTrace = () => page.evaluate(() => { window.__LOOM_GESTURE_TRACE = []; });
    const stepIs = value => page.waitForFunction(expected => document.querySelector('#loomAiWorkspace').dataset.firstCrossingStep === String(expected), value);
    const open = async () => {
      const response = await page.goto(base + '/dome-world/holonomy-loom.html');
      assert.equal(response.status(), 200);
      await page.waitForSelector('html[data-loom-boot="ready"]');
      await stepIs(0);
    };
    const press = async selector => { await page.locator(selector).focus(); await page.keyboard.press('Enter'); };
    const reach = async target => {
      await open();
      for (let step = 0; step < target; step++) { await press(primary(step)); await stepIs(step + 1); }
      await clearTrace();
    };
    const photo = async name => {
      const file = join(artifactDir, `${posture}-${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      report.screenshots.push({ posture, name, path: file });
    };
    const recordScenario = async (name, evidenceClass, before, extra = {}) => {
      const result = { posture, name, evidence_class: evidenceClass, before, after: await snapshot(), trace: await trace(), ...extra };
      report.scenarios.push(result);
      return result;
    };
    try {
      // Every native primary control is exercised at the exact old coordinates.
      // A second native click may hit a different newly revealed control.
      for (let step = 0; step < 6; step++) {
        await reach(step);
        await page.locator(primary(step)).scrollIntoViewIfNeeded();
        const box = await page.locator(primary(step)).boundingBox(), before = await snapshot();
        if (step === 0) await photo('opening');
        await nativeDouble(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(180);
        const result = await recordScenario(`primary-${step}-native-double-${touchInput ? 'tap' : 'click'}`, touchInput ? 'ACTUAL_CHROMIUM_TOUCHSCREEN_INPUT' : 'ACTUAL_CHROMIUM_NATIVE_POINTER_INPUT', before);
        check(`${posture}: native double-click from scene ${step + 1} advances once`, result.after.step === String(step + 1) && result.after.stage_visible && !result.after.tools_open && result.after.choreography === before.choreography, result);
        check(`${posture}: scene ${step + 2} retains 39 carriers and fits viewport`, result.after.glyph_carriers === 39 && result.after.document_width <= viewport.width + 1, result.after);
        if (step === 4) await photo('return-after-double-click');
        if (step === 5) await photo('rest-after-double-click');
      }

      if (baseline) continue;
      if (touchInput) {
        // The tap series above uses Chromium's actual touch click-counting.
        // Fresh keyboard gestures remain immediately available after that series.
        await reach(2);
        await press('#loomFirstCrossingStop'); await stepIs(3);
        await press('#loomFirstCrossingStop'); await stepIs(4);
        check(`${posture}: fresh keyboard gestures remain immediate after touch input`, (await snapshot()).step === '4', await snapshot());
        continue;
      }

      // A new pointer series and fresh key presses can advance immediately.
      await reach(2);
      const freshBefore = await snapshot();
      const freshTimes = [];
      for (const expected of [3, 4, 5, 6]) {
        const start = await page.evaluate(() => performance.now());
        await page.locator('#loomFirstCrossingStop').click();
        await stepIs(expected);
        freshTimes.push({ step: expected, elapsed_ms: await page.evaluate(start => performance.now() - start, start) });
      }
      const fresh = await recordScenario('fresh-pointer-series', 'ACTUAL_CHROMIUM_NATIVE_POINTER_INPUT', freshBefore, { action_timings: freshTimes });
      check(`${posture}: fresh pointer gestures retain immediate progression`, fresh.after.step === '6' && !fresh.after.tools_open, fresh);

      // Supplemental hostile retarget inputs are explicitly distinct from the
      // native double-clicks above; these MouseEvents have isTrusted=false.
      await reach(5);
      await page.locator('#loomFirstCrossingStop').click(); await stepIs(6);
      const retargetBefore = await snapshot();
      await clearTrace();
      await page.evaluate(() => {
        for (const id of ['loomTutorialResearchOpen', 'loomFirstCrossingPause', 'loomBegin']) {
          document.getElementById(id).dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
        }
      });
      const retarget = await recordScenario('new-scene-retarget-hostile-controls', 'SYNTHETIC_UNTRUSTED_CLICK_SUPPLEMENT', retargetBefore);
      check(`${posture}: trailing multi-click cannot open Research, remix, or enter builder`, retarget.after.step === '6' && retarget.after.stage_visible && !retarget.after.tools_open && retarget.after.choreography === retargetBefore.choreography, retarget);
      await page.locator('#loomTutorialResearchOpen').click();
      check(`${posture}: fresh Research gesture opens its real instrument`, await page.locator('#loomTools').evaluate(node => node.open), { step: (await snapshot()).step });
      await page.locator('#loomToolsClose').click();
      await page.locator('#loomBegin').focus(); await page.keyboard.press('Enter');
      await page.locator('#aiTask').waitFor({ state: 'visible' });
      check(`${posture}: fresh keyboard Begin reaches workspace`, (await snapshot()).builder_visible, await snapshot());

      await reach(2);
      const heldBefore = await snapshot();
      await page.locator('#loomFirstCrossingStop').focus();
      await page.keyboard.down('Enter'); await stepIs(3);
      await page.locator('#loomFirstCrossingStop').focus();
      for (let repeat = 0; repeat < 5; repeat++) await page.keyboard.down('Enter');
      await page.keyboard.up('Enter');
      const held = await recordScenario('held-enter', 'ACTUAL_CHROMIUM_NATIVE_KEYBOARD_INPUT', heldBefore);
      check(`${posture}: held Enter retains one progression`, held.after.step === '3' && held.trace.filter(item => item.type === 'keydown' && item.repeat).length === 5, held);
      await press('#loomFirstCrossingStop'); await stepIs(4);
      await page.locator('#loomFirstCrossingStop').focus();
      await page.keyboard.down('Space');
      for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.down('Space');
      await page.keyboard.up('Space'); await stepIs(5);
      check(`${posture}: fresh Enter and released Space remain available`, (await snapshot()).step === '5', await snapshot());

      await reach(4);
      const backBefore = await snapshot(), backBox = await page.locator('#loomFirstCrossingBack').boundingBox();
      await page.mouse.dblclick(backBox.x + backBox.width / 2, backBox.y + backBox.height / 2, { delay: 65 });
      const back = await recordScenario('back-native-double-click', 'ACTUAL_CHROMIUM_NATIVE_POINTER_INPUT', backBefore);
      check(`${posture}: Back double-click returns one scene`, back.after.step === '3', back);
      await press('#loomFirstCrossingPause');
      check(`${posture}: fresh keyboard Remix retains current scene`, (await snapshot()).step === '3', await snapshot());

      for (const leave of ['back', 'exit']) {
        await reach(1);
        await page.evaluate(() => { window.__LOOM_DELAY_DIGEST = true; });
        await press('#loomFirstCrossingAction');
        await page.waitForFunction(() => window.__LOOM_DELAYED_DIGESTS.length > 0);
        const delayedBefore = await snapshot();
        await press(leave === 'back' ? '#loomFirstCrossingBack' : '#loomFirstCrossingLeave');
        await page.evaluate(() => { window.__LOOM_DELAY_DIGEST = false; for (const release of window.__LOOM_DELAYED_DIGESTS.splice(0)) release(); });
        await page.waitForTimeout(100);
        const delayed = await recordScenario(`delayed-binding-${leave}`, 'REAL_DIGEST_DELAYED_DELIVERY_NEGATIVE_CONTROL', delayedBefore);
        check(`${posture}: ${leave} suppresses delayed stale binding`, leave === 'back' ? delayed.after.step === '0' && delayed.after.stage_visible : delayed.after.builder_visible && !delayed.after.stage_visible, delayed);
      }
      await page.reload(); await page.waitForSelector('html[data-loom-boot="ready"]'); await stepIs(0);
      await press('#loomFirstCrossingLeave'); await page.locator('#aiTask').waitFor({ state: 'visible' });
      check(`${posture}: reload and direct keyboard skip remain available`, (await snapshot()).builder_visible, await snapshot());
    } finally { await context.close(); }
  }
  check('provider and other non-GET requests remain absent', report.blocked_requests.length === 0, report.blocked_requests);
  check('runtime errors remain absent', report.runtime_errors.length === 0, report.runtime_errors);
  report.status = report.failures.length ? 'FAIL' : 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack || error.message;
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
  await writeFile(join(artifactDir, 'tutorial-gesture-witness.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, source_head: report.source_head, check_count: report.checks.length, failures: report.failures.map(item => item.name), failure: report.failure, report: join(artifactDir, 'tutorial-gesture-witness.json') }));
if (report.status !== 'PASS' && process.env.TD613_GESTURE_BASELINE !== '1') process.exitCode = 1;
