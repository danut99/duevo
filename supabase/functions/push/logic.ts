export function allowedEndpoint(value:string):boolean{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&(url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname==='web.push.apple.com'||/^[a-z0-9.-]+\.notify\.windows\.com$/.test(url.hostname));}catch{return false}}
export function notificationPayload(documentId:string,version:number,leadDays:number,profileName?:string,documentName?:string,entryType?:string,language:'ro'|'en'='ro'){
 const en=language==='en';
 const prefix=profileName?`${en?'Profile':'Profil'} ${profileName.slice(0,40)}: `:'';
 const name=(documentName||(en?'Your document':'Documentul tău')).replace(/[\r\n]+/g,' ').slice(0,120);
 const other=entryType==='other';
 const timing=leadDays<0?`Reamintire cu ${-leadDays} minute înainte de programare: ${name}.`:leadDays===0?`${name}${other?' este programat astăzi':' expiră astăzi'}.`:`${name}${other?' este programat':' expiră'} în ${leadDays} ${leadDays===1?'zi':'zile'}.`;
 const english=leadDays<0?`Reminder ${-leadDays} minutes before your appointment: ${name}.`:leadDays===0?`${name}${other?' is scheduled for today':' expires today'}.`:`${name}${other?' is scheduled':' expires'} in ${leadDays} ${leadDays===1?'day':'days'}.`;
 return {title:'Duevo',body:prefix+(en?english:timing),url:`/documents/${documentId}`,tag:`expiry-${documentId}-${version}-${leadDays}`};
}
export function responseCode(error:unknown):number{const code=Number((error as {statusCode?:number})?.statusCode);return Number.isInteger(code)&&code>=400&&code<=599?code:503}

