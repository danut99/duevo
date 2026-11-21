import {useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import type {Doc} from './supabase';
import {docType} from './PocketUI';
import './expiry-calendar.css';

const key=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const weekdays=['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
export default function ExpiryCalendar({docs,open}:{docs:Doc[];open:(path:string)=>void}){
 const today=key(new Date());
 const [selected,setSelected]=useState(today);
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
 const [expanded,setExpanded]=useState(false);
 const start=(month.getDay()+6)%7;
 const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const rows=Math.ceil((start+count)/7);
 const selectedDate=new Date(selected+'T12:00:00');
 const weekStart=new Date(selectedDate);weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);
 const cells=Array.from({length:rows*7},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i-start+1));
 const week=Array.from({length:7},(_,i)=>new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+i));
 const monthDocs=docs.filter(d=>d.expires.startsWith(key(month).slice(0,7)));
 const dayDocs=docs.filter(d=>d.expires===selected);
 function move(amount:number){const date=new Date(month.getFullYear(),month.getMonth()+amount,1);setMonth(date);setSelected(key(date));}
 function day(date:Date,compact=false){const value=key(date),items=docs.filter(d=>d.expires===value),outside=date.getMonth()!==month.getMonth();return <button key={value} type="button" className={'ec-day'+(outside?' outside':'')+(selected===value?' selected':'')+(value===today?' today':'')} aria-pressed={selected===value} aria-label={`${date.toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'})}, ${items.length} ${items.length===1?'act':'acte'}`} onClick={()=>{setSelected(value);if(outside)setMonth(new Date(date.getFullYear(),date.getMonth(),1));}}>{compact&&<small>{weekdays[(date.getDay()+6)%7]}</small>}<span className="ec-number">{date.getDate()}</span><span className="ec-events">{items.slice(0,2).map(d=><span key={d.id} className={'ec-event '+(d.expires<today?'past':'')}><i/>{d.name}</span>)}{items.length>2&&<span className="ec-more">+{items.length-2} acte</span>}</span></button>}
 return <section className={'ep-card expiry-calendar'+(expanded?' expanded':'')} aria-labelledby="expiry-calendar-title">
 <div className="ec-heading"><div><span className="ec-eyebrow"><CalendarDays size={15}/>TERMENELE TALE</span><h2 id="expiry-calendar-title">Calendarul termenelor</h2><p>{monthDocs.length?`${monthDocs.length} ${monthDocs.length===1?'termen':'termene'} în această lună.`:'Niciun termen în această lună.'}</p></div><button type="button" className="ec-today" onClick={()=>{setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1));setSelected(today);}}>Astăzi</button></div>
 <div className="ec-toolbar"><h3 aria-live="polite">{month.toLocaleDateString('ro-RO',{month:'long',year:'numeric'})}</h3><div><button type="button" aria-label="Luna precedentă" onClick={()=>move(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label="Luna următoare" onClick={()=>move(1)}><ChevronRight size={20}/></button></div></div>
 <div className="ec-month"><div className="ec-weekdays">{weekdays.map(w=><span key={w}>{w}</span>)}</div><div className="ec-grid">{cells.map(d=>day(d))}</div></div>
 <div className="ec-week">{week.map(d=>day(d,true))}</div>
 <button type="button" className="ec-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Arată săptămâna':'Vezi luna completă'}<CalendarDays size={16}/></button>
 <div className="ec-agenda"><div className="ec-agenda-heading"><h3>{selected===today?'Astăzi':selectedDate.toLocaleDateString('ro-RO',{day:'numeric',month:'long'})}</h3><span>{dayDocs.length} {dayDocs.length===1?'act':'acte'}</span></div>{dayDocs.length?dayDocs.map(doc=>{const Icon=docType(doc).Icon;return <button type="button" className="ec-document" key={doc.id} onClick={()=>open('/documents/'+doc.id)}><span className="ec-document-icon"><Icon size={20}/></span><span><strong>{doc.name}</strong><small>{doc.entryType==='other'?(doc.eventTime||'Termen personal'):doc.reference||'Vezi detaliile actului'}</small></span><ChevronRight size={18}/></button>}):<p className="ec-empty">Niciun termen în această zi.</p>}</div>
 </section>;
}
