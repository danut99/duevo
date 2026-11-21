import {useState} from 'react';
import {supabase} from './supabase';

export default function PasswordRecovery({reset,hasSession,theme}:{reset:boolean;hasSession:boolean;theme:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;
  const form=new FormData(e.currentTarget);setError('');setMessage('');
  const password=String(form.get('password')||'');
  if(reset&&(password.length<8||password!==String(form.get('confirm')))){setError('Folosește minimum 8 caractere și repetă aceeași parolă.');return}
  setBusy(true);
  try{
   if(reset){
    if(!hasSession)throw Error('Linkul a expirat sau nu este valid. Cere un link nou.');
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setDone(true);setMessage('Parola a fost schimbată. Poți continua în aplicație.');
   }else{
    const {error}=await supabase.auth.resetPasswordForEmail(String(form.get('email')).trim(),{redirectTo:location.origin+'/reset-password'});if(error)throw error;
    setMessage('Dacă adresa are un cont, vei primi un link pentru resetare. Verifică și folderul Spam.');
   }
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="pocket-app ep-auth" data-theme={theme}><div className="auth-shell"><section className="auth-card"><a className="brand" href="/">Duevo</a><h1>{reset?'Alege o parolă nouă':'Ai uitat parola?'}</h1><p>{reset?'Introdu parola nouă și confirm-o.':'Îți trimitem un link pentru a alege o parolă nouă.'}</p>
 {!supabase?<p role="alert">Serviciul nu este disponibil momentan.</p>:reset&&!hasSession?<p role="alert">Linkul a expirat sau nu este valid. <a href="/forgot-password">Cere un link nou</a>.</p>:!done&&<form className="ep-password-form" onSubmit={submit}>{reset?<><label>Parola nouă<input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label><label>Confirmă parola<input name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label></>:<label>Adresa de email<input name="email" type="email" autoComplete="email" required disabled={busy}/></label>}<button className="primary email-signin" disabled={busy}>{busy?'Se procesează…':reset?'Salvează parola':'Trimite linkul de resetare'}</button></form>}
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="ep-success">{message}</p>}<a className="text-button" href={done?'/documents':'/login'}>{done?'Continuă în aplicație':'Înapoi la conectare'}</a>
 </section></div></div>;
}
