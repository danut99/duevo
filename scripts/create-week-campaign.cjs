const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const funny=process.argv.includes('--funny');
const dir=funny?'outputs/creator-amuzante':'outputs/campanie-7-zile',fps=30,duration=funny?12:18;
fs.mkdirSync(dir,{recursive:true});
const S=(seconds,headline,asset,speech,mode='phone',label='ÎN DUEVO')=>({seconds,headline,asset,speech,mode,label});
const clips=funny?require('./funny-campaign.json'):[
 {day:1,id:'01-adauga-act',title:'Adaugă primul act',caption:'RCA-ul expiră. Întrebarea e: tu când afli? Adaugă termenul în Duevo și alege reamintirile. Tu ce act ai adăuga primul? #Duevo #ActeAuto #RCA #Organizare',shots:[
 S(3,['RCA-ul expiră.','Tu când afli?'],'rca','Îți arăt cum salvezi un act.'),
 S(4,['1. Alege','tipul actului.'],'tipuri','Aici alegi RCA, ITP sau alt act.'),
 S(3,['2. Completează','data expirării.'],'termen','Pui data din documentul tău.','focus'),
 S(4,['3. Alege','reamintirile.'],'alerte','Tu alegi cu câte zile înainte.','focus'),
 S(4,['Primul act.','O grijă în minus.'],'rca','Salvează primul tău act în Duevo.','phone','ÎNCEARCĂ DUEVO') ]},
 {day:2,id:'02-seteaza-notificari',title:'Setează reamintirile',caption:'„Țin eu minte” nu este o reamintire. În Duevo alegi zilele de alertă și configurezi notificările pe dispozitiv. #Duevo #Reamintiri #Organizare #Acte',shots:[
 S(3,['„Țin eu minte.”','Sigur?'],'alerte','Memoria ta are deja destulă treabă.','focus'),
 S(4,['Alege când','vrei un semn.'],'alerte','Alegi treizeci, paisprezece, șapte zile sau o zi.','focus'),
 S(3,['Și pe telefon,','nu doar în cap.'],'notificari','Aici pornești notificările pe dispozitiv.'),
 S(4,['La orele','alese de tine.'],'notificari','Aici alegi orele de trimitere și salvezi.'),
 S(4,['Lasă memoria','pentru altceva.'],'alerte','Setează reamintirile pentru primul tău act.','focus','ÎNCEARCĂ DUEVO') ]},
 {day:3,id:'03-adauga-masina',title:'Adaugă mașina',caption:'Două mașini. Mai multe acte. O singură memorie? În Duevo adaugi mașina și îi grupezi actele. VIN-ul este opțional. #Duevo #Masina #ActeAuto #Soferi',shots:[
 S(3,['Două mașini.','O singură memorie?'],'masini','Fiecare mașină poate avea dosarul ei.'),
 S(4,['1. Adaugă','mașina.'],'masina-goala','Deschizi formularul și introduci numărul de înmatriculare.','focus'),
 S(3,['2. Dă-i','un nume.'],'masina-formular','Adaugi numele. Seria de șasiu e opțională.','focus'),
 S(4,['3. Grupează','actele mașinii.'],'masini','Aici găsești actele organizate pentru fiecare mașină.'),
 S(4,['Mai puțin haos.','Mai mult control.'],'masini','Începe cu mașina ta în Duevo.','phone','ÎNCEARCĂ DUEVO') ]},
 {day:4,id:'04-dosare-auto-personal',title:'Organizează Auto și Personal',caption:'RCA-ul și buletinul n-au nevoie să stea în același haos. Dosare Auto și Personal, în același Duevo. Ce termen uiți cel mai des? #Duevo #Buletin #ActeAuto #Organizare',shots:[
 S(3,['RCA. Buletin. Permis.','Le mai ții minte?'],'dosare','Actele tale nu trebuie să fie împrăștiate.','focus'),
 S(4,['Auto,','în dosarul lui.'],'masini','Aici găsești actele pentru mașinile tale.'),
 S(3,['Personal,','la locul lui.'],'personal','Aici păstrezi termenele actelor personale.'),
 S(4,['Deschizi dosarul.','Găsești ce cauți.'],'dosare','Din aceste dosare ajungi la actele potrivite.','focus'),
 S(4,['Toate actele tale.','Un singur loc.'],'identitate','Adaugă și primul tău act personal.','phone','ÎNCEARCĂ DUEVO') ]},
 {day:5,id:'05-copii-documente',title:'Păstrează copii și caută',caption:'Ai poza talonului. Dar unde? În Duevo păstrezi copii cu nume clare și le găsești prin căutare. Copiile nu înlocuiesc actele originale. #Duevo #Documente #Organizare #PDF',shots:[
 S(3,['Ai poza actului.','Dar unde e?'],'copii','Printre poze, actele se pierd ușor.'),
 S(4,['Dă-i un nume.','Păstrează copia.'],'copii','Aici păstrezi pozele și PDF-urile documentelor tale.'),
 S(3,['Scrii „Talon”.','Îl găsești.'],'cautare','Cauți după numele documentului păstrat.'),
 S(4,['Copii organizate.','Fără vânătoare.'],'copii','Copiile stau aici, lângă actele tale.'),
 S(4,['Mai puțin scroll.','Mai mult „gata”.'],'cautare','Păstrează prima copie în Duevo.','phone','ÎNCEARCĂ DUEVO') ]},
 {day:6,id:'06-ce-urmeaza',title:'Vezi ce urmează',caption:'Ce act îți expiră primul? În Duevo vezi termenele pe care le-ai salvat, într-o privire. Fără să deschizi fiecare PDF. #Duevo #Reamintiri #Acte #Organizare',shots:[
 S(3,['Ce act îți','expiră primul?'],'ansamblu','Știi răspunsul fără să cauți prin acte?'),
 S(4,['Deschizi Duevo.','Vezi ce urmează.'],'ansamblu','Aici ai o privire de ansamblu asupra termenelor.'),
 S(3,['Vezi ce expiră','în curând.'],'rezumat','Rezumatul îți arată câte termene se apropie.','focus'),
 S(4,['De la „parcă”','la o dată clară.'],'rovinieta','Deschizi actul și vezi câte zile au rămas.'),
 S(4,['Actele expiră.','Tu afli din timp.'],'ansamblu','Adaugă termenele tale și urmărește ce urmează.','phone','ÎNCEARCĂ DUEVO') ]},
 {day:7,id:'07-incepe-cu-un-act',title:'Demonstrație rapidă',caption:'Nu trebuie să organizezi totul azi. Începe cu un act: alegi tipul, completezi data și setezi reamintirile. Care e primul? #Duevo #RCA #Productivitate #Organizare',shots:[
 S(3,['Tot amâni?','Începe cu un act.'],'tipuri','Uite pașii, direct în aplicație.'),
 S(4,['Alegi actul.','De exemplu, RCA.'],'tipuri','Selectezi tipul actului pe care vrei să-l urmărești.'),
 S(3,['Pui data.','Din document.'],'termen','Completezi data expirării din actul tău.','focus'),
 S(4,['Alegi alertele.','Salvezi.'],'alerte','Alegi când să-ți amintească și salvezi actul.','focus'),
 S(4,['Gata cu','„țin eu minte”.'],'rca','Începe azi cu primul act în Duevo.','phone','ÎNCEARCĂ DUEVO') ]}
];
const hashtagSets=require('./creator-hashtags.json');
for(const clip of clips){if(hashtagSets[clip.id])clip.caption=clip.caption.replace(/(?:\s+#\S+)+$/,'')+' '+hashtagSets[clip.id];let start=0;for(const shot of clip.shots){shot.start=start;start+=shot.seconds;shot.end=start;shot.words=shot.speech.trim().split(/\s+/).length;shot.readSeconds=shot.words/3.1+.12;if(shot.readSeconds>shot.seconds-.35)throw Error('Replica prea lungă: '+shot.speech);}if(start!==duration)throw Error('Durată incorectă');}
fs.writeFileSync(dir+'/plan.json',JSON.stringify({duration,clips},null,2));
// Original, quiet instrumental backing, synthesized locally; no licensed song.
function makeAudio(){const sr=44100,n=duration*sr,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);let seed=927;
const notes=[110,130.8128,164.8138,146.8324];for(let i=0;i<n;i++){const t=i/sr,p=t%.5,hat=t%.25;seed=(seed*16807)%2147483647;const noise=seed/2147483647*2-1;const kick=.10*Math.sin(2*Math.PI*(48*p+34*(1-Math.exp(-p*24))/24))*Math.exp(-p*25);const bass=.035*Math.sin(2*Math.PI*notes[Math.floor(t/2)%4]*t)*Math.exp(-p*5);const hh=.011*noise*Math.exp(-hat*120);const bell=.015*Math.sin(2*Math.PI*notes[Math.floor(t*2)%4]*4*t)*Math.exp(-p*9);const fade=Math.min(1,t/.1,(duration-t)/.4);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,(kick+bass+hh+bell)*fade))*32767),44+i*2);}fs.writeFileSync(dir+'/sunet-original.wav',b);}
makeAudio();
const imageData=p=>'data:image/png;base64,'+fs.readFileSync(p).toString('base64');
async function render(){const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1080,height:1920}});
for(const clip of clips){await page.setContent('<canvas width="1080" height="1920"></canvas><style>body{margin:0;background:#111}</style>');
const assets={};for(const key of new Set(clip.shots.map(s=>s.asset)))assets[key]=imageData('outputs/campanie-7-zile/assets/'+key+'.png');for(const [key,name]of [['closed','vulpe'],['half','vulpe-gura-intermediara'],['open','vulpe-gura-deschisa']])assets[key]=imageData('outputs/tiktok-vulpe/'+name+'.png');assets.logo='data:image/svg+xml;base64,'+fs.readFileSync('public/duevo-mark.svg').toString('base64');
await page.evaluate(async({clip,assets})=>{const cv=document.querySelector('canvas'),c=cv.getContext('2d'),images={};for(const [key,src]of Object.entries(assets)){const im=new Image();im.src=src;await im.decode();images[key]=im;}
const O='#ff641f',W='#faf8f4',M='#aaa6b1';
function box(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function txt(s,x,y,size,color=W,weight=800,max=590){c.fillStyle=color;do{c.font=`${weight} ${size}px Arial`;if(c.measureText(s).width<=max||size<=9)break;size--;}while(true);c.fillText(s,x,y);}
function wrapped(s,x,y,max,lineHeight,size,color=W){c.font=`600 ${size}px Arial`;c.fillStyle=color;let line='',row=0;for(const word of s.split(' ')){const next=line?line+' '+word:word;if(c.measureText(next).width>max&&line){c.fillText(line,x,y+row++*lineHeight);line=word;}else line=next;}if(line)c.fillText(line,x,y+row*lineHeight);return row+1;}
function screenImage(im,x,y,w,h,progress){const ih=w*im.height/im.width;const pan=Math.min(Math.max(0,ih-h),180)*progress;c.save();c.beginPath();c.roundRect(x,y,w,h,16);c.clip();c.fillStyle='#0c0c0d';c.fillRect(x,y,w,h);c.drawImage(im,x,y-pan,w,ih);c.restore();}
function phone(shot,p,t){const x=145+Math.sin(t*.8)*3,y=345+5*(1-p),w=400,h=515;c.save();c.translate(x+w/2,y+h/2);c.rotate(Math.sin(t*.55)*.012);c.translate(-w/2,-h/2);c.shadowColor='#0009';c.shadowBlur=30;box(-5,-5,w+10,h+10,42,'#29282d');c.shadowBlur=0;box(0,0,w,h,38,'#0b0b0d');c.strokeStyle='#4d4851';c.lineWidth=1;c.stroke();txt('9:41',23,28,12,W,700);box(w/2-38,12,76,15,8,'#252329');txt('•••',w-47,28,12,M,600);c.drawImage(images.logo,22,52,23,23);txt('duevo.',54,70,23);screenImage(images[shot.asset],14,94,w-28,h-111,Math.max(0,p-.2)/.8);c.restore();}
function focus(shot,p,t){const im=images[shot.asset],w=Math.min(580,450*im.width/im.height),h=w*im.height/im.width,x=(690-w)/2,y=385+(450-h)/2;c.save();c.translate(345,y+h/2);c.scale(1+.012*p,1+.012*p);c.translate(-345,-y-h/2);box(x-8,y-8,w+16,h+16,25,'#32272a');screenImage(im,x,y,w,h,0);c.restore();txt('INTERFAȚĂ DUEVO · DATE DEMO',54,866,11,M,600);}
function fox(t,shot){const speakStart=shot.start+.15,elapsed=t-speakStart,active=elapsed>=0&&elapsed<shot.readSeconds;let pose=images.closed;
if(active){const phase=(elapsed%(.28+Math.floor(elapsed)%2*.04))/.3;pose=phase<.17||phase>.62&&phase<.84?images.half:phase<.62?images.open:images.closed;}
const w=226,h=w*images.closed.height/images.closed.width;c.save();c.translate(125,1025+Math.sin(t*2.2)*2);c.rotate(Math.sin(t*1.6)*.012);c.drawImage(pose,-w/2,-h/2,w,h);c.restore();
box(254,919,385,174,24,'#27252c');c.fillStyle='#27252c';c.beginPath();c.moveTo(255,956);c.lineTo(236,970);c.lineTo(255,984);c.fill();txt('VULPEA ÎȚI ARATĂ',274,947,11,'#ffad83',700);wrapped(shot.speech,274,977,338,28,23);box(274,1070,335,3,2,'#48414b');if(active)box(274,1070,335*Math.min(1,elapsed/shot.readSeconds),3,2,O);
}
window.draw=t=>{c.setTransform(1.5,0,0,1.5,0,0);c.fillStyle='#101013';c.fillRect(0,0,720,1280);const glow=c.createRadialGradient(570,500,0,570,500,650);glow.addColorStop(0,'#ff641f17');glow.addColorStop(1,'#ff641f00');c.fillStyle=glow;c.fillRect(0,0,720,1280);
const shot=clip.shots.find(s=>t>=s.start&&t<s.end)||clip.shots.at(-1),local=t-shot.start,p=Math.min(1,local/shot.seconds),entrance=Math.min(1,local/.16);c.drawImage(images.logo,54,92,30,30);txt('duevo.',94,116,27);txt(clip.id.startsWith('funny-')?'CU HAZ':'ZIUA '+clip.day+' / 7',540,113,13,M,700,100);
c.save();c.globalAlpha=entrance;c.translate(0,8*(1-entrance));txt(shot.headline[0],54,205,49,W,900);txt(shot.headline[1],54,264,49,O,900);txt(shot.label,54,309,12,M,700);if(shot.mode==='phone')phone(shot,p,t);else focus(shot,p,t);c.restore();fox(t,shot);
const last=shot===clip.shots.at(-1);if(last){box(54,1124,585,50,17,O);txt('Descoperă Duevo · link în bio',107,1157,24,W,800,485);}else{txt('DEMONSTRAȚIE · DATE FICTIVE',54,1150,11,M,600);}
const segments=clip.shots.length,segmentWidth=(585-(segments-1)*10)/segments;for(let i=0;i<segments;i++)box(54+i*(segmentWidth+10),1190,segmentWidth,3,2,i<=clip.shots.indexOf(shot)?O:'#373139');
};
},{clip,assets});
// Reviewable cover and contact sheet are saved before encoding.
for(const [name,t]of [['coperta',1],['functie',funny?7:8.5],['final',duration-2]]){await page.evaluate(t=>window.draw(t),t);await page.screenshot({path:dir+'/'+clip.id+'-'+name+'.png'});}
if(process.argv.includes('--preview-only')){console.log('Preview '+clip.id);continue;}
const ff=spawn('outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe',['-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-i',dir+'/sunet-original.wav','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-t',String(duration),'-movflags','+faststart',dir+'/'+clip.id+'.mp4'],{stdio:['pipe','ignore','pipe']});let log='';ff.stderr.on('data',d=>log+=d);const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',n=>n===0?resolve():reject(Error(log)))});
for(let start=0;start<fps*duration;start+=15){const frames=await page.evaluate(start=>{const frames=[];for(let i=0;i<15;i++){window.draw((start+i)/30);frames.push(document.querySelector('canvas').toDataURL('image/jpeg',.95).split(',')[1]);}return frames;},start);for(const frame of frames)if(!ff.stdin.write(Buffer.from(frame,'base64')))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();await done;console.log('Created '+clip.id+' · '+duration+'s · 1080x1920');
}
}finally{await browser.close();}}
function writePlan(){const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');let html=`<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Duevo · 7 zile</title><style>body{background:#101013;color:#faf8f4;font:16px/1.6 Arial;max-width:1150px;margin:auto;padding:32px}h1{font-size:38px}em,a{color:#ff915b}article{background:#211f26;border:1px solid #42353a;border-radius:24px;padding:24px;margin:28px 0;display:grid;grid-template-columns:240px 1fr;gap:28px}video{width:240px;border-radius:18px}textarea{width:94%;min-height:110px;background:#151418;color:#eee;padding:14px;border:1px solid #51414b;border-radius:12px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:9px;border-bottom:1px solid #45373f}@media(max-width:650px){article{display:block}video{width:100%;max-width:320px}}small{color:#bbb}</style><h1>Actele expiră.<br><em>Tu afli din timp.</em></h1><p>Plan de 7 zile · câte un clip pe zi · TikTok și Reels · 18 secunde · 1080 × 1920</p><p>Publică în ordinea de mai jos. Folosește aceeași oră ca punct de pornire și ajustează după datele contului; ora nu garantează distribuirea. Pune linkul Duevo în bio acolo unde este disponibil. Răspunde comentariilor și notează vizitele pe profil, accesările linkului și câți oameni adaugă un prim act.</p><p>Vulpea explică fiecare imagine. Mișcarea gurii urmărește durata estimată de citire a replicii. Fără voce; cu instrumental original discret. Capturile sunt din aplicația reală, cu date fictive și prezentare în mockup. Datele actelor se introduc manual. Copiile nu înlocuiesc originalele.</p>`;
for(const c of clips){html+=`<article><div><video controls preload="metadata" poster="${c.id}-coperta.png" src="${c.id}.mp4"></video><p><a href="${c.id}.mp4" download>Descarcă MP4</a> · <a href="${c.id}-coperta.png" download>Copertă</a></p></div><div><small>ZIUA ${c.day} · 18 SECUNDE</small><h2>${esc(c.title)}</h2><textarea readonly>${esc(c.caption)}</textarea><table><tr><th>Interval</th><th>Replica vulpii</th></tr>${c.shots.map(s=>`<tr><td>${s.start}–${s.end}s</td><td>${esc(s.speech)}</td></tr>`).join('')}</table></div></article>`;}
html+='<p>Structura: început cu o întrebare, demonstrație și îndemn clar. <a href="https://ads.tiktok.com/business/en/guides/video-advertising-guide">Ghid TikTok pentru conținut video</a>. Nu sunt promise rezultate sau funcții de verificare automată a actelor.</p></html>';
if(funny)html=html.replaceAll('Plan de 7 zile','Clipuri cu haz').replaceAll('câte un clip pe zi','3 scenete scurte').replaceAll('18 secunde','12 secunde').replaceAll('18 SECUNDE','12 SECUNDE').replaceAll('ZIUA ','CLIPUL ');
fs.writeFileSync(dir+(funny?'/clipuri-amuzante.html':'/plan-7-zile.html'),html);
fs.writeFileSync(dir+'/descrieri-postari.txt',clips.map(c=>`${funny?'CLIPUL':'ZIUA'} ${c.day} — ${c.title}\n${c.caption}\nFișier: ${c.id}.mp4\n`).join('\n'));
}
writePlan();if(!process.argv.includes('--plan-only'))render().catch(e=>{console.error(e);process.exitCode=1});
