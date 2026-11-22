import {tr,locale} from './i18n.ts';
import {useEffect,useState} from 'react';
import {FileText,ImagePlus,X} from 'lucide-react';
function PendingFile({file,onRemove}:{file:File;onRemove:()=>void}){
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file.type.startsWith('image/'))return;const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value)},[file]);
 return <li>{url?<img src={url} alt={file.name}/>:<FileText size={24}/>}<span><strong>{file.name}</strong><small>{(file.size/1024/1024).toLocaleString(locale(),{maximumFractionDigits:1})} {tr("MB")}</small></span><button type="button" className="ep-icon-button" aria-label={tr("Elimină ")+file.name} onClick={onRemove}><X size={17}/></button></li>;
}
export default function PendingDocumentFiles({files,busy,onSelect,onRemove}:{files:File[];busy:boolean;onSelect:(files:File[])=>void;onRemove:(index:number)=>void}){
 return <div className="ep-pending-files"><h3>{tr("Imagini și PDF-uri")}</h3><p>{tr("Selectează fișierele înainte de salvare. PDF, JPG, PNG sau WebP, maximum 5 MB fiecare.")}</p><label className="ep-secondary ep-file-upload"><ImagePlus size={18}/>{tr("Alege fișiere")}<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" aria-label={tr("Alege fișiere pentru document")} disabled={busy} onChange={e=>{onSelect(Array.from(e.target.files||[]));e.target.value=''}}/></label>{!!files.length&&<><ul>{files.map((file,index)=><PendingFile key={file.name+'-'+file.lastModified+'-'+index} file={file} onRemove={()=>onRemove(index)}/>)}</ul><small>{files.length} {files.length===1?tr("fișier pregătit"):tr("fișiere pregătite")} {tr("pentru salvare")}</small></>}</div>;
}
