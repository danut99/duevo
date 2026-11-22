import {LanguageButton} from './LanguagePicker';
import {tr,locale} from './i18n.ts';
import {useState} from 'react';
import {supabase} from './supabase';

export default function PasswordRecovery({reset,hasSession,theme}:{reset:boolean;hasSession:boolean;theme:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;
  const form=new FormData(e.currentTarget);setError('');setMessage('');
  const password=String(form.get('password')||'');
  if(reset&&(password.length<8||password!==String(form.get('confirm')))){setError(tr("Folosește minimum 8 caractere și repetă aceeași parolă."));return}
  setBusy(true);
  try{
   if(reset){
    if(!hasSession)throw Error(tr("Linkul a expirat sau nu este valid. Cere un link nou."));
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setDone(true);setMessage(tr("Parola a fost schimbată. Poți continua în aplicație."));
   }else{
    const {error}=await supabase.auth.resetPasswordForEmail(String(form.get('email')).trim(),{redirectTo:location.origin+'/reset-password'});if(error)throw error;
    setMessage(tr("Dacă adresa are un cont, vei primi un link pentru resetare. Verifică și folderul Spam."));
   }
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="pocket-app ep-auth" data-theme={theme}><div className="auth-shell"><section className="auth-card"><div className="du-auth-language"><LanguageButton/></div><a className="brand" href="/">{"Duevo"}</a><h1>{reset?tr("Alege o parolă nouă"):tr("Ai uitat parola?")}</h1><p>{reset?tr("Introdu parola nouă și confirm-o."):tr("Îți trimitem un link pentru a alege o parolă nouă.")}</p>
 {!supabase?<p role="alert">{tr("Serviciul nu este disponibil momentan.")}</p>:reset&&!hasSession?<p role="alert">{tr("Linkul a expirat sau nu este valid.")} <a href="/forgot-password">{tr("Cere un link nou")}</a>.</p>:!done&&<form className="ep-password-form" onSubmit={submit}>{reset?<><label>{tr("Parola nouă")}<input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label><label>{tr("Confirmă parola")}<input name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label></>:<label>{tr("Adresa de email")}<input name="email" type="email" autoComplete="email" required disabled={busy}/></label>}<button className="primary email-signin" disabled={busy}>{busy?tr("Se procesează…"):reset?tr("Salvează parola"):tr("Trimite linkul de resetare")}</button></form>}
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="ep-success">{message}</p>}<a className="text-button" href={done?'/documents':'/login'}>{done?tr("Continuă în aplicație"):tr("Înapoi la conectare")}</a>
 </section></div></div>;
}
