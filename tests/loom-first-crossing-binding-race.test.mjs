import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { mountLoomAiWorkspace } from '../app/dome-world/holonomy-loom/ai-workspace.js';

// Exercise the mounted workspace and installed binding/renderer path. Only the
// owner clock and digest completion are controlled; this is a DOM/timing witness,
// not a browser, physical-device or perceptual acceptance claim.
async function until(predicate, label) {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Practice race did not settle: ${label}`);
}

function setup(t,{intersection=false}={}) {
  const dom = new JSDOM('<section id="fixture"></section>', {
    url: 'https://td613.com/dome-world/holonomy-loom.html', pretendToBeVisual: true
  });
  const environment = dom.window, root = environment.document.querySelector('#fixture');
  const frames = new Map(), requests = [];
  let wall = 0, frameId = 0;
  const previousNow = Object.getOwnPropertyDescriptor(globalThis.performance, 'now');
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  Object.defineProperty(globalThis.performance, 'now', { configurable: true, value: () => wall });
  globalThis.requestAnimationFrame = callback => {
    const id = ++frameId; frames.set(id, callback); return id;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const useCrypto = crypto => Object.defineProperty(environment, 'crypto', { configurable: true, value: crypto });
  useCrypto(webcrypto);
  const motionListeners=new Set();
  const motionPreference={matches:false,addEventListener:(_name,listener)=>motionListeners.add(listener),removeEventListener:(_name,listener)=>motionListeners.delete(listener)};
  environment.matchMedia = () => motionPreference;
  const observedFields=new Set();let observeVisibility;
  if(intersection)environment.IntersectionObserver=class {
    constructor(callback){observeVisibility=callback;}
    observe(field){observedFields.add(field);}
    disconnect(){observedFields.clear();}
  };
  environment.fetch = (...args) => { requests.push(args); throw new Error('Practice attempted a provider request'); };
  const ui = mountLoomAiWorkspace(root, environment);
  t.after(() => {
    ui.dispose(); environment.close();
    if (previousNow) Object.defineProperty(globalThis.performance, 'now', previousNow);
    else delete globalThis.performance.now;
    if (previousRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRequest;
    if (previousCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancel;
  });
  return {
    root, environment, ui, requests, frames, useCrypto,observedFields,
    $: selector => root.querySelector(selector),
    setFieldVisible(field,isIntersecting){observeVisibility?.([{target:field,isIntersecting}]);},
    setReducedMotion(matches) {
      motionPreference.matches=matches;
      for(const listener of motionListeners)listener({matches});
    },
    advance(ms) {
      wall += ms;
      const batch = [...frames.values()]; frames.clear();
      batch.forEach(callback => callback(wall));
    }
  };
}


async function gather(h){
 h.$('#loomFirstCrossingAction').click();
 assert.equal(h.root.dataset.firstCrossingStep,'1');
}
async function ready(h){
 await gather(h);h.$('#loomFirstCrossingAction').click();
 await until(()=>h.root.dataset.firstCrossingStep==='2','actual local binding');
}
async function finish(h){
 for(let next=3;next<=6;next++){
  h.$('#loomFirstCrossingStop').click();
  await until(()=>h.root.dataset.firstCrossingStep===String(next),'explicit step '+next);
 }
}

test('opening editorial row is the native next-scene action and restores after Back',async t=>{
 const h=setup(t),action=h.$('#loomFirstCrossingAction');
 assert.equal(action.parentElement.id,'loomFirstCrossingObjects');
 assert.equal(action.querySelector('strong').textContent,'Your request');
 assert.equal(h.$('#loomFirstCrossingTitle em').textContent,'from AI.');
 assert.equal(h.$('[data-first-crossing-item="source"]').disabled,true);
 assert.equal(h.$('[data-first-crossing-item="brief"]').hidden,true);
 assert.equal(action.disabled,false);
 h.advance(20000);assert.equal(h.root.dataset.firstCrossingStep,'0');
 action.click();assert.equal(h.root.dataset.firstCrossingStep,'1');
 assert.ok(action.parentElement.classList.contains('loom-first-crossing-actions'));
 const reference=h.$('[data-first-crossing-item="source"]');
 assert.equal(reference.disabled,false);reference.click();assert.equal(reference.getAttribute('aria-expanded'),'true');
 h.$('#loomFirstCrossingBack').click();assert.equal(h.root.dataset.firstCrossingStep,'0');
 assert.equal(h.$('#loomFirstCrossingAction'),action);
 assert.equal(action.parentElement.id,'loomFirstCrossingObjects');
 assert.equal(h.requests.length,0);assert.equal(h.ui.inspect().session,null);
});

test('hidden Finish events cannot bypass the actual binding or claim tutorial completion',async t=>{
 const h=setup(t);h.$('#loomFirstCrossingStop').dispatchEvent(new h.environment.Event('click'));
 assert.equal(h.root.dataset.firstCrossingStep,'0');
 assert.equal(h.environment.localStorage.getItem('td613.loom.first-crossing.v1'),null);
 await ready(h);assert.equal(h.$('#loomFirstCrossingStop').disabled,false);
 await finish(h);assert.equal(h.environment.localStorage.getItem('td613.loom.first-crossing.v1'),'complete');
 assert.equal(h.ui.inspect().session,null);assert.equal(h.requests.length,0);
});

test('pending binding refuses duplicate gestures and a stale result after Back cannot install',async t=>{
 const h=setup(t);await gather(h);
 let release,entered,first=true,count=0;
 const barrier=new Promise(r=>release=r),started=new Promise(r=>entered=r);t.after(()=>release());
 h.useCrypto({randomUUID(){count++;return webcrypto.randomUUID()},getRandomValues:v=>webcrypto.getRandomValues(v),subtle:{async digest(...args){if(first){first=false;entered();await barrier}return webcrypto.subtle.digest(...args)}}});
 h.$('#loomFirstCrossingAction').click();await started;
 assert.equal(h.$('#loomFirstCrossingAction').disabled,true);
 h.$('#loomFirstCrossingAction').dispatchEvent(new h.environment.Event('click'));
 assert.equal(count,1);h.advance(20000);assert.equal(h.root.dataset.firstCrossingStep,'1');
 h.$('#loomFirstCrossingBack').click();release();await new Promise(r=>setTimeout(r,50));
 assert.equal(h.root.dataset.firstCrossingStep,'0');assert.equal(h.ui.inspect().session,null);
});

test('digest failure remains held with retry; later motion cannot erase it',async t=>{
 const h=setup(t);await gather(h);
 h.useCrypto({randomUUID:()=>webcrypto.randomUUID(),subtle:{async digest(){throw new Error('Controlled digest failure')}}});
 h.$('#loomFirstCrossingAction').click();await until(()=>h.root.dataset.firstCrossingCue==='binding-held','HOLD');
 h.advance(20000);assert.match(h.$('#loomFirstCrossingPrompt').textContent,/Controlled digest failure/);
 assert.equal(h.$('#loomFirstCrossingAction').disabled,false);
 h.useCrypto(webcrypto);h.$('#loomFirstCrossingAction').click();await until(()=>h.root.dataset.firstCrossingStep==='2','retry');
});

test('skip during a pending binding preserves zero completion and cannot reopen the tutorial',async t=>{
 const h=setup(t);await gather(h);
 let release,entered,first=true;const barrier=new Promise(r=>release=r),started=new Promise(r=>entered=r);t.after(()=>release());
 h.useCrypto({randomUUID:()=>webcrypto.randomUUID(),subtle:{async digest(...args){if(first){first=false;entered();await barrier}return webcrypto.subtle.digest(...args)}}});
 h.$('#loomFirstCrossingAction').click();await started;h.$('#loomFirstCrossingLeave').click();release();await new Promise(r=>setTimeout(r,50));
 assert.equal(h.$('.loom-builder-shell').hidden,false);assert.equal(h.$('#loomFirstCrossing').hidden,true);
 assert.equal(h.environment.localStorage.getItem('td613.loom.first-crossing.v1'),null);assert.equal(h.requests.length,0);
});

test('reduced motion traverses every explicit step with a single owner and no provider call',async t=>{
 const h=setup(t);h.setReducedMotion(true);await ready(h);await finish(h);
 assert.ok(h.frames.size<=1);assert.equal(h.requests.length,0);
 assert.match(h.$('#loomTutorialSampleAnswerText').textContent,/Community Music Workshop/);
 assert.doesNotMatch(h.$('#loomTutorialProofRecord').textContent,/INTERNAL-DEMO-PRIVATE-47|Cedar Hall|November 21/);
 h.$('#loomBegin').click();assert.equal(h.$('.loom-builder-shell').hidden,false);
 assert.equal(h.$('#aiTask').value,'');
});

test('joining the third clue changes the calculated observation; remix preserves work and step',async t=>{
 const h=setup(t);await ready(h);
 for(let next=3;next<=4;next++){h.$('#loomFirstCrossingStop').click();await until(()=>h.root.dataset.firstCrossingStep===String(next),'observer step')}
 const host=h.$('#loomTutorialObserver');assert.match(host.textContent,/1.0 bits/);
 const third=host.querySelector('input[value="third"]');third.checked=false;third.dispatchEvent(new h.environment.Event('change',{bubbles:true}));
 assert.doesNotMatch(host.querySelector('.loom-observer-results').textContent,/1.0 bits/);
 const before=h.ui.inspect().session;h.$('#loomFirstCrossingPause').click();
 assert.equal(h.root.dataset.firstCrossingStep,'4');assert.equal(h.ui.inspect().session,before);
 assert.equal(third.checked,false);assert.equal(h.requests.length,0);
});

test('Flow-Core help closes with Escape and returns focus to its opener',async t=>{
 const h=setup(t),help=h.$('.loom-flowcore-help'),opener=help.querySelector('summary');help.open=true;
 help.querySelector('#loomFlowcoreHelpClose').focus();
 help.dispatchEvent(new h.environment.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(help.open,false);assert.equal(h.environment.document.activeElement,opener);
});

test('the same field follows entry, skip, and replay without a second renderer',async t=>{
 const h=setup(t,{intersection:true}),field=h.$('#aiRuntimeState');
 h.$('#loomFirstCrossingLeave').click();assert.equal(field.parentElement,h.$('#loomWorkspaceField'));
 h.$('#loomReturnThreshold').click();assert.equal(field.parentElement,h.$('#aiRuntime'));assert.equal(h.root.dataset.firstCrossingStep,'0');
 assert.ok(h.frames.size<=1);assert.equal(h.requests.length,0);
});
