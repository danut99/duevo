export const REMINDER_OPTIONS=[90,60,30,14,7,3,1,0];
export function normalizeReminders(values:unknown,fallback=30):number[]{const result=Array.isArray(values)?[...new Set(values.map(Number).filter(n=>REMINDER_OPTIONS.includes(n)))].sort((a,b)=>b-a):[];return result.length?result:[fallback]}
export function dateOnly(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
export function reminderLabel(days:number){return days===0?'În ziua expirării':`Cu ${days} ${days===1?'zi':'zile'} înainte`}
const escape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line:string){let result='',part='',bytes=0;for(const char of line){const length=new TextEncoder().encode(char).length;if(bytes+length>74){result+=part+'\r\n ';part='';bytes=1;}part+=char;bytes+=length;}return result+part}
export function calendarFile(docs:{id:string;name:string;expires:string;reminderDays?:number[];days:number}[],now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Duevo//Document reminders//RO','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const doc of docs){if(!dateOnly(doc.expires))continue;const end=new Date(doc.expires+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);lines.push('BEGIN:VEVENT',`UID:${escape(doc.id)}@expirypocket`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${doc.expires.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${escape('Expiră: '+doc.name)}`,'DESCRIPTION:Verifică actul și pregătește reînnoirea.');for(const day of normalizeReminders(doc.reminderDays,doc.days))lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape('Reînnoire: '+doc.name)}`,`TRIGGER:-P${day}D`,'END:VALARM');lines.push('END:VEVENT')}
 return [...lines,'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function saveFile(contents:string,name:string,type:string){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
