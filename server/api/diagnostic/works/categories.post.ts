import { workAccess, workInput } from '../../../services/diagnostic/work-access';
import { createWorkCategory } from '../../../services/diagnostic/works';
import { positiveId, textField } from '../../../../shared/utils/diagnostic-works';
export default defineEventHandler(async event => {
  const actor = await workAccess(event, 'CREATE');
  const body = await readBody(event);
  const parsed = workInput(() => ({ groupId: positiveId(body?.groupId), name: textField(body?.name, 'Категория', 250) }));
  return createWorkCategory(event, actor.userId, parsed.groupId, parsed.name);
});

