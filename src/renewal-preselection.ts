import type {PacketRequirement} from './renewal-packet-config';
import type {PacketCandidate,PacketDraft} from './renewal-packet-data';

const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const patterns:Record<string,RegExp>={
 TALON:/\btalon\b|\bcertificat(?:ul)?\s+(?:de\s+)?inmatriculare\b/,
 CIV:/\bciv\b|\bcarte(?:a)?\s+(?:de\s+)?identitate\s+(?:(?:a|al)\s+)?vehicul/,
 CI:/\bbuletin\b|\bci\b|\bcarte(?:a)?\s+(?:de\s+)?identitate\b/,
 RCA:/\brca\b/,CAS:/\bcasco\b/,PER:/\bpermis\b/,PAS:/\bpasaport/,
 REV:/\brevizi[ea]\b|\bistoric\b.*\bservice\b/,PARK:/\bparcare\b/,
 ADDRESS:/\bdomiciliu\b/,CIVIL:/\bcertificat(?:ul)?\s+(?:de\s+)?(?:nastere|casatorie)\b/
};
const kinds:Record<string,string>={registration:'TALON',civ:'CIV',identity:'CI',licence:'PER',passport:'PAS',service:'REV',parking:'PARK',address:'ADDRESS',civil:'CIVIL'};
function matches(candidate:PacketCandidate,kind:string){
 if(candidate.kind)return candidate.kind===kind;
 const title=normalized(candidate.title);
 // An identified parent controls the type, so an RCA is never used as a talon.
 const possible=Object.entries(patterns).filter(([key,pattern])=>(key!=='CI'||!patterns.CIV.test(title))&&pattern.test(title)).map(([key])=>key);
 if(possible.length)return possible.length===1&&possible[0]===kind;
 const name=normalized(candidate.file.name);
 const fileKinds=Object.entries(patterns).filter(([key,pattern])=>(key!=='CI'||!patterns.CIV.test(name))&&pattern.test(name)).map(([key])=>key);
 return fileKinds.length===1&&fileKinds[0]===kind;
}

export function preselectPacketFiles(draft:PacketDraft,requirements:PacketRequirement[],candidates:PacketCandidate[],context:{documentId:string;vehicleId?:string;code:string}):PacketDraft{
 const assignments={...draft.assignments};
 for(const req of requirements){
  if(Object.hasOwn(assignments,req.id)||draft.originals.includes(req.id))continue;
  const kind=req.id==='policy'?(context.code==='CAS'?'CAS':'RCA'):kinds[req.id];
  if(!kind)continue; // Receipts, requests and extra files need an explicit choice.
  let found=candidates.filter(c=>c.category===req.category&&(req.category!=='Vehicles'||!!context.vehicleId&&c.vehicleId===context.vehicleId)&&matches(c,kind));
  if(req.id==='policy'&&found.some(c=>c.documentId===context.documentId))found=found.filter(c=>c.documentId===context.documentId);
  const groups=new Set(found.map(c=>c.file.document_id?'document:'+c.file.document_id:c.file.vault_document_id?'vault:'+c.file.vault_document_id:'file:'+c.file.id));
  // One document can have several pages/photos; competing document versions are ambiguous.
  if(groups.size===1)assignments[req.id]=[...new Set(found.map(c=>c.file.id))];
 }
 return {...draft,assignments};
}
