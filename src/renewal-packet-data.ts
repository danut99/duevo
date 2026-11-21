import {supabase,listDocuments,listVehicles,listWalletProfiles} from './supabase';
import type {Doc} from './supabase';
import {listFiles,listVault} from './document-vault';
import type {DocumentFile,FileOwner} from './document-vault';
import {packetConfigs} from './renewal-packet-config';
import {resolveGuide} from './renewal-guides';
import {preselectPacketFiles} from './renewal-preselection';
export type PacketDraft={values:Record<string,string>;assignments:Record<string,string[]>;originals:string[];expiry?:string};
export type PacketCandidate={file:DocumentFile;title:string;category:string;vehicleId?:string;documentId?:string;kind?:string};
export const emptyDraft=():PacketDraft=>({values:{},assignments:{},originals:[]});
function db(){if(!supabase)throw Error('Conexiunea nu este disponibilă.');return supabase}
export function parseDraft(value:unknown):PacketDraft{
 const input=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const values=Object.fromEntries(Object.entries(input.values&&typeof input.values==='object'?input.values:{}).filter(([k,v])=>k.length<80&&typeof v==='string'&&v.length<=2000)) as Record<string,string>;
 const assignments=Object.fromEntries(Object.entries(input.assignments&&typeof input.assignments==='object'?input.assignments:{}).filter(([k,v])=>k.length<80&&Array.isArray(v)).map(([k,v])=>[k,[...new Set((v as unknown[]).filter((s):s is string=>typeof s==='string'&&s.length<200))].slice(0,30)]));
 return {values,assignments,originals:Array.isArray(input.originals)?input.originals.filter((s):s is string=>typeof s==='string'&&s.length<80).slice(0,30):[],...(typeof input.expiry==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(input.expiry)?{expiry:input.expiry}:{})};
}
export async function loadPacket(doc:Doc,code:string){
 const [documents,vehicles,profiles,{data:saved,error}]=await Promise.all([listDocuments(),listVehicles(),listWalletProfiles(),db().from('renewal_packets').select('draft').eq('document_id',doc.id).eq('guide_code',code).maybeSingle()]);
 if(error)throw Error('Pregătirea dosarului nu poate fi încărcată. Verifică conexiunea sau actualizarea serviciului.');
 const profileId=doc.profileId;if(!profileId)throw Error('Asociază actul unui profil înainte de pregătirea dosarului.');
 const vault=await listVault(profileId),candidates:PacketCandidate[]=[];
 const matching=(category:string,vehicleId?:string|null)=>category==='Personal'||doc.category==='Vehicles'&&category==='Vehicles'&&(doc.vehicleId?vehicleId===doc.vehicleId:!vehicleId);
 // Never suggest another car's files or another profile's personal documents.
 const docs=documents.filter(d=>d.profileId===profileId&&d.entryType!=='other'&&matching(d.category,d.vehicleId));
 for(const d of docs){const files=await listFiles({documentId:d.id},d);for(const file of files)candidates.push({file:{...file,id:file.legacy?'legacy-'+d.id:file.id},title:d.name,category:d.category,vehicleId:d.vehicleId,documentId:d.id,kind:d.documentKind||resolveGuide(d.name,d.category)||undefined})}
 for(const d of vault.filter(v=>v.category==='Photos'||matching(v.category,v.vehicle_id))){const files=await listFiles({vaultId:d.id});for(const file of files)candidates.push({file,title:d.name,category:d.category,vehicleId:d.vehicle_id||undefined,kind:d.document_kind||undefined})}
 const unique=[...new Map(candidates.map(c=>[c.file.storage_key,c])).values()];
 const parsed=parseDraft(saved?.draft);
 const owners:Record<string,FileOwner>={};
 for(const req of packetConfigs[code].requirements){
  const kind=requirementKind(req.id,code);
  const matches=docs.filter(d=>d.category===req.category&&(d.documentKind||resolveGuide(d.name,d.category))===kind);
  if(matches.length===1){owners[req.id]={documentId:matches[0].id};continue}
  const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const existing=vault.find(v=>v.category===req.category&&(req.category!=='Vehicles'||(v.vehicle_id||undefined)===doc.vehicleId)&&(kind?v.document_kind===kind||normalized(v.name)===normalized(req.label):normalized(v.name)===normalized(req.label+' - '+doc.name)));
  if(existing)owners[req.id]={vaultId:existing.id};
 }
 const current=parsed.expiry&&parsed.expiry!==doc.expires?emptyDraft():parsed;
 return {draft:preselectPacketFiles(current,packetConfigs[code].requirements,unique,{documentId:doc.id,vehicleId:doc.vehicleId,code}),candidates:unique,owners,vehicle:vehicles?.find(v=>v.id===doc.vehicleId),profile:profiles.find(p=>p.id===profileId)};
}
export function requirementKind(id:string,code:string){return ({registration:'TALON',civ:'CIV',identity:'CI',policy:code==='CAS'?'CAS':'RCA',licence:'PER',passport:'PAS',service:'REV',parking:'PARK',address:'ADDRESS',civil:'CIVIL'} as Record<string,string>)[id]}
export async function savePacket(doc:Doc,code:string,draft:PacketDraft){
 const client=db(),{data:{user}}=await client.auth.getUser();if(!user)throw Error('Intră din nou în cont.');
 const {error}=await client.from('renewal_packets').upsert({document_id:doc.id,user_id:user.id,guide_code:code,draft:parseDraft({...draft,expiry:doc.expires}),updated_at:new Date().toISOString()},{onConflict:'document_id,guide_code'});
 if(error)throw Error('Pregătirea nu a putut fi salvată. Încearcă din nou.');
}
