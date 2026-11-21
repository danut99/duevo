const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
process.loadEnvFile('.env.local');const origin=process.env.VITE_SUPABASE_URL,ref=new URL(origin).hostname.split('.')[0],base=process.env.TEST_APP_URL||'http://127.0.0.1:5180';
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222',did='33333333-3333-4333-8333-333333333333';
const user={id:uid,email:'test@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Maria'}};
const token=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function sameFolderStyle(page){return page.locator('.ep-folders').evaluate(el=>Array.from(el.children).every(folder=>{
 const selected=folder.classList.contains('ep-folder-selected');
 const snapshot=()=>Array.from(folder.querySelectorAll('.ep-folder-tab,.ep-folder-back,.ep-folder-pocket,.ep-folder-papers'),node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return [rect.x,rect.y,rect.width,rect.height,...['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopColor','borderRadius','padding','margin','background','boxShadow','outline','transform'].map(property=>style[property])]});
 folder.classList.remove('ep-folder-selected');const before=snapshot();folder.classList.add('ep-folder-selected');const after=snapshot();folder.classList.toggle('ep-folder-selected',selected);return JSON.stringify(before)===JSON.stringify(after);
}));}
let uploadAttempts=0,failAttempt=0;
let vault=[{id:'album',profile_id:pid,category:'Photos',name:'Poze'}],files=Array.from({length:14},(_,i)=>({id:'file'+i,document_id:i===0?did:null,vault_document_id:i===0?null:'album',name:`Vacanță ${i}.png`,storage_key:uid+'/files/'+i,mime_type:'image/png',size_bytes:png.length}));
files.push({id:'pdf',document_id:did,vault_document_id:null,name:'Poliță.pdf',storage_key:uid+'/pdf',mime_type:'application/pdf'});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844},acceptDownloads:true}),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session:{access_token:token,refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
 await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),body=req.headers()['content-type']?.includes('application/json')&&req.postData()?req.postDataJSON():null;let data=[];
  if(url.pathname==='/auth/v1/user')data=user;
  else if(url.pathname==='/rest/v1/rpc/ensure_wallet_profile')data=pid;
  else if(url.pathname==='/rest/v1/wallet_profiles')data=[{id:pid,user_id:uid,name:'Eu',is_default:true}];
  else if(url.pathname==='/rest/v1/vehicles')data=[{id:'vehicle-test',profile_id:pid,user_id:uid,plate:'B 123 ABC',name:'Dacia'}];
  else if(url.pathname==='/rest/v1/documents')data=url.searchParams.get('limit')==='0'?[]:[{id:did,user_id:uid,profile_id:pid,name:'RCA',category:'Vehicles',reference:'B 123 ABC',expires:'2027-10-01',days:30,reminder_days:[30],notes:'',version:1}];
  else if(url.pathname==='/rest/v1/vault_documents'){
   if(req.method()==='POST'){assert.equal(body.category,'Vehicles');assert.equal(body.name,'Talon test');assert.equal(body.vehicle_id,'vehicle-test');data={...body,id:'new-album'};vault.push(data)}else if(req.method()==='DELETE'){vault=vault.filter(v=>'eq.'+v.id!==url.searchParams.get('id'));data=[]}else{assert.equal(url.searchParams.get('profile_id'),'eq.'+pid);data=vault}
  }else if(url.pathname==='/rest/v1/document_files'){
   if(req.method()==='POST'){data=body;files.push(body)}
   else if(req.method()==='DELETE'){files=files.filter(f=>'eq.'+f.id!==url.searchParams.get('id'))}
   else {const col=url.searchParams.has('document_id')?'document_id':'vault_document_id';const ids=url.searchParams.get(col)||'';data=files.filter(f=>f[col]&&(ids.startsWith('eq.')?f[col]===ids.slice(3):ids.slice(4,-1).split(',').includes(f[col])));}
  }else if(url.pathname.startsWith('/storage/v1/object/')){
   if(req.method()==='POST'){uploadAttempts++;if(uploadAttempts===failAttempt){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Upload failed'})});return}}
   if(req.method()==='GET'){await route.fulfill({status:200,contentType:'image/png',body:png});return}data=req.method()==='DELETE'?[]:{Key:'documents/'+uid+'/files/new'};
  }else if(url.pathname==='/functions/v1/push')data={configured:false,publicKey:null,scheduleReady:false,lastRun:null};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/documents');await page.getByRole('button',{name:'Adaugă act',exact:true}).first().waitFor();
 for(const width of [320,390,1440])for(const theme of ['carbon','obsidian']){
 await page.setViewportSize({width,height:900});await page.locator('.ep-workspace').evaluate((el,t)=>el.dataset.theme=t,theme);await page.getByRole('group',{name:'Meniul contului'}).count().catch(()=>0);
 await page.locator('.ep-account>summary').click();if(!await page.locator('.ep-profile-picker>details').evaluate(el=>el.open))await page.locator('.ep-profile-picker summary').click();
 const row=page.locator('.ep-profile-options>div').first();const nameBox=await row.locator('button').first().boundingBox(),editBox=await row.locator('button').last().boundingBox();assert(nameBox.width>140);assert(editBox.width<=42);assert(nameBox.height<65);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`outputs/profile-layout-${width}-${theme}.png`});await page.locator('.ep-account>summary').click();
 }
 console.log('PASS: profile names remain horizontal; edit button stays compact; menu fits 320/390/1440px in both themes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
