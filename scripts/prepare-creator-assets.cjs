const fs=require('node:fs');
const sources=[{source:'outputs/campanie-7-zile',folder:'week-1',collection:'week'},{source:'outputs/creator-amuzante',folder:'funny-1',collection:'funny'}];
const clips=sources.flatMap(({source,folder,collection})=>{
 const destination='public/creator/'+folder,plan=JSON.parse(fs.readFileSync(source+'/plan.json','utf8'));
 fs.mkdirSync(destination,{recursive:true});
 return plan.clips.map(clip=>{
  for(const suffix of ['.mp4','-coperta.png'])fs.copyFileSync(source+'/'+clip.id+suffix,destination+'/'+clip.id+suffix);
  return {id:clip.id,day:clip.day,title:clip.title,description:clip.caption.replace(/(?:\s+#\S+)+$/,''),hashtags:(clip.caption.match(/#\S+/g)||[]).join(' '),seconds:plan.duration,collection,folder};
 });
});
fs.writeFileSync('src/creator-campaign.json',JSON.stringify(clips,null,2)+'\n');
console.log('Prepared '+clips.length+' creator videos and covers.');
