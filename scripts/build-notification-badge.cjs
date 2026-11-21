const {chromium}=require('C:/Users/Danut/.codex/dragon-preview-tools/node_modules/playwright');
const {readFileSync}=require('node:fs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:96,height:96},deviceScaleFactor:1});
  const mark=readFileSync('public/duevo-mark.svg','utf8').replaceAll('#FF5D1F','#FFFFFF');
  await page.setContent(`<style>html,body{margin:0;width:96px;height:96px;background:transparent}svg{display:block;width:96px;height:96px}</style>${mark}`);
  await page.screenshot({path:'public/notification-badge.png',omitBackground:true});
  console.log('Generated transparent 96px notification badge.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
