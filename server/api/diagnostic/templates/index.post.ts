import {contractAccess} from '../../../services/diagnostic/access';
import {saveTemplate} from '../../../services/diagnostic/work-templates';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE');return saveTemplate(event,actor.userId,await readBody(event));});
