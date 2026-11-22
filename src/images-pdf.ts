import {PDFDocument} from 'pdf-lib';

export async function createImagesPdf(images:{bytes:Uint8Array;mime:string}[],title:string){
 if(!images.length)throw Error('No images selected');
 const pdf=await PDFDocument.create();pdf.setTitle(title);pdf.setAuthor('Duevo');
 for(const input of images){
  const image=input.mime==='image/png'?await pdf.embedPng(input.bytes):input.mime==='image/jpeg'?await pdf.embedJpg(input.bytes):null;
  if(!image)throw Error('Unsupported image');
  const landscape=image.width>image.height;
  const [width,height]=landscape?[841.89,595.28]:[595.28,841.89];
  const scale=Math.min((width-32)/image.width,(height-32)/image.height);
  const w=image.width*scale,h=image.height*scale,page=pdf.addPage([width,height]);
  page.drawImage(image,{x:(width-w)/2,y:(height-h)/2,width:w,height:h});
 }
 return pdf.save();
}

// Browser decoding applies photo orientation and supports WebP as well as JPEG/PNG.
export async function normalizePdfImage(blob:Blob){
 const url=URL.createObjectURL(blob);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,3000/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image unavailable');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Image unavailable')),'image/jpeg',.94));
  return {bytes:new Uint8Array(await jpeg.arrayBuffer()),mime:'image/jpeg'};
 }finally{URL.revokeObjectURL(url)}
}
