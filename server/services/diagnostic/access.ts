
import {getHeader,createError,setHeader,type H3Event} from 'h3';
import {requirePermission} from '../access-control.service';
export const CONTRACT_RESOURCE='diagnostic.contracts';
export async function contractAccess(event:H3Event,action:'VIEW'|'CREATE'|'UPDATE'|'DELETE'){
 setHeader(event,'Cache-Control','private, no-store');
 if(event.context.externalSessionRevoked)throw createError({statusCode:401});
 if(action!=='VIEW'){
  if(getHeader(event,'x-space-diagnostic')!=='1'||getHeader(event,'sec-fetch-site')==='cross-site'||!getHeader(event,'content-type')?.startsWith('application/json'))throw createError({statusCode:403,message:'Запрос должен быть отправлен из Space.'});
  await requirePermission(event,CONTRACT_RESOURCE,'VIEW');
 }
 return requirePermission(event,CONTRACT_RESOURCE,action);
}
