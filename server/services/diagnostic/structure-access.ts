import {id} from './input';
import {CONTRACT_RESOURCE} from './access';
import {createError,setHeader,getHeader,type H3Event} from 'h3';
import {requirePermission} from '../access-control.service';
export async function structureAccess(event:H3Event,action:'VIEW'|'CREATE'|'UPDATE'|'DELETE'='VIEW'){
  setHeader(event,'Cache-Control','private, no-store');
  if(event.context.externalSessionRevoked)throw createError({statusCode:401,message:'Сеанс завершён. Войдите повторно.'});
  if(action!=='VIEW'){
    await requirePermission(event,'diagnostic.structures','VIEW');
  }
  if(action!=='VIEW' && event.method!=='GET' && event.method!=='HEAD'){
    if(getHeader(event,'x-space-diagnostic')!=='1'||getHeader(event,'sec-fetch-site')==='cross-site'||!getHeader(event,'content-type')?.startsWith('application/json'))throw createError({statusCode:403,message:'Запрос должен быть отправлен из Space.'});
  }
  return requirePermission(event,'diagnostic.structures',action);
}

export async function structureCardScope(event:H3Event) {
  await structureAccess(event);
  const query = getQuery(event);
  const structureId = id(getRouterParam(event, 'id'));
  const contractId = query.contractId === undefined ? undefined : id(query.contractId);
  if (contractId) await requirePermission(event, CONTRACT_RESOURCE, 'VIEW');
  return {structureId, contractId};
}
