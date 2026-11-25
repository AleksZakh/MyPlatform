import {contractAccess} from '../../../services/diagnostic/access';
import {history} from '../../../services/diagnostic/reports/archive';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return history();});
