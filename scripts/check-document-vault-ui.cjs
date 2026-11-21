const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
process.loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL,ref=new URL(origin).hostname.split('.')[0],base=process.env.TEST_APP_URL||'http://127.0.0.1:5173';
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222',vid='33333333-3333-4333-8333-333333333333',did='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user={id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Maria'}};
const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
const doc={id:did,user_id:uid,profile_id:pid,vehicle_id:vid,name:'Asigurare RCA',category:'Vehicles',entry_type:'document',reference:'B 123 ABC',expires:'2027-12-01',days:30,reminder_days:[30],version:1,notes:'',file_key:uid+'/legacy',file_name:'Polita-veche.pdf'};
let entries=[],files=[],storageUploads=0,failDelete=false;const errors=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=','base64');
const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({serviceWorkers:'block',acceptDownloads:true,viewport:{width:390,height:844}});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session:{access_token:jwt,refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedFile=data.files[0].name}})});
 await page.route(origin+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.headers()['content-type']?.includes('application/json')&&req.postData()?req.postDataJSON():null;let data=[];
  if(url.pathname==='/auth/v1/user')data=user;
  else if(url.pathname==='/rest/v1/rpc/ensure_wallet_profile')data=pid;
  else if(url.pathname==='/rest/v1/wallet_profiles')data=[{id:pid,user_id:uid,name:'Eu',is_default:true}];
  else if(url.pathname==='/rest/v1/vehicles')data=[{id:vid,profile_id:pid,user_id:uid,plate:'B 123 ABC',name:'Dacia familiei'}];
  else if(url.pathname==='/rest/v1/documents'){
   if(url.searchParams.get('limit')==='0')data=[];
   else if(req.method()==='PATCH'){const match=!url.searchParams.has('file_key')||url.searchParams.get('file_key')==='eq.'+doc.file_key;if(match){Object.assign(doc,body,{version:doc.version+1});data=[doc]}else data=[]}
   else data=[doc];
  }else if(url.pathname==='/rest/v1/vault_documents'){
   if(req.method()==='POST'){data={...body,id:crypto.randomUUID()};entries.push(data)}
   else if(req.method()==='DELETE'){entries=entries.filter(e=>'eq.'+e.id!==url.searchParams.get('id'));data=[]}
   else data=entries.filter(e=>'eq.'+e.profile_id===url.searchParams.get('profile_id'));
  }else if(url.pathname==='/rest/v1/document_files'){
   if(req.method()==='POST'){files.push({...body});data=[]}
   else if(req.method()==='DELETE'){files=files.filter(f=>'eq.'+f.id!==url.searchParams.get('id'));data=[]}
   else data=files.filter(f=>['document_id','vault_document_id'].every(k=>!url.searchParams.has(k)||'eq.'+f[k]===url.searchParams.get(k)));
  }else if(url.pathname.startsWith('/storage/v1/object/')){
   if(req.method()==='GET'){const f=files.find(f=>url.pathname.endsWith(f.storage_key));return route.fulfill({status:200,contentType:f?.mime_type||'application/pdf',body:f?.mime_type?.startsWith('image/')?png:pdf})}
   if(req.method()==='DELETE'){if(failDelete)return route.fulfill({status:500,contentType:'application/json',body:'{"message":"fixture failure"}'});data=[]}
   else{storageUploads++;data={Key:'documents/'+url.pathname.split('/documents/')[1]}}
  }else if(url.pathname==='/functions/v1/push')data={configured:false};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/documents/'+did);await page.getByRole('region',{name:'Documente și fișiere'}).waitFor();
 await page.getByRole('button',{name:'Vezi Polita-veche.pdf',exact:true}).click();await page.locator('.ep-file-preview iframe').waitFor();
 await page.getByRole('button',{name:'Închide previzualizarea'}).click();
 const input=page.getByLabel('Adaugă poze sau PDF',{exact:true});
 await input.setInputFiles([{name:'Fata.png',mimeType:'image/png',buffer:png},{name:'Verso.png',mimeType:'image/png',buffer:png},{name:'Anexa.pdf',mimeType:'application/pdf',buffer:pdf}]);
 await page.getByText('Fișierele au fost salvate.',{exact:true}).waitFor();assert.equal(files.length,3);assert.equal(storageUploads,3);
 await page.getByRole('button',{name:'Vezi Fata.png',exact:true}).click();await page.locator('.ep-file-preview img').waitFor();assert(await page.locator('.ep-file-preview img').evaluate(el=>el.complete&&el.naturalWidth>0));
 await page.locator('.ep-file-preview').getByRole('button',{name:'Trimite',exact:true}).click();assert.equal(await page.evaluate(()=>window.__sharedFile),'Fata.png');
 const download=page.waitForEvent('download');await page.locator('.ep-file-preview').getByRole('button',{name:'Descarcă',exact:true}).click();assert.equal((await download).suggestedFilename(),'Fata.png');
 await page.getByRole('button',{name:'Închide previzualizarea'}).click();
 await input.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await page.getByRole('alert').filter({hasText:'maximum 5 MB'}).waitFor();assert.equal(storageUploads,3);
 failDelete=true;await page.getByRole('button',{name:'Șterge fișierul Verso.png',exact:true}).click();await page.getByRole('alert').filter({hasText:'nu a putut fi șters'}).waitFor();assert.equal(files.length,3);
 failDelete=false;await page.getByRole('button',{name:'Șterge fișierul Verso.png',exact:true}).click();await page.getByRole('button',{name:'Vezi Verso.png',exact:true}).waitFor({state:'detached'});assert.equal(files.length,2);
 await page.getByRole('button',{name:'Șterge fișierul Polita-veche.pdf',exact:true}).click();await page.getByRole('button',{name:'Vezi Polita-veche.pdf',exact:true}).waitFor({state:'detached'});assert.equal(doc.file_key,null);assert.equal(doc.version,2);
 await page.goto(base+'/documents?category=Photos');await page.getByRole('button',{name:'Adaugă document',exact:true}).click();await page.getByLabel('Titlu document',{exact:true}).selectOption('OTHER');await page.getByLabel('Numele documentului',{exact:true}).fill('Talon față și verso');await page.getByLabel('Mașina (opțional)',{exact:true}).selectOption(vid);await page.getByLabel('Alege fișiere pentru document',{exact:true}).setInputFiles({name:'Talon.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Salvează',exact:true}).click();await page.getByText('Documentul și fișierele au fost salvate.',{exact:true}).waitFor();await page.locator('.ep-doc-vault-entry').filter({hasText:'Talon față și verso'}).click();
 await page.getByRole('region',{name:'Documente și fișiere'}).waitFor();assert.equal(entries.length,1);assert.equal(entries[0].vehicle_id,vid);assert(!entries[0].expires);

 fs.mkdirSync('outputs',{recursive:true});
 for(const theme of ['obsidian','carbon'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.locator('.pocket-app.ep-workspace').first().evaluate((el,t)=>el.dataset.theme=t,theme);
  const vault=page.getByRole('region',{name:'Copii ale documentelor'});await vault.scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  const style=await vault.getByRole('button',{name:'Adaugă fișiere',exact:true}).evaluate(el=>{const s=getComputedStyle(el);return{height:el.getBoundingClientRect().height,filter:s.filter,width:el.closest('section').getBoundingClientRect().width}});assert(style.height>=44);assert.equal(style.filter,'none');assert(style.width>width*.45);
  if(width===390||width===1440)await page.screenshot({path:`outputs/document-vault-${theme}-${width}.png`});
 }
 await page.reload();await page.getByRole('button',{name:/Talon față și verso/}).click();await page.getByRole('button',{name:'Vezi Talon.png',exact:true}).waitFor();
 await page.getByRole('button',{name:'Șterge documentul păstrat',exact:true}).click();await page.getByRole('button',{name:/Talon față și verso/}).waitFor({state:'detached'});assert.equal(entries.length,0);assert.equal(files.filter(f=>f.vault_document_id).length,0);
 assert.deepEqual(errors,[]);console.log('PASS: legacy preview/removal, multi-file upload, image/PDF preview, download, invalid MIME rejection, failed deletion preserves metadata, no-expiry vehicle vault persistence and cleanup; mobile/desktop layouts in both themes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
