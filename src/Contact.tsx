import {useState} from 'react';
import {BellRing,Check,Copy,Mail,MessageCircle,Music2,ShieldCheck} from 'lucide-react';
import BrandMark from './BrandMark';
import ThemeSwitch from './ThemeSwitch';
import {LanguageButton,useLocalePreference} from './LanguagePicker';
import {Ambient} from './PocketUI';
import {tr} from './i18n.ts';
import './pocket.css';
import './contact.css';

const email='hello.duevo@gmail.com';
export default function Contact({signedIn}:{signedIn:boolean}){
 useLocalePreference();
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('expiry-pocket-theme')==='carbon'?'carbon':'obsidian'}catch{return 'obsidian'}});
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 function toggle(){const next=theme==='carbon'?'obsidian':'carbon';setTheme(next);try{localStorage.setItem('expiry-pocket-theme',next)}catch{}}
 async function copy(){try{await navigator.clipboard.writeText(email);setCopied(true);setCopyError(false)}catch{setCopyError(true)}}
 return <div className="pocket-app ep-welcome du-contact" data-theme={theme}><Ambient/><div className="du-contact-shell">
  <header className="du-contact-header"><a href="/" className="du-contact-brand" aria-label={tr('Duevo — acasă')}><BrandMark size={30}/><strong className="duevo-wordmark">Duevo</strong></a><div><LanguageButton/><ThemeSwitch theme={theme} onToggle={toggle}/></div></header>
  <main>
   <a className="du-contact-back" href={signedIn?'/documents':'/'}>{signedIn?tr('Înapoi la actele mele'):tr('Înapoi la început')}</a>
   <section className="du-contact-intro" aria-labelledby="contact-title">
    <div className="du-contact-avatar"><BrandMark size={64}/><span><MessageCircle size={18}/></span></div>
    <div><h1 id="contact-title">{tr('Contact & ajutor')}</h1><p>{tr('Ai o întrebare sau o sugestie? Suntem aici să te ajutăm.')}</p></div>
   </section>
   <div className="du-contact-grid">
    <section className="du-contact-card" aria-labelledby="contact-email">
     <div className="du-contact-row"><span className="du-contact-icon"><Mail size={21}/></span><div><h2 id="contact-email">Email</h2><a className="du-contact-email" href={'mailto:'+email}>{email}</a></div></div>
     <p className="du-contact-description">{tr('Scrie-ne despre cont, acte sau o problemă în aplicație.')}</p>
     <div className="du-contact-actions"><a className="ep-primary" href={'mailto:'+email}>{tr('Trimite un email')}</a><button type="button" className="ep-secondary" onClick={()=>void copy()} aria-label={tr('Copiază adresa de email')}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?tr('Copiat'):tr('Copiază')}</button></div>
     {(copyError||copied)&&<p className="du-contact-copy-status" role="status">{copyError?tr('Poți selecta și copia adresa de mai sus.'):tr('Adresa de email a fost copiată.')}</p>}
    </section>
    <section className="du-contact-card du-contact-social" aria-labelledby="contact-tiktok">
     <div className="du-contact-row"><span className="du-contact-icon"><Music2 size={21}/></span><div><h2 id="contact-tiktok">TikTok</h2><strong className="du-contact-handle">@duevo8</strong></div></div>
     <p className="du-contact-description">{tr('Noutăți și idei pentru actele tale, la timp.')}</p>
     <a className="ep-secondary" href="https://www.tiktok.com/@duevo8" target="_blank" rel="noopener noreferrer">{tr('Vezi profilul TikTok')}</a>
    </section>
   </div>
   <section className="du-contact-help"><BellRing size={19}/><h2>{tr('Ai o problemă cu alertele?')}</h2><a className="ep-secondary" href={signedIn?'/reminders':'/login?next=/reminders'}>{tr('Vezi setările')}</a></section>
   <p className="du-contact-privacy"><ShieldCheck size={17}/>{tr('Pentru siguranța ta, nu trimite parole, CNP-uri sau copii ale actelor prin email.')}</p>
  </main>
  <footer className="du-contact-footer"><span>Duevo · {tr('Actele tale. La timp.')}</span><a href="/">{tr('Acasă')}</a></footer>
 </div></div>;
}
