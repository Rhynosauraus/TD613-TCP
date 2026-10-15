import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {loomWorkspaceTemplate} from '../app/dome-world/holonomy-loom/workspace-template.js';
import {LOOM_TUTORIAL_SCREENS} from '../app/dome-world/holonomy-loom/tutorial-copy.js';
import {loomOpeningPresentation,loomTutorialPresentation} from '../app/dome-world/holonomy-loom/tutorial-membrane.js';
const workspace=readFileSync(new URL('../app/dome-world/holonomy-loom/ai-workspace.js',import.meta.url),'utf8');
const doc=new JSDOM(loomWorkspaceTemplate).window.document;
test('opening carries the approved literal claim and immediately inspectable controls',()=>{
 assert.equal(doc.querySelector('#loomFirstCrossingTitle').textContent,LOOM_TUTORIAL_SCREENS[0].title);
 assert.match(doc.querySelector('#loomFirstCrossingPrompt').textContent,/ChatGPT, Gemini, and other LLMs/);
 assert.equal(doc.querySelectorAll('[data-first-crossing-item]:disabled').length,0);
 assert.equal(doc.querySelector('#loomTutorialMotion'),null);
 assert.doesNotMatch(workspace,/snapshot\.progress>=\.9/);
});
test('39 opening carriers balance all eight relations without observed evidence',()=>{
 const p=loomOpeningPresentation();assert.equal(p.tutorial_operator,null);
 const counts={};for(const key of p.flowcore_choreography.presentation_slots)counts[key]=(counts[key]||0)+1;
 assert.equal(Object.keys(counts).length,8);assert.equal(p.flowcore_choreography.presentation_slots.length,39);
 assert.ok(Object.values(counts).every(n=>n===4||n===5));
 for(let i=0;i<7;i++)assert.equal(loomTutorialPresentation(i).tutorial_operator.evidence_class,'TUTORIAL_ILLUSTRATION_ONLY');
});
test('the tutorial exposes a compact observer case and one detailed research host',()=>{
 assert.ok(doc.querySelector('#loomTutorialObserver'));assert.ok(doc.querySelector('#loomScienceTools'));
 assert.equal(doc.querySelector('#loomScienceIntro'),null);
 assert.ok(doc.querySelector('#loomTutorialRequestRecord').closest('details'));
 assert.ok(doc.querySelector('#loomTutorialProofRecord').closest('details'));
 assert.equal((workspace.match(/new AnimationCoordinator\(/g)||[]).length,1);
});
