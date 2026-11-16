import {createError,setHeader,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {getAccessActor} from '../access-control.service';
import {calendarRoster} from './calendar-roster';
import {buildCalendar,calendarRows} from '../../../shared/utils/diagnostic-calendar';
import {diagnosticWorkStatus} from '../../../shared/utils/diagnostic-contract-table';
import {PLAN_BATCH,PLAN_PAGE,PlanPageCollector,planEmployeeFilter,planContext,readPlanCursor,writePlanCursor} from './plans-page';
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
 const currentUser={id:user.id,name:roster.users.find(p=>p.id===user.id)?.name||user.login||String(user.id)},pageSize=PLAN_PAGE;
 let warning=roster.warning;
 if(selection==='me'&&!roster.employees.some(p=>p.id===user.id))warning=[warning,'Ваше членство в группе ОДИС не подтверждено. Личный список пуст; проверьте состав группы.'].filter(Boolean).join(' ');
 const empty={currentUser,employees:roster.employees,selection,rows:[],total:0,page:1,pageSize,warning,unresolvedWorks:0,unlinkedTravelWorks:0,nextCursor:null};
 const context=planContext(user.id,selection,search),after=readPlanCursor(q.cursor,context);
 if(page>1&&!after)throw createError({statusCode:400,message:'Обновите список перед переходом на следующую страницу.'});
 if(!roster.employees.length||selection==='me'&&!roster.employees.some(p=>p.id===user.id))return empty;

 const people=employeeId===null?roster.employees:roster.employees.filter(p=>p.id===employeeId);
 const person=employeeId===null?null:roster.users.find(p=>p.id===employeeId)??null;
 const employeeFilter=planEmployeeFilter(person),collector=new PlanPageCollector(after);
 let cancelled=!!event.node.res.destroyed;const deadline=Date.now()+60000;
 const onClose=()=>{if(!event.node.res.writableFinished)cancelled=true;};
 event.node.res.on('close',onClose);
 const check=()=>{if(cancelled)throw createError({statusCode:499,message:'Запрос отменён.'});if(Date.now()>deadline)throw createError({statusCode:504,message:'Загрузка заняла слишком много времени. Выберите сотрудника и повторите запрос.'});};
 const fields={id:true,planStart:true,planFinish:true,planHours:true,planExecutor:true,factStart:true,factFinish:true,factHours:true,factExecutor:true,status:true} as const;
 const day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
 const values=(w:{planStart:Date|null;planFinish:Date|null;planHours:{toString():string}|null;planExecutor:string;factStart:Date|null;factFinish:Date|null;factHours:{toString():string}|null;factExecutor:string;status:string})=>({planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor,status:diagnosticWorkStatus(w.status).key});
 const accept=(works:CalendarWork[],trips:CalendarTrip[]=[])=>{check();const built=buildCalendar(null,people,roster.users,works,trips);for(const row of calendarRows(built.rows,{employeeId,search,status:'',sort:'planStart',descending:true}))collector.add(row);};
 try{check();return await prisma.$transaction(async tx=>{
  // LOCAL settings expire with this transaction; never change the application's pool defaults.
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  await tx.$executeRaw`SET LOCAL work_mem = '1MB'`;
  await tx.$executeRaw`SET LOCAL max_parallel_workers_per_gather = 0`;
  await tx.$executeRaw`SET LOCAL statement_timeout = '15000ms'`;
  await tx.$executeRaw`SET LOCAL lock_timeout = '1000ms'`;
  // One plans scan across all PM2 workers; failed contenders do not start large reads.
  const gate=await tx.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(71916, 2) AS locked`;
  if(!gate[0]?.locked){setHeader(event,'Retry-After',1);throw createError({statusCode:503,message:'Предыдущая загрузка ещё завершается. Повторите запрос через несколько секунд.',data:{code:'PLANS_BUSY'}});}
  let last:number|undefined;
  for(;;){check();const boundary:{id?:{lt:number}}=last===undefined?{}:{id:{lt:last}};const batch=await tx.diagnosticContractWork.findMany({where:{deletedAt:null,contract:{deletedAt:null},...employeeFilter,...boundary},orderBy:{id:'desc'},take:PLAN_BATCH,select:{...fields,contractId:true,code:true,name:true,contract:{select:{number:true}}}});
   accept(batch.map(w=>({...values(w),id:w.id,kind:'contract',contractId:w.contractId,contractNumber:w.contract.number,structureCode:'',code:w.code,name:w.name})));
   if(batch.length<PLAN_BATCH)break;last=batch[batch.length-1]!.id;
  }
  last=undefined;
  for(;;){check();const boundary:{id?:{lt:number}}=last===undefined?{}:{id:{lt:last}};const batch=await tx.diagnosticStructureWork.findMany({where:{deletedAt:null,tripId:null,contractStructure:{deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}},...employeeFilter,...boundary},orderBy:{id:'desc'},take:PLAN_BATCH,select:{...fields,workCodeSnapshot:true,workNameSnapshot:true,contractStructure:{select:{contractId:true,contract:{select:{number:true}},structure:{select:{code:true}}}}}});
   accept(batch.map(w=>({...values(w),id:w.id,kind:'structure',contractId:w.contractStructure.contractId,contractNumber:w.contractStructure.contract.number,structureCode:w.contractStructure.structure.code,code:w.workCodeSnapshot,name:w.workNameSnapshot})));
   if(batch.length<PLAN_BATCH)break;last=batch[batch.length-1]!.id;
  }
  last=undefined;
  for(;;){check();const boundary:{id?:{lt:number}}=last===undefined?{}:{id:{lt:last}};const batch=await tx.diagnosticTrip.findMany({where:{deletedAt:null,contract:{deletedAt:null},participants:{some:{userId:{in:people.map(p=>p.id)}}},...boundary},orderBy:{id:'desc'},take:PLAN_BATCH,select:{id:true,number:true,contractId:true,contract:{select:{number:true}},start:true,finish:true,status:true,participants:{where:{userId:{in:people.map(p=>p.id)}},select:{userId:true,factHours:true}}}});
   accept([],batch.map(t=>({id:t.id,number:t.number,contractId:t.contractId,contractNumber:t.contract.number,start:day(t.start)!,finish:day(t.finish)!,status:t.status,participants:t.participants.map(p=>({id:p.userId,factHours:p.factHours?.toString()??null}))})));
   if(batch.length<PLAN_BATCH)break;last=batch[batch.length-1]!.id;
  }
  check();const result=collector.finish();
  // Fetch free text/location only for visible records, never for the whole register.
  const info=new Map<string,{note:string;location:string;warning:string}>();
  const ids=(kind:string)=>[...new Set(result.rows.filter(r=>r.kind===kind).map(r=>r.id))];
  const contractIds=ids('contract'),structureIds=ids('structure'),tripIds=ids('trip');
  if(contractIds.length)for(const w of await tx.diagnosticContractWork.findMany({where:{id:{in:contractIds}},take:PLAN_PAGE,select:{id:true,note:true}}))info.set('contract:'+w.id,{note:w.note,location:'',warning:''});
  check();if(structureIds.length)for(const w of await tx.diagnosticStructureWork.findMany({where:{id:{in:structureIds}},take:PLAN_PAGE,select:{id:true,note:true,warning:true,contractStructure:{select:{structure:{select:{location:true}}}}}}))info.set('structure:'+w.id,{note:w.note,location:w.contractStructure.structure.location,warning:w.warning});
  check();if(tripIds.length)for(const t of await tx.diagnosticTrip.findMany({where:{id:{in:tripIds}},take:PLAN_PAGE,select:{id:true,note:true}}))info.set('trip:'+t.id,{note:t.note,location:'',warning:''});
  check();const rows:PlanWorkRow[]=result.rows.map(r=>({...r,...(info.get(r.kind+':'+r.id)??{note:'',location:'',warning:''})}));
  return {currentUser,employees:roster.employees,selection,rows,total:result.total,page,pageSize,warning,unresolvedWorks:0,unlinkedTravelWorks:0,nextCursor:result.hasMore?writePlanCursor(result.rows[result.rows.length-1]!,context):null};
 },{isolationLevel:'RepeatableRead',maxWait:2000,timeout:75000});
 }catch(e:any){if(cancelled)throw createError({statusCode:499,message:'Запрос отменён.'});if(e?.code==='P2028'||e?.meta?.code==='57014'||/statement timeout/i.test(e?.message||''))throw createError({statusCode:504,message:'Превышено время загрузки работ. Выберите сотрудника и повторите запрос.'});throw e;}finally{event.node.res.off('close',onClose);}
}
