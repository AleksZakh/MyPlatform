import type {H3Event} from 'h3';
import {createError} from 'h3';
import {prisma} from '../../utils/prisma';
import {calendarRoster} from './calendar-roster';
import {calendarMonth,buildCalendar,calendarRows,calendarSortKeys} from '../../../shared/utils/diagnostic-calendar';
import {diagnosticWorkStatus} from '../../../shared/utils/diagnostic-contract-table';
import type {CalendarWork,CalendarTrip,CalendarSort,CalendarResult} from '../../../shared/types/diagnostic-calendar';
export async function readCalendar(event:H3Event,q:Record<string,unknown>):Promise<CalendarResult>{
 const month=typeof q.month==='string'?q.month:'';let bounds;try{bounds=calendarMonth(month);}catch(e){throw createError({statusCode:400,message:(e as Error).message});}
 const integer=(v:unknown,defaultValue:number,max:number)=>{if(v===undefined)return defaultValue;if(typeof v!=='string'||!/^\d+$/.test(v)||Number(v)<1||Number(v)>max)throw createError({statusCode:400,message:'Некорректный параметр календарного плана.'});return Number(v);};
 const employeeId=q.employeeId===undefined?null:integer(q.employeeId,0,2147483647),page=integer(q.page,1,100000),pageSize=integer(q.pageSize,200,500);
 const sort=(q.sort===undefined?'employeeName':q.sort) as CalendarSort;if(!calendarSortKeys.includes(sort))throw createError({statusCode:400,message:'Неизвестный столбец сортировки.'});
 const status=typeof q.status==='string'?q.status:'';if(!['','unplanned','planned','in_progress','completed','overdue','unknown'].includes(status))throw createError({statusCode:400,message:'Неизвестный статус.'});
 const search=typeof q.search==='string'?q.search.trim().slice(0,200):'',roster=await calendarRoster(event);
 if(employeeId!==null&&!roster.employees.some(e=>e.id===employeeId))throw createError({statusCode:400,message:'Сотрудник не входит в доступный состав группы ОДИС. Обновите список.'});
 if(!roster.employees.length)return {month,employees:[],rows:[],total:0,monthTotal:0,page:1,pageSize,warning:roster.warning,unresolvedWorks:0,unlinkedTravelWorks:0};
 const start=new Date(bounds.start),finish=new Date(bounds.finish);
 const overlap=(a:string,b:string)=>[{[a]:{lte:finish},[b]:{gte:start}},{[a]:{gte:start,lte:finish},[b]:null},{[a]:null,[b]:{gte:start,lte:finish}}];
 const period={OR:[...overlap('planStart','planFinish'),...overlap('factStart','factFinish')]};
 const fields={id:true,planStart:true,planFinish:true,planHours:true,planExecutor:true,factStart:true,factFinish:true,factHours:true,factExecutor:true,status:true} as const;
 const [contracts,structures,trips]=await prisma.$transaction([
  prisma.diagnosticContractWork.findMany({where:{deletedAt:null,contract:{deletedAt:null},...period},select:{...fields,contractId:true,code:true,name:true,contract:{select:{number:true}}}}),
  prisma.diagnosticStructureWork.findMany({where:{deletedAt:null,tripId:null,contractStructure:{deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}},...period},select:{...fields,contractStructureId:true,workCodeSnapshot:true,workNameSnapshot:true,contractStructure:{select:{contractId:true,contract:{select:{number:true}},structure:{select:{code:true}}}}}}),
  prisma.diagnosticTrip.findMany({where:{deletedAt:null,contract:{deletedAt:null},start:{lte:finish},finish:{gte:start},participants:{some:{userId:{in:roster.employees.map(e=>e.id)}}}},select:{id:true,number:true,contractId:true,contract:{select:{number:true}},start:true,finish:true,status:true,participants:{select:{userId:true,factHours:true}}}}),
 ],{isolationLevel:'RepeatableRead'});
 const day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
 const values=(w:typeof contracts[number]|typeof structures[number])=>({planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor,status:diagnosticWorkStatus(w.status).key});
 const workRows:CalendarWork[]=[...contracts.map(w=>({...values(w),id:w.id,kind:'contract' as const,contractId:w.contractId,contractNumber:w.contract.number,structureCode:'',code:w.code,name:w.name})),...structures.map(w=>({...values(w),id:w.id,linkId:w.contractStructureId,kind:'structure' as const,contractId:w.contractStructure.contractId,contractNumber:w.contractStructure.contract.number,structureCode:w.contractStructure.structure.code??'',code:w.workCodeSnapshot,name:w.workNameSnapshot}))];
 const tripRows:CalendarTrip[]=trips.map(t=>({id:t.id,number:t.number,contractId:t.contractId,contractNumber:t.contract.number,start:day(t.start)!,finish:day(t.finish)!,status:t.status,participants:t.participants.map(p=>({id:p.userId,factHours:p.factHours?.toString()??null}))}));
 const built=buildCalendar(month,roster.employees,roster.users,workRows,tripRows),filtered=calendarRows(built.rows,{employeeId,search,status,sort,descending:q.descending==='true'}),last=Math.max(1,Math.ceil(filtered.length/pageSize)),actualPage=Math.min(page,last);
 const counts=new Map<number,number>();for(const r of built.rows)counts.set(r.employeeId,(counts.get(r.employeeId)||0)+1);
 return {month,employees:roster.employees.map(e=>({...e,count:counts.get(e.id)||0})),rows:filtered.slice((actualPage-1)*pageSize,actualPage*pageSize),total:filtered.length,monthTotal:built.rows.length,page:actualPage,pageSize,warning:roster.warning,unresolvedWorks:built.unresolvedWorks,unlinkedTravelWorks:built.unlinkedTravelWorks};
}
