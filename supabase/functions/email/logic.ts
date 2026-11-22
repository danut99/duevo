export function reminderMail(doc:{id:string;name:string;expires:string;event_time?:string|null},lead:number){
 const when=lead<0?`în ${-lead} minute`:lead===0?'astăzi':`în ${lead} ${lead===1?'zi':'zile'}`;
 return {subject:`Duevo: ai o reamintire ${when}`,text:`Salut!\n\nAi o reamintire pentru „${doc.name}” ${when}.\nData: ${doc.expires}${doc.event_time?' · '+doc.event_time.slice(0,5):''}\n\nDeschide Duevo pentru detalii:\nhttps://duevo.pages.dev/reminders\n\nPoți opri emailurile din Duevo → Reamintiri → Email.\nEchipa Duevo`};
}
