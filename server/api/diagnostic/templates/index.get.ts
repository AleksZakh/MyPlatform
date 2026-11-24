import {contractAccess} from '../../../services/diagnostic/access';
import {listTemplates} from '../../../services/diagnostic/work-templates';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return listTemplates();});
