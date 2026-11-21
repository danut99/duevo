const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/rest/v1/documents*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:'test',name:'RCA Dacia',category:'Vehicles',reference:'B 123 ABC',expires:'2026-11-18',days:30,notes:'',file_name:null,file_key:null}])}));
await page.route('**/src/main.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import Dashboard from '/src/Dashboard.tsx';import '/src/styles.css';import '/src/dark.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard,{displayName:'Darren Popescu',onSignOut:()=>{window.logoutClicked=true}}));"}));
await page.goto('http://127.0.0.1:5173/app');
await page.locator('.mobile-greeting strong').waitFor();
assert.equal(await page.locator('.mobile-greeting strong').innerText(),'Darren');
assert.equal(await page.locator('.mobile-profile-avatar').innerText(),'DP');
await page.locator('.mobile-reminder-dot').waitFor();
await page.screenshot({path:'outputs/mobile-profile-header.png',fullPage:false});
for(const width of [320,390,700]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow at '+width);}
await page.locator('.mobile-reminder-button').click();await page.waitForURL('**/reminders');
await page.getByRole('heading',{name:'Reamintirile tale'}).waitFor();
await page.locator('.mobile-account-menu summary').click();await page.locator('.mobile-account-popover button').click();assert(await page.evaluate(()=>window.logoutClicked));
await page.setViewportSize({width:1280,height:900});assert(await page.locator('.desktop-account-header').isVisible());assert(!(await page.locator('.mobile-account-header').isVisible()));
assert.deepEqual(errors,[]);console.log('PASS: mobile greeting, initials, due indicator, reminders navigation, account sign-out, responsive widths and desktop header; no browser errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
