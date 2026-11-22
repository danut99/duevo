import type {Doc} from './supabase';
export function monthlyPlan(docs:Doc[],now=new Date()){
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const date=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
 const start=date(today),end=date(new Date(now.getFullYear(),now.getMonth()+1,0));
 const items=docs.filter(doc=>!doc.completedAt&&doc.expires<=end).sort((a,b)=>a.expires.localeCompare(b.expires)||(a.eventTime||'23:59').localeCompare(b.eventTime||'23:59')||a.name.localeCompare(b.name));
 return {items,overdue:items.filter(d=>d.expires<start).length,thisMonth:items.filter(d=>d.expires>=start).length,today:start,end};
}
