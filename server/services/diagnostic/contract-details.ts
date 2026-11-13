import type {PrismaClient} from '@prisma/client';
import {createError} from 'h3';
import type {ContractDetailCounts,ContractStructureWorksResponse} from '../../../shared/types/diagnostic-contract-details';

type ReadDb=Pick<PrismaClient,'diagnosticContract'|'diagnosticContractStructure'>;

export async function contractDetailCounts(db:ReadDb,contractId:number):Promise<ContractDetailCounts>{
 const contract=await db.diagnosticContract.findFirst({
  where:{id:contractId,deletedAt:null},
  select:{_count:{select:{
   contractWorks:{where:{deletedAt:null}},
   structures:{where:{deletedAt:null,structure:{deletedAt:null}}},
  }}},
 });
 if(!contract)throw createError({statusCode:404,message:'Договор не найден.'});
 return {works:contract._count.contractWorks,structures:contract._count.structures};
}

export async function contractStructureWorks(db:ReadDb,contractId:number,linkId:number):Promise<ContractStructureWorksResponse>{
 const link=await db.diagnosticContractStructure.findFirst({
  where:{id:linkId,contractId,deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}},
  select:{id:true,structureId:true,workAssignments:{
   where:{deletedAt:null},orderBy:[{workNameSnapshot:'asc'},{id:'asc'}],
   select:{id:true,workCodeSnapshot:true,workNameSnapshot:true,criteriaSnapshot:true,hours:true,note:true,status:true,warning:true,
    planStart:true,planFinish:true,planHours:true,planExecutor:true,factStart:true,factFinish:true,factHours:true,factExecutor:true},
  }},
 });
 if(!link)throw createError({statusCode:404,message:'Сооружение не найдено в этом договоре.'});
 return {linkId:link.id,structureId:link.structureId,works:link.workAssignments.map(row=>({
  id:row.id,code:row.workCodeSnapshot,name:row.workNameSnapshot,criteria:row.criteriaSnapshot,
  hours:row.hours?.toString()??null,note:row.note,status:row.status,warning:row.warning,
  planStart:row.planStart?.toISOString().slice(0,10)??null,planFinish:row.planFinish?.toISOString().slice(0,10)??null,planHours:row.planHours?.toString()??null,planExecutor:row.planExecutor,
  factStart:row.factStart?.toISOString().slice(0,10)??null,factFinish:row.factFinish?.toISOString().slice(0,10)??null,factHours:row.factHours?.toString()??null,factExecutor:row.factExecutor,
 }))};
}
