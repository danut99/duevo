const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
process.loadEnvFile('.env.local');
const projectRef=new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5192';
const uid='11111111-1111-4111-8111-111111111111',wallet='22222222-2222-4222-8222-222222222222';
const date=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const now=new Date(),today=date(now),lastMonth=date(new Date(now.getFullYear(),now.getMonth(),0)),nextMonth=date(new Date(now.getFullYear(),now.getMonth()+1,1));
let docs=[
 {id:'old',name:'Poliță pentru Ștefan',expires:lastMonth,entry_type:'document'},
 {id:'appointment',name:'Programare stomatolog',expires:today,entry_type:'other',event_time:'15:00'},
 {id:'next',name:'Pașaport viitor',expires:nextMonth,entry_type:'document'},
 {id:'done',name:'Deja rezolvat',expires:today,entry_type:'other',completed_at:new Date().toISOString()}
].map(d=>({user_id:uid,profile_id:wallet,category:'Personal',reference:'',notes:'Notiță personală în română',days:7,reminder_days:[7,1],version:1,...d}));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/auth/v1/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{duevo_language:'en'}})}));
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url());let response=[];
  if(url.pathname.endsWith('/wallet_profiles'))response=[{id:wallet,user_id:uid,name:'Ștefan',is_default:true}];
  else if(url.pathname.endsWith('/rpc/ensure_wallet_profile'))response=wallet;
  else if(url.pathname.endsWith('/documents')){
   const id=url.searchParams.get('id')?.replace('eq.','');
   if(req.method()==='POST'){const body=req.postDataJSON();assert.equal(body.category,'Personal');assert.equal(body.name,'Identity Card');const created={...body,version:1};docs.push(created);response=created}
   else if(req.method()==='PATCH'){const body=req.postDataJSON();assert.equal(id,'appointment');assert(body.completed_at);docs=docs.map(d=>d.id===id?{...d,...body,version:d.version+1}:d);response=docs.find(d=>d.id===id)}
   else response=id?docs.filter(d=>d.id===id):docs;
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(response)});
 });
 await page.route('**/functions/v1/**',route=>route.fulfill({contentType:'application/json',body:'{"configured":false,"preferences":null,"verified":true}'}));
 // Exercise the real first-visit language dialog and landing/auth screens.
 await page.goto(base+'/');
 const dialog=page.getByRole('dialog',{name:/Alege limba/});await dialog.waitFor();
 await page.keyboard.press('Escape');assert(await dialog.isVisible(),'First visit requires an explicit choice');
 await page.getByRole('radio',{name:/English/}).check();await page.getByLabel('Country for renewal guides').selectOption('OTHER');await page.getByRole('button',{name:'Continue in English'}).click();
 await page.getByRole('link',{name:'Sign in',exact:true}).first().waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
 await page.reload();await page.getByRole('link',{name:'Sign in',exact:true}).first().waitFor();assert.equal(await page.locator('.du-language-dialog[open]').count(),0);
 await page.goto(base+'/login');await page.getByRole('heading',{name:'Welcome back.',exact:true}).waitFor();
 await page.getByText('Sign in with email and password',{exact:true}).click();await page.getByRole('link',{name:'Forgot your password?'}).click();await page.getByRole('heading',{name:'Forgot your password?'}).waitFor();
 // Render the authenticated dashboard against an isolated database fixture.
 await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import LanguageRoot from '/src/LanguagePicker.tsx';import Dashboard from '/src/Dashboard.tsx';import '/src/styles.css';import '/src/dark.css';import '/src/carbon.css';import '/src/usability.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(LanguageRoot,null,React.createElement(Dashboard,{displayName:'Ștefan',onSignOut:()=>{}})));`}));
 const expires=Math.floor(Date.now()/1000)+3600,token=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:expires,aud:'authenticated',role:'authenticated'})).toString('base64url'),'fixture'].join('.');
 await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${projectRef}-auth-token`,session:{access_token:token,refresh_token:'fixture',token_type:'bearer',expires_at:expires,expires_in:3600,user:{id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',user_metadata:{duevo_language:'en'}}}});
 await page.goto(base+'/overview');await page.getByRole('heading',{name:'This month and overdue',exact:true}).waitFor();
 const plan=page.locator('.du-month-plan');await plan.getByRole('heading',{name:'Poliță pentru Ștefan',exact:true}).waitFor();
 assert.deepEqual(await plan.locator('article h3').allTextContents(),['Poliță pentru Ștefan','Programare stomatolog']);
 assert.equal(await plan.getByText('Pașaport viitor',{exact:true}).count(),0);assert.equal(await plan.getByText('Deja rezolvat',{exact:true}).count(),0);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'English overflow '+width);if(width!==320)await page.screenshot({path:`outputs/monthly-en-${width}.png`,fullPage:true})}
 await plan.getByRole('button',{name:'Mark as done',exact:true}).click();await plan.getByText('Deadline marked as done.',{exact:true}).waitFor();assert.equal(await plan.locator('article').count(),1);
 await plan.getByRole('button',{name:'Prepare documents',exact:true}).click();await page.waitForURL('**/documents/old?prepare=1');
 await page.getByRole('dialog',{name:'Document details',exact:true}).waitFor();assert(await page.getByRole('dialog',{name:'Document details',exact:true}).getByRole('heading',{name:'Poliță pentru Ștefan',exact:true}).isVisible());
 await page.getByRole('heading',{name:'Documents for your next step',exact:true}).waitFor();assert.equal(await page.locator('.ep-help-action,.ep-help-source,.ep-renewal-folder').count(),0,'No Romanian links or procedure packs for other countries');
 await page.keyboard.press('Escape');await page.waitForURL('**/overview');
 await page.locator('.ep-global-add').click();await page.getByRole('button',{name:'Personal & ID',exact:true}).click();await page.locator('.ep-type').filter({has:page.getByText('Identity Card',{exact:true})}).click();
 assert.equal(await page.locator('#inp-title').inputValue(),'Identity Card');await page.getByRole('button',{name:'Save to folder',exact:true}).click();try{await page.getByRole('dialog',{name:'Document details',exact:true}).getByRole('heading',{name:'Identity Card',exact:true}).waitFor({timeout:5000})}catch(error){await page.screenshot({path:'outputs/english-create-debug.png',fullPage:true});console.log('CREATE DEBUG',page.url(),await page.locator('.ep-error,[role=alert]').allTextContents(),await page.locator('input:invalid').evaluateAll(nodes=>nodes.map(n=>({id:n.id,value:n.value,message:n.validationMessage}))));throw error;}
 assert.equal(await page.locator('.ep-detail-hero .ep-document-name>small').innerText(),'CI');await page.keyboard.press('Escape');await page.waitForURL('**/overview');
 // English does not imply a foreign country: Romanian procedures remain available when explicitly selected.
 await page.getByRole('button',{name:'Change language',exact:true}).click();await page.getByLabel('Country for renewal guides').selectOption('RO');await page.getByRole('button',{name:'Continue in English'}).click();
 await page.locator('.du-month-plan').getByRole('button',{name:'Prepare documents',exact:true}).click();await page.locator('.ep-help-select select').selectOption('CI');
 await page.getByRole('link',{name:/Book CEI appointment/}).waitFor();assert((await page.getByRole('link',{name:/Book CEI appointment/}).getAttribute('href')).startsWith('https://hub.mai.gov.ro/'));
 await page.keyboard.press('Escape');await page.waitForURL('**/overview');
 await page.getByRole('button',{name:'Change language',exact:true}).click();await page.getByRole('radio',{name:/Română/}).check();await page.getByRole('button',{name:'Continuă în română'}).click();
 await page.getByRole('heading',{name:'Luna aceasta și restanțe',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.lang),'ro');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Romanian overflow '+width);if(width!==320)await page.screenshot({path:`outputs/monthly-ro-${width}.png`,fullPage:true})}
 await page.getByRole('link',{name:'Actele mele',exact:true}).click();await page.getByRole('button',{name:/Auto & Vehicul/}).click();assert(new URL(page.url()).searchParams.get('category')==='Vehicles','Stored category remains unchanged');
 // Switching language must not discard an unfinished form or reload the account.
 await page.locator('.ep-global-add').click();await page.getByRole('button',{name:/Asigurare RCA/}).click();await page.locator('#inp-title').fill('Nume introdus de utilizator');
 await page.getByRole('button',{name:'Schimbă limba',exact:true}).click();await page.getByRole('radio',{name:/English/}).check();await page.getByRole('button',{name:'Continue in English'}).click();assert.equal(await page.locator('#inp-title').inputValue(),'Nume introdus de utilizator');
 assert.deepEqual(errors,[]);console.log('PASS: first-visit language selection, persistence, English login/recovery, monthly scope and urgency, term completion, document actions, Romanian switch, user-content preservation, stable category keys and mobile/desktop layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
