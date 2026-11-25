import {createReadStream} from 'node:fs';
import {contractAccess} from '../../../../services/diagnostic/access';
import {reportAttachment} from '../../../../services/diagnostic/reports/archive';
export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  const file=await reportAttachment(getRouterParam(event,'id')||'');
  setHeader(event,'Content-Disposition',"attachment; filename=odis-report.xlsx; filename*=UTF-8''"+encodeURIComponent(file.filename));
  setHeader(event,'Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return sendStream(event,createReadStream(file.path));
});
