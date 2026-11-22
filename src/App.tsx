import PasswordRecovery from './PasswordRecovery';
import BrandMark from './BrandMark';
import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {ShieldCheck,LoaderCircle,Palette} from 'lucide-react';
import {supabase,getAuthSettings} from './supabase';
import Dashboard from './Dashboard';
import Landing from './PocketWelcome';
import {disablePush} from './push';
import './auth.css';

function GoogleIcon(){
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.31.31-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.51l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>;
}

export default function App(){
  const [authTheme,setAuthTheme]=useState(()=>{try{return localStorage.getItem('expiry-pocket-theme')==='carbon'?'carbon':'obsidian'}catch{return 'obsidian'}});
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(false);
  const [recovering,setRecovering]=useState(window.location.pathname==='/reset-password');
  const signup=window.location.pathname==='/register';
  const isLanding=window.location.pathname==='/';
  const isAuth=signup||window.location.pathname==='/login';
  const [busy,setBusy]=useState<'google'|'email'|null>(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!supabase){setReady(true);return;}
    let active=true;
    const params=new URLSearchParams(window.location.hash.slice(1));
    const query=new URLSearchParams(window.location.search);
    if(params.has('error')||query.has('error')){
      setError('Conectarea cu Google nu a fost finalizată. Încearcă din nou sau folosește emailul.');
      for(const key of ['error','error_code','error_description']){params.delete(key);query.delete(key);}
      const clean=new URL(window.location.href);
      clean.hash=params.toString();clean.search=query.toString();
      window.history.replaceState(null,'',clean);
    }
    supabase.auth.getSession().then(({data,error})=>{
      if(active){setSession(data.session);setReady(true);if(error)setError(error.message);}
    }).catch(e=>{if(active){setError(e.message);setReady(true);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,value)=>{
      if(active&&_event==='PASSWORD_RECOVERY')setRecovering(true);
      if(active)setSession(value);
    });
    return()=>{active=false;subscription.unsubscribe();};
  },[]);

  async function googleSignIn(){
    if(!supabase||busy)return;
    setBusy('google');setError('');
    try{
      const settings=await getAuthSettings();
      if(!settings.external?.google)throw Error('Conectarea cu Google nu este disponibilă încă. Poți folosi emailul.');
      const {error}=await supabase.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:window.location.origin+'/app',queryParams:{prompt:'select_account'}}
      });
      if(error)throw error;
    }catch(e){setError((e as Error).message);}
    finally{setBusy(null);}
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase||busy)return;
    setBusy('email');setError('');
    const form=new FormData(e.currentTarget);
    const email=String(form.get('email')).trim(),password=String(form.get('password'));
    try{
      if(signup){
        // Do not trigger a confirmation email when the project is misconfigured.
        const settings=await getAuthSettings();
        if(!settings.mailer_autoconfirm)throw Error('Înregistrarea prin email este în curs de configurare. Încearcă din nou mai târziu.');
        const {data,error}=await supabase.auth.signUp({email,password});
        if(error)throw error;
        if(!data.session)throw Error('Nu te-am putut conecta automat. Încearcă să intri cu emailul și parola.');
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
      }
    }catch(e){setError((e as Error).message);}
    finally{setBusy(null);}
  }

  if(!ready)return <div className="pocket-app ep-auth" data-theme={authTheme}><div className="auth-shell" role="status" aria-label="Se încarcă"><LoaderCircle className="spin" aria-hidden="true"/></div></div>;
  if(recovering||location.pathname==='/forgot-password')return <PasswordRecovery reset={recovering} hasSession={!!session} theme={authTheme}/>;
  if(isLanding)return <Landing signedIn={!!session}/>;
  if(ready&&session&&isAuth){const next=new URLSearchParams(location.search).get('next');window.location.replace(next&&(next==='/app'||next==='/overview'||next==='/reminders'||next==='/documents'||next.startsWith('/documents/'))?next:'/documents');return null;} 
  if(ready&&!session&&!isAuth){window.location.replace('/login?next='+encodeURIComponent(window.location.pathname+window.location.search));return null;}

  if(session)return <Dashboard
    avatarUrl={session.user.user_metadata?.avatar_url||session.user.user_metadata?.picture}
    displayName={session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'there'}
    onSignOut={()=>{void (async()=>{try{await disablePush()}catch{}await supabase?.auth.signOut();window.location.assign('/')})()}}
  />;

  return <div className="pocket-app ep-auth" data-theme={authTheme}><div className="auth-shell"><section className="auth-card auth-entry">
    <button className="ep-icon-button ep-theme-button ep-auth-theme" aria-label="Schimbă tema" title="Schimbă tema" onClick={()=>{const next=authTheme==='obsidian'?'carbon':'obsidian';setAuthTheme(next);try{localStorage.setItem('expiry-pocket-theme',next)}catch{}}}><Palette size={17}/></button>
    <a className="brand" href="/"><span className="brandmark"><BrandMark size={32}/></span>
      <span className="duevo-wordmark">Duevo<small>MAI PUȚINE GRIJI, ZI DE ZI</small></span>
    </a>
    <h1>{signup?'Creează un cont.':'Bine ai venit.'}</h1>
    <p className="auth-intro">Actele tale, la îndemână pe orice dispozitiv.</p>
    {!supabase?<div className="error">Conectarea nu este disponibilă momentan. Încearcă mai târziu.</div>:<>
      <button className="google-signin" type="button" onClick={googleSignIn} disabled={busy!==null}>
        {busy==='google'?<LoaderCircle className="spin" size={20}/>:<GoogleIcon/>}
        {busy==='google'?'Se conectează la Google…':'Continuă cu Google'}
      </button>
      <p className="auth-google-note">{signup?'Contul Duevo se creează cu Google, fără o parolă nouă.':'Ai folosit Google? Alege același cont pentru a-ți regăsi actele.'}</p>
      <details className="auth-email">
      <summary>{signup?'Creează cont cu email':'Intră cu email și parolă'}</summary>
      <form onSubmit={submit}>
        <label>Adresa de email<input autoComplete="email" name="email" type="email" placeholder="nume@exemplu.ro" required disabled={busy!==null}/></label>
        <label>Parola<input autoComplete={signup?'new-password':'current-password'} name="password" type="password" minLength={signup?8:undefined} placeholder={signup?'Cel puțin 8 caractere':'Parola ta'} required disabled={busy!==null}/></label>
        <button className="primary email-signin" disabled={busy!==null}>
          {busy==='email'?<LoaderCircle className="spin" size={18}/>:null}
          {busy==='email'?'Te rugăm să aștepți…':signup?'Creează cont cu email':'Intră în cont cu email'}
        </button>
      </form>{!signup&&<a className="text-button" href="/forgot-password">Ai uitat parola?</a>}
      </details>
    </>}
    {error&&<div className="error" role="alert">{error}</div>}
    <p className="auth-switch">{signup?'Ai deja cont?':'Ești nou aici?'} <a href={signup?'/login':'/register'}>{signup?'Intră în cont':'Creează cont'}</a></p>
  </section></div></div>;
}





