export interface CalendarEmployee {id:number;name:string}
export interface CalendarUser extends CalendarEmployee {login?:string|null}
export interface CalendarWork {
 linkId?:number;id:number;kind:'contract'|'structure';contractId:number;contractNumber:string;structureCode:string;code:string;name:string;status:string;
 planStart:string|null;planFinish:string|null;planHours:string|null;planExecutor:string;
 factStart:string|null;factFinish:string|null;factHours:string|null;factExecutor:string;
}
export interface CalendarTrip {id:number;number:string;contractId:number;contractNumber:string;start:string;finish:string;status:string;participants:{id:number;factHours:string|null}[]}
export interface CalendarRow extends Omit<CalendarWork,'kind'|'planExecutor'|'factExecutor'> {
 key:string;kind:'contract'|'structure'|'trip';employeeId:number;employeeName:string;planShared:boolean;factShared:boolean;planEstimated:boolean;
}
export type CalendarSort='employeeName'|'contractNumber'|'kind'|'structureCode'|'status'|'name'|'planStart'|'planFinish'|'planHours'|'factStart'|'factFinish'|'factHours';
export interface CalendarResult {month:string;employees:(CalendarEmployee&{count:number})[];rows:CalendarRow[];total:number;monthTotal:number;page:number;pageSize:number;warning:string|null;unresolvedWorks:number;unlinkedTravelWorks:number}
