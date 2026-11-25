import {contractAccess} from '../../../services/diagnostic/access';
import {archivedReport} from '../../../services/diagnostic/reports/archive';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return archivedReport(getRouterParam(event,'id')||'');});
