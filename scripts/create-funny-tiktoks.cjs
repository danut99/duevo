const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {spawn}=require('node:child_process');const fs=require('node:fs');
const dir='outputs/tiktok-amuzante';fs.mkdirSync(dir,{recursive:true});
const ffmpeg='outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const clips=[
 {id:'rca-memorie',title:'Memoria de șofer',scenes:[
 {label:'EU, FOARTE SIGUR PE MINE',lines:['Nu-mi trebuie','reamintire.'],accent:'Țin eu minte.',kind:'confident'},
 {label:'TOT EU, CINCI MINUTE MAI TÂRZIU',lines:['Unde am pus','cheile?'],accent:'Dar RCA-ul?',kind:'keys'},
 {label:'MEMORIA MEA',lines:['Parola de Wi-Fi','din 2014? ȘTIU.'],accent:'RCA? N-am idee.',kind:'brain'},
 {label:'LASĂ TELEFONUL SĂ ȚINĂ MINTE',lines:['Asigurare RCA'],accent:'expiră în 14 zile.',kind:'notification'},
 {label:'DUEVO',lines:['Tu cauți cheile.'],accent:'Noi îți amintim.',kind:'end'}]},
 {id:'rovinieta-a-expirat',title:'Rovinieta are alte planuri',scenes:[
 {label:'EU, ÎNAINTE DE DRUM',lines:['Cafea? DA.','Playlist? DA.'],accent:'Plecăm liniștiți.',kind:'car'},
 {label:'ROVINIETA, DIN FUNDAL',lines:['Drum bun!'],accent:'Eu am expirat ieri.',kind:'expired'},
 {label:'EU',lines:['Puteai să spui','și tu ceva...'],accent:'Rovinieta: sunt PDF.',kind:'pdf'},
 {label:'DATA VIITOARE, CU DUEVO',lines:['Rovinietă'],accent:'expiră în 7 zile.',kind:'notification'},
 {label:'DUEVO',lines:['Playlist pentru drum.'],accent:'Reamintiri de la noi.',kind:'end'}]}
];
async function encode(frames,id){
 const output=`${dir}/${id}.mp4`;
 const args=['-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-f','lavfi','-i','sine=frequency=740:sample_rate=44100:duration=16','-filter:a',"volume='if(lt(mod(t,3.2),0.09),0.075,0)':eval=frame,afade=t=out:st=15.5:d=0.5",'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-t','16','-movflags','+faststart',output];
 const child=spawn(ffmpeg,args,{stdio:['pipe','ignore','pipe']});let log='';child.stderr.on('data',d=>log+=d);const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(log)))});
 for(const frame of frames){if(!child.stdin.write(Buffer.from(frame,'base64')))await new Promise(resolve=>child.stdin.once('drain',resolve))}child.stdin.end();await done;return output;
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:720,height:1280}});
 for(const clip of clips){
 await page.setContent('<body style="margin:0;background:#101012"><canvas width="720" height="1280"></canvas></body>');
 const frames=await page.evaluate(clip=>{
 const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),orange='#ff641f',ink='#f7f6f3',muted='#aaaab4';
 function box(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
 function text(value,x,y,size=48,color=ink,weight=800){c.font=`${weight} ${size}px Arial`;c.fillStyle=color;c.fillText(value,x,y)}
 function centered(value,y,size,color=ink){c.font=`800 ${size}px Arial`;c.fillStyle=color;c.fillText(value,(720-c.measureText(value).width)/2,y)}
 function icon(kind,t){c.save();c.translate(360,280+Math.sin(t*3)*5);
 if(kind==='car'){box(-140,-40,280,95,24,orange);c.fillStyle=orange;c.beginPath();c.moveTo(-100,-40);c.lineTo(-62,-100);c.lineTo(62,-100);c.lineTo(115,-40);c.fill();box(-61,-86,112,44,8,'#17232d');for(const x of [-90,90]){c.fillStyle='#f5f4f0';c.beginPath();c.arc(x,58,27,0,7);c.fill();c.fillStyle='#24242a';c.beginPath();c.arc(x,58,14,0,7);c.fill()}}
 else if(kind==='keys'){c.strokeStyle=orange;c.lineWidth=14;c.beginPath();c.arc(-30,-20,42,0,7);c.stroke();c.beginPath();c.moveTo(0,12);c.lineTo(85,97);c.lineTo(103,78);c.moveTo(62,72);c.lineTo(78,53);c.stroke()}
 else if(kind==='pdf'||kind==='expired'){box(-65,-105,130,170,14,'#f7f6f2');box(-42,-75,84,44,8,orange);text('PDF',-32,-44,25,'#fff');for(let i=0;i<3;i++)box(-40,-8+i*20,80-i*12,5,3,'#aaa');if(kind==='expired'){c.rotate(-.15);box(-125,30,250,54,8,'#ef4545');text('EXPIRAT',-100,68,36,'#fff')}}
 else if(kind==='notification'){box(-50,-92,100,168,22,'#35353d');box(-41,-81,82,143,15,'#1a1a20');box(-20,-45,40,42,12,orange);centered('',0,1);c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.moveTo(-11,-25);c.lineTo(-2,-16);c.lineTo(13,-34);c.stroke()}
 else if(kind==='brain'){for(const [x,y,r] of [[-46,-39,38],[0,-65,42],[47,-38,37],[-44,16,39],[8,15,46],[53,12,31]]){c.fillStyle=orange;c.beginPath();c.arc(x,y,r,0,7);c.fill()}c.strokeStyle='#572512';c.lineWidth=5;c.beginPath();c.moveTo(0,-79);c.lineTo(0,46);c.moveTo(-52,-19);c.lineTo(-20,0);c.moveTo(47,-20);c.lineTo(20,10);c.stroke()}
 else {box(-70,-82,140,140,34,orange);text(kind==='end'?'✓':':)',-40,12,76,'#fff')}
 c.restore()}
 function draw(t){c.fillStyle='#101012';c.fillRect(0,0,720,1280);const gradient=c.createRadialGradient(600,220,0,600,220,680);gradient.addColorStop(0,'#ff641f18');gradient.addColorStop(1,'#ff641f00');c.fillStyle=gradient;c.fillRect(0,0,720,1280);text('duevo.',54,90,40);text('ACTELE TALE. LA TIMP.',54,123,13,muted,600);
 const i=Math.min(4,Math.floor(t/3.2)),s=clip.scenes[i],local=t-i*3.2,alpha=Math.min(1,local/.22);c.save();c.globalAlpha=alpha;c.translate(0,14*(1-alpha));icon(s.kind,t);
 text(s.label,54,420,18,muted,700);
 s.lines.forEach((line,n)=>text(line,54,510+n*70,line.length>20?43:55));
 const y=s.lines.length===1?590:660;box(44,y-49,632,88,20,s.kind==='expired'?'#471f22':'#2c211c');text(s.accent,64,y+8,s.accent.length>24?34:s.accent.length>20?37:44,orange);
 if(s.kind==='notification'){text('Exemplu de notificare',54,y+91,20,muted,500);box(54,y+133,612,64,18,'#24242a');text('30 zile   ·   14 zile   ·   7 zile   ·   1 zi',77,y+175,24,ink,600)}
 if(s.kind==='end'){text('Actele expiră.',54,840,33,muted,600);text('Tu afli din timp.',54,891,37);box(54,960,612,77,23,orange);text('Descoperă Duevo',183,1010,31,'#fff')}
 c.restore();box(54,1113,612,3,2,'#2b2b30');box(54,1113,612*t/16,3,2,orange);text('MAI PUȚINE GRIJI. ZI DE ZI.',54,1160,16,muted,600)}
 window.drawFrame=draw;const frames=[];for(let i=0;i<480;i++){draw(i/30);frames.push(canvas.toDataURL('image/jpeg',.94).split(',')[1])}return frames;
 },clip);
 const output=await encode(frames,clip.id);for(const [label,t] of [['coperta',1.4],['gluma',7.8],['final',14.7]]){await page.evaluate(t=>window.drawFrame(t),t);await page.screenshot({path:`${dir}/${clip.id}-${label}.png`})}console.log(output);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
