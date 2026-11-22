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
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844},acceptDownloads:true}),errors=[];page.setDefaultTimeout(60000);await page.addInitScript(()=>{localStorage.setItem('duevo-language','ro');localStorage.setItem('duevo-country','RO')});page.on('pageerror',e=>errors.push(e.message));
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
 fs.mkdirSync('outputs/tiktok-rca',{recursive:true});
 await page.goto(base+'/documents/'+did,{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('dialog').waitFor();await page.locator('.ep-workspace').evaluateAll(nodes=>nodes.forEach(el=>el.dataset.theme='obsidian'));await page.getByRole('dialog').screenshot({path:'outputs/tiktok-rca/rca-screen.png'});
 await page.goto(base+'/documents/'+did+'/edit',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.ep-editor-form').waitFor();await page.locator('.ep-workspace').evaluate(el=>el.dataset.theme='obsidian');await page.locator('.ep-reminder-chips').screenshot({path:'outputs/tiktok-rca/reminders.png'});
 const data='data:image/png;base64,'+fs.readFileSync('outputs/tiktok-rca/rca-screen.png').toString('base64');
 await page.setViewportSize({width:720,height:1280});await page.setContent('<html><body style="margin:0;background:#101012"><canvas width="720" height="1280"></canvas></body></html>');
 const result=await page.evaluate(async data=>{
 const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');const screenshot=new Image();screenshot.src=data;await screenshot.decode();
 const W=720,H=1280,orange='#ff641f',white='#f7f6f2',muted='#a7a7ae';
 function text(value,x,y,size=52,color=white,weight=800){c.fillStyle=color;c.font=`${weight} ${size}px Arial`;c.fillText(value,x,y)}
 function box(x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
 function chip(value,x,y,active){box(x,y,130,64,22,active?orange:'#28282f');text(value,x+22,y+42,26,active?'#fff':muted)}
 function draw(t){c.fillStyle='#101012';c.fillRect(0,0,W,H);const grad=c.createRadialGradient(600,200,0,600,200,700);grad.addColorStop(0,'#ff641f12');grad.addColorStop(1,'#10101200');c.fillStyle=grad;c.fillRect(0,0,W,H);
 text('duevo',54,95,40);text('.',174,95,40,orange);text('ACTELE TALE. LA TIMP.',54,128,13,muted,600);
 const scene=t<3.4?0:t<6.2?1:t<10.6?2:t<14.8?3:4;const starts=[0,3.4,6.2,10.6,14.8];const u=Math.min(1,(t-starts[scene])/.4);c.save();c.globalAlpha=u;c.translate(0,20*(1-u));
 if(scene===0){text('AI LUAT AMENDĂ',54,350,53);text('PENTRU CĂ ȚI-A',54,420,53);text('EXPIRAT RCA-UL?',54,498,57,orange);box(54,590,612,180,28,'#242026');text('RCA',82,645,24,muted);text('Data a trecut.',82,706,39);text('Se poate întâmpla.',54,865,29,muted,500)}
 if(scene===1){text('Data era pe poliță.',54,365,48);text('Dar cine stă',54,435,50);text('să o verifice?',54,505,53,orange);box(54,600,612,136,25,'#202025');text('O dată salvată.',80,655,35);text('O grijă în minus.',80,706,35,orange)}
 if(scene===2){text('Salvează RCA-ul',54,235,46);text('În Duevo.',54,295,48,orange);c.save();c.beginPath();c.roundRect(100,345,520,610,30);c.clip();c.drawImage(screenshot,0,0,screenshot.width,Math.min(screenshot.height,620),100,345,520,610);c.restore();text('DEMONSTRAȚIE · DATE FICTIVE',155,998,14,muted,500)}
 if(scene===3){text('Alege când',54,275,52);text('să-ți amintim.',54,345,52,orange);chip('30 zile',54,420,t>10.9);chip('14 zile',204,420,t>11.4);chip('7 zile',354,420,t>11.9);chip('1 zi',504,420,t>12.4);box(54,570,612,220,28,'#24242a');text('Duevo',82,624,30);text('Asigurare RCA',82,680,37);text('expiră în 14 zile.',82,731,36,orange);text('Exemplu de notificare',54,835,20,muted,500)}
 if(scene===4){text('Actele expiră.',54,400,61);text('Tu afli din timp.',54,482,59,orange);box(54,610,612,84,24,orange);text('Descoperă Duevo',171,665,34,'#fff');text('Salvează clipul pentru mai târziu.',54,790,25,muted,500)}
 c.restore();box(54,1110,612,3,2,'#29292f');box(54,1110,612*Math.min(t/18.5,1),3,2,orange);text('MAI PUȚINE GRIJI. ZI DE ZI.',54,1162,16,muted,600);
 }
 draw(.6);window.renderAt=draw;
 const frames=[];for(let i=0;i<555;i++){draw(i/30);frames.push(canvas.toDataURL('image/jpeg',.93).split(',')[1])}return frames;
 },data);
 const {spawn}=require('node:child_process');const ff=spawn('outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe',['-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','outputs/tiktok-rca/duevo-rca-tiktok.mp4'],{stdio:['pipe','ignore','pipe']});let log='';ff.stderr.on('data',d=>log+=d);const finished=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(Error(log)))});for(const frame of result){if(!ff.stdin.write(Buffer.from(frame,'base64')))await new Promise(r=>ff.stdin.once('drain',r))}ff.stdin.end();await finished;
 await page.evaluate(()=>window.renderAt(1.5));await page.screenshot({path:'outputs/tiktok-rca/coperta.png'});console.log('Created outputs/tiktok-rca/duevo-rca-tiktok.mp4');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
