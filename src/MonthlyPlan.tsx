import {useState} from 'react';
import {ArrowUpRight,CalendarCheck,Check,CheckCircle2,ChevronDown,FolderOpen,LoaderCircle} from 'lucide-react';
import type {Doc} from './supabase';
import {completeTerm} from './supabase';
import {monthlyPlan} from './monthly-plan';
import {tr,locale} from './i18n.ts';
import {shortDate} from './PocketUI';
import './monthly-plan.css';
export default function MonthlyPlan({docs,open,onChanged}:{docs:Doc[];open:(path:string)=>void;onChanged:(doc:Doc)=>void}){
 const [limit,setLimit]=useState(5),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const plan=monthlyPlan(docs);
 async function finish(doc:Doc){setBusy(doc.id);setError('');setMessage('');try{onChanged(await completeTerm(doc,true));setMessage(tr('Termenul a fost marcat ca rezolvat.'))}catch{setError(tr('Nu am putut finaliza termenul. Încearcă din nou.'))}finally{setBusy(null)}}
 return <section className="ep-card du-month-plan" aria-labelledby="du-month-title"><div className="du-month-heading"><div><p className="ov-eyebrow">{new Date().toLocaleDateString(locale(),{month:'long',year:'numeric'})}</p><h2 id="du-month-title">{tr('Luna aceasta și restanțe')}</h2><p>{tr('Termene de azi până la sfârșitul lunii, plus cele depășite și nerezolvate.')}</p></div><CalendarCheck size={22}/></div>
 <div className="du-month-counts"><span>{tr('Până la sfârșitul lunii: {0}',plan.thisMonth)}</span>{plan.overdue>0&&<span className="overdue">{tr('Restante: {0}',plan.overdue)}</span>}</div>
 {plan.items.length?<div className="du-month-list">{plan.items.slice(0,limit).map(doc=><article key={doc.id} className="du-month-item"><div className="du-month-item-heading"><span className={'du-month-status '+(doc.expires<plan.today?'overdue':'')}>{doc.expires<plan.today?tr('Restant'):doc.expires===plan.today?tr('Astăzi'):shortDate(doc.expires)}</span>{doc.eventTime&&<time>{doc.eventTime}</time>}</div><h3>{doc.name}</h3><p><time dateTime={doc.expires}>{shortDate(doc.expires)}</time>{doc.eventTime&&' · '+doc.eventTime}</p><div className="du-month-actions"><button className="ov-link" type="button" onClick={()=>open('/documents/'+doc.id)}>{tr('Vezi detalii')}<ArrowUpRight size={14}/></button>{doc.entryType==='other'?<button className="ep-secondary" type="button" disabled={busy!==null} onClick={()=>void finish(doc)}>{busy===doc.id?<LoaderCircle size={14} className="spin"/>:<Check size={14}/>} {tr('Am rezolvat')}</button>:<button className="ep-secondary" type="button" onClick={()=>open('/documents/'+doc.id+'?prepare=1')}><FolderOpen size={14}/>{tr('Pregătește documentele')}</button>}</div></article>)}</div>:<div className="du-month-empty"><CheckCircle2 size={28}/><h3>{tr('Luna aceasta ești la zi.')}</h3><p>{tr('Nu ai termene restante sau scadente până la sfârșitul lunii.')}</p><button className="ov-link" onClick={()=>open('/documents/new')}>{tr('Adaugă un act sau o programare')}<ArrowUpRight size={14}/></button></div>}
 {plan.items.length>limit&&<button className="du-month-more" onClick={()=>setLimit(n=>n+5)}>{tr('Arată mai multe ({0})',plan.items.length-limit)}<ChevronDown size={16}/></button>}
 {error&&<p role="alert" className="ep-error">{error}</p>}{message&&<p role="status" className="ep-success">{message}</p>}
 </section>;
}
