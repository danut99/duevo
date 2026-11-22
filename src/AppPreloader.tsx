import BrandMark from './BrandMark';
import {tr} from './i18n';
import './preloader.css';
export default function AppPreloader({theme}:{theme:string}){
 return <div className="pocket-app du-preloader" data-theme={theme} role="status" aria-live="polite" aria-label={tr('Se încarcă')}><div className="du-preloader-content"><BrandMark size={48}/><strong>duevo<span>.</span></strong><div className="du-preloader-track" aria-hidden="true"><i/></div><p>{tr('Pregătim actele tale…')}</p></div></div>;
}
