import {contractAccess} from '../../../services/diagnostic/access';
import {reportRoster} from '../../../services/diagnostic/reports/roster';
export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  const {employees,warning}=await reportRoster(event);
  return {employees,warning};
});
