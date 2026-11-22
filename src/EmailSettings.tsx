import {tr,locale} from './i18n.ts';
import {useEffect,useState} from 'react';
import {Mail} from 'lucide-react';
import {getEmailConfig,saveEmail,testEmail} from './email';
import type {EmailConfig} from './email';
export default function EmailSettings(){
 const [config,setConfig]=useState<EmailConfig|null>(null),[hour,setHour]=useState(9),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;getEmailConfig().then(c=>{if(live){setConfig(c);setHour(c.preferences?.hour??9)}}).catch(()=>{if(live)setError(tr("Emailurile nu sunt disponibile momentan."))});return()=>{live=false}},[]);
 async function run(task:()=>Promise<unknown>,success:string){setBusy(true);setError('');setMessage('');try{await task();setConfig(await getEmailConfig());setMessage(success)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const enabled=!!config?.preferences?.enabled;
 const automatic=config?.lastRun&&Date.now()-new Date(config.lastRun).getTime()<45*60000;
 return <section id="email-settings" className="ep-delivery-channel" aria-labelledby="email-channel-title">
 <header className="ep-delivery-heading"><span className="ep-delivery-icon"><Mail size={20}/></span><div><h3 id="email-channel-title">{tr("Alerte prin email")}</h3><p>{tr("Pentru toate profilurile")}</p></div><button type="button" className="ep-channel-control" role="switch" aria-label={tr("Alerte prin email")} aria-checked={enabled} aria-busy={busy} disabled={busy||!config||(!enabled&&(!config.configured||!config.verified))} onClick={()=>void run(()=>saveEmail(!enabled,hour),enabled?tr("Emailurile au fost oprite."):tr("Emailurile sunt activate."))}><span>{!config?tr("Se verifică…"):enabled?tr("Activ"):tr("Oprit")}</span><i aria-hidden="true" className={enabled?'ep-toggle on':'ep-toggle'}><b/></i></button></header>
 <div className="ep-channel-schedule"><label className="ep-channel-label" htmlFor="email-hour">{tr("Ora de trimitere")}</label><div className="ep-schedule-times"><select id="email-hour" value={hour} disabled={busy} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24},(_,n)=><option key={n} value={n}>{String(n).padStart(2,'0')}:00</option>)}</select></div></div>
 <p className="ep-channel-description">{tr("Către")} <strong>{config?.email||tr("adresa contului tău")}</strong></p>
 <div className="ep-push-actions"><button type="button" className="ep-primary" disabled={busy||!enabled} onClick={()=>void run(()=>saveEmail(true,hour),tr("Ora a fost salvată."))}>{tr("Salvează ora")}</button><button type="button" className="ep-secondary" disabled={busy||!enabled||!config?.configured} onClick={()=>void run(testEmail,tr("Test trimis. Verifică Inbox și Spam."))}>{tr("Trimite test")}</button></div>
 <details className="ep-push-details"><summary>{tr("Detalii email")}</summary><p>{enabled?(automatic?tr("Trimiterea automată funcționează."):tr("Activat în cont. Programarea automată nu este încă confirmată.")):tr("Pornește comutatorul pentru a primi emailuri.")}</p><p>{tr("Un email pentru fiecare alertă, la ora aleasă. Alertele cu minute înainte de programări folosesc ora programării; pot ajunge cu până la 15 minute întârziere.")}</p>{config&&!config.configured&&<p>{tr("Serviciul de email este în curs de configurare.")}</p>}{config&&!config.verified&&<p>{tr("Confirmă adresa contului înainte de activare. Conturile Google au adresa deja verificată.")}</p>}</details>
 {error&&<p className="ep-error" role="alert">{error}</p>}{message&&<p className="ep-channel-message" role="status">{message}</p>}
 </section>;
}