import {tr,locale} from './i18n.ts';
import {useEffect,useState} from 'react';
import {FileText,Image as ImageIcon} from 'lucide-react';
import {readFile} from './document-vault';
import type {DocumentFile} from './document-vault';

export default function FileThumbnail({file,onOpen}:{file:DocumentFile;onOpen:(file:DocumentFile,blob?:Blob)=>void}){
 const [preview,setPreview]=useState<{url:string;blob:Blob}|null>(null),[failed,setFailed]=useState(false);
 const image=file.mime_type?.startsWith('image/')||!file.mime_type&&/\.(jpe?g|png|webp)$/i.test(file.name);
 useEffect(()=>{let active=true,url='';setPreview(null);setFailed(false);
  if(image)readFile(file).then(blob=>{if(!active)return;if(!['image/jpeg','image/png','image/webp'].includes(blob.type)){setFailed(true);return}url=URL.createObjectURL(blob);setPreview({url,blob})}).catch(()=>{if(active)setFailed(true)});
  return()=>{active=false;if(url)URL.revokeObjectURL(url)};
 },[file.storage_key,image]);
 return <button type="button" className="ep-file-thumbnail" title={file.name} aria-label={tr("Vezi ")+file.name} onClick={()=>onOpen(file,preview?.blob)}>{preview&&!failed?<img src={preview.url} alt={tr("Previzualizare ")+file.name} onError={()=>setFailed(true)}/>:<span className="ep-file-thumbnail-placeholder">{image?<ImageIcon size={23}/>:<FileText size={23}/>}<small>{image?(failed?tr("Vezi"):tr("Poză")):"PDF"}</small></span>}</button>;
}
