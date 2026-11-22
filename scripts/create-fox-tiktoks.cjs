const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const dir='outputs/tiktok-vulpe'; fs.mkdirSync(dir,{recursive:true});
const previewOnly=process.argv.includes('--preview-only');
const motionProof=process.argv.includes('--motion-proof');
const version='-v3';
const duration=motionProof?4:25;
const clips=[
 {id:'01-memoria',lines:[['Parola Wi-Fi din 2014?','O știi pe de rost.'],['Când expiră ITP-ul?','Liniște în sală.'],['Eu zic să-l treci în Duevo.','Și să alegi o reamintire.'],['Tu ai alte lucruri de ținut minte.','De exemplu, unde ai pus cheile.']]},
 {id:'02-familia',lines:[['Două mașini în familie.','O singură memorie. A ta.'],['RCA, ITP, rovinietă…','Parcă dai examen din date.'],['Pune actele în dosarele Duevo.','Și setează reamintirile.'],['Mai puțin „parcă era luna asta”.','Mai mult „știu când”.']]},
 {id:'03-tin-eu-minte',lines:[['„Țin eu minte.”','Celebrul plan fără plan.'],['Apoi: muncă, cumpărături…','Și actul? A rămas pe ieri.'],['În Duevo, adaugi termenul.','Alegi când să fii anunțat.'],['Actele expiră.','Tu afli din timp.']]}
];
function data(path){return 'data:image/png;base64,'+fs.readFileSync(path).toString('base64')}
async function render(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{const page=await browser.newPage({viewport:{width:720,height:1280}});
 for(const clip of (previewOnly||motionProof?clips.slice(0,1):clips)){
 await page.setContent('<canvas width="720" height="1280"></canvas><style>body{margin:0}</style>');
 await page.evaluate(async({clip,assets})=>{
 const cv=document.querySelector('canvas'),c=cv.getContext('2d'),im={};
 for(const [k,src]of Object.entries(assets)){im[k]=new Image();im[k].src=src;await im[k].decode()}
 function box(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
 function text(s,x,y,size=36,color='#faf8f4',max=608){c.fillStyle=color;do{c.font=`800 ${size--}px Arial`}while(c.measureText(s).width>max);c.fillText(s,x,y)}
 function panel(key,y){const img=im[key],w=608,h=w*img.height/img.width;c.save();box(46,y-8,628,h+16,22,'#24242a');c.beginPath();c.roundRect(56,y,w,h,14);c.clip();c.drawImage(img,56,y,w,h);c.restore()}
 // Each pose is a complete, coherent character frame. Never composite a
 // replacement mouth over the original smile or warp strips of muzzle.
 function foxPose(t){
 const local=t%5;
 const phrases=[[.16,1.45],[1.72,2.9],[3.17,4.18]];
 const phrase=phrases.find(([a,b])=>local>=a&&local<=b);if(!phrase)return im.fox;
 const p=local-phrase[0];
 if(phrase[1]-local<.08)return im.half;
 const rhythm=[.27,.23,.31,.25,.29],period=1.35;
 let phase=p%period,index=0;
 while(index<rhythm.length-1&&phase>=rhythm[index])phase-=rhythm[index++];
 const u=phase/rhythm[index];
 if(u<.18||u>=.60&&u<.84)return im.half;
 if(u<.60)return index===1?im.half:im.mouth;
 return im.fox;
 }
 function fox(t){const bob=Math.sin(t*3)*2;
 c.save();c.translate(130,1010+bob);c.rotate(Math.sin(t*1.9)*.016);const w=300,h=w*im.fox.height/im.fox.width;c.drawImage(foxPose(t),-150,-h/2,w,h);
 c.restore();
 }
 window.draw=(t)=>{c.fillStyle='#101013';c.fillRect(0,0,720,1280);
 const glow=c.createRadialGradient(100,1050,10,100,1050,450);glow.addColorStop(0,'#ff641f19');glow.addColorStop(1,'#ff641f00');c.fillStyle=glow;c.fillRect(0,0,720,1280);
 c.drawImage(im.logo,48,66,42,42);text('duevo.',102,99,34);text('ACTELE TALE. LA TIMP.',48,145,15,'#aaa9b6');
 const scene=Math.min(4,Math.floor(t/5)),local=t%5;
 c.save();c.globalAlpha=Math.min(1,local/.18);c.translate(0,8*(1-c.globalAlpha));
 if(scene<4){text(clip.lines[scene][0],48,237,41);text(clip.lines[scene][1],48,295,41,'#ff641f');
 panel(scene===0?'hero':scene===1?'date':scene===2?'reminders':'folders',365);
 }else{text('Actele expiră.',48,242,58);text('Tu afli din timp.',48,313,55,'#ff641f');panel('folders',380);box(48,632,624,86,24,'#ff641f');text('Adaugă primul tău act.',85,686,37);text('Descoperă Duevo · link în bio',48,764,25,'#c6c4cd');}
 c.restore();
 fox(t);
 box(294,865,376,180,24,'#24242a');text(scene===4?'Ne vedem în Duevo!':scene===2?'Tu alegi termenul.':'Eu sunt cu reamintirile.',316,913,25,'#fff',330);
 text(scene===4?'Mai puține griji.':scene===2?'Duevo îți amintește.':'Tu vezi-ți de ziua ta.',316,952,24,'#ff915e',330);
 text('DEMONSTRAȚIE · DATE FICTIVE',48,1186,14,'#96939f');box(48,1214,624,4,2,'#333039');box(48,1214,624*t/25,4,2,'#ff641f');
 };
 window.drawFoxProof=()=>{cv.width=1200;cv.height=800;c.fillStyle='#17171b';c.fillRect(0,0,1200,800);const times=[.02,.20,.25,.35,.42,4.7];times.forEach((t,i)=>{const x=i%3*400,y=Math.floor(i/3)*400;c.save();c.translate(x+200-130*1.2,y+205-1010*1.2);c.scale(1.2,1.2);fox(t);c.restore();text(t+'s',x+24,y+375,23,'#ddd',350)})};
 window.drawFoxMotion=t=>{cv.width=720;cv.height=720;c.fillStyle='#17171b';c.fillRect(0,0,720,720);c.save();c.translate(360-130*2,370-1010*2);c.scale(2,2);fox(t);c.restore()};
 },{clip,assets:{fox:data(dir+'/vulpe.png'),half:data(dir+'/vulpe-gura-intermediara.png'),mouth:data(dir+'/vulpe-gura-deschisa.png'),logo:'data:image/svg+xml;base64,'+fs.readFileSync('public/duevo-mark.svg').toString('base64'),hero:data('outputs/tiktok-app/RCA-hero.png'),date:data('outputs/tiktok-app/RCA-date.png'),reminders:data('outputs/tiktok-app/RCA-reminders.png'),folders:data('outputs/tiktok-app/folders.png')}});
 if(previewOnly){await page.evaluate(()=>window.drawFoxProof());await page.setViewportSize({width:1200,height:800});await page.screenshot({path:dir+'/verificare-gura-v3.png'});continue;}
 const output=motionProof?'verificare-animatie-v3':clip.id+version;
 const ff=spawn('outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe',['-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-f','lavfi','-i',`sine=frequency=660:sample_rate=44100:duration=${duration}`,'-filter:a',"volume='if(lt(mod(t,5),0.09),0.04,0)':eval=frame",'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-t',String(duration),'-movflags','+faststart',dir+'/'+output+'.mp4'],{stdio:['pipe','ignore','pipe']});
 let log='';ff.stderr.on('data',d=>log+=d);const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',n=>n===0?resolve():reject(Error(log)))});
 for(let batch=0;batch<duration;batch++){const frames=await page.evaluate(({start,proof})=>{const out=[];for(let i=0;i<30;i++){(proof?window.drawFoxMotion:window.draw)(start+i/30);out.push(document.querySelector('canvas').toDataURL('image/jpeg',.96).split(',')[1])}return out},{start:batch,proof:motionProof});for(const f of frames){if(!ff.stdin.write(Buffer.from(f,'base64')))await new Promise(r=>ff.stdin.once('drain',r))}}
 ff.stdin.end();await done;await page.evaluate(proof=>(proof?window.drawFoxMotion:window.draw)(proof ? 0.25 : 12),motionProof);await page.screenshot({path:dir+'/'+output+'-preview.png'});console.log('Created '+output);
 }
 }finally{await browser.close()}
}
render().catch(e=>{console.error(e);process.exitCode=1});
