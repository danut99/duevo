import {tr,locale} from './i18n.ts';
import {useRef,useState} from 'react';
import {CalendarDays,ChevronRight} from 'lucide-react';
import type {Doc} from './supabase';
import {daysUntil,docType} from './PocketUI';
import './expiry-calendar.css';

export default function ExpiryCalendar({docs,open}:{docs:Doc[];open:(path:string)=>void}){
 const [filter,setFilter]=useState<'all'|'soon'|'expired'>('all');
 const list=useRef<HTMLDivElement>(null);
 const active=docs.filter(doc=>!doc.completedAt);
 const upcoming=active.filter(doc=>daysUntil(doc.expires)>=0).sort((a,b)=>a.expires.localeCompare(b.expires)||a.name.localeCompare(b.name,'ro'));
 const overdue=active.filter(doc=>daysUntil(doc.expires)<0).sort((a,b)=>b.expires.localeCompare(a.expires)||a.name.localeCompare(b.name,'ro'));
 const soon=upcoming.filter(doc=>daysUntil(doc.expires)<=30);
 const visible=filter==='soon'?soon:filter==='expired'?overdue:[...upcoming,...overdue];
 const groups=new Map<string,{title:string;overdue:boolean;docs:Doc[]}>();
 for(const doc of visible){
  const past=daysUntil(doc.expires)<0;
  const key=(past?'past-':'next-')+doc.expires.slice(0,7);
  if(!groups.has(key))groups.set(key,{title:new Date(doc.expires+'T12:00:00').toLocaleDateString(locale(),{month:'long',year:'numeric'}),overdue:past,docs:[]});
  groups.get(key)!.docs.push(doc);
 }
 return <section className="ep-card expiry-timeline" aria-labelledby="expiry-calendar-title">
 <header className="et-heading"><span className="et-heading-icon"><CalendarDays size={21}/></span><div><h2 id="expiry-calendar-title">{tr("Acte și termene")}</h2><p>{tr("Toate datele, în ordinea în care ai nevoie de ele.")}</p></div><span className="et-total">{active.length} {active.length===1?tr("act"):tr("acte")}</span></header>
 <div className="et-filters" role="group" aria-label={tr("Filtrează termenele")}>{([{key:'all',label:tr("Toate"),count:active.length},{key:'soon',label:tr("Expiră curând"),count:soon.length},{key:'expired',label:tr("Expirate"),count:overdue.length}] as const).map(item=><button type="button" key={item.key} aria-pressed={filter===item.key} onClick={()=>{setFilter(item.key);list.current?.scrollTo({top:0})}}>{tr(item.label)}<span>{item.count}</span></button>)}</div>
 <p className="et-filter-help" role="status">{filter==='soon'?tr("În următoarele 30 de zile, inclusiv astăzi."):filter==='expired'?tr("Termene depășite, de la cele mai recente."):tr("Următoarele expirări mai întâi, apoi termenele depășite.")}</p>
 {visible.length?<div className="et-scroll" ref={list} tabIndex={0} role="region" aria-label={tr("Actele și datele lor de expirare")}>
 {[...groups].map(([key,group])=><section className={'et-month'+(group.overdue?" is-past":'')} key={key} aria-label={(group.overdue?tr("Termene depășite: "):'')+group.title}>
 <h3>{group.overdue&&<span>{tr("Termene depășite ·")} </span>}{group.title}<small>{group.docs.length}</small></h3>
 <div className="et-documents">{group.docs.map(doc=>{const date=new Date(doc.expires+'T12:00:00'),days=daysUntil(doc.expires),Icon=docType(doc).Icon;
 const timing=days<0?(doc.entryType==='other'?tr("Depășit"):tr("Expirat")):days===0?tr("Astăzi"):days===1?tr("Mâine"):tr("În {0} zile",days);
 return <button type="button" className={'et-document'+(days<0?" is-past":days<=7?" is-near":'')} key={doc.id} onClick={()=>open('/documents/'+doc.id)}>
 <time className="et-date" dateTime={doc.expires}><strong>{date.getDate()}</strong><span>{date.toLocaleDateString(locale(),{month:'short'})}</span></time>
 <span className="et-document-copy"><strong><Icon size={15}/>{doc.name}</strong><small>{doc.reference&&<span>{doc.reference} · </span>}{date.toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'})}{doc.eventTime&&' · '+doc.eventTime}</small></span>
 <span className="et-timing">{timing}</span><ChevronRight className="et-chevron" size={16}/>
 </button>})}</div></section>)}
 </div>:<p className="et-empty">{!active.length?tr("Adaugă un act pentru a vedea aici data lui de expirare."):filter==='soon'?tr("Niciun act nu expiră în următoarele 30 de zile."):tr("Nu ai acte expirate.")}</p>}
 </section>;
}
