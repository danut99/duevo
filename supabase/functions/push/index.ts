// All actions verify a user JWT, except dispatch which requires the separate cron secret.
import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {timingSafeEqual} from 'node:crypto';
import {allowedEndpoint,notificationPayload,responseCode} from './logic.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-cron-secret','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT'),cronSecret=Deno.env.get('PUSH_CRON_SECRET');
const ready=!!(publicKey&&privateKey&&subject&&cronSecret);
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
if(ready)webpush.setVapidDetails(subject!,publicKey!,privateKey!);
const sameSecret=(given:string,expected:string)=>{const a=new TextEncoder().encode(given),b=new TextEncoder().encode(expected);return a.length===b.length&&timingSafeEqual(a,b)};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>16384)return json({error:'Request too large'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
  if(!body||typeof body.action!=='string')return json({error:'Missing action'},400);
  if(body.action==='dispatch'){
   if(!cronSecret||!sameSecret(req.headers.get('x-cron-secret')||'',cronSecret))return json({error:'Unauthorized'},401);
   if(!ready)return json({error:'Push secrets are not configured'},503);
   const {data:jobs,error}=await admin.rpc('claim_push_deliveries',{batch_size:10});if(error)throw error;
   let accepted=0,failed=0;
   for(const job of jobs||[]){
    let code=400;
    if(allowedEndpoint(job.endpoint)){
     // A document may have been renewed/deleted after this batch was claimed.
     const {data:current,error:readError}=await admin.from('documents').select('reminder_version,profile_id,completed_at,name,entry_type').eq('id',job.document_id).maybeSingle();
     if(readError)code=503;else if(!current||current.completed_at||current.reminder_version!==job.document_version){const {error:cancelError}=await admin.from('push_deliveries').update({status:'cancelled',error_code:'document_changed',lease_token:null,lease_until:null}).eq('id',job.delivery_id).eq('lease_token',job.claim_token);if(cancelError)throw cancelError;continue;}
     else try{const {data:profile,error:profileError}=await admin.from('wallet_profiles').select('name').eq('id',current.profile_id).maybeSingle();if(profileError)throw profileError;const result=await webpush.sendNotification({endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth}},JSON.stringify(notificationPayload(job.document_id,job.document_version,job.lead_days,profile?.name,current.name,current.entry_type)),{TTL:86400,timeout:8000});code=result.statusCode}catch(error){code=responseCode(error)}
    }
    const {error:finishError}=await admin.rpc('finish_push_delivery',{delivery_id:job.delivery_id,claim_token:job.claim_token,result_code:code});if(finishError)throw finishError;
    if(code>=200&&code<300)accepted++;else failed++;
   }
   return json({claimed:jobs?.length||0,accepted,failed});
  }
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await userClient.auth.getUser();if(authError||!user)return json({error:'Unauthorized'},401);
  if(body.action==='config'){
   const {data:health,error}=await userClient.rpc('push_health');
   return json({configured:ready&&!error,publicKey:ready&&!error?publicKey:null,scheduleReady:!error&&!!health?.scheduleReady,lastRun:health?.lastRun||null});
  }
  if(body.action==='test'){
   if(!ready)return json({error:'Serviciul push nu este configurat.'},503);
   if(typeof body.endpoint!=='string'||!allowedEndpoint(body.endpoint))return json({error:'Dispozitiv invalid.'},400);
   // No arbitrary recipients or message bodies: only a subscription belonging to this signed-in user.
   const cutoff=new Date(Date.now()-60000).toISOString();
   const {data:subscriptions,error}=await admin.from('push_subscriptions').update({last_test_at:new Date().toISOString()}).eq('user_id',user.id).eq('endpoint',body.endpoint).eq('enabled',true).or(`last_test_at.is.null,last_test_at.lt.${cutoff}`).select();
   if(error)throw error;const sub=subscriptions?.[0];if(!sub)return json({error:'Activează dispozitivul sau așteaptă un minut între teste.'},429);
   try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:'Duevo',body:'Notificarea de test a ajuns. Telefonul este pregătit să primească alerte.',url:'/reminders',tag:'expiry-test'}),{TTL:300,timeout:8000});return json({accepted:true})}
   catch(error){const code=responseCode(error);if(code===404||code===410)await admin.from('push_subscriptions').update({enabled:false}).eq('id',sub.id);return json({error:'Serviciul push nu a acceptat testul. Reactivează notificările și încearcă din nou.'},502)}
  }
  return json({error:'Unknown action'},400);
 }catch{ return json({error:'Serviciul nu este disponibil momentan. Încearcă din nou.'},503) }
});


