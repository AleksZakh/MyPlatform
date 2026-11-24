import {createError,defineEventHandler,getQuery,getRouterParam} from 'h3';
import {contractAccess} from '../../../../../services/diagnostic/access';
import {id} from '../../../../../services/diagnostic/input';
import {contractStructureWorks} from '../../../../../services/diagnostic/contract-details';
import {prisma} from '../../../../../utils/prisma';

export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  const contractId=id(getRouterParam(event,'id')), workId=id(getQuery(event).workId);
  const assignment=await prisma.diagnosticStructureWork.findFirst({
    where:{id:workId,deletedAt:null,contractStructure:{contractId,deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}}},
    select:{contractStructureId:true,contractStructure:{select:{structure:{select:{code:true}}}}},
  });
  if(!assignment) throw createError({statusCode:404,message:'Работа по сооружению в этом договоре не найдена.'});
  const {works,linkId}=await contractStructureWorks(prisma,contractId,assignment.contractStructureId,workId);
  if(!works[0]) throw createError({statusCode:404,message:'Работа по сооружению больше недоступна.'});
  return {row:works[0],linkId,isso:assignment.contractStructure.structure.code};
});
