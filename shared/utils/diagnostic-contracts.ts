
import type { ContractStatus } from '../types/diagnostic-contracts';
export function moscowToday(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');
}
export function contractStatus(date:string,finish:string|null,today=moscowToday()):ContractStatus{
 if(finish&&finish<=today)return 'COMPLETED';
 return date>today?'PLANNED':'ACTIVE';
}
export function normalizeCounterparty(name:string):string{
 return name.normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[«»„“”"']/g,'').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
}
