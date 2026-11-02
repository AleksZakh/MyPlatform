import {contractAccess} from '../../../../services/diagnostic/access';
import {id} from '../../../../services/diagnostic/input';
import {prisma} from '../../../../utils/prisma';
import {createError} from 'h3';
import type {ContractWorkRecord} from '../../../../../shared/types/diagnostic-contract-works';
export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 const contractId=id(getRouterParam(event,'id'));
 if(!await prisma.diagnosticContract.findFirst({where:{id:contractId,deletedAt:null},select:{id:true}}))throw createError({statusCode:404,message:'Договор не найден.'});
 const rows=await prisma.diagnosticContractWork.findMany({where:{contractId,deletedAt:null},orderBy:[{name:'asc'},{id:'asc'}],
  select:{id:true,code:true,name:true,criteria:true,note:true,status:true,planStart:true,planFinish:true,planHours:true,planExecutor:true,factStart:true,factFinish:true,factHours:true,factExecutor:true}});
 const day=(v:Date|null)=>v?.toISOString().slice(0,10)??null;
 return rows.map(r=>({...r,planStart:day(r.planStart),planFinish:day(r.planFinish),factStart:day(r.factStart),factFinish:day(r.factFinish),planHours:r.planHours?.toString()??null,factHours:r.factHours?.toString()??null})) satisfies ContractWorkRecord[];
});
