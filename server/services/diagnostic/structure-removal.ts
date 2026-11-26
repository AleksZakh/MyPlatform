import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent} from '../../utils/auditLog';
import type {StructureRemovalInfo,StructureRemovalMode} from '../../../shared/types/diagnostic-structures-api';

async function removalInfo(db:Prisma.TransactionClient, id:number):Promise<StructureRemovalInfo> {
  const row = await db.diagnosticStructure.findFirst({
    where:{id, deletedAt:null, decommissionedAt:null},
    select:{version:true, _count:{select:{
      contracts:true, trips:true, legacyContracts:{where:{contractStructureId:null}}
    }}}
  });
  if (!row) throw createError({statusCode:404, message:'Сооружение уже удалено или выведено из эксплуатации.'});
  const {contracts, trips, legacyContracts} = row._count;
  return {version:row.version, contracts, trips, legacyContracts, canDeletePermanently:!(contracts || trips || legacyContracts)};
}

export const inspectStructureRemoval = (id:number) => removalInfo(prisma,id);

export async function removeStructure(event:H3Event, actorId:number, id:number, version:number, mode:StructureRemovalMode) {
  try {
    return await prisma.$transaction(async tx => {
      const [row] = await tx.$queryRaw<{code:string}[]>`
        SELECT code FROM diagnostic_structures WHERE id = ${id} FOR UPDATE`;
      if (!row) throw createError({statusCode:404, message:'Сооружение уже удалено.'});
      const info = await removalInfo(tx,id);
      if (version !== info.version) throw createError({statusCode:409, message:'Карточка сооружения изменилась. Проверьте сведения ещё раз.'});
      if (mode === 'permanent' && !info.canDeletePermanently) {
        throw createError({statusCode:409, message:'Обнаружены связи с договорами или командировками. Возможен только вывод из эксплуатации.'});
      }

      const retired = mode === 'decommission';
      if (retired) {
        await tx.diagnosticStructure.update({where:{id},data:{decommissionedAt:new Date(), updatedById:actorId, version:{increment:1}}});
      } else {
        // These are source metadata owned by the structure, not contract or work links.
        await tx.diagnosticStructureLegacyExecutor.deleteMany({where:{structureId:id}});
        await tx.diagnosticStructureLegacyRow.deleteMany({where:{structureId:id}});
        await tx.diagnosticStructure.delete({where:{id}});
      }
      await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:retired?'UPDATE':'DELETE',
        resourceKey:'diagnostic.structures',entityType:'DiagnosticStructure',entityId:id,actorUserId:actorId,
        note:(retired?'Вывод из эксплуатации':'Полное удаление')+' · Код ИССО '+row.code,
        changes:{status:{before:'В эксплуатации',after:retired?'Выведено из эксплуатации':'Удалено'}}});
      return {id,mode};
    },{isolationLevel:'ReadCommitted'});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2003','P2034'].includes(error.code)) {
      throw createError({statusCode:409, message:'Связи сооружения изменились. Повторите проверку.'});
    }
    throw error;
  }
}
