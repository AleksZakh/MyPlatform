import {getRouterParam,readBody} from 'h3';
import {structureAccess} from '../../../services/diagnostic/structure-access';
import {id,invalid} from '../../../services/diagnostic/input';
import {removeStructure} from '../../../services/diagnostic/structure-removal';

export default defineEventHandler(async event => {
  const actor = await structureAccess(event,'DELETE');
  const body = await readBody(event);
  if (body?.confirmed !== true || !['permanent','decommission'].includes(body.mode)) {
    return invalid('Укажите и подтвердите способ удаления сооружения.');
  }
  return removeStructure(event,actor.userId,id(getRouterParam(event,'id')),id(body.version),body.mode);
});
