import {contractAccess} from '../../../services/diagnostic/access';
import {id} from '../../../services/diagnostic/input';
import {removeTemplate} from '../../../services/diagnostic/work-templates';

export default defineEventHandler(async event=>{
  const actor=await contractAccess(event,'DELETE');
  const body=await readBody(event);
  return removeTemplate(event,actor.userId,id(getRouterParam(event,'id')),id(body?.version));
});
