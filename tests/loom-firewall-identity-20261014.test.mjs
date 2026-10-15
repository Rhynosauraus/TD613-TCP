import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { loomWorkspaceTemplate } from '../app/dome-world/holonomy-loom/workspace-template.js';
import { FIRST_CROSSING_PRACTICE, checkFirstCrossingPrivacy } from '../app/dome-world/holonomy-loom/first-crossing-practice.js';
import { loomOpeningPresentation } from '../app/dome-world/holonomy-loom/tutorial-membrane.js';
import { createStagedLoomEvidenceView } from '../app/dome-world/holonomy-loom/post-evidence-view.js';
import { LOOM_POST_EVIDENCE_COPY } from '../app/dome-world/holonomy-loom/post-evidence-copy.js';

const root=new URL('../app/dome-world/holonomy-loom/',import.meta.url);
const css=fs.readFileSync(new URL('loom-couture.css',root),'utf8');
const runtime=fs.readFileSync(new URL('instrument-state-view.js',root),'utf8');
const workspace=fs.readFileSync(new URL('ai-workspace.js',root),'utf8');
const dom=new JSDOM(loomWorkspaceTemplate);
const doc=dom.window.document;

test('the opening preserves the firewall framing and names the governed continuity operations',()=>{
 assert.match(doc.querySelector('#loomFirstCrossingTitle').textContent,/Firewall your online life from AI/);
 assert.match(doc.querySelector('.loom-threshold-kicker').textContent,/Tutorial.*fictional conversation/);
 assert.match(doc.querySelector('#loomFirstCrossingPrompt').textContent,/ChatGPT, Gemini, and other LLMs/);
 assert.doesNotMatch(doc.querySelector('#loomFirstCrossing').textContent,/Golden Egg|draft a work email/i);
 assert.equal(doc.querySelectorAll('[data-first-crossing-item]').length,2);
 assert.equal(doc.querySelector('#loomTutorialMotion'),null);
});


test('the fictional workshop preserves selected references and a separately held private source',()=>{
 assert.deepEqual(FIRST_CROSSING_PRACTICE.documents.filter(x=>x.share).map(x=>x.id),['brief','source']);
 assert.match(FIRST_CROSSING_PRACTICE.task,/community music workshop/i);
 assert.match(FIRST_CROSSING_PRACTICE.documents[1].text,/90 minutes/);
 assert.equal(FIRST_CROSSING_PRACTICE.documents[2].share,false);
 const check=checkFirstCrossingPrivacy();assert.equal(check.provider_called,false);
 assert.equal(check.blocked_private_egress_attempts,1);assert.equal(check.whole_conversation_leakage_fraction,null);
});


test('the product retains the full-page single-clock canonical field',()=>{
 assert.equal((workspace.match(/new AnimationCoordinator\(/g)||[]).length,1);
 assert.match(runtime,/Array\.from\(\{length:39\}/);
 assert.match(runtime,/choreography\.presentation_slots\.filter/);
 assert.doesNotMatch(css,/@keyframes[^{]*\{/);
 assert.match(css,/width:100%;height:100%/);
});


test('the overture gives each canonical relation four or five of 39 slots',()=>{
 const presentation=loomOpeningPresentation(),slots=presentation.flowcore_choreography.presentation_slots;
 assert.equal(presentation.tutorial_operator,null);assert.equal(slots.length,39);
 const counts={};for(const id of slots)counts[id]=(counts[id]||0)+1;
 assert.equal(Object.keys(counts).length,8);assert.ok(Object.values(counts).every(n=>n===4||n===5));
});


test('fermata fallback and inspectable private planning survive the narrative repair',()=>{
 assert.match(runtime,/restFlightGlyphs=flightGlyphs\.map/);
 assert.match(runtime,/M-23 2 Q0 -28 23 2/);
 assert.equal(doc.querySelector('#loomFirstCrossingPrivate').tagName,'DETAILS');
 assert.match(doc.querySelector('#loomFirstCrossingPrivate summary').textContent,/cōl.*local only/);
 assert.ok(doc.querySelector('#loomTutorialProofRecord').closest('details'));
});


test('finished five-surface proof artwork is staged, unmounted and incapable of self-promotion',()=>{
  const root=new JSDOM(loomWorkspaceTemplate).window.document;
  const section=createStagedLoomEvidenceView(root);
  assert.equal(section.hidden,true);
  assert.equal(section.dataset.claimStatus,'STAGED_UNAUTHORIZED');
  assert.deepEqual([...section.querySelectorAll('[data-surface]')].map(n=>n.dataset.surface),['L','R','J','G','C']);
  assert.equal(root.querySelector('.loom-empirical-evidence'),null,'proof artwork cannot mount as product without the independent evidence integration');
  assert.match(section.textContent,/The work held up/i);
  assert.match(section.textContent,/tested exchange/i);
  assert.equal(LOOM_POST_EVIDENCE_COPY.activation,'STAGED_NOT_PUBLICLY_AUTHORIZED');
  assert.doesNotMatch(root.querySelector('#loomFirstCrossing').textContent,/The work held up. The privacy test did too/i);
});
