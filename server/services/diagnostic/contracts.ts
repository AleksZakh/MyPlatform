
import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent,computeAuditDelta} from '../../utils/auditLog';
import {contractStatus} from '../../../shared/utils/diagnostic-contracts';
import type {ContractInput,ContractRecord} from '../../../shared/types/diagnostic-contracts';
import {diagnosticSupervisors} from './supervisors';
import {CONTRACT_RESOURCE} from './access';
async function atomic<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 try{return await prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(e.code))throw createError({statusCode:409,message:'Данные изменены параллельно. Обновите список и повторите действие.'});throw e;}
}
const include={counterparty:true,projectType:true,supervisor:{select:{id:true,fullName:true,login:true,deletedAt:true}},_count:{select:{structures:{where:{deletedAt:null}}}}} satisfies Prisma.DiagnosticContractInclude;
type Row=Prisma.DiagnosticContractGetPayload<{include:typeof include}>;
const day=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
export function serializeContract(r:Row):ContractRecord{
 return {id:r.id,version:r.version,number:r.number,date:day(r.date)!,counterpartyId:r.counterpartyId,counterparty:r.counterparty.name,
 direction:r.direction,executor:r.executor,start:day(r.start),finish:day(r.finish),stages:r.stages,hours:r.hours?.toString()??null,amount:r.amount?.toString()??null,note:r.note,
 projectTypeId:r.projectTypeId,projectType:r.projectType?.name??null,supervisorId:r.supervisorId,
 supervisor:r.supervisor?(r.supervisor.deletedAt?'Удалённый аккаунт':r.supervisor.fullName||r.supervisor.login):null,
 relatedContractId:r.relatedContractId,buildings:r._count.structures,status:contractStatus(day(r.date)!,day(r.finish)),deletedAt:r.deletedAt?.toISOString()??null};
}
export async function listContracts(trash=false){
 const rows=await prisma.diagnosticContract.findMany({where:{deletedAt:trash?{not:null}:null},include,orderBy:[{date:'desc'},{id:'desc'}]});
 return rows.map(serializeContract);
}
export async function readContract(id:number){
 const row=await prisma.diagnosticContract.findFirst({where:{id,deletedAt:null},include});
 if(!row)throw createError({statusCode:404,message:'Договор не найден.'});
 return serializeContract(row);
}
export async function saveContract(event:H3Event,actorId:number,input:ContractInput,contractId?:number,version?:number){
 // AD queries run outside transactions.
 if(input.supervisorId!=null){
  const allowed=await diagnosticSupervisors(event);
  if(!allowed.items.some(u=>u.id===input.supervisorId))throw createError({statusCode:400,message:allowed.warning||'Руководитель должен быть активным сотрудником группы ОДИС.'});
 }
 return atomic(async tx=>{
  const before=contractId?await tx.diagnosticContract.findFirst({where:{id:contractId,deletedAt:null},include}):null;
  if(contractId&&!before)throw createError({statusCode:404,message:'Договор не найден.'});
  if(before&&before.version!==version)throw createError({statusCode:409,message:'Договор изменён другим сотрудником. Откройте его заново.'});
  if(!await tx.diagnosticCounterparty.findUnique({where:{id:input.counterpartyId}}))throw createError({statusCode:400,message:'Выберите контрагента из справочника.'});
  if(input.projectTypeId&&!await tx.diagnosticProjectType.findFirst({where:{id:input.projectTypeId,isActive:true}}))throw createError({statusCode:400,message:'Тип проекта недоступен.'});
  if(input.supervisorId&&!await tx.user.findFirst({where:{id:input.supervisorId,status:'ACTIVE',deletedAt:null}}))throw createError({statusCode:400,message:'Руководитель недоступен.'});
  if(input.relatedContractId){
   if(input.relatedContractId===contractId)throw createError({statusCode:400,message:'Договор не может ссылаться на себя.'});
   const related=await tx.diagnosticContract.findFirst({where:{id:input.relatedContractId,direction:'INCOME',deletedAt:null}});
   if(!related)throw createError({statusCode:400,message:'Связанный доходный договор недоступен.'});
   const visited=new Set<number>(contractId?[contractId]:[]);let cursor:number|null=input.relatedContractId;
   while(cursor){if(visited.has(cursor))throw createError({statusCode:400,message:'Связь договоров образует цикл.'});visited.add(cursor);cursor=(await tx.diagnosticContract.findUnique({where:{id:cursor},select:{relatedContractId:true}}))?.relatedContractId??null;}
  }
  if(before?.direction==='INCOME'&&input.direction!=='INCOME'&&await tx.diagnosticContract.count({where:{relatedContractId:before.id,deletedAt:null}}))throw createError({statusCode:409,message:'На договор ссылаются другие договоры. Сначала измените их связь.'});
  const data={...input,date:new Date(input.date),start:input.start?new Date(input.start):null,finish:input.finish?new Date(input.finish):null,updatedById:actorId};
  let row:Row;
  if(before){
   const result=await tx.diagnosticContract.updateMany({where:{id:before.id,version,deletedAt:null},data:{...data,version:{increment:1}}});
   if(result.count!==1)throw createError({statusCode:409,message:'Договор изменился. Обновите карточку.'});
   row=await tx.diagnosticContract.findUniqueOrThrow({where:{id:before.id},include});
  }else row=await tx.diagnosticContract.create({data:{...data,createdById:actorId},include});
  const after=serializeContract(row);
  await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:before?'UPDATE':'CREATE',resourceKey:CONTRACT_RESOURCE,entityType:'DiagnosticContract',entityId:row.id,actorUserId:actorId,note:'Договор '+row.number,changes:computeAuditDelta(before?{...serializeContract(before)}:{},{...after})});
  return after;
 });
}
export async function deleteContract(event:H3Event,actorId:number,id:number,version:number,restore=false){
 return atomic(async tx=>{
  const before=await tx.diagnosticContract.findUnique({where:{id},include});
  if(!before||!!before.deletedAt!==restore)throw createError({statusCode:404,message:'Договор не найден.'});
  if(!restore&&await tx.diagnosticContract.count({where:{relatedContractId:id,deletedAt:null}}))throw createError({statusCode:409,message:'Договор связан с другими договорами. Сначала измените связи.'});
  if(restore&&before.relatedContractId&&!await tx.diagnosticContract.findFirst({where:{id:before.relatedContractId,deletedAt:null,direction:'INCOME'}}))throw createError({statusCode:409,message:'Сначала восстановите связанный доходный договор.'});
  const changed=await tx.diagnosticContract.updateMany({where:{id,version},data:{deletedAt:restore?null:new Date(),deletedById:restore?null:actorId,updatedById:actorId,version:{increment:1}}});
  if(changed.count!==1)throw createError({statusCode:409,message:'Договор изменился. Обновите список.'});
  await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:restore?'UPDATE':'DELETE',resourceKey:CONTRACT_RESOURCE,entityType:'DiagnosticContract',entityId:id,actorUserId:actorId,note:(restore?'Восстановление: ':'Удаление в корзину: ')+before.number,changes:{deletedAt:{before:before.deletedAt?.toISOString()??null,after:restore?null:new Date().toISOString()}}});
  return {success:true};
 });
}
