#!/usr/bin/env node

/**
 * @fileoverview Real Chromium Headless Verification for TD613 Caro Artifacts (A67-C3).
 * Launches Google Chrome directly, connects via Chrome DevTools Protocol (CDP),
 * exercises keyboard navigation and reduced-motion emulation, enforces explicit
 * pass/fail assertions for viewports, touch targets, state transitions, and
 * causal falsification probes, and emits a retrievable verification receipt.
 */

import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

function findChromePath() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : null,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('Chrome executable not found. Please set CHROME_BIN environment variable.');
}

function getGitRevision() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN_REVISION';
  }
}

const PORT = 9222;

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.callbacks = new Map();
    this.events = new Map();
    this.ws = null;
  }

  async connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = (err) => rej(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        } else if (data.method && this.events.has(data.method)) {
          this.events.get(data.method)(data.params);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    this.events.set(method, handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function pressKey(client, key, code, keyCode) {
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode
  });
}

async function runBrowserTest() {
  const chromePath = findChromePath();
  const gitRevision = getGitRevision();

  console.log('======================================================================');
  console.log('  𝌋 TD613 REAL CHROMIUM BROWSER VERIFICATION (ARTIFACT 67-R1 / A67-C3)');
  console.log('======================================================================');
  console.log(`Chrome Executable: ${chromePath}`);
  console.log(`Git Revision:      ${gitRevision}`);

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars'
  ]);

  let versionData = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      versionData = await res.json();
      break;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!versionData) {
    chromeProc.kill();
    throw new Error('Failed to connect to headless Chrome via CDP');
  }

  console.log(`Browser Engine:    ${versionData.Browser}`);
  console.log(`User Agent:        ${versionData['User-Agent']}`);
  console.log(`CDP Protocol:      ${versionData['Protocol-Version']}\n`);

  let totalAssertions = 0;
  function verifiedAssert(cond, msg) {
    assert.ok(cond, msg);
    totalAssertions++;
  }

  const receipt = {
    schema: 'td613.dollhouse-design.browser-verification-receipt/v0.1',
    timestamp: new Date().toISOString(),
    browser_engine: versionData.Browser,
    user_agent: versionData['User-Agent'],
    cdp_protocol: versionData['Protocol-Version'],
    source_revision: gitRevision,
    total_assertions_checked: 0,
    disposition: 'PENDING',
    primary_artifact: null,
    refractive_artifact: null
  };

  try {
    // =============================================================
    // TEST 1: Caro Primary Artifact (The Corridors of Erasure)
    // =============================================================
    console.log('--- TEST 1: Caro Primary Artifact (The Corridors of Erasure) ---');
    const primaryPath = resolve(process.cwd(), 'tests/fixtures/dollhouse/caro_corridor_primary.html');
    const primaryUrl = pathToFileURL(primaryPath).href;

    const pageRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const target = await pageRes.json();
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();

    const exceptions1 = [];
    client.on('Runtime.exceptionThrown', (p) => {
      exceptions1.push(p.exceptionDetails.text || 'Exception');
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // 1. Emulate Mobile 390px Viewport (iPhone 12/13/14)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    await client.send('Page.navigate', { url: primaryUrl });
    await new Promise(r => setTimeout(r, 600));

    // 2. Viewport Fit Assertion (Overflow <= 0px)
    const evalViewport = await client.send('Runtime.evaluate', {
      expression: `({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - window.innerWidth
      })`,
      returnByValue: true
    });
    const vp = evalViewport.result.value;
    console.log(`  • 390px Viewport: innerWidth=${vp.innerWidth}px, scrollWidth=${vp.scrollWidth}px (Overflow: ${vp.overflowPx}px)`);
    verifiedAssert(vp.overflowPx <= 0, `Primary artifact 390px viewport overflow must be <= 0px, got ${vp.overflowPx}px`);

    // 3. Touch Target Minimum Height Assertion (>= 44px)
    const evalButtons = await client.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('button')).map(b => {
        const rect = b.getBoundingClientRect();
        return {
          id: b.id || b.textContent.trim().slice(0, 15),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minHeightPassed: rect.height >= 44
        };
      })`,
      returnByValue: true
    });
    const buttons1 = evalButtons.result.value;
    console.log(`  • Touch Target Measurements (${buttons1.length} buttons):`);
    for (const b of buttons1) {
      console.log(`    - [${b.id.padEnd(16)}] ${b.width}x${b.height}px (>=44px: ${b.minHeightPassed ? 'PASS' : 'FAIL'})`);
      verifiedAssert(b.minHeightPassed, `Primary button [${b.id}] height ${b.height}px < 44px touch target minimum`);
    }

    // 4. Initial State Assertions (Chamber I)
    const evalState1 = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const s1 = evalState1.result.value;
    console.log(`  • Chamber I: Chamber ${s1.currentChamber}, Friction μ=${s1.frictionMu}, Redacted=${s1.redactedWordCount}/16 words, Door=${s1.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
    verifiedAssert(s1.currentChamber === 1, 'Initial chamber must be 1');
    verifiedAssert(s1.frictionMu === 0.20, 'Initial friction mu must be 0.20');
    verifiedAssert(s1.redactedWordCount === 4, 'Chamber 1 must redact 4 words');
    verifiedAssert(s1.isDoorUnlocked === false, 'Door must be locked in Chamber 1');

    // 5. Terminal State Assertions (Chamber IV)
    await client.send('Runtime.evaluate', { expression: `window.testAPI.setChamberInstant(4)` });
    await new Promise(r => setTimeout(r, 100));

    const evalState4 = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const s4 = evalState4.result.value;
    console.log(`  • Chamber IV: Chamber ${s4.currentChamber}, Friction μ=${s4.frictionMu}, Redacted=${s4.redactedWordCount}/16 words, Door=${s4.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
    verifiedAssert(s4.currentChamber === 4, 'Terminal chamber must be 4');
    verifiedAssert(s4.frictionMu === 1.50, 'Chamber 4 friction mu must be 1.50');
    verifiedAssert(s4.redactedWordCount === 16, 'Chamber 4 must have all 16 words redacted');
    verifiedAssert(s4.isDoorUnlocked === true, 'Door must unlock in Chamber 4 when petition is expurgated');

    // 6. Causal Falsification Probe Assertions (Invert Authority Force λ = 0, μ = 0)
    await client.send('Runtime.evaluate', { expression: `window.testAPI.toggleFalsification()` });
    const evalStateFalsified = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const sFalsified = evalStateFalsified.result.value;
    console.log(`  • Falsified Probe: Friction μ=${sFalsified.frictionMu}, Redacted=${sFalsified.redactedWordCount}/16 words, Door=${sFalsified.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
    verifiedAssert(sFalsified.forceZeroRedaction === true, 'Falsification probe must be active');
    verifiedAssert(sFalsified.frictionMu === 0, 'Falsification must force friction mu = 0');
    verifiedAssert(sFalsified.redactedWordCount === 0, 'Falsification must restore all words (0 redacted)');
    verifiedAssert(sFalsified.isDoorUnlocked === false, 'Door must immediately relock when words are restored');

    // 7. Operative Friction Clearance Latency Assertions
    await client.send('Runtime.evaluate', { expression: `window.testAPI.resetCorridor()` });
    // Transition to Chamber II (mu = 0.50) triggers clearance latency T = mu * 400ms = 200ms
    await client.send('Runtime.evaluate', { expression: `window.testAPI.setChamber(2)` });
    const evalClearing = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const sClearing = evalClearing.result.value;
    console.log(`  • Operative Friction: isClearing=${sClearing.isClearing}, Latency=${sClearing.lastClearanceDurationMs}ms`);
    verifiedAssert(sClearing.isClearing === true, 'Navigation must be locked during procedural clearance latency');
    verifiedAssert(sClearing.lastClearanceDurationMs === 200, 'Chamber 2 clearance latency must equal 200ms (0.50 * 400ms)');
    // Wait for clearance to settle
    await new Promise(r => setTimeout(r, 260));
    const evalAfterClear = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    verifiedAssert(evalAfterClear.result.value.isClearing === false, 'Clearance lock must release after latency timer expires');
    verifiedAssert(evalAfterClear.result.value.currentChamber === 2, 'Corridor must arrive at Chamber 2');

    // 8. Real CDP Keyboard Navigation (Input.dispatchKeyEvent)
    console.log('  • Keyboard Navigation (CDP Input.dispatchKeyEvent):');
    // Test direct keyboard shortcut (ArrowRight)
    await pressKey(client, 'ArrowRight', 'ArrowRight', 39);
    // Wait for Chamber 3 clearance latency (0.90 * 400ms = 360ms) + buffer
    await new Promise(r => setTimeout(r, 450));
    const evalStateKey = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    console.log(`    - Advanced to Chamber ${evalStateKey.result.value.currentChamber} via keyboard ArrowRight`);
    verifiedAssert(evalStateKey.result.value.currentChamber === 3, 'Keyboard ArrowRight must advance to Chamber 3');

    // 9. Reduced-Motion Emulation Verification (Emulation.setEmulatedMedia)
    console.log('  • Reduced-Motion Policy Emulation:');
    await client.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    // With prefers-reduced-motion active, setChamber must bypass clearance latency lock (duration = 0ms)
    await client.send('Runtime.evaluate', { expression: `window.testAPI.setChamber(4)` });
    const evalReduced = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const sReduced = evalReduced.result.value;
    console.log(`    - Reduced Motion: isClearing=${sReduced.isClearing}, Latency=${sReduced.lastClearanceDurationMs}ms, Chamber=${sReduced.currentChamber}`);
    verifiedAssert(sReduced.isClearing === false, 'Reduced motion must bypass clearance latency lock');
    verifiedAssert(sReduced.lastClearanceDurationMs === 0, 'Reduced motion clearance latency must be 0ms');
    verifiedAssert(sReduced.currentChamber === 4, 'Reduced motion must transition chamber instantaneously');

    // Reset emulated media
    await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] });

    // 10. Runtime Exceptions Check
    verifiedAssert(exceptions1.length === 0, `Primary artifact produced ${exceptions1.length} runtime exceptions`);

    receipt.primary_artifact = {
      viewport_390px: vp,
      touch_targets: buttons1,
      initial_state: s1,
      terminal_state: s4,
      falsified_state: sFalsified,
      operative_friction: sClearing,
      keyboard_navigation_verified: true,
      reduced_motion_bypassed_latency: true,
      exceptions_count: exceptions1.length
    };

    client.close();

    // =============================================================
    // TEST 2: Caro Refractive Artifact (The Applicant's Margins)
    // =============================================================
    console.log('\n--- TEST 2: Caro Refractive Artifact (The Applicant\'s Margins) ---');
    const refractionPath = resolve(process.cwd(), 'tests/fixtures/dollhouse/caro_corridor_refraction.html');
    const refractionUrl = pathToFileURL(refractionPath).href;

    const pageRes2 = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const target2 = await pageRes2.json();
    const client2 = new CdpClient(target2.webSocketDebuggerUrl);
    await client2.connect();

    const exceptions2 = [];
    client2.on('Runtime.exceptionThrown', (p) => {
      exceptions2.push(p.exceptionDetails.text || 'Exception');
    });

    await client2.send('Page.enable');
    await client2.send('Runtime.enable');

    // 1. Emulate Mobile 390px Viewport
    await client2.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    await client2.send('Page.navigate', { url: refractionUrl });
    await new Promise(r => setTimeout(r, 600));

    // 2. Viewport Fit Assertion (Overflow <= 0px)
    const evalViewport2 = await client2.send('Runtime.evaluate', {
      expression: `({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - window.innerWidth
      })`,
      returnByValue: true
    });
    const vp2 = evalViewport2.result.value;
    console.log(`  • 390px Viewport: innerWidth=${vp2.innerWidth}px, scrollWidth=${vp2.scrollWidth}px (Overflow: ${vp2.overflowPx}px)`);
    verifiedAssert(vp2.overflowPx <= 0, `Refractive artifact 390px viewport overflow must be <= 0px, got ${vp2.overflowPx}px`);

    // 3. Touch Target Minimum Height Assertion (>= 44px)
    const evalButtons2 = await client2.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('button')).map(b => {
        const rect = b.getBoundingClientRect();
        return {
          id: b.id || b.textContent.trim().slice(0, 15),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minHeightPassed: rect.height >= 44
        };
      })`,
      returnByValue: true
    });
    const buttons2 = evalButtons2.result.value;
    console.log(`  • Touch Target Measurements (${buttons2.length} buttons):`);
    for (const b of buttons2) {
      console.log(`    - [${b.id.padEnd(16)}] ${b.width}x${b.height}px (>=44px: ${b.minHeightPassed ? 'PASS' : 'FAIL'})`);
      verifiedAssert(b.minHeightPassed, `Refractive button [${b.id}] height ${b.height}px < 44px touch target minimum`);
    }

    // 4. Initial State Assertions (Station 1)
    const evalRefState1 = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rs1 = evalRefState1.result.value;
    console.log(`  • Station 1: Station ${rs1.currentStation}, Wait=${rs1.accumulatedWaitHrs}h, Marginal Glosses=${rs1.decodedGlossesCount}/4, Memory=${rs1.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);
    verifiedAssert(rs1.currentStation === 1, 'Initial station must be 1');
    verifiedAssert(rs1.accumulatedWaitHrs === 1.0, 'Station 1 wait must be 1.0h');
    verifiedAssert(rs1.decodedGlossesCount === 1, 'Station 1 must have 1 decoded gloss');
    verifiedAssert(rs1.isMemoryActive === true, 'Memory must be active in Station 1');

    // 5. Terminal State Assertions (Station 4)
    await client2.send('Runtime.evaluate', { expression: `window.testAPI.setRoom(4)` });
    const evalRefState4 = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rs4 = evalRefState4.result.value;
    console.log(`  • Station 4: Station ${rs4.currentStation}, Wait=${rs4.accumulatedWaitHrs}h, Marginal Glosses=${rs4.decodedGlossesCount}/4, Memory=${rs4.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);
    verifiedAssert(rs4.currentStation === 4, 'Terminal station must be 4');
    verifiedAssert(rs4.accumulatedWaitHrs === 48.0, 'Station 4 wait must be 48.0h');
    verifiedAssert(rs4.decodedGlossesCount === 4, 'Station 4 must have 4 decoded glosses');

    // 6. Causal Falsification Probe Assertions (Sovereign Silence Suppression)
    await client2.send('Runtime.evaluate', { expression: `window.testAPI.toggleFalsification()` });
    const evalRefFalsified = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rsFalsified = evalRefFalsified.result.value;
    console.log(`  • Falsified Probe: Sovereign Silence=${rsFalsified.forceSovereignSilence}, Glosses=${rsFalsified.decodedGlossesCount}/4, Memory=${rsFalsified.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);
    verifiedAssert(rsFalsified.forceSovereignSilence === true, 'Falsification probe must impose sovereign silence');
    verifiedAssert(rsFalsified.decodedGlossesCount === 0, 'Sovereign silence must suppress all marginal glosses (0 decoded)');
    verifiedAssert(rsFalsified.isMemoryActive === false, 'Sovereign silence must deactivate memory');

    // 7. Real CDP Keyboard Navigation on Refractive Artifact
    console.log('  • Keyboard Navigation (CDP Input.dispatchKeyEvent):');
    await client2.send('Runtime.evaluate', { expression: `window.testAPI.resetRefraction()` });
    await pressKey(client2, 'ArrowRight', 'ArrowRight', 39);
    const evalRefStateKey = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    console.log(`    - Advanced to Station ${evalRefStateKey.result.value.currentStation} via keyboard ArrowRight`);
    verifiedAssert(evalRefStateKey.result.value.currentStation === 2, 'Keyboard ArrowRight must advance to Station 2');

    // 8. Runtime Exceptions Check
    verifiedAssert(exceptions2.length === 0, `Refractive artifact produced ${exceptions2.length} runtime exceptions`);

    receipt.refractive_artifact = {
      viewport_390px: vp2,
      touch_targets: buttons2,
      initial_state: rs1,
      terminal_state: rs4,
      falsified_state: rsFalsified,
      keyboard_navigation_verified: true,
      exceptions_count: exceptions2.length
    };

    client2.close();

    receipt.total_assertions_checked = totalAssertions;
    receipt.disposition = 'VERIFIED_PASS';

    // 9. Write Retrievable Verification Receipt
    const receiptPath = resolve(process.cwd(), 'tests/fixtures/dollhouse/caro_browser_verification_receipt.json');
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
    console.log(`\nVerification receipt written to: tests/fixtures/dollhouse/caro_browser_verification_receipt.json`);
    console.log(`Total Assertions Enforced & Passed: ${totalAssertions}`);
  } finally {
    chromeProc.kill();
  }

  console.log('\n======================================================================');
  console.log('  CHROMIUM VERIFICATION SUMMARY: ALL TESTED CONDITIONS PASS');
  console.log('======================================================================\n');
  return receipt;
}

runBrowserTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Chromium verification failed assertion:', err);
    process.exit(1);
  });
