import {createError,getRouterParam} from 'h3';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {readStructure} from '../../../services/diagnostic/structures';
export default defineEventHandler(async event=>{
  await structureAccess(event);
  const raw=getRouterParam(event,'id')||'',id=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(id)||id<1||id>2147483647)throw createError({statusCode:400,message:'Некорректный ID сооружения.'});
  return readStructure(id);
});
