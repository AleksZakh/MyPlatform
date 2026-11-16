import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {getAccessActor} from '../access-control.service';
import {calendarRoster} from './calendar-roster';
import {buildCalendar,calendarRows} from '../../../shared/utils/diagnostic-calendar';
import {diagnosticWorkStatus} from '../../../shared/utils/diagnostic-contract-table';
import type {CalendarWork,CalendarTrip} from '../../../shared/types/diagnostic-calendar';
import type {EmployeePlansResult,PlanWorkRow} from '../../../shared/types/diagnostic-plans';
export async function readEmployeePlans(event:H3Event,q:Record<string,unknown>):Promise<EmployeePlansResult>{
 const selection=q.employee===undefined?'me':q.employee;
 if(typeof selection!=='string'||!['me','all'].includes(selection)&&(!/^[1-9]\d*$/.test(selection)||!Number.isSafeInteger(Number(selection))||Number(selection)>2147483647))throw createError({statusCode:400,message:'Некорректный сотрудник.'});
 const page=q.page===undefined?1:Number(q.page);if(q.page!==undefined&&(typeof q.page!=='string'||!/^\d+$/.test(q.page))||!Number.isSafeInteger(page)||page<1||page>100000)throw createError({statusCode:400,message:'Некорректная страница.'});
 if(q.search!==undefined&&typeof q.search!=='string')throw createError({statusCode:400,message:'Некорректная строка поиска.'});
 const search=typeof q.search==='string'?q.search.trim().slice(0,200):'';
 const {user}=await getAccessActor(event),roster=await calendarRoster(event),employeeId=selection==='me'?user.id:selection==='all'?null:Number(selection);
 if(selection!=='me'&&employeeId!==null&&!roster.employees.some(p=>p.id===employeeId))throw createError({statusCode:400,message:'Сотрудник не входит в подтверждённый состав группы ОДИС. Обновите список.'});
 const currentUser={id:user.id,name:roster.users.find(p=>p.id===user.id)?.name||user.login||String(user.id)},pageSize=200;
 let warning=roster.warning;
 if(selection==='me'&&!roster.employees.some(p=>p.id===user.id))warning=[warning,'Ваше членство в группе ОДИС не подтверждено. Личный список пуст; проверьте состав группы.'].filter(Boolean).join(' ');
 const empty={currentUser,employees:roster.employees,selection,rows:[],total:0,page:1,pageSize,warning,unresolvedWorks:0,unlinkedTravelWorks:0};
 if(!roster.employees.length||selection==='me'&&!roster.employees.some(p=>p.id===user.id))return empty;
 const fields={id:true,planStart:true,planFinish:true,planHours:true,planExecutor:true,factStart:true,factFinish:true,factHours:true,factExecutor:true,status:true,note:true} as const;
 // Lean selects only: do not read legacy JSON/history for the employee register.
 const [contracts,structures,trips]=await prisma.$transaction([
  prisma.diagnosticContractWork.findMany({where:{deletedAt:null,contract:{deletedAt:null}},select:{...fields,contractId:true,code:true,name:true,contract:{select:{number:true}}}}),
  prisma.diagnosticStructureWork.findMany({where:{deletedAt:null,tripId:null,contractStructure:{deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}}},select:{...fields,warning:true,workCodeSnapshot:true,workNameSnapshot:true,contractStructure:{select:{contractId:true,contract:{select:{number:true}},structure:{select:{code:true,location:true}}}}}}),
  prisma.diagnosticTrip.findMany({where:{deletedAt:null,contract:{deletedAt:null},participants:{some:{userId:{in:employeeId===null?roster.employees.map(p=>p.id):[employeeId]}}}},select:{id:true,number:true,contractId:true,contract:{select:{number:true}},start:true,finish:true,status:true,note:true,participants:{select:{userId:true,factHours:true}}}}),
 ],{isolationLevel:'RepeatableRead'});
 const day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
 const values=(w:typeof contracts[number]|typeof structures[number])=>({planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor,status:diagnosticWorkStatus(w.status).key});
 const works:CalendarWork[]=[...contracts.map(w=>({...values(w),id:w.id,kind:'contract' as const,contractId:w.contractId,contractNumber:w.contract.number,structureCode:'',code:w.code,name:w.name})),...structures.map(w=>({...values(w),id:w.id,kind:'structure' as const,contractId:w.contractStructure.contractId,contractNumber:w.contractStructure.contract.number,structureCode:w.contractStructure.structure.code,code:w.workCodeSnapshot,name:w.workNameSnapshot}))];
 const tripRows:CalendarTrip[]=trips.map(t=>({id:t.id,number:t.number,contractId:t.contractId,contractNumber:t.contract.number,start:day(t.start)!,finish:day(t.finish)!,status:t.status,participants:t.participants.map(p=>({id:p.userId,factHours:p.factHours?.toString()??null}))}));
 const info=new Map<string,{note:string;location:string;warning:string}>();for(const w of contracts)info.set('contract:'+w.id,{note:w.note,location:'',warning:''});for(const w of structures)info.set('structure:'+w.id,{note:w.note,location:w.contractStructure.structure.location,warning:w.warning});for(const t of trips)info.set('trip:'+t.id,{note:t.note,location:'',warning:''});
 const built=buildCalendar(null,roster.employees,roster.users,works,tripRows),filtered=calendarRows(built.rows,{employeeId,search,status:'',sort:'planStart',descending:true});
 const actualPage=Math.min(page,Math.max(1,Math.ceil(filtered.length/pageSize)));
 const rows:PlanWorkRow[]=filtered.slice((actualPage-1)*pageSize,actualPage*pageSize).map(r=>({...r,...info.get(r.kind+':'+r.id)!}));
 return {currentUser,employees:roster.employees,selection,rows,total:filtered.length,page:actualPage,pageSize,warning,unresolvedWorks:built.unresolvedWorks,unlinkedTravelWorks:built.unlinkedTravelWorks};
}
