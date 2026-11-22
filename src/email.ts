import {supabase} from './supabase';
export type EmailConfig={configured:boolean;email:string|null;verified:boolean;preferences:{enabled:boolean;hour:number;timezone:string}|null;lastRun:string|null};
export async function getEmailConfig():Promise<EmailConfig>{
 if(!supabase)throw Error('Intră din nou în cont.');
 const {data,error}=await supabase.functions.invoke('email',{body:{action:'config'}});
 if(error||!data)throw Error('Emailurile nu sunt disponibile momentan.');return data;
}
export async function saveEmail(enabled:boolean,hour:number){
 if(!supabase)throw Error('Intră din nou în cont.');
 const {error}=await supabase.rpc('save_email_preferences',{want_enabled:enabled,preferred_hour:hour,preferred_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Bucharest'});
 if(error)throw Error('Nu am putut salva. Verifică dacă adresa contului este confirmată.');
}
export async function testEmail(){
 if(!supabase)throw Error('Intră din nou în cont.');
 const {data,error}=await supabase.functions.invoke('email',{body:{action:'test'}});
 if(error||!data?.accepted){let detail=data?.error;try{detail||=(await error?.context?.json())?.error}catch{}throw Error(detail||'Emailul nu a fost trimis. Așteaptă un minut și încearcă din nou.');}
}
