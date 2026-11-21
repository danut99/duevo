import {useEffect,useState} from 'react';
import {ChevronLeft,Download,Pencil,RefreshCw} from 'lucide-react';
import type {Doc,Revision} from './supabase';
import {downloadDocument,listRevisions,renewDocument} from './supabase';
import {CalendarExport} from './NotificationSettings';
import RenewalHelp from './RenewalHelp';
import {normalizeReminders,reminderLabel} from './reminder-utils';
import {ValidityArc,docType,metrics,shortDate} from './PocketUI';
export default function DocumentDetail({doc,multiple,onChanged,onEdit,onBack,children}:{doc:Doc;multiple:boolean;onChanged:(doc:Doc)=>void;onEdit:()=>void;onBack:()=>void;children:React.ReactNode}){
 const [revisions,setRevisions]=useState<Revision[]>([]),[historyError,setHistoryError]=useState(''),[error,setError]=useState(''),[renewing,setRenewing]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setRevisions([]);setHistoryError('');if(multiple)listRevisions(doc.id).then(rows=>{if(active)setRevisions(rows)}).catch(()=>{if(active)setHistoryError('Istoricul nu a putut fi încărcat.')});return()=>{active=false}},[doc.id,doc.version,multiple]);
 async function renew(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');try{const updated=await renewDocument(doc,String(form.get('expires')));onChanged(updated);setRenewing(false)}catch{setError('Reînnoirea nu a putut fi salvată. Alege o dată viitoare, după data curentă a actului.')}finally{setBusy(false)}}
 const m=metrics(doc),{Icon,code}=docType(doc);
 return <div className={'ep-screen ep-detail '+m.status}><div className="ep-screen-heading ep-centered-heading"><button className="ep-icon-button" aria-label="Înapoi" onClick={onBack}><ChevronLeft size={18}/></button><span>Detalii document</span><button className="ep-icon-button" aria-label="Editează actul" onClick={onEdit}><Pencil size={17}/></button></div>
 <section className="ep-card ep-detail-hero"><div className="ep-document-row"><span className="ep-document-icon"><Icon size={21}/></span><div className="ep-document-name"><small className="ep-orange">{code}</small><h1>{doc.name}</h1></div><span className="ep-badge">{m.badge}</span></div><ValidityArc doc={doc}/><div className="ep-between"><span className="ep-muted">Status termen</span><strong className="ep-state-text">{m.countdown}</strong></div></section>
 <section className="ep-card ep-spec-card"><h2>Specificații act</h2><dl className="ep-spec-grid"><div><dt>Categorie</dt><dd>{doc.category==='Vehicles'?'Auto & Vehicul':'Personal & ID'}</dd></div><div><dt>Serie / Număr</dt><dd className="ep-mono">{doc.reference||'—'}</dd></div>{doc.issuedOn&&<div><dt>Emis la</dt><dd className="ep-mono">{shortDate(doc.issuedOn)}</dd></div>}<div><dt>Expiră la</dt><dd className="ep-mono ep-orange">{shortDate(doc.expires)}</dd></div><div className="ep-spec-wide"><dt>Memento</dt><dd>{normalizeReminders(doc.reminderDays,doc.days).map(n=><span key={n}>{reminderLabel(n)}</span>)}</dd></div></dl></section>
 <RenewalHelp key={doc.id} doc={doc}/>
 <button className="ep-primary ep-wide ep-save" disabled={!multiple} onClick={()=>setRenewing(v=>!v)}><RefreshCw size={17}/>Marchează reînnoit</button>{children}
 {renewing&&<form className="ep-card ep-form-card ep-renew-form" onSubmit={renew}><h2>Act reînnoit</h2><label htmlFor="renew-expires">Noua dată de expirare</label><input id="renew-expires" name="expires" type="date" required min={(()=>{const next=new Date(doc.expires+'T12:00:00');next.setDate(next.getDate()+1);return new Date(Math.max(next.getTime(),Date.now())).toLocaleDateString('sv-SE')})()}/><div className="ep-between"><button className="ep-primary" disabled={busy}>{busy?'Se salvează…':'Confirmă reînnoirea'}</button><button type="button" className="ep-pill" disabled={busy} onClick={()=>setRenewing(false)}>Renunță</button></div></form>}
 {error&&<p className="ep-error" role="alert">{error}</p>}
 <details className="ep-card ep-extra"><summary>Calendar și istoric</summary><CalendarExport docs={[doc]}/>{doc.notes&&<p className="ep-notes">{doc.notes}</p>}{doc.fileName&&<button className="ep-secondary" onClick={()=>downloadDocument(doc).catch(()=>setError('Fișierul nu a putut fi descărcat.'))}><Download size={16}/>{doc.fileName}</button>}{multiple&&<section className="ep-history"><h2>Istoric de reînnoire</h2>{historyError?<p role="alert">{historyError}</p>:revisions.length?<ul>{revisions.map(row=><li key={row.id}><strong>Valabil până la {new Date(row.expires+'T00:00:00').toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'})}</strong><small>Actualizat la {new Date(row.renewed_at).toLocaleDateString('ro-RO')}</small></li>)}</ul>:<p>Nicio reînnoire înregistrată încă.</p>}</section>}</details>
 </div>;
}

