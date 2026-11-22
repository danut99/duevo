import {useEffect,useRef,useState} from 'react';
import {BellRing} from 'lucide-react';
import {tr} from './i18n.ts';
import {deviceSettings,enablePush,getPushConfig,pushSupported} from './push';
import type {PushConfig} from './push';
import './push-reminder.css';

export default function PushReminder({hidden=false}:{hidden?:boolean}){
 const [state,setState]=useState<'unknown'|'active'|'off'|'blocked'>('unknown');
 const [config,setConfig]=useState<PushConfig|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [dismissed,setDismissed]=useState(false);
 const [checkVersion,setCheckVersion]=useState(0);
 const working=useRef(false);
 useEffect(()=>{
  let live=true,version=0;
  async function check(){
   if(document.visibilityState==='hidden'||working.current)return;
   const request=++version;
   setState('unknown');
   if(!pushSupported())return;
   try{
    const [settings,device]=await Promise.all([getPushConfig(),deviceSettings()]);
    if(!live||request!==version)return;
    // A failed configuration request is not evidence that push is off.
    if(!settings.configured||!settings.publicKey)return;
    setConfig(settings);
    setState(Notification.permission==='denied'?'blocked':Notification.permission==='granted'&&device?'active':'off');
   }catch{/* Keep the reminder hidden when the device cannot be checked. */}
  }
  const refresh=()=>{void check()};
  refresh();
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;version++;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
 },[hidden,checkVersion]);
 async function activate(){
  if(!config?.publicKey||working.current)return;
  working.current=true;setBusy(true);setError('');
  try{await enablePush(config.publicKey,[9]);setState('active')}
  catch(e){setError((e as Error).message);if(Notification.permission==='denied')setState('blocked')}
  finally{working.current=false;setBusy(false)}
 }
 if(hidden||dismissed||(state!=='off'&&state!=='blocked'))return null;
 return <section className="ep-push-prompt" aria-labelledby="push-reminder-title">
  <span className="ep-push-prompt-icon"><BellRing size={18}/></span>
  <div><h2 id="push-reminder-title">{state==='blocked'?tr('Notificările sunt blocate'):tr('Notificările sunt oprite.')}</h2>
   <p>{state==='blocked'?tr('Notificările sunt blocate. Permite-le din setările browserului, apoi revino aici.'):tr('Activează-le ca să primești alertele pentru acte.')}</p>
   <div className="ep-push-prompt-actions">{state==='off'&&<button type="button" className="ep-primary" disabled={busy} onClick={()=>void activate()}>{tr('Activează')}</button>}
   {state==='blocked'&&<button type="button" className="ep-primary" onClick={()=>setCheckVersion(value=>value+1)}>{tr('Verifică din nou')}</button>}
   <button type="button" className="ep-secondary" disabled={busy} onClick={()=>setDismissed(true)}>{tr('Mai târziu')}</button>
   </div>
   {error&&<p className="ep-error" role="alert">{error}</p>}
  </div>
 </section>;
}
