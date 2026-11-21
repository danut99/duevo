const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {PDFDocument}=require('pdf-lib');const assert=require('node:assert/strict'),fs=require('node:fs');
process.loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL,base=process.env.TEST_APP_URL||'http://127.0.0.1:5183',ref=new URL(origin).hostname.split('.')[0];
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const user={id:uid,email:'mobile@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Test Mobil'}};
let cars=[],docs=[],vault=[],files=[],packet={},revisions=[];const binary=new Map(),errors=[];
const date=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE')};
const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=360;const x=c.getContext('2d');x.fillStyle='#f4f4f6';x.fillRect(0,0,600,360);x.fillStyle='#111';x.font='28px sans-serif';x.fillText('TALON - DOCUMENT FICTIV',35,170);return c.toDataURL().split(',')[1]}),'base64');
 await page.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.__sharedName=data.files[0].name})},{key:`sb-${ref}-auth-token`,session:{access_token:jwt,refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
 await page.route(origin+'/**',async route=>{
  const req=route.request(),u=new URL(req.url()),method=req.method(),body=req.headers()['content-type']?.includes('application/json')&&req.postData()?req.postDataJSON():null;let data=[];
  if(u.pathname==='/auth/v1/user')data=user;
  else if(u.pathname==='/rest/v1/rpc/ensure_wallet_profile')data=pid;
  else if(u.pathname==='/rest/v1/wallet_profiles')data=[{id:pid,user_id:uid,name:'Eu',is_default:true}];
  else if(u.pathname==='/functions/v1/push')data={configured:false,publicKey:null,scheduleReady:false,lastRun:null};
  else if(u.pathname==='/rest/v1/vehicles'){
   if(method==='POST'){data={...body,id:crypto.randomUUID()};cars.push(data)}
   else if(method==='PATCH'){const car=cars.find(c=>'eq.'+c.id===u.searchParams.get('id'));Object.assign(car,body);data=car}
   else data=cars;
  }else if(u.pathname==='/rest/v1/documents'){
   if(u.searchParams.get('limit')==='0')data=[];
   else if(method==='POST'){data={...body,version:1};docs.push(data)}
   else if(method==='PATCH'){const doc=docs.find(d=>'eq.'+d.id===u.searchParams.get('id'));Object.assign(doc,body,{version:doc.version+1});data=[doc]}
   else data=docs;
  }else if(u.pathname==='/rest/v1/vault_documents'){
   if(method==='POST'){data={...body,id:crypto.randomUUID()};vault.push(data)}else data=vault;
  }else if(u.pathname==='/rest/v1/document_files'){
   if(method==='POST'){files.push(body);data=body}
   else data=files.filter(f=>['document_id','vault_document_id'].every(k=>{const value=u.searchParams.get(k);return !value||(value.startsWith('eq.')?'eq.'+f[k]===value:value.slice(4,-1).split(',').includes(f[k]))}));
  }else if(u.pathname==='/rest/v1/renewal_packets'){
   if(method==='POST'){packet=body.draft;data=[]}else data=Object.keys(packet).length?[{draft:packet}]:[];
  }else if(u.pathname==='/rest/v1/document_revisions')data=revisions;
  else if(u.pathname==='/rest/v1/rpc/renew_document'){
   const d=docs.find(d=>d.id===body.document_id);assert.equal(d.version,body.expected_version);revisions.push({id:crypto.randomUUID(),expires:d.expires,renewed_at:new Date().toISOString()});d.expires=body.new_expiry;d.version++;data=d;
  }else if(u.pathname==='/rest/v1/rpc/delete_vehicle'){
   cars=cars.filter(c=>c.id!==body.vehicle_id_to_delete);docs.forEach(d=>{if(d.vehicle_id===body.vehicle_id_to_delete){d.vehicle_id=null;d.version++}});vault.forEach(v=>{if(v.vehicle_id===body.vehicle_id_to_delete)v.vehicle_id=null});data=null;
  }else if(u.pathname.startsWith('/storage/v1/object/')){
   const key=u.pathname.split('/documents/')[1];if(method==='POST'){binary.set(key,png);data={Key:'documents/'+key}}
   else if(method==='GET')return route.fulfill({contentType:'image/png',body:binary.get(key)||png});else data=[];
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 fs.mkdirSync('outputs',{recursive:true});
 await page.goto(base+'/documents?category=Vehicles');await page.getByRole('button',{name:'Adaugă mașină',exact:true}).click();
 await page.getByLabel('Număr de înmatriculare',{exact:true}).fill('B 123 ABC');await page.getByLabel('Nume mașină (opțional)',{exact:true}).fill('Dacia test');await page.getByLabel('Serie de șasiu (VIN, opțional)',{exact:true}).fill('WVWZZZ1JZXW000001');await page.getByRole('button',{name:'Salvează mașina',exact:true}).click();await page.getByText('Dacia test',{exact:true}).waitFor();assert.equal(cars.length,1);
 await page.getByRole('button',{name:'Adaugă act',exact:true}).last().click();await page.getByRole('button',{name:/Asigurare RCA/}).click();assert.equal(await page.getByLabel('Mașina',{exact:true}).inputValue(),cars[0].id);await page.getByLabel('Data expirării',{exact:true}).fill(date(7));await page.getByRole('button',{name:'Salvează în dosar',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(docs.length,1);assert.equal(docs[0].vehicle_id,cars[0].id);
 for(const width of [320,390,430])for(const theme of ['carbon','obsidian']){
  await page.setViewportSize({width,height:844});await page.locator('.ep-panel-root').evaluate((el,t)=>el.dataset.theme=t,theme);
  const panel=page.locator('.ep-document-panel');assert(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth));
  assert.equal(await page.locator('.ep-document-overlay').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
  if(width===390)await page.screenshot({path:`outputs/full-flow-act-${theme}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('dialog').getByRole('button',{name:'Înapoi',exact:true}).click();
 await page.goto(base+'/documents?category=Photos');await page.getByRole('button',{name:'Adaugă document',exact:true}).click();await page.getByRole('tab',{name:'Auto',exact:true}).click();await page.getByLabel('Titlu document',{exact:true}).selectOption('TALON');await page.getByLabel('Mașina (opțional)',{exact:true}).selectOption(cars[0].id);await page.getByLabel('Alege fișiere pentru document',{exact:true}).setInputFiles([{name:'Screenshot-fata.png',mimeType:'image/png',buffer:png},{name:'Screenshot-verso.png',mimeType:'image/png',buffer:png}]);await page.getByRole('button',{name:'Salvează',exact:true}).click();await page.getByText('Documentul și fișierele au fost salvate.',{exact:true}).waitFor();assert.equal(files.length,2);assert.equal(vault[0].vehicle_id,cars[0].id);
 await page.locator('.ep-vault-filters').getByRole('button',{name:/Auto/}).click();await page.getByRole('searchbox',{name:'Caută documente păstrate'}).fill('Talon');assert.equal(await page.locator('.ep-doc-vault-entry').count(),1);await page.screenshot({path:'outputs/full-flow-images-mobile.png'});
 await page.goto(base+'/documents/'+docs[0].id);await page.getByRole('dialog').waitFor();assert.equal(await page.locator('.ep-folder-prepare').getAttribute('aria-expanded'),'false');await page.locator('.ep-folder-prepare').click();const packetUI=page.getByRole('region',{name:'Dosar pentru reînnoire'});await packetUI.locator('.ep-file-thumbnail img').first().waitFor();assert.equal(await packetUI.locator('.ep-rp-selected-files li').count(),2);assert.equal(await packetUI.getByLabel('Număr de înmatriculare',{exact:true}).inputValue(),'B 123 ABC');
 await packetUI.getByLabel('Numele complet al titularului',{exact:true}).fill('Ștefan Test');await packetUI.getByLabel('Data de început dorită',{exact:true}).fill(date(8));await packetUI.getByLabel('Perioada dorită',{exact:true}).fill('12 luni');await packetUI.getByRole('button',{name:'Generează PDF pentru trimitere',exact:true}).click();await packetUI.getByRole('link',{name:'Descarcă PDF',exact:true}).waitFor();assert(await packetUI.locator('.ep-rp-pdf-preview').isVisible());
 const download=page.waitForEvent('download');await packetUI.getByRole('link',{name:'Descarcă PDF',exact:true}).click();await (await download).saveAs('outputs/full-flow-mobile.pdf');assert((await PDFDocument.load(fs.readFileSync('outputs/full-flow-mobile.pdf'))).getPageCount()>=1);await packetUI.getByRole('button',{name:'Trimite PDF',exact:true}).click();assert((await page.evaluate(()=>window.__sharedName)).endsWith('.pdf'));await page.screenshot({path:'outputs/full-flow-pdf-mobile.png'});
 await packetUI.getByRole('button',{name:'Închide dosarul de reînnoire',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Marchează reînnoit',exact:true}).click();await page.getByLabel('Noua dată de expirare',{exact:true}).fill(date(365));await page.getByRole('button',{name:'Confirmă reînnoirea',exact:true}).click();await page.getByLabel('Noua dată de expirare',{exact:true}).waitFor({state:'detached'});assert.equal(docs[0].expires,date(365));
 await page.goto(base+'/documents?category=Vehicles');await page.getByRole('button',{name:'Editează mașina',exact:true}).click();await page.getByLabel('Nume mașină (opțional)',{exact:true}).fill('Dacia actualizată');await page.getByRole('button',{name:'Salvează mașina',exact:true}).click();await page.getByText('Dacia actualizată',{exact:true}).waitFor();assert.equal(docs[0].vehicle_id,cars[0].id);
 await page.getByRole('button',{name:'Șterge mașina',exact:true}).click();await page.getByText('Fără mașină',{exact:true}).waitFor();assert.equal(cars.length,0);assert.equal(docs.length,1);assert.equal(files.length,2);assert.equal(vault[0].vehicle_id,null);
 assert.deepEqual(errors,[]);console.log('PASS: one full mobile session: add car/VIN → create RCA → upload front/back talon → filter/search → preselected renewal packet → generate/download/share PDF → renew RCA → edit/delete car preserving documents/files; drawer layout at 320/390/430 in both themes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
