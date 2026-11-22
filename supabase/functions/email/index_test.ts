import assert from 'node:assert/strict';
import nodemailer from 'npm:nodemailer@10.6.1';
Deno.test('email authenticates callers, restricts recipients, rate limits tests and cancels stale documents',async()=>{
 const originalServe=Deno.serve,originalFetch=globalThis.fetch,originalTransport=nodemailer.createTransport;
 for(const [key,value] of Object.entries({SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-key',GMAIL_APP_PASSWORD:'test-password',EMAIL_CRON_SECRET:'a'.repeat(64)}))Deno.env.set(key,value);
 let handler:(req:Request)=>Promise<Response>,verified=true,rateLimited=false,stale=false,smtpFailure=false;
 const sent:Record<string,unknown>[]=[],results:number[]=[];
 Object.defineProperty(Deno,'serve',{configurable:true,value:(fn:typeof handler)=>{handler=fn;return {}}});
 nodemailer.createTransport=()=>({sendMail:async(mail:Record<string,unknown>)=>{if(smtpFailure)throw Error('SMTP unavailable');sent.push(mail);return {accepted:[mail.to]}}}) as never;
 const user=()=>({id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'owner@example.test',email_confirmed_at:verified?new Date().toISOString():null});
 globalThis.fetch=async(input,init)=>{
  const req=new Request(input,init),url=new URL(req.url);const raw=await req.text(),body=raw?JSON.parse(raw):null;
  let response:unknown=[];
  if(url.pathname==='/auth/v1/user'){if(req.headers.get('authorization')!=='Bearer valid-user')return Response.json({message:'Invalid'},{status:401});response=user()}
  else if(url.pathname.startsWith('/auth/v1/admin/users/'))response={user:user()};
  else if(url.pathname==='/rest/v1/email_preferences'){
   assert.equal(url.searchParams.get('user_id'),'eq.'+user().id);
   response=req.method==='PATCH'?(rateLimited?[]:[{user_id:user().id}]):{enabled:true,hour:9,timezone:'UTC'};
  }
  else if(url.pathname==='/rest/v1/rpc/email_health')response={lastRun:new Date().toISOString()};
  else if(url.pathname==='/rest/v1/rpc/claim_email_deliveries')response=[{id:'delivery',lease_token:'lease',document_id:'doc',user_id:user().id,document_version:2,lead:7}];
  else if(url.pathname==='/rest/v1/documents')response={id:'doc',name:'RCA',expires:'2026-12-01',reminder_version:stale?3:2};
  else if(url.pathname==='/rest/v1/email_deliveries')response={status:'sending',lease_token:'lease'};
  else if(url.pathname==='/rest/v1/rpc/finish_email_delivery')results.push(body.result_code);
  else throw Error('Unexpected path '+url.pathname);
  return Response.json(response);
 };
 try{
  await import('./index.ts');
  const request=(body:unknown,headers:Record<string,string>={})=>handler!(new Request('https://app.test/email',{method:'POST',headers,body:JSON.stringify(body)}));
  assert.equal((await request({action:'config'})).status,401);
  assert.equal((await request({action:'config'},{authorization:'Bearer bad'})).status,401);
  assert.equal((await request({action:'dispatch'},{'x-cron-secret':'wrong'})).status,401);
  const auth={authorization:'Bearer valid-user'},cron={'x-cron-secret':'a'.repeat(64)};
  assert.equal((await (await request({action:'config'},auth)).json()).configured,true);
  verified=false;assert.equal((await request({action:'test'},auth)).status,403);assert.equal(sent.length,0);
  verified=true;assert.equal((await request({action:'test',to:'attacker@example.test',text:'injected'},auth)).status,200);
  assert.equal(sent[0].to,'owner@example.test');assert(!String(sent[0].text).includes('injected'));
  rateLimited=true;assert.equal((await request({action:'test'},auth)).status,429);rateLimited=false;
  assert.equal((await (await request({action:'dispatch'},cron)).json()).accepted,1);assert.equal(results.at(-1),200);
  stale=true;await request({action:'dispatch'},cron);assert.equal(results.at(-1),409);assert.equal(sent.length,2);
  stale=false;smtpFailure=true;await request({action:'dispatch'},cron);assert.equal(results.at(-1),503);
 }finally{Object.defineProperty(Deno,'serve',{configurable:true,value:originalServe});globalThis.fetch=originalFetch;nodemailer.createTransport=originalTransport}
});
