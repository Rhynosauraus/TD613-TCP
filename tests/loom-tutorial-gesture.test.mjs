import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { mountLoomAiWorkspace } from '../app/dome-world/holonomy-loom/ai-workspace.js';

// Mounted DOM falsifiers for tutorial gesture admission. These declared event
// sequences do not replace a native browser double-click/keyboard witness.
const until = async (predicate, label) => {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Tutorial gesture did not settle: ${label}`);
};

function setup(t) {
  const dom = new JSDOM('<section id="fixture"></section>', {
    url: 'https://td613.com/dome-world/holonomy-loom.html',
    pretendToBeVisual: true
  });
  const environment = dom.window, root = environment.document.querySelector('#fixture');
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  const frames = new Map(), requests = [];
  let frameId = 0;
  globalThis.requestAnimationFrame = callback => {
    const id = ++frameId; frames.set(id, callback); return id;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const useCrypto = crypto => Object.defineProperty(environment, 'crypto', {
    configurable: true, value: crypto
  });
  useCrypto(webcrypto);
  environment.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  environment.fetch = (...args) => {
    requests.push(args);
    throw new Error('The fictional tutorial attempted a provider request');
  };
  const ui = mountLoomAiWorkspace(root, environment);
  let disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; ui.dispose(); } };
  t.after(() => {
    dispose(); environment.close();
    if (previousRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRequest;
    if (previousCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancel;
  });
  const $ = selector => root.querySelector(selector);
  return {
    environment, root, ui, $, useCrypto, dispose, requests,
    pointer(selector, detail = 1) {
      const event = new environment.MouseEvent('click', {
        bubbles: true, cancelable: true, detail, button: 0, clientX: 260, clientY: 640
      });
      $(selector).dispatchEvent(event);
      return event;
    },
    key(selector, key, { type = 'keydown', repeat = false } = {}) {
      const event = new environment.KeyboardEvent(type, {
        key, code: key === ' ' ? 'Space' : key, repeat, bubbles: true, cancelable: true
      });
      $(selector).dispatchEvent(event);
      return event;
    },
    assertBounded() {
      assert.equal(requests.length, 0, 'fictional tutorial remains local');
      assert.equal(ui.inspect().session, null, 'fictional tutorial creates no real session');
    }
  };
}

async function ready(h) {
  h.$('#loomFirstCrossingAction').click();
  assert.equal(h.root.dataset.firstCrossingStep, '1');
  h.$('#loomFirstCrossingAction').click();
  await until(() => h.root.dataset.firstCrossingStep === '2', 'checked request');
}

async function step(h, next) {
  h.$('#loomFirstCrossingStop').click();
  await until(() => h.root.dataset.firstCrossingStep === String(next), `scene ${next}`);
}

test('one native multi-click sequence cannot consume two synchronous scenes', async t => {
  const h = setup(t); await ready(h);
  h.pointer('#loomFirstCrossingStop', 1);
  assert.equal(h.root.dataset.firstCrossingStep, '3');
  const duplicate = h.pointer('#loomFirstCrossingStop', 2);
  assert.equal(h.root.dataset.firstCrossingStep, '3');
  assert.equal(duplicate.defaultPrevented, true);
  assert.equal(h.environment.document.activeElement, h.$('#loomFirstCrossing'));
  const fresh = h.pointer('#loomFirstCrossingStop', 1);
  assert.equal(fresh.defaultPrevented, false, 'a fresh pointer series remains available immediately');
  assert.equal(h.root.dataset.firstCrossingStep, '4');
  h.assertBounded();
});

test('a repeated native click retargeted to another tutorial action has no new consequence', async t => {
  const h = setup(t); await ready(h); await step(h, 3);
  h.pointer('#loomFirstCrossingStop', 1);
  assert.equal(h.root.dataset.firstCrossingStep, '4');
  const choreography = h.root.dataset.flowcoreChoreography;
  for (const selector of ['#loomTutorialResearchOpen', '#loomFirstCrossingBack', '#loomFirstCrossingLeave', '#loomFirstCrossingPause']) {
    const duplicate = h.pointer(selector, 2);
    assert.equal(duplicate.defaultPrevented, true, selector);
    assert.equal(h.root.dataset.firstCrossingStep, '4', selector);
    assert.equal(h.$('#loomTools').open, false, 'duplicate does not open research');
    assert.equal(h.$('#loomFirstCrossing').hidden, false, 'duplicate does not exit');
    assert.equal(h.root.dataset.flowcoreChoreography, choreography, 'duplicate does not remix');
  }
  h.assertBounded();
});

test('a duplicate retargeted into the builder after Skip cannot acquire a new action', t => {
  const h = setup(t);
  h.pointer('#loomFirstCrossingLeave', 1);
  assert.equal(h.$('.loom-builder-shell').hidden, false);
  const duplicate = h.pointer('#aiDemoMode', 2);
  assert.equal(duplicate.defaultPrevented, true);
  assert.equal(h.ui.inspect().mode, 'portable');
  const fresh = h.pointer('#aiDemoMode', 1);
  assert.equal(fresh.defaultPrevented, false);
  assert.equal(h.ui.inspect().mode, 'demo');
  h.assertBounded();
});

test('a second click after Finish cannot consume Try Loom', async t => {
  const h = setup(t); await ready(h);
  await step(h, 3); await step(h, 4); await step(h, 5);
  h.pointer('#loomFirstCrossingStop', 1);
  assert.equal(h.root.dataset.firstCrossingStep, '6');
  const duplicate = h.pointer('#loomBegin', 2);
  assert.equal(duplicate.defaultPrevented, true);
  assert.equal(h.root.dataset.firstCrossingStep, '6');
  assert.equal(h.$('.loom-builder-shell').hidden, true);
  h.$('#loomBegin').click();
  assert.equal(h.$('.loom-builder-shell').hidden, false, 'fresh activation enters the real workspace');
  h.assertBounded();
});

test('repeated activation keys are cancelled even after scene focus moves', async t => {
  const h = setup(t); await ready(h);
  for (const key of ['Enter', ' ']) {
    const event = h.key('#loomFirstCrossingStop', key, { repeat: true });
    assert.equal(event.defaultPrevented, true, `held ${JSON.stringify(key)} on button`);
    const focused = h.key('#loomFirstCrossing', key, { repeat: true });
    assert.equal(focused.defaultPrevented, true, `held ${JSON.stringify(key)} on scene`);
  }
  assert.equal(h.root.dataset.firstCrossingStep, '2');
  h.assertBounded();
});

test('a held activation key remains suppressed after Skip until its release', t => {
  const h = setup(t);
  const first = h.key('#loomFirstCrossingLeave', 'Enter');
  assert.equal(first.defaultPrevented, false);
  h.$('#loomFirstCrossingLeave').click();
  assert.equal(h.$('.loom-builder-shell').hidden, false);
  const repeated = h.key('#aiDemoMode', 'Enter', { repeat: true });
  assert.equal(repeated.defaultPrevented, true);
  h.key('#aiDemoMode', 'Enter', { type: 'keyup' });
  const fresh = h.key('#aiDemoMode', 'Enter');
  assert.equal(fresh.defaultPrevented, false);
  h.$('#aiDemoMode').click();
  assert.equal(h.ui.inspect().mode, 'demo');
  h.assertBounded();
});

test('fresh key activations and separate legacy click calls traverse without a dwell timer', async t => {
  const h = setup(t); await ready(h);
  for (let next = 3; next <= 6; next++) {
    const key = next % 2 ? 'Enter' : ' ';
    const down = h.key('#loomFirstCrossingStop', key);
    assert.equal(down.defaultPrevented, false, 'a fresh keydown remains available');
    // jsdom omits the browser button activation default. Declare its detail-zero
    // click here, and release the key before the next intentional activation.
    h.$('#loomFirstCrossingStop').click();
    h.key('#loomFirstCrossing', key, { type: 'keyup' });
    await until(() => h.root.dataset.firstCrossingStep === String(next), `fresh scene ${next}`);
  }
  assert.equal(h.environment.localStorage.getItem('td613.loom.first-crossing.v1'), 'complete');
  h.assertBounded();
});

for (const cancellation of ['back', 'exit', 'dispose']) {
  test(`${cancellation} invalidates a pending return proof without publishing its stale scene`, async t => {
    const h = setup(t); await ready(h); await step(h, 3); await step(h, 4);
    let release, entered, first = true;
    const barrier = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    t.after(() => release());
    h.useCrypto({
      randomUUID: () => webcrypto.randomUUID(),
      subtle: { async digest(...args) {
        if (first) { first = false; entered(); await barrier; }
        return webcrypto.subtle.digest(...args);
      } }
    });
    h.$('#loomFirstCrossingStop').click(); await started;
    assert.equal(h.$('#loomFirstCrossingStop').disabled, true);
    if (cancellation === 'back') h.$('#loomFirstCrossingBack').click();
    else if (cancellation === 'exit') h.$('#loomFirstCrossingLeave').click();
    else h.dispose();
    const priorStep = h.root.dataset.firstCrossingStep;
    release(); await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(h.root.dataset.firstCrossingStep, priorStep);
    assert.equal(h.$('#loomTutorialProofRecord').textContent, '');
    assert.equal(h.environment.localStorage.getItem('td613.loom.first-crossing.v1'), null);
    if (cancellation === 'back') assert.equal(priorStep, '3');
    if (cancellation === 'exit') assert.equal(h.$('#loomFirstCrossing').hidden, true);
    h.assertBounded();
  });
}
