import {tr,locale} from './i18n.ts';
import type {ReactNode} from 'react';
import {Folder} from 'lucide-react';
export default function ActListGroup({enabled,open,onToggle,title,count,children}:{enabled:boolean;open:boolean;onToggle:(open:boolean)=>void;title:string;count:number;children:ReactNode}){
 if(!enabled)return <>{children}</>;
 return <details className="ep-card ep-act-group" open={open} onToggle={e=>{if(e.currentTarget.open!==open)onToggle(e.currentTarget.open)}}><summary><Folder size={21}/><span><strong>{tr(title)}</strong><small>{count} {count===1?tr("act"):tr("acte")}</small></span></summary>{children}</details>;
}
