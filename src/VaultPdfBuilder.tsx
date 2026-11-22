import {useEffect,useState} from 'react';
import {ArrowUp,ArrowDown,Download,Share2,FileText,X} from 'lucide-react';
import {tr} from './i18n';
import type {Doc} from './supabase';
import {listFiles,readFile} from './document-vault';
import type {DocumentFile,VaultDocument} from './document-vault';
import FileThumbnail from './FileThumbnail';
import './vault-pdf.css';

type Item={file:DocumentFile;group:string};
export default function VaultPdfBuilder({entries,docs,onClose}:{entries:VaultDocument[];docs:Doc[];onClose:()=>void}){
 const [items,setItems]=useState<Item[]>([]),[chosen,setChosen]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState(tr('Documente selectate')),[result,setResult]=useState<File|null>(null),[progress,setProgress]=useState('');
 const key=(file:DocumentFile)=>file.storage_key;
 useEffect(()=>{let active=true;
  Promise.all([...entries.map(async entry=>(await listFiles({vaultId:entry.id})).map(file=>({file,group:entry.name}))),...docs.map(async doc=>(await listFiles({documentId:doc.id},doc)).map(file=>({file,group:doc.name})))]).then(groups=>{
   if(active)setItems([...new Map(groups.flat().filter(({file})=>['image/jpeg','image/png','image/webp'].includes(file.mime_type||'')||!file.mime_type&&/\.(jpe?g|png|webp)$/i.test(file.name)).map(item=>[key(item.file),item])).values()]);
  }).catch(()=>{if(active)setError(tr('Imaginile nu au putut fi încărcate. Închide și încearcă din nou.'))}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[entries,docs]);
 function toggle(id:string){setResult(null);setChosen(prev=>prev.includes(id)?prev.filter(value=>value!==id):[...prev,id])}
 function move(index:number,offset:number){setResult(null);setChosen(prev=>{const next=[...prev];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next})}
 async function generate(){setBusy(true);setError('');setResult(null);
  try{const {createImagesPdf,normalizePdfImage}=await import('./images-pdf');const images=[];
   for(let i=0;i<chosen.length;i++){const item=items.find(item=>key(item.file)===chosen[i])!;setProgress(`${i+1} / ${chosen.length}`);try{images.push(await normalizePdfImage(await readFile(item.file)))}catch{throw Error(tr('Nu am putut pregăti imaginea: ')+item.file.name)}}
   const bytes=await createImagesPdf(images,name.trim()||tr('Documente selectate'));
   const filename=(name.trim()||tr('Documente selectate')).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/\.pdf$/i,'');
   setResult(new File([new Uint8Array(bytes)],filename+'.pdf',{type:'application/pdf'}));
  }catch(e){setError((e as Error).message)}finally{setBusy(false);setProgress('')}
 }
 function download(){if(!result)return;const url=URL.createObjectURL(result),a=document.createElement('a');a.href=url;a.download=result.name;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),60000)}
 const canShare=!!result&&typeof navigator.canShare==='function'&&navigator.canShare({files:[result]});
 async function share(){if(!result)return;setError('');try{await navigator.share({files:[result],title:name})}catch(e){if((e as Error).name!=='AbortError')setError(tr('Distribuirea nu a reușit. Poți descărca PDF-ul.'))}}
 return <section className="ep-card ep-pdf-builder" aria-label={tr('Creează PDF')} aria-busy={busy}>
  <div className="ep-section-heading"><h2><FileText size={19}/>{tr('Creează PDF')}</h2><button type="button" className="ep-secondary" disabled={busy} onClick={onClose}><X size={16}/>{tr('Închide')}</button></div>
  <p>{tr('Selectează imaginile în ordinea dorită. Fiecare imagine va ocupa o pagină, fără tăiere. PDF-ul se generează doar la cerere și nu se salvează în cont.')}</p>
  {loading?<p role="status">{tr('Se încarcă imaginile…')}</p>:<>{!items.length&&!error&&<p>{tr('Nu ai imagini disponibile. Adaugă poze JPG, PNG sau WebP la documente.')}</p>}
  <fieldset disabled={busy}><label htmlFor="pdf-name">{tr('Nume PDF')}</label><input id="pdf-name" maxLength={100} value={name} onChange={e=>{setName(e.target.value);setResult(null)}}/>
  <div className="ep-pdf-images">{items.map(({file,group})=><div key={key(file)} className="ep-pdf-image"><FileThumbnail file={file} onOpen={()=>toggle(key(file))}/><label><input type="checkbox" checked={chosen.includes(key(file))} onChange={()=>toggle(key(file))}/><span><strong>{group}</strong><small>{file.name}</small></span></label></div>)}</div>
  {!!chosen.length&&<><h3>{tr('Ordinea paginilor')}</h3><ol className="ep-pdf-order">{chosen.map((id,index)=>{const item=items.find(item=>key(item.file)===id)!;return <li key={id}><span>{item.group} · {item.file.name}</span><button type="button" className="ep-icon-button" disabled={index===0} aria-label={tr('Mută în sus')+' '+item.file.name} onClick={()=>move(index,-1)}><ArrowUp size={17}/></button><button type="button" className="ep-icon-button" disabled={index===chosen.length-1} aria-label={tr('Mută în jos')+' '+item.file.name} onClick={()=>move(index,1)}><ArrowDown size={17}/></button><button type="button" className="ep-icon-button" aria-label={tr('Elimină')+' '+item.file.name} onClick={()=>toggle(id)}><X size={17}/></button></li>})}</ol></>}
  <button type="button" className="ep-primary" disabled={!chosen.length||busy} onClick={()=>void generate()}>{busy?tr('Se generează PDF…')+' '+progress:tr('Generează PDF')+` (${chosen.length})`}</button></fieldset></>}
  {result&&<div className="ep-pdf-result" role="status"><p>{result.name} · {(result.size/1024/1024).toFixed(1)} MB</p><button type="button" className="ep-primary" onClick={download}><Download size={16}/>{tr('Descarcă PDF')}</button>{canShare&&<button type="button" className="ep-secondary" onClick={()=>void share()}><Share2 size={16}/>{tr('Distribuie PDF')}</button>}</div>}
  {error&&<p className="ep-error" role="alert">{error}</p>}
 </section>;
}
