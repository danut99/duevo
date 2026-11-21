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
  else if(url.pathname==='/functions/v1/push')data={configured:false,publicKey:null,scheduleReady:false,lastRun:null};
  else if(url.pathname==='/rest/v1/document_revisions')data=history;
  else if(url.pathname==='/rest/v1/rpc/renew_document'){const doc=docs.find(d=>d.id===body.document_id);if(!doc||doc.version!==body.expected_version){status=409;data={message:'stale'}}else{history.unshift({id:crypto.randomUUID(),expires:doc.expires,renewed_at:new Date().toISOString(),file_key:null,file_name:null});doc.expires=body.new_expiry;doc.version++;data=doc}}
  else if(url.pathname==='/rest/v1/documents'){
   if(url.searchParams.get('limit')==='0'){if(!supports){status=400;data={code:'42703',message:'column reminder_days does not exist'}}}
   else if(req.method()==='PATCH'){const id=url.searchParams.get('id')?.replace('eq.',''),doc=docs.find(d=>d.id===id),version=url.searchParams.get('version')?.replace('eq.','');if(doc&&(!version||doc.version===Number(version))){Object.assign(doc,body,{version:doc.version+1});data=[doc]}else data=[]}
   else if(req.method()==='POST'){const doc={...body,version:1};docs.push(doc);data=doc}
   else if(req.method()==='DELETE'){docs=docs.filter(d=>'eq.'+d.id!==url.searchParams.get('id'));data=[]}
   else data=docs;
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 docs.push({...docs[0],id:'22222222-aaaa-4111-8111-111111111111',name:'Permis de Conducere',category:'Personal',expires:'2029-01-01'});
 for(const width of [390,1280]){await page.setViewportSize({width,height:844});await page.goto(base+'/documents');await page.locator('.ep-list-folders .ep-folder').first().waitFor();await page.locator('.ep-list-folders').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-100));await page.waitForTimeout(100);const before=await page.evaluate(()=>window.scrollY);await page.getByRole('button',{name:/Auto & Vehicul/}).click();await page.waitForURL('**/documents?category=Vehicles');assert(Math.abs((await page.evaluate(()=>window.scrollY))-before)<5,'folder click scroll at '+width);const selected=page.locator('.ep-list-folders .ep-folder[aria-pressed=true]');assert((await selected.innerText()).includes('Selectat'));assert(await selected.locator('.ep-folder-state').isVisible());assert.equal(await page.locator('.ep-document').count(),1);await page.getByRole('button',{name:/Personal & ID/}).click();await page.waitForURL('**/documents?category=Personal');assert(Math.abs((await page.evaluate(()=>window.scrollY))-before)<5,'personal click scroll at '+width);await page.getByRole('button',{name:/Toate actele/}).click();await page.waitForURL('**/documents');assert.equal(await page.locator('.ep-document').count(),2);assert(Math.abs((await page.evaluate(()=>window.scrollY))-before)<5,'all click scroll at '+width);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:'outputs/folder-selection-mobile.png'});}
 assert.deepEqual(errors,[]);console.log('PASS: folder filters keep scroll position on mobile and desktop; explicit selection; switching and all-documents reset.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});