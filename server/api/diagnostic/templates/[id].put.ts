import {contractAccess} from '../../../services/diagnostic/access';
import {id} from '../../../services/diagnostic/input';
import {saveTemplate} from '../../../services/diagnostic/work-templates';

export default defineEventHandler(async event=>{
  const actor=await contractAccess(event,'UPDATE');
  return saveTemplate(event,actor.userId,await readBody(event),id(getRouterParam(event,'id')));
});
