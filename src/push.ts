import {tr,locale} from './i18n.ts';
﻿import {supabase} from './supabase';
export type PushConfig={configured:boolean;publicKey:string|null;scheduleReady:boolean;lastRun:string|null};
export const pushSupported=()=>typeof window!=='undefined'&&isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
export async function getPushConfig():Promise<PushConfig>{if(!supabase)return {configured:false,publicKey:null,scheduleReady:false,lastRun:null};const {data,error}=await supabase.functions.invoke('push',{body:{action:"config"}});if(error||!data)return {configured:false,publicKey:null,scheduleReady:false,lastRun:null};return data}
const keyBytes=(value:string)=>{const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
export async function currentPush(){if(!pushSupported())return null;const registration=await navigator.serviceWorker.getRegistration();return registration?registration.pushManager.getSubscription():null}
export async function deviceSettings(){await restorePush();const sub=await currentPush();if(!sub||!supabase)return null;const {data,error}=await supabase.from('push_subscriptions').select('enabled,hour,hours,timezone').eq('endpoint',sub.endpoint).maybeSingle();if(error)throw error;return data?.enabled?data:null}
const resumeKey='duevo-push-resume';
// Preserve the browser subscription, but stop delivery while signed out.
export async function suspendPush(){
 const sub=await currentPush();if(!sub||!supabase)return;
 const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw Error(tr("Nu am putut verifica dispozitivul înainte de deconectare."));
 const {data:settings,error:readError}=await supabase.from('push_subscriptions').select('enabled').eq('endpoint',sub.endpoint).eq('user_id',user.id).maybeSingle();
 if(readError)throw readError;if(!settings?.enabled)return;
 const {error}=await supabase.from('push_subscriptions').update({enabled:false}).eq('endpoint',sub.endpoint).eq('user_id',user.id);if(error)throw error;
 try{localStorage.setItem(resumeKey,JSON.stringify({userId:user.id,endpoint:sub.endpoint}))}catch{}
}
let restoring:Promise<void>|null=null;
export function restorePush():Promise<void>{
 if(restoring)return restoring;
 restoring=(async()=>{
  let saved:{userId:string;endpoint:string};try{saved=JSON.parse(localStorage.getItem(resumeKey)||'null');if(!saved)return}catch{return}
  if(!supabase||!pushSupported()||Notification.permission!=='granted')return;
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user||user.id!==saved.userId)return;
  const sub=await currentPush();if(!sub||sub.endpoint!==saved.endpoint)return;
  const {error}=await supabase.from('push_subscriptions').update({enabled:true}).eq('endpoint',sub.endpoint).eq('user_id',user.id);if(error)throw error;
  try{localStorage.removeItem(resumeKey)}catch{}
 })().finally(()=>{restoring=null});return restoring;
}
export async function enablePush(publicKey:string,hours:number[]){
 const selected=[...new Set(hours)].sort((a,b)=>a-b);if(!selected.length||selected.some(h=>!Number.isInteger(h)||h<0||h>23))throw Error(tr("Alege cel puțin o oră validă."));
 if(!pushSupported())throw Error(tr("Browserul nu permite notificări aici. Pe iPhone, instalează aplicația din Safari: Partajează → Adaugă pe ecranul principal."));
 if(Notification.permission==='denied')throw Error(tr("Notificările sunt blocate. Permite-le din setările browserului, apoi revino aici."));
 // Invoked from a click, before awaiting registration or network requests.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error(tr("Nu ai permis notificările. Poți activa mai târziu."));
 if(!supabase)throw Error(tr("Intră din nou în cont."));
 const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw Error(tr("Intră din nou în cont."));
 await navigator.serviceWorker.register('/sw.js');const registration=await navigator.serviceWorker.ready;
 let sub=await registration.pushManager.getSubscription();const expected=keyBytes(publicKey);
 // Logout preserves the subscription. RLS hides another account's row, so
 // rotate its browser subscription instead of trying to change its owner.
 if(sub){const {data:owned,error}=await supabase.from('push_subscriptions').select('user_id').eq('endpoint',sub.endpoint).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!owned){const removed=await sub.unsubscribe();if(!removed)throw Error(tr("Browserul nu a oprit abonamentul. Încearcă din nou."));sub=null}}
 if(sub){const existing=sub.options.applicationServerKey;if(existing&&(existing.byteLength!==expected.byteLength||new Uint8Array(existing).some((byte,i)=>byte!==expected[i]))){await disablePush();sub=null}}
 const created=!sub;sub=sub||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expected});
 const details=sub.toJSON();const {error}=await supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:sub.endpoint,p256dh:details.keys?.p256dh,auth:details.keys?.auth,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Bucharest',hour:selected[0],hours:selected,enabled:true},{onConflict:'endpoint'});
 if(error){if(created)await sub.unsubscribe();throw Error(tr("Nu am putut salva dispozitivul. Verifică serviciul de notificări și încearcă din nou."))}return sub;
}
export async function disablePush(){const sub=await currentPush();if(!sub)return;const endpoint=sub.endpoint;const removed=await sub.unsubscribe();if(!removed)throw Error(tr("Browserul nu a oprit abonamentul. Încearcă din nou."));if(supabase){const {error}=await supabase.from('push_subscriptions').delete().eq('endpoint',endpoint);if(error)throw Error(tr("Notificările sunt oprite în browser. Setarea de pe server nu a putut fi curățată încă."))}}
export async function testPush(){const sub=await currentPush();if(!sub||!supabase)throw Error(tr("Activează notificările pe acest dispozitiv mai întâi."));const {data,error}=await supabase.functions.invoke('push',{body:{action:"test",endpoint:sub.endpoint}});if(error||!data?.accepted)throw Error(data?.error||tr("Testul nu a fost acceptat. Așteaptă un minut și încearcă din nou."));return true}
