import {useState} from 'react';
import type {Vehicle} from './supabase';
export function VehicleCreator({onCreate,onDone}:{onCreate:(plate:string,name:string)=>Promise<Vehicle>;onDone:(vehicle:Vehicle)=>void}){
 const [plate,setPlate]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){setBusy(true);setError('');try{onDone(await onCreate(plate,name));setPlate('');setName('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="ep-vehicle-create"><label>Număr de înmatriculare<input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} maxLength={30} placeholder="B 123 ABC" autoComplete="off" disabled={busy}/></label><label>Nume mașină (opțional)<input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Dacia familiei" disabled={busy}/></label><button type="button" className="ep-primary" disabled={busy||!plate.trim()} onClick={()=>void save()}>{busy?'Se salvează…':'Salvează mașina'}</button>{error&&<p role="alert" className="ep-error">{error}</p>}</div>
}
export default function VehiclePicker({vehicles,value,onChange,onCreate}:{vehicles:Vehicle[];value:string;onChange:(vehicle?:Vehicle)=>void;onCreate:(plate:string,name:string)=>Promise<Vehicle>}){
 const [creating,setCreating]=useState(false);
 return <div className="ep-vehicle-picker"><label htmlFor="vehicle-choice">Mașina</label><select id="vehicle-choice" value={value} onChange={e=>onChange(vehicles.find(v=>v.id===e.target.value))}><option value="">Fără mașină</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}{v.name?' · '+v.name:''}</option>)}</select><button type="button" className="ep-secondary" aria-expanded={creating} onClick={()=>setCreating(!creating)}>{creating?'Anulează':'Adaugă o mașină'}</button>{creating&&<VehicleCreator onCreate={onCreate} onDone={v=>{onChange(v);setCreating(false)}}/>}</div>
}
