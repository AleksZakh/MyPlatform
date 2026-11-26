import {createError,getRouterParam,type H3Event} from 'h3';
import {requirePermission} from '../../../services/access-control.service';
import {CONTRACT_RESOURCE} from '../../../services/diagnostic/access';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {readStructure,structureContractUsage} from '../../../services/diagnostic/structures';

async function visibleContracts(event:H3Event, id:number) {
  try {
    await requirePermission(event,CONTRACT_RESOURCE,'VIEW',{auditDenial:false});
  } catch (error) {
    if ((error as {statusCode?:number}).statusCode===403) return null;
    throw error;
  }
  return structureContractUsage(id);
}

export default defineEventHandler(async event=>{
  await structureAccess(event);
  const raw=getRouterParam(event,'id')||'',id=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(id)||id<1||id>2147483647)throw createError({statusCode:400,message:'Некорректный ID сооружения.'});
  const [structure,contracts]=await Promise.all([readStructure(id),visibleContracts(event,id)]);
  return {...structure,contracts};
});
