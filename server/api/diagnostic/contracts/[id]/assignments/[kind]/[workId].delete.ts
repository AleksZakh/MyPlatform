import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { contractAccess } from '../../../../../../services/diagnostic/access';
import { id, invalid } from '../../../../../../services/diagnostic/input';
import { prisma } from '../../../../../../utils/prisma';
import { writeAuditEvent } from '../../../../../../utils/auditLog';

export default defineEventHandler(async event => {
  const {userId} = await contractAccess(event,'DELETE');
  const contractId = id(getRouterParam(event,'id')), workId = id(getRouterParam(event,'workId'));
  const kind = getRouterParam(event,'kind');
  if (kind!=='contract' && kind!=='structure') return invalid('Неизвестный вид работы.');
  const body = await readBody(event);
  const where = {id:workId,version:id(body?.version),deletedAt:null,tripCompletion:null};
  return prisma.$transaction(async tx=>{
    const data = {deletedAt:new Date(),deletedById:userId,updatedById:userId,version:{increment:1}};
    const result = kind==='contract'
      ? await tx.diagnosticContractWork.updateMany({where:{...where,contractId,contract:{deletedAt:null}},data})
      : await tx.diagnosticStructureWork.updateMany({where:{...where,tripId:null,contractStructure:{contractId,deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}}},data});
    if (result.count!==1) throw createError({statusCode:409,message:'Работа изменилась, удалена или связана с командировкой. Обновите список.'});
    await writeAuditEvent({event,db:tx,actorUserId:userId,category:'DATA',action:'DELETE',result:'SUCCESS',
      resourceKey:'diagnostic.contracts',entityType:kind==='contract'?'DiagnosticContractWork':'DiagnosticStructureWork',entityId:workId,afterData:{contractId,deleted:true}});
    return {deleted:true};
  });
});
