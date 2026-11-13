import type {TripInput} from '../types/diagnostic-trips';
export const tripText=(v:string)=>v.normalize('NFKC').trim().replace(/\s+/g,' ');
export const tripLookup=(v:string)=>tripText(v).toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[‐‑–—]/g,'-').replace(/\s*([-./])\s*/g,'$1');
export const tripDay=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number(v.slice(0,4))>=1900&&Number(v.slice(0,4))<=2200&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const tripDateLabel=(v:string|null)=>v?v.split('-').reverse().join('.'):'—';
export function tripInitials(v:string){const p=tripText(v).split(' ');if(/^(?:[а-яёa-z]\.\s*){1,3}$/iu.test(p.slice(1).join(' ')))return tripLookup(v).replace(/\s/g,'');return p.length>=2?tripLookup(p[0]+' '+p.slice(1).map(s=>s[0]+'.').join('')).replace(/\s/g,''):tripLookup(v).replace(/\s/g,'');}
export function parseTripInput(v:any):TripInput{
 if(!v||typeof v!=='object')throw Error('Не переданы данные командировки.');
 const id=(value:unknown,label:string)=>{const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>2147483647)throw Error(label);return n;};
 const ids=(a:any,limit:number,label:string)=>{if(!Array.isArray(a)||a.length>limit)throw Error('Некорректный список: '+label);const b=a.map(n=>id(n,'Некорректный идентификатор: '+label+'. Обновите список и выберите запись заново.'));if(new Set(b).size!==b.length)throw Error('Повторяющиеся записи: '+label);return b.sort((a,b)=>a-b);};
 const text=(k:string,limit=10000)=>{if(typeof v[k]!=='string'||v[k].length>limit)throw Error('Некорректное поле '+k);return v[k].trim();};
 if(!tripDay(v.start)||!tripDay(v.finish)||v.start>v.finish)throw Error('Проверьте даты начала и окончания командировки.');
 if(typeof v.noStructures!=='boolean')throw Error('Укажите режим выбора сооружений.');
 const contractId=id(v.contractId,'Выберите договор в поле «Номер договора».'),executorId=id(v.executorId,'Выберите организацию-исполнителя.');
 const participantIds=ids(v.participantIds,200,'участники'),structureIds=ids(v.structureIds,20000,'сооружения');
 if(!participantIds.length)throw Error('Выберите хотя бы одного участника.');
 if(v.noStructures?structureIds.length:!structureIds.length)throw Error('Выберите сооружения либо отметьте «Без указания сооружений».');
 return {contractId,executorId,start:v.start,finish:v.finish,noStructures:v.noStructures,destination:text('destination'),assignment:text('assignment'),equipment:text('equipment'),transport:text('transport'),accommodation:text('accommodation'),note:text('note'),participantIds,structureIds};
}
export function tripCanonical(v:TripInput,status:string){return {contractId:v.contractId,executorId:v.executorId,start:v.start,finish:v.finish,noStructures:v.noStructures,destination:v.noStructures?v.destination.trim():'',assignment:v.assignment.trim(),equipment:v.equipment.trim(),transport:v.transport.trim(),accommodation:v.accommodation.trim(),note:v.note.trim(),participantIds:[...v.participantIds].sort((a,b)=>a-b),structureIds:[...v.structureIds].sort((a,b)=>a-b),status};}
