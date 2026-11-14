import type {Prisma} from '@prisma/client';
import {createError} from 'h3';
import {tripWorkType} from '../../../shared/utils/diagnostic-trip-lifecycle';
import type {TripInput} from '../../../shared/types/diagnostic-trips';
const fail=(message:string)=>{throw createError({statusCode:409,message});};
export async function tripStructureLinks(tx:Prisma.TransactionClient,input:TripInput){
 const links=await tx.diagnosticContractStructure.findMany({where:{contractId:input.contractId,structureId:{in:input.structureIds},deletedAt:null,structure:{deletedAt:null}},select:{id:true,structureId:true}});
 const result=new Map<number,number>(),grouped=new Map<number,typeof links>();
 for(const link of links){const group=grouped.get(link.structureId)||[];group.push(link);grouped.set(link.structureId,group);}
 for(const sid of input.structureIds){const found=grouped.get(sid)||[];if(found.length!==1)fail(`Сооружение ID ${sid}: в выбранном договоре должна быть ровно одна действующая связь. Выберите сооружение из перечня этого договора.`);result.set(sid,found[0]!.id);}
 return result;
}
/** Exactly one catalog-301/302 assignment per (native trip, structure). Imported trips are not backfilled. */
export async function syncTripStructureWorks(tx:Prisma.TransactionClient,tripId:number,input:TripInput,actorId:number,before:{start:Date;finish:Date;contractId:number}|null){
 const links=await tripStructureLinks(tx,input);
 const existing=await tx.diagnosticStructureWork.findMany({where:{tripId},include:{tripCompletion:true}});
 const kind=tripWorkType(input.start,input.finish);
 const catalog=input.structureIds.length?await tx.diagnosticWork.findFirst({where:{code:kind.code,deletedAt:null}}):null;
 if(input.structureIds.length&&(!catalog||catalog.name.trim().toLocaleLowerCase('ru')!==kind.name.toLocaleLowerCase('ru')))fail(`В библиотеке не найдена действующая работа «${kind.name}» с шифром ${kind.code}. Проверьте библиотеку работ.`);
 const selected=new Set(input.structureIds);
 for(const w of existing){
  const target=selected.has(w.structureId),scopeChanged=target&&links.get(w.structureId)!==w.contractStructureId;
  const datesChanged=target&&(w.planStart?.toISOString().slice(0,10)!==input.start||w.planFinish?.toISOString().slice(0,10)!==input.finish);
  const typeChanged=target&&catalog&&w.workId!==catalog.id;
  const changes=!target&&!w.deletedAt||target&&(!!w.deletedAt||scopeChanged||datesChanged||typeChanged);
  if(!changes)continue;
  if(w.tripCompletion||w.status!=='planned'||w.factStart||w.factFinish||w.factHours!==null||w.factExecutor)fail(`Работа по сооружению ID ${w.structureId} уже выполняется или закрыта. Нельзя менять её даты, договор или исключать сооружение через командировку.`);
  if(datesChanged&&!w.deletedAt&&before&&(w.planStart?.getTime()!==before.start.getTime()||w.planFinish?.getTime()!==before.finish.getTime()))fail(`Даты работы по сооружению ID ${w.structureId} изменены отдельно. Сначала согласуйте их с командировкой.`);
  if(!target){await tx.diagnosticStructureWork.update({where:{id:w.id},data:{deletedAt:new Date(),deletedById:actorId,updatedById:actorId,version:{increment:1}}});continue;}
  await tx.diagnosticStructureWork.update({where:{id:w.id},data:{contractStructureId:links.get(w.structureId)!,...(typeChanged?{workId:catalog!.id,workCodeSnapshot:catalog!.code,workNameSnapshot:catalog!.name,criteriaSnapshot:catalog!.criteria,catalogHoursSnapshot:catalog!.hours}:{}),planStart:new Date(input.start),planFinish:new Date(input.finish),deletedAt:null,deletedById:null,updatedById:actorId,version:{increment:1}}});
 }
 const known=new Set(existing.map(w=>w.structureId));
 const rows=input.structureIds.filter(id=>!known.has(id)).map(structureId=>({tripId,structureId,contractStructureId:links.get(structureId)!,workId:catalog!.id,workCodeSnapshot:catalog!.code,workNameSnapshot:catalog!.name,criteriaSnapshot:catalog!.criteria,catalogHoursSnapshot:catalog!.hours,planStart:new Date(input.start),planFinish:new Date(input.finish),status:'planned',createdById:actorId,updatedById:actorId}));
 for(let i=0;i<rows.length;i+=500)await tx.diagnosticStructureWork.createMany({data:rows.slice(i,i+500)});
 return {created:rows.length,active:input.structureIds.length};
}
