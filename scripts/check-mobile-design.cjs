const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5182';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const date=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE')};
 const docs=[{id:'rca',name:'Asigurare RCA',category:'Vehicles',reference:'BN 24 EXP • RO/24/884129',expires:date(9),issued_on:date(-356),days:30,reminder_days:[30,14,7],version:1,notes:''},{id:'rov',name:'Rovinietă',category:'Vehicles',reference:'BN 24 EXP',expires:date(-5),days:14,notes:''},{id:'ci',name:'Carte de Identitate',category:'Personal',reference:'XB 482910',expires:date(90),days:30,notes:''}];
 await page.route('**/rest/v1/documents*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(docs)}));
 await page.route('**/rest/v1/document_revisions*',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 await page.route('**/functions/v1/push*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({configured:false,publicKey:null,scheduleReady:false,lastRun:null})}));
 await page.route('**/src/main.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import Dashboard from '/src/Dashboard.tsx';import '/src/styles.css';import '/src/dark.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard,{displayName:'Andrei Popescu',onSignOut:()=>{window.signedOut=true}}));"}));
 await page.goto(base+'/app');await page.getByRole('heading',{name:'Următoarea Expirare'}).waitFor();
 assert.deepEqual(await page.locator('.ep-dashboard>section h2').allTextContents(),['Status Documente','Dosare','Următoarea Expirare']);
 for(const theme of ['Obsidian Glow','Carbon Contrast']){
  await page.getByRole('button',{name:'Schimbă tema',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click();
  for(const path of ['/app','/documents','/documents/new','/documents/rca','/reminders']){
   await page.goto(base+path);await page.locator('.ep-screen').waitFor();await page.waitForTimeout(120);
   for(const width of [320,390,430,700,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme} ${path}: overflow at ${width}`)}
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:`outputs/reference-${theme.split(' ')[0].toLowerCase()}-${path.replaceAll('/','-')}.png`,fullPage:true});
  }
 }
 assert.equal(await page.locator('.pocket-app').getAttribute('data-theme'),'carbon');
 await page.goto(base+'/documents/new');await page.getByRole('button',{name:/Asigurare RCA/}).click();await page.getByLabel('Numele actului',{exact:true}).fill('RCA test draft');await page.getByLabel('Serie poliță / act').fill('TEST-42');await page.getByRole('checkbox',{name:'Cu 14 zile înainte',exact:true}).click();assert.equal(await page.getByLabel('Numele actului',{exact:true}).inputValue(),'RCA test draft');assert.equal(await page.getByLabel('Serie poliță / act').inputValue(),'TEST-42');
 await page.getByRole('button',{name:'Schimbă',exact:true}).click();await page.getByRole('button',{name:'Personal & ID',exact:true}).click();await page.getByRole('button',{name:/Carte de Identitate/}).click();assert.equal(await page.locator('#inp-vehicle').count(),0);assert.equal(await page.locator('input[type=file]').count(),0);
 for(const width of [320,390,700]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Step 2 overflow '+width)}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/reference-add-step2.png',fullPage:true});
 await page.goto(base+'/reminders');await page.getByRole('button',{name:'Marchează tot văzut'}).click();await page.getByText('✓ TOTUL LA ZI',{exact:true}).waitFor();await page.getByRole('button',{name:'Expirate 1',exact:true}).click();assert.equal(await page.locator('.ep-alert-document').count(),1);
 await page.goto(base+'/app');await page.locator('#quick-search').fill('RCA');await page.getByRole('button',{name:'Caută',exact:true}).click();await page.waitForURL('**/documents');assert.equal(await page.locator('.ep-document').count(),1);
 const publicPage=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});publicPage.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/login','/register']){await publicPage.goto(base+path);await publicPage.locator('.pocket-app').waitFor();for(const width of [320,390,1280]){await publicPage.setViewportSize({width,height:844});assert(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Public screen overflow '+path+' '+width)}await publicPage.setViewportSize({width:390,height:844});await publicPage.screenshot({path:`outputs/reference-public-${path.replaceAll('/','')||'intro'}.png`,fullPage:true});}
 await publicPage.goto(base+'/');await publicPage.getByRole('button',{name:'Acte ID ID & ACTE',exact:true}).click();assert((await publicPage.locator('.ep-benefit-detail').innerText()).includes('Buletin, Permis & Pașaport'));await publicPage.getByRole('button',{name:'Link app',exact:true}).click();await publicPage.getByRole('dialog').waitFor();await publicPage.getByRole('dialog').getByRole('button',{name:'iPhone (iOS)',exact:true}).click();assert((await publicPage.locator('.ep-install-instructions').innerText()).includes('Safari'));await publicPage.keyboard.press('Escape');assert.equal(await publicPage.getByRole('dialog').count(),0);await publicPage.getByRole('button',{name:'Disponibil pe Android',exact:true}).click();assert((await publicPage.locator('.ep-install-instructions').innerText()).includes('Chrome'));await publicPage.getByRole('button',{name:'Închide',exact:true}).click();await publicPage.screenshot({path:'outputs/reference-latest-intro.png',fullPage:true});assert((await publicPage.getByRole('link',{name:'Adaugă act',exact:true}).getAttribute('href')).includes('/login?next='));
 assert.deepEqual(errors,[]);console.log('PASS: all screens/themes at 320–1280px; new intro benefit selection, installation dialog/iOS/Android/Escape, auth redirects; two-step form; alert filters; existing document flows and responsive layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
