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
 await page.goto(base+'/documents');await page.getByRole('heading',{name:'Actele mele',exact:true}).waitFor();await page.setViewportSize({width:1280,height:900});assert((await page.locator('.ep-desktop-brand').innerText()).includes('Duevo'));assert(await page.locator('.ep-desktop-brand .duevo-mark').evaluate(el=>el.complete&&el.naturalWidth>0));assert((await page.title()).startsWith('Duevo'));assert(!/Expiry\s?Pocket/i.test(await page.locator('body').innerText()));
 const publicPage=await browser.newPage({serviceWorkers:'block'});for(const path of ['/','/login','/register']){await publicPage.goto(base+path);await publicPage.locator('.duevo-mark').first().waitFor();for(const width of [320,390,1280]){await publicPage.setViewportSize({width,height:844});assert(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'branding overflow '+path+' '+width);assert(await publicPage.locator('.duevo-mark').first().evaluate(el=>el.complete&&el.naturalWidth>0));}assert(!/Expiry\s?Pocket/i.test(await publicPage.locator('body').innerText()));await publicPage.locator('.ep-theme-switch,.ep-auth-theme').first().click();assert(!/Expiry\s?Pocket/i.test(await publicPage.locator('body').innerText()));}
 const manifest=await (await page.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.name,'Duevo');assert.equal(manifest.short_name,'Duevo');for(const size of [192,512]){const dimensions=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return [image.naturalWidth,image.naturalHeight]},`/icon-${size}.png`);assert.deepEqual(dimensions,[size,size]);}assert.deepEqual(errors,[]);console.log('PASS: Duevo name/logo in app, intro, login/register; both themes at 320–1280px; PWA manifest, favicon title and PNG dimensions.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});