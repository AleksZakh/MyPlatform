import {reportAction} from '../../../services/diagnostic/reports/access';
import {generateReport,parseParams} from '../../../services/diagnostic/reports/generate';
import {archiveReport} from '../../../services/diagnostic/reports/archive';
export default defineEventHandler(async event=>{
  await reportAction(event);
  const report=await generateReport(event,parseParams(await readBody(event)));
  await archiveReport(report);
  return report;
});
