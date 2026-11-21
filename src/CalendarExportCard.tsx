import {CalendarDays} from 'lucide-react';
import type {Doc} from './supabase';
import {CalendarExport} from './NotificationSettings';
import './calendar-export.css';

export default function CalendarExportCard({docs,loading=false}:{docs:Doc[];loading?:boolean}){
 return <section className="ep-card ep-calendar-card" aria-label="Export în calendar">
 <span className="ep-calendar-card-icon" aria-hidden="true"><CalendarDays size={19}/></span>
 <div className="ep-calendar-card-copy"><h2>Export în calendar</h2><p>{loading?'Se încarcă…':docs.length?`${docs.length} ${docs.length===1?'act':'acte'} · .ics · import manual`:'Adaugă un act pentru export'}</p></div>
 <CalendarExport docs={loading?[]:docs} compact/>
 </section>;
}

