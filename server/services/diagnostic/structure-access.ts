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
