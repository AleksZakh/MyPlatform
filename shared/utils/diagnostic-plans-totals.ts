import type {CalendarRow} from '../types/diagnostic-calendar';
import {hourUnits,hourLabel} from './diagnostic-trip-lifecycle';
export interface PlansHoursSummary {hours:string;missing:number;shared:number;estimated:number;factOnly:number}
/** Same value as the hours column: plan, otherwise fact. Accumulate before pagination. */
export class PlansHoursTotal {
 private units=BigInt('0');private missing=0;private shared=0;private estimated=0;private factOnly=0;
 add(row:Pick<CalendarRow,'planHours'|'factHours'|'planShared'|'factShared'|'planEstimated'>){
  const value=row.planHours??row.factHours;
  if(value===null){this.missing++;return;}
  try{this.units+=hourUnits(value);}catch{this.missing++;return;}
  const plan=row.planHours!==null;
  if(plan?row.planShared:row.factShared)this.shared++;
  if(plan&&row.planEstimated)this.estimated++;
  if(!plan)this.factOnly++;
 }
 result():PlansHoursSummary{return {hours:hourLabel(this.units),missing:this.missing,shared:this.shared,estimated:this.estimated,factOnly:this.factOnly};}
}
