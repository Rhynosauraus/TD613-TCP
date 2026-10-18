import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../app/dome-world/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const html = read('holonomy-loom-classic79.html');
const css = read('holonomy-loom/loom-couture-classic79.css');
const js = read('holonomy-loom/ai-workspace-classic79.js');
const template = read('holonomy-loom/workspace-template-classic79.js');
const modern = read('holonomy-loom/ai-workspace.js');
const canonicalEngine = read('../engine/portable-loom-browser-package.js');

test('Classic 79 preserves source-authored editorial interface, not a contemporary CSS skin', () => {
  assert.match(html, /loom-couture-classic79\.css/);
  assert.match(html, /ai-workspace-classic79\.js/);
  assert.match(js, /workspace-template-classic79\.js/);
  assert.match(js, /tutorial-membrane-classic79\.js/);
  assert.match(template, /Firewall your online life from AI\./);
  assert.match(css, /border-radius:52px 6px 52px 6px/);
  assert.match(css, /linear-gradient\(112deg,#efecf4/);
  assert.doesNotMatch(js, /LOOM_TUTORIAL_SCREENS/);
});

test('Classic 79 does not mutate the canonical Loom UI or its current science module', () => {
  const digest = value => createHash('sha256').update(value).digest('hex');
  assert.notEqual(digest(js), digest(modern), 'two independently inspectable controllers');
  assert.match(js, /buildPortableLoomBrowserPackage/);
  assert.match(js, /loom-portable-session\.zip/);
  assert.match(js, /cancelSessionBundle\(\)/);
  assert.match(canonicalEngine, /tomography|math/i);
  assert.match(js, /buildPortableLoomBrowserPackage\(base|prepareSessionBundle\(base/);
  assert.doesNotMatch(js, /downloadJson\('loom-portable-session\.json',portableSessionExport\)/);
});

// Source: #1493 (97d6dbd), unchanged through #1497 (8096f05).
// Exact baseline digests allow the declared font, inspection and Tools adapters;
// unrelated aesthetic drift must receive a new operator decision.
test('historical CSS and template survive the declared functional adapters', () => {
  const digest = value => createHash('sha256').update(value).digest('hex');
  const historicalCss = css
    .replace(/@font-face\{font-family:"Loom Flow-Core";src:url\("\.\/fonts\/flowcore-music\.woff"\)[^\n]*\n/, '')
    .replaceAll('--sans:"Loom Flow-Core",', '--sans:')
    .replace(/\n\/\* BEGIN CURRENT FUNCTIONAL ADAPTERS:[\s\S]*?\/\* END CURRENT FUNCTIONAL ADAPTERS \*\/\n/, '');
  assert.equal(digest(historicalCss), '15c6b2aa7ab2118a7700fe1de495ed9efa74fd1e183e58eec19014d2dce885da');
  const historicalTemplate = template
    .replace(/\n      <details id="loomTutorialArtifact"[^\n]+<\/details>/, '')
    .replace('<button type="button" data-tool="science">Privacy science</button>', '')
    .replace(/<section data-tool-panel="science"[^\n]+<\/section>\n/, '');
  assert.equal(digest(historicalTemplate), '361bf2bef237f71c9324cbca4c57cf268a8724c0fb69b2516d64638d1215933b');
});

test('original renderer trajectories and motion families survive without later parking',()=>{
  const source=read('holonomy-loom/instrument-state-view-classic79.js').replace("from './tutorial-membrane-classic79.js'","from './tutorial-membrane.js'");
  assert.equal(createHash('sha256').update(source).digest('hex'),'e39deb8da3ec3c509bdca1843a71b75751b997f90a4e2ed4f785a57f76148fb4');
  assert.match(js,/durationMs: 4000/);assert.doesNotMatch(source,/parkedX|parkedY/);
});
