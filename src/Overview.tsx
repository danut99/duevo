import OverviewSkeleton from './OverviewSkeleton';
import {tr,locale} from './i18n.ts';
import MonthlyPlan from './MonthlyPlan';
import ExpiryCalendar from './ExpiryCalendar';
import CalendarExportCard from './CalendarExportCard';
﻿import {useEffect,useState} from 'react';
import {AlertTriangle,Bell,CalendarDays,CheckCircle2,ChevronRight,Clock,FilePlus2,ShieldCheck,Smartphone} from 'lucide-react';
import type {Doc} from './supabase';
import {daysUntil,docType} from './PocketUI';
import {deviceSettings,getPushConfig,pushSupported} from './push';
import './overview.css';

function Timing({days,other=false}:{days:number;other?:boolean}){
return <span className={'ov-timing '+(days<0?'overdue':days<=7?'near':'')}>{days<0?tr(other?'Termen depășit cu {0} {1}':'Expirat de {0} {1}',Math.abs(days),Math.abs(days)===1?tr('zi'):tr('zile')):days===0?(other?tr("Astăzi"):tr("Expiră astăzi")):days===1?tr("Mai ai o zi"):tr("Mai ai {0} zile",days)}</span>;
}
export default function Overview({docs,loading,failed,open,onChanged}:{docs:Doc[];loading:boolean;failed:boolean;open:(path:string)=>void;onChanged:(doc:Doc)=>void}){
 const [push,setPush]=useState<'checking'|'active'|'pending'|'off'|'blocked'|'unsupported'|'error'>('checking');
 useEffect(()=>{let mounted=true;
 if(!pushSupported()){setPush('unsupported');return;}
 if(Notification.permission==='denied'){setPush('blocked');return;}
 Promise.all([getPushConfig(),deviceSettings()]).then(([config,device])=>{
 const fresh=config.lastRun&&Date.now()-new Date(config.lastRun).getTime()<45*60000;
 if(mounted)setPush(device?(config.configured&&config.scheduleReady&&fresh?'active':'pending'):'off');
 }).catch(()=>{if(mounted)setPush('error')});return()=>{mounted=false};
 },[]);
 const sorted=[...docs].sort((a,b)=>a.expires.localeCompare(b.expires));
 const overdue=sorted.filter(d=>daysUntil(d.expires)<0);
 const upcoming=sorted.filter(d=>daysUntil(d.expires)>=0&&daysUntil(d.expires)<=30);
 const attention=sorted.filter(d=>daysUntil(d.expires)<=7);
 const next=sorted.find(d=>daysUntil(d.expires)>=0);
 const urgent=attention[0];
 const UrgentIcon=urgent?docType(urgent).Icon:AlertTriangle;
 const NextIcon=next?docType(next).Icon:CalendarDays;
 const pushCopy={
 checking:[tr("Verificăm notificările"),tr("Verificăm acest dispozitiv și serviciul de trimitere.")],
 active:[tr("Notificări active"),tr("Acest dispozitiv este conectat, iar serviciul de trimitere funcționează.")],
 pending:[tr("Dispozitiv conectat"),tr("Trimiterea automată nu este încă confirmată. Verifică setările și trimite un test.")],
 off:[tr("Primește un memento la timp"),tr("Configurează notificările pentru acest dispozitiv în pagina Reamintiri.")],
 blocked:[tr("Notificările sunt blocate"),tr("Permite notificările în browser, apoi revino la setările de reamintire.")],
 unsupported:[tr("Reamintirile, aproape de tine"),tr("Vezi opțiunile pentru telefon sau adaugă termenele în calendar.")],
 error:[tr("Verifică setările de notificare"),tr("Nu am putut confirma starea acestui dispozitiv.")]
 }[push];
 return <div className="ep-screen ep-overview">
 <header className="ov-heading"><div><p className="ov-eyebrow">{tr("PRIVIRE DE ANSAMBLU")}</p><h1 tabIndex={-1}>{tr("Mai puține griji.")}<br/><span>{tr("Totul la timp.")}</span></h1><p>{tr("Ce ai de rezolvat și ce urmează, într-o privire.")}</p></div><span className="ov-date"><CalendarDays size={17}/>{new Date().toLocaleDateString(locale(),{day:'numeric',month:'long'})}</span></header>

 {loading?<OverviewSkeleton/>:failed?<div className="ep-card ov-empty"><AlertTriangle size={30}/><h2>{tr("Rezumatul nu este disponibil")}</h2><p>{tr("Încearcă din nou folosind butonul de mai sus.")}</p></div>:!docs.length?<section className="ep-card ov-first"><span className="ov-symbol"><FilePlus2 size={26}/></span><div><p className="ov-eyebrow">{tr("UN ÎNCEPUT SIMPLU")}</p><h2>{tr("Primul act. O grijă în minus.")}</h2><p>{tr("Adaugă un RCA, un buletin sau orice act cu termen. Aici vei vedea ce urmează și când trebuie să acționezi.")}</p><button className="ep-primary" onClick={()=>open('/documents/new')}><FilePlus2 size={17}/>{tr("Adaugă primul act")}</button></div></section>:<>
 <section className={'ep-card ov-outlook '+(attention.length?'needs-attention':'all-clear')} aria-labelledby="outlook-title"><span className="ov-symbol">{attention.length?<AlertTriangle size={27}/>:<ShieldCheck size={27}/>}</span><div className="ov-outlook-copy"><p className="ov-eyebrow">{attention.length?tr("ÎNCEPE DE AICI"):tr("UN MOMENT DE LINIȘTE")}</p><h2 id="outlook-title">{attention.length?tr("Ai câteva lucruri de rezolvat."):tr("Ești la zi.")}</h2><p>{overdue.length?tr("{0} {1} nevoie de atenția ta.",overdue.length,overdue.length===1?tr("termen depășit are"):tr("termene depășite au")):attention.length?tr("{0} {1} în următoarele 7 zile.",attention.length,attention.length===1?tr("termen"):tr("termene")):tr("Niciun act expirat și niciun termen în următoarele 7 zile.")}</p></div><button className="ep-secondary" onClick={()=>open(urgent?'/documents/'+urgent.id:'/documents')}>{attention.length?tr("Vezi ce ai de rezolvat"):tr("Deschide portofelul")}<ChevronRight size={16}/></button></section>
 <section className="ov-summary" aria-label={tr("Rezumat termene")}><div><span><AlertTriangle size={17}/>{tr("Expirate")}</span><strong>{overdue.length}</strong></div><div><span><Clock size={17}/>{tr("În 30 de zile")}</span><strong>{upcoming.length}</strong></div><div><span><CheckCircle2 size={17}/>{tr("Fără urgențe")}</span><strong>{docs.filter(d=>daysUntil(d.expires)>30).length}</strong></div></section>
 <div className="ov-columns"><section className="ov-attention" aria-labelledby="attention-title"><div className="ov-section-title"><div><p className="ov-eyebrow">{tr("LISTA TA SCURTĂ")}</p><h2 id="attention-title">{tr("Necesită atenție")}</h2></div>{attention.length>0&&<span className="ov-count">{attention.length}</span>}</div>
 <div className={'ep-card ov-next-card ov-attention-card'+(urgent&&daysUntil(urgent.expires)<0?" is-expired":'')}>{urgent?<><div className="ov-next-top"><span className="ov-document-icon"><UrgentIcon size={25}/></span><Timing days={daysUntil(urgent.expires)} other={urgent.entryType==='other'}/></div><h3>{urgent.name}</h3><p>{urgent.reference||(urgent.category==='Vehicles'?tr("Act auto"):tr("Act personal"))}</p><div className="ov-next-date"><small>{daysUntil(urgent.expires)<0?(urgent.entryType==='other'?tr("TERMENUL A FOST"):tr("A EXPIRAT PE")):(urgent.entryType==='other'?tr("DATA TERMENULUI"):tr("DATA EXPIRĂRII"))}</small><time dateTime={urgent.expires}>{new Date(urgent.expires+'T00:00:00').toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'})}</time>{urgent.eventTime&&<span>{urgent.eventTime}</span>}</div><button className="ep-primary" onClick={()=>open('/documents/'+urgent.id)}>{urgent.entryType==='other'?tr("Vezi termenul"):tr("Reînnoiește actul")}<ChevronRight size={17}/></button>{attention.length>1&&<button className="ov-more-attention" onClick={()=>open('/reminders')}>{tr("Încă")} {attention.length-1} {attention.length===2?tr("act necesită"):tr("acte necesită")} {tr("atenție")}<ChevronRight size={15}/></button>}</>:<div className="ov-caught-up"><CheckCircle2 size={30}/><h3>{tr("Nimic urgent de rezolvat")}</h3><p>{tr("Revino aici pentru actele expirate sau care ajung la termen în cel mult 7 zile.")}</p></div>}</div></section>

 <section className="ov-next" aria-labelledby="next-title"><div className="ov-section-title"><div><p className="ov-eyebrow">{tr("PLANIFICĂ DIN TIMP")}</p><h2 id="next-title">{tr("Următorul termen")}</h2></div><CalendarDays size={21}/></div><div className="ep-card ov-next-card">{next?<><div className="ov-next-top"><span className="ov-document-icon"><NextIcon size={25}/></span><Timing days={daysUntil(next.expires)} other={next.entryType==='other'}/></div><h3>{next.name}</h3><p>{next.reference|| (next.category==='Vehicles'?tr("Act auto"):tr("Act personal"))}</p><div className="ov-next-date"><small>{next.entryType==='other'?tr("DATA TERMENULUI"):tr("DATA EXPIRĂRII")}</small><time dateTime={next.expires}>{new Date(next.expires+'T00:00:00').toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'})}</time>{next.eventTime&&<span>{next.eventTime}</span>}</div><button className="ep-primary" onClick={()=>open('/documents/'+next.id)}>{next.entryType==='other'?tr("Vezi termenul"):tr("Pregătește reînnoirea")}<ChevronRight size={17}/></button></>:<div className="ov-caught-up"><CalendarDays size={30}/><h3>{tr("Niciun termen viitor")}</h3><p>{overdue.length?tr("Actualizează actele expirate pentru a urmări noile termene."):tr("Noile termene vor apărea aici.")}</p><button className="ep-secondary" onClick={()=>open('/documents')}>{tr("Vezi actele")}</button></div>}</div></section></div>
 <MonthlyPlan docs={docs} open={open} onChanged={onChanged}/>
 <ExpiryCalendar docs={docs} open={open}/>
 </>}
 <section className="ep-card ov-notifications" aria-labelledby="notifications-title"><span className={'ov-symbol '+(push==='active'?'connected':'')}><Smartphone size={25}/></span><div><p className="ov-eyebrow">{tr("PLASA TA DE SIGURANȚĂ")}</p><h2 id="notifications-title">{tr(pushCopy[0])}</h2><p role="status">{tr(pushCopy[1])}</p></div><button className="ep-secondary" onClick={()=>open('/reminders')}><Bell size={16}/>{push==='active'?tr("Vezi setările"):tr("Setează reamintirile")}</button></section>
 <CalendarExportCard docs={docs} loading={loading||failed}/>
 <p className="ov-footnote"><ShieldCheck size={14}/>{tr("Un rezumat pentru tine. Toate documentele rămân în „Actele mele”.")}</p>
 </div>;
}
