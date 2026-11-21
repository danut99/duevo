import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
export default function DocumentPanel({children,onClose}:{children:ReactNode;onClose:()=>void}){
 const panel=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const scroll=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current()}if(e.key==='Tab'){const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')||[]).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(!first){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){e.preventDefault();first.focus()}}};window.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=scroll;window.removeEventListener('keydown',key);previous?.focus({preventScroll:true})};
 },[]);
 return <div className="ep-document-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={panel} className="ep-document-panel" role="dialog" aria-modal="true" aria-label="Detalii document" tabIndex={-1}>{children}</div></div>;
}
