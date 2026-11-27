import {confirmVisit} from '../../../services/diagnostic/worklog-trips';
import {contractAccess} from '../../../services/diagnostic/access';
import {worklogRequest} from '../../../services/diagnostic/worklog-request';
import {createError,readBody,getHeader} from 'h3';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {parseStructureImportBatch} from '../../../../shared/utils/diagnostic-structure-import';
import {prisma} from '../../../utils/prisma';
import {importStructureBatch,reviewReference} from '../../../services/diagnostic/structure-import';
export default defineEventHandler(async (event):Promise<unknown>=>{
  if(getQuery(event).source==='visitReview'){const actor=await contractAccess(event,'UPDATE');await structureAccess(event);return confirmVisit(event,actor.userId,await readBody(event));}
  if(getQuery(event).source==='worklog')return worklogRequest(event);
  const actor=await structureAccess(event,'VIEW');
  const size=Number(getHeader(event,'content-length'));
  if(Number.isFinite(size)&&size>1024*1024)throw createError({statusCode:413,message:'Слишком большой пакет импорта.'});
  const body:unknown=await readBody(event);
  if(JSON.stringify(body)?.length>1024*1024)throw createError({statusCode:413,message:'Слишком большой пакет импорта.'});
  let input:ReturnType<typeof parseStructureImportBatch>;
  try{input=parseStructureImportBatch(body);}catch(e){throw createError({statusCode:400,message:e instanceof Error?e.message:'Некорректные данные.'});}
  if((body as {preview?:boolean}).preview===true)return reviewReference(prisma,input);
  await structureAccess(event,'CREATE');
  const update=input.records.some(r=>r.choice?.fields.length||r.choice?.confirm);
  if(update)await structureAccess(event,'UPDATE');
  return importStructureBatch(event,actor.userId,input,update);
});
