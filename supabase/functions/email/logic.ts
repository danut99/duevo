export type EmailMessage={subject:string;text:string;html:string};
const home='https://duevo.pages.dev';
const reminders=home+'/reminders';
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

function layout(o:{preview:string;label:string;title:string;intro:string;detail?:string;button:string;url:string;note:string;footer:string;language?:'ro'|'en'}){
 const en=o.language==='en';
 return `<!DOCTYPE html>
<html lang="${en?'en':'ro'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(o.title)} · Duevo</title></head>
<body style="margin:0;padding:0;width:100%;background-color:#f3f2ee;color:#181818;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(o.preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f2ee"><tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;"><a href="${home}" style="font-size:30px;font-weight:800;letter-spacing:-1.5px;color:#181818;text-decoration:none;">duevo<span style="color:#e94b13;">.</span></a><div style="font-size:10px;font-weight:700;letter-spacing:1.6px;line-height:18px;margin-top:4px;color:#686860;">${en?'FEWER WORRIES, EVERY DAY':'MAI PUȚINE GRIJI, ZI DE ZI'}</div></td></tr>
<tr><td bgcolor="#ffffff" style="border:1px solid #deded7;border-radius:20px;overflow:hidden;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td bgcolor="#ff5d1f" style="padding:26px 28px;border-radius:19px 19px 0 0;"><span style="font-size:11px;font-weight:700;letter-spacing:1.8px;color:#181818;">${escape(o.label)}</span><h1 style="margin:12px 0 0;font-size:30px;line-height:36px;letter-spacing:-1px;color:#181818;font-weight:800;">${escape(o.title)}</h1></td></tr>
<tr><td style="padding:28px;"><p style="margin:0 0 22px;font-size:15px;line-height:25px;color:#45453e;">${escape(o.intro)}</p>
${o.detail||''}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td align="center" bgcolor="#181818" style="border-radius:10px;mso-padding-alt:15px 24px;"><a href="${escape(o.url)}" style="display:inline-block;padding:15px 24px;border:1px solid #181818;border-radius:10px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;color:#ffffff;">${escape(o.button)} &nbsp; &#8594;</a></td></tr></table>
<p style="margin:0;font-size:13px;line-height:22px;color:#696961;">${escape(o.note)}</p>
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #edede7;font-size:13px;line-height:22px;color:#45453e;">${en?'With your time in mind,':'Cu grijă pentru timpul tău,'}<br><strong style="color:#181818;">${en?'The Duevo team':'Echipa Duevo'}</strong></p>
</td></tr></table></td></tr>
<tr><td style="padding:22px 8px 0;font-size:11px;line-height:19px;color:#6c6c64;">${o.footer}<p style="margin:12px 0 0;"><a href="${home}" style="color:#53534c;text-decoration:underline;">${en?'Open Duevo':'Deschide Duevo'}</a> &nbsp;·&nbsp; <a href="mailto:hello.duevo@gmail.com" style="color:#53534c;text-decoration:underline;">Contact</a></p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
const preferencesFooter=`Primești acest email deoarece ai activat alertele Duevo. Le poți opri oricând din <a href="${reminders}" style="color:#53534c;text-decoration:underline;">Reamintiri → Email</a>.`;
function dateLabel(value:string){const [year,month,day]=value.split('-');return year&&month&&day?`${day}.${month}.${year}`:value}

export function reminderMail(doc:{id:string;name:string;expires:string;event_time?:string|null},lead:number,language:'ro'|'en'='ro'):EmailMessage{
 if(language==='en')return englishReminder(doc,lead);
 const when=lead<0?`în ${-lead} minute`:lead===0?'astăzi':`în ${lead} ${lead===1?'zi':'zile'}`;
 const date=dateLabel(doc.expires),time=doc.event_time?.slice(0,5);
 const detail=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f6f2" style="border:1px solid #e7e7df;border-radius:12px;"><tr><td style="padding:18px 20px;word-break:break-word;"><p style="margin:0 0 6px;font-size:10px;letter-spacing:1.4px;color:#73736a;font-weight:700;">AI O REAMINTIRE PENTRU</p><p style="margin:0;font-size:20px;line-height:28px;color:#181818;font-weight:700;">${escape(doc.name)}</p><p style="margin:10px 0 0;font-size:14px;line-height:22px;color:#45453e;">Data: <strong>${escape(date)}</strong>${time?` &nbsp;·&nbsp; Ora: <strong>${escape(time)}</strong>`:''}</p></td></tr></table>`;
 return {subject:`Duevo: ai o reamintire ${when}`,text:`Salut!\n\nAi o reamintire pentru „${doc.name}” ${when}.\nData: ${date}${time?' · '+time:''}\n\nVezi reamintirile: ${reminders}\n\nPoți opri emailurile din Duevo → Reamintiri → Email.\nEchipa Duevo`,html:layout({preview:`Reamintire ${when}: ${doc.name}. Deschide Duevo pentru detalii.`,label:'UN LUCRU MAI PUȚIN DE ȚINUT MINTE',title:lead===0?'Reamintirea ta de astăzi.':'Un mic reminder. Mai puține griji.',intro:`Salut! Ai o reamintire ${when}. Am păstrat detaliile aici, ca să te poți ocupa de ce urmează.`,detail,button:'Vezi reamintirile',url:reminders,note:'Ai rezolvat deja? Actualizează actul sau marchează termenul ca finalizat în Duevo.',footer:preferencesFooter})};
}

export function testMail(language:'ro'|'en'='ro'):EmailMessage{
 if(language==='en')return {subject:'Duevo · Your test email',text:`Hello!\n\nYour test email has arrived. This is where you will receive your Duevo reminders.\n\nCheck your settings: ${reminders}\n\nTurn off emails in Duevo → Reminders → Email.\nThe Duevo team`,html:layout({language:'en',preview:'Your test email has arrived. One step closer to fewer worries.',label:'CONNECTION CHECKED',title:'Delivered. We are connected.',intro:'Hello! This is your test email. Your document and appointment reminders will arrive here.',button:'View email settings',url:reminders,note:'Check your preferred time and the reminder dates on your documents. If this email arrived in Spam, you can mark it as “Not spam” and add our address to your contacts.',footer:englishFooter})};
 return {subject:'Duevo · Emailul tău de test',text:`Salut!\n\nEmailul de test a ajuns. Aceasta este adresa la care vei primi alertele Duevo.\n\nVerifică ora preferată și reamintirile actelor: ${reminders}\n\nPoți opri emailurile din Duevo → Reamintiri → Email.\nEchipa Duevo`,html:layout({preview:'Emailul de test a ajuns. Un pas în plus pentru mai puține griji.',label:'CONEXIUNE VERIFICATĂ',title:'A ajuns. Suntem conectați.',intro:'Salut! Acesta este emailul tău de test. Aici vei primi reamintirile pentru actele și programările tale.',detail:'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f6f2" style="border:1px solid #e7e7df;border-radius:12px;"><tr><td style="padding:18px 20px;"><p style="margin:0;font-size:15px;line-height:24px;font-weight:700;color:#181818;">Tu alegi ora. Duevo îți amintește.</p><p style="margin:6px 0 0;font-size:13px;line-height:22px;color:#696961;">Verifică ora preferată și datele de reamintire ale actelor tale.</p></td></tr></table>',button:'Vezi setările de email',url:reminders,note:'Dacă acest mesaj a ajuns în Spam, îl poți marca „Nu este spam” și poți adăuga adresa noastră în contacte.',footer:preferencesFooter})};
}

// Supabase replaces this variable with its single-use recovery link.
export function resetPasswordHtml(url='{{ .ConfirmationURL }}',language:'ro'|'en'='ro'){
 if(language==='en')return layout({language:'en',preview:'You requested a new password for your Duevo account.',label:'YOUR DUEVO ACCOUNT',title:'A new password. One less worry.',intro:'We received a password reset request for your Duevo account. Use the button below to choose a new password.',button:'Choose a new password',url,note:'If you did not request a password reset, you can ignore this email. Your password will stay the same. Do not share this message or link with anyone.',footer:'This is a security message for your Duevo account.'});
 return layout({preview:'Ai cerut o parolă nouă pentru contul tău Duevo.',label:'CONTUL TĂU DUEVO',title:'O parolă nouă. Aceleași griji în minus.',intro:'Am primit o cerere de resetare a parolei pentru contul tău Duevo. Apasă butonul de mai jos pentru a alege o parolă nouă.',button:'Alege o parolă nouă',url,note:'Dacă nu ai cerut resetarea parolei, poți ignora acest email. Parola ta rămâne neschimbată. Nu trimite acest mesaj sau linkul altor persoane.',footer:'Acesta este un mesaj de securitate pentru contul tău Duevo.'});
}

const englishFooter=`You receive this email because Duevo alerts are enabled for your account. You can turn them off in <a href="${reminders}" style="color:#53534c;text-decoration:underline;">Reminders → Email</a>.`;
function englishReminder(doc:{id:string;name:string;expires:string;event_time?:string|null},lead:number):EmailMessage{
 const when=lead<0?`in ${-lead} minutes`:lead===0?'today':`in ${lead} ${lead===1?'day':'days'}`;
 const date=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(doc.expires+'T12:00:00Z')),time=doc.event_time?.slice(0,5);
 const detail=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f6f2" style="border:1px solid #e7e7df;border-radius:12px;"><tr><td style="padding:18px 20px;word-break:break-word;"><p style="margin:0 0 6px;font-size:10px;letter-spacing:1.4px;color:#73736a;font-weight:700;">YOUR REMINDER FOR</p><p style="margin:0;font-size:20px;line-height:28px;color:#181818;font-weight:700;">${escape(doc.name)}</p><p style="margin:10px 0 0;font-size:14px;line-height:22px;color:#45453e;">Date: <strong>${escape(date)}</strong>${time?` &nbsp;·&nbsp; Time: <strong>${escape(time)}</strong>`:''}</p></td></tr></table>`;
 return {subject:`Duevo: a reminder ${when}`,text:`Hello!\n\nA reminder for “${doc.name}” ${when}.\nDate: ${date}${time?' · '+time:''}\n\nView reminders: ${reminders}\n\nTurn off emails in Duevo → Reminders → Email.\nThe Duevo team`,html:layout({language:'en',preview:`Reminder ${when}: ${doc.name}. Open Duevo for details.`,label:'ONE LESS THING TO REMEMBER',title:lead===0?'Your reminder for today.':'A little reminder. Fewer worries.',intro:`Hello! You have a reminder ${when}. Here are the details, so you can take care of what comes next.`,detail,button:'View reminders',url:reminders,note:'Already taken care of it? Update the document or mark the deadline as completed in Duevo.',footer:englishFooter})};
}

export function bilingualResetPasswordHtml(){return '{{ if eq .Data.duevo_language "en" }}\n'+resetPasswordHtml('{{ .ConfirmationURL }}','en')+'\n{{ else }}\n'+resetPasswordHtml()+'\n{{ end }}'}
