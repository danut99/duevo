import {supabase,clearLegacyFile} from './supabase';
import type {Doc} from './supabase';

export type VaultDocument={id:string;profile_id:string;vehicle_id:string|null;category:string;name:string;document_kind?:string|null};
export type DocumentFile={id:string;document_id:string|null;vault_document_id:string|null;name:string;storage_key:string;mime_type:string|null;size_bytes:number|null;legacy?:boolean};
export type FileOwner={documentId:string;vaultId?:never}|{vaultId:string;documentId?:never};
const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
function db(){if(!supabase)throw Error('Conexiunea nu este disponibilă.');return supabase}
function selection(owner:FileOwner){return owner.documentId?['document_id',owner.documentId] as const:['vault_document_id',owner.vaultId!] as const}
export function validateFiles(files:File[]){
 if(!files.length)throw Error('Alege cel puțin un fișier.');
 if(files.length>10)throw Error('Poți încărca până la 10 fișiere odată.');
 for(const file of files)if(!allowed.includes(file.type)||!file.size||file.size>5*1024*1024||file.name.length>255)throw Error('Alege PDF, JPG, PNG sau WebP de maximum 5 MB fiecare.');
}
export async function listFiles(owner:FileOwner,legacy?:Doc):Promise<DocumentFile[]>{
 const [column,id]=selection(owner);const {data,error}=await db().from('document_files').select('*').eq(column,id).order('created_at');
 if(error)throw Error('Fișierele nu au putut fi încărcate. Verifică conexiunea sau actualizarea serviciului.');
 const files=(data||[]) as DocumentFile[];
 if(legacy?.fileKey&&!files.some(f=>f.storage_key===legacy.fileKey))files.unshift({id:'legacy',document_id:legacy.id,vault_document_id:null,name:legacy.fileName||'Document',storage_key:legacy.fileKey,mime_type:null,size_bytes:null,legacy:true});
 return files;
}
export async function uploadFiles(owner:FileOwner,files:File[]){
 validateFiles(files);const client=db(),{data:{user}}=await client.auth.getUser();if(!user)throw Error('Intră din nou în cont.');
 const [column,parentId]=selection(owner);
 // Each completed file is kept if a later upload fails; retry only the remaining files.
 let uploaded=0;const fail=(message:string)=>Object.assign(new Error(message),{completed:uploaded});
 for(const file of files){
  const id=crypto.randomUUID(),key=`${user.id}/files/${id}`;
  const {error:uploadError}=await client.storage.from('documents').upload(key,file,{contentType:file.type,upsert:false});
  if(uploadError)throw fail(`Nu am putut încărca „${file.name}”. ${uploaded?`${uploaded} fișiere au fost salvate deja. `:''}Încearcă din nou pentru fișierele rămase.`);
  const {error}=await client.from('document_files').insert({id,user_id:user.id,[column]:parentId,name:file.name,storage_key:key,mime_type:file.type,size_bytes:file.size});
  if(error){await client.storage.from('documents').remove([key]);throw fail(`Nu am putut salva „${file.name}”. ${uploaded?`${uploaded} fișiere au fost salvate deja. `:''}Verifică conexiunea sau actualizarea serviciului.`)}
  uploaded++;
 }
}
export async function readFile(file:DocumentFile){
 const {data,error}=await db().storage.from('documents').download(file.storage_key);if(error)throw Error('Fișierul nu a putut fi deschis. Încearcă din nou.');return data;
}
export async function removeFile(file:DocumentFile){
 const client=db();
 const {error:storageError}=await client.storage.from('documents').remove([file.storage_key]);if(storageError)throw Error('Fișierul nu a putut fi șters. Încearcă din nou.');
 if(!file.legacy){const {error}=await client.from('document_files').delete().eq('id',file.id);if(error)throw Error('Nu am putut finaliza ștergerea. Încearcă din nou.')}
 if(file.document_id)return clearLegacyFile(file.document_id,file.storage_key);
}
export async function listVault(profileId:string){
 const {data,error}=await db().from('vault_documents').select('*').eq('profile_id',profileId).order('created_at',{ascending:false});
 if(error)throw Error('Documentele păstrate nu au putut fi încărcate. Verifică conexiunea sau actualizarea serviciului.');return (data||[]) as VaultDocument[];
}
export async function createVault(profileId:string,name:string,category:string,vehicleId:string,documentKind?:string){
 const cleaned=name.trim();if(!cleaned||cleaned.length>120)throw Error('Scrie un nume pentru document (maximum 120 de caractere).');
 const client=db(),{data:{user}}=await client.auth.getUser();if(!user)throw Error('Intră din nou în cont.');
 const {data,error}=await client.from('vault_documents').insert({user_id:user.id,profile_id:profileId,name:cleaned,category,vehicle_id:category==='Vehicles'?vehicleId||null:null,...(documentKind?{document_kind:documentKind}:{})}).select().single();
 if(error)throw Error('Documentul nu a putut fi salvat. Verifică conexiunea sau actualizarea serviciului.');return data as VaultDocument;
}
export async function deleteVault(entry:VaultDocument){
 const files=await listFiles({vaultId:entry.id});for(const file of files)await removeFile(file);
 const {error}=await db().from('vault_documents').delete().eq('id',entry.id);if(error)throw Error('Documentul nu a putut fi șters. Încearcă din nou.');
}
export async function linkFile(file:DocumentFile,owner:FileOwner){
 const {data,error}=await db().from('document_files').update({document_id:owner.documentId||null,vault_document_id:owner.vaultId||null}).eq('id',file.id).select().single();
 if(error||!data)throw Error('Imaginea nu a putut fi legată de act. Încearcă din nou.');return data as DocumentFile;
}
