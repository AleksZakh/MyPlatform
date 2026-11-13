import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent} from '../../utils/auditLog';
import {tripParticipants} from './trip-participants';
import {syncTripStructureWorks} from './trip-structure-works';
import {parseTripInput,tripDay} from '../../../shared/utils/diagnostic-trips';
import type {TripInput,TripWorkCandidate,TripWorkFact} from '../../../shared/types/diagnostic-trips';
import {tripHash,tripInclude,tripWriteData,serializeTrip} from './trip-data';
const fail=(message:string,statusCode=400)=>{throw createError({statusCode,message});};
export const tripId=(v:unknown)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>2147483647)fail('Неверный ID.');return n;};
export function readTripInput(v:unknown){try{return parseTripInput(v);}catch(e){return fail((e as Error).message);}}
async function atomic<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>){try{return await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(71914,1)`;return fn(tx);},{isolationLevel:'Serializable',timeout:60000,maxWait:15000});}catch(e:any){if(['P2034','P2002'].includes(e.code))fail('Найдена одинаковая командировка либо данные изменены параллельно. Обновите список.',409);throw e;}}
export async function tripCatalog(event:H3Event){const [contracts,executors,users]=await Promise.all([prisma.diagnosticContract.findMany({where:{deletedAt:null},select:{id:true,number:true},orderBy:{number:'asc'}}),prisma.diagnosticTripExecutor.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),tripParticipants(event)]);return {contracts,executors,participants:users.items,directoryParticipants:users.directoryParticipants,warning:users.warning};}
export async function listTrips(){return (await prisma.diagnosticTrip.findMany({include:tripInclude,orderBy:[{start:'desc'},{id:'desc'}]})).map(serializeTrip);}
export async function getTrip(id:number){const row=await prisma.diagnosticTrip.findUnique({where:{id},include:tripInclude});if(!row)fail('Командировка не найдена.',404);return serializeTrip(row!);}
async function references(tx:Prisma.TransactionClient,input:TripInput){
 if(!await tx.diagnosticContract.findFirst({where:{id:input.contractId,deletedAt:null}}))fail('Договор недоступен.');
 if(!await tx.diagnosticTripExecutor.findUnique({where:{id:input.executorId}}))fail('Выберите организацию-исполнителя.');
 if(await tx.user.count({where:{id:{in:input.participantIds},deletedAt:null,OR:[{status:'ACTIVE'},{authType:'DOMAIN',status:'PENDING_ACTIVATION'}]}})!==input.participantIds.length)fail('Участник недоступен.');
 if(await tx.diagnosticStructure.count({where:{id:{in:input.structureIds},deletedAt:null}})!==input.structureIds.length)fail('Одно из сооружений недоступно.');
}
export async function saveTrip(event:H3Event,actorId:number,input:TripInput,id?:number,version?:number){
 const allowed=await tripParticipants(event);
 if(input.participantIds.some(id=>!allowed.items.some(u=>u.id===id)))fail(allowed.warning||'Участник отсутствует в составе сотрудников ОДИС или его учётная запись недоступна.');
 return atomic(async tx=>{
  const before=id?await tx.diagnosticTrip.findUnique({where:{id},include:tripInclude}):null;
  if(id&&!before)fail('Командировка не найдена.',404);
  if(before&&(before.version!==version||before.status==='COMPLETED'))fail('Командировка изменена или уже закрыта. Обновите карточку.',409);
  await references(tx,input);
  if(await tx.diagnosticTrip.findFirst({where:{contentKey:{in:[tripHash(input,'PLANNED'),tripHash(input,'COMPLETED')]},...(id?{id:{not:id}}:{})}}))fail('Такая командировка уже существует.',409);
  const data={...tripWriteData(input),contentKey:tripHash(input,'PLANNED'),updatedById:actorId};
  let row;
  if(before){
   const changed=await tx.diagnosticTrip.updateMany({where:{id:before.id,version,status:'PLANNED'},data:{...data,version:{increment:1}}});if(changed.count!==1)fail('Командировка изменена.',409);
   await tx.diagnosticTripParticipant.deleteMany({where:{tripId:before.id}});await tx.diagnosticTripStructure.deleteMany({where:{tripId:before.id}});row=before;
  }else{
   row=await tx.diagnosticTrip.create({data:{...data,number:'',createdById:actorId}});
   await tx.diagnosticTrip.update({where:{id:row.id},data:{number:'К-S'+String(row.id).padStart(6,'0')}});
  }
  await tx.diagnosticTripParticipant.createMany({data:input.participantIds.map(userId=>({tripId:row.id,userId}))});
  if(input.structureIds.length)await tx.diagnosticTripStructure.createMany({data:input.structureIds.map(structureId=>({tripId:row.id,structureId}))});
  if(!before?.origins.length)await syncTripStructureWorks(tx,row.id,input,actorId,before);
  const after=serializeTrip(await tx.diagnosticTrip.findUniqueOrThrow({where:{id:row.id},include:tripInclude}));
  await writeAuditEvent({event,db:tx,category:'DATA',action:before?'UPDATE':'CREATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:row.id,actorUserId:actorId,changes:{trip:{before:before?JSON.parse(JSON.stringify(serializeTrip(before))):null,after:JSON.parse(JSON.stringify(after))}}});
  return after;
 });
}
export async function tripWorkCandidates(id:number):Promise<TripWorkCandidate[]>{
 const trip=await getTrip(id),day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
 const [a,b]=await Promise.all([
  prisma.diagnosticContractWork.findMany({where:{contractId:trip.contractId,deletedAt:null,status:{not:'completed'},tripCompletion:null},orderBy:{id:'asc'}}),
  prisma.diagnosticStructureWork.findMany({where:{structureId:{in:trip.structureIds},deletedAt:null,status:{not:'completed'},tripCompletion:null,OR:[{tripId:null},{tripId:id}],contractStructure:{contractId:trip.contractId,deletedAt:null,structure:{deletedAt:null}}},include:{contractStructure:{include:{structure:{select:{code:true}}}}},orderBy:{id:'asc'}}),
 ]);
 return [...a.map(w=>({id:w.id,kind:'contract' as const,name:w.name,structureCode:'',version:w.version,status:w.status,planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor})),...b.map(w=>({id:w.id,kind:'structure' as const,name:w.workNameSnapshot,structureCode:w.contractStructure.structure.code,version:w.version,status:w.status,planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor}))];
}
export function parseTripClose(body:any){
 const version=tripId(body?.version);if(!Array.isArray(body?.works)||body.works.length>1000)fail('Некорректный перечень работ.');
 const seen=new Set<string>();
 const works:TripWorkFact[]=body.works.map((w:any)=>{
  if(w&&typeof w.hours==='string')w={...w,hours:w.hours.trim().replace(',','.')};
  if(!w||!['contract','structure'].includes(w.kind)||!tripDay(w.start)||!tripDay(w.finish)||w.start>w.finish||typeof w.hours!=='string'||!/^\d{1,10}(\.\d{1,4})?$/.test(w.hours))fail('Проверьте фактические даты и человеко-часы работ.');
  const key=w.kind+':'+tripId(w.id);if(seen.has(key))fail('Повторная работа в закрытии.');seen.add(key);
  return {kind:w.kind,id:tripId(w.id),version:tripId(w.version),start:w.start,finish:w.finish,hours:w.hours,executorId:tripId(w.executorId)};
 });return {version,works};
}
export async function closeTrip(event:H3Event,actorId:number,id:number,version:number,works:TripWorkFact[]){return atomic(async tx=>{
 const row=await tx.diagnosticTrip.findUnique({where:{id},include:tripInclude});if(!row)fail('Командировка не найдена.',404);
 if(row!.version!==version||row!.status!=='PLANNED')fail('Командировка изменена или уже закрыта.',409);
 const trip=serializeTrip(row!);
 if(!await tx.diagnosticContract.findFirst({where:{id:trip.contractId,deletedAt:null}}))fail('Договор командировки недоступен.',409);
 const previousFacts:unknown[]=[];
 for(const fact of works){
  if(!trip.participantIds.includes(fact.executorId))fail('Исполнитель работы должен быть участником командировки.');
  if(fact.start<trip.start||fact.finish>trip.finish)fail('Фактические даты работы должны входить в период командировки.');
  const name=trip.participants.find(p=>p.id===fact.executorId)!.name;
  const common={id:fact.id,version:fact.version,deletedAt:null,status:{not:'completed'},tripCompletion:null};
  const data={status:'completed',factStart:new Date(fact.start),factFinish:new Date(fact.finish),factHours:fact.hours,factExecutor:name,updatedById:actorId,version:{increment:1}};
  const before=fact.kind==='contract'?await tx.diagnosticContractWork.findFirst({where:{...common,contractId:trip.contractId}}):await tx.diagnosticStructureWork.findFirst({where:{...common,OR:[{tripId:null},{tripId:id}],structureId:{in:trip.structureIds},contractStructure:{contractId:trip.contractId,deletedAt:null,structure:{deletedAt:null}}}});
  if(!before)fail('Работа изменена или недоступна: '+fact.id,409);
  previousFacts.push({kind:fact.kind,id:fact.id,version:before!.version,status:before!.status,factStart:before!.factStart,factFinish:before!.factFinish,factHours:before!.factHours?.toString()??null,factExecutor:before!.factExecutor});
  const result=fact.kind==='contract'?await tx.diagnosticContractWork.updateMany({where:{...common,contractId:trip.contractId},data}):await tx.diagnosticStructureWork.updateMany({where:{...common,OR:[{tripId:null},{tripId:id}],structureId:{in:trip.structureIds},contractStructure:{contractId:trip.contractId,deletedAt:null,structure:{deletedAt:null}}},data});
  if(result.count!==1)fail('Работа изменена, уже закрыта или не относится к этой командировке: '+fact.id,409);
  await tx.diagnosticTripCompletion.create({data:{tripId:id,...(fact.kind==='contract'?{contractWorkId:fact.id}:{structureWorkId:fact.id})}});
 }
 const changed=await tx.diagnosticTrip.updateMany({where:{id,version,status:'PLANNED'},data:{status:'COMPLETED',closedAt:new Date(),closedById:actorId,updatedById:actorId,contentKey:tripHash(trip,'COMPLETED'),version:{increment:1}}});if(changed.count!==1)fail('Командировка изменена.',409);
 await writeAuditEvent({event,db:tx,category:'DATA',action:'UPDATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:id,actorUserId:actorId,note:'Закрытие командировки и выбранных работ',changes:{status:{before:'PLANNED',after:'COMPLETED'},workFacts:{before:JSON.parse(JSON.stringify(previousFacts)),after:JSON.parse(JSON.stringify(works))}}});
 return serializeTrip(await tx.diagnosticTrip.findUniqueOrThrow({where:{id},include:tripInclude}));
});}
