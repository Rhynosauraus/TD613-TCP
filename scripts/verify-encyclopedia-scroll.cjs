// Optional browser witness: supply a local Playwright installation and Chromium.
// This models mobile viewport changes; it does not establish physical iOS behavior.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch();const witnesses=[];
 try{
  for(const width of [358,390,430]){
   const page=await browser.newPage({viewport:{width,height:670},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   await page.goto(pathToFileURL(resolve(__dirname,'../app/encyclopedia/index.html')).href);
   await page.evaluate(()=>document.fonts.ready);
   const geometry=()=>page.evaluate(()=>Object.fromEntries(['.hero','.hero-art img','.cover-title','.cover-marginalia','.cover-bottom'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{top:r.top+scrollY,height:r.height}]})));
   const before=await geometry();await page.setViewportSize({width,height:780});const after=await geometry();assert.deepEqual(after,before,'toolbar-height change moved cover at '+width);
   await page.setViewportSize({width,height:670});assert.deepEqual(await geometry(),before);
   const chrome=await page.evaluate(()=>{const h=document.querySelector('.site-header'),s=getComputedStyle(h),copy=document.querySelector('.cover-bottom').getBoundingClientRect(),word=document.querySelector('.cover-word-two').getBoundingClientRect();return {position:s.position,bg:s.backgroundColor,margin:s.marginBottom,headerHeight:h.getBoundingClientRect().height,copyGap:copy.top-word.bottom,horizontalOverflow:document.documentElement.scrollWidth-innerWidth}});
   assert.equal(chrome.position,'fixed');assert.equal(chrome.bg,'rgba(0, 0, 0, 0)');assert.equal(chrome.margin,'0px');assert(chrome.copyGap>=10);assert.equal(chrome.horizontalOverflow,0);
   await page.evaluate(()=>{window.historyWrites=0;for(const key of ['replaceState','pushState']){const original=history[key].bind(history);history[key]=(...args)=>{window.historyWrites++;return original(...args)}}});
   await page.mouse.move(width/2,400);await page.mouse.wheel(0,420);await page.waitForTimeout(200);const scroll=await page.evaluate(()=>({y:scrollY,writes:historyWrites,headerTop:document.querySelector('.site-header').getBoundingClientRect().top}));assert(scroll.y>0);assert.equal(scroll.writes,0);assert.equal(scroll.headerTop,0);
   await page.getByRole('button',{name:'Open section navigation',exact:true}).click();await page.locator('#mobileNav [data-view="lexicon"]').click();await page.waitForTimeout(50);
   await page.mouse.wheel(0,500);await page.waitForTimeout(200);const lexicalY=await page.evaluate(()=>scrollY);
   await page.getByRole('button',{name:'Open section navigation',exact:true}).click();assert.equal(await page.evaluate(()=>scrollY),lexicalY,'opening the mobile menu moved the page');await page.locator('#mobileNav [data-view="evidence"]').click();await page.waitForTimeout(50);
   await page.goBack();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.dataset.view),'lexicon');assert.equal(await page.evaluate(()=>scrollY),lexicalY);
   await page.goBack();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.dataset.view),'overview');assert.equal(await page.evaluate(()=>scrollY),scroll.y);
   const reference=await page.evaluate(async()=>({first:TD613Reference.search('G-101').hits[0].id,integrity:await TD613Reference.verify()}));assert.equal(reference.first,'G-101');assert.equal(reference.integrity.verified,835);
   witnesses.push({width,toolbar_resize:'stable',history_writes_during_scroll:scroll.writes,transparent_single_header:chrome.headerHeight,copy_gap:chrome.copyGap,back_restored:true,reference_records_verified:reference.integrity.verified});
   await page.close();
  }
  const fs=require('node:fs'),{createHash}=require('node:crypto');
  const receipt={browser:'Chromium',browser_version:browser.version(),artifact_html_sha256:createHash('sha256').update(fs.readFileSync(resolve(__dirname,'../app/encyclopedia/index.html'))).digest('hex'),scope:'Emulated portrait widths and height-only viewport changes; physical iOS remains unobserved.',witnesses};
  if(process.env.TD613_SCROLL_RECEIPT)fs.writeFileSync(process.env.TD613_SCROLL_RECEIPT,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
