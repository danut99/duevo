import {useEffect,useState} from 'react';
import {getEmailConfig,saveEmail,testEmail} from './email';
import type {EmailConfig} from './email';
export default function EmailSettings(){
 const [config,setConfig]=useState<EmailConfig|null>(null),[hour,setHour]=useState(9),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;getEmailConfig().then(c=>{if(live){setConfig(c);setHour(c.preferences?.hour??9)}}).catch(()=>{if(live)setError('Emailurile nu sunt disponibile momentan.')});return()=>{live=false}},[]);
 async function run(task:()=>Promise<unknown>,success:string){setBusy(true);setError('');setMessage('');try{await task();setConfig(await getEmailConfig());setMessage(success)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const enabled=!!config?.preferences?.enabled;
 const automatic=config?.lastRun&&Date.now()-new Date(config.lastRun).getTime()<45*60000;
 return <details className="ep-push-details"><summary>Email · {enabled?'Activ':'Oprit'}</summary>
 <p>Alertele se trimit de la hello.duevo@gmail.com către {config?.email||'adresa contului tău'}, pentru toate profilurile din cont.</p>
 {!config?.configured&&<p>Serviciul de email este în curs de configurare.</p>}
 {config&&!config.verified&&<p>Confirmă adresa de email a contului înainte de activare. Conectarea cu Google folosește adresa verificată de Google.</p>}
 <button type="button" className="ep-secondary" role="switch" aria-label="Alerte prin email" aria-checked={enabled} disabled={busy||!config||(!enabled&&(!config.configured||!config.verified))} onClick={()=>void run(()=>saveEmail(!enabled,hour),enabled?'Emailurile au fost oprite.':'Emailurile au fost activate. Trimite un test pentru verificare.')}>{enabled?'Oprește emailurile':'Activează emailurile'}</button>
 <div className="ep-hours"><label>Ora emailului <select value={hour} disabled={busy} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24},(_,n)=><option key={n} value={n}>{String(n).padStart(2,'0')}:00</option>)}</select></label></div>
 <p>Un email pentru fiecare alertă a actului, la ora aleasă. Alertele cu minute înainte de programări folosesc ora programării; pot ajunge cu până la 15 minute întârziere.</p>
 {enabled&&<p>{automatic?'Programarea emailurilor funcționează.':'Activat în cont; programarea pe server nu este încă confirmată.'}</p>}
 <div className="ep-push-actions"><button type="button" className="ep-primary" disabled={busy||!enabled} onClick={()=>void run(()=>saveEmail(true,hour),'Ora emailurilor a fost salvată.')}>Salvează ora</button><button type="button" className="ep-secondary" disabled={busy||!enabled||!config?.configured} onClick={()=>void run(testEmail,'Gmail a acceptat emailul. Verifică Inbox și Spam.')}>Trimite email de test</button></div>
 {error&&<p className="ep-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </details>;
}
