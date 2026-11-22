import {english} from './translations.en.ts';
export type Language='ro'|'en';
export type GuideCountry='RO'|'OTHER';
const storageKey='duevo-language';
function storedLanguage():Language|null{try{const value=localStorage.getItem(storageKey);return value==='ro'||value==='en'?value:null}catch{return null}}
let chosen=storedLanguage();
let language:Language=chosen||'ro';
const listeners=new Set<()=>void>();
let country:GuideCountry|null=(()=>{try{const value=localStorage.getItem('duevo-country');return value==='RO'||value==='OTHER'?value:null}catch{return null}})();
export const getCountry=():GuideCountry=>country||'OTHER';
export const hasChosenCountry=()=>country!==null;
export function setCountry(value:GuideCountry){country=value;try{localStorage.setItem('duevo-country',value)}catch{}for(const listener of listeners)listener()}
export const getLanguage=()=>language;
export const hasChosenLanguage=()=>chosen!==null;
export function setLanguage(value:Language){language=value;chosen=value;try{localStorage.setItem(storageKey,value)}catch{}if(typeof document!=='undefined')document.documentElement.lang=value;for(const listener of listeners)listener()}
export function subscribeLanguage(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export const locale=()=>language==='en'?'en-GB':'ro-RO';
export function tr(key:string|number,...values:unknown[]):string{
 const text=language==='en'?(english[String(key)]??String(key)):String(key);
 return text.replace(/\{(\d+)\}/g,(match,index)=>Number(index)<values.length?String(values[Number(index)]):match);
}
