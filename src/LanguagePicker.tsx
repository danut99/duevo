import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {Check,Globe2,X} from 'lucide-react';
import {getLanguage,setLanguage,subscribeLanguage,tr,getCountry,setCountry} from './i18n.ts';
import type {Language,GuideCountry} from './i18n.ts';
import './language.css';

const preferenceSnapshot=()=>getLanguage()+':'+getCountry();
export function useLocalePreference(){return useSyncExternalStore(subscribeLanguage,preferenceSnapshot)}

export function LanguageButton(){
 const language=useSyncExternalStore(subscribeLanguage,getLanguage);
 return <button type="button" className="du-language-button" aria-label={tr('Schimbă limba')} onClick={()=>window.dispatchEvent(new Event('duevo:choose-language'))}><Globe2 size={17}/><span>{language.toUpperCase()}</span></button>;
}
export default function LanguageRoot({children}:{children:ReactNode}){
 const currentTheme=()=>{try{return document.querySelector('.pocket-app[data-theme]')?.getAttribute('data-theme')||localStorage.getItem('expiry-pocket-theme')||'obsidian'}catch{return 'obsidian'}};
 const [theme,setTheme]=useState(currentTheme);
 const language=useSyncExternalStore(subscribeLanguage,getLanguage);
 const country=useSyncExternalStore(subscribeLanguage,getCountry);
 // Preferences are detected automatically; the dialog opens only from the language button.
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<Language>(language),[selectedCountry,setSelectedCountry]=useState<GuideCountry>(country);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{document.documentElement.lang=language},[language]);
 useEffect(()=>{const choose=()=>{setTheme(currentTheme());setSelected(getLanguage());setSelectedCountry(getCountry());setOpen(true)};window.addEventListener('duevo:choose-language',choose);return()=>window.removeEventListener('duevo:choose-language',choose)},[]);
 useEffect(()=>{const panel=dialog.current;if(!panel)return;if(open){opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!panel.open)panel.showModal();return()=>{if(panel.open)panel.close();opener.current?.focus()}}},[open]);
 return <><div className={open?'du-language-background-paused':undefined} inert={open}>{children}</div><dialog ref={dialog} className="du-language-dialog" data-theme={theme} aria-labelledby="du-language-title" aria-describedby="du-language-description" onCancel={()=>setOpen(false)}>
 <button type="button" className="du-language-close" aria-label={selected==='ro'?'Închide':'Close'} onClick={()=>setOpen(false)}><X size={19}/></button>
 <div className="du-language-symbol"><Globe2 size={25}/></div><span className="du-language-brand">duevo<span>.</span></span>
 <h2 id="du-language-title">Alege limba preferată.<br/><span>Choose your language.</span></h2>
 <p id="du-language-description">O poți schimba oricând. / You can change it anytime.</p>
 <div className="du-language-options" role="radiogroup" aria-label="Limba / Language">{([['ro','Română','Romanian'],['en','English','Engleză']] as const).map(([value,title,subtitle])=><label key={value} className={selected===value?'selected':''}><input type="radio" name="duevo-language" value={value} checked={selected===value} onChange={()=>setSelected(value)}/><span><strong>{title}</strong><small>{subtitle}</small></span>{selected===value&&<Check size={20}/>}</label>)}</div>
 <label className="du-country-label" htmlFor="duevo-guide-country">{selected==='ro'?'Țara pentru ghiduri':'Country for renewal guides'}<select id="duevo-guide-country" value={selectedCountry} onChange={event=>setSelectedCountry(event.target.value as GuideCountry)}><option value="RO">{selected==='ro'?'România':'Romania'}</option><option value="OTHER">{selected==='ro'?'Altă țară':'Another country'}</option></select></label>
 <p className="du-country-note">{selected==='ro'?'Limba nu schimbă țara. Linkurile și ghidurile instituțiilor sunt disponibile doar pentru România.':'Language does not change the country. Institutional links and guides are available only for Romania.'}</p>
 <button className="du-language-continue" type="button" onClick={()=>{setCountry(selectedCountry);setLanguage(selected);setOpen(false)}}>{selected==='ro'?'Continuă în română':'Continue in English'} <span aria-hidden="true">→</span></button>
 </dialog></>;
}
