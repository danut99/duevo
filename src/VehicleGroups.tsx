import {useState} from 'react';
import {Car,Plus,X} from 'lucide-react';
import type {Doc,Vehicle} from './supabase';
import {DocumentCard,metrics,shortDate} from './PocketUI';
import {VehicleCreator} from './VehiclePicker';
export default function VehicleGroups({vehicles,docs,onCreate,open}:{vehicles:Vehicle[];docs:Doc[];onCreate:(plate:string,name:string)=>Promise<Vehicle>;open:(id:string)=>void}){
 const [creating,setCreating]=useState(false);
 const unassigned=docs.filter(d=>!d.vehicleId);
 const groups=[...vehicles.map(v=>({id:v.id,title:v.name||v.plate,plate:v.name?v.plate:'',docs:docs.filter(d=>d.vehicleId===v.id)})),...(unassigned.length?[{id:'unassigned',title:'Fără mașină',plate:'Asociază actele unei mașini din „Editează document”.',docs:unassigned}]:[])];
 return <section className="ep-vehicle-groups"><div className="ep-screen-heading ep-vehicle-heading"><h2>Mașinile tale</h2><button className={creating?'ep-secondary ep-add-action':'ep-primary ep-add-action'} onClick={()=>setCreating(!creating)} aria-expanded={creating}>{creating?<X size={15}/>:<Plus size={15}/>}{creating?'Anulează':'Adaugă mașină'}</button></div>{creating&&<div className="ep-card"><VehicleCreator onCreate={onCreate} onDone={()=>setCreating(false)}/></div>}{!groups.length&&!creating&&<p>Adaugă prima mașină și grupează RCA, ITP, rovinieta și CASCO.</p>}{groups.map(group=>{const next=group.docs[0],alerts=group.docs.filter(d=>metrics(d).status!=='valid').length;return <details key={group.id} className="ep-card ep-vehicle-group" open><summary><Car size={22}/><span><strong>{group.title}</strong>{group.plate&&<small>{group.plate}</small>}<small>{group.docs.length} acte{alerts?` · ${alerts} alerte`:''}{next?` · Următorul termen: ${shortDate(next.expires)}`:''}</small></span></summary><div className="ep-document-list">{group.docs.map(doc=><DocumentCard key={doc.id} doc={doc} open={()=>open(doc.id)}/>)}{!group.docs.length&&<p>Niciun act în acest grup pentru filtrul ales.</p>}</div></details>})}</section>
}
