import {contractAccess} from '../../../services/diagnostic/access';
import {prisma} from '../../../utils/prisma';
import {categoryNames} from '../../../../shared/utils/diagnostic-planning';

export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  return prisma.diagnosticWork.findMany({
    where:{deletedAt:null,category:{name:{in:[categoryNames.contract,categoryNames.other]}}},
    select:{id:true,code:true,name:true,note:true},
    orderBy:[{groupId:'asc'},{sequence:'asc'}]
  });
});
