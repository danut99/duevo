import {createClient} from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@10.6.1';
import {timingSafeEqual} from 'node:crypto';
import {reminderMail,testMail} from './logic.ts';
import type {EmailMessage} from './logic.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-cron-secret','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const username='hello.duevo@gmail.com',password=Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s/g,''),secret=Deno.env.get('EMAIL_CRON_SECRET');
const ready=!!(password&&secret);
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const smtp=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:username,pass:password},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000});
const sameSecret=(given:string,expected:string)=>{const a=new TextEncoder().encode(given),b=new TextEncoder().encode(expected);return a.length===b.length&&timingSafeEqual(a,b)};
async function send(to:string,mail:EmailMessage,id?:string){
 const result=await smtp.sendMail({from:{name:'Duevo',address:username},to, ...mail,...(id?{messageId:`<${id}@duevo.pages.dev>`}:{})});
 if(!result.accepted?.length)throw Error('Recipient not accepted');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
 const raw=await req.text();if(raw.length>4096)return json({error:'Request too large'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 if(!body||typeof body.action!=='string')return json({error:'Missing action'},400);
 if(body.action==='dispatch'){
  if(!secret||!sameSecret(req.headers.get('x-cron-secret')||'',secret))return json({error:'Unauthorized'},401);
  if(!ready)return json({error:'Email secrets missing'},503);
  const {data:jobs,error}=await admin.rpc('claim_email_deliveries',{batch_size:5});if(error)throw error;
  let accepted=0,failed=0;
  for(const job of jobs||[]){
   let code=503;
   try{
    const [{data:doc,error:de},{data:pref,error:pe},{data:{user},error:ue},{data:lease,error:le}]=await Promise.all([
     admin.from('documents').select('id,name,expires,event_time,reminder_version,completed_at').eq('id',job.document_id).eq('user_id',job.user_id).maybeSingle(),
     admin.from('email_preferences').select('enabled').eq('user_id',job.user_id).maybeSingle(),
     admin.auth.admin.getUserById(job.user_id),
     admin.from('email_deliveries').select('status,lease_token').eq('id',job.id).maybeSingle()
    ]);
    if(de||pe||ue||le)throw Error('Read failed');
    if(!doc||doc.completed_at||doc.reminder_version!==job.document_version||!pref?.enabled||!user?.email_confirmed_at||!user.email||lease?.status!=='sending'||lease.lease_token!==job.lease_token)code=409;
    else{await send(user.email,reminderMail(doc,job.lead,user.user_metadata?.duevo_language==='en'?'en':'ro'),job.id);code=200;accepted++}
   }catch{failed++}
   const {error:finish}=await admin.rpc('finish_email_delivery',{delivery_id:job.id,claim_token:job.lease_token,result_code:code});if(finish)throw finish;
  }
  return json({claimed:jobs?.length||0,accepted,failed});
 }
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);
 const {data:{user},error:authError}=await admin.auth.getUser(authorization.slice(7));
 if(authError||!user)return json({error:'Unauthorized'},401);
 if(body.action==='config'){
  const [{data:preferences,error:pe},{data:health,error:he}]=await Promise.all([admin.from('email_preferences').select('enabled,hour,timezone').eq('user_id',user.id).maybeSingle(),admin.rpc('email_health')]);
  return json({configured:ready&&!pe&&!he,email:user.email||null,verified:!!user.email_confirmed_at,preferences,lastRun:health?.lastRun||null});
 }
 if(body.action==='test'){
  if(!ready)return json({error:'Serviciul de email nu este configurat.'},503);
  if(!user.email_confirmed_at||!user.email)return json({error:'Confirmă adresa de email înainte de activare.'},403);
  const {data,error}=await admin.from('email_preferences').update({last_test_at:new Date().toISOString()}).eq('user_id',user.id).eq('enabled',true).or(`last_test_at.is.null,last_test_at.lt.${new Date(Date.now()-60000).toISOString()}`).select('user_id');
  if(error)throw error;if(!data?.length)return json({error:'Activează emailurile și așteaptă un minut între teste.'},429);
  try{await send(user.email,testMail(user.user_metadata?.duevo_language==='en'?'en':'ro'));return json({accepted:true})}
  catch{return json({error:'Gmail nu a acceptat trimiterea. Verifică setările serviciului și încearcă din nou.'},502)}
 }
 return json({error:'Unknown action'},400);
 }catch{return json({error:'Serviciul de email nu este disponibil momentan.'},503)}
});
