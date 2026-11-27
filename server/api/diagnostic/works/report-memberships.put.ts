import { z } from 'zod';
import { workAccess } from '../../../services/diagnostic/work-access';
import { saveReportMemberships } from '../../../services/diagnostic/works';
import { reportGroup } from '../../../../shared/utils/diagnostic-report-parts';

const id = z.number().int().positive().max(2147483647);
const changes = z.array(z.object({
  id, version: id, fieldWork: z.boolean(), reportPart: z.string(),
}).refine(r => !r.reportPart || (reportGroup(r.reportPart) !== undefined &&
  (reportGroup(r.reportPart) !== 'Полевые работы' || r.fieldWork)))).min(1);

export default defineEventHandler(async event => {
  const actor = await workAccess(event, 'UPDATE');
  const input = changes.safeParse(await readBody(event));
  if (!input.success || new Set(input.data.map(r => r.id)).size !== input.data.length)
    throw createError({ statusCode: 400, message: 'Проверьте состав категорий и выбранные части отчёта.' });
  return saveReportMemberships(event, actor.userId, input.data);
});
