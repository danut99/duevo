import {tr,locale} from './i18n.ts';
import EmailSettings from './EmailSettings';
import './notification-settings.css';
import {useEffect,useState} from 'react';
import {CalendarDays,SlidersHorizontal,Smartphone} from 'lucide-react';
import {deviceSettings,disablePush,enablePush,getPushConfig,pushSupported,testPush} from './push';
import type {PushConfig} from './push';
import {calendarFile,saveFile} from './reminder-utils';
import type {Doc} from './supabase';
export function CalendarExport({docs,compact=false}:{docs:Doc[];compact?:boolean}){const [saved,setSaved]=useState(false);return <div className="ep-calendar-export"><button className="ep-secondary" disabled={!docs.length} onClick={()=>{saveFile(calendarFile(docs),'duevo.ics','text/calendar;charset=utf-8');setSaved(true)}}>{!compact&&<CalendarDays size={17}/>}{compact?tr("Exportă"):tr("Adaugă în calendar")}</button>{(!compact||saved)&&<p role="status">{saved?tr("Fișier descărcat. Deschide-l în calendar și confirmă importul."):tr("Alertele din calendar depind de setările aplicației tale de calendar.")}</p>}</div>}
export default function NotificationSettings({docs:_docs}:{docs:Doc[]}){
 const [config,setConfig]=useState<PushConfig|null>(null),[active,setActive]=useState<boolean|null>(null),[hours,setHours]=useState<number[]>([9]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [leads,setLeads]=useState<number[]>(()=>{try{const value=JSON.parse(localStorage.getItem('ep-default-reminders')||'[30,14,7,1]');return Array.isArray(value)&&value.length&&value.every(n=>[30,14,7,1].includes(n))?value:[30,14,7,1]}catch{return [30,14,7,1]}});
 useEffect(()=>{let mounted=true;Promise.all([getPushConfig(),deviceSettings()]).then(([value,device])=>{if(mounted){setConfig(value);setActive(!!device);if(device)setHours(device.hours?.length?device.hours:[device.hour])}}).catch(()=>{if(mounted)setError(tr("Nu am putut verifica serviciul de notificări."))});return()=>{mounted=false}},[]);
 async function action(run:()=>Promise<unknown>,success:string){setBusy(true);setError('');setMessage('');try{await run();setMessage(success)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function toggle(n:number){const next=leads.includes(n)?leads.filter(v=>v!==n):[...leads,n];if(!next.length){setError(tr("Păstrează cel puțin o dată pentru reamintiri."));return}setLeads(next);try{localStorage.setItem('ep-default-reminders',JSON.stringify(next))}catch{}}
 const automatic=active&&config?.scheduleReady&&config.lastRun&&Date.now()-new Date(config.lastRun).getTime()<45*60000;
 const blocked=typeof Notification!=='undefined'&&Notification.permission==='denied';
 const canPush=!!config?.configured&&!!config.publicKey&&pushSupported()&&!blocked;
 const status=active===null?tr("Se verifică…"):active?tr('Activ'):tr('Oprit');
 return <section className="ep-card ep-notification-settings">
 <div className="ep-section-heading ep-uppercase"><h2>{tr("Reamintiri automate")}</h2><SlidersHorizontal size={15} className="ep-muted"/></div>
 <div className="ep-rule-label">{tr("Anunță-mă înainte cu:")}</div><div className="ep-reminder-chips">{[30,14,7,1].map(n=><button type="button" key={n} aria-checked={leads.includes(n)} role="checkbox" aria-label={`Implicit: ${n} ${n===1?tr("zi"):tr("zile")}`} onClick={()=>toggle(n)}>{n} {n===1?tr("zi"):tr("zile")}</button>)}</div><p className="ep-rule-help">{tr("Pentru actele noi. Poți ajusta alertele fiecărui act separat.")}</p>
 <div className="ep-delivery-channels">
 <section className="ep-delivery-channel" aria-labelledby="push-channel-title">
 <header className="ep-delivery-heading"><span className="ep-delivery-icon"><Smartphone size={20}/></span><div><h3 id="push-channel-title">{tr("Notificări push")}</h3><p>{tr("Pe acest dispozitiv")}</p></div><button type="button" className="ep-channel-control" role="switch" aria-label={tr("Push Mobil")} aria-checked={active??false} aria-busy={active===null||busy} disabled={active===null||busy||(!active&&!canPush)} onClick={()=>action(async()=>{if(active){await disablePush();setActive(false)}else{await enablePush(config!.publicKey!,hours);setActive(true)}},active?tr("Notificările au fost oprite."):tr("Notificările sunt activate."))}><span>{status}</span><i aria-hidden="true" className={active?'ep-toggle on':'ep-toggle'}><b/></i></button></header>
 <div className="ep-channel-schedule"><span className="ep-channel-label">{tr("Ore de trimitere")}</span><div className="ep-schedule-times">{hours.map((hour,index)=><div className="ep-hour" key={index}><select aria-label={tr("Ora notificării {0}",index+1)} value={hour} onChange={e=>setHours(hours.map((value,i)=>i===index?Number(e.target.value):value))} disabled={busy}>{Array.from({length:24},(_,n)=><option value={n} key={n} disabled={hours.includes(n)&&n!==hour}>{String(n).padStart(2,'0')}:00</option>)}</select>{hours.length>1&&<button type="button" className="ep-remove-hour" aria-label={tr("Șterge ora {0}:00",String(hour).padStart(2,'0'))} disabled={busy} onClick={()=>setHours(hours.filter((_,i)=>i!==index))}>×</button>}</div>)}<button type="button" className="ep-add-hour" disabled={busy||hours.length===24} onClick={()=>setHours([...hours,Array.from({length:24},(_,n)=>n).find(n=>!hours.includes(n))!])}>{tr("+ Adaugă")}</button></div></div>
 <p className="ep-channel-description">{tr("În zilele de reamintire, la orele alese.")}</p>
 <div className="ep-push-actions"><button className="ep-primary" disabled={busy||!active||!canPush} onClick={()=>action(()=>enablePush(config!.publicKey!,hours),tr("Orele au fost salvate."))}>{tr("Salvează orele")}</button><button className="ep-secondary" disabled={busy||!active||!config?.configured} onClick={()=>action(testPush,tr("Test trimis. Verifică notificările dispozitivului."))}>{tr("Trimite test")}</button></div>
 <details className="ep-push-details"><summary>{tr("Detalii notificări")}</summary><p>{active===null?tr("Verificăm dispozitivul."):automatic?tr("Trimiterea automată funcționează."):active?tr("Dispozitiv conectat. Programarea automată nu este încă confirmată."):tr("Pornește comutatorul pentru a primi notificări.")}</p><p>{tr("Orele folosesc fusul orar al dispozitivului.")}</p>{blocked&&<p>{tr("Notificările sunt blocate. Permite-le din setările browserului.")}</p>}{!pushSupported()&&<p>{tr("Pe iPhone: Safari → Partajează → Adaugă pe ecranul principal, apoi deschide aplicația instalată.")}</p>}{config&&!config.configured&&<p>{tr("Serviciul de notificări nu este disponibil momentan.")}</p>}</details>
 {blocked&&!active&&<p className="ep-channel-message">{tr("Permite notificările din setările browserului.")}</p>}
 {!pushSupported()&&<p className="ep-channel-message">{tr("Pe iPhone, deschide aplicația instalată din Safari.")}</p>}
 {error&&<p role="alert" className="ep-error">{error}</p>}{message&&<p role="status" className="ep-channel-message">{message}</p>}
 </section><EmailSettings/></div></section>;
}
