import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Clapperboard,Copy,Download,ExternalLink,LoaderCircle,RotateCcw,Share2} from 'lucide-react';
import BrandMark from './BrandMark';
import ThemeSwitch from './ThemeSwitch';
import {LanguageButton,useLocalePreference} from './LanguagePicker';
import {tr} from './i18n.ts';
import campaign from './creator-campaign.json';
import './pocket.css';
import './creator.css';

type Clip=typeof campaign[number];
type Draft={description:string;hashtags:string;posted:boolean};
type Drafts=Record<string,Draft>;
const media=(clip:Clip,suffix:string)=>`/creator/${clip.folder}/${clip.id}${suffix}`;
function readDrafts(key:string):Drafts{try{const value=JSON.parse(localStorage.getItem(key)||'{}');const clean:Drafts={};for(const clip of campaign){const draft=value?.[clip.id];if(draft&&typeof draft.description==='string'&&typeof draft.hashtags==='string')clean[clip.id]={description:draft.description.slice(0,1800),hashtags:draft.hashtags.slice(0,350),posted:draft.posted===true};}return clean;}catch{return {};}}

export default function Creator({userId}:{userId:string}){
 useLocalePreference();
 const storageKey=`duevo-creator-week-1-${userId}`;
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('expiry-pocket-theme')==='carbon'?'carbon':'obsidian'}catch{return 'obsidian'}});
 const [collection,setCollection]=useState('week');
 const [selected,setSelected]=useState(campaign[0].id),[drafts,setDrafts]=useState<Drafts>(()=>readDrafts(storageKey));
 const [prepared,setPrepared]=useState<{id:string;file:File}|null>(null),[loading,setLoading]=useState(false),[fileError,setFileError]=useState(false),[retry,setRetry]=useState(0);
 const [sharing,setSharing]=useState(false),[notice,setNotice]=useState(''),[copyError,setCopyError]=useState(false);
 const mounted=useRef(true),captionRef=useRef<HTMLTextAreaElement>(null);
 const clip=campaign.find(item=>item.id===selected)!;
 const visibleClips=campaign.filter(item=>item.collection===collection);
 const clipLabel=(item:Clip)=>tr(item.collection==='funny'?'Clip amuzant {0}':'Ziua {0}',item.day);
 const draft=drafts[clip.id]||{description:clip.description,hashtags:clip.hashtags,posted:false};
 const caption=[draft.description.trim(),draft.hashtags.trim()].filter(Boolean).join('\n\n');
 const file=prepared?.id===clip.id?prepared.file:null;
 let canShare=false;try{canShare=!!file&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]});}catch{}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;}},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(drafts));}catch{}},[drafts,storageKey]);
 useEffect(()=>{
  const controller=new AbortController();setPrepared(null);setLoading(true);setFileError(false);setNotice('');setCopyError(false);
  void fetch(media(clip,'.mp4'),{signal:controller.signal}).then(async response=>{if(!response.ok||!response.headers.get('content-type')?.includes('video/'))throw Error('Unavailable video');const blob=await response.blob();if(!blob.size)throw Error('Empty video');if(!controller.signal.aborted)setPrepared({id:clip.id,file:new File([blob],clip.id+'.mp4',{type:'video/mp4'})});}).catch(()=>{if(!controller.signal.aborted)setFileError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[clip.id,retry]);
 function update(values:Partial<Draft>){setDrafts(previous=>({...previous,[clip.id]:{...draft,...values}}));setNotice('');}
 function toggleTheme(){const next=theme==='carbon'?'obsidian':'carbon';setTheme(next);try{localStorage.setItem('expiry-pocket-theme',next)}catch{}}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopyError(false);setNotice(tr('Textul a fost copiat. Lipește-l în descrierea TikTok.'));}catch{setCopyError(true);setNotice('');captionRef.current?.focus();captionRef.current?.select();}}
 async function share(){
  if(!file||!canShare||sharing)return;
  setSharing(true);setNotice('');
  try{
   // File is prepared before this click: share must retain user activation.
   await navigator.share({files:[file],title:clip.title,text:caption});
   if(mounted.current)setNotice(tr('Continuă în aplicația aleasă pentru a publica.'));
  }catch(error){if(mounted.current)setNotice((error as Error).name==='AbortError'?tr('Partajare anulată.'):tr('Partajarea nu a reușit. Descarcă clipul și copiază textul pentru TikTok.'));}
  finally{if(mounted.current)setSharing(false);}
 }
 return <div className="pocket-app ep-welcome du-creator" data-theme={theme}><div className="du-creator-shell">
  <header className="du-creator-header"><a className="du-creator-brand" href="/documents"><BrandMark size={30}/><strong>Duevo</strong></a><div><LanguageButton/><ThemeSwitch theme={theme} onToggle={toggleTheme}/></div></header>
  <main>
   <a href="/documents" className="du-creator-back"><ArrowLeft size={16}/>{tr('Înapoi la actele mele')}</a>
   <section className="du-creator-intro"><span><Clapperboard size={23}/></span><div><h1>Creator</h1><p>{tr('Clipuri pentru Duevo. Alege clipul, copiază textul și partajează.')}</p></div><small>{Object.values(drafts).filter(item=>item.posted).length}/{campaign.length} {tr('postate')}</small></section>
   <div className="du-creator-collections" role="group" aria-label={tr('Colecții de clipuri')}>{[['week',tr('Plan de 7 zile')],['funny',tr('Cu haz')]].map(([value,label])=><button key={value} type="button" aria-pressed={collection===value} disabled={sharing} onClick={()=>{setCollection(value);setSelected(campaign.find(item=>item.collection===value)!.id);}}>{label}<span>{campaign.filter(item=>item.collection===value).length}</span></button>)}</div>
   <div className="du-creator-layout">
    <nav className="du-creator-days" aria-label={tr('Planul de postări')}>{visibleClips.map(item=><button type="button" key={item.id} aria-pressed={selected===item.id} disabled={sharing} onClick={()=>setSelected(item.id)}><img src={media(item,'-coperta.png')} alt="" loading="lazy"/><span><small>{clipLabel(item)} · {item.seconds}s</small><strong>{tr(item.title)}</strong></span>{drafts[item.id]?.posted&&<Check size={17} aria-label={tr('Postat')}/>}</button>)}</nav>
    <section className="du-creator-preview" aria-label={tr('Previzualizare clip')}><video key={clip.id+'-'+retry} controls playsInline preload="metadata" poster={media(clip,'-coperta.png')} src={media(clip,'.mp4')}/><p>1080 × 1920 · {clip.seconds}s · MP4</p><a className="ep-secondary" href={media(clip,'.mp4')} download={clip.id+'.mp4'}><Download size={16}/>{tr('Descarcă clipul')}</a></section>
    <section className="du-creator-editor" aria-labelledby="creator-caption-title"><div className="du-creator-editor-title"><div><small>{clipLabel(clip)}</small><h2 id="creator-caption-title">{tr(clip.title)}</h2></div><button className="du-creator-reset" type="button" title={tr('Resetează textul')} aria-label={tr('Resetează textul')} onClick={()=>update({description:clip.description,hashtags:clip.hashtags})}><RotateCcw size={17}/></button></div>
     <label htmlFor="creator-description">{tr('Textul postării')}</label><textarea ref={captionRef} id="creator-description" rows={5} maxLength={1800} value={draft.description} onChange={event=>update({description:event.target.value})}/>
     <label htmlFor="creator-hashtags">{tr('Hashtaguri')}</label><textarea id="creator-hashtags" rows={2} maxLength={350} value={draft.hashtags} onChange={event=>update({hashtags:event.target.value})}/>
     <div className="du-creator-copy"><button type="button" className="ep-secondary" onClick={()=>void copy(caption)}><Copy size={16}/>{tr('Copiază text + hashtaguri')}</button><button type="button" className="du-creator-text-button" onClick={()=>void copy(draft.hashtags)}>{tr('Doar hashtagurile')}</button></div>
     {copyError&&<p role="alert" className="du-creator-error">{tr('Copierea automată nu este disponibilă. Selectează și copiază manual textul și hashtagurile.')}</p>}
     <div className="du-creator-share">
      {loading?<p role="status"><LoaderCircle size={16} className="spin"/>{tr('Se pregătește clipul pentru partajare…')}</p>:fileError?<p role="alert">{tr('Clipul nu a putut fi pregătit.')} <button type="button" className="du-creator-text-button" onClick={()=>setRetry(value=>value+1)}>{tr('Încearcă din nou')}</button></p>:canShare?<><button type="button" className="ep-primary" disabled={sharing} onClick={()=>void share()}><Share2 size={18}/>{sharing?tr('Se deschide partajarea…'):tr('Partajează spre TikTok')}</button><p>{tr('Alege TikTok din meniul telefonului și confirmă postarea acolo. Dacă textul nu este preluat, lipește textul copiat.')}</p></>:<><a className="ep-primary" href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/>{tr('Deschide TikTok')}</a><p>{tr('Browserul acesta nu permite partajarea fișierului. Descarcă clipul, copiază textul și încarcă-l în TikTok.')}</p></>}
     </div>
     {notice&&<p className="du-creator-notice" role="status">{notice}</p>}
     <label className="du-creator-posted"><input type="checkbox" checked={draft.posted} onChange={event=>update({posted:event.target.checked})}/><span>{tr('Marchează ca postat')}</span></label><p className="du-creator-local">{tr('Textele editate și progresul se păstrează pe acest dispozitiv.')}</p>
    </section>
   </div>
  </main>
 </div></div>;
}
