const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1440,height:900}});
 await page.goto(process.env.TEST_APP_URL||'http://127.0.0.1:5180/');await page.locator('.ep-install-android').click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});const box=await dialog.boundingBox();assert(box.width<=width-16);assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));const steps=await page.locator('.ep-install-steps li').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y}}));if(width>=700){assert(steps[1].x>steps[0].x);assert(box.height<700)}else assert(steps[1].y>steps[0].y);await dialog.screenshot({path:`outputs/install-modal-${width}.png`})}
 console.log('PASS: wider two-column desktop install dialog; single-column mobile; no horizontal overflow.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
