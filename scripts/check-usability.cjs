const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
process.loadEnvFile('.env.local');
const origin=process.env.VITE_SUPABASE_URL,ref=new URL(origin).hostname.split('.')[0];
const base=process.env.TEST_APP_URL||'http://127.0.0.1:5180';
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222',vid='33333333-3333-4333-8333-333333333333';
const user={id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Maria'}};
const jwt=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};
let docs=[
 {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_id:uid,profile_id:pid,vehicle_id:vid,name:'Asigurare RCA',category:'Vehicles',entry_type:'document',reference:'B 123 ABC • POL-42',expires:date(-3),days:30,reminder_days:[30,7,1],version:1,notes:'',file_key:null,file_name:null},
 {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',user_id:uid,profile_id:pid,name:'Programare dentist',category:'Personal',entry_type:'other',event_time:'14:30',event_timezone:'Europe/Bucharest',event_reminder_minutes:[60],reference:'',expires:date(3),days:1,reminder_days:[1],version:1,notes:'Cabinet Ștefan',file_key:null,file_name:null}
];
let recover=0,updates=0;const errors=[];
async function fixture(page,signedIn=true){
 await page.addInitScript(()=>{localStorage.setItem('duevo-language','ro');localStorage.setItem('duevo-country','RO')});
 page.on('pageerror',e=>errors.push(e.message));
 if(signedIn)await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session:{access_token:jwt(),refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}});
 await page.route(origin+'/**',async route=>{
  const req=route.request(),url=new URL(req.url());const body=req.postData()?req.postDataJSON():null;let data=[];
  if(url.pathname==='/auth/v1/user'){data=user;if(req.method()==='PUT'){if(body.password){assert.equal(body.password,'NewPassword123!');updates++}else{assert.equal(body.data.duevo_language,'ro');assert.equal(body.data.duevo_country,'RO')}}}
  else if(url.pathname==='/auth/v1/recover'){assert.equal(body.email,'fixture@example.test');assert(url.searchParams.get('redirect_to').endsWith('/reset-password'));recover++;data={}}
  else if(url.pathname==='/functions/v1/push')data={configured:false,publicKey:null,scheduleReady:false,lastRun:null};
  else if(url.pathname==='/rest/v1/rpc/ensure_wallet_profile')data=pid;
  else if(url.pathname==='/rest/v1/wallet_profiles')data=[{id:pid,user_id:uid,name:'Eu',is_default:true}];
  else if(url.pathname==='/rest/v1/vehicles')data=[{id:vid,profile_id:pid,user_id:uid,plate:'B 123 ABC',name:'Dacia familiei'}];
  else if(url.pathname==='/rest/v1/rpc/renew_document'){const d=docs.find(d=>d.id===body.document_id);assert.equal(d.version,body.expected_version);d.expires=body.new_expiry;d.version++;data=d}
  else if(url.pathname==='/rest/v1/documents'){
   if(url.searchParams.get('limit')==='0')data=[];
   else if(req.method()==='PATCH'){const d=docs.find(d=>'eq.'+d.id===url.searchParams.get('id'));assert.equal('eq.'+d.version,url.searchParams.get('version'));Object.assign(d,body,{version:d.version+1});data=[d]}
   else if(req.method()==='POST'){const d={...body,version:1};docs.push(d);data=d}
   else data=docs;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 fs.mkdirSync('outputs',{recursive:true});
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});page.setDefaultTimeout(12000);await fixture(page);
 await page.goto(base+'/documents/'+docs[0].id);await page.getByRole('dialog').waitFor();
 // Every visible point in the dialog is hit-tested against the dialog, including after scrolling.
 for(const width of [320,390,768,1440])for(const theme of ['obsidian','carbon']){
  await page.setViewportSize({width,height:844});await page.locator('.ep-panel-root').evaluate((el,t)=>el.dataset.theme=t,theme);
  const panel=page.locator('.ep-document-panel');assert(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth));
  for(const fraction of [0,0.5,1]){
   await panel.evaluate((el,f)=>el.scrollTop=(el.scrollHeight-el.clientHeight)*f,fraction);
   assert(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return [40,400,800].every(y=>el.contains(document.elementFromPoint(r.left+r.width/2,y)))}),'background overlaps dialog');
  }
  if(width===390){await panel.evaluate(el=>el.scrollTop=0);await page.screenshot({path:`outputs/usability-panel-${theme}.png`})}
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('dialog').getByRole('button',{name:'Înapoi',exact:true}).click();
 await page.goto(base+'/documents?category=Personal');await page.locator('.ep-act-group>.ep-document-list>.ep-document').waitFor();
 const calendarBox=await page.locator('.ep-calendar-card').boundingBox(),priorityBox=await page.locator('.ep-documents-priority').boundingBox();assert(calendarBox.y<priorityBox.y,'calendar stays above the priority section');
 for(const width of [390,1000,1440]){
  await page.setViewportSize({width,height:1000});
  assert(await page.locator('.ep-act-group>.ep-document-list').evaluate(el=>{const bounds=el.getBoundingClientRect();const last=Math.max(...Array.from(el.children,child=>child.getBoundingClientRect().bottom));return bounds.bottom-last<=2}),'document list reserves empty viewport height');
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('searchbox',{name:'Caută acte și termene'}).fill('stefan');assert.equal(await page.locator('.ep-document-list>.ep-document').count(),1);await page.getByRole('button',{name:'Șterge căutarea',exact:true}).click();
 await page.getByRole('searchbox').fill('dentist');assert.equal(await page.locator('.ep-document-list>.ep-document').count(),1);await page.getByRole('button',{name:'Șterge căutarea',exact:true}).click();
 await page.goto(base+'/documents/'+docs[1].id);await page.getByRole('button',{name:'Am rezolvat',exact:true}).click();await page.getByRole('button',{name:'Redeschide termenul',exact:true}).waitFor();assert(docs[1].completed_at);
 await page.getByRole('dialog').getByRole('button',{name:'Înapoi',exact:true}).click();await page.goto(base+'/documents?category=Personal');await page.locator('.ep-act-group').waitFor();await page.getByRole('button',{name:/^Finalizate/}).click();assert.equal(await page.locator('.ep-document-list>.ep-document').count(),1);
 await page.locator('.ep-document-list>.ep-document').click();await page.getByRole('button',{name:'Reprogramează',exact:true}).click();
 await page.getByLabel('Data termenului',{exact:true}).fill(date(5));await page.getByRole('checkbox',{name:'Cu 30 minute',exact:true}).check();await page.getByRole('button',{name:'Salvează modificările',exact:true}).click();
 await page.getByRole('dialog').waitFor();assert.equal(docs[1].completed_at,null);assert.deepEqual(docs[1].event_reminder_minutes,[60,30]);assert.equal(docs[1].event_timezone,'Europe/Bucharest');
 await page.goto(base+'/documents/'+docs[0].id+'/edit');await page.getByLabel('Mașina',{exact:true}).waitFor();assert.equal(await page.locator('#inp-vehicle').count(),0);
 await page.getByLabel('Mașina',{exact:true}).selectOption('');await page.locator('#inp-vehicle').fill('B 999 NEW');await page.getByLabel('Mașina',{exact:true}).selectOption(vid);assert.equal(await page.locator('#inp-vehicle').count(),0);
 await page.getByRole('button',{name:'Salvează modificările',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(docs[0].reference,'B 123 ABC • POL-42');
 await page.goto(base+'/reminders');await page.locator('.ep-alert-document').first().waitFor();assert.equal(await page.locator('.ep-alert-document').count(),2);assert.equal(await page.locator('details.ep-tools').count(),0);await page.getByText('Detalii notific\u0103ri',{exact:true}).click();await page.getByRole('button',{name:'+ Adaugă',exact:true}).waitFor();
 await page.getByRole('button',{name:'Marchează reînnoit',exact:true}).click();assert.equal(docs[0].expires,date(-3));await page.getByLabel('Noua dată de expirare').fill(date(365));await page.getByRole('button',{name:'Confirmă reînnoirea',exact:true}).click();await page.locator('#alert-renew-date').waitFor({state:'detached'});assert.equal(docs[0].expires,date(365));
 await page.getByRole('button',{name:'+ Adaugă',exact:true}).click();assert.equal(await page.locator('.ep-delivery-channel[aria-labelledby=push-channel-title] select').count(),2);await page.locator('.ep-delivery-channel[aria-labelledby=push-channel-title] select').nth(1).selectOption('18');assert.equal(await page.locator('.ep-delivery-channel[aria-labelledby=push-channel-title] select').nth(1).inputValue(),'18');
 const originalDocs=[...docs];docs.push(...Array.from({length:23},(_,i)=>({...docs[0],id:`extra-${i}`,name:`Act de test ${i}`,category:'Personal',vehicle_id:null,expires:date(400+i)})));
 await page.goto(base+'/documents?category=Personal');await page.locator('.ep-document-list>.ep-document').first().waitFor();
 assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),10);
 await page.getByRole('button',{name:'Arată mai multe (10)',exact:true}).click();assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),20);
 await page.getByRole('button',{name:'Arată mai multe (4)',exact:true}).click();assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),24);
 await page.locator('.ep-act-group>summary').click();assert.equal(await page.locator('.ep-list-section .ep-document-list').count(),0);
 await page.locator('.ep-act-group>summary').click();assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),24);
 await page.getByRole('searchbox').fill('Act de test 22');assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),1);
 await page.getByRole('button',{name:'Șterge căutarea',exact:true}).click();assert.equal(await page.locator('.ep-list-section .ep-document-list>.ep-document').count(),10);docs=originalDocs;
 await page.goto(base+'/documents?category=Personal');await page.locator('.ep-act-group>summary strong').getByText('Acte personale',{exact:true}).waitFor();await page.locator('.ep-act-group>summary').click();assert.equal(await page.locator('.ep-act-group>.ep-document-list').count(),0);await page.locator('.ep-act-group>summary').click();assert.equal(await page.locator('.ep-act-group>.ep-document-list>.ep-document').count(),1);
 await page.goto(base+'/documents?category=Vehicles');await page.locator('.ep-vehicle-group').first().waitFor();assert.equal(await page.locator('.ep-act-group').count(),0);
 const guest=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});guest.setDefaultTimeout(12000);await fixture(guest,false);
 await guest.goto(base+'/login');await guest.getByText('Intră cu email și parolă',{exact:true}).click();await guest.getByRole('link',{name:'Ai uitat parola?',exact:true}).click();await guest.getByLabel('Adresa de email').fill('fixture@example.test');await guest.getByRole('button',{name:'Trimite linkul de resetare'}).click();await guest.getByRole('status').waitFor();assert.equal(recover,1);
 await guest.goto(base+'/reset-password');await guest.getByRole('link',{name:'Cere un link nou'}).waitFor();
 await page.goto(base+'/reset-password');await page.getByLabel('Parola nouă',{exact:true}).fill('NewPassword123!');await page.getByLabel('Confirmă parola').fill('NewPassword123!');await page.getByRole('button',{name:'Salvează parola'}).click();await page.getByText('Parola a fost schimbată.',{exact:false}).waitFor();assert.equal(updates,1);
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile/desktop dialog hit testing and scrolling, both themes; accent-insensitive search; finish/archive/reschedule; timed appointment persistence; unambiguous vehicle number; explicit renewal date; multiple notification hours; recovery request, expired link and password update with isolated API fixtures.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
