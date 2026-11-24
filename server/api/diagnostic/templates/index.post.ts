import {contractAccess} from '../../../services/diagnostic/access';
import {createTemplate} from '../../../services/diagnostic/work-templates';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE');return createTemplate(event,actor.userId,await readBody(event));});
