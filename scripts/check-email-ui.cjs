const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});let enabled=false,sent=0;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/rest/v1/rpc/save_email_preferences',async route=>{const body=route.request().postDataJSON();assert.equal(body.preferred_hour,9);enabled=body.want_enabled;await route.fulfill({contentType:'application/json',body:'null'})});
 await page.route('**/functions/v1/email',async route=>{const {action}=route.request().postDataJSON();if(action==='test'){sent++;await route.fulfill({contentType:'application/json',body:'{"accepted":true}'})}else await route.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,verified:true,email:'owner@example.test',preferences:{enabled,hour:9,timezone:'UTC'},lastRun:new Date().toISOString()})})});
 await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import EmailSettings from '/src/EmailSettings.tsx';import '/src/styles.css';import '/src/dark.css';import '/src/pocket.css';import '/src/carbon.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('div',{className:'pocket-app ep-workspace','data-theme':'carbon',style:{padding:16}},React.createElement(EmailSettings)));`}));
 await page.goto('http://127.0.0.1:5192/reminders');await page.getByText('Email · Oprit',{exact:true}).click();
 const toggle=page.getByRole('switch',{name:'Alerte prin email'});await toggle.waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[role="switch"]').disabled);
 await toggle.click();await page.getByText('Emailurile au fost activate.',{exact:false}).waitFor();assert.equal(await toggle.getAttribute('aria-checked'),'true');
 await page.getByRole('button',{name:'Trimite email de test'}).click();await page.getByText('Gmail a acceptat emailul.',{exact:false}).waitFor();assert.equal(sent,1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/email-settings-mobile.png',fullPage:true});
 await toggle.click();await page.getByText('Emailurile au fost oprite.',{exact:true}).waitFor();assert.equal(enabled,false);assert.deepEqual(errors,[]);
 console.log('PASS: email opt-in, account recipient, test action, disable and mobile overflow. Mocked backend; no real emails sent.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
