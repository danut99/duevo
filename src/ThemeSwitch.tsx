import {Moon,Sun} from 'lucide-react';
export default function ThemeSwitch({theme,onToggle}:{theme:string;onToggle:()=>void}){
const dark=theme!=='carbon';
return <button type="button" className="ep-theme-switch" role="switch" aria-checked={dark} aria-label="Mod întunecat" title={dark?'Activează modul luminos':'Activează modul întunecat'} onClick={onToggle}><span className="ep-theme-switch-track" aria-hidden="true"><Sun className="ep-theme-sun" size={15}/><Moon className="ep-theme-moon" size={15}/><span className="ep-theme-switch-thumb">{dark?<Moon size={15}/>:<Sun size={16}/>}</span></span></button>;
}