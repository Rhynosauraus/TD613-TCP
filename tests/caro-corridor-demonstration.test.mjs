import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const primaryPath = path.resolve(__dirname, 'fixtures/dollhouse/caro_corridor_primary.html');
const refractionPath = path.resolve(__dirname, 'fixtures/dollhouse/caro_corridor_refraction.html');

function setupWindowMocks(window, options = {}) {
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
}

test('Caro Corridor Primary - Chamber Traversal and Progressive Petition Redaction', () => {
  const html = fs.readFileSync(primaryPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { setupWindowMocks(w); }
  });

  const api = dom.window.testAPI;
  assert.ok(api, 'testAPI must be exposed on window');

  // Chamber 1: 4 words redacted (25%), Door Locked
  api.setChamberInstant(1);
  let s1 = api.getState();
  assert.equal(s1.currentChamber, 1);
  assert.equal(s1.frictionMu, 0.20);
  assert.equal(s1.redactionLambda, 0.25);
  assert.equal(s1.redactedWordCount, 4);
  assert.equal(s1.legibleWordCount, 12);
  assert.equal(s1.isDoorUnlocked, false);
  assert.ok(s1.doorTitle.includes('PORTAL LOCKED'));

  // Chamber 2: 8 words redacted (50%), Door Locked
  api.setChamberInstant(2);
  let s2 = api.getState();
  assert.equal(s2.currentChamber, 2);
  assert.equal(s2.frictionMu, 0.50);
  assert.equal(s2.redactionLambda, 0.50);
  assert.equal(s2.redactedWordCount, 8);
  assert.equal(s2.legibleWordCount, 8);
  assert.equal(s2.isDoorUnlocked, false);

  // Chamber 3: 12 words redacted (75%), Door Locked
  api.setChamberInstant(3);
  let s3 = api.getState();
  assert.equal(s3.currentChamber, 3);
  assert.equal(s3.frictionMu, 0.90);
  assert.equal(s3.redactionLambda, 0.75);
  assert.equal(s3.redactedWordCount, 12);
  assert.equal(s3.legibleWordCount, 4);
  assert.equal(s3.isDoorUnlocked, false);

  // Chamber 4: 16 words redacted (100%), Door Unlocks!
  api.setChamberInstant(4);
  let s4 = api.getState();
  assert.equal(s4.currentChamber, 4);
  assert.equal(s4.frictionMu, 1.50);
  assert.equal(s4.redactionLambda, 1.00);
  assert.equal(s4.redactedWordCount, 16);
  assert.equal(s4.legibleWordCount, 0);
  assert.equal(s4.isDoorUnlocked, true, 'Door must unlock when all words are expurgated');
  assert.ok(s4.doorTitle.includes('PORTAL UNLOCKED'));
});

test('Caro Corridor Primary - Operative Procedural Friction Clearance Latency (Section V)', () => {
  const html = fs.readFileSync(primaryPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { setupWindowMocks(w, { reducedMotion: false }); }
  });

  const api = dom.window.testAPI;
  api.setChamberInstant(1);

  // Transition to Chamber 4 (mu = 1.50) triggers clearance latency T = mu * 400ms = 600ms
  api.setChamber(4);
  const stateClearing = api.getState();
  assert.equal(stateClearing.isClearing, true, 'Procedural friction must lock navigation during clearance');
  assert.equal(stateClearing.lastClearanceDurationMs, 600, 'Clearance latency must equal mu * 400ms');

  // Reset clears active timer immediately
  api.resetCorridor();
  assert.equal(api.getState().isClearing, false);

  // Falsification probe (mu = 0.0) eliminates clearance delay
  api.toggleFalsification();
  api.setChamber(2);
  const stateFalsified = api.getState();
  assert.equal(stateFalsified.isClearing, false, 'Zero friction must eliminate clearance delay');
  assert.equal(stateFalsified.lastClearanceDurationMs, 0);

  // Clean up
  api.resetCorridor();
});

test('Caro Corridor Primary - Causal Falsification Probe (Invert Authority Force λ = 0)', () => {
  const html = fs.readFileSync(primaryPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { setupWindowMocks(w); }
  });

  const api = dom.window.testAPI;
  api.setChamberInstant(4); // Fully expurgated, door unlocked

  assert.equal(api.getState().isDoorUnlocked, true);
  assert.equal(api.getState().redactedWordCount, 16);

  // Actuate Falsification: force λ = 0, μ = 0
  api.toggleFalsification();
  const falsified = api.getState();

  assert.equal(falsified.forceZeroRedaction, true);
  assert.equal(falsified.redactionLambda, 0.0);
  assert.equal(falsified.frictionMu, 0.0);
  assert.equal(falsified.redactedWordCount, 0, 'Zero redaction must restore all words to full legibility');
  assert.equal(falsified.legibleWordCount, 16);
  assert.equal(falsified.isDoorUnlocked, false, 'Door must immediately slam shut when words are restored');
  assert.ok(falsified.doorTitle.includes('PORTAL LOCKED'));
});

test('Caro Corridor Primary - Responsive Bounds, Touch Targets & ARIA Accessibility', () => {
  const html = fs.readFileSync(primaryPath, 'utf8');
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'));
  assert.ok(html.includes('min-height: 44px'), 'Interactive buttons must enforce 44px min-height');
  assert.ok(html.includes('role="tablist"'), 'Chamber track must have tablist semantics');
  assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion CSS media query must be present');
});

test('Caro Corridor Refraction - Station Traversal and Marginal Inscription Decoding', () => {
  const html = fs.readFileSync(refractionPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { setupWindowMocks(w); }
  });

  const api = dom.window.testAPI;
  assert.ok(api, 'testAPI must be exposed on refraction window');

  // Station 1: 1 hr wait, 1 note decoded
  api.setRoom(1);
  let s1 = api.getState();
  assert.equal(s1.currentStation, 1);
  assert.equal(s1.accumulatedWaitHrs, 1.0);
  assert.equal(s1.decodedGlossesCount, 1);
  assert.equal(s1.isMemoryActive, true);

  // Station 2: 4 hrs wait, 2 notes decoded
  api.setRoom(2);
  let s2 = api.getState();
  assert.equal(s2.currentStation, 2);
  assert.equal(s2.accumulatedWaitHrs, 4.0);
  assert.equal(s2.decodedGlossesCount, 2);

  // Station 3: 12 hrs wait, 3 notes decoded
  api.setRoom(3);
  let s3 = api.getState();
  assert.equal(s3.currentStation, 3);
  assert.equal(s3.accumulatedWaitHrs, 12.0);
  assert.equal(s3.decodedGlossesCount, 3);

  // Station 4: 48 hrs wait, all 4 notes decoded
  api.setRoom(4);
  let s4 = api.getState();
  assert.equal(s4.currentStation, 4);
  assert.equal(s4.accumulatedWaitHrs, 48.0);
  assert.equal(s4.decodedGlossesCount, 4);
});

test('Caro Corridor Refraction - Causal Falsification Probe (Sovereign Silence Suppression)', () => {
  const html = fs.readFileSync(refractionPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { setupWindowMocks(w); }
  });

  const api = dom.window.testAPI;
  api.setRoom(4); // All 4 notes decoded

  assert.equal(api.getState().decodedGlossesCount, 4);

  // Actuate Falsification: Impose Sovereign Silence
  api.toggleFalsification();
  const silenced = api.getState();

  assert.equal(silenced.forceSovereignSilence, true);
  assert.equal(silenced.decodedGlossesCount, 0, 'Sovereign silence must suppress all marginal glosses');
  assert.equal(silenced.isMemoryActive, false);
  assert.ok(silenced.bannerTitle.includes('SOVEREIGN SILENCE'));
});
