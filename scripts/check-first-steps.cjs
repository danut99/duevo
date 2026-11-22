const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
process.loadEnvFile('.env.local');
const ref=new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
const uid='11111111-1111-4111-8111-111111111111',wallet='22222222-2222-4222-8222-222222222222';
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5184';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));let docs=[],tests=0;
 await page.addInitScript(({uid,ref})=>{if(!localStorage.getItem('duevo-language'))localStorage.setItem('duevo-language','ro');localStorage.setItem('duevo-country','RO');localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated'}}));},{uid,ref});
 await page.route('**/auth/v1/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated'})}));
 await page.route('**/rest/v1/**',async r=>{const req=r.request(),url=new URL(req.url());let response=[];
 if(url.pathname.endsWith('/wallet_profiles'))response=[{id:wallet,user_id:uid,name:'Eu',is_default:true}];
 else if(url.pathname.endsWith('/rpc/ensure_wallet_profile'))response=wallet;
 else if(url.pathname.endsWith('/documents')){if(req.method()==='POST'){const row={...req.postDataJSON(),version:1};docs.push(row);response=row}else response=docs;}
 await r.fulfill({contentType:'application/json',body:JSON.stringify(response)});});
 await page.route('**/functions/v1/**',async r=>{const body=r.request().postDataJSON();if(body.action==='test'){tests++;await r.fulfill({contentType:'application/json',body:'{"accepted":true}'});return}await r.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,publicKey:null,verified:true,email:'fixture@example.test',preferences:{enabled:true,hour:9,timezone:'UTC'}})});});
 await page.route('**/src/main.tsx*',r=>r.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import Dashboard from '/src/Dashboard.tsx';import '/src/styles.css';import '/src/dark.css';import '/src/carbon.css';import '/src/usability.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard,{displayName:'Maria',onSignOut:()=>{}}));`}));
 await page.goto(base+'/documents');await page.locator('.du-first-steps').waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/first-steps-'+width+'.png',fullPage:true});}
 await page.evaluate(()=>{localStorage.setItem('duevo-language','en');localStorage.setItem('expiry-pocket-theme','carbon')});await page.reload();await page.getByRole('heading',{name:'Welcome to Duevo.',exact:true}).waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/first-steps-en-carbon-'+width+'.png',fullPage:true});}
 await page.evaluate(()=>{localStorage.setItem('duevo-language','ro');localStorage.setItem('expiry-pocket-theme','obsidian')});await page.reload();await page.getByRole('heading',{name:'Bine ai venit în Duevo.',exact:true}).waitFor();
 await page.getByRole('button',{name:/Act auto/}).click();await page.locator('.ep-type-grid').waitFor();await page.locator('.ep-type-grid button').first().click();assert(await page.getByRole('button',{name:'Salvează mașina',exact:true}).isVisible());
 await page.goto(base+'/documents');await page.getByRole('button',{name:/Alt termen/}).click();assert(await page.getByRole('heading',{name:'Adaugă termen',exact:true}).isVisible());assert.equal(await page.locator('#inp-title').inputValue(),'');assert.equal(await page.locator('#inp-expiry').inputValue(),'');
 await page.goto(base+'/documents');await page.getByRole('button',{name:'Mai târziu',exact:true}).click();assert.equal(await page.locator('.du-first-steps').count(),0);await page.reload();await page.locator('.ep-documents').waitFor();assert.equal(await page.locator('.du-first-steps').count(),0);
 await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('duevo-first-steps-'))localStorage.removeItem(key)});await page.reload();await page.getByRole('button',{name:/Act personal/}).click();await page.locator('.ep-type-grid button').first().click();await page.locator('#inp-series').fill('XB 123456');await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();
 await page.getByRole('heading',{name:'Primul act este salvat.',exact:true}).waitFor();assert.equal(docs.length,1);await page.getByRole('button',{name:'Trimite email de test',exact:true}).click();await page.getByRole('status').filter({hasText:'Inbox'}).waitFor();assert.equal(tests,1);await page.locator('.du-first-alerts').getByRole('button',{name:'Mai târziu',exact:true}).click();assert.equal(await page.locator('.du-first-alerts').count(),0);
 await page.keyboard.press('Escape');await page.goto(base+'/documents');await page.locator('.ep-documents').waitFor();assert.equal(await page.locator('.du-first-steps').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: empty-wallet choices, vehicle creation, direct blank custom term, persistent skip, first-save alert test, existing-wallet exclusion, responsive layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
