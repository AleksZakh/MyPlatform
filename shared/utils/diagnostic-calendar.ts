import type {CalendarUser,CalendarEmployee,CalendarWork,CalendarTrip,CalendarRow,CalendarSort} from '../types/diagnostic-calendar';
import {tripInitials,tripDay} from './diagnostic-trips';
import {tripDefaultHours} from './diagnostic-trip-lifecycle';
export const calendarName=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru').replace(/ё/g,'е');
export function calendarMonth(month:string){if(!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('Выберите месяц в формате ГГГГ-ММ (1900–2199).');const y=Number(month.slice(0,4)),m=Number(month.slice(5));return {start:month+'-01',finish:`${month}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`};}
export function calendarOverlaps(start:string|null,finish:string|null,month:string){const bounds=calendarMonth(month);const a=start||finish,b=finish||start;return !!a&&!!b&&tripDay(a)&&tripDay(b)&&a<=b&&a<=bounds.finish&&b>=bounds.start;}
export function calendarShortName(name:string){const parts=name.trim().split(/\s+/);if(parts.length<2||parts.slice(1).some(p=>p.includes('.')))return name;return parts[0]+' '+parts.slice(1).map(p=>p[0]+'.').join('');}
export function calendarResolver(users:CalendarUser[]){
 const full=new Map<string,Set<number>>(),short=new Map<string,Set<number>>();
 const add=(map:Map<string,Set<number>>,key:string,id:number)=>{if(!key)return;const s=map.get(key)||new Set<number>();s.add(id);map.set(key,s);};
 for(const u of users){add(full,calendarName(u.name),u.id);if(u.login)add(full,calendarName(u.login),u.id);if(u.name.trim().split(/\s+/).length>=2)add(short,tripInitials(u.name),u.id);}
 // Never reduce an unknown full name to initials: a different person may share them.
 // Split lists before trying initials, so their combined tokens cannot resemble one person.
 const match=(v:string)=>full.get(calendarName(v))||(/^[^\s;,]+\s+(?:[а-яёa-z]\.\s*){1,3}$/iu.test(v.trim())?short.get(tripInitials(v)):undefined);
 return (text:string)=>{const direct=full.get(calendarName(text));const tokens=direct?[text]:text.split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);const ids=new Set<number>();let unresolved=false;
  for(const token of tokens){const found=match(token);if(found?.size===1)ids.add([...found][0]!);else unresolved=true;}
  return {ids:[...ids],unresolved};
 };
}
export function buildCalendar(month:string|null,employees:CalendarEmployee[],users:CalendarUser[],works:CalendarWork[],trips:CalendarTrip[]){
 // A null month is the employee work list: include assignments without dates.
 if(month!==null)calendarMonth(month);const inPeriod=(a:string|null,b:string|null)=>month===null||calendarOverlaps(a,b,month);const roster=new Map(employees.map(e=>[e.id,e.name])),resolve=calendarResolver(users);const rows:CalendarRow[]=[];let unresolvedWorks=0,unlinkedTravelWorks=0;
 for(const w of works){
  if(!inPeriod(w.planStart,w.planFinish)&&!inPeriod(w.factStart,w.factFinish))continue;
  const plan=resolve(w.planExecutor),fact=resolve(w.factExecutor);
  const missingPlan=(month===null||!!(w.planStart||w.planFinish))&&(!w.planExecutor.trim()||plan.unresolved),missingFact=!!(w.factStart||w.factFinish||(month===null&&w.factExecutor.trim()))&&(!w.factExecutor.trim()||fact.unresolved);
  if(missingPlan||missingFact)unresolvedWorks++;
  let shown=false;
  for(const id of new Set([...plan.ids,...fact.ids])){
   if(!roster.has(id))continue;const isPlan=plan.ids.includes(id),isFact=fact.ids.includes(id);
   if(!(isPlan&&inPeriod(w.planStart,w.planFinish))&&!(isFact&&inPeriod(w.factStart,w.factFinish)))continue;
   const {planExecutor:_,factExecutor:__,...data}=w;
   rows.push({...data,key:`${w.kind}:${w.id}:${id}`,employeeId:id,employeeName:roster.get(id)!,planStart:isPlan?w.planStart:null,planFinish:isPlan?w.planFinish:null,planHours:isPlan?w.planHours:null,factStart:isFact?w.factStart:null,factFinish:isFact?w.factFinish:null,factHours:isFact?w.factHours:null,planShared:isPlan&&(plan.ids.length>1||plan.unresolved),factShared:isFact&&(fact.ids.length>1||fact.unresolved),planEstimated:false});shown=true;
  }
  if(shown&&w.kind==='structure'&&['301','302'].includes(w.code))unlinkedTravelWorks++;
 }
 for(const t of trips){if(!inPeriod(t.start,t.finish))continue;for(const p of t.participants){if(!roster.has(p.id))continue;
  rows.push({id:t.id,key:`trip:${t.id}:${p.id}`,kind:'trip',contractId:t.contractId,contractNumber:t.contractNumber,structureCode:'',code:t.start===t.finish?'302':'301',name:`${t.start===t.finish?'Однодневный выезд':'Командировка'} (${t.number})`,status:t.status==='COMPLETED'?'completed':'planned',employeeId:p.id,employeeName:roster.get(p.id)!,planStart:t.start,planFinish:t.finish,planHours:tripDefaultHours(t.start,t.finish),factStart:t.status==='COMPLETED'?t.start:null,factFinish:t.status==='COMPLETED'?t.finish:null,factHours:t.status==='COMPLETED'?p.factHours:null,planShared:false,factShared:false,planEstimated:true});
 }}
 return {rows,unresolvedWorks,unlinkedTravelWorks};
}
export const calendarSortKeys:CalendarSort[]=['employeeName','contractNumber','kind','structureCode','status','name','planStart','planFinish','planHours','factStart','factFinish','factHours'];
export function calendarRows(rows:CalendarRow[],filter:{employeeId:number|null;search:string;status:string;sort:CalendarSort;descending:boolean}){
 const q=calendarName(filter.search);return rows.filter(r=>(filter.employeeId===null||r.employeeId===filter.employeeId)&&(!filter.status||r.status===filter.status)&&calendarName([r.employeeName,calendarShortName(r.employeeName),r.contractNumber,r.name,r.structureCode].join(' ')).includes(q)).sort((a,b)=>{const x=a[filter.sort],y=b[filter.sort];if(x==null&&y!=null)return 1;if(y==null&&x!=null)return -1;const result=filter.sort.endsWith('Hours')?Number(x??0)-Number(y??0):String(x??'').localeCompare(String(y??''),'ru',{numeric:true});return result*(filter.descending?-1:1)||a.key.localeCompare(b.key);});
}
