import {createError,getQuery} from 'h3';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {listStructures} from '../../../services/diagnostic/structures';
import {parseStructureQuery} from '../../../../shared/utils/diagnostic-structure-query';
export default defineEventHandler(async event=>{
  await structureAccess(event);
  let input:ReturnType<typeof parseStructureQuery>;
  try{input=parseStructureQuery(getQuery(event));}
  catch(e){throw createError({statusCode:400,message:e instanceof Error?e.message:'Некорректные фильтры.'});}
  return listStructures(input);
});
