import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'fixtures/dollhouse/causal_phasonic_demonstration.html');

function setupWindowMocks(window, options = {}) {
  const dummyCtx = new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        if (prop === 'measureText') return () => ({ width: 50 });
        return (...args) => {};
      }
      return undefined;
    }
  });
  window.HTMLCanvasElement.prototype.getContext = function() {
    return dummyCtx;
  };
  window.requestAnimationFrame = (cb) => 1;
  window.cancelAnimationFrame = () => {};

  window.matchMedia = (query) => ({
    matches: !!options.reducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });

  window.alert = (msg) => {
    if (options.onAlert) options.onAlert(msg);
  };
}

test('Causal Phasonic Demonstration - Act Navigation & Button Highlight Agreement', () => {
  const html = fs.readFileSync(fixturePath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      setupWindowMocks(w, { reducedMotion: false });
    }
  });

  const testAPI = dom.window.testAPI;
  assert.ok(testAPI, 'testAPI is exposed on window');

  // Test Act 1
  testAPI.setAct(1);
  let state = testAPI.getState();
  assert.equal(state.syntaxMode, 'PERIODIC_BASELINE');
  assert.equal(state.activeActBtn, 1, 'Act 1 button must be highlighted for Act 1');

  // Test Act 2
  testAPI.setAct(2);
  state = testAPI.getState();
  assert.equal(state.syntaxMode, 'COLON_SUSPENSION');
  assert.equal(state.activeActBtn, 2, 'Act 2 button must be highlighted for Act 2');

  // Test Act 3
  testAPI.setAct(3);
  state = testAPI.getState();
  assert.equal(state.syntaxMode, 'EM_DASH_SHEAR');
  assert.equal(state.activeActBtn, 3, 'Act 3 button must be highlighted for Act 3');

  // Test Act 4
  testAPI.setAct(4);
  state = testAPI.getState();
  assert.equal(state.syntaxMode, 'SEMICOLON_EQUIPOLLENCE');
  assert.equal(state.activeActBtn, 4, 'Act 4 button must be highlighted for Act 4');
});

test('Causal Phasonic Demonstration - Causal Ablation & Falsification Probe (DD63-C1)', () => {
  const html = fs.readFileSync(fixturePath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      setupWindowMocks(w, { reducedMotion: false });
    }
  });

  const testAPI = dom.window.testAPI;
  testAPI.setAct(4);

  const act4Normal = testAPI.getState();
  assert.ok(act4Normal.H_val > 1.30, `Expected H > 1.30, got ${act4Normal.H_val}`);
  assert.ok(act4Normal.displacementPx > 25.0, `Expected displacement > 25px, got ${act4Normal.displacementPx}`);
  assert.equal(act4Normal.syntaxMode, 'SEMICOLON_EQUIPOLLENCE');
  assert.ok(act4Normal.sentenceText.includes('yet the throne room was empty'));
  assert.ok(parseInt(act4Normal.fontWeight, 10) >= 600, 'Font weight must scale with H');

  // Actuate Falsification: force H = 0.0000
  testAPI.toggleZeroInterferenceOverride();
  const act4Falsified = testAPI.getState();

  assert.equal(act4Falsified.H_val, 0.000);
  assert.equal(act4Falsified.displacementPx, 0.00);
  assert.equal(act4Falsified.syntaxMode, 'PERIODIC_BASELINE');
  assert.equal(act4Falsified.sentenceText, '"The king arrived."');
  assert.equal(parseInt(act4Falsified.fontWeight, 10), 400);
  assert.equal(act4Falsified.activeActBtn, 1, 'Falsified zero state must revert button highlight to Act 1');
});

test('Causal Phasonic Demonstration - True Equilateral Lattice Geometry & 6-Fold Coordination (DD-65 Correction A)', () => {
  const html = fs.readFileSync(fixturePath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      setupWindowMocks(w, { reducedMotion: false });
    }
  });

  const testAPI = dom.window.testAPI;
  assert.ok(testAPI && testAPI.getLatticeGeometry, 'testAPI.getLatticeGeometry must be exposed');

  const geom = testAPI.getLatticeGeometry();

  // 1. Altitude and Spacing Geometry
  const expectedCellW = 60.0;
  const expectedCellH = expectedCellW * (Math.sqrt(3) / 2); // 51.96152422706631
  assert.equal(geom.cellW, expectedCellW, 'Horizontal cell width must be 60.0');
  assert.ok(Math.abs(geom.cellH - expectedCellH) < 1e-12, `Vertical row altitude must equal 60 * sqrt(3)/2, got ${geom.cellH}`);

  // 2. Numerical Edge Length Verification: All 6 Incident Edges Must Equal 60.0 (Equilateral, Not Isosceles)
  const edges = geom.representativeEdges;
  const tolerance = 1e-10;

  assert.ok(Math.abs(edges.dHorizRight - 60.0) < tolerance, `Horizontal right edge must be 60.0, got ${edges.dHorizRight}`);
  assert.ok(Math.abs(edges.dHorizLeft - 60.0) < tolerance, `Horizontal left edge must be 60.0, got ${edges.dHorizLeft}`);
  assert.ok(Math.abs(edges.dDownRight - 60.0) < tolerance, `Diagonal down-right edge must be 60.0, got ${edges.dDownRight}`);
  assert.ok(Math.abs(edges.dDownLeft - 60.0) < tolerance, `Diagonal down-left edge must be 60.0, got ${edges.dDownLeft}`);
  assert.ok(Math.abs(edges.dUpRight - 60.0) < tolerance, `Diagonal up-right edge must be 60.0, got ${edges.dUpRight}`);
  assert.ok(Math.abs(edges.dUpLeft - 60.0) < tolerance, `Diagonal up-left edge must be 60.0, got ${edges.dUpLeft}`);

  // Disprove Isosceles Defect: verify |dHoriz - dDiag| < 1e-10 across all diagonals
  assert.ok(Math.abs(edges.dHorizRight - edges.dDownRight) < tolerance, 'Horizontal and diagonal edge lengths must be equal');
  assert.ok(Math.abs(edges.dHorizRight - edges.dDownLeft) < tolerance, 'Horizontal and diagonal edge lengths must be equal');
  assert.ok(Math.abs(edges.dHorizRight - edges.dUpRight) < tolerance, 'Horizontal and diagonal edge lengths must be equal');
  assert.ok(Math.abs(edges.dHorizRight - edges.dUpLeft) < tolerance, 'Horizontal and diagonal edge lengths must be equal');

  // Verify that the ratio is 1.000000000000 (not 67.082 / 60 = 1.118)
  const ratio = edges.dDownRight / edges.dHorizRight;
  assert.ok(Math.abs(ratio - 1.0) < tolerance, `Ratio of diagonal to horizontal edge must be exactly 1.0, got ${ratio}`);

  // 3. 6-Fold Coordination Verification
  assert.equal(geom.interiorVertexCoordination, 6, 'Interior vertex must have exactly 6-fold coordination in D3 triangular lattice');

  // 4. Zero Interference Causal State Restores Exact Unperturbed Coordinates
  testAPI.setAct(4);
  testAPI.toggleZeroInterferenceOverride(); // Force H = 0
  const falsifiedGeom = testAPI.getLatticeGeometry();
  const pUnperturbed = falsifiedGeom.unperturbedGrid[2][2];
  const pPerturbed = falsifiedGeom.perturbedGrid[2][2];
  assert.equal(pPerturbed.x, pUnperturbed.x, 'Zero interference must collapse vertex displacement in X');
  assert.equal(pPerturbed.y, pUnperturbed.y, 'Zero interference must collapse vertex displacement in Y');
});

test('Causal Phasonic Demonstration - Mobile Legibility & Touch Target Bounds (DD63-C4)', () => {
  const html = fs.readFileSync(fixturePath, 'utf8');
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'Viewport meta tag must be present');
  assert.ok(html.includes('class="machinery-hud-bar"'), 'Must include semantic HTML machinery HUD bar outside canvas');
  assert.ok(html.includes('min-height: 44px'), 'Buttons must have minimum 44px touch target height');
  assert.ok(html.includes('@media (max-width: 480px)'), 'Mobile stacking breakpoint must be present');
});

test('Causal Phasonic Demonstration - Reduced-Motion Still-State Policy', () => {
  const html = fs.readFileSync(fixturePath, 'utf8');
  let alertTriggered = false;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      setupWindowMocks(w, {
        reducedMotion: true,
        onAlert: () => { alertTriggered = true; }
      });
    }
  });

  // Attempting to sweep under reduced motion must block and alert
  dom.window.document.getElementById('btnSweep').click();
  assert.ok(alertTriggered, 'Continuous sweep must be blocked when prefers-reduced-motion is active');

  // Manual stepping still works
  dom.window.testAPI.setAct(2);
  const state = dom.window.testAPI.getState();
  assert.equal(state.syntaxMode, 'COLON_SUSPENSION');
});
