const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const fs=require('node:fs');
process.loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL,ref=new URL(origin).hostname.split('.')[0];
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5180',dir='outputs/campanie-7-zile/assets';
fs.mkdirSync(dir,{recursive:true});
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const user={id:uid,email:'demo@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Demo'}};
const token=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:2000000000})).toString('base64url'),'fixture'].join('.');
const vehicles=[{id:'car-1',profile_id:pid,user_id:uid,plate:'B 123 DEMO',name:'Mașina mea'},{id:'car-2',profile_id:pid,user_id:uid,plate:'CJ 45 DEMO',name:'Mașina familiei'}];
const docs=[['rca','Asigurare RCA','Vehicles','2026-12-06','car-1'],['itp','Inspecție ITP','Vehicles','2026-12-20','car-1'],['rov','Rovinietă','Vehicles','2026-11-29','car-1'],['rca-2','Asigurare RCA','Vehicles','2027-02-20','car-2'],['ci','Carte de Identitate','Personal','2026-12-22',null],['per','Permis de Conducere','Personal','2028-10-20',null]].map(([id,name,category,expires,vehicle_id])=>({id,user_id:uid,profile_id:pid,name,category,expires,vehicle_id,reference:category==='Vehicles'?(vehicle_id==='car-1'?'B 123 DEMO':'CJ 45 DEMO'):'Profilul meu',issued_on:'2025-11-29',days:30,reminder_days:[30,14,7,1],notes:'',version:1}));
const vault=[{id:'talon',profile_id:pid,user_id:uid,category:'Vehicles',name:'Talon',vehicle_id:'car-1',document_kind:'TALON'}];
const files=[{id:'copy-ci',document_id:'ci',vault_document_id:null,name:'Carte de Identitate.png',mime_type:'image/png',storage_key:uid+'/demo-ci',size_bytes:275000},{id:'copy-rca',document_id:'rca',vault_document_id:null,name:'Asigurare RCA.pdf',mime_type:'application/pdf',storage_key:uid+'/demo-rca',size_bytes:180000},{id:'copy-talon',document_id:null,vault_document_id:'talon',name:'Talon.png',mime_type:'image/png',storage_key:uid+'/demo-talon',size_bytes:320000}];
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'block'});page.setDefaultTimeout(30000);
 await page.clock.setFixedTime(new Date('2026-11-22T12:00:00+02:00'));
 await page.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('duevo-language','ro');localStorage.setItem('duevo-country','RO');localStorage.setItem('expiry-pocket-theme','obsidian')},{key:`sb-${ref}-auth-token`,session:{access_token:token,refresh_token:'fixture',token_type:'bearer',expires_at:2000000000,expires_in:3600,user}});
 await page.route(origin+'/**',async route=>{const url=new URL(route.request().url());let data=[];
 if(url.pathname==='/auth/v1/user')data=user;
 else if(url.pathname.endsWith('/rpc/ensure_wallet_profile'))data=pid;
 else if(url.pathname.endsWith('/wallet_profiles'))data=[{id:pid,user_id:uid,name:'Eu',is_default:true}];
 else if(url.pathname.endsWith('/vehicles'))data=vehicles;
 else if(url.pathname.endsWith('/documents')){data=url.searchParams.get('limit')==='0'?[]:docs;}
 else if(url.pathname.endsWith('/vault_documents'))data=vault;
 else if(url.pathname.endsWith('/document_files')){data=files;for(const key of ['document_id','vault_document_id'])if(url.searchParams.has(key)){const value=url.searchParams.get(key);data=data.filter(f=>f[key]&&(value.startsWith('eq.')?f[key]===value.slice(3):value.slice(4,-1).split(',').includes(f[key])));}}
 else if(url.pathname.endsWith('/functions/v1/push'))data={configured:true,publicKey:'DEMO',scheduleReady:true,lastRun:'2026-11-22T10:00:00Z'};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 async function ready(path){await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.locator('.ep-workspace').first().waitFor();await page.addStyleTag({content:'.ep-bottom-nav{visibility:hidden!important}*{animation:none!important;transition:none!important}'});await page.locator('.ep-workspace').evaluateAll(nodes=>nodes.forEach(el=>el.dataset.theme='obsidian'));}
 async function capture(selector,name){await page.locator(selector).first().screenshot({path:dir+'/'+name+'.png'});console.log(name);}
 for(const [id,name]of [['rca','rca'],['rov','rovinieta'],['ci','identitate']]){await ready('/documents/'+id);await page.locator('.ep-detail-hero').waitFor();await capture('.ep-detail-hero',name);}
 await ready('/documents/rca/edit');await page.locator('.ep-editor-form').waitFor();await page.locator('.ep-form-card').filter({has:page.locator('.ep-reminder-chips')}).screenshot({path:dir+'/alerte.png'});await page.locator('.ep-form-card').filter({has:page.locator('#inp-expiry')}).screenshot({path:dir+'/termen.png'});
 await ready('/documents/new?category=Vehicles');await capture('.ep-type-grid','tipuri');await page.locator('.ep-type').filter({hasText:'Asigurare RCA'}).click();await page.locator('#inp-expiry').fill('2026-12-06');await page.locator('#vehicle-choice').selectOption('car-1');await page.locator('.ep-form-card').filter({has:page.locator('#inp-title')}).screenshot({path:dir+'/act-formular.png'});
 await ready('/documents?category=Vehicles');await capture('.ep-vehicle-groups','masini');await capture('.ep-folders','dosare');
 await page.getByRole('button',{name:'Adaugă mașină',exact:true}).click();await capture('.ep-vehicle-create','masina-goala');await page.locator('.ep-vehicle-create input').nth(0).fill('CJ 45 DEMO');await page.locator('.ep-vehicle-create input').nth(1).fill('Mașina familiei');await capture('.ep-vehicle-create','masina-formular');
 await ready('/documents?category=Personal');await capture('.ep-list-section','personal');
 await ready('/documents?category=Photos');await page.locator('.ep-doc-vault-entry').first().waitFor();await capture('.ep-doc-vault','copii');await page.getByRole('searchbox',{name:'Caută documente păstrate'}).fill('Talon');await capture('.ep-doc-vault','cautare');
 await ready('/reminders');await page.locator('.ep-notification-settings').waitFor();await capture('.ep-notification-settings','notificari');
 await ready('/overview');await page.locator('.ov-summary').waitFor();await capture('.ep-overview','ansamblu');await capture('.ov-summary','rezumat');
 for(const [id,filename]of [['rov','rovinieta-expirata'],['rca','rca-expirat']]){const doc=docs.find(item=>item.id===id);const expires=doc.expires;doc.expires='2026-11-20';await ready('/documents/'+id);await capture('.ep-detail-hero',filename);doc.expires=expires;}
 console.log('Captured campaign UI with fictional data.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
