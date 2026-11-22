import {tr,locale} from './i18n.ts';
﻿import {CalendarDays} from 'lucide-react';
import type {Doc} from './supabase';
import {CalendarExport} from './NotificationSettings';
import './calendar-export.css';

export default function CalendarExportCard({docs,loading=false}:{docs:Doc[];loading?:boolean}){
 return <section className="ep-card ep-calendar-card" aria-label={tr("Export în calendar")}>
 <span className="ep-calendar-card-icon" aria-hidden="true"><CalendarDays size={19}/></span>
 <div className="ep-calendar-card-copy"><h2>{tr("Export în calendar")}</h2><p>{loading?tr("Se încarcă…"):docs.length?tr("{0} {1} · .ics · import manual",docs.length,docs.length===1?tr("act"):tr("acte")):tr("Adaugă un act pentru export")}</p></div>
 <CalendarExport docs={loading?[]:docs} compact/>
 </section>;
}

