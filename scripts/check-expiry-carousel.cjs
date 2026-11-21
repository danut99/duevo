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
 const offset=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE')};docs[0].expires=offset(7);docs.push({...docs[0],id:'22222222-aaaa-4111-8111-111111111111',name:'Carte de Identitate',category:'Personal',expires:offset(14)});docs.push({...docs[0],id:'33333333-aaaa-4111-8111-111111111111',name:'Rovinietă',expires:offset(-3)});
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/app');await page.locator('.ep-expiry-slide').first().waitFor();assert.equal(await page.locator('.ep-expiry-slide').count(),3);assert.equal(await page.locator('.ep-list-search').count(),0);assert.equal(await page.locator('.ep-category-filters').count(),0);assert.equal(await page.locator('.ep-expiry-slide').first().getAttribute('aria-label'),'1 din 3: Rovinietă');
 await page.getByRole('button',{name:'Expirarea următoare',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ep-priority-controls>span').textContent==='2 / 3');await page.getByRole('button',{name:'Expirarea următoare',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ep-priority-controls>span').textContent==='3 / 3');assert(await page.getByRole('button',{name:'Expirarea următoare',exact:true}).isDisabled());await page.getByRole('button',{name:'Arată Rovinietă',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ep-priority-controls>span').textContent==='1 / 3');
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);const boxes=await page.locator('.ep-documents>section').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width})));assert(boxes.every(b=>Math.abs(b.x-boxes[0].x)<2&&Math.abs(b.w-boxes[0].w)<2),'section alignment '+width);}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.locator('.ep-expiry-track').evaluate(async el=>{for(let i=0;i<2;i++){el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[new Touch({identifier:1,target:el,clientX:280,clientY:120})]}));el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:1,target:el,clientX:80,clientY:120})]}));await new Promise(r=>requestAnimationFrame(r))}});await page.waitForFunction(()=>document.querySelector('.ep-priority-controls>span').textContent==='3 / 3');await page.locator('.ep-expiry-slide').last().getByRole('button',{name:'Vezi actul'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.waitForURL('**/app');assert.equal(await page.locator('.ep-priority-controls>span').innerText(),'3 / 3');await page.waitForTimeout(300);await page.screenshot({path:'outputs/documents-refined-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(300);await page.screenshot({path:'outputs/documents-refined-desktop.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: urgent-first expiry carousel; desktop next/previous, dot selection, mobile swipe, drawer return, no search or duplicate filters, aligned sections 320–1280px.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});