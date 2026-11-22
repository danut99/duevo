import {tr,locale} from './i18n.ts';
import {supabase} from './supabase';
import {listVault} from './document-vault';
import type {DocumentFile} from './document-vault';
export async function listPhotos(profileId:string,documentIds:string[]):Promise<DocumentFile[]>{
 if(!supabase||profileId==='legacy')return [];
 const vault=await listVault(profileId);
 const requests:Promise<DocumentFile[]>[]=[];
 for(const [column,ids] of [['document_id',documentIds],['vault_document_id',vault.map(v=>v.id)]] as const){
  for(let i=0;i<ids.length;i+=100){
   const batch=ids.slice(i,i+100);
   requests.push(Promise.resolve(supabase.from('document_files').select('*').in(column,batch).order('created_at',{ascending:false})).then(({data,error})=>{if(error)throw Error(tr("Fișierele nu au putut fi încărcate. Încearcă din nou."));return (data||[]) as DocumentFile[]}));
  }
 }
 const rows=(await Promise.all(requests)).flat();
 return [...new Map(rows.map(file=>[file.id,file])).values()];
}
