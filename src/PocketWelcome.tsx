import {LanguageButton} from './LanguagePicker';
import {tr,locale} from './i18n.ts';
import BrandMark from './BrandMark';
import ThemeSwitch from './ThemeSwitch';
import {useEffect,useRef,useState} from 'react';
import {Apple,ArrowRight,BellRing,CalendarDays,Car,Check,ChevronRight,Download,IdCard,Layers,PlayCircle,PlusCircle,Smartphone,Sparkles,X} from 'lucide-react';
import {Ambient} from './PocketUI';
import HeroPreview from './HeroPreview';
import IntroWalkthrough from './IntroWalkthrough';
import InstallGuide from './InstallGuide';
import {promptInstall} from './install';
import './pocket.css';
import './intro-calendar.css';
const benefits=[
 {badge:'ACTE',Icon:Layers,short:'Acte & copii',title:'Actele tale, într-un singur loc',detail:'Păstrezi actele auto și personale, împreună cu fotografii sau fișiere PDF. Le organizezi pe mașini și profiluri, ca să găsești ușor ce cauți.',tag:'RCA, ITP, buletin și nu numai'},
 {badge:'TERMENE',Icon:CalendarDays,short:'Termene clare',title:'Vezi ce expiră, fără să cauți',detail:'Dashboardul îți arată actele expirate și următorul termen. În lista pe luni vezi data exactă a fiecărui act și filtrezi rapid ce expiră în următoarele 30 de zile.',tag:'Date exacte. Priorități clare.'},
 {badge:'ALERTE',Icon:BellRing,short:'Email & telefon',title:'Reamintiri înainte de expirare',detail:'Alegi alerte cu 30, 14, 7 sau 1 zi înainte. Emailurile ajung la adresa contului, iar notificările pe dispozitivele pe care le activezi. După reînnoire, actualizezi data actului.',tag:'Tu alegi orele de trimitere'}
];
export default function PocketWelcome({signedIn}:{signedIn:boolean}){
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('expiry-pocket-theme')==='carbon'?'carbon':'obsidian'}catch{return 'obsidian'}}),[index,setIndex]=useState(0),[modal,setModal]=useState(false),[platform,setPlatform]=useState(''),[copied,setCopied]=useState(false);
 const close=useRef<HTMLButtonElement>(null),opener=useRef<HTMLElement|null>(null);const active=benefits[index],Icon=active.Icon;

 function toggle(){const value=theme==='obsidian'?'carbon':'obsidian';setTheme(value);try{localStorage.setItem('expiry-pocket-theme',value)}catch{}}
 async function show(value=''){
  opener.current=document.activeElement as HTMLElement;
  if(value==='Android'&&/Android/i.test(navigator.userAgent)&&await promptInstall())return;
  setPlatform(value);setCopied(false);setModal(true);
 }
 useEffect(()=>{if(!modal)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(false);if(e.key==='Tab'){const items=Array.from(document.querySelectorAll<HTMLElement>('.ep-install-modal button,.ep-install-modal a'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);opener.current?.focus()}},[modal]);
 async function copy(){try{await navigator.clipboard.writeText(location.origin);setCopied(true)}catch{setCopied(false)}}
 return <div className="pocket-app ep-welcome ep-intro-v2" data-theme={theme}><Ambient/><div className="ep-app-shell"><header className="ep-intro-header"><div><span className="ep-welcome-logo"><BrandMark size={30}/></span><span><strong className="duevo-wordmark">{"Duevo"}</strong><small>{tr("Actele tale. La timp.")}</small></span></div><div><LanguageButton/><ThemeSwitch theme={theme} onToggle={toggle}/>{signedIn?<a className="ep-intro-skip" href="/app">{tr("Portofelul meu")}</a>:<a className="ep-intro-skip" href="/login">{tr("Intră în cont")}</a>}</div></header>
 <main className="ep-intro-main"><section className="ep-landing-hero" aria-label={tr("Actele tale, mereu la timp")}><div className="ep-hero-content"><div className="ep-intro-hero"><div><span className="ep-intro-label"><Sparkles size={12}/>{tr("FĂRĂ AMENZI. ACTELE, LA TIMP.")}</span><h1>{tr("Toate actele tale.")}<br/><span>{tr("Știi ce expiră.")}<br/> {tr("Știi când.")}</span></h1><p className="ep-hero-description"><span className="ep-hero-description-full">{tr("De la")} <strong>{tr("RCA și ITP")}</strong> {tr("la")} <strong>{tr("buletin și pașaport")}</strong>{tr(", păstrezi actele și copiile lor într-un singur loc. Vezi imediat ce expiră și alegi reamintiri prin email sau pe telefon.")}</span><span className="ep-hero-description-mobile">{tr("Acte, copii și date de expirare, la un loc. Cu reamintiri prin email și pe telefon.")}</span></p></div><HeroPreview/></div>
 {signedIn?<><a className="ep-intro-start" href="/app"><span className="ep-intro-start-icon"><ArrowRight size={22}/></span><span><strong>{tr("Deschide Portofelul")}</strong><small>{tr("Vezi ce expiră și ce urmează")}</small></span><ChevronRight size={18}/></a></>:<div className="ep-auth-actions"><a className="ep-intro-start" href="/login"><span className="ep-intro-start-icon"><ArrowRight size={22}/></span><span><strong>{tr("Intră în cont")}</strong><small>{tr("Revino la actele tale")}</small></span><ChevronRight size={18}/></a><a className="ep-intro-start ep-register-cta" href="/register"><span className="ep-intro-start-icon"><PlusCircle size={22}/></span><span><strong>{tr("Creează cont")}</strong><small>{tr("Începe cu primul tău act")}</small></span><ChevronRight size={18}/></a></div>}
</div></section> <section className="ep-everywhere" aria-labelledby="everywhere-title"><div className="ep-section-heading ep-uppercase"><h2 id="everywhere-title">{tr("Cu tine, oriunde")}</h2><span className="ep-mono">{tr("TELEFON & CALENDAR")}</span></div><p className="ep-everywhere-lead">{tr("Actele la îndemână. Termenele, în programul tău.")}</p><div className="ep-everywhere-content"><div className="ep-download"><div className="ep-download-heading"><span className="ep-download-icon"><Smartphone size={17}/></span><div><h2>{tr("Duevo pe telefonul tău")}</h2><p>{tr("iOS & Android • Instalare din browser")}</p></div><button onClick={()=>show()}>{tr("Link app")}</button></div><div className="ep-store-buttons"><button className="ep-install-iphone" onClick={()=>show('iOS')}><Apple size={18}/><span><small>{tr("Instalează pe")}</small><strong>{tr("iPhone (iOS)")}</strong></span><Download size={14}/></button><button className="ep-install-android" onClick={()=>show('Android')}><PlayCircle size={18}/><span><small>{tr("Instalează pe")}</small><strong>{tr("Android")}</strong></span><Download size={14}/></button></div></div>
<aside className="ep-intro-calendar-note" aria-label={tr("Export în calendar")}><CalendarDays size={19} aria-hidden="true"/><p><strong>{tr("Și în calendarul tău.")}</strong> {tr("După conectare, poți exporta termenele și reamintirile în Apple Calendar, Google Calendar sau Outlook.")}<small>{tr("Fișier .ics cu import manual.")}</small></p></aside></div></section>
<IntroWalkthrough signedIn={signedIn}/> <section className="ep-benefits"><div className="ep-section-heading ep-uppercase"><h2>{tr("Cum te ajută")}</h2><span className="ep-orange ep-mono">{tr("Atinge un card")}</span></div><div className="ep-benefit-grid">{benefits.map((b,n)=><button key={b.badge} aria-pressed={index===n} onClick={()=>setIndex(n)}><span className="ep-benefit-top"><span className="ep-benefit-icon"><b.Icon size={22}/></span><span className="ep-benefit-select">{index===n?<Check size={13}/>:<ChevronRight size={14}/>}</span></span><strong>{tr(b.short)}</strong><small>{n===0?tr("Auto, personale, fotografii și PDF"):n===1?tr("Date de expirare și filtre rapide"):tr("Alerte la orele alese")}</small><span className="ep-benefit-bottom">{index===n?tr("Vezi mai jos"):tr("Descoperă")}<ArrowRight size={13}/></span></button>)}</div><div className="ep-benefit-detail" aria-live="polite"><div><span><Icon size={15}/></span><strong>{tr(active.title)}</strong><small>{tr(active.tag)}</small></div><p>{tr(active.detail)}</p></div></section>
 </main></div>
 {modal&&<div className="ep-install-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(false)}}><section className="ep-install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><header><span><Smartphone size={18}/></span><h2 id="install-title">{platform==='iOS'?tr("Instalează pe iPhone"):platform==='Android'?tr("Instalează pe Android"):tr("Linkul aplicației")}</h2><button ref={close} aria-label={tr("Închide")} onClick={()=>setModal(false)}><X size={16}/></button></header><InstallGuide platform={platform} copied={copied} onCopy={copy}/></section></div>}
 </div>;
}





