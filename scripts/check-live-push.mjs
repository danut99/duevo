import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');process.loadEnvFile('.env.push');
const url=process.env.VITE_SUPABASE_URL+'/functions/v1/push';
const unauthorized=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'config'})});
console.log('Anonymous config HTTP:',unauthorized.status);assert.equal(unauthorized.status,401);
const badCron=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-cron-secret':'invalid'},body:JSON.stringify({action:'dispatch'})});
console.log('Invalid cron secret HTTP:',badCron.status);assert.equal(badCron.status,401);
const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-cron-secret':process.env.PUSH_CRON_SECRET},body:JSON.stringify({action:'dispatch'})});
const result=await response.json();console.log('Authorized dispatch HTTP:',response.status,JSON.stringify(result));assert(response.ok);
