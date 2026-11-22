const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.goto(process.env.TEST_APP_URL||'http://127.0.0.1:5180/');await page.locator('.du-language-dialog[open]').waitFor();
 const backdrop=await page.locator('.du-language-dialog').evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter);assert.equal(backdrop,'none');
 assert(await page.locator('.du-language-background-paused').evaluate(el=>el.inert));
 assert(await page.locator('.du-language-background-paused').evaluate(el=>Array.from(el.querySelectorAll('*')).every(node=>getComputedStyle(node).animationPlayState.split(',').every(value=>value.trim()==='paused'))));
 await page.getByRole('radio',{name:/English/}).check();await page.locator('#duevo-guide-country').selectOption('RO');await page.locator('.du-language-continue').click();await page.locator('.du-language-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('.du-language-background-paused').count(),0);
 await page.evaluate(()=>window.dispatchEvent(new Event('duevo:choose-language')));await page.locator('.du-language-dialog[open]').waitFor();await page.keyboard.press('Escape');await page.locator('.du-language-dialog').waitFor({state:'hidden'});
 for(const theme of ['carbon','obsidian']){
 await page.evaluate(theme=>{localStorage.setItem('expiry-pocket-theme',theme);document.querySelector('.pocket-app').setAttribute('data-theme',theme);window.dispatchEvent(new Event('duevo:choose-language'))},theme);await page.locator('.du-language-dialog[open]').waitFor();assert.equal(await page.locator('.du-language-dialog').getAttribute('data-theme'),theme);const background=await page.locator('.du-language-dialog').evaluate(el=>getComputedStyle(el).backgroundColor);assert.equal(background,theme==='obsidian'?'rgb(21, 21, 24)':'rgb(250, 249, 245)');await page.keyboard.press('Escape');await page.locator('.du-language-dialog').waitFor({state:'hidden'});
 }
 console.log('PASS: no fullscreen blur; background animations paused and inert while modal is open; language/country selection, resume and reopen work.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
