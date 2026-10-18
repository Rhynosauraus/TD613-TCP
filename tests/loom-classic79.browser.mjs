/* Real historical-route browser witness. No provider, physical-device or human acceptance credit. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname,join} from 'node:path';
import {chromium,webkit} from 'playwright';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir=resolve(process.env.TD613_CLASSIC79_ARTIFACT_DIR||'artifacts/loom-classic79-browser');
await mkdir(dir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=resolve('app'),served={},errors=[],checks=[];
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(req.method!=='GET'||!file.startsWith(root+sep))throw Error('not an app file');
  const b=await readFile(file);served[file.slice(root.length)]=hash(b);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff':'font/woff'})[extname(file)]||'application/octet-stream');res.end(b);
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const report={schema:'td613.loom.original-procession-browser/v0.3',status:'HELD',
 source_head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 working_tree_dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim()),
 historical_reference:'8096f05dbf19a7bda25948e9aa988645a690388c',observation:'LOCAL_REAL_BROWSER_CANDIDATE',
 physical_device_observed:false,operator_visual_acceptance:false,provider_calls:0,empirical_qualification:0,served,checks,errors};
const engines=process.env.TD613_CLASSIC79_BROWSER==='chromium'?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const record=(name,data)=>checks.push({name,pass:true,...data});
const operators=[['gathering',['à']],['bounded_emergence//protected_continuity',['hõt','cōl']],['created_potential',['上']],['release',['出']],['recurrence',['米']],['released_tendency',['下']],['structural_rest',['𝄐']]];
async function operatorScreen(page,screen){
 const [relation,glyphs]=operators[screen-1];
 await page.waitForFunction(({screen,relation})=>document.querySelector('#loomAiWorkspace').dataset.firstCrossingScreen===String(screen)&&document.querySelector('#aiRuntimeState').dataset.illustratedRelation===relation,{screen,relation});
 const observed=await page.locator('.loom-field-flight text').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.textContent))].sort());
 assert.deepEqual(observed,glyphs.slice().sort());
 return {screen,relation,glyphs:observed};
}
async function scene(page,n){
 await page.waitForFunction(n=>document.querySelector('#loomAiWorkspace').dataset.firstCrossingStep===String(n),n);
 if(n===1)await page.locator('#loomFirstCrossingAction').waitFor({state:'visible'});
 if(n>=2&&n<=5)await page.locator('#loomFirstCrossingStop').waitFor({state:'visible'});
 if(n>0)await operatorScreen(page,n+1);
}
async function glyphCoverage(page,selector,glyph){
 await page.evaluate(()=>document.fonts.ready);
 const o=await page.locator(selector).evaluate((node,glyph)=>{
  const s=getComputedStyle(node),font=`${s.fontWeight} 40px ${s.fontFamily}`;
  const raster=t=>{const c=document.createElement('canvas');c.width=100;c.height=80;const x=c.getContext('2d');x.font=font;x.fillText(t,5,55);return [...x.getImageData(0,0,100,80).data];};
  const a=raster(glyph),b=raster('\u{10FFFF}');return {glyph,font:s.fontFamily,ink:a.some(v=>v!==0),distinct:a.some((v,i)=>v!==b[i])};
 },glyph);
 assert.ok(o.ink&&o.distinct,`Glyph ${glyph} must differ from missing-glyph box`);return o;
}
async function bounded(context,engine,posture){
 await context.route('**/*',route=>{
  const r=route.request();if(r.method()!=='GET'||new URL(r.url()).pathname.startsWith('/api/')){
   errors.push({engine,posture,message:'Unrequested mutation/API request: '+r.url()});return route.abort();
  }return route.continue();
 });
}
try{
 for(const [engine,type]of engines){
  const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.TD613_BROWSER_EXECUTABLE_PATH?{executablePath:process.env.TD613_BROWSER_EXECUTABLE_PATH}:{})});
  try{
   for(const [posture,width,height]of [['desktop',1280,800],['mobile',390,844],['reference-mobile',428,735]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(()=>{Math.random=()=>0.19;});await bounded(context,engine,posture);
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push({engine,posture,message:e.message}));
    await page.goto(origin+'/dome-world/holonomy-loom-classic79.html');await page.waitForSelector('html[data-loom-boot="ready"]');
    for(let n=0;n<7;n++){
     await scene(page,n);
     const state=await page.evaluate(()=>{
      const p=document.querySelector('#loomFirstCrossing'),r=p.getBoundingClientRect();
      return {boot:document.documentElement.dataset.loomBoot,step:document.querySelector('#loomAiWorkspace').dataset.firstCrossingStep,screen:document.querySelector('#loomAiWorkspace').dataset.firstCrossingScreen,
       heading:document.querySelector('#loomFirstCrossingTitle').textContent,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
       panel:[r.x,r.y,r.width,r.height],carriers:document.querySelectorAll('.loom-field-flight text').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
     });
     assert.equal(state.heading,['Firewall your online life from AI.','What does the answer need?','Follow the clues.','A small piece can say a lot.','The clues add up.','Did the answer help?','What could a stranger work out?'][n]);
     assert.equal(state.boot,'ready');assert.equal(state.overflow,false);assert.equal(state.carriers,39);
     await page.screenshot({path:join(dir,`${engine}-${posture}-scene-${n}.png`),fullPage:true});record('historical-scene',{engine,posture,scene:n,state});
     if(n===6)break;
     if(n===0){
      await page.locator('[data-first-crossing-item="brief"]').click();const gather=await operatorScreen(page,1);
      assert.equal(await page.locator('#loomAiWorkspace').getAttribute('data-loom-intro'),'false');
      assert.equal(await page.locator('#loomFirstCrossing').evaluate(n=>n===document.activeElement),true);
      assert.equal(await page.locator('#loomFirstCrossingTitle').textContent(),'A good question is personal.');
      await page.screenshot({path:join(dir,`${engine}-${posture}-gather-screen.png`),fullPage:true});record('distinct-gather-screen',{engine,posture,...gather});
      await page.locator('[data-first-crossing-item="source"]').click();
     }
     else if(n===1)await page.locator('#loomFirstCrossingAction').click();
     else if(n===2){
      await page.locator('#loomTutorialArtifact > summary').click();
      const text=await page.locator('#loomTutorialArtifactRecord').textContent(),a=JSON.parse(text);
      assert.match(a.task,/job in another city/);assert.deepEqual(a.documents.map(d=>d.id),['brief','source']);
      assert.equal(a.governance.input_digest,a.portable_governance.selected_input_digest);assert.ok(a.portable_governance.mechanisms.length>0);assert.equal(text.includes('My sister and I argued'),false);
      await page.locator('#loomTutorialArtifactRecord').focus();await page.keyboard.press('End');
      assert.equal(await page.locator('#loomTutorialArtifactRecord').evaluate(e=>e===document.activeElement),true);
      await page.screenshot({path:join(dir,`${engine}-${posture}-artifact-inspection.png`),fullPage:true});
      await page.locator('#loomTutorialArtifact > summary').click();
      record('complete-artifact-inspection',{engine,posture,input_digest:a.governance.input_digest,mechanisms:a.portable_governance.mechanisms.length});
      await page.locator('#loomFirstCrossingStop').dblclick();await scene(page,3);
      assert.equal(await page.locator('#loomTutorialArtifact').evaluate(e=>e.open),false);record('native-double-click-one-action',{engine,posture});
     }else if(n===3){
      await page.locator('#loomFirstCrossingStop').focus();await page.keyboard.down('Enter');await scene(page,4);await page.keyboard.down('Enter');
      assert.equal(await page.locator('#loomAiWorkspace').getAttribute('data-first-crossing-step'),'4');await page.keyboard.up('Enter');record('held-enter-one-action',{engine,posture});
     }else await page.locator('#loomFirstCrossingStop').click();
    }
    const glyphs=[];for(const g of ['出','米','下','𝄐'])glyphs.push(await glyphCoverage(page,`[data-flowcore-copy="${g}"]`,g));
    glyphs.push(await glyphCoverage(page,'#loomFirstCrossingStop','出'));record('bundled-glyph-raster',{engine,posture,glyphs});
    await page.locator('#loomBegin').click();await page.locator('#aiTask').waitFor({state:'visible'});
    await page.locator('#loomToolsOpen').focus();await page.keyboard.press('Enter');await page.locator('#loomToolsClose').click();
    await page.waitForFunction(()=>document.activeElement?.id==='loomToolsOpen');
    await page.locator('#loomReturnThreshold').click();await scene(page,0);assert.equal(await page.locator('#loomTutorialArtifactRecord').textContent(),'');
    await page.locator('#loomFirstCrossingLeave').click();await page.locator('#aiTask').waitFor({state:'visible'});
    await page.reload();await page.waitForSelector('html[data-loom-boot="ready"]');await scene(page,0);record('finish-focus-replay-skip-reload',{engine,posture});await context.close();
   }
   // Observe the whole normal-motion procession, not just a final resting frame.
   // Screenshots and samples use the product's existing single clock.
   for(const [posture,width,height]of [['mobile-motion',390,844],['desktop-motion',1280,800]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});await bounded(context,engine,posture);
    await context.addInitScript(()=>{Math.random=()=>0.19;});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push({engine,posture,message:e.message}));
    await page.goto(origin+'/dome-world/holonomy-loom-classic79.html');await page.waitForSelector('html[data-loom-boot="ready"]');
    await page.screenshot({path:join(dir,`${engine}-${posture}-screen-0.png`),fullPage:true});
    await page.locator('[data-first-crossing-item="brief"]').click();
    for(let screen=1;screen<=7;screen++){
     const identity=await operatorScreen(page,screen);
     const samples=[];
     for(let sample=0;sample<3;sample++){
      await page.waitForTimeout(sample===0?350:1100);
      if(screen===1&&sample===0)assert.equal(await page.locator('[data-first-crossing-item="source"]').isDisabled(),true);
      samples.push(await page.locator('.loom-field-flight text').evaluateAll(nodes=>nodes.map(n=>({glyph:n.textContent,relation:n.dataset.flightRelation,x:n.getAttribute('x'),y:n.getAttribute('y'),transform:n.getAttribute('transform')}))));
      await page.screenshot({path:join(dir,`${engine}-${posture}-screen-${screen}-frame-${sample}.png`),fullPage:true});
     }
     assert.equal(await page.locator('#loomAiWorkspace').getAttribute('data-first-crossing-screen'),String(screen));
     assert.notEqual(JSON.stringify(samples[0]),JSON.stringify(samples[1]),'The original score must move before resting');
     record('normal-motion-operator-screen',{engine,posture,...identity,samples});
     if(screen===7)break;
     if(screen===1)await page.locator('[data-first-crossing-item="source"]').click();
     else if(screen===2)await page.locator('#loomFirstCrossingAction').click();
     else await page.locator('#loomFirstCrossingStop').click();
    }
    await context.close();
   }
  }finally{await browser.close();}
 }
 assert.equal(errors.length,0,JSON.stringify(errors));report.status='PASS';
}catch(e){errors.push({message:e.stack});report.status='FAILED';}
finally{server.close();await writeFile(join(dir,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,engines:engines.map(([n])=>n),checks:checks.length,errors}));
assert.equal(report.status,'PASS','Recovered presentation and protected interactions must complete');
