import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
export type PacketPdfInput={title:string;subject:string;fields:{label:string;value:string}[];checklist:{label:string;status:string;fileIndices?:number[]}[];note:string;source?:{label:string;url:string};files:{name:string;bytes:Uint8Array;mime:string}[]};

export async function createPacketPdf(input:PacketPdfInput,fontBytes:Uint8Array){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:true});
 pdf.setTitle(input.title);pdf.setAuthor('Duevo');pdf.setSubject('Copii și informații selectate pentru pregătirea reînnoirii');
 const width=595.28,height=841.89,margin=44,ink=rgb(.1,.11,.13),muted=rgb(.32,.35,.39),accent=rgb(.92,.29,.08);
 let page=pdf.addPage([width,height]),y=height-margin;const summaryPages=[page];
 function newPage(){page=pdf.addPage([width,height]);summaryPages.push(page);y=height-margin}
 const clean=(value:string)=>value.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\t/g,' ');
 function lines(text:string,size:number){const output:string[]=[],max=width-margin*2;for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)<=max){line=next;continue}if(line)output.push(line);line='';for(const char of word){if(font.widthOfTextAtSize(line+char,size)>max){output.push(line);line=char}else line+=char}}output.push(line)}return output}
 function text(value:string,size=10,color=ink,gap=6){for(const line of lines(value,size)){if(y<size+margin)newPage();page.drawText(line,{x:margin,y:y-size,font,size,color});y-=size*1.5}y-=gap}
 text('DUEVO / DOSAR DE PREGĂTIRE',10,accent,18);text(input.title,22,ink,8);text(input.subject,12,muted,4);text('Generat la '+new Date().toLocaleDateString('ro-RO'),9,muted,20);
 text('INFORMAȚII SELECTATE',11,accent,10);
 for(const field of input.fields)text(field.label+': '+(field.value.trim()||'Necompletat'),11,ink,7);
 y-=10;text('DOCUMENTE PREGĂTITE',11,accent,10);
 const inlineImages=new Set<number>();
 for(const item of input.checklist){
  text(item.label+(item.fileIndices?.length?'': ' - '+item.status),11,ink,8);
  for(const index of item.fileIndices||[]){
   const file=input.files[index];if(!file)continue;
   if(file.mime==='application/pdf'){text('Document PDF - paginile sunt incluse ?n anex?.',9,muted,6);continue}
   try{
    const image=file.mime==='image/png'?await pdf.embedPng(file.bytes):file.mime==='image/jpeg'?await pdf.embedJpg(file.bytes):null;
    if(!image)throw Error('Format neacceptat');
    const scale=Math.min((width-margin*2)/image.width,310/image.height),w=image.width*scale,h=image.height*scale;
    if(y-h<margin)newPage();
    page.drawImage(image,{x:margin,y:y-h,width:w,height:h});y-=h+16;inlineImages.add(index);
   }catch{throw Error('Imaginea pentru ?'+item.label+'? nu poate fi inclus?.')}
  }
 }
 y-=10;text(input.note,9,muted,10);
 text('Acest dosar conține numai informațiile și copiile selectate. Nu confirmă valabilitatea actelor și nu înlocuiește originalele sau depunerea oficială.',9,muted,10);
 if(input.source){text('Sursă orientativă: '+input.source.label,9,muted,2);text(input.source.url,8,muted,8)}
 const summaryCount=summaryPages.length;
 for(const [fileIndex,file] of input.files.entries()){
  if(inlineImages.has(fileIndex))continue;
  try{
   if(file.mime==='application/pdf'){
    const source=await PDFDocument.load(file.bytes);if(source.getForm().getFields().length)throw Error('PDF-ul conține câmpuri interactive sau semnături. Folosește o copie PDF statică pentru reunire și păstrează originalul.');
    if(!source.getPageCount())throw Error('PDF-ul nu are pagini.');
    if(pdf.getPageCount()+source.getPageCount()>300)throw Error('Dosarul poate avea maximum 300 de pagini.');
    const pages=await pdf.copyPages(source,source.getPageIndices());pages.forEach(p=>pdf.addPage(p));
   }else{
    const image=file.mime==='image/png'?await pdf.embedPng(file.bytes):file.mime==='image/jpeg'?await pdf.embedJpg(file.bytes):null;
    if(!image)throw Error('Formatul imaginii nu poate fi inclus.');
    const p=pdf.addPage([width,height]),scale=Math.min((width-margin*2)/image.width,(height-margin*2-30)/image.height),w=image.width*scale,h=image.height*scale;
    let label=clean(file.name).replace(/\n/g,' ');while(font.widthOfTextAtSize(label,9)>width-margin*2)label=label.slice(0,-2)+'…';
    p.drawText(label,{x:margin,y:height-margin,font,size:9,color:muted});p.drawImage(image,{x:(width-w)/2,y:margin+(height-margin*2-30-h)/2,width:w,height:h});
   }
  }catch(e){throw Error(`Nu am putut include „${file.name}”. ${(e as Error).message.includes('câmpuri')||(e as Error).message.includes('maximum')?(e as Error).message:'Fișierul poate fi deteriorat sau protejat cu parolă. Înlocuiește-l ori scoate-l din selecție.'}`)}
 }
 summaryPages.forEach((p,i)=>p.drawText(`Pregătire ${i+1}/${summaryCount} - ${pdf.getPageCount()} pagini în total`,{x:margin,y:24,font,size:8,color:muted}));
 return pdf.save();
}

export async function normalizePacketImage(blob:Blob):Promise<{bytes:Uint8Array;mime:string}>{
 if(blob.type==='application/pdf')return {bytes:new Uint8Array(await blob.arrayBuffer()),mime:blob.type};
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Format de fișier necunoscut.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'})}catch{throw Error('Imaginea nu poate fi citită. Înlocuiește fișierul cu o poză validă.')}
 try{const scale=Math.min(1,3200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Imaginea nu poate fi pregătită.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Imaginea nu poate fi convertită.')),'image/png'));return {bytes:new Uint8Array(await png.arrayBuffer()),mime:'image/png'}}finally{bitmap.close()}
}
