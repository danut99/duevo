import assert from 'node:assert/strict';
import webpush from 'npm:web-push@3.6.7';
Deno.test('push function authenticates each path, restricts recipients and records provider results',async()=>{
 const originalServe=Deno.serve,originalFetch=globalThis.fetch,originalSend=webpush.sendNotification;
 const keys=webpush.generateVAPIDKeys();for(const [key,value] of Object.entries({SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'service-test',SUPABASE_ANON_KEY:'anon-test',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'https://example.test',PUSH_CRON_SECRET:'a'.repeat(64)}))Deno.env.set(key,value);
 let handler:(request:Request)=>Promise<Response>,sent=0;const calls:{path:string;body:unknown}[]=[];
 Object.defineProperty(Deno,'serve',{configurable:true,value:(fn:typeof handler)=>{handler=fn;return {}}});
 globalThis.fetch=async(input,init)=>{const request=new Request(input,init),url=new URL(request.url);const raw=await request.text(),body=raw?JSON.parse(raw):null;calls.push({path:url.pathname,body});
  let response:unknown=[];
  if(url.pathname==='/auth/v1/user'){if(request.headers.get('authorization')!=='Bearer user-test')return Response.json({message:'invalid'},{status:401});response={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'fixture@example.test'}}
  else if(url.pathname.startsWith('/auth/v1/admin/users/'))response={user:{id:'11111111-1111-4111-8111-111111111111',user_metadata:{duevo_language:'ro'}}};
  else if(url.pathname==='/rest/v1/rpc/push_health')response={scheduleReady:true,lastRun:new Date().toISOString()};
  else if(url.pathname==='/rest/v1/push_subscriptions'){assert.equal(url.searchParams.get('user_id'),'eq.11111111-1111-4111-8111-111111111111');response=[{id:'sub',endpoint:'https://fcm.googleapis.com/fcm/send/fixture',p256dh:'fake',auth:'fake'}]}
  else if(url.pathname==='/rest/v1/rpc/claim_push_deliveries')response=[{delivery_id:'delivery',claim_token:'lease',document_id:'document',document_version:2,lead_days:7,endpoint:'https://fcm.googleapis.com/fcm/send/fixture',p256dh:'fake',auth:'fake'}];
  else if(url.pathname==='/rest/v1/documents')response={user_id:'11111111-1111-4111-8111-111111111111',reminder_version:2,profile_id:'profile'};
  else if(url.pathname==='/rest/v1/wallet_profiles')response={name:'Maria'};
  return Response.json(response);
 };
 webpush.sendNotification=async(_subscription:unknown,payload:unknown)=>{if(sent===1)assert(JSON.parse(String(payload)).body.includes('Profil Maria:'));sent++;return {statusCode:201,body:'',headers:{}}};
 try{
  await import('./index.ts');
  const request=(body:unknown,headers:Record<string,string>={})=>handler!(new Request('https://example.test/push',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
  assert.equal((await request({action:'config'})).status,401);
  assert.equal((await request({action:'config'},{authorization:'Bearer invalid'})).status,401);
  assert.equal((await request({action:'dispatch'},{'x-cron-secret':'wrong'})).status,401);
  assert.equal(sent,0);
  assert.equal((await request({action:'test',endpoint:'https://127.0.0.1/private'},{authorization:'Bearer user-test'})).status,400);
  const config=await request({action:'config'},{authorization:'Bearer user-test'});assert.equal((await config.json()).configured,true);
  assert.equal((await request({action:'test',endpoint:'https://fcm.googleapis.com/fcm/send/fixture'},{authorization:'Bearer user-test'})).status,200);assert.equal(sent,1);
  const dispatch=await request({action:'dispatch'},{'x-cron-secret':'a'.repeat(64)});assert.equal((await dispatch.json()).accepted,1);assert.equal(sent,2);
  assert(calls.some(call=>call.path==='/rest/v1/rpc/finish_push_delivery'&&(call.body as {result_code:number}).result_code===201));
 }finally{Object.defineProperty(Deno,'serve',{configurable:true,value:originalServe});globalThis.fetch=originalFetch;webpush.sendNotification=originalSend}
});


