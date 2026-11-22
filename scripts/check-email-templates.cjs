const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();
 for(const name of ['test','reminder','reset-password','test-en','reminder-en','reset-password-en']){
  for(const width of [390,720]){
   await page.setViewportSize({width,height:1000});
   await page.setContent(readFileSync('outputs/email-templates/'+name+'.html','utf8'));
   assert.equal(await page.locator('h1').count(),1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' must fit mobile');
   assert(await page.getByRole('link',{name:/Vezi|Alege|View|Choose/}).isVisible());
   assert.equal(await page.locator('img').count(),0,'Template must work without loading external images');
   await page.screenshot({path:`outputs/email-templates/${name}-${width}.png`,fullPage:true});
  }
 }
 console.log('PASS: three email templates render at mobile and desktop widths without overflow or external image dependencies.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
