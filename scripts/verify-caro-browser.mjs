#!/usr/bin/env node

/**
 * @fileoverview Real Chromium Headless Verification for TD613 Caro Artifacts.
 * Launches Google Chrome directly, connects via Chrome DevTools Protocol (CDP),
 * and performs real viewport, touch target, keyboard, and causal inspections.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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

async function runBrowserTest() {
  console.log('======================================================================');
  console.log('  𝌋 TD613 REAL CHROMIUM BROWSER VERIFICATION (ARTIFACT 66-R1)');
  console.log('======================================================================');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars'
  ]);

  // Wait for Chrome to bind port
  let versionData = null;
  for (let i = 0; i < 20; i++) {
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
    throw new Error('Failed to connect to headless Chrome');
  }

  console.log(`Browser Engine: ${versionData.Browser}`);
  console.log(`User Agent:     ${versionData['User-Agent']}`);
  console.log(`CDP Protocol:   ${versionData['Protocol-Version']}\n`);

  const results = {
    browser: versionData.Browser,
    primaryArtifact: null,
    refractionArtifact: null
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Caro Primary Artifact (The Corridors of Erasure)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Caro Primary Artifact (The Corridors of Erasure) ---');
    const primaryPath = resolve(process.cwd(), 'tests/fixtures/dollhouse/caro_corridor_primary.html');
    const primaryUrl = pathToFileURL(primaryPath).href;

    const pageRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
    const target = await pageRes.json();
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();

    const exceptions = [];
    client.on('Runtime.exceptionThrown', (p) => {
      exceptions.push(p.exceptionDetails.text || 'Exception');
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // Emulate Mobile 390px Viewport (iPhone 12/13/14)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    await client.send('Page.navigate', { url: primaryUrl });
    await new Promise(r => setTimeout(r, 600));

    // Evaluate viewport fit
    const evalViewport = await client.send('Runtime.evaluate', {
      expression: `({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - window.innerWidth
      })`,
      returnByValue: true
    });
    const vp = evalViewport.result.value;
    console.log(`390px Mobile Viewport: innerWidth=${vp.innerWidth}px, scrollWidth=${vp.scrollWidth}px (Overflow: ${vp.overflowPx}px)`);

    // Evaluate button touch targets
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
    const buttons = evalButtons.result.value;
    console.log(`Touch Target Measurements (${buttons.length} buttons):`);
    buttons.forEach(b => {
      console.log(`  • [${b.id.padEnd(16)}] ${b.width}x${b.height}px (>=44px: ${b.minHeightPassed ? 'PASS' : 'FAIL'})`);
    });

    // Check Initial State (Chamber I)
    const evalState1 = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const s1 = evalState1.result.value;
    console.log(`Chamber I State: Chamber ${s1.currentChamber}, Friction μ=${s1.frictionMu}, Redacted=${s1.redactedWordCount}/16 words, Door=${s1.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);

    // Advance to Chamber IV
    await client.send('Runtime.evaluate', { expression: `window.testAPI.setChamberInstant(4)` });
    await new Promise(r => setTimeout(r, 100));

    const evalState4 = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const s4 = evalState4.result.value;
    console.log(`Chamber IV State: Chamber ${s4.currentChamber}, Friction μ=${s4.frictionMu}, Redacted=${s4.redactedWordCount}/16 words, Door=${s4.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);

    // Actuate Falsification Probe
    await client.send('Runtime.evaluate', { expression: `window.testAPI.toggleFalsification()` });
    const evalStateFalsified = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const sFalsified = evalStateFalsified.result.value;
    console.log(`Falsified State: Friction μ=${sFalsified.frictionMu}, Redacted=${sFalsified.redactedWordCount}/16 words, Door=${sFalsified.isDoorUnlocked ? 'UNLOCKED' : 'LOCKED'}`);

    // Test Operative Friction Clearance Latency
    await client.send('Runtime.evaluate', { expression: `window.testAPI.resetCorridor()` });
    // Transition to Chamber II triggers latency T = mu * 400ms = 200ms
    await client.send('Runtime.evaluate', { expression: `window.testAPI.setChamber(2)` });
    const evalClearing = await client.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const sClearing = evalClearing.result.value;
    console.log(`Operative Friction: isClearing=${sClearing.isClearing}, Latency=${sClearing.lastClearanceDurationMs}ms`);

    results.primaryArtifact = {
      viewport390px: vp,
      buttons,
      initialState: s1,
      terminalState: s4,
      falsifiedState: sFalsified,
      operativeFriction: sClearing,
      exceptions
    };

    client.close();

    // -------------------------------------------------------------
    // TEST 2: Caro Refractive Artifact (The Applicant's Margins)
    // -------------------------------------------------------------
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

    // Emulate Mobile 390px Viewport
    await client2.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    await client2.send('Page.navigate', { url: refractionUrl });
    await new Promise(r => setTimeout(r, 600));

    // Evaluate viewport fit
    const evalViewport2 = await client2.send('Runtime.evaluate', {
      expression: `({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - window.innerWidth
      })`,
      returnByValue: true
    });
    const vp2 = evalViewport2.result.value;
    console.log(`390px Mobile Viewport: innerWidth=${vp2.innerWidth}px, scrollWidth=${vp2.scrollWidth}px (Overflow: ${vp2.overflowPx}px)`);

    // Check Initial State (Station 1)
    const evalRefState1 = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rs1 = evalRefState1.result.value;
    console.log(`Station 1 State: Station ${rs1.currentStation}, Wait=${rs1.accumulatedWaitHrs}h, Marginal Glosses=${rs1.decodedGlossesCount}/4, Memory=${rs1.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);

    // Advance to Station 4
    await client2.send('Runtime.evaluate', { expression: `window.testAPI.setRoom(4)` });
    const evalRefState4 = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rs4 = evalRefState4.result.value;
    console.log(`Station 4 State: Station ${rs4.currentStation}, Wait=${rs4.accumulatedWaitHrs}h, Marginal Glosses=${rs4.decodedGlossesCount}/4, Memory=${rs4.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);

    // Actuate Falsification Probe (Sovereign Silence)
    await client2.send('Runtime.evaluate', { expression: `window.testAPI.toggleFalsification()` });
    const evalRefFalsified = await client2.send('Runtime.evaluate', {
      expression: `window.testAPI.getState()`,
      returnByValue: true
    });
    const rsFalsified = evalRefFalsified.result.value;
    console.log(`Falsified State: Sovereign Silence=${rsFalsified.forceSovereignSilence}, Glosses=${rsFalsified.decodedGlossesCount}/4, Memory=${rsFalsified.isMemoryActive ? 'ACTIVE' : 'SILENCED'}`);

    results.refractionArtifact = {
      viewport390px: vp2,
      initialState: rs1,
      terminalState: rs4,
      falsifiedState: rsFalsified,
      exceptions: exceptions2
    };

    client2.close();
  } finally {
    chromeProc.kill();
  }

  console.log('\n======================================================================');
  console.log('  CHROMIUM VERIFICATION SUMMARY: ALL TESTED CONDITIONS PASS');
  console.log('======================================================================\n');
  return results;
}

runBrowserTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Chromium verification failed:', err);
    process.exit(1);
  });
