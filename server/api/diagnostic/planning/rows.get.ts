import { contractAccess } from '../../../services/diagnostic/access';
import { planningRows, positive } from '../../../services/diagnostic/planning';
import { categoryNames, type Category } from '../../../../shared/utils/diagnostic-planning';
export default defineEventHandler(async (event) => {
  await contractAccess(event, 'VIEW');
  const q = getQuery(event),
    category = String(q.category);
  if (!Object.hasOwn(categoryNames, category))
    throw createError({ statusCode: 400, message: 'Неизвестная категория.' });
  return planningRows(
    positive(q.contractId),
    category as Category,
    String(q.links || '')
      .split(',')
      .filter(Boolean)
      .map(positive),
    q.after ? positive(q.after) : 0,
  );
});
