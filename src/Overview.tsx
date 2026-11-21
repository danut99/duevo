import ExpiryCalendar from './ExpiryCalendar';
import CalendarExportCard from './CalendarExportCard';
﻿import {useEffect,useState} from 'react';
import {AlertTriangle,ArrowUpRight,Bell,CalendarDays,CheckCircle2,ChevronRight,Clock,FilePlus2,LoaderCircle,ShieldCheck,Smartphone} from 'lucide-react';
import type {Doc} from './supabase';
import {daysUntil,docType} from './PocketUI';
import {deviceSettings,getPushConfig,pushSupported} from './push';
import './overview.css';

function Timing({days,other=false}:{days:number;other?:boolean}){
return <span className={'ov-timing '+(days<0?'overdue':days<=7?'near':'')}>{days<0?`${other?'Termen depășit cu':'Expirat de'} ${Math.abs(days)} ${Math.abs(days)===1?'zi':'zile'}`:days===0?(other?'Astăzi':'Expiră astăzi'):days===1?'Mai ai o zi':`Mai ai ${days} zile`}</span>;
}
export default function Overview({docs,loading,failed,open}:{docs:Doc[];loading:boolean;failed:boolean;open:(path:string)=>void}){
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
 const NextIcon=next?docType(next).Icon:CalendarDays;
 const pushCopy={
 checking:['Verificăm notificările','Verificăm acest dispozitiv și serviciul de trimitere.'],
 active:['Notificări active','Acest dispozitiv este conectat, iar serviciul de trimitere funcționează.'],
 pending:['Dispozitiv conectat','Trimiterea automată nu este încă confirmată. Verifică setările și trimite un test.'],
 off:['Primește un memento la timp','Configurează notificările pentru acest dispozitiv în pagina Reamintiri.'],
 blocked:['Notificările sunt blocate','Permite notificările în browser, apoi revino la setările de reamintire.'],
 unsupported:['Reamintirile, aproape de tine','Vezi opțiunile pentru telefon sau adaugă termenele în calendar.'],
 error:['Verifică setările de notificare','Nu am putut confirma starea acestui dispozitiv.']
 }[push];
 return <div className="ep-screen ep-overview">
 <header className="ov-heading"><div><p className="ov-eyebrow">PRIVIRE DE ANSAMBLU</p><h1 tabIndex={-1}>Mai puține griji.<br/><span>Totul la timp.</span></h1><p>Ce ai de rezolvat și ce urmează, într-o privire.</p></div><span className="ov-date"><CalendarDays size={17}/>{new Date().toLocaleDateString('ro-RO',{day:'numeric',month:'long'})}</span></header>

 {loading?<div className="ep-card ov-loading" role="status"><LoaderCircle size={25} className="spin"/><p>Pregătim rezumatul actelor tale…</p></div>:failed?<div className="ep-card ov-empty"><AlertTriangle size={30}/><h2>Rezumatul nu este disponibil</h2><p>Încearcă din nou folosind butonul de mai sus.</p></div>:!docs.length?<section className="ep-card ov-first"><span className="ov-symbol"><FilePlus2 size={26}/></span><div><p className="ov-eyebrow">UN ÎNCEPUT SIMPLU</p><h2>Primul act. O grijă în minus.</h2><p>Adaugă un RCA, un buletin sau orice act cu termen. Aici vei vedea ce urmează și când trebuie să acționezi.</p><button className="ep-primary" onClick={()=>open('/documents/new')}><FilePlus2 size={17}/>Adaugă primul act</button></div></section>:<>
 <section className={'ep-card ov-outlook '+(attention.length?'needs-attention':'all-clear')} aria-labelledby="outlook-title"><span className="ov-symbol">{attention.length?<AlertTriangle size={27}/>:<ShieldCheck size={27}/>}</span><div className="ov-outlook-copy"><p className="ov-eyebrow">{attention.length?'ÎNCEPE DE AICI':'UN MOMENT DE LINIȘTE'}</p><h2 id="outlook-title">{attention.length?'Ai câteva lucruri de rezolvat.':'Ești la zi.'}</h2><p>{overdue.length?`${overdue.length} ${overdue.length===1?'termen depășit are':'termene depășite au'} nevoie de atenția ta.`:attention.length?`${attention.length} ${attention.length===1?'termen':'termene'} în următoarele 7 zile.`:'Niciun act expirat și niciun termen în următoarele 7 zile.'}</p></div><button className="ep-secondary" onClick={()=>open(urgent?'/documents/'+urgent.id:'/documents')}>{attention.length?'Vezi ce ai de rezolvat':'Deschide portofelul'}<ChevronRight size={16}/></button></section>
 <section className="ov-summary" aria-label="Rezumat termene"><div><span><AlertTriangle size={17}/>Expirate</span><strong>{overdue.length}</strong></div><div><span><Clock size={17}/>În 30 de zile</span><strong>{upcoming.length}</strong></div><div><span><CheckCircle2 size={17}/>Fără urgențe</span><strong>{docs.filter(d=>daysUntil(d.expires)>30).length}</strong></div></section>
 <div className="ov-columns"><section className="ov-attention" aria-labelledby="attention-title"><div className="ov-section-title"><div><p className="ov-eyebrow">LISTA TA SCURTĂ</p><h2 id="attention-title">Necesită atenție</h2></div>{attention.length>0&&<span className="ov-count">{attention.length}</span>}</div>
 <div className="ep-card ov-action-list">{attention.length?attention.slice(0,3).map(doc=>{const Icon=docType(doc).Icon;return <article className="ov-action" key={doc.id}><span className="ov-document-icon"><Icon size={21}/></span><div><h3>{doc.name}</h3><Timing days={daysUntil(doc.expires)} other={doc.entryType==='other'}/><button className="ov-link" onClick={()=>open('/documents/'+doc.id)}>{doc.entryType==='other'?'Vezi detaliile':'Vezi pașii de reînnoire'}<ArrowUpRight size={14}/></button></div><button className="ep-icon-button" aria-label={'Deschide '+doc.name} onClick={()=>open('/documents/'+doc.id)}><ChevronRight size={18}/></button></article>}):<div className="ov-caught-up"><CheckCircle2 size={30}/><h3>Nimic urgent de rezolvat</h3><p>Revino aici pentru actele expirate sau care ajung la termen în cel mult 7 zile.</p></div>}
 {attention.length>3&&<button className="ov-list-footer" onClick={()=>open('/reminders')}>Vezi toate cele {attention.length} acte<ChevronRight size={16}/></button>}</div></section>
 <section className="ov-next" aria-labelledby="next-title"><div className="ov-section-title"><div><p className="ov-eyebrow">PLANIFICĂ DIN TIMP</p><h2 id="next-title">Următorul termen</h2></div><CalendarDays size={21}/></div><div className="ep-card ov-next-card">{next?<><div className="ov-next-top"><span className="ov-document-icon"><NextIcon size={25}/></span><Timing days={daysUntil(next.expires)} other={next.entryType==='other'}/></div><h3>{next.name}</h3><p>{next.reference|| (next.category==='Vehicles'?'Act auto':'Act personal')}</p><div className="ov-next-date"><small>{next.entryType==='other'?'DATA TERMENULUI':'DATA EXPIRĂRII'}</small><time dateTime={next.expires}>{new Date(next.expires+'T00:00:00').toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'})}</time>{next.eventTime&&<span>{next.eventTime}</span>}</div><button className="ep-primary" onClick={()=>open('/documents/'+next.id)}>{next.entryType==='other'?'Vezi termenul':'Pregătește reînnoirea'}<ChevronRight size={17}/></button></>:<div className="ov-caught-up"><CalendarDays size={30}/><h3>Niciun termen viitor</h3><p>{overdue.length?'Actualizează actele expirate pentru a urmări noile termene.':'Noile termene vor apărea aici.'}</p><button className="ep-secondary" onClick={()=>open('/documents')}>Vezi actele</button></div>}</div></section></div>
 <ExpiryCalendar docs={docs} open={open}/>
 </>}
 <section className="ep-card ov-notifications" aria-labelledby="notifications-title"><span className={'ov-symbol '+(push==='active'?'connected':'')}><Smartphone size={25}/></span><div><p className="ov-eyebrow">PLASA TA DE SIGURANȚĂ</p><h2 id="notifications-title">{pushCopy[0]}</h2><p role="status">{pushCopy[1]}</p></div><button className="ep-secondary" onClick={()=>open('/reminders')}><Bell size={16}/>{push==='active'?'Vezi setările':'Setează reamintirile'}</button></section>
 <CalendarExportCard docs={docs} loading={loading||failed}/>
 <p className="ov-footnote"><ShieldCheck size={14}/>Un rezumat pentru tine. Toate documentele rămân în „Actele mele”.</p>
 </div>;
}
