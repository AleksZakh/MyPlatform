import {readStructureHistory} from '../../../services/diagnostic/structure-history';
import {getQuery,type H3Event} from 'h3';
import {requirePermission} from '../../../services/access-control.service';
import {CONTRACT_RESOURCE} from '../../../services/diagnostic/access';
import {structureCardScope} from '../../../services/diagnostic/structure-access';
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
  const {structureId,contractId} = await structureCardScope(event);
  const query=getQuery(event);
  if(query.section==='history')return readStructureHistory(structureId,contractId,query.before);
  const [structure,contracts]=await Promise.all([readStructure(structureId,contractId),
    contractId ? structureContractUsage(structureId) : visibleContracts(event,structureId)]);
  return {...structure,contracts};
});
