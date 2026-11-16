import type {CalendarEmployee,CalendarRow} from './diagnostic-calendar';
export interface PlanWorkRow extends CalendarRow {location:string;note:string;warning:string}
export interface EmployeePlansResult {
 currentUser:{id:number;name:string};employees:CalendarEmployee[];selection:string;
 rows:PlanWorkRow[];total:number;page:number;pageSize:number;warning:string|null;
 unresolvedWorks:number;unlinkedTravelWorks:number;
}
