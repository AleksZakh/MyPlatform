import {tripDay} from './diagnostic-trips';
import {tripToday} from './diagnostic-trip-lifecycle';
import type {CalendarRow} from '../types/diagnostic-calendar';
export type PlansPeriodMode='worklist'|'period'|'all';
export interface PlansPeriod {mode:PlansPeriodMode;from:string;to:string}
export function plansWeek(today=tripToday()){
 if(!tripDay(today))throw Error('Некорректная текущая дата.');
 const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const from=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);return {from,to:d.toISOString().slice(0,10)};
}
export function parsePlansPeriod(q:Record<string,unknown>,today=tripToday()):PlansPeriod{
 const mode=q.periodMode??'worklist';if(!['worklist','period','all'].includes(mode as string))throw Error('Неизвестный режим периода.');
 const week=plansWeek(today);if(mode!=='period')return {mode:mode as PlansPeriodMode,...week};
 if(!tripDay(q.from)||!tripDay(q.to)||q.from>q.to)throw Error('Укажите корректный период: начало не позже окончания.');
 return {mode,from:q.from,to:q.to};
}
function interval(a:string|null,b:string|null){const from=a||b,to=b||a;return from&&to&&tripDay(from)&&tripDay(to)&&from<=to?{from,to}:null;}
export function matchesPlansPeriod(row:Pick<CalendarRow,'planStart'|'planFinish'|'factStart'|'factFinish'|'status'>,filter:PlansPeriod){
 if(filter.mode==='all')return true;
 const plan=interval(row.planStart,row.planFinish),fact=interval(row.factStart,row.factFinish);
 const overlaps=(v:ReturnType<typeof interval>)=>!!v&&v.from<=filter.to&&v.to>=filter.from;
 if(filter.mode==='period')return overlaps(plan)||overlaps(fact);
 // Include open assignments even without dates; never hide them as "old".
 if(row.status!=='completed')return true;
 // Current week in any status, plus work planned for any future period.
 return !!plan&&plan.to>=filter.from||overlaps(fact);
}
