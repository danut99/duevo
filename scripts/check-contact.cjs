const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('duevo-language','ro');localStorage.setItem('duevo-country','RO')});
 await page.route('https://**/auth/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 const base=process.env.TEST_APP_URL||'http://127.0.0.1:5181';
 await page.goto(base+'/contact');await page.locator('#contact-title').waitFor();
 assert.equal(await page.locator('.du-contact-email').getAttribute('href'),'mailto:hello.duevo@gmail.com');
 assert.equal(await page.locator('a[target="_blank"]').getAttribute('href'),'https://www.tiktok.com/@duevo8');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.locator('.du-contact-actions button').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'hello.duevo@gmail.com');
 fs.mkdirSync('outputs/contact',{recursive:true});
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});for(const theme of ['obsidian','carbon']){
 await page.locator('.du-contact').evaluate((el,t)=>el.dataset.theme=t,theme);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`outputs/contact/${theme}-${width}.png`,fullPage:true});
 }}
 await page.goto(base+'/');await page.locator('.du-welcome-footer a').click();await page.waitForURL('**/contact');
 assert.deepEqual(errors,[]);console.log('PASS: public contact route, footer navigation, email/TikTok links, clipboard and responsive layout in both themes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
