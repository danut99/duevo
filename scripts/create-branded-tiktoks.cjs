const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {spawn}=require('node:child_process');const fs=require('node:fs');
const dir='outputs/tiktok-cu-aplicatia';fs.mkdirSync(dir,{recursive:true});
const png=name=>'data:image/png;base64,'+fs.readFileSync('outputs/tiktok-app/'+name+'.png').toString('base64');
const clips=[{id:'rca-memoria-mea',code:'RCA',lines:[['Eu: țin minte tot.','RCA-ul? Nicio grijă.'],['Tot eu, după 5 minute:','Unde sunt cheile?!'],['Cheile nu le găsim.','Dar îți amintim de RCA.'],['Telefonul ține minte.','Tu îți vezi de drum.']]},{id:'rovinieta-sunt-un-pdf',code:'ROV',lines:[['Eu: cafea, playlist...','Plecăm liniștiți!'],['Rovinieta: drum bun!','Eu am expirat ieri.'],['Eu: puteai să-mi spui!','Rovinieta: sunt un PDF.'],['Cu Duevo, data viitoare:','Primești un semn din timp.']]}];
async function encode(frames,id){
 const out=`${dir}/${id}.mp4`;const ff=spawn('outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe',['-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-f','lavfi','-i','sine=frequency=740:sample_rate=44100:duration=20','-filter:a',"volume='if(lt(mod(t,4),0.08),0.055,0)':eval=frame,afade=t=out:st=19.6:d=0.4",'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-t','20','-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});let log='';ff.stderr.on('data',d=>log+=d);const done=new Promise((res,rej)=>{ff.on('error',rej);ff.on('close',code=>code===0?res():rej(Error(log)))});for(const f of frames)if(!ff.stdin.write(Buffer.from(f,'base64')))await new Promise(r=>ff.stdin.once('drain',r));ff.stdin.end();await done;return out;
}
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const page=await b.newPage({viewport:{width:720,height:1280}});
for(const clip of clips){const assets={hero:png(clip.code+'-hero'),date:png(clip.code+'-date'),reminders:png(clip.code+'-reminders'),folders:png('folders'),logo:'data:image/svg+xml;base64,'+fs.readFileSync('public/duevo-mark.svg').toString('base64')};await page.setContent('<body style="margin:0"><canvas width="720" height="1280"></canvas></body>');
const frames=await page.evaluate(async({clip,assets})=>{
 const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),images={};for(const [key,src] of Object.entries(assets)){const image=new Image();image.src=src;await image.decode();images[key]=image}
 const orange='#ff641f',white='#f8f7f4',muted='#adaeb9';
 function box(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
 function text(value,x,y,size=42,color=white,weight=800){c.fillStyle=color;c.font=`${weight} ${size}px Arial`;const max=612;while(c.measureText(value).width>max&&size>20){size--;c.font=`${weight} ${size}px Arial`}c.fillText(value,x,y)}
 function panel(key,y,width=600,scale=1){const img=images[key],height=width*img.height/img.width,x=(720-width)/2;c.save();c.translate(360,y+height/2);c.scale(scale,scale);c.shadowColor='#0007';c.shadowBlur=25;c.drawImage(img,-width/2,-height/2,width,height);c.restore();return height}
 function cursor(x,y,u){const radius=14+10*u;c.strokeStyle=`rgba(255,100,31,${1-u})`;c.lineWidth=4;c.beginPath();c.arc(x,y,radius,0,7);c.stroke();box(x-5,y-5,10,10,5,orange)}
 function draw(t){c.fillStyle='#0c0c0f';c.fillRect(0,0,720,1280);const g=c.createRadialGradient(620,200,10,620,200,800);g.addColorStop(0,'#ff641f15');g.addColorStop(1,'#ff641f00');c.fillStyle=g;c.fillRect(0,0,720,1280);
 c.drawImage(images.logo,54,60,48,48);text('Duevo',116,98,42);text('ACTELE TALE. LA TIMP.',54,147,15,muted,600);
 const scene=Math.min(4,Math.floor(t/4)),local=t-scene*4,alpha=Math.min(1,local/.28),ease=1-Math.pow(1-Math.min(1,local/3.8),3);c.save();c.globalAlpha=alpha;c.translate(0,14*(1-alpha));
 if(scene<4){const lines=clip.lines[scene];text(lines[0],54,270,42);text(lines[1],54,332,46,orange)}
 if(scene===0){panel('hero',415,600,1+ease*.025);box(54,860,612,80,20,'#222228');text(clip.code==='RCA'?'„Nu-mi trebuie reamintire.”':'Totul pregătit. Aproape totul.',77,911,29,white,600)}
 if(scene===1){const shake=clip.code==='ROV'?Math.sin(local*30)*Math.max(0,1-local)*10:0;c.save();c.translate(shake,0);panel('date',440,600,1+ease*.035);c.restore();box(54,780,612,126,24,'#262026');text(clip.code==='RCA'?'Memoria mea: pauză.':'Rovinieta nu vorbește.',78,832,35);text(clip.code==='RCA'?'Duevo: mă ocup eu.':'Duevo îți poate aminti.',78,875,31,orange);text('UMOR · DATE FICTIVE ÎN DEMONSTRAȚIE',54,970,14,muted,500)}
 if(scene===2){panel('reminders',440,600,1+ease*.02);text('Alegi alertele înainte de termen.',54,740,30,white,600);text('30, 14, 7 zile sau o zi înainte.',54,788,28,muted,500);if(local>1)cursor(125+Math.min(3,Math.floor(local-.8))*137,590,(local%1));}
 if(scene===3){panel('hero',400,560,1+ease*.02);const y=800+40*(1-ease);box(54,y,612,160,25,'#f2f0ec');c.drawImage(images.logo,76,y+20,32,32);text('Duevo',122,y+46,24,'#151518');text(clip.code==='RCA'?'Asigurare RCA':'Rovinietă',78,y+96,32,'#151518');text(clip.code==='RCA'?'expiră în 14 zile.':'expiră în 7 zile.',78,y+134,30,'#a43c10');text('EXEMPLU DE NOTIFICARE',54,y+196,14,muted,600)}
 if(scene===4){c.drawImage(images.logo,289,235,142,142);text('Actele expiră.',54,490,59);text('Tu afli din timp.',54,565,59,orange);panel('folders',640,600,1+ease*.02);box(54,930,612,82,24,orange);text('Descoperă Duevo',170,983,36,'#fff');text(clip.code==='RCA'?'Pentru actele pe care nu vrei să le uiți.':'Pentru drumuri cu mai puține griji.',54,1064,23,muted,500)}
 c.restore();box(54,1124,612,3,2,'#28282f');box(54,1124,612*t/20,3,2,orange);text('MAI PUȚINE GRIJI. ZI DE ZI.',54,1176,16,muted,600);
 }
 window.drawFrame=draw;const frames=[];for(let i=0;i<600;i++){draw(i/30);frames.push(canvas.toDataURL('image/jpeg',.94).split(',')[1])}return frames;
},{clip,assets});
console.log(await encode(frames,clip.id));for(const [label,time] of [['coperta',1.7],['aplicatie',10],['notificare',14],['final',18]]){await page.evaluate(t=>window.drawFrame(t),time);await page.screenshot({path:`${dir}/${clip.id}-${label}.png`})}
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
