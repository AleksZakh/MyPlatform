import {contractAccess} from '../../../services/diagnostic/access';
import {reportRecipients} from '../../../services/diagnostic/reports/recipients';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return reportRecipients(event);});
