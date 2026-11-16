import {contractAccess} from '../../services/diagnostic/access';
import {readEmployeePlans} from '../../services/diagnostic/plans';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return readEmployeePlans(event,getQuery(event));});
