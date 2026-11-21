import {supabase} from './supabase';
export type PushConfig={configured:boolean;publicKey:string|null;scheduleReady:boolean;lastRun:string|null};
export const pushSupported=()=>typeof window!=='undefined'&&isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
export async function getPushConfig():Promise<PushConfig>{if(!supabase)return {configured:false,publicKey:null,scheduleReady:false,lastRun:null};const {data,error}=await supabase.functions.invoke('push',{body:{action:'config'}});if(error||!data)return {configured:false,publicKey:null,scheduleReady:false,lastRun:null};return data}
const keyBytes=(value:string)=>{const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
export async function currentPush(){if(!pushSupported())return null;const registration=await navigator.serviceWorker.getRegistration();return registration?registration.pushManager.getSubscription():null}
export async function deviceSettings(){const sub=await currentPush();if(!sub||!supabase)return null;const {data,error}=await supabase.from('push_subscriptions').select('enabled,hour,hours,timezone').eq('endpoint',sub.endpoint).maybeSingle();if(error)throw error;return data?.enabled?data:null}
export async function enablePush(publicKey:string,hours:number[]){
 const selected=[...new Set(hours)].sort((a,b)=>a-b);if(!selected.length||selected.some(h=>!Number.isInteger(h)||h<0||h>23))throw Error('Alege cel puțin o oră validă.');
 if(!pushSupported())throw Error('Browserul nu permite notificări aici. Pe iPhone, instalează aplicația din Safari: Partajează → Adaugă pe ecranul principal.');
 if(Notification.permission==='denied')throw Error('Notificările sunt blocate. Permite-le din setările browserului, apoi revino aici.');
 // Invoked from a click, before awaiting registration or network requests.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Nu ai permis notificările. Poți activa mai târziu.');
 if(!supabase)throw Error('Intră din nou în cont.');
 await navigator.serviceWorker.register('/sw.js');const registration=await navigator.serviceWorker.ready;
 let sub=await registration.pushManager.getSubscription();const expected=keyBytes(publicKey);
 if(sub){const existing=sub.options.applicationServerKey;if(existing&&(existing.byteLength!==expected.byteLength||new Uint8Array(existing).some((byte,i)=>byte!==expected[i]))){await disablePush();sub=null}}
 const created=!sub;sub=sub||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expected});
 const {data:{user}}=await supabase.auth.getUser();if(!user){if(created)await sub.unsubscribe();throw Error('Intră din nou în cont.')}
 const details=sub.toJSON();const {error}=await supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:sub.endpoint,p256dh:details.keys?.p256dh,auth:details.keys?.auth,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Bucharest',hour:selected[0],hours:selected,enabled:true},{onConflict:'endpoint'});
 if(error){if(created)await sub.unsubscribe();throw Error('Nu am putut salva dispozitivul. Verifică serviciul de notificări și încearcă din nou.')}return sub;
}
export async function disablePush(){const sub=await currentPush();if(!sub)return;const endpoint=sub.endpoint;const removed=await sub.unsubscribe();if(!removed)throw Error('Browserul nu a oprit abonamentul. Încearcă din nou.');if(supabase){const {error}=await supabase.from('push_subscriptions').delete().eq('endpoint',endpoint);if(error)throw Error('Notificările sunt oprite în browser. Setarea de pe server nu a putut fi curățată încă.')}}
export async function testPush(){const sub=await currentPush();if(!sub||!supabase)throw Error('Activează notificările pe acest dispozitiv mai întâi.');const {data,error}=await supabase.functions.invoke('push',{body:{action:'test',endpoint:sub.endpoint}});if(error||!data?.accepted)throw Error(data?.error||'Testul nu a fost acceptat. Așteaptă un minut și încearcă din nou.');return true}
