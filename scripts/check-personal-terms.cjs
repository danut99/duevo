const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
process.loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL,ref=new URL(origin).hostname.split('.')[0];
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5192';
const uid='11111111-1111-4111-8111-111111111111',profile='22222222-2222-4222-8222-222222222222';
const user={id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Maria'}};
const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};
let docs=[],schema=true;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844},acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
  await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session:{access_token:jwt,refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
  await page.route(origin+'/**',async route=>{
   const req=route.request(),url=new URL(req.url());let data=[],status=200;
   if(url.pathname==='/auth/v1/user')data=user;
   else if(url.pathname==='/functions/v1/push')data={configured:false};
   else if(url.pathname==='/rest/v1/rpc/ensure_wallet_profile')data=null;
   else if(url.pathname==='/rest/v1/wallet_profiles')data=[{id:profile,user_id:uid,name:'Eu',is_default:true}];
   else if(url.pathname==='/rest/v1/documents'){
    if(url.searchParams.get('limit')==='0'){
     if(!schema&&url.searchParams.get('select')==='entry_type,event_time'){status=400;data={code:'42703',message:'missing column'}}
    }else if(req.method()==='POST'){
     const body=req.postDataJSON();assert.equal(body.profile_id,profile);assert.equal(body.entry_type,'other');assert.equal(body.category,'Personal');assert.equal(body.issued_on,null);assert.equal(body.reference,'');
     data={...body,version:1};docs.push(data);
    }else if(req.method()==='PATCH'){
     const doc=docs.find(d=>'eq.'+d.id===url.searchParams.get('id'));assert(doc);Object.assign(doc,req.postDataJSON(),{version:doc.version+1});data=[doc];
    }else data=docs;
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  async function newTerm(){
   await page.goto(base+'/documents/new?category=Personal');
   await page.locator('.ep-type').filter({hasText:'Altele'}).click();
   await page.getByRole('heading',{name:'Adaugă termen',exact:true}).waitFor();
   assert.equal(await page.locator('#inp-series').count(),0);
   assert.equal(await page.locator('#inp-issue').count(),0);
   assert.equal(await page.locator('.ep-duration').count(),0);
  }
  await newTerm();
  await page.getByLabel('Nume',{exact:true}).fill('Programare dentist');
  await page.getByLabel('Data termenului',{exact:true}).fill(date(3));
  await page.getByLabel('Ora (opțional)').fill('14:30');
  await page.getByLabel('Mențiuni (opțional)').fill('Cabinet, etaj 2\nIa dosarul');
  await page.screenshot({path:'outputs/personal-term-mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();
  await page.getByRole('heading',{name:'Detalii termen',exact:true}).waitFor();
  assert.equal(docs[0].event_time,'14:30');assert.equal(docs[0].notes,'Cabinet, etaj 2\nIa dosarul');assert.deepEqual(docs[0].reminder_days,[1]);
  assert.equal(await page.getByRole('button',{name:'Marchează reînnoit',exact:true}).count(),0);
  assert.equal(await page.locator('.ep-renewal-help').count(),0);
  await page.reload();await page.getByRole('heading',{name:'Detalii termen',exact:true}).waitFor();
  assert(await page.getByText('14:30',{exact:true}).isVisible());
  assert(await page.getByText('Cabinet, etaj 2\nIa dosarul',{exact:true}).isVisible());
  await page.getByRole('button',{name:'Editează termenul',exact:true}).click();
  await page.getByLabel('Nume',{exact:true}).fill('Permis — programare');
  await page.getByLabel('Ora (opțional)').fill('16:45');
  await page.getByRole('button',{name:'Salvează modificările',exact:true}).click();
  await page.getByRole('heading',{name:'Detalii termen',exact:true}).waitFor();assert.equal(docs[0].event_time,'16:45');
  await page.getByText('Calendar',{exact:true}).click();
  const downloadReady=page.waitForEvent('download');await page.getByRole('button',{name:'Adaugă în calendar',exact:true}).click();
  const download=await downloadReady,ics=fs.readFileSync(await download.path(),'utf8');
  assert(ics.includes('T164500'));assert(!ics.includes('Expiră:'));assert(ics.includes('SUMMARY:Permis'));
  await page.goto(base+'/documents?category=Personal');await page.locator('.ep-document').waitFor();
  assert((await page.locator('.ep-document').innerText()).includes('Altele'));
  await page.setViewportSize({width:1440,height:1000});
  await newTerm();await page.getByLabel('Nume',{exact:true}).fill('Abonament bibliotecă');
  await page.getByLabel('Data termenului',{exact:true}).fill(date(-1));
  await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();
  await page.getByRole('heading',{name:'Detalii termen',exact:true}).waitFor();assert.equal(docs[1].event_time,null);
  assert(await page.locator('.ep-detail').getByText('TERMEN DEPĂȘIT',{exact:true}).isVisible());
  await page.goto(base+'/reminders');await page.locator('.ep-alert-document.expired').waitFor();
  const expired=page.locator('.ep-alert-document.expired');assert.equal(await expired.getByRole('button',{name:'Reînnoiește +1 an'}).count(),0);
  assert((await expired.innerText()).includes('Termen depășit:'));
  await page.screenshot({path:'outputs/personal-terms-desktop.png',fullPage:true});
  schema=false;await newTerm();await page.getByLabel('Nume',{exact:true}).fill('Test fără migrare');
  await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Termenele personale nu sunt disponibile momentan'}).waitFor();assert.equal(docs.length,2);
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile/desktop personal terms; create/edit/reload; explicit type despite custom name; optional time/notes; timed calendar export; overdue wording; no renewal action; missing migration guard.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
