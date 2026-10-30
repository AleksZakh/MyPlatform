import {contractAccess} from '../../../../services/diagnostic/access';
import {id} from '../../../../services/diagnostic/input';
import {prisma} from '../../../../utils/prisma';
import {createError} from 'h3';
import type {ContractStructureListItem} from '../../../../../shared/types/diagnostic-contract-structures';

export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 const contractId=id(getRouterParam(event,'id'));
 const contract=await prisma.diagnosticContract.findFirst({where:{id:contractId,deletedAt:null},select:{id:true}});
 if(!contract)throw createError({statusCode:404,message:'Договор не найден.'});
 const rows=await prisma.diagnosticContractStructure.findMany({
  where:{contractId,deletedAt:null,structure:{deletedAt:null}},
  select:{id:true,structureId:true,structure:{select:{
   code:true,structureName:true,roadName:true,location:true,additionalId:true,obstacleName:true,district:true,
  }}},
  orderBy:[{structure:{roadName:'asc'}},{structure:{locationMetres:'asc'}},{id:'asc'}],
 });
 return rows.map(({id,structureId,structure})=>({id,structureId,...structure})) satisfies ContractStructureListItem[];
});
