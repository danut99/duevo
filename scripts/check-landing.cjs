const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
const page=await browser.newPage({viewport:{width:1365,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5180/');
await page.getByRole('heading',{level:1,name:/Actele tale/}).waitFor();
assert.equal(await page.locator('a[href^="#"]').count(),0);
await page.screenshot({path:'outputs/landing-desktop.png',fullPage:true});
await page.getByRole('link',{name:'Începe gratuit',exact:true}).first().click();
await page.waitForURL('**/register');
await page.getByRole('heading',{name:'Creează un cont.'}).waitFor();
await page.getByRole('link',{name:'Ai deja un cont? Intră în cont'}).click();
await page.waitForURL('**/login');
await page.getByRole('heading',{name:'Bine ai venit.'}).waitFor();
await page.goto('http://127.0.0.1:5180/app');
await page.waitForURL('**/login?next=*');
await page.goto('http://127.0.0.1:5180/');
await page.setViewportSize({width:375,height:812});
await page.getByRole('heading',{level:1,name:/Actele tale/}).waitFor();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile layout overflows');
await page.getByText('Primesc notificări automat?',{exact:true}).click();
await page.getByText('Da, după activare în pagina Reamintiri',{exact:false}).waitFor();
await page.screenshot({path:'outputs/landing-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log('PASS: landing, registration/login links, protected route redirect, mobile overflow, FAQ, no runtime errors.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});


