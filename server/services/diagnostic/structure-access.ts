import {createError,setHeader,type H3Event} from 'h3';
import {requirePermission} from '../access-control.service';
export async function structureAccess(event:H3Event){
  setHeader(event,'Cache-Control','private, no-store');
  if(event.context.externalSessionRevoked)throw createError({statusCode:401,message:'Сеанс завершён. Войдите повторно.'});
  return requirePermission(event,'diagnostic.structures','VIEW');
}
