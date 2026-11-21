const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('node:process').loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL;
const ref=new URL(origin).hostname.split('.')[0];
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5180';
const uid='11111111-1111-4111-8111-111111111111';
let docs=[{id:'11111111-aaaa-4111-8111-111111111111',user_id:uid,name:'RCA Dacia',category:'Vehicles',reference:'B 123 ABC',expires:'2026-12-12',days:30,reminder_days:[30,7,1],version:1,notes:'',file_key:null,file_name:null}],history=[],supports=true;
const jwt=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Maria'}};
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session:{access_token:jwt(),refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
 await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),body=req.postDataJSON();let data=[];let status=200;
  if(url.pathname==='/auth/v1/user')data=user;
  else if(url.pathname==='/rest/v1/rpc/ensure_wallet_profile'){status=404;data={code:'PGRST202',message:'Legacy fixture'}}
  else if(url.pathname==='/rest/v1/vehicles'){status=404;data={code:'PGRST205',message:'Legacy fixture'}}
  else if(url.pathname==='/functions/v1/push')data={configured:false,publicKey:null,scheduleReady:false,lastRun:null};
  else if(url.pathname==='/rest/v1/document_revisions')data=history;
  else if(url.pathname==='/rest/v1/rpc/renew_document'){const doc=docs.find(d=>d.id===body.document_id);if(!doc||doc.version!==body.expected_version){status=409;data={message:'stale'}}else{history.unshift({id:crypto.randomUUID(),expires:doc.expires,renewed_at:new Date().toISOString(),file_key:null,file_name:null});doc.expires=body.new_expiry;doc.version++;data=doc}}
  else if(url.pathname==='/rest/v1/documents'){
   if(url.searchParams.get('limit')==='0'){if(!supports||url.searchParams.get('select')?.includes('completed_at')){status=400;data={code:'42703',message:'optional columns unavailable'}}}
   else if(req.method()==='PATCH'){const id=url.searchParams.get('id')?.replace('eq.',''),doc=docs.find(d=>d.id===id),version=url.searchParams.get('version')?.replace('eq.','');if(doc&&(!version||doc.version===Number(version))){Object.assign(doc,body,{version:doc.version+1});data=[doc]}else data=[]}
   else if(req.method()==='POST'){const doc={...body,version:1};docs.push(doc);data=doc}
   else if(req.method()==='DELETE'){docs=docs.filter(d=>'eq.'+d.id!==url.searchParams.get('id'));data=[]}
   else data=docs;
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/documents/'+docs[0].id);await page.getByRole('button',{name:'Editează actul',exact:true}).waitFor();
 await page.getByRole('button',{name:'Editează actul',exact:true}).click();await page.waitForURL('**/edit');
 await page.getByLabel('Numele actului',{exact:true}).fill('RCA actualizat');
 await page.getByRole('checkbox',{name:'Cu 14 zile înainte',exact:true}).check();
 await page.getByRole('checkbox',{name:'Cu 30 zile înainte',exact:true}).uncheck();
 await page.getByRole('button',{name:'Salvează modificările',exact:true}).click();
 await page.getByRole('heading',{level:1,name:'RCA actualizat'}).waitFor();assert.deepEqual(docs[0].reminder_days,[14,7,1]);assert.equal(docs[0].version,2);
 await page.getByRole('button',{name:'Marchează reînnoit',exact:true}).click();await page.getByLabel('Noua dată de expirare').fill('2027-12-12');await page.getByRole('button',{name:'Confirmă reînnoirea'}).click();await page.locator('.ep-extra summary').click();await page.getByText('Valabil până la 12 decembrie 2026',{exact:true}).waitFor();assert.equal(docs[0].expires,'2027-12-12');assert.equal(history.length,1);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Adaugă în calendar',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'duevo.ics');const calendar=fs.readFileSync(await download.path(),'utf8');assert(calendar.includes('DTSTART;VALUE=DATE:20271212'));assert.equal((calendar.match(/BEGIN:VALARM/g)||[]).length,3);
 await page.screenshot({path:'outputs/functions-detail-mobile.png',fullPage:true});
 await page.getByRole('dialog').getByRole('button',{name:'Înapoi',exact:true}).click();await page.getByRole('navigation').getByRole('link',{name:'Reamintiri'}).click();await page.locator('.ep-push-details>summary').click();await page.getByText('Notificările automate nu sunt active',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Activează notificările',exact:true}).last().isDisabled());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/functions-reminders-mobile.png',fullPage:true});
 // Simulate the original database: editing/calendar remain usable, migration-only actions stay disabled.
 supports=false;await page.goto(base+'/documents/'+docs[0].id);await page.getByRole('button',{name:'Editează actul',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Marchează reînnoit',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Editează actul',exact:true}).click();await page.getByLabel('Numele actului',{exact:true}).fill('RCA legacy');await page.getByRole('button',{name:'Salvează modificările'}).click();await page.getByRole('heading',{level:1,name:'RCA legacy'}).waitFor();
 supports=true;await page.goto(base+'/documents/new');await page.getByRole('button',{name:/Asigurare RCA/}).click();await page.getByLabel('Numele actului',{exact:true}).fill('RCA nou');await page.getByLabel('Nr. auto (opțional)',{exact:true}).fill('B 99 TEST');await page.locator('.ep-extra-details>summary').click();await page.getByLabel('Serie poliță / act').fill('POLITA-42');await page.getByLabel('Emis la',{exact:true}).fill('2026-11-01');await page.getByLabel('Data expirării',{exact:true}).fill('2027-11-01');await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();await page.getByRole('heading',{level:1,name:'RCA nou',exact:true}).waitFor();const created=docs.find(d=>d.name==='RCA nou');assert(created);assert.equal(created.issued_on,'2026-11-01');assert.equal(created.reference,'B 99 TEST • POLITA-42');assert.equal(created.expires,'2027-11-01');
 assert.deepEqual(errors,[]);console.log('PASS: isolated API fixtures; new two-step create, issuance date and vehicle reference persistence; edit/multiple reminders; renewal/history; calendar download; truthful push setup; mobile layout; original database compatibility.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
