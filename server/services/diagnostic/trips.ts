import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent} from '../../utils/auditLog';
import {tripParticipants} from './trip-participants';
import {syncTripStructureWorks} from './trip-structure-works';
import {queueTripEmails} from './trip-email';
import {tripToday,nextTripNumber,hourUnits,hourLabel,allocateTripHours} from '../../../shared/utils/diagnostic-trip-lifecycle';
import {parseTripInput,tripDay} from '../../../shared/utils/diagnostic-trips';
import type {TripInput,TripWorkCandidate,TripParticipantFact} from '../../../shared/types/diagnostic-trips';
import {tripHash,tripInclude,tripWriteData,serializeTrip} from './trip-data';
const fail=(message:string,statusCode=400)=>{throw createError({statusCode,message});};
export const tripId=(v:unknown)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>2147483647)fail('Неверный ID.');return n;};
export function readTripInput(v:unknown){try{return parseTripInput(v);}catch(e){return fail((e as Error).message);}}
async function atomic<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>){try{return await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(71914,1)`;return fn(tx);},{isolationLevel:'Serializable',timeout:60000,maxWait:15000});}catch(e:any){if(['P2034','P2002'].includes(e.code))fail('Найдена одинаковая командировка либо данные изменены параллельно. Обновите список.',409);throw e;}}
export async function tripCatalog(event:H3Event){const [contracts,executors,users]=await Promise.all([prisma.diagnosticContract.findMany({where:{deletedAt:null},select:{id:true,number:true},orderBy:{number:'asc'}}),prisma.diagnosticTripExecutor.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),tripParticipants(event)]);return {contracts,executors,participants:users.items,directoryParticipants:users.directoryParticipants,warning:users.warning};}
export async function listTrips(){return (await prisma.diagnosticTrip.findMany({where:{deletedAt:null},include:tripInclude,orderBy:[{start:'desc'},{id:'desc'}]})).map(serializeTrip);}
export async function getTrip(id:number){const row=await prisma.diagnosticTrip.findUnique({where:{id},include:tripInclude});if(!row||row.deletedAt)fail('Командировка не найдена.',404);return serializeTrip(row!);}
async function references(tx:Prisma.TransactionClient,input:TripInput){
 if(!await tx.diagnosticContract.findFirst({where:{id:input.contractId,deletedAt:null}}))fail('Договор недоступен.');
 if(!await tx.diagnosticTripExecutor.findUnique({where:{id:input.executorId}}))fail('Выберите организацию-исполнителя.');
 if(await tx.user.count({where:{id:{in:input.participantIds},deletedAt:null,OR:[{status:'ACTIVE'},{authType:'DOMAIN',status:'PENDING_ACTIVATION'}]}})!==input.participantIds.length)fail('Участник недоступен.');
 if(await tx.diagnosticStructure.count({where:{id:{in:input.structureIds},deletedAt:null}})!==input.structureIds.length)fail('Одно из сооружений недоступно.');
}
export async function saveTrip(event:H3Event,actorId:number,input:TripInput,id?:number,version?:number,backdatedConfirmed=false){
 const allowed=await tripParticipants(event);
 if(input.participantIds.some(id=>!allowed.items.some(u=>u.id===id)))fail(allowed.warning||'Участник отсутствует в составе сотрудников ОДИС или его учётная запись недоступна.');
 return atomic(async tx=>{
  const before=id?await tx.diagnosticTrip.findUnique({where:{id},include:tripInclude}):null;
  if(id&&(!before||before.deletedAt))fail('Командировка не найдена.',404);
  if(before&&(before.version!==version||before.status==='COMPLETED'))fail('Командировка изменена или уже закрыта. Обновите карточку.',409);
  if((!before||before.start.toISOString().slice(0,10)!==input.start)&&input.start<tripToday()&&!backdatedConfirmed)fail('Подтвердите планирование командировки в прошлом (задним числом).');
  await references(tx,input);
  if(await tx.diagnosticTrip.findFirst({where:{deletedAt:null,contentKey:{in:[tripHash(input,'PLANNED'),tripHash(input,'COMPLETED')]},...(id?{id:{not:id}}:{})}}))fail('Такая командировка уже существует.',409);
  const data={...tripWriteData(input),contentKey:tripHash(input,'PLANNED'),updatedById:actorId};
  let row;
  if(before){
   const changed=await tx.diagnosticTrip.updateMany({where:{id:before.id,version,status:'PLANNED'},data:{...data,version:{increment:1}}});if(changed.count!==1)fail('Командировка изменена.',409);
   await tx.diagnosticTripParticipant.deleteMany({where:{tripId:before.id}});await tx.diagnosticTripStructure.deleteMany({where:{tripId:before.id}});row=before;
  }else{
   const [numbers,origins]=await Promise.all([tx.diagnosticTrip.findMany({select:{number:true}}),tx.diagnosticTripOrigin.findMany({select:{sourceNumber:true}})]);
   row=await tx.diagnosticTrip.create({data:{...data,number:nextTripNumber([...numbers.map(t=>t.number),...origins.map(o=>o.sourceNumber)]),createdById:actorId}});
  }
  await tx.diagnosticTripParticipant.createMany({data:input.participantIds.map(userId=>({tripId:row.id,userId}))});
  if(input.structureIds.length)await tx.diagnosticTripStructure.createMany({data:input.structureIds.map(structureId=>({tripId:row.id,structureId}))});
  if(!before?.origins.length)await syncTripStructureWorks(tx,row.id,input,actorId,before);
  const stored=await tx.diagnosticTrip.findUniqueOrThrow({where:{id:row.id},include:tripInclude});
  if(!before||before.contentKey!==stored.contentKey)await queueTripEmails(tx,stored,input);
  const after=serializeTrip(await tx.diagnosticTrip.findUniqueOrThrow({where:{id:row.id},include:tripInclude}));
  await writeAuditEvent({event,db:tx,category:'DATA',action:before?'UPDATE':'CREATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:row.id,actorUserId:actorId,note:backdatedConfirmed?'Пользователь подтвердил планирование задним числом.':undefined,changes:{trip:{before:before?JSON.parse(JSON.stringify(serializeTrip(before))):null,after:JSON.parse(JSON.stringify(after))}}});
  return after;
 });
}
export async function tripWorkCandidates(id:number):Promise<TripWorkCandidate[]>{
 const trip=await getTrip(id),day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
 const rows=await prisma.diagnosticStructureWork.findMany({where:{tripId:id,deletedAt:null,contractStructure:{contractId:trip.contractId}},include:{contractStructure:{include:{structure:{select:{code:true}}}}},orderBy:{id:'asc'}});
 return rows.map(w=>({id:w.id,kind:'structure',name:w.workNameSnapshot,structureCode:w.contractStructure.structure.code,version:w.version,status:w.status,planStart:day(w.planStart),planFinish:day(w.planFinish),planHours:w.planHours?.toString()??null,planExecutor:w.planExecutor,factStart:day(w.factStart),factFinish:day(w.factFinish),factHours:w.factHours?.toString()??null,factExecutor:w.factExecutor}));
}
export function parseTripClose(body:any){
 const version=tripId(body?.version);
 if(!Array.isArray(body?.participants)||!body.participants.length||body.participants.length>200)fail('Обновите форму закрытия: нужны фактические часы всех участников.');
 const participants:TripParticipantFact[]=body.participants.map((p:any)=>{try{return {userId:tripId(p?.userId),hours:hourLabel(hourUnits(p?.hours))};}catch(e){return fail((e as Error).message);}});
 if(new Set(participants.map(p=>p.userId)).size!==participants.length)fail('Участник повторяется в расчёте часов.');
 return {version,participants};
}
export async function closeTrip(event:H3Event,actorId:number,id:number,version:number,participants:TripParticipantFact[]){return atomic(async tx=>{
 const row=await tx.diagnosticTrip.findUnique({where:{id},include:tripInclude});if(!row||row.deletedAt)fail('Командировка не найдена.',404);
 if(row!.version!==version||row!.status!=='PLANNED')fail('Командировка изменена или уже закрыта.',409);
 const trip=serializeTrip(row!);
 if(participants.length!==trip.participantIds.length||new Set(participants.map(p=>p.userId)).size!==participants.length||participants.some(p=>!trip.participantIds.includes(p.userId)))fail('В расчёте должны быть все участники этой командировки ровно по одному разу.');
 if(!await tx.diagnosticContract.findFirst({where:{id:trip.contractId,deletedAt:null}}))fail('Договор командировки недоступен.',409);
 const works=await tx.diagnosticStructureWork.findMany({where:{tripId:id,deletedAt:null},include:{tripCompletion:true,contractStructure:{select:{contractId:true,deletedAt:true,structure:{select:{deletedAt:true}}}}},orderBy:{id:'asc'}});
 if(!trip.noStructures&&(works.length!==trip.structureIds.length||works.some(w=>!trip.structureIds.includes(w.structureId))))fail('Не все работы этой командировки связаны с сооружениями. Для импортированной поездки требуется точное сопоставление работ; чужие работы автоматически не закрываются.',409);
 for(const w of works){if(w.contractStructure.contractId!==trip.contractId||w.contractStructure.deletedAt||w.contractStructure.structure.deletedAt||w.tripCompletion||w.status==='completed'||w.factStart||w.factFinish||w.factHours!==null||w.factExecutor)fail('Работа уже изменена, содержит факт или недоступна: '+w.id,409);}
 let allocations;try{allocations=allocateTripHours(participants.map(p=>p.hours),works.map(w=>w.id));}catch(e){return fail((e as Error).message);}
 const peopleByHours=new Map<string,number[]>();for(const p of participants){const ids=peopleByHours.get(p.hours)||[];ids.push(p.userId);peopleByHours.set(p.hours,ids);}
 for(const [hours,userIds] of peopleByHours){const result=await tx.diagnosticTripParticipant.updateMany({where:{tripId:id,userId:{in:userIds}},data:{factHours:hours}});if(result.count!==userIds.length)fail('Состав участников изменён. Обновите карточку.',409);}
 const workVersions=new Map(works.map(w=>[w.id,w.version])),byHours=new Map<string,{id:number;version:number}[]>();
 for(const a of allocations){const group=byHours.get(a.hours)||[];group.push({id:a.id,version:workVersions.get(a.id)!});byHours.set(a.hours,group);}
 for(const [hours,group] of byHours)for(let i=0;i<group.length;i+=100){
  const batch=group.slice(i,i+100);
  const result=await tx.diagnosticStructureWork.updateMany({where:{tripId:id,deletedAt:null,tripCompletion:null,OR:batch},data:{status:'completed',factStart:row!.start,factFinish:row!.finish,factHours:hours,updatedById:actorId,version:{increment:1}}});
  if(result.count!==batch.length)fail('Работа изменена параллельно. Обновите карточку.',409);
 }
 for(let i=0;i<works.length;i+=500)await tx.diagnosticTripCompletion.createMany({data:works.slice(i,i+500).map(w=>({tripId:id,structureWorkId:w.id}))});
 const changed=await tx.diagnosticTrip.updateMany({where:{id,version,status:'PLANNED',deletedAt:null},data:{status:'COMPLETED',closedAt:new Date(),closedById:actorId,updatedById:actorId,contentKey:tripHash(trip,'COMPLETED'),version:{increment:1}}});if(changed.count!==1)fail('Командировка изменена.',409);
 await tx.diagnosticTripEmail.updateMany({where:{tripId:id,status:{in:['PENDING','FAILED']}},data:{status:'CANCELLED',lastError:'Командировка закрыта.'}});
 await writeAuditEvent({event,db:tx,category:'DATA',action:'UPDATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:id,actorUserId:actorId,note:'Закрытие всех связанных работ и учёт факта всех участников.',changes:{status:{before:'PLANNED',after:'COMPLETED'},facts:{before:null,after:JSON.parse(JSON.stringify({participants,allocations}))}}});
 return serializeTrip(await tx.diagnosticTrip.findUniqueOrThrow({where:{id},include:tripInclude}));
});}
export async function deleteTrip(event:H3Event,actorId:number,id:number,version:number){return atomic(async tx=>{
 const trip=await tx.diagnosticTrip.findUnique({where:{id}});if(!trip||trip.deletedAt)fail('Командировка не найдена.',404);if(trip!.version!==version)fail('Командировка изменена. Обновите список.',409);
 const workWhere={deletedAt:null,OR:[{tripId:id},{tripId:null,tripCompletion:{tripId:id}}]};
 const works=await tx.diagnosticStructureWork.findMany({where:workWhere,select:{id:true}});const now=new Date();
 await tx.diagnosticStructureWork.updateMany({where:workWhere,data:{deletedAt:now,deletedById:actorId,updatedById:actorId,version:{increment:1}}});
 await tx.diagnosticTripEmail.updateMany({where:{tripId:id,status:{in:['PENDING','FAILED','UNKNOWN']}},data:{status:'CANCELLED',lastError:'Командировка удалена.'}});
 await tx.diagnosticTrip.update({where:{id},data:{deletedAt:now,deletedById:actorId,updatedById:actorId,version:{increment:1},contentKey:createHash('sha256').update('deleted:'+id+':'+trip!.contentKey).digest('hex')}});
 await writeAuditEvent({event,db:tx,category:'DATA',action:'DELETE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:id,actorUserId:actorId,note:'Удаление командировки и связанных работ по сооружениям.',changes:{deleted:{before:false,after:true},workIds:{before:works.map(w=>w.id),after:[]}}});
 return {deleted:true,worksDeleted:works.length};
});}
export async function retryTripEmails(event:H3Event,actorId:number,id:number,confirmed:boolean){return atomic(async tx=>{
 if(!confirmed)fail('Подтвердите повторную отправку после проверки журнала SMTP.');
 const trip=await tx.diagnosticTrip.findUnique({where:{id},include:{participants:{include:{user:{select:{email:true,deletedAt:true}}}}}});if(!trip||trip.deletedAt||trip.status!=='PLANNED'||trip.finish.toISOString().slice(0,10)<tripToday())fail('Повторная отправка доступна только для актуальной запланированной командировки.');
 let queued=0;for(const p of trip!.participants){if(!p.user.email||p.user.deletedAt)continue;const changed=await tx.diagnosticTripEmail.updateMany({where:{tripId:id,userId:p.userId,contentKey:trip!.contentKey,status:{in:['FAILED','UNKNOWN']}},data:{email:p.user.email,status:'PENDING',lastError:null}});queued+=changed.count;}
 await writeAuditEvent({event,db:tx,category:'DATA',action:'UPDATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'DiagnosticTrip',entityId:id,actorUserId:actorId,note:'Подтверждена повторная отправка уведомлений.',changes:{queued:{before:0,after:queued}}});return {queued};
});}
