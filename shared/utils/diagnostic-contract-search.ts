
import {directionLabels,contractStatuses,type ContractRecord} from '../types/diagnostic-contracts';
export function contractDateTime(value:string):string{
 return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value));
}
const normalize=(s:string)=>s.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
export function matchesContract(row:ContractRecord,query:string):boolean{
 const text=[...Object.values(row).filter(v=>v!=null),directionLabels[row.direction],contractStatuses.find(s=>s.key===row.status)?.label,
 ...[row.date,row.start,row.finish].filter((d):d is string=>!!d).map(d=>d.split('-').reverse().join('.')),
 ...[row.createdAt,row.updatedAt].filter(Boolean).map(contractDateTime),
 ...[row.amount,row.hours].filter((v):v is string=>v!=null).flatMap(v=>[v.replace('.',','),new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(v))])].join(' ');
 return normalize(text).includes(normalize(query));
}
