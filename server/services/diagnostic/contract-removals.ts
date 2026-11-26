import {createError,type H3Event} from 'h3';
import type {Prisma} from '@prisma/client';
import {writeAuditEvent} from '../../utils/auditLog';
import {id,invalid} from './input';

type WorkRemoval = {id:number;version:number};
export function contractRemovals(raw:unknown) {
  if (raw===undefined) return {links:[],contractWorks:[],structureWorks:[]};
  if (!raw || typeof raw!=='object' || !('links' in raw) || !Array.isArray(raw.links)
    || !('contractWorks' in raw) || !('structureWorks' in raw)) return invalid('Некорректный список удалений.');
  function works(value:unknown):WorkRemoval[] {
    if (!Array.isArray(value)) return invalid('Некорректный список работ для удаления.');
    return value.map(row=>({id:id(row?.id),version:id(row?.version)}));
  }
  return {links:[...new Set(raw.links.map(id))],contractWorks:works(raw.contractWorks),structureWorks:works(raw.structureWorks)};
}

export async function removeAssignment(tx:Prisma.TransactionClient,event:H3Event,actor:number,contractId:number,
  kind:'contract'|'structure',row:WorkRemoval) {
  const where = {...row,deletedAt:null,tripCompletion:null};
  const data = {deletedAt:new Date(),deletedById:actor,updatedById:actor,version:{increment:1}};
  const result = kind==='contract'
    ? await tx.diagnosticContractWork.updateMany({where:{...where,contractId,contract:{deletedAt:null}},data})
    : await tx.diagnosticStructureWork.updateMany({where:{...where,tripId:null,contractStructure:{contractId,deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}}},data});
  if (result.count!==1) throw createError({statusCode:409,message:'Работа изменилась, удалена или связана с командировкой. Обновите список.'});
  await writeAuditEvent({event,db:tx,actorUserId:actor,category:'DATA',action:'DELETE',result:'SUCCESS',
    resourceKey:'diagnostic.contracts',entityType:kind==='contract'?'DiagnosticContractWork':'DiagnosticStructureWork',entityId:row.id,afterData:{contractId,deleted:true}});
  return {deleted:true};
}

export async function excludeStructures(tx:Prisma.TransactionClient,actor:number,contractId:number,ids:number[]) {
  if (!ids.length) return;
  const scope={contractId,id:{in:ids},deletedAt:null};
  const links=await tx.diagnosticContractStructure.findMany({where:scope,select:{
    id:true,structureId:true,structure:{select:{code:true}},_count:{select:{workAssignments:{where:{deletedAt:null}}}}
  }});
  const changed=()=>createError({statusCode:409,message:'Состав договора изменился. Откройте карточку заново.'});
  if (links.length!==ids.length) throw changed();
  const occupied=links.filter(link=>link._count.workAssignments>0);
  if (occupied.length) throw createError({statusCode:409,data:{code:'STRUCTURE_HAS_WORKS',linkIds:occupied.map(link=>link.id)},message:'Исключение невозможно. В договоре есть работы по сооружениям ИССО '+occupied.map(link=>link.structure.code).join(', ')+'.'});
  const trip=await tx.diagnosticTripStructure.findFirst({where:{structureId:{in:links.map(link=>link.structureId)},trip:{contractId,deletedAt:null}},
    select:{structure:{select:{code:true}},trip:{select:{number:true}}}});
  if (trip) throw createError({statusCode:409,message:'Сооружение ИССО '+trip.structure.code+' используется в командировке '+trip.trip.number+' по этому договору.'});
  const updated=await tx.diagnosticContractStructure.updateMany({where:{...scope,workAssignments:{none:{deletedAt:null}}},data:{deletedAt:new Date()}});
  if (updated.count!==ids.length) throw changed();
  await tx.auditLog.createMany({data:links.map(link=>({category:'DATA',action:'DELETE',result:'SUCCESS',
    resourceKey:'diagnostic.contracts',entityType:'DiagnosticContractStructure',entityId:link.id,actorUserId:actor,actorEmail:'',
    note:'Исключено из договора · ИССО '+link.structure.code,afterData:{contractId,structureId:link.structureId}}))});
}
