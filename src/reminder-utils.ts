import {tr,locale} from './i18n.ts';
export const REMINDER_OPTIONS=[90,60,30,14,7,3,1,0];
export function normalizeReminders(values:unknown,fallback=30):number[]{const result=Array.isArray(values)?[...new Set(values.map(Number).filter(n=>REMINDER_OPTIONS.includes(n)))].sort((a,b)=>b-a):[];return result.length?result:[fallback]}
export function dateOnly(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value}
export function reminderLabel(days:number){return days===0?tr("În ziua expirării"):tr("Cu {0} {1} înainte",days,days===1?tr("zi"):tr("zile"))}
const escape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line:string){let result='',part='',bytes=0;for(const char of line){const length=new TextEncoder().encode(char).length;if(bytes+length>74){result+=part+'\r\n ';part='';bytes=1;}part+=char;bytes+=length;}return result+part}
export function calendarFile(docs:{id:string;name:string;expires:string;reminderDays?:number[];days:number;entryType?:string;eventTime?:string;eventReminderMinutes?:number[];completedAt?:string;notes?:string}[],now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0',"PRODID:-//Duevo//Document reminders//RO",'CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const doc of docs){
  if(doc.completedAt||!dateOnly(doc.expires))continue;
  const other=doc.entryType==='other',timed=other&&doc.eventTime&&/^([01]\d|2[0-3]):[0-5]\d$/.test(doc.eventTime);
  const end=new Date(doc.expires+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);
  lines.push('BEGIN:VEVENT',`UID:${escape(doc.id)}@expirypocket`,`DTSTAMP:${stamp}`);
  // Floating local time preserves the appointment's wall-clock time on import.
  if(timed)lines.push(`DTSTART:${doc.expires.replace(/-/g,'')}T${doc.eventTime!.replace(':','')}00`);
  else lines.push(`DTSTART;VALUE=DATE:${doc.expires.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end.toISOString().slice(0,10).replace(/-/g,'')}`);
  lines.push(`SUMMARY:${escape((other?'':tr("Expiră: "))+doc.name)}`,`DESCRIPTION:${escape(other?doc.notes||tr("Termen personal."):tr("Verifică actul și pregătește reînnoirea."))}`);
  for(const day of normalizeReminders(doc.reminderDays,doc.days))lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape((other?tr("Reamintire: "):tr("Reînnoire: "))+doc.name)}`,`TRIGGER:-P${day}D`,'END:VALARM');
  if(timed)for(const minutes of [...new Set(doc.eventReminderMinutes||[])].filter(n=>[15,30,60,120].includes(n)))lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape(tr("Reamintire: ")+doc.name)}`,`TRIGGER:-PT${minutes}M`,'END:VALARM');
  lines.push('END:VEVENT');
 }
 return [...lines,'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function saveFile(contents:string,name:string,type:string){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
