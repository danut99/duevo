import {useEffect,useId,useState} from 'react';
import {Plus} from 'lucide-react';
import {tr} from './i18n.ts';
import {MAX_REMINDERS,MAX_REMINDER_DAYS} from './reminder-utils';
import './custom-reminder.css';

export default function CustomReminder({values,onAdd,disabled=false}:{values:number[];onAdd:(days:number)=>void;disabled?:boolean}){
 const id=useId(),[value,setValue]=useState(''),[error,setError]=useState('');
 useEffect(()=>setError(''),[values.length]);
 function add(){
  const days=Number(value);
  if(!value||days<1||days>MAX_REMINDER_DAYS){setError(tr("Scrie un număr între 1 și {0}.",MAX_REMINDER_DAYS));return}
  if(values.includes(days)){setError(tr("Ai deja această alertă."));return}
  if(values.length>=MAX_REMINDERS){setError(tr("Poți avea cel mult {0} alerte pentru un act.",MAX_REMINDERS));return}
  onAdd(days);setValue('');setError('');
 }
 return <div className="ep-custom-reminder">
  <label htmlFor={id}>{tr("Alt număr de zile")}</label>
  <div className="ep-custom-reminder-row">
   {/* Text input keeps unfinished values from blocking the surrounding form's submit. */}
   <input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="45" value={value} disabled={disabled} aria-describedby={error?id+'-error':undefined} onChange={e=>{setValue(e.target.value.replace(/\D/g,'').slice(0,3));setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/>
   <span>{tr("zile înainte")}</span>
   <button type="button" className="ep-custom-reminder-add" disabled={disabled||!value} onClick={add}><Plus size={14}/>{tr("Adaugă")}</button>
  </div>
  {error&&<p id={id+'-error'} className="ep-custom-reminder-error" role="alert">{error}</p>}
 </div>;
}
