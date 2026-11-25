import {contractAccess} from '../../../services/diagnostic/access';
import {positive} from '../../../services/diagnostic/planning';
import {prisma} from '../../../utils/prisma';

export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  const selection=getQuery(event).contracts;
  if(selection===undefined){
    return prisma.diagnosticContract.findMany({where:{deletedAt:null},select:{id:true,number:true},orderBy:[{number:'asc'},{id:'asc'}]});
  }
  if(typeof selection!=='string')throw createError({statusCode:400,message:'Некорректный список договоров.'});
  const ids=[...new Set(selection.split(',').map(positive))];
  return prisma.diagnosticContractStructure.findMany({
    where:{contractId:{in:ids},deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}},
    select:{id:true,contractId:true,structure:{select:{code:true,location:true,structureName:true,roadName:true}}},
    orderBy:[{contract:{number:'asc'}},{structure:{locationMetres:'asc'}},{id:'asc'}],
  });
});
