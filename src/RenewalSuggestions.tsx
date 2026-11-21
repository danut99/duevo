import type {Doc} from './supabase';
import {docType} from './PocketUI';
export default function RenewalSuggestions({doc,onChoose}:{doc:Doc;onChoose:(date:string)=>void}){
 const code=docType(doc).code;
 const values=doc.category==='Vehicles'?[6,12,24]:[24,60,120];
 if(['REV','KIT','PARK'].includes(code))return null;
 function choose(months:number){const now=new Date(),day=now.getDate();now.setDate(1);now.setMonth(now.getMonth()+months);now.setDate(Math.min(day,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()));onChoose(now.toLocaleDateString('sv-SE'))}
 return <div className="ep-duration"><span>Sugestii de la data de azi:</span><div>{values.map(months=><button type="button" className="ep-pill" key={months} onClick={()=>choose(months)}>{months<12?`${months} luni`:months===12?'1 an':`${months/12} ani`}</button>)}</div><p className="ep-rule-help">Verifică data exactă de pe act înainte de confirmare.</p></div>;
}
