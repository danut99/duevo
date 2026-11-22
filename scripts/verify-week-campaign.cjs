const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dir=process.argv.includes('--funny')?'outputs/creator-amuzante':'outputs/campanie-7-zile',plan=JSON.parse(fs.readFileSync(dir+'/plan.json','utf8'));
const ff='outputs/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const report=[];
for(const clip of plan.clips){
const file=dir+'/'+clip.id+'.mp4';assert(fs.statSync(file).size>100000);
const result=spawnSync(ff,['-hide_banner','-i',file,'-f','null','-'],{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(result.status,0,result.stderr);
const duration=result.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);assert(duration);const seconds=+duration[1]*3600 + +duration[2]*60 + +duration[3];assert.equal(seconds,plan.duration);assert(seconds<=20);assert.match(result.stderr,/1080x1920/);assert.match(result.stderr,/30 fps/);assert.match(result.stderr,/Audio: aac/);
assert(fs.existsSync(dir+'/'+clip.id+'-coperta.png'));for(const shot of clip.shots)assert(shot.readSeconds<=shot.seconds-.35);
report.push({day:clip.day,file:clip.id+'.mp4',seconds,width:1080,height:1920,fps:30,decoded:true,readingTimeFits:true});console.log('PASS '+clip.id);
}
fs.writeFileSync(dir+'/verificare.json',JSON.stringify(report,null,2));
