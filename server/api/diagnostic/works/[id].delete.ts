import { workAccess, workInput } from '../../../services/diagnostic/work-access';
import { deleteWork } from '../../../services/diagnostic/works';
import { positiveId, textField } from '../../../../shared/utils/diagnostic-works';
export default defineEventHandler(async event => {
  const actor = await workAccess(event, 'DELETE');
  const body = await readBody(event);
  const parsed = workInput(() => ({ id: positiveId(getRouterParam(event, 'id')), version: positiveId(body?.version), reason: textField(body?.reason, 'Причина удаления', 1000) }));
  return deleteWork(event, actor.userId, parsed.id, parsed.version, parsed.reason);
});

