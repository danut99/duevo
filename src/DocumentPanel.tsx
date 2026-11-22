import {tr,locale} from './i18n.ts';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {ReactNode} from 'react';
export default function DocumentPanel({children,onClose,theme}:{children:ReactNode;onClose:()=>void;theme:string}){
 const panel=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const scroll=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current()}if(e.key==='Tab'){const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')||[]).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(!first){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){e.preventDefault();first.focus()}}};window.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=scroll;window.removeEventListener('keydown',key);previous?.focus({preventScroll:true})};
 },[]);
 return createPortal(<div className="pocket-app ep-workspace ep-panel-root" data-theme={theme}><div className="ep-document-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={panel} className="ep-document-panel" role="dialog" aria-modal="true" aria-label={tr("Detalii document")} tabIndex={-1}>{children}</div></div></div>,document.body);
}
