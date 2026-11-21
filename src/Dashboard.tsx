import BrandMark from './BrandMark';
import CalendarExportCard from './CalendarExportCard';
import Overview from './Overview';
import ThemeSwitch from './ThemeSwitch';
import ProfilePicker from './ProfilePicker';
﻿import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Bell,Check,ChevronLeft,Folder,Home,LogOut,Plus,Trash2,X,ShieldCheck} from 'lucide-react';
import {createDocument,deleteDocument,hasReminderSchema,listDocuments,updateDocument,listWalletProfiles} from './supabase';
import type {Doc,WalletProfile} from './supabase';
import DocumentEditor from './DocumentEditor';
import DocumentDetail from './DocumentDetail';
import DocumentPanel from './DocumentPanel';
import NextExpiry from './NextExpiry';
import AlertCenter from './AlertCenter';
import {Ambient,DocumentCard,Folders,metrics} from './PocketUI';
import './pocket.css';

export default function Dashboard({displayName,avatarUrl,onSignOut}:{displayName:string;avatarUrl?:string;onSignOut:()=>void}){
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('expiry-pocket-theme')==='carbon'?'carbon':'obsidian'}catch{return 'obsidian'}});
 const [avatarFailed,setAvatarFailed]=useState(false);
 const [path,setPath]=useState(location.pathname),[allDocs,setDocs]=useState<Doc[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false),[query,setQuery]=useState(history.state?.epUI?.query||''),[filter,setFilter]=useState(history.state?.epUI?.filter||'all'),[category,setCategory]=useState(new URLSearchParams(location.search||history.state?.epOrigin?.url?.split('?')[1]).get('category')||'all'),[multiple,setMultiple]=useState(false);
 const [alertState,setAlertState]=useState({filter:'all',seen:[] as string[]});
 const [profiles,setProfiles]=useState<WalletProfile[]>([]),[profileId,setProfileId]=useState('');
 const docs=allDocs.filter(d=>profileId==='legacy'?!d.profileId:d.profileId===profileId);
 const activeProfile=profiles.find(p=>p.id===profileId);
 const heading=useRef<HTMLHeadingElement>(null);
 const accountMenu=useRef<HTMLDetailsElement>(null);
 function positionAccountMenu(){
  const menu=accountMenu.current;
  if(!menu?.open)return;
  const popover=menu.querySelector<HTMLElement>('.ep-account-popover');
  const trigger=menu.querySelector('summary');
  if(!popover||!trigger)return;
  const anchor=trigger.getBoundingClientRect();
  const parent=menu.getBoundingClientRect();
  const width=popover.getBoundingClientRect().width;
  const left=Math.max(16,Math.min(anchor.left+(anchor.width-width)/2,document.documentElement.clientWidth-width-16));
  popover.style.left=`${left-parent.left}px`;
  popover.style.right='auto';
 }
 useEffect(()=>{window.addEventListener('resize',positionAccountMenu);return()=>window.removeEventListener('resize',positionAccountMenu)},[]);
 useEffect(()=>{
  function closeOutside(event:PointerEvent){
   const menu=accountMenu.current;
   if(menu?.open&&event.target instanceof Node&&!menu.contains(event.target))menu.open=false;
  }
  function closeOnEscape(event:KeyboardEvent){
   const menu=accountMenu.current;
   if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary')?.focus()}
  }
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('keydown',closeOnEscape);
  return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeOnEscape)};
 },[]);
 const name=displayName==='there'?'prietene':displayName.trim().split(/\s+/)[0]||'prietene';
 const initials=displayName==='there'?'DU':displayName.trim().split(/\s+/).slice(0,2).map(p=>Array.from(p)[0]).join('').toLocaleUpperCase('ro-RO');
 const adding=path==='/documents/new',selected=docs.find(d=>path===`/documents/${d.id}`),editing=docs.find(d=>path===`/documents/${d.id}/edit`);
 const origin=history.state?.epOrigin as {url:string;scroll:number;query:string;filter:string}|undefined;
 const viewPath=selected?(origin?.url.split('?')[0]||'/documents'):path;
 const home=viewPath==='/overview',reminders=viewPath==='/reminders',list=viewPath==='/documents'||viewPath==='/app';
 const restoreScroll=useRef<number|null>(null); const pendingNotice=useRef('');
 const urgent=docs.filter(d=>metrics(d).status!=='valid').sort((a,b)=>a.expires.localeCompare(b.expires));
 const visible=docs.filter(d=>(filter==='all'||metrics(d).status===filter)&&(category==='all'||category===d.category)).sort((a,b)=>a.expires.localeCompare(b.expires));
 function snapshot(){return {url:location.pathname+location.search,scroll:window.scrollY,query,filter}}
 function applyLocation(){setPath(location.pathname);const ui=history.state?.epUI;setQuery(ui?.query||'');setFilter(ui?.filter||'all');setCategory(new URLSearchParams(location.search||history.state?.epOrigin?.url?.split('?')[1]).get('category')||'all');restoreScroll.current=ui?.scroll||0;setError('');setNotice(pendingNotice.current);pendingNotice.current=''}
 function go(to:string,replace=false,preservePosition=false){
  if(!replace&&to===location.pathname+location.search)return;
  const ui=snapshot();history.replaceState({...history.state,epUI:ui},'');
  const child=/^\/documents\/[^/]+(?:\/edit)?$/.test(to.split('?')[0]);
  const childOrigin=child?(origin||{...ui,url:ui.url.startsWith('/documents/')?'/documents':ui.url}):undefined;
  const nextUI={...ui,scroll:preservePosition?ui.scroll:0};
  const state={epUI:nextUI,epOrigin:childOrigin,epParent:replace?history.state?.epParent:ui.url};
  if(replace)history.replaceState(state,'',to);else history.pushState(state,'',to);
  setPath(location.pathname);setCategory(new URLSearchParams(location.search||(childOrigin?.url.split('?')[1]||'')).get('category')||'all');setNotice('');setError('');restoreScroll.current=preservePosition?ui.scroll:child&&!to.includes('/edit')&&!to.startsWith('/documents/new')?null:0;
 }
 function back(){if(history.state?.epParent)history.back();else go('/documents',true)}
 useLayoutEffect(()=>{if(restoreScroll.current!==null){window.scrollTo(0,restoreScroll.current);restoreScroll.current=null}},[path,loading,category]);
 useEffect(()=>{history.replaceState({...history.state,epUI:{...history.state?.epUI,query,filter}},'')},[query,filter]);
 useEffect(()=>{const previous=history.scrollRestoration;history.scrollRestoration='manual';const record=()=>{if(!document.body.style.overflow)history.replaceState({...history.state,epUI:{...history.state?.epUI,scroll:window.scrollY}},'')};window.addEventListener('scroll',record,{passive:true});return()=>{history.scrollRestoration=previous;window.removeEventListener('scroll',record)}},[]);
 function chooseTheme(value:string){setTheme(value);try{localStorage.setItem('expiry-pocket-theme',value)}catch{}}
 async function load(){setLoading(true);setError('');try{const wallets=await listWalletProfiles();const documents=await listDocuments();setProfiles(wallets);setDocs(documents);let remembered='';try{remembered=localStorage.getItem('ep-wallet-'+wallets[0]?.user_id)||''}catch{}const linked=documents.find(d=>location.pathname===`/documents/${d.id}`||location.pathname===`/documents/${d.id}/edit`);const id=linked?.profileId||(wallets.some(p=>p.id===profileId)?profileId:wallets.some(p=>p.id===remembered)?remembered:wallets.find(p=>p.is_default)?.id)||wallets[0]?.id||'';setProfileId(id)}catch{setError('Nu am putut încărca portofelele. Verifică conexiunea și actualizarea bazei de date, apoi încearcă din nou.')}finally{setLoading(false)}}
 function switchProfile(id:string){const profile=profiles.find(p=>p.id===id);setProfileId(id);if(profile)try{localStorage.setItem('ep-wallet-'+profile.user_id,id)}catch{}setQuery('');setFilter('all');setCategory('all');setAlertState({filter:'all',seen:[]});if(accountMenu.current)accountMenu.current.open=false;history.replaceState({},'', '/documents');setPath('/documents');setNotice('');setError('');window.scrollTo(0,0)}
 useEffect(()=>{const linked=allDocs.find(d=>location.pathname===`/documents/${d.id}`||location.pathname===`/documents/${d.id}/edit`);if(linked?.profileId&&linked.profileId!==profileId)setProfileId(linked.profileId)},[path,allDocs]);
 useEffect(()=>{void load();void hasReminderSchema().then(setMultiple).catch(()=>{});const pop=()=>applyLocation();window.addEventListener('popstate',pop);if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});return()=>window.removeEventListener('popstate',pop)},[]);
 useEffect(()=>{if(!selected)heading.current?.focus({preventScroll:true})},[path]);
 function openCategory(value:string){setFilter('all');go('/documents'+(value==='all'?'':'?category='+value))}
 async function remove(doc:Doc){if(!confirm(`Ștergi „${doc.name}”? Această acțiune nu poate fi anulată.`))return;setSaving(true);try{await deleteDocument(doc);setDocs(prev=>prev.filter(d=>d.id!==doc.id));pendingNotice.current='Document șters.';back()}catch{setError('Nu am putut șterge actul. Încearcă din nou.')}finally{setSaving(false)}}
 const nav=(to:string,label:string,Icon:typeof Home,active:boolean)=><a href={to} aria-label={label} title={label} aria-current={active?'page':undefined} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();go(to)}}}><Icon size={21}/><span className="ep-desktop-nav-label">{label}</span></a>;
 return <div className="pocket-app ep-workspace" data-theme={theme}><Ambient/><div className="ep-app-shell">
  <header className="ep-account-header" inert={selected?true:undefined}><a href="/" className="ep-desktop-brand" aria-label="Duevo — acasă"><span><BrandMark size={32}/></span><strong className="duevo-wordmark">Duevo</strong></a><nav className="ep-bottom-nav" aria-label="Meniul principal">{nav('/documents','Actele mele',Folder,list||!!editing)}{nav('/overview','Dashboard',Home,home)}<span className="ep-nav-alert">{nav('/reminders','Reamintiri',Bell,reminders)}{urgent.length>0&&<span>{urgent.length}</span>}</span></nav><details ref={accountMenu} className="ep-account" onToggle={positionAccountMenu}><summary aria-label="Meniul contului"><span className="ep-avatar">{avatarUrl?.startsWith('https://')&&!avatarFailed?<img src={avatarUrl} alt="" onError={()=>setAvatarFailed(true)} referrerPolicy="no-referrer"/>:initials}</span><span className="ep-greeting"><small>Profil activ</small><strong>{activeProfile?.name||name}</strong></span></summary><div className="ep-account-popover"><ProfilePicker profiles={profiles} activeId={profileId} onSwitch={switchProfile} onProfiles={profile=>{setProfiles(prev=>prev.some(p=>p.id===profile.id)?prev.map(p=>p.id===profile.id?profile:p):[...prev,profile]);try{localStorage.setItem('ep-wallet-'+profile.user_id,profile.id)}catch{}}}/><span>{displayName==='there'?'Contul meu':displayName}</span><button onClick={onSignOut}><LogOut size={16}/>Ieși din cont</button></div></details>
  <div className="ep-header-actions"><button className="ep-primary ep-global-add" aria-label="Adaugă act" onClick={()=>go('/documents/new'+(category!=='all'?'?category='+category:''))}><Plus size={18}/><span>Adaugă act</span></button><ThemeSwitch theme={theme} onToggle={()=>chooseTheme(theme==='carbon'?'obsidian':'carbon')}/><button className="ep-icon-button ep-bell" aria-label="Reamintiri" onClick={()=>go('/reminders')}><Bell size={18}/>{urgent.length>0&&<i/>}</button></div></header>
  <main className="ep-main" inert={selected?true:undefined}><div className="ep-active-wallet"><span>Portofel: <strong>{activeProfile?.name||'…'}</strong></span><button onClick={()=>{if(accountMenu.current){accountMenu.current.open=true;accountMenu.current.querySelector('summary')?.focus()}}}>Schimbă profilul</button></div>{notice&&<div className="ep-toast" role="status"><Check size={16}/>{notice}<button aria-label="Închide" onClick={()=>setNotice('')}><X size={16}/></button></div>}{error&&<div className="ep-error" role="alert">{error}<button onClick={load}>Încearcă din nou</button></div>}
  {home?<Overview docs={docs} loading={loading} failed={!!error} open={go}/>:adding||editing?<DocumentEditor key={editing?.id||'new-'+profileId} doc={editing} multiple={multiple} initialCategory={category} onCancel={back} onSave={async form=>{const updated=editing?await updateDocument(editing,form,multiple):await createDocument(form,multiple,profileId==='legacy'?undefined:profileId);setDocs(prev=>editing?prev.map(d=>d.id===updated.id?updated:d):[...prev,updated]);if(editing&&history.state?.epParent===`/documents/${updated.id}`){pendingNotice.current='Modificările au fost salvate.';back()}else{go(`/documents/${updated.id}`,true);setNotice(editing?'Modificările au fost salvate.':'Actul a fost salvat.')}}}/>:reminders?<AlertCenter docs={docs} multiple={multiple} open={go} state={alertState} onStateChange={setAlertState} onChanged={updated=>setDocs(prev=>prev.map(d=>d.id===updated.id?updated:d))}/>:list?<div className="ep-screen ep-documents">
   <div className="ep-screen-heading"><div><h1 ref={heading} tabIndex={-1}>Actele mele</h1><p>{docs.length} {docs.length===1?'act salvat':'acte salvate'} · termenele tale, într-un singur loc</p></div><button className="ep-primary" onClick={()=>go('/documents/new'+(category!=='all'?'?category='+category:''))}><Plus size={15}/>Adaugă act</button></div>
   <CalendarExportCard docs={docs} loading={loading}/>
   {!loading&&<NextExpiry docs={docs} open={go}/>}
   <section className="ep-list-folders"><div className="ep-section-heading"><h2>Dosarele tale</h2>{category!=='all'&&<button onClick={()=>go('/documents',false,true)}>Toate dosarele</button>}</div><Folders docs={docs} open={value=>go('/documents'+(value==='all'?'':'?category='+value),false,true)} selectedCategory={category}/></section>
   <section className="ep-list-section"><div className="ep-section-heading"><h2>{category==='Vehicles'?'Acte auto':category==='Personal'?'Acte personale':'Toate actele'}</h2>{(filter!=='all'||category!=='all')&&<button className="ep-muted" onClick={()=>{setFilter('all');setQuery('');go('/documents')}}>Resetează</button>}</div><div className="ep-filter-tabs" aria-label="Filtrează actele">{[['all','Toate'],['expiring','Expiră curând'],['valid','Valide'],['expired','Expirate']].map(([key,label])=><button key={key} className="ep-pill" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}<span>{key==='all'?docs.length:docs.filter(d=>metrics(d).status===key).length}</span></button>)}</div><div className="ep-document-list">{loading?<div className="ep-card ep-empty" role="status">Se încarcă actele…</div>:visible.map(doc=><DocumentCard key={doc.id} doc={doc} open={()=>go(`/documents/${doc.id}`)}/>)}{!loading&&!visible.length&&<div className="ep-card ep-empty"><Folder size={24}/><p>Niciun document în acest filtru</p><button className="ep-secondary" onClick={()=>{setFilter('all');setQuery('');go('/documents')}}>Arată toate actele</button>{!docs.length&&<button className="ep-primary" onClick={()=>go('/documents/new'+(category!=='all'?'?category='+category:''))}>Adaugă primul act</button>}</div>}</div></section>
  </div>:loading?<div className="ep-empty" role="status">Se încarcă…</div>:<div className="ep-empty"><h1>Pagina nu a fost găsită</h1><button className="ep-secondary" onClick={()=>go('/documents')}><ChevronLeft size={16}/>Înapoi la acte</button></div>}
  </main>{selected&&<DocumentPanel onClose={back}>{notice&&<div className="ep-toast" role="status">{notice}</div>}{error&&<div className="ep-error" role="alert">{error}</div>}<DocumentDetail key={selected.id} doc={selected} multiple={multiple} onBack={back} onEdit={()=>go(`/documents/${selected.id}/edit`)} onChanged={updated=>{setDocs(prev=>prev.map(d=>d.id===updated.id?updated:d));setNotice('Actul a fost reînnoit.')}}><button className="ep-danger ep-wide" disabled={saving} onClick={()=>remove(selected)}><Trash2 size={16}/>Șterge documentul</button></DocumentDetail></DocumentPanel>}</div>

 </div>;
}







