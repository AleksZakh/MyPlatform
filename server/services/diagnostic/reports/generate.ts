import {randomUUID} from 'node:crypto';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../../utils/prisma';
import {tripDateLabel,tripDay} from '../../../../shared/utils/diagnostic-trips';
import {tripToday} from '../../../../shared/utils/diagnostic-trip-lifecycle';
import {earliestPlannedStart,reportIntervals,reportPeriod,reportWeek,reportTypes,type ReportParams,type SavedReport} from '../../../../shared/utils/diagnostic-reports';
import {reportRoster} from './roster';
import {workSourcePeriod,tripSourcePeriod} from '../plans-source-period';
import {reportTable,type Work} from './table';

export function parseParams(v:Partial<ReportParams>|null):ReportParams{
  if(!v||typeof v.kind!=='string'||typeof v.interval!=='string'||!Object.hasOwn(reportTypes,v.kind??'')||!Object.hasOwn(reportIntervals,v.interval??'')||
     !tripDay(v.from)||!tripDay(v.to)||v.from>v.to||
     (v.employeeIds!==null&&(!Array.isArray(v.employeeIds)||!v.employeeIds.length||
      !v.employeeIds.every(id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647)))){
    throw createError({statusCode:400,message:'Проверьте вид отчёта, период и сотрудников.'});
  }
  if(v.kind==='planned'){
    const period=reportPeriod(v.interval,v.from,reportWeek(v.from),v.from.slice(0,7),v.from,v.to);
    if(!period||period.from!==v.from||period.to!==v.to||v.from<earliestPlannedStart(v.interval,tripToday())){
      throw createError({statusCode:400,message:'Для запланированных работ выберите текущий или будущий период.'});
    }
  }
  return {kind:v.kind!,interval:v.interval!,from:v.from,to:v.to,employeeIds:v.employeeIds?[...new Set(v.employeeIds)]:null};
}
const day=(value:Date|null)=>value?.toISOString().slice(0,10)??null;
export async function generateReport(event:H3Event,params:ReportParams):Promise<SavedReport>{
  const roster=await reportRoster(event);
  if(params.employeeIds?.some(id=>!roster.employees.some(p=>p.id===id)))throw createError({statusCode:400,message:'Состав ОДИС изменился. Обновите список сотрудников.'});
  const period={mode:'period' as const,from:params.from,to:params.to};
  const overlaps=workSourcePeriod(period);
  const summaryDates=(params.kind==='summary'||params.kind==='external')?{OR:[overlaps,{factFinish:null,factStart:{lte:new Date(params.to)},status:{in:['in_progress','active','performed','overdue'],mode:'insensitive' as const}}]}:overlaps;
  const dates=params.kind==='completed'?{factFinish:{gte:new Date(params.from),lte:new Date(params.to)}}:summaryDates;
  const fields={planStart:true,planFinish:true,factStart:true,factFinish:true,planExecutor:true,factExecutor:true,factHours:true,note:true,status:true} as const;
  const base={...dates,deletedAt:null,tripCompletion:null};
  const works:Work[]=await prisma.$transaction(async tx=>{
    const list:Work[]=[];
    const values=(w:{planStart:Date|null;planFinish:Date|null;factStart:Date|null;factFinish:Date|null;factHours:{toString():string}|null;planExecutor:string;factExecutor:string;status:string;note:string})=>({
      planStart:day(w.planStart),planFinish:day(w.planFinish),factStart:day(w.factStart),factFinish:day(w.factFinish),
      factHours:w.factHours?.toString()??null,planExecutor:w.planExecutor,factExecutor:w.factExecutor,note:w.note,status:w.status
    });
    let after=0;
    for(;;){
      const batch=await tx.diagnosticContractWork.findMany({where:{...base,id:{gt:after},contract:{deletedAt:null}},orderBy:{id:'asc'},take:500,
        select:{...fields,id:true,name:true,contractId:true,contract:{select:{number:true}}}});
      for(const w of batch)list.push({...values(w),contractId:w.contractId,contractNumber:w.contract.number,name:w.name,structure:''});
      if(batch.length<500)break;
      after=batch[batch.length-1]!.id;
    }
    after=0;
    for(;;){
      const batch=await tx.diagnosticStructureWork.findMany({where:{...base,id:{gt:after},tripId:null,contractStructure:{deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}}},orderBy:{id:'asc'},take:500,
        select:{...fields,id:true,workNameSnapshot:true,contractStructure:{select:{contractId:true,contract:{select:{number:true}},structure:{select:{code:true}}}}}});
      for(const w of batch){const link=w.contractStructure;list.push({...values(w),contractId:link.contractId,contractNumber:link.contract.number,name:w.workNameSnapshot,structure:link.structure.code});}
      if(batch.length<500)break;
      after=batch[batch.length-1]!.id;
    }
    if(params.kind!=='external'){
      const trips=await tx.diagnosticTrip.findMany({where:{...tripSourcePeriod(period),deletedAt:null,contract:{deletedAt:null}},orderBy:{id:'asc'},
        select:{number:true,contractId:true,contract:{select:{number:true}},start:true,finish:true,status:true,note:true,participants:{select:{userId:true,factHours:true}}}});
      for(const t of trips){
        const done=t.status==='COMPLETED';
        for(const p of t.participants)list.push({contractId:t.contractId,contractNumber:t.contract.number,
          name:(day(t.start)===day(t.finish)?'Однодневный выезд':'Командировка')+' ('+t.number+')',structure:'',note:t.note,
          status:done?'completed':t.status==='PLANNED'?'planned':t.status,planStart:day(t.start),planFinish:day(t.finish),
          factStart:done?day(t.start):null,factFinish:done?day(t.finish):null,planExecutor:'',factExecutor:'',
          factHours:p.factHours?.toString()??null,participant:p.userId});
      }
    }
    return list;
  },{isolationLevel:'RepeatableRead',timeout:60000});
  const table=reportTable(params,roster.employees,roster.users,works);
  if(roster.warning)table.warnings.push(roster.warning);
  const title=reportTypes[params.kind]+' · '+tripDateLabel(params.from)+(params.from===params.to?'':' — '+tripDateLabel(params.to));
  return {id:randomUUID(),createdAt:new Date().toISOString(),params,title,...table};
}
