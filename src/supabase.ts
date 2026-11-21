import {createClient} from '@supabase/supabase-js';
import {dateOnly,normalizeReminders} from './reminder-utils';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function getAuthSettings():Promise<{external?:{google?:boolean;email?:boolean};mailer_autoconfirm?:boolean}>{if(!url||!key)throw Error('Conectarea nu este disponibilă momentan.');const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Nu am putut verifica setările contului. Încearcă din nou.');return response.json()}
export type Doc={id:string;profileId?:string;vehicleId?:string;documentKind?:string;entryType?:'document'|'other';eventTime?:string;name:string;category:string;reference:string;expires:string;issuedOn?:string;days:number;reminderDays?:number[];version?:number;notes:string;fileName:string|null;fileKey:string|null};
export type Revision={id:string;expires:string;renewed_at:string;file_name:string|null;file_key:string|null};
const map=(d:any):Doc=>({...d,profileId:d.profile_id,vehicleId:d.vehicle_id||undefined,documentKind:d.document_kind||undefined,entryType:d.entry_type||'document',eventTime:d.event_time?.slice(0,5)||undefined,issuedOn:d.issued_on||undefined,reminderDays:normalizeReminders(d.reminder_days,d.days),days:Math.max(...normalizeReminders(d.reminder_days,d.days)),fileName:d.file_name,fileKey:d.file_key});
function client(){if(!supabase)throw Error('Conexiunea la baza de date nu este configurată.');return supabase}
export async function listDocuments(){const {data,error}=await client().from('documents').select('*').order('expires');if(error)throw error;return (data||[]).map(map)}
export async function hasReminderSchema(){const {error}=await client().from('documents').select('reminder_days,version').limit(0);return !error}
let issuedDateSupport:Promise<boolean>|undefined;
async function hasIssuedDate(){return issuedDateSupport??=Promise.resolve(client().from('documents').select('issued_on').limit(0)).then(({error})=>!error)}
async function personalTermValues(form:FormData){
 const entryType=String(form.get('entry_type')||'document'),eventTime=String(form.get('event_time')||'');
 if(!['document','other'].includes(entryType)||eventTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(eventTime))throw Error('Verifică tipul și ora termenului.');
 if(entryType==='other'&&!['Personal','Vehicles'].includes(String(form.get('category'))))throw Error('Termenele de tip Altele aparțin categoriei Personal.');
 const {error}=await client().from('documents').select('entry_type,event_time').limit(0);
 if(error){if(entryType==='other')throw Error('Termenele personale nu sunt disponibile momentan. Încearcă din nou mai târziu.');return {}}
 const kind=String(form.get('document_kind')||'');
 if(kind&&!['REV','KIT','PARK','AUTO_OTHER'].includes(kind))throw Error('Tip auto necunoscut.');
 const {error:kindError}=await client().from('documents').select('document_kind').limit(0);
 if(kindError&&(kind||entryType==='other'&&form.get('category')==='Vehicles'))throw Error('Actualizează baza de date pentru noile termene auto (migrarea 202611210006_auto_terms.sql).');
 return {entry_type:entryType,event_time:entryType==='other'?eventTime||null:null,...(!kindError&&form.has('document_kind')?{document_kind:kind||null}:{})};
}
function documentValues(form:FormData,multiple:boolean,withIssuedDate=false){
 const name=String(form.get('name')||'').trim(),category=String(form.get('category')||''),expires=String(form.get('expires')||''),notes=String(form.get('notes')||'').trim(),reference=String(form.get('reference')||'').trim();
 const leads=normalizeReminders(form.getAll('reminder_days').length?form.getAll('reminder_days'):[Number(form.get('days')||30)]);
 if(!name||name.length>120||!dateOnly(expires)||!['Vehicles','Personal','Home','Health','Other'].includes(category)||notes.length>2000||reference.length>120)throw Error('Verifică numele, categoria și data expirării.');
 if(!multiple&&(leads.length>1||leads[0]===0))throw Error('Alertele multiple necesită actualizarea bazei de date.');
 const issued=String(form.get('issued_on')||'');if(issued&&!dateOnly(issued))throw Error('Verifică data emiterii.');
 return {name,category,expires,...(form.has('vehicle_id')?{vehicle_id:category==='Vehicles'?String(form.get('vehicle_id')||'')||null:null}:{}),days:Math.max(1,...leads),notes,reference,...(multiple?{reminder_days:leads}:{}),...(withIssuedDate?{issued_on:form.get('entry_type')==='other'?null:issued||null}:{})};
}
export async function createDocument(form:FormData,multiple=false,profileId?:string){
 const db=client(),{data:{user}}=await db.auth.getUser();if(!user)throw Error('Intră din nou în cont.');const values={...documentValues(form,multiple,await hasIssuedDate()),...await personalTermValues(form)},id=crypto.randomUUID(),file=form.get('file');let file_key:string|null=null,file_name:string|null=null;
 if(file instanceof File&&file.size){if(file.size>5*1024*1024||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Alege un PDF, JPG, PNG sau WebP de maximum 5 MB.');file_key=user.id+'/'+id;file_name=file.name;const {error}=await db.storage.from('documents').upload(file_key,file,{contentType:file.type,upsert:false});if(error)throw error;}
 const {data,error}=await db.from('documents').insert({id,user_id:user.id,...(profileId?{profile_id:profileId}:{}),...values,file_key,file_name}).select().single();if(error){if(file_key)await db.storage.from('documents').remove([file_key]);throw error}return map(data);
}
export async function updateDocument(doc:Doc,form:FormData,multiple=false){let query=client().from('documents').update({...documentValues(form,multiple,await hasIssuedDate()),...await personalTermValues(form)}).eq('id',doc.id);query=typeof doc.version==='number'?query.eq('version',doc.version):query.eq('expires',doc.expires);const {data,error}=await query.select().maybeSingle();if(error)throw error;if(!data)throw Error('Actul a fost modificat în altă fereastră. Reîncarcă pagina înainte de a salva.');return map(data)}
export async function renewDocument(doc:Doc,expires:string){if(!dateOnly(expires)||expires<=doc.expires)throw Error('Alege o dată nouă, după data expirării curente.');const {data,error}=await client().rpc('renew_document',{document_id:doc.id,new_expiry:expires,expected_version:doc.version});if(error)throw error;return map(data)}
export async function listRevisions(id:string){const {data,error}=await client().from('document_revisions').select('id,expires,renewed_at,file_name,file_key').eq('document_id',id).order('renewed_at',{ascending:false});if(error)throw error;return (data||[]) as Revision[]}
export async function deleteDocument(doc:Doc){const db=client();if(doc.fileKey){const {error}=await db.storage.from('documents').remove([doc.fileKey]);if(error)throw error}const {error}=await db.from('documents').delete().eq('id',doc.id);if(error)throw error}
export async function downloadDocument(doc:Doc){if(!doc.fileKey)return;const {data,error}=await client().storage.from('documents').download(doc.fileKey);if(error)throw error;const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=doc.fileName||'document';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}


export type WalletProfile={id:string;user_id:string;name:string;is_default:boolean};
export async function listWalletProfiles(){const db=client();const {error:ensureError}=await db.rpc('ensure_wallet_profile');if(ensureError){if(['PGRST202','42883','42P01','PGRST205'].includes(ensureError.code)){const {data:{user}}=await db.auth.getUser();if(!user)throw ensureError;return [{id:'legacy',user_id:user.id,name:'Eu',is_default:true}] as WalletProfile[]}throw ensureError}const {data,error}=await db.from('wallet_profiles').select('id,user_id,name,is_default').order('created_at');if(error)throw error;return (data||[]) as WalletProfile[]}
export async function createWalletProfile(name:string){const db=client();const {data:{user}}=await db.auth.getUser();const cleaned=name.trim();if(!user||!cleaned||cleaned.length>40)throw Error('Scrie un nume între 1 și 40 de caractere.');const {data,error}=await db.from('wallet_profiles').insert({user_id:user.id,name:cleaned}).select('id,user_id,name,is_default').single();if(error)throw Error('Profilul nu a putut fi creat. Încearcă din nou.');return data as WalletProfile}
export async function renameWalletProfile(id:string,name:string){const cleaned=name.trim();if(!cleaned||cleaned.length>40)throw Error('Scrie un nume între 1 și 40 de caractere.');const {data,error}=await client().from('wallet_profiles').update({name:cleaned}).eq('id',id).select('id,user_id,name,is_default').single();if(error)throw Error('Numele nu a putut fi salvat.');return data as WalletProfile}


export type Vehicle={id:string;profile_id:string;user_id:string;plate:string;name:string};
export async function listVehicles():Promise<Vehicle[]|null>{const {data,error}=await client().from('vehicles').select('id,profile_id,user_id,plate,name').order('created_at');if(error){if(['42P01','PGRST205'].includes(error.code))return null;throw error}return data||[]}
export async function createVehicle(profileId:string,plate:string,name:string){const db=client();const {data:{user}}=await db.auth.getUser();const cleaned=plate.trim().replace(/\s+/g,' ').toUpperCase();if(!user||!cleaned||cleaned.length>30||name.trim().length>60)throw Error('Verific? num?rul auto ?i numele ma?inii.');const {data,error}=await db.from('vehicles').insert({user_id:user.id,profile_id:profileId,plate:cleaned,name:name.trim()}).select('id,profile_id,user_id,plate,name').single();if(error)throw Error(error.code==='23505'?'Ma?ina exist? deja ?n acest portofel.':'Nu am putut salva ma?ina. ?ncearc? din nou.');return data as Vehicle}
