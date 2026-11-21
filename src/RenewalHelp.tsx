import {useState} from 'react';
import {Check,ChevronDown,ExternalLink,FileCheck2,MapPin} from 'lucide-react';
import type {Doc} from './supabase';
import {guides,mapSearch,resolveGuide} from './renewal-guides';
export default function RenewalHelp({doc}:{doc:Doc}){
 const inferred=resolveGuide(doc.name,doc.category),[choice,setChoice]=useState(''),[city,setCity]=useState('');
 const code=choice||inferred,guide=code?guides[code]:null;
 return <section className="ep-card ep-renewal-help"><div className="ep-help-heading"><span className="ep-help-icon"><FileCheck2 size={20} strokeWidth={1.5}/></span><div><small>URMĂTORUL PAS</small><h2>Rezolvă actul</h2></div><span className="ep-help-country">România</span></div>
 {!guide?<><p>Alege tipul actului pentru linkurile potrivite.</p><label className="ep-help-select">Tipul actului<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Alege un tip</option>{(doc.category==='Vehicles'?['RCA','ITP','ROV','CAS']:['CI','PER','PAS','SAN']).map(key=><option key={key} value={key}>{guides[key].title}</option>)}</select></label></>:<><h3>{guide.title}</h3><p>{guide.description}</p><a className="ep-primary ep-help-action" href={guide.mapQuery?mapSearch(guide.mapQuery,city):guide.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{guide.mapQuery?<MapPin size={18}/>:<ExternalLink size={17}/>}<span>{guide.action}</span><ExternalLink size={14}/></a>
 {guide.mapQuery&&<details className="ep-help-location"><summary>Preferi să cauți într-un oraș?<ChevronDown size={16}/></summary><label htmlFor={'help-city-'+doc.id}>Oraș sau localitate<input id={'help-city-'+doc.id} value={city} maxLength={80} onChange={e=>setCity(e.target.value)} placeholder="De exemplu: Brașov"/></label><p>Maps folosește propria permisiune de locație. Nu cerem locația aici.</p></details>}
 <details className="ep-help-checklist"><summary>Ce pregătesc?<ChevronDown size={17}/></summary><ul>{guide.items.map(item=><li key={item}><Check size={15}/><span>{item}</span></li>)}</ul><p>{guide.note}</p>{guide.extra&&<a href={guide.extra.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{guide.extra.label}<ExternalLink size={13}/></a>}</details><div className="ep-help-source"><a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{guide.source}<ExternalLink size={12}/></a><span>Verificat: 21.11.2026</span></div><small className="ep-help-footnote">Se deschide un site extern. Programarea sau plata se face acolo.</small></>}
 </section>;
}
