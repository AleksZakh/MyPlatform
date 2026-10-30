import {createError,readBody,getHeader} from 'h3';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {parseStructureImportBatch} from '../../../../shared/utils/diagnostic-structure-import';
import {importStructureBatch} from '../../../services/diagnostic/structure-import';
export default defineEventHandler(async event=>{
  const actor=await structureAccess(event,'CREATE');
  const size=Number(getHeader(event,'content-length'));
  if(Number.isFinite(size)&&size>1024*1024)throw createError({statusCode:413,message:'Слишком большой пакет импорта.'});
  const body:unknown=await readBody(event);
  if(JSON.stringify(body)?.length>1024*1024)throw createError({statusCode:413,message:'Слишком большой пакет импорта.'});
  let input:ReturnType<typeof parseStructureImportBatch>;
  try{input=parseStructureImportBatch(body);}catch(e){throw createError({statusCode:400,message:e instanceof Error?e.message:'Некорректные данные.'});}
  return importStructureBatch(event,actor.userId,input);
});
