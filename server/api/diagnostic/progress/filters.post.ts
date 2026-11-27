import { reportAction } from '../../../services/diagnostic/reports/access';
import { progressReport } from '../../../services/diagnostic/progress';
import { saveProgressCell } from '../../../services/diagnostic/progress/cell';
import { exportProgress } from '../../../services/diagnostic/progress/export';

export default defineEventHandler(async (event): Promise<unknown> => {
  await reportAction(event);
  switch (getQuery(event).action) {
    case 'generate':
      return progressReport(event, await readBody(event));
    case 'cell':
      return saveProgressCell(event);
    case 'export':
      return exportProgress(event);
    default:
      throw createError({ statusCode: 404, message: 'Действие отчёта не найдено.' });
  }
});
