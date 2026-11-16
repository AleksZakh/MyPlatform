import type {PlansPeriod} from '../utils/diagnostic-plans-period';
import type {PlansHoursSummary} from '../utils/diagnostic-plans-totals';
import type {CalendarEmployee,CalendarRow} from './diagnostic-calendar';
export interface PlanWorkRow extends CalendarRow {location:string;note:string;warning:string;documentType:string;regionalCenter:string;regionalCenterSource:'database'|'ad'|'missing'|'unavailable'}
export interface EmployeePlansResult {
 period:PlansPeriod;currentUser:{id:number;name:string};employees:CalendarEmployee[];selection:string;
 rows:PlanWorkRow[];total:number;hoursSummary:PlansHoursSummary;page:number;pageSize:number;warning:string|null;
 nextCursor:string|null;unresolvedWorks:number;unlinkedTravelWorks:number;
}
