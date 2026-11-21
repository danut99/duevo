const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>(errors.push(e.message),console.error('PAGE',e.message)));
await page.goto('http://127.0.0.1:5175/login');await page.getByRole('heading',{name:'Bine ai venit.'}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Login overflows on mobile');await page.screenshot({path:'outputs/dark-login.png',fullPage:true});
await page.goto('http://127.0.0.1:5175/');await page.getByRole('heading',{level:1,name:/Actele tale/}).waitFor();await page.screenshot({path:'outputs/dark-landing-mobile.png',fullPage:true});
await page.route('**/rest/v1/documents*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([
{id:'sample-rca',name:'RCA Dacia',category:'Vehicles',reference:'B 123 ABC',expires:'2026-12-12',days:30,notes:'',file_name:null,file_key:null},
{id:'sample-itp',name:'Inspecție tehnică',category:'Vehicles',reference:'B 123 ABC',expires:'2026-11-18',days:30,notes:'',file_name:null,file_key:null},
{id:'sample-id',name:'Buletin',category:'Personal',reference:'',expires:'2028-05-20',days:30,notes:'',file_name:null,file_key:null}
])}));
// Render the actual dashboard in an isolated browser fixture; no account or backend records are created.
await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import Dashboard from '/src/Dashboard.tsx';import '/src/styles.css';import '/src/dark.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard,{displayName:'Maria',onSignOut:()=>{}}));`}));
await page.goto('http://127.0.0.1:5175/app');console.log('fixture URL',page.url());await page.getByRole('heading',{name:'Bun venit, Maria!'}).waitFor();await page.locator('.next-document').waitFor();
assert.equal(await page.locator('.simple-document').count(),3);assert.equal(await page.locator('.folder-button').count(),2);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'outputs/dark-dashboard-mobile.png',fullPage:true});
assert((await page.locator('.priority-name h3').innerText()).includes('Inspecție'));
await page.getByRole('button',{name:'Vezi detaliile',exact:true}).click();await page.waitForURL('**/documents/sample-itp');await page.getByRole('heading',{name:'Actul a expirat',exact:true}).waitFor();assert.equal(await page.locator('.document-journey li').count(),3);await page.screenshot({path:'outputs/document-journey-mobile.png',fullPage:true});
await page.getByRole('navigation').getByRole('link',{name:'Acasă'}).click();await page.locator('.folder-button').filter({hasText:'Personal'}).click();await page.waitForURL('**/documents?category=Personal');assert.equal(await page.locator('.simple-document').count(),1);await page.reload();await page.locator('.simple-document').waitFor();assert.equal(await page.locator('.simple-document').count(),1);await page.getByRole('button',{name:'Arată toate dosarele'}).click();
await page.getByRole('navigation').getByRole('link',{name:'Actele mele'}).click();await page.waitForURL('**/documents');await page.getByRole('button',{name:'Expirate',exact:true}).click();assert.equal(await page.locator('.simple-document').count(),1);
await page.getByRole('link',{name:'Adaugă un act',exact:true}).click();await page.waitForURL('**/documents/new');await page.getByRole('button',{name:'RCA',exact:true}).click();assert.equal(await page.getByLabel('Numele actului',{exact:true}).inputValue(),'RCA');assert.equal(await page.locator('select[name=category] option').count(),2);await page.screenshot({path:'outputs/dark-add-mobile.png',fullPage:true});
await page.getByRole('navigation').getByRole('link',{name:'Reamintiri'}).click();await page.getByText('Notificările automate nu sunt active',{exact:true}).waitFor();await page.screenshot({path:'outputs/dark-reminders-mobile.png',fullPage:true});
await page.getByRole('navigation').getByRole('link',{name:'Acasă'}).click();await page.setViewportSize({width:1365,height:1000});await page.screenshot({path:'outputs/dark-dashboard-desktop.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS: dark landing/login/dashboard, mobile overflow, next expiry card, document filtering, real page navigation, add presets, reminder status; no runtime errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});









